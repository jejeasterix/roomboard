# C13 lots 2 et 3 — `.notebook`, `.olf`, puis `.flipchart` : plan d'exécution

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**Goal :** un `.notebook` (SMART) et un `.olf` (myViewBoard) — lot 2, fusionnable seul —, puis un `.flipchart`
(ActivInspire) — lot 3 — déposés ou ouverts deviennent un onglet `<nom>.roomboard` avec l'avis de ce qui n'est pas lu.
Import seul (N2).

**Architecture :** `.notebook` = ZIP (Worker ZIP) + pages SVG lues par le lecteur commun `read_svg` en dialecte
`Notebook`, ordre par `notebook_order` (Rust). `.olf` = ZIP + `content.json` lu en TypeScript (`readOlf`, DA3).
`.flipchart` = conteneur Bamboo décompressé en TypeScript dans le Worker ZIP (`readBamboo`, DA4), objets lus en Rust
(`roomboard-formats::flipchart`, DA5). Les trois finissent en `BoardListPage[]` puis `buildBoardDocument` (lot 1).

**Tech Stack :** Rust (`quick-xml` déjà présent), wasm-bindgen, TypeScript (vitest), fflate (`Unzlib`), Playwright.

**Spec :** `docs/plans/usage-c13-lots2-3-cadrage.md`

**Gabarit :** chantier — 17 tâches dans ce fichier, **deux PR** : lot 2 (T1 à T10, branche `feat/usage-c13-lots2-3`,
sa propre clôture) ; lot 3 (T11 à T17, branche neuve tirée de `main` **après la fusion du lot 2**, lancé seulement si
cette fusion a lieu avant 11:45 ; T11 est une mesure qui peut arrêter le lot). 4 vagues au lot 2, 4 au lot 3.

## Table des tâches

| id | lot | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | 2 | Tailles Wasm avant le lot 2 | — | `docs/essais/taille-wasm.md` | isolé `~/projets/roomboard-wt/usage-c13-lots2-3--T1` | implementeur-tdd | ligne `avant C13 lots 2-3` avec 1 374 141 o et 3 024 532 o relus par `wc -c` | S3 | #tache-t1 |
| T2 | 2 | `safeArchivePath` partagé, `keepBoardPath` étendu (manifeste, `content.json`) | — | `apps/web/src/platform/archive-path.ts` (nouveau), `apps/web/src/platform/archive-path.test.ts` (nouveau), `apps/web/src/platform/zip-worker.ts`, `apps/web/src/platform/zip-worker.test.ts`, `apps/web/src/platform/model3d-import.ts`, `docs/architecture-constats.md` | isolé `…--T2` | implementeur-tdd | vitest `archive-path.test.ts zip-worker.test.ts model3d-import.test.ts` : N ≥ 8 tests neufs, `C13 N16 : safeArchivePath` présent | S3 | #tache-t2 |
| T3 | 2 | Rust : `Dialect::Notebook`, `rect_of`, `notebook_order`, copie `notebook` refusée | — | `crates/roomboard-formats/src/board.rs`, `crates/roomboard-formats/src/board/notebook.rs` (nouveau), `crates/roomboard-formats/src/board/read.rs`, `crates/roomboard-formats-wasm/src/lib.rs` | isolé `…--T3` | concepteur-critique | `cargo test -p roomboard-formats board::` : N ≥ 8 neufs, `notebook_order_follows_the_pages_resource` présent ; `cargo test -p roomboard-formats-wasm write_board_xml_refuses_notebook` : 1 test | S1 | #tache-t3 |
| T4 | 2 | Rust : dialecte SMART de `read_svg` (`path`, fond 100 %, `justification`, `href` décodé, Flash) | T3 | `crates/roomboard-formats/src/board/read.rs` | isolé `…--T4` | concepteur-critique | `cargo test -p roomboard-formats board::read` : N ≥ 10 neufs, `notebook_closed_axis_path_becomes_filled_rect` présent ; taille formats ≤ 3 045 012 o | S1, S3 | #tache-t4 |
| T5 | 2 | Liaison Wasm `notebook_order`, Worker des tableaux ordonné par le manifeste | T3 | `crates/roomboard-formats-wasm/src/lib.rs`, `apps/web/src/platform/board-worker.ts`, `apps/web/src/platform/board-reader.ts`, `apps/web/src/platform/board-reader.test.ts`, `apps/web/src/platform/container.ts` | isolé `…--T5` | concepteur-critique | `cargo test -p roomboard-formats-wasm board` : N ≥ 2 neufs ; vitest `board-reader.test.ts` : N ≥ 4 neufs, `C13 N6 : ordre du manifeste` présent | S1 | #tache-t5 |
| T6 | 2 | Types `BoardSourceFormat`, `resolveBoardFormat`, détection `.notebook`/`.olf`, palier bas `.flipchart` refusé, bornes de `board-io` exportées | — | `apps/web/src/app/board-io.ts`, `apps/web/src/app/board-files.ts`, `apps/web/src/app/board-files.test.ts`, `apps/web/src/platform/import.ts`, `apps/web/src/platform/import.test.ts`, `apps/web/src/platform/files.ts`, `apps/web/src/platform/files.test.ts`, `apps/web/src/platform/bamboo.ts` (nouveau), `apps/web/src/platform/bamboo.test.ts` (nouveau) | isolé `…--T6` | implementeur-tdd | vitest `board-files.test.ts import.test.ts files.test.ts bamboo.test.ts` : N ≥ 15 neufs, `C13 N4 : contenu avant extension` et `C13 palier : .flipchart signé refusé` présents | S3 | #tache-t6 |
| T7 | 2 | Lecteur `.olf` (`readOlf`) dans le Worker ZIP, sortie par les bornes de `board-io` | T2, T6 | `apps/web/src/app/olf-read.ts` (nouveau), `apps/web/src/app/olf-read.test.ts` (nouveau), `apps/web/src/platform/zip-worker.ts`, `apps/web/src/platform/zip-worker.test.ts`, `apps/web/src/platform/zip-read.ts`, `apps/web/src/platform/zip-read.test.ts` | isolé `…--T7` | concepteur-critique | vitest `olf-read.test.ts zip-worker.test.ts zip-read.test.ts` : N ≥ 14 neufs, `C13 N9 : matrice lue par lignes` présent | S2, S3 | #tache-t7 |
| T8 | 2 | `openBoard` des `.notebook` et `.olf`, ports de l'amorce | T5, T6, T7 | `apps/web/src/app/workspace.ts`, `apps/web/src/app/workspace.test.ts`, `apps/web/src/app/board-io.ts`, `apps/web/src/main.ts` | isolé `…--T8` | implementeur-tdd | vitest `workspace.test.ts` : N ≥ 8 neufs, `C13 S1 : .notebook dans l'ordre du manifeste` présent ; `pnpm -r test` : 0 échec, ≥ 2740 tests | S1, S2, S3 | #tache-t8 |
| T9 | 2 | Essai navigateur lot 2, capture, tailles finales du lot 2 | T2, T4, T8 | `scripts/essais/c13-tableaux-navigateur.mjs`, `docs/essais/c13-notebook-lecon.png` (nouveau), `docs/essais/taille-wasm.md` ; correctifs permis : `crates/roomboard-formats/src/board/read.rs`, `apps/web/src/app/olf-read.ts`, `apps/web/src/app/workspace.ts`, `apps/web/src/app/board-files.ts` | isolé `…--T9` | implementeur-tdd | `scripts/verifier.sh --e2e` code 0, lignes `C13 tableaux : OK` et `verifier.sh : e2e OK`, `ok — S1`, `ok — S2`, `ok — S3` présents ; capture écrite | S1, S2, S3 | #tache-t9 |
| T10 | 2 | Fidélité `.notebook` et `.olf` sur les exemples hors dépôt | T2, T4, T8 | `scripts/essais/c13-fidelite.mjs` (nouveau), `docs/essais/c13-fidelite-lots2-3.md` (nouveau) | isolé `…--T10` | implementeur-tdd | tableau de 12 lignes (6 `.notebook`, 6 `.olf`) dans `c13-fidelite-lots2-3.md` ; `git status --short` sans fichier d'exemple | S1, S2 | #tache-t10 |
| T11 | 3 | Mesure d'entrée du lot 3, arrêt si la marge manque | lot 2 fusionné | `docs/essais/taille-wasm.md` | isolé `~/projets/roomboard-wt/usage-c13-lot3--T11` | implementeur-tdd | ligne `avant C13 lot 3` lue par `wc -c` ; verdict `lot 3 : go` ou `lot 3 : arrêt` écrit | S4 | #tache-t11 |
| T12 | 3 | Fabrique de `.flipchart` de test (`makeFlipchart`) | T11 | `scripts/essais/fabriques/flipchart.mjs` (nouveau), `scripts/essais/fabriques/flipchart.d.mts` (nouveau), `apps/web/src/platform/fabrique-flipchart.test.ts` (nouveau) | isolé `…lot3--T12` | concepteur-critique | vitest `fabrique-flipchart.test.ts` : N ≥ 4, `fabrique : en-tête Bamboo v7` présent | S4 | #tache-t12 |
| T13 | 3 | Conteneur Bamboo borné (`readBamboo`) et mode `bamboo` du Worker ZIP | T12 | `apps/web/src/platform/bamboo.ts`, `apps/web/src/platform/bamboo.test.ts`, `apps/web/src/platform/zip-worker.ts`, `apps/web/src/platform/zip-worker.test.ts`, `apps/web/src/platform/zip-read.ts`, `apps/web/src/platform/zip-read.test.ts` | isolé `…lot3--T13` | concepteur-critique | vitest `bamboo.test.ts zip-worker.test.ts zip-read.test.ts` : N ≥ 12 neufs, `C13 N13 : bombe qCompress arrêtée` présent | S5 | #tache-t13 |
| T14 | 3 | Rust : flux d'objets Qt et index culm (`flipchart::stream`, `index`, `ids`) | T11 | `crates/roomboard-formats/src/lib.rs`, `crates/roomboard-formats/src/flipchart.rs` (nouveau), `crates/roomboard-formats/src/flipchart/stream.rs`, `crates/roomboard-formats/src/flipchart/index.rs`, `crates/roomboard-formats/src/flipchart/ids.rs` (nouveaux) | isolé `…lot3--T14` | concepteur-critique | `cargo test -p roomboard-formats flipchart::` : N ≥ 10, `stream_nesting_beyond_32_is_skipped` présent ; taille formats au rapport | S4, S5 | #tache-t14 |
| T15 | 3 | Rust : `flipchart::read` (pages, objets niveau B, avertissements) | T14 | `crates/roomboard-formats/src/flipchart.rs`, `crates/roomboard-formats/src/flipchart/read.rs` (nouveau) | isolé `…lot3--T15` | concepteur-critique | `cargo test -p roomboard-formats flipchart::read` : N ≥ 10, `two_pages_with_stroke_line_rect_text_image` présent ; taille formats ≤ budget de T11 | S4, S5 | #tache-t15 |
| T16 | 3 | Liaison `FlipchartReader`, détection signature, `openBoard` du `.flipchart` (remplace le palier bas) | T13, T15 | `crates/roomboard-formats-wasm/src/lib.rs`, `apps/web/src/platform/board-worker.ts`, `apps/web/src/platform/board-reader.ts`, `apps/web/src/platform/board-reader.test.ts`, `apps/web/src/platform/container.ts`, `apps/web/src/platform/import.ts`, `apps/web/src/platform/import.test.ts`, `apps/web/src/platform/files.ts`, `apps/web/src/platform/files.test.ts`, `apps/web/src/app/board-io.ts`, `apps/web/src/app/board-files.ts`, `apps/web/src/app/board-files.test.ts`, `apps/web/src/app/workspace.ts`, `apps/web/src/app/workspace.test.ts`, `apps/web/src/main.ts` | isolé `…lot3--T16` | implementeur-tdd | vitest `import.test.ts board-reader.test.ts workspace.test.ts board-files.test.ts files.test.ts` : N ≥ 10 neufs, `C13 S4 : .flipchart ouvert` présent ; `cargo test -p roomboard-formats-wasm flipchart` N ≥ 2 | S4, S5 | #tache-t16 |
| T17 | 3 | Essai navigateur lot 3, fidélité `.flipchart`, avis de tiers, tailles finales | T16 | `scripts/essais/c13-tableaux-navigateur.mjs`, `scripts/essais/c13-fidelite.mjs`, `docs/essais/c13-fidelite-lots2-3.md`, `docs/essais/taille-wasm.md`, `THIRD_PARTY_NOTICES.md` ; correctifs permis : `crates/roomboard-formats/src/flipchart/*.rs`, `apps/web/src/platform/bamboo.ts`, `apps/web/src/app/workspace.ts` | isolé `…lot3--T17` | implementeur-tdd | `scripts/verifier.sh --e2e` code 0, `ok — S4`, `ok — S5`, `C13 tableaux : OK`, `verifier.sh : e2e OK` présents ; 5 lignes `.flipchart` dans la fidélité | S4, S5 | #tache-t17 |

`…--Tn` = `~/projets/roomboard-wt/usage-c13-lots2-3--Tn` (lot 2) ; `…lot3--Tn` = `~/projets/roomboard-wt/usage-c13-lot3--Tn`
(lot 3, worktrees de tâche tirés de la branche `feat/usage-c13-lot3-flipchart`, elle-même tirée de `main` après la fusion du lot 2).

**Vagues** (fichiers disjoints dans chaque vague)

Lot 2 (PR 1) :
- Vague 1 : T1, T2, T3, T6.
- Vague 2 : T4 et T5 (dès T3), T7 (dès T2 et T6).
- Vague 3 : T8 (dès T5, T6, T7).
- Vague 4 : T9 et T10 (dès T2, T4, T8). Puis clôture du lot 2 (double relecture, PR, fusion).

Lot 3 (PR 2, seulement si le lot 2 est fusionné avant 11:45) :
- Vague 1 : T11 (mesure ; `lot 3 : arrêt` clôt le lot 3 sans autre tâche).
- Vague 2 : T12 et T14 (dès T11 `go`).
- Vague 3 : T13 (dès T12), T15 (dès T14).
- Vague 4 : T16 (dès T13, T15), puis T17.

Chemin critique lot 2 : T6 (30 min) → T7 (40 min) → T8 (40 min) → T9 (40 min) ≈ 2 h 30 ; T3 (30 min) → T5 (35 min)
tient dans la même fenêtre, T4 (60 min) aussi. Le lot 3 (≈ 3 h de chemin) ne tient pas après une fusion du lot 2 vers
12:45 : il reste écrit pour une session suivante (HU1-5).

## Carte des fichiers

| fichier | rôle | tâche |
|---|---|---|
| `crates/roomboard-formats/src/board.rs` | `Dialect::Notebook`, `rect_of`, `mod notebook` | T3 |
| `crates/roomboard-formats/src/board/notebook.rs` | `notebook_order(manifest)` | T3 |
| `crates/roomboard-formats/src/board/read.rs` | visibilité `parse_tree`/`Node`/`Notes` (T3) ; dialecte SMART (T4) | T3, T4 |
| `crates/roomboard-formats/src/flipchart.rs`, `flipchart/{stream,index,ids,read}.rs` | lecteur `.flipchart` | T14, T15 |
| `crates/roomboard-formats-wasm/src/lib.rs` | copie `notebook` refusée (T3), `notebook_order` (T5), `FlipchartReader` (T16) | T3, T5, T16 |
| `apps/web/src/platform/archive-path.ts` | `safeArchivePath` | T2 |
| `apps/web/src/platform/zip-worker.ts`, `zip-read.ts` | filtres (T2) ; `op: "olf"`, `createOlfReader` (T7) ; mode `bamboo` (T13) | T2, T7, T13 |
| `apps/web/src/platform/bamboo.ts` | `hasBambooMagic`, `FLIPCHART_LATER_MESSAGE` (T6) ; `readBamboo`, `keepBambooPath` (T13) | T6, T13 |
| `apps/web/src/platform/board-worker.ts`, `board-reader.ts`, `container.ts` | Worker des tableaux | T5, T16 |
| `apps/web/src/app/board-io.ts`, `board-files.ts` | types, `resolveBoardFormat`, `boardSources` | T6, T8, T16 |
| `apps/web/src/app/olf-read.ts` | `readOlf` | T7 |
| `apps/web/src/app/workspace.ts`, `apps/web/src/main.ts` | `openBoard`, ports | T8, T16 |
| `apps/web/src/platform/import.ts`, `files.ts` | gestionnaires, extensions, filtre, palier bas `.flipchart` (T6, remplacé en T16) | T6, T16 |
| `scripts/essais/fabriques/flipchart.mjs` | générateur unique de `.flipchart` | T12 |
| `scripts/essais/c13-tableaux-navigateur.mjs` | S1 à S3 (T9), S4 et S5 (T17) | T9, T17 |
| `scripts/essais/c13-fidelite.mjs`, `docs/essais/c13-fidelite-lots2-3.md` | mesure de fidélité | T10, T17 |
| `docs/essais/taille-wasm.md` | tailles, verdict d'entrée du lot 3 | T1, T9, T11, T17 |
| `THIRD_PARTY_NOTICES.md` | reprise d'ActCraft | T17 |

## Global Constraints

Recopiées dans chaque section (bloc « Contraintes ») :

- G1 TDD : le test rouge d'abord, vu échouer, puis le code.
- G2 Builds et tests sous `nice -n 10` ; chaque commande commence par `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- G3 `CARGO_TARGET_DIR=<worktree de la tâche>/target` pour toute commande cargo (jamais la cible d'un autre worktree).
- G4 Plafonds Wasm jamais touchés (principal 1 572 864 o, formats 3 145 728 o) ; toute tâche Rust mesure la taille du module `formats`.
- G5 Aucune dépendance neuve (crate ou npm), et aucune GPL/LGPL/AGPL.
- G6 Exemples `~/telechargements-roomboard/` : jamais commités, jamais copiés dans le dépôt, jamais lus par un interpréteur lancé depuis ce dossier (Python `-I`, chemins en argument) ; les fichiers de test se fabriquent dans les tests.
- G7 `git add <chemin>` fichier par fichier ; jamais `git add -A`/`.`, jamais `commit -a`, jamais de push.
- G8 Commit : `git -C <wt> -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "<message anglais>"`, message terminé par la seule ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- G9 Aucun build Tauri ni Android.
- G10 Aucun test désactivé, aucun seuil changé.
- G11 La scène reste ≥ 640 px de large et de haut.

Commandes bornées (forme commune, `<wt>` = worktree de la tâche) :

```bash
# Rust
cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && CARGO_TARGET_DIR=<wt>/target nice -n 10 cargo test -p roomboard-formats <filtre> 2>&1 | tail -20
# Web
cd <wt>/apps/web && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && nice -n 10 pnpm exec vitest run <fichiers> 2>&1 | tail -25
# Taille du module formats
cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && CARGO_TARGET_DIR=<wt>/target nice -n 10 cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -3 && rm -rf /tmp/<id>-wasm && wasm-bindgen --target web --remove-name-section --out-dir /tmp/<id>-wasm <wt>/target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm && wc -c /tmp/<id>-wasm/roomboard_formats_wasm_bg.wasm
```

Motif d'échec : `test result: FAILED`, `error[`, `FAIL `, code non nul. Motif de réussite Rust : `test result: ok. N passed`,
web : `Tests  N passed`.

---

## Lot 2

### Tâche T1 — Tailles Wasm avant le lot 2

**Objectif :** poser dans `docs/essais/taille-wasm.md` la référence d'avant (N17), relue sur la tête de base.

**Fichiers :** `docs/essais/taille-wasm.md`.

**Interfaces :** consomme la sortie de `scripts/verifier.sh` de référence (état : principal 1 374 141 o, formats
3 024 532 o) ; produit la section `## C13 lots 2 et 3` lue par T9 et T17.

**Test et commande bornée :** pas de code ; preuve = mesure du module `formats` (commande commune « Taille », `<id>` = T1)
qui rend `3024532`, et du principal :
`cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && CARGO_TARGET_DIR=<wt>/target nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -3 && wasm-bindgen --target web --remove-name-section --out-dir /tmp/T1-main <wt>/target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && wc -c /tmp/T1-main/roomboard_wasm_bg.wasm`.
Si la mesure diffère de l'état, écrire la valeur lue et le dire au rapport.

**Contraintes :** G2, G3, G4, G6, G7, G8, G9 (recopiées : `nice -n 10` et `export PATH=…` ; `CARGO_TARGET_DIR=<wt>/target` ;
plafonds 1 572 864 o et 3 145 728 o ; exemples jamais lus ni commités ; `git add` fichier par fichier ; commit auteur
`jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, seule ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun build Tauri ni Android).

**Interdits :** toucher au code ; changer un plafond.

**Terminé :** section ajoutée, commit `docs(size): record wasm sizes before C13 lots 2-3`.

**Étapes :**
1. Mesurer (deux commandes ci-dessus).
2. Ajouter à la fin de `docs/essais/taille-wasm.md` :

```markdown
## C13 lots 2 et 3 (`.notebook`, `.olf`, `.flipchart`)

| mesure | module principal | module formats |
|---|---|---|
| avant C13 lots 2-3 (`origin/main` 3b73c27) | 1 374 141 o | 3 024 532 o |

Budget (N17) : lot 2 ≤ 20 Ko (formats ≤ 3 045 012 o), lot 3 ≤ 80 Ko (≤ 3 125 012 o), marge finale ≥ 20 Ko. Principal inchangé à l'octet.
```
3. `git add docs/essais/taille-wasm.md`, commit (G8).

---

### Tâche T2 — `safeArchivePath` partagé, `keepBoardPath` étendu (manifeste, `content.json`)

**Objectif :** une seule règle de chemin d'archive sûr pour la 3D, les tableaux et (lot 3) le Bamboo (N16), et le
filtre des tableaux garde `imsmanifest.xml` et `content.json` (N15).

**Fichiers :** `apps/web/src/platform/archive-path.ts` (nouveau), `archive-path.test.ts` (nouveau), `zip-worker.ts`,
`zip-worker.test.ts`, `model3d-import.ts`, `docs/architecture-constats.md` (constat `zip-worker.ts:35` fermé).

**Interfaces :**
- Produit : `export function safeArchivePath(name: string): string | null` dans `platform/archive-path.ts` (module sans
  dépendance, pour que `model3d-import.ts` ne tire pas `fflate` ni `zip-worker.ts`).
- Réutilise : `apps/web/src/platform/model3d-import.ts:262` — `keepZipPath(path: string): boolean` étendu : appelle `safeArchivePath`, garde son test d'extension.
- Réutilise : `apps/web/src/platform/zip-worker.ts:36` — `keepBoardPath(name: string): boolean` étendu : appelle `safeArchivePath`, ajoute `imsmanifest.xml` et `content.json` (à la racine seulement).
- Rapport : `Réutilisation : appelé safeArchivePath, keepZipPath, keepBoardPath` ou `Réutilisation : écart — <pourquoi>`.

Règle `__MACOSX` : refusée **dans tout segment** (règle de `keepZipPath`, la plus stricte), pas seulement en tête.

```ts
/** C13 (N16) : chemin d'entrée d'archive normalisé (barres droites, sans `./` en tête), ou null : vide, dossier,
 *  absolu, lettre de lecteur, segment `..`, segment `__MACOSX`. Seule règle des ZIP (3D, tableaux) et du Bamboo. */
