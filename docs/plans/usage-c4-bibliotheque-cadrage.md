# Cadrage — usage C4 : bibliothèque de ressources et paquets

## 1. Demande et gabarit

Un panneau « Bibliothèque » montre « Mes ressources » et « Ressources partagées » en dossiers, avec recherche par nom et
mot-clé et une vignette par ressource ; on y ajoute la sélection (`.rbitem`, U9) ou la grille de la page (`kind: "grid"`,
U31), on glisse une ressource sur la page (une étape d'annulation), on exporte un dossier en `.rbpack` et on l'importe
ailleurs avec les mêmes ressources.

Gabarit : `chantier` (budget 40 questions ; 22 tranchées). Mode autonome, arrêt ferme 13:54.

Sources appliquées telles quelles, sans rouvrir leurs décisions : `docs/plans/usage-cadrage.md` (U8 `:61`, U9 `:62`,
U25 `:78`, U31 `:84`, DAU4 `:361-366`, HU1-1 `:279`, HU1-10 `:297`, ligne C4 `:547`, S6 `:434`, S10 `:445`,
contraintes `:586`) ; étude `docs/etudes/usage-ressources.md` (§ 4.1 à 4.8, § 5) ; C3 clos
(`docs/sessions/usage-c3-groupes-etat.md:65-78`) ; C9 (`SetGrid`, `GridView`).

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| D1 | Codeur des objets | Aucun codeur neuf. Une ressource « objets » est l'octet exact que rend `FragmentOps.encodeSelection` (`.rbitem`, `kind: "fragment"`). Insertion par `FragmentOps.insertOutcome` (recopie profonde, ids neufs, une transaction). | DAU4 `usage-cadrage.md:361-366` ; C3 `fragments.ts:111-126`, `:81-108` | oui |
| D2 | Ressource « grille » | Un `.rbitem` de `kind: "grid"` est un document neuf d'une page, sans élément, qui porte la seule propriété `grid` de la page source (même conteneur, même lecteur, même migration que le fragment). Écrit en TS : document neuf, `SetGrid` avec la `GridView` de la page, puis `save_resource_parts(…, KIND_GRID, name)`. Déposé : `SetGrid` sur la page montrée, une étape (même grille : aucune étape, D38). | U8 `:61`, U31 `:84` (« grille enregistrable en ressource (`.rbitem`, `kind: "grid"`) »), U25 `:78` (« Grille → remplace la grille de la page ») ; `api.ts:133` (`SetGrid`), `:318` | oui |
| D3 | `kind` connus du cœur | `check_manifest` accepte `document`, `fragment`, `grid` ; tout autre `kind` (dont `pack`) reste refusé par `UnknownKind` (message existant, `format/mod.rs:86-89`). `WrongKind` gagne le message de la grille (« ce fichier est une grille RoomBoard : déposez-la sur une page »). | U8 (« `kind` inconnu = refus avec message clair ») ; `format/mod.rs:252-260` | oui |
| D4 | `kind: "pack"` | Lu et écrit en TS seulement (jamais par le cœur ni par `formats`) : un `.rbpack` n'a pas de `document.ybin` et n'entre jamais dans `ContainerIO`. Voir DA2. | brief (« préfère ce qui n'alourdit pas `formats` ») | oui |
| D5 | Mots-clés, description, vignette | Rangés hors du `.rbitem` en C4 : fichier compagnon `<nom>.rbitem.json` (`{name, keywords, description, kind}`) et vignette `<nom>.rbitem.png` à côté de la ressource, et dans le manifeste du `.rbpack`. Le `Manifest` Rust ne gagne aucun champ. Voir H1-2. | étude § 4.7 (« pour chaque entrée : nom, mots-clés, vignette, chemin de dossier ») ; brief (`formats` : rien) ; option la plus réversible (un champ écrit dans des fichiers se lit ensuite toujours) | oui |
| D6 | Stockage web | **IndexedDB** (base `roomboard-bibliotheque`, magasin `fichiers`, clé `<racine>/<chemin>`, valeur `Blob` ou marqueur de dossier). OPFS non retenu. Voir DA1. | contraintes C4 `usage-cadrage.md:547` (« OPFS / IndexedDB ») ; patron `pending.ts:68` ; `fake-indexeddb` déjà en devDependencies | oui |
| D7 | Stockage coque | Dossiers réels par `@tauri-apps/plugin-fs` (déjà chargé, `host-tauri.ts:217`) : « Mes ressources » = `$DOCUMENT/RoomBoard/Ressources` ; « Ressources partagées » = dossier choisi par la boîte native (`open({directory: true, recursive: true})`), chemin retenu dans le `KeyValue` des réglages. Aucune commande Rust neuve dans la coque. Voir DA3. | étude § 4.8 (« dossiers réels (`Documents/RoomBoard/Ressources`, dossier partagé réglable) ») ; plugin dialog 2.8.4 `commands.rs:163-180` (le dossier choisi entre dans la portée fs, récursif) lu | oui |
| D8 | Interface de stockage commune | `LibraryFiles` (une racine, chemins relatifs `/`) avec deux réalisations, IndexedDB et plugin-fs ; tout le reste (index, recherche, paquets) ne voit que cette interface. Interface exacte en DA1. | brief (« interface de stockage commune (coque et web) ») | oui |
| D9 | « Ressources partagées » sur le web | Section affichée, vide, avec « Dossier partagé : application de bureau seulement ». Sur la coque sans dossier choisi : bouton « Choisir le dossier partagé… ». | contraintes C4 (« web : pas de dossier partagé ») ; brief (le panneau montre les deux sections) | oui |
| D10 | Dossiers | Arbre par racine ; « Nouveau dossier », « Supprimer » (dossier ou ressource, avec confirmation par `shell.confirm`, `workspace.ts:185`), et « Vider » pour la racine. Ajout : dans le dossier ouvert (racine par défaut). Pas de renommage ni de déplacement en C4. | étude § 4.8 (« arbre de dossiers ») ; brief (geste « vider la bibliothèque ») | oui |
| D11 | Recherche | Sous-chaîne, insensible à la casse et aux accents (NFD sans diacritiques), sur nom, mots-clés et description, toutes racines ; liste plate des résultats avec leur dossier ; index en mémoire reconstruit à l'ouverture du panneau et au retour du focus, mis à jour à chaque ajout. | étude § 4.8 (« nom + mots-clés + description, insensible à la casse ; index en mémoire reconstruit à l'ouverture ») ; brief (« frac » trouve « fraction ») | oui |
| D12 | Vignette | PNG de 128 px au plus grand côté, rendue par la page à l'ajout : objets par le peintre d'export (`paintContent`, `canvas2d.ts:426`) sur `browserExportCanvas` (`pdf-overlay.ts:103`) après `loadImageSource` (`pdf-overlay.ts:46`) ; grille par `gridLinesOf` (`api.ts:373`) et `paintGrid` (`grid-paint.ts:102`). Ressource sans vignette (fichier posé à la main) : pastille du type. | U9 (« vignette (rendue par la page) ») ; étude § 4.8 | oui |
| D13 | Glisser vers la page | Glisser par Pointer Events (appui sur la carte, fantôme qui suit, lâcher au-dessus d'une scène = point de dépôt), jamais HTML5 `draggable`. Double-clic ou Entrée sur la carte : posée au centre de la vue (`at = null`). Voir DA4. | `drop-web.ts:1` (« aucun `draggable` ») ; étude § 4.8 (« glisser vers la page, ou clic puis dépôt au centre ») | oui |
| D14 | Une étape d'annulation | Objets : `insertFragment` (une transaction, existant). Grille : un `SetGrid`. Paquet importé dans la bibliothèque : hors de l'historique du document (ce n'est pas une modification de page). | D11 du socle ; U9 ; U31 (« une séance = une étape ») | oui |
| D15 | Panneau sans rétrécir la scène | Panneau en `.rb-popover[data-panel="library"]`, calé à droite comme le panneau d'image (`rb.css:28-30`) : il recouvre la scène, ne prend aucune colonne de la grille CSS (`layout.ts`) ; scène ≥ 640 px mesurée par l'essai, panneau ouvert. | brief (640 px) ; `rb.css:28` (`grid-area: stage`) | oui |
| D16 | Ouvrir le panneau | Action de barre `library` « Bibliothèque », ajoutée dans la rangée « vue » des profils livrés à côté de `grid` (comme C9) ; `toggle("library")` dans `toolbar-host.ts:32,61`. | `toolbar-profiles.ts:62` ; patron C9 | oui |
| D17 | Format du `.rbpack` | ZIP stocké (sans compression), entrées triées, dates fixes : `manifest.json` `{format: "roomboard", formatVersion: 1, kind: "pack", name, appVersion, created, items: [{path, name, keywords, description, kind, thumbnail}]}`, `items/<chemin>.rbitem`, `items/<chemin>.rbitem.png`. Chaque `.rbitem` garde ses assets ; aucune déduplication au niveau du paquet en C4 (H2-3). | étude § 4.7 ; U8 (même conteneur ZIP) ; D25 (octets stables) | oui |
| D18 | Lecture d'un `.rbpack` | Refus clair : `format` ≠ `roomboard`, `kind` ≠ `pack` (message de `UnknownKind` repris mot pour mot), `formatVersion` > 1 (« paquet d'une version plus récente »), chemin d'entrée non sûr (`..`, `\`, `:`, absolu), plus de 1 000 entrées ou 256 Mio (limites de `zip-worker.ts`), entrée du manifeste absente du ZIP. Un `.rbitem` du paquet est relu par `ContainerIO.read` au moment de l'insertion, pas à l'import. | étude § 4.8 (« interdits ») ; `model3d-import.ts:29-30` | oui |
| D19 | Import d'un paquet | Dans un dossier neuf de « Mes ressources » nommé d'après `name` du paquet (« (2) », « (3) » en cas de collision) ; les sous-dossiers du paquet sont recréés. Points d'entrée : « Importer un paquet… » du panneau, dépôt d'un `.rbpack` sur la scène (`rbpackHandler`, U25 « Paquet → importé dans la bibliothèque »), fichier passé au lancement (coque). | U25 `:78` ; étude § 4.7 (« les entrées sont écrites comme fichiers `.rbitem` individuels ») | oui |
| D20 | Association `.rbpack` (coque) | `tauri.conf.json` gagne l'association `rbpack` (`application/x-roomboard-pack`, « Paquet RoomBoard ») ; `ASSOCIATED_EXTENSIONS` (`roomboard-shell/src/lib.rs:14`) gagne `"rbpack"` ; test Rust qui relit `tauri.conf.json` et compare les deux listes. | U8 (MIME) ; `usage-cadrage.md:150` (« association de `.rbitem`, `.rbpack` […] (C3, C4, C1) ») | oui (HU1-1) |
| D21 | Fichiers d'avant C4 | Aucun octet changé pour `.roomboard` et `.rbitem` de `kind: "fragment"` (tests `compat_socle`, `compat_c3`, `document_manifest_has_no_kind_field` gardés verts) ; nouveau `compat_c4` : un `.rbitem` de grille rechargé garde ses octets. | U8 (« fichiers du socle lus tels quels ») | oui |
| D22 | Licences | Aucune dépendance neuve : `fflate` (MIT, déjà là), `fake-indexeddb` (Apache-2.0, déjà en dev), plugins Tauri déjà là ; `controle-licences.mjs` reste vert. | brief (aucune AGPL/GPL/LGPL) | oui |
| D23 | Refus du `kind` d'un paquet | `readPack` lève `unknownKindMessage(kind)` (`core/api.ts:453`), importé, jamais recopié. | contre-relecture B1 | oui |
| D24 | Cascade d'un dépôt de plusieurs `.rbitem` | La cible `insertFragment` (`workspace.ts:267`, contrat `image-import.ts:194-197`, R4) passe son `index` à `insertResource(…, at, index)` : trois `.rbitem` déposés ensemble ne tombent pas au même point. | R4 ; contre-relecture I1 | oui |
| D25 | Nom de ressource → nom de fichier | Nom de fichier au patron `slug` (`profile-file.ts:17` : sans accents, minuscules, `[a-z0-9-]`, vide → `ressource`, 80 caractères), « (2) », « (3) » en cas de collision ; le nom affiché reste dans le compagnon `.json`. Les dossiers gardent casse et accents ; seuls `/ \ : * ? " < > |` et un point initial deviennent `_`. | contre-relecture I2 | oui |
| D26 | Manifeste du paquet lu par le cœur | Le manifeste du `.rbpack` porte `schema` et `modified` ; un `.rbpack` ouvert comme document passe `check_manifest` jusqu'au `kind` et reçoit « ce fichier est un paquet RoomBoard (.rbpack) : importez-le dans la bibliothèque » (bras de `UnknownKind` pour `pack`), jamais « endommagé : missing field ». | contre-relecture M1 | oui |
| D27 | Limites à l'export | `exportPack` applique les limites de l'import (1 000 entrées, 256 Mio) avant d'écrire : « paquet trop gros (plus de 1 000 entrées ou de 256 Mio) : exportez un dossier plus petit ». | contre-relecture M4 | oui |
| D28 | Lâcher sur le panneau | Dépôt seulement si l'élément du dessus au point (`elementsFromPoint`, fantôme exclu) est sous `.rb-stages` et hors de `.rb-popover`. | contre-relecture M5 | oui |
| D29 | Vignette | Peinte depuis le document de la ressource relue (sélection extraite ou grille seule), jamais depuis la page source. | contre-relecture M6 | oui |
| D30 | Extensions d'import | `IMPORT_EXTENSIONS` (`files.ts:75`) gagne `rbpack`. | contre-relecture M7 | oui |
| D31 | Stockage web durable | `navigator.storage.persist()` demandé au premier enregistrement s'il existe ; absent ou refusé : rien (H1-7). | contre-relecture M8 | oui |
| D32 | Chemins du paquet | `readPack` ne contrôle que la forme (`items/….rbitem`) ; chaque chemin passe par `safeLibraryPath` avant la première écriture de l'import, aucun second normaliseur. | contre-relecture M9 | oui |

## 3. Carte d'impact

Le profil n'a pas de ligne « Surfaces d'impact » : rubriques déduites de la recherche (pas de graphe graphify pour ce
dépôt, `~/.cache/graphes/` n'a que `claude-config`, `roomflow2`, `roomflow2-web`).

### 3.1 Cœur Rust et format

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core/src/format/mod.rs:22-26` (constantes `KIND_*`) | oui | `KIND_GRID = "grid"` | V |
| `crates/roomboard-core/src/format/mod.rs:252-260` (`check_manifest`, `kind`) | oui | accepte `grid` (D3) ; seule ligne qui compte aussi dans `formats` | V |
| `crates/roomboard-core/src/format/mod.rs:84-97` (`Display` de `WrongKind`) | oui | message de la grille (D3) | V |
| `crates/roomboard-core/src/format/mod.rs:334-391` (`save_fragment_parts`, `load_fragment_parts`, `save_fragment`, `load_fragment`) | oui | généralisés en `save_resource_parts` / `load_resource_parts` / `save_resource` / `load_resource` à `kind` passé ; les quatre fonctions de fragment y délèguent, mêmes octets | V |
| `crates/roomboard-core/src/format/mod.rs:29-48` (`Manifest`) | non | aucun champ neuf (D5) | V |
| `crates/roomboard-core/src/copy.rs:162,188` (`extract`, `insert_fragment`) | non | réutilisés tels quels | V |
| `crates/roomboard-core/src/grid.rs:62-163` (`SetGrid`, lecture de `grid`) | non | réutilisés | V |
| `crates/roomboard-core/tests/compat_socle.rs`, `compat_c3.rs` | non | à garder verts (D21) | V |
| `crates/roomboard-core/tests/compat_c4.rs` | oui (nouveau) | grille en ressource : écrire, relire, mêmes octets ; `kind` inconnu refusé | S |

### 3.2 Modules Wasm et tailles

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-wasm/src/lib.rs:550-583` (`save_fragment*`, `load_fragment*`) | oui | `save_grid_parts`, `load_grid_parts`, `save_grid`, `load_grid`, `manifest_kind(manifest) -> String` | V |
| `crates/roomboard-formats-wasm/src/lib.rs:24-60,62-135` (`ContainerReader`, `write_container`) | non | indépendants du `kind` ; seule la ligne de `check_manifest` (D3) y grossit, de quelques dizaines d'octets | V |
| `scripts/verifier.sh:57-75` (plafonds 1 572 864 o et 3 145 728 o) | non | seuils inchangés ; module principal attendu < +20 Ko, `formats` < +1 Ko, mesurés en fin de T1 et T2 | V |

### 3.3 Interface TS : cœur, conteneur, fragments, import

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/core/api.ts:133,318,373` (`SetGrid`, `GridView`, `gridLinesOf`) | oui | méthodes `saveGridParts`, `loadGridParts`, `manifestKind` sur la fabrique et le document | V |
| `apps/web/src/core/fake-core.ts` | oui | même contrat que le cœur Wasm (grille en ressource, `manifestKind`) | V |
| `apps/web/src/core/wasm-core.ts`, `wasm-core.contract.test.ts` | oui | liaison et contrat | V |
| `apps/web/src/app/container-io.ts:40-57` (`EncodeAs`, `ReadKind`, `ContainerIO`) | oui | `EncodeAs` gagne `{kind: "grid", name}` ; `read` accepte une liste de `kind` et rend `kind` dans `ReadResult` | V |
| `apps/web/src/app/fragments.ts:31-38,81-108` (`FragmentOps`, `insertOutcome`) | oui | `insertResource(tab, bytes, name, at)` : fragment → chemin existant ; grille → `SetGrid` sur la page montrée ; `encodeGrid(tab)` | V |
| `apps/web/src/platform/import.ts:138-160,247` (`rbitemHandler`, registre) | oui | `rbitemHandler` passe par `insertResource` ; nouveau `rbpackHandler` | V |
| `apps/web/src/platform/files.ts:6-9,75` (extensions, MIME, `IMPORT_EXTENSIONS`) | oui | `RBPACK_EXTENSION`, `RBPACK_MIME`, `rbpack` dans `IMPORT_EXTENSIONS` (D30) | V |
| `apps/web/src/platform/host-tauri.ts:24-36,217-253` (`TauriDialog`, `TauriFs`, `loadTauriPorts`) | oui | `TauriDirFs`, `dirFs`, `pickFolder`, `documentDir` (D7) | V |
| `apps/web/src/platform/image-import.ts:194-197` (`ImageTarget.insertFragment`, `index` R4) | non | contrat réutilisé ; la cible de `workspace.ts:267` route vers `insertResource` avec `index` (D24) | V |
| `apps/web/src/platform/typed-files.ts:18-23,40-67` (`RBITEM_TYPE`, `create*TypedFiles`) | oui | `RBPACK_TYPE` ; réalisations réutilisées | V |
| `apps/web/src/platform/zip-worker.ts:19-66`, `zip-read.ts:27-32` | oui | lecture filtrée pour le paquet et écriture `zipSync` stockée (seul module qui importe fflate, GC17) | V |
| `apps/web/src/platform/clipboard.ts`, `paste.ts` | non | enveloppe `roomboard-items/1` inchangée ; une grille n'est pas copiable en C4 | V |
| `apps/web/src/app/pdf-overlay.ts:46,103` (`loadImageSource`, `browserExportCanvas`) | non | réutilisés pour la vignette | V |
| `apps/web/src/engine/render/canvas2d.ts:426`, `grid-paint.ts:102` | non | réutilisés pour la vignette | V |
| `apps/web/src/platform/drop-web.ts` | non | le dépôt de fichiers reste tel quel ; le glisser de la bibliothèque n'y passe pas (D13) | V |
| `apps/web/src/app/workspace.ts:117,138,185,484` | oui | expose `insertResource` et `encodeGrid` de l'onglet actif à l'interface | V |
| `apps/web/src/main.ts:70-83` (ports web et coque) | oui | crée `LibraryFiles` (IndexedDB ou plugin-fs) et `RBPACK_TYPE` | V |

### 3.4 Interface Solid

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/ui/App.tsx:55,62,339-412` (`Panel`, popovers) | oui | `"library"` et son popover | V |
| `apps/web/src/ui/LibraryPanel.tsx` | oui (nouveau) | panneau : deux racines, dossiers, recherche, cartes, formulaires d'ajout, actions | S |
| `apps/web/src/ui/rb.css:28-30` | oui | `.rb-popover[data-panel="library"]` calé à droite, cartes, fantôme du glisser | V |
| `apps/web/src/ui/layout.ts` | non | aucune colonne neuve (D15) | V |
| `apps/web/src/toolbar.ts:117`, `toolbar-profiles.ts:62`, `app/toolbar-host.ts:32,61` | oui | action `library` (D16) | V |
| `apps/web/src/ui/GridPanel.tsx`, `SelectionRow.tsx` | non | le panneau de grille garde son rôle ; l'ajout se fait depuis la bibliothèque | V |

### 3.5 Persistance

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| IndexedDB `roomboard-bibliotheque` (nouvelle base) | oui | stockage web (D6) | S |
| `apps/web/src/platform/pending.ts:8,68` (base `roomboard-fichiers`) | non | patron repris, base distincte | V |
| `KeyValue` des réglages (`profile-store.ts:4-10`) | oui | clé `roomboard.bibliotheque.partage` (chemin du dossier partagé, coque) | V |
| `$DOCUMENT/RoomBoard/Ressources` (coque) | oui | « Mes ressources » (D7) | S |

### 3.6 Coque Tauri

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/desktop/src-tauri/capabilities/default.json` | oui | `fs:allow-read-dir`, `fs:allow-mkdir`, `fs:allow-remove`, `fs:allow-exists`, `fs:scope` `$DOCUMENT/RoomBoard/Ressources` et `/**` ; description réécrite (DA3) | V |
| `apps/desktop/src-tauri/tauri.conf.json` (`bundle.fileAssociations`, `plugins.fs`) | oui | association `rbpack` (D20) ; `scopeDroppedPaths: false` inchangé | V |
| `crates/roomboard-shell/src/lib.rs:14,332` (`ASSOCIATED_EXTENSIONS`, test) | oui | `"rbpack"` ; test qui relit `tauri.conf.json` | V |
| `apps/desktop/src-tauri/src/main.rs:162-180` | non | aucune commande neuve (D7) | V |
| `scripts/controle-hors-ligne.mjs`, `controle-icones.mjs` (lisent `tauri.conf.json`) | non | à garder verts après l'ajout de l'association | V |

### 3.7 Tests et essais

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/essais/c4-bibliotheque-navigateur.mjs` | oui (nouveau) | geste Playwright du brief (S1 à S4), capture `docs/essais/c4-bibliotheque.png` | S |
| `scripts/verifier.sh:96-110` (liste `--e2e`) | oui | ajoute l'essai C4 | V |
| `scripts/essais/c3-groupes-navigateur.mjs`, `c9-grille-navigateur.mjs` | non | à garder verts (export, dépôt de `.rbitem`, éditeur de grille) | V |
| `scripts/essais/c5-image-navigateur.mjs:147-259`, `c10a`, `c10b`, `c12` (scène ≥ 640 px) | non | à garder verts | V |
| `apps/web/src/toolbar-profiles.test.ts:38-48` | oui | rangée « vue » : `["fit-page", "grid", "library", "profiles", "settings"]` | V |
| `apps/web/src/app/fragments.test.ts`, `container-io.test.ts`, `platform/import.test.ts` | oui | grille en ressource, liste de `kind` | V |
| `apps/web/src/platform/zip-read.test.ts`, `model3d-import.test.ts` | non | lecture 3D inchangée | V |

### Effets de bord sur l'existant

- `ContainerIO.read` change de signature (liste de `kind`) : appels de `fragments.ts:82` et `:130` adaptés ; couvert par
  `container-io.test.ts` (document refusé comme objet, objet refusé comme document : messages actuels).
- Un `.rbitem` de grille déposé sur la scène remplace la grille au lieu de dire « type inconnu » : `import.test.ts`
  (nouveau cas) et S3.
- Rangée « vue » des profils livrés : un bouton de plus ; `toolbar-profiles.test.ts:46` et la scène ≥ 640 px de
  `c5-image-navigateur.mjs:156`.
- Capacités de la coque élargies (lecture de dossier, création, suppression) : test de lecture de `default.json` (T5) ;
  essai réel en coque = reste.
- Fichier `.rbpack` passé au lancement de la coque : `launch_paths` le garde (`roomboard-shell` test `:332` étendu).
- `zip-worker.ts` gagne un mode : la lecture 3D garde ses limites et son filtre (`zip-read.test.ts`, `model3d-import.test.ts`).

### Chantiers en cours

Aucun : `git worktree list` ne montre que `main` et ce worktree ; `gh pr list --state open` vide.

### Termes cherchés

Graphe : aucun pour ce dépôt. Recherche texte (rejouable depuis la racine du worktree) :
`rbitem|rbpack` (apps/web/src) · `kind|Kind` (format/mod.rs) · `check_manifest|thumbnail|keywords` (crates) ·
`vignette|thumbnail` (apps/web/src) · `toBlob|OffscreenCanvas|convertToBlob` · `paintContent|exportPainterOptions` ·
`SetGrid|fn grid|GridSpec` · `extract|insert_fragment|InsertFragment` · `indexedDB|IDB` · `readDir|mkdir|remove` (host-tauri.ts) ·
`dragstart|dataTransfer|draggable` · `confirm|ask(` (workspace.ts) · `fileAssociations|ASSOCIATED_EXTENSIONS` ·
`640` (scripts/essais, apps/web/src) · `rb-popover` (rb.css) · `"grid"` (toolbar*.ts) · `1572864|3145728` (scripts) ·
`global_scope|command_scope|allow_directory` (sources des plugins fs 2.7.1 et dialog 2.8.4 dans `~/.cargo/registry`) ·
coffre : `chercher.js "roomboard bibliothèque ressources rbpack" 8`.

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| Encoder la sélection en ressource | `apps/web/src/app/fragments.ts:111` | `encodeSelection(tab, "export")` | réutiliser |
| Insérer des objets au point de dépôt, une étape | `apps/web/src/app/fragments.ts:81` | `insertOutcome(tab, rbitem, name, at)` | réutiliser |
| Router objet ou grille | `apps/web/src/app/fragments.ts:31-38` | `insertResource(tab, bytes: Uint8Array, name: string, at: Point \| null): Promise<InsertOutcome>` ; `encodeGrid(tab): Promise<Uint8Array \| null>` (null : page sans grille, avis dit) | étendre |
| Lire et écrire un conteneur selon son `kind` | `apps/web/src/app/container-io.ts:40-57` | `EncodeAs \|= {kind: "grid"; name}` ; `read(name, bytes, kind: ReadKind \| readonly ReadKind[], docPath?)` ; `ReadKind = "document" \| "fragment" \| "grid"` ; `ReadResult.kind` | étendre |
| Écrire et relire une grille en conteneur | `crates/roomboard-core/src/format/mod.rs:334,378` | `save_resource_parts(doc, meta, kind: &'static str, name) -> Result<Parts, FormatError>` ; `load_resource_parts(manifest, ybin, kind) -> Result<(Document, Manifest), FormatError>` ; `save_resource` / `load_resource` (sans asset) ; les fonctions de fragment y délèguent | étendre |
| Connaître le `kind` d'un manifeste sans charger le document | `crates/roomboard-core/src/format/mod.rs:232` | `check_manifest` exposé en Wasm : `manifest_kind(manifest: &[u8]) -> Result<String, JsError>` | étendre |
| Appliquer une grille | `apps/web/src/core/api.ts:133` | `{type: "SetGrid", page, grid}` | réutiliser |
| Refus du `kind` d'un paquet | `apps/web/src/core/api.ts:453` | `unknownKindMessage` | réutiliser |
| Nom de fichier d'une ressource | `apps/web/src/profile-file.ts:17` | patron `slug(label)` | réutiliser (patron) |
| Rendre la vignette des objets | `apps/web/src/app/pdf-overlay.ts:46,103`, `engine/render/canvas2d.ts:426` | `loadImageSource`, `browserExportCanvas(w, h)`, `paintContent(ctx, page, rect, scale)` | réutiliser |
| Rendre la vignette d'une grille | `apps/web/src/core/api.ts:373`, `engine/render/grid-paint.ts:102` | `gridLinesOf(page, grid, rect, …)`, `paintGrid(ctx, lines, camera, sx, sy, dpr)` | réutiliser |
| Choisir et enregistrer un `.rbpack` | `apps/web/src/platform/typed-files.ts:40,52` | `createWebTypedFiles` / `createTauriTypedFiles` avec `RBPACK_TYPE` | réutiliser |
| Lire un ZIP hors de la page | `apps/web/src/platform/zip-read.ts:27`, `zip-worker.ts:19` | `createZipReader(spawn)` ; le Worker gagne `{op: "unzip", mode: "model3d" \| "pack"}` et `{op: "zip", entries}` (stocké, trié, date fixe) | étendre |
| Worker jetable | `apps/web/src/platform/one-shot-worker.ts:18` | `runOnce` | réutiliser |
| Limites et chemins sûrs d'un ZIP | `apps/web/src/platform/model3d-import.ts:29-30,63` | `ZIP_MAX_ENTRIES`, `ZIP_MAX_BYTES`, `normalizePath` | réutiliser |
| Dépôt d'un `.rbpack` sur la scène ou au lancement | `apps/web/src/platform/import.ts:149,247` | `ImportHandler` ; `rbpackHandler(lib)` à côté de `rbitemHandler()` | étendre |
| Confirmer une suppression | `apps/web/src/app/workspace.ts:185` | `shell.confirm(message)` | réutiliser |
| Mémoriser le dossier partagé | `apps/web/src/profile-store.ts:4,149` | `KeyValue`, `browserKeyValue` | réutiliser |
| Base IndexedDB | `apps/web/src/platform/pending.ts:53-68` | patron `finished` / `result` / ouverture paresseuse | réutiliser (patron) ; les deux aides passent dans `platform/idb.ts` (exportées, appelées par les deux bases) |
| Ouvrir le panneau | `apps/web/src/app/toolbar-host.ts:32,61`, `ui/App.tsx:55` | `toggle("library")` | étendre |
| Stockage de la bibliothèque | aucun (`indexedDB`, `readDir`, `mkdir` : rien hors `pending.ts`) | `LibraryFiles` (DA1) | nouveau module `platform/library-files.ts` |
| Index, dossiers, recherche, ajout, paquets | aucun (`bibliothèque`, `library`, `ResourceLibrary` : rien) | `ResourceLibrary` (DA2) | nouveau module `app/library.ts` |
| Codec du paquet | aucun (`rbpack`, `pack` : rien) | `buildPack(items): ZipInput` / `readPack(entries): PackItems` (DA2) | nouveau module `platform/rbpack.ts` |
| Glisser une carte vers la scène | aucun (`dragstart`, `draggable` : rien ; `drop-web.ts:1` l'exclut) | `startResourceDrag(e: PointerEvent, onDrop: (at: Point) => void): void` (DA4) | nouveau module `ui/resource-drag.ts` |

Constats d'architecture des zones touchées (`docs/architecture-constats.md`) : `image-import.ts:244` (`ImageTarget` reçoit
aussi les fragments, peu-profond) et `clipboard.ts:7` (import circulaire) restent ouverts ; C4 ne les aggrave pas :
`insertResource` vit dans `fragments.ts` ; le dépôt d'un `.rbitem` y arrive par la cible `ImageTarget.insertFragment` existante (`workspace.ts:267`), sans membre neuf sur `ImageTarget` (constat ni aggravé ni fermé), et C4 ne touche pas au presse-papiers.

## 4. Hypothèses à revoir

**Niveau 1 — difficiles à défaire ou visibles des utilisateurs**

- **H1-1** Stockage web en IndexedDB (DA1) : une bibliothèque web créée en C4 vit là ; passer à OPFS plus tard demande une
  migration au démarrage.
- **H1-2** Mots-clés, description et vignette hors du `.rbitem` (D5) : un `.rbitem` exporté seul puis rangé ailleurs
  perd ses mots-clés ; U9 les plaçait dans le manifeste. Les y ajouter plus tard est compatible (champs facultatifs) ;
  coût mesuré à faire sur `formats`.
- **H1-3** Format du `.rbpack` (D17) et extension, MIME, association (HU1-1) : visibles dès le premier paquet partagé ;
  gratuits à changer avant la première release.
- **H1-4** Coque : `fs:allow-remove` et `fs:allow-read-dir` valent aussi pour les fichiers que la boîte native a
  accordés pendant la session (portées réunies, `tauri-plugin-fs-2.7.1/src/commands.rs`, `resolve_path`, lu) ; la page
  ne supprime que des chemins qu'elle construit sous une racine (`safeLibraryPath`). Une commande Rust confinée serait
  plus stricte (DA3).
- **H1-5** Coque : l'accès au dossier partagé ne survit pas au redémarrage (pas de `tauri-plugin-persisted-scope`) ;
  au démarrage la section propose « Rouvrir le dossier partagé… » (même boîte, chemin retenu en défaut).
- **H1-6** Import d'un paquet dans un dossier neuf nommé d'après le paquet (D19), sans choix du dossier de destination.

- **H1-7** Web : la durabilité du stockage dépend de `navigator.storage.persist()` (accordé ou non par le navigateur) ; refusé, le navigateur peut vider la bibliothèque sous pression d'espace.

**Niveau 2**

- **H2-1** Vignette de 128 px au plus grand côté (D12).
- **H2-2** Pas de renommage ni de déplacement de ressource ou de dossier en C4 (D10).
- **H2-3** Pas de déduplication des assets au niveau du paquet (D17) : un paquet de ressources qui partagent une image
  la porte plusieurs fois.
- **H2-4** Ressource posée à la main dans un dossier (sans compagnon `.json`) : nom = nom du fichier, aucun mot-clé,
  pastille du type à la place de la vignette.
- **H2-5** Taille des Wasm : principal < +20 Ko, `formats` < +1 Ko ; au-delà, T1 s'arrête et le dit.
- **H2-6** Pas de surveillance du dossier partagé : relecture à l'ouverture du panneau et au retour du focus (étude
  § 4.8 « réanalyse à l'ouverture et au focus »).
- **H2-7** Paquet de plus de 256 Mio refusé partout (limite de `zip-worker.ts`) ; la mémoire réelle de l'iPad reste à
  mesurer (HU1-10).

## 5. Décisions d'architecture

**DA1 — `LibraryFiles` : une racine, deux réalisations (IndexedDB, plugin-fs).**
Contexte : coque = dossiers réels, web = stockage du navigateur ; Playwright Chromium headless doit le jouer et un
rechargement doit retrouver la bibliothèque ; OPFS demande `createWritable`, absent de Safari iPad jusqu'à récemment
(supposé), et n'a aucun double de test dans le dépôt, alors qu'IndexedDB garde des `Blob`, a déjà un patron (`pending.ts`)
et un double (`fake-indexeddb`).
Décision : `interface LibraryFiles { readonly root: "mine" | "shared"; list(): Promise<readonly {path: string; dir: boolean}[]>; read(path): Promise<Blob>; write(path, data: Blob): Promise<void>; mkdir(path): Promise<void>; remove(path): Promise<void> }`
(chemins relatifs `/`, refusés par `safeLibraryPath` s'ils contiennent `..`, `\`, `:`, un début `/` ou un nom en `.`) ;
`createIdbLibraryFiles(factory: IDBFactory, root)` et `createTauriLibraryFiles(fs, rootPath, root)`.
Conséquences : le même jeu de tests de contrat tourne sur les deux réalisations (IndexedDB par `fake-indexeddb`, coque par un faux `plugin-fs` sur un dossier temporaire de Node) ; jamais le vrai `Documents` dans un test (piège coffre `04_Pieges/qt-test-mode-ne-deplace-pas-documents.md`).

**DA2 — `ResourceLibrary` (index et paquets) au-dessus de `LibraryFiles`.**
Contexte : recherche, dossiers, ajout, export et import ne doivent pas connaître le stockage ; le `kind: "pack"` ne doit
pas alourdir `formats`.
Décision : `createResourceLibrary({files: LibraryFiles[], zip, now, appVersion})` →
`{ roots(); refresh(): Promise<void>; folder(root, path): LibraryFolder; search(q): readonly ResourceEntry[]; add(root, folder, {bytes, kind, name, keywords, description, thumbnail}): Promise<ResourceEntry>; read(entry): Promise<Uint8Array>; mkdir(root, parent, name); remove(root, path); exportPack(root, folder): Promise<Uint8Array>; importPack(bytes, name): Promise<{folder: string; count: number}> }` ;
paquet en TS pur dans `platform/rbpack.ts` (`buildPack`, `readPack`), ZIP par le Worker de `zip-worker.ts`.
Conséquences : `formats` et le cœur ignorent le paquet ; un `.rbitem` du paquet est relu par `ContainerIO` à l'insertion, avec tous les contrôles de version.

**DA3 — Coque par `plugin-fs` et capacités, sans commande Rust neuve.**
Contexte : aucun build Tauri dans ce chantier ; une commande ajoutée à `main.rs` ne serait jamais compilée par
`verifier.sh` (src-tauri exclu du workspace, `Cargo.toml:4-5`).
Décision : `default.json` gagne `fs:allow-read-dir`, `fs:allow-mkdir`, `fs:allow-remove`, `fs:allow-exists` et
`fs:scope` (`$DOCUMENT/RoomBoard/Ressources`, `$DOCUMENT/RoomBoard/Ressources/**`) ; le dossier partagé entre dans la
portée par `dialog.open({directory: true, recursive: true})` (`tauri-plugin-dialog-2.8.4/src/commands.rs:163-180`, lu).
Conséquences : prouvé par un test qui relit `default.json` et `tauri.conf.json` (permissions exactes, association) et par les tests de contrat de `createTauriLibraryFiles` ; essai réel en coque (Windows, macOS) = reste ; H1-4 et H1-5.

**DA4 — Glisser par Pointer Events.**
Contexte : sous Windows, le glisser-déposer natif de la fenêtre Tauri (actif : dépôts depuis l'explorateur) empêche le
HTML5 `draggable` dans la page (documentation Tauri, supposé ; `dragDropEnabled: true` lu dans `tauri.conf.json:11`) ; l'iPad joue mal le HTML5 au doigt.
Décision : `startResourceDrag(e: PointerEvent, onDrop: (at: Point) => void)` : capture du pointeur, fantôme qui suit,
lâcher au-dessus de `.rb-stages` = `onDrop({x, y})` en coordonnées client (même forme que `DropHandler`) ; ailleurs ou
Échap : rien. Double-clic ou Entrée sur la carte : `at = null`.
Conséquences : un seul chemin pour la souris, le stylet et le doigt ; Playwright le joue par `page.mouse.down/move/up`.

## 6. Scénarios d'acceptation

- **S1** (geste principal, web) Tracer un trait, un rectangle et un texte, les sélectionner, Grouper ; ouvrir
  « Bibliothèque », « Ajouter la sélection », nom « Moitié », mot-clé « fraction », Ajouter : la carte apparaît dans
  « Mes ressources » avec sa vignette ; taper « frac » dans la recherche : seule « Moitié » reste, vignette visible ;
  scène ≥ 640 px, panneau ouvert. Ajouter une page, glisser la carte sur la scène : trois objets insérés au point de
  lâcher ; Annuler : page vide ; Rétablir : les trois objets reviennent. Capture `docs/essais/c4-bibliotheque.png`
  (panneau avec la recherche et la ressource posée).
- **S2** (grille, web) Sur la page 1, ouvrir l'éditeur de grille, choisir « Seyès », Appliquer ; dans la bibliothèque,
  « Ajouter la grille de la page », nom « Seyès » ; aller à une page sans grille, glisser « Seyès » sur la scène : la page
  porte la grille Seyès ; Annuler : plus de grille ; Rétablir : elle revient.
- **S3** (paquet, web) Créer le dossier « Fractions » dans « Mes ressources », y ajouter les deux ressources de S1 et S2 ;
  « Exporter (.rbpack) » sur « Fractions » : `Fractions.rbpack` téléchargé ; « Vider » « Mes ressources », confirmer : la
  bibliothèque est vide ; « Importer un paquet… » avec `Fractions.rbpack` : dossier « Fractions » avec « Moitié » (mot-clé
  « fraction », vignette) et « Seyès » ; recharger la page : la bibliothèque est la même ; glisser « Moitié » : trois
  objets insérés.
- **S4** (refus) Importer un `.rbpack` dont le manifeste dit `kind: "autre"` : message « type de fichier RoomBoard inconnu
  (« autre ») : pris en charge dans une prochaine version », bibliothèque inchangée ; ouvrir un `.roomboard` et déposer
  un `.rbitem` d'avant C4 : ils s'ouvrent et s'insèrent comme avant.
- **S5** (coque, reste hors VM) Sous Windows ou macOS : la section « Ressources partagées » propose « Choisir le dossier
  partagé… » ; un dossier choisi montre ses `.rbitem` ; « Mes ressources » écrit dans `Documents/RoomBoard/Ressources` ;
  double-clic sur un `.rbpack` dans l'explorateur : RoomBoard l'importe. Sur la VM : tests de contrat de
  `createTauriLibraryFiles` et test de lecture de `default.json` et `tauri.conf.json`.

## 7. Hors périmètre

- Fonds de page (`backdrop`) et images seules comme ressources (ligne C4 « grilles et fonds en ressources ») : U8 ne
  définit aucun `kind` pour un fond ; à cadrer avec C2, chantier suivant.
- `.roomboard` entier comme ressource « page ou leçon » (étude § 4.3).
- Renommer, déplacer, glisser une sélection directement vers un dossier (étude § 4.8, « comme ActivInspire »).
- Mots-clés dans le manifeste du `.rbitem` (H1-2), déduplication des assets dans le paquet (H2-3).
- Persistance de l'accès au dossier partagé (`tauri-plugin-persisted-scope`), surveillance du dossier (`notify`).
- Lecture des `.as4a` et `.gallery` (étude § 6, point 4), signature des paquets (étude § 8, q. 7).
- Build Tauri et essais en coque réelle (Windows, macOS) ; mesure mémoire iPad d'un gros paquet (HU1-10).
- Constats ouverts `image-import.ts:244` et `clipboard.ts:7` (non aggravés, non fermés).

## 8. Portes immédiates

Aucune.
