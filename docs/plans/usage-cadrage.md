# Cadrage — usage (RoomBoard après le socle 0.1)

Cadré en mode autonome le 2026-11-19 (étage 1, cadreur), sans question posée à Jérôme : chaque point est tranché depuis
les sources ou posé en hypothèse « à revoir ». Ce cadrage ne précède pas un plan unique : son livrable central est le
**découpage en chantiers ordonnés** (section 9), chacun deviendra sa propre chaîne `nouvelle-feature` avec son propre
cadrage court, qui reprendra les décisions U ci-dessous comme sources de rang 2. Aucun code.

## 1. Demande et gabarit

**Demande.** Cadrer l'usage de RoomBoard au-delà du socle (annotation de bureau, barre d'outils et profils configurables,
glisser-déposer d'un maximum de formats avec édition quand c'est possible, édition de base des images et couleur
transparente, pot de peinture avancé, extensions propres aux fichiers et aux ressources, éditeur de grille et créateur de
tableau, démarrage en annotation et zone de dépôt dans la barre), puis le découper en chantiers ordonnés.

**Gabarit.** `lots` (budget 40 questions ; 39 consommées, numérotées U1 à U39).

**Demande de Jérôme, mot pour mot** (2026-11-19, vers 21:15) : « Mon futur objectif concerne l'usage. Les point
important, reste: - L'annotation de bureau - La configuration de la toolbar (outils, tailles, emplacement) -
Configuration des profils (interface, outils, etc...) - Prise en charge d'un max de formats directement en glisser
déposer > flipchart, formats de Smart, pdf, Word, Excel, PowerPoint, 3D types obj, etc..; image tout format; vidéo. Dans
la mesure du possible, autorise l'édition des flipchart, Smart, fichier myViewBoard, pdf, Word, Excel, PowerPoint. Les
image doivent pouvoir bénéficier d'édition de bases et comme,activ inspire un mode permettant de rendre transparent une
couleur de background. - Étudie bien les caractéristiques de l'outils pot de peinture de activ inspire, qui
particulièrement avancé. Il permet de remplir n'importe quelle zone fermée (image comprise), d'effacer modifier
la,couleur d'un objet, modifier la,couleur d'un mot par mot dans un texte editable. - un fichier aura sa propre
extension, idem pour un objet ou groupe d'objet sur le paperboard aura également son extension compatible, permettant
ainsi de créer des ressources, comme les .as4 de activ inspire. - l'éditeur de grille et un créateur de tableau seront
indispensables - Un profils pourra permettre le démarrage par défaut en mode annotation de bureau. Une zone sur la
toolbar en mode annotation de bureau permet de D&D les fichier afin de les ouvrir dans le Canvas, tout comme le ferrais
un D&D sur le Canvas directement. » Puis : « Continue d'avancer autant que possible suivant notre objectif établi. Nous
ferons les tests plus tard sur la version à laquelle tu seras parvenu » et « Hésite pas à parallélisé les taches quand
il y a de la place ». Vers 21:45 : « Il y aura forcément des fonction impossible sur android, iPad, et web app, nous
avions déjà,actée ceci. » (cité « Jérôme 21:45 » : une fonction réservée à la coque est acceptée d'avance, le cadrage
dit seulement où elle manque).

