# Cadrage — usage C6b : pot de peinture sur image

Cadrage autonome (étage 1, 2026-11-21, OD91), base `origin/main` @ 458a90d. Il applique **U28** (palier « P1 image »)
et la partie destructive de **U29** (`docs/plans/usage-cadrage.md:81-82`), avec U26 (`:79`), HU2-9 (`:316`) et le
scénario S8 (`:440-442`), sans les refaire ; il étend C6a (pot vectoriel) et C5 (pixels), sans les refaire. Sources :
cadrage de l'usage ; cadrages et états de C2 (K3), C5 et C6a ; études `docs/etudes/usage-edition-image.md` (« étude
image ») et `docs/etudes/usage-pot-de-peinture.md` (« étude pot ») ; coffre : décisions 0254 (commande `Fill`), 0256
(contigu depuis les bords), 0257 (Worker de pixels vivant), journal C6a clos ; code de `main`. Graphe graphify absent
pour ce dépôt (`~/.cache/graphes/` n'a pas `roomboard`) : recherche texte seule. Recherche du coffre non dégradée.
Révisé après la contre-relecture, tour 1 (5 importants, 8 mineurs : section 9).

## 1. Demande et gabarit

Demande (Jérôme, citée par U28) : « remplir n'importe quelle zone fermée (image comprise), d'effacer modifier la couleur
d'un objet » — le pot remplit une zone d'une image par diffusion 4-connexe, tolérance réglable dans la rangée de l'outil
(défaut 5 sur 100) ; « effacer » rend la zone transparente ; un clic = une étape ; « Rétablir l'original » rend l'image
d'avant tout remplissage. Gabarit : **courte** (10 questions au plus ; 10 consommées, Q1 à Q10 ci-dessous).

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| B1 | Périmètre | U28 P1 image + U29 destructif (pot seul ; gomme sur image hors chantier). Hors : P2, P3 (`kind: "fill"`, C8), rotation libre. | brief ; U28, U29 ; `usage-cadrage.md:550` | oui |
| B2 | Commande (Q1) | Variante `FillTarget::Image { id, asset: AssetRef }` de `Command::Fill` (patron de DA1) ; `color` contrôlée comme ailleurs (`valid_color` ou `None`) mais non écrite : les pixels la portent. Refus dans l'ordre : couleur, page, élément de cette page, pas une image lisible → `BadFill`, asset non conforme → `BadAsset`. Même asset que l'actuel : aucune étape (D38). | décision 0254 (« C6b (zone d'image) […] ajouteront une variante ») ; `fill.rs:3-4` ; `commands.rs:1003` (`valid_asset`) | oui |
| B3 | Écriture (Q2) | Une transaction : `asset` ← nouvel asset ; `sourceAsset` ← ancien `asset` **seulement s'il est absent** (l'original reste celui d'avant le premier remplissage) ; métadonnée du nouvel asset (`insert_asset_meta`). Le cœur, pas la page, tient l'invariant de B4. Code dans `image.rs` (`cmd_fill_image`), `fill.rs` n'a que le bras. | U29 (« nouvel asset PNG, l'élément garde `sourceAsset` ») ; étude image `:35` (ActCraft : « ancienne ressource conservée ») ; C5 I7 | oui |
| B4 | Champs de C5 après un remplissage (Q2) | **Pixels cuits** : le remplissage part de l'image **telle qu'affichée hors géométrie** (couleur transparente puis luminosité/contraste, I10), calculée à pleine résolution ; `brightness`, `contrast`, `transparent` sont retirés dans la même transaction (sinon appliqués deux fois). **Géométrie gardée** : `crop`, `flipX`, `flipY`, `quarterTurns` et la matrice ne changent pas (même taille d'asset). Annuler rend les trois champs et l'ancien asset (même étape). Un panneau Image ouvert jette son brouillon à cette écriture (C5 I31, écriture « venue d'ailleurs »). | étude image `:76` (« un élément image pourrait avoir à la fois des paramètres et un asset déjà modifié ») ; C5 I10, I31 ; défaut raisonnable (HB1) | oui |
| B5 | Point du clic (Q3) | Calculé **au clic** (comme la couleur, C6a PC12) : monde → `invertMatrix(transform)` → boîte affichée `(0,0)-(bw,bh)` ; un point de la bande de tolérance (6 px écran) hors de la boîte y est **ramené** (bornage, comme un texte ou un tableau, C6a D7, PC10) ; → `displayToSource` (rognage, retournements, quarts de tour, C5 DAI1) → pixel source `floor`, borné à `[0, w−1] × [0, h−1]`. Calcul pur `sourcePixelAt` dans `core/image-params.ts`, **partagé avec la pipette** (`image-edit.ts:137-143` refait ce calcul en ligne ; la pipette garde son refus hors boîte). La règle d'ordre de B13 garantit que l'élément n'a pas changé entre le clic et l'écriture. | C5 DAI1, I29 ; `image-params.ts:65` ; C6a D7 ; anti-refactorisation (duplication nette) | oui |
| B6 | Diffusion | Sur toute l'image source, parties rognées comprises (comme C5 I10) : aucun paramètre de bornes ajouté au module `formats`. | C5 I10 ; brief (« strict nécessaire ») ; HB5 | oui |
| B7 | Original à pleine résolution (Q4) | Le remplissage porte sur **l'original à pleine résolution, toujours** : le Worker décode le `Blob` de l'asset (magasin d'assets) par `decodeImage(blob, kind, Infinity, ports du Worker)` — même orientation EXIF et même borne de 100 Mpx qu'à l'import (U26) — jamais la copie d'affichage. La copie d'affichage du nouvel asset est refaite **par le même chemin** (`decodeImage(png, "png", DISPLAY_MAX, …)` dans le Worker) et adoptée par le cache (B14). Aucun refus de taille : aucune limite mesurée ne l'exige (étude image `:108` : « 4096 px de côté maximum, à confirmer », règle de mémoire d'affichage, pas de calcul). Un échec de mémoire ou de canvas est rendu `echec` avec message, aucune étape. SVG : le Worker ne sait pas le rastériser (pas de DOM) : il reçoit le bitmap décodé du cache (taille intrinsèque, ≤ 4096 px). | brief (« porte sur l'original ») ; U26 (100 Mpx) ; U5 (`w`, `h`, `crop` en pixels source) ; `platform/image-import.ts:156-181` ; HB2 | oui |
| B8 | Comparaison et peinture (Q5) | Écart **RVBA** au pixel de la graine (plus grand écart des 4 canaux × 100 ≤ tolérance × 255, échelle de C5 I12) ; remplir : RVB choisi, **alpha 255** ; effacer : `[0, 0, 0, 0]`. Sur une zone opaque, même résultat que « alpha gardé » à 13 niveaux d'alpha près. **Écart à C5 I16 et ActCraft (« alpha gardé », RVB seul)** : avec RVB seul, une zone transparente (lue `0,0,0,0` par le canvas) déborde dans le noir voisin, et remplir une zone effacée resterait invisible. | C5 I12 ; I16 (écart, HB3) ; étude image `:36` | oui |
| B9 | Effacer (Q6) | Le bouton existant « Aucune » (`data-fill-none`, couleur `null`) est le mode « effacer » : sur une image, la zone devient transparente ; aucun bouton neuf. | U28 (« « effacer » une forme = `fill: none` » et « « effacer » une zone d'image = la rendre transparente ») ; C6a D11 ; étude pot `:62`, `:102` | oui |
| B10 | Tolérance (Q7) | Curseur 0-100 (pas de 1), défaut **5**, dans la rangée du pot après « Aucune » (`data-fill-tolerance`, libellé « Tolérance » et valeur) ; tenu par le moteur (`setFillTolerance`, `EngineState.fillTolerance`), lu au clic comme la couleur (C6a PC12) ; sans effet sur les cibles vectorielles ; non enregistré (HB8). | U28 (« réglable dans la rangée de l'outil », « défaut 5 sur 100 ») ; étude pot `:31` | oui |
| B11 | Rétablir l'original (Q8) | Un seul bouton, celui de C5 (`ImagePanel.tsx:155` → `ImageEdit.restore`, que C5 DAI4 réservait à C6b) : `SetImageParams { params: {}, matrix: placeAfter(...), restore: true }`, une étape : `asset` ← `sourceAsset`, `sourceAsset` retiré, tous les champs de C5 retirés. Sans `sourceAsset` : comportement de C5 inchangé. | U29 (« « Rétablir l'original » retire les champs », « `sourceAsset` […] pour « Rétablir l'original » ») ; C5 DAI4, HC5-15 | oui |
| B12 | Champ `sourceAsset`, métadonnées | Chaîne d'empreinte dans le `Y.Map` de l'élément ; lue tolérante (non conforme = absente, U3) ; `ImageView.source_asset` (`sourceAsset`, absent si `None`) ; `schema` et `formatVersion` inchangés. Enregistré, copié, collé, `.rbitem` sans code neuf : `collect_out` cite toute chaîne conforme (`document.rs:679`, `copy.rs:94`). Octets enregistrés : l'original et la version courante seulement. **Vérifié** : la métadonnée (`name`, `mime`, `size`) d'une version intermédiaire reste dans la racine `assets` de l'état enregistré, sans ses octets — règle de C2 K3 (« une métadonnée qui n'est plus citée reste dans le document (aucun ménage implicite) ; elle n'est pas écrite dans `assets/` »), gardée telle quelle. | U3 ; C2 K3, K4 (`usage-c2-coeur-cadrage.md:37-38`) ; `document.rs:238-245` | oui |
| B13 | Ordre et péremption (Q9) | **Une file du pot par onglet** (`app/image-fill.ts`), dans l'ordre des clics : tant qu'elle est vide, un clic vectoriel s'écrit tout de suite (C6a inchangé) ; dès qu'un remplissage d'image est en route, **tout** clic du pot, vectoriel compris, passe derrière lui. Jeton de révision : la file retient `doc.version()` au premier clic mis en file, puis la version rendue par chacune de ses propres écritures ; avant chaque calcul et avant chaque écriture, si `doc.version()` diffère (annuler, rétablir, autre outil, autre écrivain), le résultat en route est jeté et **toute la file est vidée**, aucune étape, message « remplissage abandonné : le document a changé ». Un calcul ne part qu'après l'écriture du précédent (il lit l'asset écrit par lui). `changed: 0` → aucune étape (D38). | U28 (« un clic = une étape ») ; D38 ; C5 I19 (péremption jugée par l'appelant) ; `api.ts:309` (`version()`) ; contre-relecture tour 1 (I2) | oui |
| B14 | Calcul, nouvel asset, ordre des effets | Dans le Worker de pixels vivant de C5 : `PixelRunner.fill(job)` (même Worker, même file, délai 60 s) : décodage pleine résolution (B7), `applyPixels` (B4), `image_flood_fill`, `putImageData`, `convertToBlob({ type: "image/png" })`, copie d'affichage ; rend `{ png, bitmap, changed }` ou `{ changed: 0 }`. Puis, dans la page, dans cet ordre : jeton vérifié (B13) → `AssetStore.put(png)` → `Fill` écrit → **si l'écriture réussit**, le cache **adopte** le bitmap pour le nouvel asset (pas de décodage, pas de clignotement) ; **si elle échoue** (refus du cœur, jeton périmé), le bitmap est fermé et le PNG reste dans le magasin sans être cité (jamais enregistré ; le magasin n'a pas de retrait). `AssetRef { name: nom de l'original, extension remplacée par `.png` ; mime `image/png` ; size }`. | décision 0257 (« L'encodage PNG viendra avec C6b ») ; C5 I18, I22, DAI3 ; `asset-store.ts:36` ; HB10 | oui |
| B15 | Mémoire du cache | Le cache des bitmaps décodés (`done`, `image-cache.ts:97`, vidé aujourd'hui seulement par `dispose`) et les emplacements retouchés gardés (B16) ont un **budget** : `DECODED_BUDGET_PX = 48 Mpx` (≈ 192 Mo RGBA). À chaque `endScene`, au-dessus du budget, le cache ferme d'abord les bitmaps **le moins récemment dessinés** qui ne sont **pas dans la scène** ; un bitmap de la scène n'est jamais fermé. Un bitmap fermé se redécode à la demande depuis le magasin (le `Blob` reste) ; la copie adoptée d'un asset fermé se redécode par le chemin ordinaire. 10 remplissages d'une photo de 24 Mpx tiennent donc le budget au lieu de 960 Mo. | contre-relecture tour 1 (I1) ; U26 ; étude image `:108` (mémoire de l'iPad) ; défaut raisonnable (HB11) | oui |
| B16 | Pas de clignotement à l'annulation | Une image retouchée par C5 puis remplie perd ses champs de pixels ; aujourd'hui le cache **jette** alors l'emplacement retouché de l'élément (`image-cache.ts:262-268`) : Annuler redessinerait l'image brute jusqu'au recalcul (contraire à C5 I22). Désormais l'emplacement d'un élément sans retouche est **gardé** (clé et bitmap, un seul par élément), jamais redessiné tant que sa clé n'est pas voulue, fermé par `forget`, par un nouveau calcul de l'élément ou par le budget (B15). Annuler le remplissage retrouve la clé : bitmap retouché aussitôt, aucun calcul. Même gain pour Annuler après « Rétablir l'original » (C5). | C5 I22 ; contre-relecture tour 1 (I4) | oui |
| B17 | Module `formats` (taille) | `flood_fill(px, w, h, seed, tolerance, paint: Option<[u8; 3]>) -> Result<u32, PixelError>` (nombre de pixels changés) ; `flood_region` reçoit le prédicat d'écart (RVB pour C5, RVBA pour le pot) : C5 inchangé octet pour octet. Exposition : un argument `clear: bool` et un retour `u32` à `image_flood_fill`. Rien d'autre (marge 46 378 o ; ajout attendu < 1 Ko, mesuré). **Écart déclaré à C5 DAI2** (`usage-c5-image-cadrage.md:323` : « C6b appelle `flood_fill` sans toucher ce module ») : B8 change le contrat de `flood_fill`, qui n'avait aucun appelant. | brief ; C5 I16, I17, DAI2 (écart) ; `pixels.rs:58`, `:183` | oui |
| B18 | Interdits, tailles | Aucune crate, aucun paquet npm (U39) ; module principal ≤ 1 572 864 o (1 119 330 o sur `main`), plafond inchangé (H2-13) ; `formats` ≤ 3 145 728 o. | U39 ; H2-13 ; `usage-c14-media-etat.md:93` | oui |
| B19 | Cible | `fillCommand` (`fill-target.ts:63`) rend, pour une image touchée, une action `{ type: "ImageFill", page, id, seed, key, color }` (`seed` par B5, `key` = `pixelKey` au clic) au lieu du fond ; l'outil (`tools/fill.ts:19`) passe **toutes** ses actions à la file du pot (B13) avec la tolérance. Élément inconnu, rien : fond (C6a D1, D10). Image dans un groupe : remplie seule (C6a D4). | C6a D1, D3, D4, D15 ; U28 (« image → zone de pixels ») | oui |
| B20 | Image illisible, messages | Messages distincts dans `#etat`, aucune étape, `data-pot` à `refus` : asset absent du magasin (« pot : image absente du document ») ; décodage échoué (« pot : image illisible ») ; SVG pas encore décodé par le cache (« pot : image pas encore prête ») ; Worker ou module en échec : `echec` (« pot sur image impossible : … », patron `pixelNotice`). | C5 I24 ; C2 R7 ; contre-relecture tour 1 (mineur) | oui |
| B21 | Marquage pour les essais | `#stage[data-pot]` : `""` (file vide, rien fait), `attente`, `pret`, `refus`, `abandon`, `echec` (patron `data-pixels`, C5 I33). | C5 I33 ; `stage-tags.ts:21` | oui |
| B22 | Hauteur de la scène | Scène ≥ 640 px à 1280 × 900, Pot actif, curseur visible, mesurée par l'essai C6b ; tous les essais existants restent verts. Sous 640 : libellé du curseur caché (`title` gardé), curseur resserré. | brief ; C6a D19 (706 px mesurés) | oui |
| B23 | Compatibilité (Q10) | **Prémisse corrigée** : aucune fixture d'image **retouchée par C5** n'existe (`tests/fixtures/` n'a que `image-c2.roomboard`) ; la première tâche écrit `image-c5.roomboard` avec le code de `main` (image avec `crop`, `brightness`, `transparent`) : il s'ouvre, sans `sourceAsset`, et se réenregistre aux mêmes octets. Une version d'avant C6b qui ouvre un fichier rempli montre la version courante et garde `sourceAsset` (U3). | brief ; `compat_c5.rs` (patron) ; U3 | oui |
| B24 | Essais navigateur | `scripts/essais/c6b-pot-image-navigateur.mjs` (S1) dans le bloc `--e2e` de `verifier.sh:91-106` et la liste de `scripts/tests/verifier-e2e.test.sh:13` ; PNG fabriqué dans l'essai ; capture `docs/essais/c6b-pot-image.png` par `--captures` seulement. `zipEntries` et `sha256` (copiés à l'identique dans `c2-image-navigateur.mjs:25-49` et `c14-media-navigateur.mjs:25`, `:104`, qui le signale) passent dans `commun.mjs`. Essai C6a : son fond vert venait du clic sur l'image ; S4 devient « clic sur l'image sombre : l'image prend le vert, le fond ne change pas », puis un **clic sur la page vide** donne le fond vert, que gardent « Annuler : le vert revient » (`:296`) et S5 « rouvert : fond vert » (`:303`). Aucun build Tauri. | brief ; anti-refactorisation (duplication nette) ; C6a D22 | oui |
| B25 | Décodage partagé avec le Worker | `decodeImage`, `DecodePorts`, `ImageTooLargeError`, `MAX_PIXELS`, `DISPLAY_MAX` passent de `platform/image-import.ts:29-31`, `:121-181` dans un module sans DOM `platform/image-decode.ts`, réexportés par `image-import.ts` (appelants inchangés) ; le Worker l'importe avec ses propres ports (`createImageBitmap` du Worker, `loadSvg` refusé). Raison : `image-import.ts` importe le moteur (`camera`, `page`) et le contrôleur, à ne pas charger dans le Worker ; recopier la règle de réduction serait une duplication nette. | anti-refactorisation ; `image-import.ts:6-13` | oui |
| B26 | Constat à fermer | Aucun constat ouvert n'est repris ; `element.rs:66` (ImageView recopie ImageParams) non aggravé : `source_asset` est lu de l'élément, pas d'`ImageParams`. | `docs/architecture-constats.md` | oui |

## 3. Carte d'impact

Rubriques déduites (le profil n'a pas de ligne « Surfaces d'impact ») : cœur, liaisons Wasm, page (cœur TS, moteur,
rendu, Worker), application et interface, essais et tests. Aucun autre dépôt. Gabarit `courte` : endroits touchés seulement.

### Cœur Rust (`crates/roomboard-core/`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/fill.rs:18-22` (`FillTarget`), `:44` (`cmd_fill`) | oui | variante `Image { id, asset }` et son bras vers `image.rs` (B2) | V |
| `src/image.rs:258` (`cmd_set_image_params`) | oui | `restore` : `asset` ← `sourceAsset`, retrait (B11) | V |
| `src/image.rs` (neuf dans le fichier) | oui | `cmd_fill_image` (B3, B4) | S |
| `src/commands.rs:204` (`Fill`), `:232` (`SetImageParams`), `:751`, `:792` (`apply`) | oui | `restore: bool` ; bras inchangés sinon | V |
| `src/element.rs:66-82` (`ImageView`), `:312-334` (`read_image`) | oui | `source_asset` (B12) | V |
| `src/document.rs:679` (`collect_out`), `src/copy.rs:94` (`cited_by`), `document.rs:275` (`insert_asset_meta`) | non | citent déjà `sourceAsset` ; métadonnées gardées (B12, K3) ; tests ajoutés | V |
| `tests/fixtures/image-c5.roomboard`, `tests/compat_c6b.rs` (neufs) | oui | B23 | S |
| `tests/pot.rs`, `tests/compat_c5.rs`, `src/image.rs:634-826` (tests C5) | non | à garder verts | V |

### Liaisons Wasm et module `formats`

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-wasm/src/lib.rs:1134` (`fill`) | oui | `fill_image(page, id, asset, name, mime, size, color)` et `_inner` | V |
| `crates/roomboard-wasm/src/lib.rs:656`, `:1367` (`set_image_params`) | oui | argument `restore: bool` | V |
| `crates/roomboard-formats/src/pixels.rs:58` (`flood_region`), `:183` (`flood_fill`) | oui | prédicat d'écart, RVBA, `paint: Option`, nombre de pixels changés (B8, B17) | V |
| `crates/roomboard-formats-wasm/src/lib.rs:190`, `:232` (`image_flood_fill`) | oui | `clear: bool`, retour `u32` | V |
| `pixels.rs:145` (`transparent_color`), `:161` (`adjust`) | non | C5 inchangé ; tests à garder verts | V |

### Page : cœur TS, moteur, rendu, Worker (`apps/web/src/`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `core/api.ts:43` (`FillTarget`), `:153`, `:156` (`SetImageParams`), `:187` (`ImageData`) | oui | `{ kind: "image"; id; asset }`, `restore?`, `sourceAsset?` | V |
| `core/wasm-core.ts:198-203` (vue image), `:529-537` (`Fill`, `SetImageParams`) | oui | lecture de `sourceAsset`, `fill_image`, `restore` | V |
| `core/fake-core.ts:1062` (`Fill`), `:1099` (`SetImageParams`), `:1563-1571` (vues) | oui | parité (B2-B4, B11, B12) ; contrat de `wasm-core.contract.test.ts` étendu | V |
| `core/image-params.ts:65` | oui | `sourcePixelAt` (B5) | V |
| `engine/fill-target.ts:63-77` | oui | action `ImageFill` (B19) | V |
| `engine/tools/fill.ts:19` (`createFillTool`) | oui | toutes les actions vers la file du pot, tolérance | V |
| `engine/engine.ts:40-50`, `:76`, `:450`, `:715` | oui | `fillTolerance`, `setFillTolerance`, `tools.fill(ctx, color, tolerance)` | V |
| `engine/tools/image-edit.ts:137-143`, `:229` (`restore`) | oui | pipette par `sourcePixelAt` ; `restore: true` | V |
| `engine/render/image-cache.ts:40-49` (`ImageCache`), `:97` (`done`), `:142-165` (`bitmap`), `:262-268` (emplacement jeté) | oui | `adopt`, `copyOf` (SVG), budget (B15), emplacement gardé (B16) | V |
| `platform/pixel-runner.ts:29-33`, `:156` | oui | `fill(job)`, `applyFill` (B14) | V |
| `platform/pixel-worker.ts:18-36` | oui | branche remplissage : décodage, encodage PNG, copie d'affichage | V |
| `platform/image-decode.ts` (neuf), `platform/image-import.ts:29-31`, `:121-181` | oui | B25 | V |
| `platform/container.ts:85` (`image_flood_fill`) | oui | signature (B17) | V |

### Application, interface

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `app/image-fill.ts` (neuf) | oui | file du pot (DAB2) | S |
| `app/board-session.ts:165-170`, `:268` | oui | file câblée (lanceur, magasin, cache, document, `report`) ; `data-pot` | V |
| `app/stage-tags.ts:20-43` | oui | `pot` (B21) | V |
| `app/toolbar-host.ts:18`, `:27`, `:89` | oui | `fillTolerance(t)`, `setFillTolerance` dans `Pick<Engine>` | V |
| `ui/Toolbar.tsx:86-116` (`PresetRow`) | oui | curseur après « Aucune » (B10, B22) | V |
| `ui/item-state.ts:26` (`ToolbarView`) | oui | `fillTolerance?: number` | V |
| `ui/rb.css` | oui | curseur de la rangée ; resserrage éventuel (B22) | S |
| `ui/ImagePanel.tsx:155` | non | le bouton appelle déjà `edit.restore()` | V |

### Essais, scripts, tests

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/essais/c6b-pot-image-navigateur.mjs` (neuf) | oui | S1 (B24) | S |
| `scripts/essais/commun.mjs:186-207` | oui | `zipEntries`, `sha256` ajoutés | V |
| `scripts/essais/c2-image-navigateur.mjs:25-49`, `c14-media-navigateur.mjs:25`, `:104` | oui | importent `zipEntries`, `sha256` (comportement inchangé) | V |
| `scripts/essais/c6a-pot-navigateur.mjs:284-291`, `:294-296`, `:303` | oui | S4 réécrit, fond vert posé par un clic sur la page vide ; « Annuler : le vert revient » et S5 « rouvert : fond vert » en dépendent (B24) | V |
| `engine/fill-target.test.ts:192` | oui | « image : fond » devient « image : action ImageFill au point » | V |
| `scripts/verifier.sh:91-106`, `scripts/tests/verifier-e2e.test.sh:13` | oui | essai C6b dans le bloc `--e2e` et la liste | V |
| `docs/essais/c6b-pot-image.png` (neuf) | oui | capture | S |
| `c5-image-navigateur.mjs`, `image-cache.test.ts`, `pixel-runner.test.ts`, `image-import.test.ts`, `pixels.rs` (tests) | non | à garder verts | V |

### Effets de bord sur l'existant

- Un clic du pot sur une image ne colore plus le fond de la page (C6a D1) → `fill-target.test.ts` « image : action
  ImageFill » ; S4, « Annuler : le vert revient » et S5 de `c6a-pot-navigateur.mjs` réécrits (B24).
- Un clic vectoriel du pot pendant un remplissage d'image attend son tour (B13) → `image-fill.test.ts` « clic image puis
  clic forme : deux étapes dans l'ordre des clics » ; file vide : `tools/fill.test.ts` existants inchangés.
- `flood_fill` change de contrat (RVBA, alpha 255, nombre rendu) ; il n'avait aucun appelant → tests de `pixels.rs`
  « la zone transparente ne déborde pas dans le noir », « effacer met [0,0,0,0] », « rien changé : 0 ».
- `flood_region` reçoit un prédicat : la couleur transparente de C5 doit rester identique → tests C5 existants de
  `pixels.rs` et `image_transparent_inner_clears_white_and_refuses_bad_size` inchangés.
- « Rétablir l'original » rend aussi l'asset d'origine → test du cœur `restore_brings_back_source_asset_in_one_step`,
  test de contrat, `image-edit.test.ts` « restore écrit restore: true ».
- La pipette passe par `sourcePixelAt` → tests existants de la pipette (`image-edit.test.ts`) inchangés.
- Le cache ferme des bitmaps au-delà du budget (B15) et garde l'emplacement d'un élément sans retouche (B16) →
  `image-cache.test.ts` « au-delà du budget, le moins récemment dessiné hors scène est fermé puis redécodé »,
  « un bitmap de la scène n'est jamais fermé », « annuler un remplissage d'image retouchée : bitmap retouché aussitôt,
  aucun calcul » ; le test C5 « Annuler pendant un calcul (retour à l'image sans retouche) : le résultat arrivé est
  fermé » (`image-cache.test.ts:149`) reste vert : l'emplacement gardé ne garde que le bitmap déjà arrivé, son calcul
  en route est abandonné.
- Le Worker de pixels reçoit un second type de travail → `pixel-runner.test.ts` « un remplissage n'est jamais remplacé »
  et les tests C5 existants.
- `decodeImage` change de fichier (B25) → `image-import.test.ts` inchangé (réexport).
- Un panneau Image ouvert perd son brouillon quand un remplissage s'écrit (C5 I31) → test existant du panneau
  « écriture venue d'ailleurs : brouillon jeté », rejoué.
- La rangée du pot gagne un curseur → scène ≥ 640 px mesurée par l'essai C6b et par `c6a-pot-navigateur.mjs` ;
  `Toolbar.test.tsx` « curseur de tolérance visible seulement avec le Pot ».
- `zipEntries` quitte deux essais → `c2-image-navigateur.mjs`, `c14-media-navigateur.mjs` rejoués par `verifier.sh --e2e`.

### Chantiers en cours

- **OD90 — C15 3D** (`feat/usage-c15-3d`, worktree `~/projets/roomboard-wt/usage-c15-3d`, à 458a90d ; seul son fichier
  d'état existe, cadrage non écrit). Zones de conflit probables, d'après son objectif (`kind: "model3d"`, instantané
  image, dépôt multi-fichiers) et U38 : `element.rs` (`KNOWN_KINDS`, vues ; C6b touche `ImageView` `:66-82`,
  `read_image` `:312`), `commands.rs` (`Command`, `CommandError`, `apply`), `roomboard-wasm/src/lib.rs`, `api.ts`
  (`ElementView`, `Command`), `wasm-core.ts`, `fake-core.ts`, contrats, `image-cache.ts` (si l'instantané passe par le
  cache ; C6b y ajoute un budget qui le concernerait), `platform/image-import.ts` (dépôt ; C6b en sort `decodeImage`),
  `board-session.ts`, `main.ts`, `fill-target.ts` (un `model3d` devra aller au fond), `stage-tags.ts`, `verifier.sh`
  (bloc `--e2e`), `verifier-e2e.test.sh:13`, `commun.mjs`. `canvas2d.ts` et `query.rs` : touchés par C15, pas par C6b.
  Aucune branche de C15 n'est touchée ; intégrer `origin/main` avant la fusion.
- Aucune PR ouverte (`gh pr list` vide). Aucun autre worktree.

### Termes cherchés

Graphe : aucun (`~/.cache/graphes/roomboard` absent). Recherche texte (`grep -rn`, `crates/`, `apps/web/src/`,
`scripts/`) : `flood|image_flood_fill|flood_region|gap100` ; `FillTarget|BadFill|cmd_fill` ; `fillCommand|createFillTool`
; `fill-none|fillNone|FILL_COLORS|setFillColor|fillColor` ; `sourceAsset|source_asset` ; `restore|Rétablir` ;
`displayToSource|Math.floor` (`image-edit.ts`) ; `createImageCache|copy|colorAt|const done|failed|drop(` ;
`createPixelRunner|applyPixels|hasPixels|PixelFormatsBinding` ; `decodeImage|DecodePorts|DISPLAY_MAX|MAX_PIXELS|4096|^import`
(`image-import.ts`) ; `collect_out|cited_by|cited_assets|insert_asset_meta|valid_asset|prune|orphan|non cité` ;
`version()|canUndo` (`api.ts`) ; `AddImage` (`image-import.ts`) ; `zipEntries|sha256|createHash` (`scripts/essais/`) ;
`image|GREEN|Annuler|rouvert` dans `fill-target.test.ts`, `pot.rs`, `c6a-pot-navigateur.mjs` ; `stageTags` ;
`fixtures/` ; `K3|K4` (`usage-c2-coeur-cadrage.md`). Coffre : « pot de peinture image roomboard », « roomboard c5
contigu depuis les bords », « worker pixels vivant roomboard », « convertToBlob OffscreenCanvas PNG », « canvas alpha
prémultiplié getImageData », « roomboard asset empreinte magasin », « safari ipad limite canvas pixels ». Études :
`4096|convertToBlob|destructi` (étude image), `C6b|effacer` (étude pot).

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| Commande du pot sur image | `crates/roomboard-core/src/fill.rs:18` | `FillTarget::Image { id: String, asset: AssetRef }` ; bras vers `Document::cmd_fill_image(&mut self, page: &str, id: &str, asset: &AssetRef) -> Result<Change, CommandError>` (dans `image.rs`) | étendre |
| Lire l'image, écrire ses champs | `crates/roomboard-core/src/image.rs:125`, `:258` ; `element.rs:312` | `read_image`, `read_params` ; `cmd_set_image_params(&mut self, id, p, m, restore: bool)` ; `ImageView.source_asset: Option<String>` | étendre |
| Métadonnée et validation de l'asset | `document.rs:275` (`insert_asset_meta`), `commands.rs:1003` (`valid_asset`) | appelées telles quelles | réutiliser |
| Assets cités (enregistrer, copier) | `document.rs:679`, `copy.rs:94` | `collect_out`, `cited_by` sans changement | réutiliser |
| Diffusion de pixels | `crates/roomboard-formats/src/pixels.rs:58`, `:183` | `fn flood_region(px: &[u8], w: u32, h: u32, starts: &[(u32, u32)], near: impl Fn(&[u8]) -> bool) -> Vec<bool>` ; `pub fn flood_fill(px: &mut [u8], w: u32, h: u32, seed: (u32, u32), tolerance: u8, paint: Option<[u8; 3]>) -> Result<u32, PixelError>` | étendre |
| Exposition au Worker | `crates/roomboard-formats-wasm/src/lib.rs:232` | `image_flood_fill(px, w, h, x, y, tolerance, r, g, b, clear: bool) -> Result<u32, JsError>` | étendre |
| Liaison principale | `crates/roomboard-wasm/src/lib.rs:1134`, `:656` | `fill_image(page: &str, id: &str, asset: &str, name: &str, mime: &str, size: f64, color: Option<String>)` ; `set_image_params(…, restore: bool)` | étendre |
| Types et parité de la page | `apps/web/src/core/api.ts:43`, `:156`, `:187` ; `fake-core.ts:1062`, `:1099` | `FillTarget` ∪ `{ kind: "image"; id; asset: AssetRef }` ; `SetImageParams.restore?: boolean` ; `ImageData.sourceAsset?: string` | étendre |
| Point du clic → pixel source | `apps/web/src/core/image-params.ts:65` ; pipette `engine/tools/image-edit.ts:137-143` (même calcul en ligne) | `sourcePixelAt(m: Matrix, i: ImageData, x: number, y: number, clamp: boolean): [number, number] \| null` (monde → pixel entier borné ; `clamp` : point ramené dans la boîte (pot), sinon null hors boîte (pipette)) | étendre (duplication nette évitée) |
| Cible du pot | `apps/web/src/engine/fill-target.ts:63` | `fillCommand(...)` rend `Command \| ImageFillAt \| null`, `ImageFillAt = { type: "ImageFill"; page: string; id: string; seed: readonly [number, number]; key: string; color: string \| null }` | étendre |
| Geste du pot | `apps/web/src/engine/tools/fill.ts:19` | `createFillTool(ctx, color, measure, queue?: { tolerance(): number; submit(r: FillRequest, run: (c: Command) => Change \| null): void })`, `FillRequest = { command: Command } \| (ImageFillAt & { tolerance: number })` ; sans `queue` : `ctx.run` direct (C6a) | étendre |
| Tolérance du moteur | `apps/web/src/engine/engine.ts:139`, `:450` | `setFillTolerance(t: number): void` (entier borné 0-100), `EngineState.fillTolerance?: number`, `DEFAULT_FILL_TOLERANCE = 5`, `tools.fill?(ctx, color, tolerance)` | étendre |
| Calcul hors de la page | `apps/web/src/platform/pixel-runner.ts:29`, `:156` | `PixelRunner.fill(job: PixelFillJob): Promise<PixelFillResult \| null>` ; `PixelFillJob extends PixelParams { source(): Promise<{ blob: Blob; kind: ImageKind } \| { bitmap: ImageBitmap }>; seed: readonly [number, number]; tolerance: number; color: string \| null }` ; `PixelFillResult = { changed: 0 } \| { changed: number; png: Blob; bitmap: ImageBitmap }` ; `applyFill(mod, px, w, h, f): number` | étendre |
| Décodage pleine résolution et copie d'affichage | `apps/web/src/platform/image-import.ts:156-181` (`decodeImage`) | déplacé dans `platform/image-decode.ts` (sans DOM), réexporté : `decodeImage(blob, kind, max, ports)` appelé par le Worker avec `max = Infinity` (original) et `DISPLAY_MAX` (copie) | étendre (déplacer) |
| Encodage PNG | `apps/web/src/platform/pixel-worker.ts:18` | `OffscreenCanvas.convertToBlob({ type: "image/png" })` dans la branche remplissage | étendre |
| Bitmaps du cache : adoption, budget, emplacement gardé | `apps/web/src/engine/render/image-cache.ts:40`, `:97`, `:262` | `adopt(asset: string, bitmap: BitmapLike): void` ; `copyOf(asset: string): Promise<ImageBitmap> \| null` (SVG seulement) ; `ImageCacheOptions.budgetPx?: number` (défaut `DECODED_BUDGET_PX = 48_000_000`), éviction à `endScene` | étendre |
| Stocker le PNG | `apps/web/src/core/asset-store.ts:36` | `put(blob)` | réutiliser |
| Jeton de révision | `apps/web/src/core/api.ts:309` | `CoreDocument.version()` | réutiliser |
| File du pot, ordre, écriture | aucun (termes `fill`, `queue`, `ImageFill`, `version()` : rien d'asynchrone côté pot ; l'import d'image `platform/image-import.ts:247` n'est pas substituable : il crée un élément) | `apps/web/src/app/image-fill.ts` : `createFillQueue(deps: FillQueueDeps): FillQueue`, `FillQueue { submit(r: FillRequest, run: (c: Command) => Change \| null): void; dispose(): void }`, `FillQueueDeps { doc: Pick<CoreDocument, "element" \| "asset" \| "version">; assets: Pick<AssetStore, "put" \| "get">; images: Pick<ImageCache, "copyOf" \| "adopt">; runner?: Pick<PixelRunner, "fill">; report(m: string): void; onState(s: PotState): void }`, `PotState = "" \| "attente" \| "pret" \| "refus" \| "abandon" \| "echec"` | nouveau module (DAB2) |
| Rétablir l'original | `apps/web/src/engine/tools/image-edit.ts:229` | `restore()` écrit `restore: true` | étendre |
| Rangée du pot | `apps/web/src/ui/Toolbar.tsx:86` ; `app/toolbar-host.ts:18` | `PresetRow` gagne le curseur ; `ToolbarHost.fillTolerance(t: number): void` | étendre |
| Marquage | `apps/web/src/app/stage-tags.ts:21` | `stageTags(s, extra)` gagne `pot` | étendre |
| Fichier enregistré lu par l'essai | `scripts/essais/c2-image-navigateur.mjs:25`, `c14-media-navigateur.mjs:104` (deux copies identiques) | `commun.mjs` : `zipEntries(buf: Buffer): Map<string, Buffer>`, `sha256(b): string` | étendre `commun.mjs` |
| PNG, dépôt, mesure de l'essai | `scripts/essais/commun.mjs:73`, `:102`, `:144`, `:186` | `inkIn`, `stageBox`, `dropFile`, `rgbPng` | réutiliser |
| Fixture d'avant C6b | `crates/roomboard-core/tests/compat_c5.rs:13-60` | patron `fixture`, `regenerate`, `fixture_bytes` | réutiliser (patron) |

## 4. Hypothèses à revoir

**Niveau 1 — difficiles à défaire ou visibles des utilisateurs**

- **HB1** Un remplissage cuit la luminosité, le contraste et la couleur transparente dans le nouvel asset et retire ces
  champs (B4) : après un remplissage, le panneau Image repart de 0 ; régler la luminosité s'ajoute à l'image déjà cuite.
  La géométrie reste réglable. Une image de plus de 4096 px retouchée par C5 (pixels calculés sur la copie réduite,
  HC5-6) est cuite à pleine résolution : bords de transparence plus fins qu'avant le clic.
- **HB2** Aucun plafond de taille propre au pot (B7) : une photo de 6000 × 4000 se remplit à pleine résolution (~400 Mo
  de mémoire de travail dans le Worker pour 24 Mpx, libérés quand le Worker s'arrête, 10 s après). Sur l'iPad, une
  limite de surface de canvas (supposée ~16,7 Mpx, **non sourcée ici, non mesurée**) ferait échouer les grandes images
  avec un message : à mesurer sur l'appareil avant d'y poser un refus.
- **HB3** Comparaison RVBA, pixel peint opaque (alpha 255) (B8) : écart assumé à C5 I16 et à ActCraft (« alpha gardé »).
- **HB4** « Effacer » est le bouton « Aucune » de la rangée (B9), pas un bouton « Effacer » à part.
- **HB5** La diffusion passe sous le rognage (B6) : une zone remplie continue dans la partie rognée, visible si l'on
  retire le rognage.
- **HB6** « Rétablir l'original » rend l'original **sans aucun champ** (rognage et quarts de tour compris, U29), depuis
  le panneau Image seulement : une image dans un groupe se remplit au pot (C6a D4) mais ne se rétablit qu'après
  dégroupement (C5 I25).
- **HB7** Chaque remplissage produit un PNG : un JPEG rempli est enregistré en PNG (fichier plus lourd) ; l'original et la
  version courante sont gardés dans le fichier, les versions intermédiaires seulement en mémoire (annuler, rétablir).
- **HB8** Toute écriture dans le document entre un clic du pot sur une image et son résultat (Annuler, un trait d'un
  autre outil) abandonne le remplissage et les clics du pot qui attendaient (B13), avec message : rien ne s'écrit dans
  le dos de l'utilisateur, mais un clic peut être perdu s'il annule ou dessine pendant le calcul.

**Niveau 2 — les autres**

- **HB9** La tolérance n'est ni enregistrée ni propre à une image : 5 à chaque ouverture, une valeur par onglet.
- **HB10** Nom du nouvel asset : celui de l'original, extension remplacée par `.png` (B14).
- **HB11** Budget du cache de 48 Mpx décodés (B15) ; au-delà, annuler loin en arrière redécode l'image (court instant
  sans bitmap). Les `Blob` des versions intermédiaires restent dans le magasin jusqu'à la fermeture de l'onglet (PNG
  compressés ; le magasin n'a pas de retrait), y compris un PNG dont l'écriture a été refusée (B14).
- **HB12** Une image SVG remplie devient un PNG à la taille de son bitmap décodé (intrinsèque, ≤ 4096 px) ;
  `sourceAsset` garde le SVG.
- **HB13** Un clic qui ne change aucun pixel ne fait aucune étape (B13).
- **HB14** Les pixels d'alpha 0 sont lus `0,0,0,0` par le canvas (stockage prémultiplié) : deux pixels transparents sont
  toujours proches. Non vérifié sur WebKit.
- **HB15** `OffscreenCanvas.convertToBlob` et `createImageBitmap(blob)` dans un Worker sont disponibles sur le Safari de
  l'iPad (16.4 et plus) et sous WebKitGTK, comme C5 HC5-10 ; non vérifié sur l'appareil.
- **HB16** Un clic dans la bande de 6 px hors de l'image est ramené dans l'image (B5), comme pour un texte.
- **HB17** Sous 640 px, le libellé du curseur se cache (B22) ; le curseur reprend le style des curseurs existants
  (panneau Image, `GridPanel`) : à montrer à la porte visuelle.
- **HB18** La métadonnée des versions intermédiaires reste dans l'état enregistré (B12, C2 K3) : quelques dizaines
  d'octets par remplissage gardé.

## 5. Décisions d'architecture

**DAB1 — Remplissage destructif d'une image retouchée (décision à poser au coffre).**
Contexte : l'image affichée est rognée, retournée, tournée et retouchée (C5) ; le pot change des pixels de l'asset.
Décision : graine = pixel source sous le clic, calculée au clic (`sourcePixelAt`, B5) ; diffusion sur l'original à pleine
résolution, pixels de C5 cuits puis retirés, géométrie gardée (B4, B7) ; `sourceAsset` posé au premier remplissage
seulement ; « Rétablir l'original » (C5) rend `sourceAsset` sans aucun champ, en une étape (B11).
Conséquences : la couleur vue est la couleur choisie ; une seule source de vérité des pixels (l'asset) ; un remplissage
s'annule d'une étape ; les réglages de pixels ne se défont qu'en annulant ou en rétablissant l'original.

**DAB2 — File du pot dans la couche application, gardée par la révision du document.**
Contexte : l'outil Pot est synchrone (`ctx.run`) ; le remplissage d'une image demande le Worker, le magasin d'assets et
le cache, que le moteur n'importe pas à l'exécution (`image-cache.ts:16-17`) ; l'ordre des étapes doit suivre les clics.
Décision : `app/image-fill.ts` (`createFillQueue`, interface en section 3) reçoit toutes les actions du pot, les écrit
dans l'ordre (vectorielles tout de suite si la file est vide), lance un calcul à la fois, vérifie `doc.version()` avant
chaque calcul et chaque écriture (B13), puis met le PNG au magasin, écrit `Fill` et fait adopter le bitmap (B14).
Conséquences : l'outil reste mince ; la file se teste avec un faux lanceur et le faux cœur ; une écriture étrangère
abandonne la file au lieu de s'entrelacer avec elle.

## 6. Scénarios d'acceptation

- **S1** (essai navigateur, `verifier.sh --e2e`) Pot, Bleu, clic sur la page vide : fond bleu (`#1d4ed8`). Déposer un PNG
  fabriqué dans l'essai (200 × 150 : fond blanc ; bande gris très clair `#f0f0f0` collée au fond ; anneau rouge fermé à
  intérieur blanc). Outil Sélection, clic sur l'image, « Image », « Rogner », tirer la poignée sud-est de 40 × 30 pixels
  source, « Valider le rognage » : `data-image` vaut `160x120`. Pot, Jaune, clic dans l'intérieur de l'anneau
  (`data-pot` passe par `attente` puis `pret`) : l'intérieur devient jaune, le fond reste blanc. « Aucune », tolérance 5,
  clic sur le fond blanc : le bleu de la page apparaît autour de l'anneau, la bande grise reste. Ctrl+Z : le fond redevient
  blanc ; régler la tolérance à 10, clic sur le fond : le fond **et** la bande deviennent transparents. Ctrl+Z puis Ctrl+Y :
  la bande revient puis disparaît. Capture `docs/essais/c6b-pot-image.png` (avec `--captures`). Enregistrer : le fichier
  a exactement deux entrées `assets/*.png`, dont `assets/<sha256 du PNG déposé>.png` (l'original). Rouvrir : intérieur
  jaune, fond bleu, `data-image` `160x120`. Sélection, « Image », « Rétablir l'original » : `data-image` vaut `200x150`,
  plus de jaune, fond blanc ; Ctrl+Z : l'image remplie revient. La scène garde au moins 640 px de haut, Pot actif.
- **S2** (tests du cœur) Remplir une image retouchée (`crop`, `quarterTurns: 1`, `brightness: 20`, `transparent`) : une
  étape ; `asset` neuf, `sourceAsset` = ancien asset, `crop` et `quarterTurns` gardés, `brightness` et `transparent`
  retirés ; un second remplissage garde le même `sourceAsset` ; Annuler deux fois rend l'état de départ ; « Rétablir
  l'original » (`restore: true`) rend `sourceAsset`, aucun champ, une étape ; même asset : aucune étape ; cible qui n'est
  pas une image : `BadFill`. Le fichier enregistré écrit les octets de l'original et de la version courante seulement,
  la métadonnée de la version intermédiaire reste dans `assets` ; copier-coller une image remplie emporte les deux assets.
- **S3** (tests de `pixels.rs`) Image à fond transparent et trait noir : remplir le fond (tolérance 5) le rend opaque de
  la couleur choisie sans toucher au noir ; effacer une zone blanche donne `[0, 0, 0, 0]` et rend le nombre de pixels
  changés ; effacer une zone déjà transparente rend 0 ; la couleur transparente de C5 donne les mêmes octets qu'avant.
- **S4** Ouvrir la fixture `image-c5.roomboard` (écrite avec `main` d'avant C6b, image rognée, éclaircie, à couleur
  transparente) : l'image s'affiche retouchée, sans `sourceAsset` ; l'enregistrer sans changement donne les mêmes octets.
- **S5** (tests de la page, faux lanceur, faux cœur) (a) Deux clics rapides sur la même image : deux étapes dans l'ordre,
  le second calculé sur l'asset écrit par le premier. (b) Clic sur l'image puis clic dans une forme : deux étapes dans
  l'ordre des clics. (c) Tracer un trait, clic du pot sur l'image, Ctrl+Z pendant le calcul : le trait est annulé, rien
  ne s'écrit, Ctrl+Y rend le trait, `data-pot="abandon"`, bitmap fermé. (d) Asset absent du magasin, puis décodage
  échoué : messages distincts, `data-pot="refus"`. (e) Module `formats` absent : `data-pot="echec"`, aucune étape.
  (f) Refus du cœur après le calcul : bitmap fermé, rien adopté. (g) Cache : annuler le remplissage d'une image retouchée
  redessine le bitmap retouché sans calcul ; dix remplissages d'une image de 3000 × 2000 restent sous le budget, aucun
  bitmap de la scène fermé. (h) Photo fabriquée de 6000 × 4000 (faux Worker) : le calcul reçoit l'original, pas la copie
  de 4096 px.

## 7. Hors périmètre

- P2 (mot par mot), P3 (zone fermée par plusieurs objets, `kind: "fill"`, C8), rotation libre.
- Gomme sur image (U29 la range avec le pot ; ni la demande OD91 ni U28 ne la demandent ici).
- Diffusion bornée au rognage (B6) ; « Pick Through » (HU2-9) ; refus de taille propre à l'iPad (à mesurer, HB2).
- Retrait des `Blob` non cités du magasin ; ménage des métadonnées non citées (C2 K3).
- Rétablir l'original d'une image groupée sans dégrouper ; historique des versions au-delà d'annuler / rétablir.
- Distance CIELAB, couleurs Display P3, dégradés.
- Mesure sur iPad, Mac, Windows ; build Tauri.
- La branche `feat/usage-c15-3d` (OD90).

## 8. Portes immédiates

Aucune.

## 9. Contre-relecture, tour 1 (2026-11-21)

Carnet : `~/.cache/tmp/relecture-conformite-c6b-cadrage-2026-11-21.md`. Corrigé : I1 mémoire du cache → B15 ; I2 ordre
face à l'annulation → B13, DAB2, HB8, S5 (b, c) ; I3 essai C6a `:296`, `:303` → B24 et carte ; I4 clignotement à
l'annulation → B16, S5 (g) ; I5 plafond de 4096 px retiré, original toujours à pleine résolution → B7, B25, HB2,
S5 (h). Mineurs : bande de 6 px ramenée dans la boîte (B5, HB16) ; graine au clic (B5) ; image illisible (B20, S5 d) ;
ordre en cas de refus du cœur (B14, S5 f) ; écart à C5 DAI2 déclaré (B17) ; références `tools/fill.ts:19` et
`platform/image-import.ts` corrigées ; métadonnées intermédiaires vérifiées (B12, HB18, S2). Point « à vérifier » du
relecteur (panneau Image ouvert pendant un remplissage) : couvert par C5 I31 (B4).
