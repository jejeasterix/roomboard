# Plan d'exécution — usage-c15-3d (C15 : objets 3D)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

## Table des tâches

| id | titre | dépend de | vague | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|-------|------------------|----------|----------|--------|----------|---------|
| T1 | Dépendances `three`/`fflate`, morceau `three`, CSP `connect-src blob:`, contrôle hors ligne, notices | — | V1 | `apps/web/package.json`, `pnpm-lock.yaml`, `apps/web/vite.config.ts`, `THIRD_PARTY_NOTICES.md`, `apps/desktop/src-tauri/tauri.conf.json`, `scripts/controle-hors-ligne.mjs`, `scripts/tests/controle-hors-ligne.test.sh`, `scripts/tests/coque-csp.test.sh` | isolé (`~/projets/roomboard-wt/usage-c15-3d--T1`) | implementeur-tdd | `bash scripts/tests/controle-hors-ligne.test.sh 2>&1 \| tail -3` : « N+2 cas OK » (N lu avant) ; `bash scripts/tests/coque-csp.test.sh` : « OK » ; `node scripts/controle-licences.mjs; echo "code $?"` : `code 0` ; `grep -cE '"(three\|fflate\|@types/three)": "0\.(187\.0\|8\.3)"' apps/web/package.json` = 3 | S1, S4 | #tache-t1 |
| T2 | Cœur Rust de l'élément `model3d`, `boxed_geom`, liaison Wasm, contrat TS (parité fausse liaison) | — | V1 | `crates/roomboard-core/src/model3d.rs` (neuf), `crates/roomboard-core/tests/model3d.rs` (neuf), `crates/roomboard-core/src/lib.rs`, `crates/roomboard-core/src/media.rs` (visibilité de deux aides), `crates/roomboard-core/src/element.rs`, `crates/roomboard-core/src/document.rs`, `crates/roomboard-core/src/query.rs`, `crates/roomboard-core/src/commands.rs`, `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/api.ts`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/fake-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts` | isolé (`…--T2`) | concepteur-critique | `cargo test -p roomboard-core -p roomboard-wasm 2>&1 \| grep -E "test result\|FAILED\|panicked\|error\[\|model3d\|media" \| tail -50` : 0 `FAILED`, ≥ 10 tests `model3d` dont `set_model3d_view_is_one_step_and_defaults_are_removed`, `malformed_model3d_is_an_unknown_frame_kept_byte_for_byte`, `every_known_kind_has_view_and_geom` ; vitest `src/core` : « contrat C15 » ≥ 7 tests × 2 fabriques, 0 `×` ; `tsc` vide ; module principal ≤ 1 572 864 o | S1, S2, S4 | #tache-t2 |
| T3 | Détection 3D, références, résolution, regroupement (fonctions pures) | — | V1 | `apps/web/src/platform/model3d-import.ts` (neuf), `apps/web/src/platform/model3d-import.test.ts` (neuf), `apps/web/src/platform/model3d-fixtures.ts` (neuf, tests seuls) | isolé (`…--T3`) | implementeur-tdd | vitest `src/platform/model3d-import.test.ts` : 0 `×`, ≥ 13 tests dont « sniffModel3d (C15, X11) », « resolveReference : exact, sans casse, nom de base unique (X14) », « gatherFiles : OBJ → MTL → textures (X14) » ; `tsc` vide | S3 | #tache-t3 |
| T4 | Pré-passe des fichiers liés dans `importFiles`, boîte « Importer » | — | V1 | `apps/web/src/platform/import.ts`, `apps/web/src/platform/import.test.ts`, `apps/web/src/platform/files.ts`, `apps/web/src/platform/files.test.ts`, `apps/web/src/platform/host-fsa.ts`, `apps/web/src/platform/host-fsa.test.ts`, `apps/web/src/platform/host-repli.test.ts`, `apps/web/src/platform/host-tauri.test.ts` | isolé (`…--T4`) | concepteur-critique | vitest `src/platform/import.test.ts src/platform/files.test.ts src/platform/host-fsa.test.ts src/platform/host-repli.test.ts src/platform/host-tauri.test.ts src/platform/image-import.test.ts src/platform/media-import.test.ts src/platform/paste.test.ts src/platform/drop-web.test.ts` : 0 `×`, « importFiles : fichiers liés (C15, DAX2) » ≥ 6 ; `tsc` vide | S3 | #tache-t4 |
| T5 | Caméra et port `ModelFrames`, outil d'orbite, `engine.orbitModel`, types `ModelView` | — | V1 | `apps/web/src/engine/render/model-frames.ts` (neuf), `apps/web/src/engine/render/model-frames.test.ts` (neuf), `apps/web/src/engine/tools/model-orbit.ts` (neuf), `apps/web/src/engine/tools/model-orbit.test.ts` (neuf), `apps/web/src/engine/engine.ts`, `apps/web/src/engine/engine.test.ts`, `apps/web/src/engine/render/canvas2d.ts` (une ligne d'option), `apps/web/src/platform/model-view.ts` (neuf), `apps/web/src/platform/model-view.test.ts` (neuf) | isolé (`…--T5`) | implementeur-tdd | vitest `src/engine/render/model-frames.test.ts src/engine/tools/model-orbit.test.ts src/engine/engine.test.ts src/engine/tools/image-edit.test.ts src/engine/tools/select.test.ts src/engine/render/canvas2d.test.ts src/platform/model-view.test.ts` : 0 `×`, « orbite (C15, X21) » ≥ 6, « moteur : séance d'orbite (C15, X23) » ≥ 5, « model-view (C15, DAX3) » ≥ 4 ; `tsc` vide | S2 | #tache-t5 |
| T6 | Barre flottante 3D (`Model3dBar`) | — | V1 | `apps/web/src/ui/Model3dBar.tsx` (neuf), `apps/web/src/ui/Model3dBar.test.tsx` (neuf) | isolé (`…--T6`) | implementeur-tdd | vitest `src/ui/Model3dBar.test.tsx src/ui/Toolbar.test.tsx src/ui/MediaBar.test.tsx` : 0 `×`, « Model3dBar (C15, X24) » ≥ 5 ; garde de `src/ui` (« aucun switch… aucun px ») verte ; `tsc` vide | S2, S5 | #tache-t6 |
| T7 | Rendu WebGL partagé `three` (`model-view-three.ts`) : chargeurs, garde réseau, instantané, perte du contexte | T1, T3, T5 | V2 | `apps/web/src/platform/model-view-three.ts` (neuf), `apps/web/src/platform/model-view-three.test.ts` (neuf), `apps/web/src/platform/model-view.ts` | isolé (`…--T7`) | concepteur-critique | vitest `src/platform/model-view-three.test.ts src/platform/model-view.test.ts` : 0 `×`, « rendu three (C15, X22, X27) » ≥ 9 dont « URL distante : blob vide, comptée absente (DAX4) » ; `tsc` vide ; `grep -rln "from \"three" apps/web/src --include=*.ts \| grep -v test` = `apps/web/src/platform/model-view-three.ts` seul | S1, S2, S3, S5 | #tache-t7 |
| T8 | Gestionnaires 3D (modèle, ZIP, fichier lié seul), lecteur ZIP `fflate` en Worker jetable, registre | T1, T2, T3, T4, T5 | V2 | `apps/web/src/platform/model3d-handlers.ts` (neuf), `apps/web/src/platform/model3d-handlers.test.ts` (neuf), `apps/web/src/platform/zip-read.ts` (neuf), `apps/web/src/platform/zip-read.test.ts` (neuf), `apps/web/src/platform/zip-worker.ts` (neuf), `apps/web/src/platform/model3d-import.ts` (alias seul), `apps/web/src/platform/import.ts`, `apps/web/src/platform/import.test.ts` | isolé (`…--T8`) | concepteur-critique | vitest `src/platform/model3d-handlers.test.ts src/platform/zip-read.test.ts src/platform/import.test.ts src/platform/image-import.test.ts src/platform/media-import.test.ts src/platform/model3d-import.test.ts` : 0 `×`, « gestionnaire 3D (C15) » ≥ 10 dont « un .zip sans modèle : aucun modèle 3D dans ce ZIP », « ZIP : chemins .. et absolus ignorés, 1 000 entrées, 256 Mio » ; `tsc` vide | S1, S3, S5 | #tache-t8 |
| T9 | Canvas 2D : branche `model3d` (image du rendu, instantané, carte « Objet 3D »), constantes de caméra unifiées | T2, T5 | V2 | `apps/web/src/engine/render/canvas2d.ts`, `apps/web/src/engine/render/canvas2d.test.ts`, `apps/web/src/engine/render/model-frames.ts`, `apps/web/src/engine/render/model-frames.test.ts` | isolé (`…--T9`) | implementeur-tdd | vitest `src/engine/render/canvas2d.test.ts src/engine/render/model-frames.test.ts src/engine/render/webgl2.test.ts` : 0 `×`, « Canvas2DRenderer — objet 3D (C15, X25) » ≥ 4 ; `tsc` vide | S1, S4, S5 | #tache-t9 |
| T10 | Séances 3D par onglet, session (`data-model3d`, orbite, instantané, annulation), barre dans `App` | T2, T3, T5, T6 | V2 | `apps/web/src/platform/model-sessions.ts` (neuf), `apps/web/src/platform/model-sessions.test.ts` (neuf), `apps/web/src/app/board-session.ts`, `apps/web/src/app/board-session.test.ts`, `apps/web/src/ui/App.tsx`, `apps/web/src/ui/App.test.tsx` | isolé (`…--T10`) | concepteur-critique | vitest `src/platform/model-sessions.test.ts src/app/board-session.test.ts src/ui/App.test.tsx src/ui/MediaBar.test.tsx` : 0 `×`, « séances 3D (C15, DAX3) » ≥ 8, « session — objets 3D (C15) » ≥ 6, « App : barre 3D (C15) » ≥ 3 ; `tsc` vide | S2, S4, S5 | #tache-t10 |
| T11 | Amorce (`main.ts`, `workspace.ts`), essai e2e C15 dans `verifier.sh --e2e`, capture d'un objet tourné | T1-T10 | V3 | `apps/web/src/main.ts`, `apps/web/src/app/workspace.ts`, `apps/web/src/app/workspace.test.ts`, `scripts/essais/commun.mjs`, `scripts/essais/c15-3d-navigateur.mjs` (neuf), `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/c15-3d-orbite.png` (neuf) | isolé (`…--T11`) | implementeur-tdd | `bash scripts/verifier.sh --e2e 2>&1 \| tail -100` : « C15 3D : OK », les 15 essais d'avant « : OK », « verifier.sh : e2e OK », « verifier.sh : OK » ; `bash scripts/tests/verifier-e2e.test.sh` OK ; `node scripts/controle-hors-ligne.mjs apps/web/dist apps/desktop/src-tauri/tauri.conf.json` code 0 ; `ls apps/web/dist/assets \| grep -c '^three-'` ≥ 1 ; `docs/essais/c15-3d-orbite.png` présent | S1, S2, S3, S4, S5 | #tache-t11 |

**Vagues (fichiers disjoints dans chaque vague).**

| vague | tâches en parallèle | condition |
|---|---|---|
| V1 | T1, T2, T3, T4, T5, T6 | aucune |
| V2 | T7 (dès T1, T3, T5), T8 (dès T1, T2, T3, T4, T5), T9 (dès T2, T5), T10 (dès T2, T3, T5, T6) | — |
| V3 | T11 | toutes fusionnées |

Fichiers repris d'une vague à l'autre (jamais en parallèle) : `model3d-import.ts` (T3 puis T8, alias seul),
`import.ts` et `import.test.ts` (T4 puis T8), `model-view.ts` (T5 puis T7), `canvas2d.ts` (T5 puis T9),
`model-frames.ts` et son test (T5 puis T9).
Chemin critique : T2 (≈ 60 min) → T10 (≈ 50) → T11 (≈ 50) ≈ 2 h 40.

**Spec :** `docs/plans/usage-c15-3d-cadrage.md` (commit 05e075f, base `origin/main` 458a90d).

**Goal :** un fichier glTF / GLB, OBJ + MTL, STL ou PLY déposé (seul, avec ses fichiers liés ou dans un ZIP) devient un
élément `model3d` sur la page montrée, tourné à l'orbite quand il est sélectionné, dessiné par son instantané sinon,
inclus avec ses fichiers liés dans le `.roomboard`.

**Architecture :** module `model3d.rs` du cœur, vue et instantané écrits ensemble (DAX1) ; regroupement des fichiers liés
dans `importFiles` (DAX2) ; un seul `WebGLRenderer` dans un morceau `three` chargé à la demande, vu du moteur par le
port `ModelFrames` (DAX3) ; garde des URL de three (DAX4) ; ZIP lus par `fflate` dans un Worker jetable (DAX5).

**Tech Stack :** Rust (yrs), wasm-bindgen, TypeScript, Solid, Vitest, three 0.187.0, fflate 0.8.3, Playwright.

## Choix du plan (hors cadrage, à relire)

- PC1 Types provisoires de vague 1 : `Model3dFormat` est déclaré dans `model3d-import.ts` (T3) et `model-view.ts` (T5)
  à l'identique de celui d'`api.ts` (T2) ; T8 et T7 les remplacent par `import type { Model3dFormat } from "../core/api"`.
  Les constantes de caméra de `model-frames.ts` (T5) sont remplacées par celles d'`api.ts` en T9. Aucune double
  définition ne survit à la vague 2.
- PC2 `engine.orbitModel(id, opts)` reçoit la vue de départ et deux rappels (`onView`, `onCommit`) au lieu de lire
  l'élément : le moteur ne connaît ni `SetModel3dView` ni l'instantané ; la session (T10) écrit. Écart de signature à
  la ligne « séance modale » du cadrage (`orbitModel(id: string)`), justifié par V1 sans dépendance à T2.
- PC3 `ModelView.onLost(cb)` ajouté à l'interface du cadrage (perte du contexte, X26) ; `createModelViewLoader` rend
  `{ load(), peek() }` : `peek()` dit, sans charger three, si le rendu est déjà connu indisponible.
- PC4 Sans WebGL, un document rouvert ne sait pas encore que la 3D manque (aucun contexte créé avant le premier geste,
  X20) : « Tourner » est actif jusqu'au premier clic, qui charge le rendu, puis grisé avec le message (S5).
- PC5 Snapshot : `SNAPSHOT_MIME = "image/png"`, nom `<nom du modèle>.png` ; « Vue initiale » est grisée sans WebGL
  (elle écrirait une vue sans image juste).
- PC6 Chemin rangé dans `files[].path` : la référence normalisée (`normalizePath`), ou son nom de base si elle sort de
  son dossier (`../x.png`) ; la garde d'URL cherche d'abord le chemin normalisé, puis le nom de base.
- PC7 Le gestionnaire 3D lit le modèle par `ModelView.load` même sans WebGL (validation, X26) et prend l'instantané
  par `ModelView.snapshot` (null sans WebGL : élément sans instantané).
- PC8 Le Worker ZIP importe `keepZipPath` et les bornes de `model3d-import.ts` (T3) ; `fflate` n'est importé que par
  `zip-worker.ts` (et `three` que par `model-view-three.ts`), contrôlé par un `grep` en preuve.
- PC9 Les gestionnaires 3D vivent dans `platform/model3d-handlers.ts` (T8), pas dans `model3d-import.ts` comme le dit la
  ligne « détection, références, ZIP » du cadrage : `model3d-import.ts` reste pur pour que le Worker ZIP ne tire pas le
  graphe de la page (`image-import`, `controller`, `import`).
- PC10 `importFiles` est déplacé tel quel dans `importerOf(registre, deps)` (T4) pour tester la pré-passe sur un registre
  factice ; `createImporter(deps)` garde sa signature.

## Global Constraints

- GC1 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`,
  `#[ignore]`), aucun seuil baissé. Un test qui échoue sur un délai est rejoué une fois avant d'être jugé ; aucun délai relevé.