**Sources, par rang.** (1) Décisions de Jérôme ci-dessus ; coffre : 0069 (« il lit les .flipchart mais enregistre dans
son format […] sans réécrire le format propriétaire »), 0100 (ActCraft : « restent exclus […] l'écriture des
`.flipchart` » ; « si tu estime qu'une solution plus moderne est pertinente […] prend la décision en autonomie »), 0076 et
0246 (ActCraft : dépôt public, « rien de Promethean dedans » ; licence GPL-3.0-only depuis le 2026-11-12), D40 du socle (licence PolyForm Shield). (2) Les huit études
`docs/etudes/usage-*.md` (citées « étude <nom> § ») ; `docs/plans/socle-cadrage.md` (D1-D40, DA1-DA10) ;
`socle-PLAN.md` ; plans des lots 4 et 5a (lecture seule). (3) Code de `main` (`5341564`) et des branches
`feat/socle-lot4` (`62ae3b9`, puis `62e5717` à la contre-relecture), `feat/socle-lot5a` (`e501530`, puis `a302800`), lu depuis le dépôt principal en lecture seule. (4)
ActCraft (`~/projets/actcraft`), par les études. Pas de graphe graphify pour RoomBoard (`~/.cache/graphes/` n'en a pas) :
recherche textuelle. Coffre : aucune note RoomBoard ; recherche non dégradée.

## 2. Décisions

Ordre : principes et format, puis modèle des objets, puis profils et capacités, puis annotation, puis dépôt et imports,
puis outils (texte, pot, image), puis grille et tableau, puis formats un par un, puis licences. « réversible ? » : oui
tant qu'aucune release n'est publiée, sauf mention.

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| U1 | Principe d'édition des formats tiers | **Éditer = importer dans `.roomboard`, éditer dans RoomBoard, puis exporter.** Jamais de réécriture silencieuse du fichier d'origine. L'enregistrement dans le format d'origine n'existe que comme « Enregistrer une copie au format X » (niveau R, U2) : `.iwb` (R se confond avec l'export E), `.olf`, `.ubz`, et `.notebook` avec avertissement. `.flipchart` : lecture seule au départ (U36, à reposer). PDF et Office : l'« édition » est l'annotation par-dessus et l'export (PDF annoté) ; le contenu d'origine ne se modifie pas (texte d'un PDF, mise en forme d'un Word). | décision 0069 (« sans réécrire le format propriétaire », « À reposer si un écrivain `.flipchart` validé […] devient possible ») ; étude formats-tableaux § 11 ; étude formats-documents § 1, § 3 « Édition du texte d'un PDF », § 4 « Proposition honnête » | oui |
| U2 | Niveaux de prise en charge | Cinq niveaux, affichés par format dans le récapitulatif (section 10) : **A** import fidèle ; **B** import partiel avec liste d'avertissements (objets non lus) ; **P** pages en image (fond de page, annotation par-dessus) ; **E** export depuis RoomBoard ; **R** copie dans le format d'origine (aller-retour). Chaque import rend ses avertissements, comme ActCraft (`FlipchartReadResult::warnings`). | étude formats-tableaux § 11 (A, B, C, D) ; étude formats-documents § 2 | oui |
| U3 | Évolution du schéma | Tout ce que l'usage ajoute au document est **facultatif** (champ absent = comportement du socle) ; `schema` reste 1 et `formatVersion` 1 jusqu'à la première release (D2 et D24 : réversibles jusque-là) ; après, chaque ajout obligatoire passe par `format::migrate`. Un `kind` d'élément inconnu est **gardé** dans le document et dessiné comme un cadre gris « objet non pris en charge » ; il ne fait jamais échouer la lecture. Corrige le code : `toElementView` lève `ElementView invalide` sur un `kind` inconnu et exige `style.color` / `style.width` pour tout élément (`feat/socle-lot4:apps/web/src/core/wasm-core.ts:33-56`). **Valeurs composées** (fond, grille et ses niveaux, `crop`, `transparent`, métadonnées d'assets, chemins de groupe) : `Y.Map` de champs scalaires, `Y.Array` de `Y.Map`, ou tableau **positionnel** de scalaires (`Any::Array`) ; **jamais `Any::Map`**, dont l'ordre d'encodage n'est pas déterministe (D25). Chaque chantier qui ajoute une valeur composée ajoute un test « recharger garde les octets » sur le modèle de `reload_with_strokes_keeps_bytes`. | D2 (`socle-cadrage.md:29`), D24 (`:51`), D25 ; `element.rs:98-103` (« jamais en `Any::Map` ») ; `format/mod.rs:376` ; étude ressources § 4.6 (L2-C8 d'ActCraft) ; code lu | oui |
| U4 | Fichiers joints (assets) | Les **octets restent côté page** : `AssetStore` TS (empreinte → `Blob`, que le navigateur peut garder sur disque), jamais dans la mémoire du module Wasm de l'encre, qui ne rétrécit pas. Le cœur ne garde que les métadonnées, dans une map racine `assets` (nouvelle, facultative, U3) : par empreinte, `name` d'origine, `mime`, `size`, `linked` (chemin relatif + empreinte, coque seulement). Enregistrer : le cœur écrit comme aujourd'hui `manifest.json` et `document.ybin` ; un **Worker** (module `roomboard-formats`, U23, qui réutilise le code ZIP du cœur comme dépendance Rust) ajoute les entrées `assets/<sha256>.<ext>` une à une depuis les `Blob` (méthode « stored » pour JPEG, PNG, MP4, PDF), puis son instance est jetée. Ouvrir : le Worker extrait les assets en `Blob` et ne passe au cœur que le manifeste et `document.ybin` (`format::load_parts`). **Ouvrir et Enregistrer du lot 5a suivent** : `controller.ts` valide aujourd'hui par `core.load(file.bytes).free()` et `pending.ts` garde `bytes: Uint8Array`, ce qui ferait entrer tout le fichier, assets compris, dans le module de l'encre ; C2 les passe au découpage ci-dessus (validation par le Worker puis `load_parts`, attente IndexedDB en `Blob`) et DA8 devient `save(file: Blob, target)` / `OpenedFile { name, file: Blob, target }`. Les entrées `assets/` sont écrites **triées par empreinte** (D25) ; test « enregistrer deux fois un document à assets donne les mêmes octets ». Seuls les assets cités par un élément ou un fond vivant sont écrits ; en mémoire, tout asset reste jusqu'à la fermeture (l'annulation peut le rappeler). Empreinte calculée dans le Worker (`sha2`, MIT OU Apache-2.0) ; dédoublonnage par empreinte. | D24 (« dossier `assets/` réservé (empreinte SHA-256) », `socle-cadrage.md:51`) ; DA3 (« les gros binaires restent hors du CRDT », `:282`) ; H2-13 ; étude formats-documents § 8 « Stockage dans `assets/` », « Taille maximale » ; étude ressources § 4.4 (4) ; contre-relecture tour 1 | oui (HU1-10) |
| U5 | Élément image | `kind: "image"` dans `elements` (D2) : `asset` (empreinte), `w`, `h` (taille source en pixels), `transform` (D4), et les paramètres non destructifs facultatifs de U29. Pas de `style` de trait (U3 rend `style` facultatif hors `stroke`). Collision : rectangle transformé (la transparence cliquable « Pick Through » vient plus tard, HU2-9). Rendu : bitmap décodé par le navigateur (`createImageBitmap`), en cache par élément, invalidé par `Change`. | étude édition-image « Recommandation », option 1 ; étude annotation-bureau § « Retour de la capture » (3) (« dépendance ouverte ») ; D2, D19 | oui |
| U6 | Fond de page importé | Propriété facultative de page `backdrop` : `Y.Map{ asset, kind: "image" \| "pdf-page", page?, fit: "contain" }`, dessinée sous la grille et sous les éléments ; elle ne se sélectionne pas et ne se gomme pas (comme l'image « verrouillée en couche Fond » d'ActCraft). Le genre `image` arrive avec C2 (utilisé par la capture d'annotation et les fonds en ressources), `pdf-page` avec C12. Une page PDF n'est **pas** rastérisée dans le fichier : l'original est un seul asset, `pdf.js` rend la page à la demande (cache par palier de zoom). La taille de page suit la page importée (hauteur 1080, largeur selon le rapport ; HU1-6). | étude formats-documents § 3, § 9 (ActCraft : « image verrouillée en couche Fond ») ; D2 (page = `{…, background, elements}`), D5 | oui |
| U7 | Groupe d'objets | **Propriété, pas élément** : champ facultatif `group` d'un élément = liste d'identifiants de groupe du plus extérieur au plus intérieur (`Any::Array` de chaînes, remplacé en bloc) ; groupes imbriqués permis. L'ordre d'empilement ne bouge pas au groupement. Un clic prend le groupe extérieur ; transformer un groupe = `Transform{ids}` sur ses membres (existe, lot 4). Grouper et dégrouper = une commande, une étape. Voir DAU3. | étude ressources § 8 q. 1 et § 6 ; étude grille-tableau § 9 q. 9 ; D2 (éléments en tableau plat), DA4 (`move_to` absent de yrs 0.28.1) ; CL4-8 du lot 4 (`Transform` composé à gauche) | oui (DAU3) |
| U8 | Extensions et `kind` du manifeste | `.roomboard` (document, inchangé, D24) ; `.rbitem` (ressource : objets ou grille) ; `.rbpack` (paquet de ressources) ; même conteneur ZIP. `manifest.json` gagne `kind` : `"document"` (défaut si absent : fichiers du socle lus tels quels), `"fragment"`, `"grid"`, `"pack"` ; `kind` inconnu = refus avec message clair. Profil : `.rbprofile`, JSON (pas ZIP), `format: "roomboard-profile"`. Types MIME `application/x-roomboard-item`, `-pack`, `application/vnd.roomboard.profile+json`. | demande (« un fichier aura sa propre extension, idem pour un objet ou groupe d'objet ») ; étude ressources § 4.1, § 4.2, § 6 option 1 ; étude profils-toolbar § « Fichier exportable » ; étude grille-tableau § 4.5 ; H1-1 du socle | oui jusqu'à la release (HU1-1) |
| U9 | Fragment et insertion | Un fragment est un **document neuf d'une page** contenant des copies des objets choisis (jamais le document d'origine élagué), avec `name`, `keywords`, `description`, `bounds`, `thumbnail.png`, et ses seuls assets cités ; même découpage qu'U4 : le cœur écrit et lit le manifeste et `document.ybin` du fragment, le Worker ajoute ou extrait les assets et la vignette (rendue par la page), jamais dans le module de l'encre. Insertion : lecture dans un document temporaire, recopie de chaque élément (copie profonde, sous-types Yrs compris) avec un `uuid_v4` neuf, identifiants de groupe renumérotés, références hors fragment remises à zéro, translation vers le point de dépôt, assets absents copiés ; **une transaction `"local"`** = une étape. Le même code insère les **pages d'un document** après la page montrée (`InsertPages`, une étape, U25). Jamais `document.ybin` appliqué comme mise à jour Yrs sur la cible. Presse-papiers : enveloppe JSON `{format: "roomboard-items/1", rbitem: <octets du .rbitem en base64>}` : un seul codeur d'objet (celui du `.rbitem`) pour fichier, fragment et presse-papiers. | étude ressources § 2, § 4.2 option A, § 4.4, § 4.5 ; D3, D11 | oui (DAU4) |
| U10 | Capacités | Deux espèces : **statiques** (table du cœur par plateforme, `capabilities(platform)`, existe déjà avec `desktop_annotation` et `multi_window`, `crates/roomboard-core/src/capabilities.rs:14-29`) et **dynamiques** (détectées à l'exécution par la page ou la coque : session Wayland native, chemins au dépôt, convertisseur Office installé, pression). Côté page, `RuntimeCapabilities` = statiques corrigées par les dynamiques, publiées comme un signal ; `visibleItems(profile, caps)` les lit. Correction : sous Linux, `desktop_annotation` vaut `true` statiquement, faux sous Wayland natif : la coque l'abaisse au démarrage (U20). Un champ statique ne s'ajoute au cœur que quand un composant le lit (D23). | D22, D23 (`socle-cadrage.md:49-50`) ; étude profils-toolbar § « Plateformes et capacités » ; code lu (`capabilities.rs`, `crates/roomboard-wasm/src/lib.rs:61`, contrat `wasm-core.contract.test.ts:364-366`) | oui |
| U11 | Modèle du profil | JSON versionné : `format: "roomboard-profile"`, `schema: 1`, `id`, `label`, quatre blocs `interface` (langue, thème, `buttonSize`), `toolbars` (U12), `presets` (par outil : couleurs, épaisseurs, tailles), `behavior` (`startMode`, page et fond par défaut), `platform` (surcharges facultatives par plateforme). `parseProfile` refuse une version majeure supérieure (« mettez RoomBoard à jour »), lit une mineure plus récente et **conserve les clés inconnues** à la réécriture. Profils fournis intégrés au code, en lecture seule ; une copie utilisateur de même `id` les remplace ; « Revenir à l'origine » la retire. `ProfileStore` en interface (lister, lire, écrire, supprimer, importer, exporter), première implémentation `localStorage`. Le profil vit dans les réglages de l'appareil, jamais dans le document. `parseToolbarProfile` (DA10) devient une partie de `parseProfile`. | étude profils-toolbar § « Modèle proposé », « Stockage », « Schéma versionné », option 1 ; D22 (« le profil choisi se garde dans les réglages de l'application (pas dans le document) ») ; DA10 ; ActCraft `profile.cpp:74-81` (version majeure), `profilestore.cpp` (par l'étude) | oui |
| U12 | Barres | `toolbars` est une **liste** ; chaque barre a `id`, `role` (`tools`, `pages`, …), `dock` (`top`, `bottom`, `left`, `right`, `floating` + position et taille), `collapsed`, des groupes d'éléments. La barre des pages est une entrée de la liste (`role: "pages"`). Élément de barre : `kind: "tool" \| "action" \| "dropzone" \| "separator"`, `id` stable jamais réutilisé, `tool` (chaîne ouverte validée par la table des outils, pas une union figée), `icon`, `label`, `options`, `requires` (capacités). Préréglages séparés des éléments (`presets`, partagés par toutes les barres) ; rangée contextuelle dérivée des préréglages de l'outil actif. Taille de bouton en jeton `s \| m \| l` servi par une variable CSS. Deux remises à zéro : barres, préréglages. Réordonner aux événements de pointeur, jamais au glisser HTML5. | étude profils-toolbar § « Barres », « À prendre dès le lot 5b » 2-7, 11-14 ; SMART (deux remises à zéro, rangée contextuelle, par l'étude) ; ActCraft (cinq positions) ; étude annotation-bureau § « Zone de dépôt » (glisser HTML5 coupé sous Windows) | oui |
| U13 | Outil inconnu dans un profil | Gardé, masqué, réécrit tel quel, avec un avertissement dans le journal ; seules la forme invalide, le doublon d'`id` et le libellé vide sont des erreurs. Écart à DA10 (« ajoute outil inconnu » comme contrôle) : un profil venu d'une version plus récente doit rester utilisable. | étude profils-toolbar § « Schéma versionné » (dernier point) et q. 5 ; D22 (« masqué, pas supprimé ») ; ActCraft `unknownKeys` | oui |
| U14 | Démarrage en annotation | `behavior.startMode: "board" \| "desktop-annotation"`, appliqué **à chaque démarrage** avec ce profil ; capacité absente (web, iPad, Android, Wayland natif) = repli silencieux sur `board`, sans erreur. | demande (« Un profils pourra permettre le démarrage par défaut en mode annotation de bureau ») ; étude profils-toolbar § « Comportement » ; Jérôme 21:45 | oui |
| U15 | `ToolbarHost` | La barre ne parle au reste que par `ToolbarHost { setTool(tool, preset?), runAction(id), dropFiles(files, at?), setMode(mode) }` ; implémentation locale = appels directs (lot 5b) ; implémentation distante = messages Tauri entre fenêtres (annotation). Le moteur ne lit jamais le profil : il reçoit des commandes ; un changement de profil à chaud attend la fin du geste en cours (D39) et donne au plus un `setTool`. | étude profils-toolbar « À prendre dès le lot 5b » 9-10 ; étude annotation-bureau § « Recommandation » | oui |
| U16 | Fenêtres de l'annotation | Une **fenêtre d'annotation** (`annotate`) transparente, sans cadre, au premier plan, à la taille de l'écran, qui porte son propre moteur et son propre document (D27) ; la **fenêtre principale se réduit à sa barre** (au premier plan, sans cadre, géométrie de la barre), comme ActCraft. La barre pilote la fenêtre d'annotation par `ToolbarHost` distant. Une fenêtre de barre dédiée reste possible sans refonte (U15). Voir DAU2. | étude annotation-bureau § « Les solutions, comparées » (A + B), § « Acquis ActCraft » (`desktopcontroller.cpp:435-455`, fenêtre principale réduite à la palette) | oui (DAU2) |
| U17 | Bascule dessin / souris | Liée à l'outil, comme ActCraft (`followTool`) : l'outil « Souris » met la fenêtre d'annotation en clic à travers (`set_ignore_cursor_events(true)`), tout autre outil la reprend ; un bouton dédié dans la barre en plus. Pas de raccourci global au premier chantier (permission système). | étude annotation-bureau § « Clic à travers », solution B ; ActCraft `desktopcontroller.h:111-113` (par l'étude) ; ActivInspire (outil souris, par l'étude) | oui |
| U18 | Bureau vivant ou figé | **Vivant par défaut** (fenêtre transparente, bureau réel visible dessous, comportement d'ActivInspire tel que l'usage le connaît et qu'ActCraft l'a repris, non vérifié sur une source ouverte) : il ne demande aucune capture ni autorisation d'écran. **Figé** en option (« Figer le bureau » : capture puis image en fond, fenêtre opaque) et en repli automatique là où la transparence ne se peint pas (WebKitGTK). Écart à l'étude, qui proposait le figé en base : le vivant est le seul qui se livre sans capture. | étude annotation-bureau § « ActivInspire » (réduction de l'application vérifiée ; vivant ou figé : non vérifié, l. 65), § « Capture du bureau », q. 2 ; ActCraft `toggleLiveDesktopBackground` (par l'étude) | oui (HU1-3, Q2) |
| U19 | Écrans | Un seul écran à la fois : celui de la barre ; choix de l'écran dans la barre. Une fenêtre d'annotation par écran : plus tard. | étude annotation-bureau § « Multi-écrans » (compromis du socle), q. 1 | oui |
| U20 | Linux et Wayland | Pris en charge sous X11 et XWayland ; sous Wayland natif, la capacité `desktopAnnotation` est abaissée (U10) et la barre propose « Relancer en mode compatibilité » (`GDK_BACKEND=x11`). Aucun code `layer-shell`. | étude annotation-bureau § « Wayland : limites réelles » (vérifié : `set_always_on_top` non pris en charge, `cursor_position` = 0,0) ; Jérôme 21:45 | oui |
| U21 | Document d'annotation et envoi au tableau | Le document de la fenêtre d'annotation est gardé d'une activation à l'autre pendant la session (comme le paperboard d'ActCraft, P14). « Envoyer au tableau » ajoute une page au document principal après la page montrée : capture de l'écran sans nos fenêtres en `backdrop` (U6, si une capture est possible), et l'**encre gardée vectorielle**, transmise comme fragment `.rbitem` (U9) par fichier temporaire créé par la coque (ajouté à l'ensemble des chemins accordés, U24) + événement Tauri, insérée en une étape. Sans capture (autorisation refusée, Wayland) : page à fond blanc avec l'encre. | étude annotation-bureau § « Retour de la capture » (option (a) par chemin temporaire ; variante vectorielle « pour plus tard » rendue possible par U9 sans synchronisation Yrs) , q. 3 et 4 ; D27 | oui |
| U22 | Zone de dépôt de la barre en annotation | Un élément `kind: "dropzone"` de la barre (livré par C11a) ; déposer dessus appelle la même `importFiles` que le dépôt sur le canvas (U23) : le contenu va dans le document principal, avec une différence : **en annotation, un document n'est jamais ouvert** (Ouvrir recharge la fenêtre principale, réduite à la barre : barre et mode perdus) ; le menu au point de dépôt propose « Insérer ses pages » (`InsertPages`, U9, dès C3) et « Ouvrir (quitte l'annotation) » (l'annotation se ferme, la fenêtre reprend sa taille, puis Ouvrir du lot 5a) ; avant C3, seul « Ouvrir (quitte l'annotation) ». On reste en annotation ; un avis « ajouté à la page N » propose « Voir » (HU1-11). Masquée sans la capacité « chemins au dépôt » (web). | demande (« Une zone sur la toolbar en mode annotation de bureau permet de D&D les fichier afin de les ouvrir dans le Canvas, tout comme le ferrais un D&D sur le Canvas directement ») ; étude annotation-bureau § « Zone de dépôt » ; plan du lot 5a, « Choix tranchés » (Ouvrir = rechargement, `socle-lot5a-PLAN.md:72`) ; contre-relecture tour 1 | oui |
| U23 | Chaîne d'import unique | Toute entrée de fichier (dépôt sur le canvas, zone de la barre, menu Importer, collage, fichier passé au lancement) passe par une seule fonction `importFiles(files: DroppedFile[], at?: Point)` ; `DroppedFile = { name, size, mime, path?, blob(): Promise<Blob> }` (`path` en coque seulement ; en coque, `blob()` lit par morceaux via `read_granted_file`, U24, quelle que soit l'entrée : dépôt, lancement, Importer). Détection par **octets magiques** (premiers Ko) puis extension, registre d'importeurs `Importer { id, nature, detect(head: Uint8Array, name): boolean, run(file, ctx): Promise<ImportResult> }`, `ImportResult = { pages?, elements?, assets, warnings }`. Les formats lus par calcul pur (ZIP, XML, JSON, binaire : `.iwb`, `.notebook`, `.ubz`, `.olf`, `.flipchart`, `.xlsx` en valeurs, TIFF) sont lus en Rust dans un **second module Wasm `roomboard-formats`**, en Worker, chargé au premier besoin ; les formats que le navigateur décode (images, PDF par `pdf.js`, vidéo, 3D) dans la page. Voir DAU1 et DAU5. | étude formats-documents § 8 (« un seul pipeline d'import […] détection par octets magiques ») ; étude formats-tableaux § 10 (cœur Rust/Wasm, iPad compris) ; H2-13 du socle (Wasm ≤ 1,5 Mo ; 1 327 888 octets mesurés, état du socle) ; `scripts/verifier.sh:26-28` | oui (DAU1, DAU5) |
| U24 | Glisser-déposer dans la coque | `dragDropEnabled` gardé à `true` (défaut) sur la fenêtre principale : chemins complets par `onDragDropEvent` (`enter`, `over`, `drop`, `leave`), position en pixels physiques ramenée par `devicePixelRatio`. Conséquence assumée : sous Windows, glisser HTML5 coupé dans cette fenêtre (aucun réordonnancement HTML5, U12). Lecture : `tauri-plugin-fs` 2.7.1 ajoute **de lui-même** les chemins déposés à sa portée, dossiers compris et récursivement (`scope_dropped_paths`, vrai par défaut, `tauri-plugin-fs-2.7.1/src/config.rs:23`) ; avec `fs:allow-read-file` et `fs:allow-write-file` du lot 5a, un dossier déposé devient lisible **et inscriptible** par la page. Décision : `plugins.fs.scopeDroppedPaths: false` dès le lot 5b ; la coque tient en Rust un **ensemble de chemins accordés**, alimenté par le dépôt (`DragDropEvent::Drop`, fichiers seulement), le fichier passé au lancement (arguments, `RunEvent::Opened`), la boîte « Importer » ouverte depuis Rust (`DialogExt`) et les fichiers temporaires qu'elle crée (U21) ; la commande `read_granted_file(path, offset, len)` refuse tout autre chemin. Les boîtes Ouvrir / Enregistrer du `.roomboard` du lot 5a gardent `plugin-fs` (portée donnée par le plugin dialog). Web : `dragover` / `drop` HTML5 sur la scène, objets `File` sans chemin, plus `<input type=file multiple>`. | étude formats-documents § 8 (V : `config.rs`, `drag_drop_enabled`) ; étude annotation-bureau § « Zone de dépôt » ; plan du lot 5a, « Choix tranchés » (`:83`) ; `tauri-plugin-fs` 2.7.1 `src/lib.rs:629-646`, `config.rs:19-23` (contre-relecture tour 2, relu) | oui |
| U25 | Ce que fait un dépôt | Selon la nature du fichier : **document** (`.roomboard`, `.flipchart`, `.notebook`, `.iwb`, `.olf`, `.ubz`) déposé sur un tableau vierge et non modifié → ouvert comme document (chemin d'Ouvrir du lot 5a, rechargement) ; sinon (contenu, ou modifié) → un **petit menu au point de dépôt** : « Ouvrir à la place » (question si modifié), « Insérer ses pages ici » (`InsertPages` après la page montrée, une étape, dès C3), « Annuler ». Aucune touche tenue : l'événement de dépôt de Tauri ne porte que chemins et position, et la fenêtre n'a pas le focus pendant un glisser depuis l'explorateur. En annotation : U22. **Pages** (PDF, Office converti) → pages insérées après la page montrée. **Objets** (image, vidéo, son, 3D, `.rbitem`, SVG) → insérés sur la page montrée au point de dépôt. **Grille** (`.rbitem` de `kind: "grid"`) → remplace la grille de la page. **Paquet** (`.rbpack`) → importé dans la bibliothèque. **Profil** (`.rbprofile`) → proposé à l'import. Plusieurs fichiers : traités dans l'ordre, une étape d'annulation par fichier, file annulable. | demande (« afin de les ouvrir dans le Canvas ») ; étude ressources § 4.3 ; étude formats-documents § 8 « Sécurité » (file avec annulation) ; plan du lot 5a (Ouvrir = valider, attente IndexedDB, rechargement) ; CL4-12 du lot 4 (Maj suivie au `keydown`) ; contre-relecture tour 1 | oui (HU1-2, Q1) |
| U26 | Limites | Web et iPad : 100 Mo par fichier (refus avec message) ; coque : lecture par morceaux, pas de limite fixe. Image décodée bornée à 100 millions de pixels ; au-delà de 4096 px de côté, l'import garde l'original mais décode une copie réduite pour l'affichage. Vidéo : incluse dans `assets/` jusqu'à 50 Mo ; au-delà, **liée** en coque (chemin relatif + empreinte, avertissement « vidéo non incluse ») et refusée au-delà de 100 Mo sur le web. PDF : 500 pages par import. Fichiers chiffrés : refusés avec message (comme ActCraft). | étude formats-documents § 7 « Stockage et poids », § 8 « Taille maximale », « Sécurité » ; étude édition-image § « Ce qui marche sur iPad » (4096 px) ; ActCraft `pdfimport.cpp` (100 Mpx, PDF chiffrés refusés, par l'étude) | oui (HU1-7) |
| U27 | Texte riche par plages | Le contenu d'un texte reste le `Y.Text` du lot 4 (`content`, `TextPrelim`) ; il gagne des **attributs de plage** (`color`, puis `bold`, `italic`, `underline`, `size`), la couleur de l'élément restant le défaut (D14). Rendu par segments de même attribut. **`SetText` doit appliquer une différence** (préfixe et suffixe communs, puis suppression et insertion au milieu) au lieu de tout remplacer : le code du lot 4 fait `remove_range(0, len)` puis `insert` (`feat/socle-lot4:crates/roomboard-core/src/commands.rs`, `cmd_set_text`), ce qui effacerait les attributs à la première édition. Nouvelle commande `FormatText{id, start, len, attrs}` (une étape). Édition riche (contenteditable, IME) : chantier à part ; le `<textarea>` de D14 reste pour le texte simple. | étude pot-de-peinture § « Cas 6 » ; étude grille-tableau § 5.1 (texte riche des cellules) ; D14 (`socle-cadrage.md:41`) ; code du lot 4 lu | oui (DAU9) |
| U28 | Pot de peinture | Outil modal (couleur choisie, puis clic). **Cible** : l'élément le plus haut sous le pointeur (`hit_test`, `lot4: query.rs:147`, tolérance 6 px écran), puis dans cet élément : image → zone de pixels ; texte → le mot sous le pointeur (P2) ; forme → contour si le clic est à moins de la tolérance du bord, sinon intérieur ; trait → sa couleur. Aucun élément touché → zone fermée par plusieurs objets s'il y en a une (P3), sinon fond de la page. Livré par **paliers** : **P1 vectoriel** : `fill` d'une forme, `color` d'un contour ou d'un trait, couleur d'un texte entier, `background` de la page, « effacer » une forme = `fill: none`. **P1 image** : remplissage d'une zone d'image par diffusion 4-connexe avec tolérance (défaut 5 sur 100) **réglable dans la rangée de l'outil** (et non cachée dans les préférences comme ActivInspire), et **« effacer » une zone d'image = la rendre transparente** (alpha 0) par la même diffusion. **P2** couleur **mot par mot** (position du caractère, limites de mot UAX 29, `FormatText`, U27). **P3** zone fermée par plusieurs objets : région décidée sur la vue rastérisée (tolérance de fermeture 2 px), forme calculée par `i_overlay` (MIT OU Apache-2.0), nouvel élément `kind: "fill"` non lié, posé au-dessus des objets d'origine. Un clic = une étape. | demande (« remplir n'importe quelle zone fermée (image comprise), d'effacer modifier la couleur d'un objet, modifier la couleur d'un mot par mot ») ; étude pot-de-peinture § « Fonctions à reproduire » (8 : « remplir de transparent »), « Cas 7 et 8 », « Recommandation » option 1 ; ActCraft `fillHitAt` (par l'étude) ; décision 0100 (solution moderne permise, ActCraft) | oui |
| U29 | Édition d'image | **Non destructive** pour rogner (`crop`), retourner (`flipX`, `flipY`), quarts de tour (`quarterTurns`), luminosité et contraste, et couleur transparente `transparent{color, tolerance, soft, contiguous}` (pipette sur l'image, tolérance au curseur, mode contigu ou global, aperçu avant validation) : champs facultatifs de l'élément image, une étape par validation, « Rétablir l'original » retire les champs. **Destructive** et explicite pour ce qui change des pixels (pot P1 sur image, gomme sur image) : nouvel asset PNG, l'élément garde `sourceAsset` (l'original) pour « Rétablir l'original ». Rotation libre : hors de ce chantier (rotation d'élément générale, absente de l'interface du socle, D4). | demande (« édition de bases et […] rendre transparent une couleur de background ») ; étude édition-image option 1 (« mixte non destructif d'abord ») ; étude pot-de-peinture § « Cas 5 » (même pipeline) ; D4 | oui |
| U30 | Calcul des pixels | Fonctions pures du cœur Rust (`transparent_color`, `flood_fill`, `adjust`), sans crate d'image ajoutée, testées par `cargo test` ; exposées sans état par le module `roomboard-formats` (U23) et appelées dans un **Web Worker** sur `Uint8Array` RGBA ; résultat jeté si le document a changé entre-temps (comme ActCraft). Décodage par le navigateur ; encodage PNG par `OffscreenCanvas.convertToBlob`. | étude édition-image § « Où calculer », « Où faire quoi » ; étude pot-de-peinture § « Cas 5 » (Worker, péremption) ; D1, D7 (une seule implémentation) | oui |
| U31 | Grille | **Propriété de page** `grid` (jamais un élément) : `Y.Map{visible, snap, above, levels}`, `levels` en `Y.Array` de `Y.Map{kind, spacingX, spacingY, originX, originY, color, line, snap, visible}` (U3 : jamais `Any::Map`), réécrit en bloc à la validation de l'éditeur (une séance = une étape) ; `kind` ∈ `squares`, `lines`, `dots`, `isometric`, `music`, `seyes` (inconnu : gardé, ignoré). Magnétisme en fonction pure du cœur (`snap_point`, `snap_delta`, écrite d'après `nearestGridPoint` d'ActCraft, U39), appliqué aux déplacements et aux formes, jamais au tracé d'encre ; Alt l'ignore ; point accroché : le coin ou le centre de la boîte le plus proche. Rendu sur la scène fixe, ligne d'un pixel d'écran à tout zoom, niveau trop fin sauté. Éditeur en panneau avec aperçu en direct ; grille enregistrable en ressource (`.rbitem`, `kind: "grid"`). Test « recharger avec grille garde les octets ». | demande (« l'éditeur de grille […] indispensable ») ; étude grille-tableau § 4, § 7 option 1 ; ActCraft `model.h:521-565`, `gridsnap.cpp:176-236` (par l'étude) ; `element.rs:98-100` | oui |
| U32 | Tableau | **Élément composé** `kind: "table"` : `cols` et `rows` en `Y.Array` de `Y.Map{id, width \| height}` (identifiants stables), `cells` en `Y.Map` indexée `"<rowId>:<colId>"` → `Y.Map{text: Y.Text, fill, shade, span \| mergedInto}`, cellule absente = vide ; fusion (le contenu en haut à gauche reste), division, insertion et suppression de lignes et colonnes, uniformiser, couleur de cellule (`fill`) distincte de l'**ombrage révélable** (`shade`, retiré d'un toucher en présentation, ne bloque pas la structure). Création : grille de choix 8 × 8 et boîte lignes / colonnes ; édition d'une cellule par la zone de saisie du lot 4 posée sur la cellule ; Tab et flèches entre cellules. Objets dans une cellule : plus tard (au plus un objet ancré). Voir DAU10. | demande (« un créateur de tableau seront indispensables ») ; étude grille-tableau § 5, § 7 option 1 ; SMART Notebook (par l'étude, vérifié) | oui (DAU10) |
| U33 | Images : formats | Décodées par le navigateur : PNG, JPEG, GIF (première image ; animé plus tard), WebP, BMP, ICO, SVG (par `<img>` / `createImageBitmap` seulement, jamais dans le DOM), AVIF là où la WebView le lit. Orientation EXIF appliquée. TIFF : crate `tiff` (MIT) dans `roomboard-formats`, converti en PNG à l'import (sert aussi aux images des `.flipchart`). HEIC : décodé là où le système le fait (Safari, WKWebView) ; ailleurs, refus avec message au premier chantier, décodeur du système par commande de la coque plus tard (WIC sous Windows) ; **aucun décodeur LGPL en Wasm**. RAW : aperçu JPEG intégré seulement. | demande (« image tout format ») ; étude formats-documents § 6 ; étude édition-image § « Formats d'image » | oui |
| U34 | PDF | Lecture par `pdf.js` (`pdfjs-dist`, Apache-2.0) dans la page, worker et polices embarqués (hors ligne, D27) ; une page PDF = une page RoomBoard à `backdrop` `pdf-page` (U6). Export : pages RoomBoard en PDF vectoriel par `krilla` (MIT OU Apache-2.0) dans `roomboard-formats` ; PDF **annoté** = contenu RoomBoard superposé aux pages de l'original gardé dans `assets/` (`pdf-lib`, MIT, ou `lopdf`) : texte et vecteurs d'origine conservés. PDFium seulement si une mesure montre `pdf.js` trop lent ; `mupdf` exclu (U39). | étude formats-documents § 3, § 10 (2) ; D27 | oui |
| U35 | Word, Excel, PowerPoint | **Coque** : conversion en PDF par un programme installé (LibreOffice sans interface avec profil jetable, puis Word / Excel / PowerPoint par COM sous Windows), process externe à arguments en liste, délai de 120 s, puis import comme un PDF (U34) ; aucun programme trouvé = message « installez LibreOffice ou Microsoft Office ». « Modifier dans l'application d'origine » : ouvre l'original gardé dans `assets/` avec l'application du système, surveille l'enregistrement, propose de réimporter. **Excel en données** : valeurs de la première feuille par `calamine` (MIT) dans `roomboard-formats` → élément tableau (U32) ; collage d'un `<table>` HTML (Excel, Word) → tableau. **Web, iPad** : `.xlsx` en valeurs seulement ; `.docx`, `.pptx` : message « exportez en PDF depuis Office ». Aucun import en objets éditables (ECMA-376) au départ. | demande (« autorise l'édition des […] pdf, Word, Excel, PowerPoint » « dans la mesure du possible ») ; étude formats-documents § 4, § 9 (ActCraft `officeconvert.cpp`, `pptx-to-pdf.ps1`) ; étude grille-tableau § 5.4 ; Jérôme 21:45 | oui |
| U36 | Formats de tableaux blancs | Ordre et niveaux : lecteur SVG commun dans `roomboard-formats` (sous-ensemble IWB, extensions `ub:`, dialecte SMART) ; `.iwb` A + E (E vaut R) ; `.notebook` B (puis A) + R avec avertissement (copie, jamais l'original écrasé) ; `.ubz` A + E + R ; `.olf` A + E + R ; `.flipchart` B (portage en Rust du lecteur d'ActCraft, U39, tables d'identifiants écrites à la main, aucun nom de Promethean), **sans écrivain au départ** : l'édition passe par import puis export `.iwb` ou PDF ; un écrivain ne s'envisage que validé contre ActivInspire sur de vrais fichiers (Q5) ; `.flp`, `.enb`, `.xbk`, `.gallery`, `.lynx`, `.as4a` : aucun au départ (message « exportez en `.iwb` ou PDF depuis le logiciel d'origine »). Tests sur fichiers **synthétiques** ; aucun fichier d'autrui dans le dépôt public ; fichiers réels de Jérôme gardés hors dépôt pour fixer A et B (Q6). Publication d'un lecteur par interopérabilité : même position que pour ActCraft, déjà public avec son lecteur `.flipchart`. Licence d'usage 1EdTech à lire avant d'écrire l'export `.iwb`. | demande (« autorise l'édition des flipchart […] dans la mesure du possible ») ; décision 0069 (« À reposer si un écrivain .flipchart validé contre l'original devient possible ») ; décisions 0100 et 0246 (ActCraft) ; étude formats-tableaux § 3, § 5, § 8, § 11 ; étude ressources § 6 (4) | oui (HU1-9, Q5) |
| U37 | Vidéo et son | `kind: "media"` : `asset` ou lien (U26), `mediaType`, `poster`, `trimStart`, `trimEnd`, `loop`, `volume` ; lecture par `<video>` / `<audio>` de la WebView, image dessinée dans le canvas pendant la lecture, commandes RoomBoard ; codecs selon la plateforme (MKV, AVI : message, ou conversion par un `ffmpeg` déjà installé lancé comme process externe, plus tard). **Aucun ffmpeg embarqué.** CSP de la coque à étendre (`media-src 'self' blob:` et protocole d'assets pour les vidéos liées). | demande (« vidéo ») ; étude formats-documents § 7 ; CSP du lot 5a (`feat/socle-lot5a:apps/desktop/src-tauri/tauri.conf.json`, sans `media-src`) | oui |
| U38 | 3D | `three` (MIT) chargé à la demande ; glTF / GLB, OBJ + MTL, STL, PLY d'abord, 3MF et FBX ensuite. `kind: "model3d"` : assets (fichier principal + fichiers liés : textures, `.mtl`, `.bin`), caméra d'orbite, `transform`. Un seul rendu WebGL partagé hors écran, copié dans le canvas pendant l'interaction, **instantané en image** quand l'objet n'est pas sélectionné. Dépôt de plusieurs fichiers ensemble ou d'un ZIP pour garder les textures ; `.obj` seul = avertissement. Transformations seulement, pas d'édition du maillage. | demande (« 3D types obj, etc.. ») ; étude formats-documents § 5 | oui |
| U39 | Licences des dépendances | Exclus d'un dépôt PolyForm Shield public : AGPL et GPL (`mupdf`, `hyperformula`, `@ffmpeg/core`, FFmpeg en configuration GPL, `x265`, code d'OpenBoard), et toute LGPL **liée statiquement** (donc toute LGPL en Wasm : `libheif-js`, `heic-to`, `occt-import-js`, `rawler`). Permis : MIT, Apache-2.0, BSD-2/3-Clause, ISC, Zlib, Unicode-3.0, Unicode-DFS-2016, BSL-1.0, 0BSD, CC0-1.0, MPL-2.0 (par fichier), SIL OFL 1.1 pour les **polices** seulement (polices Liberation de `pdfjs-dist/standard_fonts`, U34 ; Atkinson Hyperlegible, H1-6 du socle), et les programmes externes installés par l'utilisateur (LibreOffice, Office, `ffmpeg`), lancés sans liaison. **Seule exception à la GPL : le code d'ActCraft** (GPL-3.0-only, `~/projets/actcraft/README.md:116`, décision 0246), dont Jérôme est le seul auteur (`git shortlog -sn --all` : un seul auteur) et peut donc reprendre sous PolyForm Shield (lecteur `.flipchart`, `nearestGridPoint`) ; la reprise est notée dans `THIRD_PARTY_NOTICES.md`. Dès la première dépendance d'un chantier d'usage : `THIRD_PARTY_NOTICES.md` et un contrôle scripté des licences (crates et paquets npm), **amorcé sur l'arbre actuel** (toute licence déjà présente relevée et acceptée une fois), appelé par `verifier.sh`. | D40 (`socle-cadrage.md:67`) ; étude formats-documents § 1, § 10 (fin) ; décision 0246 ; ActCraft `THIRD_PARTY_NOTICES.md`, `scripts/verifier-licences.ps1` (par l'étude) ; contre-relecture tour 1 (`unicode-ident` Unicode-3.0, `foldhash` Zlib dans les `Cargo.lock`) | oui |

