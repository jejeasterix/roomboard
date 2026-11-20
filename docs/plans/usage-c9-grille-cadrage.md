# Cadrage — usage-c9-grille (C9, partie cœur : grille de page, magnétisme, rendu net)

Cadré en mode autonome le 2026-11-20 (étage 1, cadreur), sans question posée à Jérôme. Ce cadrage court **cite** U31
(`docs/plans/usage-cadrage.md:84`, rang 2, fusionné) et HU2-6 (`:311`) sans les refaire ; il ne tranche que les détails
de la partie cœur (G1 à G15). Base : `origin/main` `05fdb73` (C2 cœur fusionné). Aucun graphe graphify pour RoomBoard :
recherche texte seule. Coffre (`~/SecondBrain`, recherche non dégradée) : aucune décision RoomBoard ni grille dans
`02_Decisions` ; un piège voisin retenu (G7). Jérôme, 2026-11-19, mot pour mot : « Continue d'avancer autant que
possible suivant notre objectif établi. Nous ferons les tests plus tard sur la version à laquelle tu seras parvenu » :
aucune porte visuelle ne bloque ce chantier, les choix visuels sont listés pour l'essai (§ 4).

## 1. Demande et gabarit

**Demande.** Chaque page porte une grille facultative `grid` (U31, six types), aimante les déplacements et les formes
par une fonction pure du cœur, et se dessine nette à tout zoom sur la page de hauteur infinie ; enregistrée dans le
`.roomboard`, compatible avec les fichiers sans grille ; § 9 vague 0 de `usage-cadrage.md`, ligne C9 (`:554`).

