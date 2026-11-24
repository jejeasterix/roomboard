# Cadrage — cli-lot4

Cadrage autonome (étage 1, cadreur), 2026-11-24 ~04:50, mode autonome (brief OF9 : aucune question à Jérôme). **Ce
cadrage complète `docs/plans/cli-cadrage.md` (D1 à D16, H1 à H10, DA1 à DA6, référence de la CLI),
`docs/plans/cli-lot2-cadrage.md` (D17 à D31, DA7 à DA10) et `docs/plans/cli-lot3-cadrage.md` (D32 à D48, H23 à H36,
DA11 à DA15) sans les refaire** : seul ce qui est nouveau pour le lot 4 est écrit ici (numérotation continuée : D49…,
H37…, DA16…). Graphe graphify présent (`~/.cache/graphes/roomboard/graphify-out/graph.json`, 11 241 nœuds), interrogé
avant toute lecture. Décision du coffre « 0284 » (pdf.js en processus) absente du coffre de la VM : son texte est la note 2
de `docs/sessions/cli-lot3-etat.md` (§ Notes du coffre) et les DA11 à DA15 du cadrage du lot 3.

Essais faits au cadrage (lecture seule, rien écrit dans le dépôt) : (1) Node 22.22.1 : `URL.createObjectURL(blob)` puis
`fetch` de l'URL `blob:nodedata:…` rend les octets ; `createImageBitmap` et `document` absents. (2) `STLLoader.parse` et
`OBJLoader.parse` de three 0.187 (`apps/web/node_modules`) lisent un STL binaire et un OBJ dans Node nu. (3)
`/usr/bin/soffice` présent sur la VM.

Contre-relecture, tour 1 (2026-11-24 ~05:13) : 1 bloquant (B1, three.js dans Node nu : `self`, `ProgressEvent`,
`document` absents ; D67 réécrite, D76 à D78 nouvelles), 1 important (I1, `soffice` orphelin après Ctrl-C ; D79, H50) et 6
mineurs (M1 à M6) intégrés ; aucun point contesté.

## 1. Demande et gabarit

**Demande** : lot 4, dernier lot de la CLI — Office (Word, Excel, PowerPoint, par un binaire `roomboard-office` de
`roomboard-shell` qui appelle `find_converter` et `convert_granted`, puis le chemin PDF du lot 3), médias (durée lue dans
l'en-tête), 3D (sans vignette), autres images (GIF, WebP, BMP, ICO, SVG, AVIF, HEIC, taille lue dans l'en-tête, aussi dans
un tableau blanc) ; chaque format passe « couvert » dans `FORMAT_LOTS` avec ses tests et ses contrôles dans
`scripts/essais/cli-essai.mjs` ; plus aucun code 3 « lot pas encore livré » (Jérôme, 2026-11-23 ~22:15, « En plus de
construire le graphify, ajoute la construction de la cli complète », brief OF9 du général).