export function safeArchivePath(name: string): string | null {
  const p = name.replace(/\\/g, "/").replace(/^(\.\/)+/, "");
  if (p === "" || p.endsWith("/") || p.startsWith("/") || /^[A-Za-z]:/.test(p)) return null;
  const segs = p.split("/");
  if (segs.some((s) => s === ".." || s === "__MACOSX")) return null;
  return p;
}
```

```ts
// zip-worker.ts
export function keepBoardPath(name: string): boolean {
  const p = safeArchivePath(name);
  if (p === null) return false;
  const lower = p.toLowerCase();
  if (lower === "content.xml" || lower === "imsmanifest.xml" || lower === "content.json" || /^page\d+\.svg$/.test(lower)) return true;
  return BOARD_ZIP_EXTENSIONS.includes(extensionOf(p));
}
// model3d-import.ts
export function keepZipPath(path: string): boolean {
  const p = safeArchivePath(path);
  if (p === null) return false;
  const ext = extensionOf(p);
  return (MODEL_EXTENSIONS as readonly string[]).includes(ext) || (COMPANION_EXTENSIONS as readonly string[]).includes(ext);
}
```
Retirer `ABSOLUTE` de `model3d-import.ts` s'il n'a plus d'autre usage (sinon le garder).

**Tests rouges (nommés) :**
- `archive-path.test.ts` : `C13 N16 : safeArchivePath` — `"a/b.png"` → `"a/b.png"` ; `".\\x\\y.svg"` → `"x/y.svg"` ;
  `"/etc/p"`, `"\\x"`, `"C:/x"`, `"c:x"`, `"a/../b"`, `"../evil.png"`, `"__MACOSX/a.png"`, `"a/__MACOSX/b.png"`, `"dir/"`, `""` → `null`.
- `zip-worker.test.ts` : `C13 N15 : keepBoardPath garde imsmanifest.xml et content.json` (vrai), `sub/content.json` (faux),
  `video.wmv`, `a.swf`, `preview.thm` (faux) ; `C13 N16 : keepBoardPath refuse a/__MACOSX/x.png` (effet de bord du cadrage :
  la règle `__MACOSX` devient la même pour les deux) ; `C13 S3 : ../evil.png refusé`.
- Tests à garder verts (effet de bord « `keepZipPath` et `keepBoardPath` passent par `safeArchivePath` ») :
  `model3d-import.test.ts` en entier.

**Commande bornée :** commune « Web » avec `src/platform/archive-path.test.ts src/platform/zip-worker.test.ts src/platform/model3d-import.test.ts` ;
attendu `Tests  N passed`, N ≥ 8 neufs, nom `C13 N16 : safeArchivePath` présent, 0 échec.

**Contraintes :** G1, G2, G5, G6, G7, G8, G10 (recopiées : test rouge d'abord ; `nice -n 10` et `export PATH=…` ;
aucune dépendance neuve ni GPL/LGPL/AGPL ; exemples jamais lus ni commités, fichiers de test fabriqués ; `git add` fichier
par fichier, ni `-A`, ni `commit -a`, ni push ; commit auteur `jejeasterix <jejeasterix@users.noreply.github.com>`,
message anglais, seule ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun test désactivé ni seuil changé).

**Interdits :** changer `BOARD_ZIP_EXTENSIONS` ; décompresser TIFF, vidéos, sons, Flash, miniatures.

**Terminé :** tests verts, ligne du constat `zip-worker.ts:35` marquée fermée dans `docs/architecture-constats.md` (« fermé par C13 lots 2-3 T2, `safeArchivePath` »), commit `refactor(zip): share safeArchivePath, keep manifest and content.json for boards`.

**Étapes :** 1. tests `archive-path.test.ts` (rouges) ; 2. `archive-path.ts` ; 3. tests `zip-worker.test.ts` neufs (rouges) ;
4. `keepBoardPath` ; 5. `keepZipPath` ; 6. suite des trois fichiers ; 7. constat ; 8. commit.

---

### Tâche T3 — Rust : `Dialect::Notebook`, `rect_of`, `notebook_order`, copie `notebook` refusée

**Objectif :** le contrat Rust du lot 2 (N5, N6, N7) : un dialecte de plus, la reconnaissance d'un rectangle dans un
polygone (partagée avec le lot 3), l'ordre des pages SMART lu dans `imsmanifest.xml`.

**Fichiers :** `crates/roomboard-formats/src/board.rs`, `crates/roomboard-formats/src/board/notebook.rs` (nouveau),
`crates/roomboard-formats/src/board/read.rs` (visibilité et `match` exhaustif seulement),
`crates/roomboard-formats-wasm/src/lib.rs` (bras `Dialect::Notebook` de `write_board_xml_inner` seulement).

**Interfaces :**
- Produit : `Dialect::Notebook` ; `Dialect::parse("notebook") == Some(Dialect::Notebook)`.
- Produit (nouveau, liste du cadrage) : `pub fn rect_of(points: &[[f32; 2]]) -> Option<[f32; 4]>` dans `board.rs` (`[x0, y0, x1, y1]`, x0 < x1, y0 < y1).
- Produit (nouveau, liste du cadrage) : `pub fn notebook_order(manifest: &[u8]) -> Result<Vec<String>, BoardError>` dans `board/notebook.rs`, réexporté `pub use notebook::notebook_order;`.
- Réutilise : `crates/roomboard-formats/src/board/read.rs:281` — `parse_tree(text: &str, notes: &mut Notes) -> Result<Node, BoardError>` (D16 du lot 1 : DOCTYPE ignoré, aucune entité externe) ; passer `parse_tree`, `Node` (`name`, `attr`, `nodes`) et `Notes` en `pub(super)`.
- Dans `read.rs:1284` (`match self.dialect`) : `Dialect::Notebook => c.top && first_child && bg.is_none() && fill.is_some(),` (même règle que `Ubz` en attendant T4).
- Dans `crates/roomboard-formats-wasm/src/lib.rs:228` (`match d` de `write_board_xml_inner`, sans quoi le crate ne compile plus) :
  `Dialect::Notebook => Err(format!("format de tableau inconnu : {format}")),` — import seul (N2) ; le message garde le
  préfixe connu de `boardErrorMessage` (`board-reader.ts`).
- Rapport : `Réutilisation : appelé parse_tree` ou `Réutilisation : écart — <pourquoi>`.

**Patron à ne pas reprendre :** un second lecteur XML (`quick_xml::Reader` à la main dans `notebook.rs`) — il
contournerait la règle DOCTYPE/entités de `parse_tree` (référence `crates/roomboard-formats/src/board/read.rs:269-356`).
Ne pas comparer `rect_of` à `==` sur des flottants : tolérance `1e-3`.

```rust
// board.rs
/// Rectangle d'un polygone fermé de 4 sommets (5 si le dernier répète le premier), côtés alignés sur les axes
/// (N7, N12) ; `None` sinon. Tolérance 1e-3 ; rectangle plat (largeur ou hauteur nulle) refusé.
pub fn rect_of(points: &[[f32; 2]]) -> Option<[f32; 4]> {
    const EPS: f32 = 1e-3;
    let same = |a: [f32; 2], b: [f32; 2]| (a[0] - b[0]).abs() <= EPS && (a[1] - b[1]).abs() <= EPS;
    let p = match points.len() {
        4 => points,
        5 if same(points[0], points[4]) => &points[..4],
        _ => return None,
    };
    if !p.iter().all(|q| q[0].is_finite() && q[1].is_finite()) {
        return None;
    }
    let horiz = |a: [f32; 2], b: [f32; 2]| (a[1] - b[1]).abs() <= EPS;
    let vert = |a: [f32; 2], b: [f32; 2]| (a[0] - b[0]).abs() <= EPS;
    let edges = [(p[0], p[1]), (p[1], p[2]), (p[2], p[3]), (p[3], p[0])];
    let alt_a = edges.iter().enumerate().all(|(i, &(a, b))| if i % 2 == 0 { horiz(a, b) } else { vert(a, b) });
    let alt_b = edges.iter().enumerate().all(|(i, &(a, b))| if i % 2 == 0 { vert(a, b) } else { horiz(a, b) });
    if !(alt_a || alt_b) {
        return None;
    }
    let (x0, x1) = p.iter().fold((f32::MAX, f32::MIN), |(l, h), q| (l.min(q[0]), h.max(q[0])));
    let (y0, y1) = p.iter().fold((f32::MAX, f32::MIN), |(l, h), q| (l.min(q[1]), h.max(q[1])));
    (x1 - x0 > EPS && y1 - y0 > EPS).then_some([x0, y0, x1, y1])
}
```

```rust
// board/notebook.rs
//! Ordre des pages d'un `.notebook` (N6) : `<resource identifier="pages">` de `imsmanifest.xml`, ses `<file href>` dans
//! l'ordre du document. Lecture par `read::parse_tree` (D16 : DOCTYPE ignoré, aucune entité externe).
use super::read::{parse_tree, Node, Notes};
use super::BoardError;

pub fn notebook_order(manifest: &[u8]) -> Result<Vec<String>, BoardError> {
    let body = manifest.strip_prefix(&[0xEF, 0xBB, 0xBF][..]).unwrap_or(manifest);
    let text = std::str::from_utf8(body).map_err(|_| BoardError::Broken("manifeste non UTF-8".into()))?;
    let mut notes = Notes::default();
    let root = parse_tree(text, &mut notes)?;
    let mut out: Vec<String> = Vec::new();
    if let Some(pages) = find_pages(&root) {
        for f in pages.nodes().filter(|n| n.name == "file") {
            if let Some(h) = f.attr("href") {
                let p = h.replace('\\', "/").trim_start_matches("./").to_string();
                if !p.is_empty() && !out.contains(&p) {
                    out.push(p);
                }
            }
        }
    }
    Ok(out)
}