**Gabarit.** `chantier`, cadrage court : budget 15 questions, 15 consommées (G1 à G15).

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| G1 | Nom de la commande | **`SetGrid`** (et non `SetPageGrid`) : même forme que `SetBackdrop` (commande de page nommée par le champ qu'elle écrit), nom déjà écrit dans la carte d'impact fusionnée. `SetGrid{ page, grid: Option<GridInput> }`, `None` retire la grille. | `usage-cadrage.md:107` (« `SetGrid`, `SetBackdrop` ») ; `commands.rs:84` (`SetBackdrop`) ; brief (« tranche et écris ») | oui |
| G2 | Modèle et écriture | U31 tel quel : `grid: Y.Map{ visible, snap, above, levels: Y.Array<Y.Map{ kind, spacingX, spacingY, originX, originY, color, line, snap, visible }> }`, jamais `Any::Map`. `line` = style de trait ∈ `solid`, `dashed`, `dotted` (l'épaisseur est fixée par le rendu, G10). Contrôles à l'écriture, erreur `BadGrid` sans transaction : `kind` parmi les six, `spacingX`, `spacingY` finis > 0, `originX`, `originY` finis, `color` non vide, `line` connu, au plus 16 niveaux (0 permis). `GRID_KINDS` défini une fois par couche (`grid.rs`, `api.ts`). | U31 ; U3 (`:56`, valeurs composées) ; `commands.rs:675-744` (modèle `cmd_set_backdrop`) | oui (HG5, HG9) |
| G3 | Géométrie des six types (unités de page, origine `(ox, oy)`) | `squares` : verticales `x = ox + i·sx`, horizontales `y = oy + j·sy` ; accroche aux croisements. `lines` : horizontales `y = oy + j·sy` seules (`sx` gardé, inutilisé) ; accroche `y`, `x` libre. `dots` : points `(ox + i·sx, oy + j·sy)` ; accroche aux points. `isometric` : réseau triangulaire de côté `sx` (`spacingY` gardé, inutilisé), base `b1 = (sx·√3/2, sx/2)`, `b2 = (0, sx)` ; verticales et deux familles à ±30° ; accroche aux sommets. `music` : portées de 5 lignes à `sy`, une portée tous les `10·sy` ; accroche `y` aux lignes des portées. `seyes` : verticales à `sx`, horizontales principales à `sy`, lignes fines à `sy / 4` ; accroche aux croisements verticales × toutes horizontales. Seyès en unités de page (1 mm = 3,78 unités, donc 30,24 pour 8 mm), aucune échelle physique. Une page n'a de lignes que sur `0 ≤ x ≤ width`, `y ≥ 0`. | U31 ; HU2-6 (`:311`) ; étude `docs/etudes/usage-grille-tableau.md` § 4.1, § 4.2 | oui (HG1) |
| G4 | Lecture tolérante | Vue `PageView.grid: GridView \| null`. `grid` qui n'est pas un `Y.Map` : `grid: null`, page lisible. Champ de tête absent : `visible` vrai, `snap` faux, `above` faux. Niveau qui n'est pas un `Y.Map`, ou sans `spacingX`, `spacingY` finis > 0 : absent de la vue, gardé dans le document. Champs de niveau absents : origine 0, `color` `#000000`, `line` `solid`, `snap` et `visible` vrais. `kind` inconnu : dans la vue tel quel, ignoré par le rendu et le magnétisme (U31 « gardé, ignoré »). Clés inconnues : gardées jusqu'au prochain `SetGrid`, qui réécrit en bloc. | U31 ; U3 ; K9 de C2 (`usage-c2-coeur-cadrage.md:43`, page jamais illisible) | oui (HG8) |
| G5 | Sémantique de `SetGrid` | Remplace le champ en bloc (U31 : « une séance = une étape ») : une transaction `"local"`, une étape ; même valeur (comparée champ par champ sur la vue) ou rien à retirer : aucune transaction (D38) ; `Change{ pages: [page] }`. La grille vit dans la page, déjà dans la portée de l'historique (`history.rs:29`) : annuler la remet. Une page neuve (`AddPage`) n'a pas de grille ; retirer une page retire sa grille. | U31 ; D11, D38 ; `commands.rs:740-756` (`done`, `unchanged`) ; `history.rs:29` | oui (HG4) |
| G6 | `snap_point` | Fonction pure `grid::snap_point(&GridView, page_width, p) -> Option<(f64, f64)>`, écrite d'après `nearestGridPoint` d'ActCraft : `None` si `snap` faux ou aucun niveau `snap` d'un `kind` connu ; sinon le candidat le plus proche (distance euclidienne) parmi les niveaux qui accrochent ; **sans seuil** ; une grille ou un niveau invisible accroche quand même ; candidat ramené aux lignes de la page (indice borné à la première ligne `≥ 0` et à la dernière `≤ width`, comme `snapAxis`). Isométrique : point du réseau le plus proche par les 3 × 3 voisins de l'arrondi (`nearestLatticePoint`, base déjà réduite), voisins hors page écartés. | U31, U39 (`:92`, reprise permise) ; `~/projets/actcraft/core/src/gridsnap.cpp:47-121`, `:176-200` | oui (HG3) |
| G7 | `snap_delta` et point accroché | `Document::snap_delta(page, ids, dx, dy) -> (dx', dy')` : boîte d'accroche = union des boîtes **géométriques** des éléments (forme : `(0, 0)-(w, h)` transformée, **sans** l'épaisseur du trait ; texte, image, inconnu : leur boîte ; trait : son contour) ; points candidats = 4 coins et centre de cette boîte, déplacés de `(dx, dy)` ; on garde celui dont le point aimanté est le plus proche, `delta` corrigé d'autant ; `delta` inchangé sans accroche. L'outil l'appelle **toujours depuis le déplacement brut** du pointeur, à chaque image et au relâché : l'aperçu et la `Transform` écrite sont le même calcul (piège du coffre : une aimantation appliquée à une position déjà corrigée change de cible au lâcher). | U31 (« le coin ou le centre de la boîte le plus proche ») ; ActCraft `gridsnap.cpp:137-174` (« l'ancrage vise la forme, pas son trait ») ; coffre `04_Pieges/nodify-arrondit-la-position-a-la-grille-au-lacher.md` ; `query.rs:112` (`element_geom`), `:211` (`bounds`) | oui (HG6) |
| G8 | Où le magnétisme s'applique | Outil Sélection, mode `move` (`select.ts:80-83`) : `snapDelta`. Outil Formes : `snapPoint` sur le point de départ et sur le bout courant, puis Maj (`constrainEnd`) s'applique au bout aimanté. Alt tenu : aucun magnétisme ; Alt suivi comme Maj par le moteur (`ToolContext.alt?()`). Jamais : encre, gomme, redimensionnement par poignées, pose du texte. | U31 (« appliqué aux déplacements et aux formes, jamais au tracé d'encre ; Alt l'ignore ») ; `engine.ts:144`, `:264`, `:360-400` (Maj) ; `tool.ts:10-19` | oui (HG7) |
| G9 | Lignes visibles, page infinie | Le cœur calcule les lignes : `Document::grid_lines(page, rect, min_step) -> Option<GridLines{ above, levels: Vec<LevelLines{ color, line, alpha, segments, dots }> }>`, en unités de page, limitées à `rect ∩ page` ; `None` si pas de grille ou `visible` faux ; niveau invisible ou de `kind` inconnu sauté ; **famille sautée** si son pas est `< min_step` (Seyès : lignes fines sautées avant les principales ; `music` : portée entière). `rect` = partie visible de la page (haut de vue compris, pas `y = 0`) : le nombre de lignes dépend de la vue, jamais de la distance au haut de page (≤ largeur / `min_step` + hauteur / `min_step` + 2 par famille). Côté page : `min_step = MIN_GRID_PX / zoom`, `MIN_GRID_PX = 4`. | U31 (« niveau trop fin sauté ») ; décision de Jérôme D5 amendée (page infinie, citée `usage-c2-coeur-cadrage.md:20-22`) ; étude § 4.3 (4 px) ; `page.ts:18-22` | oui (DAG1) |
| G10 | Rendu net | Nouveau module `engine/render/grid-paint.ts`, appelé par `Canvas2DRenderer.drawScene` : dessin en pixels physiques (`setTransform` identité), épaisseur `max(1, round(dpr))` pixels physiques (1 pixel CSS d'écran à tout zoom), ligne verticale ou horizontale posée sur `round(X) + 0,5` si l'épaisseur est impaire, sur `round(X)` sinon ; obliques (isométrique) sans calage ; point = carré de `max(2, round(2·dpr))` pixels calé ; `dashed` `[6, 4]`, `dotted` `[1, 3]` (en pixels CSS × dpr), décalage du motif calé sur l'origine du monde (le motif ne glisse pas au défilement) ; lignes fines du Seyès en `alpha` 0,5. | U31 (« ligne d'un pixel d'écran à tout zoom ») ; étude § 4.3 ; `canvas2d.ts:113-125` (`resize`, échelles `sx`, `sy`), `:178` (cadre à 1 px écran) | oui (HG2) |
| G11 | Ordre des couches | Scène fixe : pourtour, fond de page (`background`), `backdrop` (U6 ; dessiné par la partie « reste » de C2, place réservée), grille si `above` faux, éléments, contenu du calque d'édition (fantômes, formes en cours), grille si `above` vrai, habillage d'édition (rectangle de sélection, cadre, poignées). Canvas d'interaction (encre vive, gomme) toujours au-dessus. `paintOverlay` se coupe en deux (contenu, habillage). | U6 (`:59`, « sous la grille et sous les éléments ») ; U31 (`above`) ; étude § 2 (`gridOverlay` entre l'encre et les surcouches chez ActCraft) ; `canvas2d.ts:129-144`, `:166-` | oui (DAG2) |
| G12 | Liaison et contrat TS | Wasm : `set_grid(page, visible, snap, above, kinds: Vec<String>, colors: Vec<String>, lines: Vec<String>, nums: &[f64])` (`nums` : 6 nombres par niveau, `sx, sy, ox, oy, snap, visible`, booléens en 0 ou 1 ; longueurs incohérentes : `BadGrid`), `clear_grid(page)`, `snap_point(page, x, y) -> Option<Vec<f64>>`, `snap_delta(page, ids, dx, dy) -> Vec<f64>`, `grid_lines(page, x0, y0, x1, y1, min_step) -> JsValue` ; équivalents `*_inner` testables en natif. TS (`api.ts`) : `GridLevel`, `GridView`, `GridInput`, `GridLines`, `GRID_KINDS` ; `Command` gagne `SetGrid` ; `PageView.grid` ; `CoreDocument.snapPoint`, `snapDelta`, `gridLines`. Pas de `Deserialize` (poids du module). | `lib.rs:173` (`matrix: &[f64]`), `:207` (`clear_backdrop`), `:444` (`*_inner`) ; K14 de C2 (marge de poids partagée avec C7 et C9) | oui |
| G13 | Fausse liaison | `fake-core.ts` : `SetGrid`, `page().grid`, lecture tolérante et sauvegarde JSON à l'identique du cœur ; `snapPoint`, `snapDelta`, `gridLines` pour le seul `kind` `squares` (les cinq autres : ni accroche ni ligne). **Écart assumé**, écrit en tête du fichier comme celui de la gomme partielle et exclu du contrat commun : les cinq autres types ne se testent que sur le vrai module. Pas de copie de la géométrie complète en TS. | D36 (fausse liaison de test) ; `fake-core.ts:1-11` (écart de la gomme, précédent) | oui (DAG3) |
| G14 | Tests de format | Aller-retour : `SetGrid` (Seyès + points + `above`) puis enregistrer, recharger, réenregistrer avec le même `SaveMeta` : **mêmes octets**, même `page().grid` (modèle `commands.rs:2291`, `image_and_backdrop_reload_keep_bytes`). Compatibilité : `socle-v1.roomboard` (fixture de C2) s'ouvre avec `grid: null` sur ses deux pages et se réenregistre à l'identique (garde existante gardée). Version plus récente : niveau `kind: "hexagon"` et clé inconnue écrits par `yrs` dans le test, gardés à l'aller-retour (octets), absents de `grid_lines` et sans accroche. `schema` et `formatVersion` restent 1. | U31 (« Test "recharger avec grille garde les octets" ») ; U3 ; K10, K15 de C2 ; `tests/compat_socle.rs:91-112` | oui |
| G15 | Licences, poids | Aucune dépendance ajoutée. `THIRD_PARTY_NOTICES.md` gagne une section « Code repris d'ActCraft » : `nearestGridPoint`, `snapAxis`, `nearestLatticePoint` (`core/src/gridsnap.cpp`), GPL-3.0-only, même auteur seul, repris sous PolyForm Shield (décision 0246). Poids du module Wasm mesuré en fin de chantier contre le budget de `verifier.sh` (1 572 864 octets). | U39 (`:92`) ; brief ; `scripts/verifier.sh:45` | oui |

## 3. Carte d'impact

Rubriques déduites (le profil n'a pas de ligne « Surfaces d'impact ») : cœur, liaison, page, rendu, outils, tests,
autres dépôts. Chemins de `main` (`05fdb73`).

### Cœur Rust (`crates/roomboard-core`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/grid.rs` (nouveau), `src/lib.rs:2-11` (`pub mod`) | oui | `GridView`, `GridLevelView`, `GridInput`, `GRID_KINDS`, lecture tolérante, `snap_point`, `snap_candidates`, `lines` (G2-G9) | S |
| `src/element.rs:32-38` (`PageView`) | oui | champ `grid: Option<GridView>` | V |
| `src/document.rs:161-172` (`page`) | oui | une ligne : `grid: grid::read(&txn, &m)` | V |
| `src/document.rs` (nouveau) `snap_point`, `snap_delta`, `grid_lines` | oui | lisent la page puis appellent `grid.rs` | S |
| `src/commands.rs:28-88` (`Command`), `:110-` (`CommandError`), `:391-450` (`apply`) | oui | `SetGrid` et `BadGrid` en fin d'énumération, bras en fin de `match` ; `cmd_set_grid` court, l'écriture `Y.Map` dans `grid.rs` | V |
| `src/commands.rs:675-744` (`cmd_set_backdrop`), `:740-756` (`done`, `unchanged`) | non | modèle et aides réutilisées | V |
| `src/commands.rs:758` (`cmd_add_page`), `:778` (`cmd_remove_page`) | non | page neuve sans grille ; retirer une page retire sa grille (G5) | V |
| `src/commands.rs:506` (`cmd_transform`) | non | la `Transform` aimantée est une `Transform` ordinaire | V |
| `src/query.rs:112-150` (`element_geom`) | oui | `snap_box` : boîte géométrique (forme sans épaisseur), G7 | V |
| `src/query.rs:211-229` (`bounds`) | non | gardé pour le cadre de sélection | V |
| `src/history.rs:18-31` | non | `pages` déjà dans la portée | V |
| `src/format/mod.rs` | non | la grille voyage dans `document.ybin` | V |
| `src/shape.rs`, `src/ink/`, `src/capabilities.rs`, `src/asset.rs` | non | sans rapport (`cited_assets` balaie `grid` sans rien y trouver) | V |

### Liaison Wasm (`crates/roomboard-wasm/src/lib.rs`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `:143-148` (`page`) | non (code) | sortie élargie de `grid` par la vue du cœur | V |
| `:207-209` (après `clear_backdrop`) | oui | `set_grid`, `clear_grid`, `snap_point`, `snap_delta`, `grid_lines`, groupés en fin de bloc (G12) | V |
| `:444-454` (après `set_backdrop_inner`) | oui | `set_grid_inner` ; tests natifs en fin de module | V |

### Page (`apps/web/src/core`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `api.ts:1-8` (en-tête), `:29-62` (`Command`), `:92-98` (`PageView`), `:108-133` (`CoreDocument`) | oui | ligne C9 en tête ; `SetGrid` en fin d'union ; `grid` ; trois méthodes en fin d'interface ; types en fin de fichier | V |
| `wasm-core.ts:140-148` (`toPageView`), `:188-192` (`apply`), `:198` | oui | `toGridView` (contrôle de forme, `undefined` → `null`) ; case `SetGrid` ; trois méthodes | V |
| `fake-core.ts:1-11`, `:60` (`FakePage`), `:443-456` (`apply`), `:473-477` (`page`), `:560`, `:590`, `:656` (save, load) | oui | G13 ; `finitePositive` local réutilisé (constat ouvert `fake-core.ts:73`, pas de troisième copie) | V |
| `api.ts:145` (`PAGE_WIDTH`) | non | la grille lit `page().width` du cœur ; constat ouvert non aggravé | V |

### Rendu et outils (`apps/web/src/engine`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `render/grid-paint.ts` (nouveau) | oui | G10 : lignes du cœur → pixels physiques calés | S |
| `render/renderer.ts:36` (`SceneSource`) | oui | `gridLines` facultatif (`Partial<Pick<…>>`) : les sources de test existantes compilent | V |
| `render/canvas2d.ts:104`, `:116-125` (`resize`), `:129-144` (`drawScene`), `:166-` (`paintOverlay`) | oui | largeur CSS retenue ; grille avant ou après les éléments ; calque coupé en contenu et habillage (G11) | V |
| `render/canvas2d.ts:88-94`, `:240-247` (texte) | non | zone de C7 | V |
| `render/webgl2.ts:295` (`drawScene`) | non | délègue à la scène Canvas 2D | V |
| `page.ts:18-22` (`visiblePageRect`) | oui | `visibleGridRect(camera, viewW, viewH)` à côté : haut de vue compris (G9) | V |
| `engine.ts:144`, `:264`, `:360-400` | oui | `altHeld` comme `shiftHeld` ; `ctx.alt` | V |
| `engine.ts:291` (`drawScene`) | non | le rendu lit la grille par sa source | V |
| `tools/tool.ts:10-19` (`ToolContext`) | oui | `alt?(): boolean` | V |
| `tools/select.ts:80-83` (`matrixOf`), `:90-103` (`startDrag`) | oui | `snapDelta` depuis le brut, sauf Alt (G7, G8) | V |
| `tools/shape.ts:44-46` (`end`), `:48-74` (`begin`, `extend`, `close`) | oui | `snapPoint` puis Maj (G8) | V |
| `tools/pen.ts`, `tools/eraser.ts`, `tools/text.ts`, `tools/handles.ts` | non | jamais aimantés | V |
| `ui/`, `platform/` | non | éditeur en panneau : C9 vague 1 | V |

### Tests

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core/src/grid.rs` (tests neufs) | oui | géométrie des six types, accroche, bornes de page, familles sautées, page infinie | S |
| `crates/roomboard-core/src/commands.rs` (fin du module de tests) | oui | `SetGrid` une étape, même valeur sans étape, `BadGrid` sans transaction, annuler ; aller-retour octets (G14) | V |
| `crates/roomboard-core/tests/compat_socle.rs:103-127` | oui | `grid` absent des deux pages ; `socle_fixture_resaves_identically` gardé vert | V |
| `crates/roomboard-formats/tests/container.rs:406` | non | empreinte figée de `socle-v1.roomboard` : à garder vert | V |
| `apps/web/src/core/wasm-core.contract.test.ts:145-150`, `:714` | oui | littéraux de `PageView` : `grid: null` ; bloc C9 neuf en fin de fichier (après `:912`) | V |
| `apps/web/src/engine/render/canvas2d.test.ts` | oui | ordre des couches, calage, page infinie (S5) | V |
| `apps/web/src/engine/tools/select.test.ts`, `shape.test.ts`, `engine.test.ts` | oui | S3, S4, Alt | V |
| `apps/web/src/engine/tools/pen.test.ts`, `eraser.test.ts`, `text.test.ts` | non | à garder verts (encre jamais aimantée) | V |

### Autres dépôts

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `~/projets/actcraft/core/src/gridsnap.cpp` | non | lu seulement ; reprise notée (G15) | V |

**Effets de bord sur l'existant.**
- `PageView` (Rust, TS) gagne `grid` : littéraux de test à compléter (`wasm-core.contract.test.ts:145`, `:714`) ;
  couvert par le contrat commun « `page(p)` égal sur les deux cœurs » (`:753`).
- `paintOverlay` coupé en deux : fantômes et formes en cours restent sous le cadre ; couvert par `canvas2d.test.ts`
  (ordre des appels) et les tests existants du calque.
- Glisser une sélection sur une page à magnétisme actif ne suit plus le pointeur au pixel ; sans grille ou sans
  magnétisme, `snapDelta` rend le brut : couvert par `select.test.ts` (test « sans grille, brut » neuf, anciens tests
  gardés verts).
- Alt suivi par le moteur : `keys.ts` ignore déjà Alt pour les raccourcis (`keys.ts:27`, `:40`), rien ne change pour
  eux ; couvert par `engine.test.ts` (Alt relâché par `releaseKeys`).

**Chantiers en cours.**
- **C7 texte riche** (`feat/usage-c7-texte-riche`, worktree `~/projets/roomboard-wt/usage-c7-texte-riche`, local, non
  poussé, `aa73037` : cadrage seul pour l'instant) : prévoit `commands.rs` (`FormatText`, `BadFormat` en fin
  d'énumération et de `match`), `element.rs` (`TextView`), `document.rs` (branche `text`), `roomboard-wasm/src/lib.rs`,
  `api.ts` (`FormatText` en fin d'union, types en fin de fichier), `fake-core.ts`, `wasm-core.ts`, `canvas2d.ts`
  (`paintText`, `linesOf`) et la fin de `wasm-core.contract.test.ts`. Mêmes fins d'énumération : conflits attendus,
  triviaux (garder les deux, C7 d'abord). Fusion de C9 après C7 puis rebase (`usage-cadrage.md:538-539`).
- PR ouvertes : aucune (`gh pr list` vide).

**Termes cherchés.** `grep -n "backdrop\|Backdrop\|PageView\|grid\|Grid"` sur `crates/*/src`, `apps/web/src/{core,engine,app,ui}` ;
`grep -n "drawScene\|elementIds\|SceneSource"` ; `grep -n "shift\|alt\|Alt"` sur `engine.ts`, `keys.ts` ;
`grep -n "color\|BadColor"` sur `commands.rs` ; `grep -n "hitTest\|bounds"` sur `fake-core.ts` ;
`grep -n "fn element_geom\|pub fn bounds"` sur `query.rs` ; `grep -rn "background: \"#ffffff\""` dans les tests ;
`grep -n "U31\|C9\|HU2-6\|grille"` sur `usage-cadrage.md` ; `git diff --stat origin/main...feat/usage-c7-texte-riche` ;
coffre : `chercher.js "grille magnétisme RoomBoard"`, `"actcraft grille ligne un pixel zoom"`,
`"canvas 2D ligne nette demi pixel devicePixelRatio"`.

**Modules à réutiliser ou à étendre.**

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| Écrire un champ de page en une étape | `commands.rs:675-744` (`cmd_set_backdrop`), `:740-756` | `find_page`, `transact_local`, `done`, `unchanged` | réutiliser |
| Lire une page | `document.rs:161` (`Document::page`), `element.rs:32` (`PageView`) | `PageView.grid` | étendre |
| Lire des scalaires yrs | `element.rs` (`out_f64`, `out_string`, `finite_positive`) | appelées par `grid::read` | réutiliser |
| Boîte d'accroche | `query.rs:112` (`element_geom`), `:49` (`world_bounds`) | `snap_box(ids) -> Option<Bounds>` (forme : `box_polygon(w, h)`) | étendre |
| Calcul de grille (modèle, accroche, lignes) | aucun (`grid`, `snap`, `nearest` : rien) | **nouveau module** `crates/roomboard-core/src/grid.rs` : `read(txn, page) -> Option<GridView>`, `write(txn, page, Option<&GridInput>)`, `validate(&GridInput) -> Result<(), CommandError>`, `snap_point(&GridView, width, (x, y)) -> Option<(f64, f64)>`, `snap_delta(&GridView, width, box: Bounds, (dx, dy)) -> (f64, f64)`, `lines(&GridView, width, rect: Bounds, min_step) -> Option<GridLines>` | nouveau module (DAG1) |
| Liaison d'une commande de page | `lib.rs:183-209` (`set_backdrop`, `clear_backdrop`), `:444` | même forme, `set_grid`, `clear_grid`, `set_grid_inner` | réutiliser |
| Contrôle des vues TS | `wasm-core.ts:132-148` (`toBackdropView`, `toPageView`) | `toGridView` à côté | étendre |
| Parité de la fausse liaison | `fake-core.ts:105-122` (`backdropView`, `sameBackdrop`), `:73` (`finitePositive`) | `gridView`, `sameGrid` sur le même modèle | étendre |
| Partie visible de la page | `page.ts:18` (`visiblePageRect`) | `visibleGridRect(camera, viewW, viewH): PageRect \| null` | étendre |
| Dessin de la scène | `canvas2d.ts:129` (`drawScene`), `:249` (`setView`) | appel de `paintGrid` | étendre |
| Dessin calé de la grille | aucun (`round(`, `+ 0.5`, `lineDash` : rien de calé) | **nouveau module** `engine/render/grid-paint.ts` : `paintGrid(ctx, lines: GridLines, camera, sx, sy): void` et, testée seule, `alignedSegments(lines, camera, sx, sy, dpr): DeviceLevel[]` | nouveau module |
| Touche tenue | `engine.ts:144`, `:360-400` (`shiftHeld`) | `altHeld`, `ToolContext.alt?()` | étendre |
| Déplacement aperçu puis écrit | `select.ts:80-83` (`matrixOf`), `handles.ts` (`translateMatrix`) | `translateMatrix(...snapDelta(...))` | étendre |
| Bout de forme contraint | `shape.ts` (`constrainEnd`) | appliquée au bout aimanté | réutiliser |
| Garde de compatibilité | `tests/compat_socle.rs:91` (`socle_bytes`) | assertion `grid` absente | réutiliser |
| Modèle d'aller-retour | `commands.rs:2291` (`image_and_backdrop_reload_keep_bytes`) | test frère `grid_reload_keeps_bytes` | réutiliser |

## 4. Hypothèses à revoir

**Niveau 1 (difficiles à défaire ou visibles des utilisateurs).**
- **HG1** Géométrie de `lines` (horizontales seules), `isometric` (côté `sx`, verticales et ±30°), `music` (portée tous
  les `10·sy`) et `seyes` (fines à `sy / 4`, sans marge rouge ; marge : un niveau `lines` vertical plus tard). Sera
  dans les fichiers dès la première grille enregistrée ; réversible jusqu'à la release (U3).
- **HG2** Épaisseur : 1 pixel CSS (`round(dpr)` pixels physiques), pas 1 pixel physique ; points de 2 pixels CSS ;
  Seyès fin à 50 % ; `MIN_GRID_PX` = 4. À juger à l'essai (porte visuelle de fin de lot, choix du design existant :
  cadre de sélection à 1 pixel CSS, `canvas2d.ts:178`).
- **HG3** Magnétisme sans seuil (toujours au plus proche) et actif sur une grille invisible, comme ActCraft.
- **HG4** Une page neuve n'hérite pas de la grille de la page courante (« appliquer à toutes les pages » : éditeur, vague 1).
- **HG5** `kind` inconnu refusé à l'écriture (`BadGrid`) : une ressource grille d'une version plus récente (C4) ne se
  posera pas telle quelle.
- **HG6** Point accroché pris sur la boîte géométrique (forme sans épaisseur), pas sur le cadre de sélection affiché.

**Niveau 2.**
- **HG7** Alt suivi par `keydown` / `keyup` comme Maj (pas par l'événement de pointeur) ; Maj appliquée après
  l'aimant pour les formes ; redimensionnement non aimanté.
- **HG8** Défauts des champs absents (G4) ; clés inconnues d'un niveau perdues au prochain `SetGrid`.
- **HG9** Au plus 16 niveaux ; `line` ∈ `solid`, `dashed`, `dotted` et motifs `[6, 4]`, `[1, 3]`.

## 5. Décisions d'architecture

**DAG1 — La géométrie de la grille vit dans le cœur.** Contexte : l'accroche (Rust, U31), le rendu (TS) et plus tard
l'export PDF (`krilla`, U34) et la capture ont besoin des mêmes lignes ; deux copies divergeraient (Seyès, portées).
Décision : `grid.rs` est seul à savoir quelles lignes existent ; il rend des segments et des points en unités de page
pour un rectangle et un pas minimal ; la page ne fait que les caler sur les pixels. Conséquences : un appel Wasm par
redessin de la scène (pas par point d'encre) ; l'export réutilisera `lines` ; le précédent est le `rect` du fond (DAK4).

**DAG2 — Ordre des couches.** Contexte : U6 met le fond sous la grille, U31 offre `above`, la sélection doit rester
lisible. Décision : fond de page, `backdrop`, grille de fond, éléments, fantômes et formes en cours, grille du dessus,
habillage d'édition ; le canvas d'interaction au-dessus de tout. Conséquences : une encre en cours passe au-dessus d'une
grille `above`, puis dessous une fois écrite (scène fixe, U31) ; `paintOverlay` coupé en deux.

**DAG3 — Fausse liaison réduite aux carreaux.** Contexte : la fausse liaison mire le cœur (D36), mais recopier en TS la
géométrie des six types créerait une duplication nette à tenir. Décision : parité complète du modèle et de la commande ;
accroche et lignes des seuls `squares`, écart écrit en tête et exclu du contrat commun. Conséquences : les tests du
moteur emploient des carreaux ; les cinq autres types se testent dans `grid.rs` et sur le vrai module.

## 6. Scénarios d'acceptation (tous joués par des tests automatiques)

- **S1 — Aller-retour.** Document neuf ; `SetGrid` page 1 : niveau `seyes` (30,24 × 30,24, `#7b68ee`) et niveau `dots`
  (40 × 40), `snap` vrai, `above` vrai : une étape ; enregistrer, recharger, réenregistrer avec le même `SaveMeta` :
  mêmes octets, même `page(p).grid` ; annuler : `grid` nulle ; rétablir : la grille revient (Rust et contrat TS sur le
  vrai module).
- **S2 — Fichier sans grille et fichier plus récent.** Ouvrir `socle-v1.roomboard` : `page(p).grid` nulle sur les deux
  pages, réenregistré à l'identique. Un document dont la grille a un niveau `kind: "hexagon"` et une clé inconnue :
  page lisible, niveau gardé à l'aller-retour (octets), aucune ligne et aucune accroche pour lui.
- **S3 — Déplacer avec magnétisme.** Carreaux de 40, magnétisme actif ; outil Sélection, rectangle 100 × 60 en
  (13, 17), épaisseur 4 ; glisser de (+52, +31) : l'aperçu montre le fantôme aimanté, le relâché écrit une seule
  `Transform` dont la boîte géométrique a un coin (ou son centre) sur un croisement, égale à l'aperçu ; même geste Alt
  tenu : déplacement brut ; magnétisme coupé : brut ; un tracé au stylo sur cette page garde ses points.
- **S4 — Forme aimantée.** Même grille ; outil Rectangle de (13, 17) à (118, 97) : `AddShape` reçoit (0, 0)-(120, 80) ;
  Maj tenue : carré à partir des points aimantés ; Alt tenu : (13, 17)-(118, 97).
- **S5 — Rendu net sur page infinie.** Carreaux de 40 et Seyès, faux contexte Canvas 2D ; pour zoom ∈ {0,1 ; 0,37 ; 1 ;
  2,5 ; 8}, dpr ∈ {1 ; 1,5 ; 2} et une vue descendue à y = 1 000 000 : chaque ligne horizontale ou verticale est à
  `k + 0,5` (épaisseur impaire) ou `k` (paire), épaisseur `max(1, round(dpr))` ; nombre de lignes borné par la vue ;
  au zoom 0,1 les carreaux de 40 restent, ceux de 20 et les lignes fines du Seyès sont sautés ; `above` faux : grille
  dessinée après le fond et avant le premier élément ; `above` vrai : après les fantômes, avant le cadre de sélection.

## 7. Hors périmètre

- Éditeur de grille en panneau à aperçu direct, préréglages, « appliquer à toutes les pages » (C9 vague 1).
- Grille en ressource `.rbitem` `kind: "grid"` (C4).
- Rendu du `backdrop` (partie « reste » de C2) ; export PDF et capture de la grille (U34).
- Magnétisme du redimensionnement, de la pose du texte et de l'image ; marge rouge du Seyès.
- Tout build Tauri ; toute preuve visuelle automatique (aucune dans ce projet) : essai à l'œil plus tard (Jérôme,
  2026-11-19).

## 8. Portes immédiates

Aucune.
