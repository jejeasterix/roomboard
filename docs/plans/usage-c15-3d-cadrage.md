# Cadrage — usage-c15-3d (C15 : objets 3D)

Cadrage autonome (OD90) : aucune question n'a pu parvenir à Jérôme ; chaque point est tranché ici, avec sa source ou en
hypothèse « à revoir ». Déjà décidé par `docs/plans/usage-cadrage.md`, **cité, pas refait** : U38 (3D, `:91`), U23
(chaîne d'import unique, `:76`), U25 (un objet se pose sur la page montrée au point de dépôt, `:78`), U26 (100 Mo par
fichier sur le web, `:79`), U3 (schéma facultatif, jamais `Any::Map`, `:56`), U4 (assets, `:57`), U39 (licences,
`:92`), ligne de formats (`:611`), ligne C15 du découpage (`:562`), S16 (`:465-466`). Étude : `docs/etudes/usage-formats-documents-medias.md` § 5.
Patron suivi : C14 (`docs/plans/usage-c14-media-cadrage.md`, M1-M38).

## 1. Demande et gabarit

**Demande** : un fichier glTF / GLB, OBJ + MTL, STL ou PLY déposé (seul, avec ses fichiers liés, ou dans un ZIP) devient
un élément `model3d` sur la page montrée, tourné à l'orbite quand il est sélectionné, dessiné par son instantané image
sinon, inclus avec ses fichiers liés dans le `.roomboard`.
**Gabarit** : `chantier` (40 questions au plus ; 39 tranchées ci-dessous).

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| X1 | Déjà décidé | `three` (MIT) à la demande ; glTF/GLB, OBJ+MTL, STL, PLY ; `kind: "model3d"` (fichier principal + liés, caméra d'orbite, `transform`) ; un seul rendu WebGL partagé hors écran copié dans le canvas pendant l'interaction, instantané hors sélection ; dépôt multiple ou ZIP ; `.obj` seul = avertissement ; transformations seulement. 3MF, FBX, édition du maillage : hors C15. | U38 `:91` ; brief OD90 | — |
| X2 | Forme de l'élément | `Y.Map` : `id`, `kind: "model3d"`, `transform`, `asset` (empreinte du fichier principal), `format` (`glb`, `gltf`, `obj`, `stl`, `ply`), `w`, `h` (boîte locale), `files` (facultatif, X3), `yaw`, `pitch` (facultatifs, X4), `snapshot` (facultatif, X5). Champs scalaires ; valeurs absentes = défauts. | U38 ; U3 `:56` ; patron M2 de C14 | oui jusqu'à la release (HX1-3) |
| X3 | Fichiers liés | `files` : `Y.Array` de `Y.Map{path, asset}` ; `path` = la référence telle qu'écrite dans le modèle, normalisée (`/`, sans `./`), 1 024 caractères au plus, unique ; 256 entrées au plus. Assets cités sans code neuf : `cited_assets` parcourt toute profondeur (`document.rs:240`, test `:1082`). | U3 (« `Y.Array` de `Y.Map` ») ; U4 | oui |
| X4 | Caméra d'orbite | `yaw`, `pitch` en radians ; défauts 30° et 20° ; `pitch` borné à ±85°, `yaw` ramené dans (−π, π]. Cadrage = sphère englobante ajustée au champ (35°), recalculé au chargement, jamais écrit. Pas de zoom ni de panoramique (champ facultatif ajoutable plus tard, U3). | U38 (« caméra d'orbite ») ; HX2-1 | oui |
| X5 | Instantané | `snapshot` : empreinte d'un PNG RVBA à fond transparent, 1 024 px sur le grand côté, au ratio de la boîte ; écrit **dans la même commande** que la vue (X7). Absent : carte « Objet 3D » + nom (X24). | U38 (« instantané en image ») ; patron `poster` (M2, M15 de C14) ; HX1-2 | oui |
| X6 | Boîte et placement | Boîte 4:3 (640 × 480 unités avant placement) ; `anchorOf`, `visibleOf`, `placement` réutilisés (80 % du visible, cascade de 24, `image-import.ts:195-224`) ; redimension par les poignées existantes (`transform`). | U25 ; M17 de C14 ; HX2-2 | oui |
| X7 | Commandes du cœur | `AddModel3d{page, asset: AssetRef, format, files: Vec<(String, AssetRef)>, w, h, yaw, pitch, snapshot: Option<AssetRef>, matrix}` : élément + métadonnées de chaque asset (`insert_asset_meta`, `document.rs:275`) en **une transaction, une étape**. `SetModel3dView{id, yaw, pitch, snapshot: Option<AssetRef>}` : état voulu complet, une étape par orbite validée ; même état : aucune étape (D38). Refus `BadModel3d` sans transaction. Variantes en fin d'énumération (`commands.rs:30`, `:259`). | brief (« une étape d'annulation par orbite validée ») ; M5 de C14 ; D38 | oui |
| X8 | Domaines, lecture tolérante | `w`, `h` finis > 0 et tenus en f32 (`fits_f32`) ; `yaw`, `pitch` finis, bornés (X4) ; assets par `valid_asset` ; `files` sans doublon. Champ facultatif illisible = absent ; entrée de `files` illisible = ignorée ; `asset`, `format` (hors liste), `w` ou `h` illisibles → **cadre inconnu**, jamais `None`. | U3 ; M6 de C14 | oui |
| X9 | Code du cœur | Module neuf `crates/roomboard-core/src/model3d.rs` (patron `media.rs`) ; `"model3d"` ajouté aux `KNOWN_KINDS` (`element.rs:31`), au match d'`element` (`document.rs:392`), à `element_geom`, au faux cœur (`fake-core.ts:168`) et au test I3. | M7, M8 de C14 | oui |
| X10 | Collision | Boîte `w × h` transformée. Le bras `media` de `element_geom` (`query.rs:140-152`) et le bras neuf feraient la même chose : aide commune `boxed_geom` (lecture ou repli inconnu), utilisée par les deux. | `query.rs:140` ; anti-refactorisation (duplication nette) | oui |
| X11 | Détection | Octets d'abord : GLB `glTF` (`67 6C 54 46`) à 0 ; PLY `ply` + fin de ligne ; puis extension : `.gltf` + premier caractère non blanc `{` ; `.obj` + aucun octet nul dans l'en-tête ; `.stl` (ASCII ou binaire, départagé par `STLLoader` à la taille) ; `.zip` + `ZIP_MAGIC` (`import.ts:129`). Types : `model/gltf-binary`, `model/gltf+json`, `model/obj`, `model/mtl`, `model/stl`, `model/x-ply`, `application/octet-stream` (`.bin`). | U23 (« octets magiques […] puis extension ») | oui |
| X12 | Place dans le registre | `model3dHandler` après `imageHandler`, `zip3dHandler` après `sheetHandler` (`import.ts:227-236`) ; `.mtl` ou `.bin` déposé sans modèle : « fichier lié d'un modèle 3D : déposez-le avec son modèle », en échec. | `import.ts:227` | oui |
| X13 | Regroupement d'un dépôt | `importFiles` gagne une pré-passe (DAX2) : pour un appel de plusieurs fichiers, chaque `.obj`, `.gltf`, `.glb` réclame les fichiers qu'il cite ; un fichier réclamé ne passe plus seul dans le registre ; les autres gardent leur ordre et leurs messages. Une image déposée avec un modèle **sans y être citée** reste importée comme image. | U38 (« plusieurs fichiers ensemble ») ; U23 ; HX2-6 | oui |
| X14 | Références | Fonction pure `references(format, text)` : OBJ `mtllib` ; MTL `map_Kd`, `map_Ka`, `map_Ks`, `map_Ns`, `map_d`, `map_Bump`, `bump`, `disp`, `norm`, `refl` (dernier mot) ; glTF `buffers[].uri`, `images[].uri` hors `data:` (JSON du `.gltf` ou bloc JSON du GLB). Résolution : chemin exact relatif au dossier du principal, puis sans casse, puis nom de base unique. Cité mais absent : modèle inséré, avertissement « `<nom>` : fichiers liés absents (a.png, b.mtl) ». | U38 ; étude § 5 (« dossier de fichiers liés ») | oui |
| X15 | `.obj` seul | Aucune `.mtl` résolue (pas de `mtllib`, ou introuvable) : modèle inséré gris, avertissement « `<nom>` : déposé sans son .mtl, modèle sans matières ni textures ; déposez le .obj avec son .mtl et ses textures, ou un ZIP ». | U38 (« `.obj` seul = avertissement ») | oui |
| X16 | ZIP | Lu en JS par `fflate` (`unzipSync`, MIT) dans un Worker jetable (`runOnce`, `one-shot-worker.ts:18`) : le module `formats` n'expose aucun lecteur ZIP générique (seulement `ContainerReader`, qui exige le manifeste, `roomboard-formats-wasm/src/lib.rs:14-56`) et n'a que 46 Ko de marge. Entrées gardées : extensions 3D et liées ; chemins absolus ou avec `..` ignorés ; 1 000 entrées, 256 Mio décompressés au total. Chaque fichier principal du ZIP = un élément (20 au plus). Aucun modèle : « aucun modèle 3D dans ce ZIP ». API asynchrone de fflate exclue (Workers en `blob:`, refusés par la CSP). | brief (« vérifie ce qui existe et tranche ») ; U39 ; HX2-4 | oui (DAX5) |
| X17 | Plafond | 100 Mo par fichier (ZIP compris), coque comprise, par le `limit` du gestionnaire (`import.ts:89`) ; le web garde `WEB_MAX_BYTES` (`import.ts:21`). Un modèle 3D n'est jamais lié : toujours inclus. | U26 ; HX1-6 | oui |
| X18 | Modèles compressés | `extensionsRequired` d'un glTF qui contient `KHR_draco_mesh_compression`, `EXT_meshopt_compression` ou `KHR_texture_basisu` : refus « `<nom>` : modèle 3D compressé (Draco, meshopt ou KTX2) non lu ; exportez-le sans compression ». **Aucun décodeur embarqué** : Draco et KTX2 lancent un Worker depuis une URL `blob:`, que `script-src` de la coque interdit (`controle-hors-ligne.mjs:32`, `SCRIPT_TOKENS`). Extension seulement « utilisée » : chargé. | brief (« sinon le modèle compressé reçoit un avertissement. Tranche. ») ; HX1-4 | oui |
| X19 | Dépendances | `three` 0.187.0 (étude § 5, `pnpm view` : 0.187.0 MIT), `fflate` 0.8.3 (MIT) ; `@types/three` 0.187.0 en développement (three n'a pas de types ; dépendances MIT et Apache-2.0, vérifiées). Morceau `three-*.js` nommé par `chunkOf` (`vite.config.ts:47`). Mesure (esbuild, minifié) : three + 5 chargeurs **648 196 o, 163 240 o gzip** ; fflate 5 523 o. Aucun plafond JS dans `verifier.sh` : mesure notée dans l'état. `pnpm` a le réseau sur la VM. | U38 ; U39 ; mesure du cadreur | oui |
| X20 | Chargement à la demande | `import()` au premier besoin seulement : dépôt d'un fichier 3D, premier « Tourner ». Jamais au démarrage ni à l'ouverture d'un document (l'instantané suffit). Prouvé par l'essai : aucune requête `three-` avant le premier dépôt 3D (patron PF26, `c12-pdf-navigateur.mjs:84`). | U38 ; brief | oui |
| X21 | Orbite maison | Pas d'`OrbitControls` (279 756 o seul, écoute un élément DOM, alors que les gestes passent par le moteur) : `yaw += dx × 0,01`, `pitch += dy × 0,01` (rad par px CSS), bornes X4. | mesure ; HX2-1 | oui |
| X22 | Rendu partagé | Un seul `WebGLRenderer` pour toute l'application (tous onglets), sur un canvas hors DOM (pas `OffscreenCanvas` : WebGL hors écran absent avant Safari 17), `alpha`, `antialias`, `preserveDrawingBuffer: true` (lu par `drawImage` et `toBlob`). Taille = boîte à l'écran × `devicePixelRatio`, 2 048 px au plus. Lumières : `HemisphereLight` + `DirectionalLight` liée à la caméra. STL, PLY : `MeshStandardMaterial` gris `#b8bec6`, couleurs de sommets si présentes, Z en haut tourné en Y en haut. Un seul modèle chargé à la fois (celui de la séance), libéré à sa fermeture. Animations glTF ignorées. | U38 ; étude § 5 (« partager un seul rendu », iPad) ; HX1-7, HX2-5 | oui (DAX3) |
| X23 | Séance d'orbite | `engine.orbitModel(id)` sur le patron d'`editImage` (`engine.ts:132`, `:695`) : le moteur lui passe les gestes de la scène tant qu'elle est ouverte (routage `engine.ts:497`), l'outil publié reste `select`. Outil `engine/tools/model-orbit.ts`. Relâché : instantané puis `SetModel3dView` (une étape). Fermée par Échap, changement de sélection, de page ou d'onglet. | brief ; C5 DAI4 | oui |
| X24 | Barre 3D | `ui/Model3dBar.tsx`, enveloppe `.rb-popover .rb-media-bar` réutilisée (`rb.css:97-100`, `App.tsx:302-308`), visible quand la sélection est un seul `model3d` (dans un groupe : pas de barre) : « Tourner » (bascule `aria-pressed`), « Vue initiale » (une étape), état (« Chargement… », « 3D indisponible sur ce poste »). Aucune rangée permanente : scène ≥ 640 px. | M22 de C14 (DAM5) ; HX1-1 ; porte visuelle | oui |
| X25 | Ce qui est dessiné | Séance ouverte et rendu prêt : image du rendu partagé par le port `ModelFrames` (patron `MediaFrames`, `media-frames.ts:7`) ; sinon l'instantané par `images.bitmap(snapshot)` (`image-cache.ts:20`) ; sinon carte grise (`PLACEHOLDER_FILL`, `canvas2d.ts:95`) « Objet 3D » + nom. Export PDF, vignette, `.rbitem` : instantané (aucun port dans l'export). Pot : fond de page (branche par défaut de `fill-target.ts`). | U38 ; M20, M34 de C14 | oui |
| X26 | WebGL absent ou perdu | Création du rendu en échec ou `webglcontextlost` : port à null, instantané dessiné, « Tourner » grisé, message unique « 3D indisponible sur ce poste : l'objet garde son image ». À l'import sans WebGL : les chargeurs lisent quand même le fichier (validation), élément inséré **sans** instantané, même message. | brief (« instantané et avertissement doivent rester prouvés ») | oui |
| X27 | Garde réseau | Toute URL que three demande passe par `LoadingManager.setURLModifier` : référence connue → URL `blob:` de son asset ; `blob:` inchangée ; `data:` convertie en `blob:` ; tout le reste (`http(s):`, chemin absolu) → `blob:` vide, compté dans « fichiers liés absents ». Aucune requête réseau, même sur le web, qui n'a pas de CSP. | D27 (hors ligne) ; DAX4 | oui |
| X28 | CSP de la coque | `connect-src` gagne `blob:` (`tauri.conf.json:20`) : `ImageBitmapLoader` et `FileLoader` de three font `fetch()` sur ces URL (`three/src/loaders/ImageBitmapLoader.js:175`, `FileLoader.js:143`) et `GLTFLoader` prend `ImageBitmapLoader` sous Chromium et Safari ≥ 17 (`GLTFLoader.js:2706`) ; `img-src blob:` existe déjà. `SCHEME_TOKENS` admet `blob:` en `connect-src` (`controle-hors-ligne.mjs:25-30`) ; `coque-csp.test.sh` le vérifie ; l'essai sert la CSP de la coque (`commun.mjs:160`), donc la prouve. | brief (« ex. `blob:` pour les textures ») ; HX1-5 | oui (DAX4) |
| X29 | Contrôle hors ligne | Seul faux hôte mesuré dans le morceau three : `i.test` (fin de `/^https?:\/\//i.test`, `LoaderUtils.js:37`, `:44`) → entrée de `NON_FETCHED_HOSTS` avec sa raison (`.test` est réservé, RFC 2606) (`controle-hors-ligne.mjs:13`) ; `www.w3.org` déjà admis. Aucun `eval` ni `new Function` dans le morceau (mesuré). | `controle-hors-ligne.mjs:12-13` (« toute entrée nouvelle se justifie ici ») | oui |
| X30 | Persistance | Rien dans le module `formats` : type inconnu écrit en `assets/<id>.bin` deflate (`container.rs:60`), PNG en « stored » ; aller-retour par la chaîne existante. Test « recharger garde les octets » pour `files`. | U3 ; M9 de C14 | oui |
| X31 | Copier, `.rbitem`, pages | Recopie générique (`copy.rs:61`, `cited_by` `:94`, `copy_asset_meta` `:106`) ; test ajouté : copier un `model3d` à fichiers liés. | U9 | oui |
| X32 | Boîte « Importer » | `IMPORT_EXTENSIONS` (`files.ts:73`) += `glb`, `gltf`, `obj`, `mtl`, `stl`, `ply`, `bin`, `zip` ; libellé « Images, vidéos, sons, 3D, PDF et documents RoomBoard » (`:74`). | R18 ; M33 de C14 | oui |
| X33 | Compatibilité | `schema` et `formatVersion` inchangés ; aucune fixture ne porte `model3d` (recherche) ; un fichier d'avant C15 s'ouvre. Une version d'avant C15 montre un `model3d` comme cadre inconnu `w × h` et le garde (U3). Test : `model3d` mal formé → cadre inconnu, réenregistré à l'octet (patron `tests/element_inconnu.rs`). | U3 ; brief | oui |
| X34 | Tailles | Module principal : +25 Ko estimés (1 119 330 o mesurés à C14, plafond 1 572 864 inchangé) ; module `formats` : 0 octet (taille égale à `main` à la clôture). | H2-13 ; brief | oui |
| X35 | Licences | three, fflate : MIT (acceptés sans exception) ; `THIRD_PARTY_NOTICES.md` gagne leurs lignes (table `:202`). | U39 | oui |
| X36 | Oracle des essais | `#stage[data-model3d]` posé par la session (comme `data-media`) : `""` sans `model3d` sélectionné, sinon `<format>;<état>;<yaw°>;<pitch°>`, `état` ∈ `instantane`, `chargement`, `orbite`, `sans-webgl`, `echec`, angles en degrés entiers. | M26 de C14 | oui |
| X37 | Modèles de test | Fabriqués dans les tests, jamais téléchargés : cube GLB (JSON + BIN écrits à la main, faces colorées), OBJ + MTL (cube bleu), STL binaire, PLY ASCII, glTF + `.bin` + PNG (`rgbPng`, `commun.mjs:186`) dans un ZIP écrit par `fflate.zipSync`. | brief | oui |
| X38 | Essai e2e | `scripts/essais/c15-3d-navigateur.mjs`, appelé par `verifier.sh --e2e` (après `:108`) : Chromium avec SwiftShader (`--enable-unsafe-swiftshader --use-angle=swiftshader`, `s2-navigateur.mjs:24`, WebGL2 prouvé au lot 3b) ; second passage sans WebGL par `addInitScript` (`getContext("webgl"/"webgl2")` → null), déterministe. `dropFiles` (plusieurs fichiers) ajouté à `commun.mjs` à côté de `dropFile` (`:144`). Capture `docs/essais/c15-3d-orbite.png`. | brief ; socle-etat `:56` | oui |
| X39 | Dépendances d'import | `ImportDeps.model3d?: { view(): Promise<ModelView>; readZip(blob): Promise<ZipEntry[]> }` ; absent : fichiers 3D refusés comme avant (patron `readSheet`, `openPdf`, `import.ts:52-57`). | `import.ts:44-65` | oui |

