# Formats de documents et de médias dans RoomBoard : PDF, Office, 3D, images, vidéo

Étude technique du 2026-11-19. Périmètre : PDF, Word, Excel, PowerPoint, 3D, images, vidéo et audio, glisser-déposer. Les formats de tableau blanc (flipchart, Smart, myViewBoard) sont traités ailleurs.

Demande de Jérôme : « Prise en charge d'un max de formats directement en glisser déposer […] Dans la mesure du possible, autorise l'édition des flipchart, Smart, fichier myViewBoard, pdf, Word, Excel, PowerPoint. »

Légende : **V** = vérifié le 2026-11-19 sur une source citée dans « Sources » ; **S** = supposé (connaissance générale, non revérifiée). La section « Vérifié / Supposé » récapitule à la fin.

## 1. Conclusions en bref

- Un seul modèle tient pour tous les documents : **import en objet « fond » + dossier `assets/`**. Le PDF et les présentations deviennent des pages dont le fond est une image (comme ActCraft), l'original est gardé dans `assets/` pour un réexport. L'édition du contenu d'origine (texte d'un PDF, mise en forme d'un Word) est hors de portée ; l'**annotation par-dessus** est le seul niveau d'« édition » réaliste et honnête.
- **Aucune bibliothèque GPL/AGPL n'est nécessaire.** Le seul piège net : `mupdf` (AGPL-3.0, V), à exclure d'un dépôt PolyForm Shield public. FFmpeg complet, `x265`, `libheif` avec HEVC et `@ffmpeg/core` en GPL sont à éviter ou à garder hors de l'application (process externe de l'utilisateur).
- Priorité : images (navigateur) → PDF lu et annoté → vidéo/audio (`<video>`) → 3D (three.js) → Office par PDF via LibreOffice/Office installé (coque seulement) → Excel/Word « données » → formats rares (HEIC, FBX, RAW).

## 2. Tableau de synthèse

Poids : « Wasm » = ajout au module de la page ; « coque » = ajout à l'installeur Tauri ; « page » = JavaScript chargé à la demande. Les poids marqués ≈ sont **S** (ordre de grandeur, non mesuré, aucun build n'a été lancé).

