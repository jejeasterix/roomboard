# Cadrage — gomme-et-barre-objet (OG41)

## 1. Demande et gabarit

Gabarit : **chantier**, deux lots (L1 gomme, L2 barre d'objet). Cadrage autonome : aucune question n'a pu parvenir à Jérôme ;
chaque choix est tranché ici depuis les sources, avec sa raison.

Demande de Jérôme, mot pour mot :

> « Dans l'ensemble je suis trait satisfait, il faut que tu regarde la gomme qui ne fonctionne pas exactement comme je le veux.
> 1. Pourquoi 2 icon gomme dans le menu
> 2. Sur une annotation la gomme ne dois effacer que là où elle passe. Sur une forme ou une image, etc...elle efface l'objet. Pour un tableau de l'outils tableau, cas particulier où elle n'agit pas sur le tableau mais que ce qu'il contient. La suppression d'un tableau passe par son menu
> La toolbar des objets (grouper, dégrouper, copier, collé,etc...) est trop grosse et elle ne colle pas avec le reste du design, elle devrait être avec des icon et attaché à l'objet qu'elle concerne, plus discrète. Inspire toi de myviewbord »

En une phrase : une seule gomme dont l'effet dépend de ce qu'elle touche (trait coupé, objet effacé, tableau épargné mais
son contenu traité), et une barre d'objet en icônes, petite, collée à la sélection.

### Ce que `main` fait aujourd'hui (161cf734, lu dans le code)

- **Pourquoi deux icônes gomme** : il n'y a pas deux outils. La barre porte l'**outil** Gomme (`eraser`, icône `eraser`,
  `toolbar.ts:102`) et, juste à côté, l'**action** « Gomme : partielle / objet » (`eraser-mode`, icône `eraser-part`,
  `toolbar.ts:116`, `icons.ts:206`), qui bascule le mode de l'outil (`toolbar-host.ts:99`). Les profils livrés posent les
  deux côte à côte, au tableau (`toolbar-profiles.ts:152`) et en annotation (`toolbar-profiles.ts:113`). Le cadrage design
  voulait déjà en faire un préréglage de la gomme (D-DS6, `design-cadrage.md`), jamais fait.
- **Ce que la gomme efface** : seulement des traits, dans les deux modes. `Erase` du cœur ne lit que les traits
  (`commands.rs:1870-1980`, `read_stroke`) ; `hitTestPath` aussi (`query.rs:304`, `strokes_only`). Mode partiel : le trait
  est coupé, les morceaux gardent groupe, case (`cell`) et aspect (`commands.rs:1958-1970`). Mode objet : le trait touché
  part en entier. Formes, images, textes, médias, objets 3D, pots, tableaux : jamais touchés.
- **Gomme à la paume** (OG25, PR 70) : le routeur ouvre un geste `eraser` sur le même outil (`router.ts:219`,
  `deps.gestures.begin(id, "eraser", …)`), agrandi par `resize` (`eraser.ts:78-86`). Le bouton gomme du stylet aussi
  (`router.ts:255`). Toute règle de l'outil vaut donc pour les trois.
- **Annulation** : un `Erase` = une transaction = une étape (`history.rs:2-3`). Le moteur sait déjà faire une seule étape
  de plusieurs commandes : `runAll` (T37, `engine.ts:794-845`), utilisé par le panneau d'options (`OptionsPanel.tsx:594`).
- **Barre d'objet** : `SelectionRow.tsx` met 8 boutons **à libellé texte** (Grouper, Dégrouper, Copier, Coller, Exporter,
  Premier plan, Arrière-plan, Image) dans l'îlot contextuel sous la barre d'outils dès que l'outil Sélection est actif,
  sélection ou non (`Toolbar.tsx:271`, `SelectionRow.tsx:35-58`), grisés quand ils ne servent pas. Rien n'est attaché à
  l'objet. Dans la barre d'annotation, ces 8 boutons sont toujours grisés : la vue relayée n'a pas la sélection
  (`annotation-page.ts:57-74`).
- **Autour du cadre de sélection** (ce que la barre ne doit pas couvrir) : 8 poignées de taille (10 px dessinées, prise
  12 px, `handles.ts:8-9`) ; poignée « Déplacer » 28 px au-dessus du milieu haut, prise 22 px au doigt, sélection à
  « Glisser une copie » seulement (`handles.ts:47-61`, `overlay.ts:44`) ; poignées « + » à 40 px des quatre milieux, prise
  22 px (forme seule, `line-points.ts:86-100`, `overlay.ts:140`) ; badge de lien au coin haut droit (16 px, cible 44 px,
  `link-badge.ts:16-19`) ; badge « copie » au coin haut gauche (`link-badge.ts:80`). OG33 lot 2b ajoute une poignée de
  rotation 26 px sous le coin bas droit (plan de `origin/feat/personnalisation-2-outils-lot2b`, tâche B4).
- **Barres flottantes existantes** : `MediaBar` et `Model3dBar` sont des `.rb-popover` calés en haut à gauche de la scène
  (`App.tsx:691-703`), pas collés à l'objet. Seul le menu de case (`cell-menu.ts`) est posé au point de l'appui, dans le
  conteneur de la scène, hors de l'échantillonneur (`board-session.ts:354`).

## 2. Décisions