## 3. Carte d'impact

Rubriques déduites de la recherche : aucun graphe graphify pour RoomBoard (`~/.cache/graphes/` : `claude-config`,
`roomflow2`, `roomflow2-web`). Entrées V lues sur `origin/main` @ 458a90d.

### Cœur Rust et liaison

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core/src/model3d.rs` (neuf) | oui | X2-X9 | S |
| `src/lib.rs:14` | oui | `pub mod model3d;` | V |
| `src/element.rs:31` (`KNOWN_KINDS`), `ElementView` | oui | `"model3d"`, champ `model3d` (X9) | V |
| `src/document.rs:392` (match), test I3, `:1082` | oui / non | bras `model3d` ; le test `:1082` pose un `model3d` brut, `cited_assets` reste générique : à garder vert | V |
| `src/document.rs:240` (`cited_assets`), `:275` (`insert_asset_meta`) | non | réutilisés (X3, X7) | V |
| `src/query.rs:140-152` (`element_geom`) | oui | `boxed_geom` commun média et 3D (X10) | V |
| `src/commands.rs:30`, `:259`, `apply` | oui | `AddModel3d`, `SetModel3dView`, `BadModel3d` | V |
| `src/copy.rs:61-118`, `src/history.rs`, `src/asset.rs`, `src/format/` | non | recopie et historique génériques ; `AssetInfo` inchangé | V |
| `crates/roomboard-wasm/src/lib.rs:582` (voisinage d'`add_image`, `add_media` `:603`) | oui | `add_model3d`, `set_model3d_view`, chacun par une `_inner` testée en natif | V |
| `crates/roomboard-formats*`, `crates/roomboard-shell` | non | X16, X17 (jamais lié) | V |

### Page : types, import, rendu, interface

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `core/api.ts:26` (`ElementKind`), `:247` (voisin `MediaElement`) | oui | `Model3dData`, `Model3dElement`, commandes | V |
| `core/wasm-core.ts`, `core/fake-core.ts:168`, `core/wasm-core.contract.test.ts` | oui | lecture contrôlée, parité, contrat | V |
| `core/asset-store.ts:15-26` | non | `put`, `get` suffisent | V |
| `platform/import.ts:68` (`ImportContext`), `:83` (`ImportHandler`), `:227` (registre), `:247` (boucle) | oui | `companions`, pré-passe (DAX2), deps `model3d` (X39) | V |
| `platform/model3d-import.ts`, `platform/zip-read.ts`, `platform/zip-worker.ts` (neufs) | oui | X11-X18, X16 | S |
| `platform/model-view.ts` (neuf, morceau principal), `platform/model-view-three.ts` (neuf, morceau `three`) | oui | X20-X22, X26-X27 (DAX3) | S |
| `platform/model-sessions.ts` (neuf) | oui | séance et port `ModelFrames` par onglet, patron `media-players.ts` | S |
| `platform/image-import.ts:195-245` (placement, `ImageTarget`) | non | réutilisés, sans renommage (constat `image-import.ts:244` laissé ouvert) | V |
| `platform/media-import.ts`, `platform/pdf-load.ts`, `platform/one-shot-worker.ts` | non | patrons ; `runOnce` réutilisé | V |
| `platform/files.ts:73-74` | oui | X32 | V |
| `platform/host-fsa.ts:43`, `host-repli.ts:37`, `host-tauri.ts:151` | non | lisent `IMPORT_FILTER` / `IMPORT_EXTENSIONS` (à vérifier pour `host-fsa` : types MIME du sélecteur) | S |
| `platform/drop-web.ts`, `platform/paste.ts` | non | passent déjà tous les fichiers d'un dépôt en un appel | S |
| `engine/render/model-frames.ts` (neuf), `engine/render/canvas2d.ts:39`, `:411` | oui | option `models`, branche `model3d` voisine de `media` (X25) | V |
| `engine/render/image-cache.ts`, `engine/render/renderer.ts`, `engine/fill-target.ts` | non | `bitmap(snapshot)` ; interface inchangée ; fond de page | V |
| `engine/engine.ts:132`, `:497`, `:695` | oui | `orbitModel(id)`, routage des gestes (X23) | V |
| `engine/tools/model-orbit.ts` (neuf) | oui | X21, X23 | S |
| `app/board-session.ts:94`, `:227`, `:442` | oui | `board.models`, `selectedModel3d()`, `data-model3d` | V |
| `app/workspace.ts` (création de l'importeur) | oui | deps `model3d` | S |
| `app/container-io.ts`, `app/pdf-overlay*.ts`, `app/stage-tags.ts`, `app/toolbar-host.ts` | non | chaîne d'assets générique ; instantané dans l'export ; oracle posé par la session | V |
| `ui/Model3dBar.tsx` (neuf), `ui/App.tsx:122`, `:302-308` | oui | X24 | V |
| `ui/rb.css:97-104` | non | classes de la barre média réutilisées | V |
| `apps/web/vite.config.ts:47-48`, `apps/web/package.json`, `pnpm-lock.yaml` | oui | morceau `three` ; `three`, `fflate`, `@types/three` | V |
| `apps/web/src/main.ts:16`, `:79` | oui | branche `loadModelView` comme `loadPdfjs` | V |

### Coque, scripts, documents

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/desktop/src-tauri/tauri.conf.json:20` | oui | `connect-src … blob:` (X28) ; aucun build | V |
| `scripts/controle-hors-ligne.mjs:13`, `:25-30` | oui | `i.test` justifié ; `blob:` admis en `connect-src` | V |
| `scripts/tests/controle-hors-ligne.test.sh`, `scripts/tests/coque-csp.test.sh:11` | oui | cas `blob:` en `connect-src` ; vérification du `connect-src` | V |
| `scripts/controle-licences.mjs`, `scripts/licences-acceptees.json` | non | MIT et Apache-2.0 déjà acceptés ; à garder vert | V |
| `scripts/essais/commun.mjs:144` | oui | `dropFiles` | V |
| `scripts/essais/c15-3d-navigateur.mjs` (neuf), `scripts/verifier.sh:108` | oui | X38 | V |
| `scripts/essais/c*-navigateur.mjs`, `s*-navigateur.mjs` | non | à garder verts (scène ≥ 640 px, CSP) | V |
| `THIRD_PARTY_NOTICES.md:202` | oui | X35 | V |

