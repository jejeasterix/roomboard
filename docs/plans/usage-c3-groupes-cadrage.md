# Cadrage — usage C3 : groupes, fragments et presse-papiers

Cadré en mode autonome le 2026-11-20 (étage 1, cadreur), sans question posée à Jérôme. Base lue : `origin/main @ 98bf320`
(worktree `usage-c3-groupes`) ; branche parallèle `feat/usage-c10b-tableau @ 2edbfcb` (OD80) lue en lecture seule depuis
le dépôt principal. Sources de rang 2 citées, jamais refaites : `docs/plans/usage-cadrage.md` (U7, U8, U9, U22, U25 amendée
par Q1, DAU3, DAU4, DAU10, S4, S5, ligne C3). Pas de graphe graphify pour RoomBoard (`~/.cache/graphes/` n'en a pas) :
recherche textuelle seulement. Coffre : `chercher.js` non dégradé, aucune décision ni piège propre à C3.

## 1. Demande et gabarit

**Demande.** Après ce chantier, on groupe et dégroupe des objets, on copie et colle une sélection (interne, et système avec
repli JSON), on exporte la sélection en `.rbitem`, et on insère un fragment ou les pages d'un document (C3 du cadrage de
l'usage, `usage-cadrage.md:546`).

**Demande de Jérôme, mot pour mot** (2026-11-19) : « Continue d'avancer autant que possible suivant notre objectif établi.
Nous ferons les tests plus tard sur la version à laquelle tu seras parvenu » et « Hésite pas à parallélisé les taches
quand il y a de la place ». Q1 (`usage-cadrage.md:619`) : « Q1 = b ».

**Gabarit.** `chantier`, cadrage court : 15 questions au plus ; **15 consommées** (Z1 à Z15).

**Cadre repris tel quel** (rang 2) : groupe = champ `group` des éléments, du plus extérieur au plus intérieur, ordre
d'empilement inchangé, un clic prend le groupe extérieur, Grouper et Dégrouper = une commande, une étape (U7, DAU3,
`usage-cadrage.md:60`, `:347-354`) ; extensions `.rbitem`, MIME `application/x-roomboard-item`, `kind` du manifeste absent =
document, inconnu = refus (U8, `:61`) ; fragment = document neuf d'une page, recopie profonde avec ids neufs et groupes
renumérotés, une transaction `"local"`, même code pour `InsertPages`, jamais `document.ybin` appliqué comme mise à jour,
enveloppe `{format: "roomboard-items/1", rbitem: <base64>}` (U9, DAU4, `:62`, `:356-364`) ; la copie profonde recopie les
sous-types du tableau (DAU10, `:407`) ; un fichier `.roomboard` déposé ou ouvert va **toujours** dans un nouvel onglet,
`InsertPages` n'est qu'une commande explicite (Q1, `:619-624` ; S4 amendé, `:424-427`).

## 2. Décisions