- GC2 `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri (`tauri build`, ni
  `cargo build`/`cargo check` dans `apps/desktop/src-tauri`).
- GC3 Worktree `WT=~/projets/roomboard-wt/usage-c15-3d--T<n>`, créé depuis `feat/usage-c15-3d` (et ses fusions de
  vague). Préparation : `cd "$WT" && pnpm install --frozen-lockfile` ; tâche Rust :
  `[ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c15-3d/target .` ; tâche TS :
  `mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c15-3d/apps/web/src/wasm/* apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c15-3d/apps/web/src/wasm-formats/* apps/web/src/wasm-formats/`.
- GC4 Module principal : s'il n'a pas les liaisons C15 (`grep -q add_model3d apps/web/src/wasm/roomboard_wasm.d.ts`
  échoue) et que la tâche en a besoin : `[ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c15-3d/target . ; cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm`.
  Plafond du module principal 1 572 864 o, ni baissé ni relevé (`wc -c apps/web/src/wasm/roomboard_wasm_bg.wasm`).
- GC5 Module `formats` (`crates/roomboard-formats`, `crates/roomboard-formats-wasm`) intouché : aucun octet ajouté.
- GC6 Hors ligne : aucun CDN, aucune URL distante dans le code ; `scripts/controle-hors-ligne.mjs` vert.
- GC7 Licences permissives seulement (U39) : `node scripts/controle-licences.mjs` rend 0 ; aucune GPL, LGPL, AGPL. Seules
  dépendances neuves : `three@0.187.0`, `fflate@0.8.3`, `@types/three@0.187.0` (développement), ajoutées par T1 seul.
- GC8 Vitest borné : `cd "$WT" && pnpm --filter @roomboard/web exec vitest run <fichiers> --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -80`.
  `tsc` : `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"` vide à la fin.
- GC9 Commits : `git add <chemin>` fichier par fichier ; jamais `git add -A`, `git add --all`, `git add .`,
  `git commit -a`, `--force`, ni `git stash` nu. Auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message
  anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, sans pousser :
  `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "<msg>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
- GC10 Format : `schema` et `formatVersion` inchangés ; champs scalaires d'un `Y.Map`, `files` en `Y.Array` de `Y.Map`,
  jamais `Any::Map` ; fichiers d'avant C15 inchangés (`compat_socle`, `compat_c3`, `compat_c5`, `compat_grille_pr12`,
  `element_inconnu`, `media`, `scenarios` verts).
- GC11 Interface : dans `apps/web/src/ui/` aucun `switch`, aucune taille en `px` dans un `.ts(x)`, libellés en français,
  aucun bouton à icône seule. Scène ≥ 640 px : barre flottante, aucune rangée permanente ; `SelectionRow.tsx`,
  `Toolbar.tsx`, `toolbar-host.ts`, `stage-tags.ts`, `EngineState` non touchés.
- GC12 Rust : `cargo fmt --all` puis `cargo clippy -p <crate> --all-targets -- -D warnings` sans avertissement.
- GC13 Modèles 3D de test fabriqués dans les tests (octets écrits à la main, `fflate.zipSync`), jamais téléchargés ni
  commités en binaire ; seule la capture PNG de `docs/essais/` est commitée.
- GC14 Aucun processus laissé en marche (serveur, navigateur, `vite`).
- GC15 Périmètre : seuls les fichiers de la tâche ; la branche `usage-c6b-pot-image` jamais touchée ; dans les fichiers
  communs (`element.rs`, `commands.rs`, `query.rs`, `document.rs`, `lib.rs`, `roomboard-wasm/src/lib.rs`, `api.ts`,
  `wasm-core.ts`, `fake-core.ts`, contrat, `engine.ts`, `canvas2d.ts`, `board-session.ts`, `App.tsx`, `verifier.sh`,
  `commun.mjs`) : ajouts localisés (variantes en fin d'énumération, bras voisins), aucune réorganisation.
- GC16 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne
  `Réutilise :` de la section ; N tests vus et noms attendus présents.
- GC17 `three` n'est importé (valeur) que par `platform/model-view-three.ts`, `fflate` que par `platform/zip-worker.ts`
  (et les tests) : jamais au démarrage (X20).

## Review Focus

1. Un glTF qui cite `https://…/tex.png` ou `/abs/tex.png` : aucune requête réseau (le web n'a pas de CSP), la texture
   est un « fichier lié absent » — test « URL distante : blob vide, comptée absente (DAX4) » (T7, X27).
2. Une orbite validée pendant que l'élément est supprimé ou annulé (instantané en cours de calcul) : aucune commande sur
   un élément disparu, aucune erreur — test « commit après suppression : aucune commande, séance fermée » (T10, X23).
3. Un `.obj` dont le `.mtl` cite `Texture.PNG` alors que le fichier déposé s'appelle `texture.png`, ou un sous-dossier
   du ZIP — tests « resolveReference : exact, sans casse, nom de base unique (X14) » (T3) et « ZIP : glTF + .bin + PNG
   dans un sous-dossier » (T8).
4. Un ZIP hostile (`../x.obj`, `/etc/x.obj`, 1 001 entrées, 300 Mio décompressés) — test « ZIP : chemins .. et absolus
   ignorés, 1 000 entrées, 256 Mio » (T8, X16).
5. Contexte WebGL perdu pendant l'orbite : instantané dessiné, « Tourner » grisé, message unique — test « contexte
   perdu : sans-webgl, séance fermée, un seul message » (T10, X26) et « webglcontextlost : available() faux » (T7).

## Couverture du cadrage

| entrée | tâche |
|---|---|
| X1, X2, X3, X4 (domaines), X7, X8, X9, X10, X30, X31, X33, X34 | T2 (X30 octets : T11, fichier enregistré relu) |
| X5 (instantané) | T7 (rendu PNG), T8 (à l'import), T10 (à chaque orbite) |
| X6 (boîte 4:3, placement) | T8 |
| X11, X14, X15 | T3 (pur), T8 (messages à l'import) |
| X12 (registre, `.mtl`/`.bin` seuls) | T8 |
| X13 (pré-passe) | T4 |
| X16 (ZIP), X17 (plafond), X18 (compressés) | T8 (T3 pour `keepZipPath`, `gltfCompression`) |
| X19, X28, X29, X35 | T1 |
| X20 (à la demande) | T5 (`createModelViewLoader`), T11 (amorce, essai) |
| X21, X23 | T5 (outil, moteur), T10 (écriture) |
| X22, X26, X27 | T7 (rendu), T10 (états) |
| X24 | T6 (barre), T10 (`App`) |
| X25 | T9 (T5 pour l'option `models`) |
| X32 | T4 |
| X36 | T10 |
| X37, X38 | T11 (modèles d'essai), T3/T7/T8 (modèles des tests unitaires) |
| X39 | T8 (`ImportDeps.model3d`), T11 (branchement) |
| S1 | T1, T2, T7, T8, T9, T11 · S2 : T2, T5, T6, T7, T10, T11 · S3 : T3, T4, T7, T8, T11 · S4 : T1, T2, T9, T10, T11 · S5 : T6, T7, T8, T9, T10, T11 |

Effets de bord → tests : `.zip` passe au gestionnaire 3D → T8 « un .zip sans modèle : aucun modèle 3D dans ce ZIP » ;
image citée non insérée seule / non citée inchangée → T4 « image citée réclamée, image non citée importée » ; ordre et
messages de la pré-passe → T4 « appel mixte image, PDF, modèle : ordre et messages inchangés » + `import.test.ts`
existant vert ; `element_geom` du média par `boxed_geom` → T2 `model3d_and_media_are_hit_by_their_box` + `tests/media.rs`
vert ; routage des gestes → T5 « moteur : séance d'orbite » + `image-edit.test.ts`, `engine.test.ts` verts ; CSP
`connect-src blob:` → T1 (`coque-csp.test.sh`, `controle-hors-ligne.test.sh`) ; libellé et extensions d'« Importer » →
T4 (`files.test.ts:65`, `host-repli.test.ts`, `host-tauri.test.ts:228`).

Tests à garder verts (carte d'impact) : `crates/roomboard-core/tests/{compat_socle,compat_c3,compat_c5,compat_grille_pr12,element_inconnu,media,scenarios}.rs`
(T2) ; `platform/{import,image-import,media-import,paste,drop-web}.test.ts` (T4, T8) ; `engine/tools/image-edit.test.ts`,
`engine/tools/select.test.ts` (T5) ; `engine/render/canvas2d.test.ts` (T5, T9) ; `ui/MediaBar.test.tsx` (T6, T10) ;
essai `c14-media-navigateur.mjs` et tous les `c*`/`s*-navigateur.mjs` (T11).

---

<a id="tache-t1"></a>

### Tâche T1 — Dépendances `three`/`fflate`, morceau `three`, CSP `connect-src blob:`, contrôle hors ligne, notices

**Objectif.** Ajouter `three` 0.187.0, `fflate` 0.8.3 (MIT) et `@types/three` 0.187.0 (développement) à `apps/web`
(X19) ; ranger three dans un morceau `three-*.js` (`chunkOf`) ; admettre `blob:` dans `connect-src` de la coque (X28) et
dans le contrôle hors ligne ; déclarer le faux hôte `i.test` de three (X29) ; ajouter les notices (X35). Toutes les
tâches qui importent three ou fflate (T7, T8) dépendent de celle-ci.

**Fichiers.** Modifier `apps/web/package.json`, `pnpm-lock.yaml` (par `pnpm add`), `apps/web/vite.config.ts:47-48`,
`THIRD_PARTY_NOTICES.md` (après la table C12, `:202-210`), `apps/desktop/src-tauri/tauri.conf.json:20`,
`scripts/controle-hors-ligne.mjs:13-20` et `:25-30`, `scripts/tests/controle-hors-ligne.test.sh` (cas avant la vraie
configuration, `:137-141`), `scripts/tests/coque-csp.test.sh:11`.

**Interfaces.**
- Consomme : rien.
- Produit : paquets `three`, `fflate`, `@types/three` résolus depuis `apps/web` (lus par T7 : `import … from "three"`,
  `"three/addons/loaders/GLTFLoader.js"` ; par T8 : `import { unzipSync } from "fflate"`) ; morceau nommé `three` ;
  CSP de la coque `connect-src 'self' ipc: http://ipc.localhost blob:` (servie par l'essai T11 via `coqueCsp()`).
- Réutilise : `apps/web/vite.config.ts:47` (`chunkOf`) — étendu d'un cas `three` (ligne « chargement à la demande » du cadrage).
- Réutilise : `scripts/controle-hors-ligne.mjs:13` (`NON_FETCHED_HOSTS`), `:25` (`SCHEME_TOKENS`) — une entrée chacun, justifiée.

**Test et commande bornée.**
```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
bash scripts/tests/controle-hors-ligne.test.sh 2>&1 | tail -3     # « N+2 cas OK », N noté à l'étape 1
bash scripts/tests/coque-csp.test.sh 2>&1 | tail -3               # « coque-csp.test.sh : OK »
node scripts/controle-licences.mjs; echo "code $?"                # code 0
grep -cE '"(three|fflate|@types/three)": "0\.(187\.0|8\.3)"' apps/web/package.json   # 3
(cd apps/web && node -e 'import("three").then(t=>console.log("three", t.REVISION)); import("fflate").then(f=>console.log("fflate", typeof f.unzipSync))')
# « three 187 » et « fflate function »
```

**Contraintes (recopiées).**
- GC1 TDD : test rouge d'abord, vu rouge ; aucun test sauté ni désactivé, aucun seuil baissé ; un test qui échoue sur un délai est rejoué une fois, aucun délai relevé.
- GC2 `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; aucun build Tauri (`tauri build`, ni `cargo build`/`check` dans `apps/desktop/src-tauri`).
- GC3 Préparation : `cd "$WT" && pnpm install --frozen-lockfile` (avant `pnpm add`).
- GC5 Module `formats` intouché. GC6 Hors ligne : aucun CDN ; `scripts/controle-hors-ligne.mjs` vert.
- GC7 Licences permissives seulement : `node scripts/controle-licences.mjs` rend 0 ; seules dépendances neuves `three@0.187.0`, `fflate@0.8.3`, `@types/three@0.187.0` (dev).
- GC9 Commits : `git add <chemin>` un par un ; jamais `git add -A`/`--all`/`.`, `git commit -a`, `--force`, `git stash` nu ; auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, sans pousser.
- GC14 Aucun processus laissé. GC15 Seuls les fichiers de la tâche. GC16 Lignes `Réutilisation :` et compte de cas dans le rapport.

**Interdits.** Aucune autre dépendance (ni `three-stdlib`, ni décodeur Draco/KTX2, ni `jszip`) ; ne pas toucher
`script-src` ni `SCRIPT_TOKENS` (aucun Worker `blob:`, X18) ; ne pas ajouter `data:` à `connect-src` ; aucun build Tauri.

**Critère « terminé ».** Les cinq commandes ci-dessus donnent les sorties attendues ; `pnpm-lock.yaml` et
`apps/web/package.json` commités ensemble ; trois commits au plus.

**Étapes.**
- [ ] 1. Noter N : `bash scripts/tests/controle-hors-ligne.test.sh 2>&1 | tail -1` (« N cas OK »). Ajouter les cas rouges
  avant la ligne `node "$script" "$tmp/propre" "$racine/apps/desktop/src-tauri/tauri.conf.json"` :
  ```bash
  # 25. `blob:` admis dans connect-src (C15, X28) : three lit ses textures et ses tampons par fetch(blob:).
  conf blob-connect "\"script-src\": \"$S $W\", \"connect-src\": \"$S ipc: http://ipc.localhost blob:\""
  node "$script" "$tmp/propre" "$tmp/blob-connect.json" > "$tmp/out" 2>&1 || echec "cas 25 : blob: refusé dans connect-src ($(cat "$tmp/out"))"
  cas=$((cas + 1))
  # 26. faux hôte `i.test` de three (/^https?:\/\//i.test, LoaderUtils.js) : admis, jamais chargé (C15, X29).
  mkdir -p "$tmp/three-dist" && cp -r "$tmp/propre/." "$tmp/three-dist/"
  printf 'const r=/^https?:\\/\\//i.test(u);\n' > "$tmp/three-dist/three-essai.js"
  node "$script" "$tmp/three-dist" "$tmp/bonne.json" > "$tmp/out" 2>&1 || echec "cas 26 : i.test de three refusé ($(cat "$tmp/out"))"
  cas=$((cas + 1))
  ```
  Dans `coque-csp.test.sh`, après la ligne `media-src` :
  ```bash
  echo "$csp" | grep -q "connect-src 'self' ipc: http://ipc.localhost blob:" || ko "connect-src blob: de la coque absent : $csp"
  ```
  Lancer les deux tests : cas 25 et 26 en échec, `coque-csp.test.sh` en échec (rouge). Vérifier d'abord que
  `$tmp/bonne.json`, `$S`, `$W` et `conf` existent dans le script (sinon utiliser leurs équivalents voisins, cas 19).
- [ ] 2. Code :
  - `scripts/controle-hors-ligne.mjs`, dans `NON_FETCHED_HOSTS` :
    ```js
    ["i.test", "fin de l'expression /^https?:\\/\\//i.test de three (LoaderUtils.js), lue comme un hôte ; .test est réservé (RFC 2606), jamais chargé (C15)"],
    ```
    et `["blob:", new Set(["img-src", "media-src", "connect-src"])],` dans `SCHEME_TOKENS`.
  - `tauri.conf.json:20` : `"connect-src": "'self' ipc: http://ipc.localhost blob:",`.
  - Les deux tests verts ; commit `chore(shell): allow blob: in connect-src and declare three's i.test pseudo-host`
    (`git add scripts/controle-hors-ligne.mjs scripts/tests/controle-hors-ligne.test.sh scripts/tests/coque-csp.test.sh apps/desktop/src-tauri/tauri.conf.json`, un par un).
- [ ] 3. Dépendances :
  ```bash
  cd "$WT/apps/web" && pnpm add --save-exact three@0.187.0 fflate@0.8.3 && pnpm add --save-exact -D @types/three@0.187.0 && cd "$WT"
  ```
  `vite.config.ts` :
  ```ts
  const chunkOf = (id: string): string | undefined =>
    id.includes("/node_modules/pdfjs-dist/")
      ? "pdfjs"
      : /\/node_modules\/(?:pdf-lib|@pdf-lib\/[^/]+|pako)\//.test(id)
        ? "pdf-lib"
        : id.includes("/node_modules/three/")
          ? "three"
          : undefined;
  ```
  `THIRD_PARTY_NOTICES.md`, nouvelle section après celle de C12 :
  ```markdown
  ## Paquets npm de l'application (C15, objets 3D)

  `three` est chargé par import dynamique au premier objet 3D (`apps/web/src/platform/model-view-three.ts`), jamais au
  démarrage ; `fflate` ne sert qu'au Worker de lecture des ZIP (`apps/web/src/platform/zip-worker.ts`).

  | paquet | version | licence | dépôt |
  |---|---|---|---|
  | three | 0.187.0 | MIT | https://github.com/mrdoob/three.js |
  | fflate | 0.8.3 | MIT | https://github.com/101arrowz/fflate |

  `@types/three` (0.187.0, MIT) ne sert qu'à la compilation et n'entre pas dans `dist`.
  ```
  `node scripts/controle-licences.mjs; echo "code $?"` → 0 (sinon : lire le refus, ne rien accepter qui ne soit MIT,
  Apache-2.0, BSD, ISC ou 0BSD, et le dire au rapport). `tsc` vide.
- [ ] 4. Commit `build(web): add three 0.187.0, fflate 0.8.3 and @types/three in their own chunk`
  (`git add apps/web/package.json`, `git add pnpm-lock.yaml`, `git add apps/web/vite.config.ts`, `git add THIRD_PARTY_NOTICES.md`).
- [ ] 5. Rapport : N et N+2, sortie des cinq commandes, deux lignes `Réutilisation :`.

<a id="tache-t2"></a>

### Tâche T2 — Cœur Rust de l'élément `model3d`, `boxed_geom`, liaison Wasm, contrat TS (parité fausse liaison)

**Objectif.** Le cœur lit et écrit l'élément `model3d` (X2-X10) : `AddModel3d` (élément + métadonnées du principal, des
fichiers liés et de l'instantané, une étape), `SetModel3dView` (état voulu complet : vue et instantané, une étape ; même
état : aucune), lecture tolérante (mal formé = cadre inconnu, jamais `None`), collision par `boxed_geom` commune au
média et à la 3D. La liaison Wasm les expose ; `api.ts`, `wasm-core.ts`, `fake-core.ts` les reflètent à l'identique.

**Fichiers.** Créer `crates/roomboard-core/src/model3d.rs`, `crates/roomboard-core/tests/model3d.rs`. Modifier
`src/lib.rs:14` (`pub mod model3d;` après `pub mod media;`), `src/media.rs` (`put_or_remove` et `valid_box` passent
`pub(crate)`, rien d'autre), `src/element.rs:31` (`KNOWN_KINDS`), `:117-150` (`ElementView.model3d`, `bare`),
`src/document.rs:392-405` (bras `model3d` d'`element`), `:1284-1370` (test I3), `src/query.rs:140-152` (`boxed_geom`),
`src/commands.rs` (variantes en fin d'`enum Command` après `SetImageParams`, `BadModel3d` en fin de `CommandError`,
`Display`, bras d'`apply` après `SetImageParams`), `crates/roomboard-wasm/src/lib.rs` (voisinage d'`add_media` `:603-655`,
`_inner` après `set_media_inner` `:1381-1397`, test après `add_media_inner_then_set_media_and_links` `:2202`),
`apps/web/src/core/api.ts`, `wasm-core.ts`, `fake-core.ts`, `wasm-core.contract.test.ts` (blocs en fin de fichier).

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit (Rust, `model3d.rs`) :
  - `pub const MODEL3D_KIND: &str = "model3d";` `pub const MAX_FILES: usize = 256;` `pub const MAX_PATH_CHARS: usize = 1024;`
    `pub const DEFAULT_YAW: f64 = PI / 6.0;` `pub const DEFAULT_PITCH: f64 = PI / 9.0;` `pub const PITCH_LIMIT: f64 = 85.0 * PI / 180.0;`
  - `pub enum Model3dFormat { Glb, Gltf, Obj, Stl, Ply }` avec `as_str(self) -> &'static str` et `parse(&str) -> Option<Self>`.
  - `#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)] pub struct Model3dFile { pub path: String, pub asset: String }`.
  - `#[derive(Debug, Clone, PartialEq, serde::Serialize)] pub struct Model3dView { pub asset: String, pub format: String, pub w: f64, pub h: f64, pub files: Vec<Model3dFile>, pub yaw: f64, pub pitch: f64, pub snapshot: Option<String> }`.
  - `pub struct NewModel3d<'a> { pub page: &'a str, pub asset: &'a AssetRef, pub format: Model3dFormat, pub files: &'a [(String, AssetRef)], pub w: f64, pub h: f64, pub yaw: f64, pub pitch: f64, pub snapshot: Option<&'a AssetRef>, pub matrix: &'a Transform }`.
  - `pub(crate) fn read_model3d<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<(Transform, Model3dView)>` ;
    `pub fn valid_path(p: &str) -> bool`.
  - `impl Document { pub(crate) fn cmd_add_model3d(&mut self, m: &NewModel3d<'_>) -> Result<Change, CommandError>; pub(crate) fn cmd_set_model3d_view(&mut self, id: &str, yaw: f64, pitch: f64, snapshot: Option<&AssetRef>) -> Result<Change, CommandError> }`.
  - `commands.rs` : `Command::AddModel3d { page: String, asset: AssetRef, format: crate::model3d::Model3dFormat, files: Vec<(String, AssetRef)>, w: f64, h: f64, yaw: f64, pitch: f64, snapshot: Option<AssetRef>, matrix: Transform }`,
    `Command::SetModel3dView { id: String, yaw: f64, pitch: f64, snapshot: Option<AssetRef> }`, `CommandError::BadModel3d`
    dont le `Display` vaut exactement « objet 3D invalide (format glb, gltf, obj, stl ou ply, boîte finie > 0, pitch de −85° à 85°, yaw dans ]−180°, 180°], 256 fichiers liés au plus, chemins de 1 à 1 024 caractères normalisés et uniques attendus) ».
  - `query.rs` : `fn boxed_geom<T: ReadTxn>(txn: &T, e: &MapRef, raw_id: Option<String>, read: Option<(Transform, f64, f64)>) -> Option<Geom>`.
  - Wasm : `add_model3d(&mut self, page: &str, asset: &str, name: &str, mime: &str, size: f64, format: &str, file_paths: Vec<String>, file_ids: Vec<String>, file_names: Vec<String>, file_mimes: Vec<String>, file_sizes: Vec<f64>, w: f64, h: f64, yaw: f64, pitch: f64, snapshot: Option<String>, snapshot_name: &str, snapshot_mime: &str, snapshot_size: f64, matrix: &[f64]) -> Result<JsValue, JsError>` ;
    `set_model3d_view(&mut self, id: &str, yaw: f64, pitch: f64, snapshot: Option<String>, snapshot_name: &str, snapshot_mime: &str, snapshot_size: f64) -> Result<JsValue, JsError>` ;
    `add_model3d_inner(&mut self, page: &str, asset: AssetRef, format: &str, files: Vec<(String, AssetRef)>, box_view: [f64; 4], snapshot: Option<AssetRef>, matrix: &[f64]) -> Result<Change, CommandError>` (matrice ≠ 6 : `BadMatrix` ; format inconnu : `BadModel3d`) ;
    `set_model3d_view_inner(&mut self, id: &str, yaw: f64, pitch: f64, snapshot: Option<AssetRef>) -> Result<Change, CommandError>`.
    Listes `file_*` de longueurs différentes : `BadModel3d`.
- Produit (TS, `api.ts`, lus par T7-T11) :
  ```ts
  export type Model3dFormat = "glb" | "gltf" | "obj" | "stl" | "ply";
  export interface Model3dFile { readonly path: string; readonly asset: string }
  export interface Model3dData { readonly asset: string; readonly format: Model3dFormat; readonly w: number; readonly h: number; readonly files: readonly Model3dFile[]; readonly yaw: number; readonly pitch: number; readonly snapshot: string | null }
  export interface Model3dElement extends ElementBase { readonly kind: "model3d"; readonly model3d: Model3dData }
  // ElementKind gagne "model3d" ; ElementView gagne Model3dElement.
  // Command : | { readonly type: "AddModel3d"; readonly page: string; readonly asset: AssetRef; readonly format: Model3dFormat; readonly files: readonly { readonly path: string; readonly asset: AssetRef }[]; readonly w: number; readonly h: number; readonly yaw: number; readonly pitch: number; readonly snapshot: AssetRef | null; readonly matrix: Matrix }
  //           | { readonly type: "SetModel3dView"; readonly id: string; readonly yaw: number; readonly pitch: number; readonly snapshot: AssetRef | null }
  export const MODEL3D_KIND = "model3d";
  export const MODEL3D_FORMATS: readonly Model3dFormat[] = ["glb", "gltf", "obj", "stl", "ply"];
  export const DEFAULT_MODEL3D_YAW = Math.PI / 6;
  export const DEFAULT_MODEL3D_PITCH = Math.PI / 9;
  export const MODEL3D_PITCH_LIMIT = (85 * Math.PI) / 180;
  export const MAX_MODEL3D_FILES = 256;
  export const MAX_MODEL3D_PATH = 1024;
  export const SNAPSHOT_MIME = "image/png";
  export const BAD_MODEL3D_MESSAGE = "objet 3D invalide (format glb, gltf, obj, stl ou ply, boîte finie > 0, pitch de −85° à 85°, yaw dans ]−180°, 180°], 256 fichiers liés au plus, chemins de 1 à 1 024 caractères normalisés et uniques attendus)";
  ```
- Réutilise : `crates/roomboard-core/src/media.rs` (patron) — nouveau module `model3d.rs` sur le même plan (`read_*`, `cmd_add_*`, `cmd_set_*`), et `put_or_remove`, `valid_box` de `media.rs` appelés (rendus `pub(crate)`, aucune copie).
- Réutilise : `crates/roomboard-core/src/document.rs:275` (`insert_asset_meta`) — pour le principal, chaque fichier lié et l'instantané (pas de copie de `write_asset_meta`).
- Réutilise : `crates/roomboard-core/src/document.rs:240` (`cited_assets`) — parcours générique : `asset`, `files[].asset`, `snapshot` cités sans code neuf (test `:1082` gardé vert).
- Réutilise : `crates/roomboard-core/src/query.rs:140-152` (bras média d'`element_geom`) — étendu en `boxed_geom(txn, e, raw_id, read)` commun aux bras `media` et `model3d`.
- Réutilise : `crates/roomboard-core/src/copy.rs:61-118` (`extract`, `cited_by`, `copy_asset_meta`) — recopie générique (test `copying_a_model3d_keeps_linked_files_meta`).

**Patron à ne pas reprendre (concepteur-critique).**
- `read_image` rend `None` pour une image mal formée (`crates/roomboard-core/src/element.rs:268-281`) et le bras image
  d'`element()` la fait disparaître : pour `model3d`, `None` donne le **cadre inconnu**, comme le média
  (`document.rs:392-405`, `query.rs:140-152`).
- Ne pas dupliquer le bras média d'`element_geom` (`query.rs:140-152`) : `boxed_geom` sert les deux.
- `cmd_set_media` (`media.rs:205-268`) retire les réglages neutres : ici, `yaw`/`pitch` égaux aux défauts sont retirés
  et `snapshot: None` **retire** l'instantané (état voulu complet, X7).
- Fausse liaison : un `model3d` mal formé suit le repli du média (`fake-core.ts:1547-1560`, `sourceKind: "model3d"`,
  brut gardé), pas celui de l'image (`malformed`, invisible). Parité des messages : `BAD_MODEL3D_MESSAGE` exact,
  `élément inconnu : <id>`.

**Code de `model3d.rs`** (à écrire tel quel, tests en fin de fichier).
```rust
//! Élément `model3d` (C15, X2-X10) : objet 3D posé sur la page. Champs d'un `Y.Map` d'élément : `asset` (fichier
//! principal), `format`, `w`, `h` (boîte locale), `files` (`Y.Array` de `Y.Map{path, asset}`, facultatif), `yaw`,
//! `pitch` (facultatifs, défauts 30° et 20°), `snapshot` (facultatif). Mal formé : cadre inconnu, jamais `None` (X8).
use std::f64::consts::PI;

use yrs::{Any, Array, ArrayPrelim, ArrayRef, In, Map, MapPrelim, MapRef, Out, ReadTxn};

use crate::asset::{is_asset_id, AssetRef};
use crate::commands::{valid_asset, valid_matrix, Change, CommandError};
use crate::document::Document;
use crate::element::{out_f64, out_string, out_transform, transform_to_any, Transform};
use crate::media::{put_or_remove, valid_box};

pub const MODEL3D_KIND: &str = "model3d";
pub const MAX_FILES: usize = 256;
pub const MAX_PATH_CHARS: usize = 1024;
pub const DEFAULT_YAW: f64 = PI / 6.0;
pub const DEFAULT_PITCH: f64 = PI / 9.0;
pub const PITCH_LIMIT: f64 = 85.0 * PI / 180.0;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Model3dFormat {
    Glb,
    Gltf,
    Obj,
    Stl,
    Ply,
}

impl Model3dFormat {
    pub fn as_str(self) -> &'static str {
        match self {
            Model3dFormat::Glb => "glb",
            Model3dFormat::Gltf => "gltf",
            Model3dFormat::Obj => "obj",
            Model3dFormat::Stl => "stl",
            Model3dFormat::Ply => "ply",
        }
    }

    pub fn parse(s: &str) -> Option<Model3dFormat> {
        match s {
            "glb" => Some(Model3dFormat::Glb),
            "gltf" => Some(Model3dFormat::Gltf),
            "obj" => Some(Model3dFormat::Obj),
            "stl" => Some(Model3dFormat::Stl),
            "ply" => Some(Model3dFormat::Ply),
            _ => None,
        }
    }
}

/// Fichier lié (X3) : référence normalisée telle qu'écrite dans le modèle, et empreinte de son asset.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct Model3dFile {
    pub path: String,
    pub asset: String,
}

/// Vue d'un objet 3D (X2) : boîte locale (0, 0)-(w, h) ; caméra et instantané aux défauts s'ils manquent.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct Model3dView {
    pub asset: String,
    pub format: String,
    pub w: f64,
    pub h: f64,
    pub files: Vec<Model3dFile>,
    pub yaw: f64,
    pub pitch: f64,
    pub snapshot: Option<String>,
}

/// Entrée d'`AddModel3d` (X7).
pub struct NewModel3d<'a> {
    pub page: &'a str,
    pub asset: &'a AssetRef,
    pub format: Model3dFormat,
    pub files: &'a [(String, AssetRef)],
    pub w: f64,
    pub h: f64,
    pub yaw: f64,
    pub pitch: f64,
    pub snapshot: Option<&'a AssetRef>,
    pub matrix: &'a Transform,
}

fn valid_yaw(y: f64) -> bool {
    y.is_finite() && y > -PI && y <= PI
}

fn valid_pitch(p: f64) -> bool {
    p.is_finite() && p.abs() <= PITCH_LIMIT
}

/// Chemin d'un fichier lié (X3) : 1 à 1 024 caractères, `/` seul séparateur, ni absolu, ni segment vide, `.` ou `..`,
/// ni `\` ni `:` (aucun schéma, aucun lecteur).
pub fn valid_path(p: &str) -> bool {
    (1..=MAX_PATH_CHARS).contains(&p.chars().count())
        && !p.contains('\\')
        && !p.contains(':')
        && p.split('/').all(|s| !s.is_empty() && s != "." && s != "..")
}

/// Entrées lisibles de `files` (X8) : `Y.Map` à `path` valide et `asset` empreinte ; illisible ou doublon : ignorée ;
/// 256 au plus.
fn read_files<T: ReadTxn>(txn: &T, a: &ArrayRef) -> Vec<Model3dFile> {
    let mut out: Vec<Model3dFile> = Vec::new();
    for v in a.iter(txn) {
        let Out::YMap(m) = v else { continue };
        let (Some(path), Some(asset)) = (out_string(m.get(txn, "path")), out_string(m.get(txn, "asset"))) else {
            continue;
        };
        if out.len() == MAX_FILES || !valid_path(&path) || !is_asset_id(&asset) || out.iter().any(|f| f.path == path) {
            continue;
        }
        out.push(Model3dFile { path, asset });
    }
    out
}

/// Objet 3D (X8) : `None` si l'élément n'en est pas un, ou si `transform`, `asset`, `format`, `w` ou `h` manque ou
/// sort du domaine (l'appelant rend le cadre inconnu). Facultatif illisible = défaut.
pub(crate) fn read_model3d<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<(Transform, Model3dView)> {
    if out_string(e.get(txn, "kind"))? != MODEL3D_KIND {
        return None;
    }
    let transform = out_transform(e.get(txn, "transform"))?;
    let asset = out_string(e.get(txn, "asset")).filter(|a| is_asset_id(a))?;
    let format = out_string(e.get(txn, "format")).filter(|f| Model3dFormat::parse(f).is_some())?;
    let w = out_f64(e.get(txn, "w")).filter(|v| valid_box(*v, 1.0))?;
    let h = out_f64(e.get(txn, "h")).filter(|v| valid_box(1.0, *v))?;
    let files = match e.get(txn, "files") {
        Some(Out::YArray(a)) => read_files(txn, &a),
        _ => Vec::new(),
    };
    Some((
        transform,
        Model3dView {
            asset,
            format,
            w,
            h,
            files,
            yaw: out_f64(e.get(txn, "yaw")).filter(|v| valid_yaw(*v)).unwrap_or(DEFAULT_YAW),
            pitch: out_f64(e.get(txn, "pitch")).filter(|v| valid_pitch(*v)).unwrap_or(DEFAULT_PITCH),
            snapshot: out_string(e.get(txn, "snapshot")).filter(|a| is_asset_id(a)),
        },
    ))
}

impl Document {
    /// X7 : refus sans transaction, dans l'ordre BadAsset → BadModel3d → BadMatrix → UnknownPage ; sinon une
    /// transaction `"local"` (une étape) : l'élément puis les métadonnées du principal, des liés et de l'instantané.
    pub(crate) fn cmd_add_model3d(&mut self, m: &NewModel3d<'_>) -> Result<Change, CommandError> {
        if !valid_asset(m.asset)
            || m.files.iter().any(|(_, a)| !valid_asset(a))
            || m.snapshot.is_some_and(|s| !valid_asset(s))
        {
            return Err(CommandError::BadAsset);
        }
        let unique = m
            .files
            .iter()
            .enumerate()
            .all(|(i, (p, _))| m.files[..i].iter().all(|(q, _)| q != p));
        if !valid_box(m.w, m.h)
            || !valid_yaw(m.yaw)
            || !valid_pitch(m.pitch)
            || m.files.len() > MAX_FILES
            || !unique
            || m.files.iter().any(|(p, _)| !valid_path(p))
        {
            return Err(CommandError::BadModel3d);
        }
        if !valid_matrix(m.matrix) {
            return Err(CommandError::BadMatrix);
        }
        let elements = self.page_elements_or_err(m.page)?;
        let id = yrs::uuid_v4().to_string();
        let mut fields = vec![
            ("id", In::from(id.as_str())),
            ("kind", In::from(MODEL3D_KIND)),
            ("transform", In::Any(transform_to_any(m.matrix))),
            ("asset", In::from(m.asset.id.as_str())),
            ("format", In::from(m.format.as_str())),
            ("w", In::Any(Any::from(m.w))),
            ("h", In::Any(Any::from(m.h))),
        ];
        if !m.files.is_empty() {
            let list: Vec<In> = m
                .files
                .iter()
                .map(|(p, a)| {
                    In::Map(MapPrelim::from_iter([
                        ("path", In::from(p.as_str())),
                        ("asset", In::from(a.id.as_str())),
                    ]))
                })
                .collect();
            fields.push(("files", In::Array(ArrayPrelim::from(list))));
        }
        if m.yaw != DEFAULT_YAW {
            fields.push(("yaw", In::Any(Any::from(m.yaw))));
        }
        if m.pitch != DEFAULT_PITCH {
            fields.push(("pitch", In::Any(Any::from(m.pitch))));
        }
        if let Some(s) = m.snapshot {
            fields.push(("snapshot", In::from(s.id.as_str())));
        }
        {
            let mut txn = self.transact_local();
            elements.push_back(&mut txn, MapPrelim::from_iter(fields));
            self.insert_asset_meta(&mut txn, m.asset);
            for (_, a) in m.files {
                self.insert_asset_meta(&mut txn, a);
            }
            if let Some(s) = m.snapshot {
                self.insert_asset_meta(&mut txn, s);
            }
        }
        Ok(self.done(Change {
            pages: vec![m.page.to_string()],
            ids: vec![id],
            ..Default::default()
        }))
    }

    /// X7 : état voulu complet (vue et instantané) ; `snapshot: None` retire l'instantané. Ordre : UnknownElement →
    /// BadModel3d (pas un objet 3D lisible) → BadAsset → BadModel3d (vue hors domaine). Même état : aucune
    /// transaction (D38). Sinon une étape : défauts retirés, instantané posé avec sa métadonnée.
    pub(crate) fn cmd_set_model3d_view(
        &mut self,
        id: &str,
        yaw: f64,
        pitch: f64,
        snapshot: Option<&AssetRef>,
    ) -> Result<Change, CommandError> {
        let (page, element, current) = {
            let txn = self.read();
            let found = self
                .find_element(&txn, id)
                .ok_or_else(|| CommandError::UnknownElement(id.to_string()))?;
            let (_, view) = read_model3d(&txn, &found.element).ok_or(CommandError::BadModel3d)?;
            (found.page_id, found.element, view)
        };
        if snapshot.is_some_and(|s| !valid_asset(s)) {
            return Err(CommandError::BadAsset);
        }
        if !valid_yaw(yaw) || !valid_pitch(pitch) {
            return Err(CommandError::BadModel3d);
        }
        if yaw == current.yaw
            && pitch == current.pitch
            && snapshot.map(|s| s.id.as_str()) == current.snapshot.as_deref()
        {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            put_or_remove(&element, &mut txn, "yaw", (yaw != DEFAULT_YAW).then(|| Any::from(yaw)));
            put_or_remove(&element, &mut txn, "pitch", (pitch != DEFAULT_PITCH).then(|| Any::from(pitch)));
            put_or_remove(
                &element,
                &mut txn,
                "snapshot",
                snapshot.map(|s| Any::String(s.id.as_str().into())),
            );
            if let Some(s) = snapshot {
                self.insert_asset_meta(&mut txn, s);
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
Si `In::Map`/`MapPrelim::from_iter` diffère dans la version de yrs du dépôt, reprendre la forme de `grid.rs:168`
(`In::Array(ArrayPrelim::from(levels))`) et de `document.rs:1086` ; si `put_or_remove` compare mal un
`Any::String`, le test « même état sans étape » le montre.

**Code des fichiers communs.**
- `commands.rs` : variantes (doc en français, comme `AddMedia`), `CommandError::BadModel3d`, `Display` (texte exact
  ci-dessus), bras d'`apply` :
  ```rust
  Command::AddModel3d { page, asset, format, files, w, h, yaw, pitch, snapshot, matrix } => {
      self.cmd_add_model3d(&crate::model3d::NewModel3d {
          page: &page, asset: &asset, format, files: &files, w, h, yaw, pitch,
          snapshot: snapshot.as_ref(), matrix: &matrix,
      })
  }
  Command::SetModel3dView { id, yaw, pitch, snapshot } => {
      self.cmd_set_model3d_view(&id, yaw, pitch, snapshot.as_ref())
  }
  ```
- `element.rs` : `pub const KNOWN_KINDS: [&str; 7] = ["stroke", "shape", "text", "image", "table", "media", "model3d"];`
  (commentaire : « C15 : `model3d` ») ; `ElementView` gagne, après `media` :
  ```rust
  /// Objet 3D (C15, X2) ; absent pour tout autre `kind`.
  #[serde(skip_serializing_if = "Option::is_none")]
  pub model3d: Option<crate::model3d::Model3dView>,
  ```
  et `bare` pose `model3d: None`.
- `document.rs`, bras après celui du média :
  ```rust
  Some(crate::model3d::MODEL3D_KIND) => Some(match crate::model3d::read_model3d(&txn, e) {
      Some((transform, model3d)) => ElementView {
          model3d: Some(model3d),
          ..ElementView::bare(id, "model3d", transform)
      },
      // X8 : objet 3D mal formé → cadre inconnu, jamais `None` (repli du média).
      None => {
          let (transform, unknown) = unknown_view(&txn, e)?;
          ElementView { unknown: Some(unknown), ..ElementView::bare(id, "unknown", transform) }
      }
  }),
  ```
  Test I3 (`every_known_kind_has_view_and_geom`) : bras `"model3d" => Command::AddModel3d { page: p.clone(), asset: AssetRef { id: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad".into(), name: "a.glb".into(), mime: "model/gltf-binary".into(), size: 3.0 }, format: crate::model3d::Model3dFormat::Glb, files: vec![], w: 640.0, h: 480.0, yaw: crate::model3d::DEFAULT_YAW, pitch: crate::model3d::DEFAULT_PITCH, snapshot: None, matrix: [1.0, 0.0, 0.0, 1.0, 0.0, 0.0] },`.
- `query.rs` : remplacer le bras média (`:140-152`) par l'appel commun, et ajouter le bras 3D :
  ```rust
  /// Boîte (0, 0)-(w, h) d'un élément à boîte (média, objet 3D) ; mal formé : la boîte inconnue (M7, X10).
  fn boxed_geom<T: ReadTxn>(
      txn: &T,
      e: &MapRef,
      raw_id: Option<String>,
      read: Option<(Transform, f64, f64)>,
  ) -> Option<Geom> {
      let (transform, w, h) = match read {
          Some(r) => r,
          None => {
              let (transform, u) = unknown_view(txn, e)?;
              (transform, u.w, u.h)
          }
      };
      Some(Geom { id: raw_id?, transform, outline: box_polygon(w, h).into() })
  }
  // dans element_geom :
  if out_string(e.get(txn, "kind")).as_deref() == Some(MEDIA_KIND) {
      return boxed_geom(txn, e, raw_id, read_media(txn, e).map(|(t, m)| (t, m.w, m.h)));
  }
  if out_string(e.get(txn, "kind")).as_deref() == Some(MODEL3D_KIND) {
      return boxed_geom(txn, e, raw_id, read_model3d(txn, e).map(|(t, m)| (t, m.w, m.h)));
  }
  ```
- Wasm (`lib.rs`), voisin d'`add_media` :
  ```rust
  /// C15 (X7) : objet 3D ; `file_*` : fichiers liés, listes de même longueur (sinon `BadModel3d`) ; `snapshot` `null` :
  /// sans instantané (ses `snapshot_*` sont ignorés). Seules les références traversent la liaison.
  #[allow(clippy::too_many_arguments)]
  pub fn add_model3d(&mut self, page: &str, asset: &str, name: &str, mime: &str, size: f64, format: &str,
      file_paths: Vec<String>, file_ids: Vec<String>, file_names: Vec<String>, file_mimes: Vec<String>, file_sizes: Vec<f64>,
      w: f64, h: f64, yaw: f64, pitch: f64, snapshot: Option<String>, snapshot_name: &str, snapshot_mime: &str,
      snapshot_size: f64, matrix: &[f64]) -> Result<JsValue, JsError> {
      let n = file_paths.len();
      if [file_ids.len(), file_names.len(), file_mimes.len(), file_sizes.len()].iter().any(|l| *l != n) {
          return Err(cmd_err(CommandError::BadModel3d));
      }
      let files: Vec<(String, AssetRef)> = (0..n)
          .map(|i| (file_paths[i].clone(), asset_ref(&file_ids[i], &file_names[i], &file_mimes[i], file_sizes[i])))
          .collect();
      let snapshot = snapshot.map(|id| asset_ref(&id, snapshot_name, snapshot_mime, snapshot_size));
      to_js(&self.add_model3d_inner(page, asset_ref(asset, name, mime, size), format, files, [w, h, yaw, pitch], snapshot, matrix).map_err(cmd_err)?)
  }

  /// C15 (X7) : vue voulue d'un objet 3D et son instantané (`null` : retiré).
  pub fn set_model3d_view(&mut self, id: &str, yaw: f64, pitch: f64, snapshot: Option<String>, snapshot_name: &str,
      snapshot_mime: &str, snapshot_size: f64) -> Result<JsValue, JsError> {
      let snapshot = snapshot.map(|s| asset_ref(&s, snapshot_name, snapshot_mime, snapshot_size));
      to_js(&self.set_model3d_view_inner(id, yaw, pitch, snapshot).map_err(cmd_err)?)
  }

  pub fn add_model3d_inner(&mut self, page: &str, asset: AssetRef, format: &str, files: Vec<(String, AssetRef)>,
      box_view: [f64; 4], snapshot: Option<AssetRef>, matrix: &[f64]) -> Result<Change, CommandError> {
      let m: Transform = matrix.try_into().map_err(|_| CommandError::BadMatrix)?;
      let format = Model3dFormat::parse(format).ok_or(CommandError::BadModel3d)?;
      let [w, h, yaw, pitch] = box_view;
      self.run(Command::AddModel3d { page: page.to_string(), asset, format, files, w, h, yaw, pitch, snapshot, matrix: m })
  }

  pub fn set_model3d_view_inner(&mut self, id: &str, yaw: f64, pitch: f64, snapshot: Option<AssetRef>) -> Result<Change, CommandError> {
      self.run(Command::SetModel3dView { id: id.to_string(), yaw, pitch, snapshot })
  }
  ```
  (`cargo fmt` remet la mise en forme ; `cmd_err` est la conversion existante utilisée par `add_media`.)
- TS : `api.ts` (types et constantes ci-dessus, voisins de `MediaElement` `:247`, `ElementKind` `:26`) ; `wasm-core.ts` :
  `toElementView` cas `"model3d"` (contrôle de forme : `format` hors `MODEL3D_FORMATS`, `w`/`h` non finis > 0, `yaw`/`pitch`
  non finis, `files` non tableau ou entrée sans `path`/`asset` chaînes → `ElementView invalide` ; `snapshot` `undefined`
  → `null`), `apply` :
  ```ts
  case "AddModel3d": {
    const a = cmd.asset;
    const s = cmd.snapshot;
    return toChange(this.d.add_model3d(cmd.page, a.id, a.name, a.mime, a.size, cmd.format,
      cmd.files.map((f) => f.path), cmd.files.map((f) => f.asset.id), cmd.files.map((f) => f.asset.name),
      cmd.files.map((f) => f.asset.mime), new Float64Array(cmd.files.map((f) => f.asset.size)),
      cmd.w, cmd.h, cmd.yaw, cmd.pitch, s?.id ?? undefined, s?.name ?? "", s?.mime ?? "", s?.size ?? 0, new Float64Array(cmd.matrix)));
  }
  case "SetModel3dView": {
    const s = cmd.snapshot;
    return toChange(this.d.set_model3d_view(cmd.id, cmd.yaw, cmd.pitch, s?.id ?? undefined, s?.name ?? "", s?.mime ?? "", s?.size ?? 0));
  }
  ```
  (passer `matrix` et les tailles sous la forme qu'accepte déjà `add_media` dans ce fichier, `:468-480`.)
  `fake-core.ts` : `KNOWN_KINDS` gagne `"model3d"` ; `FakeElement.model3d?: Model3dData` ; `worldPolygon` en boîte ;
  `AddModel3d` et `SetModel3dView` avec le même ordre de refus et les mêmes domaines (chemin valide : 1 à 1 024
  caractères, sans `\`, sans `:`, segments non vides, ni `.` ni `..`) ; métadonnées par le même `putMeta` que l'image ;
  `element()` ; `savedElement` (`{ id, kind: "model3d", transform, model3d, ...group }`) ; `loadElement` (illisible →
  cadre inconnu `sourceKind: "model3d"`, `raw` gardé, boîte `unknownBox(raw)`) ; cités : `asset`, `files[].asset`,
  `snapshot` (même parcours que le média).

**Tests rouges à écrire.**
- `model3d.rs` (module `tests`, aides comme `media.rs:330+`) :
  - `add_model3d_is_one_step_with_all_asset_meta` : GLB + deux liés (`tex/a.png`, `b.bin`) + instantané ; vue
    `{format: "glb", w: 640, h: 480, files: [2 entrées dans l'ordre], yaw: DEFAULT_YAW, pitch: DEFAULT_PITCH, snapshot: Some(png)}` ;
    `cited_assets` = les 4 empreintes triées ; `d.asset(id)` présent pour chacune ; un `undo` retire élément et
    métadonnées ; clés brutes de l'élément = `[asset, files, format, h, id, kind, snapshot, transform, w]` (défauts non écrits).
  - `add_model3d_refusals_write_nothing` (14 cas, aucune écriture, version 0) : asset `"ABC"` → `BadAsset` ; lié
    invalide → `BadAsset` ; instantané invalide → `BadAsset` ; `w = 0`, `h = 1e39`, `yaw = NaN`, `yaw = -PI`,
    `pitch = 1.5`, chemin `""`, `"../a.png"`, `"a\\b.png"`, `"c:/a.png"`, doublon, 257 fichiers → `BadModel3d` ;
    matrice nulle → `BadMatrix` ; page inconnue → `UnknownPage`.
  - `set_model3d_view_is_one_step_and_defaults_are_removed` : vue (1.0, 0.5, png1) → une étape, `yaw`/`pitch`/`snapshot`
    écrits ; même appel → `unchanged`, aucune écriture ; (DEFAULT_YAW, DEFAULT_PITCH, None) → clés `yaw`, `pitch`,
    `snapshot` retirées ; trois annulations rendent les trois états dans l'ordre (S2 : « l'ancienne vue revient »).
  - `set_model3d_view_refusals` : id inconnu → `UnknownElement` ; une image → `BadModel3d` ; instantané `"ABC"` →
    `BadAsset` ; `pitch = 2.0` → `BadModel3d` ; aucune écriture.
  - `unreadable_optional_fields_read_as_defaults_and_required_ones_fall_back_to_unknown` : brut `yaw: "x"`,
    `pitch: 9.0`, `snapshot: "x"`, `files: 3.0` → défauts, `files` vide ; `format: "fbx"` → `kind == "unknown"`,
    `source_kind == "model3d"`, boîte 640 × 480, `bounds` présente.
  - `unreadable_files_entries_are_ignored` : `files` = [entrée valide, `Y.Map` sans `asset`, doublon de chemin,
    `Any` nombre] → une seule entrée lue.
- `tests/model3d.rs` (patron `tests/media.rs`) : `model3d_survives_save_and_load_with_files_view_and_snapshot`
  (`save`/`load` : vue identique, `cited_assets` identiques) ; `malformed_model3d_is_an_unknown_frame_kept_byte_for_byte`
  (état yrs écrit à la main comme `malformed_media_ybin`, `tests/media.rs:104-153` : `m1` au `format: "fbx"`, `m2` sans
  `asset` ; deux cadres inconnus ; `save(load(save(d))) == save(d)`) ; `copying_a_model3d_keeps_linked_files_meta`
  (`extract` : cités identiques, métadonnées des liés recopiées) ; `model3d_and_media_are_hit_by_their_box`
  (`hit_test(page, x, y, 0.0)` au centre de chacun : son id ; hors des boîtes : `None` ; un `model3d` mal formé est
  touché dans sa boîte inconnue).
- `roomboard-wasm` : `add_model3d_inner_then_set_view` (vue `model3d` relue, `"fbx"` → `BadModel3d`, matrice de 5 →
  `BadMatrix`, `set_model3d_view_inner` relu, listes de longueurs différentes refusées par `add_model3d`).
- Contrat TS, `describe.each(factories)("contrat C15 : $name", …)` :
  « AddModel3d : une étape, vue aux défauts, principal, liés et instantané cités ; annuler retire tout (S1, X7) »
  (`toEqual` de la vue complète ; `bounds` = `{ x0: 100, y0: 50, x1: 740, y1: 530 }` pour `[1,0,0,1,100,50]` et 640 × 480) ;
  « AddModel3d : refus sans étape (X8) » (les 14 cas Rust, messages exacts, `BAD_MODEL3D_MESSAGE`) ;
  « SetModel3dView : une étape par vue validée, défauts retirés, même état sans étape ; annuler rend vue et instantané (S2) » ;
  « SetModel3dView : id inconnu, image, vue hors domaine (X8) » ;
  « enregistré puis relu : vue, fichiers liés et instantané gardés (S4) » ;
  « model3d mal formé : cadre inconnu, brut gardé (X33) » ;
  « copie (extract) : objet 3D à fichiers liés garde ses assets (X31) ».
  Bloc « contrôle de forme C15 (objet 3D) » pour `toElementView` (5 formes refusées). Le test `video3d` (`:147-154`)
  reste vert (un `kind` inconnu reste inconnu).

**Test et commande bornée.**
```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
cargo test -p roomboard-core -p roomboard-wasm 2>&1 | grep -E "test result|FAILED|panicked|error\[|model3d|media" | tail -50
# puis GC4 (reconstruction du module principal), puis :
ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web exec vitest run src/core --reporter=verbose 2>&1 | grep -E "C15|×|FAIL|Test Files|Tests " | tail -60
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"; wc -c apps/web/src/wasm/roomboard_wasm_bg.wasm
git diff --stat origin/main -- crates/roomboard-formats crates/roomboard-formats-wasm   # vide
```
Attendu : 0 `FAILED` ; ≥ 10 tests `model3d` nommés ci-dessus `ok` ; `tests/media.rs` et les tests d'avant C15 verts
(GC10) ; « contrat C15 » × 2 fabriques sans `×` ; `tsc` vide ; module ≤ 1 572 864 o (relevé au rapport, ≈ 1,14 Mo attendu).

**Contraintes (recopiées).**
- GC1 TDD : test rouge d'abord, vu rouge ; aucun test sauté ni désactivé (`skip`, `only`, `todo`, `#[ignore]`), aucun seuil baissé ; délai : rejoué une fois, jamais relevé.
- GC2 `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; aucun build Tauri.
- GC3 Préparation : `cd "$WT" && pnpm install --frozen-lockfile` ; `[ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c15-3d/target .` ; wasm : `mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c15-3d/apps/web/src/wasm/* apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c15-3d/apps/web/src/wasm-formats/* apps/web/src/wasm-formats/`.
- GC4 Reconstruction : `cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm` ; plafond 1 572 864 o ni baissé ni relevé.
- GC5 Module `formats` intouché (aucun octet ajouté). GC7 Aucune dépendance neuve ici.
- GC8 Vitest borné (commande ci-dessus) ; `tsc` vide.
- GC9 Commits : `git add <chemin>` un par un ; jamais `git add -A`/`--all`/`.`, `git commit -a`, `--force`, `git stash` nu ; auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, sans pousser.
- GC10 `schema`, `formatVersion` inchangés ; `files` en `Y.Array` de `Y.Map`, jamais `Any::Map` ; fixtures d'avant C15 vertes.
- GC12 `cargo fmt --all` ; `cargo clippy -p roomboard-core -p roomboard-wasm --all-targets -- -D warnings` propre.
- GC14 Aucun processus laissé. GC15 Ajouts localisés dans les fichiers communs (variantes en fin d'énumération, bras voisins ; `media.rs` : visibilité seule) ; `usage-c6b-pot-image` jamais touché.
- GC16 Rapport : cinq lignes `Réutilisation :`, noms des tests vus, taille du module.

**Interdits.** Aucun champ ajouté à `AssetInfo` ; aucune `Any::Map` ; ne pas toucher `read_image`, `cmd_add_image`,
`write_asset_meta`, `copy.rs`, `history.rs`, `roomboard-formats*` ; aucun changement de `schema`/`formatVersion`.

**Critère « terminé ».** Les commandes bornées vertes avec les noms ci-dessus, clippy propre, taille relevée, commits.

**Étapes.**
- [ ] 1. Tests Rust rouges : `model3d.rs` réduit aux constantes et au module `tests`, `pub mod model3d;`,
  `tests/model3d.rs`, bras I3, test wasm ; `cargo test -p roomboard-core model3d 2>&1 | tail -5` : erreurs de compilation (rouge).
- [ ] 2. Code de `model3d.rs` (ci-dessus), `media.rs` (`pub(crate)`), `element.rs`, `document.rs`, `query.rs`,
  `commands.rs` ; vert ; `tests/media.rs` vert ; fmt, clippy. Commit `feat(core): model3d element with orbit view, linked files and snapshot`.
- [ ] 3. Liaison Wasm et son test ; vert ; commit `feat(wasm): expose model3d commands`.
- [ ] 4. Contrat TS rouge (blocs C15) ; `api.ts`, `fake-core.ts`, `wasm-core.ts` ; GC4 ; vert sur les deux fabriques ;
  `tsc` ; commit `feat(core-ts): model3d contract, fake parity and wasm adapter`.
- [ ] 5. Rapport : noms vus, N, taille du module, cinq lignes `Réutilisation :`.

<a id="tache-t3"></a>

### Tâche T3 — Détection 3D, références, résolution, regroupement (fonctions pures)

**Objectif.** Toute la logique de fichiers 3D qui ne charge rien : détection par octets puis extension (X11),
références d'un modèle (X14 : OBJ `mtllib`, MTL `map_*`, glTF `buffers`/`images`, bloc JSON du GLB), résolution contre
les fichiers d'un même dépôt ou d'un ZIP (exact relatif au dossier du principal, puis sans casse, puis nom de base
unique), regroupement OBJ → MTL → textures (`gatherFiles`), compression requise (X18), filtre des chemins de ZIP et bornes
(X16), messages exacts (X12, X15, X16, X18, X26). Plus des modèles fabriqués pour les tests (T3, T7, T8).

**Fichiers.** Créer `apps/web/src/platform/model3d-import.ts`, `apps/web/src/platform/model3d-import.test.ts`,
`apps/web/src/platform/model3d-fixtures.ts` (modèles de test, importé par les seuls tests).

**Interfaces.**
- Consomme : rien.
- Produit (lus par T7, T8, T10, T11) : tout ce qu'exporte le code ci-dessous, en particulier
  `sniffModel3d(head: Uint8Array, name: string): Model3dFormat | null`,
  `references(kind: "obj" | "mtl" | "gltf", text: string): string[]`,
  `resolveReference(ref: string, mainPath: string, names: readonly string[]): string | null`,
  `gatherFiles(format: Model3dFormat, mainPath: string, main: Uint8Array, siblings: readonly Sibling[]): Promise<Gathered>`,
  `normalizePath(p: string): string`, `storedPath(ref: string): string | null`, `baseName(path: string): string`,
  `extensionOf(name: string): string`, `glbJsonText(bytes: Uint8Array): string | null`,
  `gltfCompression(json: string): string | null`, `keepZipPath(path: string): boolean`, `isCompanionName(name: string): boolean`,
  constantes `GLB_MAGIC`, `MODEL3D_MIME`, `MODEL_EXTENSIONS`, `COMPANION_EXTENSIONS`, `ZIP_MAX_ENTRIES`, `ZIP_MAX_BYTES`,
  `ZIP_MAX_MODELS`, `MAX_LINKED_FILES`, `MODEL3D_MAX_BYTES`, et les messages. `model3d-fixtures.ts` : `glb`, `cubeGlb`,
  `cubeObj`, `cubeMtl`, `stlBinary`, `plyAscii`, `gltfWithBin`.
- Réutilise : `apps/web/src/platform/import.ts:129` (`ZIP_MAGIC`) — non recopié ici : la détection d'un `.zip` reste à
  `import.ts` (T8 l'appelle) ; ce module ne déclare aucun en-tête ZIP.

**Code de `model3d-import.ts`** (partie pure ; les gestionnaires vivent dans `model3d-handlers.ts`, T8, PC9).
```ts
/**
 * Objets 3D, partie pure (C15, X11, X14, X15, X16, X18) : détection par octets puis extension, références d'un modèle
 * (OBJ → MTL → textures, glTF, GLB), résolution contre les fichiers d'un même dépôt ou d'un ZIP, regroupement, bornes et
 * messages. Aucun chargeur, aucun DOM, aucun import de la page : le Worker ZIP l'importe (PC9). Les gestionnaires du
 * registre vivent dans `model3d-handlers.ts` (T8).
 */

/** Même liste que `Model3dFormat` d'`api.ts` (T2) ; T8 remplace cet alias par l'import (PC1). */
export type Model3dFormat = "glb" | "gltf" | "obj" | "stl" | "ply";

/** En-tête d'un GLB : « glTF » (X11). */
export const GLB_MAGIC: readonly number[] = Object.freeze([0x67, 0x6c, 0x54, 0x46]);
/** Plafond d'un fichier 3D (X17), ZIP compris, coque comprise. */
export const MODEL3D_MAX_BYTES = 100 * 1024 * 1024;
export const MODEL_EXTENSIONS = ["glb", "gltf", "obj", "stl", "ply"] as const;
export const COMPANION_EXTENSIONS = ["mtl", "bin", "png", "jpg", "jpeg", "webp", "gif", "bmp"] as const;
export const MODEL3D_MIME = {
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
  obj: "model/obj",
  stl: "model/stl",
  ply: "model/x-ply",
  mtl: "model/mtl",
  bin: "application/octet-stream",
} as const;
/** Bornes d'un ZIP (X16, HX2-4). */
export const ZIP_MAX_ENTRIES = 1000;
export const ZIP_MAX_BYTES = 256 * 1024 * 1024;
export const ZIP_MAX_MODELS = 20;
/** Fichiers liés d'un objet (X3). */
export const MAX_LINKED_FILES = 256;
const MAX_PATH_CHARS = 1024;
const COMPRESSIONS = ["KHR_draco_mesh_compression", "EXT_meshopt_compression", "KHR_texture_basisu"] as const;

export const MTL_MISSING_MESSAGE =
  "déposé sans son .mtl, modèle sans matières ni textures ; déposez le .obj avec son .mtl et ses textures, ou un ZIP";
export const COMPRESSED_MESSAGE = "modèle 3D compressé (Draco, meshopt ou KTX2) non lu ; exportez-le sans compression";
export const COMPANION_ALONE_MESSAGE = "fichier lié d'un modèle 3D : déposez-le avec son modèle";
export const ZIP_EMPTY_MESSAGE = "aucun modèle 3D dans ce ZIP";
export const ZIP_TOO_BIG_MESSAGE = "ZIP trop gros (plus de 1 000 entrées ou de 256 Mio décompressés)";
export const NO_WEBGL_MESSAGE = "3D indisponible sur ce poste : l'objet garde son image";
export const MODEL3D_TOO_BIG_MESSAGE = "fichier trop gros pour un objet 3D (plus de 100 Mo)";
export const missingFilesMessage = (name: string, missing: readonly string[]): string =>
  `${name} : fichiers liés absents (${missing.join(", ")})`;

/** Dernier segment d'un chemin (`/` ou `\`). */
export function baseName(path: string): string {
  const p = path.replace(/\\/g, "/");
  return p.slice(p.lastIndexOf("/") + 1);
}

/** Extension en minuscules, sans le point ; "" sans extension ou pour un nom qui s'y réduit (`.obj`). */
export function extensionOf(name: string): string {
  const b = baseName(name);
  const i = b.lastIndexOf(".");
  return i > 0 ? b.slice(i + 1).toLowerCase() : "";
}

/** Référence normalisée (X3) : `\` → `/`, segments vides et `.` retirés, `..` résolus ; sortie de la racine : "". */
export function normalizePath(p: string): string {
  const out: string[] = [];
  for (const seg of p.replace(/\\/g, "/").split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      if (out.length === 0) return "";
      out.pop();
      continue;
    }
    out.push(seg);
  }
  return out.join("/");
}

