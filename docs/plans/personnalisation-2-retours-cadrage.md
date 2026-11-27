# Cadrage — personnalisation-2-retours (OG23) : retours de Jérôme sur le chapitre 2

Cadrage autonome (étage 1, aucune question à Jérôme). Base : `origin/main` @ `cddbde49` (PR 67 fusionnée). Référence de
comportement : Excalidraw (MIT), clone en lecture `~/.cache/tmp/og23-excalidraw` @ `f4e5226a` (2026-11-27). Les
références `R/…` renvoient à ce clone, `X/…` à `apps/web/src/`, `C/…` à `crates/roomboard-core/src/`.

## 1. Demande et gabarit

**Demande** : répondre aux huit retours de Jérôme du 2026-11-27 sur le chapitre 2 (« couleur avancée et transparente,
épaisseur, transformer/aligner/organiser, dupliquer et glisser une copie, options par type, accordéon »), sans refaire ce
que les PR 63, 64 et 67 ont déjà livré.

**Gabarit** : chantier (40 questions au plus ; 37 consommées, contre-relecture 1 comprise). Deux lots dans la même branche, environ 6 h :
- **lot A** (fusionnable seul, cohérent) : accordéon, couleurs (transparent, rangée lisible, pipette), épaisseur et
  pression, aligner / répartir / transformer. Estimation : **8 tâches** (la pipette, T3, est la première coupée si le
  temps manque ; le lot reste cohérent sans elle).
- **lot B** : « Glisser une copie » (avec poignée Déplacer et flèches), section Image (rogner, baguette « effacer le
  fond » depuis le point touché) et liste des manques des autres types. Estimation : **6 tâches**.
- Plus la clôture (intégration, relectures, captures) : **14 tâches** au plan, 16 au plus avec les correctifs.

## 2. Décisions

