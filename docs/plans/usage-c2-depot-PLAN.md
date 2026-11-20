# usage-c2-depot — plan d'exécution (C2, partie « reste » : dépôt, image, conteneur, licences)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**Spec :** `docs/plans/usage-c2-depot-cadrage.md` (révision 1, commit bc979a2 ; décisions R1 à R30, DAR1 à DAR3, S1 à S5).

**But :** déposer, coller ou importer une image sur la page ; elle s'affiche, se sélectionne, se déplace, se
redimensionne, s'enregistre dans le `.roomboard` et se rouvre ; un `.roomboard` déposé s'ouvre dans un nouvel onglet ;
licences contrôlées par `verifier.sh` ; `format::read_entry` borné.

**Architecture :** le cœur Rust porte la seule lecture bornée (`format::read_bounded`) ; un second module Wasm
(`roomboard-formats-wasm`) lie `container::read` et `container::write`, servi dans la page derrière le port
`ContainerCodec` et chargé au premier besoin ; la page reconnaît les images par leurs octets (`image-import.ts`), les
insère par `AddImage` et les dessine depuis un cache de bitmaps par empreinte (`image-cache.ts`). Un document sans
asset s'enregistre toujours par `doc.save` (mêmes octets qu'avant).

**Pile :** Rust 2021 (`zip`, `sha2`, `wasm-bindgen =0.2.130`), TypeScript 5.9, SolidJS, Vitest 3, Playwright (cache npx).

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Lecture bornée unique `format::read_bounded` | — | `crates/roomboard-core/src/format/mod.rs`, `crates/roomboard-formats/src/container.rs` | isolé (`usage-c2-depot--T1`) | implementeur-tdd | `cargo test -p roomboard-core format::tests` : `test result: ok`, ≥ 4 tests nouveaux dont `oversized_document_is_corrupt` ; `cargo test -p roomboard-formats` : `test result: ok` | S3 | #tache-t1 |
| T2 | Second module Wasm et port `ContainerCodec` | — | `crates/roomboard-formats-wasm/Cargo.toml`, `crates/roomboard-formats-wasm/src/lib.rs`, `Cargo.toml`, `Cargo.lock`, `.gitignore`, `scripts/verifier.sh`, `apps/web/src/platform/container.ts`, `apps/web/src/platform/container-load.ts`, `apps/web/src/platform/container.test.ts`, `apps/web/src/platform/container.contract.test.ts` | isolé (`usage-c2-depot--T2`) | concepteur-critique | `cargo test -p roomboard-formats-wasm` ≥ 5 tests, `test result: ok` ; vitest `container.test.ts` 5 tests ; `ROOMBOARD_WASM_REQUIRED=1` vitest `container.contract.test.ts` ≥ 3 tests passés, 0 sauté ; ligne `module formats : N octets` avec N ≤ 3145728 | S3 | #tache-t2 |
| T3 | Registre d'import et module image | — | `apps/web/src/platform/import.ts`, `apps/web/src/platform/import.test.ts`, `apps/web/src/platform/image-import.ts`, `apps/web/src/platform/image-import.test.ts` | isolé (`usage-c2-depot--T3`) | implementeur-tdd | vitest `import.test.ts` + `image-import.test.ts` : ≥ 30 tests passés, dont `plus de maxBytes` et `PNG reconnu par ses octets` | S1, S5 | #tache-t3 |
| T4 | Rendu des images (cache, `paintElement`, `Engine.redraw`) | — | `apps/web/src/engine/render/image-cache.ts`, `apps/web/src/engine/render/image-cache.test.ts`, `apps/web/src/engine/render/canvas2d.ts`, `apps/web/src/engine/render/canvas2d.test.ts`, `apps/web/src/engine/render/fake-ctx.ts`, `apps/web/src/engine/render/select.ts`, `apps/web/src/engine/render/select.test.ts`, `apps/web/src/engine/engine.ts`, `apps/web/src/engine/engine.test.ts` | isolé (`usage-c2-depot--T4`) | implementeur-tdd | vitest `image-cache`, `canvas2d`, `select`, `engine`, `grid-paint` : tous passés, dont `image : bitmap dessiné dans sa boîte` et `redraw` | S1, S2 | #tache-t4 |
| T5 | Hôtes et contrôleur : `pick`, `save(encode, target)`, commande `import`, refus R30 | — | `apps/web/src/platform/files.ts`, `apps/web/src/platform/files.test.ts`, `apps/web/src/platform/host-tauri.ts`, `apps/web/src/platform/host-tauri.test.ts`, `apps/web/src/platform/host-fsa.ts`, `apps/web/src/platform/host-fsa.test.ts`, `apps/web/src/platform/host-repli.ts`, `apps/web/src/platform/host-repli.test.ts`, `apps/web/src/platform/controller.ts`, `apps/web/src/platform/controller.test.ts`, `apps/web/src/app/workspace.ts`, `apps/web/src/app/workspace.test.ts` | isolé (`usage-c2-depot--T5`) | implementeur-tdd | vitest des 5 fichiers `platform/*` + `workspace.test.ts` : tous passés, dont `boîte annulée : encode jamais appelé` (Tauri, FSA, contrôleur) ; `tsc --noEmit` : 0 erreur | S3, S5 | #tache-t5 |
| T6 | Contrôle des licences appelé par `verifier.sh` | T2 (`verifier.sh`) | `scripts/controle-licences.mjs`, `scripts/licences-acceptees.json`, `scripts/tests/controle-licences.test.sh`, `scripts/verifier.sh`, `THIRD_PARTY_NOTICES.md` | isolé (`usage-c2-depot--T6`) | implementeur-tdd | `bash scripts/tests/controle-licences.test.sh` : `controle-licences.test.sh : OK (10 cas)` ; `node scripts/controle-licences.mjs` : `controle-licences : OK` | S5 | #tache-t6 |
| T7 | Espace de travail : ouverture et enregistrement par le conteneur, repli, images importées, collage | T2, T3, T4, T5 (`workspace.ts`) | `apps/web/src/app/workspace.ts`, `apps/web/src/app/workspace.test.ts`, `apps/web/src/app/board-session.ts`, `apps/web/src/app/board-session.test.ts`, `apps/web/src/main.ts`, `apps/web/src/platform/paste.ts`, `apps/web/src/platform/paste.test.ts` | isolé (`usage-c2-depot--T7`) | concepteur-critique | vitest `workspace.test.ts` (≥ 36 tests), `board-session.test.ts`, `paste.test.ts` : tous passés, dont `repli : module indisponible` et `enregistrer sans image : octets de doc.save` ; `pnpm -r test` vert ; `tsc --noEmit` : 0 erreur | S3, S4 | #tache-t7 |
| T8 | Barre : action « Importer », zone de dépôt sans double insertion | T5 (`FileCommand` « import ») | `apps/web/src/toolbar.ts`, `apps/web/src/toolbar-profiles.ts`, `apps/web/src/toolbar-profiles.test.ts`, `apps/web/src/app/toolbar-host.ts`, `apps/web/src/app/toolbar-host.test.ts`, `apps/web/src/platform/drop-web.ts`, `apps/web/src/platform/drop-web.test.ts`, `apps/web/src/ui/Toolbar.tsx`, `apps/web/src/ui/Toolbar.test.tsx` | isolé (`usage-c2-depot--T8`) | implementeur-tdd | vitest `toolbar*`, `drop-web`, `Toolbar.test.tsx` : tous passés, dont `un dépôt ne remonte pas à document` ; `pnpm -r test` vert | S5, S1 | #tache-t8 |
| T9 | Essai navigateur C2, capture, essais existants passés sur `.tif` | T6, T7, T8 (`verifier.sh`) | `scripts/essais/c2-image-navigateur.mjs`, `scripts/essais/s5b-navigateur.mjs`, `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/c2-image-deposee.png` | isolé (`usage-c2-depot--T9`) | implementeur-tdd | `scripts/verifier.sh --e2e` : `C2 image : OK`, `verifier.sh : e2e OK`, `verifier.sh : OK` ; capture `docs/essais/c2-image-deposee.png` écrite | S1, S2, S3, S4, S5 | #tache-t9 |

**Vagues.** Vague 1 : T1, T2, T3, T4, T5 (fichiers disjoints, 5 en parallèle). Vague 2 : T6, T7, T8 (fichiers disjoints ;
T6 après T2 pour `verifier.sh`, T7 après T5 pour `workspace.ts`, T8 après T5). Vague 3 : T9 (après T6 pour
`verifier.sh`). Fichiers partagés sérialisés : `workspace.ts` (T5 puis T7), `verifier.sh` (T2, T6, T9), `canvas2d.ts`
(T4 seul), `board-session.ts` (T7 seul).

## Global Constraints

Recopiées dans chaque section concernée (un sous-agent ne lit que sa section).

- **GC1** TDD : le test est écrit et vu rouge avant le code.
- **GC2** Aucun build Tauri, aucun build Android.
- **GC3** Aucun seuil baissé, aucun test désactivé, sauté ou affaibli (`.skip`, `.only`, `.todo`, `#[ignore]`,
  assertion retirée). Le `describe.skipIf(module absent)` des contrats Wasm est le patron existant, exigé présent sous
  `ROOMBOARD_WASM_REQUIRED=1`.
- **GC4** Jamais `git add -A`, `git add .`, `git commit -a` : chaque fichier est ajouté par son chemin.
- **GC5** Toute commande cargo ou pnpm est précédée de `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- **GC6** VM chargée : un test échoué sur délai (timeout) est rejoué une fois ; un second échec est un échec.
- **GC7** Images fabriquées dans le test ; aucun fichier de `~/telechargements-roomboard/` lu par un test ni commité.
- **GC8** Aucune dépendance AGPL, GPL ou LGPL liée ; aucune dépendance nouvelle n'est attendue (sinon : une ligne dans
  `THIRD_PARTY_NOTICES.md` et arrêt pour le dire au rapport).
- **GC9** Budget du module Wasm principal inchangé (1 572 864 octets, `verifier.sh`) ; `crates/roomboard-wasm` n'est pas
  touché.
- **GC10** Constats ouverts : aucune nouvelle copie de `PAGE_WIDTH` dans `apps/web/src/core/`, ni de `finitePositive` ;
  aucun `kind` d'élément nouveau.
- **GC11** Commit : auteur et committer `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais
  (convention `type(portée): sujet`), dernière ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **GC12** Worktree neuf : `pnpm install --frozen-lockfile` à la racine si `node_modules/` manque ; pour `tsc`,
  `apps/web/src/wasm/` est copié depuis `/home/adminjd/projets/roomboard-wt/usage-c2-depot/apps/web/src/wasm` s'il manque
  (le crate `roomboard-wasm` ne change pas dans ce chantier) ; si `apps/web/src/platform/container-load.ts` existe (après
  T2), le second module est construit avant `tsc` : `cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown
  --release && rm -rf apps/web/src/wasm-formats && wasm-bindgen --target web --remove-name-section --out-dir
  apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm`.

## Review Focus

Cinq entrées que le cadrage implique sans qu'un scénario les exerce ; chacune a son test dans la tâche qui possède le code.

1. **Image au nom trompeur** (un PNG nommé `photo.jpg`, ou sans extension) : reconnue par ses octets, insérée avec le
   type `image/png` (R1 « reconnue par octets magiques », R14). Test T3 « nom trompeur ».
2. **Fermer un onglet pendant qu'un bitmap se décode** : le bitmap arrivé après `dispose` est fermé aussitôt, aucun
   `ready` (R12 « libéré à `dispose` », DAR2 « un onglet fermé ferme ses bitmaps »). Test T4 « dispose puis décodage fini ».
3. **Rapport d'aspect extrême ou vue de taille nulle** (50 000 × 1 px ; stage caché de 0 × 0) : facteur fini et
   positif, jamais 0 (R5). Tests T3 « placement : rapport extrême » et « vue nulle ».
4. **Même image déposée deux fois** : deux éléments, un seul asset écrit (empreinte, R12, HR12). Test T7 « même image
   déposée deux fois ».
5. **Conteneur qui signale des entrées ignorées** (asset corrompu, nom invalide) : l'onglet s'ouvre, les avertissements
   sont dits en une boîte, l'enregistrement n'est pas refusé (R7 « avertissements du conteneur dits en une boîte »,
   HR13). Test T7 « ouvrir avec le conteneur ».

## Carte des fichiers

| fichier | responsabilité | tâche |
|---|---|---|
| `crates/roomboard-core/src/format/mod.rs` | `read_bounded`, bornes de `read_entry` | T1 |
| `crates/roomboard-formats/src/container.rs` | lecture des `assets/` par `read_bounded` | T1 |
| `crates/roomboard-formats-wasm/` (nouveau) | liaison wasm-bindgen de `container::read` / `write` | T2 |
| `apps/web/src/platform/container.ts` (nouveau) | port `ContainerCodec`, `createPageCodec(load)`, `CodecUnavailableError` | T2 |
| `apps/web/src/platform/container-load.ts` (nouveau) | `import()` réel du second module (amorce seule) | T2 |
| `apps/web/src/platform/image-import.ts` (nouveau) | détection, en-tête, décodage, géométrie d'insertion, entrée `image` | T3 |
| `apps/web/src/platform/import.ts` | registre `ImportHandler`, limite web, `inserted` | T3 |
| `apps/web/src/engine/render/image-cache.ts` (nouveau) | bitmaps par empreinte, port `ImageSource` | T4 |
| `apps/web/src/engine/render/canvas2d.ts` | branches `image` et `unknown` | T4 |
| `apps/web/src/platform/files.ts`, `host-*.ts`, `controller.ts` | `pick`, `save(encode, target)`, `import`, refus R30 | T5 |
| `scripts/controle-licences.mjs` (nouveau) | relevé et contrôle SPDX | T6 |
| `apps/web/src/app/workspace.ts`, `board-session.ts`, `main.ts`, `platform/paste.ts` (nouveau) | branchement | T7 |
| `apps/web/src/toolbar*.ts`, `app/toolbar-host.ts`, `platform/drop-web.ts`, `ui/Toolbar.tsx` | « Importer », R29 | T8 |
| `scripts/essais/c2-image-navigateur.mjs` (nouveau) | geste au navigateur S1 à S5 | T9 |

---

### Tâche T1 — Lecture bornée unique `format::read_bounded`
<a id="tache-t1"></a>

**Objectif.** Une seule lecture bornée publique dans le cœur (R20) : `read_entry` lit le manifeste au plus à 1 Mio et
`document.ybin` au plus à 256 Mio ; au-delà, `FormatError::Corrupt("<entrée> trop gros : plus de N octets")` ;
`container::read_limited` appelle la même fonction et garde ses avertissements.