| Format | Lecture | Édition | Web (iPad) ou coque | Bibliothèque retenue | Licence | Poids |
|---|---|---|---|---|---|---|
| PDF | pages en image (+ texte sélectionnable en option) | annotation par-dessus, réexport PDF annoté ; pas d'édition du texte | web et coque | pdf.js (`pdfjs-dist` 6.5.438) ; PDFium en repli de coque | Apache-2.0 (V) | page ≈ 1 à 3 Mo (S) |
| PDF (écriture) | — | export des pages de RoomBoard en PDF vectoriel | web et coque | `krilla` 0.8.2 (Rust, Wasm) ; `pdf-lib` 1.17.1 (TS) pour fusionner/annoter l'original | MIT OU Apache-2.0 (V) ; MIT (V) | Wasm ≈ 0,5 à 1,5 Mo (S) |
| .docx | page en image par PDF ; ou texte brut/HTML | non (réécriture du fichier d'origine seulement via Office) | coque pour le rendu fidèle ; web : texte seulement | LibreOffice headless / Word (COM) ; `docx-preview` 0.4.1 en repli web | MPL-2.0 (S) ; Apache-2.0 (V) | 0 (externe) ; page ≈ 1 Mo non empaqueté (V pour 978 Ko) |
| .doc, .odt | idem, par LibreOffice seulement | non | coque | LibreOffice headless | MPL-2.0 (S) | 0 (externe) |
| .xlsx / .ods / .xls / .csv | tableau de cellules (valeurs), ou page en image | non pour les formules ; copie des valeurs en objet « tableau » | web et coque | `calamine` 0.38.0 (lecture, Rust/Wasm) ; `umya-spreadsheet` 4.0.0-beta.1 pour écrire | MIT (V) ; MIT (V) | Wasm ≈ 0,3 à 1 Mo (S) |
| .pptx | diapositives en image par PDF ; objets non | non (import figé) | coque (LibreOffice, PowerPoint COM) ; web : voir § 6 | LibreOffice headless / PowerPoint COM | MPL-2.0 (S) | 0 (externe) |
| .ppt / .odp | idem | non | coque | LibreOffice headless | MPL-2.0 (S) | 0 (externe) |
| OBJ+MTL, STL, glTF/GLB, PLY | objet 3D tournant dans un élément du canvas | transformer (position, rotation, échelle) ; pas d'édition du maillage | web et coque | `three` 0.187.0 et ses chargeurs | MIT (V) | page ≈ 0,6 à 1 Mo minifié (S) |
| 3MF | idem | idem | web et coque | chargeur 3MF de three.js (`fflate` pour le ZIP) | MIT (V pour fflate) | + ≈ 30 Ko (S) |
| FBX | idem, rendu partiel | non | web et coque | chargeur FBX de three.js ; sinon conversion hors ligne en glTF | MIT (S) | + ≈ 100 Ko (S) |
| PNG, JPEG, GIF, WebP, BMP, ICO, SVG | décodage natif du navigateur | image placée, rognage, pivotement ; pas de retouche | web et coque | `<img>` / `createImageBitmap` ; GIF animé : `ImageDecoder` ou image DOM | — | 0 |
| AVIF | décodage natif selon WebView | idem | web (Safari 16+ S) ; coque : voir § 7 | natif ; repli `@jsquash/avif` 2.1.1 (Wasm) | Apache-2.0 (V) | repli ≈ 0,5 Mo (S) |
| HEIC/HEIF | **pas de décodage natif sous WebView2/WebKitGTK** (S) ; Safari oui (S) | idem | web iPad : natif (S) ; coque : repli | repli : `libheif-js` 1.23.5 ou `heic-to` 1.6.7 ; ou crate `libheif-rs` 3.0.0 (liaison MIT, mais libheif LGPL-3.0) | **LGPL-3.0 (V)** ; MIT (V) pour la liaison | libheif-js ≈ 1,5 à 3 Mo (S) |
| TIFF | non natif (hors Safari, S) | idem | conversion | `utif2` 4.1.0 (TS) ou crate `tiff` 0.11.3 | MIT (V) ; MIT (V) | ≈ 50 Ko (S) / Wasm ≈ 0,3 Mo (S) |
| RAW (CR2, NEF, DNG…) | aperçu JPEG embarqué | non | coque | l'aperçu JPEG intégré, sinon crate `rawler` 0.8.0 | **LGPL-2.1 (V)** | — |
| MP4 (H.264/AAC), WebM, MOV, MKV, AVI, MP3, WAV, OGG | `<video>` / `<audio>` du navigateur ; codecs selon la WebView | lecture, découpe en début/fin éventuelle ; pas de montage | web et coque | élément `<video>` ; **pas de ffmpeg embarqué** | — | 0 |

## 3. PDF

### Lecture
- **pdf.js** (Mozilla, Apache-2.0 V) : rendu de page sur canvas dans la page, couche texte sélectionnable, extraction de texte. Fonctionne dans tout navigateur, donc **sur l'iPad** (S : un Worker et une mémoire de page suffisent). Poids npm déballé 37,6 Mo (V) mais cela inclut cartes de caractères, polices et sources ; le bundle utile est bien plus petit (S). Fichier d'essai : `~/telechargements-roomboard/pdf/tracemonkey.pdf` (6 pages, 1,0 Mo, non ouvert par du code).
- **PDFium** via `pdfium-render` 0.9.5 (MIT OU Apache-2.0, V) : lie PDFium à l'exécution ; peut être compilé en Wasm à condition d'empaqueter un module PDFium Wasm à part (V, README). Les builds Wasm de `pdfium-binaries` ont un tas non extensible : plantage mémoire sur un PDF de plus de quelques pages ; recommandation du README : les builds de `pdfium-lib` (V). PDFium lui-même : BSD-3-Clause OU Apache-2.0 (V par ActCraft, `THIRD_PARTY_NOTICES.md:261`). Avantage : fidélité de Chrome, annotations et formulaires, **modification de page** (texte, objets) via l'API. Coût : un binaire natif par plateforme dans la coque, ou un module Wasm de plusieurs Mo (S).
- **hayro** 0.9.0 (Apache-2.0 OU MIT, V) : rendu pur Rust, compilable en Wasm ; l'auteur annonce que « presque tout PDF qui s'affiche dans Chrome ou Firefox s'affiche correctement » (V, README) mais texte sélectionnable, recherche, annotations et formulaires ne sont pas dans le périmètre de l'outil de démonstration. Intéressant pour un rendu **dans le cœur Rust** sans JavaScript ; jeune, à éprouver (S).
- **`mupdf` 0.8.0 : AGPL-3.0 (V, crates.io et README de mupdf-rs).** À ne pas lier : MuPDF est AGPL (ou licence commerciale Artifex, S). **Écarté.**
- **`lopdf` 0.47.0** (MIT, V) : lecture et écriture de la structure PDF (objets, pages, flux) sans rendu ; utile pour fusionner, extraire une page, ajouter une annotation. Compilable en Wasm (S).

### Écriture et annotation
- **Export des pages RoomBoard en PDF** : `krilla` 0.8.2 (MIT OU Apache-2.0, V) produit un PDF vectoriel (polices incorporées, SVG via `krilla-svg`, PDF/A et PDF/UA) ; ou `pdf-writer` 0.15.0 (même licence, V) en plus bas niveau. Ink en courbes remplies : conversion directe des contours `freedraw`.
- **Annoter un PDF existant et le réexporter** : deux voies.
  1. *Aplatir* : chaque page du PDF d'origine devient l'image de fond (§ ActCraft), l'encre RoomBoard est tracée par-dessus, l'export redessine l'image + l'encre. Simple, mais le texte du PDF d'origine devient une image dans l'export (perte de la sélection, du poids plus élevé).
  2. *Annoter vraiment* : garder l'original dans `assets/` et, à l'export, **superposer le contenu RoomBoard à chaque page de l'original** (`pdf-lib` 1.17.1 MIT V, ou `lopdf`, ou PDFium) ; le texte et les vecteurs d'origine sont conservés. Recommandé pour l'export ; plus de code (S : quelques jours).
- **Édition du texte d'un PDF** : quasi impossible de façon fiable (un PDF ne stocke pas de paragraphes ni de flux de texte). PDFium permet de modifier des objets texte un à un (V : `PdfPageTextObject::set_unscaled_font_size`, `set_charcodes`), mais pas de recomposer. **Non recommandé** ; le dire clairement à l'utilisateur.
- `@cantoo/pdf-lib` 2.11.1 (MIT, V) est un fork maintenu de `pdf-lib` (dernier tag de `pdf-lib` d'origine : 1.17.1, publié en 2021, S).

### iPad
Tout le chemin pdf.js + `pdf-lib` + `krilla` Wasm fonctionne dans la page (S). Limite : mémoire de Safari iPad pour les PDF volumineux ou de grandes pages (S) : rendre à la demande, une page à la fois, et libérer le canvas.

## 4. Office : Word, Excel, PowerPoint

**Constat de fond** : aucun moteur Office n'existe en Wasm pour un rendu fidèle (V sur ce qui a été trouvé ; S sur l'absence d'une solution mûre et libre). Fidélité = un vrai moteur (Microsoft Office, LibreOffice) lancé hors de la page, donc **sur la coque seulement**.

### Voie A : conversion en PDF par un programme installé (coque)
- **LibreOffice headless** : `soffice --headless --convert-to pdf --outdir <dossier> <fichier>` avec un profil temporaire `-env:UserInstallation=file:///…` (sans lui, avec LibreOffice déjà ouvert, la commande part à l'instance ouverte et ne produit rien : constat d'ActCraft, V). Lance un process externe (aucune liaison, donc aucun problème de licence : LibreOffice MPL-2.0, S ; l'utilisateur l'installe). Couvre .docx, .doc, .odt, .xlsx, .xls, .ods, .pptx, .ppt, .odp (S).
- **Microsoft Office par COM** (Windows) : PowerPoint pour .pptx/.ppt (script d'ActCraft), Word et Excel de même avec `ExportAsFixedFormat` (S). Fidélité maximale. Windows seulement, Office payant et installé.
- macOS et Linux : seulement LibreOffice (S). Pas d'Office COM.
- Puis **import du PDF obtenu** comme un PDF ordinaire : une page par diapositive, une page par page de document.
- Prix : 5 à 60 s par fichier et un délai à borner (ActCraft : 120 s, V) ; LibreOffice n'est pas fourni (50 à 400 Mo, S), il faut un message clair « installez LibreOffice ou Microsoft Office » quand rien n'est trouvé.

### Voie B : lecture en objets, sans moteur
- **Word** : `docx-preview` 0.4.1 (Apache-2.0, V ; dépend de `jszip` seul) rend un .docx en HTML dans la page ; fidélité moyenne (S). `mammoth` 1.13.0 (BSD-2-Clause, V) extrait un HTML sémantique, sans mise en page. `docx-rs` 0.4.22 (MIT, V) lit/écrit du .docx en Rust (écriture surtout).
- **Excel** : `calamine` 0.38.0 (MIT, V) lit .xlsx/.xls/.ods/.csv en valeurs (pas de recalcul des formules, S) ; `umya-spreadsheet` 4.0.0-beta.1 (MIT, V, **bêta**) lit/écrit .xlsx avec styles. Côté TypeScript : `exceljs` 4.4.0 (MIT, V) ; **SheetJS** `xlsx` : le paquet npm `xlsx` reste à 0.18.5 sous Apache-2.0 (V) ; la version courante de SheetJS n'est plus publiée sur npm mais sur leur propre site (S), et 0.18.5 a des vulnérabilités corrigées plus tard (S) : préférer `calamine` Wasm ou `exceljs`. `hyperformula` 3.5.0 (moteur de formules) est **GPL-3.0-only (V) : écarté** (licence commerciale seulement, S).
- **PowerPoint** : `pptx-preview` 1.0.7 (ISC, V ; dépend de `echarts`, `lodash`) rend un .pptx dans la page ; fidélité faible à moyenne (S). `pptxgenjs` 4.0.1 (MIT, V) crée des .pptx.
- **Objets éditables** (formes, texte, images du .pptx convertis en objets RoomBoard) : un lecteur à écrire (ECMA-376, ≈ 180 formes prédéfinies et thèmes : estimation d'ActCraft, `amendement-1.md:233`, V pour la citation) ; coût élevé, fidélité jamais complète. **Non recommandé comme première étape.**

### Édition
| Niveau | Faisable ? | Prix |
|---|---|---|
| Annoter les pages importées en image | oui | gratuit (même mécanisme que le PDF) |
| Modifier le texte d'une diapositive/page dans RoomBoard | non (objets non importés) | lecteur ECMA-376 complet |
| Réécrire le fichier d'origine (.docx/.xlsx/.pptx) | par Office/LibreOffice seulement : ouvrir le fichier dans l'application d'origine (`tauri-plugin-opener`, S) puis réimporter | hors RoomBoard |
| Exporter une présentation RoomBoard en .pptx | oui, de pages-images (`pptxgenjs` MIT V) ; sans objets | faible |

Proposition honnête : « Modifier dans l'application d'origine » (ouvrir le fichier d'origine gardé dans `assets/`, surveiller son enregistrement, réimporter) plutôt qu'un éditeur Office interne (S : surveillance de fichier via le plugin `fs`).

### iPad / web
Pas de LibreOffice ni de COM. Reste la voie B, de fidélité moindre, ou l'import d'un **PDF exporté à l'avance** (message « exportez en PDF depuis Office »). Une conversion côté serveur n'est pas retenue : RoomBoard est hors ligne (D27).

## 5. 3D

- **three.js** 0.187.0 (MIT, V), dans la page. Chargeurs officiels (dossier `examples/jsm/loaders/`, S) : `OBJLoader` + `MTLLoader`, `STLLoader`, `GLTFLoader` (+ `DRACOLoader`, `KTX2Loader`), `PLYLoader`, `FBXLoader`, `3MFLoader`. Tous dans le même dépôt MIT (S).
- **Où le rendre ?** Le canvas de la page est en 2D (Canvas 2D). Trois options :
  1. **Un canvas WebGL hors écran, copié** dans le canvas 2D à chaque image (`drawImage`) : simple, un contexte WebGL par objet 3D visible, limite de contextes sur iPad (≈ 8 à 16, S) : partager **un seul** rendu pour tous les objets 3D.
  2. Un élément DOM superposé au canvas : plus simple pour l'interaction, mais casse l'ordre en Z avec l'encre.
  3. Un instantané statique (PNG) hors interaction, régénéré à la fin du geste de rotation : le moins cher, rend la page légère.
  Recommandé : option 1 avec un rendu partagé, instantané en image quand l'objet n'est pas sélectionné.
- **Stockage** : le fichier d'origine dans `assets/` (empreinte SHA-256) ; l'état de l'objet dans le CRDT : transformation, caméra (orbite), éventuellement échelle. Les textures référencées par OBJ/MTL et glTF séparé (`.bin`, images) : l'import doit gérer un **dossier de fichiers liés** ; un glisser-déposer d'un `.obj` seul perd ses textures (S : prévoir un message, et glisser plusieurs fichiers ensemble, ou un ZIP).
- **FBX** : format propriétaire d'Autodesk ; le chargeur de three.js lit les cas courants, pas tous (S). Alternative : demander une conversion en glTF.
- **Édition** : transformations seulement ; pas d'édition du maillage.
- **iPad** : WebGL 2 sous Safari (S) ; textures lourdes de glTF sont le risque mémoire. Échantillon : `~/telechargements-roomboard/3d/DamagedHelmet.glb` (3,8 Mo) et `Box.glb` (1,7 Ko), tirés de Khronos glTF-Sample-Assets.
- **Autres bibliothèques** : `gltf` 1.4.1 (MIT OU Apache-2.0, V), `tobj` 4.0.5 (MIT, V), `stl_io` 0.11.0 (MIT, V), `ply-rs` 0.1.3 (MIT, V ; **dernière version 2020**) pour un décodage côté Rust ; non nécessaires si three.js lit les fichiers. `occt-import-js` 0.0.23 (LGPL-2.1, V) pour STEP/IGES : **LGPL en Wasm = liaison statique de fait, à éviter** (S).

## 6. Images

### Décodage
- **Le navigateur décode, RoomBoard ne ré-embarque pas de décodeur** (réduit le Wasm et profite de l'accélération matérielle ; S). API : `createImageBitmap(blob)` hors du fil principal, `<img>.decode()`. GIF animé : `ImageDecoder` (WebCodecs) sous Chromium, sinon un `<img>` caché dont on copie les images (S) ; l'animation dans un canvas demande un recadencement par RoomBoard.
- **Matrice par WebView (tout S, à vérifier par essai sur chaque plateforme)** : PNG, JPEG, GIF, WebP, BMP, ICO, SVG partout. AVIF : WebView2 (Chromium) oui ; WKWebView macOS 13+ et iPadOS 16+ oui ; WebKitGTK dépend de la version de WebKitGTK et de `libavif`/`libheif` du système. HEIC/HEIF : Safari/WKWebView oui (le décodeur HEVC est dans le système) ; WebView2 non sans l'extension Microsoft « HEIF Image Extensions » ; WebKitGTK non en général. TIFF : Safari seulement.
- **Repli en Wasm** pour HEIC et TIFF :
  - HEIC : `libheif-js` 1.23.5 et `heic-to` 1.6.7 sont **LGPL-3.0 (V)** ; `heic2any` 0.0.4 est MIT (V) mais embarque libheif (S : à vérifier) ; la crate `libheif-rs` 3.0.0 est MIT (V) mais **libheif est LGPL** (V, COPYING du dépôt `strukturag/libheif`). Le HEVC (`x265` est GPL, `libde265` LGPL, S) pose en plus un problème de brevets (S, voir ActCraft). **Recommandation : ne pas livrer HEIC en Wasm ; l'iPad le lit nativement (S), sur PC et Mac le décodeur du système suffit côté coque** (S : Windows `WIC`, macOS `ImageIO`, à passer par une commande Tauri).
  - TIFF : `utif2` 4.1.0 (MIT, V) ou la crate `tiff` 0.11.3 (MIT, V), léger.
- **Crate `image` 0.25.10** (MIT OU Apache-2.0, V) : formats par défaut AVIF, BMP, EXR, FF, GIF, HDR, ICO, JPEG, PNG, PNM, QOI, TGA, TIFF, WebP (V, README) ; **le décodage AVIF** demande `avif-native` (`dav1d` en C, S pour la licence BSD-2 de `dav1d`) ; sans elle `image` encode AVIF (`ravif` 0.13.0, BSD-3-Clause, V) seulement. Utile pour la **vignette et la réduction** de grosses images dans le cœur (S) ; n'ajoutez pas ses décodeurs en plus de ceux du navigateur sans besoin mesuré.
- **SVG** : navigateur pour l'affichage ; `resvg` 0.50.0 (Apache-2.0 OU MIT, V) en Rust/Wasm pour le **rendu stable** et l'export PDF (`krilla-svg`, V). Attention : un SVG peut contenir des scripts ou des liens externes : l'afficher **par `<img>` ou `createImageBitmap` seulement, jamais en DOM** (S).
- **RAW** : l'aperçu JPEG intégré à la plupart des RAW suffit pour un tableau blanc (S) ; `rawler` 0.8.0 et `rawloader` 0.37.2 sont **LGPL-2.1 (V)** : liaison statique en Wasm à éviter ; en coque, binaire dynamique (S). Non prioritaire.

### Stockage
Image gardée telle quelle dans `assets/` sous `sha256-<hex>.<ext>` (pas de ré-encodage : conserve l'original). Réduction automatique au-delà d'une taille (par ex. 4096 px) : à décider (question ouverte).

## 7. Vidéo et audio

- **`<video>` / `<audio>`** de la WebView, source `Blob`/`URL.createObjectURL` ou, en coque, `convertFileSrc` d'un chemin (S). Codecs : WebView2 lit H.264/AAC, VP9, AV1, WebM, MP3 (S) ; HEVC avec l'extension système ; WKWebView lit H.264/HEVC/AAC/ALAC/MOV/MP4, mais **ne lit pas WebM/Opus de façon complète avant Safari 17-18** (S) ; WebKitGTK passe par **GStreamer** : les codecs dépendent des greffons installés sur la machine de l'utilisateur (S). MKV et AVI : **pas lus par les navigateurs** dans l'ensemble (S : MKV avec H.264 parfois lu par Chromium).
- **Transcodage** : **ffmpeg n'est pas retenu.** `@ffmpeg/ffmpeg` 0.12.15 est MIT (V) mais `@ffmpeg/core` 0.12.10 est **GPL-2.0-or-later (V, npm)** : à exclure d'une page PolyForm. FFmpeg natif : LGPL-2.1+ ou GPL selon la configuration (V par ActCraft, `THIRD_PARTY_NOTICES.md:314-327` : la configuration LGPL de Qt, vérifiée par un script de licence). Les brevets H.264/AAC/HEVC s'y ajoutent (V, ActCraft, `THIRD_PARTY_NOTICES.md:303`). Option propre : si `ffmpeg` est déjà installé chez l'utilisateur, **le lancer comme process externe** (aucune liaison) pour convertir les MKV/AVI ; sinon message « format non pris en charge par cet appareil ».
- `mediabunny` 1.66.2 (MPL-2.0, V) : lecture, conversion et écriture de conteneurs en TS par WebCodecs, sans ffmpeg (S : fonctionnement) ; MPL-2.0 est compatible avec une liaison (copyleft par fichier) ; **piste à essayer** pour MKV→MP4 sans recompresser quand les codecs sont natifs (S).
- **Stockage et poids** : une vidéo de plusieurs centaines de Mo ne doit pas gonfler le `.roomboard` ni la mémoire. Proposition : < 50 Mo dans `assets/` (S : seuil à décider) ; au-delà, **lien vers le chemin d'origine** (coque seulement, avec chemin relatif + empreinte pour détecter un changement) et avertissement « vidéo non incluse dans le fichier ». Sur l'iPad (pas de chemin durable), la vidéo doit être dans `assets/` ou rester une URL.
- **Lecture dans le canvas** : dessiner l'élément `<video>` dans le canvas 2D à chaque image (`drawImage`) ; le contrôle (lecture, pause, volume) est un habillage RoomBoard. Sur iPad, la lecture en ligne demande un geste de l'utilisateur (S).
- **Édition** : début/fin (« rogner »), volume, boucle ; pas de montage.

## 8. Glisser-déposer

- **Navigateur** (web et iPad) : événements `dragenter`/`dragover`/`drop` sur le canvas ; `event.dataTransfer.files` (objets `File`) et, pour les dossiers, `DataTransferItem.webkitGetAsEntry()` (S). **Sur l'iPad** : le glisser-déposer existe depuis iPadOS 11 entre applications, avec Safari (S), mais il n'y a pas de chemin de fichier et la sélection passe aussi par `<input type="file" multiple>` : **prévoir les deux** (le second est déjà `FileHost` de repli, D26). `showOpenFilePicker` : Chromium seulement.
- **Tauri 2** : la fenêtre capte le dépôt de fichiers et envoie un `DragDropEvent` (enter / over / drop / leave) avec **les chemins** (V : docs de `tauri-utils`, `config.rs`, champ `dragDropEnabled`). Point d'attention vérifié dans cette doc : **sous Windows, activer ce gestionnaire remplace celui de WebView2, ce qui désactive le glisser-déposer HTML5 de la page** ; pour le garder, il faut mettre `dragDropEnabled: false` (V). Choisir : (a) laisser l'événement natif de Tauri (chemins complets, lecture par `plugin-fs`, pas de copie en mémoire), perdre le glisser-déposer HTML5 sous Windows (glisser une image depuis une page web ou une vignette interne) ; (b) l'inverse. Recommandation : **(a)** et un chemin `paste`/`drop` de contenu web séparé par `<input>` (S). À essayer sur Windows, macOS et Linux (S : comportements différents).
- **Dans `FileHost` (D26)** : ajouter `onDrop(handler)` qui rend des `DroppedFile {name, size, mime, read(): Promise<Uint8Array>, path?: string}` ; le chemin n'existe qu'en coque. Un seul pipeline d'import après : détection par **octets magiques** (pas par extension) puis choix du module (`import/pdf`, `import/image`, `import/3d`, `import/video`, `import/office`).
- **Stockage dans `assets/` (D24)** : calcul SHA-256 en flux (`crypto.subtle.digest` n'est pas incrémental : le sécable en blocs demande une bibliothèque Rust `sha2` en Wasm, S) ; nom `assets/<sha256>.<ext>` ; dédoublonnage par empreinte ; un seul élément du manifeste par fichier (nom d'origine, type, taille, empreinte, origine liée ou non). Le `.roomboard` reste un ZIP (D25) : **les médias déjà compressés (JPEG, MP4) se stockent sans recompression** (méthode « stored », S).
- **Taille maximale** : la page web charge le fichier en mémoire (`ArrayBuffer`) : sur iPad, quelques centaines de Mo plantent l'onglet (S). Seuils proposés à décider : 100 Mo par fichier sur le web/iPad, pas de limite fixe en coque (lecture par flux). Pour la coque, une vidéo lourde reste **liée** (§ 7).
- **Sécurité** : le contenu déposé est non fiable ; ne jamais exécuter un fichier ; limiter les pixels d'une image décodée (ActCraft : 100 millions de pixels par page, V) ; limiter le nombre de pages d'un PDF importé en une fois ; dépôt en lot par une file avec annulation.

## 9. Acquis ActCraft

Fichiers lus (lecture seule) dans `/home/adminjd/projets/actcraft` :

- **Import PDF** (`export/src/pdfimport.cpp`, 141 lignes) : Qt PDF (`QPdfDocument`, donc PDFium) derrière l'option CMake `ACTCRAFT_IMPORT_PDF` (désactivée si le module manque, par exemple Android). Chaque page est rendue en **PNG** à un DPI borné (36 à 600), page de 96 dpi logique, image **verrouillée en couche Fond** ; limite de 100 millions de pixels par page ; refus des PDF chiffrés (« Ce PDF est protégé ») ; messages d'erreur en français ; exécution **asynchrone** dans un fil. Choix net : **un PDF devient une pile d'images, pas d'objets**.
- **Export PDF** (`export/src/pdfexport.cpp`, 104 lignes) : `QPdfWriter` + le même `paintPage` que l'écran, pages de tailles différentes autorisées, marges nulles, fond blanc. Une fonction de peinture partagée sert l'écran, la vignette, l'image et le PDF (`docs/specs/2026-10-14-livraison-complete-cadrage.md`, DA5 et DA12). `countPdfPages` compte par expression régulière (suffisant pour un test, S pour le reste). Leçon : **un seul code de rendu** pour l'écran et l'export ; RoomBoard a cela en Rust/Canvas 2D à vérifier (DA10).
- **PowerPoint** (`export/resources/pptx-to-pdf.ps1`, 49 lignes ; `export/src/officeconvert.cpp`) : conversion en PDF puis import PDF. Ordre des convertisseurs : variable de test, LibreOffice (`soffice` dans le PATH, puis chemins connus macOS/Windows), enfin PowerPoint par COM (détecté dans le registre `HKCR\PowerPoint.Application`). Le script PowerShell prend les chemins par **variables d'environnement** (aucune interpolation dans une ligne de commande), ouvre en **lecture seule, sans fenêtre**, réutilise l'instance PowerPoint ouverte de l'utilisateur et ne ferme que ce qu'il a lancé ; délai de 120 s, dossier temporaire supprimé, profil LibreOffice jetable. Arguments passés en **liste** (jamais par un interpréteur de commandes). Prérequis dit : `docs/specs/2026-10-17-livraison-complete-cadrage-amendement-1.md:233` (PowerPoint « en images » par convertisseur installé, « en objets » : lecteur à écrire, ≈ 180 formes, estimé « É », c'est-à-dire élevé) ; `docs/plans/2026-10-18-livraison-complete-lot5b-PLAN.md:499-526`, `docs/plans/2026-10-18-livraison-complete-lot5-PLAN.md:20, 2433, 2591` (hypothèse H5-3 : convertisseur installé, non livré).
- **Médias** : lecture par le système (décision N2-9 : « Sons et vidéos des documents ouverts par l'application du système », puis Qt Multimedia ajouté plus tard avec FFmpeg LGPL livré dynamiquement, `THIRD_PARTY_NOTICES.md:305-331`) ; avis de brevets H.264/AAC (`THIRD_PARTY_NOTICES.md:303`) : ActCraft n'a pas de licence de brevets, chaque utilisateur vérifie. Un script contrôle que les bibliothèques FFmpeg livrées ont bien la licence LGPL attendue (`scripts/verifier-licences.ps1`, cité par les notices).
- **Licences** : Qt PDF (LGPL-3.0, dynamique) + PDFium (BSD-3-Clause OU Apache-2.0) + FreeType (FTL), libjpeg-turbo, libpng, OpenJPEG, Little CMS, etc. : liste intégrale dans `THIRD_PARTY_NOTICES.md:250-290`. Leçon : **tenir un fichier de notices vérifié par un script**, dès la première bibliothèque.
- **Impression** par PDF (N1-15), pas de boîte d'impression.

Ce qu'ActCraft n'a pas : édition d'un PDF importé, Word et Excel, 3D, HEIC, version web.

## 10. Recommandation pour RoomBoard (ordre de priorité)

1. **Images** (PNG, JPEG, GIF, WebP, SVG, BMP, ICO ; AVIF si la WebView le lit) : décodage par le navigateur, pipeline de dépôt + `assets/` + empreinte. Le plus de valeur, le moins de code.
2. **PDF en lecture + annotation** : pdf.js dans la page (Apache-2.0, web et coque), une page = un fond verrouillé ; l'original gardé dans `assets/`. **Export PDF annoté** par superposition à l'original avec `pdf-lib` (V pour la licence) et, pour les pages purement RoomBoard, `krilla` en Wasm. PDFium (`pdfium-render`) seulement si pdf.js se révèle trop lent ou imprécis (essai à mener).
3. **Vidéo et audio** par `<video>`/`<audio>` ; vidéo lourde liée en coque ; aucun transcodage embarqué.
4. **3D** (glTF/GLB, OBJ+MTL, STL, PLY d'abord ; 3MF et FBX ensuite) avec three.js, un rendu WebGL partagé, rotation par orbite.
5. **Office par PDF** sur la coque : LibreOffice headless puis Office par COM (Windows), sur le modèle d'ActCraft ; sur le web/iPad, message « exportez en PDF ». Bouton « Modifier dans l'application d'origine » avec réimport.
6. **Excel/Word en objets simples** : `calamine` Wasm pour afficher un tableau de valeurs ; `docx-preview` pour un aperçu HTML. Optionnel.
7. **Rares ou lourds** : HEIC (natif iPad/Mac ; sur PC par commande système), TIFF (`utif2`), RAW (aperçu JPEG), FBX (conversion en glTF).

À éviter explicitement dans un dépôt PolyForm Shield public : `mupdf` (AGPL-3.0), `hyperformula` (GPL-3.0), `@ffmpeg/core` (GPL-2.0+), FFmpeg GPL, `x265`, et toute LGPL **liée statiquement** (Wasm : `libheif-js`, `heic-to`, `occt-import-js`, `rawler`). Une LGPL liée dynamiquement en coque (comme Qt PDF/FFmpeg d'ActCraft) est possible (S : demande un avis de licence et la possibilité de remplacer la bibliothèque ; point juridique non tranché). Une licence PolyForm Shield n'est pas une licence « libre » au sens de la FSF (S) : une LGPL-3.0 exige de permettre la modification et le remplacement, ce qui reste à vérifier avec un juriste.

## 11. Questions ouvertes

1. **Seuil de taille** des fichiers dans `assets/` et sur l'iPad ; vidéo liée ou incluse par défaut ?
2. **Rendu 3D dans le canvas** : copie d'un canvas WebGL partagé ou superposition DOM ? À prototyper sur iPad.
3. **Glisser-déposer Tauri** : garder l'événement natif (chemins) ou le glisser-déposer HTML5 sous Windows ? Essai sur les trois systèmes.
4. **Export PDF annoté** : aplatir ou superposer à l'original ? Quel poids accepte-t-on ?
5. **Office** : accepte-t-on de dépendre de LibreOffice installé ? Qui l'installe (l'ENI de Jérôme) ? Prévoit-on l'import en objets plus tard ?
6. **HEIC** sur PC : passer par le décodeur du système (commande Tauri propre à chaque OS) ou refuser ?
7. **Avis juridique** sur toute LGPL en liaison dynamique avec une licence PolyForm Shield.
8. **Brevets** H.264/AAC/HEVC : même position qu'ActCraft (aucune licence prise, avertissement) ?
9. **pdf.js contre PDFium contre hayro** : mesure de vitesse et de mémoire sur le corpus de pdf.js et sur l'iPad.
10. Sécurité : confirmer une politique de rejet des PDF chiffrés (comme ActCraft) ou une demande de mot de passe.

## 12. Vérifié / Supposé

**Vérifié (2026-11-19)**
- Licences et versions courantes, lues sur crates.io (API) et le registre npm : `pdfium-render` 0.9.5 MIT OU Apache-2.0 ; `mupdf` 0.8.0 AGPL-3.0 ; `lopdf` 0.47.0 MIT ; `hayro` 0.9.0 Apache-2.0 OU MIT ; `krilla` 0.8.2 et `pdf-writer` 0.15.0 MIT OU Apache-2.0 ; `image` 0.25.10 MIT OU Apache-2.0 ; `calamine` 0.38.0, `docx-rs` 0.4.22, `libheif-rs` 3.0.0, `tiff` 0.11.3, `tobj`, `stl_io`, `ply-rs` MIT ; `umya-spreadsheet` 4.0.0-beta.1 MIT ; `gltf` MIT OU Apache-2.0 ; `ravif` BSD-3-Clause ; `resvg` 0.50.0 Apache-2.0 OU MIT ; `rawler`, `rawloader` LGPL-2.1 ; npm : `pdfjs-dist` 6.5.438 Apache-2.0 ; `pdf-lib` 1.17.1 et `@cantoo/pdf-lib` 2.11.1 MIT ; `docx-preview` 0.4.1 Apache-2.0 ; `xlsx` 0.18.5 Apache-2.0 ; `exceljs` MIT ; `mammoth` BSD-2-Clause ; `pptx-preview` ISC ; `pptxgenjs` MIT ; `three` 0.187.0 MIT ; `fflate`, `utif2` MIT ; `libheif-js`, `heic-to` LGPL-3.0 ; `heic2any` MIT ; `@jsquash/avif` Apache-2.0 ; `hyperformula` GPL-3.0-only ; `@ffmpeg/ffmpeg` MIT, `@ffmpeg/core` GPL-2.0-or-later ; `mediabunny` MPL-2.0 ; `occt-import-js` LGPL-2.1 ; `web-ifc` MPL-2.0.
- Fichiers LICENSE lus : pdf.js (Apache-2.0), docxjs (Apache-2.0), pdfium-binaries (MIT), pdfium-lib (MIT), pdfium-render (MIT/Apache), ffmpeg.wasm (MIT, mais le noyau a sa propre licence), libheif (LGPL).
- `pdfium-render` : compilable en Wasm avec un module PDFium Wasm à part, builds `pdfium-binaries` à tas non extensible (README).
- `image` : formats par défaut (README) ; décodage AVIF natif demande `avif-native`.
- Tauri : `dragDropEnabled` et son effet sur WebView2 (commentaire de `config.rs`).
- Ce qu'ActCraft fait (fichiers lus, § 9).
- Fichiers d'exemple téléchargés, **jamais ouverts ni exécutés**, vérifiés par `file` : `pdf/tracemonkey.pdf` (6 pages), `3d/Box.glb`, `3d/DamagedHelmet.glb`, `images/colors-animated.avif`, `images/C001.heic`.

**Supposé (aucune vérification faite)**
- Tous les poids en Wasm, en page et en coque ; les temps de conversion ; la place de LibreOffice.
- Licence MPL-2.0 de LibreOffice (connaissance générale), licence de FreeType/Three chargeurs.
- Matrice de codecs et formats d'image par WebView (WebView2, WKWebView, WebKitGTK), WebM sous Safari, HEVC, GStreamer.
- Comportement de l'iPad : glisser-déposer, limites mémoire, contextes WebGL, geste pour la vidéo.
- Fidélité de `docx-preview`, `pptx-preview`, `hayro`, `mediabunny` ; maintenance de `pdf-lib` ; vulnérabilités de SheetJS 0.18.5.
- Les API Tauri autres que `dragDropEnabled` (événement `onDragDropEvent`, `convertFileSrc`, plugins `fs`/`opener`).
- La compatibilité juridique d'une LGPL dynamique avec PolyForm Shield.
- Que `libheif-js`/`heic2any` embarquent HEVC (`heic2any` : non vérifié).
- Aucun essai de rendu n'a été exécuté (aucun build n'était permis).

## 13. Sources

Registres (consultés le 2026-11-19) : `https://crates.io/api/v1/crates/<nom>/versions` pour les crates citées ; `https://registry.npmjs.org/<paquet>/latest` pour les paquets npm cités. Copies : `~/telechargements-roomboard/meta-registres/`.

READMEs et licences lus :
- https://github.com/ajrcarey/pdfium-render (README, LICENSE.md)
- https://github.com/LaurenzV/hayro ; https://github.com/LaurenzV/krilla
- https://github.com/image-rs/image ; https://github.com/messense/mupdf-rs
- https://github.com/mozilla/pdf.js (LICENSE) ; https://github.com/VolodymyrBaydalka/docxjs (LICENSE)
- https://github.com/bblanchon/pdfium-binaries ; https://github.com/paulocoutinhox/pdfium-lib
- https://github.com/ffmpegwasm/ffmpeg.wasm ; https://github.com/strukturag/libheif (COPYING)
- https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-utils/src/config.rs (`drag_drop_enabled`)
- https://github.com/SheetJS/sheetjs (API licence : Apache-2.0)
- Échantillons : `mozilla/pdf.js/test/pdfs/tracemonkey.pdf` ; `KhronosGroup/glTF-Sample-Assets` (Box, DamagedHelmet) ; `AOMediaCodec/libavif/tests/data/colors-animated-8bpc.avif` ; `nokiatech/heif_conformance/conformance_files/C001.heic`. Copies dans `~/telechargements-roomboard/{pdf,3d,images}/`.

Fichiers du projet lus : `docs/plans/socle-cadrage.md` (D23-D27, D40, DA8) du worktree `/home/adminjd/projets/roomboard-wt/usage`.

ActCraft (`/home/adminjd/projets/actcraft`) : `export/src/pdfimport.cpp`, `export/src/pdfexport.cpp`, `export/src/officeconvert.cpp`, `export/resources/pptx-to-pdf.ps1`, `docs/specs/2026-10-14-livraison-complete-cadrage.md` (N2-9, N2-15, DA5, DA12), `docs/specs/2026-10-17-livraison-complete-cadrage-amendement-1.md:233`, `docs/plans/2026-10-18-livraison-complete-lot5-PLAN.md`, `docs/plans/2026-10-18-livraison-complete-lot5b-PLAN.md`, `THIRD_PARTY_NOTICES.md:250-331`, `CHANGELOG.md:80`.
