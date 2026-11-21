# usage-c4-bibliotheque — plan d'exécution (bibliothèque de ressources et paquets)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Cœur : `kind: "grid"`, `WrongKind { expected, found }`, `save_resource*` / `load_resource*`, `manifest_kind`, `container_kind`, `compat_c4` | — | `crates/roomboard-core/src/format/mod.rs`, `crates/roomboard-core/tests/compat_c4.rs` (neuf), tout fichier de `crates/` qui construit `FormatError::WrongKind { … }` (relevé par `grep -rn "WrongKind {" crates/`), `docs/essais/taille-wasm.md` | isolé `~/projets/roomboard-wt/usage-c4-bibliotheque--T1` | concepteur-critique | `nice -n 10 cargo test -p roomboard-core --test compat_c4 --test compat_c3 --test compat_socle 2>&1 \| grep -E "^test \|test result" \| tail -30` : ≥ 5 tests, `grid_resource_round_trips_with_same_bytes ... ok`, 3 × `test result: ok` ; deux tailles relevées (principal ≤ 1 572 864 o, formats ≤ 3 145 728 o) | S2, S4 | #tache-t1 |
| T2 | Pont Wasm (`save_grid*`, `load_grid*`, `manifest_kind`, `container_kind`) et liaison `wasm-core.ts` ; contrat du vrai module | T1, T3 | `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts`, `docs/essais/taille-wasm.md` | isolé `~/projets/roomboard-wt/usage-c4-bibliotheque--T2` | implementeur-tdd | `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts --reporter=verbose 2>&1 \| grep -E "C4\|Tests " \| tail -12` : ≥ 3 tests « C4 », 0 échec ; deux tailles relevées | S2, S4 | #tache-t2 |
| T3 | API TS du cœur (`ContainerKind`, `saveGrid*`, `loadGrid*`, `manifestKind`, `containerKind`, `wrongKindMessage`) et faux cœur | — | `apps/web/src/core/api.ts`, `apps/web/src/core/fake-core.ts`, `apps/web/src/core/fake-core.test.ts`, toute fabrique de test typée `CoreFactory` relevée par `grep -rln ": CoreFactory" apps/web/src` | isolé `~/projets/roomboard-wt/usage-c4-bibliotheque--T3` | implementeur-tdd | `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/core/fake-core.test.ts --reporter=verbose 2>&1 \| grep -E "C4\|Tests " \| tail -12` : ≥ 4 tests « C4 », 0 échec | S2, S4 | #tache-t3 |
| T4 | `ContainerIO` à liste de `kind` et `FragmentOps.insertResource` / `encodeGrid` | T3 | `apps/web/src/app/container-io.ts`, `apps/web/src/app/container-io.test.ts`, `apps/web/src/app/fragments.ts`, `apps/web/src/app/fragments.test.ts`, `apps/web/src/app/workspace.ts` (ligne 252 seule) | isolé `~/projets/roomboard-wt/usage-c4-bibliotheque--T4` | concepteur-critique | `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app/container-io.test.ts src/app/fragments.test.ts --reporter=verbose 2>&1 \| grep -E "C4\|Tests " \| tail -16` : ≥ 7 tests « C4 », 0 échec, `Tests` sans `failed` | S1, S2, S4 | #tache-t4 |
| T5 | Vignette d'une ressource (128 px, peintre d'export) | — | `apps/web/src/app/thumbnail.ts` (neuf), `apps/web/src/app/thumbnail.test.ts` (neuf) | isolé `~/projets/roomboard-wt/usage-c4-bibliotheque--T5` | implementeur-tdd | `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app/thumbnail.test.ts --reporter=verbose 2>&1 \| grep -E "C4\|Tests " \| tail -8` : ≥ 4 tests « C4 », 0 échec | S1, S2 | #tache-t5 |
| T6 | Stockage `LibraryFiles` (mémoire, IndexedDB, plugin-fs), aides `idb.ts`, ports de dossiers de la coque | — | `apps/web/src/platform/idb.ts` (neuf), `apps/web/src/platform/pending.ts`, `apps/web/src/platform/library-files.ts` (neuf), `apps/web/src/platform/library-files.test.ts` (neuf), `apps/web/src/platform/host-tauri.ts` | isolé `~/projets/roomboard-wt/usage-c4-bibliotheque--T6` | implementeur-tdd | `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/library-files.test.ts src/platform/pending.test.ts --reporter=verbose 2>&1 \| grep -E "C4\|Tests " \| tail -30` : ≥ 21 tests « C4 » (7 × 3 réalisations), 0 échec, `pending.test.ts` vert | S3, S5 | #tache-t6 |
| T7 | Paquet `.rbpack` (`rbpack.ts`) et Worker ZIP (mode `pack`, écriture stockée) | — | `apps/web/src/platform/rbpack.ts` (neuf), `apps/web/src/platform/rbpack.test.ts` (neuf), `apps/web/src/platform/zip-worker.ts`, `apps/web/src/platform/zip-worker.test.ts` (neuf), `apps/web/src/platform/zip-read.ts`, `apps/web/src/platform/zip-read.test.ts` | isolé `~/projets/roomboard-wt/usage-c4-bibliotheque--T7` | concepteur-critique | `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/rbpack.test.ts src/platform/zip-worker.test.ts src/platform/zip-read.test.ts src/platform/model3d-import.test.ts --reporter=verbose 2>&1 \| grep -E "C4\|Tests " \| tail -20` : ≥ 10 tests « C4 », 0 échec | S3, S4 | #tache-t7 |
| T8 | `ResourceLibrary` : index, dossiers, recherche, ajout, export et import de paquet | T6, T7 | `apps/web/src/app/library.ts` (neuf), `apps/web/src/app/library.test.ts` (neuf) | isolé `~/projets/roomboard-wt/usage-c4-bibliotheque--T8` | concepteur-critique | `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app/library.test.ts --reporter=verbose 2>&1 \| grep -E "C4\|Tests " \| tail -20` : ≥ 10 tests « C4 », `C4 : export puis import rend les mêmes ressources` présent, 0 échec | S1, S3, S4 | #tache-t8 |
| T9 | Entrée `.rbpack` de l'importeur et types de fichiers | — | `apps/web/src/platform/files.ts`, `apps/web/src/platform/typed-files.ts`, `apps/web/src/platform/import.ts`, `apps/web/src/platform/import.test.ts` | isolé `~/projets/roomboard-wt/usage-c4-bibliotheque--T9` | implementeur-tdd | `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/import.test.ts --reporter=verbose 2>&1 \| grep -E "C4\|Tests " \| tail -10` : ≥ 3 tests « C4 », 0 échec | S3, S5 | #tache-t9 |
| T10 | Coque : association `rbpack`, capacités de dossiers, `ASSOCIATED_EXTENSIONS` | — | `apps/desktop/src-tauri/tauri.conf.json`, `apps/desktop/src-tauri/capabilities/default.json`, `crates/roomboard-shell/src/lib.rs`, `crates/roomboard-shell/Cargo.toml`, `Cargo.lock`, `docs/essais/taille-wasm.md` | isolé `~/projets/roomboard-wt/usage-c4-bibliotheque--T10` | implementeur-tdd | `nice -n 10 cargo test -p roomboard-shell 2>&1 \| grep -E "^test \|test result" \| tail -30` : `tauri_conf_associations_match_associated_extensions ... ok`, `capabilities_grant_library_folder_only ... ok`, `test result: ok` ; `node scripts/controle-hors-ligne.mjs` et `controle-icones.mjs` verts ; deux tailles relevées | S5 | #tache-t10 |
| T11 | Action de barre `library` « Bibliothèque » | — | `apps/web/src/toolbar.ts`, `apps/web/src/toolbar-profiles.ts`, `apps/web/src/toolbar-profiles.test.ts`, `apps/web/src/app/toolbar-host.ts`, `apps/web/src/app/toolbar-host.test.ts`, `apps/web/src/ui/App.tsx` (type `Panel` seul) | isolé `~/projets/roomboard-wt/usage-c4-bibliotheque--T11` | implementeur-tdd | `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/toolbar-profiles.test.ts src/app/toolbar-host.test.ts --reporter=verbose 2>&1 \| grep -E "C4\|Grille\|Tests " \| tail -10` : ≥ 2 tests « C4 », 0 échec | S1 | #tache-t11 |
| T12 | Glisser une carte vers la scène (Pointer Events) | — | `apps/web/src/ui/resource-drag.ts` (neuf), `apps/web/src/ui/resource-drag.test.ts` (neuf) | isolé `~/projets/roomboard-wt/usage-c4-bibliotheque--T12` | implementeur-tdd | `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/resource-drag.test.ts --reporter=verbose 2>&1 \| grep -E "C4\|Tests " \| tail -8` : ≥ 4 tests « C4 », 0 échec | S1, S2 | #tache-t12 |
| T13 | Panneau `LibraryPanel` (deux racines, dossiers, recherche, cartes, formulaire, paquets) | T8, T12 | `apps/web/src/ui/LibraryPanel.tsx` (neuf), `apps/web/src/ui/LibraryPanel.test.tsx` (neuf) | isolé `~/projets/roomboard-wt/usage-c4-bibliotheque--T13` | implementeur-tdd | `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/LibraryPanel.test.tsx --reporter=verbose 2>&1 \| grep -E "C4\|Tests " \| tail -14` : ≥ 8 tests « C4 », 0 échec | S1, S2, S3, S5 | #tache-t13 |
| T14 | Branchement : `Workspace`, `main.ts`, `App.tsx`, `rb.css` | T2, T4, T5, T8, T9, T11, T13 | `apps/web/src/app/workspace.ts`, `apps/web/src/app/workspace.test.ts`, `apps/web/src/main.ts`, `apps/web/src/ui/App.tsx`, `apps/web/src/ui/App.test.tsx`, `apps/web/src/ui/rb.css` | isolé `~/projets/roomboard-wt/usage-c4-bibliotheque--T14` | implementeur-tdd | `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app/workspace.test.ts src/ui/App.test.tsx --reporter=verbose 2>&1 \| grep -E "C4\|Tests " \| tail -12` : ≥ 3 tests « C4 », 0 échec ; `nice -n 10 pnpm --filter @roomboard/web build 2>&1 \| tail -3` sans `error` | S1, S2, S3 | #tache-t14 |
| T15 | Essai navigateur C4 branché dans `verifier.sh --e2e`, capture, tailles finales | T1 à T14 | `scripts/essais/c4-bibliotheque-navigateur.mjs` (neuf), `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/c4-bibliotheque.png` (neuf), `docs/essais/taille-wasm.md` | isolé `~/projets/roomboard-wt/usage-c4-bibliotheque--T15` | implementeur-tdd | `nice -n 10 bash scripts/verifier.sh --e2e 2>&1 \| grep -E "C4 bibliothèque\|C8 pot zones\|module Wasm\|module formats\|e2e OK\|verifier.sh : OK\|ÉCHEC" \| tail -12` : « C4 bibliothèque : OK », « verifier.sh : e2e OK », « verifier.sh : OK », deux tailles relevées | S1, S2, S3, S4 | #tache-t15 |

Vagues proposées (fichiers disjoints dans chaque vague ; une seule suite lourde à la fois sur la VM) :
**V1** T1 (seule suite lourde : `cargo`), T3, T5, T6, T7, T9, T11, T12 · **V2** T2 (seule suite lourde : Wasm), T4, T8 ·
**V3** T10 (`cargo -p roomboard-shell` et mesure Wasm), T13 · **V4** T14 · **V5** T15 (suite complète `--e2e`).

**Goal :** un panneau « Bibliothèque » (« Mes ressources », « Ressources partagées ») range des `.rbitem` d'objets et de
grilles en dossiers, avec recherche, vignette, glisser vers la page en une étape, et paquets `.rbpack` exportés et
importés avec les mêmes ressources.

**Architecture :** le cœur Rust apprend `kind: "grid"` (même conteneur, mêmes fonctions généralisées à `kind`) ; la page
route une ressource par `FragmentOps.insertResource` (objets : `insertOutcome` existant ; grille : un `SetGrid`). Le
stockage est une interface `LibraryFiles` (IndexedDB sur le web, `plugin-fs` dans la coque) sous `ResourceLibrary`
(index en mémoire, recherche, paquets). Le paquet est du TS pur (`rbpack.ts`) zippé par le Worker existant : ni le cœur
ni `formats` ne le connaissent.

**Tech Stack :** Rust (yrs, zip), wasm-bindgen, TypeScript, Solid, Vitest (happy-dom, fake-indexeddb), fflate (Worker),
Playwright (Chromium).

**Spec :** `docs/plans/usage-c4-bibliotheque-cadrage.md`

## Global Constraints

- GC1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- GC2 — Tailles : module Wasm principal plafond 1 572 864 o (avant C4 : 1 362 599 o) ; module `formats` plafond 3 145 728 o (avant C4 : 3 100 344 o, marge 45 Ko : rien d'autre que la ligne `KIND_GRID` de `check_manifest` et le message de `WrongKind`). Toute tâche qui touche le Rust mesure les deux tailles (bloc « Mesure » de sa section) et les écrit dans `docs/essais/taille-wasm.md`. Garde-fou du cadrage (H2-5) : principal < +20 Ko, `formats` < +1 Ko ; au-delà, la tâche s'arrête et le dit.
- GC3 — Aucun build Tauri, aucun build Android. Coque prouvée par tests unitaires et lecture de `tauri.conf.json` et des capacités.
- GC4 — La scène ne passe jamais sous 640 px (test existant `c5-image-navigateur.mjs:156` et essai C4, panneau ouvert).
- GC5 — Commandes lourdes avec `nice -n 10`. VM chargée : un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé.
- GC6 — Aucune dépendance AGPL/GPL/LGPL ; aucune dépendance neuve (D22) ; `node scripts/controle-licences.mjs` vert.
- GC7 — Commits : ajout fichier par fichier (jamais `git add -A`, `.`, ni `commit -a`), auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC8 — Fichiers d'avant C4 : aucun octet changé pour `.roomboard` et `.rbitem` de `kind: "fragment"` ; `compat_socle`, `compat_c3`, `document_manifest_has_no_kind_field` restent verts (D21).
- GC9 — Chemin des outils : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande `cargo`, `wasm-bindgen`, `pnpm`.
- GC10 — Tests nommés : chaque test neuf de l'interface commence par « C4 : » (le motif `C4` des preuves le compte).
- GC11 — Trois couches testables seules : `crates/` (cœur Rust, sans dépendance au navigateur), `apps/web`, `apps/desktop`.

## Review Focus

1. Un `.rbitem` de grille déposé sur la scène (ou glissé) remplace la grille ; un `.rbitem` d'objets d'avant C4 s'insère comme avant, avec les mêmes messages d'erreur (effet de bord 1 et 2, S4) → T4 `C4 : read à kind seul garde les messages d'avant`, `C4 : insertResource d'une grille pose un SetGrid, une étape`.
2. Même grille déposée deux fois : aucune étape d'annulation de plus (D2, D38) → T4 `C4 : même grille : aucune étape`.
3. Paquet hostile : `kind: "autre"`, `formatVersion: 2`, chemin `../x.rbitem`, entrée du manifeste absente du ZIP : refus clair, bibliothèque inchangée (D18, S4) → T7 `C4 : readPack refuse …` (4 tests), T8 `C4 : import refusé : bibliothèque inchangée`.
4. Nom de ressource ou de dossier saisi avec `/`, `..`, `:` ou un point initial : jamais de chemin hors de la racine (H1-4) → T6 `C4 : safeLibraryPath refuse …`, T8 `C4 : nom saisi assaini`.
5. Collision de noms (deux « Moitié » dans le même dossier, paquet « Fractions » importé deux fois) : « (2) », jamais un écrasement (D19) → T8 `C4 : collision de nom : (2)`, `C4 : import deux fois : Fractions (2)`.

## Carte des fichiers

| fichier | rôle | tâche |
|---|---|---|
| `crates/roomboard-core/src/format/mod.rs` | `KIND_GRID`, `kind_of`, `manifest_kind`, `container_kind`, `WrongKind { expected, found }`, `save_resource_parts`, `save_resource`, `load_resource_parts`, `load_resource` | T1 |
| `crates/roomboard-core/tests/compat_c4.rs` (neuf) | grille en ressource : écrire, relire, mêmes octets ; refus croisés ; `kind` inconnu | T1 |
| `crates/roomboard-wasm/src/lib.rs` | `save_grid`, `save_grid_parts`, `load_grid`, `load_grid_parts`, `manifest_kind`, `container_kind` | T2 |
| `apps/web/src/core/api.ts` | `ContainerKind`, `IS_A_GRID_MESSAGE`, `wrongKindMessage`, méthodes du document et de la fabrique | T3 |
| `apps/web/src/core/fake-core.ts` | même contrat en JSON | T3 |
| `apps/web/src/core/wasm-core.ts` | liaison des six fonctions | T2 |
| `apps/web/src/app/container-io.ts` | `EncodeAs` grille, `read` à liste de `kind`, `ReadResult.kind` | T4 |
| `apps/web/src/app/fragments.ts` | `insertResource`, `encodeGrid`, `GRID_NAME`, `NO_GRID_MESSAGE`, `EMPTY_GRID_MESSAGE` | T4 |
| `apps/web/src/app/thumbnail.ts` (neuf) | `THUMB_MAX`, `thumbSize`, `renderThumbnail` | T5 |
| `apps/web/src/platform/idb.ts` (neuf) | `finished`, `result`, `lazyDb` (repris de `pending.ts`) | T6 |
| `apps/web/src/platform/library-files.ts` (neuf) | `LibraryFiles`, `safeLibraryPath`, `createMemoryLibraryFiles`, `createIdbLibraryFiles`, `createTauriLibraryFiles` | T6 |
| `apps/web/src/platform/host-tauri.ts` | `TauriDirFs`, `loadTauriPorts` : `dirFs`, `pickFolder`, `documentDir` | T6 |
| `apps/web/src/platform/rbpack.ts` (neuf) | `buildPack`, `readPack`, messages du paquet | T7 |
| `apps/web/src/platform/zip-worker.ts`, `zip-read.ts` | `unzipEntries`, `unzipPackEntries`, `zipStored`, `createZipReader(…, mode)`, `createZipWriter` | T7 |
| `apps/web/src/app/library.ts` (neuf) | `ResourceLibrary`, `createResourceLibrary`, `normalizeSearch`, `fileNameOf`, types d'entrée | T8 |
| `apps/web/src/platform/import.ts`, `files.ts`, `typed-files.ts` | `rbpackHandler`, `RBPACK_EXTENSION`, `RBPACK_MIME`, `RBPACK_TYPE`, `ImportDeps.importPack` | T9 |
| `apps/desktop/src-tauri/*`, `crates/roomboard-shell/*` | association, capacités, `ASSOCIATED_EXTENSIONS` | T10 |
| `apps/web/src/toolbar*.ts`, `app/toolbar-host.ts` | action `library` | T11 |
| `apps/web/src/ui/resource-drag.ts` (neuf) | `startResourceDrag` | T12 |
| `apps/web/src/ui/LibraryPanel.tsx` (neuf) | panneau | T13 |
| `apps/web/src/app/workspace.ts`, `main.ts`, `ui/App.tsx`, `ui/rb.css` | branchement | T14 |
| `scripts/essais/c4-bibliotheque-navigateur.mjs` (neuf), `scripts/verifier.sh` | essai | T15 |

---

### Tâche T1 — Cœur : `kind: "grid"`, `WrongKind { expected, found }`, ressources généralisées, `compat_c4`
<a id="tache-t1"></a>

**Objectif :** le cœur écrit et relit un `.rbitem` de `kind: "grid"` par les mêmes fonctions que le fragment, dit le
type d'un manifeste ou d'un conteneur, et refuse le mauvais type avec un message qui nomme ce que le fichier **est**.

**Fichiers :**
- Modifier : `crates/roomboard-core/src/format/mod.rs:22-26` (constantes), `:84-97` (`Display`), `:65-77` (enum), `:252-260` (`check_manifest`), `:265-271` (`expect_kind`), `:334-391` (fonctions de fragment)
- Créer : `crates/roomboard-core/tests/compat_c4.rs`
- Modifier : chaque construction de `FormatError::WrongKind { expected: … }` relevée par `grep -rn "WrongKind {" crates/` (tests compris) : ajouter `found`
- Modifier : `docs/essais/taille-wasm.md` (section C4)

**Interfaces :**
- Consomme : `Document::blank`, `Document::apply(Command::SetGrid { page, grid: Some(GridInput) })`, `Document::page(&id).grid`, `format::{save, load_with_manifest, open, check_manifest, decode_checked, write_parts, zip_err, SaveMeta, Parts}` (existants).
- Produit (T2 les lie en Wasm) :
  - `pub const KIND_GRID: &str = "grid";`
  - `FormatError::WrongKind { expected: &'static str, found: &'static str }`
  - `pub fn kind_of(m: &Manifest) -> &'static str`
  - `pub fn manifest_kind(raw: &[u8]) -> Result<&'static str, FormatError>`
  - `pub fn container_kind(bytes: &[u8]) -> Result<&'static str, FormatError>`
  - `pub fn save_resource_parts(doc: &Document, meta: &SaveMeta, kind: &'static str, name: &str) -> Result<Parts, FormatError>`
  - `pub fn save_resource(doc: &Document, meta: &SaveMeta, kind: &'static str, name: &str) -> Result<Vec<u8>, FormatError>`
  - `pub fn load_resource_parts(manifest: &[u8], ybin: &[u8], kind: &'static str) -> Result<(Document, Manifest), FormatError>`
  - `pub fn load_resource(bytes: &[u8], kind: &'static str) -> Result<(Document, Manifest), FormatError>`
  - `save_fragment_parts`, `save_fragment`, `load_fragment_parts`, `load_fragment` : mêmes signatures, y délèguent (mêmes octets).
- Réutilise : `crates/roomboard-core/src/format/mod.rs:334,378` — `save_fragment_parts` / `load_fragment_parts` généralisés en `save_resource_parts(doc, meta, kind, name)` / `load_resource_parts(manifest, ybin, kind)` ; `save_resource` / `load_resource` (sans asset) ; les fonctions de fragment y délèguent.
- Réutilise : `crates/roomboard-core/src/format/mod.rs:232` — `check_manifest`, exposé par `manifest_kind(manifest)` (T2 le lie en `manifest_kind(manifest: &[u8]) -> Result<String, JsError>`).
- Réutilise : `apps/web/src/core/api.ts:133` côté Rust — `Command::SetGrid { page, grid }` (`crates/roomboard-core/src/commands.rs:101`), dans le test seulement.

**Patron à ne pas reprendre :** `WrongKind { expected }` déduit le message de ce qui était **attendu**
(`format/mod.rs:90-96`) : avec trois types, « attendu fragment » ne dit plus si le fichier est un document ou une grille.
Le message se choisit sur `found`. Chemin de référence : `crates/roomboard-core/src/format/mod.rs:84-97` et `:265-271`.

**Test et commande bornée :**
`cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && nice -n 10 cargo test -p roomboard-core --test compat_c4 --test compat_c3 --test compat_socle 2>&1 | grep -E "^test |test result" | tail -30`
Attendu : ≥ 5 tests dans `compat_c4`, dont `grid_resource_round_trips_with_same_bytes ... ok` ; trois lignes `test result: ok`.
Puis la suite du crate : `nice -n 10 cargo test -p roomboard-core 2>&1 | grep -E "test result|FAILED|panicked" | tail -15` : aucune ligne `FAILED`, `document_manifest_has_no_kind_field` toujours vert (`nice -n 10 cargo test -p roomboard-core document_manifest_has_no_kind_field 2>&1 | grep -E "^test |test result" | tail -3`).

**Mesure (GC2) :**
```bash
cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2
rm -rf /tmp/c4-t1-wasm && nice -n 10 wasm-bindgen --target web --remove-name-section --out-dir /tmp/c4-t1-wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm
nice -n 10 cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2
rm -rf /tmp/c4-t1-formats && nice -n 10 wasm-bindgen --target web --remove-name-section --out-dir /tmp/c4-t1-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm
wc -c /tmp/c4-t1-wasm/roomboard_wasm_bg.wasm /tmp/c4-t1-formats/roomboard_formats_wasm_bg.wasm
```
Attendu : principal ≤ 1 572 864 o et < 1 362 599 + 20 480 o ; formats ≤ 3 145 728 o et < 3 100 344 + 1 024 o.

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- GC2 — Plafonds : principal 1 572 864 o (avant 1 362 599 o), `formats` 3 145 728 o (avant 3 100 344 o, marge 45 Ko : rien d'autre que la ligne `KIND_GRID` de `check_manifest` et le message de `WrongKind`). Tailles mesurées et écrites. Au-delà de +20 Ko / +1 Ko : arrêt, le dire.
- GC3 — Aucun build Tauri, aucun build Android.
- GC5 — `nice -n 10` ; test sur délai rejoué une fois.
- GC6 — Aucune dépendance neuve.
- GC7 — Commits fichier par fichier, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC8 — Aucun octet changé pour `.roomboard` et `.rbitem` de fragment ; `compat_socle`, `compat_c3`, `document_manifest_has_no_kind_field` verts.
- GC9 — `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC11 — Le cœur reste sans dépendance au navigateur.

**Interdits :** aucun champ neuf dans `Manifest` (D5) ; aucun `kind: "pack"` accepté par `check_manifest` (D3, D4) ;
aucune modification de `crates/roomboard-formats*` (elles héritent de `check_manifest` seules) ; aucun message existant
reformulé.

**Critère « terminé » :** les tests de `compat_c4` passent, la suite `roomboard-core` est verte, `cargo clippy -p roomboard-core --all-targets -- -D warnings` sans avertissement, `cargo fmt --all --check` propre, deux tailles écrites dans `docs/essais/taille-wasm.md`, rapport avec `Réutilisation : appelé format::save_fragment_parts (généralisé)` ou `Réutilisation : écart — <pourquoi>`.

- [ ] **Étape 1 : écrire le test qui échoue** — `crates/roomboard-core/tests/compat_c4.rs`

```rust
//! C4 (D2, D3, D21) : grille enregistrée en ressource `.rbitem` (`kind: "grid"`), refus croisés, `kind` inconnu.
use roomboard_core::commands::Command;
use roomboard_core::document::Document;
use roomboard_core::format::{
    container_kind, load_fragment, load_resource, load_with_manifest, manifest_kind, save, save_fragment,
    save_resource, FormatError, SaveMeta, KIND_DOCUMENT, KIND_FRAGMENT, KIND_GRID,
};
use roomboard_core::grid::{GridInput, GridLevelView};

fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "c4-test".into(),
        now: "2026-11-21T08:00:00Z".into(),
        created: None,
    }
}

fn grid() -> GridInput {
    GridInput {
        visible: true,
        snap: false,
        above: false,
        levels: vec![GridLevelView {
            kind: "squares".into(),
            spacing_x: 40.0,
            spacing_y: 40.0,
            origin_x: 0.0,
            origin_y: 0.0,
            color: "#7aa7d8".into(),
            line: "solid".into(),
            line_width: 1.0,
            snap: false,
            visible: true,
        }],
    }
}

fn grid_doc() -> Document {
    let mut d = Document::blank();
    let p = d.page_ids()[0].clone();
    d.apply(Command::SetGrid { page: p, grid: Some(grid()) }).expect("SetGrid");
    d
}

#[test]
fn grid_resource_round_trips_with_same_bytes() {
    let bytes = save_resource(&grid_doc(), &meta(), KIND_GRID, "Seyès").expect("écrite");
    let (g, m) = load_resource(&bytes, KIND_GRID).expect("relue");
    assert_eq!(m.kind.as_deref(), Some(KIND_GRID));
    assert_eq!(m.name.as_deref(), Some("Seyès"));
    assert_eq!(m.bounds, None, "une grille n'a aucun élément");
    let p = g.page_ids()[0].clone();
    assert_eq!(g.page(&p).and_then(|v| v.grid), Some(grid()));
    let again = save_resource(&g, &SaveMeta { created: Some(m.created.clone()), ..meta() }, KIND_GRID, "Seyès")
        .expect("réécrite");
    assert_eq!(again, bytes, "un .rbitem de grille rechargé garde ses octets");
}

#[test]
fn grid_resource_is_refused_as_fragment_and_as_document() {
    let bytes = save_resource(&grid_doc(), &meta(), KIND_GRID, "Seyès").expect("écrite");
    let as_fragment = load_fragment(&bytes).err();
    assert_eq!(as_fragment, Some(FormatError::WrongKind { expected: KIND_FRAGMENT, found: KIND_GRID }));
    assert_eq!(
        as_fragment.unwrap().to_string(),
        "ce fichier est une grille RoomBoard : déposez-la sur une page"
    );
    assert_eq!(
        load_with_manifest(&bytes).err(),
        Some(FormatError::WrongKind { expected: KIND_DOCUMENT, found: KIND_GRID })
    );
}

#[test]
fn messages_of_before_c4_are_unchanged() {
    let frag = save_fragment(&Document::blank(), &meta(), "Sélection").expect("fragment");
    assert_eq!(
        load_with_manifest(&frag).err().map(|e| e.to_string()).as_deref(),
        Some("ce fichier est un objet RoomBoard (.rbitem) : déposez-le ou importez-le sur une page")
    );
    let doc = save(&Document::blank(), &meta()).expect("document");
    assert_eq!(
        load_fragment(&doc).err().map(|e| e.to_string()).as_deref(),
        Some("ce fichier est un document RoomBoard (.roomboard), pas un objet : ouvrez-le ou insérez ses pages")
    );
    assert_eq!(
        load_resource(&doc, KIND_GRID).err(),
        Some(FormatError::WrongKind { expected: KIND_GRID, found: KIND_DOCUMENT })
    );
}

#[test]
fn manifest_and_container_kind() {
    let g = save_resource(&grid_doc(), &meta(), KIND_GRID, "Seyès").expect("grille");
    assert_eq!(container_kind(&g), Ok(KIND_GRID));
    let d = save(&Document::blank(), &meta()).expect("document");
    assert_eq!(container_kind(&d), Ok(KIND_DOCUMENT));
    let f = save_fragment(&Document::blank(), &meta(), "x").expect("fragment");
    assert_eq!(container_kind(&f), Ok(KIND_FRAGMENT));
    let pack = br#"{"format":"roomboard","formatVersion":1,"schema":1,"appVersion":"x","created":"c","modified":"m","kind":"pack"}"#;
    let e = manifest_kind(pack).err();
    assert_eq!(e, Some(FormatError::UnknownKind { found: "pack".into() }));
    assert_eq!(
        e.unwrap().to_string(),
        "type de fichier RoomBoard inconnu (« pack ») : pris en charge dans une prochaine version"
    );
}

