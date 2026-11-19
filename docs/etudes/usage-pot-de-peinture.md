# Étude d'usage : le pot de peinture (ActivInspire) et sa traduction dans RoomBoard

Date : 2026-11-19. Statut : étude, aucune décision prise, aucun code produit.

Demande de Jérôme, mot pour mot : « Étudie bien les caractéristiques de l'outils pot de peinture de activ inspire, qui particulièrement avancé. Il permet de remplir n'importe quelle zone fermée (image comprise), d'effacer modifier la,couleur d'un objet, modifier la,couleur d'un mot par mot dans un texte editable. »

Étude sœur : `docs/etudes/usage-edition-image.md` (retouches d'image, couleur transparente).

## Sources

Fichiers locaux lus :
- `docs/plans/socle-cadrage.md` : D2 (schéma Yrs), D4 (coordonnées), D6 (trait), D7 (géométrie unique dans le cœur), D10 (frontière Wasm), D11 (UndoManager), D13 (formes), D14 (texte simple en `Y.Text`), D19 (rendu Canvas 2D), D24 (format, dossier `assets/`), D25 (zip), D12 (gomme).
- `crates/roomboard-core/src/element.rs` (`StrokeStyle {color, width}`, transformation affine), `commands.rs:92,131` (seul `kind = "stroke"` existe aujourd'hui), `Cargo.toml` du cœur (yrs 0.28, freedraw, zip, serde).
- `~/projets/actcraft` (lecture seule) : `tools/src/filltool.cpp`, `tools/include/actcraft/tools/filltool.h`, `core/include/actcraft/core/fill.h`, `core/src/fill.cpp:200-226`, `render/src/imagefill.cpp`, `docs/plans/2026-10-18-livraison-complete-lot5-PLAN.md:232` et `docs/verifications/2026-10-18-lot5-principes.md:54,138` (décision D10 d'ActCraft, hypothèse H5-4).

Documentation ActivInspire :
- Aide en ligne ActivInspire Studio, export PDF « An Introduction to ActivInspire (Studio) » : https://cdnsm5-ss18.sharpschool.com/UserFiles/Servers/Server_27405451/File/IT%20Online%20Forms/Premethean%20Boards%20Help/Activinspire-user-guide%20v1.pdf (téléchargé dans `~/telechargements-roomboard/pot-de-peinture/guide-v1.pdf`, lu par `pdftotext`). Pages d'aide : « Reference > Tools > Fill », « Adding and manipulating shapes > Fill a shape », « Reference > Settings > Tools » (Image fill tolerance), « Properties > Miscellaneous » (Transparent, Transparent Color, Pick Through).
- Guide Promethean avril 2023 : https://learn.prometheanworld.com/wp-content/uploads/2023/03/Getting-Started-with-ActivInspire_April23.pdf (le pot sert aussi à changer le fond de la page ; couleur d'une forme, contour et intérieur).
- Introduction aux propriétés (Wallingford School) : https://vle.wallingfordschool.com/pluginfile.php/91/mod_resource/content/1/Introduction_to_Properties.pdf (le dégradé n'existe que par les propriétés).
- Guide d'un lycée sur le fond transparent : https://vle.wallingfordschool.com/mod/page/view.php?id=593 (le pot sert à homogénéiser le fond avant la couleur transparente).

Autres produits et bibliothèques :
- SMART Notebook : résultat de recherche seulement (pages onlinehelp.smarttech.com, versions 10 à 17), page `support.smarttech.com/docs/software/notebook/notebook-17/.../creating-shapes-and-lines.cshtml` lue : elle ne décrit pas le bouton de remplissage.
- crates.io (API, relevé du 2026-11-19, fichiers dans `~/telechargements-roomboard/crates/`) : licences et versions du tableau plus bas. docs.rs `i_overlay` 9.2.0.

## Vérifié

Dans l'aide ActivInspire (version Studio, aide de 2010 exportée, probablement v1.x-2.x ; la page de l'outil n'a pas changé de contenu dans le guide de 2023) :
- Le pot (« Fill », Ctrl+F, boîte à outils principale) remplit : des formes (couleur unie ou dégradé, le dégradé se règle seulement dans le navigateur de propriétés), des formes partielles qui se croisent avec des couleurs différentes (« Intersecting shapes with different colors »), des pages (fond), et change la couleur des contours d'objet.
- Mode d'emploi officiel : « Select Fill, change the color if desired, click on the object, page or outline. » On choisit la couleur, puis on clique : l'outil est modal, la couleur vient de la palette de l'outil.
- Une préférence « Image fill tolerance » existe, pour les fichiers .jpg et .png : curseur de 0 à 100, défaut 5, « how closely the Fill color must match a corresponding color in the selected file » : faible = seules les zones très proches de la couleur cliquée sont remplies. Le pot remplit donc bien une zone d'image, par proximité de couleur, avec une tolérance globale réglée dans les préférences et non dans une barre d'options de l'outil.
- Le guide d'un lycée montre l'usage composé : le pot remplit les restes du fond d'une image d'une couleur contrastée, puis la propriété « Transparent Color » (pipette) rend cette couleur transparente. Ctrl+Z annule un remplissage qui déborde. Le fond doit être d'une seule couleur ; le résultat est « imparfait » (bords).
- La propriété d'objet « Transparent » (vrai/faux), « Transparent Color » (pipette n'importe où à l'écran) et « Pick Through » (cliquer à travers la zone transparente pour atteindre l'objet dessous) existent. Dans la bibliothèque de ressources : « Toggle Transparency » rend transparente la couleur de fond d'une image au moment où on la glisse sur la page.
- Mode « Fill recognized shapes » : les formes issues de la reconnaissance sont remplies de la couleur du contour ou d'une autre couleur.
- ActivInspire Primary : le pot ouvre un plateau de couleurs (« Fill Tray ») ; le stylet élève a son propre plateau.

Dans ActCraft (code lu) :
- `fillHitAt` (core/src/fill.cpp:200) cible, dans l'ordre : image sous le clic, contour d'une forme (tolérance d'écran divisée par le zoom), intérieur d'une forme, sinon fond de page. L'objet du dessus gagne ; les objets verrouillés sont remplis (décision D10 d'ActCraft). Sur forme croisée, c'est la forme du dessus qui est remplie (H5-4 : « non tranché »).
- Pour une image : décodage, remplissage par diffusion 4-connexe à partir du pixel cliqué, tolérance 5 sur 100 par canal RVB, alpha conservé, résultat ré-encodé en PNG et stocké comme nouvelle ressource d'image (clé SHA-256) ; le calcul tourne hors du fil principal et le résultat est jeté si le document a changé entre-temps (`staleImageFillDropped`). Le pixel qui vient d'être peint ne devient pas la référence (la zone se décide sur la source).
- Une seule étape d'annulation par remplissage.
- Aucune trace dans ActCraft du remplissage « zone délimitée par des traits d'encre » ni de la couleur mot par mot.

Dans RoomBoard (code lu) : seul `kind = "stroke"` existe ; formes et texte sont décidés (D13, D14) mais pas codés. Un trait a `color`, `width`. Le texte du socle est un `Y.Text` sans attributs, une couleur pour tout l'élément (D14).

## Supposé

- Mot par mot : je n'ai trouvé dans aucune documentation publique d'ActivInspire que le pot colore un mot isolé. L'aide dit que le pot agit sur des formes, des contours, des pages (et des images par tolérance). Le comportement « couleur d'un mot » vient de l'observation de Jérôme ; il passe peut-être par la sélection du texte en édition et la barre de mise en forme plutôt que par le pot. À vérifier sur un ActivInspire réel (question ouverte 1).
- « Remplir n'importe quelle zone fermée » formée par plusieurs traits qui se croisent : l'aide ne dit rien d'un arrangement planaire de traits à main levée. Le texte dit « intersecting shapes » (formes). Le comportement sur des traits d'encre est supposé : il ressemble à un remplissage de pixels sur la vue (hypothèse forte : le « zone fermée d'une image » de Jérôme est du pixel).
- « Effacer » avec le pot : lu comme « remplir avec la couleur transparente » ou le fond de page. Non documenté.
- SMART Notebook (recherche seulement, non lu dans la source) : bouton Fill puis couleur puis clic ; remplit une zone délimitée par un seul trait d'encre fermé ; ne remplit pas une zone fermée par plusieurs traits. OpenBoard : je n'ai rien trouvé ; de mémoire il n'a pas de pot de peinture (les formes ont un remplissage dans les propriétés) ; non vérifié.
- Compatibilité `wasm32` des bibliothèques : annoncée par les dépôts pour la plupart, non compilée ici (voir tableau).

## Fonctions à reproduire (cahier de l'usage)

1. Clic sur l'intérieur d'une forme fermée : remplissage uni de la forme (propriété, pas un nouvel objet).
2. Clic sur un contour : change la couleur du contour (forme ou trait).
3. Clic sur un trait d'encre : change la couleur du trait.
4. Clic dans une zone fermée par plusieurs objets (traits qui se croisent, formes qui se recoupent) : remplit la région visible.
5. Clic dans une image : remplit la zone de couleur voisine, tolérance réglable (défaut 5 sur 100).
6. Clic sur un mot d'un texte éditable : change la couleur de ce mot seul (demande de Jérôme).
7. Clic dans le vide : couleur de fond de la page.
8. Effacer par le pot : remplir de « transparent » (image) ou « sans remplissage » (forme).
9. Dégradé : hors pot dans ActivInspire (propriétés) ; hors périmètre ici.
10. Annulation d'un clic de pot en une étape.

## Comment RoomBoard peut les rendre

### Cas 1 à 3 : propriétés d'un objet vectoriel (simple)
Ce sont des écritures de propriété (`fill`, `color`) sur l'élément visé, une transaction Yrs, une étape d'annulation. Le test de cible (`fillHitAt`) existe déjà dans l'esprit de `ink::hit` (`crates/roomboard-core/src/ink/hit.rs`) : on l'étend aux formes. Le cœur Rust le fait, derrière une commande grossière `Fill{target, color}` (D10). Rien à calculer : aucune dépendance nouvelle. Au socle, D13 prévoit déjà « remplissage aucun / couleur » sur les formes.

### Cas 4 : zone fermée par plusieurs objets (le point dur)
Trois approches :

A. Arrangement planaire exact (vectoriel). On prend les contours de tous les objets visibles (traits : le contour `ink::outline` de D7 ; formes : leur chemin), on les « nodalise » (découpe à chaque croisement), on construit les faces et on retient celle qui contient le point cliqué. Bibliothèques candidates (licences relevées sur crates.io le 2026-11-19) :
- `i_overlay` 9.2.0, MIT OR Apache-2.0 : unions, différences, XOR, règles de remplissage, entiers et flottants, découpe de polygones par polylignes (« slicing »), pur Rust. Le bon outil pour : union de tous les contours épaissis, puis différence avec le cadre de page ; les trous de l'union sont les zones fermées ; on choisit celle qui contient le clic. Compatibilité wasm32 : annoncée (la doc liste le sujet), non compilée ici.
- `geo` 0.33.1, MIT OR Apache-2.0 : booléens (`BooleanOps`), prédicats ; plus lourd, algorithmes en flottants robustes ; wasm32 supposé (pur Rust).
- `lyon` 1.0.19, MIT OR Apache-2.0 : aplatissement des courbes en polylignes, tessellation ; utile pour passer d'un chemin à des polygones pour `i_overlay`, pas pour les booléens.
- `kurbo` 0.13.1, Apache-2.0 OR MIT : géométrie de courbes (aplatissement, aire, point dans la forme) ; utile en complément.
- `flo_curves` 0.8.1, Apache-2.0 seul : booléens sur chemins de Bézier (`path_add`, `path_sub`), sans aplatir ; licence unique Apache-2.0, compatible avec PolyForm Shield (D40) comme dépendance, mais à confirmer par Jérôme ; maintenance par un seul auteur ; wasm32 supposé.
Défaut de A : un trait lissé n'a pas d'« intérieur » ; la zone fermée dépend de la largeur du trait et de ses extrémités. Deux traits qui se touchent presque (trou de 2 px) ne ferment pas la zone : il faut une tolérance de fermeture (grossir les contours de n pixels). Coût : un calcul par clic, pas par image ; acceptable (quelques millisecondes sur une page de quelques centaines de traits, estimation non mesurée).

B. Rastérisation de la vue puis diffusion (flood fill sur pixels), puis vectorisation du résultat. C'est ce que fait un pot de peinture « à la Paint » : on rend la page dans un canvas hors écran (sans la sélection), on diffuse depuis le clic avec une tolérance, on obtient un masque, on le vectorise (suivi de contour) en un polygone. Avantage : comportement identique à ce que l'élève voit ; fonctionne pour tout (encre, image, formes, fond d'image mêlés). Défaut : la qualité dépend de la résolution (bords crénelés, fuite par un trou de 1 px), la vectorisation demande un algorithme de suivi de contour (pas de crate évidente retenue ici ; `imageproc` 0.27.0, MIT, a `find_contours` ; `tiny-skia`, BSD-3-Clause, rastérise des chemins en pur Rust). L'objet créé est un polygone, indépendant de l'original : si on déplace le trait, le remplissage reste en place.

C. Hybride (recommandé plus bas) : rastérisation pour décider de la région (ce que voit l'utilisateur), mais forme du remplissage calculée vectoriellement quand tout est vectoriel.

### Cas 5 : remplissage dans une image (pixels)
Flood fill 4-connexe avec tolérance par canal, comme `render/src/imagefill.cpp` d'ActCraft (algorithme simple : environ 40 lignes ; aucune bibliothèque nécessaire ; `imageproc` n'est pas utile). Deux sorties possibles :
- Destructive : nouveau PNG, nouvel asset (SHA-256) ; l'élément pointe vers l'asset ; l'ancien reste dans le conteneur tant qu'un historique l'utilise (annulation). Comme ActCraft.
- Non destructive : un masque de remplissage (liste de rectangles/runs encodés) stocké dans l'élément, appliqué au rendu. Plus léger en poids, mais le rendu doit rejouer l'opération à chaque fois et la couleur remplie ne se « compose » pas avec une retouche ultérieure.
La décision structurante est la même que pour la couleur transparente : voir `usage-edition-image.md`. Le remplissage et la transparence par couleur doivent partager le même mécanisme de stockage (un seul pipeline d'« opérations pixel »).
Précaution : le calcul sur une grande image (12 Mpx d'une photo d'iPad) coûte quelques centaines de ms en Wasm ; il doit tourner hors du fil principal (Web Worker) et se périmer si le document change (comportement d'ActCraft à reprendre).

### Cas 6 : couleur mot par mot
Impose au modèle du texte : un texte riche par plages. Dans Yrs, `Y.Text` porte nativement des attributs de formatage sur des plages (`Text::format(txn, index, len, attrs)` et `insert_with_attributes`) ; le contenu et les attributs vivent dans le même CRDT, donc fusionnent en collaboration sans conflit de plages. À prévoir : l'attribut `color` (chaîne) sur des plages, l'« élément texte » garde une couleur par défaut (D14) ; un `Delta` (liste d'insertions avec attributs) rend les segments pour le canvas. Conséquences :
- D14 (« une police, une taille parmi 4, une couleur ») reste vrai pour l'élément ; la couleur par plage s'ajoute sans changer le schéma : seul le contenu du `Y.Text` porte des attributs. Aucune migration de format si les attributs sont absents des documents existants. À écrire dans le cadrage avant le socle texte, sinon le rendu du texte (un seul `fillText` par ligne) devra être refait par segments.
- Rendu Canvas 2D : découper chaque ligne en segments de même attribut ; `measureText` par segment, retour à la ligne calculé sur le texte entier. Plus cher que le `fillText` unique mais acceptable.
- Cible du clic : un test de position dans le texte (offset de caractère sous le pointeur) puis extension à la limite du mot (séparateurs Unicode UAX 29 ; la crate `unicode-segmentation` est MIT OR Apache-2.0 ; supposé wasm-compatible). Mot = plage `[début, fin)` ; `format(début, fin-début, {color})`.
- Annulation : `UndoManager` capture les changements de formatage (supposé : à confirmer par un test ; D11).
- Pendant l'édition dans le `<textarea>` de D14 : un `<textarea>` ne porte pas de couleur par plage. Le pot ne s'applique donc qu'hors édition (sur le rendu canvas), et l'édition riche demanderait `contenteditable` ou un éditeur sur mesure : coût élevé, à décider (option 3).

### Cas 7 et 8 : fond de page et « effacer »
Le fond est `background` de la page (D2) : une propriété. « Effacer par le pot » : pour une forme, `fill = none` ; pour une image, couleur transparente (même pipeline que l'étude sœur).

## Modèle de données

Options :
1. Remplissage = propriété (`fill`) de la forme, `color` du trait, attribut `color` de plage de texte, `background` de la page. Aucun nouvel objet. Couvre 1, 2, 3, 6, 7.
2. Objet « remplissage » (`kind = "fill"`) pour les zones fermées par plusieurs objets : un chemin polygonal (contour, trous) en `f32` locaux + `transform` + `color`, empilé juste au-dessus des objets d'origine. Couvre 4.
3. Objet « remplissage » lié (référence aux ids d'objets qui le délimitent, recalculé quand ils bougent) : élégant, mais fragile en CRDT (objets supprimés ou modifiés par deux utilisateurs) et d'un coût de calcul continu. À éviter au 0.1.
Pour l'image : asset remplacé (destructif) ou liste d'opérations (non destructif).

CRDT : une propriété modifiée en parallèle par deux pairs se résout en « dernier écrit gagne » (clé de `Y.Map`) : acceptable. Les plages de `Y.Text` fusionnent par attribut. Un objet `fill` est un nouvel élément inséré : sans conflit.

## Ce qui marche sur iPad (web) / ce qui demande la coque

- Tout marche dans la page : propriétés et attributs sont du CRDT ; booléens `i_overlay` compilés en Wasm dans la page (permis par la règle de Jérôme : le Wasm dans la page ne traverse pas la frontière natif) ; flood fill sur pixels : lecture des pixels par `OffscreenCanvas`/`getImageData` (page) ou décodage Wasm.
- iPad Safari : mémoire Wasm limitée (sur iOS, l'onglet est tué autour de quelques centaines de Mo, valeur à mesurer) : une image de 12 Mpx décodée = 48 Mo en RGBA ; il faut réduire les très grandes images avant. `OffscreenCanvas` 2D existe dans Safari récent (supposé : à vérifier sur l'iPad cible).
- Rien ne demande la coque Tauri : l'encre et le remplissage restent dans la page.

## Recommandation pour RoomBoard

Option 1 (recommandée) : pot en trois étages, livré par paliers.
1. Palier 1 (avec formes et texte du socle) : propriétés (cas 1, 2, 3, 7) + remplissage d'image par flood fill avec tolérance 5 (cas 5, résultat en nouvel asset) ; préférence « tolérance » dans une option de l'outil, visible à l'écran (progrès sur ActivInspire, qui la cache dans les préférences).
2. Palier 2 : texte riche par plages `Y.Text` (cas 6) ; à décider avant d'écrire le rendu du texte.
3. Palier 3 : zones fermées par plusieurs objets (cas 4) par l'approche C : région décidée sur la vue rastérisée (tolérance de fermeture de 2 px), forme créée par `i_overlay` en objet `fill` (modèle 2).

Option 2 : approche B pure (rastérisation + vectorisation) dès le palier 1. Plus rapide à obtenir « à la Paint », mais le rendu dépend de la résolution et de la vectorisation.

Option 3 : ne rien faire pour le texte mot par mot tant que le texte reste en `<textarea>` ; le déclarer hors 0.1.

Option 4 : copier ActivInspire à l'identique (tolérance cachée dans les préférences, pot qui change le contour au lieu de l'intérieur selon la précision du clic). Déconseillée : la précision du clic sur le contour est mal vécue au doigt.

## Questions ouvertes

1. Dans ActivInspire réel, le pot colore-t-il un mot, ou est-ce la sélection du texte ? Un essai de Jérôme (ou une capture) tranche.
2. Les traits qui se croisent : la zone doit-elle se fermer si deux traits ne se touchent pas tout à fait ? Quelle tolérance de fermeture ?
3. Un remplissage de zone fermée doit-il suivre les objets s'ils sont déplacés ? (modèle 2 ou 3)
4. Texte en édition : accepter le `contenteditable` (coût et IME, D14) pour la couleur par plage ?
5. `flo_curves` est sous Apache-2.0 seul : acceptable avec PolyForm Shield (D40) ? Non nécessaire si `i_overlay` suffit.
6. Compilation réelle de `i_overlay` en `wasm32-unknown-unknown` : à vérifier par un essai de build avant le palier 3.
7. Taille maximale d'image traitée sur iPad avant réduction : à mesurer sur l'appareil.