Ordre : modèle et format (cœur), puis copie et insertion, puis page (sélection, conteneur, presse-papiers, fichiers),
puis barre, puis preuve. « réversible ? » : oui tant qu'aucune release n'est publiée, sauf mention.

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| Z1 | Champ `group` et commandes | `group` = `Any::Array` de chaînes, remplacé en bloc (U7). Lecture : valeur absente, vide ou qui n'est pas un tableau de chaînes = **sans groupe** (gardée telle quelle dans le document, jamais réécrite à la lecture). `ElementView.group: Option<Vec<String>>` (TS `group?: readonly string[]`), absent sans groupe. `Command::Group { ids }` : refusée (`BadGroup`) si un id est inconnu, si les ids ne sont pas tous sur la même page, ou si les ids ne forment pas au moins **deux unités** (unité = groupe extérieur ou élément libre) ; écrit un `uuid_v4` neuf en tête du chemin de chaque élément. `Command::Ungroup { ids }` : retire de chaque élément de `ids` le premier id de son chemin (le groupe extérieur) ; chemin vide = champ retiré ; aucun élément groupé = aucune étape (D38). Une étape chacune. **Gomme partielle** : les morceaux d'un trait coupé héritent de son `group` (sinon un trait gommé quitterait son groupe). | U7, DAU3 (`usage-cadrage.md:60`, `:347-354`) ; `commands.rs:30` (`Command`), `:979-1053` (`cmd_erase` recrée les morceaux par `stroke_prelim`, sans les champs du trait coupé) ; D38 (même valeur = aucune étape) | oui (HZ2-1 : forme `Ungroup{ids}` au lieu de `Ungroup{groupId}`) |
| Z2 | Sélection par groupe | Règle tenue **dans la page**, sur les vues (`group` de `ElementView`), par un module pur neuf `engine/groups.ts` (DAZ5) : clic sur un membre = tous les membres de son groupe extérieur ; Maj+clic ajoute ou retire le groupe entier ; rectangle : un groupe n'est pris que si **tous** ses membres sont inclus ; déplacer et redimensionner = `Transform{ids}` sur les membres (existant). Pas d'« entrée » dans un groupe (double-clic) : pour modifier un membre seul, on dégroupe ; l'outil Texte et l'outil Tableau gardent leur propre `hitTest` (un texte groupé reste éditable). | U7 (« un clic prend le groupe extérieur ; transformer un groupe = `Transform{ids}` ») ; `select.ts:116-136` (`begin`), `:158-161` (rectangle) ; `query.rs:192` (`hit_test`), `:218` (`ids_in_rect`, inclusion entière) ; convention (PowerPoint, ActivInspire : groupe pris entier au rectangle) | oui (HZ1-6) |
| Z3 | `kind` du manifeste | `Manifest.kind: Option<String>` avec `skip_serializing_if = "Option::is_none"` : un document s'écrit **sans** `kind` (mêmes octets qu'avant C3). Lecture : absent ou `"document"` = document ; `"fragment"` = fragment ; tout autre (`"grid"`, `"pack"` compris, pas encore lus) = `FormatError::UnknownKind { found }`, message « type de fichier RoomBoard inconnu (« X ») : pris en charge dans une prochaine version ». `load` et `load_parts` (documents) refusent un fragment (`FormatError::WrongKind`, « ce fichier est un objet RoomBoard (.rbitem) : déposez-le ou importez-le sur une page ») ; `load_fragment` et `load_fragment_parts` refusent un document. Champs propres au fragment, facultatifs : `name` (chaîne), `bounds` (`{x0, y0, x1, y1}`, boîte monde des objets copiés). | U8 (`:61`) ; `format/mod.rs:22-29` (`Manifest`, sans `deny_unknown_fields`), `:189-208` (`check_manifest`), `:237` (`load_parts`) ; effet de bord de `usage-cadrage.md:149-150` (« champ écrit seulement hors `document` ») | oui jusqu'à la release (HU1-1) |
| Z4 | Copie profonde | **Une seule routine** de recopie, module cœur neuf `copy.rs` (DAZ1), bâtie sur `yrs::AsPrelim` (`Out::as_prelim`, yrs 0.28.1 `out.rs:106`, `types/map.rs:127`, `types/text.rs:466` : copie profonde des `Y.Map`, `Y.Array`, `Y.Text` **avec attributs de plage et embeds**) : chaque élément recopié garde tous ses champs (types inconnus compris, U3), puis reçoit dans la même transaction un `id` neuf (`uuid_v4`), son chemin `group` renuméroté par une table ancien → neuf commune à toute l'insertion, et sa translation (`e += dx`, `f += dy` de `transform`). Ajout en haut de la pile, dans l'ordre d'origine. Métadonnées d'asset (`assets`, K3) recopiées si absentes de la cible. Références hors fragment : aucune n'existe au schéma 1 (aucun champ ne désigne un autre élément) ; la règle « remise à zéro » reste écrite pour un champ futur. | U9, DAU4, DAU10 (`:407`) ; `document.rs:572` (`collect_out`, parcours générique voisin) ; `document.rs:214` (`insert_asset_meta`) ; D3 (`uuid_v4`) ; D11 (une transaction = une étape) | oui |
| Z5 | Forme d'`InsertFragment` et d'`InsertPages` | La source est un document, pas une donnée : ce sont des **méthodes** du document, pas des variantes de `Command` (DAZ2). Cœur : `Document::extract(&self, page: &str, ids: &[String]) -> Result<Document, CommandError>` (document neuf d'une page, copies par Z4) ; `Document::insert_fragment(&mut self, src: &Document, page: &str, dx: f64, dy: f64) -> Result<Change, CommandError>` (tous les éléments de la première page de `src`) ; `Document::insert_pages(&mut self, src: &Document, after: &str) -> Result<Change, CommandError>` (chaque page de `src` recopiée en entier — `background`, `backdrop`, `grid`, champs inconnus — avec un id de page neuf, après `after`). Une transaction `"local"` chacune ; `Change.ids` = ids neufs, `Change.pages` = pages touchées ou créées. | DAU4 (« `InsertFragment{page, fragment, at}` et `InsertPages{after, source}` ») ; `commands.rs:472` (`apply`), `document.rs:75` (`insert_page`), `:136` (`insert_page_at`) | oui |
| Z6 | Codeur du `.rbitem` | Cœur : `format::save_fragment_parts(doc: &Document, meta: &SaveMeta, name: &str) -> Result<Parts, FormatError>` (manifeste `kind: "fragment"`, `name`, `bounds` calculés sur la page unique) et `format::save_fragment(…) -> Result<Vec<u8>, FormatError>` (ZIP complet, mêmes options de date fixe) ; `format::load_fragment_parts(manifest, ybin)` et `format::load_fragment(bytes)`. Page : **même découpage que l'enregistrement d'un onglet** : sans asset cité, ZIP du cœur (second module jamais chargé) ; avec assets, parties du cœur puis `ContainerCodec.write` ; lecture par `ContainerCodec.read`, repli `loadFragment` si le module est indisponible. Pas de vignette, de mots-clés ni de description (C4). | U9 (« le cœur écrit et lit le manifeste et `document.ybin` du fragment, le Worker ajoute ou extrait les assets ») ; `workspace.ts:161-169` (`encodeTab`), `:172-210` (`readDocument`) ; `container.ts:29-35` (`ContainerCodec`) ; `format/mod.rs:149`, `:171` | oui (HZ1-5) |
| Z7 | Placement d'une insertion | Fragment **déposé** : centre de ses `bounds` au point de dépôt ; **collé** ou importé sans point : centre de la vue, décalé de `CASCADE_STEP` (24 px monde) × n, n = collages successifs du même contenu depuis la dernière copie. Après insertion : outil Sélection actif, sélection = objets insérés. Pages insérées : la vue montre la première page insérée. | `image-import.ts:194` (`anchorOf`), `:31` (`CASCADE_STEP`), `:212-222` (`placement`, cascade R4) ; design existant (image collée au centre de la vue, R19) | oui (HZ1-3) |
| Z8 | Presse-papiers | Copier (`copy` sur `window`, Ctrl+C) et Couper (`cut`, Ctrl+X = copier puis `Delete`, une étape) hors cible éditable (`isEditable`, `paste.ts:13`) et avec une sélection : `.rbitem` de la sélection (Z6), gardé dans le **presse-papiers interne** (un par fenêtre, partagé par les onglets), puis écrit dans le **presse-papiers système** en `text/plain` = enveloppe JSON exacte `{"format":"roomboard-items/1","rbitem":"<base64>"}`, par `navigator.clipboard.write([new ClipboardItem({"text/plain": promesse})])` appelé pendant le geste, repli `writeText` ; échec = interne seul, avis « copié dans RoomBoard seulement ». Coller (`paste`) lit le système ; le bouton « Coller » lit l'interne. Enveloppe d'un `format` `roomboard-items/N` plus récent : refus « mettez RoomBoard à jour » ; enveloppe de plus de 100 Mo décodés : refus. Base64 sans dépendance (`btoa` par morceaux). Format natif propre à la coque : hors périmètre (aucun build Tauri dans ce chantier). | U9 (enveloppe) ; ligne C3 (`:546` : « presse-papiers à format propre : coque seulement (web : repli texte) ») ; brief (« Aucun build Tauri ») ; `paste.ts:13-18` ; `import.ts:13` (`WEB_MAX_BYTES`) ; U39 | oui (HZ1-1, HZ2-3, HZ2-4) |
| Z9 | Point d'entrée unique du collage | **`handlePaste(e: PasteEventLike, sink: PasteSink): Promise<void> \| null` de `apps/web/src/platform/paste.ts`**, posé par OD80 (section 3, « Point d'entrée du collage ») et étendu ici : objets RoomBoard d'abord, puis `<table>` HTML (OD80), puis fichiers image. | `feat/usage-c10b-tableau:apps/web/src/platform/paste.ts` (`handlePaste`, `PasteSink`) ; `main.ts:109-116` (écouteur unique) ; R19 (`usage-c2-depot-cadrage.md:61` : « Texte et HTML : ignorés (C3) ») | oui |
| Z10 | Ouvrir, importer, déposer un `.rbitem` | Entrée `rbitem` du registre d'import (`nature: "objet"`, détection : nom en `.rbitem` **et** en-tête ZIP `PK\x03\x04`) : fragment lu (Z6), assets adoptés par le magasin de l'onglet, `insert_fragment` au point de dépôt (Z7). `IMPORT_EXTENSIONS` gagne `rbitem`. Coque : `ASSOCIATED_EXTENSIONS` gagne `rbitem`, `bundle.fileAssociations` gagne `{ext: ["rbitem"], name: "Objet RoomBoard", mimeType: "application/x-roomboard-item", role: "Editor"}` ; un `.rbitem` passé au lancement s'insère dans le premier onglet. Ouvrir (Ctrl+O, filtre `.roomboard`) d'un fragment renommé : refus clair (Z3). `kind` `grid` ou `pack` : refus « prochaine version » (C4). | U25 (« Objets (…, `.rbitem`, …) → insérés sur la page montrée au point de dépôt ») ; DAU5 (chaîne d'import unique) ; `import.ts:59-64` (`ImportHandler`), `:88` (registre) ; `files.ts:66-67` ; `roomboard-shell/src/lib.rs:14` ; `tauri.conf.json` (`fileAssociations`) | oui (HZ1-7) |
| Z11 | Exporter la sélection | Action « Exporter la sélection » : `.rbitem` (Z6), nom proposé `Sélection.rbitem`, écrit par un port de fichiers typés (DAZ4) : `profile-files.ts` est généralisé en `typed-files.ts` (web : téléchargement ; coque : boîte filtrée `rbitem` puis `plugin-fs`), `ProfileFiles` devient une instance de texte de ce port. `FileHost` reste réservé au `.roomboard`. | décision C1 (`profile-files.ts:1-5` : « `FileHost` reste réservé au `.roomboard` ») ; U8 | oui |
| Z12 | Insérer les pages d'un document | Action « Insérer des pages… » : boîte d'ouverture du `.roomboard` (`FileHost.open`), lecture par le même lecteur que l'ouverture d'un onglet (`readDocument`, Z6), assets adoptés par le magasin de l'onglet actif, `insert_pages` après la page montrée, une étape. Source dont un asset cité n'a pas pu être lu (module des formats indisponible) : refus, rien n'est inséré. Le dépôt n'insère **jamais** de pages (Q1). | Q1 (`:619-624`) ; U25 amendée ; U22 (« Insérer ses pages », réutilisé par C11a) ; `files.ts:69-72` (`FileHost.open`) ; R30 (`workspace.ts:207-209`, asset manquant = enregistrement refusé) | oui (HZ2-6) |
| Z13 | Barre et raccourcis | **Rangée « Sélection »** contextuelle, composant neuf `ui/SelectionRow.tsx` sur le patron de `TableActionRow` et `FormatRow` : montrée avec l'outil Sélection, cinq boutons « Grouper », « Dégrouper », « Copier », « Coller », « Exporter » ; désactivés selon l'état (Grouper : moins de deux unités ; Dégrouper : aucun groupe dans la sélection ; Copier, Exporter : sélection vide ; Coller : presse-papiers interne vide) ; hors du catalogue de l'éditeur de profils. « Insérer des pages… » = action de catalogue `page-insert-file` dans `ACTION_TABLE`, ajoutée à la barre des pages du profil par défaut. Raccourcis : Ctrl+G grouper, Ctrl+Maj+G dégrouper (Cmd sous macOS), pris par `keyAction` hors champ éditable ; Ctrl+C, Ctrl+X, Ctrl+V par les événements `copy`, `cut`, `paste`. Porte visuelle de fin de lot. | design existant : `Toolbar.tsx:112-143` (`TableActionRow`), `:159-163`, C7b R13 (`usage-c7b-texte-riche-cadrage.md:37` : rangée contextuelle hors catalogue) ; `toolbar.ts:98` (`ACTION_TABLE`) ; `toolbar-profiles.ts:24-39` (`pagesBar`) ; `keys.ts:25-34` ; principes `impeccable` | oui (HZ1-4, HZ1-2) |
| Z14 | Fausse liaison et contrat | Chaque méthode neuve du cœur entre dans la fausse liaison (`fake-core.ts`) et dans un bloc `describe.each` « contrat C3 » joué sur les deux fabriques (`wasm-core.contract.test.ts`). Mélanger une source fausse et une cible Wasm lève une `Error`. Fixtures neuves : `crates/roomboard-core/tests/fixtures/fragment-v1.rbitem` (trait, forme, texte riche, tableau, groupe imbriqué) et un essai `compat_c3.rs` qui relit le fixture du socle (mêmes octets réécrits) et ce fragment. | patron des chantiers C2 à C10a (`wasm-core.contract.test.ts:203-1742`) ; `compat_socle.rs:105` (`socle_fixture_resaves_identically`) | oui |
| Z15 | Preuve | Essai Playwright neuf `scripts/essais/c3-groupes-navigateur.mjs`, joué par `scripts/verifier.sh --e2e` : grouper deux objets, les déplacer ensemble, copier (Ctrl+C réel, enveloppe relue par `navigator.clipboard.readText` avec les permissions de Chromium accordées), coller (`ClipboardEvent` porteur de l'enveloppe, patron d'OD80, puis bouton « Coller »), exporter la sélection, enregistrer puis rouvrir (groupes présents). Captures `docs/essais/c3-groupe-selectionne.png` et `docs/essais/c3-collage.png`. Aucun build Tauri. Plafond du module Wasm principal (1 572 864 octets, H2-13) ni baissé ni relevé : **966 741 octets mesurés** sur `98bf320` (`apps/web/dist/assets/roomboard_wasm_bg-Cxps_ZOS.wasm`), **marge 606 123 octets** ; module des formats 385 454 octets (plafond 3 Mio, R9). | brief ; `verifier.sh:54-57`, `:92-103` ; essai C10b (`c10b-tableau-navigateur.mjs:139-147`, `ClipboardEvent` synthétique) | oui |

## 3. Carte d'impact

Rubriques déduites (le profil n'a pas de ligne « Surfaces d'impact ») : cœur Rust, liaison Wasm, conteneur, interface web,
coque, persistance et format, outillage, tests, autres dépôts. V : lu dans le code ; S : supposé.

### Cœur Rust (`crates/roomboard-core`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/element.rs:75` (`ElementView`), `:97` (`bare`) | oui | champ `group` lu et exposé (Z1) | V |
| `src/element.rs:25` (`KNOWN_KINDS`) | non | aucun `kind` neuf ; la copie (Z4) ne dépend pas des types (constat ouvert à ne pas aggraver) | V |
| `src/commands.rs:30` (`Command`), `:175` (`CommandError`), `:472` (`apply`) | oui | `Group`, `Ungroup`, `BadGroup` (Z1) | V |
| `src/commands.rs:979-1053` (`cmd_erase`) | oui | morceaux qui héritent du `group` du trait coupé (Z1) | V |
| `src/commands.rs:644` (`cmd_transform`), `:1055` (`cmd_delete`) | non | appelés tels quels sur les membres d'un groupe | V |
| `src/copy.rs` (neuf) | oui | recopie profonde, `extract`, `insert_fragment`, `insert_pages` (Z4, Z5, DAZ1) | S |
| `src/document.rs:572` (`collect_out`), `:179` (`cited_assets`), `:214` (`insert_asset_meta`), `:75` (`insert_page`) | non | appelés par `copy.rs` (assets cités du fragment, métadonnées recopiées) | V |
| `src/format/mod.rs:22-29` (`Manifest`), `:189` (`check_manifest`), `:237` (`load_parts`), `:72` (`load`) | oui | `kind`, `name`, `bounds` ; `UnknownKind`, `WrongKind` ; `save_fragment(_parts)`, `load_fragment(_parts)` (Z3, Z6) | V |
| `src/format/mod.rs:149` (`save_parts`), `:183` (`save`) | non | sortie d'un document inchangée (aucun `kind` écrit) | V |
| `src/query.rs:192` (`hit_test`), `:218` (`ids_in_rect`), `:227` (`bounds`) | non | appelés tels quels ; la remontée au groupe se fait dans la page (Z2) | V |
| `src/history.rs` | non | une transaction `"local"` = une étape (D11) | V |
| `src/table.rs`, `src/rich_text.rs` | non | sous-types recopiés par `AsPrelim` sans code propre (DAU10) | V |
| `src/lib.rs` | oui | `pub mod copy` | V |

### Liaison Wasm et conteneur (`crates/roomboard-wasm`, `crates/roomboard-formats`, `crates/roomboard-formats-wasm`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `roomboard-wasm/src/lib.rs:412` (`load`), `:421` (`load_parts`), `:425` (`save_parts`) | oui | refus d'un fragment ; `load_fragment`, `load_fragment_parts`, `save_fragment`, `save_fragment_parts`, `extract`, `insert_fragment(&Document, …)`, `insert_pages(&Document, …)`, `group`, `ungroup` (Z3, Z5, Z6) | V |
| `roomboard-wasm/src/lib.rs:807` (`element`) | oui | vue avec `group` | V |
| `roomboard-formats/src/container.rs:75` (`write`) | non | écrit les parties du cœur et les assets, quel que soit le `kind` | V |
| `roomboard-formats-wasm/src/lib.rs:19-57` (`ContainerReader`, `write_container_inner`) | non | appelés tels quels pour un `.rbitem` avec assets | V |

### Interface web (`apps/web/src`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `core/api.ts:35` (`Command`), `:135` (`ElementBase`), `:176` (`CoreDocument`), `:211` (`CoreFactory`) | oui | `Group`, `Ungroup`, `group?`, `extract`, `saveFragment(Parts)`, `insertFragment`, `insertPages`, `loadFragment(Parts)` | V |
| `core/wasm-core.ts:147` (`toElementView`) | oui | lit `group` | V |
| `core/fake-core.ts:722` (`saveParts`), `:787` (`save`), `:1038` (`loadParts`) | oui | mêmes méthodes neuves (Z14) | V |
| `engine/tools/select.ts:116-136` (`begin`), `:158-161` (rectangle) | oui | remontée au groupe extérieur (Z2) ; **aussi modifié par OD80** | V |
| `engine/groups.ts` (neuf) | oui | règle de sélection par groupe (DAZ5) | S |
| `engine/engine.ts:70-118` (`Engine`), `:30` (`EngineState.selection`), `:440-472` (`key`) | oui | `group`, `ungroup`, `insert(src, place)`, état des boutons (unités, groupe présent) ; Ctrl+G | V |
| `engine/input/keys.ts:23-34` (`keyAction`) | oui | `"group"`, `"ungroup"` | V |
| `engine/render/overlay.ts`, `render/select.ts` | non | le cadre d'un groupe est le cadre de la sélection existant | V |
| `app/workspace.ts:161-169` (`encodeTab`), `:172-210` (`readDocument`) | oui | déplacés dans `app/container-io.ts` (DAZ3), appelés par l'onglet, le fragment et l'insertion de pages | V |
| `app/workspace.ts:60-80` (`Workspace`), `:317` (`importFiles`) | oui | `copySelection`, `pasteItems`, `pasteInternal`, `exportSelection`, `insertPages` ; **aussi modifié par OD80** (`pasteTable`) | V |
| `app/fragments.ts` (neuf) | oui | opérations sur la sélection d'un onglet (copier, coller, exporter, insérer), DAZ3 | S |
| `app/toolbar-host.ts:27-48` (`ACTIONS`), `:18-23` (`HostTargets`) | oui | `page-insert-file` et les boutons de la rangée ; **aussi modifié par OD80** | V |
| `platform/paste.ts:20-25` (`pastedFiles`) et `handlePaste` d'OD80 | oui | branche « objets RoomBoard » en tête (Z9) | V |
| `platform/clipboard.ts` (neuf) | oui | enveloppe, presse-papiers interne et système, `handleCopy` (DAZ4) | S |
| `platform/import.ts:59-64`, `:88` (registre) | oui | entrée `rbitem` (Z10) ; **aussi modifié par OD80** (`sheetHandler`, `limit`) | V |
| `platform/image-import.ts:194` (`anchorOf`), `:31` (`CASCADE_STEP`) | non | appelés pour le placement (Z7) | V |
| `platform/files.ts:6-9`, `:66-67` (`IMPORT_EXTENSIONS`) | oui | `RBITEM_EXTENSION`, `RBITEM_MIME`, `rbitem` importable | V |
| `platform/files.ts:69-82` (`FileHost`), hôtes `host-tauri.ts`, `host-fsa.ts`, `host-repli.ts` | non | `open()` réutilisé pour « Insérer des pages… » ; `save` reste au `.roomboard` | V |
| `platform/profile-files.ts:10-50` | oui | généralisé en `typed-files.ts` (DAZ4) | V |
| `main.ts:109-116` (écouteur `paste`) | oui | écouteurs `copy` et `cut` ; **aussi modifié par OD80** (`handlePaste`) | V |
| `toolbar.ts:98-119` (`ACTION_TABLE`) | oui | `page-insert-file` ; **aussi modifié par OD80** | V |
| `toolbar-profiles.ts:24-39` (`pagesBar`) | oui | « Insérer des pages… » dans la barre des pages par défaut | V |
| `ui/Toolbar.tsx:159-163`, `ui/SelectionRow.tsx` (neuf), `ui/item-state.ts:6-17` (`ToolbarView`) | oui | rangée « Sélection » et son état (Z13) | V |
| `app/text-editor.ts:266-270` (collage dans la zone de saisie) | non | cible éditable : `copy`, `cut`, `paste` restent ceux du navigateur | V |

### Coque (`apps/desktop`, `crates/roomboard-shell`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-shell/src/lib.rs:14` (`ASSOCIATED_EXTENSIONS`) | oui | `rbitem` (Z10), testé par `cargo test` | V |
| `apps/desktop/src-tauri/tauri.conf.json` (`bundle.fileAssociations`) | oui | association `.rbitem`, écrite sans build (HZ1-7) | V |
| `tauri.conf.json` (`csp`), `capabilities/default.json` | non | aucune permission neuve : le presse-papiers passe par la WebView (`navigator.clipboard`) | V |
| `src-tauri/src/main.rs` | non | le lancement relaie déjà les fichiers associés | V |

### Persistance et format

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| fichiers `.roomboard` | oui | champ `group` facultatif ; **aucun `kind` écrit** : mêmes octets pour un document sans groupe | V |
| `.rbitem` (neuf) | oui | ZIP `manifest.json` (`kind: "fragment"`, `name`, `bounds`) + `document.ybin` + `assets/` cités | S |
| presse-papiers système | oui | `text/plain` = enveloppe JSON (U9) | S |
| attente IndexedDB (`pending.ts`) | non | l'insertion de pages ne recharge pas la page | V |

### Outillage, scripts

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/verifier.sh:92-103` (liste `--e2e`) | oui | ligne de l'essai C3 ; **aussi modifié par OD80** (ligne C10b) | V |
| `scripts/verifier.sh:54-57` (plafond Wasm) | non | plafond ni baissé ni relevé | V |
| `scripts/essais/commun.mjs` | non | appelé tel quel (`serve`, `coqueCsp`, `inkIn`) ; **modifié par OD80** | V |
| `scripts/controle-licences.mjs`, `THIRD_PARTY_NOTICES.md` | non | aucune dépendance neuve (U39) | V |
| `scripts/controle-hors-ligne.mjs` | non | aucune ressource externe | V |

### Tests

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core/tests/compat_socle.rs:105` (`socle_fixture_resaves_identically`) | non | à garder vert : preuve des mêmes octets | V |
| `crates/roomboard-core/src/format/mod.rs:311-652` (21 tests, dont `manifest_fields_are_written`, `save_is_deterministic`, `newer_schema_is_refused`) | non | à garder verts | V |
| `crates/roomboard-core/tests/compat_c3.rs`, `tests/fixtures/fragment-v1.rbitem` (neufs) | oui | Z14 | S |
| `crates/roomboard-core/src/query.rs:347` (`ids_in_rect_requires_full_inclusion`) | non | à garder vert | V |
| `apps/web/src/core/wasm-core.contract.test.ts` | oui | bloc « contrat C3 » | V |
| `apps/web/src/engine/tools/select.test.ts` | oui | clic, Maj+clic, rectangle avec groupes ; tests existants verts | V |
| `apps/web/src/platform/paste.test.ts` | oui | ordre objets → tableau → images ; tests d'OD80 verts | V |
| `apps/web/src/platform/profile-files.test.ts` | non | à garder vert après DAZ4 | V |
| `apps/web/src/app/workspace.test.ts`, `platform/container.contract.test.ts` | non | à garder verts après le déplacement vers `container-io.ts` | V |
| `apps/web/src/toolbar-profiles.test.ts`, `ui/PagesBar.test.tsx`, `toolbar.test.ts` | oui | action `page-insert-file` dans le profil par défaut | V |
| `platform/files.test.ts:65` (`IMPORT_FILTER`), `host-tauri.test.ts:226` | oui | `rbitem` dans le filtre | V |
| `scripts/essais/*.mjs` existants (s2, s34, fichiers, s5b, c2, c1, c10a, c9, c7b) | non | à garder verts | V |

### Autres dépôts et services

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `~/projets/actcraft` | non | référence seulement | V |
| presse-papiers natif de la coque (crate Rust, format propre) | non (hors périmètre) | build Tauri exclu | S |

### Effets de bord sur l'existant

- Gomme partielle d'un trait groupé : les morceaux gardent le `group` (avant : aucun champ recopié). Test neuf
  `partial_erase_keeps_group` (cœur) et son pendant du contrat C3.
- Clic sur un élément groupé : tout le groupe est sélectionné (avant : l'élément seul). Tests neufs de `select.test.ts`
  (`clic sur un membre : groupe extérieur`, `Maj+clic : groupe entier`, `rectangle : groupe pris seulement entier`) ;
  tests existants verts (aucun groupe).
- Manifeste : un document reste écrit sans `kind` ; `socle_fixture_resaves_identically` et `save_is_deterministic` restent
  verts ; tests neufs `manifest_without_kind_is_document`, `unknown_kind_is_refused`, `fragment_is_not_a_document`,
  `document_is_not_a_fragment`.
- Ouvrir un fichier dont le `kind` est `fragment` ou inconnu échoue désormais avec un message (avant : ouvert comme
  document) ; test neuf du contrat C3 et de `workspace.test.ts`.
- Collage : un `text/plain` qui porte l'enveloppe est pris avant le tableau HTML et les images ; un texte ordinaire reste
  ignoré. Tests neufs de `paste.test.ts`, ceux d'OD80 verts.
- `copy` et `cut` sur `window` : pris seulement hors cible éditable et avec une sélection ; la zone de saisie garde le
  copier natif. Test neuf `copie dans une zone éditable : non prise`.
- `encodeTab` et `readDocument` quittent `workspace.ts` pour `container-io.ts` sans changer de comportement :
  `workspace.test.ts` et `container.contract.test.ts` verts.
- `ProfileFiles` passe sur le port de fichiers typés : `profile-files.test.ts` vert.
- Barre des pages du profil par défaut : un bouton de plus ; `toolbar-profiles.test.ts` et `PagesBar.test.tsx` adaptés.
- « Importer » propose aussi `.rbitem` : `files.test.ts:65` et `host-tauri.test.ts:226` adaptés.

### Chantiers en cours

- **OD80, `feat/usage-c10b-tableau` @ `2edbfcb`** (worktrees `usage-c10b-tableau` et `usage-c10b-tableau--T14`, 9/12
  tâches à l'état écrit, relecture en cours, pas encore fusionné) : touche les mêmes fichiers que C3 — `platform/paste.ts`,
  `main.ts`, `app/workspace.ts`, `platform/import.ts`, `engine/tools/select.ts` (`begin`), `engine/engine.ts`,
  `core/api.ts`, `core/fake-core.ts`, `core/wasm-core.ts`, `wasm-core.contract.test.ts`, `crates/roomboard-core/src/commands.rs`,
  `crates/roomboard-wasm/src/lib.rs`, `toolbar.ts`, `app/toolbar-host.ts`, `ui/item-state.ts`, `scripts/verifier.sh`,
  `scripts/essais/commun.mjs`. **Ordre retenu** : les tâches du cœur Rust qui n'éditent pas `commands.rs` (`copy.rs`,
  `format/mod.rs`, `element.rs`, `roomboard-shell`) partent de `98bf320` ; toutes les autres partent d'une base rebasée sur
  `origin/main` **après** la fusion d'OD80. Si OD80 n'est pas fusionné quand elles doivent partir, la tâche du collage crée
  `handlePaste` et `PasteSink` avec la signature exacte d'OD80 (section « Point d'entrée du collage »), pour que le conflit
  se réduise à une branche ajoutée.
- PR ouvertes : aucune (`gh pr list -R jejeasterix/roomboard --state open` vide ; OD80 fusionne en local).
- Autre machine : aucune donnée fournie.

### Termes cherchés

- Coffre : `chercher.js` « roomboard groupes presse-papiers fragment », « presse-papiers clipboard navigateur webview
  collage » ; `grep -ril roomboard 02_Decisions 04_Pieges` (un piège sans rapport) ; note `01_Projets/roomboard.md`.
- Graphe : aucun (`ls ~/.cache/graphes/` : `claude-config`, `roomflow2`, `roomflow2-web`).
- Texte, `98bf320` : `grep -rn "paste\|clipboard" apps/web/src` ; `grep -rn "x-roomboard-item\|rbitem\|roomboard-items"`
  (rien) ; `grep -rn "\"group\"\|\.group\b" apps/web/src crates` (rien) ; `grep -rn "fn .*copy\|fn out_to_in\|deep"
  crates/roomboard-core/src` (rien d'autre que `collect_out`) ; `grep -rn "DeltaPrelim\|In::Text\|TextPrelim"` ;
  `grep -n "impl AsPrelim for" yrs-0.28.1/src` ; `grep -n "pub enum Command" commands.rs` ; `sed cmd_erase` ;
  `grep -n "FILE_FILTER\|ensureExtension\|PROFILE_FILTER"` ; `grep -n "ASSOCIATED_EXTENSIONS"` ; `grep -n
  "codec.read\|codec.write\|citedAssets()"` ; `grep -n "anchorOf\|CASCADE_STEP\|placement"` ; `grep -n "ACTION_TABLE\|
  pagesBar\|TableActionRow\|FormatRow"` ; `grep -n "keyAction\|editAction"` ; `grep -rln "page-remove" *.test.*` ;
  `grep -n "IMPORT_EXTENSIONS\|IMPORT_FILTER" *.test.ts` ; `grep -n 1572864 scripts/verifier.sh` ; `ls -la
  apps/web/dist/assets/*.wasm`.
- OD80 (lecture seule, dépôt principal) : `git log --oneline origin/main...feat/usage-c10b-tableau` ; `git diff --stat` ;
  `git diff -- apps/web/src/platform/paste.ts apps/web/src/main.ts apps/web/src/platform/import.ts
  apps/web/src/app/workspace.ts apps/web/src/toolbar.ts apps/web/src/ui/item-state.ts apps/web/src/app/toolbar-host.ts
  apps/web/src/engine/tools/select.ts` ; `git show …:docs/sessions/usage-c10b-tableau-etat.md` ; `git show
  …:scripts/essais/c10b-tableau-navigateur.mjs | grep ClipboardEvent`.
- Cadrages : `grep -n "rbitem\|C3\b\|presse\|R19"` dans `usage-c2-depot`, `usage-c2-coeur`, `usage-c7b`, `usage-c10a` ;
  `docs/architecture-constats.md` (lignes ouvertes des zones touchées).
- `git worktree list`, `gh pr list -R jejeasterix/roomboard --state open`.

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| Copie profonde d'un élément ou d'une page | yrs 0.28.1 `AsPrelim` (`out.rs:106`, `types/map.rs:127`, `types/text.rs:466`) | `MapRef::as_prelim(&txn) -> MapPrelim`, `Out::as_prelim(&txn) -> In` | réutiliser |
| Recopier, extraire, insérer | aucun (termes `copy`, `clone_`, `out_to_in`, `deep` : rien) | `copy.rs` : `pub(crate) fn copy_elements(src: &impl ReadTxn, from: &[MapRef], dst: &mut TransactionMut, into: &ArrayRef, ids: &mut IdMap, dx: f64, dy: f64) -> Vec<String>` ; `impl Document { pub fn extract(&self, page: &str, ids: &[String]) -> Result<Document, CommandError>; pub fn insert_fragment(&mut self, src: &Document, page: &str, dx: f64, dy: f64) -> Result<Change, CommandError>; pub fn insert_pages(&mut self, src: &Document, after: &str) -> Result<Change, CommandError> }` | nouveau module (DAZ1, DAZ2) |
| Assets cités du fragment | `document.rs:179` (`cited_assets`, sur `collect_out` `:572`) | appelé sur le document extrait | réutiliser |
| Métadonnées d'asset recopiées | `document.rs:214` (`insert_asset_meta`) | appelé pour chaque asset absent de la cible | réutiliser |
| Identifiants neufs | `yrs::uuid_v4` (D3) | appelé par élément, page et groupe | réutiliser |
| Grouper, dégrouper | `commands.rs:30` (`Command`), `:472` (`apply`) | variantes `Group { ids: Vec<String> }`, `Ungroup { ids: Vec<String> }`, erreur `BadGroup` | étendre |
| Morceaux de gomme | `commands.rs:979` (`cmd_erase`, `Cut`) | `Cut.group: Option<Any>` recopié sur chaque morceau | étendre |
| Déplacer, redimensionner un groupe | `commands.rs:644` (`Transform{ids, matrix}`) ; `select.ts:158-167` | appelés avec les ids des membres | réutiliser |
| Sélection par groupe | aucun (termes `group`, `outer`, `expand` : rien) | `engine/groups.ts` : `outerGroup(e: ElementView): string \| null` ; `expandToGroups(ids: readonly string[], page: readonly ElementView[]): string[]` ; `keepWholeGroups(ids: readonly string[], page: readonly ElementView[]): string[]` ; `selectionUnits(ids: readonly string[], page: readonly ElementView[]): { units: number; grouped: boolean }` | nouveau module (DAZ5) |
| Manifeste et lecture contrôlée | `format/mod.rs:22-29` (`Manifest`), `:189` (`check_manifest`), `:237` (`load_parts`) | `Manifest { kind: Option<String>, name: Option<String>, bounds: Option<Bounds>, … }` ; `FormatError::{UnknownKind { found: String }, WrongKind { expected: &'static str }}` ; `save_fragment_parts(doc: &Document, meta: &SaveMeta, name: &str) -> Result<Parts, FormatError>` ; `save_fragment(…) -> Result<Vec<u8>, FormatError>` ; `load_fragment_parts(manifest: &[u8], ybin: &[u8]) -> Result<(Document, Manifest), FormatError>` ; `load_fragment(bytes: &[u8]) -> Result<(Document, Manifest), FormatError>` | étendre |
| Écrire et lire un `.rbitem` avec assets | `workspace.ts:161-169` (`encodeTab`), `:172-210` (`readDocument`) ; `container.ts:29-35` (`ContainerCodec`) | déplacés dans `app/container-io.ts` : `createContainerIO(deps: { core: CoreFactory; codec: ContainerCodec; say(m: string): Promise<void>; makeAssets(): AssetStore }): ContainerIO` ; `ContainerIO.encode(doc: CoreDocument, assets: AssetStore, now: string, appVersion: string, as: { kind: "document" } \| { kind: "fragment"; name: string }): Promise<Uint8Array>` ; `ContainerIO.read(name: string, bytes: Uint8Array, kind: "document" \| "fragment"): Promise<{ doc: CoreDocument; assets: AssetStore; unread: boolean } \| null>` | étendre (DAZ3) |
| Remise du type d'un `Blob` | `workspace.ts:151` (`typed`) et `image-import.ts:250` (constat ouvert) | `typed` part avec `container-io.ts` et devient exporté ; `image-import.ts` peut l'appeler | réutiliser (ferme le constat si la tâche le fait) |
| Opérations sur la sélection d'un onglet | aucun (termes `copySelection`, `export`, `fragment` : rien) | `app/fragments.ts` : `createFragmentOps(deps: { io: ContainerIO; now(): string; appVersion: string; say(m: string): Promise<void> }): FragmentOps` ; `FragmentOps.encodeSelection(tab: TabSession): Promise<Uint8Array \| null>` ; `FragmentOps.insert(tab: TabSession, rbitem: Uint8Array, name: string, at: Point \| null): Promise<boolean>` ; `FragmentOps.insertPages(tab: TabSession, file: OpenedFile): Promise<boolean>` | nouveau module (DAZ3) |
| Point d'insertion | `image-import.ts:194` (`anchorOf`), `:31` (`CASCADE_STEP`) | `anchorOf(rect, camera, at)` puis cascade | réutiliser |
| Adopter les assets reçus | `core/asset-store.ts:19` (`adopt`) | `assets.adopt(id, blob)` | réutiliser |
| Point d'entrée du collage | `feat/usage-c10b-tableau:platform/paste.ts` (`handlePaste`, `PasteSink`) | `PasteSink.pasteItems(rbitem: Uint8Array): Promise<boolean>` ajouté ; branche en tête de `handlePaste` | étendre (Z9) |
| Cible éditable | `paste.ts:13` (`isEditable`) | appelé par `handleCopy` | réutiliser |
| Enveloppe et presse-papiers | aucun (termes `clipboard`, `ClipboardItem`, `writeText`, `base64` : seul `proto/stylet.ts`, `clipboard.writeText` d'un prototype) | `platform/clipboard.ts` : `ITEMS_FORMAT = "roomboard-items/1"` ; `toEnvelope(rbitem: Uint8Array): string` ; `fromEnvelope(text: string): Uint8Array \| "newer" \| "too-big" \| null` ; `createClipboard(sys: SystemClipboard \| null): Clipboard` avec `Clipboard.put(rbitem: Promise<Uint8Array>): Promise<"system" \| "internal">`, `Clipboard.last(): Uint8Array \| null` ; `handleCopy(e: CopyEventLike, sink: CopySink, cut: boolean): Promise<void> \| null` | nouveau module (DAZ4) |
| Importer, déposer, lancer un `.rbitem` | `import.ts:59-64` (`ImportHandler`), `:88` (registre) | `rbitemHandler(deps: { insert(rbitem: Blob, name: string, at: Point \| null): Promise<boolean> }): ImportHandler` | étendre |
| Enregistrer un `.rbitem` | `platform/profile-files.ts:10-50` (`ProfileFiles`) | `platform/typed-files.ts` : `FileType = { extension: string; mime: string; filter: { name: string; extensions: readonly string[] }; accept: string }` ; `TypedFiles { pick(): Promise<{ name: string; bytes: Uint8Array } \| null>; save(name: string, bytes: Uint8Array): Promise<boolean> }` ; `createWebTypedFiles(deps, type)`, `createTauriTypedFiles(dialog, fs, type)` ; `ProfileFiles` = enveloppe texte d'une instance | étendre (DAZ4) |
| Insérer des pages : choisir le fichier | `files.ts:69-72` (`FileHost.open`) | appelé tel quel | réutiliser |
| Action de la barre | `toolbar.ts:98` (`ACTION_TABLE`), `toolbar-host.ts:27` (`ACTIONS`), `toolbar-profiles.ts:24` (`pagesBar`) | entrée `page-insert-file` | étendre |
| Rangée contextuelle | `ui/Toolbar.tsx:112` (`TableActionRow`), `ui/FormatRow.tsx` | composant voisin `SelectionRow(props: { view: Accessor<ToolbarView>; host: ToolbarHost }): JSX.Element` ; `ToolbarHost.selection(a: SelectionAction): void`, `SelectionAction = "group" \| "ungroup" \| "copy" \| "paste" \| "export"` | nouveau module : `ui/SelectionRow.tsx` (les deux rangées existantes sont propres au tableau et au texte ; termes `rangée`, `Row`, `selection` : rien) |
| Raccourcis | `keys.ts:25` (`keyAction`) | `KeyAction` gagne `"group"`, `"ungroup"` | étendre |
| Associer `.rbitem` | `roomboard-shell/src/lib.rs:14` (`ASSOCIATED_EXTENSIONS`), `tauri.conf.json` (`fileAssociations`) | une entrée de plus chacun | étendre |
| Essai au navigateur | `scripts/essais/commun.mjs` (`serve`, `loadPlaywright`, `coqueCsp`, `inkIn`) | appelés tels quels | réutiliser |

Constats d'architecture ouverts des zones touchées (`docs/architecture-constats.md`) : `element.rs:25` (`KNOWN_KINDS`
doublé) — C3 n'ajoute aucun `kind`, à ne pas aggraver ; `workspace.ts:151` (`typed` en deux copies) — fermé en passant si
la tâche de `container-io.ts` fait appeler `typed` par `image-import.ts` ; `api.ts:145`, `fake-core.ts:73` — non touchés.
Aucune demande « Constats à fermer ».

### Point d'entrée du collage

**Un seul point d'entrée : `handlePaste(e: PasteEventLike, sink: PasteSink): Promise<void> | null`, dans
`apps/web/src/platform/paste.ts`**, appelé par le seul écouteur `paste` de `window` (`main.ts`). Il n'existe pas encore dans
`main` (`98bf320` n'a que `pastedFiles`) ; OD80 le crée (`feat/usage-c10b-tableau`, avec `PasteSink { pasteTable(html:
string): Promise<boolean>; importFiles(files, at: null): Promise<unknown> }` et `pastedTableHtml`). C3 le **réutilise** et
l'étend ainsi, sans toucher aux branches d'OD80 :

```ts
export interface PasteSink {
  /** C3 : objets RoomBoard (.rbitem décodé de l'enveloppe) dans l'onglet actif ; vrai si pris (inséré ou refusé avec avis). */
  pasteItems(rbitem: Uint8Array): Promise<boolean>;
  pasteTable(html: string): Promise<boolean>;              // OD80
  importFiles(files: readonly DroppedFile[], at: null): Promise<unknown>; // OD80
}
// Ordre : 1. enveloppe `roomboard-items/N` dans text/plain (pastedItems, platform/clipboard.ts) ;
//         2. <table> HTML (OD80) ; 3. fichiers image (R19). Cible éditable : null partout (collage natif).
```

Un `<table>` HTML collé ne passe jamais par `clipboard.ts`, et une enveloppe jamais par `html-table.ts` : chaque format a
son lecteur, `handlePaste` seul décide de l'ordre. Un futur format collé (HTML d'image, SVG en texte) s'ajoute comme une
branche de plus de `handlePaste`, jamais comme un second écouteur.

## 4. Hypothèses à revoir

**Niveau 1 — difficiles à défaire ou visibles des utilisateurs**

- **HZ1-1** Le presse-papiers système porte l'enveloppe JSON en `text/plain` : coller dans un traitement de texte montre
  ce JSON. Format propre de la coque (sans texte visible) reporté à un chantier qui peut construire la coque (Z8).
- **HZ1-2** Raccourcis Ctrl+G et Ctrl+Maj+G (Cmd sous macOS) ; Ctrl+G n'ouvre plus « rechercher le suivant » du
  navigateur hors champ (Z13).
- **HZ1-3** Collage au centre de la vue avec cascade de 24 px ; l'outil Sélection est activé avec les objets collés
  sélectionnés ; les pages insérées sont montrées (Z7).
- **HZ1-4** Rangée « Sélection » à cinq boutons, contextuelle à l'outil Sélection, hors catalogue des profils ;
  « Insérer des pages… » dans la barre des pages par défaut. Choix visuel signalé pour la porte visuelle (Z13).
- **HZ1-5** Un `.rbitem` de C3 n'a ni vignette, ni mots-clés, ni description (C4 les ajoute) ; son manifeste porte
  `name` et `bounds` (Z6). Extensions et MIME : HU1-1.
- **HZ1-6** Pas d'entrée dans un groupe : modifier un seul membre demande de dégrouper ; un groupe n'est pris au
  rectangle que s'il y est entier (Z2).
- **HZ1-7** Association `.rbitem` écrite dans `tauri.conf.json` sans build ni essai : à prouver sur la coque (fiche
  Windows et macOS) (Z10).

**Niveau 2**

- **HZ2-1** `Ungroup{ids}` (ids des membres) au lieu de `Ungroup{groupId}` de DAU3 : une étape pour plusieurs groupes
  sélectionnés (Z1).
- **HZ2-2** Grouper exige au moins deux unités sur une même page (Z1).
- **HZ2-3** Écriture système asynchrone (`ClipboardItem` avec promesse, repli `writeText`) ; échec = interne seul avec
  avis. Tenue sous WKWebView et WebKitGTK non vérifiée : fiche de la coque (Z8).
- **HZ2-4** Enveloppe limitée à 100 Mo décodés ; Couper inclus (copier puis `Delete`, une étape) (Z8).
- **HZ2-5** Le bouton « Coller » lit seulement le presse-papiers interne (lire le système hors événement demande une
  permission) (Z8).
- **HZ2-6** « Insérer des pages… » refuse une source dont un asset n'a pas pu être lu (Z12).
- **HZ2-7** Fragments `kind: "grid"` et `"pack"` refusés « prochaine version » jusqu'à C4 (Z3, Z10).
- **HZ2-8** Copie en presse-papiers d'une image de la sélection (PNG pour les autres applications) : non faite (section 7).

## 5. Décisions d'architecture

**DAZ1 — Une seule recopie, sur `AsPrelim` de yrs.**
Contexte : fragment, collage, insertion de pages et bibliothèque (C4) recopient des éléments de tout type, tableaux et
textes riches compris ; un code par type grossirait avec chaque `kind`.
Décision : `copy.rs` recopie par `as_prelim` (copie profonde générique de yrs 0.28.1), puis réécrit `id`, `group` et la
translation dans la même transaction ; `extract`, `insert_fragment` et `insert_pages` l'appellent.
Conséquences : un `kind` neuf ou inconnu est recopié sans code ; aucune lecture du type dans la copie.

**DAZ2 — Insertions en méthodes du document, pas en `Command`.**
Contexte : `Command` est une donnée simple sérialisable ; la source d'une insertion est un document entier.
Décision : `extract`, `insert_fragment`, `insert_pages` sont des méthodes de `Document` (cœur, Wasm, `CoreDocument`),
une transaction `"local"` chacune ; seules `Group` et `Ungroup` entrent dans `Command`.
Conséquences : la fausse liaison et le contrat gagnent trois méthodes ; une source fausse et une cible Wasm ne se mêlent pas.

**DAZ3 — Lecture et écriture des conteneurs en un module.**
Contexte : onglet, fragment, collage et insertion de pages écrivent ou lisent tous « parties du cœur + assets » ; le code
vit aujourd'hui dans `workspace.ts`.
Décision : `app/container-io.ts` (`encode`, `read` avec le `kind` attendu) reprend `encodeTab` et `readDocument` sans
changer leur comportement ; `app/fragments.ts` porte les opérations sur la sélection et appelle `container-io.ts`.
Conséquences : un seul chemin « sans asset = ZIP du cœur, avec assets = second module » ; `workspace.ts` maigrit.

**DAZ4 — Presse-papiers et fichiers typés en ports de la plateforme.**
Contexte : enveloppe, presse-papiers interne et système, collage ; fichier `.rbitem` hors du `FileHost` du `.roomboard`.
Décision : `platform/clipboard.ts` (enveloppe, `Clipboard`, `handleCopy`), branché sur `handlePaste` ; `platform/typed-files.ts`
généralise `profile-files.ts` à tout type de fichier, `ProfileFiles` en devient une instance.
Conséquences : le format natif de la coque se branchera derrière `SystemClipboard` sans toucher aux appelants.

**DAZ5 — Règle de sélection des groupes dans la page.**
Contexte : `hit_test` et `ids_in_rect` du cœur rendent des éléments ; la fausse liaison doit suivre chaque règle du cœur.
Décision : le cœur expose `group` dans la vue ; `engine/groups.ts` (module pur) remonte au groupe extérieur et filtre le
rectangle ; `select.ts` l'appelle aux deux endroits où il fixe la sélection.
Conséquences : aucune requête neuve du cœur ni de la fausse liaison ; règle testée sans document.

## 6. Scénarios d'acceptation

- **S1 — Grouper et déplacer.** Tracer un trait, une forme et un texte ; outil Sélection, rectangle autour des trois,
  « Grouper » (ou Ctrl+G). Cliquer sur le trait seul : les trois sont sélectionnés, un seul cadre. Les glisser : les trois
  bougent ensemble ; Annuler une fois les remet en place. « Dégrouper » : un clic sur le trait ne prend plus que lui.
- **S2 — Copier puis coller.** Grouper une forme et une image, Ctrl+C ; le presse-papiers système porte
  `{"format":"roomboard-items/1","rbitem":"…"}`. Ouvrir un nouvel onglet, Ctrl+V : la forme et l'image apparaissent au
  centre de la vue, sélectionnées, toujours groupées entre elles, avec des ids neufs ; Ctrl+V encore : une seconde copie
  décalée de 24 px. Annuler retire un collage par étape. Le bouton « Coller » fait de même depuis le presse-papiers interne.
- **S3 — Exporter puis déposer (S5 de l'usage).** Grouper un trait, une forme et un texte riche ; « Exporter » :
  `Sélection.rbitem` est enregistré. Dans un autre document, déposer ce fichier deux fois : deux groupes indépendants,
  ids différents, déplaçables séparément ; annuler deux fois : page vide.
- **S4 — Insérer les pages d'un document.** Sur un document de deux pages, page 1 montrée, « Insérer des pages… » et
  choisir un `.roomboard` de trois pages (une image, une grille) : trois pages arrivent après la page 1 avec leur image et
  leur grille, la première est montrée ; Annuler une fois les retire toutes. Déposer ce même `.roomboard` sur la scène :
  il s'ouvre dans un nouvel onglet, aucune page n'est insérée (Q1).
- **S5 — Enregistrer, rouvrir, compatibilité.** Enregistrer le document de S1 (regroupé), recharger, rouvrir : le
  groupe est là (un clic prend les trois). Ouvrir `socle-v1.roomboard` puis l'enregistrer : mêmes octets. Déposer un
  `.rbitem` dont le manifeste dit `kind: "grid"` : message « pris en charge dans une prochaine version », rien n'est inséré.

Preuve automatique : S1, S2, S3 (export et relecture) et S5 (enregistrer, rouvrir) par `c3-groupes-navigateur.mjs` ;
S4 et la compatibilité des octets par les tests du cœur et du contrat ; dépôt depuis l'explorateur et association
`.rbitem` par la fiche de la coque.

## 7. Hors périmètre

- Format propre du presse-papiers dans la coque (crate Rust, build Tauri) ; image PNG de la sélection dans le
  presse-papiers ; lecture du presse-papiers système par le bouton « Coller ».
- Vignette, mots-clés et description d'un `.rbitem` ; bibliothèque, `.rbpack`, `kind: "grid"` (C4).
- Entrer dans un groupe (double-clic), verrouiller un groupe, Dupliquer (Ctrl+D), aligner ou répartir.
- Menu au point de dépôt et zone de dépôt de la barre en annotation (C11a, U22) : `insert_pages` leur est prêt.
- Synchronisation des groupes ou des assets entre pairs ; ressources (C4), formats C11b et C13.
- Tout build Tauri ; les essais de la coque Windows et macOS (fiches, à Jérôme).

## 8. Portes immédiates

Aucune.
