# Étude : formats de tableaux blancs interactifs (flipchart, Notebook, myViewBoard, OpenBoard, IWB, Lynx)

Date : 2026-11-19. Statut : étude, aucun code produit. Demande de Jérôme : « Prise en charge d'un max de formats directement en glisser déposer […] Dans la mesure du possible, autorise l'édition des flipchart, Smart, fichier myViewBoard […] ». Périmètre : les formats de tableaux blancs ; PDF, Office, 3D, images et vidéo sont traités dans `usage-formats-documents-medias.md`.

Convention : **Vérifié** = observé sur un fichier réel ou dans un code source lu pour cette étude. **Supposé** = déduit d'une page tierce, d'un nom de fichier ou de l'expérience d'ActCraft, non observé.

## 1. Synthèse

| Format | Structure | Lecture | Édition | Web / coque | Bibliothèque | Licence |
|---|---|---|---|---|---|---|
| ActivInspire `.flipchart` | conteneur binaire « Bamboo » (entrées zlib), index « culm », objets binaires propriétaires, images TIFF | oui, déjà faite en C++ dans ActCraft ; pages, traits, formes, texte riche, images, groupes, actions | non fiable : ActCraft n'écrit pas le format (réversible) | Rust/Wasm : oui (zlib + binaire) ; iPad inclus | aucune publique ; lecteur ActCraft (C++/Qt) à porter | format propriétaire Promethean, non documenté ; lecteur à nous par interopérabilité |
| ActivStudio `.flp` | binaire, « PKZip » d'après une page tierce | non vérifié, aucun échantillon | non | à élucider | aucune | propriétaire |
| SMART Notebook `.notebook` | ZIP + `imsmanifest.xml` (IMS CP/SCORM) + pages SVG (dialecte SMART) + `images/` | oui : pages, formes, texte, images ; traits et objets riches à mesurer | réécriture du ZIP faisable mais perte probable ; import puis export plus sûr | Rust/Wasm : oui | aucune pour lire ; `zip`, `quick-xml`, rendu SVG maison | propriétaire (type MIME enregistré à l'IANA, aucune spécification publiée) |
| SMART `.xbk`, `.gallery` | `.xbk` : ancien format Notebook ; `.gallery` : probablement un `.notebook` de galerie | non vérifié | non | idem `.notebook` | aucune | propriétaire |
| myViewBoard `.olf` | ZIP contenant `content.json` (JSON) | oui (traits, fonds en couleur ; autres objets non vus) | oui, le plus simple : JSON | Rust/Wasm : oui | aucune officielle ; script tiers sans licence | annoncé « ouvert » par ViewSonic, spécification non trouvée |
| myViewBoard `.enb`, `.vboard`, `.iwb` | `.enb` : format EasiNote (CVTE) d'après ViewSonic ; non vu | non | non | à élucider | aucune | propriétaire |
| OpenBoard `.ubz` | ZIP : `metadata.rdf`, `pageNNN.svg`, `pageNNN.thumbnail.jpg`, dossiers `images/ objects/ widgets/ videos/ audios/` | oui (SVG standard + extensions `ub:`) | oui : format ouvert, code GPL-3.0 lisible | Rust/Wasm : oui | OpenBoard (C++/Qt) en référence | GPL-3.0 : lire le code, ne pas le copier |
| IWB / CFF `.iwb` | ZIP : `content.xml` (SVG sous-ensemble + balises `iwb`) + médias | oui, norme publique | oui, export complet possible | Rust/Wasm : oui | OpenBoard (import et export), SMART, ActivInspire, myViewBoard le lisent | norme 1EdTech (ex-Becta), « All Rights Reserved », licence d'usage chez 1EdTech |
| Lynx `.lynx` | ZIP + XML d'après un convertisseur tiers, non vérifié | non | non | à élucider | aucune | propriétaire (Clevertouch / Boxlight) |

Ordre de priorité recommandé (§ 11) : IWB, Notebook, flipchart, myViewBoard `.olf`, OpenBoard `.ubz`, puis le reste sur demande.

## 2. Acquis ActCraft (lecture seule, `~/projets/actcraft`)

ActCraft est un logiciel Qt/C++ qui lit les `.flipchart` d'ActivInspire. Il a fait la rétro-ingénierie, un lecteur et un banc de mesure. La documentation de référence, `docs/re/format-flipchart.md`, vit dans un ancien dépôt (« REA - Activinspire ») absent de cette machine : tout ce qui suit vient du code et des cadrages d'ActCraft, pas de cette documentation. Les 17 paperboards de `samples/` appartiennent à Jérôme (dont des listes de présence) et ne sont pas sur cette machine.

### 2.1 Structure binaire apprise

- **Conteneur « Bamboo »** (`formats/src/bamboo.cpp:47-95`, `formats/include/actcraft/formats/bamboo.h:25-40`) : signature `" Bamboo "` (8 octets, espace initial compris), `u16` version, chaîne Qt (`u32` longueur en octets, UTF-16LE), 8 octets réservés. Puis une suite d'entrées : nom, trois dates (chaînes), `u64` taille décompressée, `u8` drapeau compressé, `u64` taille stockée, octets. Compression : zlib avec l'en-tête de `qCompress` (4 octets de taille puis zlib). Un nom en double : la dernière entrée gagne. Entrée refusée au-delà de 512 Mio (`bamboo.h:15`).
- **Pages imbriquées** : chaque page `N.fpg` est elle-même un conteneur Bamboo (`flipchart.cpp:535`, `bamboo.h:26`).
- **Index « culm »** : `# culm #`, arbre de nœuds (identifiant, type `u16`, identifiant de stockage, enfants) ; la hiérarchie fait foi, pas la liste des entrées (`bamboo.cpp:185-187`, `bamboo.h:44`). Le fichier `*.in` à la racine est l'index (`flipchart.cpp:290-296`).
- **Flux objet** `.io` / `.ir` : en-tête Bamboo `u16 1`, `u16 7`, puis un objet générique (`objectstream.h:85`, `formats/src/objectstream.cpp`). Propriétés par numéro, valeurs typées (nombres, chaînes, couleurs, rectangles, tailles, polylignes `pointsOf` de 16 octets par point en `double` LE, listes de polylignes, registre de ressources, références vers un nœud, objets imbriqués) ; profondeur bornée à 32, 5 000 000 éléments par liste (`objectstream.cpp:14-15`). Les numéros de propriétés sont stables entre versions, mais propres à chaque genre au-delà de 36 (`flipchartids.h:5-9`).
- **Genres d'objets lus** (`flipchartids.h:13-40`) : document 1, page 2, trait d'encre 3, ligne 5, forme à polygones 7, image 9, texte riche 11, grille 13-14, groupe 18, six genres d'actions (22-28, 50, 463), fond 29, connecteur 52, étiquette 53, média 253, équation MathML 460. Non lu : texte de haut en bas 469 (`flipchartids.h:40` ; son texte n'est pas en clair dans le fichier, `docs/verifications/2026-10-18-lot4-principes.md:82`).
- **Modèle de dessin** : ordre couche, puis profondeur, puis ordre de l'arbre (`flipchart.cpp:264`) ; transformation locale `translate(t+o) ; rotate ; scale ; translate(-o)`, miroir d'abord (`flipchart.cpp:209-211`) ; graisse de police Qt4 0-99 vers Qt6 100-900 (`:140`) ; contour (`:161`) et remplissage dégradé (`:181-186`) ; images devinées par signature d'octets (`:108-135`). Unité : pixels de page, 1024 × 768 par défaut, côté max 100 000 (`:29-33`).
- **Résolution** : références vers ressources et images via un registre (`flipchart.cpp:771`, entrées `N.io`). Miniature JPEG `N.thm` par page (`:575`).
- **Actions** (rattachées au dernier objet lu, `flipchart.cpp:562-568`, `:667-690`) : table à la main des paires (genre, commande) dont le sens est établi (`flipchartids.h:54`) ; le type 27 n'est pas un genre d'action lu (`docs/verifications/2026-10-21-lot8-principes.md:101`).

