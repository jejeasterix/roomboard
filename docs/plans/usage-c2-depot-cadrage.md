# Cadrage — usage-c2-depot (C2, partie « reste » : dépôt, image, conteneur, licences)

Cadré en mode autonome le 2026-11-20 (étage 1, cadreur, brief OD56), sans question posée à Jérôme : chaque point est
tranché depuis les sources ou posé en hypothèse « à revoir ». Cadrage **court** : il cite les décisions U, DAU
(`docs/plans/usage-cadrage.md`) et K, DAK (`docs/plans/usage-c2-coeur-cadrage.md`) sans les refaire. Préfixes propres :
R (décisions), HR (hypothèses), DAR (architecture). Aucun code.

**Révision 1** (contre-relecture tour 1 : 0 bloquant, 6 importants ; base avancée sur `origin/main` 3057e29, C9 fusionné
par la PR #12). Décisions de l'orchestrateur, écrites comme telles (« orch. ») : codec dans la page au lieu du Worker,
dessin du fond hors périmètre, lecteurs d'en-tête PNG et JPEG seulement, repli sur `core.load`, licences après
`pnpm install`, essais existants passés sur un `.tif`, S3 et S5 rattachés à des essais, double insertion par la zone de
dépôt de la barre corrigée, et six mineurs (R7, R11, R1, R20, R21). Lignes relues sur 3057e29.

## 1. Demande et gabarit

**Demande.** Fusionner dans `main`, avec `scripts/verifier.sh : OK`, le reste de C2 : déposer, coller ou importer une
image sur la page ; elle s'affiche, se sélectionne, se déplace, se redimensionne, s'enregistre dans le `.roomboard` et se
rouvre ; un `.roomboard` déposé s'ouvre dans un nouvel onglet (Q1 = b) ; contrôle des licences appelé par `verifier.sh` ;
`format::read_entry` borné.

**Gabarit.** `chantier` (provisoire, confirmé : 30 décisions, budget de 40 questions ; 30 consommées, R1 à R30).

**Prémisses démenties ou corrigées par la carte d'impact.**
- Le dépôt sur les trois hôtes, `importFiles` et l'ouverture d'un `.roomboard` déposé dans un nouvel onglet **existent
  déjà dans `main`** (lot 5b) : `apps/web/src/platform/import.ts:32-66`, `drop-web.ts:21-37` (FSA et repli, écoute sur
  `document`, `mount.ts:70-71`), `host-tauri.ts:113-131` et `apps/desktop/src-tauri/src/main.rs:136-141` (Tauri, chemins
  accordés), `workspace.ts:255-277` (dépôt puis lancement). Ce chantier **étend** `createImporter` en registre par nature.
- La coque n'a **rien à changer** : une image déposée est déjà accordée et lue par `read_granted_file`
  (`main.rs:69-75`, `roomboard-shell/src/lib.rs:72-88`). Aucun build Tauri n'est nécessaire.
- Aujourd'hui une image serait **perdue à l'enregistrement** : `controller.ts:111` enregistre par `doc.save`, qui n'écrit
  que le manifeste et `document.ybin` ; `workspace.ts:195` ouvre par `core.load`, qui ignore `assets/`. Le second module
  Wasm **sert donc à ce chantier** (R7, DAR1) ; le Worker, lui, attend (R10).
- Sélection, déplacement et redimensionnement d'une image marchent déjà côté cœur (`crates/roomboard-core/src/query.rs:130`,
  `Transform`) ; il manque le **dessin** (`canvas2d.ts:188-203` ne connaît que `stroke`, `shape`, `text`).
