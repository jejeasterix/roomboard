# Cadrage — personnalisation-2-outils (OG12)

Cadrage autonome du 2026-11-27 : Jérôme est injoignable pendant tout le tour, chaque question est tranchée ici, avec sa
raison. Référence lue dans le code d'Excalidraw (MIT), clone `~/.cache/tmp/og12-excalidraw` à `f4e5226` (chemins relatifs à
`packages/`) ; base RoomBoard `origin/main @ cddbde49`.

## 1. Demande et gabarit

**Demande** : chaque outil commun avec Excalidraw se comporte comme dans Excalidraw, au doigt d'abord puis à la souris et
au clavier, en commençant par la flèche et la ligne (courbure, types, extrémités, édition des points, liaison aux objets,
connecteurs façon carte mentale, objet relié créé en un geste), avec une fiche de vérification par outil.

**Gabarit** : `lots`. Deux lots. Le **lot 1** (flèche et ligne) se fusionne seul et vert dans le temps donné. Le **lot 2**
(autres outils, édition des points des formes, fiche complète) reste au périmètre. Il ne tient pas dans les 5 h 30 :
il sera écrit au bloc final comme reste à faire (§ 7).

Budget de questions : 38 sur 40 (tableau du § 2).

## 2. Décisions

Légende de la colonne « source » : `XL:` = code d'Excalidraw (`packages/…`), `brief` = brief OG12 (citations de Jérôme),
`H` = hypothèse du § 4, `DA` = décision d'architecture du § 5.

