# Étude d'usage : édition de base d'une image et couleur de fond transparente

Date : 2026-11-19. Statut : étude, aucune décision prise, aucun code produit.

Demande de Jérôme, mot pour mot : « Les image doivent pouvoir bénéficier d'édition de bases et comme,activ inspire un mode permettant de rendre transparent une couleur de background. »

Étude sœur : `docs/etudes/usage-pot-de-peinture.md` (le remplissage d'image par tolérance partage le pipeline).

## Sources

Fichiers locaux lus :
- `docs/plans/socle-cadrage.md` : D2 (élément = `Y.Map` {id, kind, transform, style, données propres}), D4 (transformation affine, pas de rotation au socle), D19 (rendu Canvas 2D, `Path2D` en cache), D24 (conteneur ZIP, dossier `assets/` réservé, empreinte SHA-256, vide au socle), D25 (crate `zip` pure Rust), D10 (frontière Wasm à gros grain), D11 (annulation par `UndoManager`), D27 (aucune ressource réseau).
- `crates/roomboard-core/Cargo.toml` (dépendances actuelles : yrs, freedraw, zip, serde, serde_json) ; `crates/roomboard-core/src/element.rs` (aucun élément image aujourd'hui, seul `stroke`).
- `~/projets/actcraft` (lecture seule) : `render/src/imagefill.cpp` (flood fill avec tolérance), `core/include/actcraft/core/fill.h` (`makeImageFillCommand` : le résultat remplace la ressource, clé SHA-256), `core/include/actcraft/core/model.h` (`ImageObject` : rectangle, taille source, paramètres du motif), `docs/specs/2026-10-13-prototype-mesure-cadrage.md:33`.

Documentation ActivInspire (aide Studio exportée, `~/telechargements-roomboard/pot-de-peinture/guide-v1.pdf`, lue par `pdftotext`) : https://cdnsm5-ss18.sharpschool.com/UserFiles/Servers/Server_27405451/File/IT%20Online%20Forms/Premethean%20Boards%20Help/Activinspire-user-guide%20v1.pdf
- Propriétés « Miscellaneous » : `Transparent`, `Transparent Color`, `Pick Through`.
- Bibliothèque de ressources : « Toggle Transparency » (couleur de fond d'une image rendue transparente au glisser sur la page) ; préférence « Resource items retain transparency ».
- Préférence « Image fill tolerance » (0 à 100, défaut 5).

Guide pratique, fond d'une image : https://vle.wallingfordschool.com/mod/page/view.php?id=593

Bibliothèques (API crates.io relevée le 2026-11-19, fichiers dans `~/telechargements-roomboard/crates/`) : `image` 0.25.10 (MIT OR Apache-2.0), `fast_image_resize` 6.1.0 (MIT OR Apache-2.0), `imageproc` 0.27.0 (MIT), `photon-rs` 0.3.3 (Apache-2.0, dernière mise à jour 2025-05-10), `tiny-skia` 0.12.0 (BSD-3-Clause), `resvg` 0.50.0 (Apache-2.0 OR MIT).

## Vérifié

ActivInspire (aide Studio) :
- La transparence d'une image est une propriété d'objet à deux champs : `Transparent` (vrai/faux) et `Transparent Color` (une seule couleur, choisie à la pipette n'importe où à l'écran). Un seul interrupteur, une seule couleur, aucune tolérance affichée : l'aide ne parle pas de seuil pour cette propriété. Le guide pratique du lycée le confirme : « le résultat n'est pas parfait », des restes dentelés subsistent, et il conseille de réduire un peu l'image et d'homogénéiser le fond avec le pot de peinture avant.
- `Pick Through` : une zone transparente laisse passer le clic vers l'objet dessous. Détail d'usage à reprendre (sélection des objets derrière une image détourée).
- « Toggle Transparency » à l'insertion depuis la bibliothèque : le détourage est proposé dès l'import.
- La préférence « Resource items retain transparency » indique que la transparence est portée par l'objet, non cuite dans le fichier : c'est un traitement au rendu (non destructif).
- Dans l'aide lue, je n'ai trouvé ni rognage, ni retournement, ni luminosité/contraste : l'aide Studio exportée ne décrit pas d'« Image Editing » comme tel. Le recadrage passe sans doute par les poignées de l'objet (redimensionnement) ; non vérifié (question 1).

ActCraft (code lu) :
- L'image est un objet avec une ressource (octets) et un rectangle ; le remplissage d'une zone d'image produit un PNG et remplace la ressource (destructif, une étape d'annulation, ancienne ressource conservée dans le document).
- Le flood fill est 4-connexe, tolérance par canal RVB, alpha conservé.
- Aucun rognage ni réglage d'image dans ActCraft : le recadrage de la tâche n'y a pas de précédent.

Dans RoomBoard : aucun élément image n'existe ; `assets/` est « réservé, vide au socle » (D24) ; D4 reporte la rotation ; le rendu est du Canvas 2D (D19).

## Supposé

- Les chiffres de poids Wasm ci-dessous sont des ordres de grandeur issus de ma connaissance des crates, non mesurés ici : à mesurer par un `cargo build --target wasm32-unknown-unknown --release` et `wasm-opt` (question 4).
- Support d'`OffscreenCanvas`, de `createImageBitmap` avec `premultiplyAlpha`, de `ImageDecoder`, de WebP/AVIF/HEIC dans le Safari de l'iPad cible : de mémoire (support correct des trois premiers dans Safari 17 et plus), non vérifié sur l'appareil.
- L'étendue de ce qu'ActivInspire propose pour les images (sans doute rognage, retournement dans le menu contextuel ; non retrouvé dans l'aide lue).
- `photon-rs` fait des réglages (luminosité, contraste, teintes) en Wasm ; je ne l'ai pas utilisé.

## Fonctions visées

Retouches de base (liste proposée, à valider) :
1. Rogner (rectangle de découpe, ratio libre ou fixe).
2. Pivoter par quarts de tour ; rotation libre (dépend de D4 : la rotation d'élément est absente du socle).
3. Retourner horizontalement et verticalement.
4. Redimensionner : poignées (déjà prévues, D15) ; ré-échantillonnage de l'asset seulement pour alléger.
5. Luminosité et contraste ; éventuellement niveaux de gris, inversion.
6. Rendre transparente une couleur de fond, avec une tolérance (au-delà d'ActivInspire).
7. Pipette de la couleur à rendre transparente, sur l'image.
8. Rétablir l'original (grâce au non destructif).

La couleur transparente avec tolérance : pour chaque pixel, distance à la couleur cible (RVB, ou mieux CIELAB), alpha = 0 si distance ≤ tolérance, éventuellement dégradé d'alpha entre deux seuils (« plume ») pour adoucir les bords ; option « contiguë » (diffusion depuis les bords, comme le pot, pour ne pas trouer l'intérieur du dessin) ou « globale » (toutes les occurrences de la couleur). ActivInspire est global (propriété `Transparent Color`) ; le pot de peinture est contigu. Offrir les deux est utile : un blanc de fond contigu protège le blanc de l'œil d'un personnage.

## Où et comment : trois approches

### Non destructif : paramètres appliqués au rendu (recommandé)
L'élément image garde l'asset d'origine intact et porte des paramètres : `crop` [x, y, l, h] en pixels de l'asset, `flipX`, `flipY`, `quarterTurns`, `brightness`, `contrast`, `transparentColor` + `tolerance` + `soft` + `contiguous`. Au rendu :
- Rognage, retournement, quarts de tour, échelle : `drawImage` avec rectangle source et transformation (coût nul, Canvas 2D natif).
- Luminosité, contraste : `ctx.filter = "brightness(…) contrast(…)"` (Canvas 2D ; filtres supposés disponibles dans Safari iPad récent ; à vérifier) ou passage de pixels.
- Couleur transparente : un passage de pixels (`getImageData`/`putImageData` ou Wasm) qui produit un bitmap en cache, recalculé quand les paramètres changent ; pas de recalcul à chaque image de rendu. Ce bitmap est le même type de cache que le `Path2D` de D19.
Avantages : rétablissement de l'original, annulation par simple modification de propriété, fichier plus petit (un seul asset), synchronisation CRDT minimale (quelques champs de `Y.Map`). Inconvénients : le calcul de la couleur transparente se refait à l'ouverture (coût à l'ouverture d'une page avec beaucoup d'images détourées) ; le rendu de l'export (PDF, PNG) doit appliquer les mêmes paramètres : une seule implémentation du rendu d'image est nécessaire (comme D7 pour l'encre).
Le pot de peinture sur image (étude sœur) ne rentre pas dans ce modèle sans y ajouter une liste d'opérations ; voir ci-dessous.

### Destructif : nouvel asset par opération
Chaque opération décode l'image, la traite, ré-encode en PNG et enregistre un nouvel asset (SHA-256) : c'est le comportement d'ActCraft pour le remplissage. Avantages : rendu trivial (l'image est ce qu'elle est), export identique. Inconvénients : perte d'information (rognage définitif, qualité d'un JPEG ré-encodé), poids du fichier (un PNG de 12 Mpx fait des Mo ; chaque étape garde l'ancien asset pour l'annulation tant que l'historique existe), synchronisation lourde (un asset de plusieurs Mo par modification), et la couleur transparente avec tolérance ne se règle plus après coup.

### Mixte (recommandé pour le pot de peinture)
Paramètres non destructifs pour le rognage, le retournement, les quarts de tour, la luminosité, le contraste et la couleur transparente ; opération destructive explicite (« Aplatir » ou « Remplir ») pour ce qui modifie des pixels de façon irréversible (remplissage de zone au pot, effacement, pinceau éventuel), qui produit un nouvel asset. Un élément image pourrait avoir à la fois des paramètres et un asset déjà modifié.

## Où calculer

Pour les opérations de pixels (couleur transparente, remplissage, réglages) :
- Page TypeScript, sans Wasm : `OffscreenCanvas` + `getImageData` + boucle JavaScript sur un `Uint8ClampedArray`. Simple, aucun poids Wasm, suffisante pour une image de 2 à 4 Mpx (quelques dizaines de ms en JS, estimation non mesurée). Pour 12 Mpx, l'iPad peine et la mémoire est comptée ; dans un Web Worker avec `OffscreenCanvas`.
- Cœur Rust en Wasm (D10, frontière grossière) : ajouter des fonctions de pixels (`transparent_color`, `flood_fill`, `adjust`) qui prennent un `Uint8Array` RGBA et en rendent un. Aucune dépendance obligatoire : ces algorithmes font chacun quelques dizaines de lignes. Cohérent avec la règle « une seule implémentation » (D7) : le même code sert le rendu, l'export et les tests `cargo test` natifs. Poids : négligeable si on n'ajoute pas de crate.
- Crate `image` 0.25.10 : décodage/encodage PNG, JPEG, WebP, etc. en Rust pur ; compile pour wasm32 avec fonctions par défaut limitées (`default-features = false` + `png`, `jpeg`, `webp`) ; ajoute de l'ordre de 300 à 800 Ko de Wasm non compressé selon les formats retenus (supposé). Le navigateur sait déjà décoder : `createImageBitmap` est gratuit et plus rapide ; on réserve `image` à l'encodage PNG de l'asset final et au natif (tests, coque).
- `fast_image_resize` 6.1.0 : redimensionnement de qualité (Lanczos, SIMD) ; support wasm32 avec SIMD annoncé (supposé : vérifier). Utile pour produire des miniatures et réduire les très grandes images à l'import ; le navigateur peut aussi le faire (`createImageBitmap` avec `resizeWidth`, `resizeQuality`), moins précis.
- `photon-rs` 0.3.3 : réglages d'image prévus pour wasm, mais dernière mise à jour en 2025 : risque de maintenance ; à éviter, les réglages demandés sont triviaux à écrire.
- `imageproc` 0.27.0 : morphologie, contours ; utile pour la vectorisation du pot (étude sœur), non pour ici.
- `tiny-skia` 0.12.0 (BSD-3-Clause) : rastérisation Rust pur ; utile si l'export doit rendre la page sans canvas.

Où faire quoi :
- Décoder : navigateur (`createImageBitmap`), rien en Wasm.
- Appliquer les paramètres : Canvas 2D (rognage, retournement, échelle, filtre) ; passage de pixels en cœur Wasm pour la couleur transparente.
- Encoder l'asset final (destructif) : `canvas.convertToBlob({type: "image/png"})` (OffscreenCanvas) ou crate `image` en Wasm ; les deux possibles.

## Formats d'image

- PNG : alpha natif, sans perte : format de sortie des assets modifiés.
- JPEG : sans alpha ; ré-encoder en JPEG perd de la qualité : une image JPEG détourée sort en PNG (ou en WebP avec alpha). L'asset d'origine reste du JPEG tant que rien n'est cuit (non destructif).
- WebP : alpha, bien supporté ; AVIF/HEIC : décodage par le navigateur seulement (iPad : HEIC des photos : Safari le décode ; Chrome non ; supposé).
- SVG : vectoriel ; le détourage par couleur n'a pas de sens, il faut rastériser (`resvg` en Wasm est lourd : plusieurs Mo ; le navigateur le rend à la demande).
- GIF animé : image fixe seulement (première image), à documenter.
- Orientation EXIF des photos d'iPad : à appliquer au décodage (`createImageBitmap` avec `imageOrientation: "from-image"`), sinon les photos s'ouvrent tournées.

Couleur : le Canvas 2D travaille en sRGB ; les photos iPad peuvent être en Display P3 ; la distance de couleur dans l'espace de l'écran donne la tolérance perçue (Lab plus fidèle que RVB ; coût plus élevé).

## Ce qui marche sur iPad (web) / ce qui demande la coque

- Tout ce qui est décrit marche dans la page : rognage, retournement, quarts de tour, filtres, détourage par couleur, pipette sur le canvas, encodage PNG par `OffscreenCanvas`.
- Mémoire : une photo d'iPad de 12 Mpx = 48 Mo décodés en RGBA ; plusieurs images par page, plus les copies de travail, peuvent faire tuer l'onglet : réduire à l'import (par exemple 4096 px de côté maximum, à confirmer) ; garder l'original dans l'asset (non destructif) mais ne décoder que la version utile.
- Import d'images : sélecteur de fichier ou presse-papier (`<input type="file">`, glisser-déposer, `navigator.clipboard.read`) : dans le navigateur ; prise de photo : `<input capture>` sur iPad.
- La coque Tauri n'apporte rien d'indispensable ici ; elle donnerait un décodage natif plus rapide (HEIC sur Windows) mais ce chemin ne touche pas l'encre : permis, mais non nécessaire.

## Recommandation pour RoomBoard

Option 1 (recommandée) : mixte non destructif d'abord.
- Élément `kind = "image"` : `asset` (empreinte SHA-256 dans `assets/`, D24), `transform` (D4), `crop`, `flipX`, `flipY`, `quarterTurns`, `brightness`, `contrast`, `transparent` {`color`, `tolerance`, `soft`, `contiguous`} ; tous facultatifs, absents = image brute. Tous des champs simples de `Y.Map` (fusion sans conflit, annulation par `UndoManager` sans cas particulier).
- Rendu : un bitmap en cache par élément (clé = asset + paramètres), invalidé par `Change` ; les calculs de pixels (couleur transparente) dans une fonction du cœur Wasm, testée en natif (`cargo test`), sans dépendance nouvelle ; décodage par le navigateur.
- Opérations destructives explicites (pot de peinture sur image, effacement) : nouvel asset PNG, sauf si l'on retient plus tard une liste d'opérations.
- Import : réduction à une taille maximale, correction EXIF, ancien asset original conservé.
- Pipette de la couleur transparente : clic sur l'image ; tolérance par un curseur, aperçu en direct sur le canvas d'interaction (D38 : rien d'écrit avant la validation).

Option 2 : tout destructif comme ActCraft. Plus simple (rendu trivial, pas de paramètres à synchroniser), mais poids de fichier et perte de qualité ; déconseillé pour le rognage et la couleur transparente, acceptable pour le pot.

Option 3 : tout non destructif, y compris le pot, par liste d'opérations rejouées (masques de pixels). Complexe (rejeu, ordre, poids de la liste), à réserver si l'usage demande de modifier un remplissage après coup.

Option 4 : n'offrir que la couleur transparente et le rognage au 0.1, retourner/pivoter/réglages après. Aucun coût d'architecture (les paramètres s'ajoutent sans migration, car facultatifs).

## Questions ouvertes

1. Que propose réellement ActivInspire pour les images (rognage, retournement, réglages) ? Un essai ou une capture de Jérôme tranche ; l'aide lue n'en parle pas.
2. Détourage global (comme ActivInspire) ou contigu (comme le pot), ou les deux ? Et « plume » des bords : utile ou superflu ?
3. Taille maximale d'image à l'import sur iPad ; garder l'original en plus de la version réduite (poids du fichier `.roomboard`) ?
4. Poids Wasm réel du cœur avec/sans `image` : à mesurer.
5. Rotation libre d'une image : dépend de la rotation d'élément, absente de D4 ; au 0.1 ou plus tard ?
6. Export (PDF, PNG) : même rendu d'image que l'écran ; à poser dans le cadrage de l'export.
7. `Pick Through` d'ActivInspire (clic à travers la zone transparente) : à reprendre pour la sélection ?
8. Support réel de `OffscreenCanvas` et du filtre `ctx.filter` sur l'iPad cible : à vérifier sur l'appareil.
