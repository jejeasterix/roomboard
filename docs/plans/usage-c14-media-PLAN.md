# Plan d'exécution — usage-c14-media (C14 : vidéo et son)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Cœur Rust de l'élément `media`, liaison Wasm et contrat TS (parité fausse liaison) | — | `crates/roomboard-core/src/media.rs` (neuf), `crates/roomboard-core/src/lib.rs`, `crates/roomboard-core/src/element.rs`, `crates/roomboard-core/src/document.rs`, `crates/roomboard-core/src/query.rs`, `crates/roomboard-core/src/commands.rs`, `crates/roomboard-core/tests/media.rs` (neuf), `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/api.ts`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/fake-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts` | isolé (`~/projets/roomboard-wt/usage-c14-media--T1`) | concepteur-critique | `cargo test -p roomboard-core -p roomboard-wasm 2>&1 \| grep -E "test result\|FAILED\|panicked\|error\[\|media" \| tail -40` : 0 `FAILED`, ≥ 10 tests `media` dont `set_media_is_one_step_per_setting_and_neutral_values_are_removed`, `malformed_media_is_an_unknown_frame_kept_byte_for_byte`, `every_known_kind_has_view_and_geom` ; `ROOMBOARD_WASM_REQUIRED=1 vitest run src/core` : 0 `×`, « contrat C14 » ≥ 7 tests × 2 fabriques ; `tsc` vide ; module principal ≤ 1 572 864 o | S1, S2, S3, S4 | #tache-t1 |
| T2 | Coque : empreinte et accord des vidéos liées, CSP `media-src`, protocole d'assets, contrôles, licences | — | `crates/roomboard-shell/src/lib.rs`, `crates/roomboard-shell/Cargo.toml`, `Cargo.lock`, `apps/desktop/src-tauri/src/main.rs`, `apps/desktop/src-tauri/Cargo.toml`, `apps/desktop/src-tauri/Cargo.lock`, `apps/desktop/src-tauri/tauri.conf.json`, `scripts/controle-hors-ligne.mjs`, `scripts/tests/controle-hors-ligne.test.sh`, `scripts/tests/coque-csp.test.sh`, `scripts/licences-acceptees.json` (si le contrôle l'exige), `THIRD_PARTY_NOTICES.md` | isolé (`…--T2`) | implementeur-tdd | `cargo test -p roomboard-shell 2>&1 \| grep -E "test result\|FAILED\|error\[\|media\|sha256" \| tail -20` : 0 `FAILED`, ≥ 4 tests neufs dont `sha256_granted_hashes_in_chunks` ; `bash scripts/tests/controle-hors-ligne.test.sh` : « 23 cas OK » ; `bash scripts/tests/coque-csp.test.sh` : OK ; `node scripts/controle-licences.mjs` code 0 ; `grep -c 'name = "http-range"' apps/desktop/src-tauri/Cargo.lock` = 1 | S5 | #tache-t2 |
| T3 | Détection par octets magiques, sonde et poster, refus MKV/AVI | — | `apps/web/src/platform/media-import.ts` (neuf), `apps/web/src/platform/media-import.test.ts` (neuf), `apps/web/src/platform/import.ts` | isolé (`…--T3`) | implementeur-tdd | `vitest run src/platform/media-import.test.ts src/platform/import.test.ts` : 0 `×`, « sniffMedia (C14, M10) » ≥ 1 test à 18 cas, « probeMedia (C14, M15) » ≥ 6 ; `import.test.ts` vert ; `tsc` vide | S1, S3, S4 | #tache-t3 |
| T4 | Liens relatifs, magasin `link`, `FileHost.save(encode(target))`, filtre « Importer », commandes de la coque côté page | — | `apps/web/src/platform/media-link.ts` (neuf), `apps/web/src/platform/media-link.test.ts` (neuf), `apps/web/src/core/asset-store.ts`, `apps/web/src/core/asset-store.test.ts`, `apps/web/src/platform/files.ts`, `apps/web/src/platform/files.test.ts`, `apps/web/src/platform/host-tauri.ts`, `apps/web/src/platform/host-tauri.test.ts`, `apps/web/src/platform/host-fsa.ts`, `apps/web/src/platform/host-fsa.test.ts`, `apps/web/src/platform/host-repli.ts`, `apps/web/src/platform/host-repli.test.ts` | isolé (`…--T4`) | implementeur-tdd | `vitest run src/platform src/core/asset-store.test.ts` : 0 `×`, « liens relatifs (C14, M30) » ≥ 8, « encode reçoit la cible choisie » × 3 hôtes ; `controller.test.ts` vert ; `tsc` vide | S4, S5 | #tache-t4 |
| T5 | Lecteurs d'un onglet (`MediaPlayers`), port `MediaFrames`, oracle `data-media` | — | `apps/web/src/platform/media-players.ts` (neuf), `apps/web/src/platform/media-players.test.ts` (neuf), `apps/web/src/engine/render/media-frames.ts` (neuf), `apps/web/src/engine/render/canvas2d.ts` (une ligne d'option) | isolé (`…--T5`) | concepteur-critique | `vitest run src/platform/media-players.test.ts src/engine/render/canvas2d.test.ts` : 0 `×`, « lecteurs (C14, DAM3) » ≥ 13 dont « boucle : retour au début à la fin du rognage » ; `canvas2d.test.ts` inchangé et vert ; `tsc` vide | S1, S2 | #tache-t5 |
| T6 | Barre flottante du média (`MediaBar`) et styles | — | `apps/web/src/ui/MediaBar.tsx` (neuf), `apps/web/src/ui/MediaBar.test.tsx` (neuf), `apps/web/src/ui/rb.css` | isolé (`…--T6`) | implementeur-tdd | `vitest run src/ui/MediaBar.test.tsx src/ui/Toolbar.test.tsx` : 0 `×`, « MediaBar (C14, M22) » ≥ 7 ; garde de `src/ui` (« aucun switch… aucun px ») verte ; `tsc` vide | S1, S2 | #tache-t6 |
| T7 | Rendu : branche `media` du Canvas 2D (image du lecteur, poster, carte du son, badge) | T1, T5 | `apps/web/src/engine/render/canvas2d.ts`, `apps/web/src/engine/render/canvas2d.test.ts` | isolé (`…--T7`) | implementeur-tdd | `vitest run src/engine/render/canvas2d.test.ts src/engine/render/webgl2.test.ts` : 0 `×`, « Canvas2DRenderer — média (C14) » ≥ 5 ; test du fond `kind: "video"` inconnu (`:928`) vert ; `tsc` vide | S1, S3 | #tache-t7 |
| T8 | Import des médias : gestionnaire, branche « lien », ordre du registre | T1, T3, T4 | `apps/web/src/platform/media-import.ts`, `apps/web/src/platform/media-import.test.ts`, `apps/web/src/platform/import.ts`, `apps/web/src/platform/import.test.ts`, `apps/web/src/platform/image-import.test.ts` | isolé (`…--T8`) | concepteur-critique | `vitest run src/platform/import.test.ts src/platform/image-import.test.ts src/platform/media-import.test.ts` : 0 `×`, « importFiles : médias (C14) » ≥ 10 dont « un HEIC et un AVIF restent des images après l'ajout du média » ; `tsc` vide | S1, S3, S4, S5 | #tache-t8 |
| T9 | Session et barre branchées : lecteurs par onglet, `data-media`, pause, `<MediaBar>` dans `App` | T1, T4, T5, T6 | `apps/web/src/app/board-session.ts`, `apps/web/src/app/board-session.test.ts`, `apps/web/src/ui/App.tsx`, `apps/web/src/ui/App.test.tsx`, `apps/web/src/main.ts` | isolé (`…--T9`) | implementeur-tdd | `vitest run src/app/board-session.test.ts src/ui/App.test.tsx` : 0 `×`, « session — médias (C14) » ≥ 7, « App : barre du média (C14) » ≥ 3 ; `tsc` vide | S1, S2 | #tache-t9 |
| T10 | Persistance : liés hors des absents, refus du fragment lié, résolution à l'ouverture, chemin relatif à l'enregistrement | T1, T3, T4 | `apps/web/src/app/container-io.ts`, `apps/web/src/app/container-io.test.ts`, `apps/web/src/app/workspace.ts`, `apps/web/src/app/workspace.test.ts` | isolé (`…--T10`) | concepteur-critique | `vitest run src/app/container-io.test.ts src/app/workspace.test.ts src/app/fragments.test.ts` : 0 `×`, « conteneurs : médias (C14) » ≥ 6, « espace de travail : médias (C14) » ≥ 3 dont « enregistrer un document à média lié le laisse non modifié » ; `tsc` vide | S3, S5 | #tache-t10 |
| T11 | Amorce de la coque et essai e2e C14 dans `verifier.sh --e2e`, capture d'une vidéo en lecture | T2, T7, T8, T9, T10 | `apps/web/src/main.ts`, `scripts/essais/c14-media-navigateur.mjs` (neuf), `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/c14-media-lecture.png` (neuf) | isolé (`…--T11`) | implementeur-tdd | `bash scripts/verifier.sh --e2e 2>&1 \| tail -90` : « C14 média : OK », les 14 essais d'avant « : OK », « verifier.sh : e2e OK », « verifier.sh : OK » ; tailles des deux modules sous leurs plafonds ; `bash scripts/tests/verifier-e2e.test.sh` OK ; `docs/essais/c14-media-lecture.png` présent | S1, S2, S3, S4 | #tache-t11 |

**Vagues (fichiers disjoints dans chaque vague).**

| vague | tâches en parallèle | condition |
|---|---|---|
| V1 | T1, T2, T3, T4, T5, T6 | aucune |
| V2 | T7 (dès T1, T5), T8 (dès T1, T3, T4), T9 (dès T1, T4, T5, T6), T10 (dès T1, T3, T4) | — |
| V3 | T11 | toutes fusionnées |

Fichiers repris d'une vague à l'autre (jamais en parallèle) : `canvas2d.ts` (T5 puis T7), `media-import.ts` et `import.ts` (T3 puis T8), `main.ts` (T9 puis T11).
Chemin critique : T1 (≈ 65 min) → T9 (≈ 40) → T11 (≈ 45) ≈ 2 h 30.

**Spec :** `docs/plans/usage-c14-media-cadrage.md` (commit 4743817, base `origin/main` 9549785).

**Goal :** une vidéo ou un son déposé devient un élément `media` lu dans la page (Lecture, Pause, rognage, boucle,
volume), inclus jusqu'à 50 Mo, lié en coque au-delà, refusé sur le web au-delà de 100 Mo ; MKV et AVI : message.

**Architecture :** module neuf `media.rs` du cœur (DAM1), lien dans la métadonnée d'asset (DAM2), lecteurs hors du cœur
dont l'image est dessinée par le Canvas 2D (DAM3), branche « lien » de la chaîne d'import (DAM4), barre flottante (DAM5).

## Choix du plan (hors cadrage, à relire)

- PC1 `MediaFrames` gagne `progress(id) -> { time, playing } | null` (badge et carte du son) ; `MediaPlayers` gagne
  `sync(read)` et `clear()`, `seek` prend aussi le média (création du lecteur au premier geste).
- PC2 Images du lecteur cadencées par `requestAnimationFrame` (rappel quand `currentTime` change) au lieu de
  `requestVideoFrameCallback` : celui-ci ne se déclenche ni pour un son seul ni, sous Chromium, pour une vidéo non
  composée (conteneur à opacité 0). Écart à M20, justifié.
