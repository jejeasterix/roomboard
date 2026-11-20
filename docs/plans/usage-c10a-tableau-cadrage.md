# Cadrage — usage-c10a-tableau (C10a : tableau, structure et saisie)

Cadré en mode autonome le 2026-11-20 (étage 1, cadreur, brief OD71), sans question posée à Jérôme. Ce cadrage court
**cite** U32 (`docs/plans/usage-cadrage.md:85`), DAU10 (`:403-408`) et S11 (`:448-450`, partie C10a) sans les refaire ;
il ne tranche que les détails (T1 à T15). Base : `origin/main` `8247215` (socle, C2, C7, C9, C1 fusionnés). Aucun graphe
graphify pour RoomBoard (`~/.cache/graphes/` n'a que `claude-config`, `roomflow2`, `roomflow2-web`) : recherche texte
seule. Coffre (`~/SecondBrain`, recherche non dégradée) : aucune décision RoomBoard ni tableau dans `02_Decisions`, aucun
piège applicable. Étude citée : `docs/etudes/usage-grille-tableau.md` (§ 3.3 SMART vérifié, § 5.1, § 5.2), rang 2.
Corrigé après la contre-relecture, tour 1 (bloquant B1, importants I1 à I3, mineurs), sans question nouvelle.

## 1. Demande et gabarit

**Demande.** Créer un tableau par une grille de choix (4 × 3 par exemple), écrire dans ses cellules au clavier (Tab
passe à la suivante), insérer et supprimer lignes et colonnes, uniformiser les tailles, choisir une couleur, le retrouver
en rouvrant le `.roomboard` ; plus deux restes : en-tête seul lu avant de refuser un fichier non reconnu (OD56), geste
Playwright S11 joué par `verifier.sh --e2e` et capture d'un 4 × 3 rempli.

**Gabarit.** `chantier`, cadrage court demandé : budget 15 questions, 15 consommées (T1 à T15).

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| T1 | Schéma de l'élément | U32 et DAU10 tels quels, clés fixées : élément `Y.Map{ id, kind: "table", transform, color, size, cols, rows, cells }` ; `cols` = `Y.Array<Y.Map{ id, width }>`, `rows` = `Y.Array<Y.Map{ id, height }>`, ids `yrs::uuid_v4` ; `cells` = `Y.Map` clé `"<rowId>:<colId>"` → `Y.Map{ text: Y.Text, fill? }` ; cellule absente = vide, créée à sa première écriture. `color` = traits et texte ; `size` = taille du texte. C10a n'écrit **jamais** `shade`, `span`, `mergedInto` (place gardée, DAU10) et ne réécrit jamais une cellule en bloc : une commande n'insère que la clé qu'elle change (`text` ou `fill`), les clés inconnues restent. Aucune `Any::Map`. `schema` et `formatVersion` restent 1. | U32 (`usage-cadrage.md:85`) ; DAU10 (`:403-408`) ; U3 (`:56`, jamais `Any::Map`, champ facultatif) ; `element.rs:202-211` | oui jusqu'à la release (HC10-7) |
| T2 | Lecture tolérante et versions sans C10a | `KNOWN_KINDS` gagne `"table"` (`element.rs:27`, `fake-core.ts:91`). Lecture : `color` absent → `#000000`, `size` absent → 36 ; entrée de `cols`/`rows` qui n'est pas un `Y.Map` ou sans `id` texte ou sans taille finie > 0 → sautée (gardée dans le document) ; `text` qui n'est pas un `Y.Text` → vide ; `fill` invalide → aucun ; aucune ligne ou aucune colonne lisible → **repli sur la vue « inconnu »** (cadre gris, `kind: "unknown"`, `sourceKind: "table"`, boîte `w`, `h` ou 100 × 100), jamais `None` : le tableau mal formé reste visible, déplaçable, supprimable. Pour cela `read_unknown` (`element.rs:242-255`) est coupée en deux : le contrôle de `KNOWN_KINDS`, puis `unknown_view(txn, e)` appelée aussi par le repli (`document.rs`, `query.rs:123`). Clés C10b (`shade`, `span`, `mergedInto`) ignorées et gardées. **Version sans C10a** (référence : `main` `8247215`, chemin du `kind` inconnu posé par C2, K8) : le tableau y est un cadre gris de 100 × 100 au coin du tableau (il n'a ni `w` ni `h`), gardé et réécrit tel quel (U3) ; aucune release n'est publiée, aucun utilisateur n'a une telle version. Test cœur sur la forme exacte d'un tableau (§ 6, S4). | U3 ; K8 de C2 (`element.rs:239-255`) ; brief (« ne doit pas perdre le tableau ») ; contre-relecture tour 1 | oui |
| T3 | Commandes du cœur | Six commandes, une transaction `"local"` = une étape chacune, aucune transaction sans effet (D38) : `AddTable{ page, x, y, cols, rows, col_width, row_height, color, size }` ; `SetTableCell{ id, row, col, content, row_height: Option<f64> }` (`row`, `col` = **ids** de ligne et de colonne, chaînes ; même règle pour `SetTableFill` ; seul `InsertTableLine.at` est un rang, `u32`) (différence par `rich_text::apply_text_diff`, hauteur écrite si plus grande, T5) ; `InsertTableLine{ id, axis: Row\|Col, at }` (`at` ∈ 0..=n, taille copiée de la voisine `at-1`, sinon `0`) ; `RemoveTableLine{ id, axis, line: <id> }` (retire aussi les cellules de cette ligne ou colonne, dans la même transaction ; refusée s'il n'en reste qu'une) ; `SetTableSizes{ id, col_width, row_height }` (toutes les colonnes, toutes les lignes) ; `SetTableFill{ id, row, col, fill: Option<String> }`. Erreur nouvelle `BadTable` (dimensions hors 1..=64, taille non finie ou ≤ 0, couleur invalide, ligne ou colonne inconnue, dernière ligne ou colonne) ; id qui n'est pas un tableau → `UnknownElement`. `Change{ pages: [page], ids: [id] }`. | DAU10 (« une commande par opération de structure ») ; D11, D38 ; `commands.rs:30-104`, `:416-485`, `:778-790` ; étude § 3.3 (SMART : « colonne à droite, ligne dessous ») | oui (DAC1) |
| T4 | Tailles et aspect par défaut | Colonne 240, ligne 64 (unités de page) : 8 colonnes = 1 920 = largeur de page ; texte `DEFAULT_TEXT_SIZE` (36) et couleur du stylo courant, comme l'outil Texte (`engine.ts:278`) ; trait 2 unités, marge intérieure 8 (36 × 1,25 + 2 × 8 = 61 ≤ 64) ; aucun fond de cellule par défaut. Coin haut gauche au point cliqué, décalé vers la gauche si le tableau dépasse la largeur de page (x ≥ 0). **Largeur de page lue sur la page** (`ctx.doc.page(page).width`, `PageView.width`, `api.ts:115`), jamais une constante : le constat ouvert `architecture-constats.md:8` (`PAGE_WIDTH` en double dans `api.ts:173` et `engine/page.ts:4`) n'est pas aggravé. Constantes côté page (`TABLE_COL_WIDTH`, `TABLE_ROW_HEIGHT`, `TABLE_PADDING`, `TABLE_LINE_WIDTH`), le cœur ne reçoit que des nombres. Plafond 64 lignes et 64 colonnes (création et insertion), refusé par le cœur (`BadTable`) ; dans la page, « + Ligne » et « + Colonne » sont **grisés** à 64, Tab dans la dernière cellule d'un tableau de 64 lignes est **inerte** (la saisie reste ouverte), la boîte borne ses champs à 64. | brief (« tranche : taille par défaut ») ; `text-layout.ts:11-13` ; `element.rs:12` (largeur 1 920) ; constat `architecture-constats.md:8` | oui (HC10-4, HC10-9) |
| T5 | Hauteur des lignes | Le texte agrandit la ligne : à la validation d'une cellule, la page mesure la hauteur exigée (`richBoxHeight(layoutRich(plainSpans(texte), { size }, largeur de colonne − 2 × 8, measure))` + 2 × 8 : la même mise en lignes que le dessin, B1) et la passe dans `SetTableCell.row_height` ; le cœur l'écrit seulement si elle dépasse la hauteur actuelle. Une ligne ne rapetisse jamais seule (Uniformiser seulement). Le cœur garde ainsi la géométrie exacte (collision, bornes) sans mesurer de police. | étude § 5.2 (« hauteur de ligne calculée côté TS, écrite dans le document comme taille minimale seulement si elle change ») ; § 3.3 (« un texte agrandit la cellule ») ; patron `boxHeight` de `SetText` et `FormatText` (`commands.rs:65-98`) | oui (DAC2) |
| T6 | Création | Outil **Tableau** (`TOOL_TABLE.table`, choix `"table"`), ajouté au groupe `edition` de `defaultToolbars()` après Texte (profils `defaut` et `annotation`, pas `simple`). Clic de l'outil hors d'un tableau → **grille de choix 8 × 8** posée au point cliqué (survol ou flèches : surbrillance et libellé « 4 × 3 » ; clic ou Entrée : crée ; Échap ou clic ailleurs : ferme), sous elle la **boîte** « colonnes, lignes, Créer » (1 à 64). **« 4 × 3 » = 4 colonnes × 3 lignes**, `aria-label` « 4 colonnes, 3 lignes » ; aucune source du dépôt ne fixe l'ordre (l'étude dit « 8 x 8 » sans le préciser) : défaut pris sur la grille d'insertion de Word (connaissance générale, non vérifiée ici), hypothèse HC10-1. Après `AddTable`, la zone de saisie s'ouvre sur la première cellule. | U32 (« grille de choix 8 × 8 et boîte lignes / colonnes ») ; étude § 3.3 ; brief (« taille max de la grille de choix ») ; C1 P15 (`usage-c1-profils-cadrage.md:46`, catalogue) | oui (HC10-1) |
| T7 | Cellule active, tableau sélectionné | **Outil Sélection** : le tableau est un élément comme un autre (clic, déplacer, poignées = mise à l'échelle de tout le tableau, Suppr, Ctrl+Z), aucun code neuf. **Outil Tableau** : clic → le **tableau le plus haut sous le point**, même recouvert d'encre, de texte ou d'image : parcours de `doc.elementIds(page)` du dessus vers le dessous, `doc.element(id)` de `kind: "table"`, point ramené au repère du tableau par `invertMatrix`, puis `cellAt` (`table-geom.ts`, aucune liaison neuve ; `hitTest` rendrait l'encre du dessus). Cellule trouvée → elle devient la **cellule active** et s'ouvre à la saisie ; elle reste active après validation (cadre `EditOverlay.frame`) jusqu'au changement d'outil ou de page. **Clic pendant la saisie** : valide seulement, n'ouvre rien d'autre (comme l'outil Texte, `tools/text.ts:131-134`). **Suppr ou Retour arrière**, saisie fermée, cellule active, outil Tableau : vide le texte de la cellule (`SetTableCell` à `""`, une étape) ; sans cellule active, rien (la suppression de la sélection reste à l'outil Sélection, `engine.ts:376-388`). **Cellule active périmée** (I1) : `TableTool.prune()` est appelé par `run` (`engine.ts:244`) et `history` (`engine.ts:258`) à côté de `selectTool.prune()` ; tableau, ligne ou colonne disparus → cellule active retirée, saisie ouverte fermée sans rien écrire. Après « − Ligne » (resp. « − Colonne ») sur sa propre ligne, la cellule active passe à la même colonne de la ligne suivante, sinon de la précédente (resp. même ligne, colonne suivante sinon précédente), saisie fermée. Pas de sélection de plage de cellules (C10b ou plus tard). L'outil Texte sur un tableau garde son comportement (pose une boîte de texte). | U32 (« édition d'une cellule par la zone de saisie du lot 4 posée sur la cellule ») ; D15 (sélection, lot 4) ; `tools/select.ts:1-6` ; `overlay.ts:21-31` ; `tool.ts:49` (`prune`) ; contre-relecture tour 1 (I1, I2) | oui (HC10-11, HC10-17) |
| T8 | Clavier | **Tab** : valide la cellule, ouvre la suivante dans l'ordre de lecture (fin de ligne → début de la ligne suivante) ; **Tab dans la dernière cellule ajoute une ligne** (`InsertTableLine` en bas) et ouvre sa première cellule. **Maj+Tab** : cellule précédente ; dans la première, rien. **Flèches** : quittent la cellule seulement au bord du texte (← au début, → à la fin, ↑ sans saut de ligne avant le curseur, ↓ sans saut de ligne après) ; au bord du tableau, rien (jamais d'ajout). **Entrée** : saut de ligne dans la cellule. **Échap** : valide et ferme la saisie (cellule toujours active). Pendant une composition IME, aucune de ces touches n'est prise ; toute validation passe par la **porte IME** de l'outil Texte (`tools/text.ts:91-98`, `:154-160` : demande différée jusqu'à `compositionend`), **extraite** dans `engine/tools/commit-gate.ts` (une vingtaine de lignes) et appelée par les deux outils ; l'outil Texte ne change pas de comportement. Ajout de ligne par Tab : aucune source du dépôt (l'étude dit seulement « Tab et flèches entre cellules ») ; défaut pris sur le comportement de Word (connaissance générale, non vérifiée ici), hypothèse HC10-2. | U32 (« Tab et flèches entre cellules ») ; étude § 5.2 (« Entrée = ligne suivante dans la cellule ») ; `text-editor.ts:62-67` (Échap, `isComposing`) ; `keys.ts:27` ; contre-relecture tour 1 | oui (HC10-2, HC10-8) |
| T9 | Annulation | Une étape par opération, sans regroupement : création (tableau vide) ; chaque cellule validée (Tab, flèche, Échap, clic ailleurs) ; chaque insertion, suppression, uniformisation, couleur ; Suppr sur la cellule active (T7). Tab en dernière cellule = deux étapes (le texte de la cellule, puis la ligne ajoutée). Cellule inchangée à la validation : aucune étape. Ctrl+Z pendant la saisie reste celui de la zone de texte (`keys.ts:30`). | D11 (une transaction = une étape, `history.rs:1-4`) ; D38 ; patron de l'outil Texte (« une SetText par validation », `tools/text.ts:1-5`) | oui |
| T10 | Où vivent les boutons | Dans la **rangée contextuelle** de la barre d'outils (C1 P18, `Toolbar.tsx:78-102`), montrée quand l'outil actif est Tableau, à la place des préréglages : « + Ligne » (dessous), « + Colonne » (à droite), « − Ligne », « − Colonne », « Uniformiser », puis les pastilles de couleur. Les cinq boutons de structure sont des **actions** de `ACTION_TABLE` et `ACTIONS` (`table-row-insert`, `table-col-insert`, `table-row-remove`, `table-col-remove`, `table-uniform`), grisées par `ACTION_STATE` sans cellule active (et « − » quand il ne reste qu'une ligne ou colonne). *Modifié à la clôture, 2026-11-20* : elles n'entrent **pas** au catalogue de l'éditeur de profil (`profile-edit.ts`, filtre `TABLE_ACTIONS`) ; ce sont des actions contextuelles de la rangée du tableau, pas des boutons de barre ; un profil enregistré qui les contient reste valide. Couleur : `ToolbarHost.tableFill(fill \| null)`. Aucune barre flottante sur le tableau, aucun menu contextuel. | C1 P18-P19 ; U12 (catalogue) ; étude § 3.3 (« colonne à droite, ligne dessous ») ; `toolbar.ts:97-113` ; `toolbar-host.ts:22-38` ; `item-state.ts:14-24` ; brief (« barre contextuelle existante ? ») | oui (HC10-3, HC10-13) |
| T11 | Uniformiser | Un bouton, une étape (`SetTableSizes`) : toutes les colonnes à la **largeur moyenne** (largeur du tableau gardée) ; toutes les lignes à `max(hauteur moyenne, plus grande hauteur exigée par le contenu à la nouvelle largeur)` (mesure de la page, T5). C'est la seule commande qui peut **réduire** une ligne : `SetTableSizes` écrit les tailles données telles quelles (jamais sous la hauteur exigée, puisque la page la prend en compte). Déjà uniforme : aucune étape. | étude § 3.3 (« Make same height / width / size »), § 5.1 (« commandes de convenance ») ; brief (« on uniformise les tailles ») | oui (HC10-6) |
| T12 | Couleur | « Choisir une couleur » = **remplissage de la cellule active** (`fill`, U32), distinct de l'ombrage (C10b). Pastilles : aucune, `#fef08a`, `#bbf7d0`, `#bfdbfe`, `#fecdd3`, `#e5e7eb` (teintes claires : le texte noir reste lisible ; même gamme que les préréglages `#dc2626`, `#1d4ed8` de `toolbar-profiles.ts:41-47`). Validation : `rich_text::valid_color` / `validColor`. Choix visuel signalé pour l'essai (§ 4). | U32 (« couleur de cellule (`fill`) distincte de l'ombrage révélable ») ; `rich_text.rs:54`, `core/rich-text.ts:55` | oui (HC10-5) |
| T13 | Liaison, contrat TS, fausse liaison, rendu | Wasm : `add_table`, `set_table_cell`, `insert_table_line(id, row: bool, at)`, `remove_table_line(id, row: bool, line)`, `set_table_sizes`, `set_table_fill(id, row, col, fill: Option<String>)`, avec leurs `*_inner` natifs ; vue par `element()` (sérialisation de `TableView`). TS : `ElementKind` et l'union `ElementView` gagnent `TableElement{ kind: "table", table: TableData{ color, size, cols: {id, width}[], rows: {id, height}[], cells: {row, col, text, fill: string \| null}[] } }` ; `Command` gagne les six commandes. `fake-core.ts` : **parité complète** (logique simple, aucun écart à déclarer), contrat commun dans `wasm-core.contract.test.ts`. Rendu (B1, **un seul chemin de dessin du texte**) : `engine/render/table-paint.ts` ne dessine que les fonds et les traits (`paintTableGrid(ctx, t)`) et rend les rectangles de texte des cellules (`cellTextBoxes(t)`) ; **aucun `fillText`**. Le texte de chaque cellule est dessiné par `paintText(ctx, RichLine[], color)` de `canvas2d.ts:122`, dans `paintElement` (translation au coin intérieur de la cellule, découpe au rectangle), sur des lignes `layoutRich(plainSpans(texte), { size }, largeur, measureWith(ctx))` ; le cache `textLines` / `linesOf` (`canvas2d.ts:321-328`) est **étendu** aux cellules (entrée par tableau, clé = taille, largeurs et textes), invalidé par le même `invalidate` (`:312-319`). Le texte des cellules reste brut (C7b : `plainSpans` deviendra les segments de la cellule sans changer le dessin). Poids : le module Wasm est lu par `verifier.sh` (plafond 1 572 864 o, inchangé) ; reste OD55 : une mesure détaillée (`docs/essais/taille-wasm.md`) seulement s'il dépasse 1 400 000 o. | D36 (fausse liaison) ; G12, G13 de C9 (`usage-c9-grille-cadrage.md:34-35`, précédent) ; `lib.rs:391-410`, `:705` ; `wasm-core.ts:110-165`, `:277-310` ; `canvas2d.ts:122`, `:215-237`, `:312-328` ; brief (« cellules en texte riche = C7b », OD55) ; contre-relecture tour 1 (B1) | oui (DAC1) |
| T14 | Reste OD56 : en-tête avant refus | Endroit exact : `import.ts:115` appelle `f.blob()` **avant** la détection ; dans la coque, `grantedFile().blob()` (`host-tauri.ts:76-87`) lit tout le fichier par morceaux de 8 Mo. Correctif : `DroppedFile` gagne `head(n: number): Promise<Uint8Array>` (obligatoire) ; `grantedFile` : un seul `read_granted_file{ offset: 0, len: n }` ; `droppedFromFile` (`drop-web.ts:22`) : `slice(0, n)` ; fichier choisi par Importer (`host-tauri.ts:149`) : `bytes.subarray(0, n)`. `importFiles` lit `head(HEAD_BYTES)` (sauf `.roomboard`, reconnu par son nom), détecte, refuse sans jamais appeler `blob()` ; `blob()` seulement pour un fichier reconnu. Tests : `import.test.ts` (non reconnu : `blob()` jamais appelé, `head` une fois avec 4 096) ; `host-tauri.test.ts` (`head(4096)` = un seul appel `read_granted_file` de 4 096). Ferme le constat `platform/files.ts:49` (peu-profond). | brief OD71 (reste 1) ; constat ouvert `files.ts:49` (« un head(n) le rendrait plus profond (HO1) ») ; HO1 (`usage-c2-depot-etat.md:64`) ; U23 (« Détection par octets magiques (premiers Ko) ») | oui (DAC5) |
| T15 | Reste e2e S11 et capture | Nouveau `scripts/essais/c10a-tableau-navigateur.mjs` sur le modèle de `c2-image-navigateur.mjs` (dist servi en local avec la CSP de la coque, repli `?fichiers=repli`, heure figée, aucune requête hors 127.0.0.1, codes 0/1/2, `--captures` seulement à la main) ; ajouté au bloc `--e2e` de `verifier.sh` et à la liste de `verifier-e2e.test.sh:13`. Geste : création 4 × 3 et trois cellules par Tab (S1), puis les 9 autres par Tab (passage de ligne compris), Échap, **capture `docs/essais/c10a-tableau-4x3.png`** (4 × 3 rempli, prise avant toute insertion, avec `--captures` seulement), puis « + Colonne » et « + Ligne », Ctrl+S, Ctrl+O, vérifications de S1 (`5x4`). Oracle : nouvel attribut `#stage[data-table]` = `"<colonnes>x<lignes>@<r>,<c>"` de la cellule active (vide sinon), et valeur de `#texte-edition` en rouvrant une cellule. Scène ≥ 640 px de haut avec l'outil Tableau actif (`stageBox`). | brief OD71 (reste 2) ; `verifier.sh:95-104` ; `verifier-e2e.test.sh:13-16` ; `scripts/essais/commun.mjs` ; `stage-tags.ts:12-19` | oui |

## 3. Carte d'impact

Rubriques déduites (le profil n'a pas de ligne « Surfaces d'impact ») : cœur, liaison Wasm, contrat de la page, moteur et
rendu, application et barre, plateforme (reste OD56), essais et scripts, tests, autres dépôts. Chemins de `main`
(`8247215`), lus sauf mention S.

### Cœur Rust (`crates/roomboard-core`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/table.rs` (nouveau), `src/lib.rs:2-13` (`pub mod`) | oui | `TableView`, lecture tolérante (T2), écriture des six opérations (DAC1) | S |
| `src/element.rs:27` (`KNOWN_KINDS`), `:72-104` (`ElementView`, `bare`) | oui | `"table"` ; champ `table: Option<TableView>` ; constat ouvert `architecture-constats.md:10` (I3) | V |
| `src/element.rs:242-255` (`read_unknown`) | oui | coupée : contrôle de `KNOWN_KINDS`, puis `unknown_view` réutilisée par le repli d'un tableau mal formé (T2) | V |
| `src/document.rs:247-304` (`element`) | oui | bras `Some("table")`, repli sur `unknown_view` | V |
| `src/commands.rs:30-104` (`Command`), `:125-139` (`CommandError`), `:141-` (`Display`), `:416-485` (`apply`) | oui | six commandes, `BadTable` et son message, bras courts vers `table.rs` | V |
| `src/commands.rs:580-634` (`cmd_set_text`), `:778-790` (`done`, `unchanged`), `:410` (`page_elements_or_err`) | non | modèles et aides réutilisés | V |
| `src/query.rs:112-150` (`element_geom`, dont `:123`), `:233-252` (`snap_box`) | oui | boîte `(0, 0)-(Σ largeurs, Σ hauteurs)` du tableau, boîte inconnue pour un tableau mal formé ; `snap_box` passe par `element_geom` (rien d'autre) | V |
| `src/query.rs:176`, `:202`, `:211` (`hit_test`, `ids_in_rect`, `bounds`) | non | suivent `element_geom` | V |
| `src/rich_text.rs:254` (`apply_text_diff`), `:54` (`valid_color`) | non | réutilisés | V |
| `src/history.rs:27-30` | non | `pages` déjà dans la portée : le tableau s'annule sans rien ajouter | V |
| `src/document.rs:179`, `:537` (`cited_assets`, `collect_out`) | non | balaie le tableau, n'y trouve aucun asset | V |
| `src/format/mod.rs` | non | le tableau voyage dans `document.ybin` | V |
| `src/grid.rs`, `src/shape.rs`, `src/ink/`, `src/asset.rs`, `src/capabilities.rs` | non | sans rapport | V |

### Liaison Wasm (`crates/roomboard-wasm/src/lib.rs`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `:391-410` (`set_grid`, `clear_grid`, patron) ; `:705` (`set_grid_inner`) | oui | six fonctions et leurs `*_inner` (T13) | V |
| `:571` (`element`) | non | sérialise `ElementView`, le champ `table` suit | V |
| `crates/roomboard-formats*`, `crates/roomboard-shell` | non | le conteneur ne lit pas les éléments | V |

### Contrat de la page (`apps/web/src/core`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `api.ts:16` (`ElementKind`), `:31-76` (`Command`), `:91-102` (`ElementView`), en-tête `:1-10` | oui | `TableElement`, `TableData`, six commandes, ligne « C10a » | V |
| `wasm-core.ts:110-165` (`toElementView`), `:277-310` (`apply`) | oui | cas `table` ; six appels | V |
| `fake-core.ts:1-17` (en-tête), `:78` (`MESSAGES`), `:91` (`KNOWN_KINDS`), `:92` (`finitePositive`), `:305-510` (`apply`), `:515` (vue), `:702-742` (sauvegarde, lecture) | oui | parité complète (T13) ; `finitePositive` local réutilisé, pas de troisième copie | V |
| `core/shapes.ts:81-90` (`applyMatrix`, `composeMatrix`) | oui | `invertMatrix` ajouté à côté (aucune inversion côté page aujourd'hui) | V |
| `core/rich-text.ts:55` (`validColor`) | non | réutilisé | V |
| `asset-store.ts` | non | sans rapport | V |

### Moteur et rendu (`apps/web/src/engine`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `input/gesture.ts:6` (`DrawTool`) | oui | `"table"` | V |
| `engine.ts:18-34` (`EngineState`), `:45-58` (`ToolFactories`), `:268-280` (table des outils) | oui | `tableCell` publié ; fabrique `table` ; méthodes `tableAction`, `tableFill` | V |
| `engine.ts:244` (`run`), `:258` (`history`) | oui | `tableTool.prune()` à côté de `selectTool.prune()` (I1) | V |
| `engine.ts:376-388` (Suppr, Échap) | oui | Suppr avec l'outil Tableau et une cellule active, saisie fermée : vide la cellule (T7) ; sinon inchangé | V |
| `tools/table.ts` (nouveau), `table-geom.ts` (nouveau) | oui | outil Tableau (T6-T9) ; géométrie des cellules et tableau le plus haut sous un point (DAC6, I2) | S |
| `tools/commit-gate.ts` (nouveau) ; `tools/text.ts:51-55`, `:91-98`, `:154-160` | oui | porte IME extraite de l'outil Texte, appelée par les deux outils (T8) ; comportement de l'outil Texte inchangé | V |
| `tools/text.ts:20-39` (`TextEditSession`, `TextEditorHost`) | oui | session gagne `background?` (fond opaque de la cellule) | V |
| `tools/text.ts:100-147` (`open`, `begin`, comportement) | non | l'outil Texte ne change pas | V |
| `text-layout.ts:206` (`layoutRich`), `:228` (`richBoxHeight`), `:23`, `:30` ; `core/rich-text.ts:9` (`plainSpans`) | non | réutilisés (mesure et dessin, B1) ; `layoutText`, `textBoxHeight` ne servent pas | V |
| `render/canvas2d.ts:215-237` (`paintElement`), `:122` (`paintText`), `:312-328` (`invalidate`, `linesOf`, `textLines`) | oui | bras `table` : fonds et traits par `table-paint.ts`, texte par `paintText` ; cache étendu aux cellules (B1) | V |
| `render/table-paint.ts` (nouveau) | oui | `paintTableGrid`, `cellTextBoxes`, sans texte (T13) | S |
| `render/overlay.ts:21-31` (`EditOverlay.frame`) | non | cadre de la cellule active réutilisé | V |
| `render/webgl2.ts` | non | canvas d'interaction seulement, la scène reste Canvas 2D | V |
| `input/keys.ts`, `input/router.ts:44` | non | la zone de saisie garde ses touches ; le routeur suit `DrawTool` | V |
| `tools/select.ts`, `tools/handles.ts` | non | le tableau se déplace et se met à l'échelle comme tout élément | V |

### Application, barre, interface (`apps/web/src/app`, `src/ui`, `src/toolbar*.ts`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `app/text-editor.ts:14-18` (`TextEditorEvents`), `:62-67` (`keydown`), `:76-90` (`open`) | oui | `navigate?(move)` pour Tab, Maj+Tab, flèches au bord (T8) ; fond opaque | V |
| `app/table-picker.ts` (nouveau) | oui | grille de choix et boîte (T6) | S |
| `app/board-session.ts:136-157` (zone de saisie, outils), `:196-202` (`mousedown`), `:250-259` (`mark`) | oui | fabrique `table`, événements de la zone vers l'outil actif, `preventDefault` aussi pour l'outil Tableau, `data-table` | V |
| `app/stage-tags.ts:12-19` | oui | `table` (T15) | V |
| `app/toolbar-host.ts:7-12` (`ToolbarHost`), `:13-18` (`HostTargets`), `:22-38` (`ACTIONS`), `:45` (préréglages) | oui | cinq actions, `tableFill` ; `:45` passe par `presetsOf`, mais le constat reste ouvert : `toolbar.ts:634` lit encore `from.presets[tool]` à la main (modifié à la clôture, 2026-11-20) | V |
| `toolbar.ts:84-94` (`TOOL_TABLE`), `:97-113` (`ACTION_TABLE`) | oui | `table`, cinq actions | V |
| `toolbar-profiles.ts:57` (`defaultToolbars`, groupe `edition`) | oui | `tool("table", "Tableau")` après Texte | V |
| `toolbar-profiles.ts:80-97` (`simple`) | non | profil à grands boutons, gardé court | V |
| `ui/item-state.ts:3-10` (`ToolbarView`), `:14-24` (`ACTION_STATE`) | oui | `tableCell` ; état grisé des cinq actions | V |
| `ui/Toolbar.tsx:78-102` (`PresetRow`), `:119-121` | oui | `TableRow` à côté, même place (T10) | V |
| `ui/App.tsx:137` | non | passe déjà l'état du moteur comme `ToolbarView` | V |
| `ui/ProfileEditor.tsx` | non | catalogue lu dans les tables (P15) : l'outil et les actions y apparaissent sans code | V |
| `ui/PagesBar.tsx:22` (`NEUTRAL`) | oui | champ `tableCell` du neutre (le compilateur le signale) | V |
| `ui/rb.css:50-51` (`.rb-preset`, `.rb-swatch`) | oui | `.rb-table-picker`, pastilles carrées réutilisant `.rb-swatch` | V |
| `profile-store.ts`, `profile-edit.ts`, `profile-file.ts` | non | rien de propre au tableau | V |

### Plateforme (reste OD56, `apps/web/src/platform`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `files.ts:48-55` (`DroppedFile`) | oui | `head(n)` (T14) | V |
| `import.ts:107-127` (`importFiles`) | oui | en-tête, détection, puis `blob()` seulement si reconnu | V |
| `host-tauri.ts:70-88` (`grantedFile`), `:146-150` (`pick`) | oui | `head` d'un seul appel ; `head` sur les octets déjà lus | V |
| `drop-web.ts:22-24` (`droppedFromFile`) | oui | `head` par `slice` | V |
| `paste.ts:20-24`, `host-fsa.ts:98`, `host-repli.ts:51` | non | passent par `droppedFromFile` | V |
| `image-import.ts:28` (`HEAD_BYTES`), `:245` (`sniffImage`) | non | réutilisés | V |
| `apps/desktop/src-tauri/src/main.rs:40-49` (`read_granted_file`) | non | lit déjà `offset`, `len` | V |

### Essais et scripts

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/essais/c10a-tableau-navigateur.mjs` (nouveau) | oui | S1, remplissage, capture (T15) | S |
| `scripts/essais/commun.mjs` | non | `serve`, `loadPlaywright`, `stageMouse`, `item`, `frames`, `TAB`, `VIEWPORT` réutilisés | V |
| `scripts/verifier.sh:95-104` (bloc `--e2e`) | oui | une ligne | V |
| `scripts/tests/verifier-e2e.test.sh:13` | oui | `c10a-tableau-navigateur` dans la liste | V |
| `docs/essais/c10a-tableau-4x3.png` (nouveau) | oui | capture | S |
| `scripts/essais/c1-profils-navigateur.mjs`, `s34-navigateur.mjs`, `c2-image-navigateur.mjs`, `s2`, `s5b`, `fichiers` | non | à garder verts (la barre gagne un bouton) | V |
| `scripts/controle-licences.mjs`, `THIRD_PARTY_NOTICES.md` | non | aucune dépendance ajoutée | V |

### Tests

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core/src/table.rs` (tests), `commands.rs` (tests, modèle `:2899` `grid_reload_keeps_bytes`) | oui | six commandes, une étape, D38, refus, « recharger garde les octets » (U3) | V |
| `crates/roomboard-core/tests/element_inconnu.rs` | oui | test neuf : forme exacte d'un tableau sous un `kind` inconnu, gardée octet pour octet (S4) ; tests existants gardés verts | V |
| test neuf du cœur `every_known_kind_has_view_and_geom` (`document.rs`, tests) et son pendant `fake-core.test.ts` | oui | pour chaque entrée de `KNOWN_KINDS`, un élément bien formé (fabriqué par une table `kind → commande` qui panique sur un `kind` sans fabrique) rend une vue de ce `kind` (jamais `unknown`) et une boîte (`bounds`) ; tableau mal formé → vue `unknown` (I3, T2) | S |
| `crates/roomboard-core/tests/fixtures/tableau-4x3.roomboard` (nouveau) | oui | fixture pour C10b et les versions suivantes, régénérée par `ROOMBOARD_REGENERER_FIXTURES=1` | S |
| `crates/roomboard-core/tests/compat_socle.rs`, `scenarios.rs` | non | à garder verts | V |
| `apps/web/src/core/wasm-core.contract.test.ts`, `fake-core.test.ts` | oui | contrat commun des six commandes, vue | V |
| `apps/web/src/toolbar.test.ts:167` | oui | liste exacte de `TOOL_TABLE` : `table` ajouté (attendu changé, rien de sauté) | V |
| `apps/web/src/app/toolbar-host.test.ts:41-42` | non | exige chaque action dans `ACTIONS` : garde verte par T10 | V |
| `apps/web/src/toolbar-profiles.test.ts:36-40`, `ui/Toolbar.test.tsx:41`, `:180`, `:201` | non | à garder verts | V |
| `apps/web/src/app/text-editor.test.ts`, `engine/tools/text.test.ts` | oui / non | `navigate` et fond (neufs) ; outil Texte inchangé, à garder vert | V |
| `apps/web/src/platform/import.test.ts:23-33`, `host-tauri.test.ts` | oui | T14 ; les `DroppedFile` littéraux des tests gagnent `head` | V |
| tests neufs : `tools/table.test.ts`, `table-geom.test.ts`, `tools/commit-gate.test.ts`, `render/table-paint.test.ts` (sur `fake-ctx.ts`), `app/table-picker.test.ts` | oui | T6-T12 ; clic sur une cellule recouverte d'encre (I2) ; plafond 64 | S |
| `apps/web/src/engine/engine.test.ts` | oui | tests neufs : cellule active retirée après Ctrl+Z qui retire sa ligne, déplacée après « − Ligne » sur sa ligne (I1) ; Suppr vide la cellule active (T7) ; tests existants à garder verts | V |
| `render/canvas2d.test.ts` | oui | test neuf : le texte d'une cellule passe par `paintText` (mêmes `fillText` qu'un texte d'un segment), cache invalidé par `Change` (B1) ; tests existants à garder verts | V |
| `board-session.test.ts`, `workspace.test.ts`, `engine/tools/text.test.ts` | non | à garder verts (la porte IME extraite ne change rien à l'outil Texte) | V |

### Autres dépôts

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| ActCraft, roomflow2, `claude-config` | non | aucune reprise de code, aucun outillage changé | V |

**Effets de bord sur l'existant**
- La barre d'outils du profil par défaut gagne « Tableau » ; à 1 280 px elle peut passer sur une ligne de plus quand la
  rangée du tableau est montrée : couvert par `stageBox` (≥ 640 px) dans `c10a-tableau-navigateur.mjs` et par
  `c1-profils-navigateur.mjs` resté vert.
- `toolbar.test.ts:167` change d'attendu (`table` en plus) : couvert par lui-même.
- Le catalogue de l'éditeur de profil propose l'outil (les cinq actions n'y entrent pas : modifié à la clôture,
  2026-11-20, voir T10) : `toolbar-host.test.ts:41-42` (chaque action a son exécutant) et un test neuf de `item-state.test.ts` (actions grisées sans cellule active).
- `DroppedFile` gagne `head` : tous les hôtes et les fabriques de test ; couvert par `import.test.ts`,
  `host-tauri.test.ts`, `drop-web.test.ts`, et `c2-image-navigateur.mjs` (dépôt, collage, Importer, TIFF refusé) resté vert.
- Le `mousedown` de la scène est empêché aussi avec l'outil Tableau (sinon la zone ouverte perdrait le focus) : test neuf
  de `board-session.test.ts` sur le modèle de celui de l'outil Texte, `s34-navigateur.mjs` resté vert.
- Un fichier avec tableau ouvert par `main` `8247215` (sans C10a) montre un cadre gris de 100 × 100 « objet non pris en
  charge » au coin du tableau (aucun `w`, `h` écrits), sans le perdre : test neuf de `element_inconnu.rs` (S4).
- `read_unknown` est coupée en deux (T2) : les tests du `kind` inconnu existants (`element_inconnu.rs`, `fake-core.test.ts`)
  restent verts ; le test neuf `every_known_kind_has_view_and_geom` couvre le repli.
- La porte IME de l'outil Texte est extraite (`commit-gate.ts`) : `engine/tools/text.test.ts` (composition, validation
  différée) resté vert, plus `commit-gate.test.ts`.
- `toolbar-host.ts:45` passe par `presetsOf` : `toolbar-host.test.ts` (préréglages) resté vert. Le constat reste ouvert :
  `toolbar.ts:634` lit encore `from.presets[tool]` à la main (modifié à la clôture, 2026-11-20).

**Chantiers en cours** : aucun. `git worktree list` : `~/projets/roomboard` (`main` `8247215`) et ce worktree seuls ;
`gh pr list --state open` : vide.

**Termes cherchés** (aucun graphe pour ce dépôt, recherche texte seule) : coffre `chercher.js` « RoomBoard tableau
cellules », « roomboard élément table yrs », « roomboard playwright e2e capture », « actcraft tableau cellule Tab » ;
`grep -n "KNOWN_KINDS\|read_image\|read_unknown"` sur `document.rs`, `query.rs`, `element.rs` ; `grep -n "pub enum
Command\|fn cmd_\|fn apply"` sur `commands.rs` ; `grep -n "pub fn \|pub(crate) fn"` sur `rich_text.rs`, `grid.rs`,
`query.rs`, `history.rs` ; `grep -n "pub fn \|#\[wasm_bindgen"` sur `roomboard-wasm/src/lib.rs` ; `grep -n "case \"\|KNOWN\|finitePositive"`
sur `fake-core.ts`, `wasm-core.ts` ; `grep -rn "createTextTool\|createTextEditor"` ; `grep -n "^export"` sur
`text-layout.ts`, `rich-text.ts`, `tool.ts` ; `grep -rn "function invert\|invertMatrix"` (aucun résultat côté page) ;
`grep -n "export function\|export const"` sur `core/shapes.ts`, `handles.ts`, `overlay.ts`, `grid-paint.ts` ;
`grep -n "\"text\"\|TOOL_TABLE\|ACTION_TABLE"` sur `toolbar.ts`, `toolbar-profiles.ts`, tests de barre et essais ;
`grep -rn "FormatText\|contextu"` dans `apps/web/src` hors `core/` (seule la rangée des préréglages existe) ;
`grep -n "picker\|popover\|rb-swatch"` dans `rb.css` ; `grep -rn "blob()\|blob:\|droppedFromFile\|read_granted_file"`
dans `apps/web/src` et `main.rs` ; `grep -n "Tab\|flèche\|8 × 8\|Uniform\|SMART"` dans l'étude ;
`grep -n "U32\|DAU10\|S11\|C10"` dans `usage-cadrage.md` ; `git worktree list`, `gh pr list --state open`.
Ajoutés au tour 1 : `grep -n "function paintText\|linesOf\|textLines\|invalidate"` sur `canvas2d.ts` ;
`grep -n "prune"` sur `engine.ts`, `tool.ts` ; `grep -n "editAction\|\"delete\""` sur `engine.ts` ;
`grep -n "PAGE_WIDTH"` sur `api.ts`, `engine/page.ts` ; `grep -n "read_unknown\|UNKNOWN_BOX"` sur `query.rs`,
`document.rs` ; `sed -n 88,100p`, `150,161p` de `tools/text.ts` (porte IME) ; `architecture-constats.md` lignes 8 et 10.

**Modules à réutiliser ou à étendre**

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| Écrire le texte d'une cellule sans tout remplacer | `crates/roomboard-core/src/rich_text.rs:254` | `apply_text_diff(txn, &TextRef, &str)` | réutiliser |
| Valider une couleur | `rich_text.rs:54` ; `apps/web/src/core/rich-text.ts:55` | `valid_color(&str)` ; `validColor(c)` | réutiliser |
| Nombre fini > 0 | `element.rs:220` ; `fake-core.ts:92` | `finite_positive(v)` ; `finitePositive(v)` (constat ouvert : pas de troisième copie) | réutiliser |
| Une commande = une étape, aucune étape vide | `commands.rs:778-790` ; `document.rs:369` | `done(Change)`, `unchanged()`, `transact_local()` | réutiliser |
| Retrouver un élément, une page | `document.rs:463` ; `commands.rs:410` | `find_element(txn, id)`, `page_elements_or_err(page)` | réutiliser |
| Lire, écrire la matrice et les scalaires | `element.rs:154-200` | `transform_to_any`, `out_transform`, `out_f64`, `out_string` | réutiliser |
| Lire un élément par `kind` | `element.rs:27` ; `document.rs:247` ; `query.rs:112` ; `fake-core.ts:91` ; constat ouvert `architecture-constats.md:10` (« un kind ajouté d'un seul côté devient une boîte inconnue ») | `KNOWN_KINDS`, `Document::element`, `element_geom` : un bras `table` chacun, appelant `table::read` ; garde : test `every_known_kind_has_view_and_geom` (I3). La duplication reste (constat laissé ouvert, non aggravé au-delà d'un bras par endroit) | étendre |
| Vue d'un élément mal formé | `element.rs:242-255` (`read_unknown`) | coupée en `KNOWN_KINDS` + `unknown_view(txn, &MapRef) -> Option<(Transform, UnknownView)>`, appelée par le repli du tableau | étendre |
| Boîte de collision | `crates/roomboard-core/src/shape.rs` (`box_polygon`, appelé `query.rs:126`) | `box_polygon(w, h)` | réutiliser |
| Lecture et écriture du tableau dans le cœur | aucun (termes : `table`, `cells`, `Y.Array` de `Y.Map` dans `crates/`) | `table.rs` : `read<T: ReadTxn>(txn, &MapRef) -> Option<(Transform, TableView)>`, `create(txn, &ArrayRef, TableInput) -> String`, `set_cell`, `insert_line`, `remove_line`, `set_sizes`, `set_fill` (une fonction par commande, appelée par un bras court de `apply`) | nouveau module (DAC1) |
| Exposer les commandes à la page | `crates/roomboard-wasm/src/lib.rs:391-410`, `:705` | patron `set_grid` / `set_grid_inner`, `toChange` (`wasm-core.ts`) | étendre |
| Vue TS d'un élément | `apps/web/src/core/wasm-core.ts:110` ; `api.ts:91-102` | `toElementView` (cas `table`) ; union `ElementView` | étendre |
| Fausse liaison | `apps/web/src/core/fake-core.ts:305-742` | `apply`, vue, `savedElement`, lecture : cas `table` | étendre |
| Mettre en lignes et mesurer une cellule | `apps/web/src/engine/text-layout.ts:206`, `:228`, `:30` ; `core/rich-text.ts:9` | `layoutRich(plainSpans(texte), { size }, largeur, measure)`, `richBoxHeight(lines)`, `measureWith(ctx)`, `plainSpans` | réutiliser |
| Dessiner le texte d'une cellule | `apps/web/src/engine/render/canvas2d.ts:122`, `:312-328` | `paintText(ctx, RichLine[], color)` ; cache `textLines` / `linesOf` et `invalidate`, étendus aux cellules (B1) | réutiliser, étendre |
| Porte de validation IME | `engine/tools/text.ts:91-98`, `:154-160` | extraite : `engine/tools/commit-gate.ts`, `createCommitGate(commit: () => void, open: () => boolean): { request(): void; compositionStart(): void; compositionEnd(): void; composing(): boolean; reset(): void }`, appelée par l'outil Texte et l'outil Tableau | étendre (extraction) |
| Zone de saisie posée sur la cellule | `apps/web/src/app/text-editor.ts:33` ; `engine/tools/text.ts:20-39` | `createTextEditor` (événement `navigate?(move): boolean`, fond `background?`) ; `TextEditSession`, `TextEditorHost` | étendre (DAC3) |
| Matrices de la page | `apps/web/src/core/shapes.ts:8`, `:81`, `:86` ; `app/text-editor.ts:27` ; `engine/camera.ts:16` | `translateMatrix`, `applyMatrix`, `composeMatrix`, `cssMatrix`, `screenToWorld` ; `invertMatrix(m): Matrix \| null` ajouté à `shapes.ts` | réutiliser, étendre |
| Contrat d'un outil, aperçu, cadre de cellule | `engine/tools/tool.ts:10`, `:32`, `:52` ; `render/overlay.ts:21-32` | `ToolContext`, `GestureTool`, `NO_LIVE`, `EditOverlay.frame` | réutiliser |
| Retirer un état d'outil devenu périmé | `engine/tools/tool.ts:49` (`SelectionTool.prune`) ; `engine.ts:244`, `:258` | même forme : `TableTool.prune()`, appelé aux deux mêmes endroits (I1) | réutiliser (patron) |
| Trouver le tableau sous un point (sous l'encre) | `CoreDocument.elementIds`, `element` (`api.ts:131`, `:135`) ; `core/shapes.ts` (`invertMatrix`, ajoutée) | parcours du dessus vers le dessous, sans `hitTest` ni liaison neuve (I2) | réutiliser |
| Largeur de page | `api.ts:113-120` (`PageView.width`) par `CoreDocument.page` | `ctx.doc.page(page).width` (pas `PAGE_WIDTH`, constat `architecture-constats.md:8`) | réutiliser |
| Géométrie des cellules (page) | aucun (termes : `cellAt`, `cell`, `table` dans `apps/web/src`) | `engine/table-geom.ts` : `tableAt(doc: CoreDocument, page, x, y): { id, table: TableData, cell: Cell } \| null`, `cellAt(t: TableData, lx, ly): Cell \| null`, `cellRect(t, c: Cell): Bounds`, `step(t, c, move): Cell \| "add-row" \| null`, `rowHeightsFor(t, colWidths, measure): number[]` | nouveau module (DAC6) |
| Outil Tableau | `engine/tools/text.ts:50` (patron) ; `commit-gate.ts` (porte IME) | `engine/tools/table.ts` : `createTableTool(ctx, editor, picker, style, measure): TableTool`, `TableTool extends GestureTool { cell(): CellRef \| null; act(a: TableAction): void; fill(c: string \| null): void; clearCell(): boolean; prune(): void; navigate(m): boolean; compositionStart(); compositionEnd(); requestCommit() }` | nouveau module (dans le patron de l'outil Texte) |
| Grille de choix et boîte | aucun (termes : `picker`, `chooser`, `popover`, « grille de choix » ; `.rb-popover` de `rb.css:28` est un panneau de grille, pas un menu au point) | `app/table-picker.ts` : `createTablePicker(parent): TablePickerHost`, `TablePickerHost { open(at: Point, pick: (cols, rows) => void): void; close(): void }` | nouveau module |
| Rendu du tableau | `engine/render/canvas2d.ts:215` ; patron `render/grid-paint.ts:99` | `paintElement` appelle `paintTableGrid(ctx, t: TableData)` et `cellTextBoxes(t): { cell, x, y, w, h }[]` de `render/table-paint.ts` (fonds et traits seulement), puis `paintText` par cellule | étendre, nouveau module |
| Outil et actions de barre | `apps/web/src/toolbar.ts:84`, `:97` ; `toolbar-profiles.ts:57` | `TOOL_TABLE`, `ACTION_TABLE`, `defaultToolbars()` | étendre |
| État des boutons | `apps/web/src/ui/item-state.ts:14`, `:41` | `ACTION_STATE`, `itemState` | étendre |
| Rangée contextuelle | `apps/web/src/ui/Toolbar.tsx:79` | `PresetRow` (patron, même place) → `TableRow` | étendre |
| Exécuter une action, une couleur | `apps/web/src/app/toolbar-host.ts:7`, `:22` ; `toolbar.ts:132` | `ACTIONS`, `ToolbarHost.tableFill` ; `presetsOf` à `:45` | étendre, réutiliser |
| Attribut de scène pour l'essai | `apps/web/src/app/stage-tags.ts:12` | `stageTags(s)` : clé `table` | étendre |
| Lire l'en-tête d'un fichier entrant | `apps/web/src/platform/files.ts:49` ; `host-tauri.ts:70` ; `drop-web.ts:22` ; `image-import.ts:28` | `DroppedFile.head(n)` ; `grantedFile`, `droppedFromFile` ; `HEAD_BYTES` | étendre (DAC5) |
| Essai navigateur | `scripts/essais/commun.mjs` ; `c2-image-navigateur.mjs` (`saveTo`, `scenario`, `main`) | `serve`, `loadPlaywright`, `stageMouse`, `item`, `frames`, `TAB`, `VIEWPORT`, `Echec` | réutiliser |
| Test « recharger garde les octets », `kind` inconnu | `commands.rs:2899` ; `tests/element_inconnu.rs` (`hologram_ybin`, `regenerate`) | mêmes patrons | réutiliser |

## 4. Hypothèses à revoir

Difficiles à défaire ou visibles des utilisateurs :
- **HC10-1** « 4 × 3 » se lit 4 colonnes × 3 lignes (défaut pris sur Word, aucune source du dépôt) ; libellé et
  `aria-label` explicites (T6).
- **HC10-2** Tab dans la dernière cellule ajoute une ligne (défaut pris sur Word, aucune source du dépôt) ; sinon il ne
  ferait rien (T8).
- **HC10-3** Boutons dans la rangée contextuelle de la barre, insertion au-dessous et à droite seulement (SMART) ; pas
  de menu contextuel ni de barre flottante sur le tableau (T10).
- **HC10-4** Tailles par défaut 240 × 64, texte 36, couleur du stylo, trait 2, marge 8 (T4). **Choix visuel, à l'essai.**
- **HC10-5** Palette de remplissage : aucune + cinq teintes claires (T12). **Choix visuel, à l'essai.**
- **HC10-6** Uniformiser = un seul bouton (colonnes à la moyenne, lignes à la moyenne ou plus) (T11).
- **HC10-7** Noms des clés du fichier (`cols`, `rows`, `cells`, `text`, `fill`, `color`, `size`, `width`, `height`) :
  réversibles jusqu'à la première release seulement (D24, U3) (T1).

Les autres :
- **HC10-8** Flèches au bord du texte par lignes logiques (sauts de ligne), pas par lignes affichées (T8).
- **HC10-9** Plafond 64 lignes et 64 colonnes (T4).
- **HC10-10** Zone de saisie à fond opaque (remplissage de la cellule, sinon blanc) au lieu de masquer le texte de la
  seule cellule dans le rendu (T13, DAC3).
- **HC10-11** L'outil Texte sur un tableau pose une boîte de texte, il n'édite pas la cellule (T7).
- **HC10-12** Un fichier C10b (fusions) ouvert par C10a : cellules dessinées séparées, contenu et clés gardés (T2).
- **HC10-13** Les cinq actions du tableau entrent au catalogue de l'éditeur de profil (T10). *Modifié à la clôture,
  2026-11-20* : écartée, elles restent hors du catalogue (actions contextuelles de la rangée du tableau, pas boutons de
  barre ; un profil enregistré qui les contient reste valide).
- **HC10-14** La compatibilité avec une version sans C10a (référence : `main` `8247215`, qui contient C2 et son chemin du
  `kind` inconnu) est prouvée par simulation (forme du tableau sous un `kind` inconnu, chemin inchangé depuis C2), pas
  par l'ancien binaire : un essai manuel avec `8247215` reste possible (T2, S4).
- **HC10-15** À 1 280 px, la barre peut prendre une ligne de plus avec la rangée du tableau ; la scène garde au moins
  640 px (vérifié par l'essai) (T15).
- **HC10-16** Une copie utilisateur du profil `defaut` n'a pas l'outil Tableau ; il s'ajoute par le catalogue (P15).
- **HC10-17** Avec l'outil Tableau, Suppr sur une cellule active (saisie fermée) vide son texte ; après « − Ligne » ou
  « − Colonne » sur sa propre ligne, la cellule active glisse à la voisine (T7).

## 5. Décisions d'architecture

**DAC1 — Le tableau dans un module `table.rs` du cœur.**
Contexte : `commands.rs` compte 3 110 lignes ; C9 a mis la grille dans `grid.rs` et gardé dans `commands.rs` des bras courts.
Décision : `table.rs` porte `TableView`, `read` (tolérante, T2) et une fonction d'écriture par commande ; `apply` appelle.
Conséquences : `element()`, `element_geom`, la vue Wasm lisent par `table::read` ; C10b (fusion, ombrage) s'ajoute là.
Réversible : déplacer des fonctions entre modules d'un même crate.

**DAC2 — Hauteur de ligne mesurée par la page, écrite par la commande.**
Contexte : la police n'existe que dans la page ; le cœur calcule collision et bornes sur des tailles stockées.
Décision : `SetTableCell.row_height` porte la mesure, le cœur n'agrandit qu'au besoin ; `SetTableSizes.row_height`
(Uniformiser) est écrit tel quel et peut réduire, la page l'ayant borné par la hauteur exigée (T11).
Conséquences : même patron que `boxHeight` du texte ; une police différente sur une autre machine n'écrit rien seule.
Réversible : une mesure au rendu pourrait remplacer le champ sans changer le fichier.

**DAC3 — Une seule zone de saisie, navigation par événement.**
Contexte : la zone de saisie du lot 4 est unique (`#texte-edition`, CL5b-2) et ne relaie qu'Échap, IME et perte du focus.
Décision : `TextEditorEvents` gagne `navigate?(move): boolean` (Tab, Maj+Tab, flèches au bord) ; les événements vont à
l'outil actif (Texte ou Tableau) ; l'outil Texte ne l'implémente pas, son comportement ne change pas.
Conséquences : C7b remplacera la zone pour les deux outils d'un coup. Réversible.

**DAC4 — Actions de structure = actions de barre.**
Contexte : C1 décrit les boutons par `ACTION_TABLE`, `ACTIONS` et `ACTION_STATE`, et la rangée contextuelle par outil.
Décision : cinq actions de tableau dans ces tables, montrées par `TableRow` quand l'outil Tableau est actif ; couleur par
`ToolbarHost.tableFill`. Conséquences : grisé, libellés et exécution sans code neuf ; elles entrent au catalogue des
profils (HC10-13). Réversible : retirer les entrées.
*Modifié à la clôture, 2026-11-20* : elles restent hors du catalogue de l'éditeur de profils (`profile-edit.ts`, filtre
`TABLE_ACTIONS`). Raison : actions contextuelles, montrées par la rangée du tableau, pas boutons de barre ; un profil
enregistré qui les contient reste valide.

**DAC5 — `DroppedFile.head(n)`.**
Contexte : `importFiles` obtient l'en-tête en lisant tout le fichier par `blob()` (coque : morceaux de 8 Mo).
Décision : `head(n)` obligatoire sur `DroppedFile`, lu avant la détection ; `blob()` seulement pour un fichier reconnu.
Conséquences : un fichier non reconnu coûte un seul appel de 4 096 octets ; ferme le constat `files.ts:49`.
Réversible : interface interne à la page.

**DAC6 — Géométrie des cellules côté page.**
Contexte : la vue du tableau (tailles, ordre) suffit à trouver une cellule ; chaque fonction Wasm pèse dans H2-13.
Décision : `engine/table-geom.ts` (pures, testées) : tableau le plus haut sous un point (par `elementIds`, `element`,
`invertMatrix`, I2), cellule sous un point local, rectangle d'une cellule, cellule suivante, hauteurs exigées ; le cœur
ne fait que la boîte entière. Conséquences : aucune lecture neuve dans la liaison.
Réversible : passer la fonction au cœur si C10b (fusions) la complique.

## 6. Scénarios d'acceptation

- **S1** (S11, partie C10a ; Playwright, `verifier.sh --e2e`) Choisir l'outil Tableau, cliquer sur la page, choisir 4 × 3
  dans la grille : un tableau de 4 colonnes et 3 lignes, saisie ouverte sur la première cellule (`data-table` =
  `4x3@0,0`). Taper « Lundi », Tab, « Mardi », Tab, « Mercredi ». Cliquer « + Colonne » (S11, `usage-cadrage.md:448`) :
  `5x3` ; cliquer « + Ligne » (brief OD71) : `5x4`. Ctrl+S, puis Ctrl+O sur le fichier : nouvel onglet ; outil Tableau,
  clic dans la première cellule : la zone montre « Lundi », `data-table` = `5x4@0,0` ; deuxième et troisième cellules :
  « Mardi », « Mercredi ». Aucune erreur dans la page. (S11 se poursuit en C10b : fusion, ombrage, collage Excel.)
- **S2** (tests de l'outil et du moteur) Dans la dernière cellule d'un 2 × 2, taper « xy » puis Tab : une troisième
  ligne, saisie sur sa première cellule ; Maj+Tab revient à la cellule « xy », curseur à la fin ; ← (curseur entre « x » et
  « y ») reste dans la cellule, → puis → passe à la cellule suivante. Échap (saisie fermée, la cellule de la troisième
  ligne reste active), puis Ctrl+Z : la ligne ajoutée disparaît et la cellule active avec elle (`data-table` vide) ;
  Ctrl+Z encore : « xy » disparaît. Tracer un trait au stylo sur une cellule, reprendre l'outil Tableau, cliquer sur le
  trait : c'est la cellule dessous qui s'ouvre. « − Ligne » sur la ligne de la cellule active : la cellule active passe
  à la ligne suivante. Cellule active « xy », saisie fermée, Suppr : vide, une étape.
- **S3** (tests du cœur et de la page) Écrire un long texte dans une cellule : sa ligne grandit, les autres non.
  « Uniformiser » : colonnes égales, largeur totale gardée, lignes égales et le long texte tient ; une étape. Pastille
  jaune sur une cellule : remplie ; « − Colonne » sur la dernière colonne restante : bouton grisé ; à 64 lignes,
  « + Ligne » grisé et Tab en dernière cellule sans effet. Enregistrer,
  recharger, réenregistrer : mêmes octets, même vue.
- **S4** (`element_inconnu.rs`, tests du cœur) Un tableau écrit sous un `kind` que le cœur ne connaît pas (forme exacte :
  `cols`, `rows`, `cells` avec `Y.Text`) se lit comme cadre gris de 100 × 100, se déplace, et s'enregistre octet pour
  octet après rechargement ; un `kind: "table"` sans ligne lisible se lit lui aussi comme cadre gris (jamais invisible) ;
  chaque `kind` de `KNOWN_KINDS` a une vue et une boîte ; `socle-v1.roomboard` s'ouvre et se réenregistre à l'identique.
- **S5** (reste OD56, tests de la plateforme) Déposer dans la coque un fichier `notes.xyz` de 50 Mo : refusé avec le
  message « format pris en charge dans une prochaine version » après un seul `read_granted_file` de 4 096 octets ;
  `blob()` jamais appelé. Un PNG déposé s'insère toujours.

## 7. Hors périmètre

- C10b : fusion et division, ombrage révélable (`shade`), collage d'un `<table>` HTML, `.xlsx` en valeurs.
- C7b : texte riche des cellules (la vue ne lit que le texte brut ; `spans` non exposés).
- Redimensionner une ligne ou une colonne en tirant sa bordure ; insérer au-dessus ou à gauche par un bouton (le cœur
  l'accepte déjà par `at`) ; sélection d'une plage de cellules ; couleur d'une ligne, d'une colonne ou du tableau entier.
- Objets dans une cellule, tableau dessiné au stylet puis reconnu (étude § 5.2).
- Édition d'une cellule par l'outil Texte (HC10-11).
- La boîte « Importer » de la coque (`host-tauri.ts:146-150`) lit encore chaque fichier choisi en entier par `plugin-fs`
  au moment du choix (portée de la boîte, HR9) : son filtre limite les extensions ; à reprendre avec un lecteur par
  morceaux s'il le faut.
- Suppression des 12 branches `feat/usage-c2-depot--T<n>` (reste OD56 tenu par l'orchestrateur, hors code).
- Build Tauri, essais Windows, macOS, iPad (clavier virtuel), Android : fiches de plateforme, plus tard.

## 8. Portes immédiates

Aucune.
