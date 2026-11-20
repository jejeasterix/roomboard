# Cadrage — usage C6a : pot de peinture vectoriel et mot par mot

Cadrage autonome (étage 1, 2026-11-20), base `origin/main` @ 28ba886. Il applique **U28** de
`docs/plans/usage-cadrage.md:81` (paliers P1 vectoriel et P2) sans le refaire ; il ne tranche que ce que U28 laisse ouvert.

## 1. Demande et gabarit

Demande : l'outil Pot (couleur choisie, puis clic) colore la cible de U28 (forme : contour près du bord, sinon intérieur ;
trait ; mot sous le pointeur dans un texte ou une cellule ; fond de la page si rien n'est touché), une coloration
s'annule en une étape. Gabarit : **chantier** (40 questions au plus ; 31 consommées).

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| D1 | Périmètre | U28 P1 vectoriel + P2. P1 image (C6b) et P3 zones fermées (C8) hors chantier : un clic sur une image (ou un élément inconnu) passe à l'étape suivante de la cible, le **fond de la page** ; aucune zone fermée n'est cherchée. Un test le prouve (S4). | brief ; `usage-cadrage.md:549-553` | oui |
| D2 | Mode | Outil modal : choisir Pot et une couleur, puis cliquer. Un clic = une commande = une étape d'annulation. | U28 ; étude `docs/etudes/usage-pot-de-peinture.md:30`, cas 10 | oui |
| D3 | Cible | `hitTest` **tel quel** (`query.rs:192`) : l'élément le plus haut, tolérance **6 px écran** = `6 / zoom` en monde (même calcul que `TEXT_HIT_TOL_PX`, `engine/tools/text.ts:15`, `:96`). | U28 ; `usage-cadrage.md:258` ; brief | oui |
| D4 | Groupe | Le pot vise l'élément touché, jamais son groupe : `hit_test` rend l'id de l'élément, le pot ne remonte pas (la remontée de C3 vit dans `select.ts`). | état « Choix tranchés seul » ; brief | oui |
| D5 | Forme | Rectangle, ellipse : **bord** si la distance du clic au tracé est ≤ tolérance + demi-épaisseur du trait ; tracé = `shape_polygon(kind, w, h, 0.0)` (élargi d'une unité seulement, `shape.rs:66-71`), porté en monde par `world_outline` comme `hit_test`, demi-épaisseur multipliée par l'échelle de la matrice (`similarity_scale`, sinon racine du déterminant) → couleur du contour (`color`) ; sinon **intérieur** → `fill`. Ligne et flèche (sans intérieur) : toujours `color`. Trait d'encre : `color`. | U28 ; étude cas 1-3 (`:56-58`) ; `shape.rs:69` | oui |
| D6 | Mot d'un texte | Position du caractère sous le pointeur (mise en lignes de la page, `layoutRich`), limites de mot **UAX 29** par `Intl.Segmenter` (`granularity: "word"`, segment `isWordLike`), puis `FormatText { id, start, len, attrs: { color } }` (existant, une étape). | U28 P2 ; U27 ; DAU9 ; `commands.rs:93` | oui |
| D7 | Texte hors mot | Clic dans la boîte d'un texte mais pas sur un mot (espace, ponctuation, blanc de la boîte) ; un clic dans la bande de tolérance hors de la boîte d'un texte ou d'un tableau est d'abord ramené dans la boîte (coordonnées locales bornées), puis suit la règle ordinaire (mot, texte entier, cellule la plus proche) : **texte entier**, `FormatText { start: 0, len: longueur UTF-16 }`. Donne la « couleur d'un texte entier » de P1. | U28 P1 ; HC6-1 | oui |
| D8 | Mot d'une cellule | **Prémisse corrigée** : `FormatText` ne vise qu'un élément texte (`commands.rs:93`, pas de `row`/`col`). Le mot d'une cellule passe par `SetTableCell` (même contenu, `spans` = `formatSpans(spans, start, len, { color })`, `core/rich-text.ts:149`), une étape (C7b R7). Cellule couverte : son ancre (`anchorOf`, `table-geom.ts:85`). | `api.ts` (`SetTableCell.spans`) ; `commands.rs:119-128` | oui |
| D9 | Cellule hors mot | Clic dans une cellule hors d'un mot : remplissage de la cellule, `SetTableFill` (existant). Cellule ombrée : le remplissage se pose sous l'ombrage, aucun mot visé (texte masqué, F11). | HC6-2, HC6-8 ; `commands.rs:150` | oui |
| D10 | Fond | Rien sous le pointeur : `background` de la page (champ existant, `document.rs:81`, lu `:171`). | U28 ; étude cas 7 | oui |
| D11 | « Aucune » | Bouton fixe en fin de rangée du pot (`data-fill-none`), jamais un préréglage (l'éditeur refuse une couleur vide, `profile-edit.ts:137`) : intérieur d'une forme → `fill` retiré (U28 « effacer = `fill: none` ») ; mot ou texte → attribut `color` retiré (patch `null`) ; cellule → remplissage retiré ; fond → `#ffffff` (`DEFAULT_BACKGROUND`, `element.rs:15`) ; contour ou trait → rien, aucune étape (D38). | U28 (forme) ; étude cas 8 ; HC6-3 | oui |
| D12 | Commande du cœur | `Command::Fill { page, target: FillTarget, color: Option<String> }`, `FillTarget = Edge { id } \| Inside { id } \| Background` : une transaction, même valeur = aucune étape (D38), couleur validée par `valid_color` (`rich_text.rs:54`), erreur neuve `BadFill` pour une cible qui ne convient pas (Inside sur une ligne, Edge sur un texte). Mots et cellules : commandes existantes (D6, D8, D9). | étude `:70` (« commande grossière `Fill{target, color}` (D10) ») ; `usage-cadrage.md:107` (`Fill` — C6a) ; DA1 | oui |
| D13 | Bord dans le cœur | Requête `edge_hit(id, x, y, tol) -> bool` (géométrie dans le cœur, comme DAG1) ; la page ne recopie pas de distance aux arêtes. | DA2 | oui |
| D14 | Où se décide la cible | Module pur côté page `engine/fill-target.ts` (la mesure du texte est dans la page) ; l'outil `engine/tools/fill.ts` reste mince. | DA3 | oui |
| D15 | Geste | Appliqué au **relâché** (`close("end")`) au point d'appui ; `cancel` et `abort` (paume, second doigt) : rien. | HC6-5 ; D39 (gomme) | oui |
| D16 | Couleur du pot | Couleur propre au pot (`Engine.setFillColor(color \| null)`), qui ne change ni le stylo ni les formes ; choisie dans la rangée existante `PresetRow` : préréglages `presets.fill` du profil s'il en a, sinon la liste figée `FILL_COLORS` de `toolbar.ts` (comme `TABLE_FILLS`, `toolbar.ts:142`) ; dès que le profil a `presets.fill`, il fait foi. Défaut : `#dc2626`. | C1 P18 (`Toolbar.tsx:83`) ; U12 ; HC6-4 | oui |
| D17 | Couleurs livrées | `FILL_COLORS` : Rouge `#dc2626`, Jaune `#facc15`, Vert `#16a34a`, Bleu `#1d4ed8`, Noir `#000000` ; les profils livrés n'ont **pas** de `presets.fill` (rien ne change dans leurs préréglages). Éditeur : `PRESET_FIELDS.fill = [color]` (`profile-edit.ts:32`), préréglage ajouté `{ color: "#000000" }` sans épaisseur (`NEW_PRESET` par outil, `:45`). | HC6-4 ; `toolbar-profiles.ts:41-47` (gamme) | oui |
| D18 | Barre et profils | `TOOL_TABLE.fill = { label: "Pot", choice: "fill" }` ; `tool("fill", "Pot")` après Tableau dans `defaultToolbars()` (profils `defaut` et `annotation`, pas `simple`) ; catalogue de l'éditeur sans code (lu dans la table). | C10a T6 (`usage-c10a-tableau-cadrage.md:29`) ; HC6-7 | oui |
| D19 | Hauteur de la scène | Scène ≥ 640 px mesurée par l'essai C6a, **Pot actif** (rangée de 6 préréglages), et par tous les essais existants (`stageBox`, `commun.mjs:94`). Sous 640 : préréglages du pot en pastilles sans libellé (`title` gardé). | brief ; HC10-15 | oui |
| D20 | Rendu du fond | La scène peint `background` de la page ; l'aperçu de gomme partielle aussi : `drawLive` ne change pas, le rendu retient le fond reçu par le dernier `drawScene` (même page, même image). L'éditeur de cellule prend `fill ?? fond de la page` au lieu du blanc (`engine/tools/table.ts:55`, `:207`). `PAGE_BACKGROUND` (`engine/page.ts:6`) reste le défaut, rien n'est recopié. | DA4 ; constat `api.ts:145` | oui |
| D21 | Format | Aucun champ neuf (`fill`, `color`, `background` existent) ; `schema` et `formatVersion` inchangés ; un fichier d'avant C6a s'ouvre (fixture `socle-v1.roomboard`) ; aller-retour `.roomboard` testé dans le cœur. | U3 (`usage-cadrage.md:56`) ; brief | oui |
| D22 | Essai navigateur | `scripts/essais/c6a-pot-navigateur.mjs` joué par `verifier.sh --e2e` (liste `:92-104` et `scripts/tests/verifier-e2e.test.sh:13`) ; capture `docs/essais/c6a-pot.png` (forme, contour, mot, fond). Aucun build Tauri. | brief ; état « Terminé quand » | oui |
| D23 | Taille et licences | Aucune dépendance neuve (mots par `Intl.Segmenter` dans la page, pas de `unicode-segmentation`) ; plafond Wasm 1 572 864 o inchangé (module à 1 000 393 o après C10b). | H2-13 ; brief ; journal C10b du coffre | oui |
| D24 | Voisinage de C3 | Code du cœur dans un module neuf `crates/roomboard-core/src/fill.rs` (commande et `edge_hit`) ; `commands.rs` ne reçoit que la variante, `BadFill` et le bras d'`apply`. Aucun changement de `select.ts`, `keys.ts`, `workspace.ts`, `element.rs`, `format/`, `item-state.ts`. Intégrer `origin/main` avant la fusion. | brief ; état « Pièges trouvés » | oui |
| D25 | Groupe : preuve | Le test « un objet groupé se colore seul » n'est écrivable qu'avec `Group` (C3, non fusionné) : il entre à l'intégration d'`origin/main` si C3 est fusionné avant C6a ; sinon C3 l'hérite (le pot est déjà dans `main`). | HC6-9 | oui |
| D26 | Repli des mots | Sans `Intl.Segmenter` : mot = suite maximale de lettres, chiffres, marques Unicode (`/[\p{L}\p{N}\p{M}]/u`) ; même repli que `graphemes` (`text-layout.ts:40`). | HC6-6 | oui |
| D27 | Constats ouverts | `api.ts:145` (blanc du fond en double) : non aggravé (D20). `c9-grille-navigateur.mjs:1` (`paintedIn` copie `inkIn`) : **fermé** par ce chantier : `inkIn(page, box, opts = {})` gagne `opts.max` (seuil de somme RVB, défaut 300) et `opts.rgb` + `opts.tol` (pixels proches d'une couleur) ; `paintedIn` devient `inkIn(page, box, { max: 750 })` ; aucun troisième compteur. `toolbar-host.ts:45` (préréglages lus à la main) : le pot passe par `presetsOf`. | `docs/architecture-constats.md` | oui |

## 3. Carte d'impact

Rubriques déduites (le profil n'a pas de ligne « Surfaces d'impact ») ; graphe graphify absent pour ce dépôt
(`~/.cache/graphes/` n'a pas `roomboard`) : recherche texte seule.

### Cœur (`crates/roomboard-core/src/`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `commands.rs:30` (`Command`), `:212` (`CommandError`), `:509` (`apply`) | oui | variante `Fill`, `BadFill` et son message (D12, D24) | V |
| `fill.rs` (neuf) | oui | `cmd_fill`, `edge_hit` (DA1, DA2) | S |
| `lib.rs` | oui | `mod fill;` | V |
| `query.rs:192` (`hit_test`) | non | appelé tel quel (D3) | V |
| `ink/hit.rs:32` (`dist_to_edges`), `:3` (`point_in_polygon`) | non | réutilisés par `edge_hit` | V |
| `shape.rs:69` (`shape_polygon`), `commands.rs:306` (`read_shape`), `element.rs:219` (`read_style`) | non | lus par `edge_hit` et `cmd_fill` | V |
| `rich_text.rs:54` (`valid_color`) | non | validation de la couleur | V |
| `document.rs:81`, `:171` (`background`) | non | champ écrit par `Fill`, déjà lu | V |
| `commands.rs:1177` (`cmd_format_text`), `table.rs:1030` (`cmd_set_table_fill`), `SetTableCell` | non | réutilisés tels quels (D6, D8, D9) | V |
| `element.rs`, `format/mod.rs`, `history.rs` | non | aucun champ neuf ; une transaction = une étape (D11 du socle) | V |

### Liaison Wasm et contrat de la page

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-wasm/src/lib.rs:904` (`hit_test`) et méthodes `*_inner` | oui | `fill(...)`, `edge_hit(...)` | V |
| `apps/web/src/core/api.ts` (`Command`, `CoreDocument`) | oui | `{ type: "Fill"; page; target; color }`, `edgeHit(id, x, y, tol)` | V |
| `apps/web/src/core/wasm-core.ts:373-400` (aiguillage) | oui | bras `Fill`, `edgeHit` | V |
| `apps/web/src/core/fake-core.ts:931` (`hitTest`), `:316` (`distToSegment`), `:127` (`MESSAGES`) | oui | `Fill`, `edgeHit` au modèle du cœur, message `BadFill` | V |
| `apps/web/src/core/fake-core.ts:123` (`FakePage`), `:148`, `:498`, `:907` (`page()` rend `#ffffff` en dur), `:992`, `:1235`, `:1244` | oui | `FakePage` gagne `background` : créé, lu, sauvé, rechargé comme dans le cœur | V |
| `scripts/controle-wasm-bindgen.sh` | non | à garder vert | S |

### Moteur, outils, rendu (`apps/web/src/engine/`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `fill-target.ts` (neuf) | oui | cible → commande (DA3) | S |
| `tools/fill.ts` (neuf) | oui | geste du pot (D15) | S |
| `text-layout.ts:40` (`graphemes`), `:206` (`layoutRich`) | oui | `wordAt`, `offsetAt` ajoutés à côté | V |
| `input/gesture.ts:6` (`DrawTool`) | oui | `"fill"` | V |
| `engine.ts:54` (`ToolFactories`), `:372` (table `tools`), `:568` (`setPenStyle`), `:239` (`state`) | oui | fabrique `fill?`, `setFillColor`, couleur du pot | V |
| `render/canvas2d.ts:201` (scène), `:439` (aperçu de gomme) | oui | fond lu dans la page (D20) | V |
| `render/webgl2.ts:384` (aperçu de gomme), `:295` (`drawScene`) | oui | idem | V |
| `render/renderer.ts:6` (`PageView`), `:36` (`SceneSource`) | oui | le fond de la page montrée arrive au rendu | V |
| `table-geom.ts:168` (`tableAt`), `:225` (`cellInnerBox`), `:85` (`anchorOf`), `:158` (`cellContent`), `:97` (`cellAt`) | non | réutilisés (D8, D9) ; `cellAt` reçoit un point ramené dans la boîte (D7) | V |
| `tools/table.ts:55` (`CELL_EDITOR_BACKGROUND`), `:207` | oui | éditeur de cellule : `fill ?? fond de la page` (D20) | V |
| `tools/select.ts`, `tools/text.ts`, `input/keys.ts` | non | aucun changement (D24) | V |
| `app/board-session.ts:159-171` (fabriques) | oui | fabrique du pot avec `measure` | V |

### Barre et profils

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/toolbar.ts:84` (`TOOL_TABLE`), `:142` (voisin de `TABLE_FILLS`) | oui | `fill` (D18) ; `FILL_COLORS` (D17) | V |
| `apps/web/src/toolbar-profiles.ts:57` (groupe `edition`) | oui | `tool("fill", "Pot")` ; `presets` (`:41`) inchangé | V |
| `apps/web/src/app/toolbar-host.ts:18` (`HostTargets`), `:57` (`setTool`) | oui | préréglage du pot → `setFillColor` (D16) | V |
| `apps/web/src/ui/Toolbar.tsx:83` (`PresetRow`) | oui | pot actif : liste `presets.fill` ou `FILL_COLORS`, puis bouton « Aucune » (D11, D16) | V |
| `apps/web/src/profile-edit.ts:32` (`PRESET_FIELDS`), `:45` (`NEW_PRESET`), `:132` (`addPreset`) | oui | champ `color` seul pour `fill` ; préréglage neuf sans épaisseur (D17) | V |
| `ui/item-state.ts`, `ui/ProfileEditor.tsx` | non | état enfoncé et catalogue lus dans `TOOL_TABLE` | V |
| `toolbar-profiles.ts:80-97` (`simple`) | non | profil court gardé | V |

### Format et fichiers

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| fichiers `.roomboard` | oui | valeurs neuves de champs existants ; aucun champ ni `kind` neuf | V |
| fichiers `.rbprofile` | oui | `presets.fill` facultatif (écrit par l'éditeur) ; un profil sans lui reste valide et montre `FILL_COLORS` | V |
| `crates/roomboard-formats`, coque Tauri | non | rien | V |

### Essais et scripts

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/essais/c6a-pot-navigateur.mjs` (neuf) | oui | essai D22 | S |
| `scripts/essais/commun.mjs:71` (`inkIn`) | oui | options `max`, `rgb`, `tol` (D27) | V |
| `scripts/essais/c9-grille-navigateur.mjs:20` (`paintedIn`) | oui | remplacé par `inkIn(…, { max: 750 })` (constat fermé) | V |
| `scripts/verifier.sh:92-104`, `scripts/tests/verifier-e2e.test.sh:13` | oui | ligne de l'essai | V |
| `docs/essais/c6a-pot.png` (neuf) | oui | capture | S |
| `s2`, `s34`, `fichiers`, `s5b`, `c2-image`, `c1-profils`, `c10a`, `c10b`, `c9-grille`, `c7b` (`scripts/essais/`) | non | à garder verts : la barre gagne un bouton (`stageBox`) | V |

### Tests

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core/tests/pot.rs` (neuf) | oui | `Fill` : étape, annulation, D38, `BadFill`, aller-retour, fixture d'avant C6a | S |
| `apps/web/src/core/wasm-core.contract.test.ts` | oui | bloc « contrat C6a » en fin de fichier (`Fill`, `edgeHit`) | V |
| `engine/fill-target.test.ts`, `engine/tools/fill.test.ts` (neufs) | oui | règles D3-D11, D15 | S |
| `engine/text-layout.test.ts` | oui | `offsetAt`, `wordAt` | V |
| `engine/render/canvas2d.test.ts:57`, `:67`, `:125`, `:459` ; `webgl2.test.ts` | oui | fond lu dans la page ; défaut blanc inchangé | V |
| `toolbar.test.ts:167` (clés de `TOOL_TABLE`), `profile-edit.test.ts:86` (et préréglages du pot), `ui/Toolbar.test.tsx` (rangée du pot), `app/toolbar-host.test.ts:28`, `core/fake-core.test.ts` (fond) | oui | outil et préréglages neufs | V |
| `crates/roomboard-core/tests/compat_socle.rs`, `texte_riche.rs`, `tableau*.rs` | non | à garder verts | V |
| `ui/Toolbar.test.tsx`, `engine/engine.test.ts`, `engine/tools/*.test.ts` | non | à garder verts | V |

### Effets de bord sur l'existant

- La barre par défaut (`defaut`, `annotation`) gagne « Pot » : la scène peut perdre une ligne → `stageBox` de tous les essais
  et le contrôle de hauteur de `c6a-pot-navigateur.mjs` (Pot actif) ; `toolbar.test.ts:167`, `profile-edit.test.ts:86`.
- Le fond de la scène vient du document au lieu de la constante : identique pour tout document existant (`#ffffff`) →
  `canvas2d.test.ts:57` reste vert, plus un test « fond `#bfdbfe` peint » ; l'aperçu de gomme partielle repeint le fond
  réel → `canvas2d.test.ts:125` et un test webgl2 du même cas.
- `setTool` de l'hôte : un préréglage du pot n'appelle plus `setPenStyle` (la couleur du stylo ne change pas) →
  `toolbar-host.test.ts` (cas neuf à côté de `:28`).
- L'union `Command` s'élargit : les aiguillages exhaustifs (`wasm-core.ts`, `fake-core.ts`) doivent traiter `Fill` →
  contrat C6a.
- Une copie utilisateur du profil `defaut` n'a pas le Pot (HC6-7) → `profile-store.test.ts` inchangé, catalogue vérifié
  par `profile-edit.test.ts`.

### Chantiers en cours

- **C3 groupes** (OD83, `feat/usage-c3-groupes` @ 8f3757b, worktrees `usage-c3-groupes` et `--T1` à `--T10`) : fichiers
  communs probables : `crates/roomboard-core/src/commands.rs` (variantes `Group`/`Ungroup`, `BadGroup`), `lib.rs`
  (`pub mod copy`), `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/api.ts`, `fake-core.ts`, `wasm-core.ts`,
  `wasm-core.contract.test.ts`, `engine/engine.ts` (interface `Engine`), `toolbar.ts` (`ACTION_TABLE`, lignes voisines),
  `toolbar-profiles.ts` (`pagesBar`, lignes voisines), `toolbar.test.ts`, `toolbar-profiles.test.ts`,
  `profile-edit.test.ts`, `app/toolbar-host.ts`, `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`.
  Conflits attendus : ajouts côte à côte, textuels. C3 ajoute aussi `page-insert-file` (barre des pages) et une rangée
  Sélection : la hauteur de scène se remesure après intégration.
- PR ouvertes : aucune (`gh pr list` vide). Autre machine : aucune donnée de l'orchestrateur.

### Termes cherchés

Graphe : absent pour ce dépôt. Recherche texte (`grep -rn`) : `hitTest\|hit_test` ; `background` (cœur) ;
`\.background\b\|PAGE_BACKGROUND` (page) ; `"fill"` (cœur) ; `pub enum Command`, variantes de `Command` ;
`fn valid_color` ; `ToolChoice` ; `setTool\|preset\|setPenStyle` (`engine.ts`) ; `Segmenter\|wordAt\|word` ;
`caretAt\|offsetAt\|indexAt\|caretFromPoint\|charIndex\|offsetOf` ; `distToSegment\|distToEdges\|pointInPolygon\|dist_to_edges` ;
`createTableTool(\|createTextTool(\|measureWith(` ; `SetTableFill` (liaison, fausse liaison) ; `640` (essais) ;
`Object.keys(TOOL_TABLE)\|toHaveLength(1[0-9])` ; `PROFILE_MINOR\|minor` ; `miniature\|thumbnail` ; `invalidate`.
Coffre : « pot de peinture roomboard », « roomboard barre outils scène 640 px hauteur », « roomboard module wasm plafond
taille », « roomboard piège hit_test texte FormatText », « décision Jérôme roomboard couleur outil pot remplissage ».

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| Élément sous le pointeur | `crates/roomboard-core/src/query.rs:192`, `apps/web/src/core/api.ts:221` | `hitTest(page, x, y, tol)` | réutiliser |
| Bord d'une forme | `ink/hit.rs:32` (`dist_to_edges`), `shape.rs:69`, `commands.rs:306` (`read_shape`) | `Document::edge_hit(&self, id: &str, x: f64, y: f64, tol: f32) -> bool` ; page : `edgeHit(id, x, y, tol): boolean` | étendre (DA2) |
| Écrire `fill`, `color`, `background` | `commands.rs:30` (`Command`) | `Command::Fill { page: String, target: FillTarget, color: Option<String> }` ; page : `{ type: "Fill"; page: string; target: { kind: "edge" \| "inside"; id: string } \| { kind: "background" }; color: string \| null }` | étendre (DA1) |
| Valider une couleur | `rich_text.rs:54` (`valid_color`), `core/rich-text.ts:94` (`validColor`) | tels quels | réutiliser |
| Couleur d'un mot ou d'un texte entier | `commands.rs:93` (`FormatText`) | `{ type: "FormatText", id, start, len, attrs: { color } }` | réutiliser |
| Couleur d'un mot de cellule | `commands.rs:119` (`SetTableCell.spans`), `core/rich-text.ts:149` (`formatSpans`) | `SetTableCell { …, content: inchangé, spans: formatSpans(spans, start, len, { color }) }` | réutiliser |
| Remplir une cellule | `commands.rs:150` (`SetTableFill`) | tel quel | réutiliser |
| Cellule sous le pointeur | `engine/table-geom.ts:168` (`tableAt`), `:225` (`cellInnerBox`), `:85` (`anchorOf`), `:158` (`cellContent`) | tels quels | réutiliser |
| Repère local | `core/shapes.ts:98` (`invertMatrix`), `:81` (`applyMatrix`) | tels quels | réutiliser |
| Caractère sous un point | `engine/text-layout.ts:206` (`layoutRich`) | `offsetAt(spans, base, boxWidth, measure, lx, ly): number \| null` (unités UTF-16 du contenu) | étendre |
| Limites de mot UAX 29 | `engine/text-layout.ts:40` (`graphemes`, cache d'`Intl.Segmenter`) | `wordAt(content, offset): readonly [number, number] \| null` | étendre |
| Mise en lignes d'une cellule | `table-geom.ts:221` (`innerWidth` via `cellInnerBox`) et `render/table-paint.ts:127` (`cellTextBoxes`) | même largeur intérieure que le rendu | réutiliser |
| Décider la cible | — (« fillHitAt », « paintTarget », « fill-target » : rien côté page) | `fillCommand(doc, page, x, y, zoom, color, measure): Command \| null` | nouveau module (DA3) |
| Geste du pot | `engine/tools/tool.ts:36` (`GestureTool`), `engine.ts:372` (table `tools`) | `createFillTool(ctx, color: () => string \| null, measure): GestureTool` | étendre |
| Couleur du pot | `engine.ts:568` (`setPenStyle`), `app/toolbar-host.ts:57` (`setTool`, `presetsOf`) | `Engine.setFillColor(color: string \| null): void` | étendre |
| Rangée des couleurs | `ui/Toolbar.tsx:83` (`PresetRow`) | `presets.fill` ou `FILL_COLORS`, plus « Aucune » | étendre |
| Outil dans la barre | `toolbar.ts:84` (`TOOL_TABLE`), `toolbar-profiles.ts:41`, `:57` | `fill: { label: "Pot", choice: "fill" }` | étendre |
| Fond peint par le rendu | `render/canvas2d.ts:201`, `:439`, `render/webgl2.ts:384`, `engine/page.ts:6` | `PageView` du rendu gagne `background?: string` (défaut `PAGE_BACKGROUND`) | étendre (DA4) |
| Fausse liaison | `core/fake-core.ts:931` (`hitTest`), `:316` (`distToSegment`) | `Fill`, `edgeHit` | étendre |
| Fichier d'avant C6a | `crates/roomboard-core/tests/compat_socle.rs:12`, `tests/fixtures/socle-v1.roomboard` | `fixture(name)` | réutiliser |
| Pixels dans l'essai | `scripts/essais/commun.mjs:71` (`inkIn`), `:94` (`stageBox`), `:103` (`stageMouse`) | `inkIn(page, box, { max?, rgb?, tol? })` | étendre |
| Couleurs du pot par défaut | `toolbar.ts:142` (`TABLE_FILLS`, patron) | `FILL_COLORS: readonly { id, label, color }[]` | étendre (même patron) |
| Champs d'un préréglage dans l'éditeur | `profile-edit.ts:32` (`PRESET_FIELDS`), `:45` (`NEW_PRESET`) | `fill: [color]` ; préréglage neuf selon l'outil | étendre |

## 4. Hypothèses à revoir

Niveau 1 (visibles des utilisateurs ou difficiles à défaire) :
- **HC6-1** Clic dans un texte hors d'un mot : tout le texte prend la couleur (D7). Autre lecture : ne rien faire.
- **HC6-2** Clic dans une cellule hors d'un mot : la cellule se remplit (D9). Autre lecture : couleur du texte de la cellule.
- **HC6-3** « Aucune » retire la couleur posée (forme sans remplissage, mot à la couleur du texte, cellule sans
  remplissage, fond blanc) ; sur un contour ou un trait elle ne fait rien (D11).
- **HC6-4** Couleurs du pot : `presets.fill` du profil, sinon la liste figée (Rouge, Jaune, Vert, Bleu, Noir), plus
  « Aucune » fixe ; couleur propre au pot, défaut rouge ; choisir une couleur du pot ne change pas celle du stylo (D16, D17).
- **HC6-7** Pot dans `defaut` et `annotation`, pas dans `simple` ; une copie utilisateur du profil `defaut` ne l'a pas,
  il s'ajoute par le catalogue (D18, comme HC10-16).

Niveau 2 :
- **HC6-5** Le pot agit au relâché, au point d'appui ; un geste annulé n'écrit rien (D15).
- **HC6-6** Sans `Intl.Segmenter`, un mot = lettres, chiffres et marques Unicode (D26).
- **HC6-8** Cellule ombrée : remplissage posé sous l'ombrage, aucun mot visé (D9).
- **HC6-9** Le test du groupe attend `Group` de C3 (D25).
- **HC6-10** Bande du bord : tolérance + demi-épaisseur, mesurée au tracé sans épaisseur (D5).
- **HC6-11** Élément inconnu touché : traité comme une image, fond de la page (D1).
- **HC6-12** Clic dans la bande de tolérance autour d'un texte ou d'un tableau : ramené dans la boîte (D7).
- **HC6-13** Aperçu de gomme : fond retenu du dernier `drawScene` ; éditeur de cellule au fond de la page (D20).

## 5. Décisions d'architecture

**DA1 — Une commande grossière `Fill` à cible extensible.**
Contexte : contour, intérieur et fond s'écrivent dans trois champs existants ; C6b (zone d'image) et C8 (`kind: "fill"`) viendront.
Décision : `Command::Fill { page, target: FillTarget, color: Option<String> }`, `FillTarget = Edge{id} | Inside{id} | Background`, code dans `fill.rs`.
Mots et cellules gardent `FormatText`, `SetTableCell`, `SetTableFill` : rien n'est refait.
Conséquences : C6b et C8 ajoutent une variante de `FillTarget` ; `commands.rs` reste petit (voisinage de C3).

**DA2 — Le bord d'une forme se mesure dans le cœur.**
Contexte : la géométrie des formes et la distance aux arêtes vivent dans le cœur (`shape.rs`, `ink/hit.rs`), la page n'en a qu'un miroir de test.
Décision : requête de lecture `edge_hit(id, x, y, tol) -> bool` (vrai pour rectangle et ellipse près du tracé ; faux sinon), sans transaction (D38).
Conséquences : une méthode de plus à la liaison et à la fausse liaison, jouée par le contrat ; aucune distance recopiée côté page.

**DA3 — La cible se décide dans un module pur de la page.**
Contexte : le mot sous le pointeur exige la mesure du texte, qui n'existe que dans la page (`measure`, `layoutRich`).
Décision : `engine/fill-target.ts` expose `fillCommand(doc, page, x, y, zoom, color, measure): Command | null` (`null` : aucune étape) ; l'outil appelle `ctx.run` avec le résultat.
Conséquences : toutes les règles D3-D11 se testent sans navigateur sur la fausse liaison ; l'outil reste un geste.

**DA4 — Le rendu peint le fond de la page.**
Contexte : `background` est écrit dans le document depuis le socle mais la scène peint la constante `PAGE_BACKGROUND`.
Décision : le moteur passe `background` de la page montrée dans le `PageView` du rendu ; la scène le peint et le retient pour l'aperçu de gomme partielle (Canvas 2D, WebGL2), sans changer `drawLive`.
Conséquences : aucune différence pour un document existant (blanc) ; le constat `api.ts:145` n'est pas aggravé.

## 6. Scénarios d'acceptation

- **S1** Tracer un rectangle sans remplissage, choisir Pot puis « Jaune », cliquer au centre : il se remplit de jaune ;
  Annuler : il redevient vide (une étape) ; Rétablir : jaune.
- **S2** Pot « Rouge », cliquer à 3 px du bord du rectangle jaune : le contour devient rouge, l'intérieur reste jaune ;
  cliquer sur un trait du stylo : le trait devient rouge ; « Aucune » au centre du rectangle : remplissage retiré.
- **S3** Texte « Le chat noir » : Pot « Rouge », clic sur « chat » : seul ce mot devient rouge ; éditer en
  « Le gros chat noir » : « chat » reste rouge. Tableau, cellule « Lundi matin » : clic sur « matin » : seul ce mot
  devient rouge (une étape) ; clic dans le blanc d'une cellule vide : la cellule se remplit. Pot « Bleu », clic sur
  l'espace entre « Le » et « gros » : tout le texte devient bleu (une étape), « chat » compris.
- **S4** Pot « Bleu », clic dans une zone vide : le fond de la page devient bleu ; clic sur une image : le fond change,
  l'image reste intacte (C6b non livré) ; « Aucune » dans le vide : fond blanc ; Annuler : bleu revient.
- **S5** Après S1 à S4, enregistrer puis rouvrir : forme, contour, mot et fond identiques ; ouvrir `socle-v1.roomboard`
  (d'avant C6a) : il s'ouvre, fond blanc ; avec Pot actif, la scène garde au moins 640 px de haut ; capture
  `docs/essais/c6a-pot.png`.

## 7. Hors périmètre

- P1 image (remplir ou effacer une zone de pixels, tolérance dans la rangée de l'outil) : C6b, après C5.
- P3 zones fermées par plusieurs objets (`kind: "fill"`, `i_overlay`) : C8.
- Dégradés, motifs, opacité du remplissage ; pipette.
- Raccourci clavier du pot (`keys.ts` est touché par C3) ; curseur dédié.
- Test « objet groupé » tant que C3 n'est pas dans `main` (D25).
- Build Tauri, essais Windows, macOS, iPad (IME, `Intl.Segmenter` de WebKit) : à Jérôme.

## 8. Portes immédiates

Aucune.
