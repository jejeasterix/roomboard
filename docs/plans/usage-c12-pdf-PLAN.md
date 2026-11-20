# Plan d'exécution — usage-c12-pdf (C12 : import PDF, fond `pdf-page`, export PDF annoté, export vectoriel)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Cœur Rust : `backdrop.page`, `Document::from_pdf_pages`, liaison Wasm, constantes du contrat | — | `crates/roomboard-core/src/element.rs`, `crates/roomboard-core/src/document.rs`, `crates/roomboard-core/src/commands.rs`, `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/api.ts` | isolé (`~/projets/roomboard-wt/usage-c12-pdf--T1`) | implementeur-tdd | `cargo test -p roomboard-core -p roomboard-wasm 2>&1 \| grep -E "test result\|FAILED\|panicked\|error\[\|backdrop\|pdf" \| tail -40` : 0 `FAILED`, ≥ 5 tests nommés dont `from_pdf_pages_builds_one_backdrop_page_per_size`, `backdrop_page_is_a_whole_non_negative_number` ; `unreadable_backdrop_keeps_page_readable`, `insert_pages_after_page_copies_backdrop_grid_and_elements`, `set_backdrop_inner_then_clear` verts ; module principal ≤ 1 572 864 o | S1, S4 | #tache-t1 |
| T2 | Contrat TS : `BackdropView.page`, `fromPdfPages`, parité de la fausse liaison | T1 | `apps/web/src/core/api.ts`, `apps/web/src/core/fake-core.ts`, `apps/web/src/core/fake-core.test.ts`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts` | isolé (`…--T2`) | concepteur-critique | `ROOMBOARD_WASM_REQUIRED=1 vitest run src/core` : 0 `×`, « contrat C12 : fausse liaison » ≥ 5 tests, « contrat C12 : vrai module wasm » ≥ 5, « fakeCore — C12 (PDF) » ≥ 1 ; blocs C2 et C3 verts ; `tsc` vide | S1, S2, S4 | #tache-t2 |
| T3 | pdf.js dans la page : dépendances, chargeur, moteur PDF, Worker, ressources copiées, avis de tiers | — | `apps/web/package.json`, `pnpm-lock.yaml`, `apps/web/vite.config.ts`, `apps/web/src/platform/pdf-load.ts` (neuf), `apps/web/src/platform/pdf-render.ts` (neuf), `apps/web/src/platform/pdf-render.test.ts` (neuf), `apps/web/src/platform/pdf-worker.ts` (neuf), `THIRD_PARTY_NOTICES.md`, `scripts/licences-acceptees.json` | isolé (`…--T3`) | implementeur-tdd | `vitest run src/platform/pdf-render.test.ts` : 0 `×`, « moteur PDF (PF8, PF12) » ≥ 6 ; `node scripts/controle-licences.mjs` code 0 ; `vite build` : `dist/pdfjs/standard_fonts/LiberationSans-Regular.ttf` et ≥ 100 fichiers sous `dist/pdfjs/cmaps/` | S1, S2, S3 | #tache-t3 |
| T4 | Cache de tuiles par palier (`pdf-tiles.ts`) et port PDF du moteur | — | `apps/web/src/engine/render/pdf-port.ts` (neuf), `apps/web/src/engine/render/pdf-tiles.ts` (neuf), `apps/web/src/engine/render/pdf-tiles.test.ts` (neuf) | isolé (`…--T4`) | concepteur-critique | `vitest run src/engine/render/pdf-tiles.test.ts` : 0 `×`, « tuiles PDF par palier (PF13, DAPF2) » ≥ 9 tests | S3 | #tache-t4 |
| T5 | Rendu : fond dessiné dans `drawScene`, `paintContent`, `PageView.backdrop` | T2 | `apps/web/src/engine/render/renderer.ts`, `apps/web/src/engine/render/canvas2d.ts`, `apps/web/src/engine/render/canvas2d.test.ts`, `apps/web/src/engine/engine.ts`, `apps/web/src/engine/engine.test.ts` | isolé (`…--T5`) | implementeur-tdd | `vitest run src/engine/render/canvas2d.test.ts src/engine/render/webgl2.test.ts src/engine/engine.test.ts` : 0 `×`, « Canvas2DRenderer — fond de page (C12) » ≥ 6, « Canvas2DRenderer — paintContent (C12) » ≥ 3, « moteur — fond de page (C12) » ≥ 1 ; `webgl2.test.ts` vert | S1, S3, S4 | #tache-t5 |
| T6 | Surfaces : PDF reconnu à l'import, filtres, action « Exporter en PDF… », `PDF_TYPE` | — | `apps/web/src/platform/import.ts`, `apps/web/src/platform/import.test.ts`, `apps/web/src/platform/files.ts`, `apps/web/src/platform/files.test.ts`, `apps/web/src/platform/host-fsa.ts`, `apps/web/src/platform/host-fsa.test.ts`, `apps/web/src/platform/typed-files.ts`, `apps/web/src/platform/typed-files.test.ts`, `apps/web/src/toolbar.ts`, `apps/web/src/toolbar.test.ts`, `apps/web/src/toolbar-profiles.ts`, `apps/web/src/toolbar-profiles.test.ts`, `apps/web/src/profile-edit.test.ts`, `apps/web/src/app/toolbar-host.ts`, `apps/web/src/app/toolbar-host.test.ts` | isolé (`…--T6`) | implementeur-tdd | `vitest run src/platform src/toolbar.test.ts src/toolbar-profiles.test.ts src/profile-edit.test.ts src/app/toolbar-host.test.ts src/ui` : 0 `×`, « importFiles : PDF (C12, PF2, PF3) » ≥ 7, « barre : Exporter en PDF (C12, PF19) » ≥ 4 ; `host-repli.test.ts`, `host-tauri.test.ts` verts | S1, S2 | #tache-t6 |
| T7 | Assemblage de l'export PDF (`pdf-lib`) et producteur PNG | T1, T3 | `apps/web/src/app/pdf-export.ts` (neuf), `apps/web/src/app/pdf-export.test.ts` (neuf), `apps/web/src/app/pdf-overlay.ts` (neuf), `apps/web/src/app/pdf-overlay.test.ts` (neuf) | isolé (`…--T7`) | concepteur-critique | `vitest run src/app/pdf-export.test.ts src/app/pdf-overlay.test.ts` : 0 `×`, « export PDF annoté (PF20, PF21) » ≥ 8, « placement de la superposition (/Rotate, CropBox) » ≥ 2, « superposition PNG (PF21) » ≥ 3 | S1, S5 | #tache-t7 |
| T8 | Espace de travail : ouvrir un PDF en onglet, exporter en PDF | T2, T3, T4, T6, T7 | `apps/web/src/app/workspace.ts`, `apps/web/src/app/workspace.test.ts`, `apps/web/src/ui/App.test.tsx` | isolé (`…--T8`) | implementeur-tdd | `vitest run src/app/workspace.test.ts src/ui/App.test.tsx` : 0 `×`, « espace de travail : PDF (C12) » ≥ 10 ; blocs C2, C3, C10b verts ; `tsc` vide | S1, S2 | #tache-t8 |
| T9 | Branchement : tuiles dans la session, `data-fond`, amorce, bouton relié, hors ligne | T4, T5, T8 | `apps/web/src/app/board-session.ts`, `apps/web/src/app/board-session.test.ts`, `apps/web/src/main.ts`, `apps/web/src/ui/App.tsx`, `apps/web/src/ui/App.test.tsx`, `scripts/controle-hors-ligne.mjs` | isolé (`…--T9`) | implementeur-tdd | `vitest run src/app/board-session.test.ts src/ui/App.test.tsx` : 0 `×`, « session — fond PDF (C12, PF15) » ≥ 3, « App : Exporter en PDF (C12) » ≥ 1 ; `ROOMBOARD_WASM_REQUIRED=1 pnpm -r test` 0 échec ; `vite build` puis `node scripts/controle-hors-ligne.mjs apps/web/dist apps/desktop/src-tauri/tauri.conf.json` code 0 ; `bash scripts/tests/controle-hors-ligne.test.sh` OK ; `tsc` vide | S1, S3 | #tache-t9 |
| T10 | Essai navigateur C12 dans `verifier.sh --e2e`, capture d'un PDF annoté | T9 | `scripts/essais/c12-pdf-navigateur.mjs` (neuf), `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/c12-pdf-annote.png` (neuf) | isolé (`…--T10`) | implementeur-tdd | `bash scripts/verifier.sh --e2e 2>&1 \| tail -90` : « C12 PDF : OK », les 12 essais d'avant « : OK », « verifier.sh : e2e OK », « verifier.sh : OK », deux tailles de module sous leurs plafonds ; `docs/essais/c12-pdf-annote.png` présent | S1, S3, S4 | #tache-t10 |
| T11 | (lot c) Écrivain PDF vectoriel `krilla` dans le module `formats` | T3 | `crates/roomboard-formats/Cargo.toml`, `crates/roomboard-formats/src/lib.rs`, `crates/roomboard-formats/src/pdf.rs` (neuf), `crates/roomboard-formats/tests/fixtures/LiberationSans-Regular.ttf` (neuf), `crates/roomboard-formats/tests/fixtures/LICENSE_LIBERATION` (neuf), `crates/roomboard-formats-wasm/src/lib.rs`, `Cargo.lock`, `THIRD_PARTY_NOTICES.md` | isolé (`…--T11`) | concepteur-critique | `cargo test -p roomboard-formats -p roomboard-formats-wasm 2>&1 \| grep -E "test result\|FAILED\|panicked\|error\[\|pdf" \| tail -40` : 0 `FAILED`, ≥ 8 tests `pdf` dont `golden_stream_g1_parses_to_one_red_rect`, `text_and_image_write_a_pdf` ; module formats mesuré avant et après, ≤ 3 145 728 o ; module principal inchangé ; `node scripts/controle-licences.mjs` code 0 | S5 | #tache-t11 |
| T12 | (lot c) `RecordingContext2D` : le rendu enregistré en flux d'opérations | T5 | `apps/web/src/engine/render/record-ctx.ts` (neuf), `apps/web/src/engine/render/record-ctx.test.ts` (neuf) | isolé (`…--T12`) | implementeur-tdd | `vitest run src/engine/render/record-ctx.test.ts` : 0 `×`, « contexte enregistreur (C12, DAPF4) » ≥ 8 dont « flux témoin G1 » | S5 | #tache-t12 |
| T13 | (lot c) Superposition vectorielle : Worker jetable commun, producteur `krilla`, branchement | T9, T11, T12 | `apps/web/src/platform/one-shot-worker.ts` (neuf), `apps/web/src/platform/one-shot-worker.test.ts` (neuf), `apps/web/src/platform/sheet-reader.ts`, `apps/web/src/platform/pdf-vector-worker.ts` (neuf), `apps/web/src/platform/container.ts`, `apps/web/src/app/pdf-overlay-vector.ts` (neuf), `apps/web/src/app/pdf-overlay-vector.test.ts` (neuf), `apps/web/src/main.ts` | isolé (`…--T13`) | concepteur-critique | `ROOMBOARD_WASM_REQUIRED=1 vitest run src/platform/one-shot-worker.test.ts src/platform/sheet-reader.test.ts src/app/pdf-overlay-vector.test.ts` : 0 `×`, « Worker jetable (C12) » ≥ 4, « superposition vectorielle (C12, PF22) » ≥ 4 dont « vrai module formats : aucune image, texte en police » ; `sheet-reader.test.ts` inchangé et vert ; `tsc` vide | S5 | #tache-t13 |

**Vagues (par dépendances, fichiers disjoints dans chaque vague).**

| vague | tâches en parallèle | condition de lancement |
|---|---|---|
| V1 | T1, T3, T4, T6 | aucune |
| V2 | T2 (dès T1), T7 (dès T1 et T3), T11 (dès T3) | T11 est du lot (c) : lancée seulement si une place reste libre après T2 et T7 |
| V3 | T5 (dès T2), T8 (dès T2, T3, T4, T6, T7) | — |
| V4 | T9 (dès T4, T5, T8), T12 (dès T5, lot c) | — |
| V5 | T10 (dès T9), T13 (dès T9, T11, T12, lot c) | — |

L'orchestrateur lance chaque tâche dès que ses dépendances sont fusionnées. Fichiers partagés d'une vague à l'autre, donc
jamais en parallèle : `apps/web/src/core/api.ts` (T1 puis T2) ; `THIRD_PARTY_NOTICES.md` (T3 puis T11) ;
`apps/web/src/ui/App.test.tsx` (T8 puis T9) ; `apps/web/src/main.ts` (T9 puis T13).

**Chemin critique.** T3 (≈ 30 min) → T7 (≈ 40) → T8 (≈ 40) → T9 (≈ 35) → T10 (≈ 45) ≈ 3 h 10. T1 (≈ 30) → T2
(≈ 35) → T5 (≈ 35) finit vers 1 h 40, avant la fin de T8. Lot (c) : T11 (≈ 40), T12 (≈ 30), T13 (≈ 45) ; T13 tourne
pendant T10. **Coupe si le temps manque** : T11, T12, T13 se retirent sans rien défaire ; (a) et (b) sont livrables seuls.

**`tsc` entre les vagues (écarts nommés, les seuls permis).**

| fichier | erreur attendue | fermée par |
|---|---|---|
| `src/platform/pdf-render.ts`, `src/platform/pdf-render.test.ts` | `TS2307` : module `../engine/render/pdf-port` introuvable, dans le seul worktree de T3 (sans T4) | fusion de T4 |

Après T8, `tsc` est vide ; T9 et T10 le vérifient.

**Goal :** un PDF déposé ou importé ouvre un onglet dont chaque page porte un fond `pdf-page` rendu à la demande par
tuiles ; on annote par-dessus ; « Exporter en PDF… » écrit un PDF où les pages d'origine gardent texte et vecteurs sous
l'annotation (image en (b), vecteur `krilla` en (c)) ; le `.roomboard` garde l'original en un seul asset.

**Architecture :** le cœur lit `backdrop.page` et construit le document d'un PDF hors historique
(`Document::from_pdf_pages`, DAPF5). `pdf.js` vit dans la page derrière le port `PdfEngine` (DAPF1), chargé par import
dynamique avec son propre Worker ; le moteur n'en voit que `PdfFile`. Le rendu Canvas 2D peint le fond à sa place
réservée : placeholder, puis tuiles du cache par palier (`pdf-tiles.ts`, DAPF2), sans attente. L'export assemble le PDF
par `pdf-lib` (`app/pdf-export.ts`, DAPF3) ; la superposition vient d'un producteur interchangeable : PNG dessiné par
`paintContent` (b), ou page vectorielle `krilla` écrite dans un Worker jetable du module `formats` à partir du même
`paintContent` enregistré par `RecordingContext2D` (c, DAPF4).

**Tech Stack :** Rust (yrs 0.28, krilla 0.8.2 sans fonctions par défaut, `simple-text` et `raster-images`),
wasm-bindgen 0.2.130, TypeScript, SolidJS 1.9.20, Vitest 3 (happy-dom pour le DOM), Vite 6, `pdfjs-dist` 6.5.438
(build `legacy`, Apache-2.0), `pdf-lib` 1.17.1 (MIT), Playwright (essai e2e).

**Spec :** `docs/plans/usage-c12-pdf-cadrage.md` (commit `695772a`, base `origin/main` `1a756bd`).

## Choix du plan (hors cadrage, à relire)

- PC1 Les constantes `PDF_PAGE_KIND` (`"pdf-page"`), `PDF_MAX_PAGES` (500) et le type `PdfPageSize` sont posés dans
  `api.ts` par T1, en même temps que leurs pendants Rust : T7 n'attend pas T2.
- PC2 Le port PDF du moteur (`engine/render/pdf-port.ts`, T4) ne contient que des types ; `PdfEncryptedError` vit dans
  `platform/pdf-render.ts` (lancée par la plateforme, attrapée par l'espace de travail).
- PC3 `pdf-tiles.ts` lit un fond structurel `PdfBackdrop` (`asset`, `page`, `w`, `rect`) et rend `TileState` ;
  `renderer.ts` déclare `BackdropState` (`""` en plus) : un `BackdropView` du cœur et un `PdfTiles` s'y branchent tels
  quels.
- PC4 Le Worker de `pdf.js` est un module local (`platform/pdf-worker.ts`, qui importe le worker `legacy`) passé par
  `GlobalWorkerOptions.workerPort` : aucun `?url` (piège HPF2-9), Worker émis en `.js`.
- PC5 `manualChunks` nomme les morceaux `pdfjs-<hash>.js` et `pdf-lib-<hash>.js` : l'essai (PF26) les reconnaît par
  leur nom.
- PC6 `OverlayProducer.pages(requests)` est appelé en lot (le cadrage écrit `page(pageId, box)`) : (c) écrit toutes les
  pages en un seul passage dans le Worker. `ExportResult` gagne `annotated` (nom `<base> annoté.pdf`).
- PC7 Page dont `backdrop.page` dépasse le PDF d'origine : exportée comme une page sans fond PDF (page neuve de 842 pt).
  Asset absent : export refusé avant tout calcul (`UNREAD_ASSETS_MESSAGE`).
- PC8 Une page a du contenu si elle porte au moins un élément ou une grille visible ; une page d'origine sans contenu
  n'a pas de requête de superposition (recopiée telle quelle).
- PC9 `HostTargets.exportPdf` est facultatif (`t.exportPdf?.()`) : T6 n'attend pas l'espace de travail ; `App.tsx` le
  relie en T9.
- PC10 Avis : « PDF exporté (1 page) » au singulier ; « Ouverture impossible (<nom>) : PDF sans page » pour un PDF de 0
  page ; « Opération en cours » si un export tourne déjà.
- PC11 Le `PdfFile` ouvert à l'import est détruit dès les tailles lues (HPF2-10) ; l'onglet rouvre le PDF au premier
  dessin.
- PC12 (c) Liste d'affichage en `Float32Array` de codes fixés (table commune à T11 et T12, flux témoin G1 joué par les
  deux tests) et tableau de textes : aucune dépendance `serde_json` dans le module `formats`.
- PC13 (c) `runOnce` prend un sixième paramètre `failure` (message du délai et de `onerror`).
- PC14 (c) Producteur vectoriel en échec : repli sur le producteur PNG (`fallbackOverlay`), avertissement en console.
- PC15 (c) Liberation Sans (quatre faces) lue depuis `./pdfjs/standard_fonts/` (copiée par T3) au premier export
  vectoriel ; la face Regular et sa licence sont recopiées en fixture du crate pour les tests natifs.
- PC16 `PDFDocument.create({ updateMetadata: false })` : sortie sans date ni producteur, octets stables d'un export à
  l'autre.
- PC17 `files.test.ts` et `host-fsa.test.ts` changent d'attendu (valeurs littérales) ; `host-repli.test.ts` et
  `host-tauri.test.ts` lisent les constantes et restent tels quels (la carte les marquait « S »).
- PC18 Le gestionnaire `pdf` n'est enregistré que si `ImportDeps.openPdf` est donné (comme `sheet`) ; onglets pleins :
  les documents suivants, `.pdf` compris, ne sont pas tentés.

## Global Constraints

- GC1 Budget : l'exécution entière tient en environ 3 h 15 sur la VM de 8 cœurs, chargée ; une tâche vise 20 à 40 min ;
  aucune commande lourde hors celles de sa section (`scripts/verifier.sh --e2e` seulement en T10).
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`,
  `#[ignore]`), aucun seuil ni délai relevé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé (VM
  chargée). Les blocs « vrai module » se sautent d'eux-mêmes sans `.wasm` (mécanisme existant) : les tâches qui
  reconstruisent un module les jouent avec `ROOMBOARD_WASM_REQUIRED=1`.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri
  (`tauri build`), aucun build Android.
- GC4 Préparation du worktree `$WT` (`~/projets/roomboard-wt/usage-c12-pdf--T<n>`, donné par l'orchestrateur), une fois :
  `cd "$WT" && pnpm install --frozen-lockfile` (toujours : T3 change le verrou) ; tâche Rust :
  `[ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c12-pdf/target .` ; tâche TS : modules Wasm de la
  référence (ignorés par git, jamais commités) :
  `mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c12-pdf/apps/web/src/wasm/* apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c12-pdf/apps/web/src/wasm-formats/* apps/web/src/wasm-formats/`.
- GC5 Piège de C10b : le `.wasm` copié est celui de la référence. Une tâche qui a besoin d'une liaison Rust de ce
  chantier (T2, T8, T9 : `from_pdf_pages` ; T11, T13 : `write_pdf_pages`) **reconstruit** le module avant les tests du
  contrat TS : principal =
  `cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm` ;
  formats =
  `cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release && rm -rf apps/web/src/wasm-formats && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm`.
- GC6 Preuve bornée : la commande de la section, telle quelle ; le rapport cite le nombre de tests (N ≥ 1) et les noms
  attendus vus dans la sortie.
- GC7 Commits : chaque fichier ajouté par son chemin (`git add <chemin>`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Ne pas pousser.
- GC8 Interdits git : jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC9 Dépendances : seulement `pdfjs-dist` 6.5.438 et `pdf-lib` 1.17.1 (T3, versions exactes) et
  `krilla = { version = "0.8", default-features = false, features = ["simple-text", "raster-images"] }` (T11) ; aucune
  dépendance AGPL, GPL ni LGPL liée (U39) ; `node scripts/controle-licences.mjs` passe ; `THIRD_PARTY_NOTICES.md`
  complété ; une exception éventuelle va dans `scripts/licences-acceptees.json` avec sa raison.
- GC10 Plafonds : module principal 1 572 864 o (H2-13, référence 1 074 713 o), ni baissé ni relevé ; module `formats`
  3 145 728 o (R9, référence 859 580 o) ; `krilla` va dans `roomboard-formats` seulement, jamais dans le module
  principal ; taille mesurée avant et après par les tâches qui touchent un crate.
- GC11 Chargement : `pdfjs-dist` et `pdf-lib` par import dynamique seulement, jamais au démarrage ; le moteur
  (`apps/web/src/engine`) n'importe jamais `pdf.js` ni `pdf-lib` ; `scripts/controle-hors-ligne.mjs` reste vert (hôte
  ajouté = une raison écrite).
- GC12 Format : `schema` et `formatVersion` inchangés ; fond rangé en champs scalaires d'un `Y.Map` (jamais
  `Any::Map`) ; un fichier d'avant C12 s'ouvre comme avant ; `SetBackdrop` inchangé.
- GC13 Interface : dans `apps/web/src/ui/`, aucun `switch`, aucune taille en `px` dans un `.tsx`, libellés en français,
  aucune icône seule ; aucun style neuf dans `rb.css`.
- GC14 `tsc` : `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"` ne rend rien à la fin de la
  tâche, sauf l'écart nommé de la table « `tsc` entre les vagues » recopié dans la section.
- GC15 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne
  `Réutilise :` de la section, et les noms de tests vus.
- GC16 Rust : `cargo fmt --all` puis `cargo clippy -p <crate> --all-targets -- -D warnings` sans avertissement avant le
  commit.
- GC17 Aucun PDF téléchargé n'est commité (`~/telechargements-roomboard/` reste hors du dépôt) : les PDF des tests et de
  l'essai sont générés par `pdf-lib` dans le test.
- GC18 Aucun processus laissé en marche à la fin de la tâche (serveur, navigateur, `vite`).
- GC19 Périmètre : la tâche ne modifie que ses fichiers touchés. La branche `feat/usage-c6a-pot` (OD84) n'est jamais
  touchée ; règle PF29 : un seul appel `doc.page(pageId)` alimente le fond (et, après C6a, la couleur de fond).

Commande de commit type :

```bash
cd "$WT" && git add <fichier1> && git add <fichier2> && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "<message anglais>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Commande de test type (vitest, verbeuse, bornée) :

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run <fichiers> --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -80
```

## Review Focus

1. PDF tourné (`/Rotate` 90, 180, 270) ou à `CropBox` décalée : la superposition doit tomber sur la page vue, pas
   tournée ni décalée (PF20) — tests « placement : /Rotate 0, 90, 180, 270 et CropBox décalée » et « page tournée de 90° :
   superposition dans la boîte vue, texte d'origine gardé » (T7).
2. PDF chiffré par un seul mot de passe de droits (il s'ouvre sans mot de passe) : refusé comme un PDF à mot de passe
   d'ouverture (PF8, HPF2-1) — tests « EncryptFilterName dans les infos : PdfEncryptedError, document détruit » (T3) et
   « PDF chiffré : avis, aucun onglet » (T8).
3. Zoom ou défilement rapide pendant le rendu : tuiles sorties de la vue annulées, deux rendus au plus, bitmaps fermés à
   l'éviction et à `dispose` (PF13, mémoire de l'iPad HU1-10) — tests « tuile sortie de la vue : rendu annulé, bitmap
   tardif fermé », « deux rendus au plus », « LRU de 32 », « dispose » (T4).
4. Contenu dessiné sous le bas d'une page PDF (page infinie) : coupé à l'export avec un avis (PF20, HPF1-4) — tests
   « contenu sous la page PDF : cut » (T7) et « export : contenu hors page : avis » (T8).
5. `.roomboard` dont le fond PDF a un `page` illisible ou au-delà du PDF (fichier abîmé, autre version) : placeholder
   « page PDF illisible » à l'écran, page sans fond PDF à l'export, jamais d'erreur — tests
   `backdrop_page_is_a_whole_non_negative_number` (T1), « fond pdf-page en échec : libellé page PDF illisible » (T5),
   « page au-delà du PDF d'origine : page neuve » (T7).

## Carte des fichiers

| fichier | responsabilité | tâche |
|---|---|---|
| `crates/roomboard-core/src/element.rs`, `document.rs`, `commands.rs` | `page` du fond, `PDF_PAGE_KIND`, `from_pdf_pages`, `PDF_MAX_PAGES` | T1 |
| `crates/roomboard-wasm/src/lib.rs` | `Document::from_pdf_pages` exposé | T1 |
| `apps/web/src/core/api.ts` | constantes et `PdfPageSize` (T1) ; `BackdropView.page`, `CoreFactory.fromPdfPages` (T2) | T1, T2 |
| `apps/web/src/core/fake-core.ts`, `wasm-core.ts` (+ tests) | parité, contrôle de forme | T2 |
| `apps/web/package.json`, `pnpm-lock.yaml`, `apps/web/vite.config.ts` | dépendances, copie des ressources `pdfjs/`, morceaux nommés | T3 |
| `apps/web/src/platform/pdf-load.ts`, `pdf-render.ts`, `pdf-worker.ts` | chargeur, `PdfEngine`, Worker de `pdf.js` | T3 |
| `apps/web/src/engine/render/pdf-port.ts`, `pdf-tiles.ts` | port `PdfFile`, cache par palier | T4 |
| `apps/web/src/engine/render/renderer.ts`, `canvas2d.ts`, `engine/engine.ts` | fond dans `drawScene`, `paintContent`, `PageView.backdrop` | T5 |
| `apps/web/src/platform/import.ts`, `files.ts`, `host-fsa.ts`, `typed-files.ts` | gestionnaire `pdf`, filtres, `PDF_TYPE` | T6 |
| `apps/web/src/toolbar.ts`, `toolbar-profiles.ts`, `app/toolbar-host.ts` | action `export-pdf` | T6 |
| `apps/web/src/app/pdf-export.ts`, `pdf-overlay.ts` | assemblage `pdf-lib`, producteur PNG | T7 |
| `apps/web/src/app/workspace.ts` | `openPdf`, `exportPdf` | T8 |
| `apps/web/src/app/board-session.ts`, `main.ts`, `ui/App.tsx`, `scripts/controle-hors-ligne.mjs` | branchement, `data-fond`, hôtes | T9 |
| `scripts/essais/c12-pdf-navigateur.mjs`, `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/c12-pdf-annote.png` | essai e2e, capture | T10 |
| `crates/roomboard-formats/*`, `crates/roomboard-formats-wasm/src/lib.rs`, `Cargo.lock` | `pdf::write_pages`, `write_pdf_pages` | T11 |
| `apps/web/src/engine/render/record-ctx.ts` | `RecordingContext2D` | T12 |
| `apps/web/src/platform/one-shot-worker.ts`, `sheet-reader.ts`, `pdf-vector-worker.ts`, `container.ts`, `app/pdf-overlay-vector.ts`, `main.ts` | Worker jetable commun, producteur vectoriel | T13 |

## Couverture du cadrage