**Fichiers.**
- Modifier : `crates/roomboard-core/src/format/mod.rs:76-81` (`read_entry`), `:172-187` (`open`), tests du module.
- Modifier : `crates/roomboard-formats/src/container.rs:5` (import), `:141-159` (lecture d'une entrée `assets/`).

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit :
  - `pub const MAX_MANIFEST_BYTES: u64 = 1024 * 1024;`
  - `pub const MAX_DOCUMENT_BYTES: u64 = 256 * 1024 * 1024;`
  - `pub enum BoundedReadError { TooLarge, Io(String) }` (`Debug, Clone, PartialEq`)
  - `pub fn read_bounded(r: impl Read, max: u64) -> Result<Vec<u8>, BoundedReadError>`
- Réutilise : `crates/roomboard-formats/src/container.rs:144-158` — motif `take(max + 1)` **déplacé** dans
  `format::read_bounded`, appelé par `read_entry` et par `container::read_limited` (étendre : le cœur porte la fonction,
  le conteneur l'appelle).

**Contraintes (recopiées).** GC1 TDD, test rouge d'abord. GC3 aucun test sauté ni affaibli. GC4 fichiers ajoutés un par
un. GC5 `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant cargo. GC6 délai : un rejeu. GC11 commit.

**Interdits.** Changer les messages existants des avertissements de `container.rs` (les tests de
`crates/roomboard-formats/tests/container.rs` les lisent) ; toucher `crates/roomboard-wasm` ; ajouter une dépendance.

**Test et commande bornée.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
cargo test -p roomboard-core format::tests 2>&1 | grep -E "read_bounded|oversized|limits_are|test result|FAILED|panicked" | tail -20
cargo test -p roomboard-formats 2>&1 | grep -E "test result|FAILED|panicked" | tail -20
cargo test -p roomboard-core --test compat_socle 2>&1 | grep -E "test result|FAILED" | tail -5
cargo fmt --all --check && cargo clippy --workspace --all-targets -- -D warnings 2>&1 | tail -5
```
Motif de réussite : les quatre noms `read_bounded_keeps_up_to_max`, `oversized_manifest_is_corrupt`,
`oversized_document_is_corrupt`, `limits_are_one_and_256_mib` suivis de `ok` ; chaque `test result: ok.` ; aucune ligne
`FAILED` ni `error[`. À garder verts : `crates/roomboard-formats/tests/container.rs` (dont les avertissements « trop
gros »), `crates/roomboard-core/tests/compat_socle.rs`.

**Terminé quand.** Les quatre tests nouveaux passent, `roomboard-formats` et `compat_socle` restent verts, fmt et
clippy propres, un commit.

**Étapes.**

- [ ] **1. Écrire les tests rouges** dans le module `tests` de `crates/roomboard-core/src/format/mod.rs` (après
  `entry_options_sets_method_and_fixed_date`) :

```rust
    #[test]
    fn read_bounded_keeps_up_to_max() {
        assert_eq!(read_bounded(&[1u8, 2, 3][..], 3), Ok(vec![1, 2, 3]));
        assert_eq!(
            read_bounded(&[1u8, 2, 3, 4][..], 3),
            Err(BoundedReadError::TooLarge)
        );
        assert_eq!(read_bounded(&[0u8; 0][..], 0), Ok(vec![]));
    }

    #[test]
    fn oversized_manifest_is_corrupt() {
        let mut big = manifest_json(FORMAT, FORMAT_VERSION, SCHEMA);
        big.resize(MAX_MANIFEST_BYTES as usize + 1, b' ');
        let file = zip_of(&[(MANIFEST, &big[..]), (DOCUMENT, &[0u8; 0][..])]);
        assert_eq!(
            open(&file).err(),
            Some(FormatError::Corrupt(format!(
                "{MANIFEST} trop gros : plus de {MAX_MANIFEST_BYTES} octets"
            )))
        );
    }

    #[test]
    fn oversized_document_is_corrupt() {
        let m = manifest_json(FORMAT, FORMAT_VERSION, SCHEMA);
        let file = zip_of(&[(MANIFEST, &m[..]), (DOCUMENT, &[0u8; 11][..])]);
        assert_eq!(
            open_with_limits(&file, MAX_MANIFEST_BYTES, 10).err(),
            Some(FormatError::Corrupt(format!(
                "{DOCUMENT} trop gros : plus de 10 octets"
            )))
        );
        assert!(open_with_limits(&file, MAX_MANIFEST_BYTES, 11).is_ok());
    }

    #[test]
    fn limits_are_one_and_256_mib() {
        assert_eq!(MAX_MANIFEST_BYTES, 1_048_576);
        assert_eq!(MAX_DOCUMENT_BYTES, 268_435_456);
    }
```

- [ ] **2. Les voir échouer** : `cargo test -p roomboard-core format::tests 2>&1 | tail -20` → `error[E0425]: cannot find
  function \`read_bounded\``.

- [ ] **3. Écrire le code** dans `format/mod.rs`. Après `io_err` (ligne 70), ajouter :

```rust
/// Taille maximale du manifeste lu (R20) : 1 Mio.
pub const MAX_MANIFEST_BYTES: u64 = 1024 * 1024;
/// Taille maximale de `document.ybin` lu (R20) : 256 Mio.
pub const MAX_DOCUMENT_BYTES: u64 = 256 * 1024 * 1024;

/// Échec d'une lecture bornée (R20).
#[derive(Debug, Clone, PartialEq)]
pub enum BoundedReadError {
    /// Plus de `max` octets.
    TooLarge,
    Io(String),
}

/// Lit au plus `max` octets de `r` (`take(max + 1)`) : au-delà, `TooLarge`, sans jamais remplir la mémoire d'une bombe
/// de décompression. Seule lecture bornée du projet (R20) : `read_entry` et `roomboard_formats::container` l'appellent.
pub fn read_bounded(r: impl Read, max: u64) -> Result<Vec<u8>, BoundedReadError> {
    let mut out = Vec::new();
    r.take(max.saturating_add(1))
        .read_to_end(&mut out)
        .map_err(|e| BoundedReadError::Io(e.to_string()))?;
    if out.len() as u64 > max {
        return Err(BoundedReadError::TooLarge);
    }
    Ok(out)
}
```

  Remplacer `read_entry` (lignes 76-81) par :

```rust
/// Entrée `name` lue au plus à `max` octets ; absente ou illisible : `Ok(None)` (comme avant R20) ; trop grosse :
/// `Corrupt`.
fn read_entry(
    archive: &mut ZipArchive<Cursor<&[u8]>>,
    name: &str,
    max: u64,
) -> Result<Option<Vec<u8>>, FormatError> {
    let Ok(file) = archive.by_name(name) else {
        return Ok(None);
    };
    match read_bounded(file, max) {
        Ok(bytes) => Ok(Some(bytes)),
        Err(BoundedReadError::TooLarge) => Err(FormatError::Corrupt(format!(
            "{name} trop gros : plus de {max} octets"
        ))),
        Err(BoundedReadError::Io(_)) => Ok(None),
    }
}
```

  Remplacer `open` (lignes 172-187) par :

```rust
/// Ouvre l'archive, contrôle le manifeste **avant** de chercher `document.ybin`, puis lit `document.ybin` ; bornes R20.
pub fn open(bytes: &[u8]) -> Result<Opened<'_>, FormatError> {
    open_with_limits(bytes, MAX_MANIFEST_BYTES, MAX_DOCUMENT_BYTES)
}

/// `open` avec des bornes paramétrables (tests : un `document.ybin` de 256 Mio ne se fabrique pas dans un test).
fn open_with_limits(
    bytes: &[u8],
    max_manifest: u64,
    max_document: u64,
) -> Result<Opened<'_>, FormatError> {
    let mut archive =
        ZipArchive::new(Cursor::new(bytes)).map_err(|_| FormatError::NotRoomboard)?;
    let raw = read_entry(&mut archive, MANIFEST, max_manifest)?.ok_or(FormatError::NotRoomboard)?;
    let manifest = check_manifest(&raw)?;
    let ybin = read_entry(&mut archive, DOCUMENT, max_document)?
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
```

- [ ] **4. Voir les tests passer** : commande de la rubrique « Test » (première ligne).

- [ ] **5. Conteneur.** Dans `crates/roomboard-formats/src/container.rs`, ligne 5 : `use std::io::{Read, Write};` devient
  `use std::io::Write;`. Remplacer les lignes 141-159 (de `let mut bytes = Vec::new();` jusqu'au `continue;` du bloc
  « trop gros ») par :

```rust
        let read = match archive.by_name(&name) {
            Ok(f) => format::read_bounded(f, max),
            Err(e) => Err(format::BoundedReadError::Io(e.to_string())),
        };
        let bytes = match read {
            Ok(b) => b,
            Err(format::BoundedReadError::TooLarge) => {
                warnings.push(format!(
                    "asset ignoré : {name} (trop gros : plus de {max} octets)"
                ));
                continue;
            }
            Err(format::BoundedReadError::Io(e)) => {
                warnings.push(format!("asset ignoré : {name} (illisible : {e})"));
                continue;
            }
        };
```

- [ ] **6. Preuve complète** : les quatre lignes de la rubrique « Test » ; `cargo fmt --all` si le contrôle de format
  le demande, puis à nouveau `--check`.

- [ ] **7. Commit.**

```bash
git add crates/roomboard-core/src/format/mod.rs crates/roomboard-formats/src/container.rs
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(format): bounded entry reads in one core function

read_entry caps manifest.json at 1 MiB and document.ybin at 256 MiB;
the container reads its assets through the same format::read_bounded.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Ligne exigée : `Réutilisation : appelé format::read_bounded depuis container::read_limited` (ou
`Réutilisation : écart — <pourquoi>`).

---

### Tâche T2 — Second module Wasm et port `ContainerCodec`
<a id="tache-t2"></a>

**Objectif.** Crate `crates/roomboard-formats-wasm` (cdylib, liaison mince de `container::read` et `container::write`,
R8, DAR1) ; sa construction et sa taille dans `verifier.sh` (R9) ; côté page, le port `ContainerCodec` servi dans la page,
module chargé par `import()` au premier besoin et gardé jusqu'au rechargement (R10), `CodecUnavailableError` quand il ne
se charge pas (repli R7).

**Fichiers.**
- Créer : `crates/roomboard-formats-wasm/Cargo.toml`, `crates/roomboard-formats-wasm/src/lib.rs`.
- Modifier : `Cargo.toml:3` (`members`), `Cargo.lock` (nouveau membre, régénéré par cargo), `.gitignore`,
  `scripts/verifier.sh:16`, `:31-34`.
- Créer : `apps/web/src/platform/container.ts`, `apps/web/src/platform/container-load.ts`,
  `apps/web/src/platform/container.test.ts`, `apps/web/src/platform/container.contract.test.ts`.

**Interfaces.**
- Consomme : `roomboard_formats::container::{read, write, AssetBytes, sha256_hex}` (`container.rs:73`, `:114`),
  `roomboard_core::format::{Parts, save, save_parts, SaveMeta}` — inchangés par T1.
- Produit (Rust, `roomboard_formats_wasm`) :
  - `#[wasm_bindgen] pub struct ContainerReader` ; `impl ContainerReader { pub fn open_inner(file: &[u8]) -> Result<ContainerReader, String> }` ;
    `#[wasm_bindgen] impl ContainerReader { pub fn open(file: &[u8]) -> Result<ContainerReader, JsError>; pub fn manifest(&self) -> Vec<u8>; pub fn ybin(&self) -> Vec<u8>; pub fn asset_count(&self) -> u32; pub fn asset_id(&self, i: u32) -> Option<String>; pub fn asset_bytes(&self, i: u32) -> Option<Vec<u8>>; pub fn warnings(&self) -> Vec<String> }`
  - `pub fn write_container_inner(manifest: &[u8], ybin: &[u8], ids: &[String], mimes: &[String], sizes: &[u32], bytes: &[u8]) -> Result<Vec<u8>, String>`
  - `#[wasm_bindgen] pub fn write_container(manifest: &[u8], ybin: &[u8], ids: Vec<String>, mimes: Vec<String>, sizes: Vec<u32>, bytes: &[u8]) -> Result<Vec<u8>, JsError>`
- Produit (TS, `apps/web/src/platform/container.ts`) :
  - `interface ContainerAsset { readonly id: string; readonly mime: string; readonly blob: Blob }`
  - `interface ContainerContents { readonly manifest: Uint8Array; readonly ybin: Uint8Array; readonly assets: ReadonlyArray<readonly [string, Blob]>; readonly warnings: readonly string[] }`
  - `interface ContainerCodec { read(file: Blob): Promise<ContainerContents>; write(manifest: Uint8Array, ybin: Uint8Array, assets: readonly ContainerAsset[]): Promise<Uint8Array> }`
  - `class CodecUnavailableError extends Error` (`name = "CodecUnavailableError"`)
  - `interface ReaderBinding`, `interface FormatsBinding` (forme du module généré)
  - `function createPageCodec(load: () => Promise<FormatsBinding>): ContainerCodec`
  - `apps/web/src/platform/container-load.ts` : `async function loadFormatsModule(): Promise<FormatsBinding>` (importé
    par l'amorce seulement, T7)
- Réutilise : `crates/roomboard-formats/src/container.rs:73`, `:114` — `container::write(parts, assets)`,
  `container::read(file)` (réutiliser, par la liaison R8).
- Réutilise : aucun module pour la liaison du conteneur (nouveau, DAU1 le nomme ; `formats-wasm`, `wasm-formats` sans
  résultat) — `ContainerReader`, `write_container`.
- Réutilise : aucun module pour le port page ↔ conteneur (nouveau ; `new Worker`, `container` côté page sans résultat) —
  `ContainerCodec`.

**Patron à ne pas reprendre (concepteur-critique).**
- Le chargement **au démarrage** du module principal : `apps/web/src/main.ts:22` (`import init, * as wasm from
  "./wasm/roomboard_wasm"`, import statique) et `:37` (`await init()`). Le second module se charge au premier besoin,
  par `import()` dynamique, **dans un fichier que seule l'amorce importe** (`container-load.ts`) : un `import()` littéral
  dans `container.ts` ferait échouer la transformation de tout test qui importe `container.ts` (Vite résout l'import
  même dynamique) dans un worktree où `src/wasm-formats/` n'est pas construit.
- Le passage d'objets par `serde-wasm-bindgen` de `crates/roomboard-wasm/src/lib.rs:1-3` : ici, seulement des octets,
  des chaînes et des `Vec` (les assets bout à bout, découpés par `sizes`) ; aucune dépendance serde nouvelle.
- Un codec qui garde un échec de chargement en cache : un essai neuf au besoin suivant (le fichier peut arriver après).

**Contraintes (recopiées).** GC1 TDD. GC2 aucun build Tauri ni Android. GC3 aucun test sauté (hors patron
`describe.skipIf` exigé sous `ROOMBOARD_WASM_REQUIRED=1`). GC4 fichiers un par un. GC5 PATH avant cargo et pnpm. GC6 un
rejeu sur délai. GC7 octets fabriqués dans le test. GC8 aucune dépendance nouvelle (`wasm-bindgen =0.2.130` est déjà au
`Cargo.lock`). GC9 budget du module principal inchangé, `crates/roomboard-wasm` non touché. GC11 commit. GC12 worktree
neuf.

**Interdits.** Ajouter un crate externe ; changer la version de `wasm-bindgen` ; toucher `main.ts` (T7) ; mesurer la
taille du module principal autrement qu'aujourd'hui.

**Test et commande bornée.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
cargo test -p roomboard-formats-wasm 2>&1 | grep -E "^test |test result|FAILED|panicked" | tail -20
cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -3
rm -rf apps/web/src/wasm-formats && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm
wc -c < apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm
pnpm --filter @roomboard/web exec vitest run src/platform/container.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Tests " | tail -20
ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web exec vitest run src/platform/container.contract.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|↓|FAIL|Tests " | tail -20
pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20
bash scripts/controle-wasm-bindgen.sh Cargo.lock 2>&1 | tail -3
cargo fmt --all --check && cargo clippy --workspace --all-targets -- -D warnings 2>&1 | tail -5
```
Motif de réussite : `cargo test` ≥ 5 lignes `test tests::… ok`, `test result: ok.` ; taille ≤ 3145728 ; `container.test.ts`
`Tests  5 passed (5)` ; contrat `Tests  N passed (N)` avec N ≥ 3 et aucun `↓` (sauté) ; `tsc` sans sortie ;
`controle-wasm-bindgen` OK. À garder verts : `scripts/controle-wasm-bindgen.sh` (même version épinglée),
`apps/web/src/core/wasm-core.contract.test.ts`.

**Terminé quand.** Le crate est membre du workspace, ses tests natifs passent, le module se construit et pèse ≤ 3 Mio,
le port passe ses tests unitaires et son contrat sur le vrai module, `verifier.sh` construit et mesure le second module,
un commit.

**Étapes.**

- [ ] **1. Crate.** `crates/roomboard-formats-wasm/Cargo.toml` :

```toml
[package]
name = "roomboard-formats-wasm"
version.workspace = true
edition.workspace = true
license.workspace = true

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
roomboard-core = { path = "../roomboard-core" }
roomboard-formats = { path = "../roomboard-formats" }
wasm-bindgen = "=0.2.130"
```

  `Cargo.toml:3` : `members = ["crates/roomboard-core", "crates/roomboard-wasm", "crates/roomboard-shell",
  "crates/roomboard-formats", "crates/roomboard-formats-wasm"]`. `.gitignore` : ajouter la ligne
  `apps/web/src/wasm-formats/` après `apps/web/src/wasm/`.

- [ ] **2. Tests rouges natifs**, en bas de `crates/roomboard-formats-wasm/src/lib.rs` (le fichier ne contient d'abord que
  ce module et l'en-tête `//!` de l'étape 4) :

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use roomboard_core::document::Document;
    use roomboard_core::format::{self, SaveMeta};
    use roomboard_formats::container::sha256_hex;

    fn meta() -> SaveMeta {
        SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-20T00:00:00Z".into(),
            created: None,
        }
    }

    fn doc() -> Document {
        let mut d = Document::blank();
        d.add_page();
        d
    }

    #[test]
    fn write_then_open_keeps_parts_and_asset() {
        let p = format::save_parts(&doc(), &meta()).expect("parts");
        let png = b"\x89PNG\r\n\x1a\nfaux".to_vec();
        let id = sha256_hex(&png);
        let file = write_container_inner(
            &p.manifest,
            &p.ybin,
            &[id.clone()],
            &["image/png".to_string()],
            &[png.len() as u32],
            &png,
        )
        .expect("écrit");
        let r = ContainerReader::open_inner(&file).expect("lu");
        assert_eq!((r.manifest(), r.ybin()), (p.manifest.clone(), p.ybin.clone()));
        assert_eq!(
            (r.asset_count(), r.asset_id(0), r.asset_bytes(0)),
            (1, Some(id), Some(png))
        );
        assert_eq!((r.asset_id(1), r.asset_bytes(1)), (None, None));
        assert!(r.warnings().is_empty());
    }

    #[test]
    fn assets_are_cut_by_sizes_and_sorted() {
        let p = format::save_parts(&doc(), &meta()).expect("parts");
        let (a, b) = (b"premier".to_vec(), b"second!!".to_vec());
        let (ia, ib) = (sha256_hex(&a), sha256_hex(&b));
        let all = [a.clone(), b.clone()].concat();
        let file = write_container_inner(
            &p.manifest,
            &p.ybin,
            &[ia.clone(), ib.clone()],
            &["image/png".to_string(), "image/gif".to_string()],
            &[a.len() as u32, b.len() as u32],
            &all,
        )
        .expect("écrit");
        let r = ContainerReader::open_inner(&file).expect("lu");
        let mut want = vec![(ia, a), (ib, b)];
        want.sort();
        let got: Vec<(String, Vec<u8>)> = (0..r.asset_count())
            .map(|i| (r.asset_id(i).expect("id"), r.asset_bytes(i).expect("octets")))
            .collect();
        assert_eq!(got, want);
    }

    #[test]
    fn inconsistent_lists_are_refused() {
        let p = format::save_parts(&doc(), &meta()).expect("parts");
        assert_eq!(
            write_container_inner(&p.manifest, &p.ybin, &["a".into()], &[], &[1], b"x"),
            Err("assets incohérents : 1 empreintes, 0 types, 1 tailles".to_string())
        );
        assert_eq!(
            write_container_inner(&p.manifest, &p.ybin, &[], &[], &[], b"x"),
            Err("assets incohérents : 0 octets annoncés, 1 reçus".to_string())
        );
    }

    #[test]
    fn wrong_id_is_refused_by_the_container() {
        let p = format::save_parts(&doc(), &meta()).expect("parts");
        let id = "0".repeat(64);
        let e = write_container_inner(&p.manifest, &p.ybin, &[id], &["image/png".into()], &[1], b"x")
            .expect_err("refusé");
        assert!(e.contains("ne correspond pas à son empreinte"), "{e}");
    }

    #[test]
    fn garbage_is_not_roomboard() {
        assert_eq!(
            ContainerReader::open_inner(b"pas un zip").err(),
            Some("ce fichier n'est pas un document RoomBoard".to_string())
        );
    }

    #[test]
    fn without_assets_bytes_equal_core_save() {
        let d = doc();
        let p = format::save_parts(&d, &meta()).expect("parts");
        let file = write_container_inner(&p.manifest, &p.ybin, &[], &[], &[], &[]).expect("écrit");
        assert_eq!(file, format::save(&d, &meta()).expect("save"));
    }
}
```

  `ContainerReader` n'implémente pas `Debug` : `open_inner(...).err()` compile parce que `Result::err` n'exige rien du
  type `Ok` ; si `assert_eq!` sur un `Option<String>` le demande, il porte sur `String` seulement.

- [ ] **3. Les voir échouer** : `cargo test -p roomboard-formats-wasm 2>&1 | tail -20` → `cannot find type
  \`ContainerReader\``.

- [ ] **4. Code Rust**, en tête de `crates/roomboard-formats-wasm/src/lib.rs` :

```rust
//! Liaison wasm-bindgen du conteneur `.roomboard` (R8, DAR1) : second module Wasm, chargé par la page au premier besoin
//! (R10). Mince : `container::read` et `container::write`, rien d'autre. Chaque fonction exposée délègue à une fonction
//! `_inner` sans JsValue, seule testée en natif (hors wasm32, tout appel à JS panique).
use roomboard_core::format::Parts;
use roomboard_formats::container::{self, AssetBytes};
use wasm_bindgen::prelude::*;

/// Fichier lu : manifeste, `document.ybin`, assets triés par empreinte, avertissements en français (K11).
#[wasm_bindgen]
pub struct ContainerReader {
    manifest: Vec<u8>,
    ybin: Vec<u8>,
    assets: Vec<(String, Vec<u8>)>,
    warnings: Vec<String>,
}

impl ContainerReader {
    /// `container::read` ; le message d'erreur est le `Display` du cœur.
    pub fn open_inner(file: &[u8]) -> Result<ContainerReader, String> {
        let u = container::read(file).map_err(|e| e.to_string())?;
        Ok(ContainerReader {
            manifest: u.parts.manifest,
            ybin: u.parts.ybin,
            assets: u.assets,
            warnings: u.warnings,
        })
    }
}

#[wasm_bindgen]
impl ContainerReader {
    /// Lève une Error au message du cœur (« ce fichier n'est pas un document RoomBoard », « … endommagé : … »).
    pub fn open(file: &[u8]) -> Result<ContainerReader, JsError> {
        Self::open_inner(file).map_err(|m| JsError::new(&m))
    }
    pub fn manifest(&self) -> Vec<u8> {
        self.manifest.clone()
    }
    pub fn ybin(&self) -> Vec<u8> {
        self.ybin.clone()
    }
    pub fn asset_count(&self) -> u32 {
        self.assets.len() as u32
    }
    pub fn asset_id(&self, i: u32) -> Option<String> {
        self.assets.get(i as usize).map(|(id, _)| id.clone())
    }
    pub fn asset_bytes(&self, i: u32) -> Option<Vec<u8>> {
        self.assets.get(i as usize).map(|(_, b)| b.clone())
    }
    pub fn warnings(&self) -> Vec<String> {
        self.warnings.clone()
    }
}

/// Assets bout à bout dans `bytes`, découpés par `sizes` ; `ids`, `mimes`, `sizes` de même longueur.
pub fn write_container_inner(
    manifest: &[u8],
    ybin: &[u8],
    ids: &[String],
    mimes: &[String],
    sizes: &[u32],
    bytes: &[u8],
) -> Result<Vec<u8>, String> {
    if ids.len() != mimes.len() || ids.len() != sizes.len() {
        return Err(format!(
            "assets incohérents : {} empreintes, {} types, {} tailles",
            ids.len(),
            mimes.len(),
            sizes.len()
        ));
    }
    let total: u64 = sizes.iter().map(|&s| u64::from(s)).sum();
    if total != bytes.len() as u64 {
        return Err(format!(
            "assets incohérents : {total} octets annoncés, {} reçus",
            bytes.len()
        ));
    }
    let mut at = 0usize;
    let mut assets = Vec::with_capacity(ids.len());
    for ((id, mime), &size) in ids.iter().zip(mimes).zip(sizes) {
        let end = at + size as usize;
        assets.push(AssetBytes {
            id: id.as_str(),
            mime: mime.as_str(),
            bytes: &bytes[at..end],
        });
        at = end;
    }
    let parts = Parts {
        manifest: manifest.to_vec(),
        ybin: ybin.to_vec(),
    };
    container::write(&parts, &assets).map_err(|e| e.to_string())
}

/// Écrit le `.roomboard` : manifeste et `document.ybin` du cœur, puis les assets (K12). Lève une Error lisible.
#[wasm_bindgen]
pub fn write_container(
    manifest: &[u8],
    ybin: &[u8],
    ids: Vec<String>,
    mimes: Vec<String>,
    sizes: Vec<u32>,
    bytes: &[u8],
) -> Result<Vec<u8>, JsError> {
    write_container_inner(manifest, ybin, &ids, &mimes, &sizes, bytes).map_err(|m| JsError::new(&m))
}
```

- [ ] **5. Voir les tests passer** ; `cargo build --workspace` met `Cargo.lock` à jour (un paquet
  `roomboard-formats-wasm`, aucun crate externe nouveau : `git diff --stat Cargo.lock` ne montre que ce bloc).

- [ ] **6. `verifier.sh`.** Après `WASM_OUT=apps/web/src/wasm` (ligne 16), ajouter `FORMATS_OUT=apps/web/src/wasm-formats`.
  Après le `wasm-bindgen` du module principal (lignes 32-34), ajouter :

```bash
# Second module (R8, R9) : conteneur avec assets, chargé par la page au premier besoin ; 3 Mio au plus.
cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release
rm -rf "$FORMATS_OUT"
wasm-bindgen --target web --remove-name-section --out-dir "$FORMATS_OUT" \
  target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm
taille_formats=$(wc -c < "$FORMATS_OUT/roomboard_formats_wasm_bg.wasm" | tr -d ' ')
echo "module formats : $taille_formats octets ($FORMATS_OUT/roomboard_formats_wasm_bg.wasm)"
if [ "$taille_formats" -gt 3145728 ]; then
  echo "verifier.sh : module formats trop gros ($taille_formats octets > 3 Mio, R9)" >&2
  exit 1
fi
```

  (La mesure passe sur l'asset de `apps/web/dist` en T9, quand l'amorce importe le module.)

- [ ] **7. Tests rouges du port**, `apps/web/src/platform/container.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import { CodecUnavailableError, createPageCodec, type FormatsBinding, type ReaderBinding } from "./container";

function fakeBinding(o: { assets?: Array<[string, Uint8Array]>; warnings?: string[]; refuse?: string } = {}) {
  const freed: number[] = [];
  const writes: unknown[][] = [];
  let opened = 0;
  const binding: FormatsBinding = {
    ContainerReader: {
      open(file: Uint8Array): ReaderBinding {
        if (o.refuse !== undefined) throw new Error(o.refuse);
        const n = ++opened;
        const assets = o.assets ?? [];
        return {
          manifest: () => new Uint8Array([1]),
          ybin: () => file,
          asset_count: () => assets.length,
          asset_id: (i) => assets[i]?.[0],
          asset_bytes: (i) => assets[i]?.[1],
          warnings: () => o.warnings ?? [],
          free: () => {
            freed.push(n);
          },
        };
      },
    },
    write_container: (...args) => {
      writes.push(args);
      return new Uint8Array([9, 9]);
    },
  };
  return { binding, freed, writes };
}

const blobOf = (...b: number[]): Blob => new Blob([new Uint8Array(b)]);

describe("codec du conteneur dans la page (R10, DAR1)", () => {
  it("module chargé au premier besoin, une seule fois", async () => {
    const f = fakeBinding();
    const load = vi.fn(async () => f.binding);
    const codec = createPageCodec(load);
    expect(load).not.toHaveBeenCalled();
    await codec.read(blobOf(1));
    await codec.read(blobOf(2));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("read : manifeste, ybin, assets en Blob, avertissements ; lecteur libéré", async () => {
    const id = "a".repeat(64);
    const f = fakeBinding({ assets: [[id, new Uint8Array([1, 2, 3])]], warnings: ["asset ignoré : x"] });
    const c = await createPageCodec(async () => f.binding).read(blobOf(7, 8));
    expect([Array.from(c.manifest), Array.from(c.ybin), c.warnings]).toEqual([[1], [7, 8], ["asset ignoré : x"]]);
    expect(c.assets.map(([i]) => i)).toEqual([id]);
    expect(Array.from(new Uint8Array(await c.assets[0]![1].arrayBuffer()))).toEqual([1, 2, 3]);
    expect(f.freed).toEqual([1]);
  });

  it("fichier refusé : l'erreur du cœur passe telle quelle (pas un module indisponible)", async () => {
    const f = fakeBinding({ refuse: "ce fichier n'est pas un document RoomBoard" });
    const r = createPageCodec(async () => f.binding).read(blobOf(1));
    await expect(r).rejects.toThrow("ce fichier n'est pas un document RoomBoard");
    await expect(r).rejects.not.toBeInstanceOf(CodecUnavailableError);
  });

  it("module qui ne se charge pas : CodecUnavailableError, nouvel essai au besoin suivant", async () => {
    const f = fakeBinding();
    const load = vi.fn<() => Promise<FormatsBinding>>().mockRejectedValueOnce(new Error("404")).mockResolvedValue(f.binding);
    const codec = createPageCodec(load);
    const first = codec.read(blobOf(1));
    await expect(first).rejects.toBeInstanceOf(CodecUnavailableError);
    await expect(first).rejects.toThrow("module des images indisponible : 404");
    await expect(codec.read(blobOf(1))).resolves.toMatchObject({ warnings: [] });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("write : assets bout à bout, empreintes, types et tailles dans l'ordre reçu", async () => {
    const f = fakeBinding();
    const m = new Uint8Array([1]);
    const y = new Uint8Array([2]);
    const out = await createPageCodec(async () => f.binding).write(m, y, [
      { id: "a", mime: "image/png", blob: blobOf(1, 2) },
      { id: "b", mime: "image/gif", blob: blobOf(3) },
    ]);
    expect(Array.from(out)).toEqual([9, 9]);
    const [wm, wy, ids, mimes, sizes, bytes] = f.writes[0]!;
    expect([wm, wy, ids, mimes]).toEqual([m, y, ["a", "b"], ["image/png", "image/gif"]]);
    expect([Array.from(sizes as Uint32Array), Array.from(bytes as Uint8Array)]).toEqual([[2, 1], [1, 2, 3]]);
  });
});
```

- [ ] **8. Les voir échouer** (`Failed to resolve import "./container"`), puis écrire
  `apps/web/src/platform/container.ts` :

```ts
/**
 * Conteneur `.roomboard` avec assets, servi dans la page (R10, DAR1) : second module Wasm (`roomboard-formats-wasm`),
 * chargé au premier besoin par le `load` reçu et gardé jusqu'au rechargement (HR6). Port asynchrone, `Blob` en entrée :
 * un Worker pourra le servir sans changer les appelants. Module qui ne se charge pas : `CodecUnavailableError` (repli R7).
 */
export interface ContainerAsset {
  readonly id: string;
  readonly mime: string;
  readonly blob: Blob;
}

export interface ContainerContents {
  readonly manifest: Uint8Array;
  readonly ybin: Uint8Array;
  /** Triés par empreinte (ordre du conteneur). */
  readonly assets: ReadonlyArray<readonly [string, Blob]>;
  /** Entrées `assets/` ignorées, en français (K11). */
  readonly warnings: readonly string[];
}

export interface ContainerCodec {
  /** Lève `CodecUnavailableError` si le module ne se charge pas ; une Error au message du cœur si le fichier est refusé. */
  read(file: Blob): Promise<ContainerContents>;
  /** Manifeste et `document.ybin` de `saveParts`, puis les assets ; lève si une empreinte ne correspond pas. */
  write(manifest: Uint8Array, ybin: Uint8Array, assets: readonly ContainerAsset[]): Promise<Uint8Array>;
}

export class CodecUnavailableError extends Error {
  constructor(cause: unknown) {
    super(`module des images indisponible : ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "CodecUnavailableError";
  }
}

/** Forme du lecteur généré par wasm-bindgen (`ContainerReader`). */
export interface ReaderBinding {
  manifest(): Uint8Array;
  ybin(): Uint8Array;
  asset_count(): number;
  asset_id(i: number): string | undefined;
  asset_bytes(i: number): Uint8Array | undefined;
  warnings(): string[];
  free(): void;
}

/** Forme du module généré (`apps/web/src/wasm-formats/roomboard_formats_wasm.js`), après son initialisation. */
export interface FormatsBinding {
  readonly ContainerReader: { open(file: Uint8Array): ReaderBinding };
  write_container(
    manifest: Uint8Array,
    ybin: Uint8Array,
    ids: string[],
    mimes: string[],
    sizes: Uint32Array,
    bytes: Uint8Array,
  ): Uint8Array;
}

export function createPageCodec(load: () => Promise<FormatsBinding>): ContainerCodec {
  let loading: Promise<FormatsBinding> | null = null;
  const binding = async (): Promise<FormatsBinding> => {
    loading ??= load();
    try {
      return await loading;
    } catch (e) {
      loading = null; // un nouvel essai au prochain besoin
      throw new CodecUnavailableError(e);
    }
  };
  return {
    async read(file) {
      const mod = await binding();
      const reader = mod.ContainerReader.open(new Uint8Array(await file.arrayBuffer()));
      try {
        const assets: Array<readonly [string, Blob]> = [];
        for (let i = 0; i < reader.asset_count(); i++) {
          const id = reader.asset_id(i);
          const bytes = reader.asset_bytes(i);
          // wasm-bindgen rend un tableau neuf sur un ArrayBuffer à lui : le Blob le prend sans copie.
          if (id !== undefined && bytes !== undefined) assets.push([id, new Blob([bytes as Uint8Array<ArrayBuffer>])] as const);
        }
        return { manifest: reader.manifest(), ybin: reader.ybin(), assets, warnings: reader.warnings() };
      } finally {
        reader.free();
      }
    },
    async write(manifest, ybin, assets) {
      const mod = await binding();
      const chunks = await Promise.all(assets.map(async (a) => new Uint8Array(await a.blob.arrayBuffer())));
      const bytes = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
      let at = 0;
      for (const c of chunks) {
        bytes.set(c, at);
        at += c.byteLength;
      }
      return mod.write_container(
        manifest,
        ybin,
        assets.map((a) => a.id),
        assets.map((a) => a.mime),
        Uint32Array.from(chunks, (c) => c.byteLength),
        bytes,
      );
    },
  };
}
```

  `apps/web/src/platform/container-load.ts` :

```ts
/**
 * Chargement réel du second module (R10) : `import()` au premier besoin. Séparé de `container.ts` pour qu'aucun test
 * ne résolve `src/wasm-formats/` (construit par `verifier.sh`, absent d'un worktree neuf). Importé par l'amorce seule.
 */
import type { FormatsBinding } from "./container";

export async function loadFormatsModule(): Promise<FormatsBinding> {
  const m = await import("../wasm-formats/roomboard_formats_wasm");
  await m.default();
  return m;
}
```

- [ ] **9. Contrat sur le vrai module**, `apps/web/src/platform/container.contract.test.ts` (même patron que
  `core/wasm-core.contract.test.ts:12-21`, `:784`) :

```ts
// Contrat du second module Wasm (R8, R25) : chargé en Node par `initSync` sur les octets, joué à travers `createPageCodec`.
// Sous `verifier.sh` (ROOMBOARD_WASM_REQUIRED=1), un `.wasm` absent fait échouer le contrat au lieu de le sauter.
import { describe, expect, it } from "vitest";
import { createPageCodec, type FormatsBinding } from "./container";

// `apps/web` n'a pas `@types/node` : `node:fs` et `node:crypto` par import dynamique typé localement.
interface NodeFs { existsSync(p: URL): boolean; readFileSync(p: URL): Uint8Array }
const fs = (await import(/* @vite-ignore */ `node:${"fs"}`)) as NodeFs;
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const wasmFile = new URL("../wasm-formats/roomboard_formats_wasm_bg.wasm", import.meta.url);
const present = fs.existsSync(wasmFile);
const required = env["ROOMBOARD_WASM_REQUIRED"] === "1";

it("le module formats est présent quand il est exigé", () => {
  if (required) expect(present).toBe(true);
});

interface FormatsJs extends FormatsBinding { initSync(o: { module: Uint8Array }): unknown }
async function loadFormats(): Promise<FormatsBinding> {
  const href = new URL("../wasm-formats/roomboard_formats_wasm.js", import.meta.url).href;
  const mod = (await import(/* @vite-ignore */ href)) as FormatsJs;
  mod.initSync({ module: fs.readFileSync(wasmFile) });
  return mod;
}
const binding: FormatsBinding | null = present ? await loadFormats() : null;
const need = (): FormatsBinding => {
  if (binding === null) throw new Error("module formats absent");
  return binding;
};

const hex = (b: ArrayBuffer): string => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
const sha256 = async (bytes: Uint8Array<ArrayBuffer>): Promise<string> => hex(await crypto.subtle.digest("SHA-256", bytes));
const MANIFEST = new TextEncoder().encode(
  JSON.stringify({ format: "roomboard", formatVersion: 1, schema: 1, appVersion: "0.1.0", created: "c", modified: "m" }),
);
const YBIN = new Uint8Array([0, 0]);

describe.skipIf(binding === null)("contrat du module formats (R8)", () => {
  it("écrire puis lire : manifeste, ybin et asset rendus à l'identique, empreinte SHA-256", async () => {
    const codec = createPageCodec(async () => need());
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    const id = await sha256(png);
    const file = await codec.write(MANIFEST, YBIN, [{ id, mime: "image/png", blob: new Blob([png]) }]);
    const back = await codec.read(new Blob([file.slice()]));
    expect([Array.from(back.manifest), Array.from(back.ybin), back.warnings]).toEqual([Array.from(MANIFEST), [0, 0], []]);
    expect(back.assets.map(([i]) => i)).toEqual([id]);
    expect(Array.from(new Uint8Array(await back.assets[0]![1].arrayBuffer()))).toEqual(Array.from(png));
  });

  it("empreinte fausse : écriture refusée avec le message du conteneur", async () => {
    const codec = createPageCodec(async () => need());
    await expect(codec.write(MANIFEST, YBIN, [{ id: "0".repeat(64), mime: "image/png", blob: new Blob([new Uint8Array([1])]) }]))
      .rejects.toThrow("ne correspond pas à son empreinte");
  });

  it("octets qui ne sont pas un .roomboard : message du cœur", async () => {
    await expect(createPageCodec(async () => need()).read(new Blob([new Uint8Array([1, 2, 3])])))
      .rejects.toThrow("ce fichier n'est pas un document RoomBoard");
  });
});
```

- [ ] **10. Preuve** : toutes les commandes de la rubrique « Test », dans l'ordre (le contrat et `tsc` après la
  construction du module).

- [ ] **11. Commit.**

```bash
git add crates/roomboard-formats-wasm/Cargo.toml crates/roomboard-formats-wasm/src/lib.rs Cargo.toml Cargo.lock .gitignore scripts/verifier.sh apps/web/src/platform/container.ts apps/web/src/platform/container-load.ts apps/web/src/platform/container.test.ts apps/web/src/platform/container.contract.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(formats): second Wasm module for the asset container, page codec port

roomboard-formats-wasm binds container::read and container::write;
the page loads it on first need behind ContainerCodec; verifier.sh
builds it and caps it at 3 MiB.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Lignes exigées : `Réutilisation : appelé container::read, container::write` et la taille mesurée
(`module formats : N octets`).

---

### Tâche T3 — Registre d'import et module image
<a id="tache-t3"></a>

**Objectif.** `createImporter` devient le registre d'U23 (R1) : `roomboard` (document, par l'extension) puis `image`
(objet, par octets magiques dans les 4 096 premiers octets) ; non reconnu : `LATER_FORMAT_MESSAGE`. Limite web de 100 Mo
contrôlée avant lecture (R15) ; onglet cible lu une fois au début (R3) ; point et taille d'insertion (R4, R5) ;
`AddImage` (R6) ; en-tête PNG et JPEG lu avant décodage, 100 Mpx au plus, bitmap d'affichage réduit à 4 096 (R15) ;
HEIC illisible, TIFF refusé, RAW non reconnu (R14) ; décodage par `createImageBitmap` (R13). `ImportReport` gagne
`inserted`.

**Fichiers.**
- Créer : `apps/web/src/platform/image-import.ts`, `apps/web/src/platform/image-import.test.ts`.
- Modifier : `apps/web/src/platform/import.ts` (réécrit), `apps/web/src/platform/import.test.ts`.

**Interfaces.**
- Consomme : `DroppedFile`, `Point`, `SaveTarget` (`platform/files.ts`, inchangés) ; `Command`, `Change`, `Matrix`
  (`core/api.ts`) ; `AssetStore` (`core/asset-store.ts`) ; `Camera`, `screenToWorld`, `IDENTITY` (`engine/camera.ts`) ;
  `PAGE_WIDTH` (`engine/page.ts`, jamais `core/`) ; `messageOf` (`platform/controller.ts`).
