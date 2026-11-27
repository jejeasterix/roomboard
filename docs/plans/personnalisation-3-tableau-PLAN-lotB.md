# personnalisation-3-tableau — plan du lot B (régler le tableau finement)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**But** : tirer une bordure (point 6), en-tête d'un geste (10), double appui pour ajuster (7), alignement dans la case
(8), bordures par case (9), déplacer une ligne ou une colonne (11), et le refus d'« Ombrer » une case qui porte un objet
(D35, reste du lot A).

**Architecture** : la page calcule (tailles, largeur naturelle, ordre, décalage d'alignement), le cœur écrit (DA2, DA4).
Points 6, 7 et 10 : **aucun code Rust** — `SetTableLineSizes` et `SetTableOptions.header` existent depuis le lot A.
Points 8 et 9 : une seule commande neuve, `SetTableLook` (TB4 la crée avec `ha`/`va`, TB5 lui ajoute `border`).
Point 11 : `ReorderTableLines`. Module Wasm : +2 exports en tout.

**Pile** : Rust (`yrs`) + `wasm-bindgen`, TypeScript (vitest), Playwright (essai navigateur).

**Spec** : `docs/plans/personnalisation-3-tableau-cadrage.md` (points 6 à 11, S6 à S11, D13 à D18, D35).

**Ce que `main` fait déjà** (lu sur le code) : point 6, **non** sur `main` — seul « Uniformiser » (`SetTableSizes`)
existe ; la commande d'écriture `SetTableLineSizes` vient du lot A (branche), il ne manque que le geste. Point 10 : le champ
`header` est écrit et relu depuis le lot A (`SetTableOptions`, `TableView.header`), sans dessin ni bouton.

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| TB1 | Point 6 : tirer une bordure (poignées 44 px, bord à ± 6 px, Alt+Maj+flèches), Uniformiser par `requiredSizes` | lot A clos | apps/web/src/engine/{table-geom.ts,table-geom.test.ts,engine.ts}, apps/web/src/engine/tools/{table.ts,table.test.ts,cell-drop.ts}, apps/web/src/engine/render/{overlay.ts,canvas2d.ts}, apps/web/src/engine/input/{keys.ts,keys.test.ts}, apps/web/src/ui/{shortcuts.ts,shortcuts.test.ts}, scripts/essais/personnalisation-3-tableau-navigateur.mjs, docs/design/captures/personnalisation-3-tableau/bordure-tiree.png | partagé | implementeur-tdd | vitest `table.test.ts -t "TB1"` : 6 passés dont `S6 : poignée droite tirée de 100` ; `table-geom.test.ts -t "TB1"` : 3 ; `keys.test.ts -t "tableKey"` ≥ 1 ; `cell-drop.test.ts` vert ; essai `ok — S6 : la colonne s'élargit de 100` | S6 | #tache-tb1 |
| TB2 | Point 10 : en-tête (dessin, bouton « En-tête », Alt+E, menu de case) + refus d'Ombrer une case à objet (D35) | TB1 | apps/web/src/engine/{table-geom.ts,engine.ts}, apps/web/src/engine/render/{table-paint.ts,table-paint.test.ts}, apps/web/src/engine/tools/{table.ts,table.test.ts}, apps/web/src/engine/input/{keys.ts,keys.test.ts}, apps/web/src/ui/{cell-menu.ts,cell-menu.test.ts,icons.ts,icons.test.ts,item-state.ts,shortcuts.ts,shortcuts.test.ts}, apps/web/src/toolbar.ts, apps/web/src/app/{toolbar-host.ts,board-session.ts,stage-tags.ts}, THIRD_PARTY_NOTICES.md, scripts/essais/{cli-essai.mjs,personnalisation-3-tableau-navigateur.mjs}, docs/design/captures/personnalisation-3-tableau/en-tete.png | partagé | implementeur-tdd | vitest `table-paint.test.ts -t "S10"` : 2 ; `table.test.ts -t "TB2"` : 3 dont `D35 : Ombrer refusé sur une case à objet` ; `icons.test.ts` vert ; `cli-essai.mjs` : `T-B2` puis `CLI : OK` ; essai `ok — S10 : en-tête posé` | S10, S18 | #tache-tb2 |
| TB3 | Point 7 : double appui sur une poignée ou une bordure, Alt+A : ajuster au contenu | TB1 | apps/web/src/engine/{table-geom.ts,table-geom.test.ts,engine.ts}, apps/web/src/engine/tools/{table.ts,table.test.ts}, apps/web/src/engine/input/{keys.ts,keys.test.ts}, apps/web/src/ui/{shortcuts.ts,shortcuts.test.ts}, scripts/essais/personnalisation-3-tableau-navigateur.mjs, docs/design/captures/personnalisation-3-tableau/ajuste-contenu.png | partagé | implementeur-tdd | vitest `table-geom.test.ts -t "naturalWidth"` : 2 ; `table.test.ts -t "S7"` : 3 ; essai `ok — S7 : la colonne prend la largeur du mot` | S7 | #tache-tb3 |
| TB4 | Point 8 : alignement (`ha`, `va`, `SetTableLook`), un seul décalage `cellTextFrame` lu par le dessin, le pot et la saisie | TB2 | crates/roomboard-core/src/{table.rs,table_look.rs,commands.rs,lib.rs}, crates/roomboard-wasm/src/lib.rs, apps/web/src/core/{api.ts,wasm-core.ts,fake-core.ts,wasm-core.contract.test.ts}, apps/cli/src/{ops.ts,ops.test.ts}, scripts/essais/{cli-essai.mjs,personnalisation-3-tableau-navigateur.mjs}, apps/web/src/engine/{table-geom.ts,table-geom.test.ts,text-layout.ts,text-layout.test.ts,fill-target.ts,fill-target.test.ts,engine.ts}, apps/web/src/engine/render/{table-paint.ts,table-paint.test.ts,canvas2d.ts}, apps/web/src/engine/tools/{text.ts,table.ts,table.test.ts}, apps/web/src/engine/input/{keys.ts,keys.test.ts}, apps/web/src/app/{text-editor.ts,stage-tags.ts}, apps/web/src/ui/{cell-menu.ts,cell-menu.test.ts,icons.ts,icons.test.ts,shortcuts.ts,shortcuts.test.ts,rb.css}, THIRD_PARTY_NOTICES.md, docs/design/captures/personnalisation-3-tableau/texte-centre.png | partagé | concepteur-critique | `cargo test -p roomboard-core table_look` : 4 passés dont `set_table_look_writes_and_clears` ; contrat `-t "SetTableLook"` : 4 (2 × 2 fabriques) ; vitest `table-geom.test.ts -t "cellTextFrame"` : 3, `fill-target.test.ts -t "D15"` : 1, `table.test.ts -t "D15"` : 2 ; `ops.test.ts` vert ; essai `ok — S8 : texte centré` ; commande M ≤ 1 540 000 | S8, S17 | #tache-tb4 |
| TB5 | Point 9 : bordures par case (`border` dans `SetTableLook`, dessin par bord, menu, Alt+B, Alt+Maj+B) | TB4 | crates/roomboard-core/src/{table.rs,table_look.rs,commands.rs}, crates/roomboard-wasm/src/lib.rs, apps/web/src/core/{api.ts,wasm-core.ts,fake-core.ts,wasm-core.contract.test.ts}, scripts/essais/{cli-essai.mjs,personnalisation-3-tableau-navigateur.mjs}, apps/web/src/engine/{table-geom.ts,engine.ts}, apps/web/src/engine/render/{table-paint.ts,table-paint.test.ts}, apps/web/src/engine/tools/{table.ts,table.test.ts}, apps/web/src/engine/input/{keys.ts,keys.test.ts}, apps/web/src/app/stage-tags.ts, apps/web/src/ui/{cell-menu.ts,cell-menu.test.ts,shortcuts.ts,shortcuts.test.ts}, docs/design/captures/personnalisation-3-tableau/bordures-case.png | partagé | implementeur-tdd | `cargo test -p roomboard-core table_look::tests::border` : 3 passés dont `border_reload_keeps_bytes` ; contrat `-t "border"` : 4 ; vitest `table-paint.test.ts -t "S9"` : 3 ; essai `ok — S9 : bordure 6 en tirets` ; commande M | S9, S17 | #tache-tb5 |
| TB6 | Point 11 : déplacer une ligne ou une colonne (`ReorderTableLines`, poignées de déplacement, Ctrl+Maj+flèches) | TB5 | crates/roomboard-core/src/{table.rs,table_links.rs,commands.rs}, crates/roomboard-wasm/src/lib.rs, apps/web/src/core/{api.ts,wasm-core.ts,fake-core.ts,wasm-core.contract.test.ts}, apps/cli/src/{ops.ts,ops.test.ts}, scripts/essais/{cli-essai.mjs,personnalisation-3-tableau-navigateur.mjs}, apps/web/src/engine/{table-geom.ts,table-geom.test.ts,engine.ts}, apps/web/src/engine/render/{overlay.ts,canvas2d.ts}, apps/web/src/engine/tools/{table.ts,table.test.ts}, apps/web/src/engine/input/{keys.ts,keys.test.ts}, apps/web/src/ui/{shortcuts.ts,shortcuts.test.ts}, docs/design/captures/personnalisation-3-tableau/ligne-deplacee.png | partagé | concepteur-critique | `cargo test -p roomboard-core reorder_table_lines` : 4 passés dont `reorder_refuses_cut_merge`, `reorder_moves_linked_objects` ; contrat `-t "ReorderTableLines"` : 6 ; vitest `table.test.ts -t "S11"` : 3 ; `keys.test.ts -t "Ctrl+Maj"` ≥ 1 ; essai `ok — S11 : ordre 2, 0, 1` ; commande M ; suite complète verte | S11, S16 | #tache-tb6 |

Ordre d'exécution : TB1 → TB2 → TB3 → TB4 → TB5 → TB6 (séquentiel, un seul worktree). C'est aussi l'ordre de priorité :
on coupe par la fin (TB6, puis TB5, puis TB4…) ; une tâche coupée devient une hypothèse « à revoir » de l'état, jamais
un comportement à moitié livré. TB3 ne dépend que de TB1 (il peut passer avant TB2 si TB2 bloque).

## Choix tranchés par ce plan

1. **Réglages au doigt : menu de case (appui long), pas de section `table` du panneau d'options (DA5 reportée).**
   Raison : le panneau ne s'ouvre pas avec l'outil Tableau (`tool-options.ts:87`, `showsPanel`) ; l'ouvrir change un
   comportement partagé et touche `OptionsPanel.tsx`, que OG23 et OG14 réécrivent en parallèle ; le menu de case existe
   déjà (lot A, `ui/cell-menu.ts`), s'ouvre sous le doigt, a des boutons de 44 px et des icônes Lucide ; chaque réglage a
   aussi son raccourci. Le menu gagne des **rangées** (alignement : 2 rangées de 3 icônes ; bordure : 2 rangées de
   boutons texte) pour rester court. Le bouton « En-tête » va aussi dans la rangée de la barre (D17). `ui/TableOptions.tsx`
   reste pour le lot C (Trier, Accepte demandent un champ texte). Hypothèse HB1 ci-dessous.
2. **Conflit de H12** : Alt+Maj+B servait à « aligner en bas » et à « aucune bordure ». S9 garde Alt+Maj+B pour « aucune
   bordure » ; « aligner en bas » devient **Alt+Maj+D** (« dessous »). Ctrl+Maj+↑/↓ (déplacer la ligne) recouvre
   `orderKey` (premier plan, arrière-plan) : la touche n'est prise que par l'outil Tableau avec une case active, testée
   avant `orderKey` ; sinon elle garde son sens.
3. **Curseur `col-resize` au survol : non livré.** Le moteur ne reçoit aucun survol (aucun `pointermove` sans bouton
   vers les outils) ; la bordure se prend à ± 6 px écran à l'appui, à la souris comme au doigt, et les deux poignées de
   44 px de la case active servent au doigt. Hypothèse HB2.
4. **Couleur et épaisseur d'une bordure** : couleur = couleur du style courant de l'outil (`style().color`, celle que
   prend un tableau neuf) ; épaisseur « Fin » 2, « Épais » 6 ; style par le menu ou Alt+B (plein), Alt+Maj+B (aucune).
5. **Fond d'en-tête** : `TABLE_HEADER_FILL = "#E0E0E8"` (`--rf-gray-300`) ; `--rf-gray-50` (`#F5F5F8`) ne se distingue
   pas du blanc au vidéoprojecteur. Un remplissage de case passe au-dessus.

## Hypothèses à revoir (lot B)

- HB1 Pas de section du panneau d'options pour le tableau dans le lot B (menu de case et raccourcis seulement).
- HB2 Pas de curseur au survol des bordures (aucun survol dans le moteur).
- HB3 Alignement vertical « milieu » et « bas » : la saisie s'ouvre au décalage calculé avec le texte d'avant ; pendant la
  frappe, la zone ne se recentre pas (le dessin, lui, se recentre à la validation).
- HB4 En-tête en gras au dessin ; la hauteur exigée de la ligne 0 reste mesurée sans le gras (écart de quelques unités
  possible sur un texte long).
- HB5 Déplacer une ligne : refus (avec message) dès qu'une fusion serait coupée ; une zone entière se déplace seulement si
  on la déplace d'une ligne qui n'en fait pas partie.

## Carte des fichiers

| fichier | rôle | tâches |
|---|---|---|
| `apps/web/src/engine/table-geom.ts` | `linkedBoxes`, `EdgeHit`, `tableEdgeAt`, `cellGrips`, `EDGE_SLOP_PX`, `GRIP_PX` (TB1) ; `TableAction` étendu ; `TableCellState.header` (TB2), `.ha`/`.va` (TB4), `.border` (TB5) ; `naturalWidth` (TB3) ; `cellTextFrame` (TB4) ; `moveGrips`, `lineAt` (TB6) | TB1-TB6 |
| `apps/web/src/engine/tools/table.ts` | glisser de bordure, touches, Uniformiser (TB1) ; en-tête, D35 (TB2) ; double appui (TB3) ; saisie dans `cellTextFrame`, alignement (TB4) ; bordures (TB5) ; déplacement (TB6) | TB1-TB6 |
| `apps/web/src/engine/tools/cell-drop.ts` | appelle `linkedBoxes` au lieu de ses deux boucles (même résultat) | TB1 |
| `apps/web/src/engine/render/overlay.ts`, `canvas2d.ts` | `EditOverlay.grips` et leur dessin (TB1, TB6) ; `cellTextBoxes(t, measure)`, `ha` des lignes (TB4) | TB1, TB4, TB6 |
| `apps/web/src/engine/render/table-paint.ts` | en-tête (TB2), boîtes alignées (TB4), bordures par bord (TB5) | TB2, TB4, TB5 |
| `apps/web/src/engine/text-layout.ts` | `layoutRich(…, ha?)`, `offsetAt(…, ha?)` | TB4 |
| `apps/web/src/engine/fill-target.ts` | le pot cherche le mot depuis `cellTextFrame` | TB4 |
| `apps/web/src/engine/input/keys.ts` | `tableKey` (TB1) étendu par TB2-TB6 | TB1-TB6 |
| `apps/web/src/engine/engine.ts` | `tableKey` routé avant `orderKey` | TB1 |
| `apps/web/src/ui/cell-menu.ts` | ids neufs, rangées (`group`) | TB2, TB4, TB5 |
| `crates/roomboard-core/src/table_look.rs` (nouveau) | `cmd_set_table_look`, lecture `ha`/`va`/`border`, tests | TB4, TB5 |
| `crates/roomboard-core/src/table.rs` | `RawCell.ha/va/border`, `TableCellView`, aides en `pub(crate)` | TB4, TB5, TB6 |
| `crates/roomboard-core/src/table_links.rs` | `cmd_reorder_table_lines`, tests | TB6 |
| `crates/roomboard-core/src/commands.rs`, `crates/roomboard-wasm/src/lib.rs` | variantes `SetTableLook`, `ReorderTableLines`, exports | TB4, TB5, TB6 |
| `apps/web/src/core/{api,wasm-core,fake-core}.ts`, contrat | parité | TB4, TB5, TB6 |
| `apps/cli/src/ops.ts`, `ops.test.ts`, `scripts/essais/cli-essai.mjs` | CLI | TB2, TB4, TB5, TB6 |
| `scripts/essais/personnalisation-3-tableau-navigateur.mjs` | un bloc par scénario S6 à S11 | TB1-TB6 |

## Global Constraints

- G1 TDD : test rouge d'abord, vu rouge (commande bornée), puis le code, puis vert.
- G2 Exécution séquentielle dans le worktree partagé `/home/adminjd/projets/roomboard-wt/personnalisation-3-tableau` ; aucun worktree par tâche.
- G3 Builds et tests : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; `nice -n 10` ; `cargo … -j 4`. Suite complète seulement par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`. Preuves bornées `… 2>&1 | tail -20`, N ≥ 1 test exécuté, nom attendu présent dans la sortie.
- G4 Module Wasm principal : environ 1 480 000 o au départ du lot, seuil d'arrêt 1 540 000 o, plafond 1 572 864 o. Toute tâche qui touche le cœur Rust mesure le module (commande M) avant son commit ; au-delà du seuil, la tâche s'arrête et le rapporte. Module `formats` inchangé.
- G5 Fichier (U3) : champs facultatifs ; `schema` et `formatVersion` inchangés ; valeur illisible = ignorée et gardée ; un test « recharger garde » par valeur neuve.
- G6 CLI (D15 du profil) : toute commande neuve entre dans `COMMAND_TYPES`, `ops.test.ts` et `scripts/essais/cli-essai.mjs` ; `FORMAT_LOTS` inchangé.
- G7 Une étape d'annulation par geste : une commande du cœur = une transaction ; aucun `runAll` ; aucune écriture pendant un glisser (écriture au relâché).
- G8 Tactile d'abord : événements de pointeur du moteur, jamais de glisser HTML5 ni de `contextmenu` ; cibles ≥ 44 px ; chaque geste a un raccourci, vérifié libre dans `keys.ts` et `shortcuts.ts`, ajouté à `SHORTCUTS` avec sa ligne `EXPECT` de `shortcuts.test.ts`.
- G9 Comportement hors tableau inchangé ; essais `data-item`, `c10a-tableau-navigateur.mjs`, `c10b-*` verts sans réécriture.
- G10 Interdits : pas de `git add -A` ni `git add .`, pas de `commit -a`, pas de `--force`, aucun test désactivé ou sauté, aucun seuil touché, aucun `tauri build`.
- G11 Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, `git add` fichier par fichier (ceux de la ligne de la tâche).
- G12 Essai navigateur : un bloc par scénario dans `scripts/essais/personnalisation-3-tableau-navigateur.mjs`, lignes `ok — S<n> : …` ; lectures `#stage[data-…]` d'abord, capture ensuite ; captures 2x seulement avec `--captures` (fonction `capture(nom)` existante).
- G13 Design : icônes Lucide recopiées à l'identique (`gh api repos/lucide-icons/lucide/contents/icons/<nom>.svg?ref=7981a0798a`), nommées dans `THIRD_PARTY_NOTICES.md`, viewBox `-0.25 -0.25 24 24` (netteté § 10 de `docs/plans/design-cadrage.md`), traits 1,5 par la feuille de style.

**Commande M (taille du module principal)** :

```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-3-tableau && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release -j 4 2>&1 | tail -3 \
 && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm \
 && wc -c apps/web/src/wasm/roomboard_wasm_bg.wasm
```

Attendu : un nombre ≤ 1 540 000. Ce `.wasm` est celui que lit `wasm-core.contract.test.ts` (vrai module).

**Commandes de preuve** (forme bornée, depuis le worktree) :

- vitest : `pnpm --filter @roomboard/web exec vitest run <fichiers> -t "<motif>" 2>&1 | tail -8` (motif : `Tests  N passed`, N ≥ 1).
- cœur : `nice -n 10 cargo test -p roomboard-core <filtre> -j 4 2>&1 | tail -10` (motif : `test result: ok. N passed`, N ≥ 1).
- CLI : `pnpm --filter @roomboard/cli build 2>&1 | tail -3 && node scripts/essais/cli-essai.mjs 2>&1 | tail -6` (motif : `CLI : OK`).
- essai : `pnpm --filter @roomboard/web build 2>&1 | tail -3 && node scripts/essais/personnalisation-3-tableau-navigateur.mjs 2>&1 | tail -40` (motif : `personnalisation-3 tableau : OK`).
- suite complète (fin de lot) : `node ~/.claude/scripts/vm/suite-vm.cjs -- scripts/verifier.sh 2>&1 | tail -20`.

## Review Focus

1. **Un seul décalage d'alignement** (cadrage D15, effet de bord « pot ») : dessin, pot et saisie lisent `cellTextFrame` ; le mot visé au pot dans une case centrée est le mot dessiné → `fill-target.test.ts` « D15 : pot sur un mot centré » et `table.test.ts` « D15 : saisie ouverte au cadre aligné » (TB4).
2. **Parité `SetTableLook` et `ReorderTableLines`** (DA2, D18) : ordre des refus, « aucune étape si inchangé », suivi des objets liés au déplacement → contrat `SetTableLook` (TB4), `border` (TB5), `ReorderTableLines` (TB6), joués par les deux fabriques.
3. **Déplacer une ligne d'un tableau fusionné** (D18, S11) : refus sans écriture, message → `reorder_refuses_cut_merge` (TB6), `table.test.ts` « S11 : fusion coupée : message, aucune commande écrite » (TB6).
4. **Tirer une bordure sous le minimum, avec un objet logé** (D13, D34) : la colonne ne descend jamais sous l'objet ; les lignes regrandissent dans la même commande → `table.test.ts` « TB1 : jamais sous l'objet logé » et « TB1 : colonne rétrécie, lignes regrandies » (TB1).
5. **Effet de bord « Uniformiser ne réduit plus sous un objet logé »** (cadrage § 3) → `table.test.ts` « uniform garde les objets » (TB1).
6. **Effet de bord « Ombrer refusé sur une case à objet »** (D35, S18) → `table.test.ts` « D35 : Ombrer refusé sur une case à objet » (TB2).
7. **Recharger garde `ha`, `va`, `border`** (S17, U3) → `look_reload_keeps_values` (TB4), `border_reload_keeps_bytes` (TB5).

---

### Tâche TB1 — Point 6 : tirer une bordure (poignées 44 px, bord à ± 6 px, Alt+Maj+flèches), Uniformiser par `requiredSizes`

<a id="tache-tb1"></a>

**Objectif** (S6, D13) : avec l'outil Tableau, la case active montre deux poignées (milieu du bord droit, milieu du bord
bas) ; les tirer au doigt, ou prendre n'importe quelle bordure intérieure ou extérieure droite/basse à ± 6 px écran, change
la largeur de la colonne ou la hauteur de la ligne ; une seule `SetTableLineSizes` au relâché (une étape) ; une colonne
rétrécie fait regrandir dans la même commande les lignes dont le texte se replie ; jamais sous la taille exigée
(`requiredSizes`, objets logés compris). Alt+Maj+→/← : ± 8 en largeur ; Alt+Maj+↑/↓ : ± 8 en hauteur. Uniformiser ne
réduit plus sous un objet logé (D34).