| entrée | tâche |
|---|---|
| PF1 (ordre, coupe de c) | table, vagues |
| PF2, PF3, PF18 (import, reconnaissance, onglets pleins) | T6, T8 |
| PF4, PF5, PF6, PF16, PF17, PF18 (cœur, format) | T1, T2 |
| PF7, PF8, PF9, PF10 | T8 (T3 pour la détection du chiffrement) |
| PF11, PF12, PF23, PF24, PF31 | T3, T9 (hôtes) |
| PF13, PF32 | T4 |
| PF14, PF15 | T5, T9 |
| PF19 | T6, T8, T9 |
| PF20, PF21 | T7, T8 |
| PF22 | T11, T12, T13 |
| PF25, PF26, PF27 | T10 |
| PF28 (constats) | T5 (`PAGE_WIDTH` d'`engine/page.ts`), T8 (`typed`), T6 (le PDF ne passe pas par `ImageTarget`) |
| PF29 (C6a) | GC19, T5 |
| PF30 (gomme) | aucune tâche : comportement gardé, hypothèse HPF1-6 |
| S1 | T1, T2, T3, T5, T6, T7, T8, T9, T10 |
| S2 | T2, T3, T6, T8 |
| S3 | T3, T4, T5, T9, T10 |
| S4 | T1, T2, T5, T10 |
| S5 | T7, T11, T12, T13 |

Effets de bord du cadrage → tests : fond `image` désormais dessiné → « fond image : bitmap étiré sur rect, sous la
grille et les éléments » (T5) ; `.pdf` plus refusé → « un .pdf reconnu par %PDF- ouvre un onglet » (T6) ; boîte
« Importer » → `files.test.ts`, `host-fsa.test.ts` (T6), `host-repli.test.ts`, `host-tauri.test.ts` gardés verts (T6) ;
bouton de plus dans la barre des pages → `toolbar-profiles.test.ts`, `profile-edit.test.ts` (T6), `stageBox(page, 640)`
(T10) ; `NON_FETCHED_HOSTS` allongé → `controle-hors-ligne.test.sh` et une raison par hôte (T9) ; `dist` plus gros sans
rien charger au démarrage → contrôle PF26 de l'essai (T10) ; bande blanche de la gomme → aucun test (HPF1-6) ;
`sheet-reader.ts` sur `one-shot-worker.ts` → `sheet-reader.test.ts` inchangé, vert (T13).

---

<a id="tache-t1"></a>

### Tâche T1 — Cœur Rust : `backdrop.page`, `Document::from_pdf_pages`, liaison Wasm, constantes du contrat

**Objectif.** Le cœur lit l'indice de page d'un fond (`page`, entier ≥ 0, PF5) et construit le document d'un PDF importé
en une transaction sans origine, avant l'historique (`Document::from_pdf_pages`, PF6, DAPF5) : une page de 1920 × 1080
par taille, fond `pdf-page` d'indice i, métadonnée d'asset écrite ; rien ne s'annule. La liaison Wasm l'expose
(`Document.from_pdf_pages`). Les constantes `PDF_PAGE_KIND`, `PDF_MAX_PAGES` et le type `PdfPageSize` sont reflétés
dans `api.ts` (PC1).

**Fichiers.**
- Modifier : `crates/roomboard-core/src/element.rs:32-56` (constante, `BackdropView`), `:302-357` (`RawBackdrop`,
  `read_backdrop`, `backdrop_view`), module `backdrop_tests` (`:361-390`)
- Modifier : `crates/roomboard-core/src/document.rs:14-22` (imports), `:120-128` (après `blank`), `:212-226`
  (`insert_asset_meta`), module `tests` (fin)
- Modifier : `crates/roomboard-core/src/commands.rs:460` (`valid_asset` devient `pub(crate)`)
- Modifier : `crates/roomboard-wasm/src/lib.rs:405-410` (après `blank`), `:1016-1029` (`from_pdf_pages_inner`), module
  `tests` (après `set_backdrop_inner_then_clear`, `:1921`)
- Modifier : `apps/web/src/core/api.ts:286-292` (constantes, après `PAGE_HEIGHT`)

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit (lu par T2, T5, T7, T8) :
  - Rust `pub const PDF_PAGE_KIND: &str = "pdf-page";` (`element.rs`) ; `BackdropView.page: Option<u32>` (sérialisé
    `page`, `undefined` côté JS pour `None`) ; `pub(crate) fn page_index(v: Option<f64>) -> Option<u32>`.
  - Rust `pub const PDF_MAX_PAGES: usize = 500;` et
    `pub fn Document::from_pdf_pages(asset: &AssetRef, sizes: &[(f64, f64)]) -> Result<Document, CommandError>`
    (`document.rs`).
  - Wasm `Document.from_pdf_pages(id: string, name: string, mime: string, size: number, sizes: Float64Array): Document`
    (couples `w, h` bout à bout ; lève le message `BadAsset` ou `BadImage` du cœur) ;
    `pub fn from_pdf_pages_inner(asset: AssetRef, sizes: &[f64]) -> Result<Document, CommandError>`.
  - TS (`api.ts`) : `export const PDF_PAGE_KIND = "pdf-page";`, `export const PDF_MAX_PAGES = 500;`,
    `export interface PdfPageSize { readonly w: number; readonly h: number }`.
- Réutilise : `crates/roomboard-core/src/document.rs:121` (`blank`), `:90` (`bare`), `:101` (`assemble`) —
  `from_pdf_pages` prend les racines de `bare()`, écrit dans une transaction sans origine, puis `assemble(...)` crée
  `History` en dernier (D37).
- Réutilise : `crates/roomboard-core/src/element.rs:312` (`read_backdrop`), `:333` (`backdrop_view`) — étendues du
  champ `page` (lecture tolérante, aucune écriture).
- Réutilise : `crates/roomboard-core/src/document.rs:75` (`insert_page`) et `:214` (`insert_asset_meta`, dont le corps
  sort en `write_asset_meta(&MapRef, &mut TransactionMut, &AssetRef)`) ; `crates/roomboard-core/src/commands.rs:460`
  (`valid_asset`) — mêmes règles que `SetBackdrop`.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
cargo test -p roomboard-core -p roomboard-wasm 2>&1 | grep -E "test result|FAILED|panicked|error\[|backdrop|pdf" | tail -40
```

Attendu : aucune ligne `FAILED` ni `error[` ; toutes les lignes `test result: ok` ; tests neufs présents et `ok` :
`backdrop_page_is_a_whole_non_negative_number` (PF5, Review Focus 5), `from_pdf_pages_builds_one_backdrop_page_per_size`
(PF4, PF6, S1), `from_pdf_pages_refuses_bad_asset_then_bad_sizes` (PF6, PF7), `pdf_backdrops_survive_encode_and_insert_pages`
(PF17, S4), `from_pdf_pages_inner_reads_pairs_and_refuses_odd_length` (liaison). Tests à garder verts (carte
d'impact) : `unreadable_backdrop_keeps_page_readable`, `backdrop_rect_follows_page_width_not_height` (`document.rs`),
`insert_pages_after_page_copies_backdrop_grid_and_elements` (`copy.rs`), `set_backdrop_inner_then_clear`
(`roomboard-wasm`), `socle_fixture_resaves_identically` (`tests/compat_socle.rs`, un fichier d'avant C12 s'ouvre).
Taille : `wc -c apps/web/src/wasm/roomboard_wasm_bg.wasm` après l'étape 7, ≤ 1 572 864 (référence 1 074 713).

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code ; aucun test sauté ni désactivé, aucun seuil relevé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c12-pdf/target .)`.
- GC5 Module principal reconstruit à l'étape 7 (commande de GC5) pour mesurer sa taille.
- GC6 Preuve bornée : la commande ci-dessus, telle quelle ; le rapport cite N et les noms vus.
- GC7 Commits : `git add <chemin>` un par un, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message
  anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; ne pas pousser.
- GC8 Jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC9 Aucune dépendance nouvelle dans cette tâche.
- GC10 Module principal ≤ 1 572 864 o (H2-13), plafond ni baissé ni relevé ; taille relevée dans le rapport.
- GC12 `schema` et `formatVersion` inchangés ; fond en champs scalaires d'un `Y.Map` ; `SetBackdrop` inchangé.
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.
- GC16 `cargo fmt --all` puis `cargo clippy -p roomboard-core -p roomboard-wasm --all-targets -- -D warnings` sans
  avertissement.
- GC18 Aucun processus laissé en marche.
- GC19 Périmètre : seuls les cinq fichiers ci-dessus.

**Interdits.** Ne pas toucher `cmd_set_backdrop` ni `BackdropInput` (`commands.rs:942-1009`) ; aucune écriture pendant
une lecture ; aucune `Any::Map` ; ne pas changer les messages `BadAsset` / `BadImage`.

**Critère « terminé ».** Commande bornée verte avec les 5 noms neufs et les 5 tests gardés, clippy sans avertissement,
taille du module principal relevée, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : test rouge de la lecture de `page`.** Dans `crates/roomboard-core/src/element.rs`, module
  `backdrop_tests` : dans `fn raw`, ajouter `page: None,` après `kind`, puis ajouter le test :

```rust
    /// C12 (PF5, Review Focus 5) : `page` lisible = entier ≥ 0 tenant en u32 ; sinon `None` (fond en « page PDF
    /// illisible »), jamais une erreur.
    #[test]
    fn backdrop_page_is_a_whole_non_negative_number() {
        let with = |p: Option<f64>| {
            let mut r = raw(612.0, 792.0);
            r.page = p;
            backdrop_view(r, 1920.0).expect("vue").page
        };
        assert_eq!(with(Some(0.0)), Some(0));
        assert_eq!(with(Some(2.0)), Some(2));
        for bad in [
            Some(1.5),
            Some(-1.0),
            Some(f64::NAN),
            Some(f64::INFINITY),
            Some(4_294_967_296.0),
            None,
        ] {
            assert_eq!(with(bad), None, "{bad:?}");
        }
    }
```

  `cargo test -p roomboard-core backdrop_page 2>&1 | tail -5` : erreur de compilation (`page` inconnu) — rouge.

- [ ] **Étape 3 : lire `page`.** Dans `element.rs` : après `pub const FIT_WIDTH` (`:33`) ajouter

```rust
/// Genre du fond d'une page venue d'un PDF (C12, PF5) : `page` y désigne la page d'origine, à partir de 0.
pub const PDF_PAGE_KIND: &str = "pdf-page";
```

  Dans `BackdropView`, après `pub kind: String,` :

```rust
    /// Indice de page à partir de 0 d'un fond `pdf-page` (C12, PF5) ; `None` absent ou illisible.
    pub page: Option<u32>,
```

  Dans `RawBackdrop`, après `pub kind: Option<String>,` : `pub page: Option<f64>,`. Dans `read_backdrop`, bras `Out::YMap(b)` :
  `page: out_f64(b.get(txn, "page")),` après `kind` ; bras `_` : `page: None,`. Avant `backdrop_view` :

```rust
/// Indice de page lisible (PF5) : entier ≥ 0 tenant en u32 ; sinon `None`. Même règle que `pageIndexOf` (fausse liaison).
pub(crate) fn page_index(v: Option<f64>) -> Option<u32> {
    let v = v?;
    (v.is_finite() && v >= 0.0 && v.fract() == 0.0 && v <= f64::from(u32::MAX)).then_some(v as u32)
}
```

  Dans `backdrop_view`, la vue rendue gagne `page: page_index(r.page),` après `kind`. Puis
  `cargo test -p roomboard-core backdrop 2>&1 | grep -E "test |result"` : les tests `backdrop_*` sont `ok`.

- [ ] **Étape 4 : tests rouges de `from_pdf_pages`.** Dans `crates/roomboard-core/src/document.rs`, module `tests`
  (après `backdrop_rect_follows_page_width_not_height`) :

```rust
    fn pdf_asset() -> AssetRef {
        AssetRef {
            id: ABC.into(),
            name: "cours.pdf".into(),
            mime: "application/pdf".into(),
            size: 1234.0,
        }
    }

    const SIZES: [(f64, f64); 3] = [(612.0, 792.0), (792.0, 612.0), (595.0, 842.0)];

    /// C12 (PF4 à PF6, S1) : une page par taille, 1920 × 1080, fond `pdf-page` d'indice i calé sur la largeur ; asset
    /// cité une fois, métadonnée écrite ; rien à annuler, version 0.
    #[test]
    fn from_pdf_pages_builds_one_backdrop_page_per_size() {
        let mut d = Document::from_pdf_pages(&pdf_asset(), &SIZES).expect("document");
        let ids = d.page_ids();
        assert_eq!(ids.len(), 3);
        for (i, (id, (w, h))) in ids.iter().zip(SIZES).enumerate() {
            let p = d.page(id).expect("page");
            assert_eq!((p.width, p.height), (1920.0, 1080.0));
            let b = p.backdrop.expect("fond");
            assert_eq!(
                (b.asset.as_str(), b.kind.as_str(), b.page, b.w, b.h, b.fit.as_str()),
                (ABC, PDF_PAGE_KIND, Some(i as u32), Some(w), Some(h), "width")
            );
            assert_eq!(
                b.rect.map(|r| (r.x0, r.y0, r.x1, r.y1)),
                Some((0.0, 0.0, 1920.0, h * 1920.0 / w))
            );
        }
        assert_eq!(d.cited_assets(), vec![pdf_asset()]);
        assert_eq!((d.version(), d.can_undo()), (0, false));
        assert!(!d.undo());
        assert_eq!(d.page_count(), 3);
    }

    /// PF6, PF7 : `BadAsset` d'abord (même règle que `SetBackdrop`), puis `BadImage` : 0 page, plus de 500, taille
    /// nulle, négative ou non finie ; 500 pages passent.
    #[test]
    fn from_pdf_pages_refuses_bad_asset_then_bad_sizes() {
        let mut bad = pdf_asset();
        bad.id = ABC.to_uppercase();
        assert_eq!(
            Document::from_pdf_pages(&bad, &[]).err(),
            Some(CommandError::BadAsset)
        );
        let a = pdf_asset();
        for sizes in [
            vec![],
            vec![(612.0, 792.0); PDF_MAX_PAGES + 1],
            vec![(612.0, 0.0)],
            vec![(-1.0, 792.0)],
            vec![(f64::NAN, 792.0)],
            vec![(612.0, f64::INFINITY)],
        ] {
            assert_eq!(
                Document::from_pdf_pages(&a, &sizes).err(),
                Some(CommandError::BadImage),
                "{} tailles",
                sizes.len()
            );
        }
        let full = Document::from_pdf_pages(&a, &vec![(612.0, 792.0); PDF_MAX_PAGES]).expect("500 pages");
        assert_eq!(full.page_count(), 500);
    }

    /// PF17, PF18, S4 : encodé puis relu, fonds et asset restent ; « Insérer des pages » recopie fonds et indices.
    #[test]
    fn pdf_backdrops_survive_encode_and_insert_pages() {
        let d = Document::from_pdf_pages(&pdf_asset(), &SIZES[..2]).expect("document");
        let backdrops = |x: &Document| {
            x.page_ids()
                .iter()
                .map(|id| x.page(id).and_then(|p| p.backdrop).map(|b| (b.kind, b.page)))
                .collect::<Vec<_>>()
        };
        let want = vec![
            Some((PDF_PAGE_KIND.to_string(), Some(0))),
            Some((PDF_PAGE_KIND.to_string(), Some(1))),
        ];
        let back = Document::from_update_v1(&d.encode_v1()).expect("relu");
        assert_eq!(backdrops(&back), want);
        assert_eq!(back.cited_assets(), vec![pdf_asset()]);
        let mut host = Document::blank();
        let first = host.page_ids()[0].clone();
        host.insert_pages(&d, &first).expect("insertion");
        assert_eq!(&backdrops(&host)[1..], &want[..]);
        assert_eq!(
            host.cited_assets().iter().map(|a| a.id.as_str()).collect::<Vec<_>>(),
            vec![ABC]
        );
    }
```

  `cargo test -p roomboard-core from_pdf 2>&1 | tail -5` : erreur de compilation (`from_pdf_pages` absente) — rouge.

- [ ] **Étape 5 : `from_pdf_pages`.** Dans `crates/roomboard-core/src/commands.rs:460`, `fn valid_asset` devient
  `pub(crate) fn valid_asset`. Dans `document.rs` : l'import `use crate::commands::{read_shape, read_text};` devient
  `use crate::commands::{read_shape, read_text, valid_asset, CommandError};` ; la liste importée de `crate::element`
  gagne `finite_positive, FIT_WIDTH, PDF_PAGE_KIND` (ordre alphabétique de `rustfmt`). Après `pub const LOCAL` :

```rust
/// Plafond des pages d'un PDF importé (U26, PF7) : l'appelant coupe au-delà et le dit.
pub const PDF_MAX_PAGES: usize = 500;
```

  Remplacer le corps de `insert_asset_meta` (`:214-226`) par un appel à une fonction libre, placée avant `impl Document` :

```rust
/// Métadonnée écrite seulement si absente (K3) : champs scalaires d'un `Y.Map`, jamais `Any::Map` (G4).
fn write_asset_meta(assets: &MapRef, txn: &mut TransactionMut, a: &AssetRef) {
    if assets.get(txn, &a.id).is_none() {
        assets.insert(
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

```rust
    pub(crate) fn insert_asset_meta(&self, txn: &mut TransactionMut, a: &AssetRef) {
        write_asset_meta(&self.assets, txn, a);
    }
```

  Après `pub fn blank()` :

```rust
    /// Document d'un PDF importé (C12, PF6, DAPF5) : une page par taille `(w, h)` en points (après /Rotate et CropBox),
    /// fond `pdf-page` d'indice i calé sur la largeur, métadonnée de l'asset ; tout est écrit sans origine avant
    /// `History` (D37) : rien ne s'annule. Refus : `BadAsset`, puis `BadImage` (0 ou plus de 500 pages, taille non
    /// finie ou ≤ 0).
    pub fn from_pdf_pages(asset: &AssetRef, sizes: &[(f64, f64)]) -> Result<Self, CommandError> {
        if !valid_asset(asset) {
            return Err(CommandError::BadAsset);
        }
        if sizes.is_empty()
            || sizes.len() > PDF_MAX_PAGES
            || sizes
                .iter()
                .any(|&(w, h)| !finite_positive(w) || !finite_positive(h))
        {
            return Err(CommandError::BadImage);
        }
        let (doc, meta, pages, assets) = Self::bare();
        {
            let mut txn = doc.transact_mut();
            for (i, &(w, h)) in sizes.iter().enumerate() {
                let index = i as u32;
                insert_page(&pages, &mut txn, index);
                if let Some(Out::YMap(page)) = pages.get(&txn, index) {
                    page.insert(
                        &mut txn,
                        "backdrop",
                        MapPrelim::from([
                            ("asset", In::from(asset.id.as_str())),
                            ("kind", In::from(PDF_PAGE_KIND)),
                            ("page", In::Any(Any::from(f64::from(index)))),
                            ("w", In::Any(Any::from(w))),
                            ("h", In::Any(Any::from(h))),
                            ("fit", In::from(FIT_WIDTH)),
                        ]),
                    );
                }
            }
            write_asset_meta(&assets, &mut txn, asset);
        }
        Ok(Self::assemble(doc, meta, pages, assets))
    }
```

  `cargo test -p roomboard-core 2>&1 | grep -E "from_pdf|pdf_backdrops|test result|FAILED"` : les trois tests `ok`.

- [ ] **Étape 6 : liaison Wasm.** Dans `crates/roomboard-wasm/src/lib.rs`, module `tests`, après
  `set_backdrop_inner_then_clear` :

```rust
    /// C12 (PF6) : couples `(w, h)` bout à bout ; longueur impaire refusée en `BadImage`.
    #[test]
    fn from_pdf_pages_inner_reads_pairs_and_refuses_odd_length() {
        let pdf = AssetRef {
            id: ABC.into(),
            name: "cours.pdf".into(),
            mime: "application/pdf".into(),
            size: 10.0,
        };
        let d = Document::from_pdf_pages_inner(pdf.clone(), &[612.0, 792.0, 792.0, 612.0])
            .expect("document");
        let ids = d.page_ids();
        let b = d.core.page(&ids[1]).and_then(|p| p.backdrop).expect("fond");
        assert_eq!((ids.len(), b.page, b.w, b.h), (2, Some(1), Some(792.0), Some(612.0)));
        assert_eq!(
            Document::from_pdf_pages_inner(pdf, &[612.0]).err(),
            Some(CommandError::BadImage)
        );
    }
```

  Rouge (`cargo test -p roomboard-wasm from_pdf 2>&1 | tail -3`). Puis, dans le `#[wasm_bindgen] impl Document`, après
  `pub fn blank()` :

```rust
    /// Document d'un PDF importé (C12, PF6) : `sizes` = largeurs et hauteurs en points bout à bout ; hors historique.
    /// Lève une Error au message du cœur (`BadAsset`, `BadImage`).
    pub fn from_pdf_pages(
        id: &str,
        name: &str,
        mime: &str,
        size: f64,
        sizes: Vec<f64>,
    ) -> Result<Document, JsError> {
        Self::from_pdf_pages_inner(asset_ref(id, name, mime, size), &sizes).map_err(cmd_err)
    }
```

  et dans le second `impl Document` (`:1016`), après `load_inner` :

```rust
    /// Couples `(w, h)` lus bout à bout ; une longueur impaire est refusée en `BadImage`.
    pub fn from_pdf_pages_inner(asset: AssetRef, sizes: &[f64]) -> Result<Document, CommandError> {
        if sizes.len() % 2 != 0 {
            return Err(CommandError::BadImage);
        }
        let pairs: Vec<(f64, f64)> = sizes.chunks_exact(2).map(|c| (c[0], c[1])).collect();
        CoreDocument::from_pdf_pages(&asset, &pairs).map(|core| Self::wrap(core, None))
    }
```

- [ ] **Étape 7 : constantes du contrat TS, taille.** Dans `apps/web/src/core/api.ts`, après
  `export const PAGE_HEIGHT = 1080;` :

```ts
/** C12 (PF5) : genre du fond d'une page venue d'un PDF (`PDF_PAGE_KIND` du cœur). */
export const PDF_PAGE_KIND = "pdf-page";
/** C12 (PF7, U26) : pages importées d'un PDF au plus (`PDF_MAX_PAGES` du cœur). */
export const PDF_MAX_PAGES = 500;
/** C12 (PF6) : taille d'une page PDF en points, après /Rotate et CropBox (viewport de pdf.js à l'échelle 1). */
export interface PdfPageSize {
  readonly w: number;
  readonly h: number;
}
```

  Puis le module principal (commande de GC5) et `wc -c apps/web/src/wasm/roomboard_wasm_bg.wasm`.

- [ ] **Étape 8 : vert, format, clippy.** La commande bornée ; `cargo fmt --all` ;
  `cargo clippy -p roomboard-core -p roomboard-wasm --all-targets -- -D warnings 2>&1 | grep -E "^(warning|error)" | head`
  (rien).

- [ ] **Étape 9 : commit.**

```bash
cd "$WT" && for f in crates/roomboard-core/src/element.rs crates/roomboard-core/src/document.rs \
  crates/roomboard-core/src/commands.rs crates/roomboard-wasm/src/lib.rs apps/web/src/core/api.ts; do git add "$f"; done && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(core): read pdf-page backdrops and build a document from PDF page sizes" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Rapport : les 5 noms neufs et les 5 tests gardés vus, N, taille du module principal, une ligne `Réutilisation :` par
  ligne `Réutilise :`.

<a id="tache-t2"></a>

### Tâche T2 — Contrat TS : `BackdropView.page`, `fromPdfPages`, parité de la fausse liaison

**Objectif.** La page lit `backdrop.page` (`number | null`, PF5) et crée le document d'un PDF par
`CoreFactory.fromPdfPages(asset, sizes)` (PF6). La fausse liaison suit le cœur à l'identique (D36) : même règle
d'indice, mêmes refus dans le même ordre (`BadAsset`, puis `BadImage`), mêmes vues, rien à annuler. Le contrôle de forme
de `wasm-core.ts` change `undefined` en `null` pour `page`. Le contrat commun est joué contre les deux fabriques.

**Fichiers.**
- Modifier : `apps/web/src/core/api.ts:192-200` (`BackdropView`), `:263-272` (`CoreFactory`)
- Modifier : `apps/web/src/core/fake-core.ts:282-297` (`backdropView`), `:1399-1411` (`fakeCore`), imports (`:30-40`)
- Modifier : `apps/web/src/core/wasm-core.ts:241-247` (`toBackdropView`), `:498-506` (`createWasmCore`)
- Modifier : `apps/web/src/core/fake-core.test.ts` (bloc neuf en fin)
- Modifier : `apps/web/src/core/wasm-core.contract.test.ts:160-166` (attendus de `toPageView`), `:734` (attendu du fond
  `image`), bloc neuf en fin

**Interfaces.**
- Consomme (T1) : `PDF_PAGE_KIND`, `PDF_MAX_PAGES`, `PdfPageSize` (`api.ts`) ; Wasm
  `Document.from_pdf_pages(id, name, mime, size, sizes: Float64Array)`.
- Produit (lu par T5, T8, T9) :
  - `BackdropView.page: number | null` (après `kind`).
  - `CoreFactory.fromPdfPages(asset: AssetRef, sizes: readonly PdfPageSize[]): CoreDocument`.
- Réutilise : `apps/web/src/core/fake-core.ts:283` (`backdropView`), `:258` (`putMeta`), `:157` (`validAsset`), `:338`
  (`positive`), `MESSAGES.badAsset` / `MESSAGES.badImage` (`:142-143`) — appelés tels quels par `fromPdfPages`.
- Réutilise : `apps/web/src/core/wasm-core.ts:234` (`numberOrNull`), `:241` (`toBackdropView`) — `page` lu par
  `numberOrNull(v["page"], PAGE)`.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web exec vitest run src/core --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | grep -E "C12|×|FAIL|Test Files|Tests " | tail -40
```

Attendu : aucun `×` ni `FAIL` ; « contrat C12 : fausse liaison » ≥ 5 tests et « contrat C12 : vrai module wasm » ≥ 5
(noms : « fromPdfPages : une page par taille… » (S1), « fromPdfPages : BadAsset d'abord, puis BadImage… » (S2, PF7),
« enregistré en deux moitiés puis relu… » (PF17), « Insérer des pages d'un document PDF… » (S4), « fond image
(SetBackdrop) : page null » (PF18)) ; « fakeCore — C12 (PDF) » ≥ 1 ; « contrôle de forme C12 (fond pdf-page) » ≥ 1.
Tests à garder verts : blocs « contrat C2 », « contrat C3 », « contrôle de forme des valeurs venues de Wasm » —
`ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web exec vitest run src/core 2>&1 | grep -E "Test Files|Tests "` :
0 échec. `tsc` vide (GC14).

**Contraintes (recopiées).**
- GC2 TDD ; aucun test sauté ; les blocs « vrai module » joués avec `ROOMBOARD_WASM_REQUIRED=1`.
- GC3 PATH ; aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && pnpm install --frozen-lockfile` et `[ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c12-pdf/target .`.
- GC5 Piège de C10b : reconstruire le module principal (commande de GC5) **avant** les tests du contrat ; le `.wasm`
  copié de la référence n'a pas `from_pdf_pages`.
- GC6 Preuve bornée : la commande ci-dessus ; N et noms dans le rapport.
- GC7, GC8 Commits fichier par fichier, auteur et message imposés ; interdits git.
- GC12 Format : aucune clé neuve exigée à la lecture ; un JSON sans `page` donne `page: null`.
- GC14 `tsc` vide.
- GC15 Une ligne `Réutilisation :` par ligne `Réutilise :`.
- GC18, GC19 Aucun processus laissé ; seuls les cinq fichiers ci-dessus.

**Patron à ne pas reprendre.** Calquer `fromPdfPages` de la fausse liaison sur `SetBackdrop` (une étape par page, puis
« vider » l'historique) : le cœur écrit hors historique (D37), la fausse liaison doit construire l'état d'emblée, comme
`fakeCore.blank()`. Chemin de référence : `apps/web/src/core/fake-core.ts:1399-1400` (`blank` : `new FakeDocument({ pages,
assets })`, aucune étape) ; à ne pas reprendre : `apps/web/src/core/fake-core.ts:690-705` (`SetBackdrop` par `this.step`).
Même règle d'indice que le cœur (`page_index`, T1) : entier ≥ 0 et ≤ 4 294 967 295, sinon `null`.

**Interdits.** Ne pas toucher `SetBackdrop` (fausse liaison ni Wasm) ; ne pas changer `MESSAGES` ; ne pas relâcher le
contrôle de forme (une chaîne en `page` reste une erreur `PAGE`).

**Critère « terminé ».** Commande bornée verte (deux fabriques), `tsc` vide, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4), puis reconstruire le module principal (GC5).

- [ ] **Étape 2 : tests rouges du contrat.** À la fin de `apps/web/src/core/wasm-core.contract.test.ts` :

```ts
// C12 (PF5, PF6, PF17, PF18) : document d'un PDF, contrat commun aux deux fabriques ; mêmes refus dans le même ordre.
const C12_PDF = { id: "cd".repeat(32), name: "cours.pdf", mime: "application/pdf", size: 1234 };
const C12_SIZES = [{ w: 612, h: 792 }, { w: 792, h: 612 }, { w: 595, h: 842 }];
const C12_BAD_ASSET = "asset invalide (empreinte SHA-256 en hexadécimal minuscule, type MIME non vide, taille entière ≥ 0 attendus)";
const C12_BAD_IMAGE = "image invalide (largeur et hauteur finies > 0 attendues, ajustement « width » seul accepté)";
describe.each(factories)("contrat C12 : $name", ({ f }) => {
  it("fromPdfPages : une page par taille, fond pdf-page d'indice i calé sur 1920, hauteur 1080, rien à annuler (S1)", () => {
    const d = f.fromPdfPages(C12_PDF, C12_SIZES);
    const ids = d.pageIds();
    expect(ids).toHaveLength(3);
    ids.forEach((id, i) => {
      const s = C12_SIZES[i]!;
      const p = d.page(id);
      expect([p?.width, p?.height]).toEqual([1920, 1080]);
      expect(p?.backdrop).toEqual({ asset: C12_PDF.id, kind: "pdf-page", page: i, w: s.w, h: s.h, fit: "width", rect: { x0: 0, y0: 0, x1: 1920, y1: (s.h * 1920) / s.w } });
    });
    expect(d.citedAssets()).toEqual([C12_PDF]);
    expect([d.version(), d.canUndo()]).toEqual([0, false]);
    d.undo();
    expect(d.pageIds()).toEqual(ids);
  });

  it("fromPdfPages : BadAsset d'abord, puis BadImage (0 page, 501, taille nulle, négative ou non finie) ; 500 passent (S2, PF7)", () => {
    expect(messageOf(() => f.fromPdfPages({ ...C12_PDF, id: C12_PDF.id.toUpperCase() }, []))).toBe(C12_BAD_ASSET);
    const many = (n: number) => Array.from({ length: n }, () => ({ w: 612, h: 792 }));
    for (const sizes of [[], many(501), [{ w: 612, h: 0 }], [{ w: -1, h: 792 }], [{ w: Number.NaN, h: 792 }], [{ w: 612, h: Number.POSITIVE_INFINITY }]]) {
      expect(messageOf(() => f.fromPdfPages(C12_PDF, sizes)), `${sizes.length} tailles`).toBe(C12_BAD_IMAGE);
    }
    expect(f.fromPdfPages(C12_PDF, many(500)).pageIds()).toHaveLength(500);
  });

  it("enregistré en deux moitiés puis relu : fonds, indices et asset gardés (PF17, PF18)", () => {
    const d = f.fromPdfPages(C12_PDF, C12_SIZES);
    const [manifest, ybin] = d.saveParts(now, "0.1.0");
    const back = f.loadParts(manifest, ybin);
    expect(back.pageIds().map((id) => back.page(id)?.backdrop?.page)).toEqual([0, 1, 2]);
    expect(back.citedAssets()).toEqual([C12_PDF]);
  });

  it("Insérer des pages d'un document PDF : fonds recopiés, un seul asset (Z5, S4)", () => {
    const src = f.fromPdfPages(C12_PDF, C12_SIZES);
    const d = f.blank();
    d.insertPages(src, first(d));
    expect(d.pageIds().slice(1).map((id) => [d.page(id)?.backdrop?.kind, d.page(id)?.backdrop?.page])).toEqual([
      ["pdf-page", 0],
      ["pdf-page", 1],
      ["pdf-page", 2],
    ]);
    expect(d.citedAssets().map((a) => a.id)).toEqual([C12_PDF.id]);
  });

  it("fond image (SetBackdrop) : page null (PF18)", () => {
    const d = f.blank();
    const p = first(d);
    d.apply({ type: "SetBackdrop", page: p, backdrop: { asset: { ...C12_PDF, mime: "image/png" }, w: 1000, h: 500, fit: "width" } });
    expect(d.page(p)?.backdrop?.page).toBeNull();
  });
});

describe("contrôle de forme C12 (fond pdf-page)", () => {
  it("toPageView : page absente → null, entier gardé, chaîne → erreur", () => {
    const page = { id: "p", width: 1920, height: 1080, background: "#ffffff", grid: undefined };
    const b = { asset: "a".repeat(64), kind: "pdf-page", w: 612, h: 792, fit: "width", rect: undefined };
    expect(toPageView({ ...page, backdrop: b })?.backdrop?.page).toBeNull();
    expect(toPageView({ ...page, backdrop: { ...b, page: 2 } })?.backdrop?.page).toBe(2);
    expect(() => toPageView({ ...page, backdrop: { ...b, page: "2" } })).toThrow();
  });
});
```

  Dans le même fichier, attendus existants : `:163-165` — l'objet attendu `{ ...b, w: null, rect: null }` devient
  `{ ...b, page: null, w: null, rect: null }` ; `:734` — le fond attendu gagne `page: null` après `kind: "image"`. Tout
  autre attendu de fond : `grep -n "kind: \"image\"\|kind: \"pdf-page\"" src/core/*.test.ts` et ajouter `page: null` aux
  objets `backdrop` attendus.

  Dans `apps/web/src/core/fake-core.test.ts`, à la fin :

```ts
describe("fakeCore — C12 (PDF)", () => {
  it("JSON : page illisible (1.5, -1, chaîne) → null, valeur gardée à l'enregistrement (K9, Review Focus 5)", () => {
    const a = "ef".repeat(32);
    for (const bad of [1.5, -1, "2"]) {
      const json = { kind: "document", pages: [{ id: "p", elements: [], backdrop: { asset: a, kind: "pdf-page", page: bad, w: 612, h: 792, fit: "width" } }], assets: {} };
      const d = fakeCore.load(new TextEncoder().encode(JSON.stringify(json)));
      expect(d.page("p")?.backdrop?.page, String(bad)).toBeNull();
      const again = JSON.parse(new TextDecoder().decode(d.save("2026-11-20T00:00:00Z", "0.1.0"))) as { pages: { backdrop: { page: unknown } }[] };
      expect(again.pages[0]?.backdrop.page).toEqual(bad);
    }
  });
});
```

  (Forme lue par `loadFake`, `fake-core.ts:1372-1395` : un objet `{ pages }`, `kind` facultatif ; `save` réécrit
  `backdrop` tel quel, `fake-core.ts:1076`.)

  Commande bornée : rouge (`fromPdfPages is not a function`, `page` absent).

- [ ] **Étape 3 : contrat.** Dans `apps/web/src/core/api.ts`, `BackdropView`, après `readonly kind: string;` :

```ts
  /** C12 (PF5) : indice de page à partir de 0 d'un fond `pdf-page` ; null absent ou illisible (entier ≥ 0 attendu). */
  readonly page: number | null;
```

  Dans `CoreFactory`, après `blank(): CoreDocument;` :

```ts
  /** C12 (PF6) : une page par taille, fond `pdf-page` d'indice i, asset cité ; aucune étape (D37). Lève le message
   *  BadAsset, puis BadImage (0 ou plus de PDF_MAX_PAGES pages, taille non finie ou ≤ 0). */
  fromPdfPages(asset: AssetRef, sizes: readonly PdfPageSize[]): CoreDocument;
```

- [ ] **Étape 4 : fausse liaison.** Dans `apps/web/src/core/fake-core.ts` : importer `PDF_MAX_PAGES`, `PDF_PAGE_KIND` et
  le type `PdfPageSize` depuis `./api`. Avant `backdropView` :

```ts
/** Indice de page lisible (PF5), même règle que `page_index` du cœur : entier ≥ 0 tenant en u32. */
const pageIndexOf = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 0xffffffff ? v : null);
```

  Dans `backdropView`, la destructuration lit aussi `page` et l'objet rendu gagne `page: pageIndexOf(page),` après
  `kind`. Dans `fakeCore`, après `blank` :

```ts
  fromPdfPages: (asset: AssetRef, sizes: readonly PdfPageSize[]) => {
    if (!validAsset(asset)) throw new Error(MESSAGES.badAsset);
    if (sizes.length === 0 || sizes.length > PDF_MAX_PAGES || sizes.some((s) => !positive(s.w) || !positive(s.h))) {
      throw new Error(MESSAGES.badImage);
    }
    const assets = new Map<string, unknown>();
    putMeta(assets, asset);
    const pages = sizes.map((s, i) => ({
      id: newId(),
      elements: [],
      backdrop: { asset: asset.id, kind: PDF_PAGE_KIND, page: i, w: s.w, h: s.h, fit: "width" },
      grid: null,
    }));
    return new FakeDocument({ pages, assets });
  },
```

- [ ] **Étape 5 : liaison Wasm.** Dans `apps/web/src/core/wasm-core.ts`, `toBackdropView` rend
  `{ asset, kind, page: numberOrNull(v["page"], PAGE), w: …, h: …, fit, rect: … }` ; `createWasmCore` gagne, après
  `blank` :

```ts
    fromPdfPages: (asset: AssetRef, sizes: readonly PdfPageSize[]) =>
      new WasmCoreDocument(mod.Document.from_pdf_pages(asset.id, asset.name, asset.mime, asset.size, new Float64Array(sizes.flatMap((s) => [s.w, s.h]))), mod),
```

  (importer `AssetRef` et `PdfPageSize` en type depuis `./api` s'ils manquent.)

- [ ] **Étape 6 : vert.** La commande bornée, puis la suite `src/core` entière et `tsc` (GC14). Un écart de message entre
  les deux fabriques se corrige dans la fausse liaison, jamais dans l'attendu.

- [ ] **Étape 7 : commit.**

```bash
cd "$WT" && for f in apps/web/src/core/api.ts apps/web/src/core/fake-core.ts apps/web/src/core/fake-core.test.ts \
  apps/web/src/core/wasm-core.ts apps/web/src/core/wasm-core.contract.test.ts; do git add "$f"; done && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(core): fromPdfPages and backdrop page index in the page contract" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Rapport : N par bloc (deux fabriques), noms vus, `tsc` vide, une ligne `Réutilisation :` par ligne `Réutilise :`.

<a id="tache-t3"></a>

### Tâche T3 — pdf.js dans la page : dépendances, chargeur, moteur PDF, Worker, ressources copiées, avis de tiers

**Objectif.** Installer `pdfjs-dist` 6.5.438 et `pdf-lib` 1.17.1 (versions exactes), écrire le chargeur paresseux
(`loadPdfjs`, `loadPdfLib`, import dynamique, PF11), le moteur PDF derrière le port `PdfEngine` (`createPdfEngine`,
PF12) avec la détection du chiffrement (PF8), le Worker de `pdf.js` (module local, PC4), la copie des ressources
(`cmaps`, `standard_fonts`, `wasm`) vers `dist/pdfjs/` et les morceaux nommés (PC5) ; compléter les avis de tiers.

**Fichiers.**
- Modifier : `apps/web/package.json` (`dependencies`), `pnpm-lock.yaml` (par `pnpm`), `apps/web/vite.config.ts`
- Créer : `apps/web/src/platform/pdf-load.ts`, `apps/web/src/platform/pdf-render.ts`,
  `apps/web/src/platform/pdf-render.test.ts`, `apps/web/src/platform/pdf-worker.ts`
- Modifier : `THIRD_PARTY_NOTICES.md` (section neuve en fin) ; `scripts/licences-acceptees.json` seulement si
  `controle-licences.mjs` refuse un paquet (avec sa raison)

**Interfaces.**
- Consomme (T4, par type seulement) : `PdfEngine`, `PdfFile`, `TileRect`, `TileBitmap` de
  `apps/web/src/engine/render/pdf-port.ts` (écart `tsc` nommé ci-dessous tant que T4 n'est pas fusionnée).
- Produit (lu par T8, T9, T13) :
  - `export const PDF_ENCRYPTED_MESSAGE = "PDF chiffré, non pris en charge";`
  - `export class PdfEncryptedError extends Error` (message `PDF_ENCRYPTED_MESSAGE`, `name = "PdfEncryptedError"`).
  - `export interface PdfjsBinding { open(data: Uint8Array): Promise<PdfjsDocument>; isPasswordError(e: unknown): boolean }`
    et les sous-types `PdfjsDocument`, `PdfjsPage`, `PdfjsViewport`, `PdfjsRenderTask`.
  - `export interface PdfDom { tile(w: number, h: number): TileCanvas }`, `export const browserPdfDom: PdfDom`.
  - `export function createPdfEngine(load: () => Promise<PdfjsBinding>, dom?: PdfDom): PdfEngine`.
  - `export async function loadPdfjs(): Promise<PdfjsBinding>` et
    `export async function loadPdfLib(): Promise<typeof import("pdf-lib")>` (`pdf-load.ts`, importé par l'amorce seule).
  - Ressources servies en `./pdfjs/cmaps/`, `./pdfjs/standard_fonts/`, `./pdfjs/wasm/` ; morceaux `assets/pdfjs-*.js`,
    `assets/pdf-lib-*.js`, Worker `assets/pdf-worker-*.js`.
- Réutilise : `apps/web/src/platform/container-load.ts:7` (`loadFormatsModule`) — même forme : `import()` au premier
  besoin, fichier importé par l'amorce seule, aucun test ne le résout.
- Réutilise : aucun module existant pour le rendu `pdf.js` d'une tuile (cadrage § 3, ligne « Rendu pdf.js d'une
  tuile ») — nouveau module `platform/pdf-render.ts`, interface DAPF1.
- Réutilise : `scripts/controle-licences.mjs`, `scripts/licences-acceptees.json` — appelés tels quels ; exception
  écrite seulement si besoin.

**`tsc` (écart nommé).** `src/platform/pdf-render.ts` et `src/platform/pdf-render.test.ts` : `TS2307` (module
`../engine/render/pdf-port` introuvable) tant que T4 n'est pas dans le worktree ; aucune autre erreur permise. Les
imports de `pdf-port` sont des `import type` : Vitest les efface, les tests tournent.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/platform/pdf-render.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -30 && \
node scripts/controle-licences.mjs; echo "licences: $?" && \
pnpm --filter @roomboard/web exec vite build 2>&1 | tail -3 && \
ls apps/web/dist/pdfjs/standard_fonts/LiberationSans-Regular.ttf && ls apps/web/dist/pdfjs/cmaps | wc -l
```

Attendu : « moteur PDF (PF8, PF12) » ≥ 6 tests, 0 `×` : « open : document lu… » (PF12), « mot de passe d'ouverture :
PdfEncryptedError… » (PF8, S2), « EncryptFilterName dans les infos… » (PF8, Review Focus 2), « renderTile : viewport à
l'échelle… » (PF13), « renderTile annulé en cours… » (PF13), « chargeur appelé une fois… » ; `licences: 0` ; le
`.ttf` listé ; ≥ 100 fichiers de `cmaps`. Le build demande les modules Wasm de la référence (GC4).

**Contraintes (recopiées).**
- GC2 TDD ; aucun test sauté.
- GC3 PATH ; aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && pnpm install --frozen-lockfile` puis copie des modules Wasm de la référence (commande de
  GC4) pour `vite build`.
- GC6 Preuve bornée : la commande ci-dessus ; N et noms dans le rapport.
- GC7, GC8 Commits fichier par fichier, auteur et message imposés ; interdits git.
- GC9 Seulement `pdfjs-dist` 6.5.438 et `pdf-lib` 1.17.1, versions exactes ; aucune AGPL, GPL, LGPL ;
  `controle-licences.mjs` passe ; `THIRD_PARTY_NOTICES.md` complété (OFL-1.1 de Liberation, licence Foxit, licences des
  modules `wasm/` de pdf.js).
- GC11 `pdfjs-dist` et `pdf-lib` par `import()` seulement ; le moteur ne les importe jamais ; `pdf-load.ts` n'est
  importé par aucun test.
- GC14 `tsc` : seul l'écart nommé ci-dessus.
- GC15 Une ligne `Réutilisation :` par ligne `Réutilise :`.
- GC17 Aucun PDF téléchargé commité ; les tests n'ouvrent aucun vrai PDF (faux `pdf.js`).
- GC18, GC19 Aucun processus laissé ; seuls les fichiers ci-dessus.

**Interdits.** Aucun `?url` vers `pdf.worker…` (piège HPF2-9) ; aucune URL distante (CDN) ; ne pas toucher
`main.ts` (T9) ni la CSP de la coque.

**Critère « terminé ».** Commande bornée verte, verrou à jour, avis de tiers complétés, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4), puis installer :
  `pnpm --filter @roomboard/web add --save-exact pdfjs-dist@6.5.438 pdf-lib@1.17.1 2>&1 | tail -5`. Vérifier
  `grep -n "pdfjs-dist\|pdf-lib" apps/web/package.json` (deux lignes, sans `^`).

- [ ] **Étape 2 : test rouge.** Créer `apps/web/src/platform/pdf-render.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import { createPdfEngine, PDF_ENCRYPTED_MESSAGE, PdfEncryptedError, type PdfDom, type PdfjsBinding, type PdfjsDocument, type PdfjsPage } from "./pdf-render";

class PasswordError extends Error {}

function fakePage(w: number, h: number, log: string[], delay = 0): PdfjsPage {
  return {
    getViewport: ({ scale, offsetX = 0, offsetY = 0 }) => {
      log.push(`viewport ${scale} ${offsetX} ${offsetY}`);
      return { width: w * scale, height: h * scale };
    },
    render: (p) => {
      log.push(`render ${p.canvas.width}x${p.canvas.height}`);
      let fail: (e: Error) => void = () => undefined;
      const promise = new Promise<void>((ok, ko) => {
        fail = ko;
        setTimeout(ok, delay);
      });
      return { promise, cancel: () => (log.push("cancel"), fail(new Error("annulé"))) };
    },
  };
}
function fakeDoc(log: string[], o: { pages?: number; info?: unknown; delay?: number } = {}): PdfjsDocument {
  return {
    numPages: o.pages ?? 2,
    getPage: async (n) => (log.push(`getPage ${n}`), fakePage(792, 612, log, o.delay)),
    getMetadata: async () => ({ info: o.info ?? { PDFFormatVersion: "1.7" } }),
    destroy: async () => void log.push("destroy"),
  };
}
const binding = (open: (d: Uint8Array) => Promise<PdfjsDocument>): PdfjsBinding => ({ open, isPasswordError: (e) => e instanceof PasswordError });
const dom = (log: string[]): PdfDom => ({
  tile: (w, h) => ({
    canvas: { width: w, height: h } as HTMLCanvasElement,
    bitmap: async () => ({ w, h }) as unknown as CanvasImageSource,
    release: () => void log.push(`release ${w}x${h}`),
  }),
});
const PDF = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])]);
const live = (): AbortSignal => new AbortController().signal;

describe("moteur PDF (PF8, PF12)", () => {
  it("open : document lu, pageCount, pageSize = viewport à l'échelle 1 (après /Rotate), pages demandées à partir de 1", async () => {
    const log: string[] = [];
    const seen: number[][] = [];
    const engine = createPdfEngine(async () => binding(async (d) => (seen.push([...d]), fakeDoc(log, { pages: 3 }))), dom(log));
    const f = await engine.open(PDF);
    expect([f.pageCount, seen]).toEqual([3, [[0x25, 0x50, 0x44, 0x46, 0x2d]]]);
    expect(await f.pageSize(2)).toEqual({ w: 792, h: 612 });
    expect(log).toEqual(["getPage 3", "viewport 1 0 0"]);
  });

  it("mot de passe d'ouverture : PdfEncryptedError, message « PDF chiffré, non pris en charge » (S2)", async () => {
    const engine = createPdfEngine(async () => binding(async () => Promise.reject(new PasswordError("No password given"))));
    const e = await engine.open(PDF).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(PdfEncryptedError);
    expect((e as Error).message).toBe(PDF_ENCRYPTED_MESSAGE);
    expect(PDF_ENCRYPTED_MESSAGE).toBe("PDF chiffré, non pris en charge");
  });

  it("EncryptFilterName dans les infos (mot de passe de droits seul) : PdfEncryptedError, document détruit (Review Focus 2)", async () => {
    const log: string[] = [];
    const engine = createPdfEngine(async () => binding(async () => fakeDoc(log, { info: { EncryptFilterName: "Standard" } })));
    await expect(engine.open(PDF)).rejects.toBeInstanceOf(PdfEncryptedError);
    expect(log).toContain("destroy");
  });

  it("autre erreur d'ouverture : relancée telle quelle", async () => {
    const engine = createPdfEngine(async () => binding(async () => Promise.reject(new Error("Invalid PDF structure."))));
    await expect(engine.open(PDF)).rejects.toThrow("Invalid PDF structure.");
  });

  it("renderTile : viewport à l'échelle, décalé de -x, -y ; toile de la taille de la tuile, bitmap rendu, toile libérée", async () => {
    const log: string[] = [];
    const f = await createPdfEngine(async () => binding(async () => fakeDoc(log)), dom(log)).open(PDF);
    const bmp = await f.renderTile(1, 2.5, { x: 1024, y: 2048, w: 1024, h: 500 }, live());
    expect(bmp).toEqual({ w: 1024, h: 500 });
    expect(log).toEqual(["getPage 2", "viewport 2.5 -1024 -2048", "render 1024x500", "release 1024x500"]);
  });

  it("renderTile annulé en cours : task.cancel, rejet, toile libérée ; signal déjà annulé : aucun rendu", async () => {
    const log: string[] = [];
    const f = await createPdfEngine(async () => binding(async () => fakeDoc(log, { delay: 50 })), dom(log)).open(PDF);
    const ctrl = new AbortController();
    const p = f.renderTile(0, 1, { x: 0, y: 0, w: 10, h: 10 }, ctrl.signal);
    await vi.waitFor(() => expect(log).toContain("render 10x10"));
    ctrl.abort();
    await expect(p).rejects.toBeTruthy();
    expect(log.slice(-2)).toEqual(["cancel", "release 10x10"]);
    const gone = new AbortController();
    gone.abort();
    const before = log.length;
    await expect(f.renderTile(0, 1, { x: 0, y: 0, w: 10, h: 10 }, gone.signal)).rejects.toBeTruthy();
    expect(log.slice(before).filter((l) => l.startsWith("render"))).toEqual([]);
  });

  it("chargeur appelé une fois pour deux ouvertures ; chargeur en échec : réessayé à l'ouverture suivante", async () => {
    const log: string[] = [];
    let calls = 0;
    const engine = createPdfEngine(async () => {
      calls += 1;
      if (calls === 1) throw new Error("morceau absent");
      return binding(async () => fakeDoc(log));
    });
    await expect(engine.open(PDF)).rejects.toThrow("morceau absent");
    await engine.open(PDF);
    await engine.open(PDF);
    expect(calls).toBe(2);
  });

  it("destroy : document détruit ; renderTile ensuite rejeté", async () => {
    const log: string[] = [];
    const f = await createPdfEngine(async () => binding(async () => fakeDoc(log)), dom(log)).open(PDF);
    f.destroy();
    await expect(f.renderTile(0, 1, { x: 0, y: 0, w: 1, h: 1 }, live())).rejects.toThrow("PDF fermé");
    expect(log.filter((l) => l === "destroy")).toHaveLength(1);
  });
});
```

  Commande bornée (partie vitest) : rouge (module absent).

- [ ] **Étape 3 : moteur PDF.** Créer `apps/web/src/platform/pdf-render.ts` :

```ts
/**
 * Moteur PDF de la page (C12, PF12, DAPF1) : `pdf.js` derrière le port `PdfEngine` du moteur (le moteur ne porte jamais
 * un PDF, DAU5). Chargé au premier besoin par `load` (`loadPdfjs` dans l'amorce, un faux dans les tests). Chiffré (PF8) :
 * mot de passe d'ouverture (`isPasswordError`) ou dictionnaire d'infos portant `EncryptFilterName` → `PdfEncryptedError`.
 * Une tuile est rendue dans une toile de sa taille, viewport décalé de (-x, -y), puis rendue en bitmap.
 */
import type { PdfEngine, PdfFile, TileBitmap, TileRect } from "../engine/render/pdf-port";

export const PDF_ENCRYPTED_MESSAGE = "PDF chiffré, non pris en charge";
export const PDF_CLOSED_MESSAGE = "PDF fermé";

export class PdfEncryptedError extends Error {
  constructor() {
    super(PDF_ENCRYPTED_MESSAGE);
    this.name = "PdfEncryptedError";
  }
}

/** Sous-ensemble de `pdf.js` utilisé ici (typé localement : aucun test ne charge `pdfjs-dist`). */
export interface PdfjsViewport {
  readonly width: number;
  readonly height: number;
}
export interface PdfjsRenderTask {
  readonly promise: Promise<void>;
  cancel(): void;
}
export interface PdfjsPage {
  getViewport(p: { scale: number; offsetX?: number; offsetY?: number }): PdfjsViewport;
  render(p: { canvas: HTMLCanvasElement; viewport: PdfjsViewport }): PdfjsRenderTask;
}
export interface PdfjsDocument {
  readonly numPages: number;
  getPage(pageNumber: number): Promise<PdfjsPage>;
  getMetadata(): Promise<{ readonly info: unknown }>;
  destroy(): Promise<void>;
}
export interface PdfjsBinding {
  open(data: Uint8Array): Promise<PdfjsDocument>;
  isPasswordError(e: unknown): boolean;
}

/** Toile d'une tuile : rendue en bitmap puis libérée (mémoire de l'iPad, HU1-10). */
export interface TileCanvas {
  readonly canvas: HTMLCanvasElement;
  bitmap(): Promise<TileBitmap>;
  release(): void;
}
export interface PdfDom {
  tile(w: number, h: number): TileCanvas;
}

export const browserPdfDom: PdfDom = {
  tile(w, h) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    return {
      canvas,
      bitmap: () => createImageBitmap(canvas),
      release() {
        canvas.width = 0;
        canvas.height = 0;
      },
    };
  },
};

const encrypted = (info: unknown): boolean =>
  typeof info === "object" && info !== null && typeof (info as Record<string, unknown>)["EncryptFilterName"] === "string";

function fileOf(doc: PdfjsDocument, dom: PdfDom): PdfFile {
  const pages = new Map<number, Promise<PdfjsPage>>();
  let destroyed = false;
  const page = (i: number): Promise<PdfjsPage> => {
    let p = pages.get(i);
    if (p === undefined) {
      p = doc.getPage(i + 1);
      pages.set(i, p);
    }
    return p;
  };
  return {
    pageCount: doc.numPages,
    async pageSize(i) {
      const v = (await page(i)).getViewport({ scale: 1 });
      return { w: v.width, h: v.height };
    },
    async renderTile(i, scale, tile: TileRect, signal) {
      if (destroyed) throw new Error(PDF_CLOSED_MESSAGE);
      signal.throwIfAborted();
      const p = await page(i);
      signal.throwIfAborted();
      const viewport = p.getViewport({ scale, offsetX: -tile.x, offsetY: -tile.y });
      const c = dom.tile(tile.w, tile.h);
      try {
        const task = p.render({ canvas: c.canvas, viewport });
        const abort = (): void => task.cancel();
        signal.addEventListener("abort", abort, { once: true });
        try {
          await task.promise;
        } finally {
          signal.removeEventListener("abort", abort);
        }
        signal.throwIfAborted();
        return await c.bitmap();
      } finally {
        c.release();
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      pages.clear();
      void doc.destroy();
    },
  };
}

export function createPdfEngine(load: () => Promise<PdfjsBinding>, dom: PdfDom = browserPdfDom): PdfEngine {
  let binding: Promise<PdfjsBinding> | null = null;
  return {
    async open(blob) {
      binding ??= load();
      let pdfjs: PdfjsBinding;
      try {
        pdfjs = await binding;
      } catch (e) {
        binding = null; // morceau absent ou réseau local coupé : réessayé au prochain PDF
        throw e;
      }
      let doc: PdfjsDocument;
      try {
        doc = await pdfjs.open(new Uint8Array(await blob.arrayBuffer()));
      } catch (e) {
        if (pdfjs.isPasswordError(e)) throw new PdfEncryptedError();
        throw e;
      }
      const meta = await doc.getMetadata().catch(() => ({ info: null }));
      if (encrypted(meta.info)) {
        await doc.destroy();
        throw new PdfEncryptedError();
      }
      return fileOf(doc, dom);
    },
  };
}
```

  (Le test « destroy : … rejeté » attend `PDF fermé` : c'est `PDF_CLOSED_MESSAGE`.) Commande bornée (partie vitest) :
  verte.

- [ ] **Étape 4 : chargeur et Worker.** Créer `apps/web/src/platform/pdf-worker.ts` :

```ts
/**
 * Worker de `pdf.js` (C12, PF11, PC4) : module local qui charge le worker `legacy` ; celui-ci s'amorce seul sur `self`
 * (`WorkerMessageHandler.initializeFromPort`). Créé par `loadPdfjs` (`pdf-load.ts`), jamais par un test.
 */
import "pdfjs-dist/legacy/build/pdf.worker.mjs";
```

  Créer `apps/web/src/platform/pdf-load.ts` :

```ts
/**
 * Chargement réel de `pdf.js` et de `pdf-lib` (C12, PF11, PF21) : `import()` au premier besoin, comme
 * `container-load.ts`. Importé par l'amorce seule : aucun test ne résout `pdfjs-dist` ni `pdf-lib` par ce fichier.
 * Ressources locales (`./pdfjs/…`, copiées par `vite.config.ts`), `isEvalSupported: false` (CSP sans `unsafe-eval`),
 * Worker propre (`pdf-worker.ts`) passé par `GlobalWorkerOptions.workerPort` : aucune URL distante, aucun `?url`.
 */
import type { PdfjsBinding, PdfjsDocument } from "./pdf-render";

export const PDFJS_BASE = "./pdfjs/";

export async function loadPdfjs(): Promise<PdfjsBinding> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (pdfjs.GlobalWorkerOptions.workerPort === null) {
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(new URL("./pdf-worker.ts", import.meta.url), { type: "module" });
  }
  const dir = (name: string): string => new URL(`${PDFJS_BASE}${name}/`, document.baseURI).href;
  const options = {
    isEvalSupported: false,
    cMapUrl: dir("cmaps"),
    cMapPacked: true,
    standardFontDataUrl: dir("standard_fonts"),
    wasmUrl: dir("wasm"),
  };
  return {
    open: async (data) => (await pdfjs.getDocument({ data, ...options }).promise) as unknown as PdfjsDocument,
    isPasswordError: (e) => e instanceof pdfjs.PasswordException || (e as { name?: unknown } | null)?.name === "PasswordException",
  };
}

export async function loadPdfLib(): Promise<typeof import("pdf-lib")> {
  return import("pdf-lib");
}
```

- [ ] **Étape 5 : ressources et morceaux.** Remplacer `apps/web/vite.config.ts` par :

```ts
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { defineConfig, type Plugin } from "vite";
import solid from "vite-plugin-solid";

// D27 : chemins relatifs, l'application se sert de n'importe quel dossier (coque, file://, serveur local).
// vite-plugin-solid impose jsdom aux essais : on garde « node » par défaut, les essais de composants
// demandent happy-dom par leur première ligne `// @vitest-environment happy-dom`.
// C10b (DAB4) : le Worker des classeurs importe le module Wasm `formats` ; format ES exigé (même fichier `.wasm` émis).
// C12 (PF11) : ressources de pdf.js servies en local sous `./pdfjs/` (copiées au build, lues dans node_modules en
// développement) ; morceaux nommés `pdfjs-*.js` et `pdf-lib-*.js` (PC5), chargés seulement par import dynamique.
const PDFJS_DIR = dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json"));
const PDFJS_ASSETS: readonly string[] = ["cmaps", "standard_fonts", "wasm"];

function pdfjsAssets(): Plugin {
  return {
    name: "roomboard-pdfjs-assets",
    configureServer(server) {
      server.middlewares.use("/pdfjs", (req, res, next) => {
        const rel = decodeURIComponent((req.url ?? "").split("?")[0] ?? "").replace(/^\/+/, "");
        const [dir, file, ...rest] = rel.split("/");
        if (dir === undefined || file === undefined || rest.length > 0 || !PDFJS_ASSETS.includes(dir) || file.includes("..")) {
          next();
          return;
        }
        try {
          res.end(readFileSync(join(PDFJS_DIR, dir, file)));
        } catch {
          next();
        }
      });
    },
    generateBundle() {
      for (const dir of PDFJS_ASSETS) {
        for (const file of readdirSync(join(PDFJS_DIR, dir))) {
          this.emitFile({ type: "asset", fileName: `pdfjs/${dir}/${file}`, source: readFileSync(join(PDFJS_DIR, dir, file)) });
        }
      }
    },
  };
}

const chunkOf = (id: string): string | undefined =>
  id.includes("/node_modules/pdfjs-dist/") ? "pdfjs" : /\/node_modules\/(?:pdf-lib|@pdf-lib\/[^/]+|pako)\//.test(id) ? "pdf-lib" : undefined;

export default defineConfig({
  base: "./",
  plugins: [solid(), pdfjsAssets()],
  worker: { format: "es" },
  build: { rollupOptions: { output: { manualChunks: chunkOf } } },
  test: { environment: "node" },
});
```

  Puis la commande bornée entière (build compris). Contrôles en plus :
  `ls apps/web/dist/assets | grep -E "^(pdfjs|pdf-lib|pdf-worker)-" ` ne rend rien (rien n'importe encore `pdf-load.ts`,
  T9 le branche) et `grep -c "pdfjs" apps/web/dist/assets/index-*.js` rend `0`.

- [ ] **Étape 6 : licences et avis.** `node scripts/controle-licences.mjs` (code 0 attendu ; un refus : entrée dans
  `scripts/licences-acceptees.json`, même forme que `caniuse-lite`, avec sa raison). Versions installées :
  `pnpm --filter @roomboard/web list --depth 1 2>&1 | grep -E "pdfjs-dist|pdf-lib|@pdf-lib|pako|tslib|@napi-rs"`.
  Ajouter en fin de `THIRD_PARTY_NOTICES.md` la section suivante, versions relevées par cette commande :

```markdown
## Paquets npm de l'application (C12, PDF)

Chargés par import dynamique au premier PDF (`apps/web/src/platform/pdf-load.ts`), jamais au démarrage.

| paquet | version | licence | dépôt |
|---|---|---|---|
| pdfjs-dist | 6.5.438 | Apache-2.0 | https://github.com/mozilla/pdf.js |
| pdf-lib | 1.17.1 | MIT | https://github.com/Hopding/pdf-lib |
| @pdf-lib/standard-fonts | <version relevée> | MIT | https://github.com/Hopding/standard-fonts |
| @pdf-lib/upng | <version relevée> | MIT | https://github.com/Hopding/upng |
| pako | <version relevée> | MIT AND Zlib | https://github.com/nodeca/pako |
| tslib | <version relevée> | 0BSD | https://github.com/microsoft/tslib |

`@napi-rs/canvas` (dépendance facultative de `pdfjs-dist`, MIT) peut être installé par `pnpm` ; il ne sert qu'à Node
et n'entre pas dans `dist` (champ `browser` de `pdfjs-dist`).

Ressources de `pdfjs-dist` copiées dans `dist/pdfjs/` avec leurs textes de licence : polices Liberation Sans
(`standard_fonts/LICENSE_LIBERATION`, SIL Open Font License 1.1), polices Foxit (`standard_fonts/LICENSE_FOXIT`,
licence de type BSD), modules `wasm/` : OpenJPEG (`LICENSE_OPENJPEG`, BSD-2-Clause), JBIG2 de PDFium
(`LICENSE_JBIG2`, BSD-3-Clause), qcms (`LICENSE_QCMS`, MIT), QuickJS (`LICENSE_QUICKJS`, MIT), et leurs enveloppes
Mozilla (`LICENSE_PDFJS_*`, Apache-2.0 ou MIT). Textes : MIT (https://opensource.org/licenses/MIT), Apache-2.0
(https://www.apache.org/licenses/LICENSE-2.0), OFL-1.1 (https://openfontlicense.org).
```

  (Remplacer chaque `<version relevée>` par la version lue, aucune autre ligne à inventer.)

- [ ] **Étape 7 : `tsc`.** `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"` : seules les
  lignes `TS2307` de `pdf-render.ts` / `pdf-render.test.ts` vers `pdf-port` (écart nommé) si T4 n'est pas fusionnée ;
  aucune autre.

- [ ] **Étape 8 : commit.**

```bash
cd "$WT" && for f in apps/web/package.json pnpm-lock.yaml apps/web/vite.config.ts apps/web/src/platform/pdf-load.ts \
  apps/web/src/platform/pdf-render.ts apps/web/src/platform/pdf-render.test.ts apps/web/src/platform/pdf-worker.ts \
  THIRD_PARTY_NOTICES.md; do git add "$f"; done && \
( git diff --quiet -- scripts/licences-acceptees.json || git add scripts/licences-acceptees.json ) && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): lazy pdf.js engine with its own worker and local resources" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Rapport : N, noms vus, sortie de `controle-licences.mjs`, taille de `dist/pdfjs/` (`du -sh apps/web/dist/pdfjs`),
  écart `tsc` vu ou non, une ligne `Réutilisation :` par ligne `Réutilise :`.

<a id="tache-t4"></a>

### Tâche T4 — Cache de tuiles par palier (`pdf-tiles.ts`) et port PDF du moteur

**Objectif.** Le fond `pdf-page` est peint sans attente (DAPF2) : à chaque scène, `PdfTiles.paint` dessine les tuiles en
cache des paliers plus grossiers, puis celles du palier courant, et demande les tuiles visibles qui manquent (PF13) :
palier `p` = 2^⌈log2(zoom × dpr)⌉ borné à [1/4, 8], tuiles de 1024 px, clé `asset · page · p · colonne · rang`, deux
rendus au plus, ceux qui sortent de la vue annulés, LRU de 32 tuiles (bitmaps fermés à l'éviction et à `dispose`), un
`PdfFile` par asset ouvert au premier besoin et détruit à `dispose`. Le port `pdf-port.ts` donne les types que la
plateforme implémente (PC2).

**Fichiers.**
- Créer : `apps/web/src/engine/render/pdf-port.ts`, `apps/web/src/engine/render/pdf-tiles.ts`,
  `apps/web/src/engine/render/pdf-tiles.test.ts`

**Interfaces.**
- Consomme : `Bounds` (`apps/web/src/core/api.ts`), `Camera` (`engine/camera.ts`), `visibleGridRect`
  (`engine/page.ts:29`).
- Produit (lu par T3, T5, T8, T9) :
  - `pdf-port.ts` : `interface TileRect { x; y; w; h }` (px du palier), `type TileBitmap = CanvasImageSource & { close?(): void }`,
    `interface PdfFile { readonly pageCount: number; pageSize(index: number): Promise<{ readonly w: number; readonly h: number }>; renderTile(index: number, scale: number, tile: TileRect, signal: AbortSignal): Promise<TileBitmap>; destroy(): void }`,
    `interface PdfEngine { open(blob: Blob): Promise<PdfFile> }`.
  - `pdf-tiles.ts` : `TILE_PX = 1024`, `LEVELS = [0.25, 0.5, 1, 2, 4, 8]`, `MAX_TILES = 32`, `MAX_RENDERS = 2`,
    `type TileState = "attente" | "pret" | "echec"`,
    `interface PdfBackdrop { readonly asset: string; readonly page: number | null; readonly w: number | null; readonly rect: Bounds | null }`,
    `interface TileView { readonly w: number; readonly h: number; readonly dpr: number }`,
    `interface PdfTiles { paint(ctx: CanvasRenderingContext2D, backdrop: PdfBackdrop, camera: Camera, view: TileView): TileState; dispose(): void }`,
    `function levelFor(zoom: number, dpr: number): number`,
    `function tilesFor(rect: Bounds, level: number, visible: Bounds, prefix: string): PdfTile[]`,
    `function createPdfTiles(open: (asset: string) => Promise<PdfFile> | null, ready: () => void): PdfTiles`.
- Réutilise : `apps/web/src/engine/render/image-cache.ts:20` (`createImageCache`) — même forme (`ready` appelé à chaque
  arrivée, `dispose` qui ferme et ferme aussitôt ce qui arrive après) ; nouveau module `pdf-tiles.ts` parce que la clé
  (palier, tuile), l'éviction et l'annulation n'existent pas dans `image-cache` (cadrage § 3, termes cherchés : rien).
- Réutilise : `apps/web/src/engine/page.ts:29` (`visibleGridRect`) — partie visible de la page en monde, appelée telle
  quelle ; aucune troisième copie de `PAGE_WIDTH` (PF28 : la largeur vient de `backdrop.rect`).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/engine/render/pdf-tiles.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -30
```

Attendu : « tuiles PDF par palier (PF13, DAPF2) » ≥ 9 tests, 0 `×` : « levelFor… » (PF13), « tilesFor… » (PF13),
« fond sans indice, sans taille ou sans rect : echec » (Review Focus 5), « asset absent : echec », « premier dessin… 2
au plus… » (S3, PF13), « tuiles prêtes : dessinées… pret » (S3, PF15), « tuile sortie de la vue : rendu annulé, bitmap
tardif fermé » (Review Focus 3), « palier plus grossier en cache dessiné d'abord » (S3, flou court puis net), « LRU de 32 »
(Review Focus 3, HU1-10), « échec de rendu : echec », « dispose… » (Review Focus 3). `tsc` : aucune erreur dans ces trois
fichiers.

**Contraintes (recopiées).**
- GC2 TDD ; aucun test sauté, aucun délai relevé.
- GC3 PATH ; aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && pnpm install --frozen-lockfile`.
- GC6 Preuve bornée : la commande ci-dessus ; N et noms dans le rapport.
- GC7, GC8 Commits fichier par fichier, auteur et message imposés ; interdits git.
- GC11 Le moteur n'importe jamais `pdf.js` : ces fichiers n'importent que `core/api`, `engine/*` et `./pdf-port`.
- GC14 `tsc` : aucune erreur dans les trois fichiers.
- GC15 Une ligne `Réutilisation :` par ligne `Réutilise :`.
- GC18, GC19 Aucun processus laissé ; seuls les trois fichiers ci-dessus.

**Patron à ne pas reprendre.** Le cache d'images à une clé par asset (`apps/web/src/engine/render/image-cache.ts:20-57`) :
repris pour un PDF, il rendrait la page entière en un seul bitmap — géant au zoom fort (côté de 4096 px dépassé, U26)
ou flou à 400 % (S14) — sans éviction ni annulation. On garde sa forme (`ready`, `dispose`) ; la clé, le palier, la LRU
et l'annulation sont propres à `pdf-tiles.ts`. Chemin de référence de la forme gardée :
`apps/web/src/engine/render/image-cache.ts:20-57`.

**Interdits.** Aucun `await` dans `paint` (la scène reste synchrone, DAPF2) ; aucun import de `platform/` ni de
`pdfjs-dist` ; pas de placeholder ici (T5 le peint).

**Critère « terminé ».** Commande bornée verte, `tsc` propre sur ces fichiers, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : le port.** Créer `apps/web/src/engine/render/pdf-port.ts` :

```ts
/**
 * Port PDF du moteur (C12, DAPF1, DAPF2, PF12) : types seuls. Le moteur ne porte jamais un PDF (DAU5) : il demande des
 * tuiles à un `PdfFile` que la plateforme ouvre (`platform/pdf-render.ts`, pdf.js dans la page).
 */
/** Rectangle d'une tuile en pixels du palier, origine au coin haut gauche de la page rendue. */
export interface TileRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
export type TileBitmap = CanvasImageSource & { close?(): void };
export interface PdfFile {
  readonly pageCount: number;
  /** Taille de la page `index` (à partir de 0) en points, après /Rotate et CropBox. */
  pageSize(index: number): Promise<{ readonly w: number; readonly h: number }>;
  /** Tuile `tile` de la page `index` rendue à `scale` pixels par point ; rejet si `signal` est annulé. */
  renderTile(index: number, scale: number, tile: TileRect, signal: AbortSignal): Promise<TileBitmap>;
  destroy(): void;
}
export interface PdfEngine {
  /** Lève `PdfEncryptedError` (plateforme) pour un PDF chiffré (PF8). */
  open(blob: Blob): Promise<PdfFile>;
}
```

- [ ] **Étape 3 : tests rouges.** Créer `apps/web/src/engine/render/pdf-tiles.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import type { Camera } from "../camera";
import type { PdfFile, TileBitmap, TileRect } from "./pdf-port";
import { createPdfTiles, levelFor, MAX_TILES, tilesFor } from "./pdf-tiles";

interface Call {
  readonly index: number;
  readonly scale: number;
  readonly tile: TileRect;
  readonly signal: AbortSignal;
  resolve(b: TileBitmap): void;
  reject(e: unknown): void;
}
function fakeFile(): { file: PdfFile; calls: Call[]; destroy: ReturnType<typeof vi.fn> } {
  const calls: Call[] = [];
  const destroy = vi.fn();
  const file: PdfFile = {
    pageCount: 3,
    pageSize: async () => ({ w: 612, h: 792 }),
    renderTile: (index, scale, tile, signal) => new Promise<TileBitmap>((resolve, reject) => void calls.push({ index, scale, tile, signal, resolve, reject })),
    destroy,
  };
  return { file, calls, destroy };
}
const ASSET = "ab".repeat(32);
const RECT = { x0: 0, y0: 0, x1: 1920, y1: (792 * 1920) / 612 };
const B = { asset: ASSET, page: 1, w: 612, rect: RECT };
const CAM: Camera = { zoom: 1, tx: 0, ty: 0 };
const VIEW = { w: 2100, h: 1100, dpr: 1 };
const bmp = (): TileBitmap & { close: ReturnType<typeof vi.fn> } => ({ close: vi.fn() }) as unknown as TileBitmap & { close: ReturnType<typeof vi.fn> };
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
const ctx = () => {
  const drawn: number[][] = [];
  const c = { drawImage: (_b: unknown, x: number, y: number, w: number, h: number) => void drawn.push([x, y, w, h]) } as unknown as CanvasRenderingContext2D;
  return { c, drawn };
};

describe("tuiles PDF par palier (PF13, DAPF2)", () => {
  it("levelFor : 2^⌈log2(zoom × dpr)⌉ borné à [1/4, 8]", () => {
    expect([levelFor(1, 1), levelFor(1, 2), levelFor(0.3, 1), levelFor(0.1, 1), levelFor(8, 2), levelFor(1.5, 1), levelFor(0.5, 1), levelFor(Number.NaN, 1)]).toEqual([1, 2, 0.5, 0.25, 8, 2, 0.5, 1]);
  });

  it("tilesFor : tuiles de 1024 px qui recoupent la vue, coupées au bord de la page", () => {
    const t1 = tilesFor(RECT, 1, { x0: 0, y0: 0, x1: 1280, y1: 900 }, "k");
    expect(t1.map((t) => [t.key, t.px.x, t.px.y, t.px.w, t.px.h])).toEqual([
      ["k|1|0|0", 0, 0, 1024, 1024],
      ["k|1|1|0", 1024, 0, 896, 1024],
    ]);
    expect(t1[1]?.world).toEqual({ x0: 1024, y0: 0, x1: 1920, y1: 1024 });
    const t2 = tilesFor(RECT, 2, { x0: 0, y0: 0, x1: 640, y1: 450 }, "k");
    expect(t2.map((t) => t.key)).toEqual(["k|2|0|0", "k|2|1|0"]);
    expect(t2[1]?.world).toEqual({ x0: 512, y0: 0, x1: 1024, y1: 512 });
    expect(tilesFor(RECT, 1, { x0: 0, y0: 5000, x1: 100, y1: 6000 }, "k")).toEqual([]);
  });

  it("fond sans indice, sans taille ou sans rect : echec, rien d'ouvert (Review Focus 5)", () => {
    const open = vi.fn(() => null);
    const tiles = createPdfTiles(open, () => undefined);
    for (const b of [{ ...B, page: null }, { ...B, w: null }, { ...B, rect: null }]) expect(tiles.paint(ctx().c, b, CAM, VIEW)).toBe("echec");
    expect(open).not.toHaveBeenCalled();
  });

  it("asset absent du magasin (open rend null) : echec", () => {
    expect(createPdfTiles(() => null, () => undefined).paint(ctx().c, B, CAM, VIEW)).toBe("echec");
  });

  it("premier dessin : PDF ouvert une fois, attente ; puis tuiles visibles demandées, 2 au plus, à palier × 1920 / w (S3)", async () => {
    const { file, calls } = fakeFile();
    const open = vi.fn(async () => file);
    const ready = vi.fn();
    const tiles = createPdfTiles(open, ready);
    expect(tiles.paint(ctx().c, B, CAM, VIEW)).toBe("attente");
    await flush();
    expect([open.mock.calls.length, ready.mock.calls.length, calls.length]).toEqual([1, 1, 0]);
    expect(tiles.paint(ctx().c, B, CAM, VIEW)).toBe("attente");
    expect(calls).toHaveLength(2);
    expect([calls[0]?.index, calls[0]?.scale, calls[0]?.tile]).toEqual([1, 1920 / 612, { x: 0, y: 0, w: 1024, h: 1024 }]);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("tuiles prêtes : dessinées à leur place monde, ready à chaque arrivée ; toutes prêtes : pret (S3, PF15)", async () => {
    const { file, calls } = fakeFile();
    const ready = vi.fn();
    const tiles = createPdfTiles(async () => file, ready);
    const view = { w: 1280, h: 900, dpr: 1 };
    tiles.paint(ctx().c, B, CAM, view);
    await flush();
    tiles.paint(ctx().c, B, CAM, view);
    for (const c of calls) c.resolve(bmp());
    await flush();
    expect(ready).toHaveBeenCalledTimes(3);
    const { c, drawn } = ctx();
    expect(tiles.paint(c, B, CAM, view)).toBe("pret");
    expect(drawn).toEqual([
      [0, 0, 1024, 1024],
      [1024, 0, 896, 1024],
    ]);
  });

  it("tuile sortie de la vue : rendu annulé ; bitmap arrivé après l'annulation fermé, jamais gardé (Review Focus 3)", async () => {
    const { file, calls } = fakeFile();
    const tiles = createPdfTiles(async () => file, () => undefined);
    tiles.paint(ctx().c, B, CAM, VIEW);
    await flush();
    tiles.paint(ctx().c, B, CAM, VIEW);
    expect(calls.map((c) => c.signal.aborted)).toEqual([false, false]);
    expect(tiles.paint(ctx().c, B, { zoom: 1, tx: 0, ty: -6000 }, VIEW)).toBe("pret");
    expect(calls.map((c) => c.signal.aborted)).toEqual([true, true]);
    const late = bmp();
    calls[0]?.resolve(late);
    await flush();
    expect(late.close).toHaveBeenCalledTimes(1);
    tiles.paint(ctx().c, B, CAM, VIEW);
    expect(calls.length).toBe(4);
  });

  it("palier plus grossier en cache dessiné d'abord, puis le palier courant demandé (S3 : court flou, puis net)", async () => {
    const { file, calls } = fakeFile();
    const tiles = createPdfTiles(async () => file, () => undefined);
    const view = { w: 1280, h: 900, dpr: 1 };
    tiles.paint(ctx().c, B, CAM, view);
    await flush();
    tiles.paint(ctx().c, B, CAM, view);
    for (const c of calls) c.resolve(bmp());
    await flush();
    const { c, drawn } = ctx();
    expect(tiles.paint(c, B, { zoom: 2, tx: 0, ty: 0 }, view)).toBe("attente");
    expect(drawn).toEqual([[0, 0, 1024, 1024]]);
    expect(calls.slice(2).map((x) => [x.scale, x.tile.x])).toEqual([
      [(2 * 1920) / 612, 0],
      [(2 * 1920) / 612, 1024],
    ]);
  });

  it(`LRU de ${MAX_TILES} tuiles : la plus ancienne fermée à l'éviction (Review Focus 3, HU1-10)`, async () => {
    const { file, calls } = fakeFile();
    const tiles = createPdfTiles(async () => file, () => undefined);
    const tall = { ...B, rect: { x0: 0, y0: 0, x1: 1920, y1: 40000 } };
    const view = { w: 1000, h: 1000, dpr: 1 };
    tiles.paint(ctx().c, tall, CAM, view);
    await flush();
    const made: ReturnType<typeof bmp>[] = [];
    for (let k = 0; k <= MAX_TILES; k++) {
      tiles.paint(ctx().c, tall, { zoom: 1, tx: 0, ty: -1024 * k }, view);
      const b = bmp();
      made.push(b);
      calls[k]?.resolve(b);
      await flush();
    }
    expect(calls).toHaveLength(MAX_TILES + 1);
    expect(made.map((b) => b.close.mock.calls.length)).toEqual([1, ...new Array<number>(MAX_TILES).fill(0)]);
  });

  it("échec de rendu (hors annulation) : echec", async () => {
    const { file, calls } = fakeFile();
    const tiles = createPdfTiles(async () => file, () => undefined);
    tiles.paint(ctx().c, B, CAM, VIEW);
    await flush();
    tiles.paint(ctx().c, B, CAM, VIEW);
    calls[0]?.reject(new Error("rendu impossible"));
    await flush();
    expect(tiles.paint(ctx().c, B, CAM, VIEW)).toBe("echec");
  });

  it("dispose : rendus annulés, bitmaps fermés, PDF détruit ; un PDF ouvert après dispose est détruit aussitôt", async () => {
    const { file, calls, destroy } = fakeFile();
    const tiles = createPdfTiles(async () => file, () => undefined);
    const view = { w: 1280, h: 900, dpr: 1 };
    tiles.paint(ctx().c, B, CAM, view);
    await flush();
    tiles.paint(ctx().c, B, CAM, view);
    const kept = bmp();
    calls[0]?.resolve(kept);
    await flush();
    tiles.paint(ctx().c, B, CAM, view);
    tiles.dispose();
    expect([kept.close.mock.calls.length, destroy.mock.calls.length, calls[1]?.signal.aborted]).toEqual([1, 1, true]);
    const other = fakeFile();
    let release: (f: PdfFile) => void = () => undefined;
    const late = createPdfTiles(() => new Promise<PdfFile>((r) => (release = r)), () => undefined);
    late.paint(ctx().c, B, CAM, view);
    late.dispose();
    release(other.file);
    await flush();
    expect(other.destroy).toHaveBeenCalledTimes(1);
  });
});
```

  Commande bornée : rouge (module absent).

- [ ] **Étape 4 : le cache.** Créer `apps/web/src/engine/render/pdf-tiles.ts` :

```ts
/**
 * Fond `pdf-page` par tuiles (C12, PF13, DAPF2) : la scène reste synchrone ; `paint` dessine ce qui est en cache (paliers
 * plus grossiers d'abord, puis le palier courant : l'image la plus fine recouvre) et demande les tuiles visibles qui
 * manquent. Palier p = 2^⌈log2(zoom × dpr)⌉ borné à [1/4, 8] (pixels d'écran par unité monde) ; tuiles de 1024 px ; clé
 * `asset · page · p · colonne · rang` ; 2 rendus au plus, ceux qui sortent de la vue annulés ; LRU de 32 tuiles, bitmaps
 * fermés à l'éviction et à `dispose`. Un `PdfFile` par asset, ouvert au premier besoin, détruit à `dispose`. Une instance
 * par onglet ; `ready` (branché sur `engine.redraw()`) est appelé à chaque arrivée, comme `image-cache.ts`.
 */
import type { Bounds } from "../../core/api";
import type { Camera } from "../camera";
import { visibleGridRect } from "../page";
import type { PdfFile, TileBitmap, TileRect } from "./pdf-port";

export const TILE_PX = 1024;
export const LEVELS: readonly number[] = [0.25, 0.5, 1, 2, 4, 8];
export const MAX_TILES = 32;
export const MAX_RENDERS = 2;

export type TileState = "attente" | "pret" | "echec";
/** Ce que le cache lit d'un fond : un `BackdropView` du cœur s'y branche tel quel (PC3). */
export interface PdfBackdrop {
  readonly asset: string;
  readonly page: number | null;
  readonly w: number | null;
  readonly rect: Bounds | null;
}
export interface TileView {
  readonly w: number;
  readonly h: number;
  readonly dpr: number;
}
export interface PdfTile {
  readonly key: string;
  readonly px: TileRect;
  readonly world: Bounds;
}
export interface PdfTiles {
  paint(ctx: CanvasRenderingContext2D, backdrop: PdfBackdrop, camera: Camera, view: TileView): TileState;
  dispose(): void;
}

const MIN_LEVEL = LEVELS[0] ?? 0.25;
const MAX_LEVEL = LEVELS[LEVELS.length - 1] ?? 8;

export function levelFor(zoom: number, dpr: number): number {
  const z = zoom * dpr;
  if (!Number.isFinite(z) || !(z > 0)) return 1;
  // Marge de 1e-9 : un zoom de 2 tout juste reste au palier 2 malgré l'arrondi de log2.
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, 2 ** Math.ceil(Math.log2(z) - 1e-9)));
}

/** Tuiles du palier `level` qui recoupent `visible` (monde), en ordre de lecture ; la dernière colonne et le dernier
 *  rang sont coupés au bord de la page rendue (taille arrondie au pixel supérieur). */
export function tilesFor(rect: Bounds, level: number, visible: Bounds, prefix: string): PdfTile[] {
  const wpx = Math.ceil((rect.x1 - rect.x0) * level);
  const hpx = Math.ceil((rect.y1 - rect.y0) * level);
  const x0 = Math.max(0, (visible.x0 - rect.x0) * level);
  const x1 = Math.min(wpx, (visible.x1 - rect.x0) * level);
  const y0 = Math.max(0, (visible.y0 - rect.y0) * level);
  const y1 = Math.min(hpx, (visible.y1 - rect.y0) * level);
  if (!(x1 > x0) || !(y1 > y0)) return [];
  const out: PdfTile[] = [];
  for (let r = Math.floor(y0 / TILE_PX); r <= Math.ceil(y1 / TILE_PX) - 1; r++) {
    for (let c = Math.floor(x0 / TILE_PX); c <= Math.ceil(x1 / TILE_PX) - 1; c++) {
      const px = { x: c * TILE_PX, y: r * TILE_PX, w: Math.min(TILE_PX, wpx - c * TILE_PX), h: Math.min(TILE_PX, hpx - r * TILE_PX) };
      out.push({
        key: `${prefix}|${level}|${c}|${r}`,
        px,
        world: { x0: rect.x0 + px.x / level, y0: rect.y0 + px.y / level, x1: rect.x0 + (px.x + px.w) / level, y1: rect.y0 + (px.y + px.h) / level },
      });
    }
  }
  return out;
}

type FileEntry = { readonly state: "pending" } | { readonly state: "ready"; readonly file: PdfFile } | { readonly state: "failed" };

const why = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export function createPdfTiles(open: (asset: string) => Promise<PdfFile> | null, ready: () => void): PdfTiles {
  const files = new Map<string, FileEntry>();
  /** Ordre d'insertion = ordre d'usage (LRU) : `take` remet une tuile servie en dernier. */
  const cache = new Map<string, TileBitmap>();
  const inflight = new Map<string, AbortController>();
  const failed = new Set<string>();
  let disposed = false;

  const fileFor = (asset: string): FileEntry => {
    const hit = files.get(asset);
    if (hit !== undefined) return hit;
    const pending = open(asset);
    if (pending === null) {
      const gone: FileEntry = { state: "failed" };
      files.set(asset, gone);
      return gone;
    }
    const entry: FileEntry = { state: "pending" };
    files.set(asset, entry);
    pending.then(
      (file) => {
        if (disposed) {
          file.destroy();
          return;
        }
        files.set(asset, { state: "ready", file });
        ready();
      },
      (e: unknown) => {
        files.set(asset, { state: "failed" });
        console.warn(`RoomBoard : PDF ${asset} illisible (${why(e)})`);
        if (!disposed) ready();
      },
    );
    return entry;
  };
  const take = (key: string): TileBitmap | undefined => {
    const b = cache.get(key);
    if (b !== undefined) {
      cache.delete(key);
      cache.set(key, b);
    }
    return b;
  };
  const keep = (key: string, b: TileBitmap): void => {
    cache.set(key, b);
    while (cache.size > MAX_TILES) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.get(oldest)?.close?.();
      cache.delete(oldest);
    }
  };
  const abortExcept = (keys: ReadonlySet<string>): void => {
    for (const [k, c] of inflight) {
      if (keys.has(k)) continue;
      c.abort();
      inflight.delete(k);
    }
  };
  const draw = (ctx: CanvasRenderingContext2D, t: PdfTile, b: TileBitmap): void => {
    ctx.drawImage(b, t.world.x0, t.world.y0, t.world.x1 - t.world.x0, t.world.y1 - t.world.y0);
  };
  const start = (file: PdfFile, page: number, scale: number, t: PdfTile): void => {
    const ctrl = new AbortController();
    inflight.set(t.key, ctrl);
    const settle = (): boolean => {
      if (inflight.get(t.key) === ctrl) inflight.delete(t.key);
      return disposed || ctrl.signal.aborted;
    };
    file.renderTile(page, scale, t.px, ctrl.signal).then(
      (b) => {
        if (settle()) {
          b.close?.();
          return;
        }
        keep(t.key, b);
        ready();
      },
      (e: unknown) => {
        if (settle()) return;
        failed.add(t.key);
        console.warn(`RoomBoard : tuile ${t.key} non rendue (${why(e)})`);
        ready();
      },
    );
  };

  return {
    paint(ctx, b, camera, view) {
      const { page, w, rect } = b;
      if (disposed || page === null || w === null || rect === null) return "echec";
      const entry = fileFor(b.asset);
      if (entry.state === "failed") return "echec";
      const visible = visibleGridRect(camera, view.w, view.h);
      if (visible === null) {
        abortExcept(new Set());
        return "pret";
      }
      const prefix = `${b.asset}|${page}`;
      const level = levelFor(camera.zoom, view.dpr);
      for (const q of LEVELS) {
        if (q >= level) break;
        for (const t of tilesFor(rect, q, visible, prefix)) {
          const coarse = cache.get(t.key);
          if (coarse !== undefined) draw(ctx, t, coarse);
        }
      }
      const wanted = tilesFor(rect, level, visible, prefix);
      abortExcept(new Set(wanted.map((t) => t.key)));
      const scale = (level * (rect.x1 - rect.x0)) / w;
      let missing = 0;
      let broken = false;
      for (const t of wanted) {
        const hit = take(t.key);
        if (hit !== undefined) {
          draw(ctx, t, hit);
          continue;
        }
        if (failed.has(t.key)) {
          broken = true;
          continue;
        }
        missing += 1;
        if (entry.state === "ready" && !inflight.has(t.key) && inflight.size < MAX_RENDERS) start(entry.file, page, scale, t);
      }
      return broken ? "echec" : missing > 0 ? "attente" : "pret";
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const c of inflight.values()) c.abort();
      inflight.clear();
      for (const b of cache.values()) b.close?.();
      cache.clear();
      for (const e of files.values()) if (e.state === "ready") e.file.destroy();
      files.clear();
    },
  };
}
```

- [ ] **Étape 5 : vert.** La commande bornée ;
  `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep -E "pdf-(port|tiles)"` (rien).

- [ ] **Étape 6 : commit.**

```bash
cd "$WT" && for f in apps/web/src/engine/render/pdf-port.ts apps/web/src/engine/render/pdf-tiles.ts \
  apps/web/src/engine/render/pdf-tiles.test.ts; do git add "$f"; done && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(engine): tiled PDF backdrop cache by zoom level" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Rapport : N, noms vus, une ligne `Réutilisation :` par ligne `Réutilise :`.

<a id="tache-t5"></a>

### Tâche T5 — Rendu : fond dessiné dans `drawScene`, `paintContent`, `PageView.backdrop`

**Objectif.** Le fond de page est dessiné pour la première fois (PF14) : à la place réservée de `drawScene` (après le
blanc de page, avant la grille), un placeholder gris `#f1f5f9` couvre `backdrop.rect`, puis un fond `image` reçoit le
bitmap de l'`ImageSource` étiré sur `rect`, et un fond `pdf-page` est confié au peintre (`BackdropPainter`, le cache de
T4) ; en échec, le libellé « page PDF illisible ». L'état est publié (`onBackdrop`, PF15). Nouvelle méthode
`paintContent` : le contenu d'une page (grille et éléments) sans pourtour, fond blanc, fond ni habillage, projeté et
découpé, pour l'export (PF21, PF22). Le moteur remplit `PageView.backdrop` depuis `doc.page(pageId)`.

**Fichiers.**
- Modifier : `apps/web/src/engine/render/renderer.ts:1-9` (import, `PageView`, types neufs)
- Modifier : `apps/web/src/engine/render/canvas2d.ts:6-17` (imports), `:24-29` (`Canvas2DOptions`), `:55-58`
  (constantes), `:149-180` (champs, constructeur), `:195-216` (`drawScene`), méthodes neuves après `gridOf`
- Modifier : `apps/web/src/engine/engine.ts:430-437` (`frame`)
- Modifier : `apps/web/src/engine/render/canvas2d.test.ts`, `apps/web/src/engine/engine.test.ts` (blocs neufs en fin)

**Interfaces.**
- Consomme (T1, T2) : `PDF_PAGE_KIND`, `BackdropView` avec `page` (`core/api.ts`) ; `CoreFactory.fromPdfPages` (tests).
- Produit (lu par T7, T9, T12) :
  - `renderer.ts` : `PageView.backdrop?: BackdropView | null` ;
    `type BackdropState = "" | "attente" | "pret" | "echec"` ;
    `interface BackdropPainter { paint(ctx: CanvasRenderingContext2D, backdrop: BackdropView, camera: Camera, view: { readonly w: number; readonly h: number; readonly dpr: number }): Exclude<BackdropState, ""> }`.
  - `canvas2d.ts` : `Canvas2DOptions.backdrop?: BackdropPainter`, `Canvas2DOptions.onBackdrop?: (s: BackdropState) => void` ;
    `BACKDROP_PLACEHOLDER = "#f1f5f9"`, `BACKDROP_UNREADABLE_LABEL = "page PDF illisible"` ;
    `Canvas2DRenderer.paintContent(ctx: CanvasRenderingContext2D, page: PageView, rect: Bounds, scale: number): void`.
- Réutilise : `apps/web/src/engine/render/canvas2d.ts:221` (`paintElement`), `:69` (`paintPlaceholder`) — appelées par
  `drawScene` et par `paintContent` ; aucune seconde implémentation du dessin (D7).
- Réutilise : `apps/web/src/engine/render/image-cache.ts:9` (`ImageSource.bitmap`) — fond `image` dessiné par le même
  cache que les éléments image.
- Réutilise : `crates/roomboard-core/src/element.rs:333` (`BackdropView.rect`, DAK4) — lu tel quel, aucun recalcul de
  la hauteur côté page.
- Réutilise : `apps/web/src/engine/render/grid-paint.ts:102` (`paintGrid`), `MIN_GRID_PX`, `MIN_DOT_PX` — grille de
  l'export par la même fonction que l'écran.
- Réutilise : `apps/web/src/engine/page.ts:4` (`PAGE_WIDTH`) — inchangé ; la largeur du fond vient de `rect` (PF28).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/engine/render/canvas2d.test.ts src/engine/render/webgl2.test.ts src/engine/engine.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | grep -E "C12|×|FAIL|Test Files|Tests " | tail -30
```

Attendu : 0 `×` ; « Canvas2DRenderer — fond de page (C12) » ≥ 6 tests (« fond pdf-page : placeholder puis peintre,
sous la grille et les éléments » (PF14, G11), « le peintre reçoit fond, caméra et vue » (PF13), « onBackdrop… » (PF15),
« fond pdf-page en échec : libellé page PDF illisible » (Review Focus 5), « fond image : bitmap étiré sur rect… » (effet
de bord du cadrage), « fond sans rect : rien, echec », « genre inconnu : placeholder seul ») ; « Canvas2DRenderer —
paintContent (C12) » ≥ 3 ; « moteur — fond de page (C12) » ≥ 1. Tests à garder verts (carte d'impact) :
`webgl2.test.ts` entier, « ordre des couches (G11) », « images et éléments inconnus (R16, U3) ».

**Contraintes (recopiées).**
- GC2 TDD ; aucun test sauté.
- GC3 PATH ; aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && pnpm install --frozen-lockfile`.
- GC6 Preuve bornée : la commande ci-dessus ; N et noms dans le rapport.
- GC7, GC8 Commits fichier par fichier, auteur et message imposés ; interdits git.
- GC11 Le moteur n'importe jamais `pdf.js` : le fond PDF passe par `BackdropPainter`.
- GC14 `tsc` vide.
- GC15 Une ligne `Réutilisation :` par ligne `Réutilise :`.
- GC18 Aucun processus laissé.
- GC19 Périmètre : seuls les cinq fichiers ci-dessus ; règle PF29 : dans `engine.ts`, **un seul** `doc.page(pageId)` par
  scène, rangé dans une variable (`const view = doc.page(pageId)`), que C6a complétera de `background`.

**Interdits.** Ne pas toucher `paintEraser` (PF30, HPF1-6) ni `webgl2.ts` ; aucun `await` dans `drawScene` ; ne pas
recalculer `rect`.

**Critère « terminé ».** Commande bornée verte, `tsc` vide, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges du rendu.** À la fin de `apps/web/src/engine/render/canvas2d.test.ts` (ajouter
  `BACKDROP_PLACEHOLDER`, `BACKDROP_UNREADABLE_LABEL` à l'import de `./canvas2d`, et `BackdropPainter`,
  `BackdropState` à l'import de type de `./renderer`) :

```ts
describe("Canvas2DRenderer — fond de page (C12)", () => {
  const PDF = { id: "ab".repeat(32), name: "a.pdf", mime: "application/pdf", size: 3 };
  const PNG = { id: "cd".repeat(32), name: "a.png", mime: "image/png", size: 3 };
  const pdfDoc = (): CoreDocument => fakeCore.fromPdfPages(PDF, [{ w: 612, h: 792 }]);
  const pageOf = (doc: CoreDocument, ids: string[] = []) => {
    const id = doc.pageIds()[0] ?? "";
    return { id, elementIds: ids, backdrop: doc.page(id)?.backdrop ?? null };
  };
  const painter = (state: "attente" | "pret" | "echec", calls: unknown[][] = []): BackdropPainter => ({
    paint: (ctx, b, camera, view) => {
      (ctx as unknown as FakeCtx).log.push("peintre");
      calls.push([b.kind, b.page, camera, view]);
      return state;
    },
  });

  it("fond pdf-page : placeholder sur rect, puis le peintre ; sous la grille et les éléments (PF14, G11)", () => {
    const doc = pdfDoc();
    const p = doc.pageIds()[0] ?? "";
    const id = doc.apply({ type: "AddShape", page: p, shape: "rect", x0: 100, y0: 100, x1: 200, y1: 200, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
    doc.apply({ type: "SetGrid", page: p, grid: gridOf([gridLevel("squares", 40, "#7b68ee")]) });
    const scene = new FakeCtx();
    const r = new Canvas2DRenderer(asCtx(scene), null, doc, { makePath: () => new FakePath() as unknown as Path2D, backdrop: painter("pret") });
    r.resize(800, 600, 1);
    r.drawScene(pageOf(doc, [id]), IDENTITY, new Set());
    expect(scene.log.filter((l) => l.startsWith("fillRect") || l.startsWith("stroke") || l === "peintre")).toEqual([
      `fillRect ${SURROUND_COLOR}`,
      `fillRect ${PAGE_BACKGROUND}`,
      `fillRect ${BACKDROP_PLACEHOLDER}`,
      "peintre",
      "stroke #7b68ee 1",
      "stroke #000000 4",
    ]);
    expect(scene.rects[2]).toEqual([0, 0, 1920, (792 * 1920) / 612]);
  });

  it("le peintre reçoit le fond, la caméra et la vue (largeur et hauteur CSS, dpr) (PF13)", () => {
    const doc = pdfDoc();
    const calls: unknown[][] = [];
    const r = new Canvas2DRenderer(asCtx(new FakeCtx()), null, doc, { backdrop: painter("attente", calls) });
    r.resize(800, 600, 2);
    const cam = { zoom: 0.5, tx: 10, ty: 20 };
    r.drawScene(pageOf(doc), cam, new Set());
    expect(calls).toEqual([["pdf-page", 0, cam, { w: 800, h: 600, dpr: 2 }]]);
  });

  it("onBackdrop : état du peintre après chaque scène ; page sans fond : chaîne vide (PF15)", () => {
    const states: BackdropState[] = [];
    const doc = pdfDoc();
    const r = new Canvas2DRenderer(asCtx(new FakeCtx()), null, doc, { backdrop: painter("attente"), onBackdrop: (s) => void states.push(s) });
    r.resize(800, 600, 1);
    r.drawScene(pageOf(doc), IDENTITY, new Set());
    r.drawScene({ id: "x", elementIds: [] }, IDENTITY, new Set());
    r.drawScene({ id: "x", elementIds: [], backdrop: null }, IDENTITY, new Set());
    expect(states).toEqual(["attente", "", ""]);
  });

  it("fond pdf-page en échec (sans peintre, ou peintre en échec) : placeholder et libellé « page PDF illisible » (Review Focus 5)", () => {
    for (const backdrop of [undefined, painter("echec")]) {
      const doc = pdfDoc();
      const scene = new FakeCtx();
      const states: BackdropState[] = [];
      const r = new Canvas2DRenderer(asCtx(scene), null, doc, { ...(backdrop ? { backdrop } : {}), onBackdrop: (s) => void states.push(s) });
      r.resize(800, 600, 1);
      r.drawScene(pageOf(doc), IDENTITY, new Set());
      expect(scene.texts.map((t) => t.text)).toContain(BACKDROP_UNREADABLE_LABEL);
      expect(states).toEqual(["echec"]);
    }
    expect(BACKDROP_UNREADABLE_LABEL).toBe("page PDF illisible");
  });

  it("fond image : bitmap étiré sur rect, avant la grille ; non décodé : placeholder seul, attente (effet de bord C12)", () => {
    const doc = fakeCore.blank();
    const p = doc.pageIds()[0] ?? "";
    doc.apply({ type: "SetBackdrop", page: p, backdrop: { asset: PNG, w: 1000, h: 500, fit: "width" } });
    const bmp = { width: 1000, height: 500 } as unknown as CanvasImageSource;
    const states: BackdropState[] = [];
    const scene = new FakeCtx();
    const r = new Canvas2DRenderer(asCtx(scene), null, doc, { images: { bitmap: (a) => (a === PNG.id ? bmp : null) }, onBackdrop: (s) => void states.push(s) });
    r.resize(800, 600, 1);
    r.drawScene(pageOf(doc), IDENTITY, new Set());
    expect(scene.images).toEqual([{ img: bmp, x: 0, y: 0, w: 1920, h: 960 }]);
    const blind = new FakeCtx();
    const r2 = new Canvas2DRenderer(asCtx(blind), null, doc, { images: { bitmap: () => null }, onBackdrop: (s) => void states.push(s) });
    r2.resize(800, 600, 1);
    r2.drawScene(pageOf(doc), IDENTITY, new Set());
    expect(blind.images).toEqual([]);
    expect(blind.log).toContain(`fillRect ${BACKDROP_PLACEHOLDER}`);
    expect(states).toEqual(["pret", "attente"]);
  });

  it("fond sans rect (w ou h illisibles) : rien dessiné, echec ; genre inconnu (version plus récente) : placeholder seul, état vide", () => {
    const states: BackdropState[] = [];
    const scene = new FakeCtx();
    const r = new Canvas2DRenderer(asCtx(scene), null, fakeCore.blank(), { backdrop: painter("pret"), onBackdrop: (s) => void states.push(s) });
    r.resize(800, 600, 1);
    const base = { asset: PDF.id, page: 0, w: 612, h: 792, fit: "width" };
    r.drawScene({ id: "p", elementIds: [], backdrop: { ...base, kind: "pdf-page", rect: null } }, IDENTITY, new Set());
    r.drawScene({ id: "p", elementIds: [], backdrop: { ...base, kind: "video", rect: { x0: 0, y0: 0, x1: 1920, y1: 2000 } } }, IDENTITY, new Set());
    expect(states).toEqual(["echec", ""]);
    expect(scene.log.filter((l) => l === `fillRect ${BACKDROP_PLACEHOLDER}`)).toHaveLength(1);
    expect(scene.log).not.toContain("peintre");
  });
});

describe("Canvas2DRenderer — paintContent (C12)", () => {
  const shapeDoc = () => {
    const doc = fakeCore.blank();
    const p = doc.pageIds()[0] ?? "";
    const id = doc.apply({ type: "AddShape", page: p, shape: "rect", x0: 100, y0: 100, x1: 200, y1: 200, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
    return { doc, p, id };
  };

  it("rect projeté à l'échelle et découpé ; éléments dessinés ; ni pourtour, ni fond blanc, ni fond de page (PF21)", () => {
    const { doc, p, id } = shapeDoc();
    const calls: unknown[] = [];
    const r = new Canvas2DRenderer(asCtx(new FakeCtx()), null, doc, { makePath: () => new FakePath() as unknown as Path2D, backdrop: { paint: () => (calls.push(1), "pret") } });
    const out = new FakeCtx();
    r.paintContent(asCtx(out), { id: p, elementIds: [id], backdrop: null }, { x0: 0, y0: 0, x1: 1920, y1: 2715 }, 0.5);
    expect(out.log.slice(0, 5)).toEqual(["save", "setTransform 0.5,0,0,0.5,0,0", "beginPath", "rect", "clip"]);
    expect(out.log.at(-1)).toBe("restore");
    expect(out.log).toContain("stroke #000000 4");
    expect(out.log.filter((l) => l.startsWith("fillRect"))).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("rect décalé : translation de -x0 × scale, -y0 × scale", () => {
    const { doc, p, id } = shapeDoc();
    const out = new FakeCtx();
    new Canvas2DRenderer(asCtx(new FakeCtx()), null, doc, { makePath: () => new FakePath() as unknown as Path2D }).paintContent(asCtx(out), { id: p, elementIds: [id] }, { x0: 100, y0: 50, x1: 300, y1: 250 }, 2);
    expect(out.log[1]).toBe("setTransform 2,0,0,2,-200,-100");
  });

  it("grille de la page : sous les éléments, sur eux si above (G11)", () => {
    for (const above of [false, true]) {
      const { doc, p, id } = shapeDoc();
      doc.apply({ type: "SetGrid", page: p, grid: gridOf([gridLevel("squares", 40, "#7b68ee")], above) });
      const out = new FakeCtx();
      new Canvas2DRenderer(asCtx(new FakeCtx()), null, doc, { makePath: () => new FakePath() as unknown as Path2D }).paintContent(asCtx(out), { id: p, elementIds: [id] }, { x0: 0, y0: 0, x1: 1920, y1: 1080 }, 1);
      const strokes = out.log.filter((l) => l.startsWith("stroke"));
      expect(strokes, String(above)).toEqual(above ? ["stroke #000000 4", "stroke #7b68ee 1"] : ["stroke #7b68ee 1", "stroke #000000 4"]);
    }
  });
});
```

  À la fin de `apps/web/src/engine/engine.test.ts` :

```ts
describe("moteur — fond de page (C12)", () => {
  it("drawScene reçoit le fond lu dans doc.page(id), page par page ; page sans fond : null (PF14, PF29)", () => {
    const doc = fakeCore.fromPdfPages({ id: "ab".repeat(32), name: "a.pdf", mime: "application/pdf", size: 3 }, [{ w: 612, h: 792 }, { w: 612, h: 792 }]);
    const frames = new Frames();
    const renderer = new FakeRenderer();
    const engine = createEngine({ doc, renderer, frames, tools: { pen: (ctx) => fakeTool("pen", [], ctx), eraser: (ctx) => fakeTool("eraser", [], ctx) } });
    engine.resize(800, 600, 1);
    frames.tick();
    expect(renderer.scenes.at(-1)?.page.backdrop).toMatchObject({ kind: "pdf-page", page: 0 });
    engine.nextPage();
    frames.tick();
    expect(renderer.scenes.at(-1)?.page.backdrop).toMatchObject({ kind: "pdf-page", page: 1 });
    const blank = setup();
    blank.engine.resize(800, 600, 1);
    blank.frames.tick();
    expect(blank.renderer.scenes.at(-1)?.page.backdrop).toBeNull();
  });
});
```

  Commande bornée : rouge (exports absents, `backdrop` non transmis).

- [ ] **Étape 3 : contrat du rendu.** Dans `apps/web/src/engine/render/renderer.ts`, l'import de type devient
  `import type { BackdropView, Change, CoreDocument, EraseMode, GridView } from "../../core/api";` ; `PageView` :

```ts
export interface PageView {
  readonly id: string;
  readonly elementIds: readonly string[];
  /** C12 (PF14) : fond de la page, lu par le moteur dans `doc.page(id)` ; absent ou null : aucun fond. */
  readonly backdrop?: BackdropView | null;
}

/** C12 (PF15) : état du fond après une scène — "" sans fond, `attente`, `pret`, `echec` (`#stage[data-fond]`). */
export type BackdropState = "" | "attente" | "pret" | "echec";

/** C12 (DAPF2) : peintre du fond `pdf-page` (cache de tuiles `pdf-tiles.ts`), appelé dans la scène, sans attente. */
export interface BackdropPainter {
  paint(
    ctx: CanvasRenderingContext2D,
    backdrop: BackdropView,
    camera: Camera,
    view: { readonly w: number; readonly h: number; readonly dpr: number },
  ): Exclude<BackdropState, "">;
}
```

- [ ] **Étape 4 : le fond dans la scène et `paintContent`.** Dans `apps/web/src/engine/render/canvas2d.ts` : importer
  `PDF_PAGE_KIND` et le type `BackdropView` de `../../core/api`, `MIN_DOT_PX`, `MIN_GRID_PX` de `./grid-paint`, et les
  types `BackdropPainter`, `BackdropState` de `./renderer`. `Canvas2DOptions` gagne :

```ts
  /** C12 (DAPF2) : peintre du fond `pdf-page` ; absent : placeholder et « page PDF illisible ». */
  readonly backdrop?: BackdropPainter;
  /** C12 (PF15) : état du fond après chaque scène. */
  readonly onBackdrop?: (s: BackdropState) => void;
```

  Après `UNKNOWN_LABEL` :

```ts
/** C12 (PF14) : fond de page pas encore rendu (gris clair), et libellé d'un fond PDF illisible. */
export const BACKDROP_PLACEHOLDER = "#f1f5f9";
export const BACKDROP_UNREADABLE_LABEL = "page PDF illisible";
```

  Champs de la classe, après `private readonly images` : `private readonly backdrop: BackdropPainter | null;` et
  `private readonly onBackdrop: ((s: BackdropState) => void) | null;` ; dans le constructeur :
  `this.backdrop = opts.backdrop ?? null;` et `this.onBackdrop = opts.onBackdrop ?? null;`. Dans `drawScene`, remplacer
  la ligne de commentaire de la place réservée (`:204`) par :

```ts
    // Fond de page (U6, C12 PF14) : sous la grille et sous les éléments (G11).
    const state = page.backdrop ? this.paintBackdrop(ctx, page.backdrop, camera) : "";
    this.onBackdrop?.(state);
```

  Après `gridOf`, ajouter :

```ts
  /** Placeholder sur `rect`, puis le bitmap d'un fond `image` ou le peintre d'un fond `pdf-page` (PF14) ; un autre genre
   *  (version plus récente) garde le placeholder seul. */
  private paintBackdrop(ctx: CanvasRenderingContext2D, b: BackdropView, camera: Camera): BackdropState {
    const r = b.rect;
    if (r === null) return "echec";
    const w = r.x1 - r.x0;
    const h = r.y1 - r.y0;
    ctx.fillStyle = BACKDROP_PLACEHOLDER;
    ctx.fillRect(r.x0, r.y0, w, h);
    if (b.kind === "image") {
      const bmp = this.images?.bitmap(b.asset) ?? null;
      if (bmp === null) return "attente";
      ctx.drawImage(bmp, r.x0, r.y0, w, h);
      return "pret";
    }
    if (b.kind !== PDF_PAGE_KIND) return "";
    const s = this.backdrop?.paint(ctx, b, camera, { w: this.cssWidth, h: this.cssHeight, dpr: this.dpr }) ?? "echec";
    if (s === "echec") {
      ctx.font = textFont(32);
      ctx.fillStyle = PLACEHOLDER_STROKE;
      ctx.textBaseline = "top";
      ctx.fillText(BACKDROP_UNREADABLE_LABEL, r.x0 + 24, r.y0 + 24);
    }
    return s;
  }

  /**
   * Contenu d'une page pour l'export (C12, PF20 à PF22) : grille (sous ou sur les éléments, G11) et éléments, sans
   * pourtour, fond blanc, fond de page ni habillage. `rect` (monde) est projeté sur (0, 0)-(largeur × scale,
   * hauteur × scale) du contexte et découpé ; même code de dessin que l'écran (D7).
   */
  paintContent(ctx: CanvasRenderingContext2D, page: PageView, rect: Bounds, scale: number): void {
    const camera: Camera = { zoom: scale, tx: -rect.x0 * scale, ty: -rect.y0 * scale };
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, camera.tx, camera.ty);
    ctx.beginPath();
    ctx.rect(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);
    ctx.clip();
    const grid = this.source.gridLines?.(page.id, rect, MIN_GRID_PX / scale, MIN_DOT_PX / scale) ?? null;
    if (grid && !grid.above) paintGrid(ctx, grid, camera, 1, 1, 1);
    for (const id of page.elementIds) {
      const el = this.source.element(id);
      if (el) this.paintElement(ctx, el, null);
    }
    if (grid && grid.above) paintGrid(ctx, grid, camera, 1, 1, 1);
    ctx.restore();
  }
```

  (`-rect.x0 * scale` vaut `-0` pour `x0 = 0` : le faux contexte écrit `+v.toFixed(4)`, donc `0` ; aucun cas à part.)

- [ ] **Étape 5 : le moteur.** Dans `apps/web/src/engine/engine.ts`, fonction `frame`, remplacer l'appel
  `renderer.drawScene({ id: pageId, elementIds: doc.elementIds(pageId) }, camera, hidden, overlay);` par :

```ts
      // Un seul `doc.page` par scène (PF29) : il porte le fond (C12) et portera la couleur de fond (C6a).
      const view = doc.page(pageId);
      renderer.drawScene({ id: pageId, elementIds: doc.elementIds(pageId), backdrop: view?.backdrop ?? null }, camera, hidden, overlay);
```

- [ ] **Étape 6 : vert.** La commande bornée ; puis `pnpm --filter @roomboard/web exec vitest run src/engine 2>&1 | grep -E "Test Files|Tests "`
  (0 échec) et `tsc` (GC14).

- [ ] **Étape 7 : commit.**

```bash
cd "$WT" && for f in apps/web/src/engine/render/renderer.ts apps/web/src/engine/render/canvas2d.ts \
  apps/web/src/engine/render/canvas2d.test.ts apps/web/src/engine/engine.ts apps/web/src/engine/engine.test.ts; do git add "$f"; done && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(render): draw page backdrops and add paintContent for export" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Rapport : N par bloc, noms vus, une ligne `Réutilisation :` par ligne `Réutilise :`.

<a id="tache-t6"></a>

### Tâche T6 — Surfaces : PDF reconnu à l'import, filtres, action « Exporter en PDF… », `PDF_TYPE`

**Objectif.** Un PDF déposé, importé ou passé au lancement est reconnu par ses octets magiques `%PDF-` dans le premier
Kio, sans regarder le nom (PF3), et remis à `openPdf` (gestionnaire `pdf` de nature `document`, PF2, Q1) ; onglets
pleins : les documents suivants, PDF compris, ne sont pas tentés (PF10, PC18). La boîte « Importer » montre les PDF
(PF3). L'action `export-pdf` « Exporter en PDF… » rejoint la barre des pages, en bas (PF19), et le type de fichier
`PDF_TYPE` est prêt pour l'écriture.

**Fichiers.**
- Modifier : `apps/web/src/platform/import.ts:1-8` (en-tête), `:29-43` (`ImportDeps`), après `:144`
  (`hasPdfMagic`, `pdfHandler`), `:168-174` (registre), `:206-211` (arrêt des documents)
- Modifier : `apps/web/src/platform/files.ts:65-68`, `apps/web/src/platform/host-fsa.ts:36-46`,
  `apps/web/src/platform/typed-files.ts:18-23`
- Modifier : `apps/web/src/toolbar.ts:98-125`, `apps/web/src/toolbar-profiles.ts:24-40`,
  `apps/web/src/app/toolbar-host.ts:22-62`
- Tests : `apps/web/src/platform/import.test.ts`, `files.test.ts:65-68`, `host-fsa.test.ts:225-232`,
  `typed-files.test.ts`, `apps/web/src/toolbar.test.ts`, `apps/web/src/toolbar-profiles.test.ts`,
  `apps/web/src/profile-edit.test.ts:84`, `apps/web/src/app/toolbar-host.test.ts`

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit (lu par T8, T9, T10) :
  - `import.ts` : `ImportDeps.openPdf?(file: { readonly name: string; readonly blob: Blob }): Promise<boolean>` ;
    `PDF_MAGIC`, `PDF_HEAD_SCAN = 1024`, `hasPdfMagic(head: Uint8Array): boolean`,
    `pdfHandler(deps: { openPdf(file: { readonly name: string; readonly blob: Blob }): Promise<boolean> }): ImportHandler`.
  - `files.ts` : `PDF_EXTENSION = ".pdf"`, `PDF_MIME = "application/pdf"`, `IMPORT_EXTENSIONS` avec `"pdf"` après
    `"rbitem"`, `IMPORT_FILTER.name = "Images, PDF et documents RoomBoard"`.
  - `typed-files.ts` : `PDF_TYPE: FileType` (`.pdf`, `application/pdf`, filtre « Document PDF », accept
    `.pdf,application/pdf`).
  - Barre : action `export-pdf` (libellé « Exporter en PDF… »), dernier élément de `pagesBar()` ;
    `HostTargets.exportPdf?(): void` ; `ACTIONS["export-pdf"] = (t) => t.exportPdf?.()` (PC9) ; bouton
    `button[data-item="export-pdf"]`.
- Réutilise : `apps/web/src/platform/import.ts:167` (`createImporter`), `:64-74` (`ImportHandler`) — nouveau
  `pdfHandler(deps): ImportHandler` (`id: "pdf"`, `nature: "document"`) ajouté au registre ; `ImportDeps.openPdf`.
  Le PDF ne passe pas par `ImageTarget` (PF28, constat `image-import.ts:244`).
- Réutilise : `apps/web/src/platform/typed-files.ts:33` (`createWebTypedFiles`), `:47` (`createTauriTypedFiles`) — le
  nouveau `PDF_TYPE` s'y branche tel quel (instancié par l'amorce en T9).
- Réutilise : `apps/web/src/toolbar.ts:98` (`ACTION_TABLE`), `apps/web/src/app/toolbar-host.ts:35` (`ACTIONS`),
  `apps/web/src/toolbar-profiles.ts:24` (`pagesBar`) — entrée `export-pdf` ajoutée, rien d'autre.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/platform src/toolbar.test.ts src/toolbar-profiles.test.ts src/profile-edit.test.ts src/app/toolbar-host.test.ts src/ui --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | grep -E "C12|×|FAIL|Test Files|Tests " | tail -40
```

Attendu : 0 `×` ; « importFiles : PDF (C12, PF2, PF3) » ≥ 7 (« un .pdf reconnu par %PDF- ouvre un onglet » (S1, effet
de bord), « octets magiques seuls » (PF3), « %PDF- à l'octet 1019 : reconnu ; à 1020 : refusé » (PF3), « ouverture
refusée : failed » (S2), « onglets pleins… » (PF10), « web : un PDF de 120 Mo refusé avant lecture » (S2, PF9),
« sans openPdf : refusé comme avant ») ; « barre : Exporter en PDF (C12, PF19) » ≥ 4 ; « PDF_TYPE (C12) » ≥ 1.
Tests à garder verts (carte d'impact) : `host-repli.test.ts`, `host-tauri.test.ts` (ils lisent `IMPORT_ACCEPT`,
`IMPORT_FILTER`), `src/ui` entier (`PagesBar.test.tsx`) — `Test Files` sans échec. `tsc` vide.

**Contraintes (recopiées).**
- GC2 TDD ; aucun test sauté.
- GC3 PATH ; aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && pnpm install --frozen-lockfile`.
- GC6 Preuve bornée : la commande ci-dessus ; N et noms dans le rapport.
- GC7, GC8 Commits fichier par fichier, auteur et message imposés ; interdits git.
- GC13 Libellés en français (« Exporter en PDF… », « Images, PDF et documents RoomBoard », « Document PDF »).
- GC14 `tsc` vide.
- GC15 Une ligne `Réutilisation :` par ligne `Réutilise :`.
- GC18, GC19 Aucun processus laissé ; seuls les fichiers ci-dessus ; rien dans la barre du haut (C6a y ajoute « Pot »).

**Interdits.** Ne pas toucher `FSA_TYPES`, `FALLBACK_ACCEPT` ni le filtre « Ouvrir » (`files.ts:11`, PF2 : « Ouvrir »
garde `.roomboard`) ; aucune association `.pdf` dans la coque ; aucun bouton dans la barre du haut.

**Critère « terminé ».** Commande bornée verte, `tsc` vide, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges de l'import.** À la fin de `apps/web/src/platform/import.test.ts` (importer
  `hasPdfMagic` de `./import`) :