### 2.1 Modèle de données du cœur (les autres décisions en dépendent)

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| 1 | Où vivent les points d'une flèche ou d'une ligne | L'élément reste `kind: "shape"`, `shape: "line"` ou `"arrow"`. Les **extrémités restent (0, 0) et (w, h)** dans le repère de `transform`, comme aujourd'hui. Un champ facultatif `points` porte **les seuls points intérieurs**, en coordonnées locales, en `Any::Array` de nombres à plat `[x1, y1, x2, y2, …]` (jamais `Any::Map`, D25). Absent : segment droit du socle. Un lecteur plus ancien voit le segment de la première à la dernière extrémité, pas un objet cassé. Plafond : 512 points intérieurs (H8). | `shape.rs:1-3` (segment (0,0)-(w,h)) ; U3 `usage-cadrage.md:56` ; `element.rs:343-345` (D25) ; XL: `element/src/types.ts` (`points` relatifs à x, y) | oui jusqu'à la release (U3) ; DA-1 |
| 2 | Type de tracé | Trois types, aux noms et valeurs d'Excalidraw : **droite** (neutre, rien d'écrit), **courbe** = `roundness: "round"` (champ d'aspect existant, admis désormais sur ligne et flèche), **coudée** = nouveau champ `elbowed: true` (flèche seulement). `elbowed` l'emporte : la lecture rend `roundness` neutre sur une flèche coudée. | XL: `excalidraw/actions/actionProperties.tsx` (`actionChangeArrowType`), `common/src/constants.ts:596` (`ARROW_TYPE` sharp, round, elbow) ; `element.rs:367-399` (`Look.roundness`) ; `style.rs:140-143` (roundness réservé au rectangle aujourd'hui) | oui (U3) |
| 3 | Forme de la courbe | Catmull-Rom cubique, tension 0,5, extrémités doublées, comme Excalidraw. Le cœur l'aplatit en 16 pas par segment pour la collision et les bornes. Le rendu trace les mêmes Bézier, et le miroir TS fait le même aplatissement. | XL: `math/src/curve.ts:361` (`curveCatmullRomCubicApproxPoints`, `tension = 0.5`) ; `element/src/shape.ts:994` (`generator.curve`) | oui |
| 4 | Liaison d'une extrémité | Champs facultatifs de la flèche ou de la ligne : `startBound` / `endBound` (id de l'objet) et `startFixed` / `endFixed` (`Any::Array [fx, fy]`, ratio de la boîte locale de l'objet, borné à ±10). C'est le `fixedPoint` d'Excalidraw. Pas de `mode` écrit : « sur le contour » (avec écart) ou « dedans » se déduit du point. **Aucun `boundElements` côté objet** : on retrouve les flèches liées en parcourant la page. | XL: `element/src/types.ts:320-328` (`FixedPointBinding`), `binding.ts:normalizeFixedPoint` ; DA-2 | oui (U3) ; DA-2 |
| 5 | Écart entre pointe et contour | Excalidraw : `5 + épaisseur de l'objet / 2`, appliqué quand l'extrémité est sur le contour (orbite). Copié. | XL: `element/src/binding.ts:127-133` (`getBindingGap`, `BASE_BINDING_GAP`) | oui |
| 6 | Objets accrochables | Rectangle, ellipse, texte, image, tableau, média, modèle 3D (tout élément à boîte). Pas les traits du stylo, ni les lignes et les flèches, ni le remplissage de zone (`fill`). Losange au lot 2 (n° 33). | XL: `element/src/typeChecks.ts:isBindableElement` (pas de freedraw ni de linéaire) ; `element.rs:36` (kinds) | oui |
| 7 | Suivi quand l'objet bouge | Dans **la même transaction** que la commande qui change la boîte de l'objet, le cœur recalcule les extrémités liées. Au lot 1 : `Transform` (déplacer, redimensionner, toute matrice), `SetText` et `FormatText` (boîte du texte). Les points intérieurs restent en place, sauf si les deux bouts sont liés à des objets qui bougent ensemble : la flèche suit alors en bloc. Une coudée est reroutée. Une étape d'annulation. | XL: `binding.ts:updateBoundElements` → `updateBoundArrow` → `LinearElementEditor.movePoints`, `moveMidPointsWithElement` ; `history.rs:1-4` (une transaction locale = une étape) ; `commands.rs:1043` (`cmd_transform`) | oui |
| 8 | Flèche déplacée seule | Déplacer une flèche liée sans ses objets **rompt** ses liaisons (même transaction que le `Transform`), comme Excalidraw. Les déplacer avec ses deux objets garde tout. | XL: `element/src/dragElements.ts:148-175` (« Moving the bound arrow should unbind it ») | oui |
| 9 | Objet lié supprimé | Rien n'est écrit sur la flèche. Une liaison vers un id absent **se lit libre** (lecture tolérante, comme U3 ailleurs) : la flèche garde sa dernière forme. Annuler la suppression rétablit la liaison sans écriture. Écart avec Excalidraw (`fixBindingsAfterDeletion` réécrit la flèche), voulu : aucun champ à réparer, annulation exacte. | XL: `binding.ts:fixBindingsAfterDeletion` ; `commands.rs:1727` (`cmd_delete`) ; DA-2 | oui |
| 10 | Duplication, copier-coller, bibliothèque | La recopie (`copy.rs`) renumérote `startBound` / `endBound` vers les copies quand l'objet lié est copié aussi, et retire la liaison sinon. C'est la règle d'Excalidraw. Même table d'ids que les groupes. | XL: `binding.ts:fixDuplicatedBindingsAfterDuplication` ; `copy.rs:1-5,26` (`renumber`), `engine.ts:984` (`duplicateSelection` = extrait + `insertFragment`) | oui |
| 11 | Routage d'une flèche coudée | Dans le cœur (Rust), portage réduit de la **route simple** d'Excalidraw : sortie perpendiculaire au côté de liaison (ou vers l'autre bout si libre), marge 40, au plus 5 segments, sans A* ni évitement d'obstacles. Les points calculés sont écrits dans `points` : le rendu ne route jamais. Segments fixes déplaçables au lot 2. Le fichier adapté garde la mention MIT. | XL: `element/src/elbowArrow.ts:1433` (`getSimpleRoute`), `:1545`, `updateElbowArrowPoints`, `BASE_PADDING` 40 ; brief (mention MIT) ; DA-3 | oui |
| 12 | Commandes | (a) `AddShape` gagne trois champs facultatifs : `points` (points intérieurs, monde), `start` et `end` (`{ id, fx, fy }` ou absent). (b) Nouvelle commande **`SetLinePoints { id, points, start, end }`** : tous les points en monde (≥ 2), liaisons ; une étape ; refus `BadPoints` (moins de 2, non fini, plus de 514) ou `BadShape` (cible ni ligne ni flèche, objet lié inconnu ou non accrochable). (c) `SetStyle` : `roundness` admis sur ligne et flèche, patch `elbowed` (flèche ; passer à coudée reroute dans la transaction, quitter coudée garde les deux extrémités, comme Excalidraw). (d) Nouvelle commande **`AddLinked { id, dir }`** (n° 27). | `commands.rs:79-94,253` ; XL: `actionChangeArrowType` (elbow : points réduits au début et à la fin) ; DA-4 | oui (additif, `contract.ts:1-4`) |
| 13 | Pointes | La liste s'étend aux noms d'Excalidraw : `bar`, `circle`, `circle_outline` au lot 1 ; `diamond`, `diamond_outline` et `cardinality_*` au lot 2. Toujours flèche seulement (décision 17 d'OG11). | XL: `element/src/types.ts` (`Arrowhead`), `arrowheads.ts:normalizeArrowhead` ; `element.rs:402` ; `personnalisation-2-cadrage.md:47` | oui |
| 14 | Fichier et version | `schema` 1 et `formatVersion` 1 inchangés ; tous les champs neufs sont facultatifs, et un neutre n'est jamais écrit (DA-5 d'OG11). Un fichier de `main` se relit à l'identique, octet pour octet. | U3 ; `element.rs:362,477` (DA-5 d'OG11) | oui jusqu'à la release |
| 15 | Export `.iwb` / `.ubz` | Une ligne ou une flèche à plusieurs points s'écrit en **polyligne** des points aplatis quand le flux le permet. Sinon, elle s'écrit en segment de la corde, avec l'avis « ligne à plusieurs points écrite droite », sur le patron de l'avis existant des flèches `.ubz`. PDF, miniatures et vignettes passent par le rendu Canvas 2D : rien à faire de plus. | `board-io.ts:266,290-292` ; `board/read.rs:1216` (`polyline` déjà lu) ; `personnalisation-2-cadrage.md:57` (rendu Canvas 2D seul) | oui ; H6 |

### 2.2 Interaction : flèche et ligne (lot 1)

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| 16 | Création | Glisser crée la flèche à deux points, comme aujourd'hui. Excalidraw finalise un glisser de plus de 20 px écran ; nous gardons notre seuil de 4 px (`MIN_SHAPE_PX`, essais existants). Le mode multi-points au clic va au lot 2 : au doigt, Excalidraw ne l'a pas non plus (un tap y pose une flèche fixe). | XL: `App.tsx` ~l.9780-9805 (`MINIMUM_ARROW_SIZE`, `FIXED_DELTA_X`, `multiElement`), `common/src/constants.ts:35` ; `shape.ts:16` | oui |
| 17 | Liaison à la création | Départ ou arrivée à moins de 15 px écran du contour d'un objet accrochable (30 px au doigt, borne haute d'Excalidraw) : l'extrémité se lie. Dedans, loin du contour : liée « dedans », sans écart. Près du contour : projetée sur le contour, avec écart. Pendant le glisser, l'objet visé est surligné (contour à l'accent de la charte). Le plus proche gagne, et un objet plus petit qui contient le point passe devant. | XL: `binding.ts:maxBindingDistance_simple` (15 à 30 px), `getBindingStrategyForDraggingBindingElementEndpoints_simple` (inside / orbit), `collision.ts:getBindingCandidates`, `renderer/interactiveScene.ts:renderBindingHighlightForBindableElement_simple` | oui |
| 18 | Points d'accroche visibles | Au survol (souris, stylet) et sous le doigt pendant un glisser de flèche, l'objet visé montre **4 points d'accroche** (milieux des côtés). Une extrémité lâchée à moins de 16 px écran (24 au doigt) d'un de ces points s'y cale. Actif par défaut, comme « S'accrocher aux points intermédiaires » d'Excalidraw. | XL: `actions/actionToggleMidpointSnapping.tsx` (« Snap to midpoints », actif par défaut) ; brief (« points d'accroche visibles au survol et au toucher ») | oui |
| 19 | Désactiver la liaison | Souris et clavier : **Ctrl tenu** (Cmd sous macOS) pendant le glisser inverse la liaison, comme Excalidraw. Au doigt : réglage persistant **« Liaison des flèches »** (libellé FR d'Excalidraw), interrupteur de la section Pointes du panneau, gardé sur l'appareil avec le style courant. Pour une flèche déjà liée, tirer l'extrémité hors de portée la détache. | XL: `App.tsx:onKeyDown` ~l.5397 (`isBindingEnabled` inversé), `actions/actionToggleArrowBinding.tsx`, `locales/fr-FR.json:204` ; DA-6 | oui |
| 20 | Nom de l'action « Modifier la flèche » | **« Modifier les points »**, pour la ligne comme pour la flèche (et pour les formes au lot 2). Raison en § 5, DA-7. | XL: `locales/fr-FR.json:162-163` (`lineEditor.edit`, `editArrow`), `helpDialog.editLineArrowPoints` ; brief (nom jugé peu approprié) | oui (libellé) |
| 21 | Entrer dans « Modifier les points » | Bouton « Modifier les points » de la section Actions du panneau (44 px) ; double toucher (300 ms, 35 px) ou double-clic sur une ligne, ou sur une flèche ; **Ctrl+Entrée** (Cmd+Entrée). Écart : Excalidraw demande Ctrl+double-clic pour une flèche, parce que son double-clic y pose une étiquette. Les étiquettes vont au lot 2 : le double toucher simple sert ici, il est plus facile au doigt. Une coudée n'y entre pas (seules ses extrémités se tirent, n° 25). | XL: `actions/actionLinearEditor.tsx` (`toggleLinearEditor`, `predicate` sans coudée), `App.tsx:handleCanvasDoubleClick`, `onKeyDown` ~l.5486, `onTouchStart` (`TAP_TWICE_TIMEOUT` 300, `DOUBLE_TAP_POSITION_THRESHOLD` 35) | oui ; H3 |
| 22 | Dans « Modifier les points » | Une poignée par point (cible de 44 px au doigt) et une poignée de milieu par segment, masquée sous 40 px écran. Toucher un point le sélectionne ; Maj+clic en ajoute un. Tirer un point le déplace ; tirer un milieu insère un point (sur une courbe, la courbe passe par lui). Suppr ou Retour arrière retire les points choisis. Au doigt, le bouton « Retirer le point » du panneau fait de même. S'il reste moins de deux points, la flèche est supprimée. Sortie : Échap, ou toucher hors de l'objet. **Une `SetLinePoints` au relâché, une étape par glisser.** | XL: `linearElementEditor.ts` (`getEditorMidPoints`, `isSegmentTooShort`, `shouldAddMidpoint`, `addMidpoint`, `handlePointerDown`, `deletePoints`), `actions/actionDeleteSelected.tsx`, `actionFinalize.tsx:keyTest` | oui |
| 23 | Contrainte d'angle | Maj tenue (création, point tiré) : pas de 15°, comme aujourd'hui (`ANGLE_STEP_DEG`) et comme Excalidraw. Au doigt : n° 29. Le point tiré se contraint par rapport à son voisin. | XL: `common/src/constants.ts:40` (`SHIFT_LOCKING_ANGLE` = π/12), `sizeHelpers.ts:getLockedLinearCursorAlignSize` ; `shape.ts:17-31` | oui |
| 24 | Type dans le panneau | Flèche : nouvelle section **« Type de flèche »** (libellé FR d'Excalidraw) avec Droite · Courbe · Coudée, placée juste avant Pointes. Ligne : la section existante **« Angles »** (Droits · Arrondis) s'ouvre à la ligne, comme le fait Excalidraw (roundness). Défaut du style courant : **Droite**. Écart : Excalidraw part sur « round » ; nous gardons le tracé d'aujourd'hui, pour qu'aucun essai ne bouge. | XL: `locales/fr-FR.json:71-74` (`arrowtypes`, « Flèche pointue / incurvée / coudée »), `appState.ts` (`currentItemArrowType` = round) ; `tool-options.ts:7-28`, `OptionsPanel.tsx:57-64,362` ; H1 | oui |
| 25 | Flèche coudée : édition | Seules les deux extrémités se tirent, et le reste est reroutée par le cœur. Pas de rotation. Segments fixes (milieux tirés) et leur suppression au double toucher : lot 2. | XL: `elbowArrow.ts` (`isPointHandle` début et fin), `LinearElementEditor.moveFixedSegment`, `deleteFixedSegment` | oui |
| 26 | Libellés courts | Droite / Courbe / Coudée, plutôt que « Flèche pointue / incurvée / coudée » : le libellé de la section dit déjà « flèche », et « pointue » se confond avec la pointe. | XL: `locales/fr-FR.json:72-74` ; charte (libellés courts) | oui (libellé) |

### 2.3 Connecteurs façon carte mentale (lot 1)

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| 27 | Créer un objet relié en un geste | Commande du cœur **`AddLinked { id, dir }`** (`dir` : `up`, `down`, `left`, `right`), sur un rectangle ou une ellipse seul sélectionné. Elle pose dans la même transaction : une copie de l'objet (taille, couleurs, trait, remplissage, angles) à 100 unités dans la direction, centrée, et une **flèche coudée liée aux deux** côtés en regard, avec la pointe de fin du style courant. Si la place est prise par un nœud déjà relié dans cette direction, la copie glisse sur le côté (taille + 100) jusqu'à une place libre. La grappe centrée d'Excalidraw va au lot 2. La copie devient la sélection. | XL: `element/src/flowchart.ts:addNewNodes`, `cloneFlowchartNode`, `createBindingArrow`, `VERTICAL_OFFSET` / `HORIZONTAL_OFFSET` 100, `placeCluster` ; `typeChecks.ts:isFlowchartNodeElement` ; DA-4 | oui |
| 28 | Geste au doigt et au clavier | **Doigt** : quatre poignées « + » de 44 px autour d'un rectangle ou d'une ellipse seul sélectionné, à 24 px hors du cadre ; toucher une poignée lance `AddLinked`. Excalidraw n'a pas de flèches rapides au survol : c'est une adaptation au tactile. **Clavier** : **Ctrl+Alt+↑ ↓ ← →** (Cmd+Alt sous macOS). Excalidraw prend Ctrl+flèche, mais chez nous Ctrl+↑ et Ctrl+↓ rangent déjà les objets (OG14). Une pression crée un nœud tout de suite, sans attendre le relâchement de Ctrl. | XL: `components/App.flowchart.ts:112,186-192` (`resolveKeyboardEventToOperation`, Ctrl/Cmd+flèche), `HintViewer.tsx` ; `keys.ts:78-84` (`orderKey`) ; H2 | oui |

### 2.4 Gestes tactiles à la place des touches tenues

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| 29 | Maj (proportions, depuis l'axe, 15°, carré et cercle) | **Un second doigt posé et tenu pendant un geste déjà commencé** (plus de 150 ms après le premier) vaut Maj tant qu'il reste posé. Le routeur ignore aujourd'hui ce doigt tardif : il gagne ce sens. Il vaut pour Sélection, formes, ligne, flèche et « Modifier les points », jamais pour le stylo ni la gomme. Si un stylet ou une souris tient le geste, un doigt posé vaut aussi Maj (au lieu de déplacer la vue) pendant un geste de Sélection, de forme ou de flèche. Lot 1 : il sert déjà au redimensionnement (proportions) par `ctx.shift`. | `router.ts:85-100` (second doigt tardif ignoré, pincement sous 150 ms) ; `tool.ts:15-18` (`shift`, `alt`) ; DA-6 | oui |
| 30 | Ctrl (sans liaison) | Réglage « Liaison des flèches » (n° 19) ; pas de geste tenu. | n° 19 | oui |
| 31 | Alt (depuis le centre, sans aimant de grille, liaison forcée « dedans ») | Lot 2 : îlot **« Modificateurs »** collant (deux boutons de 44 px, « Proportions » et « Depuis le centre »), montré au doigt pendant Sélection et formes ; la souris garde Alt. Lot 1 : Alt garde son sens actuel (aucun aimant de grille, C9) ; la liaison forcée dedans n'a pas de geste tactile (lâcher l'extrémité au milieu de l'objet suffit, n° 17). | XL: `common/src/keys.ts:shouldResizeFromCenter`, `binding.ts` (Alt force inside) ; `shape.ts:56-58` (Alt = sans aimant) ; H4 | oui |
| 32 | Alt-glisser (dupliquer), clic droit, double-clic | Alt-glisser : **hors périmètre**, porté par OG23 (« Glisser une copie », `personnalisation-2-retours`). Clic droit : appui long de 500 ms, convention existante (décision 0294 du coffre), comme Excalidraw (`TOUCH_CTX_MENU_TIMEOUT`). Double-clic : double toucher (n° 21). | `~/projets/roomboard-wt/personnalisation-2-retours/docs/sessions/personnalisation-2-retours-etat.md:5` ; coffre `02_Decisions/0294` ; XL: `App.tsx` (`TOUCH_CTX_MENU_TIMEOUT` 500) | oui |

### 2.5 Lot 2 et fiche

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| 33 | Losange | Absent aujourd'hui (prémisse du brief démentie). Lot 2 : nouveau `ShapeKind::Diamond` (cœur, miroir `shapes.ts`, outil, icône, export), accrochable. | `shape.rs:5-11` ; `personnalisation-2-cadrage.md:44` (« nous n'avons pas de losange ») ; XL: `Tools.tsx` (D ou 3) | oui |
| 34 | Édition des points des formes | Lot 2 : « Modifier les points » sur un rectangle, un losange ou une ellipse le **convertit en ligne fermée** (`shape: "line"`, `points`, nouveau champ `polygon: true`, remplissage gardé). C'est le `polygon` d'Excalidraw. Une étape, annulable. La section du panneau prend place dans l'accordéon d'OG23. Le modèle du lot 1 la permet sans rien changer (`points` génériques). | XL: `element/src/types.ts` (`ExcalidrawLineElement.polygon`), `typeChecks.ts:isValidPolygon`, `actions/actionLinearEditor.tsx` (`actionTogglePolygon`) ; brief | oui ; H5 |
| 35 | Autres comportements d'Excalidraw (lot 2) | Rotation (poignée, Maj 15°), flèches du clavier (1 px, Maj 5 px), texte dans une forme (double toucher, Entrée), lettres et chiffres des outils (V 1, R 2, D 3, O 4, A 5, L 6, P 7, T 8, 9, E 0, H), A répété qui fait tourner le type de flèche, multi-points au clic, Alt+clic qui ajoute un point au bout, étiquette sur flèche, navigation Alt+flèche entre nœuds, gomme qui marque puis supprime au relâché, texte (Échap valide). Chacun est écrit dans la fiche avec son état. | XL: `resizeElements.ts:rotateSingleElement`, `App.tsx` ~l.5351, ~l.5430, ~l.5490, `Tools.tsx:TOOLS`, `eraser/index.ts`, `wysiwyg/textWysiwyg.tsx`, `App.flowchart.ts` (`FlowChartNavigator`) | oui |
| 36 | Fiche `docs/essais/outils-excalidraw.md` | Écrite **au lot 1** avec toute son ossature : un tableau par outil (sélection, main, rectangle, losange, ellipse, flèche, ligne, crayon, texte, image, gomme, sélection d'objets), avec les colonnes `comportement · source Excalidraw (fichier:fonction) · état (copié / adapté au tactile / écarté : raison / lot 2) · essai`. Flèche et ligne y sont remplies et prouvées. Les autres outils sont listés avec l'état « lot 2 » ou leur état actuel quand il est déjà copié (Maj au redimensionnement, Ctrl+D, Espace, pincement). Ossature : § 6, annexe A. | brief ; § 6 | oui |
| 37 | Jouer Excalidraw dans un Chromium sans tête | **Pas au lot 1** : le code suffit, et chaque comportement retenu ici y est cité. Si un comportement reste ambigu au plan : `agent-browser` (VM) sur `https://excalidraw.com`, sans compte et sans donnée envoyée, environ 2 min, sans rien construire. Un build local (`yarn install` d'environ 1,5 Go, puis serveur Vite) coûterait 15 à 20 min et de la RAM sur une VM partagée : écarté. | skill `agent-browser` ; brief (« ne construis pas Excalidraw toi-même ») | oui |
| 38 | Taille Wasm | Estimation du lot 1 : +15 à +30 Ko pour le module principal (chemins, courbe, liaisons, route simple, `AddLinked`), contre environ 132 Ko de marge (1 440 034 o mesurés à la fin d'OG14, plafond 1 572 864). Mesure à chaque tâche du cœur. Formats : rien. Aucun plafond ne bouge. | `docs/sessions/personnalisation-2-etat.md:31` ; brief | oui |

## 3. Carte d'impact

La ligne « Surfaces d'impact » du profil est absente : les rubriques sont déduites du graphe et de la recherche texte.
Graphe frais : `~/.cache/graphes/roomboard/graphify-out/graph.json` (27 nov., 18:43). V : lu dans le code ; S : supposé.

### 3.1 Cœur (`crates/roomboard-core`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/shape.rs:5-36` `ShapeKind` | non (lot 1) ; oui au lot 2 (losange) | les quatre genres suffisent au lot 1 | V |
| `src/shape.rs:81` `shape_polygon`, `:153` `shape_ring` | oui | segment → polyligne ou courbe aplatie, élargie de la demi-épaisseur ; pointes aux deux bouts orientées par le premier et le dernier segment | V |
| `src/shape.rs:52` `arrow_wings` | non (réutilisé) | ailes de la pointe, appliquées au dernier segment | V |
| nouveau `src/linear.rs` | oui | chemin, courbe, liaisons, route simple (DA-1, DA-3) | — |
| `src/commands.rs:460-475` `ShapeFields`, `read_shape` | oui | `points`, `elbowed`, liaisons lues | V |
| `src/commands.rs:79-90,989` `AddShape`, `cmd_add_shape` | oui | `points`, `start`, `end` | V |
| `src/commands.rs:34` `Command`, `:338` `CommandError` | oui | `SetLinePoints`, `AddLinked` ; erreurs existantes réutilisées | V |
| `src/commands.rs:1043` `cmd_transform` | oui | suivi des liaisons et rupture (n° 7-8), même transaction | V |
| `src/commands.rs` `SetText`, `FormatText` | oui | suivi quand la boîte du texte change | V |
| `src/commands.rs:1727` `cmd_delete`, `Erase` | non | lecture tolérante (n° 9) | V |
| `src/element.rs:367-399` `Look`, `:402` `ARROWHEADS`, `:437` `LOOK_KEYS`, `:478` `look_fields`, `:517` `read_look` | oui | `elbowed`, `roundness` sur segment, nouvelles pointes | V |
| `src/style.rs:140-163` admission par genre, `:181` `cmd_set_style` | oui | roundness sur ligne et flèche, `elbowed`, reroutage | V |
| `src/document.rs:387-395` `ShapeView` | oui | vue : `points`, liaisons (lues libres si la cible manque) | V |
| `src/copy.rs:26` `renumber`, `:181` `extract`, `:246` `insert_fragment` | oui | renumérotation des liaisons (n° 10) | V |
| `src/query.rs:246-252` `element_geom`, `:318` `element_bounds`, `:342` `snap_box` | non (passent par `shape_polygon`) | collision et bornes suivent la polyligne | V |
| `src/fill.rs:206-221` `edge_hit` | oui (signature seule) | appel de `shape_polygon` adapté ; un segment n'a toujours pas de bord pour le pot (`is_segment`, `:216`) | V |
| `src/zone.rs:843` `wall_of` | non (passe par `shape_polygon`) | une flèche courbe devient un mur courbe : voulu | V |
| `src/history.rs` | non | une transaction locale = une étape | V |
| `tests/look.rs`, `tests/pot.rs`, `tests/compat_*.rs`, `tests/scenarios.rs` | non : à garder verts | compatibilité des anciens fichiers, pot sur formes | V |
| nouveau `tests/fleches.rs` | oui | liaisons, suivi, rupture, copie, route, `AddLinked`, une étape | — |

### 3.2 Pont Wasm et faux cœur

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-wasm/src/lib.rs` | oui | nouvelles commandes, vue de forme | V |
| `apps/web/src/core/api.ts:28,73,102,210,368` | oui | `Command` (`SetLinePoints`, `AddLinked`, champs d'`AddShape`), `ShapeView`, `LookPatch.elbowed` | V |
| `apps/web/src/core/wasm-core.ts` | oui | lecture des vues | V |
| `apps/web/src/core/fake-core.ts:986,1507,1731` | oui | miroir des points, liaisons, suivi ; route coudée **exclue du contrat commun** (DA-3) | V |
| `apps/web/src/core/shapes.ts` | oui | miroir de `shape_polygon` et de la courbe | V |
| `apps/web/src/core/look.ts:7` `Arrowhead` | oui | nouvelles pointes, `elbowed` | V |
| `apps/web/src/core/wasm-core.contract.test.ts` | oui | contrat commun des deux fabriques | V |
| `crates/roomboard-formats` (module formats) | non | aucune taille de module formats ne bouge | V |

### 3.3 Rendu

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/engine/render/canvas2d.ts:242` `traceShape`, `:297` `paintShape`, `:668` aperçu | oui | polyligne, courbe (Bézier de Catmull-Rom), coudée, pointes nouvelles | V |
| `apps/web/src/engine/render/sketch.ts:62,151` | oui | tracé roughjs d'une polyligne et d'une courbe | V |
| `apps/web/src/engine/render/overlay.ts` | oui | poignées de points et de milieux, points d'accroche, surlignage, poignées « + » | V |
| `apps/web/src/engine/render/select.ts`, `webgl2.ts` | non | la scène passe par Canvas 2D (`personnalisation-2-cadrage.md:57`) | V |
| `apps/web/src/app/thumbnail.ts`, `pdf-overlay-vector.ts` | non | même rendu Canvas 2D | V |

### 3.4 Outils et entrées

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/engine/tools/shape.ts:20,55` | oui | liaison à la création, accroche, Ctrl qui inverse | V |
| nouveau `apps/web/src/engine/tools/line-edit.ts` | oui | « Modifier les points » | — |
| `apps/web/src/engine/tools/select.ts` | oui | double toucher et double-clic qui entrent dans l'éditeur, poignées « + » | V |
| `apps/web/src/engine/tools/handles.ts` | non (réutilisé) | `hitHandle` sert aux poignées de points | V |
| `apps/web/src/engine/tools/tool.ts:11-25` `ToolContext` | oui | `ctrl?()` (inversion de liaison) | V |
| `apps/web/src/engine/input/router.ts:85-100` | oui | doigt tardif = Maj (n° 29) | V |
| `apps/web/src/engine/input/keys.ts:55,78-84` | oui | Ctrl+Entrée, Ctrl+Alt+flèche ; `orderKey` inchangé | V |
| `apps/web/src/engine/engine.ts` | oui | éditeur de points, `AddLinked`, réglage de liaison | V |
| `apps/web/src/engine/item-style.ts` | oui | `arrowType` et liaison dans le style courant | V |

### 3.5 Interface

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/ui/tool-options.ts:7-28` | oui | `arrowType`, `roundness` pour la ligne | V |
| `apps/web/src/ui/OptionsPanel.tsx:57-64,333-338,362` | oui | sections Type de flèche, Pointes (+3, interrupteur Liaison), bouton Modifier les points, Retirer le point | V |
| `apps/web/src/ui/icons.ts`, `icons.test.ts` | oui | icônes Droite, Courbe, Coudée, Barre, Rond, Rond creux, Modifier les points, « + » (Lucide ou dessinées, § 10 du design) | V |
| `apps/web/src/ui/shortcuts.ts:5-37` | oui | Ctrl+Entrée, Ctrl+Alt+flèche, Ctrl tenu | V |
| `apps/web/src/ui/HelpPanel.tsx` | non (lit la table) | l'aide liste les raccourcis de la table | V |
| `apps/web/src/toolbar.ts:100-112` `TOOL_TABLE` | non (lot 1) ; oui au lot 2 (losange) | — | V |
| `apps/web/src/ui/rb.css` | oui | poignées « + » et de points (44 px), surlignage | S |

### 3.6 Formats, export et CLI

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/app/board-io.ts:175-185,266,290-292,332` | oui | export polyligne ou corde, avec avis (n° 15) | V |
| `crates/roomboard-formats/src/board/write.rs:283` | S : peut-être | écrire une polyligne si le flux `OP_SHAPE` ne la porte pas | S |
| `apps/cli/src/ops.ts:11-20` `COMMAND_TYPES` | oui | `SetLinePoints`, `AddLinked` (sinon `tsc` casse) | V |
| `apps/cli/src/formats.ts:81` `FORMAT_LOTS` | non | aucun format ni lot neuf (prémisse démentie) | V |
| `scripts/essais/cli-essai.mjs:114,468-483` | oui | bloc OG12 (S5) | V |
| `apps/cli/src/contract.ts:1-10` | non | ajouts additifs, `roomboard-cli/1` gardé | V |

### 3.7 Tests et essais (une entrée non touchée est un test à garder vert)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/engine/tools/shape.test.ts`, `select.test.ts` | oui (ajouts) | liaison à la création, doigt tardif, double toucher | V |
| `apps/web/src/engine/input/router.test.ts` | oui (ajouts) | doigt tardif = Maj ; pincement sous 150 ms inchangé | V |
| `apps/web/src/engine/render/canvas2d.test.ts`, `sketch.test.ts` | oui (ajouts) | courbe, polyligne, pointes | V |
| `apps/web/src/ui/OptionsPanel.test.tsx`, `tool-options.test.ts`, `shortcuts.test.ts`, `icons.test.ts` | oui (ajouts) | sections, raccourcis, icônes | V |
| `apps/web/src/app/board-io.test.ts`, `crates/roomboard-formats/tests/board_roundtrip.rs` | oui (ajouts) | export polyligne ; flux témoin `W1` inchangé | V |
| `apps/cli/src/main.test.ts`, `formats.test.ts` | non | à garder verts | V |
| `scripts/essais/s34-navigateur.mjs`, `s5b-navigateur.mjs`, `personnalisation-2-navigateur.mjs`, `c9-grille-navigateur.mjs`, `c3-groupes-navigateur.mjs`, `c4-bibliotheque-navigateur.mjs`, `c13-tableaux-navigateur.mjs` | non | essais des formes, de la grille, des groupes, de la bibliothèque et des tableaux : verts sans réécriture | V |
| nouveau `scripts/essais/outils-excalidraw-navigateur.mjs` + ligne de `scripts/verifier.sh` (près de `:146`) | oui | S1 à S4 | V |

### 3.8 Documents et licences

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| nouveau `docs/essais/outils-excalidraw.md` | oui | fiche (n° 36) | — |
| `THIRD_PARTY_NOTICES.md` | oui | Excalidraw (MIT) : route simple, courbe, flowchart adaptés ; Lucide (ISC) pour les icônes reprises | V |

### Effets de bord sur l'existant

1. Un doigt posé après 150 ms pendant un geste de Sélection, de forme ou de flèche était ignoré ; il vaut désormais Maj.
   Pendant un geste au stylet de ces outils, il ne déplace plus la vue. Le stylo et la gomme ne changent pas. Tests :
   `router.test.ts` (nouveaux cas, et les cas existants du pincement et du doigt tardif du stylo restent verts).
2. Déplacer un rectangle relié déplace aussi l'extrémité de ses flèches, dans la même étape. Annuler revient sur les
   deux. Test : `tests/fleches.rs` (suivi, une étape) et S1.
3. Déplacer une flèche liée seule rompt ses liaisons. Test : `tests/fleches.rs` (rupture) et le contrat commun.
4. La section « Angles » apparaît pour la ligne, et la section Pointes gagne trois choix. Test : `tool-options.test.ts` ;
   `personnalisation-2-navigateur.mjs:1047` parcourt les quatre pointes actuelles par leur valeur : il reste vert s'il ne
   compte pas les choix (à vérifier au plan, S).
5. Une flèche courbe ou coudée devient un mur courbe ou coudé pour le pot par zones (`zone.rs:843`). Test :
   `tests/fleches.rs` (polygone), `tests/pot.rs` vert.
6. Ctrl+D d'une flèche seule rend une copie libre. Avant, il n'y avait pas de liaison du tout. Test : `tests/fleches.rs`
   (copie) et S4.
7. Export `.ubz` ou `.iwb` d'une flèche à plusieurs points : polyligne, ou corde avec avis. Test : `board-io.test.ts`.

### Chantiers en cours

- **OG23 `personnalisation-2-retours`** (`feat/personnalisation-2-retours`, cadrage pas encore écrit) : accordéon du panneau,
  organiser, aligner, transformer, dupliquer, « Glisser une copie ». Collisions : `OptionsPanel.tsx`, `tool-options.ts`,
  `rb.css`, sans doute `select.ts` et `keys.ts` (Alt-glisser, transformer). Règle : nos sections passent par les tables
  `OPTION_ORDER` / `BY_TOOL` (`tool-options.ts:10-28`), jamais par un nouveau bloc de mise en page. Alt-glisser leur
  revient (n° 32). Intégrer `origin/main` avant la fusion (brief).
- **OG24 `portrait-pleine-largeur`** (PR 68 ouverte) : `engine.ts`, `engine/input/keys.ts`, `engine/input/sampler.ts`,
  `camera.ts`, `rb.css`, `board-session.ts`, `scripts/verifier.sh`. Conflits attendus petits, dans `engine.ts`,
  `keys.ts`, `rb.css` et `verifier.sh` (une ligne d'essai chacun).
- **`gomme-surface-contact`** (cadrage seul) : `router.ts`, `sampler.ts`, `engine.ts`, `shortcuts.ts` (Ctrl+Maj+H),
  `keys.ts:104`, `commands.rs` (Erase), `history.rs`. Collision réelle : **`router.ts`**. Son geste de gomme réserve des
  identifiants négatifs, et notre doigt tardif = Maj touche la même branche (`router.ts:85-100`). Le plan sérialise les
  deux, ou garde nos ajouts dans une fonction à part. Elle laisse le panneau à OG12 et OG23.
- **`personnalisation-3-tableau`** (cadrage seul) : `table.rs`, `element.rs`, `commands.rs`, `OptionsPanel.tsx`,
  `shortcuts.ts`, `select.test.ts`, `crates/roomboard-wasm/src/lib.rs`, `cli-essai.mjs`, `verifier.sh`. Collisions :
  ajouts voisins dans `commands.rs` (enum `Command`), `lib.rs`, `cli-essai.mjs` ; rien sur les formes.
- Autres worktrees : `~/.cache/tmp/ctl-main-2ein` et `og24-avant` (détachés, contrôles) : aucun.

### Termes cherchés

- Graphe : `graphify affected "AddShape"` (aucun nœud), `affected "read_shape"`, `affected "createShapeTool"`,
  `affected "shape_polygon"`, `affected "cmd_transform"`.
- Texte (dépôt) : `"arrow"|'arrow'|ShapeKind::Arrow|ShapeKind::Line|endArrowhead|end_arrowhead` (fichiers `.rs`, `.ts`,
  `.tsx`, `.mjs`) ; `Arrow|arrow|Line\b|Connector|points|Binding|bind` (`shape.rs`, `element.rs`) ;
  `rotat|duplic|longPress|appui long|contextmenu` (outils, moteur, entrées) ; `touch|longPress|pinch|pincer`
  (`router.ts`, `gesture.ts`, `engine.ts`) ; `TOOL_TABLE` ; `COMMAND_TYPES` ; `FORMAT_LOTS` ; `Batch` (`commands.rs`,
  aucun) ; `pointerType.*touch` (`scripts/essais`) ; `arrowhead|roundness|OptionKey` (`tool-options.ts`,
  `OptionsPanel.tsx`) ; `losange|diamond` (cadrage OG11).
- Texte (Excalidraw) : `FixedPointBinding`, `getBindingGap`, `ARROW_TYPE`, `CTRL_OR_CMD` (`App.flowchart.ts`),
  `arrowtype|arrowBinding|midpointSnapping|editArrow` (`fr-FR.json`), `curveCatmullRom`, `unbind` (`dragElements.ts`),
  `BRACKET` (`actionZindex.tsx`), `getSimpleRoute`.
- Coffre : `flèche liaison connecteur excalidraw roomboard`, `roomboard piège tactile pointeur appui long`.

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| polygone de collision d'une ligne à plusieurs points | `crates/roomboard-core/src/shape.rs:81` `shape_polygon` | `shape_polygon(kind, w, h, width)` devient `shape_polygon(s: &ShapeGeom, width) -> Vec<f32>` avec `ShapeGeom { kind, w, h, path: &[f64], curve: bool }` ; les quatre appelants (`query.rs:250`, `fill.rs:221`, `zone.rs:862`, `shape_ring`) passent le chemin lu | étendre |
| pointe aux deux bouts | `shape.rs:52` `arrow_wings` ; `core/shapes.ts` `arrowWings` | appelés sur le premier et le dernier segment | réutiliser |
| lire et écrire les champs d'aspect (`elbowed`, pointes) | `element.rs:437` `LOOK_KEYS`, `:478` `look_fields`, `:517` `read_look`, `:451` `sanitized` | une clé de plus, domaine étendu | étendre |
| patch de style sur une sélection | `style.rs:181` `cmd_set_style` | `StylePatch.elbowed: Option<Option<bool>>` ; admission de `roundness` sur segment | étendre |
| géométrie des chemins, courbe, liaisons, route simple | aucun (cherché : `points`, `Binding`, `bind`, `curve`, `route`, `elbow` dans `crates/`) | **nouveau** `crates/roomboard-core/src/linear.rs` : `pub fn path(s: &ShapeFields) -> Vec<(f64, f64)>` (tous les points locaux) ; `pub fn flatten(path, curve: bool) -> Vec<(f64, f64)>` ; `pub fn anchor(target: &Geom, fixed: [f64; 2], gap: f64) -> (f64, f64)` ; `pub fn elbow_route(a: End, b: End) -> Vec<(f64, f64)>` ; `pub(crate) fn follow(txn, moved: &[String])` (appelée par `cmd_transform`, `SetText`, `FormatText`) | nouveau module (DA-1, DA-3) |
| renuméroter les liaisons à la copie | `copy.rs:26` `renumber` (ids de groupe), table `IdMap` | même table, étendue aux ids d'éléments pour `startBound` / `endBound` ; liaison retirée si la cible n'est pas copiée | étendre |
| copie de l'objet pour `AddLinked` | `copy.rs:181` `extract` / `:246` `insert_fragment` (recopie profonde de tous les champs) | `AddLinked` appelle la recopie d'un seul élément en interne, puis écrit la flèche dans la même transaction | réutiliser |
| poignées et portée de prise | `engine/tools/handles.ts` `hitHandle`, `HANDLE_GRAB_PX` | `hitHandle` sur les points, portée de 22 px au doigt (cible de 44) | réutiliser |
| contrainte de 15° | `engine/tools/shape.ts:20` `constrainEnd` | appelé pour le point tiré, par rapport à son voisin | réutiliser |
| aimant de grille pendant le glisser | `CoreDocument.snapPoint` (`shape.ts:56-58`) | même appel pour le point tiré | réutiliser |
| style courant, valeurs mixtes, sections | `ui/tool-options.ts:7-28` (`OPTION_ORDER`, `BY_TOOL`, `BY_KIND`), `OptionsPanel.tsx:57-64` (`LABEL`), `RadioChoices` | clé `arrowType`, ligne dans `BY_TOOL`, `roundness` pour la ligne | étendre |
| raccourcis | `ui/shortcuts.ts:5` `SHORTCUTS`, `engine/input/keys.ts` | lignes `line-edit`, `linked-node`, `no-binding` ; `lineEditKey`, `linkedKey` à côté d'`orderKey` | étendre |
| double toucher | aucun dans le moteur (cherché : `double`, `dblclick`, `TAP_TWICE` dans `apps/web/src/engine`) | **nouveau**, petit : `engine/input/double-tap.ts`, `isDoubleTap(prev: Tap \| null, cur: Tap): boolean` (300 ms, 35 px) | nouveau module |
| glisser au pointeur dans l'interface (poignées « + » dans le DOM si besoin) | `ui/pointer-gesture.ts` (décision 0299 du coffre) | appelé tel quel ; les poignées du canevas passent par le moteur | réutiliser |
| icônes | `ui/icons.ts` (table Lucide, trait 1,5, grille de pixels) | nouvelles entrées | étendre |
| suite de la CLI | `apps/cli/src/ops.ts:11` `COMMAND_TYPES` ; `scripts/essais/cli-essai.mjs` (`verifie`) | deux types de plus ; un bloc | étendre |

Constats ouverts des zones touchées (`docs/architecture-constats.md`), à ne pas aggraver : `fake-core.ts:1081`
(`edgeHit` refait `worldPolygon`). Le miroir de la polyligne passe par `shapePolygon` de `shapes.ts`, sans nouvelle
boucle. `query.rs:233` (`snap_box` recopie l'union) et `zone.rs:127` (union de boîtes) : on ne touche pas à ces boucles.
Aucun « Constats à fermer » : la demande ne vient pas d'`audit-architecture`.

## 4. Hypothèses à revoir

### Niveau 1 : difficiles à défaire ou visibles des utilisateurs

- **H1 — Type par défaut « Droite »** (n° 24). Excalidraw part sur « Courbe ». Nous gardons le tracé d'aujourd'hui, pour
  que les essais et les habitudes ne bougent pas. Changer le défaut ne demande qu'une ligne de `item-style.ts`.
- **H2 — Ctrl+Alt+flèche pour créer un objet relié** (n° 28). Excalidraw prend Ctrl+flèche, et ses touches de rangement
  sont Ctrl+[ ]. OG14 a posé le rangement sur Ctrl+↑ ↓. Risque : sur certains PC Windows à pilote Intel ancien,
  Ctrl+Alt+flèche fait pivoter l'écran. Autre option : passer le rangement sur Ctrl+[ ] comme Excalidraw, et rendre
  Ctrl+flèche au flowchart. Les poignées « + » restent le geste principal.
- **H3 — Double toucher simple sur une flèche = « Modifier les points »** (n° 21). Au lot 2, l'étiquette sur flèche
  voudra peut-être le double toucher, comme chez Excalidraw. Il faudra alors choisir.
- **H4 — Îlot « Modificateurs » au lot 2** (n° 31). Seul Maj a un geste au lot 1 (doigt tardif). Alt (depuis le centre)
  n'a pas encore de geste tactile.
- **H5 — Forme éditée = ligne fermée** (n° 34). Une forme passée en édition de points perd son genre (rectangle,
  ellipse) et devient une ligne fermée, comme chez Excalidraw. Annulable, mais un rectangle converti n'a plus les
  arrondis ni le texte lié d'un rectangle.
- **H6 — Export `.iwb` / `.ubz`** (n° 15) : polyligne si le flux la porte, sinon la corde avec un avis.

### Niveau 2

- **H7 — Écart de liaison** (n° 5) : `5 + épaisseur / 2`, en unités du monde (comme Excalidraw), pas en pixels écran.
- **H8 — Plafond de 512 points intérieurs** (n° 1) : Excalidraw n'en a pas. Il borne le coût de la collision et du
  fichier.
- **H9 — Portées** : 15 px écran pour la liaison (30 au doigt), 16 px pour les points d'accroche (24 au doigt), poignée
  « + » à 24 px du cadre. À régler à l'ENI.
- **H10 — `AddLinked` sur rectangle et ellipse seulement** (losange au lot 2 ; texte et image écartés, comme chez
  Excalidraw).
- **H11 — Suivi au lot 1 limité à `Transform`, `SetText` et `FormatText`**. Les autres changements de boîte
  (`SetTableSizes`, lignes du tableau, `SetImageParams` qui rogne) suivent au lot 2. D'ici là, l'extrémité se recale au
  prochain `Transform` de l'objet.
- **H12 — Réglage « Liaison des flèches » gardé sur l'appareil** avec le style courant, pas dans le document (comme la
  préférence d'Excalidraw).

## 5. Décisions d'architecture

**DA-1 — Points intérieurs seulement, extrémités inchangées.**
Contexte : la flèche du socle est un segment (0,0)-(w,h), lu par la collision, les bornes, le pot, l'export et un
éventuel lecteur ancien. Décision : `points` facultatif ne porte que les points intérieurs ; (w, h) reste la dernière
extrémité. Conséquences : un ancien fichier ou un ancien lecteur voit un segment valide. Tout calcul passe par
`linear::path(s)` pour avoir la liste complète. Aucune migration. Le genre de forme ne change pas.

**DA-2 — Liaison stockée d'un seul côté, lue avec tolérance.**
Contexte : Excalidraw tient la liaison des deux côtés (`startBinding` sur la flèche, `boundElements` sur l'objet) et doit
réparer après chaque suppression ou duplication. Décision : seule la flèche porte `startBound` / `startFixed` ; le cœur
retrouve les flèches liées en parcourant la page (quelques centaines d'éléments). Une cible absente se lit libre.
Conséquences : aucune donnée à réparer, l'annulation reste exacte. Le coût est un parcours par commande qui bouge des
objets. Ajouter un index plus tard ne change pas le fichier.

**DA-3 — Route coudée dans le cœur, points écrits.**
Contexte : la coudée doit suivre son objet quand le cœur applique un `Transform` (la CLI comprise), dans la même étape.
Décision : `linear::elbow_route`, portage réduit de `getSimpleRoute` d'Excalidraw (MIT, mention dans le fichier et dans
`THIRD_PARTY_NOTICES.md`), sans A*. Les points sont écrits dans `points`. Conséquences : le rendu et l'export ne routent
jamais. Le faux cœur ne reroute pas : écart assumé, exclu du contrat commun, comme la gomme partielle
(`fake-core.ts:4-7`), et testé sur le vrai module. Si le temps manque, la coudée sort du lot 1 la première (§ 7).

**DA-4 — Deux commandes neuves, petites : `SetLinePoints` et `AddLinked`.**
Contexte : une étape par geste, et tout doit se piloter par la CLI. Le cœur n'a pas de lot de commandes (`Batch` absent).
Décision : `SetLinePoints { id, points, start, end }` réécrit la géométrie d'une ligne et ses liaisons (l'éditeur,
l'accroche d'une extrémité) ; `AddLinked { id, dir }` pose copie et flèche liée en une transaction. Conséquences : la
page ne compose jamais deux commandes pour un geste, et la CLI joue les mêmes commandes. `COMMAND_TYPES` suit le
compilateur (`ops.ts:18-20`).

**DA-5 — `linear.rs`, un module profond pour toute la géométrie des lignes.**
Contexte : chemin, courbe, ancrage, route et suivi servent la collision, le rendu (par le miroir), les commandes et la
copie. Décision : un seul module du cœur, aux cinq fonctions du § 3 (Modules à réutiliser) ; `shapes.ts` en est le miroir
pour `path`, `flatten` et `anchor` seulement. Conséquences : `shape_polygon` reste l'unique entrée de la collision. Un
nouveau type de tracé ne touche que `linear.rs` et son miroir.

**DA-6 — Modificateurs tactiles : le doigt tardif, et des réglages à la place des touches qu'on tient.**
Contexte : au doigt, pas de Maj, d'Alt ni de Ctrl ; deux doigts posés en moins de 150 ms font déjà un pincement. Le
doigt tardif est ignoré. Décision : doigt tardif tenu = Maj ; Ctrl (sans liaison) devient le réglage « Liaison des
flèches » ; Alt aura des boutons collants au lot 2. Conséquences : rien ne change pour le pincement ni pour le stylo. Un
geste de forme au stylet ne déplace plus la vue d'un doigt posé. La règle tient dans le routeur et `ctx.shift`.

**DA-7 — « Modifier les points » plutôt que « Modifier la flèche ».**
Contexte : Excalidraw nomme l'action « Modifier la ligne » ou « Modifier la flèche » (`fr-FR.json:162-163`), alors
qu'elle fait entrer dans l'édition des points : on y déplace, on y ajoute et on y retire des points, on y attache ou on y
détache une extrémité. Son aide dit d'ailleurs « Modifier les points de ligne/flèche ». Décision : « Modifier les
points ». Conséquences : le nom dit ce qu'on va toucher, pas l'objet qu'on a déjà sous les yeux. Il est le même pour
une ligne, une flèche et, au lot 2, une forme, et il ne se confond pas avec le panneau d'options, qui « modifie » déjà
la flèche (couleur, pointes). Ce nom et sa raison vont dans la description de la PR.

## 6. Scénarios d'acceptation

Joués par `scripts/essais/outils-excalidraw-navigateur.mjs` (Playwright, comme `personnalisation-2-navigateur.mjs`). Le doigt
d'abord, avec des événements `pointerType: "touch"`, puis la souris et le clavier. Sélecteurs : `data-item`,
`data-option-value`, `data-action`.

- **S1 — Relier deux objets au doigt, les déplacer, annuler.** Au doigt : poser deux rectangles A et B, prendre la Flèche,
  glisser de A vers B. Les 4 points d'accroche de B s'affichent sous le doigt, et B est surligné. Au relâché, l'état
  montre une flèche avec `startBound = A`, `endBound = B`. Glisser B de 200 px avec la Sélection : l'extrémité de fin
  suit, et la pointe reste à `5 + épaisseur / 2` du contour. Annuler une fois : B et la flèche reviennent ensemble (une
  étape).
- **S2 — Courber une flèche au doigt, puis l'enregistrer.** Au doigt : double toucher sur une flèche, et « Modifier les
  points » s'ouvre (poignées visibles). Tirer le point milieu de 80 px : la flèche a 3 points. Dans le panneau, Type de
  flèche → Courbe : le tracé passe par le point. Poser un second doigt après 150 ms pendant qu'on tire une extrémité :
  l'angle se cale à un multiple de 15°. Toucher hors de l'objet : sortie. Enregistrer, fermer, rouvrir : mêmes points,
  même type, mêmes liaisons. Un fichier de `main` ouvert puis enregistré sans changement garde ses octets.
- **S3 — Carte mentale au doigt.** Au doigt : sélectionner un rectangle, toucher la poignée « + » de droite. Un
  rectangle de même taille apparaît à 100 à droite, relié par une flèche coudée liée aux deux, et il devient la
  sélection. Toucher son « + » du bas : un troisième nœud. Revenir au premier, toucher encore « + » à droite : le nouveau
  nœud se pose à côté du deuxième, sans le chevaucher. Glisser le premier rectangle : ses connecteurs suivent et la
  coudée se reroute. Une étape par création.
- **S4 — Souris et clavier.** Avec la souris : flèche tirée de A vers B **en tenant Ctrl** : elle reste libre.
  Maj tenue : angle à 15°. Sélectionner une flèche, **Ctrl+Entrée** : « Modifier les points ». Clic sur un point,
  **Suppr** : le point part. **Échap** : sortie. Sélectionner un rectangle, **Ctrl+Alt+→** : objet relié créé à droite.
  Ctrl+D de la flèche avec A et B : la copie est liée aux copies. Ctrl+D de la flèche seule : copie libre. Interrupteur
  « Liaison des flèches » coupé : une flèche tirée sur B reste libre. Chaque nouveau raccourci (Ctrl+Entrée, Ctrl+Alt+
  ↑ ↓ ← →, Ctrl tenu) figure dans le menu des raccourcis et dans l'Aide.
- **S5 — CLI.** `node scripts/essais/cli-essai.mjs` : `run --new` avec deux `AddShape` rect puis un `AddShape` arrow avec
  `start` et `end`. `Transform` du second rectangle : l'`state` montre l'extrémité déplacée. `undo` : retour en une
  étape. `SetLinePoints` avec un seul point : code 1, `BadPoints`. `AddLinked` à droite : deux éléments de plus, une
  étape. La sortie affiche `CLI : OK`.

### Annexe A — ossature de `docs/essais/outils-excalidraw.md`

Un tableau par outil : `comportement · source Excalidraw · état · essai`. États : **copié**, **adapté au tactile**,
**écarté (raison)**, **lot 2**.

- **Flèche** : glisser = 2 points (`App.tsx` ~l.9805) · seuil 20 px (adapté : 4 px gardé) · tap au doigt = flèche fixe
  (écarté : le tap ne crée rien chez nous, comme aujourd'hui) · multi-points au clic (lot 2) · types droite, courbe,
  coudée (`actionChangeArrowType`) · pointes (`actionChangeArrowhead`, 3 au lot 1, le reste au lot 2) · liaison à la
  création, inside et orbit (`binding.ts`) · surlignage (`interactiveScene.ts`) · points d'accroche
  (`actionToggleMidpointSnapping`) · Ctrl sans liaison (copié souris ; adapté : réglage) · « Liaison des flèches »
  (`actionToggleArrowBinding`) · suivi (`updateBoundElements`) · rupture quand la flèche bouge seule (`dragElements.ts`) ·
  suppression de la cible (adapté : lecture tolérante) · duplication (`fixDuplicatedBindingsAfterDuplication`) · point
  milieu (`addMidpoint`) · « Modifier les points » (`toggleLinearEditor`, renommé) · Suppr d'un point (`deletePoints`) ·
  Maj 15° · Alt+clic au bout (lot 2) · Ctrl+D de points (lot 2) · coudée : route simple (adapté : sans A*), segments
  fixes (lot 2) · étiquette (lot 2) · flowchart Ctrl+flèche (adapté : Ctrl+Alt, poignées « + ») · navigation Alt+flèche
  (lot 2) · A répété (lot 2).
- **Ligne** : la même liste, sans pointes ni coudée ; Angles = courbe ; fermeture en polygone (lot 2).
- **Sélection et sélection d'objets** : Maj proportions (copié, doigt tardif) · Alt depuis le centre (lot 2) · rotation
  et Maj 15° (lot 2) · Maj verrou d'axe (lot 2) · Alt-glisser (OG23) · Ctrl+D +10 (copié) · rectangle « contain »
  (copié) · Maj+clic (copié) · flèches du clavier (lot 2) · lasso Ctrl+Alt (écarté : Ctrl+Alt est pris par le
  flowchart, à revoir) · verrou (lot 2) · poignées de 28 px au doigt (adapté : 44).
- **Main** : H, Espace, bouton du milieu, pincement (copié ou existant).
- **Rectangle, Ellipse, Losange** : Maj carré ou cercle (copié) · double toucher = texte lié (lot 2) · Entrée (lot 2) ·
  « Modifier les points » vers forme libre (lot 2) · losange (lot 2).
- **Crayon** : pression, lissage, point au clic, tracé perfect-freehand (état actuel à écrire, encre du socle).
- **Texte** : Entrée = saut de ligne, Échap valide, taille auto, largeur fixe au glisser (lot 2).
- **Image** : sélecteur, insertion au centre, recadrage au double clic (état actuel à écrire).
- **Gomme** : marque puis supprime au relâché, Alt restaure (lot 2, après `gomme-surface-contact`).
- **Raccourcis d'outils** : lettres et chiffres (lot 2 ; S et G déjà pris par les pipettes d'OG14, à arbitrer).

## 7. Hors périmètre

- Panneau d'options et menu ☰ (OG11), barre latérale et pages (OG4), fonds (OG5) : brief.
- Accordéon du panneau, Alt-glisser « Glisser une copie », aligner, transformer : OG23 (`personnalisation-2-retours`).
- Gomme à la paume : `gomme-surface-contact`.
- Mode « liaison complexe » d'Excalidraw (`COMPLEX_BINDINGS`, éteint par défaut chez eux) : écarté.
- Notes collantes, cadres, laser, lasso, pipette, autoshape d'Excalidraw : pas d'outil commun.
- **Lot 2 : au périmètre, hors du temps de ce tour.** Estimation : 10 tâches. Losange ; édition des points des formes
  (polygone) ; rotation ; îlot Modificateurs ; flèches du clavier ; texte dans une forme ; lettres d'outils ;
  multi-points au clic ; segments fixes des coudées ; étiquettes ; navigation et grappe du flowchart ; suivi des autres
  changements de boîte (H11) ; pointes restantes ; fiche complète des autres outils, avec leurs essais.
- **Lot 1 : 10 tâches.** Sur les 5 h 30, ordre de sortie si le temps manque, sans rien retirer du périmètre : (1) la
  route coudée et le type Coudée (le flowchart pose alors une flèche droite liée) ; (2) le glisser depuis une poignée
  « + » ; (3) les trois nouvelles pointes. Cet ordre est écrit au bloc final.
  - T1 cœur : modèle, `linear.rs` (`path`, `flatten`), `shape_polygon`, `AddShape`, `SetLinePoints`, `SetStyle`.
  - T2 cœur : liaisons, `follow`, rupture, `copy.rs`, `AddLinked`, `elbow_route`, `tests/fleches.rs`.
  - T3 pont : `lib.rs`, `api.ts`, `wasm-core.ts`, `fake-core.ts`, `shapes.ts`, contrat.
  - T4 rendu : polyligne, courbe, coudée, pointes, roughjs, calque d'édition.
  - T5 outil : liaison à la création, accroche, Ctrl, doigt tardif dans le routeur.
  - T6 « Modifier les points » : `line-edit.ts`, double toucher, Ctrl+Entrée, Suppr, Échap.
  - T7 panneau et icônes : Type de flèche, Angles de la ligne, Pointes, Liaison, boutons.
  - T8 carte mentale : poignées « + », Ctrl+Alt+flèche, branchement d'`AddLinked`.
  - T9 CLI et export : `COMMAND_TYPES`, `cli-essai.mjs`, `board-io.ts`.
  - T10 essai, fiche et licences : `outils-excalidraw-navigateur.mjs`, `verifier.sh`, fiche, `THIRD_PARTY_NOTICES.md`,
    table des raccourcis.
  - Vagues possibles : T1, puis T2 ∥ T3 ∥ T4, puis T5 ∥ T6 ∥ T7 ∥ T8 ∥ T9, puis T10.

## 8. Portes immédiates

Aucune. Porte visuelle de fin de lot signalée : icônes Droite, Courbe, Coudée, Barre, Rond, Rond creux, Modifier les
points et « + » ; surlignage et points d'accroche ; poignées de points. Contrôle de netteté § 10 de
`docs/plans/design-cadrage.md`, et principes `impeccable` pour ce que la charte ne couvre pas.