**Sur `main`** : non fait (seul Uniformiser) ; la commande `SetTableLineSizes` existe sur la branche (lot A) : aucun Rust ici.

**Fichiers** : voir la ligne TB1 de la table.

**Interfaces**
- Consomme : `SetTableLineSizes { id, cols: [colId, w][], rows: [rowId, h][] }` (`api.ts:196`) ; `requiredSizes(t, linked, colWidths, measure)` et `LinkedBox` (`table-geom.ts:270-292`) ; `cellRect`, `mergeAt`, `invertMatrix`, `applyMatrix` ; `worldToScreen(camera, wx, wy)` (`engine/camera.ts:20`).
- Produit (`table-geom.ts`) :
  - `export const EDGE_SLOP_PX = 6; export const GRIP_PX = 44; export const SIZE_STEP = 8;`
  - `export interface EdgeHit { readonly axis: "col" | "row"; readonly index: number }`
  - `export function edgeAt(t: TableData, lx: number, ly: number, tol: number): EdgeHit | null`
  - `export function tableEdgeAt(doc: Pick<CoreDocument, "elementIdsOfKind" | "element">, page: string, x: number, y: number, tolPx: number, zoom: number): { readonly id: string; readonly transform: Matrix; readonly table: TableData; readonly edge: EdgeHit } | null`
  - `export interface Grip { readonly kind: "col" | "row"; readonly x: number; readonly y: number; readonly index: number }` (repère local) ; `export function cellGrips(t: TableData, c: Cell): Grip[]`
  - `export function linkedBoxes(doc: Pick<CoreDocument, "elementIds" | "element" | "bounds">, page: string, table: { readonly id: string; readonly transform: Matrix }, skip?: readonly string[]): LinkedBox[]`
  - `TableAction` gagne `"col-wider" | "col-narrower" | "row-taller" | "row-shorter"`.
- Produit (`overlay.ts`) : `export interface OverlayGrip { readonly x: number; readonly y: number; readonly kind: "col" | "row" }` (monde) ; `EditOverlay.grips?: readonly OverlayGrip[]` ; `mergeOverlays` réunit les `grips`.
- Produit (`keys.ts`) : `export type TableKey = "col-wider" | "col-narrower" | "row-taller" | "row-shorter"; export function tableKey(e: KeyLike): TableKey | null`.
- Réutilise : `apps/web/src/engine/table-geom.ts:275` `requiredSizes` — taille minimale et lignes regrandies (réutiliser).
- Réutilise : `apps/web/src/engine/table-geom.ts:118` `cellRect`, `:82` `mergeAt` — poignées de la zone active (réutiliser).
- Réutilise : `apps/web/src/engine/tools/cell-drop.ts:90`, `:142` (boucles « others ») — remplacées par `linkedBoxes`, même résultat (étendre `table-geom.ts`, pas de module neuf).
- Le rapport porte une ligne par module : `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée**
`pnpm --filter @roomboard/web exec vitest run src/engine/tools/table.test.ts src/engine/table-geom.test.ts src/engine/input/keys.test.ts src/ui/shortcuts.test.ts src/engine/tools/cell-drop.test.ts -t "TB1|tableKey|shortcuts|cell" 2>&1 | tail -8`
(table.test.ts « TB1 » : 6 passés dont `S6 : poignée droite tirée de 100` ; table-geom.test.ts « TB1 » : 3 ; `cell-drop.test.ts`
vert entier). Garder verts : `table.test.ts` et `table-geom.test.ts` entiers (cadrage § 3, tests à garder verts).

**Preuve visuelle** : lectures d'abord — outil Sélection, toucher le bord du tableau : `#stage[data-bounds]` donne une
largeur de 820 (720 + 100) ; Ctrl+Z : 720. Puis capture 2x `bordure-tiree.png` (poignées visibles sur la case active) à
décrire : deux disques blancs cerclés d'accent, au milieu des bords droit et bas de la case.

**Contraintes (recopiées)** :
- G1 TDD : test rouge d'abord, vu rouge (commande bornée), puis le code, puis vert.
- G2 Exécution séquentielle dans le worktree partagé ; aucun worktree par tâche.
- G3 `nice -n 10`, `cargo -j 4`, suite complète par `suite-vm.cjs`, preuves bornées.
- G7 Une étape par geste ; aucune écriture pendant le glisser (écriture au relâché).
- G8 Pointeur du moteur, cibles ≥ 44 px, raccourcis vérifiés libres et ajoutés à `SHORTCUTS` avec leur ligne `EXPECT`.
- G9 Hors tableau inchangé ; essais `c10a`, `c10b`, `data-item` verts.
- G10 Interdits (pas de `git add -A`, `commit -a`, `--force`, test sauté, seuil touché, `tauri build`).
- G11 Commits (auteur, message anglais, `Co-Authored-By`, `git add` un par un).
- G12 Essai : bloc S6, lectures d'abord, capture avec `--captures` seulement.

**Interdits** : aucun Rust ; pas de nouvelle commande ; ne pas toucher `select.ts` ; pas de curseur au survol (HB2).

**Terminé quand** : preuves vertes, essai `ok — S6 : la colonne s'élargit de 100`, capture décrite, un commit.

#### Étapes

- [ ] **1. Tests rouges (`table-geom.test.ts`)** — ajouter :

```ts
import { cellGrips, edgeAt, linkedBoxes, type TableData as _T } from "./table-geom";

describe("TB1 bordures", () => {
  const t3 = (): TableData => ({
    color: "#000", size: 36, merges: [], cells: [],
    cols: [{ id: "a", width: 240 }, { id: "b", width: 240 }, { id: "c", width: 240 }],
    rows: [{ id: "r0", height: 64 }, { id: "r1", height: 64 }],
  });
  it("TB1 edgeAt : bord droit de la colonne 0 à ± tol ; bord gauche exclu ; bord bas de la ligne 1", () => {
    expect(edgeAt(t3(), 243, 30, 6)).toEqual({ axis: "col", index: 0 });
    expect(edgeAt(t3(), 3, 30, 6)).toBeNull();
    expect(edgeAt(t3(), 100, 131, 6)).toEqual({ axis: "row", index: 1 });
    expect(edgeAt(t3(), 100, 30, 6)).toBeNull();
  });
  it("TB1 cellGrips : milieu du bord droit et du bord bas de la zone", () => {
    expect(cellGrips(t3(), { row: 1, col: 1 })).toEqual([
      { kind: "col", x: 480, y: 96, index: 1 },
      { kind: "row", x: 360, y: 128, index: 1 },
    ]);
  });
  it("TB1 linkedBoxes : boîte locale des objets liés au tableau, `skip` exclu", () => {
    const doc = {
      elementIds: () => ["t", "o", "p"],
      element: (id: string) => (id === "o" ? { cell: ["t", "r1", "b"] } : id === "p" ? { cell: ["x", "r0", "a"] } : {}) as never,
      bounds: (ids: readonly string[]) => (ids[0] === "o" ? { x0: 1010, y0: 2010, x1: 1110, y1: 2060 } : null),
    };
    expect(linkedBoxes(doc, "pg", { id: "t", transform: [1, 0, 0, 1, 1000, 2000] })).toEqual([{ row: "r1", col: "b", w: 100, h: 50 }]);
    expect(linkedBoxes(doc, "pg", { id: "t", transform: [1, 0, 0, 1, 1000, 2000] }, ["o"])).toEqual([]);
  });
});
```

(`TableData` est déjà importé en tête du fichier ; retirer l'alias `_T` s'il est inutile au compilateur.)

- [ ] **2. Tests rouges (`table.test.ts`)** — ajouter à la fin :

```ts
describe("outil Tableau — TB1 tirer une bordure (D13, S6)", () => {
  const sizes = (s: ReturnType<typeof setup>, id: string) => ({ w: s.table(id).cols.map((c) => c.width), h: s.table(id).rows.map((r) => r.height) });
  /** 3 × 3 en (100, 200), case (1, 1) active, saisie fermée. */
  const ready = () => {
    const s = setup();
    const id = s.create(100, 200, 3, 3);
    s.tool.requestCommit();
    s.click(100 + 240 + 120, 200 + 64 + 32);
    s.tool.requestCommit();
    return { s, id };
  };
  it("S6 : poignée droite tirée de 100 : une SetTableLineSizes au relâché, colonne 1 = 340, une étape", () => {
    const { s, id } = ready();
    const n = s.runs.length;
    // Poignée « col » de la case (1, 1) : (100 + 480, 200 + 96).
    s.tool.begin(3, [at(580, 296)]);
    s.tool.extend(3, [at(630, 296)], []);
    s.tool.extend(3, [at(680, 296)], []);
    expect(s.runs.length).toBe(n);
    s.tool.close(3, "end");
    expect(s.runs.length).toBe(n + 1);
    const col = s.table(id).cols[1]?.id ?? "";
    expect(s.last()).toEqual({ type: "SetTableLineSizes", id, cols: [[col, 340]], rows: [] });
    expect(sizes(s, id).w).toEqual([240, 340, 240]);
    s.doc.undo();
    expect(sizes(s, id).w).toEqual([240, 240, 240]);
  });
  it("TB1 : bord intérieur pris à 5 px (souris ou doigt), ligne 0 tirée de 30 vers le bas", () => {
    const { s, id } = ready();
    s.tool.begin(3, [at(150, 200 + 64 + 5)]);
    s.tool.extend(3, [at(150, 200 + 64 + 35)], []);
    s.tool.close(3, "end");
    expect(sizes(s, id).h).toEqual([94, 64, 64]);
  });
  it("TB1 : jamais sous l'objet logé ; jamais sous 2 × marge + 24", () => {
    const { s, id } = ready();
    const o = s.doc.apply({ type: "AddShape", page: s.page, shape: "rect", x0: 100 + 240 + 8, y0: 200 + 64 + 8, x1: 100 + 240 + 208, y1: 200 + 64 + 48, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
    const t = s.table(id);
    s.doc.apply({ type: "PlaceInCell", ids: [o], matrix: [1, 0, 0, 1, 0, 0], cell: [id, t.rows[1]?.id ?? "", t.cols[1]?.id ?? ""], sizes: [] });
    s.tool.begin(3, [at(580, 296)]);
    s.tool.extend(3, [at(300, 296)], []);
    s.tool.close(3, "end");
    // Boîte de la forme : 200 + 4 (épaisseur) de large, + 2 × 8 de marge.
    expect(sizes(s, id).w[1]).toBe((s.doc.bounds([o])?.x1 ?? 0) - (s.doc.bounds([o])?.x0 ?? 0) + 16);
    s.tool.begin(4, [at(100 + 240, 230)]);
    s.tool.extend(4, [at(0, 230)], []);
    s.tool.close(4, "end");
    expect(sizes(s, id).w[0]).toBe(40);
  });
  it("TB1 : colonne rétrécie : les lignes dont le texte se replie regrandissent dans la même commande", () => {
    const { s, id } = ready();
    s.click(100 + 120, 200 + 32);
    // 22 caractères (220) : une ligne à 240 (boîte 224), deux à 140 (boîte 124).
    s.type("abcde fghij klmno pqrs");
    s.tool.requestCommit();
    s.tool.begin(3, [at(100 + 240, 230)]);
    s.tool.extend(3, [at(100 + 140, 230)], []);
    s.tool.close(3, "end");
    const last = s.last();
    expect(last?.type).toBe("SetTableLineSizes");
    expect(last?.type === "SetTableLineSizes" ? last.rows.map((r) => r[0]) : []).toEqual([s.table(id).rows[0]?.id]);
    expect(sizes(s, id).h[0]).toBeGreaterThan(64);
  });
  it("TB1 : geste annulé (cancel) : aucune commande ; aucun mouvement : aucune commande, aucune saisie ouverte", () => {
    const { s } = ready();
    const n = s.runs.length;
    const opened = s.host.opened.length;
    s.tool.begin(3, [at(580, 296)]);
    s.tool.extend(3, [at(680, 296)], []);
    s.tool.close(3, "cancel");
    s.tool.begin(4, [at(580, 296)]);
    s.tool.close(4, "end");
    expect(s.runs.length).toBe(n);
    expect(s.host.opened.length).toBe(opened);
  });
  it("TB1 clavier : col-wider + 8, row-shorter jamais sous 64 ; uniform garde les objets", () => {
    const { s, id } = ready();
    s.tool.act("col-wider");
    expect(sizes(s, id).w).toEqual([240, 248, 240]);
    s.tool.act("row-shorter");
    expect(sizes(s, id).h).toEqual([64, 64, 64]);
    const o = s.doc.apply({ type: "AddShape", page: s.page, shape: "rect", x0: 0, y0: 0, x1: 400, y1: 300, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
    const t = s.table(id);
    s.doc.apply({ type: "PlaceInCell", ids: [o], matrix: [1, 0, 0, 1, 0, 0], cell: [id, t.rows[0]?.id ?? "", t.cols[0]?.id ?? ""], sizes: [] });
    s.tool.act("uniform");
    const b = s.doc.bounds([o]);
    expect(Math.min(...sizes(s, id).w)).toBeGreaterThanOrEqual((b?.x1 ?? 0) - (b?.x0 ?? 0) + 16);
    expect(Math.min(...sizes(s, id).h)).toBeGreaterThanOrEqual((b?.y1 ?? 0) - (b?.y0 ?? 0) + 16);
  });
  it("TB1 live : la case active publie ses deux poignées dans l'aperçu", () => {
    const { s } = ready();
    expect(s.tool.live().overlay?.grips).toEqual([{ x: 580, y: 296, kind: "col" }, { x: 460, y: 328, kind: "row" }]);
  });
});
```

Nom du test « uniform garde les objets » (effet de bord du cadrage) : le dernier `it` porte aussi ce motif ; le nommer
`"TB1 clavier : col-wider + 8, row-shorter jamais sous 64 ; uniform garde les objets"` comme ci-dessus.

- [ ] **3. Tests rouges (`keys.test.ts`, `shortcuts.test.ts`)** — `keys.test.ts` :

```ts
import { tableKey } from "./keys";
it("tableKey : Alt+Maj+flèches ; sans Maj, avec Ctrl, en saisie ou en composition : null", () => {
  const k = (key: string, o: Partial<KeyLike> = {}): KeyLike => ({ key, code: key, ctrlKey: false, metaKey: false, shiftKey: true, altKey: true, isComposing: false, target: null, ...o });
  expect(tableKey(k("ArrowRight"))).toBe("col-wider");
  expect(tableKey(k("ArrowLeft"))).toBe("col-narrower");
  expect(tableKey(k("ArrowDown"))).toBe("row-taller");
  expect(tableKey(k("ArrowUp"))).toBe("row-shorter");
  expect(tableKey(k("ArrowRight", { shiftKey: false }))).toBeNull();
  expect(tableKey(k("ArrowRight", { ctrlKey: true }))).toBeNull();
  expect(tableKey(k("ArrowRight", { isComposing: true }))).toBeNull();
  expect(tableKey(k("ArrowRight", { target: { isContentEditable: true } }))).toBeNull();
});
```