```ts
describe("importFiles : PDF (C12, PF2, PF3)", () => {
  const PDF_HEAD = new TextEncoder().encode("%PDF-1.7\n%âã\n");
  const notify = () => vi.fn(async (_m: string) => undefined);
  const opener = (ok = true) => vi.fn(async (_f: { readonly name: string; readonly blob: Blob }) => ok);

  it("un .pdf reconnu par %PDF- ouvre un onglet : openPdf(nom, blob), aucun objet inséré (S1, Q1, effet de bord C12)", async () => {
    const openPdf = opener();
    const n = notify();
    const r = await createImporter({ openDocument: async () => true, notify: n, openPdf }).importFiles([file("Cours.pdf", PDF_HEAD)]);
    expect(r).toEqual({ opened: ["Cours.pdf"], inserted: [], refused: [], failed: [] });
    expect(openPdf.mock.calls[0]![0].name).toBe("Cours.pdf");
    expect(new Uint8Array(await openPdf.mock.calls[0]![0].blob.arrayBuffer())).toEqual(PDF_HEAD);
    expect(n).not.toHaveBeenCalled();
  });

  it("octets magiques seuls : un PDF nommé .txt est ouvert ; un .pdf sans %PDF- est refusé (PF3)", async () => {
    const openPdf = opener();
    const n = notify();
    const r = await createImporter({ openDocument: async () => true, notify: n, openPdf }).importFiles([file("note.txt", PDF_HEAD), file("faux.pdf", new Uint8Array([1, 2, 3]))]);
    expect([r.opened, r.refused]).toEqual([["note.txt"], ["faux.pdf"]]);
    expect(n).toHaveBeenCalledWith(`faux.pdf : ${LATER_FORMAT_MESSAGE}`);
  });

  it("%PDF- à l'octet 1019 : reconnu ; à l'octet 1020 : refusé (premier Kio, PF3)", () => {
    const at = (k: number): Uint8Array => {
      const b = new Uint8Array(k + PDF_HEAD.length);
      b.set(PDF_HEAD, k);
      return b;
    };
    expect([hasPdfMagic(at(0)), hasPdfMagic(at(1019)), hasPdfMagic(at(1020)), hasPdfMagic(new Uint8Array(3))]).toEqual([true, true, false, false]);
  });

  it("ouverture refusée (chiffré, illisible) : failed ; le message est celui d'openPdf, l'importeur n'en ajoute pas (S2)", async () => {
    const n = notify();
    const r = await createImporter({ openDocument: async () => true, notify: n, openPdf: opener(false) }).importFiles([file("secret.pdf", PDF_HEAD)]);
    expect(r).toEqual({ opened: [], inserted: [], refused: [], failed: ["secret.pdf"] });
    expect(n).not.toHaveBeenCalled();
  });

  it("onglets pleins : le premier PDF refusé arrête les documents suivants, .pdf et .roomboard (PF10, PC18)", async () => {
    const openPdf = opener(false);
    const openDocument = vi.fn(async () => true);
    const r = await createImporter({ openDocument, notify: notify(), openPdf, full: () => true })
      .importFiles([file("a.pdf", PDF_HEAD), file("b.pdf", PDF_HEAD), file("c.roomboard", new Uint8Array([1]))]);
    expect(openPdf).toHaveBeenCalledTimes(1);
    expect(openDocument).not.toHaveBeenCalled();
    expect(r.failed).toEqual(["a.pdf", "b.pdf", "c.roomboard"]);
  });

  it("web : un PDF de 120 Mo est refusé avant lecture (S2, PF9)", async () => {
    const head = vi.fn(async () => PDF_HEAD);
    const blob = vi.fn(async () => new Blob([PDF_HEAD]));
    const big: DroppedFile = { name: "gros.pdf", size: 120 * 1024 * 1024, mime: "", head, blob };
    const openPdf = opener();
    const n = notify();
    const r = await createImporter({ openDocument: async () => true, notify: n, openPdf, maxBytes: WEB_MAX_BYTES }).importFiles([big]);
    expect(r.refused).toEqual(["gros.pdf"]);
    expect([head.mock.calls.length, blob.mock.calls.length, openPdf.mock.calls.length]).toEqual([0, 0, 0]);
    expect(n).toHaveBeenCalledWith("gros.pdf : fichier trop gros (plus de 100 Mo)");
  });

  it("sans openPdf (amorce partielle, tests anciens) : .pdf refusé comme avant", async () => {
    const n = notify();
    const r = await createImporter({ openDocument: async () => true, notify: n }).importFiles([file("Cours.pdf", PDF_HEAD)]);
    expect(r.refused).toEqual(["Cours.pdf"]);
    expect(n).toHaveBeenCalledWith(`Cours.pdf : ${LATER_FORMAT_MESSAGE}`);
  });
});
```

  Dans `files.test.ts:65-68`, l'attendu devient :