- Produit (`platform/image-import.ts`) :
  - `type ImageKind = "png" | "jpeg" | "gif" | "webp" | "bmp" | "ico" | "svg" | "avif" | "heic"`
  - `const IMAGE_MIME: Readonly<Record<ImageKind, string>>`, `HEAD_BYTES = 4096`, `MAX_PIXELS = 100_000_000`,
    `DISPLAY_MAX = 4096`, `CASCADE_STEP = 24`, `FIT_SHARE = 0.8`, `HEIC_UNREADABLE = "HEIC illisible sur ce poste"`,
    `TOO_MANY_PIXELS = "image trop grande (plus de 100 millions de pixels)"`
  - `sniffImage(head: Uint8Array, name: string): ImageKind | null` ; `kindOfMime(mime: string): ImageKind | null`
  - `probeSize(blob: Blob, kind: ImageKind): Promise<{ readonly w: number; readonly h: number } | null>` ;
    `jpegSize(b: Uint8Array): { readonly w: number; readonly h: number } | null`
  - `interface DecodedImage { readonly bitmap: ImageBitmap; readonly w: number; readonly h: number }` ;
    `interface DecodePorts { createImageBitmap(src: ImageBitmapSource, opts?: ImageBitmapOptions): Promise<ImageBitmap>; loadSvg(blob: Blob): Promise<ImageBitmapSource> }` ;
    `class ImageTooLargeError extends Error` ; `browserDecodePorts(): DecodePorts` ;
    `decodeImage(blob: Blob, kind: ImageKind, max = DISPLAY_MAX, ports: DecodePorts = browserDecodePorts()): Promise<DecodedImage>` ;
    `type ImageDecoder = (blob: Blob, kind: ImageKind) => Promise<DecodedImage>`
  - `interface StageRect { readonly left: number; readonly top: number; readonly width: number; readonly height: number }` ;
    `anchorOf(rect: StageRect, camera: Camera, at: Point | null): readonly [number, number]` ;
    `visibleOf(rect: StageRect, camera: Camera): { readonly w: number; readonly h: number }` ;
    `placement(w: number, h: number, anchor: readonly [number, number], visible: { readonly w: number; readonly h: number }, index: number): Matrix`
  - `interface ImageTarget { readonly assets: Pick<AssetStore, "put">; page(): string; camera(): Camera; stageRect(): StageRect; run(cmd: Command): Change | null }`
  - `imageHandler(deps?: { readonly decode?: ImageDecoder }): ImportHandler`
- Produit (`platform/import.ts`) :
  - `LATER_FORMAT_MESSAGE` (inchangé), `WEB_MAX_BYTES = 100 * 1024 * 1024`,
    `tooBigMessage(names: readonly string[], max: number): string`
  - `interface ImportReport { readonly opened: readonly string[]; readonly inserted: readonly string[]; readonly refused: readonly string[]; readonly failed: readonly string[] }`
  - `interface ImportDeps { openDocument(...); notify(message: string): Promise<void>; full?(): boolean; target?(): ImageTarget | null; readonly maxBytes?: number | null; readonly decode?: ImageDecoder }`
  - `interface ImportContext { readonly blob: Blob; readonly head: Uint8Array; readonly at: Point | null; readonly inserted: number; readonly target: ImageTarget | null; notify(message: string): Promise<void> }`
  - `type ImportOutcome = "opened" | "inserted" | "failed"` ;
    `interface ImportHandler { readonly id: string; readonly nature: "document" | "objet"; detect(head: Uint8Array, name: string): boolean; run(file: DroppedFile, ctx: ImportContext): Promise<ImportOutcome> }`
  - `isRoomboardName(name)` (inchangé), `createImporter(deps: ImportDeps): Importer` (`Importer` inchangé).
- Réutilise : `apps/web/src/platform/import.ts:32` — `createImporter(deps).importFiles(files, at)` étendu en registre
  `ImportHandler` (U23).
- Réutilise : `apps/web/src/platform/import.ts:28` — `isRoomboardName(name)` (détection de l'entrée `roomboard`).
- Réutilise : `apps/web/src/platform/host-tauri.ts:67` — `grantedFile(ipc, path, size)` : son `blob()` (lecture par
  morceaux dans la coque) est appelé **une fois** par fichier (`ImportContext.blob`), jamais deux.
- Réutilise : `apps/web/src/core/asset-store.ts:26` — `AssetStore.put(blob)` (empreinte de l'image insérée).
- Réutilise : `apps/web/src/engine/engine.ts:68` — `engine.run({ type: "AddImage", … })`, par `ImageTarget.run` (branché
  par T7).
- Réutilise : `apps/web/src/engine/camera.ts:16` — `screenToWorld(camera, sx, sy)`.
- Réutilise : aucun module pour détection, en-tête et décodage (nouveau, DAR3 ; `magic`, `createImageBitmap`,
  `ImageBitmap` sans résultat dans `apps/`) — `image-import.ts`.

**Contraintes (recopiées).** GC1 TDD. GC3 aucun test sauté. GC4 fichiers un par un. GC5 PATH avant pnpm. GC6 un rejeu
sur délai. GC7 images fabriquées dans le test (en-têtes construits octet par octet). GC10 aucune copie de `PAGE_WIDTH`
dans `core/` (`engine/page.ts` est importé). GC11 commit. GC12 worktree neuf.

**Interdits.** Toucher `workspace.ts` (T5, T7) ou `files.ts` (T5) ; changer le texte de `LATER_FORMAT_MESSAGE` ;
reconnaître le TIFF ou un RAW ; insérer un SVG dans le DOM.

**Test et commande bornée.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
pnpm --filter @roomboard/web exec vitest run src/platform/import.test.ts src/platform/image-import.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Tests " | tail -50
pnpm --filter @roomboard/web exec vitest run src/app/workspace.test.ts 2>&1 | grep -E "FAIL|Tests " | tail -5
pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20
```
Motif de réussite : `Tests  N passed (N)` avec N ≥ 30 pour les deux fichiers, noms `PNG reconnu par ses octets` et
`plus de maxBytes` présents ; `workspace.test.ts` reste vert (il crée l'importeur sans `target`) ; `tsc` sans sortie.

**Terminé quand.** Les deux fichiers de tests passent, `workspace.test.ts` reste vert, `tsc` propre, un commit.

**Étapes.**

- [ ] **1. Tests rouges du module image**, `apps/web/src/platform/image-import.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import { IDENTITY } from "../engine/camera";
import {
  anchorOf,
  decodeImage,
  ImageTooLargeError,
  jpegSize,
  kindOfMime,
  placement,
  probeSize,
  sniffImage,
  visibleOf,
  type DecodePorts,
} from "./image-import";

const bytes = (...parts: Array<readonly number[] | string>): Uint8Array<ArrayBuffer> =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : [...p])));
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
function pngHead(w: number, h: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(33);
  b.set([...PNG_SIG, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const v = new DataView(b.buffer);
  v.setUint32(16, w);
  v.setUint32(20, h);
  b.set([8, 6, 0, 0, 0], 24);
  return b;
}
/** SOI, APP0 de 16 octets, puis SOF0 (hauteur, largeur gros-boutistes). */
const jpeg = (w: number, h: number): Uint8Array<ArrayBuffer> =>
  bytes([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10], "JFIF\0", [1, 1, 0, 0, 1, 0, 1, 0, 0],
    [0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 0xff, w >> 8, w & 0xff, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]);

describe("sniffImage (R1, R14)", () => {
  const cases: Array<[string, Uint8Array, string]> = [
    ["png", pngHead(1, 1), "a"],
    ["jpeg", bytes([0xff, 0xd8, 0xff, 0xe0]), "a"],
    ["gif", bytes("GIF89a", [1, 0, 1, 0]), "a"],
    ["webp", bytes("RIFF", [0, 0, 0, 0], "WEBPVP8 "), "a"],
    ["bmp", bytes("BM", new Array<number>(24).fill(0)), "a"],
    ["ico", bytes([0, 0, 1, 0, 1, 0, 16, 16]), "a"],
    ["avif", bytes([0, 0, 0, 0x1c], "ftypavif", [0, 0, 0, 0], "avifmif1"), "a"],
    ["heic", bytes([0, 0, 0, 0x18], "ftypheic", [0, 0, 0, 0], "mif1heic"), "a"],
    ["svg", bytes('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"/>'), "a"],
    ["svg", bytes([0xef, 0xbb, 0xbf], "  <svg viewBox='0 0 1 1'></svg>"), "dessin"],
  ];
  for (const [kind, head, name] of cases) it(`${kind} reconnu par ses octets`, () => expect(sniffImage(head, name)).toBe(kind));

  it("TIFF, ZIP, texte et HTML : non reconnus (R14 : TIFF refusé)", () => {
    expect(sniffImage(bytes([0x49, 0x49, 0x2a, 0x00]), "photo.tif")).toBeNull();
    expect(sniffImage(bytes([0x4d, 0x4d, 0x00, 0x2a]), "photo.tiff")).toBeNull();
    expect(sniffImage(bytes([0x50, 0x4b, 3, 4]), "a.png")).toBeNull();
    expect(sniffImage(bytes("bonjour"), "a.txt")).toBeNull();
    expect(sniffImage(bytes("<html><body></body></html>"), "a.html")).toBeNull();
  });

  it("le nom ne décide pas : un PNG nommé .jpg est un PNG", () => expect(sniffImage(pngHead(1, 1), "photo.jpg")).toBe("png"));
});

describe("kindOfMime", () => {
  it("types connus, variantes ICO et HEIF ; inconnu : null", () => {
    expect(["image/png", "image/vnd.microsoft.icon", "image/heif", "", "application/octet-stream"].map(kindOfMime))
      .toEqual(["png", "ico", "heic", null, null]);
  });
});

describe("probeSize (R15 : en-tête PNG et JPEG seulement)", () => {
  it("PNG : IHDR", async () => expect(await probeSize(new Blob([pngHead(640, 480)]), "png")).toEqual({ w: 640, h: 480 }));
  it("JPEG : premier SOFn après APP0", async () => expect(await probeSize(new Blob([jpeg(640, 480)]), "jpeg")).toEqual({ w: 640, h: 480 }));
  it("autres formats : null (contrôlés après décodage)", async () => expect(await probeSize(new Blob([bytes("GIF89a")]), "gif")).toBeNull());
  it("JPEG : SOS avant tout SOFn → null", () => expect(jpegSize(bytes([0xff, 0xd8, 0xff, 0xda, 0, 2], new Array<number>(10).fill(0)))).toBeNull());
});

function ports(w: number, h: number) {
  const made: Array<{ width: number; height: number; close: ReturnType<typeof vi.fn> }> = [];
  const calls: Array<[unknown, ImageBitmapOptions | undefined]> = [];
  const loadSvg = vi.fn(async () => ({ svg: true }) as unknown as ImageBitmapSource);
  const p: DecodePorts = {
    async createImageBitmap(src, opts) {
      calls.push([src, opts]);
      const bmp = { width: opts?.resizeWidth ?? w, height: opts?.resizeHeight ?? h, close: vi.fn() };
      made.push(bmp);
      return bmp as unknown as ImageBitmap;
    },
    loadSvg,
  };
  return { p, made, calls, loadSvg };
}

describe("decodeImage (R13, R15)", () => {
  it("petite image : bitmap rendu tel quel, orientation EXIF appliquée", async () => {
    const t = ports(640, 480);
    const d = await decodeImage(new Blob([pngHead(640, 480)]), "png", 4096, t.p);
    expect([d.w, d.h, d.bitmap]).toEqual([640, 480, t.made[0]]);
    expect(t.calls[0]![1]).toEqual({ imageOrientation: "from-image" });
    expect(t.made[0]!.close).not.toHaveBeenCalled();
  });

  it("côté le plus long au-delà de 4 096 : bitmap réduit, taille source rendue, original fermé", async () => {
    const t = ports(8192, 4096);
    const d = await decodeImage(new Blob([pngHead(8192, 4096)]), "png", 4096, t.p);
    expect(t.calls[1]![1]).toEqual({ resizeWidth: 4096, resizeHeight: 2048, resizeQuality: "high" });
    expect([d.w, d.h, d.bitmap]).toEqual([8192, 4096, t.made[1]]);
    expect(t.made[0]!.close).toHaveBeenCalledTimes(1);
  });

  it("plus de 100 Mpx après décodage : ImageTooLargeError, bitmap fermé", async () => {
    const t = ports(20000, 6000);
    await expect(decodeImage(new Blob([bytes("GIF89a")]), "gif", 4096, t.p)).rejects.toBeInstanceOf(ImageTooLargeError);
    expect(t.made[0]!.close).toHaveBeenCalledTimes(1);
    expect(t.calls).toHaveLength(1);
  });

  it("SVG : image hors DOM sur une URL blob:, puis createImageBitmap de cette image", async () => {
    const t = ports(4, 4);
    const blob = new Blob([bytes("<svg/>")], { type: "image/svg+xml" });
    await decodeImage(blob, "svg", 4096, t.p);
    expect(t.loadSvg).toHaveBeenCalledWith(blob);
    expect(t.calls[0]![0]).toEqual({ svg: true });
  });
});

describe("géométrie d'insertion (R4, R5)", () => {
  const rect = { left: 10, top: 20, width: 800, height: 600 };
  const cam = { zoom: 2, tx: 100, ty: 50 };

  it("anchorOf : point dans le stage → monde ; nul ou hors du stage → centre de la vue", () => {
    expect(anchorOf(rect, cam, { x: 110, y: 70 })).toEqual([0, 0]);
    expect(anchorOf(rect, cam, null)).toEqual([150, 125]);
    expect(anchorOf(rect, cam, { x: 5, y: 5 })).toEqual([150, 125]);
  });

  it("visibleOf : largeur coupée au bord de la page, hauteur de la vue ; page hors vue : largeur de la vue", () => {
    expect(visibleOf({ left: 0, top: 0, width: 800, height: 600 }, IDENTITY)).toEqual({ w: 800, h: 600 });
    expect(visibleOf({ left: 0, top: 0, width: 1280, height: 900 }, { zoom: 0.5, tx: 0, ty: 0 })).toEqual({ w: 1920, h: 1800 });
    expect(visibleOf({ left: 0, top: 0, width: 800, height: 600 }, { zoom: 1, tx: -3000, ty: 0 })).toEqual({ w: 800, h: 600 });
  });

  it("placement : centrée, 1 px = 1 unité, cascade de 24", () => {
    expect(placement(200, 100, [400, 300], { w: 800, h: 600 }, 0)).toEqual([1, 0, 0, 1, 300, 250]);
    expect(placement(200, 100, [400, 300], { w: 800, h: 600 }, 2)).toEqual([1, 0, 0, 1, 348, 298]);
  });

  it("placement : réduite pour tenir dans 80 % du visible, jamais agrandie", () => {
    const m = placement(4000, 1000, [400, 300], { w: 800, h: 600 }, 0);
    for (const [i, v] of [0.16, 0, 0, 0.16, 80, 220].entries()) expect(m[i]).toBeCloseTo(v, 9);
    expect(placement(10, 10, [0, 0], { w: 800, h: 600 }, 0)[0]).toBe(1);
  });

  it("placement : rapport extrême (50 000 × 1) : facteur fini et positif", () => {
    const m = placement(50000, 1, [0, 0], { w: 800, h: 600 }, 0);
    expect(m[0]).toBeCloseTo(0.0128, 9);
    expect(m.every(Number.isFinite)).toBe(true);
  });

  it("placement : vue nulle (stage caché) : taille source, jamais 0", () => {
    expect(placement(200, 100, [0, 0], { w: 0, h: 0 }, 0)[0]).toBe(1);
  });
});
```

- [ ] **2. Les voir échouer** : `pnpm --filter @roomboard/web exec vitest run src/platform/image-import.test.ts 2>&1 |
  tail -5` → `Failed to resolve import "./image-import"`.

- [ ] **3. Écrire `apps/web/src/platform/image-import.ts`** :

```ts
/**
 * Module image (DAR3, U26, U33) : reconnaissance par octets magiques, taille lue dans l'en-tête (PNG, JPEG seulement,
 * R15), décodage par le navigateur (R13), géométrie d'insertion (R4, R5) et l'entrée `image` du registre d'import (R1).
 * Partagé par le dépôt, le collage, « Importer » et le cache des bitmaps du rendu. Jamais de SVG dans le DOM.
 */
import type { Change, Command, Matrix } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import { screenToWorld, type Camera } from "../engine/camera";
import { PAGE_WIDTH } from "../engine/page";
import { messageOf } from "./controller";
import type { Point } from "./files";
import type { ImportHandler } from "./import";

export type ImageKind = "png" | "jpeg" | "gif" | "webp" | "bmp" | "ico" | "svg" | "avif" | "heic";

export const IMAGE_MIME: Readonly<Record<ImageKind, string>> = Object.freeze({
  png: "image/png",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  ico: "image/x-icon",
  svg: "image/svg+xml",
  avif: "image/avif",
  heic: "image/heic",
});

export const HEAD_BYTES = 4096;
export const MAX_PIXELS = 100_000_000;
export const DISPLAY_MAX = 4096;
export const CASCADE_STEP = 24;
export const FIT_SHARE = 0.8;
export const HEIC_UNREADABLE = "HEIC illisible sur ce poste";
export const TOO_MANY_PIXELS = "image trop grande (plus de 100 millions de pixels)";
/** Le SOFn d'un JPEG est cherché dans le premier Mio (blocs EXIF compris). */
const JPEG_SCAN = 1 << 20;

const starts = (h: Uint8Array, sig: readonly number[]): boolean => sig.every((b, i) => h[i] === b);
const ascii = (h: Uint8Array, from: number, to: number): string => String.fromCharCode(...h.subarray(from, to));

function isSvg(head: Uint8Array, name: string): boolean {
  const text = new TextDecoder("utf-8").decode(head).replace(/^\uFEFF/, "").trimStart();
  if (!text.startsWith("<")) return false;
  return /<svg[\s>/]/i.test(text) || (name.toLowerCase().endsWith(".svg") && /^<\?xml/i.test(text));
}

/** Format d'image d'après les premiers octets ; `name` ne sert qu'au SVG sans balise `<svg` dans l'en-tête. */
export function sniffImage(head: Uint8Array, name: string): ImageKind | null {
  if (starts(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (starts(head, [0xff, 0xd8, 0xff])) return "jpeg";
  const six = ascii(head, 0, 6);
  if (six === "GIF87a" || six === "GIF89a") return "gif";
  if (ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 12) === "WEBP") return "webp";
  if (ascii(head, 0, 2) === "BM" && head.length >= 26) return "bmp";
  if (starts(head, [0x00, 0x00, 0x01, 0x00]) && head.length >= 6 && ((head[4] ?? 0) | (head[5] ?? 0)) !== 0) return "ico";
  if (ascii(head, 4, 8) === "ftyp") {
    const size = (((head[0] ?? 0) << 24) | ((head[1] ?? 0) << 16) | ((head[2] ?? 0) << 8) | (head[3] ?? 0)) >>> 0;
    const brands = ascii(head, 8, Math.min(head.length, Math.max(12, size)));
    if (/avi[fs]/.test(brands)) return "avif";
    if (/hei[cxms]|hev[cx]|mif1|msf1/.test(brands)) return "heic";
  }
  if (isSvg(head, name)) return "svg";
  return null;
}

export function kindOfMime(mime: string): ImageKind | null {
  if (mime === "image/vnd.microsoft.icon") return "ico";
  if (mime === "image/heif") return "heic";
  const found = (Object.keys(IMAGE_MIME) as ImageKind[]).find((k) => IMAGE_MIME[k] === mime);
  return found ?? null;
}

/** Premier segment SOFn (C0 à CF sauf C4, C8, CC) : hauteur puis largeur, gros-boutistes. */
export function jpegSize(b: Uint8Array): { readonly w: number; readonly h: number } | null {
  let i = 2;
  while (i + 8 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1] ?? 0;
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: ((b[i + 5] ?? 0) << 8) | (b[i + 6] ?? 0), w: ((b[i + 7] ?? 0) << 8) | (b[i + 8] ?? 0) };
    }
    if (marker === 0xd9 || marker === 0xda) return null;
    i += 2 + (((b[i + 2] ?? 0) << 8) | (b[i + 3] ?? 0));
  }
  return null;
}

/** Taille lue dans l'en-tête, avant tout décodage (R15) : PNG (IHDR) et JPEG (SOFn) ; null pour les autres. */
export async function probeSize(blob: Blob, kind: ImageKind): Promise<{ readonly w: number; readonly h: number } | null> {
  if (kind === "png") {
    const h = new Uint8Array(await blob.slice(0, 24).arrayBuffer());
    if (h.length < 24 || ascii(h, 12, 16) !== "IHDR") return null;
    const v = new DataView(h.buffer, h.byteOffset, h.byteLength);
    return { w: v.getUint32(16), h: v.getUint32(20) };
  }
  if (kind === "jpeg") return jpegSize(new Uint8Array(await blob.slice(0, JPEG_SCAN).arrayBuffer()));
  return null;
}

export interface DecodedImage {
  readonly bitmap: ImageBitmap;
  /** Taille source orientée (EXIF appliqué), en pixels. */
  readonly w: number;
  readonly h: number;
}

export interface DecodePorts {
  createImageBitmap(src: ImageBitmapSource, opts?: ImageBitmapOptions): Promise<ImageBitmap>;
  /** SVG : `HTMLImageElement` hors DOM sur une URL `blob:` (R13). */
  loadSvg(blob: Blob): Promise<ImageBitmapSource>;
}

export type ImageDecoder = (blob: Blob, kind: ImageKind) => Promise<DecodedImage>;

export class ImageTooLargeError extends Error {
  constructor() {
    super(TOO_MANY_PIXELS);
    this.name = "ImageTooLargeError";
  }
}

export function browserDecodePorts(): DecodePorts {
  return {
    createImageBitmap: (src, opts) => globalThis.createImageBitmap(src, opts),
    loadSvg: (blob) =>
      new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve(img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("SVG illisible"));
        };
        img.src = url;
      }),
  };
}

/** Décode ; refuse au-delà de 100 Mpx (bitmap fermé) ; côté le plus long au-delà de `max` : bitmap d'affichage réduit. */
export async function decodeImage(
  blob: Blob,
  kind: ImageKind,
  max = DISPLAY_MAX,
  ports: DecodePorts = browserDecodePorts(),
): Promise<DecodedImage> {
  const source: ImageBitmapSource = kind === "svg" ? await ports.loadSvg(blob) : blob;
  const full = await ports.createImageBitmap(source, { imageOrientation: "from-image" });
  const w = full.width;
  const h = full.height;
  if (w * h > MAX_PIXELS) {
    full.close();
    throw new ImageTooLargeError();
  }
  const side = Math.max(w, h);
  if (side <= max) return { bitmap: full, w, h };
  const k = max / side;
  try {
    const bitmap = await ports.createImageBitmap(full, {
      resizeWidth: Math.max(1, Math.round(w * k)),
      resizeHeight: Math.max(1, Math.round(h * k)),
      resizeQuality: "high",
    });
    return { bitmap, w, h };
  } finally {
    full.close();
  }
}

/** Rectangle du stage actif en px CSS de la fenêtre (`getBoundingClientRect`). */
export interface StageRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Point d'insertion monde (R4) : `at` dans le stage → monde ; `at` nul ou hors du stage → centre de la vue. */
export function anchorOf(rect: StageRect, camera: Camera, at: Point | null): readonly [number, number] {
  const inside =
    at !== null && at.x >= rect.left && at.x <= rect.left + rect.width && at.y >= rect.top && at.y <= rect.top + rect.height;
  const [x, y] = inside
    ? screenToWorld(camera, at.x - rect.left, at.y - rect.top)
    : screenToWorld(camera, rect.width / 2, rect.height / 2);
  return [x, y];
}

/** Partie visible de la page en unités monde (R5) : largeur coupée à [0, PAGE_WIDTH], hauteur de la vue (page infinie). */
export function visibleOf(rect: StageRect, camera: Camera): { readonly w: number; readonly h: number } {
  const [x0] = screenToWorld(camera, 0, 0);
  const [x1] = screenToWorld(camera, rect.width, rect.height);
  const w = Math.min(x1, PAGE_WIDTH) - Math.max(x0, 0);
  return { w: w > 0 ? w : rect.width / camera.zoom, h: rect.height / camera.zoom };
}

/** Matrice d'insertion (R4, R5) : réduite (jamais agrandie) à 80 % du visible, centrée sur `anchor`, décalée de 24 × `index`. */
export function placement(
  w: number,
  h: number,
  anchor: readonly [number, number],
  visible: { readonly w: number; readonly h: number },
  index: number,
): Matrix {
  const fit = (room: number, size: number): number => (room > 0 ? (FIT_SHARE * room) / size : 1);
  const s = Math.min(1, fit(visible.w, w), fit(visible.h, h));
  const d = CASCADE_STEP * index;
  return [s, 0, 0, s, anchor[0] - (s * w) / 2 + d, anchor[1] - (s * h) / 2 + d];
}

/** Onglet qui reçoit les objets (R3) : branché par l'espace de travail sur la session active. */
export interface ImageTarget {
  readonly assets: Pick<AssetStore, "put">;
  page(): string;
  camera(): Camera;
  stageRect(): StageRect;
  /** `engine.run` : null si le cœur refuse (message dans l'état du moteur). */
  run(cmd: Command): Change | null;
}

/** Entrée `image` du registre (R1) : en-tête, décodage, empreinte, `AddImage` en une étape (R6). */
export function imageHandler(deps: { readonly decode?: ImageDecoder } = {}): ImportHandler {
  const decode: ImageDecoder = deps.decode ?? ((b, k) => decodeImage(b, k));
  return {
    id: "image",
    nature: "objet",
    detect: (head, name) => sniffImage(head, name) !== null,
    async run(file, ctx) {
      const kind = sniffImage(ctx.head, file.name);
      const target = ctx.target;
      if (kind === null || target === null) return "failed";
      const mime = IMAGE_MIME[kind];
      try {
        const blob = ctx.blob.type === mime ? ctx.blob : new Blob([ctx.blob], { type: mime });
        const probed = await probeSize(blob, kind);
        if (probed !== null && probed.w * probed.h > MAX_PIXELS) {
          await ctx.notify(`${file.name} : ${TOO_MANY_PIXELS}`);
          return "failed";
        }
        let decoded: DecodedImage;
        try {
          decoded = await decode(blob, kind);
        } catch (e) {
          if (e instanceof ImageTooLargeError) await ctx.notify(`${file.name} : ${TOO_MANY_PIXELS}`);
          else if (kind === "heic") await ctx.notify(`${file.name} : ${HEIC_UNREADABLE}`);
          else await ctx.notify(`Image illisible (${file.name}) : ${messageOf(e)}`);
          return "failed";
        }
        decoded.bitmap.close(); // le rendu décode à nouveau depuis le magasin (cache par empreinte, DAR2)
        const id = await target.assets.put(blob);
        const rect = target.stageRect();
        const camera = target.camera();
        const change = target.run({
          type: "AddImage",
          page: target.page(),
          asset: { id, name: file.name, mime, size: blob.size },
          w: decoded.w,
          h: decoded.h,
          matrix: placement(decoded.w, decoded.h, anchorOf(rect, camera, ctx.at), visibleOf(rect, camera), ctx.inserted),
        });
        return change === null ? "failed" : "inserted";
      } catch (e) {
        await ctx.notify(`Import impossible (${file.name}) : ${messageOf(e)}`);
        return "failed";
      }
    },
  };
}
```

- [ ] **4. Voir passer** `image-import.test.ts` (après l'étape 6 si `import.ts` manque encore de `ImportHandler` :
  écrire d'abord les types de l'étape 6).

- [ ] **5. Tests rouges du registre.** Dans `apps/web/src/platform/import.test.ts` : en tête, importer
  `import type { Command } from "../core/api"; import { createAssetStore } from "../core/asset-store"; import { IDENTITY }
  from "../engine/camera"; import type { ImageTarget } from "./image-import";` et `WEB_MAX_BYTES` depuis `./import`.
  Dans chaque `toEqual` d'un rapport existant, ajouter `inserted: []` (lignes 15, 43, 70). Le test « fichier non
  .roomboard » (lignes 19-27) passe sur un `.tif` (R28) :

```ts
  it("fichier non reconnu : message, document intact (TIFF : prochaine version, R14, R28)", async () => {
    const openDocument = vi.fn(async () => true);
    const notify = vi.fn(async (_m: string) => undefined);
    const r = await createImporter({ openDocument, notify })
      .importFiles([file("photo.tif", new Uint8Array([0x49, 0x49, 0x2a, 0x00])), file("cours.flipchart")]);
    expect(openDocument).not.toHaveBeenCalled();
    expect(r.refused).toEqual(["photo.tif", "cours.flipchart"]);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0]![0]).toBe(`photo.tif, cours.flipchart : ${LATER_FORMAT_MESSAGE}`);
  });