## 3. Carte d'impact

Le profil n'a pas de ligne « Surfaces d'impact » : rubriques déduites. Chemins de `main` (`5341564`) sauf mention :
`lot4:` = `feat/socle-lot4` (`62e5717`), `lot5a:` = `feat/socle-lot5a` (`a302800`). Colonne « chantier » ajoutée à
« pourquoi » (numéros de la section 9). « Nouveau » = créé par un chantier.

### Cœur Rust (`crates/roomboard-core`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/capabilities.rs:14-29` (`Capabilities { desktop_annotation, multi_window }`, `capabilities`) | non (table statique gardée) | la correction Wayland est dynamique, côté coque et page (U10) ; un champ statique ne s'ajoute que lu (D23) | V |
| `src/document.rs:69` (page : `background`) | oui | `backdrop` (U6), `grid` (U31) : propriétés facultatives de page ; map racine `assets` (U4) — C2, C9, C12 | V |
| `src/element.rs:32` (`ElementView.kind`), `:100-103` (`style_fields`) | oui | `image`, `media`, `model3d`, `table`, `fill`, champ `group` ; `style` facultatif hors `stroke` (U3, U5, U7) — C2, C3, C8, C10a, C14, C15 | V |
| `lot4: src/commands.rs` (`Command`, `cmd_set_text`) | oui | `SetText` par différence, `FormatText` (U27) — C7 ; `AddImage`, `SetImageParams`, `Group`, `Ungroup`, `InsertFragment`, `SetGrid`, `SetBackdrop`, commandes de tableau, `Fill` — C2, C3, C5, C6a, C6b, C9, C10a, C10b | V |
| `lot4: src/query.rs:98` (`element_geom`), `:147` (`hit_test`) | oui | géométrie de collision des nouveaux types (rectangle transformé pour image, média, 3D, tableau) ; groupe extérieur au clic (U7) | V |
| `src/format/mod.rs:15-16` (`EXTENSION`, `MIME`), `:22-29` (`Manifest`) | oui | `kind` facultatif (U8), `load_parts(manifest, ybin)` (U4 : les assets ne passent pas par le cœur), `save_fragment_parts` / `load_fragment_parts` sans assets ni vignette (U9, DAU4) — C2, C3 | V |
| `src/format/mod.rs` (aucun `deny_unknown_fields`) | non | un lecteur du socle ignore `kind` et ouvre un fragment comme un document d'une page (acceptable, étude ressources § 4.6) | V |
| `src/history.rs` | non | une commande = une transaction `"local"` = une étape : tous les ajouts suivent la règle (D11) | V |
| `lot4: src/commands.rs` (`Command`) : insertion de pages | oui | `InsertPages{after, source}` en une étape (U9, U25) et `InsertFragment` — C3 | V |
| `src/ink/` | non | l'encre ne change pas ; le pot P3 lit `ink::outline` (D7) sans le modifier | V |
| `crates/roomboard-formats` (nouveau) | oui | lecteurs et écrivains (SVG commun, IWB, Notebook, UBZ, OLF, flipchart, TIFF, xlsx en valeurs, PDF par `krilla`), fonctions de pixels (U30), pot P3 (`i_overlay`) — C2, C5, C8, C12, C13, C16 | S |
| `Cargo.toml:3` (`members = ["crates/roomboard-core", "crates/roomboard-wasm"]`) | oui | ajout de `crates/roomboard-formats` et `crates/roomboard-formats-wasm` (DAU1) — C2 | V |

