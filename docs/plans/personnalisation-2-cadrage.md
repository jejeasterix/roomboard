# Cadrage — personnalisation-2 (OG11) : panneau d'options de l'outil et menu ☰

Cadrage autonome (étage 1, aucune question à Jérôme). Base : `origin/main` @ 45484db. Référence : Excalidraw (MIT),
clone en lecture `~/.cache/tmp/og11-excalidraw`. Ce clone est un **fork** (ajouts `stickynote`, `autoshape`,
`bucketfill`, minimap, `colorTopPicks`). Seul le comportement d'Excalidraw amont est copié, sans les ajouts du fork.
Les références `R/…` renvoient à ce clone.

## 1. Demande et gabarit

**Demande** : livrer le chapitre 2 de la personnalisation, fusionné dans `main`. Il comprend un panneau d'options d'outil et de sélection copié d'Excalidraw (même place, mêmes options, mêmes comportements), un menu ☰ au comportement d'Excalidraw rempli de nos commandes, et les options nouvelles du cœur. Ces options sont facultatives dans le fichier, coûtent une étape d'annulation par changement et sont pilotables par la CLI.

**Gabarit** : chantier (40 questions au plus ; 39 consommées). Deux lots dans la même branche, pour environ 4 h d'exécution
(arbitrage de l'orchestrateur après la contre-relecture 1) :
- **lot 1** (tient en 3 h, fusionnable seul et cohérent) :
  - cœur : champs `look` (style du trait, transparence, angles, style de tracé, graine) et commande `SetStyle` ;
  - CLI ;
  - rendu Canvas 2D (roughjs pour « dessiné à la main ») et couche vive ;
  - style courant gardé sur l'appareil ;
  - panneau à gauche : Trait (couleurs rapides), Arrière-plan (couleurs rapides), Largeur, Style du trait, Style de tracé, Angles, Transparence, Actions (Dupliquer, Supprimer), valeurs mixtes ;
  - menu ☰ étendu : raccourcis à droite, table `shortcuts`, Profil.
  - Estimation : **10 tâches**.
- **lot 2** (fait si le temps reste ; sinon il est écrit au bloc final comme reste à faire) : Disposition (`Restack` minimal), sélecteur de couleur complet (et touches S, G), Aide, Effacer la page, Ctrl+Maj+E, Remplissage (hachures), Pointes de flèche, Texte (Police, Taille, Alignement), Lien. Estimation : **8 tâches**.
- Total : 18, sous 20.

## 2. Décisions

Colonne « lot » : 1 ou 2. Sans précision, la décision vaut pour le lot 1.

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| 1 | Place du panneau | **Îlot à gauche, sous la rangée du haut**, comme le `Section "selectedShapeActions"` d'Excalidraw (`R/packages/excalidraw/components/LayerUI.tsx:258-321`). Hauteur bornée à la scène moins les îlots du haut et du bas, avec défilement interne. Ce n'est pas une barre de profil : c'est un îlot passager monté par `App` à côté de `IslandLayer`, avec la racine `[data-options]`. Quand la barre latérale d'OG4 occupe `side-start`, le panneau se pose à sa droite (DA-4). | Jérôme 2026-11-27 (« Copie excalidraw pour les menu contextuel de chaque outils ») ; LayerUI ; décision 23 d'OG4 (`personnalisation-1a-cadrage.md:50`) | oui |
| 2 | Repli | Écart à Excalidraw (non repliable) : bouton **Replier / Déplier** (`[data-options-toggle]`) en tête de l'îlot. Replié, il ne reste qu'un bouton « Options de l'outil » (`sliders-horizontal`, 44 px au moins). L'état est gardé par **`DeviceSettings.island(profileId, "options")` / `setIsland`** (`device-settings.ts:61-63`), champ `collapsed` ; il n'y a pas de clé neuve. Déplié par défaut. Pas de mode compact à pastilles (H3). | brief (« repliable ») ; `device-settings.ts:55-65` ; 0301 | oui |
| 3 | Cibles et largeur | Boutons à la taille du profil (S 44, M 48, L 64 ; décision 0291). Largeur = 5 cibles + 4 écarts de 4 px + 2 × 12 px de marge, soit 260 px en S. Options en segments `RadioChoices` (rôle `radiogroup`, flèches) ou en boutons `IconButton` (infobulle maison, jamais `title`, décision 0294). | coffre 0291, 0294 ; `ui/RadioChoices.tsx:17-31`, `ui/IconButton.tsx:102` | oui |
| 4 | Quand le panneau s'affiche | Règle d'Excalidraw (`R/packages/element/src/showSelectedShapeActions.ts:7-22`) : un outil de dessin actif (stylo, rectangle, ellipse, ligne, flèche, texte) ou une sélection non vide. **Masqué** avec Sélection sans sélection, Main, Gomme, Pot et Tableau sans sélection. Absent en annotation du bureau (H2). | Excalidraw ; arbitrage 3 de l'orchestrateur | oui |
| 5 | Sections et ordre | Ordre d'Excalidraw amont (`Actions.tsx:170-226`) : Trait · Arrière-plan · Remplissage (lot 2) · Largeur du contour · Style du trait · Style de tracé · Angles · Police, Taille, Alignement (lot 2) · Pointes de flèche (lot 2, l.199, après le texte) · Transparence · Disposition (lot 2) · Actions. Une section s'affiche si l'outil actif l'admet **ou** si un élément ciblé l'admet (`forToolOrSelection`, `shapeActionPredicates.ts:98-102`). Table : DA-1. | Excalidraw ; relevé du clone | oui |
| 6 | Rangées de la barre | **Toutes restent dans la barre** : `PresetRow` (D-DS7 ; essais `c1-profils-navigateur.mjs:118`, `design-l3-navigateur.mjs:220`), `SelectionRow` (Grouper, Dégrouper, Copier, Coller, Exporter, Image ; `c3:100-153`, `c5:114`), `FormatRow` (texte riche par plage), et les rangées du pot, du tableau et de la gomme. Le panneau ne reprend aucun de leurs boutons. | D-DS7 (`design-cadrage.md:114`) ; essais cités ; arbitrage 3 | oui |
| 7 | Couleurs rapides du trait | 5 pastilles (`COLOR_TOP_PICKS_SLOTS`, `R/packages/common/src/colors.ts:236`). Elles prennent les couleurs distinctes des `presets` de l'outil actif, puis de `presets.pen`, complétées dans l'ordre par une liste fixe tirée du code : noir `#000000`, rouge `#dc2626`, bleu `#1d4ed8` (`toolbar-profiles.ts:134-139`), vert `#15803d` (`FormatRow.tsx:23`), jaune `#facc15` (`FILL_COLORS`, `toolbar.ts`). Aucune couleur inventée. | brief (« presets en restent la source ») ; U12 ; charte | oui |
| 8 | Couleurs rapides du fond | « Transparent » (pas de `fill`), puis 4 teintes claires de `TABLE_FILLS` (`toolbar.ts`) : jaune, vert, bleu, rose. Excalidraw : transparent + 4 teintes claires (`colors.ts:248-254`). Rectangle et ellipse. | Excalidraw ; code | oui |
| 9 | Sélecteur complet (lot 2) | Une 6e pastille ouvre un popover : grille 15 teintes × 5 nuances d'Excalidraw (`colors.ts:299-322`, open-color, MIT, recopiée avec sa mention) et champ hexadécimal (validé par `tryParseColor`). Flèches, Entrée, Échap (le focus revient à la pastille). **S** ouvre le trait et **G** le fond (`App.tsx:5537-5562` du clone), hors champ de saisie. Pas de lettres q-w-e…, pas de pipette (H8). | Excalidraw | oui |
| 10 | Largeur du contour | 3 segments : Fin 2, Moyen 4 (défaut, = largeur des préréglages livrés), Épais 8. C'est le rapport 1:2:4 d'Excalidraw (`constants.ts:486-497`). Une largeur hors des trois (préréglage du profil) n'enfonce aucun segment. | Excalidraw ; `toolbar-profiles.ts:136` | oui |
| 11 | Style du trait | Plein (défaut) · Tirets · Pointillés, pour les formes (rectangle, ellipse, ligne, flèche). Le trait du stylo est un contour rempli (`ink/outline.rs`), comme `freedraw`, qui n'a pas cette option (`comparisons.ts:42-51`). Motifs, avec `w` la largeur : tirets `[max(8, 2w), 8 + w]`, pointillés `[0, 6 + w]` avec bouts ronds (d'après `shape.ts:172-174`) ; réglés à la porte visuelle. | Excalidraw ; code | oui |
| 12 | Style de tracé et graine | Architecte (0, **défaut, « net »**) · Artiste (1) · Caricaturiste (2), pour les formes. 0 garde le rendu natif actuel, au pixel près. 1 et 2 passent par roughjs (décision 13). **Graine** : un champ `seed` (entier 32 bits) est écrit seulement quand `roughness` > 0. Il est tiré au début du geste et sert à l'aperçu **et** à l'objet posé : le tracé ne saute pas au relâché. `SetStyle` qui change `roughness` tire une graine neuve (`actionProperties.tsx:783`). Sans `seed` lisible (fichier écrit à la main ou par la CLI), la graine est `seedOf(id)` (FNV-1a), stable. | canal (« net par défaut ») ; `shape.ts:176-246` ; mineure de la contre-relecture | oui |
| 13 | roughjs ou rendu maison | **roughjs 4.6.x ajouté** (MIT, environ 9 Ko gzip, JS, hors Wasm). On utilise seulement `rough.generator()`, sans DOM, et ses opérations (`move`, `bcurveTo`, `lineTo`) sont rejouées sur le contexte. Cela sert la scène, les miniatures et l'export PDF vectoriel (`record-ctx.ts:46,195` sait les Béziers). Une copie maison ne rendrait pas le trait d'Excalidraw. Poids mesuré à la tâche, ligne `THIRD_PARTY_NOTICES.md`. | brief ; licence MIT | oui (DA-3) |
| 14 | Angles | Droits · Arrondis, **rectangle seulement** (notre ligne n'a que deux points, l'ellipse n'a pas d'angle, nous n'avons pas de losange ; images : hors périmètre, § 7). Rayon adaptatif d'Excalidraw `min(0,25 × min(w, h), 32)` (`element/src/utils.ts:528-548`), en courbes de Bézier (jamais `roundRect`, que `record-ctx` n'enregistre pas). **Défaut de l'outil : Droits** (H1). | Excalidraw ; `record-ctx.ts` | oui |
| 15 | Transparence | Curseur 0-100 par pas de 10 (`actionProperties.tsx:964-1004`), `<input type="range">` haut de 44 px, pour le trait du stylo, les formes, le texte et les images (H9). Écriture au **relâché** (`change`) : une étape par geste ; au clavier, une par touche. Le cœur **arrondit** une valeur non entière (CLI) à l'entier le plus proche et **refuse** hors de [0, 100] (`BadStyle`, code 1) ; 100 retire le champ. | Excalidraw ; brief ; mineure | oui |
| 16 | Remplissage (lot 2) | Hachures · Hachures croisées · Plein (défaut), visible seulement si le fond n'est pas transparent (`shapeActionPredicates.ts:130-139`). Rectangle et ellipse, hachures par roughjs. | Excalidraw | oui |
| 17 | Pointes de flèche (lot 2) | Flèche seulement : début et fin parmi Aucune · Flèche · Triangle · Triangle creux (`actionProperties.tsx:1855+`). Défaut : début Aucune, fin Flèche (rendu actuel). Le triangle reprend les ailes (`shape.rs:52` `arrow_wings`) : collision inchangée. | Excalidraw | oui |
| 18 | Type de flèche | Droite · Courbe · Coudée : **sans objet** (deux points, `shape.rs:1-3`). Hors périmètre. | code | oui |
| 19 | Texte (lot 2) | Police : Normale (défaut), Georgia, Courier New (H4). Taille : `TEXT_SIZES` 24/36/48/72 (`text-layout.ts:10`). Alignement : Gauche (défaut) · Centre · Droite (champ `textAlign`). Police et taille sur tout le texte par `FormatText` (plage entière, attributs `font` et `size`, `rich_text.rs:22,61`). **En saisie** (arbitrage 5), Police, Taille et Trait du panneau sont **grisés** : `FormatRow` gouverne la plage. Règle de couleur : le Trait du panneau règle la couleur de l'élément (`color`) ; une couleur de plage posée par `FormatRow` l'emporte sur ses lettres ; hors saisie, sur un texte sélectionné, le Trait n'efface pas ces couleurs de plage. Alignement et Transparence restent actifs en saisie, avec des boutons qui empêchent `pointerdown` (`FormatRow.tsx:51`). | Excalidraw ; arbitrage 5 | oui |
| 20 | Disposition (lot 2) | Arrière-plan · Reculer · Avancer · Premier plan ; raccourcis d'OG4 : Ctrl+Maj+↓ · Ctrl+↓ · Ctrl+↑ · Ctrl+Maj+↑ (`personnalisation-1a-cadrage.md:82-86`). Avant la tâche, `git fetch` : si OG4 est fusionné, **on réutilise ses commandes**. Sinon on écrit une **commande d'ordre minimale et autonome sur `main`** (DA-2), et le conflit est noté pour le bloc final. | brief, mot pour mot (« sinon écris les boutons sur une commande d'ordre minimale seulement si aucune n'existe ») ; arbitrage 2 | oui |
| 21 | Actions | **Dupliquer** (Ctrl+D) : `engine.insertFragment(doc.extract(page, sélection), 10, 10)` (`engine.ts:118,633-636`, `core/api.ts:382-384`). Une étape ; la copie devient la sélection ; décalage +10/+10 comme `actionDuplicateSelection.tsx:77-78` ; le presse-papiers n'est pas touché. Pas de commande neuve dans le cœur. Dans la CLI, rien de neuf : `import` d'un `.rbitem` passe déjà par `insertFragment` (`apps/cli/src/fragment-view.ts:37`). **Supprimer** (Suppr, Retour arrière) : le code de `engine.ts:627`, extrait en `Engine.deleteSelection()`. **Lien** au lot 2. | Excalidraw ; arbitrage 6 ; code lu | oui |
| 22 | Valeurs mixtes | `formValue(targets, read, current)`, copie de `getFormValue` (`actionProperties.tsx:230-272`). On garde les éléments qui ont la propriété ; valeur commune, sinon `null` (mixte). Sans sélection : le style courant. Affichage : aucun segment enfoncé et `data-mixed` sur la section. Pastille mixte barrée (`ColorPicker.tsx:309`). Le curseur affiche « Mixte » jusqu'au premier geste. | Excalidraw | oui |
| 23 | Ce qu'un changement écrit, persistance | Comme Excalidraw (`changeProperty`, `actionProperties.tsx:119-148`), un choix écrit **les éléments ciblés et le style courant**, commun à tous les outils (`currentItem*`, cf. le style unique du moteur, `engine.ts:244`). Un préréglage du profil règle couleur et largeur sans changer le reste (`toolbar-host.ts:109-120`). Le pot garde sa couleur propre (PC6). **Le style courant est gardé sur l'appareil**, comme Excalidraw garde `currentItem*` avec son `appState` local. Clé `roomboard.style-courant` dans `DeviceSettings` (`itemStyle()`, `setItemStyle()`), relue au démarrage ; une valeur illisible donne le défaut. | Excalidraw ; mineure | oui |
| 24 | Champs du document | Scalaires facultatifs du `Y.Map` de l'élément (U3 ; jamais `Any::Map`, D25), noms d'Excalidraw. Lot 1 : `strokeStyle` (`"dashed"`, `"dotted"`), `roughness` (1, 2), `seed` (avec `roughness`), `roundness` (`"round"`), `opacity` (entier 0-90). Lot 2 : `fillStyle` (`"hachure"`, `"cross-hatch"`), `startArrowhead` et `endArrowhead` (`"none"`, `"arrow"`, `"triangle"`, `"triangle_outline"`), `textAlign` (`"center"`, `"right"`), `link`. **Absent = neutre**, donc un fichier ancien est lu à l'identique. Une valeur illisible est lue comme neutre et gardée telle quelle. | U3 (`usage-cadrage.md:56`) ; `element.rs:305-313` | oui |
| 25 | Commande de style | `SetStyle { ids, patch }`. Le patch porte des champs facultatifs : couleur, largeur, intérieur `fill` (rectangle, ellipse), et ceux de la décision 24. Chaque champ ne s'applique qu'aux éléments qui l'admettent (DA-1). Une valeur neutre **retire** le champ. Rien ne change : aucune étape (D38). Une valeur hors domaine : `BadStyle`, rien n'est écrit. **L'écriture « poser ou retirer une clé, sans étape si rien ne change » de `Fill` (`fill.rs:112-130`) devient une aide commune** (`set_or_remove`), appelée par `cmd_fill` et `cmd_set_style`. | D38 ; `fill.rs:63-135` ; mineure | oui |
| 26 | Création, gomme partielle | `AddShape`, `CommitStroke` et `SetText` (nouvelle boîte) reçoivent `look`, facultatif, écrit dans **la même transaction** (`history.rs:3` : une transaction = une étape). Côté TS, `look` est omis s'il est neutre, donc `shape.test.ts:54` reste vert. Côté Rust, `look: Look::default()` est ajouté aux 48 constructions de test. **La gomme partielle recopie `look` sur les morceaux**, comme elle recopie `group` (`commands.rs:1286-1296`, `:1318`) ; test `erase_partial_keeps_look`. | `history.rs:1-5` ; arbitrage 4 | oui |
| 27 | Rendu | La scène, les miniatures et l'export sont peints par **Canvas 2D seul** (`webgl2.ts:1-6`, `select.ts:66`, `main.ts:171,378`, `pdf-overlay-vector.ts:84`). Dans `canvas2d.ts` (`traceShape :225`, `paintShape :243`, aperçu `:559-563`) : tirets, `globalAlpha`, angles en Bézier, roughjs ; puis au lot 2 hachures, pointes et alignement. Couche vive (WebGL2 et Canvas 2D) : l'opacité du trait en cours est l'opacité CSS du canvas d'interaction, sans double alpha aux jointures. | code lu | oui |
| 28 | Exports | L'export PDF (PNG ou vectoriel `record-ctx`, qui sait déjà les tirets, l'alpha et les Béziers, `record-ctx.ts:110-221`) suit les options du lot 1 ; un test vectoriel le vérifie. Lot 2 : police et alignement du texte dans le PDF **au mieux**, par le même rendu (Georgia ou Courier New absentes de la machine qui exporte : police de repli). Le résultat est consigné au rapport de tâche, sans critère bloquant. `.rbitem` garde tout (`copy.rs:1-5`). `.iwb` et `.ubz` perdent les options neuves (H10). | code ; mineure | oui |
| 29 | CLI (D15) | `COMMAND_TYPES` reçoit `SetStyle` (lot 1) et la commande d'ordre (lot 2) (`apps/cli/src/ops.ts:11`). Tests `ops.test.ts`. Bloc `personnalisation-2` dans `scripts/essais/cli-essai.mjs` : `SetStyle` puis `undo` (une étape chacun) ; `opacity: 150` refusé (code 1) ; `opacity: 44.6` lu 45 ; `state` montre les champs. Ligne `.roomboard` de `FORMAT_LOTS` (`formats.ts:59`) : note « options d'aspect (strokeStyle, roughness, roundness, opacity) », complétée au lot 2. | profil § CLI | oui |
| 30 | Taille Wasm | Estimation au lot 1 : +10 à +20 Ko pour le module principal (`Look`, `SetStyle`, validations) ; au lot 2 : +5 à +10 Ko. `formats` : +0 à +10 Ko. Marges : 197 283 o et 351 217 o. roughjs n'entre pas dans le Wasm. Mesure à chaque tâche du cœur ; plafonds inchangés. | état (tailles à 45484db) | oui |
| 31 | Menu ☰ : entrées et ordre | Le menu reste la barre de rôle `menu` du profil (U12, `toolbar-profiles.ts:51`). Lot 1 : Nouveau Ctrl+N · Ouvrir Ctrl+O · Importer · Enregistrer Ctrl+S · Enregistrer sous Ctrl+Maj+S · ─ · Insérer des pages… · Exporter en PDF… · copie .iwb… · copie .ubz… · Modifier dans l'application d'origine · ─ · Grille · Réglages (nos « Préférences ») · **Profil** (`profiles`, neuf dans le menu). Lot 2 : Ctrl+Maj+E sur Exporter en PDF, et, avant Grille, **Aide** `?` et **Effacer la page**. | Excalidraw `LayerUI.tsx:118-142` ; code | oui |
| 32 | Menu ☰ : raccourcis affichés | Le raccourci est affiché à droite de chaque ligne (`[data-shortcut]`, gris AA). Il vient d'**une seule table** `SHORTCUTS` (DA-6). On écrit Ctrl, Maj, Alt ; ⌘ et ⇧ sous macOS. Masqués sous 600 px de large (`DropdownMenuItemContent.tsx:28`). | Excalidraw ; brief | oui |
| 33 | Menu ☰ : comportement | Celui de `MenuBar.tsx` est **gardé**. Il est déjà celui d'Excalidraw : bouton, fermeture au `pointerdown` extérieur, à Échap et après un choix, flèches, Début, Fin. Ajout : Tab ferme sans reprendre le focus. Écart gardé : Échap rend le focus au bouton ☰ (Excalidraw le perd, `DropdownMenuContent.tsx:170`). Pas de sous-menu. | `MenuBar.tsx:10-16,86-121` | oui |
| 34 | Entrées d'Excalidraw sans objet | Écartées, avec leur raison : Excalidraw+, GitHub, réseaux, Discord, connexion (brief) · Collaboration (pas de temps réel) · Palette de commandes (absente) · Rechercher sur le canevas (aucune recherche dans la scène) · Thème (aucun thème sombre) · Langue (français seul) · Arrière-plan du canevas (c'est le fond de page, OG5) · Enregistrer comme image (pas d'export PNG) · Préférences en sous-menu (Réglages est un panneau). Aucune entrée morte. | brief ; grep sans résultat hors bibliothèque | oui |
| 35 | Aide (lot 2) | L'entrée et la touche `?` (hors champ) ouvrent le panneau passager « Aide — raccourcis » (`[data-panel="aide"]`), qui liste `SHORTCUTS` par groupe. Échap le ferme. | Excalidraw (`DefaultItems.tsx:205`) | oui |
| 36 | Effacer la page (lot 2) | `Delete` de tous les objets de la page montrée (une étape), après `shell.confirm` (« Effacer tout le contenu de la page ? Ctrl+Z le rétablit. »). Fond, grille et mode de page restent. Grisé sur une page vide. | Excalidraw « Effacer le canvas » ; `engine.ts:627` | oui |
| 37 | Icônes | Lucide (ISC) dans `ui/icons.ts`, avec la mention, trait 1,5, `viewBox` calée (charte § Icônes). Lot 1 : `copy-plus`, `trash-2`, `sliders-horizontal`, `chevron-left`, `chevron-right`. Icônes dessinées dans le même style : trait plein, trait en tirets, trait en pointillés, trois niveaux de tracé, angle droit, angle arrondi, transparent (pastille barrée). Lot 2 : `link`, `arrow-up-to-line`, `arrow-down-to-line`, `chevron-up`, `chevron-down`, `palette`, `circle-help`, `align-left`, `align-center`, `align-right`, plus trois remplissages et quatre pointes dessinés. Contrôle `scripts/tests/controle-icones.test.sh` et netteté § 10. | charte ; `design-cadrage.md:207-228` | oui |
| 38 | Lien (lot 2) | Champ `link` (http, https, mailto ; 2 048 caractères au plus). Ctrl+K ou bouton Lien sur un seul élément : un champ dans un popover, Entrée valide (une étape), vide retire. Un badge en haut à droite ; le toucher avec l'outil Sélection ouvre par `ShellPort.openLink` : `window.open(url, "_blank", "noopener")` en web, commande `open_link` de la coque (Rust, `roomboard-shell`, crate `open` ; règle C16, voir §9) (H5). | Excalidraw `actionLink.tsx:40-62` | oui |
| 39 | Raccourcis : liste et collisions | Liste en DA-6. Collisions vérifiées avec `keys.ts:25-35`, `controller.ts:74-83` et § 2 bis d'OG4 (Ctrl+M, Ctrl+Maj+D/P/L, PageUp/PageDown, Ctrl+↑/↓) : Ctrl+D (lot 1), puis Ctrl+Maj+E, Ctrl+K, S, G et `?` (lot 2) sont libres. Ctrl+D (favori du navigateur) est pris par `preventDefault`, comme chez Excalidraw. S, G et `?` ne valent que hors champ, sans modificateur et hors composition. | code lu ; cadrage OG4 | oui |
| 40 | Constats d'architecture | `toolbar-host.ts:45` (préréglages lus à la main au lieu de `presetsOf`) : **à fermer** au passage, la tâche du moteur réécrit `setTool`. `toolbar.ts:634` (`ACTION_REQUIRES`) : ne pas l'aggraver ; les actions neuves n'exigent aucune capacité. `rb.css:203` : les styles neufs passent par `--rb-btn-*`. `annotation-page.ts:35` (`viewOf`) : `itemStyle` ajouté avec son test. | `docs/architecture-constats.md:14,39,42,54` | oui |

## 3. Carte d'impact

La ligne « Surfaces d'impact » manque au profil. Les rubriques sont donc déduites du graphe et de la recherche texte.
Graphe : `~/.cache/graphes/roomboard/graphify-out/graph.json` (12 654 nœuds), interrogé une fois ; le reste vient de la
recherche texte et de la lecture (V).

### 3.1 Cœur Rust (`crates/roomboard-core`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/element.rs:23-27` `StrokeStyle`, `:305-320` `style_fields`/`read_style` | oui | `Look` (champs de la décision 24), lecture et écriture scalaires, `ElementView.look` | V |
| `src/element.rs:132-170` `ElementView` | oui | champ `look: Option<LookView>` (omis s'il est neutre) | V |
| `src/document.rs:355-390` vues `shape`, `text` | oui | lisent `look` | V |
| `src/commands.rs:30-160` `Command` | oui | `SetStyle` et `look` dans `AddShape`, `CommitStroke`, `SetText`, `CommandError::BadStyle` (lot 1) ; `Restack` d'OG4 réutilisée, sans `BadOrder` (lot 2, DA-2, bloc final) | V |
| `src/commands.rs:1286-1296,1318` gomme partielle (`Cut.group`) | oui | recopie aussi `look` sur les morceaux | V |
| `src/fill.rs:63-135` `cmd_fill` | oui | l'écriture « poser ou retirer » devient l'aide `set_or_remove`, partagée avec `SetStyle` | V |
| `src/commands.rs:893-894` écriture du style | oui | écrit aussi `look` | V |
| `src/shape.rs:50-66` `arrow_wings` | non (réutilisé) | les pointes triangle reprennent les ailes | V |
| `src/shape.rs:80-140` `shape_polygon` | non | collision inchangée (le rayon des angles reste dans la boîte ; les pointes dans les ailes) | V |
| `src/copy.rs:162-225` `extract`, `insert_fragment` | non (réutilisé) | Dupliquer passe par `extract` puis `insertFragment` côté page ; tous les champs, `look` compris, sont recopiés | V |
| `src/history.rs:1-25` | non | une transaction = une étape | V |
| `src/rich_text.rs:22,61` `Font`, `valid_font` | non (réutilisé) | police du panneau par `FormatText` | V |
| `src/query.rs`, `zone.rs`, `fill.rs` | non | ne lisent que la géométrie ; le pot ne lit pas `look` | S |
| `tests/compat_socle.rs`, `tests/scenarios.rs` | oui | `look: Look::default()` dans les constructions ; test « recharger garde les octets » avec `look` | S |
| `crates/roomboard-formats` (`board.rs`, `pdf.rs`) | non | `.iwb`/`.ubz` ignorent les champs neufs (H10) ; le PDF passe par la page | V |
| `crates/roomboard-wasm/src/lib.rs:1189,1972-1990` | oui | pont : `set_style`, `look` des créations (lot 1) ; `restack` (lot 2) | V |

### 3.2 API TS, pont, faux cœur (`apps/web/src/core`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `core/api.ts:23,54-67,188` `StrokeStyle`, `Command`, `ShapeData` | oui | types `Look`, `SetStyle`, `ElementView.look` (lot 1), `Restack` (lot 2) | V |
| `core/api.ts:382-384` `extract`, `insertFragment` | non (réutilisé) | Dupliquer | V |
| `core/wasm-core.ts:169-180` `toElementView` | oui | lit `look` | V |
| `core/fake-core.ts` | oui | miroir de `SetStyle`, de `look` et de la gomme partielle (et de `Restack` au lot 2), joué par le contrat | S |
| `core/shapes.ts` (`arrowWings`, `normalizeShape`) | non (réutilisé) | pointes | V |

### 3.3 Moteur et outils (`apps/web/src/engine`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `engine/engine.ts:28-95` `EngineState`, `:244` style, `:832-835` `setPenStyle` | oui | style courant étendu (`ItemStyle`) ; `setItemStyle(patch)` ; `state().itemStyle` | V |
| `engine/engine.ts:627` `Delete` | oui | extrait en `deleteSelection()` pour le bouton Supprimer | V |
| `engine/engine.ts:118,633-636` `insertFragment` | non (réutilisé) | Dupliquer (+10/+10) | V |
| `engine/tools/shape.ts:114` `AddShape` | oui | `look` du style courant | V |
| `engine/tools/text.ts`, stylo (`CommitStroke`) | oui | `look` (opacité, alignement) | S |
| `engine/input/keys.ts:25-35` `keyAction` | oui | Ctrl+D (lot 1) ; Ctrl+K, S, G, `?`, Ctrl+↑/↓, Ctrl+Maj+↑/↓ (lot 2) ; fichier déjà touché par OG4 T3 | V |
| `engine/text-layout.ts:9,24` `TEXT_FONT_FAMILY`, `textFont` | lot 2 | repli générique par police (`Georgia` → `serif`, `Courier New` → `monospace`) | V |
| `engine/rich-edit.ts` | non | `FormatRow` inchangée | V |

### 3.4 Rendu (`apps/web/src/engine/render`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `render/canvas2d.ts:225-255` `traceShape`, `paintShape` | oui | tirets, angles, roughjs, alpha (lot 1) ; pointes, hachures (lot 2) | V |
| `render/canvas2d.ts:260-290` texte | oui | alpha (lot 1) ; `textAlign` (lot 2) | V |
| `render/canvas2d.ts:465` éléments ; `:559-563` aperçu `o.shapes` | oui | `look` et la graine du geste dans l'aperçu (même tracé avant et après le relâché) | V |
| `render/canvas2d.ts:580-594` tirets de la sélection | non | cadres de sélection inchangés | V |
| `render/webgl2.ts:170-180` `u_color` | oui | opacité CSS du canvas d'interaction pendant un trait (aucun changement de shader) | V |
| `render/record-ctx.ts:110-221` | non (réutilisé) | sait déjà les tirets, l'alpha et les Béziers | V |
| `render/ink-trail.ts`, `trail-style.ts` | non | la queue garde sa couleur ; l'opacité est réglée sur le canvas | S |
| `render/select.ts:50-90` | non | choix du rendu inchangé | V |

### 3.5 Interface (`apps/web/src/ui`) et profils

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `ui/App.tsx:394` `presetsBarId`, `:438-470` montage | oui | monte `OptionsPanel` (lot 1) et le panneau Aide (lot 2, `Panel` reçoit `"help"`) | V |
| `ui/Toolbar.tsx:233` `SelectionRow` | non | reste dans la barre (arbitrage 3) | V |
| `ui/Toolbar.tsx:130-160` `PresetRow` | non | garde `data-preset` dans la barre (essais) | V |
| `ui/SelectionRow.tsx` | non | reste dans la barre ; OG4 T14 y ajoute deux boutons d'ordre (DA-2) | V |
| `ui/FormatRow.tsx` | non | garde son rôle | V |
| `ui/MenuBar.tsx:47-58` `Row` | oui | `[data-shortcut]` à droite ; Tab ferme | V |
| `ui/RadioChoices.tsx:31`, `ui/IconButton.tsx:102`, `ui/tooltip.ts` | oui (OG14 : `keepFocus`, `disabled`) | segments, boutons, infobulles ; le panneau garde le focus de la saisie | V |
| `ui/Island.tsx:36` `observeBox`, `ui/island-place.ts:31-84` | oui | place du panneau, à droite de `side-start` (OG4 change ce fichier) | V |
| `ui/icons.ts:14,97,112` | oui | icônes de la décision 37 | V |
| `ui/rb.css` | oui | `.rb-options` et ses sections, avec les jetons | V |
| `ui/OptionsPanel.tsx`, `ui/tool-options.ts`, `ui/shortcuts.ts`, `engine/render/sketch.ts` (lot 1) ; `ui/ColorPicker.tsx`, `ui/HelpPanel.tsx` (lot 2) | oui (neufs) | DA-1, DA-3, DA-6 | — |
| `toolbar.ts:99-140` `ACTION_TABLE` | lot 2 | `help`, `page-clear` | V |
| `toolbar-profiles.ts:51-70` `menuBar` | oui | Profil (lot 1) ; Aide, Effacer la page (lot 2) ; fichier chaud d'OG4 T2 | V |
| `app/toolbar-host.ts:12-31,61-103,109-120` | oui | `setTool` relu (constat `:45` fermé) ; `ACTIONS.help`, `ACTIONS["page-clear"]` (lot 2) | V |
| `app/workspace.ts:821-830` `selection` | non | inchangé | V |
| `platform/controller.ts:74-83` `fileCommandOf` | lot 2 | Ctrl+Maj+E → export PDF | V |
| `main.ts:420-427` keydown | oui | branche les raccourcis neufs (fichier chaud d'OG4 et d'OG5) | V |
| `device-settings.ts:55-65` `island`, `setIsland` | non (réutilisé) | repli du panneau, barre `"options"` | V |
| `device-settings.ts:55` `DeviceSettings` | oui | `itemStyle()`, `setItemStyle()`, clé `roomboard.style-courant` (décision 23) | V |
| `ui/ProfileEditor.tsx` | non | le panneau n'est pas une barre de profil | V |
| `app/annotation-page.ts:35` `viewOf` | oui | `itemStyle` projeté (constat `:35`, à ne pas aggraver : champ ajouté et testé) | V |

### 3.6 Export, CLI, coque

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `app/pdf-export.ts`, `app/pdf-overlay-vector.ts:84` | non | passent par `Canvas2DRenderer` ; test vectoriel neuf avec tirets et alpha | V |
| `app/thumbnail.ts` | non | même rendu | V |
| `app/board-io.ts` (.iwb/.ubz) | non | H10 | S |
| `apps/cli/src/ops.ts:11-19` `COMMAND_TYPES`, `ALL_COMMANDS` | oui | `SetStyle` (lot 1), `Restack` (lot 2) | V |
| `apps/cli/src/fragment-view.ts:37` `insertFragment` | non | rien de neuf pour Dupliquer (décision 21) | V |
| `apps/cli/src/formats.ts:59` `.roomboard` | oui | note des options d'aspect | V |
| `apps/cli/src/ops.test.ts`, `session.test.ts` | oui | `SetStyle` lu, refus | S |
| `scripts/essais/cli-essai.mjs` | oui | bloc `personnalisation-2` | V |
| `apps/desktop/src-tauri/src/main.rs` (`open_link`), `capabilities/default.json` (description), `crates/roomboard-shell/src/links.rs`, `apps/web/src/platform/{files,shell-web,host-tauri,mount}.ts` (`ShellPort.openLink`) | lot 2 | ouverture sûre du lien, sans plugin (H5, C16) | V (OG14) |

### 3.7 Tests et essais (une entrée non touchée est un test à garder vert)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `ui/Toolbar.test.tsx`, `ui/App.test.tsx` (assertions `data-selection-action`) | non | rangée Sélection inchangée : à garder verts | V |
| `ui/SelectionRow.test.tsx`, `FormatRow.test.tsx`, `MenuBar.test.tsx` | oui (`MenuBar`) | raccourcis affichés, Tab ; les deux autres restent verts | V |
| `ui/rb-css.test.ts` | oui (OG14 : 2 tests de marges de segment) | à garder vert (littéraux figés) | V |
| `engine/tools/shape.test.ts:54` | non | `look` omis s'il est neutre : vert sans retouche | V |
| `engine/render/canvas2d.test.ts`, `webgl2.test.ts` | oui | tirets, alpha, angles, pointes, roughjs déterministe | V |
| `scripts/essais/c1-profils-navigateur.mjs:118,128,172`, `design-l3-navigateur.mjs:220` | non | comptent `data-preset` dans la barre : gardés | V |
| `scripts/essais/c3-groupes-navigateur.mjs:100-153`, `c5-image-navigateur.mjs:114,143` | non | rangée Sélection inchangée dans la barre | V |
| `scripts/essais/c6a`, `c6b`, `c8` (`data-preset`, `data-fill-none`) | non | rangée du pot inchangée | V |
| `scripts/essais/c7b-texte-riche`, `c10a-tableau` (`data-format`) | non | `FormatRow` inchangée | V |
| `scripts/essais/design-l2-navigateur.mjs`, `commun.mjs` (`data-menu-toggle`, `menuitem`) | oui (OG14 : `MENU_ROWS` reçoit `help`, `page-clear`) | menu : mêmes attributs, lignes en plus | V |
| `app/text-editor.ts`, `engine/render/renderer.ts` | oui (OG14) | la zone de saisie montre la police choisie ; le rendu dessine le badge de lien | V |
| `scripts/essais/c3-groupes:86-180`, `c15-3d:286`, `c13-tableaux:301`, `design-l1:43` (gestes à x 60-220) | **à vérifier** | le panneau déplié à gauche (x 16-276) couvre ces gestes avec un outil de dessin actif (voir effets de bord) | V |
| `scripts/tests/controle-icones.test.sh`, `controle-licences.test.sh`, `nettete.test.mjs` | oui | icônes neuves, roughjs, open-color | V |
| `scripts/essais/personnalisation-2-navigateur.mjs` | oui (neuf) | S1 à S5 (lot 1), S6 à S8 (lot 2) | — |

**Effets de bord sur l'existant**
- Le panneau déplié à gauche couvre la bande x ≈ 16-276 px. Les essais qui tracent près du bord gauche avec un outil de dessin
  (`c3-groupes:86-180` à x 170, `c13-tableaux:301` à x 200, `design-l1:43` à x 200, `c15-3d:286` à x 60) recevraient le geste
  sur le panneau. `commun.mjs` n'a pas d'amorce commune (`loadPlaywright`, `serve`, `clickItem`… : chaque essai ouvre sa
  page). Avec l'outil Tableau le panneau est masqué (décision 4) et, avec l'outil Sélection sans sélection, il ne garde que
  la section Actions. Remède (DA-4), seulement pour un essai qui échoue : `commun.mjs` gagne `foldOptions(page)`, qui pose la
  clé de repli avant `goto`, et l'essai l'appelle en une ligne d'amorce. C'est une retouche d'amorce, pas de fond. Tests :
  les quatre essais cités, rejoués en entier à la tâche d'intégration.
- La gomme partielle recopie `look` sur les morceaux, en plus de `group`. Test : `erase_partial_keeps_look` (cœur) et le
  même cas dans `fake-core.test.ts`.
- Le style courant est gardé sur l'appareil (aujourd'hui il est perdu au rechargement). Test : `device-settings.test.ts`
  « style courant relu », et S2.4.
- Les préréglages livrés ne changent pas, mais le menu livré gagne Profil (lot 1), puis Aide et Effacer la page (lot 2).
  Une copie de profil de l'utilisateur garde son ancien menu ; « Revenir à l'origine » donne le nouveau. Test : `toolbar-profiles.test.ts` « menu
  livré ».
- (lot 2) `textFont` ajoute un repli générique par police. Un texte sans `font` garde exactement la même chaîne. Test :
  `text-layout.test.ts` « police absente : chaîne inchangée ».
- L'opacité CSS du canvas d'interaction est remise à 1 à la fin de chaque trait et à l'aperçu de gomme. Test :
  `canvas2d.test.ts` et `webgl2.test.ts` « opacité du trait vif ».

**Chantiers en cours**
- **OG4, `feat/personnalisation-1a`** : cadrage et plan, `--T1`, `--T2` et `--T3` en cours (T3 a touché `engine/page.ts`,
  `camera.ts` et `input/keys.ts`). Fichiers communs prévus par son plan : `crates/roomboard-core/src/commands.rs` (T1, T13),
  `element.rs`, `document.rs`, `copy.rs` (T1), `crates/roomboard-wasm/src/lib.rs`, `core/api.ts`, `core/wasm-core.ts`,
  `core/fake-core.ts` (T4, T13), `apps/cli/src/ops.ts`, `ops.test.ts`, `formats.ts`, `scripts/essais/cli-essai.mjs` (T7,
  T13), `toolbar.ts`, `toolbar-profiles.ts` (T2), `ui/icons.ts`, `THIRD_PARTY_NOTICES.md`, `ui/item-state.ts`,
  `ui/Toolbar.tsx` (T6), `engine/engine.ts`, `app/toolbar-host.ts`, `main.ts` (T8, T14), `engine/input/keys.ts` (T3, T14),
  `render/canvas2d.ts`, `render/webgl2.ts` (T9), `ui/App.tsx`, `ui/rb.css` (T10), `ui/island-place.ts`, `ui/Island.tsx`
  (T5), `ui/SelectionRow.tsx` (T14 : boutons `layer-front`, `layer-back`), `scripts/essais/commun.mjs` (T11).
- **OG5, `feat/personnalisation-1b`** : cadrage seul. Fichiers cités : `commands.rs`, `element.rs`, `core/api.ts`,
  `wasm-core.ts`, `fake-core.ts`, `apps/cli/src/ops.ts`, `apps/cli/src/state.ts`, `main.ts`, `ui/rb.css`, `ui/icons.ts`,
  `ui/App.tsx`, `toolbar-profiles.ts`, `app/workspace.ts`.
- PR ouvertes : aucune (`gh pr list` vide). Autre machine : rien de donné par l'orchestrateur.

**Termes cherchés**
- Graphe : `graphify query "rangée contextuelle préréglages sélection panneau" --budget 800` (SelectionRow, `.selection()`,
  T4 de c1, T8 de c10a, T9 de c3, T13 de c5).
- Texte (code) : `data-selection-action`, `data-preset`, `data-format`, `data-menu-toggle`, `menuitem`, `data-fill-none`,
  `rb-presets|data-presets-sep` (scripts/essais, apps/web/src) ; `ctrlKey|metaKey|key ===|"Delete"|Backspace` ;
  `keydown` ; `key === "[a-zA-Z]"|"o"|=== "s"` ; `Rechercher|Réinitialiser|"Aide"|theme|thème|langue|locale` ;
  `setLineDash|globalAlpha|roundRect|arrowHead` (canvas2d) ; `setLineDash|globalAlpha|lineDash|alpha|bezierCurveTo|roundRect`
  (record-ctx) ; `kind === "shape"|.shape.shape|el.style|style.width` ; `pub fn` (copy.rs) ; `copySelection|pasteInternal|duplicate` ;
  `opener|openUrl|shell.open|openExternal` ; `@font-face|woff2` ; `font|align` (rich_text.rs, rich-edit.ts, text-layout.ts) ;
  `Command::AddShape {|Command::CommitStroke {` (crates) ; `COMMAND_TYPES` ; `FORMAT_LOTS` ; `presets` (toolbar-profiles.ts) ;
  `MENU_ROLE|menu` (toolbar-profiles.ts) ; `isMac|platform`.
- Excalidraw (clone) : `SelectedShapeActions`, `getShapeActionPredicates`, `getFormValue`, `reduceToCommonValue`,
  `changeProperty`, `actionZindex`, `actionDuplicateSelection`, `actionLink`, `COLOR_TOP_PICKS`, `DefaultItems`,
  `DropdownMenuContent`, `getCornerRadius`, `strokeLineDash`.
- Contre-relecture 1 : `insertFragment|extract` (apps/web/src/engine, core, apps/cli/src) ; `island(|setIsland` (device-settings.ts) ; `"group"` (commands.rs, gomme partielle) ; `map.insert|map.remove` (fill.rs) ; `export function` (scripts/essais/commun.mjs : aucune amorce commune).
- Coffre : « roomboard personnalisation panneau options outil excalidraw » (0291, 0294, L3 clos).
- Branches : `git diff --stat origin/main...feat/personnalisation-1a--T3`, plan et cadrage d'OG4 et d'OG5 lus par `git show`.

**Modules à réutiliser ou à étendre**

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| préréglages de l'outil (couleurs rapides) | `apps/web/src/toolbar.ts:200` `presetsOf` | `presetsOf(table, tool): readonly Preset[]` | réutiliser |
| segments d'options | `apps/web/src/ui/RadioChoices.tsx:31` | `RadioChoices<T>({ name, label, look: "segment", options, value, choose })` ; `value: T \| null` (mixte : aucun enfoncé) | étendre |
| boutons à icône, infobulle | `apps/web/src/ui/IconButton.tsx:102`, `ui/tooltip.ts` | `IconButton({ icon, label, attrs, onPress })` | réutiliser |
| menu ☰ | `apps/web/src/ui/MenuBar.tsx:47` `Row`, `:60` `MenuBar` | `Row` reçoit `shortcut: string \| null` ; Tab ferme | étendre |
| actions du menu | `apps/web/src/app/toolbar-host.ts:61` `ACTIONS` | `ACTIONS.help(t)`, `ACTIONS["page-clear"](t)` ; `HostTargets.toggle("help")` | étendre |
| raccourcis du moteur | `apps/web/src/engine/input/keys.ts:25` `keyAction` | `export type ObjectKey = "duplicate" \| "link" \| "stroke-picker" \| "fill-picker" \| "help"; export function objectKey(e: KeyLike): ObjectKey \| null` ; ordre : `orderKey` au contrat d'OG4 | étendre |
| raccourcis de fichier | `apps/web/src/platform/controller.ts:74` `fileCommandOf` | `FileCommand` reçoit `"exportPdf"` (Ctrl+Maj+E) | étendre |
| style courant du moteur | `apps/web/src/engine/engine.ts:154,832` `setPenStyle` | `setItemStyle(patch: Partial<ItemStyle>): void` (écrit sélection + courant) ; `setPenStyle` reste et appelle `setItemStyle` | étendre |
| supprimer la sélection | `apps/web/src/engine/engine.ts:627` | `Engine.deleteSelection(): boolean` (le code de la touche Suppr, extrait) | étendre |
| (lot 2) texte riche : police, taille sur tout le texte | `crates/roomboard-core/src/commands.rs:93` `FormatText` ; `engine/rich-edit.ts:11` `FormatAction` | `{ type: "FormatText", id, start: 0, len, attrs: [{ font }] \| [{ size }] }` | réutiliser |
| recopie d'éléments (Dupliquer) | `apps/web/src/engine/engine.ts:118,633` `insertFragment` ; `apps/web/src/core/api.ts:382` `extract` | `engine.insertFragment(doc.extract(page, sel), 10, 10)` → `Change.ids` = copies, posées en sélection | réutiliser |
| ordre des objets (lot 2) | rien dans `main` ; OG4 T13 (non fusionné) | si OG4 est fusionné, ses commandes ; sinon `Command::Restack { ids: Vec<String>, to: u32 }`, `CommandError::BadOrder`, `Engine.bringToFront/sendToBack/bringForward/sendBackward(): boolean` | nouveau module minimal (DA-2) ; termes : `order\|front\|back\|restack\|z_order\|move_to` (cœur, rien) |
| lecture et écriture scalaires d'un élément | `crates/roomboard-core/src/element.rs:308,316` `style_fields`, `read_style` | `look_fields(&Look) -> Vec<(&str, In)>`, `read_look(txn, e) -> Look` à côté | étendre |
| poser ou retirer une clé sans étape inutile | `crates/roomboard-core/src/fill.rs:112-130` (corps de `cmd_fill`) | `set_or_remove(map: &MapRef, txn: &mut TransactionMut, key: &str, v: Option<In>) -> bool`, appelée par `cmd_fill` et `cmd_set_style` | étendre (extraire) |
| recopie des champs d'un trait coupé (gomme) | `crates/roomboard-core/src/commands.rs:1286-1296,1318` (`Cut.group`) | `Cut.look: Look`, réécrit sur chaque morceau | étendre |
| pointes triangle | `crates/roomboard-core/src/shape.rs:52` `arrow_wings` ; `core/shapes.ts` `arrowWings` | inchangées | réutiliser |
| tracé des formes | `apps/web/src/engine/render/canvas2d.ts:225,243` `traceShape`, `paintShape` | `paintShape(ctx, s, style, look, seed)` ; `traceShape` gagne les angles | étendre |
| export vectoriel | `apps/web/src/engine/render/record-ctx.ts:190-221` | `setLineDash`, `globalAlpha`, `bezierCurveTo` | réutiliser |
| couleurs d'interface, analyse de couleur | `apps/web/src/engine/render/webgl2.ts:22` `tryParseColor` | validation du champ hexadécimal | réutiliser |
| repli par appareil | `apps/web/src/device-settings.ts:61-63` `island`, `setIsland` | `island(profileId, "options").collapsed`, `setIsland(profileId, "options", { at: null, collapsed })` | réutiliser |
| style courant gardé | `apps/web/src/device-settings.ts:55` `DeviceSettings` | `itemStyle(): ItemStyle \| null`, `setItemStyle(s: ItemStyle): boolean` (clé `roomboard.style-courant`) | étendre |
| place de l'îlot | `apps/web/src/ui/island-place.ts:63,82` `laneOf`, `placeIsland` | `placeOptions(area: Box, sideStart: Box \| null, tops: number): Point` | étendre |
| confirmation | `apps/web/src/ui/App.tsx` `props.shell.confirm` | `shell.confirm(message): Promise<boolean>` | réutiliser |
| sections par outil, valeurs mixtes | rien d'existant | `ui/tool-options.ts` (DA-1) | nouveau module ; termes : `getFormValue|mixed|mixte|commonValue|sections` (apps/web/src : rien) |
| table des raccourcis (menu, Aide) | rien d'existant | `ui/shortcuts.ts` (DA-6) | nouveau module ; termes : `shortcut|raccourci|SHORTCUTS` (apps/web/src/ui : rien) |
| rendu dessiné à la main | rien d'existant | `engine/render/sketch.ts` sur roughjs (DA-3) | nouveau module ; termes : `rough|sloppi|jitter|hachure` (apps/web : rien) |

## 4. Hypothèses à revoir

**Niveau 1 : difficiles à défaire ou visibles des utilisateurs**
- **H1** Angles : le défaut de l'outil est **Droits** (Excalidraw : Arrondis). Les rectangles d'aujourd'hui gardent leur
  aspect, et les essais qui lisent des pixels près des coins (pot, grille ; non vérifiés un à un) restent verts.
- **H2** Pas de panneau en annotation du bureau : la barre d'annotation garde ses rangées. Un îlot de 260 px couvrirait le
  bureau annoté.
- **H3** Un seul mode de panneau, déplié et repliable, sans le mode compact à pastilles d'Excalidraw pour tablette.
  À revoir après un essai sur iPad.
- **H4** (lot 2) Polices : Normale, Georgia, Courier New (présentes sous Windows, macOS et iOS ; repli `serif` et
  `monospace` ailleurs). Pas de police manuscrite livrée en fichier.
- **H5** (lot 2) Lien ouvert par la coque, limité à http, https et mailto. Tranché au bloc final (OG14) : pas de
  `tauri-plugin-opener` (règle C16), commande mince `open_link` et ouverture en Rust dans `roomboard-shell`.
- **H6** (lot 2) « Effacer la page » vide la page montrée seulement, après confirmation.
- **H7** Un choix fait sur une sélection devient aussi le style des prochains objets, comme chez Excalidraw (décision 23).
- **H16** Le style courant survit au redémarrage (décision 23) : un enseignant retrouve les tirets de la veille. Excalidraw
  fait de même.

**Niveau 2**
- **H8** (lot 2) Sélecteur sans pipette ni lettres q-w-e… ; flèches, Entrée et Échap seulement.
- **H9** Transparence absente pour les tableaux, les médias, les objets 3D et les zones du pot.
- **H10** Les exports `.iwb` et `.ubz` perdent les options neuves.
- **H11** Motifs des tirets et des pointillés, largeurs 2/4/8, décalage de Dupliquer +10/+10 : à régler à la porte visuelle.
- **H12** Curseur de transparence écrit au relâché, sans aperçu en direct pendant le glisser.
- **H13** (lot 2) Ctrl+Maj+E pour l'export PDF (raccourci « image » d'Excalidraw).
- **H14** Profil apparaît aussi dans le menu, en plus de l'îlot du haut à droite.
- **H15** Décision 1 contre D-DS7 (`design-cadrage.md:81`, « propriétés de l'outil dans un panneau à gauche » remplacées par
  la rangée de préréglages). Deux décisions de Jérôme de même rang : la plus récente (2026-11-27) l'emporte, et la rangée
  des préréglages reste. À revoir.