**Gabarit** : chantier (40 questions au plus ; 32 consommées). Durée totale disponible ~4 h (arrêt ferme 09:09,
poussée de sauvegarde 08:59) : **7 tâches en 3 vagues, ~3 h 50 de travail, ~2 h 15 d'horloge** (DA21). Périmètre
taillé : écriture d'aucun format nouveau (lecture seule pour tout le lot 4), aucun décodeur, aucune vignette ; règle de
coupe écrite en H48 (avancée à 07:30).

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| D49 | Découpage | 7 tâches, 3 vagues (DA21) : T1 binaire Office ∥ T2 tailles d'images ∥ T3 en-têtes des médias ; T4 médias et images dans la CLI ∥ T5 3D dans la CLI ∥ T6 Office dans la CLI ; T7 table, essai, vérification, profil. | brief (≈ 4 h) ; mesure des lots 2 et 3 (`docs/sessions/cli-lot3-etat.md`, 8 tâches en ~4 h) | oui |
| D50 | Binaire `roomboard-office` | **Promouvoir l'exemple existant** `crates/roomboard-shell/examples/convertir_office.rs` (même code que la coque : `find_converter`, `convert_granted`, `release_conversion`, `CONVERT_TIMEOUT`) en `crates/roomboard-shell/src/bin/roomboard-office.rs` par `git mv` ; l'exemple disparaît (aucun script ne l'appelle ; les plans de C16 qui le citent sont de l'historique). Interface en DA16. | `examples/convertir_office.rs:1-60` ; `office.rs:195,570,615` ; coffre `0281` (« Office passera par un binaire de `roomboard-shell` ») ; `0265` (DA-O1) | oui |
| D51 | Racine de travail du binaire | `$XDG_CACHE_HOME/roomboard-office` (absolu) sinon `$HOME/.cache/roomboard-office`, jamais `temp_dir()` (partagé) ; **au démarrage, `purge_conversions(&root)`** (dossiers des processus morts, comme la coque) ; à la fin, `release_conversion` **de sa seule conversion** : la ligne `remove_dir_all(root.join("conversions"))` de l'exemple (l. 58) est retirée (elle effacerait la conversion d'un autre processus en cours). `--check` imprime aussi `racine : <root>` (lu par la CLI, D79 ; aucune règle de racine recopiée en Node). | `examples/convertir_office.rs:28-37,58` ; `office.rs:615` (`release_conversion`), `:644` (`purge_conversions`), `:377` (`<pid>-<n>`) ; `apps/desktop/src-tauri/src/main.rs:590` | oui |
| D52 | Processus LibreOffice | Aucun code neuf : `run_libreoffice` pose déjà `--headless --invisible --norestore`, un profil jetable `-env:UserInstallation` dans le dossier de conversion, `process_group(0)` ; `wait_tree` tue l'arbre **après la fin** et au délai (120 s). LibreOffice vit dans son propre groupe (`office.rs:530`) : un signal qui tue le binaire ne l'atteint pas (D79, H50). Le binaire le prouve par un test d'intégration (D53, S1). | `office.rs:244-266,481-498,510-548` ; `0265` (DA-O5) ; test existant `success_kills_leftover_children` (`office.rs:1473`) | oui |
| D53 | Workspace et vérification | `roomboard-shell` est membre du workspace (`Cargo.toml:3`) : `cargo clippy --workspace --all-targets -D warnings` et `cargo test --workspace` couvrent le binaire ; `cargo test` le construit dans `target/debug/` (tests d'intégration du paquet). `verifier.sh` gagne `cargo build -p roomboard-shell --bin roomboard-office` juste avant `pnpm --filter @roomboard/cli build` (l. 83). Test d'intégration neuf `crates/roomboard-shell/tests/office_bin.rs` (`env!("CARGO_BIN_EXE_roomboard-office")`). Aucun `tauri build` ; exécuteurs : `nice -n 10 cargo … -p roomboard-shell -j 4`. | `Cargo.toml:3-5` ; `scripts/verifier.sh:20-21,83` ; brief | oui |
| D54 | LibreOffice absent | Tests Rust réels sautés seulement sous `ROOMBOARD_SANS_SOFFICE=1` (saut dit sur stderr), sinon échec : même convention que C16. Même variable pour les contrôles Office de `cli-essai.mjs` (ligne « Office sauté » imprimée). | `office.rs:1116-1130` (`soffice()`) | oui |
| D55 | Trouver le binaire depuis la CLI | `ROOMBOARD_OFFICE` (chemin) si posée ; sinon `<racine>/target/debug/roomboard-office[.exe]`, puis `<racine>/target/release/…` ; racine = `new URL("../../../", import.meta.url)` (même profondeur depuis `apps/cli/src/` et `apps/cli/dist/`). Rappelée par l'aide (`env`). | hypothèse H41 ; `apps/cli/src/main.ts:46` (`ENV`) | oui |
| D56 | Office indisponible | Avant toute lecture, si une source a le lecteur `office` dans `FORMAT_LOTS` : `roomboard-office --check` une fois par processus ; binaire introuvable ou code 3 du binaire → `CliError("unsupported")`, **code 3**, rien lu ni écrit (message en DA17). | brief (« s'il manque ailleurs, code 3 avec un message clair ») ; D9 | oui |
| D57 | Office dans `createImporter` | `convertOffice(path)` = lancement du binaire (`spawn`, signaux de D79) vers un dossier `mkdtemp` (0700), lecture du PDF, dossier retiré dans `finally` ; rejet `OfficeConvertError(code)` du produit (code = premier mot de stderr). `openOffice: (f) => session.openPdf({ name: f.name, blob: f.pdf, original: f.original })` **comme la page** ; `officeConverter: true`. `session.openPdf` et `readPdfNoticed` gagnent `original?: Blob`, passé à `readPdfFile` (qui garde déjà l'original). | `import.ts:82-89` ; `app/workspace.ts:461-465` ; `office-import.ts:30,113-140` ; `app/pdf-convert.ts:26-27,65-72` ; `apps/cli/src/session.ts:171,231` | oui |
| D58 | `.xlsx`, `.xlsm` | Restent des **tableaux en valeurs** (contrat du lot 1, `formats.ts:69`) : `nodeFile` ne donne pas de `path` à un nom `isSheetName` ; `officeHandler` prend alors sa branche « sans chemin » (`sheet.run`, sans avis). Un test le fige (LibreOffice présent : tableau inséré, aucun binaire lancé). | `office-import.ts:123-126` ; `import.ts:222` (`isSheetName`) ; `apps/cli/src/importer.ts:39-48` | oui (H37) |
| D59 | Office comme document | `state`, `convert` et `tab.open` lisent un Office par `readDoc` : D56, conversion (D57), `readPdfNoticed(nom, pdf, original)` ; onglet sans fichier (comme un PDF, D40). Échec de conversion : `CliError("format", convertFailureMessage(nom, code))`, **code 1** (même message que l'import et la page) ; `no-program` malgré D56 (course) : code 3, message de D56. `CONVERT_SOURCES` gagne `OFFICE_EXTENSIONS` sans les noms `isSheetName` (constante importée, aucune liste recopiée). | brief (« suit ensuite le chemin PDF du lot 3 ») ; `office-import.ts:73` (`convertFailureMessage`) ; `session.ts:182-204` ; `exporter.ts:98` | oui |
| D60 | Médias dans `createImporter` | `probe` et `mediaUrls` de la CLI : un seul mécanisme d'URL, celui de Node (`URL.createObjectURL`/`revokeObjectURL`, comme D67) ; `probe(url)` retrouve le Blob par `resolveObjectURL` (`node:buffer`), lit l'en-tête par `readMediaHeader` (D61, DA18), format tiré du type du Blob (`MEDIA_MIME`, posé par `mediaHandler`) ; `poster: null`. Jamais `linkMedia` : tout média est inclus, 100 Mo au plus (`MEDIA_TOO_BIG` au-delà, comme le web). | `import.ts:74-79,346-350` ; `media-import.ts:15-23,127-132,243-247,354-372` ; coffre `0258` | oui |
| D61 | Conteneurs lus | MP4, MOV, M4A, M4V (`mvhd` ; taille : `tkhd` de la première piste vidéo) ; WebM (`Info` : `TimecodeScale`, `Duration` ; `Tracks` : `PixelWidth`, `PixelHeight` ; sans `Duration`, cas de MediaRecorder : temps du dernier `Cluster` + dernier bloc) ; WAV (`fmt ` : débit, `data` : taille) ; Ogg (Vorbis, Opus, Theora : dernière granule ; Theora : taille d'image) ; MP3 (`Xing`/`Info`/`VBRI`, sinon débit constant du premier cadre). Durée arrondie à la ms comme `probeMedia` ; vidéo si `width > 0`, sinon son (règle M16 d'`addMedia`). | `media-import.ts:68-95` (`sniffMedia`), `:210`, `:272` ; recherche du code existant vide (termes en 3) | oui |
| D62 | Durée illisible | **Code 3** avant toute écriture : `<nom> : durée du média illisible dans l'en-tête (la CLI ne décode pas les médias)`. | brief (règle « sinon code 3 » des images, étendue) ; H38 | oui |
| D63 | Tailles d'images | **Étendre `probeSize`** à GIF, WebP (VP8, VP8L, VP8X), BMP (en-têtes info et core, hauteur négative = valeur absolue), ICO (plus grande entrée, 0 = 256), AVIF et HEIC (`ispe` de l'élément principal `pitm`/`ipma`, sinon le plus grand `ispe`), SVG ; lecteurs purs dans un module neuf `platform/image-size.ts` (DA19). `nodeDecode` (CLI) et les tableaux blancs en profitent sans autre changement. | brief ; `image-import.ts:100-109` ; `apps/cli/src/importer.ts:33-37` ; `session.ts:156` (`readBoardFile(…, decode: nodeDecode)`) | oui |
| D64 | Taille d'un SVG | Celle que le navigateur donne : `width`/`height` absolus (sans unité, `px`, `pt`, `pc`, `in`, `cm`, `mm` ; `em` = 16 px) ; sinon `viewBox` → 300 × 300·h/w ; ni l'un ni l'autre (ou `%`) → 300 × 150 ; une seule dimension → l'autre par le `viewBox`, sinon 150. Un SVG a donc toujours une taille. | coffre `04_Pieges/svg-naturalwidth-taille-de-remplacement.md` (mesures Chrome 151) | oui (H39) |
| D65 | Taille illisible | **Code 3** avant toute écriture : `<nom> : taille de l'image <kind> illisible dans l'en-tête (la CLI ne décode pas les images)`, par un pré-contrôle `headerBlocked` (DA17) après lecture des octets, avant `createImporter`, **seulement** pour une source dont l'extension a le lecteur `image` ou `media` dans `FORMAT_LOTS`, ou une extension absente de la table (un `.bin` lié en `FF E2` n'est pas pris pour un MP3, `media-import.ts:94`). Dans un tableau blanc : image illisible sautée avec l'avis du lecteur, comme aujourd'hui (`board-io.ts:436-446`), jamais de code 3. | brief ; `importer.ts:68-73,88-99` | oui |
| D66 | Effet de D63 sur la page | `imageHandler` refuse au-delà de 100 Mpx **avant** décodage pour 7 formats de plus (même message `TOO_MANY_PIXELS`, que le décodeur rendait déjà) ; tailles insérées par la page inchangées (`decoded.w/h`). | `image-import.ts:214-218` | oui |
| D67 | 3D | `model3d: Model3dDeps` de la CLI : `view` = `createModelViewLoader(() => import(model-view-three).createThreeModelView({ createCanvas: toile sans DOM, createRenderer: () => { throw … }, urls: URL.createObjectURL/revokeObjectURL de Node }))`, enveloppé par les globaux de D76 ; `readZip` = `createZipReader(inlineWorker((m) => zipJobReply(m as ZipJob)))`. Sans WebGL : three valide le modèle, instantané `null`, avis produit `NO_WEBGL_MESSAGE` une fois. Le cœur accepte `snapshot: null`. Couverts : `.glb` (avec ou sans texture), `.gltf` + `.bin` (ou ressources `data:`), `.obj` (+ `.mtl`, texture comprise), `.stl`, `.ply`, `.zip` de modèles ; chacun a son cas dans S4. | `model-view-three.ts:271-284,330-345` ; test « sans WebGL » `model-view-three.test.ts:266` ; `model3d-handlers.ts:22-27,74-148` ; `zip-read.ts:48` ; `zip-worker.ts:158` ; `one-shot-worker.ts:55` ; `core/api.ts:115` ; coffres `0260`, `0283` ; essais (1) et (2) ; contre-relecture B1 | oui |
| D68 | `FORMAT_LOTS` | `LOT_LIVRE = 4` ; chaque entrée du lot 4 couverte en lecture, écriture `null` ; notes par format (DA17) ; `UNREAD_IMAGES` retirée des tableaux blancs. Test : pour chaque clé, `importBlocked` rend `null` (aucun « au lot N »). Les mentions « (lot 4) » de `importer.ts:35` et `pdf-node.ts:127,138` prennent leur raison (« aucun décodeur d'image dans la CLI »). | `formats.ts:13,47-48,57-70,97-105` ; D27 | oui |
| D69 | Export PDF d'une image GIF, WebP, BMP, ICO, SVG, AVIF, HEIC | **Laissé de côté avec sa raison** : code 1 ; la superposition PDF passe par krilla, qui ne prend que PNG et JPEG (`Image::from_png`, sinon `Image::from_jpeg`), et la CLI n'a pas de décodeur pour faire le PNG (`toPng`) ; raison écrite dans les notes de `.pdf` et de ces images. Médias sans poster et 3D sans instantané : cadre gris du rendu, l'export PDF passe. | `crates/roomboard-formats/src/pdf.rs:512-519` ; `pdf-node.ts:126-140` ; `engine/render/canvas2d.ts:153-178,210` | oui |
| D70 | Fichiers d'essai | Module neuf `scripts/essais/fabriques/objets.mjs` (+ `.d.mts`) : octets d'images, de médias et de 3D écrits par le code ; lu par les tests de `apps/web`, `apps/cli` et `cli-essai.mjs` ; lancé seul (`node scripts/essais/fabriques/objets.mjs <dossier>`), il écrit le jeu des scénarios. Office : fixtures suivies `crates/roomboard-shell/tests/fixtures/{cours.docx,diapos.pptx}`. Aucun téléchargement. | patron D43 (`scripts/essais/fabriques/pdf.mjs`) ; `c14-media-navigateur.mjs:24-55` (WAV et EBML écrits à la main) ; `git ls-files crates/roomboard-shell/tests/fixtures` | oui |
| D71 | Essai de `verifier.sh` | `cli-essai.mjs` gagne les contrôles de S1 à S5 ; contrôle « aucun processus » : aucune ligne de `/proc/*/cmdline` ne contient la racine `XDG_CACHE_HOME` temporaire de l'essai, et `conversions/` vide ; les contrôles « .docx code 3 lot 4 » (l. 157) et « convert depuis .docx : code 2 » (l. 247) sont remplacés (effets de bord) ; « stderr vide » exigé aussi pour l'import 3D (S4). T7 mesure le démarrage (`version`, médiane de 5) avant et après et l'écrit au rapport (D78). | `scripts/essais/cli-essai.mjs:157,247` ; D14 | oui |
| D72 | Profil, aide | `.claude/chantier.md` § CLI : « Lots restants : aucun » (l. 51), code 3 redéfini (l. 52), `ROOMBOARD_OFFICE` ; `ENV` de l'aide gagne `ROOMBOARD_OFFICE` ; `USAGE.state` et `USAGE.convert` citent les fichiers Office. Ajouts seulement (DA2). | D15 ; `.claude/chantier.md:51-52` ; `main.ts:32,37,46` | oui |
| D73 | Sens du code 3 | « Format ou variante que la CLI ne lit pas » : plus aucun lot non livré ; restent en-tête illisible (D62, D65) et convertisseur Office absent (D56). Erreur `unsupported`, message `<nom> : …`. | brief ; D9 ; H38 | oui tant que le code reste 3 |
| D74 | Tailles et dépendances | Aucune ligne Rust des crates Wasm : modules **inchangés à l'octet** (1 374 215 o et 2 794 511 o), plafonds inchangés. Aucune dépendance npm ni Cargo ajoutée (three, fflate, `@types/three` déjà au verrou d'`apps/web` ; `roomboard-shell` sans crate neuve) ; aucune AGPL/GPL/LGPL liée (LibreOffice reste un programme externe, `0265`). | brief ; `apps/web/package.json` (`three 0.187.0`, `fflate 0.8.3`) ; `crates/roomboard-shell/Cargo.toml` | oui |
| D75 | Constats d'architecture | Aucun constat à fermer ; ne pas aggraver `image-import.ts:244` (ImageTarget, nom large : non touché) ni le cycle `import.ts` ↔ `office-import.ts` (`office-import.ts:40` : aucun import neuf entre eux). | `docs/architecture-constats.md` (zones `apps/web/src/platform`, `apps/cli`, `crates/roomboard-shell`) | oui |
| D76 | Globaux du navigateur pour three (B1) | Dans `model3d-node.ts`, `withThreeGlobals(run)` pose, **seulement s'ils manquent et seulement le temps d'un `view.load()`** (restaurés dans `finally` ; l'import 3D est séquentiel), `self = globalThis`, `ProgressEvent` (classe `Event` avec `lengthComputable`, `loaded`, `total`) et `document.createElementNS` qui rend une image sans canvas : `src` posé → `fetch` de l'URL `blob:` ; contenu non vide → `load` (1 × 1), vide ou absent → `error`. La CLI valide, elle ne dessine pas : aucune texture décodée. Pas de module commun avec `model-view-three.test.ts:102` : le test simule un réseau surveillé (`fakeNetwork`), la CLI pose des globaux temporaires ; deux besoins différents (et le code de test n'est jamais un écart). Portée limitée pour ne pas changer la détection d'environnement de pdf.js (qui lit `self` et `document`), évalué dans le même fichier. | contre-relecture B1 (`three/src/loaders/FileLoader.js:193`, `GLTFLoader.js:3415`, `three/src/utils.js:133`, `ImageLoader.js:88`) ; `model-view-three.ts:341-343` (image absente = `blob:` vide) ; `model-view-three.test.ts:96-135` | oui |
| D77 | Bruit de three et erreurs non rattrapées | `quiet.ts` gagne `quietError` : retire de `console.error` le seul préfixe `THREE.GLTFLoader: Couldn't load texture` (texture absente, déjà dite par `missing`) ; tout autre message passe. `bin.ts` gagne `process.on("uncaughtException")` et `("unhandledRejection")` : une ligne `{"error":{"code":"command","message":"erreur interne : …"}}` sur stderr, code 1, jamais une pile (D9) ; l'écriture atomique (D3) garantit qu'aucun fichier n'est à moitié écrit. | contre-relecture B1 ; `apps/cli/src/quiet.ts` (patron `quietWarn`) ; `apps/cli/src/bin.ts:20-40` | oui |
| D78 | three dans le fichier construit | `inlineDynamicImports` (`apps/cli/vite.config.ts`) place three dans `dist/roomboard.mjs`, **évalué au démarrage de chaque commande** (comme pdf.js, lot 3) : accepté, mesuré par T7 (D71). Au-delà de +0,3 s sur `version`, l'écart est écrit au rapport et en H51, sans autre changement dans ce lot. | `apps/cli/vite.config.ts:1-4` ; `cli-lot3-cadrage.md` (essai 3 : démarrage 0,48 s) ; contre-relecture M3 | oui |
| D79 | Ctrl-C pendant une conversion (I1) | Le binaire purge au démarrage (D51). La CLI transmet `SIGINT` et `SIGTERM` au binaire en cours (écouteurs posés le temps du `spawn`) ; après sa sortie, sous Linux, elle tue (`SIGKILL` au groupe) chaque processus dont `/proc/<pid>/cmdline` contient `<racine>/conversions/<pid du binaire>-` (racine lue sur `--check`), puis sort en 130 ou 143 avec une ligne `{"error":…}`. Le binaire n'a pas de gestionnaire de signal (il faudrait exposer le pid de `soffice` depuis `office.rs`, code partagé avec la coque : non simple) ; limite restante en H50. | contre-relecture I1 ; `office.rs:530` (`process_group(0)`), `:644` ; `apps/desktop/src-tauri/src/main.rs:590` | oui |
| D80 | Clôture | La décision du coffre `0281` (« codes … 3 format d'un lot suivant ») est amendée par une note posée à la clôture (coffre en lecture seule sur la VM) et citée dans la PR : code 3 = variante non lue par la CLI (D73). Le commentaire de `apps/cli/src/contract.ts:13` suit D73. | contre-relecture M1 ; coffre `0281` | oui |

## 3. Carte d'impact

Ligne « Surfaces d'impact » absente du profil : rubriques reprises du cadrage maître (CLI, modules web, coque Rust,
Wasm et persistance, scripts et profil, tests, autres dépôts).

### 3.1 CLI (`apps/cli/src`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `formats.ts:13` (`LOT_LIVRE`), `:47-48` (`UNREAD_IMAGES`), `:57-61`, `:64-70` (lignes du lot 4) | oui | D68 | V |
| `importer.ts:33-37` (`nodeDecode`, message « lot 4 ») | oui | raison D68 ; la taille vient de `probeSize` étendu | V |
| `importer.ts:39-48` (`nodeFile`) | oui | pas de `path` pour `isSheetName` (D58) | V |
| `importer.ts:68-73` (`checkSources`), `:88-115` (`importInto`, `createImporter({…})`) | oui | `checkOffice` (D56), `headerBlocked` (D65, D62), `probe`, `mediaUrls`, `model3d`, `convertOffice`, `openOffice`, `officeConverter` | V |
| `session.ts:171-180` (`readPdfNoticed`), `:182-204` (`readDoc`), `:231` (`openPdf`) | oui | `original` (D57) ; branche Office (D59) | V |
| `exporter.ts:98` (`CONVERT_SOURCES`) | oui | D59 | V |
| `main.ts:32,37` (`USAGE`), `:46` (`ENV`) | oui | D72 | V |
| `pdf-node.ts:126-140` (`nodeOverlay`, `toPng`) | oui | message sans « lot 4 » (D68, D69) | V |
| `office-node.ts`, `media-node.ts`, `model3d-node.ts` (neufs) | oui | adaptateurs Node (DA20) | — |
| `target.ts:13-30` (`headlessTarget`) | non | `run`, `assets`, scène : `AddMedia` et `AddModel3d` passent par `view.run` comme `AddImage` | V |
| `contract.ts:13` (commentaire de `EXIT`) | oui | sens du code 3 (D73, D80) | V |
| `bin.ts:20-40` | oui | erreurs non rattrapées en JSON (D77) | V |
| `quiet.ts` | oui | `quietError` (D77) | V |
| `board-node.ts`, `library.ts`, `state.ts`, `ops.ts`, `disk.ts`, `wasm-node.ts`, `fragment-view.ts` | non | inchangés | V |
| `apps/cli/package.json`, `vite.config.ts` | non | three et fflate résolus depuis `apps/web/node_modules` comme pdf-lib au lot 3 ; three évalué au démarrage (D78) ; à toucher seulement si le build le refuse | S |

### 3.2 Modules web (`apps/web/src`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `platform/image-import.ts:100-109` (`probeSize`) | oui | D63 : délègue aux lecteurs de `image-size.ts` | V |
| `platform/image-size.ts` (neuf) | oui | DA19 | — |
| `platform/media-header.ts` (neuf) | oui | DA18 | — |
| `platform/image-import.ts:201-249` (`imageHandler`) | non (comportement : D66) | appelle `probeSize` avant décodage | V |
| `platform/media-import.ts` (`sniffMedia` l. 68, `MEDIA_MIME` l. 15, `mediaHandler` l. 307) | non | réutilisés | V |
| `platform/model3d-handlers.ts`, `model3d-import.ts`, `model-view.ts:73`, `model-view-three.ts:271`, `zip-read.ts:48`, `zip-worker.ts:158`, `one-shot-worker.ts:55` | non | réutilisés par `model3d-node.ts` | V |
| `platform/office-import.ts` (`officeHandler` l. 113, `OfficeConvertError` l. 30, `OFFICE_EXTENSIONS` l. 14, `isOfficeName` l. 41) | non | réutilisés | V |
| `platform/import.ts:337-375` (`createImporter`) | non | réutilisé : toutes les dépendances existent déjà | V |
| `app/pdf-convert.ts:49` (`readPdfFile`, `original`) | non | réutilisé | V |
| `app/board-io.ts:436-446` (`decode` des images d'un tableau) | non | lit les 7 formats par `nodeDecode` sans changement | V |
| `app/workspace.ts`, `main.ts` | non | la page garde son câblage (navigateur, coque) | V |

### 3.3 Coque Rust (`crates/roomboard-shell`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `examples/convertir_office.rs` → `src/bin/roomboard-office.rs` | oui | D50, D51, DA16 | V |
| `tests/office_bin.rs` (neuf) | oui | D52, D53 | — |
| `src/office.rs` | non | `find_converter`, `convert_granted`, `release_conversion`, `purge_conversions` appelés tels quels | V |
| `src/lib.rs` (`GrantedPaths`) | non | réutilisé | V |
| `Cargo.toml` | non | binaire trouvé par `src/bin/` (aucune section) ; aucune dépendance | V |
| `apps/desktop/src-tauri/` | non | hors workspace, aucun build Tauri | V |

### 3.4 Wasm et persistance

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core`, `roomboard-wasm`, `roomboard-formats`, `roomboard-formats-wasm` | non | `AddMedia` (poster nul), `AddModel3d` (instantané nul), `AddImage`, `fromPdfPages` existent ; tailles inchangées à l'octet | V |
| format `.roomboard` | non | mêmes commandes que la page ; original Office en asset comme C16 | V |

### 3.5 Scripts, profil, documentation

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/verifier.sh:83` | oui | `cargo build -p roomboard-shell --bin roomboard-office` avant la CLI (D53) | V |
| `scripts/essais/cli-essai.mjs` (l. 96, 157, 247 et suite) | oui | D71 | V |
| `scripts/essais/fabriques/objets.mjs` + `.d.mts` (neufs) | oui | D70 | — |
| `.claude/chantier.md:51-52` | oui | D72 | V |
| `scripts/essais/c14-media-navigateur.mjs`, `c15-3d-navigateur.mjs`, `c16-office-navigateur.mjs`, `c2-image-navigateur.mjs`, `c5-image-navigateur.mjs` | non | essais `--e2e` de la page : gardent ses comportements (D66) | V |
| `scripts/controle-licences.mjs`, `controle-hors-ligne.mjs` | non | aucune dépendance ; `apps/web/dist` inchangé hors D63 | V |
| `docs/plans/usage-c16-office-*.md` (citent l'exemple) | non | historique | V |

### 3.6 Tests

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/platform/image-size.test.ts` (neuf), `media-header.test.ts` (neuf) | oui | un cas par format, en-têtes tronqués → `null` | — |
| `apps/web/src/platform/image-import.test.ts` | oui | `probeSize` des 7 formats ; refus > 100 Mpx avant décodage (D66) | V |
| `apps/cli/src/formats.test.ts:17-18,38,54-58` | oui | `LOT_LIVRE` 4 ; aucune entrée « au lot N » | V |
| `apps/cli/src/import.test.ts:57-65` | oui | `.docx` n'est plus « code 3 lot 4 » : remplacé par S1, S2 | V |
| `apps/cli/src/pdf.test.ts:243-252` (S4 du lot 3) | oui | partie `.docx` → code 3 « lot 4 » remplacée | V |
| `apps/cli/src/guards.test.ts:48-56` (D25) | oui | `convert texte.docx` (absent) : 1, plus 2 | V |
| `apps/cli/src/convert.test.ts:115-122` (l. 119) | oui | `convert doc.docx x.roomboard` (absent) : 1, plus 2 ; les autres refus de la ligne gardent 2 | V |
| `apps/cli/src/quiet.test.ts`, `bin.test.ts` | oui | `quietError` ; erreur non rattrapée → JSON, code 1 (D77) | V |
| `apps/cli/src/office.test.ts`, `media.test.ts`, `model3d.test.ts`, `images.test.ts` (neufs) | oui | S1 à S5 au vrai Wasm (faux binaire pour les refus, vrai binaire si présent) | — |
| `crates/roomboard-shell/tests/office_bin.rs` (neuf) | oui | D52, D53 | — |
| `apps/web/src/platform/media-import.test.ts`, `model-view-three.test.ts`, `model3d-handlers.test.ts`, `office-import.test.ts`, `import.test.ts`, `zip-read.test.ts` | non | à garder verts | V |
| `apps/cli/src/{boards,export,library,main,rbitem,session,target,pdf-node,pdf}.test.ts` (sauf lignes citées plus haut) | non | à garder verts (images des tableaux désormais lues : contrôler les avis attendus de `boards.test.ts`) | V |
| `crates/roomboard-shell/src/office.rs` (tests, dont `real_libreoffice_converts_docx_pptx_xlsx`) ; `cargo test --workspace` | non | à garder verts | V |
| `scripts/essais/c2-image-navigateur.mjs`, `c5-image-navigateur.mjs` (`--e2e`) | non | gardent D66 | V |

### 3.7 Autres dépôts

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `roomboard-prive` | non | hors périmètre | S |
| coffre `~/SecondBrain` | non | lecture seule (notes posées par la clôture depuis le Mac) | V |

### Effets de bord sur l'existant

- `probeSize` lit 7 formats de plus : la page refuse une image > 100 Mpx avant décodage au lieu d'après, même message
  (D66). Couvert par `image-import.test.ts` (cas GIF 20 000 × 20 000 refusé sans appel au décodeur) et `c2-image`,
  `c5-image` en `--e2e`.
- Les tableaux blancs lus par la CLI gardent leurs images GIF, WebP, BMP, SVG au lieu de les sauter : moins d'avis
  « images non lues ». Couvert par un test neuf de `images.test.ts` (`.iwb` fabriqué avec un GIF : 1 image, aucun saut)
  et `boards.test.ts` à garder vert.
- `import x.docx` passait en code 3 « lot 4 » : il convertit (code 0) ou rend code 3 « conversion Office indisponible ».
  Couvert par `office.test.ts` et `cli-essai.mjs` (remplacent `import.test.ts:57`, `pdf.test.ts:243`, essai l. 157).
- `convert x.docx y.roomboard` passait en code 2 : il convertit (D59). Couvert par `office.test.ts`, `guards.test.ts` et
  `convert.test.ts:119` mis à jour, essai l. 247 remplacé.
- Une erreur non rattrapée sortait en pile Node : elle sort en une ligne JSON, code 1 (D77). Couvert par `bin.test.ts`.
- three est évalué au démarrage de chaque commande (D78) : temps mesuré par T7.
- `.xlsx` reste un tableau même LibreOffice présent (D58). Couvert par `office.test.ts` (« valeurs.xlsx : tableau, aucun
  binaire lancé ») et le contrôle existant de `cli-essai.mjs` (import de `valeurs.xlsx`).
- L'exemple `convertir_office` disparaît (D50) : `cargo run --example convertir_office` des plans C16 ne marche plus ;
  remplacé par `cargo run -p roomboard-shell --bin roomboard-office -- <entrée> <sortie.pdf>`. Couvert par `office_bin.rs`.

### Chantiers en cours

Aucun sur les mêmes fichiers : `git worktree list` montre `main`, ce worktree et `~/.cache/tmp/ctl-cli-zc9h` (tête
détachée sur 352cbda, propre : référence `verifier.sh` de fond) ; `gh pr list` ne rend aucune PR ouverte.

### Termes cherchés

Graphe (`--graph ~/.cache/graphes/roomboard/graphify-out/graph.json`) : `query "createImporter registre des lecteurs
media model3d office image"` ; `affected "probeSize()"`, `"nodeDecode"`, `"checkSources()"`, `"convert_granted()"`,
`"createThreeModelView()"` (ce dernier a fait trouver `examples/convertir_office.rs`). Recherche texte (`grep -rn`,
worktree) : `mvhd|tkhd|0x4489|TimecodeScale|byteRate|byte_rate|Xing|sampleRate` (rien) ; `duration` dans `apps/web/src`,
`crates`, `apps/cli/src` (seulement sonde du navigateur, cœur, lecteurs) ; `GIF8|WEBP|VP8|b"BM|ispe|viewBox|imagesize|
image_size|fn dimensions` (seulement `sniffImage` et lectures de `viewBox` des tableaux) ; `probeSize|jpegSize` ;
`readZip|createThreeModelView|createModelViewLoader|model3d:` ; `openOffice|convertOffice|officeConverter` ;
`openPdf|original` (`workspace.ts`, `session.ts`, `pdf-convert.ts`) ; `cours.docx|fixtures|Search::from_env` ;
`convertir_office` ; `UNREAD_IMAGES|lot 4|LOT_LIVRE` (`apps/cli/src`, `cli-essai.mjs`) ; `checkConvert|CONVERT_SOURCES` ;
`poster|snapshot` (`canvas2d.ts`, `api.ts`) ; `NO_WEBGL_MESSAGE` ; `isSheetName` ; `fabriques`. Tour 1 : `vi.stubGlobal`,
`ProgressEvent`, `createElementNS` (`model-view-three.test.ts`) ; `purge_conversions` (`office.rs`, `src-tauri/src/main.rs`) ;
`process_group` ; `inlineDynamicImports` ; `from_png|from_jpeg` (`pdf.rs`) ; `convertFailureMessage` ; `uncaughtException`,
`unhandledRejection` dans `apps/cli/src` (rien). Coffre :
`chercher.js "RoomBoard CLI lot 4 Office médias 3D images"`, `"LibreOffice soffice headless processus profil"`,
`"three.js Node GLTFLoader sans WebGL"`, `"durée média en-tête MP4 WebM"`, `"taille image en-tête GIF WebP AVIF HEIC SVG"`.

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| trouver LibreOffice (ou COM) | `crates/roomboard-shell/src/office.rs:195` | `find_converter(&Search::from_env())` | réutiliser |
| convertir en PDF, profil jetable, arbre tué | `office.rs:570`, `:615` | `convert_granted(&g, path, Some(&c), &root, CONVERT_TIMEOUT)`, `release_conversion(&g, &root, &id)` | réutiliser |
| programme de conversion en ligne de commande | `crates/roomboard-shell/examples/convertir_office.rs:11` | `main()` promu en binaire (D50, DA16) | étendre |
| Office dans l'import, messages d'échec | `apps/web/src/platform/office-import.ts:113` (`officeHandler`), `:30` (`OfficeConvertError`) | par `createImporter({ convertOffice, openOffice, officeConverter })` (`import.ts:82-89`) | réutiliser |
| ouvrir le PDF converti, original gardé | `apps/web/src/app/pdf-convert.ts:49` | `readPdfFile({ name, blob, original }, deps)` par `session.openPdf` | réutiliser (`openPdf` de la CLI étendu de `original?`) |
| lancer le binaire depuis Node | — | — | nouveau module `apps/cli/src/office-node.ts` (DA20) ; termes `execFile`, `spawn`, `child_process` dans `apps/cli/src` : rien |
| reconnaître un média | `apps/web/src/platform/media-import.ts:68` | `sniffMedia(head, name)` | réutiliser |
| insérer un média | `media-import.ts:307` (`mediaHandler`) | par `createImporter({ probe, mediaUrls })` (`import.ts:74-79`) | réutiliser |
| durée et taille dans l'en-tête | — | — | nouveau module `apps/web/src/platform/media-header.ts` (DA18) ; termes `mvhd`, `tkhd`, `TimecodeScale`, `byteRate`, `Xing`, `duration` : rien hors sonde du navigateur |
| sonde Node et URL internes | — | — | nouveau module `apps/cli/src/media-node.ts` (DA20) |
| taille PNG, JPEG ; refus > 100 Mpx | `apps/web/src/platform/image-import.ts:100` | `probeSize(blob, kind)` | étendre (D63) |
| taille GIF, WebP, BMP, ICO, AVIF, HEIC, SVG | — | — | nouveau module `apps/web/src/platform/image-size.ts` (DA19) ; termes `GIF8`, `WEBP`, `VP8`, `ispe`, `viewBox`, `imagesize`, `image_size` : rien de réutilisable (lectures de `viewBox` des tableaux : autre format, Rust) |
| reconnaître une image | `image-import.ts:51` | `sniffImage(head, name)` | réutiliser |
| images des tableaux blancs | `apps/cli/src/importer.ts:33` | `nodeDecode` (appelle `probeSize`) | réutiliser |
| lire et valider un modèle 3D sans WebGL | `apps/web/src/platform/model-view-three.ts:271`, `model-view.ts:73` | `createThreeModelView({ createCanvas, createRenderer, urls })`, `createModelViewLoader(load)` | réutiliser |
| ZIP de modèles en processus | `zip-read.ts:48`, `zip-worker.ts:158`, `one-shot-worker.ts:55` | `createZipReader(inlineWorker((m) => zipJobReply(m as ZipJob)))` | réutiliser (patron `board-node.ts:36`) |
| modèle, fichiers liés, ZIP, compagnon seul | `model3d-handlers.ts:149,173,227` | par `createImporter({ model3d })` | réutiliser |
| dépendances 3D de la CLI, globaux de three | — | — | nouveau module `apps/cli/src/model3d-node.ts` (DA20, D76) ; termes `stubGlobal`, `ProgressEvent`, `createElementNS` : seulement le faux réseau du test (`model-view-three.test.ts:96-135`), autre besoin |
| message d'un échec de conversion | `office-import.ts:73` | `convertFailureMessage(name, code)` | réutiliser (D59) |
| restes d'une conversion interrompue | `office.rs:644` | `purge_conversions(&root)` | réutiliser (D51) |
| filtrer un message de console connu | `apps/cli/src/quiet.ts` (`quietWarn`) | `quietError` sur le même patron | étendre (D77) |
| refus avant écriture (code 3) | `apps/cli/src/importer.ts:68` (`checkSources`) | `checkOffice(sources)`, `headerBlocked(name, bytes)` à côté (DA17) | étendre |
| table des formats | `apps/cli/src/formats.ts:52-73` | lignes et `LOT_LIVRE` | étendre |
| sources de `convert` | `apps/cli/src/exporter.ts:98` + `office-import.ts:14` | `OFFICE_EXTENSIONS.filter((e) => !isSheetName("x" + e))` | étendre |
| fichiers d'essai | `scripts/essais/fabriques/pdf.mjs` (patron), `c14-media-navigateur.mjs:24-55` (WAV, EBML) | — | nouveau module `scripts/essais/fabriques/objets.mjs` (D70) ; WAV et EBML réécrits sur le modèle de `c14-media-navigateur.mjs:24-55`, qui n'est pas touché (code d'essai : jamais un écart, référence anti-refactorisation) |

## 4. Hypothèses à revoir

**Niveau 1 (difficiles à défaire ou visibles des utilisateurs)**

- H37 — `.xlsx`, `.xlsm` restent des tableaux en valeurs dans la CLI, alors que la coque les convertit en pages quand
  LibreOffice est là (`0265`, HO1-1) ; en revanche `.xls` et `.ods` deviennent des pages PDF (Office, comme la coque). Défaut : contrat du lot 1 gardé (D58). À revoir si un agent doit prouver les pages
  d'un classeur.
- H38 — Le code 3 change de sens : « variante non lue par la CLI » (en-tête illisible, convertisseur absent) au lieu de
  « lot non livré » (D73). Un agent qui lisait 3 comme « plus tard » lit désormais « jamais sans décodeur ». Défaut
  appliqué, demandé par le brief.
- H39 — SVG à la taille de remplacement du navigateur (D64) : un SVG sans dimensions entre à 300 × 150, comme dans la page.
- H40 — Vidéo sans poster et objet 3D sans instantané : dans l'application, cadre gris jusqu'à la lecture ou au premier
  « Tourner » (`canvas2d.ts:153-178,210`). Défaut : accepté (rien ne décode dans la CLI) ; écrit dans `formats`.
- H41 — Binaire cherché dans `target/` du dépôt (D55) : hors du dépôt, `ROOMBOARD_OFFICE` est exigé, sinon code 3.

**Niveau 2**

- H42 — MP3 sans en-tête `Xing`/`VBRI` : durée par le débit du premier cadre (exacte pour un débit constant) ; WebM sans
  `Duration` : par le dernier bloc ; Ogg d'un autre codec que Vorbis, Opus, Theora (FLAC, Speex) : code 3.
- H43 — AVIF, HEIC : rotation `irot` non appliquée (comme l'EXIF des JPEG, H2).
- H44 — Avis du produit `NO_WEBGL_MESSAGE` (« 3D indisponible sur ce poste : l'objet garde son image ») rendu tel quel
  dans `notices` (aucune copie de message). Textures : validées par leur présence (D76), jamais décodées ; une texture
  absente devient `missing` (avis du produit), son message de console est filtré (D77).
- H45 — Média de plus de 100 Mo : refusé (`MEDIA_TOO_BIG`, import partiel, code 1), comme le web ; aucun lien.
- H46 — Délai de conversion : 120 s du binaire (`CONVERT_TIMEOUT`), aucun délai propre côté Node.
- H47 — Le pré-contrôle `headerBlocked` ne vise que les extensions `image`, `media` ou inconnues de `FORMAT_LOTS` (D65) :
  un PNG nommé `.iwb` ou un `.bin` lié n'y passe pas ; une image d'en-tête illisible déposée comme texture d'un modèle
  refuse tout l'appel en code 3.
- H48 — Règle de coupe : à **07:30** (plus tôt si T5 grossit), un format dont le lecteur n'est pas vert (MP3 et Ogg
  d'abord, puis AVIF/HEIC ; pour la 3D, les modèles texturés : refus code 1 « textures non lues par la CLI », écrit dans
  les notes de `.gltf`, `.glb`, `.obj`) est
  **laissé de côté avec sa raison** : entrée `read: null` et note `laissé de côté : <raison>`, refus en code 3
  `<nom> : format non lu par la CLI : <raison>` dans `checkSources`. Jamais un « au lot N ».
- H49 — Code de sortie du binaire pour `no-program` : 3 (l'exemple rendait 1).
- H50 — Limite restante de D79 : hors Linux (pas de `/proc`), ou si la CLI elle-même est tuée par `SIGKILL`, un `soffice`
  lancé continue jusqu'à sa fin propre (il n'est plus tué au délai de 120 s) ; son dossier est purgé au lancement
  suivant du binaire.
- H51 — Démarrage plus lent de chaque commande par l'évaluation de three (D78) ; accepté sans seuil bloquant.

## 5. Décisions d'architecture

**DA16 — Binaire `roomboard-office`.**
Contexte : la conversion Office vit en Rust dans `roomboard-shell` (`0265`) ; un exemple l'appelle déjà en ligne de
commande. Décision : `src/bin/roomboard-office.rs` (exemple promu, D50, D51), interface ci-dessous, sorties texte
d'une ligne. Conséquences : construit et testé par `cargo test --workspace` ; la CLI ne lit que le code de sortie et
le premier mot de stderr (code `ConvertError`) ; Windows (COM) suit sans changement.

```
roomboard-office --check                  0 : « convertisseur : <chemin> »   3 : « no-program : installez LibreOffice ou Microsoft Office »
roomboard-office <entrée> <sortie.pdf>    0 : « PDF : <sortie> (<n> octets) » ; stderr sinon : « <code>[ : <détail>] » (Display de ConvertError)
codes : 0 succès · 1 échec (not-office, too-large, timeout, failed, no-output, io, not-granted) · 2 usage · 3 no-program
```

**DA17 — Refus avant écriture et notes de `formats`.**
Contexte : le brief veut un code 3 clair pour un en-tête illisible ou un convertisseur absent, sans rien écrire.
Décision : `importInto` appelle, avant de lire, `await checkOffice(sources)` (D56), puis, octets lus et avant
`createImporter`, `headerBlocked` pour chaque source (H47). Conséquences : la page ne change pas ; une source refusée
n'ouvre ni n'insère rien ; `formats` porte la raison de chaque limite.

```ts
// apps/cli/src/importer.ts
export async function checkOffice(sources: readonly string[]): Promise<void>; // CliError("unsupported") : « <nom> : conversion Office indisponible : <raison> »
export async function headerBlocked(name: string, bytes: Uint8Array): Promise<string | null>; // message du code 3 ou null ; extensions image, media ou inconnues (D65)
// raisons de checkOffice : « convertisseur roomboard-office introuvable (cargo build -p roomboard-shell --bin roomboard-office, ou ROOMBOARD_OFFICE=<chemin>) »
//                          « LibreOffice introuvable (soffice ou libreoffice dans le PATH) »
```
Notes de `formats` (exemples) : images « taille lue dans l'en-tête ; illisible : code 3 », « export .pdf : refusé, aucun
décodeur d'image dans la CLI (code 1) » ; SVG « taille du navigateur (300 px sans dimensions) » ; médias « durée lue dans
l'en-tête, sans poster » ; 3D « validé par three, sans instantané » ; Office « converti par roomboard-office et
LibreOffice (code 3 sans eux) ; original gardé en asset ».

**DA18 — En-têtes des médias, module pur.**
Contexte : aucun lecteur de durée dans le dépôt ; la page sonde par `<video>`. Décision : `apps/web/src/platform/media-
header.ts`, à côté de `sniffMedia`, sans DOM ni dépendance. Conséquences : la CLI l'injecte comme `probe` ; la page n'en
dépend pas ; un conteneur de plus = une branche et ses tests.

```ts
export interface MediaHeader { readonly duration: number; readonly width: number; readonly height: number } // s ; 0 × 0 : son
export function readMediaHeader(bytes: Uint8Array, format: MediaFormat): MediaHeader | null; // null : durée illisible
```

**DA19 — Tailles d'images, module pur.**
Contexte : `probeSize` ne lit que PNG et JPEG. Décision : lecteurs dans `apps/web/src/platform/image-size.ts` ;
`probeSize` lit `blob.slice(0, 1 Mio)` et les appelle. Conséquences : une seule entrée « taille dans l'en-tête » pour la
page, la CLI et les tableaux ; effet D66.

```ts
export function headerSize(bytes: Uint8Array, kind: Exclude<ImageKind, "png" | "jpeg">): { readonly w: number; readonly h: number } | null;
```

**DA20 — Adaptateurs Node de la CLI.**
Contexte : `createImporter` attend des ports que la page tire du navigateur ou de la coque. Décision : trois modules
minces, branchés dans `importInto` (et `readDoc` pour l'Office). Conséquences : aucune logique de format côté CLI ;
three est dans le fichier construit et évalué au démarrage (D78) ; les globaux de three n'existent que pendant un
`view.load()` (D76) ; aucun `await` de premier niveau (piège du lot 3).

```ts
// apps/cli/src/office-node.ts
export function officeBinary(env?: NodeJS.ProcessEnv): string | null;
export function officeReady(): Promise<{ readonly root: string } | { readonly reason: string }>; // `--check` une fois par processus ; raison = code 3
export function convertOfficeFile(path: string): Promise<Blob>; // rejette OfficeConvertError(code) ; SIGINT/SIGTERM transmis, restes tués (D79)
// apps/cli/src/media-node.ts
export function nodeMedia(): { readonly probe: (url: string) => Promise<MediaProbe>; readonly mediaUrls: { create(b: Blob): string; revoke(u: string): void } };
// apps/cli/src/model3d-node.ts
export function nodeModel3d(): Model3dDeps;
export function withThreeGlobals<T>(run: () => Promise<T>): Promise<T>; // D76 : self, ProgressEvent, document.createElementNS le temps de run
```

**DA21 — Tâches et vagues.**
Contexte : ~4 h en tout (il reste ~3 h 45 à 05:13), un seul build Rust à la fois. Décision : vague 1 = T1 (binaire,
purge, `--check` avec racine, `office_bin.rs`, ~35 min) ∥ T2 (`image-size.ts`, `probeSize`, tests, ~30 min) ∥ T3
(`media-header.ts`, tests, `fabriques/objets.mjs` pour les médias, ~45 min) ; vague 2 = T4 (médias et images dans la
CLI : `media-node.ts`, `headerBlocked`, ~35 min, après T2 et T3) ∥ T5 (3D : `model3d-node.ts`, D76, D77, fabriques 3D
dont `.gltf` + `.bin` et GLB texturé, ~50 min, sans dépendance) ∥ T6 (Office : `office-node.ts`, `checkOffice`, signaux
D79, `readDoc`, `convert`, ~50 min, après T1) ; vague 3 = T7 (`LOT_LIVRE = 4`, test « aucun au lot N », `contract.ts`,
`cli-essai.mjs`, mesure D78, `verifier.sh`, profil, aide, ~30 min). Conséquences : ~3 h 50 de travail, ~2 h 15
d'horloge ; T4, T5, T6 touchent `importer.ts` (bloc `createImporter`) et `formats.ts` (lignes voisines) : fusion par
l'orchestrateur ; H48 coupe à 07:30.

## 6. Scénarios d'acceptation

`R` = racine du worktree, `T=$(mktemp -d)`, `C="node $R/apps/cli/dist/roomboard.mjs"`, CLI construite et binaire
construit (`cargo build -p roomboard-shell --bin roomboard-office`), `XDG_CACHE_HOME=$T/cache`. Fichiers d'essai :
`node $R/scripts/essais/fabriques/objets.mjs $T` ; `$C new $T/a.roomboard`.

- **S1 — Office converti, puis chemin PDF.** `$C convert $R/crates/roomboard-shell/tests/fixtures/diapos.pptx
  $T/diapos.roomboard` → code 0, `{"file":"$T/diapos.roomboard","from":"…diapos.pptx","pages":2,"notices":[]}` ;
  `$C state $T/diapos.roomboard` → 2 pages au fond `pdf-page`, un asset `application/pdf` nommé `diapos.pdf` et un
  asset `application/vnd.openxmlformats-officedocument.presentationml.presentation` (original). `$C convert
  …/cours.docx $T/cours.pdf` → code 0, fichier qui commence par `%PDF-`. `$C import $T/a.roomboard …/cours.docx` →
  code 0, `"opened":["cours.docx"]`. `$C import $T/a.roomboard $R/crates/roomboard-formats/tests/fixtures/valeurs.xlsx`
  → `"inserted":["valeurs.xlsx"]`, un élément `table`. Après : aucune ligne de `/proc/*/cmdline` ne contient `$T/cache`,
  `$T/cache/roomboard-office/conversions` vide.
- **S2 — Office impossible : code 3, rien écrit.** `ROOMBOARD_OFFICE=$T/absent $C import $T/a.roomboard …/cours.docx` →
  code 3, stderr `{"error":{"code":"unsupported","message":"cours.docx : conversion Office indisponible : convertisseur
  roomboard-office introuvable (…)"}}`, `a.roomboard` inchangé (taille, `mtimeMs`). Même résultat avec un faux binaire
  qui rend 3 à `--check` (test Vitest) : « LibreOffice introuvable (…) ».
- **S3 — Médias.** `$C import $T/a.roomboard $T/son.wav $T/clip.mp4 $T/clip.webm` → code 0, `inserted` les trois ;
  `$C state $T/a.roomboard` : `son.wav` en `media` son, durée 1, 480 × 120 ; `clip.mp4` vidéo, durée 2,5, 640 × 360,
  poster nul ; `clip.webm` vidéo, durée lue. `$C import $T/a.roomboard $T/casse.mp4` (`ftyp` sans `moov`) → code 3
  « durée du média illisible dans l'en-tête », fichier inchangé.
- **S4 — 3D sans vignette.** `$C import $T/a.roomboard $T/cube.obj $T/cube.mtl $T/tex.png $T/tri.stl $T/tri.gltf
  $T/tri.bin $T/tex.glb` (MTL qui cite `tex.png` ; GLB à texture PNG incorporée) → code 0,
  `"inserted":["cube.obj","tri.stl","tri.gltf","tex.glb"]`, `notices` contient une fois « 3D indisponible sur ce poste »,
  **stderr vide** ; `state` : quatre éléments `model3d`, instantané nul, `cube.obj` cite `cube.mtl` et `tex.png`,
  `tri.gltf` cite `tri.bin`. Un `.gltf` sans son `.bin` → code 1 (modèle illisible, avis du produit), jamais une pile.
  Dans une même session `run`, un import 3D puis un `tab.open` d'un PDF fabriqué : code 0 (globaux restaurés, D76). `$C import $T/a.roomboard
  $T/seul.mtl` → code 1, `failed` et l'avis « fichier lié d'un modèle 3D : déposez-le avec son modèle ».
- **S5 — Autres images, aussi dans un tableau blanc ; essai.** `$C import $T/a.roomboard $T/i.gif $T/i.webp $T/i.bmp
  $T/i.ico $T/i.svg $T/vb.svg $T/i.avif $T/i.heic` → code 0, huit images aux tailles fabriquées (`vb.svg` à `viewBox="0 0
  400 100"` seul : 300 × 75) ; `$C import $T/a.roomboard $T/casse.gif` → code 3 « taille de l'image gif illisible dans
  l'en-tête » ; `$C convert $T/gif.iwb $T/g.roomboard` → 1 image, aucun avis d'image non lue ; `$C formats` : aucune
  ligne `read: false` d'un format lisible du cadrage, aucune note « lot ». `node $R/scripts/essais/cli-essai.mjs` →
  `CLI : OK` (contrôles de S1 à S5 compris, stderr vide), puis `scripts/verifier.sh --e2e` → `verifier.sh : e2e OK`,
  tailles Wasm 1 374 215 o et 2 794 511 o.

## 7. Hors périmètre

- Écrire un format du lot 4 (Office, médias, 3D, images autres que l'asset gardé) : lecture seule, comme la page.
- Décoder une image ou un média (poster, instantané 3D, orientation EXIF ou `irot`, export PDF d'une image non PNG/JPEG,
  D69) ; rendu WebGL.
- Lier un média de plus de 50 Mo (lien de la coque) ; `.mkv`, `.avi` (refusés par le produit, inchangé).
- Polices Liberation (attend Jérôme) ; toute installation de paquet système ; tout `tauri build` ; toute publication.
- `roomboard-prive`, coque Tauri (`apps/desktop/src-tauri`), modules Wasm.
- Constats d'architecture ouverts des zones touchées (D75) : ni fermés, ni aggravés.

## 8. Portes immédiates

Aucune.