### Liaison Wasm (`crates/roomboard-wasm`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/lib.rs:61` (`capabilities(platform)`) | non | gardée ; la page y ajoute les capacités dynamiques (U10) | V |
| `src/lib.rs` (commandes et lectures) | oui | nouvelles commandes de U5-U9, U27-U32 ; lecture d'un asset par empreinte ; insertion d'un fragment | V |
| `crates/roomboard-formats-wasm` (nouveau, second module) | oui | DAU1 : chargé à la demande, hors du chemin de l'encre et du budget de 1,5 Mo du module principal — C2 | S |

### Interface web (`apps/web`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/toolbar.ts:1-24` (`ToolId` union fermée, `ToolDef`, `validateToolbar`) | oui (lot 5b puis C1) | DA10 étendu par U11-U13 : `ToolId` ouvert, barres en liste, `kind` d'élément, `parseProfile` | V |
| `lot4: src/core/wasm-core.ts:33-56` (`toElementView` : lève sur `kind` inconnu, `style` exigé) | oui | U3 : `kind` inconnu gardé et dessiné en cadre ; `style` facultatif — C2 (première tâche) | V |
| `lot4: src/core/api.ts` (`ElementView` en union) | oui | nouveaux types d'éléments, commandes | V |
| `lot4: src/core/fake-core.ts` | oui | fausse liaison suivie à chaque commande ajoutée (contrat `describe.each` fake / vrai cœur) | V |
| `lot4: src/engine/render/canvas2d.ts:157-168` (aiguillage `stroke` / `shape` / `text`) | oui | rendu de `image`, `backdrop`, `grid`, `table`, `media`, `model3d`, `fill`, texte par segments (U27) | V |
| `src/engine/render/renderer.ts` (`Renderer`, DA2) | oui | `drawScene` reçoit fond et grille ; WebGL2 (échelon 4) reste au canvas d'interaction (CL4-1) | V |
| `lot4: src/engine/tools/` (`select.ts`, `shape.ts`, `text.ts`) | oui | sélection de groupe (U7), magnétisme (U31), outils pot, recadrage, pipette, tableau | V |
| `lot4: src/app/text-editor.ts` (`<textarea>`) | oui | réutilisée pour les cellules de tableau (U32) ; remplacée par l'éditeur riche en C7b | V |
| `lot4: src/engine/text-layout.ts` (`layoutText`, `textBoxHeight`, CL4-4) | oui | mise en lignes par segments d'attributs (U27), mesure des cellules de tableau (U32) — C7, C10a | V |
| `src/engine/settings.ts` (`?echelons=`) | non | réglages du moteur ; les profils vivent dans `src/ui/` et `src/profile/` | V |
| `lot5a: src/platform/files.ts` (`FileHost`, `OpenedFile`, `SaveTarget`, `PendingStore`), `controller.ts:116-123` (enregistrer : `doc.save()` puis `host.save(bytes)`), `:145` (ouvrir : `core.load(file.bytes).free()`), `pending.ts:15` (`bytes: Uint8Array`) | oui | `DroppedFile`, `importFiles` (U23) — lot 5b ; DA8 amendé en `Blob`, validation et attente sans faire entrer les assets dans le module de l'encre (U4) — C2 | V |
| `lot5a: src/platform/host-tauri.ts`, `host-fsa.ts`, `host-repli.ts`, `shell-web.ts`, `mount.ts` | oui | `onDrop` pour les trois hôtes de DA8 (Tauri : `onDragDropEvent` et `read_granted_file` ; FSA et repli : `drop` HTML5 sur la scène), branché par `mount.ts` (U24) — lot 5b | V |
| `src/ui/` (nouveau au lot 5b) | oui | barres en liste, `ToolbarHost`, éditeur de profils, panneaux (grille, image, bibliothèque) | S |
| `src/profile/` (nouveau) | oui | `parseProfile`, `ProfileStore`, profils fournis, exemples par version (`fixtures/`) — lot 5b, C1 | S |
| `src/import/` (nouveau) | oui | registre d'importeurs, détection, importeurs navigateur (image, PDF, vidéo, 3D) — C2, C12, C14, C15 | S |
| `index.html` (`touch-action: none`, deux canvas) | oui | cible de dépôt HTML5 sur la scène (web) | V |

### Coque (`apps/desktop`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `lot5a: src-tauri/tauri.conf.json` (`app.windows` : une fenêtre ; CSP objet sans `media-src` ni `worker-src`) | oui | fenêtre `annotate` créée à la volée (C11a) ; CSP : `media-src 'self' blob:` (C14), `worker-src 'self' blob:` (C2, premier Worker), protocole d'assets pour les vidéos liées (C14) ; association de `.rbitem`, `.rbpack`, `.rbprofile` (C3, C4, C1) | V |
| `lot5a: src-tauri/capabilities/default.json` (`windows: ["main"]`, permissions minimales) | oui | fenêtre `annotate`, `core:window:allow-set-always-on-top`, `allow-set-ignore-cursor-events`, `allow-set-decorations`, `allow-set-size`, `allow-set-position` (C11a) ; ouverture par l'application du système (C16) | V |
| `lot5a: src-tauri/src/main.rs` (dialog + fs) | oui | commande `read_granted_file` (lot 5b), capture d'écran (C11b), conversion Office (C16), détection Wayland (C11a) | V |
| `src-tauri/Cargo.toml` | oui | `xcap` (Apache-2.0) ou équivalent pour la capture (C11b) | S |
| `tauri-plugin-opener` et surveillance de fichier (plugin `fs`, `watch`) | oui | « Modifier dans l'application d'origine » puis réimport (U35) — C16 | S |
| `apps/desktop/package.json` (`test` : « no tests ») | non | à garder vert | V |