- **H17** (lot 2) Couleur du texte : le Trait du panneau n'efface pas les couleurs de plage posées par `FormatRow`
  (décision 19).

## 5. Décisions d'architecture

**DA-1 — `ui/tool-options.ts`, module pur des sections et des valeurs**
- Contexte : il faut décider quelles sections montrer (outil, sélection) et calculer les valeurs mixtes, comme Excalidraw le fait par prédicats et `getFormValue`.
- Décision : `export type OptionKey = "strokeColor" | "background" | "strokeWidth" | "strokeStyle" | "roughness" | "roundness" | "opacity" | "actions"` (lot 1 ; le lot 2 ajoute `"fillStyle" | "font" | "fontSize" | "textAlign" | "arrowheads" | "layers"`) ;
  `export function sectionsFor(tool: ToolChoice, targets: readonly ElementView[], editing: boolean): readonly OptionKey[]` ;
  `export function disabledIn(key: OptionKey, editing: boolean): boolean` ;
  `export function formValue<T>(targets: readonly ElementView[], read: (e: ElementView) => T | undefined, current: T): T | null`.
- Table : stylo → trait, largeur, transparence ; rectangle → trait, fond, largeur, style du trait, tracé, angles, transparence ; ellipse → idem sans angles ; ligne et flèche → trait, largeur, style du trait, tracé, transparence ; texte → trait, transparence (+ police, taille, alignement au lot 2) ; image → transparence ; tableau, média, 3D, zone, inconnu → rien de propre ; Actions dès qu'il y a une sélection.
- Conséquences : `OptionsPanel.tsx` ne fait que rendre. La table est testée seule ; une option ajoutée = une ligne.