```ts
    expect(IMPORT_FILTER).toEqual({
      name: "Images, PDF et documents RoomBoard",
      extensions: ["roomboard", "rbitem", "pdf", "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg", "avif", "heic", "heif"],
    });
```

  (et le titre du test devient « filtre « Importer » : .roomboard, .rbitem, .pdf puis les images d'U33, sans TIFF ni
  RAW (R14, R18, PF3) »). Dans `host-fsa.test.ts:227-231`, l'objet attendu gagne `"application/pdf": [".pdf"],` après
  la ligne `rbitem`. Dans `typed-files.test.ts`, en fin de fichier (importer `PDF_TYPE`) :

```ts
describe("PDF_TYPE (C12)", () => {
  it("PDF exporté : .pdf, application/pdf, filtre « Document PDF » (PF19)", () => {
    expect(PDF_TYPE).toEqual({ extension: ".pdf", mime: "application/pdf", filter: { name: "Document PDF", extensions: ["pdf"] }, accept: ".pdf,application/pdf" });
  });
});
```

- [ ] **Étape 3 : tests rouges de la barre.** Dans `apps/web/src/toolbar.test.ts`, en fin de fichier :

```ts
describe("barre : Exporter en PDF (C12, PF19)", () => {
  it("ACTION_TABLE : export-pdf « Exporter en PDF… »", () => {
    expect(ACTION_TABLE["export-pdf"]?.label).toBe("Exporter en PDF…");
  });
});
```

  Dans `apps/web/src/toolbar-profiles.test.ts`, en fin de fichier (importer `builtinProfile` s'il manque) :

```ts
describe("barre : Exporter en PDF (C12, PF19)", () => {
  it("barre des pages, en bas : « Exporter en PDF… » en dernier dans defaut, simple et annotation ; rien dans la barre du haut", () => {
    for (const id of ["defaut", "simple", "annotation"]) {
      const bars = builtinProfile(id)!.toolbars;
      const pages = bars.find((b) => b.role === "pages")!;
      expect(pages.dock, id).toBe("bottom");
      expect(pages.groups.flatMap((g) => g.items).at(-1), id).toMatchObject({ id: "export-pdf", kind: "action", action: "export-pdf", label: "Exporter en PDF…" });
      expect(bars.filter((b) => b.role !== "pages").flatMap((b) => b.groups.flatMap((g) => g.items)).some((i) => i.id === "export-pdf"), id).toBe(false);
    }
  });
});
```

  Dans `apps/web/src/profile-edit.test.ts:84`, l'attendu devient
  `["page-prev", "page-next", "page-add", "page-remove", "page-insert-file", "export-pdf"]`. Dans
  `apps/web/src/app/toolbar-host.test.ts`, `setup()` : l'objet `t` gagne `exportPdf: vi.fn()` ; en fin de fichier :

```ts
describe("barre : Exporter en PDF (C12, PF19)", () => {
  it("export-pdf → exportPdf()", () => {
    const { t, host } = setup();
    host.runAction("export-pdf");
    expect(vi.mocked((t as unknown as { exportPdf: () => void }).exportPdf)).toHaveBeenCalledTimes(1);
    expect(Object.hasOwn(ACTIONS, "export-pdf")).toBe(true);
  });
  it("sans exportPdf (hôte partiel) : rien, aucune erreur (PC9)", () => {
    const t = { engine: () => ({}), runFile: vi.fn(), importFiles: vi.fn(), toggle: vi.fn(), insertPages: vi.fn(), selection: vi.fn() } as unknown as HostTargets;
    expect(() => createLocalToolbarHost(t, () => BUILTIN_PROFILES[0]!).runAction("export-pdf")).not.toThrow();
  });
});
```

  Commande bornée : rouge.

- [ ] **Étape 4 : reconnaissance et registre.** Dans `apps/web/src/platform/files.ts`, remplacer `:65-68` par :

```ts
/** C12 (PF3, PF19) : extension et type MIME d'un PDF. */
export const PDF_EXTENSION = ".pdf";
export const PDF_MIME = "application/pdf";
/** Extensions offertes par « Importer » (R18, PF3) : le `.roomboard`, l'objet `.rbitem`, le PDF et les images d'U33 que
 *  le registre reconnaît. */
export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg", "avif", "heic", "heif"] as const;
export const IMPORT_EXTENSIONS = ["roomboard", "rbitem", "pdf", ...IMAGE_EXTENSIONS] as const;
export const IMPORT_FILTER = { name: "Images, PDF et documents RoomBoard", extensions: IMPORT_EXTENSIONS } as const;
```

  (garder le commentaire existant au-dessus d'`IMAGE_EXTENSIONS` s'il est séparé ; une seule définition de chaque
  constante). Dans `host-fsa.ts`, importer `PDF_EXTENSION`, `PDF_MIME` de `./files` et ajouter
  `[PDF_MIME]: [PDF_EXTENSION],` après la ligne `[RBITEM_MIME]: [RBITEM_EXTENSION],` ; commentaire au-dessus :
  « documents RoomBoard, PDF (PF3) et images d'U33 ». Dans `typed-files.ts`, importer `PDF_EXTENSION`, `PDF_MIME` de
  `./files`, puis après `RBITEM_TYPE` :

```ts
/** C12 (PF19) : PDF écrit par « Exporter en PDF… » (web : téléchargement ; coque : boîte native filtrée). */
export const PDF_TYPE: FileType = {
  extension: PDF_EXTENSION,
  mime: PDF_MIME,
  filter: { name: "Document PDF", extensions: [PDF_EXTENSION.slice(1)] },
  accept: `${PDF_EXTENSION},${PDF_MIME}`,
};
```

  Dans `import.ts` : en-tête, ajouter la phrase « C12 (PF2, PF3) : `pdf` (document, reconnu par `%PDF-` dans le premier
  Kio) ouvre un nouvel onglet par `openPdf`. » ; `ImportDeps`, après `readSheet` :

```ts
  /** C12 (PF2, PF10) : ouvre un PDF dans un nouvel onglet ; false si refusé (message déjà dit) ; absente : `.pdf`
   *  refusé comme avant. */
  openPdf?(file: { readonly name: string; readonly blob: Blob }): Promise<boolean>;
```

  Après `sheetHandler` :

```ts
/** C12 (PF3) : en-tête `%PDF-`, cherché dans le premier Kio (la norme tolère des octets avant), sans regarder le nom. */
export const PDF_MAGIC: readonly number[] = Object.freeze([0x25, 0x50, 0x44, 0x46, 0x2d]);
export const PDF_HEAD_SCAN = 1024;

export function hasPdfMagic(head: Uint8Array): boolean {
  const last = Math.min(head.length, PDF_HEAD_SCAN) - PDF_MAGIC.length;
  for (let i = 0; i <= last; i++) {
    if (PDF_MAGIC.every((b, k) => head[i + k] === b)) return true;
  }
  return false;
}

/** Entrée `pdf` du registre (C12, PF2, Q1) : document, ouvert dans un nouvel onglet par `openPdf`, qui dit ses refus
 *  (chiffré, illisible, onglets pleins). */
export function pdfHandler(deps: { openPdf(file: { readonly name: string; readonly blob: Blob }): Promise<boolean> }): ImportHandler {
  return {
    id: "pdf",
    nature: "document",
    detect: (head) => hasPdfMagic(head),
    async run(f, ctx) {
      return (await deps.openPdf({ name: f.name, blob: ctx.blob })) ? "opened" : "failed";
    },
  };
}
```

  Dans `createImporter`, le registre devient :

```ts
  const readSheet = deps.readSheet;
  const openPdf = deps.openPdf?.bind(deps);
  const registry: readonly ImportHandler[] = [
    roomboardHandler(deps),
    rbitemHandler(),
    ...(openPdf ? [pdfHandler({ openPdf })] : []),
    imageHandler(deps.decode ? { decode: deps.decode } : {}),
    ...(readSheet ? [sheetHandler({ readSheet })] : []),
  ];
```

  et, juste après le bloc `if (handler === undefined) { … }` :

```ts
        // Onglets pleins (PF10, PC18) : un document suivant reconnu par ses octets (PDF) n'est pas tenté non plus.
        if (handler.nature === "document" && stopped) {
          failed.push(f.name);
          continue;
        }
```

- [ ] **Étape 5 : l'action.** Dans `apps/web/src/toolbar.ts`, `ACTION_TABLE`, après `"page-insert-file"` :
  `"export-pdf": { label: "Exporter en PDF…" },`. Dans `apps/web/src/toolbar-profiles.ts`, `pagesBar`, après
  `action("page-insert-file", "Insérer des pages…"),` : `action("export-pdf", "Exporter en PDF…"),`. Dans
  `apps/web/src/app/toolbar-host.ts`, `HostTargets`, après `insertPages(): void;` :

```ts
  /** C12 (PF19) : « Exporter en PDF… » ; absent (hôte partiel) : sans effet (PC9). */
  exportPdf?(): void;
```

  et dans `ACTIONS`, après `"page-insert-file"` : `"export-pdf": (t) => t.exportPdf?.(),`.

- [ ] **Étape 6 : vert.** La commande bornée ; `tsc` (GC14). Si un test de `src/ui` énumère toute la barre des pages,
  il gagne `export-pdf` en dernier (aucun autre changement d'attendu permis).

- [ ] **Étape 7 : commit.**

```bash
cd "$WT" && for f in apps/web/src/platform/import.ts apps/web/src/platform/import.test.ts apps/web/src/platform/files.ts \
  apps/web/src/platform/files.test.ts apps/web/src/platform/host-fsa.ts apps/web/src/platform/host-fsa.test.ts \
  apps/web/src/platform/typed-files.ts apps/web/src/platform/typed-files.test.ts apps/web/src/toolbar.ts \
  apps/web/src/toolbar.test.ts apps/web/src/toolbar-profiles.ts apps/web/src/toolbar-profiles.test.ts \
  apps/web/src/profile-edit.test.ts apps/web/src/app/toolbar-host.ts apps/web/src/app/toolbar-host.test.ts; do git add "$f"; done && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): recognise dropped PDFs and add the Export as PDF action" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Rapport : N par bloc, noms vus, une ligne `Réutilisation :` par ligne `Réutilise :`.

<a id="tache-t7"></a>

### Tâche T7 — Assemblage de l'export PDF (`pdf-lib`) et producteur PNG

**Objectif.** Un seul export (DAPF3) : `exportPdf(doc, assets, deps)` assemble le PDF par `pdf-lib`, pages dans l'ordre
du document (PF20). Page à fond `pdf-page` : page d'origine recopiée par `copyPages` (texte, vecteurs, annotations
intacts), puis la superposition du contenu RoomBoard posée sur la CropBox en tenant compte de `/Rotate` ; page d'origine
sans contenu : recopiée telle quelle. Autre page : page neuve de 842 pt de large, hauteur
`max(1080, bas du contenu) × 842 / 1920`. Contenu hors du rectangle d'une page PDF : coupé, `cut` vrai. La superposition
vient d'un `OverlayProducer` : ici le producteur PNG (b), qui dessine par `paintContent` à `min(2, 4096 / plus grand
côté)` px par unité (PF21) ; (c) branchera le producteur `krilla` sans toucher l'assemblage.

**Fichiers.**
- Créer : `apps/web/src/app/pdf-export.ts`, `apps/web/src/app/pdf-export.test.ts`, `apps/web/src/app/pdf-overlay.ts`,
  `apps/web/src/app/pdf-overlay.test.ts`

**Interfaces.**
- Consomme : T1 — `PDF_PAGE_KIND`, `PAGE_WIDTH`, `PAGE_HEIGHT` (`core/api.ts`) ; T3 — `pdf-lib` et `pdfjs-dist`
  installés (tests en Node) ; `typed` (`app/container-io.ts:44`), `ImageSource`, `BitmapDecoder`, `BitmapLike`
  (`engine/render/image-cache.ts`), `PageView` (`engine/render/renderer.ts`).
- Produit (lu par T8, T9, T13) :
  - `pdf-export.ts` : `NEW_PAGE_WIDTH = 842`, `PDF_CUT_MESSAGE = "du contenu hors des pages PDF n'est pas exporté"`,
    `type PdfLib = Pick<typeof import("pdf-lib"), "PDFDocument" | "degrees">`,
    `interface ExportBackdrop { asset; kind; page: number | null; rect: Bounds | null }`,
    `interface ExportSource { pageIds(): string[]; elementIds(page: string): string[]; bounds(ids: readonly string[]): Bounds | null; page(id: string): { readonly backdrop: ExportBackdrop | null; readonly grid: { readonly visible: boolean } | null } | null }`
    (un `CoreDocument` s'y branche tel quel),
    `interface OverlayRequest { readonly pageId: string; readonly rect: Bounds; readonly box: { readonly w: number; readonly h: number } }`,
    `type Overlay = { kind: "png"; bytes: Uint8Array } | { kind: "pdf"; bytes: Uint8Array; index: number }`,
    `interface OverlayProducer { pages(requests: readonly OverlayRequest[]): Promise<readonly (Overlay | null)[]> }` (PC6),
    `interface ExportDeps { loadPdfLib(): Promise<PdfLib>; readonly overlay: OverlayProducer }`,
    `interface ExportResult { readonly bytes: Uint8Array; readonly pages: number; readonly cut: boolean; readonly annotated: boolean }`,
    `function quarterOf(angle: number): 0 | 90 | 180 | 270`, `function placement(cropBox: Box4, rotate: number): Placement`,
    `function viewBox(cropBox: Box4, rotate: number): { w: number; h: number }`,
    `async function exportPdf(doc: ExportSource, assets: Pick<AssetStore, "get">, deps: ExportDeps): Promise<ExportResult>`.
  - `pdf-overlay.ts` : `OVERLAY_MAX_PX = 4096`, `OVERLAY_MAX_SCALE = 2`, `overlayScale(rect: Bounds): number`,
    `interface ContentPainter { paintContent(ctx: CanvasRenderingContext2D, page: PageView, rect: Bounds, scale: number): void }`
    (le `Canvas2DRenderer` de T5 s'y branche), `interface ExportCanvas { readonly ctx: CanvasRenderingContext2D; png(): Promise<Uint8Array>; release(): void }`,
    `interface PngOverlayDeps { doc; assets; decode: BitmapDecoder; canvas(w, h): ExportCanvas; painter(ctx, images: ImageSource): ContentPainter }`,
    `async function loadImageSource(doc, assets, decode): Promise<ImageSource & { dispose(): void }>`,
    `function createPngOverlay(deps: PngOverlayDeps): OverlayProducer`, `function browserExportCanvas(w: number, h: number): ExportCanvas`.
- Réutilise : aucun module existant pour assembler le PDF exporté (cadrage § 3, ligne « Assembler le PDF exporté ») —
  nouveau module `app/pdf-export.ts`, interface DAPF3.
- Réutilise : `apps/web/src/engine/render/canvas2d.ts` (`paintContent`, T5) par l'interface `ContentPainter` — même code
  de dessin que l'écran, dans un vrai contexte (b), aucune seconde implémentation (D7).
- Réutilise : `apps/web/src/app/container-io.ts:44` (`typed(blob, mime)`) — type du `Blob` d'une image avant décodage
  (PF28, constat `workspace.ts:151`).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/app/pdf-export.test.ts src/app/pdf-overlay.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -30
```

Attendu : 0 `×` ; « export PDF annoté (PF20, PF21) » ≥ 8 (« pages d'origine sans contenu : recopiées telles quelles… »
(PF20), « S1 : un trait en page 2 : une image superposée en page 2 seulement, texte gardé » (S1), « page tournée de 90° :
superposition dans la boîte vue, texte gardé » (Review Focus 1), « page sans fond PDF : page neuve de 842 pt… » (PF20,
HPF2-3), « contenu sous la page PDF : cut » (Review Focus 4), « page au-delà du PDF d'origine : page neuve » (PC7, Review
Focus 5), « deux sources : chacune chargée une fois » (PF20, S4), « superposition en page PDF (lot c) : /Form » (S5),
« octets stables » (PC16)) ; « placement de la superposition (/Rotate, CropBox) » ≥ 2 (Review Focus 1) ;
« superposition PNG (PF21) » ≥ 3. `tsc` : aucune erreur dans ces quatre fichiers.

**Contraintes (recopiées).**
- GC2 TDD ; aucun test sauté.
- GC3 PATH ; aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && pnpm install --frozen-lockfile`.
- GC6 Preuve bornée : la commande ci-dessus ; N et noms dans le rapport.
- GC7, GC8 Commits fichier par fichier, auteur et message imposés ; interdits git.
- GC11 `pdf-lib` arrive par `deps.loadPdfLib()` (import dynamique dans l'amorce) ; `pdf-export.ts` n'importe `pdf-lib`
  qu'en type ; les tests l'importent directement (Node).
- GC14 `tsc` : aucune erreur dans les quatre fichiers.
- GC15 Une ligne `Réutilisation :` par ligne `Réutilise :`.
- GC17 PDF des tests générés par `pdf-lib` dans le test ; aucun fichier PDF commité.
- GC18, GC19 Aucun processus laissé ; seuls les quatre fichiers ci-dessus.

**Patron à ne pas reprendre.** (1) Poser la superposition à (0, 0) de la MediaBox, dans le repère de la page vue : sur
une page `/Rotate 90` ou à CropBox décalée, l'annotation tombe tournée ou décalée (PF20, Review Focus 1). La projection se
fait sur la CropBox de la page recopiée, rotation comprise (`placement`, `viewBox`). (2) Réécrire la page d'origine en
image (rendu `pdf.js` puis `embedPng`) : le texte et les vecteurs d'origine seraient perdus (U34). Chemin de référence :
`docs/plans/usage-c12-pdf-cadrage.md:64-65` (PF20, PF21) et la table du test « placement » ci-dessous (coins dérivés du
viewport de `pdf.js` : rotation 90 → `u = y − y0`, `v = x − x0`).

**Interdits.** Aucun `import` de valeur depuis `pdf-lib` dans `pdf-export.ts` (type seulement) ; ne pas lire le
document par autre chose qu'`ExportSource` ; aucun message à l'utilisateur ici (l'espace de travail les dit).

**Critère « terminé ».** Commande bornée verte, `tsc` propre sur ces fichiers, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges de l'assemblage.** Créer `apps/web/src/app/pdf-export.test.ts` :

```ts
import { degrees, PDFDict, PDFDocument, PDFName, PDFStream, StandardFonts } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import type { Bounds } from "../core/api";
import { exportPdf, placement, viewBox, type ExportBackdrop, type ExportSource, type OverlayProducer, type OverlayRequest, type PdfLib } from "./pdf-export";

const A = "ab".repeat(32);
const B = "cd".repeat(32);
const PNG_1PX = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
const rectOf = (w: number, h: number): Bounds => ({ x0: 0, y0: 0, x1: 1920, y1: (h * 1920) / w });

async function sourcePdf(o: { pages?: number; rotate?: number; label?: string } = {}): Promise<Uint8Array> {
  const d = await PDFDocument.create();
  const font = await d.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= (o.pages ?? 3); i++) {
    const p = d.addPage([612, 792]);
    p.drawText(`${o.label ?? "RoomBoard page"} ${i}`, { x: 72, y: 700, size: 24, font });
    if (o.rotate !== undefined) p.setRotation(degrees(o.rotate));
  }
  return d.save();
}
interface FakePage { readonly backdrop?: Partial<ExportBackdrop> | null; readonly elements?: number; readonly bounds?: Bounds; readonly grid?: boolean }
function source(pages: readonly FakePage[]): ExportSource {
  const at = (id: string): FakePage | undefined => pages[Number(id.slice(1).split("e")[0])];
  return {
    pageIds: () => pages.map((_, i) => `p${i}`),
    elementIds: (id) => Array.from({ length: at(id)?.elements ?? 0 }, (_, k) => `${id}e${k}`),
    bounds: (ids) => (ids[0] === undefined ? null : (at(ids[0])?.bounds ?? { x0: 100, y0: 100, x1: 200, y1: 200 })),
    page: (id) => {
      const p = at(id);
      if (p === undefined) return null;
      const backdrop = p.backdrop === undefined || p.backdrop === null ? null : { asset: A, kind: "pdf-page", page: 0, rect: rectOf(612, 792), ...p.backdrop };
      return { backdrop, grid: p.grid === true ? { visible: true } : null };
    },
  };
}
const store = (files: Record<string, Uint8Array>) => ({ get: (id: string) => (files[id] === undefined ? undefined : new Blob([files[id]])) });
const pngProducer = (seen: OverlayRequest[] = []): OverlayProducer => ({
  pages: async (reqs) => {
    seen.push(...reqs);
    return reqs.map(() => ({ kind: "png" as const, bytes: PNG_1PX }));
  },
});
const lib = (): PdfLib & { loads: () => number } => {
  const load = vi.fn((bytes: Uint8Array, o?: Parameters<typeof PDFDocument.load>[1]) => PDFDocument.load(bytes, o));
  const PDF = { create: (o?: Parameters<typeof PDFDocument.create>[0]) => PDFDocument.create(o), load } as unknown as PdfLib["PDFDocument"];
  return { PDFDocument: PDF, degrees, loads: () => load.mock.calls.length };
};
async function xobjects(bytes: Uint8Array): Promise<string[][]> {
  const d = await PDFDocument.load(bytes);
  return d.getPages().map((p) => {
    const xo = p.node.Resources()?.lookupMaybe(PDFName.of("XObject"), PDFDict);
    return xo === undefined ? [] : xo.keys().map((k) => String(xo.lookup(k, PDFStream).dict.get(PDFName.of("Subtype"))));
  });
}
async function sizes(bytes: Uint8Array): Promise<number[][]> {
  return (await PDFDocument.load(bytes)).getPages().map((p) => [p.getWidth(), p.getHeight()].map((v) => Math.round(v * 1000) / 1000));
}
async function texts(bytes: Uint8Array): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const c = await (await doc.getPage(i)).getTextContent();
    out.push(c.items.map((it) => ("str" in it ? it.str : "")).join(""));
  }
  await doc.destroy();
  return out;
}
const pdfPages = (n: number, extra: (i: number) => Partial<FakePage> = () => ({})): FakePage[] =>
  Array.from({ length: n }, (_, i) => ({ backdrop: { page: i }, ...extra(i) }));

