# Cadrage — usage-c12-pdf (C12 : PDF)

Cadré en mode autonome le 2026-11-20 (étage 1, cadreur), sans question posée à Jérôme (brief OD85 : « tranche seul » ;
Jérôme, 2026-11-19 : « Continue d'avancer autant que possible suivant notre objectif établi. Nous ferons les tests plus
tard sur la version à laquelle tu seras parvenu »). Ce cadrage **cite** U6 (`docs/plans/usage-cadrage.md:59`), U23
(`:76`), U26 (`:79`), U34 (`:87`), U39 (`:92`), DAU6 (`:376-380`), HU1-6 (`:287`), HU1-10 (`:297-298`), HU2-10 (`:317`),
S14 (`:459-461`), la ligne C12 (`:559`) et Q1 (`:619-624`) sans les refaire ; il **étend** C2 (`usage-c2-coeur-cadrage.md`
K6, K9, DAK4 ; `usage-c2-depot-cadrage.md` R16), C3 (`usage-c3-groupes-cadrage.md` Z5, DAZ4) et le patron du Worker
jetable de C10b (`usage-c10b-tableau-cadrage.md`, DAB4). Il ne tranche que les détails (PF1 à PF32).
Base : `origin/main` `1a756bd` (socle, C1, C2, C3, C7, C7b, C9, C10a, C10b fusionnés).
Aucun graphe graphify pour RoomBoard (`~/.cache/graphes/` : `claude-config`, `roomflow2`, `roomflow2-web`) : recherche
texte seule. Coffre (`~/SecondBrain`, recherche non dégradée) : aucune décision RoomBoard ni PDF dans `02_Decisions` ;
un piège voisin (`04_Pieges/node-modules-en-lien-symbolique-dans-un-worktree-vite-denied-id.md` : `pdf.worker.min.mjs?url`
refusé par Vite quand `node_modules` est un lien hors racine) retenu en HPF2-9.
Registres interrogés pour ce cadrage (lecture seule, rien installé dans le worktree) : `pdfjs-dist` 6.5.438
(Apache-2.0), `pdf-lib` 1.17.1 (MIT), `krilla` 0.8.2 (MIT OR Apache-2.0, `rust-version` 1.92 ; `rustc` de la VM 1.100),
`hayro-write` 0.7.0 (Apache-2.0 OR MIT, non retenu).

**Prémisses du brief démenties ou corrigées par la lecture du code.**
1. « Le `backdrop` de C2 » n'est **pas dessiné** : C2 l'a laissé hors périmètre (`usage-c2-depot-cadrage.md:58`, R16 ;
   place réservée `apps/web/src/engine/render/canvas2d.ts:204`). C12 écrit le premier dessin du fond (PF14).
2. U6 et HU1-6 (« hauteur 1080, largeur selon le rapport ») ne tiennent plus : D5 amendée (décision de Jérôme,
   `socle-cadrage.md:384-387`) fixe la largeur à 1920 et rend la hauteur infinie ; HK12 (`usage-c2-coeur-cadrage.md:275-277`)
   renvoyait ce point à C12. Tranché en PF4.
3. Le `backdrop` écrit par le cœur n'a ni `page` ni genre autre que `image` (`crates/roomboard-core/src/commands.rs:994-1000`,
   `element.rs:303-309`) : C12 ajoute la lecture de `page` (PF5) et une construction dédiée (PF6), `SetBackdrop` reste tel quel.
4. Le module `formats` pèse 859 580 octets dans le dernier `dist` local (852 724 au journal de C10b) ; son plafond est
   3 Mio (R9, `scripts/verifier.sh:61-72`), pas 1,5 Mo : `krilla` y a de la place, à mesurer (PF22).
5. Aucune police n'est embarquée par l'application (`TEXT_FONT_FAMILY`, `apps/web/src/engine/text-layout.ts:9`, retombe
   sur `system-ui`) : l'export vectoriel prend Liberation Sans livrée par `pdfjs-dist` (PF22, HPF1-5).

## 1. Demande et gabarit

**Demande.** Un PDF déposé ou importé devient un document (nouvel onglet) dont chaque page est une page RoomBoard à fond
`pdf-page` rendu à la demande ; on annote par-dessus ; on exporte en un PDF où les pages d'origine gardent leur texte et
leurs vecteurs sous l'annotation, et où les autres pages RoomBoard sont écrites en vectoriel par `krilla`.

