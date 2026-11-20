# Cadrage — usage-c2-coeur (C2, partie cœur : assets, image, fond de page)

Cadré en mode autonome le 2026-11-20 (étage 1, cadreur, brief OD36), sans question posée à Jérôme. Ce cadrage court
**cite** les décisions U et DAU de `docs/plans/usage-cadrage.md` (rang 2, fusionné) sans les refaire ; il ne tranche que
les détails propres à la partie cœur (décisions K1 à K15). Base : `origin/main` `d71eda3` (lots 4 et 5a fusionnés).
`lot5b:` = `feat/socle-lot5b` (`3c3cbb2`), lu par `git show`, jamais modifié. Aucun graphe graphify pour RoomBoard
(`~/.cache/graphes/` : `claude-config`, `roomflow2`, `roomflow2-web`) : recherche texte seule. Coffre : aucune note
RoomBoard dans `02_Decisions` ni `04_Pieges` ; recherche non dégradée.

## 1. Demande et gabarit

**Demande.** Le document RoomBoard sait porter des images et un fond de page, côté cœur Rust, liaison Wasm et stockage
`AssetStore` de la page, sans interface : métadonnées d'asset (map `assets`), élément `kind: "image"` (U5), fond
`backdrop` (U6), `kind` inconnu toléré et gardé (U3), lecture et écriture des assets dans le `.roomboard` avec aller-retour
testé, compatibilité des fichiers du socle (U3) ; § 9 vague 0 de `usage-cadrage.md`, ligne C2.

**Gabarit.** `chantier`, cadrage court : budget 15 questions, 15 consommées (K1 à K15).

