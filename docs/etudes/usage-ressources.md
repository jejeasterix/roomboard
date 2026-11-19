# Étude — Ressources, fragments et bibliothèque (RoomBoard)

Date : 2026-11-19. Statut : étude, aucune décision prise. Demande de Jérôme, mot pour mot : « un fichier aura sa propre extension, idem pour un objet ou groupe d'objet sur le paperboard aura également son extension compatible, permettant ainsi de créer des ressources, comme les .as4 de activ inspire. »

## Verdict

Un fragment (objets d'une page) et un document sont le même conteneur ZIP du format D24, distingués par `manifest.json` (`kind`). Un fragment est un document d'une page partielle : il s'ouvre comme fichier, et un `.roomboard` se glisse comme ressource. Recommandé : extension `.roomboard` gardée pour le document, `.rbitem` pour le fragment, `.rbpack` pour un paquet. Le point à ne pas rater : à l'insertion, tous les identifiants Yrs sont régénérés.

---

## 1. Sources

### Lues (vérifié)

- Cadrage du socle : `/home/adminjd/projets/roomboard-wt/usage/docs/plans/socle-cadrage.md` : D2 (schéma), D3 (identifiants `uuid_v4`), D24 (format natif), D25 (ZIP dans le cœur), D26 (`FileHost`), H1-1 (extension, § 4), § 7 (hors périmètre : images, imports, synchronisation).
- Code du format : `crates/roomboard-core/src/format/mod.rs` : constantes `FORMAT`, `FORMAT_VERSION = 1`, `EXTENSION = "roomboard"`, `MIME = "application/x-roomboard"`, `Manifest` {format, formatVersion, schema, appVersion, created, modified}, `save`, `load_with_manifest` (contrôle `format`, puis `formatVersion`, puis `schema`, avant de décoder `document.ybin`), `migrate`.
- Modèle d'objets : `crates/roomboard-core/src/element.rs` (`SCHEMA`, `Transform` affine, `ElementView`), `document.rs`, `commands.rs`, `query.rs`. Un élément est un `Y.Map` {`id`, `kind`, `transform`, style…} dans `pages[i].elements` ; `Document::from_update_v1` / `encode_v1`.
- Le socle ne définit ni groupe, ni presse-papiers, ni images, ni bibliothèque : tout cela est hors périmètre (§ 7) ou absent. Vérifié par recherche des termes « groupe », « presse-papiers », « copier », « coller » dans le cadrage : aucune décision.
- ActCraft (`/home/adminjd/projets/actcraft`, lecture seule) : voir § 2.
- ActivInspire, guide officiel Promethean (avril 2023, 125 pages), https://learn.prometheanworld.com/wp-content/uploads/2023/03/Getting-Started-with-ActivInspire_April23.pdf : « Installing the Resource Pack » (p. 12), « Adding to My Resources » (p. 44), « Shared Resources » (p. 45), recherche dans la Resource Library en ligne. Texte extrait par `pdftotext`.
- Promethean, pack de ressources `.as4a` : https://support.prometheanworld.com/s/article/1873?language=en_US et https://support.prometheanworld.com/s/article/1089?language=en_US (le pack est un `.as4a` de 246 Mo ; le Mac peut le renommer `.as4a.zip`, ce qui empêche l'import : retirer `.zip`). Déploiement réseau : https://www.edugeek.net/forums/topic/200490-activinspire-main-resource-pack-deployment/ (MSI, dossier partagé désigné par `admin.ini`).
- SMART Notebook, Gallery : https://support.smarttech.com/docs/software/notebook/notebook-16/en/using/inserting-and-sharing-content/using-the-gallery.cshtml ; export et import d'une collection : https://onlinehelp.smarttech.com/english/mac/help/notebook/10_0_0/NBExportingGalleryCollection.htm et https://onlinehelp.smarttech.com/english/linux/help/notebook/10_0_0/NBImportingGalleryCollection.htm.

### Non lues ou non obtenues

- Aucun fichier `.as4`, `.as4a` ou `.gallery` n'a été téléchargé ni ouvert : le pack fait 246 Mo, et aucun fichier d'exemple petit et public n'a été trouvé. `~/telechargements-roomboard/` n'a donc reçu aucun nouveau dossier. Le contenu interne reste supposé (§ 3.3).

## 2. Ce qu'ActCraft a fait et appris (vérifié, lecture seule)

ActCraft a déjà résolu l'essentiel de la question, en C++/Qt, avec son format `.actcraft`.

- **Un fragment est un document d'une seule page.** `formats/src/fragment.cpp:51-86` (`writeFragment`) construit un `core::Document` neuf à partir de la page source (taille, description, mots-clés ; fond et grille non copiés, lignes 72-77), y met les objets choisis et écrit tout avec l'écrivain natif `encodeActcraft`. Commentaire lignes 69-71 : « un document neuf, jamais celui d'origine élagué », sinon l'écrivain recopierait la table de ressources d'un autre cours.
- **Lecture stricte.** `readFragment` (`fragment.cpp:88-121`) : borne de taille, exactement une page (« %1 pages, une seule attendue »), et refus si une ressource est absente, illisible ou d'empreinte fausse (« refusé plutôt qu'inséré incomplet », lignes 103-108).
- **Fermeture des dépendances.** `closureForCopy` (`core/include/actcraft/core/clipboardedits.h:15`) ajoute les objets liés (connecteurs, etc.) ; les extrémités de connecteur hors sélection sont remises à 0. `clearDanglingTargets` (`fragment.cpp:31-43`) fait de même pour les actions qui visent un objet hors fragment (une cible hors fragment viserait « un objet sans rapport » dans un autre cours).
- **Identifiants renumérotés à l'insertion.** `prepareInsertion` (`fragment.cpp:123-131`) appelle `withFreshIds` (`core/include/actcraft/core/pageedits.h:23`), et l'identifiant 0 signale l'épuisement. Les cibles d'action internes suivent la renumérotation.
- **Ressources par empreinte, copiées si absentes.** `copyCitedResources` (`fragment.cpp:20-29`) ne recopie pas une clé SHA-256 déjà présente dans la cible : déduplication gratuite. `resourcesFor` (`formats/src/clipboard.cpp:152-164`) calcule les ressources citées ; `forEachCitedKey` (`clipboard.cpp:34-52`) les énumère (image, média, fichier d'une action) et ignore les objets de type inconnu.
- **Presse-papiers = JSON compact, pas le ZIP.** `clipboard.cpp:62-86` (`encodeClipboard`) : `{"format":"actcraft-objects/1","objects":[…],"resources":{<sha256>:<base64>},"extensions":{…}}`. `isClipboardFormat` (`clipboard.cpp:25-33`) : préfixe `actcraft-objects/`, la version majeure seule décide. À la lecture (`clipboard.cpp:88-150`) chaque ressource est contrôlée par son SHA-256, une ressource citée absente invalide tout.
- **Les objets sont écrits par le code du format natif**, jamais champ par champ dans le presse-papiers (`clipboard.cpp:13-16`) : un objet copié garde clés inconnues et types inconnus. Leçon : un seul codeur d'objet pour fichier, fragment et presse-papiers.
- **Bibliothèque = dossiers + fichiers `.actcraft` d'une page.** `docs/plans/2026-10-18-livraison-complete-lot6-PLAN.md`, D6-14 (lignes 444-449) : une ressource ajoutée est un `.actcraft` d'une page nommé `Ressource<N>.actcraft` ; les `.png`, `.jpg`, `.svg` sont lus tels quels ; dossiers « Mes ressources » (`Documents/ActCraft/Ressources`), « Ressources partagées » (réglable), « Autre dossier ». Les packs de l'original (`.as2`) ne sont pas lus (H6-4, amendement 1 § 5 lignes 226-236 : « en attente »).
- **Recherche et vignettes.** `ui/src/resourcelibrary.cpp` : recherche par nom et par mots-clés de page (`keywordsMatch`, lignes 155-165), listage et recherche sur fils séparés, vignettes une à la fois (`m_pool.setMaxThreadCount(1)`, ligne 317), annulation de la recherche au fichier suivant. Les mots-clés et la description sont des champs du modèle (L6-T10, plan lot 6 ligne 261).
- **Ce qui a manqué.** ActCraft n'a ni extension distincte pour le fragment (même `.actcraft`, distingué seulement par « une page »), ni type MIME propre, ni lecture des `.as4a`. Un fragment ne dit pas qu'il en est un : l'ouvrir comme document est possible mais non voulu. Constat à reprendre : mettre le `kind` dans le manifeste.
- Recherche de grille, tableau et fragment dans `docs/specs/` : fragments et ressources apparaissent dans les cadrages `2026-10-14-livraison-complete-cadrage.md` (lignes 54-56, 306) et l'amendement 1 ; pas de spécification propre au fragment.

## 3. Ce que sont les ressources d'ActivInspire et de SMART

### 3.1 ActivInspire (vérifié sauf mention)

- **Navigateur de ressources** (« Resource Browser », 2e des navigateurs, View > Browsers) : racines « My Resources » et « Shared Resources » (guide p. 44-45). Les Shared Resources regroupent modèles, fonds, grilles, icônes, sons, matériel par matière ; elles viennent d'un « Resource Pack » (guide p. 12 : File > Import > Resource Pack to Shared Resources).
- **Dossiers** : « Create New Folder » dans le menu de My Resources ; renommer (« Rename Resource File »). Ajouter : glisser un objet de la page vers le dossier (un « + » apparaît) ; poser : glisser la ressource sur la page (p. 44-45).
- **Recherche** : le guide cite « View suggested topics or search by keyword » (ligne 434 du texte extrait) et « Search Resources on Resource Library », la bibliothèque en ligne Promethean (compte requis). Le détail de la recherche locale par mots-clés n'est pas décrit dans ce guide : supposé.
- **Les grilles sont des ressources** : on glisse une grille depuis Shared Resources > Grids sur la page pour l'appliquer (p. 37). Même mécanisme que pour une image : à reprendre (voir l'étude grille).
- **Extensions** : le pack est un `.as4a` (et `.as3a` pour la version 3). Promethean le dit zip : le renommage Mac en `.as4a.zip` casse l'import. L'extension `.as4` citée par Jérôme n'a été trouvée dans aucune source officielle : supposé que c'est le même ensemble (`.as4` / `.as4a`, « ActivStudio 4 », selon des sites tiers non autoritaires). Le chiffrement allégué par des sites tiers n'est pas confirmé.
- **Contenu interne** : non vérifié (pas de fichier ouvert). Supposé : une archive zip de fichiers de ressources (`.flipchart`, images, sons) avec un index.

