# Cadrage — personnalisation-1a (OG4) : mode de page, barre latérale, navigation dans la barre principale

Cadrage autonome (aucune question n'a pu parvenir à Jérôme). Chaque choix porte sa source ; sans source, c'est une
hypothèse « à revoir » (section 4). Graphe lu : `~/.cache/graphes/roomboard/graphify-out/graph.json` (26/11 09:53,
avant le dernier merge de L5, sans effet sur les zones touchées) ; les chaînes littérales sont cherchées au texte.

## 1. Demande et gabarit

**Demande** : chaque page choisit un mode « Page » (cadre fixe à la PowerPoint, paysage ou portrait) ou « Infini »
(canvas sans bord à la MyViewBoard), le mode d'une page neuve vient du profil ; une barre latérale flottante et
repliable (onglets Pages et Calques) remplace la barre des pages du bas ; Précédente, numéro et Suivante passent dans la
barre principale (Suivante sur la dernière page ajoute une page) ; position et repli par défaut des îlots se règlent dans
l'éditeur de profils et s'enregistrent dans le profil ; les commandes neuves du cœur sont annulables en une étape et
pilotables par la CLI.

**Gabarit** : `chantier` (36 questions tranchées sur 40). **Découpage proposé (DA10)** : le périmètre déborde 4 h.
- **Lot 1 — `personnalisation-1a`** (fusionnable seul, ≈ 4 h) : mode de page (cœur, rendu, ajustement, miniatures,
  export PDF, CLI), `MovePage` et `DuplicatePage`, barre latérale avec l'onglet **Pages**, navigation dans la barre
  principale, retrait de `PagesBar`, position et repli par défaut dans le profil et l'éditeur, essais adaptés.
- **Lot 2 — `personnalisation-1a-calques`** (≈ 2 h, sur le lot 1) : commande `Restack` (cœur, CLI), onglet **Calques**,
  boutons Premier plan et Arrière-plan de la rangée Sélection, raccourcis d'ordre.
Les deux lots restent dans le périmètre demandé ; le lot 1 montre l'onglet Calques absent (pas d'onglet vide).

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| 1 | Prémisse « barres déjà flottantes et repliables » | **Démentie en partie** : seule la barre `tools` se déplace et se replie (`Island.tsx:29` `MOVABLE_ROLE = "tools"`, `:385`) ; les autres îlots sont posés par rôle (`island-place.ts:31-37`) ; aucune position par défaut dans le profil (`toolbar.ts:50-57`). Le lot 1 ajoute la barre latérale aux îlots mobiles et la position par défaut à toutes les barres flottantes. | code lu | — |
| 2 | Prémisse « fichier ancien en mode Page » | **Démentie en partie** : la page actuelle n'est pas un cadre 16:9 mais « largeur fixe, hauteur sans fin » (D5 amendée, `engine/page.ts:3`, `visiblePageRect` `:18-23`), voulue par Jérôme le 2026-11-20 (« Une page doit pouvoir être infini en hauteur ( modèle activ inspire) », `usage-cadrage.md:624`). Le mode Page (cadre) la remplace ; ce qui dépasse le cadre reste visible sur le pourtour (H2). | code lu ; usage § 11 | oui |
| 3 | Mode : par page | Champ **facultatif** `mode` de la page : absent ou `"page"` = Page, `"infinite"` = Infini ; valeur inconnue lue comme Page et gardée (U3). `schema` 1 et `formatVersion` 1 inchangés. | Jérôme (« Par page ») ; U3 (`usage-cadrage.md:56`) ; `format/mod.rs:17`, `element.rs:14` | oui |
| 4 | Orientation | Portée par `height` de la page (déjà écrit, jamais lu : `document.rs:83-84`) : paysage 1080, portrait **3413,33** (1920 × 16/9) ; la **largeur reste 1920** partout, invariant du cœur. Précédent : une page PDF portrait est déjà 1920 × 2715 (PF4, `usage-c12-pdf-cadrage.md:48`). ~~Conséquence assumée : ajustée entière, une page portrait est vue à un zoom ≈ 0,21 à 1280 × 900.~~ **Renversé par Jérôme (OG24, 2026-11-27)** : ajustée en largeur, elle défile à l'ascenseur (§ 9). **Tranché** (plus de porte). | PF4 (`usage-c12-pdf-cadrage.md:48`) ; Jérôme (« Appuis toi sur l'existant ») ; 11 fichiers TS lisent `PAGE_WIDTH` fixe | oui |
| 5 | Cadre d'une page Page | `pageFrame(view)` = (0, 0) → (`width`, max(`height`, bas du `backdrop.rect`)) : une page PDF ou Office plus haute garde tout son fond dans le cadre. Un seul calcul (DA4). Page PDF portrait (`height` 1080, fond jusqu'à 2715) : cadre 1920 × 2715, orientation affichée « portrait » (cadre plus haut que large) ; « Portrait » y écrit `height` 3413,33 (le cadre devient 1920 × 3413,33, le fond reste à sa place, calé en haut) ; « Paysage » y écrit 1080, le cadre reste 1920 × 2715 (le fond prime) : le segment montre alors « portrait », dit par l'infobulle « cadre fixé par le fond PDF ». | `document.rs:155-200` (fond calé sur la largeur), HU1-6 | oui |
| 6 | Commande de mode | `SetPageMode { page, mode: "landscape" \| "portrait" \| "infinite" }` : une transaction, une étape ; même valeur : aucune étape (D38) ; `Change.pages = [page]`. Infini garde `height`. | brief (une étape chacune) ; patron D38 (`copy.rs:204`) | oui |
| 7 | Mode d'une page neuve | `behavior.pageMode` du profil (`landscape` par défaut ; inconnu : avertissement, `landscape`, comme `startMode` `toolbar.ts:447-450`). `AddPage` gagne `mode: Option<PageMode>` en `#[serde(default)]` (même étape que l'ajout) ; les appels Rust existants (`tests/compat_socle.rs:78`, `tests/scenarios.rs` 5 appels, `tests/pot.rs`, tests de `copy.rs`, `commands.rs`) passent par un constructeur `Command::add_page(after)` qui met `mode: None`, pour ne réécrire chaque appel qu'une fois. Un document vierge (`blank(mode?)`) écrit le mode de sa première page sans étape, comme aujourd'hui (`document.rs:141`, test `blank_page_is_not_undoable`). Une page importée ou envoyée par l'annotation garde le mode absent (Page). | Jérôme (« Le mode par défaut d'une page neuve viendrait du profil ») ; U11 (`behavior` : « page et fond par défaut ») | oui |
| 8 | Vue Infini — déplacement, zoom | Rien de neuf : deux doigts (pan et pincement) existent pour toute page (`router.ts:40-160`), Espace + glisser, molette ; zoom borné 0,1 à 8 (`camera.ts:10-14`) ; aucune borne de déplacement. | code lu | oui |
| 9 | Vue Infini — fond, grille | Couleur de fond de la page sur tout le plan (aucun pourtour, aucun bord). Grille sur tout le plan, coordonnées négatives comprises ; accroche non bornée. En mode Page, grille et accroche bornées au cadre (aujourd'hui : bande x ∈ [0, 1920], y ≥ 0, `grid.rs:550-558`). Le `backdrop` d'une page infinie est dessiné une fois à son rectangle (sa répétition éventuelle est à OG5). | Jérôme (« canvas infini comme Myviewboard ») ; `grid.rs:249-300`, `:539-558` | oui (H16, H17) |
| 10 | Ajuster la page | Page paysage : `fitWidth` inchangé (essais et décision 0302 stables) ; page dont `height > width` (portrait choisi) : ~~cadre entier sous les îlots~~ **en largeur aussi, puis ascenseur (OG24, § 9)** ; Infini : boîte du contenu ∪ fond, sinon le cadre de référence 1920 × 1080 en `fitWidth`. Le haut de la page ajustée (`topBelowIslands`, `camera.ts:56-73`, appelé par `board-session.ts:317-322`) **ne compte pas les îlots latéraux** : la barre latérale (ancre `side-start`/`side-end`, attribut `data-anchor`) est exclue de la liste des îlots du haut, sinon la page descendrait de ≈ 152 à ≈ 370 px à 1280 × 900 et OF83 (`design-l2-navigateur.mjs:229-241`) échouerait ; test neuf dans `camera.test.ts` (un îlot latéral haut de 600 px ne change pas `fitTop`). | `camera.ts:38-79`, `:56-73`, `engine.ts:248`, `:760` ; `board-session.ts:317-322` ; coffre 0302 | oui (H4) |
| 11 | Miniature d'une page infinie | Cadre de son contenu (`doc.bounds` des éléments ∪ rectangle du fond) ; page vide : un 16:9 blanc. Page Page : son cadre. | brief | oui |
| 12 | Export PDF | Page Page : règle actuelle gardée (cadre étendu vers le bas jusqu'au contenu, `pdf-export.ts:236`) ; Infini : boîte du contenu ∪ fond, sinon 1920 × 1080. `.iwb`, `.ubz` : inchangés. | comportement inchangé (brief) | oui (H2, H15) |
| 13 | Déplacer une page | `MovePage { page, to }` (`to` = rang final, à partir de 0) : retirer puis réinsérer une recopie qui **garde l'id** (DA2) ; une étape ; même rang : aucune étape ; rang hors bornes : refus `BadIndex` (variante neuve). La page montrée reste montrée. | D2 (`socle-cadrage.md:29` : « réordonner = retirer + réinsérer une copie, ou indices fractionnaires, à trancher au lot qui l'introduira ») ; patron du trait coupé (`commands.rs:1905`) | oui (DA2) |
| 14 | Dupliquer une page | `DuplicatePage { page }` : copie juste après, ids neufs (page, éléments, groupes), fond, grille, mode et champs inconnus gardés ; une étape ; la copie est montrée. Réutilise `insert_pages` (DA3). | C3 (`copy.rs:225-292`) ; PowerPoint | oui |
| 15 | Supprimer, insérer | `RemovePage` et `AddPage` existants (`commands.rs:31-36`) ; « Insérer des pages… » existant (`page-insert-file`). Insérer après une miniature donnée : `AddPage { after: <cette page> }`. | code lu | oui |
| 16 | Ordre des objets (lot 2) | Il existe déjà : l'ordre de `elements` **est** l'empilement (`document.rs:2`) ; aucun système de couches à la ActivInspire n'existe. On le garde et on l'affiche (Calques). `Restack { ids, to }` : les ids (une même page, sinon refus) remontent en bloc, ordre relatif gardé, `to` = rang du bas du bloc dans la pile finale (0 = arrière-plan) ; retirer + réinsérer en gardant les ids (DA2) ; une étape ; même ordre : aucune étape. | Jérôme (« Si tu à dejà mis en place le systéme de couche, conserve le et affiche le ici », « l'objet en haut est au premier plan ») | oui |
| 17 | Calques : contenu (lot 2) | Une ligne par objet non groupé ou par groupe extérieur (« Groupe (n) », un seul bloc au glisser), premier plan en haut ; lignes fixes en bas, non déplaçables : « Grille » (à sa place selon `above`) et « Fond de la page ». Toucher = sélectionner (outil Sélection) ; Ctrl ou Maj + toucher = ajouter ou retirer ; la sélection de la scène surligne ses lignes. | Jérôme (Photoshop) ; U7 (un clic prend le groupe extérieur) | oui |
| 18 | Masquer, verrouiller | **Reportés** (DA8) : chacun touche au moins six chemins (deux rendus, collision du cœur et du faux cœur, exports PDF, IWB, UBZ, pot sur zones, gomme, sélection). | brief (« si c'est simple ») | oui |
| 19 | Barre latérale dans le profil | La barre de rôle **`pages`** (id `pages`, déjà dans les trois profils) **devient** la barre latérale : même `data-toolbar="pages"`, ses éléments (Ajouter, Dupliquer, Retirer, Insérer des pages…, exports du profil Simple) forment la rangée d'actions de l'onglet Pages ; `page-prev` et `page-next` quittent ce rôle pour la barre `tools` des profils fournis (DA5). Rôle `pages` en `top` ou `bottom` : rendu flottant (H10). **Profil d'utilisateur ancien** (aucun `page-number`, `page-prev`, `page-next` hors de la barre `pages`) : à la lecture (`parseProfile`, sans écriture tant que l'utilisateur n'enregistre pas), un groupe `pages` (`page-prev`, `page-number`, `page-next`) est ajouté en fin de la première barre `tools`, ids rendus uniques (`uniqueId`, `profile-edit.ts`) ; ses anciens `page-prev`/`page-next` de la barre `pages` sont retirés de la vue de la rangée d'actions (gardés dans le fichier). Test : profil de `main@45484db` lu → navigation dans la barre d'outils, réécrit sans perte des autres clés. | brief (« Rangement de la barre latérale dans `toolbars` (`role`) ») ; U12 (« la barre des pages est une entrée de la liste ») ; 0300 ; contre-relecture 1 | oui |
| 20 | Position et repli par défaut | Champ facultatif **`anchor`** d'une barre flottante (`top-start`, `top-center`, `top-end`, `bottom-start`, `bottom-center`, `side-start`, `side-end`) ; absent : ancre du rôle (`pages` → `side-start`). `collapsed` existant = repli de départ. Les deux se règlent dans l'éditeur. Glisser ou replier à la main reste un réglage de l'appareil (0301) ; « Début » ou double appui sur la poignée revient à l'ancre du profil (DA6). | Jérôme (« positionnable par defaut dans la configuration et leurs configurations enregistrer dans le profil ») ; 0301 (« à revoir avec Jérôme ») | oui (H5) |
| 21 | Qui se déplace et se replie | Barres `tools` et `pages` (barre latérale). Menu, historique, panneaux (1 à 3 boutons) : ancre réglable, ni poignée ni repli. | 0300 ; L2-8 | oui |
| 22 | Barre latérale repliée par défaut | `collapsed: true` dans les trois profils fournis (décision gardée par l'orchestrateur, H1) ; repliée, l'îlot montre poignée, l'onglet Pages (et Calques quand le lot 2 est livré) et Déplier, `data-toolbar="pages"` toujours visible ; ses éléments (`page-add`, `page-remove`…) restent dans le DOM, cachés (`hidden`), comme ceux de la barre d'outils repliée (L2-8). **Lot 1 seul** : un seul onglet, Pages ; aucun onglet Calques vide ; Ctrl+Maj+L sans effet. L'onglet Calques fait partie de ce chantier : lot 2 dans la même PR si le temps tient, sinon PR suivante. | essais (gestes à x 60-200 de la scène, voir carte) ; canvas plein en classe ; orchestrateur (contre-relecture 1) | oui (H1) |
| 23 | Barre latérale : forme | Îlot à l'ancre `side-start` : sous la rangée du haut, au-dessus de la rangée du bas, hauteur bornée (la liste défile). En-tête : onglets « Pages » et « Calques » (icône et texte, motif `tablist`). Onglet Pages : rangée d'actions ; mode de la page montrée (`RadioChoices` en segments : paysage, portrait, infini) ; liste des miniatures (`.rb-pages-list`, bouton `data-page="N"`, `data-page-id`, `aria-current`, numéro à gauche, anneau `#6044EB` sur la page montrée) ; taille des miniatures en segments (petites 120, moyennes 160, grandes 220 px de large). | Jérôme (PowerPoint) ; design-cadrage D-DS1, D-DS2, D-DS5 ; `RadioChoices.tsx` | oui |
| 24 | Gestes au doigt | Toucher une miniature : la montrer. Glisser une miniature : la déplacer (`startSortDrag`, événements de pointeur seuls). Appui long (500 ms, `TIP_HOLD_MS`) : menu de la miniature (Insérer une page après, Dupliquer, Retirer, Monter, Descendre). Cibles ≥ 44 px. | brief (U12, U24 : jamais le glisser HTML5) ; `sort-drag.ts:35`, `tooltip.ts:8` | oui |
| 25 | Barre principale | Groupe `pages` en fin de la barre `tools` des profils fournis : `page-prev`, `page-number` (neuf : bouton `id="pages"` « 2 / 5 », toucher = ouvrir ou replier la barre latérale sur Pages), `page-next`. `page-next` n'est plus grisé sur la dernière page : il ajoute une page (mode du profil), nom et infobulle « Nouvelle page » ; une étape. | Jérôme (« Si je suis sur la dernier page et que je clic page suivante, j'ajoute une page ») | oui (H7) |
| 26 | Barre des pages du bas | Retirée : `PagesBar.tsx` et son test disparaissent ; `#pages` passe sur `page-number`. | Jérôme (« Je ne suis même pas sur qu'une toolbar de gestion des page soit neccessiare ») | oui |
| 27 | Actions neuves | `ACTION_TABLE` (après `page-insert-file`) : `page-number` « Numéro de page », `page-duplicate` « Dupliquer la page » ; lot 2 : `layer-front` « Premier plan », `layer-back` « Arrière-plan » (rangée Sélection, hors catalogue). Aucune n'a de `requires` (constat `toolbar.ts:634` non aggravé). | `toolbar.ts:99-135` | oui |
| 28 | Icônes | Tracés Lucide au commit `7981a0798a` (ISC), recopiés dans `icons.ts` avec mention dans `THIRD_PARTY_NOTICES.md` (§ Icônes Lucide) : `panel-left` (barre latérale), `layers` (Calques), `copy` (dupliquer), `rectangle-horizontal`, `rectangle-vertical`, `infinity`, `rows-2`/`rows-3`/`rows-4` (tailles), `bring-to-front`, `send-to-back` (lot 2) ; noms vérifiés par `gh api` ; trait 1,5, `viewBox="-0.25 -0.25 24 24"` (D-DS4). Aucune dépendance npm. | design-cadrage D-DS4, § 10 ; `icons.ts:60-110` | oui |
| 29 | Raccourcis clavier | Table de la section 2 bis ; fonctions pures dans `engine/input/keys.ts`, hors champ de saisie et hors composition IME (DA9). | brief (« clavier second ») | oui |
| 30 | Commandes CLI | Les quatre commandes passent par `run --ops` (`{"type":"SetPageMode",…}`, `MovePage`, `DuplicatePage`, `Restack` au lot 2), ajoutées à `COMMAND_TYPES` (`ops.ts:11-16`, `tsc` l'exige) ; `AddPage` accepte `mode` ; `state` montre `mode` et `height` (PageView) ; note de la ligne `.roomboard` de `FORMAT_LOTS` ; tests ; `cli-essai.mjs` (une étape par commande, refus code 1, réouverture identique). Références : `$n` vaut `change.ids` s'il est non vide, sinon `change.pages` (`apps/cli/src/session.ts:384`) : après `DuplicatePage` d'une page non vide, `$n` désigne **les éléments copiés**, pas la page ; la page copiée se lit par `$page:i` (rang = rang d'origine + 1). Écrit dans l'aide et couvert par `cli-essai.mjs` (duplication d'une page à deux objets : `$n.1` est un élément, `$page:1` la copie). Aucun code CLI dans les modules Wasm. | profil § CLI (D15) | oui |
| 31 | Taille Wasm | Quatre commandes et le découpage de la grille : estimé + 8 à 20 ko sur 197 283 o de marge (1 572 864 − 1 375 581) ; mesuré à chaque lot dans le rapport. `formats` inchangé. | brief | oui |
| 32 | Essais existants | Sélecteurs gardés : `data-item` des actions de page, `#pages`, `#stage[data-page]`, `.rb-pages-list [data-page="N"]`, `data-toolbar="pages"`, `data-dock="floating"`. Adaptations de sélecteur, sans toucher au fond : (a) **`clickItem` de `commun.mjs:111-115` étendu** sur le modèle d'`openMenuOf` (`:104-110`) : si le bouton visé est dans une barre latérale repliée (`[data-island="pages"][data-collapsed="1"]:has(<item>)`), il la déplie d'abord (`[data-island-collapse]`) ; les essais qui touchent `page-add`/`page-remove` par `page.click(item(…))` ou `page.$(item(…))` passent par `clickItem` (liste en carte) ; (b) aide `pageTo(page, n)` (déplie, touche la miniature, replie) pour `c13-tableaux` et `c13-fidelite` ; (c) `design-l2` S6 : barre dépliée d'abord, défilement vertical ; (d) `design-l2` S5 (`:459`) ne contrôle plus `collapsed === false` que pour les barres hors `pages` : la barre latérale est repliée par défaut par décision (H1), ce que S5 vérifiait n'était que « aucune barre fournie repliée ». Liste en section 3, rubrique Essais. | brief (« adapter les sélecteurs, sans réécrire le fond ») ; orchestrateur (contre-relecture 1) | oui |
| 33 | Faux cœur | `fake-core.ts` suit chaque commande neuve et `mode`, `height` de `page()` (aujourd'hui constantes, `fake-core.ts:1375`). | patron de tous les chantiers | oui |
| 34 | Version du profil | `PROFILE_MINOR` inchangé : champs facultatifs, clés inconnues gardées, comme L2 et L4 (0295 « schéma inchangé »). | 0295 ; `toolbar.ts:12-14` | oui (H12) |
| 35 | Annotation | Rien ne change : en annotation, aucun îlot flottant n'est montré (`App.tsx:376`), rendu transparent sans cadre (`canvas2d.ts:365`) ; la page envoyée (C11b) garde le mode absent. | code lu | oui |
| 36 | Design | Îlots, jetons et états existants (charte, D-DS2, D-DS5) ; aucune maquette neuve ; **porte visuelle de fin de lot** : captures 2x avant/après (tableau, barre latérale ouverte et repliée, mode infini, portrait, éditeur), contrôle de netteté § 10 sur une icône droite neuve (`rectangle-horizontal`). | design-cadrage § 9-10 | oui |

### 2 bis. Raccourcis (aucune collision avec Ctrl+Z, Y, Maj+Z, G, Maj+G, S, Maj+S, O, N, C, X, V, B/I/U en texte, Suppr, Retour arrière, Échap, Entrée, Espace, flèches et Début de la poignée, Tab du texte ; Cmd sous macOS)

| geste | au doigt | au clavier |
|---|---|---|
| page précédente | bouton `page-prev` | Page préc. (`PageUp`) |
| page suivante / nouvelle page sur la dernière | bouton `page-next` | Page suiv. (`PageDown`) ; touche tenue sur la dernière page : une seule page ajoutée |
| ajouter une page après la page montrée | bouton `page-add` de la barre latérale | Ctrl+M (PowerPoint), **Ctrl+M aussi sous macOS** : Cmd+M réduit la fenêtre et PowerPoint Mac garde Ctrl+M |
| dupliquer la page montrée | bouton `page-duplicate`, menu de la miniature | Ctrl+Maj+D |
| ouvrir / replier la barre latérale, onglet Pages | bouton `page-number`, onglet de l'îlot replié | Ctrl+Maj+P |
| idem, onglet Calques (lot 2) | onglet Calques | Ctrl+Maj+L |
| changer d'onglet | toucher l'onglet | ← → dans la liste d'onglets |
| miniature : montrer, focus voisine | toucher | Entrée ou Espace ; ↑ ↓ |
| miniature : déplacer | glisser | Ctrl+↑ / Ctrl+↓ ; Ctrl+Début / Ctrl+Fin |
| miniature : retirer | menu (appui long) | Suppr ou Retour arrière (focus sur la miniature : la touche ne va pas au moteur) |
| miniature : menu | appui long | Maj+F10 ou touche Menu |
| mode de la page, taille des miniatures | segments | Tab puis ← → (`RadioChoices`) |
| déplacer la barre latérale | poignée | poignée : flèches 16 px, Maj 64 px, Début = ancre du profil |
| objet : avancer / reculer (lot 2) | glisser la ligne de calque | Ctrl+↑ / Ctrl+↓ (sélection non vide, focus hors barre latérale) |
| objet : premier plan / arrière-plan (lot 2) | boutons de la rangée Sélection | Ctrl+Maj+↑ / Ctrl+Maj+↓ |
| rendre le focus à la scène | toucher la scène | Échap dans la barre latérale |

Pas de Ctrl+] / Ctrl+[ (PowerPoint, Figma) : sur un clavier AZERTY, `[` et `]` exigent Alt Gr, refusé par `keys.ts:26` (Alt Gr = Ctrl+Alt).

## 3. Carte d'impact

Rubriques déduites (le profil n'a pas de ligne « Surfaces d'impact ») : cœur, pont et API, moteur et rendu, interface,
profils et appareil, persistance, export, CLI, tests unitaires, essais, documents et licences, autres dépôts.

### Cœur Rust (`crates/roomboard-core`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/document.rs:79-91` `insert_page` | oui | écrit `mode` et `height` selon le mode demandé | V |
| `src/document.rs:141` `blank` | oui | `blank_with(mode)` : mode de la première page, sans étape | V |
| `src/document.rs:237-250` `page()` | oui | `PageView` gagne `mode` ; `height` lu | V |
| `src/document.rs:662-716` grille (`page_grid`, `snap_*`, `grid_lines*`) | oui | découpe et accroche selon le mode (cadre ou rien) | V |
| `src/grid.rs:249-300` `snap_lattice`, `snap_level`, `:539-558` `lines` | oui | borne passée en `Option<Bounds>` au lieu de `width` | V |
| `src/commands.rs:31-36` `AddPage`, `RemovePage` ; `:618` aiguillage | oui | `AddPage.mode`, `SetPageMode`, `MovePage`, `DuplicatePage` (lot 2 : `Restack`) insérés **après `RemovePage`** | V |
| `src/commands.rs:285-302` `CommandError` | oui | `BadIndex`, `MixedPages` (lot 2) | V |
| `src/copy.rs:61-91` `copy_elements`, `:162-186` `extract`, `:225-292` `insert_pages` | oui | `extract_page` (DA3) ; recopie qui garde l'id (DA2) | V |
| `src/document.rs:555-610` cache des contours | non | ids gardés par `MovePage`/`Restack` : le cache reste valide ; test qui le prouve | V |
| `src/zone.rs`, `fill.rs`, `query.rs` | non | aucune borne de page lue ; tests à garder verts | V |
| `src/format/mod.rs:17` | non | `formatVersion` 1 gardé | V |

### Pont Wasm et API TypeScript du cœur

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-wasm/src/lib.rs:476` `blank`, `:564` `insert_pages`, `:669` `page` | oui | `blank(mode?)`, méthodes `set_page_mode`, `move_page`, `duplicate_page` (lot 2 `restack`), `add_page` avec mode | V |
| `apps/web/src/core/api.ts:51-53` `Command`, `:314-321` `PageView`, `:397` `blank` | oui | variantes après `RemovePage` ; `mode` ; `blank(mode?)` | V |
| `apps/web/src/core/api.ts:446` `PAGE_HEIGHT` | non | constat `api.ts:145` (doublon de `engine/page.ts`) : **ne pas l'aggraver** (aucune constante neuve ici) | V |
| `apps/web/src/core/wasm-core.ts:722` et l'aiguillage des commandes | oui | appels neufs | V |
| `apps/web/src/core/fake-core.ts:397`, `:1372-1375` | oui | commandes neuves ; `page()` rend `mode`, `height` | V |
| `apps/web/src/core/fake-core.ts:1598-1630` (accroche et lignes de grille bornées par `PAGE_WIDTH`) | oui | même règle que le cœur (cadre en Page, aucune borne en Infini) ; tests du faux cœur | V |

### Moteur et rendu (`apps/web/src/engine`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `engine/page.ts:3-35` `visiblePageRect`, `visibleGridRect` | oui | `pageFrame(view)` ; rectangles selon le mode | V |
| `engine/render/canvas2d.ts:359-398` `drawScene`, `:395-398` `gridOf`, `:608` `drawLive` | oui | cadre ou plan entier ; grille sans `PAGE_WIDTH` fixe | V |
| `engine/render/webgl2.ts:80` `pageScissor`, `:387` | oui | même cadre (second rendu) | V |
| `engine/render/pdf-tiles.ts:210` | non | tuiles dans la vue : inchangé | V |
| `engine/camera.ts:38-79` `fitPage`, `fitWidth` | oui | `fitFrame` (portrait, infini) à côté de `fitWidth` gardé | V |
| `engine/camera.ts:56-73` `topBelowIslands` ; `app/board-session.ts:317-322` (liste des `.rb-island`) | oui | îlots latéraux (`data-anchor="side-*"`) exclus du haut de page ; test `camera.test.ts` ; sans cela OF83 (`design-l2` S1) échoue | V |
| `engine/render/grid-cache.ts:52-62` (`grow` borne x0, y0 ≥ 0) | oui | Infini : aucune borne, sinon pas de grille aux coordonnées négatives (S1) ; Page : bornes du cadre ; test `grid-cache.test.ts` | V |
| `engine/engine.ts:132-140`, `:248`, `:740-760` | oui | `addPage` avec le mode du profil (`deps.pageMode`), `nextOrAdd`, `movePage`, `duplicatePage`, `setPageMode`, ajustement selon le mode ; lot 2 : `restack`, `select(ids)` | V |
| `engine/engine.ts:28-40` `EngineState` | oui | `pageMode` de la page montrée | V |
| `engine/input/keys.ts:25-45` | oui | `pageKey`, `orderKey` (DA9) ; `inEditable` exporté | V |
| `engine/input/router.ts:40-160` | non | deux doigts déjà là | V |

### Interface (`apps/web/src/ui`, `apps/web/src/app`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `ui/PagesBar.tsx` (86 l.), `ui/PagesBar.test.tsx` | oui (retirés) | remplacés par `SideBar.tsx` ; `counterAfter` et `pagesLabel` déplacés (`pagesLabel` lu par `stage-tags.test.ts:4`) | V |
| `ui/App.tsx:32`, `:365-426` `BY_ROLE`, `islandWatch` | oui | rôle `pages` → `SideBar` ; remesure sur `pageCount`, `pageMode` | V |
| `ui/Toolbar.tsx:101-103` `ACTION_RENDER`, `:248` | oui | `page-number` rendu par la table | V |
| `ui/Island.tsx:29` `MOVABLE_ROLE`, `:144-163`, `:230-300`, `:343-400` `IslandLayer` | oui | rôles mobiles `tools` et `pages` ; ancre du profil ; voie latérale ; ordre DOM : îlots latéraux après les centrés | V |
| `ui/island-place.ts:10` `Anchor`, `:31-37` `ISLAND_ANCHORS`, `:61-80` `laneOf` | oui | `side-start`, `side-end`, `maxHeight` ; `anchorOf(bar)` lit `bar.anchor` | V |
| `ui/item-state.ts:80-82` | oui | `page-next` jamais grisé, nom « Nouvelle page » sur la dernière ; `page-duplicate` | V |
| `ui/icons.ts:60-110`, `:112-120` `ACTION_ICONS` | oui | tracés neufs, en bloc après les icônes de page | V |
| `ui/rb.css:174-178` (`.rb-pages-count`, `.rb-pages-list`) | oui | liste verticale, barre latérale ; jetons `--rb-btn-*`, pas de `48px` littéral (constat `rb.css:203`) | V |
| `ui/SelectionRow.tsx:7-32`, `app/toolbar-host.ts:9` | lot 2 | Premier plan, Arrière-plan | V |
| `ui/ProfileEditor.tsx:106`, `:118-121` `ROLE_LABELS`, `:250-283` `BarBlock`, `:567` | oui | « Barre latérale » ; ancre et « Repliée au démarrage » par barre flottante ; « Page neuve » en segments | V |
| `ui/sort-drag.ts:35`, `ui/pointer-gesture.ts`, `ui/RadioChoices.tsx`, `ui/IconButton.tsx`, `ui/tooltip.ts:8` | non (réutilisés) | — | V |
| `app/toolbar-host.ts:76-79` | oui | `page-next` → `nextOrAdd`, `page-duplicate`, `page-number` | V |
| `app/thumbnail.ts:20-50`, `app/pdf-overlay.ts:27`, `:103` | oui (étendu) | rendu de miniature de page (DA7) | V |
| `app/stage-tags.ts:33-55` | oui | `#stage[data-page-mode]` | V |
| `platform/image-import.ts:151-156` `visibleOf` (coupe à [0, 1920]) | oui | Infini : partie visible non coupée (une image déposée à gauche de l'origine reste au point de dépôt) ; Page : inchangé ; test | V |
| `app/annotation-page.ts:56` `viewOf` | oui | `pageMode` à projeter (constat `annotation-page.ts:35` : champ oublié sans erreur de type) | V |
| `app/workspace.ts:618`, `:627` `core.blank()` | oui | onglet neuf : `blank(pageMode du profil)` ; l'onglet d'annotation garde `blank()` | V |
| `app/board-io.ts:231`, `app/desktop-page.ts:28` | non | documents de travail sans mode | V |
| `main.ts:420-427` keydown | oui | raccourcis de page avant le moteur | V |
| `platform/controller.ts:74-83` `fileCommandOf` | non | aucune collision (Ctrl+M, Maj+D, Maj+P, Maj+L libres) | V |

### Profils et réglages de l'appareil

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `toolbar.ts:50-57` `Toolbar`, `:76` `behavior`, `:226` `BEHAVIOR_KEYS`, `:230` `BAR_KEYS`, `:367-386` `parseBar`, `:448` `parseBehavior` | oui | `anchor`, `pageMode` lus et réécrits | V |
| `toolbar.ts:99-135` `ACTION_TABLE` | oui | actions neuves après `page-insert-file` | V |
| `toolbar-profiles.ts:25-49` `pagesBar`, `:137-150` `defaultToolbars`, `:177-189` simple | oui | groupe `pages` de la barre d'outils ; barre `pages` = latérale `collapsed: true` avec `page-duplicate` | V |
| `profile-edit.ts:72-74`, `:150-180` `catalog` | oui | `setAnchor`, `setCollapsed`, `setPageMode` ; catalogue de `pages` sans `page-prev`/`next`/`number` | V |
| `device-settings.ts:13-23`, `:55-63` | oui | clé `roomboard.laterale` : onglet et taille des miniatures ; `IslandState` inchangé | V |

### Persistance et format

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `.roomboard` (`document.ybin`) | oui | `mode` facultatif, `height` 3413,33 en portrait ; test « recharger garde les octets » (U3, D25 : valeurs scalaires seulement) | V |
| `.rbprofile` | oui | `anchor`, `behavior.pageMode` facultatifs ; un profil ancien se lit sans perte | V |
| `.rbitem`, `.rbpack` | non | fragments d'une page sans mode | S |
| `crates/roomboard-formats` (`.iwb`, `.ubz` écrits) | non | taille de page fixe gardée (H15) | V |

### Export

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `app/pdf-export.ts:236` | oui | rectangle par `pageFrame` et par le contenu en Infini | V |
| `app/pdf-overlay-vector.ts`, `pdf-overlay.ts` | non | reçoivent le rectangle | V |

### CLI (`apps/cli`, `scripts/essais/cli-essai.mjs`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/cli/src/ops.ts:11-16` `COMMAND_TYPES` | oui | commandes neuves après `RemovePage` | V |
| `apps/cli/src/formats.ts:58` ligne `.roomboard` | oui | note « mode de page `mode` facultatif » | V |
| `apps/cli/src/state.ts:30-45` | non | `PageView` complet déjà rendu | V |
| `apps/cli/src/main.ts:38-42` aide | non | aucune sous-commande neuve | V |
| `apps/cli/src/ops.test.ts`, `session.test.ts` | oui | une étape par commande, refus | V |
| `scripts/essais/cli-essai.mjs:112-160` | oui | bloc « personnalisation-1a » ajouté **après** les blocs existants | V |

### Tests unitaires (non touché = à garder vert)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `ui/item-state.test.ts:42` | oui | `page-next` n'est plus grisé sur la dernière page (comportement voulu) | V |
| `ui/App.test.tsx:358-361`, `:372`, `:471` | oui | `#pages` et `data-item` dans la barre d'outils ; `setDock(…, "pages", "bottom")` rend flottant | V |
| `ui/ProfileEditor.test.tsx:104`, `:191-194`, `:310` | oui | libellé « Barre latérale » ; catalogue | V |
| `profile-edit.test.ts:43`, `:85-92` | oui | catalogue d'`outils` sans prev/next (déjà présents) | V |
| `toolbar-profiles.test.ts:38`, `:58`, `:119`, `:192` | oui | barres fournies (ordre des ids inchangé, `collapsed` de `pages`) | V |
| `ui/island-place.test.ts:16-47`, `ui/Island.test.tsx:233-254` | oui | ancre de `pages` = `side-start` | V |
| `ui/rb-css.test.ts:251-253` | oui | règles de `.rb-pages-list` | V |
| `app/stage-tags.test.ts:4`, `:40` | oui | import de `pagesLabel` déplacé ; `pageMode` | V |
| `toolbar.test.ts:178`, `:235-239`, `:473` | non | profils de test écrits à la main : restent valides | V |
| `app/toolbar-host.test.ts:76` | non | mêmes actions | V |
| `ui/pixel-pad.test.ts` | non | `#pages` toujours `padToPixel` | V |
| `engine/camera.test.ts`, `engine/engine.test.ts`, `engine/page.test.ts` | oui | cadre, ajustement, `nextOrAdd` | V |
| `crates/roomboard-core` (copy, commands, document, grid) | oui | tests neufs ; `reload_with_strokes_keeps_bytes` et voisins verts | V |
| `crates/roomboard-core/tests/compat_socle.rs:78`, `tests/scenarios.rs` (5 appels), `tests/pot.rs`, tests de `copy.rs` (`AddPage`) | oui | `Command::add_page(after)` (champ `mode: None`) ; comportement inchangé | V |

### Essais e2e (`scripts/essais`, `verifier.sh --e2e`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/essais/commun.mjs:104-115` `openMenuOf`, `clickItem` | oui | `clickItem` déplie la barre latérale repliée qui contient l'item ; `pageTo(page, n)` neuf | V |
| `c13-tableaux-navigateur.mjs:222`, `:314-320`, `:375-380`, `:458-462` | oui, sélecteur | `.rb-pages-list [data-page]` via `pageTo` (barre repliée par défaut) | V |
| `c13-fidelite.mjs:63` | oui, sélecteur | idem | V |
| `c4-bibliotheque-navigateur.mjs:125`, `:144`, `:153` | oui, sélecteur | `page.click(item("page-add"))` → `clickItem` | V |
| `s34-navigateur.mjs:41-44` (`edit` = `page.$(item)`), `:98-99`, `:314-320`, `:326-329` | oui, sélecteur | `click` et `edit` de `page-add`/`page-remove` déplient d'abord (`openSideOf`, même aide) ; `:322` (`isDisabled`) lu barre dépliée | V |
| `s5b-navigateur.mjs:220`, `:223` | oui, sélecteur | `page-add` → `clickItem` | V |
| `c11b-capture-navigateur.mjs:122` | oui, sélecteur | idem | V |
| `design-l4-navigateur.mjs:217` | oui, sélecteur | idem | V |
| `design-l2-navigateur.mjs:533-542` (S6, trente pages) | oui, sélecteur | `page-add` par `clickItem` ; barre dépliée ; défilement vertical (`scrollHeight`) | V |
| `design-l2-navigateur.mjs:459` (S5, `toolbars.every((b) => b.collapsed === false)`) | oui, adaptation | contrôle limité aux barres hors `pages` (H1 : la barre latérale fournie est repliée par décision) | V |
| `design-l2-navigateur.mjs:229-241` (S1, OF83 : page sous les îlots du haut) | non | doit rester vert : îlots latéraux exclus de `topBelowIslands` | V |
| `design-l2-navigateur.mjs:39`, `:55`, `:215`, `:247` | non | `data-island="pages"` présent, hors des autres îlots (à vérifier au premier jeu) | V |
| `design-l4-navigateur.mjs:81`, `:150` `DEFAULT_BARS` | non | ordre DOM gardé « …outils, pages » (îlot latéral rendu après les centrés) | V |
| `s34-navigateur.mjs:93`, `:106-107`, `:207`, `:216`, `:312` | non | `page-prev`/`page-next` dans la barre d'outils, `#pages` « 3 / 3 » | V |
| `s5b-navigateur.mjs:98-100`, `:239-242` | non | `[data-toolbar="pages"][data-dock="floating"]` gardé ; `page-next` dans la barre d'outils | V |
| `c11b-capture-navigateur.mjs:124-214`, `c16-office-navigateur.mjs:107`, `c12-pdf-navigateur.mjs` | non | `page-prev`/`page-next`, `#stage[data-page]` gardés | V |
| `c3-groupes:86-180` (170,160), `c15-3d:286` (60,650), `c13-tableaux:301` (200,500), `design-l1:43` (200,y) | non | gestes près du bord gauche : la barre latérale repliée (x 16-64, haut du côté) ne les couvre pas (H1) | V |
| `personnalisation-1a-navigateur.mjs` (neuf) + ligne de `verifier.sh` après `design-l4` | oui | S1, S2, S3, S5 (lot 2 : S4) | V |

### Documents et licences

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `THIRD_PARTY_NOTICES.md:511-583` (§ Icônes Lucide) | oui | ligne des tracés neufs, en fin de section | V |
| `docs/essais/c11a-coque.md`, `c11b-coque.md` | non | aucune ligne sur la barre des pages | V |
| `docs/essais/eni-stylet.md:174` | non | récit daté du lot 5b | V |

### Autres dépôts

Aucun.

### Effets de bord sur l'existant

- `page-next` sur la dernière page ajoute une page au lieu de ne rien faire — `item-state.test.ts` (mis à jour), `engine.test.ts` (`nextOrAdd`), S3.
- Une page ancienne s'affiche avec un cadre 1920 × 1080 : ce qui dépasse en bas passe sur le pourtour gris — `page.test.ts` (`pageFrame`), S1 (fichier sans `mode`).
- La grille d'une page Page s'arrête au bas du cadre (avant : sans fin vers le bas) — `grid.rs` (test « lignes bornées au cadre »), `c9-grille-navigateur.mjs` vert.
- La barre des pages du bas disparaît ; un profil d'utilisateur gardé voit sa barre `pages` devenir la barre latérale — `toolbar-profiles.test.ts`, `App.test.tsx`, `design-l4` S1.
- Un profil où `pages` est en bande haute ou basse la montre flottante — `App.test.tsx:372`.
- ~~Ajuster une page portrait montre tout le cadre (zoom plus petit)~~ OG24 : ajuster une page portrait la cadre en largeur — `camera.test.ts`, `engine.test.ts`.
- `#pages` passe de l'îlot du bas à la barre d'outils — `s34`, `s5b`, `design-l2` S6.
- `viewOf` de l'annotation projette `pageMode` — `annotation-page.test.ts`.
- Le haut de la page ajustée ne compte plus que les îlots du haut, jamais la barre latérale — `camera.test.ts`, `design-l2` S1.
- Un profil d'utilisateur ancien gagne à la lecture la navigation dans sa barre d'outils — `toolbar.test.ts` (profil de `main@45484db`).

### Chantiers en cours

- **personnalisation-1b (OG5)**, `~/projets/roomboard-wt/personnalisation-1b`, branche `feat/personnalisation-1b` à 45484db, **aucun commit** (étage 1, cadrage). Fichiers communs probables : `toolbar-profiles.ts` (bouton « Fonds » de la barre d'outils), `toolbar.ts` `ACTION_TABLE`, `icons.ts`, `App.tsx` (fenêtre des fonds), `rb.css`, `commands.rs` et `api.ts` (fonds), `fake-core.ts`, `ops.ts`, `formats.ts`, `cli-essai.mjs`, `THIRD_PARTY_NOTICES.md`. Pour éviter les conflits : insertions de 1a **groupées à côté des entrées de page** (variantes après `RemovePage`, actions après `page-insert-file`, icônes après celles de page), jamais en fin de liste ; groupe `pages` de la barre d'outils sur ses propres lignes après le groupe `bureau` ; bloc `cli-essai.mjs` à part ; aucun reformatage ni réordonnancement de l'existant. Le second à fusionner se remet sur `main` (`rebase-feature-branch`) ; conflits attendus de simple adjacence. Point partagé : le fond d'une page Infini (répété ou fixe) est tranché par 1b ; 1a dessine le `backdrop` à son rectangle et fournit `pageFrame` et `PageView.mode`.
- PR ouvertes : aucune (`gh pr list`). Autres worktrees : aucun (`git worktree list`). Autre machine : non donnée.

### Termes cherchés

Graphe : `query "page navigation showPage pageIndex PagesBar goTo"` ; `affected` `showPage`, `PagesBar()`, `counterAfter()`, `visiblePageRect()`, `fitWidth()`, `copy_elements()`, `anchorOf()` (ambigu), `insert_pages()` (ambigu), `lines()` (ambigu).
Texte (contre-relecture 1) : `topBelowIslands|fitTop`, `grow` (`grid-cache.ts`), `visibleOf` (`image-import.ts`), `snap|PAGE_WIDTH` (`fake-core.ts`), `AddPage` (`crates/roomboard-core/tests`), `idsOf|change.ids` (`apps/cli/src/session.ts`), `rb-tab|role="tab"` (`TabsBar.tsx`), `page.click(item("page-|edit("page-` (`scripts/essais`), `collapsed === false` (`design-l2`). Texte : `data-page[=\]"]|#pages|data-item="page-|page-(prev|next|add|remove|insert-file)|data-toolbar="pages"|data-island="pages"|rb-pages|\[data-page` (`scripts/essais`, `apps`) ; `PagesBar|pagesLabel|counterAfter|rb-pages` ; `visiblePageRect|visibleGridRect|SURROUND_COLOR|PAGE_HEIGHT|fitWidth(|fitPage(|wheel` ; `PAGE_WIDTH` (11 fichiers) ; `"height"|"width"` (cœur) ; `order|front|back|move_page|duplicate|move_to|DA4` (cœur) ; `pinch|touches|two` (moteur) ; `keydown|e.key ===|shortcut|raccourci` ; `MOVABLE_ROLE|ISLAND_ANCHORS|setIsland` ; `dispatchTouchEvent|hasTouch` ; `mouse.(move|click|down)(x<220,` ; `blank()` ; `long.?press|TIP_HOLD_MS` ; `FORMAT_LOTS|COMMAND_TYPES` ; `Lucide` (`THIRD_PARTY_NOTICES.md`). Coffre : « personnalisation mode page infini barre latérale calques roomboard », « roomboard barre flottante repliable position profil », « roomboard page infinie hauteur », « roomboard ordre des objets z-order premier plan », « roomboard barre des pages miniatures », « roomboard profil behavior toolbars role ».

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| recopier une page avec ids neufs | `crates/roomboard-core/src/copy.rs:225` | `Document::insert_pages(&mut self, src: &Document, after: &str) -> Result<Change, CommandError>` | réutiliser |
| extraire une page entière (champs et éléments) | `copy.rs:162` `extract` | neuf à côté : `pub fn extract_page(&self, page: &str) -> Result<Document, CommandError>` (champs de page par `as_prelim` sauf `elements`, puis `copy_elements`) | étendre |
| déplacer page ou objets en gardant l'id | `copy.rs:61` `copy_elements` (renumérote) ; patron `commands.rs:1905` | `pub(crate) fn reinsert_kept(arr: &ArrayRef, txn: &mut TransactionMut, moves: Vec<(u32, MapPrelim)>)` : prélims lus dans une lecture fermée avant l'écriture (même doc) | étendre |
| borner la grille et l'accroche | `grid.rs:539` `lines`, `:299` `snap_point`, `:320` `snap_delta` | paramètre `width: f64` remplacé par `clip: Option<Bounds>` (None = infini) | étendre |
| cadre de page | `engine/page.ts:18` `visiblePageRect` | `export function pageFrame(p: PageView): PageRect \| null` (null = Infini) ; `visiblePageRect(c, view, frame)` | étendre |
| ajuster | `engine/camera.ts:38` `fitPage`, `:76` `fitWidth` | `fitPage(viewW, viewH, pageW, pageH, margin)` réutilisé pour portrait et infini, `fitWidth` gardé | réutiliser |
| boîte du contenu | `CoreDocument.bounds(ids)` (`thumbnail.ts:36`) | `doc.bounds(doc.elementIds(page))` | réutiliser |
| miniatures de page | `app/thumbnail.ts:30`, `pdf-overlay.ts:27` `ContentPainter.paintContent`, `:103` `browserExportCanvas` | `export async function renderPageThumb(doc, assets, pageId, width, deps: ThumbDeps & { backdrop?: BackdropPainter }): Promise<ImageBitmap \| Blob \| null>` dans `thumbnail.ts` ; cache `page-thumbs.ts` (DA7) | étendre |
| glisser une miniature ou un calque | `ui/sort-drag.ts:35` | `startSortDrag(e, { rows, scroller, from, moved, drop, tap, cancel })` | réutiliser |
| appui long | `ui/tooltip.ts:8` `TIP_HOLD_MS`, `ui/pointer-gesture.ts:19` | `startPointerGesture` + délai `TIP_HOLD_MS` | réutiliser |
| segments (mode, taille, page neuve) | `ui/RadioChoices.tsx` | `<RadioChoices look="segment" options value choose>` | réutiliser |
| boutons à icône et infobulle | `ui/IconButton.tsx`, `ui/icons.ts:159` `iconFor` | inchangés | réutiliser |
| îlot mobile, repli, poignée | `ui/Island.tsx:230-300`, `island-place.ts:61` | `anchorOf(bar: Toolbar): Anchor` (au lieu de `role`), `laneOf` avec `side-*` et `maxHeight` ; `movable` = rôle ∈ {`tools`, `pages`} | étendre |
| position et repli à la main | `device-settings.ts:55-63` | `island()`, `setIsland()` inchangés | réutiliser |
| état de la barre latérale sur l'appareil | `device-settings.ts:8-13` (`FRAME_KEY`, patron d'une clé) | `sidebar(): { tab: "pages" \| "calques"; thumb: "s" \| "m" \| "l" }`, `setSidebar(s)` | étendre |
| lecture et écriture du profil | `toolbar.ts:367` `parseBar`, `:448` `parseBehavior` | champs `anchor?`, `behavior.pageMode` | étendre |
| éditer le profil | `profile-edit.ts:72-74` | `setAnchor(p, barId, a)`, `setCollapsed(p, barId, c)`, `setPageMode(p, m)` | étendre |
| compteur entre Précédente et Suivante | `PagesBar.tsx:33` `counterAfter`, `:22` `pagesLabel` | rendu par `ACTION_RENDER["page-number"]` (`Toolbar.tsx:101`) ; `pagesLabel` déplacé dans `ui/item-state.ts` | réutiliser |
| état grisé, icônes des actions | `ui/item-state.ts:80`, `icons.ts:112` | entrées neuves | étendre |
| raccourcis | `engine/input/keys.ts:25` `keyAction` | `pageKey(e: KeyLike): PageKey \| null`, `orderKey(e: KeyLike): OrderKey \| null` ; `inEditable` exporté (ne pas recopier : constat `annotation-page.ts:76`) | étendre |
| commandes CLI | `apps/cli/src/ops.ts:11` | `COMMAND_TYPES` | étendre |
| essais : toucher un item dans un conteneur replié | `scripts/essais/commun.mjs:104-115` `openMenuOf`, `clickItem` | `clickItem(page, id)` déplie aussi la barre latérale ; `pageTo(page, n)` à côté | étendre |
| haut de la page ajustée | `engine/camera.ts:56` `topBelowIslands` | liste d'îlots filtrée par l'appelant (`board-session.ts:317`) : `[data-anchor^="side-"]` exclus | réutiliser |
| grille visible sans borne en Infini | `engine/render/grid-cache.ts:52` `grow` | borne passée par la page (cadre ou aucune) | étendre |
| sélectionner depuis Calques (lot 2) | `SelectionTool.setSelection` (`engine.ts:189`) | `Engine.select(ids: readonly string[]): void` | étendre |
| barre latérale | aucun module de barre latérale (cherché : `SidePanel`, `Sidebar`, `tablist`, `role="tab"`, `LibraryPanel`) ; `LibraryPanel.tsx` est un panneau modal sans îlot ; `ui/TabsBar.tsx:35`, `:48` porte un motif d'onglets **non substituable** (onglets de documents : fermer, nouvel onglet, titre) : son style `.rb-tab` (états, filet actif) est **repris** pour les deux onglets de la barre latérale, pas son composant | nouveau module `ui/SideBar.tsx` : `SideBar(props: { bar: Toolbar; collapsed: Accessor<boolean>; view: Accessor<ToolbarView>; host: ToolbarHost; pages: PagesPort }): JSX.Element` (DA5) | nouveau module |
| liste des calques (lot 2) | aucun (cherché : `layers`, `calque`, `elementIds` dans `ui/`) | nouveau module `app/layer-list.ts` : `layerRows(doc: CoreDocument, page: string): readonly LayerRow[]` (premier plan d'abord, un groupe = une ligne) | nouveau module |

## 4. Hypothèses à revoir

### Niveau 1 — difficiles à défaire ou visibles des utilisateurs

- **H1** Barre latérale **repliée au départ** dans les trois profils fournis (décision 22, gardée par l'orchestrateur). Raison : la scène reste entière en classe, et les essais qui tracent près du bord gauche restent verts ; les essais qui touchent ses boutons passent par `clickItem` (décision 32). Repli : `collapsed: false` dans le profil, ou depuis l'éditeur.
- **H2** Page en mode Page dont le contenu dépasse le cadre (fichiers d'avant, page d'hier « sans fin vers le bas ») : les objets restent visibles et modifiables sur le pourtour (comme hors diapositive dans PowerPoint) ; l'export PDF garde la règle d'aujourd'hui (cadre étendu vers le bas) ; la miniature montre le cadre seul.
- **H3** (tranchée à la contre-relecture 1, voir décision 4 : plus une hypothèse) Portrait = 1920 × 3413,33 sur le précédent PF4. ~~Zoom ≈ 0,21 une fois ajustée~~ : renversé avec H4 (OG24).
- **H4** ~~Ajuster : paysage en largeur, portrait et Infini en entier.~~ **Renversée par Jérôme, 2026-11-27, mot pour mot : « En mode portrait la page doit remplir l'écran et un ascenseur permet de monté / descendre ».** Ajuster : paysage et portrait en largeur, Infini en entier ; le portrait défile à l'ascenseur (§ 9, OG24).
- **H5** Une barre déplacée ou repliée à la main reste un réglage de l'appareil ; seul le défaut (ancre, repli) vit dans le profil, réglé dans l'éditeur (amende 0301 sans la renverser). Si Jérôme veut que le geste écrive le profil : écrire `anchor` au lâcher dans une copie du profil.
- **H6** Profil d'utilisateur enregistré avant ce lot : sa barre `pages` devient la barre latérale ; la navigation est ajoutée à sa première barre `tools` **à la lecture** (décision 19), sans écrire le profil tant qu'il n'est pas enregistré ; test sur un profil de `main@45484db`.
- **H7** Suivante sur la dernière page et `PageDown` ajoutent une page ; une touche tenue n'en ajoute qu'une.
- **H8** Masquer et verrouiller un objet : reportés (DA8).
- **H9** Raccourcis d'ordre Ctrl+↑/↓ et Ctrl+Maj+↑/↓ au lieu des Ctrl+] / Ctrl+[ de PowerPoint (AZERTY).
- **H10** Barre latérale en bande haute ou basse : montrée flottante ; l'éditeur ne propose pour elle que Flottante, À gauche, À droite.

### Niveau 2

- **H11** Taille des miniatures et onglet ouvert : réglages de l'appareil (`roomboard.laterale`), pas du profil.
- **H12** `PROFILE_MINOR` inchangé.
- **H13** Miniature d'une page PDF : tuiles de `pdf-tiles` au palier 0,25, redessinée quand elles arrivent ; sinon le gris du fond PDF.
- **H14** Calques sans liste virtuelle ; calculés seulement quand l'onglet est montré, vues relues pour les seuls ids de `Change.ids` (piège `roomboard-tablecounts-relit-chaque-element-dans-emit`).
- **H15** Infini : export `.iwb`, `.ubz` sans changement (taille de page fixe, coordonnées négatives écrites telles quelles).
- **H16** Fond (`backdrop`) d'une page Infini dessiné une fois à son rectangle ; OG5 tranche sa répétition.
- **H17** Grille d'une page Page bornée au cadre ; Infini : grille et accroche sans borne.
- **H18** Deux barres sur la même ancre centrée se recouvrent (déjà vrai pour deux barres `tools`) ; l'éditeur ne l'interdit pas.
- **H19** Le choix du mode n'est que dans l'onglet Pages (pas d'entrée de menu).
- **H20** Dupliquer montre la copie ; déplacer garde la page montrée.
- **H21** Appui long de 500 ms (`TIP_HOLD_MS`) pour le menu d'une miniature ; une miniature n'a pas d'infobulle.
- **H22** `page-number` ouvre ou replie la barre latérale sur Pages.
- **H23** Les deux lots ne fusionnent pas ensemble : le lot 1 sort sans l'onglet Calques.

## 5. Décisions d'architecture

**DA1 — Mode de page en champ facultatif de la page.**
Contexte : D5 amendée donnait une seule forme de page ; Jérôme veut Page ou Infini, par page.
Décision : `mode` (absent = Page) et `height` (orientation) dans la `Y.Map` de la page, valeurs scalaires ; `SetPageMode` en une étape.
Conséquences : `schema` et `formatVersion` inchangés ; une version plus ancienne lit une page infinie comme une page à cadre.
Repli : retirer le champ revient au mode Page ; l'outil frame (plus tard) posera des cadres sur une page infinie.

**DA2 — Réordonner en gardant l'id.**
Contexte : yrs 0.28.1 n'a pas `move_to` (D2, DA4) ; deux choix : retirer + réinsérer, ou indices fractionnaires.
Décision : retirer puis réinsérer la recopie (`as_prelim`) qui garde `id`, dans une transaction locale, pour `MovePage` et `Restack`.
Conséquences : une étape d'annulation ; sélection, caméra par page et cache de contours restent valides (ids gardés) ; aucun champ d'ordre à lire partout.
Repli : les indices fractionnaires restent possibles si une collaboration temps réel arrive.

**DA3 — Dupliquer par la recopie de C3.**
Contexte : `insert_pages` sait recopier des pages avec ids neufs et groupes renumérotés.
Décision : `duplicate_page` = `extract_page(page)` puis `insert_pages(&tmp, page)`.
Conséquences : une seule routine de recopie ; un document temporaire d'une page par duplication.
Repli : écrire les prélims directement si la mesure montre un coût.

**DA4 — Un seul calcul du cadre.**
Contexte : deux rendus (`canvas2d.ts`, `webgl2.ts`), l'ajustement, l'export PDF et les miniatures dessinent ou lisent la page.
Décision : `pageFrame(view)` dans `engine/page.ts`, lu par tous ; null en Infini.
Conséquences : la règle « cadre étendu au fond » vit une fois ; aucune constante neuve dans `core/api.ts` (constat ouvert).
Repli : la fonction est pure ; changer la règle ne touche qu'elle.

**DA5 — La barre latérale est la barre de rôle `pages`.**
Contexte : chaque îlot est une barre du profil par rôle (0300) ; la barre des pages existe dans tous les profils.
Décision : composant neuf `ui/SideBar.tsx` rendu pour le rôle `pages` (table `BY_ROLE`), id et `data-toolbar` gardés, onglets Pages (et Calques au lot 2).
Conséquences : profils anciens repris sans migration (H6) ; sélecteurs des essais gardés ; `PagesBar.tsx` retiré.
Repli : un rôle `sidebar` distinct pourra venir si une seconde barre latérale est voulue.

**DA6 — Ancre par défaut dans le profil, geste sur l'appareil.**
Contexte : 0301 met tout sur l'appareil ; Jérôme veut le défaut dans la configuration et le profil.
Décision : `anchor` facultatif par barre (sept valeurs, dont `side-start` et `side-end`), `collapsed` existant ; `anchorOf(bar)` lit d'abord `anchor`.
Conséquences : `.rbprofile` gagne une clé facultative ; un profil exporté emporte la place des îlots ; le geste à la main reste local.
Repli : écrire l'ancre au lâcher si Jérôme le demande (H5).

**DA7 — Miniatures à la demande.**
Contexte : jusqu'à 500 pages (PDF) ; `paintContent` dessine déjà les vignettes de la bibliothèque.
Décision : `renderPageThumb` dans `thumbnail.ts` ; cache `ui/page-thumbs.ts` par page et version (`Change.pages`), rendu des seules miniatures visibles (`IntersectionObserver`), une à la fois par image.
Conséquences : coût borné à l'écran ; une miniature PDF suit ses tuiles (H13).
Repli : vignettes figées à l'enregistrement si la mesure le demande.

**DA8 — Masquer et verrouiller reportés.**
Contexte : le brief les veut « si c'est simple ».
Décision : hors de ces deux lots.
Conséquences : six chemins au moins changeraient (rendus, collision cœur et faux cœur, exports, pot sur zones, gomme, sélection) ; risque de régression plus grand que le gain.
Repli : un chantier court, avec un champ facultatif `hidden` / `locked` par élément (U3).

**DA9 — Raccourcis en fonctions pures.**
Contexte : `keyAction`, `editAction` vivent dans `keys.ts` ; `main.ts:420` distribue.
Décision : `pageKey` et `orderKey` dans `keys.ts`, appelés avant `workspace.key` ; la barre latérale traite ses touches et arrête leur propagation.
Conséquences : un test par touche, champs de saisie et IME exclus partout pareil.
Repli : changer une touche = une ligne de table.

**DA10 — Deux lots.**
Contexte : environ 13 tâches pour l'ensemble, au-delà de 4 h d'exécution.
Décision : lot 1 (mode, Pages, navigation, profil, essais) puis lot 2 (`Restack`, Calques, rangée Sélection).
Conséquences : chaque lot passe `verifier.sh --e2e` seul ; le lot 2 ne retouche ni le cœur des pages ni l'îlot.
Repli : l'orchestrateur peut tout jouer d'une traite si le temps le permet.

## 6. Scénarios d'acceptation

Joués en Playwright sur la VM (Chromium, 1280 × 900 puis 1920 × 1080 pour les captures) ; doigt par
`Input.dispatchTouchEvent` de CDP (patron de `design-l3-navigateur.mjs:271`), un ou deux points.

- **S1 — Mode de page au doigt (lot 1).** Ouvrir un `.roomboard` écrit par `roomboard new` (sans `mode`) : `#stage[data-page-mode="landscape"]`, cadre visible, pourtour gris sous le cadre. Poser une grille à carreaux. Toucher l'onglet replié Pages, puis le segment « Infini » : plus de bord, la grille couvre toute la scène. Glisser à deux doigts de 600 px vers le bas et la droite, tracer un trait à gauche et au-dessus de l'origine : il est dessiné, et la grille est peinte à ces coordonnées négatives (pixels de grille lus dans la zone) ; l'accroche y agit sur un rectangle déplacé. « Ajuster la page » : le trait est dans la vue ; la miniature montre le cadre du contenu. Ajouter une page, segment « Portrait » : ~~cadre entier visible~~ la page remplit la largeur, son bas sort de la vue, l'ascenseur est visible (OG24). Ctrl+Z : retour paysage en une étape. Enregistrer, rouvrir : page 1 infinie, trait au même endroit, page 2 paysage. CLI : `SetPageMode` portrait puis `undo` : une étape chacun, `state` montre `mode` et `height`.
- **S2 — Barre latérale Pages et profil au doigt (lot 1).** Trois pages (bouton « Ajouter » de la barre latérale, deux fois). Glisser la miniature 3 au-dessus de la 1 : ordre 3, 1, 2 (`data-page-id`) ; Ctrl+Z : 1, 2, 3. Appui long sur la miniature 2, « Dupliquer » : 4 pages, copie montrée en 3, mêmes sortes d'objets, ids neufs. « Retirer » : 3 pages. Taille « Grandes » : miniatures plus larges ; recharger : même taille. Replier, recharger : repliée. Éditeur de profils : barre latérale « À droite » et « Repliée au démarrage » décoché, « Page neuve : Infini », enregistrer : l'îlot passe à droite, ouvert ; une page ajoutée est infinie ; l'export `.rbprofile` porte `anchor: "side-end"`, `collapsed: false`, `behavior.pageMode: "infinite"`. CLI : `MovePage` et `DuplicatePage`, une étape chacun, réouverture identique.
- **S3 — Navigation dans la barre principale (lot 1).** La barre d'outils porte `page-prev`, `#pages` « 1 / 1 », `page-next` ; aucun îlot à l'ancre bas-centre. Toucher Suivante sur la dernière page : « 2 / 2 », page neuve au mode du profil ; Ctrl+Z : « 1 / 1 ». Toucher `#pages` : la barre latérale s'ouvre sur Pages. Les essais `s34`, `s5b`, `c4`, `c11b`, `design-l2`, `design-l4`, `c13-*` passent avec leurs `data-item` d'origine ; ceux qui touchent `page-add` ou `page-remove` (dans la barre latérale repliée) le font par `clickItem`, qui la déplie d'abord (décision 32). La page ajustée commence toujours sous les îlots du haut (OF83), barre latérale ouverte ou repliée.
- **S4 — Calques au doigt (lot 2).** Rectangle, ellipse qui le chevauche, texte. Onglet Calques : texte en haut, rectangle en bas, puis « Fond de la page ». Toucher la ligne du rectangle : sélectionné sur la scène (`#stage[data-selection="1"]`). Glisser sa ligne tout en haut : au chevauchement, les pixels sont ceux du rectangle ; Ctrl+Z : ceux de l'ellipse, en une étape. Deux objets groupés : une ligne « Groupe (2) », déplacée en bloc. Rangée Sélection : « Arrière-plan » le renvoie en bas. CLI : `Restack`, une étape, refus code 1 pour deux pages mêlées.
- **S5 — Au clavier (lot 1, lot 2 pour l'ordre).** `PageDown` jusqu'à la dernière page, puis encore une fois : page ajoutée ; touche tenue : une seule. `PageUp` revient. Ctrl+M ajoute après la page montrée, Ctrl+Maj+D duplique. Ctrl+Maj+P ouvre la barre latérale, focus sur la miniature montrée ; Ctrl+↓ la descend d'un rang ; Suppr la retire (aucun objet sélectionné n'est supprimé) ; Échap rend le focus à la scène. Tab jusqu'au mode, flèche droite : portrait. Dans un texte ouvert, `PageDown` et Ctrl+M ne font rien de la page. Lot 2 : Ctrl+Maj+L ouvre Calques ; sélection, Ctrl+Maj+↑ : premier plan ; Ctrl+↓ : un rang plus bas.

## 7. Hors périmètre

- Fonds de page et leur bibliothèque, répétition d'un fond sur une page Infini (OG5, personnalisation-1b).
- Outil frame (pages dans un canvas infini), plus tard.
- Masquer et verrouiller un objet (DA8).
- Écriture de la position d'un îlot dans le profil au geste (H5).
- Taille de page autre que 16:9 (A4, 4:3) : Jérôme (« Commence pas compliqué les choses »).
- Mode de page dans les exports `.iwb` et `.ubz` (H15).
- Essais en coque (Windows, macOS) et au stylet réel : fiches manuelles de Jérôme.

## 8. Portes immédiates

Aucune.

## 9. OG24 — page portrait en pleine largeur, avec ascenseur (2026-11-27)

Jérôme, 2026-11-27, mot pour mot : « En mode portrait la page doit remplir l'écran et un ascenseur permet de monté / descendre ». Il renverse H4 (et la conséquence de la décision 4). Aucune question ne lui parvenait pendant le lot : chaque choix ci-dessous est tranché seul, avec sa raison.

| # | Choix | Raison |
|---|---|---|
| P1 | « Ajuster la page » d'une page portrait = `fitWidth` (marge 0,95, haut sous les îlots du haut, OF83), comme le paysage ; `fitFor` n'a plus de branche portrait. | La demande ; un seul calcul pour les deux orientations (DA4). |
| P2 | L'ascenseur n'existe que pour une page dont `height > width` (portrait choisi), le même test que l'ajustement. Une page paysage au fond PDF A4 (cadre plus haut, décision 5) reste sans ascenseur. | Brief : « en Paysage et en Infini, rien ne change ». À rouvrir si Jérôme le veut aussi pour un PDF. |
| P3 | Bornes : au plus haut, le haut de page sous les îlots (`fitTop`) ; au plus bas, le bas de page à 16 px du bas de la vue (`SCROLL_BOTTOM`). La page tient dans la vue (zoom réduit à la main) : pas d'ascenseur. | Brief : l'ascenseur ne montre que la hauteur de la page ; 16 px = la marge du haut sans îlot. |
| P4 | Molette sans Ctrl : en portrait, défilement vertical borné, horizontal libre ; Ctrl+molette zoome comme avant. | Un document se défile à la molette ; la borne évite de perdre la page dans le pourtour. |
| P5 | Glisser à deux doigts : inchangé, libre et non borné (il porte aussi le pincement). Une vue sortie des bornes n'y est pas ramenée d'un saut : molette, touches et ascenseur ne font que l'en rapprocher (`scrollTo`). | Comportement d'avant gardé (S1 de 1a) ; aucun saut sous le doigt. |
| P6 | Touches : ↑ ↓ d'un huitième de la hauteur utile ; Maj+↑ ↓ de 90 % (PageUp et PageDown changent de page, DA9 : pris) ; Début et Fin aux bords. Sans Ctrl, Cmd ni Alt (Ctrl+↑ ↓ = ordre des objets), hors champ et hors IME ; une flèche déjà prise par un composant (segments, menu : `preventDefault`) passe ; la touche n'est prise que si la vue bouge. | Brief (Maj+flèches si PageUp/PageDown sont pris) ; pas de conflit avec les raccourcis existants. |
| P7 | Geste : toucher le curseur le saisit sans saut ; toucher le rail y amène le milieu du curseur, puis le glisser suit. Pointeur capturé ; ses événements s'arrêtent à l'ascenseur (aucun trait, aucune sélection). Appui long : aucun menu. | Tactile d'abord : un seul geste, même au doigt, au stylet et à la souris (événements de pointeur, U12, U24). |
| P8 | Dessin : aucun rail visible ; trait arrondi de 4 px (`--rf-navy-500`, 32 %) au repos, 6 px à 50 % au survol, 6 px `--rf-violet-600` pendant la saisie ; 6 px à 40 % sous un pointeur grossier. Cible de 44 px de large (`--rb-btn-s`), curseur d'au moins 44 px de haut. Aucune icône : le § 10 du cadrage design (netteté des icônes) n'est pas touché. | Discret au repos, jetons de la charte, trait fin (Jérôme : « Les trait doivent etre fin et moderne »). |
| P9 | L'ascenseur n'est pas focalisable (`role="scrollbar"`, `aria-valuenow`, `aria-controls`) : le clavier passe par la scène (P6). | Une seule voie clavier, déjà active hors champ. |
| P10 | Captures `personnalisation-1a/apres-portrait.png` gardées (lot 1a clos) ; les neuves dans `docs/design/captures/portrait-pleine-largeur/` (avant et après, haut et milieu). Essai : `scripts/essais/portrait-pleine-largeur-navigateur.mjs` (1920 × 1080 et 1280 × 800) ; S1 de 1a contrôle la pleine largeur. | Traçabilité du renversement. |