**Décisions de Jérôme qui s'imposent ici (rang 1, mot pour mot).** « Pour moi, un fichier peu avoir plusieurs page
(autorise plusieurs onglets). Une page doit pouvoir être infini en hauteur ( modèle activ inspire) » (D27 et D5 amendées,
`lot5b:docs/plans/socle-cadrage.md`, « Amendements ») : le `backdrop` se cale contre la **largeur** de la page, jamais
contre 1920 × 1080, et un `AssetStore` vit par document, donc par onglet. « Q1 = b », « Q3 = a » et « il sera nécessaire
de pouvoir édit le,contenu », « Q5 = a » et « Idem pour des fichier smartboard, myViewBoard ou .iwb », Q6 (fichiers
d'exemple du web et du PC) : sans effet sur la partie cœur (dépôt, Office, formats tiers), sauf Q6 pour l'essai réel (K15).

**Report des réponses Q au § 11.** Déjà fait par le lot 5b : `lot5b:docs/plans/usage-cadrage.md` § 11 porte Q1 à Q6
tranchées (mot pour mot) et amende U16, U21, U25, S4 et le point 12 du § 8. **Aucune tâche de report** dans ce chantier ;
le rebase sur `main` après la fusion du lot 5b les apporte.

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| K1 | Où vit le code des assets dans le conteneur | **Crate neuf `crates/roomboard-formats`** (Rust pur, testé en natif, dépend de `roomboard-core`), module `container` : empreinte, écriture et lecture des entrées `assets/`. **Sans liaison Wasm dans cette partie** : `roomboard-formats-wasm`, le Worker et le contrôle des deux modules par `verifier.sh` sont la partie « reste » de C2. `cargo test --workspace` et `clippy --workspace` le couvrent dès l'ajout au `members` de `Cargo.toml`, sans toucher `verifier.sh`. | DAU1 (« `crates/roomboard-formats` (Rust pur, testé en natif, qui dépend du cœur pour le code ZIP et le manifeste) ») ; U4 ; brief (verifier.sh hors périmètre) ; `scripts/verifier.sh:9-11` | oui (DAK1) |
| K2 | Découpage du `.roomboard` entre cœur et conteneur | Le cœur gagne `format::save_parts(doc, meta) -> Parts { manifest, ybin }` et `format::load_parts(manifest, ybin) -> (Document, Manifest)` (mêmes contrôles que `load_with_manifest`, déplacés) ; `save` et `load` gardent leur sortie et leur signature (`save` = ZIP de `save_parts`). Le conteneur écrit un **ZIP neuf** (manifeste, `document.ybin`, puis assets), avec les options d'entrée du cœur rendues publiques (`format::entry_options(stored: bool)`). Garde : sans asset, `container::write` donne **les mêmes octets** que `format::save`. `load(bytes)` d'un fichier à assets ouvre le document et ignore `assets/` : Ouvrir et Enregistrer des lots 5a et 5b marchent sans changement jusqu'à la partie « reste ». | U4 (« le cœur écrit comme aujourd'hui `manifest.json` et `document.ybin` » ; `format::load_parts`) ; D24, D25 ; `crates/roomboard-core/src/format/mod.rs:63-67`, `:78-98`, `:113-149` | oui |
| K3 | Map des métadonnées | Racine `Y.Map` `assets` : clé = SHA-256 en hexadécimal minuscule (64 caractères), valeur = `Y.Map{ name, mime, size }` (champs scalaires, jamais `Any::Map`). Écrite **seulement si absente** par la commande qui cite l'asset, dans la même transaction `"local"` (une étape). La racine `assets` entre dans la portée de l'historique (`History::new` reçoit `assets`) : annuler l'ajout d'une image retire aussi une métadonnée neuve. Une métadonnée qui n'est plus citée reste dans le document (aucun ménage implicite) ; elle n'est pas écrite dans `assets/` (K4). `linked` (vidéo liée, U26) : hors de cette partie, toléré s'il est lu. | U4 (« map racine `assets` […] par empreinte, `name` d'origine, `mime`, `size` ») ; U3 (valeurs composées) ; D11 ; `crates/roomboard-core/src/history.rs:18-31`, `document.rs:57-62` | oui |
| K4 | Quels assets écrire | Les assets **cités** : toute chaîne, à toute profondeur des `Y.Map` et `Y.Array` de `pages` (éléments de tout `kind`, connus ou non, et fonds), égale à une clé de `assets`. `Document::cited_assets() -> Vec<AssetInfo>` triée par empreinte. Ce balayage générique fait tenir ensemble U4 (« seuls les assets cités […] sont écrits ») et U3 (un élément d'une version plus récente garde ses assets au réenregistrement). Contenu des `Y.Text` non balayé. | U4 ; U3 (« gardé ») ; DAU4 (`cited_assets` du fragment, même fonction sur un sous-ensemble, C3) | oui (DAK2) |
| K5 | Élément image | `Y.Map{ id, kind: "image", transform, asset, w, h }`, sans `style` ; `w`, `h` = taille source en pixels, boîte locale (0, 0)-(w, h) placée par `transform`. Commande `AddImage{ page, asset: AssetRef{ id, name, mime, size }, w, h, matrix }` : une étape ; erreurs sans écriture : page inconnue, `BadAsset` (id non conforme, `mime` vide, `size` non entier, négatif ou non fini), `BadImage` (`w`, `h` non finis ou ≤ 0), `BadMatrix`. Géométrie : `box_polygon(w, h)` pour `hit_test`, `ids_in_rect`, `bounds` ; la gomme l'ignore (traits seuls, D12). Vue : `ImageView{ asset, w, h }`. | U5 ; D4, D12, D38 ; `crates/roomboard-core/src/shape.rs:146` (`box_polygon`), `commands.rs:286-293` (`positive`, `valid_matrix`), `query.rs:110-133` | oui |
| K6 | Fond de page | Champ facultatif de page `backdrop: Y.Map{ asset, kind: "image", w, h, fit: "width" }` : `w`, `h` ajoutés à U6 pour placer le fond sans décoder l'image. `fit: "width"` : mis à l'échelle sur la **largeur de la page**, coin en (0, 0), hauteur = `h × largeur / w`, proportions gardées ; ni `width` ni `height` de la page ne changent. Rectangle calculé par le cœur et rendu dans la vue (`BackdropView{ asset, kind, w, h, fit, rect }`) : une seule implémentation pour le rendu, l'export PDF et la capture. Commande `SetBackdrop{ page, backdrop: Option<BackdropInput{ asset: AssetRef, w, h, fit }> }` : une étape, `None` retire, valeur identique = aucune transaction (D38) ; seul `fit: "width"` est accepté à l'écriture. Hors `elements` : ni sélection, ni gomme, ni `hit_test`. | U6, DAU6 ; décision de Jérôme (D5 amendée, page infinie en hauteur) ; brief (« `fit` décidé contre la largeur de la page ») ; D38 | oui jusqu'à la release (HK1) |
| K7 | Lecture de la page par la page web | `CoreDocument.page(id): PageView \| null` ajouté (n'existe pas : la liaison n'expose aujourd'hui que `page_ids`) : `{ id, width, height, background, backdrop: BackdropView \| null }`. `Document::page` (cœur) lit `backdrop`. | code lu : `crates/roomboard-wasm/src/lib.rs:108` (seul `page_ids`), `apps/web/src/core/api.ts:76-96`, `crates/roomboard-core/src/document.rs:150-159` | oui |
| K8 | `kind` d'élément inconnu | Gardé tel quel (aucune commande n'écrit ses champs propres ; `Transform` ne réécrit que `transform`). Vue cœur : `kind: "unknown"`, `UnknownView{ sourceKind, w, h }`, boîte = `w`, `h` de l'élément s'ils sont des nombres finis > 0, sinon 100 × 100. Sélectionnable, déplaçable, supprimable (`Delete`), jamais gommé ; ses assets restent cités (K4). `ElementView.style` devient facultatif (`Option`, absent de la sortie quand `None`) : présent pour `stroke`, `shape`, `text`, absent pour `image` et `unknown`. Côté TS : `ElementBase` sans `style`, porté par `StrokeElement`, `ShapeElement`, `TextElement` ; `toElementView` contrôle toujours la forme des `kind` connus et rend un `UnknownElement` pour tout `kind` qu'il ne reconnaît pas, au lieu de lever. Un élément connu mal formé reste illisible (`None`, comme aujourd'hui). | U3 (« gardé dans le document et dessiné comme un cadre gris […] ne fait jamais échouer la lecture » ; « Corrige le code : `toElementView` lève […] et exige `style.color` / `style.width` ») ; `crates/roomboard-core/src/document.rs:180-221`, `element.rs:37-47`, `apps/web/src/core/wasm-core.ts:22-56` | oui |
| K9 | Fond inconnu | Un `backdrop` de `kind` ou de `fit` inconnus (fichier d'une version plus récente, `pdf-page` de C12) est gardé ; la vue rend les valeurs brutes, `rect` calculé comme `"width"` si `w`, `h` sont lisibles, sinon `rect: null`. | U3 ; U6 (`kind: "image" \| "pdf-page"`) | oui |
| K10 | Compatibilité | `schema` reste 1 et `formatVersion` 1 (U3). Première tâche, sur le code de `main` avant tout changement : fixture binaire `socle-v1.roomboard` (traits, formes, texte, deux pages, `SaveMeta` fixe) ; garde permanente : la charger puis la réenregistrer avec le même `SaveMeta` donne **les mêmes octets**, ce qui prouve qu'un document sans asset ne voit apparaître ni racine `assets` ni champ nouveau. | U3 ; D24 ; `format/mod.rs:376` (`reload_with_strokes_keeps_bytes`, modèle) | oui |
| K11 | Lecture du conteneur | `container::read(file) -> Unpacked{ parts, assets: Vec<(AssetId, Vec<u8>)>, warnings }` : entrées `assets/<64 hex>.<ext>` seules lues comme assets ; empreinte **recalculée** et comparée au nom ; écart, nom invalide ou doublon d'empreinte → asset ignoré avec un avertissement en français, jamais d'échec de lecture ; autres entrées ignorées (non gardées au réenregistrement). Manifeste et `document.ybin` contrôlés par `load_parts`. | U4 ; U3 ; D24 (« dossier `assets/` réservé (empreinte SHA-256) ») | oui (HK3) |
| K12 | Écriture du conteneur | `ContainerWriter::new(&Parts)`, `add_asset(id, mime, bytes)`, `finish() -> Vec<u8>` : entrées en ordre d'empreinte **croissante exigé** (erreur sinon : l'appelant passe `cited_assets()`, déjà triée ; le Worker de la partie « reste » trie les ids avant de lire les `Blob`, ce qui tient « quel que soit l'ordre reçu » de U4) ; nom `assets/<id>.<ext>`, extension tirée d'une table de types MIME (`png`, `jpg`, `gif`, `webp`, `bmp`, `ico`, `svg`, `avif`, `heic`, `tif`, `pdf`, `mp4`, `webm`), `bin` sinon ; méthode « stored » pour les types déjà compressés (PNG, JPEG, GIF, WebP, AVIF, HEIC, PDF, MP4, WebM), deflate sinon ; date fixe (D25). | U4 (« triées par empreinte » ; « stored » pour JPEG, PNG, MP4, PDF) ; D25 | oui |
| K13 | `AssetStore` de la page | Module neuf `apps/web/src/core/asset-store.ts` : **octets seulement** (`Blob`), les métadonnées restent dans le cœur (K3), une instance par document (D27 amendée : un document par onglet). Interface en section 3 (« Modules »). Empreinte par un `AssetHasher` injecté ; implémentation fournie : Web Crypto (`crypto.subtle.digest("SHA-256")`), vérifiée contre `container::sha256_hex` sur un vecteur commun. Aucun octet d'asset ne passe au module Wasm de l'encre : `AddImage` et `SetBackdrop` ne reçoivent que l'`AssetRef`. | U4 (« `AssetStore` TS (empreinte → `Blob`) », « jamais dans la mémoire du module Wasm de l'encre ») ; DAU5 ; D27 amendée | oui (DAK3, HK4) |
| K14 | Dépendances et poids | Une seule dépendance ajoutée : `sha2` 0.10 (MIT OU Apache-2.0 ; `digest`, `block-buffer`, `crypto-common`, `typenum`, `cpufeatures`, `cfg-if` : MIT OU Apache-2.0 ; `generic-array` : MIT), dans `roomboard-formats` seulement. Aucun paquet npm. Module Wasm principal : 1 413 052 octets mesurés (`apps/web/src/wasm/roomboard_wasm_bg.wasm`, référence `verifier.sh` de ce chantier) pour un budget de 1 572 864 : marge 159 812 octets, partagée avec C7 et C9 ; la liaison n'ajoute que des commandes et des vues, mesurée à la fin du chantier. Le contrôle scripté des licences et `THIRD_PARTY_NOTICES.md` (U39) vont avec `verifier.sh` dans la partie « reste ». | U39 ; DAU1 ; H2-13 ; `scripts/verifier.sh:32-38` ; licences relues dans `~/.cargo/registry/src/*/{sha2-0.10.9,…}/Cargo.toml` | oui (HK5) |
| K15 | Tests et fichiers d'essai | Fixtures **synthétiques** binaires dans `crates/roomboard-core/tests/fixtures/` (`socle-v1.roomboard`, `element-inconnu.roomboard`), écrites par un test Rust `#[ignore]` de régénération, lues par les tests Rust et par le test de contrat TS du vrai module. Essai réel facultatif : test Rust `#[ignore]` qui lit `ROOMBOARD_EXEMPLES` (`~/telechargements-roomboard/images/` : PNG, JPEG à EXIF, WebP, SVG, AVIF, HEIC) et fait l'aller-retour octet pour octet ; rien de ce dossier n'est commité ; sa sortie sert de `## Preuve` à la PR. | U36 (« Tests sur fichiers synthétiques ; aucun fichier d'autrui dans le dépôt ») ; Q6 ; brief ; `~/telechargements-roomboard/INVENTAIRE.md` § Images | oui |