(`KeyLike` : l'importer avec `tableKey` s'il ne l'est pas.) `shortcuts.test.ts` : importer `tableKey`, ajouter à `EXPECT`
`"table-col-wider": ["table", "col-wider"], "table-col-narrower": ["table", "col-narrower"], "table-row-taller": ["table", "row-taller"], "table-row-shorter": ["table", "row-shorter"],`
et, avant le `else` final de la boucle :

```ts
      else if (by === "table") expect(tableKey(pressTable(s.keys)), s.id).toBe(value);
```

avec, sous `press` :

```ts
const ARROWS: Readonly<Record<string, string>> = { "→": "ArrowRight", "←": "ArrowLeft", "↑": "ArrowUp", "↓": "ArrowDown" };
/** Raccourci de l'outil Tableau (Alt ou Ctrl, Maj, lettre par `code`, flèche) lu comme un `KeyLike`. */
const pressTable = (keys: string): KeyLike => {
  const parts = keys.split(", ")[0]!.split("+");
  const k = parts.at(-1)!;
  const arrow = ARROWS[k];
  return { key: arrow ?? k.toLowerCase(), code: arrow ?? `Key${k.toUpperCase()}`, ctrlKey: parts.includes("Ctrl"), metaKey: false, shiftKey: parts.includes("Maj"), altKey: parts.includes("Alt"), isComposing: false, target: null };
};
```

- [ ] **4. Rouge** — la commande bornée de la section : les tests neufs échouent (exports absents), les anciens passent.

- [ ] **5. `table-geom.ts`** — ajouter (imports : `CoreDocument` et `Matrix` y sont déjà ; `applyMatrix`, `invertMatrix` aussi) :

```ts
/** D13 : bordure prise à ± 6 px écran ; poignée tactile de 44 px (D-DS3) ; pas du clavier (H12). */
export const EDGE_SLOP_PX = 6;
export const GRIP_PX = 44;
export const SIZE_STEP = 8;

export interface EdgeHit { readonly axis: "col" | "row"; readonly index: number }

/** Bord droit d'une colonne ou bas d'une ligne à ± `tol` du point local (colonnes d'abord) ; le bord gauche et le bord
 *  haut du tableau (0) ne se tirent pas. */
export function edgeAt(t: TableData, lx: number, ly: number, tol: number): EdgeHit | null {
  const w = sum(t.cols.map((c) => c.width));
  const h = sum(t.rows.map((r) => r.height));
  if (!(lx >= -tol && ly >= -tol && lx <= w + tol && ly <= h + tol)) return null;
  let acc = 0;
  for (let i = 0; i < t.cols.length; i++) {
    acc += t.cols[i]?.width ?? 0;
    if (Math.abs(lx - acc) <= tol && ly >= 0 && ly <= h) return { axis: "col", index: i };
  }
  acc = 0;
  for (let i = 0; i < t.rows.length; i++) {
    acc += t.rows[i]?.height ?? 0;
    if (Math.abs(ly - acc) <= tol && lx >= 0 && lx <= w) return { axis: "row", index: i };
  }
  return null;
}

/** Échelle d'une matrice (longueur de l'image du vecteur x) ; 1 si nulle. */
const scaleOf = (m: Matrix): number => Math.hypot(m[0], m[1]) || 1;

/** Bordure du tableau le plus haut à ± `tolPx` px écran de (x, y) monde (D13), au zoom `zoom`. */
export function tableEdgeAt(
  doc: Pick<CoreDocument, "elementIdsOfKind" | "element">,
  page: string,
  x: number,
  y: number,
  tolPx: number,
  zoom: number,
): { readonly id: string; readonly transform: Matrix; readonly table: TableData; readonly edge: EdgeHit } | null {
  const ids = doc.elementIdsOfKind(page, "table");
  for (let i = ids.length - 1; i >= 0; i--) {
    const el = doc.element(ids[i] ?? "");
    if (el?.kind !== "table") continue;
    const inv = invertMatrix(el.transform);
    if (inv === null) continue;
    const [lx, ly] = applyMatrix(inv, x, y);
    const edge = edgeAt(el.table, lx, ly, tolPx / (zoom * scaleOf(el.transform)));
    if (edge !== null) return { id: el.id, transform: el.transform, table: el.table, edge };
  }
  return null;
}

/** Poignée de taille de la case active (D13), repère local : milieu du bord droit (colonne) et du bord bas (ligne) de sa
 *  zone ; `index` = dernière colonne ou dernière ligne de la zone. */
export interface Grip { readonly kind: "col" | "row"; readonly x: number; readonly y: number; readonly index: number }
export function cellGrips(t: TableData, c: Cell): Grip[] {
  const r = cellRect(t, c);
  const z = mergeAt(t, c) ?? single(c);
  return [
    { kind: "col", x: r.x1, y: (r.y0 + r.y1) / 2, index: z.c1 },
    { kind: "row", x: (r.x0 + r.x1) / 2, y: r.y1, index: z.r1 },
  ];
}

/** Boîtes locales des objets logés dans `table` (D34), hors `skip` : rectangle englobant, dans le repère du tableau, des
 *  quatre coins de leur boîte monde. Lue au geste seulement (jamais par image). */
export function linkedBoxes(
  doc: Pick<CoreDocument, "elementIds" | "element" | "bounds">,
  page: string,
  table: { readonly id: string; readonly transform: Matrix },
  skip: readonly string[] = [],
): LinkedBox[] {
  const inv = invertMatrix(table.transform);
  if (inv === null) return [];
  return doc.elementIds(page).flatMap((id) => {
    if (skip.includes(id)) return [];
    const cell = doc.element(id)?.cell;
    if (cell === undefined || cell[0] !== table.id) return [];
    const b = doc.bounds([id]);
    if (b === null) return [];
    const pts = [applyMatrix(inv, b.x0, b.y0), applyMatrix(inv, b.x1, b.y0), applyMatrix(inv, b.x0, b.y1), applyMatrix(inv, b.x1, b.y1)];
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    return [{ row: cell[1], col: cell[2], w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }];
  });
}
```

`TableAction` (ligne 27) devient :

```ts
export type TableAction = "row-insert" | "col-insert" | "row-remove" | "col-remove" | "uniform" | "merge" | "split" | "shade" | "unshade" | "fit-toggle" | "col-wider" | "col-narrower" | "row-taller" | "row-shorter";
```

(Si T9 a déjà ajouté une action, garder la sienne et ajouter les quatre.)

- [ ] **6. `cell-drop.ts`** — remplacer les deux calculs `const others: LinkedBox[] = ctx.doc.elementIds(ctx.page()).flatMap(…)`
(lignes ≈ 90 et ≈ 142) par `const others = linkedBoxes(ctx.doc, ctx.page(), tv, selection);` et
`const others = linkedBoxes(ctx.doc, ctx.page(), hit, selection);` (`tv` et `hit` ont `id` et `transform`) ; importer
`linkedBoxes` de `../table-geom`. `cell-drop.test.ts` reste vert sans changement.

- [ ] **7. `overlay.ts` et `canvas2d.ts`** — `overlay.ts` :

```ts
/** personnalisation-3 (D13, D18) : poignée de l'outil Tableau, point monde ; 44 px de cible, disque de 16 px dessiné. */
export interface OverlayGrip { readonly x: number; readonly y: number; readonly kind: "col" | "row" }
```

champ `readonly grips?: readonly OverlayGrip[];` dans `EditOverlay`, et dans `mergeOverlays` :
`grips: present.flatMap((p) => p.grips ?? []),`. `canvas2d.ts`, dans le dessin de l'aperçu, après `if (o.target) {…}` :

```ts
    if (o.grips && o.grips.length > 0) {
      // personnalisation-3 (D13) : disque blanc de 16 px écran cerclé d'accent (la cible tactile, 44 px, est dans l'outil).
      ctx.save();
      ctx.setLineDash([]);
      ctx.fillStyle = HANDLE_FILL;
      ctx.strokeStyle = SELECTION_COLOR;
      ctx.lineWidth = 1.5 * px;
      for (const g of o.grips) {
        ctx.beginPath();
        ctx.arc(g.x, g.y, 8 * px, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
```

- [ ] **8. `tools/table.ts`** — imports : ajouter `cellGrips`, `EDGE_SLOP_PX`, `GRIP_PX`, `linkedBoxes`, `requiredSizes`,
`SIZE_STEP`, `tableEdgeAt`, `type EdgeHit` depuis `../table-geom` ; `applyMatrix`, `invertMatrix` depuis `../../core/shapes` ;
`worldToScreen` depuis `../camera`. Ajouter sous `interface Press` :

```ts
/** Bordure tirée (D13) : ligne ou colonne `index` du tableau `id`, coordonnée locale de départ, taille de départ. */
interface Resize {
  readonly pointerId: number;
  readonly id: string;
  readonly edge: EdgeHit;
  readonly start: number;
  readonly size0: number;
  size: number;
}
```

Dans `createTableTool`, après `let opened: Opened | null = null;` : `let resize: Resize | null = null;`. Puis, avant
`const refresh` :

```ts
  /** Coordonnée locale (axe de la bordure) du point écran (sx, sy) dans le tableau de matrice `m`. */
  const localAlong = (m: Matrix, axis: "col" | "row", sx: number, sy: number): number | null => {
    const inv = invertMatrix(m);
    if (inv === null) return null;
    const [x, y] = screenToWorld(ctx.camera(), sx, sy);
    const [lx, ly] = applyMatrix(inv, x, y);
    return axis === "col" ? lx : ly;
  };

  /** Taille la plus petite de la ligne ou colonne (D13, D34) : taille exigée par le texte et les objets logés. */
  const minSize = (id: string, transform: Matrix, t: TableData, edge: EdgeHit): number => {
    const need = requiredSizes(t, linkedBoxes(ctx.doc, ctx.page(), { id, transform }), t.cols.map((c) => c.width), measure);
    return (edge.axis === "col" ? need.cols : need.rows)[edge.index] ?? 0;
  };

  /** Écrit la taille (D13) en une SetTableLineSizes ; colonne : les lignes qui exigent plus regrandissent dans la même
   *  commande. Même taille : aucune commande. */
  const resizeTo = (id: string, transform: Matrix, t: TableData, edge: EdgeHit, size: number): void => {
    const v = Math.max(size, minSize(id, transform, t, edge));
    if (edge.axis === "row") {
      const row = t.rows[edge.index];
      if (row === undefined || row.height === v) return;
      ctx.run({ type: "SetTableLineSizes", id, cols: [], rows: [[row.id, v]] });
      return;
    }
    const col = t.cols[edge.index];
    if (col === undefined || col.width === v) return;
    const widths = t.cols.map((c, i) => (i === edge.index ? v : c.width));
    const need = requiredSizes(t, linkedBoxes(ctx.doc, ctx.page(), { id, transform }), widths, measure);
    const rows = t.rows.flatMap((r, i): (readonly [string, number])[] => ((need.rows[i] ?? 0) > r.height ? [[r.id, need.rows[i] ?? 0]] : []));
    ctx.run({ type: "SetTableLineSizes", id, cols: [[col.id, v]], rows });
  };

  /** Bordure sous le point écran : poignée de la case active (44 px, au doigt), sinon un bord à ± 6 px (D13). */
  const grabAt = (sx: number, sy: number, x: number, y: number): { id: string; transform: Matrix; table: TableData; edge: EdgeHit } | null => {
    const at = locate(active);
    if (at !== null) {
      for (const g of cellGrips(at.table, at.cell)) {
        const [wx, wy] = applyMatrix(at.transform, g.x, g.y);
        const [gx, gy] = worldToScreen(ctx.camera(), wx, wy);
        if (Math.abs(gx - sx) <= GRIP_PX / 2 && Math.abs(gy - sy) <= GRIP_PX / 2) {
          return { id: at.ref.id, transform: at.transform, table: at.table, edge: { axis: g.kind, index: g.index } };
        }
      }
    }
    return tableEdgeAt(ctx.doc, ctx.page(), x, y, EDGE_SLOP_PX, ctx.camera().zoom);
  };
```

`refresh` publie aussi les poignées et l'aperçu du glisser (remplace son corps) :

```ts
  const refresh = (): void => {
    const at = locate(active);
    const r = at === null ? null : rangeOf(at);
    if (at === null) {
      live = NO_LIVE;
    } else {
      const grips = cellGrips(at.table, at.cell).map((g) => {
        const [x, y] = applyMatrix(at.transform, g.x, g.y);
        return { x, y, kind: g.kind };
      });
      const rz = resize;
      // Pendant le glisser : le cadre montre le tableau à sa taille d'arrivée (aucune écriture avant le relâché, G7).
      const el = rz === null ? null : ctx.doc.element(rz.id);
      const frame =
        rz !== null && el?.kind === "table"
          ? transformBounds(el.transform, {
              x0: 0,
              y0: 0,
              x1: el.table.cols.reduce((s, c) => s + c.width, 0) + (rz.edge.axis === "col" ? rz.size - rz.size0 : 0),
              y1: el.table.rows.reduce((s, x) => s + x.height, 0) + (rz.edge.axis === "row" ? rz.size - rz.size0 : 0),
            })
          : transformBounds(at.transform, r === null ? cellRect(at.table, at.cell) : rangeRect(at.table, r));
      live = { ...NO_LIVE, overlay: { ...EMPTY_OVERLAY, frame, grips } };
    }
    ctx.requestFrame?.();
  };
```

Dans `begin`, juste après `const [x, y] = screenToWorld(ctx.camera(), s.x, s.y);` :

```ts
      const grab = grabAt(s.x, s.y, x, y);
      if (grab !== null) {
        const start = localAlong(grab.transform, grab.edge.axis, s.x, s.y);
        const line = grab.edge.axis === "col" ? grab.table.cols[grab.edge.index]?.width : grab.table.rows[grab.edge.index]?.height;
        if (start !== null && line !== undefined) {
          resize = { pointerId, id: grab.id, edge: grab.edge, start, size0: line, size: line };
          refresh();
          return;
        }
      }
```

Dans `extend`, en tête (avant `const p = press;`) :

```ts
      const rz = resize;
      if (rz !== null && rz.pointerId === pointerId) {
        const s0 = samples[samples.length - 1];
        const el = ctx.doc.element(rz.id);
        if (!s0 || el?.kind !== "table") return;
        const cur = localAlong(el.transform, rz.edge.axis, s0.x, s0.y);
        if (cur === null) return;
        rz.size = Math.max(rz.size0 + cur - rz.start, minSize(rz.id, el.transform, el.table, rz.edge));
        refresh();
        return;
      }
```

Dans `close`, en tête (après le bloc `swallowed`) :

```ts
      const rz = resize;
      if (rz !== null && rz.pointerId === pointerId) {
        resize = null;
        const el = ctx.doc.element(rz.id);
        if (how === "end" && rz.size !== rz.size0 && el?.kind === "table") resizeTo(rz.id, el.transform, el.table, rz.edge, rz.size);
        refresh();
        ctx.stateChanged?.();
        return;
      }
```

Dans `leave` : `resize = null;` avant `press = null;`. Dans `act`, quatre cas avant `default` :

```ts
        case "col-wider":
        case "col-narrower":
        case "row-taller":
        case "row-shorter": {
          const axis = a === "col-wider" || a === "col-narrower" ? "col" : "row";
          const index = axis === "col" ? span.c1 : span.r1;
          const now = axis === "col" ? t.cols[index]?.width : t.rows[index]?.height;
          const sign = a === "col-wider" || a === "row-taller" ? 1 : -1;
          if (now !== undefined) resizeTo(ref.id, at.transform, t, { axis, index }, now + sign * SIZE_STEP);
          break;
        }
```

`uniform` (D34, effet de bord « Uniformiser ne réduit plus sous un objet logé ») devient :

```ts
  const uniform = (id: string, transform: Matrix, t: TableData): void => {
    const linked = linkedBoxes(ctx.doc, ctx.page(), { id, transform });
    const mean = t.cols.reduce((s, c) => s + c.width, 0) / t.cols.length;
    const w = Math.max(mean, ...requiredSizes(t, linked, t.cols.map(() => mean), measure).cols);
    const need = Math.max(...requiredSizes(t, linked, t.cols.map(() => w), measure).rows);
    const meanH = t.rows.reduce((s, r) => s + r.height, 0) / t.rows.length;
    const h = Math.max(meanH, need);
    if (t.cols.every((c) => sameSize(c.width, w)) && t.rows.every((r) => sameSize(r.height, h))) return;
    ctx.run({ type: "SetTableSizes", id, colWidth: w, rowHeight: h });
  };
```

et l'appel `case "uniform": uniform(ref.id, at.transform, t); break;`. Attention : `requiredSizes` impose
`TABLE_ROW_HEIGHT` en plancher de ligne ; Uniformiser ne descend donc plus sous 64 (avant : hauteur du texte, qui vaut
déjà ≥ 61 + marge). Si un test existant de `table.test.ts` attend une hauteur < 64, le rapporter, ne pas le modifier.

- [ ] **9. `keys.ts`, `engine.ts`, `shortcuts.ts`** — `keys.ts`, après `cellKey` :

```ts
export type TableKey = "col-wider" | "col-narrower" | "row-taller" | "row-shorter";
/** personnalisation-3 (H12) : touches de l'outil Tableau, case active, saisie fermée : Alt+Maj+→ ← largeur ± 8,
 *  Alt+Maj+↓ ↑ hauteur ± 8 ; hors champ, hors IME, sans Ctrl ni Cmd. */
export function tableKey(e: KeyLike): TableKey | null {
  if (e.isComposing || e.metaKey || inEditable(e.target)) return null;
  if (!e.altKey || e.ctrlKey) return null;
  if (e.shiftKey) {
    if (e.key === "ArrowRight") return "col-wider";
    if (e.key === "ArrowLeft") return "col-narrower";
    if (e.key === "ArrowDown") return "row-taller";
    if (e.key === "ArrowUp") return "row-shorter";
  }
  return null;
}
```

`engine.ts` : importer `tableKey` ; dans `key(e)`, juste avant `const order = orderKey(e);` :

```ts
      // personnalisation-3 (H12) : touches de l'outil Tableau, prises seulement avec une case active ; sinon elles passent.
      const tk = tableKey(e);
      if (tk !== null && tool === "table" && tableTool.cell() !== null) {
        tableTool.act(tk);
        return true;
      }
```

`shortcuts.ts`, après `table-fit` :

```ts
  s("table-col-wider", "Tableau", "Élargir la colonne", "Alt+Maj+→"),
  s("table-col-narrower", "Tableau", "Rétrécir la colonne", "Alt+Maj+←"),
  s("table-row-taller", "Tableau", "Agrandir la ligne", "Alt+Maj+↓"),
  s("table-row-shorter", "Tableau", "Réduire la ligne", "Alt+Maj+↑"),
```

Vérifié libre : aucune combinaison Alt+Maj+flèche dans `keys.ts` ni `shortcuts.ts` (lu le 2026-11-27).

- [ ] **10. Vert** — commande bornée de la section ; puis `pnpm --filter @roomboard/web exec vitest run src/engine 2>&1 | tail -8` (aucun échec).
  Un appui sans mouvement sur une poignée ou une bordure n'écrit rien et n'ouvre aucune saisie (il prépare le double appui
  de TB3). Si un test existant échoue parce qu'un de ses clics tombe à moins de 22 px d'une poignée de la case active ou à
  moins de 6 px d'une bordure, ne pas modifier le test : le rapporter avec son nom et la coordonnée.

- [ ] **11. Essai (bloc S6)** — dans `scenario`, après le dernier bloc existant et avant le contrôle `aucune erreur` :

```js
  // S6 (D13) : tableau 3 × 3 neuf sous les autres ; case (1, 1) active ; poignée droite tirée au doigt de 100 px.
  const DY6 = 840;
  const cell6 = (row, col) => screen(c, origin[0] + COL * col + COL / 2, origin[1] + DY6 + ROW * row + ROW / 2);
  await page.click(item("table"));
  await fr();
  await mouse.click(...screen(c, origin[0], origin[1] + DY6));
  await page.waitForSelector(".rb-table-picker:not([hidden])", { timeout: 5000 });
  await page.click('button[aria-label="3 colonnes, 3 lignes"]');
  await page.keyboard.press("Escape");
  await fr();
  await mouse.click(...cell6(1, 1));
  await page.keyboard.press("Escape");
  await fr();
  const grip = screen(c, origin[0] + 2 * COL, origin[1] + DY6 + ROW * 1.5);
  await touchDrag(grip, [grip[0] + 100 * c.zoom, grip[1]]);
  await capture("bordure-tiree");
  await page.click(item("select"));
  await fr();
  await selectAt(screen(c, origin[0], origin[1] + DY6 + ROW / 2));
  const [ax0, , ax1] = await boundsOf();
  check(near(ax1 - ax0, 820), `S6 : la colonne s'élargit de 100 (tableau ${ax1 - ax0} de large, attendu 820)`);
  await page.keyboard.press("Control+z");
  await fr();
  await selectAt(screen(c, origin[0], origin[1] + DY6 + ROW / 2));
  const [bx0, , bx1] = await boundsOf();
  check(near(bx1 - bx0, 720), `S6 : Ctrl+Z rend 720 en une étape (lu ${bx1 - bx0})`);
  await page.keyboard.press("Escape");
  await page.click(item("table"));
  await fr();
  await mouse.click(...cell6(1, 1));
  await page.keyboard.press("Escape");
  await page.keyboard.press("Alt+Shift+ArrowRight");
  await fr();
  await page.click(item("select"));
  await fr();
  await selectAt(screen(c, origin[0], origin[1] + DY6 + ROW / 2));
  const [kx0, , kx1] = await boundsOf();
  check(near(kx1 - kx0, 728), `S6 : Alt+Maj+→ élargit de 8 (lu ${kx1 - kx0})`);
  await page.keyboard.press("Escape");
  await fr();
```

Si `DY6` tombe hors de la page visible (lecture `data-camera`), prendre le plus grand `DY` qui laisse le tableau entier
dans la vue et l'écrire dans le rapport. Commande : `pnpm --filter @roomboard/web build 2>&1 | tail -3 && node scripts/essais/personnalisation-3-tableau-navigateur.mjs --captures 2>&1 | tail -40`, puis
`node scripts/essais/c10a-tableau-navigateur.mjs 2>&1 | tail -3` et `node scripts/essais/c10b-tableau-navigateur.mjs 2>&1 | tail -3` (noms exacts : `ls scripts/essais | grep c10`), motif `OK`.

- [ ] **12. Commit** — `git add` un par un des fichiers de la ligne TB1, message
`feat(web): drag table borders and grips to size a column or a row, Alt+Shift+arrows, uniform keeps placed objects`
+ ligne vide + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, auteur G11.

---

### Tâche TB2 — Point 10 : en-tête (dessin, bouton « En-tête », Alt+E, menu de case) + refus d'Ombrer une case à objet (D35)

<a id="tache-tb2"></a>

**Objectif** (S10, D17, D35, S18) : un geste (bouton « En-tête » de la rangée du tableau, entrée « En-tête » du menu de
case, Alt+E) bascule `header` ; la ligne 0 se dessine en gras sur fond `#E0E0E8`, à l'écran et au PDF (même peintre) ;
Ctrl+Z la rend normale. « Ombrer » sur une plage qui porte un objet logé ne lance aucune commande et affiche « Retirez
d'abord les objets de la case. ».

**Sur la branche** : `SetTableOptions { header }` est écrit, relu (`TableView.header`, `TableData.header`), contrat compris
(lot A, T7) ; aucun Rust ici.

**Fichiers** : voir la ligne TB2 de la table.

**Interfaces**
- Consomme : `SetTableOptions { id, header?: boolean }` (`api.ts:198`) ; `TableData.header?: boolean` ; `CellMenu`, `CellMenuItem` (`ui/cell-menu.ts:9-17`) ; `showToast({ text })` (`ui/toast.ts:26`).
- Produit :
  - `table-geom.ts` : `export const TABLE_HEADER_FILL = "#E0E0E8";` ; `TableAction` + `"header-toggle"` ; `TableCellState.header?: boolean`.
  - `table-paint.ts` : fond d'en-tête sous les remplissages ; `cellTextBoxes` rend les segments de la ligne 0 en gras quand `t.header`.
  - `tools/table.ts` : `createTableTool(ctx, editor, picker, style, measure, menu?: CellMenu, notify?: (text: string) => void)` ; `export const SHADE_REFUSED = "Retirez d'abord les objets de la case.";`.
  - `cell-menu.ts` : `CellMenuItem.id` gagne `"header"` ; icône `heading`.
  - `keys.ts` : `TableKey` + `"header-toggle"` (Alt+E, `code` `KeyE`, sans Maj).
  - `toolbar.ts` : `ACTION_TABLE["table-header"] = { label: "En-tête" }`, `TABLE_ACTIONS` + `"table-header"` (après `"table-unshade"`) ; `toolbar-host.ts` : `"table-header": (t) => t.engine().tableAction("header-toggle")` ; `icons.ts` : `ACTION_ICONS["table-header"] = "heading"`, `ICONS.heading`.
  - `stage-tags.ts` : `#stage[data-table-header]` = `"1"` / `"0"` / `""` (sans case).
- Réutilise : `apps/web/src/engine/render/table-paint.ts:49` `fillBox`, `apps/web/src/engine/table-geom.ts:106` `rangeRect` — fond de la ligne 0 (réutiliser).
- Réutilise : `apps/web/src/ui/cell-menu.ts` `createCellMenu` — entrée neuve, aucun menu neuf (étendre).
- Réutilise : `apps/web/src/ui/toast.ts:26` `showToast` — message du refus, passé par `board-session.ts` (réutiliser).
- Le rapport porte une ligne par module : `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée**
`pnpm --filter @roomboard/web exec vitest run src/engine/render/table-paint.test.ts src/engine/tools/table.test.ts src/ui/cell-menu.test.ts src/ui/icons.test.ts src/ui/shortcuts.test.ts src/engine/input/keys.test.ts src/toolbar.test.ts -t "S10|TB2|D35|cell-menu|ICONS|shortcuts|tableKey|TABLE_ACTIONS" 2>&1 | tail -8`
(`table-paint.test.ts` « S10 » : 2 ; `table.test.ts` « TB2 » et « D35 » : 3). CLI : `pnpm --filter @roomboard/cli build 2>&1 | tail -3 && node scripts/essais/cli-essai.mjs 2>&1 | tail -6` (ligne `T-B2` puis `CLI : OK`).

**Preuve visuelle** : lectures d'abord — `#stage[data-table-header]` = `1` après le bouton, `0` après Ctrl+Z. Puis capture
2x `en-tete.png` à décrire (première ligne grise, texte en gras).

**Contraintes (recopiées)** :
- G1 TDD : test rouge d'abord, vu rouge, puis vert.
- G2 Worktree partagé, séquentiel.
- G3 `nice -n 10`, preuves bornées.
- G5 `header` absent par défaut (déjà écrit par le lot A).
- G6 CLI : `SetTableOptions` est déjà dans `COMMAND_TYPES` ; `cli-essai.mjs` gagne un passage `header`.
- G7 Une étape par geste.
- G8 Bouton ≥ 44 px (rangée existante), menu ≥ 44 px, raccourci Alt+E vérifié libre (`keys.ts`, `shortcuts.ts`), ligne `EXPECT`.
- G9 Hors tableau inchangé.
- G10 Interdits.
- G11 Commits.
- G12 Essai : bloc S10, lectures d'abord, capture avec `--captures` seulement.
- G13 Icône `heading` recopiée de Lucide, nommée dans `THIRD_PARTY_NOTICES.md`.

**Interdits** : pas de tri (lot C) ; ne pas changer la mise en lignes de la saisie (HB4) ; pas de Rust.

**Terminé quand** : preuves vertes, essai `ok — S10 : en-tête posé`, capture décrite, un commit.

#### Étapes

- [ ] **1. Tests rouges** — `table-paint.test.ts` (fichier existant ou créé ; s'il est créé, en-tête `import { describe, expect, it, vi } from "vitest";`) :

```ts
import { cellTextBoxes, paintTableGrid } from "./table-paint";
import { TABLE_HEADER_FILL } from "../table-geom";
import type { TableData } from "../../core/api";

const head = (header: boolean): TableData => ({
  color: "#000000", size: 36, merges: [],
  cols: [{ id: "a", width: 240 }, { id: "b", width: 240 }],
  rows: [{ id: "r0", height: 64 }, { id: "r1", height: 64 }],
  cells: [
    { row: "r0", col: "a", text: "Nom", fill: null, shade: null, spans: [{ text: "Nom", attrs: {} }] },
    { row: "r1", col: "a", text: "Léa", fill: null, shade: null, spans: [{ text: "Léa", attrs: {} }] },
  ],
  ...(header ? { header: true } : {}),
});

describe("S10 en-tête (D17)", () => {
  it("S10 : ligne 0 peinte au fond d'en-tête avant les traits ; sans en-tête : aucun fond", () => {
    const fills: string[] = [];
    const ctx = { set fillStyle(v: string) { fills.push(v); }, get fillStyle() { return ""; }, fillRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), save: vi.fn(), restore: vi.fn(), rect: vi.fn(), clip: vi.fn(), setLineDash: vi.fn() } as unknown as CanvasRenderingContext2D;
    paintTableGrid(ctx, head(true));
    expect(fills).toContain(TABLE_HEADER_FILL);
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual([0, 0, 480, 64]);
    fills.length = 0;
    paintTableGrid(ctx, head(false));
    expect(fills).not.toContain(TABLE_HEADER_FILL);
  });
  it("S10 : texte de la ligne 0 en gras quand header ; ligne 1 inchangée", () => {
    const b = cellTextBoxes(head(true));
    expect(b.find((x) => x.row === "r0")?.spans).toEqual([{ text: "Nom", attrs: { bold: true } }]);
    expect(b.find((x) => x.row === "r1")?.spans).toEqual([{ text: "Léa", attrs: {} }]);
    expect(cellTextBoxes(head(false)).find((x) => x.row === "r0")?.spans).toEqual([{ text: "Nom", attrs: {} }]);
  });
});
```

`table.test.ts` — dans `setup()`, ajouter `const notices: string[] = [];`, passer `(text) => void notices.push(text)` en
septième argument de `createTableTool`, et rendre `notices` dans l'objet retourné. Puis :

```ts
describe("outil Tableau — TB2 en-tête et D35", () => {
  it("TB2 : header-toggle écrit header vrai puis faux, une étape chacun ; cellState.header suit", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.tool.requestCommit();
    s.tool.act("header-toggle");
    expect(s.last()).toEqual({ type: "SetTableOptions", id, header: true });
    expect(s.tool.cellState()?.header).toBe(true);
    s.tool.act("header-toggle");
    expect(s.last()).toEqual({ type: "SetTableOptions", id, header: false });
    expect(s.tool.cellState()?.header).toBe(false);
  });
  it("TB2 : le menu de case propose « En-tête » (ou « Retirer l'en-tête »)", () => {
    vi.useFakeTimers();
    try {
      const s = setup();
      const id = s.create(100, 200, 3, 3);
      s.tool.requestCommit();
      s.tool.begin(1, [at(120, 220)]);
      vi.advanceTimersByTime(500);
      const item = s.menuOpens[0]?.items.find((i) => i.id === "header");
      expect(item?.label).toBe("En-tête");
      s.tool.close(1, "end");
      item?.run();
      expect(s.last()).toEqual({ type: "SetTableOptions", id, header: true });
    } finally {
      vi.useRealTimers();
    }
  });
  it("D35 : Ombrer refusé sur une case à objet : aucune commande, message ; case sans objet : ombrée", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.tool.requestCommit();
    const o = s.doc.apply({ type: "AddShape", page: s.page, shape: "rect", x0: 1000, y0: 1000, x1: 1100, y1: 1050, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
    const t = s.table(id);
    s.doc.apply({ type: "PlaceInCell", ids: [o], matrix: [1, 0, 0, 1, 0, 0], cell: [id, t.rows[0]?.id ?? "", t.cols[0]?.id ?? ""], sizes: [] });
    s.click(120, 220);
    s.tool.requestCommit();
    const n = s.runs.length;
    s.tool.act("shade");
    expect(s.runs.length).toBe(n);
    expect(s.notices).toEqual(["Retirez d'abord les objets de la case."]);
    // Centre de la case (0, 1) : loin des poignées de la case active (± 22 px).
    s.click(100 + 240 + 120, 220);
    s.tool.requestCommit();
    s.tool.act("shade");
    expect(s.last()?.type).toBe("SetTableShade");
  });
});
```

Le test T7 « appui long … : menu ouvert avec l'entrée fit » compare la liste entière des entrées à `["fit"]` (ou à la liste
laissée par T9). Il devient faux par construction (entrée neuve). Remplacer **seulement** sa ligne
`expect(s.menuOpens[0]?.items.map((i) => i.id)).toEqual([...])` par
`expect(s.menuOpens[0]?.items[0]?.id).toBe("fit");` : son intention (l'entrée « fit » en tête, `items[0].run()` lance
`fit-toggle`) est gardée ; l'écrire dans le rapport.

`keys.test.ts` : `expect(tableKey({ key: "e", code: "KeyE", ctrlKey: false, metaKey: false, shiftKey: false, altKey: true, isComposing: false, target: null })).toBe("header-toggle");`.
`shortcuts.test.ts` : `EXPECT["table-header"] = ["table", "header-toggle"]`. `icons.test.ts` : le nombre d'icônes (`toHaveLength`,
titre « N icônes ») et le compte « 11 + N » des actions augmentent de 1 ; `heading` entre dans un objet `LOT_P3` comparé à
l'identique comme `LOT1` (même forme de test que « personnalisation-1a T6 »), et dans l'ensemble `used`. `toolbar.test.ts` :
si un test fige `TABLE_ACTIONS`, y ajouter `"table-header"` en dernier.