**Gabarit.** `chantier` (7 à 20 tâches) ; budget 40 questions, 32 consommées (PF1 à PF32). Ordre de valeur imposé par le
brief : (a) import et fond rendu à la demande, (b) export annoté, (c) export vectoriel ; (c) se coupe en premier.

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| PF1 | Découpage et ordre | Trois lots dans l'ordre (a) import + fond `pdf-page` + cache par palier, (b) export PDF annoté (superposition en image), (c) export vectoriel par `krilla` qui remplace aussi l'image de (b) par du vecteur. (a) et (b) forment un tout livrable ; (c) se coupe sans rien défaire. L'essai `--e2e` (PF25) couvre (a) et (b). | brief OD85 (« si le temps manque, (a) et (b) passent avant (c) ») | oui |
| PF2 | Arrivée d'un PDF | Dépôt (canvas, coque), « Importer » et fichier du lancement passent par `importFiles` (`apps/web/src/platform/import.ts:167`) ; un gestionnaire `pdf` de nature `document` ouvre **un nouvel onglet**, sans menu, l'onglet d'origine intact. « Ouvrir » garde son filtre `.roomboard` (`files.ts:11`) ; aucune association `.pdf` dans la coque. | Q1 (« Q1 = b », `usage-cadrage.md:619-624`) ; U23 ; D27 amendée (`socle-cadrage.md:381-383`) ; `workspace.ts:277` (`openDocument`, même règle) | oui |
| PF3 | Reconnaissance | Octets magiques `%PDF-` trouvés dans les 1024 premiers octets de l'en-tête déjà lu (`HEAD_BYTES` = 4096, `image-import.ts:29`), sans regarder l'extension. `IMPORT_EXTENSIONS` (`files.ts:67`) gagne `pdf`, `IMPORT_TYPES` (`host-fsa.ts:36-46`) gagne `application/pdf: [".pdf"]` ; libellé du filtre : « Images, PDF et documents RoomBoard ». | U23 (« octets magiques […] puis extension ») ; norme PDF (en-tête toléré dans le premier Ko) | oui |
| PF4 | Taille de la page | La page garde la largeur 1920 et sa hauteur infinie ; le fond se cale sur la largeur (`fit: "width"`, seul accepté), sa hauteur vaut `h × 1920 / w` (portrait A4 : 1920 × 2715), calculée par le cœur (`BackdropView.rect`, DAK4). Le champ `height` de la page reste 1080 (hauteur minimale). U6 et HU1-6 sont caducs sur ce point. | D5 amendée (décision de Jérôme, rang 1, `socle-cadrage.md:384-387`) ; HK12 et DAK4 (`usage-c2-coeur-cadrage.md:275-277`, `:304-307`) ; `element.rs:333-357` | oui |
| PF5 | Forme du fond `pdf-page` | `backdrop: Y.Map{ asset, kind: "pdf-page", page, w, h, fit: "width" }` ; `page` = **indice à partir de 0** (nombre) ; `w`, `h` = taille de la page en points **après** `/Rotate` et `CropBox` (viewport `pdf.js` à l'échelle 1). Lecture : `RawBackdrop.page` et `BackdropView.page: Option<u32>` (Rust), `page: number \| null` (TS, `api.ts:193`) ; un `page` non entier, négatif ou absent donne `null` (fond dessiné en placeholder « page PDF illisible »). `schema` et `formatVersion` inchangés. | U6 (`page?`) ; K6, K9 (`usage-c2-coeur-cadrage.md:40`, `:43`) ; U3 | oui jusqu'à la release (HPF1-1) |
| PF6 | Construction du document | `Document::from_pdf_pages(asset: &AssetRef, sizes: &[(f64, f64)]) -> Result<Document, CommandError>` : comme `blank()` (`document.rs:121`), une transaction **sans origine `"local"`** avant la création de `History` : une page par taille, fond `pdf-page` d'indice i, métadonnée d'asset écrite ; rien ne s'annule, l'onglet n'est pas « modifié ». Refus : `BadAsset` (empreinte), `BadImage` (0 page, plus de 500, taille non finie ou ≤ 0). Liaison `from_pdf_pages(id, name, mime, size, sizes: Vec<f64>)` (couples `w, h`) ; contrat `CoreFactory.fromPdfPages(asset: AssetRef, sizes: readonly PdfPageSize[]): CoreDocument` avec `PdfPageSize = { w: number; h: number }`, parité dans `fake-core.ts`. `SetBackdrop` n'est pas touché. | D37 (`socle-cadrage.md:64`) ; DAU4 (une étape par fichier) ; `commands.rs:942-1009` (`cmd_set_backdrop`, genre `image` seul) | oui |
| PF7 | Limite de 500 pages | Les 500 premières pages sont importées ; avis « <nom> : 500 premières pages importées sur N ». L'asset reste le PDF entier. | U26 (« PDF : 500 pages par import ») | oui (HPF1-2) |
| PF8 | PDF chiffré | Refusé, rien n'est ouvert : `PasswordException` de `pdf.js` (mot de passe d'ouverture) **ou** fichier ouvert dont le dictionnaire d'infos porte `EncryptFilterName` (chiffré par mot de passe de droits) ; avis « <nom> : PDF chiffré, non pris en charge ». Le second cas protège aussi l'export (`pdf-lib` ne réécrit pas un PDF chiffré). | U26 (« fichiers chiffrés : refusés avec message (comme ActCraft) ») | oui (HPF2-1) |
| PF9 | Poids | Web : 100 Mo par fichier, contrôle existant avant lecture (`WEB_MAX_BYTES`, `import.ts:17`, `:186-189`) ; coque : aucune limite fixe ; aucun `limit` propre au gestionnaire `pdf`. | U26 ; R15 (C2) | oui |
| PF10 | Onglet du PDF | Octets mis dans l'`AssetStore` du nouvel onglet (`put`, `asset-store.ts`), `mime: "application/pdf"`, `name` d'origine ; onglet nommé `<nom sans .pdf>.roomboard`, `target: null` (Enregistrer demande où, jamais sur le PDF) ; onglets pleins : `TOO_MANY_TABS` et arrêt des documents suivants (`full()`, `import.ts:231`). Le PDF n'est lu qu'une fois par `importFiles` (`f.blob()`). | U1 (jamais de réécriture de l'original) ; `workspace.ts:205-254` (`addTab`), `:277-286` ; `controller.ts:121` (`{ kind: "ask", name }`) | oui |
| PF11 | Où vit `pdf.js` | Dans la page, avec **son propre Worker** (`pdf.worker`, build `legacy`), chargé par import dynamique depuis `platform/pdf-load.ts`, importé par l'amorce seule (`main.ts`), comme `container-load.ts:7` ; jamais au démarrage. Options : `isEvalSupported: false`, `cMapUrl`, `cMapPacked`, `standardFontDataUrl`, `wasmUrl` locaux (`./pdfjs/…`), copiés au build par un petit plugin écrit dans `apps/web/vite.config.ts` (aucune dépendance de plus). | U34 (worker et polices embarqués, hors ligne) ; D27 ; U23 (« PDF par `pdf.js` […] dans la page ») ; brief (« import dynamique ») | oui (DAPF1) |
| PF12 | Port du rendu PDF | Le moteur n'importe jamais `pdf.js`. Port `PdfEngine.open(blob: Blob): Promise<PdfFile>` ; `PdfFile { pageCount; pageSize(i): Promise<PdfPageSize>; renderTile(i, scale, tile: TileRect, signal: AbortSignal): Promise<CanvasImageSource>; destroy(): void }` ; erreur `PdfEncryptedError`. Implémentation `platform/pdf-render.ts` ; faux dans les tests. | DAU5 (le moteur ne porte jamais un PDF) ; patron `ImageSource` (`image-cache.ts:9`) | oui |
| PF13 | Cache par palier de zoom | Palier `p` = 2^⌈log2(zoom × dpr)⌉ borné à [1/4, 8] (pixels d'écran par unité monde) ; la page est découpée en **tuiles de 1024 px** à ce palier ; clé `asset · page · p · colonne · rang` ; seules les tuiles visibles sont rendues, 2 rendus au plus en cours, ceux qui sortent de la vue annulés ; LRU de 32 tuiles par onglet (bitmaps fermés à l'éviction et à `dispose`) ; un `PdfFile` par asset et par onglet, ouvert au premier besoin, détruit à la fermeture de l'onglet. | DAU6 (« rendu par `pdf.js` par palier de zoom ») ; U26 (côté de 4096 px) ; S14 (« nettes à 400 % ») | oui (HPF2-2) |
| PF14 | Placeholder et rendu asynchrone dans la scène | `drawScene` reste synchrone : à la place réservée (`canvas2d.ts:204`, après le blanc de page, avant la grille), il peint le placeholder (gris `#f1f5f9`) sur `backdrop.rect`, puis les tuiles en cache des paliers plus grossiers, puis celles du palier courant (l'image la plus fine recouvre) ; une tuile prête appelle `ready → engine.redraw()` (patron R16, `board-session.ts:135`). Fond `image` : bitmap de l'`ImageSource` étiré sur `rect` (même code, gratuit). La `PageView` du rendu (`renderer.ts:6`) gagne `backdrop?: BackdropView \| null`, remplie par le moteur depuis `doc.page(pageId)` (`engine.ts:436`). | DAU6 (« placeholder tant que le rendu n'est pas prêt », « rendu de la scène asynchrone pour le fond seulement ») ; DAR2, R16 ; G11 (ordre des couches) | oui (DAPF2) |
| PF15 | Marquage pour les essais | `#stage[data-fond]` : vide (page sans fond), `attente` (une tuile visible manque), `pret` (toutes les tuiles visibles du palier courant dessinées), `echec` (PDF illisible ou absent). | contrat des marquages (`stage-tags.ts`, lot 4) | oui |
| PF16 | Comportement du fond | Ni sélection, ni gomme, ni `hit_test`, ni magnétisme (inchangé : le fond est hors `elements`). | K6 (`usage-c2-coeur-cadrage.md:40`) | oui |
| PF17 | Aller-retour `.roomboard` | L'original est **un seul** asset `assets/<sha256>.pdf` (méthode « stored », trié, dédoublonné par empreinte) écrit par le conteneur existant ; « Insérer des pages… » d'un document à fonds PDF recopie fonds et asset (Z5). | U4, U6 (« l'original est un seul asset ») ; K12 ; Z5 (`usage-c3-groupes-cadrage.md:41`) | oui |
| PF18 | Compatibilité | Un fichier d'avant C12 s'ouvre comme avant (aucun champ nouveau exigé) ; un fichier de C12 ouvert par une version plus ancienne garde le champ `backdrop` et ne le dessine pas (aucune version antérieure ne dessine de fond). Tests de compatibilité existants gardés verts. | U3 ; K9 | oui |
| PF19 | Bouton d'export | Une seule action `export-pdf` « Exporter en PDF… » ajoutée à la **barre des pages, en bas** (`pagesBar`, `toolbar-profiles.ts:24`), pas à la barre du haut ; `ACTION_TABLE` (`toolbar.ts:98`), `ACTIONS` (`toolbar-host.ts:35`), `HostTargets.exportPdf()`. Fichier écrit par un second `TypedFiles` de type `PDF_TYPE` (`typed-files.ts`, web : téléchargement ; coque : boîte native) ; nom `<base> annoté.pdf` si une page a un fond `pdf-page`, sinon `<base>.pdf` ; une seule exportation à la fois (« Opération en cours »), avis « PDF exporté (N pages) ». | piège de C10b (scène sous 640 px, `docs/sessions/usage-c10b-tableau-etat.md:58`) ; DAZ4 (types de fichiers) ; U1 (jamais l'original écrasé) | oui (HPF1-3) |
| PF20 | Contenu de l'export | Pages dans l'ordre du document. Page à fond `pdf-page` : la page d'origine **recopiée par `pdf-lib`** (`copyPages` : flux, polices, texte, annotations intacts), puis le contenu RoomBoard (grille et éléments ; ni fond blanc, ni fond, ni habillage) superposé, le rectangle monde (0, 0)-(1920, `rect.y1`) projeté sur la `CropBox` en tenant compte de `/Rotate` ; page d'origine sans contenu RoomBoard : recopiée telle quelle. Contenu hors du rectangle : coupé, avis « du contenu hors des pages PDF n'est pas exporté ». Autre page : page neuve de 842 pt de large, hauteur `max(1080, bas du contenu) × 842 / 1920`. Sources PDF multiples (pages insérées) : chacune chargée une fois. Asset absent : export refusé (`UNREAD_ASSETS_MESSAGE`). | U34 (« PDF annoté = contenu RoomBoard superposé aux pages de l'original […] texte et vecteurs d'origine conservés ») ; DAU6 (conséquences) ; S14 | oui (HPF1-4, HPF2-3) |
| PF21 | Superposition en (b) : image ou vecteur, et bibliothèque | (b) : **image PNG** du contenu, dessinée par le `Canvas2DRenderer` existant (nouvelle méthode publique `paintContent`, PF22), à `min(2, 4096 / plus grand côté)` px par unité ; `pdf-lib` 1.17.1 (MIT), chargé par import dynamique dans la page, `embedPng` + `drawImage` ; enregistré avec `useObjectStreams: false`. (c) remplace l'image par la page vectorielle de `krilla` posée par `embedPdf` + `drawPage` : seul le producteur de superposition change. `lopdf` écarté (il n'aurait servi qu'à l'assemblage, que `pdf-lib` fait déjà en TS, sans passer les octets du PDF par un Worker Wasm). | U34 (« `pdf-lib`, MIT, ou `lopdf` ») ; table des modules (`usage-cadrage.md:262` : « superposition par `PDFDocument.embedPage` ») ; D7 du socle (une seule implémentation du dessin) | oui (DAPF3) |
| PF22 | Export vectoriel (c), exposition de `krilla` | Le même `paintContent` dessine dans un `RecordingContext2D` (nouveau, sous-ensemble de l'API Canvas 2D utilisé par `canvas2d.ts`, `measureText` délégué à un vrai contexte) qui produit une liste d'opérations (chemins, remplissages, traits, textes placés, images, transformations, découpes) ; la liste, les images et la police partent dans un **Worker jetable** (patron C10b) qui charge le module `formats` et appelle `write_pdf_pages` ; Rust : `roomboard_formats::pdf::write_pages(list: &DisplayList, fonts: &[&[u8]], images: &[ImageInput]) -> Result<Vec<u8>, PdfWriteError>` ; `krilla = { version = "0.8", default-features = false, features = ["simple-text", "raster-images"] }`, jamais dans le module principal. Police : Liberation Sans (OFL-1.1) de `pdfjs-dist/standard_fonts`. Taille du module `formats` mesurée avant et après (plafond R9). | U34 (« pages RoomBoard en PDF vectoriel par `krilla` […] dans `roomboard-formats` ») ; H2-13 ; R9 (`verifier.sh:61-72`) ; DAB4 (Worker jetable) ; U39 (OFL pour les polices de `pdfjs-dist`) | oui (DAPF4) |
| PF23 | Licences | `pdfjs-dist` (Apache-2.0), `pdf-lib` (MIT) et ses dépendances (`@pdf-lib/standard-fonts`, `@pdf-lib/upng` : MIT ; `pako` : MIT AND Zlib ; `tslib` : 0BSD), polices `standard_fonts` (Liberation : OFL-1.1 ; Foxit : licence de type BSD, texte `LICENSE_FOXIT` à reprendre) ; crates de `krilla` relevés par `cargo metadata`. Tout passe `scripts/controle-licences.mjs` ; une exception éventuelle va dans `scripts/licences-acceptees.json` avec sa raison ; `THIRD_PARTY_NOTICES.md` complété. Aucune AGPL, GPL, LGPL. | U39 ; R21 | oui |
| PF24 | Hors ligne | Les hôtes cités par `pdf.js` et `pdf-lib` dans leur code (espaces de noms XMP, URL de messages d'erreur) sont relevés sur le `dist` construit et ajoutés un par un à `NON_FETCHED_HOSTS` (`scripts/controle-hors-ligne.mjs:13`) avec leur raison ; aucun n'est chargé. CSP de la coque inchangée (`default-src 'self'` couvre le Worker, `'wasm-unsafe-eval'` déjà là). | D27 ; brief (« `controle-hors-ligne.mjs` doit rester vert ») | oui (HPF2-4) |
| PF25 | Essai `--e2e` | `scripts/essais/c12-pdf-navigateur.mjs` (patron `c3-groupes-navigateur.mjs`, CSP de la coque, repli, heure figée) : PDF de 3 pages **généré dans l'essai** par `pdf-lib` (résolu depuis `apps/web`), texte « RoomBoard page 1…3 » ; déposer ; `data-page` « 1/3 », `data-fond` « pret », pixels non blancs dans la page ; page 2 : un trait ; Exporter en PDF ; relire le PDF téléchargé en Node (`pdf.js` legacy : 3 pages, texte « RoomBoard page 2 » présent ; `pdf-lib` : une image en ressource de la page 2 seulement) ; redéposer ce PDF : 3 pages ; Enregistrer, redéposer le `.roomboard` : 3 pages, fond prêt, un élément en page 2. Ajouté à `verifier.sh` (bloc `--e2e`) et à `scripts/tests/verifier-e2e.test.sh`. `--captures` seul écrit `docs/essais/c12-pdf-annote.png` (page 2 du PDF exporté, redéposé). | brief OD85 (essai exigé) ; D33 ; `verifier.sh:91-105` ; `verifier-e2e.test.sh:13` | oui |
| PF26 | Chargement à la demande vérifié | L'essai enregistre les requêtes : aucun morceau `pdf.js` ni `pdf-lib` avant le dépôt du PDF. | brief (« jamais au démarrage ») | oui |
| PF27 | Hauteur de la scène | L'essai vérifie `stageBox(page, 640)` (`commun.mjs:94`) à 1280 × 900 après l'ajout du bouton. | piège de C10b (`usage-c10b-tableau-etat.md:58`) | oui |
| PF28 | Constats d'architecture ouverts des zones touchées | Ne pas aggraver : le moteur lit `PAGE_WIDTH` d'`engine/page.ts:4` (pas une troisième copie, constat `core/api.ts:145`) ; la remise du type d'un `Blob` passe par `typed` (`container-io.ts:47`, constat `workspace.ts:151`) ; le PDF ne passe pas par `ImageTarget` (constat `image-import.ts:244`). Aucune zone à fermer (la demande ne vient pas d'`audit-architecture`). | `docs/architecture-constats.md` | oui |
| PF29 | Chantier parallèle OD84 (C6a, `feat/usage-c6a-pot`) | Sa branche n'est pas touchée. Mêmes lignes : appel `renderer.drawScene` (`engine.ts:436`, C6a y ajoute `background` lu par `doc.page(pageId)`), `drawScene` et `paintEraser` de `canvas2d.ts`, `PageView` de `renderer.ts`, groupes de `toolbar-profiles.ts`. Règle : intégrer `origin/main` avant la fusion ; au conflit, **un seul** `doc.page(pageId)` alimente `background` et `backdrop`. | brief OD85 ; `git diff origin/main...feat/usage-c6a-pot` (lu) | oui |
| PF30 | Aperçu de la gomme partielle sur un PDF | Inchangé : l'aperçu peint la couleur du fond le long du chemin (`canvas2d.ts:416-445`), donc une bande blanche passe sur le PDF **pendant** le geste ; au relâché, le PDF réapparaît. Correction hors périmètre (HPF1-6). | D38 ; budget du brief | oui |
| PF31 | Build de `pdf.js` | Build `legacy` de `pdfjs-dist` (WebKitGTK de la coque Linux, WKWebView de macOS 14, iPad) ; la taille des morceaux est relevée dans le rapport. | D34 (plateformes) ; HU2-10 | oui (HPF2-5) |
| PF32 | Mémoire de l'iPad | Non mesurée ici (aucun iPad sur la VM) : HU1-10 reste ouvert ; les bornes de PF13 la limitent (32 tuiles, ≈ 128 Mo au pire). | HU1-10 (`usage-cadrage.md:297-298`) | oui |

## 3. Carte d'impact

Rubriques : pas de ligne « Surfaces d'impact » dans le profil ; rubriques déduites de la recherche (cœur, liaisons,
contrat de la page, moteur et rendu, application et barre, plateforme, build, essais et scripts, licences, tests, autres
dépôts). V : lu dans le code ; S : supposé.

### Cœur Rust (`crates/roomboard-core`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/element.rs:48-56` (`BackdropView`) | oui | champ `page: Option<u32>` (PF5) | V |
| `src/element.rs:303-330` (`RawBackdrop`, `read_backdrop`) | oui | lit `page` (PF5) | V |
| `src/element.rs:333-357` (`backdrop_view`) | oui | recopie `page` ; `rect` inchangé (PF4) | V |
| `src/document.rs:121-128` (`blank`, `bare`, `assemble`) | oui | `from_pdf_pages` construit de même, sans origine `"local"` (PF6) | V |
| `src/document.rs:163-175` (`page`) | non | lit déjà le fond par `read_backdrop` | V |
| `src/document.rs:179` (`cited_assets`) | non | parcourt tout le document : l'asset PDF y est | V |
| `src/commands.rs:87-90`, `:204-211`, `:942-1009` (`SetBackdrop`) | non | genre `image` seul, gardé (PF6) | V |
| `src/copy.rs:225` (`insert_pages`) | non | recopie profonde, `page` compris (PF17) | V |
| `src/format/` (lecture, écriture) | non | champs facultatifs (U3) | V |

### Liaison Wasm principale (`crates/roomboard-wasm/src/lib.rs`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `:407` (`blank`), `:412-425` (`load`, `load_parts`) | oui | voisine `from_pdf_pages(id, name, mime, size, sizes)` (PF6) | V |
| `:506` (`page`) | non | sérialise `BackdropView`, `page` suit | V |
| `:546-571` (`set_backdrop`, `clear_backdrop`) | non | inchangés | V |

### Module `formats` (`crates/roomboard-formats`, `crates/roomboard-formats-wasm`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `roomboard-formats/Cargo.toml` | oui (c) | `krilla` 0.8 sans les fonctions par défaut (PF22) | V |
| `roomboard-formats/src/lib.rs:1-4` | oui (c) | `pub mod pdf;` | V |
| `roomboard-formats/src/pdf.rs` (nouveau) | oui (c) | `write_pages` (PF22) | S |
| `roomboard-formats-wasm/src/lib.rs` | oui (c) | `write_pdf_pages` délègue à une fonction `_inner` testée en natif (patron du fichier) | V |
| `roomboard-formats/src/container.rs` | non | « stored » pour PDF déjà prévu par U4 ; aucun changement attendu | S |

### Contrat de la page (`apps/web/src/core`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `api.ts:193-200` (`BackdropView`) | oui | `page: number \| null` (PF5) | V |
| `api.ts:263-272` (`CoreFactory`) | oui | `fromPdfPages`, type `PdfPageSize` (PF6) | V |
| `wasm-core.ts:241` (`toBackdropView`) | oui | `undefined` → `null` pour `page` | V |
| `wasm-core.ts` (fabrique) | oui | `fromPdfPages` | S |
| `fake-core.ts:990` (`page`), fabrique | oui | parité (PF5, PF6) | V |
| `wasm-core.contract.test.ts`, `fake-core.test.ts` | oui | contrat de `fromPdfPages` et de `page` | V |
| `asset-store.ts` (`put`) | non | réutilisé tel quel | V |

### Moteur et rendu (`apps/web/src/engine`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `render/renderer.ts:6-9` (`PageView`) | oui | `backdrop?: BackdropView \| null` (PF14) ; conflit avec C6a (`background?`) | V |
| `render/canvas2d.ts:195-216` (`drawScene`) | oui | dessin du fond à la place réservée `:204` (PF14) ; conflit avec C6a | V |
| `render/canvas2d.ts:225-264` (`paintElement`) | non | réutilisé par `paintContent` | V |
| `render/canvas2d.ts` (nouveau `paintContent`) | oui | contenu d'une page sans caméra ni habillage, pour l'export (PF21, PF22) | S |
| `render/canvas2d.ts:416-445` (`paintEraser`) | non | limitation gardée (PF30) ; C6a y touche | V |
| `render/webgl2.ts:295` (`drawScene` délégué) | non | relaie la `PageView` ; fond dessiné par la scène Canvas 2D | V |
| `render/image-cache.ts:9-20` | non | `ImageSource` réutilisée pour le fond `image` | V |
| `render/pdf-tiles.ts` (nouveau) | oui | cache par palier (PF13, DAPF2) | S |
| `render/record-ctx.ts` (nouveau) | oui (c) | `RecordingContext2D` (PF22) | S |
| `engine.ts:436` (appel `drawScene`) | oui | `backdrop` depuis `doc.page(pageId)` ; conflit direct avec C6a | V |
| `page.ts:4-7` (`PAGE_WIDTH`, `PAGE_BACKGROUND`) | non | réutilisés | V |
| `render/grid-paint.ts`, `grid-cache.ts` | non | ordre des couches inchangé | V |

### Application et barre (`apps/web/src/app`, `src/ui`, `src/toolbar*.ts`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `app/workspace.ts:205-254` (`addTab`) | non | réutilisé pour l'onglet du PDF | V |
| `app/workspace.ts:256-268` (`createImporter`), `:277` | oui | dépendance `openPdf` (PF2, PF10) ; nouvelle méthode `exportPdf` (PF19) | V |
| `app/workspace.ts:45-73` (`WorkspaceDeps`) | oui | `pdf?: PdfEngine`, `pdfFiles?: TypedFiles`, `exportPdf` | V |
| `app/board-session.ts:135` (cache d'images) | oui | cache des tuiles à côté, `ready → redraw`, `dispose` ; `data-fond` (PF15) | V |
| `app/stage-tags.ts` | non | `data-fond` posé par la session (état du cache, pas du moteur) | V |
| `app/pdf-export.ts` (nouveau) | oui | assemblage (PF20, PF21, DAPF3) | S |
| `app/toolbar-host.ts:22-31`, `:35-62` | oui | `exportPdf`, action `export-pdf` | V |
| `toolbar.ts:98-125` (`ACTION_TABLE`) | oui | « Exporter en PDF… » | V |
| `toolbar-profiles.ts:24-40` (`pagesBar`) | oui | bouton en bas, dans `defaut`, `annotation` (`:64`) et le profil qui reprend `pagesBar()` (`:95`) | V |
| `toolbar-profiles.ts:52-62` (barre du haut) | non | rien n'y est ajouté (PF19) ; C6a y ajoute « Pot » | V |
| `ui/App.tsx:147` | oui | `exportPdf` relié comme `insertPages` | V |
| `main.ts:66-109` | oui | `PDF_TYPE`, chargeur `pdf.js`, chargeur `pdf-lib`, Worker de (c) | V |

### Plateforme (`apps/web/src/platform`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `import.ts:167-174` (registre) | oui | gestionnaire `pdf` (PF2, PF3) | V |
| `import.ts:29-43` (`ImportDeps`) | oui | `openPdf(file: { name; blob }): Promise<boolean>` | V |
| `files.ts:67-68` (`IMPORT_EXTENSIONS`, `IMPORT_FILTER`) | oui | `pdf` (PF3) | V |
| `host-fsa.ts:36-46` (`IMPORT_TYPES`) | oui | `application/pdf` | V |
| `host-repli.ts:37` (`IMPORT_ACCEPT`) | non | dérivé d'`IMPORT_EXTENSIONS` | V |
| `host-tauri.ts:147` (`pick`) | non | lit `IMPORT_FILTER` | V |
| `typed-files.ts:18-23` | oui | `PDF_TYPE` (PF19) | V |
| `pdf-load.ts`, `pdf-render.ts` (nouveaux) | oui | PF11, PF12 | S |
| `sheet-reader.ts:83-110` | oui (c) | la partie « un Worker, une réponse, délai, arrêt » sort dans `one-shot-worker.ts`, réutilisée par (c) | V |
| `container-load.ts:7` | non | réutilisé par le Worker de (c) | V |

### Build et configuration

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/package.json` | oui | `pdfjs-dist`, `pdf-lib` (versions exactes) | V |
| `pnpm-lock.yaml` | oui | idem | V |
| `apps/web/vite.config.ts` | oui | copie `cmaps`, `standard_fonts`, `wasm` de `pdfjs-dist` vers `dist/pdfjs/` (PF11) | V |
| `apps/desktop/src-tauri/tauri.conf.json:13-24` (CSP), `:34-46` (associations) | non | inchangés (PF2, PF24) | V |
| `Cargo.lock` | oui (c) | arbre de `krilla` | V |

### Essais et scripts

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/essais/c12-pdf-navigateur.mjs` (nouveau) | oui | PF25 à PF27 | S |
| `scripts/essais/commun.mjs:71-152` | non | `dropFile`, `stageBox`, `coqueCsp`, `inkIn` réutilisés | V |
| `scripts/verifier.sh:91-105` | oui | essai ajouté au bloc `--e2e` | V |
| `scripts/verifier.sh:61-72` (taille de `formats`) | non | plafond R9 gardé, mesure relevée (c) | V |
| `scripts/tests/verifier-e2e.test.sh:13` | oui | `c12-pdf-navigateur` dans la liste | V |
| `scripts/controle-hors-ligne.mjs:13` | oui | hôtes non chargés, avec raison (PF24) | V |
| `scripts/tests/controle-hors-ligne.test.sh` | non | doit rester vert | V |
| `docs/essais/c12-pdf-annote.png` (nouveau) | oui | capture | S |

### Licences

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `THIRD_PARTY_NOTICES.md` | oui | `pdfjs-dist`, polices, `pdf-lib` et dépendances ; crates de `krilla` (c) | V |
| `scripts/licences-acceptees.json` | oui si besoin | exception éventuelle, avec raison (PF23) | V |
| `scripts/controle-licences.mjs` | non | appelé tel quel | V |

### Tests

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core/src/element.rs:361-390` (`backdrop_tests`) | oui | `page` lu, gardé, invalide → `None` | V |
| `crates/roomboard-core/src/document.rs:1107-1175` (fonds illisibles, `rect`) | non | à garder verts | V |
| `crates/roomboard-core/src/copy.rs:720` | non | recopie du fond, à garder vert | V |
| `crates/roomboard-wasm/src/lib.rs:1921` | non | `set_backdrop` inchangé | V |
| `apps/web/src/platform/import.test.ts` | oui | `pdf` reconnu, ouvert ; chiffré, 500 pages, onglets pleins | V |
| `apps/web/src/engine/render/canvas2d.test.ts` | oui | ordre fond → grille → éléments, placeholder, fond `image` | V |
| `apps/web/src/engine/render/webgl2.test.ts` | non | à garder vert | V |
| `apps/web/src/app/workspace.test.ts` | oui | onglet du PDF, export | V |
| `apps/web/src/app/board-session.test.ts` | oui | cache des tuiles fermé à `dispose`, `data-fond` | V |
| `apps/web/src/app/toolbar-host.test.ts:166-172` | oui | patron du test d'action, `export-pdf` | V |
| `apps/web/src/toolbar.test.ts:168`, `toolbar-profiles.test.ts:38`, `profile-edit.test.ts:84` | oui | listes d'actions | V |
| `apps/web/src/ui/App.test.tsx:99`, `:137-138` | oui | faux espace de travail : `exportPdf` | V |
| `apps/web/src/platform/host-fsa.test.ts`, `host-repli.test.ts`, `host-tauri.test.ts` | oui | filtre d'import | S |
| `apps/web/src/platform/sheet-reader.test.ts` | non (c : oui) | à garder vert après l'extraction du Worker unique | S |
| `apps/web/src/app/pdf-export.test.ts` (nouveau) | oui | `pdf-lib` réel en Node : texte d'origine gardé, rotation, `CropBox`, page sans contenu | S |
| `scripts/essais/*-navigateur.mjs` (12 essais) | non | à garder verts | V |

### Autres dépôts

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `roomboard-prive` | non | rien | S |
| Coffre (`~/SecondBrain`) | non | note de clôture par l'orchestrateur | V |

### Effets de bord sur l'existant

- Le fond de page est désormais dessiné : un document qui porte déjà un fond `image` (fichier d'essai, fragment) le
  montre. Test : `canvas2d.test.ts` (fond `image` sous la grille et les éléments).
- Un `.pdf` déposé ou importé n'est plus refusé (« format pris en charge dans une prochaine version ») : il ouvre un
  onglet. Test : `import.test.ts`.
- La boîte « Importer » montre les PDF. Tests : `host-fsa.test.ts`, `host-repli.test.ts`, `host-tauri.test.ts`.
- La barre des pages gagne un bouton ; une copie utilisateur d'un profil livré, faite avant C12, ne l'a pas (U13 : la
  copie remplace le livré). Tests : `toolbar-profiles.test.ts`, `profile-edit.test.ts`, essai e2e (PF27).
- `NON_FETCHED_HOSTS` s'allonge : un hôte ajouté pour `pdf.js` ne serait plus signalé ailleurs. Test :
  `controle-hors-ligne.test.sh`, et la raison écrite par hôte.
- Le `dist` grossit (morceaux `pdf.js`, `pdf-lib`, `cmaps`, polices) ; le démarrage ne charge rien de plus. Test : PF26.
- Pendant la gomme partielle, une bande blanche passe sur le PDF (PF30). Couvert par aucun test : hypothèse HPF1-6.
- (c) : `sheet-reader.ts` perd sa boucle propre au profit de `one-shot-worker.ts`. Test : `sheet-reader.test.ts` inchangé, vert.

### Chantiers en cours

- `feat/usage-c6a-pot` (OD84, worktrees `usage-c6a-pot` et `--T1` à `--T7`, aucune PR ouverte, `gh pr list` vide) :
  touche `engine/engine.ts` (même ligne `drawScene`), `render/canvas2d.ts` (`drawScene`, `paintEraser`),
  `render/renderer.ts` (`PageView`), `render/webgl2.ts`, `core/api.ts`, `core/fake-core.ts`, `core/wasm-core.ts`,
  `toolbar.ts`, `toolbar-profiles.ts`, `app/toolbar-host.ts`, `ui/Toolbar.tsx`, `profile-edit.ts`. Conflits attendus et
  règle : PF29.
- Aucun worktree d'une autre machine signalé par l'orchestrateur.

### Termes cherchés

Graphe : aucun (absent pour RoomBoard). Recherche texte (`grep -rn`, dans `apps`, `crates`, `scripts`, `docs`) :
`backdrop`, `Backdrop`, `set_backdrop`, `SetBackdrop`, `BackdropInput`, `FIT_WIDTH`, `kind: "image"`, `pdf-page`,
`\.pdf`, `%PDF`, `application/pdf`, `pdfjs`, `pdf-lib`, `krilla`, `ImageSource`, `bitmap(`, `createImageCache`,
`drawScene`, `elementIds`, `paintPlaceholder`, `paintEraser`, `visiblePageRect`, `PAGE_WIDTH`, `PAGE_HEIGHT`,
`createImporter`, `ImportHandler`, `HEAD_BYTES`, `IMPORT_EXTENSIONS`, `IMPORT_FILTER`, `IMPORT_TYPES`, `IMPORT_ACCEPT`,
`openDocument`, `addTab`, `TOO_MANY_TABS`, `UNTITLED`, `TypedFiles`, `RBITEM_TYPE`, `download(`, `createSheetReader`,
`loadFormatsModule`, `container-load`, `wasm-formats`, `page-insert-file`, `pagesBar`, `ACTION_TABLE`, `ACTIONS`,
`dataset[`, `stageTags`, `NON_FETCHED_HOSTS`, `font-family`, `@font-face`, `.woff`, `.ttf`, `TEXT_FONT_FAMILY`,
`fn blank`, `insert_pages`, `cited_assets`, `fn bounds`. Git : `git worktree list`, `gh pr list --state open`,
`git diff --stat origin/main...<branche>` pour chaque branche de C6a. Registres : `npm view pdfjs-dist|pdf-lib`,
`cargo search krilla|lopdf`, `cargo info krilla@0.8.2|hayro-write@0.7.0`. Coffre : « roomboard pdf import pdf.js
annotation export », « roomboard backdrop fond de page rendu », « pdf.js worker csp hors ligne », « roomboard piège
essais playwright », « ActCraft pdfimport chiffré ».

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| Entrée unique des fichiers | `apps/web/src/platform/import.ts:167` (`createImporter`), `:64-74` (`ImportHandler`) | nouveau `pdfHandler(deps): ImportHandler` (`id: "pdf"`, `nature: "document"`) ajouté au registre ; `ImportDeps.openPdf` | étendre |
| Ouvrir un onglet avec un document et son magasin | `apps/web/src/app/workspace.ts:205` (`addTab`) | `addTab(doc, { name, target: null }, assets)` | réutiliser |
| Octets du PDF dans l'onglet | `apps/web/src/core/asset-store.ts` (`put`) | `assets.put(blob)` | réutiliser |
| Document à pages de fond, sans étape d'annulation | `crates/roomboard-core/src/document.rs:121` (`blank`, `bare`, `assemble`) | `Document::from_pdf_pages(asset, sizes)` (PF6) | étendre |
| Lecture du fond | `crates/roomboard-core/src/element.rs:312` (`read_backdrop`), `:333` (`backdrop_view`) | champ `page` | étendre |
| Rectangle du fond | `element.rs:333` (`BackdropView.rect`, DAK4) | lu tel quel par le rendu et l'export | réutiliser |
| Dessin asynchrone sans attente dans la scène | `apps/web/src/engine/render/image-cache.ts:20` (`createImageCache`) | même forme (`ready`, `dispose`) ; fond `image` par `ImageSource.bitmap` | réutiliser (fond `image`) ; **nouveau module** `pdf-tiles.ts` pour le PDF : la clé (palier, tuile), l'éviction et l'annulation n'existent pas dans `image-cache` (une clé = un asset, aucun palier) ; termes : `palier`, `tile`, `tuile`, `LRU`, `evict` (rien) ; interface en DAPF2 |
| Dessin d'un élément | `apps/web/src/engine/render/canvas2d.ts:221` (`paintElement`), `:69` (`paintPlaceholder`) | appelés par `drawScene` et par la nouvelle `paintContent` | réutiliser ; `Canvas2DRenderer` étendu de `paintContent(ctx, page, opts)` |
| Contour d'un trait, formes, texte, tableaux pour l'export | `canvas2d.ts` (même code que l'écran) | `paintContent` dans un vrai contexte (b) ou un `RecordingContext2D` (c) | réutiliser (aucune seconde implémentation du dessin, ni en TS ni en Rust) |
| Charger un module lourd au premier besoin | `apps/web/src/platform/container-load.ts:7` (`loadFormatsModule`) | même forme : `loadPdfjs()`, `loadPdfLib()` importés par l'amorce seule | réutiliser (patron) ; **nouveau module** `pdf-load.ts` : chargeur propre à `pdf.js` (options, Worker, URL locales) ; termes : `pdfjs`, `GlobalWorkerOptions` (rien) |
| Rendu `pdf.js` d'une tuile | aucun | `PdfEngine` (PF12) | **nouveau module** `pdf-render.ts` ; termes : `pdfjs`, `getDocument`, `page.render` (rien) ; interface en DAPF1 |
| Écrire le PDF exporté | `apps/web/src/platform/typed-files.ts:33` (`createWebTypedFiles`), `:47` (`createTauriTypedFiles`) | `PDF_TYPE`, `save(name, bytes)` | réutiliser |
| Assembler le PDF exporté | aucun | `exportPdf` (DAPF3) | **nouveau module** `app/pdf-export.ts` ; termes : `pdf-lib`, `embedPage`, `copyPages`, `export` (seul `exportSelection` de `.rbitem`) ; interface en DAPF3 |
| Worker jetable du module `formats` | `apps/web/src/platform/sheet-reader.ts:83` (`createSheetReader`), `sheet-worker.ts` | boucle « un Worker, une réponse, délai, arrêt » sortie en `runOnce<T>(spawn, message, transfer, timeoutMs, check: (d: unknown) => T): Promise<T>` dans `platform/one-shot-worker.ts`, appelée par les deux | étendre (c) |
| Écrivain PDF vectoriel | aucun (`roomboard-formats` : `container`, `sheet`) | `pdf::write_pages` (PF22) | **nouveau module** `roomboard-formats/src/pdf.rs` ; termes : `krilla`, `pdf`, `write_pdf` (rien) ; interface en DAPF4 |
| Nom de fichier sans chemin | `apps/web/src/platform/host-tauri.ts` (`baseName`) | `baseName(name)` | réutiliser |
| Type d'un `Blob` | `apps/web/src/app/container-io.ts:47` (`typed`) | `typed(blob, mime)` | réutiliser |
| Largeur de page dans le moteur | `apps/web/src/engine/page.ts:4` (`PAGE_WIDTH`) | constante | réutiliser |
| Action de barre | `toolbar.ts:98` (`ACTION_TABLE`), `app/toolbar-host.ts:35` (`ACTIONS`), `toolbar-profiles.ts:24` (`pagesBar`) | entrée `export-pdf` | étendre |
| Essai navigateur | `scripts/essais/commun.mjs:136` (`dropFile`), `:94` (`stageBox`), `:152` (`coqueCsp`), `:71` (`inkIn`), `:25` (`loadPlaywright`), `:37` (`serve`) | appelés tels quels | réutiliser |
| Contrôle des licences | `scripts/controle-licences.mjs`, `scripts/licences-acceptees.json` | appel ; exception écrite si besoin | réutiliser |

## 4. Hypothèses à revoir

**Niveau 1 — difficiles à défaire ou visibles des utilisateurs.**
- **HPF1-1** Forme `backdrop.page` en indice à partir de 0 et `w`, `h` en points après rotation (PF5) : écrite dans les
  fichiers dès le premier PDF importé.
- **HPF1-2** Plus de 500 pages : les 500 premières importées avec un avis, plutôt qu'un refus (PF7). « 500 pages par
  import » peut aussi se lire comme un refus.
- **HPF1-3** Un seul bouton « Exporter en PDF… » dans la barre des pages, en bas (PF19) ; pas de choix « PDF annoté » /
  « pages RoomBoard » : l'export unique fait les deux. Un profil copié avant C12 ne montre pas le bouton.
- **HPF1-4** Contenu dessiné sous le bas d'une page PDF (page infinie) : coupé à l'export annoté, avec un avis (PF20),
  plutôt qu'ajouté en page de plus.
- **HPF1-5** (c) Texte de l'export vectoriel en Liberation Sans, alors que l'écran dessine en `system-ui` : les lignes
  gardent leur position, la chasse peut différer (PF22).
- **HPF1-6** Bande blanche sur le PDF pendant la gomme partielle (PF30), jusqu'au relâché.
- **HPF1-7** (b) seul livré : l'annotation superposée aux pages d'origine est une image (2 px par unité au plus, côté
  de 4096 px au plus), nette à l'impression mais pas au zoom fort d'un lecteur PDF ; (c) la rend vectorielle.

**Niveau 2.**
- **HPF2-1** Détection du chiffrement par `EncryptFilterName` du dictionnaire d'infos de `pdf.js` (PF8) : nom lu de
  mémoire, à vérifier sur la version installée ; repli : charger l'en-tête par `pdf-lib` (`EncryptedPDFError`).
- **HPF2-2** Bornes du cache : tuiles de 1024 px, palier dans [1/4, 8], 32 tuiles, 2 rendus en cours (PF13).
- **HPF2-3** Pages sans fond PDF exportées à 842 pt de large ; grille exportée (PF20).
- **HPF2-4** `NON_FETCHED_HOSTS` global plutôt que par fichier (PF24).
- **HPF2-5** Build `legacy` de `pdf.js` (PF31) : plus lourd, choisi pour WebKit sans essai préalable.
- **HPF2-6** `pdf-lib` dans la page, sans Worker : un PDF de 100 Mo peut figer l'interface quelques secondes à l'export.
- **HPF2-7** `pdf-lib` 1.17.1 n'a plus de version depuis 2021 ; il reste sous MIT et sans dépendance réseau.
- **HPF2-8** `krilla` avec `raster-images` tient sous le plafond de 3 Mio du module `formats` ; sinon les images passent
  en RGBA décodées par la page (mesure en tête du lot (c)).
- **HPF2-9** Piège du coffre : dans un worktree de tâche dont `node_modules` serait un lien hors racine, Vite refuse
  `pdf.worker…?url` ; les worktrees de RoomBoard installent leur propre `node_modules` (profil), rien à faire sinon
  rejouer dans le worktree du chantier.
- **HPF2-10** Le PDF n'est pas rouvert à partir de l'objet `pdf.js` de l'import : l'onglet le relit au premier dessin
  (double analyse, rapide car paresseuse).

## 5. Décisions d'architecture

**DAPF1 — `pdf.js` dans la page, derrière un port.**
Contexte : le moteur ne doit jamais porter un PDF (DAU5) ; `pdf.js` est lourd et ne doit pas charger au démarrage.
Décision : `platform/pdf-load.ts` (`loadPdfjs(): Promise<PdfjsModule>`, import dynamique, options locales) et
`platform/pdf-render.ts` (`createPdfEngine(load): PdfEngine`, PF12), injectés par `main.ts` dans l'espace de travail.
Conséquences : tests sur faux ; PDFium (U34) pourrait remplacer l'implémentation sans toucher au moteur.

**DAPF2 — Cache de tuiles par palier, peint sans attente.**
Contexte : net à 400 % sans bitmap géant (S14, U26), rendu asynchrone pour le fond seulement (DAU6).
Décision : `engine/render/pdf-tiles.ts` : `createPdfTiles(open: (asset) => Promise<PdfFile> | null, ready: () => void):
PdfTiles` ; `PdfTiles.paint(ctx, backdrop: BackdropView, camera, view: { w; h; dpr }): "attente" | "pret" | "echec"` ; `dispose()`.
Conséquences : `drawScene` reste synchrone ; l'état rendu alimente `data-fond` ; même forme qu'`image-cache`.

**DAPF3 — Un seul export, un producteur de superposition interchangeable.**
Contexte : PDF annoté fidèle (U34) et pages RoomBoard en PDF, (c) pouvant manquer.
Décision : `app/pdf-export.ts` : `exportPdf(doc, assets, deps: { loadPdfLib; overlay: OverlayProducer; pageView }):
Promise<{ bytes: Uint8Array; pages: number; cut: boolean }>` ; `OverlayProducer.page(pageId, box: { w; h }) →
{ kind: "png"; bytes } | { kind: "pdf"; bytes; index } | null` (null : page sans contenu).
Conséquences : (b) fournit le producteur PNG, (c) le producteur `krilla` ; l'assemblage `pdf-lib` ne change pas.

**DAPF4 — Vecteur par enregistrement du rendu, `krilla` dans le module `formats`.**
Contexte : une seule implémentation du dessin (D7) ; texte mis en page par la page, pas par Rust.
Décision : `RecordingContext2D` reçoit `paintContent` ; `DisplayList` (JSON) → Worker jetable → `write_pdf_pages` ;
Rust `pdf::write_pages(list, fonts, images) -> Result<Vec<u8>, PdfWriteError>`, testé en natif.
Conséquences : tout ce que l'écran dessine s'exporte ; une méthode Canvas 2D non enregistrée lève en test, pas en silence.

**DAPF5 — Document du PDF construit hors historique.**
Contexte : Q1 ouvre un onglet neuf ; Ctrl+Z ne doit pas défaire l'import.
Décision : `Document::from_pdf_pages` (PF6), comme `blank()` (D37), plutôt que N `AddPage` et N `SetBackdrop`.
Conséquences : une seule traversée Wasm ; l'onglet naît non modifié ; `SetBackdrop` garde son contrat.

## 6. Scénarios d'acceptation

- **S1 (essai `--e2e`, PF25)** Ouvrir RoomBoard (aucun morceau `pdf.js` chargé), déposer `essai-3-pages.pdf` généré par
  l'essai : un nouvel onglet, « 1/3 », le texte de la page visible ; aller en page 2, tracer un trait ; « Exporter en
  PDF… » : `essai-3-pages annoté.pdf` téléchargé ; relu : 3 pages, « RoomBoard page 2 » toujours en texte, une image
  superposée en page 2 seulement ; le redéposer : 3 pages ; Enregistrer, redéposer le `.roomboard` : 3 pages, fond
  prêt, le trait en page 2 ; la scène fait 640 px au moins.
- **S2** Déposer un PDF protégé par mot de passe : avis « PDF chiffré », aucun onglet ; déposer un PDF de 501 pages
  (généré en test) : un onglet de 500 pages et l'avis ; sur le web, un PDF de 120 Mo : refusé avant lecture. Tests
  `import.test.ts`, `workspace.test.ts`.
- **S3** Ouvrir `tracemonkey.pdf` (`~/telechargements-roomboard/pdf/`, hors dépôt, essai manuel) : la page 1 s'affiche
  d'abord en gris, puis nette ; zoomer à 400 % : le texte reste net après un court flou ; Ctrl+Z ne retire aucune page.
  Tests `pdf-tiles.test.ts` (palier, tuiles visibles, éviction, annulation).
- **S4** Ouvrir un `.roomboard` d'avant C12 : identique ; dans un autre onglet, « Insérer des pages… » du `.roomboard`
  de S1 : ses 3 pages avec leur fond PDF, un seul asset ; enregistrer deux fois : mêmes octets.
- **S5 (lot c)** Dans un document sans PDF, écrire un texte, tracer une forme et un trait, Exporter en PDF : le texte se
  sélectionne dans un lecteur PDF, trait et forme restent nets à 800 % ; reprendre S1 : la superposition de la page 2
  est vectorielle (aucune image) ; `verifier.sh` relève la taille du module `formats` ≤ 3 Mio, le module principal
  inchangé.

## 7. Hors périmètre

- Sélection et copie du texte d'un PDF dans RoomBoard ; édition du texte d'origine (U1) ; formulaires PDF à remplir.
- Mot de passe demandé pour ouvrir un PDF chiffré.
- Association `.pdf` de la coque ; « Ouvrir » filtré sur `.pdf`.
- Correction de l'aperçu de la gomme partielle sur un fond (PF30), Canvas 2D comme WebGL2.
- Vignettes de pages, export d'une seule page, boîte d'options d'export.
- PDFium (U34 : seulement sur mesure) ; mesure mémoire sur iPad (HU1-10) ; essais WebKit et coques Windows, macOS.
- Word, Excel, PowerPoint convertis (C16), zone de dépôt de l'annotation (C11), capture en fond (C11b).
- Toute modification de la branche `feat/usage-c6a-pot` (OD84).

## 8. Portes immédiates

Aucune.