### 2.2 Ce qui était lu, ce qui manquait

- Lu : pages, fonds (couleur, dégradé, image), quatre couches, traits (stylo, marqueur, surligneur), lignes, formes, texte HTML riche, images, médias (références), groupes, grilles, actions, équations MathML (`docs/verifications/2026-10-18-lot7-principes.md:63`), réglages de page (rideau, spot, origine).
- Lu sans validation, faute d'exemplaire : connecteurs, lignes, fonds image, MathML, texte vertical (`docs/specs/2026-10-14-livraison-complete-cadrage.md:126`, N1-14).
- Manquait : propriété de page 27 (outils de page) absente de la documentation (`lot7-principes.md:102`) ; valeurs des modes de déplacement, rotation, accrochage (`lot8-principes.md:67`, « non tranché ») ; texte de haut en bas ; ancien `.flp` v2 et v3 (« à élucider par REA, aucun fichier d'essai, aucun oracle », `docs/specs/2026-10-17-livraison-complete-cadrage-amendement-1.md:237`) ; packs de ressources `.as2` à confirmer (`amendement-1.md:235`).
- Écriture : exclue (`cadrage.md:312-317` ; « un `.flipchart` ne se réécrit pas, Enregistrer propose `.actcraft` », `cadrage.md:65`) ; « réversible : un écrivain pourra s'ajouter s'il devient validable » (`cadrage.md:179`, DA4). ActCraft possède pourtant un écrivain de test pour la CI (`tests/support/flipchartwriter.h`, cité `lot8-principes.md:102`) : il fabrique des fichiers synthétiques, pas une écriture validée dans ActivInspire.
- SMART et IWB : ActCraft les a seulement cadrés (`amendement-1.md:232,236`) : « pages SVG et manifeste XML », « pas d'oracle, pas de fichier d'essai », estimation 8 tâches pour SMART, 3 de plus pour `.iwb` qui partage le lecteur SVG, risque élevé. Rien n'a été codé.

### 2.3 Résultats du banc

- Outil de preuve `actcraft-flipchart-dump` (`bench/flipchart/main.cpp:26-56`, `formats/src/flipchartdump.cpp`, 342 lignes) : exporte un JSON canonique comparé localement à l'oracle Python de l'ancien dépôt sur les 17 paperboards ; mode `--miniatures` qui rend chaque page avec le peintre partagé et la compare à sa miniature `.thm` (critère : médiane d'écart ≤ 2,0, au plus 3 pages au-dessus de 7, `main.cpp:33-53`) ; mode `--ecrire-synthetique`.
- Résultat chiffré : `docs/specs/2026-10-17-livraison-complete-cadrage-amendement-1.md:251` consigne « types d'objet inconnus gardés (réel : 30 + 1, + 88 %, en clôture) » pour le lot 2, sans plus de détail. Les journaux `docs/mesures/2026-10-2*.md` ne reprennent pas les valeurs d'écart ; ils notent que `tst_formats_oracle`, `tst_formats_oracle_synth` et `tst_flipchart_miniatures_samples` sont sautés (code 77) sans `ACTCRAFT_SAMPLES_DIR` (`docs/mesures/2026-10-22-lot11-fin.md:16`, `2026-11-06-lot6-passe-windows.md:12`). **Les écarts mesurés ne sont donc pas relus ici : supposé.**
- Garde-fous de lecture (utiles à reprendre) : bornes de profondeur (32), de volume décompressé (2 Gio) et de modèle (1 Gio) (`flipchart.h` `FlipchartLimits`, `flipchart.cpp:28`, `:361-371`), côtés de page invalides repliés sur 1024 × 768.
- Choix de méthode à reprendre : tables d'identifiants écrites à la main pour les seuls genres lus, jamais copiées d'un schéma généré depuis le binaire (`cadrage.md:65`, `flipchartids.h:3-9`).

## 3. ActivInspire `.flipchart`

**Vérifié** sur `~/telechargements-roomboard/flipchart/History_Industrial_revolution_with_film.flipchart` (3,3 Mo, 2014) avec `_scripts/lire-bamboo.py`, écrit d'après la lecture de `bamboo.cpp` : signature `" Bamboo "`, version 7, format « 1.0 », 286 entrées (14 `.fpg`, 14 `.thm`, 246 `.ir`, 1 `.io`, 1 `.in`, 1 `.xml`, 1 `.version`, 6 `.tif`, 2 `.jpg`), toutes compressées, tailles annoncées égales aux tailles décompressées. L'index commence par `# culm #`, les flux objet par ` Bamboo ` `01 00 07 00`. Les images sont des TIFF (`II*`), pas du PNG : un navigateur ne les décode pas partout. `100.xml` est un XML de métadonnées de ressource (`resourcemetadata`, espace `prometheanworld.com/Inspire/LocalResourceSearch`) qui liste les types d'objets présents.

- **Documentation publique** : aucune. Pages tierces : « format non déterminé », « en-tête Bamboo » (HandWiki). Aucun dépôt open source de lecture ou d'écriture trouvé (recherches GitHub sur dépôts et fichiers). Seul lecteur connu et complet : celui d'ActCraft, à nous.
- **Lecteurs commerciaux** : Explain Everything et Promethean ActivSuite convertissent les `.flipchart` (original inchangé) ; myViewBoard importe `.flp` / flipchart (« anciennes versions supportées, les récentes peuvent poser problème ») ; BenQ EZWrite : « limited support », Windows et macOS seulement. Aucune de ces sources ne liste les objets convertis.
- **Lecture dans RoomBoard** : portage en Rust du lecteur ActCraft (zlib via `miniz_oxide` / `flate2`, curseur borné, objets génériques). Les images TIFF demandent un décodeur Rust (crate `tiff`) ou une conversion à l'import. Pas de dépendance à Qt : les `QStringDecoder` et `qUncompress` se remplacent par `String::from_utf16` et `flate2`.
- **Écriture** : deux voies.
  1. Import dans `.roomboard`, sans retour : faisable et recommandé.
  2. Réécriture du `.flipchart` d'origine : ActCraft l'a exclue. Il faudrait conserver tous les objets non lus et toutes les propriétés inconnues octet pour octet (la lecture ActCraft en garde les types inconnus, `L2-C8`) et valider dans ActivInspire, qui n'est pas installable sur cette VM. Risque de fichier que le logiciel d'origine refuse ou « répare ». À ne pas promettre.
- **Où** : cœur Rust/Wasm pour la lecture (donc iPad), car c'est du calcul pur. Rien n'oblige la coque. Les vidéos et sons du fichier relèvent du lecteur média de l'interface.
- **Juridique** : format propriétaire non publié ; lecture pour interopérabilité sur fichiers que l'utilisateur possède. Directive 2009/24/CE art. 6 (interopérabilité du logiciel) ; la lecture de fichiers de données est plus légère qu'une décompilation, mais **supposé : à faire valider par un juriste** avant de publier un lecteur dans un dépôt public. ActCraft limite le risque en écrivant ses tables à la main, sans noms de classes ni de propriétés d'Inspire (`flipchartids.h:3-9`). Ne pas redistribuer les `.flipchart` d'autrui comme exemples de test ; fabriquer des fichiers synthétiques.

## 4. ActivStudio `.flp`

- **Vérifié** : rien sur fichier ; aucun échantillon trouvé en accès libre.
- **Supposé** (HandWiki, page tierce) : format de l'ancien logiciel ActivStudio / ActivPrimary, compression « PKZip » ; ActivInspire ouvre les `.flp` mais n'enregistre qu'en `.flipchart` ; ActivStudio n'ouvre pas les `.flipchart`. ActCraft : « à élucider, aucun fichier d'essai » (`amendement-1.md:237`). myViewBoard et Promethean importent encore les `.flp`.
- **Recommandation** : hors lot initial. Si un utilisateur en apporte, convertir par ActivInspire (export `.iwb` ou PDF) plutôt que de réétudier le binaire. Détail : § 11.

## 5. SMART Notebook `.notebook` (et `.xbk`, `.gallery`)

**Vérifié** sur trois fichiers publics de Dialogue IWB (Faculty of Education, Université de Cambridge), téléchargés dans `~/telechargements-roomboard/notebook/` (sources § 12) :

| Fichier | Entrées | Écrit par | Contenu |
|---|---|---|---|
| `Maths_Shape_behind_the_box.notebook` | 7 | SMART Notebook Windows 1.0.92.0 (2014) | 1 page SVG : 2 `path`, 7 `ellipse`, 10 `text`, `tspan` |
| `Science_bottle_of_truth.notebook` | 7 | idem | 1 page : 4 `path`, 1 `line`, 1 `image`, texte |
| `History_Romans_Mosaics.notebook` | 34 | SMART Notebook for Mac 14.0.1229.0 | 7 pages (`page0.svg` à `page6.svg`), 13 `image`, un objet Flash (`flash/flash1/*.swf`), `metadata.db`, 12 `annotationmetadata/*.xml` |

- **Conteneur** : ZIP (deflate) sans signature particulière ; l'IANA (`application/vnd.smart.notebook`, 2009) le décrit comme « zipped directory structure » avec manifeste, sans spécification publiée (« Published specification: none formal »).
- **Manifeste** `imsmanifest.xml` : IMS Content Packaging / ADL SCORM (`xmlns=…imscp_v1p1`, attribut `smartnotebook:filesource` donnant le logiciel écrivain). Il liste les pages dans `<resource identifier="pages">` et les dossiers `images sounds attachments flash videos annotationmetadata brush`. `metadata.xml`, `metadata.rdf` (Dublin Core, quasi vide), `settings.xml` (`AutoExport`), `preview.png`, `assessment.xml` (vide) complètent l'ensemble.
- **Pages** : SVG avec `<title>`, un `rect` de fond (`st_id`), puis `<g class="foreground">` contenant des `<g class="group" xbk_transform=…>` ; formes en `path` (`slscaler`, `shapename`, `RotationPoint`) ou `ellipse`, texte en `<text>` / `<tspan>` imbriqués avec `justification`, `bullet`, `font-family`, `textLength`, `editwidth`, `forcewidth` ; images en `<image>` référençant `images/…`. Les identifiants sont `xml:id="annotation.XXXX"`.
- **Pas vu** (aucun des trois fichiers n'en contient) : traits d'encre à main levée, pages de questionnaire (assessment), objets de galerie, animations, liens, tableaux, boîtes d'apprentissage (Lesson Activity Toolkit). **Supposé** que les traits sont des `path` de style stylo avec attributs propres ; à confirmer sur un fichier récent.
- **`.xbk`** : ancien format, remplacé par `.notebook` (filext). **Supposé**. **`.gallery`** : même famille ; non vérifié. Les fichiers `.gallery` des résultats de recherche GitHub sont d'autres formats.
- **Lecture publique existante** : `evandromr/SMARTNotebook2PDF` (MIT, Python 2 : décompresse le ZIP, convertit chaque `*.svg` avec `svglib`) lu intégralement ; il confirme que « ZIP + pages SVG » suffit pour un rendu, sans traiter l'ordre des pages (il n'ouvre pas le manifeste) ni les objets non SVG. SMART le lit, ActivInspire importe « SMART Notebook, SMART Gallery » (fiche technique ActivInspire 8.8), myViewBoard importe `.notebook` (« edits must be saved as .OLF »), EZWrite en « limited support ».
- **Écriture / édition** :
  - Import dans `.roomboard`, export vers `.notebook` : faisable (le dialecte SVG est lisible et réécrivable). Il faut produire un manifeste valide ; la validité côté SMART Notebook n'est pas testable ici (**supposé** : SMART tolère un manifeste minimal comme celui de `Maths_Shape_behind_the_box`, 1 193 octets).
  - Réécriture du fichier d'origine (aller-retour) : possible pour les contenus simples en conservant les entrées et attributs inconnus ; risque de perte pour tout ce qui n'est pas du SVG standard (`metadata.db`, Flash, questionnaires). À proposer comme « enregistrer une copie `.notebook` », jamais comme remplacement silencieux de l'original.
- **Où** : cœur Rust/Wasm (ZIP + XML + rendu SVG à nous ; le SVG de SMART est un dialecte : ne pas confier le rendu au navigateur seul, car `xbk_transform`, `RotationPoint` et `slscaler` ne sont pas du SVG). Flash (`.swf`) : aucun navigateur ni coque moderne ne l'exécute ; afficher un repère.
- **Juridique** : format propriétaire de SMART Technologies, enregistrement MIME public mais sans licence d'implémentation ; même raisonnement qu'au § 3. SMART publie un type MIME et des pages d'aide ; il n'a pas interdit les lecteurs tiers à notre connaissance (**supposé**).

## 6. myViewBoard (ViewSonic) : `.olf`, `.enb`, `.vboard`, `.iwb`

- **`.olf`** (« Open Learning Format », créé en 2021, commun à Windows et Android, ViewSonic KB) :
  - **Vérifié** sur `~/telechargements-roomboard/olf/analisis.olf` (750 Ko, échantillon d'un dépôt GitHub tiers, écrit par « Whiteboard for Android » 2.21.16) : ZIP à **une seule entrée**, `content.json` (2,6 Mo). Racine `olf` : `width`, `height`, `viewbox`, `meta` (id, versions, plateforme, dates), `pageset[]` → `page` {`id`, `matrix` 3×3, `viewbox`, `is-hidden`, `backgrounds[]`, `elements[]`, `tools[]`}, plus `additional[]`, `links[]`, `groups[]`. Éléments observés : uniquement `stroke` (2 924 traits) : `points` (chaîne « x,y x,y … »), `stroke` (couleur), `opacity`, `pen-type`, `pen-width`, `pen-height`, `is-highlighter`, `is-auto-smoothing`, `matrix`. Fond : `type: color`, `fill`. Les autres types (image, texte, forme) : **non vus, supposé** qu'ils existent comme éléments frères de `stroke`.
  - Lecture tierce : `horsemeatlasagne/olf-converter` (aucune licence déclarée ; `convert.py`, 2,8 Ko, lu) transforme les traits en SVG puis en PDF avec Inkscape ; il fixe la forme de `matrix` (affine, `a,b,c,d,e,f,0,0,1`).
  - **Documentation** : ViewSonic affirme que OLF est « un standard ouvert » mais la page d'aide ne renvoie qu'à une page de présentation (`myviewboard.com/solutions/olf/`) ; aucune spécification JSON publiée trouvée. **Supposé** : schéma incomplet côté images et texte.
  - Édition : la plus accessible de toutes (JSON, UUID stables, pas de binaire). Lecture et écriture en Rust (`serde_json`). Risque : ViewSonic fait évoluer le schéma (`create-version`) ; le service « OLF conversion request » reconnaît que la conversion « ne garantit pas une recréation identique ».
- **Ce que myViewBoard sait ouvrir** (page `mvb30-file-management`, vérifiée) : `.vboard`, `.olf`, `.flp`, `.notebook`, `.enb`, `.iwb`, PDF, DOCX, PPTX, Google Docs et Slides, TXT, ONE, URL. **Enregistrement** : `.olf` seulement ; export PDF et images. Il n'exporte donc ni `.notebook` ni `.flipchart` ni `.iwb`.
- **`.enb`** : la page de conversion OLF le rattache à « ViewBoard 2.1 et EasiNote3 » ; une autre page ViewSonic l'étiquette « Evernote ». Les deux sources se contredisent ; **EasiNote (CVTE)** est l'explication la plus probable (**supposé**). Aucun échantillon, aucun lecteur tiers trouvé. À traiter seulement si un utilisateur le réclame (conversion via myViewBoard ou service ViewSonic de conversion vers OLF).
- **`.vboard`** : ancien Windows ; aucun échantillon ; non étudié.
- **Où** : cœur Rust/Wasm (ZIP + JSON). Pas de coque nécessaire.
- **Juridique** : OLF est présenté comme ouvert mais sans licence de spécification trouvée. Lire et écrire des fichiers de données propres à l'utilisateur est un risque faible ; ne pas citer ni reproduire de marques ViewSonic dans l'interface sans accord (**supposé**).

## 7. OpenBoard `.ubz` (bonus)

- **Vérifié par lecture du code** `OpenBoard-org/OpenBoard` (GPL-3.0), fichiers téléchargés dans `~/telechargements-roomboard/_recherche/ob-*.txt` : le document est un dossier compressé en ZIP ; par page `page%1.svg` et `page%1.thumbnail.jpg` (`UBPersistenceManager.cpp:817,821`), `metadata.rdf` (`UBMetadataDcSubsetAdaptor.cpp:46`), dossiers `images`, `objects`, `widgets`, `videos`, `audios` (`UBPersistenceManager.cpp:66-70`), version de fichier `4.8.0` (`UBSettings.cpp:77`), espace de noms `http://uniboard.mnemis.com/document`. Les SVG utilisent `polyline`, `polygon`, `line`, `g`, `image`, `audio`, `video`, `foreignObject` (`itemTextContent`) et attributs `ub:` (`UBCFFConstants.h`).
- **Non vérifié sur fichier** : aucun `.ubz` public n'a pu être téléchargé (pas d'échantillon libre trouvé ; le seul `.ubz` indexé sur GitHub est un artefact de compilation sans rapport).
- **Lecteur tiers** : `Pesc0/ubztopdf` (GPL-3.0, 1,9 Ko) : décompresse, trie les `*.svg`, convertit avec `svglib`.
- **Édition** : la plus naturelle après `.iwb` : SVG standard à écrire. Import et export `.ubz` sans difficulté technique ; la spécification est le code d'OpenBoard (GPL : lire pour comprendre le format, écrire notre propre code ; ne rien copier).
- **Où** : cœur Rust/Wasm.
- **Juridique** : format ouvert en pratique, code sous GPL-3.0 : aucune contrainte tant qu'on ne reprend pas de code ; la licence de RoomBoard (PolyForm Shield) est incompatible avec une inclusion de code GPL.

## 8. IWB / CFF `.iwb` (Common File Format, norme Becta puis 1EdTech)

- **Norme** : « IWB/CFF Version 1.0 Final Specification », 1EdTech (ex-IMS GLC), 1 février 2012 ; travaux initiaux Becta (Royaume-Uni) 2009 (1edtech.org). Fichier `.iwb` = **archive ZIP** ; si le contenu est du XML pur, une seule entrée `content.xml` ; sinon médias à côté. Racine `<iwb version="1.0">`, schémas `iwbv1p0_v1p0.xsd` et sous-ensemble SVG, `svg:pageset`, `svg:page` (spécification, page `imsglobal.org/node/53086`).
- **Contenu pris en charge par la norme** : texte (`text` une ligne, `textarea` avec `tbreak`, `tspan`, listes), rectangle, cercle, ellipse, ligne, polyline, polygone, traits à main levée (`polyline freehand="true"`, surlignage), images (JPEG, BMP, GIF, WMF/EMF, PNG, TIFF), vidéo (MPEG, SWF), audio (MP3, WAV, lié à un autre élément), groupes (non imbriqués), liens, fonds (couleur, image), ordre z implicite. **Non pris en charge** : dégradés, motifs, coins arrondis, groupes imbriqués, unités autres que pixels.
- **Vérifié par code** : OpenBoard exporte et importe `.iwb` (`UBExportCFF.cpp:58` extension `.iwb` ; `UBImportCFF.cpp:114,259` lit `content.xml` ; `UBCFFConstants.h` : `content.xml`, `metadata.rdf`, `background.png`, balises `iwb`, `pageset`, `page`, `element`, `polyline`, espaces `http://www.imsglobal.org/xsd/iwb_v1p0`). Importé par SMART Notebook (File > Import, « All Common File Format Files »), myViewBoard, EZWrite 6 (toutes versions, 999 pages) et ActivInspire (selon un forum, **supposé** ; Promethean recommande l'export `.iwb` d'ActivInspire pour aller vers Explain Everything, ce qui indique que l'export existe, tandis qu'un tableau comparatif de BenQ affirme le contraire).
- **Non vérifié** : aucun `.iwb` réel n'a pu être téléchargé et inspecté. La structure ci-dessus vient de la norme et du code d'OpenBoard, pas d'un fichier.
- **Intérêt pour RoomBoard** : c'est le seul **format d'échange** public : un enseignant qui veut sortir d'ActivInspire ou de SMART n'a qu'à exporter en `.iwb`. SMART et ActivInspire exportent-ils `.iwb` ? Non vérifié pour les versions récentes (voir § 13). Import et export en Rust/Wasm, sans dépendance : `quick-xml` + `zip`.
- **Limites** : le format ne porte ni questionnaires, ni dégradés, ni groupes imbriqués : l'export depuis RoomBoard perdra ces éléments (à signaler à l'utilisateur dans une liste d'avertissements comme le fait ActCraft pour ses lectures).
- **Juridique** : texte de la norme « All Rights Reserved » ; l'utilisation « pour développer des produits ou services est régie par la licence 1EdTech » (la licence elle-même n'a pas été lue : **à lire avant d'écrire l'export**). Risque faible : norme publiée dans ce but.

## 9. Lynx (Clevertouch / Boxlight) `.lynx`

- **Vérifié** : seulement l'existence du logiciel (LYNX Whiteboard, Clevertouch, distribué par Boxlight) et d'une bibliothèque de leçons Boxlight (`lynx-lesson-library`). Le format est décrit par une page tierce (convert.guru) comme un ZIP avec XML et médias ; aucune documentation officielle, aucun échantillon téléchargé, aucun dépôt public.
- **Supposé** : ZIP + XML. LYNX importe lui-même SMART Notebook, PDF, PowerPoint et Word.
- **Recommandation** : aucune prise en charge directe ; passer par PDF, ou par le fait que Lynx sait ouvrir des formats tiers. Le forum Edugeek « convert Lynx files to flipchart files » (403, non lu) montre que la demande existe.

## 10. Où le faire : cœur Rust/Wasm ou coque

- ZIP, JSON, XML, zlib, décodage binaire : tout est du calcul pur, donc faisable dans le cœur Rust/Wasm et sur l'iPad (crates `zip` ou `rc-zip`, `flate2` avec `miniz_oxide`, `quick-xml`, `serde_json`, `tiff` ; **supposé** : compatibles Wasm, non essayé ici).
- Ce qui manque sur iPad et web, par construction : décodage TIFF, WMF et EMF natif du navigateur (images de flipchart et de Notebook : à convertir en Rust à l'import ou à afficher en remplacement) ; Flash `.swf` (aucune plateforme) ; vidéo et audio dépendent du codec du navigateur. Lire un fichier se fait via `FileHost` (D26) ; sur Safari / iPad, pas de File System Access API : seuls `<input type=file>` et le téléchargement sont possibles, donc « Enregistrer » d'un `.notebook` d'origine y devient « Télécharger une copie ». Ce n'est pas un défaut de format.
- Rien dans cette étude ne réclame la coque desktop. La coque ne sert qu'à lire et écrire directement le fichier d'origine sur disque (Ctrl+S sur un `.notebook`), ce que Safari ne permet pas.

## 11. Recommandation pour RoomBoard

Niveaux : A = import fidèle, B = import partiel avec avertissements, C = export, D = édition aller-retour sur le fichier d'origine.

| Priorité | Format | Niveau visé | Raison |
|---|---|---|---|
| 1 | `.iwb` (CFF) | A + C | norme publique, ZIP + XML, export possible, échange avec SMART, ActivInspire, myViewBoard, OpenBoard ; **lire la licence 1EdTech avant d'écrire** ; premier pont de sortie pour les enseignants |
| 2 | `.notebook` | B (puis A), C | le plus répandu en classe ; structure vérifiée (ZIP + SVG) ; ne pas promettre D ; échantillons à élargir (traits, questionnaires) avant de fixer le niveau |
| 3 | `.flipchart` | B (lecteur ActCraft porté), pas de C ni D | binaire propriétaire ; lecture seule ; ActCraft fournit la connaissance ; **à valider juridiquement** avant publication ; l'export `.iwb` d'ActivInspire reste la voie fidèle |
| 4 | `.olf` (myViewBoard) | A + C + D | JSON, le plus simple ; mais schéma incomplet (images, texte non vus) et propriété ViewSonic |
| 5 | `.ubz` (OpenBoard) | A + C | SVG ouvert ; faible base d'utilisateurs ; peu de risque ; à traiter avec `.iwb` car le rendu SVG est partagé |
| 6 | `.enb`, `.flp`, `.xbk`, `.gallery`, `.lynx` | aucun au départ | aucun échantillon, aucune doc ; renvoyer vers l'export PDF ou `.iwb` du logiciel d'origine |

Ordre de travail conseillé : (1) un lecteur SVG commun dans le cœur (sous-ensemble IWB, avec les extensions `ub:` et un dialecte SMART), car il sert `.iwb`, `.notebook` et `.ubz` ; (2) l'import `.iwb`, puis `.notebook` ; (3) l'export `.iwb` ; (4) le lecteur `.flipchart` ; (5) `.olf`. Chaque import produit un `.roomboard` (D24) ; l'édition du fichier d'origine n'est offerte que pour `.iwb`, `.olf` et `.ubz` (formats ouverts), et, avec avertissement et copie de sauvegarde, pour `.notebook`.

Réponse à la demande d'édition : « autorise l'édition des flipchart, Smart, myViewBoard » se traduit ainsi : on **édite toujours dans RoomBoard** après import, et on **exporte** vers `.iwb` (ouvert par les trois logiciels) ; l'enregistrement dans le format d'origine est un plus, réalisable pour `.olf` et `.notebook`, déconseillé pour `.flipchart`.

Chaque import affiche une liste d'avertissements (objets non lus), comme ActCraft (`FlipchartReadResult::warnings`, `flipchart.h:15`), et des fichiers synthétiques servent aux tests (ne pas committer de fichiers d'autrui ; les exemples téléchargés ici restent hors dépôt).

## 12. Sources

Fichiers lus (ActCraft, lecture seule) : `~/projets/actcraft/formats/src/flipchart.cpp`, `flipchartids.h`, `flipchartdump.cpp`, `bamboo.cpp`, `objectstream.cpp` ; `formats/include/actcraft/formats/bamboo.h`, `flipchart.h`, `objectstream.h` ; `bench/flipchart/main.cpp` ; `docs/specs/2026-10-14-livraison-complete-cadrage.md` (lignes 65-66, 126, 175-179, 306-317), `docs/specs/2026-10-17-livraison-complete-cadrage-amendement-1.md` (lignes 225-241, 251, 429-431) ; `docs/verifications/2026-10-18-lot4-principes.md`, `…lot7-principes.md`, `2026-10-21-lot8-principes.md` ; `docs/mesures/2026-10-22-lot11-fin.md`.

Pages et dépôts :
- IANA, enregistrement `application/vnd.smart.notebook` : https://www.iana.org/assignments/media-types/application/vnd.smart.notebook
- filext, fichiers NOTEBOOK : https://filext.com/file-extension/NOTEBOOK
- SMART, import CFF : https://support.smarttech.com/docs/software/notebook/notebook-19/en/importing-exporting-sharing/importing-cff-files.cshtml
- 1EdTech IWB/CFF : https://1edtech.org/standards/iwb-cff ; spécification finale : https://www.imsglobal.org/node/53086
- ViewSonic, gestion de fichiers : https://www.viewsonic.com/solution/kb/mvb30-file-management ; conversion OLF : https://www.viewsonic.com/solution/kb/en_US/other-resources/file-conversion-request-olf
- BenQ EZWrite 6, formats : https://www.benq.com/en-us/education/user-manual/software/ezwrite-6-whiteboard/supported-file-formats.html
- HandWiki, ActivStudio : https://handwiki.org/wiki/Software:Activstudio
- Promethean, conversion flipchart : https://learn.prometheanworld.com/articles/new-flipchart-conversion-on-explain-everything-web-and-promethean-activsuite/
- Fiche ActivInspire 8.8 : https://cdn.shopify.com/s/files/1/0753/1197/2628/files/ActivInspire_SS_1123v8.8_EN_INTL.pdf
- Clevertouch / Boxlight Lynx : https://boxlight.com/products/apps-for-the-classroom/lynx-whiteboard ; https://filext.com/file-extension/LYNX
- OpenBoard (GPL-3.0) : https://github.com/OpenBoard-org/OpenBoard (fichiers `src/adaptors/UBImportCFF.cpp`, `UBExportCFF.cpp`, `UBExportDocument.cpp`, `src/core/UBPersistenceManager.cpp`, `src/core/UBSettings.cpp`, `plugins/cffadaptor/src/UBCFFConstants.h`, `UBCFFAdaptor.cpp`)
- `evandromr/SMARTNotebook2PDF` (MIT) : https://github.com/evandromr/SMARTNotebook2PDF
- `Pesc0/ubztopdf` (GPL-3.0) : https://github.com/Pesc0/ubztopdf
- `horsemeatlasagne/olf-converter` (sans licence) : https://github.com/horsemeatlasagne/olf-converter

Fichiers téléchargés (jamais exécutés, lus par scripts `python3 -I` dans `~/telechargements-roomboard/_scripts/` : `inspecter-zip.py`, `montrer-entree.py`, `svg-tags.py`, `olf-elements.py`, `lire-bamboo.py`, `entree-bamboo.py`, `lister-depots.py`) :
- `~/telechargements-roomboard/flipchart/History_Industrial_revolution_with_film.flipchart` : https://dialogueiwb.educ.cam.ac.uk/evaluate/teachersmaterials/downloads/secondary_middle/History_Industrial_revolution_with_film.flipchart (Dialogue IWB, Université de Cambridge, ressource enseignante, licence non précisée).
- `~/telechargements-roomboard/notebook/Maths_Shape_behind_the_box.notebook`, `Science_bottle_of_truth.notebook`, `History_Romans_Mosaics.notebook` : https://dialogueiwb.educ.cam.ac.uk/evaluate/teachersmaterials/downloads/primary/ (même site, même réserve de licence).
- `~/telechargements-roomboard/olf/analisis.olf` et `convert.py.txt` : https://raw.githubusercontent.com/horsemeatlasagne/olf-converter/main/ (dépôt sans licence ; contenu d'un tiers, usage limité à l'inspection locale).
- `~/telechargements-roomboard/_recherche/` : sorties de recherche GitHub et pages HTML de recherche d'échantillons ; sources de l'OpenBoard `ob-*.txt`.
- Aucun fichier propriétaire copié dans le worktree ; ces fichiers ne doivent pas entrer dans le dépôt public.

## 13. Vérifié / Supposé

**Vérifié**
- `.flipchart` : conteneur Bamboo et ses entrées (§ 3) sur un fichier réel ; images en TIFF.
- `.notebook` : ZIP + `imsmanifest.xml` + pages SVG + `images/` sur trois fichiers (Windows 1.0.92 et Mac 14.0) ; dialecte SVG ; page0 en base zéro pour Mac.
- `.olf` : ZIP à une entrée `content.json`, schéma des champs observés, traits seulement.
- `.ubz` et `.iwb` : structure d'après le code OpenBoard lu, constantes et chemins cités.
- IWB/CFF : contenu de la norme (page 1EdTech).
- Import par myViewBoard et EZWrite ; export de myViewBoard limité à `.olf`, PDF et images.
- ActCraft : fichiers, lignes et bornes citées ; écriture exclue.

**Supposé**
- `.flp` : compression « PKZip » (HandWiki) ; format de `.xbk`, `.gallery`, `.enb` (EasiNote), `.vboard`, `.lynx`.
- Traits d'encre, questionnaires, galeries dans `.notebook` ; images, textes, formes dans `.olf`.
- Compatibilité des crates Rust citées avec Wasm ; décodage TIFF suffisant en Wasm.
- Export `.iwb` d'ActivInspire et de SMART Notebook récents.
- Résultats chiffrés du banc ActCraft (écarts de miniatures) : non relus.
- Conséquences juridiques : à valider.

## 14. Questions ouvertes

1. Un juriste valide-t-il la publication d'un lecteur `.flipchart` et d'un lecteur `.notebook` dans un dépôt public (PolyForm Shield), par interopérabilité ? Jérôme a-t-il déjà tranché pour ActCraft ?
2. Licence 1EdTech de l'IWB/CFF : l'implémentation et la distribution d'un export sont-elles libres ?
3. Peut-on obtenir ou fabriquer des fichiers d'exemple récents : `.notebook` de SMART Notebook 22 (traits d'encre, questionnaires, galeries), `.iwb` exporté par SMART et par ActivInspire, `.ubz` d'OpenBoard 1.7, `.olf` avec images et texte ? Sans eux, niveaux A et C de `.iwb` et `.olf` restent supposés.
4. L'oracle d'ActCraft (écarts de miniatures) donne-t-il des chiffres relisibles ? Où se trouve `docs/re/format-flipchart.md` (ancien dépôt REA) pour porter les numéros de propriétés vers Rust ?
5. Faut-il un convertisseur TIFF / WMF / EMF en Rust pour que les images d'ActivInspire et de SMART s'affichent sur iPad ?
6. Jérôme veut-il l'édition dans le format d'origine pour `.notebook`, malgré le risque de perte, ou accepte-t-il « importer, éditer, exporter en `.iwb` » ?
7. Quelle part des utilisateurs visés a des `.flp`, `.enb`, `.lynx` ? Sans besoin avéré, ne pas investir.