- **Défaut existant trouvé** : un fichier lâché sur la zone de dépôt de la barre est importé **deux fois** —
  `ui/Toolbar.tsx:35` l'écoute sur la zone, et l'événement remonte à `document`, écouté par l'hôte web
  (`mount.ts:70-71`, `host-fsa.ts:60`, `host-repli.ts:38`). Corrigé ici (R29).

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| R1 | Entrée unique | `createImporter` (`import.ts:32`) devient le registre d'U23. Entrée du registre nommée **`ImportHandler { id, nature, detect(head, name), run(file, ctx) }`** (le nom `Importer` reste à l'objet `{ importFiles }`, `import.ts:24`). Deux entrées : `roomboard` (nature `document`), reconnue **par l'extension** `.roomboard` (`isRoomboardName`, `import.ts:28`) ; `image` (nature `objet`), reconnue par octets magiques dans les 4 096 premiers octets. Non reconnu : refusé avec `LATER_FORMAT_MESSAGE` (inchangé). `ImportReport` gagne `inserted`. | U23 ; U25 ; orch. (mineurs) | oui |
| R2 | Document déposé ou ouvert | **Toujours un nouvel onglet**, sans menu (comportement actuel gardé), par l'ouverture R7. | § 11 Q1 (« Q1 = b ») ; `import.ts:59` ; `workspace.ts:188-200` | oui |
| R3 | Onglet qui reçoit les objets | L'onglet actif **au début** de `importFiles`. Fichiers traités dans l'ordre, une étape d'annulation par image. | U25 ; HR4 | oui |
| R4 | Point d'insertion | `at` (px CSS de la fenêtre ; la coque le ramène déjà par `devicePixelRatio`, `host-tauri.ts:119`) ramené au repère du stage actif, puis au monde par `screenToWorld` (`camera.ts:16`). `at` nul ou hors du stage (zone de la barre, collage, Importer, lancement) : centre de la vue. Image centrée sur ce point ; suivantes décalées de 24 unités en cascade. | U25 ; HR1 | oui |
| R5 | Taille initiale | 1 pixel source = 1 unité monde, réduite (jamais agrandie) pour tenir dans 80 % de la partie visible de la page. | HR1 | oui |
| R6 | Commande | `AddImage{ page, asset: { id, name, mime, size }, w, h, matrix }` par `engine.run` (`engine.ts:68`) : une étape. `w`, `h` = taille source **orientée**. `mime` vient de la détection (la coque rend `mime: ""`, `host-tauri.ts:71`). | K5 ; U5 ; `api.ts:62` | oui |
| R7 | Ouvrir et enregistrer avec assets | **Ouvrir** (menu, dépôt, lancement) : `codec.read` → `core.loadParts(manifest, ybin)` + `AssetStore.adopt` ; avertissements du conteneur dits en une boîte. **Repli (orch.)** : module du codec qui ne se charge pas → `core.load(bytes)` et avertissement « images non lues » ; l'onglet est marqué *assets non lus* (R30). **Enregistrer** : `doc.citedAssets()` vide → `doc.save` direct, **sans codec** : un document sans asset donne exactement les octets du chemin actuel, quel que soit le chemin d'ouverture (choix le plus sûr : la garde `compat_socle` reste vraie sans dépendre du second module) ; sinon `saveParts` + `AssetStore.pick` + `codec.write`. **`startDocument` (attente IndexedDB, `mount.ts:38-50`) reste sur `core.load`** (orch.) ; un document ainsi ouvert qui cite des assets est marqué comme le repli. | U4 ; DAU1 ; DAK1, DAK3 ; `container.rs:73`, `:114` ; orch. | oui (DAR1) |
| R8 | Second module Wasm | Crate `crates/roomboard-formats-wasm` (cdylib, `wasm-bindgen = "=0.2.130"`, dépend de `roomboard-formats`), liaison mince de `container::read` et `container::write` (DAR1). Sortie `apps/web/src/wasm-formats/` (ignorée par Git). | DAU1 ; DAK1 ; `scripts/controle-wasm-bindgen.sh` | oui |
| R9 | `verifier.sh` et taille | Build du second module, `wasm-bindgen --target web --remove-name-section` comme le premier ; ligne `module formats : N octets` (motif `roomboard_formats_wasm_bg*.wasm`) ; refus au-delà de 3 Mio (3 145 728 o). Budget du module principal inchangé (1 572 864 o ; son motif `roomboard_wasm_bg*` ne prend pas le second). | brief OD56 ; HU2-14 ; `verifier.sh:27-47` | oui |
| R10 | Codec dans la page (COUPE, orch.) | **Pas de Worker** : `ContainerCodec` (DAR1) est servi dans la page ; `roomboard-formats-wasm` est chargé par `import()` au **premier besoin** (première ouverture ou premier enregistrement avec assets) et reste chargé jusqu'au rechargement. Raison écrite : un Worker module avec Wasm ne peut être prouvé ici que dans Chromium ; il attend un essai dans les trois WebView (Windows, macOS, Linux), hors de ce chantier. Le port reste celui qu'un Worker servira (méthodes asynchrones, `Blob` en entrée) : le passage au Worker ne change pas les appelants. CSP inchangée (`script-src 'self' 'wasm-unsafe-eval'`, `tauri.conf.json:15`). | orch. ; U4 ; DAU1 ; HR6 | oui |
| R11 | Interface des hôtes | `FileHost.open` garde `bytes: Uint8Array`. **`FileHost.save(encode: () => Promise<Uint8Array>, target)`** : chaque hôte choisit d'abord la cible (boîte FSA appelée pendant l'activation de l'utilisateur, orch.), puis appelle `encode`, puis écrit ; boîte annulée : `encode` n'est pas appelé. Le contrôleur reçoit `encode` au lieu de `doc: Pick<CoreDocument, "save">` (`controller.ts:35`, `:108-130`). | U4 ; orch. (mineurs) ; HR5 | oui |
| R12 | `AssetStore` | Une instance par onglet (`createAssetStore`, `asset-store.ts:26`), créée par l'espace de travail à l'ouverture ou vierge, passée à `makeSession(doc, assets)` ; la session tient le cache des bitmaps (R16), libéré à `dispose`. Empreinte : Web Crypto (inchangé). | K13 ; DAK3 ; HK6 | oui |
| R13 | Décodage | `createImageBitmap(blob, { imageOrientation: "from-image" })` ; SVG : `HTMLImageElement` hors DOM sur une URL `blob:`, puis `createImageBitmap(img)`. Jamais de SVG inséré dans le DOM. | U33 ; `tauri.conf.json:17` (`img-src … blob:`) | oui |
| R14 | Formats | PNG, JPEG, GIF (première image), WebP, BMP, ICO, SVG, AVIF (là où la WebView le lit). HEIC : décodage tenté, échec → « HEIC illisible sur ce poste ». TIFF : détecté et refusé « prochaine version » (crate `tiff` avec C13). RAW : **non reconnu** (HR18). | U33 ; HR8, HR18 | oui |
| R15 | Limites | Web (`fsa`, `repli`) : 100 Mo par fichier, toute nature, contrôlé sur `DroppedFile.size` avant lecture, refus avec message ; coque : aucune limite fixe. Image : 100 millions de pixels au plus ; **en-tête lu avant décodage pour PNG (IHDR) et JPEG (SOFn) seulement** (orch.) ; les autres formats sont contrôlés après décodage, sur largeur × hauteur du bitmap (bitmap fermé et refus au-delà). Côté le plus long au-delà de 4 096 px : bitmap d'affichage réduit à 4 096 (`resizeQuality: "high"`), asset = original. | U26 ; orch. ; HR2 | oui |
| R16 | Rendu | `Canvas2DRenderer` reçoit un port `ImageSource` par `Canvas2DOptions` (`canvas2d.ts:22`, DAR2) ; branche `image` dans `paintElement` (`canvas2d.ts:188-203`) : bitmap dessiné dans la boîte (0, 0)-(w, h) ; asset absent ou en décodage : cadre gris ; branche `unknown` : cadre gris « objet non pris en charge » (U3). Bitmap prêt → `Engine.redraw()` (nouveau, appelle `requestScene`, `engine.ts:178`). Cache par empreinte. **Fond (`backdrop`) non dessiné** : hors périmètre (orch., § 7) ; `SceneSource` (`renderer.ts:36`) inchangé. | U3 ; U5 ; DAR2 ; orch. | oui |
| R17 | Sélection, déplacement, redimensionnement | Outil de sélection du lot 4 inchangé (cœur : `query.rs:130`, `Transform`) ; le fantôme passe par `paintElement`. Après insertion : outil courant et sélection inchangés. | brief ; HR3 | oui |
| R18 | Menu Importer | Action `file-import` « Importer » (`ACTION_TABLE`, `toolbar.ts:93-108` ; `ACTIONS`, `toolbar-host.ts:21-37`), après « Ouvrir » dans le groupe `fichier` des profils intégrés (`toolbar-profiles.ts:60`). `FileHost.pick(): Promise<DroppedFile[]>` (plusieurs fichiers, filtre = extensions du registre). Tauri : `plugin-dialog` `open({ multiple: true })` puis `plugin-fs` `readFile` (portée donnée par la boîte, comme Ouvrir) ; FSA : `showOpenFilePicker({ multiple: true })` ; repli : `<input type=file multiple>`. Puis `importFiles(files, null)`. | U23 ; U24 ; brief (aucun build Tauri) ; HR9 | oui |
| R19 | Collage | `paste` sur `window` (amorce, `main.ts:91-101`) : fichiers `image/*` de `clipboardData.files` → `importFiles(files, null)` ; ignoré quand la cible est éditable (zone de texte, champ, `contenteditable`). Texte et HTML : ignorés (C3). | U23 ; HR10 | oui |
| R20 | Borne de `read_entry` | **Une seule lecture bornée publique dans le cœur** (orch.) : `format::read_bounded(r: impl Read, max: u64) -> Result<Vec<u8>, BoundedReadError>` (`TooLarge`, `Io(String)`), par `take(max + 1)`. `read_entry` (`format/mod.rs:76`) l'appelle : manifeste 1 Mio, `document.ybin` 256 Mio ; au-delà, `FormatError::Corrupt("<entrée> trop gros : plus de N octets")`. `container::read_limited` (`container.rs:144-158`) remplace sa lecture par cet appel et garde ses avertissements. | reste d'OD36 ; orch. ; `container.rs:15`, `:120` | oui |
| R21 | Contrôle des licences | `scripts/controle-licences.mjs` (Node, sans dépendance) : crates de `cargo metadata --format-version 1 --locked --offline` hors membres du workspace ; paquets npm de `node_modules/.pnpm/*/node_modules/**/package.json` (liens exclus), développement compris ; **relevé npm vide = échec** (orch.). Expressions SPDX : `OR`, `AND`, parenthèses, `/` lu comme `OR`, `WITH` gardé tel quel. Acceptées : liste d'U39 (+ `MIT-0`, `Unlicense` en alternative). Refusée : toute expression sans alternative permise (donc AGPL, GPL, LGPL seules). Exceptions écrites une fois : `scripts/licences-acceptees.json` (amorce : `caniuse-lite` CC-BY-4.0, données de build). Appelé par `verifier.sh` **après `pnpm install --frozen-lockfile`** (orch., `verifier.sh:33`) ; test `scripts/tests/controle-licences.test.sh` sur des relevés fabriqués. | U39 ; HK5 ; orch. ; relevé du 2026-11-20 (78 crates, 137 paquets : seule `CC-BY-4.0` hors liste) | oui |
| R22 | Crates de la coque | `apps/desktop/src-tauri` (hors workspace) : `cargo metadata` hors ligne tenté ; indisponible sur la VM (« attempting to make an HTTP request, but --offline was specified ») → ligne `licences : src-tauri non contrôlé (métadonnées hors ligne absentes)`, sans échec. | brief ; HR11 | oui |
| R23 | Avis de tiers | Aucune dépendance nouvelle attendue ; `THIRD_PARTY_NOTICES.md:3-4` : la phrase « Le contrôle scripté […] viennent avec la partie reste » devient le renvoi au script. Toute dépendance ajoutée : une ligne au tableau. | U39 | oui |
| R24 | Coque | Aucun changement de `main.rs`, `tauri.conf.json`, `capabilities/default.json` ; `dragDropEnabled: true` et `"plugins": { "fs": { "scopeDroppedPaths": false } }` gardés. | brief ; U24 | oui |
| R25 | Tests unitaires | Images fabriquées dans les tests ; décodeur et codec injectés en ports (`createImageBitmap` absent sous Node) ; contrat du second module chargé en Node par `initSync`, exigé sous `ROOMBOARD_WASM_REQUIRED=1` comme le premier (`wasm-core.contract.test.ts:16-21`). `~/telechargements-roomboard/images` : essai manuel seulement. | brief ; D33 ; K15 | oui |
| R26 | Geste au navigateur (S1 à S4) | `scripts/essais/c2-image-navigateur.mjs` (Playwright, CSP de la coque servie, mode repli) : dépôt simulé (`dropFile`, `commun.mjs:136`) d'un PNG **sombre** fabriqué → Ctrl+Z / Ctrl+Y → sélection, glisser, **poignée** (S2) → Ctrl+S (téléchargement) → le script **lit l'entrée `assets/<sha256>.png`** du fichier et compare son SHA-256 et ses octets au PNG déposé → Ctrl+O → pixels sombres relevés par `inkIn` (`commun.mjs:71`) dans la boîte de l'image → **second Ctrl+S : mêmes octets** (S3). `--captures` écrit `docs/essais/c2-image-deposee.png` ; ajouté au bloc `--e2e` de `verifier.sh` sans option de capture et à la liste de `scripts/tests/verifier-e2e.test.sh:13`. | brief ; orch. | oui |
| R27 | Geste au navigateur (S5) | Même script : `paste` synthétique (`ClipboardEvent` + `DataTransfer` portant un PNG) → image au centre de la vue ; « Importer » → `page.waitForEvent("filechooser")` puis `setFiles` de deux PNG → deux images en cascade ; dépôt d'un `.tif` → message, `data-version` inchangé. Le refus de plus de 100 Mo : test unitaire seulement (`import.test.ts`, faux `DroppedFile` de taille déclarée). | orch. | oui |
| R28 | Essais qui exigent le refus d'un `.png` | Passés sur un `.tif` : `scripts/essais/s5b-navigateur.mjs:188-192` (`photo.png` → `photo.tif`, octets `49 49 2A 00`), `app/workspace.test.ts:343-351` et `:424` (`image.png`, `a.png` → `.tif`). | orch. | oui |
| R29 | Double insertion par la zone de la barre | `listenWebDrop(target, handler, { stopPropagation: true })` (`drop-web.ts:20`), utilisé par `ui/Toolbar.tsx:35` : le `drop` pris par la zone n'atteint plus l'écoute de `document` de l'hôte web. Test dans `ui/Toolbar.test.tsx` : un `drop` qui remonte depuis la zone appelle `dropFiles` une fois et l'écouteur de `document` zéro fois. | orch. ; `mount.ts:70-71` | oui |
| R30 | Onglet aux assets non lus | Onglet ouvert par `core.load` (repli R7, ou `startDocument`) dont le document cite des assets absents du magasin : **Enregistrer et Enregistrer sous refusés** avec le message « images non lues : enregistrer les perdrait » ; marque gardée jusqu'à la fermeture. Les autres onglets ne sont pas touchés. | R7 ; HR17 | oui |

