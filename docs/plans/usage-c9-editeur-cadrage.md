# Cadrage — usage-c9-editeur (C9, partie éditeur : panneau de grille à aperçu direct, cache des lignes)

Cadré en mode autonome le 2026-11-20 (étage 1, cadreur), sans question posée à Jérôme. Ce cadrage court **cite** U31
(`docs/plans/usage-cadrage.md:84`, rang 2, fusionné) et le cadrage du cœur (`docs/plans/usage-c9-grille-cadrage.md`,
G1 à G15, DAG1 à DAG3, fusionné par la PR 12) sans les refaire ; il ne tranche que l'éditeur (E1 à E10). Base :
`origin/main` `8247215`. Aucun graphe graphify pour RoomBoard (`~/.cache/graphes/` n'a que `claude-config`, `roomflow2`,
`roomflow2-web`) : recherche texte seule. Coffre (`~/SecondBrain`, recherche non dégradée) : aucune décision ni piège
RoomBoard sur la grille ; précédent retenu, ActCraft `02_Decisions/0081` (cache du contenu fixe recalculé après un
zoom, rang 4). Jérôme, 2026-11-19, mot pour mot : « Continue d'avancer autant que possible suivant notre objectif
établi. Nous ferons les tests plus tard sur la version à laquelle tu seras parvenu » : aucune porte visuelle ne bloque
ce chantier, les choix visuels sont listés pour l'essai (§ 4).

**Prémisses de la demande corrigées par la carte d'impact.**
1. *Épaisseur* : le modèle de la PR 12 n'a **aucun champ d'épaisseur** ; G2 et G10 la fixent au rendu (1 pixel CSS,
   `grid.rs:34-44`, `grid-paint.ts:39`). Régler l'épaisseur demande un champ de niveau neuf, facultatif (E1).
2. *Cache « recalculé seulement si la grille, la taille ou le zoom change »* : les lignes dépendent aussi de la
   **partie visible** (page de hauteur infinie, G9 : `canvas2d.ts:208-212`, `visibleGridRect`). Un défilement change
   ce rectangle. Le cache garde donc les lignes d'un rectangle élargi et ne recalcule qu'en sortant de cette marge (E3).
3. *« Recopié à chaque image »* : la scène n'est redessinée que sur changement, caméra ou calque d'édition
   (`engine.ts:286-299`) ; elle l'est bien à chaque image pendant un défilement, un zoom ou le glisser d'une sélection.
4. *L'éditeur « utilise SetGrid »* : oui pour la validation, mais un aperçu par `SetGrid` à chaque réglage écrirait
   une étape par réglage, contre U31 (« une séance = une étape »). L'aperçu passe par une lecture à part (E2, DAE1).

## 1. Demande et gabarit