### Persistance et format

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| fichiers `.roomboard` | oui | `assets/`, `kind`, nouveaux éléments et propriétés de page, tous facultatifs (U3) | V (code du format) |
| `.rbitem`, `.rbpack` (nouveaux) | oui | U8, U9 | S |
| `.rbprofile` (nouveau) et réglages de l'appareil (`localStorage`) | oui | U11 ; profil choisi par appareil (D22) | S |
| bibliothèque de ressources (dossiers en coque, OPFS / IndexedDB sur le web) | oui (nouveau) | C4 | S |
| attente d'ouverture IndexedDB du lot 5a (`lot5a: src/platform/pending.ts`) | oui | réutilisée par le dépôt d'un document (U25) ; garde un `Blob` au lieu d'un `Uint8Array` (U4) — C2 | V |

### Outillage, scripts et CI

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/verifier.sh:15-28` (un seul module Wasm attendu, taille relevée) | oui | DAU1 : deux modules, budget du module principal gardé, taille du second relevée — C2 | V |
| `lot5a: scripts/controle-hors-ligne.mjs` | oui | `pdf.js` (worker, polices, cartes de caractères) et `three` embarqués : le contrôle doit rester vert — C12, C15 | V |
| `scripts/controle-licences` (nouveau) et `THIRD_PARTY_NOTICES.md` (nouveau) | oui | U39 — C2 | S |
| `scripts/essais/` (Playwright, lot 4 et 5a) | oui | parcours des scénarios S1-S16 | V |
| `.github/workflows/` | non | D35 : aucun runner enregistré | V |

### Tests

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core/src/capabilities.rs` (`desktop_annotation_only_on_desktops`) | non | à garder vert (table statique inchangée) | V |
| `apps/web/src/core/wasm-core.contract.test.ts:364-366` (`capabilities expose la table du cœur`) | non | à garder vert | V |
| `crates/roomboard-core/src/format/mod.rs:198-396` (16 tests, dont `save_is_deterministic`, `reload_with_strokes_keeps_bytes`, `newer_schema_is_refused`) | non | à garder verts : les assets et `kind` ne doivent pas casser le déterminisme (dates fixes, ordre des entrées) | V |
| `apps/web/src/toolbar.test.ts` | oui (lot 5b) | adapté au profil (déjà prévu par le socle) | V |
| tests de contrat fake / vrai cœur (`describe.each`) | oui | chaque commande ajoutée y entre | V |
| scénarios S2, S3/S4, fichiers du lot 5a (`scripts/essais/*.mjs`) | non | à garder verts à chaque chantier | V |

### Autres dépôts et services (hors périmètre, section 7)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `~/projets/actcraft` (lecteur `.flipchart`, profils) | non | référence en lecture seule ; aucun code repris tel quel (C++/Qt) | V |
| runner self-hosted de la VM pour `jejeasterix/roomboard` | non | toujours absent (D35) | V (état du socle) |
| licence d'usage 1EdTech de l'IWB / CFF | oui, hors périmètre | à lire avant l'export `.iwb` (C13) | S |

### Effets de bord sur l'existant

- `toElementView` cesse de lever sur un `kind` inconnu et sur un `style` absent (U3) : test neuf
  `élément de type inconnu : gardé, dessiné en cadre, sans erreur` (contrat fake / vrai cœur), premier test de C2.
- `SetText` applique une différence au lieu de tout remplacer (U27) : `set_text_unchanged_is_no_step` (lot 4) reste
  vert ; tests neufs `set_text_keeps_range_attributes_outside_the_edit` et `set_text_diff_is_one_step` (C7).
- `verifier.sh` attend deux modules Wasm (DAU1) : contrôle neuf « module principal ≤ 1,5 Mo, module des formats
  relevé » ; S2 lot 3 rejoué pour prouver que l'encre ne charge pas le second module (C2).
- Le manifeste gagne `kind` (U8) : `manifest_fields_are_written` adapté (champ écrit seulement hors `document`, pour
  garder les octets des documents du socle) ; test neuf `manifest_without_kind_is_document` (C3).
- Ouvrir par dépôt passe par l'attente IndexedDB du lot 5a : couvert par l'essai `Fichiers lot 5a : OK (3 modes)`
  rejoué, et un mode « dépôt » ajouté (C2).
- Sous Windows, `dragDropEnabled: true` coupe le glisser HTML5 dans la fenêtre principale (U24) : aucun code du socle ne
  s'en sert (recherche texte : aucun `dragover`, `ondrop`, `dragDrop` dans `apps/` et `crates/` de `lot5a`) ; fiche
  Windows de C2.

### Chantiers en cours

- `feat/socle-lot4` (`62e5717` à la contre-relecture), worktrees `socle--T60` (`62ae3b9`) et `socle--T61` (`bd6ff83`,
  tests correctifs rouges) : lot 4, touchent `crates/roomboard-core/src/{commands,element,query,document}.rs`,
  `apps/web/src/core/*`, `apps/web/src/engine/*`, `apps/web/src/app/*` : les mêmes fichiers que C2, C3, C7, C9, C10a.
  Aucun chantier d'usage ne démarre avant leur fusion dans `main`.
- `feat/socle-lot5a` (`a302800` à la contre-relecture) et ses tâches `--T77`, `--T79`, `--T80` : `apps/web/src/platform/*`,
  `apps/desktop/*`, `scripts/verifier.sh`, `scripts/controle-hors-ligne.mjs` : mêmes fichiers que le lot 5b, C2, C11a.
- Lot 5b : sans plan ; il pose `src/ui/` et le modèle du profil (section 8).
- PR ouvertes : aucune (`gh pr list -R jejeasterix/roomboard --state open`). Autre machine : aucune donnée.

### Termes cherchés

- Coffre : `chercher.js` « roomboard usage annotation bureau profils toolbar », « roomboard formats import flipchart
  notebook pdf », « pot de peinture activinspire », « roomboard décision Jérôme » ; `grep -ril roomboard
  02_Decisions 04_Pieges 06_MOC` (rien) ; `grep -il -E "tauri|wayland|webview2|drag.?drop|glisser" 04_Pieges/*.md`.
- Graphe : aucun (pas de graphe RoomBoard dans `~/.cache/graphes/`).
- Texte, `main` : `grep -n capabilit -r crates/roomboard-wasm/src apps/web/src` ; `cat capabilities.rs` ;
  `grep -n "struct Manifest\|deny_unknown_fields\|EXTENSION\|MIME\|assets" format/mod.rs` ; `grep -n background
  crates/roomboard-core/src/*.rs` ; `grep -n "kind\|style_fields\|Any::Map" element.rs` ; `grep -rn localStorage
  apps/web/src` (rien hors tests) ; `scripts/verifier.sh` (étapes Wasm).
- Texte, branches (`git show` / `git grep` depuis le dépôt principal) : `lot4` : `cmd_set_text`, `TextPrelim`,
  `"shape"`, `"text"`, `fill`, `element_geom` (`:98`), `pub fn hit_test` (`:147`), `kind === "(stroke|shape|text)"`, `toElementView` ; `lot5a` :
  `tauri.conf.json`, `capabilities/default.json`, `main.rs`, `git grep -i -E "dragover|ondrop|\"drop\"|dragDrop|clipboard|paste"`
  (seul `proto/stylet.ts:298`, `clipboard.writeText`).
- Plans : `socle-lot4-PLAN.md` (en-tête, choix CL4-1 à CL4-15, table des tâches, contrat) ; `socle-lot5a-PLAN.md`
  (choix tranchés, contrat T70, « Hors lot 5a »).
- Contre-relecture : `git rev-parse --short feat/socle-lot4 feat/socle-lot5a`, `Cargo.toml` racine (`members`),
  `grep -n licen ~/projets/actcraft/README.md`, `git -C ~/projets/actcraft shortlog -sn --all`.
- `git worktree list`, `gh pr list -R jejeasterix/roomboard --state open`, `git log` et `git diff --stat main...<branche>`
  depuis le dépôt principal.

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| Barre et profils | `apps/web/src/toolbar.ts:1-24` | `ToolDef` → `ToolItem { id, kind, tool?, icon, label, options?, requires? }` ; `validateToolbar` → partie de `parseProfile(json: unknown): { profile: Profile; warnings: string[] } \| { errors: string[] }` ; `visibleItems(bar: Toolbar, caps: RuntimeCapabilities): ToolItem[]` | étendre (DA10, U11-U13) |
| Capacités | `crates/roomboard-core/src/capabilities.rs:21` ; `crates/roomboard-wasm/src/lib.rs:61` | `capabilities(platform)` appelée telle quelle ; `RuntimeCapabilities = { desktopAnnotation; multiWindow; dropPaths; officeConverter; … }` calculé en TS | réutiliser + étendre côté page |
| Ouvrir un document déposé | `lot5a: src/platform/files.ts` (`OpenedFile`, `PendingStore`), `pending.ts`, `controller.ts` | même chemin que Ouvrir (valider, mettre en attente, recharger), au lot 5b tel quel ; en C2, `OpenedFile { name: string; file: Blob; target: SaveTarget }`, `FileHost.save(file: Blob, target: SaveTarget)`, validation par `unpack` du Worker puis `format::load_parts` | réutiliser (lot 5b), étendre (C2) |
| Entrée des fichiers déposés | `lot5a: src/platform/files.ts` (`FileHost`), hôtes `host-tauri.ts`, `host-fsa.ts`, `host-repli.ts` | ajout `onDrop(handler: (files: DroppedFile[], at: Point) => void): () => void` à `FileHost`, implémenté par les trois hôtes ; `DroppedFile = { name: string; size: number; mime: string; path?: string; blob(): Promise<Blob> }` | étendre (lot 5b) |
| Choisir l'importeur | aucun (termes `import`, `magic`, `detect`, `Importer` : rien) | `interface Importer { id: string; nature: "document" \| "pages" \| "objects" \| "grid" \| "pack" \| "profile"; detect(head: Uint8Array, name: string): boolean; run(file: DroppedFile, ctx: ImportContext): Promise<ImportResult> }` ; `importFiles(files: DroppedFile[], at?: Point): Promise<ImportReport>` | nouveau module `src/import/` (C2) |
| Assets | aucun (`assets/` réservé, vide : `format/mod.rs:2`) | page : `AssetStore { put(blob: Blob, meta: AssetMeta): Promise<AssetId>; get(id: AssetId): Blob \| undefined; meta(id: AssetId): AssetMeta \| undefined }` ; cœur : map `assets` (métadonnées) et `format::load_parts(manifest: &[u8], ybin: &[u8]) -> Result<Document, FormatError>` ; Worker `roomboard-formats` : `pack_assets(zip: Uint8Array, assets: AsyncIterable<[AssetId, Blob]>) -> Blob` (entrées écrites triées par empreinte, quel que soit l'ordre reçu), `unpack(file: Blob) -> { manifest, ybin, assets }` | nouveau (C2, DAU5) |
| Lecture et écriture ZIP | crate `zip` du cœur (D25), `format/mod.rs:63` (`options()`) | mêmes options (dates fixes) pour `assets/`, fragments, paquets, `.iwb`, `.notebook` | réutiliser |
| Identifiants | `yrs::uuid_v4` (D3) | appelé à chaque élément recopié (U9) | réutiliser |
| Annuler | `History` (D11, DA6) | une transaction `"local"` par commande | réutiliser |
| Déplacer un groupe | `lot4: Command::Transform{ids, matrix}` (CL4-8) | appelée avec les ids des membres | réutiliser |
| Collision et cible | `lot4: src/query.rs:98` (`element_geom`), `:147` (`hit_test`) | `element_geom` étendu par type ; `hit_test` appelé tel quel pour la cible du pot (U28) et le clic sur un groupe (U7), puis remontée au groupe extérieur | étendre / réutiliser |
| Rendu des nouveaux types | `lot4: src/engine/render/canvas2d.ts:157-168` | une branche par `kind`, cache par id invalidé par `Change` (D19) | étendre |
| Saisie dans une cellule | `lot4: src/app/text-editor.ts` | posée sur la cellule (matrice CSS) | réutiliser |
| Rendu PDF | `pdfjs-dist` (Apache-2.0) | `getDocument`, `page.render` dans `src/import/pdf.ts` et le rendu de `backdrop` | réutiliser |
| Export PDF | `krilla` (MIT OU Apache-2.0), `pdf-lib` (MIT) | `roomboard-formats::pdf::export_pages(doc, opts) -> Vec<u8>` ; superposition par `PDFDocument.embedPage` | réutiliser |
| Excel en valeurs | `calamine` (MIT) | première feuille en valeurs → commandes de tableau | réutiliser |
| 3D | `three` (MIT) et ses chargeurs | un `WebGLRenderer` partagé | réutiliser |
| Booléens de polygones (pot P3) | `i_overlay` (MIT OU Apache-2.0) | union des contours épaissis, trous = zones fermées | réutiliser (compilation wasm32 à prouver) |
| Capture d'écran | `xcap` (Apache-2.0) | capture d'un écran par la coque, nos fenêtres masquées | réutiliser (à évaluer en C11b) |
| Fenêtres de l'annotation | Tauri 2 `WebviewWindowBuilder` (`transparent`, `always_on_top`, `decorations`), `set_ignore_cursor_events` | appelées par la coque seulement | réutiliser |
| Texte riche | `yrs::Text::format`, `insert_with_attributes` | derrière `SetText` (différence) et `FormatText` | réutiliser |
| Limites de mot | `unicode-segmentation` (MIT OU Apache-2.0) | `split_word_bound_indices` | réutiliser |

Aucun besoin ne répond aux critères de duplication nette : le seul module existant qui fait déjà une part du travail
(`toolbar.ts`, `FileHost`, `Transform`, `text-editor.ts`, le ZIP du cœur) est étendu ou appelé. Constats
d'architecture : `docs/architecture-constats.md` absent ; aucune demande « Constats à fermer ».

## 4. Hypothèses à revoir

**Niveau 1 — difficiles à défaire ou visibles des utilisateurs**

- **HU1-1** Extensions `.rbitem`, `.rbpack`, `.rbprofile` et types MIME (U8) : visibles dès le premier fichier
  partagé ; gratuites à changer avant la première release.
- **HU1-2** Règle de dépôt par nature (U25), en particulier : un document déposé sur un tableau qui a du contenu ouvre
  un menu « Ouvrir à la place / Insérer ses pages ici » ; un tableau vierge l'ouvre sans menu. Question Q1.
- **HU1-3** Bureau **vivant** par défaut en annotation, figé en option et en repli (U18). Question Q2.
- **HU1-4** La fenêtre principale se réduit à la barre pendant l'annotation (U16, DAU2), au lieu d'une troisième fenêtre.
- **HU1-5** Office n'est lu fidèlement qu'avec LibreOffice ou Microsoft Office installé, et seulement dans la coque
  (U35). Question Q3.
- **HU1-6** Taille d'une page importée (PDF, Office) : hauteur 1080, largeur selon le rapport de la page source (U6).
  Une page A4 portrait paraît étroite sur un écran 16:9.
- **HU1-7** Seuils : 100 Mo par fichier sur le web, vidéo incluse jusqu'à 50 Mo puis liée en coque, 4096 px de côté
  avant réduction d'affichage, 500 pages par PDF (U26).
- **HU1-8** Pot de peinture : cible = l'élément le plus haut sous le pointeur (`hit_test`), puis la règle de son type
  (image : zone de pixels ; texte : mot ; forme : contour ou intérieur ; trait : couleur) ; rien sous le pointeur : zone
  fermée, sinon fond (U28) ; tolérance visible dans la rangée de l'outil. Couleur mot par mot traitée comme un
  comportement du pot (non retrouvé dans l'aide d'ActivInspire : étude pot-de-peinture § « Supposé » ; c'est la demande
  de Jérôme qui fait foi).
- **HU1-9** Aucun import d'Office en objets éditables ; aucun écrivain `.flipchart` au départ, l'édition passant par import puis export `.iwb` ou PDF (U1, U35, U36) ; réversible si un écrivain validé contre ActivInspire devient possible (0069). Question Q5.
- **HU1-10** Les octets des assets vivent côté page en `Blob` et le ZIP est complété par un Worker jeté après usage (U4) ;
  la mémoire réelle de l'iPad pour un document de 200 Mo (PDF, vidéos) est à mesurer en C2 et C12 avant de figer les seuils.
- **HU1-11** En annotation, un fichier déposé sur la zone de la barre va au tableau sans quitter l'annotation (U22) ;
  « afin de les ouvrir dans le Canvas » peut aussi se lire « sortir de l'annotation et montrer le tableau ». Question Q2.

**Niveau 2 — les autres**

- **HU2-1** Groupe en propriété `group` à chemin d'ids ; grouper ne réordonne pas l'empilement (U7).
- **HU2-2** Profils : trois jetons de taille de bouton, cinq emplacements, une seule barre d'outils et une barre des
  pages affichées au lot 5b ; aucun raccourci clavier dans le profil v1 (clés inconnues conservées) ; un seul profil
  fourni `defaut` au lot 5b, d'autres en C1 (U11, U12).
- **HU2-3** Profil par plateforme : section `platform` du même profil, pas un profil distinct choisi seul (U11).
- **HU2-4** Bascule dessin / souris par l'outil et un bouton, sans raccourci global (U17).
- **HU2-5** Un seul écran à la fois en annotation (U19).
- **HU2-6** Magnétisme : coin ou centre le plus proche ; tracé jamais aimanté ; Seyès en unités de page sans échelle
  physique (1 mm = 3,78 unités, à mesurer sur un cahier réel) (U31).
- **HU2-7** Tableau : pas d'objet dans une cellule au premier chantier ; l'ombrage ne bloque pas la structure ; une
  insertion dans une fusion est refusée par l'interface (U32 ; étude grille-tableau § 5.3).
- **HU2-8** `i_overlay` compile pour `wasm32-unknown-unknown` (U28 P3) ; sinon repli rastérisation + suivi de contour.
- **HU2-9** Image : collision au rectangle ; « Pick Through » (clic à travers les zones transparentes) plus tard (U5).
- **HU2-10** `pdf.js` assez rapide et léger sur l'iPad ; sinon PDFium en coque (U34).
- **HU2-11** HEIC refusé hors Safari et WKWebView au premier chantier (U33).
- **HU2-12** La capture de l'écran par `xcap` suffit sous Windows, macOS (autorisation « Enregistrement de l'écran ») et
  X11 (U21).