```

  Puis ajouter, après le `describe` existant :

```ts
function pngHead(w: number, h: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const v = new DataView(b.buffer);
  v.setUint32(16, w);
  v.setUint32(20, h);
  b.set([8, 6, 0, 0, 0], 24);
  return b;
}
function fakeTarget(rect = { left: 0, top: 0, width: 800, height: 600 }) {
  const cmds: Command[] = [];
  const assets = createAssetStore();
  const target: ImageTarget = {
    assets,
    page: () => "p1",
    camera: () => IDENTITY,
    stageRect: () => rect,
    run: (cmd) => {
      cmds.push(cmd);
      return { pages: [], ids: [`e${cmds.length}`], removed: [], full: false, version: cmds.length };
    },
  };
  return { target, cmds, assets };
}
const decoded = (w: number, h: number) =>
  vi.fn(async (_b: Blob, _k: string) => ({ bitmap: { close: vi.fn() } as unknown as ImageBitmap, w, h }));
type AddImage = Extract<Command, { type: "AddImage" }>;

describe("importFiles : images (R1, R3 à R6, R14, R15)", () => {
  it("PNG reconnu par ses octets : AddImage dans l'onglet actif, centre de la vue, 1 px = 1 unité", async () => {
    const t = fakeTarget();
    const notify = vi.fn(async () => undefined);
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify, target: () => t.target, decode: decoded(200, 100) })
      .importFiles([file("a.png", pngHead(200, 100))], null);
    expect(r).toEqual({ opened: [], inserted: ["a.png"], refused: [], failed: [] });
    const cmd = t.cmds[0] as AddImage;
    expect([cmd.type, cmd.page, cmd.w, cmd.h, cmd.matrix]).toEqual(["AddImage", "p1", 200, 100, [1, 0, 0, 1, 300, 250]]);
    expect(cmd.asset).toMatchObject({ name: "a.png", mime: "image/png", size: 33 });
    expect(t.assets.has(cmd.asset.id)).toBe(true);
    expect(notify).not.toHaveBeenCalled();
  });

  it("point de dépôt dans le stage : image centrée sur ce point", async () => {
    const t = fakeTarget();
    await createImporter({ openDocument: vi.fn(async () => true), notify: vi.fn(async () => undefined), target: () => t.target, decode: decoded(200, 100) })
      .importFiles([file("a.png", pngHead(200, 100))], { x: 100, y: 50 });
    expect((t.cmds[0] as AddImage).matrix).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it("deux images : une étape chacune, la seconde décalée de 24 (cascade)", async () => {
    const t = fakeTarget();
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: vi.fn(async () => undefined), target: () => t.target, decode: decoded(200, 100) })
      .importFiles([file("a.png", pngHead(200, 100)), file("b.png", pngHead(200, 100))], null);
    expect(r.inserted).toEqual(["a.png", "b.png"]);
    expect(t.cmds.map((c) => (c as AddImage).matrix)).toEqual([[1, 0, 0, 1, 300, 250], [1, 0, 0, 1, 324, 274]]);
  });

  it("onglet cible lu une seule fois, au début de l'appel (R3)", async () => {
    const t = fakeTarget();
    const target = vi.fn(() => t.target);
    const openDocument = vi.fn(async () => true);
    const r = await createImporter({ openDocument, notify: vi.fn(async () => undefined), target, decode: decoded(10, 10) })
      .importFiles([file("b.roomboard"), file("a.png", pngHead(10, 10))], null);
    expect(target).toHaveBeenCalledTimes(1);
    expect([r.opened, r.inserted]).toEqual([["b.roomboard"], ["a.png"]]);
  });

  it("nom trompeur : un PNG nommé .jpg est inséré comme PNG", async () => {
    const t = fakeTarget();
    await createImporter({ openDocument: vi.fn(async () => true), notify: vi.fn(async () => undefined), target: () => t.target, decode: decoded(10, 10) })
      .importFiles([file("photo.jpg", pngHead(10, 10))], null);
    expect((t.cmds[0] as AddImage).asset.mime).toBe("image/png");
  });

  it("plus de maxBytes : refusé avant lecture, .roomboard compris, un seul message", async () => {
    const blob = vi.fn(async () => new Blob([pngHead(1, 1)]));
    const big = (name: string): DroppedFile => ({ name, size: 120 * 1024 * 1024, mime: "", blob });
    const notify = vi.fn(async (_m: string) => undefined);
    const openDocument = vi.fn(async () => true);
    const r = await createImporter({ openDocument, notify, maxBytes: WEB_MAX_BYTES, target: () => fakeTarget().target })
      .importFiles([big("gros.png"), big("gros.roomboard")]);
    expect(blob).not.toHaveBeenCalled();
    expect(openDocument).not.toHaveBeenCalled();
    expect(r.refused).toEqual(["gros.png", "gros.roomboard"]);
    expect(notify.mock.calls.map((c) => c[0])).toEqual(["gros.png, gros.roomboard : fichier trop gros (plus de 100 Mo)"]);
  });

  it("sans limite (coque) : un gros fichier passe", async () => {
    const t = fakeTarget();
    const f: DroppedFile = { name: "gros.png", size: 120 * 1024 * 1024, mime: "", blob: async () => new Blob([pngHead(10, 10)]) };
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: vi.fn(async () => undefined), target: () => t.target, decode: decoded(10, 10) })
      .importFiles([f]);
    expect(r.inserted).toEqual(["gros.png"]);
  });

  it("plus de 100 Mpx lus dans l'en-tête PNG : refus avant décodage", async () => {
    const decode = decoded(1, 1);
    const notify = vi.fn(async (_m: string) => undefined);
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify, target: () => fakeTarget().target, decode })
      .importFiles([file("big.png", pngHead(20000, 6000))]);
    expect(decode).not.toHaveBeenCalled();
    expect(r.failed).toEqual(["big.png"]);
    expect(notify).toHaveBeenCalledWith("big.png : image trop grande (plus de 100 millions de pixels)");
  });

  it("HEIC que la WebView ne lit pas : « HEIC illisible sur ce poste »", async () => {
    const head = new Uint8Array([0, 0, 0, 24, ...[..."ftypheic"].map((c) => c.charCodeAt(0)), 0, 0, 0, 0, ...[..."mif1heic"].map((c) => c.charCodeAt(0))]);
    const decode = vi.fn(async (): Promise<never> => {
      throw new Error("format non pris en charge");
    });
    const notify = vi.fn(async (_m: string) => undefined);
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify, target: () => fakeTarget().target, decode })
      .importFiles([file("x.heic", head)]);
    expect(r.failed).toEqual(["x.heic"]);
    expect(notify).toHaveBeenCalledWith("x.heic : HEIC illisible sur ce poste");
  });

  it("cœur qui refuse AddImage : rangé dans failed", async () => {
    const t = fakeTarget();
    const target: ImageTarget = { ...t.target, run: () => null };
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: vi.fn(async () => undefined), target: () => target, decode: decoded(10, 10) })
      .importFiles([file("a.png", pngHead(10, 10))]);
    expect(r.failed).toEqual(["a.png"]);
  });
});
```

- [ ] **6. Réécrire `apps/web/src/platform/import.ts`** :

```ts
/**
 * Entrée unique des fichiers (U23, R1) : dépôt web, dépôt dans la coque, collage, « Importer » et fichier passé au
 * lancement passent par `importFiles`. Registre par nature : `roomboard` (document, reconnu par l'extension) ouvre un
 * nouvel onglet (R2) ; `image` (objet, reconnue par ses octets) s'insère dans l'onglet actif au début de l'appel (R3).
 * Non reconnu : refusé avec `LATER_FORMAT_MESSAGE`. Hôtes web : 100 Mo au plus par fichier, contrôlé avant lecture (R15).
 */
import { messageOf } from "./controller";
import { ROOMBOARD_EXTENSION, type DroppedFile, type Point, type SaveTarget } from "./files";
import { HEAD_BYTES, imageHandler, type ImageDecoder, type ImageTarget } from "./image-import";

export const LATER_FORMAT_MESSAGE = "format pris en charge dans une prochaine version";
/** Limite des hôtes web (R15) ; la coque n'en a pas. */
export const WEB_MAX_BYTES = 100 * 1024 * 1024;

export const tooBigMessage = (names: readonly string[], max: number): string =>
  `${names.join(", ")} : fichier trop gros (plus de ${Math.round(max / (1024 * 1024))} Mo)`;

export interface ImportReport {
  readonly opened: readonly string[];
  readonly inserted: readonly string[];
  readonly refused: readonly string[];
  readonly failed: readonly string[];
}

export interface ImportDeps {
  /** Ouvre le document dans un nouvel onglet (T93) ; false si illisible (le message est déjà dit). */
  openDocument(file: { readonly name: string; readonly bytes: Uint8Array; readonly target: SaveTarget | null }): Promise<boolean>;
  notify(message: string): Promise<void>;
  /** Vrai quand plus aucun onglet ne peut s'ouvrir : un refus de `openDocument` arrête alors les documents suivants. */
  full?(): boolean;
  /** Onglet qui reçoit les objets, lu une fois au début de `importFiles` (R3) ; absent ou null : aucun objet inséré. */
  target?(): ImageTarget | null;
  /** Taille maximale d'un fichier (R15 : `WEB_MAX_BYTES` sur les hôtes web) ; absente ou null : aucune limite. */
  readonly maxBytes?: number | null;
  /** Décodeur des images (tests) ; défaut : `decodeImage` du navigateur. */
  readonly decode?: ImageDecoder;
}

export interface Importer {
  importFiles(files: readonly DroppedFile[], at?: Point | null): Promise<ImportReport>;
}

export interface ImportContext {
  /** Contenu du fichier, lu une fois (la coque le lit par morceaux, `grantedFile`). */
  readonly blob: Blob;
  /** `HEAD_BYTES` premiers octets ; vide pour un `.roomboard` (reconnu par son nom). */
  readonly head: Uint8Array;
  /** Point de dépôt en px CSS de la fenêtre ; null : collage, « Importer », lancement. */
  readonly at: Point | null;
  /** Images déjà insérées par cet appel (cascade, R4). */
  readonly inserted: number;
  readonly target: ImageTarget | null;
  notify(message: string): Promise<void>;
}

export type ImportOutcome = "opened" | "inserted" | "failed";

export interface ImportHandler {
  readonly id: string;
  readonly nature: "document" | "objet";
  detect(head: Uint8Array, name: string): boolean;
  /** Dit lui-même ses messages d'échec. */
  run(file: DroppedFile, ctx: ImportContext): Promise<ImportOutcome>;
}

export function isRoomboardName(name: string): boolean {
  return name.toLowerCase().endsWith(ROOMBOARD_EXTENSION) && name.length > ROOMBOARD_EXTENSION.length;
}

function roomboardHandler(deps: ImportDeps): ImportHandler {
  return {
    id: "roomboard",
    nature: "document",
    detect: (_head, name) => isRoomboardName(name),
    async run(f, ctx) {
      let bytes: Uint8Array;
      try {
        bytes = new Uint8Array(await ctx.blob.arrayBuffer());
      } catch (e) {
        await ctx.notify(`Ouverture impossible (${f.name}) : ${messageOf(e)}`);
        return "failed";
      }
      return (await deps.openDocument({ name: f.name, bytes, target: null })) ? "opened" : "failed";
    },
  };
}

const EMPTY = new Uint8Array(0);

export function createImporter(deps: ImportDeps): Importer {
  const registry: readonly ImportHandler[] = [roomboardHandler(deps), imageHandler(deps.decode ? { decode: deps.decode } : {})];
  return {
    async importFiles(files, at = null) {
      const opened: string[] = [];
      const inserted: string[] = [];
      const refused: string[] = [];
      const failed: string[] = [];
      const tooBig: string[] = [];
      const target = deps.target?.() ?? null; // onglet actif au début de l'appel (R3)
      const max = deps.maxBytes ?? null;
      let stopped = false; // onglets pleins : une seule boîte, les documents suivants ne sont pas tentés
      for (const f of files) {
        if (max !== null && f.size > max) {
          tooBig.push(f.name);
          continue;
        }
        const roomboard = isRoomboardName(f.name);
        if (roomboard && stopped) {
          failed.push(f.name);
          continue;
        }
        let blob: Blob;
        let head: Uint8Array;
        try {
          blob = await f.blob();
          head = roomboard ? EMPTY : new Uint8Array(await blob.slice(0, HEAD_BYTES).arrayBuffer());
        } catch (e) {
          failed.push(f.name);
          await deps.notify(`${roomboard ? "Ouverture" : "Import"} impossible (${f.name}) : ${messageOf(e)}`);
          continue;
        }
        const handler = registry.find((h) => h.detect(head, f.name));
        if (handler === undefined) {
          refused.push(f.name);
          continue;
        }
        const outcome = await handler.run(f, { blob, head, at, inserted: inserted.length, target, notify: deps.notify });
        if (outcome === "opened") opened.push(f.name);
        else if (outcome === "inserted") inserted.push(f.name);
        else {
          failed.push(f.name);
          if (handler.nature === "document" && deps.full?.() === true) stopped = true;
        }
      }
      if (tooBig.length > 0 && max !== null) await deps.notify(tooBigMessage(tooBig, max));
      if (refused.length > 0) await deps.notify(`${refused.join(", ")} : ${LATER_FORMAT_MESSAGE}`);
      return { opened, inserted, refused: [...tooBig, ...refused], failed };
    },
  };
}
```

- [ ] **7. Preuve** : les trois commandes de la rubrique « Test ».

- [ ] **8. Commit.**

```bash
git add apps/web/src/platform/import.ts apps/web/src/platform/import.test.ts apps/web/src/platform/image-import.ts apps/web/src/platform/image-import.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(import): handler registry with image detection, limits and placement

createImporter dispatches to a roomboard handler (by extension) and an
image handler (magic bytes, PNG/JPEG header probe, 100 Mpx cap, AddImage
centred in the view with a 24-unit cascade); web hosts cap files at 100 MB.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Lignes exigées : `Réutilisation : appelé createImporter (étendu), isRoomboardName, screenToWorld,
AssetStore.put ; grantedFile.blob() lu une fois par fichier` (ou `écart — <pourquoi>`).

---

### Tâche T4 — Rendu des images (cache, `paintElement`, `Engine.redraw`)
<a id="tache-t4"></a>

**Objectif.** `Canvas2DRenderer` reçoit un port `ImageSource` par `Canvas2DOptions.images` (R16, DAR2) ; branche `image`
de `paintElement` : bitmap dessiné dans la boîte (0, 0)-(w, h), cadre gris si absent ou en décodage ; branche
`unknown` : cadre gris « objet non pris en charge » (U3) ; cache des bitmaps par empreinte, `ready` à l'arrivée d'un
bitmap, `dispose` qui ferme tout ; `Engine.redraw()` public ; options passées aux quatre créations du rendu.

**Fichiers.**
- Créer : `apps/web/src/engine/render/image-cache.ts`, `apps/web/src/engine/render/image-cache.test.ts`.
- Modifier : `apps/web/src/engine/render/canvas2d.ts:22-25`, `:120-141`, `:188-204`, `:362-372` ;
  `apps/web/src/engine/render/canvas2d.test.ts` ; `apps/web/src/engine/render/fake-ctx.ts` ;
  `apps/web/src/engine/render/select.ts:42-97` ; `apps/web/src/engine/render/select.test.ts` ;
  `apps/web/src/engine/engine.ts` (interface `Engine` et objet `engine`) ; `apps/web/src/engine/engine.test.ts`.

**Interfaces.**
- Consomme : `ElementView` (`kind: "image"` → `image: { asset, w, h }` ; `kind: "unknown"` → `unknown: { sourceKind, w, h }`,
  `core/api.ts:88-102`) ; `AssetStore.get` (`core/asset-store.ts:20`) ; `textFont` (`engine/text-layout.ts`).
- Produit (`engine/render/image-cache.ts`) :
  - `interface ImageSource { bitmap(asset: string): CanvasImageSource | null }`
  - `type BitmapLike = CanvasImageSource & { close?(): void }` ; `type BitmapDecoder = (blob: Blob) => Promise<BitmapLike>`
  - `interface ImageCache extends ImageSource { dispose(): void }`
  - `createImageCache(assets: Pick<AssetStore, "get">, decode: BitmapDecoder, ready: () => void): ImageCache`
- Produit (`canvas2d.ts`) : `Canvas2DOptions.images?: ImageSource` ; `PLACEHOLDER_FILL = "#e5e7eb"`,
  `PLACEHOLDER_STROKE = "#9ca3af"`, `UNKNOWN_LABEL = "objet non pris en charge"` ;
  `createCanvas2DRenderer(scene, live, source, opts: Canvas2DOptions = {})`.
- Produit (`select.ts`) : `chooseRenderer(scene, live, source, wantWebgl, opts: Canvas2DOptions = {})`.
- Produit (`engine.ts`) : `Engine.redraw(): void` — redessine la scène à la prochaine image.
- Produit (`fake-ctx.ts`) : `FakeCtx.drawImage(img, x, y, w, h)` et `FakeCtx.images: { img: unknown; x: number; y: number; w: number; h: number }[]`.
- Réutilise : `apps/web/src/engine/engine.ts:178` — `requestScene()` exposé en `Engine.redraw()` (étendre).
- Réutilise : `apps/web/src/engine/render/canvas2d.ts:188` — `paintElement` : branches `image` et `unknown` ;
  `Canvas2DOptions` (`:22`) (étendre).
- Réutilise : `apps/web/src/engine/tools/select.ts`, `apps/web/src/engine/tools/handles.ts` — inchangés (R17) : le
  fantôme d'une image passe par `paintElement` (test « fantôme d'une image »).
- Réutilise : aucun module pour le cache des bitmaps (le cache `Path2D` de `canvas2d.ts:121` est synchrone et ne sert
  que les traits ; `ImageBitmap`, `drawImage` sans résultat dans `apps/`) — `ImageSource`, nouveau (DAR2).

**Contraintes (recopiées).** GC1 TDD. GC3 aucun test sauté. GC4 fichiers un par un. GC5 PATH avant pnpm. GC6 un rejeu
sur délai. GC7 aucun fichier image réel (bitmaps factices). GC10 aucun `kind` nouveau ; `SceneSource`
(`renderer.ts:36`) inchangé ; la place du `backdrop` (`canvas2d.ts:167`) reste vide (fond hors périmètre, orch.). GC11
commit. GC12 worktree neuf.

**Interdits.** Dessiner le fond (`backdrop`) ; modifier `renderer.ts`, `webgl2.ts`, `grid-paint.ts`, `board-session.ts`
(T7) ; lancer un décodage depuis `canvas2d.ts` ailleurs que par `ImageSource.bitmap`.

**Test et commande bornée.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
pnpm --filter @roomboard/web exec vitest run src/engine/render/image-cache.test.ts src/engine/render/canvas2d.test.ts src/engine/render/select.test.ts src/engine/engine.test.ts src/engine/render/grid-paint.test.ts --reporter=verbose 2>&1 | grep -E "image|inconnu|redraw|options|×|FAIL|Tests " | tail -40
pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20
```
Motif de réussite : `Tests  N passed (N)` sur les cinq fichiers, noms `image : bitmap dessiné dans sa boîte`,
`élément inconnu`, `dispose puis décodage fini`, `redraw` présents ; `tsc` sans sortie. À garder verts :
`grid-paint.test.ts` (C9), `core/wasm-core.contract.test.ts` (construit un `Canvas2DRenderer` à trois arguments).

**Terminé quand.** Les cinq fichiers passent, `tsc` propre, un commit.

**Étapes.**

- [ ] **1. Tests rouges du cache**, `apps/web/src/engine/render/image-cache.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import { createImageCache, type BitmapLike } from "./image-cache";

const ID = "ab".repeat(32);
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
function store(entries: Record<string, Blob> = { [ID]: new Blob([new Uint8Array([1])]) }) {
  return { get: vi.fn((id: string) => entries[id]) };
}
const bitmap = (): BitmapLike & { close: ReturnType<typeof vi.fn> } => ({ close: vi.fn() }) as unknown as BitmapLike & { close: ReturnType<typeof vi.fn> };

