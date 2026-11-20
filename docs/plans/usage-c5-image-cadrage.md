# Cadrage — usage C5 : édition d'image non destructive

Cadrage autonome (étage 1, 2026-11-20), base `origin/main` @ 0dd7f1a. Il applique **U29** et **U30**
(`docs/plans/usage-cadrage.md:82-83`), avec U5 (`:58`), HU2-9 et HU2-14 (`:316`, `:322`) et le scénario S7 (`:437-439`),
sans les refaire ; il ne tranche que ce qu'ils laissent ouvert. Sources : cadrage de l'usage ; étude
`docs/etudes/usage-edition-image.md` (citée « étude ») ; cadrages et états de C2, C6a, C9 éditeur, C10b ; code de
`main` ; ActCraft `render/src/imagefill.cpp` (lecture seule). Graphe graphify absent pour ce dépôt
(`~/.cache/graphes/` n'a pas `roomboard`) : recherche texte seule. Coffre : décision 0254 (commande `Fill`), journaux
C6a et C10b ; aucune note ne porte sur l'image ; recherche non dégradée.

## 1. Demande et gabarit

Demande (Jérôme, citée par U29) : « édition de bases et […] rendre transparent une couleur de background » — rogner,
retourner, tourner par quarts de tour, régler luminosité et contraste, rendre transparente une couleur (pipette,
tolérance, contigu ou global, plume, aperçu), « Rétablir l'original », sans jamais toucher à l'asset, calculs de pixels
dans un Worker. Gabarit : **chantier** (40 questions au plus ; 36 consommées).

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| I1 | Périmètre | U29 non destructif seul : `crop`, `flipX`, `flipY`, `quarterTurns`, `brightness`, `contrast`, `transparent`. Rotation libre, pot sur image, gomme sur image, `sourceAsset` : hors chantier (C6b, rotation d'élément générale). « Pick Through » : plus tard (HU2-9), la collision reste au rectangle. | U29 (`usage-cadrage.md:82`) ; `:550` (C6b) ; HU2-9 ; brief | oui |
| I2 | Valeurs composées | `crop` : `Any::Array` positionnel `[x, y, w, h]` (pixels source, comme `transform`) ; `transparent` : `Y.Map` de champs scalaires (comme `backdrop`) ; les autres : scalaires. Jamais `Any::Map`. Test « recharger garde les octets » sur le modèle de `image_and_backdrop_reload_keep_bytes`. | U3 (`usage-cadrage.md:56`) ; `commands.rs:2766` ; `element.rs:196` | oui |
| I3 | Graine du mode contigu | **Prémisse corrigée** : `transparent{color, tolerance, soft, contiguous}` ne suffit pas au mode contigu, qui part d'un pixel. `transparent` porte aussi `x`, `y` : pixel source (de l'asset d'origine, avant rognage) piqué par la pipette ; gardés en mode global (passer de global à contigu ne redemande pas de pipette). | U29 ; étude § « Fonctions visées » (« option contiguë ») ; ActCraft `imagefill.cpp:10` (graine) | oui |
| I4 | Champ neutre = champ absent | La commande retire tout champ égal au neutre (`flipX`/`flipY` faux, `quarterTurns` 0, `brightness`/`contrast` 0, `crop` = image entière, `transparent` absent). « Rétablir l'original » = tous les champs retirés ; un fichier sans retouche garde ses octets. | U3 (« champ absent = comportement du socle ») ; U29 (« retire les champs ») | oui |
| I5 | Domaines | `crop` : entiers, `x, y ≥ 0`, `w, h ≥ 1`, `x + w ≤ W`, `y + h ≤ H` (W, H = `w`, `h` de l'élément) ; `quarterTurns` 0 à 3, sens horaire ; `brightness`, `contrast` : entiers −100 à 100 ; `transparent.color` `#rrggbb` (minuscules) ; `tolerance`, `soft` : entiers 0 à 100 ; `contiguous` booléen ; `x`, `y` entiers dans l'image. Hors domaine : refus `BadImageParams`, aucune transaction. Lecture tolérante : un champ illisible est lu comme absent (U3), jamais un échec de l'élément. | U3 ; `rich_text.rs:54` (`valid_color` accepte des noms, inutilisable pour des pixels) ; étude (« tolérance 0 à 100 ») | oui |
| I6 | Commande | `Command::SetImageParams { id, params: ImageParamsInput, matrix: Transform }` : **état voulu complet** des paramètres (remplacé en bloc, comme `SetGrid`) et nouvelle transformation de l'élément, une transaction, une étape ; même état et même matrice : aucune étape (D38). Cible qui n'est pas une image lisible : `BadImageParams`. Matrice : `valid_matrix` (`commands.rs:467`), sinon `BadMatrix`. | `usage-cadrage.md:107` (`SetImageParams` — C5) ; U29 (« une étape par validation ») ; DA1 | oui |
| I7 | Code du cœur | Module neuf `crates/roomboard-core/src/image.rs` (lecture et écriture des paramètres, `cmd_set_image_params`, `display_size`) ; `commands.rs` ne reçoit que la variante, `BadImageParams` et le bras d'`apply` ; `element.rs` : champs de `ImageView` et `read_image` qui appelle `image::read_params`. Patron de `fill.rs` (C6a D24). | C6a D24 (`usage-c6a-pot-cadrage.md`) ; `lib.rs:8` | oui |
| I8 | Boîte de l'image | Boîte locale = boîte **affichée** : `(0, 0)-(bw, bh)`, `bw, bh` = taille du rognage (ou `w, h`), échangées si `quarterTurns` est impair. Collision, bornes, rectangle, accroche, poignées suivent (un seul point : `query.rs:146-151`). `w`, `h` restent la taille source (U5). | U5 ; `query.rs:146` ; `element.rs:57` | oui |
| I9 | Placement | Une retouche ne fait pas sauter l'image : le centre de la zone source commune aux réglages avant et après (intersection des deux rognages) reste au même point de la page ; seule la translation de la matrice change. Rogner : les pixels gardés ne bougent pas ; retourner, tourner : le centre reste ; rétablir : les pixels qui étaient visibles ne bougent pas. Calculé dans la page (`placeAfter`, I21) et envoyé dans `matrix` (I6) : le cœur ne recopie pas la géométrie d'affichage (DAI1). | DAI1 ; `shapes.ts:81`, `:98` | oui |
| I10 | Ordre des opérations | Source → rognage → retournements → quarts de tour (géométrie, au dessin). Pixels, sur l'image entière avant rognage : couleur transparente décidée sur les couleurs **d'origine**, puis luminosité et contraste (alpha gardé). La pipette lit le pixel d'origine. | étude § « Où faire quoi » ; ActCraft (« la zone se décide sur la source », `imagefill.cpp:32`) | oui |
| I11 | Retourner et tourner à l'écran | « Retourner ↔ » retourne l'image **telle qu'on la voit** : avec un nombre impair de quarts de tour, c'est l'axe vertical de la source (`flipY`) qui bascule. Calcul pur `flipShown(params, axis)` (I21). | défaut raisonnable | oui |
| I12 | Tolérance | Écart par canal RVB, comme ActCraft et le pot : pixel retenu si `max(|ΔR|, |ΔG|, |ΔB|) × 100 ≤ tolérance × 255`. Défaut du panneau : 10 (S7 de l'usage). | `imagefill.cpp:19-24` ; étude pot-de-peinture cas 5 (« tolérance par canal ») ; S7 (`usage-cadrage.md:437`) | oui |
| I13 | Plume | `soft` = largeur (0 à 100, même échelle) d'une rampe d'alpha au-delà de la tolérance : écart `d` (échelle 0-100) ≤ `tolerance` → alpha 0 ; `d` ≥ `tolerance + soft` → alpha inchangé ; entre les deux, alpha × `(d − tolerance) / soft`. Défaut 0. Mode contigu : la diffusion accepte `d ≤ tolerance + soft`. | étude (« dégradé d'alpha entre deux seuils ») ; défaut | oui |
| I14 | Contigu ou global | Contigu (défaut) : diffusion 4-connexe depuis `x, y`, comme ActCraft ; global : tout pixel de l'image. | U29 ; `imagefill.cpp:40-42` ; étude (« un blanc de fond contigu protège le blanc de l'œil ») | oui |
| I15 | Luminosité, contraste | Par canal, alpha gardé : `v' = clamp((v − 128) × (1 + contrast / 100) + 128 + brightness × 2,55)`, arrondi. | défaut (étude : « réglages triviaux à écrire ») | oui |
| I16 | Fonctions de pixels | `crates/roomboard-formats/src/pixels.rs`, Rust pur, **aucune crate ajoutée**, `cargo test` : `transparent_color`, `adjust`, `flood_fill` (prêt pour C6b, 4-connexe, alpha gardé, comme ActCraft), et `flood_region` interne partagé par `flood_fill` et le mode contigu. Interfaces : DAI2. | U30 ; `usage-cadrage.md:114` (« fonctions de pixels (U30) » dans `roomboard-formats`) ; DAU1 | oui |
| I17 | Exposition Wasm | `roomboard-formats-wasm` expose `image_transparent`, `image_adjust`, `image_flood_fill`, **sans état** (aucune classe), sur `&mut [u8]` RGBA, chacune par une `_inner` testée en natif (patron du fichier). Le module principal n'en reçoit rien. | U30 ; `roomboard-formats-wasm/src/lib.rs:1-4` ; H2-13 | oui |
| I18 | Worker | **Un** Worker de pixels par onglet, créé au premier besoin, **gardé tant qu'il a du travail**, arrêté 10 s après la dernière réponse, après une erreur ou au bout de 60 s sans réponse. Il charge sa propre instance du module `formats` (`loadFormatsModule`), reçoit une copie `ImageBitmap` transférée et les paramètres, extrait le RGBA par `OffscreenCanvas`, appelle le Rust, rend un `ImageBitmap` transféré. **Prémisse corrigée** : le Worker jetable par lecture de C10b, recréé à chaque mouvement du curseur, rechargerait le module (≈ 860 Ko) à chaque aperçu. | U30 ; DAU1 (« jeté après usage ») ; C10b DAB4 (`sheet-reader.ts:1-10`, `:83`) ; DAI3 | oui |
| I19 | Péremption | Chaque calcul porte la clé de l'élément (`asset` + paramètres de pixels) ; à l'arrivée, un résultat dont la clé n'est plus celle de l'élément (document changé : annuler, autre retouche, élément supprimé) ou d'un aperçu remplacé est **jeté** (bitmap fermé). | U30 (« résultat jeté si le document a changé ») ; ActCraft `staleImageFillDropped` (étude pot-de-peinture `:39`) | oui |
| I20 | Encodage PNG | **Aucun en C5.** Le non destructif garde l'asset d'origine ; le résultat des pixels vit en mémoire comme `ImageBitmap` (`createImageBitmap(ImageData)` dans le Worker), recalculé à l'ouverture. `OffscreenCanvas.convertToBlob` sert à C6b (nouvel asset) et à l'export d'une image retouchée, hors chantier. | U30 ; U29 (destructif → « nouvel asset PNG ») ; étude (« recalcul à l'ouverture ») | oui |
| I21 | Géométrie d'affichage dans la page | Module pur `apps/web/src/core/image-params.ts` (couche `core` : le faux cœur l'importe ; `core` n'importe pas `engine`, constat `api.ts:145`) : `displaySize`, `sourceToDisplay`, `displayToSource`, `flipShown`, `turnShown`, `placeAfter`, `isNeutral`, `pixelKey`. Interfaces : DAI1. | DA3 (C6a D14, module pur côté page) ; constat `api.ts:145` | oui |
| I22 | Cache des bitmaps | `createImageCache` (`image-cache.ts:20`, par asset) **étendu** d'un emplacement par élément pour le bitmap retouché (clé `pixelKey`), comme le demande U5 (« en cache par élément ») ; tant qu'il manque, l'image brute est dessinée avec sa géométrie. Les bitmaps remplacés ou périmés sont fermés. Image au-delà de 4096 px : les pixels se calculent sur la copie d'affichage réduite (U26), graine mise à l'échelle. | U5 ; U26 (`usage-cadrage.md:79`) ; `image-import.ts:159-187` | oui |
| I23 | Dessin | `canvas2d.ts:250-253` : boîte affichée, rectangle source du rognage (mis à l'échelle de la copie d'affichage), retournements et quarts de tour par la matrice du contexte. Aucun `ctx.filter` (support de l'iPad non vérifié, étude question 8) : luminosité et contraste passent par `adjust`. | U30 (`adjust` dans le cœur) ; étude question 8 | oui |
| I24 | Module `formats` au premier besoin | Chargé par le Worker dès qu'une image visible porte `transparent`, `brightness` ou `contrast` (ouverture comprise). HU2-14 nomme la seule couleur transparente : la luminosité et le contraste s'y ajoutent (même module). Module absent ou en échec : image brute dessinée, un message dans `#etat` (« retouches de l'image non affichées : … »), une fois par onglet. | HU2-14 ; C2 R7 (`CodecUnavailableError`, `container.ts:39`) | oui |
| I25 | Entrée de l'interface | **Un seul bouton** « Image » ajouté à la rangée Sélection (`data-selection-action="image"`), actif quand la sélection est **une seule image** ; il ouvre ou ferme le panneau `image`. Aucune rangée de 8 boutons dans la barre : C7b et C10b ensemble l'avaient déjà fait passer sur 4 lignes (scène à 610 px). | piège C10b (`usage-c10b-tableau-etat.md`, « Pièges trouvés ») ; C3 Z13 (`SelectionRow.tsx:1`) ; brief (« rangée ou panneau ») | oui |
| I26 | Panneau | `ImagePanel` en `rb-popover` **calé à droite** de la scène (le popover de la grille, en haut à gauche, couvrirait l'image déposée) : (1) Rogner, Retourner ↔, Retourner ↕, Tourner ⟲, Tourner ⟳ ; (2) Luminosité, Contraste (curseurs) ; (3) Couleur transparente : Pipette, pastille de la couleur piquée, Tolérance (curseur 0-100), Plume (0-100), Contigu / Global ; (4) Valider, Annuler les réglages, Rétablir l'original, Fermer. Design : celui des panneaux existants (`GridPanel`, `rb.css:28`), aucun style neuf hors du calage à droite ; à montrer à la porte visuelle. | patron `GridPanel` (`GridPanel.tsx:30-37`) ; `App.tsx:291` ; skill de design par défaut (`impeccable`) | oui |
| I27 | Étapes d'annulation | Retourner et tourner : **immédiats**, une étape chacun. Réglages et couleur transparente : brouillon avec **aperçu en direct** (rien d'écrit), « Valider » écrit les deux en une étape. Rogner : mode à cadre (I28), « Valider le rognage » = une étape. « Rétablir l'original » : une étape. « Fermer » ou « Annuler les réglages » : aucune étape. | U29 (« une étape par validation », « aperçu avant validation ») ; D38 ; patron `GridPanel` (E8, CR9) | oui |
| I28 | Rogner | « Rogner » montre l'image **entière** (aperçu sans rognage, placée par I9) et un cadre à 8 poignées sur la zone gardée (`handlesOf`, `hitHandle` de `handles.ts`) ; tirer une poignée ou l'intérieur du cadre le règle ; le dehors est voilé ; « Valider le rognage » (ou Entrée) écrit, « Annuler » (ou Échap) sort sans rien écrire. Cadre borné à l'image, 1 pixel source au moins, arrondi au pixel. Pas de ratio fixe (hors périmètre). | U29 ; `handles.ts:24`, `:34` ; étude « Fonctions visées » 1 | oui |
| I29 | Pipette | « Pipette » arme la pipette : le prochain appui sur l'image sélectionnée donne le pixel source (`invertMatrix` puis `displayToSource`) et sa couleur d'origine ; hors de l'image : rien, la pipette reste armée ; Échap ou second appui sur « Pipette » la désarme. Le brouillon reçoit `color`, `x`, `y`, puis l'aperçu se calcule. | U29 (« pipette sur l'image ») ; `shapes.ts:98` | oui |
| I30 | Moteur | `Engine.editImage(id): ImageEdit \| null` (DAI4) tient les gestes pendant le rognage et la pipette ; l'outil publié reste `select` (la rangée Sélection et le bouton « Image » restent visibles). Aperçu par le patron de `setGridPreview` (`renderer.ts:61`, `engine.ts:647`) : `Renderer.setImagePreview`. | patron C9 éditeur (DAE1) ; `engine.ts:123-125` | oui |
| I31 | Fermeture du panneau | Le panneau se ferme si l'onglet ou la page changent, si la sélection n'est plus cette image ou si l'image disparaît ; une écriture (sa propre validation, annuler, rétablir) **ne le ferme pas** : il reprend les valeurs du document et jette le brouillon. | patron `sessionKey` (`App.tsx:131-139`), adapté | oui |
| I32 | Format et compatibilité | Champs facultatifs, `schema` et `formatVersion` inchangés. Un `.roomboard` d'avant C5 s'ouvre : **prémisse corrigée**, aucune fixture d'image d'avant C5 n'existe (`crates/*/tests/fixtures/`) ; la première tâche en écrit une (`image-c2.roomboard`) avec le code de `main`. Copier, coller, `.rbitem` gardent les paramètres (recopie profonde, `copy.rs:62`, sans changement ; test ajouté). Une version d'avant C5 garde les champs et montre l'image brute. | U3 ; brief ; `copy.rs:1-5` ; `compat_grille_pr12.rs` (patron) | oui |
| I33 | Marquage pour les essais | `#stage[data-pixels]` : `""` (aucune image retouchée visible), `attente` (un calcul en cours), `pret`, `echec` ; `#stage[data-image]` : `<bw>x<bh>` de l'image sélectionnée seule, vide sinon. | patron `stageTags` (`stage-tags.ts:21`) ; C12 PF15 (`data-fond`) | oui |
| I34 | Essai navigateur | `scripts/essais/c5-image-navigateur.mjs` dans le bloc `--e2e` de `verifier.sh` (`:91-105`) et dans la liste de `scripts/tests/verifier-e2e.test.sh:13` ; PNG fabriqué dans l'essai (fond blanc, anneau rouge à intérieur blanc), jamais téléchargé ; capture `docs/essais/c5-image-rognee-transparente.png` par `--captures` seulement. Le générateur PNG, déjà copié dans `c2-image-navigateur.mjs:29-54` et `c6a-pot-navigateur.mjs:42-67`, passe dans `commun.mjs` (`rgbPng`, `solidPng`) et les deux essais l'importent. Aucun build Tauri. | brief ; `verifier.sh:91-105` ; anti-refactorisation (duplication nette) | oui |
| I35 | Hauteur de la scène | Scène ≥ 640 px à 1280 × 900 mesurée par l'essai C5 avec l'outil Sélection, une image sélectionnée (rangée Sélection à 6 boutons) et le panneau ouvert ; tous les essais existants restent verts (`stageBox`, `commun.mjs:101`). Sous 640 : libellés de la rangée Sélection resserrés (`rb.css`), comme C10b. | brief ; C6a D19 ; piège C10b | oui |
| I36 | Tailles, licences | Aucune dépendance neuve (Rust ni npm). Module principal ≤ 1 572 864 o, plafond inchangé (1 080 736 o mesurés sur `main` @ 0dd7f1a) ; module `formats` < 3 Mio (859 580 o mesurés). Constats ouverts : `element.rs:25` (`KNOWN_KINDS`) non aggravé (aucun `kind` neuf) ; `api.ts:145` non touché ; `query.rs:233` non aggravé (la boîte de l'image passe par `element_geom`, que `snap_box` appelle déjà). | H2-13 ; HU2-14 ; `apps/web/dist/assets/*.wasm` (mesure du 2026-11-20 17:19) ; `docs/architecture-constats.md` | oui |

## 3. Carte d'impact

Rubriques déduites (le profil n'a pas de ligne « Surfaces d'impact ») : cœur, liaison principale, module `formats`,
page (cœur TS, rendu, moteur, application, interface), amorce, essais et scripts, documents. Aucun autre dépôt.

### Cœur Rust (`crates/roomboard-core/src/`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `image.rs` (neuf) | oui | `ImageParamsInput`, `read_params`, `write_params`, `display_size`, `cmd_set_image_params`, `parse_rgb_hex` (I5-I8) | S |
| `lib.rs:8` (liste des modules) | oui | `pub mod image;` | V |
| `element.rs:57-62` (`ImageView`) | oui | champs facultatifs `crop`, `flip_x`, `flip_y`, `quarter_turns`, `brightness`, `contrast`, `transparent` (`camelCase`, absents si neutres) | V |
| `element.rs:264-276` (`read_image`) | oui | lit les paramètres par `image::read_params` ; un champ illisible = absent | V |
| `commands.rs:30` (`Command`), `:238-246` (`CommandError`), `:597` (`apply`) | oui | variante `SetImageParams`, `BadImageParams` et son message, bras d'`apply` (I6, I7) | V |
| `commands.rs:467` (`valid_matrix`) | non | réutilisé | V |
| `commands.rs:918` (`cmd_add_image`) | non | une image neuve n'a aucun paramètre | V |
| `commands.rs:2766` (`image_and_backdrop_reload_keep_bytes`) | non | modèle du test de rechargement (I2) ; à garder vert | V |
| `query.rs:146-151` (`element_geom`, image) | oui | boîte affichée (`display_size`, I8) ; collision, bornes, rectangle, accroche suivent | V |
| `query.rs:233` (`snap_box`) | non | passe par `element_geom` ; constat ouvert non aggravé | V |
| `document.rs:290-296` (`element`, image) | non | recopie `ImageView` telle quelle | V |
| `copy.rs:62` (`copy_elements`) | non | recopie profonde, champs gardés ; test ajouté (copier une image retouchée) | V |
| `document.rs` (`collect_out`, assets cités) | non | aucun champ neuf ne cite d'asset | S |
| `fill.rs` | non | le pot sur image reste hors périmètre (C6a D1) | V |
| `tests/fixtures/image-c2.roomboard` (neuf), `tests/compat_c5.rs` (neuf) | oui | fixture d'avant C5, ouverture et octets gardés (I32) | S |

### Liaison du module principal (`crates/roomboard-wasm/src/lib.rs`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `lib.rs:528` (`add_image`), voisinage | oui | `set_image_params(id, crop: &[f64], flip_x, flip_y, quarter_turns, brightness, contrast, color: Option<String>, transparent: &[f64], matrix: &[f64])` et son `_inner` | V |
| `lib.rs:1933` (tests C2 par `_inner`) | oui | test de `set_image_params_inner` | V |

### Module `formats` (`crates/roomboard-formats*`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `roomboard-formats/src/pixels.rs` (neuf) | oui | I12-I16, DAI2 | S |
| `roomboard-formats/src/lib.rs:1-4` | oui | `pub mod pixels;`, commentaire | V |
| `roomboard-formats/Cargo.toml` | non | aucune crate ajoutée (I16) | V |
| `roomboard-formats-wasm/src/lib.rs` | oui | trois fonctions sans état (I17) | V |
| `roomboard-formats/src/container.rs`, `sheet.rs` | non | inchangés ; tests à garder verts | V |

### Page : cœur TS (`apps/web/src/core/`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `api.ts:76` (`Command`) | oui | `{ type: "SetImageParams"; id; params: ImageParams; matrix: Matrix }` | V |
| `api.ts:151` (`ImageData`) | oui | `ImageData = { asset; w; h } & ImageParams` ; types `ImageParams`, `TransparentColor` | V |
| `image-params.ts` (neuf) | oui | I21, DAI1 | S |
| `wasm-core.ts:194-199` (`toElementView`, image) | oui | lit les champs facultatifs, contrôlés | V |
| `wasm-core.ts:368` (`apply`) | oui | bras `SetImageParams` → `set_image_params` | V |
| `fake-core.ts:410` (polygone d'une image) | oui | `displaySize` (I8) | V |
| `fake-core.ts:675-690` (`AddImage`), commandes | oui | `SetImageParams` à parité (validation, neutres retirés, une étape) | V |
| `fake-core.ts:1020`, `:1312`, `:1412-1420` (vues et recopie) | oui | paramètres gardés dans la vue et la recopie | V |
| `fake-core.ts:145` (`MESSAGES`) | oui | `badImageParams` | V |
| `wasm-core.contract.test.ts:657-666` | oui | contrat de `SetImageParams` et des champs lus, vrai module et faux cœur | V |
| `shapes.ts:81`, `:98` (`applyMatrix`, `invertMatrix`) | non | réutilisés | V |
| `asset-store.ts` | non | l'asset n'est jamais réécrit | V |

### Page : rendu (`apps/web/src/engine/render/`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `image-cache.ts:9-57` | oui | emplacement par élément (I22), file vers le Worker, péremption (I19), état `data-pixels` | V |
| `canvas2d.ts:250-253` | oui | dessin rogné, retourné, tourné (I23) ; bitmap retouché ou brut | V |
| `canvas2d.ts` (habillage) | oui | cadre de rognage et voile (I28) | S |
| `renderer.ts:46-61` (`Renderer`) | oui | `setImagePreview(p: ImagePreview \| null)` | V |
| `webgl2.ts` | non | canvas d'interaction seul, ne dessine pas d'image | V |
| `select.ts` (choix du rendu) | non | passe `images` tel quel | V |

### Page : moteur (`apps/web/src/engine/`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `engine.ts:84-150` (`Engine`), `:640-660` | oui | `editImage(id)` (DAI4) | V |
| `engine.ts:23-38`, `:280-300` (`EngineState`, `state`) | oui | `selectionImage: string \| null` (une seule image sélectionnée) | V |
| `tools/image-edit.ts` (neuf) | oui | gestes du rognage et de la pipette | S |
| `tools/handles.ts:24`, `:34` | non | réutilisés pour le cadre | V |
| `tools/select.ts` | non | la sélection reste la sienne ; redimensionner une image retouchée passe par `Transform` | V |
| `tools/fill.ts`, `fill-target.ts` | non | un clic du pot sur une image va au fond (C6a D1), inchangé | V |
| `input/keys.ts` | non | Échap et Entrée du rognage pris par `ImageEdit` via `engine.key` | S |

### Page : application et interface (`apps/web/src/app/`, `ui/`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `app/board-session.ts:60`, `:136` | oui | cache reçoit le lanceur de Worker de pixels | V |
| `app/stage-tags.ts:21` | oui | `pixels`, `image` (I33) | V |
| `app/toolbar-host.ts:7`, `:24-31` | oui | `SelectionAction` gagne `image` ; `HostTargets.toggle` gagne `"image"` | V |
| `app/workspace.ts:371` (`selection`) | non | « image » n'y va pas : il ouvre le panneau | V |
| `ui/SelectionRow.tsx:7-24` | oui | bouton « Image », grisé hors sélection d'une seule image | V |
| `ui/item-state.ts:6-25` (`ToolbarView`) | oui | `selectionImage?: boolean` | V |
| `ui/ImagePanel.tsx` (neuf) | oui | I26, I27 | S |
| `ui/App.tsx:49`, `:114-139`, `:149`, `:291` | oui | panneau `image`, fermeture (I31), calage à droite | V |
| `ui/rb.css:28` | oui | `.rb-popover[data-panel="image"] { justify-self: end }` ; resserrage éventuel (I35) | V |
| `ui/GridPanel.tsx` | non | patron, non modifié | V |
| `toolbar.ts`, `toolbar-profiles.ts`, `profile-edit.ts` | non | rangée Sélection hors catalogue (C7b R13) : aucun profil ne change | V |
| `platform/image-import.ts:159` (`decodeImage`) | non | réutilisé par le cache | V |
| `platform/clipboard.ts`, `app/fragments.ts:100` | non | passent par `extract` du cœur ; test ajouté côté cœur | V |

### Page : Worker et amorce (`apps/web/src/platform/`, `main.ts`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `platform/pixel-worker.ts` (neuf) | oui | entrée du Worker (I18) | S |
| `platform/pixel-runner.ts` (neuf) | oui | file, arrêt sur inactivité, délai, messages (DAI3) | S |
| `platform/sheet-reader.ts:30` (`WorkerLike`) | non | réutilisé | V |
| `platform/container-load.ts:7` (`loadFormatsModule`) | non | réutilisé dans le Worker | V |
| `platform/container.ts:61-69` | oui | `PixelFormatsBinding`, `hasPixels(m)` (patron `hasSheetReader`) | V |
| `main.ts:86-107` | oui | `spawnPixelWorker`, comme `spawnSheetWorker` | V |

### Essais, scripts, documents

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/essais/c5-image-navigateur.mjs` (neuf) | oui | S1, S2 (I34, I35) | S |
| `scripts/essais/commun.mjs` | oui | `rgbPng`, `solidPng` déplacés ici | V |
| `scripts/essais/c2-image-navigateur.mjs:29-54`, `c6a-pot-navigateur.mjs:42-67` | oui | importent `solidPng` de `commun.mjs` (comportement inchangé) | V |
| `scripts/verifier.sh:91-105` | oui | essai C5 dans le bloc `--e2e` | V |
| `scripts/tests/verifier-e2e.test.sh:13` | oui | `c5-image-navigateur` dans la liste | V |
| `scripts/controle-licences.mjs`, `THIRD_PARTY_NOTICES.md` | non | aucune dépendance neuve | V |
| `scripts/controle-hors-ligne.mjs` | non | aucun hôte ; le Worker est un fichier de `dist` | V |
| `apps/desktop/src-tauri/tauri.conf.json` (CSP) | non | le Worker de C10b passe déjà sous la CSP de l'essai (`coqueCsp`) | V |
| `docs/essais/c5-image-rognee-transparente.png` (neuf) | oui | capture | S |

### Tests à garder verts (non touchés)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core/tests/compat_socle.rs`, `compat_c3.rs`, `compat_grille_pr12.rs`, `element_inconnu.rs`, `pot.rs`, `scenarios.rs` | non | ouverture des fichiers d'avant, pot, scénarios | V |
| `crates/roomboard-formats/tests/container.rs`, `scenarios.rs` | non | conteneur à assets, classeurs | V |
| `apps/web/src/platform/image-import.test.ts`, `engine/render/image-cache.test.ts` | non (le second : étendu) | décodage, cache par asset | V |
| `apps/web/src/platform/sheet-reader.test.ts` | non | Worker jetable de C10b | V |
| `scripts/essais/c2-image-navigateur.mjs`, `c6a-pot-navigateur.mjs`, `c3-groupes-navigateur.mjs` | non (import seul) | dépôt d'image, pot, groupes ; tous à 640 px | V |

### Effets de bord sur l'existant

- La boîte d'une image rognée ou tournée change (I8) : collision, sélection, rectangle de sélection, accroche → test du
  cœur `image_box_follows_crop_and_turns` et test de contrat du faux cœur.
- Le cache des bitmaps gagne un emplacement par élément (I22) ; le cache par asset ne change pas pour une image sans
  retouche → `image-cache.test.ts` existant inchangé, plus `image-cache` « une image sans retouche ne lance aucun Worker ».
- La rangée Sélection passe de 5 à 6 boutons (I25) → essai C5 (scène ≥ 640 px) et `SelectionRow.test.tsx`.
- `solidPng` quitte deux essais pour `commun.mjs` (I34) → `c2-image-navigateur.mjs`, `c6a-pot-navigateur.mjs` rejoués
  par `verifier.sh --e2e`.
- Copier, coller, `.rbitem` d'une image retouchée gardent ses paramètres → test du cœur `copy_keeps_image_params`.
- Ouvrir un document à image retouchée charge le module `formats` (I24) → test `pixel-runner` « chargé au premier
  besoin » et essai C5 (rouvrir).

### Chantiers en cours

- **OD85 — C12 PDF** (`feat/usage-c12-pdf`, worktree `~/projets/roomboard-wt/usage-c12-pdf`, 695772a ; seul son
  cadrage est écrit). Fichiers communs annoncés par son cadrage : `element.rs` (`BackdropView`, `:48-56`, `:303-357` ;
  C5 touche `:57-62`, `:264-276`), `api.ts`, `wasm-core.ts`, `fake-core.ts`, contrats, `renderer.ts`, `canvas2d.ts`
  (`drawScene` `:195-216` ; C5 touche `:250-253`), `board-session.ts:135` (cache voisin du cache d'images),
  `stage-tags.ts` (`data-fond`), `toolbar-host.ts`, `App.tsx`, `main.ts:66-109`, `verifier.sh` (bloc `--e2e`),
  `verifier-e2e.test.sh:13`. Son export (PF21, `paintContent`) dessinera les images par `canvas2d.ts` : il héritera du
  dessin retouché si C5 est fusionné avant. Aucune branche de C12 n'est touchée ; intégrer `origin/main` avant la fusion.
- Aucune PR ouverte (`gh pr list` vide). Aucun autre worktree.

### Termes cherchés

Graphe : aucun (`~/.cache/graphes/roomboard` absent). Recherche texte (`grep -rn`, `crates/`, `apps/web/src/`,
`scripts/`) : `SetImageParams|ImageParams|crop|flipX|quarterTurns|sourceAsset|transparent` ; `image` dans
`element.rs commands.rs document.rs query.rs asset.rs lib.rs copy.rs format/mod.rs` ; `read_image` ;
`createImageCache|BitmapDecoder|createImageBitmap|4096|100_000_000` ; `image|bitmap` dans `canvas2d.ts renderer.ts
webgl2.ts` ; `Worker|new URL` ; `loadFormatsModule|hasSheetReader|WorkerLike|createSheetReader` ;
`previewGrid|setGridPreview|endGridPreview` ; `handlesOf|hitHandle` ; `applyMatrix|invertMatrix` ;
`flood|tolerance|toler|pixel|rgba` (Rust : rien hors ActCraft) ; `rb-popover|setPanel|type Panel` ; `640` ;
`solidPng|function chunk|function crc32` ; `roomboard-items|extract` ; `valid_color|valid_matrix` ; `stageTags`.
Coffre : « roomboard édition image transparence », « roomboard worker wasm formats pixels », « piège playwright canvas
getImageData roomboard ». Autre dépôt : `~/projets/actcraft/render/src/imagefill.cpp` (tolérance).

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| Lire les paramètres d'une image | `crates/roomboard-core/src/element.rs:264` | `read_image(txn, e) -> Option<(Transform, ImageView)>`, `ImageView` (`:59`) gagne ses champs | étendre |
| Écrire les paramètres (commande) | `crates/roomboard-core/src/commands.rs:30`, `:597` | variante `Command::SetImageParams { id: String, params: ImageParamsInput, matrix: Transform }` ; bras vers `image::cmd_set_image_params(doc: &mut Document, id: &str, p: &ImageParamsInput, m: &Transform) -> Result<Change, CommandError>` (module neuf `image.rs`, patron `fill.rs`) | étendre |
| Contrôler la matrice | `commands.rs:467` | `valid_matrix(m: &Transform) -> bool` | réutiliser |
| Boîte de collision et de bornes | `query.rs:146-151` | `box_polygon(bw, bh)` avec `ImageView::display_size() -> (f64, f64)` | étendre |
| Recopier une image (copier, `.rbitem`, pages) | `copy.rs:62` | `copy_elements(...)` inchangé | réutiliser |
| Test « recharger garde les octets » | `commands.rs:2766` | modèle `image_and_backdrop_reload_keep_bytes` | réutiliser |
| Calcul des pixels | aucun (termes `flood`, `toler`, `pixel`, `rgba` : rien dans `crates/`) | `crates/roomboard-formats/src/pixels.rs`, DAI2 | nouveau module |
| Exposer les pixels au Worker | `crates/roomboard-formats-wasm/src/lib.rs:1-4` | patron `_inner` sans `JsValue` : `image_transparent`, `image_adjust`, `image_flood_fill` | étendre |
| Liaison principale | `crates/roomboard-wasm/src/lib.rs:528` | `set_image_params(...)` + `set_image_params_inner` (patron `add_image`) | étendre |
| Types de la page | `apps/web/src/core/api.ts:76`, `:151` | `Command`, `ImageData` | étendre |
| Géométrie d'affichage | aucun (termes `crop`, `flip`, `quarterTurns` : rien) | `apps/web/src/core/image-params.ts`, DAI1 | nouveau module |
| Matrices | `apps/web/src/core/shapes.ts:81`, `:98` | `applyMatrix(m, x, y)`, `invertMatrix(m)` | réutiliser |
| Faux cœur à parité | `apps/web/src/core/fake-core.ts:410`, `:675` | `SetImageParams`, `displaySize` | étendre |
| Décoder l'asset | `apps/web/src/platform/image-import.ts:159` | `decodeImage(blob, kind, max, ports)` (par le cache, inchangé) | réutiliser |
| Bitmap retouché par élément | `apps/web/src/engine/render/image-cache.ts:20` | `ImageSource` gagne `bitmapOf(el: ImageElement): CanvasImageSource \| null` ; `createImageCache(assets, decode, ready, pixels?: PixelRunner)` | étendre |
| Dessiner l'image | `apps/web/src/engine/render/canvas2d.ts:250` | dessin d'élément `image` (rognage, retournements, quarts) | étendre |
| Aperçu non écrit | `apps/web/src/engine/render/renderer.ts:61`, `engine.ts:647` | patron `setGridPreview` → `setImagePreview({ id, params } \| null)` | étendre |
| Cadre de rognage | `apps/web/src/engine/tools/handles.ts:24`, `:34` | `handlesOf(b)`, `hitHandle(b, x, y, reach, skip?)`, `HANDLE_PX`, `HANDLE_GRAB_PX` | réutiliser |
| Port du Worker | `apps/web/src/platform/sheet-reader.ts:30` | `WorkerLike` | réutiliser |
| Module `formats` dans le Worker | `apps/web/src/platform/container-load.ts:7`, `container.ts:66` | `loadFormatsModule()` ; garde `hasPixels(m)` sur le patron `hasSheetReader` | réutiliser, étendre |
| File de calculs gardée vivante | `sheet-reader.ts:83` (`createSheetReader`, un Worker par lecture : pas substituable, I18) | `apps/web/src/platform/pixel-runner.ts`, DAI3 | nouveau module |
| Lancer le Worker | `apps/web/src/main.ts:86-99` | patron `spawnSheetWorker` → `spawnPixelWorker` | étendre |
| État publié | `apps/web/src/engine/engine.ts:280-300` | `EngineState.selectionImage` | étendre |
| Moteur pendant la retouche | `engine.ts:84` | `Engine.editImage(id): ImageEdit \| null`, DAI4 | étendre |
| Bouton d'entrée | `apps/web/src/ui/SelectionRow.tsx:7`, `:16` | `SELECTION_ACTIONS`, `DISABLED` gagnent `image` | étendre |
| Panneau à aperçu | `apps/web/src/ui/GridPanel.tsx:30-37`, `App.tsx:114-139`, `:291` | patron `preview` / `endPreview` / `apply` / `cancel`, `rb-popover`, `sessionKey` | réutiliser (patron), nouveau composant `ImagePanel` |
| Ouvrir le panneau | `apps/web/src/app/toolbar-host.ts:28` | `HostTargets.toggle(panel)` gagne `"image"` | étendre |
| Marquage des essais | `apps/web/src/app/stage-tags.ts:21` | `stageTags(s)` gagne `pixels`, `image` | étendre |
| PNG fabriqué dans l'essai | `scripts/essais/c2-image-navigateur.mjs:29-54`, `c6a-pot-navigateur.mjs:42-67` (deux copies) | déplacé dans `commun.mjs` : `rgbPng(w, h, at: (x, y) => [r, g, b]) -> Buffer`, `solidPng(w, h, rgb)` | étendre `commun.mjs` |
| Serveur, dépôt, mesure des essais | `scripts/essais/commun.mjs:37`, `:72`, `:101`, `:110`, `:143` | `serve`, `inkIn(page, box, { rgb, tol })`, `stageBox`, `stageMouse`, `dropFile` | réutiliser |

## 4. Hypothèses à revoir

**Niveau 1 — difficiles à défaire ou visibles des utilisateurs**

- **HC5-1** Le mode contigu part du pixel piqué (`x`, `y` dans `transparent`, I3), pas des bords de l'image. Un fond
  coupé en deux par le dessin ne devient transparent que d'un côté : il faut le mode global, ou piquer l'autre côté (un
  seul `transparent` par image).
- **HC5-2** Retourner et tourner s'écrivent tout de suite (une étape chacun) ; luminosité, contraste et couleur
  transparente attendent « Valider » (I27). Un utilisateur qui ferme le panneau sans valider perd ses réglages.
- **HC5-3** Entrée par un bouton « Image » de la rangée Sélection et panneau calé à droite (I25, I26), au lieu d'une
  rangée de la barre : à montrer à la porte visuelle.
- **HC5-4** Une retouche garde en place le centre de la zone commune (I9) : rogner ne déplace pas les pixels gardés,
  retourner et tourner gardent le centre.
- **HC5-5** Formule de la luminosité (additive) et du contraste (autour de 128) (I15) ; la plume est une rampe linéaire
  (I13) ; tolérance par canal RVB, pas en CIELAB (I12). Changer de formule changerait le rendu des fichiers déjà
  enregistrés (les champs restent, leur sens bouge).
- **HC5-6** Les pixels d'une image de plus de 4096 px se calculent sur la copie d'affichage réduite (I22) : le bord de
  la transparence est moins fin qu'à pleine résolution (sans effet sur l'asset).

**Niveau 2 — les autres**

- **HC5-7** Défauts du panneau : tolérance 10, plume 0, contigu (I12-I14).
- **HC5-8** Le Worker de pixels vit tant qu'il a du travail et s'arrête 10 s après la dernière réponse (I18) ; délai
  de 60 s comme C10b.
- **HC5-9** Pendant un calcul, l'image brute est dessinée avec sa géométrie (I22) ; un document qui s'ouvre montre
  un court instant le fond blanc avant la transparence.
- **HC5-10** `OffscreenCanvas` 2D et `createImageBitmap` sont disponibles dans un Worker du Safari de l'iPad (16.4 et
  plus) et de WebKitGTK ; non vérifié sur l'appareil (étude, « Supposé »).
- **HC5-11** L'outil publié reste `select` pendant le rognage et la pipette (I30).
- **HC5-12** Une écriture ne ferme pas le panneau ; un changement de sélection, de page ou d'onglet le ferme (I31).
- **HC5-13** Si la rangée Sélection à 6 boutons fait passer la scène sous 640 px, les libellés se resserrent (I35).
- **HC5-14** Luminosité et contraste chargent aussi le module `formats` à l'ouverture (I24, extension de HU2-14).
- **HC5-15** « Rétablir l'original » ne connaît pas encore `sourceAsset` : C6b l'étendra (un seul endroit,
  `ImageEdit.restore`, DAI4).

## 5. Décisions d'architecture

**DAI1 — Géométrie d'affichage dans la page, boîte seule dans le cœur.**
Contexte : rogner, retourner et tourner changent la boîte et la place de l'image ; le dessin, la pipette et le cadre de
rognage sont dans la page, la collision dans le cœur.
Décision : `core/image-params.ts` : `displaySize(i: ImageData): [number, number]`, `sourceToDisplay(i, x, y)`, `displayToSource(i, x, y)`, `flipShown(p: ImageParams, axis: "h" | "v"): ImageParams`, `turnShown(p, dir: 1 | -1)`, `placeAfter(m: Matrix, i: ImageData, next: ImageParams): Matrix`, `isNeutral(p)`, `pixelKey(i): string` ; le cœur ne garde que `display_size` et reçoit la matrice dans `SetImageParams`.
Conséquences : une seule implémentation de la géométrie d'affichage ; `display_size` existe deux fois (Rust, TS), tenu par le test de contrat ; le cœur ne vérifie pas que la matrice reçue suit I9.

**DAI2 — Fonctions de pixels dans `roomboard-formats`.**
Contexte : U30 veut des fonctions pures testées par `cargo test`, hors du module de l'encre (H2-13).
Décision : `pixels.rs` : `pub fn transparent_color(px: &mut [u8], w: u32, h: u32, t: &Transparent) -> Result<(), PixelError>` (`Transparent { rgb: [u8; 3], tolerance: u8, soft: u8, contiguous: bool, seed: (u32, u32) }`), `pub fn adjust(px: &mut [u8], brightness: i8, contrast: i8)`, `pub fn flood_fill(px: &mut [u8], w: u32, h: u32, seed: (u32, u32), tolerance: u8, rgb: [u8; 3]) -> Result<(), PixelError>` ; `fn flood_region(px: &[u8], w, h, seed, limit: u8) -> Vec<bool>` partagé ; `PixelError::{BadSize, SeedOutside}` (`px.len() != 4 × w × h`).
Conséquences : le module `formats` grossit de quelques Ko ; C6b appelle `flood_fill` sans toucher ce module ; aucune crate d'image.

**DAI3 — Lanceur de calculs de pixels.**
Contexte : le Worker jetable de C10b rechargerait le module à chaque aperçu ; le résultat doit être jeté s'il est périmé.
Décision : `platform/pixel-runner.ts` : `createPixelRunner(spawn: () => WorkerLike, opts?: { idleMs?: number; timeoutMs?: number }): PixelRunner`, `PixelRunner { run(job: PixelJob): Promise<ImageBitmap>; dispose(): void }`, `PixelJob { bitmap: ImageBitmap; scale: number; transparent?: TransparentColor; brightness?: number; contrast?: number }` ; une file, un Worker vivant tant qu'elle n'est pas vide (+ 10 s), arrêt sur erreur ou 60 s sans réponse, message `PIXELS_FAILED_MESSAGE`.
Conséquences : la péremption (I19) est jugée par l'appelant (cache, aperçu) à l'arrivée ; une panique Wasm ne casse ni l'instance qui enregistre ni l'encre.

**DAI4 — Séance de retouche du moteur.**
Contexte : rognage et pipette prennent les gestes de la scène ; aperçu et écriture doivent passer par un seul endroit.
Décision : `Engine.editImage(id): ImageEdit | null` ; `ImageEdit { readonly id; preview(p: ImageParams | null): void; pick(): Promise<PickedPixel | null>; startCrop(): void; finishCrop(apply: boolean): boolean; commit(p: ImageParams): boolean; restore(): boolean; close(): void }`, `PickedPixel { x; y; color }` ; `commit` et `restore` envoient `SetImageParams` avec `placeAfter`.
Conséquences : le panneau ne connaît ni le cœur ni le rendu ; C6b étend `restore` ; une seule séance à la fois, `close` au démontage du panneau.

## 6. Scénarios d'acceptation

- **S1** (essai navigateur, joué par `verifier.sh --e2e`) Déposer un PNG fabriqué dans l'essai (200 × 150, fond blanc,
  anneau rouge à intérieur blanc) ; outil Sélection, cliquer l'image, « Image » ; « Rogner », tirer la poignée sud-est
  de 40 × 30 px, « Valider le rognage » : `data-image` vaut `160x120`, les pixels gardés n'ont pas bougé ;
  « Retourner ↔ » ; « Pipette », cliquer un coin blanc, tolérance 10, contigu : l'aperçu montre le fond de la page à
  travers le coin, l'intérieur blanc de l'anneau reste blanc ; « Valider » ; Ctrl+Z : le fond blanc revient ; Ctrl+Y :
  il redevient transparent ; capture `docs/essais/c5-image-rognee-transparente.png` (avec `--captures`) ; Enregistrer,
  rouvrir : `data-pixels="pret"`, mêmes pixels, même boîte ; « Rétablir l'original » : image brute 200 × 150, fond
  blanc ; Ctrl+Z : les retouches reviennent. La scène garde au moins 640 px de haut, panneau ouvert.
- **S2** Sur la même image, « Tourner ⟳ » : `data-image` passe à `150x200`, le centre reste en place, une étape ;
  Luminosité +50 : l'aperçu s'éclaircit ; « Fermer » sans valider : rien n'est écrit, Annuler n'a rien de neuf à
  défaire ; refaire, « Valider » : une étape.
- **S3** (tests du cœur `formats`) Image à fond blanc et intérieur blanc : mode global, tolérance 10 → les deux
  deviennent transparents ; contigu → seul le fond ; plume 20 → un pixel gris clair au bord reçoit un alpha
  intermédiaire ; luminosité 0 et contraste 0 → mêmes octets ; `flood_fill` rouge depuis le fond, tolérance 5 → seul
  le fond rougit, alpha gardé.
- **S4** Ouvrir la fixture `image-c2.roomboard` (écrite avec `main` d'avant C5) : l'image est brute, sans champ neuf ;
  l'enregistrer sans retouche donne les mêmes octets ; une image retouchée, enregistrée trente fois puis rechargée,
  garde ses octets.
- **S5** (tests de la page, faux Worker) Pendant le calcul d'un aperçu, déplacer le curseur de tolérance puis annuler
  une écriture : seuls les résultats dont la clé est encore celle de l'élément sont dessinés, les autres bitmaps sont
  fermés ; module `formats` qui ne se charge pas : image brute dessinée, `data-pixels="echec"`, un message dans
  `#etat`.

## 7. Hors périmètre

- Rotation libre, pot sur image, gomme sur image, `sourceAsset` (C6b ; rotation d'élément générale).
- « Pick Through » : la zone transparente reste cliquable (HU2-9).
- Ratio fixe du rognage, niveaux de gris, inversion, distance CIELAB, couleurs Display P3.
- Calcul des pixels à pleine résolution au-delà de 4096 px (I22).
- Encodage PNG d'une image retouchée, export d'une image retouchée vers une autre application ; export PDF des images
  retouchées (C12, qui dessinera par `canvas2d.ts`).
- Mesure sur iPad, Mac, Windows ; build Tauri ; essai du Worker sous la CSP de la vraie coque.
- La branche `feat/usage-c12-pdf` (OD85).

## 8. Portes immédiates

Aucune.