**DA-2 — Commande d'ordre minimale, autonome sur `main` (lot 2)**
- Contexte : Disposition exige une commande d'ordre. `main` n'en a aucune. OG4 en prévoit une (`Restack`, T13, lot 2 d'OG4), qui s'appuie sur du code absent de `main` (`reinsert_kept`, `BadIndex`).
- Décision : au début de la tâche, `git fetch`. Si OG4 est fusionné, on réutilise ses commandes et ses méthodes du moteur. Sinon on écrit `Command::Restack { ids: Vec<String>, to: u32 }` (même nom, pour faciliter la fusion). Ses règles : bloc des ids d'une même page, ordre relatif gardé, `to` = rang du bas du bloc, ids gardés, une étape, même ordre sans étape. Une page mêlée, un rang hors bornes ou un id inconnu donnent `CommandError::BadOrder` (neuf ; aucun nom d'OG4 supposé), et l'aide locale reste privée à `cmd_restack`. Moteur : `bringToFront`, `sendToBack`, `bringForward`, `sendBackward` ; `orderKey` (Ctrl+↑/↓, Ctrl+Maj+↑/↓).
- Conséquences : le **conflit est noté au fichier d'état** pour le bloc final. Celui qui fusionne en second garde la commande de l'autre et retire la sienne. Les boutons `layer-front`/`layer-back` qu'OG4 met dans `SelectionRow` doublent Disposition ; on tranche au bloc final.
- Bloc final (OG14, 2026-11-27) : OG4 a fusionné en premier. Le lot 2 garde la `Restack { ids, to }` d'OG4 et ses erreurs (`MixedPages`, `BadIndex`, `UnknownElement`) ; `order.rs` et `BadOrder` sont retirés. Disposition appelle `reorder`, `bringToFront` et `sendToBack` d'OG4 ; un seul jeu de raccourcis (celui d'OG4) ; un seul tracé d'icône par sens. Raison : une seule implémentation d'ordre, qui tient compte des groupes. Le pont d'OG4 refuse désormais un rang non entier, comme le faisait celui du lot 2. Les boutons d'OG4 restent dans `SelectionRow` (décision 6 : le panneau ne retire rien des rangées).

**DA-3 — `engine/render/sketch.ts` sur roughjs, sans DOM**
- Contexte : les niveaux Artiste et Caricaturiste, puis les hachures au lot 2, doivent avoir le trait d'Excalidraw dans la scène, les miniatures et le PDF vectoriel.
- Décision : `export function sketchShape(ctx: CanvasRenderingContext2D, s: ShapeData, style: StrokeStyle, look: Look, seed: number): void` (`rough.generator()`, `roughness`, `seed`, `strokeLineDash`, et au lot 2 `fillStyle`, `hachureGap = 4w`, `fillWeight = w/2` comme `shape.ts:221-225`) ; `export function seedOf(id: string): number` (FNV-1a 32 bits, repli sans `seed`) ; `export function newSeed(): number`.
- Conséquences : l'Architecte avec un fond plein ne passe jamais par roughjs, et le rendu actuel est intact. La sortie est déterministe et testable sur `record-ctx`. L'aperçu et l'objet posé partagent la graine. +≈ 9 Ko gzip au JS de l'appli.

**DA-4 — Le panneau, îlot passager placé par `placeOptions`**
- Contexte : Excalidraw met le panneau à gauche, et OG4 met la barre latérale à `side-start` (gauche aussi). Des essais tracent près du bord gauche.
- Décision : `OptionsPanel` est monté par `App` hors des barres de profil. `placeOptions(area: Box, sideStart: Box | null, tops: number): Point` le pose à x = bord droit de `side-start` + 8 (ou 16 sans elle), sous les îlots du haut. Il est repliable (décision 2, `DeviceSettings.island(profil, "options")`). Un essai ancien qu'il gêne appelle `foldOptions(page)` de `commun.mjs`, qui pose l'état replié avant `goto`, en une ligne d'amorce ; l'essai neuf le laisse déplié.
- Conséquences : le schéma du profil ne change pas. Quand OG4 arrive, il suffit de passer la boîte de `side-start`. Les essais anciens ne sont pas réécrits sur le fond.

**DA-5 — Le style en une commande, la création en une transaction**
- Contexte : chaque changement coûte une étape, et un objet neuf aussi (`history.rs:3`).
- Décision : la struct `Look` du cœur porte les champs de la décision 24, tous `Option`, avec `Default`. `look_fields(&Look)` et `read_look(txn, e)` sont posés à côté de `style_fields` et `read_style` (`element.rs:308,316`). On ajoute `SetStyle { ids, patch: StylePatch }`, et `look` dans `AddShape`, `CommitStroke` et `SetText`. L'aide `set_or_remove(map, txn, key, Option<In>) -> bool` est sortie de `cmd_fill` (`fill.rs:112-130`) et partagée. La gomme partielle recopie `look` comme `group`.
- Conséquences : un seul point d'écriture de l'aspect, rejouable par la CLI. Les champs neutres sont retirés, donc un fichier sans option garde ses octets (test « recharger garde les octets » avec `look`). Dupliquer n'a pas de commande propre (décision 21).

**DA-6 — `ui/shortcuts.ts`, une seule table des raccourcis**
- Contexte : le menu affiche les raccourcis, l'Aide les liste (lot 2), et le brief exige un raccourci par geste.
- Décision : `export interface Shortcut { readonly id: string; readonly group: string; readonly label: string; readonly keys: string }` ; `export const SHORTCUTS: readonly Shortcut[]` ; `export function shortcutText(id: string, mac: boolean): string | null`.
- Lot 1 : Nouveau Ctrl+N · Ouvrir Ctrl+O · Enregistrer Ctrl+S · Enregistrer sous Ctrl+Maj+S · Annuler Ctrl+Z · Rétablir Ctrl+Y ou Ctrl+Maj+Z · Copier Ctrl+C · Couper Ctrl+X · Coller Ctrl+V · Grouper Ctrl+G · Dégrouper Ctrl+Maj+G · Dupliquer Ctrl+D · Supprimer Suppr · Désélectionner Échap · Déplacer la vue Espace + glisser · Gras, italique, souligné Ctrl+B, I, U (en saisie). Lot 2 : Exporter en PDF Ctrl+Maj+E · Premier plan Ctrl+Maj+↑ · Avancer Ctrl+↑ · Reculer Ctrl+↓ · Arrière-plan Ctrl+Maj+↓ · Couleur du trait S · Couleur de fond G · Aide ? · Lien Ctrl+K ; raccourcis de page d'OG4 quand il est fusionné.
- Conséquences : un test lie chaque `keys` à son reconnaisseur (`keyAction`, `fileCommandOf`, `objectKey`, `orderKey`), ce qui empêche un raccourci affiché qui ne marcherait pas.

## 6. Scénarios d'acceptation

Joués par Playwright (Chromium de la VM), au doigt (`page.touchscreen`, `hasTouch`) puis au clavier. Sélecteurs stables :
`[data-options]`, `[data-option="<OptionKey>"]`, `[data-option-value="<valeur>"]`, `[data-mixed]`, `[data-options-toggle]`,
`[data-menu-list] [data-item] [data-shortcut]`, `#stage[data-selection]` ; l'état du document est lu par l'API de la page,
comme dans les essais existants.

**Lot 1**
- **S1 — Rectangle réglé au doigt.**
  1. Toucher l'outil Rectangle : `[data-options]` est visible ; ses sections sont Trait, Arrière-plan, Largeur, Style du trait, Style de tracé, Angles, Transparence.
  2. Toucher Bleu (trait), Jaune (fond), Épais, Tirets, Artiste, Arrondis, puis régler la transparence à 50.
  3. Glisser un rectangle. Son élément porte `strokeStyle: "dashed"`, `roughness: 1`, `seed` (entier), `roundness: "round"`, `opacity: 50`, `width: 8` et `fill`. Pour le rendu : l'empreinte des pixels de sa boîte **diffère** de celle d'un rectangle posé aux mêmes coordonnées en Architecte, et l'aperçu juste avant le relâché a la **même** empreinte que l'objet posé (graine stable). On compare des empreintes, pas des positions de pixels.
  4. Ctrl+Z une fois : le rectangle disparaît.
  5. Le reposer, enregistrer, rouvrir : les champs sont là. `roomboard state` sur le fichier montre les mêmes champs.
- **S2 — Sélection mixte et style courant.**
  1. Poser deux rectangles, un noir et un rouge, et les sélectionner tous les deux (outil Sélection, cadre de sélection).
  2. La section Trait porte `[data-mixed]` et aucune pastille n'est enfoncée.
  3. Toucher Bleu : les deux sont bleus. Ctrl+Z : noir et rouge reviennent, en une étape.
  4. Choisir le **Stylo** : la pastille bleue est enfoncée (style courant). Toucher le préréglage « Rouge » de la barre : la pastille rouge s'enfonce et la transparence choisie avant reste. Tracer : le trait est rouge, avec cette transparence. Recharger la page : Stylo actif, la pastille rouge est enfoncée (style gardé sur l'appareil).
