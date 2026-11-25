# Cadrage — design L2 : îlots flottants (OF68)

Mode autonome : aucune question n'a pu parvenir à Jérôme ; chaque choix sans source est une hypothèse (§ 4). Ce cadrage
cite le cadrage design (`docs/plans/design-cadrage.md`, « DC » ci-dessous) sans le refaire : direction (DC § 4), décisions
D-DS1 à D-DS13 (DC § 5), contrôle de netteté (DC § 10). Go de Jérôme sur la direction et les recommandations de DC § 8,
2026-11-24 vers 19:55 : « c'est franchement mieux. suis cette direction » ; Q8 reste ouverte (trait 1,5 gardé).

## 1. Demande et gabarit

Remplacer la grille à bandes par des îlots blancs flottants au-dessus de la scène (barre d'outils au centre, déplaçable
et repliable ; menu, onglets, pages, annuler et vue, bibliothèque et profil), pour que `#stage` occupe toute la hauteur
de la fenêtre comme la maquette 01, sans changer le comportement ni le format `.rbprofile`.

Gabarit : **chantier** (budget 40 questions ; 35 consommées).

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| L2-1 | `dock` et îlot | `floating` = **îlot** (au-dessus de la scène, ne prend aucune case) ; `top`, `bottom`, `left`, `right` = **bande** comme aujourd'hui (case de la grille `layoutFor`). Aucun champ ni valeur de `dock` ajouté. | DC Q2 (go) ; U12 ; `toolbar.ts:16` | oui |
| L2-2 | Défaut des profils fournis | `defaut` et `annotation` : toutes les barres du tableau en `floating`. `simple` : barre d'outils `left` (bande, contenu inchangé), barre des pages `floating`. Aucune bande horizontale dans un profil fourni : `#stage` = hauteur de la fenêtre pour les trois. | DC Q2, DC § 9 L2 (preuve) ; hypothèse H1 pour `simple` | oui |
| L2-3 | Barres nouvelles | Trois rôles nouveaux dans `toolbars` des profils fournis (schéma inchangé : `parseProfile` accepte tout rôle, précédent du rôle `annotation`) : `menu` (id `menu`), `history` (id `historique`), `panels` (id `panneaux`). Constantes exportées de `toolbar.ts` à côté d'`ANNOTATION_ROLE`. | D-DS6 ; `toolbar.ts:376`, `:671` ; coffre `02_Decisions/0295` | oui |
| L2-4 | Contenu (`defaut`, `annotation`) | `outils` : Sélection, Main \| Stylo, Gomme, « Gomme : partielle » \| Rectangle, Ellipse, Ligne, Flèche, Texte, Tableau, Pot \| Annotation du bureau. `menu` : Nouveau, Ouvrir, Importer, Enregistrer, Enregistrer sous \| Insérer des pages…, Exporter en PDF…, copie .iwb, copie .ubz, Modifier dans l'application d'origine (`officeConverter`) \| Grille, Réglages. `historique` : Annuler, Rétablir, Ajuster la page. `panneaux` : Bibliothèque, Profil. `pages` : Précédente, Suivante, Ajouter, Retirer. Ids d'éléments inchangés (sélecteurs `data-item` gardés). Le premier bouton d'`outils` devient Sélection (au lieu de Stylo). `simple` : contenus inchangés (sa barre des pages garde Insérer, PDF, .iwb, .ubz : pas de menu, H1). | D-DS6 ; maquette 01 l. 222-245 ; `toolbar-profiles.ts:26-44`, `:96-110`, `:124` | oui |
| L2-5 | Où va chaque îlot | Table `ISLAND_ANCHORS` par rôle (barre `floating` seulement) : `menu` haut-gauche, `tools` haut-centre, `panels` haut-droite, `history` bas-gauche, `pages` bas-centre ; rôle inconnu : haut-droite après `panels`. Onglets et `#etat` : îlot fixe hors profil, **toujours** (profils à bandes compris), dans le groupe haut-gauche du calque, après les îlots `menu` s'il y en a, sinon au coin (16, 16) de la case de la scène (une bande du haut le repousse donc sous elle). Classe `.rb-head` gardée sur cet îlot (`c11a-annotation-navigateur.mjs:104`). `#etat` reste la région `role="status"` présente et annoncée : vide, elle n'a ni fond ni filet ni ombre, jamais `display: none`. | maquette 01 (positions) ; `App.tsx:423-435` ; relecture 1 | oui |
| L2-6 | Rendu du rôle `menu` | Un bouton Menu (icône `menu`, `data-menu-toggle`, `aria-haspopup="menu"`, `aria-expanded`) ; la liste s'ouvre sous lui : lignes de 48 px icône + libellé (D-DS1), `button[role="menuitem"][data-item]`, état et libellé par `itemState` ; outil = `setTool`, action = `runAction`, séparateur = filet, zone de dépôt non rendue. **La liste reste dans le DOM**, attribut `hidden` quand elle est fermée : les clics de jsdom (`App.test.tsx`) restent directs ; au navigateur, l'aide `clickItem` ouvre le menu. Clavier : à l'ouverture, focus sur la première ligne ; flèches haut / bas (bouclage), Début, Fin ; Entrée ou Espace active ; Échap ferme et rend le focus au bouton. Les touches que le moteur prend sans Ctrl ni Méta (Échap, Espace, Retour arrière, Suppr) ne remontent pas à `window` (`stopPropagation`, patron `table-picker.ts:110-118`) ; Ctrl/Méta remontent (Ctrl+S). Fermée aussi par un choix ou un appui hors d'elle. Même rendu en bande. | D-DS1 ; maquette 01 l. 222-236 ; `ProfileMenu.tsx:31-43` ; `main.ts:420` ; relecture 1 | oui |
| L2-7 | Position et repli : où | **Réglage de l'appareil** (`device-settings.ts`), clé `roomboard.ilot.<profil>.<barre>`, valeur JSON `{ "x", "y", "collapsed" }` (champs facultatifs ; illisible = absent). `collapsed` du profil = état de départ quand l'appareil n'a rien. Rien n'est écrit dans le profil : **format `.rbprofile` inchangé**, aucune migration. | brief ; coffre `02_Decisions/0296` (réglage d'appareil hors profil) ; `toolbar.ts:54`, `:380-386` | oui |
| L2-8 | Qui se déplace et se replie | Les barres `floating` de rôle `tools` seulement. Chrome hors profil : poignée en tête (`button[data-island-grip]`, icône `grip`), Replier en fin (`button[data-island-collapse]`, icône `collapse` ; replié : `down`). Replié : poignée et Déplier seuls ; éléments et rangée contextuelle cachés (`hidden`), `data-collapsed="1"` sur `[data-toolbar]`. | D-DS6 (« Replier ») ; maquette 01 l. 241 ; H4 | oui |
| L2-9 | Glisser | `startPointerGesture` (squelette de L3) sur la poignée : souris, stylet, doigt ; positions en px CSS entiers, bornées (îlot entier dans la case de la scène) ; Échap, `pointercancel` : retour au départ ; écrit au lâcher seulement. | brief (décision 0299) ; `pointer-gesture.ts:21` ; `docs/sessions/design-l3-etat.md:130` | oui |
| L2-10 | Clavier | Poignée focusable, « Déplacer la barre » ; flèches : 16 px, Maj + flèche : 64 px, Début : recentrer (position effacée) ; double appui sur la poignée : recentrer. Replier : bouton, `aria-expanded`. Raccourcis dans l'infobulle (D-DS12). | D-DS12 ; H5 | oui |
| L2-11 | Fenêtre redimensionnée | Position gardée, rebornée à l'affichage (observation de taille de la case), jamais réécrite par le seul redimensionnement ; îlot plus grand que la case : collé en haut à gauche (règle de `placeWithin`). | H6 | oui |
| L2-30 | Petits écrans (règle unique) | (a) **Largeur maximale** : chaque îlot flottant mesure au plus la largeur de sa voie moins 2 × 16 px et fait défiler son contenu à l'horizontale comme la bande (`overflow-x: auto`, `rb.css:99`) ; la poignée et Replier restent hors de la partie qui défile. (b) **Voies** : un îlot centré (outils en haut, pages en bas) reste sur la rangée de ses coins si la place centrée, symétrique, entre les groupes de coins (le groupe haut-gauche compté avec l'îlot des onglets à sa largeur minimale de 144 px) le contient entier ; sinon il passe dans la voie suivante, sous la rangée du haut (outils) ou au-dessus de la rangée du bas (pages), où sa voie est toute la largeur de la case. (c) **Onglets** : l'îlot des onglets prend la place laissée à gauche de l'îlot d'outils (ou jusqu'au groupe haut-droite si l'îlot d'outils est descendu ou déplacé), au moins 144 px, et défile. (d) Un îlot déplacé n'a pas de voie : il est seulement borné à la case (L2-9, L2-11). Ordres de grandeur, `defaut` taille M : îlot d'outils ≈ 790 px ; en 1280 il reste en haut si la place symétrique le contient (mesuré par S1, sinon il descend : H12) ; en 1024 il descend sous la rangée du haut ; en 768 il descend et défile (largeur 736 px). | relecture 1 (bloquant) ; `rb.css:99`, `:143` ; H12 | oui |
| L2-12 | Netteté du placement | Toute position d'îlot en px CSS entiers : centrage calculé (`Math.round`), jamais `translate(-50%)` ni colonnes `1fr` ; coins par marges entières (16 px) ; rangée contextuelle centrée sous la barre par `placeTip` (déjà arrondi et borné). Contrôlé par S1 et S5. | DC § 10 ; exigence de Jérôme (netteté) ; `rb.css:199-202` (L3) ; `tooltip.ts:101` | oui |
| L2-13 | Rangée contextuelle | Préréglages, tableau, sélection, format : dans un îlot séparé sous la barre `floating`, **à l'intérieur** de `[data-toolbar]` (`[data-toolbar="outils"] button[data-preset]` reste vrai) ; séparateur de tête masqué ; îlot vide caché. Barre en bande : rangée inchangée dans la barre. | D-DS7 ; `Toolbar.tsx:220-243` ; `App.test.tsx:665`, `:807` | oui |
| L2-14 | Mise en page | `.rb-layout` = grille des seules bandes (`layoutFor` sans rangée `tabs`) ; calque des îlots dans la case `stage`, `pointer-events: none`, îlots `auto` ; empilement : îlots 2, panneaux passagers 3. | D-DS2 ; `layout.ts:8-22` ; `rb.css:84`, `:104`, `:114` | oui |
| L2-15 | Panneaux passagers | Réglages, Grille, Image : sous la rangée du haut (88 px), à gauche ; menu Profil : à droite, sous l'îlot `panneaux` ; Bibliothèque et éditeur de profils : toute la hauteur à droite (C4 D15, L3-1). Barres du média et de la 3D : au-dessus de l'îlot des pages. Habillage d'îlot (rayon 12, filet, ombre) pour `.rb-popover`. | D-DS2 ; `rb.css:114-118`, `:177`, `:312` ; H7 | oui |
| L2-16 | Panneau des profils ouvert | La case utile des îlots se réduit à la place à gauche du panneau (largeur de la case moins `--rb-sheet-w`) et la règle L2-30 s'y applique : l'îlot d'outils (déplacé ou non) passe dans la voie sous la rangée du haut, borné à cette place, sur plusieurs rangées (L3-2) ; sa position enregistrée revient à la fermeture. Place plus étroite que 2 × 16 + 3 boutons (cas 560 px, où le panneau couvre toute la scène) : les îlots restent sous le panneau, aucun ne le recouvre ; l'aperçu en direct ne se voit alors que pour une barre en bande (H13). Largeur du panneau en variable `--rb-sheet-w` (constat `rb.css:203`). | L3-2, H10, H23 de `design-l3-cadrage.md` ; constat d'architecture du 2026-11-25 ; relecture 1 | oui |
| L2-17 | Onglets en îlot | Onglets de 48 px, montré en `--rf-violet-100` / `--rf-violet-700`, point violet pour « modifié », Fermer = icône `close` (cible 44 px), Nouvel onglet = icône `plus` ; attributs et noms accessibles inchangés (`data-tab`, `data-tab-close`, `data-tab-new`). Largeur : L2-30 (c). | maquette 01 l. 237-240 ; `TabsBar.tsx:38-78` ; H8 | oui |
| L2-18 | Pages en îlot | Boutons de la barre des pages en `IconButton` (icône de L1, libellé complet en nom accessible, `.rb-sr` et infobulle), comme la barre d'outils : `SHORT` (`PagesBar.tsx:20`, `:51`) et la règle `rb.css:50` deviennent inutiles et partent ; `textContent` d'un bouton = libellé complet. Compteur `#pages` entre Précédente et Suivante quand elles se suivent ; liste des numéros gardée (comportement), qui défile dans l'îlot borné par L2-30 (a) : l'îlot des pages ne recouvre jamais celui de l'historique, même à 30 pages. `simple` (taille L, 8 actions) : ≈ 8 × 68 + compteur + 3 numéros ≈ 860 px, tient en 1280 (case ≈ 1200 px à droite de la bande). | maquette 01 l. 245 ; D-DS1 ; `PagesBar.tsx:20`, `:33-72` ; `rb.css:143` ; relecture 1 ; H14 | oui |
| L2-19 | Annotation | Calque des îlots et îlot des onglets (`.rb-head`) cachés en annotation ; barre d'annotation en bande inchangée ; `measureBar` inchangé. | L4-2 ; C11a P20 ; `rb.css:86-90` ; `main.ts:456-463` | oui |
| L2-20 | Accès au menu Profil | `ensureProfilesAccess` : l'action Profil est atteinte si elle est dans une barre de rôle autre qu'`annotation` (aujourd'hui `tools` seulement : sinon `panneaux` ferait ajouter un second Profil à `outils`). | `toolbar.ts:472-500` | oui |
| L2-21 | Éditeur de profils | `ROLE_LABELS` : « Menu », « Annuler et vue », « Bibliothèque et profil ». Commande segmentée des barres en rangées de 3 au-delà de 3 barres (règle CSS, segments de 168 px entiers) ; sélecteurs `[data-edit="bar"] [data-choice]` inchangés. | `ProfileEditor.tsx:115`, `:165` ; L3-9 ; H9 | oui |
| L2-22 | Icônes | Ajout de `menu` (Lucide `menu`) et `collapse` (Lucide `chevron-up`), trait 1,5, calage L1 ; mention dans `THIRD_PARTY_NOTICES.md` § Lucide ; Déplier = `down` existant. Aucune dépendance. | D-DS4 ; brief ; `THIRD_PARTY_NOTICES.md:511` | oui |
| L2-23 | Hors comportement | Zoom avant / arrière et pourcentage, « Toutes les pages », « Gomme : partielle » en préréglage de la gomme : **pas dans L2** (comportement nouveau) ; écarts à la maquette listés. | contrainte du brief ; `s2-navigateur.mjs:170` (clique `eraser-mode` dans la barre) ; H3 | oui |
| L2-24 | Copies utilisateur | Une copie de `defaut` enregistrée avant L2 n'est jamais réécrite : elle garde ses bandes jusqu'à « Revenir à l'origine ». | U11 ; C1 P5 ; H2 | oui |
| L2-25 | Preuve | Essai neuf `scripts/essais/design-l2-navigateur.mjs` (S1 à S6), ajouté après `design-l3` dans le bloc `--e2e` de `scripts/verifier.sh` et dans `scripts/tests/verifier-e2e.test.sh` ; `#stage` mesuré par `boundingBox()` = `{0, 0, largeur, hauteur}` de la fenêtre à 1280 × 900 et 1920 × 1080 ; `s5b-navigateur.mjs` adapté. `--captures` : recadrages à 2x lus à 100 % et recadrages de la maquette 01 rendue (patron L1-8, L3-27). | DC § 9 (L2) ; `verifier.sh:142-146` | oui |
| L2-26 | Essais existants | Retouches de forme seulement, listées dans la PR : `[data-dock="top"]` → `floating` pour `defaut` ; clic d'un élément du menu par une aide `clickItem(page, id)` de `commun.mjs` (ouvre le menu s'il le faut) ; contrôles « la barre ne recouvre pas `#stage` » restreints aux bandes ; S2 de L3 : la cible du tri est la première ligne (Sélection au lieu de Stylo) ; S6 de L3 : îlot dans la place libre au lieu du coin, et à 560 px « aucun îlot ne recouvre le panneau » au lieu de « barres visibles hors du panneau » (L2-16). Toute autre rougeur arrête la tâche. | précédent L4-19 ; brief ; relecture 1 | oui |
| L2-27 | CLI et Wasm | Non touchés : `apps/cli/src` n'importe ni `ui/`, ni `toolbar*.ts`, ni `device-settings.ts` (vérifié) ; aucun fichier de `crates/`. Tailles Wasm inchangées à l'octet. | recherche texte (§ 3) | oui |
| L2-28 | Restes d'OF61 | Non pris : le focus après « Revenir à l'origine » (`ProfileEditor.tsx:416-420`) et la poignée de tri (`rb.css:281`) ne sont pas sur le chemin des îlots. | brief (« seulement s'ils touchent le chemin ») | oui |
| L2-29 | Découpage (≈ 2 h 50) | **Règle** : une tâche qui change un comportement met à jour, dans le même commit, tous les tests qu'elle fait rougir, même ceux d'un fichier d'une autre tâche ; deux tâches d'une même vague ne touchent jamais le même fichier, code ou test ; chaque tâche finit verte seule (`pnpm -r test`). **8 tâches, 4 vagues.** V1 : T1 modèle et profils fournis (`toolbar.ts`, `toolbar-profiles.ts` ; tests rougis : `toolbar.test.ts`, `toolbar-profiles.test.ts`, `profile-edit.test.ts`, `ui/ProfileEditor.test.tsx`, `ui/App.test.tsx`) ; T2 placement et réglage (`ui/island-place.ts` neuf, `device-settings.ts`, leurs tests) ; T3 icônes et menu (`ui/icons.ts`, `THIRD_PARTY_NOTICES.md`, `ui/MenuBar.tsx` neuf, `icons.test.ts`, `MenuBar.test.tsx`). V2 : T4 onglets et pages (`ui/TabsBar.tsx`, `ui/PagesBar.tsx`, leurs tests et tout test rougi, `App.test.tsx` compris) ; T5 îlot (`ui/Island.tsx` neuf et son test, sur T2 et T3). V3 : T6 assemblage (`ui/App.tsx`, `ui/layout.ts`, `ui/Toolbar.tsx`, `ui/rb.css`, `ui/ProfileEditor.tsx` ; tests `App.test.tsx`, `Toolbar.test.tsx`, `layout.test.ts`, `rb-css.test.ts`, `ProfileEditor.test.tsx`). V4 : T7 essais existants (`commun.mjs`, retouches de forme § 3.4, `s5b` adapté) ; T8 essai `design-l2-navigateur.mjs`, `verifier.sh`, `verifier-e2e.test.sh` (ouvre le menu lui-même, sans `clickItem`). | brief (3 h) ; relecture 1 ; profil (aucun build Tauri) | oui |

## 3. Carte d'impact

Pas de ligne « Surfaces d'impact » dans le profil : rubriques déduites du graphe et de la recherche texte.

### 3.1 Affichage (`apps/web/src`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `ui/App.tsx:364-377`, `:416-443` | oui | calques d'îlots, rôles `menu`, onglets en îlot, `#etat`, panneau des profils ouvert | V |
| `ui/layout.ts:8-22` | oui | rangée `tabs` retirée de la grille | V |
| `ui/rb.css:84-90`, `:104-114`, `:146-152`, `:177`, `:203`, `:312` | oui | îlots, annotation, onglets, panneaux passagers, `--rb-sheet-w`, barre du média | V |
| `ui/Toolbar.tsx:220-243` | oui | îlot contextuel séparé, poignée et repli pour `floating` + `tools` | V |
| `ui/TabsBar.tsx:38-78` | oui | habillage d'îlot, icônes `close` et `plus` | V |
| `ui/PagesBar.tsx:20`, `:33-72` | oui | boutons à icône, `SHORT` retiré, compteur entre Précédente et Suivante | V |
| `app/table-picker.ts:29` (`placeWithin`) | non | réutilisé pour borner un îlot | V |
| `ui/Island.tsx` (neuf) | oui | placement, poignée, repli, clavier | — |
| `ui/MenuBar.tsx` (neuf) | oui | rendu du rôle `menu` | — |
| `ui/island-place.ts` (neuf) | oui | placement pur (ancre, bornes, pas clavier) | — |
| `ui/icons.ts` | oui | `menu`, `collapse` | V |
| `ui/ProfileEditor.tsx:115` | oui | trois libellés de rôle | V |
| `ui/RadioChoices.tsx` | non | segment en rangées de 3 par CSS seulement | V |
| `ui/pointer-gesture.ts:21` | non | réutilisé tel quel | V |
| `ui/tooltip.ts:101` | non | `placeTip` réutilisé | V |
| `ui/ProfileMenu.tsx`, `ui/IconButton.tsx`, `ui/PointerSwitch.tsx` | non | réutilisés | V |
| `ui/resource-drag.ts:26` | non | dépôt refusé sous un îlot (élément du dessus hors `.rb-stages`) : comportement voulu | V |
| `app/table-picker.ts:14` | non | posé dans `.rb-stages`, au-dessus des îlots (z 4) | V |
| `main.ts:255`, `:456-463` | non | `device` déjà passé à `App` ; `measureBar` lit `annotationBarOf` | V |
| `annotate-start.ts` | non | fenêtre `annotate` sans îlots | V |

### 3.2 Modèle et persistance

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `toolbar.ts:472-500` (`ensureProfilesAccess`) | oui | L2-20 | V |
| `toolbar.ts:671` (constantes de rôle) | oui | `MENU_ROLE`, `HISTORY_ROLE`, `PANELS_ROLE` | V |
| `toolbar.ts:230`, `:380-386`, `:602` (`collapsed`, `BAR_KEYS`) | non | lu comme état de départ ; parseur et écrivain inchangés | V |
| `toolbar.ts:634` (`ACTION_REQUIRES`) | non | `edit-original` garde `officeConverter` (constat ouvert, non net ici) | V |
| `toolbar-profiles.ts:26-44`, `:96-110`, `:112-139` | oui | L2-2, L2-4 | V |
| `device-settings.ts:13-54` | oui | `island`, `setIsland` | V |
| `profile-edit.ts:149-180` (catalogue) | non | nouveaux rôles = sorte `board` | V |
| `profile-store.ts`, `profile-file.ts` | non | format inchangé | V |
| `.rbprofile` exporté | non | aucun champ ajouté (S5 le vérifie) | V |
| stockage local de l'appareil | oui | clé `roomboard.ilot.*` | S |

### 3.3 Autres dépôts, CLI, coque

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/cli/src` | non | aucun import de `ui/`, `toolbar*`, `device-settings` | V |
| `crates/*`, modules Wasm | non | aucun changement | V |
| `apps/desktop` | non | la coque sert la même page ; annotation inchangée | V |
| autres dépôts | non | — | V |

### 3.4 Tests et essais

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `toolbar-profiles.test.ts:38`, `:46-48` | oui | contenu des profils fournis | V |
| `toolbar.test.ts` | oui | accès Profil (L2-20), rôles | V |
| `profile-edit.test.ts:75-81`, `:247-261` | oui (forme) | lisent la barre `outils` de `defaut` | V (relecture 1) |
| `ui/App.test.tsx:351`, `:357-358` (inventaire `file-*`, `settings`, `grid`), `:363`, `:465`, `:797-799`, `:899` (attend `dock` `"top"`), `:993-1009`, `:1072`, `:1164`, `:1290-1297` | oui (forme, T1) | contenu et `dock` des profils fournis | V (relecture 1) |
| `ui/App.test.tsx:665`, `:807`, `:869` | non (sélecteurs gardés, L2-13) ; ajouts en T6 | îlots, menu, onglets, `#etat`, profil à bandes | V |
| `ui/ProfileEditor.test.tsx:157-158`, `:174` | oui (forme, T1) | barres et libellés de `defaut` | V (relecture 1) |
| `ui/Toolbar.test.tsx:203`, `:314` | oui (ajouts) | îlot contextuel séparé en `floating` | V |
| `ui/PagesBar.test.tsx:152-156` | oui (T4) | libellés courts remplacés par le libellé complet (icônes) | V |
| `ui/PagesBar.test.tsx:38`, `ui/TabsBar.test.tsx` | oui (ajouts) | compteur, icônes | V |
| `ui/layout.test.ts` | oui | sans rangée `tabs` | V |
| `device-settings.test.ts` | oui (ajouts) | `island` / `setIsland` | V |
| `ui/rb-css.test.ts` | oui | littéraux figés, `--rb-sheet-w` | V |
| `ui/ProfileEditor.test.tsx` | oui (ajouts) | libellés de rôle | V |
| `ui/icons.test.ts`, `pointer-gesture.test.ts`, `tooltip.test.ts` | non | à garder verts | V |
| `scripts/essais/s5b-navigateur.mjs:98-107`, `:120-127` | oui (fond, demandé) | « aucun bouton ne recouvre la scène » devient « scène = fenêtre, îlots entiers, sans chevauchement » | V |
| `scripts/essais/c7b-texte-riche-navigateur.mjs:217-221` | oui (forme) | contrôle restreint aux bandes | V |
| `scripts/essais/c1-profils-navigateur.mjs:125`, `:127`, `:187`, `:201`, `:243` | oui (forme) | `top` → `floating` | V |
| `scripts/essais/design-l1-navigateur.mjs:171` | oui (forme) | idem | V |
| `scripts/essais/design-l3-navigateur.mjs:249`, `:367`, `:372-376`, `:412`, `:507`, `:535-540` | oui (forme) | `floating`, Réglages au menu, S6 | V |
| `scripts/essais/design-l3-navigateur.mjs:133`, `:298-309` | oui (forme) | premier bouton d'`outils` = `select` (L2-4) : cible du tri à la souris et au doigt | V (relecture 1) |
| `scripts/essais/design-l3-navigateur.mjs:557` | oui (forme) | 560 px, panneau ouvert : « aucun îlot ne recouvre le panneau » (L2-16) | V (relecture 1) |
| `scripts/essais/c11a-annotation-navigateur.mjs:104` | non | `.rb-head` gardé sur l'îlot des onglets, caché en annotation : le contrôle prouve toujours quelque chose | V |
| `scripts/essais/c12-pdf-navigateur.mjs:61` | non | scène ≥ 640 px reste vrai ; l'îlot des pages borné (L2-18) | V |
| `scripts/essais/design-l4-navigateur.mjs:181-196` | oui (forme) | Réglages au menu | V |
| `scripts/essais/c4-bibliotheque-navigateur.mjs:73`, `:145` ; `c9-grille-navigateur.mjs:40` | oui (forme) | Grille au menu | V |
| `scripts/essais/c2-image-navigateur.mjs:203` ; `c12-pdf-navigateur.mjs:92` ; `c13-tableaux-navigateur.mjs:216`, `:260`, `:263` | oui (forme) | Importer, exports au menu | V |
| `scripts/essais/commun.mjs:102` | oui | aide `clickItem` | V |
| `scripts/essais/c16-office-navigateur.mjs:66` | non | compte 0 sur le web, menu ouvert ou non | V |
| `scripts/essais/s2-navigateur.mjs:170` | non | « Gomme : partielle » reste dans la barre | V |
| autres essais de `verifier.sh:110-146` | non | à garder verts ; gestes en px de scène relus (§ Effets de bord) | S |
| `scripts/essais/design-l2-navigateur.mjs` (neuf), `scripts/verifier.sh:146`, `scripts/tests/verifier-e2e.test.sh:28` | oui | L2-25 | V |
| `scripts/essais/cli-essai.mjs` | non | CLI non touchée | V |

### Effets de bord sur l'existant

- La scène gagne la hauteur des bandes (≈ 900 px au lieu de ≈ 750 en 1280 × 900) : le cadrage « ajuster la page » change ; les essais qui exigent `≥ 640 px` restent vrais. Couvert par S1 et la suite `--e2e`.
- Des îlots recouvrent la scène : un geste d'essai écrit en px de scène qui tomberait sous un îlot ne dessine plus. Relevé : `c4` (260, 140) et `c3` (170, 160) sont hors des îlots à 1280 × 900 (îlot d'outils ≈ x 245-1035, y 16-80 ; préréglages ≈ y 88-144, x ≈ 515-765). Couvert par la suite `--e2e` ; un geste touché se déplace hors des îlots (forme).
- Actions de fichier, d'export, Grille, Réglages derrière le bouton Menu : un clic de plus. Couvert par S2 et `App.test.tsx`.
- Annuler, Rétablir, Ajuster la page en bas à gauche ; Bibliothèque et Profil en haut à droite. Couvert par S1.
- Menu Profil ouvert à droite (au lieu de gauche). Couvert par `c1-profils` et `design-l3` (sélecteurs inchangés).
- Barres du média et 3D remontées au-dessus de l'îlot des pages. Couvert par `c14-media`, `c15-3d`.
- Copies utilisateur d'avant L2 : leurs barres restent des bandes, mais **les onglets et `#etat` quittent leur rangée**
  et deviennent l'îlot haut-gauche, posé sur la scène sous la bande du haut (la scène gagne la hauteur de cette rangée).
  Couvert par `App.test.tsx` (ajout T6 : profil à bandes sans `menu` → onglets en îlot au coin de la case de la scène,
  scène sous la bande).
- Barre des pages à icônes : les libellés visibles « Copie .iwb… », « Exporter en PDF… » deviennent des icônes avec
  infobulle ; `textContent` = libellé complet. Couvert par `PagesBar.test.tsx` (T4).
- Petits écrans : l'îlot d'outils descend sous la rangée du haut et défile au lieu de passer sur plusieurs rangées comme
  la bande. Couvert par S6.
- 560 px, panneau des profils ouvert : la barre flottante n'est plus visible derrière le panneau (elle l'était en bande).
  Couvert par S6 et `design-l3` S6 retouché.
- Un `.rbprofile` exporté après L2 ouvert par une version d'avant : les rôles `menu`, `history`, `panels` y sont des barres d'outils flottantes (coin haut droit) ; aucune erreur. Précédent H18 de L4. Couvert par `toolbar.test.ts` (rôle inconnu gardé).

### Chantiers en cours

Aucun sur les mêmes fichiers : `git worktree list` donne `main`, `design-l2` et `~/.cache/tmp/ctl-main-0QL5` (tête détachée à `bbbc597`, passe de référence de `verifier.sh --e2e`, lecture seule) ; `gh pr list --state open` : aucune PR ouverte.

### Termes cherchés

Graphe (`--graph ~/.cache/graphes/roomboard/graphify-out/graph.json`) : `affected "layoutFor"`, `affected "startPointerGesture"`, `affected "createDeviceSettings"`, `affected "ensureProfilesAccess"`.
Texte : `collapsed|floating` (`apps/web/src`) ; `"stage"|#stage|rb-stages` ; `data-toolbar|rb-floating|rb-slot|rb-head|data-dock|data-role` (`scripts/essais`) ; `data-preset|data-presets-sep|data-table-sep` ; `item("file-…|export-…|grid|settings|library|profiles|undo|redo|fit-page|edit-original|file-import")` ; `mouse.(move|click|down)(x, y` (gestes près des bords) ; `ROLE_LABELS|catalog` ; `zoom` (`toolbar-host.ts`, `engine.ts`) ; `ResizeObserver|clamp|placeTip|aria-haspopup|role="menu"` ; `from "…web/src…"` (`apps/cli/src`) ; `measureBar` ; `placeWithin` (`app/table-picker.ts`) ; `SHORT|Copie .iwb` ; `.rb-head` (`c11a`) ; `keydown|stopPropagation` (`main.ts`, `table-picker.ts`) ; `Lucide|ISC` (`THIRD_PARTY_NOTICES.md`) ; `eraser-mode` (`scripts/essais`) ; coffre : « roomboard îlots flottants barre déplaçable repliable », « roomboard réglage appareil profil rbprofile position », « roomboard essais navigateur piège Playwright scène ».

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant | interface appelée ou étendue | décision |
|---|---|---|---|
| glisser la barre au pointeur | `ui/pointer-gesture.ts:21` | `startPointerGesture(e, { move, finish })` | réutiliser |
| garder position et repli sur le poste | `device-settings.ts:24` | ajout à `DeviceSettings` : `island(profileId: string, barId: string): IslandState` et `setIsland(profileId: string, barId: string, s: IslandState): boolean` ; `interface IslandState { readonly at: { readonly x: number; readonly y: number } \| null; readonly collapsed: boolean \| null }` (null : rien sur l'appareil) ; `onChange` inchangé | étendre |
| centrer la rangée contextuelle sous la barre, borné, entier | `ui/tooltip.ts:101` | `placeTip(anchor, tip, view, gap)` | réutiliser |
| borner un îlot déplacé à la case | `app/table-picker.ts:29` | `placeWithin(at, size, box)` (même règle : décalé vers le haut ou la gauche, collé en haut à gauche si trop grand) | réutiliser (appelé par `placeIsland`) |
| placer un îlot (ancre, voies, largeur max., pas clavier) | aucun (cherché : `clamp`, `ResizeObserver`, `Math.round`, `placeTip`, `placeWithin`) ; `placeWithin` ne connaît ni ancre, ni voie, ni arrondi | nouveau module `ui/island-place.ts` : `type Anchor = "top-start" \| "top-center" \| "top-end" \| "bottom-start" \| "bottom-center"` ; `anchorOf(role: string): Anchor` ; `laneOf(anchor, size, area, corners: { start: number; end: number }): { x: number; y: number; maxWidth: number }` (L2-30, entiers) ; `placeIsland(anchor, size, area, at: Point \| null, corners): Point` (déplacé : `placeWithin` puis `Math.round`) ; `nudge(at: Point, key: string, big: boolean): Point \| null` | nouveau module (DA-L2-2) |
| poignée, Replier, bouton Menu | `ui/IconButton.tsx` | `IconButton`, `Icon` | réutiliser |
| icônes `menu`, `collapse` | `ui/icons.ts` | table `ICONS` | étendre |
| état et icône d'un élément du menu | `ui/item-state.ts`, `Toolbar.tsx` (`iconFor`) | `itemState(item, view)`, `iconFor(item, icon)` | réutiliser |
| éléments montrés d'une barre | `toolbar.ts:624`, `:686` | `visibleItems`, `itemsForMode` | réutiliser |
| rôles des nouvelles barres | `toolbar.ts:671` | `export const MENU_ROLE = "menu"`, `HISTORY_ROLE = "history"`, `PANELS_ROLE = "panels"` | étendre |
| accès Profil garanti | `toolbar.ts:472` | `ensureProfilesAccess` (règle de rôle) | étendre |
| lignes du menu (48 px, icône + texte) | `rb.css:178-186` (`[data-profiles] button`) | sélecteur commun `:is([data-profiles], [data-menu-list]) button` | étendre |
| grille des bandes | `ui/layout.ts:8` | `layoutFor(bars)` sans rangée `tabs` | étendre |
| rendu d'une barre par rôle | `App.tsx:398-414` (`BY_ROLE`) | entrée `menu` ajoutée | étendre |
| barre montrée en annotation | `toolbar.ts:675` | `annotationBarOf` | réutiliser |
| largeur du panneau des profils | `rb.css:203` | variable `--rb-sheet-w: 600px` | étendre |
| bouton d'essai d'un élément | `scripts/essais/commun.mjs:102` | `clickItem(page, id): Promise<void>` | étendre |
| mesure de netteté | `scripts/essais/nettete.mjs` | `pixelsOf`, `edgeRow`, `fringes`, `hex` | réutiliser |

## 4. Hypothèses à revoir

Niveau 1 — difficiles à défaire ou visibles des utilisateurs :

- H1 — Profil « Simple » : barre d'outils gardée en bande à gauche (grands boutons), pages en îlot avec ses actions
  d'insertion et d'export (pas de menu ; boutons à icône, ≈ 860 px en taille L, tient en 1280).
- H10 — Position et repli sur l'appareil, par profil et par barre (`roomboard.ilot.<profil>.<barre>`), **contre U12**
  (`usage-cadrage.md:65` : « `floating` + position et taille » dans le profil) et `design-cadrage.md:79` (« position et
  taille dans le profil »). Raison : format `.rbprofile` inchangé (préférence du brief), un profil fourni figé ne se
  copie pas en silence à chaque glisser, une position dépend de l'écran du poste. Réversible : ajouter plus tard un champ
  au profil, lu sans perte.
- H12 — Seuil de L2-30 : l'îlot d'outils reste en haut si la place symétrique laisse 144 px aux onglets ; en 1280 × 900
  le résultat dépend de la largeur réelle mesurée (≈ 790 px) ; s'il descend, le geste de `c4` (260, 140) est relu.
- H13 — À 560 px, panneau des profils ouvert : les îlots restent sous le panneau, aucun aperçu en direct d'une barre
  flottante.
- H2 — Les copies de `defaut` enregistrées avant L2 (postes de Jérôme compris) gardent leurs bandes jusqu'à « Revenir à l'origine » : la nouvelle mise en page ne se voit pas d'elle-même sur un poste qui a modifié le profil par défaut.
- H3 — Écarts assumés à la maquette 01 : pas de zoom avant / arrière ni de pourcentage, pas de « Toutes les pages », « Gomme : partielle » reste un bouton de la barre, liste des numéros de page gardée.
- H4 — Seule la barre d'outils (`floating` + `tools`) se déplace et se replie ; menu, onglets, pages, historique et panneaux sont fixes.
- H7 — Réglages, Grille et Image s'ouvrent sous la rangée du haut ; le menu Profil s'ouvre à droite.
- H9 — Éditeur de profils : six barres pour `defaut` (outils, pages, annotation, menu, historique, panneaux), commande segmentée sur deux rangées.

Niveau 2 :

- H5 — Pas clavier de 16 px (64 avec Maj), Début et double appui recentrent.
- H6 — Position rebornée au redimensionnement sans être réécrite.
- H8 — Largeur minimale de l'îlot des onglets : 144 px (un onglet « Sans titre » et sa croix), défilement au-delà.
- H11 — Rôle inconnu en `floating` : en haut à droite après `panneaux`.
- H14 — Barre des pages à icônes (L2-18), y compris en bande.

## 5. Décisions d'architecture

**DA-L2-1 — Les îlots sont des barres du profil distinguées par leur rôle.** Contexte : D-DS6 répartit les commandes en
cinq îlots ; le format ne doit pas changer. Décision : trois rôles nouveaux (`menu`, `history`, `panels`), une table
d'ancres par rôle, `dock: "floating"` pour l'îlot. Conséquences : tout reste personnalisable dans l'éditeur ; aucun champ
ajouté ; une version d'avant L2 montre ces barres comme des barres d'outils flottantes (précédent H18 de L4).

**DA-L2-2 — Placement pur à part, rendu dans `Island.tsx`.** Contexte : centrage entier, bornes, pas clavier, panneau ouvert ;
rien d'existant ne place une boîte dans une zone avec une position enregistrée. Décision : `ui/island-place.ts` sans DOM
(interface § 3) ; `Island.tsx` observe la taille, appelle `placeIsland`, branche `startPointerGesture` et le clavier.
Conséquences : la règle de netteté se teste en Vitest ; le composant reste mince.

**DA-L2-3 — Position et repli sur l'appareil.** Contexte : déplacer une barre n'est pas modifier un profil (un profil fourni
est figé, une copie silencieuse serait surprenante). Décision : `device-settings.ts` porte `island` / `setIsland` ; le champ
`collapsed` du profil n'est que l'état de départ. Conséquences : `.rbprofile` inchangé, aucune migration ; la position ne
voyage pas avec un profil exporté. Écart assumé à U12 et à `design-cadrage.md:79` (H10, niveau 1).

## 6. Scénarios d'acceptation

Joués par `scripts/essais/design-l2-navigateur.mjs` (Chromium de Playwright, `?fichiers=repli`, `--disable-lcd-text`,
`--force-color-profile=srgb`).

- **S1 — Tableau en îlots, scène pleine hauteur.** Ouvrir la page en 1280 × 900 puis 1920 × 1080, profil par défaut :
  `#stage` mesure exactement la fenêtre (x 0, y 0, largeur et hauteur de la fenêtre) ; les îlots menu, onglets, outils,
  préréglages du stylo, panneaux, historique et pages sont visibles, entiers dans la fenêtre, sans chevauchement entre
  eux, à des positions entières ; tracer un trait au centre de la page : l'encre est là. Profil « Simple » : bande à
  gauche, `#stage` garde la hauteur de la fenêtre.
- **S2 — Menu.** Ouvrir le menu : les lignes Nouveau… Réglages ont icône et libellé ; « Grille » ouvre le panneau de la
  grille sous la rangée du haut ; rouvrir le menu, Échap : liste fermée, focus sur le bouton Menu ; « Enregistrer » par le
  menu télécharge un `.roomboard` ; au clavier (Tab, Entrée), « Exporter en PDF… » télécharge un PDF.
- **S3 — Déplacer, replier, retrouver.** Glisser la poignée à la souris de 300 px vers le bas : l'îlot suit, la rangée des
  préréglages reste dessous ; recharger : même position. Replier : poignée et Déplier seuls ; recharger : toujours replié ;
  Déplier. Au doigt (événements tactiles) : même glisser. Clavier sur la poignée : flèche droite = +16 px, Début =
  recentré. Fenêtre ramenée à 1024 × 768 : l'îlot reste entier dans la fenêtre. Profil Simple puis retour au défaut :
  la position du défaut revient. Échap pendant un glisser : retour au départ.
- **S4 — Bande par le profil et annotation.** Éditeur de profils : barre d'outils « En haut » → bande, `#stage`
  commence sous elle ; « Flottante » → îlot, `#stage` reprend la hauteur de la fenêtre ; panneau ouvert, l'îlot reste hors
  du panneau. Avec `?annotation=faux`, entrer en annotation : seule la bande d'annotation est visible, aucun îlot ;
  sortir : les îlots reviennent.
- **S5 — Netteté, maquette, format.** 1920 × 1080 à 2x : contrôle de DC § 10 sur le Rectangle de l'îlot d'outils (0 pixel
  intermédiaire au bord, contre-épreuve) et sur le texte de l'onglet montré (0 frange) ; avec `--captures`, recadrages de
  chaque îlot comparés à `docs/design/maquettes/01-tableau.png`, écarts listés un par un dans la PR. Exporter le profil
  par défaut après un déplacement et un repli : le `.rbprofile` ne contient ni position ni `collapsed: true`, et se
  réimporte identique.
- **S6 — Petits écrans et beaucoup de pages.** 1024 × 768 : l'îlot d'outils est sous la rangée du haut, entier, l'îlot
  des onglets garde au moins 144 px. 768 × 700 : l'îlot d'outils mesure 736 px, son contenu défile, poignée et Replier
  visibles, il ne recouvre ni le menu ni les onglets ; Rectangle atteint après défilement et choisi. 560 × 700, panneau
  des profils ouvert : aucun îlot ne recouvre le panneau ; fermé : les îlots reviennent. 1280 × 900, 30 pages (Ajouter
  une page 29 fois) : l'îlot des pages reste entier dans la fenêtre, ne recouvre pas l'îlot de l'historique, sa liste de
  numéros défile, `#pages` = « 30 / 30 ».

## 7. Hors périmètre

- Icône de l'application (L5), thème sombre (Q7), police Inter (Q6), mesure à 150 % (Q8, trait 1,5 gardé).
- Zoom avant / arrière et pourcentage, « Toutes les pages », « Gomme : partielle » en préréglage de la gomme (H3).
- Déplacement des autres îlots ; position et taille d'une barre flottante dans le profil (HC2-2).
- Restes d'OF61 (L2-28).
- Constats ouverts non nets : `toolbar.ts:634` (`ACTION_REQUIRES`), `ui/PointerSwitch.tsx:14`, littéraux 48 px de
  `rb.css` (seule la largeur 600 px passe en variable, L2-16).

## 8. Portes immédiates

—