## 3. Carte d'impact

Le profil n'a pas de ligne « Surfaces d'impact » : rubriques déduites (cœur, conteneur, liaison, page, persistance,
outillage, tests, autres dépôts). Chemins de `main` (`d71eda3`) sauf `lot5b:`.

### Cœur Rust (`crates/roomboard-core`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/document.rs:57-62` (`roots`) | oui | racine `assets` prise avec `meta` et `pages` (K3) | V |
| `src/document.rs:39-47` (`Document`), `:90-101` (`assemble`) | oui | champ `assets: MapRef` ; `History::new` reçoit `assets` | V |
| `src/document.rs:64-75` (`insert_page`) | non | une page neuve n'a pas de `backdrop` (champ facultatif) | V |
| `src/document.rs:150-159` (`page`) | oui | lit `backdrop`, calcule `rect` (K6, K9) | V |
| `src/document.rs:180-221` (`element`) | oui | branches `image` et `unknown`, `style` facultatif (K5, K8) | V |
| `src/document.rs:259-284` (`encode_v1`, `from_update_v1`) | non | inchangés ; garde K10 | V |
| `src/document.rs` (nouveau) `cited_assets`, `asset` | oui | balayage générique des pages (K4) | S |
| `src/element.rs:21-27` (`PageView`), `:37-47` (`ElementView`) | oui | `backdrop`, `style: Option`, `image`, `unknown` ; `AssetInfo`, `ImageView`, `UnknownView`, `BackdropView` | V |
| `src/element.rs:118-133` (`transform_to_any`, `out_transform`) | non | réutilisés tels quels | V |
| `src/history.rs:18-31` (`History::new`) | oui | `expand_scope` sur `assets` (K3) | V |
| `src/commands.rs:27-73` (`Command`), `:86-96` (`CommandError`) | oui | `AddImage`, `SetBackdrop` ; `BadAsset`, `BadImage` (messages français) | V |
| `src/commands.rs:353-404` (`apply`) | oui | deux branches | V |
| `src/commands.rs:286-293` (`positive`, `valid_matrix`), `:585-596` (`done`, `unchanged`) | non | réutilisés | V |
| `src/commands.rs:458-497` (`cmd_transform`) | non | ne réécrit que `transform` : un élément image ou inconnu se déplace sans perdre ses champs (test neuf) | V |
| `src/commands.rs:617` (`cmd_remove_page`), `:741` (`cmd_delete`) | non | retirer une page retire son `backdrop` ; supprimer une image laisse sa métadonnée (K3) | V |
| `src/commands.rs:665` (`cmd_erase`), `src/query.rs:136-152` (`geoms`, `strokes_only`) | non | la gomme ne voit que les traits | V |
| `src/query.rs:110-133` (`element_geom`) | oui | boîte pour `image` et `unknown` (K5, K8) | V |
| `src/query.rs:159-200` (`hit_test`, `ids_in_rect`, `bounds`) | non | suivent `element_geom` | V |
| `src/shape.rs:146` (`box_polygon`) | non | réutilisé | V |
| `src/format/mod.rs:63-67` (`options`) | oui | devient `pub fn entry_options(stored: bool)` (K2, K12) | V |
| `src/format/mod.rs:78-98` (`save`), `:113-149` (`load_with_manifest`) | oui | `save_parts`, `load_parts` ; sortie de `save` et `load` inchangée (K2) | V |
| `src/format/mod.rs:20-29` (`Manifest`), `:151-161` (`migrate`) | non | inchangés (pas de `kind` de manifeste : C3) | V |
| `src/capabilities.rs`, `src/ink/`, `src/shape.rs` (hors `box_polygon`) | non | sans rapport | V |
| `Cargo.toml` du cœur | non | aucune dépendance ajoutée au cœur | V |

