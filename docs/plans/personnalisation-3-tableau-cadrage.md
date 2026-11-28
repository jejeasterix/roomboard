# Cadrage — personnalisation-3-tableau (OG26)

Mode autonome : aucune question n'a pu parvenir à Jérôme ; chaque choix est tranché ici, avec sa raison.
Base lue : `origin/main` @ 53a14b6e. Graphe : `~/.cache/graphes/roomboard/graphify-out/graph.json` (présent, 17:58).

## 1. Demande et gabarit

**Demande** : l'outil Tableau accueille des objets dans ses cases (la case s'adapte à l'objet, comme MyViewBoard), se
règle finement (bordures, alignement, en-tête, lignes déplaçables) et sert en classe (case cachée, tri, tableau de tri,
collage Excel/Word) — 15 points validés par Jérôme (« Oui, toute la liste »), dans l'ordre A, B, C.

**Gabarit** : `lots` (A, B, C ; une PR par lot), budget 40 questions. Durée disponible : ~5 h 30 pour tout le chantier.

### Ce que `main` fait déjà, point par point

| # | point | sur `main` (lu) |
|---|---|---|
| 1 | objet glissé dans une case, la case s'agrandit | **non** : aucun lien objet-case ; glisser un objet sur un tableau le pose par-dessus (`select.ts:183`, `Transform` seul) ; seule la hauteur d'une ligne grandit, et pour le texte seulement (`SetTableCell.row_height`, `commands.rs:158`) |
| 2 | réglage inverse : l'objet rétrécit | **non** |
| 3 | tracé fait dans une case lui appartient | **non** : `CommitStroke` sans lien (`pen.ts:119`) ; déplacer le tableau laisse le tracé sur place |
| 4 | sortir l'objet, la case reprend sa taille | **non** (pas de lien) |
| 5 | image de fond de case | **non** : une case n'a que `fill` (couleur) et `shade` (`table.rs:1-8`) |
| 6 | tirer une bordure | **non** : seul « Uniformiser » (`SetTableSizes`, toutes les colonnes à une largeur, `commands.rs:184`) ; les poignées de la Sélection mettent tout le tableau à l'échelle |
| 7 | double appui : ajuster au contenu | **non** |
| 8 | alignement dans la case | **non** : texte en haut à gauche (`cellInnerBox`, `table-geom.ts:225`) ; `text-layout.ts` ne connaît aucun alignement |
| 9 | bordures par case | **non** : traits uniformes `TABLE_LINE_WIDTH`, couleur du tableau (`table-paint.ts`) |
| 10 | ligne d'en-tête d'un geste | **en partie** : remplissage d'une plage (pastilles, F15) en 3 gestes ; aucun en-tête |
| 11 | déplacer une ligne ou une colonne | **non** |
| 12 | case cachée qui s'ouvre au toucher | **largement fait** : « Ombrer » / « Désombrer » (F9), un toucher avec la Sélection révèle (F10, `select.ts:178`), annulable et enregistré (F12). **Manque** : refermer d'un toucher |
| 13 | trier les lignes | **non** |
| 14 | tableau de tri (étiquettes acceptées) | **non** |
| 15 | coller depuis Excel ou Word | **fait pour le HTML** : Excel et Word posent un `text/html` à `<table>` → nouveau tableau, fusions, plafonds 64 × 64 (F18-F22, `paste.ts:43`, `html-table.ts:103`) ; `.xlsx` en valeurs (F23). **Manque** : texte tabulé seul (`text/plain` à tabulations, ignoré aujourd'hui, `paste.ts:3`) |

### Découpage minimal du lot A (démo : une photo glissée agrandit sa case)

Environ 5 h restent pour tout le chantier. Ordre d'exécution du lot A : d'abord l'indispensable, puis le reste dans l'ordre du tableau ; ce qui n'est pas fait devient une hypothèse « à revoir » écrite dans l'état, jamais un comportement à moitié livré.

| point | indispensable à la démo | peut tomber (devient hypothèse) |
|---|---|---|
| socle | champ `cell` lu et écrit (D1, D36) ; `PlaceInCell` (tailles, matrice, lien) et `SetTableLineSizes` ; `follow_cells` sur `InsertTableLine`, `RemoveTableLine`, `SetTableSizes`, `SetTableCell` ; emport par `Transform` (D6) ; exports Wasm et `case` ; parité du faux cœur et contrat pour ces commandes ; `COMMAND_TYPES` et un passage de `cli-essai.mjs` (S16) | montée dans la pile par `reinsert_kept` (une image posée avant le tableau reste dessous : visible, un tableau sans remplissage est transparent) ; renumérotation à la copie (objets copiés libres) ; `cell` gardé par la gomme (morceaux libres) |
| 1 | `cell-drop.ts` (`expand`, `target`, `drop`) branché sur la Sélection ; mode agrandir (D8) ; `requiredSizes` pour la case visée ; cadre de case visée ; S1 au doigt | Alt+Entrée (`place`) ; zones fusionnées (refus de loger dans une zone : déplacement libre) |
| 2 | — | mode rétrécir entier (D9, S2) |
| 3 | — | lien d'un tracé au stylo (D10, S3) : le tracé reste libre |
| 4 | sortir retire le lien (`PlaceInCell` sans `cell`), retrait par `Transform` hors de la case (D6) | réduction de la case quittée (D11) : la case garde sa taille |
| 5 | — | fond de case entier (D12, S5) |
| garde-fous | refus de loger dans une case ombrée fermée et de loger un tableau (D35, D36) | refus d'Ombrer une case à objet (D35) |

Durée de l'indispensable : ≈ 1 h 45 (socle L, point 1 M, point 4 S). Le reste de A : ≈ 1 h 30.

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| D1 | modèle d'un objet dans une case | **objet de la page lié par id** : champ facultatif `cell` de l'élément = `Any::Array` positionnel `[tableId, rowId, colId]`, remplacé en bloc ; illisible ou visant un tableau, une ligne ou une colonne absents = objet libre, valeur gardée. Voir DA1 | U7 « propriété, pas élément » (`usage-cadrage.md:60`) ; U3 (`:56`, jamais `Any::Map`) ; `element.rs:308` (`read_group`) | oui jusqu'à la release (U3) |
| D2 | où vit la géométrie | la **page** calcule tailles et matrices (elle seule mesure le texte, `text-layout.ts:27`) ; le **cœur** écrit en une transaction et fait **suivre** les objets liés quand une ligne ou une colonne bouge. Voir DA2 | T5/DAC2 (hauteur mesurée par la page, `commands.rs:158`) ; historique « une transaction = une étape » (`history.rs:1-4`) | oui |
| D3 | commande de logement | nouvelle `PlaceInCell { ids, matrix, cell: Option<[table,row,col]>, sizes: [[table, axis, line, size]] }` : tailles, puis suivi des autres objets liés, puis `matrix` composée sur `ids`, puis `cell` posé ou retiré, puis `ids` montés juste au-dessus du tableau visé s'ils sont dessous, par `reinsert_kept` (`copy.rs:96`) **après** l'écriture de `matrix` et `cell` (la recopie emporte tous les champs) ; une étape. Refus `BadTable` si `ids` contient un tableau (anti-cycle), ou si la case visée porte un ombrage fermé (DA1) | DAU10 (une commande par opération) ; `copy.rs:96` | oui |
| D4 | tailles ligne par ligne | nouvelle `SetTableLineSizes { id, cols: [[id, w]], rows: [[id, h]] }`, même écrivain que `PlaceInCell.sizes` ; `SetTableSizes` reste tel quel | `commands.rs:184` | oui |
| D5 | suivi des objets liés | après toute commande qui change la géométrie d'un tableau (`InsertTableLine`, `RemoveTableLine`, `SetTableSizes`, `SetTableLineSizes`, `PlaceInCell`, `SetTableCell` qui grandit une ligne, `ReorderTableLines`) : chaque objet lié est translaté du déplacement du coin de sa case (repère du tableau, partie linéaire de sa matrice) ; ligne ou colonne retirée : lien retiré, objet laissé en place (**hypothèse H22**, aucune source) ; case couverte après une fusion : le lien reste sur ses ids, l'objet compte pour la zone de l'ancre (taille exigée, cible du glisser) et suit le coin de sa propre case (ses lignes existent toujours) ; après division, il retrouve sa case sans écriture | point 3 de la demande ; D1 | oui |
| D6 | le tableau emporte ses objets | `Transform` d'un tableau compose aussi ses objets liés absents de `ids` (cœur, donc CLI comprise) ; la Sélection élargit de même la sélection d'un tableau à ses objets (aperçu, Suppr, Copier). **Objet lié transformé sans son tableau** (glisser Alt, flèches d'OG23, poignées, `Transform` de la CLI) : le cœur retire `cell` si le centre de sa boîte sort du rectangle de sa case (zone) ; reste dedans : lien gardé, nouveau décalage gardé ; aucune taille ne change (seul `cell-drop` réduit, D11) | U7 (transformer un groupe = `Transform{ids}`) ; `groups.ts:24` | oui |
| D7 | 1 — logement au glisser | au relâché d'un déplacement par la Sélection, si le **pointeur** est sur une case d'un tableau absent de la sélection et que la sélection ne contient aucun tableau : `PlaceInCell` vers cette case ; **Alt tenue = déplacement libre** (déjà « brut, sans magnétisme », G8) ; plusieurs objets = un bloc (boîte réunie) | `select.ts:96-101` (Alt) ; demande | oui |
| D8 | 1 — case qui grandit | mode « agrandir » (défaut) : colonne = max(largeur, objet + 2 × `TABLE_PADDING`), ligne = max(hauteur, objet + 2 × marge, texte exigé) ; zone fusionnée : la dernière colonne et la dernière ligne de la zone prennent l'écart. **Règle d'ancrage unique** : au logement, l'objet est posé dans la boîte intérieure selon l'alignement de la case (`ha`/`va`, défaut haut-gauche comme le texte ; en mode agrandir, la case épouse l'objet, donc haut-gauche = plein cadre) ; ensuite, au suivi (D5), il garde son décalage au coin haut-gauche de sa case ; changer l'alignement plus tard ne déplace que le texte | demande (« comme MyViewBoard ») ; `table-geom.ts:18`, `:225` | oui |
| D9 | 2 — réglage inverse | champ de tableau `fit` = `"shrink"` (absent = agrandir) ; l'objet est réduit à l'échelle uniforme min(1, boîte intérieure / objet), posé par la règle d'ancrage de D8, la case ne bouge pas ; `SetTableOptions { id, fit?, header? }` | demande | oui |
| D10 | 3 — tracé dans une case | `CommitStroke` gagne `cell` facultatif : posé si la boîte du tracé tient dans une seule case (tolérance : demi-épaisseur) du tableau le plus haut sous son premier point ; le tracé reste où il a été écrit (pas recentré) | demande ; `pen.ts:119` | oui |
| D11 | 4 — sortir | relâché hors de toute case (ou dans un autre tableau) : `PlaceInCell` sans `cell` ; la ligne et la colonne quittées reprennent la taille exigée **seulement si** leur taille vaut exactement celle que l'objet avait imposée (± 0,5) : max(texte exigé, autres objets + marges, `TABLE_ROW_HEIGHT` / `TABLE_COL_WIDTH`) ; une taille réglée à la main n'est jamais réduite. **Vers une autre case** (même tableau ou autre) : une seule `PlaceInCell` porte la réduction de la case quittée et l'agrandissement de la case visée. **Colonne réduite** : ses textes se replient, les lignes touchées reprennent leur hauteur exigée (`requiredSizes`, D34) dans la même liste `sizes`, comme D13 | demande ; hypothèse H4 | oui |
| D12 | 5 — image de fond | clé de case `bg` = empreinte d'asset ; `SetCellImage { id, row, col, from: Option<imageId> }` : prend l'asset de l'image logée, la supprime, une étape ; `None` retire le fond ; dessin sous le texte, en « couvrir » découpé à la case (zone) ; geste : **outil Tableau**, appui long sur la case (menu de case, D31) → « Mettre en fond » (prend l'image logée la plus haute de la case), ou Alt+I sur la case active | `document.rs:276` (`cited_assets` lit toute chaîne conforme, à toute profondeur : l'asset est gardé, même par un ancien lecteur) | oui |
| D13 | 6 — tirer une bordure | outil Tableau : souris, bordure prise à ± 6 px écran (curseur `col-resize` / `row-resize`) ; doigt, deux **poignées de 44 px** au milieu des bords droit et bas de la case active ; une `SetTableLineSizes` au relâché (colonnes rétrécies : lignes regrandies à la hauteur exigée, même commande) ; minimum : 2 × marge + 24 en largeur, hauteur exigée en hauteur | D-DS3 (cibles 44 px, `design-cadrage.md:110`) ; D38 (une écriture au relâché) | oui |
| D14 | 7 — ajuster au contenu | double appui (≤ 300 ms, ≤ 8 px) sur une bordure ou une poignée : colonne = max(ligne de texte la plus longue sans retour, objets) + marges, bornée à 4 × `TABLE_COL_WIDTH` ; ligne = hauteur exigée ; une étape | `rowHeightsFor` (`table-geom.ts:238`) | oui |
| D15 | 8 — alignement | clés de case `ha` (`center`, `right` ; absent = gauche) et `va` (`middle`, `bottom` ; absent = haut) ; `SetTableLook { id, from, to, ha?, va?, border? }` sur la plage ; **un seul calcul de décalage**, `cellTextFrame(t, cell, spans, size, measure): { x, y, w, h, ha }` dans `table-geom.ts`, lu par `cellTextBoxes` et `paintText` (dessin), `fill-target.ts:72-73` (le pot cherche le mot depuis ce cadre, plus depuis le coin) et la saisie de cellule (`tools/table.ts:197-207` : boîte décalée de `va`, `text-align` de l'éditeur) ; `layoutRich` gagne `ha` (décalage par ligne) ; un objet logé suit l'alignement au logement seulement (D8) | demande ; `fill-target.ts:72-73` ; `tools/table.ts:197-207` | oui |
| D16 | 9 — bordures | clé de case `border` = `[couleur, épaisseur, style]` (`solid`, `dashed`, `dotted`, `none`), posée sur toutes les cellules de la plage ; un bord commun prend le réglage de la cellule la plus en bas ou à droite qui en a un ; `none` efface ce bord ; sans réglage : trait d'aujourd'hui | demande ; U3 (tableau positionnel) | oui |
| D17 | 10 — en-tête | champ de tableau `header` = `true` : première ligne en gras, fond `--rf` neutre clair, jamais triée ; bouton « En-tête » (bascule, une étape) | demande | oui |
| D18 | 11 — déplacer une ligne | `ReorderTableLines { id, axis, order: [ids] }` : réécrit les entrées de `rows` ou `cols` dans l'ordre (clés inconnues recopiées) ; les cellules, indexées par ids, ne bougent pas ; refus `BadTable` si une fusion serait coupée ; geste : poignée de 44 px (icône Lucide `grip-vertical` / `grip-horizontal`) à gauche de la ligne active et au-dessus de la colonne active | DA4 (`move_to` absent de yrs) ; `table.rs:1-8` (cellules par ids) | oui |
| D19 | 12 — refermer un cache | clé de case `open` = `true` : la révélation (F10) pose `open` au lieu d'effacer `shade` ; un toucher sur un cache ouvert le referme ; `SetTableShadeOpen { id, row, col, open }` ; dessin d'un cache ouvert : liseré hachuré de 4 px au bord ; « Désombrer » retire tout | F10, F12 (`usage-c10b-tableau-cadrage.md:35,37`) | oui (H9) |
| D20 | 13 — trier | la page calcule l'ordre (comparaison `localeCompare` en `fr`, `numeric: true`, cases vides à la fin) puis `ReorderTableLines` ; en-tête gardé en tête ; refus avec message si une fusion couvre plusieurs lignes | D18 | oui |
| D21 | 14 — tableau de tri | clé de colonne `accept` = liste de libellés ; une étiquette = un **texte** logé, comparé sans casse ni blancs de bord ; refus = aucune commande, l'objet revient à sa place (aperçu annulé) ; réglage : champ « Accepte » de la colonne active dans le panneau | demande | oui (H11) |
| D22 | 15 — coller | `text/plain` à tabulations (au moins une `\t`, au moins 2 cellules) après le HTML : grille par `tsvGrid` puis le chemin F21 existant (`table-insert.ts:24`), toujours un **nouveau** tableau (F19) | F19, F21 | oui |
| D23 | une étape par geste | chaque geste = une commande du cœur = une transaction ; aucun recours à `runAll` (en vol dans personnalisation-2b, non fusionné) | `history.rs:1-4` ; état de `personnalisation-2` | oui |
| D24 | fichier (U3) | tout est facultatif ; `schema` et `formatVersion` inchangés ; un test « recharger garde les octets » par valeur composée neuve (`cell`, `border`, `accept`) | U3 (`usage-cadrage.md:56`) | oui |
| D25 | CLI (D15 du profil) | les commandes neuves entrent dans `COMMAND_TYPES` (`ops.ts:11`, `tsc` l'exige), les tests de `ops.test.ts`, et `cli-essai.mjs` gagne un passage « loger, insérer une ligne, enregistrer, relire » ; aucun format neuf : `FORMAT_LOTS` inchangé ; l'état (`state.ts`) publie les vues du cœur telles quelles, donc `cell` sans code | profil § CLI ; `state.ts:1-4` | oui |
| D26 | panneau d'options | OG23 n'a pas livré d'accordéon (aucun sur `origin/main`, `OptionsPanel.tsx`) : section neuve `table` du panneau, contenu dans un composant à part `ui/TableOptions.tsx` (Objets, Alignement, Bordures, En-tête, Trier, Accepte) ; l'accordéon, s'il arrive avant, l'enveloppe | brief ; décision 0311 (panneau Excalidraw) ; `tool-options.ts:89` | oui |
| D27 | isolation de la Sélection | glisser vers une case dans `engine/tools/cell-drop.ts`, branché par un paramètre facultatif de `createSelectTool`. Voir DA3 | brief (OG23 en parallèle) | oui |
| D28 | performance | `tableAt` lit les tableaux par `elementIdsOfKind(page, "table")` (aujourd'hui `element(id)` sur tous, O(N²)) ; la cible du glisser est cherchée sur les tableaux lus une fois au `begin` ; aucune boucle neuve dans `emit` | piège `roomboard-tablecounts-relit-chaque-element-dans-emit` ; `table-geom.ts:168` | oui |
| D29 | Wasm | tout le calcul (mesure, tri, TSV, ordre, ajustement) en TS ; le cœur n'écrit que des valeurs données ; chaque commande neuve a son export `#[wasm_bindgen]`, sa version `_inner` (`roomboard-wasm/src/lib.rs:1072`, `:1982`) et son `case` dans `wasm-core.ts` (`:525-585`, `:645`) ; `commit_stroke` (`lib.rs:1317`, `:2219`) gagne `cell` ; coût estimé +30 à +60 Ko sur le module principal (8 exports et leur colle comptés), 0 sur `formats`. Voir DA4 | brief ; F26 ; `lib.rs:1072` | oui |
| D30 | empreinte S6 | non touchée : le chemin du pot n'appelle ni `tableAt` ni les commandes neuves ; la vue d'un élément lit une clé de plus (`cell`) ; banc rejoué en témoin à la clôture de A | `zone-s6-banc.test.ts:1-3` ; `docs/essais/c8-porte-s6.md` | oui |
| D31 | tactile et clavier | glisser par événements de pointeur du moteur (jamais HTML5, U12, U24) ; appui long (500 ms) sur une case = menu de la case (Mettre en fond, Sortir, Trier) ; raccourcis en § 4 (H12), ajoutés à `shortcuts.ts` | U12, U24 ; D-DS3 | oui |
| D32 | design | îlots et jetons existants, icônes Lucide de la table `icons.ts` (`grip-vertical`, `grip-horizontal`, `align-*`, `square-dashed`, `heading`, `arrow-down-a-z`, `image`), traits 1,5 calés (D-DS4, § 10) ; aperçu de case visée : cadre 2 px couleur d'accent ; **porte visuelle** à la fin de A et de B | `design-cadrage.md:110-111`, § 10 | oui |
| D33 | taille des points et ordre de coupe | S ≈ 20 min, M ≈ 40, L ≈ 75 (écriture, tests et relecture). A : 1 L · 2 S · 3 M · 4 M · 5 M (≈ 3 h 15). B : 6 M · 7 S · 8 M · 9 M · 10 S · 11 M (≈ 3 h 20). C : 12 S · 13 S (après 11) · 14 M · 15 S (≈ 1 h 40). Total ≈ 8 h 15 : **tout ne tient pas**. Ordre de coupe, du premier coupé au dernier : 14, 13, 12, 15, 11, 9, 8, 7, 10, 6, 5. Attendu en 5 h 30 : A entier, puis 6, 10, 7 (et 8 si le temps reste) | brief (ordre A, B, C) | oui |
| D34 | taille exigée | une seule fonction `requiredSizes(t: TableData, linked: readonly LinkedBox[], colWidths: readonly number[], measure: Measure): { rows: number[]; cols: number[] }` dans `table-geom.ts` : ligne = max sur ses cases de max(hauteur du texte, hauteur de l'objet logé le plus haut + 2 × marge, `TABLE_ROW_HEIGHT`) ; colonne = max(largeur de l'objet le plus large + 2 × marge, 2 × marge + 24). **Case à texte et objet** : ils partagent la boîte intérieure, l'objet dessiné par-dessus le texte (il est au-dessus dans la pile), la case prend le max des deux, jamais la somme. Appelée par Uniformiser (`tools/table.ts:243-249` : largeur = max(moyenne, colonne exigée), hauteur = max(moyenne, ligne exigée)), D11, D13, D14 ; `rowHeightsFor` reste pour l'import (aucun objet) | `tools/table.ts:243-249` ; `table-geom.ts:238` | oui |
| D35 | case ombrée et objet logé | **cas écarté** (DA1, H23) : l'ombrage ne couvre que le texte et le fond ; loger dans une case à ombrage fermé est refusé (`PlaceInCell` : `BadTable` ; `cell-drop` : déplacement libre) ; « Ombrer » une plage qui porte un objet logé est refusé par l'outil Tableau avec le message « retirez d'abord les objets de la case » ; un document fait autrement (CLI) dessine l'objet par-dessus le cache, sans plantage. Cacher un objet sous un cache : hors périmètre | contre-relecture tour 1 ; `table-paint.ts:1-6` | oui |
| D36 | tableau dans un tableau | `cell` sur un élément `table` : refusé à l'écriture (`BadTable`), ignoré à la lecture (anti-cycle) | contre-relecture tour 1 | oui |

## 3. Carte d'impact

Le profil n'a pas de ligne « Surfaces d'impact » : rubriques déduites du graphe et de la recherche texte.

### Cœur Rust (`crates/roomboard-core`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/table.rs:1-8` (en-tête du schéma), `:29-69` (vues) | oui | clés `bg`, `ha`, `va`, `border`, `open`, `fit`, `header`, `accept` ; `TableView` / `TableCellView` les publient | V |
| `src/table.rs:135` (`read_raw`), `:188` (`read_cell`) | oui | lecture tolérante des clés neuves | V |
| `src/table.rs:315` (`view` : saute les cases sans texte, remplissage ni ombrage) | oui | une case qui n'a que `bg`, `ha`, `va`, `border` ou `open` est listée | V |
| `src/table.rs` (nouveau : `follow_cells`, `cmd_set_table_line_sizes`, `cmd_place_in_cell`, `cmd_reorder_table_lines`, `cmd_set_table_look`, `cmd_set_table_options`, `cmd_set_cell_image`, `cmd_set_table_shade_open`, `cmd_set_table_accept`) | oui | D3-D5, D9, D12, D15-D21 | S |
| `src/commands.rs:63` (`CommitStroke`) | oui | `cell` facultatif (D10) | V |
| `src/commands.rs:140-240` (`Command`) | oui | 8 variantes neuves | V |
| `src/commands.rs:1043` (`cmd_transform`) | oui | emporte les objets liés ; retire `cell` d'un objet sorti de sa case (D6) | V |
| `src/commands.rs:1575`, `:1612` (morceaux de la gomme) | oui | un morceau garde `cell` comme `group` | V |
| `src/commands.rs:1452` (`cmd_restack`) | non | la montée passe par `reinsert_kept` (D3) | V |
| `src/element.rs:193` (`ElementView.group`), `:308` (`read_group`) | oui | `cell` lu à côté de `group` | V |
| `src/copy.rs:61-90` (`copy_elements` : copie, Dupliquer la page, insertion de pages et de fragments) | oui | ids neufs **tous générés d'abord** (table ancien → neuf des éléments copiés), puis `cell[0]` remplacé ; tableau absent de la copie : lien retiré ; un objet sous son tableau (après `Restack`) est recopié avant lui, d'où la génération préalable | V |
| `src/copy.rs:96` (`reinsert_kept`) | non (réutilisé) | montée des objets dans `PlaceInCell` (D3) | V |
| `src/document.rs:278` (`cited_assets`) | non | lit déjà toute chaîne d'asset à toute profondeur (D12) | V |
| `src/history.rs` | non | une transaction = une étape | V |
| `src/query.rs` (`hitTest`, `bounds`) | non | objets liés = éléments ordinaires | V |
| `crates/roomboard-wasm/src/lib.rs:1072`, `:1982` (patron export + `_inner`), `:1317`, `:2219` (`commit_stroke`) | oui | 8 exports `#[wasm_bindgen]` et leurs `_inner` ; `commit_stroke` gagne `cell` (3 chaînes facultatives) | V |
| `crates/roomboard-formats` | non | aucun lecteur ni écrivain touché ; `.iwb`/`.ubz` n'exportent pas les tableaux (`board-io.ts:259`) | V |

### Contrat et faux cœur (`apps/web/src/core`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `api.ts` (`Command`, `ElementView`, `TableCell`, `TableData`) | oui | commandes et champs neufs | V |
| `fake-core.ts` (`FakeTable`, `apply`) | oui | parité des 8 commandes neuves **et** des commandes existantes qui changent : `Transform` (emport, sortie de case, `:894`), `InsertTableLine`, `RemoveTableLine`, `SetTableSizes`, `SetTableCell` (suivi D5, `:946`, `:1033`), `Erase` (morceau garde `cell`, `:1303`), `extract`, `insertFragment`, `DuplicatePage` (renumérotation de `cell`, `:1817`), `CommitStroke` (`cell`) | V |
| `wasm-core.ts` (`toElementView` ; `case` des commandes, `:525-585`, `:645`) | oui | `cell` et clés de case projetés ; un `case` par commande neuve ; `CommitStroke` passe `cell` | V |
| `wasm-core.contract.test.ts` | oui | contrat faux ↔ vrai pour chaque commande neuve et pour chaque commande existante de la ligne au-dessus (suivi, emport, sortie, gomme, copie, Dupliquer la page) | V |

### Moteur, outils, rendu (`apps/web/src/engine`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `tools/cell-drop.ts` (nouveau) | oui | DA3 | S |
| `tools/select.ts:96` (signature), `:148-165` (`begin`), `:183-204` (`close`), `:206` (`live`) | oui | 4 points d'appel du module (DA3) ; rien d'autre | V |
| `tools/table.ts` | oui | poignées de bordure et de déplacement, double appui, appui long, raccourcis, `SetTableLook`, tri, `TableAction` étendu ; saisie de cellule (`:197-207`) ouverte dans `cellTextFrame` (D15) ; Uniformiser (`:243-249`) par `requiredSizes` (D34) ; « Ombrer » refusé sur une case à objet (D35) | V |
| `tools/pen.ts:119` | oui | `cell` au commit (D10) | V |
| `tools/eraser.ts` | non | la gomme passe par `Erase` du cœur | V |
| `table-geom.ts:168` (`tableAt`), `:225` (`cellInnerBox`), `:238` (`rowHeightsFor`) | oui | `elementIdsOfKind` (D28) ; `cellTextFrame` (D15) ; `requiredSizes` (D34) ; `naturalWidth` (D14) ; `cellContaining` (D10) | V |
| `text-layout.ts` (`layoutRich`) | oui | paramètre `ha` : décalage horizontal par ligne (D15) | V |
| `groups.ts:24` (`expandToGroups`) | non (réutilisé) | élargissement par `cell-drop.expand` après lui | V |
| `render/table-paint.ts:75` (`paintTableGrid`), `:127` (`cellTextBoxes`) | oui | bordures par case, en-tête, fond image, cache ouvert, alignement | V |
| `render/canvas2d.ts:314-373` (`paintText`) | oui | décalage horizontal par ligne (alignement) ; image de fond par `image-cache` | V |
| `render/overlay.ts` | oui | cadre de la case visée, poignées du tableau | S |
| `engine.ts` (`key`, fabrique des outils) | oui | raccourcis Alt+Entrée de la Sélection ; passage de `cell-drop` | V |
| `fill-target.ts:72-73` | oui | le mot visé se cherche depuis `cellTextFrame`, plus depuis le coin haut-gauche (D15) | V |
| `zone-s6-banc.test.ts` | non | témoin rejoué (D30) | V |

### Interface (`apps/web/src/ui`, `apps/web/src/app`, `apps/web/src/platform`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `ui/TableOptions.tsx` (nouveau) | oui | D26 | S |
| `ui/OptionsPanel.tsx:74`, `:234` ; `ui/tool-options.ts:6`, `:89` | oui | section `table` ; `showsPanel` accepte `table` | V |
| `ui/Toolbar.tsx:221` (`TableActionRow`), `toolbar.ts:147-165` | oui | bouton « En-tête » (D17) seulement ; la rangée garde ses 9 actions | V |
| `ui/icons.ts` | oui | icônes Lucide neuves (D32) ; `icons.test.ts` | V |
| `ui/shortcuts.ts` | oui | raccourcis (H12) | V |
| `app/board-session.ts:377` | oui | `cell-drop` et mesure passés à la Sélection | V |
| `app/text-editor.ts` | oui | `text-align` de la saisie de cellule (D15) ; fichier aussi touché par personnalisation-2b | V |
| `app/stage-tags.ts` | oui | `data-table` gagne le nombre d'objets logés du tableau actif (lu au `cellState`, jamais par `emit`) | S |
| `platform/paste.ts:43`, `html-table.ts` | oui | `text/plain` tabulé (D22) | V |
| `platform/table-insert.ts:24` | non (réutilisé) | grille → tableau | V |
| `app/pdf-export.ts`, `app/pdf-overlay-vector.ts:15` | non | même peintre que l'écran (D7 de C12) : rendu cohérent sans code | V |
| `app/board-io.ts:259` | non | tableaux non exportés en `.iwb` : objets logés exportés comme objets libres | V |

### CLI et essais

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/cli/src/ops.ts:11` (`COMMAND_TYPES`) | oui | 8 commandes | V |
| `apps/cli/src/ops.test.ts` | oui | une ligne par commande neuve | V |
| `apps/cli/src/formats.ts:81` (`FORMAT_LOTS`) | non | aucun format neuf | V |
| `apps/cli/src/state.ts` | non | vues du cœur telles quelles | V |
| `scripts/essais/cli-essai.mjs` | oui | passage S16 | V |
| `scripts/essais/personnalisation-3-navigateur.mjs` (nouveau) | oui | S1-S15 au doigt et au clavier, `verifier.sh --e2e` | S |
| `scripts/verifier.sh` (liste des essais `--e2e`) | oui | l'essai neuf | S |

### Tests à garder verts (non touchés sur le fond)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core/src/table.rs` (tests `:1757-3071`) | non | C10a, C10b inchangés | V |
| `apps/web/src/engine/tools/table.test.ts`, `table-geom.test.ts` | non | comportements existants gardés | V |
| `apps/web/src/engine/tools/select.test.ts` | oui pour F10 seulement | le toucher révèle par `SetTableShadeOpen` (D19) ; les autres cas inchangés | V |
| `apps/web/src/platform/paste.test.ts`, `html-table.test.ts` | non | le HTML passe toujours avant le texte | V |
| `scripts/essais/c10a-tableau-navigateur.mjs`, `c10b-*`, essais à `data-item` | non | hors du tableau, rien ne change | S |

### Effets de bord sur l'existant

- Un objet lâché sur un tableau s'y loge (avant : posé par-dessus) ; Alt garde l'ancien geste → `cell-drop.test.ts` « Alt : Transform seul ».
- Déplacer ou redimensionner un tableau emporte ses objets liés ; sans objet lié, rien ne change → `commands.rs` « transform_table_without_links_unchanged » et `select.test.ts` (cas existants).
- La révélation F10 écrit `open` au lieu d'effacer `shade` ; un fichier enregistré ainsi, ouvert par une version d'avant, montre la case fermée → `select.test.ts` « toucher : SetTableShadeOpen », `table.rs` « reveal_keeps_shade ».
- `tableAt` lit par `elementIdsOfKind` : même résultat, ordre de pile gardé → `table-geom.test.ts` « tableAt garde le plus haut ».
- Un morceau de gomme garde `cell` → `commands.rs` « partial_erase_keeps_cell ».
- Le panneau d'options s'ouvre avec l'outil Tableau → `tool-options.test.ts` « showsPanel(table) », `OptionsPanel.test.tsx`.
- Coller un texte à tabulations crée un tableau (avant : ignoré) → `paste.test.ts` « text/plain tabulé ».
- Uniformiser ne réduit plus une ligne ou une colonne sous la taille d'un objet logé → `table.test.ts` « uniform garde les objets ».
- Dupliquer la page, copier ou insérer des pages renumérote `cell` → `copy.rs` « duplicate_page_keeps_cell_links », « object_below_its_table_is_relinked ».
- Un objet lié déplacé hors de sa case perd son lien → `commands.rs` « transform_out_of_cell_unlinks ».
- « Ombrer » est refusé sur une case qui porte un objet → `table.test.ts` « shade refusé sur case à objet ».

### Chantiers en cours

- `personnalisation-2` (branche `feat/personnalisation-2b`, OG14, lot 2 en clôture) : `engine/engine.ts` (+232, `runAll`), `ui/OptionsPanel.tsx` (+279), `ui/tool-options.ts`, `ui/shortcuts.ts`, `render/canvas2d.ts`, `core/fake-core.ts`, `core/wasm-core.ts`, `crates/roomboard-core/src/element.rs`, `crates/roomboard-wasm/src/lib.rs`, `scripts/essais/cli-essai.mjs`.
- `portrait-pleine-largeur` (OG24) : `engine/engine.ts`, `engine/input/keys.ts`, `ui/rb.css`, `scripts/verifier.sh`.
- `gomme-surface-contact` (OG25, cadrage seul) : touchera la gomme, peut-être `commands.rs` (`Erase`, `:1560-1615`).
- OG23 (outil de sélection : panneau, flèches, Dupliquer, « Glisser une copie ») : aucun worktree sur cette machine, déclaré par le brief : `tools/select.ts`, `OptionsPanel.tsx`.
- PR ouvertes : aucune (`gh pr list`).
- Conséquence : intégrer `origin/main` avant chaque fusion de lot ; `select.ts` n'est touché qu'en 4 points (DA3).

### Termes cherchés

- Graphe : `graphify affected "createSelectTool"`, `graphify affected "tableAt"`, `graphify query "qui lit le champ group d'un élément et le recopie" --budget 800`.
- Texte : `grep -n "Table" crates/roomboard-core/src/commands.rs` ; `grep -rn "\"group\"" crates/roomboard-core/src` ; `grep -rn "runAll"` (worktree personnalisation-2) ; `grep -rn -i "accord\|<details" apps/web/src/ui/OptionsPanel.tsx` ; `grep -rln "accordion\|accordéon" apps/web/src` ; `grep -rn "F21\|tabul\|text/html\|<table" apps/web/src/platform/paste.ts` ; `grep -rln "kind === \"table\"\|\"table\"\|TableView\|paintTable"` ; `grep -n "align" apps/web/src/engine/text-layout.ts apps/web/src/core/api.ts` (aucun) ; `grep -rn "longPress\|appui long" apps/web/src` (tooltip seulement) ; `grep -n "fn cited\|cited_assets" crates/roomboard-core/src` ; `grep -n "s(\"" apps/web/src/ui/shortcuts.ts`.
- Coffre : `chercher.js "RoomBoard tableau cellule objet" 8`, `chercher.js "roomboard outil sélection glisser" 6`.

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant | interface appelée ou étendue | décision |
|---|---|---|---|
| lien objet → case, lu et écrit | `element.rs:308` `read_group`, `:322` `group_to_any` | `read_cell_link(txn, e) -> Option<[String; 3]>`, `cell_link_to_any(&[String; 3]) -> Any` à côté | étendre |
| élargir une sélection à des objets liés | `groups.ts:24` `expandToGroups`, `:12` `viewsOf` | `cell-drop.expand(ids, views)` appelé après `expandToGroups` | réutiliser |
| case sous un point, rectangles, marges | `table-geom.ts:168` `tableAt`, `:116` `cellRect`, `:225` `cellInnerBox`, `:238` `rowHeightsFor`, `:231` `cellHeight` | appelés tels quels ; `tableAt` lit par `elementIdsOfKind` | réutiliser (`tableAt` : étendre) |
| case qui contient une boîte (tracé) | `table-geom.ts` | `cellContaining(doc, page, box: Bounds): { table, row, col } \| null` | étendre |
| largeur naturelle d'une colonne | `text-layout.ts:27` `Measure` | `naturalWidth(t: TableData, col: number, measure: Measure): number` dans `table-geom.ts` | étendre |
| écrire des tailles par ligne | `table.rs:74` `Line.map` | `write_line_sizes(txn, raw, sizes)` partagé par `SetTableLineSizes` et `PlaceInCell` | étendre |
| transformer avec le tableau | `commands.rs:1043` `cmd_transform` | cibles élargies aux objets liés | étendre |
| morceau de gomme | `commands.rs:1575` (copie de `group`) | même copie pour `cell` | étendre |
| copie d'un tableau et de ses objets | `copy.rs:61` `copy_elements`, `:75` `renumber` | ids générés d'abord, puis `cell[0]` remplacé | étendre |
| asset du fond de case gardé à l'enregistrement | `document.rs:278` `cited_assets` | aucun changement | réutiliser |
| montée d'objets dans la pile | `copy.rs:96` `reinsert_kept` | appelé après l'écriture de `matrix` et `cell` | réutiliser |
| taille exigée par le texte et les objets | `table-geom.ts:238` `rowHeightsFor`, `:231` `cellHeight` | `requiredSizes` (D34) les appelle pour le texte | étendre |
| décalage d'alignement unique | `table-geom.ts:225` `cellInnerBox` | `cellTextFrame` (D15) le prolonge | étendre |
| dessin d'image | `render/image-cache` | `ImageSource` déjà passé au peintre | réutiliser |
| collage → tableau | `table-insert.ts:24` `gridTable`, `html-table.ts:35` `cutText` | `tsvGrid(text: string): TableGrid \| null` dans `html-table.ts` | étendre |
| révélation au toucher | `select.ts:178` (F10) | commande `SetTableShadeOpen` au lieu de `SetTableShade` null | étendre |
| glisser vers une case | aucun (cherché : `drop`, `cell`, `dock`, `snapToCell`, `expandTo`) | `engine/tools/cell-drop.ts`, interface en DA3 | nouveau module |
| options du tableau | `ui/OptionsPanel.tsx` (sections), `RadioChoices.tsx` | `ui/TableOptions.tsx` : `TableOptions(props: { state: Accessor<TableCellState \| null>; host: TableOptionsHost })` ; `TableOptionsHost = { look(p: TableLookPatch): void; options(p: { fit?: "grow" \| "shrink"; header?: boolean }): void; sort(dir: "asc" \| "desc"): void; accept(labels: readonly string[]): void; cellImage(on: boolean): void }` | nouveau module (le panneau n'a aucune section de tableau ; cherché : `table` dans `tool-options.ts`, `OptionsPanel.tsx`) |
| glisser au pointeur dans le DOM | `ui/pointer-gesture.ts` (décision 0299) | non applicable : les gestes de la scène passent par `engine/input/gesture.ts` | sans objet |

## 4. Hypothèses à revoir

**Niveau 1 — difficiles à défaire ou visibles des utilisateurs**

- H1 Noms des champs du fichier (`cell`, `fit`, `header`, `bg`, `ha`, `va`, `border`, `open`, `accept`) : figés à la première release (U3).
- H2 Lâcher un objet sur une case le loge sans demander ; Alt pour l'éviter. Alternative : seulement en survol de 300 ms.
- H3 L'objet logé est posé selon l'alignement de la case, haut-gauche par défaut (règle unique de D8) ; un tracé écrit dans la case reste où il est.
- H4 Sortir un objet ne réduit une ligne ou une colonne que si sa taille vaut celle que l'objet avait imposée.
- H5 Plusieurs objets peuvent loger dans une case : la case prend le plus grand, ils se superposent au centre.
- H6 Redimensionner un tableau par les poignées de la Sélection déforme ses objets avec lui (même `Transform`).
- H7 Supprimer, copier ou dupliquer un tableau emporte ses objets logés (sélection élargie).
- H8 Options du tableau dans une section du panneau d'options (pas dans la rangée de la barre, déjà pleine).
- H9 La révélation garde le cache (`open`) : un ancien lecteur montre la case fermée.
- H10 Tri : refusé si une fusion couvre plusieurs lignes ; comparaison numérique en `fr`.
- H11 Une étiquette du tableau de tri = un texte ; une image ne peut pas en être une.
- H12 Raccourcis (outil Tableau, case active, saisie fermée) : Alt+Maj+←/→ largeur ± 8, Alt+Maj+↑/↓ hauteur ± 8 ; Alt+A ajuster ; Alt+Maj+L / C / R alignement horizontal, Alt+Maj+H / M / B vertical ; Alt+B bordure, Alt+Maj+B aucune ; Alt+E en-tête ; Ctrl+Maj+↑/↓ déplacer la ligne, Ctrl+Maj+←/→ la colonne ; Alt+O cacher / ouvrir ; Alt+T trier croissant, Alt+Maj+T décroissant ; Alt+F bascule agrandir / rétrécir. Alt+I mettre l'image logée en fond. Outil Sélection : Alt+Entrée loger la sélection dans la case sous son centre, Alt+Maj+Entrée la sortir. Alt+← (retour du navigateur) évité.
- H23 Cacher un objet sous un cache est écarté (D35) : l'ombrage couvre texte et fond ; Ombrer une case à objet est refusé.
- H24 Un objet lié déplacé sans son tableau garde son lien tant que son centre reste dans sa case (D6).
- H13 Ordre de coupe (D33) : l'ordre de Jérôme prime sur le coût ; 15 et 12 (S) pourraient passer avant 11 si Jérôme préfère.

**Niveau 2**

- H14 Poignées de 44 px seulement sur la case active ; bordure à ± 6 px pour la souris.
- H15 Double appui : 300 ms, 8 px.
- H16 Largeur ajustée bornée à 960 (4 × 240).
- H17 Appui long : 500 ms, ouvre un menu de case.
- H18 Fond de case en « couvrir », jamais déformé.
- H19 Cache ouvert dessiné par un liseré hachuré de 4 px.
- H20 Coût Wasm estimé +30 à +60 Ko (non mesuré).
- H22 Ligne ou colonne retirée : ses objets restent sur la page, libres, à leur place (aucune source ; autre choix : les supprimer avec la ligne).
- H21 Collage tabulé : au moins une tabulation et deux cellules, sinon ignoré comme aujourd'hui.

## 5. Décisions d'architecture

**DA1 — Objet dans une case : objet de la page lié par id (champ `cell`).**
Contexte : enfant de la case (objet rangé dans la `Y.Map` de la cellule) ou objet de la page lié par id.
Décision : objet de la page, champ facultatif `cell = [tableId, rowId, colId]`, comme `group` (U7). L'enfant obligerait rendu, collision, gomme, Sélection, exports, copie et CLI à parcourir un niveau neuf, et un ancien lecteur cacherait l'objet.
Conséquences : un ancien lecteur montre l'objet à sa dernière place (dans la case), sans planter ni le perdre ; rendu, collision et exports n'ont rien à faire ; un seul nouveau travail : garder l'objet dans sa case quand le tableau bouge (DA2).
Prix : le lien peut se rompre (tableau supprimé ailleurs) ; lecture tolérante : objet libre. Un objet logé reste un élément au-dessus du tableau : l'ombrage ne peut pas le cacher, d'où D35 (logement refusé dans une case ombrée fermée, Ombrer refusé sur une case à objet). `cell` sur un tableau est refusé et ignoré (D36).

**DA2 — La page calcule, le cœur écrit et fait suivre.**
Contexte : une étape par geste ; la mesure du texte n'existe que dans la page ; la CLI pilote le cœur sans moteur.
Décision : commandes à valeurs explicites (tailles, matrice) calculées par `cell-drop.ts` et l'outil Tableau ; le cœur, lui, translate les objets liés après toute commande qui change la géométrie du tableau (`follow_cells`), et `Transform` d'un tableau emporte ses objets.
Conséquences : une transaction par geste, sans `runAll` ; la CLI insère une ligne et les objets suivent ; le cœur parcourt la page à ces commandes seulement (O(N) par geste, jamais par `emit`).

**DA3 — Isolation : `engine/tools/cell-drop.ts`, branché par un paramètre de `createSelectTool`.**
Contexte : OG23 réécrit l'outil Sélection en parallèle ; le glisser vers une case ne doit pas s'y mêler.
Décision : `createSelectTool(ctx: ToolContext, cellDrop?: CellDrop)` ; module : `createCellDrop(ctx: ToolContext, measure: Measure): CellDrop` avec `interface CellDrop { expand(ids: readonly string[], views: readonly GroupedView[]): string[]; target(selection: readonly string[], x: number, y: number): Bounds | null; drop(selection: readonly string[], matrix: Matrix, x: number, y: number, alt: boolean): Command | null; place(selection: readonly string[], out: boolean): Command | null }`.
Conséquences : `select.ts` change en 4 lignes (élargir après `expandToGroups` aux deux endroits, `drop(...) ?? Transform` au relâché, cadre `target` dans `live`) ; sans `cellDrop`, comportement d'aujourd'hui ; `place` sert Alt+Entrée.

**DA4 — Wasm : le calcul en TS, le cœur en écrivain.**
Contexte : module principal 1 429 407 o pour 1 572 864 (marge 143 457 o) ; `formats` 2 794 527 o pour 3 145 728.
Décision : mesure, ajustement, tri, ordre, TSV, choix de la case en TS ; dans le cœur, 8 variantes de `Command` avec chacune son export `#[wasm_bindgen]`, sa version `_inner` et son `case` de `wasm-core.ts`, `commit_stroke` élargi, `follow_cells`, lectures tolérantes : estimé +30 à +60 Ko au principal (marge 143 Ko), 0 à `formats`.
Conséquences : chaque lot relève les deux tailles avant et après ; au-delà de 1 540 000 o, le lot s'arrête et le plan déplace une commande en composition de commandes existantes ; aucun seuil ne bouge.

**DA5 — Options du tableau : section `table` du panneau, composant `ui/TableOptions.tsx`.**
Contexte : le panneau (OG11) ne s'ouvre pas avec l'outil Tableau ; la rangée de la barre a déjà 9 actions ; OG23 et OG14 touchent `OptionsPanel.tsx`.
Décision : une clé `table` dans `OptionKey`, `showsPanel` accepte `table`, et tout le contenu vit dans `TableOptions.tsx` (interface en § 3).
Conséquences : 3 lignes dans les fichiers partagés ; un accordéon livré plus tard enveloppe la section sans la réécrire.

## 6. Scénarios d'acceptation

Joués par `scripts/essais/personnalisation-3-navigateur.mjs` (`verifier.sh --e2e`), au doigt (`pointerType: "touch"`) puis au clavier ; sinon test unitaire nommé.

- **S1 (1)** Créer un tableau 3 × 3, poser une image de 400 × 300 hors du tableau, la glisser au doigt sur la case (1, 1) : la colonne 1 fait 416, la ligne 1 fait 316, la colonne 2 et la ligne 2 se décalent, l'image remplit la boîte intérieure ; Ctrl+Z : tout revient en une fois. Au clavier : sélectionner l'image, la placer au-dessus de la case, Alt+Entrée : même résultat.
- **S2 (2)** Régler le tableau sur « rétrécir » (panneau, ou Alt+F en outil Tableau), glisser la même image : la case garde 240 × 64, l'image est réduite à l'échelle 0,16 (boîte intérieure 224 × 48, `table-geom.ts:225`) : 64 × 48, posée en haut à gauche de la boîte.
- **S3 (3)** Avec le stylo, écrire un mot dans la case (1, 0) ; outil Tableau, case (0, 0) active, « + Ligne » (insertion après la ligne 0) : le mot descend de 64 avec sa case ; un trait qui déborde sur deux cases reste libre ; déplacer le tableau à la Sélection : le mot suit ; enregistrer, rouvrir : le lien est là (`cell` dans l'état de la CLI).
- **S4 (4)** Glisser l'image de S1 hors du tableau : elle est libre, la colonne 1 revient à 240 et la ligne 1 à 64 ; une colonne élargie à la main ne bouge pas. Au clavier : Alt+Maj+Entrée.
- **S5 (5)** Image logée ; outil Tableau, appui long sur la case puis « Mettre en fond » (au clavier : case active, Alt+I) : l'image devient le fond de la case, sous le texte saisi ensuite ; l'export PDF montre le fond ; Ctrl+Z rend l'image libre.
- **S6 (6)** Outil Tableau, case active, tirer au doigt la poignée du bord droit de 100 px : la colonne s'élargit de 100, une étape ; à la souris, tirer une bordure à ± 6 px ; au clavier, Alt+Maj+→ : + 8.
- **S7 (7)** Double appui sur la poignée du bord droit d'une colonne contenant « Photosynthèse » : la colonne prend la largeur du mot plus les marges ; Alt+A : même effet.
- **S8 (8)** Plage de deux cases, panneau « centre » et « milieu » (ou Alt+Maj+C puis Alt+Maj+M) : le texte est centré dans les deux, à l'écran et dans le PDF.
- **S9 (9)** Plage 2 × 2, bordure rouge épaisse en tirets : les huit bords extérieurs et intérieurs sont rouges en tirets ; « aucune » sur une case (Alt+Maj+B) : ses bords disparaissent ; rouvrir le fichier : identique.
- **S10 (10)** Bouton « En-tête » (ou Alt+E) : la première ligne passe en gras sur fond clair ; Ctrl+Z la rend normale.
- **S11 (11)** Tirer la poignée de la ligne 2 au-dessus de la ligne 0 : ordre 2, 0, 1, objets logés compris ; Ctrl+Maj+↑ fait de même au clavier ; un tableau avec une fusion sur deux lignes refuse avec un message.
- **S12 (12)** Ombrer une case, passer en Sélection, la toucher : elle s'ouvre ; la toucher encore : elle se referme ; Alt+O en outil Tableau bascule de même.
- **S13 (13)** Colonne de nombres 10, 9, 100 sous un en-tête, « Trier croissant » (Alt+T) : 9, 10, 100, l'en-tête reste en haut.
- **S14 (14)** Colonne « Mammifères » acceptant « chat, chien » : glisser le texte « chat » : il loge ; glisser « truite » : il revient à sa place, aucune étape d'annulation.
- **S15 (15)** Coller `a\tb\nc\td` en `text/plain` : un tableau 2 × 2 neuf ; un collage Excel (HTML) reste traité par F19 (test `paste.test.ts`).
- **S16 (CLI)** `cli-essai.mjs` : `AddTable`, `AddShape`, `PlaceInCell`, `InsertTableLine` à la ligne 0 : la forme descend de la hauteur insérée ; `save`, réouverture, `state` : `cell` présent ; `undo` : une étape par commande.
- **S18 (garde-fous)** Tests du cœur et de `cell-drop` : loger dans une case ombrée fermée → refus ; Ombrer une case à objet → refus et message ; `PlaceInCell` d'un tableau → `BadTable` ; objet lié déplacé hors de sa case par `Transform` → lien retiré ; dupliquer la page → objets liés au tableau copié.
- **S17 (U3)** Test du cœur : un document à objets logés, bordures et fond relu par le faux lecteur « sans les clés » (clés inconnues ignorées) donne les mêmes éléments aux mêmes places ; « recharger garde les octets » pour `cell`, `border`, `accept`.

## 7. Hors périmètre

- Cacher un objet logé sous un cache (D35) : demande un saut des objets liés au rendu, à `hitTest` (`query.rs`) et au PDF.
- Coller dans un tableau existant à la case active (F19 : toujours un tableau neuf).
- Étiquette d'image pour le tableau de tri (H11).
- Écrire les tableaux, fonds et bordures dans `.iwb` / `.ubz` (non exportés aujourd'hui, `board-io.ts:259`).
- Rotation d'un objet logé à la mise en case (il garde sa rotation).
- Animation de retour d'une étiquette refusée au-delà de l'annulation de l'aperçu.
- Site de documentation (`roomflow-site` n'est pas concerné) ; l'aide intégrée (`HelpPanel`, en vol dans OG14) reçoit les raccourcis par `shortcuts.ts` seulement.
- Le constat ouvert `render/table-paint.ts:11` (`CellTextBox.text` doublon de `spans`) : non fermé ici, `cellTextBoxes` n'est touché que pour l'alignement.

## 8. Portes immédiates

Aucune.

## 9. Suite OG32 (2026-11-28) — décisions des points restants

Mode autonome (brief OG32) : aucune question ne parvient à Jérôme ; chaque décision ci-dessous est un **choix tranché
seul**, avec sa source et sa raison. D1 à D36 restent valables ; les décisions DS complètent celles qui restaient ouvertes
et changent la forme d'écriture de trois d'entre elles (D15, D19, D21), là où c'est écrit. Périmètre : mineurs de la
PR 74, points 7, 8, 9, 11 (lot B) et 12, 13, 14 (lot C) ; le point 15 (collage tabulé) est traité à part.
Base lue : `origin/main` @ 161cf734. Plan : `docs/plans/personnalisation-3-tableau-PLAN-suite.md`.

### Ce que `main` fait désormais (lu sur le code)

- Module Wasm principal : 1 456 551 o après `wasm-opt -Oz` (`scripts/verifier.sh:49-51`, `docs/essais/taille-wasm.md`
  § OG23), plafond 1 572 864 o : marge 116 313 o. Module `formats` : 2 795 907 o pour 3 145 728 o.
- L'accordéon d'OG23 existe (PR #73, `ui/OptionsPanel.tsx:192-199`, `OPTION_ORDER` de `ui/tool-options.ts:10`,
  `sectionOpen`) ; le panneau ne s'ouvre pas avec l'outil Tableau (`showsPanel`, `tool-options.ts:117` ; test
  `tool-options.test.ts:73`). La prémisse « OG23 n'a pas livré d'accordéon » de l'état est périmée.
- `paintText` aligne déjà chaque ligne (`render/canvas2d.ts:381-387`, OG11) ; `offsetAt` ne connaît aucun alignement
  (`text-layout.ts:271`) ; la saisie DOM n'a pas de `text-align` (`app/text-editor.ts:314-321`).
- `runAll` existe (`engine.ts:825`) ; il n'est pas utilisé ici : D23 tient (un geste = une commande du cœur).
- Les touches du Tableau sont disjointes de celles d'OG23 par un test (`input/keys.test.ts:377`, « fusion OG23 × OG26 »).
- TB3 à TB6 du plan du lot B n'ont jamais été relus ni exécutés : repris et corrigés dans le plan de la suite.

### Décisions

| # | point | décision | source | raison |
|---|---|---|---|---|
| DS1 | Wasm (8, 9, 12, 14) | **une seule commande Rust de réglage**, `SetTableLook { id, from, to, look }`, une clé par commande : `ha`, `va`, `border`, `open` posés sur les ancres et cellules simples de la plage, `accept` posé sur ses colonnes. Valeur contrôlée avant la recherche du tableau (`BadTable`) ; rien ne change : aucune étape. Export à types primitifs `set_table_look(id, from_row, from_col, to_row, to_col, key, text, width, labels)` (aucun `Deserialize` neuf). Remplace la forme `SetTableLook { ha?, va?, border? }` de D15, la commande `SetTableShadeOpen` de D19 et le « réglage » de D21 ; les clés du fichier (`ha`, `va`, `border`, `open`, `accept`) sont celles de H1. Choix tranché seul | brief OG32 (« une seule commande Rust minimale ») ; DA4 ; `docs/essais/taille-wasm.md` § OG23 | un export et une colle JS pour quatre points ; le tri (13) et l'ajustement (7) n'ont besoin d'aucune commande neuve |
| DS2 | Wasm (11, 13) | seconde et dernière commande Rust : `ReorderTableLines { id, axis, order }` (D18, inchangée). Estimation après `-Oz` : `SetTableLook` +10 à +18 Ko, `ReorderTableLines` +4 à +7 Ko, soit +14 à +25 Ko (marge restante ≥ 90 Ko). Toute tâche Rust mesure les deux modules ; **arrêt si la marge du principal passe sous 40 Ko** (module > 1 532 864 o) ou celle de `formats` sous 40 Ko (> 3 104 768 o). Aucun seuil ne bouge, `opt-level = "z"` refusé. Choix tranché seul | brief OG32 ; `taille-wasm.md` (T7 : +4 130 o, T9 : +4 983 o par commande du lot A, avant `-Oz`) | mesure du coût réel d'une commande de tableau au lot A |
| DS3 | 12 — cache | clé de case `open = true`, écrite seulement sur une case ombrée (`SetTableLook` `open`) ; Ombrer et Désombrer (`SetTableShade`) retirent `open` dans la même transaction ; un toucher à la Sélection bascule ouvert / fermé (F10 écrit `open` au lieu d'effacer `shade`) ; Alt+O en outil Tableau bascule la plage. Une case cachée, **ouverte ou fermée**, refuse tout objet (D35 étendu : `cell-drop` et `PlaceInCell` refusent déjà une case ombrée ; un tracé y reste libre), donc refermer ne cache jamais un objet logé. Dessin ouvert : fond, image de fond et texte visibles, liseré hachuré de 4 unités au bord intérieur (H19). Pot sur un cache ouvert : mot du texte, comme une case normale. Choix tranché seul | D19, D35, H9, H19 | aucun cas où un objet logé serait caché ou révélé par erreur ; un ancien lecteur montre la case fermée (H9, accepté) |
| DS4 | 9 — bordures | valeur D16 gardée : `border = [couleur, épaisseur, style]`, épaisseur ]0, 32], style `solid`, `dashed`, `dotted`, `none` ; `null` retire le réglage (trait d'aujourd'hui). Dessin : bord commun = réglage de la case du bas ou de droite, sinon celle du haut ou de gauche ; zone : réglage de son ancre ; tirets par `dashOf` (`render/sketch.ts:18`), embout rond pour les pointillés. Tableau sans aucune bordure réglée : **le chemin de dessin d'aujourd'hui, inchangé à l'appel près**. Gestes : panneau (couleur parmi les pastilles du style, épaisseur Fin 2 / Moyen 4 / Épais 8 de `WIDTHS`, style dont « Aucune », « Par défaut ») ; Alt+B pose `[couleur du style courant, 4, solid]`, Alt+Maj+B pose `none` en gardant couleur et épaisseur. Choix tranché seul | D16 ; S9 ; `tool-options.ts:78` (`WIDTHS`) | réutilise les choix du panneau des formes ; aucun risque sur les tableaux existants |
| DS5 | 14 — tableau de tri | `accept` posé sur les colonnes de la plage (`SetTableLook` `accept`, liste vide = retiré, 64 libellés au plus, chacun non vide et ≤ 200 caractères). Règle dans la page seulement (`cell-drop.ts`) : une colonne qui a `accept` n'accepte qu'**un seul texte** dont le contenu, sans blancs de bord et sans casse (`fr`), est dans la liste ; sa case d'en-tête (ligne 0 d'un tableau à en-tête) refuse tout. Refus au relâché : aucune commande, l'aperçu est annulé, l'objet reste à sa place, aucune étape (`drop` rend `"refused"`, la Sélection n'écrit rien) ; Alt+Entrée refusé de même ; aucun cadre de case visée sur une case qui refuserait. La CLI pose `PlaceInCell` sans contrôle d'étiquette (outil d'auteur). Champ « Accepte » du panneau : libellés séparés par virgule, point-virgule ou retour, doublons retirés. Choix tranché seul | D21, H11, S14 | la règle est un geste de l'élève, pas une contrainte du fichier ; aucun Rust |
| DS6 | 8 — alignement | **un seul calcul** : `cellTextFrame(t, cell, textHeight)` (`table-geom.ts`) donne le cadre du texte (boîte intérieure de la zone, décalée de `va` d'après la hauteur des lignes) et `ha` ; le décalage par ligne est `lineShift(line, boxWidth, align)` (`text-layout.ts`), lu par `paintText` et par `offsetAt` (paramètre `align`, défaut `left`). Lecteurs : dessin des cases (`paintCellTexts`, `canvas2d.ts`), pot (`fill-target.ts`), saisie (`openActive` : boîte au cadre, `align` passé à la zone DOM, `text-align`). Le texte libre (outil Texte) garde son comportement d'aujourd'hui (le pot n'y passe pas `align`). Un objet logé n'est pas déplacé (D8). Gestes : panneau (2 rangées de 3) ; **Alt+Maj+C** fait tourner l'alignement horizontal (gauche → centre → droite → gauche), **Alt+Maj+M** le vertical (haut → milieu → bas → haut). Choix tranché seul | D15 ; `keys.test.ts:377` (Alt+Maj+H et Alt+Maj+R sont à OG23) ; choix 2 du plan du lot B abandonné | H12 donnait Alt+Maj+H et Alt+Maj+R, déjà pris par Aligner et Tourner (OG23) ; deux touches qui tournent gardent S8 (« Alt+Maj+C puis Alt+Maj+M ») |
| DS7 | 7 — ajuster | double appui (≤ 300 ms et ≤ 8 px écran entre les deux appuis) sur une poignée de taille ou une bordure (± 6 px, intérieure comprise : une saisie ouverte par le premier appui est validée sans écriture) : colonne = largeur naturelle bornée à 960 (`naturalWidth`, lignes de texte sans retour des ancres d'une seule colonne + 2 marges, mesurées sur les segments affichés `shownSpans`, gras d'en-tête compris), **jamais sous la taille exigée par les objets logés** : `max(objets, min(960, naturelle))` (C2, 2026-11-28 : un objet logé ne déborde jamais, comme au glisser `minSize`) ; ligne = hauteur exigée ; les autres lignes qui exigent plus regrandissent ; **une** `SetTableLineSizes`. Alt+A : la colonne et la ligne de la case active (jamais le coin de la plage), une commande. Bouton « Ajuster au contenu » dans la section Objets du panneau. Choix tranché seul | D14, H15, H16 ; TB3 corrigé | TB3 ne voyait pas qu'un appui sur une bordure intérieure ouvre la saisie (F14) et que le second appui n'était alors qu'une validation |
| DS8 | 11 — déplacer | deux poignées de déplacement de 44 px, **hors du tableau** : à gauche de la ligne (ou du bloc) active, au-dessus de la colonne active (point Lucide `grip-vertical` / `grip-horizontal` dessiné dans un disque de 24 px) ; glisser au pointeur du moteur, la case d'arrivée est cadrée (cadre de case visée) ; relâché : `movedOrder` puis une `ReorderTableLines`. Bloc déplacé = la plage, sinon la zone, le long de l'axe. Refus si une zone serait coupée (même règle que le cœur, `keepsMerges`) : aucune commande, message « Une cellule fusionnée empêche ce déplacement. ». Clavier : Ctrl+Maj+↑ / ↓ (ligne), Ctrl+Maj+← / → (colonne), d'un rang, pris par l'outil Tableau avec une case active **avant** l'ordre des objets (`orderKey`). Choix tranché seul | D18, HB5 ; D-DS3 (44 px) | les poignées dehors ne recouvrent ni la case ni les poignées de taille |
| DS9 | 13 — trier | ordre calculé par la page (`sortedRows`) : `Intl.Collator("fr", { numeric: true, sensitivity: "base" })`, cases vides en dernier dans les deux sens, tri stable ; colonne de la case active, texte de l'ancre si la case est couverte ; ligne d'en-tête gardée en tête ; refus si une zone couvre plusieurs lignes, message « Le tri ne passe pas sur une cellule fusionnée sur plusieurs lignes. » ; ordre inchangé : aucune commande ; puis une `ReorderTableLines` (les objets logés suivent, D5). Gestes : Alt+T (croissant), Alt+Maj+T (décroissant), section Lignes du panneau (deux boutons), menu de case « Trier ». Choix tranché seul | D20, H10, S13 | aucun Rust ; la comparaison numérique vit déjà dans `Intl` |
| DS9 (complément C4) | 13 — trier | le collateur seul range mal les nombres écrits à la française (`2,5 < 2,05 < 2,10`, `-3` avant `-5`, `1 000 < 12 500 < 999`). Quand toutes les cases non vides du corps de la colonne (en-tête et vides exclus) sont des nombres français, `sortedRows` compare leurs valeurs (`frenchNumber`) : signe moins ou U+2212, chiffres d'un bloc ou groupés par trois (espace, U+00A0 ou U+202F), virgule décimale ; une seule case d'une autre forme (texte, point décimal, signe plus) rend toute la colonne au collateur. Vides en dernier, stabilité et en-tête inchangés | relecture du lot C (C4, constat 1) | aucun Rust ; tests `table-geom.test.ts` « C4 DS9 » |
| DS10 | panneau | sections de l'accordéon pour l'outil Tableau, montrées avec une case active : `tableObjects` « Objets » (Agrandir / Rétrécir, Ajuster au contenu), `tableAlign` « Alignement » (ouverte par défaut), `tableBorder` « Bordures » (ouverte par défaut), `tableRows` « Lignes » (En-tête ; Trier au lot C), `tableAccept` « Tableau de tri » (lot C). Corps dans `ui/TableOptions.tsx` (`TableSection`), hôte réduit à `{ act(a: TableAction), look(l: CellLook) }` sur `Engine.tableAction` et `Engine.tableLook` (neuve). `showsPanel` accepte `table`. Le choix 1 du plan du lot B (menu de case au lieu du panneau) est abandonné. Un essai existant que l'îlot recouvrirait le replie d'une ligne (`[data-options-toggle]`), patron du lot A. Choix tranché seul | D26, DA5 ; `OptionsPanel.tsx:192` ; brief OG32 | l'accordéon existe ; l'hôte de DA5 (cinq méthodes) se ramène aux deux entrées que le moteur a déjà ou presque |
| DS11 | raccourcis | outil Tableau, case active, saisie fermée : Alt+A ajuster ; Alt+Maj+C / Alt+Maj+M alignements ; Alt+B / Alt+Maj+B bordures ; Ctrl+Maj+flèches déplacer ; Alt+O cache ; Alt+T / Alt+Maj+T trier ; existants : Alt+E, Alt+flèches, Alt+F, Alt+I ; Sélection : Alt+Entrée (soumis à DS5). Le champ « Accepte » n'a pas de raccourci propre (champ texte, atteint par Tab). Toutes lues par `code`, ajoutées à `SHORTCUTS` avec leur ligne `EXPECT`, et au test « touches disjointes » d'OG23. Choix tranché seul | H12 ; `keys.test.ts:377` ; `shortcuts.test.ts` | aucune ne recoupe Aligner, Tourner, Répartir, l'objet relié ni le pas des flèches |
| DS12 | mineurs PR 74 | bouton « En-tête » enfoncé (`ItemState.pressed` = en-tête posé, `aria-pressed` passé par `TableActionRow`) ; une zone ancrée en ligne 0 prend le fond d'en-tête sur toute sa hauteur ; `scaleOf` exporté de `table-geom.ts` et lu par l'outil Tableau ; tests : une étape par geste d'en-tête, libellé « Retirer l'en-tête », D35 sur une plage, Alt+E et Alt+flèches sans effet hors de l'outil Tableau ; titre « neuf actions » → « dix actions ». Choix tranché seul | relecture de la PR 74 (mineurs reportés, état) | défauts relevés à la relecture, aucun ne change le fichier |
| DS13 | CLI (D15 du profil) | `SetTableLook` et `ReorderTableLines` dans `COMMAND_TYPES` (43 → 45), `ops.test.ts`, passages `cli-essai.mjs` T-S8, T-S9, T-S12, T-S14 (SetTableLook) et T-S11 (ReorderTableLines) ; la ligne `.roomboard` de `FORMAT_LOTS` gagne la note des clés de tableau (aucun format neuf). Choix tranché seul | D25 ; profil § CLI | chaque point est pilotable sans moteur |
| DS14 | oracles | `#stage` gagne `data-table-align` (`<ha>,<va>`), `data-table-border` (`<couleur>,<épaisseur>,<style>` ou vide), `data-table-column` (textes de la colonne active, séparés par une barre verticale), `data-table-opens` (caches ouverts de la page, compté dans la boucle `tableCounts` existante). Essai neuf `scripts/essais/personnalisation-3-suite-navigateur.mjs` (page propre, tableaux à droite de l'îlot d'options), joué par `verifier.sh --e2e`. Choix tranché seul | D28 (aucune boucle neuve par image) ; essai du lot A | l'essai du lot A est un seul long scénario dont l'état s'accumule |
| DS15 | découpage | un plan, 14 tâches : lot B = T1 à T10 (une PR, fusionnable seule), lot C = T11 à T14 (une PR). Les clés `open` et `accept` du cœur arrivent au lot B avec `SetTableLook` (une seule mesure de taille), leurs gestes au lot C. Choix tranché seul | brief OG32 (≤ 20 tâches, lot B vert avant C) | une commande Rust n'est pas coupée en deux |
| DS16 | empreinte S6 | non touchée attendue ; la tâche qui touche `fill-target.ts` rejoue `zone-s6-banc.test.ts` en témoin et compare la ligne `S6 empreinte :` avant et après ; si elle change, nouveau hash relevé et documenté dans `docs/essais/c8-porte-s6.md` comme la PR 53, sans toucher un seuil. Choix tranché seul | D30 ; brief | le pot sur zone n'appelle ni `tableAt` ni le code d'alignement |

### Scénarios d'acceptation (suite, complétés)

Joués par `scripts/essais/personnalisation-3-suite-navigateur.mjs` (lectures `#stage[data-…]` d'abord, captures 2x
avec `--captures` dans `docs/design/captures/personnalisation-3-tableau/`), sinon par le test unitaire nommé.

- **S7 (7)** Tableau 3 × 3 (720 × 192), « Photosynthèse » en (0, 0). Double appui à la souris sur la poignée droite de la
  case : le tableau fait 720 − 240 + (largeur du mot + 16), entre 496 et 720 ; Ctrl+Z : 720 en une étape ; Alt+A : même
  largeur qu'au double appui. Deux appuis à 400 ms, ou à 20 px : rien (test `table.test.ts` « S7 »). Captures
  `ajuste-avant.png`, `ajuste-apres.png`. Écart de l'essai (C1) : `personnalisation-3-suite-navigateur.mjs` écrit « Eau »
  au lieu de « Photosynthèse » : à la taille 36 du tableau, « Photosynthèse » + 16 dépasse 240, le tableau passerait
  au-delà de 720 et sortirait de la plage 496-720 ; l'essai compare à 720 − 240 + (largeur du mot mesurée + 16), à 1 px.
- **S8 (8)** Plage (0, 0)-(0, 1) (« Lundi », « Mardi ») : panneau « Centré » puis « Au milieu » : `data-table-align` =
  `center,middle`, deux étapes ; Ctrl+Z deux fois : `left,top` ; Alt+Maj+C puis Alt+Maj+M : `center,middle`. Le pot sur
  le mot centré colore ce mot (`fill-target.test.ts` « D15 ») ; le PDF prend le même peintre (`paintCellTexts`).
  Captures `alignement-avant.png`, `alignement-apres.png`.
- **S9 (9)** Plage 2 × 2 (0, 0)-(1, 1) d'un 3 × 3 : panneau, 2ᵉ pastille, « Épais », « Tirets » : `data-table-border` =
  `<couleur>,8,dashed` ; les douze segments qui bordent la plage (huit extérieurs, quatre intérieurs) sont à cette couleur
  en tirets, les autres au trait du tableau (`table-paint.test.ts` « S9 ») ; Alt+Maj+B sur (1, 1) : ses bords qui ne
  touchent pas une case réglée du bas ou de droite disparaissent (`…,none`) ; enregistrer et relire : identique
  (`look_reload_keeps_bytes`, `cli-essai` T-S9) ; la couleur atteint le PDF vectoriel (`pdf-overlay-vector.test.ts`
  « S9 »). Captures `bordures-avant.png`, `bordures-apres.png`.
- **S10-mineurs** Bouton « En-tête » : `aria-pressed="false"`, puis `true` après l'appui, `false` après Ctrl+Z ; le menu
  de case d'un tableau à en-tête propose « Retirer l'en-tête » ; une zone (0, 0)-(1, 0) d'un tableau à en-tête est grise
  sur ses deux lignes ; Ombrer une plage dont une case non active porte un objet : refusé, message ; Alt+E et Alt+→ avec
  l'outil Stylo : aucune action.
- **S11 (11)** 3 × 3, « a », « b », « c » dans la colonne 0 : poignée de déplacement de la ligne 2 tirée au doigt sur la
  ligne 0 : `data-table-column` = `c|a|b`, une étape ; Ctrl+Z : `a|b|c` ; Ctrl+Maj+↑ sur la ligne 2 : `a|c|b` ; un objet
  logé suit sa ligne (`reorder_moves_linked_objects`) ; zone (0, 1)-(1, 1) puis ligne 2 tirée sur la ligne 1 : refus,
  message « Une cellule fusionnée empêche ce déplacement. », ordre inchangé. Captures `ligne-avant.png`, `ligne-apres.png`.
- **S12 (12)** 2 × 2, « secret » en (0, 0), Ombrer ; Sélection, toucher la case : `data-table-opens` = 1, le texte est
  visible avec un liseré hachuré ; toucher encore : 0 ; outil Tableau, Alt+O : 1 ; Désombrer : 0 et case normale ; un
  objet glissé sur le cache ouvert n'y loge pas. Captures `cache-ferme.png`, `cache-ouvert.png`.
- **S13 (13)** 2 × 4 à en-tête, colonne 0 : « Nombre », 10, 9, 100 ; Alt+T : `data-table-column` = `Nombre|9|10|100` ;
  Ctrl+Z : `Nombre|10|9|100` ; « Trier décroissant » du panneau : `Nombre|100|10|9` ; un tableau dont une zone couvre deux
  lignes refuse avec le message. Captures `tri-avant.png`, `tri-apres.png`.
- **S14 (14)** 2 × 3 à en-tête « Mammifères », colonne 0 acceptant « chat, chien » (panneau, champ « Accepte ») : le texte
  « chat » glissé au doigt sur (1, 0) y loge (`data-table-linked` = 1) ; « truite » glissé sur (2, 0) revient à sa place,
  `data-version` inchangé (aucune étape) ; « Chat » (casse) loge aussi (`cell-drop.test.ts` « S14 »). Captures
  `tableau-tri-avant.png`, `tableau-tri-apres.png`.
- **S16 (CLI, suite)** `cli-essai.mjs` : T-S8 (`ha` relu sur deux cases), T-S9 (`border` relu, rouvert), T-S12 (`open`
  sur une case ombrée, retiré par `SetTableShade` null), T-S14 (`accept` relu sur la colonne), T-S11 (lignes inversées,
  `undo` d'une étape).
- **S17 (U3, suite)** `look_reload_keeps_bytes` (les cinq clés, enregistrer, relire, réenregistrer : mêmes octets),
  `old_reader_ignores_look_keys` (document relu sans les cinq clés : mêmes éléments, mêmes cases, mêmes tailles),
  `reorder_reload_keeps_bytes`.

### Hypothèses à revoir (suite)

- HS1 (niveau 1) Une case cachée ouverte refuse aussi les objets (DS3) ; autre choix : l'accepter et refuser de la refermer.
- HS7 (niveau 1, à côté de H9, **hypothèse acceptée**, choix tranché seul) Une version d'avant ne connaît pas `open` : si
  elle désombre puis réombre une case, la clé `open` reste écrite, et de retour dans la version neuve le cache réapparaît
  ouvert. Raison : cas rare (aller-retour entre deux versions sur la même case), l'enseignant le referme d'un toucher,
  aucune donnée n'est perdue.
- HS8 (niveau 2, choix tranché seul) Alt tenue au relâché ne contourne pas la règle d'étiquettes (DS5) : une étiquette
  refusée revient à sa place ; une étiquette admise se déplace librement. Raison : la règle ne se contourne pas par un
  modificateur.
- HS2 (niveau 1) Alt+Maj+C et Alt+Maj+M tournent au lieu de six touches fixes (DS6).
- HS3 (niveau 1) La règle d'étiquettes ne vit que dans la page ; la CLI peut loger n'importe quoi (DS5).
- HS4 (niveau 2) Alt+B pose une bordure d'épaisseur 4 à la couleur du style (DS4).
- HS5 (niveau 2) Poignées de déplacement hors du tableau ; un tableau collé au bord gauche de la page a sa poignée de
  ligne hors de la page, prise quand même (DS8).
- HS6 (niveau 2) Le panneau s'ouvre avec l'outil Tableau dès qu'une case est active ; il peut recouvrir la colonne 0 d'un
  tableau posé à gauche (même recouvrement que pour le stylo, déjà signalé).
- HS9 (niveau 2, **hypothèse acceptée**) Le texte de la saisie d'une case d'en-tête s'affiche sans gras (affichage de la
  saisie seulement ; le dessin final est en gras) : la saisie garde les segments enregistrés. La hauteur de ligne écrite à
  la validation, elle, est mesurée en gras (`headerSpans`). Même cause non corrigée : `header-toggle` n'agrandit pas la
  ligne 0 quand le gras demande plus de hauteur ; il faudrait une seule commande (`SetTableOptions` portant des
  hauteurs de lignes : contrat Rust, wasm et fake-core), sinon deux étapes d'annulation ; reporté.

### Carte d'impact (suite)

Touchés (V = vérifié dans le code) : `crates/roomboard-core/src/{table.rs, table_look.rs (nouveau), table_links.rs,
commands.rs, lib.rs}`, `crates/roomboard-wasm/src/lib.rs` ; `apps/web/src/core/{api.ts, wasm-core.ts, fake-core.ts,
wasm-core.contract.test.ts}` ; `apps/web/src/engine/{table-geom.ts, text-layout.ts, fill-target.ts, engine.ts}`,
`engine/tools/{table.ts, select.ts, cell-drop.ts, text.ts}`, `engine/render/{table-paint.ts, canvas2d.ts, overlay.ts}`,
`engine/input/keys.ts` ; `apps/web/src/ui/{TableOptions.tsx (nouveau), OptionsPanel.tsx, tool-options.ts, item-state.ts,
Toolbar.tsx, icons.ts, cell-menu.ts, shortcuts.ts, rb.css}`, `apps/web/src/app/{text-editor.ts, stage-tags.ts,
board-session.ts}`, `apps/web/src/toolbar.test.ts` ; `apps/cli/src/{ops.ts, ops.test.ts, formats.ts, formats.test.ts}`,
`scripts/essais/{cli-essai.mjs, personnalisation-3-suite-navigateur.mjs (nouveau)}`, `scripts/verifier.sh`,
`scripts/tests/verifier-e2e.test.sh`, `THIRD_PARTY_NOTICES.md`, `docs/design/captures/personnalisation-3-tableau/`.

Effets de bord nouveaux, chacun avec son test : le toucher F10 écrit `SetTableLook open` (`select.test.ts` « F10 ») ;
Ombrer et Désombrer retirent `open` (`set_table_shade_clears_open`, contrat « open ») ; le panneau s'ouvre avec l'outil
Tableau (`tool-options.test.ts` « showsPanel(table) », dont le cas `table` du test existant change) ; Ctrl+Maj+↑ / ↓ en
outil Tableau déplace une ligne au lieu de l'ordre des objets (`engine.test.ts` « Ctrl+Maj+↑ ») ; `offsetAt` sans `align`
garde son résultat (`text-layout.test.ts`) ; un tableau sans bordure réglée se dessine par les mêmes appels
(`table-paint.test.ts` existants inchangés) ; `paintText` passe par `lineShift` (tests du texte libre inchangés).

Tests à garder verts sans réécriture de fond : `c10a-tableau-navigateur.mjs`, `c10b-tableau-navigateur.mjs`,
`c13-tableaux-navigateur.mjs`, `personnalisation-3-tableau-navigateur.mjs` (au plus une ligne qui replie l'îlot
d'options, DS10), essais à `data-item`, `table.rs` tests C10a et C10b, `table.test.ts`, `table-geom.test.ts`,
`paste.test.ts`, `zone-s6-banc.test.ts` (témoin, DS16).

Modules à réutiliser ou à étendre (suite) :

| besoin | module existant | interface | décision |
|---|---|---|---|
| clé posée sur les ancres d'une plage | `table.rs` `set_on_targets`, `targets`, `cells_map`, `insert_cell`, `RawTable::rect`, `RawTable::key` | `targets(&rect, &merges) -> Vec<(usize, usize)>` ; `insert_cell(txn, &cells, key, "", vec![])` | réutiliser (`pub(crate)`) |
| parité du faux cœur | `fake-core.ts` `setOnTargets`, `rectOf`, `targets`, `writeTable` | `writeTable(found, id, next)` | étendre |
| recopie d'une entrée de ligne | `yrs::types::AsPrelim` (déjà dans `table_links.rs`) | `map.as_prelim(&txn)` | réutiliser |
| suivi des objets liés | `table_links.rs` `offsets`, `follow_in`, `table_done_with` | `follow_in(&mut txn, &page, &e, id, &before, &HashSet::new())` | réutiliser |
| décalage d'alignement | `canvas2d.ts:381` `paintText` (calcul en ligne) | `lineShift(line, boxWidth, align)` extrait dans `text-layout.ts` | étendre |
| cadre du texte d'une case | `table-geom.ts` `cellInnerBox` | `cellTextFrame(t, cell, textHeight)` | étendre |
| tirets | `render/sketch.ts:18` `dashOf` | `dashOf(kind, w)` | réutiliser |
| tailles ligne par ligne | `SetTableLineSizes` (lot A), `requiredSizes`, `linkedBoxes` | `ctx.run({ type: "SetTableLineSizes", id, cols, rows })` | réutiliser |
| choix à segments du panneau | `ui/RadioChoices.tsx`, `WIDTHS`, `strokePicks` | `RadioChoices({ name, label, look: "segment", options, valueAttr, value, choose, keepFocus })` | réutiliser |
| poignées de l'outil | `overlay.ts` `OverlayGrip`, `canvas2d.ts:799` | `kind` gagne `row-move`, `col-move` | étendre |
| refus au relâché | `select.ts:324-327` (toucher d'ombrage : retour sans `Transform`) | `drop(...) === "refused"` → retour | étendre |
| options du tableau | aucun (sections de l'accordéon) | `ui/TableOptions.tsx` `TableSection` | nouveau module |