- **S3 — Dupliquer et supprimer.**
  1. Poser un rectangle et le sélectionner. Actions montre Dupliquer et Supprimer ; la barre garde sa rangée Sélection (`data-selection-action`).
  2. Dupliquer : 2 objets, la copie est sélectionnée et décalée de +10/+10, et le presse-papiers n'a pas changé (`canPaste` inchangé). Ctrl+Z : 1 objet. Ctrl+D : 2 objets.
  3. Supprimer : 1 objet.
  4. Outil Sélection, toucher le vide : le panneau est masqué.
  5. Outil Gomme partielle sur un rectangle en tirets : les morceaux restent en tirets (`strokeStyle`).
- **S4 — Menu ☰.**
  1. Toucher ☰. Les lignes sont, dans l'ordre : Nouveau, Ouvrir, Importer, Enregistrer, Enregistrer sous, Insérer des pages…, Exporter en PDF…, copie .iwb…, copie .ubz…, (Modifier dans l'application d'origine, selon la capacité), Grille, Réglages, Profil. Ouvrir porte `[data-shortcut]` « Ctrl+O ». Aucune ligne GitHub, Discord, thème, langue ou recherche.
  2. Toucher hors du menu : il se ferme. Au clavier (Tab jusqu'au bouton, Entrée), le focus va à la 1re ligne. Flèche bas deux fois, Échap : le menu se ferme et le focus revient au bouton ☰. Rouvrir, puis Tab : le menu se ferme.
- **S5 — Clavier et non-régression.**
  1. Outil Ellipse ; Tab jusqu'au panneau ; flèches dans « Style du trait » : Pointillés est choisi.
  2. Replier le panneau (`[data-options-toggle]`), recharger : il reste replié.
  3. Les essais `c1-profils`, `c3-groupes`, `c5-image`, `c6a-pot`, `c7b-texte-riche`, `c10a-tableau`, `c13-tableaux`, `c15-3d`, `design-l1`, `design-l2` et `design-l3` passent sans réécriture sur le fond.
  4. `node scripts/essais/cli-essai.mjs` affiche `CLI : OK` avec le bloc `personnalisation-2`. Les tailles Wasm restent sous leurs plafonds.

**Lot 2**
- **S6 — Disposition.**
  1. Poser un rectangle plein, puis une ellipse pleine qui le chevauche, et sélectionner le rectangle.
  2. Premier plan : au chevauchement, les pixels sont ceux du rectangle. Ctrl+Z : ceux de l'ellipse.
  3. Ctrl+Maj+↑ donne le même résultat ; Ctrl+↓ le recule d'un rang.
- **S7 — Texte.**
  1. Outil Texte : toucher Georgia, 48, Centre, puis taper « Bonjour ». L'élément porte `textAlign: "center"` ; ses segments portent `font: "Georgia"` et `size: 48`.
  2. En saisie, Police, Taille et Trait du panneau sont grisés (`disabled`), et `FormatRow` met « Bon » en gras.
  3. Toucher Droite dans le panneau garde le focus dans la zone de saisie et aligne le texte à droite.
- **S8 — Sélecteur, flèches, Aide, Effacer, Lien.**
  1. Sélecteur : `S` ouvre `[data-color-picker]` ; flèches, Entrée ; Échap rend le focus à la pastille.
  2. Flèche : début Triangle, fin Aucune ; ces champs sont écrits.
  3. Aide : `[data-panel="aide"]` liste Ctrl+D « Dupliquer » ; `?` le rouvre.
  4. Effacer la page : après confirmation la page est vide ; Ctrl+Z rend les objets.
  5. Lien : Ctrl+K, `https://example.org`, Entrée : un badge apparaît ; `javascript:alert(1)` est refusé.

## 7. Hors périmètre

- Mode de page, barre latérale, barre des pages, onglet Calques, ordre des objets au sens d'OG4 (sa version fait foi au bloc
  final, DA-2) : OG4 (`personnalisation-1a`). Fonds de page et « arrière-plan du canevas » : OG5 (`personnalisation-1b`).