### 3.2 SMART Notebook (vérifié)

- **Gallery** : onglet avec images, fonds, multimédia, pages ; « Gallery Essentials » = ensemble classé par sujet ; « My Content » = ressources de l'utilisateur.
- **`.gallery`** : « Exporting a Gallery Collection » enregistre le contenu d'une catégorie dans un seul fichier d'extension `.gallery` (sous-catégories exclues) ; import par « Add to My Content », qui crée une sous-catégorie nommée « Untitled » à renommer. Format interne non documenté : supposé.
- Les sites tiers parlent de `.gallerycollection` ; la documentation SMART dit `.gallery`.

### 3.3 Ce qu'on en retient

Trois niveaux chez les deux produits : une ressource (un objet ou un groupe), une collection exportable en un fichier (pack ou `.gallery`), une bibliothèque (arbre de dossiers avec recherche et glisser vers la page). Chez ActivInspire les types de ressource (grille, fond, image, objet) partagent la même bibliothèque.

## 4. Proposition pour RoomBoard

### 4.1 Extensions et types MIME

| contenu | extension | MIME | note |
|---|---|---|---|
| document | `.roomboard` | `application/x-roomboard` | inchangé (D24) |
| fragment (objets, un groupe) | `.rbitem` | `application/x-roomboard-item` | même ZIP |
| paquet de ressources | `.rbpack` | `application/x-roomboard-pack` | ZIP de fragments |