Sources : « brief » = exigences du brief de l'orchestrateur, qui valent décisions de Jérôme ; « demande » = la citation
ci-dessus.

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| D1 | nombre de gommes | **Une seule** : l'outil `eraser` reste (même `data-item`, même icône `eraser`) ; l'action `eraser-mode` disparaît de `ACTION_TABLE`, des profils livrés (tableau et annotation), d'`ACTION_ICONS`, d'`itemState`, de `ANNOTATION_REMOTE_ACTIONS` et de `toolbar-host` ; l'icône dessinée `eraser-part`, sans autre usage, est retirée d'`ICONS` (`icons.ts:27`), de `THIRD_PARTY_NOTICES.md:619` et de `docs/design/charte.md:85` | demande (point 1) ; brief 1 ; `toolbar.ts:116`, `toolbar-profiles.ts:113,152` | oui |
| D2 | règle de la gomme | Selon ce qu'elle touche : trait à main levée → coupé là où elle passe (`Erase` partiel du cœur, inchangé) ; forme, image, texte, ligne, flèche, média, objet 3D, élément d'un genre inconnu → **objet entier effacé** (`Delete`) ; tableau → jamais effacé ; remplissage du pot (`fill`) → jamais effacé (D30) | demande ; brief 1 | oui |
| D3 | « ce qu'elle touche » | Pour les objets : ce qui est **au premier plan sous le centre de la gomme**. À chaque échantillon : `doc.hitTest(page, x, y, 0)` d'abord (`query.rs:283` ; à tolérance 0, un trait ne compte que sous son contour, `ink/hit.rs:91`) ; rien sous le centre : `hitTest(…, rayon)` ensuite. Ainsi un trait **voisin** ne protège plus l'objet sous la gomme ; un trait **sous le centre** et posé au-dessus de l'objet le protège. Pour les traits, rien ne change : `Erase` partiel coupe **tous** les traits du chemin, même ceux qui passent sous une image (`commands.rs:1890-1900`, aucun test de premier plan) | brief 1 (« effet selon ce qu'elle touche ») ; `query.rs:283` ; contre-relecture ; H1 | oui |
| D4 | tableau | `kind === "table"` (et `unknown` de `sourceKind` `table`) n'est jamais effacé ; son texte de case et son image de fond de case non plus (champs du tableau). Les objets logés sont montés au-dessus du tableau (`personnalisation-3-tableau-cadrage.md` D3) : le premier plan les donne, ils sont effacés ; les traits d'une case sont coupés et leurs morceaux gardent la case (`commands.rs:1966-1969`). **Branche nommée** : un objet logé renvoyé sous son tableau (Arrière-plan, `Restack`) a le tableau pour premier plan : il n'est pas effacé (H2) | demande ; brief 1 ; H2 | oui |
| D5 | une étape | Au relâché, **une seule** écriture : `ctx.runAll([Erase partiel, Delete objets])` (T37) ; une commande sans effet ne compte pas d'étape (`engine.ts:825-845`). `ToolContext.runAll(cmds)` est **obligatoire** (le moteur le fournit, les montages de test aussi) : aucun repli en commandes séparées, qui ferait deux étapes | brief 1 ; `engine.ts:794` | oui |
| D6 | aperçu | Objets touchés **masqués pendant le geste** (`LivePart.hidden`, comme la gomme d'objet d'aujourd'hui) ; traînée du trait inchangée (couleur du fond le long du chemin, `canvas2d.ts:997`) ; « cancel » et « abort » n'écrivent rien (D39) | `eraser.ts:87-95` ; `tool.ts:38-41` ; H3 | oui |
| D7 | gomme à la paume, bouton du stylet | Mêmes règles, sans code propre : ils passent par le même outil (`router.ts:219,255`) ; rayon agrandi : la sonde des objets repart du début (patron `eraser.ts:85`) | brief 1 ; OG25 | oui |
| D8 | coût de la sonde | En TS, bornée : au début du geste, candidats = `doc.elementIds(page)` **moins** `elementIdsOfKind(page, "stroke")`, `"table"` et `"fill"` (`elementIdsOfKind` lit le genre brut, `api.ts:422-424` : lister des genres connus oublierait les genres inconnus, que D2 efface) ; aucun candidat : aucune sonde, page d'encre seule inchangée. Boîte de chaque candidat par `doc.bounds([id])`. Échantillons sur le chemin au pas du cœur, `max(rayon / 2, 0,25)` (`ink/hit.rs:126`, `sample_path`) ; `hitTest` seulement dans une boîte de candidat élargie du rayon ; au plus 8 appels `hitTest` par image, le reste à l'image suivante et tout le reste au relâché avant l'écriture | DA1 ; contre-relecture ; S6 du banc (`zone-s6-banc.test.ts`) | oui |
| D9 | Rust | **Aucune modification Rust** : la coupe de trait existe déjà dans le cœur (`erase_stroke`, `commands.rs:676`, morceaux dans leur groupe et leur case) ; `hitTest`, `Delete`, `elementIdsOfKind` et `bounds` existent ; l'étape unique vient de `runAll`. Wasm principal et formats inchangés | brief (TS d'abord, marge 116 Ko) ; DA1 | oui |
| D10 | `EraseMode` et `hitTestPath` | Gardés dans l'API du cœur et de la CLI (`api.ts:30`, `ops.ts:14`) : la CLI peut encore jouer `Erase` en mode `object` ; la page n'utilise plus que `partial`. `hitTestPath` n'a plus d'appelant dans la page : non retiré (Rust), noté hors périmètre | D15 du profil (CLI) ; brief (pas de Rust) | oui |
| D11 | état du moteur | `EngineState.eraserMode`, `Engine.setEraserMode`, `ToolbarView.eraserMode` et le second paramètre de `ToolFactories.eraser` sont retirés ; `viewOf` (annotation) perd le champ | brief 1 (« retirer ce qui ne sert plus ») | oui |
| D12 | anciens profils | U13 tenu : un élément d'action `eraser-mode` d'un profil enregistré, importé ou ancien est **gardé dans le profil et réécrit tel quel, mais jamais montré**, sans avertissement. `eraser-mode` quitte `ACTION_TABLE` ; `visibleItems` le masque déjà comme toute action inconnue (`toolbar.ts:689`) ; une liste `RETIRED_ACTIONS = new Set(["eraser-mode"])` fait seulement taire l'avis « action inconnue masquée » (`toolbar.ts:308`). Les tests « rien n'est retiré du fichier » (`toolbar.test.ts:570-596`, fixture `profil-45484db.rbprofile` l. 53 et 370) et `BEFORE_L4` (`toolbar.test.ts:387,448,488`, `profile-edit.test.ts:302`, `App.test.tsx:41,324`) restent valides : rien n'est retiré, seuls les rendus montrés changent | U13 (`toolbar.ts:99,308`) ; `toolbar.test.ts:570-596` ; contre-relecture | oui |
| D13 | raccourcis de la gomme | Aucun raccourci ne change : ni l'outil ni `eraser-mode` n'en avaient (`shortcuts.ts`). À noter pour la PR : le bouton « Gomme : partielle / objet » disparaît. La lettre de l'outil (E) est du ressort d'OG33 B1 (`toolShortcut`) : pas posée ici | `shortcuts.ts:5-70` ; plan OG33 B1 | oui |
| D14 | suppression du tableau | Le menu de case (appui long, outil Tableau) gagne « Supprimer le tableau » (icône `trash-2`, 44 px), un `Delete` du tableau, une étape ; au clavier : outil Sélection, tableau choisi, Suppr (existant) ; L2 : bouton Supprimer de la barre d'objet sur un tableau choisi | demande (« la suppression d'un tableau passe par son menu ») ; `tools/table.ts:438-454` | oui |
| D15 | objets logés d'un tableau supprimé | Ils restent sur la page, libres, à leur place, comme aujourd'hui pour Suppr et pour une ligne retirée | `personnalisation-3-tableau-cadrage.md` H22 et § 5 (« lecture tolérante : objet libre ») ; H4 | oui |
| D16 | groupe | La gomme agit élément par élément : un membre touché est effacé seul (ou coupé si c'est un trait) ; les autres gardent le groupe | `commands.rs:1962` (Z1, morceaux dans le groupe) ; H6 | oui |
| D17 | case après effacement d'un objet logé | La case garde sa taille, comme après Suppr aujourd'hui (`engine.ts:1277`, aucun recalcul) | cohérence avec Suppr ; H7 | oui |
| D18 | barre d'objet : forme | **Icônes seules** (Lucide, 24 px, trait 1,5, `ICON_VIEWBOX`), libellé en `aria-label`, infobulle maison (survol 400 ms, appui long 500 ms, focus clavier) avec le raccourci ; `role="toolbar"`, `aria-label="Actions de l'objet"` ; îlot blanc (rayon 12, filet, `--rf-shadow-hover`), boutons visibles 36 px, **cible 44 px** (pseudo-élément), pas de 44 px, hauteur 44 px | brief 2 ; design D-DS1, D-DS2, D-DS4 ; `IconButton.tsx:110` | oui |
| D19 | barre d'objet : contenu | Recalée sur le menu de sélection de MyViewBoard (« adorning menu » : verrou, verrou mobile, copier, glisser pour copier, supprimer, calques ; base de connaissances ViewSonic, https://www.viewsonic.com/solution/kb/en_US/main-toolbar-1/selection-tool, citée par la contre-relecture, non relue ici). Principale, dans cet ordre, **seuls les boutons utiles** (aucun bouton grisé) : Dupliquer · Copier · Coller (presse-papiers non vide) · Grouper (≥ 2 unités) · Dégrouper (groupe dans la sélection) · Image (image seule : panneau de retouche) · Supprimer · « … ». Menu « … » (icône + libellé, comme le menu ☰) : Premier plan, Arrière-plan (les calques de MyViewBoard), Exporter la sélection. Verrou : absent du code, hors périmètre ; « Glisser une copie » reste au panneau d'options (H16) | brief 2 (« actions rares dans un menu … ») ; MyViewBoard (KB ViewSonic) ; `engine.ts:301-304` | oui |
| D20 | barre d'objet : place | Centrée sur le cadre de la sélection, **8 px au-dessus** de tout ce qui entoure le cadre (poignées, « + », « Déplacer », badges, cibles comprises, DA2) ; **en dessous** si la place manque ; ni l'un ni l'autre : dans la vue, en haut. Chaque place essayée évite aussi les **obstacles de l'interface** : panneau d'options posé, tous les îlots (barre d'outils en haut **ou en bas**, onglets, pages, annuler et zoom), barre latérale ; une place qui en croise un est décalée à côté par `placeLinkAvoiding` (`island-place.ts:182`, précédent : l'éditeur de lien, `OptionsPanel.tsx:622-626`), sinon la place suivante est essayée. Bornée à 8 px des bords ; px entiers, jamais `translate(-50%)` | brief 2 ; `island-place.ts:182` (L2-12) ; contre-relecture | oui |
| D21 | barre d'objet : suivi | Suit l'objet : replacée à chaque changement d'état (`selectionBounds`, flèches, annuler) et de caméra (`engine.onCamera`, pan, zoom, pincement), taille constante à l'écran ; **cachée pendant un geste dans la scène** (pointeur enfoncé), reposée au relâché sur la nouvelle place | brief 2 ; `engine.ts:354` ; H9 | oui |
| D22 | « Coller » sans sélection | La barre d'objet n'existe qu'avec une sélection ; outil Sélection sans sélection et presse-papiers non vide : un seul bouton icône « Coller » reste dans l'îlot contextuel (même `data-selection-action="paste"`) ; Ctrl+V inchangé | `c3-groupes-navigateur.mjs:150` ; H10 | oui |
| D23 | sélecteurs des essais | Chaque bouton garde `data-selection-action="<id>"` (group, ungroup, copy, paste, export, layer-front, layer-back, image ; neufs : duplicate, delete) ; le bouton « … » porte `data-object-more`, sa liste `data-object-menu` | brief (essais verts sans réécriture de fond) | oui |
| D24 | clavier de la barre | Chaque action garde son raccourci (Ctrl+D, Ctrl+C, Ctrl+V, Ctrl+G, Ctrl+Maj+G, Suppr, Ctrl+Maj+↑, Ctrl+Maj+↓), montré dans l'infobulle et `aria-keyshortcuts` (`buttonShortcut`). **Accès au focus : Maj+F10 ou la touche Menu**, sélection non vide et hors saisie, met le focus sur le premier bouton de la barre (patron `SideBar.tsx:243`) ; ←/→, Début, Fin s'y déplacent (tabindex itinérant, un seul arrêt de Tab) ; Entrée ou Espace joue ; sur « … », Entrée ou ↓ ouvre la liste (↑/↓, Début, Fin, Entrée) ; Échap ferme la liste, puis rend le focus à la scène. Ligne neuve de `SHORTCUTS` (Aide) : `object-bar`, « Édition », « Barre de l'objet », « Maj+F10 ». Les touches du moteur pressées dans la barre ou sa liste n'atteignent pas le moteur (`main.ts:438` envoie tout à `engine.key`) : `stopPropagation` sur `ENGINE_KEYS` hors Ctrl et Méta, comme `MenuBar.tsx:112` | brief (« chaque geste a son raccourci ») ; `SideBar.tsx:243` ; `table-picker.ts:41` ; contre-relecture | oui |
| D25 | tactile de la barre | Toucher = action ; appui long = infobulle sans action (patron `createTip`) ; glisser par événements de pointeur seulement (aucun HTML5 drag) ; les événements de la barre ne passent pas à l'échantillonneur (racine dans le conteneur de la scène, comme `cell-menu.ts`) | brief (U12, U24) ; `cell-menu.ts:1-6` | oui |
| D26 | taille de la barre | Fixe (36 / 44 px), quelle que soit la taille S/M/L du profil | brief 2 (« plus discrète ») ; H11 | oui |
| D27 | annotation | Barre d'objet dans la fenêtre du tableau seulement ; la barre d'annotation perd ses 8 boutons de sélection toujours grisés | `annotation-page.ts:57` ; H12 | oui |
| D28 | CLI | Aucune commande, opération, format ni champ d'état ne change : `FORMAT_LOTS`, tests CLI et `cli-essai.mjs` inchangés | D15 du profil ; D9, D10 | oui |
| D29 | empreinte S6 | Non touchée : rien ne change dans le pot, les zones ni le cœur (`zone-s6-banc.test.ts`, `docs/essais/c8-porte-s6.md` à garder verts tels quels) | D9 | oui |
| D30 | remplissage du pot | **Traité comme de l'annotation, donc jamais effacé en entier** par la gomme ; ses traits de bord et les traits dessous sont coupés comme tout trait. Raison : le pot colore un dessin fait au stylo, et il est posé au-dessus des traits (`zone.rs:1296`) ; l'effacer en entier dès qu'on gomme un bord ou un détail de la zone contredit « sur une annotation la gomme ne doit effacer que là où elle passe » ; une coupe partielle d'un remplissage n'existe pas dans le cœur (Rust, hors périmètre). Retirer un remplissage : outil Sélection puis Suppr, ou Supprimer de la barre d'objet. Comme il est au-dessus des traits, le premier plan sous la gomme vaut souvent le remplissage : il n'est pas candidat, rien n'est effacé dessous | demande ; `zone.rs:1296` ; contre-relecture ; H1 | oui |
| D31 | forme sans fond | Un rectangle ou une ellipse **sans remplissage** n'est touché que sur son trait visible : premier plan rendu par `hitTest` (son intérieur compte, `point_in_polygon`, `ink/hit.rs:91`) puis confirmé par `doc.edgeHit(id, x, y, rayon)` (`api.ts`, C6a) ; intérieur seul : rien. Avec remplissage : tout son intérieur compte. Ligne, flèche, texte, image, média, objet 3D : leur surface compte | demande (« sur une forme… elle efface l'objet ») ; `edgeHit` (C6a, DA2) ; contre-relecture ; H1 | oui |
| D32 | objet révélé | Un geste efface **un plan à la fois** : le document ne change qu'au relâché, donc un objet masqué par l'aperçu reste le premier plan pour `hitTest`, et ce qui est dessous (ou sous l'intérieur d'une forme vide posée au-dessus) n'est pas atteint par ce geste ; un second passage l'efface. Exclure les ids déjà touchés n'est pas possible en TS : `hitTest` ne rend que l'élément le plus haut et n'a pas de liste d'exclusion ; refaire la géométrie en TS serait une duplication nette du cœur ; l'ajouter demande du Rust (H14) | `query.rs:283` ; brief (Rust seulement si nécessaire) ; contre-relecture ; H17 | oui |
| D33 | Dupliquer et Supprimer : une seule place | Ils **quittent la section « Actions » du panneau d'options** (`OptionsPanel.tsx`, `data-option-value="duplicate"` et `"delete"`) pour la barre d'objet, comme les deux gommes deviennent une seule. Le lien (Ctrl+K) et « Glisser une copie » restent au panneau. L'essai `personnalisation-2-navigateur.mjs:316-318` change ses deux sélecteurs pour `[data-selection-action="duplicate"]` et `"delete"` (même parcours, même vérification) | demande (« plus discrète ») ; D1 (une seule place) ; contre-relecture ; H16 | oui |