- **HU2-13** (tranchée par la source, tour 2) `scopeDroppedPaths: false` ne gêne aucune autre fonction de `plugin-fs` utilisée par le lot 5a (U24) ; à prouver par l'essai de la coque du lot 5b.
- **HU2-14** Le second module Wasm reste sous 3 Mo ; chargé au premier besoin : import, export, enregistrement d'un document qui a des assets, ouverture d'un document qui a des assets (le Worker les extrait, U4), ou d'un document dont une image porte une couleur transparente (U30) (DAU1).
- **HU2-15** Le texte inséré par `SetText` hérite des attributs du caractère précédent (comportement supposé de
  `yrs::Text::insert`, à prouver par un test en C7).

## 5. Décisions d'architecture

**DAU1 — Second module Wasm pour les formats.**
Contexte : lecteurs, écrivains et calculs de pixels pèsent plusieurs centaines de Ko à quelques Mo ; le module principal
(1 327 888 octets) a un budget de 1,5 Mo (H2-13) et porte l'encre.
Décision : `crates/roomboard-formats` (Rust pur, testé en natif, qui dépend du cœur pour le code ZIP et le manifeste) et
sa liaison `roomboard-formats-wasm`, instanciée dans un Worker au premier besoin (HU2-14) et jetée après usage ; il ne
connaît pas le `Doc` : il rend des descriptions d'éléments et d'assets que la page passe au cœur par des commandes, et
complète ou défait le conteneur des assets (U4).
Conséquences : l'encre ne charge jamais le second module et sa mémoire ne grossit pas des assets ; `verifier.sh` contrôle
deux modules ; un import passe la frontière deux fois (formats → page → cœur), coût accepté hors du chemin de l'encre.

