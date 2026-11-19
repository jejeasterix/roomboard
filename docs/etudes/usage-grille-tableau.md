# Étude — Éditeur de grille et créateur de tableau (RoomBoard)

Date : 2026-11-19. Statut : étude, aucune décision prise. Demande de Jérôme, mot pour mot : « l'éditeur de grille et un créateur de tableau seront indispensables ».

## Verdict

La grille est une propriété de page (comme ActivInspire et ActCraft), avec des niveaux superposés, un magnétisme et une grille enregistrable comme ressource. Le tableau est un objet composé à part, pas une grille : ActivInspire n'en a pas de vrai (vérifié dans son guide officiel), SMART Notebook en a un complet. L'ombrage révélable de SMART est l'idée d'enseignement à reprendre. Le tableau dépend du texte riche du lot 4 du socle ; la grille ne dépend que de la page et du moteur de rendu.

---

## 1. Sources

### Lues (vérifié)

- Cadrage du socle : `/home/adminjd/projets/roomboard-wt/usage/docs/plans/socle-cadrage.md` : D2 (page = `Y.Map` {id, width, height, background, elements}), D4 (coordonnées monde, `transform` affine), D13 (formes), D14 (texte simple : `Y.Text`, une police, 4 tailles, pas de texte riche), D15 (sélection), D19 (deux canvas, `Path2D` en cache), D11 (annuler), § 7 (hors périmètre : imports Word et Excel, images, rotation).
- Code : `crates/roomboard-core/src/element.rs` (`PageView` : `background` seulement, aucune grille ; `Transform`), `commands.rs`, `document.rs`. Aucun champ de grille, aucun type tableau, aucun groupe dans le socle.
- Guide ActivInspire (Promethean, avril 2023), https://learn.prometheanworld.com/wp-content/uploads/2023/03/Getting-Started-with-ActivInspire_April23.pdf : section « Grids » (p. 37) : grilles dans Shared Resources > Grids, glisser sur la page ; « To customize a Grid, right-click on any blank area of your flipchart page and select Grid Designer. You can also go to Edit and click Grid. Modify your Grid's scale, color, and more. Grid settings change in real time » ; « Hide Grid » au clic droit. Le mot « table » n'apparaît qu'à la table des matières dans ce guide (texte extrait par `pdftotext`, 125 pages).
- Notes de formation d'un lycée (Wallingford School, 2011, 4 pages) : https://vle.wallingfordschool.com/mod/resource/view.php?id=54 : le Grid Designer s'ouvre depuis la propriété « Grid » d'un objet-page ; « The grid sits behind objects on the Background layer, though in front of a background colour or image. It can be saved to the Resource Library the same way backgrounds can (right-click on the page, select Add to Resource Library > Add Grid to Resource Library) » ; « Allow Snap » ; la propriété Page « Frames Across / Frames Down » divise la page en cadres : « purely cosmetic, but can be useful for creating a simple table ».
- Recherche web : le Grid Designer a trois zones (réglages d'accrochage et d'échelle, gestion des niveaux, options de motif et de couleur par niveau, d'après un guide de formation) ; la fiche produit liste « Grid Designer » et « Snap Object to Grid » (https://cdn-docs.av-iq.com/dataSheet/ActivInspire_Datasheet.pdf, colonnes non confirmées).
- SMART Notebook, tableaux : https://support.smarttech.com/docs/software/notebook/notebook-16/en/using/learning-the-basics/creating-and-working-with-tables.cshtml ; ombrages : https://support.smarttech.com/docs/software/notebook/notebook-22/en/deliver-lessons/using-the-screen-shade-tool.cshtml et http://onlinehelp.smarttech.com/english/mac/help/notebook/10_0_0/NBCellShades.htm.
- ActCraft (lecture seule), `/home/adminjd/projets/actcraft` : `core/include/actcraft/core/model.h:521-565` (modèle `Grid`) ; `core/src/gridsnap.cpp:176-236` (`nearestGridPoint`, `snapAnchor`, `snapDelta`) ; `core/include/actcraft/core/pagesettings.h:12-37` (`SetGridCommand`, `kMergeGrid`, `gridDrawsUnderObjects/Above`) ; `docs/plans/2026-10-18-livraison-complete-lot4-PLAN.md` (D6 accrochage, D17 couche de la grille, F-620 à F-623, lignes 721-760) ; `docs/verifications/2026-10-18-lot10-principes.md` (P3 : « ligne d'un pixel d'écran à tout zoom, jamais lissée » ; P7 : grille devant les objets possible).

### Non obtenus

- Le texte exact des écrans du Grid Designer (aucune capture ni aide officielle détaillée récupérée) : le détail ci-dessous vient des notes de formation, du guide et d'ActCraft, qui a relevé l'original. Aucun fichier d'exemple téléchargé pour cette étude.
- Le comportement des tableaux collés depuis Excel ou Word dans SMART : mentionné seulement en introduction de la page lue.

## 2. Ce qu'a fait ActCraft (vérifié)

- **Grille = propriété de page** : `Page::grid` (`model.h:636`) de type `Grid` {`visible`, `snapEnabled`, `drawnAbove`, `previewZoom`, `baseZoom`, `zoomIncrement`, `levels[]`}.
- **Niveaux** (`model.h:539-553`) : `GridLevel` {`visible`, `snap`, `start` (origine), `spacingX/Y`, `color` ARGB, `pattern` (Normal, Diagonal45, Angle), `angle`, `line` (Points, Cross, Solid, Dotted, Dashed, BigDots), `linesAlongX/Y`, `unknownKeys`}. Une grille combine plusieurs niveaux (par exemple fin et gros carreaux). Dessin d'après le code Python de référence (`canvas/grid.py`, hors dépôt).
- **Magnétisme** : `nearestGridPoint` retient le point le plus proche parmi les niveaux qui accrochent (`level.snap`) et seulement si `snapEnabled` ; une grille invisible accroche quand même. `snapDelta` corrige le déplacement pour que l'ancrage du premier objet tombe sur l'intersection ; l'ancrage est la ligne de base d'un texte, sinon le coin bas gauche (`snapAnchor`).
- **Premier plan ou fond** : `drawnAbove` ; la couche `gridOverlay` se place entre l'encre et les surcouches (D17 du plan lot 4).
- **Une séance d'édition = une étape d'annulation** : `SetGridCommand` avec fusion (`kMergeGrid`).
- **Aucun tableau** dans ActCraft (recherche « tableau », « table » dans `docs/specs/` et `core/` : seulement des tableaux de documents, pas d'objet). Constat : ActCraft suit ActivInspire, qui n'en a pas.
- **Leçons** : (a) clés inconnues conservées par niveau, (b) ligne d'un pixel d'écran quel que soit le zoom, (c) grille enregistrable dans la bibliothèque, (d) l'ancrage d'un texte par sa ligne de base reste une question ouverte (amendement 1 du plan lot 4, D6).

## 3. Ce que font ActivInspire et SMART

### 3.1 Grille d'ActivInspire (vérifié sauf mention)

- Ouverture : clic droit sur la page > « Grid Designer », ou menu Edit > Grid (guide p. 37). Réglages en temps réel ; « Hide Grid » pour retirer.
- Grilles prêtes dans Shared Resources > Grids, glissées sur la page : **une grille est une ressource** (voir l'étude des ressources).
- Enregistrer la grille courante : « Add to Resource Library > Add Grid to Resource Library » (notes de formation).
- Couche : derrière les objets, devant la couleur ou l'image de fond (notes de formation). Au premier plan : option `drawnAbove` relevée par ActCraft (F-620), non vue dans les sources web : supposé pour l'original.
- Magnétisme : « Allow Snap » (page) et « snap » par niveau ; un bouton « Snap to Grid » dans le navigateur d'actions (notes de formation).
- Taille, couleur, niveaux, motifs, style de ligne : le guide dit « scale, color, and more » ; le détail (carré, diagonale, angle, points, croix, pointillés) vient du modèle d'ActCraft, qui l'a repris de l'original : **supposé fidèle**.
- Pas de grille isométrique, de portée musicale ni de Seyès prédéfinis dans nos sources ; les grilles Shared Resources en contiennent (liste des sous-dossiers non lue : supposé).

### 3.2 Tableau chez ActivInspire

Aucun objet « tableau » dans le guide officiel de 125 pages (vérifié par recherche de « table » : table des matières seule). Les enseignants utilisent « Frames Across / Frames Down » (division cosmétique de la page, sans cellules qui reçoivent des objets), la grille, des formes alignées, ou importent des tableaux comme images. Non vérifié dans le logiciel lui-même : l'absence est établie par le guide, pas par un essai de l'application.

### 3.3 Tableau de SMART Notebook (vérifié)

- **Création** : bouton Tableau avec grille de choix (8 x 8 par défaut) ; boîte « Insert Table » (lignes, colonnes, cellules carrées, mémorisation de la taille) ; **tableau dessiné au stylo puis « Recognize Table »** : le dessin est remplacé par un tableau.
- **Lignes, colonnes** : insertion (colonne à droite, ligne dessous), suppression ; « Delete Cells » supprime le contenu ; une cellule seule reliant deux parties ne peut être supprimée ; glisser une sélection de cellules crée un nouveau tableau.
- **Redimensionnement** : poignée du tableau ; bordures de lignes et colonnes ; « Make same height / width / size / cells square ».
- **Fusion, division** : « Merge Cells » (le contenu de la cellule en haut à gauche reste) ; division en lignes ou colonnes (contenu en haut à gauche).
- **Contenu de cellule** : **un seul objet par cellule** (grouper pour en mettre plusieurs) ; un texte agrandit la cellule, un autre objet se redimensionne pour entrer ; sortir un objet = le glisser hors du tableau.
- **Propriétés** : remplissage (aucun, uni, dégradé, motif, image) et transparence ; style de ligne pour tout le tableau seulement ; style de texte par tableau, colonne, ligne ou cellule.
- **Ombrage de cellule (« cell shade »)** : « Add Cell Shade » sur une cellule, « Add Table Shade » sur le tableau ; en présentation, l'ombrage se retire en touchant ; il faut le retirer avant de modifier la structure (redimensionner, insérer, fusionner). Le document d'aide dit qu'il n'y a pas de « cellule colorée » ordinaire : la couleur passe par Remplissage (page des tableaux), l'ombrage est un outil de présentation (page des ombrages).
- Collage depuis Excel ou Word : mentionné en introduction de la page, détails non lus (supposé : colle un tableau natif).

## 4. Proposition pour RoomBoard : la grille

### 4.1 Modèle de données

Option retenue : **propriété de la page**, dans le `Y.Map` de la page à côté de `background` (D2), jamais un élément de `elements` (elle ne se sélectionne pas, ne s'empile pas, ne se transforme pas). Champ `grid` : valeur absente = pas de grille.

```
grid: { visible, snap, above,          // above : au premier plan
        levels: [ { kind, spacing:[sx,sy], origin:[x,y], color, line, snap, visible } ] }
```

- Stocker en `Y.Map` de champs scalaires, pas en `Any::Map` (consigne du code : yrs encode un `Any::Map` dans un ordre non déterministe, contraire à D25, voir `element.rs`, commentaire sur `style_fields`). Les niveaux : `Y.Array` de `Y.Map`, ou un `Any::Array` de valeurs scalaires remplacé en bloc (un réglage de grille est un geste unique et rarement concurrent : l'écriture de tout le champ en dernier-gagnant est acceptable, à trancher).
- Types de niveau (`kind`) : `squares` (carreaux), `lines` (lignes horizontales, verticales), `dots` (points), `isometric` (triangulaire, 30 degrés), `music` (portée : 5 lignes, interportée, répétée), `seyes` (réglure française : carreaux de 8 mm, grands carreaux, marge rouge, lignes de 2 mm entre les interlignes : à mesurer sur un cahier réel avant de figer les proportions : supposé). `kind` inconnu : gardé et ignoré au rendu (même règle qu'ActCraft).
- Unités : unités de page (D4, 1 unité = 1 px CSS au zoom 100 %). Page 1920 x 1080 (D5) : espacement par défaut 40 (à choisir). Prévoir une échelle « millimètres » pour le Seyès : un champ `unit` ou un facteur page-vers-mm (le socle n'a pas d'échelle physique : question ouverte).
- Versions : champ facultatif ajouté au schéma 1 sans changer `schema` ; un lecteur du socle ignore le champ. Si on veut l'imposer, passer `schema` à 2 avec `format::migrate` (D24).

### 4.2 Magnétisme

- Fonction pure dans le cœur Rust, testable seule (D1) : `snap_point(grid, point) -> Option<Point>`, reprise de `nearestGridPoint` ; `snap_delta` pour un déplacement ; le niveau `squares` accroche aux intersections, `lines` à la ligne la plus proche, `dots` aux points, `isometric` aux sommets, `music` aux lignes, `seyes` aux lignes et carreaux (à trancher).
- Quel point de l'objet s'accroche : coin supérieur gauche, centre, ou point le plus proche d'une poignée. ActCraft : coin bas gauche, ligne de base du texte. Pour RoomBoard : le coin ou le centre le plus proche, au choix de l'élève (question ouverte).
- Dans l'interface : appelé pendant le glisser (aperçu côté page, D38 du socle) ; une seule commande `Transform` au relâché (D15). Maintien d'une touche (Alt) pour l'ignorer. Le tracé d'encre n'est pas aimanté par défaut (ce serait déformer l'écriture).

### 4.3 Rendu Canvas 2D

- Couche : sur le canvas de la scène fixe (D19), dessinée avant les éléments (fond) ou après (`above`). La grille du dessus ne doit pas se redessiner à chaque point d'encre : elle est sur la scène fixe, pas sur le canvas d'interaction.
- Netteté : ligne d'un pixel d'écran à tout zoom (principe P3 d'ActCraft) : largeur = 1 / (zoom x devicePixelRatio), décalage de 0,5 pixel physique. Grille de la page entière : ne dessiner que la zone visible (caméra de D17) ; au-dessous d'un seuil d'espacement en pixels écran (par exemple 4 px), sauter le niveau fin pour ne pas obtenir un aplat gris.
- Coût : un seul `Path2D` par niveau reconstruit au changement de grille ou de zoom ; **mesurer** avant d'optimiser (pas de mesure faite ici : supposé que c'est négligeable sur une page de 1920 x 1080).
- Export : la grille fait partie du rendu de la page (choix à décider : exportée par défaut ou non).

### 4.4 Éditeur de grille (interface)

Fenêtre ou panneau, aperçu en direct sur la page (comme ActivInspire) : type, espacement X et Y (lié ou non), couleur, épaisseur, style de ligne, niveaux (ajouter, supprimer, ordre), visible, magnétisme, premier plan / fond, origine (glisser la grille). Une séance = une étape d'annulation (fusion, comme `kMergeGrid`). Boutons : « Enregistrer comme ressource », « Retirer la grille ». Préréglages : carreaux, lignes, points, isométrique, portée, Seyès. Interface en SolidJS dans `apps/web/src/ui/` (D21), logique dans le cœur.

### 4.5 Grille comme ressource

Une grille enregistrée est un fragment (voir `usage-ressources.md`) de `kind: "grid"` : manifeste + `grid` en JSON, sans objets, avec une vignette. Glisser une grille sur la page = remplacer `grid` de la page (une commande). Les grilles livrées avec RoomBoard sont des ressources partagées (Seyès, portée, isométrique).

## 5. Proposition pour RoomBoard : le tableau

### 5.1 Un objet composé, pas une grille

Un tableau est un **élément** (`kind: "table"`) avec transformation affine (D4), déplaçable et sélectionnable comme une forme. Il n'est ni une grille de page (qui ne reçoit pas de contenu) ni un groupe de rectangles (impossible à fusionner ni à redimensionner proprement).

Modèle (Yrs, après le socle) :

```
table: { cols: Y.Array<Y.Map{id, width}>,
         rows: Y.Array<Y.Map{id, height}>,
         cells: Y.Map<"<rowId>:<colId>" -> Y.Map{ text: Y.Text, fill, shade, span:[rs,cs] | mergedInto, content: [objectId…] },
         style: { border, … } }
```

- Les lignes et colonnes ont des **identifiants stables** (D3) et non des indices : c'est ce qui rend l'insertion concurrente correcte (voir 5.4).
- Cellule de départ d'une fusion : `span` ; cellules couvertes : `mergedInto`. Une cellule fusionnée garde le contenu de la cellule en haut à gauche (règle SMART) ; ce qui est perdu à la fusion se retrouve par l'annulation (D11).
- Contenu d'une cellule : **texte riche** (`Y.Text` avec attributs de formatage : gras, couleur, taille ; dépendance au lot 4, D14 n'offre qu'« une police, une taille parmi 4, une couleur » : un `Y.Text` accepte des attributs, mais l'éditeur du socle est un `<textarea>` qui ne les produit pas) ; **objets** dans une cellule (image, forme, trait) : SMART limite à un objet par cellule. Proposition : cellule = texte + au plus un objet ancré (identifiant d'un élément enfant dont `transform` est relatif à la cellule), à trancher.
- **Ombrage révélable** (`shade`) : couleur ou masque opaque sur une cellule, une ligne, une colonne ou tout le tableau ; l'élève touche, l'ombrage tombe (écriture `shade = null`). Usage : réponses cachées, mémoire, tableaux à compléter. Règle SMART à reprendre : la structure ne se modifie pas tant qu'un ombrage est posé ; ou, plus simple, l'ombrage suit la cellule par son identifiant et rien n'est bloqué (à trancher). Distinction nette : `fill` (couleur permanente) et `shade` (couvre le contenu, se retire en présentation).
- Dimensions : `width` et `height` en unités de page ; le texte agrandit la hauteur de ligne (mesure au rendu, comme SMART) ou la cellule défile (à trancher).
- Tailles : `Make same height / width / square` : commandes de convenance.

### 5.2 Rendu et édition

- Rendu Canvas 2D (D19) : fond de cellule, texte (le texte du lot 4 est dessiné au canvas hors édition), bordures, ombrage ; `Path2D` en cache par tableau, invalidé par `Change` (D19). Texte mesuré par `measureText` : hauteur de ligne calculée côté TS, écrite dans le document comme taille minimale seulement si elle change.
- Édition d'une cellule : `<textarea>` ou zone éditable posée sur la cellule (comme D14 pour le texte simple), valider = une transaction. Navigation : Tab et flèches entre cellules ; Entrée = ligne suivante dans la cellule.
- Création : (1) bouton avec grille de choix 8 x 8 ; (2) boîte lignes et colonnes ; (3) **dessin au stylet puis reconnaissance** : tracer un rectangle puis des traits ; remarque : intéressant pour l'enseignant au tableau, mais coûteux ; à ranger en phase ultérieure.
- Menu contextuel : insérer ligne ou colonne avant ou après, supprimer, fusionner, diviser, uniformiser, ombrer, retirer l'ombrage, couleur de cellule.
- Redimensionnement : poignées sur les bordures de lignes et colonnes (D15 : 8 poignées pour l'objet entier, plus des poignées internes).

### 5.3 CRDT : insertion de ligne concurrente

- Si les lignes sont dans un `Y.Array` d'identifiants, deux insertions concurrentes de lignes donnent deux lignes (aucune perte), placées dans un ordre déterministe par Yrs ; les cellules vivent dans une `Y.Map` indexée par (ligne, colonne) : chaque ligne neuve a des cellules vides par défaut (valeur absente = cellule vide), donc **aucune cellule à créer** à l'insertion. Cet argument impose les identifiants stables : un indice de ligne serait invalidé par l'insertion distante.
- Suppression concurrente d'une ligne et édition d'une de ses cellules : l'édition porte sur une cellule dont la ligne est retirée ; la cellule orpheline est ignorée au rendu (nettoyée à l'enregistrement). Même règle pour une colonne.
- **Fusion** concurrente avec insertion : `span` exprime des plages d'identifiants ; une insertion à l'intérieur d'une fusion agrandit la fusion (ou la découpe) : cas difficile, à choisir (question ouverte). Par prudence, l'insertion dans une fusion est refusée à l'interface et gérée par une règle déterministe au merge.
- Le socle est mono-utilisateur par fenêtre (D27, synchronisation hors périmètre) : la conception reste compatible, la **réalisation** de la concurrence peut attendre. Ce qu'il faut figer maintenant : les identifiants stables et le fait que l'ordre est un `Y.Array`.

### 5.4 Import depuis Excel, Word, presse-papiers

- Hors périmètre du socle (§ 7). Voie la plus simple : coller du **HTML ou du texte tabulé** depuis Excel ou Word (le presse-papiers du navigateur fournit `text/html` avec un élément `<table>`, supposé non vérifié ici) : lecture du `<table>` en lignes, colonnes, fusions (`rowspan`, `colspan`), texte riche de base. Fichier `.xlsx` ou `.docx` : ZIP de XML, lisible dans le cœur avec la crate ZIP déjà en dépendance (D25) ; limiter à la première feuille, aux valeurs affichées, sans formules ni styles avancés (supposé).
- Export : tableau vers texte tabulé ou HTML au presse-papiers.

## 6. Ce qui marche sur iPad (web) / ce qui demande la coque

| fonction | iPad (web) | coque Tauri |
|---|---|---|
| grille, éditeur de grille, magnétisme | oui (tout dans le cœur et le Canvas) | oui |
| grille comme ressource (bibliothèque) | oui (OPFS, IndexedDB, supposé) | dossiers réels |
| tableau : création, édition, fusion, ombrage | oui | oui |
| édition de texte de cellule avec clavier virtuel de l'iPad | à essayer : un `<textarea>` posé sur le canvas pose des problèmes de défilement et de zoom sur Safari iOS (supposé) | WebView de la coque, autre moteur |
| coller un tableau depuis Excel ou Word | depuis le presse-papiers (autorisation et bouton « Coller » de Safari, supposé) | oui |
| ouvrir un `.xlsx` ou `.docx` | oui, par sélecteur de fichier et le cœur Wasm | oui, plus d'accès aux dossiers |
| reconnaissance de tableau dessiné | oui (calcul local) | oui |

## 7. Recommandation pour RoomBoard

Grille :

1. **Propriété de page à niveaux, comme ActivInspire et ActCraft, types prédéfinis, magnétisme en fonction pure du cœur, grille enregistrable comme ressource.** Recommandée.
2. Grille comme élément de la page : simple pour l'empilement mais ne se range pas avec la page, se sélectionne par erreur et pèse sur la sélection. Écartée.
3. Grille uniquement prédéfinie (fond de page), sans éditeur. Insuffisant : la demande dit « indispensable ».

Tableau :

1. **Élément composé avec lignes et colonnes à identifiants stables, cellules à `Y.Text`, fusion, ombrage révélable, après le lot 4.** Recommandé : c'est la base correcte pour le CRDT, l'import HTML et l'enseignement.
2. Tableau comme groupe de formes et de textes séparés : rapide à livrer sur le socle, mais fusion, redimensionnement et insertion de ligne deviennent des manipulations de dizaines d'éléments, avec des conflits concurrents ingérables. Écartée.
3. Tableau comme image importée (le contournement des utilisateurs d'ActivInspire) : sans valeur d'édition. Écartée.

Ordre proposé (hors socle) : (a) grille de page avec carreaux, lignes, points et magnétisme (peu de dépendances : modèle de page, rendu) ; (b) éditeur de grille et grilles en ressource (dépend de la bibliothèque) ; (c) grilles Seyès, portée, isométrique ; (d) tableau minimal : création, texte simple par cellule, insertion et suppression de lignes et colonnes ; (e) fusion, ombrage révélable ; (f) texte riche et objets dans les cellules ; (g) import par collage HTML ; (h) `.xlsx`, `.docx`, reconnaissance au stylet.

Dépendances au socle : sélection et transformation (D15, lot 4), formes (D13), texte (D14 : le tableau a besoin d'un texte riche et mesurable, le socle livre un texte simple), caméra (D17, pour la netteté de la grille), annuler (D11), table des capacités (D23) pour les écrans sans stylet.

## 8. Vérifié / supposé

**Vérifié** : modèle de grille, magnétisme et couche chez ActCraft (code lu) ; Grid Designer d'ActivInspire : ouverture, temps réel, ressource, couche, Allow Snap (guide et notes de formation) ; absence d'un objet tableau dans le guide ActivInspire de 125 pages ; fonctions de tableau de SMART Notebook 16 (insertion, fusion, division, redimensionnement, un objet par cellule, ombrage retiré avant modification) ; le socle ne contient ni grille, ni tableau, ni texte riche, ni groupe.

**Supposé** : liste complète des options du Grid Designer (relevée par ActCraft sur l'original) ; tableau absent d'ActivInspire dans l'application (non essayée) ; proportions du Seyès ; coût de rendu de la grille ; comportement de l'ombrage de cellule en présentation sur nos écrans ; collage de `<table>` HTML depuis Excel ou Word ; clavier virtuel de l'iPad sur un `<textarea>` ; fusion et insertion concurrentes d'un tableau Yrs (non éprouvées, pas de prototype).

## 9. Questions ouvertes

1. Quel point de l'objet s'accroche : coin, centre, point le plus proche ? Le texte s'accroche-t-il par sa ligne de base (question non tranchée chez ActCraft) ?
2. Le socle a-t-il besoin d'une échelle physique (millimètres) pour un Seyès exact ?
3. Schéma 1 étendu (champ facultatif) ou schéma 2 avec migration pour la grille et le tableau ?
4. Une cellule reçoit-elle un seul objet (SMART) ou plusieurs ? Le contenu est-il enfant du tableau (transformation relative) ?
5. L'ombrage bloque-t-il la structure, comme SMART, ou la structure reste libre ?
6. Fusion concurrente avec insertion : refuser, agrandir ou découper ?
7. Reconnaissance d'un tableau dessiné au stylet : dans la première version ou plus tard ?
8. Grille exportée dans le PDF et les images ? Par défaut oui ou non ?
9. Un groupe d'objets existe-t-il avant le tableau ? (le tableau aurait pu en bénéficier ; question commune avec l'étude des ressources).