/** Chemin rangé dans `files[].path` (PC6) : la référence normalisée, ou son nom de base si elle sort de son dossier ;
 *  null si inutilisable (vide, `:`, plus de 1 024 caractères). Accepté par `valid_path` du cœur. */
export function storedPath(ref: string): string | null {
  const n = normalizePath(ref) || baseName(ref);
  if (n === "" || n.includes(":") || [...n].length > MAX_PATH_CHARS) return null;
  return n;
}

const dirOf = (path: string): string => {
  const p = normalizePath(path);
  const i = p.lastIndexOf("/");
  return i < 0 ? "" : p.slice(0, i);
};

/** Schéma d'au moins deux lettres (`http:`, `data:`, `blob:`, `file:`) ou `//hôte` : jamais résolu (X27). */
const REMOTE = /^(?:[a-z][a-z0-9+.-]+:|\/\/)/i;
const ABSOLUTE = /^(?:\/|\\|[a-z]:[\\/])/i;

/** X11 : octets d'abord (GLB, PLY), puis extension (`.gltf` + `{`, `.obj` sans octet nul, `.stl`). */
export function sniffModel3d(head: Uint8Array, name: string): Model3dFormat | null {
  if (head.length >= 4 && GLB_MAGIC.every((b, i) => head[i] === b)) return "glb";
  if (head[0] === 0x70 && head[1] === 0x6c && head[2] === 0x79 && (head[3] === 0x0a || (head[3] === 0x0d && head[4] === 0x0a))) {
    return "ply";
  }
  const ext = extensionOf(name);
  if (ext === "gltf") {
    let i = head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf ? 3 : 0;
    while (i < head.length && (head[i] === 0x20 || head[i] === 0x09 || head[i] === 0x0a || head[i] === 0x0d)) i++;
    return head[i] === 0x7b ? "gltf" : null;
  }
  if (ext === "obj") return head.length > 0 && !head.includes(0) ? "obj" : null;
  if (ext === "stl") return head.length > 0 ? "stl" : null;
  return null;
}

/** `.mtl` ou `.bin` : fichier lié d'un modèle, jamais importé seul (X12). */
export const isCompanionName = (name: string): boolean => extensionOf(name) === "mtl" || extensionOf(name) === "bin";

const MTL_MAP_KEYS = new Set(["map_kd", "map_ka", "map_ks", "map_ns", "map_d", "map_bump", "bump", "disp", "norm", "refl"]);

const safeDecode = (s: string): string => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** X14 : références citées, dans l'ordre, sans doublon, `data:` exclus. OBJ : `mtllib` (reste de la ligne) ; MTL :
 *  dernier mot des clés de texture (sans casse) ; glTF : `buffers[].uri`, `images[].uri` (URI décodée). */
export function references(kind: "obj" | "mtl" | "gltf", text: string): string[] {
  const out: string[] = [];
  const add = (r: string): void => {
    const t = r.trim();
    if (t !== "" && !t.toLowerCase().startsWith("data:") && !out.includes(t)) out.push(t);
  };
  if (kind === "gltf") {
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return [];
    }
    for (const key of ["buffers", "images"]) {
      const list = (json as Record<string, unknown> | null)?.[key];
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        const uri = (item as { uri?: unknown } | null)?.uri;
        if (typeof uri === "string") add(safeDecode(uri));
      }
    }
    return out;
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const words = line.split(/\s+/);
    const key = (words[0] ?? "").toLowerCase();
    if (kind === "obj" && key === "mtllib") add(line.slice(words[0]!.length));
    if (kind === "mtl" && MTL_MAP_KEYS.has(key) && words.length > 1) add(words[words.length - 1]!);
  }
  return out;
}

/** Bloc JSON d'un GLB (chunk 0 de type `JSON`) ; null si l'en-tête ou le bloc manque. */
export function glbJsonText(bytes: Uint8Array): string | null {
  if (bytes.length < 20 || !GLB_MAGIC.every((b, i) => bytes[i] === b)) return null;
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const len = v.getUint32(12, true);
  if (v.getUint32(16, true) !== 0x4e4f534a || 20 + len > bytes.length) return null;
  return new TextDecoder().decode(bytes.subarray(20, 20 + len));
}

/** X18 : extension de compression **requise** (Draco, meshopt, KTX2), sinon null (seulement « utilisée » : null). */
export function gltfCompression(json: string): string | null {
  let j: unknown;
  try {
    j = JSON.parse(json);
  } catch {
    return null;
  }
  const req = (j as { extensionsRequired?: unknown } | null)?.extensionsRequired;
  if (!Array.isArray(req)) return null;
  return COMPRESSIONS.find((e) => req.includes(e)) ?? null;
}

/** X14 : nom de `names` qui répond à `ref` cité par `mainPath` : chemin exact relatif au dossier du principal, puis sans
 *  casse, puis nom de base unique (sans casse) ; distant jamais ; absolu : nom de base seulement. */
export function resolveReference(ref: string, mainPath: string, names: readonly string[]): string | null {
  if (REMOTE.test(ref)) return null;
  if (!ABSOLUTE.test(ref)) {
    const dir = dirOf(mainPath);
    const target = normalizePath(dir === "" ? ref : `${dir}/${ref}`);
    if (target !== "") {
      const exact = names.find((n) => normalizePath(n) === target);
      if (exact !== undefined) return exact;
      const t = target.toLowerCase();
      const loose = names.filter((n) => normalizePath(n).toLowerCase() === t);
      if (loose.length === 1) return loose[0]!;
    }
  }
  const b = baseName(ref).toLowerCase();
  if (b === "") return null;
  const same = names.filter((n) => baseName(n).toLowerCase() === b);
  return same.length === 1 ? same[0]! : null;
}

/** Fichier candidat d'un même dépôt ou d'un même ZIP : son chemin (nom seul pour un dépôt) et ses octets à la demande. */
export interface Sibling {
  readonly path: string;
  bytes(): Promise<Uint8Array>;
}
export interface GatheredFile {
  /** `storedPath` de la référence : la clé de `files[].path` et de la garde d'URL (T7). */
  readonly path: string;
  readonly sibling: Sibling;
}
export interface Gathered {
  readonly files: readonly GatheredFile[];
  /** Références citées sans fichier (telles qu'écrites) ; vide quand `mtl` est faux (X15 prime). */
  readonly missing: readonly string[];
  /** OBJ : vrai si au moins un `.mtl` cité est résolu ; null pour les autres formats. */
  readonly mtl: boolean | null;
}

/** X13, X14 : fichiers liés d'un modèle parmi `siblings` (OBJ → MTL → textures du MTL, résolues depuis le MTL ; glTF et
 *  GLB → tampons et images) ; doublons rangés une fois, `MAX_LINKED_FILES` au plus. STL, PLY : aucun. */
export async function gatherFiles(
  format: Model3dFormat,
  mainPath: string,
  main: Uint8Array,
  siblings: readonly Sibling[],
): Promise<Gathered> {
  const names = siblings.map((s) => s.path);
  const files: GatheredFile[] = [];
  const missing: string[] = [];
  const take = (ref: string, from: string): Sibling | null => {
    const hit = resolveReference(ref, from, names);
    const path = storedPath(ref);
    if (hit === null || path === null) {
      if (!missing.includes(ref)) missing.push(ref);
      return null;
    }
    const sibling = siblings[names.indexOf(hit)]!;
    if (!files.some((f) => f.path === path) && files.length < MAX_LINKED_FILES) files.push({ path, sibling });
    return sibling;
  };
  const text = (b: Uint8Array): string => new TextDecoder().decode(b);
  if (format === "gltf" || format === "glb") {
    const json = format === "gltf" ? text(main) : glbJsonText(main);
    for (const ref of json === null ? [] : references("gltf", json)) take(ref, mainPath);
    return { files, missing, mtl: null };
  }
  if (format !== "obj") return { files, missing, mtl: null };
  let mtl = false;
  for (const ref of references("obj", text(main))) {
    const s = take(ref, mainPath);
    if (s === null) continue;
    mtl = true;
    for (const tex of references("mtl", text(await s.bytes()))) take(tex, s.path);
  }
  return { files, missing: mtl ? missing : [], mtl };
}

/** X16 : entrée de ZIP gardée : fichier (pas un dossier), ni absolu ni `..`, hors `__MACOSX`, extension 3D ou liée. */
export function keepZipPath(path: string): boolean {
  const p = path.replace(/\\/g, "/");
  if (p.endsWith("/") || ABSOLUTE.test(p)) return false;
  const segs = p.split("/");
  if (segs.some((s) => s === ".." || s === "__MACOSX")) return false;
  const ext = extensionOf(p);
  return (MODEL_EXTENSIONS as readonly string[]).includes(ext) || (COMPANION_EXTENSIONS as readonly string[]).includes(ext);
}
```

**Code de `model3d-fixtures.ts`** (réservé aux tests ; aucun fichier binaire commité, GC13).
```ts
/** Modèles 3D fabriqués pour les tests (C15, X37) : jamais téléchargés. Importé par les seuls `*.test.ts`. */
const enc = new TextEncoder();

/** GLB 2.0 : bloc JSON (complété d'espaces) puis bloc BIN (complété de zéros). */
export function glb(json: object, bin: Uint8Array = new Uint8Array(0)): Uint8Array {
  const j = enc.encode(JSON.stringify(json));
  const jl = Math.ceil(j.length / 4) * 4;
  const bl = Math.ceil(bin.length / 4) * 4;
  const total = 20 + jl + (bl > 0 ? 8 + bl : 0);
  const out = new Uint8Array(total);
  const v = new DataView(out.buffer);
  v.setUint32(0, 0x46546c67, true);
  v.setUint32(4, 2, true);
  v.setUint32(8, total, true);
  v.setUint32(12, jl, true);
  v.setUint32(16, 0x4e4f534a, true);
  out.set(j, 20);
  out.fill(0x20, 20 + j.length, 20 + jl);
  if (bl > 0) {
    v.setUint32(20 + jl, bl, true);
    v.setUint32(24 + jl, 0x004e4942, true);
    out.set(bin, 28 + jl);
  }
  return out;
}

/** Cube de côté 2 centré sur l'origine, couleurs de sommets (rouge, vert, bleu…), 12 triangles. */
export function cubeGlb(extra: Record<string, unknown> = {}): Uint8Array {
  const pos = new Float32Array([-1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1]);
  const col = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0.2, 0.2, 0.2]);
  const ind = new Uint16Array([0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 2, 3, 7, 2, 7, 6, 1, 2, 6, 1, 6, 5, 0, 4, 7, 0, 7, 3]);
  const bin = new Uint8Array(264);
  bin.set(new Uint8Array(pos.buffer), 0);
  bin.set(new Uint8Array(col.buffer), 96);
  bin.set(new Uint8Array(ind.buffer), 192);
  return glb(
    {
      asset: { version: "2.0" },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0, COLOR_0: 1 }, indices: 2 }] }],
      buffers: [{ byteLength: 264 }],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: 96 },
        { buffer: 0, byteOffset: 96, byteLength: 96 },
        { buffer: 0, byteOffset: 192, byteLength: 72 },
      ],
      accessors: [
        { bufferView: 0, componentType: 5126, count: 8, type: "VEC3", min: [-1, -1, -1], max: [1, 1, 1] },
        { bufferView: 1, componentType: 5126, count: 8, type: "VEC3" },
        { bufferView: 2, componentType: 5123, count: 36, type: "SCALAR" },
      ],
      ...extra,
    },
    bin,
  );
}

/** Cube OBJ (8 sommets, 6 faces carrées) ; `mtllib` et `usemtl bleu` si `mtl` est donné. */
export function cubeObj(mtl: string | null = "cube.mtl"): string {
  const head = mtl === null ? "" : `mtllib ${mtl}\nusemtl bleu\n`;
  return `${head}v -1 -1 -1\nv 1 -1 -1\nv 1 1 -1\nv -1 1 -1\nv -1 -1 1\nv 1 -1 1\nv 1 1 1\nv -1 1 1\n` +
    "f 1 4 3 2\nf 5 6 7 8\nf 1 2 6 5\nf 3 4 8 7\nf 2 3 7 6\nf 1 5 8 4\n";
}

/** Matière bleue ; `map_Kd` si une texture est donnée (options `-s` comprises, dernier mot = fichier). */
export function cubeMtl(texture: string | null = null): string {
  return `newmtl bleu\nKd 0 0 1\n${texture === null ? "" : `map_Kd -s 1 1 1 ${texture}\n`}`;
}

/** STL binaire : tétraèdre (4 triangles), normales nulles (recalculées par le chargeur). */
export function stlBinary(): Uint8Array {
  const v = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const tris = [[0, 2, 1], [0, 1, 3], [0, 3, 2], [1, 2, 3]];
  const out = new Uint8Array(84 + tris.length * 50);
  const d = new DataView(out.buffer);
  d.setUint32(80, tris.length, true);
  tris.forEach((t, i) => {
    const o = 84 + i * 50 + 12;
    t.forEach((k, j) => v[k]!.forEach((c, n) => d.setFloat32(o + j * 12 + n * 4, c, true)));
  });
  return out;
}

/** PLY ASCII : tétraèdre à couleurs de sommets. */
export function plyAscii(): string {
  return [
    "ply", "format ascii 1.0", "element vertex 4", "property float x", "property float y", "property float z",
    "property uchar red", "property uchar green", "property uchar blue", "element face 4", "property list uchar int vertex_indices",
    "end_header", "0 0 0 255 0 0", "1 0 0 0 255 0", "0 1 0 0 0 255", "0 0 1 255 255 0", "3 0 2 1", "3 0 1 3", "3 0 3 2", "3 1 2 3", "",
  ].join("\n");
}

/** glTF texte qui cite `cube.bin` et `tex/a.png` (UV comprises), et son tampon. */
export function gltfWithBin(image = "tex/a.png"): { readonly gltf: string; readonly bin: Uint8Array } {
  const pos = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const uv = new Float32Array([0, 0, 1, 0, 0, 1]);
  const bin = new Uint8Array(60);
  bin.set(new Uint8Array(pos.buffer), 0);
  bin.set(new Uint8Array(uv.buffer), 36);
  const gltf = JSON.stringify({
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
    textures: [{ source: 0 }],
    images: [{ uri: image }],
    buffers: [{ uri: "cube.bin", byteLength: 60 }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }, { buffer: 0, byteOffset: 36, byteLength: 24 }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] },
      { bufferView: 1, componentType: 5126, count: 3, type: "VEC2" },
    ],
  });
  return { gltf, bin };
}
```

**Tests rouges à écrire** (`model3d-import.test.ts`, `describe("objets 3D, partie pure (C15)")`).
```ts
import { describe, expect, it } from "vitest";
import { cubeGlb, cubeMtl, cubeObj, glb, gltfWithBin, plyAscii, stlBinary } from "./model3d-fixtures";
import {
  COMPANION_ALONE_MESSAGE, COMPRESSED_MESSAGE, MTL_MISSING_MESSAGE, NO_WEBGL_MESSAGE, ZIP_EMPTY_MESSAGE, gatherFiles,
  glbJsonText, gltfCompression, isCompanionName, keepZipPath, missingFilesMessage, normalizePath, references,
  resolveReference, sniffModel3d, storedPath, type Sibling,
} from "./model3d-import";

const bytes = (s: string): Uint8Array => new TextEncoder().encode(s);
const sib = (path: string, content: string | Uint8Array = ""): Sibling => ({
  path,
  bytes: async () => (typeof content === "string" ? bytes(content) : content),
});

it("sniffModel3d (C15, X11) : octets d'abord, puis extension", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const cases: Array<[Uint8Array, string, string | null]> = [
    [cubeGlb().subarray(0, 64), "x.bin", "glb"],
    [bytes("ply\nformat ascii 1.0"), "nuage.txt", "ply"],
    [bytes("ply\r\nformat"), "a.ply", "ply"],
    [bytes("plyx"), "a.ply", null],
    [bytes("  \n{\"asset\":{}}"), "a.gltf", "gltf"],
    [new Uint8Array([0xef, 0xbb, 0xbf, 0x7b]), "a.GLTF", "gltf"],
    [bytes("[1]"), "a.gltf", null],
    [bytes(cubeObj()), "cube.obj", "obj"],
    [new Uint8Array([0x76, 0x20, 0x00]), "cube.obj", null],
    [stlBinary().subarray(0, 64), "piece.stl", "stl"],
    [bytes("solid x"), "PIECE.STL", "stl"],
    [new Uint8Array(0), "vide.stl", null],
    [bytes(cubeMtl()), "cube.mtl", null],
    [png, "x.glb", null],
  ];
  for (const [head, name, want] of cases) expect([name, sniffModel3d(head, name)]).toEqual([name, want]);
});

it("references : OBJ mtllib (nom à espaces), MTL dernier mot des dix clés, glTF sans data: et URI décodée (X14)", () => {
  expect(references("obj", "# x\nmtllib  mon cube.mtl\nv 0 0 0\n")).toEqual(["mon cube.mtl"]);
  const mtl = ["map_Kd a.png", "MAP_KA b.png", "map_Ks -s 1 1 1 c.png", "map_Ns d.png", "map_d e.png", "map_Bump f.png",
    "bump g.png", "disp h.png", "norm i.png", "refl -type sphere j.png", "map_Kd a.png", "Kd 1 0 0"].join("\n");
  expect(references("mtl", mtl)).toEqual(["a.png", "b.png", "c.png", "d.png", "e.png", "f.png", "g.png", "h.png", "i.png", "j.png"]);
  const gltf = JSON.stringify({ buffers: [{ uri: "m%20a.bin" }, { uri: "data:application/octet-stream;base64,AA==" }], images: [{ uri: "tex/a.png" }, { bufferView: 0 }] });
  expect(references("gltf", gltf)).toEqual(["m a.bin", "tex/a.png"]);
  expect(references("gltf", "{pas du json")).toEqual([]);
});

it("glbJsonText et gltfCompression (X18) : requise → nom, seulement utilisée → null", () => {
  expect(JSON.parse(glbJsonText(cubeGlb())!).asset.version).toBe("2.0");
  expect(glbJsonText(new Uint8Array(10))).toBeNull();
  expect(gltfCompression(JSON.stringify({ extensionsRequired: ["KHR_draco_mesh_compression"] }))).toBe("KHR_draco_mesh_compression");
  expect(gltfCompression(JSON.stringify({ extensionsRequired: ["KHR_texture_basisu"] }))).toBe("KHR_texture_basisu");
  expect(gltfCompression(JSON.stringify({ extensionsUsed: ["EXT_meshopt_compression"] }))).toBeNull();
  expect(gltfCompression("{")).toBeNull();
});

it("normalizePath et storedPath (X3, PC6)", () => {
  expect(normalizePath(".\\tex//./a.png")).toBe("tex/a.png");
  expect(normalizePath("a/../b.png")).toBe("b.png");
  expect(normalizePath("../a.png")).toBe("");
  expect(storedPath("../tex/a.png")).toBe("a.png");
  expect(storedPath("./tex/a.png")).toBe("tex/a.png");
  expect(storedPath("c:/x.png")).toBeNull();
  expect(storedPath("x".repeat(1025))).toBeNull();
});

it("resolveReference : exact, sans casse, nom de base unique (X14)", () => {
  const names = ["modele/cube.obj", "modele/cube.mtl", "modele/tex/Texture.PNG", "autre/b.png"];
  expect(resolveReference("cube.mtl", "modele/cube.obj", names)).toBe("modele/cube.mtl");
  expect(resolveReference("tex/texture.png", "modele/cube.obj", names)).toBe("modele/tex/Texture.PNG");
  expect(resolveReference("ailleurs/B.png", "modele/cube.obj", names)).toBe("autre/b.png");
  expect(resolveReference("absent.png", "modele/cube.obj", names)).toBeNull();
  expect(resolveReference("Texture.png", "cube.obj", ["texture.png"])).toBe("texture.png"); // dépôt : noms seuls
});

it("resolveReference : distant jamais, absolu par nom de base, nom de base ambigu : null (X14, X27)", () => {
  const names = ["a.png", "x/b.png", "y/b.png"];
  for (const r of ["https://cdn.test/a.png", "//cdn.test/a.png", "data:image/png;base64,AA", "blob:x", "file:///a.png"]) {
    expect(resolveReference(r, "m.gltf", names)).toBeNull();
  }
  expect(resolveReference("/home/moi/a.png", "m.gltf", names)).toBe("a.png");
  expect(resolveReference("C:\\Users\\moi\\a.png", "m.gltf", names)).toBe("a.png");
  expect(resolveReference("z/b.png", "m.gltf", names)).toBeNull();
});

it("gatherFiles : OBJ → MTL → textures (X14)", async () => {
  const g = await gatherFiles("obj", "cube.obj", bytes(cubeObj()), [sib("cube.mtl", cubeMtl("bleu.png")), sib("bleu.png"), sib("photo.png")]);
  expect(g.files.map((f) => [f.path, f.sibling.path])).toEqual([["cube.mtl", "cube.mtl"], ["bleu.png", "bleu.png"]]);
  expect([g.missing, g.mtl]).toEqual([[], true]);
});

it("gatherFiles : OBJ sans mtllib ou .mtl introuvable : mtl faux, rien d'absent listé (X15)", async () => {
  expect(await gatherFiles("obj", "seul.obj", bytes(cubeObj(null)), [])).toEqual({ files: [], missing: [], mtl: false });
  expect((await gatherFiles("obj", "seul.obj", bytes(cubeObj()), [sib("autre.mtl")])).mtl).toBe(false);
});

it("gatherFiles : glTF + .bin + PNG ; texture absente listée ; GLB à image intégrée : aucun lié (X14)", async () => {
  const { gltf, bin } = gltfWithBin();
  const g = await gatherFiles("gltf", "m/scene.gltf", bytes(gltf), [sib("m/cube.bin", bin), sib("m/tex/a.png")]);
  expect(g.files.map((f) => f.path)).toEqual(["cube.bin", "tex/a.png"]);
  const h = await gatherFiles("gltf", "scene.gltf", bytes(gltf), [sib("cube.bin", bin)]);
  expect([h.files.map((f) => f.path), h.missing]).toEqual([["cube.bin"], ["tex/a.png"]]);
  expect(await gatherFiles("glb", "cube.glb", cubeGlb(), [sib("x.png")])).toEqual({ files: [], missing: [], mtl: null });
  expect((await gatherFiles("stl", "p.stl", stlBinary(), [sib("x.png")])).files).toEqual([]);
  expect((await gatherFiles("ply", "n.ply", bytes(plyAscii()), [])).mtl).toBeNull();
});