### Tests à garder verts (non touchés)

`crates/roomboard-core/tests/{compat_socle,compat_c3,compat_c5,compat_grille_pr12,element_inconnu,media,scenarios}.rs` ;
`apps/web/src/platform/{import,image-import,media-import,paste,drop-web}.test.ts` ; `engine/tools/image-edit.test.ts`,
`engine/tools/select.test.ts` ; `engine/render/canvas2d.test.ts` ; `ui/MediaBar.test.tsx` ; essai `c14-media-navigateur.mjs`.

### Effets de bord sur l'existant

- Un `.zip` déposé, jusqu'ici refusé « format pris en charge dans une prochaine version », passe par le gestionnaire 3D :
  sans modèle, « aucun modèle 3D dans ce ZIP » (`model3d-import.test.ts`).
- Une image déposée **avec** un modèle qui la cite n'est plus insérée seule (`import.test.ts`, cas neuf) ; non citée,
  inchangée (même fichier, cas neuf).
- Pré-passe d'`importFiles` sur les appels de plusieurs fichiers : ordre et messages des autres fichiers inchangés
  (`import.test.ts` existant vert + cas mixte image, PDF, modèle).
- `element_geom` : le bras média passe par `boxed_geom` (tests de collision média de `query.rs` et `tests/media.rs`).
- Routage des gestes du moteur étendu à la séance d'orbite (`image-edit.test.ts`, `engine.test.ts`).
- CSP de la coque : `connect-src` élargi à `blob:` (`coque-csp.test.sh`, `controle-hors-ligne.test.sh`).
- Libellé et extensions de la boîte « Importer » (`files.test.ts:65`, `host-repli.test.ts:273`).