**DAU2 — Annotation : fenêtre d'annotation transparente + fenêtre principale réduite à la barre.**
Contexte : le clic à travers de Tauri est tout ou rien par fenêtre ; la barre doit rester cliquable ; D27 (une fenêtre =
un document) ; règle de l'encre.
Décision : la coque crée `annotate` (transparente, sans cadre, au premier plan, taille de l'écran de la barre) avec son
moteur et son document ; la fenêtre principale passe au premier plan, sans cadre, à la géométrie de sa barre (géométrie
d'avant gardée et rendue à la sortie) ; la barre pilote `annotate` par `ToolbarHost` distant (événements Tauri `emit_to`).
Conséquences : la zone de dépôt reste dans la fenêtre du tableau (même chaîne d'import), mais un document n'y est jamais ouvert, ce qui rechargerait la fenêtre réduite à la barre (U22) ; une fenêtre de barre dédiée
reste possible sans toucher la barre ; l'encre reste dans une page web ; deux fenêtres « au premier plan » à ordonner.

**DAU3 — Groupe en propriété des éléments.**
Contexte : `elements` est un tableau plat, toutes les lectures du cœur le parcourent à plat ; yrs 0.28.1 n'a pas
`move_to` ; un groupe en élément obligerait à recopier ses membres dans un sous-tableau.
Décision : champ facultatif `group: [idExterieur, …, idInterieur]` ; commandes `Group{ids}` (écrit un id neuf en tête de
chaque chemin : le nouveau groupe englobe les groupes existants) et `Ungroup{groupId}` (retire cet id des chemins) ; la sélection remonte au groupe extérieur ; le fragment garde les
chemins, renumérotés à l'insertion.
Conséquences : aucune lecture existante ne change ; deux pairs qui groupent en même temps donnent le dernier écrit par
élément ; un groupe sans membre disparaît de lui-même.

**DAU4 — Fragment = document d'une page, inséré par recopie.**
Contexte : ressource à extension propre (demande) ; un seul codeur d'objet (ActCraft) ; identifiants CRDT à ne pas
partager entre insertions.
Décision : cœur : `format::save_fragment_parts(doc, page, ids, meta) -> FragmentParts { manifest, ybin, cited_assets }`
et `format::load_fragment_parts(manifest, ybin) -> Fragment` (document temporaire + manifeste) ; Worker : ajoute ou
extrait les assets et `thumbnail.png` (même découpage qu'U4) ; `Command::InsertFragment{page, fragment, at}` et
`InsertPages{after, source}` (source = document temporaire, assets déjà dans l'`AssetStore`) recopient en profondeur chaque élément
avec ids neufs, groupes renumérotés, références extérieures nulles, assets absents copiés, en une transaction.
Conséquences : copier-coller, bibliothèque, paquets et « envoyer au tableau » (U21) passent tous par là ; une ressource
d'un schéma plus récent est refusée comme un document.

**DAU5 — Assets hors du CRDT, chaîne d'import unique.**
Contexte : images, PDF, vidéos, 3D ; collaboration plus tard ; iPad sans chemin de fichier.
Décision : octets en `Blob` côté page (`AssetStore` TS), métadonnées dans la map racine `assets` du cœur, conteneur
complété par le Worker des formats ; tout fichier entrant passe par `importFiles` → registre d'`Importer` (détection par
octets) → `ImportResult` → commandes du cœur, une étape par fichier.
Conséquences : un seul code pour le dépôt sur le canvas, la zone de la barre, le menu, le collage et le lancement ; le
module de l'encre ne porte jamais un PDF ni une vidéo ; un pair distant verra un élément dont l'asset manque tant que la
synchronisation des assets n'existe pas (hors périmètre).

**DAU6 — Fond de page importé, rendu à la demande.**
Contexte : un PDF importé doit rester net au zoom et léger ; l'annotation se fait par-dessus ; export PDF annoté fidèle.
Décision : `backdrop` de page (image ou page PDF), dessiné sous la grille et les éléments ; PDF gardé en un seul asset,
rendu par `pdf.js` par palier de zoom, placeholder tant que le rendu n'est pas prêt.
Conséquences : un `.roomboard` d'un PDF de 50 pages pèse le poids du PDF ; le rendu de la scène devient asynchrone pour le
fond seulement ; l'export superpose l'annotation aux pages d'origine.

**DAU7 — Profil en donnée versionnée, barre qui parle par `ToolbarHost`.**
Contexte : profils échangeables, changement à chaud, barre qui doit pouvoir vivre dans une autre fenêtre (annotation).
Décision : U11-U15 ; `Profile` pur (aucune dépendance au DOM), `ProfileStore` en interface, profil actif en signal
SolidJS, `ToolbarHost` local (lot 5b) ou distant (C11a).
Conséquences : un profil se teste sans interface ; le moteur ne dépend pas du profil ; un profil plus récent reste lisible.

**DAU8 — Capacités statiques corrigées à l'exécution.**
Contexte : `desktop_annotation` est vrai sous Linux même sous Wayland natif ; d'autres capacités ne se savent qu'à
l'exécution (convertisseur Office, chemins au dépôt).
Décision : la table du cœur reste la référence par plateforme ; la coque et la page publient `RuntimeCapabilities`
(statiques ∧ détectées) en signal ; aucun composant ne lit `capabilities(platform)` directement.
Conséquences : un même profil masque ou montre ses éléments selon la machine, sans être modifié.

**DAU9 — Texte riche par attributs de plage du `Y.Text`.**
Contexte : couleur mot par mot (pot P2), cellules de tableau ; le lot 4 range déjà le contenu en `Y.Text` mais
`SetText` le remplace en entier.
Décision : attributs de plage du `Y.Text` (`color` d'abord) ; `SetText` applique une différence ; `FormatText` pour une
plage ; rendu par segments ; éditeur riche (contenteditable) dans un chantier distinct, le `<textarea>` gardé ailleurs.
Conséquences : aucune migration (un texte sans attribut reste un texte du socle) ; la mise en lignes mesure par segment.

**DAU10 — Tableau en élément composé à identifiants stables.**
Contexte : insertion de lignes concurrente, fusion, ombrage révélable, import depuis Excel et HTML.
Décision : U32 ; lignes et colonnes en `Y.Array` d'ids, cellules en `Y.Map` par couple d'ids, texte de cellule en
`Y.Text` ; une commande par opération de structure.
Conséquences : la copie profonde du fragment (DAU4) doit savoir recopier ces sous-types ; aucune cellule à créer à
l'insertion d'une ligne ; la fusion concurrente garde une règle déterministe à écrire au chantier.

## 6. Scénarios d'acceptation

Jouables plus tard, un ou deux par chantier (chantier entre parenthèses). VM : Playwright Chromium ; plateformes : fiches.

- **S1** (C1) Ouvrir l'éditeur de profils, déplacer la barre d'outils à droite, passer les boutons en grand, retirer la
  gomme, ajouter deux couleurs au stylo, enregistrer sous « CM1 » ; relancer : la barre est à droite, en grand, sans
  gomme. Exporter `CM1.rbprofile`, l'importer sur un autre appareil (iPad) : même barre. « Revenir à l'origine » rend
  `defaut`.
- **S2** (C1) Importer un profil dont un élément désigne un outil inconnu et dont `schema` est une mineure plus récente :
  le profil s'ouvre, l'élément est masqué ; le réexporter : l'élément et les clés inconnues sont toujours là. Un profil
  d'une majeure plus récente est refusé avec « mettez RoomBoard à jour ».
- **S3** (C2) Déposer sur le canvas une photo JPEG prise de travers (EXIF), un PNG transparent et un SVG : trois images
  au point de dépôt, la photo droite ; enregistrer, recharger, rouvrir : les trois images sont là, `assets/` contient
  trois fichiers ; déposer deux fois la même photo : un seul asset. Annuler retire une image par étape.
- **S4** (lot 5b, C3) Dans la coque, déposer depuis l'explorateur un `.roomboard` sur un tableau vierge : il s'ouvre.
  Le déposer sur un tableau modifié : un menu au point de dépôt ; « Ouvrir à la place » pose la question « abandonner
  les modifications ? », « Oui » ouvre le fichier ; « Insérer ses pages ici » (dès C3) ajoute ses pages après la page
  montrée, une seule étape d'annulation.
- **S5** (C3) Sélectionner un trait, une forme et un texte, Grouper, déplacer d'un glisser (une étape), Exporter la
  sélection en `.rbitem` ; ouvrir un autre document, déposer le `.rbitem` deux fois : deux groupes indépendants, ids
  différents, déplaçables séparément ; annuler deux fois : page vide.
- **S6** (C4) Ajouter le groupe de S5 à « Mes ressources » avec le mot-clé « fraction » ; chercher « frac » : il apparaît
  avec sa vignette ; le glisser sur la page : inséré. Exporter le dossier en `.rbpack`, l'importer ailleurs : mêmes
  ressources.
- **S7** (C5) Sur une image à fond blanc uni, choisir « Couleur transparente », piquer le blanc, tolérance 10, mode
  contigu : le fond devient transparent, l'intérieur blanc du dessin reste ; rogner, retourner, enregistrer, rouvrir :
  identique ; « Rétablir l'original » rend l'image brute, l'asset d'origine n'a jamais changé.
- **S8** (C6a, C6b, C7) Pot : remplir un rectangle de rouge, changer la couleur d'un trait, du fond de la page ; cliquer dans le
  ciel bleu d'une photo, tolérance 5 : la zone devient jaune, une étape ; dans le texte « Le chat noir », cliquer sur
  « chat » : seul ce mot devient rouge ; éditer ensuite le texte (« Le gros chat noir ») : « chat » reste rouge.
- **S9** (C8) Tracer à main levée trois traits qui ferment un triangle (écart de 1 px à un sommet) : le pot remplit le
  triangle d'une forme polygonale sous les traits ; déplacer un trait : le remplissage reste en place.
- **S10** (C9, C4) Ouvrir l'éditeur de grille, choisir « Seyès », puis ajouter un niveau de points : aperçu en direct ;
  valider = une étape ; activer le magnétisme, déplacer une forme : son coin tombe sur une intersection ; Alt tenu : pas
  d'accroche ; zoom 800 % : lignes d'un pixel. Puis, avec C4 : enregistrer la grille en ressource, la déposer sur une autre page.
- **S11** (C10a, C10b) Créer un tableau 4 × 3 par la grille de choix, écrire dans trois cellules au clavier (Tab), insérer une
  colonne, fusionner deux cellules, ombrer une colonne ; en présentation, toucher l'ombrage : il tombe ; annuler : il
  revient. Coller un tableau copié depuis Excel : un tableau RoomBoard aux mêmes valeurs.
- **S12** (C11a) Windows, puis macOS et Linux X11 : choisir le profil « Annotation au démarrage », relancer : l'écran est
  couvert par l'annotation transparente, la barre seule au premier plan ; écrire au stylet sur le bureau ; outil
  Souris : cliquer une icône du bureau à travers ; reprendre le stylo : l'encre revient. Sous Wayland natif : démarrage
  sur le tableau, bouton « Relancer en mode compatibilité ».
- **S13** (C11a, C11b) En annotation, déposer une image sur la zone de la barre : un avis « ajouté à la page 4 », on
  reste en annotation ; déposer un `.roomboard` sur la zone : ses pages sont insérées après la page montrée (jamais
  ouvert : la barre reste en place, la fenêtre principale n'est pas rechargée). « Envoyer au tableau » : une page avec
  la capture du bureau en fond et l'encre sélectionnable comme objets ; sortir : le tableau montre les nouvelles pages.
- **S14** (C12) Déposer un PDF de 6 pages : 6 pages insérées après la page montrée, nettes à 400 % ; annoter la page 2,
  exporter en PDF : l'export a 6 pages + les pages du document, le texte de la page 2 d'origine reste sélectionnable
  sous l'encre.
- **S15** (C13) Déposer un `.iwb` synthétique (traits, formes, texte, image, groupe), un `.notebook` et un `.flipchart`
  synthétiques : chacun s'ouvre en document avec sa liste d'avertissements ; exporter le premier en `.iwb`, le rouvrir
  dans RoomBoard : mêmes objets.
- **S16** (C14, C15, C16) Déposer une vidéo MP4 de 20 Mo : lecture dans la page, rognage début et fin, enregistrée dans
  le fichier ; une vidéo de 300 Mo en coque : liée, avertissement. Déposer `Box.glb` : objet 3D tourné à l'orbite. Dans la
  coque avec LibreOffice, déposer un `.pptx` de 5 diapositives : 5 pages ; sur l'iPad : message « exportez en PDF ».

## 7. Hors périmètre

- Synchronisation réseau et entre fenêtres (D27), y compris celle des assets ; comptes et profils synchronisés
  (RoomFlow) ; plusieurs écrans d'annotation à la fois.
- Écrivain `.flipchart` au départ (U36, Q5 ; réversible) ; import en objets éditables de Word, Excel, PowerPoint ; édition du
  texte d'un PDF ; montage vidéo ; édition de maillage 3D ; formules Excel.
- Formats sans échantillon ni documentation : `.flp`, `.enb`, `.vboard`, `.xbk`, `.gallery`, `.lynx`, `.as4a` (à rouvrir
  avec un fichier réel).
- Encre native dans la coque (DA9, échelon 6 : décision de Jérôme seule) ; régions de hit-test natives (étude
  annotation-bureau, solution C) ; attachement de l'encre aux fenêtres (SMART Ink).
- Rotation libre des éléments, reconnaissance d'un tableau dessiné au stylet, dégradés, raccourcis globaux.
- Avis juridique (lecteurs par interopérabilité, LGPL dynamique, licence 1EdTech, brevets H.264/AAC/HEVC) : à demander
  par Jérôme s'il le souhaite ; les décisions U36 et U39 évitent d'en dépendre.
- Outillage `claude-config` (runner self-hosted, graphe RoomBoard) : inchangé depuis le socle.

## 8. À prendre dès le lot 5b

Le lot 5b (SolidJS, barre en profils, barre des pages) fige le modèle ; ce qui suit évite de le refaire dans C1, C2 et
C11. Tout est donnée et interface ; la seule fonction demandée au lot 5b est l'ouverture d'un `.roomboard` déposé, qui
exige `read_granted_file` dans la coque (point 12).

1. **Profil versionné** (`format: "roomboard-profile"`, `schema: 1`) dès la première écriture ; `parseProfile` refuse
   la majeure supérieure, conserve les clés inconnues, garde et masque un outil inconnu (U11, U13).
2. **`toolbars` en liste**, la barre des pages comprise (`role: "pages"`), chacune avec son `dock` (`top`, `bottom`,
   `left`, `right`, `floating`) même si deux seulement sont dessinés ; CSS dérivé du `dock` (U12).
3. **`ToolId` ouvert** (chaîne validée par une table des outils), aucun `switch` sur l'identifiant dans les composants.
4. **`kind` d'élément de barre** : `tool`, `action`, `dropzone`, `separator` ; `id` stable ; champ `requires`.
5. **Préréglages séparés** (`presets` par outil) ; `ToolItem.options` réservé à l'élément ; deux remises à zéro.
6. **Taille de bouton en jeton** `s | m | l` par variable CSS ; aucune dimension en pixels dans les composants.
7. **`ProfileStore` en interface**, première implémentation `localStorage` ; aucun composant n'appelle `localStorage` ;
   profil `defaut` en lecture seule dans le code, utilisable sans stockage.
8. **Profil actif en signal** ; le moteur reçoit des commandes (`setTool`, `setPreset`), jamais le profil.
9. **`ToolbarHost`** (`setTool`, `runAction`, `dropFiles`, `setMode`), implémentation locale par appels directs (U15).
10. **`RuntimeCapabilities` en signal** : `capabilities(platform)` du cœur corrigé par la détection (au lot 5b, au
    moins `dropPaths` = coque) ; `visibleItems(bar, caps)` le lit (U10, DAU8).
11. **`behavior.startMode`** présent dans le modèle ; seul `board` est honoré au lot 5b (U14).
12. **Entrée unique des fichiers** : `FileHost.onDrop` (trois hôtes) et `importFiles(files, at?)` posés ; au lot 5b,
    seul `.roomboard` est traité (ouvert par le chemin du lot 5a si le tableau est vierge, sinon menu « Ouvrir à la
    place / Annuler », l'insertion de pages venant avec C3), tout autre fichier rend « format pris en charge dans une
    prochaine version » ; dépôt HTML5 sur la scène (web) ; dans la coque, `onDragDropEvent` de la fenêtre principale
    (`dragDropEnabled` gardé à `true`) et la commande Rust `read_granted_file(path, offset, len)`, limitée à l'ensemble
    des chemins accordés (dépôt, lancement) (U23, U24, U25).
13. **Aucun glisser HTML5** dans l'interface (réordonner aux événements de pointeur) : sous Windows, il est coupé (U24).
14. **Association de fichiers en donnée** : une liste d'extensions dans la coque (`.roomboard` au lot 5b, les autres
    ajoutées par C1, C3, C4) ; le fichier passé au lancement passe par `importFiles` (attribué au lot 5b par le plan du
    lot 5a, « Hors lot 5a »).
15. **Configuration Tauri prête pour plusieurs fenêtres** : fenêtres nommées dans `capabilities/default.json`, CSP
    valable pour toutes ; la barre ne suppose pas d'être dans la même page que le canvas (U16).
16. **Avertissement de sécurité (à reporter au lot 5a s'il n'est pas clos, sinon premier geste du lot 5b)** :
    `tauri-plugin-fs` 2.7.1, initialisé par défaut (`lot5a: src-tauri/src/main.rs:6`), ajoute tout chemin déposé sur la
    fenêtre à sa portée, **dossiers compris et récursivement** (`scope_dropped_paths`, vrai par défaut,
    `tauri-plugin-fs-2.7.1/src/config.rs:19-23`, `src/lib.rs:629-646`) ; avec `fs:allow-read-file` et
    `fs:allow-write-file`, un dossier glissé sur la coque devient lisible et inscriptible par la page. Poser
    `"plugins": { "fs": { "scopeDroppedPaths": false } }` dans `tauri.conf.json` et le prouver par l'essai de la coque.
17. **Composant de barre sans état propre** au document : tout ce qu'il affiche vient du profil, des capacités et de
    l'état publié par le moteur.

Tests à poser au lot 5b (logique pure) : profil valide ; majeure supérieure refusée ; mineure supérieure (clés
conservées à la réécriture) ; outil inconnu gardé et masqué ; capacité absente (élément masqué, `startMode` rabattu) ;
dépôt d'un fichier non `.roomboard` (message, document intact).

## 9. Découpage en chantiers

Règles communes : chaque chantier est sa propre chaîne (`nouvelle-feature`, cadrage court qui cite les U) ; aucun ne
démarre avant la fusion du lot 4 dans `main` ; les parties **cœur** (Rust, sans interface) peuvent commencer avant la
fin du socle, les parties **interface** attendent le lot 5b ; un seul build Tauri à la fois sur la VM (profil) ; essais
Windows par la file du PC, macOS par Jérôme, Android en attente de KVM (D34). « Manque » = où la fonction est absente
(Jérôme 21:45).

Fusions : les parties cœur menées pendant le lot 5b (C2, C7, C9) touchent toutes `commands.rs`,
`roomboard-wasm/src/lib.rs`, `api.ts` et `fake-core.ts` : écriture en parallèle, fusion dans l'ordre C2, C7, C9, chaque
suivante rebasée ; C2 touche `verifier.sh` comme le lot 5b : sa partie `verifier.sh` attend la fusion du lot 5b.

| # | chantier | but | décisions | dépend de | vague | attend la fin du socle ? | gabarit | plateformes (manque) |
|---|---|---|---|---|---|---|---|---|
| C1 | Profils et barre configurable | éditeur de profils (emplacement, tailles, outils, préréglages), profils fournis dont « Annotation au démarrage », import / export `.rbprofile`, sélecteur, deux remises à zéro, `startMode` | U10-U15 | lot 5b (modèle posé) | 1 | oui (interface) | chantier | partout ; manquent : association `.rbprofile` et profil par utilisateur du système (web, iPad) |
| C2 | Assets, image et chaîne de dépôt | `AssetStore` en `Blob`, map `assets`, Worker du conteneur, élément image, `backdrop` image, `kind` inconnu toléré, second module Wasm, `importFiles` et registre, images (U33), collage d'image, limites, contrôle des licences | U3-U6, U23-U26, U33, U39, DAU1, DAU5 | lot 4 ; lot 5a ; lot 5b (interface, `verifier.sh`) | 0 (cœur), 1 (reste) | cœur : non ; dépôt et interface : oui | chantier | partout ; web et iPad : pas de chemin (pas de vidéo liée), 100 Mo ; HEIC seulement Safari / WKWebView |
| C3 | Groupes, fragments et presse-papiers | `group`, Grouper / Dégrouper, `kind` du manifeste, `.rbitem`, `InsertFragment`, `InsertPages` (pages d'un document déposé), copier / coller (interne, système avec repli JSON), exporter la sélection | U7-U9, DAU3, DAU4 | lot 4 ; C2 (assets des fragments) | 2 | cœur : non ; interface : oui | chantier | partout ; presse-papiers à format propre : coque seulement (web : repli texte) ; double-clic sur `.rbitem` : coque |
| C4 | Bibliothèque de ressources et paquets | « Mes ressources », « Ressources partagées », dossiers, recherche, vignettes, glisser vers la page, ajouter depuis la sélection, `.rbpack`, grilles et fonds en ressources | U8, U9, U31 (ressource) | C3 ; C2 (`backdrop` image) ; C9 (grilles) | 3 | oui | chantier | coque : dossiers réels et dossier partagé ; web : OPFS / IndexedDB, pas de dossier partagé ; iPad : pas de sélecteur de dossier, risque mémoire > 200 Mo |
| C5 | Édition d'image | rogner, retourner, quarts de tour, luminosité / contraste, couleur transparente (pipette, tolérance, contigu / global, plume), « Rétablir l'original », fonctions de pixels en Worker | U29, U30 | C2 | 2 | oui | chantier | partout (taille d'image bornée sur iPad) |
| C6a | Pot de peinture vectoriel et mot par mot | outil pot, cible (U28), P1 vectoriel, P2 couleur mot par mot | U28 (P1 vectoriel, P2) | lot 4 (formes, `fill`) ; C7 (cœur et rendu par segments) | 2 | oui | chantier | partout |
| C6b | Pot de peinture sur image | remplir et effacer une zone d'image avec tolérance (asset destructif, `sourceAsset`) | U28 (P1 image), U29 | C6a ; C5 (pixels) | 3 | oui | courte | partout (taille d'image bornée sur iPad) |
| C7 | Texte riche par plages | `SetText` par différence, attributs de plage, `FormatText`, mise en lignes et rendu par segments | U27, DAU9 | lot 4 (texte) | 0 (cœur), 1 (rendu) | cœur : non ; rendu : oui | chantier | partout |
| C7b | Éditeur de texte riche | saisie riche (contenteditable) avec IME, barre de mise en forme ; cellules de tableau en texte riche | U27, DAU9 | C7 ; lot 5b ; C10a (cellules) | 2 | oui | chantier | partout ; IME réelle à essayer par plateforme (iPad ; Android en attente de KVM) |
| C8 | Pot de peinture, zones fermées | zone fermée par plusieurs objets (`kind: "fill"`, `i_overlay`, tolérance de fermeture) | U28 (P3) | C6a ; C2 (second module) | 3 | oui | chantier | partout |
| C9 | Grille | `grid` de page, six types, magnétisme, rendu net, éditeur à aperçu direct (la partie « ressource » passe en C4) | U31 | lot 4 (déplacer) ; lot 5b (panneau) | 0 (cœur), 1 (éditeur) | cœur : non ; éditeur : oui | chantier | partout |
| C10a | Tableau : structure et saisie | élément `table`, création, saisie des cellules (zone du lot 4), lignes et colonnes, uniformiser, couleur | U32, DAU10 | lot 4 ; lot 5b | 1 | oui | chantier | partout ; clavier virtuel de l'iPad à essayer |
| C10b | Tableau : fusion, ombrage, imports | fusion / division, ombrage révélable, collage d'un `<table>` HTML, `.xlsx` en valeurs | U32, U35 (Excel en données) | C10a ; C2 (second module, pour `.xlsx`) | 2 | oui | chantier | partout |
| C11a | Annotation de bureau : fenêtre, bascule, zone de dépôt | `RuntimeCapabilities` (Wayland), fenêtre `annotate`, fenêtre principale réduite à la barre, `ToolbarHost` distant, bascule dessin / souris, bureau vivant, `startMode`, choix de l'écran, zone de dépôt (U22 : traite ce que `importFiles` sait déjà lire), mesure du stylet dans la fenêtre transparente | U10, U14-U20, U22, DAU2, DAU8 | lot 5b (barre, `ToolbarHost`, `importFiles`) ; C1 (sélecteur et profil « Annotation au démarrage », S12) | 2 | oui | chantier | manque : web, iPad, Android, Wayland natif (repli XWayland) |
| C11b | Annotation : capture et envoi au tableau | bureau figé (capture), « Envoyer au tableau » (capture en `backdrop` + encre en fragment) | U18 (figé), U21 | C11a ; C2 (`backdrop` image) ; C3 (fragment) | 3 | oui | chantier | manque comme C11a ; capture : autorisation macOS, portail Wayland non pris en charge |
| C12 | PDF | import (`pdf.js`, `backdrop` `pdf-page`), taille de page, annotation, export des pages (`krilla`), export annoté par superposition | U6, U34, DAU6 | C2 | 2 | oui | chantier | partout ; mémoire de l'iPad pour les gros PDF |
| C13 | Formats de tableaux blancs | lecteur SVG commun, `.iwb` (A + E), `.notebook` (B + R), `.ubz` (A + E + R), `.olf` (A + E + R), `.flipchart` (B, lecture seule) | U1, U2, U36 | C2, C3 ; C9 et C7 recommandés (grilles, texte riche des flipcharts) | 3 | cœur : non (lecteurs en natif) ; interface : oui | lots (3 lots : SVG commun + IWB + UBZ ; Notebook + OLF ; flipchart) | partout (lecture dans le Wasm) ; Flash des `.notebook` : nulle part |
| C14 | Vidéo et son | élément `media`, lecture dans le canvas, commandes, rognage, inclus / lié, CSP | U26, U37 | C2 | 2 | oui | chantier | partout ; codecs par plateforme (WebM sur Safari ancien, GStreamer sous Linux) ; vidéo liée : coque seulement |
| C15 | 3D | élément `model3d`, `three` à la demande, rendu partagé, orbite, instantané, dépôt multi-fichiers | U38 | C2 | 2 | oui | chantier | partout ; contextes WebGL limités sur iPad |
| C16 | Word, Excel, PowerPoint | conversion par LibreOffice / Office (coque), « Modifier dans l'application d'origine » (`tauri-plugin-opener`, surveillance), message web | U35 | C12 ; C10b pour Excel en données | 3 | oui | chantier | manque : rendu fidèle sur web, iPad, Android (message « exportez en PDF ») ; COM : Windows seulement |

**Vagues** (le parallélisme suit la demande : « Hésite pas à parallélisé les taches quand il y a de la place ») ; les
chantiers d'une même vague tournent ensemble, chacun dès que ses dépendances sont fusionnées :

- **Vague 0** (pendant le lot 5b) : parties cœur de **C2**, **C7**, **C9** (fusion dans l'ordre C2, C7, C9).
- **Vague 1** (après le lot 5b) : **C1**, **C2** (reste), **C7** (rendu), **C9** (éditeur), **C10a**.
- **Vague 2** : **C3**, **C5**, **C6a** (après le rendu de C7), **C7b**, **C10b**, **C11a** (après C1), **C12**, **C14**,
  **C15**.
- **Vague 3** : **C4**, **C6b**, **C8**, **C11b**, **C13**, **C16**.

Chemins les plus longs : trois chantiers après le lot 5b (vagues 1 à 3), par plusieurs voies (C2 → C3 → C4 ; C2 → C3 →
C11b ; C1 → C11a → C11b ; C2 → C5 → C6b ; C7 → C6a → C8 ; C2 → C12 → C16 ; C10a → C10b → C16). La demande « zone de dépôt en annotation » est complète à
C11a (vague 2) pour tout ce que C2 sait lire.

## 10. Récapitulatif des formats

Niveaux (U2) : A import fidèle · B import partiel avec avertissements · P pages en image (fond) · E export · R copie dans
le format d'origine. « Éditable » = édité dans RoomBoard après import (U1). Chantier entre parenthèses.

| format | lisible | éditable dans RoomBoard | écrit (export) | où | chantier |
|---|---|---|---|---|---|
| `.roomboard` | oui (natif) | oui | oui | partout | socle |
| `.rbitem`, `.rbpack` | oui (natif) | oui | oui | partout | C3, C4 |
| `.rbprofile` | oui (natif) | oui (éditeur de profils) | oui | partout | C1 |
| ActivInspire `.flipchart` | B | oui, après import | non au départ (U36, Q5) ; E en `.iwb` ou PDF | partout | C13 |
| ActivStudio `.flp` | non | — | non | — | — |
| ActivInspire `.as4a` (paquet) | non (à étudier sur un fichier réel) | — | non | — | — |
| SMART `.notebook` | B (puis A) | oui | R (copie, avec avertissement), E en `.iwb` | partout | C13 |
| SMART `.xbk`, `.gallery` | non | — | non | — | — |
| myViewBoard `.olf` | A (traits vérifiés ; images et texte supposés) | oui | R, E | partout | C13 |
| myViewBoard `.enb`, `.vboard` | non | — | non | — | — |
| OpenBoard `.ubz` | A | oui | R, E | partout | C13 |
| IWB / CFF `.iwb` | A | oui | E, qui vaut R (format d'échange avec SMART, ActivInspire, myViewBoard) | partout | C13 |
| Lynx `.lynx` | non | — | non | — | — |
| PDF | P (page = fond, texte d'origine conservé) | annotation par-dessus | E (pages RoomBoard), PDF annoté superposé à l'original | partout | C12 |
| Word `.docx`, `.doc`, `.odt` | P par conversion (coque, LibreOffice ou Word) | annotation par-dessus ; « Modifier dans l'application d'origine » | non (PDF annoté) | coque ; web : message | C16 |
| Excel `.xlsx`, `.xls`, `.ods`, `.csv` | valeurs → tableau (partout) ; P par conversion (coque) | oui (tableau RoomBoard) | non (tableau copiable en HTML / texte tabulé) | partout (valeurs) ; coque (pages) | C10b, C16 |
| PowerPoint `.pptx`, `.ppt`, `.odp` | P par conversion (coque, LibreOffice ou PowerPoint) | annotation par-dessus ; « Modifier dans l'application d'origine » | non au départ (pages-images `.pptx` plus tard) | coque ; web : message | C16 |
| PNG, JPEG, WebP, BMP, ICO | A | oui (U29, pot) | PNG d'une page (plus tard) | partout | C2, C5 |
| GIF | A (première image ; animé plus tard) | oui | — | partout | C2 |
| SVG | A (en image) | oui (comme image) | — | partout | C2 |
| AVIF | A là où la WebView le lit | oui | — | selon la WebView | C2 |
| HEIC / HEIF | A sur Safari et WKWebView | oui | — | iPad, macOS ; ailleurs plus tard (système) | C2 |
| TIFF | A (converti en PNG) | oui | — | partout | C2 |
| RAW (CR2, NEF, DNG) | aperçu JPEG intégré | oui (l'aperçu) | — | partout | C2 |
| MP4 (H.264 / AAC), WebM, MOV, MP3, WAV, OGG | lecture selon les codecs de la plateforme | rognage, boucle, volume | — | partout (codecs variables) | C14 |
| MKV, AVI | message (conversion par un `ffmpeg` installé, plus tard) | — | — | — | C14 |
| glTF / GLB, OBJ + MTL, STL, PLY | A (objet 3D) | transformations | — | partout | C15 |
| 3MF, FBX | partiel | transformations | — | partout | C15 |
| STEP, IGES | non (seul lecteur trouvé en LGPL) | — | — | — | — |

## 11. Questions à Jérôme

Seulement ce que les sources ne tranchent pas ; le cadrage applique la réponse recommandée en attendant.

- **Q1 — Déposer un document sur un tableau qui a déjà du contenu** (`.roomboard`, `.flipchart`, `.notebook`…) :
  recommandé : **un menu au point de dépôt** « Ouvrir à la place / Insérer ses pages ici » (un tableau vierge l'ouvre
  sans menu). Autres : (b) toujours ouvrir ; (c) toujours insérer ses pages.
- **Q2 — Annotation de bureau** : recommandé : **bureau vivant** (transparent) par défaut, figé en option ; un fichier
  déposé sur la zone de la barre va au tableau **sans quitter l'annotation** (avis « ajouté à la page N », bouton
  « Voir »). Autres : (b) bureau figé par défaut ; (c) le dépôt quitte l'annotation et montre le tableau.
- **Q3 — Office à l'ENI** : recommandé : **dépendre de LibreOffice ou de Microsoft Office installés** (rendu fidèle,
  coque seulement). Autres : (b) lecteur interne de moindre fidélité, aussi sur le web ; (c) PDF seulement.
- **Q4 — Premier chantier après le socle** : recommandé : **C2 (images et dépôt) avec C1 (profils) en parallèle**, puis
  C11a (annotation). Autres : (b) l'annotation de bureau d'abord ; (c) grille et tableau d'abord.
- **Q5 — Éditer un `.flipchart`** : recommandé : **importer, éditer dans RoomBoard, exporter en `.iwb` ou PDF**, sans
  écrire de `.flipchart`. Autre : (b) un écrivain `.flipchart`, livré seulement après validation dans ActivInspire sur
  tes fichiers.
- **Q6 — Fichiers et machines d'essai** : peux-tu fournir, hors dépôt, quelques vrais fichiers (`.flipchart`,
  `.notebook`, `.iwb` exportés par SMART et ActivInspire, `.olf`) et les versions de Windows et de macOS de l'ENI ?
  Recommandé : 3 à 5 fichiers par format ; Windows 10 22H2 et 11, macOS 14 au minimum (capture par ScreenCaptureKit).
  Autre : (b) fichiers synthétiques seulement, niveaux A et B restant supposés.

## 12. Portes immédiates

Aucune.