#[test]
fn save_resource_refuses_a_document_kind() {
    assert!(matches!(
        save_resource(&Document::blank(), &meta(), KIND_DOCUMENT, "x"),
        Err(FormatError::Corrupt(_))
    ));
}
```

- [ ] **Étape 2 : le lancer, il échoue** — `cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && nice -n 10 cargo test -p roomboard-core --test compat_c4 2>&1 | grep -E "error\[|cannot find" | head -5` : `error[E0432]` (`KIND_GRID`, `save_resource`… introuvables).

- [ ] **Étape 3 : constantes, enum, message** — `format/mod.rs`

```rust
/// Valeurs de `kind` connues (U8) : absent ou `"document"` = document `.roomboard` ; `"fragment"` = objet `.rbitem` ;
/// `"grid"` = grille `.rbitem` (C4, U31 : document d'une page, sans élément, qui porte la seule grille).
pub const KIND_DOCUMENT: &str = "document";
pub const KIND_FRAGMENT: &str = "fragment";
pub const KIND_GRID: &str = "grid";
```

Dans l'enum :

```rust
    /// Type connu mais pas celui attendu (PC7) : `found` choisit le message (ce que le fichier est), `expected` le dit
    /// aux tests et aux appelants.
    WrongKind {
        expected: &'static str,
        found: &'static str,
    },
```

Dans `Display`, à la place des deux bras `WrongKind` :

```rust
            FormatError::WrongKind { found, .. } if *found == KIND_GRID => write!(
                f,
                "ce fichier est une grille RoomBoard : déposez-la sur une page"
            ),
            FormatError::WrongKind { found, .. } if *found == KIND_DOCUMENT => write!(
                f,
                "ce fichier est un document RoomBoard (.roomboard), pas un objet : ouvrez-le ou insérez ses pages"
            ),
            FormatError::WrongKind { .. } => write!(
                f,
                "ce fichier est un objet RoomBoard (.rbitem) : déposez-le ou importez-le sur une page"
            ),
```

- [ ] **Étape 4 : `check_manifest`, `kind_of`, `expect_kind`, `manifest_kind`, `container_kind`**

```rust
    match manifest.kind.as_deref() {
        None | Some(KIND_DOCUMENT) | Some(KIND_FRAGMENT) | Some(KIND_GRID) => {}
        Some(other) => {
            // Borné : la valeur vient d'un fichier non fiable et finit dans un message.
            return Err(FormatError::UnknownKind {
                found: other.chars().take(64).collect(),
            });
        }
    }
```

```rust
/// Type d'un manifeste déjà contrôlé par `check_manifest` : `kind` absent = document (U8).
pub fn kind_of(m: &Manifest) -> &'static str {
    match m.kind.as_deref() {
        Some(KIND_FRAGMENT) => KIND_FRAGMENT,
        Some(KIND_GRID) => KIND_GRID,
        _ => KIND_DOCUMENT,
    }
}

/// Le manifeste dit-il le type attendu ? Sinon `WrongKind`, avec le type trouvé.
fn expect_kind(m: &Manifest, expected: &'static str) -> Result<(), FormatError> {
    let found = kind_of(m);
    if found == expected {
        Ok(())
    } else {
        Err(FormatError::WrongKind { expected, found })
    }
}

/// Type d'un manifeste seul (C4) : `format`, versions et `kind` contrôlés comme à l'ouverture.
pub fn manifest_kind(raw: &[u8]) -> Result<&'static str, FormatError> {
    Ok(kind_of(&check_manifest(raw)?))
}

/// Type d'un conteneur entier (C4, repli sans le module des formats) : mêmes contrôles et bornes que `open`.
pub fn container_kind(bytes: &[u8]) -> Result<&'static str, FormatError> {
    Ok(kind_of(&open(bytes)?.manifest))
}
```

- [ ] **Étape 5 : fonctions généralisées** — remplacer `save_fragment_parts` … `load_fragment` (`:334-391`) par :

```rust
/// Manifeste et `document.ybin` d'une ressource (Z6, C4) : `kind` = `KIND_FRAGMENT` ou `KIND_GRID`, `name`, `bounds`
/// des éléments de la page unique (aucune pour une grille sans élément) ; `created` = maintenant.
pub fn save_resource_parts(
    doc: &Document,
    meta: &SaveMeta,
    kind: &'static str,
    name: &str,
) -> Result<Parts, FormatError> {
    let label = match kind {
        KIND_FRAGMENT => "fragment",
        KIND_GRID => "grille",
        other => {
            return Err(FormatError::Corrupt(format!(
                "type de ressource inconnu : {other}"
            )))
        }
    };
    let pages = doc.page_ids();
    if pages.len() != 1 {
        return Err(FormatError::Corrupt(format!(
            "{label} de {} pages : une seule attendue",
            pages.len()
        )));
    }
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
        kind: Some(kind.into()),
        name: Some(name.into()),
        // Une boîte non finie (transformation infinie, NaN) ne s'écrit pas : le JSON ne la relirait pas.
        bounds: doc
            .bounds(&doc.element_ids(&pages[0]))
            .filter(|b| [b.x0, b.y0, b.x1, b.y1].iter().all(|v| v.is_finite())),
    };
    let json =
        serde_json::to_vec_pretty(&manifest).map_err(|e| FormatError::Corrupt(e.to_string()))?;
    Ok(Parts {
        manifest: json,
        ybin: doc.encode_v1(),
    })
}

/// Manifeste et `document.ybin` d'un fragment (Z6) : mêmes octets qu'avant C4.
pub fn save_fragment_parts(doc: &Document, meta: &SaveMeta, name: &str) -> Result<Parts, FormatError> {
    save_resource_parts(doc, meta, KIND_FRAGMENT, name)
}

/// Ressource complète sans asset (mêmes options de date fixe que `save`).
pub fn save_resource(
    doc: &Document,
    meta: &SaveMeta,
    kind: &'static str,
    name: &str,
) -> Result<Vec<u8>, FormatError> {
    let w = write_parts(&save_resource_parts(doc, meta, kind, name)?)?;
    Ok(w.finish().map_err(zip_err)?.into_inner())
}

/// `.rbitem` complet sans asset.
pub fn save_fragment(doc: &Document, meta: &SaveMeta, name: &str) -> Result<Vec<u8>, FormatError> {
    save_resource(doc, meta, KIND_FRAGMENT, name)
}

/// Lit une ressource depuis ses deux moitiés ; un autre type est refusé (`WrongKind`).
pub fn load_resource_parts(
    manifest: &[u8],
    ybin: &[u8],
    kind: &'static str,
) -> Result<(Document, Manifest), FormatError> {
    let m = check_manifest(manifest)?;
    expect_kind(&m, kind)?;
    decode_checked(m, ybin)
}

/// Lit un fragment depuis ses deux moitiés ; un document est refusé (`WrongKind`).
pub fn load_fragment_parts(manifest: &[u8], ybin: &[u8]) -> Result<(Document, Manifest), FormatError> {
    load_resource_parts(manifest, ybin, KIND_FRAGMENT)
}

/// Lit une ressource sans asset (repli quand le module des formats manque).
pub fn load_resource(bytes: &[u8], kind: &'static str) -> Result<(Document, Manifest), FormatError> {
    let opened = open(bytes)?;
    expect_kind(&opened.manifest, kind)?;
    decode_checked(opened.manifest, &opened.parts.ybin)
}

/// Lit un `.rbitem` sans asset ; un document est refusé (`WrongKind`).
pub fn load_fragment(bytes: &[u8]) -> Result<(Document, Manifest), FormatError> {
    load_resource(bytes, KIND_FRAGMENT)
}
```

- [ ] **Étape 6 : constructions existantes de `WrongKind`** — `grep -rn "WrongKind {" crates/` ; à chaque `WrongKind { expected: KIND_FRAGMENT }` ajouter `found: KIND_DOCUMENT`, à chaque `WrongKind { expected: KIND_DOCUMENT }` ajouter `found: KIND_FRAGMENT` (seuls cas possibles avant C4). Aucune assertion de message changée.

- [ ] **Étape 7 : tests verts** — commande bornée de la section : `compat_c4` ≥ 5 `ok`, `compat_c3` et `compat_socle` `test result: ok` ; puis la suite du crate, `clippy` et `fmt`.

- [ ] **Étape 8 : mesure** — bloc « Mesure » ; écrire dans `docs/essais/taille-wasm.md` :

```markdown
## C4 (bibliothèque : `kind: "grid"`, ressources généralisées)

| mesure | module principal | module formats |
|---|---|---|
| avant C4 (main 443edd4) | 1 362 599 o | 3 100 344 o |
| après la tâche T1 (`KIND_GRID`, `WrongKind { found }`, `save_resource*`) | <mesuré> o | <mesuré> o |
```

(`<mesuré>` : les deux nombres de `wc -c`, écrits en chiffres groupés par trois.)

- [ ] **Étape 9 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T1
git add crates/roomboard-core/src/format/mod.rs
git add crates/roomboard-core/tests/compat_c4.rs
git add docs/essais/taille-wasm.md
# plus chaque fichier modifié à l'étape 6, un par un
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(core): grid resources (kind grid) and kind-aware WrongKind

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T2 — Pont Wasm et liaison `wasm-core.ts` ; contrat du vrai module
<a id="tache-t2"></a>

**Objectif :** la page appelle en Wasm l'écriture et la lecture d'une grille en ressource et le type d'un manifeste ou
d'un conteneur, avec les mêmes messages que le cœur.

**Fichiers :**
- Modifier : `crates/roomboard-wasm/src/lib.rs:550-584` (à côté des `save_fragment*` / `load_fragment*`)
- Modifier : `apps/web/src/core/wasm-core.ts:661-705`
- Modifier : `apps/web/src/core/wasm-core.contract.test.ts`
- Modifier : `docs/essais/taille-wasm.md`

**Interfaces :**
- Consomme (T1) : `format::{save_resource, save_resource_parts, load_resource, load_resource_parts, manifest_kind, container_kind, KIND_GRID}` ; existants : `Self::fragment_meta(now: &str, app_version: &str) -> SaveMeta`, `Self::wrap(core, None)`, `fmt_err`, `SavedParts`.
- Consomme (T3) : `CoreDocument.saveGrid(now, appVersion, name): Uint8Array`, `saveGridParts(now, appVersion, name): readonly [Uint8Array, Uint8Array]`, `CoreFactory.loadGrid(bytes)`, `loadGridParts(manifest, ybin)`, `manifestKind(manifest): ContainerKind`, `containerKind(bytes): ContainerKind`.
- Produit (Wasm, `#[wasm_bindgen] impl Document`) : `save_grid(&self, now: String, app_version: String, name: String) -> Result<Vec<u8>, JsError>` ; `save_grid_parts(&self, now: String, app_version: String, name: String) -> Result<SavedParts, JsError>` ; `load_grid(bytes: &[u8]) -> Result<Document, JsError>` ; `load_grid_parts(manifest: &[u8], ybin: &[u8]) -> Result<Document, JsError>` ; `manifest_kind(manifest: &[u8]) -> Result<String, JsError>` ; `container_kind(bytes: &[u8]) -> Result<String, JsError>`.
- Réutilise : `crates/roomboard-core/src/format/mod.rs:232` — `check_manifest` exposé en Wasm : `manifest_kind(manifest: &[u8]) -> Result<String, JsError>`.

**Test et commande bornée :**
```bash
cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T2 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2
rm -rf apps/web/src/wasm && nice -n 10 wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm
ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts --reporter=verbose 2>&1 | grep -E "C4|Tests " | tail -12
```
Attendu : ≥ 3 tests « C4 : … », `Tests` sans `failed`. Garder vert : tout le fichier de contrat (`Tests  N passed`).