Les lignes R1 à R8 donnent, pour chaque retour, **l'état de `main`** (lu dans le code et les PR) puis la décision.

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| R1 | « Je ne vois pas le choix de couleur avancé » | **Livré au lot 2** (PR 67) : bouton `+` (`[data-more-colors]`, `X/ui/OptionsPanel.tsx:264-287`) qui ouvre `ColorPicker` (grille open-color 15 × 5 = teintes et nuances, champ hexadécimal, `X/ui/ColorPicker.tsx:81-125`), touches S et G. Jérôme n'a vu que les captures du lot 1. Ce qui manque : la **visibilité** (le `+` tombe seul sur une 2e ligne, capture `docs/design/captures/personnalisation-2/apres-rect.png`), le **transparent** dans le sélecteur, la **pipette**. Décisions 9 à 13. | PR 63, 67 ; code lu | — |
| R2 | « ni la couleur transparente » | **Fond : livré** (pastille « Transparent » barrée, `X/ui/tool-options.ts:93-101`). **Trait : absent**. Décisions 10, 11. | code lu | — |
| R3 | « Style de tracé ne montre pas clairement qu'il agit sur l'épaisseur » | Style de tracé = rugosité (Architecte, Artiste, Caricaturiste, `OptionsPanel.tsx:71-75`), sans lien avec l'épaisseur ; Largeur = trois mots sans dessin (`tool-options.ts:69-73`) ; aucune Pression. Décisions 14 à 18. | code lu ; capture `apres-rect.png` | — |
| R4 | « options de transformation, alignement, organiser » | **Organiser livré** (section Disposition, `Restack` d'OG4, `OptionsPanel.tsx:98-104`, affichée pour toute sélection, `tool-options.ts:49`). **Aligner, Répartir, Retourner, Tourner : absents** du panneau et du cœur (rien hors du panneau Image). Décisions 19 à 24. | PR 61, 67 ; code lu | — |
| R5 | « pour chaque objet, dupliquer » | **Livré au lot 1** (PR 63) : bouton Dupliquer de la section Actions, affichée pour toute sélection quel que soit le type (`tool-options.ts:49`), Ctrl+D (`X/engine/input/keys.ts` `objectKey`), extrait + `insertFragment` à +10/+10 (`X/engine/engine.ts:984-995`). Rien à refaire ; vérifié par S5. | PR 63 ; code lu | — |
| R6 | « Faire glisser une copie, comme dans ActivInspire » | **Absent** (`dragCopy`, `drag_copy` : aucun résultat). Décisions 25 à 29. | recherche texte | — |
| R7 | « options spécifiques : effacer le fond, crop pour une image ; édition des points pour les formes » | **Image : livré par C5 et C6b** (PR 22) : Rogner à huit poignées, Retourner, Tourner, luminosité, contraste, couleur transparente (pipette, tolérance, plume, contigu depuis les bords ou global), non destructif, une étape ; pixels en Rust dans le module `formats`, appelés par un Worker (`X/ui/ImagePanel.tsx`, `X/engine/tools/image-edit.ts:18-35`, `crates/roomboard-formats/src/pixels.rs`). Caché derrière le bouton « Image » de la rangée Sélection (`X/ui/SelectionRow.tsx:54`). Ce qui manque : l'accès depuis le panneau, et une baguette qui part du point touché (le mode contigu part des bords, `pixels.rs:67-68`). **Édition des points : OG12** (hors chantier). Décisions 30 à 32. | coffre `00_Journal/2026-11-20-roomboard-usage-c5-image-clos.md` ; code lu | — |
| R8 | « accordéon pour limiter les options visibles » | **Absent** (aucun `aria-expanded` de section, `OptionsPanel.tsx:442-450`). Décisions 1 à 8. | code lu ; cadrage tableau D26 (« OG23 n'a pas livré d'accordéon ») | — |
| 1 | Forme de l'accordéon | Chaque `section.rb-options-sec` reçoit un en-tête `<button class="rb-opt-head" aria-expanded aria-controls>` (patron WAI-ARIA « Accordion ») de 44 px au moins (taille du profil), chevron Lucide `chevron-down` qui tourne de 180° ouvert. Plusieurs sections ouvertes à la fois (pas d'exclusion). Le bouton de repli du panneau entier (`[data-options-toggle]`) reste. | brief (« accordéon ») ; décision 0311 (repli gardé) | oui |
| 2 | Ouvertes par défaut | **Trait, Arrière-plan, Largeur du contour**, plus **Image** (écart au brief, H1). Les autres repliées. Une section absente de la table est repliée (place réservée d'OG12, décision 8). | brief ; R7 | oui |
| 3 | Mémoire | Par **appareil**, tous profils confondus, comme le style courant (`roomboard.style-courant`, décision 23 d'OG11) : clé neuve `roomboard.options-sections`, objet `{ <OptionKey>: boolean }` ; illisible = défauts. Seules les clés touchées sont écrites. | décision 0311 ; `X/device-settings.ts:13,85-102` | oui |
| 4 | Clavier et tactile | En-tête : Tab l'atteint, Entrée ou Espace bascule (bouton natif), toucher bascule. Le corps replié reste **monté avec `hidden`** (les tests unitaires qui lisent `[data-option-value]` restent verts ; le focus ne peut pas y entrer). | brief ; `X/ui/OptionsPanel.test.tsx:54-133` | oui |
| 5 | Résumé de valeur | Un en-tête affiche, en gris (`--rf-gray-600`), la valeur courante de la section quand elle est unique : « Largeur du contour · Moyen », « Pression · Variable », « Style de tracé · Net ». Mixte : « · Mixte ». Section à pastilles ou à boutons : pas de résumé. | Jérôme (« limiter les options directement visibles ») ; R3 | oui |
| 6 | S et G sur une section repliée | `S` (ou `G`) ouvre d'abord la section Trait (ou Arrière-plan), puis le sélecteur ancré sur son bouton. | `OptionsPanel.tsx:248-254` | oui |
| 7 | Essais existants | Seul `scripts/essais/personnalisation-2-navigateur.mjs` lit les corps de section. Une ligne d'amorce `openOptionSections(page)` (neuve dans `commun.mjs`, sur le patron de `foldOptions`, `commun.mjs:309-314`) pose toutes les sections ouvertes avant `goto`. Aucun autre essai ne lit `data-option`. | recherche texte ; DA-4 d'OG11 | oui |
| 8 | Place réservée à OG12 | L'ordre des sections garde un emplacement nommé `editPoints` (« Points et connecteurs ») entre `arrowheads` et `opacity`, écrit en commentaire dans `OPTION_ORDER` ; OG12 l'ajoute en une ligne par table (`OPTION_ORDER`, `BY_TOOL`, `LABEL`, `bodies`). La section `table` du chantier Tableau s'insère de même ; l'accordéon l'enveloppe sans la réécrire. | brief (hors chantier) ; cadrage tableau D26, DA (`personnalisation-3-tableau-cadrage.md:79,293-295`) | oui |
| 9 | Rangée de couleurs | La rangée tient sur **une ligne** : **4 pastilles rapides + bouton « Autres couleurs »** (icône Lucide `palette`, 44 px). Trait : les 4 premières de `strokePicks` (préréglages, puis noir, rouge, bleu, vert). Fond : Transparent, jaune, vert, bleu. Amende la décision 7 d'OG11 (5 pastilles) : à 44 px, 6 cases font 308 px et élargiraient le panneau de 48 px sur la scène (H2). | capture `apres-rect.png` ; `X/ui/island-place.ts:175` `optionsWidth` | oui |
| 10 | Transparent : rendu | Case en **damier** (gris clair et blanc, 4 px, motif CSS `conic-gradient`), comme Excalidraw ; elle remplace la pastille barrée. `data-transparent` et `data-option-value="transparent"` sont gardés (essais). | brief (« case en damier ») ; Excalidraw `ColorPicker` | oui |
| 11 | Transparent : trait | Proposé seulement quand la **sélection** ne contient que des rectangles et des ellipses ; il écrit `color: "transparent"` sur ces éléments (déjà admis par `valid_color`, `C/rich_text.rs:54-58`, et `validColor`, `X/core/rich-text.ts:92`), **jamais dans le style courant** : un stylo à l'encre transparente serait un piège. Fond transparent : inchangé (`fill` retiré). **Export PDF** : `tryParseColor` (`X/engine/render/webgl2.ts:24`) rend `null` pour `transparent`, et le contexte PDF de la CLI garde alors la couleur d'avant (`apps/cli/src/pdf-node.ts:69-71`) : le trait sortirait noir. `tryParseColor("transparent")` rend `[0, 0, 0, 0]` (sens CSS) et le contexte PDF ne trace rien d'un alpha nul. | code lu ; H6 ; contre-relecture 1 | oui |
| 12 | Transparent dans le sélecteur | `ColorPicker` gagne une case « Transparent » (damier) au-dessus de la grille quand la section l'admet (fond toujours ; trait selon la décision 11). Prop `transparent?: boolean`, choix rendu par `choose(null)`. | Excalidraw (transparent dans la palette du fond) | oui |
| 13 | Pipette | **Renverse H8 d'OG11** (« Pas de pipette », `X/ui/ColorPicker.tsx:5`). Bouton « Pipette » (`pipette`, Lucide, `[data-color-pipette]`) dans le sélecteur, touche **I** quand le sélecteur est ouvert (Excalidraw). Elle arme un mode d'un seul toucher : le prochain appui sur la scène lit la couleur **affichée** à ce point (pixel du canevas Canvas 2D de la scène), l'écrit comme un choix de la grille (une étape), Échap annule. **À l'armement**, le panneau retient la section visée (`strokeColor` ou `background`) et ses cibles dans un état `armed` propre, indépendant de `picker()` : `chooseFull` (`OptionsPanel.tsx:291-292`, qui sort si `picker()` est vide) n'est pas appelé, l'écriture passe par `write` avec la clé retenue. **En mode pipette, la fermeture au toucher extérieur** (`ColorPicker.tsx:47-52`, `pointerdown` en capture) **ignore le toucher** ; le sélecteur se ferme après la lecture, ou à Échap. Le toucher lu n'atteint pas l'outil actif (le moteur le prend). Pas d'API `EyeDropper` (absente de WKWebView et du WebView Android). | brief (« pipette si possible ») ; décision 27 d'OG11 (scène en Canvas 2D) ; contre-relecture 1 | oui |
| 14 | Pression du stylo | Section **« Pression »** pour le stylo et les traits, juste après Largeur (place d'Excalidraw, `R/packages/excalidraw/components/Actions.tsx:178-182`) : **Constante** · **Variable**, deux icônes dessinées (trait d'épaisseur égale ; trait qui s'amincit puis s'épaissit), infobulles « Épaisseur constante » et « Épaisseur selon la pression du stylet ». | brief ; `R/…/actions/actionProperties.tsx:828-905` | oui |
| 15 | Pression : modèle | Champ facultatif `variability` (scalaire, U3) : `"constant"` ; absent = variable, donc un trait ancien est rendu au pixel près. Constante = contour calculé avec `thinning` 0 (`C/ink/outline.rs:16-31`), la pression stockée est gardée (on peut revenir à Variable). Défaut du style courant : **Variable** (comportement actuel, D8 : doigt et souris à 0,5, stylet réel). | D8 (`socle-cadrage.md:35`) ; Excalidraw (`variability` absente = variable, `R/packages/element/src/shape.ts:1352`) | oui |
| 16 | Pression : pas de simulation | Variable ne simule pas la pression par la vitesse (Excalidraw le fait à la souris) : D8 l'écarte et la gomme partielle coupe avec le rayon de la pression stockée (`C/ink/erase.rs:56`, OG20). Au doigt, Constante et Variable donnent le même trait (H3). | D8 ; `outline.rs:20-21` | oui |
| 17 | Largeur lisible | Les trois segments montrent un **trait à l'épaisseur relative** (icône 1,5 / 3 / 5 px dessinée) **et** le mot (Fin, Moyen, Épais) sous l'icône, en 12 px. | R3 ; Excalidraw (`StrokeWidthBaseIcon`…, `actionProperties.tsx:740-756`) | oui |
| 18 | Style de tracé lisible | Libellés **Net · À main levée · Très à main levée** (au lieu d'Architecte, Artiste, Caricaturiste) ; icônes neuves : un coin de rectangle net, puis le même coin doublé d'un second trait décalé, puis triplé. Résumé d'en-tête (décision 5). « Net » reste le défaut ; roughjs est déjà livré (PR 63, +9 978 o gzip). | brief ; décision 0312 ; recommandation du canal du 2026-11-27 | oui |
| 19 | Aligner : quand | Section **« Aligner »** quand la sélection compte **au moins 2 unités** (unité = groupe extérieur ou élément libre) ; **Répartir** en plus à partir de **3 unités**. | Excalidraw (`actionAlign.tsx:39-49`, `actionDistribute.tsx:42`) | oui |
| 20 | Aligner : comment | Deux rangées de 4 boutons de 44 px : gauche, centre, droite, répartir horizontalement ; haut, milieu, bas, répartir verticalement (disposition d'Excalidraw, `Actions.tsx:105-128`). Boîte d'une unité = **boîte d'accroche** (`snap_box`, sans l'épaisseur du trait, `C/query.rs:338-345`), comme `getCommonBoundingBox` d'Excalidraw. Répartir = écarts égaux entre unités triées par centre (algorithme de `R/packages/element/src/distribute.ts`, adapté avec mention MIT). | Excalidraw ; code lu | oui |
| 21 | Transformer | Section **« Transformer »** pour toute sélection : Retourner horizontalement, Retourner verticalement, Tourner de 90° à gauche, Tourner de 90° à droite, autour du centre de la boîte de la sélection. Traits, formes et **images** reçoivent la matrice (miroir ou quart de tour) ; **textes, tableaux, médias, objets 3D** ne sont pas retournés ni tournés : seule leur place suit (boîte miroir ou centre tourné), leur contenu reste droit (H5). Zones du pot (`fill`) et éléments inconnus : inchangés. | brief ; Excalidraw (`actionFlip.ts`, le texte n'est pas inversé) | oui |
| 22 | Une commande du cœur | `Command::Arrange { ids, how }` (DA-2) fait aligner, répartir, retourner et tourner en **une transaction = une étape** (`C/history.rs:3`), rien si rien ne bouge (D38), pilotable par la CLI telle quelle. **Groupe désigné en partie** : le moteur passe la sélection étendue par `wholeUnits(doc, page, sélection)`, comme `Restack` (`X/engine/engine.ts:443` `selectedBlock`) ; le cœur étend de lui-même un groupe touché en partie à tous ses membres, comme `Group` (`C/commands.rs:191`, `:1655`), pour qu'un appel de la CLI ne casse jamais un groupe. | brief (« une étape par geste ; pilotable par la CLI ») ; `C/commands.rs:91` `Transform` ; contre-relecture 1 | oui (DA-2) |
| 23 | Disposition | Inchangée (livrée) ; l'ordre des sections devient : … Transparence · Image · **Disposition · Aligner · Transformer** · Actions (ordre d'Excalidraw : calques puis alignement, `Actions.tsx:80-128`). | Excalidraw ; PR 67 | oui |
| 24 | Raccourcis (liste complète du chantier) | **Maj+H** retourner horizontalement · **Maj+V** retourner verticalement (Excalidraw, `actionFlip.ts:55,80`) · **Maj+R** tourner de 90° à droite · **Alt+Maj+R** tourner de 90° à gauche · **Alt+Maj+←** aligner à gauche · **Alt+Maj+→** à droite · **Alt+Maj+↑** en haut · **Alt+Maj+↓** en bas · **Alt+Maj+H** centrer horizontalement (centres sur une même verticale) · **Alt+Maj+V** centrer verticalement (centres sur une même horizontale) · **Alt+H** répartir horizontalement · **Alt+V** répartir verticalement (Excalidraw, `actionDistribute.tsx:88,119`) · **←↑→↓** déplacer la sélection de 1 px, **Maj+flèche** de 5 px (Excalidraw, `common/src/constants.ts:37-38` ; décision 27) · **I** pipette (sélecteur ouvert) · Entrée / Espace sur un en-tête d'accordéon. Règle des lettres : H, V, R, I seulement, **à la même place en AZERTY, QWERTY et QWERTZ** (A, Q, Z, W, M et Y écartés). Avec Alt, la lettre est lue par `e.code` (`KeyH`, `KeyV`, `KeyR`), car Option+H donne « ˙ » sous macOS (Excalidraw fait de même) ; sans Alt, par `e.key` (`h`, `H`, `i`…). Les flèches sont lues par `e.key`. Un test de `keys.test.ts` joue chaque raccourci avec les paires `key`/`code` d'un clavier AZERTY et d'un QWERTY. Ctrl+Maj+↑/↓ (alignement d'Excalidraw) restent à Premier plan / Arrière-plan (OG4). Hors champ de saisie, hors composition, jamais avec Ctrl. Collisions vérifiées : `keys.ts` (Ctrl+Maj+D/P/L, Ctrl+M, S, G, `?`, aucune flèche seule), Ctrl+Maj+H du chantier gomme-surface-contact (avec Ctrl, donc distinct), OG4. `ariaShortcut` (`X/ui/shortcuts.ts:45-56`) : la table `ARIA` reçoit `←` `ArrowLeft` et `→` `ArrowRight`. | Excalidraw ; `X/engine/input/keys.ts:32-121` ; `gomme-surface-contact-cadrage.md:63` ; contre-relecture 1 | oui |
| 25 | Glisser une copie : modèle | Champ facultatif `dragCopy: true` (U3 ; absent = faux), posé et retiré par `SetStyle` (patch `dragCopy`), **hors style courant** (comme `link`, § 9 d'OG11). Une étape par bascule. | brief (« champ facultatif, U3 ; pilotable par la CLI ») ; `C/style.rs:19-33` | oui |
| 26 | Glisser une copie : geste | Outil Sélection : un glisser qui **part d'un objet** `dragCopy` (ou d'une sélection qui en contient un) laisse l'original en place, montre la copie en fantôme pendant le geste (l'original n'est pas masqué), et pose au relâché **une copie de toute la sélection** au décalage du geste (accroche à la grille comme un déplacement ; Alt : brut). Une étape. Copies **sans** `dragCopy` (comme ActivInspire, la copie est un objet ordinaire), sélectionnées. Répétable sans fin. Glisser du pointeur (Pointer Events, U12, U24). | brief ; ActivInspire ; `X/engine/tools/select.ts:179-236` | oui |
| 27 | Glisser une copie : l'original | Un glisser depuis le corps copie ; l'original se déplace **sans retirer la propriété**, comme la poignée « Freely Move » d'ActivInspire : **au doigt**, une poignée « Déplacer » (icône Lucide `move`, cible de 44 px au doigt et au stylet, 24 px à la souris comme le badge de lien) posée au-dessus du milieu du bord haut du cadre de sélection, présente seulement quand la sélection contient un objet `dragCopy` ; la glisser déplace la sélection comme aujourd'hui (fantômes, une `Transform`, une étape). **Au clavier**, les flèches déplacent la sélection (décision 24 : 1 px, Maj 5 px, une `Transform` et une étape par appui), pour tout objet. Le déplacement aux flèches n'existe pas sur `main` (`keys.ts` : aucune flèche seule) ; si OG12 le livre avant la tâche (`git fetch` au départ), on réutilise le sien. Les poignées de taille restent. Dupliquer (Ctrl+D) et copier-coller **gardent** `dragCopy` (copie fidèle). | ActivInspire (« Freely Move ») ; Excalidraw (flèches) ; H4 ; contre-relecture 1 | oui |
| 28 | Glisser une copie : indicateur | Petit badge (icône Lucide `copy`, 12 px dans un rond de 18 px) au **coin haut gauche** de la boîte de l'objet, dessiné en pixels d'écran comme le badge de lien (`X/engine/render/link-badge.ts:27-47`), absent des miniatures et de l'export. Pas de zone de toucher. | brief (« indicateur discret ») ; § 9 d'OG11 | oui |
| 29 | Glisser une copie : commande | Bouton bascule « Glisser une copie » (icône + texte, `aria-pressed`, pleine largeur) dans la section Actions, pour toute sélection. **Sélection mixte** (une partie seulement porte `dragCopy`) : `aria-pressed="mixed"` et `data-mixed` sur la bascule ; un toucher pose la propriété sur toute la sélection (comme un choix sur une valeur mixte, décision 22 d'OG11) ; un second la retire partout. Au clavier : Tab puis Entrée (pas de raccourci propre, H12). La copie elle-même n'a **pas de commande du cœur** : extrait + `insertFragment` comme Dupliquer (décision 21 d'OG11) ; la CLI pose la propriété par `SetStyle` et copie par `export --ids` puis `import` (`apps/cli/src/main.ts:44`). | décision 21 d'OG11 ; code lu | oui |
| 30 | Section Image | Une **image seule** sélectionnée : section « Image » (ouverte par défaut, décision 2) avec **Rogner**, **Effacer le fond**, **Retouches…**. Rogner ouvre la séance existante en mode rognage (huit poignées, Valider / Annuler, une étape, non destructif). **Effacer le fond = baguette magique** : le panneau Image s'ouvre en mode **« Depuis le point touché »**, pipette armée ; le toucher sur l'image choisit la couleur **et** le point de départ ; la zone 4-connexe de ce point dont l'écart reste sous la tolérance devient transparente ; aperçu immédiat, tolérance et plume réglables, Valider écrit (une étape). Le sélecteur de mode du panneau Image passe à trois valeurs : Depuis le point touché · Depuis les bords (mode contigu actuel) · Global. Retouches… ouvre le panneau Image tel quel. Le bouton « Image » de la rangée Sélection reste. | R7 ; brief (« baguette magique avec tolérance, au doigt ») ; `image-edit.ts:22-23` `pick`, `startCrop` ; `ImagePanel.tsx:111-140` ; contre-relecture 1 | oui |
| 31 | Où calculer rognage et effacement | Rognage : **rien de neuf** (réglage `crop` lu au rendu dans la page). Baguette : calcul dans **`pixels.rs` du module `formats`**, dans le Worker existant (DAI2-DAI3 de C5) : `transparent_color` (`crates/roomboard-formats/src/pixels.rs:154`) part de `[(x, y)]` au lieu des bords quand le départ est donné, par `flood_region` qui accepte déjà des départs quelconques (`pixels.rs:69`, partagé avec `flood_fill`, `:194`). Modèle : deux champs facultatifs `x`, `y` (entiers, pixels de l'image source, donc indépendants du rognage, du retournement et des quarts de tour) dans le `Y.Map` `transparent` (`C/image.rs:12-30`, `transparent_prelim :184`, lecture `:121`) ; absents = mode d'aujourd'hui (bords si `contiguous`, sinon global), donc un fichier ancien est rendu au pixel près ; hors de l'image : `BadImageParams`. La pipette de la séance rend aussi le point (`pick()` → `{ color, x, y }`, `sourcePixelAt` existe dans `X/core/image-params.ts`). Module principal : + quelques centaines d'octets (lecture et écriture de deux champs) ; `formats` : + < 2 Ko. Aucune encre ne traverse la frontière. Pas de détourage par modèle (chantier à part, § 7). | coffre C5 ; profil (règle de l'encre) ; code lu ; contre-relecture 1 | oui |
| 32 | Autres types | Texte : complet après le lot 2 (police, taille, alignement, trait, transparence) ; rien à ajouter. Tableau : chantier `personnalisation-3-tableau` (section `table`). Formes et flèches (points, connecteurs, type de flèche) : OG12. Média, objet 3D : leurs barres (`MediaBar`, `Model3dBar`) restent ; une section du panneau qui les ouvre va au bloc final (§ 7). PDF : une page PDF est un fond de page, pas un objet. | code lu ; cadrages cités | oui |
| 33 | CLI (D15) | `COMMAND_TYPES` reçoit `Arrange` (`apps/cli/src/ops.ts:11-17`) ; `parseOp` contrôle `how` contre `ARRANGE_HOWS` sur le patron de `to` (`ops.ts:79-82`) : valeur inconnue ou absente = `CliError("usage")`, code 2 ; `SetStyle` accepte `variability` et `dragCopy` ; `SetImageParams` accepte `transparent.x`, `transparent.y`. Export PDF par la CLI d'un rectangle à trait transparent : aucun trait (décision 11). Ligne `.roomboard` de `FORMAT_LOTS` (`apps/cli/src/formats.ts:59`) : note complétée par `variability`, `dragCopy`. Tests `ops.test.ts`. Bloc `personnalisation-2-retours` de `scripts/essais/cli-essai.mjs` : `Arrange` `align-left` puis `undo` (une étape chacun), `flip-h` sur un texte (place miroir, pas de matrice miroir), `how: "spin"` refusé (code 2, usage), `SetStyle { variability: "constant" }` et `{ dragCopy: true }` lus par `state` ; `SetImageParams` avec `transparent: { …, x: 0, y: 0 }` lu par `state`, `x` hors de l'image refusé (code 1) ; `export` en PDF d'un rectangle `color: "transparent"` avec fond : le flux de la page a un remplissage (`f`) et aucun tracé (`S`). | profil § CLI ; contre-relecture 1 | oui |
| 34 | Taille Wasm | Module principal **1 440 761 o** sur `main` (PR 67 ; le brief disait 1 429 407, valeur d'avant le lot 2), plafond 1 572 864, marge 132 103 o. Estimation : `Arrange` +8 à +15 Ko, `variability`, `dragCopy`, `transparent.x/y` +1 à +3 Ko. **Enveloppe de ce chantier : +20 000 o au plus au module principal, +4 000 o au plus à `formats`**. OG12 et le chantier Tableau, en parallèle, sont estimés à +30 à +60 Ko : à trois, +80 Ko au pire, sous la marge de 132 103 o. Une tâche du cœur qui dépasse l'enveloppe s'arrête et le consigne à l'état (pas de dépassement silencieux) ; la marge réelle à trois est mesurée au bloc final, sur `main` à jour. | état ; PR 67 ; contre-relecture 1 | oui |

## 3. Carte d'impact

La ligne « Surfaces d'impact » manque au profil : rubriques déduites du graphe et de la recherche texte. Graphe :
`~/.cache/graphes/roomboard/graphify-out/graph.json` (14 014 nœuds, 2026-11-27 18:43), interrogé une fois ; le reste vient
de la recherche texte et de la lecture (V).

### 3.1 Cœur Rust (`crates/roomboard-core`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/commands.rs:34-326` `Command`, `:338-361` `CommandError` | oui | `Arrange { ids, how: ArrangeHow }` ; erreurs reprises (`MixedPages`, `UnknownElement`, `BadMatrix`), aucune neuve | V |
| `src/commands.rs:1043-1079` `cmd_transform` | non (réutilisé) | `valid_matrix`, `compose`, `transform_to_any` repris par `cmd_arrange` | V |
| `src/commands.rs:1623` `group_targets` | non (réutilisé) | unités (groupe extérieur ou élément libre) d'Aligner et Répartir | V |
| `src/commands.rs:704` `find_unique` | non (réutilisé) | ids uniques, inconnus | V |
| `src/query.rs:323-345` `bounds`, `snap_box` | non (réutilisé) | boîte d'accroche par unité, boîte de la sélection | V |
| `src/arrange.rs` | oui (neuf) | calcul des matrices par élément (DA-2) | — |
| `src/element.rs:366-393` `Look` | oui | `variability`, `drag_copy` (scalaires, absent = neutre) | V |
| `src/element.rs:354-359` `read_style` | non | couleur et largeur inchangées | V |
| `src/style.rs:19-33` `StylePatch`, `validate` | oui | `variability: Option<Option<String>>` (`"constant"` seul admis), `drag_copy: Option<bool>` ; stylo seul pour `variability` | V |
| `src/ink/outline.rs:11-41` `InkStyle`, `options`, `outline_radius` | oui | `InkStyle.constant` → `thinning` 0 ; `outline_radius(width, pressure, constant)` | V |
| `src/ink/erase.rs:56` | oui | rayon de coupe selon `variability` | V |
| `src/commands.rs:563` `erase_stroke` | oui | reçoit `constant` (lu du `Look` du trait) et le passe au rayon | V |
| `src/ink/builder.rs` `StrokeBuilder::new` | oui | reçoit `InkStyle` complet (encre vive à épaisseur constante) | V |
| `src/document.rs:595-600` cache des contours (`ink_outline(pts, &InkStyle { width })`) | oui | le contour d'un trait lit `variability` | V |
| `src/image.rs:12-30` `TransparentView`, `TransparentInput` ; `:121` lecture ; `:184-191` `transparent_prelim` | oui | champs facultatifs `x`, `y` (départ de la baguette) ; contrôle dans l'image | V |
| `src/commands.rs` gomme partielle (`Cut.look`) | non | recopie déjà `look` brut (PR 63) : `variability` suit | V |
| `src/copy.rs:181,246` `extract`, `insert_fragment` | non (réutilisé) | Dupliquer et Glisser une copie | V |
| `src/image.rs:154-181` `ImageParamsInput`, `normalize` | non | passe `transparent` tel quel ; rognage inchangé | V |
| `src/history.rs:1-5` | non | une transaction = une étape | V |
| `crates/roomboard-formats/src/pixels.rs:5-12` `Transparent`, `:154` `transparent_color` | oui | `seed: Option<(u32, u32)>` : départs `[(x, y)]` au lieu des bords | V |
| `crates/roomboard-formats/src/pixels.rs:69` `flood_region`, `:194` `flood_fill` | non (réutilisé) | départs quelconques déjà admis ; pot sur image inchangé | V |
| `crates/roomboard-formats-wasm/src/lib.rs:360-375` | oui | le calcul reçoit le départ facultatif | V |
| `crates/roomboard-formats/src/board.rs` (.iwb/.ubz) | non | champs neufs perdus à l'export (comme H10 d'OG11) ; `color: "transparent"` écrit tel quel | S |
| `crates/roomboard-wasm/src/lib.rs:1320` (pont `restack`), `:2429` `StrokeBuilder::new(width)` | oui | `arrange(ids, how)` ; `StrokeBuilder::new(width, constant)` | V |
| `tests/scenarios.rs`, `tests/compat_socle.rs` | oui | `Arrange` une étape ; ancien fichier lu à l'identique | S |

### 3.2 API TS, pont, faux cœur (`apps/web/src/core`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `core/api.ts` `Command`, `Look`, `StylePatch` | oui | `Arrange`, `ArrangeHow`, `variability`, `dragCopy` | V |
| `core/look.ts` | oui | `variabilityOf`, `dragCopyOf` (lecteurs comme `opacityOf`) | V |
| `core/wasm-core.ts` | oui | `Arrange` ; constructeur du builder | S |
| `core/fake-core.ts:1707` `outline`, `apply` | oui | miroir d'`Arrange`, de `variability`, de `dragCopy`, joué par le contrat | V |
| `core/image-params.ts:153` `placeAfter` | non | supposé correct sur une matrice miroir ; vérifié par S6.4 | S |
| `core/image-params.ts` `clean`, types `ImageParams.transparent` ; `core/api.ts` | oui | `x`, `y` facultatifs ; `:75` `sourcePixelAt` réutilisé | V |
| `platform/pixel-runner.ts`, `pixel-worker.ts` | oui | le travail transmet le départ | V |
| `core/rich-text.ts:92` `validColor` | non (réutilisé) | admet `transparent` | V |

### 3.3 Moteur et outils (`apps/web/src/engine`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `engine/engine.ts:233,1250` `setItemStyle` | oui | `variability` dans le style courant ; `color: "transparent"` jamais écrit au style courant | V |
| `engine/engine.ts:984-995` `duplicateSelection` | oui | extrait en `duplicate(ids, dx, dy, { stripDragCopy })`, appelé par Dupliquer et Glisser une copie | V |
| `engine/engine.ts` (neuf) `arrange(how)`, `pickColor()` | oui | Aligner, Répartir, Transformer ; pipette de scène | — |
| `engine/item-style.ts:5-41` `ItemStyle` | oui | `variability: "variable" \| "constant"` (défaut `variable`) ; un style gardé sans le champ reste lisible (`parseItemStyle`, champ absent = défaut) | V |
| `engine/tools/select.ts:179-236` glisser, `live()` | oui | mode copie : fantômes sans masquer l'original, `ctx.duplicate` au relâché ; poignée « Déplacer » | V |
| `engine/tools/handles.ts` `hitHandle`, `HandleId` | oui | poignée `move` (44 px au doigt, 24 px à la souris), seulement avec un objet `dragCopy` | V |
| `engine/tools/tool.ts:12` `ToolContext` | oui | `duplicate(ids, dx, dy, strip): boolean` | V |
| `engine/tools/pen.ts:119` `CommitStroke` | oui | `look.variability` ; builder constant | V |
| `engine/tools/image-edit.ts:22` `pick`, `:23` `startCrop` | oui | `pick()` rend `{ color, x, y }` (point source) ; `startCrop` réutilisé | V |
| `engine/input/keys.ts:2-10` `KeyLike`, `:43-55` `objectKey` | oui | `code?: string` facultatif ; `arrangeKey(e): ArrangeHow \| null` ; `nudgeKey(e): { dx, dy } \| null` (flèches seules) | V |
| `engine/input/keys.ts:78-84` `orderKey` | non | Ctrl+Maj+↑/↓ inchangés | V |
| `engine/render/canvas2d.ts:22,797` badge, contours | oui | badge « glisser une copie » ; `colorAt(x, y)` pour la pipette | V |
| `engine/render/link-badge.ts:27-47` | oui | `copyBadgeBox`, `paintCopyBadge` à côté | V |
| `engine/render/record-ctx.ts` | non | `strokeStyle = "transparent"` accepté par Canvas 2D | S |
| `engine/render/webgl2.ts:24` `tryParseColor` | oui | `transparent` → `[0, 0, 0, 0]` (décision 11) ; le stylo n'a jamais cette couleur | V |

### 3.4 Interface (`apps/web/src/ui`) et réglages

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `ui/OptionsPanel.tsx:50-65` `LABEL`, `:66-105` options, `:313-389` `bodies`, `:442-450` sections | oui | accordéon, Pression, Aligner, Transformer, Image, bascule Glisser une copie, libellés de tracé, icônes de largeur, 4 pastilles | V |
| `ui/OptionsPanel.tsx:248-254` S et G | oui | ouvrent la section repliée d'abord | V |
| `ui/tool-options.ts:7-13` `OptionKey`, `OPTION_ORDER` ; `:23-36` tables ; `:46-53` `sectionsFor` ; `:85-101` pastilles | oui | clés `pressure`, `image`, `align`, `transform` ; `OPEN_BY_DEFAULT` ; unités pour Aligner ; 4 pastilles | V |
| `ui/ColorPicker.tsx:11-17,81-125` | oui | case Transparent, bouton Pipette, touche I | V |
| `ui/ColorPicker.tsx:47-52` fermeture au `pointerdown` extérieur | oui | ignorée en mode pipette (décision 13) | V |
| `ui/OptionsPanel.tsx:291-297` `chooseFull` | oui | la pipette écrit par la clé retenue à l'armement, pas par `picker()` | V |
| `ui/ImagePanel.tsx:47-56` `ImagePanelProps` ; `:111-140` couleur transparente | oui | `start?: "crop" \| "background"` joué au montage ; mode à trois valeurs ; point de départ | V |
| `ui/App.tsx:376-385,457,794-797` panneau Image | oui | ouverture avec un mode de départ depuis le panneau d'options | V |
| `ui/SelectionRow.tsx:54` bouton Image | non | gardé | V |
| `ui/shortcuts.ts:5-35` `SHORTCUTS`, `:45` table `ARIA` | oui | groupes « Transformer », « Aligner », flèches (décision 24) ; `ARIA` reçoit `←`, `→` | V |
| `ui/RadioChoices.tsx:18-34` | non (réutilisé) | segments à icône et texte (déjà admis par `RadioOption`) | V |
| `ui/IconButton.tsx` | non (réutilisé) | boutons, infobulle maison, `keepFocus` | V |
| `ui/icons.ts:14-55` | oui | Lucide `palette`, `pipette`, `chevron-down`, `flip-horizontal-2`, `flip-vertical-2`, `rotate-ccw-square`, `rotate-cw-square`, `align-start-vertical`, `align-center-vertical`, `align-end-vertical`, `align-start-horizontal`, `align-center-horizontal`, `align-end-horizontal`, `align-horizontal-space-around`, `align-vertical-space-around`, `crop`, `eraser` (fond) ; dessinées : pression ×2, largeur ×3, tracé ×3 | V |
| `ui/rb.css:435-442` `.rb-options*` | oui | en-têtes, chevron, damier, segments icône + texte | V |
| `ui/island-place.ts:175` `optionsWidth` | non | largeur inchangée (décision 9) | V |
| `device-settings.ts:85-102` | oui | `optionSections()`, `setOptionSection(key, open)` | V |
| `ui/HelpPanel.tsx` | non | lit `SHORTCUTS` : les lignes neuves apparaissent seules | V |

### 3.5 CLI, essais, outillage

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/cli/src/ops.ts:11-17` `COMMAND_TYPES`, `:79-82` contrôle de `to` | oui | `Arrange` ; contrôle de `how` (code 2) | V |
| `apps/cli/src/pdf-node.ts:61-75` `nodeMeasureContext` (normalisation des couleurs, `fillStyle` `:69-71`) | oui (par `tryParseColor`) | aujourd'hui `transparent` est illisible et la couleur d'avant (noir) reste : le trait sort noir ; après, `rgba(0, 0, 0, 0)`, et l'écriture vectorielle ne trace rien d'un alpha nul (à vérifier dans la tâche, sinon garde explicite) | V |
| `apps/cli/src/pdf.test.ts` | oui | rectangle à trait transparent : aucun opérateur `S` | S |
| `apps/cli/src/formats.ts:59` | oui | note `.roomboard` | V |
| `apps/cli/src/ops.test.ts`, `session.test.ts` | oui | `Arrange` lu, refus | S |
| `apps/cli/src/main.ts:44` `export --ids`, `import` | non (réutilisé) | copie par la CLI | V |
| `scripts/essais/cli-essai.mjs:468-477` | oui | bloc `personnalisation-2-retours`, dont la ligne « PDF : trait transparent non tracé » | V |
| `scripts/essais/commun.mjs:309-314` `foldOptions` | oui | `openOptionSections(page)` à côté | V |
| `scripts/essais/personnalisation-2-retours-navigateur.mjs` | oui (neuf) | S1 à S6 | — |
| `THIRD_PARTY_NOTICES.md:301-315` | oui | mention d'`distribute.ts` et `actionFlip.ts` adaptés (Excalidraw, MIT) ; Lucide déjà listé | V |

### 3.6 Tests et essais (une entrée non touchée est un test à garder vert)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/essais/personnalisation-2-navigateur.mjs` (S1 à S8 d'OG11) | oui (amorce) | une ligne `openOptionSections(page)` ; fond inchangé | V |
| `ui/OptionsPanel.test.tsx:54-133`, `OptionsPanel.link.test.tsx` | non | corps montés avec `hidden` : verts sans retouche ; `textContent` des segments garde « Plein », « Droits » | V |
| `ui/tool-options.test.ts` | oui | sections neuves, `OPEN_BY_DEFAULT`, 4 pastilles | V |
| `ui/ColorPicker.test.tsx`, `ImagePanel.test.tsx`, `SelectionRow.test.tsx` | oui, oui, non | transparent, pipette ; mode de départ ; rangée inchangée | V |
| `engine/item-style.test.ts:19` | non | « défaut : Architecte… » : le défaut reste 0 ; le nom du test seul cite Architecte | V |
| `engine/tools/select.test.ts`, `image-edit.test.ts`, `pen.test.ts` | oui | copie au glisser, poignée Déplacer ; `pick` rend le point ; `variability` | V |
| `crates/roomboard-formats/src/pixels.rs:254-400` (tests de la couleur transparente) | non | sans départ : mêmes pixels ; un test neuf « départ au point touché » | V |
| `apps/cli/src/pdf-node.test.ts`, `engine/render/webgl2.test.ts` | oui | `transparent` lu `[0, 0, 0, 0]` ; couleurs nommées encore illisibles (H25 de la CLI) | V |
| `engine/input/keys.test.ts:186` | non | `orderKey` refuse Ctrl+← : vert | V |
| `engine/render/canvas2d.test.ts:1666` (hachures en Architecte) | non | rendu net inchangé | V |
| `ink/outline.rs:175-214`, `erase.rs:140-226` (OG20) | non | variable par défaut : mêmes contours, mêmes trous | V |
| `scripts/essais/c3-groupes`, `c5-image`, `c13`, `c15-3d`, `design-l1/l2/l3`, `personnalisation-1a` | non | amorce `foldOptions` déjà posée ; rangées de la barre inchangées | V |
| `scripts/essais/c5-image-navigateur.mjs:114,143` (`data-selection-action="image"`) | non | bouton Image gardé | V |
| `scripts/tests/controle-icones.test.sh`, `nettete.test.mjs` | oui | icônes neuves, netteté § 10 à 2x | V |
| `scripts/tests/controle-licences.test.sh` | non | aucune dépendance neuve | V |

**Effets de bord sur l'existant**
- Les sections autres que Trait, Arrière-plan, Largeur et Image s'ouvrent repliées : un enseignant qui touchait « Tirets »
  directement doit d'abord ouvrir « Style du trait » (une fois, l'état est gardé). Test : `OptionsPanel.test.tsx`
  « sections repliées par défaut, état relu » et S1.
- La rangée de couleurs passe de 5 à 4 pastilles + palette : la 5e couleur rapide (jaune au trait, rose au fond) passe dans
  le sélecteur. Test : `tool-options.test.ts` « 4 pastilles », S2 ; `personnalisation-2-navigateur.mjs` S1 (Bleu, Jaune) vert.
- La pastille Transparent devient un damier (même sélecteur). Test : `personnalisation-2-navigateur.mjs` (`data-fill-none`
  non lu ; `data-option-value="transparent"` gardé) et netteté § 10.
- Les libellés Architecte / Artiste / Caricaturiste deviennent Net / À main levée / Très à main levée (aria et infobulles).
  Test : `OptionsPanel.test.tsx` (ne lit pas ces mots) ; essai `personnalisation-2-navigateur.mjs` (lit `data-option-value`
  0/1/2, inchangé).
- Le style courant gagne `variability` ; un style gardé avant reste lisible. Test : `item-style.test.ts` « style ancien sans
  variability lu ».
- Un objet `dragCopy` ne se déplace plus au glisser de son corps, seulement par la poignée Déplacer ou les flèches.
  Test : `select.test.ts` « dragCopy : l'original reste, une copie », « poignée Déplacer : l'original bouge ».
- Les flèches seules, sans effet aujourd'hui, déplacent la sélection (1 px, Maj 5 px). Test : `keys.test.ts`
  « nudgeKey », `engine.test.ts` « flèche : une Transform, une étape » ; sans sélection : rien.
- `tryParseColor("transparent")` rend `[0, 0, 0, 0]` au lieu de `null` : le canevas WebGL2, le contexte de mesure de la
  CLI et l'export PDF lisent une couleur nulle là où ils gardaient la précédente. Test : `webgl2.test.ts`,
  `pdf-node.test.ts`, ligne PDF de `cli-essai.mjs`.
- Le panneau Image gagne un 3e mode ; une image ancienne (sans `x`, `y`) garde exactement ses pixels. Test :
  `pixels.rs` (tests existants verts), `ImagePanel.test.tsx` « mode Depuis le point touché ».
- Le panneau Image s'ouvre aussi depuis le panneau d'options ; il cache le panneau d'options comme aujourd'hui (§ 9 d'OG11).
  Test : `App.test.tsx` « Rogner depuis le panneau ouvre la séance en rognage ».

**Chantiers en cours** (`git worktree list`, `gh pr list` le 2026-11-27 vers 19 h)
- **OG12, `feat/personnalisation-2-outils`** (étage 0, même base `cddbde49`, arrêt ferme 01:15) : outils au comportement
  d'Excalidraw (sélection, formes, flèche, ligne, crayon, texte, image, gomme), connecteurs façon carte mentale. Fichiers
  communs probables : `engine/tools/select.ts` (glisser), `pen.ts`, `OptionsPanel.tsx`, `tool-options.ts`, `keys.ts`,
  `shortcuts.ts`, `commands.rs`, `element.rs`, `style.rs`, `api.ts`, `fake-core.ts`, `ops.ts`, `cli-essai.mjs`, `icons.ts`,
  `rb.css`. Points de friction : un Alt+glisser qui duplique (Excalidraw) appellerait le même `ctx.duplicate` ; les
  connecteurs devront suivre `Arrange` comme `Transform`.
- **`feat/personnalisation-3-tableau`** (étage 1, cadrage seul) : section `table` du panneau (`OptionsPanel.tsx:74,234`,
  `tool-options.ts:6,89`), `commands.rs`, `copy.rs`, `cli-essai.mjs`, `shortcuts.ts`, `icons.ts`, `engine.ts`, `select.ts`.
- **`feat/gomme-surface-contact`** (étage 2, cadrage) : `shortcuts.ts` (Ctrl+Maj+H), `keys.ts:104`, `engine.ts:704-778`,
  `pen.ts:118`, `rb.css`, `ops.ts:13`. Laisse le panneau à OG12 et OG23.
- **PR 68, `fix/portrait-pleine-largeur`** (ouverte) : `main.ts`, `rb.css`, `personnalisation-1a-cadrage.md`, essais.
- Autre machine : rien de donné par l'orchestrateur.

**Termes cherchés**
- Graphe : `graphify query "panneau d'options sélection déplacer glisser transform outil sélection" --budget 1200`
  (OptionsPanel, SelectionRow, `Transform`, `options()` d'`outline.rs`, T13-T14 de C5).
- Texte (code) : `transparent|data-transparent` (ui) ; `crop|Rogner|pipette|contiguous|tolérance` (ui, engine, core,
  formats) ; `pressure|thinning|simulate` (crates, apps/web) ; `rotat|flip|Retourner|Tourner` (engine, ui) ;
  `fn .*bounds|snap_box` (core) ; `fn .*group|group_targets` (core) ; `dragCopy|drag_copy|variability|locked` (crates,
  apps/web : rien hors fichiers .iwb et verrou de fichier) ; `badge` (render) ; `valid_color|validColor|COLOR` ;
  `COMMAND_TYPES|FORMAT_LOTS` ; `tryParseColor|nodeMeasureContext` (apps/cli/src) ; `flood_region|flood_fill|transparent_color|seed` (crates/roomboard-formats) ;
  `ArrowLeft|ArrowRight|nudge` (apps/web/src/engine, main.ts) ; `wholeUnits` (engine) ; `away|pointerdown` (ColorPicker.tsx) ; `data-option|data-more-colors` (scripts/essais) ; `h3|textContent|Architecte|Artiste`
  (tests, essais) ; `foldOptions` (commun.mjs) ; `export --ids|rbitem` (apps/cli) ; `objectKey|orderKey|pageKey|appShortcut`
  (keys.ts).
- Excalidraw (clone) : `pressure|variability|strokeOptions` ; `actionAlign`, `actionDistribute`, `actionFlip`,
  `actionDuplicateSelection` (`keyTest`, prédicats) ; `alignElements`, `distributeElements` ; `Actions.tsx` (ordre).
- Coffre : « roomboard personnalisation panneau options accordéon excalidraw » (0311, 0312), « activinspire glisser une
  copie roomboard » (C13 flipchart, rien sur la propriété), « roomboard rotation retourner aligner sélection poignées » (C5).
- Autres chantiers : `git -C <wt> diff --stat origin/main...HEAD`, fichiers d'état et cadrages de `personnalisation-2-outils`,
  `personnalisation-3-tableau`, `gomme-surface-contact` ; `gh pr list --state open`.

**Modules à réutiliser ou à étendre**

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| sections, ordre, valeur commune | `apps/web/src/ui/tool-options.ts:7-68` | `OptionKey` += `"pressure" \| "image" \| "align" \| "transform"` ; `export const OPEN_BY_DEFAULT: ReadonlySet<OptionKey>` ; `export function sectionOpen(key: OptionKey, saved: Readonly<Partial<Record<string, boolean>>>): boolean` ; `sectionsFor(tool, targets, editing, background, units: number)` | étendre |
| état ouvert / fermé gardé | `apps/web/src/device-settings.ts:85-102` | `optionSections(): Readonly<Partial<Record<string, boolean>>>` ; `setOptionSection(key: string, open: boolean): boolean` (clé `roomboard.options-sections`) | étendre |
| amorce des essais | `scripts/essais/commun.mjs:309` `foldOptions` | `export async function openOptionSections(page)` à côté, même patron `addInitScript` | étendre |
| pastilles rapides | `apps/web/src/ui/tool-options.ts:85-101` `strokePicks`, `backgroundPicks` | `PICKS = 4` ; `backgroundPicks()` rend Transparent, jaune, vert, bleu | étendre |
| sélecteur complet | `apps/web/src/ui/ColorPicker.tsx:11-17` | `ColorPickerProps` += `transparent?: boolean`, `pick?: () => Promise<string \| null>` ; `choose(c: string \| null)` | étendre |
| analyse de couleur | `apps/web/src/engine/render/webgl2.ts:24` `tryParseColor` ; `ColorPicker.tsx:25` `parseHex` | `tryParseColor("transparent")` → `[0, 0, 0, 0]` ; `parseHex` inchangée | étendre |
| fermeture du sélecteur | `apps/web/src/ui/ColorPicker.tsx:47-52` (`away`) | ignorée tant que la pipette est armée | étendre |
| pixel affiché de la scène | `apps/web/src/engine/render/canvas2d.ts` (contexte de la scène) | `colorAt(x: number, y: number): string \| null` (px d'écran, `#rrggbb`) ; moteur : `pickColor(): Promise<string \| null>` (un toucher, Échap annule) | étendre |
| écriture du style, une étape | `apps/web/src/engine/engine.ts:1250` `setItemStyle` ; `crates/roomboard-core/src/style.rs:19` `StylePatch` | `setItemStyle({ variability })` ; patch `variability`, `dragCopy` ; `setDragCopy(on: boolean): boolean` (sélection, hors style courant, comme `setLink`) | étendre |
| aspect facultatif | `crates/roomboard-core/src/element.rs:366` `Look`, `look_fields`, `read_look` | `variability: Option<String>`, `drag_copy: Option<bool>` | étendre |
| contour du trait | `crates/roomboard-core/src/ink/outline.rs:11,22,38` | `InkStyle { width, constant: bool }` ; `outline_radius(width, pressure, constant)` | étendre |
| coupe de la gomme | `crates/roomboard-core/src/ink/erase.rs:56` | rayon avec `constant` | étendre |
| encre vive | `crates/roomboard-wasm/src/lib.rs:2429` `StrokeBuilder::new` | `new(width: f32, constant: bool)` | étendre |
| ordre des objets | `apps/web/src/engine/engine.ts:996-999` `bringToFront`, `sendToBack`, `reorder` | inchangées (section Disposition) | réutiliser |
| matrices, unités, boîtes | `crates/roomboard-core/src/commands.rs:1043` `cmd_transform` (`valid_matrix`, `compose`), `:1623` `group_targets` ; `query.rs:338` `snap_box`, `:323` `bounds` | appelées par `cmd_arrange` | réutiliser |
| aligner, répartir, retourner, tourner | rien (termes : `align\|distribute\|flip\|rotate\|mirror\|Retourner\|Tourner` dans `crates/roomboard-core/src` et `apps/web/src/engine` : seuls les réglages d'image de C5) | `Command::Arrange { ids: Vec<String>, how: ArrangeHow }` ; `crates/roomboard-core/src/arrange.rs` : `pub(crate) fn plan(units: &[Unit], how: ArrangeHow) -> Vec<(String, Transform)>` (DA-2) ; moteur `arrange(how: ArrangeHow): boolean` | nouveau module |
| recopie d'objets | `apps/web/src/engine/engine.ts:984-995` `duplicateSelection` ; `core/api.ts:418` `extract` ; `engine.ts:186` `insertFragment` | une seule signature, sur `Engine` et `ToolContext` : `duplicate(ids: readonly string[], dx: number, dy: number, strip: boolean): boolean` ; `duplicateSelection()` appelle `duplicate(sel, 10, 10, false)`, l'outil Sélection `duplicate(sel, dx, dy, true)` | étendre |
| glisser de la sélection | `apps/web/src/engine/tools/select.ts:105-236` (`moveDelta`, `matrixOf`, `live`) ; `tools/handles.ts` `hitHandle` | `live()` sans `hidden` en mode copie ; `HandleId` += `"move"` | étendre |
| déplacer au clavier | rien sur `main` (termes : `ArrowLeft\|ArrowRight\|nudge` dans `apps/web/src/engine`, `main.ts` : seulement un test de `orderKey`) | `nudgeKey(e: KeyLike): { dx: number; dy: number } \| null` dans `keys.ts` ; `Engine.nudge(dx, dy): boolean` (une `Transform` de `wholeUnits`) ; repris d'OG12 s'il arrive avant | étendre (`keys.ts`, `engine.ts`) |
| baguette magique | `crates/roomboard-formats/src/pixels.rs:69` `flood_region` (départs quelconques), `:154` `transparent_color` ; `crates/roomboard-core/src/image.rs:12-30,121,184` | `Transparent.seed: Option<(u32, u32)>` ; `TransparentView`/`TransparentInput` += `x: Option<u32>`, `y: Option<u32>` ; `ImageEdit.pick(): Promise<{ color: string; x: number; y: number } \| null>` | étendre |
| badge à l'écran | `apps/web/src/engine/render/link-badge.ts:27,47` | `copyBadgeBox(b: Bounds, camera: Camera, dpr?: number)`, `paintCopyBadge(ctx, box, color)` | étendre |
| séance d'image (rogner, effacer le fond) | `apps/web/src/engine/tools/image-edit.ts:18-35` ; `ui/ImagePanel.tsx:47-56` ; `ui/App.tsx:376` `imagePanelFor` | `ImagePanelProps.start?: "crop" \| "background"` (`edit.startCrop()` ; ou `contiguous: true` puis `edit.pick()`) ; `OptionsPanelProps.openImage?: (start: "crop" \| "background" \| null) => void` | étendre |
| file des calculs de pixels | `apps/web/src/platform/pixel-runner.ts` | le travail porte `transparent.x`, `y` ; file et Worker inchangés | réutiliser |
| raccourcis | `apps/web/src/engine/input/keys.ts:2-55` `KeyLike`, `objectKey` | `KeyLike.code?: string` ; `export function arrangeKey(e: KeyLike): ArrangeHow \| null` | étendre |
| table des raccourcis | `apps/web/src/ui/shortcuts.ts:5-35` `SHORTCUTS`, `:45` `ARIA` | lignes de la décision 24 ; `ARIA` += `←`, `→` | étendre |
| contrôle des arguments de la CLI | `apps/cli/src/ops.ts:79-82` (patron de `to`) | `how` dans `ARRANGE_HOWS`, sinon `CliError("usage")` | étendre |
| segments, boutons | `apps/web/src/ui/RadioChoices.tsx:39`, `IconButton.tsx` | inchangées | réutiliser |
| commandes de la CLI | `apps/cli/src/ops.ts:11` `COMMAND_TYPES` | `"Arrange"` | étendre |

## 4. Hypothèses à revoir

**Niveau 1 : difficiles à défaire ou visibles des utilisateurs**
- **H1** Section **Image ouverte par défaut**, en plus de Trait, Arrière-plan, Largeur (le brief les nomme seules) : sans
  elle, une image seule sélectionnée ne montrerait que des en-têtes repliés, et le retour R7 reviendrait.
- **H2** **4 pastilles rapides + palette** sur une seule ligne (au lieu de 5 + `+` sur deux lignes) ; la 5e couleur passe
  dans le sélecteur. Autre voie : panneau élargi de 48 px.
- **H3** Pression **Variable par défaut**, sans simulation par la vitesse (D8) : au doigt et à la souris, Constante et
  Variable tracent le même trait ; la différence ne se voit qu'au stylet. Excalidraw simule à la souris.
- **H4** Un objet « Glisser une copie » se déplace par une poignée « Déplacer » posée au-dessus du cadre (et aux flèches),
  pas par un glisser de son corps, qui copie (« Freely Move » d'ActivInspire).
- **H5** Retourner et Tourner ne retournent ni ne tournent le **contenu** des textes, tableaux, médias et objets 3D : seule
  leur place suit.
- **H6** Trait transparent proposé seulement sur une sélection de rectangles et d'ellipses, jamais au style courant.
- **H7** État de l'accordéon par appareil, commun à tous les profils.
- **H8** « Effacer le fond » = baguette **à un seul point de départ** (le dernier toucher) : un fond coupé en deux
  morceaux se traite en mode « Depuis les bords » ou Global, pas par deux touchers (pas de liste de départs).

**Niveau 2**
- **H9** Raccourcis Alt+Maj+flèches, Alt+Maj+H/V, Maj+R et Alt+Maj+R (Excalidraw n'en a pas pour ces gestes, ou les
  prend à Ctrl+Maj+flèches, déjà à OG4). Sous Windows, Alt+Maj bascule la langue du clavier chez qui en a deux.
- **H18** Flèches : 1 px, Maj 5 px (Excalidraw), une étape d'annulation par appui (pas de regroupement des appuis).
- **H19** Pipette : le sélecteur reste ouvert pendant la lecture et se ferme après elle.
- **H10** Images retournées et tournées par la matrice (comme une forme), et non par leurs réglages `flip_x`, `quarter_turns`
  du panneau Image : deux chemins pour un même effet visible ; à réunir au chapitre suivant si gênant.
- **H11** Les copies posées au glisser perdent `dragCopy` ; Ctrl+D et copier-coller le gardent.
- **H12** Pas de raccourci propre pour la bascule « Glisser une copie » (Tab puis Entrée).
- **H13** Pipette : couleur **affichée** (fond de page, transparence et anticrénelage compris), pas la couleur de l'objet.
- **H14** Aligner sur la boîte d'accroche (sans l'épaisseur du trait).
- **H15** Badge de copie au coin haut gauche, toujours visible au tableau, jamais exporté.
- **H16** Résumé de valeur dans l'en-tête des sections à segments seulement.
- **H17** Icônes dessinées de Pression, Largeur et Style de tracé : jugées à la porte visuelle de fin de lot (netteté § 10,
  skill `impeccable`).

## 5. Décisions d'architecture

**DA-1 — L'accordéon vit dans la table des sections**
- Contexte : 18 sections possibles ; Jérôme veut moins d'options visibles ; OG12 et le chantier Tableau ajoutent les leurs.
- Décision : `tool-options.ts` porte `OPEN_BY_DEFAULT` et `sectionOpen(key, saved)` ; `OptionsPanel` rend un en-tête
  bouton par section et monte le corps avec `hidden` ; `DeviceSettings.optionSections()` / `setOptionSection()` gardent l'état.
- Conséquences : une section ajoutée par un autre chantier est repliable sans code de plus (absente de la table = repliée) ;
  tests unitaires verts ; un seul essai reçoit une ligne d'amorce.

**DA-2 — `Command::Arrange`, une commande pour aligner, répartir, retourner, tourner**
- Contexte : chaque élément reçoit une matrice différente (texte non inversé, unités alignées) ; `Transform` n'en prend
  qu'une ; plusieurs `Transform` feraient plusieurs étapes dans le cœur et la CLI.
- Décision : `Arrange { ids: Vec<String>, how: ArrangeHow }`, `ArrangeHow` = `align-left | align-center | align-right |
  align-top | align-middle | align-bottom | distribute-h | distribute-v | flip-h | flip-v | rotate-cw | rotate-ccw` (JSON en
  kebab). `arrange.rs::plan(units, how) -> Vec<(id, Transform)>` (pur, testé seul) ; `cmd_arrange` lit unités (`group_targets`)
  et boîtes (`snap_box`), compose (`compose`, `valid_matrix`), écrit en une transaction ; page mêlée `MixedPages`, id
  inconnu `UnknownElement`, matrice fautive `BadMatrix`, rien ne bouge : aucune étape.
  Un groupe désigné en partie est étendu à tous ses membres (comme `Group`) ; le moteur passe déjà `wholeUnits`. La CLI
  contrôle `how` dans `parseOp` (code 2).
- Conséquences : une étape partout, CLI gratuite ; +8 à +15 Ko au module principal (dans l'enveloppe de la décision 34) ;
  OG12 branche ses connecteurs sur `Transform` et `Arrange`.

**DA-3 — La pression constante dans le cœur de l'encre**
- Contexte : Constante doit valoir pour l'encre vive, le trait posé, la collision et la gomme partielle, tous calculés en
  Rust (Wasm), sans traverser la frontière.
- Décision : `InkStyle { width, constant }` ; `constant` met `thinning` à 0 dans `options()` et dans `outline_radius` ;
  `variability: "constant"` est un champ du `Look` lu au calcul du contour ; le pont passe le drapeau à `StrokeBuilder::new`.
- Conséquences : un trait ancien (sans champ) donne les mêmes octets et le même contour ; la pression stockée reste,
  donc Constante ↔ Variable est réversible ; la gomme coupe au bon rayon (tests d'OG20 verts).

**DA-4 — « Glisser une copie » : un champ, un crochet de l'outil Sélection, aucune commande**
- Contexte : il faut une propriété enregistrée et un geste qui copie en une étape, sans doubler Dupliquer.
- Décision : `dragCopy` dans le `Look` et `StylePatch` ; une seule signature `duplicate(ids, dx, dy, strip): boolean`,
  sur `Engine` (extraite de `duplicateSelection`) et `ToolContext` ; avec `strip`, elle retire `dragCopy` du fragment
  extrait (un `SetStyle` sur le fragment, avant `insertFragment`), puis insère : une étape. L'original se déplace par la
  poignée `move` du cadre (44 px) ou les flèches (`Engine.nudge`).
- Conséquences : Dupliquer et Glisser une copie partagent un chemin ; OG12 peut y brancher Alt+glisser ; la CLI pose la
  propriété par `SetStyle` et copie par `export --ids` + `import`.

**DA-5 — La section Image réutilise la séance de C5 ; la baguette étend son calcul**
- Contexte : rogner et effacer depuis les bords existent, non destructifs, calculés dans `formats` ; ils sont introuvables,
  et le brief veut une baguette qui part du point touché.
- Décision : trois boutons ouvrent `ImagePanel` avec `start` (`crop`, `background`, aucun). La baguette : départ `x`, `y`
  facultatif dans le `Y.Map` `transparent` (`image.rs`), passé par le Worker à `transparent_color`, qui appelle
  `flood_region` avec ce départ (`pixels.rs:69`) ; sans départ, le calcul d'aujourd'hui.
- Conséquences : module principal + quelques centaines d'octets, `formats` + < 2 Ko ; aucune encre ne traverse la
  frontière ; fichier ancien au pixel près ; le détourage par modèle reste un chantier à part.

**DA-6 — Pipette de scène lue dans le canevas**
- Contexte : « pipette si possible » ; `EyeDropper` manque sur iPad et Android ; la scène est peinte en Canvas 2D.
- Décision : `Canvas2DRenderer.colorAt(x, y)` lit un pixel (`getImageData` 1 × 1) ; `Engine.pickColor()` arme un toucher
  unique (outil inchangé, Échap annule) ; le sélecteur l'appelle (bouton, touche I).
- Conséquences : marche au doigt sur toutes les plateformes ; la couleur lue est l'affichée (H13) ; tâche coupable en
  premier sans casser le lot A.

## 6. Scénarios d'acceptation

Joués par Playwright (Chromium de la VM), **au doigt** (`hasTouch`, `page.touchscreen`, gestes aux Pointer Events)
**puis au clavier**. Sélecteurs : `[data-options]`, `[data-option="<clé>"]`, `[data-option-head="<clé>"]` (en-tête,
`aria-expanded`), `[data-option-value]`, `[data-more-colors]`, `[data-color-picker]`, `[data-transparent]`,
`[data-color-pipette]`, `[data-image-action]` ; état lu par l'API de la page et par `roomboard state`.

**Lot A**
- **S1 — Accordéon.**
  1. Doigt : outil Rectangle. Trait, Arrière-plan et Largeur sont ouverts ; Style du trait, Style de tracé, Angles,
     Transparence sont repliés (`aria-expanded="false"`, corps `hidden`), leurs en-têtes visibles avec un résumé
     (« Style de tracé · Net »).
  2. Toucher l'en-tête « Style du trait » : il s'ouvre ; toucher Tirets ; recharger la page : il est toujours ouvert.
  3. Clavier : Tab jusqu'à l'en-tête « Angles », Entrée l'ouvre, Espace le referme ; `S` ouvre le sélecteur de Trait.
- **S2 — Couleurs avancées et transparentes.**
  1. Doigt : poser deux rectangles, les sélectionner. La rangée Trait tient sur une ligne (4 pastilles + palette, même
     ordonnée). Toucher la palette : le sélecteur s'ouvre ; il montre une case Transparent en damier. La toucher : les
     deux rectangles ont `color: "transparent"` ; le style courant garde sa couleur (outil Stylo : pastille d'avant enfoncée).
  2. Arrière-plan : palette, case `#a5d8ff` de la grille : `fill` écrit ; Transparent dans la rangée : `fill` retiré. Une
     étape chacun (Ctrl+Z).
  3. Pipette : un rectangle plein `#a5d8ff` posé avant ; sélectionner l'autre rectangle, ouvrir le sélecteur de Trait,
     toucher Pipette (le sélecteur reste ouvert), puis toucher le rectangle plein sur la scène : le sélecteur ne s'est pas
     fermé avant la lecture, la sélection n'a pas changé, le rectangle sélectionné a `color: "#a5d8ff"` (une étape), puis
     le sélecteur se ferme.
  4. Clavier : `G`, flèches, Entrée ; champ hexadécimal `#123456`, Entrée ; `I` arme la pipette, Échap l'annule.
  5. CLI : `export` en PDF d'un rectangle à trait transparent et fond jaune : le flux de la page remplit, ne trace pas.
- **S3 — Épaisseur et pression.**
  1. Outil Stylo : sections Trait, Largeur, Pression, Transparence. Les segments de Largeur montrent une icône d'épaisseur
     et un mot ; Pression montre deux icônes, résumé « Pression · Variable ».
  2. Choisir Constante, tracer au stylet simulé (événements `pointerType: "pen"`, pression 0,1 puis 1) : le trait porte
     `variability: "constant"` et la hauteur de son contour varie de moins de 5 % ; même trait en Variable : plus de 30 %.
  3. Gomme partielle sur le trait constant : les morceaux gardent `variability` ; le trou a la largeur de la gomme.
  4. Outil Ellipse : Style de tracé montre Net, À main levée, Très à main levée ; choisir À main levée : `roughness: 1`.
  5. `roomboard state` du fichier enregistré montre `variability` ; un trait ancien n'a pas le champ.
- **S4 — Organiser, aligner, transformer.**
  1. Doigt : poser trois rectangles décalés, les sélectionner. Sections Disposition, Aligner (8 boutons), Transformer.
  2. Aligner à gauche : les trois boîtes d'accroche ont le même x0 ; Ctrl+Z : une étape, positions d'avant.
  3. Répartir horizontalement : écarts égaux à 1 px près. Avec deux rectangles, Répartir est absent.
  4. Retourner horizontalement une flèche et un texte sélectionnés ensemble : la flèche pointe dans l'autre sens, le texte
     reste lisible à sa place miroir. Tourner à droite : le rectangle large devient haut. Une étape chacun.
  5. Clavier : Maj+H, Maj+V, Maj+R, Alt+Maj+R, Alt+Maj+←, Alt+Maj+H, Alt+H donnent les mêmes résultats, joués avec les
     paires `key`/`code` d'un clavier AZERTY puis QWERTY ; Ctrl+Maj+↑ reste Premier plan ; → déplace la sélection de 1 px.
  6. Groupe : grouper deux rectangles, en sélectionner un seul membre par l'API, Aligner à gauche avec un troisième : le
     groupe bouge en bloc.
  7. CLI : `run` de `{ "type": "Arrange", "ids": [...], "how": "align-left" }` puis `undo` : une étape chacun ;
     `"how": "spin"` : code 2.

**Lot B**
- **S5 — Dupliquer et Glisser une copie.**
  1. Doigt : poser un rectangle, le sélectionner ; Actions montre Dupliquer, Supprimer, et la bascule « Glisser une copie ».
     Dupliquer : 2 objets (existant, à garder vert). Ctrl+Z.
  2. Toucher la bascule : `dragCopy: true`, badge visible au coin haut gauche (pixels non blancs dans la zone du badge).
  3. Outil Sélection, glisser le rectangle de 200 px : pendant le geste l'original reste peint ; au relâché, 2 objets,
     l'original à sa place, la copie décalée de 200 px, sélectionnée, sans `dragCopy`. Glisser encore l'original : 3 objets.
     Ctrl+Z : 2 objets.
  4. Glisser la poignée « Déplacer » (au-dessus du cadre) de 100 px : l'original bouge, aucune copie, `dragCopy` reste ;
     une étape. Sélectionner l'original et la copie : la bascule est `aria-pressed="mixed"` ; la toucher : les deux portent
     `dragCopy`.
  5. Enregistrer, rouvrir : `dragCopy` est là ; `roomboard state` le montre ; `SetStyle { dragCopy: false }` par la CLI le
     retire. Export PDF : aucun badge.
  6. Clavier : Tab jusqu'à la bascule, Entrée la retire ; sur un original `dragCopy`, ← le déplace de 1 px sans copie.
- **S6 — Image.**
  1. Doigt : importer une image de fixture (fond uni), la sélectionner. La section Image est ouverte : Rogner, Effacer le
     fond, Retouches….
  2. Rogner : huit poignées ; glisser la poignée droite ; Valider le rognage : `crop` écrit, une étape ; Ctrl+Z.
  3. Effacer le fond : fixture à fond blanc avec un disque rouge **qui contient un anneau blanc fermé**. Le panneau Image
     s'ouvre en mode « Depuis le point touché », pipette armée ; toucher le fond : aperçu, le fond est transparent, l'anneau
     blanc intérieur reste opaque ; toucher ensuite l'anneau : seul l'anneau devient transparent. Valider : `transparent`
     porte `x`, `y` (pixels source), une étape ; Ctrl+Z. Tolérance à 0 puis 40 : la zone grandit.
  4. Retourner horizontalement (Transformer) puis Rogner : le cadre de rognage suit l'image retournée.
  5. Clavier : Tab jusqu'à Rogner, Entrée ; Entrée valide, Échap annule (séance existante).
- **S7 — Non-régression.**
  1. `personnalisation-2-navigateur.mjs` (avec sa ligne d'amorce), `c1-profils`, `c3-groupes`, `c5-image`, `c6a-pot`,
     `c7b-texte-riche`, `c10a-tableau`, `c13-tableaux`, `c15-3d`, `design-l1`, `design-l2`, `design-l3`, `personnalisation-1a`
     passent sans réécriture sur le fond.
  2. `node scripts/essais/cli-essai.mjs` affiche `CLI : OK` avec le bloc `personnalisation-2-retours`.
  3. Tailles Wasm sous les plafonds (principal ≤ 1 572 864 o, formats inchangé) ; netteté § 10 à 2x sur les icônes neuves.

## 7. Hors périmètre

- Édition des points des formes et des flèches, connecteurs liés façon carte mentale, type de flèche courbe ou coudée,
  Alt+glisser qui duplique : **OG12** (`personnalisation-2-outils`) ; place réservée `editPoints` (décision 8).
- Options du tableau (section `table`) : chantier `personnalisation-3-tableau`.
- Détourage d'une image par modèle (sujet sans fond uni) : **chantier à part**, à écrire au bloc final (service ou modèle
  embarqué, poids, licence, hors ligne : à cadrer seul).
- Baguette à plusieurs points de départ (H8) ; angles arrondis des images (chapitre suivant, § 7 d'OG11).
- Section du panneau pour les médias (ouvrir `MediaBar`) et les objets 3D (ouvrir `Model3dBar`) : bloc final.
- Rotation libre à la poignée ; rotation des textes, tableaux, médias, objets 3D (H5).
- Simulation de la pression par la vitesse (H3, D8).
- Unification du retournement d'image (matrice contre réglages, H10).
- Mode compact à pastilles d'Excalidraw ; panneau en annotation du bureau (H2 et H3 d'OG11).

## 8. Portes immédiates

Aucune. Pas de dépendance neuve (roughjs, open-color et Lucide sont déjà là), pas de service, pas de dépense.