### Chantiers en cours

- `usage-c6b-pot-image` (`~/projets/roomboard-wt/usage-c6b-pot-image`, base 458a90d, aucun commit, cadrage en cours) :
  pot sur image (asset destructif). Fichiers communs probables : `commands.rs`, `roomboard-wasm/src/lib.rs`, `api.ts`,
  `wasm-core.ts`, `fake-core.ts`, `engine.ts` (séance d'image), `canvas2d.ts`. Ne pas toucher sa branche.
- PR ouvertes : aucune (`gh pr list` vide).

### Termes cherchés

Texte (`grep -rn`) : `model3d` (tout le dépôt : un seul usage, `document.rs:1095`), `three`, `fflate`, `jszip`, `unzip`,
`DecompressionStream` (aucun dans `apps/web/src` ni le lockfile), `importFiles`, `IMPORT_EXTENSIONS`, `IMPORT_FILTER`,
`KNOWN_KINDS`, `MEDIA_KIND`, `media::`, `editImage`, `imageEdit`, `MediaFrames`, `selectedMedia`, `data-media`,
`rb-media-bar`, `swiftshader`, `coqueCsp`, `dropFile`, `NON_FETCHED_HOSTS`, `SCHEME_TOKENS`, `connect-src`,
`THIRD_PARTY`, `pub fn` de `roomboard-formats-wasm/src/lib.rs`, `fn cited_assets`, `keeps_bytes`, `EXTENSIONS` de
`roomboard-shell`. Coffre : « roomboard 3D three model3d », « WebGL contexte headless SwiftShader piège », « roomboard
piège import dépôt CSP » (aucune décision 3D propre à RoomBoard). Mesure : three 0.187.0 et fflate 0.8.3 installés dans
`/tmp/c15-mesure`, regroupés par esbuild 0.25.12, motif `URL_RE` de `controle-hors-ligne.mjs` rejoué sur le résultat.

### Modules à réutiliser ou à étendre

| besoin | module existant | interface | décision |
|---|---|---|---|
| entrée unique des fichiers | `platform/import.ts:83`, `:227`, `:247` | `ImportHandler`, `createImporter`, `importFiles` | étendre : `companions?(file, blob, siblings): Promise<readonly DroppedFile[]>`, `ImportContext.companions: readonly DroppedFile[]`, `ImportDeps.model3d?` |
| en-tête ZIP | `import.ts:129` (`ZIP_MAGIC`, `hasZipMagic`) | constante | réutiliser |
| placement, cible | `image-import.ts:195-245` | `anchorOf`, `visibleOf`, `placement`, `ImageTarget` | réutiliser |
| magasin et empreinte | `core/asset-store.ts:15-26` | `put`, `get` | réutiliser |
| Worker jetable | `platform/one-shot-worker.ts:18` | `runOnce` | réutiliser (ZIP) |
| chargement à la demande | `platform/pdf-load.ts:37`, `vite.config.ts:47` | `import()` mémorisé, `chunkOf` | réutiliser le patron ; étendre `chunkOf` (`three`) |
| image dans le canvas | `engine/render/media-frames.ts:7`, `canvas2d.ts:39`, `:411` | port par les options | étendre : `ModelFrames { frame(elementId: string): CanvasImageSource \| null }`, option `models` |
| instantané dessiné | `engine/render/image-cache.ts:20` | `bitmap(asset)` | réutiliser |
| séance modale du moteur | `engine/engine.ts:132`, `:497`, `:695` (`editImage`) | séance + `gesture: GestureTool` | étendre : `orbitModel(id: string): ModelOrbit \| null` |
| barre flottante | `ui/MediaBar.tsx`, `rb.css:97-100`, `App.tsx:302-308` | enveloppe `.rb-popover .rb-media-bar` | réutiliser l'enveloppe ; composant neuf (contenu propre) |
| métadonnée d'asset | `document.rs:275` | `insert_asset_meta` | réutiliser (pas de copie de `write_asset_meta`, constat C14) |
| collision boîte | `query.rs:140-152` | bras média | étendre : `boxed_geom(txn, e, read)` commun |
| vue et commandes d'un élément | `crates/roomboard-core/src/media.rs` | patron | nouveau module `model3d.rs` (DAX1) : `read_model3d(txn, e) -> Option<(Transform, Model3dView)>`, `cmd_add_model3d(doc, NewModel3d) -> Result<Change, CommandError>`, `cmd_set_model3d_view(doc, id, yaw, pitch, snapshot: Option<AssetRef>)` |
| détection, références, ZIP | aucun (termes `three`, `unzip`, `fflate`, `DecompressionStream`, `mtllib`) | — | nouveau module `platform/model3d-import.ts` : `sniffModel3d(head, name): Model3dFormat \| null`, `references(format, text): string[]`, `resolveReference(ref, mainPath, names: readonly string[]): string \| null`, `model3dHandler(deps)`, `zip3dHandler(deps)`, `companionHandler()` ; `platform/zip-read.ts` : `readZip(blob: Blob): Promise<ZipEntry[]>` (`ZipEntry { path, blob }`) |
| rendu WebGL partagé | aucun (WebGL2 d'encre, `webgl2.ts`, facultatif et dédié au trait) | — | nouveau module (DAX3) : `loadModelView(): Promise<ModelView>` ; `ModelView { available(): boolean; load(src: ModelSource): Promise<LoadedModel>; draw(m: LoadedModel, v: ModelCamera, px: Size): CanvasImageSource \| null; snapshot(m, v, px): Promise<Blob \| null>; release(m): void }` |
| geste d'orbite | aucun | — | nouveau module `engine/tools/model-orbit.ts` : `createModelOrbit({ ctx, id, view, onView, onCommit }): ModelOrbitSession` (`gesture`, `view()`, `reset()`, `close()`) |
| séances par onglet | `platform/media-players.ts` | patron | nouveau module `platform/model-sessions.ts` : `open(id)`, `close()`, `frames: ModelFrames`, `state(id)`, `onChange(cb)` |

## 4. Hypothèses à revoir

**Niveau 1 (visibles ou difficiles à défaire)**
- HX1-1 On tourne l'objet après « Tourner » dans la barre 3D, pas en glissant directement dessus : glisser un objet sélectionné le déplace toujours.
- HX1-2 Chaque orbite validée écrit un nouvel instantané PNG (de 100 à 300 Ko) : il reste en mémoire jusqu'à la fermeture, et seul le dernier cité est enregistré.
- HX1-3 Les champs `format`, `files`, `yaw`, `pitch` et `snapshot` sont réversibles jusqu'à la première release.
- HX1-4 Les glTF compressés (Draco, meshopt, KTX2) sont refusés avec un message ; aucun décodeur n'est embarqué.
- HX1-5 `connect-src` de la coque gagne `blob:`.
- HX1-6 100 Mo par fichier 3D même dans la coque, et jamais de lien (U26 ne fixe aucune limite à la coque).
- HX1-7 STL et PLY : on suppose l'axe Z vers le haut, tourné en Y vers le haut.

**Niveau 2**
- HX2-1 Vue par défaut 30° et 20°, sensibilité 0,01 rad/px, `pitch` à ±85°.
- HX2-2 Boîte 4:3 de 640 × 480 unités. HX2-3 Instantané de 1 024 px, rendu à 2 048 px au plus.
- HX2-4 ZIP : 1 000 entrées, 256 Mio décompressés, 20 modèles. HX2-5 Matière grise et deux lumières.
- HX2-6 Une image non citée par le modèle reste importée à part ; `.mtl` ou `.bin` seuls donnent un message.

## 5. Décisions d'architecture

**DAX1 — `model3d` dans le cœur, la vue et l'instantané écrits ensemble.**
Contexte : l'annulation d'une orbite doit rendre l'ancienne vue et sa bonne image.
Décision : `SetModel3dView{yaw, pitch, snapshot}`, une étape par orbite validée ; module `model3d.rs`, patron `media.rs`.
Conséquences : l'ouverture d'un document n'a pas besoin de three. Les anciens instantanés restent en mémoire jusqu'à la fermeture.
Un fichier d'avant C15 n'est pas touché.

**DAX2 — les fichiers liés sont regroupés dans `importFiles`, pas avant.**
Contexte : U23 impose une seule chaîne ; `importFiles` traite aujourd'hui chaque fichier seul (`import.ts:247`).
Décision : pré-passe sur les appels de plusieurs fichiers. Le hook `companions` d'un gestionnaire réclame les fichiers
cités, qui sortent de la boucle ; le blob du principal, lu une fois, est passé à `run`.
Conséquences : le dépôt, la boîte « Importer », le collage et la coque groupent de la même façon ; aucun autre gestionnaire ne change.

**DAX3 — un seul rendu WebGL, dans un morceau chargé à la demande.**
Contexte : l'iPad n'offre que quelques contextes WebGL ; three pèse 648 Ko minifié.
Décision : `model-view.ts` (morceau principal, quelques lignes) importe `model-view-three.ts` (morceau `three`) au
premier besoin. Un `WebGLRenderer` unique sert l'application ; le moteur n'en voit que le port `ModelFrames`.
Conséquences : aucun contexte avant le premier geste 3D. Le rendu WebGL2 de l'encre (`webgl2.ts`, facultatif) reste séparé. WebGL absent : on dessine l'instantané.

**DAX4 — aucune URL de three ne sort de la page.**
Contexte : un glTF peut citer `https://…`, et le web n'a pas de CSP ; les chargeurs de three font `fetch(blob:)`.
Décision : `setURLModifier` ne laisse passer que les `blob:` des assets du dépôt, et convertit les `data:` en `blob:`.
La coque admet `blob:` en `connect-src`.
Conséquences : hors ligne garanti par le code, pas seulement par la CSP ; une texture distante devient un « fichier lié absent ».

**DAX5 — ZIP lus en JS, module `formats` intact.**
Contexte : `formats` a 46 Ko de marge et n'expose aucun lecteur ZIP générique.
Décision : `fflate.unzipSync` (MIT, 5,5 Ko) dans un Worker jetable (`runOnce`), avec des bornes d'entrées et de taille.
Conséquences : 0 octet dans `formats`. L'API asynchrone de fflate n'est pas utilisée, car ses Workers en `blob:` seraient refusés.

## 6. Scénarios d'acceptation

- **S1** Ouvrir l'application : aucun morceau `three-` n'est chargé. Déposer `cube.glb` (fabriqué) au milieu de la page :
  un cube coloré apparaît au point de dépôt, dessiné par son instantané ; three est chargé à ce moment.
- **S2** Sélectionner le cube : la barre 3D apparaît et la scène garde ≥ 640 px. Cliquer « Tourner » et glisser de 100 px
  vers la droite : le cube tourne pendant le geste (`data-model3d` passe en `orbite`, `yaw` + 57°). Relâcher, cliquer à
  côté : l'instantané montre la nouvelle vue. Ctrl+Z : l'ancienne vue revient, en une étape.
- **S3** Déposer ensemble `cube.obj` et `cube.mtl` : un cube bleu, aucun avertissement, le `.mtl` n'est pas importé seul.
  Déposer `seul.obj` : un objet gris, avec l'avertissement « déposé sans son .mtl ». Déposer `piece.stl`, `nuage.ply` et
  `modele.zip` (glTF + `.bin` + texture PNG) : trois objets de plus.
- **S4** Enregistrer, rouvrir : chaque objet est à sa vue et dessiné sans charger three. Le `.roomboard` contient le GLB, l'OBJ, le MTL,
  le glTF, le `.bin`, la texture et les PNG d'instantané cités. Un fichier d'avant C15 s'ouvre comme avant.
- **S5** Sans WebGL : déposer `cube.glb` insère une carte « Objet 3D » et affiche « 3D indisponible sur ce poste ». Rouvrir le
  fichier de S4 : les instantanés sont dessinés, « Tourner » est grisé et affiche le même message.

## 7. Hors périmètre

Édition du maillage ; 3MF, FBX, STEP, IGES ; décodeurs Draco, meshopt, KTX2 ; zoom et panoramique de la caméra ;
animations glTF ; modèle 3D lié en coque ; build et essai réel de la coque Tauri (aucun build) ; essai réel sur iPad.

## 8. Portes immédiates

Aucune.
