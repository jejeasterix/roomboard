# Cadrage — cli

Cadrage autonome (étage 1, cadreur), 2026-11-23. Graphe graphify de RoomBoard absent (`~/.cache/graphes/roomboard/graphify-out/`
introuvable au cadrage) : liens de code établis par lecture et recherche texte, colonne V/S en conséquence.

## 1. Demande et gabarit

**Demande** : donner à RoomBoard une CLI complète, pour qu'un agent pilote et prouve chaque fonction du produit sans
interface graphique (ouvrir, créer, enregistrer ; éléments, pages, onglets, annuler et rétablir ; import et export de
tous les formats ; état lisible en JSON), en s'appuyant sur `roomboard-core` et `roomboard-formats` sans dupliquer leur
logique, puis tenue à jour par chaque chantier (Jérôme, 2026-11-23 ~22:15, précisé par le canal Outillage).

**Gabarit** : chantier, découpé en lots. **Ce chantier exécute le lot 1 seul** (4 tâches séquentielles, ~2 h 15
d'exécution, arrêt ferme vers 02 h 45). Les lots 2 à 4 sont écrits en section 7 pour des chantiers suivants.

Contre-relecture, tour 1 (2026-11-23 ~22:50) : points 1 à 3 et mineurs intégrés ; l'insertion de `.rbitem` (DA5) passe
au lot 2 pour tenir le lot 1 ; un point contesté avec preuve (fixture `.xlsx`, voir S5).

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| D1 | Rust, Node ou les deux | **CLI Node en TypeScript**, paquet `apps/cli` (`@roomboard/cli`), qui charge les deux modules Wasm existants et importe les modules TS de `apps/web`. Aucune crate Rust neuve. Raison : la moitié de chaque format vit en TS (ZIP, `.olf`, conteneur Bamboo, passage BoardList → commandes, assemblage PDF, magasin d'assets) ; une crate Rust les recopierait. | coffre `02_Decisions/0266`, `0268`, `0269` (ZIP, `.olf`, Bamboo en TS) ; `apps/web/src/app/board-io.ts:528` (`buildBoardDocument`), `:655` (`boardListOf`) ; `apps/web/src/app/container-io.ts:85` ; `apps/web/src/app/pdf-export.ts:136` | oui (paquet neuf, rien d'autre n'en dépend) |
| D2 | Chargement du Wasm | `initSync` sur les octets des `.wasm` déjà produits par `verifier.sh` (`apps/web/src/wasm/`, `apps/web/src/wasm-formats/`, ignorés par git, `.gitignore:5-6`), copiés à côté du paquet au build de la CLI. La colle wasm-bindgen est chargée par **`import()` dynamique** dans le seul `apps/cli/src/wasm-node.ts` (précédent `platform/container-load.ts:1-3`) : aucun test ne la résout statiquement. Tests au vrai Wasm : sautés si le `.wasm` manque, sauf `ROOMBOARD_WASM_REQUIRED=1` (posé par `verifier.sh`) qui les fait échouer ; tests purs (lecture des opérations, références, formats) toujours joués. Aucune ligne Rust touchée : tailles des deux modules **inchangées à l'octet**. | `apps/web/src/core/wasm-core.contract.test.ts:14-21` ; `platform/container-load.ts:1-3` ; `scripts/verifier.sh` (`WASM_OUT`, `FORMATS_OUT`) | oui |
| D3 | Lancement et build | `node apps/cli/dist/roomboard.mjs <commande>` ; script `build` = `tsc --noEmit && vite build --ssr src/main.ts` (même ordre que `apps/web`, donc après la construction du Wasm), `ssr.noExternal: true`, `build.rollupOptions.output.inlineDynamicImports: true` (un seul fichier : `container-io.ts:14` atteint `host-tauri.ts`, dont les `import()` des paquets Tauri, l.301-306, feraient des morceaux séparés ; ils sont inclus et jamais exécutés) ; `bin: { "roomboard": "dist/roomboard.mjs" }`. Enregistrement atomique (fichier temporaire du même dossier, puis `rename`). | hypothèse (H5) ; `apps/web/package.json` (`build`) | oui |
| D4 | Commandes | 8 commandes : `version`, `formats`, `new`, `state`, `run`, `apply`, `import`, `export` (contrat exact en 5, DA2). | brief | oui |
| D5 | Annuler, rétablir sans session persistante | **Session JSONL** : `run` joue une suite d'opérations dans un seul processus, l'historique vit le temps de la session ; `{"op":"undo"}`, `{"op":"redo"}`. Rien n'est écrit dans le fichier. | `crates/roomboard-core/src/history.rs:14`, `document.rs:494-516` (historique en mémoire) ; format `.roomboard` inchangé (DA3) | oui |
| D6 | Langage des opérations | Les commandes du cœur telles que l'interface les envoie : l'union `Command` de `core/api.ts` en JSON (`{"type":"AddShape",…}`), plus des opérations de la CLI (`{"op":…}`). Tableaux JSON convertis en `Float32Array` pour `points` et `path`. Références aux ids créés : `"$3"`, `"$3.1"`, `"$page:0"`. | `apps/web/src/core/api.ts:52-200` (`Command`), `:339` (`apply`) | oui |
| D7 | Onglets | Un onglet de la CLI = un document ouvert dans la session ; liste gérée par `createTabs` (12 au plus, même règle de fermeture que l'application), avec des ids **déterministes** `t1`, `t2`… (compteur passé en `newId`) ; référence `"$tab:i"` = onglet d'indice i de `tab.list()`. Opérations `tab.new`, `tab.open`, `tab.select`, `tab.close`, `tab.list`. | `apps/web/src/app/tabs.ts:31` (`createTabs(newId)`) | oui |
| D8 | Sortie | JSON sur stdout, une ligne par résultat ; état au schéma `roomboard-cli/1` (DA4) ; vues des éléments et pages telles que `wasm-core.ts` les rend. | `apps/web/src/core/wasm-core.ts:169` (`toElementView`), `:360` (`toPageView`) | oui tant que les ajouts restent additifs |
| D9 | Erreurs et code 3 | stderr : une ligne JSON `{"error":{"code":…,"message":…}}`. Codes : 0 succès, 1 refus (cœur, fichier illisible, import partiel), 2 usage, 3 format pas encore pris. **Mécanisme du code 3** : table `FORMAT_LOTS` de `apps/cli/src/formats.ts`, clé = extension de `IMPORT_EXTENSIONS` (`files.ts:85`) et de `OFFICE_EXTENSIONS` (`office-import.ts:14`), valeur `{ lot, read, write, handler }` (`handler` = id du lecteur de `import.ts` : `roomboard`, `rbitem`, `sheet`, `image`, `pdf`, `iwb`…) ; avant `createImporter`, une source dont le lot dépasse `LOT_LIVRE` (1) sort en code 3 sans rien lire ni écrire. Un test vérifie que chaque entrée de `IMPORT_EXTENSIONS` et `OFFICE_EXTENSIONS` est une clé de la table ; `formats` la rend telle quelle (aucune table recopiée à la main). Avis du produit (« notify ») dans `notices`. | hypothèse (H3) ; `import.ts:332-370` (sans `openPdf`, aucun lecteur PDF n'est enregistré ; `.docx` sortirait `failed` par `officeWebHandler`, `office-import.ts:146-154` : d'où le contrôle avant l'importeur) | oui |
| D10 | Import d'objets | Par l'entrée unique `createImporter` avec des dépendances Node et la cible sans écran `headlessTarget`. Lot 1 : `.roomboard` (ouvert en onglet), `.xlsx`, images PNG et JPEG. `.rbitem` : lu par `state`, inséré au lot 2. | `apps/web/src/platform/import.ts:332` (U23 : seule chaîne des fichiers) | oui |
| D11 | Mesure du texte hors navigateur | Extraire `measureOrFallback(ctx)` dans `engine/text-layout.ts`, utilisée par `main.ts`, `annotate-start.ts` et la CLI (repli `0,6 × taille × longueur`). Ferme le constat `apps/web/src/annotate-start.ts:32`. | `docs/architecture-constats.md` (constat C11a, duplication) ; `main.ts:215`, `annotate-start.ts:32` | oui |
| D12 | `.rbitem` au lot 1 | **Export seul** : `doc.extract(page, ids)` puis `io.encode(…, { kind: "fragment", name })` (deux interfaces existantes) ; `state` lit un `.rbitem` par `io.read(name, bytes, "fragment")`. Insertion d'un `.rbitem` et export de grille : lot 2, avec le port `FragmentTab` (DA5). Écart connu : ces deux appels recoupent `encodeSelection` (`fragments.ts:147-160`), qui n'est pas appelable sans `TabSession` (critère « accessible » non rempli, donc pas net) ; le lot 2 le ferme en passant la CLI par `encodeIds`. | `apps/web/src/app/fragments.ts:26-56,147-160` ; `container-io.ts:85` | oui |
| D13 | Découpage | Lot 1 (ce chantier, 4 tâches séquentielles, ~2 h 15) : socle et formats, état et session, import et export, essai et profil (détail en DA6). Lot 2 : insertion `.rbitem` (DA5), tableaux blancs, `.rbpack`, `convert`. Lot 3 : PDF. Lot 4 : Office, médias, 3D, autres images. | taille mesurée ; heure d'arrêt donnée par l'orchestrateur | oui |
| D16 | Lecture du classeur dans l'instance qui enregistre | La CLI lit le `.xlsx` par `gridOf(mod.SheetReader.open(bytes))` dans son propre module, sans Worker jetable. La règle de la page (DAB4, HR6, `sheet-reader.ts:2-8` : une panique Wasm ne doit pas abattre l'instance qui enregistre) vise un onglet ouvert longtemps ; la CLI est un processus court, l'enregistrement est atomique (D3) et une panique ne laisse aucun fichier à moitié écrit (H8). | `apps/web/src/platform/sheet-reader.ts:2-8,48` | oui |
| D14 | Essai de `verifier.sh` | Toujours joué (hors `--e2e`, aucun navigateur) après le build web : `pnpm --filter @roomboard/cli build` puis `node scripts/essais/cli-essai.mjs` (scénario S5). Les tests de `apps/cli` passent par `ROOMBOARD_WASM_REQUIRED=1 pnpm -r test`. | brief ; `scripts/verifier.sh` | oui |
| D15 | Profil | Ajouter une section `## CLI` au profil (7e rubrique du modèle) : « Oui, en écriture, cible locale seulement : `node apps/cli/dist/roomboard.mjs` sur des fichiers du worktree ou d'un dossier temporaire ; essai de référence `node scripts/essais/cli-essai.mjs` ; un chantier qui ajoute une commande, un format ou un champ de l'état met à jour la CLI, `formats`, et cet essai. » | `~/.claude/skills/nouvelle-feature/references/profil-chantier.md:71` | oui |

## 3. Carte d'impact

Ligne « Surfaces d'impact » absente du profil : rubriques déduites du code (CLI, modules web réutilisés, cœur et Wasm,
persistance, formats, scripts et profil, tests, autres dépôts).

### 3.1 CLI

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/cli/` (neuf : `package.json`, `vite.config.ts`, `tsconfig.json`, `src/`) | oui | le paquet de la CLI (D1, D3) | V (absent aujourd'hui) |
| `pnpm-workspace.yaml:2` (`apps/*`) | non | prend `apps/cli` sans changement | V |
| `pnpm-lock.yaml` | oui | nouveau paquet du workspace (dépendances déjà au verrou, plus `@types/node`, H5) | V |
| `docs/plans/usage-c11a-annotation-cadrage.md:187-191` (§ 3.6 « aucune CLI ») | non | constat de départ, historique | V |

### 3.2 Modules web réutilisés ou étendus

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/engine/text-layout.ts:30` (`measureWith`) | oui | ajout de `measureOrFallback` (D11) | V |
| `apps/web/src/main.ts:214-215` | oui | appelle `measureOrFallback` | V |
| `apps/web/src/annotate-start.ts:31-32` | oui | appelle `measureOrFallback` | V |
| `apps/web/src/app/fragments.ts:26-56`, `:147-200` | non (lot 2) | port `FragmentTab` reporté au lot 2 (D12, DA5) | V |
| `apps/web/src/app/workspace.ts:348-363`, `:838-892` | non (lot 2) | adaptateur `view` au lot 2 (~8 lignes) | V |
| `apps/web/src/engine/engine.ts:180` (`DEFAULT_PEN_STYLE`), `text-layout.ts:11` (`DEFAULT_TEXT_SIZE`) | non | constantes importées par `headlessTarget.textStyle()` | V |
| `apps/web/src/engine/camera.ts:12` (`IDENTITY`), `core/api.ts:445` (`PAGE_HEIGHT`) | non | caméra et scène de `headlessTarget` | V |
| `apps/web/src/core/wasm-core.ts:716` (`createWasmCore`) | non | réutilisé tel quel | V |
| `apps/web/src/core/asset-store.ts` (`createAssetStore`) | non | réutilisé (Node a `crypto.subtle` et `Blob`) | V |
| `apps/web/src/app/container-io.ts:85` | non | réutilisé : lecture, écriture `.roomboard` et `.rbitem` | V |
| `apps/web/src/platform/container.ts:127` (`createPageCodec`) | non | réutilisé avec un chargeur Node | V |
| `apps/web/src/platform/import.ts:332` (`createImporter`) | non | réutilisé avec des dépendances Node | V |
| `apps/web/src/platform/image-import.ts:100` (`probeSize`), `:201` (`imageHandler`) | non | taille PNG/JPEG lue sans décodage | V |
| `apps/web/src/platform/sheet-reader.ts:48` (`gridOf`) | non | classeur lu par la liaison, sans Worker | V |
| `apps/web/src/platform/table-insert.ts:47` (`insertTableGrid`) | non | appelé par `sheetHandler` | V |
| `apps/web/src/app/tabs.ts:31` (`createTabs`) | non | onglets de la session | V |
| `apps/web/src/platform/controller.ts:10` (`APP_VERSION`) | non | version écrite au manifeste | V |

### 3.3 Cœur Rust et modules Wasm

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core/` | non | appelé par le module Wasm, aucune ligne changée | V |
| `crates/roomboard-wasm/` (1 374 398 o / 1 572 864) | non | taille inchangée à l'octet | V |
| `crates/roomboard-formats/`, `crates/roomboard-formats-wasm/` (2 794 511 o / 3 145 728) | non | taille inchangée à l'octet | V |
| `crates/roomboard-shell/` | non | ne porte ni ouvrir ni enregistrer un document (fichiers accordés, Office, capture) ; Office au lot 4 | V |

### 3.4 Persistance

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| format `.roomboard` (`crates/roomboard-core/src/format/mod.rs:203-240`, `roomboard-formats/src/container.rs:73`) | non | écrit par les mêmes fonctions ; rien d'ajouté au fichier (D5) | V |
| format `.rbitem` (`format/mod.rs:413-433`) | non | idem | V |

### 3.5 Formats (carte complète, lire et écrire)

| format | lire / écrire | logique aujourd'hui | lot |
|---|---|---|---|
| `.roomboard` | L, É | `container-io.ts:85` → `roomboard-formats/src/container.rs:73,114` ; cœur `format/mod.rs` | 1 |
| `.rbitem` objets | É ; L par `state` | `container-io.ts:85` ; cœur `extract` | 1 |
| `.rbitem` objets et grille | insertion ; É de grille | `fragments.ts:147-200` ; `import.ts:169` | 2 |
| `.xlsx`, `.xlsm` (valeurs) | L | `roomboard-formats/src/sheet.rs:280` ; `sheet-reader.ts:48` ; `table-insert.ts:47` | 1 |
| PNG, JPEG | L | `image-import.ts:100,201` | 1 |
| `.rbpack` | L, É | `platform/rbpack.ts:50,83` ; ZIP `zip-worker.ts:83,91` ; `app/library.ts:126` | 2 |
| `.iwb` (ZIP ou XML), `.ubz` | L, É | lecture `roomboard-formats/src/board/read.rs:1869` ; écriture `board/write.rs:398,428` ; ZIP `zip-worker.ts:91,83` ; orchestration `workspace.ts:608` (`openBoard`), `:676` (`exportBoard`) ; `board-io.ts:199,263,528,655` | 2 |
| `.notebook` | L | `board/notebook.rs:9`, `board/read.rs` ; `workspace.ts:608` | 2 |
| `.olf` | L | `app/olf-read.ts:287` (TS seul) ; `zip-worker.ts:137` | 2 |
| `.flipchart` | L | Bamboo `platform/bamboo.ts:141`, `zip-worker.ts:73` ; objets `roomboard-formats/src/flipchart/read.rs:144` | 2 |
| PDF | L | `pdfjs-dist` (`platform/pdf-load.ts:20`) ; `workspace.ts:510` (`openPdf`) ; cœur `fromPdfPages` | 3 |
| PDF | É | `app/pdf-export.ts:136` (`pdf-lib`) ; superposition `app/pdf-overlay-vector.ts:85` → `roomboard-formats/src/pdf.rs:488` (krilla) ; `workspace.ts:555` | 3 |
| Office `.docx .odt .pptx .odp .doc .xls .ppt .ods` | L | conversion en PDF par la coque : `crates/roomboard-shell/src/office.rs:198,571` ; `platform/office-import.ts:117` | 4 |
| médias (mp4, m4v, mov, webm, ogv, m4a, mp3, wav, ogg, oga) | L | `platform/media-import.ts:310` (sonde du navigateur) | 4 |
| 3D (glb, gltf, obj, mtl, stl, ply, bin, zip) | L | `platform/model3d-handlers.ts:147,170` (rendu three.js) | 4 |
| GIF, WebP, BMP, ICO, SVG, AVIF, HEIC | L | `platform/image-decode.ts:35` (décodage du navigateur) | 4 |

### 3.6 Scripts, profil, documentation

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/verifier.sh` (après `pnpm --filter @roomboard/web build`) | oui | build de la CLI et essai S5 (D14) | V |
| `scripts/essais/cli-essai.mjs` (neuf) | oui | essai de bout en bout | V |
| `.claude/chantier.md` | oui | section `## CLI` (D15) | V |
| `scripts/controle-licences.mjs` | non | doit rester vert avec `@types/node` (MIT) | V |
| `scripts/controle-hors-ligne.mjs` | non | ne lit que `apps/web/dist` | V |

### 3.7 Tests

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/cli/src/*.test.ts` (neufs, vitest) | oui | purs : lecture des opérations, références `$n`/`$page:i`/`$tab:i`, table `FORMAT_LOTS` couvrant `IMPORT_EXTENSIONS` et `OFFICE_EXTENSIONS` ; au vrai Wasm (sautés sans `.wasm`, exigés sous `ROOMBOARD_WASM_REQUIRED=1`) : état, session, onglets, import, export, codes de sortie | S |
| `apps/web/src/app/fragments.test.ts` | non | à garder vert (non touché au lot 1) | V |
| `apps/web/src/engine/text-layout.test.ts` (ou voisin) | oui | `measureOrFallback` | S |
| `apps/web/src/app/workspace.test.ts` | non | à garder vert (copier, coller, exporter la sélection) | V |
| `apps/web/src/core/wasm-core.contract.test.ts` | non | à garder vert ; patron du chargement Node | V |
| `apps/web/src/platform/import.test.ts` | non | à garder vert | V |
| `cargo test --workspace` | non | à garder vert, aucune ligne Rust | V |

### 3.8 Autres dépôts

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `roomboard-prive` | non | hors périmètre (fichier d'état) | S |

### Effets de bord sur l'existant

- `main.ts` et `annotate-start.ts` passent par `measureOrFallback` : même mesure, même repli. Couvert par le test neuf de
  `measureOrFallback` et `scripts/essais/c11a-annotation-navigateur.mjs` (`--e2e`).
- `verifier.sh` construit et joue la CLI : un module Wasm absent fait échouer l'essai (voulu). Couvert par
  `scripts/essais/cli-essai.mjs`.

### Chantiers en cours

Aucun : `git worktree list` ne montre que `main` et `feat/cli` ; `gh pr list` ne rend aucune PR ouverte.

### Termes cherchés

Graphe : aucune requête (graphe absent). Recherche texte (`grep -rn` dans le worktree) : `pub fn` de
`roomboard-core/src/{document,history,commands,format/mod}.rs` ; `pub fn` de `roomboard-formats/src/**` et de
`roomboard-formats-wasm/src/lib.rs` ; `pub fn|pub mod` de `roomboard-shell/src/*.rs` ; `#[wasm_bindgen]|pub fn` de
`roomboard-wasm/src/lib.rs` ; `initSync`, `ROOMBOARD_WASM_REQUIRED` ; `createImporter`, `id: "` dans `platform/*.ts` ;
`EXTENSION`, `IMPORT_EXTENSIONS` ; `createContainerIO`, `createPageCodec`, `loadFormatsModule` ; `openBoard`,
`exportBoard`, `openPdf`, `exportPdf`, `openDocument` dans `workspace.ts` ; `insertFragment`, `encodeSelection` ;
`measureWith`, `s.length * size * 0.6` ; `createTabs` ; `probeSize`, `createImageBitmap` ; `gridOf`, `insertTableGrid` ;
`onmessage` des Workers ; `APP_VERSION` ; `cli`, `CLI` dans `docs/` et `.claude/chantier.md`. Contre-relecture, tour 1 : `OFFICE_EXTENSIONS`, `officeWebHandler`,
`apps/web/src/wasm` dans `.gitignore`, `import()` de `host-tauri.ts`, `DEFAULT_TEXT_SIZE`, `DEFAULT_PEN_STYLE`,
`IDENTITY` (`camera.ts`), `PAGE_HEIGHT`, `anchorOf`, `placement`, `@types/node` au verrou, `xlsx` dans
`scripts/essais/` et `git ls-files crates/roomboard-formats/tests/fixtures`. Coffre :
`chercher.js "RoomBoard CLI"`, `"roomboard wasm node formats"`.

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| appliquer une commande, lire pages, éléments, assets, annuler, rétablir | `apps/web/src/core/wasm-core.ts:716` | `createWasmCore(mod): CoreFactory` ; `CoreDocument.apply/undo/redo/pageIds/elementIds/element/page/citedAssets/points` | réutiliser |
| charger les modules Wasm en Node | patron `wasm-core.contract.test.ts:14-20` | `initSync({ module: bytes })` de la colle wasm-bindgen | nouveau module `apps/cli/src/wasm-node.ts` : `loadCore(dir: URL): CoreFactory` ; `loadFormats(dir: URL): () => Promise<FormatsBinding>` (aucun chargeur Node existant : termes `initSync`, `loadFormatsModule`) |
| lire et écrire `.roomboard`, `.rbitem` avec assets | `apps/web/src/app/container-io.ts:85`, `platform/container.ts:127` | `createContainerIO({ core, codec: createPageCodec(loadFormats(dir)), say, makeAssets })` ; `encode`, `read` | réutiliser |
| magasin d'assets | `apps/web/src/core/asset-store.ts` | `createAssetStore()` | réutiliser |
| reconnaître et importer un fichier | `apps/web/src/platform/import.ts:332` | `createImporter(deps).importFiles(files, at)` | réutiliser |
| taille d'une image sans décodeur | `apps/web/src/platform/image-import.ts:100` | `probeSize(blob, kind)` dans le `decode` passé à `createImporter` | réutiliser |
| lire un classeur | `apps/web/src/platform/sheet-reader.ts:48` | `gridOf(mod.SheetReader.open(bytes))` dans `readSheet` | réutiliser |
| poser le tableau importé | `apps/web/src/platform/table-insert.ts:47` | par `sheetHandler` | réutiliser |
| cible des objets importés sans écran | `ImageTarget` (`image-import.ts:180-198`) | `assets` = magasin de l'onglet ; `page()` = page choisie ; `camera()` = `IDENTITY` (`engine/camera.ts:12`) ; `stageRect()` = `{ left: 0, top: 0, width: PAGE_WIDTH (1920), height: PAGE_HEIGHT (1080) }` (`core/api.ts:445`) ; `measure()` = `measureOrFallback(null)` ; `textStyle()` = `{ color: DEFAULT_PEN_STYLE.color, size: DEFAULT_TEXT_SIZE }` (`engine.ts:180`, `text-layout.ts:11`, même règle que `engine.ts:460`) ; `run(cmd)` = `doc.apply(cmd)` (null et erreur en avis si refus) ; `insertFragment` absent au lot 1 | nouveau module `apps/cli/src/target.ts` : `headlessTarget(tab: CliTab, page: string, notices: string[]): ImageTarget` (termes `ImageTarget`, `stageRect` : seules implémentations liées au DOM) |
| mesure du texte hors navigateur | `apps/web/src/engine/text-layout.ts:30` | `measureOrFallback(ctx: CanvasRenderingContext2D \| null): Measure` | étendre |
| exporter des ids en `.rbitem` | cœur `extract` (`api.ts:381`), `container-io.ts:85` | `doc.extract(page, ids)` puis `io.encode(frag, assets, now, APP_VERSION, { kind: "fragment", name })` | réutiliser (écart connu avec `encodeSelection`, D12, fermé au lot 2) |
| insérer un `.rbitem`, exporter une grille | `apps/web/src/app/fragments.ts:26-56` | `createFragmentOps<T>(deps: FragmentDeps<T>)`, `view(tab: T): FragmentTab`, `alive(tab: T)` ; `FragmentTab` en DA5 | étendre, **lot 2** |
| formats et lots | `IMPORT_EXTENSIONS` (`files.ts:85`), `OFFICE_EXTENSIONS` (`office-import.ts:14`), ids des lecteurs (`import.ts:142-369`) | clés de la table | nouveau module `apps/cli/src/formats.ts` : `FORMAT_LOTS: Readonly<Record<string, { lot: 1 \| 2 \| 3 \| 4; read: boolean; write: boolean; handler: string }>>`, `LOT_LIVRE = 1`, `lotOf(name: string): number \| null` (termes `lot`, `formats`, `supported` : rien) |
| onglets | `apps/web/src/app/tabs.ts:31` | `createTabs<CliTab>(newId)` | réutiliser |
| état en JSON | vues de `wasm-core.ts:169,360,370` | `element(id)`, `page(id)`, `citedAssets()` sérialisés tels quels | nouveau module `apps/cli/src/state.ts` : `stateOf(tabs, opts: { points: boolean }): CliState` (termes `toJSON`, `stateOf`, `serialize` : rien côté web) |
| session JSONL, références `$n` | — | — | nouveau module `apps/cli/src/session.ts` : `createSession(deps: SessionDeps): { exec(line: unknown): Promise<OpResult> }` (termes `jsonl`, `batch`, `script` : rien) |
| ligne de commande | — | — | nouveau module `apps/cli/src/main.ts` : `main(argv: readonly string[], io: CliIO): Promise<number>` |

## 4. Hypothèses à revoir

**Niveau 1 (difficiles à défaire ou visibles des utilisateurs)**

- H1 — Mesure du texte de la CLI par le repli `0,6 × taille × longueur` : hauteurs de lignes d'un tableau importé
  différentes de l'application. Défaut : accepté au lot 1 (même repli que l'amorce sans toile). À revoir si un agent doit
  prouver la mise en page exacte (police embarquée et mesure par `fontkit` ou krilla, lot 3).
- H2 — Images JPEG insérées à la taille de l'en-tête (`probeSize`) sans orientation EXIF : une photo tournée garde ses
  dimensions brutes, alors que l'application applique l'EXIF. Défaut : accepté au lot 1, noté dans `formats`.
- H3 — Codes de sortie 0/1/2/3 et erreur JSON sur stderr (D9) : contrat que les agents liront. Défaut posé, figé par les
  tests de `apps/cli`.

**Niveau 2**

- H4 — Une session s'arrête à la première opération refusée (code 1) ; les opérations déjà jouées restent en mémoire, le
  fichier n'est écrit que par un `save` explicite (ou `--save` en fin de session). Pas de `--continuer`.
- H5 — Build par `vite build --ssr` (vite déjà au verrou) et `@types/node` épinglé à `26.6.6` sans `^` (MIT, déjà au
  verrou, `pnpm-lock.yaml:688`), en devDependency de `apps/cli` seul.
- H6 — Date du manifeste : `ROOMBOARD_NOW` si posée (essais reproductibles), sinon l'heure du système.
- H7 — Scène fixe de la CLI : 1920 × 1080 à l'origine, caméra identité. Un objet sans `--at` va au centre (960, 540) ;
  une image plus grande que 80 % de la scène (1536 × 864) est réduite comme dans l'application (`placement`,
  `image-import.ts:166-178`) ; cascade de 24 px. `--at x,y` hors de la scène : la page retomberait au centre sans avis
  (`anchorOf`, `image-import.ts:146-152`), la CLI refuse donc en code 2 avant tout import.
- H9 — « Réimporter » au lot 1 = relire le `.rbitem` exporté par le lecteur du conteneur (`state x.rbitem`) ; l'insertion
  dans un autre tableau arrive au lot 2 (DA5). Écart au brief assumé pour tenir l'heure d'arrêt.
- H8 — Une panique Wasm pendant une session tue le processus (pas de Worker jetable comme dans la page, D16) : code
  non nul, rien d'écrit depuis le dernier `save` (enregistrement atomique, D3).
- H10 — Import partiel (`failed` ou `refused` non vide) : ce qui est inséré reste et le fichier est enregistré, le rapport
  liste le reste, code 1.

## 5. Décisions d'architecture

**DA1 — CLI Node dans `apps/cli`, aucune crate Rust.**
Contexte : ZIP, `.olf`, Bamboo, passage BoardList ↔ commandes, magasin d'assets et assemblage PDF vivent en TS ; le Rust
ne fait que la moitié de chaque format. Décision : paquet `@roomboard/cli` qui charge les deux `.wasm` et importe les
modules de `apps/web/src`. Conséquences : aucune logique recopiée ; la CLI suit la page à chaque chantier ; Node 22 exigé ;
une coupe Rust (Office) passera par un binaire de `roomboard-shell` appelé par la CLI (lot 4).

**DA2 — Contrat de la ligne de commande.**
Contexte : un agent doit tout faire sans écran et lire chaque résultat. Décision : 8 commandes (référence ci-dessous),
stdout JSON, stderr JSON, codes 0/1/2/3. Conséquences : toute commande ou option ajoutée plus tard est additive ; un
champ renommé passe le schéma à `roomboard-cli/2`.

**DA3 — Annuler et rétablir par session, jamais dans le fichier.**
Contexte : l'historique Yrs est en mémoire ; l'écrire changerait le format `.roomboard` (irréversible, partagé avec
l'application). Décision : `run` tient une session JSONL (fichier ou stdin) ; `apply` est une session d'une opération.
Conséquences : `undo` n'a de sens que dans un `run` ; un agent interactif garde `run -` ouvert et lit une ligne par opération.

**DA4 — Schéma de l'état `roomboard-cli/1`.**
Contexte : sortie lue par des machines, à garder stable. Décision : enveloppe fixe (ci-dessous), vues du cœur sans
transformation. Conséquences : un champ ajouté à une vue du cœur apparaît seul dans l'état (additif) ; les tests figent
l'enveloppe, pas le contenu des vues.

**DA5 — Cible sans écran (lot 1) et port `FragmentTab` (lot 2).**
Contexte : `createImporter` attend un `ImageTarget` fondé sur une scène ; `fragments.ts` lit `tab.board.engine` et
`tab.board.stage` (DOM), et `createFragmentOps`/`FragmentOps` sont typés `TabSession` (`fragments.ts:26-56`). Décision :
lot 1, `headlessTarget` (interface en 3, scène fixe H7) ; lot 2, `createFragmentOps<T>` et `FragmentOps<T>` génériques
avec `view(tab: T): FragmentTab`. Conséquences : coût du lot 2 dans `workspace.ts` ~8 lignes (adaptateur qui recâble
`anchorOf`, `stage`, `camera`, `engine.state/run/insertFragment/insertPages`) ; aucun comportement de la page ne bouge.

```ts
// apps/web/src/app/fragments.ts
export interface FragmentTab {
  readonly assets: AssetStore;
  readonly doc: CoreDocument;
  state(): { readonly page: string; readonly selection: readonly string[] };
  anchor(at: Point | null): readonly [number, number]; // anchorOf(stageRect, camera, at) dans la page
  run(cmd: Command): Change | null;
  insertFragment(src: CoreDocument, dx: number, dy: number): Change | null;
  insertPages(src: CoreDocument): Change | null;
}
export interface FragmentDeps<T> { /* champs actuels */ view(tab: T): FragmentTab; alive(tab: T): boolean }
export function createFragmentOps<T>(deps: FragmentDeps<T>): FragmentOps<T>;
```

**DA6 — Lots.**
Contexte : arrêt ferme vers 02 h 45, lot 1 séquentiel. Décision : lot 1 en 4 tâches, sans insertion `.rbitem`, ni
tableaux blancs, ni PDF (leur orchestration est enfermée dans `fragments.ts`, `workspace.ts` et le corps non exporté de
`board-worker.ts:44`). T1 socle (`package.json`, build D3, `wasm-node.ts`, `formats.ts` et son test, `main.ts` avec
`version`, `formats`, codes D9) ~35 min ; T2 état et session (`state.ts`, `session.ts`, onglets D7, références, `new`,
`state`, `run`, `apply`) ~45 min ; T3 import et export (`measureOrFallback` D11, `target.ts`, `import`, `export`, `state`
d'un `.rbitem`) ~35 min ; T4 essai S5, `verifier.sh`, section `## CLI` du profil ~20 min. Conséquences : lots 2 à 4 en 7.

### Référence de la CLI (lot 1)

Forme : `node apps/cli/dist/roomboard.mjs <commande> [arguments]`. Toute sortie de succès : un objet JSON par ligne sur
stdout. Tout échec : une ligne `{"error":{"code":"usage|io|format|command|unsupported","message":"…"}}` sur stderr.

| commande | arguments | sortie stdout | codes |
|---|---|---|---|
| `version` | — | `{"cli":"0.1.0","core":"<core.version()>","app":"<APP_VERSION>","schema":"roomboard-cli/1"}` | 0 |
| `formats` | — | `{"formats":[{"ext":".roomboard","read":true,"write":true,"lot":1,"notes":[]},…]}` (table 3.5 entière, `read`/`write` faux au-delà du lot livré) | 0 |
| `new` | `<sortie.roomboard>` | `{"file":"…","pages":["<id>"]}` (document `blank()`, une page) | 0, 1, 2 |
| `state` | `<fichier.roomboard> [--page <id>] [--points]` | état DA4 | 0, 1, 2 |
| `run` | `<fichier.roomboard \| --new> [--ops <fichier.jsonl> \| -] [--save] [--out <fichier>]` | une ligne par opération (ci-dessous) | 0, 1, 2, 3 |
| `apply` | `<fichier.roomboard> '<opération JSON>' [--out <fichier>]` | une ligne d'opération ; enregistre au même chemin ou à `--out` | 0, 1, 2, 3 |
| `import` | `<fichier.roomboard> <source>… [--page <id>] [--at x,y] [--out <fichier>]` | `{"opened":[…],"inserted":[…],"refused":[…],"failed":[…],"notices":[…]}` ; enregistre ce qui est inséré | 0 tout inséré ou ouvert ; 1 import partiel (H10) ou refus ; 2 usage (`--at` hors scène, H7) ; 3 une source d'un lot non livré (rien n'est fait) |
| `export` | `<fichier.roomboard> <sortie.rbitem> [--page <id>] [--ids a,b \| --all] [--name <nom>]` | `{"file":"…","kind":"fragment","elements":n}` | 0, 1, 2, 3 (`--grid` et autres extensions : lots 2 et 3) |