- PC3 `controller.ts` reste inchangé : l'espace de travail enveloppe l'hôte de chaque onglet
  (`save((t) => { relink(t); return encode(t); }, to)`). Écart à la carte (controller.test.ts non touché, gardé vert).
- PC4 `link.run(file, path, ctx)` (chemin en paramètre) au lieu de `run(file & { path }, ctx)`.
- PC5 MKV et AVI : deux gestionnaires `unsupportedMediaHandler("mkv" | "avi")` à `limit.maxBytes = -1`, refusés par
  `importFiles` avant `f.blob()` avec « `<nom>` : format MKV non lu par RoomBoard ; convertissez-le en MP4 ou WebM ».
- PC6 Le gestionnaire média n'importe pas `typed` (aucune importation `platform` → `app`) : le Blob gardé n'a pas
  besoin de son type (la vidéo le reconnaît), la métadonnée porte le type, `typed` le remet à l'ouverture (T10).
- PC7 `assets.link` est atteint depuis `ImageTarget.assets` par `"link" in assets` (ImageTarget inchangé, M17).
- PC8 Lecteurs, barre : types structurels locaux (`MediaPlaySpec`, `MediaBarMedia`), sous-ensembles de `MediaData`
  (T1) : V1 sans dépendance entre tâches.
- PC9 `#stage[data-media]` : temps absent (aucun lecteur) = `0.0`.

## Global Constraints

- GC1 Budget ≈ 2 h 30 ; une tâche 25 à 65 min ; `scripts/verifier.sh --e2e` seulement en T11.
- GC2 TDD : test rouge d'abord, vu rouge, puis le code ; aucun test sauté ni désactivé (`skip`, `only`, `todo`,
  `#[ignore]`) ; aucun seuil ni délai relevé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri (`tauri build`,
  ni `cargo build`/`check` dans `apps/desktop/src-tauri`), aucun ffmpeg (ni celui de Playwright, aucun `recordVideo`),
  aucun build Android.
- GC4 Préparation du worktree `$WT` : `cd "$WT" && pnpm install --frozen-lockfile` ; tâche Rust :
  `[ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c14-media/target .` ; tâche TS :
  `mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c14-media/apps/web/src/wasm/* apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c14-media/apps/web/src/wasm-formats/* apps/web/src/wasm-formats/`.
- GC5 Module principal (tâches TS de V2, V3, et T1) : s'il n'a pas les liaisons de C14
  (`grep -q add_media apps/web/src/wasm/roomboard_wasm.d.ts` échoue), le reconstruire :
  `[ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c14-media/target . ; cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm`.
- GC6 Preuve bornée : la commande de la section telle quelle ; le rapport cite N (≥ 1) et les noms attendus vus.
  Vitest : `cd "$WT" && pnpm --filter @roomboard/web exec vitest run <fichiers> --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -80`.
- GC7 Commits : `git add <chemin>` un par un, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message
  anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; ne pas pousser. Commande type :
  `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "<msg>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
- GC8 Jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC9 Dépendances : aucune dépendance npm neuve ; Rust : `sha2 = "0.10.9"` dans `roomboard-shell`, feature
  `protocol-asset` de `tauri` (tire `http-range`, MIT) ; aucune GPL, LGPL, AGPL ; `node scripts/controle-licences.mjs` passe.
- GC10 Plafonds : module principal ≤ 1 572 864 o (1 084 202 mesurés après C12), ni baissé ni relevé ; module
  `formats` (`roomboard-formats`, `roomboard-formats-wasm`) jamais touché ; seuils de `verifier.sh` inchangés.
- GC11 Format : `schema` et `formatVersion` inchangés ; champs scalaires d'un `Y.Map`, jamais `Any::Map` ; fichiers
  d'avant C14 inchangés (`compat_socle`, `compat_c3`, `compat_grille_pr12`, `element_inconnu`, `tableau*`, `pot`,
  `texte_riche`, `scenarios` verts).
- GC12 Interface : dans `apps/web/src/ui/` aucun `switch`, aucune taille en `px` dans un `.ts(x)`, libellés en
  français, aucun bouton à icône seule. La scène ne passe jamais sous 640 px : barre flottante, aucune rangée
  permanente ; `SelectionRow.tsx`, `Toolbar.tsx`, `toolbar-host.ts`, `stage-tags.ts`, `EngineState` non touchés.
- GC13 `tsc` : `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"` vide à la fin.
- GC14 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne
  `Réutilise :` de la section, et les noms de tests vus.
- GC15 Rust : `cargo fmt --all` puis `cargo clippy -p <crate> --all-targets -- -D warnings` sans avertissement.
- GC16 Vidéo et son de test générés dans les tests (WebM par `MediaRecorder`, WAV écrit à la main, en-têtes
  synthétiques) ; jamais téléchargés ni commités en binaire (seule la capture PNG de `docs/essais/` est commitée).
- GC17 Aucun processus laissé en marche (serveur, navigateur, `vite`).
- GC18 Périmètre : seuls les fichiers de la tâche. OD86 (C5, `feat/usage-c5-image`) jamais touché ; dans les fichiers
  communs (`element.rs`, `commands.rs`, `query.rs`, `document.rs`, `lib.rs`, `roomboard-wasm/src/lib.rs`, `api.ts`,
  `wasm-core.ts`, `fake-core.ts`, contrat, `canvas2d.ts`, `board-session.ts`, `App.tsx`, `rb.css`, `verifier.sh`) :
  ajouts localisés (variantes en fin d'énumération, bras voisins), aucune réorganisation.

## Review Focus

1. WebM de `MediaRecorder` sans durée (`duration = Infinity`) : durée corrigée par un saut à la fin, sinon 0 —
   test « durée Infinity : saut à la fin, durée lue par durationchange » (T3, M15).
2. `ftyp` d'une image (HEIC, AVIF) devant le gestionnaire média — tests « marques d'image : null » (T3) et « un HEIC
   et un AVIF restent des images après l'ajout du média » (T8, effet de bord).
3. Supprimer ou annuler un média en lecture ; annuler un réglage pendant la lecture — tests « sync : lecteur jeté
   quand son élément disparaît » (T5) et « suppression du média en lecture : lecteur jeté, data-media vide » (T9).
4. Changer de page ou d'onglet pendant la lecture : aucun son d'une page cachée (H1-6) — tests « deactivate : tous en
   pause » et « changement de page : lecteurs jetés, poster revenu » (T9).
5. « Fin ici » avant le début, fin au-delà de la durée, volume hors bornes : refus sans étape, message dans la barre —
   tests `set_media_domains_follow_the_duration` (T1) et « refus du cœur : message affiché » (T6).

## Couverture du cadrage

| entrée | tâche |
|---|---|
| M1-M8, M35, M36 (cœur, format, tailles) | T1 |
| M9 (formats non touché) | GC10, T11 (fichier enregistré relu) |
| M10-M12, M15, M16 | T3 (détection, sonde), T8 (gestionnaire) |
| M13, M14, M17 | T8 |
| M18 (`typed`) | T10 (PC6) |
| M19, M21, M24, M26 | T5, T9 |
| M20, M34 | T7 |
| M22, M23, M25 | T6, T9 |
| M27, M28, M29, M37 | T2 |
| M30 | T4 (`relativeLink`), T10 (écriture), T1 (`relink_assets`) |
| M31, M32 | T10 (T1 pour `linked_assets`) |
| M33 | T4 |
| M38 | T11 |
| S1 | T1, T3, T5, T6, T7, T8, T9, T11 · S2 : T1, T5, T6, T9, T11 · S3 : T1, T3, T7, T8, T10, T11 · S4 : T1, T3, T4, T8, T11 · S5 : T2, T4, T8, T10 |

Effets de bord → tests : HEIC/AVIF → T8 ; R30 → T10 « asset lié : Enregistrer permis ; image absente : refusé » ;
`FileHost.save` → T4 « encode reçoit la cible choisie » (3 hôtes) ; document lié non modifié → T10 ; `media` mal
formé → T1 `malformed_media_is_an_unknown_frame_kept_byte_for_byte` ; CSP → T2 ; filtre « Importer » → T4.

---

<a id="tache-t1"></a>

### Tâche T1 — Cœur Rust de l'élément `media`, liaison Wasm et contrat TS (parité fausse liaison)

**Objectif.** Le cœur lit et écrit l'élément `media` (M2, M5-M8) : `AddMedia` (élément + métadonnées du média, avec
`linked`, et du poster, une étape), `SetMedia` (état voulu, neutres retirés, même état sans étape), lecture tolérante
(média mal formé = cadre inconnu, jamais `None`), `linked_assets`, `relink_assets` (hors historique, version
inchangée). La liaison Wasm les expose ; `api.ts`, `wasm-core.ts` et `fake-core.ts` les reflètent à l'identique.