## 3. Carte d'impact

Graphe : **absent sur le Mac** (`~/.cache/graphes/roomboard/` n'existe pas) ; la recherche texte (`grep -rn`) le remplace,
chaque entrée ci-dessous est lue (V) sauf mention S.

### Moteur et outils (`apps/web/src/engine`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `engine/tools/eraser.ts:1-98` | oui | règle D2-D8 : candidats, sonde au premier plan, `runAll`, mode retiré | V |
| `engine/tools/tool.ts:12-35` (`ToolContext`) | oui | `runAll?(cmds)` | V |
| `engine/engine.ts:38,101,213,514,613,916,1228` | oui | `eraserMode`, `setEraserMode`, fabrique `eraser(ctx)`, `ctx.runAll` | V |
| `engine/engine.ts:794-845` (`runAll`, lots T37) | non | réutilisé tel quel | V |
| `engine/input/router.ts:92,118,219,255` (paume, stylet) | non | même outil, mêmes règles | V |
| `engine/input/keys.ts` | oui (L2) | Maj+F10 / Menu pour « … » (`objectMenuKey`) | V |
| `engine/render/overlay.ts:35-80,140` | oui (L2) | `overlayKeepOut` : rectangles écran des poignées et badges, cibles comprises | V |
| `engine/render/canvas2d.ts:997`, `webgl2.ts:397` (traînée) | non | aperçu inchangé (H3) | V |
| `engine/render/renderer.ts:42` (`EraserPreview.mode`) | non | reste `partial` | V |
| `engine/tools/handles.ts`, `line-points.ts:86`, `render/link-badge.ts` | non | constantes lues par `overlayKeepOut` | V |
| `engine/tools/table.ts:438-454` (menu de case) | oui (L1) | entrée « Supprimer le tableau » | V |
| `engine/tools/select.ts` | non | la barre lit l'état publié, rien dans l'outil | V |
| `engine/zone-s6-banc.test.ts` | non | à garder vert (D29) | V |

### Interface (`apps/web/src/ui`, `apps/web/src/app`, `apps/web/src`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `toolbar.ts:102,116,211,308,727` | oui | `eraser-mode` retiré ; `RETIRED_ACTIONS` ; `ANNOTATION_REMOTE_ACTIONS` | V |
| `toolbar-profiles.ts:113,127,152,189` | oui | profils livrés sans `eraser-mode` | V |
| `ui/item-state.ts:21,65-67` | oui | `eraserMode` et son état retirés | V |
| `ui/icons.ts:27,192,206` (+ icônes neuves) | oui | `eraser-mode` et l'icône orpheline `eraser-part` retirés ; neuves : `group`, `ungroup`, `clipboard-paste`, `ellipsis`, `image` (Lucide au commit de `icons.ts:5`) | V |
| `app/toolbar-host.ts:9,39,99,155` | oui | action retirée ; `SelectionAction` gagne `duplicate`, `delete` | V |
| `app/annotation-page.ts:57-74` | oui | `viewOf` sans `eraserMode` (constat ouvert l. 39 : ne pas l'aggraver) | V |
| `ui/SelectionRow.tsx` | oui (L2) | réduit au seul « Coller » sans sélection (D22) ; les tables `SELECTION_ACTIONS`, `DISABLED` passent à la barre | V |
| `ui/Toolbar.tsx:25,262-275` | oui (L2) | rangée contextuelle réduite | V |
| `ui/App.tsx:691-703` | oui (L2) | monte `ObjectBar` (portail dans la scène active) | V |
| `ui/MenuBar.tsx:20-37` | oui (L2) | `STEP` et `placeMenu` exportés et réutilisés | V |
| `ui/IconButton.tsx:110`, `ui/tooltip.ts:101`, `ui/shortcuts.ts` | non | réutilisés | V |
| `ui/cell-menu.ts:11,50` | oui (L1) | id `delete-table`, icône `trash-2` | V |
| `ui/rb.css` | oui (L2) | `.rb-object-bar`, cibles 44 px | V |
| `ui/OptionsPanel.tsx` (section « Actions ») | oui (L2) | Dupliquer et Supprimer en sortent (D33) ; il publie le rectangle posé du panneau pour la barre (`placed?(r: Rect \| null)`) | V |
| `ui/OptionsPanel.tsx:594,622-626` | non | `runAll` et l'éditeur de lien inchangés ; `placeLinkAvoiding` réutilisé | V |
| `ui/island-place.ts:182` | oui (L2) | `placeObjectBar` y vit, à côté de `placeLinkAvoiding` qu'elle appelle | V |
| `ui/Island.tsx` (`IslandLayer`, rappel `extra`) | oui (L2) | le rappel donne aussi les rectangles posés de tous les îlots (`islands(): readonly Rect[]`) | S |
| `THIRD_PARTY_NOTICES.md:619`, `docs/design/charte.md:85` | oui (L1) | mention d'`eraser-part` retirée | V |
| `app/board-session.ts:354,385,435,810` | oui (L2) | racine de la barre dans le conteneur de la scène ; fabrique `eraser` | V |
| `app/stage-tags.ts:42` | non | `data-bounds` inchangé | V |
| `fixtures/profil-45484db.rbprofile`, `fixtures/profils/defaut-avant-l4.rbprofile` | non | lus sans avertissement (D12) | V |

### Persistance, CLI, autres dépôts

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core` (`commands.rs`, `query.rs`, `history.rs`) | non | D9 | V |
| `crates/roomboard-wasm/src/lib.rs` | non | D9 ; tailles Wasm inchangées | V |
| `apps/cli/src/ops.ts:14,42` | non | `Erase` reste jouable (D10, D28) | V |
| format `.roomboard`, `.rbprofile` | non | aucun champ neuf ; `eraser-mode` seulement écarté à la lecture | V |
| site de documentation, autres dépôts | non | aucun lien vu | S |

### Tests et essais

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `engine/tools/eraser.test.ts` | oui | réécrit pour D2-D8 | V |
| `engine/engine.test.ts:180` | oui | `eraserMode` retiré ; étape unique | V |
| `toolbar-profiles.test.ts:37,195,233`, `toolbar.test.ts:186`, `ui/App.test.tsx:50,414,681,698,764`, `ui/item-state.test.ts:8,25-27,192-194`, `ui/icons.test.ts:126`, `ui/Toolbar.test.tsx:19,54-59,132,545`, `ui/ProfileEditor.test.tsx:204-215`, `app/toolbar-host.test.ts:6,132-135`, `app/annotation-page.test.ts:32,390-402`, `ui/MenuBar.test.tsx:20`, `ui/SelectionRow.test.tsx:10`, `ui/PointerSwitch.test.tsx:14`, `ui/SideBar.test.tsx:25`, `ui/FormatRow.test.tsx:11`, `app/stage-tags.test.ts:9`, `platform/annotation-tauri.test.ts:128`, `platform/annotation-fake.ts:82` | oui | `eraserMode` et `eraser-mode` sortis des vues et des listes ; `ProfileEditor.test` prend un autre élément à déplacer | V |
| `ui/cell-menu.test.ts`, `engine/tools/table.test.ts` | oui (L1) | entrée « Supprimer le tableau » | V |
| `core/fake-core.test.ts:193-231`, `core/wasm-core.contract.test.ts` | non | `Erase` et `hitTestPath` du cœur inchangés : à garder verts | V |
| `scripts/essais/s2-navigateur.mjs:170-173` | oui (L1) | étape « gomme d'objet » : le trait est désormais coupé (5 → 6 éléments) ; plus de clic `eraser-mode` | V |
| `scripts/essais/design-l3-navigateur.mjs:46` | oui (L1) | `ANNOTATION_ORDER` sans `ann-eraser-mode` | V |
| `scripts/essais/personnalisation-2-navigateur.mjs:353` | non | garde `count() > 0` : passe seule | V |
| `scripts/essais/personnalisation-2-navigateur.mjs:316-318` | oui (L2) | sélecteurs de Dupliquer et Supprimer vers la barre d'objet (D33) | V |
| `toolbar.test.ts:570-596` (rien n'est retiré de `profil-45484db.rbprofile`, l. 53 et 370) | non | à garder vert tel quel (D12) | V |
| `toolbar.test.ts:387,448,488`, `profile-edit.test.ts:302`, `App.test.tsx:41,324` (`BEFORE_L4`) | non (S) | profil gardé entier ; un test qui compte les boutons montrés peut perdre `eraser-mode` : à relire à l'exécution | S |
| `ui/OptionsPanel.test.tsx` | oui (L2) | section « Actions » sans Dupliquer ni Supprimer | S |
| `scripts/essais/gomme-paume-navigateur.mjs`, `gomme-trait-epais-navigateur.mjs`, `personnalisation-2-retours-navigateur.mjs:530-556`, `s5b-navigateur.mjs`, `design-l1-navigateur.mjs:199-215`, `c1-profils-navigateur.mjs` | non | traits coupés comme avant, `data-item="eraser"` gardé : à garder verts | V |
| `scripts/essais/c3-groupes-navigateur.mjs:103,150,156` | oui (L2) | `export` passe dans « … » : une ligne d'ouverture du menu avant le clic | V |
| `scripts/essais/personnalisation-1a-navigateur.mjs:521,525` | oui (L2) | `layer-front`, `layer-back` dans « … » : idem | V |
| `scripts/essais/c5-image-navigateur.mjs:114`, `c6b-pot-image-navigateur.mjs:110`, `personnalisation-2-navigateur.mjs:319` | non | `image` et la barre restent visibles avec une sélection | V |
| essais neufs `gomme-objets-navigateur.mjs` (L1), `barre-objet-navigateur.mjs` (L2), inscrits à `scripts/verifier.sh` | oui | S1-S8, captures 2x, contrôle de netteté § 10 | — |

### Effets de bord sur l'existant

1. Un trait touché par la gomme est **toujours coupé** : la gomme d'objet sur les traits disparaît → `eraser.test.ts` « trait touché : coupé, jamais entier », `s2-navigateur.mjs` (5 → 6).
2. Formes, images, textes, lignes, flèches, médias, objets 3D et pots sont maintenant effacés par la gomme → `eraser.test.ts` « objets entiers », essai `gomme-objets` S2.
3. Une gomme qui coupe et efface = une étape (avant : jamais d'objet) → `engine.test.ts` « gomme : un annuler rend traits et objets ».
4. Le bouton « Gomme : partielle / objet » disparaît des profils livrés, au tableau et en annotation → `toolbar-profiles.test.ts`, `App.test.tsx`, `design-l3-navigateur.mjs`.
5. Un profil enregistré qui porte `eraser-mode` le perd sans avertissement → `toolbar.test.ts` « action retirée lue sans avertissement ».
6. La vue relayée à la fenêtre d'annotation perd `eraserMode` → `annotation-page.test.ts` (liste des clés).
7. Le menu de case gagne une entrée → `cell-menu.test.ts`, `table.test.ts`.
8. Dupliquer et Supprimer quittent le panneau d'options pour la barre d'objet → `OptionsPanel.test.tsx`, `personnalisation-2-navigateur.mjs:316-318`.
8 bis. Le remplissage du pot et l'intérieur d'une forme vide ne sont jamais effacés par la gomme ; un objet sous un objet déjà touché attend un second passage → `eraser.test.ts` « pot gardé », « forme vide : trait seulement », « un plan par geste ».
8 ter. La rangée Sélection quitte l'îlot contextuel ; la barre d'objet apparaît collée à la sélection → `Toolbar.test.tsx`, `ObjectBar.test.tsx`, `barre-objet-navigateur.mjs`.
9. La barre d'annotation perd ses 8 boutons de sélection grisés → `Toolbar.test.tsx` (L4-4).
10. Exporter, Premier plan et Arrière-plan demandent d'ouvrir « … » → `c3-groupes`, `personnalisation-1a` (une ligne chacun).
11. Maj+F10 / Menu prend un sens sur la scène (la barre latérale le garde pour ses vignettes) ; ligne neuve dans l'Aide → `keys.test.ts`, `shortcuts.test.ts`, `SideBar.test.tsx` vert.
12. Les flèches, Suppr, Échap et Espace pressées dans la barre n'agissent plus sur la sélection → `ObjectBar.test.tsx` « touches du moteur gardées ».

### Chantiers en cours

- `origin/feat/personnalisation-2-outils-lot2b` (OG33, plan seul pour l'instant, 1af6ec6e) : **conflit probable** sur
  `ui/Toolbar.tsx`, `ui/shortcuts.ts` (B1, lettres d'outils, peut-être E pour la gomme), `engine/tools/handles.ts`,
  `engine/render/overlay.ts`, `engine/engine.ts`, `engine/input/keys.ts` (B4, poignée de rotation sous le coin bas droit,
  Alt+T), `ui/icons.ts` (B9). La poignée de rotation doit entrer dans `overlayKeepOut` (D20) : à signaler à OG33.
- `origin/feat/personnalisation-3-tableau-collage` (PR 75 ouverte) : `app/workspace.ts`, `platform/paste.ts`,
  `platform/html-table.ts` ; aucun fichier commun ; voisin de « Coller » sans le toucher.
- `~/projets/roomboard-og39` (branche `fix/reglages-design`, OG39) : `ui/SettingsPanel.test.tsx` modifié ; aucun fichier
  commun, `rb.css` possible (S).
- OG32 (outil Tableau), OG34, OG35 : aucune branche distante ni worktree visibles sur ce Mac ; conflit **supposé** sur
  `engine/tools/table.ts` et `ui/cell-menu.ts` (OG32, D14) et sur le cœur (OG35 : rien ici). Worktrees de la VM non fournis.

### Termes cherchés

`grep -rn` dans le worktree : `eraser-mode|eraserMode|EraseMode|eraseMode` ; `eraser|erase` (fichiers) ; `hitTestPath|hit_test_path` ;
`fn cmd_erase|fn erase|Erase {` (crates) ; `fn hit_outline|fn path_hits_outline|fn element_geom|struct Geom` ; `"kind"` (element.rs) ;
`runAll(` ; `doc.undo|une étape|steps` (engine.ts) ; `SelectionRow|data-selection-action|data-selection-sep` (src et essais) ;
`MediaBar|rb-media-bar|rb-popover` ; `placeWithin|placeTip|placeMenu|placeCellMenu` ; `worldToScreen` ; `follow(` ;
`onCamera(` ; `selectionBounds` ; `PLUS_|linkHandles|LINK_OFFSET_PX|MOVE_HANDLE_GAP_PX|COPY_BADGE|LINK_BADGE` ;
`F10|ContextMenu` ; `cellMenu|CellMenuItem` ; `fn cmd_delete` ; `fn cmd_place_in_cell` ; `isKnownAction|action inconnue masquée` ;
`profil-45484db|defaut-avant-l4|BEFORE_L4` ; `placeLinkAvoiding|withContextRow|placeOptions` ; `ENGINE_KEYS` ; `edgeHit` ; `elementIdsOfKind|elementIds(` ; `engine.key(` (main.ts) ; `eraser-part` (THIRD_PARTY_NOTICES, charte) ; `"fill"|on top` (zone.rs) ; `data-option-value="duplicate"|"delete"` ; `deleteSelection|duplicateSelection|deleteElements` ; `paste|Coller` (MenuBar) ; `locked`.
Graphe : `graphify affected "createEraserTool"`, `graphify affected "SelectionRow"` → « graph file not found » (absent).
Coffre (miroir, mots seuls) : « gomme roomboard », « barre d'objet sélection roomboard », « tableau cases roomboard » : aucune note RoomBoard utile.
Branches : `git branch -r --no-merged origin/main`, `git worktree list`, `gh pr list -R jejeasterix/roomboard`.

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| couper un trait là où passe la gomme | `crates/roomboard-core/src/commands.rs:1870` (`cmd_erase`, partiel) | `{ type: "Erase", page, path, radius, mode: "partial" }` | réutiliser |
| savoir ce qui est au premier plan sous la gomme | `crates/roomboard-core/src/query.rs:283` (`hit_test`) | `doc.hitTest(page, x, y, radius): string \| null` (`api.ts:445`) | réutiliser |
| genre d'un élément sans lire sa vue | `api.ts:403` (`elementIdsOfKind`) | `doc.elementIdsOfKind(page, kind)` pour `shape`, `text`, `image`, `media`, `model3d`, `fill`, `unknown` | réutiliser |
| boîte d'un candidat | `query.rs:328` (`bounds`) | `doc.bounds([id])` | réutiliser |
| effacer un objet entier | `commands.rs:2076` (`cmd_delete`) | `{ type: "Delete", ids }` | réutiliser |
| une seule étape pour deux commandes | `engine.ts:825` (`runAll`, T37) | `ToolContext.runAll?(cmds: readonly Command[]): Change \| null` | étendre (`tool.ts:12`) |
| aperçu des objets effacés | `tool.ts:38` (`LivePart.hidden`) | `live(): { strokes: [], erasers, hidden }` | réutiliser |
| rayon de la paume | `eraser.ts:78` (`resize`) | inchangé | réutiliser |
| écarter une action retirée d'un profil | `toolbar.ts:305-309` (`ITEM_RULES.action`) | `RETIRED_ACTIONS: ReadonlySet<string>` testé avant `isKnownAction` ; l'élément n'est pas rendu par `parseItem` | étendre |
| supprimer le tableau depuis son menu | `ui/cell-menu.ts:11` (`CellMenuItem`) et `tools/table.ts:438` | id `"delete-table"`, `run: () => ctx.run({ type: "Delete", ids: [tableId] })` | étendre |
| bouton à icône, infobulle, raccourci | `ui/IconButton.tsx:110`, `ui/shortcuts.ts` (`buttonShortcut`) | `IconButton({ icon, label, attrs: { "data-selection-action": id }, shortcut, onPress })` | réutiliser |
| liste du menu « … » | `ui/MenuBar.tsx:20,27` (`STEP`, `placeMenu`) ; CSS `[data-menu-list]` | exporter `STEP` sous le nom `MENU_STEP` ; `placeMenu(anchor, list, view)` | étendre (export) |
| actions de la barre | `app/toolbar-host.ts:9,155` (`selection(a)`, `runAction`, `imagePanel`) ; `engine.ts:301-304` | `SelectionAction` gagne `"duplicate" \| "delete"` → `deleteSelection()`, `duplicateSelection()` | étendre |
| états des boutons | `ui/SelectionRow.tsx:23-33` (`DISABLED`, `selectionDisabled`) | table déplacée dans `ui/object-bar.ts`, prédicat « montré » au lieu de « grisé » | étendre (déplacer) |
| suivre la caméra | `engine.ts:354` (`onCamera`), `engine/camera.ts:20` (`worldToScreen`) | abonnement dans `ObjectBar` | réutiliser |
| ce qu'il ne faut pas couvrir autour du cadre | `render/overlay.ts:35` (`EditOverlay`), `handles.ts:8-61`, `line-points.ts:86`, `link-badge.ts:16-19,80` | **nouveau** `overlayKeepOut(o: EditOverlay, camera: Camera, touch: boolean): readonly Rect[]` dans `overlay.ts`, et `Engine.selectionKeepOut(): readonly Rect[]` | étendre |
| placer la barre (pure, px entiers) en évitant les obstacles | `ui/island-place.ts:182` (`placeLinkAvoiding`, décalage à côté des obstacles, précédent de l'éditeur de lien `OptionsPanel.tsx:622-626`) ; `table-picker.ts:29` (`placeWithin`) | `export function placeObjectBar(frame: Rect, bar: Box, area: Box, keepOut: readonly Rect[], obstacles: readonly Rect[]): { left: number; top: number; side: "above" \| "below" \| "inside" }` dans `island-place.ts` : essaie dessus, dessous, dedans ; chaque essai passe par `placeLinkAvoiding`, puis `placeWithin` | étendre |
| obstacles de l'interface | `ui/Island.tsx` (`IslandLayer`, rappel `extra(sideStart, above)`) ; panneau d'options (`OptionsPanel.tsx:622-626` mesure déjà sa racine) | `extra(sideStart, above, islands)` ; `OptionsPanel` `placed?(r: Rect \| null)` | étendre |
| état des actions de la barre (montré ou non) | `ui/SelectionRow.tsx:23-33` (`DISABLED`) | `OBJECT_ACTIONS` et `objectActionShown(a, v)` déplacés dans `ui/ObjectBar.tsx` | étendre (déplacer) |
| touches du moteur gardées par la barre | `app/table-picker.ts:41` (`ENGINE_KEYS`), repris par `MenuBar.tsx:112` | `if (!e.ctrlKey && !e.metaKey && ENGINE_KEYS.has(e.key)) e.stopPropagation()` | réutiliser |
| trait visible d'une forme vide | `api.ts` `edgeHit` (C6a, DA2) | `doc.edgeHit(id, x, y, rayon)` | réutiliser |
| candidats de la gomme | `api.ts` `elementIds`, `elementIdsOfKind` (`api.ts:422-424`) | `elementIds(page)` moins `stroke`, `table`, `fill` | réutiliser |
| barre flottante collée à l'objet | aucun : `MediaBar` et `Model3dBar` sont calés en haut à gauche (`App.tsx:691`) | **nouveau** `ui/ObjectBar.tsx` : `ObjectBar(props: { view: Accessor<ToolbarView>; host: ToolbarHost; engine: Pick<Engine, "camera" \| "onCamera" \| "selectionKeepOut">; stage: HTMLElement; obstacles: Accessor<readonly Rect[]> }): JSX.Element` | nouveau module (termes : `MediaBar|rb-popover|selectionBounds|worldToScreen`) |

## 4. Hypothèses à revoir

### Niveau 1 — difficiles à défaire ou visibles des utilisateurs

- **H1 (D3, D30, D31) Ce que la gomme efface en entier.** Objet au premier plan sous le centre de la gomme : effacé ; un trait sous le centre, posé au-dessus de l'objet, le protège ; un trait voisin, non. Remplissage du pot : jamais effacé en entier (de l'annotation) ; rectangle ou ellipse sans fond : seulement sur son trait. Autres choix : pot effacé en entier dès qu'on touche son intérieur ; forme vide touchée sur toute sa surface ; le premier contact du geste décide (trait ou vide : traits seulement).
- **H17 (D32) Un plan par geste.** Un objet révélé sous un objet déjà touché, ou sous l'intérieur d'une forme vide posée au-dessus, n'est effacé qu'au passage suivant. Autre choix : un export Rust de premier plan avec liste d'exclusion (H14).
- **H2 (D4) Contenu d'un tableau.** Texte des cases et image de fond de case ne sont pas effacés (champs du tableau, pas des objets). Autre choix : vider le texte d'une case que la gomme traverse.
- **H3 (D6) Traînée.** Pendant le geste, la traînée peint la couleur de la page sur tout ce qu'elle croise, lignes du tableau et fond PDF compris, qui reviennent au relâché (déjà le cas sur `main`). Autre choix : découper la traînée hors des boîtes des tableaux.
- **H4 (D15) Objets d'un tableau supprimé.** Ils restent libres, à leur place. Autre choix : les supprimer avec le tableau, dans la même étape.
- **H8 (D19) MyViewBoard.** Contenu recalé sur l'« adorning menu » de la base ViewSonic (verrou, verrou mobile, copier, glisser pour copier, supprimer, calques), page citée par la contre-relecture, non relue ici ; forme reproduite de mémoire : petite pilule d'icônes collée à l'objet, qui suit l'objet. Verrou et verrou mobile non ajoutés (aucun verrou dans le code).
- **H16 (D19, D33) Une seule place par action.** Dupliquer et Supprimer passent du panneau d'options à la barre ; « Glisser une copie » et le lien restent au panneau. Autre choix : tout l'« adorning menu » dans la barre, ou garder Dupliquer et Supprimer au seul panneau.
- **H9 (D21) Barre cachée pendant le glisser.** Elle revient au relâché. Autre choix : suivre l'aperçu à chaque image (cadre lu dans le calque d'édition).
- **H10 (D22) « Coller » sans sélection.** Reste un bouton icône dans l'îlot contextuel. Autre choix : menu à l'appui long sur la page vide (geste MyViewBoard).
- **H13 Lettre de la gomme.** Aucune touche pour choisir la gomme dans ce chantier ; OG33 B1 doit la poser (E). S'il ne le fait pas : `tool-eraser` « E » dans `shortcuts.ts`.

### Niveau 2

- **H5 (D12)** `eraser-mode` gardé dans les profils, masqué sans avis (U13). Autre choix : le retirer à la réécriture (casserait `toolbar.test.ts:570-596`).
- **H6 (D16)** Groupe traité élément par élément. Autre choix : le groupe entier part dès qu'un objet non-trait est touché.
- **H7 (D17)** La case ne rétrécit pas après l'effacement d'un objet logé (comme Suppr). Autre choix : rétrécir comme « Sortir », pour Suppr et la gomme ensemble.
- **H11 (D26)** Barre de taille fixe. Autre choix : suivre S/M/L du profil.
- **H12 (D27)** Pas de barre d'objet dans la fenêtre d'annotation.
- **H14 (D8)** Plafond de 8 sondes par image et coût de `hitTest` : à mesurer sur le vrai module (VM, banc comme S6, page de 500 traits sur une image). Au-delà de 4 ms par image, repli prévu : un export Rust `hit_test_top_path` (premier plan par échantillon, traits non décodés), mesuré contre la marge de 116 Ko.
- **H15** Sélection d'un tableau à l'outil Sélection supposée possible par toucher (D14, L2) ; sinon Supprimer reste dans le menu de case seulement.

## 5. Décisions d'architecture

**DA1 — La gomme reste en TS, sur l'API existante du cœur.**
Contexte : coupe de trait, `Delete`, `hitTest` existent ; l'étape unique existe dans le moteur (`runAll`) ; marge Wasm 116 Ko.
Décision : `eraser.ts` sonde le premier plan par `hitTest` (D3, D8), masque les objets touchés, écrit au relâché `runAll([Erase partiel, Delete])`.
Conséquences : aucun Rust, CLI et S6 intacts ; coût borné par candidats, pas d'échantillonnage et plafond par image ; repli Rust nommé (H14) si la mesure échoue.
Interface : `createEraserTool(ctx: ToolContext, radiusPx = ERASER_RADIUS_PX): GestureTool` (le paramètre `mode` disparaît).

**DA2 — Une seule source pour « ce qui entoure le cadre ».**
Contexte : poignées, « + », « Déplacer », badges, et bientôt la rotation d'OG33, sont décidés par le calque d'édition.
Décision : `overlayKeepOut(o, camera, touch)` dans `overlay.ts` rend leurs rectangles écran, cibles comprises ; le moteur l'expose par `selectionKeepOut()`.
Conséquences : la barre n'a aucune constante de poignée ; une poignée ajoutée (OG33) n'est évitée que si elle entre dans cette fonction : à signaler à OG33.

**DA3 — Placement pur, rendu Solid, racine dans la scène.**
Contexte : netteté (px entiers), tests sans DOM, événements à garder hors de l'échantillonneur.
Décision : `placeObjectBar` (pur, dans `island-place.ts`, sur `placeLinkAvoiding`) décide à partir des zones du cadre (DA2) et des obstacles de l'interface (îlots, panneau d'options, barre latérale) ; `ObjectBar.tsx` mesure, rend par portail dans le conteneur de la scène active (patron `cell-menu`), se replace sur état et caméra.
Conséquences : `SelectionRow.tsx` se réduit à « Coller » ; les tables d'actions passent dans `object-bar.ts` ; l'îlot contextuel rapetisse.

## 6. Scénarios d'acceptation

Lot L1 — gomme

- **S1 Trait coupé.** Au doigt : profil par défaut ; la barre ne montre qu'une gomme. Tracer un trait horizontal, toucher Gomme, glisser verticalement au milieu du trait : deux morceaux (`data-elements` 1 → 2), trou du diamètre de la gomme. Clavier : Ctrl+Z une fois → un seul trait ; Ctrl+Y → deux morceaux.
- **S2 Objets entiers, une étape.** Au doigt : poser un rectangle, une image, un texte, une flèche et un trait ; un seul passage qui les croise tous : pendant le geste les quatre objets disparaissent de l'écran ; au relâché ils sont supprimés, le trait est coupé. Clavier : un seul Ctrl+Z rend les quatre objets et le trait entier. Contre-épreuves : un trait dessiné sur une image, gommé au centre du trait : l'image reste, le trait est coupé ; trois traits fermés remplis au pot, gommer un bord et l'intérieur : le remplissage reste, les traits sont coupés ; un rectangle sans fond autour d'un trait, gommer le trait à l'intérieur : le rectangle reste ; une image posée sur une autre, un passage : seule celle du dessus part, un second passage efface l'autre.
- **S3 Tableau.** Au doigt : tableau 3 × 3, image logée en (1, 1), trait au stylo en (2, 2), texte en (0, 0) ; un passage sur tout le tableau : le tableau, ses lignes, son texte et ses tailles restent ; l'image est effacée ; le trait est coupé et ses morceaux suivent le tableau quand on le déplace. Appui long sur une case (outil Tableau) → « Supprimer le tableau » : il disparaît, l'image ou les traits libres restent. Clavier : Ctrl+Z le rend ; outil Sélection, toucher le tableau, Suppr : même effet.
- **S4 Paume et anciens profils.** Au doigt : gomme à la paume active, poser la paume sur une forme et un trait puis glisser : forme effacée, trait coupé, une étape. Stylet retourné (bouton gomme) : idem. Clavier : Ctrl+Maj+H coupe la gomme à la paume (inchangé). Importer un `.rbprofile` qui porte `eraser-mode` : aucun avis, une seule gomme dans la barre.

Lot L2 — barre d'objet

- **S5 Barre collée.** Au doigt : outil Sélection, toucher une image : une petite barre d'icônes (Copier, Dupliquer, Image, Supprimer, …) apparaît 8 px au-dessus du cadre, centrée, sans couvrir les poignées ni les badges ; appui long sur une icône : infobulle « Dupliquer · Ctrl+D », sans action. Glisser l'image : barre cachée, puis reposée au-dessus de la nouvelle place ; pincer pour zoomer : elle suit, même taille. Mesure § 10 à 2x : bords des icônes droites en pixels pleins.
- **S6 Place manquante et obstacles.** Au doigt : objet collé en haut de la vue, sous l'îlot d'outils : barre sous le cadre, sous les « + » d'une forme seule ; barre d'outils mise en bas par le profil et objet collé en bas : barre au-dessus, hors de l'îlot ; panneau d'options ouvert à côté de l'objet, puis barre latérale ouverte : la barre se décale et ne couvre ni l'un ni l'autre ; objet qui remplit la vue : barre dans la vue, en haut. Clavier : déplacer l'objet aux flèches : la barre suit.
- **S7 Groupe et menu « … ».** Au doigt : rectangle de sélection sur deux formes : Grouper visible ; le toucher : Dégrouper remplace Grouper ; « … » → Premier plan, Arrière-plan, Exporter la sélection (libellés et icônes, 44 px). Clavier : Ctrl+G, Ctrl+Maj+G ; Maj+F10 met le focus sur le premier bouton (l'Aide liste « Barre de l'objet · Maj+F10 ») ; ←/→ entre les boutons sans déplacer l'objet ; Entrée sur « … » ouvre la liste, ↓ et Entrée jouent l'action ; Échap ferme, Échap rend le focus à la scène ; un lecteur d'écran annonce « Actions de l'objet, barre d'outils » puis « Grouper ».
- **S8 Tableau et coller.** Au doigt : outil Sélection, toucher le tableau : la barre montre Supprimer ; le toucher : tableau supprimé, Ctrl+Z le rend. Copier un objet, toucher la page vide : la barre disparaît, « Coller » reste dans l'îlot contextuel et colle. Clavier : Ctrl+C, Échap, Ctrl+V : même résultat.

## 7. Hors périmètre

- Toute modification Rust (D9), y compris le retrait de `hitTestPath` et de `EraseMode::Object`, devenus sans appelant dans la page (à proposer au prochain audit d'architecture).
- La lettre de l'outil Gomme (OG33 B1, H13) ; la poignée de rotation et son évitement côté OG33 (DA2 lui donne l'endroit).
- Un aperçu de traînée qui épargne tableaux et fonds (H3).
- Barre d'objet dans la fenêtre d'annotation (H12) ; menu à l'appui long sur la page vide (H10).
- Nouvelles actions d'objet : verrou et verrou mobile (absents du code) ; retourner, aligner, lien, « Glisser une copie » (déjà au panneau d'options ou au clavier).
- Coupe partielle d'un remplissage du pot (D30) et sonde de premier plan avec exclusion (D32) : Rust.
- Recalcul de la taille d'une case après Suppr ou gomme (H7).
- Worktrees de la VM et branches OG32, OG34, OG35, OG39 non poussées : non vues d'ici.

## 8. Portes immédiates

Aucune.
