# Cadrage — cli-lot3

Cadrage autonome (étage 1, cadreur), 2026-11-24, mode autonome (brief OF8 : aucune question à Jérôme). **Ce cadrage
complète `docs/plans/cli-cadrage.md` (D1 à D16, H1 à H10, DA1 à DA6, référence de la CLI) et
`docs/plans/cli-lot2-cadrage.md` (D17 à D31, H11 à H22, DA7 à DA10) sans les refaire** : seul ce qui est nouveau pour
le PDF est écrit ici (numérotation continuée : D32…, H23…, DA11…). Graphe graphify frais (`~/.cache/graphes/roomboard`,
2026-11-24 02:36, `apps/cli` du lot 2 compris). Décision du coffre « 0283 » absente du miroir de la VM (dernière :
0282) : son texte est la note 2 de `docs/sessions/cli-lot2-etat.md` (§ Notes du coffre, « Workers joués en processus »).

Essais faits au cadrage (`~/.cache/tmp/of8-cadreur/`, retiré) : (1) pdf.js 6.5.438 `legacy` en Node, worker joué en
processus (`globalThis.pdfjsWorker`), sans `@napi-rs/canvas` résolvable : nombre et tailles des pages, métadonnées et
texte lus ; seuls trois avertissements de chargement sur stderr. (2) Chaîne complète en Node (vitest) : `createPdfEngine`
→ `core.fromPdfPages` (fond `pdf-page`, page 1, 612 × 792) → annotation (forme, texte) → `exportPdf` avec
`createVectorOverlay`, `Canvas2DRenderer` sur `RecordingContext2D`, `write_pdf_pages` du module formats : 3 pages,
`annotated` vrai, textes relus « RoomBoard page 2Annotation CLI ». (3) pdf.js et son worker groupés par
`vite build --ssr` en un fichier (3,4 Mo) : lecture correcte ; un module importé en premier filtre les trois
avertissements (stderr vide) ; démarrage 0,48 s contre 0,17 s pour Node nu.

Contre-relecture, tour 1 (2026-11-24) : 1 bloquant (licence des polices Liberation, D48 nouvelle, décision de
l'orchestrateur prise par l'agent), 3 majeurs (`pdfjsBinding` partagé, test de `quietWarn` et contrôle « stderr vide »,
`loadPdfLib` et écrivain injectables) et 7 mineurs intégrés ; aucun point contesté.

## 1. Demande et gabarit

**Demande** : lot 3 de la CLI — lire un PDF (onglet, pages en fond `pdf-page`, comme C12), écrire un PDF annoté
depuis un `.roomboard` (export superposé pdf-lib et krilla de C12), `convert` vers et depuis le PDF avec ses avis ; `.pdf`
passe de « code 3 » à « couvert » dans `FORMAT_LOTS`, avec ses tests et des contrôles dans `scripts/essais/cli-essai.mjs`
(page comptée, texte retrouvé, fond présent) (Jérôme via le général, brief OF8).