it("gatherFiles : 256 fichiers liés au plus, doublons rangés une fois", async () => {
  const many = Array.from({ length: 300 }, (_, i) => `t${i}.png`);
  const mtl = many.map((n) => `map_Kd ${n}`).join("\n") + "\nmap_Ka t0.png\n";
  const g = await gatherFiles("obj", "c.obj", bytes(cubeObj()), [sib("cube.mtl", mtl), ...many.map((n) => sib(n))]);
  expect(g.files).toHaveLength(256);
  expect(new Set(g.files.map((f) => f.path)).size).toBe(256);
});

it("keepZipPath (X16) : .., absolus, dossiers, __MACOSX, extensions", () => {
  const yes = ["cube.glb", "m/scene.gltf", "m/cube.bin", "tex/a.PNG", "a.mtl", "p.stl", "n.ply", "c.obj", "m\\x.jpg"];
  const no = ["../x.obj", "a/../../x.obj", "/etc/x.obj", "C:/x.obj", "dossier/", "__MACOSX/._cube.glb", "lisez-moi.txt", "x.fbx"];
  expect(yes.filter(keepZipPath)).toEqual(yes);
  expect(no.filter(keepZipPath)).toEqual([]);
});

it("messages exacts (X12, X15, X16, X18, X26) et fichiers liés seuls", () => {
  expect(missingFilesMessage("cube.obj", ["a.png", "b.mtl"])).toBe("cube.obj : fichiers liés absents (a.png, b.mtl)");
  expect(MTL_MISSING_MESSAGE).toBe("déposé sans son .mtl, modèle sans matières ni textures ; déposez le .obj avec son .mtl et ses textures, ou un ZIP");
  expect(COMPRESSED_MESSAGE).toBe("modèle 3D compressé (Draco, meshopt ou KTX2) non lu ; exportez-le sans compression");
  expect(COMPANION_ALONE_MESSAGE).toBe("fichier lié d'un modèle 3D : déposez-le avec son modèle");
  expect(ZIP_EMPTY_MESSAGE).toBe("aucun modèle 3D dans ce ZIP");
  expect(NO_WEBGL_MESSAGE).toBe("3D indisponible sur ce poste : l'objet garde son image");
  expect(["a.MTL", "b.bin", "c.png", "d.obj"].map(isCompanionName)).toEqual([true, true, false, false]);
});

it("glb : en-tête, longueur totale, blocs alignés sur 4", () => {
  const g = glb({ asset: { version: "2.0" } }, new Uint8Array([1, 2, 3]));
  const v = new DataView(g.buffer);
  expect([v.getUint32(0, true), v.getUint32(8, true), g.length % 4]).toEqual([0x46546c67, g.length, 0]);
});
```
(Ajouter les `it` sous un `describe("objets 3D, partie pure (C15)", …)` ; renommer le premier « sniffModel3d (C15, X11) »
tel quel : c'est le nom attendu par la preuve. Les noms de la preuve doivent apparaître mot pour mot.)

**Test et commande bornée.**
```bash
cd "$WT" && pnpm --filter @roomboard/web exec vitest run src/platform/model3d-import.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -40
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"
```
Attendu : « Tests  13 passed » ou plus (≥ 13 `it`, 16 noms de cas au total dans la table de `sniffModel3d`), 0 `×`,
noms « sniffModel3d (C15, X11) », « resolveReference : exact, sans casse, nom de base unique (X14) »,
« gatherFiles : OBJ → MTL → textures (X14) » présents ; `tsc` vide.

**Contraintes (recopiées).**
- GC1 TDD : test rouge d'abord, vu rouge ; aucun test sauté ni désactivé, aucun seuil baissé ; délai : rejoué une fois, jamais relevé.
- GC2 `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; aucun build Tauri.
- GC3 Préparation : `cd "$WT" && pnpm install --frozen-lockfile` ; wasm : `mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c15-3d/apps/web/src/wasm/* apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c15-3d/apps/web/src/wasm-formats/* apps/web/src/wasm-formats/`.
- GC5 Module `formats` intouché. GC6 Aucune URL distante dans le code (les URL des tests ont des hôtes `.test`). GC7 Aucune dépendance neuve.
- GC8 Vitest borné ; `tsc` vide.
- GC9 Commits : `git add <chemin>` un par un ; jamais `git add -A`/`--all`/`.`, `git commit -a`, `--force`, `git stash` nu ; auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, sans pousser.
- GC13 Modèles fabriqués dans les tests, jamais téléchargés ni commités en binaire. GC14 Aucun processus laissé.
- GC15 Seuls les trois fichiers de la tâche. GC16 Ligne `Réutilisation :` et noms des tests au rapport.
- GC17 Ce module n'importe ni `three` ni `fflate`.

**Interdits.** Aucun import de `three`, `fflate`, du DOM, d'`import.ts`, d'`image-import.ts` ou de `controller.ts` (le Worker ZIP importe ce module, PC9) ; aucun gestionnaire de registre ici.

**Critère « terminé ».** Commande bornée verte avec les noms attendus ; `tsc` vide ; un commit.

**Étapes.**
- [ ] 1. `model3d-fixtures.ts` (code ci-dessus) et le test ; `model3d-import.ts` réduit à `export {}` ; lancer : échecs
  d'import (rouge).
- [ ] 2. Code de `model3d-import.ts` ci-dessus ; vert ; `tsc` vide.
- [ ] 3. Commit `feat(import): 3D model detection, references and linked-file gathering` (trois `git add`).
- [ ] 4. Rapport : N tests, noms vus, ligne `Réutilisation : écart — ZIP_MAGIC reste à import.ts, appelé en T8`.

<a id="tache-t4"></a>

### Tâche T4 — Pré-passe des fichiers liés dans `importFiles`, boîte « Importer »

**Objectif.** DAX2 : pour un appel de plusieurs fichiers, `importFiles` donne à chaque gestionnaire qui a un hook
`companions` la liste des autres fichiers ; les fichiers qu'il réclame sortent de la boucle et lui sont passés dans
`ctx.companions` ; l'en-tête et le contenu du fichier principal, lus une fois, sont réutilisés par `run`. Les autres
fichiers gardent leur ordre et leurs messages. La boîte « Importer » offre les extensions 3D (X32).