- [ ] **2. Rouge** — commande bornée de la section.

- [ ] **3. Dessin** — `table-geom.ts` : `export const TABLE_HEADER_FILL = "#E0E0E8";` (commentaire : `--rf-gray-300`,
choix 5 du plan lot B), `TableAction` + `| "header-toggle"`, `TableCellState` + `readonly header?: boolean;`.
`table-paint.ts` : importer `rangeRect`, `TABLE_HEADER_FILL` ; en tête de `paintTableGrid` :

```ts
  // personnalisation-3 (D17) : fond d'en-tête sous les remplissages de case (un remplissage passe au-dessus).
  if (t.header === true && t.rows.length > 0 && t.cols.length > 0) fillBox(ctx, rangeRect(t, { r0: 0, c0: 0, r1: 0, c1: t.cols.length - 1 }), TABLE_HEADER_FILL);
```

Dans `cellTextBoxes`, remplacer `spans: cell.spans` par
`spans: t.header === true && at.row === 0 ? cell.spans.map((s) => ({ text: s.text, attrs: { ...s.attrs, bold: true as const } })) : cell.spans`.

- [ ] **4. Outil Tableau** — signature : `createTableTool(ctx, editor, picker, style, measure, menu?: CellMenu, notify?: (text: string) => void)`.
Ajouter `export const SHADE_REFUSED = "Retirez d'abord les objets de la case.";`. `shadeOver` devient :

```ts
  /** Ombrer ou retirer l'ombrage (F9) sur la plage, sinon la zone active ; Ombrer une plage qui porte un objet logé est
   *  refusé avec un message (D35 : l'ombrage ne couvre pas un objet). */
  const shadeOver = (at: Located, span: Range, shade: string | null): void => {
    const corners = cornersOf(at.table, span);
    if (corners === null) return;
    if (shade !== null) {
      const rows = new Set(at.table.rows.slice(span.r0, span.r1 + 1).map((r) => r.id));
      const cols = new Set(at.table.cols.slice(span.c0, span.c1 + 1).map((c) => c.id));
      const busy = ctx.doc.elementIds(ctx.page()).some((e) => {
        const l = ctx.doc.element(e)?.cell;
        return l !== undefined && l[0] === at.ref.id && rows.has(l[1]) && cols.has(l[2]);
      });
      if (busy) {
        notify?.(SHADE_REFUSED);
        return;
      }
    }
    ctx.run({ type: "SetTableShade", id: at.ref.id, ...corners, shade });
  };
```

`act` : `case "header-toggle": ctx.run({ type: "SetTableOptions", id: ref.id, header: t.header !== true }); break;`.
`cellState` : ajouter `header: t.header === true` à l'objet rendu. `openMenu` : la liste devient
`[{ id: "fit", … }, …entrées de T9 si présentes…, { id: "header", label: at.table.header === true ? "Retirer l'en-tête" : "En-tête", run: () => api.act("header-toggle") }]`
(l'entrée `header` s'ajoute **à la fin** de la liste existante).

- [ ] **5. Menu, barre, touches** — `cell-menu.ts` : `id` + `| "header"` ; `ICON_OF` + `header: "heading"`. `icons.ts` :
`ICONS.heading` recopié de Lucide (`gh api repos/lucide-icons/lucide/contents/icons/heading.svg?ref=7981a0798a --jq .content | base64 -d`),
attendu `[["path", { d: "M6 12h12" }], ["path", { d: "M6 20V4" }], ["path", { d: "M18 20V4" }]]` ; `ACTION_ICONS["table-header"] = "heading"`.
`THIRD_PARTY_NOTICES.md` : ajouter `heading` à la liste des icônes Lucide. `toolbar.ts` : `"table-header": { label: "En-tête" },`
dans `ACTION_TABLE` et `"table-header"` en dernier dans `TABLE_ACTIONS`. `toolbar-host.ts` :
`"table-header": (t) => t.engine().tableAction("header-toggle"),`. `item-state.ts` : `"table-header": (v) => ({ disabled: !v.tableCell }),`.
`keys.ts` : `TableKey` + `| "header-toggle"` ; dans `tableKey`, après le bloc `if (e.shiftKey) {…}` :
`if (!e.shiftKey && (e.code === "KeyE")) return "header-toggle";`. `shortcuts.ts` : `s("table-header", "Tableau", "En-tête", "Alt+E"),`.
Vérifié libre : Alt+E absent de `keys.ts` et `shortcuts.ts`. `stage-tags.ts` : clé `tableHeader` dans le type rendu et
`tableHeader: s.tableCell === null ? "" : s.tableCell.header === true ? "1" : "0",` (attribut `data-table-header`, même
câblage que `tableLinked`). `board-session.ts` : importer `showToast` de `../ui/toast` et passer
`(text) => showToast({ text })` en septième argument de `createTableTool`.

- [ ] **6. CLI** — `cli-essai.mjs`, après le passage T7 (`SetTableOptions fit shrink`) :

```js
  // personnalisation-3 (TB2) : en-tête posé par SetTableOptions, relu par `state`.
  const head = cli(["run", pl, "--save", "--ops", "-"], lignesOps({ type: "SetTableOptions", id: tab.id, header: true }, { op: "state" }));
  const reluHead = lireEtat(head.brut, tab.id);
  verifie("T-B2 : SetTableOptions header, relu par state", head.code === 0 && reluHead?.table?.header === true, head.brut);
```

(`lireEtat` : utiliser la même lecture que la ligne 559 du fichier, `reluOpts` ; recopier son expression telle quelle.)

- [ ] **7. Vert** — commande bornée, puis `pnpm --filter @roomboard/web exec vitest run src 2>&1 | tail -8`.

- [ ] **8. Essai (bloc S10)** — après le bloc S6, sur le tableau de S6 :

```js
  // S10 (D17) : bouton « En-tête » de la rangée du tableau, puis Ctrl+Z.
  await page.click(item("table"));
  await fr();
  await mouse.click(...cell6(0, 0));
  await page.keyboard.press("Escape");
  await fr();
  await page.click('[data-table-action="table-header"]');
  await fr();
  check((await attr("data-table-header")) === "1", "S10 : en-tête posé (data-table-header=1)");
  await capture("en-tete");
  await page.keyboard.press("Control+z");
  await fr();
  check((await attr("data-table-header")) === "0", "S10 : Ctrl+Z rend la ligne normale (data-table-header=0)");
  await page.keyboard.press("Alt+e");
  await fr();
  check((await attr("data-table-header")) === "1", "S10 : Alt+E pose l'en-tête");
  await page.keyboard.press("Control+z");
  await fr();
```

- [ ] **9. Commit** — fichiers de la ligne TB2 un par un, message
`feat(web): table header row in one gesture (button, Alt+E, cell menu), refuse shading a cell that holds an object`
+ `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, auteur G11.

---

### Tâche TB3 — Point 7 : double appui sur une poignée ou une bordure, Alt+A : ajuster au contenu

<a id="tache-tb3"></a>

**Objectif** (S7, D14) : deux appuis (≤ 300 ms entre les deux `begin`, ≤ 8 px écran) sur une poignée ou une bordure de
colonne : la colonne prend max(ligne de texte la plus longue sans retour, objets logés) + 2 × marge, bornée à
4 × `TABLE_COL_WIDTH` (960) ; sur une bordure de ligne : la ligne prend sa hauteur exigée ; une étape. Alt+A sur la case
active : sa colonne et sa ligne, une seule commande.

**Fichiers** : voir la ligne TB3 de la table.

**Interfaces**
- Consomme (TB1) : `grabAt`, `resizeTo`, `Resize`, `EdgeHit`, `linkedBoxes`, `requiredSizes` ; `layoutRich(spans, base, boxWidth, measure)` ; `InputSample.t` (ms).
- Produit : `export function naturalWidth(t: TableData, col: number, measure: Measure): number` (`table-geom.ts`) ; `export const DOUBLE_TAP_MS = 300; export const DOUBLE_TAP_PX = 8;` ; `TableAction` + `"fit-content"` ; `TableKey` + `"fit-content"` (Alt+A, `code` `KeyA`).
- Réutilise : `apps/web/src/engine/text-layout.ts:243` `layoutRich` — lignes sans retour (largeur 1e9) (réutiliser) ; `apps/web/src/engine/table-geom.ts:275` `requiredSizes` — objets et hauteur exigée (réutiliser).
- Le rapport porte une ligne par module : `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée**
`pnpm --filter @roomboard/web exec vitest run src/engine/table-geom.test.ts src/engine/tools/table.test.ts src/engine/input/keys.test.ts src/ui/shortcuts.test.ts -t "naturalWidth|S7|tableKey|shortcuts" 2>&1 | tail -8`
(`naturalWidth` : 2 ; `S7` : 3).

**Preuve visuelle** : lecture — outil Sélection sur le tableau : largeur = 720 − 240 + (largeur du mot + 16) ; l'essai la
calcule depuis `data-bounds` avant et après. Capture 2x `ajuste-contenu.png` à décrire.

**Contraintes (recopiées)** :
- G1 TDD : rouge d'abord. · G2 worktree partagé. · G3 preuves bornées. · G7 une étape par geste.
- G8 Alt+A vérifié libre, ligne `EXPECT`. · G9 hors tableau inchangé. · G10 interdits. · G11 commits.
- G12 Essai : bloc S7, lectures d'abord, capture avec `--captures` seulement.

**Interdits** : pas de Rust ; pas de mesure dans `emit` ni par image.

**Terminé quand** : preuves vertes, essai `ok — S7 : la colonne prend la largeur du mot`, un commit.

#### Étapes

- [ ] **1. Tests rouges** — `table-geom.test.ts` :

```ts
import { naturalWidth } from "./table-geom";
describe("naturalWidth (D14)", () => {
  const m = (s: string) => s.length * 10;
  const t = (texts: Record<string, string>, merges: TableData["merges"] = []): TableData => ({
    color: "#000", size: 36, merges,
    cols: [{ id: "a", width: 100 }, { id: "b", width: 100 }],
    rows: [{ id: "r0", height: 64 }, { id: "r1", height: 64 }],
    cells: Object.entries(texts).map(([k, text]) => {
      const [row, col] = k.split(":");
      return { row: row ?? "", col: col ?? "", text, fill: null, shade: null, spans: [{ text, attrs: {} }] };
    }),
  });
  it("naturalWidth : ligne la plus longue sans retour + 2 × marge ; paragraphes séparés", () => {
    expect(naturalWidth(t({ "r0:a": "Photosynthèse", "r1:a": "ab\nabcdef" }), 0, m)).toBe(130 + 16);
  });
  it("naturalWidth : zone de deux colonnes ignorée ; colonne vide : 2 × marge", () => {
    expect(naturalWidth(t({ "r0:a": "abcdefghij" }, [{ row: "r0", col: "a", rows: 1, cols: 2 }]), 0, m)).toBe(16);
  });
});
```

`table.test.ts` (ajouter `const atT = (x: number, y: number, t: number): InputSample => ({ ...at(x, y), t });` sous `at`) :

```ts
describe("outil Tableau — S7 ajuster au contenu (D14)", () => {
  const ready = () => {
    const s = setup();
    const id = s.create(100, 200, 3, 3);
    s.type("Photosynthèse");
    s.tool.requestCommit();
    s.click(100 + 120, 200 + 32);
    s.tool.requestCommit();
    return { s, id };
  };
  it("S7 : double appui sur la poignée droite : colonne 0 = 13 × 10 + 16, une commande", () => {
    const { s, id } = ready();
    const n = s.runs.length;
    s.tool.begin(3, [atT(340, 232, 1000)]);
    s.tool.close(3, "end");
    s.tool.begin(4, [atT(342, 232, 1200)]);
    s.tool.close(4, "end");
    expect(s.runs.length).toBe(n + 1);
    expect(s.table(id).cols.map((c) => c.width)).toEqual([146, 240, 240]);
  });
  it("S7 : deux appuis à plus de 300 ms ou à plus de 8 px : aucun ajustement", () => {
    const { s, id } = ready();
    s.tool.begin(3, [atT(340, 232, 1000)]);
    s.tool.close(3, "end");
    s.tool.begin(4, [atT(340, 232, 1400)]);
    s.tool.close(4, "end");
    // 100 ms après le précédent mais à 20 px (toujours sur la poignée) : pas un double appui.
    s.tool.begin(5, [atT(340, 252, 1500)]);
    s.tool.close(5, "end");
    expect(s.table(id).cols.map((c) => c.width)).toEqual([240, 240, 240]);
  });
  it("S7 : Alt+A (fit-content) : colonne et ligne de la case active en une SetTableLineSizes", () => {
    const { s, id } = ready();
    s.tool.act("fit-content");
    const last = s.last();
    expect(last?.type).toBe("SetTableLineSizes");
    expect(s.table(id).cols[0]?.width).toBe(146);
    expect(s.table(id).rows[0]?.height).toBe(64);
  });
});
```

`keys.test.ts` : `expect(tableKey({ key: "a", code: "KeyA", ctrlKey: false, metaKey: false, shiftKey: false, altKey: true, isComposing: false, target: null })).toBe("fit-content");`.
`shortcuts.test.ts` : `EXPECT["table-fit-content"] = ["table", "fit-content"]`.

- [ ] **2. Rouge** — commande bornée.

- [ ] **3. `table-geom.ts`** :

```ts
/** Double appui (D14, H15) : 300 ms entre deux appuis, 8 px écran. */
export const DOUBLE_TAP_MS = 300;
export const DOUBLE_TAP_PX = 8;
/** Largeur « sans retour » pour la largeur naturelle. */
const NO_WRAP = 1e9;

/** Largeur naturelle d'une colonne (D14) : ligne de texte la plus longue sans retour automatique, sur les ancres d'une
 *  seule colonne (une zone de plusieurs colonnes et une cellule couverte sont ignorées), plus deux marges. */
export function naturalWidth(t: TableData, col: number, measure: Measure): number {
  const zones = mergeRanges(t);
  const k = t.cols[col];
  let w = 0;
  if (k === undefined) return 2 * TABLE_PADDING;
  t.rows.forEach((r, i) => {
    const z = zones.find((x) => inRange(x, { row: i, col }));
    if (z !== undefined && (z.c0 !== z.c1 || z.r0 !== i)) return;
    for (const line of layoutRich(cellContent(t, r.id, k.id).spans, { size: t.size }, NO_WRAP, measure)) {
      const last = line.segments[line.segments.length - 1];
      if (last !== undefined) w = Math.max(w, last.x + last.width);
    }
  });
  return w + 2 * TABLE_PADDING;
}
```

`TableAction` + `| "fit-content"`.

- [ ] **4. Outil Tableau** — importer `naturalWidth`, `DOUBLE_TAP_MS`, `DOUBLE_TAP_PX`, `TABLE_COL_WIDTH` (déjà importé). Après
`let resize` : `let lastTap: { id: string; edge: EdgeHit; t: number; x: number; y: number } | null = null;`. Fonction :

```ts
  /** Ajuster au contenu (D14) : colonne = max(largeur naturelle, objets) bornée à 4 × TABLE_COL_WIDTH, lignes qui
   *  exigent plus regrandies ; ligne = hauteur exigée ; `both` (Alt+A) : la colonne et la ligne, une commande. */
  const fitContent = (id: string, transform: Matrix, t: TableData, col: number | null, row: number | null): void => {
    const linked = linkedBoxes(ctx.doc, ctx.page(), { id, transform });
    const widths = t.cols.map((c) => c.width);
    const cols: (readonly [string, number])[] = [];
    if (col !== null) {
      const k = t.cols[col];
      const objs = requiredSizes(t, linked, widths, measure).cols[col] ?? 0;
      const w = Math.min(4 * TABLE_COL_WIDTH, Math.max(naturalWidth(t, col, measure), objs));
      if (k !== undefined && k.width !== w) {
        cols.push([k.id, w]);
        widths[col] = w;
      }
    }
    const need = requiredSizes(t, linked, widths, measure).rows;
    const rows = t.rows.flatMap((r, i): (readonly [string, number])[] => {
      const h = need[i] ?? r.height;
      if (i === row) return h !== r.height ? [[r.id, h]] : [];
      return h > r.height ? [[r.id, h]] : [];
    });
    if (cols.length > 0 || rows.length > 0) ctx.run({ type: "SetTableLineSizes", id, cols, rows });
  };
```

Dans `begin`, dans le bloc `if (grab !== null)` de TB1, avant `const start = …` :

```ts
        const tap = lastTap;
        const same = tap !== null && tap.id === grab.id && tap.edge.axis === grab.edge.axis && tap.edge.index === grab.edge.index;
        if (same && s.t - tap.t <= DOUBLE_TAP_MS && Math.hypot(s.x - tap.x, s.y - tap.y) <= DOUBLE_TAP_PX) {
          lastTap = null;
          swallowed = pointerId;
          fitContent(grab.id, grab.transform, grab.table, grab.edge.axis === "col" ? grab.edge.index : null, grab.edge.axis === "row" ? grab.edge.index : null);
          refresh();
          ctx.stateChanged?.();
          return;
        }
        lastTap = { id: grab.id, edge: grab.edge, t: s.t, x: s.x, y: s.y };
```