**Gabarit** : chantier (40 questions au plus ; 26 consommées). Estimation : **7 tâches, ~3 h 35 de travail, ~2 h 40 de
chemin critique** (DA14).

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| D32 | pdf.js dans Node, sans copie | **Le worker de pdf.js est joué en processus par la voie que pdf.js prévoit** : `globalThis.pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs")` (le module même que `platform/pdf-worker.ts:5` charge dans le Worker de la page), puis `import("pdfjs-dist/legacy/build/pdf.mjs")` ; pdf.js voit `pdfjsWorker.WorkerMessageHandler` et le fait tourner dans le processus (« fake worker »). Rien à extraire, rien de recopié : la page et la CLI construisent leur `PdfjsBinding` par **`pdfjsBinding(pdfjs, options)`**, extrait de `loadPdfjs` (`pdf-load.ts:37-53`, dont `isPasswordError`, `:51`), puis passent par `createPdfEngine(load, dom)` (`pdf-render.ts:125`). DA12. | brief OF8 ; coffre `0255` (DAPF1), « 0283 » (note du lot 2) ; essai (1) ; contre-relecture M1 | oui |
| D33 | Canvas, rendu, polices système | **Aucun canvas, aucun rendu en image.** Le fond `pdf-page` garde le PDF d'origine en un seul asset et l'indice de page (`BackdropView.asset`, `.page`, `core/api.ts:302-313`) ; l'import ne lit que le nombre et la taille des pages (`workspace.ts:526-545`) ; l'export recopie les pages d'origine par pdf-lib et superpose l'annotation en vectoriel krilla (`pdf-export.ts:136`). `renderTile` n'est jamais appelé : le `PdfDom` de la CLI lève (« rendu en image indisponible dans la CLI »). `@napi-rs/canvas` (dépendance optionnelle de pdfjs-dist, MIT) n'est ni ajouté ni requis : le fichier construit ne le résout pas. Aucune dépendance système. **Licences** : aucune bibliothèque (A/L)GPL liée ; seules les polices Liberation Sans de `pdfjs-dist/standard_fonts/` sont sous GNU GPL v2 avec exception de police (Red Hat, 1.07.4) : la CLI les lit comme données à l'exécution, sans les lier ni les copier (D48), et l'exception de police couvre les PDF produits qui les embarquent. | coffre `0255` (DAPF1, DAPF3, DAPF4) ; `pdf-render.ts:47-56,85-117` ; `pdfjs-dist/standard_fonts/LICENSE_LIBERATION` ; essais (1) et (2) | oui |
| D34 | Avertissements de pdf.js | Au chargement, pdf.js en Node écrit sur stderr `Warning: Cannot load "@napi-rs/canvas"…`, `` Warning: Cannot polyfill `DOMMatrix`… ``, `` Warning: Cannot polyfill `Path2D`… ``. Dans le fichier construit, les modules importés dynamiquement sont évalués au démarrage (`inlineDynamicImports`, D3) : un filtre autour de l'`import()` ne suffit pas (essai 3). **`apps/cli/src/quiet.ts`, importé en premier par `bin.ts`**, enveloppe `console.warn` et ne retire que les lignes qui commencent par ces trois préfixes (premier argument) ; tout autre avertissement passe. Documents ouverts avec `verbosity: 0`. stderr reste réservé à la ligne `{"error":…}` (DA2). Gardes : test unitaire de `quietWarn` ; contrôle « stderr vide » d'une commande PDF dans `cli-essai.mjs`, sur le fichier construit (seul endroit où les avertissements naissent : dans les tests non groupés, pdf.js trouve `@napi-rs/canvas` et n'avertit pas, H30). | `contract.ts:44-54` (DA2) ; `pdf.mjs` (polyfills Node) ; essai (3) ; contre-relecture M2 | oui |
| D35 | Lire un PDF sans onglet | **Extraire `readPdfFile`** de `workspace.ts:510-553` vers `app/pdf-convert.ts` (DA11) : ouverture (`pdf.open`), 0 page, tailles des 500 premières pages, asset PDF (et original Office), `core.fromPdfPages`, avis « 500 premières pages », `destroy` dans `finally`. Rejette avec le message complet du produit (`<nom> : PDF chiffré, non pris en charge`, `Ouverture impossible (<nom>) : …`). `workspace.openPdf` garde onglets pleins, `addTab`, `say` : messages et ordre inchangés. `PDF_NO_PAGE_MESSAGE` et `pdfFirstPagesMessage` suivent le code (réexportés par `workspace.ts`). | `cli-cadrage.md` § 7 ; `workspace.ts:55-57,510-553` ; patron DA8 | oui |
| D36 | Écrire un PDF sans onglet | **Extraire `writePdfFile`** de `workspace.ts:555-606` vers `app/pdf-convert.ts` : copie du document (`saveParts`/`loadParts`, DAPF3), `exportPdf` (`pdf-export.ts:136`), table des blobs du repli, `rasterClose` dans `finally` (avant l'enregistrement, comme aujourd'hui), avis dans l'ordre du produit (`PDF_RASTER_MESSAGE`, `PDF_RASTER_MISSING_MESSAGE`, `PDF_CUT_MESSAGE`). `missingOf` reste chez l'appelant (même règle que `writeBoardFile`, D24). `workspace.exportPdf` garde `exporting`, `missingOf`, `pdfFiles.save`, `exportPdfName`, `say`. | `workspace.ts:555-606` ; D24 du lot 2 | oui |
| D37 | Superposition vectorielle dans la CLI | `createVectorOverlay` (`pdf-overlay-vector.ts:85`) du produit avec : `painter` = **`vectorPainter(doc)`** extrait de `main.ts:309` vers `pdf-overlay-vector.ts` (la page l'appelle aussi) ; `measure` = `nodeMeasureContext()` (couleurs normalisées par `tryParseColor`, `webgl2.ts:23` ; largeur par `measureOrFallback(null)`, `text-layout.ts:41-42`, avec la taille lue dans `font`, H25, H26) ; `fonts` = les quatre `PDF_FONT_FILES` (`:24`) lus dans `pdfjs-dist` installé (D48) ; `toPng` lève (image GIF, WebP, BMP, SVG : lot 4, H24) ; `write` = l'écrivain de la session (D38) ; `alive` = vrai. Pas de `fallbackOverlay` : le repli PNG exige un canvas (H24). | `main.ts:162-170,277-315` ; `pdf-overlay-vector.ts:24-128` ; `record-ctx.ts:137-160,234-243` ; essai (2) | oui |
| D38 | krilla en processus | **Extraire le corps de `pdf-vector-worker.ts:19-28`** en `pdfJobReply(mod: FormatsBinding, job: PdfJob): WorkerReply` exporté de `platform/container.ts` (à côté de `hasPdfWriter`, `:72-79`), avec `PdfJob` (ex-`Job`, `:9-16`) ; erreurs → `{ error }`, **sauf `WebAssembly.RuntimeError` relancée** (la coquille du Worker poste alors `{ error }` comme aujourd'hui). La CLI : `nodePdfWriter(io.formats ?? formats, onPanic)` = `workerPdfWriter(inlineWorker(…pdfJobReply…))` (`pdf-overlay-vector.ts:54`, `one-shot-worker.ts:55`) : le faux module de `TestableIO.formats` (lot 2) atteint aussi krilla, la panique de S4 est jouable. Panique : `onPanic` → règle D29 (plus aucune écriture dans le processus, code 1). Patron `board-node.ts`. | `cli-lot2-cadrage.md` DA7 (« le lot 3 fera de même pour `pdf-vector-worker.ts` ») ; D29 ; `pdf-vector-worker.ts:1-29` ; `session.ts:350-375` ; contre-relecture M3 | oui |
| D39 | Replis absents : codes | **Code 1, rien d'écrit**, quand l'application aurait pris un repli que la CLI n'a pas : PDF d'origine refusé par pdf-lib (`rasterMissing` : la page serait vierge ; la page la rendrait en image) ; superposition vectorielle en échec (police absente, image à convertir, erreur ou panique krilla). Message : celui du produit, suivi de « (repli en image indisponible dans la CLI) ». `cut` (contenu hors des pages) : code 0 et avis, comme la page (H12). **Corrige le § 7 du cadrage de la CLI** (« code 3 si pdf-lib refuse ») : le code 3 reste réservé aux formats d'un lot non livré (D9). | `pdf-export.ts:20-23,213-224` ; `cli-cadrage.md` D9, § 7 ; H12 | oui |
| D40 | Documents PDF ouvrables | `session.readDoc(path, "document")` (`session.ts:154`) lit un `.pdf` (`FORMAT_LOTS[ext].handler === "pdf"`) par `readPdfFile` sur `nodePdfEngine()` ; donc `state`, `run <x.pdf>`, `tab.open`, `export <x.pdf> …`, `convert <x.pdf> …` le lisent. `open` (`session.ts:171`) : un onglet lu d'un `.pdf` est **sans fichier**, comme un tableau (`file: boardFormatOf(path) === null && formatOf(path)?.handler !== "pdf" ? path : null`) ; la règle ne change pour aucun autre format (`tab.list` inchangé ailleurs). `import a.roomboard x.pdf` l'ouvre en onglet par `openPdf` de `createImporter` (`import.ts:68,263,359`, rapport `opened`) via `session.openPdf` (refus → avis, `false`). Avis d'ouverture (« 500 premières pages ») : D31. | C12 Q1 (`usage-c12-pdf-etat.md`) ; D22, D31 du lot 2 ; contre-relecture m5 | oui |
| D41 | Export et `convert` vers le PDF, et D23 | `export <source> <sortie.pdf>` et `{"op":"export","to":"x.pdf"}` : document entier de l'onglet actif par `writePdfFile` ; `--page`, `--ids`, `--all`, `--grid`, `--name` : code 2 (comme D24). Image non lue : `UNREAD_ASSETS_MESSAGE`, code 1. `convert` : `.pdf` entre dans `CONVERT_SOURCES` et `CONVERT_TARGETS` (`exporter.ts:59-60`) ; `convert x.pdf y.iwb|.ubz` passe par `writeBoardFile` : code 0 et l'avis du produit « fonds PDF non exportés » (`board-io.ts:569,664`). **Avec D23** : un `.pdf` est une **sortie** (`export`, `convert`, contrôle d'extension propre, comme `.rbitem`, `.iwb`, `.ubz`) et une **source** (onglet sans fichier), jamais une cible de document : `new z.pdf`, `run x.pdf --save`, `apply x.pdf …` sans `--out`, `import x.pdf …` sans `--out`, op `save` vers `.pdf` → code 2, inchangé (`documentTarget`). Sortie = source (`convert x.pdf x.PDF`, lien) : code 2 (`checkNotSource`). | D23, D24, D25 du lot 2 ; `exporter.ts:29-71` ; `main.ts:188-222` | oui |
| D42 | `FORMAT_LOTS` | `.pdf` : `branched(3, 3, "pdf", { read: true, write: true }, …)` avec les notes « fond `pdf-page`, PDF d'origine gardé en asset », « export : pages d'origine recopiées, annotation vectorielle ; sans repli en image (code 1) », « couleurs nommées et texte mesurés comme H25, H26 » ; **`LOT_LIVRE = 3`** (le test « tout lot ≤ `LOT_LIVRE` couvert », `formats.test.ts:17-24`, le garde). Après ce lot, aucun format n'a d'écriture d'un lot non livré : **`exportBlocked` (`formats.ts:101`) est retiré**, avec son test ; `checkExportTarget` rend 2 pour toute sortie non prise (`exporter.ts:33`) ; la branche `lot === 3` de `convertSide` (`exporter.ts:64`) et son paramètre `blocked` disparaissent. Le code 3 reste à l'import d'un format du lot 4 (`import a.roomboard x.docx` → 3, « lot 4 ») ; `convert` depuis ou vers `.docx` rend 2 (règle T11 du lot 2, `cli-essai.mjs:233`). | `formats.ts:11,54,101` ; D27 ; contre-relecture m2, m7 | oui |
| D43 | Fichiers d'essai | Aucun PDF suivi dans le dépôt (`git ls-files '*.pdf'` : rien). `threePages` et `readBack` de `scripts/essais/c12-pdf-navigateur.mjs:21-41` sont **déplacés** dans `scripts/essais/fabriques/pdf.mjs` (+ `.d.mts`), bibliothèques injectées : `pdfPages(lib, n?, label?)`, `readPdf(bytes, libs)` (liste 3). `c12-pdf-navigateur.mjs`, les tests de `apps/cli` et `cli-essai.mjs` les importent. PDF invalide : octets littéraux `%PDF-1.4\n%%EOF\n` (déjà dans `cli-essai.mjs:141`) ; 501 pages : `pdfPages(lib, 501)` ; PDF refusé par pdf-lib : faux `PdfLib` passé par `TestableIO.pdfLib` (patron `pdf-export.test.ts:297`). Rien de téléchargé. | brief OF8 ; D28 du lot 2 | oui |
| D44 | Dépendances, build, injection | `pdfjs-dist` **6.5.438 exact** en `dependencies` de `apps/cli` (Apache-2.0, déjà au verrou par `apps/web`) : l'`import()` est écrit dans un fichier de la CLI, qui ne résout pas les paquets de `apps/web` (H20 du lot 2) ; le même paquet donne les polices (D48). `pdf-lib` reste résolu depuis `apps/web` par `loadPdfLib` (`pdf-load.ts:55`). `SessionDeps` gagne `loadPdfLib(): Promise<PdfLib>`, `pdf: PdfEngine` et `pdfWriter: PdfWriter` ; `TestableIO` gagne `pdfLib?: () => Promise<PdfLib>` (test seulement, comme `formats?`). Déclaration de types pour `pdfjs-dist/legacy/build/pdf.worker.mjs` (aucun `.d.mts` livré). Le build de la CLI ne copie rien de plus (`vite.config.ts` inchangé). Le greffon worker de vite ne s'applique pas au build SSR (`new Worker(new URL(…))` de `pdf-load.ts:40` reste inerte, jamais exécuté). | `apps/cli/src/session.ts:30-50,350-375` ; vite 6.4.6 `vite:worker-import-meta-url` (`consumer === "client"`) ; contre-relecture M3 | oui |
| D45 | Modules Wasm | Aucune ligne Rust : `write_pdf_pages` et `fromPdfPages` appelés tels quels. Tailles inchangées à l'octet (1 374 215 o / 1 572 864 ; 2 794 511 o / 3 145 728), aucun seuil ne bouge. | brief OF8 ; `cli-lot2-etat.md` (tailles) | oui |
| D46 | Essai `cli-essai.mjs` | Contrôles du PDF (S5) : page comptée, texte retrouvé (texte d'origine et texte de l'annotation), fond présent (avant et après aller-retour), **stderr vide** des commandes PDF, règle D23 pour `.pdf`, `formats`. Le contrôle « `.pdf` code 3 » (`cli-essai.mjs:83,140-145`) passe à `import … x.docx` → 3 (« lot 4 ») ; celui de `convert` vers `.pdf` (`:233`) devient un succès, et `convert` vers `.docx` rend 2. | brief OF8 ; D15 du lot 1 ; contre-relecture M2, m2 | oui |
| D47 | Profil, aide | `USAGE` (`main.ts:31-36`) : `state`, `export`, `convert` nomment `.pdf`. Profil § CLI : « Lots restants : 4 » ; lot 3 livré (`docs/plans/cli-lot3-cadrage.md`). | `.claude/chantier.md` § CLI ; D30 | oui |
| D48 | Polices de la superposition et leur licence (**décision nouvelle, prise par l'agent**, sur décision de l'orchestrateur en mode autonome) | `pdfjs-dist/standard_fonts/LICENSE_LIBERATION` est la licence Red Hat de Liberation 1.07.4 : **GNU GPL v2 avec exception de police**, pas l'OFL-1.1 qu'écrit `THIRD_PARTY_NOTICES.md:226-227,309-310`. La CLI **ne copie pas** les polices dans `apps/cli/dist/` : elle les lit à l'exécution dans le paquet `pdfjs-dist` installé (`createRequire(import.meta.url).resolve("pdfjs-dist/package.json")`, dossier `standard_fonts/`, liste `PDF_FONT_FILES` de la page), sans nouvel exemplaire ni dans le dépôt ni dans un artefact. Une police lue comme donnée n'est pas une dépendance liée ; l'exception de police couvre les PDF produits. Le lot **corrige le texte faux de `THIRD_PARTY_NOTICES.md`** (GPL v2 avec exception de police, pour les polices copiées dans `dist/pdfjs/` du web et pour la fixture `crates/roomboard-formats/tests/fixtures/LiberationSans-Regular.ttf`) ; il ne change pas la page (hors périmètre). **Reste signalé à Jérôme** : remplacer Liberation par une police OFL dans la page et la CLI. H36. | orchestrateur, contre-relecture B1 (vérifié) ; `LICENSE_LIBERATION` ; `THIRD_PARTY_NOTICES.md:226-227,309-310` ; `pdf-overlay-vector.ts:24` | oui |

## 3. Carte d'impact

Ligne « Surfaces d'impact » absente du profil : rubriques reprises des lots 1 et 2.

### 3.1 CLI (`apps/cli`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/pdf-node.ts` (neuf) | oui | pdf.js en processus, moteur sans rendu, mesure, polices lues dans `pdfjs-dist`, écrivain krilla (DA12, DA13, D48) | V (absent) |
| `src/quiet.ts` (neuf), `src/bin.ts:1-3` | oui | filtre des trois avertissements, importé en premier (D34) | V |
| `src/session.ts:30-50,154-171,264-280,350-375` | oui | `SessionDeps` gagne `loadPdfLib`, `pdf`, `pdfWriter` ; `TestableIO.pdfLib?` ; `readDoc` lit un `.pdf` ; `open` sans fichier pour un `.pdf` ; `openPdf` ; op `export` vers `.pdf` ; `nodeSession` branche `io.formats ?? formats` et `onPanic` (D29) | V |
| `src/importer.ts:94-106` | oui | `openPdf` passé à `createImporter` (D40) | V |
| `src/exporter.ts:13,29-71` | oui | `checkExportTarget` accepte `.pdf`, sans `exportBlocked` ; `exportPdfFile` ; ensembles de `convert` ; branche `lot === 3` et paramètre `blocked` retirés (D41, D42) | V |
| `src/main.ts:31-36,188-222` | oui | `USAGE`, `export` et `convert` vers `.pdf` (options refusées) | V |
| `src/formats.ts:11,54,101` | oui | `.pdf` couvert, `LOT_LIVRE = 3`, notes, `exportBlocked` retiré (D42) | V |
| `src/testing.ts` | oui | fabriques PDF, `pdfLib` injectable dans `memoryIO` | V |
| `package.json`, `pnpm-lock.yaml` | oui | `pdfjs-dist` 6.5.438 (aucun paquet neuf) | V |
| `vite.config.ts`, `src/contract.ts` | non | aucune copie de police (D48), `CliIO` inchangé | V |
| `src/board-node.ts`, `fragment-view.ts`, `target.ts`, `library.ts`, `state.ts`, `ops.ts`, `args.ts`, `disk.ts`, `wasm-node.ts` | non | réutilisés tels quels | V |

### 3.2 Modules web réutilisés ou étendus

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/app/pdf-convert.ts` (neuf) | oui | `readPdfFile`, `writePdfFile` (DA11) | V (absent) |
| `apps/web/src/app/workspace.ts:55-61,510-606` | oui | `openPdf` et `exportPdf` délèguent ; messages réexportés | V |
| `apps/web/src/platform/pdf-load.ts:37-53` | oui | `pdfjsBinding(pdfjs, options)` extrait ; `loadPdfjs` l'appelle (D32) | V |
| `apps/web/src/app/pdf-overlay-vector.ts:54-66,85` | oui | `vectorPainter(doc)` ; `workerPdfWriter` construit un `PdfJob` typé | V |
| `apps/web/src/platform/container.ts:72-79` | oui | `PdfJob`, `pdfJobReply` (D38) | V |
| `apps/web/src/platform/pdf-vector-worker.ts:9-28` | oui | coquille autour de `pdfJobReply` | V |
| `apps/web/src/main.ts:300-315` | oui | `painter: vectorPainter(doc)` | V |
| `apps/web/src/app/pdf-export.ts:136` (`exportPdf`) | non | appelé par `writePdfFile` | V |
| `apps/web/src/platform/pdf-render.ts:38-56,125` | non | `PdfjsBinding`, `PdfDom`, `createPdfEngine` réutilisés | V |
| `apps/web/src/platform/pdf-load.ts:19,55` | non | `openPdfDocument`, `loadPdfLib` réutilisés | V |
| `apps/web/src/platform/pdf-worker.ts:5` | non | même module de worker que la CLI (D32) | V |
| `apps/web/src/engine/render/record-ctx.ts`, `canvas2d.ts:53`, `webgl2.ts:23`, `text-layout.ts:41-42` | non | `RecordingContext2D`, `RecordingPath`, `exportPainterOptions`, `tryParseColor`, `measureOrFallback` | V |
| `apps/web/src/app/board-io.ts:569,664` | non | avis « fonds PDF non exportés » d'un `convert` PDF → tableau | V |
| `apps/web/src/platform/import.ts:68,263,359` | non | lecteur `pdf` du registre | V |
| `apps/web/src/platform/one-shot-worker.ts:19,55` | non | `runOnce`, `inlineWorker` | V |
| `apps/web/src/app/container-io.ts:76,82`, `platform/controller.ts:11` | non | `typed`, `missingOf`, `UNREAD_ASSETS_MESSAGE` | V |

### 3.3 Cœur Rust et modules Wasm

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core/` (`from_pdf_pages`) | non | appelé tel quel | V |
| `crates/roomboard-wasm/` (1 374 215 o) | non | taille inchangée (D45) | V |
| `crates/roomboard-formats/src/pdf.rs`, `roomboard-formats-wasm` (2 794 511 o) | non | `write_pdf_pages` appelé tel quel | V |
| `crates/roomboard-shell/` | non | lot 4 | V |

### 3.4 Persistance

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `.roomboard` d'un PDF (fond `pdf-page`, asset unique, `compat_c12.rs`) | non | même écrivain ; l'original reste un asset | V |
| PDF écrit (`pdf-export.ts`) | non | même assemblage | V |

### 3.5 Scripts, profil, documentation, licences

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `THIRD_PARTY_NOTICES.md:226-227,309-310` | oui | Liberation Sans : GNU GPL v2 avec exception de police (Red Hat 1.07.4), pas OFL-1.1, pour le web et la fixture ; la CLI les lit dans `pdfjs-dist` sans copie (D48) | V |
| `crates/roomboard-formats/tests/fixtures/LICENSE_LIBERATION`, `LiberationSans-Regular.ttf` | non | fixture inchangée ; seul le texte de la notice change | V |
| `scripts/essais/fabriques/pdf.mjs` (+ `.d.mts`, neufs) | oui | fabriques déplacées (D43) | V (absent) |
| `scripts/essais/c12-pdf-navigateur.mjs:21-41` | oui | importe les fabriques | V |
| `scripts/essais/cli-essai.mjs:83,140-145,233` | oui | contrôles PDF, stderr vide ; code 3 sur `import x.docx`, `convert` `.docx` → 2 (D46) | V |
| `.claude/chantier.md` § CLI | oui | lots restants (D47) | V |
| `scripts/verifier.sh:81-84,117` | non | build et essai de la CLI, essai C12 déjà joués | V |
| `scripts/controle-licences.mjs` | non | lit tout `node_modules/.pnpm` : `pdfjs-dist` déjà relevé ; à garder vert | V |

### 3.6 Tests

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/app/pdf-convert.test.ts` (neuf) | oui | `readPdfFile`, `writePdfFile` sur faux moteur et faux `PdfLib` | S |
| `apps/web/src/platform/container.test.ts` ou voisin | oui | `pdfJobReply` : réponse, `{ error }`, écrivain absent, `RuntimeError` relancée | S |
| `apps/web/src/platform/pdf-load.test.ts` | oui | `pdfjsBinding` : `open`, `isPasswordError` (classe et nom) | V |
| `apps/web/src/app/workspace.test.ts:1033-1288` (« espace de travail : PDF (C12) », 19 tests) | non | à garder verts : messages, ordre, destruction du `PdfFile` | V |
| `apps/web/src/app/pdf-overlay-vector.test.ts`, `pdf-export.test.ts`, `pdf-overlay.test.ts` | non | à garder verts | V |
| `apps/web/src/platform/pdf-render.test.ts`, `import.test.ts`, `one-shot-worker.test.ts` | non | à garder verts | V |
| `apps/cli/src/formats.test.ts:17-24` (`LOT_LIVRE`), `:29-41` | oui | `LOT_LIVRE = 3`, `.pdf` lu et écrit ; contrôles `.pdf` code 3 → `.docx` ; test d'`exportBlocked` retiré | V |
| `apps/cli/src/main.test.ts:17`, `:35` | oui | `formats` de `.pdf` ; ligne d'usage de `convert` | V |
| `apps/cli/src/export.test.ts:53-59`, `convert.test.ts:52-58,116-120`, `import.test.ts:57-66`, `guards.test.ts:49-55` | oui | `.pdf` n'est plus code 3 : ces contrôles passent à `.docx` (import : 3 ; `convert`, `export` : 2) ou deviennent des succès PDF | V |
| `apps/cli/src/quiet.test.ts` (neuf) | oui | `quietWarn` : trois avertissements retirés, un quatrième gardé, préfixe de la première ligne seul | S |
| `apps/cli/src/pdf.test.ts` (neuf, vrai Wasm) | oui | S1 à S4 | S |
| `scripts/essais/c12-pdf-navigateur.mjs` (`--e2e`) | non | à garder vert (mêmes octets fabriqués) | V |
| `cargo test --workspace` | non | aucune ligne Rust | V |

### 3.7 Autres dépôts

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `roomboard-prive` | non | hors périmètre | S |

### Effets de bord sur l'existant

- `openPdf` et `exportPdf` de la page passent par `app/pdf-convert.ts` : mêmes avis, même ordre, `PdfFile` détruit,
  repli fermé avant l'enregistrement. Couvert par `workspace.test.ts` (« espace de travail : PDF (C12) », 19 tests),
  `pdf-convert.test.ts` et `c12-pdf-navigateur.mjs` (`--e2e`).
- `loadPdfjs` construit son lien par `pdfjsBinding` : même `open`, même `isPasswordError`. Couvert par
  `pdf-load.test.ts` et `c12-pdf-navigateur.mjs`.
- Le Worker d'écriture PDF délègue à `pdfJobReply` : mêmes réponses (`{ bytes }`, `{ error }`), même transfert.
  Couvert par le test neuf de `pdfJobReply`, `pdf-overlay-vector.test.ts`, `c12-pdf-navigateur.mjs`.
- L'amorce prend son peintre vectoriel dans `vectorPainter` : même objet construit. Couvert par `c12-pdf-navigateur.mjs`.
- La CLI : `.pdf` n'est plus refusé en code 3 ; `formats` rend `read`/`write` vrais ; `export` vers une sortie non prise
  rend toujours 2 (plus de code 3 à l'export) ; le code 3 se contrôle sur `import … x.docx`. Couvert par
  `formats.test.ts`, `import.test.ts`, `export.test.ts`, `guards.test.ts`, `cli-essai.mjs`.
- La CLI évalue pdf.js à chaque démarrage (+0,3 s mesuré, H29) et filtre trois préfixes de `console.warn` (D34).
  Couvert par `quiet.test.ts` et le contrôle « stderr vide » de `cli-essai.mjs`.
- `THIRD_PARTY_NOTICES.md` dit la vraie licence des polices Liberation (texte seul, aucun fichier distribué ne change).

### Chantiers en cours

Aucun : `git worktree list` → `main` et `feat/cli-lot3` (48118ae) ; `gh pr list` : aucune PR ouverte. Aucune autre
machine donnée par l'orchestrateur.

### Termes cherchés

Graphe (`--graph ~/.cache/graphes/roomboard/graphify-out/graph.json`) : `query "openPdf exportPdf createPdfEngine
createVectorOverlay workerPdfWriter"` ; `affected` de `nodeBoardPorts`, `createVectorOverlay`, `createPdfEngine`,
`openPdfDocument`, `workerPdfWriter`, `hasPdfWriter`, `tryParseColor`, `exportPainterOptions`. Recherche texte :
`pdf|Pdf` dans `workspace.ts`, `main.ts`, `import.ts` ; `PdfjsBinding`, `PdfDom`, `renderTile`, `isPasswordError`,
`PasswordException` ; `pdfjsWorker`, `WorkerMessageHandler`, `@napi-rs/canvas`, `Cannot polyfill`, `function warn(`
dans `pdf.mjs` ; `optionalDependencies` de `pdfjs-dist` ; `write_pdf_pages`, `initSync` dans les tests ; `fillStyle =`,
`rgbaOf`, `valid_color` (`#rgb`, `#rrggbbaa`, noms CSS), `tryParseColor`, `parseColor`, `rgbOf`,
`aliceblue|rebeccapurple` ; `measureOrFallback`, `FALLBACK_CHAR_WIDTH` ; `PDF_FONT_FILES`, `standard_fonts`,
`LiberationSans`, `LICENSE_LIBERATION`, `Liberation` dans `THIRD_PARTY_NOTICES.md` ; `PDF_NO_PAGE_MESSAGE`,
`pdfFirstPagesMessage`, `exportPdfName`, `pdfExportedMessage` ; `typed` ; `PDF_PAGE_KIND`, `BackdropView` ;
`fond PDF non exporté`, `backdrop` dans `board-io.ts` ; `100 Mo` ; `vite:worker-import-meta-url` dans vite 6.4.6 ;
`git ls-files '*.pdf'`, `fabriques`, `threePages`, `readBack` ; `.pdf`, `lot 3`, `LOT_LIVRE`, `exportBlocked` dans
`apps/cli/src` et `cli-essai.mjs` ; `console.warn =`, `createRequire` dans `apps/cli`. Constats :
`pdf|apps/cli|one-shot|record` dans `docs/architecture-constats.md` (aucun ouvert dans les zones touchées, sauf
`workspace.ts:151` `typed` et `workspace.ts:552` BoardSources, ni aggravés ni corrigés). Coffre : `chercher.js
"roomboard cli pdf"`, `"roomboard workers en processus inlineWorker"`, `"pdfjs node canvas legacy"` ; `ls 02_Decisions`
(0283 absente).

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| ouvrir un PDF, nombre et taille des pages, chiffré | `apps/web/src/platform/pdf-render.ts:125` | `createPdfEngine(load: () => Promise<PdfjsBinding>, dom: PdfDom): PdfEngine` ; `PdfFile.pageCount`, `pageSize(i)`, `destroy()` | réutiliser |
| ouvrir pdf.js et libérer sa tâche | `apps/web/src/platform/pdf-load.ts:19` | `openPdfDocument(getDocument, data, options)` | réutiliser |
| lien pdf.js (`open`, mot de passe) à partir du module chargé | `pdf-load.ts:37-53` (`loadPdfjs`, `isPasswordError` en `:51`) | `pdfjsBinding(pdfjs: { getDocument(p: { data: Uint8Array } & Record<string, unknown>): PdfjsLoadingTask; readonly PasswordException: abstract new (...a: never[]) => unknown }, options: Record<string, unknown>): PdfjsBinding` ; `loadPdfjs` = `pdfjsBinding(pdfjs, { cMapUrl, cMapPacked, standardFontDataUrl, wasmUrl })` | étendre (extraire) |
| worker de pdf.js dans le processus | `pdfjs-dist/legacy/build/pdf.worker.mjs` (même module que `platform/pdf-worker.ts:5`), voie `globalThis.pdfjsWorker` de pdf.js | — | nouveau module `apps/cli/src/pdf-node.ts` : `loadNodePdfjs(): Promise<PdfjsBinding>` (= `pdfjsBinding(pdfjs, { verbosity: 0 })` après la pose de `pdfjsWorker`) ; `NO_RENDER: PdfDom` (`tile` lève) ; `nodePdfEngine(): PdfEngine` = `createPdfEngine(loadNodePdfjs, NO_RENDER)` (termes `pdfjsWorker`, `node` dans `pdf-load.ts` : aucun chargeur Node) |
| avertissements de pdf.js hors de stderr | — | — | nouveau module `apps/cli/src/quiet.ts` : `quietWarn(warn: (...a: unknown[]) => void): (...a: unknown[]) => void` (retire un appel dont le premier argument commence par l'un des trois préfixes de D34) et, à l'import, `console.warn = quietWarn(console.warn)` (terme `console.warn =` : rien) |
| lire un PDF en document (asset, original, 500 pages, avis) | `workspace.ts:510-553` | `readPdfFile(file: { readonly name: string; readonly blob: Blob; readonly original?: Blob }, deps: { readonly core: CoreFactory; readonly pdf: PdfEngine; makeAssets(): AssetStore }): Promise<{ doc: CoreDocument; assets: AssetStore; tabName: string; warnings: string[] }>` (rejette avec le message complet du produit) | nouveau (extraire) dans `app/pdf-convert.ts` |
| écrire un PDF (copie, assemblage, avis) | `workspace.ts:555-606` ; `pdf-export.ts:136` (`exportPdf`) | `writePdfFile(doc: CoreDocument, assets: Pick<AssetStore, "get">, deps: { readonly core: CoreFactory; now(): string; loadPdfLib(): Promise<PdfLib>; overlay(copy: CoreDocument): OverlayProducer; alive(): boolean; rasterPage?(blob: Blob, index: number): Promise<RasterPage \| null>; rasterClose?(): void }): Promise<(ExportResult & { readonly notices: readonly string[] }) \| null>` | nouveau (extraire) dans `app/pdf-convert.ts` |
| charger pdf-lib | `pdf-load.ts:55` | `loadPdfLib()` ; dans la CLI par `SessionDeps.loadPdfLib` (`io.pdfLib ?? loadPdfLib`) | réutiliser |
| superposition vectorielle | `pdf-overlay-vector.ts:85` | `createVectorOverlay(deps: VectorOverlayDeps): OverlayProducer` | réutiliser |
| peintre vectoriel du contenu | `main.ts:309` (dans `start()`, non appelable) | `vectorPainter(doc: CoreDocument): VectorOverlayDeps["painter"]` = `(ctx, images) => new Canvas2DRenderer(ctx, null, doc, exportPainterOptions(images, { makePath: () => new RecordingPath() as unknown as Path2D }))`, dans `pdf-overlay-vector.ts` ; `main.ts` l'appelle | étendre (extraire) |
| écrire la page krilla sans Worker | `pdf-vector-worker.ts:19-28` (corps non exporté) | `export interface PdfJob { ops: Float32Array; texts: string[]; fonts: Uint8Array; fontSizes: Uint32Array; images: Uint8Array; imageSizes: Uint32Array }` ; `pdfJobReply(mod: FormatsBinding, job: PdfJob): WorkerReply` dans `platform/container.ts` ; `workerPdfWriter` (`pdf-overlay-vector.ts:54`) construit un `PdfJob` | étendre (extraire) |
| Worker joué en processus | `one-shot-worker.ts:55` | `inlineWorker(handle)` ; `workerPdfWriter(spawn)` | réutiliser |
| écrivain PDF de la CLI, panique | patron `apps/cli/src/board-node.ts:22` | `nodePdfWriter(formats: () => Promise<FormatsBinding>, onPanic: () => void): PdfWriter` = `workerPdfWriter(inlineWorker(async (m) => { try { return pdfJobReply(await formats(), m as PdfJob) } catch (e) { onPanic(); throw e } }))`, dans `pdf-node.ts` ; `nodeSession` lui passe `io.formats ?? formats` | nouveau (câblage, aucun contrôle) |
| couleurs normalisées et mesure sans canvas | `webgl2.ts:23` (`tryParseColor`) ; `text-layout.ts:41-42` (`measureOrFallback`) | `nodeMeasureContext(): Pick<CanvasRenderingContext2D, "fillStyle" \| "font" \| "measureText">` (`fillStyle` : `#rrggbb` si alpha 1, sinon `rgba(r, g, b, a)` ; illisible : précédente gardée ; `measureText(t).width` = `measureOrFallback(null)(t, taille lue dans font)`), dans `pdf-node.ts` | nouveau (termes `aliceblue`, `parseColor`, `rgbOf` : aucun normaliseur CSS complet sans canvas) |
| polices de la superposition | `pdf-overlay-vector.ts:24` (`PDF_FONT_FILES`) ; amorce `main.ts:279-289` (par `fetch`) | `nodePdfFonts(): () => Promise<readonly Uint8Array[]>` (dossier `standard_fonts/` du `pdfjs-dist` résolu par `createRequire(import.meta.url)`, lecture une fois ; absente : `police <f> absente`), dans `pdf-node.ts` | nouveau (transport disque, la page lit par `fetch` ; aucune copie, D48) |
| image non lue avant écriture | `container-io.ts:82`, `controller.ts:11` | `missingOf(doc, assets)`, `UNREAD_ASSETS_MESSAGE` | réutiliser |
| ouvrir un PDF importé en onglet | `import.ts:68,263` | `ImportDeps.openPdf(file): Promise<boolean>` → `session.openPdf` | réutiliser |
| lire un `.pdf` par la session | `apps/cli/src/session.ts:154,167` | `readDoc` : branche `pdf` par `readPdfFile` ; `open` : `file` nul pour un `.pdf` (comme un tableau) ; `Session.openPdf(file: { readonly name: string; readonly blob: Blob }): Promise<boolean>` | étendre |
| écrire un `.pdf` depuis la CLI | `apps/cli/src/exporter.ts:44` (`exportBoardFile`, patron) | `exportPdfFile(session: Session, to: string): Promise<{ file: string; kind: "pdf"; pages: number; annotated: boolean }>` (`missingOf` ; D39 ; `session.write`) | étendre `exporter.ts` |
| table des formats | `apps/cli/src/formats.ts:11,54,101` | `.pdf` couvert, `LOT_LIVRE = 3`, `exportBlocked` retiré | étendre |
| PDF d'essai, relecture | `c12-pdf-navigateur.mjs:21-41` | `pdfPages(lib: { PDFDocument; StandardFonts }, n = 3, label = "RoomBoard page"): Promise<Uint8Array>` ; `readPdf(bytes: Uint8Array, libs: { pdfjs; PDFDocument; PDFName; PDFDict; PDFStream }): Promise<{ pages: number; texts: string[]; overlays: string[][] }>` (copie des octets avant pdf.js, qui détache le tampon) | nouveau module `scripts/essais/fabriques/pdf.mjs` (déplacé, jamais copié) |

## 4. Hypothèses à revoir

**Niveau 1 (difficiles à défaire ou visibles des utilisateurs)**

- H36 — Polices Liberation (GPL v2 avec exception de police) lues à l'exécution dans `pdfjs-dist` installé, jamais
  copiées (D48) : la CLI construite ne tourne qu'avec ses `node_modules` (le dépôt installé), et embarque ces polices
  dans les PDF qu'elle écrit, sous l'exception de police. Reste pour Jérôme : remplacer par une police OFL dans la page
  et la CLI.
- H23 — PDF d'origine refusé par pdf-lib : la CLI refuse (code 1, rien d'écrit) au lieu de sortir les pages en image
  comme la page (D39). Défaut : pas de rendu en image dans la CLI (hors périmètre, § 7 du lot 1).
- H24 — Superposition vectorielle en échec (police absente, image GIF, WebP, BMP, SVG à convertir, erreur ou panique
  krilla) : code 1, rien d'écrit ; la page retomberait sur un PNG. Une image non PNG/JPEG d'un `.roomboard` venu de
  l'application bloque donc son export PDF par la CLI jusqu'au lot 4.
- H25 — Couleurs nommées CSS (« red », admises par le cœur, `rich_text.rs:54`) : la superposition de la CLI garde la
  couleur précédente (noir au départ), comme une écriture illisible sur un canvas ; `#rgb`, `#rgba`, `#rrggbb`,
  `#rrggbbaa`, `rgb()`, `rgba()` sont exactes (`tryParseColor`).
- H26 — Texte de la superposition mesuré par le repli `0,6 × taille × longueur` (H1) : coupures de lignes d'un texte
  long différentes de l'application.
- H27 — Contrat : `export … x.pdf` rend `{"file","kind":"pdf","pages","annotated","notices"?}` ; `convert` garde sa
  sortie du lot 2 ; contenu hors des pages PDF (`cut`) : code 0 et avis ; `convert x.pdf y.iwb` : code 0 et l'avis
  « fonds PDF non exportés ».

**Niveau 2**

- H28 — Le filtre de D34 ne retire que trois préfixes ; une autre version de pdf.js qui change leur texte les laisserait
  passer sur stderr. Garde : le contrôle « stderr vide » de `cli-essai.mjs` sur le fichier construit (les tests Vitest ne
  le voient pas : pdf.js n'y avertit pas, H30) ; `quiet.test.ts` fige les préfixes.
- H29 — Démarrage de la CLI : +0,3 s (pdf.js évalué à chaque commande, fichier construit ~+3,4 Mo), mesuré au cadrage.
- H30 — `@napi-rs/canvas` : dans les tests non groupés, pdf.js peut le charger seul (frère dans le magasin pnpm, comme
  dans les tests web actuels) ; sans effet, aucun rendu n'est demandé.
- H31 — Polices absentes du `pdfjs-dist` installé : code 1 dès qu'une page a un dessin à superposer (`fonts()` est
  appelé pour toute superposition non vide, `pdf-overlay-vector.ts:110`) ; un PDF sans annotation s'exporte sans police.
- H32 — PDF chiffré, invalide ou sans page : code 1 (`format`), message du produit ; plus de 500 pages : code 0, avis
  « 500 premières pages importées sur N ».
- H33 — `convert x.pdf y.pdf` est permis (réassemblage par pdf-lib), sortie ≠ source.
- H34 — Un tampon passé à pdf.js est détaché : la CLI ne passe que des copies (`createPdfEngine` le fait déjà) ; les
  fabriques et l'essai aussi.
- H35 — Le PDF lu reste en mémoire (un asset) le temps du processus ; aucune borne de taille propre à la CLI (la borne
  de 100 Mo ne vaut que pour l'hôte web).

## 5. Décisions d'architecture

**DA11 — `app/pdf-convert.ts`, PDF sans onglet.**
Contexte : `openPdf` et `exportPdf` mêlent lecture ou écriture et onglet (`workspace.ts:510-606`), comme les tableaux
avant DA8. Décision : `readPdfFile` et `writePdfFile` (interfaces en 3), code déplacé tel quel ; `workspace.ts` garde
onglets, `exporting`, boîte d'enregistrement, nom proposé et avis. Conséquences : la page et la CLI partagent le même
chemin PDF ; la CLI n'écrit que le câblage Node.

**DA12 — pdf.js en Node : worker en processus, sans canvas.**
Contexte : pdf.js tourne dans un Worker de la page ; Node n'a ni Worker de page, ni canvas, ni polices système ; le fond
`pdf-page` garde la page source, pas une image. Décision : `globalThis.pdfjsWorker` = le module de worker de pdf.js
(voie en processus de pdf.js), lien par `pdfjsBinding` partagé avec la page, `createPdfEngine` avec un `PdfDom` qui
lève, aucun rendu ; `quiet.ts` retire trois avertissements. Conséquences : même code de lecture que la page ; aucun
paquet natif ni système ; pas de repli en image.

**DA13 — krilla dans le processus de la CLI.**
Contexte : la page écrit la superposition dans un Worker jetable (HR6) ; DA7 prévoyait d'en extraire le corps.
Décision : `pdfJobReply` (dans `platform/container.ts`) appelé par la coquille du Worker et, dans la CLI, par
`inlineWorker` sur `io.formats ?? formats` ; une `RuntimeError` relancée déclenche la règle D29. Conséquences : un seul
jeu de contrôles ; une panique de krilla interdit toute écriture suivante du processus.

**DA15 — Polices Liberation lues, jamais copiées (prise par l'agent).**
Contexte : les polices de la superposition (`PDF_FONT_FILES`) sont sous GPL v2 avec exception de police, et la notice
du dépôt dit à tort OFL-1.1. Décision : la CLI les lit à l'exécution dans `pdfjs-dist` installé, sans exemplaire dans
`dist/` ni dans le dépôt ; la notice est corrigée. Conséquences : la CLI exige son installation ; la page reste telle
quelle ; le passage à une police OFL est signalé à Jérôme comme reste.

**DA14 — Contrat du lot 3 (additif à DA2 et DA10) et découpage.**
Contexte : DA2 n'accepte que des ajouts. Décision : référence ci-dessous ; 7 tâches. Conséquences : schéma
`roomboard-cli/1` et codes 0/1/2/3 inchangés ; après ce lot, le code 3 ne sort plus que d'un `import` du lot 4.

| commande | changement | sortie stdout | codes |
|---|---|---|---|
| `state`, `run`, `tab.open`, `export <source>`, `convert <source>` | acceptent `.pdf` (onglet sans fichier) | `notices` si avis d'ouverture (D31) | chiffré, invalide, sans page : 1 ; `run x.pdf --save` : 2 |
| `import` | `.pdf` ouvert en onglet | rapport inchangé (`opened`) | 0 ; PDF refusé : 1 (import partiel, H10) ; format du lot 4 (`.docx`) : 3 |
| `export` | `<source> <sortie.pdf>` | `{"file":…,"kind":"pdf","pages":n,"annotated":bool,"notices"?:[…]}` | 0 ; 1 (image non lue, D39, H24) ; 2 (`--page`, `--ids`, `--all`, `--grid`, `--name`, sortie = source, sortie non prise) |
| `convert` | `.pdf` en source et en sortie | inchangée ; vers `.iwb`/`.ubz` : avis « fonds PDF non exportés » | 0 ; 1 ; 2 (dont `.docx` en source ou en sortie, règle T11 du lot 2) |
| `formats` | `.pdf` `read`/`write` vrais | inchangée | 0 |

Opération de `run` ajoutée : `{"op":"export","to":"x.pdf"}` (document entier de l'onglet actif).

Tâches (« ∥ » = parallèle, aucun fichier commun) :

| tâche | contenu | fichiers | dépend | durée |
|---|---|---|---|---|
| T1 | `pdf-convert.ts` : `readPdfFile`, `writePdfFile` ; `openPdf`, `exportPdf` délèguent | `app/pdf-convert.ts` (+ test), `app/workspace.ts` | — | 35 min |
| T2 ∥ T1 | `pdfjsBinding` ; `PdfJob`, `pdfJobReply`, coquille du Worker ; `vectorPainter` ; amorce | `platform/pdf-load.ts`, `platform/container.ts`, `pdf-vector-worker.ts`, `app/pdf-overlay-vector.ts`, `main.ts` et tests | — | 30 min |
| T3 ∥ T1, T2 | fabriques PDF déplacées ; notice des polices corrigée (D48) | `scripts/essais/fabriques/pdf.mjs` (+ `.d.mts`), `c12-pdf-navigateur.mjs`, `THIRD_PARTY_NOTICES.md` | — | 20 min |
| T4 | CLI : `pdf-node.ts` (`loadNodePdfjs`, `nodePdfEngine`, `nodeMeasureContext`, `nodePdfFonts`, `nodePdfWriter`), `quiet.ts` et son test, `pdfjs-dist`, types du worker | `apps/cli/src/pdf-node.ts`, `quiet.ts`, `bin.ts`, `package.json`, `pnpm-lock.yaml` et tests | T2 | 40 min |
| T5 | CLI : `SessionDeps` (`loadPdfLib`, `pdf`, `pdfWriter`), `TestableIO.pdfLib` ; lire un PDF (`readDoc`, `open`, `openPdf`, `import`, `state`, `convert` depuis `.pdf`), `.pdf` couvert en lecture | `session.ts`, `importer.ts`, `exporter.ts`, `formats.ts`, `testing.ts` et tests | T1, T3, T4 | 35 min |
| T6 | CLI : écrire un PDF (`exportPdfFile`, `export`, `convert`, op `export`, D39, D29), couvert en écriture, `LOT_LIVRE = 3`, `exportBlocked` retiré, contrôles du code 3 sur `import x.docx` | `exporter.ts`, `session.ts`, `main.ts`, `formats.ts` et tests | T5 | 35 min |
| T7 | `cli-essai.mjs` (S5, stderr vide), `USAGE`, profil § CLI | `scripts/essais/cli-essai.mjs`, `main.ts`, `.claude/chantier.md` | T6 | 25 min |

## 6. Scénarios d'acceptation

- **S1 — Lire un PDF.** Avec `pdfPages(lib, 3)` : `convert three.pdf /tmp/p.roomboard` rend 0 et `pages` 3 ; `state
  /tmp/p.roomboard` : 3 pages de 1920 de large, chaque `backdrop.kind` = `pdf-page`, `backdrop.page` 0, 1, 2, un seul
  asset `application/pdf` ; `state three.pdf` donne les mêmes pages ; `import a.roomboard three.pdf` : `opened` le
  liste ; `run three.pdf --save` rend 2, rien d'écrit ; un PDF de 501 pages : code 0, 500 pages, avis « 500 premières
  pages importées sur 501 » ; `%PDF-1.4\n%%EOF` : code 1 « Ouverture impossible ».
- **S2 — Annoter et exporter le PDF.** `run /tmp/p.roomboard --save` avec un rectangle et un texte « Annotation CLI »
  sur `$page:1` ; `export /tmp/p.roomboard /tmp/p.pdf` : `{"kind":"pdf","pages":3,"annotated":true}` ; relu par
  `readPdf` : 3 pages, page 2 contient « RoomBoard page 2 » et « Annotation CLI », superposition `/Form` sur la page 2
  seule ; stderr vide.
- **S3 — Aller-retour, tableaux et document sans PDF.** `convert /tmp/p.pdf /tmp/back.roomboard` : 3 pages à fond
  `pdf-page` ; `convert three.pdf /tmp/t.iwb` (et `.ubz`) : code 0, avis « fonds PDF non exportés » dans `notices` ;
  `export a.roomboard /tmp/a.pdf` (sans fond PDF) : 1 page de 842 pt, `annotated` faux ; `export a.roomboard /tmp/a.pdf
  --ids x` : 2 ; `convert /tmp/p.pdf /tmp/p.PDF` : 2 ; `new /tmp/z.pdf` : 2.
- **S4 — Refus sans écriture.** PDF que pdf-lib refuse (faux `PdfLib` par `TestableIO.pdfLib`) : code 1, message de
  D39, aucun fichier ; panique de `write_pdf_pages` (faux module par `TestableIO.formats`) : code 1, puis tout `save` du
  même processus refusé (D29) ; document dont une image GIF est annotée (fabriqué par le cœur dans le test) : code 1
  (H24) ; `formats` : `.pdf` `read`/`write` vrais ; `import a.roomboard x.docx` : code 3, « lot 4 » ; `convert a.roomboard
  x.docx` : code 2.
- **S5 — Essai de `verifier.sh` (`cli-essai.mjs`).** En plus des 64 contrôles des lots 1 et 2 : PDF fabriqué par
  `pdfPages` ; **page comptée** (`convert` puis `state` : 3 pages ; PDF exporté relu : 3 pages) ; **texte retrouvé**
  (« RoomBoard page 2 » et le texte de l'annotation dans le PDF exporté) ; **fond présent** (`backdrop.kind` =
  `pdf-page` sur chaque page, asset `application/pdf` cité, avant et après l'aller-retour) ; **stderr vide** des
  commandes PDF réussies ; D23 pour `.pdf` ; `formats` ; code 3 sur `import … x.docx`, code 2 sur `convert` vers
  `.docx` ; affiche `CLI : OK`.

## 7. Hors périmètre

- Lot 4 : Office (conversion par la coque), médias, 3D, images GIF, WebP, BMP, ICO, SVG, AVIF, HEIC (lecture, et
  conversion en PNG pour l'export PDF, H24).
- Rendu en image d'une page (repli en image de l'export, superposition PNG, capture) : aucun canvas dans la CLI.
- Changement de police de la page (Liberation → police OFL) : reste signalé à Jérôme (D48) ; seule la notice est
  corrigée.
- Toute ligne Rust ; seuils des modules Wasm ; `roomboard-prive` ; coque Tauri ; paquet système ; `@napi-rs/canvas`.
- Constats ouverts que le code déplacé emporte (`workspace.ts:151` `typed`, `workspace.ts:552` BoardSources) : ni
  corrigés ni aggravés.
- Fichiers téléchargés ; toute écriture hors d'un dossier temporaire dans les tests.

## 8. Portes immédiates

Aucune.
