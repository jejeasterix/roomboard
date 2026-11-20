# Cadrage — usage-c14-media (C14 : vidéo et son)

Cadrage autonome (OD87) : aucune question n'a pu parvenir à Jérôme ; chaque point est tranché ici, avec sa source ou
en hypothèse « à revoir ». Les décisions déjà prises par `docs/plans/usage-cadrage.md` sont **citées, pas refaites** :
U26 (seuils, `:79`), U37 (élément `media`, `:90`), U4 (`linked` dans la métadonnée d'asset, `:57`), U23 (chaîne
d'import, `:76`), U25 (un objet se pose sur la page montrée, `:78`), U39 (licences, `:92`), DAU5 (`:367-374`), lignes de
formats (`:609-610`), ligne C14 du découpage (`:561`), S16 (`:465-467`). Ce cadrage ne tranche que ce qu'elles laissent
ouvert.

## 1. Demande et gabarit

**Demande** : après C14, une vidéo ou un son déposé devient un élément `media` sur la page montrée, lu dans la page avec
les commandes RoomBoard (lecture, pause, rognage du début et de la fin, boucle, volume), inclus dans le `.roomboard`
jusqu'à 50 Mo, lié en coque au-delà (chemin relatif + empreinte, avertissement « vidéo non incluse »), refusé sur le web
au-delà de 100 Mo ; MKV et AVI donnent un message ; aucun ffmpeg, aucune conversion.

**Gabarit** : `chantier` (40 questions au plus ; 38 tranchées ci-dessous).

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| M1 | Ce qui est déjà décidé | Champs (`asset` ou lien, `mediaType`, `poster`, `trimStart`, `trimEnd`, `loop`, `volume`), lecture par `<video>` / `<audio>` de la WebView, image dessinée dans le canvas pendant la lecture, commandes RoomBoard, MKV/AVI : message, aucun ffmpeg embarqué, CSP `media-src 'self' blob:` + protocole d'assets ; seuils 50 Mo / lié en coque / 100 Mo web ; formats MP4 (H.264/AAC), WebM, MOV, MP3, WAV, OGG « lecture selon la plateforme ». | U37 `usage-cadrage.md:90` ; U26 `:79` ; `:609-610` ; brief OD87 | oui |
| M2 | Forme de l'élément | `Y.Map` d'élément : `id`, `kind: "media"`, `transform`, `asset` (empreinte), `mediaType` (`"video"` ou `"audio"`), `w`, `h` (boîte locale, px source pour une vidéo), `duration` (s, ≥ 0 ; 0 = inconnue), `poster` (empreinte, facultatif), `trimStart` (s, absent = 0), `trimEnd` (s, absent = fin), `loop` (booléen, absent = faux), `volume` (0 à 1, absent = 1). Valeurs neutres **retirées** à l'écriture. Champs scalaires, jamais `Any::Map`. `w`, `h`, `duration` s'ajoutent aux champs d'U37 : la boîte est exigée par la collision (`query.rs:113`) et par le cadre inconnu d'une version d'avant C14 (`element.rs:294-300`, lit `w`, `h`). | U37 ; U3 (`usage-cadrage.md:56`, champs facultatifs) ; patron C5 I2 (`feat/usage-c5-image:docs/plans/usage-c5-image-cadrage.md:23`) | oui jusqu'à la release |
| M3 | Où vit le lien | Dans la **métadonnée d'asset** de la racine `assets` : champ `linked` (chemin), écrit dans la transaction d'`AddMedia` ; l'élément ne cite que l'empreinte (`asset`), comme une image. Aucun champ ajouté à `AssetInfo` (30 constructions dans le cœur) : lecture par `Document::linked_assets()`. `copy_asset_meta` recopie déjà les champs inconnus (`copy.rs:102-118`). | U4 `usage-cadrage.md:57` (« `linked` (chemin relatif + empreinte, coque seulement) ») | oui |
| M4 | Unités | Temps en **secondes** (nombre, arrondi à la milliseconde par la page), volume de **0 à 1** (pas de 0,01) : les unités de `HTMLMediaElement.currentTime` et `.volume`, sans conversion. | hypothèse H2-1 | oui jusqu'à la release |
| M5 | Commandes du cœur | `AddMedia { page, asset: AssetRef, linked: Option<String>, media_type, w, h, duration, poster: Option<AssetRef>, matrix }` : élément + métadonnées (média, poster) en **une transaction, une étape**. `SetMedia { id, trim_start, trim_end: Option<f64>, looped, volume }` : **état voulu complet** des réglages, remplacé en bloc, une étape ; même état : aucune étape (D38). Refus `BadMedia` sans transaction. | brief (« une étape d'annulation par réglage ») ; patron `SetGrid` G5 (`commands.rs:100-104`) et C5 I6 ; D38 | oui |
| M6 | Domaines | `w`, `h` finis > 0 et tenus en f32 (`fits_f32`, `element.rs:263`) ; `duration` fini ≥ 0 ; `trim_start` ≥ 0 ; `trim_end` > `trim_start` ; si `duration` > 0 : `trim_end` ≤ `duration` et `trim_start` < `duration` ; `volume` dans [0, 1] ; `linked` non vide, 4 096 caractères au plus ; `asset` et `poster` par `valid_asset` (`commands.rs:471`). Lecture tolérante : champ facultatif illisible = absent ; `asset`, `mediaType` (hors `video`/`audio`), `w` ou `h` illisibles → **cadre inconnu**, jamais `None` (patron du tableau T2, `document.rs:348-360`). | U3 ; T2 de C10a | oui |
| M7 | Code du cœur | Module neuf `crates/roomboard-core/src/media.rs` (`MediaView`, `read_media`, `cmd_add_media`, `cmd_set_media`, `linked_assets`, `relink_assets`) ; `commands.rs` ne reçoit que les variantes, `BadMedia` et les bras d'`apply` ; `element.rs` : `KNOWN_KINDS` et le champ `media` d'`ElementView`. | patron `fill.rs` (C6a D24) et C5 I7 | oui |
| M8 | `KNOWN_KINDS` | `"media"` ajouté aux trois endroits du constat ouvert (`element.rs:29`, match de `document.rs:341`, `element_geom` de `query.rs`) et au `KNOWN_KINDS` du faux cœur (`fake-core.ts:159`) ; le test I3 (`document.rs:1231-1280`, chaque `kind` connu a sa vue) reçoit le cas `media` : il garde le constat de s'aggraver. | constat `architecture-constats.md` (`element.rs:25`) ; `document.rs:1231` | oui |
| M9 | Lecture et écriture de l'asset média | **Rien dans le module `formats`** : son conteneur est déjà générique. Écriture : toute empreinte, tout type ; type inconnu = `assets/<id>.bin` en deflate (`container.rs:60-65`, `:73-108`) ; MP4 et WebM y sont déjà en « stored » (`container.rs:31-32`). Lecture : l'extension est ignorée, l'empreinte recalculée (`container.rs:114-170`), 512 Mio par entrée (`:15`). Le type revient par la métadonnée (`typed`, `container-io.ts:42`, `:94`). MOV, MP3, OGG, WAV s'écrivent donc en `.bin` deflate. | brief (« n'y mets rien ») ; `container.rs` | oui |
| M10 | Détection par octets magiques | Fonction pure `sniffMedia(head, name)` sur les 4 096 premiers octets (`HEAD_BYTES`, `image-import.ts:29`) : `ftyp` en +4 avec marque majeure `qt  ` → MOV (`video/quicktime`) ; `M4A `, `M4B ` → `audio/mp4` ; toute autre marque **sauf** les marques d'image (`avif`, `avis`, `heic`, `heix`, `hevc`, `hevx`, `heim`, `heis`, `mif1`, `msf1`, `mif2`) → MP4 (`video/mp4`) ; atome `moov`, `mdat`, `wide`, `free` en +4 avec un nom `.mov` → MOV ; EBML `1A 45 DF A3` avec DocType `webm` → `video/webm`, `matroska` → MKV ; `RIFF`…`WAVE` → `audio/wav`, `RIFF`…`AVI ` → AVI ; `OggS` → `audio/ogg` ; `ID3` ou synchro MPEG couche III (`FF`, `(b1 & 0xE6) == 0xE2`) → `audio/mpeg`. L'extension ne départage que le MOV sans `ftyp`. | U23 (« détection par octets magiques (premiers Ko) puis extension ») | oui |
| M11 | Place dans le registre | `mediaHandler` **avant** `imageHandler` (`import.ts:199-205`) : un MP4 et un HEIC commencent tous deux par `ftyp` ; la marque majeure les départage (M10), et `sniffImage` regarde aussi les marques compatibles (`image-import.ts:62-67`). `unsupportedMediaHandler` (MKV, AVI) juste après lui. | `image-import.ts:62-67` | oui |
| M12 | MKV et AVI | `unsupportedMediaHandler` : « `<nom>` : format MKV (ou AVI) non lu par RoomBoard ; convertissez-le en MP4 ou WebM », compté en échec, rien n'est lu au-delà de l'en-tête. Aucune conversion. | `usage-cadrage.md:610` ; brief | oui |
| M13 | Inclus, lié, refusé | Coque, fichier avec chemin : ≤ 50 Mo **inclus**, > 50 Mo **lié**. Web (aucun chemin, `files.ts:55`) : ≤ 100 Mo inclus, > 100 Mo refusé par le contrôle existant (`WEB_MAX_BYTES`, `import.ts:18`, `:217-220`). Coque sans chemin (collage) : inclus jusqu'à 100 Mo, refusé au-delà (« trop lourd pour être inclus »), par le `limit` du gestionnaire (`import.ts:250-254`). Les mêmes seuils valent pour le son. | U26 ; ligne C2 (`usage-cadrage.md:545`, « web et iPad : pas de chemin (pas de vidéo liée), 100 Mo ») | oui (HU1-7) |
| M14 | Vidéo liée sans lecture complète | `ImportHandler` gagne un champ facultatif `link?: { aboveBytes, run(file, ctx) }`, contrôlé par `importFiles` **avant** `limit` et avant `f.blob()` : fichier avec `path` et `size > aboveBytes` → `link.run` reçoit le contexte **sans** `blob` (DAM4). Une vidéo de 300 Mo déposée n'est jamais lue en entier par la page. | U23 (« en coque, `blob()` lit par morceaux ») ; OD56 (`import.ts:231`, « un fichier non reconnu n'est jamais lu en entier ») | oui |
| M15 | Sonde, poster, codec | Avant tout `put` : `<video>` hors DOM sur l'URL (`blob:` ou protocole d'assets), `preload="metadata"`, `muted`, `playsInline` ; attente de `loadedmetadata` (15 s au plus) ; **durée `Infinity`** (WebM de MediaRecorder sans durée) corrigée par un saut à la fin et `durationchange`, sinon `duration: 0`. Vidéo : poster pris à `min(1 s, durée / 10)` après `seeked`, réduit à 1 920 px de côté, JPEG qualité 0,85, mis au magasin. Erreur ou délai dépassé : « `<nom>` : codec non lu sur ce poste », rien n'est inséré. | U37 (« codecs selon la plateforme ») ; hypothèses H1-5, H2-2 | oui |
| M16 | Son | `mediaType` décidé par la sonde : `videoWidth == 0` → `"audio"`, quel que soit le conteneur (OGG, WebM ou MP4 peuvent porter l'un ou l'autre). Boîte d'un son : 480 × 120 unités monde, aucun poster. Lu par le même `HTMLVideoElement` (il lit aussi le son seul). | U37 (« `<video>` / `<audio>` ») ; hypothèse H2-3 | oui |
| M17 | Placement | `anchorOf`, `visibleOf`, `placement` d'`image-import.ts:195-224` réutilisés tels quels (80 % du visible, cascade de 24) ; cible `ImageTarget` (`image-import.ts:227`) réutilisée, sans renommage (constat `image-import.ts:244` laissé ouvert : un renommage toucherait les fichiers de C5). | U25 ; `image-import.ts:195-224` | oui |
| M18 | Type du Blob | La remise du type passe par `typed` (`container-io.ts:42`), jamais par une troisième copie (constat `workspace.ts:151`). | constat `architecture-constats.md` | oui |
| M19 | Lecteurs | Module neuf `platform/media-players.ts`, un par onglet : un `HTMLVideoElement` par élément **lu** (créé au premier « Lecture »), rangé dans un conteneur caché de la session (1 × 1 px, `opacity: 0`, `pointer-events: none`) ; URL `blob:` créée à la demande et révoquée au `dispose`. Pause de tous au changement de page, à `deactivate` de l'onglet ; lecteur jeté quand son élément disparaît (suppression, annulation). | DA8 (seul `platform/` touche le DOM) ; `board-session.ts:366-380` ; hypothèse H1-6 | oui |
| M20 | Image dans le canvas | `Canvas2DRenderer` reçoit `media?: MediaFrames` par ses options, comme `images` (`canvas2d.ts:30-31`, `:193`) : `MediaFrames.frame(id)` rend le `HTMLVideoElement` quand un lecteur a une image (`readyState ≥ 2`), sinon null. Branche `media` à côté de la branche `image` (`canvas2d.ts:314-317`) : image du lecteur, sinon `images.bitmap(poster)` (cache existant, inchangé), sinon cadre gris ; son : carte (nom, barre d'avancement) ; badge « lecture » discret en coin tant qu'il ne joue pas. Pendant la lecture, `requestVideoFrameCallback` (repli `requestAnimationFrame`) appelle `redraw` (`board-session.ts:209`). | U37 (« image dessinée dans le canvas pendant la lecture ») ; patron R16 (`image-cache.ts:1-6`) ; design : porte visuelle | oui |
| M21 | Poster ou image courante | Poster tant que le média n'a pas été lancé dans la session de l'onglet (ou après un changement de page, qui jette l'image courante) ; en pause, l'image courante reste ; à la fin sans boucle, pause sur la dernière image du rognage. | U37 ; brief (« `poster` sinon ») ; hypothèse H2-4 | oui |
| M22 | Commandes RoomBoard | **Barre flottante du média** (`ui/MediaBar.tsx`, DAM5) : `rb-popover` calé en bas au centre de la scène, par-dessus elle, **visible seulement quand la sélection est un seul média** (un média dans un groupe : pas de barre, comme C5 I25). Contenu : Lecture/Pause, curseur de position sur toute la durée (zone rognée marquée), temps « 0:12 / 1:30 », « Début ici », « Fin ici », « Tout garder », Boucle (bascule `aria-pressed`), Volume (curseur 0-100). Aucune rangée permanente, aucun bouton dans la rangée Sélection. | brief (« pas de rangée permanente ») ; `rb.css:27` (`.rb-popover` dans la case `stage`) ; piège C10b (scène à 610 px) ; hypothèse H1-3 | oui |
| M23 | Une étape par réglage | « Début ici », « Fin ici », « Tout garder », Boucle : un `SetMedia` chacun ; Volume : un `SetMedia` au **relâché** du curseur (`change`), jamais à `input` ; lecture, pause, position : état du lecteur, jamais écrits. Après une annulation, les lecteurs relisent l'élément (version du moteur). | brief ; D38 | oui |
| M24 | Rognage à la lecture | « Lecture » part de `trimStart` si la position est hors de [`trimStart`, `trimEnd`) ; à `trimEnd` (vérifié à chaque image du lecteur) : boucle → retour à `trimStart`, sinon pause. Volume appliqué par `element.volume`. | U37 ; hypothèse H1-8 (iPad : `volume` en lecture seule) | oui |
| M25 | Entrée de la barre | La barre se branche sur la session active (`board.media`, comme `gridPanelFor(ws.active().board)`, `App.tsx:114`, `:292`) ; elle écrit par `board.engine.run` (patron `App.tsx:121`). Ni `ToolbarHost`, ni `EngineState`, ni `stage-tags.ts` ne changent (fichiers de C5). | `App.tsx:114-125` ; carte des fichiers de C5 | oui |
| M26 | Oracle des essais | `#stage[data-media]` posé par la session : `""` sans média sélectionné, sinon `<type>;<état>;<t>;<début>-<fin>;<boucle 0/1>;<volume %>`, `état` ∈ `poster`, `lecture`, `pause`, `echec`, temps au dixième. | patron `data-fond` (C12 PF15) | oui |
| M27 | CSP de la coque | `media-src 'self' blob: asset: http://asset.localhost` dans `tauri.conf.json` (`asset://localhost` sous macOS et Linux, `http://asset.localhost` sous Windows). `controle-hors-ligne.mjs` admet le schéma `asset:` dans `media-src` seulement (`SCHEME_TOKENS`, `:26-30`) ; sans cela il le refuse (« source non locale ou inconnue »). `coque-csp.test.sh` vérifie `media-src`. | U37 ; `usage-cadrage.md:150` ; `controle-hors-ligne.mjs:65-93` | oui |
| M28 | Protocole d'assets | `app.security.assetProtocol: { enable: true, scope: [] }` : **aucune portée statique** ; chaque fichier lié est accordé à l'exécution (`asset_protocol_scope().allow_file`), par la coque seule. Feature `protocol-asset` de `tauri` dans `src-tauri/Cargo.toml` (le build de Tauri refuse une configuration qui l'active sans elle) et `src-tauri/Cargo.lock` mis à jour par `cargo metadata` / `cargo fetch`, sans build. Contrôle neuf dans `controle-hors-ligne.mjs` : portée vide, feature et configuration d'accord. | U37 (« protocole d'assets pour les vidéos liées ») ; brief (« aucun build Tauri ») ; DAM2 | oui |
| M29 | Commandes de la coque | `link_media(path) -> String` : fichier accordé (`GrantedPaths`, ou portée de la boîte « Importer »), extension média, **empreinte SHA-256 calculée par morceaux de 8 Mio en Rust**, accord au protocole d'assets. `relink_media(path, size) -> bool` (ouverture) : fichier régulier, extension média, taille égale, puis accord. Logique dans `roomboard-shell` (testée par `cargo test`), `main.rs` ne fait que les brancher. `sha2` 0.10.9 ajouté à `roomboard-shell` (déjà dans les deux `Cargo.lock`). | `roomboard-shell/src/lib.rs:36-94` (patron `read_granted`) ; U39 ; hypothèse H1-4 | oui |
| M30 | Chemin relatif | Calculé à **l'enregistrement**, quand la cible est connue : `FileHost.save` passe la cible choisie à `encode(target)` (trois hôtes, une ligne chacun ; une fonction sans paramètre reste acceptée) ; cible `tauri` → chemin relatif au dossier du document (séparateur `/`, autre lecteur ou autre racine : chemin absolu), écrit par `relink_assets`, **sans étape ni version** (le document ne passe pas « modifié », `controller.ts:120-131`). Avant le premier enregistrement : chemin absolu. Fonctions pures `relativeLink`, `resolveLink` dans `platform/media-link.ts`. | U4, U26 (« chemin relatif + empreinte ») ; DAM2 | oui |
| M31 | Ouvrir un document à média lié | Coque : `resolveLink` puis `relink_media` ; trouvé → `AssetStore.link(id, chemin)` ; absent ou taille différente → avis « `<nom>` : vidéo liée introuvable (`<chemin>`) », poster dessiné, lecture grisée. Web : avis « vidéo non incluse (liée, lisible dans l'application de bureau) ». Dans les deux cas **Enregistrer reste permis** : `missingOf` ne compte plus les assets liés (`container-io.ts:45-46`, R30), et le lien est gardé. | U26 ; R30 (`container-io.ts:101`) | oui |
| M32 | Copier un média lié | Copier, couper, coller et « Exporter la sélection » (`.rbitem`) d'un média **lié** : refusés avec « vidéo liée : copie non prise en charge, déposez le fichier à nouveau » (le fragment ne sait pas porter un chemin relatif à un autre document). Un média **inclus** se copie comme une image (recopie générique, `copy.rs`). | hypothèse H1-2 | oui |
| M33 | Importer (boîte) | `IMPORT_EXTENSIONS` (`files.ts:70`) gagne `mp4`, `m4v`, `m4a`, `mov`, `webm`, `mp3`, `wav`, `ogg`, `oga`, `ogv` ; filtre renommé « Images, vidéos, sons, PDF et documents RoomBoard ». MKV et AVI hors du filtre (le dépôt les refuse avec M12). | R18 | oui |
| M34 | Export PDF, pot | Export PDF : le média s'y dessine par son **poster** (aucun `MediaFrames` dans le rendu de l'export) ; un son, par sa carte. Pot : un média reçoit le fond de page, comme une image (`fill-target.ts:5`, branche par défaut), aucun changement. | `pdf-overlay.ts:102-113` ; C6a D1 | oui |
| M35 | Compatibilité | `schema` et `formatVersion` inchangés ; champs facultatifs. **Un fichier d'avant C14 s'ouvre** : les fixtures existantes (`socle-v1`, `element-inconnu`, `grille-pr12`, `tableau-*`, `fragment-v1`, `element-inconnu-avec-asset`) restent vertes, aucune ne porte `kind: "media"` (vérifié). Une version d'avant C14 montre un média comme un cadre inconnu de taille `w` × `h` et le garde (U3). Test neuf : `media` mal formé → cadre inconnu, réenregistré à l'octet. | U3 ; brief ; `element_inconnu.rs` (patron) | oui |
| M36 | Tailles | Module principal : `media.rs` et la liaison, +25 Ko estimés, sous le plafond de 1 572 864 o (1 084 202 o mesurés après C12, `usage-c12-pdf-etat.md:105`) ; plafond inchangé. Module `formats` : **aucun octet ajouté** (M9), taille relevée égale à celle de `main` à la clôture. | H2-13 ; brief | oui |
| M37 | Licences | Aucune dépendance npm neuve ; Rust : `sha2` (déjà accepté) dans `roomboard-shell`, `http-range` (MIT) tiré par la feature `protocol-asset`, relevé par `controle-licences.mjs` (`:147`, `src-tauri`). | U39 | oui |
| M38 | Essai e2e | Chromium Linux de Playwright, codecs H.264 possiblement absents : **vidéo et son générés dans le test**, jamais téléchargés — WebM VP8 par `canvas.captureStream()` + `MediaRecorder` dans une page vierge (sans la CSP), couleurs qui changent toutes les 0,5 s pour l'oracle de pixels ; WAV PCM 16 bits écrit à la main en Node. Script `scripts/essais/c14-media-navigateur.mjs`, appelé par `verifier.sh --e2e`, capture `docs/essais/c14-media-lecture.png` avec `--captures`. | brief ; patron `c12-pdf-navigateur.mjs:1-6` | oui |

## 3. Carte d'impact

Rubriques : le profil n'a pas de ligne « Surfaces d'impact » ; déduites de la recherche (aucun graphe graphify pour
RoomBoard : `~/.cache/graphes/` ne contient que `claude-config`, `roomflow2`, `roomflow2-web`). Toutes les entrées V ont
été lues dans le code de `origin/main` @ 9549785.

### Cœur Rust (`crates/roomboard-core`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/media.rs` (neuf) | oui | M2, M5-M7 : vue, lecture tolérante, `cmd_add_media`, `cmd_set_media`, `linked_assets`, `relink_assets` | S |
| `src/lib.rs:1-16` | oui | `pub mod media;` (après `ink`, ligne distincte de `image` de C5) | V |
| `src/element.rs:29` (`KNOWN_KINDS`) | oui | `"media"` (M8) | V |
| `src/element.rs:78-117` (`ElementView`, `bare`) | oui | champ `media: Option<MediaView>` | V |
| `src/element.rs:268-300` (`read_image`, `read_unknown`, `unknown_view`) | non | `read_unknown` rend `None` pour `media` dès M8 ; `unknown_view` sert de repli (M6) | V |
| `src/document.rs:341-346` (match d'`element`) | oui | bras `media`, repli cadre inconnu (M6) | V |
| `src/document.rs:93-105` (`write_asset_meta`) | oui | écrit `linked` quand il est donné (M3) ; seulement si la métadonnée est absente, comme aujourd'hui | V |
| `src/document.rs:240-245` (`cited_assets`) | non | parcours générique : `asset` et `poster` d'un média sont cités sans changement | V |
| `src/document.rs:1231-1280` (test I3) | oui | cas `media` (M8) | V |
| `src/query.rs:113-165` (`element_geom`) | oui | boîte `w` × `h` d'un média ; bras placé **après le tableau** (`:124-137`), pas à côté de l'image (`:146-151`, réécrite par C5) | V |
| `src/commands.rs:30-215` (`Command`), `:238-290` (`CommandError`), `:597` (`apply`) | oui | `AddMedia`, `SetMedia`, `BadMedia` et son message ; variantes **en fin d'énumération** | V |
| `src/commands.rs:471-475` (`valid_asset`) | non | réutilisé pour `asset` et `poster` | V |
| `src/history.rs:19-31` | non | `relink_assets` écrit sans origine : hors historique par construction (`tracked_origins` = `LOCAL`) | V |
| `src/copy.rs:102-118` (`copy_asset_meta`) | non | recopie déjà `linked` (champs inconnus compris) ; test ajouté : copier un média inclus | V |
| `src/fill.rs` | non | un média n'est pas une cible de contour ni d'intérieur | V |
| `src/asset.rs:16-35` (`AssetInfo`) | non | volontairement inchangé (M3) | V |
| `src/format/mod.rs` | non | manifeste et `document.ybin` inchangés | V |

### Liaison Wasm et types de la page (`crates/roomboard-wasm`, `apps/web/src/core`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `roomboard-wasm/src/lib.rs:107-114` (`asset_ref`) | non | réutilisé | V |
| `roomboard-wasm/src/lib.rs:540-556` (`add_image`), voisinage | oui | `add_media`, `set_media`, `linked_assets`, `relink_assets`, chacun par une `_inner` testée en natif | V |
| `core/api.ts:24` (`ElementKind`), `:76` (`Command`), `:151` (`ImageData`), `:192-197` (`ElementView`), `:234-235` | oui | `MediaData`, `MediaElement`, commandes `AddMedia` / `SetMedia`, `linkedAssets()`, `relinkAssets()` | V |
| `core/wasm-core.ts:196-201` (`toElementView`), `:370-373` (`apply`) | oui | lecture contrôlée de `media`, bras des deux commandes | V |
| `core/fake-core.ts:159` (`KNOWN_KINDS`), `:682` (`AddImage`), `:1027`, `:1319`, `:1419-1427` | oui | parité : `media` connu, `AddMedia`, `SetMedia`, vue, recopie | V |
| `core/wasm-core.contract.test.ts:147-154` | oui | contrat `describe.each` des commandes et de la vue ; `kind: "video3d"` reste inconnu | V |
| `core/asset-store.ts:15-58` | oui | `link(id, path)`, `linked(id)` (M31, DAM2) ; `put`, `get`, `has`, `pick` inchangés | V |

### Import (`apps/web/src/platform`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `platform/media-import.ts` (neuf) | oui | `sniffMedia`, `probeMedia`, `capturePoster`, `mediaHandler`, `unsupportedMediaHandler` (M10-M16) | S |
| `platform/import.ts:68-77` (`ImportHandler`) | oui | champ facultatif `link` (M14, DAM4) | V |
| `platform/import.ts:196-205` (registre), `:249-262` (boucle) | oui | ordre (M11), branche `link` avant `limit` et `f.blob()` ; dépendances `probe?`, `linkMedia?` dans `ImportDeps` | V |
| `platform/import.ts:217-220`, `:270` (`WEB_MAX_BYTES`, `tooBigMessage`) | non | refus web > 100 Mo réutilisé (M13) | V |
| `platform/image-import.ts:29`, `:195-245` (`HEAD_BYTES`, placement, `ImageTarget`) | non | réutilisés (M17) | V |
| `platform/image-import.ts:54-70` (`sniffImage`) | non | les marques d'image restent les siennes ; M11 met le média avant | V |
| `platform/files.ts:69-71` (`IMPORT_EXTENSIONS`, `IMPORT_FILTER`) | oui | M33 | V |
| `platform/files.ts:73-86` (`FileHost.save`) | oui | `encode(target)` (M30) | V |
| `platform/host-tauri.ts:156-163` (`save`), `:146-154` (`pick`) | oui | cible passée à `encode` ; `linkMedia`, `relinkMedia`, `mediaUrl` (`convertFileSrc` de `@tauri-apps/api` 2.12.5, déjà en dépendance) ; `pick` inchangé (H2-6) | V |
| `platform/host-fsa.ts:106`, `platform/host-repli.ts:53` (`save`) | oui | cible passée à `encode` | V |
| `platform/drop-web.ts`, `platform/paste.ts` | non | `DroppedFile` sans `path` : inclus ou refusé | V |
| `platform/media-players.ts` (neuf) | oui | M19-M21, M24 | S |
| `platform/media-link.ts` (neuf) | oui | `relativeLink`, `resolveLink` (M30) | S |
| `platform/container.ts` | non | aucun changement (fichier touché par C5) | V |
| `platform/controller.ts:120-131` | non | la version lue avant l'écriture reste juste : `relink_assets` ne la change pas (M30) | V |

### Rendu et interface (`apps/web/src/engine`, `app`, `ui`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `engine/render/media-frames.ts` (neuf) | oui | interface `MediaFrames` (DAM3) | S |
| `engine/render/canvas2d.ts:30-31`, `:193` (options), `:314-317` (branche image) | oui | option `media`, branche `media` voisine (M20) | V |
| `engine/render/image-cache.ts:9-57` | non | `bitmap(poster)` réutilisé tel quel (fichier réécrit par C5) | V |
| `engine/render/renderer.ts:62-77` (`Renderer`) | non | aucun changement d'interface : `MediaFrames` passe par les options | V |
| `engine/render/webgl2.ts:272` | non | délègue la scène au Canvas 2D | V |
| `engine/render/fake-ctx.ts` | non | `drawImage` à 5 arguments suffit | S |
| `engine/engine.ts:23-60` (`EngineState`), `:121`, `:646` (`redraw`) | non | `redraw` réutilisé ; aucun champ d'état neuf (M25) | V |
| `engine/fill-target.ts:5`, `:69-75` | non | média → fond de page (M34) | V |
| `app/board-session.ts:139-141`, `:209`, `:366-380` | oui | `MediaPlayers` par onglet, branché sur `redraw`, pause à `deactivate` et au changement de page, `dispose` ; `board.media` ; `#stage[data-media]` | V |
| `app/container-io.ts:45-46` (`missingOf`), `:56-62` (`encode`), `:94-102` (`read`) | oui | liés hors du compte des absents, refus du fragment à média lié (M32), résolution à l'ouverture (M31) | V |
| `app/workspace.ts:254` (`encode`) | oui | reçoit la cible, appelle `relinkAssets` (M30) | V |
| `app/fragments.ts`, `platform/clipboard.ts` | non | le refus passe par `container-io.ts` (M32) | S |
| `app/pdf-overlay.ts`, `app/pdf-overlay-vector.ts`, `app/pdf-export.ts` | non | poster dessiné par la branche `media` sans `MediaFrames` (M34) | S |
| `app/stage-tags.ts:21` | non | `data-media` posé ailleurs (fichier touché par C5) | V |
| `app/toolbar-host.ts` | non | M25 | V |
| `ui/MediaBar.tsx` (neuf) | oui | M22 | S |
| `ui/App.tsx:114-125`, `:290-293` | oui | `<Show>` de la barre, branchée sur `ws.active().board.media` | V |
| `ui/rb.css:27` | oui | `.rb-media-bar` (calage en bas au centre) | V |
| `ui/SelectionRow.tsx` | non | aucun bouton neuf (M22) | V |

### Coque Tauri (`apps/desktop/src-tauri`, `crates/roomboard-shell`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `tauri.conf.json:12-22` (`csp`) | oui | `media-src` (M27) | V |
| `tauri.conf.json` (`app.security.assetProtocol`) | oui | M28 | V |
| `src-tauri/Cargo.toml:11` (`tauri`) | oui | feature `protocol-asset` | V |
| `src-tauri/Cargo.lock` | oui | `http-range` ajouté, sans build | S |
| `src-tauri/src/main.rs:39-54`, `:129-134` | oui | `link_media`, `relink_media` branchés | V |
| `src-tauri/capabilities/default.json` | non | commandes de l'application, comme `read_granted_file` ; description complétée | V |
| `crates/roomboard-shell/src/lib.rs:36-94`, `Cargo.toml` | oui | `sha256_granted`, `check_linked_media`, `MEDIA_EXTENSIONS`, dépendance `sha2` | V |

### Persistance et autres modules

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-formats/src/container.rs` | non | M9 | V |
| `crates/roomboard-formats-wasm/src/lib.rs` | non | M9 (fichier touché par C5) | V |
| `crates/roomboard-formats/tests/container.rs:241-242` | non | test vert à garder | V |

### Contrôles et scripts

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/controle-hors-ligne.mjs:26-30`, `:65-93` | oui | `asset:` admis dans `media-src` ; contrôle du protocole d'assets (M28) | V |
| `scripts/tests/coque-csp.test.sh` | oui | `media-src 'self' blob:` exigé | V |
| `scripts/tests/controle-hors-ligne.test.sh` | oui | cas `asset:` hors `media-src` refusé, portée non vide refusée | S |
| `scripts/controle-licences.mjs:147`, `scripts/licences-acceptees.json` | oui | `http-range` relevé (MIT) | V |
| `scripts/verifier.sh:54-71` (tailles) | non | plafonds inchangés | V |
| `scripts/verifier.sh:98-106` (essais) | oui | une ligne `c14-media-navigateur.mjs` | V |
| `scripts/essais/commun.mjs:101` (`stageBox`), `:143` (`dropFile`), `:159` (`coqueCsp`) | non | réutilisés ; générateurs WebM et WAV dans le script de C14 (fichier touché par C5) | V |
| `THIRD_PARTY_NOTICES.md` | oui | `http-range` | S |

### Tests

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core/src/media.rs` (tests) | oui | domaines, une étape, neutres retirés, D38, repli inconnu | S |
| `crates/roomboard-core/tests/compat_socle.rs`, `compat_c3.rs`, `compat_grille_pr12.rs`, `element_inconnu.rs`, `scenarios.rs`, `tableau*.rs`, `pot.rs`, `texte_riche.rs` | non | à garder verts (M35) | V |
| `crates/roomboard-core/tests/media.rs` (neuf) | oui | aller-retour `.ybin`, média mal formé → inconnu réenregistré à l'octet | S |
| `crates/roomboard-shell/src/lib.rs` (tests) | oui | empreinte par morceaux, refus non accordé, extension, taille | V |
| `apps/web/src/platform/import.test.ts`, `image-import.test.ts` | oui | ordre du registre, HEIC toujours image, branche `link` | V |
| `apps/web/src/platform/media-import.test.ts`, `media-players.test.ts`, `media-link.test.ts`, `ui/MediaBar.test.tsx` (neufs) | oui | M10-M26, M30 | S |
| `apps/web/src/app/container-io.test.ts`, `workspace.test.ts`, `board-session.test.ts` | oui | liés, relink silencieux, pause au changement de page | V |
| `apps/web/src/engine/render/canvas2d.test.ts` | oui | branche `media` ; `:928` (fond `kind: "video"` inconnu) reste vert | V |
| `apps/web/src/platform/host-*.test.ts`, `controller.test.ts` | oui | `encode(target)` | V |
| `scripts/essais/c2-image-navigateur.mjs`, `c12-pdf-navigateur.mjs`, autres essais | non | à garder verts (dépôt d'image et de PDF inchangés) | V |

### Effets de bord sur l'existant

- **HEIC et AVIF** passent après le gestionnaire média : un `ftyp` de marque majeure d'image reste une image. Test :
  `import.test.ts`, « un HEIC et un AVIF restent des images après l'ajout du média ».
- **Enregistrer refusé (R30)** ne compte plus un asset lié comme absent : un document dont une image manque reste
  refusé. Test : `container-io.test.ts`, « asset lié : Enregistrer permis ; image absente : refusé ».
- **`FileHost.save`** passe la cible à `encode` : les trois hôtes, `controller.ts` inchangé. Tests : `host-tauri.test.ts`,
  `host-fsa.test.ts`, `host-repli.test.ts`, « encode reçoit la cible choisie ».
- **Document à média lié enregistré** : il ne passe pas « modifié ». Test : `workspace.test.ts`, « enregistrer un
  document à média lié le laisse non modifié ».
- **Fichier sans `kind` connu** : `kind: "media"` cesse d'être un cadre inconnu pour cette version ; un `media` mal formé
  le reste. Test : `crates/roomboard-core/tests/media.rs`, « media mal formé : cadre inconnu, octets gardés ».
- **CSP de la coque** élargie à `media-src` : les essais e2e la servent déjà (`coqueCsp`). Test :
  `controle-hors-ligne.test.sh` et `coque-csp.test.sh`.
- **Filtre « Importer »** élargi : les images et PDF restent proposés. Test : `files.test.ts`, extensions du filtre.

### Chantiers en cours

- **OD86 — C5 édition d'image** (`feat/usage-c5-image`, worktrees `~/projets/roomboard-wt/usage-c5-image`,
  `usage-c5-image--T10`, `usage-c5-image--T2` ; aucune PR ouverte, `gh pr list` vide). Fichiers communs probables, lus
  par `git diff origin/main...feat/usage-c5-image --stat` et son cadrage :
  - `crates/roomboard-core/src/element.rs` (C5 : `ImageView`, `read_image` ; C14 : `KNOWN_KINDS`, `ElementView`) ;
  - `crates/roomboard-core/src/commands.rs` (variantes et erreurs ajoutées toutes deux : C14 les met en fin d'énumération) ;
  - `crates/roomboard-core/src/query.rs` (C5 : `:146-151` ; C14 : bras après le tableau) ;
  - `crates/roomboard-core/src/lib.rs`, `document.rs` (une ligne chacun de part et d'autre) ;
  - `crates/roomboard-wasm/src/lib.rs` (voisinage d'`add_image`) ;
  - `apps/web/src/core/api.ts`, `wasm-core.ts`, `fake-core.ts`, `wasm-core.contract.test.ts` ;
  - `apps/web/src/engine/render/canvas2d.ts` et `canvas2d.test.ts` (C5 réécrit la branche image ; C14 ajoute une
    branche voisine) ;
  - `apps/web/src/app/board-session.ts`, `apps/web/src/ui/App.tsx`, `apps/web/src/ui/rb.css` ;
  - `scripts/verifier.sh` (une ligne d'essai chacun, à la même place).
  Évités par décision : `image-cache.ts`, `renderer.ts`, `webgl2.ts`, `container.ts`, `roomboard-formats*`,
  `engine.ts`, `stage-tags.ts`, `toolbar-host.ts`, `SelectionRow.tsx`, `scripts/essais/commun.mjs`. Le second des deux
  chantiers à fusionner rebase sur l'autre (`rebase-feature-branch`), conflits attendus de quelques lignes.
- Aucun autre worktree ni PR (`git worktree list` : `main`, C14, trois de C5).

### Termes cherchés

Graphe : aucun pour RoomBoard (`ls ~/.cache/graphes/`). Recherche texte (`grep -rn`), dans `apps/`, `crates/`,
`scripts/` :
`media`, `video`, `audio`, `media-src`, `"media"`, `MediaRecorder`, `captureStream`, `HTMLVideoElement`, `poster`,
`KNOWN_KINDS`, `"image"`, `AddImage`, `ImageView`, `read_image`, `AssetRef {`, `AssetInfo {`, `linked`, `relink`,
`write_asset_meta`, `copy_asset_meta`, `cited_assets`, `missingOf`, `typed`, `MissingAssetError`, `ImportHandler`,
`limit`, `HEAD_BYTES`, `sniffImage`, `ftyp`, `ZIP_MAGIC`, `PDF_MAGIC`, `IMPORT_EXTENSIONS`, `IMPORT_FILTER`, `WEB_MAX_BYTES`,
`createImageCache`, `ImageSource`, `redraw`, `requestVideoFrameCallback`, `requestAnimationFrame`, `deactivate`,
`rb-popover`, `gridPanelFor`, `stageTags`, `data-fond`, `getImageData`, `toBlob`, `convertFileSrc`, `assetProtocol`,
`protocol-asset`, `http-range`, `sha2`, `read_granted`, `GrantedPaths`, `scopeDroppedPaths`, `SCHEME_TOKENS`,
`coqueCsp`, `stageBox`, `dropFile`, `MAX_ASSET_BYTES`, `TYPES`, `extension(`, `async save(`, `encode(`, `version`.
Fixtures : `unzip` puis `strings` des `document.ybin` de `crates/*/tests/fixtures/*.roomboard` (aucun `media`).
Coffre : `chercher.js` « RoomBoard vidéo média élément media C14 », « tauri asset protocol video WebKitGTK GStreamer »,
« MediaRecorder webm durée Infinity », « RoomBoard image C5 panneau barre sélection » (aucune note de piège pertinente).

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| Entrée unique des fichiers | `platform/import.ts:196` (`createImporter`) | `ImportHandler` (`:68-77`) gagne `link?: { readonly aboveBytes: number; run(file: DroppedFile & { readonly path: string }, ctx: Omit<ImportContext, "blob">): Promise<ImportOutcome> }` | étendre |
| Refus web > 100 Mo | `platform/import.ts:18`, `:217-220` | `WEB_MAX_BYTES`, `tooBigMessage` | réutiliser |
| Plafond d'un collage en coque | `platform/import.ts:72-74` (`limit`) | `limit: { maxBytes: 100 Mo, message }` | réutiliser |
| En-tête lu avant détection | `platform/import.ts:231-238`, `image-import.ts:29` | `f.head(HEAD_BYTES)` | réutiliser |
| Placement au point de dépôt | `platform/image-import.ts:195`, `:205`, `:213` | `anchorOf`, `visibleOf`, `placement` | réutiliser |
| Onglet cible | `platform/image-import.ts:227` (`ImageTarget`) | `assets.put`, `page()`, `camera()`, `stageRect()`, `alive()`, `run()` | réutiliser |
| Type du Blob | `app/container-io.ts:42` (`typed`) | `typed(blob, mime)` | réutiliser |
| Octets des assets | `core/asset-store.ts:15-58` | `put`, `get` ; gagne `link(id: AssetId, path: string): void`, `linked(id: AssetId): string \| undefined` | étendre |
| Bitmap du poster | `engine/render/image-cache.ts:20` | `ImageSource.bitmap(poster)` | réutiliser |
| Dessin dans la scène | `engine/render/canvas2d.ts:30-31`, `:314-317` | option `media?: MediaFrames`, branche voisine de `image` | étendre |
| Redessin | `engine/engine.ts:121`, `app/board-session.ts:209` | `redraw()` | réutiliser |
| Commande et étape | `crates/roomboard-core/src/commands.rs:597` (`apply`), `history.rs` | variantes `AddMedia`, `SetMedia` | étendre |
| Métadonnée d'asset | `crates/roomboard-core/src/document.rs:93` (`write_asset_meta`) | écrit `linked` en plus, si donné | étendre |
| Validation d'asset | `crates/roomboard-core/src/commands.rs:471` (`valid_asset`) | `valid_asset(&AssetRef)` | réutiliser |
| Assets cités | `crates/roomboard-core/src/document.rs:240` (`cited_assets`) | parcours générique (`asset`, `poster`) | réutiliser |
| Recopie (copier, `.rbitem`) | `crates/roomboard-core/src/copy.rs:102-118` | `copy_asset_meta` (garde `linked`) | réutiliser |
| Cadre d'un média mal formé | `crates/roomboard-core/src/element.rs:283` (`unknown_view`) | `unknown_view(txn, e)` | réutiliser |
| Écriture et lecture de l'asset dans le `.roomboard` | `crates/roomboard-formats/src/container.rs:73`, `:114` | `write`, `read` (génériques) | réutiliser |
| Absents à l'enregistrement | `app/container-io.ts:45` (`missingOf`) | exclut les ids de `doc.linkedAssets()` | étendre |
| Enregistrer | `platform/files.ts:83` (`FileHost.save`) | `save(encode: (target: SaveTarget) => Promise<Uint8Array>, target)` | étendre |
| Lecture accordée de la coque | `crates/roomboard-shell/src/lib.rs:56` (`granted_path`), `:72` (`read_granted`) | `granted_path` ; patron de `read_granted` pour `sha256_granted(g: &GrantedPaths, path: &Path) -> Result<String, ReadError>` | étendre |
| Contrôle de la CSP | `scripts/controle-hors-ligne.mjs:65` (`checkCsp`) | `SCHEME_TOKENS` + `checkAssetProtocol(conf, cargoToml): string[]` | étendre |
| CSP servie aux essais | `scripts/essais/commun.mjs:159` (`coqueCsp`) | `coqueCsp()` | réutiliser |
| Dépôt et mesure dans les essais | `scripts/essais/commun.mjs:101`, `:143` | `stageBox(page, 640)`, `dropFile(page, sel, name, bytes, type, at)` | réutiliser |
| Panneau flottant | `ui/rb.css:27` (`.rb-popover`), `ui/App.tsx:114-125` | classe `rb-popover`, patron `gridPanelFor(board)` | réutiliser |
| Détection des signatures vidéo et son | — (`sniffImage`, `hasPdfMagic`, `hasZipMagic` ne lisent que leurs formats) | `sniffMedia(head: Uint8Array, name: string): MediaSniff \| null`, `MediaSniff = { readonly format: "mp4" \| "mov" \| "webm" \| "mp3" \| "wav" \| "ogg" \| "m4a"; readonly mime: string } \| { readonly unsupported: "mkv" \| "avi" }` | nouveau module `platform/media-import.ts` : aucun module ne lit `ftyp` vidéo, EBML, RIFF WAVE/AVI, OggS, ID3 (termes `ftyp`, `EBML`, `RIFF`, `OggS`, `ID3`, `WAVE`) |
| Sonde et poster | — (`decodeImage` ne décode que des images) | `probeMedia(url: string, ports: MediaPorts): Promise<{ duration: number; width: number; height: number; poster: Blob \| null }>` | même module neuf (termes `HTMLVideoElement`, `loadedmetadata`, `poster` : rien) |
| Lecteurs et image courante | — | `MediaPlayers` (DAM3) | nouveau module `platform/media-players.ts` (termes `video`, `play(`, `currentTime` : rien) |
| Chemins relatifs | — (`baseName`, `host-tauri.ts:49`, ne rend que le nom) | `relativeLink(docPath: string, mediaPath: string): string`, `resolveLink(docPath: string, linked: string): string` | nouveau module `platform/media-link.ts` (termes `relative`, `dirname`, `join(` côté page : rien) |
| Commandes de la barre | — | `MediaBar` (props : `media: MediaElement`, `controls: MediaControls`) | nouveau composant `ui/MediaBar.tsx` (DAM5) |

## 4. Hypothèses à revoir

### Niveau 1 — difficiles à défaire ou visibles des utilisateurs

- **H1-1 (M13)** Sur le web, une vidéo de 50 à 100 Mo est **incluse** sans avertissement (aucun lien possible sans
  chemin) ; lecture d'U26 et de la ligne C2. Autre choix : refus au-delà de 50 Mo sur le web.
- **H1-2 (M32)** Copier ou exporter en `.rbitem` un média **lié** est refusé avec un message ; un média inclus se copie.
- **H1-3 (M22)** Commandes dans une barre flottante en bas au centre de la scène, visible pour un seul média
  sélectionné (outil Sélection) ; un média groupé n'a pas de barre ; jouer depuis l'outil Stylo n'est pas possible.
  Porte visuelle de fin de lot (design existant des popovers, `impeccable` à défaut).
- **H1-4 (M29, M31)** À la réouverture, une vidéo liée est reconnue par **sa taille**, pas par son empreinte (300 Mo
  relus à chaque ouverture coûteraient plusieurs secondes) ; un fichier remplacé par un autre de même taille passe.
- **H1-5 (M15)** Un codec non lu (H.264 sous Linux sans GStreamer, HEVC hors macOS) donne « codec non lu sur ce poste »
  à l'import, et rien n'est inséré ; un document qui porte un tel média ailleurs montre son poster et « lecture
  impossible sur ce poste ».
- **H1-6 (M19)** Changer de page ou d'onglet **met en pause** tous les médias de l'onglet (aucun son d'une page cachée).
- **H1-7 (M28)** Protocole d'assets sous Linux : WebKitGTK lit mal la vidéo servie par un schéma propre (non vérifié
  sur la VM, aucun build Tauri) ; une image de vidéo liée servie par `asset:` peut aussi « salir » la toile de la scène
  (origine différente) : `video.crossOrigin = "anonymous"` est posé, et une capture de poster refusée laisse le cadre
  gris. Essai réel en coque : reste.
- **H1-8 (M24)** Sur l'iPad, `volume` est en lecture seule (WebKit iOS) : le réglage s'enregistre mais n'a pas d'effet
  à la lecture ; un `GainNode` Web Audio viendra plus tard.
- **H1-9 (M30)** Le chemin relatif s'écrit à l'enregistrement, par une écriture hors historique et hors version :
  un document à média lié ouvert puis enregistré ailleurs voit son lien réécrit sans être marqué « modifié ».

### Niveau 2

- **H2-1 (M4)** Secondes et volume 0-1, unités de `HTMLMediaElement`.
- **H2-2 (M15)** Poster à `min(1 s, durée / 10)`, JPEG 0,85, 1 920 px au plus ; délai de sonde 15 s.
- **H2-3 (M16)** Boîte d'un son 480 × 120 unités monde ; carte dessinée (nom, avancement), sans forme d'onde.
- **H2-4 (M21)** En pause, l'image courante reste ; à la fin sans boucle, pause sur la dernière image.
- **H2-5 (M9)** MOV, MP3, OGG, WAV, M4A s'écrivent en `assets/<id>.bin` deflate : temps de compression perdu sur des
  octets déjà compressés ; les passer en « stored » demanderait une ligne de `TYPES` dans `formats`, refusée ici.
- **H2-6** « Importer » dans la coque lit déjà le fichier entier en mémoire (`host-tauri.ts:146-154`, inchangé) ; une
  vidéo de plus de 50 Mo choisie par la boîte est ensuite liée. Seul le dépôt ne la lit jamais en entier.
- **H2-7** Mémoire à l'enregistrement : `write_container` recopie tous les assets dans le module `formats`
  (`container.ts:109-125`) ; pour une vidéo de 100 Mo, quelque 400 Mo au pic. Mesure sur l'iPad : reste.
- **H2-8 (M13)** Les seuils de la vidéo valent pour le son.
- **H2-9** Le badge « lecture » et la marque de la zone rognée sur le curseur suivent le style des popovers existants.

## 5. Décisions d'architecture

**DAM1 — Élément `media` du cœur, réglages en état voulu.**
Contexte : U37 fixe les champs ; le brief exige une étape d'annulation par réglage et la lecture tolérante d'U3.
Décision : module `media.rs` ; `AddMedia` (élément et métadonnées, une étape) ; `SetMedia` remplace en bloc l'état des
réglages (neutres retirés, même état sans étape) ; `media` mal formé = cadre inconnu.
Conséquences : un geste de la barre = une commande = une étape ; une version d'avant C14 garde le média en cadre.

**DAM2 — Lien en coque : métadonnée `linked`, accord à l'exécution, chemin relatif écrit à l'enregistrement.**
Contexte : U4 et U26 veulent un chemin relatif + empreinte ; la cible n'est connue qu'à l'enregistrement ; la page ne
doit lire ni hacher 300 Mo.
Décision : empreinte calculée en Rust par la coque, `linked` dans la métadonnée d'asset, protocole d'assets à portée
vide accordée fichier par fichier, `relink_assets` hors historique et hors version au moment d'`encode(target)`.
Conséquences : le dossier (document + vidéo) se déplace sans casser le lien ; aucun fichier n'est lisible par la page
sans accord de la coque ; le web garde le lien sans le lire.

**DAM3 — Lecteurs hors du cœur, image dans le canvas.**
Contexte : U37 dessine l'image dans le canvas ; le cœur ne voit jamais d'octets (DAU5) ; le rendu est synchrone.
Décision : `MediaFrames { frame(elementId: string): CanvasImageSource | null }` (moteur) ; `MediaPlayers extends
MediaFrames { state(id): MediaPlayState | null; toggle(id, media: MediaData): Promise<void>; seek(id, t: number): void;
apply(id, media: MediaData): void; pauseAll(): void; onChange(cb: () => void): () => void; dispose(): void }` (plateforme).
Conséquences : la scène redessine à chaque image du lecteur ; l'export PDF et une version sans lecteur montrent le poster.

**DAM4 — Branche « lien » de la chaîne d'import.**
Contexte : `importFiles` lit tout fichier reconnu par `f.blob()` avant `run` (`import.ts:255-262`).
Décision : `ImportHandler.link?: { aboveBytes; run(file, ctx sans blob) }`, contrôlé avant `limit` et avant la lecture,
seulement pour un fichier qui a un `path`.
Conséquences : une vidéo liée n'entre jamais en mémoire ; les autres gestionnaires ne changent pas.

**DAM5 — Barre flottante du média, sans rangée.**
Contexte : la scène doit rester ≥ 640 px ; C10b l'avait fait tomber à 610 px avec des rangées ; C5 occupe la rangée
Sélection.
Décision : `ui/MediaBar.tsx` en `rb-popover` dans la case `stage`, en bas au centre, pour un seul média sélectionné,
branchée sur `board.media` et `board.engine.run`.
Conséquences : aucune hauteur prise à la scène ; aucun fichier de la barre d'outils touché ; la barre peut cacher le bas
de la scène pendant qu'un média est sélectionné.

## 6. Scénarios d'acceptation

- **S1 — Déposer et lire une vidéo.** Générer une WebM de 2 s (couleurs alternées), la déposer sur la page montrée :
  un élément `media` avec son poster ; le sélectionner : la barre apparaît, la scène mesure au moins 640 px ; Lecture :
  l'image du canvas change pendant la lecture (`data-media` à `lecture`) ; Pause : l'image s'arrête.
- **S2 — Rogner, boucler, régler le volume, annuler.** Placer le curseur à 0,5 s, « Début ici » ; à 1,5 s, « Fin ici » ;
  Boucle ; Volume à 40 % : la lecture part de 0,5 s et revient à 0,5 s après 1,5 s ; quatre Ctrl+Z défont les quatre
  réglages un par un, Ctrl+Y les rétablit.
- **S3 — Enregistrer et rouvrir, avec un son.** Déposer aussi un WAV généré : une carte de son, lisible ; enregistrer,
  rouvrir le `.roomboard` : il contient la vidéo, son poster et le son dans `assets/`, les réglages sont gardés, la
  vidéo se lit.
- **S4 — Refus et compatibilité.** Déposer un `.mkv` et un `.avi` synthétiques (en-têtes seuls) : un message chacun,
  rien d'inséré ; un fichier de 101 Mo sur le web : refus « plus de 100 Mo » ; ouvrir les fixtures d'avant C14 :
  inchangées ; un HEIC reste une image.
- **S5 — Vidéo liée dans la coque** (tests unitaires sur la VM, essai réel en reste). Déposer une vidéo de 300 Mo :
  avertissement « vidéo non incluse », lecture par le protocole d'assets ; enregistrer : le fichier ne contient pas la
  vidéo, le lien est relatif ; déplacer le dossier avec la vidéo, rouvrir : la vidéo se lit ; vidéo absente : avis et
  poster, Enregistrer reste permis.

## 7. Hors périmètre

- Montage vidéo, découpe en plusieurs morceaux, vitesse de lecture, sous-titres.
- Conversion MKV, AVI ou d'un codec non lu ; ffmpeg embarqué ou lancé (U37 « plus tard ») ; toute dépendance GPL, LGPL,
  AGPL.
- Lien vers une vidéo sur le web, enregistrement de l'écran ou de la caméra.
- Synchronisation des assets entre pairs ou fenêtres (DAU5).
- Copie d'un média lié entre documents (M32).
- Volume réel sur l'iPad (H1-8), forme d'onde d'un son.
- Build Tauri et essai réel dans la coque (Linux, Windows, macOS) : restes du chantier.
- Ligne `TYPES` du module `formats` pour MOV, MP3, OGG, WAV (H2-5).
- Constats d'architecture ouverts des zones touchées (`element.rs:25`, `image-import.ts:244`, `workspace.ts:151`) : non
  corrigés, non aggravés (M8, M17, M18).

## 8. Portes immédiates

Aucune.