**Fichiers.** Modifier `apps/web/src/platform/import.ts` (`ImportContext` `:68-80`, `ImportHandler` `:83-98`,
`createImporter` `:227-312`), `import.test.ts` (bloc neuf en fin), `files.ts:66-74`, `files.test.ts:65`,
`host-fsa.ts:41-52`, `host-fsa.test.ts` (bloc `IMPORT_TYPES` `:236`), `host-repli.test.ts:273`, `host-tauri.test.ts:228`
(seulement si l'attente liste les extensions).

**Interfaces.**
- Consomme : rien.
- Produit (lus par T8) :
  ```ts
  // import.ts
  export interface ImportContext { /* … champs actuels … */
    /** C15 (DAX2) : fichiers du même appel réclamés par `companions` ; [] sinon (appel d'un seul fichier, lien). */
    readonly companions: readonly DroppedFile[];
  }
  export interface ImportHandler { /* … champs actuels … */
    /** C15 (DAX2) : fichiers de `siblings` que ce fichier cite ; ils sortent de la boucle et arrivent dans `ctx.companions`.
     *  Appelé seulement pour un appel de plusieurs fichiers, après les plafonds, avec l'en-tête et le contenu déjà lus. */
    readonly companions?: (file: DroppedFile, blob: Blob, head: Uint8Array, siblings: readonly DroppedFile[]) => Promise<readonly DroppedFile[]>;
  }
  /** Importeur sur un registre donné (tests, `createImporter`). */
  export function importerOf(registry: readonly ImportHandler[], deps: ImportDeps): Importer;
  export const hasZipMagic: (head: Uint8Array) => boolean; // exporté (était local)
  // files.ts
  export const MODEL3D_EXTENSIONS = ["glb", "gltf", "obj", "mtl", "stl", "ply", "bin", "zip"] as const;
  // IMPORT_EXTENSIONS gagne ...MODEL3D_EXTENSIONS ; IMPORT_FILTER.name = "Images, vidéos, sons, 3D, PDF et documents RoomBoard"
  ```
- Réutilise : `apps/web/src/platform/import.ts:83`, `:227`, `:247` (`ImportHandler`, `createImporter`, `importFiles`) — étendus : hook `companions`, `ImportContext.companions`, pré-passe ; `createImporter(deps)` devient `importerOf(registre, deps)` sans autre changement.
- Réutilise : `apps/web/src/platform/import.ts:129` (`ZIP_MAGIC`, `hasZipMagic`) — `hasZipMagic` exporté pour T8, inchangé.

**Patron à ne pas reprendre (concepteur-critique).**
- Ne pas regrouper avant `importFiles` (dans `drop-web.ts`, `paste.ts` ou les hôtes) : U23 impose une seule chaîne
  (DAX2) ; ces fichiers ne changent pas.
- Ne pas relire un fichier déjà lu : la coque lit par morceaux (`grantedFile`), et la boucle actuelle ne lit l'en-tête
  qu'une fois (`import.ts:270-275`). La pré-passe range `head` et `blob` et la boucle les reprend.
- Ne pas changer l'ordre des messages : plafond web (`tooBig`), refus (`refused`), échecs restent dits comme avant ; un
  fichier réclamé n'apparaît dans aucune liste du rapport.

**Code.**
- `import.ts`, dans le corps actuel d'`importFiles` (déplacé tel quel dans `importerOf`), juste après
  `let stopped = false;` :
  ```ts
  // C15 (DAX2) : pré-passe des appels de plusieurs fichiers ; un fichier réclamé passe à son modèle, pas au registre.
  const prepared = new Map<DroppedFile, { readonly head: Uint8Array; readonly blob: Blob; readonly companions: readonly DroppedFile[] }>();
  const claimed = new Set<DroppedFile>();
  if (files.length > 1) {
    const fits = (o: DroppedFile): boolean => max === null || o.size <= max;
    for (const f of files) {
      if (claimed.has(f) || !fits(f) || isRoomboardName(f.name)) continue;
      let head: Uint8Array;
      try {
        head = (await f.head(HEAD_BYTES)).subarray(0, HEAD_BYTES);
      } catch {
        continue; // la boucle relit et dit l'échec
      }
      const handler = registry.find((h) => h.detect(head, f.name));
      const claim = handler?.companions;
      if (handler === undefined || claim === undefined) continue;
      if (handler.limit !== undefined && f.size > handler.limit.maxBytes) continue;
      let blob: Blob;
      try {
        blob = await f.blob();
      } catch {
        continue;
      }
      const siblings = files.filter((o) => o !== f && !claimed.has(o) && !prepared.has(o) && fits(o) && !isRoomboardName(o.name));
      let companions: readonly DroppedFile[] = [];
      try {
        companions = (await claim(f, blob, head, siblings)).filter((c) => siblings.includes(c));
      } catch {
        companions = [];
      }
      for (const c of companions) claimed.add(c);
      prepared.set(f, { head, blob, companions });
    }
  }
  ```
  Dans la boucle : première ligne `if (claimed.has(f)) continue; // C15 : fichier lié, passé à son modèle` ;
  `const pre = prepared.get(f);` ; en-tête `head = pre?.head ?? (roomboard ? EMPTY : (await f.head(HEAD_BYTES)).subarray(0, HEAD_BYTES));` ;
  contenu `blob = pre?.blob ?? (await f.blob());` ; `handler.run(f, { blob, head, at, inserted: inserted.length, target, notify: deps.notify, companions: pre?.companions ?? [] })` ;
  `link.run(f, f.path, { head, at, inserted: inserted.length, target, notify: deps.notify, companions: [] })`.
  Structure :
  ```ts
  export function createImporter(deps: ImportDeps): Importer {
    /* …construction actuelle de `media`, `readSheet`, `openPdf`, `linkMedia`… */
    return importerOf([ /* …registre actuel, inchangé… */ ], deps);
  }
  export function importerOf(registry: readonly ImportHandler[], deps: ImportDeps): Importer {
    return { async importFiles(files, at = null) { /* …corps actuel + pré-passe… */ } };
  }
  ```
  `const hasZipMagic` devient `export const hasZipMagic`. Mettre à jour le commentaire d'en-tête du fichier (« C15 (DAX2) : … »).
- `files.ts` :
  ```ts
  /** C15 (X32) : modèles 3D, leurs fichiers liés et les ZIP de modèles. */
  export const MODEL3D_EXTENSIONS = ["glb", "gltf", "obj", "mtl", "stl", "ply", "bin", "zip"] as const;
  export const IMPORT_EXTENSIONS = ["roomboard", "rbitem", "pdf", ...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS, ...MODEL3D_EXTENSIONS] as const;
  export const IMPORT_FILTER = { name: "Images, vidéos, sons, 3D, PDF et documents RoomBoard", extensions: IMPORT_EXTENSIONS } as const;
  ```
- `host-fsa.ts`, `IMPORT_TYPES[0].accept` gagne :
  ```ts
  "application/octet-stream": MODEL3D_EXTENSIONS.filter((e) => e !== "zip").map((e) => `.${e}`),
  "application/zip": [".zip"],
  ```
  (commentaire du filtre : « … et objets 3D (C15) »).

**Tests rouges à écrire** (`import.test.ts`, `describe("importFiles : fichiers liés (C15, DAX2)")`).
```ts
import { importerOf, type ImportHandler } from "./import";

/** Gestionnaire factice : reconnu par l'extension ; un « modèle » réclame les noms écrits dans son contenu. */
function fake(ext: string, log: string[], cites = false): ImportHandler {
  return {
    id: ext,
    nature: "objet",
    detect: (_h, name) => name.endsWith(`.${ext}`),
    ...(cites
      ? {
          companions: async (_f: DroppedFile, blob: Blob, _h: Uint8Array, siblings: readonly DroppedFile[]) => {
            const text = await blob.text();
            return siblings.filter((s) => text.split(" ").includes(s.name));
          },
        }
      : {}),
    async run(f, ctx) {
      log.push(`${ext}:${f.name}[${ctx.companions.map((c) => c.name).join(",")}]`);
      return "inserted";
    },
  };
}
const txt = (name: string, body: string): DroppedFile => file(name, new TextEncoder().encode(body));
const deps = () => ({ openDocument: vi.fn(async () => true), notify: vi.fn(async () => undefined) });

describe("importFiles : fichiers liés (C15, DAX2)", () => {
  it("image citée réclamée, image non citée importée (HX2-6)", async () => {
    const log: string[] = [];
    const d = deps();
    const r = await importerOf([fake("fmod", log, true), fake("png", log)], d).importFiles([txt("a.png", "x"), txt("m.fmod", "a.png"), txt("b.png", "y")]);
    expect(log).toEqual(["fmod:m.fmod[a.png]", "png:b.png[]"]);
    expect(r).toEqual({ opened: [], inserted: ["m.fmod", "b.png"], refused: [], failed: [] });
  });

  it("appel mixte image, PDF, modèle : ordre et messages inchangés", async () => {
    const log: string[] = [];
    const d = deps();
    const files = [txt("a.png", "x"), txt("doc.pdf", "%PDF-1.7"), txt("m.fmod", "rien"), txt("notes.xyz", "?")];
    const r = await importerOf([fake("png", log), fake("pdf", log), fake("fmod", log, true)], d).importFiles(files);
    expect(log).toEqual(["png:a.png[]", "pdf:doc.pdf[]", "fmod:m.fmod[]"]);
    expect(r.refused).toEqual(["notes.xyz"]);
    expect(d.notify.mock.calls.map((c) => c[0])).toEqual([`notes.xyz : ${LATER_FORMAT_MESSAGE}`]);
  });

  it("fichier seul : companions jamais appelé, ctx.companions vide", async () => {
    const log: string[] = [];
    const h = fake("fmod", log, true);
    const spy = vi.spyOn(h, "companions" as never);
    await importerOf([h], deps()).importFiles([txt("m.fmod", "a.png")]);
    expect([log, spy.mock.calls.length]).toEqual([["fmod:m.fmod[]"], 0]);
  });

  it("companions lève : rien de réclamé, le modèle et les autres importés", async () => {
    const log: string[] = [];
    const h: ImportHandler = { ...fake("fmod", log), companions: async () => { throw new Error("x"); } };
    await importerOf([h, fake("png", log)], deps()).importFiles([txt("m.fmod", "a.png"), txt("a.png", "x")]);
    expect(log).toEqual(["fmod:m.fmod[]", "png:a.png[]"]);
  });

  it("fichier au-delà du plafond web jamais offert ; refusé comme avant", async () => {
    const log: string[] = [];
    const big: DroppedFile = { ...txt("a.png", "x"), size: WEB_MAX_BYTES + 1 };
    const d = deps();
    const r = await importerOf([fake("fmod", log, true), fake("png", log)], { ...d, maxBytes: WEB_MAX_BYTES }).importFiles([txt("m.fmod", "a.png"), big]);
    expect(log).toEqual(["fmod:m.fmod[]"]);
    expect(r.refused).toEqual(["a.png"]);
  });

  it("deux modèles : un fichier réclamé par le premier n'est pas offert au second", async () => {
    const log: string[] = [];
    await importerOf([fake("fmod", log, true), fake("png", log)], deps()).importFiles([txt("m1.fmod", "a.png"), txt("m2.fmod", "a.png"), txt("a.png", "x")]);
    expect(log).toEqual(["fmod:m1.fmod[a.png]", "fmod:m2.fmod[]"]);
  });

  it("en-tête et contenu du modèle lus une seule fois ; un .roomboard jamais lu par la pré-passe", async () => {
    const heads: string[] = [];
    const blobs: string[] = [];
    const counted = (f: DroppedFile): DroppedFile => ({
      ...f,
      head: async (n) => { heads.push(f.name); return f.head(n); },
      blob: async () => { blobs.push(f.name); return f.blob(); },
    });
    const log: string[] = [];
    const d = deps();
    await importerOf([fake("fmod", log, true)], d).importFiles([counted(txt("m.fmod", "x")), counted(txt("c.roomboard", "x"))]);
    expect([heads.filter((n) => n === "m.fmod").length, blobs.filter((n) => n === "m.fmod").length]).toEqual([1, 1]);
    expect(heads.includes("c.roomboard")).toBe(false);
  });
});
```
(`file`, `LATER_FORMAT_MESSAGE`, `WEB_MAX_BYTES`, `vi` viennent des imports existants du fichier ; si le `.roomboard` de
la dernière ligne déclenche `openDocument`, c'est le comportement attendu.)
`files.test.ts:65` : attente du libellé `"Images, vidéos, sons, 3D, PDF et documents RoomBoard"` et des huit extensions
3D en fin de liste. `host-fsa.test.ts` (bloc `IMPORT_TYPES`) : nouveau cas « objets 3D : .glb … .bin en
application/octet-stream, .zip en application/zip (C15, X32) ». `host-repli.test.ts:273` : ajouter
`expect(IMPORT_ACCEPT).toContain(".glb"); expect(IMPORT_ACCEPT).toContain(".zip");`.

**Test et commande bornée.**
```bash
cd "$WT" && pnpm --filter @roomboard/web exec vitest run src/platform/import.test.ts src/platform/files.test.ts src/platform/host-fsa.test.ts src/platform/host-repli.test.ts src/platform/host-tauri.test.ts src/platform/image-import.test.ts src/platform/media-import.test.ts src/platform/paste.test.ts src/platform/drop-web.test.ts --reporter=verbose 2>&1 | grep -E "C15|×|FAIL|Test Files|Tests " | tail -40
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"
```
Attendu : 0 `×` ; « importFiles : fichiers liés (C15, DAX2) » ≥ 7 tests verts, dont « image citée réclamée, image non
citée importée (HX2-6) » et « appel mixte image, PDF, modèle : ordre et messages inchangés » ; tous les tests existants
d'`import.test.ts`, `image-import`, `media-import`, `paste`, `drop-web` verts ; `tsc` vide.

**Contraintes (recopiées).**
- GC1 TDD : test rouge d'abord, vu rouge ; aucun test sauté ni désactivé, aucun seuil baissé ; délai : rejoué une fois, jamais relevé.
- GC2 `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; aucun build Tauri.
- GC3 Préparation : `cd "$WT" && pnpm install --frozen-lockfile` ; wasm : `mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c15-3d/apps/web/src/wasm/* apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c15-3d/apps/web/src/wasm-formats/* apps/web/src/wasm-formats/`.
- GC5 Module `formats` intouché. GC7 Aucune dépendance neuve. GC8 Vitest borné ; `tsc` vide.
- GC9 Commits : `git add <chemin>` un par un ; jamais `git add -A`/`--all`/`.`, `git commit -a`, `--force`, `git stash` nu ; auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, sans pousser.
- GC14 Aucun processus laissé. GC15 Seuls les fichiers de la tâche ; dans `import.ts`, la pré-passe et le hook seulement (aucun gestionnaire 3D : T8).
- GC16 Deux lignes `Réutilisation :` et noms des tests au rapport.

**Interdits.** Ne pas toucher `drop-web.ts`, `paste.ts`, `image-import.ts`, `media-import.ts`, ni l'ordre du registre ;
aucun gestionnaire 3D dans cette tâche.

**Critère « terminé ».** Commande bornée verte ; existant vert ; `tsc` vide ; deux commits.

**Étapes.**
- [ ] 1. Tests rouges (`import.test.ts` bloc C15, `files.test.ts`, `host-fsa.test.ts`, `host-repli.test.ts`) ; lancer :
  `importerOf` absent, libellé faux (rouge).
- [ ] 2. `import.ts` : `importerOf`, hook, `ImportContext.companions`, pré-passe, `hasZipMagic` exporté ; vert ; commit
  `feat(import): group linked files of one drop before the registry (DAX2)`.
- [ ] 3. `files.ts`, `host-fsa.ts` ; vert ; commit `feat(files): offer 3D models and ZIP in Import`.
- [ ] 4. Rapport.

<a id="tache-t5"></a>

### Tâche T5 — Caméra et port `ModelFrames`, outil d'orbite, `engine.orbitModel`, types `ModelView`

**Objectif.** Poser les contrats que la vague 2 consomme : la caméra d'orbite et ses bornes (X4), le port `ModelFrames`
par lequel le Canvas 2D obtient l'image du rendu partagé (X25), l'outil d'orbite (X21 : 0,01 rad par px CSS, pas
d'`OrbitControls`), la séance modale du moteur (X23, patron `editImage`), et les types du rendu partagé avec son
chargement à la demande mémorisé (DAX3, X20).

**Fichiers.** Créer `apps/web/src/engine/render/model-frames.ts` (+ `.test.ts`), `apps/web/src/engine/tools/model-orbit.ts`
(+ `.test.ts`), `apps/web/src/platform/model-view.ts` (+ `.test.ts`). Modifier `apps/web/src/engine/engine.ts`
(interface `Engine` près d'`editImage` `:132`, état `:253`, `switchTo` `:339`, arrêt de la boucle `:482`, `sink.begin`
`:497`, touches `:583-600`, `editImage` `:695`, `dispose` `:771`), `engine.test.ts` (bloc en fin),
`apps/web/src/engine/render/canvas2d.ts:28-46` (une option, aucun dessin : T9).

**Interfaces.**
- Consomme : rien.
- Produit (lus par T7, T8, T9, T10) :
  ```ts
  // engine/render/model-frames.ts
  export interface ModelCamera { readonly yaw: number; readonly pitch: number }
  export const DEFAULT_CAMERA: ModelCamera;          // { yaw: π/6, pitch: π/9 } (T9 : reprises d'api.ts)
  export const PITCH_LIMIT: number;                  // 85° en rad
  export const ORBIT_RAD_PER_PX = 0.01;
  export function clampCamera(v: ModelCamera): ModelCamera;   // pitch borné, yaw ramené dans ]−π, π], non fini → défaut
  export const degrees: (r: number) => number;       // degrés entiers (oracle X36)
  export interface ModelFrames { frame(elementId: string): CanvasImageSource | null }
  // engine/tools/model-orbit.ts
  export interface ModelOrbitDeps { readonly id: string; readonly view: ModelCamera; onView(v: ModelCamera): void; onCommit(v: ModelCamera): void; closed(): void }
  export interface ModelOrbit { readonly id: string; view(): ModelCamera; reset(): void; close(): void }
  export interface ModelOrbitSession extends ModelOrbit { readonly gesture: GestureTool }
  export function createModelOrbit(deps: ModelOrbitDeps): ModelOrbitSession;
  // engine/engine.ts
  export type OrbitOptions = { readonly view: ModelCamera; onView(v: ModelCamera): void; onCommit(v: ModelCamera): void; closed?(): void };
  // Engine gagne : orbitModel(id: string, opts: OrbitOptions): ModelOrbit | null;
  // canvas2d.ts : Canvas2DOptions gagne `readonly models?: ModelFrames;`
  // platform/model-view.ts
  export type Model3dFormat = "glb" | "gltf" | "obj" | "stl" | "ply"; // alias provisoire, remplacé en T7 (PC1)
  export interface ModelSource { readonly format: Model3dFormat; readonly name: string; readonly main: Blob; readonly files: ReadonlyMap<string, Blob> }
  export interface LoadedModel { readonly missing: readonly string[] }
  export interface PixelSize { readonly w: number; readonly h: number }
  export interface ModelView {
    available(): boolean;
    load(src: ModelSource): Promise<LoadedModel>;
    draw(m: LoadedModel, v: ModelCamera, px: PixelSize): CanvasImageSource | null;
    snapshot(m: LoadedModel, v: ModelCamera, px: PixelSize): Promise<Blob | null>;
    release(m: LoadedModel): void;
    onLost(cb: () => void): () => void;
  }
  export interface ModelViewLoader { load(): Promise<ModelView>; peek(): ModelView | null }
  export const SNAPSHOT_LONG_SIDE = 1024; export const MAX_DRAW_SIDE = 2048;
  export function snapshotSize(w: number, h: number): PixelSize;
  export function drawSize(cssW: number, cssH: number, dpr: number): PixelSize;
  export function createModelViewLoader(load: () => Promise<ModelView>): ModelViewLoader;
  ```
- Réutilise : `apps/web/src/engine/engine.ts:132`, `:497`, `:695` (`editImage`, séance + `gesture: GestureTool`) — étendu par `orbitModel(id, opts): ModelOrbit | null`, même routage des gestes, une seule séance modale à la fois.
- Réutilise : `apps/web/src/engine/render/media-frames.ts:7` (`MediaFrames`, port par les options) — patron du port `ModelFrames` et de l'option `models` de `canvas2d.ts:39`.
- Réutilise : `apps/web/src/platform/pdf-load.ts:37` (`import()` au premier besoin) — patron de `createModelViewLoader` (mémorisé, reprise après échec).
- Réutilise : aucun module existant pour le geste d'orbite (cadrage : « aucun ») — nouveau module `engine/tools/model-orbit.ts` (`createModelOrbit`), sans `OrbitControls`.

**Code.**
```ts
// engine/render/model-frames.ts
/**
 * Caméra d'orbite et image du rendu 3D partagé (C15, X4, X21, X25, DAX3) : le moteur ne voit jamais three ; il demande
 * l'image d'un élément `model3d` au port et retombe sur l'instantané quand il n'y en a pas.
 */
export interface ModelCamera {
  readonly yaw: number;
  readonly pitch: number;
}
/** Mêmes valeurs que le cœur (X4, `model3d.rs`) ; T9 les reprend d'`api.ts` (PC1). */
export const DEFAULT_CAMERA: ModelCamera = Object.freeze({ yaw: Math.PI / 6, pitch: Math.PI / 9 });
export const PITCH_LIMIT = (85 * Math.PI) / 180;
/** X21 : sensibilité, en radians par px CSS. */
export const ORBIT_RAD_PER_PX = 0.01;
const TAU = 2 * Math.PI;

/** `pitch` borné à ±85°, `yaw` ramené dans ]−π, π] seulement s'il en sort (une vue valide reste à l'octet). */
export function clampCamera(v: ModelCamera): ModelCamera {
  if (!Number.isFinite(v.yaw) || !Number.isFinite(v.pitch)) return DEFAULT_CAMERA;
  let yaw = v.yaw;
  if (yaw <= -Math.PI || yaw > Math.PI) {
    yaw = ((((yaw + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
    if (yaw <= -Math.PI) yaw = Math.PI;
  }
  return { yaw, pitch: Math.min(PITCH_LIMIT, Math.max(-PITCH_LIMIT, v.pitch)) };
}

/** Degrés entiers (oracle `data-model3d`, X36). */
export const degrees = (r: number): number => Math.round((r * 180) / Math.PI);

export interface ModelFrames {
  /** Image du rendu partagé pour l'élément (séance ouverte, rendu prêt) ; null : instantané (X25). */
  frame(elementId: string): CanvasImageSource | null;
}
```
```ts
// engine/tools/model-orbit.ts
/**
 * Séance d'orbite d'un objet 3D (C15, X21, X23) : tant qu'elle est ouverte, le moteur lui passe les gestes de la scène
 * (l'outil publié reste `select`). Un glisser tourne la caméra ; le relâché valide (`onCommit`, une écriture côté
 * session) ; un abandon rend la vue d'avant le geste. Rien n'est écrit ici (PC2).
 */
import type { CloseReason } from "../input/gesture";
import type { InputSample } from "../input/sampler";
import { clampCamera, DEFAULT_CAMERA, ORBIT_RAD_PER_PX, type ModelCamera } from "../render/model-frames";
import { NO_LIVE, type GestureTool } from "./tool";

export interface ModelOrbitDeps {
  readonly id: string;
  /** Vue de départ : celle de l'élément. */
  readonly view: ModelCamera;
  /** Vue pendant le geste (aperçu, rien d'écrit). */
  onView(v: ModelCamera): void;
  /** Vue validée (relâché, « Vue initiale ») : la session écrit `SetModel3dView`. */
  onCommit(v: ModelCamera): void;
  /** Séance fermée : le moteur l'oublie. */
  closed(): void;
}

export interface ModelOrbit {
  readonly id: string;
  view(): ModelCamera;
  /** « Vue initiale » : vue par défaut, validée si elle diffère. */
  reset(): void;
  close(): void;
}

export interface ModelOrbitSession extends ModelOrbit {
  readonly gesture: GestureTool;
}

const same = (a: ModelCamera, b: ModelCamera): boolean => a.yaw === b.yaw && a.pitch === b.pitch;

export function createModelOrbit(deps: ModelOrbitDeps): ModelOrbitSession {
  let view = deps.view;
  let before = view;
  let pointer: number | null = null;
  let last: InputSample | null = null;
  let open = true;
  const gesture: GestureTool = {
    begin(id, samples) {
      if (!open || pointer !== null) return;
      pointer = id;
      before = view;
      last = samples[samples.length - 1] ?? null;
    },
    extend(id, samples) {
      if (id !== pointer) return;
      for (const s of samples) {
        if (last !== null) {
          view = clampCamera({ yaw: view.yaw + (s.x - last.x) * ORBIT_RAD_PER_PX, pitch: view.pitch + (s.y - last.y) * ORBIT_RAD_PER_PX });
        }
        last = s;
      }
      deps.onView(view);
    },
    frame() {},
    close(id, how: CloseReason) {
      if (id !== pointer) return;
      pointer = null;
      last = null;
      if (how === "end") {
        if (!same(view, before)) deps.onCommit(view);
      } else {
        view = before;
        deps.onView(view);
      }
    },
    live: () => NO_LIVE,
    active: () => pointer !== null,
  };
  return {
    id: deps.id,
    gesture,
    view: () => view,
    reset() {
      if (!open) return;
      const was = view;
      view = DEFAULT_CAMERA;
      deps.onView(view);
      if (!same(was, view)) deps.onCommit(view);
    },
    close() {
      if (!open) return;
      open = false;
      if (pointer !== null) {
        pointer = null;
        view = before;
      }
      deps.closed();
    },
  };
}
```
`engine.ts` (ajouts localisés) :
```ts
import { createModelOrbit, type ModelOrbit, type ModelOrbitSession } from "./tools/model-orbit";
import type { ModelCamera } from "./render/model-frames";

export interface OrbitOptions {
  readonly view: ModelCamera;
  onView(v: ModelCamera): void;
  onCommit(v: ModelCamera): void;
  closed?(): void;
}
// interface Engine, après editImage :
  /** C15 (X23, PC2) : séance d'orbite de l'élément `id` de la page montrée (une seule séance modale : ferme la retouche
   *  d'image et une orbite ouverte) ; null s'il n'est pas sur la page. La session vérifie que c'est un objet 3D. */
  orbitModel(id: string, opts: OrbitOptions): ModelOrbit | null;
// état, voisin de `let imageEdit` :
  let orbit: ModelOrbitSession | null = null;
// switchTo, après `imageEdit?.close();` : `orbit?.close();`
// arrêt de la boucle (:482) : `if (!toolList.some((t) => t.active()) && imageEdit?.gesture.active() !== true && orbit?.gesture.active() !== true) loop.stop();`
// sink.begin :
  const g = imageEdit !== null && imageEdit.mode() !== "idle" ? imageEdit.gesture : orbit !== null ? orbit.gesture : tools[t];
// touches, juste après le bloc `if (imageEdit !== null && imageEdit.mode() !== "idle") { … }` :
  if (orbit !== null && edit === "escape") {
    orbit.close();
    return true;
  }
// editImage, première ligne après le contrôle : `orbit?.close();`
// méthode :
    orbitModel(id, opts) {
      if (!doc.elementIds(pageId).includes(id)) return null;
      imageEdit?.close();
      orbit?.close();
      const session = createModelOrbit({
        id,
        view: opts.view,
        onView: (v) => {
          opts.onView(v);
          requestScene();
        },
        onCommit: (v) => opts.onCommit(v),
        closed: () => {
          if (orbit === session) orbit = null;
          opts.closed?.();
          requestScene();
        },
      });
      orbit = session;
      return session;
    },
// dispose, après `imageEdit?.close();` : `orbit?.close();`
```
(Si `requestScene` porte un autre nom dans le fichier, prendre la fonction qu'appelle `previewGrid` `:686`.)
`canvas2d.ts`, dans `Canvas2DOptions` après `media` :
```ts
  /** C15 (X25) : image du rendu 3D partagé, par élément ; absent (export PDF, vignette) : instantané. */
  readonly models?: ModelFrames;
```
avec `import type { ModelFrames } from "./model-frames";`.
```ts
// platform/model-view.ts
/**
 * Rendu 3D vu de la page (C15, DAX3) : types du rendu partagé et son chargement à la demande. Le morceau `three`
 * (`model-view-three.ts`, T7) n'est jamais importé ici : l'amorce passe `() => import(…)` à `createModelViewLoader` (X20).
 */
import type { ModelCamera } from "../engine/render/model-frames";

/** Alias provisoire, identique à `Model3dFormat` d'`api.ts` ; T7 le remplace par l'import (PC1). */
export type Model3dFormat = "glb" | "gltf" | "obj" | "stl" | "ply";

export interface ModelSource {
  readonly format: Model3dFormat;
  readonly name: string;
  readonly main: Blob;
  /** `files[].path` → contenu (X3) ; la garde d'URL n'ouvre que ceux-là (X27). */
  readonly files: ReadonlyMap<string, Blob>;
}

/** Modèle chargé dans le rendu partagé ; `missing` : références demandées par three sans fichier connu (X27). */
export interface LoadedModel {
  readonly missing: readonly string[];
}

export interface PixelSize {
  readonly w: number;
  readonly h: number;
}

export interface ModelView {
  /** Faux sans WebGL ou après la perte du contexte (X26). */
  available(): boolean;
  /** Lit le modèle (aussi sans WebGL : validation) ; rejette si illisible. */
  load(src: ModelSource): Promise<LoadedModel>;
  /** Image du modèle à cette vue (le canvas partagé) ; null sans WebGL. */
  draw(m: LoadedModel, v: ModelCamera, px: PixelSize): CanvasImageSource | null;
  /** PNG RVBA à fond transparent ; null sans WebGL. */
  snapshot(m: LoadedModel, v: ModelCamera, px: PixelSize): Promise<Blob | null>;
  release(m: LoadedModel): void;
  /** Contexte perdu (`webglcontextlost`) ; rend le désabonnement. */
  onLost(cb: () => void): () => void;
}

export interface ModelViewLoader {
  /** Charge le rendu une fois (morceau `three`) ; un échec est rejoué au prochain appel. */
  load(): Promise<ModelView>;
  /** Rendu déjà chargé, sans rien charger ; null avant le premier `load` réussi (PC3). */
  peek(): ModelView | null;
}

/** X5 : 1 024 px sur le grand côté. X22 : 2 048 px au plus à l'écran. */
export const SNAPSHOT_LONG_SIDE = 1024;
export const MAX_DRAW_SIDE = 2048;

/** Taille de l'instantané au ratio de la boîte (X5) ; boîte non finie : 1 024 × 768. */
export function snapshotSize(w: number, h: number): PixelSize {
  if (!(w > 0 && h > 0 && Number.isFinite(w) && Number.isFinite(h))) return { w: SNAPSHOT_LONG_SIDE, h: 768 };
  return w >= h
    ? { w: SNAPSHOT_LONG_SIDE, h: Math.max(1, Math.round((SNAPSHOT_LONG_SIDE * h) / w)) }
    : { w: Math.max(1, Math.round((SNAPSHOT_LONG_SIDE * w) / h)), h: SNAPSHOT_LONG_SIDE };
}

/** Taille du rendu à l'écran (X22) : boîte en px CSS × `devicePixelRatio`, 2 048 px au plus sur le grand côté. */
export function drawSize(cssW: number, cssH: number, dpr: number): PixelSize {
  const r = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  let w = Math.max(1, Math.round(cssW * r));
  let h = Math.max(1, Math.round(cssH * r));
  const side = Math.max(w, h);
  if (side > MAX_DRAW_SIDE) {
    w = Math.max(1, Math.round((w * MAX_DRAW_SIDE) / side));
    h = Math.max(1, Math.round((h * MAX_DRAW_SIDE) / side));
  }
  return { w, h };
}

export function createModelViewLoader(load: () => Promise<ModelView>): ModelViewLoader {
  let view: ModelView | null = null;
  let pending: Promise<ModelView> | null = null;
  return {
    load() {
      if (view !== null) return Promise.resolve(view);
      pending ??= load().then(
        (v) => {
          view = v;
          return v;
        },
        (e: unknown) => {
          pending = null;
          throw e;
        },
      );
      return pending;
    },
    peek: () => view,
  };
}
```

**Tests rouges à écrire.**
```ts
// model-frames.test.ts
describe("caméra d'orbite (C15, X4)", () => {
  it("clampCamera : pitch à ±85°, yaw ramené dans ]−π, π], vue valide à l'octet, non fini → défaut", () => {
    expect(clampCamera({ yaw: 0.3, pitch: 2 })).toEqual({ yaw: 0.3, pitch: PITCH_LIMIT });
    expect(clampCamera({ yaw: Math.PI / 6, pitch: Math.PI / 9 })).toEqual(DEFAULT_CAMERA);
    expect(clampCamera({ yaw: -Math.PI, pitch: 0 }).yaw).toBeCloseTo(Math.PI, 12);
    expect(clampCamera({ yaw: 3 * Math.PI + 0.5, pitch: 0 }).yaw).toBeCloseTo(-Math.PI + 0.5, 12);
    expect(clampCamera({ yaw: Number.NaN, pitch: 0 })).toEqual(DEFAULT_CAMERA);
  });
  it("degrees : entiers ; défauts 30° et 20°", () => {
    expect([degrees(DEFAULT_CAMERA.yaw), degrees(DEFAULT_CAMERA.pitch), degrees(Math.PI / 6 + 1)]).toEqual([30, 20, 87]);
  });
});
// model-orbit.test.ts
const s = (x: number, y = 0): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });
function orbit(view = DEFAULT_CAMERA) {
  const views: ModelCamera[] = [];
  const commits: ModelCamera[] = [];
  const closed = vi.fn();
  const o = createModelOrbit({ id: "m", view, onView: (v) => views.push(v), onCommit: (v) => commits.push(v), closed });
  return { o, views, commits, closed };
}
describe("orbite (C15, X21)", () => {
  it("glisser de 100 px vers la droite : yaw + 1 rad (≈ 57°), une validation au relâché (S2)", () => {
    const { o, commits } = orbit();
    o.gesture.begin(1, [s(10)]);
    o.gesture.extend(1, [s(60), s(110)], []);
    expect(o.view().yaw).toBeCloseTo(Math.PI / 6 + 1, 12);
    o.gesture.close(1, "end");
    expect(commits).toHaveLength(1);
    expect(degrees(commits[0]!.yaw) - degrees(DEFAULT_CAMERA.yaw)).toBe(57);
  });
  it("vers le bas : pitch borné à 85°", () => {
    const { o } = orbit();
    o.gesture.begin(1, [s(0, 0)]);
    o.gesture.extend(1, [s(0, 500)], []);
    expect(o.view().pitch).toBe(PITCH_LIMIT);
  });
  it("relâché sans mouvement : aucune validation", () => {
    const { o, commits } = orbit();
    o.gesture.begin(1, [s(5)]);
    o.gesture.close(1, "end");
    expect(commits).toEqual([]);
  });
  it("abandon (cancel, abort) : vue d'avant le geste rendue, rien de validé", () => {
    const { o, views, commits } = orbit();
    o.gesture.begin(1, [s(0)]);
    o.gesture.extend(1, [s(50)], []);
    o.gesture.close(1, "cancel");
    expect([o.view(), views.at(-1), commits]).toEqual([DEFAULT_CAMERA, DEFAULT_CAMERA, []]);
  });
  it("second pointeur ignoré pendant un geste ; active() suit le pointeur", () => {
    const { o } = orbit();
    o.gesture.begin(1, [s(0)]);
    o.gesture.begin(2, [s(0)]);
    o.gesture.extend(2, [s(90)], []);
    expect([o.gesture.active(), o.view()]).toEqual([true, DEFAULT_CAMERA]);
    o.gesture.close(1, "end");
    expect(o.gesture.active()).toBe(false);
  });
  it("reset : vue par défaut validée si elle diffère ; close : une fois, puis plus rien", () => {
    const { o, commits, closed } = orbit({ yaw: 1, pitch: 0.2 });
    o.reset();
    expect(commits).toEqual([DEFAULT_CAMERA]);
    o.reset();
    expect(commits).toHaveLength(1);
    o.close();
    o.close();
    o.gesture.begin(1, [s(0)]);
    expect([closed.mock.calls.length, o.gesture.active()]).toEqual([1, false]);
  });
});
// engine.test.ts, describe("moteur : séance d'orbite (C15, X23)") — aide `setup()` du fichier, `rect` comme `:1399`
//  - « orbitModel : null pour un id absent de la page »
//  - « les gestes vont à la séance, pas à l'outil ; onView puis onCommit au relâché ; une scène redemandée »
//    (begin(1, "pen", [ {…sample, x: 10} ]), extend(1, [ {…sample, x: 60} ], []), close(1, "end") : `log` sans « pen.begin »,
//    onView reçu, onCommit reçu avec yaw = π/6 + 0,5)
//  - « Échap ferme la séance : closed appelé, le geste suivant va à l'outil » (engine.key(key("Escape")) rend true)
//  - « changer de page ferme la séance » (engine.addPage() puis la page montrée change : closed appelé)
//  - « une seconde séance ferme la première ; dispose ferme la séance ouverte »
// model-view.test.ts, describe("model-view (C15, DAX3)")
//  - « createModelViewLoader : un seul chargement pour deux appels simultanés ; peek null puis la vue »
//  - « createModelViewLoader : échec rejoué au prochain appel » (load rejette puis résout : 2 appels, peek = vue)
//  - « snapshotSize : 640 × 480 → 1024 × 768 ; 300 × 600 → 512 × 1024 ; boîte nulle → 1024 × 768 »
//  - « drawSize : 640 × 480 à dpr 2 → 1280 × 960 ; 1600 × 400 à dpr 2 → 2048 × 512 ; dpr NaN → 1 »
```
(Les tests du moteur reprennent les aides du fichier — `setup`, `sample`, `key`, `rect` — et le nom de la méthode
d'ajout de page qu'emploient les tests existants de changement de page.)

**Test et commande bornée.**
```bash
cd "$WT" && pnpm --filter @roomboard/web exec vitest run src/engine/render/model-frames.test.ts src/engine/tools/model-orbit.test.ts src/engine/engine.test.ts src/engine/tools/image-edit.test.ts src/engine/tools/select.test.ts src/engine/render/canvas2d.test.ts src/platform/model-view.test.ts --reporter=verbose 2>&1 | grep -E "C15|×|FAIL|Test Files|Tests " | tail -50
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"
```
Attendu : 0 `×` ; « orbite (C15, X21) » 6 tests, « moteur : séance d'orbite (C15, X23) » ≥ 5, « model-view (C15,
DAX3) » ≥ 4, « caméra d'orbite (C15, X4) » 2 ; `engine.test.ts`, `image-edit.test.ts`, `select.test.ts`,
`canvas2d.test.ts` existants verts ; `tsc` vide.

**Contraintes (recopiées).**
- GC1 TDD : test rouge d'abord, vu rouge ; aucun test sauté ni désactivé, aucun seuil baissé ; délai : rejoué une fois, jamais relevé.
- GC2 `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; aucun build Tauri.
- GC3 Préparation : `cd "$WT" && pnpm install --frozen-lockfile` ; wasm : `mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c15-3d/apps/web/src/wasm/* apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c15-3d/apps/web/src/wasm-formats/* apps/web/src/wasm-formats/`.
- GC5 Module `formats` intouché. GC7 Aucune dépendance neuve. GC8 Vitest borné ; `tsc` vide.
- GC9 Commits : `git add <chemin>` un par un ; jamais `git add -A`/`--all`/`.`, `git commit -a`, `--force`, `git stash` nu ; auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, sans pousser.
- GC11 `EngineState`, `stage-tags.ts`, `toolbar-host.ts` non touchés (l'outil publié reste `select`).
- GC14 Aucun processus laissé. GC15 `engine.ts`, `canvas2d.ts` : ajouts localisés, aucune réorganisation.
- GC16 Quatre lignes `Réutilisation :` et noms des tests au rapport.
- GC17 `model-view.ts` n'importe jamais `model-view-three.ts` ni `three`.

**Interdits.** Aucun `OrbitControls` ; aucun dessin dans `canvas2d.ts` (T9) ; aucune lecture de l'élément ni commande
`SetModel3dView` dans le moteur (PC2) ; aucun import de `core/api` pour la 3D dans cette tâche (T2 est parallèle).

**Critère « terminé ».** Commande bornée verte, `tsc` vide, trois commits.

**Étapes.**
- [ ] 1. `model-frames.test.ts`, `model-orbit.test.ts` rouges ; `model-frames.ts`, `model-orbit.ts` ; verts ; commit
  `feat(engine): orbit camera, ModelFrames port and orbit tool`.
- [ ] 2. Bloc « moteur : séance d'orbite » rouge ; `engine.ts`, option `models` de `canvas2d.ts` ; verts avec les tests
  existants ; commit `feat(engine): modal orbit session routed like image editing`.
- [ ] 3. `model-view.test.ts` rouge ; `model-view.ts` ; vert ; commit `feat(platform): shared 3D view contract and lazy loader`.
- [ ] 4. Rapport.

<a id="tache-t6"></a>

### Tâche T6 — Barre flottante 3D (`Model3dBar`)

**Objectif.** La barre d'un objet 3D seul sélectionné (X24) : « Tourner » (bascule `aria-pressed`), « Vue initiale »,
état « Chargement… », message (sans WebGL, lecture impossible). Posée dans l'enveloppe `.rb-popover .rb-media-bar`
par `App` (T10) : aucune rangée permanente, scène ≥ 640 px.

**Fichiers.** Créer `apps/web/src/ui/Model3dBar.tsx`, `apps/web/src/ui/Model3dBar.test.tsx`.

**Interfaces.**
- Consomme : rien.
- Produit (lu par T10) :
  ```ts
  export type Model3dBarStatus = "instantane" | "chargement" | "orbite" | "sans-webgl" | "echec";
  export interface Model3dControls { status(): Model3dBarStatus; message(): string | null; toggle(): void; reset(): void }
  export interface Model3dBarProps { readonly name: string; readonly controls: Model3dControls }
  export const LOADING_LABEL = "Chargement…";
  export function Model3dBar(props: Model3dBarProps): JSX.Element;
  ```
- Réutilise : `apps/web/src/ui/MediaBar.tsx` et `apps/web/src/ui/rb.css:97-100` (enveloppe `.rb-popover .rb-media-bar`, `.rb-media-bar-inner`, bouton `aria-pressed`) — classes et rafraîchissement par tic réutilisés ; composant neuf (contenu propre), `rb.css` non touché.

**Code.**
```tsx
/**
 * Barre flottante d'un objet 3D (C15, X24, DAM5 de C14) : posée sur la scène (l'enveloppe d'App porte
 * `.rb-popover .rb-media-bar`), jamais une rangée permanente. « Tourner » (bascule), « Vue initiale », état et message.
 * L'état vient des `controls`, relu à chaque tic de rafraîchissement (comme `MediaBar`).
 */
import { createSignal, onCleanup, Show, type JSX } from "solid-js";

export type Model3dBarStatus = "instantane" | "chargement" | "orbite" | "sans-webgl" | "echec";

export interface Model3dControls {
  status(): Model3dBarStatus;
  /** Message à montrer (« 3D indisponible sur ce poste… », lecture impossible) ; null : aucun. */
  message(): string | null;
  toggle(): void;
  reset(): void;
}

export interface Model3dBarProps {
  readonly name: string;
  readonly controls: Model3dControls;
}

export const LOADING_LABEL = "Chargement…";
const REFRESH_MS = 250;

export function Model3dBar(props: Model3dBarProps): JSX.Element {
  const [tick, setTick] = createSignal(0);
  const timer = setInterval(() => setTick((n) => n + 1), REFRESH_MS);
  onCleanup(() => clearInterval(timer));
  const status = (): Model3dBarStatus => (tick(), props.controls.status());
  const message = (): string | null => (tick(), props.controls.message());
  const blocked = (): boolean => status() === "sans-webgl" || status() === "echec" || status() === "chargement";
  return (
    <div role="group" aria-label="Commandes de l'objet 3D" data-model3d-bar>
      <div class="rb-media-bar-inner">
        <span data-model3d="name">{props.name}</span>
        <button type="button" data-model3d="orbit" aria-pressed={status() === "orbite"} disabled={blocked()} onClick={() => props.controls.toggle()}>
          Tourner
        </button>
        <button type="button" data-model3d="reset" disabled={blocked()} onClick={() => props.controls.reset()}>
          Vue initiale
        </button>
        <Show when={status() === "chargement"}>
          <span data-model3d="status" role="status">
            {LOADING_LABEL}
          </span>
        </Show>
        <Show when={message()}>
          {(m) => (
            <span data-model3d="message" role="status">
              {m()}
            </span>
          )}
        </Show>
      </div>
    </div>
  );
}
```

**Tests rouges à écrire** (`Model3dBar.test.tsx`, patron `MediaBar.test.tsx:1-25`).
```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LOADING_LABEL, Model3dBar, type Model3dBarStatus } from "./Model3dBar";

afterEach(cleanup);

function setup(status: Model3dBarStatus = "instantane", message: string | null = null) {
  const toggle = vi.fn();
  const reset = vi.fn();
  const r = render(() => <Model3dBar name="cube.glb" controls={{ status: () => status, message: () => message, toggle, reset }} />);
  const q = <T extends Element>(k: string): T | null => r.container.querySelector<T>(`[data-model3d="${k}"]`);
  return { ...r, toggle, reset, q };
}

describe("Model3dBar (C15, X24)", () => {
  it("rôle et libellé ; nom ; Tourner et Vue initiale, libellés en toutes lettres", () => {
    const a = setup();
    const root = a.container.querySelector("[data-model3d-bar]")!;
    expect([root.getAttribute("role"), root.getAttribute("aria-label")]).toEqual(["group", "Commandes de l'objet 3D"]);
    expect([a.q("name")!.textContent, a.q("orbit")!.textContent, a.q("reset")!.textContent]).toEqual(["cube.glb", "Tourner", "Vue initiale"]);
  });
  it("Tourner : aria-pressed vrai en orbite, faux sinon ; un clic = un toggle", () => {
    const a = setup("orbite");
    expect(a.q("orbit")!.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(a.q("orbit")!);
    expect(a.toggle).toHaveBeenCalledTimes(1);
    cleanup();
    expect(setup("instantane").q("orbit")!.getAttribute("aria-pressed")).toBe("false");
  });
  it("Vue initiale : un clic = un reset", () => {
    const a = setup();
    fireEvent.click(a.q("reset")!);
    expect(a.reset).toHaveBeenCalledTimes(1);
  });
  it("sans WebGL : Tourner et Vue initiale grisés, message affiché (S5, X26)", () => {
    const a = setup("sans-webgl", "3D indisponible sur ce poste : l'objet garde son image");
    expect([(a.q("orbit") as HTMLButtonElement).disabled, (a.q("reset") as HTMLButtonElement).disabled]).toEqual([true, true]);
    expect(a.q("message")!.textContent).toBe("3D indisponible sur ce poste : l'objet garde son image");
  });
  it("chargement : « Chargement… », boutons grisés ; aucun message sans texte", () => {
    const a = setup("chargement");
    expect(a.q("status")!.textContent).toBe(LOADING_LABEL);
    expect((a.q("orbit") as HTMLButtonElement).disabled).toBe(true);
    expect(a.q("message")).toBeNull();
  });
});
```

**Test et commande bornée.**
```bash
cd "$WT" && pnpm --filter @roomboard/web exec vitest run src/ui/Model3dBar.test.tsx src/ui/Toolbar.test.tsx src/ui/MediaBar.test.tsx --reporter=verbose 2>&1 | grep -E "C15|switch|×|FAIL|Test Files|Tests " | tail -30
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"
```
Attendu : 0 `×` ; « Model3dBar (C15, X24) » 5 tests ; « aucun switch sur l'identifiant, aucun px… dans src/ui »
(`Toolbar.test.tsx:135`) vert ; `MediaBar.test.tsx` vert ; `tsc` vide.

**Contraintes (recopiées).**
- GC1 TDD : test rouge d'abord, vu rouge ; aucun test sauté ni désactivé ; délai : rejoué une fois, jamais relevé.
- GC2 `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; aucun build Tauri.
- GC3 Préparation : `cd "$WT" && pnpm install --frozen-lockfile` ; wasm : `mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c15-3d/apps/web/src/wasm/* apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c15-3d/apps/web/src/wasm-formats/* apps/web/src/wasm-formats/`.
- GC7 Aucune dépendance neuve. GC8 Vitest borné ; `tsc` vide.
- GC9 Commits : `git add <chemin>` un par un ; jamais `git add -A`/`--all`/`.`, `git commit -a`, `--force`, `git stash` nu ; auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, sans pousser.
- GC11 Dans `src/ui` : aucun `switch`, aucune taille en `px` dans un `.tsx`, libellés en français, aucun bouton à icône seule ; barre flottante seulement ; `SelectionRow.tsx`, `Toolbar.tsx`, `rb.css` non touchés.
- GC14 Aucun processus laissé. GC15 Seuls les deux fichiers de la tâche. GC16 Ligne `Réutilisation :` au rapport.

**Interdits.** Ne pas toucher `App.tsx` (T10), `MediaBar.tsx`, `rb.css`.

**Critère « terminé ».** Commande bornée verte, `tsc` vide, un commit.

**Étapes.**
- [ ] 1. Test rouge ; lancer (rouge : module absent).
- [ ] 2. `Model3dBar.tsx` ; vert ; garde `src/ui` verte ; commit `feat(ui): floating 3D bar with Rotate and Initial view`.
- [ ] 3. Rapport.

<a id="tache-t7"></a>

### Tâche T7 — Rendu WebGL partagé `three` (`model-view-three.ts`) : chargeurs, garde réseau, instantané, perte du contexte

**Objectif.** Implémenter `ModelView` (T5) avec three : un seul `WebGLRenderer` pour toute l'application, canvas hors
DOM, `alpha`, `antialias`, `preserveDrawingBuffer: true` (X22) ; chargeurs GLTF/GLB, OBJ + MTL, STL, PLY ; matière grise
`#b8bec6` et couleurs de sommets ; Z en haut tourné en Y en haut pour STL et PLY ; cadrage par sphère englobante ajustée
au champ de 35° (X4) ; garde des URL (X27, DAX4) ; instantané PNG à fond transparent (X5) ; sans WebGL ou contexte
perdu : `available()` faux, `draw`/`snapshot` null, `load` lit quand même (X26). Seul fichier qui importe three (GC17).

**Fichiers.** Créer `apps/web/src/platform/model-view-three.ts`, `apps/web/src/platform/model-view-three.test.ts`.
Modifier `apps/web/src/platform/model-view.ts` (alias `Model3dFormat` remplacé par l'import, PC1).

**Interfaces.**
- Consomme : T1 (`three` 0.187.0 installé) ; T3 `normalizePath(p: string): string`, `baseName(path: string): string`,
  fixtures `cubeGlb`, `cubeObj`, `cubeMtl`, `stlBinary`, `plyAscii`, `gltfWithBin` ; T5 `ModelView`, `ModelSource`,
  `LoadedModel`, `PixelSize` (`model-view.ts`), `ModelCamera`, `DEFAULT_CAMERA` (`model-frames.ts`) ; T2 `Model3dFormat` (`api.ts`).
- Produit (lu par T11, amorce) :
  ```ts
  export const FIELD_OF_VIEW = 35;
  export const MESH_GREY = "#b8bec6";
  export interface UrlPort { create(b: Blob): string; revoke(u: string): void }
  export interface RendererLike { setSize(w: number, h: number, style: boolean): void; setPixelRatio(r: number): void; setClearColor(c: number, a: number): void; render(scene: Scene, camera: PerspectiveCamera): void; dispose(): void }
  export interface ThreeViewDeps { readonly createCanvas?: () => HTMLCanvasElement; readonly createRenderer?: (canvas: HTMLCanvasElement) => RendererLike; readonly urls?: UrlPort }
  export function createThreeModelView(deps?: ThreeViewDeps): ModelView;
  export function orbitPose(v: ModelCamera, radius: number, aspect: number, fovDeg?: number): { x: number; y: number; z: number; near: number; far: number };
  export function guardUrl(url: string, known: ReadonlyMap<string, string>, missing: string[], toBlobUrl: (b: Blob) => string, empty: string): string;
  export function dataUrlBlob(url: string): Blob | null;
  ```
- Réutilise : aucun module existant de rendu 3D (cadrage : « aucun ») — nouveau module (DAX3) ; `normalizePath` et `baseName` de `platform/model3d-import.ts` (T3) appelés pour les clés de la garde.

**Patron à ne pas reprendre (concepteur-critique).**
- Pas un rendu par élément comme les lecteurs de média (`apps/web/src/platform/media-players.ts:108-130`, un lecteur par
  id) : **un** `WebGLRenderer` pour l'application (l'iPad n'a que quelques contextes) ; un modèle dans la scène à la fois.
- Ne pas réutiliser le contexte WebGL2 de l'encre (`apps/web/src/engine/render/select.ts:52`, facultatif, dédié au trait).
- Pas d'`OffscreenCanvas` (absent avant Safari 17), pas d'`OrbitControls` (X21), pas de `DRACOLoader`/`KTX2Loader`
  (Workers `blob:`, refusés par `script-src`, X18).
- Ne jamais laisser une URL autre que `blob:` atteindre `fetch` ou une `Image` : `LoadingManager.setURLModifier` sur
  **chaque** chargeur (GLTF, MTL, textures), y compris les `data:` (converties).

**Code de `model-view-three.ts`.**
```ts
/**
 * Rendu 3D partagé (C15, X4, X22, X26, X27, DAX3, DAX4) : un seul `WebGLRenderer` pour toute l'application, sur un canvas
 * hors DOM ; un seul modèle dans la scène à la fois ; garde des URL : seules les `blob:` des fichiers du modèle passent,
 * `data:` devient `blob:`, tout le reste est une `blob:` vide comptée « fichier lié absent ». Seul fichier qui importe
 * three (GC17), chargé par `import()` au premier besoin (X20).
 */
import {
  Box3,
  BufferGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  LoadingManager,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  Sphere,
  WebGLRenderer,
  type Material,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { PLYLoader } from "three/addons/loaders/PLYLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import type { ModelCamera } from "../engine/render/model-frames";
import { baseName, normalizePath } from "./model3d-import";
import type { LoadedModel, ModelSource, ModelView, PixelSize } from "./model-view";

export const FIELD_OF_VIEW = 35;
export const MESH_GREY = "#b8bec6";
/** Attente des textures d'un OBJ + MTL (chargées après `parse`). */
const TEXTURE_WAIT_MS = 15_000;
/** Schéma (`http:`, `file:`…) ou `//hôte` : jamais ouvert (même règle que `resolveReference`, T3). */
const REMOTE = /^(?:[a-z][a-z0-9+.-]+:|\/\/)/i;

export interface UrlPort {
  create(b: Blob): string;
  revoke(u: string): void;
}
export interface RendererLike {
  setSize(w: number, h: number, style: boolean): void;
  setPixelRatio(r: number): void;
  setClearColor(c: number, a: number): void;
  render(scene: Scene, camera: PerspectiveCamera): void;
  dispose(): void;
}
export interface ThreeViewDeps {
  /** Canvas du rendu ; défaut : `document.createElement("canvas")`, jamais posé dans le DOM. */
  readonly createCanvas?: () => HTMLCanvasElement;
  /** Rendu (tests : un faux) ; défaut : `WebGLRenderer` ; une exception = pas de WebGL (X26). */
  readonly createRenderer?: (canvas: HTMLCanvasElement) => RendererLike;
  readonly urls?: UrlPort;
}

const safeDecode = (s: string): string => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** Contenu d'une URL `data:` (base64 ou texte) ; null si mal formée. */
export function dataUrlBlob(url: string): Blob | null {
  const m = /^data:([^,]*),(.*)$/is.exec(url);
  if (m === null) return null;
  const meta = m[1] ?? "";
  const base64 = /;base64$/i.test(meta);
  const type = (base64 ? meta.slice(0, -7) : meta).split(";")[0] || "application/octet-stream";
  try {
    if (!base64) return new Blob([decodeURIComponent(m[2] ?? "")], { type });
    const bin = atob(m[2] ?? "");
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return new Blob([out], { type });
  } catch {
    return null;
  }
}

/** X27, DAX4 : URL demandée par three → URL sûre. `blob:` inchangée ; `data:` → `blob:` neuve ; distante → vide et
 *  absente ; connue (chemin normalisé, puis nom de base unique, URI décodée) → sa `blob:` ; inconnue → vide et absente. */
export function guardUrl(
  url: string,
  known: ReadonlyMap<string, string>,
  missing: string[],
  toBlobUrl: (b: Blob) => string,
  empty: string,
): string {
  if (url.startsWith("blob:")) return url;
  if (/^data:/i.test(url)) {
    const b = dataUrlBlob(url);
    return b === null ? empty : toBlobUrl(b);
  }
  const decoded = safeDecode(url);
  if (!REMOTE.test(url)) {
    const direct = known.get(normalizePath(decoded)) ?? known.get(normalizePath(url));
    if (direct !== undefined) return direct;
    const b = baseName(decoded).toLowerCase();
    const hits = [...known.keys()].filter((k) => baseName(k).toLowerCase() === b);
    if (b !== "" && hits.length === 1) return known.get(hits[0]!)!;
  }
  if (!missing.includes(decoded)) missing.push(decoded);
  return empty;
}

/** X4 : caméra sur la sphère englobante (centre à l'origine), à la distance qui la fait tenir dans le champ. */
export function orbitPose(
  v: ModelCamera,
  radius: number,
  aspect: number,
  fovDeg = FIELD_OF_VIEW,
): { x: number; y: number; z: number; near: number; far: number } {
  const half = (fovDeg * Math.PI) / 360;
  const fit = aspect >= 1 ? half : Math.atan(Math.tan(half) * aspect);
  const d = radius / Math.sin(fit);
  return {
    x: d * Math.cos(v.pitch) * Math.sin(v.yaw),
    y: d * Math.sin(v.pitch),
    z: d * Math.cos(v.pitch) * Math.cos(v.yaw),
    near: Math.max(d - radius * 1.5, d * 0.01),
    far: d + radius * 1.5,
  };
}

interface Internal {
  readonly pivot: Group;
  readonly radius: number;
  readonly urls: string[];
}

const grey = (vertexColors: boolean): MeshStandardMaterial =>
  new MeshStandardMaterial({ color: vertexColors ? 0xffffff : MESH_GREY, vertexColors });

function disposeTree(root: Object3D): void {
  root.traverse((o) => {
    const mesh = o as Partial<Mesh>;
    mesh.geometry?.dispose();
    const mats = mesh.material === undefined ? [] : Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats as Material[]) {
      for (const value of Object.values(m)) {
        if (value !== null && typeof value === "object" && "isTexture" in value) (value as { dispose(): void }).dispose();
      }
      m.dispose();
    }
  });
}

/** Attente des chargements lancés par le gestionnaire après `parse` (textures d'un MTL). */
function settled(manager: LoadingManager): { started(): boolean; done: Promise<void> } {
  let begun = false;
  let finish: () => void = () => undefined;
  const done = new Promise<void>((r) => {
    finish = r;
  });
  manager.onStart = () => {
    begun = true;
  };
  manager.onLoad = () => finish();
  return { started: () => begun, done };
}

async function parse(src: ModelSource, manager: LoadingManager): Promise<Object3D> {
  const buf = await src.main.arrayBuffer();
  if (src.format === "glb" || src.format === "gltf") {
    const data = src.format === "glb" ? buf : new TextDecoder().decode(buf);
    return (await new GLTFLoader(manager).parseAsync(data, "")).scene; // animations ignorées (X22)
  }
  if (src.format === "obj") {
    const obj = new OBJLoader(manager);
    const mtl = [...src.files.entries()].find(([p]) => p.toLowerCase().endsWith(".mtl"));
    if (mtl !== undefined) {
      const creator = new MTLLoader(manager).parse(await mtl[1].text(), "");
      creator.preload();
      obj.setMaterials(creator);
    }
    const group = obj.parse(new TextDecoder().decode(buf));
    if (mtl === undefined) {
      group.traverse((o) => {
        if (o instanceof Mesh) o.material = grey(false);
      });
    }
    return group;
  }
  const geometry: BufferGeometry = src.format === "stl" ? new STLLoader(manager).parse(buf) : new PLYLoader(manager).parse(buf);
  const colors = geometry.hasAttribute("color");
  let object: Object3D;
  if (src.format === "ply" && geometry.index === null) {
    object = new Points(geometry, new PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: colors, color: colors ? 0xffffff : MESH_GREY }));
  } else {
    if (src.format === "stl" || !geometry.hasAttribute("normal")) geometry.computeVertexNormals();
    object = new Mesh(geometry, grey(colors));
  }
  object.rotation.x = -Math.PI / 2; // HX1-7 : Z en haut → Y en haut
  const g = new Group();
  g.add(object);
  return g;
}

export function createThreeModelView(deps: ThreeViewDeps = {}): ModelView {
  const urls: UrlPort = deps.urls ?? { create: (b) => URL.createObjectURL(b), revoke: (u) => URL.revokeObjectURL(u) };
  const canvas = (deps.createCanvas ?? (() => document.createElement("canvas")))();
  const make = deps.createRenderer ?? ((c: HTMLCanvasElement) => new WebGLRenderer({ canvas: c, alpha: true, antialias: true, preserveDrawingBuffer: true }));
  let renderer: RendererLike | null = null;
  try {
    renderer = make(canvas);
    renderer.setClearColor(0x000000, 0);
  } catch {
    renderer = null; // X26 : aucune exception ne sort, l'instantané reste
  }
  let alive = renderer !== null;
  const lost = new Set<() => void>();
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    if (!alive) return;
    alive = false;
    for (const cb of [...lost]) cb();
  });
  const scene = new Scene();
  const camera = new PerspectiveCamera(FIELD_OF_VIEW, 4 / 3, 0.01, 1000);
  scene.add(new HemisphereLight(0xffffff, 0x444444, 1.2));
  const key = new DirectionalLight(0xffffff, 1.5);
  key.position.set(1, 1, 2);
  camera.add(key); // X22 : lumière liée à la caméra
  scene.add(camera);
  const models = new WeakMap<LoadedModel, Internal>();
  let shown: Internal | null = null;

  const draw = (m: LoadedModel, v: ModelCamera, px: PixelSize): HTMLCanvasElement | null => {
    const it = models.get(m);
    if (renderer === null || !alive || it === undefined) return null;
    if (shown !== it) {
      if (shown !== null) scene.remove(shown.pivot);
      scene.add(it.pivot);
      shown = it;
    }
    renderer.setPixelRatio(1);
    renderer.setSize(px.w, px.h, false);
    const pose = orbitPose(v, it.radius, px.w / px.h);
    camera.aspect = px.w / px.h;
    camera.near = pose.near;
    camera.far = pose.far;
    camera.position.set(pose.x, pose.y, pose.z);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    return canvas;
  };

  return {
    available: () => renderer !== null && alive,
    async load(src) {
      const own: string[] = [];
      const mk = (b: Blob): string => {
        const u = urls.create(b);
        own.push(u);
        return u;
      };
      const known = new Map<string, string>();
      for (const [p, b] of src.files) known.set(normalizePath(p), mk(b));
      const empty = mk(new Blob([]));
      const missing: string[] = [];
      const manager = new LoadingManager();
      manager.setURLModifier((u) => guardUrl(u, known, missing, mk, empty));
      const wait = settled(manager);
      try {
        const root = await parse(src, manager);
        if (wait.started()) {
          await Promise.race([wait.done, new Promise<void>((r) => setTimeout(r, TEXTURE_WAIT_MS))]);
        }
        const sphere = new Box3().setFromObject(root).getBoundingSphere(new Sphere());
        if (!Number.isFinite(sphere.radius) || sphere.radius <= 0) throw new Error("modèle 3D vide");
        root.position.sub(sphere.center);
        const pivot = new Group();
        pivot.add(root);
        const m: LoadedModel = { missing };
        models.set(m, { pivot, radius: sphere.radius, urls: own });
        return m;
      } catch (e) {
        for (const u of own) urls.revoke(u);
        throw e instanceof Error ? e : new Error(String(e));
      }
    },
    draw,
    snapshot(m, v, px) {
      const c = draw(m, v, px);
      if (c === null) return Promise.resolve(null);
      return new Promise<Blob | null>((resolve) => c.toBlob((b) => resolve(b), "image/png"));
    },
    release(m) {
      const it = models.get(m);
      if (it === undefined) return;
      models.delete(m);
      if (shown === it) {
        scene.remove(it.pivot);
        shown = null;
      }
      disposeTree(it.pivot);
      for (const u of it.urls) urls.revoke(u);
    },
    onLost(cb) {
      lost.add(cb);
      return () => {
        lost.delete(cb);
      };
    },
  };
}
```
`model-view.ts` : remplacer la déclaration de l'alias par
```ts
import type { Model3dFormat } from "../core/api";
export type { Model3dFormat };
```
(Si `three` ne fournit pas `parseAsync` à `GLTFLoader` dans cette version, envelopper `parse(data, "", resolve, reject)`
dans une `Promise`. Si un import `three/addons/...` n'est pas résolu par `@types/three`, prendre
`three/examples/jsm/loaders/<X>.js`.)

**Tests rouges à écrire** (`model-view-three.test.ts`, environnement Node ; aucun WebGL réel).
```ts
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CAMERA } from "../engine/render/model-frames";
import { cubeGlb, cubeMtl, cubeObj, gltfWithBin, plyAscii, stlBinary } from "./model3d-fixtures";
import { createThreeModelView, dataUrlBlob, guardUrl, orbitPose, type RendererLike } from "./model-view-three";

