# Fiche des outils communs : Excalidraw et RoomBoard (OG12, lots 1 et 2a)

Méthode : chaque comportement d'un outil est rapproché de son code dans Excalidraw (`~/.cache/tmp/og12-excalidraw`, commit
`f4e5226`, fichier et fonction), puis classé **copié**, **adapté au tactile**, **écarté (raison)** ou **lot 2**, avec l'essai qui
le prouve. Le doigt (`pointerType: "touch"`) passe avant la souris et le clavier. Le lot 1 remplit la flèche et la ligne ; les
autres outils sont à leur état actuel, le reste est marqué « lot 2 » (fiche complète : cadrage § 7, n° 36).

Essai navigateur : `outils-excalidraw-navigateur.mjs` (S1 à S4 et S6, cibles de 44 px, netteté § 10 à 2x). CLI : `cli-essai.mjs`, bloc « OG12 » (S5).
Cœur : `crates/roomboard-core/tests/fleches.rs`. Éditeur : `apps/web/src/engine/tools/line-edit.test.ts`.

## Nom de l'action : « Modifier les points »

Excalidraw nomme l'action « Modifier la ligne » (`toggleLinearEditor`). RoomBoard dit « Modifier les points » : le geste porte
sur les points d'une flèche ou d'une ligne (déplacer, ajouter, retirer), pas sur la ligne entière, et le mot « ligne » prêterait
à confusion avec l'outil Ligne (DA-7). Raccourci : Ctrl+Entrée ; au doigt, double toucher (sur une ligne ou une flèche) ou bouton du panneau.
La conversion d'une forme (rectangle, losange, ellipse) en ligne fermée se lance seulement par le bouton « Modifier les points » du panneau (tactile) et par Ctrl+Entrée (clavier) : le double toucher ou double clic sur une forme ne convertit pas (Excalidraw le réserve au texte dans une forme, lot 2b ; un double toucher accidentel sur un nœud de carte mentale détacherait ses connecteurs). Le double toucher sur une ligne, une flèche ou une ligne fermée déjà convertie garde « Modifier les points ». Une ligne fermée sélectionnée seule se comporte comme une forme (cadre ordinaire, déplacement) ; ses sommets s'éditent par « Modifier les points ».

## Flèche