### Conteneur (`crates/roomboard-formats`, nouveau)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-formats/Cargo.toml` | oui (nouveau) | `roomboard-core` (chemin), `zip` (mêmes options que le cœur), `sha2` | S |
| `crates/roomboard-formats/src/container.rs` | oui (nouveau) | `sha256_hex`, `is_asset_id`, `ContainerWriter`, `read` (K11, K12) | S |
| `Cargo.toml:3` (`members`) | oui | ajout du crate ; le lot 5b touche la même ligne (`roomboard-shell`) : conflit attendu, résolu en gardant les deux | V |
| `Cargo.lock` | oui | `sha2` et ses dépendances ; le lot 5b l'a aussi modifié | V |
| `crates/roomboard-formats-wasm` | non | partie « reste » (DAU1, Worker) | V |

### Liaison Wasm (`crates/roomboard-wasm`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/lib.rs:92` (`load`), `:96` (`save`) | non | gardés pour Ouvrir et Enregistrer des lots 5a et 5b | V |
| `src/lib.rs` (nouveau) `load_parts`, `save_parts` | oui | les deux moitiés du conteneur (K2), pour le Worker de la partie « reste » et le test de contrat | S |
| `src/lib.rs:108-115` (`page_ids`, `element_ids`) | non | inchangés | V |
| `src/lib.rs` (nouveau) `page`, `add_image`, `set_backdrop`, `cited_assets`, `asset` | oui | K5-K7, K4 | S |
| `src/lib.rs:211-216` (`element`) | non (code) | sortie élargie par la vue du cœur | V |
| `src/lib.rs:267-429` (`*_inner`) | oui | équivalents testables en natif des commandes neuves | V |
| `src/lib.rs:61` (`capabilities`) | non | sans rapport | V |

### Page (`apps/web`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/core/api.ts:13` (`ElementKind`), `:23-53` (`Command`), `:58-66` (vues), `:76-103` (`CoreDocument`, `CoreFactory`) | oui | `image`, `unknown`, `style` porté par trait, forme et texte ; `AddImage`, `SetBackdrop` ; `page`, `citedAssets`, `asset`, `saveParts` ; `loadParts` | V |
| `src/core/wasm-core.ts:22-56` (`toElementView`), `:74-94` (`apply`), `:117-123` (`createWasmCore`) | oui | contrôle des vues neuves, `kind` non reconnu → `UnknownElement` (K8) ; `toPageView`, `toAssetInfo` | V |
| `src/core/fake-core.ts:25-33` (`FakeElement`), `:324-331` (`element`), `:393` (`save`), `:419-457` (`SavedElement`, `fakeCore`) | oui | parité : image, fond, `kind` inconnu, métadonnées, `citedAssets` (même balayage) | V |
| `src/core/asset-store.ts` | oui (nouveau) | K13 | S |
| `src/engine/render/canvas2d.ts:143-157` (`paintElement`) | non | aiguille par `kind` puis lit `style` : compile avec l'union élargie, n'affiche rien pour `image` et `unknown` (rendu : partie « reste ») ; le lot 5b modifie ce fichier | V |
| `src/engine/tools/text.ts:101-108` | non | lit `style` après `el?.kind === "text"` : compile | V |
| `src/platform/controller.ts:118-157`, `pending.ts:15`, `files.ts:42-66`, `lot5b:src/platform/import.ts` | non | passage au `Blob` et au Worker : partie « reste » (U4) ; le lot 5b les réécrit | V |
| `src/main.ts`, `src/ui/`, `lot5b:src/app/*` | non | hors périmètre (brief) | V |