/** Canvas factice : écouteurs, `toBlob` en PNG d'un octet, aucun contexte. */
function fakeCanvas() {
  const listeners = new Map<string, (e: { preventDefault(): void }) => void>();
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    getContext: () => null,
    addEventListener: (t: string, cb: (e: { preventDefault(): void }) => void) => listeners.set(t, cb),
    removeEventListener: () => undefined,
    toBlob: (cb: (b: Blob | null) => void, type: string) => cb(new Blob([new Uint8Array([1])], { type })),
  } as unknown as HTMLCanvasElement;
  return { canvas, fire: (t: string) => listeners.get(t)?.({ preventDefault: () => undefined }) };
}
function fakeRenderer(): RendererLike & { sizes: Array<[number, number]>; renders: number } {
  const r = { sizes: [] as Array<[number, number]>, renders: 0, setSize: (w: number, h: number) => { r.sizes.push([w, h]); }, setPixelRatio: () => undefined, setClearColor: () => undefined, render: () => { r.renders++; }, dispose: () => undefined };
  return r;
}
function fakeUrls() {
  let n = 0;
  const live = new Set<string>();
  return { live, port: { create: () => { const u = `blob:essai/${++n}`; live.add(u); return u; }, revoke: (u: string) => { live.delete(u); } } };
}
const src = (format: "glb" | "gltf" | "obj" | "stl" | "ply", main: BlobPart, files: Array<[string, BlobPart]> = []) =>
  ({ format, name: `m.${format}`, main: new Blob([main]), files: new Map(files.map(([p, b]) => [p, new Blob([b])])) });

describe("rendu three (C15, X22, X27)", () => {
  it("guardUrl : blob: inchangée ; data: → blob: neuve", () => {
    const made: Blob[] = [];
    const to = (b: Blob) => { made.push(b); return "blob:neuf"; };
    expect(guardUrl("blob:x/1", new Map(), [], to, "blob:vide")).toBe("blob:x/1");
    expect(guardUrl("data:image/png;base64,AAEC", new Map(), [], to, "blob:vide")).toBe("blob:neuf");
    expect([made[0]!.size, made[0]!.type]).toEqual([3, "image/png"]);
  });
  it("URL distante : blob vide, comptée absente (DAX4)", () => {
    const missing: string[] = [];
    const known = new Map([["tex/a.png", "blob:a"]]);
    for (const u of ["https://cdn.test/a.png", "//cdn.test/a.png", "http://127.0.0.1/a.png", "/abs/inconnu.png"]) {
      expect(guardUrl(u, known, missing, () => "blob:neuf", "blob:vide")).toBe("blob:vide");
    }
    expect(missing).toEqual(["https://cdn.test/a.png", "//cdn.test/a.png", "http://127.0.0.1/a.png", "/abs/inconnu.png"]);
  });
  it("guardUrl : chemin normalisé, URI décodée, puis nom de base unique", () => {
    const known = new Map([["tex/a b.png", "blob:a"], ["cube.bin", "blob:b"]]);
    const g = (u: string) => guardUrl(u, known, [], () => "blob:neuf", "blob:vide");
    expect([g("./tex/a%20b.png"), g("tex\\a b.png"), g("../../ailleurs/CUBE.BIN"), g("autre.png")]).toEqual(["blob:a", "blob:a", "blob:b", "blob:vide"]);
  });
  it("dataUrlBlob : base64 et texte ; mal formée : null", async () => {
    expect(await dataUrlBlob("data:text/plain,a%20b")!.text()).toBe("a b");
    expect(dataUrlBlob("data:;base64,AAEC")!.size).toBe(3);
    expect(dataUrlBlob("data:sans-virgule")).toBeNull();
    expect(dataUrlBlob("data:;base64,@@@")).toBeNull();
  });
  it("orbitPose : distance ajustée au champ de 35°, vue par défaut devant, à droite et au-dessus", () => {
    const p = orbitPose(DEFAULT_CAMERA, 1, 4 / 3);
    const d = 1 / Math.sin((35 * Math.PI) / 360);
    expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(d, 9);
    expect([p.x > 0, p.y > 0, p.z > 0, p.near > 0, p.far > d]).toEqual([true, true, true, true, true]);
    const tall = orbitPose(DEFAULT_CAMERA, 1, 0.5);
    expect(Math.hypot(tall.x, tall.y, tall.z)).toBeGreaterThan(d);
  });
  it("sans WebGL : GLB lu (validation), available faux, draw et snapshot null (X26)", async () => {
    const { canvas } = fakeCanvas();
    const v = createThreeModelView({ createCanvas: () => canvas, createRenderer: () => { throw new Error("pas de WebGL"); }, urls: fakeUrls().port });
    const m = await v.load(src("glb", cubeGlb()));
    expect([v.available(), m.missing, v.draw(m, DEFAULT_CAMERA, { w: 64, h: 48 }), await v.snapshot(m, DEFAULT_CAMERA, { w: 64, h: 48 })]).toEqual([false, [], null, null]);
  });
  it("OBJ + MTL (couleur), OBJ seul (gris), STL binaire, PLY ASCII : lus (S3)", async () => {
    const v = createThreeModelView({ createCanvas: () => fakeCanvas().canvas, createRenderer: () => fakeRenderer(), urls: fakeUrls().port });
    for (const s of [src("obj", cubeObj(), [["cube.mtl", cubeMtl()]]), src("obj", cubeObj(null)), src("stl", stlBinary()), src("ply", plyAscii())]) {
      const m = await v.load(s);
      expect(m.missing).toEqual([]);
      expect(v.draw(m, DEFAULT_CAMERA, { w: 32, h: 24 })).not.toBeNull();
      v.release(m);
    }
  });
  it("glTF dont le .bin manque : rejeté, toutes les URL créées révoquées", async () => {
    const urls = fakeUrls();
    const v = createThreeModelView({ createCanvas: () => fakeCanvas().canvas, createRenderer: () => fakeRenderer(), urls: urls.port });
    await expect(v.load(src("gltf", gltfWithBin().gltf))).rejects.toThrow();
    expect(urls.live.size).toBe(0);
  });
  it("draw : rendu à la taille demandée, une scène ; snapshot : PNG par toBlob (X5)", async () => {
    const r = fakeRenderer();
    const { canvas } = fakeCanvas();
    const v = createThreeModelView({ createCanvas: () => canvas, createRenderer: () => r, urls: fakeUrls().port });
    const m = await v.load(src("glb", cubeGlb()));
    expect(v.draw(m, DEFAULT_CAMERA, { w: 1024, h: 768 })).toBe(canvas);
    expect([r.sizes.at(-1), r.renders]).toEqual([[1024, 768], 1]);
    expect((await v.snapshot(m, DEFAULT_CAMERA, { w: 1024, h: 768 }))!.type).toBe("image/png");
  });
  it("webglcontextlost : available() faux, onLost appelé une fois, draw null", async () => {
    const { canvas, fire } = fakeCanvas();
    const v = createThreeModelView({ createCanvas: () => canvas, createRenderer: () => fakeRenderer(), urls: fakeUrls().port });
    const m = await v.load(src("glb", cubeGlb()));
    const cb = vi.fn();
    v.onLost(cb);
    fire("webglcontextlost");
    fire("webglcontextlost");
    expect([v.available(), cb.mock.calls.length, v.draw(m, DEFAULT_CAMERA, { w: 8, h: 8 })]).toEqual([false, 1, null]);
  });
  it("release : URL révoquées, modèle oublié (draw null)", async () => {
    const urls = fakeUrls();
    const v = createThreeModelView({ createCanvas: () => fakeCanvas().canvas, createRenderer: () => fakeRenderer(), urls: urls.port });
    const m = await v.load(src("obj", cubeObj(), [["cube.mtl", cubeMtl()]]));
    expect(urls.live.size).toBeGreaterThan(0);
    v.release(m);
    expect([urls.live.size, v.draw(m, DEFAULT_CAMERA, { w: 8, h: 8 })]).toEqual([0, null]);
  });
});
```
(Un message de three dans la console pendant le test glTF sans `.bin` est attendu ; aucun autre. Si `fetch` de Node
résout une URL factice `blob:essai/1` autrement que par un rejet, le test reste vrai : le tampon vide fait échouer le
glTF.)

**Test et commande bornée.**
```bash
cd "$WT" && pnpm --filter @roomboard/web exec vitest run src/platform/model-view-three.test.ts src/platform/model-view.test.ts --reporter=verbose 2>&1 | grep -E "C15|×|FAIL|Test Files|Tests " | tail -30
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"
grep -rlE "from \"three(/|\")" apps/web/src --include=*.ts | grep -v "\.test\.ts$"   # apps/web/src/platform/model-view-three.ts seul
```
Attendu : « rendu three (C15, X22, X27) » 11 tests, 0 `×`, dont « URL distante : blob vide, comptée absente (DAX4) » et
« webglcontextlost : available() faux, onLost appelé une fois, draw null » ; « model-view (C15, DAX3) » vert ; `tsc` vide ;
le `grep` rend une seule ligne.

**Contraintes (recopiées).**
- GC1 TDD : test rouge d'abord, vu rouge ; aucun test sauté ni désactivé, aucun seuil baissé ; délai : rejoué une fois, jamais relevé.
- GC2 `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; aucun build Tauri.
- GC3 Préparation : `cd "$WT" && pnpm install --frozen-lockfile` ; wasm : `mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c15-3d/apps/web/src/wasm/* apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c15-3d/apps/web/src/wasm-formats/* apps/web/src/wasm-formats/` (puis GC4 si `add_model3d` manque au `.d.ts`).
- GC4 Plafond du module principal 1 572 864 o ni baissé ni relevé (aucun code Rust ici).
- GC5 Module `formats` intouché. GC6 Aucune URL distante, aucun CDN ; aucune requête réseau possible depuis three (garde).
- GC7 Aucune dépendance neuve (three vient de T1) ; aucun décodeur Draco/KTX2/meshopt.
- GC8 Vitest borné ; `tsc` vide.
- GC9 Commits : `git add <chemin>` un par un ; jamais `git add -A`/`--all`/`.`, `git commit -a`, `--force`, `git stash` nu ; auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, sans pousser.
- GC13 Modèles fabriqués (`model3d-fixtures.ts`), jamais téléchargés. GC14 Aucun processus laissé. GC15 Seuls les fichiers de la tâche.
- GC16 Ligne `Réutilisation :` au rapport. GC17 `three` importé par ce seul fichier (le `grep` de la preuve).

**Interdits.** Aucun `OrbitControls`, `DRACOLoader`, `KTX2Loader`, `MeshoptDecoder`, `OffscreenCanvas` ; canvas jamais
ajouté au DOM ; aucun import de ce fichier depuis un autre module que l'amorce (T11) et son test.

**Critère « terminé ».** Commande bornée verte ; `grep` à une ligne ; `tsc` vide ; deux commits.

**Étapes.**
- [ ] 1. Test rouge ; lancer (module absent).
- [ ] 2. `model-view-three.ts` ; vert ; commit `feat(platform): shared three.js view with URL guard and snapshots`.
- [ ] 3. `model-view.ts` : alias remplacé par l'import d'`api.ts` ; `tsc` ; commit `refactor(platform): take Model3dFormat from the core API`.
- [ ] 4. Rapport : N, noms, sortie du `grep`, ligne `Réutilisation : écart — aucun module de rendu 3D existant (cadrage) ; appelé normalizePath, baseName de model3d-import.ts`.

<a id="tache-t8"></a>

### Tâche T8 — Gestionnaires 3D (modèle, ZIP, fichier lié seul), lecteur ZIP `fflate` en Worker jetable, registre

**Objectif.** Brancher la 3D sur la chaîne d'import unique (U23) : `model3dHandler` (détection T3, plafond 100 Mo,
`companions` par `gatherFiles`, compression refusée, lecture par `ModelView.load` même sans WebGL, instantané, boîte
640 × 480 placée au point de dépôt, `AddModel3d` en une commande, avertissements `.obj` seul et fichiers absents) ;
`zip3dHandler` (ZIP lu par `fflate.unzipSync` dans un Worker jetable, bornes, un élément par modèle, 20 au plus,
« aucun modèle 3D dans ce ZIP ») ; `companionHandler` (`.mtl`/`.bin` seuls : message) ; ordre du registre (X12) ;
`ImportDeps.model3d` (X39).

