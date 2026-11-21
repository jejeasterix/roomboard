# Cadrage — usage-c13-lot1-svg-iwb-ubz (C13, lot 1 : lecteur SVG commun, `.iwb`, `.ubz`)

Date : 2026-11-21. Mode autonome (OE24), aucune question à Jérôme. Branche rebasée sur `origin/main` @ 41342b0
(PR #28 comprise) ; module `formats` toujours 3 100 845 o. Amendé après la contre-relecture, tour 1 (constats CR1 à CR15).

## 1. Demande et gabarit

Un `.iwb` (IWB/CFF, en ZIP ou en SVG brut) et un `.ubz` (OpenBoard) déposés ou ouverts deviennent un document RoomBoard
(nouvel onglet) avec sa liste d'avertissements (niveau A, U2), par un lecteur SVG commun ; « Enregistrer une copie au
format » écrit `.iwb` et `.ubz` (niveau E).
Gabarit : **chantier** (40 questions au plus ; 25 consommées, D1 à D24 et D8b).

Sources citées, appliquées telles quelles : `docs/plans/usage-cadrage.md` ligne C13 (:560), U1 (:54), U2 (:55), U23 (:76),
U25 (:78, amendée par Q1 :619), U26 (:79), U36 (:89), U39 (:92), § 10 (:575-608), DAU1 (:328) ; étude
`docs/etudes/usage-formats-tableaux.md` § 7, § 8, § 11 ; coffre `02_Decisions/0260` et `0263` (ZIP lus en TypeScript,
fflate, module `formats` intact) ; exemples hors dépôt `~/telechargements-roomboard/INVENTAIRE.md` (lecture seule).

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| D1 | Où vit le lecteur SVG/XML | Rust, `crates/roomboard-formats/src/board.rs` (nouveau), `quick-xml` 0.42 (MIT, déjà dans `Cargo.lock` par `calamine`), exposé par `roomboard-formats-wasm` ; tient grâce au réglage D2. Tailles mesurées : DA1. | U23, U36, DAU1 ; mesure DA1 | oui |
| D2 | Réglage de taille du module `formats` | `[profile.release.package.<crate>] opt-level = "z"` pour les 22 crates tierces propres à `formats` : `krilla pdf-writer skrifa read-fonts write-fonts font-types subsetter rustybuzz ttf-parser calamine encoding_rs quick-xml zune-jpeg png gif image-webp zopfli tiny-skia-path kurbo fdeflate miniz_oxide xmp-writer`. `roomboard-core`, `roomboard-formats` (pixels), `sha2`, `zip`, `yrs` restent en `s`. Module principal inchangé à l'octet (mesuré). Plafonds inchangés. | brief (« un réglage qui réduit le module ») ; `docs/essais/taille-wasm.md:37` (z écarté pour le cœur seulement, faute de mesure de vitesse) ; mesure DA1 | oui (un bloc de `Cargo.toml`) |
| D3 | Lecture du ZIP | En TypeScript par le Worker ZIP existant (`zip-worker.ts`, fflate) : nouveau mode `board`, filtre `keepBoardPath` (refuse absolu, `..`, `__MACOSX`, dossier ; **ne garde que** `content.xml`, `page<N>.svg` et les extensions d'image de D12 : vidéos, sons, Flash jamais décompressés, seulement comptés pour l'avertissement). Bornes réutilisées : 1 000 entrées, 256 Mio décompressés, entrée stockée incohérente refusée. Les images restent des `Blob` (vers `AssetStore` sans copie par le Wasm) ; seules les entrées XML vont au module `formats`. **Écart à U23** (qui place la lecture des ZIP de tableaux en Rust) : le ZIP est lu en TS parce que le Worker borné existe déjà et que chaque Ko du module `formats` compte (DA1) ; le XML, lui, est lu en Rust comme U23 le veut (CR8). | 0260, 0263 ; `zip-worker.ts:38-71` ; `model3d-import.ts:29-43` ; U23 | oui |
| D4 | Détection (U23) | Deux gestionnaires `nature: "document"` du registre `importFiles` : `iwb` = en-tête ZIP + nom `.iwb`, **ou** en-tête XML (`<?xml` ou `<iwb`, BOM toléré) + nom `.iwb` ; `ubz` = en-tête ZIP + nom `.ubz`. Placés après `pdf`, avant `media`. Plafond `limit` : `ZIP_MAX_BYTES` avec un message propre, `BOARD_TOO_BIG_MESSAGE` = « fichier de tableau trop gros (plus de 256 Mio) », pour le ZIP comme pour le XML brut (CR7). | U23 ; `import.ts:283-298` ; inventaire (40 des 50 fichiers de la suite en SVG brut) | oui |
| D5 | Ce que fait le dépôt | Ouvre toujours un nouvel onglet (jamais d'insertion), comme `openPdf` ; nom d'onglet `<nom>.roomboard`, `target: null` (aucune réécriture de l'original). | Q1 (`usage-cadrage.md:619`), U1 ; `workspace.ts:396-430` | oui |
| D6 | Forme d'échange Rust ↔ page | Flux plat « BoardList » (`ops: Float32Array`, `texts: string[]`), même patron que `DisplayList` du PDF (C12), dans les deux sens (lecture et écriture). Un flux témoin joué par `cargo test` et par vitest garde la parité du codage. Aucune `serde` ajoutée. | `pdf.rs:22` ; PF22 (`usage-c12-pdf-cadrage.md:66`) | oui |
| D7 | Construction du document | La page applique des `Command` existantes (`AddPage`, `AddShape`, `CommitStroke`, `SetText` avec `spans`, `AddImage`, `Transform`, `Group`, `Fill` cible `background`) sur un document jetable, puis `saveParts` → `loadParts` : le document ouvert n'a aucune étape d'annulation. Aucune commande de cœur neuve. | DAU1 (« descriptions […] que la page passe au cœur par des commandes ») ; `workspace.ts:451-452` (même copie à l'export PDF) ; `api.ts:51-186` | oui |
| D8 | Coordonnées | Échelle `1920 / largeur du viewBox` (page RoomBoard de 1 920 de large, hauteur infinie), décalage `-x, -y` du viewBox ; `viewbox` en minuscules accepté (vu dans les fichiers réels). Sans `viewBox` : `0 0 width height` de la racine `svg` ; sans les deux : `0 0 1920 1080`. Largeur ou hauteur du viewBox ≤ 0 ou non finie → refus du fichier « fichier endommagé : cadre de page invalide » (CR4). | `element.rs:15` ; `api.ts:437` ; suite `viewbox_*` | oui |
| D8b | Valeurs que le cœur refuserait | Avant chaque commande, la page contrôle ce que le cœur refuse : points vides, impairs ou non finis (`BadPoints`, `commands.rs:1225`), coins non finis (`BadShape`, `:870`), épaisseur ≤ 0 ou non finie (`BadWidth`, `:880`) ; l'objet est sauté, compté dans un avertissement « page N : K objets illisibles ignorés » ; une commande refusée malgré tout est traitée de même, jamais comme un échec du fichier (CR4). | `commands.rs:870-881`, `:1224-1230` | oui |
| D9 | Formes | `rect` → `rect` ; `ellipse`, `circle` → `ellipse` ; `line` → `line`, `arrow` si `iwb:element stroke-lineshape-end` ; `stroke="none"`, `stroke-width="0"` ou `stroke-opacity="0"` → contour à la couleur du remplissage, épaisseur 1 ; `rx`/`ry` → avertissement « coins arrondis non lus ». | `api.ts:25` ; `commands.rs:880` (épaisseur > 0) | oui |
| D10 | Polylignes et polygones | `polyline` → trait (`CommitStroke`, pression 1) ; `polygon` → trait fermé, remplissage non lu (avertissement). L'élément `fill` n'est pas utilisé (interdit du brief). | brief ; `api.ts:282` | oui (HU1-3) |
| D11 | Texte | `text`, `textarea`, `tspan`, `tbreak` → `SetText` avec `spans` (gras, italique, souligné, couleur, taille, police) ; `text-align` autre que `start` → avertissement ; texte OpenBoard (`foreignObject ub:type="text"`, `itemTextContent` HTML de Qt échappé) → texte brut, `<p>`/`<br>` en sauts de ligne, couleur et taille de la première police ; mise en forme fine → avertissement. Ce HTML intérieur n'est **pas** relu par `quick-xml` (il commence par `<!DOCTYPE HTML PUBLIC …>` et contient `&nbsp;`) : petit lecteur tolérant écrit dans `board.rs`, DOCTYPE muet, `&nbsp;`, `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;` et références numériques lus, autre entité gardée telle quelle, fins de balise non contrôlées, aucune résolution externe (CR3). | `api.ts:477-494` ; OpenBoard `UBSvgSubsetAdaptor.cpp:2801-2830` (lu, non copié, U39) | oui |
| D12 | Images | Entrée locale PNG, JPEG, GIF, WebP, BMP, SVG → asset (`AssetStore.put`), taille source par le décodeur existant, `AddImage` avec la matrice ; EMF, WMF, autre → avertissement ; adresse `http(s):`, `data:` absente, `file:` ou chemin hors archive → avertissement, jamais chargée. | U26 ; `image-import.ts` ; brief (hors ligne) | oui |
| D13 | Groupes | `svg:g` et `iwb:group` → `Group` (deux unités au moins, sinon rien) ; groupes imbriqués gardés. | C3 (`api.ts:180`) | oui |
| D14 | Fond de page | `iwb:element background="true"` sur un `rect` qui couvre la page, ou premier `rect` plein d'une page `.ubz` → `Fill` `background` ; autre objet de fond → objet gardé + avertissement. | `api.ts:45` | oui |
| D15 | Ce qui n'est pas lu (U2) | Avertissement **par sorte**, avec le nombre et le numéro de page (« page 3 : 2 vidéos non lues ») : vidéo, son, Flash, widgets, liens (`svg:a` : contenu lu, lien perdu), `locked`, `revealer`, `container`, `replicate`, outils OpenBoard (`ub:ruler`, `compass`, `curtain`, `axes`), métadonnées. Liste montrée dans l'avis d'ouverture (même canal `say` que le PDF). | U2 ; `workspace.ts:418` | oui |
| D16 | Sécurité XML | Aucune DTD ni entité externe : `quick-xml` ne résout rien ; un `DOCTYPE` est ignoré (avertissement), une entité non prédéfinie reste hors du texte (avertissement). Un attribut illisible (`normalized_value` rend `Err`, par exemple `UnrecognizedEntity`) fait sauter **son objet** avec un avertissement, jamais le fichier (CR3). Aucun script : `<script>`, `on*`, `foreignObject` HTML ne sont jamais rendus ni exécutés (le SVG n'est jamais donné au navigateur, seules les commandes du cœur). XML mal formé → refus « fichier endommagé » ; exemple : `rectangle2.iwb` de la suite, refusé parce que `<svg:page>` y est fermé par `</svg:pageset>` (CR5). Bornes : 100 Mo par fichier web (`WEB_MAX_BYTES`), bornes ZIP de D3, 100 000 objets par fichier (au-delà : refus) ; pages : **comme le PDF**, les 500 premières sont ouvertes et un avis le dit (même forme que `pdfFirstPagesMessage`, `workspace.ts:49`) (CR6). | U26 ; brief ; inventaire ; `workspace.ts:49` | oui |
| D17 | Export : déclencheur | Deux actions de barre, à côté de `export-pdf` : `export-iwb` « Enregistrer une copie au format .iwb… » et `export-ubz` « Enregistrer une copie au format .ubz… » ; ports `TypedFiles` neufs `IWB_TYPE`, `UBZ_TYPE`. Aucune action « Enregistrer une copie » n'existait (prémisse du brief démentie). | U1 ; `toolbar-profiles.ts:37`, `toolbar.ts:108`, `toolbar-host.ts:51`, `typed-files.ts` | oui |
| D18 | Export : contenu | La page encode l'onglet en BoardList (traits en polylignes avec épaisseur, formes, textes avec segments, images, groupes, fond) ; Rust écrit le XML (`content.xml` IWB, ou `page001.svg`… et `metadata.rdf` OpenBoard) ; le Worker ZIP l'emballe (stocké, date fixe, `zipStored`) avec `images/<empreinte>.<ext>`. Non exportés (tableau, média, 3D, `fill`, fond PDF, `unknown`) → avertissement à l'export. Cadre d'une page (hauteur infinie) : `viewBox="0 0 1920 H"`, `H = max(1080, bas du contenu)` ; un objet en x < 0 ou y < 0 est écrit à sa place (coordonnées négatives, il peut sortir du cadre chez le lecteur d'en face) et compté dans un avertissement « K objets hors du cadre » (CR9). | U1, U2 ; `zip-worker.ts:31` | oui |
| D19 | Export : espaces de noms | IWB : racine `<iwb version="1.0">`, espace `http://www.imsglobal.org/xsd/iwb_v1p0` (norme finale) ; lecture par nom local (Becta et 1EdTech acceptés). OpenBoard : `http://uniboard.mnemis.com/document`, `ub:version` 4.8.0. Chaînes écrites dans le `.wasm`, hors du contrôle hors ligne (qui exclut le `.wasm`). | étude § 7, § 8 ; `controle-hors-ligne.mjs:3` | oui |
| D20 | Niveau R du `.ubz` | Non livré au lot 1 : la copie `.ubz` vaut E (les objets non lus à l'import ne reviennent pas). R (garder les entrées inconnues de l'original) reste à faire, après un `.ubz` réel. | U36 (`.ubz` A + E + R) ; brief (« si le cadrage le demande ») ; inventaire (`ubz/` vide) | oui (HU1-1) |
| D21 | Licence 1EdTech | Lue (§ 3 de la licence) : mise en œuvre et distribution « royalty-free » ; le nom de la norme dans un produit et la conformité sont réservés aux membres. Donc : interface sans « IWB/CFF » ni « conforme » (seulement l'extension `.iwb`), mention d'attribution dans `THIRD_PARTY_NOTICES.md`. | https://www.1edtech.org/standards/specification-license § 2c, § 3 ; https://www.1edtech.org/about/legal/trademarks ; U36 (« à lire avant d'écrire l'export ») | oui (HU1-2) |
| D22 | Licences (U39) | Aucune crate neuve (`quick-xml` déjà relevée par `scripts/licences-acceptees.json`) ; OpenBoard (GPL) lu pour comprendre, jamais copié. | U39 | oui |
| D23 | Fichiers de test | Fabriqués dans les tests (chaînes et ZIP générés) ; exemples réels jamais copiés ; mesure de fidélité sur `~/telechargements-roomboard/iwb/` consignée dans le fichier d'état (tableau par fichier). | U36 (Q6), brief | oui |
| D24 | Constats à ne pas aggraver | `zip-read.ts:39` (mode positionnel, copies Blob → octets) : le mode `board` rend des `Blob` pour les images et des octets seulement pour le XML ; `typed` (défini `app/container-io.ts:67`, recopié selon le constat `workspace.ts:151`) : importer celui de `container-io.ts` (CR11) ; `api.ts:145` (largeur de page en double) : lire `PAGE_WIDTH` de `core/api.ts` seul. | `docs/architecture-constats.md:12,8,26` ; `container-io.ts:67` | oui |

## 3. Carte d'impact

Rubriques déduites du graphe et de la recherche (aucune ligne « Surfaces d'impact » dans `.claude/chantier.md`).

**Cœur Rust et Wasm**

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-formats/src/board.rs` (nouveau) | oui | lecteur et écrivain SVG/IWB/OpenBoard, flux BoardList | V (prototype mesuré) |
| `crates/roomboard-formats/src/lib.rs:1-8` | oui | `pub mod board` | V |
| `crates/roomboard-formats/Cargo.toml` | oui | `quick-xml = { version = "0.42", default-features = false }` | V |
| `crates/roomboard-formats-wasm/src/lib.rs` | oui | `BoardReader`, `write_board_xml` (patron `ContainerReader`, `write_pdf_pages`) | V |
| `Cargo.toml` (racine, `[profile.release]`) | oui | 22 blocs `opt-level = "z"` (D2) | V |
| `crates/roomboard-core/**` | non | aucune commande neuve (D7) ; `zone.rs`, `fill*` interdits | V |
| `crates/roomboard-wasm/**` | non | module principal inchangé à l'octet | V |
| `crates/roomboard-formats/src/pdf.rs`, `sheet.rs`, `pixels.rs`, `container.rs` | non | tests à garder verts ; le réglage `z` ne vaut qu'en release, donc pour les seuls essais e2e et le module servi (vitesse : HU1-4) | V |

**Interface (apps/web)**

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/platform/import.ts:283-298` (`createImporter`), `:56-63` (`ImportDeps`) | oui | gestionnaires `iwb`, `ubz` ; dépendance `openBoard?` | V |
| `apps/web/src/platform/zip-worker.ts:82-110`, `zip-read.ts:43-52` | oui | mode `board`, `keepBoardPath` ; médias en `Blob` | V |
| `apps/web/src/platform/board-worker.ts` (nouveau, patron `sheet-worker.ts`) | oui | instance jetable de `formats`, lecture et écriture XML | S |
| `apps/web/src/platform/board-reader.ts` (nouveau, patron `sheet-reader.ts`) | oui | `runOnce`, réponses contrôlées | S |
| `apps/web/src/platform/container.ts` (`hasSheetReader`) | oui | `hasBoardReader` | V |
| `apps/web/src/app/board-io.ts` (nouveau) | oui | BoardList ↔ commandes / onglet (DA2) | S |
| `apps/web/src/app/workspace.ts:396-483` | oui | `openBoard`, `exportBoard` (patron `openPdf`, `exportPdf`) | V |
| `apps/web/src/platform/typed-files.ts:10-40`, `platform/files.ts` (extensions, MIME) | oui | `IWB_TYPE`, `UBZ_TYPE` | V |
| `apps/web/src/toolbar.ts:108`, `toolbar-profiles.ts:37`, `app/toolbar-host.ts:51` | oui | actions `export-iwb`, `export-ubz` | V |
| `apps/web/src/main.ts:145-178` | oui | `spawnBoardWorker`, ports | V |
| `apps/web/src/platform/drop-web.ts`, `host-tauri.ts` | non | passent déjà par `importFiles` | V |
| `apps/web/src/app/zone-marks.ts`, marques `data-zone-*` | non | interdit du brief | V |

**Persistance et formats de fichiers**

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `.roomboard` (`format/mod.rs`) | non | le document importé s'enregistre comme tout document ; un fichier d'avant C13 s'ouvre inchangé (S4, fixture `socle-v1.roomboard`) | V |
| `.iwb`, `.ubz` (nouveaux en écriture) | oui | E (D18) | S |

**Scripts, contrôles, documents**

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/verifier.sh:51-75` (tailles), `:95-120` (`--e2e`) | oui | ajout de `c13-tableaux-navigateur.mjs` ; plafonds inchangés | V |
| `scripts/essais/c13-tableaux-navigateur.mjs` (nouveau, patron `c4-bibliotheque-navigateur.mjs:122`) | oui | geste du brief, scène ≥ 640 px | V |
| `scripts/controle-hors-ligne.mjs:13-21` | non | aucune chaîne d'hôte neuve dans le JS (D19) ; à garder vert | V |
| `scripts/controle-licences.mjs`, `scripts/licences-acceptees.json` | non | aucune crate neuve | V |
| `THIRD_PARTY_NOTICES.md` | oui | attribution 1EdTech (D21) | S |
| `docs/essais/taille-wasm.md` | oui | tailles avant et après C13, réglage D2 | V |
| `docs/essais/c13-iwb-lecon.png` (nouveau) | oui | capture d'une leçon `.iwb` importée | S |
| `scripts/essais/c8-pot-zones-navigateur.mjs`, `docs/audits/` | non | interdits du brief | V |
| `apps/desktop/**` (Tauri) | non | aucun build Tauri | V |

**Tests**

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-formats/src/board.rs` (tests) | oui | lecture, écriture, aller-retour, sécurité (D16) | S |
| `apps/web/src/app/board-io.test.ts`, `platform/import.test.ts`, `zip-worker.test.ts` | oui | détection, construction, export, parité du flux témoin | V |
| `apps/web/src/core/wasm-core.contract.test.ts` | non | à garder vert (aucune commande neuve) | V |
| `crates/roomboard-formats/src/pdf.rs`, `sheet.rs` (tests) | non | à garder verts (`cargo test` compile en dev : le réglage `z` n'y joue pas) | V |
| `scripts/essais/c12-pdf-navigateur.mjs`, `c10b-tableau-navigateur.mjs`, `c4-bibliotheque-navigateur.mjs` | non | à garder verts (export PDF, `.xlsx`, ZIP) | V |

**Effets de bord sur l'existant**

- Export PDF, lecture `.xlsx` et décodage d'images de `krilla` compilés en `z` : environ 7 % plus lents en natif (mesure
  DA1). Couvert par `c12-pdf-navigateur.mjs`, `c10b-tableau-navigateur.mjs` et une mesure avant/après dans le plan.
- Worker ZIP : un mode de plus ; les modes `model3d` et `pack` inchangés. Couvert par `zip-worker.test.ts` existant.
- Registre `importFiles` : un `.iwb` ou `.ubz` aujourd'hui refusé (« prochaine version ») s'ouvre. Couvert par
  `import.test.ts` (test du refus actuel à réécrire).
- Barre : deux actions de plus dans le groupe `pages` du profil livré. Couvert par `toolbar-profiles.test.ts`.

**Chantiers en cours**

- `git worktree list` : seul ce worktree ; `gh pr list` : aucune PR ouverte.
- `main` local et `origin/main` à 41342b0 (PR #28 `fix/restes-od94-porte-s6`, fusionnée après la base) : touche
  `crates/roomboard-core/src/document.rs`, `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/{api,fake-core,wasm-core}.ts`,
  `engine/engine.ts`, `app/zone-marks.ts`, `docs/architecture-constats.md`, `docs/essais/taille-wasm.md`. Recouvre C13 sur
  `api.ts` et `taille-wasm.md` : rebaser avant la PR ; module principal après PR #28 : 1 371 293 o (état de PR #28).
- Ouvrier voisin OE23 (`zone.rs`, `fill`, `c8-pot-zones-navigateur.mjs`, `data-zone-*`, `docs/audits/`) : aucune zone commune.

**Termes cherchés**

- Texte : `Importer\b|registerImporter|importFiles`, `copie au format|saveCopyAs|exportAs|Enregistrer une copie`,
  `copie\b|Exporter|export-pdf|exportPdf`, `openPdf`, `from_pdf_pages|fromPdfPages|fn blank`, `PAGE_WIDTH|PAGE_HEIGHT`,
  `CommitStroke`, `BadWidth`, `keepZipPath|normalizePath|ZIP_MAX_`, `pdfFiles|TypedFiles`, `quick-xml|roxmltree|xmlparser`,
  `wasm|formats` dans `verifier.sh`, `ouvert|import|format|zip|export|worker|svg` dans `docs/architecture-constats.md`.
- Coffre : `chercher.js "RoomBoard IWB ubz formats tableaux SVG lecteur" 8`, `"RoomBoard taille module Wasm formats plafond opt-level" 6`,
  `"piège Worker fflate ZIP chemin CSP blob RoomBoard" 6` (aucun piège).
- Exemples : `unzip -l`, `head`, décompte des balises et attributs des 55 `.iwb` ; `ubz/` vide.
- Graphe : non utilisé (lecture directe des fichiers ci-dessus).

**Modules à réutiliser ou à étendre**

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| Entrée unique des fichiers | `apps/web/src/platform/import.ts:283` | `ImportHandler { id, nature: "document", detect, limit, run }` ; `ImportDeps.openBoard?(f: { name, blob, format: "iwb" \| "ubz" }): Promise<boolean>` | étendre |
| Reconnaître un ZIP | `import.ts:161` | `hasZipMagic(head)` | réutiliser |
| Lire un ZIP borné, chemins sûrs | `platform/zip-worker.ts:38`, `zip-read.ts:43` | `createZipReader(spawn, timeout, "board")` ; `keepBoardPath(name): boolean` (nouveau, à côté de `keepPackPath`) | étendre |
| Écrire un ZIP stable | `zip-worker.ts:31`, `zip-read.ts:55` | `createZipWriter(spawn)(files: ZipFile[])` | réutiliser |
| Worker jetable du module `formats` | `platform/one-shot-worker.ts:18`, `sheet-worker.ts`, `container-load.ts` | `runOnce`, `loadFormatsModule()` | réutiliser |
| Lecteur XML | `quick-xml` (déjà lié par `calamine`) | `Reader::from_reader(&[u8])`, `read_event()`, `normalized_value(XmlVersion::Explicit1_0)` | réutiliser |
| Lecteur SVG commun | aucun (`board`, `svg`, `iwb`, `ubz` cherchés : rien) | `roomboard_formats::board::read_svg(xml: &[u8], dialect: Dialect) -> Result<BoardList, BoardError>` ; `write_iwb(list: &BoardList) -> Result<String, BoardError>` ; `write_ubz_pages(list: &BoardList) -> Result<Vec<String>, BoardError>` ; `BoardList { ops: Vec<f32>, texts: Vec<String>, warnings: Vec<String> }` | nouveau module (DA2) |
| Liaison Wasm | `crates/roomboard-formats-wasm/src/lib.rs:14` (`ContainerReader`), `:137` (`write_pdf_pages`) | `BoardReader.open(xml, dialect)` → `ops()`, `texts()`, `warnings()` ; `write_board_xml(ops, texts, format) -> Vec<String>` | étendre |
| Flux plat | `crates/roomboard-formats/src/pdf.rs:22` (`DisplayList`) | même forme `ops` + `texts`, flux témoin partagé | réutiliser (patron) |
| Document neuf sans historique | `core/api.ts:362` (`saveParts`), `:396` (`loadParts`) ; `workspace.ts:451` | `saveParts(now, v)` → `core.loadParts(m, y)` | réutiliser |
| Onglet neuf, avis | `workspace.ts:396` (`openPdf`) | `addTab(doc, { name, target: null }, assets)`, `say` | réutiliser |
| BoardList ↔ commandes | aucun (`fromBoard`, `boardList` cherchés : rien) | `app/board-io.ts` : `buildBoardDocument(core, pages: readonly BoardListPage[], media: ReadonlyMap<string, Blob>, deps): Promise<{ doc, assets, warnings }>` ; `boardListOf(doc, assets): { list, files: ZipFile[], warnings }` | nouveau module (DA2) |
| Assets | `core/asset-store.ts:16` | `put(blob)` | réutiliser |
| Type d'un Blob | `app/container-io.ts:67` (`typed`) | `typed(blob, mime)` | réutiliser |
| Requêtes hors origine dans l'essai | `scripts/essais/c15-3d-navigateur.mjs:111` | `page.on("request", …)` | réutiliser (patron) |
| Taille d'une image | `platform/image-import.ts` (`decodeImage`, `kindOfMime`) | `decode(blob, kind)` | réutiliser |
| Fichiers à enregistrer | `platform/typed-files.ts:10` | `FileType` ; `IWB_TYPE`, `UBZ_TYPE` ; `createWebTypedFiles` / `createTauriTypedFiles` | étendre |
| Actions de barre | `toolbar.ts:108`, `toolbar-profiles.ts:37`, `toolbar-host.ts:51` | `action("export-iwb", …)`, `action("export-ubz", …)` | étendre |
| Largeur de page | `core/api.ts:437` | `PAGE_WIDTH` | réutiliser |
| Essai navigateur | `scripts/essais/commun.mjs`, `c4-bibliotheque-navigateur.mjs:122` | mesure de scène ≥ 640 px | réutiliser |

## 4. Hypothèses à revoir

**Niveau 1 (difficiles à défaire ou visibles des utilisateurs)**

- **HU1-1** `.ubz` : aucun fichier réel (dossier `ubz/` vide). Lecture et écriture fixées d'après le code d'OpenBoard
  lu (`page%1.svg` à 3 chiffres, `metadata.rdf`, `ub:` ; GPL, rien copié) et des fichiers synthétiques ; un trait à
  pression d'OpenBoard (groupe de `polygon`) est relu en un trait : ligne médiane des quadrilatères, pression =
  largeur locale / largeur max. R (D20) attend un `.ubz` réel. Ouverture des copies `.ubz` par OpenBoard non vérifiée.
- **HU1-2** Licence 1EdTech : seule la licence générale a été lue ; une phrase de la page de la norme (« scientific,
  experimental, and scholarly collaboration only », résumé non verbatim) reste à vérifier. Si elle visait l'usage
  commercial, l'export `.iwb` se retire (une action de barre) ; la lecture reste (interopérabilité, U36).
- **HU1-3** Polygone rempli → trait fermé sans remplissage, avec avertissement (fidélité visible réduite sur
  `fill.iwb`, `polygon.iwb`). Un élément « forme libre remplie » demanderait une commande de cœur neuve.
- **HU1-4** Coût de vitesse du réglage `z` : mesuré en natif (export PDF de 2 000 pages : 280 → 300 ms ; lecture d'un
  `.xlsx` de 0,7 Mo : 22,5 → 24,5 ms) ; à remesurer dans le navigateur par le plan (export PDF de `c12-pdf-navigateur`),
  accepté jusqu'à 15 % de plus.
- **HU1-5** Vidéo, son et Flash des `.iwb` non importés (avertissement) au lot 1 ; les relier à C14 (`AddMedia`) est un reste.
- **HU1-6** Libellés « Enregistrer une copie au format .iwb… » et « … .ubz… », deux actions plutôt qu'un sous-menu
  (porte visuelle de fin de lot ; design existant de la barre, aucun nouveau composant).

**Niveau 2**

- **HU2-1** Écriture IWB dans l'espace `http://www.imsglobal.org/xsd/iwb_v1p0` ; les lecteurs anciens (Becta) le
  tolèrent (supposé, non vérifié sur SMART ni ActivInspire).
- **HU2-2** Polyligne relue par `CommitStroke` : le lissage de `freedraw` arrondit les angles vifs.
- **HU2-3** Pas de vignette `pageNNN.thumbnail.jpg` dans la copie `.ubz` (OpenBoard les régénère, supposé).
- **HU2-4** Bornes : les 500 premières pages ouvertes avec un avis (comme le PDF) et 100 000 objets par fichier (au-delà : refus) ; valeurs choisies par analogie avec U26.
- **HU2-5** Taille réelle du lecteur : le prototype mesuré couvre l'essentiel ; le code final peut ajouter 20 à 40 Ko,
  la marge mesurée (175 887 o) le tient.
- **HU2-6** Texte OpenBoard : HTML de Qt réduit au texte, à la couleur et à la taille de la première police.
- **HU2-7** Fond d'une page OpenBoard : lu sur le premier `rect` plein (D14) ; OpenBoard le pose peut-être aussi par un
  attribut de la racine (`ub:dark-background` ou voisin, non vérifié sans `.ubz` réel) : les deux seront lus si
  l'attribut est confirmé (CR15).

## 5. Décisions d'architecture

**DA1 — Le lecteur SVG va dans `formats`, qui tient par un réglage de taille (mesure réelle).**
Contexte : `formats` 3 100 845 o (plafond 3 145 728, marge 44 883) ; principal 1 368 840 o (plafond 1 572 864). Mesure
(copie jetable de afc2d8b, `release` wasm32 + `wasm-bindgen --remove-name-section`, prototype lecteur `quick-xml` + écrivain) :
lecteur dans `formats` 3 156 635 o (**hors plafond**) ; lecteur dans le principal 1 552 220 o (marge 20 644 < 100 Ko, **rejeté**) ;
réglage D2 seul 2 903 814 o (−197 031) ; D2 + lecteur 2 956 861 o ; **D2 + lecteur + écrivain 2 969 841 o (marge 175 887)** ;
principal inchangé dans tous les cas `formats` (1 368 840 o). Le lecteur TypeScript est écarté : contraire à U23/U36, et le lot 3 (`.flipchart` en Rust) aura besoin de cette marge.
Décision : D1 + D2 ; `verifier.sh` garde les deux plafonds ; tailles notées dans `docs/essais/taille-wasm.md`.
Conséquences : chemins non critiques (PDF, `.xlsx`) un peu plus lents (HU1-4) ; retour arrière = retirer un bloc de `Cargo.toml`.

**DA2 — Un flux BoardList dans les deux sens, et `board-io.ts` côté page.**
Contexte : DAU1 interdit au module `formats` de connaître le `Doc` ; l'export PDF a déjà un flux plat témoin.
Décision : Rust lit le XML en BoardList et écrit le XML depuis une BoardList ; `app/board-io.ts` traduit BoardList ↔ commandes
du cœur ; le ZIP reste au Worker TypeScript (D3) ; un flux témoin commun garde la parité Rust/TS.
Conséquences : aucun `Doc` dans `formats`, aucune commande de cœur neuve ; `.notebook` (lot 2) réutilise `read_svg` avec un
dialecte de plus ; l'aller-retour se teste en natif (`read(write(l)) == l`) et dans le navigateur (S4).

## 6. Scénarios d'acceptation

- **S1 — `.iwb` ZIP déposé.** Déposer un `.iwb` ZIP généré (rectangle, ellipse, ligne fléchée, polyligne, texte gras
  sur deux lignes, image PNG, groupe, une vidéo) : un onglet s'ouvre avec ses pages ; l'avis liste « vidéo non lue » ;
  le texte est éditable ; le groupe se déplace d'un bloc.
- **S2 — `.iwb` SVG brut, puis leçon réelle à part.** Essai e2e (fichiers générés seulement) : déposer un `.iwb` SVG
  brut généré de 3 pages : 3 pages. Mesure à part, hors de `verifier.sh` : ouvrir `7-11 Maths 3.iwb` (hors dépôt) :
  3 pages (`page0` à `page2` ; l'inventaire qui dit 4 se trompe) ; résultat noté dans le fichier d'état, capture dans
  `docs/essais/c13-iwb-lecon.png` (CR1).
- **S3 — `.ubz` déposé et édité.** Déposer un `.ubz` généré (trait à pression, polyligne, texte OpenBoard, image, fond
  noir) : onglet ouvert, avertissements « règle non lue » ; ajouter un trait sur la page 1.
- **S4 — Copies et aller-retour.** « Enregistrer une copie au format .iwb… » puis « … .ubz… » ; rouvrir chaque copie :
  mêmes pages, même nombre d'objets par sorte, formes, textes (contenu et segments), image et groupe à 1 px près ; les
  traits à 2 px près sur chaque point (la pression devient constante, le lissage de `freedraw` déplace les angles,
  HU2-2) ; enregistrer l'onglet en `.roomboard`, le rouvrir : identique ; la fixture
  `crates/roomboard-core/tests/fixtures/socle-v1.roomboard` (d'avant C13) s'ouvre comme avant. Scène : `#stage` mesuré à
  la fenêtre de 1 280 × 900 (`scripts/essais/commun.mjs:99`), après l'import, avis d'avertissements visible et les deux
  nouvelles actions dans la barre : ≥ 640 px de large et de haut (CR9, CR13, CR14).
- **S5 — Fichiers hostiles.** Un `.iwb` avec `<!DOCTYPE … SYSTEM "file:///etc/passwd">` et `&e;` : aucun contenu
  externe, avertissement ; un `<script>` et un `onload` : rien n'est exécuté ; un ZIP avec `../evil.png` et
  `/abs.png` : entrées refusées ; une image `http://…` : avertissement, et l'essai compte les requêtes hors origine
  pendant l'import (`page.on("request")`, patron `c15-3d-navigateur.mjs:111`) : zéro attendu (`controle-hors-ligne.mjs`
  lit le dist sans l'exécuter, il ne le prouve pas, CR2) ; un objet aux points vides ou d'épaisseur 0 : sauté, compté
  (D8b) ; un `.iwb` de plus de 100 Mo sur le web, ou un ZIP de plus de 1 000 entrées : refus avec message.

## 7. Hors périmètre

- Lots 2 et 3 de C13 : `.notebook` (B puis A, R avec avertissement), `.olf` (A + E + R), `.flipchart` (B, lecture seule).
- Niveau R du `.ubz` (D20) ; médias des `.iwb` vers C14 (HU1-5) ; polygones remplis (HU1-3).
- Essais dans SMART, ActivInspire, myViewBoard et OpenBoard réels ; avis juridique (usage-cadrage :480).
- Build Tauri ; `zone.rs`, élément `fill`, `c8-pot-zones-navigateur.mjs`, `data-zone-*`, `docs/audits/`.

## 8. Portes immédiates

Aucune.