### Persistance et format

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `.roomboard` : `document.ybin` | oui | racine `assets`, élément `image`, champ de page `backdrop`, tous facultatifs (U3) | V (code du format) |
| `.roomboard` : entrées `assets/<sha256>.<ext>` | oui | écrites par le conteneur, triées (K12) | S |
| `.roomboard` : `manifest.json` | non | inchangé (K10) | V |
| attente IndexedDB (`pending.ts`) | non | partie « reste » | V |

### Outillage, scripts et CI

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/verifier.sh:9-11` (fmt, clippy, cargo test `--workspace`) | non (fichier) | couvre le crate neuf sans changement | V |
| `scripts/verifier.sh:16-19`, `:28-38` (un seul module Wasm, taille) | non | à garder vert ; module principal mesuré (K14) | V |
| `scripts/controle-wasm-bindgen.sh` | non | aucune version de `wasm-bindgen` changée | V |
| `scripts/controle-licences`, `THIRD_PARTY_NOTICES.md` | non | partie « reste » (K14, HK5) | V |
| `.github/workflows/` | non | D35 | V |

### Tests

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core/src/format/mod.rs:197-410` (16 tests, dont `save_is_deterministic`, `reload_with_strokes_keeps_bytes`, `zip_entries_have_fixed_date`) | non | à garder verts : K2 ne change aucun octet | V |
| `crates/roomboard-core/src/history.rs` (tests) | oui | `setup` suit la signature de `History::new` | V |
| `crates/roomboard-core/src/document.rs:413-675` (tests) | non | à garder verts | V |
| `crates/roomboard-core/src/commands.rs` (tests, dont `e.kind == "stroke"`, `:867`) | oui | lecture de `style` devenue `Option` | V |
| `crates/roomboard-wasm/src/lib.rs` (tests, `:623` `add_shape_inner_unknown_kind_is_bad_shape`) | oui | idem ; tests des commandes neuves | V |
| `crates/roomboard-core/tests/fixtures/` (nouveau) | oui | K10, K15 | S |
| `apps/web/src/core/wasm-core.contract.test.ts:72-129` (contrôle de forme), `:131`, `:278` (`describe.each`), `:572` (vrai module) | oui | vues neuves, commandes neuves pour les deux liaisons, fixtures pour le vrai module ; `:187` (« un élément inconnu rend null ») : id inconnu, à garder vert | V |
| `apps/web/src/core/fake-core.test.ts` | oui | parité | V |
| `apps/web/src/core/asset-store.test.ts` (nouveau) | oui | K13 | S |
| `apps/web/src/engine/**/*.test.ts`, `src/platform/*.test.ts`, `scripts/essais/*.mjs` | non | à garder verts | V |

### Autres dépôts et services (hors périmètre)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `~/telechargements-roomboard/` | non (lecture) | essai réel facultatif (K15), jamais commité | V |
| `~/projets/actcraft` | non | aucune reprise de code ici | V |

### Effets de bord sur l'existant

- `ElementView.style` devient facultatif (Rust `Option`, TS porté par trois types) : sortie inchangée pour `stroke`,
  `shape`, `text` ; couvert par les tests de contrat existants (`describe.each`, `:131`, `:278`) et par le neuf
  `toElementView : image et kind inconnu sans style, kind non reconnu → unknown`.
- Un élément de `kind` inconnu, aujourd'hui rendu `None` sans `style` ou levé par `toElementView` avec un `style`, devient
  une vue `unknown`, sélectionnable et déplaçable : tests neufs `unknown_kind_is_kept_moved_and_resaved` (Rust) et
  `élément de type inconnu : gardé, sans erreur` (contrat, fixture).
- L'historique suit aussi la racine `assets` : `history.rs` (tests) adaptés ; test neuf
  `undo_add_image_removes_new_asset_meta_only`.
- `format::options` devient public sous un autre nom ; `save` et `load` ne changent pas d'octets : `socle_fixture_resaves_identically`
  et `container_without_assets_equals_core_save` (neufs), plus les 16 tests du format gardés.
- Le workspace Cargo gagne un membre : `cargo test --workspace` et `clippy --workspace` plus longs de quelques
  secondes ; aucun effet sur le module Wasm de la page (le crate n'est pas lié par `roomboard-wasm`), mesuré par la
  taille relevée par `verifier.sh`.

### Chantiers en cours

- `feat/socle-lot5b` (`3c3cbb2`, 55 commits devant `main`, aucune PR ouverte), worktrees `socle-lot5b`,
  `socle-lot5b--T95` (`main.ts`, `toolbar.ts`, `ui/App.tsx`, `ui/PagesBar.tsx`), `socle-lot5b--T99`
  (`app/board-session*`, `app/mesure-outils*`). Fichiers communs avec ce chantier : **`Cargo.toml`** (ligne `members`)
  et **`Cargo.lock`** seulement. Le lot 5b ne touche ni `crates/roomboard-core`, ni `crates/roomboard-wasm`, ni
  `apps/web/src/core/` (`git diff --stat origin/main...feat/socle-lot5b`). Il modifie `canvas2d.ts` et `tools/text.ts`,
  que ce chantier ne touche pas mais dont la compilation dépend de l'union `ElementView` (lectures sous garde de `kind`,
  vérifiées sur `lot5b:` : `canvas2d.ts:155-160`, `tools/text.ts:108`).
- PR ouvertes : aucune (`gh pr list -R jejeasterix/roomboard --state open`). Autre machine : aucune donnée transmise.
- C7 et C9 (vague 0) : non lancés ; ils toucheront `commands.rs`, `roomboard-wasm/src/lib.rs`, `api.ts`, `fake-core.ts`
  après la fusion de C2 (ordre C2, C7, C9, `usage-cadrage.md` § 9).