describe("export PDF annoté (PF20, PF21)", () => {
  it("pages d'origine sans contenu : recopiées telles quelles, aucune superposition demandée, texte gardé", async () => {
    const produce = vi.fn(async () => []);
    const r = await exportPdf(source(pdfPages(3)), store({ [A]: await sourcePdf() }), { loadPdfLib: async () => lib(), overlay: { pages: produce } });
    expect([r.pages, r.cut, r.annotated]).toEqual([3, false, true]);
    expect(produce).not.toHaveBeenCalled();
    expect(await xobjects(r.bytes)).toEqual([[], [], []]);
    expect(await texts(r.bytes)).toEqual(["RoomBoard page 1", "RoomBoard page 2", "RoomBoard page 3"]);
  });

  it("S1 : un trait en page 2 : une image superposée en page 2 seulement, texte « RoomBoard page 2 » gardé", async () => {
    const seen: OverlayRequest[] = [];
    const r = await exportPdf(source(pdfPages(3, (i) => (i === 1 ? { elements: 1 } : {}))), store({ [A]: await sourcePdf() }), { loadPdfLib: async () => lib(), overlay: pngProducer(seen) });
    expect(seen).toEqual([{ pageId: "p1", rect: rectOf(612, 792), box: { w: 612, h: 792 } }]);
    expect(await xobjects(r.bytes)).toEqual([[], ["/Image"], []]);
    expect((await texts(r.bytes))[1]).toBe("RoomBoard page 2");
  });

  it("page tournée de 90° : boîte vue 792 × 612, superposition dans la boîte vue, texte gardé (Review Focus 1)", async () => {
    const seen: OverlayRequest[] = [];
    const doc = source([{ backdrop: { page: 0, rect: rectOf(792, 612) }, elements: 1, bounds: { x0: 10, y0: 10, x1: 20, y1: 20 } }]);
    const r = await exportPdf(doc, store({ [A]: await sourcePdf({ pages: 1, rotate: 90 }) }), { loadPdfLib: async () => lib(), overlay: pngProducer(seen) });
    expect(seen[0]?.box).toEqual({ w: 792, h: 612 });
    expect(await xobjects(r.bytes)).toEqual([["/Image"]]);
    expect(await texts(r.bytes)).toEqual(["RoomBoard page 1"]);
    expect(r.cut).toBe(false);
  });

  it("page sans fond PDF : page neuve de 842 pt, hauteur max(1080, bas du contenu) × 842 / 1920 ; pas « annoté » (PF20, HPF2-3)", async () => {
    const seen: OverlayRequest[] = [];
    const r = await exportPdf(source([{}, { elements: 2, bounds: { x0: 0, y0: 0, x1: 300, y1: 2000 } }]), store({}), { loadPdfLib: async () => lib(), overlay: pngProducer(seen) });
    expect(await sizes(r.bytes)).toEqual([
      [842, 473.625],
      [842, Math.round(((2000 * 842) / 1920) * 1000) / 1000],
    ]);
    expect(seen).toEqual([{ pageId: "p1", rect: { x0: 0, y0: 0, x1: 1920, y1: 2000 }, box: { w: 842, h: (2000 * 842) / 1920 } }]);
    expect([r.annotated, r.cut]).toEqual([false, false]);
  });

  it("contenu sous la page PDF : cut ; contenu dans la page : pas cut (PF20, Review Focus 4)", async () => {
    const pdf = await sourcePdf({ pages: 1 });
    const out = await exportPdf(source([{ backdrop: { page: 0 }, elements: 1, bounds: { x0: 100, y0: 2400, x1: 200, y1: 2600 } }]), store({ [A]: pdf }), { loadPdfLib: async () => lib(), overlay: pngProducer() });
    const inside = await exportPdf(source([{ backdrop: { page: 0 }, elements: 1 }]), store({ [A]: pdf }), { loadPdfLib: async () => lib(), overlay: pngProducer() });
    expect([out.cut, inside.cut]).toEqual([true, false]);
  });

  it("page au-delà du PDF d'origine (page 7 d'un PDF de 3) : page neuve, aucune erreur (PC7, Review Focus 5)", async () => {
    const r = await exportPdf(source([{ backdrop: { page: 7 } }]), store({ [A]: await sourcePdf() }), { loadPdfLib: async () => lib(), overlay: pngProducer() });
    expect(await sizes(r.bytes)).toEqual([[842, 473.625]]);
    expect(r.annotated).toBe(false);
  });

  it("deux sources (pages insérées) : chacune chargée une fois ; pages dans l'ordre du document (PF20, S4)", async () => {
    const l = lib();
    const doc = source([{ backdrop: { page: 0 } }, { backdrop: { asset: B, page: 0 } }, { backdrop: { page: 1 } }]);
    const r = await exportPdf(doc, store({ [A]: await sourcePdf(), [B]: await sourcePdf({ pages: 1, label: "Autre page" }) }), { loadPdfLib: async () => l, overlay: pngProducer() });
    expect(l.loads()).toBe(2);
    expect(await texts(r.bytes)).toEqual(["RoomBoard page 1", "Autre page 1", "RoomBoard page 2"]);
  });

  it("superposition en page PDF (lot c) : posée comme page embarquée (/Form) ; mêmes octets chargés une fois (S5)", async () => {
    const overlay = await PDFDocument.create();
    // pdf-lib refuse d'embarquer une page sans flux de contenu (MissingPageContentsEmbeddingError) : un trait par page.
    for (let k = 0; k < 2; k++) overlay.addPage([612, 792]).drawRectangle({ x: 10, y: 10, width: 5, height: 5 });
    const bytes = await overlay.save();
    const l = lib();
    const producer: OverlayProducer = { pages: async (reqs) => reqs.map((_, k) => ({ kind: "pdf" as const, bytes, index: k })) };
    const r = await exportPdf(source(pdfPages(2, () => ({ elements: 1 }))), store({ [A]: await sourcePdf({ pages: 2 }) }), { loadPdfLib: async () => l, overlay: producer });
    expect(await xobjects(r.bytes)).toEqual([["/Form"], ["/Form"]]);
    expect(l.loads()).toBe(2);
  });

  it("octets stables : deux exports du même document donnent les mêmes octets (PC16)", async () => {
    const pdf = await sourcePdf();
    const run = async () => (await exportPdf(source(pdfPages(3, (i) => (i === 1 ? { elements: 1 } : {}))), store({ [A]: pdf }), { loadPdfLib: async () => lib(), overlay: pngProducer() })).bytes;
    expect(Array.from(await run())).toEqual(Array.from(await run()));
  });
});