Constats ouverts des zones touchées (`docs/architecture-constats.md`), à ne pas aggraver : aucune nouvelle copie de
`PAGE_WIDTH` dans `core/` (`api.ts:173`) ni de `finitePositive` (`fake-core.ts:92`) ; aucun `kind` nouveau
(`element.rs:25`) ; `snap_box` (`query.rs:233`, C9) hors zone. Aucune zone « à fermer » dans la demande.

## 3. Carte d'impact

Le profil n'a pas de ligne « Surfaces d'impact » : rubriques déduites. Pas de graphe graphify pour ce dépôt
(`~/.cache/graphes/` n'a que `claude-config`, `roomflow2`, `roomflow2-web`) : recherche texte et lecture, sur 3057e29.

### Cœur Rust (`crates/roomboard-core`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/format/mod.rs:76` `read_entry` | oui | appelle `read_bounded` (R20) | V |
| `src/format/mod.rs` `read_bounded` (nouveau, public) | oui | lecture bornée unique (R20) | S |
| `src/format/mod.rs:173` `open` | oui | erreur « trop gros » | V |
| `src/commands.rs` `AddImage`, `Transform` | non | réutilisés (K5) | V |
| `src/query.rs:130` collision et cadre d'image | non | déjà là | V |
| `src/element.rs:25` `KNOWN_KINDS` | non | aucun `kind` ajouté | V |

### Conteneur et second module (`crates/roomboard-formats`, `crates/roomboard-formats-wasm`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `roomboard-formats/src/container.rs:144-158` | oui | lecture par `format::read_bounded` (R20) | V |
| `roomboard-formats/src/container.rs:73`, `:114` | non | appelés par la liaison | V |
| `crates/roomboard-formats-wasm/` (nouveau) | oui | R8, DAR1 | S |
| `Cargo.toml:3` `members` | oui | ajout du crate | V |
| `Cargo.lock` | oui | nouveau membre (aucun crate externe nouveau attendu) | S |

### Liaison Wasm principale (`crates/roomboard-wasm`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/lib.rs` `load`, `load_parts`, `save_parts`, `cited_assets`, `add_image` | non | déjà exposés par C2 cœur | V |

### Page (`apps/web/src`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `platform/import.ts:24-66` | oui | registre `ImportHandler` (R1), limites R15, `inserted` | V |
| `platform/image-import.ts` (nouveau) | oui | détection, en-tête PNG/JPEG, décodage, `AddImage` (DAR3) | S |
| `platform/container.ts` (nouveau) | oui | `ContainerCodec` servi dans la page, `import()` paresseux (DAR1) | S |
| `platform/files.ts:47-68` `DroppedFile`, `FileHost` | oui | `pick()` (R18), `save(encode, target)` (R11) | V |
| `platform/drop-web.ts:16`, `:20` | oui | `droppedFromFile` réutilisé ; option `stopPropagation` (R29) | V |
| `platform/host-tauri.ts:71`, `:133`, `:140` | oui | `pick()`, `save(encode, target)` | V |
| `platform/host-fsa.ts:23`, `:61`, `:75` | oui | `pick()` ; cible choisie avant `encode` | V |
| `platform/host-repli.ts:22`, `:39`, `:44`, `:79` | oui | `pick()` (plusieurs fichiers), `save(encode, target)` | V |
| `platform/controller.ts:35`, `:108-130` | oui | `encode` (R11), refus R30 | V |
| `platform/mount.ts:38-50` `startDocument` | non | reste sur `core.load` (orch.) ; la marque R30 est posée par l'espace de travail | V |
| `platform/mount.ts:60-72` hôtes web sur `document` | non | inchangé ; R29 arrête la remontée côté zone | V |
| `platform/pending.ts` | non | garde `bytes` | V |
| `app/workspace.ts:129-200`, `:255` | oui | `AssetStore` par onglet, ouverture R7 et repli, `encode`, marque R30, importeur | V |
| `app/board-session.ts:78-112` | oui | reçoit `assets`, crée le cache, le passe au rendu | V |
| `app/toolbar-host.ts:7-37` | oui | action `file-import`, cible `pick` | V |
| `toolbar.ts:93-108` `ACTION_TABLE` | oui | `file-import` | V |
| `toolbar-profiles.ts:60` | oui | bouton « Importer » (zone aussi réécrite par C1, § Chantiers) | V |
| `ui/App.tsx:103-104` | oui | cible `pick` → `importFiles` | V |
| `ui/Toolbar.tsx:35` zone de dépôt | oui | `stopPropagation` (R29) | V |
| `main.ts:91-101` | oui | écoute `paste` (R19) | V |
| `engine/engine.ts:68`, `:178` | oui | `redraw()` public (R16) | V |
| `engine/render/canvas2d.ts:22`, `:188-203`, `:363-372` | oui | option `images`, branches `image` et `unknown`, fabrique | V |
| `engine/render/canvas2d.ts:167` place du `backdrop` | non | fond hors périmètre (orch.) | V |
| `engine/render/renderer.ts:36` `SceneSource` | non | inchangé (plus de `page` à y ajouter) | V |
| `engine/render/select.ts:49`, `:54`, `:65`, `:89` | oui | options passées aux quatre créations du rendu | V |
| `engine/render/image-cache.ts` (nouveau) | oui | cache des bitmaps (DAR2) | S |
| `engine/render/fake-ctx.ts` | oui | `drawImage` noté (aucun aujourd'hui) | V |
| `engine/tools/select.ts`, `handles.ts` | non | inchangés (R17) | V |
| `engine/render/webgl2.ts`, `grid-paint.ts` | non | canvas d'interaction ; grille de C9 | V |
| `core/asset-store.ts:26` | non | réutilisé | V |
| `core/api.ts`, `core/fake-core.ts`, `core/wasm-core.ts` | non | `AddImage` (`api.ts:62`), `page` (`:136`), `citedAssets` (`:137`), `saveParts` (`:151`), `loadParts` (`:166`) déjà là | V |
| `app/stage-tags.ts:12` | non | `data-selection`, `data-bounds` suffisent au geste | V |

### Coque (`apps/desktop`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src-tauri/src/main.rs:69-75`, `:136-141` | non | dépôt déjà accordé et émis | V |
| `src-tauri/tauri.conf.json:11`, `:13-24`, `:28` | non | `dragDropEnabled`, CSP, `scopeDroppedPaths: false` gardés | V |
| `src-tauri/capabilities/default.json` | non | `dialog:allow-open`, `fs:allow-read-file` couvrent Importer | V |
| `crates/roomboard-shell/src/lib.rs:72-95` | non | lecture par morceaux réutilisée | V |

### Persistance et format

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| entrées `assets/<sha256>.<ext>` du `.roomboard` | oui | désormais écrites par la page (R7) | V |
| fichier sans asset | non | octets identiques (`doc.save` direct ; garde `compat_socle`) | V |
| IndexedDB `roomboard-fichiers` | non | ligne inchangée, lue par `core.load` | V |

### Outillage, scripts et CI

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/verifier.sh:27-47`, `:33`, `:62-69` | oui | second module et sa taille ; licences après `pnpm install` ; essai e2e | V |
| `scripts/controle-licences.mjs`, `scripts/licences-acceptees.json` (nouveaux) | oui | R21 | S |
| `scripts/tests/controle-licences.test.sh` (nouveau) | oui | R21 | S |
| `scripts/tests/verifier-e2e.test.sh:13` | oui | nouvel essai dans la liste | V |
| `scripts/essais/c2-image-navigateur.mjs` (nouveau) | oui | R26, R27 | S |
| `scripts/essais/s5b-navigateur.mjs:188-192` | oui | refus passé sur un `.tif` (R28) | V |
| `scripts/essais/commun.mjs:71`, `:136` | non | `inkIn`, `dropFile` réutilisés | V |
| `scripts/controle-wasm-bindgen.sh`, `controle-hors-ligne.mjs` | non | à garder verts (même version épinglée ; aucun hôte cité) | V |
| `.gitignore` | oui | `apps/web/src/wasm-formats/` | V |
| `THIRD_PARTY_NOTICES.md:3-4` | oui | R23 | V |

### Tests

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `platform/import.test.ts` | oui | registre, limites, cible, ordre | V |
| `platform/controller.test.ts` | oui | `encode`, refus R30 | V |
| `app/workspace.test.ts:343-351`, `:424` | oui | `.tif` (R28) ; ouverture, repli et enregistrement avec assets (faux codec) | V |
| `platform/host-*.test.ts` | oui | `pick()`, `save(encode, target)` (cible avant `encode`) | V |
| `engine/render/canvas2d.test.ts` | oui | image, cadre inconnu | V |
| `ui/Toolbar.test.tsx`, `toolbar*.test.ts` | oui | R29 ; action et bouton nouveaux | V |
| `engine/render/grid-paint.test.ts` | non | à garder vert (C9) | V |
| `core/wasm-core.contract.test.ts` | non | à garder vert | V |
| `crates/roomboard-core/tests/compat_socle.rs` | non | à garder vert : fichier du socle à l'identique | V |
| `crates/roomboard-formats/tests/*` | non | à garder vert après R20 | V |
| `scripts/essais/fichiers-navigateur.mjs`, `s2`, `s34-navigateur.mjs` | non | à garder verts (Ouvrir passe par le codec) | V |

### Autres dépôts et services

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `roomboard-prive` | non | hors périmètre | S |
| `~/telechargements-roomboard/` | non | lu seulement | V |

### Effets de bord sur l'existant

- Ouvrir un `.roomboard` (menu, dépôt, lancement) passe par le codec au lieu de `core.load` : `workspace.test.ts`
  (« ouvrir garde les assets »), `fichiers-navigateur.mjs` rejoué au `--e2e`.
- Codec indisponible : ouverture par `core.load`, avertissement, enregistrement refusé si des images manquent :
  `workspace.test.ts` (« repli : images non lues ») et `controller.test.ts` (refus R30).
- Enregistrer un document **sans** image garde les mêmes octets, sans charger le second module : `controller.test.ts`,
  `compat_socle.rs`.
- `FileHost.save` reçoit `encode` : la boîte vient avant l'encodage ; boîte annulée, rien n'est encodé :
  `host-fsa.test.ts`, `host-tauri.test.ts`, `host-repli.test.ts`.
- Un `.png` déposé n'est plus refusé, il est inséré ; les essais qui exigeaient ce refus passent sur un `.tif` :
  `s5b-navigateur.mjs`, `workspace.test.ts`.
- Un fichier lâché sur la zone de dépôt de la barre n'est plus importé deux fois : `Toolbar.test.tsx`.
- Web : un fichier de plus de 100 Mo déposé est refusé avant lecture, `.roomboard` compris : `import.test.ts`.
- Barre : un bouton « Importer » de plus dans les profils intégrés ; un profil enregistré par l'utilisateur ne le
  reçoit pas : `toolbar-profiles.test.ts`.
- `read_entry` refuse un manifeste de plus de 1 Mio ou un `document.ybin` de plus de 256 Mio : tests de `format/mod.rs` ;
  `container` garde ses avertissements : `crates/roomboard-formats/tests/container.rs`.
- `verifier.sh` échoue sur une licence hors liste ou un relevé npm vide : `controle-licences.test.sh`.

### Chantiers en cours

- **C9 fusionné** (PR #12, `main` 3057e29) : plus de recouvrement. Ses ajouts sont relus : `canvas2d.ts` (place du
  `backdrop` en `:167`, non utilisée ici), `renderer.ts:36`, `engine.ts`, `fake-ctx.ts`.
- **C1 profils** (`feat/usage-c1-profils`, worktree `~/projets/roomboard-wt/usage-c1-profils` @ 3057e29, cadrage seul, aucun
  code, aucune PR : `gh pr list` vide). Recouvrements d'après son cadrage : `toolbar-profiles.ts:45-68` (C1 met les barres
  de `defaut` en fonction partagée ; ce chantier y ajoute « Importer » en `:60`), `host-repli.ts` `pickFile` et
  `host-tauri.ts` `TauriDialog` (C1 les réutilise ; R18 les étend : son cadrage le note déjà, « modifié par OD56 »),
  `import.ts` (C1 n'y touche pas). Le second à fusionner rebase ; conflit attendu de quelques lignes dans
  `toolbar-profiles.ts`.
- Aucun autre worktree (`git worktree list` : `main`, ce chantier, C1).

### Termes cherchés

Graphe : aucun pour ce dépôt. Recherche texte (`grep -rln` sur `apps`, `crates`, `scripts`, hors `node_modules`) :
`createImageBitmap`, `ImageBitmap`, `drawImage` (seulement `scripts/essais/s2-navigateur.mjs`) ; `new Worker`,
`addEventListener("paste"`, `clipboardData`, `magic`, `licen`, `accept=`, `file-import` (aucun) ; `read_entry`
(`format/mod.rs`) ; `showOpenFilePicker`, `multiple`, `screenToWorld`, `importFiles`, `createImporter`, `onDrop`,
`listenWebDrop`, `dropTarget`, `launchFiles`, `AssetStore`, `saveParts`, `loadParts`, `core.load`, `.put(`, `pickFile`,
`SceneSource`, `createCanvas2DRenderer`, `new Canvas2DRenderer`, `requestScene`, `setSelection`, `dropzone`, `photo.png`,
`image.png`, `inkIn`, `dropFile`, `take(max`. Coque : `Drop`, `grant`, `ASSOCIATED_EXTENSIONS` dans `main.rs`. Licences :
`cargo metadata --format-version 1 --locked --offline` (workspace, puis `src-tauri`), parcours de `node_modules/.pnpm`.
Chantiers : `git diff --stat origin/main...feat/usage-c9-grille` (avant fusion), `git worktree list`, `gh pr list`,
chemins cités dans `usage-c1-profils-cadrage.md`. Coffre : `chercher.js "RoomBoard dépôt image import assets"` et
`"Tauri drag drop onDragDropEvent createImageBitmap"` : rien de propre à RoomBoard.

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| entrée unique des fichiers | `platform/import.ts:32` | `createImporter(deps).importFiles(files, at)` → registre `ImportHandler` (U23) | étendre |
| reconnaître un `.roomboard` | `platform/import.ts:28` | `isRoomboardName(name)` | réutiliser |
| fichier déposé ou collé → `DroppedFile` | `platform/drop-web.ts:16` | `droppedFromFile(f)` | réutiliser |
| dépôt sur la zone de la barre | `platform/drop-web.ts:20` | `listenWebDrop(target, handler, { stopPropagation })` | étendre |
| fichier de la coque | `platform/host-tauri.ts:67` | `grantedFile(ipc, path, size)` | réutiliser |
| ouvrir dans un nouvel onglet | `app/workspace.ts:188` | `openDocument(file)` (corps : ouverture R7) | étendre |
| octets des assets | `core/asset-store.ts:26` | `createAssetStore().put`, `adopt`, `pick` | réutiliser |
| assets à écrire | `core/api.ts:137` | `doc.citedAssets()` | réutiliser |
| manifeste et `document.ybin` | `core/api.ts:151`, `:166` | `saveParts`, `core.loadParts` | réutiliser |
| ouverture de repli | `core/api.ts` `CoreFactory.load` (`wasm-core.ts`) | `core.load(bytes)` | réutiliser |
| écriture et lecture des `assets/` | `crates/roomboard-formats/src/container.rs:73`, `:114` | `container::write(parts, assets)`, `container::read(file)` | réutiliser (par la liaison R8) |
| liaison Wasm du conteneur | aucun | `ContainerReader`, `write_container` (DAR1) | nouveau module : DAU1 le nomme ; `formats-wasm`, `wasm-formats` sans résultat |
| port page ↔ conteneur | aucun | `ContainerCodec` (DAR1) | nouveau module : `new Worker`, `container` côté page sans résultat |
| lecture bornée d'une entrée ZIP | `container.rs:144-158` (motif `take(max + 1)`) | déplacé en `format::read_bounded` public, appelé par `read_entry` et `container` | étendre (le cœur porte la fonction, le conteneur l'appelle) |
| insérer une image (une étape) | `engine/engine.ts:68` | `engine.run({ type: "AddImage", … })` | réutiliser |
| écran → monde | `engine/camera.ts:16` | `screenToWorld(camera, sx, sy)` | réutiliser |
| redessiner quand un bitmap arrive | `engine/engine.ts:178` | `requestScene()` exposé en `Engine.redraw()` | étendre |
| détection, en-tête, décodage | aucun | `image-import.ts` (DAR3) | nouveau module : `magic`, `createImageBitmap`, `ImageBitmap` sans résultat dans `apps/` |
| cache des bitmaps | aucun (cache `Path2D` de `canvas2d.ts:121` : traits seulement, synchrone) | `ImageSource` (DAR2) | nouveau module : `ImageBitmap`, `drawImage` sans résultat dans `apps/` |
| dessiner l'élément | `engine/render/canvas2d.ts:188` | `paintElement` : branches `image` et `unknown` ; `Canvas2DOptions` (`:22`) | étendre |
| sélection, déplacement, redimensionnement | `engine/tools/select.ts`, `tools/handles.ts` | inchangés | réutiliser |
| boîte d'ouverture multiple | `host-tauri.ts:133`, `host-fsa.ts:61`, `host-repli.ts:79` | `dialog.open`, `showOpenFilePicker`, `pickFile` étendus à plusieurs fichiers | étendre |
| action de barre | `toolbar.ts:93`, `app/toolbar-host.ts:21` | `ACTION_TABLE`, `ACTIONS` | étendre |
| message à l'utilisateur | `app/workspace.ts:75` | `say(message)` | réutiliser |
| essai : dépôt, pixels | `scripts/essais/commun.mjs:136`, `:71` | `dropFile(page, sel, name, bytes, type)`, `inkIn(page, box)` | réutiliser |
| contrôle des licences | aucun (`licen` : 0 dans `scripts/`) | `node scripts/controle-licences.mjs [--cargo-json f] [--npm-root d]` → code 0 / 1, une ligne par écart | nouveau module : U39 ; interface d'une commande |

## 4. Hypothèses à revoir

**Niveau 1 — visibles des utilisateurs ou difficiles à défaire.**
- **HR1** Point et taille d'insertion (R4, R5) : centre de la vue sans point ; 1 px = 1 unité, réduit à 80 % de la vue ;
  cascade de 24 unités. Défaut choisi sans référence ActivInspire lue.
- **HR3** Après insertion, l'outil et la sélection ne changent pas (R17) ; sélectionner l'image insérée est l'autre option.
- **HR4** Onglet cible = onglet actif au début du dépôt (R3) : un `.roomboard` et une image déposés ensemble mettent
  l'image dans l'onglet d'origine.
- **HR6** Codec dans la page (R10, orch.) : la mémoire du second module **reste prise jusqu'au rechargement** ; écart à U4
  (« son instance est jetée ») et DAU1 (« jeté après usage »). Le Worker attend un essai dans les WebView de Windows,
  macOS et Linux, hors de ce chantier. Le codec dans la page n'est prouvé que dans Chromium headless (R26).
- **HR9** Importer dans la coque par `plugin-dialog` + `plugin-fs` (R18) au lieu de la boîte ouverte depuis Rust
  (`DialogExt`) et de `read_granted_file` d'U24 : aucun build Tauri sur ce chantier ; fichier lu en une fois. À reprendre
  avec C14.
- **HR11** Crates de `src-tauri` non contrôlés tant que leurs métadonnées ne sont pas en cache (R22).
- **HR17** Repli sur `core.load` (R7, R30, orch.) : l'onglet s'ouvre sans ses images et refuse d'enregistrer ; l'autre
  option (enregistrer quand même, images perdues) est écartée.

**Niveau 2.**
- **HR2** 100 Mpx lus dans l'en-tête pour PNG et JPEG seulement (orch.) ; GIF, WebP, BMP, ICO, AVIF, HEIC, SVG contrôlés
  après décodage, mémoire déjà prise une fois (R15).
- **HR5** `FileHost.open` et `PendingStore` gardent `Uint8Array` (R11) : DA8 en `Blob` (U4) attend un besoin mesuré.
- **HR7** Ouvrir essaie **toujours** le codec, même sans asset (R7) : le second module est chargé à la première ouverture ;
  HU2-14 le voulait seulement pour un document qui a des assets.
- **HR8** TIFF refusé (R14) ; le crate `tiff` (MIT) arrive avec C13.
- **HR10** Collage : fichiers seulement ; une image copiée sous forme HTML n'est pas reprise (R19).
- **HR12** Cache par empreinte et non « par élément » (U5) : asset immuable, bitmap partagé (R16).
- **HR13** Assets cités mais absents d'un fichier lu par le codec (avertissement à l'ouverture) : non écrits, sans refus
  (R7) ; seul l'onglet de repli refuse (R30).
- **HR14** Limite de 100 Mo appliquée au dépôt, au collage et à Importer ; Ouvrir par le menu ne la contrôle pas (R15).
- **HR15** Second module sous 3 Mio, contrôlé par `verifier.sh` (R9, d'après HU2-14).
- **HR16** Bornes de `read_entry` : 1 Mio et 256 Mio (R20), sans mesure d'un gros document réel.
- **HR18** RAW non reconnu (R14, orch.) : écart à U33 (« RAW : aperçu JPEG intégré seulement ») ; un fichier RAW est
  refusé comme format inconnu.
- **HR19** Pas de « file annulable » (orch.) : écart à U25 (« Plusieurs fichiers : traités dans l'ordre, une étape
  d'annulation par fichier, file annulable ») ; les fichiers sont traités dans l'ordre sans bouton pour arrêter la file ;
  chaque image reste annulable par Ctrl+Z.
- **HR20** `startDocument` reste sur `core.load` (orch.) : un fichier en attente IndexedDB qui porte des images s'ouvre
  sans elles et prend la marque R30 ; aucun code de `main` n'écrit plus d'attente (`.put(` : 0 hors tests).

## 5. Décisions d'architecture

**DAR1 — Conteneur dans la page derrière un port, module chargé au premier besoin.**
Contexte : sans lui, une image n'est ni écrite ni relue (§ 1) ; le Worker d'U4 ne se prouve pas ici (orch., R10).
Décision : `roomboard-formats-wasm` expose `ContainerReader::open(file: &[u8])` (`manifest()`, `ybin()`, `asset_count()`, `asset_id(i)`, `asset_bytes(i)`, `warnings()`) et `write_container(manifest, ybin, ids: Vec<String>, mimes: Vec<String>, sizes: Vec<u32>, bytes: &[u8])` (assets bout à bout) ; page : `ContainerCodec { read(file: Blob): Promise<{ manifest, ybin, assets: [id, Blob][], warnings }>; write(manifest, ybin, assets: { id, mime, blob }[]): Promise<Uint8Array> }`, `createPageCodec(load = () => import(…))`.
Conséquences : aucune dépendance nouvelle ; tests sur un faux codec ; un Worker se branchera derrière le même port ; échec de `load` → repli R7.

**DAR2 — Bitmaps par empreinte, servis au rendu par un port.**
Contexte : le décodage est asynchrone ; le rendu de la scène est synchrone (`canvas2d.ts:158`).
Décision : `engine/render/image-cache.ts` : `createImageCache(assets: AssetStore, decode: Decoder, ready: () => void): ImageSource & { dispose(): void }`, `ImageSource { bitmap(asset: string): CanvasImageSource | null }` (null : absent ou en cours ; décodage lancé au premier appel ; `ready` appelle `engine.redraw()`), passé par `Canvas2DOptions.images`.
Conséquences : `SceneSource` inchangé ; un onglet fermé ferme ses bitmaps ; le fond (C4, C11b) et C5 réutiliseront le même cache.

**DAR3 — Un module image, partagé par dépôt, collage et Importer.**
Contexte : détection, limites, en-tête et décodage servent les trois entrées et le cache.
Décision : `platform/image-import.ts` : `sniffImage(head: Uint8Array, name: string): ImageKind | null`, `probeSize(blob: Blob, kind): Promise<{ w, h } | null>` (PNG, JPEG ; null ailleurs), `decodeImage(blob: Blob, kind, max = 4096): Promise<{ bitmap, w, h }>` (w, h orientés, taille source ; refus au-delà de 100 Mpx), `imageHandler(ctx): ImportHandler`.
Conséquences : un seul endroit pour U26 et U33 ; le cache appelle le même `decodeImage` ; HEIC, TIFF et d'autres en-têtes changent ici seulement.

## 6. Scénarios d'acceptation

- **S1** Dans le navigateur, glisser un PNG sur la page : l'image apparaît au point de dépôt ; Ctrl+Z la retire, Ctrl+Y
  la remet. *(R26)*
- **S2** Prendre la sélection, cliquer l'image, la glisser puis tirer une poignée : elle suit pendant le geste, garde sa
  nouvelle place et sa nouvelle taille. *(R26)*
- **S3** Enregistrer (Ctrl+S) : le fichier contient `assets/<sha256>.png`, aux octets du PNG déposé ; rouvrir : l'image est
  là, ses pixels sombres se voient à sa place ; enregistrer encore : mêmes octets. *(R26)*
- **S4** Déposer un `.roomboard` qui contient des images : il s'ouvre dans un nouvel onglet avec ses images ; l'onglet
  d'origine reste intact. *(R26, `workspace.test.ts`)*
- **S5** Coller une image (Ctrl+V) : elle arrive au centre de la vue. « Importer » deux images : elles arrivent en
  cascade. Déposer un TIFF : message, document inchangé. Un fichier de 120 Mo dans le navigateur : refus avant lecture.
  `scripts/verifier.sh` : licences contrôlées, taille des deux modules affichée, OK. *(R27, `import.test.ts`,
  `controle-licences.test.sh`)*

## 7. Hors périmètre

- **Dessin du fond (`backdrop`)** : C4 et C11b, qui permettront d'en poser un (orch.) ; la place réservée par C9
  (`canvas2d.ts:167`) reste vide.
- **Worker du conteneur** : après un essai dans les WebView de Windows, macOS et Linux (R10, HR6).
- PDF, vidéo, son, 3D, formats de tableaux blancs (C12 à C15, C13) ; TIFF (HR8) ; RAW (HR18) ; HEIC par décodeur du système.
- File d'import annulable (HR19) ; insertion des pages d'un document déposé et copier / coller d'objets (C3).
- Édition d'image (C5) ; transparence cliquable « Pick Through » (HU2-9).
- DA8 en `Blob`, écriture des assets par morceaux, boîte Importer ouverte depuis Rust (HR5, HR9).
- `collect_out` récursif sans borne de profondeur (état C2 cœur, « Hors périmètre »).
- Worktree et cadrage de C1 (`feat/usage-c1-profils`) : lus seulement.
- Build Tauri, build Android ; `roomboard-prive` ; `~/telechargements-roomboard/` (lu seulement, rien de commité).

## 8. Portes immédiates

Aucune.