### Termes cherchés

- Coffre : `chercher.js` « roomboard assets image fond de page », « yrs Any::Map ordre encodage déterministe zip »,
  « actcraft image fond flipchart assets empreinte » ; `grep -ril roomboard 02_Decisions 04_Pieges` (rien).
- Graphe : aucun (`ls ~/.cache/graphes/`).
- Texte, `origin/main` et `feat/socle-lot5b` (`git grep -n -i`, `crates apps/web/src`, hors `apps/web/src/wasm/`) :
  `sha2\|sha256\|SHA-256\|digest` (rien), `crypto.subtle` (rien), `AssetStore\|asset` (seul `format/mod.rs:2`),
  `backdrop` (rien), `new Blob\|: Blob` (`banc.ts`, `host-repli.ts`, `stylet.ts`, `mesure-outils.ts` : export de texte,
  sans rapport), `"image"` (rien), `unknown_kind\|kind inconnu\|sourceKind` (seul un test de forme inconnue).
- Texte, `main` : `grep -n '"kind"\|kind.as_str\|_ =>' query.rs commands.rs document.rs` ; `grep -n 'fn valid_matrix\|fn box_polygon\|fn unchanged\|fn done\|fn positive'` ;
  `grep -rn 'ElementView\|\.style\.\|kind === "' apps/web/src` (lecteurs de `style`) ; `grep -rn 'never\b' apps/web/src`
  (aucun aiguillage exhaustif) ; `grep -n 'pub fn' crates/roomboard-wasm/src/lib.rs` (pas de `page`) ;
  `sed -n 1,60p scripts/verifier.sh` ; `stat -c %s apps/web/src/wasm/roomboard_wasm_bg.wasm`.
- `zip-9.6.0/src/write.rs` (`new_append` présent, non retenu : ZIP neuf, K2) ; licences : `grep '^license'` des
  `Cargo.toml` de `sha2-0.10.9` et de ses dépendances dans `~/.cargo/registry/src/`.