- Angles arrondis des images (Excalidraw les permet) : il faudrait découper le rendu de l'image ; chapitre suivant.
- Type de flèche courbe ou coudée, flèches et lignes à plus de deux points, édition des points.
- Losange, note adhésive, formes propres au fork du clone (`stickynote`, `autoshape`, `bucketfill`).
- Pression variable du stylo, fond d'un trait fermé, style du trait sur le stylo.
- Alignement vertical ; alignement et distribution de plusieurs objets (`AlignFieldset`).
- Police manuscrite livrée en fichier ; thème sombre ; autre langue ; recherche dans la scène ; palette de commandes ;
  collaboration ; export PNG.
- Menu contextuel au clic droit ou à l'appui long sur la scène.
- Raccourcis des outils à une lettre (V, R, O, L, A, T…) d'Excalidraw.
- Options neuves dans `.iwb` et `.ubz` (H10) ; lecture des options d'un fichier Excalidraw.
- Panneau en mode annotation du bureau (H2).
- Une commande de duplication dans le cœur ou la CLI (décision 21).

## 8. Portes immédiates

Aucune. roughjs et open-color sont sous MIT, sans service externe ni dépense. Lien n'ajoute aucun plugin : la coque ouvre l'URL en Rust (`roomboard-shell`, crate `open`), règle C16 (O29).

