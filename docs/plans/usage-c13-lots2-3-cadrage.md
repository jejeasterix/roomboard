# Cadrage — usage-c13-lots2-3 (C13, lots 2 et 3 : `.notebook`, `.olf`, puis `.flipchart`)

Date : 2026-11-22. Mode autonome (brief OE32), aucune question à Jérôme. Base `origin/main` @ 3b73c27 (PR #31 comprise).
Ce cadrage **étend** le lot 1 (`docs/plans/usage-c13-lot1-svg-iwb-ubz-cadrage.md`, D1 à D24, DA1, DA2) sans le refaire :
toute règle du lot 1 non reprise ici vaut telle quelle (D7 construction par commandes, D8 coordonnées, D8b valeurs
refusées, D11 texte, D12 images, D13 groupes, D15 avertissements par sorte, D16 sécurité XML, D23 fichiers de test).

## 1. Demande et gabarit

Un `.notebook` (SMART), un `.olf` (myViewBoard), puis un `.flipchart` (ActivInspire) déposés ou ouverts deviennent un
document RoomBoard dans un nouvel onglet, au niveau de la section 10 du cadrage de l'usage, avec la liste
d'avertissements de ce qui n'est pas lu (U2) ; lot 2 (`.notebook` puis `.olf`) fusionnable seul, lot 3 (`.flipchart`)
ensuite.
Gabarit : **chantier**, cadrage court (25 questions au plus ; **22 consommées**, N1 à N22).

Sources appliquées telles quelles : `docs/plans/usage-cadrage.md` ligne C13 (:560), U1 (:54), U2 (:55), U23 (:76), U25
(:78, amendée par Q1 :619), U26 (:79), U36 (:89), U39 (:92), § 10 (:578-608), Q5 (:641-643) ; étude
`docs/etudes/usage-formats-tableaux.md` § 5, § 6, § 11, § 14 q. 6 ; coffre `02_Decisions/0266` (lecteur SVG dans
`formats`, ZIP en TS), `0246` et `0069` (ActCraft) ; lecteur `.flipchart` d'ActCraft (`~/projets/actcraft` @ 29d551ae,
`formats/src/{bamboo,objectstream,flipchart}.cpp`, `flipchartids.h`, `tests/support/flipchartwriter.h`) ; exemples hors
dépôt `~/telechargements-roomboard/` (lecture seule, sondés par scripts Python `-I` dans `/tmp/sonde-fpg-cadreur/`).

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| N1 | Niveaux visés | `.notebook` **B** ; `.olf` **A** pour traits, images, fonds (vérifiés sur les exemples), textes en B ; `.flipchart` **B** (pages, fond, traits, lignes, formes, images, textes ; le reste en avertissements). | § 10 (:588, :591, :593) ; U36 | oui |
| N2 | Export, R | **Import seul** pour les trois formats. Aucune action « Enregistrer une copie au format .notebook / .olf » : l'édition passe par import puis export `.iwb` ou PDF, déjà livrés. Conflit : la § 10 donne R au `.notebook` et R, E au `.olf` ; Q5 (décision de Jérôme, rang 1) l'emporte : « Q5 = a » et « Idem pour des fichier smartboard, myViewBoard ou .iwb » (importer, éditer, exporter en `.iwb` ou PDF ; jamais réécrire le format d'origine), et répond à la q. 6 de l'étude (§ 14). La § 10 est à amender à la clôture (HU1-1). | Q5 (:641-643) ; étude § 14 q. 6 ; brief (« seulement si la section 10 fixe un niveau E ») | oui (HU1-1) |
| N3 | Ce que fait le dépôt | Nouvel onglet `<nom>.roomboard`, `target: null`, comme le lot 1 (D5) ; jamais d'insertion. | Q1 (:619) ; lot 1 D5 | oui |
| N4 | Détection (U23) | **Octets magiques, puis extension, puis contenu.** Famille ZIP : en-tête ZIP + extension `.iwb`, `.ubz`, `.notebook` ou `.olf` → un même chemin `openBoard` ; après décompression, `resolveBoardFormat(ext, paths)` choisit le dialecte **sur le contenu** : `content.xml` → `iwb` ; `imsmanifest.xml` + `page<N>.svg` → `notebook` ; `content.json` → `olf` (racine `olf` contrôlée à la lecture, N13) ; `page<N>.svg` sans manifeste → `ubz`. Le format de l'extension gagne si ses marques sont là ; sinon le format reconnu ; aucun → refus « fichier endommagé : contenu de tableau introuvable dans ce .<ext> ». Un ZIP d'autre extension reste hors de cette famille (inchangé). `.flipchart` : signature ` Bamboo ` (8 octets) suffit, quelle que soit l'extension (signature propre, comme `looksLikeFlipchart` d'ActCraft) ; un nom `.flipchart` sans signature → refus « fichier endommagé : ce n'est pas un paperboard ActivInspire ». Gestionnaires placés avec ceux du lot 1, avant `media`. | U23 (:76) ; brief ; `import.ts:288-329` ; ActCraft `flipchart.h:36` | oui |
| N5 | Types de format | `BoardFormat` (`"iwb" \| "ubz"`) reste le type de l'**export** ; nouveau `BoardSourceFormat = BoardFormat \| "notebook" \| "olf" \| "flipchart"` pour la lecture (`openBoard`, `BoardDialect` du Worker). Aucune action d'export ne peut naître par erreur. | N2 ; `board-io.ts:19`, `board-reader.ts:12`, `workspace.ts:164-166` | oui |
| N6 | `.notebook` : lecture | Dialecte `Notebook` de `board::read_svg` (même lecteur SVG, DA2 du lot 1). Ordre des pages : `<resource identifier="pages">` de `imsmanifest.xml` (lu en Rust, `quick-xml`), repli sur l'ordre numérique de `page<N>.svg` (base 0 ou 1 selon l'écrivain, vu sur les exemples) avec avertissement « ordre des pages déduit des noms ». Le Worker ZIP garde `imsmanifest.xml` (filtre `keepBoardPath` étendu). | étude § 5 (:83) ; sonde des 6 exemples ; `read.rs:1519` | oui |
| N7 | `.notebook` : dialecte SMART | Nouveau : élément `path` (commandes `M L H V Z`, absolues et relatives ; `C Q S T A` aplaties en segments, avertissement « courbes approchées ») → trait fermé ou ouvert (patron D10 du lot 1), **sauf** un chemin fermé de 4 sommets alignés sur les axes → forme `rect` avec son remplissage ; `rect` à `width/height="100%"` → fond de page (D14) ; `xbk_transform` ignoré (doublon de `transform`) ; `tspan` imbriqués et `justification` lus comme `text-align` ; `xlink:href` d'image décodé (`%20`, crochets) avant `mediaOf` ; `flash`, `persistence*`, `scrollingText`, `hr` et inconnus → avertissements par sorte (Flash, objet inconnu). | sonde : 166 `path` (seulement `M L z`), 70 `ellipse`, 46 `image`, 1 412 `tspan`, attributs `shapename`, `xbk_transform`, `locked` ; lot 1 D10, D14, D15 | oui (HU1-3) |
| N8 | `.olf` : où lire | **TypeScript**, `app/olf-read.ts` (nouveau), sur le main thread après le Worker ZIP : `JSON.parse` du `content.json` puis `BoardListPage[]` directement, qui vont à `buildBoardDocument` du lot 1. **Écart à U23** (qui place les formats lus par calcul pur en Rust), du même ordre que D3 du lot 1 : un lecteur JSON en Rust coûterait du module `formats` (aucune `serde`, D6 du lot 1), alors que `JSON.parse` est natif, sans entité ni script, et que la marge de 121 Ko est gardée pour le lot 3. | U23 ; lot 1 D3, D6 ; 0266 ; DA3 | oui (DA3) |
| N9 | `.olf` : correspondances | `stroke` → trait (`points` « x,y x,y … » en repère local, `matrix` 3×3 par lignes `a,c,e,b,d,f,0,0,1` → matrice `[a,b,c,d,e,f]`, `pen-width` → épaisseur, `stroke` couleur, `is-highlighter` → avertissement « surligneur rendu en trait ») ; `image` → image (`source` relatif à l'archive, `matrix`) ; `textarea` → texte, segments depuis `text-blocks-container` (paragraphes, `font-size`, `font-weight`, `font-style`, `text-decoration`, `font-family`, `fill` en `#AARRGGBB`), `custom-data` (XAML) **jamais lu** ; `backgrounds` : `color` → fond, `image` → image en bas de pile couvrant la page ; `widget-player` → avertissement « widget non lu » ; page `is-hidden` → lue, avertissement ; échelle `1920 / width` du `viewbox` (3840 × 2160 et 1919,99 vus). | sonde des 6 `.olf` (`stroke` 2 926, `textarea` 30, `image` 5, `widget-player` 16 ; translation de `analisis.olf` recalculée : y local 104 − 483 ≈ bbox −383) ; lot 1 D8 | oui (HU1-4) |
| N10 | `.flipchart` : ce que contient un `.fpg` (sonde) | Un `.fpg` décompressé est **un conteneur Bamboo imbriqué** (même signature, version 7), d'une entrée `<page>.in` (index « culm ») et de `<id>.io` (flux d'objets binaires Qt, en-tête ` Bamboo ` u16 1 u16 7, puis balises `O`, `M`…). Les images sont des entrées **du conteneur racine** (TIFF en majorité, puis BMP, PNG, JPEG), les ressources partagées sont des `.ir`, les miniatures `.thm` sont des BMP 320 × 240. Taille annoncée = en-tête qCompress = taille réelle sur les 5 exemples ; aucun `.fpg` dans un `.fpg`. Le contenu est lisible : ActCraft le lit déjà (même auteur, U39). | sonde (`/tmp/sonde-fpg-cadreur/sonde.py`, 5 fichiers, 319 à 1 853 entrées en tout, 2,4 à 32,7 Mo décompressés, plus grosse entrée 12,7 Mo) ; ActCraft `bamboo.h:24-27`, `objectstream.h:85-87` | — |
| N11 | `.flipchart` : partage TS / Rust | **Conteneur en TypeScript, objets en Rust** (DA4). TS (`platform/bamboo.ts`, nouveau, appelé par le Worker ZIP) lit le conteneur racine et chaque `.fpg`, décompresse par `fflate` (`Unzlib` en flux, déjà présent) ; images en `Blob`, jamais copiées dans le Wasm. Rust (`roomboard-formats::flipchart`, nouveau) reçoit les seules entrées `.in`, `.io`, `.ir`, `version` et rend une BoardList (`board::encode`). Aucune décompression zlib en Rust, aucun troisième module Wasm. | brief ; lot 1 D3 ; 0266 ; DAU1 | oui (DA4) |
| N12 | `.flipchart` : lecture des objets | Portage en Rust du lecteur d'ActCraft, réduit au niveau B : flux d'objets (`objectstream.cpp`), index culm (`parseIndex`), document (taille de page par défaut, table des ressources), page (taille, fond couleur ou image), objets `kStrokeObject` (3) → trait, `kLineObject` (5) → trait ouvert, `kShapeObject` (7) → trait fermé ou `rect` (règle de N7), `kImageObject` (9) → image, `kTextObject` (11) → texte à segments (police, taille en points, graisse, italique, souligné, couleur des runs), `kGroupObject` (18) → groupe, ordre de dessin couche, profondeur, arbre (§ 7.3 d'ActCraft). Tables d'identifiants recopiées à la main de `flipchartids.h`, sans nom de Promethean. Non lus, avertis par sorte : actions (22 à 28, 50, 463), grille (13, 14), étiquettes (53), connecteurs (52), son et vidéo (253), MathML (460), texte vertical (469), rideau, projecteur, repère XY. | U36 (:89) ; U39 (:92), 0246 ; ActCraft `flipchart.cpp:850-1040`, `flipchartids.h:14-41` | oui |
| N13 | Bornes et sécurité (U26) | Toutes les bornes du lot 1 tiennent (100 Mo par fichier web, 256 Mio décompressés, 100 000 objets, 500 premières pages avec avis). En plus : **Bamboo** : 20 000 entrées en tout, imbrication 1 (un `.fpg` dans un `.fpg` → refus), taille annoncée lue avant de décompresser (au-delà du budget restant → refus sans rien décompresser), en-tête qCompress différent de la taille annoncée → refus, décompression arrêtée dès que la sortie dépasse l'annonce (bombe) ou finit plus courte → refus « fichier endommagé : entrée <nom> de taille mensongère », chaîne UTF-16 de longueur impaire ou plus longue que la donnée → refus ; **flux d'objets** : toute longueur lue bornée par les octets restants avant allocation, imbrication 32 (comme ActCraft `kMaxNesting`), pointeurs de groupe en cycle ignorés avec avertissement, côté de page hors `]0, 100 000]` → 1024 × 768 et avertissement ; **ZIP** : `keepBoardPath` refuse toujours absolu, `..`, `__MACOSX` ; **XML** du `.notebook` : D16 du lot 1 (DOCTYPE ignoré, aucune entité externe) ; **JSON** : erreur de `JSON.parse` (y compris pile dépassée) → « fichier endommagé » ; chemins d'image `http(s):`, `file:`, `data:` ou hors archive → avertissement, jamais chargés. Un test par cas. | U26 (:79) ; brief ; ActCraft `bamboo.h:15`, `flipchart.cpp:23-31` ; lot 1 D3, D12, D16 | oui (HU2-1) |
| N14 | Images non décodables | TIFF (35 dans `NAPLAN`, plusieurs dans `History`), EMF, WMF : **avertissement** « page N : K images TIFF non lues », pas de décodage ajouté. Prémisse démentie : la § 10 donne TIFF en A (C2), mais le code le refuse (`image-import.test.ts:64`, « R14 : TIFF refusé »). | § 10 ; `image-import.test.ts:64` ; lot 1 D12 | oui (HU1-2) |
| N15 | Médias du ZIP gardés | `keepBoardPath` ajoute `imsmanifest.xml` et `content.json` ; `BOARD_ZIP_EXTENSIONS` inchangé (PNG, JPEG, GIF, WebP, BMP, SVG). Vidéos, sons, Flash, widgets, miniatures jamais décompressés. Le filtre Bamboo garde `.in`, `.io`, `.ir`, `.fpg`, `version` et les images de la même liste ; `.tif`, `.thm`, `.wmv`, `.avi`, `.swf`, `.wav` jamais décompressés. | lot 1 D3 ; sonde | oui |
| N16 | Constat à fermer en passant | `keepBoardPath` refait les contrôles de `keepZipPath` (constat `zip-worker.ts:35`, ouvert) : le chantier touche ce filtre, il en tire `safeArchivePath(name): string \| null` partagé par `keepZipPath`, `keepBoardPath` et le filtre Bamboo (même règle pour `__MACOSX`). Autres constats des zones touchées (`board.rs:358` curseur, `qt_html.rs:19` doublons) : non aggravés, le lecteur `.flipchart` a son propre curseur binaire (format différent). | `docs/architecture-constats.md` (lignes C13 lot 1) ; référence anti-refactorisation | oui |
| N17 | Taille des modules | Plafonds inchangés (principal 1 572 864 o, `formats` 3 145 728 o). Le principal ne bouge pas d'un octet (aucune ligne du cœur ni de `roomboard-wasm`). Budget du module `formats` (marge 121 196 o) : lot 2 ≤ 20 Ko (dialecte et manifeste), lot 3 ≤ 80 Ko, marge finale ≥ 20 Ko. **Tâche de mesure en tête de chaque lot** : taille avant, puis après chaque tâche Rust (`verifier.sh`). Dépassement au lot 3 → retirer d'abord la lecture fine du texte (segments → texte brut), puis les groupes (aplatis). | brief ; `docs/essais/taille-wasm.md` (C13 lot 1) ; H2-13 | oui |
| N18 | Bibliothèques (U39) | Aucune dépendance neuve (crate ou npm) : `quick-xml`, `fflate` déjà acceptés. Code repris d'ActCraft (GPL-3.0-only, seul auteur : Jérôme) noté dans `THIRD_PARTY_NOTICES.md`. | U39 (:92) ; 0246 | oui |
| N19 | Fichiers de test | Tous fabriqués : `.notebook` et `.olf` par des ZIP générés dans les tests (`zipStored`) ; `.flipchart` par un générateur repris de `flipchartwriter.h` d'ActCraft, en **un seul exemplaire** `scripts/essais/fabriques/flipchart.mjs` (Bamboo + qCompress par `node:zlib` côté essai, `fflate` côté vitest via le même module), et pour `cargo test` un écrivain de test minimal du flux d'objets (`#[cfg(test)]`). Exemples réels jamais copiés ni commités. | U36 (Q6) ; lot 1 D23 ; brief | oui |
| N20 | Mesure de fidélité | `docs/essais/c13-fidelite-lots2-3.md`, un tableau par format (fichier, pages, objets lus par sorte, avertissements, résultat), patron `c13-fidelite-iwb.md` ; mesure hors de `verifier.sh` par un script qui reçoit les chemins en argument (navigateur sur le dist, avis lu), jamais lancé depuis le dossier des exemples. | brief ; `docs/essais/c13-fidelite-iwb.md` | oui |
| N21 | Essai navigateur | Étendre `scripts/essais/c13-tableaux-navigateur.mjs` (déjà dans `verifier.sh --e2e`, :122) : lot 2 dépose un `.notebook` et un `.olf` générés ; lot 3 un `.flipchart` généré ; pour chacun : pages, objets, avis d'avertissements, enregistrement `.roomboard`, réouverture ; `#stage` ≥ 640 px de large et de haut (mesure du lot 1) ; requêtes hors origine comptées (zéro). Capture `docs/essais/c13-notebook-lecon.png` d'un `.notebook` fabriqué. | brief ; lot 1 S4, S5 ; `c13-tableaux-navigateur.mjs:127-163` | oui |
| N22 | Choix visuels | Aucun composant neuf : avis d'ouverture existant (`say`, `boardWarningsMessage`) ; seul changement visible hors import : le libellé du filtre « Importer » (`IMPORT_FILTER`) nomme les tableaux. Porte visuelle de fin de lot : la capture N21. | design existant ; `files.ts:81-93` | oui |

## 3. Carte d'impact

Rubriques déduites de la recherche (aucune ligne « Surfaces d'impact » dans `.claude/chantier.md` ; aucun graphe
graphify pour ce dépôt dans `~/.cache/graphes/`). Lot entre crochets.

**Cœur Rust et Wasm**

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-formats/src/board.rs:56-72` (`Dialect`) | oui [2] | `Dialect::Notebook`, `parse("notebook")` | V |
| `crates/roomboard-formats/src/board.rs:322` (`encode`) | non | réutilisé tel quel par le lecteur `.flipchart` (Vec<Page> → BoardList) | V |
| `crates/roomboard-formats/src/board/read.rs:1166-1190` (`element`), `:1036-1057` (`ignored`), `:1519` (`read_svg`) | oui [2] | `path`, fond `100%`, sortes SMART (N7) | V |
| `crates/roomboard-formats/src/board/notebook.rs` (nouveau) | oui [2] | `notebook_order` (manifeste) | S |
| `crates/roomboard-formats/src/board/write.rs`, `qt_html.rs` | non | aucun export neuf (N2) ; tests à garder verts | V |
| `crates/roomboard-formats/src/flipchart/` (nouveau : `stream.rs`, `index.rs`, `ids.rs`, `read.rs`) | oui [3] | N12 | S |
| `crates/roomboard-formats/src/lib.rs:5-9` | oui [3] | `pub mod flipchart` | V |
| `crates/roomboard-formats-wasm/src/lib.rs:177-216` (`BoardReader`) | oui [2][3] | dialecte `notebook`, `notebook_order` ; `FlipchartReader` [3] | V |
| `crates/roomboard-formats/Cargo.toml`, `Cargo.toml` racine (`opt-level`) | non | aucune crate neuve (N18) ; réglage D2 du lot 1 inchangé | V |
| `crates/roomboard-core/**`, `crates/roomboard-wasm/**` | non | aucune commande neuve (D7 du lot 1) ; principal inchangé à l'octet | V |
| `crates/roomboard-formats/src/{pdf,sheet,pixels,container}.rs` | non | tests à garder verts | V |

**Interface (apps/web)**

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/platform/import.ts:288-298` (`boardHandler`), `:329` (registre), `:66` (`ImportDeps.openBoard`) | oui [2][3] | gestionnaires `notebook`, `olf` [2], `flipchart` [3] ; type `BoardSourceFormat` (N4, N5) | V |
| `apps/web/src/platform/zip-worker.ts:31-44` (`BOARD_ZIP_EXTENSIONS`, `keepBoardPath`), `:101-125` (modes) | oui [2][3] | manifeste et `content.json` [2] ; `op: "bamboo"` [3] ; `safeArchivePath` (N16) | V |
| `apps/web/src/platform/model3d-import.ts:262` (`keepZipPath`) | oui [2] | appelle `safeArchivePath` (N16) | V |
| `apps/web/src/platform/bamboo.ts` (nouveau) | oui [3] | conteneur Bamboo + qCompress bornés (N11, N13) | S |
| `apps/web/src/platform/board-reader.ts:12` (`BoardDialect`), `:68-85` (`BoardCodec`) | oui [2][3] | `notebook` [2], `flipchart` [3] | V |
| `apps/web/src/platform/board-worker.ts:8-31` | oui [2][3] | ordre du manifeste puis lecture [2] ; `FlipchartReader` [3] | V |
| `apps/web/src/platform/container.ts:110` (`hasBoardReader`) | oui [2][3] | méthodes neuves du binding | V |
| `apps/web/src/app/board-files.ts:25-50` (`boardSources`), `:63` (`boardTabName`) | oui [2][3] | `resolveBoardFormat` (N4), sources par format | V |
| `apps/web/src/app/olf-read.ts` (nouveau) | oui [2] | N8, N9 | S |
| `apps/web/src/app/board-io.ts:19` (`BoardFormat`), `:518` (`buildBoardDocument`) | oui [2] | type de lecture séparé (N5) ; construction réutilisée | V |
| `apps/web/src/app/workspace.ts:531-572` (`openBoard`), `:164` | oui [2][3] | trois formats de plus ; chemin `.flipchart` sans ZIP | V |
| `apps/web/src/platform/files.ts:70-93` (`IMPORT_EXTENSIONS`, `IMPORT_FILTER`) | oui [2][3] | `notebook`, `olf` [2], `flipchart` [3] | V |
| `apps/web/src/main.ts:184-185` (`spawnBoardWorker`) | non | même Worker | V |
| `apps/web/src/toolbar.ts`, `toolbar-profiles.ts`, `typed-files.ts` | non | aucune action d'export neuve (N2) | V |
| `apps/web/src/platform/drop-web.ts`, `host-tauri.ts` | non | passent par `importFiles` | V |

**Persistance et formats de fichiers**

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `.roomboard` (`crates/roomboard-core/src/format/mod.rs`) | non | le document importé s'enregistre comme tout document ; fixture `socle-v1.roomboard` s'ouvre inchangée | V |
| `.notebook`, `.olf`, `.flipchart` en écriture | non | N2 | V |

**Scripts, contrôles, documents**

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/essais/c13-tableaux-navigateur.mjs:127-163` | oui [2][3] | N21 | V |
| `scripts/essais/fabriques/flipchart.mjs` (nouveau) | oui [3] | N19 | S |
| `scripts/verifier.sh:122` (`--e2e`), `:51-75` (tailles) | non | essai déjà appelé ; plafonds inchangés | V |
| `scripts/controle-hors-ligne.mjs` | non | aucune chaîne d'hôte neuve ; à garder vert | V |
| `scripts/controle-licences.mjs`, `scripts/licences-acceptees.json` | non | aucune dépendance neuve | V |
| `THIRD_PARTY_NOTICES.md` | oui [3] | reprise d'ActCraft (N18) | V |
| `docs/essais/taille-wasm.md` | oui [2][3] | tailles avant et après chaque lot (N17) | V |
| `docs/essais/c13-fidelite-lots2-3.md`, `docs/essais/c13-notebook-lecon.png` (nouveaux) | oui [2][3] | N20, N21 | S |
| `docs/plans/usage-cadrage.md:588-593` (§ 10) | non (clôture) | amendement N2 et N14, par l'orchestrateur | V |
| `apps/desktop/**` | non | aucun build Tauri | V |

**Tests**

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-formats/src/board/read.rs` (tests) | oui [2] | dialecte SMART, `path`, ordre du manifeste, XML hostile | V |
| `crates/roomboard-formats/src/flipchart/*` (tests) | oui [3] | flux d'objets, index, page, bornes (N13) | S |
| `apps/web/src/platform/import.test.ts:1027` (tableaux) | oui [2][3] | détection (N4), refus `.flipchart` sans signature | V |
| `apps/web/src/platform/zip-worker.test.ts` | oui [2][3] | filtres, `safeArchivePath`, `op: "bamboo"` | V |
| `apps/web/src/platform/bamboo.test.ts` (nouveau) | oui [3] | bombe, taille mensongère, imbrication, entrées | S |
| `apps/web/src/app/board-files.test.ts`, `olf-read.test.ts` (nouveau), `workspace.test.ts` | oui [2][3] | `resolveBoardFormat`, lecteur `.olf`, `openBoard` | V |
| `apps/web/src/app/board-io.test.ts` | non | flux témoin du lot 1 à garder vert | V |
| `apps/web/src/platform/image-import.test.ts:64` | non | TIFF reste refusé (N14) | V |
| `apps/web/src/core/wasm-core.contract.test.ts` | non | aucune commande neuve | V |
| `scripts/essais/c12-pdf-navigateur.mjs`, `c10b-tableau-navigateur.mjs`, `c4-bibliotheque-navigateur.mjs`, `c15-3d-navigateur.mjs` | non | à garder verts (ZIP, `formats`, 3D par `keepZipPath`) | V |

**Effets de bord sur l'existant**

- Un `.notebook` ou un `.olf` aujourd'hui refusé comme fichier inconnu s'ouvre ; un fichier à signature Bamboo s'ouvre
  quelle que soit son extension. Couvert par `import.test.ts` (tests neufs à côté de `:1027`).
- `keepZipPath` (3D) et `keepBoardPath` passent par `safeArchivePath` : la règle `__MACOSX` devient la même pour les
  deux. Couvert par `zip-worker.test.ts` et les tests de `model3d-import.test.ts` existants, et `c15-3d-navigateur.mjs`.
- Un `.iwb` ou `.ubz` dont le contenu est en fait celui d'un autre format s'ouvre selon son contenu (N4) au lieu d'être
  refusé. Couvert par `board-files.test.ts` (`resolveBoardFormat`).
- Module `formats` plus gros (N17) : chargé au premier besoin, aucun effet sur l'encre. Couvert par les plafonds de
  `verifier.sh`.

**Chantiers en cours**

- `git worktree list` : `~/projets/roomboard` (main) et ce worktree seulement ; `gh pr list` : aucune PR ouverte.
- Aucune autre machine signalée par l'orchestrateur.

**Termes cherchés**

- Texte (dépôt) : `flipchart|notebook|\.olf|"olf"` dans `apps/web/src` et `scripts/essais` (aucune mention hors tests
  sans rapport) ; `tiff|Tiff|tif` (`container.rs:29`, `image-import.test.ts:64`) ; `board|Board` dans
  `formats-wasm/src/lib.rs`, `main.ts`, `zip-worker.ts`, `import.ts` ; `openBoard|exportBoard` ; `"path"|"image"|
  "polyline"|"tspan"` dans `read.rs` ; `isIwbName|IMPORT_EXTENSIONS` ; `miniz_oxide|fdeflate` (`Cargo.lock`) ;
  `zlib|inflate|unzlib` dans `apps/web/src` (aucun) ; `Unzlib` dans `fflate@0.8.3/lib/index.d.ts` ; `c13` dans
  `verifier.sh`.
- Texte (ActCraft, lecture seule) : `flip|bamboo|fpg` dans `git ls-files` ; `case ids::kind::`, `warn(`, `thm`.
- Coffre : `chercher.js "RoomBoard flipchart notebook olf formats tableaux" 8` ; `"piège lecteur flipchart Bamboo
  qCompress ActCraft" 6` (aucun piège sur ces formats).
- Exemples : sondes Python `-I` (`/tmp/sonde-fpg-cadreur/{sonde,sonde2,totaux,olf,nb}.py`, chemins en argument).
- Graphe : aucun graphe pour ce dépôt.

**Modules à réutiliser ou à étendre**

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| Entrée unique des fichiers | `apps/web/src/platform/import.ts:288` (`boardHandler`) | `boardHandler(format: BoardSourceFormat, deps)` ; `ImportDeps.openBoard?(f: { name; blob; format: BoardSourceFormat }): Promise<boolean>` ; `flipchartHandler(deps)` avec `detect: (head) => hasBambooMagic(head)` | étendre |
| Reconnaître un ZIP | `import.ts:160` (`hasZipMagic`) | `hasZipMagic(head)` | réutiliser |
| Reconnaître un Bamboo | aucun (`Bamboo`, `bamboo` cherchés : rien) | `hasBambooMagic(head: Uint8Array): boolean` dans `platform/bamboo.ts` | nouveau module (DA4) |
| Choisir le dialecte d'un ZIP | `app/board-files.ts:25` (`boardSources`) | `resolveBoardFormat(ext: BoardSourceFormat, paths: readonly string[]): BoardSourceFormat \| null` ; `boardSources(format: BoardSourceFormat, entries)` → `{ xml, json?, manifest?, media, total }` | étendre |
| Lire un ZIP borné | `platform/zip-worker.ts:36` (`keepBoardPath`), `zip-read.ts:43` (`createZipReader(..., "board")`) | `keepBoardPath` + `imsmanifest.xml`, `content.json` | étendre |
| Chemin d'archive sûr | `model3d-import.ts:262` (`keepZipPath`), `zip-worker.ts:36` (doublon, constat ouvert) | `safeArchivePath(name: string): string \| null` (chemin normalisé, ou null si absolu, lettre de lecteur, `..`, `__MACOSX`, dossier) | étendre (N16, ferme le constat `zip-worker.ts:35`) |
| Conteneur Bamboo et qCompress | aucun en TS ; référence ActCraft `bamboo.cpp:78-160` | `readBamboo(data: Uint8Array, keep: (name: string) => boolean, limits: { entries: number; bytes: number }): { path: string; bytes: Uint8Array }[]` (chemins des entrées d'un `.fpg` : `<page>.fpg/<nom>`) ; Worker ZIP `{ op: "bamboo", bytes }` → `{ entries: { path, blob }[] }` | nouveau module (DA4) |
| Décompression zlib | `fflate` 0.8.3 (dépendance de `apps/web`) | `new Unzlib((chunk, final) => …)` en flux, `push(part, final)` | réutiliser |
| Lecteur SVG commun | `crates/roomboard-formats/src/board/read.rs:1519` | `read_svg(xml, Dialect::Notebook, first_page)` | étendre |
| Ordre des pages SMART | aucun (`imsmanifest`, `manifest` cherchés dans `board`) | `board::notebook::notebook_order(manifest: &[u8]) -> Result<Vec<String>, BoardError>` | nouveau module (fonction courte dans `board`) |
| Rectangle depuis un polygone | aucun (`rect_of` cherché) | `board::rect_of(points: &[[f32; 2]]) -> Option<[f32; 4]>` partagé par N7 et N12 | nouveau (fonction de `board.rs`) |
| Modèle de page et codage | `board.rs:139-183` (`Item`, `Page`), `:322` (`encode`) | `encode(&pages) -> BoardList` | réutiliser |
| Lecteur `.flipchart` | référence ActCraft (`objectstream.cpp`, `flipchart.cpp`, `flipchartids.h`) ; aucun en Rust | `flipchart::read(entries: &[(&str, &[u8])], first_page: u32) -> Result<BoardList, BoardError>` (entrées `.in`, `.io`, `.ir`, `version`, chemins `<page>.fpg/<nom>` pour les pages) | nouveau module (DA5) |
| Texte riche Qt | `board/qt_html.rs:249` (`read_qt_html`) | non utilisé : les runs du `.flipchart` sont déjà découpés (N12) | — |
| Liaison Wasm | `crates/roomboard-formats-wasm/src/lib.rs:177` (`BoardReader`) | `BoardReader.open(xml, "notebook", first_page)` ; `notebook_order(manifest) -> Vec<String>` ; `FlipchartReader.open(names: Vec<String>, data: &[u8], ends: &[u32])` → `ops()`, `texts()`, `warnings()` | étendre |
| Worker du module `formats` | `platform/board-worker.ts:12`, `board-reader.ts:68` (`BoardCodec`) | `read(files, dialect: "iwb" \| "ubz" \| "notebook", names?)` ; `readFlipchart(entries: readonly { path: string; bytes: Uint8Array }[]): Promise<BoardPart>` | étendre |
| Lecteur `.olf` | aucun (`olf`, `content.json` cherchés : rien) | `readOlf(json: string): { pages: BoardListPage[]; warnings: string[] }` dans `app/olf-read.ts` | nouveau module (DA3) |
| Construction du document | `app/board-io.ts:518` (`buildBoardDocument`) | `buildBoardDocument(core, pages, media, deps)` | réutiliser |
| Onglet, avis, bornes | `workspace.ts:531` (`openBoard`), `board-files.ts` (`boardWarningsMessage`, `BOARD_MAX_OBJECTS`, `boardFirstPagesMessage`, `boardTabName`) | mêmes fonctions | réutiliser |
| Taille d'une image | `platform/image-import.ts` (`decodeImage`) | `decode(blob, kind)` | réutiliser |
| Essai navigateur | `scripts/essais/c13-tableaux-navigateur.mjs:127-163`, `commun.mjs` (`dropFile`, `stageBox`) | `dropFile(page, "#stage", name, bytes, "")` | étendre |
| Fichier `.flipchart` de test | référence ActCraft `tests/support/flipchartwriter.h` | `makeFlipchart(pages: { strokes?, images?, texts? }[], deflate: (b: Uint8Array) => Uint8Array): Uint8Array` dans `scripts/essais/fabriques/flipchart.mjs` | nouveau module (N19) |

## 4. Hypothèses à revoir

**Niveau 1 (difficiles à défaire ou visibles des utilisateurs)**

- **HU1-1** Import seul pour `.notebook` et `.olf` (N2) : la § 10 promettait R (et E pour `.olf`) ; Q5 « Idem » est lu
  comme « pas d'écrivain dans le format d'origine ». À confirmer à la clôture, avec l'amendement de la § 10. Réversible :
  un écrivain `.olf` (JSON) se fait plus tard sans toucher la lecture.
- **HU1-2** Images TIFF des `.flipchart` (et EMF, WMF) non affichées, seulement avouées (N14) : sur `NAPLAN`, la
  plupart des images manquent. Un décodeur TIFF dans `formats` (crate `tiff`, à mesurer) est un chantier à part.
- **HU1-3** Dialecte SMART (N7) : seuls `M L z` vus dans les 6 exemples (fichiers de 2008 à 2014) ; traits d'encre des
  versions récentes, questionnaires et galeries non vus. Remplissage d'un chemin non rectangulaire perdu (comme D10 du
  lot 1).
- **HU1-4** Lecture des `.olf` (N9) : matrice 3×3 lue par lignes, vérifiée sur un seul trait d'`analisis.olf` ;
  couleur `#AARRGGBB` des textes supposée (vue `#FF000000`) ; images et textes en B tant qu'aucun aller-retour avec
  myViewBoard n'est vérifié.
- **HU1-5** Lot 3 au niveau B par portage d'ActCraft (N12) : vérifié chez ActCraft sur ses propres tests synthétiques,
  pas encore dans RoomBoard sur les 5 exemples ; la mesure N20 fixe le niveau réel. Si le lot 3 ne tient pas dans la
  borne de temps, il reste non fusionné (le lot 2 est fusionnable seul).

**Niveau 2**

- **HU2-1** Bornes neuves (N13) : 20 000 entrées Bamboo (exemples : 1 853 au plus), imbrication 1, profondeur 32 ;
  valeurs choisies par analogie avec U26 et ActCraft.
- **HU2-2** Grille, étiquettes, actions et rideau du `.flipchart` non repris (C9 et C7 recommandés par la ligne C13,
  mais aucune commande de grille n'est appelée par la construction du lot 1) ; avertis.
- **HU2-3** Page `is-hidden` d'un `.olf` importée comme les autres, avec avertissement.
- **HU2-4** Ordre des pages SMART par le manifeste ; repli numérique quand il manque.
- **HU2-5** Budget de taille (N17) : 20 Ko pour le lot 2, 80 Ko pour le lot 3 ; estimation, pas mesure.

## 5. Décisions d'architecture

**DA3 — Le `.olf` se lit en TypeScript.**
Contexte : `content.json` est du JSON ; `formats` n'a ni `serde` ni lecteur JSON, sa marge (121 196 o) sert au lot 3.
Décision : `app/olf-read.ts` (`readOlf`) transforme le JSON en `BoardListPage[]` du lot 1, puis `buildBoardDocument`.
Écart à U23 assumé, comme D3 du lot 1 ; aucune entité, aucun script dans du JSON ; bornes N13 tenues en TS.
Conséquences : 0 o dans le Wasm ; un écrivain `.olf` futur se ferait aussi en TS ; retour arrière = un module.

**DA4 — `.flipchart` : conteneur Bamboo en TypeScript, objets en Rust.**
Contexte : un `.flipchart` est un conteneur Bamboo d'entrées zlib, pages comprises (N10) ; ses images pèsent jusqu'à 12,7 Mo.
Décision : `platform/bamboo.ts` lit et décompresse (`fflate`) dans le Worker ZIP, images en `Blob` ; Rust ne reçoit
que les flux d'objets. Même partage que le lot 1 (ZIP en TS, contenu en Rust, 0266), aucune zlib ajoutée au Wasm.
Conséquences : bornes de décompression testées en vitest (`bamboo.test.ts`) ; images jamais copiées dans le Wasm.

**DA5 — Le lecteur `.flipchart` est un portage d'ActCraft dans `roomboard-formats::flipchart`.**
Contexte : U36 demande ce portage ; le format est binaire, non documenté publiquement, déjà lu par ActCraft (même auteur, U39).
Décision : module Rust neuf (`stream`, `index`, `ids`, `read`), sortie `Vec<Page>` encodée par `board::encode` :
une seule forme d'échange (BoardList) et une seule construction (`buildBoardDocument`) pour les cinq formats.
Conséquences : `flipchart.rs` ne connaît ni le `Doc` ni le ZIP ; avertissements en français dans la BoardList ; coût ≤ 80 Ko (N17).

**Découpage suggéré pour le plan**

- **Lot 2** (fusionnable seul) : T0 mesure de taille ; `safeArchivePath` (N16) ; `BoardSourceFormat` et
  `resolveBoardFormat` (N4, N5) ; dialecte SMART et `notebook_order` (N6, N7) ; `readOlf` (N8, N9) ; gestionnaires et
  `openBoard` ; essais S1 à S3 ; capture ; fidélité `.notebook` et `.olf` ; mesure de taille finale.
- **Lot 3** : T0 mesure ; `bamboo.ts` + `op: "bamboo"` (N11, N13) ; générateur de test (N19) ; `flipchart::stream` et
  `index` ; `flipchart::read` ; `FlipchartReader` et `openBoard` ; essais S4 et S5 ; fidélité `.flipchart` ;
  `THIRD_PARTY_NOTICES.md` ; mesure de taille finale.

## 6. Scénarios d'acceptation

**Lot 2**

- **S1 — `.notebook` déposé.** Déposer un `.notebook` généré de 2 pages (manifeste qui met `page1.svg` avant
  `page0.svg`, rectangle en `path` rempli, ellipse, texte gras à `tspan` imbriqués, image `images/a%20b[1].png`, un
  objet `flash`) : un onglet `<nom>.roomboard` s'ouvre, pages dans l'ordre du manifeste, rectangle rempli, image
  visible, avis « Flash non lu » ; le texte est éditable.
- **S2 — `.olf` déposé.** Déposer un `.olf` généré de 3840 × 2160 (trait avec matrice, image avec matrice, zone de
  texte à deux paragraphes, fond couleur, un `widget-player`) : un onglet s'ouvre, le trait et l'image sont à leur
  place à l'échelle 1920, le fond a sa couleur, l'avis dit « widget non lu ».
- **S3 — Détection, enregistrement, hostiles.** Un `.olf` renommé `.notebook` s'ouvre comme `.olf` ; un `.notebook`
  sans page est refusé avec message ; un `.notebook` avec `<!DOCTYPE … SYSTEM "file:///etc/passwd">`, un `<script>` et
  une entrée `../evil.png` : rien d'externe, rien d'exécuté, entrée refusée, zéro requête hors origine ; un
  `content.json` invalide : « fichier endommagé ». Enregistrer l'onglet du S1 en `.roomboard`, le rouvrir : identique ;
  `socle-v1.roomboard` s'ouvre comme avant ; `#stage` ≥ 640 px de large et de haut avec l'avis visible.

**Lot 3**

- **S4 — `.flipchart` déposé.** Déposer un `.flipchart` généré (2 pages en `.fpg`, un trait, une ligne, un rectangle
  plein, un texte à deux runs, une image PNG, une image TIFF, une action) : un onglet s'ouvre avec 2 pages, objets à
  leur place, avis « image TIFF non lue » et « action non lue » ; enregistrer en `.roomboard` et rouvrir : identique ;
  `#stage` ≥ 640 px.
- **S5 — `.flipchart` hostiles.** Refus avec message, sans gel ni plantage du Worker : entrée qCompress qui annonce
  1 Ko et décompresse 300 Mio (bombe) ; taille annoncée plus grande que la réalité ; taille annoncée au-delà du budget
  (rien décompressé) ; `.fpg` dans un `.fpg` ; 20 001 entrées ; chaîne UTF-16 de longueur impaire ; flux d'objets à
  longueur mensongère et à 40 niveaux d'imbrication (objets au-delà de 32 sautés, avertis) ; un `.flipchart` sans
  signature Bamboo ; un `.txt` renommé `.flipchart`.

## 7. Hors périmètre

- Écrivains `.notebook`, `.olf`, `.flipchart` (N2, Q5) ; export : celui du lot 1 (`.iwb`, `.ubz`) et le PDF, inchangés.
- Décodage TIFF, EMF, WMF (N14) ; médias (son, vidéo, Flash) vers C14 ; miniatures `.thm` comme fond de page.
- Grille, actions, étiquettes, connecteurs, MathML, rideau et projecteur du `.flipchart` (HU2-2) ; questionnaires et
  galeries SMART ; `.xbk`, `.gallery`, `.enb`, `.vboard`, `.flp`, `.as4a` (message d'U36 inchangé).
- Niveau R du `.ubz` (D20 du lot 1) ; essais dans SMART, ActivInspire, myViewBoard réels ; build Tauri ou Android.
- Amendement de la § 10 de `docs/plans/usage-cadrage.md` (N2, N14) : par l'orchestrateur à la clôture.

## 8. Portes immédiates

Aucune.