describe("cache des bitmaps par empreinte (DAR2, R16)", () => {
  it("premier appel : null et un décodage ; prêt → bitmap, ready appelé une fois", async () => {
    const bmp = bitmap();
    const decode = vi.fn(async () => bmp);
    const ready = vi.fn();
    const c = createImageCache(store(), decode, ready);
    expect(c.bitmap(ID)).toBeNull();
    expect(c.bitmap(ID)).toBeNull(); // en cours : pas de second décodage
    await flush();
    expect(c.bitmap(ID)).toBe(bmp);
    expect([decode.mock.calls.length, ready.mock.calls.length]).toEqual([1, 1]);
  });

  it("asset absent du magasin : null, aucun décodage", () => {
    const decode = vi.fn(async () => bitmap());
    expect(createImageCache(store({}), decode, vi.fn()).bitmap(ID)).toBeNull();
    expect(decode).not.toHaveBeenCalled();
  });

  it("décodage en échec : null ensuite, sans nouvel essai", async () => {
    const decode = vi.fn(async (): Promise<BitmapLike> => {
      throw new Error("illisible");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const c = createImageCache(store(), decode, vi.fn());
    c.bitmap(ID);
    await flush();
    expect(c.bitmap(ID)).toBeNull();
    expect(decode).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("dispose ferme les bitmaps prêts", async () => {
    const bmp = bitmap();
    const c = createImageCache(store(), async () => bmp, vi.fn());
    c.bitmap(ID);
    await flush();
    c.dispose();
    expect(bmp.close).toHaveBeenCalledTimes(1);
    expect(c.bitmap(ID)).toBeNull();
  });

  it("dispose puis décodage fini : bitmap fermé aussitôt, ready jamais appelé", async () => {
    const bmp = bitmap();
    let resolve!: (b: BitmapLike) => void;
    const ready = vi.fn();
    const c = createImageCache(store(), () => new Promise<BitmapLike>((r) => (resolve = r)), ready);
    c.bitmap(ID);
    c.dispose();
    resolve(bmp);
    await flush();
    expect(bmp.close).toHaveBeenCalledTimes(1);
    expect(ready).not.toHaveBeenCalled();
  });
});
```

- [ ] **2. Les voir échouer**, puis écrire `apps/web/src/engine/render/image-cache.ts` :

```ts
/**
 * Bitmaps des images par empreinte (DAR2, R16, HR12) : le rendu de la scène est synchrone, le décodage ne l'est pas.
 * `bitmap(asset)` rend le bitmap prêt, ou null (absent du magasin, en cours, en échec) et lance le décodage au premier
 * appel ; `ready` (branché sur `engine.redraw()`) est appelé quand un bitmap arrive. Une instance par onglet :
 * `dispose` ferme les bitmaps, et ferme aussitôt ceux qui arrivent après.
 */
import type { AssetStore } from "../../core/asset-store";

export interface ImageSource {
  bitmap(asset: string): CanvasImageSource | null;
}

export type BitmapLike = CanvasImageSource & { close?(): void };
export type BitmapDecoder = (blob: Blob) => Promise<BitmapLike>;

export interface ImageCache extends ImageSource {
  dispose(): void;
}

export function createImageCache(assets: Pick<AssetStore, "get">, decode: BitmapDecoder, ready: () => void): ImageCache {
  const done = new Map<string, BitmapLike>();
  const pending = new Set<string>();
  const failed = new Set<string>();
  let disposed = false;
  return {
    bitmap(asset) {
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
    },
    dispose() {
      disposed = true;
      for (const b of done.values()) b.close?.();
      done.clear();
    },
  };
}
```

- [ ] **3. Faux contexte.** Dans `apps/web/src/engine/render/fake-ctx.ts`, après `setLineDash` :

```ts
  readonly images: { img: unknown; x: number; y: number; w: number; h: number }[] = [];
  drawImage(img: unknown, x = 0, y = 0, w = 0, h = 0): void {
    this.log.push(`drawImage ${x},${y},${w},${h}`);
    this.images.push({ img, x, y, w, h });
  }
```

- [ ] **4. Tests rouges du rendu**, à la fin de `apps/web/src/engine/render/canvas2d.test.ts` (ajouter `vi` à l'import
  de vitest et `PLACEHOLDER_FILL`, `UNKNOWN_LABEL` à l'import de `./canvas2d`, `import type { ImageSource } from
  "./image-cache";`) :

```ts
describe("images et éléments inconnus (R16, U3)", () => {
  const IMG = "ef".repeat(32);
  const image: ElementView = { id: "i", kind: "image", transform: [1, 0, 0, 1, 5, 6], image: { asset: IMG, w: 200, h: 100 } };
  function sceneOf(el: ElementView, images?: ImageSource, hidden: ReadonlySet<string> = new Set(), overlay = EMPTY_OVERLAY) {
    const scene = new FakeCtx();
    const src: SceneSource = { element: (id) => (id === el.id ? el : null), outline: () => null };
    const r = new Canvas2DRenderer(asCtx(scene), null, src, images ? { images } : {});
    r.resize(100, 100, 1);
    r.drawScene({ id: "p", elementIds: [el.id] }, IDENTITY, hidden, overlay);
    return scene;
  }

  it("image : bitmap dessiné dans sa boîte (0, 0)-(w, h), sous la transformation de l'élément", () => {
    const bmp = { tag: "bitmap" } as unknown as CanvasImageSource;
    const bitmap = vi.fn((a: string) => (a === IMG ? bmp : null));
    const scene = sceneOf(image, { bitmap });
    expect(bitmap).toHaveBeenCalledWith(IMG);
    expect(scene.images).toEqual([{ img: bmp, x: 0, y: 0, w: 200, h: 100 }]);
    expect(scene.log).toContain("transform 1,0,0,1,5,6");
  });

  it("image en décodage ou absente : cadre gris de sa taille, aucun drawImage", () => {
    const scene = sceneOf(image, { bitmap: () => null });
    expect(scene.images).toEqual([]);
    expect(scene.rects).toContainEqual([0, 0, 200, 100]);
    expect(scene.log).toContain(`fillRect ${PLACEHOLDER_FILL}`);
  });

  it("sans source d'images (contrat Wasm, tests) : cadre gris", () => {
    const scene = sceneOf(image);
    expect(scene.images).toEqual([]);
    expect(scene.rects).toContainEqual([0, 0, 200, 100]);
  });

  it("élément inconnu : cadre gris et libellé « objet non pris en charge »", () => {
    const unknown: ElementView = { id: "u", kind: "unknown", transform: [1, 0, 0, 1, 0, 0], unknown: { sourceKind: "pdf-page", w: 50, h: 40 } };
    const scene = sceneOf(unknown);
    expect(scene.rects).toContainEqual([0, 0, 50, 40]);
    expect(scene.texts.map((t) => t.text)).toContain(UNKNOWN_LABEL);
  });

  it("fantôme d'une image : dessiné par paintElement avec la matrice provisoire (R17)", () => {
    const bmp = { tag: "bitmap" } as unknown as CanvasImageSource;
    const scene = sceneOf(image, { bitmap: () => bmp }, new Set(["i"]), { ...EMPTY_OVERLAY, ghosts: [{ id: "i", matrix: [1, 0, 0, 1, 30, 0] }] });
    expect(scene.images).toHaveLength(1);
    expect(scene.log).toContain("transform 1,0,0,1,30,0");
  });
});
```

- [ ] **5. Les voir échouer**, puis modifier `canvas2d.ts`. Import : `import type { ImageSource } from "./image-cache";`.
  `Canvas2DOptions` devient :

```ts
export interface Canvas2DOptions {
  /** Fabrique de chemins : Node n'a pas Path2D, les tests en passent une fausse. */
  readonly makePath?: () => Path2D;
  /** Bitmaps des images par empreinte (R16, DAR2) ; absent : cadre gris. */
  readonly images?: ImageSource;
}
```

  Après `HANDLE_FILL` (ligne 55) :

```ts
/** Cadre d'une image pas encore décodée et d'un élément inconnu (U3, R16). */
export const PLACEHOLDER_FILL = "#e5e7eb";
export const PLACEHOLDER_STROKE = "#9ca3af";
export const UNKNOWN_LABEL = "objet non pris en charge";

/** Cadre gris de la boîte locale (0, 0)-(w, h), avec un libellé pour un élément inconnu. */
function paintPlaceholder(ctx: CanvasRenderingContext2D, w: number, h: number, label: string | null): void {
  ctx.fillStyle = PLACEHOLDER_FILL;
  ctx.fillRect(0, 0, w, h);
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.strokeStyle = PLACEHOLDER_STROKE;
  ctx.lineWidth = 1;
  ctx.stroke();
  if (label !== null) {
    ctx.font = textFont(16);
    ctx.fillStyle = PLACEHOLDER_STROKE;
    ctx.textBaseline = "top";
    ctx.fillText(label, 8, 8);
  }
}
```

  Dans la classe : champ `private readonly images: ImageSource | null;` après `makePath`, et dans le constructeur
  `this.images = opts.images ?? null;`. Dans `paintElement`, après la branche `text` :

```ts
    } else if (el.kind === "image") {
      const bmp = this.images?.bitmap(el.image.asset) ?? null;
      if (bmp !== null) ctx.drawImage(bmp, 0, 0, el.image.w, el.image.h);
      else paintPlaceholder(ctx, el.image.w, el.image.h, null);
    } else if (el.kind === "unknown") {
      paintPlaceholder(ctx, el.unknown.w, el.unknown.h, UNKNOWN_LABEL);
    }
```

  `createCanvas2DRenderer` prend `opts: Canvas2DOptions = {}` en quatrième paramètre et le passe :
  `return new Canvas2DRenderer(sceneCtx, liveCtx, source, opts);`.

- [ ] **6. `select.ts`.** Import `import { Canvas2DRenderer, createCanvas2DRenderer, type Canvas2DOptions } from
  "./canvas2d";` ; signature `chooseRenderer(scene, live, source, wantWebgl: boolean, opts: Canvas2DOptions = {})` ; les
  quatre créations reçoivent `opts` : `createCanvas2DRenderer(scene, live, source, opts)` (lignes 49 et 54),
  `new Canvas2DRenderer(sceneCtx, null, source, opts)` (ligne 65), `new Canvas2DRenderer(sceneCtx, liveCtx, source, opts)`
  (ligne 89). Test, à la fin du `describe` de `select.test.ts` (importer `FakeCtx` de `./fake-ctx`, `IDENTITY` de
  `../camera`) :

```ts
  it("options transmises au rendu Canvas 2D : la source d'images est lue (réglage éteint, puis WebGL2 nul)", () => {
    const IMG = "ab".repeat(32);
    const src: SceneSource = {
      element: () => ({ id: "i", kind: "image", transform: [1, 0, 0, 1, 0, 0], image: { asset: IMG, w: 10, h: 10 } }),
      outline: () => null,
    };
    for (const want of [false, true]) {
      const bitmap = vi.fn(() => null);
      const c = chooseRenderer(el(new FakeCanvas({ "2d": new FakeCtx() })), el(new FakeCanvas({ "2d": new FakeCtx() })), src, want, { images: { bitmap } });
      c.renderer.drawScene({ id: "p", elementIds: ["i"] }, IDENTITY, new Set());
      expect(bitmap, `webgl ${want}`).toHaveBeenCalledWith(IMG);
    }
  });
```

  (ajouter `vi` à l'import de vitest de `select.test.ts`.)

- [ ] **7. `Engine.redraw`.** Dans l'interface `Engine` (`engine.ts`, après `fitPage(): void;`) :

```ts
  /** Redessine la scène à la prochaine image (bitmap d'une image arrivé, R16). */
  redraw(): void;
```

  Dans l'objet `engine`, après `fitPage() { … },` : `redraw() { requestScene(); },`. Test dans `engine.test.ts`, dans le
  premier `describe` qui utilise `setup()` :

```ts
  it("redraw : une scène de plus à l'image suivante (bitmap arrivé)", () => {
    const { engine, frames, renderer } = setup();
    engine.resize(800, 600, 1);
    frames.tick();
    const n = renderer.scenes.length;
    engine.redraw();
    frames.tick();
    expect(renderer.scenes.length).toBe(n + 1);
  });
```

- [ ] **8. Preuve** : les deux commandes de la rubrique « Test ».

- [ ] **9. Commit.**

```bash
git add apps/web/src/engine/render/image-cache.ts apps/web/src/engine/render/image-cache.test.ts apps/web/src/engine/render/canvas2d.ts apps/web/src/engine/render/canvas2d.test.ts apps/web/src/engine/render/fake-ctx.ts apps/web/src/engine/render/select.ts apps/web/src/engine/render/select.test.ts apps/web/src/engine/engine.ts apps/web/src/engine/engine.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(render): draw images from a per-asset bitmap cache, frame unknown elements

Canvas2DRenderer takes an ImageSource; images draw in their local box or
as a grey frame while decoding; unknown elements get a labelled frame;
Engine.redraw() lets a decoded bitmap trigger a scene redraw.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Ligne exigée : `Réutilisation : appelé requestScene (Engine.redraw), paintElement étendu, outils de
sélection inchangés`.

---

### Tâche T5 — Hôtes et contrôleur : `pick`, `save(encode, target)`, commande `import`, refus R30
<a id="tache-t5"></a>

**Objectif.** `FileHost.pick(): Promise<DroppedFile[]>` (plusieurs fichiers, filtre `IMPORT_FILTER`, R18) sur les trois
hôtes ; `FileHost.save(encode, target)` : la cible d'abord (boîte pendant l'activation de l'utilisateur), puis
`encode`, puis l'écriture ; boîte annulée : `encode` n'est pas appelé (R11). Le contrôleur reçoit `encode` au lieu de
`doc`, une commande `import` (boîte « Importer » puis `importFiles`) et un refus d'enregistrer `saveBlocked` (R30).
L'espace de travail est rebranché au minimum (T7 le complète).

**Fichiers.**
- Modifier : `apps/web/src/platform/files.ts:76`, `:127-135` ; `apps/web/src/platform/files.test.ts`.
- Modifier : `apps/web/src/platform/host-tauri.ts:6-16`, `:23-28`, `:133-149`, `:207-216` ;
  `apps/web/src/platform/host-tauri.test.ts`.
- Modifier : `apps/web/src/platform/host-fsa.ts:198-285` ; `apps/web/src/platform/host-fsa.test.ts`.
- Modifier : `apps/web/src/platform/host-repli.ts:292-418` ; `apps/web/src/platform/host-repli.test.ts`.
- Modifier : `apps/web/src/platform/controller.ts:20`, `:32-46`, `:107-170` ; `apps/web/src/platform/controller.test.ts`.
- Modifier : `apps/web/src/app/workspace.ts:149-159` ; `apps/web/src/app/workspace.test.ts:34`, `:153-164`.

**Interfaces.**
- Consomme : `droppedFromFile(f: File): DroppedFile` (`platform/drop-web.ts:16`, inchangé).
- Produit (`files.ts`) :
  - `IMPORT_EXTENSIONS = ["roomboard", "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg", "avif", "heic", "heif"] as const`
  - `IMPORT_FILTER = { name: "Images et documents RoomBoard", extensions: IMPORT_EXTENSIONS } as const`
  - `FileHost.pick(): Promise<DroppedFile[]>` ; `FileHost.save(encode: () => Promise<Uint8Array>, target: SaveTarget): Promise<SaveTarget | null>`
- Produit (`host-tauri.ts`) : `TauriDialog.openMany(o: { readonly filters: readonly DialogFilter[] }): Promise<readonly string[]>`.
- Produit (`host-fsa.ts`) : `IMPORT_TYPES: readonly PickerType[]` ; `FsaWindow.showOpenFilePicker(o: { multiple: boolean; … })`.
- Produit (`host-repli.ts`) : `IMPORT_ACCEPT: string` ; `FallbackDeps.pickFiles(accept: string): Promise<File[]>`.
- Produit (`controller.ts`) :
  - `type FileCommand = "open" | "save" | "saveAs" | "new" | "import"`
  - `UNREAD_ASSETS_MESSAGE = "images non lues : enregistrer les perdrait"`
  - `FileControllerDeps` : `encode(now: string, appVersion: string): Promise<Uint8Array>` (remplace `doc`) ;
    `importFiles(files: readonly DroppedFile[]): Promise<unknown>` ; `saveBlocked?(): string | null`.
- Réutilise : `apps/web/src/platform/host-tauri.ts:133` — `dialog.open` étendu à plusieurs fichiers par
  `TauriDialog.openMany` (`plugin-dialog` `open({ multiple: true })`, puis `plugin-fs` `readFile`, R18).
- Réutilise : `apps/web/src/platform/host-fsa.ts:61` — `showOpenFilePicker` étendu à `multiple: true`.
- Réutilise : `apps/web/src/platform/host-repli.ts:79` — `pickFile` étendu : même `<input type=file>`, `multiple`, par
  `pickFiles`.
- Réutilise : `apps/web/src/platform/drop-web.ts:16` — `droppedFromFile(f)` (fichiers choisis dans le repli).

**Contraintes (recopiées).** GC1 TDD. GC2 aucun build Tauri (les ports Tauri sont testés sur faux). GC3 aucun test
sauté ni affaibli. GC4 fichiers un par un. GC5 PATH avant pnpm. GC6 un rejeu sur délai. GC11 commit. GC12 worktree neuf.

**Interdits.** Toucher `main.rs`, `tauri.conf.json`, `capabilities/default.json` (R24) ; changer `FileHost.open` ou
`PendingStore` (HR5) ; changer les messages existants du contrôleur ; aller au-delà des deux lignes indiquées dans
`workspace.ts` (le reste est à T7).

**Test et commande bornée.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
pnpm --filter @roomboard/web exec vitest run src/platform/files.test.ts src/platform/host-tauri.test.ts src/platform/host-fsa.test.ts src/platform/host-repli.test.ts src/platform/controller.test.ts src/app/workspace.test.ts --reporter=verbose 2>&1 | grep -E "pick|encode|import|R30|×|FAIL|Tests " | tail -40
pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20
```
Motif de réussite : `Tests  N passed (N)` sur les six fichiers ; trois tests `boîte annulée : encode jamais appelé`
(Tauri, FSA, contrôleur), `pick` sur les trois hôtes, `saveBlocked` et `import` au contrôleur ; `tsc` sans sortie. À
garder verts : `platform/mount.test.ts`, `app/workspace.test.ts`, `ui/App.test.tsx` (`pnpm -r test 2>&1 | tail -20`).

**Terminé quand.** Les six fichiers passent, `pnpm -r test` vert, `tsc` propre, un commit.

**Étapes.**

- [ ] **1. Contrat (`files.ts`).** Après `FILE_FILTER` (ligne 76) :

```ts
/** Extensions offertes par « Importer » (R18) : le `.roomboard` et les images d'U33 que le registre reconnaît. */
export const IMPORT_EXTENSIONS = ["roomboard", "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg", "avif", "heic", "heif"] as const;
export const IMPORT_FILTER = { name: "Images et documents RoomBoard", extensions: IMPORT_EXTENSIONS } as const;
```

  `FileHost` (lignes 127-135) devient :

```ts
export interface FileHost {
  readonly kind: HostKind;
  /** null : boîte annulée. Lève une Error si la lecture échoue. */
  open(): Promise<OpenedFile | null>;
  /** Boîte « Importer » (R18) : plusieurs fichiers, filtre `IMPORT_FILTER` ; [] : annulée. */
  pick(): Promise<DroppedFile[]>;
  /**
   * Choisit d'abord la cible (boîte si `kind: "ask"` ou cible d'un autre hôte ; null : annulé, `encode` jamais appelé),
   * puis appelle `encode`, puis écrit (R11). Lève si l'encodage ou l'écriture échoue.
   */
  save(encode: () => Promise<Uint8Array>, target: SaveTarget): Promise<SaveTarget | null>;
  /** Abonne le dépôt de fichiers ; rend le désabonnement. Hôte sans surface de dépôt : no-op. */
  onDrop(handler: DropHandler): () => void;
}
```

  Test dans `files.test.ts` (importer `IMPORT_FILTER`) :

```ts
  it("filtre « Importer » : .roomboard puis les images d'U33, sans TIFF ni RAW (R14, R18)", () => {
    expect(IMPORT_FILTER).toEqual({
      name: "Images et documents RoomBoard",
      extensions: ["roomboard", "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg", "avif", "heic", "heif"],
    });
  });
```

- [ ] **2. Tests rouges Tauri** (`host-tauri.test.ts`). Dans `fakes()` : option `pickPaths?: string[]` ; `calls.openMany:
  [] as unknown[]` ; méthode du faux dialog :

```ts
    async openMany(opt) {
      calls.openMany.push(opt.filters);
      return o.pickPaths ?? [];
    },
```

  Remplacer chaque `host.save(bytes,` et `.save(bytes,` par `host.save(async () => bytes,` et `.save(async () => bytes,`
  (lignes 94, 106, 119, 125). Ajouter (importer `IMPORT_FILTER` de `./files`) :

```ts
  it("pick : boîte multiple au filtre d'import, fichiers lus par plugin-fs (R18)", async () => {
    const f = fakes({ pickPaths: ["/home/j/a.png", "/home/j/b.roomboard"] });
    f.disk.set("/home/j/a.png", new Uint8Array([1, 2]));
    f.disk.set("/home/j/b.roomboard", new Uint8Array([3]));
    const files = await createTauriHost(f.dialog, f.fs).pick();
    expect(f.calls.openMany).toEqual([[IMPORT_FILTER]]);
    expect(files.map((x) => [x.name, x.size, x.path])).toEqual([["a.png", 2, "/home/j/a.png"], ["b.roomboard", 1, "/home/j/b.roomboard"]]);
    expect(Array.from(new Uint8Array(await (await files[0]!.blob()).arrayBuffer()))).toEqual([1, 2]);
  });

  it("pick annulé : [], aucune lecture", async () => {
    const f = fakes();
    expect(await createTauriHost(f.dialog, f.fs).pick()).toEqual([]);
    expect(f.calls.reads).toEqual([]);
  });

  it("boîte d'enregistrement annulée : encode jamais appelé (R11)", async () => {
    const f = fakes({ savePath: null });
    const encode = vi.fn(async () => bytes);
    expect(await createTauriHost(f.dialog, f.fs).save(encode, ask)).toBeNull();
    expect(encode).not.toHaveBeenCalled();
  });

  it("enregistrer : la boîte d'abord, puis encode, puis l'écriture", async () => {
    const f = fakes();
    const order: string[] = [];
    const dialog = { ...f.dialog, save: async (o: { defaultPath: string; filters: readonly unknown[] }) => (order.push("boîte"), `/home/j/${o.defaultPath}`) };
    const fs = { ...f.fs, writeFile: async (p: string, d: Uint8Array) => (order.push("écriture"), f.fs.writeFile(p, d)) };
    await createTauriHost(dialog as typeof f.dialog, fs).save(async () => (order.push("encode"), bytes), ask);
    expect(order).toEqual(["boîte", "encode", "écriture"]);
  });
```

- [ ] **3. Code Tauri.** Import de `IMPORT_FILTER` dans `host-tauri.ts`. `TauriDialog` gagne :

```ts
  /** Boîte « Importer » (R18) : plusieurs fichiers ; [] si annulée. */
  openMany(o: { readonly filters: readonly DialogFilter[] }): Promise<readonly string[]>;
```

  Dans `createTauriHost`, après `open()` :

```ts
    async pick(): Promise<DroppedFile[]> {
      const paths = await dialog.openMany({ filters: [IMPORT_FILTER] });
      // Portée donnée par la boîte, comme Ouvrir (HR9) : fichier lu en une fois par plugin-fs.
      return Promise.all(
        paths.map(async (path) => {
          const bytes = await fs.readFile(path);
          return { name: baseName(path), size: bytes.byteLength, mime: "", path, blob: async () => new Blob([bytes.slice()]) };
        }),
      );
    },
```

  `save` devient :

```ts
    async save(encode: () => Promise<Uint8Array>, target: SaveTarget): Promise<SaveTarget | null> {
      let path = target.kind === "tauri" ? target.path : null;
      if (path === null) {
        path = await dialog.save({ defaultPath: ensureExtension(target.name), filters: [FILE_FILTER] });
        if (path === null) return null;
      }
      await fs.writeFile(path, await encode());
      return { kind: "tauri", name: baseName(path), path };
    },
```

  Dans `loadTauriPorts`, objet `dialog`, après `open` :

```ts
      openMany: async (o) => (await d.open({ multiple: true, directory: false, filters: filters(o.filters) })) ?? [],
```

- [ ] **4. Tests rouges FSA** (`host-fsa.test.ts`). `interface Calls` gagne `openOpts: unknown[]` ; `fsaWindow` prend
  l'option `openNames?: string[]`, initialise `calls` à `{ save: [], open: 0, openOpts: [] }` et son sélecteur
  d'ouverture devient :

```ts
    async showOpenFilePicker(opts) {
      calls.open += 1;
      calls.openOpts.push(opts);
      if (o.openName instanceof Error) throw o.openName;
      if (o.openNames) return o.openNames.map((n) => handle(disk, n));
      return [handle(disk, o.openName ?? "cours.roomboard")];
    },
```

  Remplacer chaque `host.save(bytes,`,
  `host.save(new Uint8Array([1, 2]),` et `createFsaHost(w).save(bytes,` par la même forme avec `async () => …`
  (lignes 71, 84, 86, 96, 109, 119, 128, 136, 137, 147, 156, 165). Ajouter (importer `IMPORT_TYPES`, `vi`) :

```ts
  it("pick : sélecteur multiple au filtre d'import, un DroppedFile par poignée (R18)", async () => {
    const disk = newDisk();
    disk.files.set("a.png", new Uint8Array([1, 2]));
    disk.files.set("b.png", new Uint8Array([3]));
    const w = fsaWindow(disk, { openNames: ["a.png", "b.png"] });
    const files = await createFsaHost(w).pick();
    expect(w.calls.openOpts).toEqual([{ multiple: true, excludeAcceptAllOption: false, types: IMPORT_TYPES }]);
    expect(files.map((f) => [f.name, f.size])).toEqual([["a.png", 2], ["b.png", 1]]);
    expect(Array.from(new Uint8Array(await (await files[1]!.blob()).arrayBuffer()))).toEqual([3]);
  });

  it("pick annulé (AbortError) : []", async () => {
    expect(await createFsaHost(fsaWindow(newDisk(), { openName: abortError() })).pick()).toEqual([]);
  });

  it("boîte d'enregistrement annulée : encode jamais appelé (R11)", async () => {
    const encode = vi.fn(async () => bytes);
    expect(await createFsaHost(fsaWindow(newDisk(), { saveAs: abortError() })).save(encode, ask)).toBeNull();
    expect(encode).not.toHaveBeenCalled();
  });
```

- [ ] **5. Code FSA.** Import de `IMPORT_EXTENSIONS`, `IMPORT_FILTER`, `type DroppedFile` depuis `./files`.
  `FsaWindow.showOpenFilePicker(o: { multiple: boolean; excludeAcceptAllOption: boolean; types: readonly PickerType[] })`.
  Après `FSA_TYPES` :

```ts
/** Filtre de « Importer » (R18) : documents RoomBoard et images d'U33. */
export const IMPORT_TYPES: readonly PickerType[] = [
  {
    description: IMPORT_FILTER.name,
    accept: {
      [ROOMBOARD_MIME]: [ROOMBOARD_EXTENSION],
      "image/*": IMPORT_EXTENSIONS.filter((e) => e !== "roomboard").map((e) => `.${e}`),
    },
  },
];
```

  Dans `createFsaHost`, après `open()` :

```ts
    async pick(): Promise<DroppedFile[]> {
      let handles: readonly FileHandleLike[];
      try {
        handles = await w.showOpenFilePicker({ multiple: true, excludeAcceptAllOption: false, types: IMPORT_TYPES });
      } catch (e) {
        if (isAbort(e)) return [];
        throw e;
      }
      return Promise.all(
        handles.map(async (h) => {
          const bytes = new Uint8Array(await (await h.getFile()).arrayBuffer());
          return { name: h.name, size: bytes.byteLength, mime: "", blob: async () => new Blob([bytes]) };
        }),
      );
    },
```

  `save(encode: () => Promise<Uint8Array>, target: SaveTarget)` : corps inchangé sauf la dernière écriture,
  `await writeAll(handle, await encode());`.

- [ ] **6. Tests rouges repli** (`host-repli.test.ts`). `memoryDeps` reçoit l'option `picks?: File[]` et la méthode
  `async pickFiles(accept) { accepts.push(accept); return o.picks ?? []; }`. `FakeEl` gagne `multiple: boolean` et
  `createElement` pose `multiple: false`. Remplacer chaque `.save(bytes,` par `.save(async () => bytes,` (lignes 73, 86,
  92, 94). Ajouter (importer `IMPORT_ACCEPT`) :

```ts
  it("pick : fichiers choisis rendus en DroppedFile, accept d'import (R18)", async () => {
    const m = memoryDeps({ picks: [new File([new Uint8Array([1])], "a.png", { type: "image/png" })] });
    const files = await createFallbackHost(m.deps).pick();
    expect(m.accepts).toEqual([IMPORT_ACCEPT]);
    expect(files.map((f) => [f.name, f.size, f.mime])).toEqual([["a.png", 1, "image/png"]]);
  });

  it("navigateur : pickFiles pose input multiple et rend tous les fichiers", async () => {
    const { doc, appended } = fakeDocument();
    const picked = browserFallbackDeps(doc, urls).pickFiles(IMPORT_ACCEPT);
    const input = appended[0];
    if (!input) throw new Error("aucun input ajouté");
    expect([input.type, input.accept, input.multiple]).toEqual(["file", IMPORT_ACCEPT, true]);
    input.files = [{ name: "a.png", arrayBuffer: async () => new ArrayBuffer(1) }, { name: "b.png", arrayBuffer: async () => new ArrayBuffer(1) }];
    input.listeners.get("change")?.();
    expect((await picked).map((f) => f.name)).toEqual(["a.png", "b.png"]);
    expect(input.removed).toBe(true);
  });

  it("navigateur : pickFiles annulé → []", async () => {
    const { doc, appended } = fakeDocument();
    const picked = browserFallbackDeps(doc, urls).pickFiles(IMPORT_ACCEPT);
    appended[0]?.listeners.get("cancel")?.();
    expect(await picked).toEqual([]);
  });
```

- [ ] **7. Code repli.** Imports : `IMPORT_EXTENSIONS`, `type DroppedFile` de `./files`, `droppedFromFile` de
  `./drop-web`. Après `FALLBACK_ACCEPT` :

```ts
/** `accept` de « Importer » (R18) : extensions du registre. */
export const IMPORT_ACCEPT = IMPORT_EXTENSIONS.map((e) => `.${e}`).join(",");
```

  `FallbackDeps` gagne `pickFiles(accept: string): Promise<File[]>;`. Dans `createFallbackHost` :

```ts
    async pick(): Promise<DroppedFile[]> {
      return (await d.pickFiles(IMPORT_ACCEPT)).map(droppedFromFile);
    },
    async save(encode: () => Promise<Uint8Array>, target: SaveTarget): Promise<SaveTarget | null> {
      const name = ensureExtension(target.name);
      d.download(name, await encode(), ROOMBOARD_MIME);
      return { kind: "download", name };
    },
```

  Dans `browserFallbackDeps`, le corps de `pickFile` devient une fonction locale partagée, placée avant le `return` :

```ts
  /** Se règle toujours (voir pickFile) ; null : rien choisi ou annulé. */
  const choose = (accept: string, multiple: boolean): Promise<File[] | null> =>
    new Promise((resolve, reject) => {
      const input = doc.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.multiple = multiple;
      input.style.display = "none";
      const view = doc.defaultView;
      let settled = false;
      let cancelTimer: (() => void) | null = null;
      const back = (): void => {
        if (settled || cancelTimer !== null) return;
        cancelTimer = schedule(() => settle(() => resolve(null)), FOCUS_CANCEL_MS);
      };
      const settle = (then: () => void): void => {
        if (settled) return;
        settled = true;
        cancelTimer?.();
        view?.removeEventListener("focus", back);
        view?.removeEventListener("pointerdown", back);
        input.remove();
        then();
      };
      input.addEventListener("change", () => {
        const files = Array.from(input.files ?? []);
        settle(() => resolve(files.length > 0 ? files : null));
      });
      input.addEventListener("cancel", () => {
        settle(() => resolve(null));
      });
      view?.addEventListener("focus", back);
      view?.addEventListener("pointerdown", back);
      doc.body.append(input);
      try {
        input.click();
      } catch (e) {
        settle(() => reject(e instanceof Error ? e : new Error(String(e))));
      }
    });
```

  et dans l'objet rendu (commentaire existant de `pickFile` gardé) :

```ts
    async pickFile(accept: string): Promise<PickedFile | null> {
      const file = (await choose(accept, false))?.[0];
      if (!file) return null;
      return { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
    },
    /** Plusieurs fichiers (« Importer », R18) ; [] : rien choisi ou annulé. */
    async pickFiles(accept: string): Promise<File[]> {
      return (await choose(accept, true)) ?? [];
    },
```

- [ ] **8. Tests rouges du contrôleur** (`controller.test.ts`). `memoryHost` : `calls` gagne `pick: 0` ; variable
  `let picked: DroppedFile[] = [];` et méthode `onPick(f: DroppedFile[]) { picked = f; }` ; l'hôte :

```ts
    async pick() {
      calls.pick += 1;
      return picked;
    },
    async save(encode, target) {
      calls.save.push(target);
      if (save instanceof Error) throw save;
      if (save === null) return null;
      if (save !== "write") return save.promise;
      files.set(target.name, (await encode()).slice());
      return { kind: "download", name: target.name };
    },
```

  `SetupOptions` : `docSave` devient `encode?: FileControllerDeps["encode"]`, plus `saveBlocked?:
  FileControllerDeps["saveBlocked"]` et `importFiles?: FileControllerDeps["importFiles"]` ; dans `setup`, `doc: …` devient

```ts
    encode: o.encode ?? (async (now, v) => doc.save(now, v)),
    importFiles: o.importFiles ?? (async () => undefined),
    ...(o.saveBlocked ? { saveBlocked: o.saveBlocked } : {}),
```

  Le test « sérialisation impossible » (lignes 317-327) suit le nouvel ordre de R11 (cible d'abord, puis encodage) :
  l'hôte est appelé, rien n'est écrit. Il devient :

```ts
  it("encodage impossible : message, rien d'écrit, reste modifié (R11 : la cible avant l'encodage)", async () => {
    const t = setup({
      encode: async () => {
        throw new Error("mémoire épuisée");
      },
    });
    stroke(t.doc, t.versions);
    expect(await t.ctl.run("save")).toBe(false);
    expect(t.s.log.notes).toEqual(["Enregistrement impossible : mémoire épuisée"]);
    expect([t.h.files.size, t.ctl.isDirty()]).toEqual([0, true]);
  });
```

  Ajouter (importer `UNREAD_ASSETS_MESSAGE`, `type DroppedFile`) :

```ts
describe("contrôleur : encode, import, refus R30 (R11, R18, R30)", () => {
  it("boîte annulée : encode jamais appelé, toujours modifié", async () => {
    const encode = vi.fn(async () => new Uint8Array([1]));
    const t = setup({ encode });
    stroke(t.doc, t.versions);
    t.h.onSave(null);
    expect(await t.ctl.run("save")).toBe(false);
    expect(encode).not.toHaveBeenCalled();
    expect(t.ctl.isDirty()).toBe(true);
  });

  it("encode reçoit l'heure et la version de l'application", async () => {
    const encode = vi.fn(async (_n: string, _v: string) => new Uint8Array([1]));
    const t = setup({ encode });
    await t.ctl.run("save");
    expect(encode).toHaveBeenCalledWith("2026-11-19T00:00:00.000Z", APP_VERSION);
  });

  it("saveBlocked : Enregistrer et Enregistrer sous refusés avec le message, hôte jamais appelé", async () => {
    const t = setup({ saveBlocked: () => UNREAD_ASSETS_MESSAGE });
    expect(await t.ctl.run("save")).toBe(false);
    expect(await t.ctl.run("saveAs")).toBe(false);
    expect(t.s.log.notes).toEqual([UNREAD_ASSETS_MESSAGE, UNREAD_ASSETS_MESSAGE]);
    expect(t.h.calls.save).toEqual([]);
  });

  it("import : la boîte multiple puis importFiles avec les fichiers choisis", async () => {
    const importFiles = vi.fn(async () => undefined);
    const t = setup({ importFiles });
    const f: DroppedFile = { name: "a.png", size: 1, mime: "", blob: async () => new Blob([new Uint8Array([1])]) };
    t.h.onPick([f]);
    expect(await t.ctl.run("import")).toBe(true);
    expect(importFiles).toHaveBeenCalledWith([f]);
  });

  it("import annulé ([]) : false, rien importé", async () => {
    const importFiles = vi.fn(async () => undefined);
    const t = setup({ importFiles });
    expect(await t.ctl.run("import")).toBe(false);
    expect([t.h.calls.pick, importFiles.mock.calls.length]).toEqual([1, 0]);
  });
});
```

  (`setup` rend `{ doc, versions, h, s, tabs, ctl }`, `controller.test.ts:142`.)

- [ ] **9. Code du contrôleur.** Imports : `type DroppedFile` de `./files` ; `CoreDocument` n'est plus importé. Ligne 20 :
  `export type FileCommand = "open" | "save" | "saveAs" | "new" | "import";`. Après `DISCARD_MESSAGE` :
  `export const UNREAD_ASSETS_MESSAGE = "images non lues : enregistrer les perdrait";`. Dans `FileControllerDeps`,
  `readonly doc: Pick<CoreDocument, "save">;` est remplacé par :

```ts
  /** Octets du fichier, appelé par l'hôte après le choix de la cible (R11). */
  encode(now: string, appVersion: string): Promise<Uint8Array>;
  /** « Importer » : fichiers choisis dans la boîte, vers l'entrée unique (R18). */
  importFiles(files: readonly DroppedFile[]): Promise<unknown>;
  /** Message si l'enregistrement est refusé (onglet aux images non lues, R30), sinon null. */
  saveBlocked?(): string | null;
```

  `save(as)` devient :

```ts
  async function save(as: boolean): Promise<boolean> {
    const blocked = d.saveBlocked?.() ?? null;
    if (blocked !== null) {
      await d.shell.notify(blocked);
      return false;
    }
    const version = d.versions.state().version; // lue avant l'écriture : un trait tracé pendant reste « modifié »
    const to: SaveTarget = !as && target !== null ? target : { kind: "ask", name };
    let result: SaveTarget | null;
    try {
      result = await d.host.save(() => d.encode(d.now(), d.appVersion), to);
    } catch (e) {
      return fail("Enregistrement impossible", e);
    }
    if (result === null) return false;
    target = result;
    name = result.name;
    savedVersion = version;
    changed();
    return true;
  }

  async function importPicked(): Promise<boolean> {
    // Boîte d'abord, appelée sans attente préalable : l'activation de l'utilisateur est encore fraîche.
    let files: DroppedFile[];
    try {
      files = await d.host.pick();
    } catch (e) {
      return fail("Import impossible", e);
    }
    if (files.length === 0) return false;
    await d.importFiles(files);
    return true;
  }
```

  Dans `run`, avant `if (cmd === "open")` : `if (cmd === "import") return await importPicked();`.

- [ ] **10. Espace de travail (minimum).** `workspace.ts:149-159`, dans `createFileController({ … })`, la ligne
  `doc: board.doc,` est remplacée par :

```ts
      encode: async (now, appVersion) => board.doc.save(now, appVersion),
      importFiles: (f) => ws.importFiles(f, null),
```

  `workspace.test.ts` : type de `host` (ligne 34) `FileHost & { save: ReturnType<typeof vi.fn<(e: () => Promise<Uint8Array>,
  t: SaveTarget) => Promise<SaveTarget | null>>> }` ; dans `setupWorkspace`, l'hôte gagne `pick: async () => []` et
  `save: vi.fn(async (_e: () => Promise<Uint8Array>, t: SaveTarget): Promise<SaveTarget | null> => (t.kind === "ask" ? {
  kind: "download", name: t.name } : t))`.

- [ ] **11. Preuve** : les deux commandes de la rubrique « Test », puis `pnpm -r test 2>&1 | tail -20` (motif `Tests  N
  passed`, aucun `FAIL`).

- [ ] **12. Commit.**

```bash
git add apps/web/src/platform/files.ts apps/web/src/platform/files.test.ts apps/web/src/platform/host-tauri.ts apps/web/src/platform/host-tauri.test.ts apps/web/src/platform/host-fsa.ts apps/web/src/platform/host-fsa.test.ts apps/web/src/platform/host-repli.ts apps/web/src/platform/host-repli.test.ts apps/web/src/platform/controller.ts apps/web/src/platform/controller.test.ts apps/web/src/app/workspace.ts apps/web/src/app/workspace.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(files): multi-file pick, target-then-encode save, import command

FileHost gains pick() on the three hosts and save(encode, target): the
target is chosen before encoding, a cancelled dialog encodes nothing.
The file controller takes encode, an import command and a save refusal.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Ligne exigée : `Réutilisation : appelé dialog.open (multiple), showOpenFilePicker (multiple), pickFile
(input partagé), droppedFromFile`.

---

### Tâche T6 — Contrôle des licences appelé par `verifier.sh`
<a id="tache-t6"></a>

**Objectif.** `scripts/controle-licences.mjs` (Node, sans dépendance, R21) : crates de `cargo metadata --format-version 1
--locked --offline` hors membres du workspace, paquets npm de `node_modules/.pnpm/*/node_modules/**/package.json` (liens
exclus, développement compris) ; relevé npm vide = échec ; expressions SPDX (`OR`, `AND`, parenthèses, `/` lu comme `OR`,
`WITH` gardé tel quel) ; acceptées : liste d'U39 (+ `MIT-0`, `Unlicense`) ; exceptions écrites une fois dans
`scripts/licences-acceptees.json` (`caniuse-lite` CC-BY-4.0) ; `src-tauri` tenté, ligne d'information s'il n'a pas de
métadonnées hors ligne (R22) ; appelé par `verifier.sh` après `pnpm install --frozen-lockfile` ; avis de tiers mis à
jour (R23).

**Fichiers.**
- Créer : `scripts/controle-licences.mjs`, `scripts/licences-acceptees.json`, `scripts/tests/controle-licences.test.sh`.
- Modifier : `scripts/verifier.sh` (après `pnpm install --frozen-lockfile`), `THIRD_PARTY_NOTICES.md:4`.

**Interfaces.**
- Consomme : `scripts/verifier.sh` tel que T2 l'a laissé (dépendance de fichier).
- Produit : `node scripts/controle-licences.mjs [--cargo-json f]… [--npm-root d] [--exceptions f]` → code 0 (ligne
  `controle-licences : OK`), 1 (une ligne `licences : ÉCART …` par écart, ou relevé npm vide), 2 (option inconnue) ;
  exports `ALLOWED`, `parseSpdx(expr)`, `permitted(node)`.
- Réutilise : aucun module de contrôle des licences (`licen` : 0 dans `scripts/`) — nouveau module, U39 ; interface d'une
  commande : `node scripts/controle-licences.mjs [--cargo-json f] [--npm-root d]` → code 0 / 1, une ligne par écart.

**Contraintes (recopiées).** GC1 TDD (le test shell d'abord). GC3 aucun seuil baissé : la liste d'U39 n'est pas
élargie, une exception passe par `licences-acceptees.json` seulement. GC4 fichiers un par un. GC5 PATH avant cargo et
pnpm. GC6 un rejeu sur délai. GC8 aucune dépendance (Node seul). GC11 commit. GC12 worktree neuf.

**Interdits.** Ajouter une exception autre que `caniuse-lite` sans l'écrire au rapport comme écart ; lancer `cargo
metadata` sans `--offline` ; toucher `src-tauri`.

**Test et commande bornée.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
bash scripts/tests/controle-licences.test.sh 2>&1 | tail -15
node scripts/controle-licences.mjs 2>&1 | tail -10
bash scripts/verifier.sh 2>&1 | grep -E "licences|controle-licences|module formats|module Wasm|verifier.sh : OK|ÉCHEC|error\[" | tail -15
```
Motif de réussite : `controle-licences.test.sh : OK (10 cas)` ; sur l'arbre réel `licences : N crates, M paquets npm`
avec N ≥ 70 et M ≥ 130, `controle-licences : OK` ; `verifier.sh` complet finit par `verifier.sh : OK`.

**Terminé quand.** Le test shell passe ses 10 cas, l'arbre réel est conforme, `verifier.sh` complet est vert, un commit.

**Étapes.**

- [ ] **1. Test rouge**, `scripts/tests/controle-licences.test.sh` :

```bash
#!/usr/bin/env bash
# Test du contrôle des licences (U39, R21) : relevés cargo et npm fabriqués dans un dossier temporaire.
set -euo pipefail
racine="$(cd "$(dirname "$0")/../.." && pwd)"
script="$racine/scripts/controle-licences.mjs"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
echec() { echo "ÉCHEC : $1" >&2; exit 1; }
cas=0

# Relevé cargo : un membre du workspace (exclu) et des crates tiers.
cargo_json() { # $1 fichier, puis paires nom=licence
  local f="$1"; shift
  local pk='{"id":"ws 0.1.0","name":"roomboard-core","version":"0.1.0","license":"LicenseRef-PolyForm-Shield-1.0.0"}'
  for p in "$@"; do pk="$pk,{\"id\":\"${p%%=*} 1.0.0\",\"name\":\"${p%%=*}\",\"version\":\"1.0.0\",\"license\":\"${p#*=}\"}"; done
  echo "{\"workspace_members\":[\"ws 0.1.0\"],\"packages\":[$pk]}" > "$f"
}
npm_pkg() { # $1 racine, $2 nom, $3 licence (vide : champ absent) ; entrée à la pnpm : @x/y → @x+y@1.0.0
  local e="${2/\//+}@1.0.0"
  local d="$1/$e/node_modules/$2"
  mkdir -p "$d"
  if [ -n "$3" ]; then echo "{\"name\":\"$2\",\"version\":\"1.0.0\",\"license\":\"$3\"}" > "$d/package.json"
  else echo "{\"name\":\"$2\",\"version\":\"1.0.0\"}" > "$d/package.json"; fi
}
vide='{"npm":{},"cargo":{}}'
echo "$vide" > "$tmp/aucune.json"
mkdir -p "$tmp/npm-ok"
npm_pkg "$tmp/npm-ok" solid-js MIT
npm_pkg "$tmp/npm-ok" @x/y ISC
run() { node "$script" --exceptions "${EXC:-$tmp/aucune.json}" "$@" > "$tmp/out" 2>&1; }

# 1. Expressions permises (OR, /, AND entre parenthèses), membre du workspace exclu → 0
cargo_json "$tmp/ok.json" a="MIT OR Apache-2.0" b="MIT/Apache-2.0" c="(MIT OR Apache-2.0) AND Unicode-3.0" d="Zlib"
run --cargo-json "$tmp/ok.json" --npm-root "$tmp/npm-ok" || echec "cas 1 : refusé ($(cat "$tmp/out"))"
grep -q "controle-licences : OK" "$tmp/out" || echec "cas 1 : ligne OK absente"
grep -q "licences : 4 crates, 2 paquets npm" "$tmp/out" || echec "cas 1 : décompte faux ($(cat "$tmp/out"))"
cas=$((cas + 1))

# 2. GPL seule → 1, le crate est nommé
cargo_json "$tmp/gpl.json" mauvais="GPL-3.0-only"
if run --cargo-json "$tmp/gpl.json" --npm-root "$tmp/npm-ok"; then echec "cas 2 : GPL acceptée"; fi
grep -q "ÉCART cargo mauvais 1.0.0 : GPL-3.0-only" "$tmp/out" || echec "cas 2 : écart non nommé ($(cat "$tmp/out"))"
cas=$((cas + 1))

# 3. LGPL en alternative d'une licence permise → 0
cargo_json "$tmp/alt.json" r="MIT OR Apache-2.0 OR LGPL-2.1-or-later"
run --cargo-json "$tmp/alt.json" --npm-root "$tmp/npm-ok" || echec "cas 3 : alternative refusée"
cas=$((cas + 1))

# 4. LGPL liée par AND → 1
cargo_json "$tmp/and.json" s="LGPL-2.1-or-later AND MIT"
if run --cargo-json "$tmp/and.json" --npm-root "$tmp/npm-ok"; then echec "cas 4 : AND LGPL accepté"; fi
cas=$((cas + 1))

# 5. Relevé npm vide → 1
mkdir -p "$tmp/npm-vide"
if run --cargo-json "$tmp/ok.json" --npm-root "$tmp/npm-vide"; then echec "cas 5 : relevé vide accepté"; fi
grep -q "relevé npm vide" "$tmp/out" || echec "cas 5 : message absent"
cas=$((cas + 1))

# 6. Un lien vers un paquet GPL n'est pas relevé → 0
mkdir -p "$tmp/ailleurs/gpl-pkg" "$tmp/npm-ok/lien@1.0.0/node_modules"
echo '{"name":"gpl-pkg","version":"1.0.0","license":"GPL-3.0-only"}' > "$tmp/ailleurs/gpl-pkg/package.json"
ln -s "$tmp/ailleurs/gpl-pkg" "$tmp/npm-ok/lien@1.0.0/node_modules/gpl-pkg"
run --cargo-json "$tmp/ok.json" --npm-root "$tmp/npm-ok" || echec "cas 6 : lien relevé ($(cat "$tmp/out"))"
cas=$((cas + 1))

# 7. CC-BY-4.0 : refusée sans exception, acceptée avec l'exception écrite
mkdir -p "$tmp/npm-cc"
npm_pkg "$tmp/npm-cc" caniuse-lite CC-BY-4.0
if run --cargo-json "$tmp/ok.json" --npm-root "$tmp/npm-cc"; then echec "cas 7 : CC-BY-4.0 acceptée sans exception"; fi
echo '{"npm":{"caniuse-lite":{"licence":"CC-BY-4.0","raison":"données de build"}},"cargo":{}}' > "$tmp/exc.json"
EXC="$tmp/exc.json" run --cargo-json "$tmp/ok.json" --npm-root "$tmp/npm-cc" || echec "cas 7 : exception ignorée"
cas=$((cas + 1))

# 8. WITH gardé tel quel : seule → 1 ; en alternative de MIT → 0
cargo_json "$tmp/with.json" w="Apache-2.0 WITH LLVM-exception"
if run --cargo-json "$tmp/with.json" --npm-root "$tmp/npm-ok"; then echec "cas 8 : WITH seule acceptée"; fi
cargo_json "$tmp/with-or.json" w="Apache-2.0 WITH LLVM-exception OR MIT"
run --cargo-json "$tmp/with-or.json" --npm-root "$tmp/npm-ok" || echec "cas 8 : WITH OR MIT refusée"
cas=$((cas + 1))

# 9. Licence absente (paquet npm) → 1
mkdir -p "$tmp/npm-sans"
npm_pkg "$tmp/npm-sans" muet ""
if run --cargo-json "$tmp/ok.json" --npm-root "$tmp/npm-sans"; then echec "cas 9 : licence absente acceptée"; fi
grep -q "ÉCART npm muet 1.0.0 : licence absente" "$tmp/out" || echec "cas 9 : écart non nommé"
cas=$((cas + 1))

# 10. Option inconnue → 2
set +e; node "$script" --inconnue > "$tmp/out" 2>&1; rc=$?; set -e
[ "$rc" -eq 2 ] || echec "cas 10 : code $rc au lieu de 2"
cas=$((cas + 1))

echo "controle-licences.test.sh : OK ($cas cas)"
```

- [ ] **2. Le voir échouer** : `bash scripts/tests/controle-licences.test.sh` → `ÉCHEC : cas 1 : refusé (… Cannot find
  module …)`.

- [ ] **3. Écrire `scripts/controle-licences.mjs`** :

```js
#!/usr/bin/env node
// Contrôle des licences (U39, R21) : crates de `cargo metadata` hors membres du workspace et paquets npm de
// node_modules/.pnpm (liens exclus, développement compris). Une expression SPDX passe si l'une de ses alternatives ne
// porte que des licences permises ; exceptions écrites une fois dans scripts/licences-acceptees.json.
// Usage : node scripts/controle-licences.mjs [--cargo-json f]… [--npm-root d] [--exceptions f]
// Sans --cargo-json : `cargo metadata --format-version 1 --locked --offline` du workspace, puis de src-tauri (R22).
// Code de sortie : 0 conforme, 1 écart (une ligne par écart) ou relevé npm vide, 2 option inconnue.
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

/** Licences permises (U39) ; `MIT-0` et `Unlicense` en plus (R21). OFL-1.1 (polices seulement) passe par une exception. */
export const ALLOWED = new Set([
  "MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "Zlib", "Unicode-3.0", "Unicode-DFS-2016",
  "BSL-1.0", "0BSD", "CC0-1.0", "MPL-2.0", "MIT-0", "Unlicense",
]);

const OPS = new Set(["OR", "AND", "WITH"]);

/** Arbre SPDX : `{ or: [] }`, `{ and: [] }` ou `{ id }` ; `/` lu comme `OR` ; `X WITH Y` gardé comme une seule licence. */
export function parseSpdx(expr) {
  const tokens = expr
    .replace(/\//g, " OR ")
    .replace(/\(/g, " ( ")
    .replace(/\)/g, " ) ")
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => (OPS.has(t.toUpperCase()) ? t.toUpperCase() : t));
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];
  const fail = (why) => {
    throw new Error(`${why} : ${expr}`);
  };
  function primary() {
    const t = next();
    if (t === undefined) fail("expression incomplète");
    if (t === "(") {
      const n = or();
      if (next() !== ")") fail("parenthèse non fermée");
      return n;
    }
    if (t === ")" || OPS.has(t)) fail(`jeton inattendu « ${t} »`);
    if (peek() === "WITH") {
      next();
      const ex = next();
      if (ex === undefined || ex === "(" || ex === ")" || OPS.has(ex)) fail("exception WITH absente");
      return { id: `${t} WITH ${ex}` };
    }
    return { id: t };
  }
  function and() {
    const parts = [primary()];
    while (peek() === "AND") {
      next();
      parts.push(primary());
    }
    return parts.length === 1 ? parts[0] : { and: parts };
  }
  function or() {
    const parts = [and()];
    while (peek() === "OR") {
      next();
      parts.push(and());
    }
    return parts.length === 1 ? parts[0] : { or: parts };
  }
  const tree = or();
  if (i !== tokens.length) fail(`jeton en trop « ${tokens[i]} »`);
  return tree;
}

export function permitted(node) {
  if ("or" in node) return node.or.some(permitted);
  if ("and" in node) return node.and.every(permitted);
  return ALLOWED.has(node.id);
}

function cargoMetadata(manifest) {
  const args = ["metadata", "--format-version", "1", "--locked", "--offline", ...(manifest ? ["--manifest-path", manifest] : [])];
  return JSON.parse(execFileSync("cargo", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }));
}

function cargoPackages(meta) {
  const members = new Set(meta.workspace_members);
  return meta.packages
    .filter((p) => !members.has(p.id))
    .map((p) => ({ kind: "cargo", name: p.name, version: p.version, license: p.license ?? null }));
}

const licenseOf = (pkg) => {
  if (typeof pkg.license === "string") return pkg.license;
  if (pkg.license && typeof pkg.license.type === "string") return pkg.license.type;
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => (typeof l === "string" ? l : l.type)).join(" OR ");
  return null;
};

/** `<racine>/<entrée>/node_modules/<paquet>` et `…/@portée/<paquet>` ; un lien n'est jamais relevé (son paquet l'est ailleurs). */
function npmPackages(root) {
  const out = [];
  if (!existsSync(root)) return out;
  for (const entry of readdirSync(root)) {
    const nm = join(root, entry, "node_modules");
    if (!existsSync(nm)) continue;
    for (const d of readdirSync(nm)) {
      const rels = d.startsWith("@") ? readdirSync(join(nm, d)).map((x) => join(d, x)) : [d];
      for (const rel of rels) {
        const dir = join(nm, rel);
        if (lstatSync(dir).isSymbolicLink()) continue;
        const file = join(dir, "package.json");
        if (!existsSync(file)) continue;
        const pkg = JSON.parse(readFileSync(file, "utf8"));
        out.push({ kind: "npm", name: pkg.name ?? rel, version: pkg.version ?? "?", license: licenseOf(pkg) });
      }
    }
  }
  return out;
}

function main(argv) {
  const args = { cargo: [], npmRoot: join(ROOT, "node_modules", ".pnpm"), exceptions: join(ROOT, "scripts", "licences-acceptees.json") };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const v = argv[i + 1];
    if (a === "--cargo-json" && v !== undefined) args.cargo.push(argv[++i]);
    else if (a === "--npm-root" && v !== undefined) args.npmRoot = argv[++i];
    else if (a === "--exceptions" && v !== undefined) args.exceptions = argv[++i];
    else {
      console.error(`controle-licences : option inconnue ${a}`);
      return 2;
    }
  }
  const metas = [];
  if (args.cargo.length > 0) {
    for (const f of args.cargo) metas.push(JSON.parse(readFileSync(f, "utf8")));
  } else {
    try {
      metas.push(cargoMetadata(null));
    } catch (e) {
      console.error(`licences : cargo metadata du workspace impossible (${e instanceof Error ? e.message.split("\n")[0] : e})`);
      return 1;
    }
    try {
      metas.push(cargoMetadata(join(ROOT, "apps", "desktop", "src-tauri", "Cargo.toml")));
    } catch {
      console.log("licences : src-tauri non contrôlé (métadonnées hors ligne absentes)");
    }
  }
  const exceptions = JSON.parse(readFileSync(args.exceptions, "utf8"));
  const seen = new Set();
  const all = [];
  for (const p of [...metas.flatMap(cargoPackages), ...npmPackages(args.npmRoot)]) {
    const key = `${p.kind} ${p.name} ${p.version} ${p.license}`;
    if (!seen.has(key)) {
      seen.add(key);
      all.push(p);
    }
  }
  const crates = all.filter((p) => p.kind === "cargo").length;
  const npm = all.length - crates;
  if (npm === 0) {
    console.error(`licences : relevé npm vide (${args.npmRoot}) : échec (pnpm install d'abord)`);
    return 1;
  }
  let gaps = 0;
  let excused = 0;
  for (const p of all) {
    const exc = exceptions[p.kind]?.[p.name];
    if (exc && exc.licence === p.license) {
      excused += 1;
      continue;
    }
    let why = null;
    if (p.license === null || p.license.trim() === "") why = "licence absente";
    else {
      try {
        if (!permitted(parseSpdx(p.license))) why = p.license;
      } catch (e) {
        why = `expression illisible (${e.message})`;
      }
    }
    if (why !== null) {
      gaps += 1;
      console.error(`licences : ÉCART ${p.kind} ${p.name} ${p.version} : ${why}`);
    }
  }
  console.log(`licences : ${crates} crates, ${npm} paquets npm contrôlés, ${excused} exception(s)`);
  if (gaps > 0) return 1;
  console.log("controle-licences : OK");
  return 0;
}

process.exitCode = main(process.argv.slice(2));
```

  Le décompte du cas 1 (`licences : 4 crates, 2 paquets npm`) est un préfixe de la ligne écrite.

- [ ] **4. Exceptions**, `scripts/licences-acceptees.json` :

```json
{
  "npm": {
    "caniuse-lite": {
      "licence": "CC-BY-4.0",
      "raison": "données de navigateurs lues au build (browserslist), aucun code lié à l'application ; relevé du 2026-11-20"
    }
  },
  "cargo": {}
}
```

- [ ] **5. Voir passer** le test shell, puis `node scripts/controle-licences.mjs` sur l'arbre réel. Si une licence hors
  liste autre que `caniuse-lite` apparaît : ne pas l'ajouter, s'arrêter et la donner au rapport.

- [ ] **6. `verifier.sh`.** Juste après la ligne `pnpm install --frozen-lockfile` :

```bash
# Licences des dépendances (U39, R21) : après pnpm install, sur le node_modules réel.
bash scripts/tests/controle-licences.test.sh
node scripts/controle-licences.mjs
```

- [ ] **7. Avis de tiers.** `THIRD_PARTY_NOTICES.md:4` (« Le contrôle scripté des licences et son appel par
  `scripts/verifier.sh` viennent avec la partie « reste » de C2 (HK5). ») est remplacée par la ligne :

```markdown
Contrôle scripté : `scripts/controle-licences.mjs` (crates et paquets npm, développement compris), appelé par `scripts/verifier.sh` après `pnpm install` ; exceptions écrites une fois dans `scripts/licences-acceptees.json` (`caniuse-lite`, CC-BY-4.0, données de build).
```

- [ ] **8. Preuve** : les trois commandes de la rubrique « Test » (`verifier.sh` complet : environ 10 minutes sur la VM).

- [ ] **9. Commit.**

```bash
git add scripts/controle-licences.mjs scripts/licences-acceptees.json scripts/tests/controle-licences.test.sh scripts/verifier.sh THIRD_PARTY_NOTICES.md
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(ci): scripted licence check for crates and npm packages

controle-licences.mjs reads cargo metadata (offline) and node_modules/.pnpm,
evaluates SPDX expressions against the U39 list with written exceptions,
and runs in verifier.sh after pnpm install.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Lignes exigées : `Réutilisation : écart — aucun module existant (nouveau, U39)` ; le décompte réel
(`licences : N crates, M paquets npm`) et la ligne `src-tauri` obtenue.

---

### Tâche T7 — Espace de travail : ouverture et enregistrement par le conteneur, repli, images importées, collage
<a id="tache-t7"></a>

**Objectif.** Un `AssetStore` par onglet (R12) ; **ouvrir** (menu, dépôt, lancement) passe par `codec.read` →
`core.loadParts` + `AssetStore.adopt`, avertissements du conteneur dits en une boîte ; module indisponible → repli
`core.load`, message, onglet marqué *assets non lus* s'il cite des images (R7, R30) ; **enregistrer** : sans asset cité,
`doc.save` direct sans codec ; sinon `saveParts` + `AssetStore.pick` + `codec.write` (R7) ; le premier document
(`startDocument`, `core.load`) qui cite des images est marqué (HR20) ; l'importeur reçoit l'onglet actif, la limite web
et le décodeur (R3, R15) ; la session d'onglet crée le cache des bitmaps et le passe au rendu (R16) ; collage (R19).

**Fichiers.**
- Modifier : `apps/web/src/app/workspace.ts` (deps, `addTab`, `openDocument`, importeur, premier onglet) ;
  `apps/web/src/app/workspace.test.ts`.
- Modifier : `apps/web/src/app/board-session.ts:39-49`, `:78-112`, `:308-322` ; `apps/web/src/app/board-session.test.ts`.
- Modifier : `apps/web/src/main.ts:7-22`, `:70-82`, après `:96`.
- Créer : `apps/web/src/platform/paste.ts`, `apps/web/src/platform/paste.test.ts`.

**Interfaces.**
- Consomme (T2) : `ContainerCodec`, `ContainerContents`, `ContainerAsset`, `CodecUnavailableError`,
  `createPageCodec(load)` (`platform/container.ts`) ; `loadFormatsModule()` (`platform/container-load.ts`).
- Consomme (T3) : `createImporter(deps: ImportDeps)` avec `target?(): ImageTarget | null`, `maxBytes?`, `decode?` ;
  `WEB_MAX_BYTES` ; `ImageTarget { assets, page(), camera(), stageRect(), run(cmd) }` ; `decodeImage`, `kindOfMime`,
  `type ImageDecoder` (`platform/image-import.ts`).
- Consomme (T4) : `createImageCache(assets, decode, ready)`, `type BitmapDecoder` (`engine/render/image-cache.ts`) ;
  `chooseRenderer(scene, live, source, wantWebgl, { images })` ; `Engine.redraw()`.
- Consomme (T5) : `FileControllerDeps.encode(now, appVersion)`, `importFiles`, `saveBlocked?()` ;
  `UNREAD_ASSETS_MESSAGE` ; `FileHost.pick`.
- Produit :
  - `WorkspaceDeps` : `readonly codec: ContainerCodec` ; `makeSession(doc: CoreDocument, assets: AssetStore): Promise<BoardSession>` ;
    `makeAssets?(): AssetStore` ; `readonly decode?: ImageDecoder`.
  - `TabSession` : `readonly assets: AssetStore`.
  - `CODEC_FALLBACK_MESSAGE = "images non lues : le module des images ne s'est pas chargé"`.
  - `createBoardSession(doc: CoreDocument, shared: SessionShared, assets: AssetStore = createAssetStore()): Promise<BoardSession>` ;
    `SessionShared.decode?: BitmapDecoder`.
  - `platform/paste.ts` : `interface PasteEventLike { readonly target: EventTarget | null; readonly clipboardData: { readonly files: ArrayLike<File> } | null }` ;
    `isEditable(t: EventTarget | null): boolean` ; `pastedFiles(e: PasteEventLike): DroppedFile[]`.
- Réutilise : `apps/web/src/app/workspace.ts:188` — `openDocument(file)` (corps : ouverture R7) (étendre).
- Réutilise : `apps/web/src/core/asset-store.ts:26` — `createAssetStore().put`, `adopt`, `pick`.
- Réutilise : `apps/web/src/core/api.ts:137` — `doc.citedAssets()`.
- Réutilise : `apps/web/src/core/api.ts:151`, `:166` — `doc.saveParts(now, appVersion)`, `core.loadParts(manifest, ybin)`.
- Réutilise : `apps/web/src/core/api.ts` `CoreFactory.load` (`wasm-core.ts`) — `core.load(bytes)` (ouverture de repli).
- Réutilise : `apps/web/src/engine/engine.ts:68` — `engine.run({ type: "AddImage", … })`, par `ImageTarget.run`.
- Réutilise : `apps/web/src/app/workspace.ts:75` — `say(message)` (avertissements, repli).
- Réutilise : `apps/web/src/platform/drop-web.ts:16` — `droppedFromFile(f)` (fichiers collés).

**Patron à ne pas reprendre (concepteur-critique).**
- L'ouverture directe par le cœur, `apps/web/src/app/workspace.ts:193-199` (`doc = core.load(file.bytes)`) : elle ignore
  `assets/` ; l'ouverture passe par `codec.read` d'abord, `core.load` n'est que le repli sur `CodecUnavailableError`
  (une autre erreur du codec = fichier refusé, message, aucun onglet).
- L'enregistrement unique par `doc.save`, `apps/web/src/platform/controller.ts:108-111` (avant T5) : il perd les images.
  Mais l'inverse — tout passer par le codec — est aussi le mauvais patron : un document **sans** asset doit donner les
  octets exacts de `doc.save`, sans charger le second module (garde `compat_socle`, R7). La décision se prend sur
  `doc.citedAssets().length`, à chaque enregistrement.
- Les deux chemins d'ouverture (conteneur, repli) doivent rendre le même onglet ; seul le repli pose la marque R30, et
  seulement si le document cite des assets.

**Contraintes (recopiées).** GC1 TDD. GC2 aucun build Tauri. GC3 aucun test sauté ni affaibli. GC4 fichiers un par un.
GC5 PATH avant cargo et pnpm. GC6 un rejeu sur délai. GC7 images fabriquées dans le test. GC9 module principal inchangé.
GC10 aucune copie de `PAGE_WIDTH` dans `core/`. GC11 commit. GC12 worktree neuf ; pour `tsc`, construire aussi le second
module : `cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release && rm -rf
apps/web/src/wasm-formats && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats
target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm`.

**Interdits.** Toucher `platform/mount.ts` (`startDocument` reste sur `core.load`, orch.), `platform/pending.ts`, les
hôtes, le contrôleur (T5), `drop-web.ts`, la barre (T8) ; enregistrer quand même un onglet marqué ; écrire un Worker.

**Test et commande bornée.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
pnpm --filter @roomboard/web exec vitest run src/app/workspace.test.ts src/app/board-session.test.ts src/platform/paste.test.ts --reporter=verbose 2>&1 | grep -E "conteneur|repli|image|collage|R30|×|FAIL|Tests " | tail -40
pnpm -r test 2>&1 | tail -20
pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20
```
Motif de réussite : `Tests  N passed (N)` sur les trois fichiers (N ≥ 46), noms `repli : module indisponible`,
`enregistrer sans image : octets de doc.save`, `même image déposée deux fois` présents ; `pnpm -r test` sans `FAIL` ;
`tsc` sans sortie. À garder verts : `platform/controller.test.ts`, `core/wasm-core.contract.test.ts`,
`crates/roomboard-core/tests/compat_socle.rs` (non touché ; l'invariant « sans asset = `doc.save` » le protège) ;
`scripts/essais/fichiers-navigateur.mjs`, `s2`, `s34` (Ouvrir passe par le codec) sont rejoués par T9.

**Terminé quand.** Les trois fichiers de tests passent, `pnpm -r test` vert, `tsc` propre, un commit.

**Étapes.**

- [ ] **1. Collage : test rouge**, `apps/web/src/platform/paste.test.ts` :

```ts
// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { isEditable, pastedFiles } from "./paste";

const files = (...f: File[]) => ({ files: f });
const png = new File([new Uint8Array([1])], "a.png", { type: "image/png" });
const txt = new File(["x"], "a.txt", { type: "text/plain" });

describe("collage (R19)", () => {
  it("fichiers image/* du presse-papiers, les autres ignorés", () => {
    const r = pastedFiles({ target: document.body, clipboardData: files(png, txt) });
    expect(r.map((f) => [f.name, f.mime, f.size])).toEqual([["a.png", "image/png", 1]]);
  });

  it("cible éditable (zone de texte, champ, contenteditable) : rien", () => {
    const area = document.createElement("textarea");
    const input = document.createElement("input");
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    for (const t of [area, input, div]) expect(pastedFiles({ target: t, clipboardData: files(png) }), t.tagName).toEqual([]);
  });

  it("bouton et case à cocher ne sont pas éditables ; aucun presse-papiers : rien", () => {
    const b = document.createElement("input");
    b.type = "checkbox";
    expect(isEditable(b)).toBe(false);
    expect(isEditable(document.createElement("button"))).toBe(false);
    expect(pastedFiles({ target: document.body, clipboardData: null })).toEqual([]);
  });
});
```

- [ ] **2. Le voir échouer**, puis `apps/web/src/platform/paste.ts` :

```ts
/** Collage (R19) : fichiers `image/*` du presse-papiers ; ignoré quand la cible est éditable ; texte et HTML ignorés (C3). */
import { droppedFromFile } from "./drop-web";
import type { DroppedFile } from "./files";

export interface PasteEventLike {
  readonly target: EventTarget | null;
  readonly clipboardData: { readonly files: ArrayLike<File> } | null;
}

const NOT_TEXT = new Set(["button", "checkbox", "radio", "file", "submit", "reset", "range", "color", "image", "hidden"]);

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
```

- [ ] **3. Tests rouges de l'espace de travail** (`workspace.test.ts`). En tête : importer `type Command` de
  `../core/api`, `APP_VERSION`, `UNREAD_ASSETS_MESSAGE` de `../platform/controller`, `CodecUnavailableError`, `type
  ContainerCodec`, `type ContainerContents` de `../platform/container`, `CODEC_FALLBACK_MESSAGE` de `./workspace`.
  Variables de module : `let codec: { read: ReturnType<typeof vi.fn<ContainerCodec["read"]>>; write: ReturnType<typeof
  vi.fn<ContainerCodec["write"]>> };` et `let saved: Uint8Array[];`. Dans `beforeEach` :

```ts
  saved = [];
  codec = {
    read: vi.fn<ContainerCodec["read"]>(async (b) => ({ manifest: new Uint8Array(), ybin: new Uint8Array(await b.arrayBuffer()), assets: [], warnings: [] })),
    write: vi.fn<ContainerCodec["write"]>(async () => new Uint8Array([0x50, 0x4b, 1])),
  };
```

  `fakeSession(doc)` : l'objet `engine` devient

```ts
    engine: {
      state: () => ({ version: doc.version(), page: doc.pageIds()[0] ?? "" }),
      camera: () => ({ zoom: 1, tx: 0, ty: 0 }),
      run: (cmd: Command) => {
        const c = doc.apply(cmd);
        for (const cb of cbs) cb({ version: doc.version() });
        return c;
      },
      onState(cb: (s: { version: number }) => void) {
        cbs.add(cb);
        return () => {
          cbs.delete(cb);
        };
      },
    },
```

  `plainFile` prend des octets (TIFF par défaut, R28) et un vrai Blob :

```ts
function plainFile(name: string, bytes: Uint8Array<ArrayBuffer> = new Uint8Array([0x49, 0x49, 0x2a, 0x00]), size = bytes.byteLength): DroppedFile {
  return { name, size, mime: "", blob: async () => new Blob([bytes]) };
}
function pngHead(w: number, h: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const v = new DataView(b.buffer);
  v.setUint32(16, w);
  v.setUint32(20, h);
  b.set([8, 6, 0, 0, 0], 24);
  return b;
}
const NOW = "2026-11-20T00:00:00Z";
const ID = "ab".repeat(32);
function docWithImage(): CoreDocument {
  const d = fakeCore.blank();
  d.apply({ type: "AddImage", page: d.pageIds()[0]!, asset: { id: ID, name: "a.png", mime: "image/png", size: 3 }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] });
  return d;
}
const fakeDecode = vi.fn(async (_b: Blob, _k: string) => ({ bitmap: { close() {} } as unknown as ImageBitmap, w: 10, h: 10 }));
```

  `SetupOptions` gagne `readonly decode?: WorkspaceDeps["decode"]`. Empreinte déterministe sans Web Crypto (l'environnement
  happy-dom n'en garantit pas ; importer `createAssetStore` de `../core/asset-store`) :

```ts
/** 64 caractères hexadécimaux, même contenu → même empreinte (suffit au magasin des tests). */
const fakeHasher = async (b: Blob): Promise<string> => {
  let h = 0;
  for (const x of new Uint8Array(await b.arrayBuffer())) h = (h * 31 + x) >>> 0;
  return h.toString(16).padStart(64, "0");
};
```

  Dans `setupWorkspace`, l'hôte enregistre les octets encodés :

```ts
    save: vi.fn(async (encode: () => Promise<Uint8Array>, t: SaveTarget): Promise<SaveTarget | null> => {
      saved.push(await encode());
      return t.kind === "ask" ? { kind: "download", name: t.name } : t;
    }),
```

  et `createWorkspace({ … })` reçoit `codec`, `makeSession: async (doc, _assets) => fakeSession(doc).board`,
  `makeAssets: () => createAssetStore(fakeHasher)` et `...(o.decode ? { decode: o.decode } : {})`. Les deux tests du `.png` refusé passent sur un `.tif` (R28) : « dépôt d'un
  .png » (lignes 343-351) devient « dépôt d'un .tif : message, document intact, aucun onglet », avec
  `plainFile("image.tif")`, `report.refused` `["image.tif"]` et le message `image.tif : ${LATER_FORMAT_MESSAGE}` ; le
  test « dépôt avec une boîte qui échoue » (ligne 424) dépose `plainFile("a.tif")` et attend `{ refused: ["a.tif"] }`.
  Ajouter :

```ts
describe("espace de travail : conteneur, repli et images (R7, R12, R30, S3, S4)", () => {
  it("ouvrir avec le conteneur : assets adoptés dans le magasin de l'onglet, avertissements dits en une boîte", async () => {
    const ws = await setupWorkspace();
    const first = ws.active();
    codec.read.mockResolvedValueOnce({
      manifest: new Uint8Array([1]),
      ybin: docWithImage().save(NOW, "0.1.0"),
      assets: [[ID, new Blob([new Uint8Array([1, 2, 3])])]],
      warnings: ["asset ignoré : assets/x.png (nom d'asset invalide)", "asset ignoré : assets/y.png (contenu différent de son empreinte)"],
    } satisfies ContainerContents);
    expect(await ws.openDocument({ name: "img.roomboard", bytes: new Uint8Array([9]), target: null })).toBe(true);
    const tab = ws.active();
    expect(tab).not.toBe(first);
    expect(tab.assets.get(ID)?.type).toBe("image/png");
    expect(shell.notify).toHaveBeenCalledTimes(1);
    expect(shell.notify).toHaveBeenCalledWith(
      "img.roomboard : asset ignoré : assets/x.png (nom d'asset invalide) ; asset ignoré : assets/y.png (contenu différent de son empreinte)",
    );
    expect(await tab.files.run("save")).toBe(true); // avertissements : pas de refus (HR13)
    expect(strokes(first)).toBe(0);
  });

  it("enregistrer sans image : octets de doc.save, conteneur jamais appelé", async () => {
    const ws = await setupWorkspace();
    drawOn(ws.active());
    expect(await ws.active().files.run("save")).toBe(true);
    expect(saved[0]).toEqual(ws.active().board.doc.save(NOW, APP_VERSION));
    expect(codec.write).not.toHaveBeenCalled();
  });

  it("enregistrer avec image : saveParts puis codec.write avec l'empreinte, le type et les octets du magasin", async () => {
    const ws = await setupWorkspace();
    const blob = new Blob([new Uint8Array([1, 2, 3])]);
    codec.read.mockResolvedValueOnce({ manifest: new Uint8Array([1]), ybin: docWithImage().save(NOW, "0.1.0"), assets: [[ID, blob]], warnings: [] });
    await ws.openDocument({ name: "img.roomboard", bytes: new Uint8Array([9]), target: null });
    expect(await ws.active().files.run("save")).toBe(true);
    const [manifest, ybin, assets] = codec.write.mock.calls[0]!;
    expect([manifest, ybin]).toEqual(ws.active().board.doc.saveParts(NOW, APP_VERSION));
    expect(assets.map((a) => [a.id, a.mime])).toEqual([[ID, "image/png"]]);
    expect(Array.from(new Uint8Array(await assets[0]!.blob.arrayBuffer()))).toEqual([1, 2, 3]);
    expect(Array.from(saved[0]!)).toEqual([0x50, 0x4b, 1]);
  });

  it("repli : module indisponible → core.load, message, Enregistrer refusé ; les autres onglets non touchés", async () => {
    const ws = await setupWorkspace();
    const first = ws.active();
    codec.read.mockRejectedValueOnce(new CodecUnavailableError(new Error("404")));
    expect(await ws.openDocument({ name: "img.roomboard", bytes: docWithImage().save(NOW, "0.1.0"), target: null })).toBe(true);
    expect(shell.notify).toHaveBeenCalledWith(`img.roomboard : ${CODEC_FALLBACK_MESSAGE}`);
    expect(strokes(ws.active())).toBe(1);
    expect(await ws.active().files.run("save")).toBe(false);
    expect(await ws.active().files.run("saveAs")).toBe(false);
    expect(shell.notify).toHaveBeenLastCalledWith(UNREAD_ASSETS_MESSAGE);
    expect(host.save).not.toHaveBeenCalled();
    expect(await first.files.run("save")).toBe(true);
  });

  it("repli sans image : aucun message, Enregistrer permis", async () => {
    const ws = await setupWorkspace();
    codec.read.mockRejectedValueOnce(new CodecUnavailableError(new Error("404")));
    expect(await ws.openDocument({ name: "vide.roomboard", bytes: validBytes(), target: null })).toBe(true);
    expect(shell.notify).not.toHaveBeenCalled();
    expect(await ws.active().files.run("save")).toBe(true);
  });

  it("fichier refusé par le conteneur : « Ouverture impossible (nom) : message du cœur », aucun onglet", async () => {
    const ws = await setupWorkspace();
    codec.read.mockRejectedValueOnce(new Error("ce fichier n'est pas un document RoomBoard"));
    expect(await ws.openDocument({ name: "x.roomboard", bytes: new Uint8Array([1]), target: null })).toBe(false);
    expect(shell.notify).toHaveBeenCalledWith("Ouverture impossible (x.roomboard) : ce fichier n'est pas un document RoomBoard");
    expect(ws.tabs.list()).toHaveLength(1);
  });

  it("premier document (attente IndexedDB, core.load) qui cite des images : Enregistrer refusé (R30, HR20)", async () => {
    const ws = await setupWorkspace({ first: { doc: docWithImage(), opened: null, error: null } });
    expect(await ws.active().files.run("save")).toBe(false);
    expect(shell.notify).toHaveBeenCalledWith(UNREAD_ASSETS_MESSAGE);
  });

  it("dépôt d'une image : insérée dans l'onglet actif, une étape, octets dans son magasin (S1)", async () => {
    const ws = await setupWorkspace({ decode: fakeDecode });
    const tab = ws.active();
    const r = await ws.importFiles([plainFile("a.png", pngHead(10, 10))], { x: 0, y: 0 });
    expect(r.inserted).toEqual(["a.png"]);
    expect(strokes(tab)).toBe(1);
    expect(tab.board.doc.citedAssets()).toHaveLength(1);
    expect(tab.assets.has(tab.board.doc.citedAssets()[0]!.id)).toBe(true);
  });

  it("même image déposée deux fois : deux éléments, un seul asset écrit", async () => {
    const ws = await setupWorkspace({ decode: fakeDecode });
    await ws.importFiles([plainFile("a.png", pngHead(10, 10)), plainFile("b.png", pngHead(10, 10))], null);
    expect(strokes(ws.active())).toBe(2);
    expect(await ws.active().files.run("save")).toBe(true);
    expect(codec.write.mock.calls[0]![2]).toHaveLength(1);
  });

  it("limite de taille : 100 Mo sur les hôtes web, aucune dans la coque (R15)", async () => {
    const big = (): DroppedFile => plainFile("gros.png", pngHead(10, 10), 120 * 1024 * 1024);
    const web = await setupWorkspace({ decode: fakeDecode });
    expect((await web.importFiles([big()])).refused).toEqual(["gros.png"]);
    const coque = await setupWorkspace({ kind: "tauri", decode: fakeDecode });
    expect((await coque.importFiles([big()])).inserted).toEqual(["gros.png"]);
  });
});
```

- [ ] **4. Les voir échouer** (`CODEC_FALLBACK_MESSAGE` absent, `codec` inconnu, `assets` absent de `TabSession`).

- [ ] **5. Code de l'espace de travail** (`workspace.ts`). Imports ajoutés :

```ts
import { createAssetStore, type AssetStore } from "../core/asset-store";
import { CodecUnavailableError, type ContainerCodec, type ContainerContents } from "../platform/container";
import { UNREAD_ASSETS_MESSAGE } from "../platform/controller";
import type { ImageDecoder, ImageTarget } from "../platform/image-import";
import { createImporter, WEB_MAX_BYTES, type ImportReport } from "../platform/import";
```

  (`UNREAD_ASSETS_MESSAGE` rejoint l'import existant de `../platform/controller`.) Après les imports :

```ts
/** Repli R7 : le module du conteneur ne s'est pas chargé, le document s'ouvre par le cœur seul. */
export const CODEC_FALLBACK_MESSAGE = "images non lues : le module des images ne s'est pas chargé";
```

  `TabSession` gagne `readonly assets: AssetStore;`. `WorkspaceDeps` : `makeSession(doc: CoreDocument, assets:
  AssetStore): Promise<BoardSession>;` et, après `shell` :

```ts
  /** Conteneur avec assets (R7, R10) : `createPageCodec(loadFormatsModule)` dans l'amorce, un faux dans les tests. */
  readonly codec: ContainerCodec;
  /** Magasin d'un onglet (R12) ; défaut `createAssetStore()`. */
  makeAssets?(): AssetStore;
  /** Décodeur des images importées (tests) ; défaut : celui du navigateur. */
  readonly decode?: ImageDecoder;
```

  `Slot` gagne `unread: boolean;` (onglet aux assets non lus, R30). Dans `createWorkspace`, après `const full = …` :

```ts
  const makeAssets = deps.makeAssets ?? (() => createAssetStore());
  const typed = (blob: Blob, mime: string | undefined): Blob =>
    mime !== undefined && mime !== "" && mime !== blob.type ? new Blob([blob], { type: mime }) : blob;

  /** Octets d'un onglet (R7) : sans asset cité, `doc.save` (mêmes octets qu'avant, sans le second module) ; sinon conteneur. */
  async function encodeTab(doc: CoreDocument, assets: AssetStore, now: string, appVersion: string): Promise<Uint8Array> {
    const cited = doc.citedAssets();
    if (cited.length === 0) return doc.save(now, appVersion);
    const [manifest, ybin] = doc.saveParts(now, appVersion);
    const mimeOf = new Map(cited.map((a) => [a.id, a.mime]));
    const { present } = assets.pick(cited.map((a) => a.id));
    return deps.codec.write(manifest, ybin, present.map(([id, blob]) => ({ id, mime: mimeOf.get(id) ?? blob.type, blob })));
  }

  /** Ouverture R7 : conteneur, sinon repli `core.load` ; null si le fichier est refusé (message déjà dit). */
  async function readDocument(name: string, bytes: Uint8Array): Promise<{ doc: CoreDocument; assets: AssetStore; unread: boolean } | null> {
    const assets = makeAssets();
    let contents: ContainerContents;
    try {
      contents = await deps.codec.read(new Blob([bytes.slice()]));
    } catch (e) {
      if (!(e instanceof CodecUnavailableError)) {
        await say(`Ouverture impossible (${name}) : ${messageOf(e)}`);
        return null;
      }
      let doc: CoreDocument;
      try {
        doc = core.load(bytes);
      } catch (e2) {
        await say(`Ouverture impossible (${name}) : ${messageOf(e2)}`);
        return null;
      }
      const unread = doc.citedAssets().length > 0;
      if (unread) await say(`${name} : ${CODEC_FALLBACK_MESSAGE}`);
      return { doc, assets, unread };
    }
    let doc: CoreDocument;
    try {
      doc = core.loadParts(contents.manifest, contents.ybin);
    } catch (e) {
      await say(`Ouverture impossible (${name}) : ${messageOf(e)}`);
      return null;
    }
    try {
      for (const [id, blob] of contents.assets) assets.adopt(id, typed(blob, doc.asset(id)?.mime));
    } catch (e) {
      doc.free();
      await say(`Ouverture impossible (${name}) : ${messageOf(e)}`);
      return null;
    }
    if (contents.warnings.length > 0) await say(`${name} : ${contents.warnings.join(" ; ")}`);
    return { doc, assets, unread: false };
  }

  /** Onglet qui reçoit les images (R3) : session active, magasin de l'onglet, moteur, rectangle du stage. */
  const imageTarget = (t: TabSession): ImageTarget => ({
    assets: t.assets,
    page: () => t.board.engine.state().page,
    camera: () => t.board.engine.camera(),
    stageRect: () => t.board.stage.getBoundingClientRect(),
    run: (cmd) => t.board.engine.run(cmd),
  });
```

  `addTab` prend `assets: AssetStore = makeAssets()` et `unread = false` après `opened` ; `deps.makeSession(doc, assets)` ;
  `const slot: Slot = { tab: null, id: "", title: "", unread };` ; dans `createFileController({ … })`, les lignes posées
  par T5 (`encode`, `importFiles`) deviennent :

```ts
      encode: (now, appVersion) => encodeTab(board.doc, assets, now, appVersion),
      importFiles: (f) => ws.importFiles(f, null),
      saveBlocked: () => (slot.unread ? UNREAD_ASSETS_MESSAGE : null),
```

  et `const tab: TabSession = { board, files, assets };`. L'importeur :

```ts
  const importer = createImporter({
    openDocument: (f) => ws.openDocument(f),
    notify: say,
    full,
    target: () => {
      const t = tabs.active()?.session;
      return t === undefined ? null : imageTarget(t);
    },
    maxBytes: deps.kind === "tauri" ? null : WEB_MAX_BYTES,
    ...(deps.decode ? { decode: deps.decode } : {}),
  });
```

  `openDocument` (lignes 187-201) :

```ts
    async openDocument(file) {
      const name = baseName(file.name); // jamais un chemin affiché (`\\?\C:\…` compris)
      if (full()) {
        await say(TOO_MANY_TABS);
        return false;
      }
      const read = await readDocument(name, file.bytes);
      if (read === null) return false;
      return (await addTab(read.doc, { name, target: file.target }, read.assets, read.unread)) !== null;
    },
```

  Premier onglet (lignes 245-248) : `addTab(deps.first.doc, …, makeAssets(), deps.first.doc.citedAssets().length > 0)`
  (`startDocument` reste sur `core.load`, HR20). `newBlank` et `closeTab` gardent `addTab(core.blank(), null)`.

- [ ] **6. Test rouge de la session** (`board-session.test.ts`, importer `createAssetStore` de `../core/asset-store`) :

```ts
  it("image du document : décodée depuis le magasin de l'onglet, bitmap fermé à dispose (R12, R16)", async () => {
    const doc = fakeCore.blank();
    const id = "cd".repeat(32);
    doc.apply({ type: "AddImage", page: doc.pageIds()[0]!, asset: { id, name: "a.png", mime: "image/png", size: 3 }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] });
    const assets = createAssetStore();
    assets.adopt(id, new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }));
    const close = vi.fn();
    const decode = vi.fn(async (_b: Blob) => ({ width: 10, height: 10, close }) as unknown as ImageBitmap);
    const s = await createBoardSession(doc, { ...shared, decode }, assets);
    s.activate();
    await vi.waitFor(() => expect(decode).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 0));
    expect(Array.from(new Uint8Array(await decode.mock.calls[0]![0].arrayBuffer()))).toEqual([1, 2, 3]);
    s.dispose();
    expect(close).toHaveBeenCalledTimes(1);
  });
```

- [ ] **7. Code de la session** (`board-session.ts`). Imports : `import { createAssetStore, type AssetStore } from
  "../core/asset-store";`, `import { createImageCache, type BitmapDecoder } from "../engine/render/image-cache";`,
  `import { decodeImage, kindOfMime } from "../platform/image-import";`. `SessionShared` gagne :

```ts
  /** Décodeur des bitmaps (tests) ; défaut : `decodeImage` du navigateur. */
  readonly decode?: BitmapDecoder;
```

  Après les imports :

```ts
/** Bitmap d'affichage d'un asset (R13, R15) : le type du Blob (posé à l'insertion ou à l'ouverture) choisit le SVG. */
const decodeBitmap: BitmapDecoder = async (blob) => (await decodeImage(blob, kindOfMime(blob.type) ?? "png")).bitmap;
```

  `createBoardSession(doc: CoreDocument, shared: SessionShared, assets: AssetStore = createAssetStore())` passe `assets` à
  `buildBoardSession(doc, shared, assets, undo)`. Dans `buildBoardSession`, juste avant `const choice = chooseRenderer(…)` :

```ts
  // Bitmaps des images (R16) : le cache appelle `redraw` quand un bitmap arrive ; le moteur est créé plus bas.
  let redraw = (): void => undefined;
  const images = createImageCache(assets, shared.decode ?? decodeBitmap, () => redraw());
  undo.push(() => images.dispose());
```

  `chooseRenderer(sceneCanvas, liveCanvas, doc, parsed.settings.webgl === "on", { images })` ; juste après
  `undo.push(() => engine.dispose());` : `redraw = () => engine.redraw();` ; dans `dispose()`, après `engine.dispose();` :
  `images.dispose();`.

- [ ] **8. Amorce** (`main.ts`). Imports : `import { createPageCodec } from "./platform/container";`, `import {
  loadFormatsModule } from "./platform/container-load";`, `import { pastedFiles } from "./platform/paste";`. Dans
  `createWorkspace({ … })` : `codec: createPageCodec(loadFormatsModule),` après `shell`, et `makeSession: (doc, assets) =>
  createBoardSession(doc, shared, assets),`. Après l'écoute `blur` (ligne 96) :

```ts
  // Collage (R19) : fichiers image du presse-papiers vers l'onglet actif, centre de la vue ; zone de texte : collage normal.
  window.addEventListener("paste", (e) => {
    const files = pastedFiles(e);
    if (files.length === 0) return;
    e.preventDefault();
    void workspace.importFiles(files, null).catch((err: unknown) => {
      console.warn(`RoomBoard : collage abandonné (${err instanceof Error ? err.message : String(err)})`);
    });
  });
```

- [ ] **9. Preuve** : construire le second module (GC12), puis les trois commandes de la rubrique « Test ».

- [ ] **10. Commit.**

```bash
git add apps/web/src/app/workspace.ts apps/web/src/app/workspace.test.ts apps/web/src/app/board-session.ts apps/web/src/app/board-session.test.ts apps/web/src/main.ts apps/web/src/platform/paste.ts apps/web/src/platform/paste.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(workspace): open and save through the asset container, image import, paste

Each tab owns an AssetStore; opening goes through the container codec
with a core.load fallback that blocks saving when images are unread;
saving without assets stays doc.save byte for byte; sessions draw images
from a bitmap cache; pasted images are imported.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Ligne exigée : `Réutilisation : appelé openDocument (étendu), createAssetStore (put, adopt, pick),
citedAssets, saveParts, loadParts, core.load (repli), engine.run, say, droppedFromFile`.

---

### Tâche T8 — Barre : action « Importer », zone de dépôt sans double insertion
<a id="tache-t8"></a>

**Objectif.** Action `file-import` « Importer » (R18) : `ACTION_TABLE`, `ACTIONS` (commande de fichier `import` du
contrôleur, T5), bouton après « Ouvrir » dans le groupe `fichier` du profil intégré `defaut` ; un profil enregistré par
l'utilisateur ne le reçoit pas. Défaut existant corrigé (R29) : un fichier lâché sur la zone de dépôt de la barre n'est
plus importé deux fois (`listenWebDrop(…, { stopPropagation: true })`).

**Fichiers.**
- Modifier : `apps/web/src/toolbar.ts:93-108`, `apps/web/src/toolbar-profiles.ts:60`,
  `apps/web/src/toolbar-profiles.test.ts`, `apps/web/src/app/toolbar-host.ts:22-37`,
  `apps/web/src/app/toolbar-host.test.ts`, `apps/web/src/platform/drop-web.ts:199-232`,
  `apps/web/src/platform/drop-web.test.ts`, `apps/web/src/ui/Toolbar.tsx:35`, `apps/web/src/ui/Toolbar.test.tsx`.

**Interfaces.**
- Consomme (T5) : `type FileCommand = "open" | "save" | "saveAs" | "new" | "import"` (`platform/controller.ts`).
- Produit : `ACTION_TABLE["file-import"] = { label: "Importer" }` ; `ACTIONS["file-import"] = file("import")` ;
  `interface WebDropOptions { readonly stopPropagation?: boolean }` ;
  `listenWebDrop(target: DropTargetLike | null, handler: DropHandler, opts: WebDropOptions = {}): () => void` ;
  `DragEventLike.stopPropagation?(): void`.
- Réutilise : `apps/web/src/toolbar.ts:93`, `apps/web/src/app/toolbar-host.ts:21` — `ACTION_TABLE`, `ACTIONS` (étendre).
- Réutilise : `apps/web/src/platform/drop-web.ts:20` — `listenWebDrop(target, handler, { stopPropagation })` (étendre).

**Contraintes (recopiées).** GC1 TDD. GC3 aucun test sauté ni affaibli. GC4 fichiers un par un. GC5 PATH avant cargo et
pnpm. GC6 un rejeu sur délai. GC11 commit. GC12 worktree neuf : `pnpm install --frozen-lockfile` si `node_modules/`
manque ; `apps/web/src/wasm/` copié depuis `/home/adminjd/projets/roomboard-wt/usage-c2-depot/apps/web/src/wasm` ; et,
`container-load.ts` étant présent (T2 fusionné), le second module construit avant `tsc` : `cargo build -p
roomboard-formats-wasm --target wasm32-unknown-unknown --release && rm -rf apps/web/src/wasm-formats && wasm-bindgen
--target web --remove-name-section --out-dir apps/web/src/wasm-formats
target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm`.

**Interdits.** Toucher `mount.ts` (l'écoute de `document` des hôtes web reste) ; toucher `App.tsx`, `workspace.ts`,
`main.ts` (T7) ; ajouter « Importer » au profil `simple` ; réécrire `toolbar-profiles.ts:45-68` au-delà de la ligne 60
(zone de C1, conflit à garder petit).

**Test et commande bornée.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
pnpm --filter @roomboard/web exec vitest run src/toolbar.test.ts src/toolbar-profiles.test.ts src/app/toolbar-host.test.ts src/platform/drop-web.test.ts src/ui/Toolbar.test.tsx --reporter=verbose 2>&1 | grep -E "Importer|file-import|remonte|stopPropagation|×|FAIL|Tests " | tail -30
pnpm -r test 2>&1 | tail -20
pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20
```
Motif de réussite : `Tests  N passed (N)` sur les cinq fichiers, noms `un dépôt ne remonte pas à document` et
`Importer après Ouvrir` présents ; `pnpm -r test` sans `FAIL` (dont `ui/App.test.tsx`) ; `tsc` sans sortie.

**Terminé quand.** Les cinq fichiers passent, la suite web est verte, `tsc` propre, un commit.

**Étapes.**

- [ ] **1. Tests rouges.** `toolbar-profiles.test.ts` (le test « defaut porte chaque bouton » garde sa liste ; ajouter) :

```ts
  it("defaut : « Importer » après « Ouvrir » dans le groupe fichier ; simple ne l'a pas (R18)", () => {
    const fichier = builtinProfile("defaut")!.toolbars[0]!.groups.find((g) => g.id === "fichier")!;
    const fichierIds = fichier.items.map((i) => i.id);
    expect(fichierIds.indexOf("file-import")).toBe(fichierIds.indexOf("file-open") + 1);
    expect(fichier.items.find((i) => i.id === "file-import")?.label).toBe("Importer");
    expect(ids("simple")).not.toContain("file-import");
  });

  it("un profil enregistré sans « Importer » ne le reçoit pas", () => {
    const json = structuredClone(DEFAULT_PROFILE_JSON) as { id: string; toolbars: { groups: { id: string; items: { id: string }[] }[] }[] };
    json.id = "perso";
    for (const g of json.toolbars[0]!.groups) g.items = g.items.filter((i) => i.id !== "file-import");
    const r = parseProfile(json);
    if ("errors" in r) throw new Error(r.errors.join(" ; "));
    expect(r.profile.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items.map((i) => i.id)))).not.toContain("file-import");
  });
```

  (`ids(profilId)` est l'aide de `toolbar-profiles.test.ts:6` ; `builtinProfile`, `DEFAULT_PROFILE_JSON` et `parseProfile`
  y sont déjà importés.)

  `toolbar-host.test.ts` :

```ts
  it('runAction("file-import") → runFile("import") (R18)', () => {
    const { host, t } = setup();
    host.runAction("file-import");
    expect(t.runFile).toHaveBeenCalledWith("import");
  });
```

  `drop-web.test.ts` :

```ts
  it("stopPropagation demandé : le drop ne remonte pas ; sans l'option : il remonte (R29)", () => {
    for (const stop of [true, false]) {
      const t = fakeTarget();
      listenWebDrop(t.target, vi.fn(), { stopPropagation: stop });
      const e = { ...ev([new File(["x"], "a.png")]), stopped: 0, stopPropagation() { this.stopped += 1; } };
      t.fire("drop", e);
      expect(e.stopped, String(stop)).toBe(stop ? 1 : 0);
    }
  });
```

  `Toolbar.test.tsx` :

```ts
  it("zone de dépôt : un dépôt ne remonte pas à document (une seule insertion, R29)", () => {
    const zone: ToolItem = { id: "zone", kind: "dropzone", label: "Déposer", requires: [], rest: {} };
    const { container, host } = setup(mkBar([zone]));
    const onDoc = vi.fn();
    document.addEventListener("drop", onDoc);
    try {
      const ev = new Event("drop", { bubbles: true, cancelable: true }) as Event & { dataTransfer: unknown; clientX: number; clientY: number };
      ev.dataTransfer = { files: [new File(["x"], "a.png")], dropEffect: "" };
      ev.clientX = 3;
      ev.clientY = 4;
      container.querySelector(".rb-drop")!.dispatchEvent(ev);
      expect(host.dropFiles).toHaveBeenCalledTimes(1);
      expect(onDoc).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener("drop", onDoc);
    }
  });
```

- [ ] **2. Les voir échouer** : `pnpm --filter @roomboard/web exec vitest run src/ui/Toolbar.test.tsx
  src/app/toolbar-host.test.ts 2>&1 | tail -10` → `onDoc` appelé une fois ; `runFile` jamais appelé.

- [ ] **3. Code.** `toolbar.ts`, dans `ACTION_TABLE` après `"file-open"` : `"file-import": { label: "Importer" },`.
  `app/toolbar-host.ts`, dans `ACTIONS` après `"file-open": file("open"),` : `"file-import": file("import"),`.
  `toolbar-profiles.ts:60` : `action("file-open", "Ouvrir"), action("file-import", "Importer"), action("file-save",
  "Enregistrer")`. `platform/drop-web.ts` :

```ts
export interface DragEventLike {
  readonly clientX: number;
  readonly clientY: number;
  readonly dataTransfer: { readonly files: ArrayLike<File>; dropEffect: string } | null;
  preventDefault(): void;
  stopPropagation?(): void;
}

export interface WebDropOptions {
  /** Le `drop` pris ici ne remonte pas (zone de la barre, R29) : l'écoute de `document` de l'hôte web ne le revoit pas. */
  readonly stopPropagation?: boolean;
}
```

  `listenWebDrop(target: DropTargetLike | null, handler: DropHandler, opts: WebDropOptions = {}): () => void` ; dans
  `drop`, après `e.preventDefault();` : `if (opts.stopPropagation === true) e.stopPropagation?.();`.
  `ui/Toolbar.tsx:35` : `const off = listenWebDrop(el ?? null, (files, at) => props.ctx.host.dropFiles(files, at), {
  stopPropagation: true });`.

- [ ] **4. Preuve** : les trois commandes de la rubrique « Test ».

- [ ] **5. Commit.**

```bash
git add apps/web/src/toolbar.ts apps/web/src/toolbar-profiles.ts apps/web/src/toolbar-profiles.test.ts apps/web/src/app/toolbar-host.ts apps/web/src/app/toolbar-host.test.ts apps/web/src/platform/drop-web.ts apps/web/src/platform/drop-web.test.ts apps/web/src/ui/Toolbar.tsx apps/web/src/ui/Toolbar.test.tsx
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(toolbar): Import action, drop zone no longer imports twice

The default profile gets an Import button after Open, routed to the file
controller's import command; the toolbar drop zone stops propagation so
the web host's document listener does not import the same file again.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Ligne exigée : `Réutilisation : appelé ACTION_TABLE, ACTIONS (étendus), listenWebDrop (option
stopPropagation)`.

---

### Tâche T9 — Essai navigateur C2, capture, essais existants passés sur `.tif`
<a id="tache-t9"></a>

**Objectif.** `scripts/essais/c2-image-navigateur.mjs` (Playwright, CSP de la coque servie, mode repli, heure figée) joue
S1 à S5 (R26, R27) : dépôt d'un PNG sombre fabriqué, Ctrl+Z / Ctrl+Y, sélection, glisser, poignée, Ctrl+S et lecture de
l'entrée `assets/<sha256>.png`, Ctrl+O et pixels sombres, second Ctrl+S aux mêmes octets, dépôt du `.roomboard` dans un
nouvel onglet, collage, « Importer » deux images, dépôt d'un `.tif` refusé. `--captures` écrit
`docs/essais/c2-image-deposee.png`. L'essai rejoint le bloc `--e2e` de `verifier.sh` et la liste de
`verifier-e2e.test.sh` ; `s5b-navigateur.mjs` passe son refus sur un `.tif` (R28) ; la taille du second module est
mesurée sur l'asset de `apps/web/dist` (R9).

**Fichiers.**
- Créer : `scripts/essais/c2-image-navigateur.mjs`, `docs/essais/c2-image-deposee.png`.
- Modifier : `scripts/essais/s5b-navigateur.mjs:188-192`, `scripts/verifier.sh` (mesure du module formats, bloc `--e2e`),
  `scripts/tests/verifier-e2e.test.sh:13`.

**Interfaces.**
- Consomme : l'application construite (T1 à T8) ; marques `#stage[data-elements|data-version|data-selection|data-bounds|
  data-camera|data-tool|data-ready]` (`app/stage-tags.ts`, `board-session.ts`) ; boutons `button[data-item="select"]`,
  `button[data-item="file-import"]` (T8) ; `scripts/verifier.sh` tel que T6 l'a laissé.
- Produit : `node scripts/essais/c2-image-navigateur.mjs [--captures]` → code 0 (`C2 image : OK`), 1 (échec), 2 (outil
  absent).
- Réutilise : `scripts/essais/commun.mjs:136`, `:71` — `dropFile(page, sel, name, bytes, type)`, `inkIn(page, box)` ;
  ainsi que `serve`, `frames`, `stageMouse`, `item`, `TAB`, `VIEWPORT`, `loadPlaywright`, `gitSha`, `Echec` du même
  fichier.
- Réutilise : `apps/web/src/engine/tools/select.ts`, `apps/web/src/engine/tools/handles.ts` — sélection, glisser et
  poignée joués tels quels (R17).

**Contraintes (recopiées).** GC2 aucun build Tauri ni Android. GC3 aucun seuil baissé, aucun essai retiré du bloc
`--e2e`. GC4 fichiers un par un. GC5 PATH avant cargo et pnpm. GC6 VM chargée : un essai échoué sur délai est rejoué
une fois. GC7 PNG fabriqués par le script, aucun fichier de `~/telechargements-roomboard/`. GC9 budget du module
principal inchangé. GC11 commit.

**Interdits.** Passer une option de capture dans `verifier.sh` ; modifier `commun.mjs` ; modifier le code de
l'application (un défaut trouvé est rapporté avec la sortie de l'essai, pas corrigé ici).

**Test et commande bornée.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -5
bash scripts/verifier.sh --e2e 2>&1 | grep -E "^ok — S|C2 image|module formats|module Wasm|licences|e2e OK|verifier.sh : OK|ÉCHEC|FAIL|error\[" | tail -50
node scripts/essais/c2-image-navigateur.mjs --captures 2>&1 | tail -5
```
Motif de réussite : `verifier-e2e.test.sh : OK` ; au moins 15 lignes `ok — S…`, `C2 image : OK`, `S5b : OK`,
`fichiers : OK` ou l'équivalent de chaque essai, `verifier.sh : e2e OK`, `verifier.sh : OK`, `module formats : N
octets` (asset de `dist`) ; la troisième commande écrit `capture : …/docs/essais/c2-image-deposee.png`. À garder verts :
`scripts/essais/fichiers-navigateur.mjs`, `s2-navigateur.mjs`, `s34-navigateur.mjs`, `s5b-navigateur.mjs`.

**Preuve visuelle.** Lectures d'abord, puis l'image : dans la sortie de l'essai, `#stage[data-elements="1"]` après le
dépôt, `data-selection="1"` après le clic, `data-elements="1"` dans l'onglet rouvert, `data-elements="3"` après collage
et Importer ; puis `docs/essais/c2-image-deposee.png` (onglet rouvert) à décrire au rapport : un rectangle sombre à la
place et à la taille données par la poignée, sur la page blanche, barre avec le bouton « Importer ».

**Terminé quand.** `verifier.sh --e2e` vert, capture écrite et décrite, un commit.

**Étapes.**

- [ ] **1. Rendre le test de `verifier.sh` rouge** : `scripts/tests/verifier-e2e.test.sh:13` devient
  `for s in s2-navigateur s34-navigateur fichiers-navigateur s5b-navigateur c2-image-navigateur; do` ;
  `bash scripts/tests/verifier-e2e.test.sh` → `ECHEC : c2-image-navigateur absent de verifier.sh`.

- [ ] **2. `verifier.sh`.** Dans le bloc `if [ "$E2E" = 1 ]`, après `node scripts/essais/s5b-navigateur.mjs` :
  `node scripts/essais/c2-image-navigateur.mjs`. La mesure du second module posée par T2 (lignes `taille_formats=…`
  à `fi`, juste après son `wasm-bindgen`) est retirée de là et remplacée, après la vérification de la taille du module
  principal (bloc `module Wasm`), par :

```bash
# Taille du second module (R9) : l'asset émis par vite (chargé au premier besoin), 3 Mio au plus.
mapfile -t wasm_formats < <(find apps/web/dist/assets -name 'roomboard_formats_wasm_bg*.wasm')
if [ "${#wasm_formats[@]}" -ne 1 ]; then
  echo "verifier.sh : un seul module formats attendu dans apps/web/dist/assets (${#wasm_formats[@]} trouvés)" >&2
  exit 1
fi
taille_formats=$(wc -c < "${wasm_formats[0]}" | tr -d ' ')
echo "module formats : $taille_formats octets (${wasm_formats[0]})"
if [ "$taille_formats" -gt 3145728 ]; then
  echo "verifier.sh : module formats trop gros ($taille_formats octets > 3 Mio, R9)" >&2
  exit 1
fi
```

- [ ] **3. `s5b-navigateur.mjs:188-192`** (R28) :

```js
  await dropFile(page, "#stage", "photo.tif", [0x49, 0x49, 0x2a, 0x00]);
  await page.waitForTimeout(500);
  const later = dialogs.slice(dlg0).find((d) => d.type === "alert");
  check((await tabs()) === nTabs && (await attr("data-version")) === version, "dépôt d'un .tif : nombre d'onglets et data-version inchangés");
  check(later !== undefined && later.message.includes(LATER), `dépôt d'un .tif : message « ${later?.message} »`);
```

- [ ] **4. Écrire `scripts/essais/c2-image-navigateur.mjs`** :

```js
#!/usr/bin/env node
// Essai C2 « dépôt, image, conteneur » au navigateur (R26, R27 ; S1 à S5). L'application construite (apps/web/dist)
// servie en local avec la CSP de la coque, Chromium headless de Playwright, mode repli (`?fichiers=repli`), heure figée
// (deux enregistrements du même document donnent les mêmes octets). Images fabriquées ici (PNG unis), aucun fichier de
// l'utilisateur. Aucune requête hors de 127.0.0.1. Lancé par scripts/verifier.sh --e2e, sans option de capture.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Usage : node scripts/essais/c2-image-navigateur.mjs [--captures]
// (--captures : docs/essais/c2-image-deposee.png).
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync, inflateRawSync } from "node:zlib";
import { DIST, Echec, ROOT, TAB, VIEWPORT, dropFile, frames, gitSha, inkIn, item, loadPlaywright, serve, stageMouse } from "./commun.mjs";

const LABEL = "C2 image";
const LATER = "format pris en charge dans une prochaine version";
const FIXED = new Date("2026-11-20T08:00:00.000Z");
const W = 200;
const H = 150;
/** Point de dépôt de `dropFile` (commun.mjs:143) : 50 px à droite et en dessous du coin de #stage. */
const DROP = [50, 50];

/** CSP de la coque (tauri.conf.json), envoyée telle quelle (même lecture que fichiers-navigateur.mjs). */
function coqueCsp() {
  const conf = JSON.parse(readFileSync(join(ROOT, "apps", "desktop", "src-tauri", "tauri.conf.json"), "utf8"));
  const csp = conf.app.security.csp;
  return Object.entries(csp).map(([d, v]) => `${d} ${Array.isArray(v) ? v.join(" ") : v}`).join("; ");
}

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
/** PNG RVB 8 bits d'une seule couleur. */
function solidPng(w, h, [r, g, b]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const row = Buffer.alloc(1 + 3 * w);
  for (let x = 0; x < w; x++) row.set([r, g, b], 1 + 3 * x);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Entrées d'un ZIP par son répertoire central : nom → octets (stored ou deflate). */
function zipEntries(buf) {
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

const sha256 = (b) => createHash("sha256").update(b).digest("hex");

async function scenario(page, url, { captures, tmp }) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const dialogs = [];
  page.on("dialog", async (d) => {
    dialogs.push({ type: d.type(), message: d.message() });
    await d.accept();
  });
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const fr = () => frames(page);
  const mouse = stageMouse(page);
  const attr = (name) => page.getAttribute("#stage", name);
  const elements = async () => Number(await attr("data-elements"));
  const tabs = () => page.locator(TAB).count();
  const camera = async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    return { zoom, tx, ty };
  };
  const bounds = async () => ((await attr("data-bounds")) ?? "").split(",").map(Number);
  const toScreen = (c, x, y) => [x * c.zoom + c.tx, y * c.zoom + c.ty];
  const press = async (keys) => {
    await page.keyboard.press(keys);
    await fr();
  };
  const waitElements = (n) =>
    page.waitForFunction((n) => document.querySelector("#stage")?.getAttribute("data-elements") === String(n), n, { timeout: 15000 });
  const waitTabs = async (n) => {
    await page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, n, { timeout: 15000 });
    await fr();
  };
  /** Le bitmap arrive après le décodage : quelques images d'attente au plus. */
  const inkSoon = async (box) => {
    for (let i = 0; i < 40; i++) {
      if ((await inkIn(page, box)) > 0) return true;
      await page.waitForTimeout(100);
      await fr();
    }
    return false;
  };
  const saveTo = async (name) => {
    const dl = page.waitForEvent("download");
    await page.keyboard.press("Control+s");
    const file = join(tmp, name);
    await (await dl).saveAs(file);
    return file;
  };
  /** 60 % centraux d'un rectangle écran (le cadre et les poignées de la sélection restent dehors). */
  const inner = (x0, y0, x1, y1) => {
    const mx = (x1 - x0) * 0.2;
    const my = (y1 - y0) * 0.2;
    return [Math.max(2, x0 + mx), Math.max(2, y0 + my), x1 - mx, y1 - my];
  };
  const boxOfBounds = async (cam) => {
    const [a, b, c, d] = await bounds();
    const [x0, y0] = toScreen(cam, a, b);
    const [x1, y1] = toScreen(cam, c, d);
    return inner(x0, y0, x1, y1);
  };

  const png = solidPng(W, H, [20, 20, 20]);
  await page.goto(url);
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 15000 });
  await fr();
  const cam = await camera();
  const sw = W * cam.zoom;
  const sh = H * cam.zoom;
  const dropBox = inner(DROP[0] - sw / 2, DROP[1] - sh / 2, DROP[0] + sw / 2, DROP[1] + sh / 2);
  check((await inkIn(page, dropBox)) === 0, "avant le dépôt : aucun pixel sombre au point de dépôt");

  // S1 : dépôt, Ctrl+Z, Ctrl+Y.
  await dropFile(page, "#stage", "sombre.png", png, "image/png");
  await waitElements(1);
  check(await inkSoon(dropBox), 'S1 : #stage[data-elements="1"], l\'image déposée apparaît au point de dépôt');
  check((await attr("data-tool")) === "pen", "S1 : outil inchangé après l'insertion (R17)");
  await press("Control+z");
  check((await elements()) === 0 && (await inkIn(page, dropBox)) === 0, "S1 : Ctrl+Z retire l'image");
  await press("Control+y");
  check((await elements()) === 1 && (await inkSoon(dropBox)), "S1 : Ctrl+Y la remet");

  // S2 : sélection, glisser, poignée.
  await page.click(item("select"));
  await fr();
  await mouse.click(DROP[0], DROP[1]);
  await fr();
  check((await attr("data-selection")) === "1", 'S2 : clic sur l\'image avec la sélection : data-selection="1"');
  await mouse.move(DROP[0], DROP[1]);
  await mouse.down();
  await mouse.move(DROP[0] + 400, DROP[1] + 250, { steps: 10 });
  await mouse.up();
  await fr();
  const moved = [dropBox[0] + 400, dropBox[1] + 250, dropBox[2] + 400, dropBox[3] + 250];
  check((await inkIn(page, moved)) > 0 && (await inkIn(page, dropBox)) === 0, "S2 : glissée, l'image est à sa nouvelle place");
  const [x0, , x1, y1] = await bounds();
  const [hx, hy] = toScreen(cam, x1, y1);
  await mouse.move(hx, hy);
  await mouse.down();
  await mouse.move(hx + 60, hy + 45, { steps: 8 });
  await mouse.up();
  await fr();
  const [nx0, , nx1] = await bounds();
  check(nx1 - nx0 > x1 - x0 + 40, `S2 : poignée tirée, l'image grandit (${(x1 - x0).toFixed(0)} → ${(nx1 - nx0).toFixed(0)} unités)`);
  const placed = await boxOfBounds(cam);
  check((await inkIn(page, placed)) > 0, "S2 : à sa nouvelle taille, l'image couvre sa boîte");

  // S3 : enregistrer, lire l'entrée assets/, rouvrir, enregistrer encore.
  const file1 = await saveTo("image.roomboard");
  const bytes1 = await readFile(file1);
  const entry = `assets/${sha256(png)}.png`;
  const entries = zipEntries(bytes1);
  check(entries.has(entry), `S3 : le fichier contient ${entry}`);
  check(Buffer.compare(entries.get(entry), png) === 0, "S3 : l'entrée a les octets du PNG déposé (empreinte SHA-256 vérifiée)");
  const before3 = await tabs();
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Control+o");
  await (await chooser).setFiles(file1);
  await waitTabs(before3 + 1);
  check((await elements()) === 1, 'S3 : rouvert dans un nouvel onglet : data-elements="1"');
  check(await inkSoon(placed), "S3 : rouvert, les pixels sombres sont à la place de l'image");
  if (captures) {
    const path = join(ROOT, "docs", "essais", "c2-image-deposee.png");
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  }
  const file2 = await saveTo("image-2.roomboard");
  check(Buffer.compare(await readFile(file2), bytes1) === 0, "S3 : enregistrer encore donne les mêmes octets");

  // S4 : .roomboard déposé → nouvel onglet avec ses images, onglet d'origine intact.
  await page.locator(TAB).nth(0).click();
  await fr();
  const originVersion = await attr("data-version");
  const before4 = await tabs();
  await dropFile(page, "#stage", "image.roomboard", bytes1);
  await waitTabs(before4 + 1);
  check((await elements()) === 1 && (await inkSoon(placed)), "S4 : le .roomboard déposé s'ouvre dans un nouvel onglet avec son image");
  await page.locator(TAB).nth(0).click();
  await fr();
  check((await elements()) === 1 && (await attr("data-version")) === originVersion, "S4 : l'onglet d'origine reste intact");

  // S5 : collage, Importer deux images, TIFF refusé.
  await press("Control+n");
  await waitTabs(before4 + 2);
  const stage = await page.locator("#stage").boundingBox();
  const c5 = await camera();
  const mid = [stage.width / 2, stage.height / 2];
  const midBox = inner(mid[0] - (W * c5.zoom) / 2, mid[1] - (H * c5.zoom) / 2, mid[0] + (W * c5.zoom) / 2, mid[1] + (H * c5.zoom) / 2);
  await page.evaluate((bytes) => {
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array(bytes)], "colle.png", { type: "image/png" }));
    document.body.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, Array.from(png));
  await waitElements(1);
  check(await inkSoon(midBox), "S5 : l'image collée (Ctrl+V) arrive au centre de la vue");
  const p1 = join(tmp, "un.png");
  const p2 = join(tmp, "deux.png");
  await writeFile(p1, solidPng(80, 60, [200, 30, 30]));
  await writeFile(p2, solidPng(80, 60, [30, 30, 200]));
  const chooser5 = page.waitForEvent("filechooser");
  await page.click(item("file-import"));
  const fc = await chooser5;
  check(fc.isMultiple(), "S5 : « Importer » ouvre une boîte à plusieurs fichiers");
  await fc.setFiles([p1, p2]);
  await waitElements(3);
  check((await elements()) === 3, 'S5 : « Importer » deux images : data-elements="3"');
  const v5 = await attr("data-version");
  const dlg = dialogs.length;
  await dropFile(page, "#stage", "photo.tif", [0x49, 0x49, 0x2a, 0x00], "image/tiff");
  await page.waitForTimeout(500);
  const told = dialogs.slice(dlg).find((d) => d.type === "alert");
  check(told !== undefined && told.message.includes(LATER), `S5 : TIFF refusé (« ${told?.message} »)`);
  check((await attr("data-version")) === v5, "S5 : TIFF refusé, data-version inchangé");
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
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c2-"));
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