fn find_pages(n: &Node) -> Option<&Node> {
    if n.name == "resource" && n.attr("identifier") == Some("pages") {
        return Some(n);
    }
    n.nodes().find_map(find_pages)
}
```
(`n.name` est le nom local sans préfixe, comme dans `read.rs` ; si `Node::name` porte le préfixe, comparer le nom local
comme le fait `read.rs`.) Un manifeste sans ressource `pages` rend `Ok(vec![])` : le repli numérique est décidé en T5.

**Tests rouges (nommés) :**
- `board::tests::dialect_parse_knows_notebook` (remplace l'assertion de `dialect_parse_knows_iwb_and_ubz_only` : `"notebook"` → `Some(Notebook)`, `"pdf"` → `None`, `"olf"` → `None`, `"flipchart"` → `None` ; renommer le test en `dialect_parse_knows_board_dialects`, garder ses autres assertions).
- `board::tests::rect_of_reads_four_and_five_point_rectangles` (`[[0,0],[10,0],[10,5],[0,5]]` → `[0,0,10,5]` ; même avec le 5e point ; ordre inverse) ; `rect_of_refuses_slanted_flat_and_short` (losange, 3 points, rectangle plat, NaN → `None`).
- `board::notebook::tests::notebook_order_follows_the_pages_resource` (manifeste du cadrage S1 : `page1.svg` avant `page0.svg` → `["page1.svg", "page0.svg"]`, ignore la ressource `group0_pages`) ; `notebook_order_normalises_backslashes` ; `notebook_order_without_pages_resource_is_empty` ; `notebook_order_ignores_doctype_and_external_entities` (`<!DOCTYPE m [<!ENTITY x SYSTEM "file:///etc/passwd">]>` + `href="&x;"` : aucune lecture de fichier, résultat sans `/etc/passwd`) ; `notebook_order_refuses_non_utf8` (`Err(Broken)`).
- `crates/roomboard-formats-wasm` : `write_board_xml_refuses_notebook` (`write_board_xml_inner(&[], vec![], "notebook")` → `Err` commençant par `format de tableau inconnu : `).
- Tests à garder verts : `cargo test -p roomboard-formats board::` en entier (lot 1) ; `cargo test -p roomboard-formats-wasm` en entier.

**Commande bornée :** commune « Rust » filtre `board::` ; `test result: ok`, N ≥ 8 neufs, `notebook_order_follows_the_pages_resource` présent ;
puis commune « Rust » avec `-p roomboard-formats-wasm write_board_xml_refuses_notebook` : `1 passed`.

**Contraintes :** G1, G2, G3, G4, G5, G6, G7, G8, G10 (recopiées : test rouge d'abord ; `nice -n 10` et `export PATH=…` ;
`CARGO_TARGET_DIR=<wt>/target` ; plafonds 1 572 864 o / 3 145 728 o, taille mesurée ; aucune dépendance neuve ni
GPL/LGPL/AGPL ; exemples jamais lus ni commités, fichiers de test fabriqués ; `git add` fichier par fichier, ni `-A`, ni
`commit -a`, ni push ; commit auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, seule ligne
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun test désactivé ni seuil changé). Aussi : `cargo clippy -p roomboard-formats -- -D warnings` vert.

**Interdits :** lire `path` ou toucher au dialecte SMART (T4) ; toucher à `write.rs`, `qt_html.rs`, au cœur, à `roomboard-wasm` ; lier `notebook_order` au Wasm (T5).

**Terminé :** tests verts, clippy vert, taille formats notée au rapport, commit `feat(formats): notebook dialect, rect_of and notebook_order`.

**Étapes :** 1. tests de `Dialect` (rouges) ; 2. variante et `parse` ; 3. `match` de `read.rs:1284` ; 4. tests `rect_of`
(rouges) ; 5. `rect_of` ; 6. visibilité `pub(super)` ; 7. tests `notebook.rs` (rouges) ; 8. `notebook.rs`, `mod notebook;` et `pub use` dans `board.rs` ; 9. test `write_board_xml_refuses_notebook` (rouge) puis le bras ; 10. suites, clippy, taille ; 11. commit.

---

### Tâche T4 — Rust : dialecte SMART de `read_svg`

**Objectif :** les pages `page<N>.svg` d'un `.notebook` lues au niveau B (N7) par le lecteur commun.

**Fichiers :** `crates/roomboard-formats/src/board/read.rs`.

**Interfaces :**
- Réutilise : `crates/roomboard-formats/src/board/read.rs:1519` — `read_svg(xml: &[u8], dialect: Dialect::Notebook, first_page: u32) -> Result<BoardList, BoardError>` étendu (dispatch `element` :1166, `ignored` :1036, `rect` :1265, `image` :1441, styles).
- Réutilise : `crates/roomboard-formats/src/board.rs` — `rect_of(points: &[[f32; 2]]) -> Option<[f32; 4]>` (T3).
- Réutilise : `crates/roomboard-formats/src/board.rs:322` — `encode(&pages) -> BoardList` (inchangé, appelé par `read_svg`).
- Produit : sortes `Sort::Curves` (libellés « courbe approchée par des segments » / « courbes approchées par des segments ») et
  `Sort::Arc` (« arc non lu, remplacé par un segment » / « arcs non lus, remplacés par des segments ») ; avertissement de page « ordre des pages déduit des noms » **non** produit ici (T5).
- Rapport : `Réutilisation : appelé read_svg, rect_of, encode` ou `Réutilisation : écart — <pourquoi>`.

**Règles (N7), toutes limitées à `Dialect::Notebook` sauf `path` :**
1. `path` (tous dialectes : le lot 1 le comptait inconnu ; un `.iwb` qui en contient gagne un trait, assumé) : `d` lu
   par `path_subpaths` ci-dessous ; chaque sous-chemin → `Item::Stroke` (points `[x, y, 1.0]`, fermé : premier point
   répété) ; plusieurs sous-chemins → `Item::Group` ; sous-chemin fermé dont `rect_of` rend `Some` → `Item::Shape`
   `ShapeKind::Rect` avec `fill_of(&c.style)` et `outline(...)` ; fermé non rectangulaire rempli → `Sort::PolygonFill` ;
   courbes vues → `Sort::Curves` ; arcs `A` vus → `Sort::Arc` (non aplatis) ; `d` illisible → `Err(Bad)` (objet illisible, patron existant) ; plus de `MAX_POINTS` → `Err(Bad)`.
2. `rect` avec `width="100%"` et `height="100%"` : fond de page = `fill_of(style)` si `bg` est vide (D14), aucun objet.
3. `xbk_transform` jamais lu (doublon de `transform`).
4. Attribut `justification` (SMART) lu comme `text-align` dans `Style::inherit` quand `text-align` manque.
5. `href` d'image : `percent_decode` (UTF-8, `%XX` ; `+` gardé) avant `normalize_href`, pour `Notebook` seulement.
6. `ignored` : `"flash"` → `Some(Some(Sort::Flash))` ; `persistence*`, `scrollingText`, `hr` restent `Sort::UnknownObject`.

```rust
/// Sous-chemins d'un attribut `d` (N7) : `M L H V Z` absolus et relatifs exacts ; `C S Q T` aplaties en 8 segments ;
/// `A` **non aplatie** : un seul segment jusqu'à son point final, avec l'avertissement `Sort::Arc`.
/// Rend (sous-chemins avec fermé ?, courbes vues ?, arcs vus ?) ; None : illisible.
fn path_subpaths(d: &str) -> Option<(Vec<(Vec<[f32; 2]>, bool)>, bool, bool)> {
    let toks = path_tokens(d)?;
    let mut out: Vec<(Vec<[f32; 2]>, bool)> = Vec::new();
    let mut cur: Vec<[f32; 2]> = Vec::new();
    let (mut x, mut y, mut sx, mut sy) = (0f32, 0f32, 0f32, 0f32);
    let mut last_ctrl: Option<[f32; 2]> = None; // pour S et T
    let mut curves = false;
    let mut arcs = false;
    let mut i = 0;
    let mut cmd = b'M';
    let flush = |cur: &mut Vec<[f32; 2]>, out: &mut Vec<(Vec<[f32; 2]>, bool)>, closed: bool| {
        if cur.len() >= 2 {
            out.push((std::mem::take(cur), closed));
        } else {
            cur.clear();
        }
    };
    while i < toks.len() {
        if let PathTok::Cmd(c) = toks[i] {
            cmd = c;
            i += 1;
            if c == b'Z' || c == b'z' {
                if let Some(&f) = cur.first() {
                    cur.push(f);
                }
                flush(&mut cur, &mut out, true);
                x = sx;
                y = sy;
                last_ctrl = None;
                continue;
            }
        }
        let rel = cmd.is_ascii_lowercase();
        let (bx, by) = if rel { (x, y) } else { (0.0, 0.0) };
        let n = |k: usize| -> Option<f32> { match toks.get(i + k)? { PathTok::Num(v) => Some(*v), _ => None } };
        let up = cmd.to_ascii_uppercase();
        let need = match up { b'M' | b'L' | b'T' => 2, b'H' | b'V' => 1, b'C' => 6, b'S' | b'Q' => 4, b'A' => 7, _ => return None };
        let a: Vec<f32> = (0..need).map(n).collect::<Option<Vec<f32>>>()?;
        i += need;
        let flat = |cur: &mut Vec<[f32; 2]>, f: &dyn Fn(f32) -> [f32; 2]| {
            for k in 1..=8 {
                cur.push(f(k as f32 / 8.0));
            }
        };
        match up {
            b'M' => {
                flush(&mut cur, &mut out, false);
                x = bx + a[0];
                y = by + a[1];
                sx = x;
                sy = y;
                cur.push([x, y]);
                cmd = if rel { b'l' } else { b'L' }; // paires suivantes : lignes
                last_ctrl = None;
            }
            b'L' | b'H' | b'V' => {
                if cur.is_empty() { cur.push([x, y]); }
                match up {
                    b'L' => { x = bx + a[0]; y = by + a[1]; }
                    b'H' => { x = if rel { x + a[0] } else { a[0] }; }
                    _ => { y = if rel { y + a[0] } else { a[0] }; }
                }
                cur.push([x, y]);
                last_ctrl = None;
            }
            b'C' | b'S' => {
                curves = true;
                if cur.is_empty() { cur.push([x, y]); }
                let (p0, (c1, c2, p3)) = ([x, y], if up == b'C' {
                    ([bx + a[0], by + a[1]], [bx + a[2], by + a[3]], [bx + a[4], by + a[5]])
                } else {
                    let r = last_ctrl.map_or([x, y], |c| [2.0 * x - c[0], 2.0 * y - c[1]]);
                    (r, [bx + a[0], by + a[1]], [bx + a[2], by + a[3]])
                });
                flat(&mut cur, &|t| {
                    let u = 1.0 - t;
                    let w = [u * u * u, 3.0 * u * u * t, 3.0 * u * t * t, t * t * t];
                    [w[0] * p0[0] + w[1] * c1[0] + w[2] * c2[0] + w[3] * p3[0], w[0] * p0[1] + w[1] * c1[1] + w[2] * c2[1] + w[3] * p3[1]]
                });
                last_ctrl = Some(c2);
                x = p3[0];
                y = p3[1];
            }
            b'Q' | b'T' => {
                curves = true;
                if cur.is_empty() { cur.push([x, y]); }
                let (c1, p2) = if up == b'Q' {
                    ([bx + a[0], by + a[1]], [bx + a[2], by + a[3]])
                } else {
                    (last_ctrl.map_or([x, y], |c| [2.0 * x - c[0], 2.0 * y - c[1]]), [bx + a[0], by + a[1]])
                };
                let p0 = [x, y];
                flat(&mut cur, &|t| {
                    let u = 1.0 - t;
                    [u * u * p0[0] + 2.0 * u * t * c1[0] + t * t * p2[0], u * u * p0[1] + 2.0 * u * t * c1[1] + t * t * p2[1]]
                });
                last_ctrl = Some(c1);
                x = p2[0];
                y = p2[1];
            }
            _ => {
                // A rx ry rot large sweep x y : pas d'aplatissement, segment jusqu'au point final, averti.
                arcs = true;
                if cur.is_empty() { cur.push([x, y]); }
                x = bx + a[5];
                y = by + a[6];
                cur.push([x, y]);
                last_ctrl = None;
            }
        }
        if !(x.is_finite() && y.is_finite()) {
            return None;
        }
    }
    flush(&mut cur, &mut out, false);
    Some((out, curves, arcs))
}

#[derive(Clone, Copy)]
enum PathTok { Cmd(u8), Num(f32) }

/// Jetons d'un `d` : commandes et nombres (`10-5` = deux nombres, `1.5.5` = 1.5 puis .5, exposants, virgules et blancs).
fn path_tokens(d: &str) -> Option<Vec<PathTok>> {
    let b = d.as_bytes();
    let mut out = Vec::new();
    let mut i = 0;
    while i < b.len() {
        let c = b[i];
        if c.is_ascii_whitespace() || c == b',' { i += 1; continue; }
        if b"MmLlHhVvCcSsQqTtAaZz".contains(&c) { out.push(PathTok::Cmd(c)); i += 1; continue; }
        let start = i;
        if c == b'+' || c == b'-' { i += 1; }
        let mut dot = false;
        while i < b.len() && (b[i].is_ascii_digit() || (b[i] == b'.' && !dot)) {
            if b[i] == b'.' { dot = true; }
            i += 1;
        }
        if i < b.len() && (b[i] == b'e' || b[i] == b'E') {
            let save = i;
            i += 1;
            if i < b.len() && (b[i] == b'+' || b[i] == b'-') { i += 1; }
            if i < b.len() && b[i].is_ascii_digit() { while i < b.len() && b[i].is_ascii_digit() { i += 1; } } else { i = save; }
        }
        let v: f32 = std::str::from_utf8(&b[start..i]).ok()?.parse().ok()?;
        if !v.is_finite() { return None; }
        out.push(PathTok::Num(v));
        if i == start { return None; }
    }
    if !matches!(out.first(), Some(PathTok::Cmd(b'M' | b'm'))) && !out.is_empty() { return None; }
    Some(out)
}

