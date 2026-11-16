# Cadrage — socle (RoomBoard 0.1)

Cadré en mode autonome le 2026-11-16 (étage 1, cadreur). Jérôme injoignable avant l'après-midi : aucune question posée,
chaque point tranché depuis les sources ou posé en hypothèse « à revoir ». Corrigé au tour 1 de la contre-relecture
(10:50) : squelette fusionné relu dans `feat/socle` (`b3f7489`), API de yrs 0.28.1 relue.

## 1. Demande et gabarit

**Demande.** Bâtir le socle 0.1 de RoomBoard, successeur d'ActCraft : un tableau blanc de classe au stylet (pages,
tracé avec pression, gomme, sélection, formes, texte, annuler, zoom, format natif, barre d'outils décrite comme une
donnée) sur un cœur Rust compilé en Wasm, une interface TypeScript et une coque Tauri 2 ; le lot 1 livre un prototype
du stylet mesurable pour l'essai sur l'ENI de cet après-midi.

**Gabarit.** `lots` (budget 40 questions ; 39 consommées, numérotées D1 à D39).

Sources : brief OC26 de l'orchestrateur (décisions de Jérôme du 2026-11-14 et du 2026-11-16, citées « brief ») ;
profil `.claude/chantier.md` ; coffre (`06_MOC/actcraft.md`, décisions 0069, 0082, 0083, 0085, 0248, 0250) ;
squelette fusionné dans `feat/socle` (`b3f7489`, dont `3730914` : yrs 0.28, wasm-bindgen épinglé) ; sources de
`yrs` 0.28.1 et `freedraw` 1.0.4 du registre cargo de la VM ; `~/.claude/docs/vm/audit-ob94.md` (outils et RAM de la
VM). Le dépôt n'a pas de graphe graphify (absent de `~/.cache/graphes/`) : la recherche est textuelle.

## 2. Décisions