`state` accepte aussi un `.rbitem` (lecture par le conteneur, une page). Codes : 0 succès ; 1 refus (message du cœur,
fichier illisible, onglet plein, import partiel) ; 2 usage ; 3 format reconnu mais d'un lot non livré (D9, `unsupported`,
avec le lot dans le message).

**Opérations de `run`** (une par ligne JSON ; `$n` = 1er id du `Change` de l'opération n, comptée à partir de 1 ;
`$n.k` = k-ième ; `$page:i` = page d'indice i de l'onglet actif ; `$tab:i` = onglet d'indice i ; onglets nommés `t1`,
`t2`… dans l'ordre de création ; substitution sur les chaînes entières seulement) :

- toute commande du cœur : `{"type":"<Command>",…}` (union de `core/api.ts`, `points` et `path` en tableau JSON) →
  `{"op":n,"ok":true,"change":{"pages":[…],"ids":[…],"removed":[…],"full":false,"version":k}}` ;
- `{"op":"undo"}`, `{"op":"redo"}` → `{"op":n,"ok":true,"change":…}` (`change` nul si rien à annuler) ;
- `{"op":"state","page"?:id,"points"?:bool}` → `{"op":n,"ok":true,"state":{…DA4}}` ;
- `{"op":"save","to"?:chemin}` → `{"op":n,"ok":true,"file":"…"}` ;
- `{"op":"import","files":[…],"page"?:id,"at"?:[x,y]}` → rapport d'import ;
- `{"op":"export","to":"x.rbitem","page"?:id,"ids"?:[…]}` → `{"op":n,"ok":true,"file":"…"}` (sans `ids` : toute la page) ;
- `{"op":"tab.new"}`, `{"op":"tab.open","file":…}`, `{"op":"tab.select","tab":id}`, `{"op":"tab.close","tab":id}`,
  `{"op":"tab.list"}` → `{"op":n,"ok":true,"tabs":[{"id":…,"file":…|null,"active":bool}]}` ;
- échec : `{"op":n,"ok":false,"error":{…}}` sur stdout, la même erreur sur stderr, arrêt. Code **2** pour une opération mal formée
  (ligne non JSON, référence `$n` inconnue, commande inconnue) ; code **1** pour un refus du cœur ou un champ manquant ; code 3
  pour un format d'un lot non livré.

Ajouts de T5 au contrat : `roomboard help`, `--help` et `-h` impriment l'usage (`{"usage":[…],"refs":"…"}`), code 0 ;
`new <sortie> --replace` remplace un fichier existant (sans lui, un fichier existant rend code 1, `io`) ; avec `--save` ou
`--out`, `run` imprime une **dernière ligne** `{"written":[…]}` (chemins écrits pendant la session) ; `$$` donne un `$`
littéral (la substitution ne porte que sur une chaîne entière de la forme d'une référence) ; `--save` enregistre le
fichier passé à `run` (avec `--new`, `--out` est exigé).

**État `roomboard-cli/1`** :

```json
{ "schema": "roomboard-cli/1", "file": "a.roomboard", "version": 12, "canUndo": true, "canRedo": false,
  "pages": [ { "index": 0, "page": { /* PageView : id, width, height, background, backdrop, grid */ },
               "elements": [ { /* ElementView tel que toElementView le rend */ "points": [ /* si --points, traits */ ] } ] } ],
  "assets": [ /* AssetInfo de citedAssets() */ ] }
```

`version`, `canUndo` et `canRedo` décrivent la session en mémoire, pas le fichier : `version` repart de zéro et
l'historique est neuf à chaque ouverture (`crates/roomboard-core/src/document.rs:490-516`). Seuls `pages` et `assets`
décrivent le contenu ; toute comparaison d'états porte sur eux.

## 6. Scénarios d'acceptation

- **S1 — Créer, dessiner, annuler, enregistrer, relire.** `roomboard new /tmp/a.roomboard` ; `roomboard run /tmp/a.roomboard
  --ops ops.jsonl --save` avec un rectangle (`AddShape`), un texte (`SetText`), un trait (`CommitStroke`), `undo`, `redo`,
  puis `Transform` sur `$1` et `Delete` de `$2` ; `roomboard state /tmp/a.roomboard` rend 2 éléments (forme déplacée,
  trait), `canUndo` faux (session nouvelle).
- **S2 — Pages et onglets.** Dans une session : `AddPage` après `$page:0`, `RemovePage` de la première, `tab.new`
  (onglet `t2`), un rectangle dans `$tab:1`, `save` vers `/tmp/b.roomboard`, `tab.select` de `$tab:0`, `save` ; chaque
  fichier relu par `state` montre ses pages et éléments ; dans une autre session, `RemovePage` de la dernière page rend
  code 1 et le fichier n'est pas modifié.
- **S3 — Images et classeur.** `roomboard import /tmp/a.roomboard image.png valeurs.xlsx --at 400,300` : `inserted`
  liste les deux, `state` montre une image aux dimensions de l'en-tête PNG (asset cité) et un tableau aux cellules du
  classeur ; `roomboard import /tmp/a.roomboard doc.pdf` rend code 3 avec « lot 3 » et ne touche pas au fichier ;
  `--at 5000,10` rend code 2.
- **S4 — Export `.rbitem` relu.** `roomboard export /tmp/a.roomboard /tmp/sel.rbitem --page <id> --all` ; `roomboard
  state /tmp/sel.rbitem` : une page dont les éléments ont les mêmes sortes, styles, géométries et assets que la page
  exportée de `a`, ids mis à part (`extract` donne des ids neufs).
- **S5 — Essai de `verifier.sh` (`scripts/essais/cli-essai.mjs`).** Avec `ROOMBOARD_NOW` fixé, dans un dossier
  temporaire : écrit une petite image PNG (octets dans le script) et reprend le classeur suivi
  `crates/roomboard-formats/tests/fixtures/valeurs.xlsx` (déjà utilisé par `c10b-tableau-navigateur.mjs:23`) ; crée un
  tableau, joue une session (forme, texte, trait, deux pages, annuler, rétablir), importe l'image et le classeur,
  enregistre ; exporte la **première page** en `.rbitem` et compare l'état de ce `.rbitem` aux éléments de cette page
  (`pages[].elements` et `assets`, ids normalisés par rang) ; rouvre le `.roomboard` et compare `pages` et `assets` à ceux
  de l'état pris en fin de session (égalité stricte, ids compris ; `version`, `canUndo`, `canRedo` exclus, DA4) ;
  vérifie le code 3 d'un `.pdf` ; affiche `CLI : OK` et sort en 0, sinon le premier écart et sort en 1.

## 7. Hors périmètre

- **Lot 2 — insertion `.rbitem`, tableaux blancs et paquets** (chantier `cli-lot2`, ~7 tâches). D'abord DA5 :
  `createFragmentOps<T>`/`FragmentOps<T>` génériques avec `view(tab: T): FragmentTab` (`fragments.ts:26-56`),
  adaptateur de ~8 lignes dans `workspace.ts:348`, `encodeIds(tab, page, ids)` sous `encodeSelection` ; la CLI branche
  `headlessTarget.insertFragment` sur `insertResource`, passe son export par `encodeIds` (ferme l'écart D12) et gagne
  `export --grid` (`encodeGrid`) ; S5 réimporte alors le `.rbitem` dans un tableau neuf. Puis extraire de `workspace.ts:608-705` deux
  fonctions pures dans `apps/web/src/app/board-convert.ts` : `readBoardFile(file: { name; blob; format: BoardSourceFormat },
  deps: { core; ports: BoardPorts; makeAssets; decode; now; appVersion }): Promise<{ doc; assets; warnings }>` et
  `writeBoardFile(doc, assets, format: BoardFormat, ports: BoardPorts): Promise<{ bytes; warnings }>` ; `workspace.ts`
  les appelle (avis et onglet restent chez lui). Extraire le corps de `board-worker.ts:44` en
  `runBoardJob(mod: FormatsBinding, job: Job)` exporté de `platform/board-reader.ts`. Côté CLI, `BoardPorts` en Node :
  `unzip` = `unzipEntries` (`zip-worker.ts:91`), `unbamboo` = `bambooEntries` (`:73`), `zip` = `zipStored` (`:83`),
  `readOlf` = `olfPart` (`:137`), `read`/`readFlipchart`/`write` = `runBoardJob` ; images des tableaux décodées par
  `probeSize` (PNG, JPEG) ; `.rbpack` par `readPack`/`buildPack` (`rbpack.ts:50,83`). Commandes : `import` gagne `.iwb
  .ubz .notebook .olf .flipchart .rbpack` (ouvert en onglet), `export` gagne `.iwb .ubz .rbpack`, nouvelle commande
  `convert <source> <sortie>` (= `run --new` + `tab.open` + `export`). Essai : `cli-essai.mjs` exporte en `.iwb` et
  `.ubz`, réimporte, compare les états (sortes, géométrie).
- **Lot 3 — PDF** (~5 tâches). Lecture : `pdfjs-dist` (déjà au verrou) chargé en Node par `pdfjs-dist/legacy/build/pdf.mjs`
  dans un `PdfjsBinding` (`platform/pdf-render.ts:38`) ; extraire `openPdf` de `workspace.ts:510-553` en
  `readPdfFile(file, deps)` pur (tailles des pages, `core.fromPdfPages`). Écriture : extraire `exportPdf` de
  `workspace.ts:555-606` en `writePdfFile(doc, assets, deps)` ; superposition vectorielle `createVectorOverlay`
  (`pdf-overlay-vector.ts:85`) avec un `PdfWriter` qui appelle `write_pdf_pages` de la liaison sans Worker, polices
  `PDF_FONT_FILES` lues sur disque ; `pdf-lib` déjà au verrou ; repli raster absent en CLI (code 3 si `pdf-lib`
  refuse). Commandes : `import x.pdf`, `export y.pdf`. Essai : export PDF, relecture par pdf.js, nombre de pages comparé.
- **Lot 4 — Office, médias, 3D, autres images** (~5 tâches). Office : `[[bin]] roomboard-office` dans
  `crates/roomboard-shell` (appelle `find_converter` et `convert_granted`, `office.rs:198,571`), lancé par la CLI comme
  `convertOffice` de `createImporter` ; essai seulement si LibreOffice est présent (aucune installation). Médias :
  `probe` Node par lecture de l'en-tête MP4/WebM (à chercher dans le code avant d'écrire) ou `--duration` ; 3D : import
  sans vignette (poster absent) si le cœur l'accepte ; GIF, WebP, BMP, ICO, SVG, AVIF, HEIC : taille par en-tête, sinon
  code 3. Chaque format livré passe `read`/`write` à vrai dans `formats`.
- Rien dans `roomboard-prive`, ni dans les deux modules Wasm (aucun seuil ne bouge), ni dans la coque Tauri.
- Aucune installation de paquet système, aucun `tauri build`.
- Rendu en image d'une page (capture PNG sans navigateur) : pas demandé, non cadré.

## 8. Portes immédiates

Aucune.