- [ ] **5. Jouer l'essai seul** après un `verifier.sh` (qui construit `dist`) : `node scripts/essais/c2-image-navigateur.mjs
  2>&1 | tail -30` → `C2 image : OK`. Un échec sur délai : rejouer une fois (GC6) ; un autre échec : rapport avec la
  sortie, aucune correction du code de l'application dans cette tâche.

- [ ] **6. Preuve** : les trois commandes de la rubrique « Test » (`verifier.sh --e2e` : 15 à 20 minutes sur la VM).

- [ ] **7. Commit.**

```bash
git add scripts/essais/c2-image-navigateur.mjs scripts/essais/s5b-navigateur.mjs scripts/verifier.sh scripts/tests/verifier-e2e.test.sh docs/essais/c2-image-deposee.png
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "test(e2e): browser run of image drop, save, reopen, paste and import

c2-image-navigateur.mjs plays S1 to S5 under the shell CSP with a fixed
clock and checks the assets/ entry bytes; s5b refuses a .tif instead of a
.png; verifier.sh measures the formats module in dist and runs the new
script under --e2e.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Lignes exigées : `Réutilisation : appelé dropFile, inkIn (commun.mjs), outils de sélection et poignées
inchangés` ; les lectures `data-*` relevées ; la description de la capture ; la ligne `module formats : N octets`.