Ordre : modèle de données, puis frontière, puis moteur, puis interface, puis coque et outillage, puis lots.

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| D1 | Couches et dépendances | `crates/roomboard-core` (Rust pur, aucune dépendance au navigateur ni à Tauri, aucune horloge ni aléa système hors de ce que yrs apporte), `crates/roomboard-wasm` (seule liaison wasm-bindgen), `apps/web` (TS : `src/engine/` sans framework, `src/ui/` avec le framework), `apps/desktop` (Tauri 2, services du système seulement). Chaque couche a sa suite de tests qui tourne seule. | brief (« trois couches testables seules ») ; profil « Règles propres au projet » | oui (organisation) |
| D2 | Schéma du document Yrs | Racines : map `meta` (`schema: 1`), array `pages`. Une page = `Y.Map` {`id`, `width`, `height`, `background`, `elements`: `Y.Array` de `Y.Map`}. L'ordre de `elements` est l'ordre d'empilement ; aucun réordonnancement au socle (yrs 0.28.1 n'a plus `Array::move_to` : réordonner = retirer + réinsérer une copie, ou indices fractionnaires, à trancher au lot qui l'introduira). Un élément = `Y.Map` {`id`, `kind`, `transform` [a,b,c,d,e,f] en `f64`, `style` {…}, données propres au type}. Remplace le schéma du squelette (`pages` = entiers, `document.rs:13-18`). | brief (« document posé sur un CRDT Yrs ») ; `grep -rn "fn move_to" yrs-0.28.1/src` (aucun résultat) | oui jusqu'à la première release (aucun utilisateur, brief) ; voir DA4 |
| D3 | Identifiants | `id` = `yrs::uuid_v4()` (`Arc<str>`) ; jamais l'index dans le tableau. | `yrs-0.28.1/src/lib.rs:722-729` ; aléa `fastrand` avec la fonction `js` (`yrs-0.28.1/Cargo.toml:80-82`) | oui |
| D4 | Coordonnées | Coordonnées « monde » en unités de page (1 unité = 1 px CSS au zoom 100 %). Points d'un élément en `f32` **locaux** (origine = premier point du trait ou coin de la forme), `transform` en `f64` les place sur la page : la précision des `f32` ne se perd pas loin de l'origine du plan. Déplacer ou redimensionner ne réécrit que `transform`. Rotation : absente de l'interface, présente dans le format. | hypothèse H2-1 | oui (format v1, aucun utilisateur) |
| D5 | Taille de page | Cadre 1920 × 1080 (16:9) par page, plan non borné autour ; « Ajuster la page » cadre sur ce rectangle. | hypothèse H1-4 | oui |
| D6 | Représentation d'un trait | Points bruts de la ligne médiane (`x, y, pression`), doublons < 0,5 unité retirés, rangés dans un `Any::Buffer` de `f32` petit-boutiste (3 par point) ; style {`color`, `width`, `tool: pen`}. Le lissage n'est jamais destructif : il est calculé au rendu. | brief (« points + pression, lissage, coordonnées monde » à trancher) ; décision 0083 | oui (format v1) |
| D7 | Géométrie de l'encre | Une seule implémentation, dans le cœur : `ink::outline` (contour à largeur variable par `freedraw::get_stroke`, portage MIT de perfect-freehand) sert au rendu ET au test de collision. `get_stroke` rend le contour du trait entier (`freedraw-1.0.4/src/get_stroke.rs:13`) : pendant le geste, `StrokeBuilder` recalcule le contour complet à chaque image tant que le trait a ≤ 2 000 points ; au-delà, il fige le contour des blocs de 256 points terminés (cache par bloc, comme 0083) et ne recalcule que le dernier bloc. Contour figé du trait enregistré mis en cache par id. | brief (cœur = traits) ; `cargo info freedraw` (MIT) ; décision 0083 ; hypothèse H2-12 ; DA7 | oui (derrière `ink::outline`) |
| D8 | Pression | `pointerType = "pen"` : `pressure` de l'événement. Souris et doigt : pression constante 0,5. Un stylet qui ne rend que 0 ou 0,5 est détecté à l'exécution (pas par plateforme) et traité comme constant. | hypothèse H2-2 ; brief (Pointer Events) | oui |
| D9 | Liaison Wasm | `wasm-bindgen = "=0.2.130"` + `wasm-bindgen-cli` 0.2.130 (posé sur la VM), `--target web`, sortie `apps/web/src/wasm/` (ignorée, `.gitignore:4`). Déjà fait par le squelette (`3730914`, `scripts/verifier.sh:13-16`). Reste : `verifier.sh` compare la version de la CLI à celle de `Cargo.lock` avant `wasm-bindgen` et s'arrête avec un message clair si elles diffèrent. Pas de wasm-pack. | `crates/roomboard-wasm/Cargo.toml:12` ; `Cargo.lock` (`wasm-bindgen` 0.2.130) ; `wasm-bindgen --version` → 0.2.130 | oui |
| D10 | Frontière Wasm | Commandes grossières (une par geste) et lectures par élément modifié ; tampons de points et de contours en `Float32Array` (une copie par élément modifié), petites structures par `serde-wasm-bindgen`. Chaque commande rend un `Change` {pages et ids touchés, `version`}. Lectures sans écriture pour les aperçus (D38). L'encre vive : un `StrokeBuilder` vit dans Wasm, la page lui pousse les points accumulés une fois par image. | brief (« le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif » : Wasm est dans la page) ; DA5 | oui (API interne) |
| D11 | Annuler / rétablir | `yrs::UndoManager` derrière `History` : `UndoManager::with_options(Options { capture_timeout_millis: 0, tracked_origins: {"local"}, capture_transaction: None, timestamp: Arc::new(\|\| 0), init_undo_stack: vec![], init_redo_stack: vec![] })`, puis `expand_scope(&doc, &pages)` et `expand_scope(&doc, &meta)` ; `undo_blocking()` / `redo_blocking()`. Une transaction d'origine `"local"` = un geste = une étape. Caméra et sélection ne s'annulent pas. Pile non bornée au socle (H2-13). | `yrs-0.28.1/src/undo.rs:121-123` (`new()` absent sous Wasm), `:130` (`with_options`), `:152` (`expand_scope`), `:529`, `:570`, `:777-799` (`Options`, sans `Default` sous Wasm, `:804`) ; `sync/time.rs:20-25` ; DA6 | oui (derrière `History`) |
| D12 | Gomme | Gomme partielle par défaut : coupe les traits sous le disque de la gomme (points retirés, extrémités interpolées, un trait devient 0, 1 ou plusieurs traits). Second mode « gomme d'objet » : retire le trait entier touché. La gomme n'agit que sur les traits ; formes et texte se suppriment par sélection + Suppr. Un passage de gomme = une seule commande `Erase` au relâché (aperçu : D38). Le bouton gomme du stylet (`buttons & 32`) prend la gomme le temps du geste. | hypothèse H1-3 (usage classe, ActivInspire en référence d'usage, décision 0069) | oui |
| D13 | Formes | Rectangle, ellipse, ligne, flèche ; couleur du contour, épaisseur, remplissage aucun / couleur. Maj pendant le tracé : carré, cercle, angle par pas de 15°. | hypothèse H2-4 | oui |
| D14 | Texte simple | Contenu en `Y.Text` ; une police, une taille parmi 4, une couleur, largeur de boîte ; édition dans un `<textarea>` posé sur le canvas, rendu au canvas hors édition. Entrée = nouvelle ligne ; Échap ou clic ailleurs = valider, sauf pendant une composition IME (`isComposing` vrai : touche laissée à l'IME) ; texte vide validé = élément retiré. Une édition = une transaction au moment de valider. | brief (« texte simple ») ; hypothèse H1-6 (police) | oui |
| D15 | Sélection | Clic = un élément (le plus haut sous le pointeur, tolérance 6 px écran) ; glisser dans le vide = rectangle de sélection (éléments entièrement inclus) ; Maj = ajouter ou retirer ; 8 poignées de redimensionnement (Maj = garder les proportions) ; déplacer par glisser. Épaisseur des traits mise à l'échelle avec l'élément. Déplacer et redimensionner : aperçu côté page, une seule commande `Transform` au relâché (D38). | hypothèse H2-5 | oui |
| D16 | Pages | Ajouter (après la courante), supprimer, précédente / suivante, compteur « 3 / 7 ». Pas de vignettes au socle. Ajouter et supprimer s'annulent. Page initiale et dernière page : D37. | brief (« Pages ») ; hypothèse H2-6 | oui |
| D17 | Caméra | Caméra par page dans l'interface (pas dans le document) ; zoom de 10 % à 800 % ; molette = défilement, Ctrl+molette et pincement = zoom autour du pointeur ; outil main, barre d'espace + glisser, bouton du milieu. Canvas dimensionnés en pixels physiques (`devicePixelRatio`, suivi au changement d'écran). | brief (« zoom et déplacement ») ; `apps/web/src/main.ts:6-13` (redimensionnement déjà au `devicePixelRatio`) ; hypothèse H2-7 | oui |
| D18 | Doigt et paume | Un geste par `pointerId` (deux stylets, ou stylet + souris, tracent ensemble). Tout contact `touch` est ignoré tant qu'un `pen` est en contact (paume posée en écrivant). Hors stylet : un doigt trace avec l'outil courant (ENI tactiles sans stylet) ; un second doigt dans les 150 ms annule le trait commencé et passe en pincement / défilement. Dès qu'un `pen` a été vu dans la session, le doigt seul déplace la vue au lieu de tracer, réglable. `touch-action: none` sur la zone de dessin (`index.html:10`). | hypothèse H1-2 ; brief (stylet / doigt / souris) | oui |
| D19 | Rendu | Canvas 2D au socle, derrière une interface `Renderer` du moteur ; deux canvas superposés (déjà dans `index.html:15-16`) : scène fixe (redessinée sur changement ou caméra) et interaction (encre vive, aperçus, poignées, rectangle de sélection), ce dernier ouvert avec `desynchronized: true` quand le navigateur le permet. `Path2D` en cache par élément, invalidé par `Change`. WebGL2 seulement si l'essai ou une mesure l'exige (DA9). | brief (« un canvas pour la scène fixe, un pour l'interaction ») ; DA2 | oui (derrière `Renderer`) |
| D20 | Encre vive | Chemin : `pointermove` → `getCoalescedEvents()` (si présent) → tampon TS → à l'image (`requestAnimationFrame`) : `StrokeBuilder.push(Float32Array)` → contour → canvas d'interaction. Points prédits (`getPredictedEvents()`, sinon rien) dessinés en queue provisoire, jamais enregistrés. Au relâché : `CommitStroke` → scène fixe. Fin anormale du geste : D39. | brief (risque n° 1 ; predicted events, `getCoalescedEvents`, desynchronized canvas) | oui |
| D21 | Framework de l'interface | **SolidJS** (1.9), seulement dans `apps/web/src/ui/` : barre d'outils, barre des pages, menus, boîtes. Le moteur n'importe aucun framework. | brief (« Tu tranches entre SolidJS et Svelte, justifié ») ; DA1 | coûteux à changer tard ; borné à `src/ui/` par D1 |
| D22 | Barre d'outils comme donnée | Étendre `apps/web/src/toolbar.ts` : `ToolDef` → `ToolItem` (+ `tool`, `icon`, `options`), la liste `toolbar` → profil `defaut` (`ToolbarProfile` : groupes → items), `validateToolbar` → `parseToolbarProfile` (garde ses contrôles : doublon, libellé vide), `ToolId` étendu (`hand`, `rect`, `ellipse`, `line`, `arrow`, `text`). Un item dont l'outil est refusé par la table des capacités est masqué. Le profil choisi se garde dans les réglages de l'application (pas dans le document). | brief (« barre d'outils décrite comme une donnée (les profils s'y brancheront) ») ; `apps/web/src/toolbar.ts:1-24` ; DA10 | oui |
| D23 | Table des capacités | Reste dans le cœur, presque vide : `Platform` + `Capabilities` du squelette, étendus d'un champ seulement si le socle le lit (aucun au socle 0.1 : la pression est détectée à l'exécution). Exposée par Wasm (`capabilities(platform)`). | brief (choix (3)) ; `crates/roomboard-core/src/capabilities.rs:4-29` | oui |
| D24 | Format natif | Conteneur ZIP, extension `.roomboard`, type `application/x-roomboard`. Contenu : `manifest.json` {`format: "roomboard"`, `formatVersion: 1`, `schema: 1`, `appVersion`, `created`, `modified`} ; `document.ybin` = état complet Yrs en mise à jour binaire **v1** (`encode_state_as_update_v1` depuis un vecteur d'état vide) ; dossier `assets/` réservé (empreinte SHA-256), vide au socle. `formatVersion` = disposition du conteneur ; `schema` = schéma du document, recopié de `meta.schema` à l'enregistrement et contrôlé contre lui à la lecture (désaccord = `Corrupt`). Lecture : version supérieure à celle connue → refus avec message clair ; inférieure → `format::migrate`. L'heure et la version de l'application sont **passées en paramètres** à `save` (jamais `SystemTime::now()` dans le cœur). Pas de JSON pour le document. | brief (« conteneur, version, mise à jour Yrs en binaire ou JSON ») ; décision 0069 (précédent ZIP + JSON de `.flipx`) ; `sync/time.rs:20-25` (pas d'horloge système sous Wasm) ; DA3 | oui jusqu'à la première release ; extension : H1-1 |
| D25 | ZIP dans le cœur | Crate `zip` sans fonctions par défaut, avec `deflate` en pur Rust (pas de bzip2 ni zstd en C, pas de `time` système : dates des entrées fixées) ; lu et écrit dans le cœur, testé en natif et compilé pour `wasm32-unknown-unknown` par `verifier.sh`. | hypothèse H2-8 (compatibilité Wasm à vérifier à la première tâche du lot 2) | oui |
| D26 | Fichiers : ouvrir / enregistrer | Interface `FileHost` dans `apps/web/src/platform/files.ts` : Tauri (`@tauri-apps/plugin-dialog` + `plugin-fs`), navigateur Chromium (File System Access API, garde la poignée pour Ctrl+S), autres navigateurs (`<input type=file>` + téléchargement). Nouveau, Ouvrir, Enregistrer, Enregistrer sous ; indicateur « modifié » ; confirmation à la fermeture avec modifications (Tauri `onCloseRequested`, navigateur `beforeunload`). Les octets passent la frontière page ↔ Rust natif : ce n'est pas le chemin de l'encre. | brief (coque = fichiers) ; DA8 | oui |
| D27 | Hors ligne et fenêtres | Aucune ressource réseau à l'exécution (polices et icônes embarquées, `base: './'`). Une fenêtre = une page web = une instance Wasm = un document ; plusieurs fenêtres viendront par synchronisation Yrs entre fenêtres (hors socle). CSP de la coque posée au lot 5 (aujourd'hui `csp: null`, `tauri.conf.json:11`), avec `'wasm-unsafe-eval'`. | brief (exigences de la suite : hors ligne, plusieurs fenêtres) | oui |
| D28 | Version de yrs | yrs 0.28.1, déjà monté par `3730914` ; édition Rust 2021 du squelette gardée. | `crates/roomboard-core/Cargo.toml:8` ; `Cargo.lock` (`yrs` 0.28.1) | oui |
| D29 | Prototype du stylet (lot 1) | Page `apps/web/proto-stylet.html`, TS pur, ni framework ni Wasm, construite par une **configuration Vite séparée** (`apps/web/vite.proto.config.ts`, script `build:proto`, sortie `apps/web/dist-proto/`) en **un seul fichier HTML autonome** (`vite-plugin-singlefile`), ouvrable en `file://` sur la machine de l'ENI ; le build de l'application n'est pas touché. Géométrie : **polyligne à largeur variable assumée** (segments `lineTo` dont l'épaisseur suit la pression), pas le contour `freedraw` du produit — l'essai mesure l'entrée et l'affichage, pas le lissage ; le banc rejoue au lot 3 avec la géométrie du produit. Canvas au `devicePixelRatio`. Bascules : fusionnés, prédits, `desynchronized`, `pointerrawupdate`, traînée déléguée (`navigator.ink`). Affiche et exporte en JSON (télécharger + copier) les mesures de D30. Son module `src/engine/input/sampler.ts` (avec les règles de D39) est gardé et réutilisé au lot 3 ; la page reste comme banc. | brief (lot 1 = prototype stylet mesurable et utile à l'essai ENI, OB87) ; DA9 ; hypothèse H1-7 (livraison en fichier) | oui (jetable) |
| D30 | Mesures du prototype | Par trait et cumulées : `pointerType`, pression (min, max, écart type, part des valeurs 0 / 0,5), inclinaison, bouton gomme vu, fréquence des événements bruts et fusionnés (Hz), retard interne `timeStamp` → dessin (`performance.now()` au rAF, p50 / p95), durée d'image, part des images > 25 ms, `pointercancel` reçus, contacts tactiles ignorés pendant le stylet, prise en charge détectée (`getCoalescedEvents`, `getPredictedEvents`, `desynchronized`, `navigator.ink`, `isSecureContext`), `devicePixelRatio`, agent utilisateur. Format `roomboard-stylet/1`. | décision 0082 (latence interne seulement : ni numériseur ni composition) ; journal `2026-10-14-actcraft-prototype-mesure-clos` (seuil 25 ms) | oui |
| D31 | Verdict de l'essai ENI | Le ressenti de Jérôme décide (« le trait suit la pointe ») ; les nombres sont consignés, pas une porte (comme 0085). Repères proposés : pression qui varie au stylet ; fréquence ≥ 100 Hz au stylet avec événements fusionnés ; retard interne p95 ≤ 17 ms ; < 2 % d'images > 25 ms. | décision 0085 ; hypothèse H1-5 (repères) | oui |
| D32 | Si l'essai échoue | Échelle de remèdes, du moins coûteux au plus coûteux, sans changer le cœur : voir DA9. Le dernier échelon (encre native dans la coque) contredit une règle de Jérôme : il ne se prend jamais sans lui. | brief (« le cadrage doit dire ce qui change si l'essai échoue ») | oui jusqu'au dernier échelon |
| D33 | Tests automatiques de la VM | Cœur : `cargo test`. Liaison : `cargo test` natif + vitest qui charge le vrai `.wasm` en Node (`initSync` sur les octets). Moteur : vitest sur la logique pure (caméra, échantillonneur sur événements synthétiques, outils sur un faux contexte 2D qui enregistre les appels). Parcours : Playwright **Chromium** sur la VM, lancé par `scripts/verifier.sh --e2e` au lot 5 ; l'hôte de fichiers y est forcé sur le repli (`page.addInitScript` retire `showSaveFilePicker` et `showOpenFilePicker`), la File System Access API restant un essai manuel. WebKit de Playwright : essayé sur la VM au lot 5 ; s'il ne s'installe pas sur Ubuntu 26.04, WebKit se joue sur le Mac (H2-10). | profil « Build et tests » ; brief (scénarios séparés VM / plateforme) ; hypothèse H2-10 | oui |
| D34 | Essais de plateforme | Linux : build Tauri sur la VM (un seul à la fois, profil). Windows : demande dans la file d'attente du PC, jamais bloquante. macOS : essai réel de Jérôme sur le Mac, fiche fournie. Android : « en attente de KVM », aucun build. Fiches dans `docs/essais/`. | brief (consigne mot pour mot sur les tests) ; profil « Parallélisme » et « Preuve visuelle » | oui |
| D35 | CI | **Aucun workflow au socle** : aucun runner self-hosted n'est enregistré pour ce dépôt (relecteur : `total_count 0`), et un workflow sans runner resterait en file sans fin. La preuve est `scripts/verifier.sh` lancé sur la VM ; la finalisation n'attend aucune CI (profil : « CI couverte par la suite complète : non », mais aucune CI n'existe). Le workflow `runs-on: [self-hosted, linux, vm]` viendra quand l'outillage aura enregistré le runner (Autres dépôts, section 7). | profil (« Workflows GitHub Actions : seulement … ») ; contre-relecture tour 1 ; hypothèse H1-9 | oui |
| D36 | Découpage en lots | 5 lots (ci-dessous). Le lot 1 est prêt pour l'après-midi et ne dépend que du squelette web. Les lots 2 et 3 peuvent avancer en parallèle (le 3 sur une fausse liaison jusqu'au merge du 2). | brief (lot 1 = prototype stylet) ; profil (« écriture du code en parallèle ») | oui |
| D37 | Page initiale et dernière page | `Document::new()` reste vide (test `new_document_has_no_page` gardé). `Document::blank()` crée une page dans une transaction **sans origine `"local"`**, avant la création de `History` : Ctrl+Z sur un document neuf ne la retire pas. À `load`, `History` est recréée après le décodage : rien de chargé ne s'annule. Supprimer la dernière page restante est refusé (commande sans effet, bouton désactivé). L'application démarre sur `Document::blank()`. | hypothèse H2-14 ; contre-relecture tour 1 | oui |
| D38 | Aperçu pendant un geste | Rien n'est écrit dans le document avant le relâché (horloge `\|\| 0` : aucune fusion d'étapes). Gomme partielle : l'aperçu efface en pixels sur le canvas d'interaction (copie de la scène, `destination-out` le long du chemin), puis une seule commande `Erase{path}` au relâché. Gomme d'objet : `hit_test_path` (lecture seule) à chaque image, les traits touchés sont masqués dans `drawLive`. Déplacer et redimensionner : les éléments sélectionnés sont masqués de la scène et dessinés dans `drawLive` avec la transformation provisoire, puis une seule commande `Transform`. Formes : dessinées dans `drawLive`, une `AddShape` au relâché. | contre-relecture tour 1 ; D11 ; DA5 | oui |
| D39 | Fin anormale d'un geste | Dans `sampler.ts` dès le lot 1 : `setPointerCapture` au `pointerdown` ; `pointercancel` ou `lostpointercapture` ferment le geste (trait d'encre : gardé jusqu'au dernier point reçu ; gomme, déplacement, forme : annulés sans écriture) ; `contextmenu` empêché sur la zone de dessin (appui long du stylet sous Windows) ; `buttons & 32` = bouton gomme ; contacts `touch` ignorés tant qu'un `pen` est en contact (D18). | contre-relecture tour 1 ; brief (Pointer Events) | oui |
| D40 | Licence | PolyForm Shield 1.0.0 (`LICENSE`, `Required Notice: Copyright 2026 Jérôme Denis`) : source ouverte, tout usage permis sauf celui qui concurrence le titulaire, licences commerciales accordées à part. Identifiant `LicenseRef-PolyForm-Shield-1.0.0` dans les `Cargo.toml` et `package.json`. Remplace l'hypothèse GPLv3 « à revoir » du brief OC26 (H0). Titulaire Jérôme Denis jusqu'à la création de RoomFlow. Dépôt public depuis le 2026-11-16, historique repris en un seul commit (l'ancien historique GPLv3 reste privé dans `roomboard-prive`). | décision de Jérôme, 2026-11-16 : « Je décide donc de rester sur l'option 2. » (option 2 = PolyForm Shield 1.0.0) ; « je développe Roomboard sous la responsabilité de Roomflow, qui va être créé prochainement. » | oui (titulaire seul) |

**Lots du socle (D36)**

| lot | contenu | dépend de | fin de lot |
|---|---|---|---|
| 1 — Stylet mesurable | `proto-stylet.html` en fichier unique (config Vite séparée) ; `src/engine/input/sampler.ts` (D39) + statistiques, testés sur événements synthétiques ; fiche d'essai `docs/essais/eni-stylet.md` (protocole, lecture du JSON, tableau « si échec ») ; contrôle de version de `wasm-bindgen` dans `verifier.sh` | squelette (`apps/web`, fusionné) | fichier HTML remis à l'orchestrateur avant l'essai ; S1 |
| 2 — Cœur du document | schéma D2 ; `Document::blank` (D37) ; `ink` (contour, collision, coupe par la gomme, `StrokeBuilder`) ; commandes ; `History` ; `format` (ZIP, manifeste, migration) ; liaison Wasm D10 ; tests de contrat vitest sur le vrai `.wasm` | squelette Rust (fusionné) | S2 et S3 au niveau du cœur (tests Rust) |
| 3 — Moteur d'interaction | caméra ; `Renderer` Canvas 2D à deux canvas ; routeur d'entrées D18 ; encre vive D20 ; outils stylo et gomme avec aperçus D38 ; annuler / rétablir au clavier ; banc du lot 1 rejoué avec la géométrie du produit | lots 1 et 2 (interface de liaison figée au début du lot 2) | S2 au navigateur |
| 4 — Outils d'édition | sélection, déplacer, redimensionner ; formes ; texte (IME) ; pages | lot 3 | S3, S4 |
| 5 — Interface et coque | application SolidJS ; barre d'outils depuis le profil (`toolbar.ts` étendu) ; barre des pages ; `FileHost` (Tauri, FSA, repli) ; coque Tauri (dialogues, fichiers, fermeture, CSP) ; Playwright ; build Tauri Linux ; fiches d'essai Windows et macOS | lots 3 et 4 | S2 à S5 ; porte visuelle |

## 3. Carte d'impact

Le profil n'a pas de ligne « Surfaces d'impact » : rubriques déduites (dépôt neuf, pas de graphe). « Nouveau » = endroit
créé par le chantier ; les chemins existants sont ceux de `feat/socle` à `b3f7489` (squelette fusionné).

### Cœur Rust (`crates/`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `Cargo.toml:3-5` (membres, exclusion de `src-tauri`) | non | les crates existantes suffisent | V |
| `Cargo.toml:9` (`edition = "2021"`) | non | D28 : édition gardée | V |
| `crates/roomboard-core/Cargo.toml:8` (`yrs = "0.28"`) | oui | ajout de `zip`, `freedraw` à côté ; yrs déjà monté | V |
| `crates/roomboard-core/src/document.rs:4-25` (`Document`, `new`, `add_page`, `page_count`) | oui | D2 : page en `Y.Map` ; D37 : `blank()` ; commandes | V |
| `crates/roomboard-core/src/capabilities.rs:4-29` (`Platform`, `Capabilities`, `capabilities`) | non au socle | D23 : rien à ajouter ; exposé par Wasm | V |
| `crates/roomboard-core/src/lib.rs:1-3` | oui | nouveaux modules `element`, `ink`, `history`, `format`, `commands` | V |
| `crates/roomboard-core/src/ink/` (nouveau) | oui | D6, D7, D12 | S |
| `crates/roomboard-core/src/history.rs` (nouveau) | oui | D11 | S |
| `crates/roomboard-core/src/format/` (nouveau) | oui | D24, D25 | S |
| `crates/roomboard-wasm/Cargo.toml:12` (`wasm-bindgen = "=0.2.130"`) | oui | ajout `serde-wasm-bindgen`, `js-sys` ; épinglage déjà fait | V |
| `crates/roomboard-wasm/src/lib.rs:7` (`version`), `:13-29` (`Document`) | oui | D10 : commandes, lectures, `StrokeBuilder`, `Change`, `capabilities`, `blank`, `load`, `save(now, app_version)` | V |

### Interface (`apps/web`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/package.json` (Vite 6, vitest 3, TS 5.6 ; scripts `build`, `test`) | oui | ajout `solid-js`, `vite-plugin-solid`, `vite-plugin-singlefile`, script `build:proto` | V |
| `apps/web/index.html:10` (`touch-action: none`), `:15-16` (deux canvas) | oui | gardés ; montage de l'application Solid autour | V |
| `apps/web/src/main.ts:1-22` (charge le Wasm, redimensionne au `devicePixelRatio`, crée un `Document`) | oui | devient l'amorce : `Document.blank()`, moteur, interface | V |
| `apps/web/src/toolbar.ts:1-24` (`ToolId`, `ToolDef`, `toolbar`, `validateToolbar`) | oui | D22 : étendu en profils (DA10) | V |
| `apps/web/tsconfig.json` | oui | `jsx: "preserve"`, `jsxImportSource: "solid-js"` | S |
| `apps/web/proto-stylet.html`, `apps/web/vite.proto.config.ts` (nouveaux) | oui | D29 | S |
| `apps/web/src/engine/input/` (nouveau) | oui | D18, D20, D29, D39 | S |
| `apps/web/src/engine/render/` (nouveau) | oui | D19, D38 | S |
| `apps/web/src/engine/camera.ts` (nouveau) | oui | D17 | S |
| `apps/web/src/engine/tools/` (nouveau) | oui | stylo, gomme, sélection, formes, texte | S |
| `apps/web/src/ui/` (nouveau) | oui | D21 | S |
| `apps/web/src/platform/files.ts` (nouveau) | oui | D26 | S |
| `apps/web/src/wasm/` (généré, `.gitignore:4`) | oui | sortie de `wasm-bindgen` | V |

### Coque (`apps/desktop`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/desktop/src-tauri/Cargo.toml:10-11` (`tauri = "2"`) | oui (lot 5) | `tauri-plugin-dialog`, `tauri-plugin-fs` | V |
| `apps/desktop/src-tauri/src/main.rs:3-7` | oui (lot 5) | enregistrement des plugins | V |
| `apps/desktop/src-tauri/capabilities/default.json:5` (`core:default`) | oui (lot 5) | permissions de dialogue et de fichiers limitées aux fichiers choisis | V |
| `apps/desktop/src-tauri/tauri.conf.json:7` (`frontendDist`), `:11` (`csp: null`) | oui (lot 5) | CSP avec `'wasm-unsafe-eval'` (D27) ; association de l'extension `.roomboard` | V |
| `apps/desktop/package.json` (`test` : « no tests ») | non | à garder vert | V |
| `apps/desktop/src-tauri/gen/` (`.gitignore:5`) | non | généré | V |

### Persistance et format

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| fichiers `.roomboard` | oui (nouveau) | D24 ; aucun fichier existant, aucune compatibilité (brief) | V (brief) |
| réglages de l'application (profil de barre choisi) | oui (nouveau) | D22 : `localStorage` sur le web, même stockage dans la WebView Tauri | S |

### Outillage, CLI et CI

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/verifier.sh:13-16` (build Wasm + `wasm-bindgen`, version non contrôlée) | oui | D9 : contrôle de version CLI = `Cargo.lock` ; option `--e2e` au lot 5 ; build du prototype | V |
| `package.json` racine, `pnpm-workspace.yaml` | non | scripts `build` / `test` récursifs suffisent | V |
| `.github/workflows/` | non au socle | D35 : pas de runner enregistré | V (relecteur) |

### Tests

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core/src/capabilities.rs:34-49` (2 tests) | non | à garder verts | V |
| `crates/roomboard-core/src/document.rs:37-48` (2 tests) | oui | restent vrais (0 page, puis 2) avec le nouveau schéma : à garder verts sans les affaiblir | V |
| `crates/roomboard-wasm/src/lib.rs:41-51` (2 tests) | non | à garder verts | V |
| `apps/web/src/toolbar.test.ts:4-16` (2 tests) | oui | adaptés au profil : « le profil par défaut est valide », « doublons et libellés vides détectés » gardent leur sens | V |
| tests de contrat vitest sur le vrai `.wasm`, tests du moteur, Playwright | oui (nouveaux) | D33 | S |

### Autres dépôts et services (hors périmètre, voir section 7)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| runner GitHub self-hosted de la VM pour `jejeasterix/roomboard` | oui, hors périmètre | aucun runner enregistré (`total_count 0`) : D35 | V (relecteur) |
| `~/.claude/scripts/vm/outils-vm.sh:19` (`DEPOTS=…`, sans `roomboard`) | oui, hors périmètre | cloner `roomboard` sur la VM par l'outillage | V |
| `~/.claude/scripts/graphes/graphes.cjs` (liste des dépôts à graphe) | oui, hors périmètre | aucun graphe de RoomBoard dans `~/.cache/graphes/` | V (absence) |
| `~/.claude/scripts/vm/places-vm.json:2-3` (6 places, chiffres d'ActCraft) | oui, hors périmètre | un build Tauri pèse 6 Go par ouvrier (`audit-ob94.md:100-102`) | V |

### Effets de bord sur l'existant

- `Document::add_page` cesse de pousser un entier dans `pages` et crée une page `Y.Map` (D2) : couvert par
  `add_page_increments_count` et `new_document_has_no_page` (`document.rs`, inchangés), plus un test neuf
  `page_has_id_and_default_size` et `blank_page_is_not_undoable` (D37).
- `toolbar.ts` change de forme (D22) : couvert par `toolbar.test.ts` adapté (mêmes deux contrôles) et un test neuf
  `parseToolbarProfile_rejects_unknown_tool`.
- `main.ts` devient l'amorce de l'application : couvert par le parcours Playwright S2 (l'application démarre sur une
  page vide).
- `verifier.sh` s'arrête si la CLI `wasm-bindgen` diffère de `Cargo.lock` : couvert en lançant le script sur la VM
  (version identique aujourd'hui, 0.2.130).

### Chantiers en cours

- `socle--T0` : fusionné dans `feat/socle` (`b3f7489`), worktree retiré. Aucun autre worktree sur le dépôt.
- PR ouvertes : aucune (`gh pr list`, dépôt `jejeasterix/roomboard`).
- Autre machine : aucune donnée par l'orchestrateur.

### Termes cherchés

- Graphe : aucun (`ls ~/.cache/graphes/` → `actcraft`, `claude-config`, `roomflow2`, `roomflow2-web` ; pas de RoomBoard).
- Coffre : `chercher.js` « roomboard tableau blanc Rust Wasm Tauri », « stylet pression latence encre », « roomboard
  socle », « pression pointer events webview », « format natif document fichier », « gomme undo annuler » ;
  `grep -ril roomboard ~/SecondBrain` (aucune note).
- Texte dans `feat/socle` : `grep -n "pub struct\|pub enum\|pub fn\|mod tests\|#\[wasm_bindgen" crates/*/src/*.rs` ;
  `grep -rn "toolbar\|ToolDef\|validateToolbar" apps/web/src` ; `grep -rn "getCoalescedEvents\|pointermove\|sampler\|Renderer\|getContext\|showSaveFilePicker" apps/web` (rien) ;
  `grep -n "canvas\|touch-action" apps/web/index.html` ; `grep -n "frontendDist\|csp\|permissions" apps/desktop/src-tauri/*.json apps/desktop/src-tauri/capabilities/*.json` ;
  `grep -n "^name = \"yrs\"\|^name = \"wasm-bindgen\"\|^name = \"fastrand\"" -A1 Cargo.lock` ; `wasm-bindgen --version`.
- Hors dépôt : `grep -n "roomboard\|DEPOTS" ~/.claude/scripts/vm/outils-vm.sh` ; `grep -rn "OC26\|OB87\|roomboard" ~/.claude/docs ~/.claude/scripts`.
- Sources de yrs 0.28.1 : `grep -n "pub fn with_options\|pub fn expand_scope\|pub fn new\|undo_blocking\|redo_blocking\|pub struct Options\|init_undo_stack\|impl Default for Options\|target_family" src/undo.rs` ;
  `grep -rn "fn move_to" src` (rien) ; `grep -n "fn uuid_v4" src/lib.rs` ; `src/sync/time.rs`.
- freedraw 1.0.4 : `grep -n "pub fn" src/*.rs` (`get_stroke`, `get_stroke_points`, `get_stroke_outline_points`, `get_stroke_radius`).
- Registres : `cargo search yrs | perfect_freehand | zip | serde-wasm-bindgen | wasm-bindgen-cli`, `cargo info freedraw`,
  `npm view solid-js | svelte | vite-plugin-singlefile | perfect-freehand version`.

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| Document Yrs et pages | `crates/roomboard-core/src/document.rs:4` `Document` | `Document::new`, `add_page`, `page_count` étendus ; ajout `blank()`, `page_ids()`, `elements(page)`, `apply(Command) -> Result<Change, CommandError>` | étendre |
| Table des capacités | `crates/roomboard-core/src/capabilities.rs:21` `capabilities` | `capabilities(Platform) -> Capabilities` appelée telle quelle | réutiliser |
| Liaison Wasm | `crates/roomboard-wasm/src/lib.rs:13` `Document` (wasm) | même type `Document` étendu des méthodes de DA5 ; `version()` (`:7`) gardée | étendre |
| Barre d'outils | `apps/web/src/toolbar.ts:1-24` (`ToolId`, `ToolDef`, `toolbar`, `validateToolbar`) | `ToolDef` → `ToolItem`, `toolbar` → profil `defaut`, `validateToolbar` → `parseToolbarProfile` (mêmes contrôles + forme) ; ajout `visibleItems(profile, caps)` | étendre (DA10) |
| Amorce de l'application | `apps/web/src/main.ts:1-22` (`init`, `resize`, `start`) | `resize` repris par le `Renderer` ; `start` crée `Document.blank()` puis monte le moteur et l'interface | étendre |
| Annuler / rétablir | `yrs::undo::UndoManager` (`yrs-0.28.1/src/undo.rs:73`) | `UndoManager::with_options(Options{capture_timeout_millis: 0, tracked_origins: {"local"}, capture_transaction: None, timestamp: Arc::new(\|\| 0), init_undo_stack: vec![], init_redo_stack: vec![]})` (`:130`), `expand_scope(&doc, &pages)` et `expand_scope(&doc, &meta)` (`:152`), `undo_blocking()` (`:529`), `redo_blocking()` (`:570`), `can_undo()` (`:482`), `can_redo()` (`:535`) | réutiliser, derrière `History` (DA6) |
| Identifiants | `yrs::uuid_v4` (`yrs-0.28.1/src/lib.rs:726`) | `uuid_v4()` | réutiliser |
| Encodage du document | `yrs` : `ReadTxn::encode_state_as_update_v1(&StateVector::default())` (`transaction.rs:140`), `Update::decode_v1` (`updates/decoder.rs:11`) | appelées par `format::save` / `format::load` | réutiliser |
| Contour à largeur variable | crate `freedraw` 1.0.4 : `get_stroke` (`src/get_stroke.rs:13`) | appelée seulement par `ink::outline(points: &[InkPoint], style: &InkStyle) -> Vec<f32>` et `StrokeBuilder` | réutiliser (si elle ne compile pas en wasm32 ou rend mal : portage propre, même interface) |
| Conteneur ZIP | crate `zip` (9.x) | `ZipWriter`, `ZipArchive` dans `format/` seulement | réutiliser |
| Échantillons du pointeur | API du navigateur `PointerEvent.getCoalescedEvents()` / `getPredictedEvents()`, `setPointerCapture` | appelées seulement par `engine/input/sampler.ts` | réutiliser |
| Échantillonnage et mesure de l'entrée | aucun (termes : `sampler`, `getCoalescedEvents`, `pointermove` dans `feat/socle` : rien) | `createSampler(target: HTMLElement, opts: {coalesced: boolean; predicted: boolean; raw: boolean}): { onGesture(cb: (g: GestureEvent) => void): () => void; stats(): SamplerStats; dispose(): void }` ; `GestureEvent = {kind: "start" \| "move" \| "end" \| "cancel"; pointerId; pointerType; eraserButton: boolean; samples: InputSample[]; predicted: InputSample[]}` ; `InputSample = {x, y, pressure, tiltX, tiltY, t}` | nouveau module (lot 1, réutilisé au lot 3) |
| Rendu | aucun (termes : `Renderer`, `getContext`, `Path2D` : rien ; `main.ts:6-13` ne fait que dimensionner) | DA2 | nouveau module |
| Fichiers | `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs` ; File System Access API | appelés seulement par `platform/files.ts` (DA8) | réutiliser derrière un nouveau module |
| Prototype en fichier unique | `vite-plugin-singlefile` 2.3 | plugin de `vite.proto.config.ts` seulement | réutiliser |

Constats d'architecture : `docs/architecture-constats.md` absent ; aucune demande « Constats à fermer ».

## 4. Hypothèses à revoir

**Niveau 1 — difficiles à défaire ou visibles des utilisateurs**

- **H1-1** Extension `.roomboard` et type `application/x-roomboard` (D24). Visible dès le premier fichier partagé ;
  gratuite à changer avant la première release.
- **H1-2** Doigt (D18) : ignoré pendant que le stylet touche ; un doigt trace tant qu'aucun stylet n'a été vu ; après
  un stylet, le doigt déplace la vue. Deux élèves qui tracent au doigt ensemble ne sont pas couverts au socle.
- **H1-3** Gomme partielle par défaut, gomme d'objet en second mode ; la gomme n'efface ni formes ni texte (D12).
- **H1-4** Page = cadre 1920 × 1080 dans un plan non borné (D5). Pèsera sur l'import flipchart et PDF.
- **H1-5** Repères chiffrés de l'essai ENI (D31) ; le verdict reste le ressenti de Jérôme.
- **H1-6** Une police embarquée (Atkinson Hyperlegible, OFL) pour le texte et l'interface. Porte visuelle.
- **H1-7** Le prototype est remis comme un fichier HTML autonome (Edge, Chrome ou navigateur de l'ENI), pas comme
  application Tauri : Edge partage le moteur de WebView2, pas sa composition ; la mesure dans WebView2 réelle suit par la
  file du PC. Le prototype dessine une polyligne, pas le contour du produit (D29). Aucun service externe.
- **H1-8** Couleurs et épaisseurs par défaut : noir, bleu, rouge, vert ; 3 épaisseurs (2, 4, 8 unités). Porte visuelle.
- **H1-9** Pas de CI au socle (D35) : la finalisation s'appuie sur `scripts/verifier.sh` lancé sur la VM et n'attend
  aucune CI ; le workflow arrive avec l'enregistrement du runner par l'outillage.

**Niveau 2 — les autres**

- **H2-1** Coordonnées locales `f32` + `transform` affine `f64` à 6 nombres (D4).
- **H2-2** Pression constante 0,5 pour souris et doigt ; pas de pression simulée par la vitesse au socle (D8).
- **H2-4** Liste des formes et contrainte Maj (D13).
- **H2-5** Règles de sélection et de redimensionnement ; épaisseur mise à l'échelle (D15).
- **H2-6** Pas de vignettes de pages au socle (D16).
- **H2-7** Bornes et gestes du zoom (D17).
- **H2-8** `zip` en pur Rust compile pour `wasm32-unknown-unknown` (D25) ; sinon conteneur écrit à la main
  (ZIP « stocké » sans compression) derrière la même interface `format`.
- **H2-10** Playwright Chromium sur la VM ; WebKit de Playwright sur Ubuntu 26.04 non prouvé : repli « Chromium seul sur
  la VM, WebKit joué sur le Mac » (D33).
- **H2-11** Pas de sauvegarde automatique ni de récupération après plantage au socle (hors périmètre).
- **H2-12** `freedraw` donne un trait propre avec la pression ; recalcul complet par image jusqu'à 2 000 points, blocs
  figés de 256 points au-delà (D7) ; réglages (`thinning`, `smoothing`, `streamline`) fixés au lot 2, ajustés après
  l'essai ENI. Repli : portage incrémental de l'algorithme derrière `ink::outline`.
- **H2-13** Budgets : pile d'annulation non bornée au socle (mesurée au lot 2 sur 1 000 gestes ; bornage par
  `UndoManager::clear` partiel ou pile propre si elle dépasse 50 Mo) ; module Wasm ≤ 1,5 Mo non compressé
  (`opt-level = "s"`, `lto`), mesuré par `verifier.sh`.
- **H2-14** Page initiale hors historique, dernière page indestructible (D37).

(H2-3 et H2-9 retirées : la liaison et la montée de yrs sont faites par `3730914`.)

## 5. Décisions d'architecture

**DA1 — SolidJS plutôt que Svelte, borné à `src/ui/`.**
Contexte : le brief demande un choix justifié ; l'interface est un canvas entouré de commandes, sous TypeScript strict.
Décision : SolidJS. Le TSX est vérifié par `tsc --strict` seul (Svelte demande `svelte-check` et un format de fichier
propre) ; ses signaux fins s'abonnent directement au compteur `version` des `Change` du cœur ; pas de DOM virtuel ni de
re-rendu de composants, le fil principal reste libre pour l'encre ; une barre décrite par une donnée se rend par un simple `<For>`.
Conséquences : écosystème plus petit que Svelte ; le moteur (`src/engine/`) n'importe jamais Solid : un changement de framework ne touche que `src/ui/`.

**DA2 — Moteur d'interaction sans framework, rendu derrière `Renderer`.**
Contexte : l'encre et la scène doivent tenir l'image ; le risque n° 1 peut imposer WebGL plus tard.
Décision : `src/engine/` en TS pur ; `interface Renderer { drawScene(page: PageView, camera: Camera, hidden: ReadonlySet<string>): void; drawLive(live: LiveLayer, camera: Camera): void; resize(w: number, h: number, dpr: number): void; }`
(`hidden` = éléments masqués pendant un aperçu, D38 ; `LiveLayer` = encre vive, aperçus, poignées), implémentation `Canvas2DRenderer` à deux canvas (scène, interaction `desynchronized`), cache `Path2D` par id invalidé par `Change`.
Conséquences : un passage à WebGL2 remplace une implémentation, sans toucher outils ni interface ; tests sur un faux contexte 2D.

**DA3 — Format natif : ZIP + manifeste JSON + état Yrs binaire v1.**
Contexte : imports d'images et de documents à venir, collaboratif plus tard, aucun utilisateur à ménager.
Décision : D24 ; v1 parce que c'est l'encodage commun à l'écosystème Yjs ; binaire parce que le JSON perd les identifiants CRDT.
Interface : `format::save(doc: &Document, meta: &SaveMeta) -> Result<Vec<u8>, FormatError>` avec `SaveMeta { app_version: String, now: String /* RFC 3339, fourni par la page */ }` ;
`format::load(bytes: &[u8]) -> Result<Document, FormatError>` ; `FormatError::{NotRoomboard, NewerVersion{found, supported}, Corrupt(String)}`.
Conséquences : le cœur reste sans horloge ; un fichier ne se lit pas à la main (outil de débogage plus tard si besoin) ; les gros binaires restent hors du CRDT.

**DA4 — Schéma Yrs : pages en tableau, éléments en tableau de maps, transformation affine.**
Contexte : D2, D4, D6 ; le collaboratif viendra, l'annulation suit le CRDT.
Décision : déplacer ou redimensionner n'écrit que `transform` (petite mise à jour, petite étape d'annulation) ; points
en tampon binaire immuable (un trait modifié par la gomme = trait retiré + nouveaux traits).
Conséquences : réordonner (hors socle) demandera retirer + réinsérer ou des indices fractionnaires, yrs 0.28.1 n'ayant plus `move_to` ; `meta.schema` et `formatVersion` permettent la migration.

**DA5 — Frontière Wasm à gros grain.**
Contexte : chaque appel et chaque copie entre JS et Wasm coûte ; l'encre ne doit pas attendre ; rien ne s'écrit avant la fin d'un geste (D38).
Décision : `Document` (wasm) expose `Document.blank()`, `Document.load(bytes)`, `apply(cmd: Command) -> Change` (commandes : `AddPage`, `RemovePage`, `CommitStroke{page, points: Float32Array, style}`, `Erase{page, path: Float32Array, radius, mode}`, `AddShape`, `SetText`, `Transform{ids, matrix}`, `Delete{ids}`),
lectures `element(id) -> ElementView`, `outline(id) -> Float32Array`, `hit_test(page, x, y, tol) -> Option<id>`, `hit_test_path(page, path, radius) -> Vec<id>`, `ids_in_rect(page, rect) -> Vec<id>`, `bounds(ids) -> Rect`,
`undo/redo/can_undo/can_redo`, `save(now: string, appVersion: string) -> Uint8Array`, et `StrokeBuilder { push(points: Float32Array) -> Float32Array /* contour courant */, finish() -> Float32Array }`.
Conséquences : au plus un passage par image pendant le tracé ; un `Change` tient l'interface à jour sans sondage ; un aperçu n'écrit jamais.

**DA6 — Historique : `UndoManager` de yrs 0.28.1 derrière `History`.**
Contexte : D11 ; sous Wasm, ni `UndoManager::new()` (`undo.rs:121`) ni `Options::default()` (`undo.rs:804`) ni `SystemClock` (`time.rs:20-25`).
Décision : `pub struct History` avec `History::new(doc: &Doc, scope: &[&dyn AsRef<Branch>]) -> History` (construit `Options` à la main, horloge `|| 0`, délai 0, origine `"local"`, puis `expand_scope`), `undo() -> bool`, `redo() -> bool`, `can_undo()`, `can_redo()`, `clear()` ;
toute écriture d'un geste passe par une seule `doc.transact_mut_with("local")`.
Conséquences : le cœur reste sans dépendance au navigateur ; l'annulation ignore les modifications distantes et la page initiale (D37) ; une pile propre pourra remplacer `UndoManager` sans changer les appelants.

**DA7 — Une seule géométrie d'encre, dans le cœur.**
Contexte : le rendu (TS) et la collision (gomme, sélection, en Rust) doivent voir le même trait ; `freedraw::get_stroke` calcule un trait entier.
Décision : `ink::outline(points: &[InkPoint], style: &InkStyle) -> Vec<f32>` (polygone fermé, x,y alternés), appelée par
`StrokeBuilder` (encre vive : recalcul complet ≤ 2 000 points, puis blocs figés de 256 points), par `Document::outline` (rendu, cache par id) et par `ink::hit` / `ink::erase` (collision, coupe).
Conséquences : un appel Wasm par image pendant le tracé, coût mesuré au lot 3 par le banc du lot 1 ; aucune copie du calcul en TS ; une jonction de blocs visible au-delà de 2 000 points est possible (H2-12).

**DA8 — `FileHost` : une interface, trois hôtes.**
Contexte : D26 ; Tauri, Chromium et Safari / Firefox n'ont pas les mêmes accès aux fichiers.
Décision : `interface FileHost { open(): Promise<OpenedFile | null>; save(bytes: Uint8Array, target: SaveTarget): Promise<SaveTarget | null>; }`
avec `OpenedFile = { name: string; bytes: Uint8Array; target: SaveTarget }` ; choix de l'hôte au démarrage (`isTauri()`, puis `'showSaveFilePicker' in window`, sinon repli).
Conséquences : l'interface et les outils ignorent la plateforme ; Playwright force le repli en retirant `showSaveFilePicker` (D33) ; un hôte iPadOS ou Android s'ajoute sans rien changer d'autre.

**DA9 — Si l'essai ENI échoue : échelle de remèdes.**
Contexte : risque n° 1 (latence et pression dans WebView2, WKWebView, WebKitGTK).
Décision, du moins coûteux au plus coûteux, chacun mesuré par le banc du lot 1 avant de passer au suivant :
(1) fusionnés + prédits + `pointerrawupdate` + `desynchronized` (déjà dans le prototype) ; (2) prédiction linéaire en TS
là où `getPredictedEvents` manque (WebKit) ; (3) traînée déléguée `navigator.ink.requestPresenter` (Chromium sous Windows,
le système dessine la pointe) ; (4) canvas d'interaction en WebGL2 (DA2) ; (5) réglages de WebView2 par la coque
(`additionalBrowserArgs`) ; (6) encre vive native dans la coque — contraire à la règle « le chemin de l'encre ne traverse
jamais la frontière page ↔ Rust natif » : **décision de Jérôme seule**. Pression absente : détectée, trait à largeur
constante, rien ne casse. Paume ou appui long qui coupent le trait : réglages de D39. Conséquences : les échelons 1 à 5 ne touchent que `src/engine/input` et `src/engine/render`.

**DA10 — Barre d'outils décrite comme une donnée, par extension de `toolbar.ts`.**
Contexte : profils de barre et d'interface à venir (brief) ; `apps/web/src/toolbar.ts` existe (liste plate `ToolDef`, `validateToolbar`).
Décision : dans le même fichier, `type ToolbarProfile = { id: string; label: string; groups: { id: string; items: ToolItem[] }[] }`,
`interface ToolItem { readonly id: string; readonly tool: ToolId; readonly icon: string; readonly label: string; readonly options?: Readonly<Record<string, unknown>> }` (remplace `ToolDef`) ;
`parseToolbarProfile(json: unknown): { profile: ToolbarProfile } | { errors: string[] }` (reprend les contrôles de `validateToolbar` : doublon, libellé vide ; ajoute outil inconnu, forme) ; `defaultProfile: ToolbarProfile` (remplace `toolbar`) ; `visibleItems(profile, caps): ToolItem[]`.
Conséquences : un profil se charge, s'échange et se teste sans interface ; l'éditeur de profils viendra plus tard.

## 6. Scénarios d'acceptation

**Tests automatiques de la VM** (`scripts/verifier.sh`, Playwright Chromium au lot 5, hôte de fichiers de repli forcé)

- **S2** Ouvrir l'application dans Chromium : une page vide, Ctrl+Z ne la retire pas. Tracer trois traits à la souris
  (événements synthétiques), gommer en travers du milieu du deuxième : il en reste quatre. Annuler : trois ; rétablir :
  quatre. Enregistrer en `.roomboard` (téléchargement intercepté), recharger la page, ouvrir le fichier (sélecteur
  `<input type=file>`) : les quatre traits sont là, aux mêmes coordonnées (même état Yrs).
- **S3** Ajouter deux pages ; écrire « Bonjour » en texte sur la page 1, tracer sur la page 2, poser un rectangle sur
  la page 3 ; enregistrer, rouvrir : chaque élément est sur sa page, compteur « 1 / 3 ». Supprimer la page 2, annuler :
  elle revient avec son trait. Supprimer deux pages : la dernière restante ne se supprime pas.
- **S4** Zoomer à 200 % par Ctrl+molette, déplacer la vue, tracer : le trait est enregistré aux coordonnées monde
  attendues. Sélectionner deux éléments au rectangle, les déplacer de 100 unités, les agrandir ×2 par une poignée de
  coin ; annuler deux fois : retour à l'état de départ (une étape par geste). Charger le profil de barre `essai-simple`
  (3 outils) : la barre n'en montre que trois. Sous WebKit si Playwright WebKit s'installe sur la VM, sinon sur le Mac.

**Essais de plateforme** (hors agent)

- **S1** (ENI, avec Jérôme, cet après-midi, lot 1) Ouvrir `proto-stylet.html` dans le navigateur de l'ENI ; écrire
  « Bonjour la classe » au stylet, la paume posée, puis au doigt, prédiction coupée puis active ; tenir le stylet
  appuyé 2 s (pas de menu) ; lire le panneau : type de pointeur, pression qui varie, fréquence, retard p95, contacts
  ignorés ; exporter le JSON et le rapporter. Verdict : le trait suit-il la pointe ?
- **S5** Application Tauri : Linux sur la VM (souris, bureau xrdp), puis Windows (file d'attente du PC, stylet) et macOS
  (Mac, Jérôme) : nouveau document, tracer, gommer, poser une forme et un texte, Enregistrer sous par la boîte native,
  fermer (confirmation si modifié), rouvrir le fichier : tout est là. Dans Chromium et Edge : même parcours avec la
  File System Access API (Ctrl+S réécrit le même fichier). Android : en attente de KVM, non joué.

## 7. Hors périmètre

- Synchronisation réseau (cloud ou réseau local), plusieurs fenêtres, annotation de bureau, web app iPadOS installable
  (PWA, service worker), Android, profils d'interface au-delà de la barre, éditeur de profils, imports (flipchart,
  myViewBoard, PDF avec OCR, Word, PowerPoint, Excel), images, vignettes de pages, rotation, réordonnancement des
  éléments, sauvegarde automatique, récupération après plantage, surligneur, impression et export.
- Installeurs signés Windows et macOS, release (go requis par le profil).
- Outillage (`claude-config` et GitHub), à confier par l'orchestrateur : enregistrer le runner self-hosted de la VM
  pour `jejeasterix/roomboard` (puis ajouter le workflow `runs-on: [self-hosted, linux, vm]`, D35) ; ajouter
  `roomboard` à `DEPOTS` (`~/.claude/scripts/vm/outils-vm.sh:19`) et au suivi des graphes (`scripts/graphes/graphes.cjs`) ;
  revoir `scripts/vm/places-vm.json` pour les builds Tauri (`audit-ob94.md:100-102`).

## 8. Portes immédiates

Aucune.