**Fichiers.** Créer `apps/web/src/platform/model3d-handlers.ts`, `apps/web/src/platform/model3d-handlers.test.ts`,
`apps/web/src/platform/zip-read.ts`, `apps/web/src/platform/zip-read.test.ts`, `apps/web/src/platform/zip-worker.ts`.
Modifier `apps/web/src/platform/model3d-import.ts` (alias `Model3dFormat` remplacé par l'import d'`api.ts`, PC1),
`apps/web/src/platform/import.ts` (`ImportDeps.model3d`, registre `:227-236`), `apps/web/src/platform/import.test.ts`
(un cas d'ordre du registre).

**Choix (PC9).** Les gestionnaires vivent dans `model3d-handlers.ts`, pas dans `model3d-import.ts` : le Worker ZIP
importe `keepZipPath` et les bornes de `model3d-import.ts`, qui doit rester pur (aucun import de `image-import`,
`controller` ou `import`), sans quoi tout le graphe de la page entrerait dans le Worker.

**Interfaces.**
- Consomme : T2 `AssetRef`, `Command` (`AddModel3d`), `Model3dFormat`, `DEFAULT_MODEL3D_YAW`, `DEFAULT_MODEL3D_PITCH`,
  `SNAPSHOT_MIME` (`api.ts`) ; T3 `sniffModel3d`, `gatherFiles`, `Sibling`, `glbJsonText`, `gltfCompression`,
  `isCompanionName`, `extensionOf`, `baseName`, `keepZipPath`, `normalizePath`, bornes et messages, fixtures ;
  T4 `ImportHandler.companions`, `ImportContext.companions`, `importerOf`, `hasZipMagic` ; T5 `ModelView`,
  `ModelSource`, `snapshotSize` (`model-view.ts`), `DEFAULT_CAMERA` (`model-frames.ts`) ; T1 `fflate`.
- Produit (lu par T11) :
  ```ts
  // model3d-handlers.ts
  export interface Model3dDeps { view(): Promise<ModelView>; readZip(blob: Blob): Promise<ZipEntry[]> }
  export const MODEL_BOX = { w: 640, h: 480 } as const;
  export const MODEL3D_UNREADABLE = "modèle 3D illisible";
  export const MODEL3D_TAB_CLOSED = "onglet fermé pendant l'import, objet 3D non inséré";
  export function model3dHandler(deps: Model3dDeps): ImportHandler;
  export function zip3dHandler(deps: Model3dDeps): ImportHandler;
  export function companionHandler(): ImportHandler;
  export function linkedMime(path: string): string;
  // zip-read.ts
  export interface ZipEntry { readonly path: string; readonly blob: Blob }
  export const ZIP_WORKER_TIMEOUT_MS = 60_000;
  export const ZIP_FAILED_MESSAGE = "lecture du ZIP interrompue";
  export function checkZipReply(d: unknown): ZipEntry[];
  export function createZipReader(spawn: () => WorkerLike, timeoutMs?: number): (blob: Blob) => Promise<ZipEntry[]>;
  // zip-worker.ts
  export function unzipModelEntries(data: Uint8Array, limits?: { readonly entries: number; readonly bytes: number }): Array<{ path: string; bytes: Uint8Array }>;
  // import.ts : ImportDeps gagne `readonly model3d?: Model3dDeps;`
  ```
- Réutilise : `apps/web/src/platform/import.ts:83`, `:227`, `:247` (`ImportHandler`, `createImporter`, `importFiles`) — étendus : `ImportDeps.model3d?`, trois gestionnaires dans le registre, hook `companions` (T4) implémenté.
- Réutilise : `apps/web/src/platform/import.ts:129` (`ZIP_MAGIC`, `hasZipMagic`) — appelé par `zip3dHandler` (nom `.zip` ET en-tête).
- Réutilise : `apps/web/src/platform/image-import.ts:195-245` (`anchorOf`, `visibleOf`, `placement`, `ImageTarget`) — appelés tels quels (80 % du visible, cascade de 24), sans renommage.
- Réutilise : `apps/web/src/core/asset-store.ts:15-26` (`put`, `get`) — `target.assets.put` pour le principal, les liés et l'instantané.
- Réutilise : `apps/web/src/platform/one-shot-worker.ts:18` (`runOnce`) — un Worker neuf par ZIP, arrêté après la réponse.
- Réutilise : `apps/web/src/platform/model3d-import.ts` (T3, détection, références, ZIP) — appelé, aucune recopie.

**Patron à ne pas reprendre (concepteur-critique).**
- `sheetHandler` (`import.ts:163-183`) lit son ZIP dans un Worker **avec** le module `formats` (`sheet-worker.ts:11-24`) :
  ici, aucun module `formats` (DAX5, 0 octet) ; `fflate.unzipSync` seul, API synchrone (l'API asynchrone de fflate lance
  des Workers `blob:`, refusés par la CSP).
- `addMedia` (`media-import.ts:262-300`) écrit un média et son poster : ici, **une** commande porte le principal, les
  liés et l'instantané (X7) ; aucun `AddImage` pour l'instantané ni pour une texture réclamée.
- Ne pas avertir « 3D indisponible » à chaque modèle : un seul message par importeur (X26, « message unique »).

**Code de `model3d-handlers.ts`.**
```ts
/**
 * Gestionnaires 3D du registre (C15, X6, X7, X12-X18, X26, X39) : modèle seul ou avec ses fichiers liés, ZIP de modèles,
 * fichier lié déposé seul. Le modèle est lu par le rendu partagé (validation, même sans WebGL), son instantané pris à la
 * vue par défaut, puis `AddModel3d` en une commande, placé comme une image (80 % du visible, cascade de 24).
 */
import { DEFAULT_MODEL3D_PITCH, DEFAULT_MODEL3D_YAW, SNAPSHOT_MIME, type AssetRef, type Command, type Model3dFormat } from "../core/api";
import { DEFAULT_CAMERA } from "../engine/render/model-frames";
import { messageOf } from "./controller";
import type { DroppedFile } from "./files";
import { anchorOf, HEAD_BYTES, placement, visibleOf } from "./image-import";
import { hasZipMagic, type ImportContext, type ImportHandler, type ImportOutcome } from "./import";
import {
  baseName, COMPANION_ALONE_MESSAGE, COMPRESSED_MESSAGE, extensionOf, gatherFiles, glbJsonText, gltfCompression,
  isCompanionName, missingFilesMessage, MODEL3D_MAX_BYTES, MODEL3D_MIME, MODEL3D_TOO_BIG_MESSAGE, MTL_MISSING_MESSAGE,
  NO_WEBGL_MESSAGE, sniffModel3d, ZIP_EMPTY_MESSAGE, ZIP_MAX_MODELS, ZIP_TOO_BIG_MESSAGE, type Sibling,
} from "./model3d-import";
import { snapshotSize, type ModelView } from "./model-view";
import type { ZipEntry } from "./zip-read";

export interface Model3dDeps {
  /** Rendu partagé, chargé au premier besoin (X20). */
  view(): Promise<ModelView>;
  /** Entrées gardées d'un ZIP (Worker jetable, X16). */
  readZip(blob: Blob): Promise<ZipEntry[]>;
}

/** X6 : boîte 4:3 avant placement (HX2-2). */
export const MODEL_BOX = { w: 640, h: 480 } as const;
export const MODEL3D_UNREADABLE = "modèle 3D illisible";
export const MODEL3D_TAB_CLOSED = "onglet fermé pendant l'import, objet 3D non inséré";

const IMAGE_MIME: Readonly<Record<string, string>> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
};

/** Type d'un fichier lié, par son extension (X11). */
export function linkedMime(path: string): string {
  const ext = extensionOf(path);
  if (ext === "mtl") return MODEL3D_MIME.mtl;
  return IMAGE_MIME[ext] ?? MODEL3D_MIME.bin;
}

const bytesOf = async (b: Blob): Promise<Uint8Array> => new Uint8Array(await b.arrayBuffer());
const siblingOf = (f: DroppedFile): Sibling => ({ path: f.name, bytes: async () => bytesOf(await f.blob()) });

interface Model {
  readonly name: string;
  /** Chemin du principal (nom seul pour un dépôt, chemin dans le ZIP). */
  readonly path: string;
  readonly format: Model3dFormat;
  readonly main: Uint8Array;
  readonly siblings: readonly Sibling[];
}

/** État d'un importeur : « 3D indisponible » n'est dit qu'une fois (X26). */
interface Shared {
  warnedNoWebgl: boolean;
}

async function insertModel(deps: Model3dDeps, shared: Shared, m: Model, ctx: Omit<ImportContext, "blob">, index: number): Promise<ImportOutcome> {
  const target = ctx.target;
  if (target === null) return "failed";
  if (m.format === "glb" || m.format === "gltf") {
    const json = m.format === "gltf" ? new TextDecoder().decode(m.main) : glbJsonText(m.main);
    if (json !== null && gltfCompression(json) !== null) {
      await ctx.notify(`${m.name} : ${COMPRESSED_MESSAGE}`);
      return "failed";
    }
  }
  let view: ModelView;
  let snapshot: Blob | null;
  let missing: string[];
  let mtl: boolean | null;
  const mainBlob = new Blob([m.main], { type: MODEL3D_MIME[m.format] });
  const files: Array<{ readonly path: string; readonly blob: Blob }> = [];
  try {
    const g = await gatherFiles(m.format, m.path, m.main, m.siblings);
    for (const f of g.files) files.push({ path: f.path, blob: new Blob([await f.sibling.bytes()], { type: linkedMime(f.path) }) });
    view = await deps.view();
    const loaded = await view.load({ format: m.format, name: m.name, main: mainBlob, files: new Map(files.map((f) => [f.path, f.blob])) });
    try {
      snapshot = await view.snapshot(loaded, DEFAULT_CAMERA, snapshotSize(MODEL_BOX.w, MODEL_BOX.h));
    } finally {
      view.release(loaded);
    }
    missing = [...g.missing, ...loaded.missing.filter((x) => !g.missing.includes(x))];
    mtl = g.mtl;
  } catch (e) {
    await ctx.notify(`Import impossible (${m.name}) : ${MODEL3D_UNREADABLE} (${messageOf(e)})`);
    return "failed";
  }
  const ref = async (blob: Blob, name: string): Promise<AssetRef> => ({ id: await target.assets.put(blob), name, mime: blob.type, size: blob.size });
  const asset = await ref(mainBlob, m.name);
  const linked = [];
  for (const f of files) linked.push({ path: f.path, asset: await ref(f.blob, baseName(f.path)) });
  const snap = snapshot === null ? null : await ref(new Blob([snapshot], { type: SNAPSHOT_MIME }), `${m.name}.png`);
  // Vérifié après la dernière attente, juste avant le premier appel au moteur (patron de `addMedia`).
  if (target.alive?.() === false) {
    await ctx.notify(`${m.name} : ${MODEL3D_TAB_CLOSED}`);
    return "failed";
  }
  const rect = target.stageRect();
  const camera = target.camera();
  const cmd: Command = {
    type: "AddModel3d",
    page: target.page(),
    asset,
    format: m.format,
    files: linked,
    w: MODEL_BOX.w,
    h: MODEL_BOX.h,
    yaw: DEFAULT_MODEL3D_YAW,
    pitch: DEFAULT_MODEL3D_PITCH,
    snapshot: snap,
    matrix: placement(MODEL_BOX.w, MODEL_BOX.h, anchorOf(rect, camera, ctx.at), visibleOf(rect, camera), index),
  };
  if (target.run(cmd) === null) return "failed";
  if (mtl === false) await ctx.notify(`${m.name} : ${MTL_MISSING_MESSAGE}`);
  else if (missing.length > 0) await ctx.notify(missingFilesMessage(m.name, missing));
  if (!view.available() && !shared.warnedNoWebgl) {
    shared.warnedNoWebgl = true;
    await ctx.notify(NO_WEBGL_MESSAGE);
  }
  return "inserted";
}

/** Entrée `model3d` (X11, X13, X17) : après `image` dans le registre. */
export function model3dHandler(deps: Model3dDeps, shared: Shared = { warnedNoWebgl: false }): ImportHandler {
  return {
    id: "model3d",
    nature: "objet",
    detect: (head, name) => sniffModel3d(head, name) !== null,
    limit: { maxBytes: MODEL3D_MAX_BYTES, message: MODEL3D_TOO_BIG_MESSAGE },
    async companions(file, blob, head, siblings) {
      const format = sniffModel3d(head, file.name);
      if (format === null) return [];
      const g = await gatherFiles(format, file.name, await bytesOf(blob), siblings.map(siblingOf));
      const names = new Set(g.files.map((f) => f.sibling.path));
      return siblings.filter((s) => names.has(s.name));
    },
    async run(file, ctx) {
      const format = sniffModel3d(ctx.head, file.name);
      if (format === null) return "failed";
      const main = await bytesOf(ctx.blob);
      return insertModel(deps, shared, { name: file.name, path: file.name, format, main, siblings: ctx.companions.map(siblingOf) }, ctx, ctx.inserted);
    },
  };
}

/** Entrée `zip3d` (X16) : nom `.zip` ET en-tête ZIP ; après `sheet` (un `.xlsx` ou un `.rbitem` est pris avant). */
export function zip3dHandler(deps: Model3dDeps, shared: Shared = { warnedNoWebgl: false }): ImportHandler {
  return {
    id: "zip3d",
    nature: "objet",
    detect: (head, name) => extensionOf(name) === "zip" && hasZipMagic(head),
    limit: { maxBytes: MODEL3D_MAX_BYTES, message: MODEL3D_TOO_BIG_MESSAGE },
    async run(file, ctx) {
      let entries: ZipEntry[];
      try {
        entries = await deps.readZip(ctx.blob);
      } catch (e) {
        const msg = messageOf(e);
        await ctx.notify(msg === ZIP_TOO_BIG_MESSAGE ? `${file.name} : ${msg}` : `Import impossible (${file.name}) : ${msg}`);
        return "failed";
      }
      const siblings: Sibling[] = entries.map((e) => ({ path: e.path, bytes: () => bytesOf(e.blob) }));
      const mains: Array<{ readonly entry: ZipEntry; readonly format: Model3dFormat }> = [];
      for (const entry of entries) {
        const format = sniffModel3d(await bytesOf(entry.blob.slice(0, HEAD_BYTES)), entry.path);
        if (format !== null) mains.push({ entry, format });
        if (mains.length === ZIP_MAX_MODELS) break;
      }
      if (mains.length === 0) {
        await ctx.notify(`${file.name} : ${ZIP_EMPTY_MESSAGE}`);
        return "failed";
      }
      let any = false;
      for (const [i, { entry, format }] of mains.entries()) {
        const model: Model = {
          name: baseName(entry.path),
          path: entry.path,
          format,
          main: await bytesOf(entry.blob),
          siblings: siblings.filter((s) => s.path !== entry.path),
        };
        if ((await insertModel(deps, shared, model, ctx, ctx.inserted + i)) === "inserted") any = true;
      }
      return any ? "inserted" : "failed";
    },
  };
}

/** X12 : `.mtl` ou `.bin` sans modèle : message, en échec. */
export function companionHandler(): ImportHandler {
  return {
    id: "model3d-companion",
    nature: "objet",
    detect: (_head, name) => isCompanionName(name),
    async run(file, ctx) {
      await ctx.notify(`${file.name} : ${COMPANION_ALONE_MESSAGE}`);
      return "failed";
    },
  };
}
```
`import.ts` :
```ts
import { companionHandler, model3dHandler, zip3dHandler, type Model3dDeps } from "./model3d-handlers";
// ImportDeps :
  /** C15 (X39) : rendu partagé et lecteur de ZIP ; absent : fichiers 3D et `.zip` refusés comme avant. */
  readonly model3d?: Model3dDeps;
// createImporter :
  const model3d = deps.model3d;
  const shared3d = { warnedNoWebgl: false }; // X26 : un seul message par importeur
  // registre : …imageHandler(…), ...(model3d ? [model3dHandler(model3d, shared3d)] : []), ...(readSheet ? [sheetHandler(…)] : []),
  //            ...(model3d ? [zip3dHandler(model3d, shared3d), companionHandler()] : []),
```
(`ImportContext` est importé de `./import` par `model3d-handlers.ts` et `import.ts` importe les gestionnaires : cycle de
modules sans usage à l'évaluation, comme `media-import.ts` aujourd'hui.) Le type `Shared` est exporté sous le nom
`Model3dShared` si `import.ts` doit le nommer.

**Code de `zip-read.ts` et `zip-worker.ts`.**
```ts
// zip-read.ts
/**
 * Lecture d'un ZIP de modèles 3D (C15, X16, DAX5) : `fflate.unzipSync` dans un Worker jetable (`runOnce`), jamais dans la
 * page ni par le module `formats`. Réponse contrôlée : `{ entries: [{ path, bytes }] }` ou `{ error }`.
 */
import { runOnce, type WorkerLike } from "./one-shot-worker";

export interface ZipEntry {
  readonly path: string;
  readonly blob: Blob;
}
export const ZIP_WORKER_TIMEOUT_MS = 60_000;
export const ZIP_FAILED_MESSAGE = "lecture du ZIP interrompue";

export function checkZipReply(d: unknown): ZipEntry[] {
  const r = d as { entries?: unknown; error?: unknown } | null;
  if (typeof r?.error === "string") throw new Error(r.error);
  if (!Array.isArray(r?.entries)) throw new Error(ZIP_FAILED_MESSAGE);
  return r.entries.map((e: unknown) => {
    const x = e as { path?: unknown; bytes?: unknown } | null;
    if (typeof x?.path !== "string" || !(x.bytes instanceof Uint8Array)) throw new Error(ZIP_FAILED_MESSAGE);
    return { path: x.path, blob: new Blob([x.bytes]) };
  });
}

export function createZipReader(spawn: () => WorkerLike, timeoutMs = ZIP_WORKER_TIMEOUT_MS): (blob: Blob) => Promise<ZipEntry[]> {
  return async (blob) => {
    const buf = await blob.arrayBuffer();
    return runOnce(spawn, { bytes: new Uint8Array(buf) }, [buf], timeoutMs, checkZipReply, ZIP_FAILED_MESSAGE);
  };
}
```
```ts
// zip-worker.ts
/**
 * Worker de lecture d'un ZIP de modèles 3D (C15, X16, DAX5) : entrées gardées par `keepZipPath`, 1 000 entrées et
 * 256 Mio décompressés au plus (comptés avant décompression, par la taille d'origine du répertoire central). Créé par
 * `main.ts`, arrêté par `zip-read.ts` après la réponse. Seul module qui importe fflate (GC17).
 */
import { unzipSync } from "fflate";
import { keepZipPath, normalizePath, ZIP_MAX_BYTES, ZIP_MAX_ENTRIES, ZIP_TOO_BIG_MESSAGE } from "./model3d-import";

export function unzipModelEntries(
  data: Uint8Array,
  limits: { readonly entries: number; readonly bytes: number } = { entries: ZIP_MAX_ENTRIES, bytes: ZIP_MAX_BYTES },
): Array<{ path: string; bytes: Uint8Array }> {
  let count = 0;
  let total = 0;
  let tooBig = false;
  const files = unzipSync(data, {
    filter(f) {
      count++;
      if (count > limits.entries) {
        tooBig = true;
        return false;
      }
      if (!keepZipPath(f.name)) return false;
      total += f.originalSize;
      if (total > limits.bytes) {
        tooBig = true;
        return false;
      }
      return true;
    },
  });
  if (tooBig) throw new Error(ZIP_TOO_BIG_MESSAGE);
  return Object.entries(files)
    .map(([name, bytes]) => ({ path: normalizePath(name), bytes }))
    .filter((e) => e.path !== "");
}

// Branché seulement dans un Worker (le test l'importe sous Node).
if (typeof (globalThis as { WorkerGlobalScope?: unknown }).WorkerGlobalScope !== "undefined") {
  const scope = globalThis as unknown as { onmessage: ((e: MessageEvent<{ readonly bytes: Uint8Array }>) => void) | null; postMessage(m: unknown, t: Transferable[]): void };
  scope.onmessage = (e) => {
    try {
      const entries = unzipModelEntries(e.data.bytes);
      scope.postMessage({ entries }, entries.map((x) => x.bytes.buffer as ArrayBuffer));
    } catch (err) {
      scope.postMessage({ error: err instanceof Error ? err.message : String(err) }, []);
    }
  };
}
```
(Si deux entrées partagent un même `ArrayBuffer`, la liste de transfert le cite deux fois et `postMessage` lève : la
dédoublonner par `new Set(...)`.)

**Tests rouges à écrire.**
- `model3d-handlers.test.ts`, `describe("gestionnaire 3D (C15)")`, avec `createImporter({ openDocument, notify, target: () => t.target, model3d })`
  (`fakeTarget` recopié d'`import.test.ts:101-117`, `decode` factice d'`import.test.ts:118-119` pour l'image) et une vue factice :
  ```ts
  function fakeView(opts: { webgl?: boolean; missing?: string[]; fail?: boolean } = {}) {
    const loads: ModelSource[] = [];
    const view: ModelView = {
      available: () => opts.webgl ?? true,
      load: vi.fn(async (s: ModelSource) => { loads.push(s); if (opts.fail) throw new Error("x"); return { missing: opts.missing ?? [] }; }),
      draw: () => null,
      snapshot: vi.fn(async () => ((opts.webgl ?? true) ? new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }) : null)),
      release: vi.fn(),
      onLost: () => () => undefined,
    };
    return { view, loads };
  }
  const zipOf = (files: Record<string, Uint8Array | string>): Uint8Array =>
    zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, typeof v === "string" ? new TextEncoder().encode(v) : v])));
  const realZip = { readZip: async (b: Blob) => checkZipReply({ entries: unzipModelEntries(new Uint8Array(await b.arrayBuffer())) }) };
  type AddModel3d = Extract<Command, { type: "AddModel3d" }>;
  ```
  Cas (noms exacts) :
  1. « GLB seul : AddModel3d en une commande, boîte 640 × 480 au point de dépôt, vue par défaut, instantané PNG (S1, X6, X7) » —
     `cmds` = une `AddModel3d` : `format: "glb"`, `w: 640`, `h: 480`, `yaw: DEFAULT_MODEL3D_YAW`, `pitch: DEFAULT_MODEL3D_PITCH`,
     `files: []`, `snapshot.mime === "image/png"`, `snapshot.name === "cube.glb.png"`, `matrix` = `placement(640, 480, anchorOf(rect, IDENTITY, at), visibleOf(rect, IDENTITY), 0)` ;
     `t.assets.get(asset.id)` présent ; `view.release` appelé une fois ; aucun `notify`.
  2. « OBJ + MTL ensemble : un élément, le .mtl en fichier lié, aucun avertissement, le .mtl non importé seul (S3) » —
     `importFiles([cube.obj, cube.mtl])` : `inserted = ["cube.obj"]`, `files = [{ path: "cube.mtl", asset.mime: "model/mtl" }]`,
     la source passée à `load` porte `files.get("cube.mtl")`, aucun `notify`.
  3. « .obj seul : inséré, avertissement « déposé sans son .mtl » (X15) » — message `seul.obj : ${MTL_MISSING_MESSAGE}`.
  4. « texture citée absente et absents du rendu : « fichiers liés absents (bleu.png, https://cdn.test/x.png) » (X14, X27) » —
     OBJ + MTL qui cite `bleu.png` (absent) ; vue `missing: ["https://cdn.test/x.png"]`.
  5. « glTF à Draco requis : refusé, rien d'inséré (X18) » — `cubeGlb({ extensionsRequired: ["KHR_draco_mesh_compression"], extensionsUsed: ["KHR_draco_mesh_compression"] })` ;
     message `cube.glb : ${COMPRESSED_MESSAGE}`, `load` jamais appelé.
  6. « sans WebGL : inséré sans instantané, « 3D indisponible » une seule fois pour deux modèles (S5, X26) » — deux GLB ;
     `snapshot: null` × 2 ; `NO_WEBGL_MESSAGE` vu une fois.
  7. « modèle illisible : échec, « modèle 3D illisible », rien d'inséré » — `fail: true`.
  8. « un .zip sans modèle : aucun modèle 3D dans ce ZIP » — `zipOf({ "lisez-moi.txt": "x" })` ; `failed = ["a.zip"]`,
     message `a.zip : aucun modèle 3D dans ce ZIP`.
  9. « ZIP : glTF + .bin + PNG dans un sous-dossier : un élément, deux liés (S3) » — `zipOf({ "modele/scene.gltf": gltf, "modele/cube.bin": bin, "modele/tex/a.png": png })`
     avec `realZip` ; `files.map(f => f.path) = ["cube.bin", "tex/a.png"]`, mimes `application/octet-stream`, `image/png`.
  10. « ZIP : deux modèles → deux éléments en cascade ; 21 modèles → 20 (X16) » — matrices décalées de 24 ; 21 GLB → 20 commandes.
  11. « .mtl ou .bin déposé seul : « fichier lié d'un modèle 3D : déposez-le avec son modèle » (X12) ».
  12. « sans deps.model3d : .glb, .mtl et .zip refusés comme avant (X39) » — `refused` les trois, `LATER_FORMAT_MESSAGE`.
  13. « plus de 100 Mo : refusé avant lecture (X17) » — fichier `size = MODEL3D_MAX_BYTES + 1` dont `blob()` lève : message
      `big.glb : ${MODEL3D_TOO_BIG_MESSAGE}`, `blob` jamais appelé.
  14. « image déposée avec un modèle qui la cite : pas d'AddImage ; non citée : AddImage (effet de bord, HX2-6) » — OBJ +
      MTL qui cite `bleu.png` + `bleu.png` + `photo.png` (PNG valides, `decode` factice) : une `AddModel3d`, une `AddImage`
      (photo.png seule).
- `zip-read.test.ts`, `describe("lecteur ZIP (C15, X16)")` :
  1. « ZIP : chemins .. et absolus ignorés, 1 000 entrées, 256 Mio » — `unzipModelEntries(zipSync({ "../x.obj": …, "/etc/y.obj": …, "a/../../z.obj": …, "ok/c.obj": …, "doc.txt": … }))`
     → `[{ path: "ok/c.obj" }]` ; limites réduites `{ entries: 3, bytes: 1e9 }` sur 4 entrées → lève `ZIP_TOO_BIG_MESSAGE` ;
     `{ entries: 1000, bytes: 10 }` sur une entrée de 11 octets → lève ; défaut : `ZIP_MAX_ENTRIES === 1000`, `ZIP_MAX_BYTES === 268435456`.
  2. « checkZipReply : forme contrôlée ; erreur rendue telle quelle » — `{ error: "ZIP trop gros…" }` lève ce texte ; `{}` →
     `ZIP_FAILED_MESSAGE` ; `{ entries: [{ path: 1 }] }` → `ZIP_FAILED_MESSAGE`.
  3. « createZipReader : un Worker par lecture, transféré, arrêté après la réponse » — `WorkerLike` factice qui répond
     `{ entries: [{ path: "a.glb", bytes }] }` : deux lectures = deux `spawn`, deux `terminate`.
- `import.test.ts` : « registre C15 : model3d après image, zip3d et fichier lié après sheet (X12) » — un `.xlsx` (en-tête
  ZIP) reste au gestionnaire de classeur quand `model3d` est fourni ; un `.rbitem` reste un objet `.rbitem`.

**Test et commande bornée.**
```bash
cd "$WT" && pnpm --filter @roomboard/web exec vitest run src/platform/model3d-handlers.test.ts src/platform/zip-read.test.ts src/platform/import.test.ts src/platform/image-import.test.ts src/platform/media-import.test.ts src/platform/model3d-import.test.ts --reporter=verbose 2>&1 | grep -E "C15|×|FAIL|Test Files|Tests " | tail -50
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"
grep -rlE "from \"fflate\"" apps/web/src --include=*.ts | grep -v "\.test\.ts$"   # apps/web/src/platform/zip-worker.ts seul
grep -nE "^import" apps/web/src/platform/model3d-import.ts                         # au plus « import type … from \"../core/api\" »
```
Attendu : « gestionnaire 3D (C15) » 14 tests, « lecteur ZIP (C15, X16) » 3, cas de registre vert ; 0 `×` ; tests
d'avant verts (dont « en-tête ZIP sans l'extension : refusé », `import.test.ts:300`) ; `tsc` vide ; les deux `grep`
conformes.

**Contraintes (recopiées).**
- GC1 TDD : test rouge d'abord, vu rouge ; aucun test sauté ni désactivé, aucun seuil baissé ; délai : rejoué une fois, jamais relevé.
- GC2 `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; aucun build Tauri.
- GC3 Préparation : `cd "$WT" && pnpm install --frozen-lockfile` ; wasm : `mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c15-3d/apps/web/src/wasm/* apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c15-3d/apps/web/src/wasm-formats/* apps/web/src/wasm-formats/` ; GC4 si `add_model3d` manque au `.d.ts`.
- GC4 Plafond du module principal 1 572 864 o ni baissé ni relevé.
- GC5 Module `formats` intouché : aucun lecteur ZIP ajouté au Rust (DAX5).
- GC6 Hors ligne : aucune URL distante ; GC7 aucune dépendance neuve (fflate vient de T1), API synchrone seulement.
- GC8 Vitest borné ; `tsc` vide.
- GC9 Commits : `git add <chemin>` un par un ; jamais `git add -A`/`--all`/`.`, `git commit -a`, `--force`, `git stash` nu ; auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, sans pousser.
- GC10 Une seule commande `AddModel3d` par modèle (principal, liés, instantané).
- GC13 Modèles et ZIP fabriqués dans les tests (`model3d-fixtures.ts`, `zipSync`), jamais téléchargés.
- GC14 Aucun processus laissé. GC15 `import.ts` : `ImportDeps.model3d` et trois lignes de registre, rien d'autre.
- GC16 Six lignes `Réutilisation :` au rapport. GC17 `fflate` importé par `zip-worker.ts` seul ; `three` jamais ici.

**Interdits.** Ne pas importer `three` ni `model-view-three.ts` ; ne pas modifier `image-import.ts` ni la pré-passe
(T4) ; aucun `AddImage` pour un fichier réclamé ou pour l'instantané ; API asynchrone de fflate (`unzip`, `AsyncUnzipInflate`) interdite.

**Critère « terminé ».** Commande bornée verte ; `grep` conformes ; `tsc` vide ; deux commits.

**Étapes.**
- [ ] 1. `zip-read.test.ts` rouge ; `zip-read.ts`, `zip-worker.ts` ; vert ; commit `feat(import): read 3D ZIP archives with fflate in a one-shot worker`.
- [ ] 2. `model3d-handlers.test.ts` et le cas de registre rouges ; `model3d-handlers.ts`, `import.ts`, alias de
  `model3d-import.ts` remplacé par `import type { Model3dFormat } from "../core/api"` (et `export type { Model3dFormat }`) ;
  vert ; commit `feat(import): 3D model, ZIP and companion handlers in the import registry`.
- [ ] 3. Rapport : N, noms, sorties des `grep`, lignes `Réutilisation :`.

<a id="tache-t9"></a>

### Tâche T9 — Canvas 2D : branche `model3d` (image du rendu, instantané, carte « Objet 3D »), constantes de caméra unifiées

**Objectif.** X25 : le Canvas 2D dessine un `model3d` dans sa boîte (0, 0)-(w, h) par l'image du rendu partagé (port
`models`, séance ouverte), sinon par son instantané (`images.bitmap(snapshot)`), sinon par une carte grise « Objet 3D »
et le nom de l'asset. L'export (PDF, vignette, `.rbitem`) n'a pas de port : instantané. PC1 : les constantes de caméra
de `model-frames.ts` viennent d'`api.ts`.

**Fichiers.** Modifier `apps/web/src/engine/render/canvas2d.ts` (constantes près de `PLACEHOLDER_FILL` `:95-102`,
`paintModel3d` après `paintMedia` `:131-180`, champ et constructeur `:254-283`, bras de `paintElement` après `media`
`:411-416`), `canvas2d.test.ts` (bloc en fin, patron `:1054-1090`), `model-frames.ts`, `model-frames.test.ts`.

**Interfaces.**
- Consomme : T2 `Model3dData`, `ElementView` (`kind: "model3d"`), `DEFAULT_MODEL3D_YAW`, `DEFAULT_MODEL3D_PITCH`,
  `MODEL3D_PITCH_LIMIT` (`api.ts`) ; T5 `ModelFrames`, option `models` de `Canvas2DOptions`.
- Produit : `export const MODEL3D_CARD_LABEL = "Objet 3D";` (canvas2d.ts) ; dessin des `model3d` (lu par T10, T11).
- Réutilise : `apps/web/src/engine/render/image-cache.ts:20` (`bitmap(asset)`) — l'instantané est dessiné comme un poster.
- Réutilise : `apps/web/src/engine/render/media-frames.ts:7`, `canvas2d.ts:39`, `:411` (port par les options, bras `media`) — bras `model3d` voisin, port `models` (T5).

**Code.**
```ts
// canvas2d.ts, près des constantes du média
/** C15 (X25) : carte d'un objet 3D sans image (instantané absent ou pas encore décodé). */
export const MODEL3D_CARD_LABEL = "Objet 3D";

/** Boîte (0, 0)-(w, h) d'un objet 3D : image du rendu partagé, sinon instantané, sinon carte « Objet 3D » + nom. */
function paintModel3d(
  ctx: CanvasRenderingContext2D,
  m: Model3dData,
  frame: CanvasImageSource | null,
  images: ImageSource | null,
  name: string | null,
): void {
  const bmp = frame ?? (m.snapshot !== null ? (images?.bitmap(m.snapshot) ?? null) : null);
  if (bmp !== null) {
    ctx.drawImage(bmp, 0, 0, m.w, m.h);
    return;
  }
  paintPlaceholder(ctx, m.w, m.h, MODEL3D_CARD_LABEL);
  if (name !== null) {
    ctx.font = textFont(16);
    ctx.fillStyle = PLACEHOLDER_STROKE;
    ctx.textBaseline = "top";
    ctx.fillText(name, 8, 30);
  }
}
// classe : `private readonly models: ModelFrames | null;` et `this.models = opts.models ?? null;`
// paintElement, après le bras media :
    } else if (el.kind === "model3d") {
      paintModel3d(ctx, el.model3d, this.models?.frame(el.id) ?? null, this.images, this.assetName?.(el.model3d.asset) ?? null);
```
```ts
// model-frames.ts : constantes reprises du cœur (PC1)
import { DEFAULT_MODEL3D_PITCH, DEFAULT_MODEL3D_YAW, MODEL3D_PITCH_LIMIT } from "../../core/api";
export const DEFAULT_CAMERA: ModelCamera = Object.freeze({ yaw: DEFAULT_MODEL3D_YAW, pitch: DEFAULT_MODEL3D_PITCH });
export const PITCH_LIMIT = MODEL3D_PITCH_LIMIT;
```

**Tests rouges à écrire.**
- `canvas2d.test.ts`, `describe("Canvas2DRenderer — objet 3D (C15, X25)")`, aides du bloc média (`FakeCtx`, `asCtx`,
  `sceneOf`) recopiées avec `models?: ModelFrames` :
  ```ts
  const GLB = "cc".repeat(32);
  const SNAP = "dd".repeat(32);
  const data = (o: Partial<Model3dData> = {}): Model3dData => ({ asset: GLB, format: "glb", w: 640, h: 480, files: [], yaw: Math.PI / 6, pitch: Math.PI / 9, snapshot: SNAP, ...o });
  const el = (o: Partial<Model3dData> = {}): ElementView => ({ id: "o", kind: "model3d", transform: [1, 0, 0, 1, 5, 6], model3d: data(o) });
  const frame = { tag: "rendu" } as unknown as CanvasImageSource;
  const snap = { tag: "instantane" } as unknown as CanvasImageSource;
  const images: ImageSource = { bitmap: (a) => (a === SNAP ? snap : null) };
  ```
  1. « séance ouverte : image du rendu partagé dans (0,0)-(w,h) » — `models: { frame: (id) => (id === "o" ? frame : null) }` →
     `scene.images` = `[{ img: frame, x: 0, y: 0, w: 640, h: 480 }]`.
  2. « sans image du rendu : instantané du cache » — `models: { frame: () => null }` → `[{ img: snap, … }]`.
  3. « ni rendu ni instantané : carte grise « Objet 3D » et le nom » — `snapshot: null`, `assetName: () => "cube.glb"` :
     aucune image, `fillRect ${PLACEHOLDER_FILL}` et les textes `Objet 3D`, `cube.glb` au journal.
  4. « rendu d'export : instantané, jamais le port » — `exportPainterOptions(images)` : `[{ img: snap, … }]`.
- `model-frames.test.ts` : « constantes de caméra = celles du cœur (PC1) » — `DEFAULT_CAMERA` égal à
  `{ yaw: DEFAULT_MODEL3D_YAW, pitch: DEFAULT_MODEL3D_PITCH }`, `PITCH_LIMIT === MODEL3D_PITCH_LIMIT`.

**Test et commande bornée.**
```bash
cd "$WT" && pnpm --filter @roomboard/web exec vitest run src/engine/render/canvas2d.test.ts src/engine/render/model-frames.test.ts src/engine/render/webgl2.test.ts --reporter=verbose 2>&1 | grep -E "C15|×|FAIL|Test Files|Tests " | tail -30
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"
```
Attendu : « Canvas2DRenderer — objet 3D (C15, X25) » 4 tests, « constantes de caméra = celles du cœur (PC1) » vert,
0 `×` ; « Canvas2DRenderer — média (C14) » et le test du fond inconnu verts ; `tsc` vide.

**Contraintes (recopiées).**
- GC1 TDD : test rouge d'abord, vu rouge ; aucun test sauté ni désactivé ; délai : rejoué une fois, jamais relevé.
- GC2 `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; aucun build Tauri.
- GC3 Préparation : `cd "$WT" && pnpm install --frozen-lockfile` ; wasm : `mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c15-3d/apps/web/src/wasm/* apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c15-3d/apps/web/src/wasm-formats/* apps/web/src/wasm-formats/` ; GC4 si `add_model3d` manque au `.d.ts`.
- GC7 Aucune dépendance neuve. GC8 Vitest borné ; `tsc` vide.
- GC9 Commits : `git add <chemin>` un par un ; jamais `git add -A`/`--all`/`.`, `git commit -a`, `--force`, `git stash` nu ; auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, sans pousser.
- GC14 Aucun processus laissé. GC15 `canvas2d.ts` : bras voisin et constantes, aucune réorganisation ; `fill-target.ts`, `renderer.ts`, `image-cache.ts` non touchés.
- GC16 Deux lignes `Réutilisation :` au rapport. GC17 Aucun import de three.

**Interdits.** Aucun dessin WebGL ici ; ne pas toucher `paintMedia`, `exportPainterOptions`, `fill-target.ts`.

**Critère « terminé ».** Commande bornée verte, `tsc` vide, un commit.

**Étapes.**
- [ ] 1. Tests rouges ; `canvas2d.ts`, `model-frames.ts` ; verts ; commit `feat(render): draw 3D objects from the shared view, their snapshot or a card`.
- [ ] 2. Rapport.

<a id="tache-t10"></a>

### Tâche T10 — Séances 3D par onglet, session (`data-model3d`, orbite, instantané, annulation), barre dans `App`

**Objectif.** Relier le rendu partagé, le moteur et la barre dans la session d'un onglet : `ModelSessions` (au plus un
modèle chargé, celui de la séance ; port `ModelFrames` ; états `instantane`, `chargement`, `orbite`, `sans-webgl`,
`echec`) ; « Tourner » ouvre `engine.orbitModel` ; chaque orbite validée prend l'instantané puis écrit
`SetModel3dView` (une étape) ; séance fermée par Échap, changement de sélection, de page, d'onglet, annulation ou
suppression ; oracle `#stage[data-model3d]` (X36) ; `<Model3dBar>` dans l'enveloppe flottante d'`App` (X24).

**Fichiers.** Créer `apps/web/src/platform/model-sessions.ts`, `apps/web/src/platform/model-sessions.test.ts`.
Modifier `apps/web/src/app/board-session.ts` (`SessionShared` `:52-72`, `BoardSession` `:84-115`, construction
voisine des lecteurs de média `:193-230`, `mark` `:425-445`, objet rendu `:480-500`, `deactivate`, `dispose`),
`board-session.test.ts` (bloc en fin), `apps/web/src/ui/App.tsx` (`:120-130` et `:302-308`), `App.test.tsx` (bloc en fin).

**Interfaces.**
- Consomme : T2 `Model3dElement`, `Model3dData`, `SNAPSHOT_MIME`, commande `SetModel3dView` (`api.ts`) ; T3
  `NO_WEBGL_MESSAGE` (`model3d-import.ts`) ; T5 `ModelCamera`, `ModelFrames`, `DEFAULT_CAMERA`, `degrees`
  (`model-frames.ts`), `engine.orbitModel(id, opts): ModelOrbit | null`, `ModelOrbit`, `ModelView`, `ModelViewLoader`,
  `ModelSource`, `PixelSize`, `drawSize`, `snapshotSize`, `createModelViewLoader` (`model-view.ts`) ; T6 `Model3dBar`,
  `Model3dControls`, `Model3dBarStatus`.
- Produit (lu par T11) :
  ```ts
  // platform/model-sessions.ts
  export type ModelState = "instantane" | "chargement" | "orbite" | "sans-webgl" | "echec";
  export const MODEL3D_FAILED_MESSAGE = "objet 3D illisible sur ce poste : il garde son image";
  export interface ModelSessionDeps { readonly views: ModelViewLoader; source(id: string): ModelSource | null; px(id: string): PixelSize; redraw(): void }
  export interface ModelSessions {
    readonly frames: ModelFrames;
    open(id: string, view: ModelCamera): Promise<boolean>;
    look(id: string, v: ModelCamera): void;
    snapshot(id: string, v: ModelCamera, px: PixelSize): Promise<Blob | null>;
    current(): string | null;
    close(): void;
    state(id: string): ModelState;
    onChange(cb: () => void): () => void;
    dispose(): void;
  }
  export function createModelSessions(deps: ModelSessionDeps): ModelSessions;
  export function model3dTag(m: { readonly format: string } | null, state: ModelState | null, camera: ModelCamera | null): string;
  // app/board-session.ts
  // SessionShared gagne : readonly modelView?: ModelViewLoader;
  // BoardSession gagne : readonly models: ModelSessions; selectedModel3d(): Model3dElement | null; modelState(id: string): ModelState;
  //                      toggleOrbit(): Promise<void>; resetModelView(): Promise<void>;
  ```
- Réutilise : `apps/web/src/platform/media-players.ts` (patron des lecteurs par onglet) — nouveau module `model-sessions.ts` (`open`, `close`, `frames`, `state`, `onChange`), mais **une** séance, pas un lecteur par élément.
- Réutilise : `apps/web/src/engine/render/image-cache.ts:20` (`bitmap(asset)`) — l'instantané écrit par la session est lu par le cache d'images existant (aucun cache neuf).
- Réutilise : `apps/web/src/ui/MediaBar.tsx`, `rb.css:97-100`, `App.tsx:302-308` (enveloppe `.rb-popover .rb-media-bar`) — `<Model3dBar>` posé dans la même enveloppe, voisin de `<MediaBar>`.
- Réutilise : `apps/web/src/core/asset-store.ts:15-26` (`put`, `get`) — instantané par `assets.put`, sources du modèle par `assets.get`.
- Réutilise : `apps/web/src/engine/engine.ts:132`, `:497`, `:695` (séance modale) — appelé par `engine.orbitModel` (T5).

**Patron à ne pas reprendre (concepteur-critique).**
- `createMediaPlayers` garde un lecteur par élément et les synchronise (`media-players.ts:108-130`, `sync`) : ici une
  seule séance ; ouvrir un autre objet libère le précédent (`release`) ; aucun modèle chargé hors séance.
- `probeSelected` (`board-session.ts:398-423`) lance un travail à la simple sélection : ici **rien** n'est chargé avant
  « Tourner » ou « Vue initiale » (X20 : rouvrir un document ne charge pas three).
- L'écriture asynchrone (instantané puis commande) ne doit jamais viser un élément disparu ni écrire sans image :
  revérifier l'élément après chaque `await`, et ne rien écrire si l'instantané est null (contexte perdu).

**Code de `model-sessions.ts`.**
```ts
/**
 * Séances 3D d'un onglet (C15, X20, X22, X23, X26, DAX3) : au plus un objet chargé dans le rendu partagé (celui de la
 * séance), sa caméra courante, son image par le port `ModelFrames`, son état pour la barre et l'oracle. Rien n'est écrit
 * ici : la session écrit `SetModel3dView`.
 */
import { degrees, type ModelCamera, type ModelFrames } from "../engine/render/model-frames";
import type { LoadedModel, ModelSource, ModelView, ModelViewLoader, PixelSize } from "./model-view";

export type ModelState = "instantane" | "chargement" | "orbite" | "sans-webgl" | "echec";
export const MODEL3D_FAILED_MESSAGE = "objet 3D illisible sur ce poste : il garde son image";

export interface ModelSessionDeps {
  readonly views: ModelViewLoader;
  /** Source du modèle `id` (élément et magasin) ; null : illisible (asset absent). */
  source(id: string): ModelSource | null;
  /** Taille du rendu à l'écran pour `id` (`drawSize`). */
  px(id: string): PixelSize;
  redraw(): void;
}

export interface ModelSessions {
  readonly frames: ModelFrames;
  /** Charge l'objet `id` (libère la séance d'un autre) ; vrai s'il est prêt à tourner. */
  open(id: string, view: ModelCamera): Promise<boolean>;
  /** Caméra courante de la séance (aperçu), redessin. */
  look(id: string, v: ModelCamera): void;
  /** PNG de l'objet de la séance à la vue `v` ; null sans séance prête ou sans WebGL. */
  snapshot(id: string, v: ModelCamera, px: PixelSize): Promise<Blob | null>;
  current(): string | null;
  close(): void;
  state(id: string): ModelState;
  onChange(cb: () => void): () => void;
  dispose(): void;
}

interface Session {
  readonly id: string;
  view: ModelView | null;
  model: LoadedModel | null;
  camera: ModelCamera;
  status: "chargement" | "orbite";
}

/** `#stage[data-model3d]` (X36) : "" sans objet ; sinon `<format>;<état>;<yaw°>;<pitch°>`. */
export function model3dTag(m: { readonly format: string } | null, state: ModelState | null, camera: ModelCamera | null): string {
  if (m === null || state === null || camera === null) return "";
  return `${m.format};${state};${degrees(camera.yaw)};${degrees(camera.pitch)}`;
}

export function createModelSessions(deps: ModelSessionDeps): ModelSessions {
  let cur: Session | null = null;
  let noWebgl = false;
  let disposed = false;
  let offLost: (() => void) | null = null;
  const failed = new Set<string>();
  const listeners = new Set<() => void>();
  const emit = (): void => {
    for (const cb of [...listeners]) cb();
  };
  const release = (): void => {
    const s = cur;
    cur = null;
    if (s?.view != null && s.model !== null) s.view.release(s.model);
  };
  const unavailable = (): boolean => noWebgl || deps.views.peek()?.available() === false;
  return {
    frames: {
      frame(id) {
        const s = cur;
        if (s === null || s.id !== id || s.status !== "orbite" || s.view === null || s.model === null) return null;
        return s.view.draw(s.model, s.camera, deps.px(id));
      },
    },
    async open(id, view) {
      if (disposed) return false;
      if (cur?.id === id && cur.status === "orbite") {
        cur.camera = view;
        return true;
      }
      release();
      const s: Session = { id, view: null, model: null, camera: view, status: "chargement" };
      cur = s;
      emit();
      try {
        const v = await deps.views.load();
        if (cur !== s) return false;
        offLost ??= v.onLost(() => {
          noWebgl = true;
          release();
          emit();
          deps.redraw();
        });
        if (!v.available()) {
          noWebgl = true;
          cur = null;
          emit();
          return false;
        }
        const src = deps.source(id);
        if (src === null) throw new Error("source de l'objet 3D absente");
        const m = await v.load(src);
        if (cur !== s) {
          v.release(m);
          return false;
        }
        s.view = v;
        s.model = m;
        s.status = "orbite";
        failed.delete(id);
        emit();
        deps.redraw();
        return true;
      } catch {
        if (cur === s) cur = null;
        failed.add(id);
        emit();
        return false;
      }
    },
    look(id, v) {
      if (cur?.id !== id) return;
      cur.camera = v;
      deps.redraw();
    },
    async snapshot(id, v, px) {
      const s = cur;
      if (s === null || s.id !== id || s.view === null || s.model === null) return null;
      return s.view.snapshot(s.model, v, px);
    },
    current: () => cur?.id ?? null,
    close() {
      if (cur === null) return;
      release();
      emit();
      deps.redraw();
    },
    state(id) {
      if (cur?.id === id) return cur.status;
      if (unavailable()) return "sans-webgl";
      return failed.has(id) ? "echec" : "instantane";
    },
    onChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    dispose() {
      disposed = true;
      release();
      offLost?.();
      listeners.clear();
    },
  };
}
```

**Code de la session** (`board-session.ts`, ajouts localisés).
```ts
// SessionShared :
  /** C15 (DAX3) : rendu 3D partagé, chargé au premier « Tourner » ; absent : objets 3D dessinés par leur instantané, « echec » au clic. */
  readonly modelView?: ModelViewLoader;
// voisin des lecteurs de média :
  const views = shared.modelView ?? createModelViewLoader(async () => { throw new Error("rendu 3D absent"); });
  const models = createModelSessions({
    views,
    source(id) {
      const e = doc.element(id);
      if (e === null || e.kind !== "model3d") return null;
      const main = assets.get(e.model3d.asset);
      if (main === undefined) return null;
      const files = new Map<string, Blob>();
      for (const f of e.model3d.files) {
        const b = assets.get(f.asset);
        if (b !== undefined) files.set(f.path, b);
      }
      return { format: e.model3d.format, name: doc.asset(e.model3d.asset)?.name ?? "objet 3D", main, files };
    },
    px(id) {
      const e = doc.element(id);
      if (e === null || e.kind !== "model3d") return { w: 1, h: 1 };
      const [a, b, c, d] = e.transform;
      const zoom = engine.camera().zoom;
      return drawSize(e.model3d.w * Math.hypot(a, b) * zoom, e.model3d.h * Math.hypot(c, d) * zoom, globalThis.devicePixelRatio ?? 1);
    },
    redraw: () => redraw(),
  });
  undo.push(() => models.dispose());
// options du rendu (chooseRenderer) : `models: models.frames,` à côté de `media: players,`
// après la création du moteur :
  let orbit: ModelOrbit | null = null;
  const selectedModel3d = (): Model3dElement | null => {
    const sel = engine.state().selection; // même lecture que `selectedMedia` (:368-372)
    if (sel.length !== 1) return null;
    const e = doc.element(sel[0]!);
    return e !== null && e.kind === "model3d" && (e.group === undefined || e.group.length === 0) ? e : null;
  };
  const markModel3d = (): void => {
    const m = selectedModel3d();
    const camera = m === null ? null : orbit?.id === m.id ? orbit.view() : { yaw: m.model3d.yaw, pitch: m.model3d.pitch };
    stage.dataset["model3d"] = model3dTag(m?.model3d ?? null, m === null ? null : models.state(m.id), camera);
  };
  const closeOrbit = (): void => {
    orbit?.close(); // `closed` libère la séance et remet l'oracle à jour
  };
  /** Instantané puis `SetModel3dView` (une étape) ; rien si l'élément a disparu ou si l'image manque (contexte perdu). */
  const commitView = async (id: string, v: ModelCamera): Promise<void> => {
    const e = doc.element(id);
    if (e === null || e.kind !== "model3d") return;
    const png = await models.snapshot(id, v, snapshotSize(e.model3d.w, e.model3d.h));
    const now = doc.element(id);
    if (png === null || now === null || now.kind !== "model3d") {
      if (now === null) closeOrbit();
      return;
    }
    const snapshot = { id: await assets.put(png), name: `${doc.asset(now.model3d.asset)?.name ?? "objet 3D"}.png`, mime: SNAPSHOT_MIME, size: png.size };
    if (doc.element(id) === null) {
      closeOrbit();
      return;
    }
    engine.run({ type: "SetModel3dView", id, yaw: v.yaw, pitch: v.pitch, snapshot });
  };
  const toggleOrbit = async (): Promise<void> => {
    const m = selectedModel3d();
    if (m === null) return;
    if (orbit !== null && orbit.id === m.id) {
      closeOrbit();
      return;
    }
    closeOrbit(); // une orbite ouverte sur un autre objet : fermée avant d'en charger un autre
    const start: ModelCamera = { yaw: m.model3d.yaw, pitch: m.model3d.pitch };
    const ready = await models.open(m.id, start);
    if (!ready || selectedModel3d()?.id !== m.id) {
      if (ready) models.close();
      markModel3d();
      return;
    }
    orbit = engine.orbitModel(m.id, {
      view: start,
      onView: (v) => {
        models.look(m.id, v);
        markModel3d();
      },
      onCommit: (v) => void commitView(m.id, v),
      closed: () => {
        orbit = null;
        if (models.current() === m.id) models.close(); // jamais le modèle d'une séance plus récente
        markModel3d();
      },
    });
    markModel3d();
  };
  const resetModelView = async (): Promise<void> => {
    const m = selectedModel3d();
    if (m === null) return;
    if (orbit !== null && orbit.id === m.id) {
      orbit.reset();
      return;
    }
    const d = m.model3d;
    if (d.yaw === DEFAULT_CAMERA.yaw && d.pitch === DEFAULT_CAMERA.pitch && d.snapshot !== null) return;
    if (!(await models.open(m.id, DEFAULT_CAMERA))) {
      markModel3d();
      return;
    }
    await commitView(m.id, DEFAULT_CAMERA);
    models.close();
  };
  const offModels = models.onChange(markModel3d);
// dans `mark(s)` : sur changement de version (branche `s.version !== markedVersion`), fermer l'orbite si l'élément a
// disparu ou si sa vue n'est plus celle de la séance (annulation, rétablissement d'ailleurs) :
      if (orbit !== null) {
        const e = doc.element(orbit.id);
        const v = orbit.view();
        if (e === null || e.kind !== "model3d" || e.model3d.yaw !== v.yaw || e.model3d.pitch !== v.pitch) closeOrbit();
      }
// et toujours, avant `markMedia()` :
      if (orbit !== null && selectedModel3d()?.id !== orbit.id) closeOrbit();
      markModel3d();
// deactivate : closeOrbit(); — dispose : closeOrbit(); offModels(); (models.dispose est dans `undo`/dispose comme players)
// objet rendu : models, selectedModel3d, modelState: (id) => models.state(id), toggleOrbit, resetModelView,
```
(Les noms `engine.state().selection`, `redraw`, `undo`, `assets`, `stage` sont ceux du fichier ; reprendre exactement la
lecture de la sélection de `selectedMedia` `:368-372`.)

**Code d'`App.tsx`** (voisin du média) :
```tsx
import { Model3dBar, type Model3dControls } from "./Model3dBar";
import { NO_WEBGL_MESSAGE } from "../platform/model3d-import";
import { MODEL3D_FAILED_MESSAGE } from "../platform/model-sessions";

  /** Objet 3D seul sélectionné de l'onglet actif (C15, X24) ; relu à chaque état du moteur et changement d'onglet. */
  const selectedModel3d = () => {
    tick();
    state();
    return ws.active().board.selectedModel3d();
  };
  /** Commandes de la barre 3D : toujours sur la session active et l'objet sélectionné au moment du geste. */
  const model3dControls: Model3dControls = {
    status: () => {
      const b = ws.active().board;
      const m = b.selectedModel3d();
      return m === null ? "instantane" : b.modelState(m.id);
    },
    message: () => {
      const s = model3dControls.status();
      return s === "sans-webgl" ? NO_WEBGL_MESSAGE : s === "echec" ? MODEL3D_FAILED_MESSAGE : null;
    },
    toggle: () => void ws.active().board.toggleOrbit(),
    reset: () => void ws.active().board.resetModelView(),
  };
// après le <Show when={selectedMedia()}> :
      <Show when={selectedModel3d()}>
        {(m) => (
          <div class="rb-popover rb-media-bar">
            <Model3dBar name={ws.active().board.doc.asset(m().model3d.asset)?.name ?? "Objet 3D"} controls={model3dControls} />
          </div>
        )}
      </Show>
```

**Tests rouges à écrire.**
- `model-sessions.test.ts`, `describe("séances 3D (C15, DAX3)")`, vue factice (`available`, `load`, `draw` → un objet
  repère, `snapshot`, `release`, `onLost` qui garde le rappel) et `createModelViewLoader(async () => view)` :
  1. « open : chargement puis orbite ; frame(id) = image du rendu, frame(autre) null ; un seul chargement du rendu »
  2. « ouvrir un autre objet libère le premier (un modèle à la fois) »
  3. « close : modèle libéré, frame null, état instantane, redraw demandé »
  4. « rendu indisponible : open faux, sans-webgl pour tous les objets, aucun load du modèle (X26, PC4) »
  5. « load du modèle rejeté ou source absente : echec pour cet objet seulement »
  6. « contexte perdu : sans-webgl, séance fermée, un seul message » (rappel `onLost` : `release` une fois, `onChange`
     une fois, `state` = `sans-webgl`, `current()` null)
  7. « look : caméra de la séance ; frame dessine à cette caméra et à la taille px(id) »
  8. « open remplacé pendant le chargement : le modèle arrivé en retard est libéré »
  9. « model3dTag : vide sans objet ; « glb;orbite;87;20 » (X36) »
- `board-session.test.ts`, `describe("session — objets 3D (C15)")`, patron du bloc « session — médias (C14) » (fausse
  liaison T2, `SessionShared.modelView` factice ; objet ajouté par `AddModel3d` puis sélectionné) :
  1. « data-model3d vide sans objet 3D ; « glb;instantane;30;20 » sélectionné ; aucun chargement du rendu (X20, X36) »
  2. « toggleOrbit : orbite, le port rend l'image ; Tourner à nouveau : instantane, modèle libéré »
  3. « orbite validée : instantané puis SetModel3dView en une étape ; annuler : ancienne vue et ancien instantané, séance fermée (S2) »
     (geste par `engine.sink.begin/extend/close` de 100 px : `data-model3d` « glb;orbite;87;20 » avant le relâché)
  4. « commit après suppression : aucune commande, séance fermée » (suppression entre le relâché et la fin de `snapshot`)
  5. « sans WebGL : sans-webgl après le premier Tourner, aucune séance (S5, PC4) »
  6. « changement de sélection, de page, deactivate : séance fermée (X23) »
  7. « Vue initiale sans séance : vue par défaut et instantané en une étape ; déjà à la vue par défaut avec instantané : aucune étape »
- `App.test.tsx`, `describe("App : barre 3D (C15)")`, patron « App : barre du média (C14) » :
  1. « barre visible pour un objet 3D seul sélectionné, absente pour un groupe ou un autre élément »
  2. « Tourner et Vue initiale appellent la session active »
  3. « sans WebGL : message « 3D indisponible sur ce poste : l'objet garde son image », boutons grisés »

**Test et commande bornée.**
```bash
cd "$WT" && pnpm --filter @roomboard/web exec vitest run src/platform/model-sessions.test.ts src/app/board-session.test.ts src/ui/App.test.tsx src/ui/MediaBar.test.tsx src/ui/Model3dBar.test.tsx --reporter=verbose 2>&1 | grep -E "C15|×|FAIL|Test Files|Tests " | tail -50
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"
```
Attendu : « séances 3D (C15, DAX3) » 9, « session — objets 3D (C15) » 7, « App : barre 3D (C15) » 3, 0 `×` ; blocs
C14 (médias) verts ; `tsc` vide.

**Contraintes (recopiées).**
- GC1 TDD : test rouge d'abord, vu rouge ; aucun test sauté ni désactivé, aucun seuil baissé ; délai : rejoué une fois, jamais relevé.
- GC2 `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; aucun build Tauri.
- GC3 Préparation : `cd "$WT" && pnpm install --frozen-lockfile` ; wasm : `mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c15-3d/apps/web/src/wasm/* apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c15-3d/apps/web/src/wasm-formats/* apps/web/src/wasm-formats/`.
- GC4 Si `grep -q add_model3d apps/web/src/wasm/roomboard_wasm.d.ts` échoue : `[ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c15-3d/target . ; cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm` ; plafond 1 572 864 o ni baissé ni relevé.
- GC5 Module `formats` intouché. GC7 Aucune dépendance neuve. GC8 Vitest borné ; `tsc` vide.
- GC9 Commits : `git add <chemin>` un par un ; jamais `git add -A`/`--all`/`.`, `git commit -a`, `--force`, `git stash` nu ; auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, sans pousser.
- GC11 Scène ≥ 640 px : barre flottante seulement, aucune rangée ; dans `src/ui` aucun `switch`, aucun `px` ; `SelectionRow.tsx`, `Toolbar.tsx`, `toolbar-host.ts`, `stage-tags.ts`, `EngineState` non touchés.
- GC14 Aucun processus laissé. GC15 `board-session.ts`, `App.tsx` : ajouts localisés voisins du média.
- GC16 Cinq lignes `Réutilisation :` au rapport. GC17 Aucun import de three ni de `model-view-three.ts` (l'amorce, T11, branche le vrai rendu).

**Interdits.** Aucun chargement du rendu à l'ouverture ni à la sélection ; ne pas toucher `media-players.ts`,
`MediaBar.tsx`, `rb.css`, `main.ts`, `workspace.ts` (T11) ; aucune commande écrite sans instantané.

**Critère « terminé ».** Commande bornée verte, `tsc` vide, trois commits.

**Étapes.**
- [ ] 1. `model-sessions.test.ts` rouge ; `model-sessions.ts` ; vert ; commit `feat(platform): one shared 3D session per tab`.
- [ ] 2. Bloc « session — objets 3D » rouge ; `board-session.ts` ; vert avec les blocs C14 ; commit
  `feat(session): orbit a selected 3D object, snapshot and one undo step per orbit`.
- [ ] 3. Bloc « App : barre 3D » rouge ; `App.tsx` ; vert ; commit `feat(ui): show the 3D bar for a selected 3D object`.
- [ ] 4. Rapport.

<a id="tache-t11"></a>

### Tâche T11 — Amorce (`main.ts`, `workspace.ts`), essai e2e C15 dans `verifier.sh --e2e`, capture d'un objet tourné

**Objectif.** Brancher le vrai rendu et le lecteur ZIP dans l'amorce (X20 : `import()` au premier besoin), passer
`model3d` à l'importeur et `modelView` aux sessions, puis prouver S1-S5 au navigateur : essai
`scripts/essais/c15-3d-navigateur.mjs` lancé par `verifier.sh --e2e` (Chromium + SwiftShader ; second passage sans
WebGL), capture `docs/essais/c15-3d-orbite.png`, contrôle hors ligne et licences sur le `dist`.

**Fichiers.** Modifier `apps/web/src/main.ts` (`shared` `:141-144`, `createWorkspace` `:208-238`),
`apps/web/src/app/workspace.ts` (`WorkspaceDeps` `:60-104`, `createImporter` `:329-345`), `workspace.test.ts` (bloc en
fin), `scripts/essais/commun.mjs` (`dropFiles` et `zipEntries` après `dropFile` `:144-154`), `scripts/verifier.sh:108`,
`scripts/tests/verifier-e2e.test.sh:13`. Créer `scripts/essais/c15-3d-navigateur.mjs`, `docs/essais/c15-3d-orbite.png`.

**Interfaces.**
- Consomme : T1 (`three`, `fflate`, morceau `three`, CSP) ; T5 `createModelViewLoader` ; T7 `createThreeModelView` ;
  T8 `Model3dDeps`, `createZipReader`, `zip-worker.ts` ; T10 `SessionShared.modelView`, `#stage[data-model3d]`,
  `[data-model3d-bar]`, `[data-model3d="orbit"|"reset"|"message"]` ; T2-T9 pour tout le reste.
- Produit : `WorkspaceDeps.model3d?: Model3dDeps` ; `commun.mjs` : `dropFiles(page, selector, files, at)` avec
  `files: Array<{ name: string; bytes: Uint8Array | Buffer; type?: string }>`, `zipEntries(buf: Buffer): Map<string, Buffer>` ;
  essai « C15 3D : OK ».
- Réutilise : `apps/web/src/platform/pdf-load.ts:37` et `apps/web/vite.config.ts:47` (`import()` mémorisé, `chunkOf`) — `createModelViewLoader(() => import("./platform/model-view-three"))`, morceau `three` de T1.
- Réutilise : `apps/web/src/platform/one-shot-worker.ts:18` (`runOnce`) — via `createZipReader(spawnZipWorker)`, patron de `spawnSheetWorker` (`main.ts:165`).
- Réutilise : `scripts/essais/commun.mjs:144` (`dropFile`), `:186` (`rgbPng`), `:160` (`coqueCsp`), `:102` (`stageBox`), `:111` (`stageMouse`) — `dropFiles` voisin de `dropFile` ; `zipEntries` recopié de `c14-media-navigateur.mjs:104-127` dans `commun.mjs` (les copies de C2 et C14 restent, hors périmètre).

**Code de l'amorce.**
```ts
// main.ts
import { createModelViewLoader } from "./platform/model-view";
import { createZipReader } from "./platform/zip-read";
// avant `shared` :
  // Objets 3D (C15, X20, DAX3) : three chargé au premier dépôt 3D ou au premier « Tourner », jamais au démarrage.
  const modelView = createModelViewLoader(async () => (await import("./platform/model-view-three")).createThreeModelView());
  const spawnZipWorker = (): WorkerLike => asWorkerLike(new Worker(new URL("./platform/zip-worker.ts", import.meta.url), { type: "module" }));
// shared : `modelView,` ajouté ;
// createWorkspace : `model3d: { view: () => modelView.load(), readZip: createZipReader(spawnZipWorker) },`
```
```ts
// workspace.ts
import type { Model3dDeps } from "../platform/model3d-handlers";
// WorkspaceDeps :
  /** C15 (X39) : rendu 3D partagé et lecteur de ZIP pour l'import ; absent : fichiers 3D refusés comme avant. */
  readonly model3d?: Model3dDeps;
// createImporter : `...(deps.model3d ? { model3d: deps.model3d } : {}),`
```
`workspace.test.ts`, `describe("espace de travail : objets 3D (C15)")` : « un .glb déposé atteint model3d.view de
l'importeur » (vue factice, `importFiles` d'un GLB de `model3d-fixtures.ts` : `view` appelé, `AddModel3d` écrite) ;
« sans model3d : .glb refusé comme avant ».

**Code de `commun.mjs`.**
```js
/** Dépôt simulé de plusieurs fichiers ensemble (C15, X13) : un seul DataTransfer, un seul `drop`. */
export async function dropFiles(page, selector, files, at = [50, 50]) {
  await page.evaluate(({ selector, files, at }) => {
    const dt = new DataTransfer();
    for (const f of files) dt.items.add(new File([new Uint8Array(f.bytes)], f.name, { type: f.type ?? "" }));
    const target = document.querySelector(selector);
    const r = target.getBoundingClientRect();
    for (const t of ["dragover", "drop"]) {
      target.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.x + at[0], clientY: r.y + at[1] }));
    }
  }, { selector, files: files.map((f) => ({ name: f.name, type: f.type ?? "", bytes: Array.from(f.bytes) })), at });
}
```
plus `zipEntries` recopié tel quel de `c14-media-navigateur.mjs:104-127` (avec `import { inflateRawSync } from "node:zlib";`
s'il manque).

**Code de l'essai `c15-3d-navigateur.mjs`** (structure de `c14-media-navigateur.mjs` : `main`, `scenario`, `check`,
`until`, `download`, `messageSeen`, `centerPixel`, `press`, `blur` recopiés de `:138-215` avec `data-model3d` au lieu de
`data-media`).
```js
#!/usr/bin/env node
// Essai C15 3D au navigateur (S1 à S5 du cadrage) : déposer un GLB fabriqué ici, le sélectionner, « Tourner », l'orbiter
// de 100 px, désélectionner et voir l'instantané, annuler ; déposer OBJ + MTL ensemble, un .obj seul (avertissement),
// un STL, un PLY et un ZIP (glTF + .bin + PNG) ; enregistrer, relire les assets du .roomboard ; second passage sans
// WebGL : rouvrir le fichier (instantanés dessinés, three non chargé), « Tourner » grisé et message, déposer un GLB
// (carte « Objet 3D »). Application servie en local avec la CSP de la coque, Chromium headless + SwiftShader.
// Modèles fabriqués ici (jamais téléchargés). Code : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/c15-3d-navigateur.mjs [--captures] (docs/essais/c15-3d-orbite.png).
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, dropFile, dropFiles, frames, gitSha, item, loadPlaywright, rgbPng, serve, stageBox, stageMouse, zipEntries } from "./commun.mjs";

const LABEL = "C15 3D";
const FIXED = new Date("2026-11-21T08:00:00.000Z");
const PRE_C15 = join(ROOT, "crates", "roomboard-core", "tests", "fixtures", "image-c2.roomboard");
const LAZY = /\/assets\/three-[^/]*\.js/;
const SWIFTSHADER = ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-angle=swiftshader"]; // s2-navigateur.mjs:24
const { zipSync } = createRequire(join(ROOT, "apps", "web", "package.json"))("fflate");
const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const enc = (s) => Buffer.from(s, "utf8");

/** GLB 2.0 (blocs JSON puis BIN alignés sur 4), comme `model3d-fixtures.ts`. */
function glb(json, bin) {
  const j = enc(JSON.stringify(json));
  const jl = Math.ceil(j.length / 4) * 4;
  const bl = Math.ceil(bin.length / 4) * 4;
  const out = Buffer.alloc(20 + jl + 8 + bl);
  out.writeUInt32LE(0x46546c67, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(jl, 12);
  out.writeUInt32LE(0x4e4f534a, 16);
  j.copy(out, 20);
  out.fill(0x20, 20 + j.length, 20 + jl);
  out.writeUInt32LE(bl, 20 + jl);
  out.writeUInt32LE(0x004e4942, 24 + jl);
  bin.copy(out, 28 + jl);
  return out;
}
/** Cube à faces de couleurs franches (24 sommets, une couleur par face) : l'orbite change les couleurs vues. */
function cubeGlb() {
  const faces = [
    { n: [0, 0, 1], c: [1, 0, 0], v: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
    { n: [0, 0, -1], c: [0, 1, 0], v: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
    { n: [1, 0, 0], c: [0, 0, 1], v: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]] },
    { n: [-1, 0, 0], c: [1, 1, 0], v: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] },
    { n: [0, 1, 0], c: [1, 0, 1], v: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]] },
    { n: [0, -1, 0], c: [0, 1, 1], v: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] },
  ];
  const pos = new Float32Array(faces.flatMap((f) => f.v.flat()));
  const nor = new Float32Array(faces.flatMap((f) => f.v.flatMap(() => f.n)));
  const col = new Float32Array(faces.flatMap((f) => f.v.flatMap(() => f.c)));
  const ind = new Uint16Array(faces.flatMap((_, i) => [0, 1, 2, 0, 2, 3].map((k) => 4 * i + k)));
  const bin = Buffer.concat([pos, nor, col, ind].map((a) => Buffer.from(a.buffer)));
  const views = [[0, 288], [288, 288], [576, 288], [864, 72]];
  return glb({
    asset: { version: "2.0" }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, indices: 3 }] }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: views.map(([o, l]) => ({ buffer: 0, byteOffset: o, byteLength: l })),
    accessors: [
      { bufferView: 0, componentType: 5126, count: 24, type: "VEC3", min: [-1, -1, -1], max: [1, 1, 1] },
      { bufferView: 1, componentType: 5126, count: 24, type: "VEC3" },
      { bufferView: 2, componentType: 5126, count: 24, type: "VEC3" },
      { bufferView: 3, componentType: 5123, count: 36, type: "SCALAR" },
    ],
  }, bin);
}
const cubeObj = (mtl) => enc(`${mtl ? `mtllib ${mtl}\nusemtl bleu\n` : ""}v -1 -1 -1\nv 1 -1 -1\nv 1 1 -1\nv -1 1 -1\nv -1 -1 1\nv 1 -1 1\nv 1 1 1\nv -1 1 1\nf 1 4 3 2\nf 5 6 7 8\nf 1 2 6 5\nf 3 4 8 7\nf 2 3 7 6\nf 1 5 8 4\n`);
const cubeMtl = () => enc("newmtl bleu\nKd 0 0 1\nKa 0 0 1\n");
function stlBinary() {
  const v = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const tris = [[0, 2, 1], [0, 1, 3], [0, 3, 2], [1, 2, 3]];
  const out = Buffer.alloc(84 + tris.length * 50);
  out.writeUInt32LE(tris.length, 80);
  tris.forEach((t, i) => t.forEach((k, j) => v[k].forEach((c, n) => out.writeFloatLE(c, 84 + i * 50 + 12 + j * 12 + n * 4))));
  return out;
}
const plyAscii = () => enc(["ply", "format ascii 1.0", "element vertex 4", "property float x", "property float y", "property float z", "property uchar red", "property uchar green", "property uchar blue", "element face 4", "property list uchar int vertex_indices", "end_header", "0 0 0 255 0 0", "1 0 0 0 255 0", "0 1 0 0 0 255", "0 0 1 255 255 0", "3 0 2 1", "3 0 1 3", "3 0 3 2", "3 1 2 3", ""].join("\n"));
/** glTF + .bin + texture PNG (8 × 8, orange) dans un sous-dossier d'un ZIP écrit par fflate (X37). */
function modelZip() {
  const pos = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);
  const uv = new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]);
  const ind = new Uint16Array([0, 1, 2, 0, 2, 3]);
  const bin = Buffer.concat([pos, uv, ind].map((a) => Buffer.from(a.buffer)));
  const png = rgbPng(8, 8, () => [255, 128, 0]);
  const gltf = enc(JSON.stringify({
    asset: { version: "2.0" }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, indices: 2, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0 }, doubleSided: true }],
    textures: [{ source: 0 }], images: [{ uri: "tex/orange.png" }],
    buffers: [{ uri: "carre.bin", byteLength: bin.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 48 }, { buffer: 0, byteOffset: 48, byteLength: 32 }, { buffer: 0, byteOffset: 80, byteLength: 12 }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 4, type: "VEC3", min: [-1, -1, 0], max: [1, 1, 0] },
      { bufferView: 1, componentType: 5126, count: 4, type: "VEC2" },
      { bufferView: 2, componentType: 5123, count: 6, type: "SCALAR" },
    ],
  }));
  const zip = Buffer.from(zipSync({ "modele/carre.gltf": gltf, "modele/carre.bin": bin, "modele/tex/orange.png": png }));
  return { zip, gltf, bin, png };
}
```
Scénario (`scenario(page, url, opts)`, oracles : `#stage[data-model3d|data-elements|data-version|data-bounds|data-camera]`,
pixels de `#scene` par `centerPixel`, requêtes vues par `page.on("request")`, entrées du `.roomboard`) :
1. Ouvrir `?fichiers=repli` ; `stageBox(page, 640)` : `check(box.height >= 640, "scène de N px (≥ 640)")` ;
   `check(!requests.some((u) => LAZY.test(u)), "S1 : aucun morceau three- avant le premier dépôt 3D")`.
2. S1 : `dropFile(page, "#stage", "cube.glb", cubeGlb(), "model/gltf-binary", [400, 300])` ; attendre
   `data-elements = 1` ; `check(requests.some((u) => LAZY.test(u)), "S1 : three chargé au dépôt")`.
3. S2 : `page.click(item("select"))`, clic au centre de l'objet (calculé de `data-bounds` et `data-camera` comme
   `centerPixel`) ; `data-model3d` = `glb;instantane;30;20` ; `[data-model3d-bar]` visible ; `stageBox(page, 640)` encore
   ≥ 640 ; pixel central ni blanc ni `#e5e7eb` (instantané coloré) → `before`.
   Clic `[data-model3d="orbit"]` ; attendre `data-model3d` état `orbite`. Glisser : `mouse.move(cx, cy)`, `mouse.down()`,
   `mouse.move(cx + 100, cy, { steps: 10 })` ; **avant** le relâché, `data-model3d` = `glb;orbite;87;20` (yaw + 57°).
   Avec `--captures` : `page.screenshot({ path: join(ROOT, "docs", "essais", "c15-3d-orbite.png") })`.
   `mouse.up()` ; attendre `data-version` + 1. Cliquer à côté (zone vide de la page) : `data-model3d` = "" ; pixel
   central ≠ `before` (instantané de la nouvelle vue). Ctrl+Z (`press("Control+z")`) : `data-version` revient ;
   resélectionner : `glb;instantane;30;20` (« une étape ») ; Ctrl+Y : `glb;instantane;87;20`.