**Mesure (GC2) :** après la commande ci-dessus, `nice -n 10 cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf /tmp/c4-t2-formats && nice -n 10 wasm-bindgen --target web --remove-name-section --out-dir /tmp/c4-t2-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm && wc -c apps/web/src/wasm/roomboard_wasm_bg.wasm /tmp/c4-t2-formats/roomboard_formats_wasm_bg.wasm`. Attendu : principal ≤ 1 572 864 o et < 1 362 599 + 20 480 o ; formats ≤ 3 145 728 o.

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- GC2 — Plafonds : principal 1 572 864 o (avant 1 362 599 o), `formats` 3 145 728 o (avant 3 100 344 o, marge 45 Ko). Tailles mesurées et écrites ; au-delà de +20 Ko / +1 Ko : arrêt, le dire.
- GC3 — Aucun build Tauri, aucun build Android.
- GC5 — `nice -n 10` ; test sur délai rejoué une fois.
- GC6 — Aucune dépendance neuve.
- GC7 — Commits fichier par fichier, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC8 — Aucun octet changé pour `.roomboard` et `.rbitem` de fragment.
- GC9 — `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC10 — Tests neufs nommés « C4 : … ».

**Interdits :** ne pas toucher `crates/roomboard-formats-wasm` ; ne pas renommer les fonctions de fragment existantes ;
`apps/web/src/wasm` n'est jamais commité.

**Critère « terminé » :** contrat vert sous `ROOMBOARD_WASM_REQUIRED=1`, `cargo clippy -p roomboard-wasm --all-targets -- -D warnings` propre, tailles écrites, rapport avec `Réutilisation : appelé format::manifest_kind (check_manifest)`.

- [ ] **Étape 1 : test du contrat qui échoue** — dans `wasm-core.contract.test.ts`, dans le `describe` qui charge le vrai module (même garde `required` que les blocs C3), ajouter :

```ts
  it("C4 : grille en ressource écrite puis relue, kind « grid »", () => {
    const d = core.blank();
    const p = d.pageIds()[0]!;
    const grid = { visible: true, snap: false, above: false, levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#7aa7d8", line: "solid", lineWidth: 1, snap: false, visible: true }] };
    d.apply({ type: "SetGrid", page: p, grid });
    const bytes = d.saveGrid("2026-11-21T08:00:00Z", "c4", "Seyès");
    expect(core.containerKind(bytes)).toBe("grid");
    const g = core.loadGrid(bytes);
    expect(g.page(g.pageIds()[0]!)?.grid).toEqual(grid);
    const [manifest, ybin] = d.saveGridParts("2026-11-21T08:00:00Z", "c4", "Seyès");
    expect(core.manifestKind(manifest)).toBe("grid");
    core.loadGridParts(manifest, ybin).free();
    g.free();
    d.free();
  });

  it("C4 : une grille lue comme objet ou comme document : message de la grille", () => {
    const d = core.blank();
    d.apply({ type: "SetGrid", page: d.pageIds()[0]!, grid: { visible: true, snap: false, above: false, levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#000000", line: "solid", lineWidth: 1, snap: false, visible: true }] } });
    const bytes = d.saveGrid("2026-11-21T08:00:00Z", "c4", "G");
    expect(() => core.loadFragment(bytes)).toThrow("ce fichier est une grille RoomBoard : déposez-la sur une page");
    expect(() => core.load(bytes)).toThrow("ce fichier est une grille RoomBoard : déposez-la sur une page");
    d.free();
  });

  it("C4 : kind « pack » refusé par manifestKind avec le message de UnknownKind", () => {
    const m = new TextEncoder().encode('{"format":"roomboard","formatVersion":1,"schema":1,"appVersion":"x","created":"c","modified":"m","kind":"pack"}');
    expect(() => core.manifestKind(m)).toThrow("type de fichier RoomBoard inconnu (« pack ») : pris en charge dans une prochaine version");
  });
```

(`core` : la fabrique Wasm du `describe`, déjà nommée ainsi par les blocs C3 ; sinon reprendre le nom local.)

- [ ] **Étape 2 : il échoue** — commande bornée : `saveGrid is not a function` (ou `TypeError`).

- [ ] **Étape 3 : pont Rust** — dans `#[wasm_bindgen] impl Document`, après `load_fragment_parts` :

```rust
    /// `.rbitem` de grille sans asset (C4, D2).
    pub fn save_grid(&self, now: String, app_version: String, name: String) -> Result<Vec<u8>, JsError> {
        format::save_resource(&self.core, &Self::fragment_meta(&now, &app_version), format::KIND_GRID, &name)
            .map_err(fmt_err)
    }

    /// Manifeste et `document.ybin` d'une grille, pour le conteneur avec assets (C4).
    pub fn save_grid_parts(&self, now: String, app_version: String, name: String) -> Result<SavedParts, JsError> {
        let p = format::save_resource_parts(&self.core, &Self::fragment_meta(&now, &app_version), format::KIND_GRID, &name)
            .map_err(fmt_err)?;
        Ok(SavedParts { manifest: p.manifest, ybin: p.ybin })
    }

    /// Lit un `.rbitem` de grille sans asset ; un autre type est refusé (`WrongKind`).
    pub fn load_grid(bytes: &[u8]) -> Result<Document, JsError> {
        let (core, _) = format::load_resource(bytes, format::KIND_GRID).map_err(fmt_err)?;
        Ok(Self::wrap(core, None))
    }

    /// Lit une grille depuis ses deux moitiés ; mêmes erreurs que `load_grid`.
    pub fn load_grid_parts(manifest: &[u8], ybin: &[u8]) -> Result<Document, JsError> {
        let (core, _) = format::load_resource_parts(manifest, ybin, format::KIND_GRID).map_err(fmt_err)?;
        Ok(Self::wrap(core, None))
    }

    /// Type d'un manifeste (`document`, `fragment`, `grid`) ; format, version ou `kind` inconnus : erreur du cœur.
    pub fn manifest_kind(manifest: &[u8]) -> Result<String, JsError> {
        format::manifest_kind(manifest).map(String::from).map_err(fmt_err)
    }

    /// Type d'un conteneur entier (repli sans le module des formats).
    pub fn container_kind(bytes: &[u8]) -> Result<String, JsError> {
        format::container_kind(bytes).map(String::from).map_err(fmt_err)
    }
```

(`rustfmt` reformate ; si `Self::wrap` a une autre signature, reprendre exactement l'appel de `load_fragment_inner`, `lib.rs:1452-1455`.)

- [ ] **Étape 4 : liaison TS** — `wasm-core.ts`, dans `WasmCoreDocument` à côté de `saveFragment` :

```ts
  saveGrid(now: string, appVersion: string, name: string): Uint8Array { return this.d.save_grid(now, appVersion, name); }
  saveGridParts(now: string, appVersion: string, name: string): readonly [Uint8Array, Uint8Array] {
    const p = this.d.save_grid_parts(now, appVersion, name);
    try {
      return [p.manifest, p.ybin] as const;
    } finally {
      p.free();
    }
  }
```

(reprendre la forme exacte de `saveFragmentParts`, `wasm-core.ts:664-670`, pour la lecture et la libération de `SavedParts`.)
Dans la fabrique, à côté de `loadFragmentParts` :

```ts
    loadGrid: (bytes: Uint8Array) => new WasmCoreDocument(mod.Document.load_grid(bytes), mod),
    loadGridParts: (manifest: Uint8Array, ybin: Uint8Array) => new WasmCoreDocument(mod.Document.load_grid_parts(manifest, ybin), mod),
    manifestKind: (manifest: Uint8Array) => asContainerKind(mod.Document.manifest_kind(manifest)),
    containerKind: (bytes: Uint8Array) => asContainerKind(mod.Document.container_kind(bytes)),
```

et en tête du module :

```ts
/** Le cœur ne rend que ces trois valeurs ; toute autre est une erreur de liaison. */
const asContainerKind = (k: string): ContainerKind => {
  if (k === "document" || k === "fragment" || k === "grid") return k;
  throw new Error(`type de conteneur inattendu : ${k}`);
};
```

(`ContainerKind` importé de `./api`, T3.)

- [ ] **Étape 5 : tests verts** — commande bornée ; tout le fichier de contrat vert.

- [ ] **Étape 6 : mesure** — bloc « Mesure » ; ajouter la ligne `| après la tâche T2 (pont Wasm des grilles) | <mesuré> o | <mesuré> o |` au tableau C4 de `docs/essais/taille-wasm.md`.

- [ ] **Étape 7 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T2
git add crates/roomboard-wasm/src/lib.rs
git add apps/web/src/core/wasm-core.ts
git add apps/web/src/core/wasm-core.contract.test.ts
git add docs/essais/taille-wasm.md
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(wasm): bind grid resources and container kind

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T3 — API TS du cœur et faux cœur
<a id="tache-t3"></a>

**Objectif :** le contrat TS du cœur connaît la grille en ressource et le type d'un conteneur ; le faux cœur le tient
avec les messages du vrai.

**Fichiers :**
- Modifier : `apps/web/src/core/api.ts:377-397` (méthodes), `:451-455` (messages)
- Modifier : `apps/web/src/core/fake-core.ts:1472-1480`, `:1833-1858`, `:1881-1891`
- Modifier : `apps/web/src/core/fake-core.test.ts`
- Modifier : chaque objet typé `CoreFactory` ou classe qui `implements CoreDocument` hors de `fake-core.ts` et `wasm-core.ts`, relevé par `grep -rn ": CoreFactory\|implements CoreDocument" apps/web/src` (y ajouter les membres ci-dessous, en `throw new Error("non utilisé")` pour un double de test)

**Interfaces :**
- Produit (`api.ts`) :
  - `export type ContainerKind = "document" | "fragment" | "grid";`
  - `export const IS_A_GRID_MESSAGE = "ce fichier est une grille RoomBoard : déposez-la sur une page";`
  - `export const wrongKindMessage = (found: ContainerKind): string`
  - `CoreDocument.saveGrid(now: string, appVersion: string, name: string): Uint8Array`
  - `CoreDocument.saveGridParts(now: string, appVersion: string, name: string): readonly [Uint8Array, Uint8Array]`
  - `CoreFactory.loadGrid(bytes: Uint8Array): CoreDocument`
  - `CoreFactory.loadGridParts(manifest: Uint8Array, ybin: Uint8Array): CoreDocument`
  - `CoreFactory.manifestKind(manifest: Uint8Array): ContainerKind`
  - `CoreFactory.containerKind(bytes: Uint8Array): ContainerKind`
- Consommé par : T2 (`wasm-core.ts`), T4 (`container-io.ts`, `fragments.ts`).

**Test et commande bornée :** `cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T3 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/core/fake-core.test.ts --reporter=verbose 2>&1 | grep -E "C4|Tests " | tail -12` : ≥ 4 tests « C4 », `Tests` sans `failed`.
Puis le type : `nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | grep "error TS" | grep -v wasm-core.ts | head -5` : aucune ligne.

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- GC5 — `nice -n 10` ; test sur délai rejoué une fois.
- GC6 — Aucune dépendance neuve.
- GC7 — Commits fichier par fichier, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC8 — Un fichier du faux cœur d'avant C4 (fragment, document) se relit tel quel.
- GC10 — Tests neufs nommés « C4 : … ».

**Interdits :** aucun message existant reformulé (`NOT_A_DOCUMENT_MESSAGE`, `NOT_A_FRAGMENT_MESSAGE`, `unknownKindMessage`).

**Critère « terminé » :** tests verts, `tsc --noEmit` sans erreur hors `wasm-core.ts`, rapport.

- [ ] **Étape 1 : tests qui échouent** — `fake-core.test.ts` :

```ts
describe("C4 : grille en ressource (faux cœur)", () => {
  const grid = { visible: true, snap: false, above: false, levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#7aa7d8", line: "solid", lineWidth: 1, snap: false, visible: true }] };
  const gridDoc = () => {
    const d = fakeCore.blank();
    d.apply({ type: "SetGrid", page: d.pageIds()[0]!, grid });
    return d;
  };

  it("C4 : saveGrid puis loadGrid rend la grille", () => {
    const bytes = gridDoc().saveGrid("2026-11-21T08:00:00Z", "c4", "Seyès");
    const g = fakeCore.loadGrid(bytes);
    expect(g.page(g.pageIds()[0]!)?.grid).toEqual(grid);
  });

  it("C4 : containerKind et manifestKind", () => {
    const d = gridDoc();
    expect(fakeCore.containerKind(d.saveGrid("n", "a", "G"))).toBe("grid");
    expect(fakeCore.containerKind(fakeCore.blank().save("n", "a"))).toBe("document");
    expect(fakeCore.containerKind(fakeCore.blank().saveFragment("n", "a", "x"))).toBe("fragment");
    expect(fakeCore.manifestKind(d.saveGridParts("n", "a", "G")[0])).toBe("grid");
    expect(() => fakeCore.manifestKind(new TextEncoder().encode('{"kind":"pack"}'))).toThrow(unknownKindMessage("pack"));
  });

  it("C4 : une grille lue comme objet ou document : message de la grille", () => {
    const bytes = gridDoc().saveGrid("n", "a", "G");
    expect(() => fakeCore.loadFragment(bytes)).toThrow(IS_A_GRID_MESSAGE);
    expect(() => fakeCore.load(bytes)).toThrow(IS_A_GRID_MESSAGE);
  });

  it("C4 : messages d'avant C4 inchangés", () => {
    expect(() => fakeCore.load(fakeCore.blank().saveFragment("n", "a", "x"))).toThrow(NOT_A_DOCUMENT_MESSAGE);
    expect(() => fakeCore.loadFragment(fakeCore.blank().save("n", "a"))).toThrow(NOT_A_FRAGMENT_MESSAGE);
    expect(() => fakeCore.loadGrid(fakeCore.blank().save("n", "a"))).toThrow(NOT_A_FRAGMENT_MESSAGE);
    expect(wrongKindMessage("fragment")).toBe(NOT_A_DOCUMENT_MESSAGE);
    expect(wrongKindMessage("document")).toBe(NOT_A_FRAGMENT_MESSAGE);
    expect(wrongKindMessage("grid")).toBe(IS_A_GRID_MESSAGE);
  });
});
```

(imports : `IS_A_GRID_MESSAGE`, `NOT_A_DOCUMENT_MESSAGE`, `NOT_A_FRAGMENT_MESSAGE`, `unknownKindMessage`, `wrongKindMessage` depuis `./api`.)

- [ ] **Étape 2 : ils échouent** — commande bornée : `saveGrid is not a function`.

- [ ] **Étape 3 : `api.ts`** — après `NOT_A_FRAGMENT_MESSAGE` :

```ts
/** C4 (D3) : type d'un conteneur RoomBoard ; `kind` absent = document (U8). */
export type ContainerKind = "document" | "fragment" | "grid";
export const IS_A_GRID_MESSAGE = "ce fichier est une grille RoomBoard : déposez-la sur une page";
/** Message du mauvais type, choisi sur ce que le fichier est (même règle que `FormatError::WrongKind`). */
export const wrongKindMessage = (found: ContainerKind): string =>
  found === "grid" ? IS_A_GRID_MESSAGE : found === "fragment" ? NOT_A_DOCUMENT_MESSAGE : NOT_A_FRAGMENT_MESSAGE;
```

Dans `CoreDocument`, après `saveFragmentParts` :

```ts
  /** C4 (D2) : `.rbitem` de grille (une page, sans élément) sans asset. */
  saveGrid(now: string, appVersion: string, name: string): Uint8Array;
  saveGridParts(now: string, appVersion: string, name: string): readonly [Uint8Array, Uint8Array];
```

Dans `CoreFactory`, après `loadFragmentParts` :

```ts
  /** C4 : grille en ressource ; un autre type : `wrongKindMessage`. */
  loadGrid(bytes: Uint8Array): CoreDocument;
  loadGridParts(manifest: Uint8Array, ybin: Uint8Array): CoreDocument;
  /** C4 : type d'un manifeste ; format, version ou `kind` inconnus : erreur du cœur. */
  manifestKind(manifest: Uint8Array): ContainerKind;
  /** C4 : type d'un conteneur entier (repli sans le module des formats). */
  containerKind(bytes: Uint8Array): ContainerKind;
```

- [ ] **Étape 4 : faux cœur** — `FakeDocument` :

```ts
  saveGrid(now: string, appVersion: string, name: string): Uint8Array {
    const n = this.state.pages.length;
    if (n !== 1) throw new Error(`document RoomBoard endommagé : grille de ${n} pages : une seule attendue`);
    return new TextEncoder().encode(JSON.stringify({ kind: "grid", name, ...this.json(now, appVersion) }));
  }
  saveGridParts(now: string, appVersion: string, name: string): readonly [Uint8Array, Uint8Array] {
    const manifest = new TextEncoder().encode(JSON.stringify({ format: "roomboard-fake", kind: "grid", name, appVersion, modified: now }));
    return [manifest, this.saveGrid(now, appVersion, name)] as const;
  }
```

`loadFake` :

```ts
function fakeKind(raw: Record<string, unknown>): ContainerKind {
  const kind = raw["kind"] ?? "document";
  if (kind !== "document" && kind !== "fragment" && kind !== "grid") throw new Error(unknownKindMessage(String(kind)));
  return kind;
}

function parseFake(bytes: Uint8Array): Record<string, unknown> {
  // Même message que le cœur (`FormatError::NotRoomboard`) : le lot 3 l'affiche tel quel.
  const notRoomboard = "ce fichier n'est pas un document RoomBoard";
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error(notRoomboard);
  }
  if (!isRecord(raw)) throw new Error(notRoomboard);
  return raw;
}

function loadFake(bytes: Uint8Array, expected: ContainerKind = "document"): CoreDocument {
  const raw = parseFake(bytes);
  // C3 : le type se lit à l'ouverture, avant le contenu ; kind absent : document d'avant C3.
  const kind = fakeKind(raw);
  if (!Array.isArray(raw["pages"])) throw new Error("ce fichier n'est pas un document RoomBoard");
  if (kind !== expected) throw new Error(wrongKindMessage(kind));
  // … suite inchangée (`pages`, `assets`, `new FakeDocument`)
}
```

Fabrique `fakeCore`, après `loadFragmentParts` :

```ts
  loadGrid: (bytes: Uint8Array) => loadFake(bytes, "grid"),
  loadGridParts: (manifest: Uint8Array, ybin: Uint8Array) => {
    void manifest;
    return loadFake(ybin, "grid");
  },
  manifestKind: (manifest: Uint8Array) => fakeKind(parseFake(manifest)),
  containerKind: (bytes: Uint8Array) => fakeKind(parseFake(bytes)),
```

- [ ] **Étape 5 : autres implémentations** — `grep -rn ": CoreFactory\|implements CoreDocument" apps/web/src` ; compléter chaque double de test hors `fake-core.ts` et `wasm-core.ts` (membres neufs en `throw new Error("non utilisé")`). `wasm-core.ts` appartient à T2 : ne pas y toucher ; lancer `nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | grep "error TS" | grep -v wasm-core.ts | head` : aucune ligne ; les erreurs restantes de `wasm-core.ts` sont dites au rapport (T2 les ferme).

- [ ] **Étape 6 : tests verts** — commande bornée ; puis `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/core --reporter=dot 2>&1 | tail -4` : `Tests` sans `failed`.

- [ ] **Étape 7 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T3
git add apps/web/src/core/api.ts
git add apps/web/src/core/fake-core.ts
git add apps/web/src/core/fake-core.test.ts
# plus chaque double complété à l'étape 5, un par un
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(web): grid resource and container kind in core API and fake core

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T4 — `ContainerIO` à liste de `kind` ; `FragmentOps.insertResource` et `encodeGrid`
<a id="tache-t4"></a>

**Objectif :** une ressource lue décide seule de son chemin : objets → insertion existante ; grille → un `SetGrid` sur
la page montrée (aucune étape si c'est la même grille) ; la grille de la page s'écrit en `.rbitem`.

**Fichiers :**
- Modifier : `apps/web/src/app/container-io.ts:40-57`, `:90-152`
- Modifier : `apps/web/src/app/container-io.test.ts`
- Modifier : `apps/web/src/app/fragments.ts:21-38`, `:81-108`, `:110-150`
- Modifier : `apps/web/src/app/fragments.test.ts`
- Modifier : `apps/web/src/app/workspace.ts:252` (une ligne : `core` passé à `createFragmentOps`)

**Interfaces :**
- Consomme (T3) : `ContainerKind`, `CoreFactory.loadGrid`, `loadGridParts`, `containerKind`, `manifestKind`, `CoreDocument.saveGrid`, `saveGridParts`.
- Produit (`container-io.ts`) :
  - `export type EncodeAs = { readonly kind: "document" } | { readonly kind: "fragment"; readonly name: string } | { readonly kind: "grid"; readonly name: string };`
  - `export type ReadKind = ContainerKind;`
  - `ReadResult` gagne `readonly kind: ReadKind`
  - `ContainerIO.read(name: string, bytes: Uint8Array, kind: ReadKind | readonly ReadKind[], docPath?: string | null): Promise<ReadResult | null>`
- Produit (`fragments.ts`) :
  - `export const GRID_NAME = "Grille";`
  - `export const NO_GRID_MESSAGE = "cette page n'a pas de grille, rien n'est ajouté";`
  - `export const EMPTY_GRID_MESSAGE = "grille vide, rien n'est appliqué";`
  - `FragmentDeps` gagne `readonly core: Pick<CoreFactory, "blank">`
  - `FragmentOps.insertResource(tab: TabSession, bytes: Uint8Array, name: string, at: Point | null, index?: number): Promise<InsertOutcome>`
  - `FragmentOps.encodeGrid(tab: TabSession, name?: string): Promise<Uint8Array | null>`
- Réutilise : `apps/web/src/app/fragments.ts:111` — `encodeSelection(tab, "export")` (inchangé, appelé par T14).
- Réutilise : `apps/web/src/app/fragments.ts:81` — `insertOutcome(tab, rbitem, name, at)` : son corps après lecture devient `placeFragment`, appelé par `insertOutcome` et `insertResource`.
- Réutilise : `apps/web/src/app/fragments.ts:31-38` — `FragmentOps` étendu de `insertResource(tab, bytes: Uint8Array, name: string, at: Point | null): Promise<InsertOutcome>` (plus `index?`, pour le rang de cascade du dépôt) et `encodeGrid(tab): Promise<Uint8Array | null>` (null : page sans grille, avis dit).
- Réutilise : `apps/web/src/app/container-io.ts:40-57` — `EncodeAs |= {kind: "grid"; name}` ; `read(name, bytes, kind: ReadKind | readonly ReadKind[], docPath?)` ; `ReadKind = "document" | "fragment" | "grid"` ; `ReadResult.kind`.
- Réutilise : `apps/web/src/core/api.ts:133` — `{type: "SetGrid", page, grid}`, par `tab.board.engine.run(cmd)` (une étape, comme `App.tsx:187`).

**Patron à ne pas reprendre :** relire deux fois les octets (une lecture pour le type, une pour le contenu) ou
essayer les lecteurs l'un après l'autre en rattrapant les erreurs : le type se lit une fois (`manifestKind` sur le
manifeste déjà extrait, `containerKind` dans le repli), puis un seul lecteur. Avec un seul `kind` demandé, le chemin
d'avant C4 est gardé à l'identique (mêmes messages). Chemin de référence : `apps/web/src/app/container-io.ts:107-151`.

**Test et commande bornée :** `cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T4 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app/container-io.test.ts src/app/fragments.test.ts --reporter=verbose 2>&1 | grep -E "C4|Tests " | tail -16` : ≥ 7 tests « C4 », `Tests` sans `failed` (les tests C3 existants des deux fichiers restent verts). Puis `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app src/platform/import.test.ts --reporter=dot 2>&1 | tail -4` : `Tests` sans `failed`.

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- GC5 — `nice -n 10` ; test sur délai rejoué une fois.
- GC7 — Commits fichier par fichier, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC8 — Un `.rbitem` d'objets d'avant C4 s'insère comme avant, mêmes messages.
- GC10 — Tests neufs nommés « C4 : … ».

**Interdits :** pas de second chemin d'insertion d'objets (tout passe par `placeFragment`) ; la grille n'est pas
copiable au presse-papiers (`clipboard.ts`, `paste.ts` intouchés) ; `workspace.ts` : seule la ligne 252.

**Critère « terminé » :** tests verts, `tsc --noEmit` sans erreur hors `wasm-core.ts` si T2 n'est pas encore fusionnée, rapport avec `Réutilisation : appelé fragments.insertOutcome (corps partagé placeFragment)`.

- [ ] **Étape 1 : tests de `container-io` qui échouent** — `container-io.test.ts` (reprendre `memoryCodec` et la fabrique de `ContainerIO` du fichier) :

```ts
describe("C4 : read à liste de kind", () => {
  const grid = { visible: true, snap: false, above: false, levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#000000", line: "solid", lineWidth: 1, snap: false, visible: true }] };
  const gridDoc = () => {
    const d = fakeCore.blank();
    d.apply({ type: "SetGrid", page: d.pageIds()[0]!, grid });
    return d;
  };

  it("C4 : une grille sans asset s'écrit par saveGrid et se lit kind « grid »", async () => {
    const { io, said } = setup(); // fabrique locale du fichier : ContainerIO sur fakeCore + memoryCodec, avis collectés
    const bytes = await io.encode(gridDoc(), createAssetStore(async () => "x"), "n", "a", { kind: "grid", name: "Seyès" });
    const r = await io.read("Seyès.rbitem", bytes, ["fragment", "grid"]);
    expect(r?.kind).toBe("grid");
    expect(r?.doc.page(r.doc.pageIds()[0]!)?.grid).toEqual(grid);
    expect(said).toEqual([]);
  });

  it("C4 : un objet lu avec la liste rend kind « fragment »", async () => {
    const { io } = setup();
    const r = await io.read("x.rbitem", fakeCore.blank().saveFragment("n", "a", "x"), ["fragment", "grid"]);
    expect(r?.kind).toBe("fragment");
  });

  it("C4 : un document lu avec la liste objet/grille : message du document", async () => {
    const { io, said } = setup();
    expect(await io.read("d.rbitem", fakeCore.blank().save("n", "a"), ["fragment", "grid"])).toBeNull();
    expect(said).toEqual([`Ouverture impossible (d.rbitem) : ${NOT_A_FRAGMENT_MESSAGE}`]);
  });

  it("C4 : read à kind seul garde les messages d'avant", async () => {
    const { io, said } = setup();
    expect(await io.read("o.roomboard", fakeCore.blank().saveFragment("n", "a", "x"), "document")).toBeNull();
    expect(await io.read("g.rbitem", gridDoc().saveGrid("n", "a", "G"), "fragment")).toBeNull();
    expect(said).toEqual([`Ouverture impossible (o.roomboard) : ${NOT_A_DOCUMENT_MESSAGE}`, `Ouverture impossible (g.rbitem) : ${IS_A_GRID_MESSAGE}`]);
  });
});
```

Si le fichier n'a pas de fabrique `setup()`, l'écrire en tête du `describe` :

```ts
  const setup = () => {
    const said: string[] = [];
    const io = createContainerIO({ core: fakeCore, codec: memoryCodec(), say: async (m) => void said.push(m), makeAssets: () => createAssetStore(async () => "x") });
    return { io, said };
  };
```

- [ ] **Étape 2 : tests de `fragments` qui échouent** — `fragments.test.ts` : étendre `tabOf` (`engine.run`) et la fabrique d'ops :

```ts
// dans tabOf, objet engine :
    run: (cmd: Command) => doc.apply(cmd),
// et ops : createFragmentOps({ io, core: fakeCore, now: () => NOW, appVersion: "t", say, alive: () => true })
```

```ts
describe("C4 : insertResource et encodeGrid", () => {
  const grid = { visible: true, snap: false, above: false, levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#000000", line: "solid", lineWidth: 1, snap: false, visible: true }] };

  it("C4 : insertResource d'une grille pose un SetGrid, une étape", async () => {
    const { ops, said } = opsOf();
    const src = tabOf();
    src.doc.apply({ type: "SetGrid", page: src.doc.pageIds()[0]!, grid });
    const bytes = (await ops.encodeGrid(src.tab, "Seyès"))!;
    const dst = tabOf();
    const runs = vi.spyOn(dst.tab.board.engine, "run");
    expect(await ops.insertResource(dst.tab, bytes, "Seyès", { x: 10, y: 10 })).toBe("inserted");
    expect(runs).toHaveBeenCalledTimes(1);
    expect(dst.doc.page(dst.doc.pageIds()[0]!)?.grid).toEqual(grid);
    expect(said).toEqual([]);
  });

  it("C4 : même grille : aucune étape", async () => {
    const { ops } = opsOf();
    const t = tabOf();
    t.doc.apply({ type: "SetGrid", page: t.doc.pageIds()[0]!, grid });
    const bytes = (await ops.encodeGrid(t.tab))!;
    const runs = vi.spyOn(t.tab.board.engine, "run");
    expect(await ops.insertResource(t.tab, bytes, "G", null)).toBe("inserted");
    expect(runs).not.toHaveBeenCalled();
  });

  it("C4 : insertResource d'objets suit l'insertion existante", async () => {
    const { ops } = opsOf();
    const src = tabOf();
    src.doc.apply({ type: "AddShape", page: src.doc.pageIds()[0]!, shape: "rect", x: 0, y: 0, w: 10, h: 10 } as Command);
    src.select(src.doc.elementIds(src.doc.pageIds()[0]!));
    const bytes = (await ops.encodeSelection(src.tab, "export"))!;
    const dst = tabOf();
    expect(await ops.insertResource(dst.tab, bytes, "Moitié", { x: 100, y: 100 })).toBe("inserted");
    expect(dst.doc.elementIds(dst.doc.pageIds()[0]!)).toHaveLength(1);
  });

  it("C4 : encodeGrid d'une page sans grille : null, avis dit", async () => {
    const { ops, said } = opsOf();
    expect(await ops.encodeGrid(tabOf().tab)).toBeNull();
    expect(said).toEqual([NO_GRID_MESSAGE]);
  });
});
```

(`opsOf()` : fabrique locale qui rend `{ ops, said }` avec `createFragmentOps` ci-dessus et un `ContainerIO` sur `memoryCodec()` ; pour l'objet, reprendre la commande de forme que les tests C3 du fichier utilisent déjà — `grep -n "apply({ type" apps/web/src/app/fragments.test.ts` — à la place de la ligne `AddShape` si sa forme diffère.)

- [ ] **Étape 3 : ils échouent** — commande bornée : `insertResource is not a function`, `kind` absent.

- [ ] **Étape 4 : `container-io.ts`** — types :

```ts
export type EncodeAs =
  | { readonly kind: "document" }
  | { readonly kind: "fragment"; readonly name: string }
  | { readonly kind: "grid"; readonly name: string };
export type ReadKind = ContainerKind;
export interface ReadResult {
  readonly doc: CoreDocument;
  readonly assets: AssetStore;
  readonly unread: boolean;
  /** C4 : type lu (un parmi ceux demandés). */
  readonly kind: ReadKind;
}
```

`ContainerIO.read(name: string, bytes: Uint8Array, kind: ReadKind | readonly ReadKind[], docPath?: string | null)`.

Dans `createContainerIO`, aides :

```ts
  const loadWhole = (k: ReadKind, b: Uint8Array): CoreDocument =>
    k === "document" ? core.load(b) : k === "fragment" ? core.loadFragment(b) : core.loadGrid(b);
  const loadParts = (k: ReadKind, m: Uint8Array, y: Uint8Array): CoreDocument =>
    k === "document" ? core.loadParts(m, y) : k === "fragment" ? core.loadFragmentParts(m, y) : core.loadGridParts(m, y);
  /** Un seul type demandé : lui, sans détection (chemin d'avant C4) ; sinon le type lu s'il est demandé, sinon le
   *  premier demandé (son lecteur dit le bon message du mauvais type). */
  const choose = (wanted: readonly ReadKind[], detect: () => ReadKind): ReadKind => {
    if (wanted.length === 1) return wanted[0]!;
    const found = detect();
    return wanted.includes(found) ? found : wanted[0]!;
  };
```

`encode` :

```ts
      if (cited.length === 0) {
        if (as.kind === "document") return doc.save(now, appVersion);
        return as.kind === "fragment" ? doc.saveFragment(now, appVersion, as.name) : doc.saveGrid(now, appVersion, as.name);
      }
      const linked = linkedIds(doc);
      if (as.kind !== "document" && linked.size > 0) throw new LinkedMediaError(); // avant l'image absente (M32)
      const { present, missing } = assets.pick(cited.map((a) => a.id).filter((id) => !linked.has(id)));
      if (as.kind !== "document" && missing.length > 0) throw new MissingAssetError();
      const [manifest, ybin] =
        as.kind === "document" ? doc.saveParts(now, appVersion)
        : as.kind === "fragment" ? doc.saveFragmentParts(now, appVersion, as.name)
        : doc.saveGridParts(now, appVersion, as.name);
```

`read` : en tête `const wanted: readonly ReadKind[] = typeof kind === "string" ? [kind] : kind;`. Repli (`CodecUnavailableError`) :

```ts
        let k: ReadKind;
        let doc: CoreDocument;
        try {
          k = choose(wanted, () => core.containerKind(bytes));
          doc = loadWhole(k, bytes);
        } catch (e2) {
          await say(`Ouverture impossible (${name}) : ${messageOf(e2)}`);
          return null;
        }
        // … `unread` inchangé ; `kind === "document"` remplacé par `k === "document"` ; retour `{ doc, assets, unread, kind: k }`
```

Chemin du conteneur :

```ts
      let k: ReadKind;
      let doc: CoreDocument;
      try {
        k = choose(wanted, () => core.manifestKind(contents.manifest));
        doc = loadParts(k, contents.manifest, contents.ybin);
      } catch (e) {
        await say(`Ouverture impossible (${name}) : ${messageOf(e)}`);
        return null;
      }
      // … suite inchangée, `kind === "document"` → `k === "document"` ; retour `{ doc, assets, unread: missingOf(doc, assets).length > 0, kind: k }`
```

Appels existants : `fragments.ts:82` (`"fragment"`) et `:130` (`"document"`) gardent leur argument chaîne (forme acceptée).

- [ ] **Étape 5 : `fragments.ts`** — constantes, deps, interface :

```ts
export const GRID_NAME = "Grille";
export const NO_GRID_MESSAGE = "cette page n'a pas de grille, rien n'est ajouté";
export const EMPTY_GRID_MESSAGE = "grille vide, rien n'est appliqué";

export interface FragmentDeps {
  readonly io: ContainerIO;
  /** C4 : document neuf de la grille en ressource. */
  readonly core: Pick<CoreFactory, "blank">;
  now(): string;
  readonly appVersion: string;
  say(message: string): Promise<void>;
  alive(tab: TabSession): boolean;
}
```

Dans `FragmentOps` :

```ts
  /** C4 (D2, D14) : objets → `insertOutcome` ; grille → un `SetGrid` sur la page montrée (même grille : aucune étape). */
  insertResource(tab: TabSession, bytes: Uint8Array, name: string, at: Point | null, index?: number): Promise<InsertOutcome>;
  /** C4 (D2) : grille de la page montrée en `.rbitem` de grille ; null : page sans grille (avis dit). */
  encodeGrid(tab: TabSession, name?: string): Promise<Uint8Array | null>;
```

Corps : extraire de `insertOutcome` tout ce qui suit la lecture en `placeFragment` :

```ts
  async function placeFragment(tab: TabSession, read: ReadResult, rbitem: Uint8Array, name: string, at: Point | null, index?: number): Promise<InsertOutcome> {
    if (!(await accept(tab, read, name))) return "refused";
    const src = read.doc;
    try {
      // … corps actuel de `insertOutcome` à partir de `const page = src.pageIds()[0];`, inchangé
    } finally {
      src.free();
    }
  }

  async function insertOutcome(tab: TabSession, rbitem: Uint8Array, name: string, at: Point | null, index?: number): Promise<InsertOutcome> {
    const read = await deps.io.read(name, rbitem, "fragment");
    if (read === null) return "refused";
    return placeFragment(tab, read, rbitem, name, at, index);
  }

  /** D2, D38 : la grille de la ressource sur la page montrée, en un `SetGrid` ; même grille : rien. */
  async function placeGrid(tab: TabSession, read: ReadResult, name: string): Promise<InsertOutcome> {
    if (!(await accept(tab, read, name))) return "refused";
    const src = read.doc;
    try {
      const grid = src.page(src.pageIds()[0] ?? "")?.grid ?? null;
      if (grid === null) {
        await deps.say(`${name} : ${EMPTY_GRID_MESSAGE}`);
        return "empty";
      }
      const page = tab.board.engine.state().page;
      const current = tab.board.doc.page(page)?.grid ?? null;
      if (current !== null && JSON.stringify(current) === JSON.stringify(grid)) return "inserted";
      return tab.board.engine.run({ type: "SetGrid", page, grid }) !== null ? "inserted" : "refused";
    } finally {
      src.free();
    }
  }
```

Dans l'objet rendu :

```ts
    async insertResource(tab, bytes, name, at, index) {
      const read = await deps.io.read(name, bytes, ["fragment", "grid"]);
      if (read === null) return "refused";
      return read.kind === "grid" ? placeGrid(tab, read, name) : placeFragment(tab, read, bytes, name, at, index);
    },
    async encodeGrid(tab, name = GRID_NAME) {
      const grid = tab.board.doc.page(tab.board.engine.state().page)?.grid ?? null;
      if (grid === null) {
        await deps.say(NO_GRID_MESSAGE);
        return null;
      }
      const doc = deps.core.blank();
      try {
        doc.apply({ type: "SetGrid", page: doc.pageIds()[0]!, grid });
        return await deps.io.encode(doc, tab.assets, deps.now(), deps.appVersion, { kind: "grid", name });
      } finally {
        doc.free();
      }
    },
```

(`import type { CoreDocument, CoreFactory } from "../core/api";`.)

- [ ] **Étape 6 : `workspace.ts:252`** — `createFragmentOps({ io, core, now: deps.now, appVersion: APP_VERSION, say, alive: (t) => !released.has(t) })`.

- [ ] **Étape 7 : tests verts** — les deux commandes de la section.

- [ ] **Étape 8 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T4
git add apps/web/src/app/container-io.ts
git add apps/web/src/app/container-io.test.ts
git add apps/web/src/app/fragments.ts
git add apps/web/src/app/fragments.test.ts
git add apps/web/src/app/workspace.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(web): read containers by kind list, insert grid resources

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T5 — Vignette d'une ressource
<a id="tache-t5"></a>

**Objectif :** un PNG de 128 px au plus grand côté, rendu par le peintre d'export, pour une ressource d'objets ou de
grille (D12).

**Fichiers :**
- Créer : `apps/web/src/app/thumbnail.ts`
- Créer : `apps/web/src/app/thumbnail.test.ts`

**Interfaces :**
- Consomme : `CoreDocument.pageIds()`, `elementIds(page)`, `bounds(ids)`, `page(id)` ; `ExportCanvas`, `ContentPainter` (`app/pdf-overlay.ts:27-34`) ; `ImageSource`, `BitmapDecoder` (`engine/render/image-cache.ts:23,40`) ; `loadImageSource(doc, assets, decode)` (`pdf-overlay.ts:46`).
- Produit :
  - `export const THUMB_MAX = 128;`
  - `export const GRID_THUMB_WORLD = 320;` (fenêtre monde d'une grille : 320 × 320)
  - `export function thumbSize(box: Bounds): { readonly w: number; readonly h: number; readonly scale: number } | null`
  - `export interface ThumbDeps { canvas(w: number, h: number): ExportCanvas; painter(ctx: CanvasRenderingContext2D, doc: CoreDocument, images: ImageSource): ContentPainter; decode: BitmapDecoder }`
  - `export async function renderThumbnail(doc: CoreDocument, assets: AssetStore, kind: "fragment" | "grid", deps: ThumbDeps): Promise<Blob | null>`
- Réutilise : `apps/web/src/app/pdf-overlay.ts:46,103`, `engine/render/canvas2d.ts:426` — `loadImageSource`, `browserExportCanvas(w, h)` (passé par T14 en `deps.canvas`), `paintContent(ctx, page, rect, scale)`.
- Réutilise : `apps/web/src/core/api.ts:373`, `engine/render/grid-paint.ts:102` — écart : la grille est peinte par `paintContent`, qui appelle déjà `gridLines` puis `paintGrid(ctx, lines, camera, 1, 1, 1)` (`canvas2d.ts:434-440`) sur le document de la ressource, où la grille est enregistrée ; `gridLinesOf` sert aux grilles non enregistrées (aperçu) et n'est pas appelé.

**Test et commande bornée :** `cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T5 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app/thumbnail.test.ts --reporter=verbose 2>&1 | grep -E "C4|Tests " | tail -8` : ≥ 4 tests « C4 », 0 échec.

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- GC5 — `nice -n 10` ; test sur délai rejoué une fois.
- GC6 — Aucune dépendance neuve.
- GC7 — Commits fichier par fichier, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC10 — Tests neufs nommés « C4 : … ».

**Interdits :** aucun second peintre ; aucun `document.createElement("canvas")` dans ce module (la toile vient de `deps.canvas`).

**Critère « terminé » :** tests verts, rapport avec `Réutilisation : appelé pdf-overlay.loadImageSource, canvas2d.paintContent` et l'écart `gridLinesOf` dit.

- [ ] **Étape 1 : tests qui échouent** — `thumbnail.test.ts` :

```ts
// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createAssetStore } from "../core/asset-store";
import { fakeCore } from "../core/fake-core";
import type { ExportCanvas } from "./pdf-overlay";
import { GRID_THUMB_WORLD, renderThumbnail, THUMB_MAX, thumbSize, type ThumbDeps } from "./thumbnail";

function depsOf() {
  const painted: { rect: unknown; scale: number }[] = [];
  const sizes: [number, number][] = [];
  const released = vi.fn();
  const ctx = { fillStyle: "", fillRect: vi.fn() } as unknown as CanvasRenderingContext2D;
  const deps: ThumbDeps = {
    canvas: (w, h): ExportCanvas => {
      sizes.push([w, h]);
      return { ctx, png: async () => new Uint8Array([0x89, 0x50]), release: released };
    },
    painter: () => ({ paintContent: (_c, _p, rect, scale) => void painted.push({ rect, scale }) }),
    decode: async () => ({ width: 1, height: 1, close() {} }) as never,
  };
  return { deps, painted, sizes, released };
}

describe("C4 : vignette", () => {
  it("C4 : thumbSize garde le rapport, 128 px au plus grand côté", () => {
    expect(thumbSize({ x0: 0, y0: 0, x1: 256, y1: 128 })).toEqual({ w: 128, h: 64, scale: 0.5 });
    expect(thumbSize({ x0: 10, y0: 10, x1: 10, y1: 90 })).toEqual({ w: 1, h: 128, scale: 1.6 });
    expect(thumbSize({ x0: 5, y0: 5, x1: 5, y1: 5 })).toBeNull();
  });

  it("C4 : objets : boîte des éléments peinte à l'échelle de la vignette, toile libérée", async () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0]!;
    d.commitStroke?.(p, new Float32Array([0, 0, 0.5, 256, 128, 0.5]), "#000000", 4);
    const { deps, painted, sizes, released } = depsOf();
    const box = d.bounds(d.elementIds(p))!;
    const blob = await renderThumbnail(d, createAssetStore(async () => "x"), "fragment", deps);
    expect(blob?.type).toBe("image/png");
    expect(Math.max(...sizes[0]!)).toBe(THUMB_MAX);
    expect(painted[0]!.rect).toEqual(box);
    expect(released).toHaveBeenCalledTimes(1);
  });

  it("C4 : grille : fenêtre monde 320 × 320 à 0,4", async () => {
    const d = fakeCore.blank();
    d.apply({ type: "SetGrid", page: d.pageIds()[0]!, grid: { visible: true, snap: false, above: false, levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#000000", line: "solid", lineWidth: 1, snap: false, visible: true }] } });
    const { deps, painted, sizes } = depsOf();
    expect(await renderThumbnail(d, createAssetStore(async () => "x"), "grid", deps)).not.toBeNull();
    expect(sizes[0]).toEqual([THUMB_MAX, THUMB_MAX]);
    expect(painted[0]).toEqual({ rect: { x0: 0, y0: 0, x1: GRID_THUMB_WORLD, y1: GRID_THUMB_WORLD }, scale: THUMB_MAX / GRID_THUMB_WORLD });
  });

  it("C4 : objets sans élément : null, aucune toile", async () => {
    const { deps, sizes } = depsOf();
    expect(await renderThumbnail(fakeCore.blank(), createAssetStore(async () => "x"), "fragment", deps)).toBeNull();
    expect(sizes).toEqual([]);
  });
});
```

(Pour poser un trait dans le faux document, reprendre la commande que `fake-core.test.ts` utilise déjà pour un trait — `grep -n "CommitStroke\|commitStroke" apps/web/src/core/fake-core.test.ts | head -3` — à la place de la ligne `commitStroke?.`.)

- [ ] **Étape 2 : ils échouent** — commande bornée : `Failed to resolve import "./thumbnail"`.

- [ ] **Étape 3 : `thumbnail.ts`**

```ts
/**
 * Vignette d'une ressource (C4, D12) : PNG de 128 px au plus grand côté, rendue par le peintre d'export
 * (`paintContent`, même code de dessin que l'écran) sur une toile d'export, libérée aussitôt. Objets : la boîte de
 * leurs éléments ; grille : une fenêtre monde de 320 × 320 (la grille est peinte par `paintContent`, D12).
 */
import type { Bounds, CoreDocument } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import type { BitmapDecoder, ImageSource } from "../engine/render/image-cache";
import { loadImageSource, type ContentPainter, type ExportCanvas } from "./pdf-overlay";

export const THUMB_MAX = 128;
export const GRID_THUMB_WORLD = 320;

export interface ThumbDeps {
  canvas(w: number, h: number): ExportCanvas;
  painter(ctx: CanvasRenderingContext2D, doc: CoreDocument, images: ImageSource): ContentPainter;
  readonly decode: BitmapDecoder;
}

export function thumbSize(box: Bounds): { readonly w: number; readonly h: number; readonly scale: number } | null {
  const bw = box.x1 - box.x0;
  const bh = box.y1 - box.y0;
  const side = Math.max(bw, bh);
  if (!(side > 0) || !Number.isFinite(side)) return null;
  const scale = THUMB_MAX / side;
  return { w: Math.max(1, Math.round(bw * scale)), h: Math.max(1, Math.round(bh * scale)), scale };
}

export async function renderThumbnail(doc: CoreDocument, assets: AssetStore, kind: "fragment" | "grid", deps: ThumbDeps): Promise<Blob | null> {
  const pageId = doc.pageIds()[0];
  if (pageId === undefined) return null;
  const view = doc.page(pageId);
  if (view === null || view === undefined) return null;
  const rect: Bounds | null =
    kind === "grid" ? { x0: 0, y0: 0, x1: GRID_THUMB_WORLD, y1: GRID_THUMB_WORLD } : doc.bounds(doc.elementIds(pageId));
  if (rect === null) return null;
  const size = thumbSize(rect);
  if (size === null) return null;
  const images = await loadImageSource(doc, assets, deps.decode);
  const canvas = deps.canvas(size.w, size.h);
  try {
    canvas.ctx.fillStyle = "#ffffff";
    canvas.ctx.fillRect(0, 0, size.w, size.h);
    deps.painter(canvas.ctx, doc, images).paintContent(canvas.ctx, view, rect, size.scale);
    return new Blob([(await canvas.png()) as BlobPart], { type: "image/png" });
  } finally {
    canvas.release();
    images.dispose();
  }
}
```

(`Bounds` : reprendre son export réel — `grep -n "export interface Bounds" apps/web/src/core/api.ts` ; `doc.page` rend `PageView | null`.)

- [ ] **Étape 4 : tests verts** — commande bornée.

- [ ] **Étape 5 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T5
git add apps/web/src/app/thumbnail.ts
git add apps/web/src/app/thumbnail.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(web): resource thumbnails through the export painter

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T6 — Stockage `LibraryFiles` et ports de dossiers de la coque
<a id="tache-t6"></a>

**Objectif :** une racine de bibliothèque (« mine » ou « shared ») se lit et s'écrit par chemins relatifs, de la même
façon en mémoire, dans IndexedDB (web) et par `plugin-fs` (coque) ; un chemin qui sort de la racine est refusé.

**Fichiers :**
- Créer : `apps/web/src/platform/idb.ts`
- Modifier : `apps/web/src/platform/pending.ts:53-80` (ses deux aides et l'ouverture paresseuse viennent de `idb.ts`)
- Créer : `apps/web/src/platform/library-files.ts`, `apps/web/src/platform/library-files.test.ts`
- Modifier : `apps/web/src/platform/host-tauri.ts:24-36` (types), `:216-240` (`loadTauriPorts`)

**Interfaces :**
- Produit (`idb.ts`) : `export function finished(tx: IDBTransaction): Promise<void>` ; `export function result<T>(r: IDBRequest<T>): Promise<T>` ; `export function lazyDb(factory: IDBFactory, name: string, version: number, upgrade: (db: IDBDatabase) => void): () => Promise<IDBDatabase>`.
- Produit (`library-files.ts`) :
  - `export type LibraryRoot = "mine" | "shared";`
  - `export interface LibraryPath { readonly path: string; readonly dir: boolean }`
  - `export interface LibraryFiles { readonly root: LibraryRoot; list(): Promise<readonly LibraryPath[]>; read(path: string): Promise<Blob>; write(path: string, data: Blob): Promise<void>; mkdir(path: string): Promise<void>; remove(path: string): Promise<void> }` — `list` rend tout l'arbre trié par `path` ; `write` crée les dossiers parents ; `remove("")` vide la racine ; `remove(dossier)` est récursif.
  - `export const LIBRARY_DB = "roomboard-bibliotheque";`
  - `export const UNSAFE_PATH_MESSAGE = "chemin de bibliothèque refusé";`
  - `export function safeLibraryPath(path: string): string` (rend `path`, ou lève `UNSAFE_PATH_MESSAGE` ; `""` = la racine, accepté)
  - `export function createMemoryLibraryFiles(root: LibraryRoot): LibraryFiles`
  - `export function createIdbLibraryFiles(factory: IDBFactory, root: LibraryRoot, name?: string): LibraryFiles`
  - `export function createTauriLibraryFiles(fs: TauriFs & TauriDirFs, rootPath: string, root: LibraryRoot): LibraryFiles`
- Produit (`host-tauri.ts`) : `export interface TauriDirFs { readDir(path: string): Promise<readonly { readonly name: string; readonly isDirectory: boolean }[]>; mkdir(path: string, o: { readonly recursive: true }): Promise<void>; remove(path: string, o: { readonly recursive: true }): Promise<void>; exists(path: string): Promise<boolean> }` ; `loadTauriPorts()` rend en plus `dirFs: TauriDirFs`, `pickFolder(defaultPath: string | null): Promise<string | null>`, `documentDir(): Promise<string>`.
- Réutilise : `apps/web/src/platform/pending.ts:53-68` — patron `finished` / `result` / ouverture paresseuse ; les deux aides passent dans `platform/idb.ts` (exportées, appelées par les deux bases).
- Réutilise : `apps/web/src/platform/host-tauri.ts:217` — `@tauri-apps/plugin-fs` déjà chargé par `loadTauriPorts` (`readDir`, `mkdir`, `remove`, `exists`) et `@tauri-apps/plugin-dialog` (`open({ directory: true, recursive: true })`).

**Test et commande bornée :** `cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T6 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/library-files.test.ts src/platform/pending.test.ts --reporter=verbose 2>&1 | grep -E "C4|Tests " | tail -30` : ≥ 21 tests « C4 » (même jeu sur les trois réalisations), `Tests` sans `failed` ; `pending.test.ts` inchangé et vert (à garder vert).

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- GC3 — Aucun build Tauri : la réalisation coque est prouvée par un faux `plugin-fs` sur un dossier temporaire de Node, jamais le vrai `Documents`.
- GC5 — `nice -n 10` ; test sur délai rejoué une fois.
- GC6 — Aucune dépendance neuve (`fake-indexeddb` déjà en devDependencies).
- GC7 — Commits fichier par fichier, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC10 — Tests neufs nommés « C4 : … ».

**Interdits :** aucune écriture dans `~/Documents` ou `$HOME` réel par un test ; `pending.ts` garde son comportement
(base, magasin, clé inchangés).

**Critère « terminé » :** tests verts, `tsc --noEmit` sans erreur dans ces fichiers, rapport avec `Réutilisation : appelé idb.finished/result (extraits de pending.ts)`. Écart à dire au rapport : la valeur IndexedDB est `{ bytes: Uint8Array, type }` et non un `Blob` (le clonage d'un `Blob` n'est pas tenu par `fake-indexeddb` sous Node, ni de façon sûre par Safari ancien) ; `read` rend un `Blob`.

- [ ] **Étape 1 : tests qui échouent** — `library-files.test.ts` :

```ts
// @vitest-environment node
import "fake-indexeddb/auto";
import { mkdtemp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { TauriDirFs, TauriFs } from "./host-tauri";
import { createIdbLibraryFiles, createMemoryLibraryFiles, createTauriLibraryFiles, safeLibraryPath, UNSAFE_PATH_MESSAGE, type LibraryFiles } from "./library-files";

const temps: string[] = [];
afterAll(async () => {
  for (const t of temps) await rm(t, { recursive: true, force: true });
});

/** Faux plugin-fs sur un dossier temporaire de Node. */
function nodeFs(): TauriFs & TauriDirFs {
  return {
    readFile: async (p) => new Uint8Array(await readFile(p)),
    writeFile: async (p, d) => writeFile(p, d),
    readDir: async (p) => (await readdir(p, { withFileTypes: true })).map((e) => ({ name: e.name, isDirectory: e.isDirectory() })),
    mkdir: async (p, o) => void (await mkdir(p, o)),
    remove: async (p, o) => rm(p, { recursive: o.recursive, force: false }),
    exists: async (p) => stat(p).then(() => true, () => false),
  };
}

let n = 0;
const makers: [string, () => Promise<LibraryFiles>][] = [
  ["mémoire", async () => createMemoryLibraryFiles("mine")],
  ["IndexedDB", async () => createIdbLibraryFiles(indexedDB, "mine", `c4-test-${++n}`)],
  ["plugin-fs", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rb-c4-"));
    temps.push(dir);
    return createTauriLibraryFiles(nodeFs(), join(dir, "Ressources"), "mine");
  }],
];

const text = async (b: Blob) => new TextDecoder().decode(new Uint8Array(await b.arrayBuffer()));

describe.each(makers)("C4 : LibraryFiles (%s)", (_label, make) => {
  it("C4 : racine neuve vide", async () => {
    expect(await (await make()).list()).toEqual([]);
  });

  it("C4 : write crée les dossiers parents, read rend les octets", async () => {
    const f = await make();
    await f.write("Fractions/Moitié.rbitem", new Blob(["abc"]));
    expect(await f.list()).toEqual([
      { path: "Fractions", dir: true },
      { path: "Fractions/Moitié.rbitem", dir: false },
    ]);
    expect(await text(await f.read("Fractions/Moitié.rbitem"))).toBe("abc");
  });

  it("C4 : write remplace un fichier existant", async () => {
    const f = await make();
    await f.write("a.rbitem", new Blob(["1"]));
    await f.write("a.rbitem", new Blob(["2"]));
    expect(await text(await f.read("a.rbitem"))).toBe("2");
  });

  it("C4 : mkdir puis dossier vide listé", async () => {
    const f = await make();
    await f.mkdir("Vide");
    expect(await f.list()).toEqual([{ path: "Vide", dir: true }]);
  });

  it("C4 : remove d'un dossier est récursif, les voisins restent", async () => {
    const f = await make();
    await f.write("A/x.rbitem", new Blob(["x"]));
    await f.write("A/B/y.rbitem", new Blob(["y"]));
    await f.write("AB/z.rbitem", new Blob(["z"]));
    await f.remove("A");
    expect(await f.list()).toEqual([
      { path: "AB", dir: true },
      { path: "AB/z.rbitem", dir: false },
    ]);
  });

  it("C4 : remove(\"\") vide la racine", async () => {
    const f = await make();
    await f.write("A/x.rbitem", new Blob(["x"]));
    await f.write("y.rbitem", new Blob(["y"]));
    await f.remove("");
    expect(await f.list()).toEqual([]);
  });

  it("C4 : chemins non sûrs refusés partout", async () => {
    const f = await make();
    for (const p of ["../x.rbitem", "a/../../x", "a\\b", "c:x", "/abs", ".cache/x", "a//b"]) {
      await expect(f.write(p, new Blob(["x"])), p).rejects.toThrow(UNSAFE_PATH_MESSAGE);
    }
  });
});

describe("C4 : safeLibraryPath", () => {
  it("C4 : safeLibraryPath refuse les chemins qui sortent de la racine, garde les autres", () => {
    expect(safeLibraryPath("")).toBe("");
    expect(safeLibraryPath("Fractions/Moitié (2).rbitem")).toBe("Fractions/Moitié (2).rbitem");
    for (const p of ["..", "a/..", "a\\b", "c:", "/a", ".x", "a/.x", "a//b", "a/"]) expect(() => safeLibraryPath(p), p).toThrow(UNSAFE_PATH_MESSAGE);
  });
});
```

- [ ] **Étape 2 : ils échouent** — commande bornée : `Failed to resolve import "./library-files"`.

- [ ] **Étape 3 : `idb.ts`** (et `pending.ts` qui l'importe)

```ts
/** Aides IndexedDB partagées (repris de `pending.ts`, C4) : promesses d'une transaction et d'une requête, base ouverte
 *  au premier besoin ; une ouverture refusée n'est pas gardée (l'appel suivant réessaie). */
export function finished(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB : transaction refusée"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB : transaction annulée"));
  });
}

export function result<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error("IndexedDB : lecture refusée"));
  });
}

export function lazyDb(factory: IDBFactory, name: string, version: number, upgrade: (db: IDBDatabase) => void): () => Promise<IDBDatabase> {
  let db: Promise<IDBDatabase> | null = null;
  return () => {
    db ??= new Promise<IDBDatabase>((resolve, reject) => {
      const r = factory.open(name, version);
      r.onupgradeneeded = () => upgrade(r.result);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error ?? new Error("IndexedDB indisponible"));
    }).catch((e: unknown) => {
      db = null;
      throw e;
    });
    return db;
  };
}
```

`pending.ts` : supprimer ses `finished` / `result` locaux, `import { finished, lazyDb, result } from "./idb";` et `const open = lazyDb(factory, name, 1, (d) => void d.createObjectStore(STORE));` à la place du bloc `let db … return db;`.

- [ ] **Étape 4 : `library-files.ts`**

```ts
/**
 * Stockage de la bibliothèque (C4, DA1) : une racine, chemins relatifs `/`. Trois réalisations : mémoire (tests, repli
 * sans IndexedDB), IndexedDB (web, base `roomboard-bibliotheque`, magasin `fichiers`, clé `<racine>/<chemin>`) et
 * `plugin-fs` (coque, dossier réel). Tout chemin passe par `safeLibraryPath` avant d'atteindre le stockage (H1-4).
 */
import type { TauriDirFs, TauriFs } from "./host-tauri";
import { finished, lazyDb, result } from "./idb";

export type LibraryRoot = "mine" | "shared";
export interface LibraryPath {
  readonly path: string;
  readonly dir: boolean;
}
export interface LibraryFiles {
  readonly root: LibraryRoot;
  list(): Promise<readonly LibraryPath[]>;
  read(path: string): Promise<Blob>;
  write(path: string, data: Blob): Promise<void>;
  mkdir(path: string): Promise<void>;
  remove(path: string): Promise<void>;
}

export const LIBRARY_DB = "roomboard-bibliotheque";
const STORE = "fichiers";
export const UNSAFE_PATH_MESSAGE = "chemin de bibliothèque refusé";

export function safeLibraryPath(path: string): string {
  if (path === "") return "";
  const bad = path.includes("\\") || path.includes(":") || path.startsWith("/") ||
    path.split("/").some((s) => s === "" || s.startsWith("."));
  if (bad) throw new Error(`${UNSAFE_PATH_MESSAGE} : ${path.slice(0, 120)}`);
  return path;
}

const nonEmpty = (path: string): string => {
  if (safeLibraryPath(path) === "") throw new Error(`${UNSAFE_PATH_MESSAGE} : racine`);
  return path;
};
const parentsOf = (path: string): string[] => {
  const segs = path.split("/");
  return segs.slice(0, -1).map((_, i) => segs.slice(0, i + 1).join("/"));
};
const inside = (path: string, dir: string): boolean => dir === "" || path === dir || path.startsWith(`${dir}/`);
const sorted = (xs: LibraryPath[]): LibraryPath[] => xs.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

export function createMemoryLibraryFiles(root: LibraryRoot): LibraryFiles {
  const files = new Map<string, Blob>();
  const dirs = new Set<string>();
  return {
    root,
    async list() {
      return sorted([...[...dirs].map((path) => ({ path, dir: true })), ...[...files.keys()].map((path) => ({ path, dir: false }))]);
    },
    async read(path) {
      const b = files.get(nonEmpty(path));
      if (b === undefined) throw new Error(`ressource introuvable : ${path}`);
      return b;
    },
    async write(path, data) {
      nonEmpty(path);
      for (const p of parentsOf(path)) dirs.add(p);
      files.set(path, new Blob([data], { type: data.type }));
    },
    async mkdir(path) {
      nonEmpty(path);
      for (const p of [...parentsOf(path), path]) dirs.add(p);
    },
    async remove(path) {
      safeLibraryPath(path);
      for (const k of [...files.keys()]) if (inside(k, path)) files.delete(k);
      for (const k of [...dirs]) if (inside(k, path)) dirs.delete(k);
    },
  };
}

interface Row {
  readonly dir: boolean;
  readonly bytes?: Uint8Array;
  readonly type?: string;
}

export function createIdbLibraryFiles(factory: IDBFactory, root: LibraryRoot, name: string = LIBRARY_DB): LibraryFiles {
  const open = lazyDb(factory, name, 1, (d) => void d.createObjectStore(STORE));
  const key = (path: string): string => `${root}/${path}`;
  const all = IDBKeyRange.bound(`${root}/`, `${root}/￿`);
  const tx = async (mode: IDBTransactionMode) => (await open()).transaction(STORE, mode);
  return {
    root,
    async list() {
      const t = await tx("readonly");
      const store = t.objectStore(STORE);
      const [keys, rows] = await Promise.all([result(store.getAllKeys(all)), result(store.getAll(all))]);
      return sorted(keys.map((k, i) => ({ path: String(k).slice(root.length + 1), dir: (rows[i] as Row).dir })));
    },
    async read(path) {
      const t = await tx("readonly");
      const row = (await result(t.objectStore(STORE).get(key(nonEmpty(path))))) as Row | undefined;
      if (row === undefined || row.dir || row.bytes === undefined) throw new Error(`ressource introuvable : ${path}`);
      return new Blob([row.bytes as BlobPart], { type: row.type ?? "" });
    },
    async write(path, data) {
      nonEmpty(path);
      const bytes = new Uint8Array(await data.arrayBuffer()); // lu avant la transaction (elle se ferme à la première attente)
      const t = await tx("readwrite");
      const store = t.objectStore(STORE);
      for (const p of parentsOf(path)) store.put({ dir: true } satisfies Row, key(p));
      store.put({ dir: false, bytes, type: data.type } satisfies Row, key(path));
      await finished(t);
    },
    async mkdir(path) {
      nonEmpty(path);
      const t = await tx("readwrite");
      const store = t.objectStore(STORE);
      for (const p of [...parentsOf(path), path]) store.put({ dir: true } satisfies Row, key(p));
      await finished(t);
    },
    async remove(path) {
      safeLibraryPath(path);
      const t = await tx("readwrite");
      const store = t.objectStore(STORE);
      if (path === "") store.delete(all);
      else {
        store.delete(key(path));
        store.delete(IDBKeyRange.bound(`${key(path)}/`, `${key(path)}/￿`));
      }
      await finished(t);
    },
  };
}

export function createTauriLibraryFiles(fs: TauriFs & TauriDirFs, rootPath: string, root: LibraryRoot): LibraryFiles {
  const at = (path: string): string => (path === "" ? rootPath : `${rootPath}/${path}`);
  let made: Promise<void> | null = null;
  const ready = (): Promise<void> => (made ??= fs.mkdir(rootPath, { recursive: true }).catch((e: unknown) => {
    made = null;
    throw e;
  }));
  async function walk(dir: string, out: LibraryPath[]): Promise<void> {
    for (const e of await fs.readDir(at(dir))) {
      if (e.name.startsWith(".")) continue; // fichiers cachés du système (.DS_Store) : jamais des ressources
      const path = dir === "" ? e.name : `${dir}/${e.name}`;
      out.push({ path, dir: e.isDirectory });
      if (e.isDirectory) await walk(path, out);
    }
  }
  return {
    root,
    async list() {
      await ready();
      const out: LibraryPath[] = [];
      await walk("", out);
      return sorted(out);
    },
    async read(path) {
      return new Blob([(await fs.readFile(at(nonEmpty(path)))) as BlobPart]);
    },
    async write(path, data) {
      nonEmpty(path);
      await ready();
      const parents = parentsOf(path);
      if (parents.length > 0) await fs.mkdir(at(parents[parents.length - 1]!), { recursive: true });
      await fs.writeFile(at(path), new Uint8Array(await data.arrayBuffer()));
    },
    async mkdir(path) {
      await ready();
      await fs.mkdir(at(nonEmpty(path)), { recursive: true });
    },
    async remove(path) {
      safeLibraryPath(path);
      await ready();
      if (path !== "") return fs.remove(at(path), { recursive: true });
      for (const e of await fs.readDir(rootPath)) if (!e.name.startsWith(".")) await fs.remove(`${rootPath}/${e.name}`, { recursive: true });
    },
  };
}
```

- [ ] **Étape 5 : `host-tauri.ts`** — après `TauriFs` :

```ts
/** C4 (D7, DA3) : dossiers de la bibliothèque (`Documents/RoomBoard/Ressources`, dossier partagé choisi). */
export interface TauriDirFs {
  readDir(path: string): Promise<readonly { readonly name: string; readonly isDirectory: boolean }[]>;
  mkdir(path: string, o: { readonly recursive: true }): Promise<void>;
  remove(path: string, o: { readonly recursive: true }): Promise<void>;
  exists(path: string): Promise<boolean>;
}
```

Dans `loadTauriPorts`, ajouter `import("@tauri-apps/api/path")` au `Promise.all`, et au retour (type de retour étendu de `dirFs: TauriDirFs; pickFolder(defaultPath: string | null): Promise<string | null>; documentDir(): Promise<string>`) :

```ts
    dirFs: {
      readDir: async (p) => (await f.readDir(p)).map((e) => ({ name: e.name, isDirectory: e.isDirectory })),
      mkdir: (p, o) => f.mkdir(p, o),
      remove: (p, o) => f.remove(p, o),
      exists: (p) => f.exists(p),
    },
    // Le dossier choisi entre dans la portée fs, récursif (plugin dialog 2.8.4, `commands.rs:163-180`).
    pickFolder: async (defaultPath) => {
      const r = await d.open({ directory: true, recursive: true, multiple: false, ...(defaultPath !== null ? { defaultPath } : {}) });
      return typeof r === "string" ? r : null;
    },
    documentDir: () => path.documentDir(),
```

(`path` : le module `@tauri-apps/api/path` chargé ; noms locaux `d`, `f` repris de `loadTauriPorts`.)

- [ ] **Étape 6 : tests verts** — commande bornée.

- [ ] **Étape 7 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T6
git add apps/web/src/platform/idb.ts
git add apps/web/src/platform/pending.ts
git add apps/web/src/platform/library-files.ts
git add apps/web/src/platform/library-files.test.ts
git add apps/web/src/platform/host-tauri.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(web): library storage in memory, IndexedDB and plugin-fs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T7 — Paquet `.rbpack` et Worker ZIP
<a id="tache-t7"></a>

**Objectif :** un dossier de ressources devient un ZIP stocké, trié, à dates fixes (`manifest.json` + `items/…`), et
un paquet relu est contrôlé avant toute écriture (D17, D18). Le ZIP passe par le Worker existant, seul importeur de
fflate.

**Fichiers :**
- Créer : `apps/web/src/platform/rbpack.ts`, `apps/web/src/platform/rbpack.test.ts`
- Modifier : `apps/web/src/platform/zip-worker.ts`
- Créer : `apps/web/src/platform/zip-worker.test.ts`
- Modifier : `apps/web/src/platform/zip-read.ts`, `apps/web/src/platform/zip-read.test.ts`

**Interfaces :**
- Consomme : `unknownKindMessage(kind)` (`core/api.ts:453`) ; `ZIP_MAX_ENTRIES`, `ZIP_MAX_BYTES`, `ZIP_TOO_BIG_MESSAGE`, `ZIP_MALFORMED_MESSAGE`, `keepZipPath`, `normalizePath` (`platform/model3d-import.ts`) ; `runOnce`, `WorkerLike` (`one-shot-worker.ts`).
- Produit (`rbpack.ts`) :
  - `export type PackItemKind = "fragment" | "grid";`
  - `export interface PackItem { readonly path: string; readonly name: string; readonly keywords: readonly string[]; readonly description: string; readonly kind: PackItemKind; readonly bytes: Uint8Array; readonly thumbnail: Uint8Array | null }` — `path` : chemin relatif au dossier exporté, sans extension (`"Moitié"`, `"sous/Moitié"`).
  - `export interface ZipFile { readonly path: string; readonly bytes: Uint8Array }`
  - `export const PACK_MANIFEST = "manifest.json";`
  - `export const PACK_NOT_ROOMBOARD_MESSAGE = "ce fichier n'est pas un paquet RoomBoard";`
  - `export const PACK_NEWER_MESSAGE = "paquet d'une version plus récente de RoomBoard";`
  - `export const PACK_UNSAFE_PATH_MESSAGE = "paquet refusé : chemin d'entrée non sûr";`
  - `export const packMissingMessage = (path: string): string => \`paquet incomplet : ${path} absent\``
  - `export function buildPack(name: string, items: readonly PackItem[], meta: { readonly appVersion: string; readonly now: string }): ZipFile[]`
  - `export function readPack(files: readonly ZipFile[]): { readonly name: string; readonly items: readonly PackItem[] }`
- Produit (`zip-worker.ts`) : `export function unzipEntries(data, keep: (name: string) => boolean, limits?)` ; `unzipModelEntries(data, limits?)` inchangé (y délègue) ; `export function keepPackPath(name: string): boolean` ; `export function zipStored(files: readonly ZipFile[]): Uint8Array` ; message `{ op: "zip", files }` → `{ bytes }` ; `{ op: "unzip", mode: "pack", bytes }` → `{ entries }` ; `{ bytes }` seul → lecture 3D (inchangé).
- Produit (`zip-read.ts`) : `createZipReader(spawn, timeoutMs = ZIP_WORKER_TIMEOUT_MS, mode: "model3d" | "pack" = "model3d")` ; `export function createZipWriter(spawn: () => WorkerLike, timeoutMs = ZIP_WORKER_TIMEOUT_MS): (files: readonly ZipFile[]) => Promise<Uint8Array>` ; `export function checkZipBytesReply(d: unknown): Uint8Array`.
- Réutilise : `apps/web/src/platform/zip-read.ts:27`, `zip-worker.ts:19` — `createZipReader(spawn)` ; le Worker gagne `{op: "unzip", mode: "model3d" | "pack"}` et `{op: "zip", entries}` (ici nommé `files`, stocké, trié, date fixe).
- Réutilise : `apps/web/src/platform/one-shot-worker.ts:18` — `runOnce`.
- Réutilise : `apps/web/src/platform/model3d-import.ts:29-30,63` — `ZIP_MAX_ENTRIES`, `ZIP_MAX_BYTES`, `normalizePath`.

**Patron à ne pas reprendre :** la lecture 3D **filtre** silencieusement les entrées hors liste (`keepZipPath`) ; un
paquet qui cite un chemin non sûr doit être **refusé**, pas lu en partie. De même, `normalizePath` résout `..` : un
paquet ne doit jamais voir ses chemins normalisés avant contrôle (un `a/../b` deviendrait `b`). Chemin de référence :
`apps/web/src/platform/zip-worker.ts:27-50`, `model3d-import.ts:63-75`.

**Test et commande bornée :** `cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T7 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/rbpack.test.ts src/platform/zip-worker.test.ts src/platform/zip-read.test.ts src/platform/model3d-import.test.ts --reporter=verbose 2>&1 | grep -E "C4|Tests " | tail -20` : ≥ 10 tests « C4 », `Tests` sans `failed` ; `zip-read.test.ts` et `model3d-import.test.ts` (lecture 3D, à garder verts) inchangés et verts.

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- GC2 — Le paquet n'entre ni dans le cœur ni dans `formats` (D4).
- GC5 — `nice -n 10` ; test sur délai rejoué une fois.
- GC6 — Aucune dépendance neuve ; `zip-worker.ts` reste le seul module qui importe fflate (GC17 du socle).
- GC7 — Commits fichier par fichier, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC10 — Tests neufs nommés « C4 : … ».

**Interdits :** aucune compression ; aucune date d'horloge dans le ZIP ; `rbpack.ts` n'importe pas fflate ; message 3D
`{ bytes }` inchangé.

**Critère « terminé » :** tests verts, rapport avec `Réutilisation : appelé zip-read.createZipReader, one-shot-worker.runOnce, model3d-import.ZIP_MAX_*`.

- [ ] **Étape 1 : tests qui échouent** — `rbpack.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { unknownKindMessage } from "../core/api";
import { buildPack, PACK_NEWER_MESSAGE, PACK_NOT_ROOMBOARD_MESSAGE, PACK_UNSAFE_PATH_MESSAGE, packMissingMessage, readPack, type PackItem, type ZipFile } from "./rbpack";

const enc = (s: string) => new TextEncoder().encode(s);
const item = (path: string, over: Partial<PackItem> = {}): PackItem => ({
  path, name: path.split("/").pop()!, keywords: ["fraction"], description: "", kind: "fragment", bytes: enc(`rb:${path}`), thumbnail: enc(`png:${path}`), ...over,
});
const manifestOf = (files: readonly ZipFile[]) => JSON.parse(new TextDecoder().decode(files.find((f) => f.path === "manifest.json")!.bytes));
const withManifest = (files: readonly ZipFile[], patch: Record<string, unknown>): ZipFile[] =>
  files.map((f) => (f.path === "manifest.json" ? { path: f.path, bytes: enc(JSON.stringify({ ...manifestOf(files), ...patch })) } : f));

describe("C4 : paquet .rbpack", () => {
  it("C4 : buildPack trie les entrées, manifeste d'abord", () => {
    const files = buildPack("Fractions", [item("Seyès", { kind: "grid", thumbnail: null }), item("Moitié")], { appVersion: "c4", now: "2026-11-21T08:00:00Z" });
    expect(files.map((f) => f.path)).toEqual(["manifest.json", "items/Moitié.rbitem", "items/Moitié.rbitem.png", "items/Seyès.rbitem"]);
    expect(manifestOf(files)).toEqual({
      format: "roomboard", formatVersion: 1, kind: "pack", name: "Fractions", appVersion: "c4", created: "2026-11-21T08:00:00Z",
      items: [
        { path: "items/Moitié.rbitem", name: "Moitié", keywords: ["fraction"], description: "", kind: "fragment", thumbnail: "items/Moitié.rbitem.png" },
        { path: "items/Seyès.rbitem", name: "Seyès", keywords: ["fraction"], description: "", kind: "grid", thumbnail: null },
      ],
    });
  });

  it("C4 : readPack(buildPack) rend les mêmes ressources", () => {
    const items = [item("Moitié"), item("sous/Tiers", { keywords: [], description: "un tiers" })];
    const back = readPack(buildPack("Fractions", items, { appVersion: "c4", now: "n" }));
    expect(back.name).toBe("Fractions");
    expect(back.items).toEqual(items);
  });

  it("C4 : readPack refuse un kind autre que pack (message de UnknownKind)", () => {
    const files = withManifest(buildPack("F", [item("a")], { appVersion: "c4", now: "n" }), { kind: "autre" });
    expect(() => readPack(files)).toThrow(unknownKindMessage("autre"));
  });

  it("C4 : readPack refuse une version plus récente", () => {
    expect(() => readPack(withManifest(buildPack("F", [], { appVersion: "c4", now: "n" }), { formatVersion: 2 }))).toThrow(PACK_NEWER_MESSAGE);
  });

  it("C4 : readPack refuse un chemin non sûr", () => {
    for (const p of ["items/../x.rbitem", "../x.rbitem", "items/a\\b.rbitem", "items/c:x.rbitem", "/items/x.rbitem", "autre/x.rbitem"]) {
      const files = withManifest(buildPack("F", [item("x")], { appVersion: "c4", now: "n" }), {
        items: [{ path: p, name: "x", keywords: [], description: "", kind: "fragment", thumbnail: null }],
      });
      expect(() => readPack(files), p).toThrow(PACK_UNSAFE_PATH_MESSAGE);
    }
  });

  it("C4 : readPack refuse une entrée du manifeste absente du ZIP", () => {
    const files = buildPack("F", [item("x")], { appVersion: "c4", now: "n" }).filter((f) => f.path !== "items/x.rbitem");
    expect(() => readPack(files)).toThrow(packMissingMessage("items/x.rbitem"));
  });

  it("C4 : readPack sans manifeste, format autre ou JSON illisible : pas un paquet", () => {
    expect(() => readPack([])).toThrow(PACK_NOT_ROOMBOARD_MESSAGE);
    expect(() => readPack([{ path: "manifest.json", bytes: enc("{") }])).toThrow(PACK_NOT_ROOMBOARD_MESSAGE);
    expect(() => readPack(withManifest(buildPack("F", [], { appVersion: "c4", now: "n" }), { format: "autre" }))).toThrow(PACK_NOT_ROOMBOARD_MESSAGE);
  });
});
```

`zip-worker.test.ts` :

```ts
import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { buildPack } from "./rbpack";
import { keepPackPath, unzipEntries, zipStored } from "./zip-worker";

const enc = (s: string) => new TextEncoder().encode(s);

describe("C4 : Worker ZIP du paquet", () => {
  it("C4 : zipStored : entrées stockées, dans l'ordre, octets stables", () => {
    const files = [{ path: "manifest.json", bytes: enc("{}") }, { path: "items/a.rbitem", bytes: enc("abc") }];
    const a = zipStored(files);
    expect(zipStored(files)).toEqual(a);
    const back = unzipSync(a);
    expect(Object.keys(back)).toEqual(["manifest.json", "items/a.rbitem"]);
    expect(new TextDecoder().decode(back["items/a.rbitem"])).toBe("abc");
    // méthode 0 (stockée) dans l'en-tête local de la première entrée (octets 8-9)
    expect(a[8]).toBe(0);
    expect(a[9]).toBe(0);
  });

  it("C4 : unzipEntries en mode paquet garde les chemins tels quels", () => {
    const zip = zipStored(buildPack("F", [{ path: "sous/Moitié", name: "Moitié", keywords: [], description: "", kind: "fragment", bytes: enc("x"), thumbnail: null }], { appVersion: "c4", now: "n" }));
    expect(unzipEntries(zip, keepPackPath).map((e) => e.path)).toEqual(["manifest.json", "items/sous/Moitié.rbitem"]);
  });

  it("C4 : keepPackPath ne garde que le manifeste et items/*.rbitem(.png)", () => {
    expect(["manifest.json", "items/a.rbitem", "items/a.rbitem.png"].every(keepPackPath)).toBe(true);
    expect(["x.txt", "items/a.png", "items/a.rbitem.json", "a.rbitem"].some(keepPackPath)).toBe(false);
  });
});
```

`zip-read.test.ts` (ajout, faux Worker du fichier — reprendre celui de ses tests existants) :

```ts
  it("C4 : createZipWriter envoie { op: \"zip\", files } et rend les octets", async () => {
    const posted: unknown[] = [];
    const spawn = () => fakeWorker((m) => { posted.push(m); return { bytes: new Uint8Array([1, 2]) }; });
    const write = createZipWriter(spawn);
    expect(await write([{ path: "manifest.json", bytes: new Uint8Array([7]) }])).toEqual(new Uint8Array([1, 2]));
    expect((posted[0] as { op: string }).op).toBe("zip");
  });

  it("C4 : createZipReader en mode pack envoie { op: \"unzip\", mode: \"pack\" }", async () => {
    const posted: unknown[] = [];
    const read = createZipReader(() => fakeWorker((m) => { posted.push(m); return { entries: [] }; }), 1000, "pack");
    expect(await read(new Blob([new Uint8Array([1])]))).toEqual([]);
    expect(posted[0]).toMatchObject({ op: "unzip", mode: "pack" });
  });
```

(`fakeWorker(reply)` : si `zip-read.test.ts` n'a pas déjà un faux Worker, l'écrire en tête : un `WorkerLike` dont `postMessage(m)` appelle `queueMicrotask(() => this.onmessage?.({ data: reply(m) }))`.)

- [ ] **Étape 2 : ils échouent** — commande bornée : imports introuvables.

- [ ] **Étape 3 : `rbpack.ts`**

```ts
/**
 * Paquet de ressources `.rbpack` (C4, D17, D18, DA2) : ZIP stocké (écrit par `zip-worker.ts`), `manifest.json`
 * `{format: "roomboard", formatVersion: 1, kind: "pack", name, appVersion, created, items}`, puis `items/<chemin>.rbitem`
 * et `items/<chemin>.rbitem.png`, triés. TS pur, jamais lu par le cœur ni par `formats` (D4). Un `.rbitem` du paquet
 * est relu par `ContainerIO` à l'insertion, pas ici.
 */
import { unknownKindMessage } from "../core/api";
import { ZIP_MAX_BYTES, ZIP_MAX_ENTRIES, ZIP_TOO_BIG_MESSAGE } from "./model3d-import";

export type PackItemKind = "fragment" | "grid";
export interface PackItem {
  readonly path: string;
  readonly name: string;
  readonly keywords: readonly string[];
  readonly description: string;
  readonly kind: PackItemKind;
  readonly bytes: Uint8Array;
  readonly thumbnail: Uint8Array | null;
}
export interface ZipFile {
  readonly path: string;
  readonly bytes: Uint8Array;
}
interface ManifestItem {
  readonly path: string;
  readonly name: string;
  readonly keywords: readonly string[];
  readonly description: string;
  readonly kind: PackItemKind;
  readonly thumbnail: string | null;
}

export const PACK_MANIFEST = "manifest.json";
const PACK_FORMAT_VERSION = 1;
export const PACK_NOT_ROOMBOARD_MESSAGE = "ce fichier n'est pas un paquet RoomBoard";
export const PACK_NEWER_MESSAGE = "paquet d'une version plus récente de RoomBoard";
export const PACK_UNSAFE_PATH_MESSAGE = "paquet refusé : chemin d'entrée non sûr";
export const packMissingMessage = (path: string): string => `paquet incomplet : ${path} absent`;

const ITEM_RE = /^items\/(.+)\.rbitem$/;
/** Chemin d'entrée sûr (D18) : sous `items/`, sans `..`, `\`, `:`, segment vide ou caché, ni début `/`. */
function safeEntry(p: unknown): p is string {
  if (typeof p !== "string" || !ITEM_RE.test(p)) return false;
  return !p.includes("\\") && !p.includes(":") && p.split("/").every((s) => s !== "" && s !== ".." && !s.startsWith("."));
}
const byPath = (a: ZipFile, b: ZipFile): number => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);

export function buildPack(name: string, items: readonly PackItem[], meta: { readonly appVersion: string; readonly now: string }): ZipFile[] {
  const sortedItems = [...items].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const entries: ManifestItem[] = sortedItems.map((i) => ({
    path: `items/${i.path}.rbitem`,
    name: i.name,
    keywords: [...i.keywords],
    description: i.description,
    kind: i.kind,
    thumbnail: i.thumbnail === null ? null : `items/${i.path}.rbitem.png`,
  }));
  const manifest = { format: "roomboard", formatVersion: PACK_FORMAT_VERSION, kind: "pack", name, appVersion: meta.appVersion, created: meta.now, items: entries };
  const files: ZipFile[] = [];
  for (const i of sortedItems) {
    files.push({ path: `items/${i.path}.rbitem`, bytes: i.bytes });
    if (i.thumbnail !== null) files.push({ path: `items/${i.path}.rbitem.png`, bytes: i.thumbnail });
  }
  return [{ path: PACK_MANIFEST, bytes: new TextEncoder().encode(JSON.stringify(manifest, null, 2)) }, ...files.sort(byPath)];
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : []);

export function readPack(files: readonly ZipFile[]): { readonly name: string; readonly items: readonly PackItem[] } {
  if (files.length > ZIP_MAX_ENTRIES || files.reduce((n, f) => n + f.bytes.length, 0) > ZIP_MAX_BYTES) throw new Error(ZIP_TOO_BIG_MESSAGE);
  const raw = files.find((f) => f.path === PACK_MANIFEST);
  if (raw === undefined) throw new Error(PACK_NOT_ROOMBOARD_MESSAGE);
  let m: unknown;
  try {
    m = JSON.parse(new TextDecoder().decode(raw.bytes));
  } catch {
    throw new Error(PACK_NOT_ROOMBOARD_MESSAGE);
  }
  if (!isRecord(m) || m["format"] !== "roomboard") throw new Error(PACK_NOT_ROOMBOARD_MESSAGE);
  if (typeof m["formatVersion"] !== "number" || m["formatVersion"] > PACK_FORMAT_VERSION) throw new Error(PACK_NEWER_MESSAGE);
  if (m["kind"] !== "pack") throw new Error(unknownKindMessage(String(m["kind"] ?? "document").slice(0, 64)));
  const byName = new Map(files.map((f) => [f.path, f.bytes]));
  const listed = Array.isArray(m["items"]) ? m["items"] : [];
  const items = listed.map((e: unknown): PackItem => {
    const x = isRecord(e) ? e : {};
    if (!safeEntry(x["path"])) throw new Error(PACK_UNSAFE_PATH_MESSAGE);
    const thumb = x["thumbnail"];
    if (thumb !== null && thumb !== undefined && !(typeof thumb === "string" && thumb === `${x["path"]}.png`)) throw new Error(PACK_UNSAFE_PATH_MESSAGE);
    const bytes = byName.get(x["path"]);
    if (bytes === undefined) throw new Error(packMissingMessage(x["path"]));
    const thumbnail = typeof thumb === "string" ? byName.get(thumb) ?? null : null;
    if (typeof thumb === "string" && thumbnail === null) throw new Error(packMissingMessage(thumb));
    return {
      path: ITEM_RE.exec(x["path"])![1]!,
      name: typeof x["name"] === "string" && x["name"] !== "" ? x["name"] : ITEM_RE.exec(x["path"])![1]!.split("/").pop()!,
      keywords: strings(x["keywords"]),
      description: typeof x["description"] === "string" ? x["description"] : "",
      kind: x["kind"] === "grid" ? "grid" : "fragment",
      bytes,
      thumbnail,
    };
  });
  return { name: typeof m["name"] === "string" && m["name"] !== "" ? m["name"] : "Paquet", items };
}
```

- [ ] **Étape 4 : `zip-worker.ts`**

```ts
import { unzipSync, zipSync, type Zippable } from "fflate";
import type { ZipFile } from "./rbpack";

/** C4 : entrées d'un paquet (manifeste, ressources, vignettes) ; tout autre fichier du ZIP est ignoré. */
export function keepPackPath(name: string): boolean {
  return name === "manifest.json" || (name.startsWith("items/") && (name.endsWith(".rbitem") || name.endsWith(".rbitem.png")));
}

/** Date fixe des entrées (D25 : octets stables), en heure locale comme le champ DOS du ZIP. */
const PACK_MTIME = new Date(1980, 0, 1, 0, 0, 0);

/** C4 (D17) : ZIP stocké, entrées dans l'ordre reçu (déjà trié par `buildPack`), date fixe. */
export function zipStored(files: readonly ZipFile[]): Uint8Array {
  const z: Zippable = {};
  for (const f of files) z[f.path] = [f.bytes, { level: 0, mtime: PACK_MTIME }];
  return zipSync(z, { level: 0, mtime: PACK_MTIME });
}
```

Généraliser le corps actuel de `unzipModelEntries` en `unzipEntries(data, keep, limits)` (même filtre, `keepZipPath(f.name)` remplacé par `keep(f.name)`) ; en mode paquet, le chemin rendu est le nom brut (`name`), sans `normalizePath` :

```ts
export function unzipEntries(
  data: Uint8Array,
  keep: (name: string) => boolean,
  limits: { readonly entries: number; readonly bytes: number } = { entries: ZIP_MAX_ENTRIES, bytes: ZIP_MAX_BYTES },
  normalize: (name: string) => string = (n) => n,
): Array<{ path: string; bytes: Uint8Array }> {
  // … corps actuel, `!keepZipPath(f.name)` → `!keep(f.name)` …
  return Object.entries(files)
    .map(([name, bytes]) => ({ path: normalize(name), bytes }))
    .filter((e) => e.path !== "");
}

export function unzipModelEntries(data: Uint8Array, limits?: { readonly entries: number; readonly bytes: number }): Array<{ path: string; bytes: Uint8Array }> {
  return unzipEntries(data, keepZipPath, limits, normalizePath);
}
```

Branchement du Worker :

```ts
  scope.onmessage = (e) => {
    const d = e.data as { readonly op?: "unzip" | "zip"; readonly mode?: "model3d" | "pack"; readonly bytes?: Uint8Array; readonly files?: readonly ZipFile[] };
    try {
      if (d.op === "zip") {
        const bytes = zipStored(d.files ?? []);
        scope.postMessage({ bytes }, [bytes.buffer as ArrayBuffer]);
        return;
      }
      const data = d.bytes ?? new Uint8Array();
      const entries = d.mode === "pack" ? unzipEntries(data, keepPackPath) : unzipModelEntries(data);
      // Deux entrées peuvent partager un tampon : cité deux fois, `postMessage` lèverait.
      scope.postMessage({ entries }, [...new Set(entries.map((x) => x.bytes.buffer as ArrayBuffer))]);
    } catch (err) {
      scope.postMessage({ error: err instanceof Error ? err.message : String(err) }, []);
    }
  };
```

(Le type du message de `scope.onmessage` s'élargit en conséquence ; l'en-tête du fichier gagne une ligne « C4 : paquets `.rbpack` (lecture `mode: "pack"`, écriture `op: "zip"`). »)

- [ ] **Étape 5 : `zip-read.ts`**

```ts
export function checkZipBytesReply(d: unknown): Uint8Array {
  const r = d as { bytes?: unknown; error?: unknown } | null;
  if (typeof r?.error === "string") throw new Error(r.error);
  if (!(r?.bytes instanceof Uint8Array)) throw new Error(ZIP_FAILED_MESSAGE);
  return r.bytes;
}

/** Un Worker neuf par ZIP ; `mode: "pack"` (C4) garde les chemins du paquet tels quels. */
export function createZipReader(spawn: () => WorkerLike, timeoutMs = ZIP_WORKER_TIMEOUT_MS, mode: "model3d" | "pack" = "model3d"): (blob: Blob) => Promise<ZipEntry[]> {
  return async (blob) => {
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const message = mode === "model3d" ? { bytes } : { op: "unzip", mode, bytes };
    return runOnce(spawn, message, [buf], timeoutMs, checkZipReply, ZIP_FAILED_MESSAGE);
  };
}

/** C4 (D17) : ZIP stocké écrit dans un Worker jetable. */
export function createZipWriter(spawn: () => WorkerLike, timeoutMs = ZIP_WORKER_TIMEOUT_MS): (files: readonly ZipFile[]) => Promise<Uint8Array> {
  return (files) => runOnce(spawn, { op: "zip", files }, [], timeoutMs, checkZipBytesReply, ZIP_FAILED_MESSAGE);
}
```

(`import type { ZipFile } from "./rbpack";`)

- [ ] **Étape 6 : tests verts** — commande bornée.

- [ ] **Étape 7 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T7
git add apps/web/src/platform/rbpack.ts
git add apps/web/src/platform/rbpack.test.ts
git add apps/web/src/platform/zip-worker.ts
git add apps/web/src/platform/zip-worker.test.ts
git add apps/web/src/platform/zip-read.ts
git add apps/web/src/platform/zip-read.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(web): rbpack codec and stored zip writing in the zip worker

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T8 — `ResourceLibrary`
<a id="tache-t8"></a>

**Objectif :** l'index de la bibliothèque au-dessus de `LibraryFiles` : dossiers, recherche sans casse ni accents,
ajout (ressource, compagnon `.json`, vignette `.png`), lecture, suppression, export et import de paquet (D5, D10, D11,
D17 à D19, DA2).

**Fichiers :**
- Créer : `apps/web/src/app/library.ts`, `apps/web/src/app/library.test.ts`

**Interfaces :**
- Consomme (T6) : `LibraryFiles`, `LibraryRoot`, `createMemoryLibraryFiles(root)`, `safeLibraryPath`.
- Consomme (T7) : `buildPack(name, items, meta): ZipFile[]`, `readPack(files)`, `PackItem`, `PackItemKind`, `ZipFile` ; `ZipEntry` (`zip-read.ts`).
- Produit :
  - `export type ResourceKind = PackItemKind;`
  - `export interface ResourceEntry { readonly root: LibraryRoot; readonly path: string; readonly folder: string; readonly name: string; readonly keywords: readonly string[]; readonly description: string; readonly kind: ResourceKind | null; readonly thumbnail: string | null }` — `path` : `"Fractions/Moitié.rbitem"`, `folder` : `"Fractions"`, `thumbnail` : chemin du `.png` ou null, `kind` null sans compagnon (H2-4).
  - `export interface LibraryFolder { readonly root: LibraryRoot; readonly path: string; readonly folders: readonly string[]; readonly items: readonly ResourceEntry[] }` (`folders` : chemins complets des sous-dossiers directs)
  - `export interface CapturedResource { readonly bytes: Uint8Array; readonly kind: ResourceKind; readonly thumbnail: Blob | null }`
  - `export interface NewResource extends CapturedResource { readonly name: string; readonly keywords: readonly string[]; readonly description: string }`
  - `export interface LibraryZip { unzip(blob: Blob): Promise<readonly ZipEntry[]>; zip(files: readonly ZipFile[]): Promise<Uint8Array> }`
  - `export interface LibraryDeps { readonly files: readonly LibraryFiles[]; readonly zip: LibraryZip; now(): string; readonly appVersion: string }`
  - `export interface ResourceLibrary { roots(): readonly LibraryRoot[]; setRoot(files: LibraryFiles): void; refresh(): Promise<void>; folder(root: LibraryRoot, path: string): LibraryFolder; search(q: string): readonly ResourceEntry[]; add(root: LibraryRoot, folder: string, r: NewResource): Promise<ResourceEntry>; read(entry: ResourceEntry): Promise<Uint8Array>; thumbnail(entry: ResourceEntry): Promise<Blob | null>; mkdir(root: LibraryRoot, parent: string, name: string): Promise<string>; remove(root: LibraryRoot, path: string): Promise<void>; exportPack(root: LibraryRoot, folder: string): Promise<{ readonly name: string; readonly bytes: Uint8Array }>; importPack(bytes: Uint8Array, fileName: string): Promise<{ readonly folder: string; readonly count: number }> }`
  - `export const ROOT_LABELS: Readonly<Record<LibraryRoot, string>> = { mine: "Mes ressources", shared: "Ressources partagées" };`
  - `export function normalizeSearch(s: string): string` ; `export function fileNameOf(name: string): string` ; `export function createResourceLibrary(deps: LibraryDeps): ResourceLibrary`
- Réutilise : `apps/web/src/platform/library-files.ts` (T6) — `LibraryFiles` (DA1), seul accès au stockage.
- Réutilise : `apps/web/src/platform/rbpack.ts` (T7) — `buildPack(items): ZipInput` / `readPack(entries): PackItems` (DA2), ici `buildPack(name, items, meta): ZipFile[]` et `readPack(files)`.

**Patron à ne pas reprendre :** écrire chaque ressource du paquet au fil de la lecture : un refus au milieu laisserait
une bibliothèque à moitié importée. Tout le paquet est lu et contrôlé (`readPack`) **avant** la première écriture, et
le dossier de destination est neuf. Chemin de référence : lecture 3D qui contrôle tout le ZIP avant de poser un modèle,
`apps/web/src/platform/model3d-handlers.ts` (`zip3dHandler`).

**Test et commande bornée :** `cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T8 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app/library.test.ts --reporter=verbose 2>&1 | grep -E "C4|Tests " | tail -20` : ≥ 10 tests « C4 », dont `C4 : export puis import rend les mêmes ressources`, `Tests` sans `failed`.

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- GC5 — `nice -n 10` ; test sur délai rejoué une fois.
- GC6 — Aucune dépendance neuve.
- GC7 — Commits fichier par fichier, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC10 — Tests neufs nommés « C4 : … ».

**Interdits :** aucun accès direct à IndexedDB ou `plugin-fs` ; aucun champ ajouté au `.rbitem` (D5) ; pas de renommage
ni de déplacement (D10, H2-2) ; import seulement dans « Mes ressources ».

**Critère « terminé » :** tests verts, rapport avec `Réutilisation : appelé library-files.LibraryFiles, rbpack.buildPack/readPack`.

- [ ] **Étape 1 : tests qui échouent** — `library.test.ts` :

```ts
import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { unknownKindMessage } from "../core/api";
import { createMemoryLibraryFiles } from "../platform/library-files";
import { zipStored } from "../platform/zip-worker";
import { createResourceLibrary, fileNameOf, normalizeSearch, type NewResource } from "./library";

const enc = (s: string) => new TextEncoder().encode(s);
const zip = {
  unzip: async (blob: Blob) => Object.entries(unzipSync(new Uint8Array(await blob.arrayBuffer()))).map(([path, b]) => ({ path, blob: new Blob([b as BlobPart]) })),
  zip: async (files: readonly { path: string; bytes: Uint8Array }[]) => zipStored(files),
};
const libOf = () => {
  const mine = createMemoryLibraryFiles("mine");
  const lib = createResourceLibrary({ files: [mine], zip, now: () => "2026-11-21T08:00:00Z", appVersion: "c4" });
  return { lib, mine };
};
const res = (name: string, over: Partial<NewResource> = {}): NewResource => ({
  bytes: enc(`rb:${name}`), kind: "fragment", thumbnail: new Blob([enc("png")], { type: "image/png" }), name, keywords: [], description: "", ...over,
});

describe("C4 : ResourceLibrary", () => {
  it("C4 : add écrit ressource, compagnon et vignette ; l'index la montre", async () => {
    const { lib, mine } = libOf();
    const e = await lib.add("mine", "", res("Moitié", { keywords: ["fraction"] }));
    expect(e).toMatchObject({ root: "mine", path: "Moitié.rbitem", folder: "", name: "Moitié", keywords: ["fraction"], kind: "fragment", thumbnail: "Moitié.rbitem.png" });
    expect((await mine.list()).map((p) => p.path)).toEqual(["Moitié.rbitem", "Moitié.rbitem.json", "Moitié.rbitem.png"]);
    expect(lib.folder("mine", "").items.map((i) => i.name)).toEqual(["Moitié"]);
    expect(await lib.read(e)).toEqual(enc("rb:Moitié"));
  });

  it("C4 : recherche sans casse ni accents, sur nom, mots-clés et description", async () => {
    const { lib } = libOf();
    await lib.add("mine", "", res("Moitié", { keywords: ["fraction"] }));
    await lib.add("mine", "", res("Seyès", { kind: "grid", description: "Grille d'écriture" }));
    expect(lib.search("frac").map((e) => e.name)).toEqual(["Moitié"]);
    expect(lib.search("MOITIE").map((e) => e.name)).toEqual(["Moitié"]);
    expect(lib.search("ecriture").map((e) => e.name)).toEqual(["Seyès"]);
    expect(lib.search("  ")).toEqual([]);
    expect(normalizeSearch("Écriture Œuf")).toBe("ecriture œuf");
  });

  it("C4 : collision de nom : (2)", async () => {
    const { lib } = libOf();
    await lib.add("mine", "", res("Moitié"));
    const b = await lib.add("mine", "", res("Moitié"));
    expect(b.path).toBe("Moitié (2).rbitem");
    expect(b.name).toBe("Moitié");
  });

  it("C4 : nom saisi assaini", () => {
    expect(fileNameOf("a/b\\c:d")).toBe("a_b_c_d");
    expect(fileNameOf("..secret")).toBe("_.secret");
    expect(fileNameOf("   ")).toBe("Ressource");
    expect(fileNameOf("x".repeat(200))).toHaveLength(80);
  });

  it("C4 : dossiers : mkdir, folder, remove récursif", async () => {
    const { lib } = libOf();
    const f = await lib.mkdir("mine", "", "Fractions");
    expect(f).toBe("Fractions");
    await lib.add("mine", f, res("Moitié"));
    expect(lib.folder("mine", "").folders).toEqual(["Fractions"]);
    expect(lib.folder("mine", "Fractions").items.map((i) => i.path)).toEqual(["Fractions/Moitié.rbitem"]);
    await lib.remove("mine", "Fractions");
    expect(lib.folder("mine", "").folders).toEqual([]);
    expect(lib.search("moitie")).toEqual([]);
  });

  it("C4 : refresh relit le stockage ; fichier sans compagnon : nom du fichier, kind null (H2-4)", async () => {
    const { lib, mine } = libOf();
    await mine.write("Posé/Main.rbitem", new Blob([enc("x")]));
    await lib.refresh();
    expect(lib.folder("mine", "Posé").items).toEqual([
      { root: "mine", path: "Posé/Main.rbitem", folder: "Posé", name: "Main", keywords: [], description: "", kind: null, thumbnail: null },
    ]);
  });

  it("C4 : export puis import rend les mêmes ressources", async () => {
    const { lib } = libOf();
    const f = await lib.mkdir("mine", "", "Fractions");
    await lib.add("mine", f, res("Moitié", { keywords: ["fraction"] }));
    await lib.add("mine", f, res("Seyès", { kind: "grid", thumbnail: null }));
    const pack = await lib.exportPack("mine", "Fractions");
    expect(pack.name).toBe("Fractions.rbpack");
    await lib.remove("mine", "");
    expect(lib.folder("mine", "").folders).toEqual([]);
    expect(await lib.importPack(pack.bytes, pack.name)).toEqual({ folder: "Fractions", count: 2 });
    const items = lib.folder("mine", "Fractions").items;
    expect(items.map((i) => [i.name, i.kind, i.keywords, i.thumbnail !== null])).toEqual([
      ["Moitié", "fragment", ["fraction"], true],
      ["Seyès", "grid", [], false],
    ]);
    expect(await lib.read(items[0]!)).toEqual(enc("rb:Moitié"));
  });

  it("C4 : import deux fois : Fractions (2)", async () => {
    const { lib } = libOf();
    const f = await lib.mkdir("mine", "", "Fractions");
    await lib.add("mine", f, res("Moitié"));
    const pack = await lib.exportPack("mine", f);
    expect((await lib.importPack(pack.bytes, pack.name)).folder).toBe("Fractions (2)");
  });

  it("C4 : import refusé : bibliothèque inchangée", async () => {
    const { lib, mine } = libOf();
    await lib.add("mine", "", res("Moitié"));
    const before = await mine.list();
    const bad = zipStored([{ path: "manifest.json", bytes: enc('{"format":"roomboard","formatVersion":1,"kind":"autre","name":"X","items":[]}') }]);
    await expect(lib.importPack(bad, "X.rbpack")).rejects.toThrow(unknownKindMessage("autre"));
    expect(await mine.list()).toEqual(before);
  });

  it("C4 : export de la racine : paquet « Mes ressources », sous-dossiers gardés", async () => {
    const { lib } = libOf();
    await lib.add("mine", "", res("A"));
    await lib.add("mine", await lib.mkdir("mine", "", "Sous"), res("B"));
    const pack = await lib.exportPack("mine", "");
    expect(pack.name).toBe("Mes ressources.rbpack");
    const names = Object.keys(unzipSync(pack.bytes));
    expect(names).toEqual(["manifest.json", "items/A.rbitem", "items/A.rbitem.png", "items/Sous/B.rbitem", "items/Sous/B.rbitem.png"]);
  });
});
```

- [ ] **Étape 2 : ils échouent** — commande bornée : `Failed to resolve import "./library"`.

- [ ] **Étape 3 : `library.ts`**

```ts
/**
 * Bibliothèque de ressources (C4, DA2) : index en mémoire au-dessus de `LibraryFiles` (une par racine), dossiers,
 * recherche (nom, mots-clés, description ; sans casse ni accents, D11), ajout (`<nom>.rbitem`, compagnon
 * `<nom>.rbitem.json`, vignette `<nom>.rbitem.png`, D5), export et import de paquets `.rbpack` (D17 à D19). Le paquet
 * est lu et contrôlé en entier avant la première écriture, dans un dossier neuf de « Mes ressources ».
 */
import type { LibraryFiles, LibraryRoot } from "../platform/library-files";
import { buildPack, readPack, type PackItem, type PackItemKind, type ZipFile } from "../platform/rbpack";
import type { ZipEntry } from "../platform/zip-read";

export type ResourceKind = PackItemKind;
export interface ResourceEntry {
  readonly root: LibraryRoot;
  readonly path: string;
  readonly folder: string;
  readonly name: string;
  readonly keywords: readonly string[];
  readonly description: string;
  readonly kind: ResourceKind | null;
  readonly thumbnail: string | null;
}
export interface LibraryFolder {
  readonly root: LibraryRoot;
  readonly path: string;
  readonly folders: readonly string[];
  readonly items: readonly ResourceEntry[];
}
export interface CapturedResource {
  readonly bytes: Uint8Array;
  readonly kind: ResourceKind;
  readonly thumbnail: Blob | null;
}
export interface NewResource extends CapturedResource {
  readonly name: string;
  readonly keywords: readonly string[];
  readonly description: string;
}
export interface LibraryZip {
  unzip(blob: Blob): Promise<readonly ZipEntry[]>;
  zip(files: readonly ZipFile[]): Promise<Uint8Array>;
}
export interface LibraryDeps {
  readonly files: readonly LibraryFiles[];
  readonly zip: LibraryZip;
  now(): string;
  readonly appVersion: string;
}
export interface ResourceLibrary {
  roots(): readonly LibraryRoot[];
  setRoot(files: LibraryFiles): void;
  refresh(): Promise<void>;
  folder(root: LibraryRoot, path: string): LibraryFolder;
  search(q: string): readonly ResourceEntry[];
  add(root: LibraryRoot, folder: string, r: NewResource): Promise<ResourceEntry>;
  read(entry: ResourceEntry): Promise<Uint8Array>;
  thumbnail(entry: ResourceEntry): Promise<Blob | null>;
  mkdir(root: LibraryRoot, parent: string, name: string): Promise<string>;
  remove(root: LibraryRoot, path: string): Promise<void>;
  exportPack(root: LibraryRoot, folder: string): Promise<{ readonly name: string; readonly bytes: Uint8Array }>;
  importPack(bytes: Uint8Array, fileName: string): Promise<{ readonly folder: string; readonly count: number }>;
}

export const ROOT_LABELS: Readonly<Record<LibraryRoot, string>> = Object.freeze({ mine: "Mes ressources", shared: "Ressources partagées" });
const EXT = ".rbitem";
const NAME_MAX = 80;

export const normalizeSearch = (s: string): string => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Nom de fichier sûr d'un nom saisi : `/ \ : * ? " < > |` et un point initial → `_`, 80 caractères au plus. */
export function fileNameOf(name: string): string {
  const s = name.trim().replace(/[/\\:*?"<>|\u0000-\u001f]/g, "_").replace(/^\./, "_").slice(0, NAME_MAX);
  return s === "" ? "Ressource" : s;
}

const join = (folder: string, name: string): string => (folder === "" ? name : `${folder}/${name}`);
const parentOf = (path: string): string => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");
const baseOf = (path: string): string => path.slice(path.lastIndexOf("/") + 1);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const byName = (a: ResourceEntry, b: ResourceEntry): number => a.name.localeCompare(b.name, "fr") || (a.path < b.path ? -1 : 1);
const bytesOf = async (b: Blob): Promise<Uint8Array> => new Uint8Array(await b.arrayBuffer());

interface RootIndex {
  readonly files: LibraryFiles;
  dirs: Set<string>;
  entries: ResourceEntry[];
}

export function createResourceLibrary(deps: LibraryDeps): ResourceLibrary {
  const index = new Map<LibraryRoot, RootIndex>();
  for (const f of deps.files) index.set(f.root, { files: f, dirs: new Set(), entries: [] });
  const of = (root: LibraryRoot): RootIndex => {
    const r = index.get(root);
    if (r === undefined) throw new Error(`racine absente : ${root}`);
    return r;
  };

  async function load(r: RootIndex): Promise<void> {
    const listed = await r.files.list();
    const present = new Set(listed.filter((p) => !p.dir).map((p) => p.path));
    const entries: ResourceEntry[] = [];
    for (const p of listed) {
      if (p.dir || !p.path.endsWith(EXT)) continue;
      let meta: Record<string, unknown> = {};
      if (present.has(`${p.path}.json`)) {
        try {
          const raw: unknown = JSON.parse(new TextDecoder().decode(await bytesOf(await r.files.read(`${p.path}.json`))));
          if (isRecord(raw)) meta = raw;
        } catch {
          // compagnon illisible : ressource gardée, sans mots-clés (H2-4)
        }
      }
      const kind = meta["kind"] === "grid" || meta["kind"] === "fragment" ? meta["kind"] : null;
      entries.push({
        root: r.files.root,
        path: p.path,
        folder: parentOf(p.path),
        name: typeof meta["name"] === "string" && meta["name"] !== "" ? meta["name"] : baseOf(p.path).slice(0, -EXT.length),
        keywords: Array.isArray(meta["keywords"]) ? meta["keywords"].filter((k): k is string => typeof k === "string") : [],
        description: typeof meta["description"] === "string" ? meta["description"] : "",
        kind,
        thumbnail: present.has(`${p.path}.png`) ? `${p.path}.png` : null,
      });
    }
    r.dirs = new Set(listed.filter((p) => p.dir).map((p) => p.path));
    r.entries = entries;
  }

  const taken = (r: RootIndex, path: string): boolean => r.dirs.has(path) || r.entries.some((e) => e.path === path);
  function unique(r: RootIndex, folder: string, base: string, suffix: string): string {
    for (let n = 1; ; n++) {
      const candidate = join(folder, n === 1 ? `${base}${suffix}` : `${base} (${n})${suffix}`);
      if (!taken(r, candidate)) return candidate;
    }
  }

  async function write(r: RootIndex, folder: string, x: NewResource): Promise<ResourceEntry> {
    const path = unique(r, folder, fileNameOf(x.name), EXT);
    await r.files.write(path, new Blob([x.bytes as BlobPart], { type: "application/x-roomboard-item" }));
    const companion = { name: x.name, keywords: [...x.keywords], description: x.description, kind: x.kind };
    await r.files.write(`${path}.json`, new Blob([JSON.stringify(companion, null, 2)], { type: "application/json" }));
    if (x.thumbnail !== null) await r.files.write(`${path}.png`, x.thumbnail);
    const entry: ResourceEntry = { root: r.files.root, path, folder, name: x.name, keywords: [...x.keywords], description: x.description, kind: x.kind, thumbnail: x.thumbnail === null ? null : `${path}.png` };
    for (let p = folder; p !== ""; p = parentOf(p)) r.dirs.add(p);
    r.entries = [...r.entries, entry];
    return entry;
  }

  return {
    roots: () => [...index.keys()],
    setRoot(files) {
      index.set(files.root, { files, dirs: new Set(), entries: [] });
    },
    async refresh() {
      await Promise.all([...index.values()].map(load));
    },
    folder(root, path) {
      const r = of(root);
      return {
        root,
        path,
        folders: [...r.dirs].filter((d) => parentOf(d) === path && d !== path).sort((a, b) => a.localeCompare(b, "fr")),
        items: r.entries.filter((e) => e.folder === path).sort(byName),
      };
    },
    search(q) {
      const n = normalizeSearch(q).trim();
      if (n === "") return [];
      const all = [...index.values()].flatMap((r) => r.entries);
      return all.filter((e) => normalizeSearch(`${e.name} ${e.keywords.join(" ")} ${e.description}`).includes(n)).sort(byName);
    },
    add: (root, folder, r) => write(of(root), folder, r),
    async read(entry) {
      return bytesOf(await of(entry.root).files.read(entry.path));
    },
    async thumbnail(entry) {
      if (entry.thumbnail === null) return null;
      const b = await of(entry.root).files.read(entry.thumbnail);
      return b.type === "image/png" ? b : new Blob([b], { type: "image/png" });
    },
    async mkdir(root, parent, name) {
      const r = of(root);
      const path = unique(r, parent, fileNameOf(name), "");
      await r.files.mkdir(path);
      for (let p = path; p !== ""; p = parentOf(p)) r.dirs.add(p);
      return path;
    },
    async remove(root, path) {
      const r = of(root);
      await r.files.remove(path);
      const inside = (p: string) => path === "" || p === path || p.startsWith(`${path}/`);
      r.dirs = new Set([...r.dirs].filter((d) => !inside(d)));
      // une ressource seule : ses fichiers compagnons partent avec elle
      if (path.endsWith(EXT)) {
        for (const extra of [`${path}.json`, `${path}.png`]) await r.files.remove(extra).catch(() => undefined);
      }
      r.entries = r.entries.filter((e) => !inside(e.path));
    },
    async exportPack(root, folder) {
      const r = of(root);
      const prefix = folder === "" ? "" : `${folder}/`;
      const chosen = r.entries.filter((e) => folder === "" || e.path.startsWith(prefix));
      const items: PackItem[] = [];
      for (const e of chosen) {
        items.push({
          path: e.path.slice(prefix.length, -EXT.length),
          name: e.name,
          keywords: e.keywords,
          description: e.description,
          kind: e.kind ?? "fragment",
          bytes: await bytesOf(await r.files.read(e.path)),
          thumbnail: e.thumbnail === null ? null : await bytesOf(await r.files.read(e.thumbnail)),
        });
      }
      const name = folder === "" ? ROOT_LABELS[root] : baseOf(folder);
      const bytes = await deps.zip.zip(buildPack(name, items, { appVersion: deps.appVersion, now: deps.now() }));
      return { name: `${fileNameOf(name)}.rbpack`, bytes };
    },
    async importPack(bytes, fileName) {
      const entries = await deps.zip.unzip(new Blob([bytes as BlobPart]));
      const files: ZipFile[] = [];
      for (const e of entries) files.push({ path: e.path, bytes: await bytesOf(e.blob) });
      const pack = readPack(files); // lève avant toute écriture (D18)
      const r = of("mine");
      const folder = unique(r, "", fileNameOf(pack.name || fileName.replace(/\.rbpack$/i, "")), "");
      await r.files.mkdir(folder);
      r.dirs.add(folder);
      for (const i of pack.items) {
        const sub = join(folder, parentOf(i.path));
        await write(r, sub, {
          bytes: i.bytes,
          kind: i.kind,
          thumbnail: i.thumbnail === null ? null : new Blob([i.thumbnail as BlobPart], { type: "image/png" }),
          name: i.name,
          keywords: i.keywords,
          description: i.description,
        });
      }
      return { folder, count: pack.items.length };
    },
  };
}
```

Note : `write` nomme le fichier d'après `fileNameOf(x.name)` ; à l'import, le nom de fichier d'origine (`i.path`) peut
différer du nom affiché : le fichier est renommé d'après le nom (même règle que l'ajout), le sous-dossier est gardé.

- [ ] **Étape 4 : tests verts** — commande bornée.

- [ ] **Étape 5 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T8
git add apps/web/src/app/library.ts
git add apps/web/src/app/library.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(web): resource library index, search and rbpack import/export

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T9 — Entrée `.rbpack` de l'importeur et types de fichiers
<a id="tache-t9"></a>

**Objectif :** un `.rbpack` déposé sur la scène, choisi par « Importer » ou passé au lancement est importé dans la
bibliothèque (U25, D19) ; extension, MIME et type de boîte pour le paquet.

**Fichiers :**
- Modifier : `apps/web/src/platform/files.ts:6-9`
- Modifier : `apps/web/src/platform/typed-files.ts:18-23`
- Modifier : `apps/web/src/platform/import.ts` (en-tête, `ImportDeps`, après `rbitemHandler` `:149-170`, registre `:247`)
- Modifier : `apps/web/src/platform/import.test.ts`

**Interfaces :**
- Produit : `export const RBPACK_EXTENSION = ".rbpack";` `export const RBPACK_MIME = "application/x-roomboard-pack";` (`files.ts`) ; `export const RBPACK_TYPE: FileType` (`typed-files.ts`, filtre « Paquet RoomBoard ») ; `ImportDeps.importPack?(name: string, bytes: Uint8Array): Promise<boolean>` ; `export function isRbpackName(name: string): boolean` ; `export function rbpackHandler(deps: { importPack(name: string, bytes: Uint8Array): Promise<boolean> }): ImportHandler` (id `"rbpack"`, nature `"document"` : aucune cible d'onglet).
- Consommé par : T14 (`WorkspaceDeps.importPack` transmis à `createImporter`, `RBPACK_TYPE` dans `main.ts`).
- Réutilise : `apps/web/src/platform/import.ts:149,247` — `ImportHandler` ; `rbpackHandler(lib)` à côté de `rbitemHandler()` (ici `rbpackHandler({ importPack })`).
- Réutilise : `apps/web/src/platform/typed-files.ts:40,52` — `createWebTypedFiles` / `createTauriTypedFiles` avec `RBPACK_TYPE` (appelés par T14).

**Test et commande bornée :** `cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T9 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/import.test.ts --reporter=verbose 2>&1 | grep -E "C4|Tests " | tail -10` : ≥ 3 tests « C4 », `Tests` sans `failed` (tests C3 et C15 du fichier verts).

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- GC5 — `nice -n 10` ; test sur délai rejoué une fois.
- GC7 — Commits fichier par fichier, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC8 — Un `.rbitem` d'avant C4 suit toujours `rbitemHandler`.
- GC10 — Tests neufs nommés « C4 : … ».

**Interdits :** `rbitemHandler` inchangé (la grille passe par la cible `insertFragment`, routée par T14) ; aucun
plafond de taille changé.

**Critère « terminé » :** tests verts, rapport avec `Réutilisation : appelé import.ImportHandler (rbpackHandler à côté de rbitemHandler)`.

- [ ] **Étape 1 : tests qui échouent** — `import.test.ts` (reprendre la fabrique de fichiers déposés et d'importeur du fichier : `grep -n "function dropped\|createImporter(" apps/web/src/platform/import.test.ts | head`) :

```ts
describe("C4 : paquets .rbpack", () => {
  const PK = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0]);

  it("C4 : un .rbpack déposé est remis à importPack, rapport « opened »", async () => {
    const got: [string, number][] = [];
    const importer = importerOf([rbpackHandler({ importPack: async (n, b) => (got.push([n, b.length]), true) })], baseDeps());
    const report = await importer.importFiles([droppedOf("Fractions.rbpack", PK)]);
    expect(got).toEqual([["Fractions.rbpack", PK.length]]);
    expect(report.opened).toEqual(["Fractions.rbpack"]);
  });

  it("C4 : refus de importPack : rapport « failed »", async () => {
    const importer = importerOf([rbpackHandler({ importPack: async () => false })], baseDeps());
    expect((await importer.importFiles([droppedOf("X.rbpack", PK)])).failed).toEqual(["X.rbpack"]);
  });

  it("C4 : sans importPack, createImporter refuse un .rbpack comme format à venir", async () => {
    const report = await createImporter(baseDeps()).importFiles([droppedOf("X.rbpack", PK)]);
    expect(report.refused).toEqual(["X.rbpack"]);
    expect(isRbpackName("a.RBPACK")).toBe(true);
    expect(RBPACK_TYPE.filter).toEqual({ name: "Paquet RoomBoard", extensions: ["rbpack"] });
  });
});
```

(`baseDeps()`, `droppedOf(name, bytes)` : les fabriques locales du fichier, sous leur nom réel ; `importFiles` : la méthode réelle de `Importer` — `grep -n "export interface Importer" -A4 apps/web/src/platform/import.ts`.)

- [ ] **Étape 2 : ils échouent** — commande bornée : `rbpackHandler is not defined`.

- [ ] **Étape 3 : code** — `files.ts` :

```ts
export const RBPACK_EXTENSION = ".rbpack";
export const RBPACK_MIME = "application/x-roomboard-pack";
```

`typed-files.ts` :

```ts
/** C4 (D17, D19) : paquet de ressources exporté ou importé par la bibliothèque. */
export const RBPACK_TYPE: FileType = {
  extension: RBPACK_EXTENSION,
  mime: RBPACK_MIME,
  filter: { name: "Paquet RoomBoard", extensions: [RBPACK_EXTENSION.slice(1)] },
  accept: `${RBPACK_EXTENSION},${RBPACK_MIME}`,
};
```

`import.ts` — `ImportDeps` :

```ts
  /** C4 (U25, D19) : paquet `.rbpack` importé dans la bibliothèque ; faux si refusé (avis déjà dit). Absent : refusé. */
  importPack?(name: string, bytes: Uint8Array): Promise<boolean>;
```

après `rbitemHandler` :

```ts
export function isRbpackName(name: string): boolean {
  return hasExtension(name, RBPACK_EXTENSION);
}

/** Entrée `rbpack` (C4, U25 « Paquet → importé dans la bibliothèque ») : aucun onglet visé. */
export function rbpackHandler(deps: { importPack(name: string, bytes: Uint8Array): Promise<boolean> }): ImportHandler {
  return {
    id: "rbpack",
    nature: "document",
    detect: (head, name) => isRbpackName(name) && hasZipMagic(head),
    async run(f, ctx) {
      try {
        const bytes = new Uint8Array(await ctx.blob.arrayBuffer());
        return (await deps.importPack(f.name, bytes)) ? "opened" : "failed";
      } catch (e) {
        await ctx.notify(`Import impossible (${f.name}) : ${messageOf(e)}`);
        return "failed";
      }
    },
  };
}
```

registre : `const importPack = deps.importPack?.bind(deps);` puis, juste après `rbitemHandler(),` : `...(importPack ? [rbpackHandler({ importPack })] : []),`. En-tête du module : une ligne « C4 (U25) : `rbpack` (paquet, nom + en-tête ZIP) importé dans la bibliothèque par `importPack`. » (Si le type de rapport du `run` n'a pas `"opened"`, reprendre la valeur que `roomboardHandler` rend pour un document ouvert.)

- [ ] **Étape 4 : tests verts** — commande bornée.

- [ ] **Étape 5 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T9
git add apps/web/src/platform/files.ts
git add apps/web/src/platform/typed-files.ts
git add apps/web/src/platform/import.ts
git add apps/web/src/platform/import.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(web): rbpack import entry and file types

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T10 — Coque : association `rbpack`, capacités de dossiers, `ASSOCIATED_EXTENSIONS`
<a id="tache-t10"></a>

**Objectif :** la coque associe `.rbpack`, garde un `.rbpack` passé au lancement, et accorde à la page la lecture,
l'écriture, la création et la suppression sous `$DOCUMENT/RoomBoard/Ressources` seulement (D7, D20, DA3), prouvé sans
build Tauri.

**Fichiers :**
- Modifier : `apps/desktop/src-tauri/tauri.conf.json:36-51`
- Modifier : `apps/desktop/src-tauri/capabilities/default.json`
- Modifier : `crates/roomboard-shell/src/lib.rs:14`, `:321-339`, module de tests
- Modifier : `crates/roomboard-shell/Cargo.toml` (`[dev-dependencies] serde_json = "1"`, déjà au `Cargo.lock` par le cœur), `Cargo.lock`
- Modifier : `docs/essais/taille-wasm.md`

**Interfaces :**
- Produit : `pub const ASSOCIATED_EXTENSIONS: &[&str] = &["roomboard", "rbitem", "rbpack"];` ; association `{ ext: ["rbpack"], name: "Paquet RoomBoard", description: "Paquet RoomBoard", mimeType: "application/x-roomboard-pack", role: "Editor" }` ; permissions `fs:allow-read-dir`, `fs:allow-mkdir`, `fs:allow-remove`, `fs:allow-exists`, portée `fs:scope` `$DOCUMENT/RoomBoard/Ressources` et `$DOCUMENT/RoomBoard/Ressources/**`.
- Consommé par : T6 (`createTauriLibraryFiles` appelle `readDir`, `mkdir`, `remove`, `exists`), T14 (chemin `Documents/RoomBoard/Ressources`).

**Test et commande bornée :** `cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T10 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && nice -n 10 cargo test -p roomboard-shell 2>&1 | grep -E "^test |test result" | tail -30` : `tauri_conf_associations_match_associated_extensions ... ok`, `capabilities_grant_library_folder_only ... ok`, `launch_paths_keeps_associated_extensions ... ok`, `test result: ok`.
Puis, à garder verts : `node scripts/controle-hors-ligne.mjs apps/web/dist apps/desktop/src-tauri/tauri.conf.json 2>&1 | tail -2` (si `apps/web/dist` manque : `bash scripts/tests/controle-hors-ligne.test.sh 2>&1 | tail -2`) et `node scripts/controle-icones.mjs apps/desktop/src-tauri/tauri.conf.json 2>&1 | tail -2` : aucune ligne d'échec.

**Mesure (GC2) :** même bloc que T1, dossiers `/tmp/c4-t10-wasm` et `/tmp/c4-t10-formats` ; attendu : tailles égales à celles relevées par T2 (la coque n'entre dans aucun module Wasm) ; ajouter la ligne `| après la tâche T10 (coque, sans effet attendu) | <mesuré> o | <mesuré> o |`.

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- GC2 — Plafonds : principal 1 572 864 o (avant 1 362 599 o), `formats` 3 145 728 o (avant 3 100 344 o). Tâche Rust : deux tailles mesurées et écrites.
- GC3 — Aucun build Tauri, aucun build Android : preuve par tests unitaires et lecture de `tauri.conf.json` et des capacités.
- GC5 — `nice -n 10` ; test sur délai rejoué une fois.
- GC6 — Aucune dépendance neuve (`serde_json` déjà dans le dépôt, en dépendance de développement seulement).
- GC7 — Commits fichier par fichier, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC9 — `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.

**Interdits :** aucune commande Rust neuve dans `apps/desktop/src-tauri/src/main.rs` (DA3) ; `scopeDroppedPaths: false`
inchangé ; aucune portée `$HOME/**`, `$DOCUMENT/**` ni `**`.

**Critère « terminé » :** tests verts, contrôles verts, `cargo clippy -p roomboard-shell --all-targets -- -D warnings` propre, tailles écrites, rapport.

- [ ] **Étape 1 : tests qui échouent** — `crates/roomboard-shell/src/lib.rs`, module de tests :

```rust
    #[test]
    fn tauri_conf_associations_match_associated_extensions() {
        let raw = include_str!("../../../apps/desktop/src-tauri/tauri.conf.json");
        let conf: serde_json::Value = serde_json::from_str(raw).expect("tauri.conf.json lisible");
        let mut exts: Vec<String> = conf["bundle"]["fileAssociations"]
            .as_array()
            .expect("fileAssociations")
            .iter()
            .flat_map(|a| a["ext"].as_array().cloned().unwrap_or_default())
            .filter_map(|e| e.as_str().map(String::from))
            .collect();
        exts.sort();
        let mut expected: Vec<String> = ASSOCIATED_EXTENSIONS.iter().map(|s| s.to_string()).collect();
        expected.sort();
        assert_eq!(exts, expected);
        let pack = conf["bundle"]["fileAssociations"]
            .as_array()
            .unwrap()
            .iter()
            .find(|a| a["ext"][0] == "rbpack")
            .expect("association rbpack");
        assert_eq!(pack["mimeType"], "application/x-roomboard-pack");
        assert_eq!(pack["name"], "Paquet RoomBoard");
    }

    #[test]
    fn capabilities_grant_library_folder_only() {
        let raw = include_str!("../../../apps/desktop/src-tauri/capabilities/default.json");
        let caps: serde_json::Value = serde_json::from_str(raw).expect("default.json lisible");
        let perms = caps["permissions"].as_array().expect("permissions");
        let names: Vec<&str> = perms.iter().filter_map(|p| p.as_str()).collect();
        for p in ["fs:allow-read-dir", "fs:allow-mkdir", "fs:allow-remove", "fs:allow-exists", "fs:allow-read-file", "fs:allow-write-file"] {
            assert!(names.contains(&p), "{p} absente");
        }
        let scope = perms
            .iter()
            .find(|p| p["identifier"] == "fs:scope")
            .expect("fs:scope");
        let allow: Vec<&str> = scope["allow"]
            .as_array()
            .expect("allow")
            .iter()
            .filter_map(|a| a["path"].as_str())
            .collect();
        assert_eq!(allow, vec!["$DOCUMENT/RoomBoard/Ressources", "$DOCUMENT/RoomBoard/Ressources/**"]);
    }
```

Et dans `launch_paths_keeps_associated_extensions`, ajouter `"/x/Fractions.rbpack"` aux arguments et `PathBuf::from("/x/Fractions.rbpack")` au résultat attendu, à la même place.

- [ ] **Étape 2 : ils échouent** — commande bornée : les deux tests neufs `FAILED` (`left: ["rbitem", "roomboard"]`, `fs:allow-read-dir absente`).

- [ ] **Étape 3 : code** — `lib.rs:14` : `pub const ASSOCIATED_EXTENSIONS: &[&str] = &["roomboard", "rbitem", "rbpack"];`. `Cargo.toml` :

```toml
[dev-dependencies]
serde_json = "1"
```

`tauri.conf.json`, troisième association après `rbitem` :

```json
      {
        "ext": ["rbpack"],
        "name": "Paquet RoomBoard",
        "description": "Paquet RoomBoard",
        "mimeType": "application/x-roomboard-pack",
        "role": "Editor"
      }
```

`default.json` :

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Fenêtre principale : boîtes de fichiers, lecture et écriture des seuls fichiers choisis (portée ajoutée par le plugin dialog), fermeture gardée, titre. Bibliothèque (C4) : lecture, écriture, création et suppression sous Documents/RoomBoard/Ressources, et dans le dossier partagé choisi par la boîte native (portée ajoutée par le plugin dialog, récursive, pour la session). Fichiers déposés ou passés au lancement : lus par les commandes de la coque (read_granted_file, granted_file_size, launch_files), limitées aux fichiers accordés, jamais un dossier ; quit_app. Aucune portée fs pour les dépôts (scopeDroppedPaths: false).",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:allow-destroy",
    "core:window:allow-set-title",
    "dialog:allow-open",
    "dialog:allow-save",
    "dialog:allow-message",
    "fs:allow-read-file",
    "fs:allow-write-file",
    "fs:allow-read-dir",
    "fs:allow-mkdir",
    "fs:allow-remove",
    "fs:allow-exists",
    {
      "identifier": "fs:scope",
      "allow": [{ "path": "$DOCUMENT/RoomBoard/Ressources" }, { "path": "$DOCUMENT/RoomBoard/Ressources/**" }]
    }
  ]
}
```

- [ ] **Étape 4 : `Cargo.lock`** — `nice -n 10 cargo build -p roomboard-shell --tests 2>&1 | tail -2` met à jour `Cargo.lock` (ligne `serde_json` dans les dépendances de `roomboard-shell`) ; `git diff --stat Cargo.lock` : seul ce paquet change.

- [ ] **Étape 5 : tests verts et contrôles** — commandes de la section ; mesure.

- [ ] **Étape 6 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T10
git add apps/desktop/src-tauri/tauri.conf.json
git add apps/desktop/src-tauri/capabilities/default.json
git add crates/roomboard-shell/src/lib.rs
git add crates/roomboard-shell/Cargo.toml
git add Cargo.lock
git add docs/essais/taille-wasm.md
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(shell): rbpack association and library folder capabilities

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T11 — Action de barre `library` « Bibliothèque »
<a id="tache-t11"></a>

**Objectif :** un bouton « Bibliothèque » dans la rangée « vue » des profils livrés `defaut` et `annotation`, juste
après « Grille », qui bascule le panneau `library` (D16).

**Fichiers :**
- Modifier : `apps/web/src/toolbar.ts:117` (libellé), et la liste des identifiants d'action si elle existe (`grep -n '"grid"' apps/web/src/toolbar*.ts`)
- Modifier : `apps/web/src/toolbar-profiles.ts:62` (et la rangée « vue » d'`annotation`, même recherche)
- Modifier : `apps/web/src/toolbar-profiles.test.ts:44-48`
- Modifier : `apps/web/src/app/toolbar-host.ts:32,61`, `apps/web/src/app/toolbar-host.test.ts`
- Modifier : `apps/web/src/ui/App.tsx:55` (type `Panel` seul)

**Interfaces :**
- Produit : action `"library"` (libellé « Bibliothèque ») ; `ToolbarHostDeps.toggle(panel: "settings" | "profiles" | "grid" | "image" | "library"): void` ; `type Panel = "settings" | "profiles" | "editor" | "grid" | "image" | "library"` dans `App.tsx`.
- Consommé par : T14 (`<Show when={panel() === "library"}>`).
- Réutilise : `apps/web/src/app/toolbar-host.ts:32,61`, `ui/App.tsx:55` — `toggle("library")`.

**Test et commande bornée :** `cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T11 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/toolbar-profiles.test.ts src/app/toolbar-host.test.ts --reporter=verbose 2>&1 | grep -E "C4|Grille|Tests " | tail -10` : ≥ 2 tests « C4 », le test « Grille (E7, HE5) » vert avec sa liste mise à jour, `Tests` sans `failed`.

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- GC4 — La scène ne passe jamais sous 640 px (vérifié par l'essai T15 et `c5-image-navigateur.mjs:156`).
- GC5 — `nice -n 10` ; test sur délai rejoué une fois.
- GC7 — Commits fichier par fichier, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC10 — Tests neufs nommés « C4 : … ».

**Interdits :** `simple` ne reçoit pas `library` ; aucun autre bouton déplacé ; `App.tsx` : seule la ligne du type.

**Critère « terminé » :** tests verts, `tsc --noEmit` propre, rapport avec `Réutilisation : appelé toolbar-host.toggle`.

- [ ] **Étape 1 : tests qui échouent** — `toolbar-profiles.test.ts`, test « Grille (E7, HE5) » : liste attendue `["fit-page", "grid", "library", "profiles", "settings"]` ; et :

```ts
  it("C4 : Bibliothèque dans defaut et annotation, absente de simple", () => {
    for (const id of ["defaut", "annotation"]) expect(ids(id), id).toContain("library");
    expect(ids("simple")).not.toContain("library");
  });
```

`toolbar-host.test.ts` (reprendre la fabrique d'hôte du fichier) :

```ts
  it("C4 : library bascule le panneau « library »", () => {
    const toggled: string[] = [];
    const host = hostOf({ toggle: (p) => void toggled.push(p) }); // fabrique locale du fichier
    host.run("library"); // méthode réelle d'exécution d'une action : `grep -n "grid" apps/web/src/app/toolbar-host.test.ts`
    expect(toggled).toEqual(["library"]);
  });
```

- [ ] **Étape 2 : ils échouent** — commande bornée.

- [ ] **Étape 3 : code** — `toolbar.ts` : `library: { label: "Bibliothèque" },` après `grid` ; `toolbar-profiles.ts:62` : `action("grid", "Grille"), action("library", "Bibliothèque"), action("profiles", "Profil")` (et de même dans la rangée « vue » d'`annotation`) ; `toolbar-host.ts:32` : `toggle(panel: "settings" | "profiles" | "grid" | "image" | "library"): void;`, `:61` suivi de `library: (t) => t.toggle("library"),` ; `App.tsx:55` : `type Panel = "settings" | "profiles" | "editor" | "grid" | "image" | "library";`.

- [ ] **Étape 4 : tests verts** — commande bornée ; `nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -3` : aucune `error TS` hors fichiers d'autres tâches en cours.

- [ ] **Étape 5 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T11
git add apps/web/src/toolbar.ts
git add apps/web/src/toolbar-profiles.ts
git add apps/web/src/toolbar-profiles.test.ts
git add apps/web/src/app/toolbar-host.ts
git add apps/web/src/app/toolbar-host.test.ts
git add apps/web/src/ui/App.tsx
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(web): library toolbar action

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T12 — Glisser une carte vers la scène (Pointer Events)
<a id="tache-t12"></a>

**Objectif :** appui sur une carte, fantôme qui suit, lâcher au-dessus de `.rb-stages` = dépôt au point client ;
ailleurs, Échap ou annulation du pointeur : rien (D13, DA4).

**Fichiers :**
- Créer : `apps/web/src/ui/resource-drag.ts`, `apps/web/src/ui/resource-drag.test.ts`

**Interfaces :**
- Consomme : `Point` (`platform/files.ts:48`).
- Produit : `export const DRAG_THRESHOLD_PX = 4;` ; `export interface DragOptions { readonly label: string; readonly thumbnail?: string | null; readonly hit?: (x: number, y: number) => Element | null }` ; `export function startResourceDrag(e: PointerEvent, onDrop: (at: Point) => void, opts: DragOptions): void`.
- Consommé par : T13 (`onPointerDown` de la carte).
- Réutilise : aucun module existant (`dragstart`, `draggable` : rien ; `drop-web.ts:1` l'exclut) — nouveau module `ui/resource-drag.ts` (DA4).

**Test et commande bornée :** `cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T12 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/resource-drag.test.ts --reporter=verbose 2>&1 | grep -E "C4|Tests " | tail -8` : ≥ 4 tests « C4 », 0 échec.

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- GC5 — `nice -n 10` ; test sur délai rejoué une fois.
- GC7 — Commits fichier par fichier, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC10 — Tests neufs nommés « C4 : … ».

**Interdits :** jamais HTML5 `draggable` ni `dataTransfer` ; `drop-web.ts` intouché.

**Critère « terminé » :** tests verts, rapport (`Réutilisation : écart — aucun module existant, nouveau module prévu par le cadrage`).

- [ ] **Étape 1 : tests qui échouent**

```ts
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { DRAG_THRESHOLD_PX, startResourceDrag } from "./resource-drag";

const stages = document.createElement("div");
stages.className = "rb-stages";
document.body.append(stages);
afterEach(() => document.querySelectorAll(".rb-drag-ghost").forEach((g) => g.remove()));

function card() {
  const c = document.createElement("div");
  c.setPointerCapture = vi.fn();
  c.releasePointerCapture = vi.fn();
  document.body.append(c);
  return c;
}
const ev = (type: string, x: number, y: number) => new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true });
function down(c: HTMLElement, onDrop: (p: { x: number; y: number }) => void, hit: Element | null) {
  const e = ev("pointerdown", 10, 10);
  Object.defineProperty(e, "currentTarget", { value: c });
  startResourceDrag(e, onDrop, { label: "Moitié", hit: () => hit });
}

describe("C4 : glisser une ressource", () => {
  it("C4 : lâcher au-dessus de la scène : onDrop au point client, fantôme retiré", () => {
    const c = card();
    const onDrop = vi.fn();
    down(c, onDrop, stages);
    c.dispatchEvent(ev("pointermove", 200, 150));
    expect(document.querySelector(".rb-drag-ghost")?.textContent).toBe("Moitié");
    c.dispatchEvent(ev("pointerup", 300, 250));
    expect(onDrop).toHaveBeenCalledWith({ x: 300, y: 250 });
    expect(document.querySelector(".rb-drag-ghost")).toBeNull();
  });

  it("C4 : lâcher hors de la scène : rien", () => {
    const c = card();
    const onDrop = vi.fn();
    down(c, onDrop, document.body);
    c.dispatchEvent(ev("pointermove", 200, 150));
    c.dispatchEvent(ev("pointerup", 200, 150));
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("C4 : sous le seuil : un clic, pas un glisser", () => {
    const c = card();
    const onDrop = vi.fn();
    down(c, onDrop, stages);
    c.dispatchEvent(ev("pointermove", 10 + DRAG_THRESHOLD_PX - 1, 10));
    c.dispatchEvent(ev("pointerup", 10 + DRAG_THRESHOLD_PX - 1, 10));
    expect(onDrop).not.toHaveBeenCalled();
    expect(document.querySelector(".rb-drag-ghost")).toBeNull();
  });

  it("C4 : Échap annule", () => {
    const c = card();
    const onDrop = vi.fn();
    down(c, onDrop, stages);
    c.dispatchEvent(ev("pointermove", 200, 150));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    c.dispatchEvent(ev("pointerup", 300, 250));
    expect(onDrop).not.toHaveBeenCalled();
    expect(document.querySelector(".rb-drag-ghost")).toBeNull();
  });
});
```

- [ ] **Étape 2 : ils échouent** — commande bornée : import introuvable.

- [ ] **Étape 3 : `resource-drag.ts`**

```ts
/**
 * Glisser d'une carte de la bibliothèque vers la scène (C4, D13, DA4) : Pointer Events seuls (souris, stylet, doigt),
 * jamais HTML5 `draggable` (empêché par le glisser-déposer natif de la fenêtre Tauri sous Windows, mal joué au doigt).
 * Capture du pointeur, fantôme qui suit au-delà de 4 px, lâcher au-dessus de `.rb-stages` = `onDrop` au point client
 * (même forme que `DropHandler`) ; ailleurs, Échap ou `pointercancel` : rien.
 */
import type { Point } from "../platform/files";

export const DRAG_THRESHOLD_PX = 4;
export interface DragOptions {
  readonly label: string;
  readonly thumbnail?: string | null;
  /** Élément sous le point (tests) ; défaut : `document.elementFromPoint`. */
  readonly hit?: (x: number, y: number) => Element | null;
}

export function startResourceDrag(e: PointerEvent, onDrop: (at: Point) => void, opts: DragOptions): void {
  const source = e.currentTarget as HTMLElement | null;
  if (source === null || e.button > 0) return;
  const doc = source.ownerDocument;
  const hit = opts.hit ?? ((x: number, y: number) => doc.elementFromPoint(x, y));
  const x0 = e.clientX;
  const y0 = e.clientY;
  let ghost: HTMLElement | null = null;
  source.setPointerCapture?.(e.pointerId);

  const place = (x: number, y: number): void => {
    if (ghost === null) {
      ghost = doc.createElement("div");
      ghost.className = "rb-drag-ghost";
      if (opts.thumbnail) {
        const img = doc.createElement("img");
        img.src = opts.thumbnail;
        img.alt = "";
        ghost.append(img);
      }
      ghost.append(doc.createTextNode(opts.label));
      doc.body.append(ghost);
    }
    ghost.style.transform = `translate(${x + 8}px, ${y + 8}px)`;
  };
  const end = (): void => {
    source.removeEventListener("pointermove", move);
    source.removeEventListener("pointerup", up);
    source.removeEventListener("pointercancel", end);
    doc.removeEventListener("keydown", key, true);
    source.releasePointerCapture?.(e.pointerId);
    ghost?.remove();
    ghost = null;
  };
  function move(m: PointerEvent): void {
    if (ghost === null && Math.hypot(m.clientX - x0, m.clientY - y0) < DRAG_THRESHOLD_PX) return;
    place(m.clientX, m.clientY);
  }
  function up(u: PointerEvent): void {
    const dragged = ghost !== null;
    end();
    if (dragged && hit(u.clientX, u.clientY)?.closest(".rb-stages")) onDrop({ x: u.clientX, y: u.clientY });
  }
  function key(k: KeyboardEvent): void {
    if (k.key !== "Escape") return;
    k.preventDefault();
    end();
  }
  source.addEventListener("pointermove", move);
  source.addEventListener("pointerup", up);
  source.addEventListener("pointercancel", end);
  doc.addEventListener("keydown", key, true);
}
```

- [ ] **Étape 4 : tests verts** — commande bornée.

- [ ] **Étape 5 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T12
git add apps/web/src/ui/resource-drag.ts
git add apps/web/src/ui/resource-drag.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(web): pointer-events drag of library cards to the stage

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T13 — Panneau `LibraryPanel`
<a id="tache-t13"></a>

**Objectif :** le panneau « Bibliothèque » : deux sections (« Mes ressources », « Ressources partagées »), dossiers,
recherche, cartes avec vignette, formulaire d'ajout (sélection ou grille), suppression, « Vider », export et import de
paquet (D9 à D13, D19).

**Fichiers :**
- Créer : `apps/web/src/ui/LibraryPanel.tsx`, `apps/web/src/ui/LibraryPanel.test.tsx`

**Interfaces :**
- Consomme (T8) : `ResourceLibrary`, `ResourceEntry`, `CapturedResource`, `ROOT_LABELS`, `LibraryRoot` (T6). Consomme (T12) : `startResourceDrag(e, onDrop, { label, thumbnail })`. `Point` (`platform/files.ts`). `TypedFiles` (`platform/typed-files.ts`).
- Produit :
  - `export interface SharedFolder { readonly desktop: boolean; chosen(): boolean; choose(): Promise<boolean> }`
  - `export interface LibraryPanelProps { readonly library: ResourceLibrary; readonly shared: SharedFolder; readonly packs: TypedFiles; capture(what: "selection" | "grid"): Promise<CapturedResource | null>; place(entry: ResourceEntry, at: Point | null): Promise<void>; confirm(message: string): Promise<boolean>; say(message: string): Promise<void>; close(): void }`
  - `export function LibraryPanel(props: LibraryPanelProps): JSX.Element`
  - Libellés exacts : « Bibliothèque », « Mes ressources », « Ressources partagées », « Rechercher dans la bibliothèque » (`aria-label`), « Ajouter la sélection », « Ajouter la grille de la page », « Nom », « Mots-clés (séparés par des virgules) », « Description », « Ajouter », « Annuler », « Nouveau dossier », « Nom du dossier », « Créer », « Exporter (.rbpack) », « Importer un paquet… », « Vider », « Choisir le dossier partagé… », « Dossier partagé : application de bureau seulement », « Fermer ».
  - Sélecteurs : `#bibliotheque` (racine), `[data-lib="search"]`, `section[data-root="mine"]`, `section[data-root="shared"]`, `[data-lib="add-selection"]`, `[data-lib="add-grid"]`, `[data-lib="name"]`, `[data-lib="keywords"]`, `[data-lib="description"]`, `[data-lib="submit"]`, `[data-lib="cancel"]`, `[data-lib="new-folder"]`, `[data-lib="folder-name"]`, `[data-lib="create-folder"]`, `[data-lib="export"]`, `[data-lib="import"]`, `[data-lib="clear"]`, `[data-lib="choose-shared"]`, `[data-lib="up"]`, `button[data-folder="<chemin>"]`, `.rb-resource[data-resource="<chemin>"][data-root]`, `img.rb-thumb`, `span.rb-badge`, `[data-lib="results"]`, `[data-lib="remove"]` (dans la carte).
- Consommé par : T14 (`App.tsx`), T15 (sélecteurs).
- Réutilise : `apps/web/src/app/library.ts` (T8) — `ResourceLibrary` (DA2) : `folder`, `search`, `add`, `thumbnail`, `mkdir`, `remove`, `exportPack`, `importPack`, `refresh`, `roots`.
- Réutilise : `apps/web/src/ui/resource-drag.ts` (T12) — `startResourceDrag(e: PointerEvent, onDrop: (at: Point) => void, opts)` (DA4).
- Réutilise : `apps/web/src/platform/typed-files.ts:40,52` — `TypedFiles.pick()` / `save(name, bytes)` (réalisation `RBPACK_TYPE` passée par T14).

**Test et commande bornée :** `cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T13 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/LibraryPanel.test.tsx --reporter=verbose 2>&1 | grep -E "C4|Tests " | tail -14` : ≥ 8 tests « C4 », 0 échec.

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- GC4 — La scène ne passe jamais sous 640 px : le panneau est un popover qui recouvre la scène (T14 le cale), il ne prend aucune colonne.
- GC5 — `nice -n 10` ; test sur délai rejoué une fois.
- GC7 — Commits fichier par fichier, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC10 — Tests neufs nommés « C4 : … ».

**Interdits :** aucun accès au stockage hors `props.library` ; aucune `draggable` ; pas de renommage ni de déplacement (D10).

**Critère « terminé » :** tests verts, `tsc --noEmit` sans erreur dans ces fichiers, rapport avec `Réutilisation : appelé library.ResourceLibrary, resource-drag.startResourceDrag`.

- [ ] **Étape 1 : tests qui échouent** — `LibraryPanel.test.tsx` :

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, waitFor } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createResourceLibrary } from "../app/library";
import { createMemoryLibraryFiles } from "../platform/library-files";
import { LibraryPanel, type LibraryPanelProps } from "./LibraryPanel";

afterEach(cleanup);
URL.createObjectURL ??= () => "blob:x";
URL.revokeObjectURL ??= () => undefined;

const enc = (s: string) => new TextEncoder().encode(s);
function setup(over: Partial<LibraryPanelProps> = {}) {
  const library = createResourceLibrary({
    files: [createMemoryLibraryFiles("mine")],
    zip: { unzip: async () => [], zip: async () => enc("PK") },
    now: () => "n",
    appVersion: "c4",
  });
  const placed: [string, unknown][] = [];
  const props: LibraryPanelProps = {
    library,
    shared: { desktop: false, chosen: () => false, choose: async () => false },
    packs: { pick: vi.fn(async () => null), save: vi.fn(async () => true) },
    capture: vi.fn(async (what) => ({ bytes: enc(what), kind: what === "grid" ? ("grid" as const) : ("fragment" as const), thumbnail: new Blob([enc("png")], { type: "image/png" }) })),
    place: vi.fn(async (e, at) => void placed.push([e.name, at])),
    confirm: vi.fn(async () => true),
    say: vi.fn(async () => undefined),
    close: vi.fn(),
    ...over,
  };
  const r = render(() => <LibraryPanel {...props} />);
  const q = <T extends Element>(sel: string): T => {
    const el = r.container.querySelector<T>(sel);
    if (el === null) throw new Error(`absent : ${sel}`);
    return el;
  };
  return { ...r, props, library, placed, q };
}
async function addSelection(s: ReturnType<typeof setup>, name: string, keywords = "") {
  fireEvent.click(s.q('[data-lib="add-selection"]'));
  fireEvent.input(s.q<HTMLInputElement>('[data-lib="name"]'), { target: { value: name } });
  fireEvent.input(s.q<HTMLInputElement>('[data-lib="keywords"]'), { target: { value: keywords } });
  fireEvent.click(s.q('[data-lib="submit"]'));
  await waitFor(() => s.q(`.rb-resource[data-resource="${name}.rbitem"]`));
}

describe("C4 : panneau Bibliothèque", () => {
  it("C4 : deux sections ; web : dossier partagé application de bureau seulement", () => {
    const s = setup();
    expect(s.q('section[data-root="mine"]').textContent).toContain("Mes ressources");
    expect(s.q('section[data-root="shared"]').textContent).toContain("Dossier partagé : application de bureau seulement");
  });

  it("C4 : coque sans dossier choisi : « Choisir le dossier partagé… »", () => {
    const choose = vi.fn(async () => true);
    const s = setup({ shared: { desktop: true, chosen: () => false, choose } });
    fireEvent.click(s.q('[data-lib="choose-shared"]'));
    expect(choose).toHaveBeenCalled();
  });

  it("C4 : Ajouter la sélection : capture, carte avec vignette", async () => {
    const s = setup();
    await addSelection(s, "Moitié", "fraction, moitié");
    expect(s.props.capture).toHaveBeenCalledWith("selection");
    expect(s.q('.rb-resource[data-resource="Moitié.rbitem"] img.rb-thumb')).toBeTruthy();
    expect(s.library.search("frac").map((e) => e.keywords)).toEqual([["fraction", "moitié"]]);
  });

  it("C4 : Ajouter la grille de la page : capture « grid »", async () => {
    const s = setup();
    fireEvent.click(s.q('[data-lib="add-grid"]'));
    fireEvent.input(s.q<HTMLInputElement>('[data-lib="name"]'), { target: { value: "Seyès" } });
    fireEvent.click(s.q('[data-lib="submit"]'));
    await waitFor(() => s.q('.rb-resource[data-resource="Seyès.rbitem"]'));
    expect(s.props.capture).toHaveBeenCalledWith("grid");
  });

  it("C4 : recherche « frac » : seule la ressource au mot-clé reste", async () => {
    const s = setup();
    await addSelection(s, "Moitié", "fraction");
    await addSelection(s, "Carré");
    fireEvent.input(s.q<HTMLInputElement>('[data-lib="search"]'), { target: { value: "frac" } });
    await waitFor(() => expect(s.q('[data-lib="results"]').querySelectorAll(".rb-resource")).toHaveLength(1));
    expect(s.q('[data-lib="results"] .rb-resource').getAttribute("data-resource")).toBe("Moitié.rbitem");
  });

  it("C4 : double-clic et Entrée posent au centre (at = null)", async () => {
    const s = setup();
    await addSelection(s, "Moitié");
    const card = s.q<HTMLElement>('.rb-resource[data-resource="Moitié.rbitem"]');
    fireEvent.dblClick(card);
    fireEvent.keyDown(card, { key: "Enter" });
    await waitFor(() => expect(s.placed).toEqual([["Moitié", null], ["Moitié", null]]));
  });

  it("C4 : Nouveau dossier, puis ouvert ; ajout dans le dossier ouvert", async () => {
    const s = setup();
    fireEvent.click(s.q('[data-lib="new-folder"]'));
    fireEvent.input(s.q<HTMLInputElement>('[data-lib="folder-name"]'), { target: { value: "Fractions" } });
    fireEvent.click(s.q('[data-lib="create-folder"]'));
    await waitFor(() => s.q('button[data-folder="Fractions"]'));
    fireEvent.click(s.q('button[data-folder="Fractions"]'));
    await addSelection(s, "Moitié").catch(() => undefined);
    await waitFor(() => s.q('.rb-resource[data-resource="Fractions/Moitié.rbitem"]'));
  });

  it("C4 : Vider après confirmation ; refus : rien", async () => {
    const s = setup();
    await addSelection(s, "Moitié");
    (s.props.confirm as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
    fireEvent.click(s.q('[data-lib="clear"]'));
    await Promise.resolve();
    expect(s.library.folder("mine", "").items).toHaveLength(1);
    fireEvent.click(s.q('[data-lib="clear"]'));
    await waitFor(() => expect(s.library.folder("mine", "").items).toHaveLength(0));
    expect(s.props.confirm).toHaveBeenLastCalledWith("Vider « Mes ressources » ? Toutes ses ressources seront supprimées.");
  });

  it("C4 : Exporter (.rbpack) enregistre le paquet du dossier ouvert", async () => {
    const s = setup();
    await addSelection(s, "Moitié");
    fireEvent.click(s.q('[data-lib="export"]'));
    await waitFor(() => expect(s.props.packs.save).toHaveBeenCalledWith("Mes ressources.rbpack", enc("PK")));
  });
});
```

Note : dans le test « Nouveau dossier », `addSelection` attend la carte à la racine ; il est rattrapé (`.catch`) et l'attente porte sur le chemin dans le dossier.

- [ ] **Étape 2 : ils échouent** — commande bornée : import introuvable.

- [ ] **Étape 3 : `LibraryPanel.tsx`**

```tsx
/**
 * Panneau « Bibliothèque » (C4) : « Mes ressources » et « Ressources partagées » en dossiers (D10), recherche sur nom,
 * mots-clés et description (D11), cartes avec vignette ou pastille (D12, H2-4), ajout de la sélection ou de la grille
 * de la page (D1, D2), glisser vers la scène par Pointer Events, double-clic ou Entrée = centre de la vue (D13), export
 * et import de paquets (D17 à D19). Index relu à l'ouverture et au retour du focus (H2-6).
 */
import { createResource, createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { ROOT_LABELS, type CapturedResource, type ResourceEntry, type ResourceLibrary } from "../app/library";
import type { Point } from "../platform/files";
import type { LibraryRoot } from "../platform/library-files";
import type { TypedFiles } from "../platform/typed-files";
import { startResourceDrag } from "./resource-drag";

export interface SharedFolder {
  readonly desktop: boolean;
  chosen(): boolean;
  choose(): Promise<boolean>;
}
export interface LibraryPanelProps {
  readonly library: ResourceLibrary;
  readonly shared: SharedFolder;
  readonly packs: TypedFiles;
  capture(what: "selection" | "grid"): Promise<CapturedResource | null>;
  place(entry: ResourceEntry, at: Point | null): Promise<void>;
  confirm(message: string): Promise<boolean>;
  say(message: string): Promise<void>;
  close(): void;
}

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));
const keywordsOf = (s: string): string[] => s.split(",").map((k) => k.trim()).filter((k) => k !== "");

function Card(props: { entry: ResourceEntry; library: ResourceLibrary; version: () => number; place: LibraryPanelProps["place"]; remove(entry: ResourceEntry): void; showFolder?: boolean }): JSX.Element {
  const [url] = createResource(
    () => ({ e: props.entry, v: props.version() }),
    async ({ e }) => {
      const b = await props.library.thumbnail(e).catch(() => null);
      return b === null ? null : URL.createObjectURL(b);
    },
  );
  onCleanup(() => {
    const u = url();
    if (u) URL.revokeObjectURL(u);
  });
  return (
    <div
      class="rb-resource"
      tabindex="0"
      role="button"
      data-resource={props.entry.path}
      data-root={props.entry.root}
      title={props.entry.description || props.entry.name}
      onPointerDown={(e) => startResourceDrag(e, (at) => void props.place(props.entry, at), { label: props.entry.name, thumbnail: url() ?? null })}
      onDblClick={() => void props.place(props.entry, null)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void props.place(props.entry, null);
        }
      }}
    >
      <Show when={url()} fallback={<span class="rb-badge">{props.entry.kind === "grid" ? "Grille" : "Objets"}</span>}>
        {(u) => <img class="rb-thumb" src={u()} alt="" draggable={false} />}
      </Show>
      <span class="rb-resource-name">{props.entry.name}</span>
      <Show when={props.showFolder && props.entry.folder !== ""}>
        <span class="rb-resource-folder">{props.entry.folder}</span>
      </Show>
      <button type="button" data-lib="remove" aria-label={`Supprimer ${props.entry.name}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => props.remove(props.entry)}>
        ×
      </button>
    </div>
  );
}

export function LibraryPanel(props: LibraryPanelProps): JSX.Element {
  const [version, setVersion] = createSignal(0);
  const bump = (): void => void setVersion((v) => v + 1);
  const [query, setQuery] = createSignal("");
  const [open, setOpen] = createSignal<{ root: LibraryRoot; path: string }>({ root: "mine", path: "" });
  const [form, setForm] = createSignal<null | "selection" | "grid">(null);
  const [draft, setDraft] = createSignal({ name: "", keywords: "", description: "" });
  const [folderForm, setFolderForm] = createSignal(false);
  const [folderName, setFolderName] = createSignal("");

  const act = async (f: () => Promise<void>): Promise<void> => {
    try {
      await f();
    } catch (e) {
      await props.say(`Bibliothèque : ${messageOf(e)}`);
    }
    bump();
  };
  const refresh = (): void => void act(() => props.library.refresh());
  onMount(() => {
    refresh();
    window.addEventListener("focus", refresh);
  });
  onCleanup(() => window.removeEventListener("focus", refresh));

  const hasRoot = (root: LibraryRoot): boolean => (version(), props.library.roots().includes(root));
  const folderOf = (root: LibraryRoot) => {
    version();
    const o = open();
    return props.library.folder(root, o.root === root ? o.path : "");
  };
  const results = () => (version(), props.library.search(query()));

  const submit = (): void =>
    void act(async () => {
      const what = form();
      if (what === null) return;
      const captured = await props.capture(what);
      if (captured === null) return;
      const d = draft();
      const o = open();
      await props.library.add(o.root, o.path, {
        ...captured,
        name: d.name.trim() || (what === "grid" ? "Grille" : "Sélection"),
        keywords: keywordsOf(d.keywords),
        description: d.description.trim(),
      });
      setForm(null);
      setDraft({ name: "", keywords: "", description: "" });
    });
  const remove = (entry: ResourceEntry): void =>
    void act(async () => {
      if (await props.confirm(`Supprimer « ${entry.name} » ?`)) await props.library.remove(entry.root, entry.path);
    });
  const removeFolder = (root: LibraryRoot, path: string): void =>
    void act(async () => {
      if (!(await props.confirm(`Supprimer le dossier « ${path} » et son contenu ?`))) return;
      await props.library.remove(root, path);
      setOpen({ root, path: path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "" });
    });
  const clear = (): void =>
    void act(async () => {
      if (!(await props.confirm(`Vider « ${ROOT_LABELS.mine} » ? Toutes ses ressources seront supprimées.`))) return;
      await props.library.remove("mine", "");
      setOpen({ root: "mine", path: "" });
    });
  const exportPack = (): void =>
    void act(async () => {
      const o = open();
      const pack = await props.library.exportPack(o.root, o.path);
      await props.packs.save(pack.name, pack.bytes);
    });
  const importPack = (): void =>
    void act(async () => {
      const f = await props.packs.pick();
      if (f === null) return;
      const r = await props.library.importPack(f.bytes, f.name);
      setOpen({ root: "mine", path: r.folder });
      await props.say(`${f.name} : ${r.count} ressource${r.count > 1 ? "s" : ""} importée${r.count > 1 ? "s" : ""} dans « ${r.folder} »`);
    });
  const createFolder = (): void =>
    void act(async () => {
      const o = open();
      const path = await props.library.mkdir(o.root, o.path, folderName());
      setFolderForm(false);
      setFolderName("");
      setOpen({ root: o.root, path });
    });

  const section = (root: LibraryRoot): JSX.Element => (
    <section data-root={root} class="rb-library-root">
      <h3>{ROOT_LABELS[root]}</h3>
      <Show
        when={hasRoot(root)}
        fallback={
          <Show when={props.shared.desktop} fallback={<p class="rb-library-note">Dossier partagé : application de bureau seulement</p>}>
            <button type="button" data-lib="choose-shared" onClick={() => void act(async () => void (await props.shared.choose()) && (await props.library.refresh()))}>
              Choisir le dossier partagé…
            </button>
          </Show>
        }
      >
        <Show when={open().root === root && open().path !== ""}>
          <div class="rb-library-path">
            <button type="button" data-lib="up" onClick={() => setOpen({ root, path: open().path.includes("/") ? open().path.slice(0, open().path.lastIndexOf("/")) : "" })}>
              ← {open().path}
            </button>
            <button type="button" aria-label={`Supprimer le dossier ${open().path}`} onClick={() => removeFolder(root, open().path)}>
              Supprimer
            </button>
          </div>
        </Show>
        <div class="rb-library-folders">
          <For each={folderOf(root).folders}>
            {(f) => (
              <button type="button" data-folder={f} onClick={() => setOpen({ root, path: f })}>
                {f.slice(f.lastIndexOf("/") + 1)}
              </button>
            )}
          </For>
        </div>
        <div class="rb-library-cards">
          <For each={folderOf(root).items}>{(e) => <Card entry={e} library={props.library} version={version} place={props.place} remove={remove} />}</For>
        </div>
      </Show>
    </section>
  );

  return (
    <div id="bibliotheque" class="rb-library" role="dialog" aria-label="Bibliothèque">
      <header class="rb-library-head">
        <h2>Bibliothèque</h2>
        <button type="button" data-lib="close" aria-label="Fermer" onClick={() => props.close()}>
          ×
        </button>
      </header>
      <input type="search" data-lib="search" aria-label="Rechercher dans la bibliothèque" value={query()} onInput={(e) => setQuery(e.currentTarget.value)} />
      <div class="rb-library-actions">
        <button type="button" data-lib="add-selection" onClick={() => setForm("selection")}>Ajouter la sélection</button>
        <button type="button" data-lib="add-grid" onClick={() => setForm("grid")}>Ajouter la grille de la page</button>
        <button type="button" data-lib="new-folder" onClick={() => setFolderForm(true)}>Nouveau dossier</button>
        <button type="button" data-lib="export" onClick={exportPack}>Exporter (.rbpack)</button>
        <button type="button" data-lib="import" onClick={importPack}>Importer un paquet…</button>
        <button type="button" data-lib="clear" onClick={clear}>Vider</button>
      </div>
      <Show when={form() !== null}>
        <div class="rb-library-form">
          <label>Nom <input data-lib="name" value={draft().name} onInput={(e) => setDraft({ ...draft(), name: e.currentTarget.value })} /></label>
          <label>Mots-clés (séparés par des virgules) <input data-lib="keywords" value={draft().keywords} onInput={(e) => setDraft({ ...draft(), keywords: e.currentTarget.value })} /></label>
          <label>Description <input data-lib="description" value={draft().description} onInput={(e) => setDraft({ ...draft(), description: e.currentTarget.value })} /></label>
          <button type="button" data-lib="submit" onClick={submit}>Ajouter</button>
          <button type="button" data-lib="cancel" onClick={() => setForm(null)}>Annuler</button>
        </div>
      </Show>
      <Show when={folderForm()}>
        <div class="rb-library-form">
          <label>Nom du dossier <input data-lib="folder-name" value={folderName()} onInput={(e) => setFolderName(e.currentTarget.value)} /></label>
          <button type="button" data-lib="create-folder" onClick={createFolder}>Créer</button>
          <button type="button" onClick={() => setFolderForm(false)}>Annuler</button>
        </div>
      </Show>
      <Show when={query().trim() !== ""} fallback={<>{section("mine")}{section("shared")}</>}>
        <div data-lib="results" class="rb-library-cards">
          <For each={results()}>{(e) => <Card entry={e} library={props.library} version={version} place={props.place} remove={remove} showFolder />}</For>
        </div>
      </Show>
    </div>
  );
}
```

- [ ] **Étape 4 : tests verts** — commande bornée.

- [ ] **Étape 5 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T13
git add apps/web/src/ui/LibraryPanel.tsx
git add apps/web/src/ui/LibraryPanel.test.tsx
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(web): library panel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T14 — Branchement : `Workspace`, `main.ts`, `App.tsx`, `rb.css`
<a id="tache-t14"></a>

**Objectif :** la bibliothèque marche dans l'application : la carte glissée ou double-cliquée se pose dans l'onglet
actif (une étape), la sélection et la grille de la page s'ajoutent avec leur vignette, le `.rbitem` de grille déposé
remplace la grille, le `.rbpack` déposé ou passé au lancement s'importe ; stockage IndexedDB sur le web, dossiers réels
dans la coque.

**Fichiers :**
- Modifier : `apps/web/src/app/workspace.ts` (`WorkspaceDeps`, `Workspace`, `:267` cible `insertFragment`, `createImporter`)
- Modifier : `apps/web/src/app/workspace.test.ts`
- Modifier : `apps/web/src/main.ts` (création des racines, de la bibliothèque, de `RBPACK_TYPE`, passage à `App`)
- Modifier : `apps/web/src/ui/App.tsx` (`AppProps.library?`, popover `library`)
- Modifier : `apps/web/src/ui/App.test.tsx` (un test C4)
- Modifier : `apps/web/src/ui/rb.css:28-30` (popover calé à droite, cartes, fantôme)

**Interfaces :**
- Consomme : T4 `FragmentOps.insertResource`, `encodeGrid`, `encodeSelection` ; T5 `renderThumbnail(doc, assets, kind, deps)`, `ThumbDeps` ; T6 `createIdbLibraryFiles`, `createMemoryLibraryFiles`, `createTauriLibraryFiles`, `TauriDirFs`, `loadTauriPorts().dirFs / pickFolder / documentDir` ; T7 `createZipReader(spawn, undefined, "pack")`, `createZipWriter(spawn)` ; T8 `createResourceLibrary`, `ResourceEntry`, `CapturedResource` ; T9 `RBPACK_TYPE`, `ImportDeps.importPack` ; T11 `Panel` `"library"` ; T13 `LibraryPanel`, `LibraryPanelProps`, `SharedFolder`.
- Produit (`Workspace`) :
  - `insertResource(bytes: Uint8Array, name: string, at: Point | null): Promise<InsertOutcome>` (onglet actif)
  - `captureResource(what: "selection" | "grid"): Promise<CapturedResource | null>`
  - `ask(message: string): Promise<boolean>` ; `say(message: string): Promise<void>`
- Produit (`WorkspaceDeps`) : `thumbnail?: ThumbDeps` ; `importPack?(name: string, bytes: Uint8Array): Promise<boolean>`.
- Produit (`AppProps`) : `library?: { readonly library: ResourceLibrary; readonly shared: SharedFolder; readonly packs: TypedFiles }`.
- Clé de réglage : `roomboard.bibliotheque.partage` (chemin du dossier partagé, coque).
- Réutilise : `apps/web/src/app/workspace.ts:185` — `shell.confirm(message)`, par `ask` (confirmation de suppression).
- Réutilise : `apps/web/src/profile-store.ts:4,149` — `KeyValue`, `browserKeyValue`, pour `roomboard.bibliotheque.partage`.
- Réutilise : `apps/web/src/platform/typed-files.ts:40,52` — `createWebTypedFiles` / `createTauriTypedFiles` avec `RBPACK_TYPE`.
- Réutilise : `apps/web/src/platform/zip-read.ts:27`, `zip-worker.ts:19` — `createZipReader(spawnZipWorker, undefined, "pack")` et `createZipWriter(spawnZipWorker)` sur le `spawnZipWorker` existant de `main.ts:145`.
- Réutilise : `apps/web/src/app/pdf-overlay.ts:46,103`, `engine/render/canvas2d.ts:426` — `browserExportCanvas`, `new Canvas2DRenderer(ctx, null, doc, exportPainterOptions(images))` (même peintre que `pngOverlay`, `main.ts:84-92`), passés en `ThumbDeps`.
- Réutilise : `apps/web/src/app/toolbar-host.ts:32,61`, `ui/App.tsx:55` — `toggle("library")` (posé par T11), popover ici.
- Réutilise : `apps/web/src/platform/import.ts:149,247` — `ImportHandler` `rbpackHandler`, activé par `importPack` transmis à `createImporter`.

**Test et commande bornée :** `cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T14 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app/workspace.test.ts src/ui/App.test.tsx --reporter=verbose 2>&1 | grep -E "C4|Tests " | tail -12` : ≥ 3 tests « C4 », `Tests` sans `failed`. Puis `nice -n 10 pnpm --filter @roomboard/web test 2>&1 | tail -6` : `Tests` sans `failed` ; `nice -n 10 pnpm --filter @roomboard/web build 2>&1 | tail -3` : aucune ligne `error`.

**Preuve visuelle :** portée par T15 (essai Playwright, lectures `data-elements`, `data-resource`, puis capture).

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- GC3 — Aucun build Tauri : la branche coque de `main.ts` est prouvée par les tests de T6 et T10 et par `tsc`.
- GC4 — La scène ne passe jamais sous 640 px : `.rb-popover[data-panel="library"]` recouvre la scène, calé à droite comme le panneau d'image, aucune colonne de `layout.ts` (D15).
- GC5 — `nice -n 10` ; test sur délai rejoué une fois.
- GC6 — Aucune dépendance neuve.
- GC7 — Commits fichier par fichier, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC8 — Un `.rbitem` d'objets d'avant C4 déposé s'insère comme avant (même rang de cascade).
- GC10 — Tests neufs nommés « C4 : … ».

**Interdits :** `layout.ts` intouché ; aucune commande Tauri neuve ; jamais le vrai `Documents` dans un test ; le
presse-papiers (`clipboard.ts`, `paste.ts`) intouché.

**Critère « terminé » :** tests verts, suite web verte, build web propre, rapport avec une ligne `Réutilisation : …` par ligne `Réutilise :` ci-dessus.

- [ ] **Étape 1 : tests qui échouent** — `workspace.test.ts` (reprendre la fabrique d'espace de travail du fichier, `grep -n "function setup\|createWorkspace(" apps/web/src/app/workspace.test.ts | head -3`) :

```ts
describe("C4 : ressources dans l'espace de travail", () => {
  it("C4 : captureResource(« grid ») sans grille : null, avis dit", async () => {
    const { ws, said } = setup();
    expect(await ws.captureResource("grid")).toBeNull();
    expect(said).toContain(NO_GRID_MESSAGE);
  });

  it("C4 : captureResource(« grid ») puis insertResource sur une page sans grille : la grille est posée", async () => {
    const { ws } = setup();
    const tab = ws.active();
    const page = tab.board.engine.state().page;
    tab.board.engine.run({ type: "SetGrid", page, grid: { visible: true, snap: false, above: false, levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#000000", line: "solid", lineWidth: 1, snap: false, visible: true }] } });
    const captured = (await ws.captureResource("grid"))!;
    expect(captured.kind).toBe("grid");
    tab.board.engine.run({ type: "SetGrid", page, grid: null });
    expect(await ws.insertResource(captured.bytes, "Seyès", null)).toBe("inserted");
    expect(tab.board.doc.page(page)?.grid?.levels[0]?.kind).toBe("squares");
  });

  it("C4 : un .rbitem de grille déposé remplace la grille (cible insertFragment routée)", async () => {
    const { ws } = setup();
    const tab = ws.active();
    const page = tab.board.engine.state().page;
    tab.board.engine.run({ type: "SetGrid", page, grid: { visible: true, snap: false, above: false, levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#000000", line: "solid", lineWidth: 1, snap: false, visible: true }] } });
    const { bytes } = (await ws.captureResource("grid"))!;
    tab.board.engine.run({ type: "SetGrid", page, grid: null });
    await ws.importFiles([droppedOf("Seyès.rbitem", bytes)], null);
    expect(tab.board.doc.page(page)?.grid).not.toBeNull();
  });
});
```

(`setup()`, `droppedOf()` : fabriques locales du fichier, sous leur nom réel ; `said` : les avis collectés par le faux `shell.notify`.)

- [ ] **Étape 2 : ils échouent** — commande bornée : `captureResource is not a function`.

- [ ] **Étape 3 : `workspace.ts`** — `WorkspaceDeps` :

```ts
  /** C4 (D12) : vignette des ressources ajoutées ; absent : ressource sans vignette (pastille du type). */
  thumbnail?: ThumbDeps;
  /** C4 (U25, D19) : `.rbpack` déposé ou passé au lancement, importé dans la bibliothèque ; transmis à l'importeur. */
  importPack?(name: string, bytes: Uint8Array): Promise<boolean>;
```

`Workspace` :

```ts
  /** C4 (D13, D14) : ressource posée dans l'onglet actif ; `at` client, null = centre de la vue. */
  insertResource(bytes: Uint8Array, name: string, at: Point | null): Promise<InsertOutcome>;
  /** C4 (D1, D2, D12) : sélection ou grille de la page de l'onglet actif, en `.rbitem`, avec sa vignette ; null : avis dit. */
  captureResource(what: "selection" | "grid"): Promise<CapturedResource | null>;
  /** C4 (D10) : question de confirmation (suppression, Vider) ; faux si la boîte échoue. */
  ask(message: string): Promise<boolean>;
  say(message: string): Promise<void>;
```

Cible des dépôts (`:267`) :

```ts
    insertFragment: async (rbitem, at, index, name) => (await fragments.insertResource(t, rbitem, baseName(name), at, index)) === "inserted",
```

`createImporter({ …, ...(deps.importPack ? { importPack: deps.importPack.bind(deps) } : {}) })` (à l'endroit où l'importeur reçoit ses dépendances).
Dans l'objet `ws` rendu :

```ts
    insertResource: (bytes, name, at) => fragments.insertResource(ws.active(), bytes, name, at),
    async captureResource(what) {
      const tab = ws.active();
      const bytes = what === "grid" ? await fragments.encodeGrid(tab) : await fragments.encodeSelection(tab, "export");
      if (bytes === null) return null;
      const kind = what === "grid" ? "grid" : "fragment";
      let thumbnail: Blob | null = null;
      const thumbDeps = deps.thumbnail;
      if (thumbDeps !== undefined) {
        const read = await io.read("vignette", bytes, kind);
        if (read !== null) {
          try {
            thumbnail = await renderThumbnail(read.doc, read.assets, kind, thumbDeps);
          } catch (e) {
            console.warn(`RoomBoard : vignette non rendue (${messageOf(e)})`);
          } finally {
            read.doc.free();
          }
        }
      }
      return { bytes, kind, thumbnail };
    },
    ask,
    say,
```

(Si une sélection vide fait rendre `null` à `encodeSelection` sans avis, ajouter avant le `return null` de la branche sélection : `await say("aucune sélection, rien n'est ajouté");` — message ajouté au rapport.)

- [ ] **Étape 4 : `main.ts`** — après `itemFiles` :

```ts
  // Bibliothèque (C4) : « Mes ressources » en IndexedDB sur le web, `Documents/RoomBoard/Ressources` dans la coque ;
  // « Ressources partagées » : coque seulement, dossier choisi par la boîte native (accès pour la session, H1-5).
  const SHARED_KEY = "roomboard.bibliotheque.partage";
  const mine =
    ports !== null
      ? createTauriLibraryFiles({ ...ports.fs, ...ports.dirFs }, `${await ports.documentDir()}/RoomBoard/Ressources`, "mine")
      : typeof window.indexedDB === "undefined"
        ? createMemoryLibraryFiles("mine")
        : createIdbLibraryFiles(window.indexedDB, "mine");
  const library = createResourceLibrary({
    files: [mine],
    zip: { unzip: createZipReader(spawnZipWorker, undefined, "pack"), zip: createZipWriter(spawnZipWorker) },
    now: () => new Date().toISOString(),
    appVersion: APP_VERSION,
  });
  let sharedChosen = false;
  const shared: SharedFolder = {
    desktop: ports !== null,
    chosen: () => sharedChosen,
    async choose() {
      if (ports === null) return false;
      const path = await ports.pickFolder(settingsKv.get(SHARED_KEY));
      if (path === null) return false;
      settingsKv.set(SHARED_KEY, path);
      library.setRoot(createTauriLibraryFiles({ ...ports.fs, ...ports.dirFs }, path, "shared"));
      sharedChosen = true;
      return true;
    },
  };
  const packFiles =
    ports === null ? createWebTypedFiles(browserFallbackDeps(document, URL), RBPACK_TYPE) : createTauriTypedFiles(ports.dialog, ports.fs, RBPACK_TYPE);
```

(`spawnZipWorker` est défini à `main.ts:145` : déplacer cette déclaration avant ce bloc si elle vient après ; `settingsKv` : le `KeyValue` des réglages déjà construit par `main.ts` — `grep -n "browserKeyValue" apps/web/src/main.ts` — sous son nom réel ; `APP_VERSION` : la constante déjà importée par `main.ts`, sinon celle de `workspace.ts`.)
`createWorkspace({ …, thumbnail: { canvas: browserExportCanvas, decode: decodeBitmap, painter: (ctx, doc, images) => new Canvas2DRenderer(ctx, null, doc, exportPainterOptions(images)) }, importPack: async (name, bytes) => { try { const r = await library.importPack(bytes, name); await shell.notify(`${name} : ${r.count} ressource${r.count > 1 ? "s" : ""} importée${r.count > 1 ? "s" : ""} dans « ${r.folder} »`); return true; } catch (e) { await shell.notify(`Import impossible (${name}) : ${messageOf(e)}`); return false; } } })` (nom réel du port de boîtes : celui que `createWorkspace` reçoit déjà) ; et passer `library: { library, shared, packs: packFiles }` aux props d'`App`.

- [ ] **Étape 5 : `App.tsx`** — `AppProps` :

```ts
  /** C4 : bibliothèque ; absente (tests anciens) : le bouton n'ouvre rien. */
  readonly library?: { readonly library: ResourceLibrary; readonly shared: SharedFolder; readonly packs: TypedFiles };
```

Après le popover `image` :

```tsx
      <Show when={panel() === "library" ? props.library : undefined}>
        {(lib) => (
          <div class="rb-popover" data-panel="library">
            <LibraryPanel
              library={lib().library}
              shared={lib().shared}
              packs={lib().packs}
              capture={(what) => ws.captureResource(what)}
              place={async (entry, at) => {
                try {
                  await ws.insertResource(await lib().library.read(entry), entry.name, at);
                } catch (e) {
                  await ws.say(`${entry.name} : ${e instanceof Error ? e.message : String(e)}`);
                }
              }}
              confirm={(m) => ws.ask(m)}
              say={(m) => ws.say(m)}
              close={() => setPanel(null)}
            />
          </div>
        )}
      </Show>
```

Test `App.test.tsx` (ajout) :

```tsx
  it("C4 : le bouton Bibliothèque ouvre le panneau, calé en popover", async () => {
    const r = renderApp({ library: { library: createResourceLibrary({ files: [createMemoryLibraryFiles("mine")], zip: { unzip: async () => [], zip: async () => new Uint8Array() }, now: () => "n", appVersion: "t" }), shared: { desktop: false, chosen: () => false, choose: async () => false }, packs: { pick: async () => null, save: async () => true } } });
    fireEvent.click(r.container.querySelector('button[data-item="library"]')!);
    await waitFor(() => expect(r.container.querySelector('.rb-popover[data-panel="library"] #bibliotheque')).not.toBeNull());
  });
```

(`renderApp(over)` : la fabrique locale de `App.test.tsx` sous son nom réel, étendue pour accepter des props en plus.)

- [ ] **Étape 6 : `rb.css`** — après les règles `.rb-popover[data-panel="image"]` (`:28-30`), sur le même modèle :

```css
.rb-popover[data-panel="library"] {
  /* C4 (D15) : recouvre la scène, calé à droite comme le panneau d'image ; aucune colonne de la grille CSS. */
  justify-self: end;
  align-self: stretch;
  width: min(360px, 40vw);
  max-height: 100%;
  overflow: auto;
}
.rb-library { display: flex; flex-direction: column; gap: 8px; padding: 8px; }
.rb-library-head { display: flex; justify-content: space-between; align-items: center; }
.rb-library-actions, .rb-library-folders { display: flex; flex-wrap: wrap; gap: 4px; }
.rb-library-form { display: grid; gap: 4px; }
.rb-library-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 6px; }
.rb-resource { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 4px; border: 1px solid #d0d5dd; border-radius: 6px; background: #fff; cursor: grab; touch-action: none; user-select: none; position: relative; }
.rb-resource:focus-visible { outline: 2px solid #2563eb; }
.rb-thumb { width: 88px; height: 88px; object-fit: contain; pointer-events: none; }
.rb-badge { width: 88px; height: 88px; display: grid; place-items: center; background: #eef2f7; color: #475467; border-radius: 4px; }
.rb-resource-name { font-size: 12px; text-align: center; overflow-wrap: anywhere; }
.rb-resource-folder { font-size: 11px; color: #667085; }
.rb-resource [data-lib="remove"] { position: absolute; top: 2px; right: 2px; }
.rb-drag-ghost { position: fixed; left: 0; top: 0; z-index: 1000; pointer-events: none; display: flex; align-items: center; gap: 4px; padding: 4px 8px; background: #fff; border: 1px solid #98a2b3; border-radius: 6px; opacity: 0.9; }
.rb-drag-ghost img { width: 40px; height: 40px; object-fit: contain; }
```

(Reprendre les propriétés de placement exactes de `.rb-popover[data-panel="image"]` — `sed -n 20,40p apps/web/src/ui/rb.css` — à la place des deux premières lignes si elles diffèrent : même placement, largeur seule changée.)

- [ ] **Étape 7 : tests verts** — les trois commandes de la section.

- [ ] **Étape 8 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T14
git add apps/web/src/app/workspace.ts
git add apps/web/src/app/workspace.test.ts
git add apps/web/src/main.ts
git add apps/web/src/ui/App.tsx
git add apps/web/src/ui/App.test.tsx
git add apps/web/src/ui/rb.css
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(web): wire the resource library into the workspace and app

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```


---

### Tâche T15 — Essai navigateur C4 branché dans `verifier.sh --e2e` ; capture ; tailles finales
<a id="tache-t15"></a>

**Objectif :** le geste du brief joué de bout en bout dans Chromium sur l'application construite : grouper trois
objets, les ajouter à « Mes ressources » avec le mot-clé « fraction », chercher « frac » et voir la ressource avec sa
vignette, la glisser sur une autre page et voir les objets insérés, annuler puis refaire, enregistrer une grille en
ressource et la déposer sur une autre page, exporter le dossier en `.rbpack`, vider la bibliothèque, réimporter le
`.rbpack` et retrouver les mêmes ressources, recharger la page et retrouver la bibliothèque ; scène ≥ 640 px panneau
ouvert ; capture ; deux tailles Wasm écrites.

**Fichiers :**
- Créer : `scripts/essais/c4-bibliotheque-navigateur.mjs`
- Modifier : `scripts/verifier.sh:116-117` (après C8), `scripts/tests/verifier-e2e.test.sh:13` (liste)
- Créer : `docs/essais/c4-bibliotheque.png` (par `--captures`)
- Modifier : `docs/essais/taille-wasm.md`

**Interfaces :**
- Consomme : `scripts/essais/commun.mjs` (`DIST`, `Echec`, `ROOT`, `VIEWPORT`, `coqueCsp`, `frames`, `gitSha`, `item`, `loadPlaywright`, `serve`, `stageMouse`) ; marques de `#stage` : `data-elements`, `data-selection`, `data-grouped` ; sélecteurs de T13 ; panneau de grille `#grille [data-grille="kind" | "apply" | "cancel"]` (`c9-grille-navigateur.mjs:15-16`, `GridPanel.tsx:125`) ; actions `item("rect")`, `item("pen")`, `item("select")`, `item("page-add")`, `item("undo")`, `item("redo")`, `item("grid")`, `item("library")`.
- Produit : `C4 bibliothèque : OK` dans la sortie de `verifier.sh --e2e`.

**Test et commande bornée :**
1. Build : `cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T15 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && nice -n 10 bash scripts/verifier.sh 2>&1 | grep -E "module Wasm|module formats|verifier.sh : OK|FAILED|error" | tail -6` : deux tailles, « verifier.sh : OK ».
2. Essai seul, avec capture : `nice -n 10 node scripts/essais/c4-bibliotheque-navigateur.mjs --captures 2>&1 | tail -30` : chaque ligne `ok …`, puis `capture : …/docs/essais/c4-bibliotheque.png`, puis `C4 bibliothèque : OK`.
3. Suite complète : `nice -n 10 bash scripts/verifier.sh --e2e 2>&1 | grep -E "C4 bibliothèque|C8 pot zones|C3|module Wasm|module formats|e2e OK|verifier.sh : OK|ÉCHEC" | tail -12` : « C4 bibliothèque : OK », « verifier.sh : e2e OK », « verifier.sh : OK », aucune ligne `ÉCHEC` (à garder verts : `c3-groupes-navigateur.mjs`, `c9-grille-navigateur.mjs`, `c5-image-navigateur.mjs` scène ≥ 640 px, `c10a`, `c10b`, `c12`).

**Preuve visuelle :** lectures d'abord, dans l'essai : `#stage[data-elements="3"]` après le lâcher, `"0"` après Annuler, `"3"` après Rétablir ; `[data-lib="results"] .rb-resource` = 1 avec `data-resource="Fractions/Moitié.rbitem"` après « frac » ; `img.rb-thumb` `naturalWidth > 0` ; `#grille [data-grille="kind"]` = `"seyes"` puis `"none"` ; `#stage` ≥ 640 × 640 px panneau ouvert. Puis la capture `docs/essais/c4-bibliotheque.png`, à décrire au rapport : panneau « Bibliothèque » ouvert à droite, champ de recherche « frac », une carte « Moitié » avec sa vignette, et sur la page les trois objets posés au point de lâcher.

**Contraintes (recopiées) :**
- GC1 — Aucun test désactivé, sauté, ni seuil changé ; l'essai échoue réellement si une lecture manque.
- GC2 — Plafonds : principal 1 572 864 o (avant 1 362 599 o), `formats` 3 145 728 o (avant 3 100 344 o) ; les deux tailles finales écrites dans `docs/essais/taille-wasm.md`.
- GC3 — Aucun build Tauri, aucun build Android.
- GC4 — La scène ne passe jamais sous 640 px : mesurée par l'essai, panneau ouvert.
- GC5 — `nice -n 10` ; un essai qui échoue sur un délai est rejoué une fois ; aucun délai relevé.
- GC6 — `node scripts/controle-licences.mjs` vert (dans `verifier.sh`).
- GC7 — Commits fichier par fichier, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `verifier.sh --e2e` ne passe aucune option de capture (garde de `verifier-e2e.test.sh`).

**Interdits :** aucune requête hors de 127.0.0.1 ; aucune option `--captures` dans `verifier.sh` ; aucun délai d'un
autre essai changé.

**Critère « terminé » :** les trois commandes rendent ce qui est attendu, capture commitée, tailles écrites, rapport avec les deux tailles et la description de la capture.

- [ ] **Étape 1 : brancher l'essai (rouge)** — `scripts/verifier.sh`, après `echo "C8 pot zones : OK"` :

```bash
  node scripts/essais/c4-bibliotheque-navigateur.mjs
  echo "C4 bibliothèque : OK"
```

`scripts/tests/verifier-e2e.test.sh:13` : ajouter `c4-bibliotheque-navigateur` à la fin de la liste `for s in …`. Lancer `bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -2` : `verifier-e2e.test.sh : OK` ; `node scripts/essais/c4-bibliotheque-navigateur.mjs 2>&1 | tail -2` : `Cannot find module` (rouge).

- [ ] **Étape 2 : l'essai** — `scripts/essais/c4-bibliotheque-navigateur.mjs` :

```js
#!/usr/bin/env node
// Essai C4 « bibliothèque » au navigateur (S1 à S3 du cadrage usage-c4-bibliotheque, geste du brief). Application
// construite (apps/web/dist) servie en local avec la CSP de la coque, Chromium headless de Playwright, mode repli
// (`?fichiers=repli`), heure figée. Oracles : `#stage[data-elements]`, cartes `.rb-resource[data-resource]`, vignette
// `img.rb-thumb` décodée, valeur du panneau de grille ; aucune requête hors de 127.0.0.1. Lancé par
// scripts/verifier.sh --e2e, sans option de capture.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Usage : node scripts/essais/c4-bibliotheque-navigateur.mjs [--captures]
// (--captures : docs/essais/c4-bibliotheque.png : panneau avec la recherche « frac » et la ressource posée sur la page).
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, VIEWPORT, coqueCsp, frames, gitSha, item, loadPlaywright, serve, stageMouse } from "./commun.mjs";

const LABEL = "C4 bibliothèque";
const FIXED = new Date("2026-11-21T08:00:00.000Z");
const LIB = "#bibliotheque";
const lib = (k) => `${LIB} [data-lib="${k}"]`;
const card = (path) => `${LIB} .rb-resource[data-resource="${path}"]`;
const GRID_PANEL = "#grille";
const gridField = (k) => `${GRID_PANEL} [data-grille="${k}"]`;

async function scenario(page, url, { captures, tmp }) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("dialog", (d) => void d.accept()); // confirmations (Vider)
  const check = (ok, what) => {
    if (!ok) throw new Echec(what);
    console.log(`ok ${what}`);
  };
  const fr = () => frames(page);
  const attr = (k) => page.getAttribute("#stage", k);
  const waitAttr = (k, v) => page.waitForFunction(([k, v]) => document.querySelector("#stage")?.getAttribute(k) === v, [k, v], { timeout: 15000 });
  const { drag, click } = stageMouse(page);
  const openLibrary = async () => {
    if (!(await page.isVisible(LIB))) await page.click(item("library"));
    await page.waitForSelector(LIB);
  };
  const addResource = async (what, name, keywords) => {
    await page.click(lib(what === "grid" ? "add-grid" : "add-selection"));
    await page.fill(lib("name"), name);
    if (keywords) await page.fill(lib("keywords"), keywords);
    await page.click(lib("submit"));
  };
  const dragCardToStage = async (path, at) => {
    const c = await page.locator(card(path)).first().boundingBox();
    const s = await page.locator("#stage").boundingBox();
    if (c === null || s === null) throw new Echec(`glisser : carte ${path} ou scène sans boîte`);
    await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
    await page.mouse.down();
    await page.mouse.move(s.x + at[0], s.y + at[1], { steps: 12 });
    await page.mouse.up();
  };
  const thumbDecoded = (sel) => page.$eval(`${sel} img.rb-thumb`, (img) => img.complete && img.naturalWidth > 0).catch(() => false);
  const gridKind = async () => {
    await page.click(item("grid"));
    await page.waitForSelector(gridField("kind"));
    const v = await page.inputValue(gridField("kind"));
    await page.click(gridField("cancel"));
    return v;
  };

  await page.goto(url);
  await page.waitForSelector("#stage");
  await fr();

  // S1 : deux rectangles et un trait, sélectionnés, groupés (geste de c3-groupes-navigateur.mjs).
  await page.click(item("rect"));
  await drag(120, 120, 220, 200);
  await drag(260, 120, 360, 200);
  await page.click(item("pen"));
  await drag(120, 260, 360, 260);
  await waitAttr("data-elements", "3");
  await page.click(item("select"));
  await fr();
  await drag(90, 90, 400, 300);
  await waitAttr("data-selection", "3");
  await page.keyboard.press("Control+g");
  await waitAttr("data-grouped", "1");
  check(true, "S1 : trois objets groupés");

  // Dossier « Fractions », ressource « Moitié » (mot-clé « fraction »).
  await openLibrary();
  await page.click(lib("new-folder"));
  await page.fill(lib("folder-name"), "Fractions");
  await page.click(lib("create-folder"));
  await page.waitForSelector(`${LIB} button[data-folder="Fractions"]`).catch(() => undefined);
  await addResource("selection", "Moitié", "fraction");
  await page.waitForSelector(card("Fractions/Moitié.rbitem"), { timeout: 15000 });
  check(await thumbDecoded(card("Fractions/Moitié.rbitem")), "S1 : carte « Moitié » dans « Fractions », vignette décodée");

  await page.fill(lib("search"), "frac");
  await page.waitForFunction((sel) => document.querySelectorAll(sel).length === 1, `${lib("results")} .rb-resource`, { timeout: 15000 });
  const found = await page.getAttribute(`${lib("results")} .rb-resource`, "data-resource");
  check(found === "Fractions/Moitié.rbitem", `S1 : « frac » : une seule ressource, ${found}`);
  check(await thumbDecoded(`${lib("results")} .rb-resource`), "S1 : résultat avec sa vignette");
  const box = await page.locator("#stage").boundingBox();
  check(box !== null && box.width >= 640 && box.height >= 640, `S1 : scène ≥ 640 px, panneau ouvert (${box?.width} × ${box?.height})`);

  // Autre page, glisser la carte du résultat : trois objets ; Annuler ; Rétablir.
  await page.click(item("page-add"));
  await waitAttr("data-elements", "0");
  await dragCardToStage("Fractions/Moitié.rbitem", [300, 300]);
  await waitAttr("data-elements", "3");
  check(true, "S1 : glissée sur la page 2 : trois objets insérés");
  if (captures) {
    const path = join(ROOT, "docs", "essais", "c4-bibliotheque.png");
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  }
  await page.click(item("undo"));
  await waitAttr("data-elements", "0");
  check(true, "S1 : Annuler : page vide");
  await page.click(item("redo"));
  await waitAttr("data-elements", "3");
  check(true, "S1 : Rétablir : les trois objets reviennent");
  await page.fill(lib("search"), "");

  // S2 : grille Seyès sur une page, enregistrée en ressource, déposée sur une page sans grille.
  await page.click(item("page-add"));
  await page.click(item("grid"));
  await page.waitForSelector(gridField("kind"));
  await page.selectOption(gridField("kind"), "seyes");
  await page.click(gridField("apply"));
  check((await gridKind()) === "seyes", "S2 : page 3 en Seyès");
  await openLibrary();
  await addResource("grid", "Seyès");
  await page.waitForSelector(card("Fractions/Seyès.rbitem"), { timeout: 15000 });
  await page.click(item("page-add"));
  check((await gridKind()) === "none", "S2 : page 4 sans grille");
  await openLibrary();
  await dragCardToStage("Fractions/Seyès.rbitem", [300, 300]);
  await page.waitForTimeout(300);
  check((await gridKind()) === "seyes", "S2 : « Seyès » déposée : la page 4 porte la grille Seyès");
  await page.click(item("undo"));
  check((await gridKind()) === "none", "S2 : Annuler : plus de grille");
  await page.click(item("redo"));
  check((await gridKind()) === "seyes", "S2 : Rétablir : la grille revient");

  // S3 : exporter « Fractions », vider, réimporter, recharger.
  await openLibrary();
  const download = page.waitForEvent("download");
  await page.click(lib("export"));
  const d = await download;
  check(d.suggestedFilename() === "Fractions.rbpack", `S3 : export : ${d.suggestedFilename()}`);
  const pack = join(tmp, "Fractions.rbpack");
  await d.saveAs(pack);
  await page.click(lib("up")).catch(() => undefined);
  await page.click(lib("clear"));
  await page.waitForFunction((sel) => document.querySelectorAll(sel).length === 0, `${LIB} section[data-root="mine"] .rb-resource, ${LIB} section[data-root="mine"] button[data-folder]`, { timeout: 15000 });
  check(true, "S3 : Vider : « Mes ressources » est vide");
  const chooser = page.waitForEvent("filechooser");
  await page.click(lib("import"));
  await (await chooser).setFiles(pack);
  await page.waitForSelector(card("Fractions/Moitié.rbitem"), { timeout: 15000 });
  await page.waitForSelector(card("Fractions/Seyès.rbitem"), { timeout: 15000 });
  check(await thumbDecoded(card("Fractions/Moitié.rbitem")), "S3 : réimporté : « Moitié » (vignette) et « Seyès » dans « Fractions »");
  await page.fill(lib("search"), "frac");
  await page.waitForFunction((sel) => document.querySelectorAll(sel).length === 1, `${lib("results")} .rb-resource`, { timeout: 15000 });
  check(true, "S3 : réimporté : le mot-clé « fraction » est gardé");

  await page.reload();
  await page.waitForSelector("#stage");
  await fr();
  await openLibrary();
  await page.click(`${LIB} button[data-folder="Fractions"]`);
  await page.waitForSelector(card("Fractions/Moitié.rbitem"), { timeout: 15000 });
  await page.waitForSelector(card("Fractions/Seyès.rbitem"), { timeout: 15000 });
  check(true, "S3 : rechargé : la bibliothèque est la même");
  const before = Number(await attr("data-elements"));
  await dragCardToStage("Fractions/Moitié.rbitem", [300, 300]);
  await waitAttr("data-elements", String(before + 3));
  check(true, "S3 : après rechargement, « Moitié » glissée : trois objets insérés");

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
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c4-"));
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

Points à vérifier dans les sources avant de lancer (un écart se corrige dans l'essai, jamais dans le code de l'application) :
`stageMouse(page)` rend-il `{ drag, click }` en coordonnées de la scène ? (`sed -n 112,126p scripts/essais/commun.mjs` ; sinon reprendre le `drag` local de `c3-groupes-navigateur.mjs:40-58`) ; la valeur « aucune grille » du sélecteur `kind` est `"none"` (`apps/web/src/grid-edit.ts:56`) ; la page ajoutée devient la page montrée (sinon `item("page-next")`) ; l'objet `#stage` porte `data-elements` pour la page montrée (`grep -n "data-elements" apps/web/src/app/stage-tags.ts`).

- [ ] **Étape 3 : build et essai** — commandes 1 et 2 de la section ; si une lecture échoue sur un délai, rejouer une fois.

- [ ] **Étape 4 : tailles finales** — ajouter au tableau C4 de `docs/essais/taille-wasm.md` la ligne `| après C4 (branche complète, T15, `verifier.sh`) | <module Wasm> o | <module formats> o |` (nombres de la commande 1), et sous le tableau : « Écart du module principal : +N o depuis avant C4 ; `formats` : +M o (ligne `KIND_GRID` de `check_manifest` et message de `WrongKind`). Plafonds de `scripts/verifier.sh` inchangés (1 572 864 o, 3 145 728 o). »

- [ ] **Étape 5 : suite complète** — commande 3.

- [ ] **Étape 6 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque--T15
git add scripts/essais/c4-bibliotheque-navigateur.mjs
git add scripts/verifier.sh
git add scripts/tests/verifier-e2e.test.sh
git add docs/essais/c4-bibliotheque.png
git add docs/essais/taille-wasm.md
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "test(e2e): C4 library browser trial wired into verifier.sh --e2e

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Relecture du plan (writing-plans, contrôles 1 à 4)

1. **Couverture du cadrage.** D1 → T4, T14 ; D2 → T1, T4 ; D3 → T1, T3 ; D4 → T7 ; D5 → T8 ; D6 → T6 ; D7 → T6, T10, T14 ;
   D8 → T6 ; D9 → T13 ; D10 → T8, T13 ; D11 → T8, T13 ; D12 → T5, T14 ; D13 → T12, T13 ; D14 → T4, T8 ; D15 → T14, T15 ;
   D16 → T11 ; D17 → T7 ; D18 → T7, T8 ; D19 → T8, T9, T14 ; D20 → T10 ; D21 → T1 ; D22 → GC6, T15 (`controle-licences`).
   Scénarios : S1 → T4, T5, T8, T11 à T15 ; S2 → T1 à T5, T12 à T15 ; S3 → T6 à T9, T13 à T15 ; S4 → T1 à T4, T7, T8, T15 ;
   S5 → T6, T9, T10, T13 (essai en coque réelle : hors VM, reste).
   Carte d'impact « touché » : toutes les entrées sont dans une tâche ; `pdf-overlay.ts`, `canvas2d.ts`, `grid-paint.ts`,
   `drop-web.ts`, `clipboard.ts`, `paste.ts`, `layout.ts`, `main.rs` restent intouchés comme le cadrage le dit.
   Effets de bord : `ContainerIO.read` → T4 « read à kind seul garde les messages d'avant » ; grille déposée → T14
   « un .rbitem de grille déposé remplace la grille » et T4 ; rangée « vue » → T11 et T15 (640 px) ; capacités → T10
   `capabilities_grant_library_folder_only` ; `.rbpack` au lancement → T10 `launch_paths_keeps_associated_extensions` ;
   `zip-worker.ts` → T7 (`zip-read.test.ts`, `model3d-import.test.ts` gardés verts).
   Écarts assumés, dits au rapport de leur tâche : valeur IndexedDB `{bytes, type}` au lieu d'un `Blob` (T6) ; `gridLinesOf`
   non appelé (la grille est peinte par `paintContent`, T5) ; `container_kind` ajouté à côté de `manifest_kind` pour le
   repli sans module des formats (T1, T2) ; `index?` ajouté à `insertResource` pour le rang de cascade du dépôt (T4).
2. **Étapes.** Chaque étape de code montre le code ; les seuls renvois aux sources nomment le fichier et la commande qui
   donne le nom local (fabriques de test existantes), sans décision laissée ouverte.
3. **Noms.** `insertResource`, `encodeGrid`, `captureResource`, `ContainerKind`, `ReadResult.kind`, `LibraryFiles`,
   `LibraryRoot`, `ResourceLibrary`, `ResourceEntry`, `CapturedResource`, `NewResource`, `ZipFile`, `PackItem`,
   `buildPack`, `readPack`, `createZipWriter`, `startResourceDrag`, `SharedFolder`, `RBPACK_TYPE` : mêmes signatures dans
   les tâches qui les produisent et celles qui les consomment.
4. **Review Focus.** Cinq lignes, chacune avec son test dans la tâche qui possède le code (T4, T6, T7, T8).