| comportement | source Excalidraw (fichier:fonction) | état | essai |
|---|---|---|---|
| glisser = 2 points | `App.tsx` (pointerUp, ~l.9805) | copié | `outils-excalidraw-navigateur.mjs` S1 |
| seuil de glisser 20 px | `App.tsx` (`DRAGGING_THRESHOLD`) | adapté : 4 px gardé (écart) | `shape.test.ts` |
| tap au doigt = flèche fixe | `App.tsx` | écarté : le tap ne crée rien chez nous, comme avant | — |
| multi-points au clic | `App.tsx` (`handleLinearElementOnPointerDown`) | lot 2 (lot 2b) | — |
| types Droite, Courbe, Coudée | `actionProperties.tsx:actionChangeArrowType` | copié (panneau « Type de flèche ») | `outils-excalidraw-navigateur.mjs` S2, S3 ; `OptionsPanel.test.tsx` |
| pointes : barre, rond, rond creux | `actionProperties.tsx:actionChangeArrowhead` | copié (3 au lot 1, `diamond` et `cardinality_*` au lot 2) | `outils-excalidraw-navigateur.mjs` nettete |
| liaison à la création, intérieur et orbite | `binding.ts:bindOrUnbindBindingElement`, `getBindingGap` | copié ; écart `5 + épaisseur / 2` | `outils-excalidraw-navigateur.mjs` S1 ; `tests/fleches.rs::bind_target_prefers_smaller_containing_and_projects_outline` |
| surlignage de la cible et points d'accroche | `renderer/interactiveScene.ts` | adapté au tactile (data-bind, 4 ancres sous le doigt) | `outils-excalidraw-navigateur.mjs` S1 (`Lire : S1.bind`) |
| accroche des milieux | `actionToggleMidpointSnapping` | copié | `outils-excalidraw-navigateur.mjs` S1 |
| Ctrl tenu : flèche sans liaison | `binding.ts` (`isBindingEnabled`) | copié à la souris ; adapté : réglage « Liaison des flèches » au doigt | `outils-excalidraw-navigateur.mjs` S4 (`Lire : S4.ctrl.free=1`) |
| interrupteur « Liaison des flèches » | `actionToggleArrowBinding.tsx` | copié | `outils-excalidraw-navigateur.mjs` S4 |
| liaison au losange | `binding.ts:bindingBorderTest`, `element/src/shape.ts` (`diamond`) | copié : accroche sur le contour du losange, pointe à `5 + épaisseur / 2` | `outils-excalidraw-navigateur.mjs` S7 (`Lire : S7.end=…`, `S7.gap=7`) ; `tests/formes.rs::arrow_binds_to_diamond_outline_with_gap` |
| suivi de la cible déplacée | `binding.ts:updateBoundElements` | copié, en une étape d'annulation | `outils-excalidraw-navigateur.mjs` S1 (`Lire : S1.gap=7`) ; `tests/fleches.rs::moving_target_moves_bound_end_in_one_step` |
| suivi d'un tableau qui change de taille | `binding.ts:updateBoundElements` | copié : colonne ou ligne ajoutée ou retirée, tailles uniformisées, ligne agrandie par la hauteur d'une cellule, une étape (C1, C3) | `tests/fleches.rs::table_line_inserted_moves_bound_end_in_one_step`, `table_sizes_change_moves_bound_end`, `table_line_removed_moves_bound_end_in_one_step`, `table_cell_row_height_moves_bound_end_in_one_step` ; `wasm-core.contract.test.ts` « C1 : colonne ajoutée… », « C3 : colonne retirée… » |
| rupture quand la flèche bouge seule | `dragElements.ts` | copié | `tests/fleches.rs::moving_arrow_alone_unbinds_end_by_end` |
| suppression de la cible | `binding.ts:unbindBindingElement` | adapté : lecture tolérante (la flèche se lit libre, l'annulation rend la liaison) | `tests/fleches.rs::deleted_target_reads_free_and_undo_restores` |
| duplication avec ses cibles | `binding.ts:fixDuplicatedBindingsAfterDuplication` | copié : liée aux copies si les cibles sont copiées, libre sinon | `outils-excalidraw-navigateur.mjs` S4 (`Lire : S4.copy.bound=1`) ; `tests/fleches.rs::duplicate_with_targets_rebinds_to_copies_alone_frees` |
| point milieu : ajout en le tirant | `linearElementEditor.ts:addMidpoint` | copié, adapté au doigt (poignée de 44 px) | `outils-excalidraw-navigateur.mjs` S2 (`Lire : S2.points=3`) ; `line-edit.test.ts` « une SetLinePoints au relâché » |
| « Modifier les points » | `actionLinearEditor.tsx:toggleLinearEditor`, `linearElementEditor.ts` | copié, renommé (voir plus bas) ; Ctrl+Entrée, double toucher, au milieu (poignée du milieu) compris | `outils-excalidraw-navigateur.mjs` S2 (`Lire : S2.milieu.points=2` : aucun point ajouté), S4 |
| Suppr d'un point | `linearElementEditor.ts:deletePoints` | copié ; moins de deux points : sortie ; au doigt, bouton « Retirer le point » dès qu'un point est choisi (état republié après chaque geste, C3) | `line-edit.test.ts` « moins de deux points : Delete et sortie » ; `engine.test.ts` « C3 : chaque geste de l'éditeur republie l'état » ; `outils-excalidraw-navigateur.mjs` cibles (`data-line-points=1`, cible ≥ 44 px), netteté |
| Maj : angle de 15° | `linearElementEditor.ts:getSnapOrbit` | copié ; au doigt : second doigt posé après 150 ms (adapté) | `outils-excalidraw-navigateur.mjs` S2 (`Lire : S2.angle15=1`), S4 |
| sortie par toucher hors de l'objet | `linearElementEditor.ts` | copié | `line-edit.test.ts` « toucher hors de l'objet : sortie » |
| Alt+clic : point au bout | `linearElementEditor.ts` | lot 2 (lot 2b) | — |
| Ctrl+D de points | `actionDuplicateSelection` | lot 2 (lot 2b) | — |
| coudée : route simple | `elbowArrow.ts:getSimpleRoute` | adapté : route simple, sans A* | `outils-excalidraw-navigateur.mjs` S3 ; `tests/fleches.rs::moving_node_reroutes_elbow_arrow` |
| coudée : segments fixes | `elbowArrow.ts` (`fixedSegments`) | lot 2 (lot 2b) | — |
| étiquette sur flèche | `textWysiwyg` | lot 2 (lot 2b) | — |
| objet relié en un geste (Ctrl+flèche) | `flowchart.ts:createBindingArrow` | adapté : Alt+Maj+flèche et poignées « + » (Ctrl+flèche pris par ailleurs) ; pointe de fin neutre `arrow`, pas celle du style courant, car `AddLinked { id, dir }` ne porte aucun style (DA-4, écart n° 27) | `outils-excalidraw-navigateur.mjs` S3, S4 ; `tests/fleches.rs::add_linked_places_copy_and_elbow_arrow_in_one_step` |
| objet relié sur un losange | `flowchart.ts:createBindingArrow` | copié : le losange est copié et relié | `outils-excalidraw-navigateur.mjs` S9 (`Lire : S9.linked=diamond`) ; `tests/formes.rs::add_linked_accepts_diamond` |
| navigation Alt+flèche entre nœuds, grappe centrée | `flowchart.ts:FlowChartNavigator` | lot 2 (lot 2b) | — |
| A répété fait tourner le type | `actionProperties.tsx` | lot 2 (lot 2b) | — |
| courbe par points intérieurs | `math/curve.ts:curveCatmullRomCubicApproxPoints` | copié | `tests/fleches.rs::curved_arrow_hit_follows_the_curve` |
| fichier ancien : octets inchangés | — | propre à RoomBoard (DA-1) | `tests/fleches.rs::old_file_keeps_bytes` ; `outils-excalidraw-navigateur.mjs` S2 octets |

Écart n° 27 : l'objet relié créé par `AddLinked` porte une flèche à pointe de fin neutre (`arrow`), non la pointe du style
courant ; la commande ne transporte aucun style (DA-4). Ordre de sortie d'Excalidraw (liaison avant calcul de la route) :
appliqué à la création, non appliqué au suivi d'une cible déplacée (le cœur recalcule la route dans la même transaction).

## Ligne

| comportement | source Excalidraw (fichier:fonction) | état | essai |
|---|---|---|---|
| glisser de A à B, liée aux deux bouts | `binding.ts` | copié | `outils-excalidraw-navigateur.mjs` S6 (`Lire : S6.start`) |
| Angles : Aigus ou Arrondis = polyligne ou courbe | `actionProperties.tsx:actionChangeRoundness` | copié | `outils-excalidraw-navigateur.mjs` S6 |
| « Modifier les points », milieu tiré | `linearElementEditor.ts` | copié | `outils-excalidraw-navigateur.mjs` S6 |
| aucune pointe | `actionChangeArrowhead` (réservé aux flèches) | copié | `outils-excalidraw-navigateur.mjs` S6 |
| le départ suit la cible, annulation en une étape | `updateBoundElements` | copié | `outils-excalidraw-navigateur.mjs` S6 |
| mêmes gestes que la flèche (Ctrl, Maj, Suppr, Échap, Ctrl+D) | voir la flèche | copié | `outils-excalidraw-navigateur.mjs` S4 |
| pas de type Coudée ni de pointes | `actionChangeArrowType` (flèches seulement) | copié (Angles remplace le type) | `OptionsPanel.test.tsx` |
| fermeture en polygone | `linearElementEditor.ts` (`polygon`), `actionTogglePolygon` | adapté : ligne fermée à partir d'une forme, 3 sommets au moins, Suppr refusé en dessous | `outils-excalidraw-navigateur.mjs` S8, S9 (`Lire : S9.after=3`, `S9.refuse=3`) |

## Sélection

| comportement | source Excalidraw (fichier:fonction) | état | essai |
|---|---|---|---|
| poignées de 8 côtés sur une forme | `renderer/interactiveScene.ts` | copié | `select.test.ts` |
| sans cadre à 8 poignées pour une flèche ou une ligne seule | `linearElementEditor.ts` | copié ; poignées de bout et de milieu | `outils-excalidraw-navigateur.mjs` S1 ; `select.test.ts` « sans cadre à 8 poignées » |
| poignées de 28 px au doigt | `renderer/interactiveScene.ts` | adapté : 44 px | `outils-excalidraw-navigateur.mjs` cibles |
| Maj au redimensionnement : proportions | `resizeElements.ts` | copié ; au doigt, second doigt tardif | `outils-excalidraw-navigateur.mjs` S2 ; `router.test.ts` « doigt tardif » |
| Alt : depuis le centre | `resizeElements.ts` | lot 2 (lot 2b) | — |
| rotation, Maj 15° | `resizeElements.ts` | lot 2 (lot 2b) | — |
| flèches du clavier (1 px, Maj 5 px) | `App.tsx` | lot 2 (lot 2b) | — |
| Ctrl+D : copie décalée | `actionDuplicateSelection.tsx` | copié | `outils-excalidraw-navigateur.mjs` S4 |
| verrou | `actionToggleElementLock` | lot 2 (lot 2b) | — |

## Main

| comportement | source Excalidraw (fichier:fonction) | état | essai |
|---|---|---|---|
| H, Espace, bouton du milieu, pincement | `App.tsx` (`handleCanvasPanUsingWheelClick`, `isHandToolActive`) | copié ou existant | essais existants : `s2-navigateur.mjs` |

## Rectangle, losange, ellipse

| comportement | source Excalidraw (fichier:fonction) | état | essai |
|---|---|---|---|
| glisser, Maj : carré ou cercle | `App.tsx` | copié | `outils-excalidraw-navigateur.mjs` S1 (pose des rectangles) |
| double toucher = texte lié, Entrée | `App.tsx` | lot 2 (lot 2b) | — |
| « Modifier les points » vers une forme libre | `linearElementEditor.ts`, `actionTogglePolygon` (`polygon`) | adapté : conversion en ligne fermée (même id, fond gardé), fermeture implicite du dernier sommet vers le départ (écart, DA-1), ellipse en 16 sommets droits ; Ctrl+Entrée, bouton du panneau (pas de double toucher sur la forme) | `outils-excalidraw-navigateur.mjs` S8 (`Lire : S8.polygon=1`, `S8.after=5`, `S8.ellipse=16`), S9 ; `tests/formes.rs::shape_to_polygon_rect_in_one_step_undo_restores` |
| losange | `element/src/shape.ts` (`diamond`), `Tools.tsx` | copié (`ShapeKind::Diamond`) ; au doigt : toucher dans un coin de la boîte, hors du losange, ne sélectionne rien | `outils-excalidraw-navigateur.mjs` S7 (`Lire : S7.diamond=1`, `S7.corner=none`) ; `tests/formes.rs::diamond_hits_inside_not_box_corners` |

## Crayon

| comportement | source Excalidraw (fichier:fonction) | état | essai |
|---|---|---|---|
| pression, lissage, point au clic, tracé perfect-freehand | `renderer/renderElement.ts`, `freedraw` | état actuel : encre du socle de RoomBoard | `personnalisation-2-navigateur.mjs` |

## Texte

| comportement | source Excalidraw (fichier:fonction) | état | essai |
|---|---|---|---|
| Entrée = saut de ligne, Échap valide, taille auto, largeur fixe au glisser | `wysiwyg/textWysiwyg.tsx` | état actuel pour Échap et la taille ; largeur fixe : lot 2 (lot 2b) | `c7b-texte-riche-navigateur.mjs` |

## Image

| comportement | source Excalidraw (fichier:fonction) | état | essai |
|---|---|---|---|
| sélecteur, insertion au centre, recadrage au double clic | `App.tsx:insertImages` | état actuel | `c5-image-navigateur.mjs`, `c2-image-navigateur.mjs` |

## Gomme

| comportement | source Excalidraw (fichier:fonction) | état | essai |
|---|---|---|---|
| marque puis supprime au relâché, Alt restaure | `eraser/index.ts` | lot 2 (lot 2b), après `gomme-surface-contact` | `gomme-trait-epais-navigateur.mjs` (état actuel) |

## Sélection d'objets

| comportement | source Excalidraw (fichier:fonction) | état | essai |
|---|---|---|---|
| Maj+clic ajoute ou retire | `App.tsx` | copié | `select.test.ts` |
| rectangle de sélection « contain » | `App.tsx` | copié | `outils-excalidraw-navigateur.mjs` S4 (cadre à la souris) |
| Alt-glisser : copie | `App.tsx` | OG23 | — |
| lasso Ctrl+Alt | `App.tsx` | écarté : pas d'outil lasso chez nous, et Ctrl+Alt arrive comme AltGr sous Windows | — |

## Raccourcis d'outils

| comportement | source Excalidraw (fichier:fonction) | état | essai |
|---|---|---|---|
| lettres et chiffres | `keys.ts` | lot 2 (S et G déjà pris par les pipettes d'OG14, à arbitrer) (lot 2b) | — |