describe("placement de la superposition (/Rotate, CropBox)", () => {
  const cb = { x: 10, y: 20, width: 600, height: 800 };
  it("coin et rotation pour /Rotate 0, 90, 180, 270 sur une CropBox décalée ; angles ramenés au quart (Review Focus 1)", () => {
    expect([0, 90, 180, 270, -90, 450].map((r) => placement(cb, r))).toEqual([
      { x: 10, y: 20, rotate: 0 },
      { x: 610, y: 20, rotate: 90 },
      { x: 610, y: 820, rotate: 180 },
      { x: 10, y: 820, rotate: 270 },
      { x: 10, y: 820, rotate: 270 },
      { x: 610, y: 20, rotate: 90 },
    ]);
  });
  it("boîte vue : largeur et hauteur échangées à 90° et 270°", () => {
    expect([0, 90, 180, 270].map((r) => viewBox(cb, r))).toEqual([
      { w: 600, h: 800 },
      { w: 800, h: 600 },
      { w: 600, h: 800 },
      { w: 800, h: 600 },
    ]);
  });
});
```

  (Dans « superposition en page PDF », `loads()` vaut 2 : la source une fois, la superposition une fois.) Commande
  bornée : rouge (module absent).

- [ ] **Étape 3 : l'assemblage.** Créer `apps/web/src/app/pdf-export.ts` :

```ts
/**
 * Export PDF (C12, PF20, PF21, DAPF3) : un seul export, assemblé par `pdf-lib` (chargé au premier export par
 * `deps.loadPdfLib`). Pages dans l'ordre du document. Page à fond `pdf-page` : la page d'origine recopiée
 * (`copyPages` : flux, polices, texte, annotations intacts), puis la superposition du contenu RoomBoard posée sur la
 * CropBox en tenant compte de /Rotate ; sans contenu, recopiée telle quelle. Autre page (ou indice au-delà du PDF
 * d'origine, PC7) : page neuve de 842 pt de large, hauteur max(1080, bas du contenu) × 842 / 1920. La superposition
 * vient d'un producteur interchangeable : PNG (b, `pdf-overlay.ts`) ou page vectorielle `krilla` (c).
 */