- `git worktree list`, `gh pr list -R jejeasterix/roomboard --state open`, `git diff --stat origin/main...<branche>`,
  `git show feat/socle-lot5b:docs/plans/usage-cadrage.md` (§ 11), `git diff origin/main...feat/socle-lot5b -- docs/plans/socle-cadrage.md`.

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| Options d'entrée ZIP (date fixe, méthode) | `crates/roomboard-core/src/format/mod.rs:63` (`options`) | `pub fn entry_options(stored: bool) -> SimpleFileOptions` (stored = `CompressionMethod::Stored`, sinon `Deflated` ; date `DateTime::default()`) ; `save` l'appelle avec `false` | étendre |
| Moitiés du `.roomboard` | `format/mod.rs:78` (`save`), `:113` (`load_with_manifest`) | `pub struct Parts { pub manifest: Vec<u8>, pub ybin: Vec<u8> }` ; `pub fn save_parts(doc: &Document, meta: &SaveMeta) -> Result<Parts, FormatError>` ; `pub fn load_parts(manifest: &[u8], ybin: &[u8]) -> Result<(Document, Manifest), FormatError>` ; `load_with_manifest` lit les deux entrées puis appelle `load_parts` | étendre |
| Une commande = une étape | `document.rs:286` (`transact_local`), `commands.rs:585-596` (`done`, `unchanged`) | appelés par `cmd_add_image`, `cmd_set_backdrop` | réutiliser |
| Annuler la métadonnée | `history.rs:18` (`History::new`) | `History::new(doc: &Doc, pages: &ArrayRef, meta: &MapRef, assets: &MapRef)` | étendre |
| Validation des nombres et matrices | `commands.rs:286` (`positive`), `:291` (`valid_matrix`) | appelés tels quels | réutiliser |
| Géométrie d'une boîte | `shape.rs:146` (`box_polygon`) | `box_polygon(w, h)` pour `image` et `unknown` dans `element_geom` | réutiliser |
| Collision et bornes | `query.rs:110` (`element_geom`) | deux branches ; `hit_test`, `ids_in_rect`, `bounds` inchangés | étendre |
| Vues | `element.rs:21` (`PageView`), `:37` (`ElementView`) | `style: Option<StrokeStyle>` ; `image: Option<ImageView{ asset: String, w: f64, h: f64 }>` ; `unknown: Option<UnknownView{ source_kind: String, w: f64, h: f64 }>` ; `PageView.backdrop: Option<BackdropView{ asset: String, kind: String, w: Option<f64>, h: Option<f64>, fit: String, rect: Option<Bounds> }>` ; `AssetInfo{ id: String, name: String, mime: String, size: f64 }` (serde `camelCase`) | étendre |
| Lecture des valeurs yrs | `element.rs:87-133` (`out_f64`, `out_string`, `out_transform`, `transform_to_any`) | appelés tels quels | réutiliser |
| Assets cités | aucun (termes : `asset`, `cited`) | `Document::cited_assets(&self) -> Vec<AssetInfo>` (triée par `id`) ; `Document::asset(&self, id: &str) -> Option<AssetInfo>` | nouveau (dans `document.rs`, DAK2) |
| Empreinte, écriture et lecture des entrées `assets/` | aucun (termes `sha2`, `sha256`, `digest`, `assets/` : rien hors commentaire) | `roomboard_formats::container` : `pub fn sha256_hex(bytes: &[u8]) -> String` ; `pub fn is_asset_id(s: &str) -> bool` ; `pub struct ContainerWriter` avec `new(parts: &Parts) -> Result<Self, FormatError>`, `add_asset(&mut self, id: &str, mime: &str, bytes: &[u8]) -> Result<(), FormatError>` (id conforme et strictement croissant), `finish(self) -> Result<Vec<u8>, FormatError>` ; `pub fn write(parts: &Parts, assets: &[(&str, &str, &[u8])]) -> Result<Vec<u8>, FormatError>` (raccourci) ; `pub fn read(file: &[u8]) -> Result<Unpacked, FormatError>`, `Unpacked { parts: Parts, assets: Vec<(String, Vec<u8>)>, warnings: Vec<String> }` | nouveau crate (K1, DAK1) |
| Sérialisation vers JS | `crates/roomboard-wasm/src/lib.rs:24` (`to_js`), `:34-38` (erreurs) | appelés pour `page`, `cited_assets`, `asset`, `save_parts` | réutiliser |
| Contrôle des valeurs venues de Wasm | `apps/web/src/core/wasm-core.ts:8-20` (`isStrings`, `isNumbers`, `isRecord`, `toChange`), `toBounds` | réutilisés par `toPageView`, `toAssetInfo` | réutiliser |
| Fausse liaison | `apps/web/src/core/fake-core.ts:145` (`FakeDocument`), `:430` (`fakeCore`) | mêmes méthodes que `CoreDocument` ; balayage des assets cités sur son modèle JSON | étendre |
| Octets des assets côté page | aucun (termes `AssetStore`, `crypto.subtle`, `Blob` : rien d'équivalent) | `apps/web/src/core/asset-store.ts` : `export type AssetId = string` ; `export type AssetHasher = (blob: Blob) => Promise<AssetId>` ; `export const webCryptoHasher: AssetHasher` ; `export interface AssetStore { put(blob: Blob): Promise<AssetId>; adopt(id: AssetId, blob: Blob): void; get(id: AssetId): Blob \| undefined; has(id: AssetId): boolean; pick(ids: readonly AssetId[]): { present: Array<readonly [AssetId, Blob]>; missing: AssetId[] } }` ; `export function createAssetStore(hash?: AssetHasher): AssetStore` | nouveau module (K13, DAK3) |

Aucun besoin ne répond aux critères de « duplication nette » ni de « couture contournée nette » : le ZIP, les contrôles du
manifeste, la transaction locale, la validation et la géométrie de boîte du cœur sont appelés ou étendus, jamais recopiés.
`docs/architecture-constats.md` : absent ; aucune demande « Constats à fermer ».

## 4. Hypothèses à revoir

**Niveau 1 — difficiles à défaire après une release, ou visibles des utilisateurs.**

- **HK1** `fit: "width"` (K6) est un nom écrit dans les fichiers ; U6 disait `"contain"`, dont le sens (cadrer dans une
  boîte) ne tient plus sur une page sans hauteur fixe. Réversible tant qu'aucune release n'est publiée (D24).
- **HK2** Balayage générique des assets cités (K4) : une chaîne de 64 caractères hexadécimaux égale à une empreinte
  connue suffit à garder un asset. Défaut possible : un asset de trop dans le fichier ; jamais une perte.
- **HK3** Asset dont l'empreinte ne correspond pas à son contenu ou au nom attendu (K11) : ignoré avec avertissement,
  l'image apparaîtra « manquante » au lieu d'un refus du fichier entier.
- **HK4** Les métadonnées vivent dans le cœur, l'`AssetStore` ne garde que les octets (K13) : écart à l'interface listée
  par `usage-cadrage.md` § 3 (`put(blob, meta)`, `meta(id)`), pour une seule source de vérité.

**Niveau 2.**

- **HK5** Contrôle scripté des licences et `THIRD_PARTY_NOTICES.md` reportés à la partie « reste », avec `verifier.sh`
  (U39 les veut dès la première dépendance d'un chantier d'usage ; ici `sha2`, licences relues à la main, K14).
- **HK6** Empreinte côté page par Web Crypto (K13) ; U4 la place dans le Worker (`sha2`), qui lit par morceaux les
  fichiers de la coque. L'interface `AssetHasher` laisse la partie « reste » brancher le Worker sans toucher l'`AssetStore`.
  Web Crypto exige un contexte sûr (coque, `https`, `localhost`).
- **HK7** Boîte de 100 × 100 pour un élément inconnu sans `w`, `h` (K8).
- **HK8** Métadonnées non citées gardées dans `document.ybin` (K3) ; un ménage explicite viendra si leur nombre gêne.
- **HK9** Entrées inconnues du conteneur ignorées et non réécrites (K11) : une disposition nouvelle du conteneur passera
  par `formatVersion`, refusé par cette version.
- **HK10** `toElementView` rend `UnknownElement` pour un `kind` qu'il ne connaît pas (K8) au lieu de lever : le test de
  contrat reste le garde-fou des dérives de forme entre Rust et TS.
- **HK11** Le conteneur écrit un ZIP neuf plutôt que d'ajouter à celui du cœur (`ZipWriter::new_append`) : plus simple à
  rendre déterministe ; le coût est de recopier le manifeste et `document.ybin`, petits.
- **HK12** U6 et HU1-6 (« La taille de page suit la page importée (hauteur 1080, largeur selon le rapport) ») ne tiennent
  plus avec D5 amendée (largeur fixe, hauteur infinie) : à revoir au cadrage de C12 (PDF). Sans effet ici : `SetBackdrop`
  ne change jamais la taille de la page.

## 5. Décisions d'architecture

**DAK1 — Crate `roomboard-formats` dès la partie cœur, sans liaison Wasm.**
Contexte : U4 et DAU1 mettent le conteneur des assets hors du module de l'encre ; `verifier.sh` est hors périmètre.
Décision : crate Rust natif `roomboard-formats` (module `container`, `sha2`), qui dépend du cœur ; le cœur expose `Parts`,
`save_parts`, `load_parts`, `entry_options`. Liaison `roomboard-formats-wasm` et Worker : partie « reste ».
Conséquences : aller-retour testé par `cargo test` dès maintenant ; `sha2` jamais dans le module principal ; la partie
« reste » n'écrit qu'une liaison mince, sans logique de conteneur.

**DAK2 — Assets cités par balayage générique.**
Contexte : U4 écrit seulement les assets cités ; U3 garde les éléments inconnus, dont les champs ne sont pas connus.
Décision : toute chaîne des `Y.Map` et `Y.Array` de `pages` égale à une clé de `assets` cite cet asset ; résultat trié.
Conséquences : un fichier d'une version plus récente garde ses images, vidéos ou modèles 3D au réenregistrement ; C3
réutilise la même fonction pour un fragment ; coût linéaire en taille du document, à chaque enregistrement.

**DAK3 — `AssetStore` : octets seulement, empreinte injectée.**
Contexte : le cœur garde les métadonnées (U4) ; l'empreinte doit pouvoir venir de Web Crypto ou du Worker.
Décision : `AssetStore` garde `id → Blob`, dédoublonne par empreinte, rend les entrées à écrire triées ; une instance par
document ; `createAssetStore(hash?)`.
Conséquences : aucune copie de métadonnées à tenir d'accord ; la partie « reste » branche l'`AssetStore` sur la session
d'onglet du lot 5b et sur le Worker sans changer son interface.

**DAK4 — Le cœur calcule la place du fond.**
Contexte : la page n'a plus de hauteur fixe (D5 amendée) ; rendu, export PDF (C12) et capture (C11b) doivent placer le
fond de la même façon (D7 : une seule implémentation).
Décision : `BackdropView.rect` est calculé par le cœur selon `fit` (`"width"` seul connu) et rendu dans la vue de page.
Conséquences : le rendu TS dessine un rectangle reçu ; un nouveau `fit` s'ajoute dans le cœur seul.

## 6. Scénarios d'acceptation

Tous jouables par tests automatiques (`cargo test --workspace`, `pnpm -r test`), sans interface.

- **S1 — Image : aller-retour complet.** Document vierge ; `AddImage` d'un PNG synthétique sur la page (une étape) ;
  `save_parts`, puis `ContainerWriter` avec les octets de `cited_assets()` ; `container::read` puis `load_parts` :
  l'élément `image` a le même `asset`, `w`, `h`, `transform` ; l'asset relu a les mêmes octets et la même empreinte ;
  enregistrer deux fois donne les mêmes octets ; trente rechargements gardent les octets ; annuler l'ajout puis
  réenregistrer donne un fichier sans `assets/`, identique à `format::save`. Variante ignorée par défaut : mêmes gestes
  avec les images de `~/telechargements-roomboard/images/`.
- **S2 — Dédoublonnage.** `AssetStore.put` deux fois du même `Blob` : même empreinte, un seul `Blob`, empreinte égale à
  `sha256_hex` sur le vecteur commun ; deux `AddImage` du même asset : deux éléments, une seule métadonnée, une seule
  entrée `assets/` ; annuler le second garde la métadonnée, annuler le premier la retire.
- **S3 — Fond de page.** `SetBackdrop` d'une image de 1000 × 500 sur une page de largeur 1920 : `page(id).backdrop.rect`
  vaut (0, 0)-(1920, 960), la taille de page ne change pas ; `hit_test` au centre ne rend rien ; même fond une seconde
  fois : aucune étape ; retirer puis annuler : le fond revient ; recharger garde les octets ; l'asset du fond est écrit.
- **S4 — `kind` inconnu.** Ouvrir la fixture `element-inconnu.roomboard` (élément `hologram` avec `Y.Map` et `Y.Array`
  imbriqués et un asset) : lecture sans erreur, vue `unknown` (`sourceKind: "hologram"`) ; `Transform` le déplace, ses
  champs imbriqués restent ; réenregistrer garde son asset et, sans geste, les mêmes octets ; par la liaison réelle et la
  fausse, `toElementView` rend un `UnknownElement` sans lever.
- **S5 — Fichier du socle.** La fixture `socle-v1.roomboard`, écrite par le code de `main` (`d71eda3`), s'ouvre par
  `load` et par `load_parts` ; réenregistrée avec le même `SaveMeta`, elle donne exactement ses octets ; `load` d'un
  fichier qui a des assets ouvre le document (Ouvrir des lots 5a et 5b inchangé) ; tous les tests existants restent verts.

## 7. Hors périmètre

- Interface, composants, `main.ts`, rendu de l'image, du fond et du cadre « objet non pris en charge » (`canvas2d.ts`),
  outils : partie « reste » de C2 (vague 1).
- Dépôt de fichiers, `importFiles`, registre d'`Importer`, détection par octets, importeurs d'image (U23-U25, U33 :
  EXIF, TIFF, HEIC, SVG), collage d'image, limites de taille (U26) : partie « reste » ; le lot 5b pose l'entrée unique.
- `roomboard-formats-wasm`, Worker, `verifier.sh` (deux modules, taille du second), contrôle scripté des licences,
  `THIRD_PARTY_NOTICES.md`, CSP `worker-src` : partie « reste » (DAU1, U39).
- Ouvrir et Enregistrer en `Blob` (`controller.ts`, `pending.ts`, `files.ts`, DA8 amendé par U4) : partie « reste ».
- Vidéo liée (`linked`), `pdf-page` (C12), `kind` du manifeste et fragments (C3), synchronisation des assets entre pairs.
- Branches et worktrees du lot 5b (`feat/socle-lot5b`, `--T95`, `--T99`) : lus seulement.
- `~/telechargements-roomboard/` : lu seulement, rien de commité.
- Report des réponses Q1 à Q6 au § 11 de `usage-cadrage.md` : déjà fait par le lot 5b.

## 8. Portes immédiates

Aucune.