4. S3 : `dropFiles(page, "#stage", [{ name: "cube.obj", bytes: cubeObj("cube.mtl") }, { name: "cube.mtl", bytes: cubeMtl() }], [200, 520])` ;
   `data-elements = 2` ; aucun message « déposé sans son .mtl » ni « fichier lié d'un modèle 3D » après 2 images ;
   pixel central de l'objet (sélectionné) dont la composante bleue domine (b > r + 40 et b > g + 40).
   `dropFile(… "seul.obj", cubeObj(null) …)` : `messageSeen("déposé sans son .mtl")`, `data-elements = 3`.
   `piece.stl`, `nuage.ply`, `modele.zip` (`modelZip().zip`, type `application/zip`) : `data-elements = 6`, aucun message
   « aucun modèle 3D dans ce ZIP ».
5. S4 : `blur()`, `download(() => page.keyboard.press("Control+s"), "c15.roomboard")`, `zipEntries` ; présents avec les
   octets exacts : `assets/${sha256(cubeGlb())}.bin`, `assets/${sha256(cubeObj("cube.mtl"))}.bin`, `assets/${sha256(cubeMtl())}.bin`,
   `assets/${sha256(gltf)}.bin`, `assets/${sha256(bin)}.bin`, `assets/${sha256(png)}.png` ; au moins 7 entrées `assets/*.png`
   (texture + 6 instantanés). Fichier gardé pour le passage 2.
6. S5 (second contexte, `context.addInitScript` : `HTMLCanvasElement.prototype.getContext` rend `null` pour `webgl`,
   `webgl2`, `experimental-webgl`, l'original sinon ; même route qui bloque tout hôte autre que 127.0.0.1) : nouvelle
   page, `requests` vidé ; déposer `c15.roomboard` : nouvel onglet, `data-elements = 6` ;
   `check(!requests.some(LAZY), "S4 : rouvert et dessiné sans charger three")` ; sélectionner l'objet du GLB :
   `glb;instantane;87;20` (vue gardée) et pixel central coloré (instantané dessiné). Clic « Tourner » : attendre l'état
   `sans-webgl` ; `[data-model3d="orbit"]` désactivé ; `[data-model3d="message"]` = « 3D indisponible sur ce poste :
   l'objet garde son image ». Déposer `cube.glb` dans cet onglet : `data-elements = 7`, pixel central de l'objet neuf
   ≈ `#e5e7eb` (carte « Objet 3D », écart ≤ 8 par composante), `messageSeen("3D indisponible sur ce poste")`.
7. Fichier d'avant C15 : déposer `image-c2.roomboard` : nouvel onglet, éléments ≥ 1, `data-model3d` vide.
8. `check(errors.length === 0, "aucune erreur dans la page")` dans les deux passages ; `external` vide.
`main()` : comme `c14-media-navigateur.mjs:356-402`, avec `pw.chromium.launch({ args: SWIFTSHADER })`, `LABEL`, et le
second contexte décrit en 6 (`browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, acceptDownloads: true })`).

**`verifier.sh` et son test.** Après `node scripts/essais/c14-media-navigateur.mjs` et `echo "C14 média : OK"` :
```bash
  node scripts/essais/c15-3d-navigateur.mjs
  echo "C15 3D : OK"
```
`verifier-e2e.test.sh:13` : ajouter `c15-3d-navigateur` à la liste. Aucune option de capture dans `verifier.sh`.

**Test et commande bornée.**
```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
pnpm --filter @roomboard/web exec vitest run src/app/workspace.test.ts --reporter=verbose 2>&1 | grep -E "C15|×|FAIL|Tests " | tail -10
bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3
bash scripts/verifier.sh --e2e 2>&1 | tail -100
node scripts/controle-hors-ligne.mjs apps/web/dist apps/desktop/src-tauri/tauri.conf.json; echo "hors ligne $?"
node scripts/controle-licences.mjs; echo "licences $?"
ls apps/web/dist/assets | grep -c '^three-'
wc -c apps/web/src/wasm/roomboard_wasm_bg.wasm apps/web/src/wasm-formats/*_bg.wasm
git diff --stat origin/main -- crates/roomboard-formats crates/roomboard-formats-wasm
node scripts/essais/c15-3d-navigateur.mjs --captures 2>&1 | tail -40 && ls -l docs/essais/c15-3d-orbite.png
```
Attendu : « espace de travail : objets 3D (C15) » 2 tests ; `verifier-e2e.test.sh : OK` ; dans la sortie de
`verifier.sh --e2e` : chaque `ok — …` de S1-S5, « C15 3D : OK », les 15 essais d'avant « : OK » (dont « C14 média : OK »),
« verifier.sh : e2e OK », « verifier.sh : OK » ; `hors ligne 0`, `licences 0` ; ≥ 1 morceau `three-` ; module principal
≤ 1 572 864 o, module `formats` à la taille de `main` (3 099 350 o) et diff vide ; capture présente. Relever au rapport la
taille du morceau `three-*.js` (X19 : ≈ 650 Ko minifié attendu) et la hauteur de scène mesurée.

**Contraintes (recopiées).**
- GC1 TDD : l'essai écrit avant le branchement de l'amorce, vu en échec ; aucun test sauté ni désactivé, aucun seuil baissé ; un essai qui échoue sur un délai est rejoué une fois, aucun délai relevé.
- GC2 `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; aucun build Tauri (`tauri build`, ni `cargo build`/`check` dans `apps/desktop/src-tauri`).
- GC3 Préparation : `cd "$WT" && pnpm install --frozen-lockfile` ; `[ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c15-3d/target .` ; wasm : `mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c15-3d/apps/web/src/wasm/* apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c15-3d/apps/web/src/wasm-formats/* apps/web/src/wasm-formats/` (`verifier.sh` reconstruit le module).
- GC4 Plafond du module principal 1 572 864 o ni baissé ni relevé ; seuils de `verifier.sh` inchangés.
- GC5 Module `formats` intouché : aucun octet ajouté (diff vide, taille de `main`).
- GC6 Hors ligne : `scripts/controle-hors-ligne.mjs` vert sur le `dist` ; aucune requête hors de 127.0.0.1 dans l'essai.
- GC7 Licences : `node scripts/controle-licences.mjs` rend 0 ; aucune dépendance neuve ici (fflate est lu depuis `apps/web`).
- GC8 Vitest borné ; `tsc` vide (`verifier.sh` le vérifie).
- GC9 Commits : `git add <chemin>` un par un ; jamais `git add -A`/`--all`/`.`, `git commit -a`, `--force`, `git stash` nu ; auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, sans pousser.
- GC11 Scène ≥ 640 px mesurée et relevée au rapport.
- GC13 Modèles fabriqués dans l'essai (octets écrits à la main, `zipSync`), jamais téléchargés ; seule la capture PNG est commitée.
- GC14 Aucun processus laissé (serveur, navigateur, `vite`) : `finally` de `main()` ferme tout.
- GC15 `verifier.sh` : deux lignes ; `commun.mjs` : deux fonctions ajoutées ; les autres essais non touchés.
- GC16 Trois lignes `Réutilisation :` au rapport. GC17 L'amorce importe `model-view-three` par `import()` seulement.

**Interdits.** Aucune option de capture dans `verifier.sh` ; aucun `recordVideo`, aucun ffmpeg ; aucun build Tauri ;
aucun délai relevé dans les essais existants ; ne pas modifier les autres `*-navigateur.mjs`.

**Critère « terminé ».** Toutes les sorties attendues ci-dessus ; capture commitée ; trois commits.

**Étapes.**
- [ ] 1. `commun.mjs` (`dropFiles`, `zipEntries`), `c15-3d-navigateur.mjs` ; `pnpm -r build` puis
  `node scripts/essais/c15-3d-navigateur.mjs` : échec attendu (rien n'importe la 3D) ; commit
  `test(e2e): C15 3D browser trial (S1-S5)`.
- [ ] 2. `workspace.test.ts` rouge ; `workspace.ts`, `main.ts` ; vert ; `pnpm -r build` ; essai vert ; commit
  `feat(app): wire the lazy three.js view and the ZIP worker`.
- [ ] 3. `verifier.sh`, `verifier-e2e.test.sh` ; `bash scripts/verifier.sh --e2e` vert ; essai `--captures` ; regarder la
  capture (cube coloré tourné, barre 3D visible, scène entière) ; commit `test(e2e): run the C15 3D trial in verifier.sh --e2e`
  avec `git add docs/essais/c15-3d-orbite.png`.
- [ ] 4. Rapport : sorties, tailles (deux modules, morceau `three`), hauteur de scène, description de la capture, lignes
  `Réutilisation :`.