## 9. Choix tranchés seul au bloc final du lot 2 (OG14, 2026-11-27)

Jérôme n'était pas joignable pendant le tour ; chaque choix est réversible.
- Lien : badge dessiné en pixels d'écran hors de `paintElement`. Raison : il reste net à tout zoom et ne part pas à l'export.
- Lien : zone de toucher du badge de 44 px au doigt et au stylet, 24 px à la souris. Raison : ne pas gêner la poignée du coin.
- Lien : ouverture au relâché seulement ; un glisser rend le geste à l'outil Sélection. Raison : aucune URL ouverte par accident.
- Lien : aucun `https://` ajouté d'office ; une adresse sans schéma est refusée avec un message. Raison : pas d'URL devinée.
- Lien : `setLink` hors du style courant. Raison : le lien ne se recopie pas sur chaque nouvelle forme.
- Lien : `ShellPort.openLink` facultatif ; schémas `http`, `https`, `mailto` contrôlés dans l'interface, le cœur et les deux coques. Coque : commande mince `open_link`, ouverture en Rust dans `roomboard-shell` (crate `open`) ; aucun `tauri-plugin-opener`, règle C16 (O29) prouvée par `coque_c16.rs`.
- Texte : Police et Taille choisies sans texte deviennent le style du prochain texte (comme `currentItemFontFamily` d'Excalidraw) ; style de l'outil Texte séparé de celui du Tableau. Raison : S7.1, sans effet sur les tableaux.
- Panneau : ses boutons gardent le focus de la saisie (`keepFocus`). Raison : S7.3, aligner sans quitter la saisie.
- Sélecteur de couleur : ancré à droite du panneau d'options, jamais au-dessus de son haut ; la grille défile si la fenêtre est trop basse. Raison : ne recouvrir ni le panneau ni l'îlot d'outils ; cibles de 44 px gardées.
- Panneau d'options caché tant qu'un panneau passager (Aide, Grille, Réglages, Profils, Image, Bibliothèque, Fonds) est ouvert. Raison : ils occupent la même place ; aucun recouvrement partiel.
- Choix de Police : libellé sur deux lignes si besoin, marges de 8 px, texte à 14 px de la charte.
- Bouton « + » au lieu de `palette` (déc. 37) pour ouvrir le sélecteur. Raison : geste d'Excalidraw (« plus de couleurs ») et icône plus lisible à 44 px.
- Grille du sélecteur 15 × 5 : open-color d'Excalidraw complété d'une rangée neutre, d'indigo et de lime, sans couleur en double. Raison : cinq nuances par teinte, une seule case enfoncée.
- Champ hexadécimal : il ne valide qu'à Entrée ; perdre le focus remet la couleur courante, sans rien choisir ni fermer (comme `ColorInput.tsx` d'Excalidraw).
- Police ou Taille sur plusieurs textes : une seule étape d'annulation (`Engine.runAll`, regroupement côté moteur ; le cœur compte une étape par commande, et `version()` monte aussi à l'annulation, `document.rs:906`).
- Lien : bouton « Ouvrir le lien » dans l'éditeur quand un lien existe, pour ouvrir au clavier (Ctrl+K, Tab, Tab, Entrée) ; au doigt, bouton Lien du panneau puis « Ouvrir le lien ».
- Lien : caractères refusés en plus du schéma (blancs, guillemet, `<`, `>`, `\`, contrôles) dans le cœur, l'interface et la coque. Raison : la chaîne part telle quelle à `ShellExecuteExW`.
- Outil Formes : une ligne ne reçoit plus les pointes du style courant (décision 17, « Flèche seulement »).
- Lien en web : aucune alerte déduite du `null` de `window.open` (la norme le rend toujours avec `noopener`) ; seule une exception est un échec.
- Échap ferme d'abord la couche du dessus (menu, sélecteur, éditeur de lien), puis l'Aide.