**Demande.** Régler la grille de la page montrée dans un panneau du lot 5b (type parmi les six, pas, couleur,
épaisseur, magnétisme), avec un aperçu direct sur la page, une validation qui fait une seule étape annulable, un
aller-retour `.roomboard` qui garde la grille, et des lignes de grille gardées en cache (reste d'OD48) ; ligne C9 de
`usage-cadrage.md:554`, vague 1 (`:569`).

**Gabarit.** `courte` : budget 10 questions, 10 consommées (E1 à E10).

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| E1 | Épaisseur dans le modèle | Champ facultatif de niveau **`lineWidth`** : épaisseur en **pixels CSS d'écran** (la grille reste nette à tout zoom, G10), nombre fini, `1 ≤ lineWidth ≤ 8` à l'écriture (sinon `BadGrid`, sans transaction) ; absent ou hors bornes à la lecture : 1 (fichiers de la PR 12 lus tels quels). Toujours écrit par `SetGrid`. `GridLevelView`, `GridLevel` (TS), `LevelLines` gagnent `lineWidth`. Liaison : `nums` passe de 6 à **7 nombres par niveau** (`sx, sy, ox, oy, snap, visible, lineWidth`). Rendu : trait `max(1, round(lineWidth·dpr))` pixels physiques, point `max(2, round(2·lineWidth·dpr))` (à 1 : identique à G10). `schema` et `formatVersion` inchangés. | étude `docs/etudes/usage-grille-tableau.md:96` (§ 4.4 : « couleur, épaisseur, style de ligne ») ; U3 (`usage-cadrage.md:56`, champ facultatif) ; G2, G10 ; brief | oui (HE1) |
| E2 | Aperçu direct | Le document **n'est pas écrit** pendant la séance : le panneau tient un brouillon `GridView` ; le moteur le passe au rendu (`engine.previewGrid(grid)`), qui demande au cœur les lignes de ce brouillon (`gridLinesOf`, même `grid::lines` que la grille enregistrée, DAG1). « Appliquer » écrit **un** `SetGrid` (une étape ; même grille : aucune étape, G5) ; « Annuler » ne fait rien au document. Le magnétisme ne suit pas le brouillon (le panneau a la main pendant la séance). | U31 (« réécrit en bloc à la validation de l'éditeur (une séance = une étape) ») ; G5 ; DAG1 ; étude § 4.4 (« aperçu en direct […] une séance = une étape ») | oui (DAE1) |
| E3 | Cache des lignes | Nouveau module `engine/render/grid-cache.ts`, tenu par `Canvas2DRenderer` (WebGL2 lui délègue la scène, `webgl2.ts:295`). Le cache garde le résultat du cœur pour un **rectangle élargi** autour de la vue ; il recalcule seulement si : la page change, le zoom change (égalité stricte), `resize` est appelé, la vue sort du rectangle gardé, `invalidate(change)` reçoit `full` ou un `change.pages` contenant la page, ou l'aperçu change. Avant de peindre, les lignes sont **filtrées à la vue** (`visibleLines`) : `paintGrid` reçoit exactement ce qu'il reçoit aujourd'hui, les tests S5 du cœur restent verts sans retouche. Marge : la plus grande, au plus une demi-hauteur de vue, qui garde `(cw/MIN_DOT_PX + 1)·(ch/MIN_DOT_PX + 1) ≤ MAX_GRID_DOTS` (cw, ch en pixels CSS, cw borné à la largeur de page × zoom) : aucun niveau de points n'est sauté à cause de la marge ; 0 si la vue seule dépasse. Prouvé par un compte des appels (S4). | brief (reste d'OD48) ; état `usage-c9-grille-etat.md:64` (« `grid_lines` sérialisé en tableaux JS à chaque image […] mémoïsation plus tard ») ; G9 (plafond, page infinie) ; patron `canvas2d.ts:145-147`, `:306` (caches `paths`, `textLines` vidés par `Change`) ; coffre `0081` (recalcul après zoom) | oui (HE6) |
| E4 | Ce que le panneau règle | Le **premier niveau** de la grille, seul : type, pas, couleur, épaisseur ; et le magnétisme de tête (`grid.snap`). Les niveaux suivants, `visible`, `above` et les champs non montrés (`originX`, `originY`, `line`, `snap` et `visible` du niveau) sont recopiés tels quels du document. Type « Aucune » : « Appliquer » écrit `SetGrid{ grid: null }` (retire toute la grille). Premier niveau d'un `kind` inconnu (ressource plus récente) : le choix montre « Autre (non pris en charge) », désactivé ; le niveau est gardé tant qu'on ne choisit pas un type. | brief (cinq réglages) ; U31 (`kind` inconnu gardé) ; G2, G4 ; étude § 4.4 (« Retirer la grille ») | oui (HE2) |
| E5 | Pas et préréglages | Un seul champ « Pas » (unités de page), écrit dans `spacingX` **et** `spacingY` ; non touché, les deux valeurs du document restent. Saisie `step="any"`, bornée à `[4, 400]` à la validation du champ. Choisir un type pose son pas par défaut : `squares`, `lines`, `dots`, `isometric` 40 ; `seyes` 30,24 (8 mm à 3,78 unités par mm) ; `music` 20 ; couleur, épaisseur et magnétisme gardés. | étude `:78` (« espacement par défaut 40 ») ; G3 et HU2-6 (`usage-cadrage.md:311`, Seyès à 30,24) ; étude § 4.4 (préréglages par type) | oui (HE3) |
| E6 | Grille neuve depuis le panneau | Page sans grille : brouillon « Aucune » ; le premier type choisi crée `{ visible: true, snap: false, above: false, levels: [niveau] }`, niveau `originX = originY = 0`, `color` `#94a3b8`, `line` `solid`, `lineWidth` 1, `snap` et `visible` vrais. Couleur du design existant (gris ardoise des séparateurs, `rb.css:17`), plus douce que le noir par défaut du cœur. | design existant (`rb.css:17`, `#94a3b8`) ; G4 (défauts des niveaux) ; skill `impeccable` (contraste discret d'un repère) | oui (HE4) |
| E7 | Ouvrir le panneau | Action **`grid`** « Grille » : `ACTION_TABLE` (`toolbar.ts:97`), `ACTIONS` (`toolbar-host.ts:22`, `t.toggle("grid")`), `HostTargets.toggle` élargi à `"grid"` (`:17`), `Panel` élargi (`App.tsx:46`) ; bouton ajouté au groupe `vue` de `defaultToolbars()` (`toolbar-profiles.ts:60`, profils `defaut` et `annotation`) avant « Profil » ; pas dans `simple`. Un profil enregistré par l'utilisateur ne l'a pas : il l'ajoute par l'éditeur de profils (C1), qui liste `ACTION_TABLE`. Même `rb-popover` que les réglages (`App.tsx:183-195`). | panneau du lot 5b (`App.tsx:46-53`, `:112`, `:183-245`) ; C1 (`ProfileEditor`, liste des actions) ; brief (« dans le panneau du lot 5b ») | oui (HE5) |
| E8 | Vie de la séance | Ouverture : brouillon lu de `doc.page(state.page).grid`. « Appliquer » : fin de l'aperçu, `engine.run(SetGrid)`, panneau fermé ; refus du cœur : message dans `#etat` (`App.tsx:174`), panneau ouvert. « Annuler », second clic sur « Grille », autre panneau ouvert : brouillon perdu, rien d'écrit. Page montrée, onglet ou `version` du document qui change pendant la séance (annuler, rétablir, autre écriture) : panneau fermé, brouillon perdu. La fin de l'aperçu est appelée au démontage du panneau (`onCleanup`), quel que soit le chemin ; `switchTo` du moteur la coupe aussi. Après « Appliquer », l'annulation existante (bouton « Annuler », Ctrl+Z) remet l'ancienne grille en une étape. | U31 ; G5 (`commands.rs:2785`, une étape, annuler, rétablir) ; patron `ProfileEditor` (`App.tsx:232-245` : enregistrer ferme, fermer abandonne) | oui (HE7) |
| E9 | Commandes du panneau | Composant SolidJS `ui/GridPanel.tsx`, styles `.rb-editor` et `.rb-editor-actions` (`rb.css:57-66`) : `select[data-grille="kind"]` (Aucune, Carreaux, Lignes, Points, Isométrique, Portée, Seyès), `input[type="number"][data-grille="spacing"]`, `input[type="color"][data-grille="color"]`, `select[data-grille="lineWidth"]` (1, 2, 3, 4 px), `input[type="checkbox"][data-grille="snap"]` « Magnétisme », boutons `data-grille="apply"` « Appliquer » et `data-grille="cancel"` « Annuler » ; panneau `<div id="grille" role="group" aria-label="Grille de la page">`. Chaque saisie met l'aperçu à jour (`onInput`). Champs autres que le type désactivés sur « Aucune ». Logique du brouillon hors du composant, en fonctions pures (E10 du tableau des modules). Choix visuels listés pour la porte visuelle (HE4). | design existant (`ProfileEditor.tsx:100-304`, mêmes contrôles, `data-edit`) ; D21 (SolidJS dans `ui/`) ; skill `impeccable` | oui |
| E10 | Preuves | Nouveau `scripts/essais/c9-grille-navigateur.mjs` sur le modèle de `c2-image-navigateur.mjs` (dist servi en local, repli `?fichiers=repli`, heure figée, aucune requête hors de `127.0.0.1`), ajouté au bloc `--e2e` de `scripts/verifier.sh:90-99` et à la liste de `scripts/tests/verifier-e2e.test.sh:13` ; `--captures` écrit `docs/essais/c9-editeur-grille.png` (panneau ouvert, aperçu Seyès), jamais lancé avec `--captures` par `verifier.sh`. Mesure de l'aperçu : pixels **différents du fond de page** dans une zone vide de la scène (la couleur par défaut `#94a3b8` échappe au seuil d'`inkIn`, `commun.mjs:71`). Aucun build Tauri. Aucune dépendance ajoutée (aucune GPL, AGPL, LGPL). | brief (geste, `verifier.sh --e2e`, capture, pas de build Tauri) ; profil (« Preuve visuelle : aucune automatique ») ; `scripts/verifier.sh:91` | oui |

Aucun constat d'architecture à fermer n'est porté par la demande ; les zones touchées en ont deux d'ouverts, non
aggravés : `fake-core.ts:73` (`finitePositive`, aucune troisième copie) et `api.ts:145` (`PAGE_WIDTH`, la fausse
liaison s'en sert déjà pour la grille, `fake-core.ts:653`, aucun nouvel usage). La ligne `toolbar-host.ts:45`
(préréglages) est fermée par C10a, pas ici.

## 3. Carte d'impact

Rubriques déduites (le profil n'a pas de ligne « Surfaces d'impact ») : cœur, liaison, page, rendu et moteur,
interface, essais, tests, autres dépôts. Chemins de `main` (`8247215`). Gabarit `courte` : endroits touchés seulement.

### Cœur Rust (`crates/roomboard-core`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/grid.rs:34-44` (`GridLevelView`), `:60-66` (`LevelLines`) | oui | champ `line_width` (`lineWidth` en JSON) ; `LevelLines.line_width` recopié du niveau (E1) | V |
| `src/grid.rs:113-131` (`read_level`), `:149-160` (`level_fields`), `:163-178` (`validate`) | oui | lecture tolérante (défaut 1), écriture, bornes `[1, 8]` (E1) | V |
| `src/grid.rs:446-505` (`level_lines`, poussées `:490`, `:499`) | oui | `line_width` dans chaque groupe (Seyès : les deux) | V |
| `src/document.rs:487-492` (`page_grid`), `:512-521` (`grid_lines`) | oui | `grid_lines_of(page, &GridView, rect, min_step, min_dot_step)` lit la largeur de la page, appelle `grid::lines` ; `grid_lines` passe par elle (E2) | V |
| `src/commands.rs:2826` (`set_grid_rejects_bad_input…`), `:2899` (`grid_reload_keeps_bytes`) et littéraux de niveau des tests | oui | `lineWidth` hors bornes refusé ; aller-retour octets avec `lineWidth` 2 ; fichier sans `lineWidth` lu à 1 | V |

### Liaison Wasm (`crates/roomboard-wasm/src/lib.rs`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `:239-275` (`grid_input`) | oui | 7 nombres par niveau (E1) ; réutilisée par `grid_lines_of` | V |
| `:391-404` (`set_grid`), `:423-440` (`grid_lines`) | oui | `grid_lines_of(page, visible, snap, above, kinds, colors, lines, nums, view: &[f64])`, `view` = `x0, y0, x1, y1, min_step, min_dot_step` (longueur ≠ 6 : erreur `BadGrid`) | V |
| `:705` (`set_grid_inner`), `:1457` (test natif) | oui | 7 nombres ; test natif « `grid_lines_of` = `grid_lines` après `SetGrid` de la même grille » | V |

### Page (`apps/web/src/core`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `api.ts:10` (en-tête), `:159` (`CoreDocument.gridLines`), `:206-219` (`GridLevel`), `:224` (`LevelLines`) | oui | `lineWidth` ; méthode `gridLinesOf` en fin d'interface ; ligne « C9 éditeur » en tête | V |
| `wasm-core.ts:213` (`toGridView`), `:244` (`toGridLines`), `:306-316` (`SetGrid`), `:367-368` | oui | `lineWidth` lu ; encodage extrait en `gridArgs(g)` partagé par `SetGrid` et `gridLinesOf` | V |
| `fake-core.ts:13-17` (en-tête), `:809` (`gridLevelView`), `:845` (`sameGrid`), `:873` (champs écrits), `:930` (`squaresLines`), `:650-653` | oui | `lineWidth` (lecture, comparaison, sauvegarde) ; `gridLinesOf` = `squaresLines` sur le brouillon (DAG3 inchangé) | V |

### Rendu et moteur (`apps/web/src/engine`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `render/grid-cache.ts` (nouveau) | oui | cache, rectangle élargi, filtre à la vue (E3) | S |
| `render/canvas2d.ts:170-182` (`resize`), `:185-205` (`drawScene`), `:208-212` (`gridOf`), `:306-316` (`invalidate`) | oui | `gridOf` passe par le cache ; `resize` et `invalidate` le vident ; `setGridPreview` | V |
| `render/renderer.ts:36` (`SceneSource`), `:38-51` (`Renderer`) | oui | `gridLinesOf` facultatif dans la source ; `setGridPreview(p: GridPreview \| null): void` obligatoire | V |
| `render/webgl2.ts:270`, `:295-300` | oui | délègue `setGridPreview` à la scène | V |
| `render/grid-paint.ts:39-40` (`lineWidthPx`, `dotSizePx`), `:55-102` (`alignedSegments`) | oui | épaisseur et point par niveau depuis `lineWidth` (E1) | V |
| `engine.ts:62-102` (`Engine`), `:191-206` (`switchTo`) | oui | `previewGrid(grid)`, `endGridPreview()` ; `switchTo` coupe l'aperçu | V |

### Interface (`apps/web/src`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `ui/GridPanel.tsx` (nouveau), `grid-edit.ts` (nouveau, à côté de `profile-edit.ts`) | oui | panneau (E9) ; brouillon en fonctions pures (E4-E6) | S |
| `ui/App.tsx:46` (`Panel`), `:112` (`toggle`), `:183-245` (panneaux) | oui | `"grid"`, bloc `<Show when={panel() === "grid"}>`, fermeture sur page, onglet ou version (E8) | V |
| `app/toolbar-host.ts:17`, `:22-38` | oui | `toggle("grid")`, action `grid` | V |
| `toolbar.ts:97-113` (`ACTION_TABLE`) | oui | `grid: { label: "Grille" }` | V |
| `toolbar-profiles.ts:60` (groupe `vue` de `defaultToolbars`) | oui | `action("grid", "Grille")` avant « Profil » | V |
| `ui/rb.css:57-66` | non (réutilisé) | `.rb-editor` suffit ; une règle seulement si la porte visuelle le demande | V |

### Essais et scripts

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/essais/c9-grille-navigateur.mjs` (nouveau) | oui | S1, capture (E10) | S |
| `scripts/verifier.sh:90-99` (bloc `--e2e`) | oui | une ligne | V |
| `scripts/tests/verifier-e2e.test.sh:13` | oui | `c9-grille-navigateur` dans la liste | V |
| `docs/essais/c9-editeur-grille.png` (nouveau) | oui | capture de l'éditeur ouvert | S |

### Tests

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core/src/grid.rs` (module de tests, `level` `:555`, `read_grid_is_always_accepted_back_by_validate` `:1174`) | oui | `lineWidth` : défaut, bornes, lecture tolérante, `LevelLines` | V |
| `apps/web/src/core/wasm-core.contract.test.ts:1114-1190` (bloc SetGrid) | oui | `lineWidth` dans les littéraux ; `gridLinesOf` sur le vrai module (S3) | V |
| `apps/web/src/core/fake-core.test.ts` | oui | `lineWidth`, `gridLinesOf` carreaux | S |
| `apps/web/src/engine/render/canvas2d.test.ts:399-470` (bloc grille) | oui | littéraux `gridLevel` avec `lineWidth` ; bloc « cache » neuf (S4) ; tests S5 gardés verts | V |
| `apps/web/src/engine/render/grid-paint.test.ts`, `grid-cache.test.ts` (nouveau) | oui | épaisseur 2 et 3 ; marge et filtre | V/S |
| `apps/web/src/engine/engine.test.ts:42` (`FakeRenderer`) | oui | `setGridPreview` ; aperçu coupé par `switchTo` | V |
| `apps/web/src/ui/GridPanel.test.tsx`, `grid-edit.test.ts` (nouveaux), `ui/App.test.tsx:200` | oui | S2 ; liste exacte des actions du profil `defaut` (attendu changé, rien de sauté) | V/S |
| `apps/web/src/toolbar.test.ts:168`, `toolbar-profiles.test.ts:38`, `app/toolbar-host.test.ts:70` | oui | listes exactes des actions : `grid` ajouté | V |

### Autres dépôts

Aucun (ActCraft n'est ni lu ni repris ici : la géométrie reprise l'a été par la PR 12, G15).

**Effets de bord sur l'existant.**
- Fichiers de la PR 12 (niveaux sans `lineWidth`) : lus à 1, rendu identique ; couvert par un test neuf du cœur
  (`grid.rs`, niveau sans `lineWidth`) et par `grid_reload_keeps_bytes` étendu ; `socle_fixture_resaves_identically`
  (`tests/compat_socle.rs`) et l'empreinte de `crates/roomboard-formats/tests/container.rs:406` gardés verts.
- `set_grid` prend 7 nombres par niveau au lieu de 6 : `wasm-core.ts` et `lib.rs` changent ensemble ; couvert par le
  contrat commun (`wasm-core.contract.test.ts`, bloc SetGrid) et le test natif `:1457`.
- Le rendu ne recalcule plus la grille à chaque redessin : risque de grille périmée après un `SetGrid`, un annuler ou un
  changement de page ; couvert par S4 (compte des appels et lignes justes après `invalidate`, page changée, zoom).
- `Renderer` gagne `setGridPreview` : chaque faux rendu des tests le reçoit (le compilateur les liste) ; couvert par
  `engine.test.ts`.
- La barre du profil `defaut` gagne un bouton : la scène doit garder 640 px de haut à 1280 × 900 ; couvert par
  `s5b-navigateur.mjs` (`noOverlap`, `stageBox`) et `c1-profils-navigateur.mjs`, rejoués par `verifier.sh --e2e`.
- Un profil `defaut` enregistré avant ce chantier (copie modifiée) n'a pas le bouton : comportement de C1, couvert par
  `profile-store.test.ts` gardé vert.

**Chantiers en cours.**
- **C10a tableau** (`feat/usage-c10a-tableau`, worktree `~/projets/roomboard-wt/usage-c10a-tableau`, local, `7b2280c`,
  cadrage commité, plan non commité ; `git diff --stat origin/main...feat/usage-c10a-tableau` : deux documents
  seulement). Son cadrage prévoit les mêmes fichiers : `crates/roomboard-wasm/src/lib.rs` (patron `set_grid` `:391-410`,
  `:705`), `api.ts`, `wasm-core.ts`, `fake-core.ts`, `engine.ts` (`Engine`, `run`, `history`), `render/canvas2d.ts`
  (`paintElement`, `invalidate` `:312-328`), `app/toolbar-host.ts` (`ACTIONS`, `:45`), `toolbar.ts` (`ACTION_TABLE`
  `:97-113`), `toolbar-profiles.ts:57` (groupe `edition`, nous : `vue` `:60`), `ui/rb.css`, `scripts/verifier.sh`
  (bloc `--e2e`), `scripts/tests/verifier-e2e.test.sh:13`, `wasm-core.contract.test.ts`, `fake-core.test.ts`,
  `toolbar.test.ts:167`. Conflits attendus aux fins d'énumération et de listes : triviaux (garder les deux). Le second
  fusionné rebase. Rien n'y est touché d'ici.
- PR ouvertes : aucune (`gh pr list` vide).

**Termes cherchés.** `grep -rn "gridLines\|grid_lines\|SetGrid\|setGrid"` sur `apps/web/src` ;
`grep -n "grid\|Grid\|drawScene\|setView\|resize\|zoom"` sur `canvas2d.ts` ; `grep -n "invalidate"` sur
`canvas2d.ts`, `webgl2.ts`, `renderer.ts` ; `grep -n "pub fn\|pub struct\|width\|fn read\|fn write\|spacingX\|\"line\""`
sur `grid.rs` ; `grep -n "lineWidth\|épaisseur"` sur `grid.rs`, `api.ts` (aucun résultat) ;
`grep -n "fn grid_lines\|fn set_grid\|nums"` sur `roomboard-wasm/src/lib.rs` ; `grep -n "panel\|panneau"` sur
`App.tsx`, `layout.ts`, `socle-lot5b-PLAN.md` ; `grep -n "toggle\|\"settings\"\|\"profiles\""` sur `toolbar-host.ts`,
`toolbar.ts`, `toolbar-profiles.ts` ; `grep -rn "\"settings\""` sur `apps/web/src` ; `grep -rn "type=\"color\"\|<select\|<input"`
sur `ui/*.tsx` ; `grep -n "rb-popover\|rb-editor"` sur `rb.css` ; `grep -n "e2e\|playwright"` sur `verifier.sh` ;
`grep -n "export"` sur `scripts/essais/commun.mjs` ; `grep -n "file-save\|download\|data-"` sur
`c2-image-navigateur.mjs` ; `grep -n "gridLines\|202\|visibleGridRect"` sur les tests du rendu ;
`grep -n "OD48"` et `grep -n -i "cache\|lent\|chaque image"` sur `docs/` ; `grep -n "| oui"` sur le cadrage de C10a ;
`git worktree list` ; `gh pr list --state open` ; coffre : `chercher.js "éditeur de grille panneau aperçu RoomBoard"`,
`"canvas cache lignes grille zoom performance"`, `"roomboard décision"`, `"SolidJS panneau popover input color"`.

**Modules à réutiliser ou à étendre.**

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| Ouvrir, fermer un panneau | `ui/App.tsx:46-53` (`Panel`, `setPanel`), `:112` ; `app/toolbar-host.ts:17` (`HostTargets.toggle`) | `toggle(panel: "settings" \| "profiles" \| "grid")` ; `<Show when={panel() === "grid"}><div class="rb-popover"><GridPanel …/></div></Show>` | étendre |
| Bouton dans la barre | `toolbar.ts:97` (`ACTION_TABLE`), `toolbar-host.ts:22` (`ACTIONS`), `toolbar-profiles.ts:60` | `grid: { label: "Grille" }` ; `grid: (t) => t.toggle("grid")` ; `action("grid", "Grille")` | étendre |
| Styles du panneau | `ui/rb.css:57-66` (`.rb-editor`, `.rb-editor-actions`) | classes posées sur `GridPanel` | réutiliser |
| Écrire la grille, une étape | `api.ts:76` (`SetGrid`), `engine.ts:230-248` (`run`) | `engine.run({ type: "SetGrid", page, grid })` | réutiliser |
| Annuler la séance appliquée | `engine.ts:250-265` (`history`), action `undo` (`toolbar-host.ts:23`) | aucune interface neuve | réutiliser |
| Lire la grille de la page | `api.ts` (`PageView.grid`), `wasm-core.ts:213` (`toGridView`) | `board.doc.page(state.page)?.grid ?? null` | réutiliser |
| Lignes d'une grille non enregistrée | `grid.rs:513` (`grid::lines`, pure) ; `document.rs:512` (`grid_lines`) ; `lib.rs:241` (`grid_input`) | Rust `Document::grid_lines_of(&self, page: &str, grid: &GridView, rect: Bounds, min_step: f64, min_dot_step: f64) -> Option<GridLines>` (`grid_lines` l'appelle) ; Wasm `grid_lines_of(page, visible, snap, above, kinds, colors, lines, nums, view: &[f64]) -> JsValue` ; TS `gridLinesOf(page: string, grid: GridView, rect: Bounds, minStep: number, minDotStep: number): GridLines \| null` | étendre |
| Encodage TS d'une grille vers Wasm | `wasm-core.ts:306-316` (bras `SetGrid`) | extraction `gridArgs(g: GridView): [boolean, boolean, boolean, string[], string[], string[], Float64Array]`, appelée par `SetGrid` et `gridLinesOf` (aucune seconde copie) | étendre |
| Parité de la fausse liaison | `fake-core.ts:930` (`squaresLines`), `:809`, `:845`, `:873` | `gridLinesOf` = `squaresLines(grid, PAGE_WIDTH, rect, minStep)` ; `lineWidth` lu, comparé, sauvegardé | réutiliser |
| Épaisseur | `grid.rs:113`, `:149`, `:163` ; `grid-paint.ts:39-40` | `lineWidthPx(dpr, lineWidth = 1)`, `dotSizePx(dpr, lineWidth = 1)` ; `DeviceLevel.width` par niveau | étendre |
| Cache vidé par `Change` | `canvas2d.ts:145-147`, `:306` (`paths`, `textLines`, `invalidate`) | même patron, appelé depuis `invalidate` | réutiliser |
| Cache des lignes de grille | aucun (`cache\|memo` sur `engine/render` : seulement `paths`, `textLines`, `image-cache.ts` pour les bitmaps) | **nouveau module** `engine/render/grid-cache.ts` : `export class GridLinesCache { constructor(compute: (page: string, rect: Bounds, minStep: number, minDotStep: number) => GridLines \| null); get(page: string, visible: Bounds, zoom: number, pageWidth: number): GridLines \| null; clear(): void; invalidate(change: Change): void }` ; `export function cacheRect(visible: Bounds, zoom: number, pageWidth: number): Bounds` ; `export function visibleLines(lines: GridLines, visible: Bounds): GridLines` | nouveau module |
| Partie visible de la page | `page.ts:29` (`visibleGridRect`) | appelée par `gridOf`, inchangée | réutiliser |
| Aperçu au rendu | `renderer.ts:38-51` (`Renderer`), `webgl2.ts:295` | `export interface GridPreview { readonly page: string; readonly grid: GridView \| null }` ; `setGridPreview(p: GridPreview \| null): void` ; moteur : `previewGrid(grid: GridView \| null): void`, `endGridPreview(): void` | étendre |
| Brouillon de la séance | patron `profile-edit.ts` (fonctions pures testées seules, utilisées par `ProfileEditor`) ; rien pour la grille (`draft\|brouillon` : rien) | **nouveau module** `apps/web/src/grid-edit.ts` : `type GridChoice = GridKind \| "none" \| "other"` ; `export interface GridDraft { readonly base: GridView \| null; readonly kind: GridChoice; readonly spacing: number; readonly color: string; readonly lineWidth: number; readonly snap: boolean }` ; `draftOf(g: GridView \| null): GridDraft` ; `withKind(d, k: GridKind \| "none"): GridDraft` ; `withSpacing(d, v: number): GridDraft` ; `withColor(d, c: string)` ; `withLineWidth(d, w: number)` ; `withSnap(d, on: boolean)` ; `toGrid(d): GridView \| null` ; `GRID_DEFAULT_SPACING: Readonly<Record<GridKind, number>>` ; `GRID_KIND_LABELS` | nouveau module |
| Panneau | patron `ui/SettingsPanel.tsx`, `ui/ProfileEditor.tsx` | **nouveau composant** `ui/GridPanel.tsx` : `export interface GridPanelProps { readonly initial: GridView \| null; preview(grid: GridView \| null): void; endPreview(): void; apply(grid: GridView \| null): void; cancel(): void }` ; `export function GridPanel(props: GridPanelProps): JSX.Element` | nouveau module |
| Geste e2e | `scripts/essais/commun.mjs` (`serve`, `loadPlaywright`, `item`, `frames`, `stageBox`, `TAB`, `VIEWPORT`) ; `c2-image-navigateur.mjs:125-160` (enregistrer par téléchargement, rouvrir dans un onglet) | mêmes aides ; une aide locale `paintedIn(page, box)` (pixels ≠ fond) | réutiliser |

## 4. Hypothèses à revoir

**Niveau 1 (difficiles à défaire ou visibles des utilisateurs).**
- **HE1** `lineWidth` en pixels CSS d'écran (et non en unités de page), bornes `[1, 8]`, choix 1 à 4 dans le panneau,
  points grossis avec l'épaisseur. Entre dans les fichiers dès la première grille appliquée ; réversible jusqu'à la
  release (U3).
- **HE2** Le panneau ne règle que le premier niveau : pas d'ajout, de retrait ni d'ordre des niveaux (S10 du cadrage de
  l'usage, « ajouter un niveau de points », reste à faire) ; « Aucune » retire toute la grille, niveaux suivants compris.
- **HE3** Un seul pas pour X et Y ; choisir un type remet son pas par défaut (Portée 20 et Seyès 30,24 supposés).
- **HE4** Choix visuels pour la porte de fin de lot : couleur neuve `#94a3b8`, libellés français des types, contrôles
  natifs (`select`, `input type="color"`), panneau en haut à gauche de la scène comme les réglages (il cache une partie
  de l'aperçu sur un petit écran).
- **HE8** « Appliquer à toutes les pages » reste hors de ce chantier (annoncé « éditeur, vague 1 » par HG4 du cadrage du
  cœur) : une seule étape pour plusieurs pages demande une commande neuve du cœur. Une page neuve n'hérite toujours pas
  de la grille (HG4).

**Niveau 2.**
- **HE5** Bouton « Grille » dans `defaut` et `annotation`, pas dans `simple` ; aucun raccourci clavier.
- **HE6** Marge du cache bornée par le plafond des points (au plus une demi-hauteur de vue) ; zoom comparé à
  l'égalité stricte (un pincement recalcule à chaque image, comme aujourd'hui).
- **HE7** La séance se ferme et se perd sur changement de page, d'onglet ou de version ; aucun « Appliquer » implicite à
  la fermeture ; le magnétisme ne suit pas le brouillon.
- **HE9** Pas saisi hors de `[4, 400]` ramené à la borne ; champ vide ou non numérique : valeur précédente gardée.

## 5. Décisions d'architecture

**DAE1 — Aperçu par lecture, pas par écriture.** Contexte : U31 veut une étape par séance ; écrire à chaque réglage
salirait l'historique, le marqueur « modifié » et, plus tard, la collaboration. Décision : le brouillon reste dans la
page ; le cœur calcule ses lignes par la même fonction pure que la grille enregistrée (`grid_lines_of`), le rendu les
peint à la place de celles de la page tant que l'aperçu est posé. Conséquences : une méthode de plus dans la liaison et
dans `Renderer` ; aucune écriture avant « Appliquer » ; le magnétisme reste celui du document pendant la séance.

## 6. Scénarios d'acceptation

- **S1 — Geste au navigateur (Playwright, `c9-grille-navigateur.mjs`).** Ouvrir l'application (repli, heure figée) ;
  cliquer « Grille » : `#grille` visible, type « Aucune » ; zone vide de la scène sans pixel peint. Choisir
  « Carreaux » : des pixels apparaissent dans la zone **avant** « Appliquer », `data-version` de `#stage` inchangé.
  Pas 80, épaisseur 3 : le nombre de pixels peints change. « Annuler » : la zone redevient vide, version inchangée.
  Rouvrir, Carreaux, pas 80, épaisseur 3, magnétisme coché, « Appliquer » : panneau fermé, grille visible, version +1.
  Bouton « Annuler » de la barre : grille partie ; « Rétablir » : revenue. Enregistrer (téléchargement), rouvrir le
  fichier dans un nouvel onglet : grille visible ; « Grille » : Carreaux, 80, 3 px, magnétisme coché. Capture
  `docs/essais/c9-editeur-grille.png` avec `--captures` (Seyès en aperçu, panneau ouvert).
- **S2 — Panneau et brouillon (Vitest, `GridPanel.test.tsx`, `grid-edit.test.ts`).** Page sans grille : choisir
  « Seyès » appelle `preview` avec un niveau `seyes` de pas 30,24, `#94a3b8`, `lineWidth` 1 ; régler pas, couleur,
  épaisseur, magnétisme : un `preview` par saisie, `apply` jamais appelé ; « Appliquer » : `apply` une fois avec la
  grille finale ; « Annuler » : `apply` jamais, `cancel` une fois ; démontage : `endPreview` appelé. Grille à deux
  niveaux (dont un `hexagon` en second) : le second niveau, `above` et `originX` ressortent à l'identique ; premier
  niveau `hexagon` : choix « Autre » montré, niveau gardé. « Aucune » puis « Appliquer » : `apply(null)`.
- **S3 — Épaisseur et aller-retour (`cargo test --workspace`, contrat TS sur le vrai module).** `SetGrid` d'un niveau
  `squares` 40 `lineWidth` 2 : une étape ; enregistrer, recharger, réenregistrer : mêmes octets, même `page().grid`
  (`lineWidth` 2) ; `lineWidth` 0, 9 ou NaN : `BadGrid` sans transaction ; niveau écrit par `yrs` sans `lineWidth` :
  lu à 1 ; `socle-v1.roomboard` réenregistré à l'identique. `gridLinesOf(page, g, …)` rend exactement
  `gridLines(page, …)` après `SetGrid(g)`, sur le vrai module et sur la fausse liaison (carreaux). Rendu : épaisseur 3
  à dpr 2 = 6 pixels physiques, lignes calées sur `round(X)`.
- **S4 — Cache prouvé par le compte des appels (Vitest, `canvas2d.test.ts`, `grid-cache.test.ts`).** Source dont
  `gridLines` est un espion, carreaux de 40, vue 800 × 600 : dix `drawScene` de même caméra → 1 appel ; défilement de
  50 px CSS → toujours 1 appel, et les segments peints sont ceux d'un rendu sans cache ; défilement au-delà de la marge →
  2 ; zoom changé → 3 ; `invalidate({ pages: [autre page] })` → aucun appel neuf ; `invalidate({ pages: [page] })` ou
  `full` → un appel neuf ; `resize` → un appel neuf ; `setGridPreview` → `gridLinesOf` appelé, `gridLines` non.
  `cacheRect` : pour toute vue jusqu'à 3840 × 2160 et tout zoom testé, `(cw/8 + 1)·(ch/8 + 1) ≤ 65 536` ; les tests S5
  du cœur (calage, 202 et 152) restent verts sans retouche.
- **S5 — Vérification d'ensemble.** `scripts/verifier.sh --e2e` vert (fmt, clippy `-D warnings`, cargo test, Wasm et son
  budget de poids, tests de l'interface, build web, sept essais existants et le neuf) ; aucun build Tauri ; aucune
  dépendance ajoutée (`scripts/controle-licences.mjs` vert).

## 7. Hors périmètre

- Grille en ressource `.rbitem` `kind: "grid"`, enregistrer et déposer une grille (C4).
- Édition de plusieurs niveaux (ajout, retrait, ordre), style de ligne, origine (glisser la grille), `visible`,
  `above`, pas X distinct du pas Y, marge rouge du Seyès, échelle en millimètres.
- « Appliquer à toutes les pages » et grille héritée par une page neuve (HE8).
- Magnétisme pendant l'aperçu ; magnétisme du redimensionnement, du texte et de l'image (inchangé depuis la PR 12).
- Export PDF et capture de la grille (U34).
- Tout fichier du chantier C10a ; tout build Tauri.

## 8. Portes immédiates

Aucune.