import type { PDFDocument, PDFPage } from "pdf-lib";
import { PAGE_HEIGHT, PAGE_WIDTH, PDF_PAGE_KIND, type Bounds } from "../core/api";
import type { AssetStore } from "../core/asset-store";

export const NEW_PAGE_WIDTH = 842;
export const PDF_CUT_MESSAGE = "du contenu hors des pages PDF n'est pas exporté";

export type PdfLib = Pick<typeof import("pdf-lib"), "PDFDocument" | "degrees">;

/** Ce que l'export lit d'un fond et d'un document : un `CoreDocument` s'y branche tel quel. */
export interface ExportBackdrop {
  readonly asset: string;
  readonly kind: string;
  readonly page: number | null;
  readonly rect: Bounds | null;
}
export interface ExportSource {
  pageIds(): string[];
  elementIds(page: string): string[];
  bounds(ids: readonly string[]): Bounds | null;
  page(id: string): { readonly backdrop: ExportBackdrop | null; readonly grid: { readonly visible: boolean } | null } | null;
}
/** Superposition demandée : rectangle monde exporté, boîte vue (points, après /Rotate) où la poser. */
export interface OverlayRequest {
  readonly pageId: string;
  readonly rect: Bounds;
  readonly box: { readonly w: number; readonly h: number };
}
export type Overlay = { readonly kind: "png"; readonly bytes: Uint8Array } | { readonly kind: "pdf"; readonly bytes: Uint8Array; readonly index: number };
/** Producteur interchangeable (DAPF3, PC6) : une réponse par requête, dans l'ordre ; null : rien à poser. */
export interface OverlayProducer {
  pages(requests: readonly OverlayRequest[]): Promise<readonly (Overlay | null)[]>;
}
export interface ExportDeps {
  loadPdfLib(): Promise<PdfLib>;
  readonly overlay: OverlayProducer;
}
export interface ExportResult {
  readonly bytes: Uint8Array;
  readonly pages: number;
  /** Du contenu sortait d'une page PDF et a été coupé (PF20). */
  readonly cut: boolean;
  /** Au moins une page d'origine recopiée : nom `<base> annoté.pdf` (PF19). */
  readonly annotated: boolean;
}