/// `%XX` décodés en UTF-8 (N7) ; une séquence invalide est gardée telle quelle.
fn percent_decode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() + 0 && i + 2 <= b.len() - 1 + 1 {
            if let (Some(h), Some(l)) = ((b[i + 1] as char).to_digit(16), b.get(i + 2).and_then(|c| (*c as char).to_digit(16))) {
                out.push((h * 16 + l) as u8);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8(out).unwrap_or_else(|_| s.to_string())
}
```
(Simplifier la garde de `percent_decode` en `i + 2 < b.len()` ; vérifier au test `%2` en fin de chaîne.)

**Tests rouges (nommés), dans `read.rs` `mod tests`, avec un `fn notebook(body: &str) -> String` qui rend
`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="800" height="600" viewBox="0 0 800 600">{body}</svg>` lu en `Dialect::Notebook` :**
- `notebook_closed_axis_path_becomes_filled_rect` (`d="M10 20 L110 20 L110 70 L10 70 z"` `fill="#ff0000"` → `Shape Rect` x0 10, y0 20, x1 110, y1 70, `fill: Some([255,0,0])`) — S1 « rectangle en `path` rempli ».
- `notebook_open_path_is_a_stroke_with_relative_commands` (`m10 10 l5 0 h5 v5` → points `[10,10],[15,10],[20,10],[20,15]`).
- `path_numbers_without_separators` (`M10-5L.5.5` → `[10,-5],[0.5,0.5]`).
- `path_curves_are_flattened_and_warned` (`M0 0 C0 10 10 10 10 0` → 9 points, avertissement « page 1 : 1 courbe approchée par des segments »).
- `path_arc_is_warned_not_flattened` (`M0 0 A5 5 0 0 1 10 0` → 2 points, avertissement « page 1 : 1 arc non lu, remplacé par un segment »).
- `path_two_subpaths_make_a_group` ; `path_closed_non_rect_fill_warns_polygon_fill` ; `path_garbage_is_unreadable` (`d="M x"` → « objet illisible ignoré »).
- `notebook_full_size_rect_is_background` (`<rect width="100%" height="100%" fill="#00ff00"/>` → `background: Some([0,255,0])`, aucun objet).
- `notebook_xbk_transform_is_ignored` (`transform="translate(10,0)" xbk_transform="translate(999,0)"` → translation 10 seulement).
- `notebook_justification_is_text_align` (`<text justification="center">` → avertissement d'alignement, comme `text-align`).
- `notebook_tspans_nested_keep_bold` (`<text><tspan font-weight="bold">a<tspan>b</tspan></tspan></text>` → deux caractères gras) — S1 « texte gras à `tspan` imbriqués ».
- `notebook_image_href_is_percent_decoded` (`xlink:href="images/a%20b[1].png"` → `href == "images/a b[1].png"`) — S1.
- `notebook_flash_is_warned` (`<flash/>` → « Flash non lu » selon le libellé existant de `Sort::Flash`) — S1.
- `notebook_doctype_script_and_external_entity` (`<!DOCTYPE svg SYSTEM "file:///etc/passwd">` + `<script>alert(1)</script>` : lecture OK, avertissement script, aucun texte `alert`) — S3.
- Tests à garder verts : `board::read` en entier (lot 1 : `.iwb`, `.ubz`), `board::write`, `board::qt_html`.

**Commande bornée :** commune « Rust » filtre `board::read` : N ≥ 10 neufs, `notebook_closed_axis_path_becomes_filled_rect` présent ;
puis commune « Taille » (`<id>` = T4) : ≤ 3 045 012 o (budget lot 2), valeur au rapport.

**Contraintes :** G1, G2, G3, G4, G5, G6, G7, G8, G10 (recopiées : test rouge d'abord ; `nice -n 10` et `export PATH=…` ;
`CARGO_TARGET_DIR=<wt>/target` ; plafonds 1 572 864 o / 3 145 728 o, taille mesurée ; aucune dépendance neuve ni
GPL/LGPL/AGPL ; exemples jamais lus ni commités, fichiers de test fabriqués ; `git add` fichier par fichier, ni `-A`, ni
`commit -a`, ni push ; commit auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, seule ligne
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun test désactivé ni seuil changé). Clippy `-D warnings` vert.

**Patron à ne pas reprendre :** découper `d` par `split(' ')` ou par la regex de `numbers()` (`read.rs:597`) : `10-5` et
`.5.5` y deviennent faux ; et `poly` (`read.rs:1342`) qui avertit `PolygonFill` sans tester le rectangle.

**Interdits :** toucher à `write.rs`, `qt_html.rs`, `board.rs` (sauf un libellé ajouté à `LABELS` de `read.rs`).

**Terminé :** tests verts, taille ≤ budget, commit `feat(formats): read SMART Notebook pages (path, background, spans, flash)`.

**Étapes :** 1. helper `notebook()` + 3 tests `path` (rouges) ; 2. `path_tokens`, `path_subpaths`, branche `"path"` de `element` ;
3. tests rect/fond/transform (rouges) ; 4. règles 2 et 3 ; 5. tests texte/image/flash/hostile (rouges) ; 6. règles 4 à 6 ;
7. suite, clippy, taille ; 8. commit.

---

### Tâche T5 — Liaison Wasm `notebook`, Worker des tableaux ordonné par le manifeste

**Objectif :** le Worker lit les pages d'un `.notebook` dans l'ordre du manifeste, repli numérique avec avertissement (N6).

**Fichiers :** `crates/roomboard-formats-wasm/src/lib.rs`, `apps/web/src/platform/board-worker.ts`, `board-reader.ts`,
`board-reader.test.ts`, `container.ts`.

**Interfaces :**
- Réutilise : `crates/roomboard-formats-wasm/src/lib.rs:177` — `BoardReader.open(xml, "notebook", first_page)` (aucun changement : `Dialect::parse` connaît `notebook` après T3) ; ajoute `#[wasm_bindgen] pub fn notebook_order(manifest: &[u8]) -> Result<Vec<String>, JsError>`.
- Réutilise : `apps/web/src/platform/board-reader.ts:68` — `BoardCodec.read` étendu :
  `read(files: readonly Uint8Array[], dialect: BoardDialect, opts?: BoardReadOptions): Promise<BoardPart[]>` avec
  `export type BoardDialect = "iwb" | "ubz" | "notebook";` et
  `export interface BoardReadOptions { readonly names: readonly string[]; readonly manifest: Uint8Array | null; readonly max: number }`
  (`names[i]` = chemin normalisé de `files[i]`, `max` = 500 pages).
- `BoardCodec.write(list, format: "iwb" | "ubz")` : type de l'export restreint (N5).
- `container.ts` : `BoardFormatsBinding` gagne `notebook_order(manifest: Uint8Array): string[]` ; `hasBoardReader` l'exige aussi.
- Produit : `export const NOTEBOOK_ORDER_GUESSED = "ordre des pages déduit des noms";`
- Rapport : `Réutilisation : appelé BoardReader, BoardCodec, runOnce` ou `Réutilisation : écart — <pourquoi>`.

**Règle d'ordre (board-worker, dialecte `notebook`) :**
```ts
// dans board-worker.ts, avant la lecture ; `j.names`, `j.manifest`, `j.max` viennent de BoardReadOptions
function notebookOrder(mod: BoardFormatsBinding, files: readonly Uint8Array[], names: readonly string[], manifest: Uint8Array | null, max: number): { files: Uint8Array[]; warnings: string[] } {
  let order: string[] = [];
  if (manifest !== null) {
    try {
      order = mod.notebook_order(manifest).map((n) => n.toLowerCase());
    } catch {
      order = [];
    }
  }
  const byName = new Map(names.map((n, i) => [n.toLowerCase(), i] as const));
  const picked: number[] = [];
  for (const n of order) {
    const i = byName.get(n);
    if (i !== undefined && !picked.includes(i)) picked.push(i);
  }
  const guessed = picked.length === 0 || picked.length < names.length;
  for (let i = 0; i < names.length; i++) if (!picked.includes(i)) picked.push(i); // reste : ordre reçu (numérique, boardSources)
  return { files: picked.slice(0, max).map((i) => files[i]!), warnings: guessed ? [NOTEBOOK_ORDER_GUESSED] : [] };
}
```
Pages numérotées `i + 1` pour `ubz` **et** `notebook`. L'avertissement d'ordre va en tête des `warnings` de la première part.

**Tests rouges (nommés), `board-reader.test.ts` (Worker simulé comme les tests du lot 1) :**
- `C13 N6 : ordre du manifeste` — `read([a, b], "notebook", { names: ["page0.svg", "page1.svg"], manifest, max: 500 })` envoie au Worker `{ op: "read", dialect: "notebook", names, manifest, max }` (message vérifié) et transfère les copies.
- `C13 N6 : write refuse un dialecte de lecture` (typage : `// @ts-expect-error` sur `write(list, "notebook")`).
- `C13 N6 : notebookOrder` (fonction exportée de `board-reader.ts` pour être testée sous Node, le Worker l'importe) : manifeste `page1, page0` → `[b, a]`, aucun avertissement ; manifeste vide → ordre reçu + `NOTEBOOK_ORDER_GUESSED` ; page absente du manifeste ajoutée à la fin + avertissement ; `max: 1` → une page. (Placer donc `notebookOrder` dans `board-reader.ts` avec un paramètre `order: (m: Uint8Array) => string[]` au lieu de `mod` ; le Worker passe `mod.notebook_order`.)
- `C13 N6 : hasBoardReader exige notebook_order`.
- Rust, `crates/roomboard-formats-wasm` : `board_reader_opens_notebook_dialect` ; `notebook_order_binding_reads_the_manifest`.
- Tests à garder verts : `board-reader.test.ts` du lot 1, `cargo test -p roomboard-formats-wasm`.

**Commande bornée :** commune « Rust » avec `-p roomboard-formats-wasm board` (N ≥ 2 neufs) ; commune « Web » avec
`src/platform/board-reader.test.ts` (N ≥ 4 neufs, `C13 N6 : ordre du manifeste` présent) ; commune « Taille » (`<id>` = T5).

**Contraintes :** G1, G2, G3, G4, G5, G6, G7, G8, G10 (recopiées : test rouge d'abord ; `nice -n 10` et `export PATH=…` ;
`CARGO_TARGET_DIR=<wt>/target` ; plafonds 1 572 864 o / 3 145 728 o, taille mesurée ; aucune dépendance neuve ni
GPL/LGPL/AGPL ; exemples jamais lus ni commités, fichiers de test fabriqués ; `git add` fichier par fichier, ni `-A`, ni
`commit -a`, ni push ; commit auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, seule ligne
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun test désactivé ni seuil changé).

**Patron à ne pas reprendre :** trier les pages par `page<N>` dans le Worker (l'ordre du manifeste prime, N6) ;
relire le manifeste en TypeScript (`DOMParser`) — la lecture XML reste au Rust (D16).

**Interdits :** toucher à `workspace.ts`, `board-io.ts`, `main.ts` (T8) ; au module principal.

**Terminé :** tests verts, taille notée, commit `feat(board-worker): read notebook pages in manifest order`.

**Étapes :** 1. tests Rust de la liaison (rouges) ; 2. `notebook_order` lié ; 3. tests TS (rouges) ; 4. types, `notebookOrder`,
message du Worker, `hasBoardReader` ; 5. suites, taille ; 6. commit.

---

### Tâche T6 — Types `BoardSourceFormat`, `resolveBoardFormat`, détection `.notebook`/`.olf`, palier bas `.flipchart` refusé, bornes de `board-io` exportées

**Objectif :** reconnaître les fichiers (N4), séparer le type de lecture du type d'export (N5), choisir le dialecte d'un
ZIP sur son contenu, offrir les extensions dans « Importer » (N22) ; **palier bas du lot 2** : un fichier signé Bamboo
(`.flipchart` ou extension inconnue, jamais `.as4a`) est reconnu et refusé avec un message clair, 0 o dans le Wasm (le
lot 3, T16, remplace ce gestionnaire) ; exporter les bornes de `board-io.ts` pour `readOlf` (T7).

**Fichiers :** `apps/web/src/app/board-io.ts`, `board-files.ts`, `board-files.test.ts`, `apps/web/src/platform/import.ts`,
`import.test.ts`, `files.ts`, `files.test.ts`, `apps/web/src/platform/bamboo.ts` (nouveau, magie seule), `bamboo.test.ts` (nouveau).

**Interfaces :**
- Produit, `board-io.ts` : `export type BoardFormat = "iwb" | "ubz";` (n'est plus `BoardDialect`) ;
  `export type BoardSourceFormat = BoardFormat | "notebook" | "olf" | "flipchart";` ;
  `export` ajouté (valeurs inchangées) à `MAX_GROUP_DEPTH`, `MAX_POINTS`, `MAX_SPANS` (`board-io.ts:21-28`) — lus par T7, jamais recopiés.
- Produit (nouveau, liste du cadrage) : `apps/web/src/platform/bamboo.ts` — `export function hasBambooMagic(head: Uint8Array): boolean`
  (8 octets ` Bamboo ` = `20 42 61 6d 62 6f 6f 20`) et `export const FLIPCHART_LATER_MESSAGE = "paperboard ActivInspire pas encore lu : exporter en .iwb ou PDF depuis ActivInspire";` (le lot 3 étend ce module).
- Produit, `import.ts` : `export function flipchartRefusalHandler(): ImportHandler` (palier bas) :
  `detect: (head, name) => hasBambooMagic(head) && extensionOf(name) !== "as4a" && (extensionOf(name) === "flipchart" || !(IMPORT_EXTENSIONS as readonly string[]).includes(extensionOf(name)))`,
  `limit: { maxBytes: -1, message: FLIPCHART_LATER_MESSAGE }`, `run: async () => "failed"` (patron `unsupportedMediaHandler`, `media-import.ts:230`), placé avec les tableaux, avant `media`.
- Réutilise : `apps/web/src/platform/media-import.ts:230` — `unsupportedMediaHandler` (patron du refus par `limit.maxBytes: -1`, sans l'appeler).
- Réutilise : `apps/web/src/app/board-files.ts:25` — `boardSources` étendu :
  `boardSources(format: "iwb" | "ubz" | "notebook" | "olf", entries): BoardSources` avec
  `interface BoardSources { readonly xml: readonly Blob[]; readonly names: readonly string[]; readonly manifest: Blob | null; readonly json: Blob | null; readonly media: ReadonlyMap<string, Blob>; readonly total: number }`
  (`notebook` : pages `page<N>.svg` triées par N, **toutes** gardées — l'ordre et la coupe à 500 sont au Worker, T5 ; `names` en parallèle ; `olf` : `json` = `content.json`, `xml: []`).
- Produit, `board-files.ts` :
  `export function resolveBoardFormat(ext: "iwb" | "ubz" | "notebook" | "olf", paths: readonly string[]): "iwb" | "ubz" | "notebook" | "olf" | null`
  et `export const boardNoContentMessage = (ext: string): string => \`fichier endommagé : contenu de tableau introuvable dans ce .${ext}\``.
- Réutilise : `apps/web/src/platform/import.ts:288` — `boardHandler(format: "iwb" | "ubz" | "notebook" | "olf", deps)` ; `ImportDeps.openBoard?(f: { readonly name: string; readonly blob: Blob; readonly format: BoardSourceFormat }): Promise<boolean>` (type importé de `board-io.ts` en `import type`, ou redéclaré littéralement si l'import crée un cycle).
- Réutilise : `apps/web/src/platform/import.ts:160` — `hasZipMagic(head)` (détection `notebook`, `olf` : nom + en-tête ZIP).
- `files.ts` : `NOTEBOOK_EXTENSION = ".notebook"`, `OLF_EXTENSION = ".olf"` ; `IMPORT_EXTENSIONS` gagne `"notebook"`, `"olf"` après `"ubz"` ; `IMPORT_FILTER.name = "Images, vidéos, sons, 3D, PDF, tableaux et documents RoomBoard"`.
- Rapport : `Réutilisation : appelé boardHandler, hasZipMagic, boardSources` ou `Réutilisation : écart — <pourquoi>`.

```ts
/** C13 (N4) : dialecte d'un ZIP de tableau sur son contenu ; celui de l'extension gagne si ses marques sont là. */
export function resolveBoardFormat(ext: "iwb" | "ubz" | "notebook" | "olf", paths: readonly string[]): "iwb" | "ubz" | "notebook" | "olf" | null {
  const lower = paths.map((p) => normalBoardPath(p).toLowerCase());
  const has = (n: string): boolean => lower.includes(n);
  const pages = lower.some((p) => /^page\d+\.svg$/.test(p));
  // N6 : un `.notebook` sans manifeste reste un `notebook` (ordre déduit des noms, T5) ; un autre ZIP de pages sans manifeste est un `.ubz`.
  const marks = { iwb: has("content.xml"), notebook: pages && (has("imsmanifest.xml") || ext === "notebook"), olf: has("content.json"), ubz: pages && !has("imsmanifest.xml") } as const;
  if (marks[ext]) return ext;
  for (const f of ["iwb", "notebook", "olf", "ubz"] as const) if (marks[f]) return f;
  return null;
}
```

Gestionnaires : registre `boardHandler("iwb"), boardHandler("ubz"), boardHandler("notebook"), boardHandler("olf")`, avant `media`.
`detect` : `notebook` = `hasExtension(name, ".notebook") && hasZipMagic(head)` ; `olf` = idem `.olf`. `limit` : celui du lot 1.

**Tests rouges (nommés) :**
- `board-files.test.ts` : `C13 N4 : contenu avant extension` (`resolveBoardFormat("notebook", ["content.json"])` → `"olf"` — S3 « un `.olf` renommé `.notebook` s'ouvre comme `.olf` » ; `("iwb", ["imsmanifest.xml","page0.svg"])` → `"notebook"` — effet de bord « un `.iwb` dont le contenu est celui d'un autre format s'ouvre selon son contenu » ; `("ubz", ["page1.svg"])` → `"ubz"` ; `("notebook", ["imsmanifest.xml","page0.svg","content.json"])` → `"notebook"` ; `("olf", ["a.png"])` → `null`) ;
  `C13 N6 : .notebook sans manifeste reste notebook` (`("notebook", ["page0.svg"])` → `"notebook"` ; `("iwb", ["page0.svg"])` → `"ubz"`) ;
  `C13 N6 : boardSources notebook garde toutes les pages et leurs noms` (`page10.svg, page2.svg, imsmanifest.xml, images/a b[1].png` → `names: ["page2.svg","page10.svg"]`, `manifest` non nul, média `images/a b[1].png`) ; `C13 N8 : boardSources olf rend content.json` ; `C13 : boardNoContentMessage`.
- `import.test.ts` (à côté de `:1027`) : `C13 N4 : .notebook ZIP va à openBoard format notebook` ; `.olf` idem ; `C13 N4 : .notebook sans en-tête ZIP n'est pas un tableau` ; effet de bord « un `.notebook` ou un `.olf` aujourd'hui refusé comme fichier inconnu s'ouvre » : `C13 : .olf n'est plus un fichier inconnu`.
- `files.test.ts` : `C13 N22 : IMPORT_EXTENSIONS offre notebook et olf` ; `C13 N22 : le filtre nomme les tableaux`.
- Palier bas, `import.test.ts` : `C13 palier : .flipchart signé refusé` (avis = `FLIPCHART_LATER_MESSAGE`, `openBoard` jamais appelé) ;
  `C13 palier : fichier sans extension signé Bamboo refusé` ; `C13 palier : .as4a signé non pris par le palier` ;
  `C13 palier : .png signé Bamboo reste une image` (extension connue : le palier ne le prend pas) ; `C13 palier : .flipchart sans signature reste inconnu`.
- `bamboo.test.ts` : `C13 N4 : hasBambooMagic` (vrai sur ` Bamboo `, faux sur `PK\x03\x04`, faux sur 7 octets).
- `board-io.test.ts` : `C13 : bornes exportées` (`MAX_POINTS === 1_000_000`, `MAX_SPANS === 10_000`, `MAX_GROUP_DEPTH === 256`).
- Tests à garder verts : `board-files.test.ts`, `import.test.ts`, `files.test.ts` du lot 1 ; `board-io.test.ts` (flux témoin) ; `pnpm exec tsc --noEmit -p .` vert (le type `BoardFormat` restreint ne doit casser aucun appelant de l'export).

**Commande bornée :** commune « Web » avec `src/app/board-files.test.ts src/platform/import.test.ts src/platform/files.test.ts src/app/board-io.test.ts src/platform/bamboo.test.ts` ; N ≥ 15 neufs, `C13 N4 : contenu avant extension` et `C13 palier : .flipchart signé refusé` présents ; puis `cd <wt>/apps/web && nice -n 10 pnpm exec tsc --noEmit -p . 2>&1 | tail -10` sans `error TS`.

**Contraintes :** G1, G2, G5, G6, G7, G8, G10, G11 (recopiées : test rouge d'abord ; `nice -n 10` et `export PATH=…` ;
aucune dépendance neuve ni GPL/LGPL/AGPL ; exemples jamais lus ni commités, fichiers de test fabriqués ; `git add`
fichier par fichier, ni `-A`, ni `commit -a`, ni push ; commit auteur `jejeasterix <jejeasterix@users.noreply.github.com>`,
message anglais, seule ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun test désactivé ni seuil
changé ; scène ≥ 640 px).

**Interdits :** toucher à `workspace.ts` (T8) ; ajouter une action d'export (N2) ; toucher à `toolbar*.ts`, `typed-files.ts` ;
ajouter `flipchart` à `IMPORT_EXTENSIONS` (lot 3) ; changer la valeur d'une borne de `board-io.ts`.

**Terminé :** tests et `tsc` verts, commit `feat(import): detect notebook and olf boards, refuse flipcharts clearly, resolve dialect by content`.

**Étapes :** 1. tests `resolveBoardFormat` (rouges) ; 2. types et fonction ; 3. tests `boardSources` (rouges) ; 4. `boardSources` ;
5. tests `import`/`files` (rouges) ; 6. gestionnaires et extensions ; 7. tests du palier et de `hasBambooMagic` (rouges) ;
8. `bamboo.ts`, `flipchartRefusalHandler`, exports des bornes ; 9. suites, `tsc` ; 10. commit.

---

### Tâche T7 — Lecteur `.olf` (`readOlf`) dans le Worker ZIP, sortie par les bornes de `board-io`

**Objectif :** `content.json` → flux BoardList + avertissements (N8, N9, DA3), **lu dans le Worker ZIP** (jamais sur le
fil principal), taille bornée, sortie qui repasse par les bornes existantes de `board-io.ts`.

**Fichiers :** `apps/web/src/app/olf-read.ts` (nouveau), `olf-read.test.ts` (nouveau), `apps/web/src/platform/zip-worker.ts`,
`zip-worker.test.ts`, `apps/web/src/platform/zip-read.ts`, `zip-read.test.ts`.

**Interfaces :**
- Produit (nouveau, liste du cadrage) : `export function readOlf(json: string): { pages: BoardListPage[]; warnings: string[] }` ; lève `Error(OLF_BROKEN_MESSAGE)` (JSON invalide, pile dépassée, racine sans `olf.pageset` tableau) et `Error(BOARD_OBJECTS_MESSAGE)` au-delà de `BOARD_MAX_OBJECTS`.
- Produit : `export const OLF_BROKEN_MESSAGE = "fichier endommagé : content.json illisible";` ; `export const OLF_MAX_JSON_BYTES = 64 * 1024 * 1024;` (plus gros exemple : 2,6 Mo) ; `export const OLF_TOO_BIG_MESSAGE = "fichier endommagé : content.json trop gros (plus de 64 Mio)";`.
- Réutilise : `apps/web/src/app/board-io.ts:21-41` — types `BoardObject`, `BoardListPage` ; bornes `MAX_POINTS`, `MAX_SPANS`, `MAX_GROUP_DEPTH` (exportées par T6) : un trait de plus de `MAX_POINTS` points ou un texte de plus de `MAX_SPANS` segments → objet illisible ; aucune valeur recopiée.
- Réutilise : `apps/web/src/app/board-io.ts:254` — `encodeBoardList(pages): BoardListData` (dans le Worker : la sortie est un flux, pas un arbre d'objets clonés).
- Réutilise : `apps/web/src/app/board-io.ts:190` — `decodeBoardList(ops, texts, budget)` (sur la page, en T8 : le flux `.olf` passe par le même contrôle que celui du Rust — budget d'objets, `MAX_POINTS`, `MAX_SPANS`, `MAX_GROUP_DEPTH`).
- Réutilise : `apps/web/src/app/board-files.ts` — `BOARD_MAX_OBJECTS`, `BOARD_OBJECTS_MESSAGE`.
- Réutilise : `apps/web/src/platform/zip-read.ts:43` — patron `createZipReader` / `runOnce` : produit `export function createOlfReader(spawn: () => WorkerLike, timeoutMs?: number): (json: Blob) => Promise<BoardPart>` ; message Worker `{ op: "olf", bytes }` → `{ part: { ops: Float32Array; texts: string[]; warnings: string[] } }` (tampon `ops` transféré) ou `{ error }`.
- Worker (`zip-worker.ts`) : `bytes.length > OLF_MAX_JSON_BYTES` → `{ error: OLF_TOO_BIG_MESSAGE }` **avant** décodage ; sinon `TextDecoder("utf-8")`, `readOlf`, `encodeBoardList(pages)`.
- Vérifier au build (`pnpm --filter @roomboard/web build`) que le chunk du Worker ZIP n'embarque ni le DOM ni le cœur (imports de `board-io.ts` : constantes et `encodeBoardList` seulement) ; sinon écart au rapport.
- Rapport : `Réutilisation : appelé BoardListPage, MAX_POINTS, MAX_SPANS, MAX_GROUP_DEPTH, encodeBoardList, createZipReader (patron)` ou `Réutilisation : écart — <pourquoi>`.

**Correspondances exactes (vérifiées sur les exemples, N9) :**
- Matrice d'élément `"a,c,e,b,d,f,0,0,1"` (par lignes) → `m = [v0, v3, v1, v4, v2, v5]` ; puis composée à gauche par
  l'échelle `s = 1920 / largeur du viewbox de la page` (`page.viewbox` « 0 0 3840 2160 » ; repli `olf.width`, puis 1920) :
  `m' = [s·a, s·b, s·c, s·d, s·e, s·f]`. **La matrice de page (`page.matrix`) est une caméra : jamais appliquée.**
- `stroke` : `points` « x,y x,y … » (repère local), `stroke` `#RRGGBB` ou `#AARRGGBB`, `pen-width` → `width` ; `is-highlighter: true` → avertissement « surligneur rendu en trait » ; moins de 2 points → objet illisible.
- `image` : `source` (relatif à l'archive) → `path` ; `x`, `y`, `width`, `height` locaux ; `http(s):`, `file:`, `data:`, absolu ou `..` → avertissement `image distante ou hors de l'archive non chargée`, pas d'objet.
- `textarea` : `x`, `y`, `width`, `height`, `matrix` ; `text-blocks-container[].paragraph.text-list-container[].text` → segments (`text`, `font-size` → taille, `font-weight` `bold`/≥ 600, `font-style` `italic`, `text-decoration` `underline`, `font-family`, `fill` `#AARRGGBB` → `#RRGGBB`) ; paragraphes séparés par `"\n"` ; `custom-data` jamais lu ; taille de boîte = `size` du premier segment (repli 24) ; couleur de boîte = celle du premier segment (repli noir).
- `backgrounds[].background` : `type: "color"` → `background` de la page (`fill`) ; `type: "image"` → image en bas de pile couvrant la page (`x 0, y 0, w = viewbox largeur, h = viewbox hauteur`, `m` = échelle) ; autre type → avertissement `fond non lu`.
- `widget-player` → « widget non lu » ; type d'élément inconnu → « objet d'un type non lu » ; page `is-hidden: true` → lue + « page masquée importée ».
- Avertissements au format du lot 1 : `page N : K <libellé>` (singulier/pluriel), comptés par (page, sorte), ordre de première apparition ; `MAX_PAGES` = 500 avec `boardFirstPagesMessage` du lot 1 ; 100 000 objets → `Error(BOARD_OBJECTS_MESSAGE)`.

```ts
const COLOR = /^#(?:([0-9a-f]{2}))?([0-9a-f]{6})$/i;
/** `#RRGGBB` ou `#AARRGGBB` (alpha ignoré) → `#rrggbb` ; null si illisible. */
export function olfColor(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const m = COLOR.exec(s.trim());
  return m === null ? null : `#${m[2]!.toLowerCase()}`;
}
/** Matrice 3×3 par lignes `a,c,e,b,d,f,0,0,1` → `[a, b, c, d, e, f]`, échelle `s` appliquée ; null si illisible. */
export function olfMatrix(s: unknown, scale: number): Matrix | null {
  if (typeof s !== "string") return [scale, 0, 0, scale, 0, 0];
  const v = s.split(",").map((x) => Number(x.trim()));
  if (v.length < 6 || v.slice(0, 6).some((x) => !Number.isFinite(x))) return null;
  const [a, c, e, b, d, f] = v as [number, number, number, number, number, number];
  return [scale * a, scale * b, scale * c, scale * d, scale * e, scale * f];
}
```
Chaque élément du JSON est `{ "<type>": { … } }` (une seule clé) : lire `Object.keys(el)[0]`. Tout champ lu est contrôlé
(`typeof`, `Number.isFinite`) : une valeur absurde rend l'objet illisible, jamais une exception (sauf racine illisible).

**Tests rouges (nommés), fichiers fabriqués dans le test (objets JS → `JSON.stringify`) :**
- `C13 N9 : matrice lue par lignes` (`"1,0,-10,0,1,-480,0,0,1"`, viewbox 3840 → `m = [0.5, 0, 0, 0.5, -5, -240]`).
- `C13 S2 : trait avec matrice à l'échelle 1920` (trait `points "10,20 30,40"`, `pen-width 9`, `#000000` → `stroke` à 2 points, `width 9`, `m` à l'échelle).
- `C13 S2 : image avec matrice` ; `C13 S2 : zone de texte à deux paragraphes` (segments `"Piano"` gras souligné puis `"\n"` puis `"Keys"` ; couleur `#FF000000` → `#000000`) ; `C13 S2 : fond couleur` ; `C13 S2 : widget non lu` (avertissement `page 1 : 1 widget non lu`).
- `C13 N9 : surligneur averti` ; `C13 N9 : page masquée lue et avertie` ; `C13 N9 : fond image en bas de pile` ; `C13 N9 : matrice de page ignorée`.
- `C13 N13 : image distante jamais chargée` (`http://x/a.png`, `data:…`, `../a.png` → avertissement, aucun objet) — S3.
- `C13 S3 : content.json invalide` (`"{"`, `"[]"`, `'{"olf":1}'` → `OLF_BROKEN_MESSAGE`) ; `C13 N13 : JSON très imbriqué` (`"[".repeat(1e6)` → `OLF_BROKEN_MESSAGE`, pas d'autre erreur).
- `C13 N13 : 100 001 objets refusés` (`BOARD_OBJECTS_MESSAGE`).

- `zip-worker.test.ts` : `C13 N8 : op olf rend un flux` (le flux redécodé par `decodeBoardList` rend les pages de `readOlf`) ;
  `C13 N13 : content.json de plus de 64 Mio refusé avant décodage` (espion : `readOlf` jamais appelé) ;
  `zip-read.test.ts` : `C13 N8 : createOlfReader transfère le flux et rend l'erreur telle quelle`.
- `C13 N13 : trait de plus de MAX_POINTS points illisible` (borne importée de `board-io.ts`).
- Tests à garder verts : `zip-worker.test.ts`, `zip-read.test.ts` (modes `model3d`, `pack`, `board`).

**Commande bornée :** commune « Web » avec `src/app/olf-read.test.ts src/platform/zip-worker.test.ts src/platform/zip-read.test.ts` ; N ≥ 14 neufs, `C13 N9 : matrice lue par lignes` présent.

**Contraintes :** G1, G2, G5, G6, G7, G8, G10 (recopiées : test rouge d'abord ; `nice -n 10` et `export PATH=…` ;
aucune dépendance neuve ni GPL/LGPL/AGPL ; exemples jamais lus ni commités, fichiers de test fabriqués ; `git add`
fichier par fichier, ni `-A`, ni `commit -a`, ni push ; commit auteur `jejeasterix <jejeasterix@users.noreply.github.com>`,
message anglais, seule ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun test désactivé ni seuil changé).

**Patron à ne pas reprendre :** lire la matrice par colonnes (`[v0, v1, v3, v4, v2, v5]`, faux : le trait d'`analisis.olf`
tomberait hors page) ; composer `page.matrix` ; lire `custom-data` (XAML).

**Interdits :** toucher à `board-io.ts` (bornes exportées par T6), au Rust, au Worker des tableaux ; `JSON.parse` sur le fil principal.

**Terminé :** tests verts, commit `feat(olf): read myViewBoard content.json in the zip worker`.

**Étapes :** 1. tests matrice/couleur (rouges) ; 2. `olfColor`, `olfMatrix` ; 3. tests S2 (rouges) ; 4. `readOlf` (pages, éléments) ;
5. tests N13 (rouges) ; 6. bornes (importées) ; 7. tests Worker et `createOlfReader` (rouges) ; 8. `op: "olf"`, `createOlfReader` ;
9. suites, build et contrôle du chunk ; 10. commit.

---

### Tâche T8 — `openBoard` des `.notebook` et `.olf`, ports de l'amorce

**Objectif :** un `.notebook` ou un `.olf` déposé ouvre un onglet (S1, S2, S3) par le même chemin que le lot 1.

**Fichiers :** `apps/web/src/app/workspace.ts`, `workspace.test.ts`, `apps/web/src/app/board-io.ts` (`BoardPorts.read`), `apps/web/src/main.ts`.

**Interfaces :**
- Réutilise : `apps/web/src/app/workspace.ts:531` — `openBoard(file: { name; blob; format: BoardSourceFormat }): Promise<boolean>` étendu (signature de `Workspace` :164 mise au même type).
- Réutilise : `apps/web/src/app/board-io.ts:47` — `BoardPorts.read(files, dialect: BoardDialect, opts?: BoardReadOptions)` ; `main.ts:277` passe `opts` à `boards.read`.
- Réutilise : `apps/web/src/app/board-files.ts` — `resolveBoardFormat`, `boardSources`, `boardNoContentMessage`, `boardWarningsMessage`, `boardFirstPagesMessage`, `boardTabName`, `BOARD_MAX_OBJECTS`, `mergeBoardWarnings` (T6 et lot 1).
- Réutilise : `apps/web/src/platform/zip-read.ts` — `createOlfReader(spawn)` (T7) : nouveau port `BoardPorts.readOlf(json: Blob): Promise<BoardPart>`, amorce `readOlf: createOlfReader(spawnZipWorker)` dans `main.ts:274`.
- Réutilise : `apps/web/src/app/board-io.ts:190` — `decodeBoardList(ops, texts, left)` : la part `.olf` est décodée comme les parts du Rust (bornes communes).
- Réutilise : `apps/web/src/app/board-io.ts:518` — `buildBoardDocument(core, pages, media, deps)`.
- Réutilise : `apps/web/src/platform/image-import.ts` — `decodeImage(blob, kind)` (déjà le `decode` par défaut d'`openBoard`).
- `boardTabName(name, format)` : accepte `BoardSourceFormat` (enlève `.notebook`, `.olf`).
- Rapport : `Réutilisation : appelé resolveBoardFormat, boardSources, readOlf, buildBoardDocument, decodeImage` ou `Réutilisation : écart — <pourquoi>`.

```ts
// workspace.ts, dans openBoard, à la place du choix des sources :
const head = new Uint8Array(await file.blob.slice(0, 4).arrayBuffer());
let parts: readonly BoardPart[];
let src: BoardSources;
if (file.format === "flipchart") throw new Error(boardNoContentMessage("flipchart")); // lot 3 (T16) remplace cette ligne
if (hasZipMagic(head)) {
  const entries = await board.unzip(file.blob);
  const fmt = resolveBoardFormat(file.format, entries.map((e) => e.path));
  if (fmt === null) throw new Error(boardNoContentMessage(file.format));
  src = boardSources(fmt, entries);
  if (fmt === "olf") {
    parts = [await board.readOlf(src.json!)]; // Worker ZIP (T7) : JSON lu hors du fil principal
  } else {
    const xml = await Promise.all(src.xml.map(async (b) => new Uint8Array(await b.arrayBuffer())));
    const manifest = src.manifest === null ? null : new Uint8Array(await src.manifest.arrayBuffer());
    parts = await board.read(xml, fmt, fmt === "notebook" ? { names: src.names, manifest, max: PDF_MAX_PAGES } : undefined);
  }
} else if (file.format === "iwb") { /* inchangé */ }
else throw new Error(file.format === "ubz" ? UBZ_NOT_ZIP_MESSAGE : boardNoContentMessage(file.format));
```
(La suite est celle du lot 1 : décodage des `parts` avec le budget d'objets, `buildBoardDocument`, `mergeBoardWarnings`,
onglet `boardTabName(name, file.format)`.)

**Tests rouges (nommés), `workspace.test.ts` (ports simulés comme le lot 1) :**
- `C13 S1 : .notebook dans l'ordre du manifeste` (le port `read` reçoit `"notebook"` et `opts.names`, `opts.manifest` ; onglet `lecon.roomboard`).
- `C13 S2 : .olf ouvert par le Worker ZIP` (port `readOlf` appelé avec le blob `content.json`, port `read` jamais appelé ; trait, image, fond présents ; avis « widget non lu »).
- `C13 N13 : part .olf hors bornes refusée par decodeBoardList` (port `readOlf` qui rend un flux de 100 001 objets → « Ouverture impossible (x.olf) : fichier de tableau trop gros (plus de 100 000 objets) »).
- `C13 S3 : .olf renommé .notebook s'ouvre comme .olf` ; `C13 S3 : .notebook sans page refusé` (« Ouverture impossible (x.notebook) : fichier endommagé : contenu de tableau introuvable dans ce .notebook ») ; `C13 S3 : content.json invalide → fichier endommagé`.
- `C13 N3 : un tableau ouvre toujours un nouvel onglet` (`target: null`) ; `C13 : .notebook non ZIP refusé`.
- Tests à garder verts : `workspace.test.ts` du lot 1 (`.iwb`, `.ubz`, `exportBoard`), `board-io.test.ts`, `pnpm -r test` entier (≥ 2740 tests).

**Commande bornée :** commune « Web » avec `src/app/workspace.test.ts` (N ≥ 8 neufs, `C13 S1 : .notebook dans l'ordre du manifeste` présent) ;
puis `cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && nice -n 10 pnpm -r test 2>&1 | tail -20` : 0 échec ; `tsc --noEmit` sans `error TS`.

**Contraintes :** G1, G2, G5, G6, G7, G8, G10, G11 (recopiées : test rouge d'abord ; `nice -n 10` et `export PATH=…` ;
aucune dépendance neuve ni GPL/LGPL/AGPL ; exemples jamais lus ni commités, fichiers de test fabriqués ; `git add`
fichier par fichier, ni `-A`, ni `commit -a`, ni push ; commit auteur `jejeasterix <jejeasterix@users.noreply.github.com>`,
message anglais, seule ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun test désactivé ni seuil
changé ; scène ≥ 640 px).

**Interdits :** ajouter un export ; toucher au Rust ; lire un `.flipchart` (lot 3).

**Terminé :** tests verts, commit `feat(workspace): open notebook and olf boards in a new tab`.

**Étapes :** 1. tests S1 (rouges) ; 2. `BoardPorts.read` + `main.ts` ; 3. branche `notebook` ; 4. tests S2/S3 (rouges) ;
5. port `readOlf` + `main.ts`, branche `olf` et refus ; 6. suites ; 7. commit.

---

### Tâche T9 — Essai navigateur lot 2, capture, tailles finales du lot 2

**Objectif :** le geste Playwright du lot 2 (N21) dans `verifier.sh --e2e`, la capture, les tailles (N17).

**Fichiers :** `scripts/essais/c13-tableaux-navigateur.mjs`, `docs/essais/c13-notebook-lecon.png` (nouveau),
`docs/essais/taille-wasm.md` ; correctifs permis (si l'essai révèle un défaut, avec test rouge d'abord) :
`crates/roomboard-formats/src/board/read.rs`, `apps/web/src/app/olf-read.ts`, `apps/web/src/app/workspace.ts`, `apps/web/src/app/board-files.ts`.

**Interfaces :**
- Réutilise : `scripts/essais/c13-tableaux-navigateur.mjs:111-163` — `scenario(page, url, …)`, `drop(name, bytes, elements, pages)`, `waitDialog(part)`, `download(click, name)` ; `scripts/essais/commun.mjs` — `dropFile(page, "#stage", name, bytes, "")`, `stageBox(page, 640)`, `solidPng`.
- Fabriques (dans l'essai) : `notebookZip()` (manifeste `page1.svg` avant `page0.svg`, page 1 : `path` rectangle rempli `#ff0000`, `ellipse`, `<text><tspan font-weight="bold">Leçon<tspan> SMART</tspan></tspan></text>`, `<image xlink:href="images/a%20b[1].png">` + entrée `images/a b[1].png` = `solidPng`, `<flash/>`) ; `olfZip()` (3840 × 2160, trait avec matrice, image avec matrice, zone de texte à deux paragraphes, fond `#FFEECC`, `widget-player`) ; `hostileNotebook()` (DOCTYPE `SYSTEM "file:///etc/passwd"`, `<script>`, entrée `../evil.png` écrite par `zipSync` avec ce nom) ; `badOlf()` (`content.json` = `"{"`).
- Rapport : `Réutilisation : appelé scenario, dropFile, stageBox` ou `Réutilisation : écart — <pourquoi>`.

**Lectures attendues (valeur lue avant image) :**
- S1 : `data-page="1/2"` à l'ouverture, `data-elements` = nombre d'objets de la page du manifeste ; avis contient `Flash non lu` ; onglet `lecon.roomboard` ; page 1 = celle de `page1.svg` (lue par un objet propre, ex. `data-elements`) ; texte éditable (double-clic → `data-editing="1"` ou l'attribut que l'essai du lot 1 lit déjà).
- S2 : onglet `cours.roomboard`, `data-elements="3"` (trait, image, texte), avis contient `widget non lu`, fond lu (attribut de fond que le lot 1 lit déjà, sinon pixel de `#stage` hors objet ≈ `#ffeecc`).
- S3 : `.olf` renommé `.notebook` → mêmes lectures que S2 ; `.notebook` sans page → avis `contenu de tableau introuvable` ; hostile → s'ouvre ou est refusé avec message, aucun `alert`, requêtes hors origine = 0 (compteur `page.on("request")` déjà dans l'essai, sinon l'ajouter) ; `badOlf` → avis `fichier endommagé` ; fichier `cours.flipchart` fabriqué (` Bamboo ` + 32 octets) → avis `exporter en .iwb ou PDF depuis ActivInspire`, aucun onglet (palier bas) ; S1 enregistré en `.roomboard` (`download`) puis redéposé → mêmes `data-page` et `data-elements` ; `socle-v1.roomboard` s'ouvre ; `stageBox(page, 640)` ≥ 640 × 640 avec l'avis visible.
- Chaque scénario imprime `ok — S1 : …`, `ok — S2 : …`, `ok — S3 : …`.

**Preuve visuelle :** `node scripts/essais/c13-tableaux-navigateur.mjs --captures-notebook` (option ajoutée, sans chemin
d'exemple : la capture se fait sur `notebookZip()` fabriqué) écrit `docs/essais/c13-notebook-lecon.png` et imprime
`capture : … data-page="1/2", data-elements=N` ; à décrire au rapport (rectangle rouge, ellipse, texte gras, image, avis).

**Commande bornée :** `cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && CARGO_TARGET_DIR=<wt>/target nice -n 10 scripts/verifier.sh --e2e > /tmp/T9-verif.out 2>&1; echo "code $?"; grep -E "ok — S[123]|C13 tableaux : OK|module Wasm :|module formats :|verifier.sh : (e2e )?OK|FAIL|error\[" /tmp/T9-verif.out | tail -25`
— attendu `code 0`, `ok — S1`, `ok — S2`, `ok — S3`, `C13 tableaux : OK`, `verifier.sh : e2e OK`, module formats ≤ 3 045 012 o.
Tests à garder verts (cités par le cadrage) : `c12-pdf-navigateur.mjs`, `c10b-tableau-navigateur.mjs`, `c4-bibliotheque-navigateur.mjs`, `c15-3d-navigateur.mjs`, `controle-hors-ligne.mjs` (tous dans `verifier.sh --e2e`).

**Tailles :** ajouter à `taille-wasm.md` la ligne `final C13 lot 2 (build de verifier.sh --e2e)` avec les deux valeurs lues ; c'est aussi la
mesure « avant » du lot 3.

**Contraintes :** G1, G2, G3, G4, G5, G6, G7, G8, G9, G10, G11 (recopiées : test rouge d'abord pour tout correctif ;
`nice -n 10` et `export PATH=…` ; `CARGO_TARGET_DIR=<wt>/target` ; plafonds 1 572 864 o / 3 145 728 o jamais touchés,
tailles mesurées ; aucune dépendance neuve ni GPL/LGPL/AGPL ; exemples jamais lus ni commités, fichiers fabriqués ;
`git add` fichier par fichier, ni `-A`, ni `commit -a`, ni push ; commit auteur `jejeasterix <jejeasterix@users.noreply.github.com>`,
message anglais, seule ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun build Tauri ni Android ;
aucun test désactivé ni seuil changé ; scène ≥ 640 px).

**Interdits :** lire un fichier de `~/telechargements-roomboard/` dans l'essai ; changer `verifier.sh`.

**Terminé :** `verifier.sh --e2e` code 0 avec les lignes attendues, capture commitée, tailles notées, commit
`test(e2e): drop generated notebook and olf boards, capture notebook lesson`.

**Étapes :** 1. fabriques + S1 (rouge tant que T8 manque, vert sinon) ; 2. S2 ; 3. S3 ; 4. option de capture ; 5. suite e2e ; 6. tailles ; 7. commit.

---

### Tâche T10 — Fidélité `.notebook` et `.olf` sur les exemples hors dépôt

**Objectif :** mesurer ce que le lot 2 lit des 6 `.notebook` et 6 `.olf` réels (N20).

**Fichiers :** `scripts/essais/c13-fidelite.mjs` (nouveau), `docs/essais/c13-fidelite-lots2-3.md` (nouveau).

**Interfaces :**
- Réutilise : `scripts/essais/commun.mjs` — `serve`, `loadPlaywright`, `dropFile`, `DIST` ; patron `docs/essais/c13-fidelite-iwb.md` (colonnes).
- Produit : `node scripts/essais/c13-fidelite.mjs <fichier>…` (chemins en argument, lancé depuis `<wt>`) : pour chaque fichier, une ligne Markdown `| fichier | pages | objets | avertissements | résultat |` lue sur `#stage` (`data-page`, `data-elements` page par page) et sur l'avis.
- Rapport : `Réutilisation : appelé serve, dropFile` ou `Réutilisation : écart — <pourquoi>`.

**Commande bornée :** `cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && nice -n 10 pnpm --filter @roomboard/web build 2>&1 | tail -3 && nice -n 10 node scripts/essais/c13-fidelite.mjs ~/telechargements-roomboard/notebook/*.notebook ~/telechargements-roomboard/olf/*.olf > /tmp/T10-fid.md 2>&1; echo "code $?"; grep -c '^| ' /tmp/T10-fid.md`
— attendu ≥ 12 lignes ; puis `git -C <wt> status --short` sans `.notebook` ni `.olf`.

**Contraintes :** G2, G5, G6, G7, G8, G9 (recopiées : `nice -n 10` et `export PATH=…` ; aucune dépendance neuve ni
GPL/LGPL/AGPL ; exemples jamais commités, jamais copiés, jamais lus par un interpréteur lancé depuis leur dossier (chemins
en argument, cwd = `<wt>`) ; `git add` fichier par fichier, ni `-A`, ni `commit -a`, ni push ; commit auteur
`jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, seule ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun build Tauri ni Android).

**Interdits :** brancher le script dans `verifier.sh` ; corriger le code (un défaut vu → au rapport, pour T9 ou la clôture).

**Terminé :** tableau commité avec, sous lui, le niveau atteint par format (B pour `.notebook`, A/B pour `.olf`, N1) et les sortes les plus fréquentes d'avertissements ; commit `docs(essais): measure notebook and olf fidelity on real samples`.

**Étapes :** 1. script (un navigateur, un onglet par fichier, onglets fermés entre deux) ; 2. build ; 3. mesure ; 4. tableau ; 5. commit.

---

## Lot 3

Seconde PR. Branche `feat/usage-c13-lot3-flipchart` tirée de `main` **après** la fusion du lot 2, lancée seulement si cette
fusion a lieu avant 11:45 ; worktree du lot `~/projets/roomboard-wt/usage-c13-lot3`, worktrees de tâche
`~/projets/roomboard-wt/usage-c13-lot3--T<n>`. Tout ce que le lot 2 a livré (`safeArchivePath`, `rect_of`, `bamboo.ts`
avec `hasBambooMagic`, palier bas `flipchartRefusalHandler`, bornes exportées) est déjà sur `main`.

### Tâche T11 — Mesure d'entrée du lot 3, arrêt si la marge manque

**Objectif :** mesurer la marge réelle du module `formats` après le lot 2 et décider `go` ou `arrêt` avant tout code
(N17 ; il ne reste qu'environ 1 Ko de jeu sur les 80 Ko du lot 3).

**Fichiers :** `docs/essais/taille-wasm.md`.

**Interfaces :** consomme la ligne `final C13 lot 2` de T9 ; produit, sous la section `## C13 lots 2 et 3` :
`| avant C13 lot 3 (main <sha>) | <principal> o | <formats> o |` et une ligne de verdict.

**Règle de décision (écrite telle quelle dans le fichier) :**
- `budget = 3 145 728 − 20 480 − formats mesuré` (marge finale ≥ 20 Ko gardée).
- `budget ≥ 81 920` (80 Ko) → `lot 3 : go, budget <budget> o` ; T15 vise ce budget.
- `61 440 ≤ budget < 81 920` → `lot 3 : go réduit, budget <budget> o` : T15 lit le texte en texte brut (un segment par objet) et aplatit les groupes **dès le départ** (ordre de repli de N17).
- `budget < 61 440` → `lot 3 : arrêt` : aucune autre tâche du lot 3 ne part ; le palier bas du lot 2 reste en place.
- Après T14 puis T15, la taille mesurée doit rester ≤ `3 145 728 − 20 480` ; au-delà, la tâche s'arrête et le dit (pas de dépassement absorbé).

**Test et commande bornée :** commune « Taille » (`<id>` = T11) sur le worktree du lot 3, et la mesure du principal de T1 ;
attendu : deux nombres, principal inchangé depuis `final C13 lot 2`.

**Contraintes :** G2, G3, G4, G6, G7, G8, G9 (recopiées : `nice -n 10` et `export PATH=…` ; `CARGO_TARGET_DIR=<wt>/target` ;
plafonds 1 572 864 o et 3 145 728 o jamais touchés ; exemples jamais lus ni commités ; `git add` fichier par fichier, ni `-A`,
ni `commit -a`, ni push ; commit auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, seule ligne
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun build Tauri ni Android).

**Interdits :** écrire du code ; changer un plafond ; arrondir le verdict.

**Terminé :** lignes écrites, verdict au rapport (`lot 3 : go`, `go réduit` ou `arrêt`), commit `docs(size): measure wasm margin before C13 lot 3`.

**Étapes :** 1. mesures ; 2. calcul ; 3. lignes ; 4. commit.

---

### Tâche T12 — Fabrique de `.flipchart` de test (`makeFlipchart`)

**Objectif :** le générateur unique de `.flipchart` (N19), employé par vitest (T13) et l'essai (T17).

**Fichiers :** `scripts/essais/fabriques/flipchart.mjs`, `flipchart.d.mts` (nouveaux) ; test `apps/web/src/platform/fabrique-flipchart.test.ts`
(nouveau, importe `../../../../scripts/essais/fabriques/flipchart.mjs` : aucune configuration vitest touchée).

**Interfaces :**
- Produit (nouveau, liste du cadrage) : `makeFlipchart(pages: FabPage[], deflate: (b: Uint8Array) => Uint8Array, opts?: FabOptions): Uint8Array`
  avec `FabPage = { strokes?: { points: [number, number][]; color?: number; width?: number }[]; lines?: …; rects?: { x; y; w; h; fill?: number }[]; texts?: { x; y; runs: { text: string; bold?: boolean; size?: number; color?: number }[] }[]; images?: { name: string; bytes: Uint8Array; x; y; w; h }[]; actions?: number }`
  et `FabOptions = { lie?: { entry: string; announced: number }; nestFpg?: boolean; extraEntries?: number; oddUtf16?: boolean }` (cas hostiles de S5).
- Produit : `bambooContainer(entries: { name: string; data: Uint8Array; compressed: boolean; announced?: number }[], deflate): Uint8Array` et `qCompress(data, deflate): Uint8Array` (en-tête 4 octets **big-endian** = taille, puis flux zlib).
- Référence : ActCraft `tests/support/flipchartwriter.h:1-999` (écrivain de test), `formats/src/bamboo.cpp:78-114` (en-tête et entrées), `bamboo.cpp:185-250` (index culm), `formats/src/flipchartids.h:14-41` (identifiants).
- Rapport : `Réutilisation : écart — module neuf (liste du cadrage), aucun existant`.

**Format à écrire (patron qui se trompe facilement) :**
- Conteneur : `" Bamboo "` (8 o), `u16 LE` version 7, `qstring` format, 8 o réservés, puis entrées jusqu'à la fin.
- `qstring` : `u32 LE` longueur **en octets** (`0xFFFFFFFF` = nulle), puis UTF-16LE.
- Entrée : `qstring` nom, `qstring` ×3 dates, `u64 LE` taille annoncée (décompressée), `u8` compressé, `u64 LE` taille stockée, octets stockés (compressé : `qCompress`).
- Racine : `<page>.fpg` compressé = un conteneur Bamboo imbriqué contenant `<page>.in` (index `# culm #` + 4 o, puis `N u32 nodeId u32 type u32 storageId`, `S u32 ref s`, `n`) et `<id>.io` (flux d'objets ` Bamboo ` u16 1 u16 7 puis balises `O`…, comme `flipchartwriter.h`) ; images = entrées de la racine.

**Tests rouges (nommés) :** `fabrique : en-tête Bamboo v7` ; `fabrique : qCompress big-endian` (4 premiers octets = taille) ;
`fabrique : deux pages en .fpg imbriqués` (noms d'entrées lus à la main) ; `fabrique : taille mensongère posée` (`lie`).

**Commande bornée :** commune « Web » avec `src/platform/fabrique-flipchart.test.ts` ; N ≥ 4, `fabrique : en-tête Bamboo v7` présent.

**Contraintes :** G1, G2, G5, G6, G7, G8, G10 (recopiées : test rouge d'abord ; `nice -n 10` et `export PATH=…` ;
aucune dépendance neuve ni GPL/LGPL/AGPL ; exemples jamais lus ni commités, fichiers de test fabriqués ; `git add`
fichier par fichier, ni `-A`, ni `commit -a`, ni push ; commit auteur `jejeasterix <jejeasterix@users.noreply.github.com>`,
message anglais, seule ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun test désactivé ni seuil changé).
Code repris d'ActCraft : commentaire d'en-tête « porté d'ActCraft (même auteur), `tests/support/flipchartwriter.h` ».

**Interdits :** importer `fflate` ou `node:zlib` dans la fabrique (le `deflate` est injecté : `zlibSync` côté vitest, `zlib.deflateSync` côté essai).

**Terminé :** tests verts, commit `test(flipchart): single generator of synthetic flipchart files`.

**Étapes :** 1. tests (rouges) ; 2. `qstring`, `qCompress`, `bambooContainer` ; 3. index et flux d'objets ; 4. `makeFlipchart` et options hostiles ; 5. suite ; 6. commit.

---

### Tâche T13 — Conteneur Bamboo borné (`readBamboo`) et mode `bamboo` du Worker ZIP

**Objectif :** lire le conteneur et les `.fpg` dans le Worker ZIP, avec toutes les bornes de N13 (S5).

**Fichiers :** `apps/web/src/platform/bamboo.ts`, `bamboo.test.ts` (créés au lot 2 par T6 avec `hasBambooMagic` : étendus), `zip-worker.ts`, `zip-worker.test.ts`, `zip-read.ts`, `zip-read.test.ts`.

**Interfaces :**
- Réutilise : `apps/web/src/platform/bamboo.ts` — `hasBambooMagic(head: Uint8Array): boolean` (T6, lot 2) : appelé, jamais réécrit.
- Produit (nouveau, liste du cadrage) : `export function readBamboo(data: Uint8Array, keep: (name: string) => boolean, limits: { readonly entries: number; readonly bytes: number }): { path: string; bytes: Uint8Array }[]` ; chemins des entrées d'un `.fpg` : `<page>.fpg/<nom>` ; lève `Error` aux messages ci-dessous.
- Produit : `export function keepBambooPath(name: string): boolean` (`.in`, `.io`, `.ir`, `.fpg`, `version`, images de `BOARD_ZIP_EXTENSIONS` ; tout passe d'abord par `safeArchivePath`).
- Réutilise : `apps/web/src/platform/archive-path.ts` — `safeArchivePath(name)` (T2).
- Réutilise : `fflate` 0.8.3 — `new Unzlib((chunk, final) => …)`, `push(part, final)` en flux.
- Réutilise : `apps/web/src/platform/zip-read.ts:43` — `createZipReader(spawn, timeout, mode)` étendu au mode `"bamboo"` ; Worker : `{ op: "unzip", mode: "bamboo", bytes }` → `{ entries }` (forme du lot 1). Écart assumé au cadrage (`{ op: "bamboo" }`) : même message, un mode de plus.
- Bornes : `BAMBOO_LIMITS = { entries: 20_000, bytes: 256 * 1024 * 1024 }` (exporté).
- Messages : `BAMBOO_NOT_FLIPCHART = "fichier endommagé : ce n'est pas un paperboard ActivInspire"` ; `bambooLieMessage(name) = \`fichier endommagé : entrée ${name} de taille mensongère\`` ; `"fichier endommagé : paperboard imbriqué trop profond"` ; `"fichier endommagé : trop d'entrées dans le paperboard"` ; `"fichier endommagé : paperboard trop gros une fois décompressé"` ; `"fichier endommagé : nom d'entrée illisible"` ; `"fichier endommagé : entrée tronquée"`.
- Rapport : `Réutilisation : appelé safeArchivePath, Unzlib, createZipReader` ou `Réutilisation : écart — <pourquoi>`.

**Code (bornes qCompress, patron qui se trompe facilement) :**
```ts
// `hasBambooMagic` existe déjà dans ce module (T6).
class Cur {
  pos: number;
  constructor(readonly d: Uint8Array, pos: number) { this.pos = pos; }
  private view = new DataView(this.d.buffer, this.d.byteOffset, this.d.byteLength);
  has(n: number): boolean { return n >= 0 && this.pos + n <= this.d.length; }
  u8(): number { if (!this.has(1)) throw trunc(); return this.d[this.pos++]!; }
  u16(): number { if (!this.has(2)) throw trunc(); const v = this.view.getUint16(this.pos, true); this.pos += 2; return v; }
  u32(): number { if (!this.has(4)) throw trunc(); const v = this.view.getUint32(this.pos, true); this.pos += 4; return v; }
  /** u64 LE : au-delà de 2^53 → +Infinity (refusé par le budget). */
  u64(): number { const lo = this.u32(); const hi = this.u32(); return hi >= 0x200000 ? Number.POSITIVE_INFINITY : hi * 2 ** 32 + lo; }
  bytes(n: number): Uint8Array { if (!Number.isFinite(n) || !this.has(n)) throw trunc(); const b = this.d.subarray(this.pos, this.pos + n); this.pos += n; return b; }
  qstring(): string {
    const n = this.u32();
    if (n === 0xffffffff) return "";
    if (n % 2 !== 0 || !this.has(n)) throw new Error("fichier endommagé : nom d'entrée illisible");
    return new TextDecoder("utf-16le", { fatal: false }).decode(this.bytes(n));
  }
}
const trunc = (): Error => new Error("fichier endommagé : entrée tronquée");

/** qCompress : 4 octets big-endian (taille) puis zlib. `announced` (entrée) doit égaler l'en-tête ; la sortie ne
 *  dépasse jamais `announced` (arrêt au premier octet de trop) et doit l'atteindre exactement. */
function inflateBounded(raw: Uint8Array, announced: number, name: string): Uint8Array {
  if (raw.length < 4) throw new Error(bambooLieMessage(name));
  const head = ((raw[0]! << 24) >>> 0) + (raw[1]! << 16) + (raw[2]! << 8) + raw[3]!;
  if (head !== announced) throw new Error(bambooLieMessage(name));
  if (announced === 0) return new Uint8Array(0);
  const out = new Uint8Array(announced);
  let at = 0;
  let ended = false;
  const z = new Unzlib((chunk, final) => {
    if (at + chunk.length > announced) throw new Error(bambooLieMessage(name)); // bombe : arrêt immédiat
    out.set(chunk, at);
    at += chunk.length;
    if (final) ended = true;
  });
  const STEP = 64 * 1024;
  for (let i = 4; i < raw.length; i += STEP) z.push(raw.subarray(i, Math.min(raw.length, i + STEP)), i + STEP >= raw.length);
  if (!ended || at !== announced) throw new Error(bambooLieMessage(name));
  return out;
}

export function readBamboo(data: Uint8Array, keep: (name: string) => boolean, limits: { readonly entries: number; readonly bytes: number }): { path: string; bytes: Uint8Array }[] {
  const budget = { entries: limits.entries, bytes: limits.bytes };
  const out: { path: string; bytes: Uint8Array }[] = [];
  const walk = (d: Uint8Array, prefix: string, depth: number): void => {
    if (!hasBambooMagic(d)) throw new Error(BAMBOO_NOT_FLIPCHART);
    const c = new Cur(d, 8);
    c.u16(); c.qstring(); c.bytes(8);
    while (c.pos < d.length) {
      if (--budget.entries < 0) throw new Error("fichier endommagé : trop d'entrées dans le paperboard");
      const name = c.qstring(); c.qstring(); c.qstring(); c.qstring();
      const size = c.u64();
      const compressed = c.u8() !== 0;
      const stored = c.u64();
      const raw = c.bytes(stored);
      const safe = safeArchivePath(name);
      if (safe === null || !keep(safe)) continue; // jamais décompressé
      const isFpg = safe.toLowerCase().endsWith(".fpg");
      if (isFpg && depth >= 1) throw new Error("fichier endommagé : paperboard imbriqué trop profond");
      if (size > budget.bytes) throw new Error("fichier endommagé : paperboard trop gros une fois décompressé"); // avant toute décompression
      budget.bytes -= size;
      const bytes = compressed ? inflateBounded(raw, size, safe) : raw.length === size ? raw.slice() : (() => { throw new Error(bambooLieMessage(safe)); })();
      if (isFpg) walk(bytes, `${prefix}${safe}/`, depth + 1);
      else out.push({ path: `${prefix}${safe}`, bytes });
    }
  };
  walk(data, "", 0);
  return out;
}
```
Vérifier au test que `Unzlib` propage l'exception lancée dans son rappel (sinon : drapeau `overflow` levé après `push`
et arrêt de la boucle au premier `push` qui l'a posé ; la borne « jamais plus que l'annonce en mémoire » tient par le
tampon fixe `out`).

**Tests rouges (nommés), fichiers fabriqués par `makeFlipchart`/`bambooContainer` (T12), `deflate` = `zlibSync` de fflate :**
- `C13 N13 : bombe qCompress arrêtée` (entrée annoncée 1 024 o, données de 300 Mio de zéros compressées → `bambooLieMessage`, sans allouer plus de 1 024 o ; durée < 2 s) — S5.
- `C13 N13 : taille annoncée plus grande que la réalité` → `bambooLieMessage` — S5.
- `C13 N13 : taille annoncée au-delà du budget, rien décompressé` (`limits.bytes` = 1 000, annonce 2 000 → message de budget ; espion sur `Unzlib` jamais construit, ou données zlib invalides qui ne lèvent pas) — S5.
- `C13 N13 : en-tête qCompress différent de l'annonce` ; `C13 N13 : .fpg dans un .fpg refusé` — S5 ; `C13 N13 : 20 001 entrées refusées` — S5 ; `C13 N13 : chaîne UTF-16 de longueur impaire` — S5 ; `C13 N13 : entrée tronquée`.
- `C13 N11 : deux pages lues avec leurs chemins <page>.fpg/<nom>` ; `C13 N15 : .tif, .thm, .wav, .swf jamais décompressés` (espion sur `inflateBounded` via un `.thm` corrompu qui ne lève pas) ; `C13 N16 : ../x.io et __MACOSX ignorés`.
- `zip-worker.test.ts` : `C13 N11 : mode bamboo rend les entrées` ; `zip-read.test.ts` : `C13 N11 : createZipReader mode bamboo`.
- Tests à garder verts : `zip-worker.test.ts`, `zip-read.test.ts` (modes `model3d`, `pack`, `board`).

**Commande bornée :** commune « Web » avec `src/platform/bamboo.test.ts src/platform/zip-worker.test.ts src/platform/zip-read.test.ts` ;
N ≥ 12 neufs, `C13 N13 : bombe qCompress arrêtée` présent.

**Contraintes :** G1, G2, G5, G6, G7, G8, G10 (recopiées : test rouge d'abord ; `nice -n 10` et `export PATH=…` ;
aucune dépendance neuve ni GPL/LGPL/AGPL ; exemples jamais lus ni commités, fichiers de test fabriqués ; `git add`
fichier par fichier, ni `-A`, ni `commit -a`, ni push ; commit auteur `jejeasterix <jejeasterix@users.noreply.github.com>`,
message anglais, seule ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun test désactivé ni seuil changé).

**Patron à ne pas reprendre :** `unzlibSync(raw.subarray(4))` (fflate) puis comparer la taille — il décompresse la bombe
entière avant de comparer ; la référence ActCraft le dit (`~/projets/actcraft/formats/src/bamboo.cpp:148-160`, tampon de la taille annoncée, jamais plus).

**Interdits :** décompresser en Rust ; copier une image dans le Wasm ; toucher à `import.ts`, `workspace.ts` (T16).

**Terminé :** tests verts, commit `feat(bamboo): bounded flipchart container reader in the zip worker`.

**Étapes :** 1. tests de magie et de structure (rouges) ; 2. `Cur`, `readBamboo` sans compression ; 3. tests bornes (rouges) ;
4. `inflateBounded` ; 5. tests Worker (rouges) ; 6. mode `bamboo` ; 7. suites ; 8. commit.

---

### Tâche T14 — Rust : flux d'objets Qt et index culm (`flipchart::stream`, `index`, `ids`)

**Objectif :** lire les `.io` et `.in` en arbres bornés (N12, N13), base de `flipchart::read`.

**Fichiers :** `crates/roomboard-formats/src/lib.rs` (`pub mod flipchart;`), `crates/roomboard-formats/src/flipchart.rs`,
`flipchart/stream.rs`, `flipchart/index.rs`, `flipchart/ids.rs` (nouveaux).

**Interfaces :**
- Produit : `pub(crate) fn parse_index(data: &[u8]) -> Result<IndexNode, String>` avec `pub(crate) struct IndexNode { pub node_id: u32, pub kind: u32, pub storage_id: u32, pub refs: Vec<u32>, pub children: Vec<IndexNode> }` (`storage_name() -> String` = `"{storage_id}.io"`).
- Produit : `pub(crate) fn parse_object_stream(data: &[u8]) -> Result<StreamObject, String>` ; `pub(crate) struct StreamObject { pub class: u16, pub id: u32, pub fields: Vec<(u16, Value)> }`, `pub(crate) enum Value { Int(i64), Num(f64), Bool(bool), Str(String), Bytes(Vec<u8>), Point(f64, f64), Size(f64, f64), Rect(f64, f64, f64, f64), Color(u8, u8, u8, u8), Pointer(u32), Object(Box<StreamObject>), List(Vec<Value>), Polyline(Vec<[f32; 2]>), Skipped }` et accesseurs `find(id)`, `as_number`, `as_bool`, `as_str`, `as_point`, `as_rect`, `as_color`, `as_objects`, `as_polylines`.
- Produit : `ids.rs` : constantes recopiées à la main de `flipchartids.h:14-41` (sans nom de Promethean), dont `STROKE = 3, LINE = 5, SHAPE = 7, IMAGE = 9, TEXT = 11, GROUP = 18`, actions `22..=28, 50, 463`, grille `13, 14`, étiquettes `53`, connecteurs `52`, média `253`, MathML `460`, texte vertical `469`.
- Bornes : `MAX_NESTING = 32` (objets plus profonds → `Value::Skipped` + compteur `skipped_deep`), toute longueur lue comparée aux octets restants **avant** allocation, profondeur d'index 256 (ActCraft).
- Rapport : `Réutilisation : écart — module neuf (liste du cadrage, DA5), aucun lecteur binaire existant réutilisable (constat board.rs:358 non aggravé)`.

**Référence à porter (concepteur-critique) :** `~/projets/actcraft/formats/src/objectstream.cpp:1-405` (lecteur, `readUser`,
`readStreamValue`, `readObject`, profondeur), `objectstream.cpp:408-530` (accesseurs), `formats/src/bamboo.cpp:185-250`
(`parseIndex`), `formats/include/actcraft/formats/objectstream.h:85-87` (`kMaxNesting`), `formats/src/flipchartids.h:14-41`.

**Patron à ne pas reprendre :** le curseur de `board.rs:358` (flux de f32 de la page, autre format) ; `Vec::with_capacity(n)`
sur une longueur lue avant de la comparer aux octets restants (référence : `objectstream.cpp` et `bamboo.cpp:42-55`, `has(n)` d'abord) ;
récursion sans compteur de profondeur.

**Tests rouges (nommés), écrivain de test minimal `#[cfg(test)] mod writer` (forme de `flipchartwriter.h`) :**
`index_reads_nested_nodes_and_refs` ; `index_refuses_bad_magic_unclosed_and_two_roots` ; `stream_reads_header_and_one_object` ;
`stream_reads_points_colors_rects_and_strings` ; `stream_lying_length_is_an_error_without_allocation` (longueur 0xFFFFFFF0) — S5 ;
`stream_nesting_beyond_32_is_skipped` (40 niveaux : objets 33 à 40 sautés, compteur 8) — S5 ; `stream_odd_utf16_is_an_error` — S5 ;
`stream_truncated_is_an_error` ; `ids_have_the_kinds_of_n12` ; `stream_unknown_value_tag_is_an_error`.

**Commande bornée :** commune « Rust » filtre `flipchart::` ; N ≥ 10, `stream_nesting_beyond_32_is_skipped` présent ; commune « Taille » (`<id>` = T14), valeur au rapport.

**Contraintes :** G1, G2, G3, G4, G5, G6, G7, G8, G10 (recopiées : test rouge d'abord ; `nice -n 10` et `export PATH=…` ;
`CARGO_TARGET_DIR=<wt>/target` ; plafonds 1 572 864 o / 3 145 728 o, taille mesurée ; aucune dépendance neuve ni
GPL/LGPL/AGPL ; exemples jamais lus ni commités, fichiers de test fabriqués ; `git add` fichier par fichier, ni `-A`, ni
`commit -a`, ni push ; commit auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, seule ligne
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun test désactivé ni seuil changé). Clippy `-D warnings` vert.
En-tête de module : « porté d'ActCraft (même auteur, U39, 0246) ».

**Interdits :** décompression zlib en Rust ; dépendance au ZIP ou au `Doc` ; toucher à `board/`.

**Terminé :** tests et clippy verts, taille notée, commit `feat(formats): flipchart object stream and culm index readers`.

**Étapes :** 1. écrivain de test + tests index (rouges) ; 2. `index.rs` ; 3. tests flux (rouges) ; 4. `stream.rs` ; 5. `ids.rs` ; 6. bornes (tests S5) ; 7. suite, clippy, taille ; 8. commit.

---

### Tâche T15 — Rust : `flipchart::read` (pages, objets niveau B, avertissements)

**Objectif :** entrées `.in`/`.io`/`.ir`/`version` → `BoardList` (N12, DA5).

**Fichiers :** `crates/roomboard-formats/src/flipchart.rs`, `crates/roomboard-formats/src/flipchart/read.rs` (nouveau).

**Interfaces :**
- Produit (nouveau, liste du cadrage) : `pub fn read(entries: &[(&str, &[u8])], first_page: u32) -> Result<BoardList, BoardError>` (réexporté `flipchart::read`) ; chemins de page `<page>.fpg/<nom>` ; pages dans l'ordre de l'index du document.
- Réutilise : `crates/roomboard-formats/src/board.rs:139-183` — `Item`, `Page`, `Span` ; `board.rs:322` — `encode(&pages) -> BoardList`.
- Réutilise : `crates/roomboard-formats/src/board.rs` — `rect_of(points)` (T3, règle de N7 pour `SHAPE`).
- Réutilise : `flipchart::stream`, `flipchart::index`, `flipchart::ids` (T14).
- Avertissements : `page N : K <libellé>` (mêmes formes que `read.rs`), sortes : `image TIFF non lue` (`.tif`/`.tiff`) et `image d'un format non lu (EMF, WMF…)` (N14), `action non lue`, `grille non lue`, `étiquette non lue`, `connecteur non lu`, `son ou vidéo non lu`, `formule MathML non lue`, `texte vertical non lu`, `rideau non lu`, `projecteur non lu`, `repère XY non lu`, `groupe en cycle ignoré`, `objet trop imbriqué ignoré` ; document : `côté de page hors bornes : 1024 × 768` ; `500 premières pages importées sur N`.
- `href` d'image = nom d'entrée de la racine donné par la table des ressources (`.ir`) ; la page associe les images par ce nom (T16).
- Rapport : `Réutilisation : appelé encode, rect_of, parse_object_stream, parse_index` ou `Réutilisation : écart — <pourquoi>`.

**Référence à porter :** `~/projets/actcraft/formats/src/flipchart.cpp:41-300` (couleurs, contour, remplissage, transformation
locale `localTransform` :211), `flipchart.cpp:546-700` (document, pages, ressources), `flipchart.cpp:850-1040` (objets par sorte,
ordre de dessin couche → profondeur → arbre, § 7.3), `flipchartids.h:14-41`.

**Patron à ne pas reprendre :** construire des commandes du `Doc` ou un `core::Page` d'ActCraft (la sortie est `Vec<Page>` puis
`encode`, DA5) ; suivre les pointeurs de groupe sans ensemble des visités (cycle → boucle infinie) ; prendre la taille de
page sans la borner (`]0, 100 000]`).

**Tests rouges (nommés), entrées fabriquées par l'écrivain de test de T14 :**
`two_pages_with_stroke_line_rect_text_image` (S4 : 2 pages, trait, ligne ouverte, rectangle plein → `Shape Rect` rempli, texte à deux runs → 2 segments gras/couleur, image PNG → `Image` `href` = nom) ;
`tiff_image_is_warned_not_read` (S4) ; `action_is_warned` (S4) ; `group_cycle_is_ignored_with_warning` ; `page_side_out_of_bounds_falls_back` ;
`draw_order_follows_layer_then_depth` ; `missing_io_is_broken` ; `more_than_100000_objects_is_too_big` ; `deep_objects_are_warned` (S5) ; `grid_and_labels_are_warned`.

**Commande bornée :** commune « Rust » filtre `flipchart::read` ; N ≥ 10, `two_pages_with_stroke_line_rect_text_image` présent ;
commune « Taille » (`<id>` = T15) ≤ `3 145 728 − 20 480` o et dans le budget écrit par T11 (verdict `go réduit` : texte brut et groupes aplatis dès le départ). Dépassement : retirer d'abord les segments (texte brut), puis les groupes (aplatis), dire lequel au rapport (N17) ; s'il persiste, arrêt et rapport.

**Contraintes :** G1, G2, G3, G4, G5, G6, G7, G8, G10 (recopiées : test rouge d'abord ; `nice -n 10` et `export PATH=…` ;
`CARGO_TARGET_DIR=<wt>/target` ; plafonds 1 572 864 o / 3 145 728 o, taille mesurée ; aucune dépendance neuve ni
GPL/LGPL/AGPL ; exemples jamais lus ni commités, fichiers de test fabriqués ; `git add` fichier par fichier, ni `-A`, ni
`commit -a`, ni push ; commit auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, seule ligne
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun test désactivé ni seuil changé). Clippy `-D warnings` vert.

**Interdits :** décompression en Rust ; toucher à `board/read.rs`, `write.rs`.

**Terminé :** tests et clippy verts, taille ≤ budget, commit `feat(formats): read flipchart pages and objects at level B`.

**Étapes :** 1. tests de page et de document (rouges) ; 2. document, pages, fond ; 3. tests par sorte (rouges) ; 4. objets ;
5. tests avertissements et bornes (rouges) ; 6. avertissements ; 7. suite, clippy, taille ; 8. commit.

---

### Tâche T16 — Liaison `FlipchartReader`, détection signature, `openBoard` du `.flipchart`

**Objectif :** un fichier à signature Bamboo (toute extension) ouvre un onglet (S4) ; un `.flipchart` sans signature est refusé (S5).

**Fichiers :** `crates/roomboard-formats-wasm/src/lib.rs`, `apps/web/src/platform/board-worker.ts`, `board-reader.ts`,
`board-reader.test.ts`, `container.ts`, `import.ts`, `import.test.ts`, `files.ts`, `files.test.ts`, `apps/web/src/app/board-io.ts`,
`board-files.ts`, `board-files.test.ts`, `workspace.ts`, `workspace.test.ts`, `apps/web/src/main.ts`.

**Interfaces :**
- Réutilise : `crates/roomboard-formats-wasm/src/lib.rs:177` — patron `BoardReader` : ajoute `#[wasm_bindgen] pub struct FlipchartReader` avec `open(names: Vec<String>, data: &[u8], ends: &[u32]) -> Result<FlipchartReader, JsError>` (entrée i = `data[ends[i-1]..ends[i]]`), `ops()`, `texts()`, `warnings()` ; appelle `flipchart::read(&entries, 1)`.
- Réutilise : `apps/web/src/platform/board-reader.ts:68` — `BoardCodec.readFlipchart(entries: readonly { readonly path: string; readonly bytes: Uint8Array }[]): Promise<BoardPart>` (Worker `{ op: "flipchart", names, data, ends }`, un seul tampon transféré).
- `container.ts` : `FlipchartBinding` et `hasFlipchartReader(m)`.
- Réutilise : `apps/web/src/platform/import.ts:288` — `flipchartHandler(deps)` (patron `boardHandler`) **remplace** `flipchartRefusalHandler` (palier bas du lot 2, retiré avec `FLIPCHART_LATER_MESSAGE` et ses tests `C13 palier : …`, réécrits en tests d'ouverture) : `detect: (head, name) => extensionOf(name) !== "as4a" && (hasBambooMagic(head) || hasExtension(name, ".flipchart"))` ; `run` : signature absente → `say` du refus `BAMBOO_NOT_FLIPCHART` par `openBoard` (format `"flipchart"`) ; placé avec les tableaux, avant `media`.
- Réutilise : `apps/web/src/platform/bamboo.ts` — `hasBambooMagic`, `keepBambooPath`, `BAMBOO_NOT_FLIPCHART` (T13).
- Réutilise : `apps/web/src/app/workspace.ts:531` — `openBoard` : branche `"flipchart"` (remplace la ligne posée par T8) : signature contrôlée, `board.unbamboo(blob)` (nouveau port `BoardPorts.unbamboo`, amorce : `createZipReader(spawnZipWorker, undefined, "bamboo")`), entrées `.in/.io/.ir/version` → `board.readFlipchart`, images → `media` (clé = chemin), puis le chemin commun (`decodeBoardList`, `buildBoardDocument`, avis, onglet).
- `files.ts` : `FLIPCHART_EXTENSION = ".flipchart"` dans `IMPORT_EXTENSIONS`. `board-files.ts` : `boardTabName` enlève `.flipchart`.
- Rapport : `Réutilisation : appelé BoardReader (patron), BoardCodec, boardHandler (patron), hasBambooMagic, openBoard, buildBoardDocument` ou `Réutilisation : écart — <pourquoi>`.

**Tests rouges (nommés) :**
- `import.test.ts` : `C13 N4 : signature Bamboo ouvre un .flipchart quelle que soit l'extension` (effet de bord « un fichier à signature Bamboo s'ouvre quelle que soit son extension » ; `.as4a` exclu) ; `C13 : palier bas remplacé` (aucun avis `FLIPCHART_LATER_MESSAGE`) ; `C13 S5 : .flipchart sans signature refusé` ; `C13 S5 : .txt renommé .flipchart refusé`.
- `board-reader.test.ts` : `C13 N11 : readFlipchart envoie noms, données et bornes` ; `hasFlipchartReader`.
- `workspace.test.ts` : `C13 S4 : .flipchart ouvert` (2 pages, avis `image TIFF non lue` et `action non lue`, onglet `x.roomboard`) ; `C13 S5 : bombe refusée sans plantage` (port `unbamboo` qui rejette `bambooLieMessage`) ; `C13 S4 : images en media, jamais dans le Worker des tableaux`.
- Rust : `flipchart_reader_opens_entries_by_ends` ; `flipchart_reader_refuses_bad_ends`.
- `files.test.ts` : `C13 : IMPORT_EXTENSIONS offre flipchart`.
- Tests à garder verts : tous ceux du lot 2 dans ces fichiers ; `pnpm -r test` entier.

**Commande bornée :** commune « Rust » `-p roomboard-formats-wasm flipchart` (N ≥ 2) ; commune « Web » avec
`src/platform/import.test.ts src/platform/board-reader.test.ts src/app/workspace.test.ts src/app/board-files.test.ts src/platform/files.test.ts`
(N ≥ 10 neufs, `C13 S4 : .flipchart ouvert` présent) ; `pnpm -r test` 0 échec ; commune « Taille » (`<id>` = T16).

**Contraintes :** G1, G2, G3, G4, G5, G6, G7, G8, G10, G11 (recopiées : test rouge d'abord ; `nice -n 10` et `export PATH=…` ;
`CARGO_TARGET_DIR=<wt>/target` ; plafonds 1 572 864 o / 3 145 728 o, taille mesurée ; aucune dépendance neuve ni
GPL/LGPL/AGPL ; exemples jamais lus ni commités, fichiers de test fabriqués ; `git add` fichier par fichier, ni `-A`, ni
`commit -a`, ni push ; commit auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, seule ligne
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun test désactivé ni seuil changé ; scène ≥ 640 px).

**Interdits :** copier une image dans le Wasm ; un troisième module Wasm ; un export `.flipchart`.

**Terminé :** tests verts, taille notée, commit `feat(flipchart): open ActivInspire flipcharts in a new tab`.

**Étapes :** 1. tests Rust de la liaison (rouges) ; 2. `FlipchartReader` ; 3. tests codec (rouges) ; 4. Worker et `container.ts` ;
5. tests import/files (rouges) ; 6. gestionnaire et extension ; 7. tests workspace (rouges) ; 8. branche `flipchart`, port, `main.ts` ; 9. suites, taille ; 10. commit.

---

### Tâche T17 — Essai navigateur lot 3, fidélité `.flipchart`, avis de tiers, tailles finales

**Objectif :** S4 et S5 dans `verifier.sh --e2e`, fidélité sur les 5 `.flipchart`, `THIRD_PARTY_NOTICES.md`, tailles finales (N17 à N21).

**Fichiers :** `scripts/essais/c13-tableaux-navigateur.mjs`, `scripts/essais/c13-fidelite.mjs`, `docs/essais/c13-fidelite-lots2-3.md`,
`docs/essais/taille-wasm.md`, `THIRD_PARTY_NOTICES.md` ; correctifs permis (test rouge d'abord) : `crates/roomboard-formats/src/flipchart/*.rs`, `apps/web/src/platform/bamboo.ts`, `apps/web/src/app/workspace.ts`.

**Interfaces :**
- Réutilise : `scripts/essais/c13-tableaux-navigateur.mjs` — `scenario`, `drop`, `waitDialog`, `download` (T9) ; `scripts/essais/commun.mjs` — `dropFile`, `stageBox`.
- Réutilise : `scripts/essais/fabriques/flipchart.mjs` — `makeFlipchart(pages, deflate, opts)` (T12), `deflate` = `zlib.deflateSync` de `node:zlib`.
- Rapport : `Réutilisation : appelé makeFlipchart, scenario, dropFile` ou `Réutilisation : écart — <pourquoi>`.

**Lectures attendues :** S4 : `.flipchart` fabriqué (2 pages, trait, ligne, rectangle plein, texte à deux runs, PNG, TIFF, action) →
`data-page="1/2"`, `data-elements` attendu, avis `image TIFF non lue` et `action non lue`, enregistré en `.roomboard` puis rouvert
à l'identique, `stageBox(page, 640)` ≥ 640 ; S5 : bombe, taille mensongère, budget, `.fpg` imbriqué, 20 001 entrées, UTF-16
impair, flux à 40 niveaux (s'ouvre, avis `objet trop imbriqué ignoré`), `.flipchart` sans signature, `.txt` renommé → avis de
refus, aucune erreur de page, l'onglet suivant s'ouvre encore (Worker non gelé). Lignes `ok — S4 : …`, `ok — S5 : …`.

**Commande bornée :** comme T9 (`/tmp/T17-verif.out`), motif `ok — S[1-5]|C13 tableaux : OK|module formats :|verifier.sh : (e2e )?OK|FAIL|error\[` ;
attendu `code 0`, S1 à S5, formats ≤ 3 125 012 o et marge ≥ 20 Ko. Fidélité : `node scripts/essais/c13-fidelite.mjs ~/telechargements-roomboard/flipchart/*.flipchart` (cwd `<wt>`) → 5 lignes ajoutées.

**Avis de tiers :** section « ActCraft » dans `THIRD_PARTY_NOTICES.md` : lecteur `.flipchart` et écrivain de test portés
d'ActCraft (GPL-3.0-only, même auteur, titulaire des droits), fichiers concernés, avec la mention « reprise sous la licence
de RoomBoard à confirmer par l'auteur (HU1-6) » ; le rapport rappelle HU1-6 pour la clôture.

**Contraintes :** G1, G2, G3, G4, G5, G6, G7, G8, G9, G10, G11 (recopiées : test rouge d'abord pour tout correctif ;
`nice -n 10` et `export PATH=…` ; `CARGO_TARGET_DIR=<wt>/target` ; plafonds 1 572 864 o / 3 145 728 o jamais touchés,
tailles mesurées ; aucune dépendance neuve ni GPL/LGPL/AGPL ; exemples jamais commités, jamais copiés, jamais lus par un
interpréteur lancé depuis leur dossier ; `git add` fichier par fichier, ni `-A`, ni `commit -a`, ni push ; commit auteur
`jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, seule ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ;
aucun build Tauri ni Android ; aucun test désactivé ni seuil changé ; scène ≥ 640 px).

**Interdits :** changer `verifier.sh` ; brancher la fidélité dans `verifier.sh`.

**Terminé :** `verifier.sh --e2e` code 0 avec S1 à S5, fidélité et tailles commitées, avis de tiers écrit, commit
`test(e2e): drop generated flipcharts, measure flipchart fidelity, credit ActCraft`.

**Étapes :** 1. S4 ; 2. S5 ; 3. suite e2e ; 4. fidélité ; 5. tailles finales (lot 3, marge) ; 6. avis de tiers ; 7. commit.

---

## Relecture (writing-plans)

- **Couverture du cadrage :** N1 (T4, T7, T15), N2 (copie `notebook` refusée T3 ; aucune action d'export : interdits de T6, T16),
  N3 (T8), N4 (T6 dont palier bas, T16), N5 (T5, T6), N6 (T3, T5, T6 `.notebook` sans manifeste, T8), N7 (T3, T4 ; arcs avertis),
  N8-N9 (T7, Worker ZIP), N10-N11 (T13, T15, T16), N12 (T14, T15), N13 (T2, T7, T8, T13, T14, T15), N14 (T15), N15 (T2, T13),
  N16 (T2), N17 (T1, T4, T9, T11, T15, T17), N18 (T17, HU1-6), N19 (T12, T14), N20 (T10, T17), N21 (T9, T17), N22 (T6, T9).
- **Carte d'impact :** chaque entrée « oui » est dans une tâche ; hors carte, ajoutés : `main.ts` (T8, T16 : ports `readOlf`,
  options, `unbamboo`), `zip-read.ts` (T7 `createOlfReader`, T13 mode `bamboo`), `archive-path.ts` (foyer neutre de
  `safeArchivePath`), `bamboo.ts` dès le lot 2 (palier bas), `crates/roomboard-formats-wasm/src/lib.rs` dès T3 (bras `Notebook`).
- **Effets de bord :** `.notebook`/`.olf` ouverts (T6 `C13 : .olf n'est plus un fichier inconnu`), signature Bamboo (T6
  `C13 palier : …` au lot 2, T16 `C13 N4 : signature Bamboo ouvre…` au lot 3), `safeArchivePath` (T2 `C13 N16 : keepBoardPath
  refuse a/__MACOSX/x.png` + `model3d-import.test.ts`, `c15-3d-navigateur.mjs` en T9), contenu avant extension (T6
  `C13 N4 : contenu avant extension`), module `formats` (T9, T11, T17, plafonds).
- **Review Focus :** parité de la matrice `.olf` (T7, `C13 N9 : matrice lue par lignes`), sortie `.olf` par les bornes
  communes (T8, `C13 N13 : part .olf hors bornes refusée par decodeBoardList`), bornes qCompress (T13, `C13 N13 : bombe
  qCompress arrêtée`), dialecte SMART (`path` en jetons, T4), ordre du manifeste (T5, `C13 N6 : ordre du manifeste`),
  profondeur et longueurs du flux (T14), marge Wasm du lot 3 (T11).