**Fichiers.** Créer `crates/roomboard-core/src/media.rs`, `crates/roomboard-core/tests/media.rs`. Modifier
`crates/roomboard-core/src/lib.rs` (`pub mod media;` après `pub mod ink;`), `element.rs:27-29` (`KNOWN_KINDS`),
`:78-117` (`ElementView.media`, `bare`), `document.rs:93-105` (voisinage de `write_asset_meta`), `:341-370` (bras
`media` d'`element`), `:436-438` (voisinage de `transact_local`), `:1231-1305` (test I3), `query.rs:124-137` (bras après
le tableau), `commands.rs` (variantes et `BadMedia` en fin d'énumération, bras d'`apply` en fin), `roomboard-wasm/src/lib.rs`
(voisinage d'`add_image` `:540-556`, `_inner` voisins de `:1182`, tests après `:1986`), `apps/web/src/core/api.ts`,
`wasm-core.ts`, `fake-core.ts`, `wasm-core.contract.test.ts` (blocs ajoutés en fin de fichier).

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit (Rust, `media.rs`) :
  - `pub const MEDIA_KIND: &str = "media";` `pub const MAX_LINK_CHARS: usize = 4096;`
  - `pub enum MediaType { Video, Audio }` avec `as_str(self) -> &'static str` et `parse(&str) -> Option<MediaType>`.
  - `#[derive(Debug, Clone, PartialEq, serde::Serialize)] #[serde(rename_all = "camelCase")] pub struct MediaView { asset: String, media_type: String, w: f64, h: f64, duration: f64, poster: Option<String>, trim_start: f64, trim_end: Option<f64>, #[serde(rename = "loop")] looped: bool, volume: f64 }` (champs `pub`).
  - `pub struct NewMedia<'a> { page: &'a str, asset: &'a AssetRef, linked: Option<&'a str>, media_type: MediaType, w: f64, h: f64, duration: f64, poster: Option<&'a AssetRef>, matrix: &'a Transform }`.
  - `#[derive(Debug, Clone, Copy, PartialEq)] pub struct MediaSettings { trim_start: f64, trim_end: Option<f64>, looped: bool, volume: f64 }`.
  - `#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)] pub struct LinkedAsset { pub id: String, pub path: String }`.
  - `pub(crate) fn read_media<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<(Transform, MediaView)>`.
  - `impl Document { pub(crate) fn cmd_add_media(&mut self, m: &NewMedia<'_>) -> Result<Change, CommandError>; pub(crate) fn cmd_set_media(&mut self, id: &str, s: &MediaSettings) -> Result<Change, CommandError>; pub fn linked_assets(&self) -> Vec<LinkedAsset>; pub fn relink_assets(&mut self, links: &[LinkedAsset]) -> usize }`.
  - `commands.rs` : `Command::AddMedia { page: String, asset: AssetRef, linked: Option<String>, media_type: crate::media::MediaType, w: f64, h: f64, duration: f64, poster: Option<AssetRef>, matrix: Transform }`, `Command::SetMedia { id: String, trim_start: f64, trim_end: Option<f64>, looped: bool, volume: f64 }`, `CommandError::BadMedia` dont le `Display` vaut exactement « média invalide (vidéo ou son, boîte finie > 0, durée finie ≥ 0, début ≥ 0 avant la fin, fin dans la durée, volume de 0 à 1, chemin lié de 1 à 4 096 caractères attendus) ».
  - `document.rs` : `pub(crate) fn insert_media_asset_meta(&self, txn: &mut TransactionMut, a: &AssetRef, linked: Option<&str>)` (sans lien : `write_asset_meta` inchangé ; avec lien : `MapPrelim::from([name, mime, size, ("linked", …)])`, seulement si absente) ; `pub(crate) fn transact_untracked(&self) -> TransactionMut<'_>` (`self.doc.transact_mut()`, sans origine).
  - Wasm : `add_media(page, asset, name, mime, size: f64, linked: Option<String>, media_type: &str, w, h, duration, poster: Option<String>, poster_name: &str, poster_mime: &str, poster_size: f64, matrix: &[f64]) -> Result<JsValue, JsError>` ; `set_media(id, trim_start: f64, trim_end: Option<f64>, looped: bool, volume: f64)` ; `linked_assets(&self) -> Result<JsValue, JsError>` (`[{ id, path }]`) ; `relink_assets(&mut self, ids: Vec<String>, paths: Vec<String>) -> u32` ; `_inner` : `add_media_inner(&mut self, page: &str, asset: AssetRef, linked: Option<String>, media_type: &str, box_duration: [f64; 3], poster: Option<AssetRef>, matrix: &[f64]) -> Result<Change, CommandError>` (matrice de longueur ≠ 6 : `BadMatrix` ; type inconnu : `BadMedia`), `set_media_inner(&mut self, id: &str, trim_start: f64, trim_end: Option<f64>, looped: bool, volume: f64)`, `relink_assets_inner(&mut self, ids: &[String], paths: &[String]) -> usize`.
- Produit (TS, `api.ts`, lus par T3-T11) :
  ```ts
  export type MediaType = "video" | "audio";
  export interface MediaData { readonly asset: string; readonly mediaType: MediaType; readonly w: number; readonly h: number; readonly duration: number; readonly poster: string | null; readonly trimStart: number; readonly trimEnd: number | null; readonly loop: boolean; readonly volume: number }
  export interface MediaElement extends ElementBase { readonly kind: "media"; readonly media: MediaData }
  export interface LinkedAsset { readonly id: string; readonly path: string }
  // Command : | { type: "AddMedia"; page; asset: AssetRef; linked: string | null; mediaType: MediaType; w; h; duration; poster: AssetRef | null; matrix: Matrix }
  //           | { type: "SetMedia"; id; trimStart: number; trimEnd: number | null; loop: boolean; volume: number }
  // ElementKind gagne "media" ; ElementView gagne MediaElement.
  // CoreDocument : linkedAssets(): LinkedAsset[]; relinkAssets(links: readonly LinkedAsset[]): number;
  export const MEDIA_KIND = "media"; export const MAX_LINK_CHARS = 4096; export const BAD_MEDIA_MESSAGE = "média invalide (…)"; // texte exact du cœur
  ```
- Réutilise : `crates/roomboard-core/src/commands.rs:597` (`apply`) et `history.rs:19-31` — variantes `AddMedia`, `SetMedia` (une transaction `"local"` = une étape ; `relink_assets` sans origine, hors historique).
- Réutilise : `crates/roomboard-core/src/document.rs:93` (`write_asset_meta`) — étendu par `insert_media_asset_meta` (écrit `linked` en plus, si donné, seulement si absente).
- Réutilise : `crates/roomboard-core/src/commands.rs:471` (`valid_asset(&AssetRef)`) — pour `asset` et `poster`.
- Réutilise : `crates/roomboard-core/src/document.rs:240` (`cited_assets`) — parcours générique : `asset` et `poster` cités sans changement ; base de `linked_assets`.
- Réutilise : `crates/roomboard-core/src/copy.rs:102-118` (`copy_asset_meta`) — recopie `linked` (test `copying_an_included_media_keeps_media_and_poster_meta`).
- Réutilise : `crates/roomboard-core/src/element.rs:283` (`unknown_view(txn, e)`) — repli du média mal formé dans `element()` et `element_geom`.

**Patron à ne pas reprendre (concepteur-critique).**
- `read_image` rend `None` pour une image mal formée (`crates/roomboard-core/src/element.rs:268-281`), et le bras
  `image` d'`element()` disparaît (`document.rs:328-334`) : pour un média, `None` doit donner le cadre inconnu, comme le
  tableau (`document.rs:335-347`, `query.rs:124-137`).
- `cmd_add_image` (`commands.rs:917-956`) n'écrit qu'une métadonnée sans lien : ne pas modifier `write_asset_meta`
  (ses deux appels, dont `from_pdf_pages`, restent à l'octet) ; passer par `insert_media_asset_meta`.
- Fausse liaison : `loadElement` rend une image mal formée `malformed` (invisible, `fake-core.ts:1419-1426`) ; un média
  mal formé suit le repli du tableau (`fake-core.ts:1403-1418`) : cadre inconnu `sourceKind: "media"`, brut gardé.
- Parité des messages : les deux liaisons rendent les mêmes textes (`BAD_MEDIA_MESSAGE`, `élément inconnu : <id>`).

**Règles de comportement (code).**
- `cmd_add_media` : ordre des refus, sans transaction : `BadAsset` (asset ou poster non valides) → `BadMedia` (`linked`
  vide ou > 4 096 caractères, `w`/`h` non finis > 0 ou hors f32 (`fits_f32`), `duration` non finie ou < 0) →
  `BadMatrix` (`valid_matrix`) → `UnknownPage`. Champs écrits : `id`, `kind`, `transform`, `asset`, `mediaType`, `w`,
  `h`, `duration`, `poster` si donné ; même transaction : `insert_media_asset_meta(asset, linked)` puis
  `insert_asset_meta(poster)`. `Change { pages: [page], ids: [id] }`.
- `read_media` : obligatoires `kind == "media"`, `transform`, `asset` (`is_asset_id`), `mediaType` (`video`/`audio`),
  `w`, `h` (finis > 0, en f32) ; facultatifs (illisible ou hors domaine = neutre) : `duration` (≥ 0, sinon 0),
  `poster` (empreinte), `trimStart` (≥ 0, < durée si durée > 0, sinon 0), `trimEnd` (> début, < durée si durée > 0 ;
  égal à la durée = `None`), `loop` (`Any::Bool`, sinon faux), `volume` ([0, 1], sinon 1).
- `cmd_set_media` : `UnknownElement(id)` si l'id manque, `BadMedia` si l'élément n'est pas un média lisible ou si les
  réglages sortent du domaine (`trim_start` fini ≥ 0 et < durée si connue ; `trim_end` fini > début et ≤ durée si
  connue ; `volume` dans [0, 1]) ; état voulu normalisé (`trim_end == durée` → `None`) ; égal à l'état lu → `unchanged()`
  sans transaction ; sinon une transaction `"local"` qui pose ou retire `trimStart` (retiré si 0), `trimEnd` (retiré si
  `None`), `loop` (retiré si faux), `volume` (retiré si 1).
- `linked_assets` : ids cités (`cited_assets`) dont la métadonnée porte un `linked` textuel non vide, triés.
- `relink_assets` : pour chaque lien de chemin valide (1 à 4 096 caractères) dont l'asset porte déjà un `linked`
  différent : réécrit dans **une** transaction `transact_untracked` ; rend le nombre réécrit ; 0 : aucune transaction ;
  `version` jamais incrémentée.
- `element()` : bras `Some(crate::media::MEDIA_KIND)` → `ElementView { media: Some(..), ..bare(id, "media", t) }`,
  sinon `unknown_view`. `element_geom` : bras après le tableau, boîte `w × h` ou boîte inconnue.
- Fausse liaison : `KNOWN_KINDS` gagne `"media"` ; `FakeElement.media?: MediaData` ; `worldPolygon` (boîte) ;
  `AddMedia`, `SetMedia` (même ordre, mêmes normalisations) ; `element()` ; `savedElement` (`{ id, kind: "media",
  transform, media, ...group }`) et `loadElement` (média illisible → cadre inconnu, `raw` = le média brut, boîte
  `unknownBox(raw)`) ; `putMeta(assets, a, linked = null)` ; `linkedAssets()` ; `relinkAssets()` (hors étape, version
  inchangée). `wasm-core.ts` : `toElementView` cas `"media"` (contrôle de forme : `poster`/`trimEnd` `undefined` → null,
  `mediaType` hors `video`/`audio`, `loop` non booléen, `w`/`h` non finis > 0 → `ElementView invalide`) ; `apply` des
  deux commandes (`null` → `undefined`) ; `linkedAssets` (tableau contrôlé) ; `relinkAssets(ids, paths)`.

**Tests rouges à écrire.**
- `media.rs` (unité) : `add_media_is_one_step_with_media_and_poster_meta` (vue complète aux neutres, cités
  `[webm, jpg]` triés, annuler retire élément et métadonnées, `linked_assets` vide) ;
  `add_media_refusals_write_nothing` (10 cas : asset `"ABC"`, poster invalide, `linked` vide, 4 097 caractères, `w = 0`,
  `h = 1e39`, durée NaN, durée −1, matrice nulle → `BadMatrix`, page inconnue ; `writes(&d).since() == 0`, version 0) ;
  `set_media_is_one_step_per_setting_and_neutral_values_are_removed` (même état : 0 écriture ; 4 réglages puis 4
  annulations dans l'ordre ; « tout garder » : clés brutes `[asset, duration, h, id, kind, mediaType, poster, transform,
  w]`) ; `set_media_domains_follow_the_duration` (9 réglages hors domaine sur 2,5 s → `BadMedia`, id inconnu →
  `UnknownElement`, image → `BadMedia`, fin = durée : aucune étape ; durée 0 : fin 9 après début 3 acceptée) ;
  `unreadable_optional_fields_read_as_neutral_and_required_ones_fall_back_to_unknown` (brut `trimStart: "x"`,
  `trimEnd: 9.0`, `loop: 1.0`, `volume: 7.0`, `poster: "x"` → neutres ; `mediaType: "hologram"` → `unknown`,
  `source_kind == "media"`, boîte 320 × 180, `bounds` présente) ; `linked_assets_and_relink_stay_outside_history`
  (relink du média lié = 1, poster non lié ignoré, une écriture, version et `can_undo` inchangés, même chemin → 0,
  annuler l'ajout → `linked_assets` vide).
- `tests/media.rs` : `media_survives_save_and_load_with_settings_poster_and_link` ;
  `malformed_media_is_an_unknown_frame_kept_byte_for_byte` (état yrs `Doc::with_client_id(7)` : `m1` au `mediaType`
  inconnu, `m2` sans `asset` ; deux cadres inconnus ; `save(load(save(d))) == save(d)`) ;
  `copying_an_included_media_keeps_media_and_poster_meta` (`extract` : cités identiques, lien recopié pour un média lié).
- `document.rs` : `every_known_kind_has_view_and_geom` reçoit le bras `"media" => Command::AddMedia { … }`.
- `roomboard-wasm` : `add_media_inner_then_set_media_and_links` (vue `media`, `"hologram"` → `BadMedia`, réglages
  relus, `relink_assets_inner` = 1, `linked_assets` relu).
- Contrat TS, `describe.each(factories)("contrat C14 : $name")` : « AddMedia : une étape, vue aux réglages neutres,
  média et poster cités ; annuler retire tout (S1, M5) » (`toEqual` de la vue complète, `bounds` = `{100,50,420,230}`
  pour la matrice `[1,0,0,1,100,50]` et 320 × 180) ; « AddMedia : refus sans étape » (10 cas, messages exacts,
  `unchanged`) ; « SetMedia : une étape par réglage, neutres retirés, même état sans étape ; annuler un par un (S2) » ;
  « SetMedia : domaines contre la durée ; fin égale à la durée ; id inconnu ; image (M6) » ; « enregistré puis relu :
  réglages, poster et lien gardés (S3) » ; « relinkAssets : hors historique, version inchangée (M30) » ; « copie
  (extract) : média inclus garde ses assets, média lié garde son lien (M32) ». Bloc « contrôle de forme C14 (média) ».
  Le test `video3d` (`:147-154`) reste vert.

**Test et commande bornée.**
```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
cargo test -p roomboard-core -p roomboard-wasm 2>&1 | grep -E "test result|FAILED|panicked|error\[|media" | tail -40
# puis GC5 (reconstruction), puis :
ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web exec vitest run src/core --reporter=verbose 2>&1 | grep -E "C14|×|FAIL|Test Files|Tests " | tail -60
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"; wc -c apps/web/src/wasm/roomboard_wasm_bg.wasm
cargo test -p roomboard-formats --test container 2>&1 | grep "test result"
```
Attendu : 0 `FAILED`, ≥ 10 tests `media` nommés ci-dessus `ok` ; tests d'avant C14 verts (GC11) ; « contrat C14 » × 2
fabriques sans `×` ; `tsc` vide ; module ≤ 1 572 864 o ; `container.rs` vert.

**Contraintes (recopiées).** GC2 TDD, aucun test sauté, aucun seuil relevé · GC3 PATH, aucun build Tauri, aucun
ffmpeg · GC4 préparation Rust et TS · GC5 module principal reconstruit et mesuré · GC6 preuve bornée · GC7 commits ·
GC8 interdits git · GC9 aucune dépendance neuve ici · GC10 module ≤ 1 572 864 o, `formats` non touché · GC11 format et
fixtures · GC13 `tsc` vide · GC14 lignes `Réutilisation :` · GC15 fmt et clippy (`-p roomboard-core -p roomboard-wasm`)
· GC17 aucun processus · GC18 C5 : ajouts localisés, variantes en fin d'énumération, `write_asset_meta` à l'octet.

**Interdits.** Aucun champ ajouté à `AssetInfo` ; aucune `Any::Map` ; ne pas toucher `read_image`, `cmd_add_image`,
`ImageView`, `roomboard-formats*` ; aucun changement de `schema`/`formatVersion`.

**Critère « terminé ».** Les deux commandes bornées vertes avec les noms ci-dessus, clippy propre, taille relevée,
commits.

**Étapes.**
- [ ] 1. Tests Rust rouges (`media.rs` réduit au module `tests` + `pub mod media;`, `tests/media.rs`, bras I3,
  test wasm) ; `cargo test -p roomboard-core media 2>&1 | tail -5` : erreurs de compilation (rouge).
- [ ] 2. `media.rs` (types, `read_media`, commandes, liens), `element.rs`, `document.rs`, `query.rs`, `commands.rs`
  selon les règles ci-dessus ; vert ; fmt, clippy. Commit `feat(core): media element with trim, loop, volume and links`.
- [ ] 3. Liaison Wasm (`add_media`, `set_media`, `linked_assets`, `relink_assets` et leurs `_inner`) ; test vert ;
  commit `feat(wasm): expose media commands and linked assets`.
- [ ] 4. Contrat TS rouge (blocs C14 du contrat) ; `api.ts`, `fake-core.ts`, `wasm-core.ts` ; GC5 ; vert sur les deux
  fabriques ; `tsc` ; commit `feat(core-ts): media contract, fake parity and wasm adapter`.
- [ ] 5. Rapport : noms vus, N, taille du module, six lignes `Réutilisation :`.

<a id="tache-t2"></a>

### Tâche T2 — Coque : empreinte et accord des vidéos liées, CSP `media-src`, protocole d'assets, contrôles, licences

**Objectif.** La coque calcule en Rust l'empreinte d'une vidéo à lier (morceaux de 8 Mio), la retrouve à l'ouverture
par sa taille, et la sert par le protocole d'assets à portée vide accordée fichier par fichier (M27-M29). La CSP admet
`media-src 'self' blob: asset: http://asset.localhost` ; le contrôle hors ligne admet `asset:` dans `media-src`
seulement et vérifie l'accord configuration / feature `protocol-asset`.

**Interfaces.**
- Consomme : rien.
- Produit (`roomboard-shell`) :
  - `pub const MEDIA_EXTENSIONS: &[&str] = &["mp4", "m4v", "m4a", "mov", "webm", "mp3", "wav", "ogg", "oga", "ogv"];`
    `pub const HASH_CHUNK: usize = 8 * 1024 * 1024;` `pub fn has_media_extension(path: &Path) -> bool` (sans casse).
  - `ReadError` gagne `NotMedia` (« extension de média attendue ») et `SizeMismatch` (« taille différente »).
  - `pub fn sha256_granted(g: &GrantedPaths, path: &Path) -> Result<String, ReadError>` : chemin accordé
    (`granted_path`), extension média, lecture par `HASH_CHUNK`, hexadécimal minuscule.
  - `pub fn check_linked_media(path: &Path, size: u64) -> Result<PathBuf, ReadError>` : canonique, fichier ordinaire,
    extension média, `metadata.len() == size` ; rend le chemin canonique.
- Produit (`main.rs`, non compilé sur la VM : essai réel en reste, H1-7) : `#[tauri::command] async fn link_media(app: AppHandle, granted: State<'_, GrantedPaths>, path: String) -> Result<String, String>` (si non accordé et `app.fs_scope().is_allowed(&p)` via `tauri_plugin_fs::FsExt` : accordé ; `sha256_granted` ; `app.asset_protocol_scope().allow_file(&canonique)`) ; `#[tauri::command] async fn relink_media(app: AppHandle, granted: State<'_, GrantedPaths>, path: String, size: u64) -> Result<bool, String>` (`check_linked_media`, `grant`, `allow_file` ; introuvable : `Ok(false)`) ; ajoutés à `generate_handler!`. Noms lus par T4 : `link_media { path }`, `relink_media { path, size }`.
- Produit (`tauri.conf.json`) : `"media-src": "'self' blob: asset: http://asset.localhost"` ;
  `app.security.assetProtocol = { "enable": true, "scope": [] }`. `src-tauri/Cargo.toml` : `tauri = { version = "2", features = ["protocol-asset"] }`.
- Produit (`controle-hors-ligne.mjs`) : `SCHEME_TOKENS` gagne `["asset:", new Set(["media-src"])]` ;
  `export function checkAssetProtocol(conf, cargoToml): string[]` (activé ⇒ `scope` tableau vide, sinon « app.security.assetProtocol.scope doit être vide (chaque fichier lié est accordé par la coque) » ; activé sans feature ⇒ « assetProtocol activé sans la feature protocol-asset de tauri (src-tauri/Cargo.toml) » ; feature sans activation ⇒ « feature protocol-asset de tauri sans app.security.assetProtocol.enable ») ; `main` lit `Cargo.toml` voisin de la configuration (absent : `""`).
- Réutilise : `crates/roomboard-shell/src/lib.rs:56` (`granted_path`), `:72` (`read_granted`) — `granted_path` appelé par `sha256_granted`, qui suit le patron de `read_granted` (chemin canonique vérifié, jamais le chemin reçu).
- Réutilise : `scripts/controle-hors-ligne.mjs:65` (`checkCsp`) — étendu par `SCHEME_TOKENS` et `checkAssetProtocol(conf, cargoToml)`.

**Tests rouges à écrire.**
- `roomboard-shell` : `sha256_granted_hashes_in_chunks` (fichier `a.webm` de `8 Mio + 3` octets : égal à
  `Sha256::digest` en hexadécimal ; `"abc"` → `ba7816bf…15ad`) ; `sha256_granted_refuses_ungranted_and_non_media`
  (`NotGranted`, `a.txt` accordé → `NotMedia`) ; `check_linked_media_needs_media_extension_and_same_size` (ok, taille
  différente → `SizeMismatch`, `.txt` → `NotMedia`, absent → `Io`) ; `media_extensions_ignore_case` (`A.WEBM`).
- `controle-hors-ligne.test.sh` : cas 19 `asset:` dans `img-src` → refus « img-src » ; cas 20 configuration
  `media-src 'self' blob: asset: http://asset.localhost` + `assetProtocol {enable, scope: []}` + `Cargo.toml` avec la
  feature, dans `$tmp/coque/` → OK ; cas 21 `scope: ["$HOME/**"]` → refus « scope » ; cas 22 activé sans feature →
  refus « protocol-asset » ; cas 23 la vraie configuration (`apps/desktop/src-tauri/tauri.conf.json`) sur le dist
  propre → OK. Message final « 23 cas OK ».
- `coque-csp.test.sh` : `echo "$csp" | grep -q "media-src 'self' blob:" || ko "media-src de la coque absent : $csp"`.

**Étapes.**
- [ ] 1. Tests Rust rouges ; `sha2 = "0.10.9"` dans `crates/roomboard-shell/Cargo.toml` ; code ; vert ; fmt, clippy
  `-p roomboard-shell` ; commit `feat(shell): hash and check linked media files` (avec `Cargo.lock` racine).
- [ ] 2. Cas shell rouges ; `controle-hors-ligne.mjs` ; `tauri.conf.json` ; feature dans `src-tauri/Cargo.toml` ;
  `cd apps/desktop/src-tauri && cargo metadata --format-version 1 > /dev/null` (verrou mis à jour, **aucun build**) ;
  `main.rs` ; tests shell verts ; commit `feat(desktop): media-src CSP, asset protocol with empty scope, link commands`.
- [ ] 3. `node scripts/controle-licences.mjs` (code 0 ; exception écrite seulement s'il l'exige) ;
  `THIRD_PARTY_NOTICES.md` : section « Coque Tauri (C14, protocole d'assets) » (version d'`http-range` lue dans le
  verrou, MIT, dépôt, texte de licence lu dans `~/.cargo/registry/src/*/http-range-*/LICENSE*`) et ligne `sha2` de
  `roomboard-shell` ; commit `docs(licences): http-range for the asset protocol`.

**Test et commande bornée.** La colonne preuve de la table, telle quelle.

**Contraintes (recopiées).** GC2 · GC3 (aucun `cargo build`/`check` dans `src-tauri`, `cargo metadata` seulement) ·
GC4 (Rust) · GC6 · GC7 · GC8 · GC9 (`sha2` 0.10.9, `protocol-asset`, `http-range` MIT, licences contrôlées) · GC14 ·
GC15 · GC17 · GC18.

**Interdits.** Aucune portée statique du protocole d'assets ; `scopeDroppedPaths` reste `false` ; aucun nouvel hôte
distant dans la CSP ; `capabilities/default.json` non touché.

**Critère « terminé ».** Preuve verte, verrou de `src-tauri` avec `http-range`, trois commits, deux lignes
`Réutilisation :`.

<a id="tache-t3"></a>

### Tâche T3 — Détection par octets magiques, sonde et poster, refus MKV/AVI

**Objectif.** Fonctions pures et sonde du module média (M10, M12, M15, M16) ; champs `probe` et `linkMedia` de
`ImportDeps` (lus par T8 et T10).

**Interfaces.**
- Produit (`platform/media-import.ts`) :
  ```ts
  export type MediaFormat = "mp4" | "mov" | "webm" | "mp3" | "wav" | "ogg" | "m4a";
  export type MediaSniff = { readonly format: MediaFormat; readonly mime: string } | { readonly unsupported: "mkv" | "avi" };
  export const MEDIA_MIME: Readonly<Record<MediaFormat, string>>; // mp4 video/mp4, mov video/quicktime, webm video/webm, mp3 audio/mpeg, wav audio/wav, ogg audio/ogg, m4a audio/mp4
  export function sniffMedia(head: Uint8Array, name: string): MediaSniff | null;
  export const MEDIA_INCLUDE_MAX_BYTES = 50 * 1024 * 1024; export const MEDIA_PASTE_MAX_BYTES = 100 * 1024 * 1024;
  export const PROBE_TIMEOUT_MS = 15_000; export const POSTER_MAX = 1920; export const POSTER_QUALITY = 0.85; export const POSTER_MIME = "image/jpeg";
  export const AUDIO_BOX: { readonly w: 480; readonly h: 120 };
  export const CODEC_UNREADABLE = "codec non lu sur ce poste";
  export const MEDIA_TOO_BIG = "trop lourd pour être inclus (plus de 100 Mo)";
  export const MEDIA_LINKED_NOTE = "vidéo non incluse dans le document (liée, plus de 50 Mo)";
  export const unsupportedMediaMessage = (kind: "mkv" | "avi"): string => `format ${kind.toUpperCase()} non lu par RoomBoard ; convertissez-le en MP4 ou WebM`;
  export function posterSize(w: number, h: number): { readonly w: number; readonly h: number }; // côté ≤ 1920, jamais agrandi, ≥ 1
  export interface ProbeVideo { src: string; preload: string; muted: boolean; playsInline: boolean; crossOrigin: string | null; currentTime: number; readonly duration: number; readonly videoWidth: number; readonly videoHeight: number; addEventListener(t: "loadedmetadata" | "durationchange" | "seeked" | "error", cb: () => void): void; removeEventListener(t: "loadedmetadata" | "durationchange" | "seeked" | "error", cb: () => void): void; removeAttribute(n: "src"): void; load(): void }
  export interface MediaPorts { createVideo(): ProbeVideo; snapshot(video: ProbeVideo, w: number, h: number): Promise<Blob | null>; setTimer(cb: () => void, ms: number): () => void }
  export interface MediaProbe { readonly duration: number; readonly width: number; readonly height: number; readonly poster: Blob | null }
  export interface LinkedMedia { readonly id: string; readonly url: string }
  export function browserMediaPorts(): MediaPorts; // <video> hors DOM ; snapshot : canvas, drawImage (instanceof HTMLVideoElement), toBlob JPEG 0,85 ; toile salie : null
  export function probeMedia(url: string, ports?: MediaPorts, timeoutMs?: number): Promise<MediaProbe>;
  export function unsupportedMediaHandler(kind: "mkv" | "avi"): ImportHandler; // id `media-${kind}`, objet, detect = sniff.unsupported === kind, limit { maxBytes: -1, message: unsupportedMediaMessage(kind) }, run → "failed"
  ```
- Produit (`import.ts`, `ImportDeps`) : `readonly probe?: (url: string) => Promise<MediaProbe>;` et
  `linkMedia?(path: string): Promise<LinkedMedia>;` (aucun autre changement ici).
- Réutilise : `apps/web/src/platform/image-import.ts:29` (`HEAD_BYTES`) et `import.ts:231-238` (`f.head(HEAD_BYTES)`) — `sniffMedia` ne lit que l'en-tête déjà lu par `importFiles`.
- Réutilise : aucun module existant pour la détection — nouveau `platform/media-import.ts` (`sniffImage`, `hasPdfMagic`, `hasZipMagic` ne lisent ni `ftyp` vidéo, ni EBML, ni RIFF WAVE/AVI, ni OggS, ni ID3).
- Réutilise : aucun module existant pour la sonde — même module neuf (`decodeImage` ne décode que des images).

**Règles.** `sniffMedia` suit M10 à la lettre : `ftyp` en +4 avec marque majeure `qt  ` → mov ; `M4A `/`M4B ` → m4a ;
marques d'image `avif avis heic heix hevc hevx heim heis mif1 msf1 mif2` → null ; autre → mp4 ; atome `moov|mdat|wide|free`
en +4 et nom `.mov` → mov ; EBML `1A 45 DF A3` : DocType (élément `42 82`, taille vint d'un octet, cherché dans les 64
premiers octets) `webm` → webm, `matroska` → `{ unsupported: "mkv" }` ; `RIFF`…`WAVE` → wav, `RIFF`…`AVI ` →
`{ unsupported: "avi" }`, autre RIFF (WEBP) → null ; `OggS` → ogg ; `ID3` ou `FF` avec `(b1 & 0xE6) == 0xE2` → mp3.
`probeMedia` : `preload="metadata"`, `muted`, `playsInline`, `crossOrigin="anonymous"`, attente de `loadedmetadata`
(chaque étape en course contre un délai global `timeoutMs`) ; `duration === Infinity` → `currentTime = 1e101`, attente de
`durationchange` ; durée finie > 0 arrondie à la milliseconde, sinon 0 ; `videoWidth > 0` : saut à
`min(1, durée / 10)`, attente de `seeked`, `snapshot(video, posterSize(w, h))` ; `error` ou délai → rejet
`Error(CODEC_UNREADABLE)` ; toujours `removeAttribute("src")` puis `load()` à la fin.

**Tests rouges** (`media-import.test.ts`, faux `ProbeVideo` à événements en micro-tâche) : « sniffMedia (C14, M10) »
(table de 18 cas : mp4 `isom`, mov `qt  `, m4a, HEIC → null, AVIF → null, atome `moov` + `.mov`, `moov` sans `.mov` →
null, webm, mkv, wav, avi, WEBP → null, OggS, ID3, synchro `FF FB`, JPEG `FF D8 FF` → null, PNG → null, vide → null) ;
« probeMedia (C14, M15) » : vidéo 2,5 s 640 × 360 (poster demandé en 640 × 360 à 0,25 s) ; « durée Infinity : saut à la
fin, durée lue par durationchange » (Review Focus 1) ; son (`videoWidth` 0 : poster null, `snapshot` jamais appelé) ;
`error` → rejet « codec non lu sur ce poste » ; délai (`timeoutMs` 20, aucun événement) → même rejet ; `src` retiré et
`load` appelé dans tous les cas ; `posterSize(3840, 2160)` → 1920 × 1080, `posterSize(320, 180)` inchangé ;
« MKV et AVI : gestionnaires de refus » (detect, `limit.maxBytes === -1`, message exact).

**Étapes.** 1. Tests rouges, vus rouges. 2. Module ; vert. 3. Champs d'`ImportDeps` ; `import.test.ts` vert ; `tsc`.
4. Commit `feat(import): media sniffing, probe and poster, MKV/AVI refusal`.

**Test et commande bornée.** GC6 avec `src/platform/media-import.test.ts src/platform/import.test.ts` ; attendu : la
colonne preuve.

**Contraintes (recopiées).** GC2 · GC3 (aucun ffmpeg, aucune conversion) · GC4 (TS) · GC6 · GC7 · GC8 · GC9 (aucune
dépendance npm) · GC13 · GC14 · GC16 (en-têtes synthétiques dans le test) · GC17 · GC18.

**Interdits.** Ne pas toucher `image-import.ts` ; aucun import `platform` → `app` ; aucun gestionnaire enregistré
ici (T8).

**Critère « terminé ».** Preuve verte, un commit, trois lignes `Réutilisation :`.

<a id="tache-t4"></a>

### Tâche T4 — Liens relatifs, magasin `link`, `FileHost.save(encode(target))`, filtre « Importer », commandes de la coque côté page

**Interfaces.**
- Produit (`platform/media-link.ts`) : `export function isAbsoluteLink(path: string): boolean;`
  `export function relativeLink(docPath: string, mediaPath: string): string;` (séparateur `/` ; même racine : `..`
  puis le reste ; autre lecteur, autre partage UNC ou chemin non absolu : `mediaPath` tel quel ; Windows : lecteurs et
  segments comparés sans casse ; préfixe `\\?\` ignoré) ; `export function resolveLink(docPath: string, linked: string): string;`
  (absolu : tel quel ; relatif : dossier du document + segments, `.` sauté, `..` retire un segment sans passer la
  racine ; séparateur de sortie `\` pour un document Windows, `/` sinon).
- Produit (`core/asset-store.ts`) : `AssetStore.link(id: AssetId, path: string): void` (empreinte non conforme : lève
  comme `adopt` ; le dernier chemin l'emporte) et `linked(id: AssetId): string | undefined` ; `put`, `get`, `has`,
  `pick`, `adopt` inchangés.
- Produit (`platform/files.ts`) : `FileHost.save(encode: (target: SaveTarget) => Promise<Uint8Array>, target: SaveTarget)`
  — `encode` reçoit la cible choisie ; `export const VIDEO_EXTENSIONS = ["mp4", "m4v", "mov", "webm", "ogv"] as const;`
  `export const AUDIO_EXTENSIONS = ["m4a", "mp3", "wav", "ogg", "oga"] as const;` `IMPORT_EXTENSIONS` = roomboard,
  rbitem, pdf, images, vidéos, sons ; `IMPORT_FILTER.name = "Images, vidéos, sons, PDF et documents RoomBoard"`.
- Produit (`host-tauri.ts`) : `save` appelle `encode({ kind: "tauri", name, path })` ;
  `export const linkMedia = (ipc: TauriIpc, path: string): Promise<string> => ipc.invoke<string>("link_media", { path });`
  `export const relinkMedia = (ipc: TauriIpc, path: string, size: number): Promise<boolean> => ipc.invoke<boolean>("relink_media", { path, size });`
  `loadTauriPorts()` rend aussi `assetUrl: (path: string) => string` (`convertFileSrc` de `@tauri-apps/api/core`).
- Produit (`host-fsa.ts`, `host-repli.ts`) : `encode(chosen)` ; `IMPORT_TYPES.accept` gagne `"video/*"` (5) et
  `"audio/*"` (5) ; `IMPORT_ACCEPT` suit `IMPORT_EXTENSIONS`.
- Réutilise : `apps/web/src/core/asset-store.ts:15-58` — `put`, `get` réutilisés ; étendu de `link`, `linked`.
- Réutilise : `apps/web/src/platform/files.ts:83` (`FileHost.save`) — étendu : `save(encode: (target: SaveTarget) => Promise<Uint8Array>, target)` (une fonction sans paramètre reste acceptée ; `controller.ts` inchangé, PC3).
- Réutilise : aucun module pour les chemins relatifs — nouveau `platform/media-link.ts` (`baseName`, `host-tauri.ts:49`, ne rend que le nom).

**Tests rouges.** `media-link.test.ts` « liens relatifs (C14, M30) » : POSIX même dossier (`clip.webm`), sous-dossier
(`videos/clip.webm`), parent (`../films/clip.webm`) ; Windows `C:\Cours\a.roomboard` + `C:\Cours\videos\clip.mp4` →
`videos/clip.mp4`, lecteur en minuscule ; autre lecteur → absolu ; UNC autre partage → absolu ; `\\?\C:\…` ;
aller-retour `resolveLink(doc, relativeLink(doc, m)) === m` (POSIX et Windows) ; `..` au-delà de la racine.
`asset-store.test.ts` : « link : chemin gardé, empreinte refusée, pick inchangé ». `files.test.ts` : filtre (valeurs
littérales, effet de bord). `host-tauri.test.ts`, `host-fsa.test.ts`, `host-repli.test.ts` : « encode reçoit la
cible choisie » (encode appelé une fois avec la cible rendue) ; `host-tauri.test.ts` : « linkMedia et relinkMedia
appellent link_media et relink_media » ; `host-fsa.test.ts` : `IMPORT_TYPES` avec `video/*` et `audio/*`.

**Étapes.** 1. Tests rouges. 2. Code. 3. `vitest` vert, `controller.test.ts` et `workspace.test.ts` verts, `tsc`.
4. Commits `feat(platform): relative media links and asset store links` et `feat(platform): save passes the chosen target; media import filter`.

**Test et commande bornée.** GC6 avec `src/platform src/core/asset-store.test.ts`.

**Contraintes (recopiées).** GC2 · GC4 (TS) · GC6 · GC7 · GC8 · GC9 · GC13 · GC14 · GC17 · GC18 (`controller.ts` non
touché).

**Critère « terminé ».** Preuve verte, trois lignes `Réutilisation :`.

<a id="tache-t5"></a>

### Tâche T5 — Lecteurs d'un onglet (`MediaPlayers`), port `MediaFrames`, oracle `data-media`

**Interfaces.**
- Produit (`engine/render/media-frames.ts`) :
  ```ts
  export interface MediaFrames {
    /** Image courante du lecteur (readyState ≥ 2, lancé ou positionné dans la session) ; null : poster (M21). */
    frame(elementId: string): CanvasImageSource | null;
    /** Position (s) et lecture en cours ; null sans lecteur. */
    progress(elementId: string): { readonly time: number; readonly playing: boolean } | null;
  }
  ```
  et, dans `canvas2d.ts`, la seule ligne `readonly media?: MediaFrames;` dans `Canvas2DOptions` (lue par T7, passée par T9).
- Produit (`platform/media-players.ts`) :
  ```ts
  export type MediaStatus = "poster" | "lecture" | "pause" | "echec";
  export interface MediaPlayState { readonly status: MediaStatus; readonly time: number }
  export interface MediaPlaySpec { readonly asset: string; readonly mediaType: "video" | "audio"; readonly duration: number; readonly trimStart: number; readonly trimEnd: number | null; readonly loop: boolean; readonly volume: number }
  export interface PlayerVideo { src: string; currentTime: number; volume: number; preload: string; playsInline: boolean; crossOrigin: string | null; readonly paused: boolean; readonly ended: boolean; readonly readyState: number; readonly duration: number; play(): Promise<void>; pause(): void; removeAttribute(name: string): void; load(): void; addEventListener(type: "error" | "ended", cb: () => void): void }
  export interface PlayerElement { readonly video: PlayerVideo; readonly image: CanvasImageSource; onFrame(cb: () => void): () => void; remove(): void }
  export interface PlayerPorts { createVideo(): PlayerElement; source(asset: string): Promise<string | null>; release(url: string): void }
  export interface MediaPlayers extends MediaFrames {
    state(id: string): MediaPlayState | null;
    toggle(id: string, media: MediaPlaySpec): Promise<void>;
    seek(id: string, t: number, media: MediaPlaySpec): Promise<void>;
    apply(id: string, media: MediaPlaySpec): void;
    sync(read: (id: string) => MediaPlaySpec | null): void;
    pauseAll(): void;
    clear(): void;
    onChange(cb: () => void): () => void;
    dispose(): void;
  }
  export function createMediaPlayers(ports: PlayerPorts): MediaPlayers;
  export function browserPlayerPorts(host: HTMLElement, source: PlayerPorts["source"], release: PlayerPorts["release"]): PlayerPorts; // <video> posé dans host ; onFrame par requestAnimationFrame, rappel quand currentTime change (PC2)
  export function mediaTag(media: MediaPlaySpec | null, state: MediaPlayState | null): string;
  ```
- Réutilise : aucun module existant — nouveau `platform/media-players.ts` (aucun `video`, `play(`, `currentTime` dans le code ; DA8 : seul `platform/` touche le DOM).

**Règles.** Lecteur créé au premier `toggle`/`seek` (création en attente dédoublonnée) : `preload="auto"`,
`playsInline`, `crossOrigin="anonymous"` (H1-7), écouteurs `error` (état `echec`) et `ended` (boucle → `trimStart` et
`play()`, sinon pause) ; `source` null → `echec`. `toggle` : en lecture → pause ; sinon position hors de
[`trimStart`, fin) → `trimStart`, volume posé (try/catch, H1-8), `shown`, état `lecture`, `onFrame` ; rejet de `play()`
→ pause. À chaque image : `currentTime ≥ fin` (fin = `trimEnd`, sinon durée du lecteur, sinon du document) → boucle :
retour à `trimStart`, sinon pause sur place ; `emit()`. `seek` : borne [0, durée], `shown`, `poster` → `pause`.
`apply` : réglages relus, volume, lecture hors du nouveau rognage → `trimStart`. `sync` : lecteur sans élément → jeté
(pause, `removeAttribute("src")`, `load()`, `release(url)`, `remove()`), autres → `apply` ; un seul `emit`.
`pauseAll` : tous en pause (image gardée). `clear` : tous jetés (poster revient). `dispose` : `clear`, abonnés retirés,
création en attente terminée puis jetée. `frame` : `shown`, pas `echec`, `readyState ≥ 2`. `mediaTag` :
`<type>;<état>;<t>;<début>-<fin>;<boucle 0/1>;<volume %>`, temps au dixième, fin absente = durée, `""` sans média ;
sans lecteur : `poster` et `0.0`.

**Tests rouges** (`media-players.test.ts`, faux `PlayerElement` dont `onFrame` garde le rappel, appelé à la main) :
« Lecture : lecteur créé au premier geste, part du début du rognage, état lecture » ; « poster tant que non lancé :
frame null » ; « pause : l'image courante reste » ; « fin du rognage sans boucle : pause (M24) » ; « boucle : retour au
début à la fin du rognage » ; « ended sans trimEnd : boucle ou pause » ; « volume appliqué ; apply relit les
réglages (M23) » ; « seek : lecteur créé, position posée, image montrée » ; « sync : lecteur jeté quand son élément
disparaît (Review Focus 3) » ; « pauseAll puis clear : poster revenu » ; « source introuvable ou erreur : echec » ;
« onChange à chaque image, désabonnement » ; « dispose : lecteurs jetés, création en attente libérée » ; « mediaTag »
(`""`, `video;poster;0.0;0.0-2.5;0;100`, `audio;lecture;0.7;0.5-1.5;1;40`).

**Étapes.** 1. Tests rouges. 2. `media-frames.ts`, ligne d'option de `canvas2d.ts`, `media-players.ts`. 3. Vert,
`canvas2d.test.ts` vert, `tsc`. 4. Commit `feat(platform): per-tab media players and frame source`.

**Test et commande bornée.** GC6 avec `src/platform/media-players.test.ts src/engine/render/canvas2d.test.ts`.

**Contraintes (recopiées).** GC2 · GC4 (TS) · GC6 · GC7 · GC8 · GC9 · GC13 · GC14 · GC17 · GC18 (`canvas2d.ts` : une
ligne, `engine.ts`, `renderer.ts`, `webgl2.ts` non touchés).

**Critère « terminé ».** Preuve verte, une ligne `Réutilisation :`.

<a id="tache-t6"></a>

### Tâche T6 — Barre flottante du média (`MediaBar`) et styles

**Interfaces.**
- Produit (`ui/MediaBar.tsx`) :
  ```ts
  export type MediaBarStatus = "poster" | "lecture" | "pause" | "echec";
  export interface MediaBarMedia { readonly mediaType: "video" | "audio"; readonly duration: number; readonly trimStart: number; readonly trimEnd: number | null; readonly loop: boolean; readonly volume: number }
  export interface MediaSettings { readonly trimStart: number; readonly trimEnd: number | null; readonly loop: boolean; readonly volume: number }
  export interface MediaControls { status(): MediaBarStatus; time(): number; toggle(): void; seek(t: number): void; set(settings: MediaSettings): string | null }
  export interface MediaBarProps { readonly media: MediaBarMedia; readonly controls: MediaControls }
  export const MEDIA_FAILED_LABEL = "lecture impossible sur ce poste";
  export function clock(t: number): string; // « m:ss », non fini ou négatif : 0:00
  export function MediaBar(props: MediaBarProps): JSX.Element;
  ```
  Contenu : groupe `role="group"`, `aria-label="Commandes du média"`, `data-media-bar` ; `[data-media="toggle"]`
  « Lecture »/« Pause » (désactivé en `echec`) ; `[data-media="position"]` (range 0…durée, pas 0,1, `onInput` → `seek`,
  style `--rb-trim-start`/`--rb-trim-end` en %) ; `[data-media="time"]` « 0:12 / 1:30 » ; `start` « Début ici »
  (`trimStart` = position arrondie à la ms) ; `end` « Fin ici » ; `keep` « Tout garder » ; `loop` « Boucle »
  (`aria-pressed`) ; `[data-media="volume"]` (0-100, **`onChange` seulement**) ; `[data-media="failed"]` ;
  `[data-media="error"]` (`role="status"`, message rendu par `set`). Chaque réglage = un appel `set` avec l'état complet.
- Produit (`rb.css`, en fin de fichier) : `.rb-media-bar { align-self: end; justify-self: center; margin-block-end: var(--rb-gap); }`, `.rb-media-bar-inner` (flex, `gap`, `padding`, boutons `min-height: var(--rb-btn-m)`, `aria-pressed` comme la barre), piste de position en dégradé sur la zone rognée, `.rb-media-host { position: absolute; inline-size: 1px; block-size: 1px; opacity: 0; pointer-events: none; overflow: hidden; }`.
- Réutilise : aucun composant existant — nouveau `ui/MediaBar.tsx` (DAM5) ; le calage passe par `.rb-popover` (T9).

**Tests rouges** (`MediaBar.test.tsx`, patron `GridPanel.test.tsx`) : « rôle et libellé ; Lecture/Pause selon
l'état ; temps 0:12 / 1:30 » ; « Début ici, Fin ici, Tout garder : un set chacun, position arrondie à la ms » ;
« Boucle : aria-pressed, bascule » ; « Volume : écrit au relâché (change), jamais à input (M23) » ; « position : input
→ seek, aucun set » ; « refus du cœur : message affiché (Review Focus 5) » ; « echec : Lecture désactivée, « lecture
impossible sur ce poste » » ; « zone rognée : --rb-trim-start 10 %, --rb-trim-end 50 % » ; `clock(90) === "1:30"`.

**Preuve visuelle.** Porte visuelle de fin de lot (H1-3, H2-9) : la capture de T11 la porte.

**Étapes.** 1. Tests rouges. 2. Composant, styles. 3. Vert, garde `Toolbar.test.tsx` verte, `tsc`. 4. Commit
`feat(ui): floating media bar`.

**Test et commande bornée.** GC6 avec `src/ui/MediaBar.test.tsx src/ui/Toolbar.test.tsx`.

**Contraintes (recopiées).** GC2 · GC4 (TS) · GC6 · GC7 · GC8 · GC9 · GC12 (aucun `switch`, aucun `px` dans le
`.tsx`, libellés français, barre flottante, aucune rangée) · GC13 · GC14 · GC17 · GC18 (`rb.css` : ajout en fin).

**Critère « terminé ».** Preuve verte, une ligne `Réutilisation :`.

<a id="tache-t7"></a>

### Tâche T7 — Rendu : branche `media` du Canvas 2D

**Interfaces.**
- Consomme : `MediaData`, `MediaElement` (T1) ; `MediaFrames`, option `media` (T5).
- Produit (`canvas2d.ts`) : champ `private readonly media: MediaFrames | null` (`opts.media ?? null`) ; bras
  `else if (el.kind === "media")` voisin du bras `image` (sans le modifier) → `paintMedia(ctx, el.media, frame, progress, images)` :
  vidéo = `frame` sinon `images.bitmap(poster)` sinon `paintPlaceholder` ; son = carte (`AUDIO_CARD_FILL = "#f1f5f9"`,
  libellé `AUDIO_CARD_LABEL = "Son"`, barre d'avancement sur [début, fin], couleur `MEDIA_PROGRESS_COLOR = "#1e3a8a"`) ;
  badge « lecture » (`MEDIA_BADGE_FILL = "rgba(15, 23, 42, 0.6)"`, carré et triangle blanc en bas à gauche, côté
  `min(w, h) / 6`) tant que `progress?.playing !== true`. Constantes exportées.
- Réutilise : `apps/web/src/engine/render/image-cache.ts:20` (`ImageSource.bitmap(poster)`) — cache des bitmaps inchangé.
- Réutilise : `apps/web/src/engine/render/canvas2d.ts:30-31`, `:314-317` — option `media?: MediaFrames` (posée en T5), branche voisine de `image`.

**Tests rouges** (`canvas2d.test.ts`, bloc « Canvas2DRenderer — média (C14) ») : « vidéo en lecture : image du lecteur
dans (0,0)-(w,h), aucun badge » ; « vidéo sans image : poster du cache, badge » ; « sans poster ni lecteur : cadre gris
de sa taille » ; « sans MediaFrames (export PDF, M34) : poster » ; « son : carte « Son », barre à la position du
rognage ». Le test du fond `kind: "video"` (`:928`) et `webgl2.test.ts` restent verts.

**Étapes.** GC5 si besoin ; tests rouges ; code ; vert ; `tsc` ; commit `feat(render): draw media frames, posters and audio cards`.

**Test et commande bornée.** GC6 avec `src/engine/render/canvas2d.test.ts src/engine/render/webgl2.test.ts`.

**Contraintes (recopiées).** GC2 · GC4 (TS) · GC5 · GC6 · GC7 · GC8 · GC13 · GC14 · GC17 · GC18 (branche voisine,
branche `image` intacte : C5 la réécrit ; `image-cache.ts`, `renderer.ts`, `webgl2.ts` non touchés).

**Critère « terminé ».** Preuve verte, deux lignes `Réutilisation :`.

<a id="tache-t8"></a>

### Tâche T8 — Import des médias : gestionnaire, branche « lien », ordre du registre

**Interfaces.**
- Consomme : T1 (`Command` `AddMedia`), T3 (`sniffMedia`, `probeMedia`, constantes, `unsupportedMediaHandler`,
  `ImportDeps.probe`, `linkMedia`), T4 (`AssetStore.link`).
- Produit (`media-import.ts`) : `export interface MediaHandlerDeps { readonly probe: (url: string) => Promise<MediaProbe>; readonly urls: { create(blob: Blob): string; revoke(url: string): void }; linkMedia?(path: string): Promise<LinkedMedia> }` ;
  `export function mediaHandler(deps: MediaHandlerDeps): ImportHandler` (id `media`, objet ; `detect` : sniff non nul
  et pris en charge ; `limit { MEDIA_PASTE_MAX_BYTES, MEDIA_TOO_BIG }` ; `link { aboveBytes: MEDIA_INCLUDE_MAX_BYTES, run }`
  seulement si `linkMedia` ; `run` : URL `blob:`, sonde, révocation, `put(blob)`, poster `put` (`name: "<nom>.jpg"`,
  `POSTER_MIME`), onglet vivant, `AddMedia` en une étape (vidéo : `videoWidth × videoHeight` ; son : `AUDIO_BOX`,
  aucun poster), `placement(anchorOf, visibleOf, inserted)` ; `link.run` : `linkMedia(path)` → `{ id, url }`, sonde
  sur `url`, `assets.link(id, path)` (par `"link" in target.assets`, PC7 ; absent : `MEDIA_TOO_BIG`), `AddMedia` avec
  `linked: path`, `size: file.size`, puis avis `${nom} : ${MEDIA_LINKED_NOTE}`) ; sonde en échec : `${nom} : ${CODEC_UNREADABLE}`, rien inséré.
- Produit (`import.ts`) : `ImportHandler.link?: { readonly aboveBytes: number; run(file: DroppedFile, path: string, ctx: Omit<ImportContext, "blob">): Promise<ImportOutcome> }` (PC4) ; dans `importFiles`, après la détection : `f.path` défini et `f.size > link.aboveBytes` → `link.run`, **avant** `limit` et `f.blob()` ; sinon chemin actuel ; registre : `roomboard`, `rbitem`, `pdf`, **`mediaHandler`**, `unsupportedMediaHandler("mkv")`, `unsupportedMediaHandler("avi")`, `image`, `sheet` ; `ImportDeps.mediaUrls?` (tests ; défaut `URL.createObjectURL` / `revokeObjectURL`).
- Réutilise : `apps/web/src/platform/import.ts:196` (`createImporter`) — `ImportHandler` (`:68-77`) étendu de `link`.
- Réutilise : `apps/web/src/platform/import.ts:18`, `:217-220` — `WEB_MAX_BYTES`, `tooBigMessage` (refus web > 100 Mo inchangé).
- Réutilise : `apps/web/src/platform/import.ts:72-74` (`limit`) — `limit: { maxBytes: 100 Mo, message: MEDIA_TOO_BIG }`.
- Réutilise : `apps/web/src/platform/image-import.ts:195`, `:205`, `:213` — `anchorOf`, `visibleOf`, `placement` tels quels.
- Réutilise : `apps/web/src/platform/image-import.ts:227` (`ImageTarget`) — `assets.put`, `page()`, `camera()`, `stageRect()`, `alive()`, `run()`, sans renommage.

**Tests rouges** (`import.test.ts`, bloc « importFiles : médias (C14) ») : « WebM déposé : sonde, poster et média au
magasin, AddMedia en une étape, centré (S1) » ; « son WAV : 480 × 120, aucun poster, audio (S3) » ; « sonde en échec :
« codec non lu sur ce poste », rien d'inséré, URL révoquée (M15) » ; « MKV et AVI : un message chacun, blob jamais lu
(S4, M12) » ; « un HEIC et un AVIF restent des images après l'ajout du média » (sonde jamais appelée, `AddImage`) ;
« coque, chemin et plus de 50 Mo : lié, blob jamais lu, lien au magasin, avertissement (S5, M14) » ; « coque, chemin
et au plus 50 Mo : inclus » ; « sans chemin, plus de 100 Mo : « trop lourd pour être inclus » (M13) » ; « web, plus de
100 Mo : « plus de 100 Mo » (S4) » ; « onglet fermé pendant la sonde : rien d'inséré » ; « sans linkMedia : un chemin
de 60 Mo est inclus ». `image-import.test.ts` : « sniffImage et sniffMedia ne revendiquent jamais le même en-tête
(M11) » sur les en-têtes des deux tables.

**Étapes.** GC5 si besoin ; tests rouges ; code ; vert ; `tsc` ; commit `feat(import): media handler with linked branch before image`.

**Test et commande bornée.** GC6 avec `src/platform/import.test.ts src/platform/image-import.test.ts src/platform/media-import.test.ts`.

**Contraintes (recopiées).** GC2 · GC3 (aucun ffmpeg) · GC4 (TS) · GC5 · GC6 · GC7 · GC8 · GC13 · GC14 · GC16 · GC17 ·
GC18 (`image-import.ts` non touché).

**Critère « terminé ».** Preuve verte, cinq lignes `Réutilisation :`.

<a id="tache-t9"></a>

### Tâche T9 — Session et barre branchées : lecteurs par onglet, `data-media`, pause, `<MediaBar>` dans `App`

**Interfaces.**
- Consomme : T1 (`MediaElement`), T4 (`AssetStore.linked`, `ports.assetUrl`), T5 (lecteurs, `mediaTag`), T6 (`MediaBar`).
- Produit (`board-session.ts`) : `SessionShared` gagne `readonly mediaUrl?: (path: string) => string;` et
  `readonly createVideo?: PlayerPorts["createVideo"];` (tests) ; `BoardSession` gagne `readonly media: MediaPlayers;`
  et `selectedMedia(): MediaElement | null` (un seul élément sélectionné, `kind === "media"`, sans `group`).
  Construction : `div.rb-media-host` dans la scène ; `source(asset)` = `assets.get` → `URL.createObjectURL` (gardée),
  sinon `assets.linked` → `shared.mediaUrl(path)`, sinon null ; `release` révoque une URL gardée ; lecteurs passés à
  `chooseRenderer(..., { media: players })` ; `players.onChange` → `redraw()` et `markMedia()` ; dans `mark` : page
  changée → `players.clear()` ; version changée → `players.sync(id => media de doc.element(id) ou null)` ; puis
  `stage.dataset.media = mediaTag(...)` ; `deactivate` → `pauseAll()` ; `dispose` → `players.dispose()`.
- Produit (`App.tsx`) : signal `mediaTick` abonné à `ws.active().board.media.onChange` (rabonné au changement
  d'onglet) ; `<Show when={selectedMedia()}>{(m) => <div class="rb-popover rb-media-bar"><MediaBar media={m().media} controls={…} /></div>}</Show>` (non `keyed`) ; `set` → `b.engine.run({ type: "SetMedia", id, ...s })`, refus → `state().error ?? "réglage refusé"`.
- Produit (`main.ts`) : `shared` gagne `...(ports === null ? {} : { mediaUrl: ports.assetUrl })`.
- Réutilise : `apps/web/src/engine/engine.ts:121`, `apps/web/src/app/board-session.ts:209` — `redraw()` appelé à chaque image du lecteur.
- Réutilise : `apps/web/src/ui/rb.css:27` (`.rb-popover`), `apps/web/src/ui/App.tsx:114-125` — classe `rb-popover`, patron `gridPanelFor(board)` (barre branchée sur la session active, écriture par `board.engine.run`).

**Tests rouges.** `board-session.test.ts`, bloc « session — médias (C14) » (faux `createVideo`, sélection par un clic
de l'outil Sélection via `engine.sink`, patron du test Tableau ; `URL.createObjectURL` espionné) : « data-media vide
sans sélection ; média sélectionné : video;poster;0.0;0.0-2.5;0;100 (M26) » ; « Lecture : source blob: du magasin,
data-media lecture » ; « changement de page : lecteurs jetés, poster revenu (Review Focus 4) » ; « deactivate : tous
en pause (H1-6) » ; « suppression du média en lecture : lecteur jeté, data-media vide (Review Focus 3) » ; « annuler
un réglage : le lecteur relit le volume (M23) » ; « vidéo liée : URL par shared.mediaUrl (S5) » ; « dispose : lecteurs
jetés, URL révoquée » ; « média groupé : selectedMedia null ». `App.test.tsx` (`fakeTab` gagne `media` et
`selectedMedia`) : « App : barre du média (C14) » — visible pour un média, absente sinon ; « Début ici » écrit un
`SetMedia` par `engine.run` ; refus : message dans la barre.

**Preuve visuelle.** Celle de T11 (barre en bas au centre, scène ≥ 640 px).

**Étapes.** GC5 si besoin ; tests rouges ; code ; vert ; `tsc` ; commit `feat(app): media players per tab and floating media bar`.

**Test et commande bornée.** GC6 avec `src/app/board-session.test.ts src/ui/App.test.tsx`.

**Contraintes (recopiées).** GC2 · GC4 (TS) · GC5 · GC6 · GC7 · GC8 · GC12 (aucune rangée, `stage-tags.ts`,
`toolbar-host.ts`, `EngineState`, `SelectionRow.tsx` non touchés) · GC13 · GC14 · GC17 · GC18 (ajouts localisés dans
`board-session.ts`, `App.tsx`).

**Critère « terminé ».** Preuve verte, deux lignes `Réutilisation :`.

<a id="tache-t10"></a>

### Tâche T10 — Persistance : liés, fragment lié, ouverture, chemin relatif à l'enregistrement

**Interfaces.**
- Consomme : T1 (`linkedAssets`, `relinkAssets`, `LinkedAsset`), T3 (`ImportDeps.linkMedia`, `LinkedMedia`), T4
  (`relativeLink`, `resolveLink`, `isAbsoluteLink`, `AssetStore.link/linked`, `FileHost.save(encode(target))`).
- Produit (`container-io.ts`) : `export const LINKED_COPY_MESSAGE = "vidéo liée : copie non prise en charge, déposez le fichier à nouveau";`
  `export class LinkedMediaError extends Error` ; `export const LINKED_WEB_MESSAGE = "vidéo non incluse (liée, lisible dans l'application de bureau)";`
  `export const linkedMissingMessage = (path: string): string => \`${baseName(path)} : vidéo liée introuvable (${path})\`;`
  `missingOf` exclut les ids de `doc.linkedAssets()` ; `encode` d'un fragment qui cite un asset lié → `LinkedMediaError`
  (avant `MissingAssetError`) ; `ContainerIODeps.relink?(docPath: string | null, link: LinkedAsset, size: number): Promise<string | null>` ;
  `ContainerIO.read(name, bytes, kind, docPath: string | null = null)` : document lu → liens : `relink` absent → un avis
  `${name} : ${LINKED_WEB_MESSAGE}` ; sinon par lien : trouvé → `assets.link(id, chemin)`, absent →
  `linkedMissingMessage(l.path)` ; `unread` ne compte plus les liés.
- Produit (`workspace.ts`) : `WorkspaceDeps.linkMedia?(path: string): Promise<LinkedMedia>` et
  `relinkMedia?(path: string, size: number): Promise<boolean>` ; `relink` = `resolveLink` (absolu tel quel, relatif sans
  chemin de document → null) puis `relinkMedia` (exception → null) ; `openDocument` passe le chemin d'une cible `tauri` ;
  `createImporter` reçoit `linkMedia` ; chaque onglet reçoit un hôte enveloppé (PC3) dont `save(encode, to)` appelle
  `host.save((t) => { relinkFor(doc, assets, t); return encode(t); }, to)` ; `relinkFor` : cible `tauri` seulement,
  liens dont le magasin connaît le chemin absolu → `doc.relinkAssets([{ id, path: relativeLink(t.path, abs) }])`.
- Réutilise : `apps/web/src/app/container-io.ts:42` (`typed(blob, mime)`) — un média relu reçoit son type de la métadonnée (PC6).
- Réutilise : `apps/web/src/app/container-io.ts:45` (`missingOf`) — étendu : exclut les ids de `doc.linkedAssets()`.

**Tests rouges.** `container-io.test.ts`, bloc « conteneurs : médias (C14) » : « asset lié : Enregistrer permis ;
image absente : refusé (effet de bord R30) » ; « fragment d'un média lié : LinkedMediaError, codec jamais appelé
(M32) » ; « fragment d'un média inclus : écrit » ; « ouvrir en coque : lien résolu, accordé, au magasin (S5, M31) » ;
« vidéo absente : avis « vidéo liée introuvable », document ouvert, unread faux (S5) » ; « web : un avis « vidéo non
incluse » » ; « un média relu garde son type (typed) ». `workspace.test.ts` (mock `host.save` → `encode(t)`), bloc
« espace de travail : médias (C14) » : « enregistrer un document à média lié le laisse non modifié » (chemin
`videos/clip.webm`, `isDirty` faux, version inchangée) ; « ouvrir en coque : relinkMedia avec le chemin résolu et la
taille » ; « linkMedia transmis à l'importeur : vidéo de 300 Mo déposée avec un chemin : liée » ; « copier un média
lié : « Copie impossible : vidéo liée… » ». `fragments.test.ts` reste vert.

**Étapes.** GC5 si besoin ; tests rouges ; code ; vert ; `tsc` ; commit `feat(app): linked media on save and open, refuse linked copies`.

**Test et commande bornée.** GC6 avec `src/app/container-io.test.ts src/app/workspace.test.ts src/app/fragments.test.ts`.

**Contraintes (recopiées).** GC2 · GC4 (TS) · GC5 · GC6 · GC7 · GC8 · GC11 · GC13 · GC14 · GC17 · GC18
(`controller.ts`, `fragments.ts`, `clipboard.ts`, `container.ts` non touchés).

**Critère « terminé ».** Preuve verte, deux lignes `Réutilisation :`.

<a id="tache-t11"></a>

### Tâche T11 — Amorce de la coque et essai e2e C14 dans `verifier.sh --e2e`

**Interfaces.**
- `main.ts` : `createWorkspace` reçoit, coque seulement, `linkMedia: async (p) => ({ id: await linkMedia(ipc, p), url: ports.assetUrl(p) })` et `relinkMedia: (p, s) => relinkMedia(ipc, p, s)` (fonctions de T4).
- Essai `scripts/essais/c14-media-navigateur.mjs` (modèle `c12-pdf-navigateur.mjs:1-207`, codes 0/1/2, `--captures`) :
  générateurs dans le script : `makeWebm(context, 2.4)` (page vierge `about:blank`, toile 320 × 180,
  `captureStream(30)`, `MediaRecorder` `video/webm;codecs=vp8`, couleur unie rouge/vert/bleu/jaune changée toutes les
  0,5 s par `setInterval`) ; `makeWav(1)` (PCM 16 bits mono 8 kHz, 440 Hz, en-tête écrit à la main) ; en-têtes MKV
  (EBML + DocType `matroska`) et AVI (`RIFF`…`AVI `) ; `zipEntries` recopié de `c2-image-navigateur.mjs:60-83`
  (commentaire : à fondre dans `commun.mjs` après C5) ; lancement Chromium avec `--autoplay-policy=no-user-gesture-required`.
- Scénario : scène ≥ 640 px ; dépôt WebM au point (300, 250) → `data-elements="1"` ; outil Sélection, clic → barre
  visible, `data-media` commence par `video;poster;`, scène ≥ 640 px (S1) ; Lecture → `lecture`, couleur du pixel
  central différente à 700 ms d'écart ; Pause → couleur stable (S1) ; position 0,5 + « Début ici », 1,5 + « Fin ici »,
  Boucle, Volume 40 (`change`) → `0.5-1.5;1;40` ; Lecture : huit lectures de `t` sur 1,6 s dans [0,4, 1,6] (boucle) ;
  quatre Ctrl+Z (focus retiré) défont volume, boucle, fin, début dans cet ordre, quatre Ctrl+Y les rétablissent (S2) ;
  dépôt WAV → carte, `audio;` puis `audio;lecture` (S3) ; dépôt MKV et AVI → deux boîtes « format MKV/AVI non lu… »,
  rien d'inséré ; fichier WebM de 101 Mo construit dans la page → « plus de 100 Mo » (S4) ; Ctrl+S → `.roomboard`
  dont les entrées comptent `assets/<sha256 webm>.webm`, `assets/<sha256 wav>.bin` et un `.jpg` (S3) ; dépôt du
  `.roomboard` → nouvel onglet, `data-elements="2"`, vidéo `…;0.5-1.5;1;40`, lecture → `lecture` (S3) ; avec
  `--captures` : `docs/essais/c14-media-lecture.png` pendant la lecture ; aucune erreur de page, aucune requête hors de
  127.0.0.1.
- `verifier.sh` : ligne `node scripts/essais/c14-media-navigateur.mjs` après `c6a-pot-navigateur.mjs` ;
  `verifier-e2e.test.sh` : `c14-media-navigateur` dans la liste.
- Réutilise : `crates/roomboard-formats/src/container.rs:73`, `:114` — `write`, `read` génériques (via `createPageCodec`) : le fichier enregistré est relu par l'essai.
- Réutilise : `scripts/essais/commun.mjs:159` (`coqueCsp()`) — CSP de la coque (avec `media-src` de T2) servie par l'essai.
- Réutilise : `scripts/essais/commun.mjs:101`, `:143` — `stageBox(page, 640)`, `dropFile(page, sel, name, bytes, type, at)`.

**Preuve visuelle.** Lectures d'abord : `#stage[data-media]` = `video;lecture;…;0.5-1.5;1;40`, `stageBox ≥ 640`,
pixel central d'une des quatre couleurs ; puis la capture `docs/essais/c14-media-lecture.png`, à décrire (vidéo
colorée dans la page, barre en bas au centre, bouton « Pause »).

**Étapes.** 1. `main.ts` ; `tsc`. 2. Essai (d'abord lancé seul après `scripts/verifier.sh` pour le build :
`node scripts/essais/c14-media-navigateur.mjs --captures`). 3. `verifier.sh`, test e2e. 4. `bash scripts/verifier.sh --e2e 2>&1 | tail -90`.
5. Commits `feat(app): wire linked media in the desktop shell`, `test(e2e): C14 media scenario with generated WebM and WAV`
(capture PNG ajoutée par son chemin).

**Test et commande bornée.** La colonne preuve de la table.

**Contraintes (recopiées).** GC1 (seule tâche à lancer `verifier.sh --e2e`) · GC2 · GC3 (aucun ffmpeg, aucun
`recordVideo` de Playwright, aucun build Tauri) · GC4 · GC5 · GC6 · GC7 · GC8 · GC10 (tailles relevées) · GC12 (scène
≥ 640 px mesurée) · GC13 · GC14 · GC16 (WebM et WAV générés, jamais commités) · GC17 · GC18 (`commun.mjs` non touché).

**Interdits.** Aucune option de capture dans `verifier.sh` ; aucun fichier média commité.

**Critère « terminé ».** `verifier.sh --e2e` vert avec « C14 média : OK », capture présente, trois lignes `Réutilisation :`.