Décision H1-1 à revoir : l'extension `.roomboard` reste raisonnable (gratuite à changer avant la première release, `socle-cadrage.md:224`). On ne propose pas de la changer ; on ajoute `.rbitem` et `.rbpack`. Alternative écartée en § 6.

### 4.2 Conteneur : même ZIP, manifeste qui dit ce qu'il contient

Ajouter au `Manifest` un champ `kind` : `"document"` (défaut si absent, donc compatible avec les fichiers du socle) ou `"fragment"` ou `"pack"`. Le champ `format` reste `"roomboard"` : un fragment passe donc le contrôle de `load_with_manifest` sans changement. Contenu d'un fragment :

- `manifest.json` {`format`, `formatVersion`, `schema`, `kind: "fragment"`, `name`, `keywords[]`, `description`, `bounds` (emprise en unités de page), `appVersion`, `created`}
- `document.ybin` : état Yrs v1 d'un document d'**une page** dont `elements` contient les objets du fragment (option A), ou un JSON d'objets (option B)
- `assets/<sha256>` : seulement les fichiers cités
- `thumbnail.png` : vignette (facultative, régénérable)

**Option A (recommandée) : un fragment est un `Document` d'une page partielle.** Pour : un seul chemin de lecture, d'écriture et de migration ; les objets gardent toutes leurs propriétés ; ouvrir un fragment comme document est trivial ; D2 et D24 inchangés ; correspond à ce qu'ActCraft a validé (`fragment.cpp`). Contre : l'état Yrs porte l'historique CRDT et des identifiants qu'il faudra écarter. Réponse : à l'écriture d'un fragment on construit un document neuf avec les copies des objets (comme `writeFragment`, jamais le document d'origine élagué), donc sans historique du document source.

**Option B : JSON d'objets.** Lisible, stable d'un chargement à l'autre, mais perd les identifiants et la structure Yrs (le cadrage D24 refuse le JSON pour le document : « le JSON perd les identifiants CRDT »), et crée un second codeur d'objet. Réservé au presse-papiers (§ 4.5).

### 4.3 Compatibilité fichier / fragment

- **Ouvrir un fragment comme fichier** : la page s'ouvre avec ses objets sur un fond blanc ; « Enregistrer » propose `.roomboard` (le `kind` passe à `"document"`). Les tailles de page : le fragment garde la taille de la page source (comme ActCraft, `fragment.cpp:72`).
- **Glisser un `.roomboard` comme ressource** : un document de plusieurs pages posé sur une page insère les objets de sa page 1 (ou une boîte de choix de page). Les fonds de page ne suivent pas (ActCraft : fond et grille non copiés).
- **Glisser un `.rbitem`** : insertion à l'endroit du lâcher, centré sur l'emprise (`bounds`).
- **Pages entières comme ressource** : un `.roomboard` complet reste une ressource « page ou leçon » dans la bibliothèque (ouvrir ou insérer les pages).

### 4.4 Insertion : régénérer les identifiants (point critique CRDT)

D3 : `id` = `uuid_v4`. À l'insertion d'un fragment, chaque élément est **recopié** dans le document cible avec un nouvel `id` et ses nouveaux identifiants internes Yrs (il s'agit d'une écriture neuve dans le `Y.Array elements`, pas d'une fusion d'états). Ne jamais appliquer `document.ybin` du fragment comme mise à jour Yrs sur le document cible : deux insertions du même fragment partageraient des clients et des horloges Yrs et se confondraient, et deux utilisateurs concurrents sur le même fragment produiraient des conflits. Règles :

1. Lire le fragment dans un document temporaire ; copier chaque `Y.Map` d'élément (lecture puis création d'une nouvelle `Y.Map`) ; générer un `uuid_v4` par élément.
2. Transposer les références internes (groupe, liens d'action, connecteurs) vers les nouveaux `id` ; remettre à zéro (ou retirer) celles qui visent hors fragment (leçon `clearDanglingTargets`).
3. Appliquer `transform` du fragment, composé avec la translation vers le point de dépôt (D4 : une seule affine à modifier).
4. Copier les `assets/<sha256>` absents ; ne pas écraser ceux présents (déduplication par empreinte).
5. Le tout en **une transaction d'origine `"local"`** : une insertion = une étape d'annulation (D11).

L'empreinte SHA-256 est aussi le contrôle d'intégrité (ActCraft : ressource d'empreinte fausse = fragment refusé).

### 4.5 Presse-papiers entre instances

- **Tauri (coque)** : écrire plusieurs formats à la fois : un format personnalisé (octets d'un `.rbitem`) plus des formats standards de repli (SVG ou PNG de l'aperçu, texte). Le plugin presse-papiers standard de Tauri 2 ne gère que texte et image (supposé : à vérifier dans la doc de `tauri-plugin-clipboard-manager`) ; un format personnalisé demande un plugin tiers ou du code natif Rust par plateforme.
- **Web (iPad inclus)** : API asynchrone `navigator.clipboard.write([new ClipboardItem({...})])`. Chromium accepte des types personnalisés préfixés `web ` (par exemple `web application/x-roomboard-item`) ; WebKit/Safari les accepte aussi à partir de versions récentes. Aucune de ces deux affirmations n'a été vérifiée ici (supposé). Prévoir un repli : placer le fragment en **JSON dans `text/plain`** ou `text/html` (attribut `data-roomboard` sur un élément) quand le type personnalisé est refusé. Le collage exige un geste de l'utilisateur ; Safari affiche en plus un bouton « Coller » sur iPad.
- **Format du presse-papiers** : suivre ActCraft : JSON compact `{"format":"roomboard-items/1","objects":[…],"assets":{<sha256>:<base64>}}` (ou le ZIP en base64 pour un gros contenu), avec contrôle SHA-256 et version majeure qui décide. Limite : un presse-papiers n'est pas fait pour 50 Mo d'images ; au-delà d'un seuil (à fixer par essai) copier une référence puis refuser avec un message clair.
- **Entre onglets du même navigateur** : repli possible par `BroadcastChannel` ou stockage local, sans passer par le presse-papiers du système.

### 4.6 Versions de schéma

- `schema` du manifeste = schéma du document (D24) : un fragment écrit en schéma N est lu par `format::migrate` comme un document. Un fragment d'un schéma plus récent est refusé avec le message `NewerVersion` existant.
- `kind` inconnu : refusé avec un message clair (« ce fichier est d'un type que cette version ne lit pas »).
- Ajouter le champ `kind` change le manifeste : champ facultatif (défaut `"document"`) donc **pas de changement de `formatVersion`** ; un lecteur du socle ignorerait le champ inconnu (serde l'ignore par défaut sauf `deny_unknown_fields`, absent du code lu) et ouvrirait un fragment comme un document d'une page : acceptable.
- Les objets de type inconnu (`kind` d'élément) sont gardés tels quels, comme ActCraft (L2-C8).

### 4.7 Paquet de ressources (`.rbpack`)

ZIP contenant `manifest.json` {`kind: "pack"`, `name`, `version`, `items[]`} et un dossier `items/` de `.rbitem` (ou de dossiers extraits), avec pour chaque entrée : nom, mots-clés, vignette, chemin de dossier. Les `assets/` communs sont dédupliqués par empreinte au niveau du paquet (un seul exemplaire pour tous les items). À l'import : l'utilisateur choisit un dossier de destination de la bibliothèque ; les entrées sont écrites comme fichiers `.rbitem` individuels. Contre-indications : taille (le pack ActivInspire fait 246 Mo) : lecture en flux, vignettes lues sans décompresser les items, pas de chargement complet en mémoire Wasm sur iPad.

### 4.8 Bibliothèque de ressources

Modèle : arbre de dossiers (« Mes ressources », « Ressources partagées », paquets importés), éléments = `.rbitem`, images, grilles, `.roomboard`. Index : nom, mots-clés, chemin, vignette, date.

| plateforme | stockage | surveillance | note |
|---|---|---|---|
| coque Tauri | dossiers réels (`Documents/RoomBoard/Ressources`, dossier partagé réglable) | surveillance du dossier par le système (crate `notify` ou équivalent, supposé) | comme ActCraft D6-14 |
| web, Chromium bureau | OPFS pour la bibliothèque interne, dossier réel par `showDirectoryPicker` (poignée en IndexedDB) | pas de surveillance fiable : réanalyse à l'ouverture et au focus | supposé |
| iPad Safari | OPFS et IndexedDB seulement ; pas de sélecteur de dossier utilisable | aucune | supposé : à vérifier sur l'appareil |

- **Vignette** : calculée à l'enregistrement et rangée dans le fragment (`thumbnail.png`) et dans l'index ; ActCraft les lit une à une sur un fil séparé (`resourcelibrary.cpp:317`).
- **Recherche** : nom + mots-clés + description, insensible à la casse ; index en mémoire reconstruit à l'ouverture et mis à jour à l'ajout ; recherche annulable. Sur le web, l'index vit dans IndexedDB.
- **Ajouter** : glisser une sélection vers un dossier de la bibliothèque (comme ActivInspire) ou menu « Ajouter à la bibliothèque » : crée un `.rbitem` (`writeFragment` du Rust).
- **Poser** : glisser vers la page, ou clic puis dépôt au centre de la vue.
- **Types uniques dans la même bibliothèque** : objets, grilles, fonds, images (comme les Grids d'ActivInspire).
- **Interdits** : exécution de contenu actif d'un paquet (aucun script dans un fragment) ; noms d'entrée ZIP relatifs sans `..`, sans `\`, sans `:` (règle `isSafeEntryName` d'ActCraft, `nativefile.cpp`) ; limites de taille et de nombre d'entrées contre les bombes de décompression.

## 5. Ce qui marche sur iPad (web) / ce qui demande la coque

| fonction | iPad (web) | coque Tauri |
|---|---|---|
| lire et écrire `.rbitem`, `.rbpack` (cœur Wasm) | oui | oui |
| copier / coller entre deux onglets ou instances | oui avec repli JSON en texte (supposé) | oui, avec format personnalisé si plugin natif |
| bibliothèque interne | OPFS, IndexedDB | dossiers réels |
| dossier partagé à plusieurs, surveillance | non | oui |
| association du double-clic à `.rbitem` | non (l'iPad ne lance pas une appli web) | oui (extension déclarée à la coque, lot 5) |
| import d'un `.as4a` | possible en lecture seule (zip), contenu à étudier | idem |
| pack volumineux (> 200 Mo) | risque mémoire sur iPad (supposé) | oui, lecture en flux |

## 6. Recommandation pour RoomBoard

Options pour l'extension du fragment :

1. **Trois extensions : `.roomboard`, `.rbitem`, `.rbpack`, même conteneur, manifeste `kind`.** Recommandée : l'utilisateur distingue document, ressource, paquet ; le système associe chacun à une icône ; le code ne change qu'au manifeste.
2. Une seule extension `.roomboard` pour tout, avec `kind`. Plus simple mais invisible à l'utilisateur et ne permet pas d'associer un comportement au double-clic.
3. Extension unique différente de `.roomboard`, abandon de H1-1. Non recommandée : rien n'y gagne.

Plan d'ordre si suivi (hors socle) :

1. Ajouter `kind` au manifeste et un `format::save_fragment` / `load_fragment` côté cœur, avec les tests de contrat du socle (Rust natif, puis Wasm).
2. Insertion avec régénération d'identifiants (§ 4.4), après le lot 4 du socle (sélection, formes, texte) : sans groupe ni sélection stable il n'y a rien à copier.
3. Presse-papiers, puis bibliothèque locale, puis paquets.
4. Import d'un `.as4a` et d'un `.gallery` seulement après analyse d'un fichier réel (étude de format à part, comme pour `.flipchart` et `.iwb` dans `~/telechargements-roomboard/`). ActCraft a laissé ces lectures « en attente » (amendement 1, § 5).

Dépendances au socle : sélection (D15), groupement (absent, à créer : un groupe = un nouveau `kind` d'élément avec `children`, ou une propriété `groupId` ; à trancher avant les fragments), images et ressources `assets/` (hors périmètre du socle), annulation D11.

## 7. Vérifié / supposé

**Vérifié** : contenu du format D24 et du code `format/mod.rs` ; D2, D3, D4 ; code et plans d'ActCraft cités avec lignes ; guide ActivInspire p. 12, 37, 44, 45 ; `.as4a` comme pack, zip (indice : renommage `.as4a.zip`) ; `.gallery` : export d'une catégorie en un fichier ; absence dans le socle de groupes, presse-papiers, bibliothèque.

**Supposé** : contenu interne des `.as4a` et `.gallery` ; existence du `.as4` isolé ; chiffrement des `.as4a` ; types MIME personnalisés du presse-papiers web (préfixe `web `) sur Chromium et Safari/iPad ; capacités du plugin presse-papiers de Tauri 2 ; surveillance de dossier ; OPFS et IndexedDB sur iPad (quotas, persistance) ; effet de la clé `kind` ajoutée sur un lecteur du socle.

## 8. Questions ouvertes

1. Un groupe d'objets est-il un élément (`kind: "group"` avec enfants) ou une propriété ? Bloque la définition du fragment.
2. Fragment : taille de page et fond suivent-ils ? (ActCraft : taille oui, fond non.)
3. Faut-il lire les `.as4a` des utilisateurs ActivInspire (valeur d'adoption) ? Demande un fichier réel et l'accord sur les droits des ressources Promethean (licence du pack).
4. Où vit le dossier « Ressources partagées » d'une école (réseau, MSI comme Promethean) ?
5. Limite du presse-papiers web : à quelle taille bascule-t-on vers la référence ?
6. Une ressource garde-t-elle ses mots-clés au niveau du fragment ou de chaque objet ? (ActCraft : au niveau de la page et de l'objet.)
7. Faut-il signer ou valider les paquets importés d'une source tierce ?