Dans `close` (bloc `rz` de TB1) : si `rz.size !== rz.size0`, `lastTap = null;` (un glisser n'est pas un appui).
`act` : `case "fit-content": fitContent(ref.id, at.transform, t, span.c1, span.r1); break;`.
`keys.ts` : `TableKey` + `| "fit-content"` ; dans `tableKey`, à côté de Alt+E : `if (!e.shiftKey && e.code === "KeyA") return "fit-content";`.
`shortcuts.ts` : `s("table-fit-content", "Tableau", "Ajuster au contenu", "Alt+A"),` (vérifié libre).

- [ ] **5. Vert** — commande bornée ; `table.test.ts` entier vert.

- [ ] **6. Essai (bloc S7)** — après S10, sur le tableau de S6 :

```js
  // S7 (D14) : « Photosynthèse » dans la case (2, 0), double appui sur la poignée droite de cette case.
  await page.click(item("table"));
  await fr();
  await mouse.click(...cell6(2, 0));
  await page.keyboard.type("Photosynthèse");
  await page.keyboard.press("Escape");
  await fr();
  await page.click(item("select"));
  await fr();
  await selectAt(screen(c, origin[0], origin[1] + DY6 + ROW / 2));
  const [w0x0, , w0x1] = await boundsOf();
  await page.keyboard.press("Escape");
  await page.click(item("table"));
  await fr();
  await mouse.click(...cell6(2, 0));
  await page.keyboard.press("Escape");
  await fr();
  const g7 = screen(c, origin[0] + COL, origin[1] + DY6 + ROW * 2.5);
  await mouse.click(g7[0], g7[1]);
  await mouse.click(g7[0], g7[1]);
  await fr();
  await capture("ajuste-contenu");
  await page.click(item("select"));
  await fr();
  await selectAt(screen(c, origin[0], origin[1] + DY6 + ROW / 2));
  const [w1x0, , w1x1] = await boundsOf();
  check(w1x1 - w1x0 < w0x1 - w0x0 && w1x1 - w1x0 > w0x1 - w0x0 - 240, `S7 : la colonne prend la largeur du mot (${w0x1 - w0x0} → ${w1x1 - w1x0})`);
  await page.keyboard.press("Escape");
  await fr();
```

(Si l'essai trouve la saisie de S6 ouverte, `Escape` d'abord. Deux `mouse.click` successifs de Playwright tombent sous
300 ms.)

- [ ] **7. Commit** — message `feat(web): double tap a table border or Alt+A to fit a column or a row to its content`
+ `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, auteur G11.

---

### Tâche TB4 — Point 8 : alignement (`ha`, `va`, `SetTableLook`), un seul décalage `cellTextFrame` lu par le dessin, le pot et la saisie

<a id="tache-tb4"></a>

**Objectif** (S8, D15, S17) : clés de case `ha` (`center`, `right` ; absent = gauche) et `va` (`middle`, `bottom` ; absent
= haut) ; `SetTableLook { id, from, to, ha?, va? }` sur la plage, une étape ; **un seul calcul** du cadre du texte,
`cellTextFrame`, lu par le dessin (`cellTextBoxes` → `canvas2d`), le pot (`fill-target.ts`) et la saisie
(`tools/table.ts`, `openActive`) ; `layoutRich` et `offsetAt` gagnent `ha` (décalage par ligne). Gestes : menu de case
(2 rangées de 3 icônes), Alt+Maj+L / C / R, Alt+Maj+H / M / D.

**Patron à ne pas reprendre** : calculer le décalage dans chaque consommateur (le peintre décale ses lignes, le pot
recalcule depuis le coin `cellInnerBox`, la saisie part du coin). Aujourd'hui les trois partent de `cellInnerBox` :
`apps/web/src/engine/fill-target.ts:72-73`, `apps/web/src/engine/tools/table.ts:205-215` (`openActive`),
`apps/web/src/engine/render/canvas2d.ts:545-556` + `apps/web/src/engine/render/table-paint.ts:127-137`. Le chemin de
référence est **une** fonction `cellTextFrame` (repère local) + `ha` passé à `layoutRich` ; aucun des trois ne fait
d'arithmétique d'alignement lui-même. Parité faux cœur / vrai cœur : patron de `SetTableShade`
(`crates/roomboard-core/src/table.rs:997-1084` `set_on_targets`, `apps/web/src/core/fake-core.ts:937-948` `setOnTargets`),
mais **deux clés dans une transaction**, et contrôle des valeurs **avant** la recherche du tableau.

**Fichiers** : voir la ligne TB4 de la table. Créer `crates/roomboard-core/src/table_look.rs` ; `lib.rs` : `pub mod table_look;` après `pub mod table_links;`.

**Interfaces**
- Rust :
  - `Command::SetTableLook { id: String, from: (String, String), to: (String, String), ha: Option<String>, va: Option<String> }` ; refus, dans cet ordre : `ha` hors `left|center|right` ou `va` hors `top|middle|bottom` → `BadTable` ; tableau inconnu → `UnknownElement` ; coin inconnu → `BadTable` ; rien ne change → aucune étape. `"left"` / `"top"` retirent la clé.
  - `RawCell.ha: Option<String>`, `RawCell.va: Option<String>` (lecture : valeur admise seulement, sinon `None`, valeur gardée) ; `TableCellView.ha`, `.va` (`skip_serializing_if = "Option::is_none"`) ; `view` liste une case qui n'a que `ha` ou `va`.
  - `table.rs` passe en `pub(crate)` : `targets`, `cells_map`, `insert_cell`, `RawTable::rect`, `RawTable::key`, `Document::table_done`.
  - Wasm : `set_table_look(&mut self, id: &str, from_row: &str, from_col: &str, to_row: &str, to_col: &str, ha: Option<String>, va: Option<String>) -> Result<JsValue, JsError>` et `set_table_look_inner(&mut self, id: &str, from: [&str; 2], to: [&str; 2], ha: Option<String>, va: Option<String>) -> Result<Change, CommandError>`.
- TS :
  - `export type HAlign = "left" | "center" | "right"; export type VAlign = "top" | "middle" | "bottom";` (`api.ts`) ; `| { readonly type: "SetTableLook"; readonly id: string; readonly from: CellIds; readonly to: CellIds; readonly ha?: HAlign; readonly va?: VAlign }` ; `TableCell.ha?: "center" | "right"`, `TableCell.va?: "middle" | "bottom"`.
  - `layoutRich(spans, base, boxWidth, measure, ha: HAlign = "left")` ; `offsetAt(spans, base, boxWidth, measure, lx, ly, ha: HAlign = "left")`.
  - `export interface CellTextFrame { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly ha: HAlign }` ; `export function cellTextFrame(t: TableData, cell: Cell, spans: readonly TextSpan[], size: number, measure: Measure): CellTextFrame` (`table-geom.ts`).
  - `CellTextBox` gagne `readonly ha: HAlign` ; `cellTextBoxes(t: TableData, measure: Measure): CellTextBox[]`.
  - `TextEditSession.align?: HAlign` (`tools/text.ts`) ; `text-editor.ts` pose `style.textAlign`.
  - `TableAction` + `"ha-left" | "ha-center" | "ha-right" | "va-top" | "va-middle" | "va-bottom"` ; `TableKey` idem ; `CellMenuItem.id` idem ; `CellMenuItem.group?: "ha" | "va"`.
  - `TableCellState.ha?: HAlign`, `.va?: VAlign` ; `#stage[data-table-align]` = `"<ha>,<va>"` de la case active (`left,top` par défaut).
  - CLI : `COMMAND_TYPES` + `"SetTableLook"`.
- Réutilise : `crates/roomboard-core/src/table.rs:498` `targets`, `:476` `cells_map`, `:484` `insert_cell`, `:591` `RawTable::rect` — ancres et cellules de la plage (étendre : `pub(crate)`).
- Réutilise : `apps/web/src/engine/table-geom.ts:233` `cellInnerBox` — `cellTextFrame` le prolonge (étendre).
- Réutilise : `apps/web/src/engine/text-layout.ts:243` `layoutRich`, `:264` `offsetAt` — paramètre `ha` (étendre).
- Réutilise : `apps/web/src/ui/cell-menu.ts` — rangées d'icônes (étendre).
- Le rapport porte une ligne par module : `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée**
- `nice -n 10 cargo test -p roomboard-core table_look -j 4 2>&1 | tail -10` (4 passés : `set_table_look_writes_and_clears`, `set_table_look_refusals`, `look_cell_listed_in_view`, `look_reload_keeps_values`).
- `nice -n 10 cargo test -p roomboard-wasm set_table_look -j 4 2>&1 | tail -6` (1 passé).
- Commande M, puis `pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts -t "SetTableLook" 2>&1 | tail -8` (4 passés, deux fabriques, « vrai module wasm » présent).
- `pnpm --filter @roomboard/web exec vitest run src/engine/table-geom.test.ts src/engine/text-layout.test.ts src/engine/fill-target.test.ts src/engine/tools/table.test.ts src/engine/render/table-paint.test.ts src/ui/cell-menu.test.ts src/ui/icons.test.ts src/ui/shortcuts.test.ts src/engine/input/keys.test.ts -t "cellTextFrame|D15|S8|cell-menu|ICONS|shortcuts|tableKey" 2>&1 | tail -8` (`cellTextFrame` : 3, `D15` : 4, `S8` : 1).
- `pnpm --filter @roomboard/cli exec vitest run src/ops.test.ts 2>&1 | tail -6` (vert ; compte + 1) ; CLI `CLI : OK` avec la ligne `T-B4`.
- Garder verts : `zone-s6-banc.test.ts` (empreinte S6, D30 : le pot passe par `cellTextFrame` seulement pour une case de tableau).

**Preuve visuelle** : lectures d'abord — `#stage[data-table-align]` = `center,middle` sur les deux cases ; puis capture 2x
`texte-centre.png` à décrire (texte au centre des deux cases).

**Contraintes (recopiées)** :
- G1 TDD : rouge d'abord. · G2 worktree partagé. · G3 `nice -n 10`, `cargo -j 4`, preuves bornées.
- G4 Module mesuré (commande M) ; seuil 1 540 000 o ; au-delà, arrêt et rapport.
- G5 `ha`, `va` facultatifs ; valeur illisible ignorée et gardée ; test « recharger garde ».
- G6 CLI : `COMMAND_TYPES`, `ops.test.ts`, `cli-essai.mjs` ; `FORMAT_LOTS` inchangé.
- G7 Une étape par geste. · G8 raccourcis vérifiés libres, lignes `EXPECT`, menu ≥ 44 px.
- G9 Hors tableau inchangé (texte libre : `layoutRich` sans `ha` = aujourd'hui). · G10 interdits. · G11 commits.
- G12 Essai : bloc S8, lectures d'abord, capture avec `--captures` seulement. · G13 icônes Lucide recopiées, notice.

**Interdits** : aucun décalage calculé hors de `cellTextFrame` et `layoutRich` ; ne pas déplacer un objet logé quand
l'alignement change (D8 : l'alignement ne sert qu'au logement) ; `border` : TB5.

**Terminé quand** : preuves vertes, essai `ok — S8 : texte centré`, commande M ≤ 1 540 000, un commit.

#### Étapes

- [ ] **1. Tests rouges (cœur)** — `table_look.rs`, module de tests (helpers recopiés de `table_links.rs:543-583`) :

```rust
#[cfg(test)]
mod tests {
    use crate::commands::{Command, CommandError};
    use crate::document::Document;

    fn first(d: &Document) -> String {
        d.page_ids()[0].clone()
    }
    fn table3(d: &mut Document, p: &str) -> String {
        d.apply(Command::AddTable {
            page: p.into(), x: 0.0, y: 0.0, cols: 3, rows: 3, col_width: 240.0, row_height: 64.0,
            color: "#000000".into(), size: 36.0,
        })
        .expect("tableau")
        .ids[0]
            .clone()
    }
    fn view(d: &Document, id: &str) -> crate::table::TableView {
        d.element(id).and_then(|v| v.table).expect("vue")
    }
    fn ids(d: &Document, t: &str, r: usize, c: usize) -> (String, String) {
        let v = view(d, t);
        (v.rows[r].id.clone(), v.cols[c].id.clone())
    }
    fn look(id: &str, from: (String, String), to: (String, String), ha: Option<&str>, va: Option<&str>) -> Command {
        Command::SetTableLook { id: id.into(), from, to, ha: ha.map(Into::into), va: va.map(Into::into) }
    }

    #[test]
    fn set_table_look_writes_and_clears() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let (a, b) = (ids(&d, &t, 0, 0), ids(&d, &t, 0, 1));
        let c = d.apply(look(&t, a.clone(), b.clone(), Some("center"), Some("middle"))).expect("plage");
        assert_eq!(c.ids, vec![t.clone()]);
        let v = view(&d, &t);
        assert_eq!(v.cells.len(), 2);
        assert!(v.cells.iter().all(|x| x.ha.as_deref() == Some("center") && x.va.as_deref() == Some("middle")));
        let ver = d.version();
        d.apply(look(&t, a.clone(), b.clone(), Some("center"), None)).expect("même");
        assert_eq!(d.version(), ver);
        d.apply(look(&t, a.clone(), b.clone(), Some("left"), Some("top"))).expect("retour");
        assert!(view(&d, &t).cells.is_empty());
        d.undo();
        assert_eq!(view(&d, &t).cells.len(), 2);
    }

    #[test]
    fn set_table_look_refusals() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let a = ids(&d, &t, 0, 0);
        assert_eq!(d.apply(look("zz", a.clone(), a.clone(), Some("diagonal"), None)), Err(CommandError::BadTable));
        assert_eq!(d.apply(look(&t, a.clone(), a.clone(), None, Some("left"))), Err(CommandError::BadTable));
        assert_eq!(d.apply(look("zz", a.clone(), a.clone(), Some("right"), None)), Err(CommandError::UnknownElement("zz".into())));
        assert_eq!(d.apply(look(&t, ("x".into(), "y".into()), a.clone(), Some("right"), None)), Err(CommandError::BadTable));
    }

    #[test]
    fn look_cell_listed_in_view() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let a = ids(&d, &t, 2, 2);
        d.apply(look(&t, a.clone(), a.clone(), None, Some("bottom"))).expect("va");
        let v = view(&d, &t);
        assert_eq!(v.cells.len(), 1);
        assert_eq!(v.cells[0].text, "");
        assert_eq!(v.cells[0].va.as_deref(), Some("bottom"));
        assert_eq!(v.cells[0].ha, None);
    }

    #[test]
    fn look_reload_keeps_values() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta { app_version: "0.1.0".into(), now: "2026-11-27T00:00:00Z".into(), created: None };
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let a = ids(&d, &t, 1, 1);
        d.apply(look(&t, a.clone(), a.clone(), Some("right"), Some("middle"))).expect("look");
        let back = load(&save(&d, &meta).expect("save")).expect("load");
        assert_eq!(back.element(&t), d.element(&t));
    }
}
```

`crates/roomboard-wasm/src/lib.rs`, à côté de `place_in_cell_inner_links_and_sizes` :

```rust
    #[test]
    fn set_table_look_inner_centers_a_cell() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d.add_table_inner(&p, [0.0, 0.0], [2, 2], [240.0, 64.0], "#000000", 36.0).expect("tableau").ids[0].clone();
        let t = table_of(&d, &id);
        let (r, c) = (t.rows[0].id.clone(), t.cols[0].id.clone());
        d.set_table_look_inner(&id, [&r, &c], [&r, &c], Some("center".into()), None).expect("look");
        assert_eq!(table_of(&d, &id).cells[0].ha.as_deref(), Some("center"));
    }
```

- [ ] **2. Rouge** — `nice -n 10 cargo test -p roomboard-core table_look -j 4 2>&1 | tail -10` : erreur de compilation (variante absente) attendue.

- [ ] **3. Cœur** — `table.rs` : `RawCell` gagne `pub ha: Option<String>, pub va: Option<String>,` ; dans `read_cell` :

```rust
    let ha = out_string(map.get(txn, "ha")).filter(|v| crate::table_look::HA.contains(&v.as_str()));
    let va = out_string(map.get(txn, "va")).filter(|v| crate::table_look::VA.contains(&v.as_str()));
```

(et `ha, va,` dans le `RawCell { … }`). `TableCellView` gagne :

```rust
    /// personnalisation-3 (D15) : `center` ou `right` ; absent = gauche.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ha: Option<String>,
    /// personnalisation-3 (D15) : `middle` ou `bottom` ; absent = haut.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub va: Option<String>,
```

`view` : la condition de saut devient
`if cell.content.is_empty() && cell.fill.is_none() && cell.shade.is_none() && cell.ha.is_none() && cell.va.is_none() { continue; }`
(garder les clés ajoutées par T9 dans cette condition) et `ha: cell.ha, va: cell.va,` dans `TableCellView { … }`. Tout
autre `TableCellView { … }` construit ailleurs (`grep -rn "TableCellView {" crates`) reçoit `ha: None, va: None`.
Passer en `pub(crate)` : `fn targets`, `fn cells_map`, `fn insert_cell`, `fn rect`, `fn key` (impl `RawTable`), `fn table_done`.
En-tête du schéma (lignes 1-10) : ajouter « `ha`, `va` : alignement (personnalisation-3, `table_look.rs`) ».

`table_look.rs` (au-dessus du module de tests) :

```rust
//! Réglages de case (personnalisation-3, D15 ; D16 en TB5) : `ha` (`center`, `right` ; absent = gauche) et `va`
//! (`middle`, `bottom` ; absent = haut) posés sur les ancres et cellules simples d'une plage, en une transaction. La page
//! calcule le décalage (`cellTextFrame`) ; le cœur n'écrit que les valeurs (DA4).
use yrs::{In, Map};

use crate::commands::{Change, CommandError};
use crate::document::Document;
use crate::table::{cells_map, insert_cell, merges_of, read_cell, targets, RawCell};

/// Valeurs écrites de `ha` et de `va` (les défauts `left` et `top` ne s'écrivent pas).
pub(crate) const HA: [&str; 2] = ["center", "right"];
pub(crate) const VA: [&str; 2] = ["middle", "bottom"];

/// Demande d'une clé : `None` inchangée, `Some(None)` retirée (valeur par défaut), `Some(Some(v))` écrite.
type Want = Option<Option<String>>;

fn wanted(v: Option<&str>, default: &str, allowed: &[&str]) -> Result<Want, CommandError> {
    match v {
        None => Ok(None),
        Some(x) if x == default => Ok(Some(None)),
        Some(x) if allowed.contains(&x) => Ok(Some(Some(x.to_string()))),
        Some(_) => Err(CommandError::BadTable),
    }
}

/// Vrai si la case lue diffère de la demande (case absente : aucune valeur).
fn differs(now: Option<&String>, want: &Want) -> bool {
    match want {
        None => false,
        Some(w) => now != w.as_ref(),
    }
}

impl Document {
    /// `SetTableLook` (D15) : valeurs contrôlées d'abord, puis tableau et plage ; seulement les cases qui changent ;
    /// rien ne change : aucune étape.
    pub(crate) fn cmd_set_table_look(
        &mut self,
        id: &str,
        from: (&str, &str),
        to: (&str, &str),
        ha: Option<&str>,
        va: Option<&str>,
    ) -> Result<Change, CommandError> {
        let ha = wanted(ha, "left", &HA)?;
        let va = wanted(va, "top", &VA)?;
        let (page, e, raw) = self.table_of(id)?;
        let rect = raw.rect(from, to).ok_or(CommandError::BadTable)?;
        let todo: Vec<((usize, usize), Option<RawCell>)> = {
            let txn = self.read();
            let merges = merges_of(&raw, &txn);
            targets(&rect, &merges)
                .into_iter()
                .filter_map(|(r, c)| {
                    let cell = read_cell(&txn, raw.cells.as_ref(), &raw.rows[r].id, &raw.cols[c].id);
                    let (h, v) = (cell.as_ref().and_then(|x| x.ha.as_ref()), cell.as_ref().and_then(|x| x.va.as_ref()));
                    (differs(h, &ha) || differs(v, &va)).then_some(((r, c), cell))
                })
                .collect()
        };
        if todo.is_empty() {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            let cells = cells_map(&mut txn, &e, raw.cells.as_ref());
            for ((r, c), cell) in todo {
                let map = match cell {
                    Some(x) => x.map,
                    None => insert_cell(&mut txn, &cells, raw.key(r, c), "", Vec::new()),
                };
                for (key, want) in [("ha", &ha), ("va", &va)] {
                    match want {
                        Some(Some(v)) => {
                            map.insert(&mut txn, key, In::from(v.as_str()));
                        }
                        Some(None) => {
                            map.remove(&mut txn, key);
                        }
                        None => {}
                    }
                }
            }
        }
        Ok(self.table_done(page, id))
    }
}
```

`commands.rs` : variante (après `SetTableOptions`) :

```rust
    /// personnalisation-3 (D15) : alignement de la plage ; `ha` `"left"` et `va` `"top"` retirent la clé ; autre valeur
    /// inconnue : `BadTable` (avant la recherche du tableau) ; rien ne change : aucune étape.
    SetTableLook {
        id: String,
        from: (String, String),
        to: (String, String),
        ha: Option<String>,
        va: Option<String>,
    },
```

et dans `apply` : `Command::SetTableLook { id, from, to, ha, va } => self.cmd_set_table_look(&id, (&from.0, &from.1), (&to.0, &to.1), ha.as_deref(), va.as_deref()),`.
Si `yrs::Map` est déjà importé ou si `In::from(&str)` ne compile pas, suivre la forme de `set_on_targets` (`In::from(v)` avec `v: &str`).

- [ ] **4. Wasm** — dans le bloc `#[wasm_bindgen]`, après `set_table_options` :

```rust
    /// personnalisation-3 (D15) : `ha` (`left` retire, `center`, `right`), `va` (`top` retire, `middle`, `bottom`) sur la
    /// plage ; absent : inchangé.
    #[allow(clippy::too_many_arguments)]
    pub fn set_table_look(
        &mut self,
        id: &str,
        from_row: &str,
        from_col: &str,
        to_row: &str,
        to_col: &str,
        ha: Option<String>,
        va: Option<String>,
    ) -> Result<JsValue, JsError> {
        to_js(
            &self
                .set_table_look_inner(id, [from_row, from_col], [to_row, to_col], ha, va)
                .map_err(cmd_err)?,
        )
    }
```

et, après `set_table_options_inner` :

```rust
    pub fn set_table_look_inner(
        &mut self,
        id: &str,
        from: [&str; 2],
        to: [&str; 2],
        ha: Option<String>,
        va: Option<String>,
    ) -> Result<Change, CommandError> {
        self.run(Command::SetTableLook {
            id: id.to_string(),
            from: (from[0].to_string(), from[1].to_string()),
            to: (to[0].to_string(), to[1].to_string()),
            ha,
            va,
        })
    }
```

Vert cœur et Wasm (commandes bornées), puis **commande M** (≤ 1 540 000, relever le nombre).

- [ ] **5. Contrat TS (rouge puis vert)** — `wasm-core.contract.test.ts`, dans `describe.each(c10aFactories)("contrat personnalisation-3 : $name", …)` :

```ts
  it("SetTableLook (D15) : centre et milieu sur deux cases, une étape ; même demande : aucune ; left/top retirent", () => {
    const d = f.blank();
    const s = p3Placed(d);
    const [, r0, c0] = s.link(0, 0);
    const [, , c1] = s.link(0, 1);
    const from = { row: r0, col: c0 };
    const to = { row: r0, col: c1 };
    expect(d.apply({ type: "SetTableLook", id: s.t, from, to, ha: "center", va: "middle" }).ids).toEqual([s.t]);
    expect(tableOf(d, s.t).cells.map((c) => [c.ha, c.va])).toEqual([["center", "middle"], ["center", "middle"]]);
    unchanged(d, () => d.apply({ type: "SetTableLook", id: s.t, from, to, ha: "center" }));
    d.apply({ type: "SetTableLook", id: s.t, from, to, ha: "left", va: "top" });
    expect(tableOf(d, s.t).cells).toEqual([]);
    d.free();
  });

  it("SetTableLook refusé : valeur inconnue avant tableau inconnu ; coin inconnu ; recharger garde ha et va", () => {
    const d = f.blank();
    const s = p3Placed(d);
    const [, r0, c0] = s.link(0, 0);
    const one = { row: r0, col: c0 };
    unchanged(d, () => expect(messageOf(() => d.apply({ type: "SetTableLook", id: "zz", from: one, to: one, ha: "diag" as "left" }))).toBe(TABLE_MESSAGE));
    unchanged(d, () => expect(messageOf(() => d.apply({ type: "SetTableLook", id: s.t, from: { row: "x", col: "y" }, to: one, ha: "right" }))).toBe(TABLE_MESSAGE));
    d.apply({ type: "SetTableLook", id: s.t, from: one, to: one, ha: "right", va: "bottom" });
    const back = f.load(d.save(SAVE_META));
    expect(tableOf(back, s.t).cells[0]).toMatchObject({ ha: "right", va: "bottom" });
    back.free();
    d.free();
  });
```

(`f.load`, `d.save`, `SAVE_META` : prendre les noms exacts du test « personnalisation-3 recharger garde cell (S17) »,
ligne ≈ 2150, et les recopier.) Puis : `api.ts` (types, variante, champs de `TableCell`, commentaire d'en-tête) ;
`wasm-core.ts` : `case "SetTableLook": return toChange(this.d.set_table_look(cmd.id, cmd.from.row, cmd.from.col, cmd.to.row, cmd.to.col, cmd.ha, cmd.va));`
et, dans la projection des cellules (ligne ≈ 163) : lire `ha`, `va` de `c` et ajouter
`...(ha === "center" || ha === "right" ? { ha } : {}), ...(va === "middle" || va === "bottom" ? { va } : {})` à l'objet rendu.
`fake-core.ts` : `FakeCell` gagne `readonly ha?: "center" | "right"; readonly va?: "middle" | "bottom";` ; `tableView`
inclut une case si `cell.ha !== undefined || cell.va !== undefined` et recopie ces champs s'ils sont présents ;
l'enregistrement et la relecture du faux fichier recopient `ha`, `va` comme `fill` (chercher `shade` dans la lecture des
cellules du faux fichier et suivre le même chemin) ; cas de commande :

```ts
      case "SetTableLook": {
        // personnalisation-3 (D15), comme `cmd_set_table_look` : valeurs d'abord, puis tableau, plage ; seulement ce qui change.
        const want = <T extends string>(v: string | undefined, def: string, ok: readonly T[]): T | null | undefined => {
          if (v === undefined) return undefined;
          if (v === def) return null;
          if ((ok as readonly string[]).includes(v)) return v as T;
          throw new Error(MESSAGES.badTable);
        };
        const ha = want(cmd.ha, "left", ["center", "right"] as const);
        const va = want(cmd.va, "top", ["middle", "bottom"] as const);
        const { found, t } = this.tableOf(cmd.id);
        const rect = rectOf(t, cmd.from, cmd.to);
        if (rect === null) throw new Error(MESSAGES.badTable);
        const cells = new Map(t.cells);
        let changed = false;
        for (const [r, c] of targets(rect, mergesOf(t))) {
          const k = keyAt(t, r, c);
          const cell = t.cells.get(k) ?? EMPTY_CELL;
          const nh = ha === undefined ? cell.ha : (ha ?? undefined);
          const nv = va === undefined ? cell.va : (va ?? undefined);
          if (nh === cell.ha && nv === cell.va) continue;
          const { ha: _h, va: _v, ...rest } = cell;
          cells.set(k, { ...rest, ...(nh ? { ha: nh } : {}), ...(nv ? { va: nv } : {}) });
          changed = true;
        }
        return changed ? this.writeTable(found, cmd.id, { ...t, cells }) : this.unchanged();
      }
```

Contrat vert (deux fabriques, « vrai module wasm » présent).

- [ ] **6. CLI** — `ops.ts` : `"SetTableLook"` après `"SetTableOptions"` ; `ops.test.ts` : le compte passe de N à N + 1 (N = valeur
au départ de la tâche, 40 si T9 a livré `SetCellImage`, 39 sinon), dans le titre et dans `toBe(…)` ; `cli-essai.mjs`, après
`T-B2` :

```js
  // personnalisation-3 (TB4) : SetTableLook centre la case (0, 0), relu par `state`.
  const r0 = reluHead.table.rows[0].id;
  const c0 = reluHead.table.cols[0].id;
  const lk = cli(["run", pl, "--save", "--ops", "-"], lignesOps({ type: "SetTableLook", id: tab.id, from: { row: r0, col: c0 }, to: { row: r0, col: c0 }, ha: "center" }, { op: "state" }));
  const reluLk = /* même lecture que reluHead */ null;
  verifie("T-B4 : SetTableLook ha center, relu par state", lk.code === 0 && reluLk?.table?.cells?.some((x) => x.ha === "center") === true, lk.brut);
```

(remplacer `/* même lecture que reluHead */ null` par l'expression de lecture de `reluHead` appliquée à `lk.brut`).

- [ ] **7. Mise en lignes et cadre (rouge puis vert)** — `text-layout.test.ts` :

```ts
it("D15 layoutRich ha : décalage par ligne (center : moitié du reste, right : tout le reste) ; left : inchangé", () => {
  const m = (s: string) => s.length * 10;
  const sp = [{ text: "ab\nabcd", attrs: {} }];
  expect(layoutRich(sp, { size: 10 }, 100, m, "center").map((l) => l.segments[0]?.x)).toEqual([40, 30]);
  expect(layoutRich(sp, { size: 10 }, 100, m, "right").map((l) => l.segments[0]?.x)).toEqual([80, 60]);
  expect(layoutRich(sp, { size: 10 }, 100, m)).toEqual(layoutRich(sp, { size: 10 }, 100, m, "left"));
});
```

`layoutRich` (ajouter le paramètre et décaler chaque ligne ; `HAlign` importé de `../core/api`) :

```ts
export function layoutRich(spans: readonly TextSpan[], base: { readonly size: number }, boxWidth: number, measure: Measure, ha: HAlign = "left"): RichLine[] {
  const lines: RichLine[] = [];
  let top = 0;
  const k = ha === "center" ? 0.5 : ha === "right" ? 1 : 0;
  for (const para of paragraphs(spans, base)) {
    const broken = breakParagraph(para.pieces, boxWidth, measure);
    broken.forEach((pieces, i) => {
      const empty = i === broken.length - 1 && para.end !== null ? para.end : base.size;
      const line = toLine(pieces, top, empty, measure);
      const last = line.segments[line.segments.length - 1];
      const dx = k === 0 || last === undefined ? 0 : Math.max(0, boxWidth - (last.x + last.width)) * k;
      lines.push(dx === 0 ? line : { ...line, segments: line.segments.map((s) => ({ ...s, x: s.x + dx })) });
      top += line.height;
    });
  }
  return lines;
}
```

`offsetAt` gagne `ha: HAlign = "left"` en dernier paramètre et appelle `layoutRich(spans, base, boxWidth, measure, ha)`.
`table-geom.test.ts` :

```ts
import { cellTextFrame } from "./table-geom";
describe("cellTextFrame (D15)", () => {
  const m = (s: string) => s.length * 10;
  const t = (ha?: "center" | "right", va?: "middle" | "bottom"): TableData => ({
    color: "#000", size: 20, merges: [],
    cols: [{ id: "a", width: 240 }], rows: [{ id: "r", height: 100 }],
    cells: [{ row: "r", col: "a", text: "ab", fill: null, shade: null, spans: [{ text: "ab", attrs: {} }], ...(ha ? { ha } : {}), ...(va ? { va } : {}) }],
  });
  const sp = [{ text: "ab", attrs: {} }];
  it("cellTextFrame : haut-gauche = boîte intérieure", () => {
    expect(cellTextFrame(t(), { row: 0, col: 0 }, sp, 20, m)).toEqual({ x: 8, y: 8, w: 224, h: 84, ha: "left" });
  });
  it("cellTextFrame : milieu : y décalé de la moitié du reste (84 − 25) / 2", () => {
    expect(cellTextFrame(t("center", "middle"), { row: 0, col: 0 }, sp, 20, m)).toEqual({ x: 8, y: 8 + 29.5, w: 224, h: 84 - 29.5, ha: "center" });
  });
  it("cellTextFrame : bas : y décalé de tout le reste", () => {
    expect(cellTextFrame(t(undefined, "bottom"), { row: 0, col: 0 }, sp, 20, m).y).toBe(8 + 59);
  });
});
```

`table-geom.ts` :

```ts
/** Cadre du texte d'une case (D15), repère local : seul calcul du décalage d'alignement, lu par le dessin
 *  (`cellTextBoxes`), le pot (`fill-target.ts`) et la saisie (`tools/table.ts`). `x`, `w` : boîte intérieure (le décalage
 *  horizontal est fait ligne par ligne par `layoutRich(…, ha)`) ; `y` : haut de la boîte, plus le reste × 0 (haut),
 *  × 0,5 (milieu), × 1 (bas) ; `h` : de `y` au bas de la boîte. Haut : aucune mesure. */
export interface CellTextFrame { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly ha: HAlign }
export function cellTextFrame(t: TableData, cell: Cell, spans: readonly TextSpan[], size: number, measure: Measure): CellTextFrame {
  const box = cellInnerBox(t, cell);
  const r = t.rows[cell.row];
  const k = t.cols[cell.col];
  const c = r === undefined || k === undefined ? undefined : t.cells.find((x) => x.row === r.id && x.col === k.id);
  const ha: HAlign = c?.ha ?? "left";
  const kv = c?.va === "middle" ? 0.5 : c?.va === "bottom" ? 1 : 0;
  const dy = kv === 0 ? 0 : Math.max(0, box.h - richBoxHeight(layoutRich(spans, { size }, box.w, measure))) * kv;
  return { x: box.x, y: box.y + dy, w: box.w, h: box.h - dy, ha };
}
```

(`HAlign` importé de `../core/api`, `richBoxHeight` déjà importé.)

- [ ] **8. Les trois consommateurs (rouge puis vert)** — tests :
`table-paint.test.ts` : `it("D15 S8 : cellTextBoxes rend le cadre aligné et ha", …)` — table 1 × 1, case `ha: "center", va: "middle"`,
`cellTextBoxes(t, m)` → `{ x: 8, y: 8 + 29.5, w: 224, h: 54.5, ha: "center" }` (mêmes valeurs que `cellTextFrame`).
`fill-target.test.ts` : `it("D15 : pot sur un mot centré : le mot dessiné est visé", …)` — case centrée contenant « ab cd »,
point sur le milieu de la boîte (là où « ab cd » est dessiné) : `fillCommand` rend une `SetTableCell` (mot visé), pas un
`SetTableFill` ; le même point sans alignement (texte à gauche) rend `SetTableFill`.
`table.test.ts` : `it("D15 : saisie ouverte au cadre aligné : matrice décalée de y, align center", …)` — `SetTableLook`
centre-milieu sur la case (0, 0), clic dedans : `s.host.last().matrix[5]` = 200 + `cellTextFrame(...).y`, `s.host.last().align` = `"center"` ;
et `it("D15 : menu et touches : ha-center, va-middle sur la plage", …)` — plage de deux cases (Maj+clic), `act("ha-center")`
→ `last()` = `{ type: "SetTableLook", id, from, to, ha: "center" }`.

Code — `table-paint.ts` :

```ts
export function cellTextBoxes(t: TableData, measure: Measure): CellTextBox[] {
  const out: CellTextBox[] = [];
  const zones = mergeRanges(t);
  for (const cell of t.cells) {
    if (cell.text === "" || cell.shade !== null) continue;
    const at = visibleCell(t, zones, cell);
    if (at === null) continue;
    const spans = t.header === true && at.row === 0 ? cell.spans.map((s) => ({ text: s.text, attrs: { ...s.attrs, bold: true as const } })) : cell.spans;
    out.push({ row: cell.row, col: cell.col, text: cell.text, ...cellTextFrame(t, at, spans, t.size, measure), spans });
  }
  return out;
}
```

(`CellTextBox` gagne `readonly ha: HAlign` ; importer `cellTextFrame`, `type Measure`.) `canvas2d.ts` :
`const boxes = cellTextBoxes(el.table, measureWith(ctx));` ; dans `cellLinesOf`, clé
`` `${t.size}|${JSON.stringify(boxes.map((b) => [b.w, b.ha, b.spans]))}` `` et
`layoutRich(b.spans, { size: t.size }, b.w, measure, b.ha)`. `fill-target.ts`, lignes 72-73 :

```ts
  const f = cellTextFrame(t, cell, content.spans, t.size, measure);
  const at = offsetAt(content.spans, { size: t.size }, f.w, measure, cx - f.x, cy - f.y, f.ha);
```

`tools/text.ts` : `TextEditSession` gagne `/** personnalisation-3 (D15) : alignement de la saisie d'une case ; absent : gauche. */ readonly align?: HAlign;`.
`app/text-editor.ts`, dans `open` : `s.textAlign = session.align ?? "left";`. `tools/table.ts`, `openActive` :

```ts
    const frame = cellTextFrame(at.table, at.cell, spans, at.table.size, measure);
```

(après la ligne `const { text, spans, fill } = …`, et `inner` remplacé par `frame` dans `matrix: composeMatrix(at.transform, translateMatrix(frame.x, frame.y))`,
`boxWidth: frame.w`, plus `align: frame.ha` dans la session). Les autres usages de `cellTextBoxes(t)` (`grep -rn "cellTextBoxes(" apps/web/src`, PDF compris)
passent la mesure du même contexte.

- [ ] **9. Gestes** — `table-geom.ts` : `TableAction` + `| "ha-left" | "ha-center" | "ha-right" | "va-top" | "va-middle" | "va-bottom"` ;
`TableCellState` + `readonly ha?: HAlign; readonly va?: VAlign;`. `tools/table.ts`, `act` :

```ts
        case "ha-left":
        case "ha-center":
        case "ha-right":
        case "va-top":
        case "va-middle":
        case "va-bottom": {
          const corners = cornersOf(t, span);
          if (corners === null) break;
          const v = a.slice(3);
          ctx.run(a.startsWith("ha-") ? { type: "SetTableLook", id: ref.id, ...corners, ha: v as HAlign } : { type: "SetTableLook", id: ref.id, ...corners, va: v as VAlign });
          break;
        }
```

`cellState` : `ha` et `va` de la case active (`cellContent` ne les rend pas : lire `t.cells.find(...)`), `"left"`/`"top"` par défaut.
`openMenu` : ajouter à la fin
`…["left", "center", "right"].map((h) => ({ id: `ha-${h}`, group: "ha", label: { left: "Aligner à gauche", center: "Centrer", right: "Aligner à droite" }[h], run: () => api.act(`ha-${h}`) }))`
et de même pour `va` (« En haut », « Au milieu », « En bas ») — écrire les six entrées en clair, typées `CellMenuItem`.
**Plage gardée à l'appui long** (sinon S8 au doigt est impossible : `begin` appelle `setActive`, qui retire la plage) :
dans `begin`, si la case touchée est dans la plage courante du même tableau (`rangeOf(at)` contient `hit.cell`), ne pas
appeler `setActive(ref)` ; mémoriser `keep: ref` dans `Press` (champ neuf `readonly keep: CellRef | null`) ; au relâché sans
mouvement ni menu : `setActive(p.keep)` puis `openActive()` (comportement d'aujourd'hui) ; dans `extend`, au premier
changement de case : `if (p.keep !== null) { active = p.keep; corner = null; }` avant `setCorner`. Test :
`it("D15 : appui long dans une plage : le menu agit sur la plage", …)` (plage par Maj+clic, appui long 500 ms dans la plage,
entrée `ha-center` : `SetTableLook` de `from` à `to` de la plage).
`cell-menu.ts` : `id` + les six ids ; `readonly group?: "ha" | "va";` ; `ICON_OF` : `"ha-left": "text-align-start", "ha-center": "text-align-center", "ha-right": "text-align-end", "va-top": "align-vertical-justify-start", "va-middle": "align-vertical-justify-center", "va-bottom": "align-vertical-justify-end"` ;
dans `open`, les entrées consécutives d'un même `group` vont dans un `div.rb-cell-menu-row[role="group"]` ; une entrée de
rangée qui a une icône ne montre pas son texte (`aria-label` = libellé, `title` = libellé). Test `cell-menu.test.ts` :
« cell-menu rangée : trois boutons d'icône de 44 px dans un role=group, aria-label posé ». `rb.css` :
`.rb-cell-menu-row { display: flex; gap: 2px; }`. `icons.ts` : six tracés Lucide recopiés par `gh api` (noms ci-dessus ;
si `text-align-*` est absent à ce commit, prendre `align-left`, `align-center`, `align-right`), `icons.test.ts` (compte + 6,
objet `LOT_P3` complété), notice. `keys.ts` : dans `tableKey`, bloc `if (e.shiftKey)` :
`if (e.code === "KeyL") return "ha-left"; if (e.code === "KeyC") return "ha-center"; if (e.code === "KeyR") return "ha-right"; if (e.code === "KeyH") return "va-top"; if (e.code === "KeyM") return "va-middle"; if (e.code === "KeyD") return "va-bottom";`
(`TableKey` étendu). `shortcuts.ts` : six lignes (« Aligner à gauche » Alt+Maj+L … « Aligner en bas » Alt+Maj+D) et leurs
`EXPECT`. Vérifié libre : aucune Alt+Maj+lettre dans `keys.ts` ni `shortcuts.ts`. `stage-tags.ts` : `tableAlign` →
`data-table-align` = `` `${ha},${va}` `` ou `""`.

- [ ] **10. Vert** — toutes les commandes bornées de la section, `zone-s6-banc.test.ts` compris, puis
`pnpm --filter @roomboard/web exec vitest run src 2>&1 | tail -8`.

- [ ] **11. Essai (bloc S8)** — après S7, sur le tableau de S6 : outil Tableau, clic sur la case (0, 1), saisir « ab »,
Échap, Maj+clic sur (0, 2) (plage de deux cases), `Alt+Shift+c`, `Alt+Shift+m` ; lecture
`check((await attr("data-table-align")) === "center,middle", "S8 : texte centré (data-table-align=center,middle)")` ; au doigt :
appui long dans la plage (aide `longPress` existante), clic `.rb-cell-menu [data-menu-item="ha-right"]`, lecture `right,middle` ;
Ctrl+Z ; `capture("texte-centre")`.

- [ ] **12. Mesure, commit** — commande M (≤ 1 540 000, nombre au rapport) ; fichiers de la ligne TB4 un par un ; message
`feat: cell text alignment (SetTableLook ha/va), one cellTextFrame read by painter, fill pot and cell editor`
+ `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, auteur G11.

---

### Tâche TB5 — Point 9 : bordures par case (`border` dans `SetTableLook`, dessin par bord, menu, Alt+B, Alt+Maj+B)

<a id="tache-tb5"></a>

**Objectif** (S9, D16, S17) : clé de case `border` = `Any::Array [couleur, épaisseur, style]` (`solid`, `dashed`,
`dotted`, `none`), posée par `SetTableLook.border` sur toutes les cellules de la plage (`null` : retirée, retour au trait
d'aujourd'hui) ; un bord commun prend le réglage de la cellule la plus en bas ou la plus à droite qui en a un ; `none`
efface ce bord ; sans aucun réglage dans le tableau : dessin d'aujourd'hui, au trait près. Gestes : menu (rangée
« Plein · Tirets · Points · Aucune », rangée « Fin · Épais · Par défaut »), Alt+B (plein), Alt+Maj+B (aucune).

**Fichiers** : voir la ligne TB5 de la table.

**Interfaces**
- Rust : `pub struct CellBorder { pub color: String, pub width: f64, pub style: String }` (`table_look.rs`) ; `RawCell.border: Option<CellBorder>` ; `TableCellView.border: Option<(String, f64, String)>` (`skip_serializing_if`, sérialisé en tableau) ; `Command::SetTableLook` gagne `border: Option<Option<CellBorder>>` (`None` inchangée, `Some(None)` retirée) ; refus `BadTable` : couleur invalide (`valid_color`), épaisseur non finie ou hors ]0, 32], style inconnu — contrôlés avec `ha`/`va`, avant le tableau.
- Wasm : `set_table_look(…, ha, va, border_mode: u8, border_color: Option<String>, border_width: Option<f64>, border_style: Option<String>)` — `0` inchangée, `1` posée (les trois valeurs exigées, sinon `BadTable`), `2` retirée ; `_inner` gagne `border: Option<Option<CellBorder>>`.
- TS : `export type BorderStyle = "solid" | "dashed" | "dotted" | "none"; export type CellBorder = readonly [string, number, BorderStyle];` ; `SetTableLook.border?: CellBorder | null` ; `TableCell.border?: CellBorder` ; `TableAction` + `"border-solid" | "border-dashed" | "border-dotted" | "border-none" | "border-thin" | "border-thick" | "border-clear"` ; `TableKey` + `"border-solid" | "border-none"` ; `CellMenuItem.group` + `"border" | "border-width"` ; `TableCellState.border?: string` (`"<couleur>/<épaisseur>/<style>"`) ; `#stage[data-table-border]`.
- Réutilise : `crates/roomboard-core/src/table_look.rs` `cmd_set_table_look` (TB4) — même plage, même transaction (étendre).
- Réutilise : `apps/web/src/engine/render/table-paint.ts:75` `paintTableGrid` — chemin d'aujourd'hui gardé tel quel sans réglage (étendre).
- Le rapport porte une ligne par module : `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée**
- `nice -n 10 cargo test -p roomboard-core table_look::tests::border -j 4 2>&1 | tail -10` (3 passés : `border_written_on_range`, `border_refusals`, `border_reload_keeps_bytes`).
- Commande M ; contrat `-t "border"` (4 passés).
- `pnpm --filter @roomboard/web exec vitest run src/engine/render/table-paint.test.ts src/engine/tools/table.test.ts src/ui/cell-menu.test.ts src/ui/shortcuts.test.ts src/engine/input/keys.test.ts -t "S9|border|shortcuts|tableKey" 2>&1 | tail -8` (`S9` : 3).
- CLI `T-B5` puis `CLI : OK`. Garder verts : `table-paint.test.ts` existant (dessin sans réglage).

**Preuve visuelle** : lecture `#stage[data-table-border]` = `<couleur>/6/dashed` ; capture 2x `bordures-case.png` à décrire
(huit bords de la plage en tirets épais).

**Contraintes (recopiées)** :
- G1 TDD. · G2 worktree partagé. · G3 preuves bornées. · G4 commande M, seuil 1 540 000 o.
- G5 `border` facultatif, valeur illisible ignorée et gardée, test « recharger garde les octets » (D24).
- G6 CLI : `SetTableLook` déjà dans `COMMAND_TYPES` ; `cli-essai.mjs` gagne un passage `border`.
- G7 une étape par geste. · G8 Alt+B, Alt+Maj+B vérifiés libres, `EXPECT`, menu ≥ 44 px.
- G9 sans réglage, dessin identique. · G10 interdits. · G11 commits. · G12 essai S9, captures avec `--captures`.

**Interdits** : pas de seconde commande (tout passe par `SetTableLook`) ; ne pas changer le chemin de dessin quand aucune
case n'a de `border`.

**Terminé quand** : preuves vertes, essai `ok — S9 : bordure 6 en tirets`, commande M, un commit.

#### Étapes

- [ ] **1. Tests rouges (cœur)** — dans `table_look.rs` `mod tests` (le helper `look` gagne `border: None`) :

```rust
    use super::CellBorder;
    fn bord(id: &str, from: (String, String), to: (String, String), b: Option<Option<CellBorder>>) -> Command {
        Command::SetTableLook { id: id.into(), from, to, ha: None, va: None, border: b }
    }
    fn red(w: f64, s: &str) -> CellBorder {
        CellBorder { color: "#e74c3c".into(), width: w, style: s.into() }
    }

    #[test]
    fn border_written_on_range() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        d.apply(bord(&t, ids(&d, &t, 0, 0), ids(&d, &t, 1, 1), Some(Some(red(6.0, "dashed"))))).expect("plage");
        let v = view(&d, &t);
        assert_eq!(v.cells.len(), 4);
        assert!(v.cells.iter().all(|c| c.border == Some(("#e74c3c".into(), 6.0, "dashed".into()))));
        let a = ids(&d, &t, 0, 0);
        d.apply(bord(&t, a.clone(), a, Some(None))).expect("retirée");
        assert_eq!(view(&d, &t).cells.len(), 3);
    }

    #[test]
    fn border_refusals() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let a = ids(&d, &t, 0, 0);
        for b in [red(0.0, "solid"), red(33.0, "solid"), red(2.0, "wavy"), CellBorder { color: "pas une couleur!".into(), width: 2.0, style: "solid".into() }] {
            assert_eq!(d.apply(bord("zz", a.clone(), a.clone(), Some(Some(b)))), Err(CommandError::BadTable));
        }
    }

    #[test]
    fn border_reload_keeps_bytes() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta { app_version: "0.1.0".into(), now: "2026-11-27T00:00:00Z".into(), created: None };
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let a = ids(&d, &t, 2, 0);
        d.apply(bord(&t, a.clone(), a, Some(Some(red(2.0, "none"))))).expect("none");
        let bytes = save(&d, &meta).expect("save");
        let back = load(&bytes).expect("load");
        assert_eq!(back.element(&t), d.element(&t));
        assert_eq!(save(&back, &meta).expect("resave"), bytes);
    }
```

(Si `save` deux fois de suite ne rend pas les mêmes octets pour un document sans `border` — à vérifier d'abord sur
`table3` seul —, garder seulement l'égalité des éléments et l'écrire dans le rapport.) Wasm : étendre le test
`set_table_look_inner_centers_a_cell` d'un second appel `set_table_look_inner(&id, …, None, None, Some(Some(CellBorder { … })))`
et d'une lecture de `cells[0].border`.

- [ ] **2. Rouge** — commande bornée (compilation).

- [ ] **3. Cœur** — `table_look.rs` :

```rust
/// Bordure de case (D16) : `[couleur, épaisseur, style]` ; `none` efface le bord.
#[derive(Debug, Clone, PartialEq)]
pub struct CellBorder {
    pub color: String,
    pub width: f64,
    pub style: String,
}

pub(crate) const BORDER_STYLES: [&str; 4] = ["solid", "dashed", "dotted", "none"];
pub(crate) const MAX_BORDER_WIDTH: f64 = 32.0;

pub(crate) fn border_ok(b: &CellBorder) -> bool {
    crate::rich_text::valid_color(&b.color)
        && b.width.is_finite()
        && b.width > 0.0
        && b.width <= MAX_BORDER_WIDTH
        && BORDER_STYLES.contains(&b.style.as_str())
}

/// Lecture tolérante (U3) : tableau de trois valeurs lisibles, sinon `None` (valeur gardée dans le document).
pub(crate) fn read_border(v: Option<yrs::Out>) -> Option<CellBorder> {
    let Some(yrs::Out::Any(yrs::Any::Array(a))) = v else { return None };
    let [yrs::Any::String(c), yrs::Any::Number(w), yrs::Any::String(s)] = a.as_ref() else { return None };
    let b = CellBorder { color: c.to_string(), width: *w, style: s.to_string() };
    border_ok(&b).then_some(b)
}

pub(crate) fn border_to_any(b: &CellBorder) -> yrs::Any {
    yrs::Any::Array(vec![yrs::Any::String(b.color.as_str().into()), yrs::Any::Number(b.width), yrs::Any::String(b.style.as_str().into())].into())
}
```

`cmd_set_table_look` gagne `border: Option<Option<&CellBorder>>` ; en tête : `if let Some(Some(b)) = border { if !border_ok(b) { return Err(CommandError::BadTable); } }`
(après `wanted` de `ha`/`va`, avant `table_of`) ; le filtre `differs` ajoute
`|| border.is_some_and(|w| cell.as_ref().and_then(|x| x.border.as_ref()) != w)` ; dans la transaction :

```rust
                match border {
                    Some(Some(b)) => {
                        map.insert(&mut txn, "border", border_to_any(b));
                    }
                    Some(None) => {
                        map.remove(&mut txn, "border");
                    }
                    None => {}
                }
```

`table.rs` : `RawCell.border: Option<crate::table_look::CellBorder>` lu par `crate::table_look::read_border(map.get(txn, "border"))` ;
`TableCellView.border: Option<(String, f64, String)>` (`skip_serializing_if`), rempli par
`cell.border.map(|b| (b.color, b.width, b.style))` ; condition de saut de `view` + `&& cell.border.is_none()`.
`commands.rs` : variante + `border: Option<Option<crate::table_look::CellBorder>>`, `apply` passe `border.as_ref().map(|o| o.as_ref())`.
Le helper `look` du test TB4 et tout autre `Command::SetTableLook { … }` reçoivent `border: None`.

- [ ] **4. Wasm** — `set_table_look` gagne les quatre paramètres ; avant l'appel :

```rust
        let border = match border_mode {
            0 => None,
            2 => Some(None),
            1 => match (border_color, border_width, border_style) {
                (Some(color), Some(width), Some(style)) => Some(Some(CellBorder { color, width, style })),
                _ => return Err(cmd_err(CommandError::BadTable)),
            },
            _ => return Err(cmd_err(CommandError::BadTable)),
        };
```

(`CellBorder` importé de `roomboard_core::table_look` ; `pub mod table_look` déjà public.) Vert cœur et Wasm, **commande M**.

- [ ] **5. Contrat TS (rouge puis vert)** — deux `it` dans le `describe.each` personnalisation-3 :
« SetTableLook border (D16) : plage 2 × 2 en tirets 6, quatre cases ; null retire ; même demande : aucune étape » et
« SetTableLook border refusé (épaisseur 0, 33, style inconnu, couleur illisible) ; recharger garde border ». `api.ts` :
types et champs ; `wasm-core.ts` :

```ts
      case "SetTableLook": {
        const b = cmd.border;
        return toChange(this.d.set_table_look(cmd.id, cmd.from.row, cmd.from.col, cmd.to.row, cmd.to.col, cmd.ha, cmd.va, b === undefined ? 0 : b === null ? 2 : 1, b?.[0], b?.[1], b?.[2]));
      }
```

projection : `border` publié seulement si tableau de trois valeurs de bons types. `fake-core.ts` : `FakeCell.border?: CellBorder` ;
contrôle (même règle que `border_ok` : `validColor`, `Number.isFinite(w) && w > 0 && w <= 32`, style admis) avant
`tableOf` ; comparaison par valeurs (`a?.[0] === b?.[0] && a?.[1] === b?.[1] && a?.[2] === b?.[2]`) ; enregistrement et relecture.

- [ ] **6. Dessin (rouge puis vert)** — `table-paint.test.ts` :

```ts
describe("S9 bordures par case (D16)", () => {
  const base = (cells: TableData["cells"]): TableData => ({
    color: "#000000", size: 36, merges: [], cells,
    cols: [{ id: "a", width: 100 }, { id: "b", width: 100 }],
    rows: [{ id: "r0", height: 50 }, { id: "r1", height: 50 }],
  });
  const rec = () => {
    const strokes: { style: string; width: number; dash: number[]; segs: number[][] }[] = [];
    let segs: number[][] = [];
    let dash: number[] = [];
    const ctx = {
      strokeStyle: "", lineWidth: 0, lineCap: "", fillStyle: "",
      beginPath: () => { segs = []; }, moveTo: (x: number, y: number) => segs.push([x, y]), lineTo: (x: number, y: number) => segs[segs.length - 1]?.push(x, y),
      setLineDash: (d: number[]) => { dash = d; }, stroke() { strokes.push({ style: this.strokeStyle, width: this.lineWidth, dash, segs }); },
      fillRect: () => undefined, save: () => undefined, restore: () => undefined, rect: () => undefined, clip: () => undefined,
    };
    return { ctx: ctx as unknown as CanvasRenderingContext2D, strokes };
  };
  const cell = (row: string, col: string, border?: CellBorder): TableData["cells"][number] => ({ row, col, text: "", fill: null, shade: null, spans: [], ...(border ? { border } : {}) });
  it("S9 : sans réglage : un seul trait, comme aujourd'hui", () => {
    const r = rec();
    paintTableGrid(r.ctx, base([]));
    expect(r.strokes).toHaveLength(1);
  });
  it("S9 : case (0, 0) en tirets rouges 6 : ses quatre bords rouges en tirets, les autres au trait du tableau", () => {
    const r = rec();
    paintTableGrid(r.ctx, base([cell("r0", "a", ["#e74c3c", 6, "dashed"])]));
    const red = r.strokes.find((s) => s.style === "#e74c3c");
    expect(red?.width).toBe(6);
    expect(red?.dash).toEqual([18, 12]);
    expect(red?.segs).toHaveLength(4);
    expect(r.strokes.find((s) => s.style === "#000000")?.segs).toHaveLength(8);
  });
  it("S9 : bord commun : la case de droite l'emporte ; none efface son bord", () => {
    const r = rec();
    paintTableGrid(r.ctx, base([cell("r0", "a", ["#e74c3c", 2, "solid"]), cell("r0", "b", ["#000000", 2, "none"])]));
    const red = r.strokes.find((s) => s.style === "#e74c3c");
    // Case a : haut, gauche, bas ; son bord droit est commun avec b (none) : effacé.
    expect(red?.segs).toHaveLength(3);
  });
});
```

(`CellBorder` importé de `../../core/api`.) `table-paint.ts` : `paintTableGrid` garde son corps actuel quand
`t.cells.every((c) => c.border === undefined)` ; sinon :

```ts
/** Bords par case (D16) : segment vertical (i, r) et horizontal (j, c) ; un bord commun prend la case à droite ou en
 *  dessous si elle a un réglage, sinon celle de gauche ou du dessus ; `none` efface ; aucun réglage : trait du tableau. */
function paintBorders(ctx: CanvasRenderingContext2D, t: TableData, zones: readonly Range[], xs: readonly number[], ys: readonly number[]): void {
  const byCell = new Map(t.cells.map((c) => [`${c.row}:${c.col}`, c.border] as const));
  const borderAt = (r: number, c: number): CellBorder | undefined => {
    if (r < 0 || c < 0 || r >= t.rows.length || c >= t.cols.length) return undefined;
    const a = anchorOf(t, { row: r, col: c });
    return byCell.get(`${t.rows[a.row]?.id}:${t.cols[a.col]?.id}`);
  };
  const same = (r: number, c: number, r2: number, c2: number): boolean =>
    zones.some((z) => r >= z.r0 && r <= z.r1 && c >= z.c0 && c <= z.c1 && r2 >= z.r0 && r2 <= z.r1 && c2 >= z.c0 && c2 <= z.c1);
  const groups = new Map<string, { b: CellBorder | null; segs: [number, number, number, number][] }>();
  const add = (b: CellBorder | undefined, s: [number, number, number, number]): void => {
    if (b?.[2] === "none") return;
    const k = b === undefined ? "" : `${b[0]}|${b[1]}|${b[2]}`;
    const g = groups.get(k) ?? { b: b ?? null, segs: [] };
    g.segs.push(s);
    groups.set(k, g);
  };
  for (let i = 0; i < xs.length; i++) {
    for (let r = 0; r < t.rows.length; r++) {
      if (i > 0 && i < t.cols.length && same(r, i - 1, r, i)) continue;
      add(borderAt(r, i) ?? borderAt(r, i - 1), [xs[i] ?? 0, ys[r] ?? 0, xs[i] ?? 0, ys[r + 1] ?? 0]);
    }
  }
  for (let j = 0; j < ys.length; j++) {
    for (let c = 0; c < t.cols.length; c++) {
      if (j > 0 && j < t.rows.length && same(j - 1, c, j, c)) continue;
      add(borderAt(j, c) ?? borderAt(j - 1, c), [xs[c] ?? 0, ys[j] ?? 0, xs[c + 1] ?? 0, ys[j] ?? 0]);
    }
  }
  for (const { b, segs } of groups.values()) {
    ctx.beginPath();
    for (const [x0, y0, x1, y1] of segs) {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
    }
    const w = b?.[1] ?? TABLE_LINE_WIDTH;
    ctx.strokeStyle = b?.[0] ?? t.color;
    ctx.lineWidth = w;
    ctx.lineCap = b?.[2] === "dotted" ? "round" : "square";
    ctx.setLineDash(b?.[2] === "dashed" ? [3 * w, 2 * w] : b?.[2] === "dotted" ? [0.001, 2 * w] : []);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}
```

Attention : le premier test attend le trait d'aujourd'hui (un seul `stroke`, sans `setLineDash`) ; `paintBorders` n'est
appelé que si une case a un réglage. Dans le second test, les bords du trait du tableau : 6 verticaux + 6 horizontaux = 12
moins les 4 de la case = 8.

- [ ] **7. Gestes** — `tools/table.ts`, `act` :

```ts
        case "border-solid":
        case "border-dashed":
        case "border-dotted":
        case "border-none":
        case "border-thin":
        case "border-thick":
        case "border-clear": {
          const corners = cornersOf(t, span);
          if (corners === null) break;
          const anchor = t.cells.find((x) => x.row === ref.row && x.col === ref.col)?.border;
          const color = style().color;
          const border: CellBorder | null =
            a === "border-clear" ? null
            : a === "border-thin" || a === "border-thick" ? [anchor?.[0] ?? color, a === "border-thin" ? 2 : 6, anchor?.[2] ?? "solid"]
            : [color, a === "border-none" ? 2 : (anchor?.[1] ?? 2), a.slice(7) as BorderStyle];
          ctx.run({ type: "SetTableLook", id: ref.id, ...corners, border });
          break;
        }
```

`cellState` : `border` de la case active en `` `${b[0]}/${b[1]}/${b[2]}` `` ou absent. `openMenu` : rangée `border` (« Plein »,
« Tirets », « Points », « Aucune ») et rangée `border-width` (« Fin », « Épais », « Par défaut ») — boutons texte (aucune
icône dans `ICON_OF` : `""`). `keys.ts` : `if (!e.shiftKey && e.code === "KeyB") return "border-solid";` et, dans le bloc
`shiftKey`, `if (e.code === "KeyB") return "border-none";`. `shortcuts.ts` : « Bordure pleine » Alt+B, « Aucune bordure »
Alt+Maj+B, lignes `EXPECT`. Vérifié libre (Alt+Maj+D a pris « en bas » en TB4, choix 2 du plan). `stage-tags.ts` :
`data-table-border`. Test `table.test.ts` « TB5 border : Tirets puis Épais sur la plage 2 × 2 : deux SetTableLook, dernière
`[couleur, 6, "dashed"]` ».

- [ ] **8. CLI** — `cli-essai.mjs`, après `T-B4` : passage `SetTableLook` avec
`border: ["#e74c3c", 6, "dashed"]` sur la case (0, 0), relu par `state`, ligne `verifie("T-B5 : SetTableLook border, relu par state", …)`.

- [ ] **9. Vert, essai (bloc S9)** — sur le tableau de S6 : plage (1, 0)-(2, 1) par Maj+clic, appui long dans la plage,
« Tirets », appui long, « Épais » ; lecture `data-table-border` se termine par `/6/dashed` → `check(…, "S9 : bordure 6 en tirets")` ;
case (2, 2), Alt+Maj+B → se termine par `/none` ; `capture("bordures-case")`.

- [ ] **10. Mesure, commit** — commande M ; message `feat: per-cell table borders (SetTableLook border), shared edge rule, cell menu and Alt+B`
+ `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, auteur G11.

---

### Tâche TB6 — Point 11 : déplacer une ligne ou une colonne (`ReorderTableLines`, poignées de déplacement, Ctrl+Maj+flèches)

<a id="tache-tb6"></a>

**Objectif** (S11, D18, S16) : `ReorderTableLines { id, axis, order }` réécrit les entrées de `rows` ou `cols` dans
l'ordre donné (clés inconnues recopiées), les cellules (par ids) ne bougent pas, les objets liés suivent leur case (D5),
une étape ; refus `BadTable` si `order` n'est pas une permutation des ids lisibles ou si une fusion serait coupée. Gestes :
poignée de 44 px (6 points, `grip-vertical`) sur le bord gauche du tableau à la hauteur de la ligne active, poignée
(`grip-horizontal`) sur le bord haut à l'aplomb de la colonne active ; tirer, relâcher sur la ligne ou la colonne visée ;
Ctrl+Maj+↑/↓ (ligne), Ctrl+Maj+←/→ (colonne) d'un rang ; refus avec message « Une cellule fusionnée couvre ces lignes :
divisez-la d'abord. ».

**Patron à ne pas reprendre** : retirer tout `rows` et réinsérer des `Y.Map` neuves `{ id, height }` (perd les clés
inconnues, déplace les entrées illisibles, et un faux cœur qui « trie un tableau » diverge du vrai sur ces entrées).
Chemin de référence : places des entrées **lisibles** (rangs bruts `Line.index`, croissants) réutilisées dans l'ordre demandé,
chaque entrée recopiée par `as_prelim` (patron de `lift_above`, `crates/roomboard-core/src/table_links.rs:340-368`, et de
`reinsert_kept`, `crates/roomboard-core/src/copy.rs:96`) ; entrées illisibles laissées à leur place ; suivi par
`follow_in` dans la même transaction (`table_links.rs:214-269`, patron de `cmd_set_table_line_sizes`, `:285-312`).
Règle de fusion : pour chaque zone, ses lignes (sur l'axe) restent consécutives et dans le même ordre relatif.

**Fichiers** : voir la ligne TB6 de la table.

**Interfaces**
- Rust : `Command::ReorderTableLines { id: String, axis: TableAxis, order: Vec<String> }` ; `Document::cmd_reorder_table_lines(&mut self, id: &str, axis: TableAxis, order: &[String]) -> Result<Change, CommandError>` (`table_links.rs`) ; `RawTable::axis` en `pub(crate)` ; `Change.ids` = `[tableau, objets suivis…]` (`table_done_with`). Ordre inchangé : aucune étape.
- Wasm : `reorder_table_lines(&mut self, id: &str, row: bool, order: Vec<String>) -> Result<JsValue, JsError>` et `reorder_table_lines_inner(&mut self, id: &str, row: bool, order: &[String]) -> Result<Change, CommandError>` (axe par `table_axis(row)`).
- TS : `| { readonly type: "ReorderTableLines"; readonly id: string; readonly axis: TableAxis; readonly order: readonly string[] }` ; `Grip.kind` et `OverlayGrip.kind` gagnent `"move-row" | "move-col"` ; `export function moveGrips(t: TableData, c: Cell): Grip[]` ; `export function lineAt(t: TableData, axis: "col" | "row", v: number): number` (rang de la bande sous `v`, borné à [0, n − 1]) ; `TableAction` + `"row-up" | "row-down" | "col-left" | "col-right"` ; `TableKey` idem (Ctrl+Maj+flèches) ; `export const MERGE_CUT = "Une cellule fusionnée couvre ces lignes : divisez-la d'abord.";`.
- CLI : `COMMAND_TYPES` + `"ReorderTableLines"`.
- Réutilise : `crates/roomboard-core/src/table_links.rs:214` `follow_in`, `:43` `offsets`, `:274` `table_done_with` — suivi des objets (réutiliser).
- Réutilise : `crates/roomboard-core/src/table.rs:282` `merges_of` — règle de fusion (réutiliser).
- Réutilise : `apps/web/src/engine/table-geom.ts` `cellGrips` (TB1) et `EditOverlay.grips` — poignées (étendre).
- Le rapport porte une ligne par module : `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée**
- `nice -n 10 cargo test -p roomboard-core reorder_table_lines -j 4 2>&1 | tail -10` (4 passés : `reorder_table_lines_rows_and_undo`, `reorder_refuses_bad_order`, `reorder_refuses_cut_merge`, `reorder_moves_linked_objects`).
- `nice -n 10 cargo test -p roomboard-wasm reorder_table_lines -j 4 2>&1 | tail -6` (1) ; commande M.
- Contrat `-t "ReorderTableLines"` : 6 passés (3 × 2 fabriques).
- `pnpm --filter @roomboard/web exec vitest run src/engine/tools/table.test.ts src/engine/table-geom.test.ts src/engine/input/keys.test.ts src/ui/shortcuts.test.ts -t "S11|lineAt|Ctrl\\+Maj|shortcuts" 2>&1 | tail -8` (`S11` : 3).
- `ops.test.ts` (compte + 1), CLI `T-B6` puis `CLI : OK`.
- Fin de lot : `node ~/.claude/scripts/vm/suite-vm.cjs -- scripts/verifier.sh 2>&1 | tail -20` (aucun `FAILED`, `error[`, `FAIL `).

**Preuve visuelle** : lecture — objet logé dans la ligne 2 : après le déplacement, sa `data-bounds` y0 = haut du tableau + 8 ;
capture 2x `ligne-deplacee.png` à décrire.

**Contraintes (recopiées)** :
- G1 TDD. · G2 worktree partagé. · G3 `nice -n 10`, `cargo -j 4`, suite complète par `suite-vm.cjs`, preuves bornées.
- G4 commande M, seuil 1 540 000 o. · G5 aucune clé neuve ; clés inconnues des lignes recopiées.
- G6 CLI : `COMMAND_TYPES`, `ops.test.ts`, `cli-essai.mjs`. · G7 une étape par geste, écriture au relâché.
- G8 poignées 44 px, Ctrl+Maj+flèches prises seulement par l'outil Tableau avec une case active (avant `orderKey`), `EXPECT`.
- G9 hors outil Tableau, Ctrl+Maj+↑/↓ garde premier plan / arrière-plan. · G10 interdits. · G11 commits.
- G12 essai S11, captures avec `--captures`.

**Interdits** : pas de tri (lot C, D20) ; ne pas réécrire les cellules ; ne pas créer de `Y.Map` de ligne neuve.

**Terminé quand** : preuves vertes, suite complète verte, essai `ok — S11 : ordre 2, 0, 1`, commande M, un commit.

#### Étapes

- [ ] **1. Tests rouges (cœur)** — `table_links.rs`, `mod tests` (helpers existants `first`, `table3`, `view`, `rect`, `place11`) :

```rust
    fn reorder(id: &str, order: Vec<String>) -> Command {
        Command::ReorderTableLines { id: id.into(), axis: TableAxis::Row, order }
    }

    #[test]
    fn reorder_table_lines_rows_and_undo() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let r: Vec<String> = view(&d, &t).rows.iter().map(|x| x.id.clone()).collect();
        let c = d.apply(reorder(&t, vec![r[2].clone(), r[0].clone(), r[1].clone()])).expect("ordre");
        assert_eq!(c.ids, vec![t.clone()]);
        assert_eq!(view(&d, &t).rows.iter().map(|x| x.id.clone()).collect::<Vec<_>>(), vec![r[2].clone(), r[0].clone(), r[1].clone()]);
        let v = d.version();
        d.apply(reorder(&t, vec![r[2].clone(), r[0].clone(), r[1].clone()])).expect("même");
        assert_eq!(d.version(), v);
        d.undo();
        assert_eq!(view(&d, &t).rows.iter().map(|x| x.id.clone()).collect::<Vec<_>>(), r);
    }

    #[test]
    fn reorder_refuses_bad_order() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let r: Vec<String> = view(&d, &t).rows.iter().map(|x| x.id.clone()).collect();
        for o in [vec![r[0].clone(), r[1].clone()], vec![r[0].clone(), r[0].clone(), r[1].clone()], vec![r[0].clone(), r[1].clone(), "zz".into()]] {
            assert_eq!(d.apply(reorder(&t, o)), Err(CommandError::BadTable));
        }
    }

    #[test]
    fn reorder_refuses_cut_merge() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let v = view(&d, &t);
        let (r, c0) = (v.rows.iter().map(|x| x.id.clone()).collect::<Vec<_>>(), v.cols[0].id.clone());
        d.apply(Command::MergeTableCells { id: t.clone(), from: (r[0].clone(), c0.clone()), to: (r[1].clone(), c0) }).expect("fusion");
        let ver = d.version();
        assert_eq!(d.apply(reorder(&t, vec![r[0].clone(), r[2].clone(), r[1].clone()])), Err(CommandError::BadTable));
        assert_eq!(d.version(), ver);
        d.apply(reorder(&t, vec![r[2].clone(), r[0].clone(), r[1].clone()])).expect("zone entière déplacée");
    }

    #[test]
    fn reorder_moves_linked_objects() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1100.0, 1050.0);
        place11(&mut d, &t, &o);
        let y0 = d.element(&o).expect("o").transform.expect("m")[5];
        let r: Vec<String> = view(&d, &t).rows.iter().map(|x| x.id.clone()).collect();
        let c = d.apply(reorder(&t, vec![r[1].clone(), r[0].clone(), r[2].clone()])).expect("ordre");
        assert_eq!(c.ids, vec![t.clone(), o.clone()]);
        assert_eq!(d.element(&o).expect("o").transform.expect("m")[5], y0 - 64.0);
    }
```

(Si `place11` impose d'autres tailles que 64 à la ligne 0, lire la hauteur de la ligne 0 dans `view` et remplacer `64.0`
par elle. Le champ de la matrice dans `ElementView` : suivre l'usage de `old_reader_ignores_new_keys` et des tests T1b.)
Wasm : `reorder_table_lines_inner_swaps_rows` (deux lignes échangées, relues).

- [ ] **2. Rouge** — commande bornée (compilation).

- [ ] **3. Cœur** — `table.rs` : `fn axis` → `pub(crate) fn axis`. `table_links.rs` (dans `impl Document`) :

```rust
    /// `ReorderTableLines` (D18) : `order` = permutation des ids lisibles de l'axe ; les places des entrées lisibles
    /// (rangs bruts croissants) reçoivent, dans l'ordre demandé, une recopie de chaque entrée (`as_prelim` : clés
    /// inconnues gardées) ; entrées illisibles laissées à leur place ; cellules (par ids) inchangées ; objets liés suivis
    /// dans la même transaction ; une zone ne peut pas être coupée (ses lignes restent consécutives, même ordre).
    pub(crate) fn cmd_reorder_table_lines(
        &mut self,
        id: &str,
        axis: TableAxis,
        order: &[String],
    ) -> Result<Change, CommandError> {
        let (page, e, raw) = self.table_of(id)?;
        let (lines, arr) = raw.axis(axis);
        let pos: HashMap<&str, usize> = order.iter().enumerate().map(|(i, l)| (l.as_str(), i)).collect();
        if order.len() != lines.len() || pos.len() != lines.len() || lines.iter().any(|l| !pos.contains_key(l.id.as_str())) {
            return Err(CommandError::BadTable);
        }
        if lines.iter().zip(order).all(|(l, o)| &l.id == o) {
            return Ok(self.unchanged());
        }
        {
            let txn = self.read();
            for m in merges_of(&raw, &txn) {
                let (a, b) = match axis {
                    TableAxis::Row => (m.r0, m.r1),
                    TableAxis::Col => (m.c0, m.c1),
                };
                let first = pos[lines[a].id.as_str()];
                if (a..=b).any(|k| pos[lines[k].id.as_str()] != first + (k - a)) {
                    return Err(CommandError::BadTable);
                }
            }
        }
        let before = offsets(&raw);
        let arr = arr.clone();
        let slots: Vec<u32> = lines.iter().map(|l| l.index).collect();
        let moved = {
            let mut txn = self.transact_local();
            let copies: Vec<MapPrelim> = order
                .iter()
                .filter_map(|o| lines.iter().find(|l| &l.id == o).map(|l| l.map.as_prelim(&txn)))
                .collect();
            for (slot, copy) in slots.into_iter().zip(copies) {
                arr.remove(&mut txn, slot);
                arr.insert(&mut txn, slot, copy);
            }
            self.follow_in(&mut txn, &page, &e, id, &before, &HashSet::new())
        };
        Ok(self.table_done_with(page, id, moved))
    }
```

(`MapPrelim`, `AsPrelim`, `Array` sont déjà importés en tête du fichier ; `as_prelim(&txn)` sur une transaction
d'écriture : suivre la forme de `lift_above`, `m.as_prelim(&*txn)`.) `commands.rs` : variante

```rust
    /// personnalisation-3 (D18) : réordonne les lignes (`Row`) ou colonnes (`Col`) ; `order` = tous les ids lisibles ;
    /// fusion coupée ou ordre invalide : `BadTable` ; ordre inchangé : aucune étape.
    ReorderTableLines {
        id: String,
        axis: TableAxis,
        order: Vec<String>,
    },
```

et `Command::ReorderTableLines { id, axis, order } => self.cmd_reorder_table_lines(&id, axis, &order),`. Wasm :

```rust
    /// personnalisation-3 (D18) : `row` vrai = lignes, faux = colonnes.
    pub fn reorder_table_lines(&mut self, id: &str, row: bool, order: Vec<String>) -> Result<JsValue, JsError> {
        to_js(&self.reorder_table_lines_inner(id, row, &order).map_err(cmd_err)?)
    }
```

```rust
    pub fn reorder_table_lines_inner(&mut self, id: &str, row: bool, order: &[String]) -> Result<Change, CommandError> {
        self.run(Command::ReorderTableLines { id: id.to_string(), axis: table_axis(row), order: order.to_vec() })
    }
```

Vert cœur et Wasm ; **commande M**.

- [ ] **4. Contrat TS (rouge puis vert)** — trois `it` dans le `describe.each` personnalisation-3 :
« ReorderTableLines (D18) : 2, 0, 1 ; une étape ; même ordre : aucune ; annuler », « ReorderTableLines refusé : permutation
fausse, fusion coupée (rien d'écrit) ; zone entière déplacée », « ReorderTableLines suivi (D5) : objet logé en (1, 1) remonte
de la hauteur de la ligne 0 ; ids [tableau, objet] » (avec `p3Place11`). `api.ts` (variante, en-tête), `wasm-core.ts` :
`case "ReorderTableLines": return toChange(this.d.reorder_table_lines(cmd.id, cmd.axis === "row", [...cmd.order]));`.
`fake-core.ts` :

```ts
      case "ReorderTableLines": {
        // personnalisation-3 (D18), comme `cmd_reorder_table_lines` : permutation, fusion non coupée, puis écriture (suivi par writeTable).
        const { found, t } = this.tableOf(cmd.id);
        const lines: readonly { readonly id: string }[] = cmd.axis === "row" ? t.rows : t.cols;
        const pos = new Map(cmd.order.map((l, i) => [l, i] as const));
        if (cmd.order.length !== lines.length || pos.size !== lines.length || lines.some((l) => !pos.has(l.id))) throw new Error(MESSAGES.badTable);
        if (lines.every((l, i) => l.id === cmd.order[i])) return this.unchanged();
        for (const m of mergesOf(t)) {
          const [a, b] = cmd.axis === "row" ? [m.r0, m.r1] : [m.c0, m.c1];
          const first = pos.get(lines[a]?.id ?? "") ?? -1;
          for (let k = a; k <= b; k++) if (pos.get(lines[k]?.id ?? "") !== first + (k - a)) throw new Error(MESSAGES.badTable);
        }
        const sorted = <L extends { readonly id: string }>(ls: readonly L[]): L[] => [...ls].sort((x, y) => (pos.get(x.id) ?? 0) - (pos.get(y.id) ?? 0));
        return this.writeTable(found, cmd.id, cmd.axis === "row" ? { ...t, rows: sorted(t.rows) } : { ...t, cols: sorted(t.cols) });
      }
```

(Vérifier que `writeTable` fait suivre les objets liés — c'est le chemin de `SetTableLineSizes` — ; sinon appeler le suivi
du faux cœur comme `SetTableLineSizes`.)

- [ ] **5. CLI** — `ops.ts` + `"ReorderTableLines"`, `ops.test.ts` compte + 1 ; `cli-essai.mjs` après `T-B5` : sur le tableau
du passage S16 (forme logée), `ReorderTableLines` qui fait passer la dernière ligne en tête, `state`, puis
`verifie("T-B6 : ReorderTableLines, la forme logée suit sa ligne", …)` (y de la forme changé de la somme des hauteurs des
lignes passées dessous), et `undo` : une étape.

- [ ] **6. Outil Tableau (rouge puis vert)** — `table.test.ts` :

```ts
describe("outil Tableau — S11 déplacer une ligne (D18)", () => {
  it("S11 : poignée de la ligne 2 tirée au-dessus de la ligne 0 : ordre 2, 0, 1, une commande au relâché", () => {
    const s = setup();
    const id = s.create(100, 200, 3, 3);
    s.tool.requestCommit();
    s.click(100 + 120, 200 + 2 * 64 + 32);
    s.tool.requestCommit();
    const r = s.table(id).rows.map((x) => x.id);
    const n = s.runs.length;
    // Poignée « move-row » : bord gauche (x = 100), milieu de la ligne 2.
    s.tool.begin(3, [at(100, 200 + 160)]);
    s.tool.extend(3, [at(100, 200 + 10)], []);
    expect(s.runs.length).toBe(n);
    s.tool.close(3, "end");
    expect(s.last()).toEqual({ type: "ReorderTableLines", id, axis: "row", order: [r[2], r[0], r[1]] });
  });
  it("S11 : row-up au clavier : la ligne active monte d'un rang ; en tête : aucune commande", () => {
    const s = setup();
    const id = s.create(100, 200, 3, 3);
    s.tool.requestCommit();
    s.click(100 + 120, 200 + 64 + 32);
    s.tool.requestCommit();
    const r = s.table(id).rows.map((x) => x.id);
    s.tool.act("row-up");
    expect(s.table(id).rows.map((x) => x.id)).toEqual([r[1], r[0], r[2]]);
    const n = s.runs.length;
    s.tool.act("row-up");
    expect(s.runs.length).toBe(n);
  });
  it("S11 : fusion coupée : message, aucune commande écrite", () => {
    const s = setup();
    const id = s.create(100, 200, 3, 3);
    s.tool.requestCommit();
    const t = s.table(id);
    s.doc.apply({ type: "MergeTableCells", id, from: { row: t.rows[0]?.id ?? "", col: t.cols[0]?.id ?? "" }, to: { row: t.rows[1]?.id ?? "", col: t.cols[0]?.id ?? "" } });
    s.click(100 + 120, 200 + 2 * 64 + 32);
    s.tool.requestCommit();
    s.tool.act("row-up");
    expect(s.notices).toEqual(["Une cellule fusionnée couvre ces lignes : divisez-la d'abord."]);
    expect(s.table(id).rows.map((x) => x.id)).toEqual(t.rows.map((x) => x.id));
  });
});
```

`table-geom.ts` :

```ts
/** Poignées de déplacement (D18), repère local : bord gauche à la hauteur de la ligne active, bord haut à l'aplomb de
 *  la colonne active (milieu de la zone). */
export function moveGrips(t: TableData, c: Cell): Grip[] {
  const r = cellRect(t, c);
  const z = mergeAt(t, c) ?? single(c);
  return [
    { kind: "move-row", x: 0, y: (r.y0 + r.y1) / 2, index: z.r0 },
    { kind: "move-col", x: (r.x0 + r.x1) / 2, y: 0, index: z.c0 },
  ];
}

/** Rang de la bande sous `v` (repère local), borné à [0, n − 1] : la ligne ou la colonne visée par un déplacement. */
export function lineAt(t: TableData, axis: "col" | "row", v: number): number {
  const sizes = axis === "col" ? t.cols.map((c) => c.width) : t.rows.map((r) => r.height);
  if (v < 0) return 0;
  const i = band(sizes, v);
  return i < 0 ? sizes.length - 1 : i;
}
```

Le test TB1 « live » attend désormais quatre poignées : ajouter `{ x: 100, y: 296, kind: "move-row" }, { x: 460, y: 200, kind: "move-col" }`
après les deux de TB1 (changement voulu, à écrire dans le rapport).
(`Grip.kind` et `OverlayGrip.kind` : `"col" | "row" | "move-row" | "move-col"` ; test `table-geom.test.ts`
« lineAt : au-dessus : 0, dedans : la bande, au-delà : la dernière ».) `canvas2d.ts` : une poignée `move-*` se dessine en six
points de 1,5 px écran (motif `grip-vertical` / `grip-horizontal`) dans le disque blanc. `tools/table.ts` :
`export const MERGE_CUT = "Une cellule fusionnée couvre ces lignes : divisez-la d'abord.";` ; `refresh` ajoute
`moveGrips` aux poignées publiées ; état de glisser `Move { pointerId, id, axis: "row" | "col", from: number, to: number }` :
`begin` le pose si une poignée `move-*` est sous le doigt (même test 44 px que `grabAt`, avant lui) ; `extend` met
`to = lineAt(t, axis, coordonnée locale)` et publie `overlay.target` = cadre monde de la ligne ou colonne `to` ; `close("end")`
avec `to !== from` appelle `moveLine(at, axis, from, to)` ; autre fin : rien. Fonction partagée avec les touches :

```ts
  /** Déplace la ligne ou colonne `from` au rang `to` (D18) : une ReorderTableLines ; refus du cœur (fusion coupée) :
   *  message, rien d'écrit. */
  const moveLine = (id: string, t: TableData, axis: "row" | "col", from: number, to: number): void => {
    const ids = (axis === "row" ? t.rows : t.cols).map((x) => x.id);
    const moved = ids[from];
    if (moved === undefined || to < 0 || to >= ids.length || to === from) return;
    const order = ids.filter((_, i) => i !== from);
    order.splice(to, 0, moved);
    if (ctx.run({ type: "ReorderTableLines", id, axis, order }) === null) notify?.(MERGE_CUT);
  };
```

`act` : `case "row-up": moveLine(ref.id, t, "row", span.r0, span.r0 - 1); break;` ; `row-down` (`span.r0 + 1`),
`col-left`, `col-right` de même ; `TableAction` étendu. `keys.ts`, en tête de `tableKey` après la garde
`isComposing/metaKey/inEditable` :

```ts
  if (e.ctrlKey && e.shiftKey && !e.altKey) {
    if (e.key === "ArrowUp") return "row-up";
    if (e.key === "ArrowDown") return "row-down";
    if (e.key === "ArrowLeft") return "col-left";
    if (e.key === "ArrowRight") return "col-right";
    return null;
  }
```

`keys.test.ts` : « tableKey Ctrl+Maj : flèches → row-up, row-down, col-left, col-right ; `orderKey` rend toujours front
pour Ctrl+Maj+↑ » (les deux reconnaisseurs existent ; l'engine teste `tableKey` d'abord, seulement en outil Tableau avec
une case active, TB1 étape 9). `shortcuts.ts` : quatre lignes (« Monter la ligne » Ctrl+Maj+↑ …) et leurs `EXPECT`.
Vérifié : Ctrl+Maj+↑/↓ est pris par `orderKey` hors outil Tableau (choix 2 du plan) ; Ctrl+Maj+←/→ libre.

- [ ] **7. Vert** — toutes les commandes bornées de la section.

- [ ] **8. Essai (bloc S11)** — nouveau tableau 3 × 3 (sous celui de S6, même gabarit), forme ou image logée dans la case
(2, 0) (aide `dropFile` + `touchDrag` du bloc S1), outil Tableau, case (2, 0) active, `touchDrag` de la poignée de
déplacement (bord gauche, milieu de la ligne 2) vers le milieu de la ligne 0 ; outil Sélection sur l'objet : `data-bounds`
y0 = haut du tableau + 8 → `check(…, "S11 : ordre 2, 0, 1, objet logé compris")` ; Ctrl+Z ; au clavier : case (2, 0), `Control+Shift+ArrowUp`
deux fois, même lecture ; `capture("ligne-deplacee")`.

- [ ] **9. Suite complète, mesure, commit** — commande M ; `node ~/.claude/scripts/vm/suite-vm.cjs -- scripts/verifier.sh 2>&1 | tail -20` ;
message `feat: reorder table rows and columns (ReorderTableLines), move grips and Ctrl+Shift+arrows, placed objects follow`
+ `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, auteur G11.

---

## Couverture du cadrage (relecture)

| entrée du cadrage | tâche |
|---|---|
| point 6, D13, S6 (poignées 44 px, ± 6 px, une écriture au relâché, lignes regrandies, minimum) | TB1 |
| D34 Uniformiser par `requiredSizes` ; effet de bord « Uniformiser ne réduit plus sous un objet logé » | TB1 (« uniform garde les objets ») |
| point 10, D17, S10 (gras, fond, bouton, Alt+E, Ctrl+Z) | TB2 |
| D35 « Ombrer » refusé sur une case à objet, effet de bord « shade refusé sur case à objet », S18 | TB2 |
| point 7, D14, S7 (double appui, Alt+A, borne 960) | TB3 |
| point 8, D15, S8 (`ha`, `va`, `SetTableLook`, `cellTextFrame` lu par dessin, pot, saisie ; `layoutRich` `ha`) | TB4 |
| point 9, D16, S9 (`border`, bord commun, `none`, rouvrir identique) | TB5 (`border_reload_keeps_bytes`) |
| point 11, D18, S11 (réordonner, cellules par ids, refus de fusion coupée, poignées, Ctrl+Maj) | TB6 |
| D5 suivi par `ReorderTableLines` ; S16 (CLI) étendu | TB6 (`reorder_moves_linked_objects`, `T-B6`) |
| S17 / D24 recharger garde (`ha`, `va`, `border`) | TB4, TB5 |
| D25 / G6 CLI : `SetTableLook`, `ReorderTableLines` ; passages `cli-essai` | TB4, TB5, TB6 (TB2 : `header`) |
| D29 / DA4 Wasm : 2 exports, mesure M à chaque tâche Rust | TB4, TB5, TB6 |
| D31 tactile (pointeur, appui long, menu) et raccourcis H12 (conflit Alt+Maj+B tranché) | TB1-TB6, choix 2 |
| D32 icônes Lucide (`heading`, `align-*`, `grip-*`), netteté § 10 | TB2, TB4, TB6 |
| DA5 / D26 panneau `table` (`ui/TableOptions.tsx`) | **non couvert** : reporté (choix 1, HB1) |
| carte d'impact `ui/OptionsPanel.tsx`, `ui/tool-options.ts` (section `table`), effet de bord « showsPanel(table) » | **non couvert** (même raison) |
| carte d'impact `render/canvas2d.ts` (`paintText` décalage) | TB4 par `layoutRich(…, ha)` : `paintText` inchangé, segments déjà décalés |
| carte d'impact `app/text-editor.ts` (`text-align`) | TB4 |
| carte d'impact `fill-target.ts:72-73` | TB4 |
| carte d'impact `Toolbar.tsx` (`TableActionRow`) | TB2 par `toolbar.ts` (`TABLE_ACTIONS`) : `Toolbar.tsx` itère déjà la liste, aucun code |
| carte d'impact `ui/icons.ts`, `icons.test.ts`, `shortcuts.ts` | TB2, TB4, TB6 ; TB1-TB6 |
| `zone-s6-banc.test.ts` (D30) gardé vert | TB4 (preuve) |
| points 12 à 15, F10 `open`, collage tabulé, tri, tableau de tri | lot C |