export type Quarter = 0 | 90 | 180 | 270;
export interface Box4 {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
export interface Placement {
  readonly x: number;
  readonly y: number;
  readonly rotate: Quarter;
}

/** /Rotate ramené à 0, 90, 180 ou 270 (sens horaire, multiple de 90). */
export const quarterOf = (angle: number): Quarter => ((((Math.round(angle / 90) * 90) % 360) + 360) % 360) as Quarter;

/** Taille de la page vue (points) : CropBox, largeur et hauteur échangées à 90° et 270°. */
export function viewBox(cropBox: Box4, rotate: number): { w: number; h: number } {
  const q = quarterOf(rotate);
  return q === 90 || q === 270 ? { w: cropBox.height, h: cropBox.width } : { w: cropBox.width, h: cropBox.height };
}

/**
 * Coin bas gauche et rotation (sens trigonométrique, `drawImage` / `drawPage` de pdf-lib) d'une superposition dessinée
 * dans le repère de la page vue, posée sur une page tournée de `rotate` (/Rotate, sens horaire). Viewport de pdf.js :
 * 0° u = x − x0, v = y1 − y ; 90° u = y − y0, v = x − x0 ; 180° u = x1 − x, v = y − y0 ; 270° u = y1 − y, v = x1 − x.
 */
export function placement(cropBox: Box4, rotate: number): Placement {
  const { x, y, width, height } = cropBox;
  const q = quarterOf(rotate);
  if (q === 90) return { x: x + width, y, rotate: 90 };
  if (q === 180) return { x: x + width, y: y + height, rotate: 180 };
  if (q === 270) return { x, y: y + height, rotate: 270 };
  return { x, y, rotate: 0 };
}

interface Plan {
  readonly id: string;
  readonly source: { readonly asset: string; readonly index: number } | null;
  readonly rect: Bounds;
  readonly content: boolean;
  readonly bounds: Bounds | null;
}

const outside = (b: Bounds, r: Bounds): boolean => b.x0 < r.x0 || b.y0 < r.y0 || b.x1 > r.x1 || b.y1 > r.y1;

export async function exportPdf(doc: ExportSource, assets: Pick<AssetStore, "get">, deps: ExportDeps): Promise<ExportResult> {
  const lib = await deps.loadPdfLib();
  const sources = new Map<string, PDFDocument>();
  const sourceOf = async (asset: string): Promise<PDFDocument> => {
    const hit = sources.get(asset);
    if (hit !== undefined) return hit;
    const blob = assets.get(asset);
    if (blob === undefined) throw new Error(`PDF d'origine absent (${asset})`);
    const src = await lib.PDFDocument.load(new Uint8Array(await blob.arrayBuffer()), { updateMetadata: false });
    sources.set(asset, src);
    return src;
  };

  const plans: Plan[] = [];
  for (const id of doc.pageIds()) {
    const view = doc.page(id);
    const ids = doc.elementIds(id);
    const bounds = ids.length > 0 ? doc.bounds(ids) : null;
    const b = view?.backdrop ?? null;
    let source: Plan["source"] = null;
    if (b !== null && b.kind === PDF_PAGE_KIND && b.page !== null && b.rect !== null && b.page < (await sourceOf(b.asset)).getPageCount()) {
      source = { asset: b.asset, index: b.page };
    }
    const rect = source !== null && b?.rect ? b.rect : { x0: 0, y0: 0, x1: PAGE_WIDTH, y1: Math.max(PAGE_HEIGHT, bounds?.y1 ?? 0) };
    plans.push({ id, source, rect, content: ids.length > 0 || view?.grid?.visible === true, bounds });
  }

  const out = await lib.PDFDocument.create({ updateMetadata: false });
  const pages: PDFPage[] = [];
  const requests: OverlayRequest[] = [];
  const requestOf = new Map<number, number>();
  for (const [k, p] of plans.entries()) {
    let page: PDFPage;
    if (p.source !== null) {
      const [copied] = await out.copyPages(await sourceOf(p.source.asset), [p.source.index]);
      if (copied === undefined) throw new Error(`page ${p.source.index + 1} illisible dans le PDF d'origine`);
      page = out.addPage(copied);
    } else {
      page = out.addPage([NEW_PAGE_WIDTH, ((p.rect.y1 - p.rect.y0) * NEW_PAGE_WIDTH) / PAGE_WIDTH]);
    }
    pages.push(page);
    if (p.content) {
      requestOf.set(k, requests.length);
      requests.push({ pageId: p.id, rect: p.rect, box: viewBox(page.getCropBox(), page.getRotation().angle) });
    }
  }

  const overlays = requests.length > 0 ? await deps.overlay.pages(requests) : [];
  const embedded = new Map<Uint8Array, PDFDocument>();
  for (const [k, page] of pages.entries()) {
    const i = requestOf.get(k);
    if (i === undefined) continue;
    const o = overlays[i] ?? null;
    const r = requests[i];
    if (o === null || r === undefined) continue;
    const at = placement(page.getCropBox(), page.getRotation().angle);
    const where = { x: at.x, y: at.y, width: r.box.w, height: r.box.h, rotate: lib.degrees(at.rotate) };
    if (o.kind === "png") {
      page.drawImage(await out.embedPng(o.bytes), where);
    } else {
      let src = embedded.get(o.bytes);
      if (src === undefined) {
        src = await lib.PDFDocument.load(o.bytes, { updateMetadata: false });
        embedded.set(o.bytes, src);
      }
      page.drawPage(await out.embedPage(src.getPage(o.index)), where);
    }
  }
  return {
    bytes: await out.save({ useObjectStreams: false }),
    pages: pages.length,
    cut: plans.some((p) => p.source !== null && p.bounds !== null && outside(p.bounds, p.rect)),
    annotated: plans.some((p) => p.source !== null),
  };
}
```

  Commande bornée (partie `pdf-export.test.ts`) : verte.

- [ ] **Étape 4 : tests rouges du producteur PNG.** Créer `apps/web/src/app/pdf-overlay.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import type { AssetInfo, Bounds } from "../core/api";
import type { ImageSource } from "../engine/render/image-cache";
import type { PageView } from "../engine/render/renderer";
import { createPngOverlay, overlayScale, type ExportCanvas } from "./pdf-overlay";

const IMG = "ab".repeat(32);
const PDF = "cd".repeat(32);
const info = (id: string, mime: string): AssetInfo => ({ id, name: id, mime, size: 3 });

describe("superposition PNG (PF21)", () => {
  it("échelle : min(2, 4096 / plus grand côté)", () => {
    expect([overlayScale({ x0: 0, y0: 0, x1: 1920, y1: 1080 }), overlayScale({ x0: 0, y0: 0, x1: 1920, y1: 2715 }), overlayScale({ x0: 0, y0: 0, x1: 1920, y1: 40000 })]).toEqual([2, 4096 / 2715, 4096 / 40000]);
  });

  it("une PNG par requête : toile de rect × échelle, paintContent(page, rect, échelle), toile libérée", async () => {
    const made: number[][] = [];
    const released: number[] = [];
    const painted: unknown[][] = [];
    const producer = createPngOverlay({
      doc: { elementIds: (p) => [`${p}-a`], citedAssets: () => [] },
      assets: { get: () => undefined },
      decode: vi.fn(),
      canvas: (w, h): ExportCanvas => {
        made.push([w, h]);
        const n = made.length;
        return { ctx: { n } as unknown as CanvasRenderingContext2D, png: async () => new Uint8Array([n]), release: () => void released.push(n) };
      },
      painter: () => ({ paintContent: (ctx: CanvasRenderingContext2D, page: PageView, rect: Bounds, scale: number) => void painted.push([(ctx as unknown as { n: number }).n, page, rect, scale]) }),
    });
    const rect = { x0: 0, y0: 0, x1: 1920, y1: 2715 };
    const out = await producer.pages([{ pageId: "p2", rect, box: { w: 612, h: 865 } }]);
    const s = 4096 / 2715;
    expect(made).toEqual([[Math.round(1920 * s), 4096]]);
    expect(painted).toEqual([[1, { id: "p2", elementIds: ["p2-a"] }, rect, s]]);
    expect(out).toEqual([{ kind: "png", bytes: new Uint8Array([1]) }]);
    expect(released).toEqual([1]);
  });

  it("images du document décodées avant le dessin, fermées après ; asset non image ignoré ; décodage en échec : cadre gris, aucune erreur", async () => {
    const close = vi.fn();
    const bmp = { close } as unknown as ImageBitmap;
    const decode = vi.fn(async (b: Blob) => (b.type === "image/png" ? bmp : Promise.reject(new Error("illisible"))));
    let seen: ImageSource | null = null;
    const producer = createPngOverlay({
      doc: { elementIds: () => [], citedAssets: () => [info(IMG, "image/png"), info(PDF, "application/pdf"), info("ef".repeat(32), "image/jpeg")] },
      assets: { get: () => new Blob([new Uint8Array([1])]) },
      decode,
      canvas: () => ({ ctx: {} as CanvasRenderingContext2D, png: async () => new Uint8Array(), release: () => undefined }),
      painter: (_ctx, images) => {
        seen = images;
        return { paintContent: () => undefined };
      },
    });
    await producer.pages([{ pageId: "p", rect: { x0: 0, y0: 0, x1: 1920, y1: 1080 }, box: { w: 842, h: 473.625 } }]);
    expect(decode.mock.calls.map((c) => c[0].type)).toEqual(["image/png", "image/jpeg"]);
    expect(seen).not.toBeNull();
    expect(close).toHaveBeenCalledTimes(1);
  });
});
```

  Commande bornée : rouge pour ce fichier.

- [ ] **Étape 5 : le producteur PNG.** Créer `apps/web/src/app/pdf-overlay.ts` :

```ts
/**
 * Producteur PNG de la superposition (C12, PF21, lot b) : le contenu de chaque page (grille et éléments) dessiné par
 * `paintContent` du rendu Canvas 2D (même code que l'écran, D7) dans une toile de rect × échelle, échelle
 * min(2, 4096 / plus grand côté) px par unité, puis encodé en PNG. Les images du document sont décodées avant le dessin
 * (le cache de la scène, asynchrone, dessinerait des cadres gris) et fermées après.
 */
import type { Bounds, CoreDocument } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import type { BitmapDecoder, BitmapLike, ImageSource } from "../engine/render/image-cache";
import type { PageView } from "../engine/render/renderer";
import { typed } from "./container-io";
import type { Overlay, OverlayProducer } from "./pdf-export";

export const OVERLAY_MAX_PX = 4096;
export const OVERLAY_MAX_SCALE = 2;

export const overlayScale = (rect: Bounds): number =>
  Math.min(OVERLAY_MAX_SCALE, OVERLAY_MAX_PX / Math.max(rect.x1 - rect.x0, rect.y1 - rect.y0));

/** Le `Canvas2DRenderer` (T5) s'y branche tel quel. */
export interface ContentPainter {
  paintContent(ctx: CanvasRenderingContext2D, page: PageView, rect: Bounds, scale: number): void;
}
export interface ExportCanvas {
  readonly ctx: CanvasRenderingContext2D;
  png(): Promise<Uint8Array>;
  release(): void;
}
export interface PngOverlayDeps {
  readonly doc: Pick<CoreDocument, "elementIds" | "citedAssets">;
  readonly assets: Pick<AssetStore, "get">;
  readonly decode: BitmapDecoder;
  canvas(w: number, h: number): ExportCanvas;
  painter(ctx: CanvasRenderingContext2D, images: ImageSource): ContentPainter;
}

/** Bitmaps des images citées (type `image/*` seulement), décodés d'avance ; un échec laisse le cadre gris. */
export async function loadImageSource(
  doc: Pick<CoreDocument, "citedAssets">,
  assets: Pick<AssetStore, "get">,
  decode: BitmapDecoder,
): Promise<ImageSource & { dispose(): void }> {
  const done = new Map<string, BitmapLike>();
  for (const a of doc.citedAssets()) {
    if (!a.mime.startsWith("image/")) continue;
    const blob = assets.get(a.id);
    if (blob === undefined) continue;
    try {
      done.set(a.id, await decode(typed(blob, a.mime)));
    } catch (e) {
      console.warn(`RoomBoard : image ${a.id} non exportée (${e instanceof Error ? e.message : String(e)})`);
    }
  }
  return {
    bitmap: (id) => done.get(id) ?? null,
    dispose() {
      for (const b of done.values()) b.close?.();
      done.clear();
    },
  };
}

export function createPngOverlay(deps: PngOverlayDeps): OverlayProducer {
  return {
    async pages(requests) {
      const images = await loadImageSource(deps.doc, deps.assets, deps.decode);
      try {
        const out: Overlay[] = [];
        for (const r of requests) {
          const scale = overlayScale(r.rect);
          const w = Math.max(1, Math.round((r.rect.x1 - r.rect.x0) * scale));
          const h = Math.max(1, Math.round((r.rect.y1 - r.rect.y0) * scale));
          const c = deps.canvas(w, h);
          try {
            deps.painter(c.ctx, images).paintContent(c.ctx, { id: r.pageId, elementIds: deps.doc.elementIds(r.pageId) }, r.rect, scale);
            out.push({ kind: "png", bytes: await c.png() });
          } finally {
            c.release();
          }
        }
        return out;
      } finally {
        images.dispose();
      }
    },
  };
}

/** Toile du navigateur : `toBlob("image/png")`, libérée en remettant sa taille à 0 (mémoire de l'iPad). */
export function browserExportCanvas(w: number, h: number): ExportCanvas {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("canvas 2D indisponible");
  return {
    ctx,
    png: () =>
      new Promise<Uint8Array>((ok, ko) =>
        canvas.toBlob((b) => (b === null ? ko(new Error("PNG impossible")) : void b.arrayBuffer().then((a) => ok(new Uint8Array(a)), ko)), "image/png"),
      ),
    release() {
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}
```

  (Le test attend `[Math.round(1920 * s), 4096]` : `Math.round(2715 × 4096 / 2715)` vaut 4096.)

- [ ] **Étape 6 : vert.** La commande bornée ;
  `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep -E "pdf-(export|overlay)"` (rien). Un test de texte
  qui échoue sur l'avertissement « standardFontDataUrl » de `pdf.js` en Node reste vert : seul le texte compte.

- [ ] **Étape 7 : commit.**

```bash
cd "$WT" && for f in apps/web/src/app/pdf-export.ts apps/web/src/app/pdf-export.test.ts apps/web/src/app/pdf-overlay.ts \
  apps/web/src/app/pdf-overlay.test.ts; do git add "$f"; done && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): assemble annotated PDF export with pdf-lib and a PNG overlay" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Rapport : N par bloc, noms vus, une ligne `Réutilisation :` par ligne `Réutilise :`.

<a id="tache-t8"></a>

### Tâche T8 — Espace de travail : ouvrir un PDF en onglet, exporter en PDF

**Objectif.** `Workspace.openPdf` (PF2, PF7 à PF10, Q1) : onglets pleins → `TOO_MANY_TABS` ; le PDF est ouvert par le
moteur PDF (chiffré → « <nom> : PDF chiffré, non pris en charge », PF8) ; les tailles des 500 premières pages sont lues
(au-delà : avis « <nom> : 500 premières pages importées sur N », PF7) ; les octets vont dans le magasin du nouvel onglet
(`application/pdf`, nom d'origine) ; `core.fromPdfPages` construit le document ; l'onglet s'appelle
`<nom sans .pdf>.roomboard`, cible nulle (Enregistrer demande où, jamais sur le PDF, U1) ; le `PdfFile` de l'import est
détruit (PC11). `Workspace.exportPdf` (PF19 à PF21) : une seule exportation à la fois (« Opération en cours »), asset
absent → `UNREAD_ASSETS_MESSAGE`, assemblage par `exportPdf` (T7) avec le producteur de l'onglet, avis du contenu coupé,
écriture par `pdfFiles` sous `<base> annoté.pdf` ou `<base>.pdf`, avis « PDF exporté (N pages) ».

**Fichiers.**
- Modifier : `apps/web/src/app/workspace.ts:9-34` (imports), `:45-73` (`WorkspaceDeps`), `:75-110` (`Workspace`),
  après `:37` (messages), `:256-268` (`createImporter`), `:270-372` (méthodes de `ws`)
- Modifier : `apps/web/src/app/workspace.test.ts` (`SetupOptions`, `setupWorkspace`, bloc neuf en fin)
- Modifier : `apps/web/src/ui/App.test.tsx:122-146` (`fakeWorkspace` : `openPdf`, `exportPdf`)

**Interfaces.**
- Consomme : T1 — `PDF_MAX_PAGES` ; T2 — `CoreFactory.fromPdfPages`, `PdfPageSize` ; T3 — `PdfEncryptedError`,
  `PDF_ENCRYPTED_MESSAGE` (`platform/pdf-render.ts`) ; T4 — `PdfEngine`, `PdfFile` (`engine/render/pdf-port.ts`) ;
  T6 — `ImportDeps.openPdf`, `PDF_EXTENSION`, `PDF_MIME` (`platform/files.ts`) ; T7 — `exportPdf`, `PDF_CUT_MESSAGE`,
  `OverlayProducer`, `PdfLib` (`app/pdf-export.ts`).
- Produit (lu par T9, T13) :
  - `WorkspaceDeps.pdf?: PdfEngine`, `WorkspaceDeps.pdfFiles?: TypedFiles`, `WorkspaceDeps.loadPdfLib?(): Promise<PdfLib>`,
    `WorkspaceDeps.overlay?(tab: TabSession): OverlayProducer`.
  - `Workspace.openPdf(file: { readonly name: string; readonly blob: Blob }): Promise<boolean>`,
    `Workspace.exportPdf(): Promise<boolean>`.
  - Messages : `PDF_NO_PAGE_MESSAGE = "PDF sans page"`, `BUSY_MESSAGE = "Opération en cours"`,
    `pdfFirstPagesMessage(name: string, total: number): string`, `pdfExportedMessage(pages: number): string`,
    `exportPdfName(tabName: string, annotated: boolean): string`.
- Réutilise : `apps/web/src/app/workspace.ts:205` (`addTab`) — `addTab(doc, { name, target: null }, assets)`, appelée
  telle quelle pour l'onglet du PDF.
- Réutilise : `apps/web/src/core/asset-store.ts` (`put`) — `assets.put(blob)` dans le magasin neuf de l'onglet.
- Réutilise : `apps/web/src/platform/host-tauri.ts` (`baseName`) — nom sans chemin dans les avis et le titre.
- Réutilise : `apps/web/src/app/container-io.ts:44` (`typed`), `:45` (`missingOf`) — type `application/pdf` du `Blob`
  (PF28) ; asset absent avant l'export.
- Réutilise : `apps/web/src/platform/import.ts:167` (`createImporter`) — reçoit `openPdf: (f) => ws.openPdf(f)` quand
  `deps.pdf` est donné.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/app/workspace.test.ts src/ui/App.test.tsx --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | grep -E "C12|×|FAIL|Test Files|Tests " | tail -40
```

Attendu : 0 `×` ; « espace de travail : PDF (C12) » ≥ 10 tests (« S1 : PDF déposé : nouvel onglet… » (S1, PF10),
« Enregistrer demande où… » (U1, PF10), « PDF chiffré : avis, aucun onglet » (S2, Review Focus 2), « 501 pages… » (S2,
PF7), « PDF illisible ou sans page… », « onglets pleins… » (PF10), « web : PDF de 120 Mo refusé avant lecture » (S2,
PF9), « export S1 : Cours annoté.pdf… » (S1, PF19, PF20), « export sans PDF : Sans titre.pdf, 1 page » (PF19, PC10),
« export : asset absent » (PF20), « export : un seul à la fois » (PF19), « export : contenu sous la page PDF : avis »
(Review Focus 4), « sans port : faux, sans avis »). Tests à garder verts : blocs « conteneur, repli et images », « C3 »,
« tableau collé et classeur (C10b) » — `Test Files` sans échec. `tsc` vide (GC14).

**Contraintes (recopiées).**
- GC2 TDD ; aucun test sauté.
- GC3 PATH ; aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && pnpm install --frozen-lockfile` et copie des modules Wasm de la référence (GC4).
- GC5 `tsc` lit `fromPdfPages` dans `core/api.ts` (T2) : aucun module Wasm à reconstruire ici (les tests prennent
  `fakeCore`).
- GC6 Preuve bornée : la commande ci-dessus ; N et noms dans le rapport.
- GC7, GC8 Commits fichier par fichier, auteur et message imposés ; interdits git.
- GC11 L'espace de travail ne charge ni `pdf.js` ni `pdf-lib` : il reçoit `pdf` et `loadPdfLib` de l'amorce.
- GC13 Messages en français, tels qu'écrits ci-dessous.
- GC14 `tsc` vide.
- GC15 Une ligne `Réutilisation :` par ligne `Réutilise :`.
- GC17 Le PDF de l'essai d'export est généré par `pdf-lib` dans le test.
- GC18, GC19 Aucun processus laissé ; seuls les trois fichiers ci-dessus.

**Interdits.** Ne pas passer le PDF par `ImageTarget` ni par `io.read` ; ne jamais écrire le `.pdf` d'origine (U1) ; ne
pas toucher `openDocument`, `insertPages` ni `exportSelection`.

**Critère « terminé ».** Commande bornée verte, `tsc` vide, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges.** Dans `apps/web/src/app/workspace.test.ts` : imports en plus —
  `import { PDFDocument, StandardFonts } from "pdf-lib";`, `import type { PdfEngine, PdfFile, TileBitmap } from "../engine/render/pdf-port";`,
  `import { PdfEncryptedError } from "../platform/pdf-render";`, `import type { OverlayProducer, OverlayRequest } from "./pdf-export";`,
  `import { MAX_TABS } from "./tabs";` (à côté de `TOO_MANY_TABS`) ; `SetupOptions` gagne
  `readonly pdf?: WorkspaceDeps["pdf"]; readonly pdfFiles?: WorkspaceDeps["pdfFiles"]; readonly loadPdfLib?: WorkspaceDeps["loadPdfLib"]; readonly overlay?: WorkspaceDeps["overlay"];`
  et l'appel de `createWorkspace` dans `setupWorkspace` gagne, après la ligne `itemFiles` :

```ts
    ...(o.pdf ? { pdf: o.pdf } : {}),
    ...(o.pdfFiles ? { pdfFiles: o.pdfFiles } : {}),
    ...(o.loadPdfLib ? { loadPdfLib: o.loadPdfLib } : {}),
    ...(o.overlay ? { overlay: o.overlay } : {}),
```

  Puis, en fin de fichier :

```ts
describe("espace de travail : PDF (C12)", () => {
  const PDF_HEAD = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a]);
  const PNG_1PX = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
  function fakePdf(o: { pages?: number; encrypted?: boolean; fail?: string; size?: (i: number) => { w: number; h: number } } = {}) {
    const destroy = vi.fn();
    const pageSize = vi.fn(async (i: number) => (o.size ?? (() => ({ w: 612, h: 792 })))(i));
    const open = vi.fn(async (_b: Blob): Promise<PdfFile> => {
      if (o.encrypted === true) throw new PdfEncryptedError();
      if (o.fail !== undefined) throw new Error(o.fail);
      return { pageCount: o.pages ?? 3, pageSize, renderTile: async () => ({}) as TileBitmap, destroy };
    });
    return { engine: { open } satisfies PdfEngine, open, destroy, pageSize };
  }
  const drop = (name: string, bytes: Uint8Array<ArrayBuffer> = PDF_HEAD, size = bytes.byteLength): DroppedFile => ({
    name, size, mime: "", head: async (n: number) => bytes.slice(0, n), blob: async () => new Blob([bytes]),
  });
  async function realPdf(pages = 3): Promise<Uint8Array<ArrayBuffer>> {
    const d = await PDFDocument.create();
    const font = await d.embedFont(StandardFonts.Helvetica);
    for (let i = 1; i <= pages; i++) d.addPage([612, 792]).drawText(`RoomBoard page ${i}`, { x: 72, y: 700, size: 24, font });
    return new Uint8Array(await d.save());
  }
  const files = () => ({ pick: vi.fn(async () => null), save: vi.fn(async (_n: string, _b: Uint8Array) => true) });
  const producer = (seen: OverlayRequest[] = []): OverlayProducer => ({
    pages: async (reqs) => {
      seen.push(...reqs);
      return reqs.map(() => ({ kind: "png" as const, bytes: PNG_1PX }));
    },
  });
  const loadPdfLib = () => import("pdf-lib");

  it("S1 : PDF déposé : nouvel onglet « Cours.roomboard », une page par page, fonds pdf-page, asset dans le magasin, non modifié, rien à annuler ; PdfFile détruit", async () => {
    const pdf = fakePdf({ size: (i) => (i === 1 ? { w: 792, h: 612 } : { w: 612, h: 792 }) });
    const ws = await setupWorkspace({ pdf: pdf.engine });
    const r = await ws.importFiles([drop("/home/u/Cours.pdf")], null);
    expect(r.opened).toEqual(["/home/u/Cours.pdf"]);
    expect(ws.tabs.list()).toHaveLength(2);
    const tab = ws.active();
    const doc = tab.board.doc;
    const views = doc.pageIds().map((id) => doc.page(id)?.backdrop);
    expect(views.map((b) => [b?.kind, b?.page, b?.w, b?.h])).toEqual([
      ["pdf-page", 0, 612, 792],
      ["pdf-page", 1, 792, 612],
      ["pdf-page", 2, 612, 792],
    ]);
    const asset = doc.citedAssets()[0];
    expect([asset?.name, asset?.mime, asset?.size]).toEqual(["Cours.pdf", "application/pdf", PDF_HEAD.byteLength]);
    expect(tab.assets.get(asset?.id ?? "")?.type).toBe("application/pdf");
    expect([tab.files.name(), tab.files.isDirty(), doc.canUndo()]).toEqual(["Cours.roomboard", false, false]);
    expect(pdf.destroy).toHaveBeenCalledTimes(1);
    expect(shell.notify).not.toHaveBeenCalled();
  });

  it("Enregistrer demande où (cible nulle), jamais sur le PDF (U1, PF10)", async () => {
    const ws = await setupWorkspace({ pdf: fakePdf().engine });
    await ws.openPdf({ name: "Cours.pdf", blob: new Blob([PDF_HEAD]) });
    expect(await ws.active().files.run("save")).toBe(true);
    expect(host.save.mock.calls[0]?.[1]).toEqual({ kind: "ask", name: "Cours.roomboard" });
  });

  it("PDF chiffré : avis « secret.pdf : PDF chiffré, non pris en charge », aucun onglet (S2, Review Focus 2)", async () => {
    const ws = await setupWorkspace({ pdf: fakePdf({ encrypted: true }).engine });
    expect(await ws.openPdf({ name: "secret.pdf", blob: new Blob([PDF_HEAD]) })).toBe(false);
    expect(shell.notify).toHaveBeenCalledWith("secret.pdf : PDF chiffré, non pris en charge");
    expect(ws.tabs.list()).toHaveLength(1);
  });

  it("501 pages : 500 pages importées, avis « gros.pdf : 500 premières pages importées sur 501 » (S2, PF7)", async () => {
    const pdf = fakePdf({ pages: 501 });
    const ws = await setupWorkspace({ pdf: pdf.engine });
    expect(await ws.openPdf({ name: "gros.pdf", blob: new Blob([PDF_HEAD]) })).toBe(true);
    expect(ws.active().board.doc.pageIds()).toHaveLength(500);
    expect(pdf.pageSize).toHaveBeenCalledTimes(500);
    expect(shell.notify).toHaveBeenCalledWith("gros.pdf : 500 premières pages importées sur 501");
  });

  it("PDF illisible : « Ouverture impossible (x.pdf) : … » ; 0 page : « … : PDF sans page », PdfFile détruit", async () => {
    const bad = await setupWorkspace({ pdf: fakePdf({ fail: "Invalid PDF structure." }).engine });
    expect(await bad.openPdf({ name: "x.pdf", blob: new Blob([PDF_HEAD]) })).toBe(false);
    expect(shell.notify).toHaveBeenCalledWith("Ouverture impossible (x.pdf) : Invalid PDF structure.");
    const empty = fakePdf({ pages: 0 });
    const ws = await setupWorkspace({ pdf: empty.engine });
    expect(await ws.openPdf({ name: "vide.pdf", blob: new Blob([PDF_HEAD]) })).toBe(false);
    expect(shell.notify).toHaveBeenCalledWith("Ouverture impossible (vide.pdf) : PDF sans page");
    expect(empty.destroy).toHaveBeenCalledTimes(1);
    expect(ws.tabs.list()).toHaveLength(1);
  });

  it("onglets pleins : TOO_MANY_TABS, PDF jamais ouvert (PF10)", async () => {
    const pdf = fakePdf();
    const ws = await setupWorkspace({ pdf: pdf.engine });
    for (let i = 1; i < MAX_TABS; i++) await ws.newBlank();
    await ws.importFiles([drop("a.pdf")], null);
    expect(shell.notify).toHaveBeenCalledWith(TOO_MANY_TABS);
    expect(pdf.open).not.toHaveBeenCalled();
  });

  it("web : PDF de 120 Mo refusé avant lecture (S2, PF9)", async () => {
    const pdf = fakePdf();
    const ws = await setupWorkspace({ pdf: pdf.engine });
    const r = await ws.importFiles([drop("gros.pdf", PDF_HEAD, 120 * 1024 * 1024)], null);
    expect(r.refused).toEqual(["gros.pdf"]);
    expect(pdf.open).not.toHaveBeenCalled();
  });

  it("export S1 : un trait en page 2 du PDF : « Cours annoté.pdf » écrit (3 pages), superposition demandée pour la page 2 seule, avis « PDF exporté (3 pages) »", async () => {
    const bytes = await realPdf();
    const seen: OverlayRequest[] = [];
    const pdfFiles = files();
    const ws = await setupWorkspace({ pdf: fakePdf().engine, pdfFiles, loadPdfLib, overlay: () => producer(seen) });
    await ws.openPdf({ name: "Cours.pdf", blob: new Blob([bytes]) });
    const doc = ws.active().board.doc;
    const p2 = doc.pageIds()[1] ?? "";
    doc.apply({ type: "CommitStroke", page: p2, points: new Float32Array([100, 100, 0.5, 400, 100, 0.5]), style: { color: "#000000", width: 4 } });
    expect(await ws.exportPdf()).toBe(true);
    expect(seen.map((r) => r.pageId)).toEqual([p2]);
    const [name, out] = pdfFiles.save.mock.calls[0] ?? ["", new Uint8Array()];
    expect(name).toBe("Cours annoté.pdf");
    expect((await PDFDocument.load(out)).getPageCount()).toBe(3);
    expect(shell.notify).toHaveBeenCalledWith("PDF exporté (3 pages)");
  });

  it("export d'un document sans PDF : « Sans titre.pdf », 1 page, avis au singulier (PF19, PC10)", async () => {
    const pdfFiles = files();
    const ws = await setupWorkspace({ pdfFiles, loadPdfLib, overlay: () => producer() });
    drawOn(ws.active());
    expect(await ws.exportPdf()).toBe(true);
    expect(pdfFiles.save.mock.calls[0]?.[0]).toBe("Sans titre.pdf");
    expect(shell.notify).toHaveBeenCalledWith("PDF exporté (1 page)");
  });

  it("export : asset absent du magasin : UNREAD_ASSETS_MESSAGE, rien écrit (PF20)", async () => {
    const pdfFiles = files();
    const ws = await setupWorkspace({ first: { doc: docWithImage(), opened: null, error: null }, pdfFiles, loadPdfLib, overlay: () => producer() });
    expect(await ws.exportPdf()).toBe(false);
    expect(shell.notify).toHaveBeenCalledWith(UNREAD_ASSETS_MESSAGE);
    expect(pdfFiles.save).not.toHaveBeenCalled();
  });

  it("export : un seul à la fois ; le second appel dit « Opération en cours » (PF19)", async () => {
    let reached = false;
    let release: () => void = () => undefined;
    const slow: OverlayProducer = {
      pages: (reqs) =>
        new Promise((ok) => {
          reached = true;
          release = () => ok(reqs.map(() => ({ kind: "png" as const, bytes: PNG_1PX })));
        }),
    };
    const ws = await setupWorkspace({ pdfFiles: files(), loadPdfLib, overlay: () => slow });
    drawOn(ws.active());
    const first = ws.exportPdf(); // `exporting` passe à vrai avant le premier `await`
    expect(await ws.exportPdf()).toBe(false);
    expect(shell.notify).toHaveBeenCalledWith("Opération en cours");
    await vi.waitFor(() => expect(reached).toBe(true));
    release();
    expect(await first).toBe(true);
  });

  it("export : contenu sous la page PDF : avis « du contenu hors des pages PDF n'est pas exporté » (Review Focus 4)", async () => {
    const ws = await setupWorkspace({ pdf: fakePdf({ pages: 1 }).engine, pdfFiles: files(), loadPdfLib, overlay: () => producer() });
    await ws.openPdf({ name: "Cours.pdf", blob: new Blob([await realPdf(1)]) });
    const doc = ws.active().board.doc;
    doc.apply({ type: "AddShape", page: doc.pageIds()[0] ?? "", shape: "rect", x0: 100, y0: 5000, x1: 200, y1: 5100, style: { color: "#000000", width: 4 }, fill: null });
    expect(await ws.exportPdf()).toBe(true);
    expect(shell.notify).toHaveBeenCalledWith("du contenu hors des pages PDF n'est pas exporté");
  });

  it("sans pdfFiles, loadPdfLib ou overlay : exportPdf rend faux, sans avis", async () => {
    const ws = await setupWorkspace({ loadPdfLib, overlay: () => producer() });
    expect(await ws.exportPdf()).toBe(false);
    expect(shell.notify).not.toHaveBeenCalled();
  });
});
```

  Dans `apps/web/src/ui/App.test.tsx`,
  `fakeWorkspace` gagne `openPdf: vi.fn(async () => true),` et `exportPdf: vi.fn(async () => false),` après
  `insertPages`. Commande bornée : rouge.

- [ ] **Étape 3 : dépendances, interface, messages.** Dans `apps/web/src/app/workspace.ts` : imports —
  `PDF_MAX_PAGES` et le type `PdfPageSize` de `../core/api` ; le type `PdfEngine`, `PdfFile` de
  `../engine/render/pdf-port` ; `PDF_EXTENSION`, `PDF_MIME`, `ROOMBOARD_EXTENSION` de `../platform/files` (dans l'import
  existant) ; `PDF_ENCRYPTED_MESSAGE`, `PdfEncryptedError` de `../platform/pdf-render` ; `typed` de `./container-io`
  (dans l'import existant de `createContainerIO, missingOf`) ;
  `import { exportPdf as assemblePdf, PDF_CUT_MESSAGE, type OverlayProducer, type PdfLib } from "./pdf-export";`.
  `WorkspaceDeps`, après `itemFiles` :

```ts
  /** C12 (PF11, PF12) : moteur PDF de la page (`createPdfEngine(loadPdfjs)` dans l'amorce) ; absent : `.pdf` refusé. */
  readonly pdf?: PdfEngine;
  /** C12 (PF19) : écriture du PDF exporté (`PDF_TYPE`) ; absent : « Exporter en PDF… » sans effet. */
  readonly pdfFiles?: TypedFiles;
  /** C12 (PF21) : `loadPdfLib` (import dynamique) dans l'amorce. */
  loadPdfLib?(): Promise<PdfLib>;
  /** C12 (DAPF3) : producteur de superposition d'un onglet (PNG en b, `krilla` en c). */
  overlay?(tab: TabSession): OverlayProducer;
```

  `Workspace`, après `insertPages(): Promise<boolean>;` :

```ts
  /** C12 (PF2, PF7 à PF10, Q1) : PDF ouvert dans un nouvel onglet ; faux si refusé (avis déjà dit). */
  openPdf(file: { readonly name: string; readonly blob: Blob }): Promise<boolean>;
  /** C12 (PF19 à PF21) : « Exporter en PDF… » de l'onglet actif ; faux sans port, refusé ou boîte annulée. */
  exportPdf(): Promise<boolean>;
```

  Après `export { CODEC_FALLBACK_MESSAGE } from "./container-io";` :

```ts
/** C12 : avis de l'import et de l'export PDF (PF7, PF19, PC10). */
export const PDF_NO_PAGE_MESSAGE = "PDF sans page";
export const BUSY_MESSAGE = "Opération en cours";
export const pdfFirstPagesMessage = (name: string, total: number): string => `${name} : ${PDF_MAX_PAGES} premières pages importées sur ${total}`;
export const pdfExportedMessage = (pages: number): string => `PDF exporté (${pages} page${pages > 1 ? "s" : ""})`;
const stemOf = (name: string, ext: string): string => (name.toLowerCase().endsWith(ext) && name.length > ext.length ? name.slice(0, -ext.length) : name);
/** Nom proposé (PF19) : `<base> annoté.pdf` si une page d'origine est recopiée, sinon `<base>.pdf`. */
export const exportPdfName = (tabName: string, annotated: boolean): string =>
  `${stemOf(tabName, ROOMBOARD_EXTENSION)}${annotated ? " annoté" : ""}${PDF_EXTENSION}`;
```

- [ ] **Étape 4 : l'importeur et les deux méthodes.** Dans `createImporter({ … })`, après la ligne `readSheet` :
  `...(deps.pdf ? { openPdf: (f: { readonly name: string; readonly blob: Blob }) => ws.openPdf(f) } : {}),`. Avant
  `const ws: Workspace = {` : `let exporting = false;`. Dans `ws`, après `insertPages` :

```ts
    async openPdf(file) {
      const name = baseName(file.name);
      const pdf = deps.pdf;
      if (pdf === undefined) return false;
      if (full()) {
        await say(TOO_MANY_TABS);
        return false;
      }
      let opened: PdfFile;
      try {
        opened = await pdf.open(file.blob);
      } catch (e) {
        await say(e instanceof PdfEncryptedError ? `${name} : ${PDF_ENCRYPTED_MESSAGE}` : `Ouverture impossible (${name}) : ${messageOf(e)}`);
        return false;
      }
      try {
        const total = opened.pageCount;
        if (total === 0) {
          await say(`Ouverture impossible (${name}) : ${PDF_NO_PAGE_MESSAGE}`);
          return false;
        }
        const sizes: PdfPageSize[] = [];
        for (let i = 0; i < Math.min(total, PDF_MAX_PAGES); i++) sizes.push(await opened.pageSize(i));
        const assets = makeAssets();
        const blob = typed(file.blob, PDF_MIME);
        const id = await assets.put(blob);
        const doc = core.fromPdfPages({ id, name, mime: PDF_MIME, size: blob.size }, sizes);
        if (total > PDF_MAX_PAGES) await say(pdfFirstPagesMessage(name, total));
        return (await addTab(doc, { name: `${stemOf(name, PDF_EXTENSION)}${ROOMBOARD_EXTENSION}`, target: null }, assets)) !== null;
      } catch (e) {
        await say(`Ouverture impossible (${name}) : ${messageOf(e)}`);
        return false;
      } finally {
        opened.destroy(); // l'onglet rouvre le PDF au premier dessin (PC11, HPF2-10)
      }
    },
    async exportPdf() {
      const { pdfFiles, loadPdfLib, overlay } = deps;
      if (pdfFiles === undefined || loadPdfLib === undefined || overlay === undefined) return false;
      if (exporting) {
        await say(BUSY_MESSAGE);
        return false;
      }
      const tab = ws.active(); // onglet montré à l'appel (R3)
      if (missingOf(tab.board.doc, tab.assets).length > 0) {
        await say(UNREAD_ASSETS_MESSAGE);
        return false;
      }
      exporting = true;
      try {
        const r = await assemblePdf(tab.board.doc, tab.assets, { loadPdfLib: () => loadPdfLib(), overlay: overlay(tab) });
        if (r.cut) await say(PDF_CUT_MESSAGE);
        const saved = await pdfFiles.save(exportPdfName(tab.files.name(), r.annotated), r.bytes);
        if (saved) await say(pdfExportedMessage(r.pages));
        return saved;
      } catch (e) {
        await say(`Export impossible : ${messageOf(e)}`);
        return false;
      } finally {
        exporting = false;
      }
    },
```

- [ ] **Étape 5 : vert.** La commande bornée ; puis
  `pnpm --filter @roomboard/web exec vitest run src/app src/ui 2>&1 | grep -E "Test Files|Tests "` (0 échec) et `tsc`
  (GC14).

- [ ] **Étape 6 : commit.**

```bash
cd "$WT" && for f in apps/web/src/app/workspace.ts apps/web/src/app/workspace.test.ts apps/web/src/ui/App.test.tsx; do git add "$f"; done && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): open PDFs in a new tab and export the active tab as PDF" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Rapport : N, noms vus, une ligne `Réutilisation :` par ligne `Réutilise :`.
