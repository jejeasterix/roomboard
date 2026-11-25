# Cadrage — design-l3 (lot L3 du design : éditeur de profils en panneau latéral)

Source maîtresse : `docs/plans/design-cadrage.md` (OF41), citée et jamais refaite : § 5 (D-DS10, avec D-DS1, D-DS3,
D-DS8), § 6, § 9 (lot L3), § 10 (netteté). Lots livrés : L1 (PR 54, `design-l1-cadrage.md`, coffre 0290, 0291, 0294),
L4 (PR 55, `design-l4-cadrage.md`, coffre 0295). Profils : `usage-cadrage.md` U11-U14 et scénario S1 (l. 414-417),
`usage-c1-profils-cadrage.md` (P2, P6, P12-P17, P20, P22-P24, P28, P33). Maquette : `docs/design/maquettes/03-profils.html`
et `.png`. Cadrage autonome : aucune question n'a pu parvenir à Jérôme ; ce qui n'a pas de source est une hypothèse (§ 4).

## 1. Demande et gabarit

Faire de l'éditeur de profils (`ProfileEditor.tsx`, `ProfileMenu.tsx`) le panneau latéral de 600 px de D-DS10, sans
voile, la barre derrière montrant le réglage en direct : démarrage en deux cartes, emplacement en cinq vignettes, taille
en commande segmentée, outils en liste triable au pointeur avec œil, barre d'annotation éditable, Importer / Exporter à
côté du profil, « Revenir à l'origine » en pied ; aux jetons, icônes et tailles de L1 ; format `.rbprofile` inchangé ;
fusion avec `scripts/verifier.sh --e2e : OK`.

Gabarit : **chantier** (40 questions au plus ; 32 consommées, § 2). Contre-relecture tour 1 : 5 majeurs, 6 mineurs, tous pris. Go de Jérôme (2026-11-24 vers 19:55, sur les
maquettes), mot pour mot : « c'est franchement mieux. suis cette direction ». Q8 (écrans à 150 %) reste ouverte, trait
1,5 gardé. Exigence : « Je serai particulierement intransigent sur la neteté des logos, icons, images etc... Les trait
doivent etre fin et moderne ».

## 2. Décisions

| # | Point | Décision | Source | Réversible ? |
|---|---|---|---|---|
| L3-1 | Où vit le panneau | `div.rb-popover[data-panel="profils"]` dans la case de la scène (`grid-area: stage`), calé à droite, toute la hauteur de la case, largeur `min(600px, 100%)`, sans voile ni fond assombri. Dedans : `aside.rb-sheet[data-profile-editor][role="dialog"][aria-label="Profils"]`, colonne flex : en-tête 80 px, corps qui défile, pied 80 px. Ombre `--rf-shadow-modal` et filet `--rf-gray-300` (charte, « panneau des profils »). Patron du panneau Bibliothèque (`rb.css:113-114`). | D-DS10 ; maquette 03 l. 72-75, 112 ; `charte.md` § Ombres | oui |
| L3-2 | Barre à droite (S1) | Rien ne recouvre une barre ancrée : chaque barre garde sa case de la grille (`layout.ts:8-22`), le panneau ne prend que la droite de la scène. Barre `right` : elle reste au bord droit de la fenêtre, le panneau se pose **contre elle, à sa gauche** ; on ne décale ni la barre ni le panneau. Barre `top`/`bottom` : au-dessus/au-dessous du panneau, entière. Barre `floating` (coin haut droit de la scène, `rb.css:104`, une seule rangée sans retour à la ligne, `rb.css:37`, `:41`, environ 1 300 px pour `defaut`) : tant que le panneau est ouvert, posée en haut à gauche de la scène, `max-inline-size: calc(100% - min(600px, 100%))` et ses barres en `flex-wrap: wrap` (`.rb-layout[data-panneau="profils"] .rb-floating { justify-self: start; max-inline-size: … }`, `… .rb-floating .rb-bar { flex-wrap: wrap }`) : elle passe sur plusieurs rangées dans la place libre. | D-DS10 (« la barre derrière montre le réglage en direct ») ; usage S1 (barre à droite) ; `rb.css:104`, `:110` | oui |
| L3-3 | Aperçu en direct | Le brouillon reste (P20 : Enregistrer écrit, Fermer abandonne), mais la page le **montre** : `ProfileEditor` gagne `preview(draft)`, appelé à chaque geste, et `endPreview()`, appelé au démontage par `onCleanup` (patron `GridPanel.tsx:33-35`, `:47`). `App` tient `previewProfile` ; `shown = () => previewProfile() ?? active.profile()` remplace `profile()` partout où il est lu (`App.tsx:341-375` : barres, taille, préréglages, grille de mise en page ; `:294` : hôte local, pour qu'un préréglage du brouillon marche dans la barre montrée). Fermer, ouvrir un autre panneau, entrer en annotation (`App.tsx:315-326`) : `endPreview`, la barre d'avant revient (après la confirmation de L3-32 si le brouillon diffère). | D-DS10 (2026-11-24) contre C1 P20 « sans aperçu en direct » (2026-11-20) : même rang, la plus récente gagne, **à revoir** (H1) ; `GridPanel.tsx` | oui |
| L3-4 | Profil actif changé, éditeur ouvert | L'éditeur est monté par `<Show when={panel() === "editor" ? active.profile() : null} keyed>` : choisir un autre profil, importer, revenir à l'origine remonte l'éditeur sur un brouillon neuf ; choisir un autre profil et importer passent d'abord par la confirmation de L3-32. Après un remontage dû au sélecteur, le focus revient sur `select[data-edit="profile"]` (repéré par `refocus`, `ProfileEditor.tsx:238-241`, au montage). | P20 ; `active-profile.ts:23-26` ; contre-relecture (focus perdu au remontage) | oui |
| L3-5 | Ordre du panneau | En-tête « Profils » (20 px, 600) + Fermer (`data-edit="close"`, icône `close`). Corps : **Profil actif** (sélecteur, Importer, Exporter, puis champ « Nom du profil » `data-edit="label"`) ; **Au démarrage** ; **Taille des boutons** ; **Barres** (choix de la barre, emplacement, outils, « Rétablir les barres ») ; **Préréglages** ; **Enregistrer comme nouveau**. Pied : « Revenir à l'origine » à gauche ; état et « Enregistrer » à droite. Les `data-edit-section` deviennent `profile`, `general` (démarrage, taille), `bars`, `presets`, `new`. | maquette 03 l. 298-324 ; P20, P28 | oui |
| L3-6 | Sélecteur de profil | `select[data-edit="profile"]` natif dans une boîte de 56 px (icône `profile`, chevron `down`, étiquette à droite : « Fourni », « Fourni, modifié » ou « Personnel », tirée de `canRemove` / `canResetCurrent`) ; choisir = `actions.choose(id)`. Importer (`data-edit="import"`, icône `import`, « Importer un profil (.rbprofile) ») et Exporter (`data-edit="export"`, icône `export`, « Exporter ce profil (.rbprofile) ») en `IconButton` (infobulle L1). | maquette 03 l. 301-303 ; D-DS10 ; `profile-actions.ts:64-69`, `:118-126` | oui |
| L3-7 | Démarrage | Deux cartes radio (`[data-edit="start-mode"] [data-choice="board"\|"desktop-annotation"]`) : « Tableau » (icône `board`, « RoomBoard s'ouvre sur le tableau. »), « Annotation du bureau » (icône `annotate`, « La barre seule, sur le bureau. ») ; carte choisie : filet et contour `--rf-violet-600`, fond `--rf-violet-100`, titre et icône `--rf-violet-700`, pastille ronde 32 px `--rf-violet-600` avec `check` blanc. Note toujours visible sous les cartes : « Sans annotation possible (web, iPad, Wayland) : tableau. » (14 px, `--rf-text-muted-aa`). Comportement de `startMode` inchangé (P10). | D-DS10 ; maquette 03 l. 305-311, 83-90 ; U14 ; P10 | oui |
| L3-8 | Taille S/M/L | Commande segmentée `[data-edit="button-size"] [data-choice="s"\|"m"\|"l"]`, libellés « Petits · 44 », « Moyens · 48 », « Grands · 64 » ; segment choisi : fond blanc, filet, `--rf-shadow-card`, texte `--rf-violet-700` 600. Le profil garde le jeton `interface.buttonSize` `s\|m\|l` (U11, P12) ; seules les valeurs en px de L1 sont affichées : table `BUTTON_PX = { s: 44, m: 48, l: 64 }` liée par un test à `rb.css:27-29`. La taille est globale au profil : section à part, pas sous les vignettes d'une barre. | D-DS3 ; D-DS10 ; maquette 03 l. 96-98, 318 ; P12 ; `rb.css:27-29` | oui |
| L3-9 | Quelle barre on édite | Commande segmentée `[data-edit="bar"] [data-choice=<id de barre>]`, une entrée par barre dans l'ordre de `toolbars`, libellé `ROLE_LABELS` (« Barre d'outils », « Barre des pages », « Barre d'annotation » ; rôle inconnu ou deux barres de même rôle : « Barre <id> »). Un seul bloc montré, `[data-edit-bar=<id>]` (attribut gardé), titre = libellé du rôle. À l'ouverture : la première barre `tools`, sinon la première. Bloc de la barre montrée en annotation (`annotationBarOf`) : note fixe « Montrée seulement en annotation du bureau : réglage visible à l'entrée suivante. » et, sous la vignette « Flottante », « En annotation : en haut » (`annotationBarOf` la pose en haut, `toolbar.ts:675-679` ; la barre `annotation` n'est jamais rendue au tableau, `App.tsx:344`, donc sans aperçu en direct). | maquette 03 (un seul bloc « Barre d'outils ») ; L4-18 (barre d'annotation éditable comme les autres) ; `ProfileEditor.tsx:62`, `:77` | oui |
| L3-10 | Emplacement | Cinq vignettes radio 80 px de haut `[data-edit="dock"] [data-choice=<dock>]` : « En haut » `dock-top`, « En bas » `dock-bottom`, « À gauche » `dock-left`, « À droite » `dock-right`, « Flottante » `dock-float` (libellés `DOCK_LABELS`, `ProfileEditor.tsx:59`) ; choisie : contour violet, fond `--rf-violet-100`, texte 600 `--rf-violet-700`. | D-DS10 ; maquette 03 l. 91-95, 313-317 ; P13 | oui |
| L3-11 | Liste des outils | Une ligne de 48 px par élément de la barre, **dans l'ordre exact de la barre** (groupes mis bout à bout ; un séparateur est une ligne fine « Séparateur », car il est dans la barre) : poignée (`button[data-edit="grip"]`, icône `grip` `--rf-gray-500`), icône `iconFor(item)` (`icons.ts:148`), libellé 16 px, bouton œil `button[data-edit="shown"]` (`aria-pressed` = montré ; icône `check` montré, `hidden` masqué ; nom « Masquer X » / « Afficher X » ; grisé pour l'accès au menu Profil et un élément inconnu, `canHide`). Ligne masquée : texte `--rf-text-muted-aa`, icônes `--rf-gray-500`, fond `--rf-gray-100`. Élément inconnu : `data-unknown`, « X — inconnu (version plus récente) », déplaçable (P16). `li[data-edit-item=<id>]` gardé. | D-DS10 ; maquette 03 l. 100-108, 321 ; P2, P16, P33 ; `profile-edit.ts:71` | oui |
| L3-12 | Dessin / Souris en une ligne | L'élément `annotation-pointer` est déjà un seul élément de profil. Sa ligne prend libellé et icône **dérivés** de `POINTER_SEGMENTS` (`PointerSwitch.tsx:14-17`) : `PointerSwitch.tsx` exporte `POINTER_SUMMARY = { label: POINTER_SEGMENTS.map((s) => s.label).join(" / "), icon: POINTER_SEGMENTS[0].icon }` (« Dessin / Souris », `pen-line`) ; l'éditeur l'atteint par une table de **renvois** `ROW_SUMMARY: Partial<Record<ActionId, { label; icon }>> = { "annotation-pointer": POINTER_SUMMARY }` (aucun libellé ni icône recopié, jamais un test sur l'id). Icône `pen-line` et non `pen` de la maquette : même icône que le segment « Dessin » de la barre (§ 6 du cadrage design, « même icône partout » ; L1-3 distingue `pen-line` de l'outil Stylo) ; écart listé (§ 6 ter). | D-DS10 ; maquette 03 l. 321 ; L4-8 ; constat `architecture-constats.md:52` (ne pas ajouter de troisième table) | oui |
| L3-13 | Tri au pointeur | Module neuf `ui/sort-drag.ts` sur un squelette de geste extrait de `resource-drag.ts` (DA-L3-1) : Pointer Events seuls (souris, stylet, doigt), capture du pointeur sur la poignée, seuil `DRAG_THRESHOLD_PX` (`resource-drag.ts:11`), poignée en `touch-action: none` (le doigt trie depuis la poignée, la liste défile ailleurs) ; la ligne tirée suit le pointeur (`translateY`, fond blanc, `--rf-shadow-hover`, maquette `.item.drag`), les autres s'écartent ; défilement du corps du panneau à 48 px de ses bords ; lâcher = **un seul** `moveItemTo` (la barre change alors, en direct) ; Échap, `pointercancel`, capture perdue : rien. Aucun `draggable`, aucun événement `drag*`. | U12 (« jamais au glisser HTML5 ») ; U24 ; coffre 0263 (glisser par Pointer Events) ; `resource-drag.ts:1-86` | oui |
| L3-14 | Règle du lâcher | `moveItemTo(p, barId, itemId, to)` pur dans `profile-edit.ts` : `to` = rang dans la liste aplatie **sans** l'élément ; l'élément rejoint le groupe de celui qui le précède à ce rang (rang 0 : tête du premier groupe) ; un groupe vidé reste (comme `moveItem`, `profile-edit.ts:98`). Rang = nombre de milieux de lignes au-dessus du pointeur (`slotOf`, pur). | P14 (ordre par élément, groupes traversés) ; `profile-edit.ts:83-104` | oui |
| L3-15 | Clic, clavier, lecteur d'écran | Trois chemins sans glisser (P14 « clic, clavier » ; WCAG 2.2 § 2.5.7). (a) **Clic** : un toucher ou un clic de la poignée sans glisser (sous le seuil) fait paraître, pour cette ligne seulement, « Monter » et « Descendre » (`button[data-edit="up"\|"down"]`, noms « Monter X » / « Descendre X », gardés de C1) ; un autre toucher de poignée les déplace sur l'autre ligne ; la ligne dévoilée est un signal de l'éditeur gardé par id (elle reste dévoilée après un déplacement) ; le `click` qui suit un vrai glisser est ignoré. (b) **Clavier** : la poignée est un bouton focalisable (« Déplacer X », `aria-describedby` : « Flèches haut et bas pour déplacer ; Entrée pour Monter et Descendre ») ; Flèche haut / bas = `moveItem(±1)` (P14 inchangé), focus gardé sur la poignée (mécanisme `refocus`, `ProfileEditor.tsx:56-57`, `:238-241`) ; Entrée ou Espace = clic (a). (c) **Annonce** : après tout déplacement (bouton, flèche, lâcher), une zone `aria-live="polite"` du panneau dit « X : rang N sur M ». | P14 ; WCAG 2.2 § 2.5.7 ; maquette 03 l. 321 (boutons absents au repos) ; contre-relecture tour 1 | oui |
| L3-16 | Ajouter | « + Ajouter » (`button[data-edit="add"]`, texte `--rf-violet-700`, à droite du titre « Outils de la barre ») ouvre sous le titre la liste du catalogue de la barre, icône + libellé, `button[data-add-choice="tool:rect"\|"action:page-next"]` ; un clic ajoute en fin de barre (`addItem`, P15) et referme ; Échap referme. | maquette 03 l. 111, 320 ; P15 ; D-DS1 (icône et texte dans l'éditeur) | oui |
| L3-17 | Catalogue selon le rôle | Ferme le constat ouvert `toolbar-profiles.ts:112` (« le catalogue devrait suivre le rôle de la barre (lot L3) ») : table `CATALOG_ACTIONS` par rôle dans `profile-edit.ts`. La règle suit **la barre montrée en annotation**, pas le seul `bar.role` : si `annotationBarOf(p)?.id === barId` (barre `annotation`, ou, pour un profil sans elle, la première barre `tools`, `toolbar.ts:675-679`, profil figé `fixtures/profils/defaut-avant-l4.rbprofile`), le catalogue garde toutes les actions d'annotation (`ANNOTATION_MAIN_ACTIONS` ∪ `ANNOTATION_REMOTE_ACTIONS`, `toolbar.ts:653`, `:660`) ; pour une barre de rôle `annotation`, il ne propose que les outils et ces actions (les seules qui agissent en annotation). Toute autre barre (`tools` qui n'est pas montrée en annotation, `pages`, rôle inconnu) : actions sans `annotation-pointer`, `annotation-screen` ni `ANNOTATION_ONLY_ACTIONS` (`toolbar.ts:658`) ; `desktop-annotation` (l'entrée) reste ; `pages` sans outils (P15). Actions du tableau toujours exclues (C10a). | `docs/architecture-constats.md` (design-l4, 2026-11-25) ; `toolbar.ts:653-660` ; `itemsForMode` (`toolbar.ts:686`) ; `annotationBarOf` (`toolbar.ts:675`) ; contre-relecture tour 1 | oui |
| L3-18 | Préréglages | Section gardée (P17 : stylo, pot), restylée : ligne = pastille de couleur (`input[type=color]` rond 32 px), nom, épaisseur (stylo), retirer (`IconButton` `trash`) ; « + Ajouter une couleur » ; « Rétablir les préréglages » en bouton fantôme. `data-edit-preset`, `data-edit="preset-*"` gardés. | P17 ; U12 (deux remises) ; D-DS1 | oui |
| L3-19 | « Revenir à l'origine » (pied) | Bouton fantôme `button[data-edit="revert"]` (icône `reset`). Si `actions.canResetCurrent()` : `actions.resetCurrent()` (copie d'un livré retirée, profil de l'utilisateur ramené à son origine, P6 remise n° 1), l'éditeur remonte (L3-4). Sinon, brouillon modifié : le brouillon revient au profil enregistré. Grisé si aucun des deux. Sans confirmation, comme la même commande du menu. « Rétablir les barres » (U12) reste dans le bloc Barres. | D-DS10 ; U11 (« Revenir à l'origine » la retire) ; usage S1 (« Revenir à l'origine » rend `defaut`) ; P6 ; `profile-actions.ts:118-131` | oui |
| L3-20 | Enregistrer | Pied, à droite : « Enregistrer » (`data-edit="save"`, bouton plein `--rf-violet-600`, grisé si le nom est vide) ; à sa gauche, quand le brouillon égale le profil enregistré (`sameProfile(a, b)` de `profile-edit.ts` : `serializeProfile` des deux comparés, partagé avec L3-32), « Enregistré sur cet appareil » (icône `check` `--rf-success`, 14 px). Enregistrer écrit et ferme, comme aujourd'hui (`App.tsx:492-494`). Pas d'enregistrement automatique. « Enregistrer comme nouveau » (P28) : dernière section du corps, champ `data-edit="new-name"` et bouton `data-edit="save-new"`. | brief (« comportement inchangé hors de l'aspect ») ; P20, P28 ; maquette 03 l. 114-115, 324 | oui |
| L3-21 | Importer, Exporter | Importer = `actions.importFile()` (P24 inchangé : `planImport`, confirmation, refus de majeure) ; le profil importé devient actif, l'éditeur remonte dessus. Exporter = **le brouillon**, ce que montrent la barre et le panneau : `ProfileActions.exportProfile(p: Profile)` ; `exportActive()` devient `exportProfile(active.profile())` (menu inchangé). Exporter est **grisé dans le même cas qu'Enregistrer** (nom vide) : `parseProfile` refuse un libellé vide (`toolbar.ts:291-293`), le fichier serait illisible à l'import. `profileToFile` et `serializeProfile` inchangés : format identique. | D-DS10 ; P23, P24 ; `profile-actions.ts:107-117` ; `toolbar.ts:291-293` | oui |
| L3-22 | Menu Profil | Gardé (bouton `profiles` de la barre, `menuitemradio[data-profile]`, `[data-profile-cmd]` : cinq essais et `App.test.tsx` l'emploient) ; restylé en îlot (rayon `--rf-radius-xl`, filet, `--rf-shadow-modal`), lignes de 48 px **icône + texte** (D-DS1) : profil actif marqué `check` ; « Modifier… » `profile`, « Importer… » `import`, « Exporter… » `export`, « Remettre à zéro ce profil » et « Tout remettre à zéro » `reset`, « Supprimer » `trash` (icônes de la table, L3-25 compris). | D-DS1 ; P22 ; CL5b-9 ; `s5b-navigateur.mjs:77`, `c11a…:69`, `c11b…:292`, `design-l1…:162`, `design-l4…:94` | oui |
| L3-23 | Composant radio commun | Module neuf `ui/RadioChoices.tsx` (DA-L3-2) pour les cartes de démarrage, les vignettes d'emplacement, la taille et le choix de barre : `role="radiogroup"`, boutons `role="radio"` `aria-checked`, flèches gauche / droite / haut / bas (focus et choix itinérants), un seul arrêt de tabulation ; trois aspects (`card`, `tile`, `segment`). | D-DS10 ; maquette 03 l. 82-98 ; aucun radiogroupe existant (§ 3, termes cherchés) | oui |
| L3-24 | Styles | Classes neuves sous `.rb-sheet` ; `.rb-editor` (`rb.css:175-184`) **inchangée** : `GridPanel.tsx:57` et `ImagePanel.tsx:84` l'emploient. Jetons `--rf-*` de la charte seulement, tailles de texte de la charte (20 titre, 16 corps et listes, 15 segments, 14 notes et étiquettes), cibles ≥ 48 px, rayons LG 8 / XL 12, espacements 24 et 32 du panneau. Aucune couleur hors charte. | D-DS2, D-DS5 ; `charte.md` ; L1-6 | oui |
| L3-25 | Icônes neuves | Dix tracés recopiés tels quels des `<symbol>` de `03-profils.html` (Lucide `7981a0798a`, ISC), noms RoomBoard → Lucide : `close` (`x`), `grip` (`grip-vertical`), `hidden` (`eye-off`), `dock-top` (`panel-top`), `dock-bottom` (`panel-bottom`), `dock-left` (`panel-left`), `dock-right` (`panel-right`), `dock-float` (`app-window`), `import` (`upload`), `down` (`chevron-down`). Aucune icône dessinée. Ajoutées à `ICONS` et à la liste de `THIRD_PARTY_NOTICES.md:511-525`. Visible = `check`, masqué = `hidden`, comme la maquette. | D-DS4 ; L1-1, L1-2, L1-10 ; maquette 03 l. 209-262 | oui |
| L3-26 | Sélecteurs des essais et tests | Les `data-item` des barres ne changent pas (l'éditeur n'en porte aucun). Les noms `data-edit*`, `data-profile-editor`, `data-profile*` restent ; leur **forme** change (liste déroulante → radio `[data-choice]`, case → bouton `aria-pressed`, Monter / Descendre → poignée au clavier) : retouches de forme listées au § 3.2. Monter / Descendre restent (L3-15) : leurs tests gagnent au plus un clic sur la poignée. **Rougeurs attendues** (la tâche ne s'arrête pas dessus, chacune retouchée et citée dans la PR) : `ProfileEditor.test.tsx:13-14`, `:45-57`, `:59-82`, `:84-117`, `:119-128`, `:143-190`, `:192-207`, `:209-216`, `:219-228` ; `App.test.tsx:562`, `:576-588`, `:727-738`, `:751-762`, `:765-776`, `:778-788` ; `profile-edit.test.ts:83-92` ; `c1-profils-navigateur.mjs:133-136`, `:140-143`. Deux changements **de fond**, voulus : aperçu en direct (L3-3, `App.test.tsx:727-738`, `c1…:140-143`), catalogue selon la barre (L3-17, `profile-edit.test.ts:83-92`) ; un objet disparu : la liste déroulante « Ajouter » (L3-16, `ProfileEditor.test.tsx:119-128`, `:219-228` réécrits sur `+ Ajouter` et `[data-add-choice]`, même intention). Toute autre rougeur arrête la tâche. | brief ; précédents L1-9, L4-19 | oui |
| L3-27 | Preuve au navigateur | Essai neuf `scripts/essais/design-l3-navigateur.mjs` (Playwright Chromium, `?fichiers=repli`, `--disable-lcd-text`, `--force-color-profile=srgb`), ajouté au bloc `--e2e` de `scripts/verifier.sh` et à `scripts/tests/verifier-e2e.test.sh` (ligne à part, comme design L4) : S1 à S4, S6. `--captures` : recadrages à 2x lus à 100 % (`docs/essais/design-l3-*.png`) et recadrages de la maquette rendue (`design-l3-maquette-*.png`), écarts listés un par un dans la PR (§ 6 ter) ; `--dist <dossier> --nom avant` pour l'avant (patron L1-8, L4-20). | § 9 (L3) ; L1-7, L1-8, L4-20 | oui |
| L3-28 | Netteté § 10 | Par `scripts/essais/nettete.mjs` (`pixelsOf`, `edgeRow`, `fringes`), tests de l'outil dans `scripts/tests/nettete.test.mjs` inchangés : à 1920 × 1080 et 2x, panneau ouvert, (a) Rectangle de la barre d'outils : 0 pixel intermédiaire ; (b) rangée du milieu de l'icône `dock-top` (droites pures) dans une vignette non choisie (navy sur blanc) et choisie (`#4F35C4` sur `#EDE8FD`) : 0 pixel intermédiaire ; (c) 0 frange : titre « Profils », libellé d'une ligne, segment choisi, titre de la carte choisie, `check` blanc sur la pastille violette, œil `hidden` gris, « Enregistrer » blanc sur violet ; (d) calage : chaque `svg.rb-icon` du panneau a `viewBox="-0.25 -0.25 24 24"` et 24 × 24 px ; (e) contre-épreuve sans calage : bord à demi-teinte retrouvé. | § 10 ; L1-7 ; S5 de L4 | oui |
| L3-29 | Petits écrans | Largeur `min(600px, 100%)` de la case de la scène : sous 600 px de scène, le panneau la couvre entière, les barres ancrées restent visibles. Le corps défile, en-tête et pied restent ; les vignettes passent sur deux rangées sous 480 px de panneau (`grid-template-columns: repeat(auto-fit, minmax(88px, 1fr))`). | D-DS10 ; `c1-profils-navigateur.mjs` (VIEWPORT 1280 × 900, `commun.mjs:100`) | oui |
| L3-30 | Rust, Wasm, CLI, dépendances | Aucun fichier Rust ; tailles Wasm inchangées. La CLI ne lit ni profil ni éditeur (L4-21 : aucun `parseProfile` ni `toolbar-profiles` dans `apps/cli/src`) : D15 sans effet. Aucune dépendance (`package.json`, `pnpm-lock.yaml`, `Cargo.lock` inchangés). Format `.rbprofile` : `toolbar.ts` (`parseProfile`, `serializeProfile`, `PROFILE_MINOR`) non touché. | brief ; profil (§ CLI, D15) ; L4-21 | oui |
| L3-31 | Constats d'architecture | Ouverts dans les zones touchées : `toolbar-profiles.ts:112` (catalogue) **fermé** par L3-17 ; `PointerSwitch.tsx:14` (deux tables) non aggravé : L3-12 lit `POINTER_SEGMENTS` sans troisième table ; `toolbar.ts:634` (`ACTION_REQUIRES`) non touché ; `toolbar-host.ts:45` (préréglages à la main) non touché. Squelette du geste partagé avec `resource-drag.ts` (DA-L3-1) : aucune copie, aucun constat neuf attendu. | `docs/architecture-constats.md` | oui |
| L3-32 | Abandon d'un brouillon modifié | P20 liait l'abandon sans question à l'absence d'aperçu ; avec l'aperçu, un brouillon **différent du profil enregistré** (`sameProfile`, la comparaison de L3-20) demande `shell.confirm("Abandonner les changements du profil « <nom> » ?")` avant : Fermer (× de l'en-tête), choisir un autre profil dans le panneau, Importer depuis le panneau, ouvrir un autre panneau (`App` : `toggle` passe par `leaveEditor()`, `App.tsx:291`). Non : rien ne change, le panneau reste. Brouillon égal : aucune question. Entrer en annotation abandonne sans question (geste explicite, fenêtre principale réduite à la barre, `App.tsx:315-326`). « Revenir à l'origine » est lui-même un abandon voulu : sans question (H3). Pas d'enregistrement automatique : écart à la maquette (H2, § 6 ter). | P20 ; contre-relecture tour 1 ; `profile-actions.ts:24` (`shell.confirm`) | oui |

## 3. Carte d'impact

Graphe présent (`~/.cache/graphes/roomboard/graphify-out/graph.json`, 2026-11-25 10:40, après la fusion de la PR 55 à
10:27), interrogé ; recherche texte en plus pour les sélecteurs, classes CSS et libellés.

### 3.1 Interface (`apps/web/src`)

| Endroit | Touché ? | Pourquoi | V/S |
|---|---|---|---|
| `ui/ProfileEditor.tsx:1-316` | oui | panneau, sections, radio, liste triable, œil, aperçu, pied (L3-3 à L3-21) ; `syncValue` et `pick` restent exportés | V |
| `ui/PointerSwitch.tsx:14-17` | oui | export `POINTER_SUMMARY` dérivé de `POINTER_SEGMENTS` (L3-12) ; rendu inchangé | V |
| `ui/resource-drag.ts:19-86` | oui | squelette du geste extrait dans `ui/pointer-gesture.ts` (DA-L3-1) ; comportement inchangé, ses 9 tests verts | V |
| `ui/ProfileMenu.tsx:21-55` | oui | icône + texte, îlot (L3-22) ; props et attributs inchangés | V |
| `ui/App.tsx:291` (`toggle`), `:294` (hôte local), `:341-375` (profil montré), `:452-500` (menu, éditeur), racine `.rb-layout` | oui | `previewProfile`, `shown`, montage `keyed`, `data-panneau`, `leaveEditor()` et confirmation (L3-32), props neuves de l'éditeur (L3-1 à L3-4, L3-21) | V |
| `ui/RadioChoices.tsx`, `ui/sort-drag.ts`, `ui/pointer-gesture.ts` (neufs) | oui | DA-L3-1, DA-L3-2 | — |
| `profile-edit.ts:83-121` | oui | `moveItemTo` (L3-14), `catalog` selon la barre montrée en annotation (L3-17), `sameProfile` (L3-20, L3-32) ; `moveItem` inchangé | V |
| `app/profile-actions.ts:33`, `:107-117` | oui | `exportProfile(p)` ; `exportActive` en dérive | V |
| `ui/icons.ts:14-78` | oui | dix icônes (L3-25) ; `iconFor` (`:148`) réutilisé | V |
| `ui/rb.css:104`, `:110-114`, `:171-174` (menu), neuves `.rb-sheet*` | oui | panneau, barre flottante à gauche, menu en îlot ; `.rb-editor` (`:175-184`) inchangée | V |
| `ui/layout.ts:8-22` | non | la grille ne change pas : le panneau vit dans la case de la scène | V |
| `toolbar.ts` (`parseProfile`, `serializeProfile`, `PROFILE_MINOR`, `annotationBarOf`) | non | format inchangé ; `annotationBarOf` et tables d'annotation lues (L3-17) | V |
| `ui/IconButton.tsx:111` (`IconButton`, `Icon`) ; `ui/tooltip.ts` | non | réutilisés tels quels | V |
| `ui/GridPanel.tsx:28`, `ui/ImagePanel.tsx:11` | non | importent `pick`, `syncValue` de `ProfileEditor.tsx` : exports gardés | V |
| `main.ts` (`measureBar`, profil actif) | non | l'éditeur se ferme à l'entrée en annotation (`App.tsx:315-326`) ; la bande lit le profil enregistré | V |
| Persistance `localStorage` `roomboard.profils` (`profile-store.ts`) | non | seules les actions existantes écrivent | V |

### 3.2 Tests et essais

| Endroit | Touché ? | Pourquoi | V/S |
|---|---|---|---|
| `ui/ProfileEditor.test.tsx:13-14` (sélecteurs), `:45-51` (sections, barres → choix de barre), `:53-57` (bloc annotation : choisir la barre), `:59-70`, `:72-82`, `:143-162`, `:164-177`, `:185-190`, `:209-216` | oui (forme) | radio `[data-choice]`, bouton œil ; `:209-216` : Fermer d'un brouillon modifié appelle la confirmation (prop `confirm` du faux) ; intention gardée | V |
| `ui/ProfileEditor.test.tsx:84-117`, `:192-207` | oui (forme) | un clic sur la poignée de la ligne avant `up` / `down` (L3-15 a) ; reste inchangé | V |
| `ui/ProfileEditor.test.tsx:119-128`, `:219-228` | oui (objet disparu, L3-16) | `select[data-edit="add-choice"]` et `add.disabled` → `+ Ajouter` puis `[data-add-choice="action:page-next"]` ; `:219-228` : le choix de la liste survit à une autre édition devient « la liste ouverte se referme après un ajout, le catalogue suit le brouillon » ; même intention (ajout en fin, id unique) | V |
| `ui/ProfileEditor.test.tsx` (ajouts) ; `ui/RadioChoices.test.tsx`, `ui/sort-drag.test.ts`, `ui/pointer-gesture.test.ts` (neufs) | oui | `preview` à chaque geste, `endPreview` au démontage ; Exporter grisé au nom vide ; poignée : toucher dévoile Monter / Descendre, flèches, annonce `aria-live` ; tri souris et doigt (événements synthétiques), Échap, `click` ignoré après un glisser ; `slotOf` ; flèches du radiogroupe ; squelette : seuil, capture perdue, `pointercancel` | — |
| `ui/resource-drag.test.ts` (9 tests) | non : à garder verts | preuve que l'extraction du squelette ne change rien | V |
| `ui/App.test.tsx:562`, `:576-588`, `:751-762`, `:765-776`, `:778-788` | oui (forme) | sélecteurs ; `:576-588` choisit « Barre d'annotation » avant l'œil de `ann-text` ; `:778-788` : la confirmation (faux `confirm` vrai, `App.test.tsx:214`) est asynchrone, une attente d'une microtâche avant l'assertion | V |
| `ui/App.test.tsx:727-738` | oui (fond, L3-3) | « la barre ne bouge pas avant Enregistrer » devient « la barre suit le brouillon ; Enregistrer garde ; Fermer rend la barre d'avant » | V |
| `ui/App.test.tsx` (ajouts) | oui | barre `right` + panneau : barre dans sa case, panneau dans la scène ; flottante à gauche et repliée sur plusieurs rangées ; import et export depuis le panneau ; « Revenir à l'origine » ; confirmation : brouillon modifié + Fermer / autre profil / autre panneau, « Non » garde le panneau, brouillon égal sans question ; focus rendu au sélecteur après changement de profil | — |
| `profile-edit.test.ts:83-92` | oui (fond, L3-17) | catalogue `outils` de `defaut` sans les actions d'annotation ; catalogue `annotation` ajouté ; catalogue `outils` du profil figé `defaut-avant-l4.rbprofile` (barre montrée en annotation) garde Écran suivant, Figer, Envoyer, nouvel onglet | V |
| `profile-edit.test.ts` (ajouts) ; `app/profile-actions.test.ts` (ajouts) | oui | `moveItemTo` (rang 0, frontière de groupe, élément inconnu, groupe vidé) ; `sameProfile` ; `exportProfile(draft)` | V |
| `ui/icons.test.ts`, `ui/rb-css.test.ts` (ajouts) | oui | dix icônes calées ; `BUTTON_PX` = `--rb-btn-*` ; `.rb-sheet` sans couleur hors charte | V |
| `scripts/essais/c1-profils-navigateur.mjs:133-136` | oui (forme) | vignette « À gauche », segment « Grands · 64 », œil de la gomme, œil de Profil grisé | V |
| `scripts/essais/c1-profils-navigateur.mjs:140-143` | oui (fond, L3-3) | « rien d'enregistré : la barre est toujours en haut » devient « aperçu : la barre est à gauche, en l, sans gomme » ; le reste de l'essai (enregistrer, recharger, exporter, importer, S2) inchangé | V |
| `scripts/essais/design-l3-navigateur.mjs` (neuf) ; `scripts/verifier.sh:142-144` ; `scripts/tests/verifier-e2e.test.sh` | oui | L3-27 | V |
| `ui/ProfileMenu.test.tsx` ; `c1-profils-navigateur.mjs:56-78`, `:207-210` ; `s5b`, `c11a`, `c11b`, `design-l1`, `design-l4` (`[data-profile=…]`) | non : à garder verts | menu et attributs inchangés, `textContent` des commandes inchangé (icône `aria-hidden`) | V |
| `scripts/tests/nettete.test.mjs` ; `scripts/essais/nettete.mjs` | non : à garder verts | outil réutilisé tel quel | V |
| `ui/Toolbar.test.tsx`, `PointerSwitch.test.tsx`, `toolbar.test.ts`, `toolbar-profiles.test.ts`, `GridPanel.test.tsx`, `ImagePanel.test.tsx` | non : à garder verts | barres, profils livrés, `.rb-editor` inchangés | V |

### 3.3 Documents et licence

| Endroit | Touché ? | Pourquoi | V/S |
|---|---|---|---|
| `THIRD_PARTY_NOTICES.md:511-525` | oui | dix icônes Lucide de la maquette 03 | V |
| `docs/essais/coque-windows.md:84-89`, `docs/essais/coque-macos.md:92-97` (section C1) | oui | ligne de geste ajoutée : « Profil → Modifier… : tirer la poignée d'un outil au doigt (écran tactile, Mac : trackpad et souris) » → la ligne suit, la barre change au lâcher, la scène ne reçoit aucun trait ni dépôt (U24 : glisser-déposer natif de la coque) ; C1-1 : la barre bouge en direct avant l'enregistrement | V |
| `docs/essais/design-l3-*.png` (neufs) | oui | recadrages avant / après, maquette | — |
| `docs/architecture-constats.md` | oui (clôture) | constat `toolbar-profiles.ts:112` fermé (par `scripts/chaine/constats.cjs`) | V |

Cœur Rust, modules Wasm, coque Tauri, CLI : non touchés (L3-30). Autres dépôts : aucun endroit touché.

### Effets de bord sur l'existant

- **Les barres suivent le brouillon pendant l'édition** (avant : rien avant Enregistrer). Fermer, changer de panneau ou
  entrer en annotation les rend. Couvert par `App.test.tsx:727-738` (retouché), « changer de panneau abandonne le
  brouillon » (`App.test.tsx:778-788`, vert sans retouche de fond), S3.
- **La scène se rétrécit en direct** quand on ancre une barre à gauche ou à droite depuis le panneau (nouvelle colonne
  de la grille, comme après Enregistrer aujourd'hui). Couvert par S1 (`noOverlap`, `commun.mjs:140`).
- **Barre flottante déplacée à gauche** tant que le panneau est ouvert. Couvert par S6 et `App.test.tsx` (ajout).
- **Catalogue « Ajouter » plus court** : la barre d'outils ne propose plus Souris, Écran suivant, Figer, Envoyer ;
  la barre d'annotation ne propose plus que ce qui agit en annotation. Couvert par `profile-edit.test.ts:83-92`
  (retouché) et S4.
- **Monter / Descendre cachés au repos**, dévoilés par un toucher de la poignée ; tri au pointeur et aux flèches en plus.
  Couvert par `ProfileEditor.test.tsx:84-117` (un clic ajouté), `sort-drag.test.ts`, S2.
- **Abandon d'un brouillon modifié confirmé** (avant : sans question). Couvert par `App.test.tsx` (ajouts) et S3.
- **Barre flottante repliée sur plusieurs rangées** pendant l'édition. Couvert par S6.
- **Exporter depuis le panneau** écrit le brouillon ; « Exporter… » du menu écrit toujours le profil enregistré.
  Couvert par `profile-actions.test.ts` (ajout) et S1.
- **Menu Profil** : mêmes entrées, avec icônes. Couvert par `ProfileMenu.test.tsx` et les cinq essais qui l'emploient.

### Chantiers en cours

- Worktrees : `/home/adminjd/projets/roomboard` (`main`, dbb2473, propre) ; ce worktree (seul `docs/sessions/design-l3-etat.md` non suivi). Aucun recouvrement.
- PR ouvertes : aucune (`gh pr list --state open` vide).
- Autre machine : aucun worktree transmis par l'orchestrateur.

### Termes cherchés

- Graphe : `graphify query "which modules render or test the profile editor and profile menu" --budget 1500` ;
  `graphify affected "ProfileEditor()"` ; `graphify affected "moveItem()"` ; `graphify affected "layoutFor()"`.
- Texte (`apps/web/src`, `scripts/essais`) : `data-edit\|data-profile\|data-profiles\|profile-editor\|Monter\|Descendre` ;
  `rb-editor` ; `rb-popover\|data-panel` ; `setPointerCapture\|pointerdown\|onPointerDown\|drag` ; `preview\|endPreview` ;
  `radiogroup\|role="radio"\|aria-checked` ; `catalog(` (`profile-edit.test.ts`) ; `ANNOTATION_[A-Z_]* *[:=]` (`toolbar.ts`) ;
  `exportActive` ; `confirm` (`App.test.tsx`, `profile-actions.ts`) ; `flex-wrap\|rb-floating` (`rb.css`) ; `C1-1\|C1-6` (`docs/essais/coque-*.md`) ; `syncValue\|pick` (imports de `ProfileEditor`) ; `annotation-pointer` (`toolbar.ts`, `item-state.ts`) ;
  `separator` (`toolbar-profiles.ts`) ; `Lucide` (`THIRD_PARTY_NOTICES.md`) ; `symbol id=` de `03-profils.html` ;
  `parseProfile\|toolbar-profiles\|rbprofile` (`apps/cli/src`).
- Coffre : « RoomBoard design éditeur de profils », « tri au pointeur glisser liste pointer capture »,
  « panneau latéral profil éditeur RoomBoard Playwright essai », « netteté pixels capture Playwright devicePixelRatio ».

### Modules à réutiliser ou à étendre

| Besoin du chantier | Module existant | Interface appelée ou étendue | Décision |
|---|---|---|---|
| opérations sur le brouillon | `profile-edit.ts:65-121` | `setLabel`, `setStartMode`, `setButtonSize`, `setDock`, `setHidden`, `canHide`, `moveItem`, `addItem`, `addPreset`, `updatePreset`, `removePreset`, `resetToolbars`, `resetAllPresets` | réutiliser |
| lâcher au rang voulu | `profile-edit.ts:83` (`moveItem`, un cran) | `export function moveItemTo(p: Profile, barId: string, itemId: string, to: number): Profile` | étendre |
| catalogue selon le rôle | `profile-edit.ts:107` (`catalog`) ; `toolbar.ts:653-660` | `catalog(p, barId)` inchangée de signature ; table interne `CATALOG_ACTIONS: Readonly<Record<string, (id: ActionId) => boolean>>` | étendre |
| aperçu en direct | `ui/GridPanel.tsx:33-35`, `:47` (`preview`, `endPreview`, `onCleanup`) | `ProfileEditorProps.preview(draft: Profile): void` ; `ProfileEditorProps.endPreview(): void` | réutiliser (patron) |
| gestes du profil | `app/profile-actions.ts:28-43` | `choose`, `importFile`, `canResetCurrent`, `resetCurrent`, `canRemove` ; ajout `exportProfile(p: Profile): Promise<boolean>` | étendre |
| profil actif et liste | `ui/active-profile.ts:6-16` | `profile`, `profiles` | réutiliser |
| icône d'un élément | `ui/icons.ts:148` (`iconFor`) | `iconFor(item)` | réutiliser |
| icônes du panneau | `ui/icons.ts:14` (`ICONS`) | dix entrées (L3-25) | étendre |
| bouton à icône, infobulle | `ui/IconButton.tsx:111` (`IconButton`), `Icon` | appelés tels quels | réutiliser |
| libellé et icône « Dessin / Souris » | `ui/PointerSwitch.tsx:14` (`POINTER_SEGMENTS`) | `export const POINTER_SUMMARY: { readonly label: string; readonly icon: string }` dérivé ; renvoi `ROW_SUMMARY` dans l'éditeur | étendre |
| brouillon égal au profil enregistré | `toolbar.ts` (`serializeProfile`) | `export function sameProfile(a: Profile, b: Profile): boolean` dans `profile-edit.ts` | étendre |
| confirmation d'abandon | `ShellPort.confirm` (`profile-actions.ts:24`, `App.tsx` props `shell`) | appelée telle quelle | réutiliser |
| barre montrée en annotation (catalogue) | `toolbar.ts:675` (`annotationBarOf`) | appelée telle quelle | réutiliser |
| squelette du geste (capture, seuil, Échap, `pointercancel`, capture perdue) | `ui/resource-drag.ts:19-86` (`startResourceDrag`, privé au glisser de carte) ; `DRAG_THRESHOLD_PX` (`:11`) | extrait : `ui/pointer-gesture.ts` : `startPointerGesture(e: PointerEvent, g: PointerGesture): void` ; `PointerGesture { accept?(dx: number, dy: number, pointerType: string): boolean; move(m: PointerEvent): void; finish(u: PointerEvent \| null, dragged: boolean): void }` (`u` nul : Échap, `pointercancel`, capture perdue ; `dragged` faux : sous le seuil, un toucher) ; `DRAG_THRESHOLD_PX` y déménage, réexporté par `resource-drag.ts` ; `startResourceDrag` le rappelle (`accept` = règle du doigt vertical) | étendre (extraction, DA-L3-1) |
| tri au pointeur | `ui/resource-drag.ts:19` : cible la scène (`onStage`, `elementsFromPoint`), fantôme dans `body`, abandon au doigt vertical ; règle de lâcher différente, non substituable | `ui/sort-drag.ts` : `startSortDrag(e: PointerEvent, opts: SortDragOptions): void` sur `startPointerGesture` ; `SortDragOptions { rows(): readonly HTMLElement[]; scroller: HTMLElement; from: number; moved(dy: number, slot: number): void; drop(to: number): void; tap(): void; cancel(): void }` ; `slotOf(mids: readonly number[], y: number): number` | nouveau module (DA-L3-1) ; termes : `setPointerCapture`, `pointerdown`, `drag`, `sort`, `reorder` |
| choix exclusif (cartes, vignettes, segments) | aucun (termes : `radiogroup`, `role="radio"`, `aria-checked` dans `ui/` : seul `ProfileMenu` a des `menuitemradio`, autre rôle) ; `PointerSwitch` : boutons `aria-pressed` à icône seule, autre contrat | `ui/RadioChoices.tsx` : `RadioChoices<T extends string>(props: { name: string; label: string; look: "card" \| "tile" \| "segment"; options: readonly RadioOption<T>[]; value: T; choose(v: T): void }): JSX.Element` ; `RadioOption<T> { value: T; label: string; icon?: string; detail?: string }` | nouveau module (DA-L3-2) |
| valeurs px des tailles | `rb.css:27-29` (`--rb-btn-s/m/l`) | `BUTTON_PX` dans `ProfileEditor.tsx`, lié par `rb-css.test.ts` | réutiliser (valeurs), table liée par test |
| panneau calé à droite dans la scène | `rb.css:113-114` (`.rb-popover[data-panel="library"]`) | même patron, `data-panel="profils"` | réutiliser (patron) |
| export du fichier | `profile-file.ts` (`profileToFile`) | appelé tel quel | réutiliser |
| essai et netteté | `scripts/essais/commun.mjs` (`serve`, `loadPlaywright`, `item`, `noOverlap`, `VIEWPORT`), `nettete.mjs` (`pixelsOf`, `edgeRow`, `fringes`, `hex`) | appelés tels quels | réutiliser |

## 4. Hypothèses à revoir

Niveau 1 (visibles des utilisateurs ou difficiles à défaire) :

- **H1 — Aperçu en direct** au lieu de « rien avant Enregistrer » (C1 P20) : D-DS10, plus récent, l'emporte ; le
  brouillon reste, son abandon est confirmé s'il diffère du profil enregistré (L3-32).
- **H2 — Pas d'enregistrement automatique** : la maquette montre « Enregistré sur cet appareil » sans bouton ;
  « Enregistrer » est gardé (comportement inchangé), l'état n'apparaît que si rien n'a changé.
- **H3 — « Revenir à l'origine » sans confirmation** : il retire la copie d'un livré ou ramène un profil de
  l'utilisateur à son origine, comme la commande du menu (P6).
- **H4 — Exporter depuis le panneau écrit le brouillon**, même non enregistré ; le menu écrit le profil enregistré.
- **H5 — Une barre à la fois** (commande « Barre d'outils / des pages / d'annotation ») plutôt que les trois blocs
  empilés (environ 57 lignes pour `defaut`).
- **H6 — Monter / Descendre cachés au repos**, dévoilés par un toucher de la poignée (L3-15).
- **H7 — Catalogue selon la barre** (ferme le constat L4) : moins d'entrées dans « Ajouter » ; la barre montrée en
  annotation garde les actions d'annotation.
- **H8 — Panneau dans la case de la scène**, pas sur toute la hauteur de la fenêtre comme la maquette : les barres
  `top` et `bottom` et les onglets restent au-dessus et au-dessous ; aucune barre n'est jamais couverte.
- **H9 — Menu Profil gardé** à côté du panneau (cinq essais, accès rapide au choix du profil).

Niveau 2 :

- H10 — Barre flottante posée en haut à gauche de la scène pendant l'édition.
- H11 — Étiquettes « Fourni », « Fourni, modifié », « Personnel ».
- H12 — Séparateurs montrés en lignes « Séparateur », déplaçables et masquables comme avant.
- H13 — Défilement automatique du corps à 48 px de ses bords pendant le tri ; aucun défilement de la barre.
- H14 — Taille des boutons en section à part (globale au profil), pas sous les vignettes.
- H15 — L'hôte local lit le profil montré : un préréglage du brouillon marche dans la barre pendant l'édition.
- H16 — Note de repli toujours visible, même quand l'annotation est possible.
- H17 — Sélecteur de profil natif (`<select>`), sa liste ouverte est celle du système.
- H18 — Rendus et mesures sans Inter (Q6) : police du système ; la maquette est rendue avec Inter.
- H19 — Sous 600 px de scène, le panneau la couvre entière.
- H20 — Entrer en annotation, panneau ouvert, abandonne le brouillon sans question (L3-32).
- H22 — Barre d'annotation sans aperçu en direct au tableau (jamais rendue au tableau) ; une note le dit, et
  « Flottante » vaut « En haut » pour elle (`annotationBarOf`).
- H23 — Barre flottante repliée sur plusieurs rangées pendant l'édition, sa largeur réduite à la place libre.
- H24 — Icône `pen-line` sur la ligne « Dessin / Souris » (même icône que le segment), la maquette montre `pen`.
- H21 — Visible = `check`, masqué = `hidden` (`eye-off`), comme la maquette ; D-DS10 dit « œil ».

## 5. Décisions d'architecture

**DA-L3-1 — Tri au pointeur : `ui/sort-drag.ts`.**
Contexte : U12 interdit le glisser HTML5 (coupé sous Windows en coque, U24) ; `resource-drag.ts` vise la scène, pas un rang.
Décision : le squelette du geste (capture, seuil, Échap, `pointercancel`, capture perdue) est **extrait** de `resource-drag.ts` dans `ui/pointer-gesture.ts` (`startPointerGesture`) et partagé, sans copie ; `startResourceDrag` le rappelle à comportement égal (ses 9 tests restent verts, sinon l'extraction est abandonnée pour une recopie justifiée et un constat). `startSortDrag(e, opts)` y ajoute rangs, décalage des lignes et défilement du `scroller` ; `slotOf` pur ; le composant traduit `drop(to)` en `moveItemTo` et `tap()` en dévoilement de Monter / Descendre.
Conséquences : un seul `moveItemTo` par lâcher (une écriture du brouillon, un aperçu) ; la ligne ne quitte pas le DOM pendant le geste (capture gardée) ; un futur glisser au pointeur part du même squelette.
Repli : retirer la poignée au pointeur laisse le clic (Monter / Descendre) et le clavier.

**DA-L3-2 — Choix exclusifs : `ui/RadioChoices.tsx`.**
Contexte : quatre choix exclusifs (démarrage, emplacement, taille, barre) remplacent trois listes déroulantes.
Décision : un composant `role="radiogroup"` à trois aspects, flèches itinérantes, `[data-choice]` sur chaque bouton, `data-edit` sur le groupe.
Conséquences : accessibilité et sélecteurs d'essai uniformes ; `PointerSwitch` (bascule `aria-pressed`) reste à part.
Repli : revenir à `select` touche ce seul composant et les sélecteurs des tests.

**DA-L3-3 — Aperçu par profil montré (`shown`) dans `App`.**
Contexte : D-DS10 veut la barre réelle derrière le panneau ; le profil actif ne doit pas être écrit avant Enregistrer.
Décision : `previewProfile` (signal de `App`) ; `shown = previewProfile ?? active.profile` lu par le rendu et l'hôte local ; `main.ts`, le magasin et l'annotation lisent toujours le profil enregistré.
Conséquences : rien n'est écrit pendant l'édition ; un rechargement de page rend le profil enregistré.
Repli : ne plus appeler `preview` rend le comportement C1.

## 6. Scénarios d'acceptation

Jouables sur la VM : Vitest (`pnpm -r test`) et Playwright Chromium par `scripts/verifier.sh --e2e`
(`design-l3-navigateur.mjs`).

- **S1 — S1 de l'usage (barre à droite, grands boutons).** 1280 × 900, profil par défaut ; Profil → « Modifier… » : le
  panneau est à droite, 600 px, la scène visible à sa gauche ; vignette « À droite » : `[data-toolbar="outils"][data-dock="right"]`
  **avant tout enregistrement**, barre entière dans la fenêtre, sans intersection avec le panneau ni la scène ; « Grands · 64 » :
  `data-size="l"` en direct ; œil de la gomme : `eraser` absent de la barre en direct ; deux couleurs ajoutées ;
  « Enregistrer comme nouveau » « CM1 » ; recharger : barre à droite, `l`, sans gomme, `cm1` actif, cinq `data-preset`.
  Exporter depuis le panneau : `cm1.rbprofile`, clés de tête `format, schema, minor, id, label, basedOn, interface,
  toolbars, presets, behavior` seulement, `minor: 1`, `basedOn: "defaut"`. Nouveau contexte du navigateur (autre
  appareil) : Importer depuis le panneau : même barre à droite, en grand, sans gomme. « Revenir à l'origine » : barre en
  haut, `m`, gomme revenue, nom « CM1 » gardé.
- **S2 — Tri au pointeur et au clavier.** Bloc « Barre d'outils » : tirer la poignée de « Texte » à la souris (pas de
  8 px) jusqu'en tête : pendant le geste la barre ne change pas, au lâcher le premier bouton de la barre est `text` ;
  même geste au doigt (`hasTouch`, événements tactiles de Chromium) sur « Rectangle » ; Échap pendant un geste : rien ne
  bouge ; clic de la poignée de « Texte » sans glisser : « Monter » et « Descendre » paraissent sur sa ligne seulement,
  « Descendre » : rendu à sa place, la zone `aria-live` dit « Texte : rang N sur M » ; poignée au clavier, Flèche haut :
  focus gardé sur sa poignée. Vitest : `slotOf`, `moveItemTo`, `startSortDrag` (souris, doigt, Échap, capture perdue,
  toucher sous le seuil), `resource-drag.test.ts` vert, aucun `draggable` dans le panneau.
- **S3 — Aperçu abandonné, avec confirmation.** Vignette « À gauche », puis Fermer : question « Abandonner les
  changements du profil « Par défaut » ? » ; Annuler : panneau ouvert, barre toujours à gauche ; Fermer, Oui : barre en
  haut. Même question en ouvrant Réglages et en choisissant « Simple » dans le sélecteur du panneau (Oui : éditeur sur
  « Simple », focus sur le sélecteur). Sans changement, Fermer ne demande rien. Faux hôte : entrer en annotation,
  panneau ouvert et modifié : panneau fermé sans question, la bande mesure la barre enregistrée. Vitest : nom vide,
  Enregistrer et Exporter grisés.
- **S4 — Barre d'annotation et catalogue.** Faux hôte, « Barre d'annotation » : sa liste dans l'ordre exact de la barre,
  « Dessin / Souris » en une ligne (icône `pen-line`), note « Montrée seulement en annotation du bureau » ; masquer `ann-text`, Enregistrer, entrer : Texte absent de la barre
  d'annotation, présent dans la barre d'outils ; « + Ajouter » de la barre d'outils : ni Souris ni Envoyer ; de la barre
  d'annotation : ni Ouvrir ni Exporter en PDF. Vitest : profil figé d'avant L4, « + Ajouter » de sa barre d'outils (montrée en
  annotation) propose encore Écran suivant, Figer, Envoyer dans un nouvel onglet.
- **S5 — Netteté et maquette.** 1920 × 1080 à 2x, panneau ouvert sur « Annotation au démarrage », barre à gauche : mesures
  de L3-28 (0 pixel intermédiaire, 0 frange, calage, contre-épreuve) ; avec `--captures`, recadrages à 100 % (en-tête et
  profil actif, cartes, vignettes et taille, liste, pied) comparés aux mêmes zones de `03-profils.png`, écarts listés un
  par un et justifiés (§ 6 ter).
- **S6 — Petit écran et barre flottante.** 1024 × 768 : panneau de 600 px, en-tête et pied visibles, corps qui défile
  jusqu'à « Enregistrer comme nouveau » ; barre d'outils de `defaut` en « Flottante » : en direct, elle est en haut à
  gauche de la scène, repliée sur plusieurs rangées, chaque bouton entier dans la fenêtre et hors du panneau (patron
  `allVisible`, `c1-profils-navigateur.mjs:103`) ; fenêtre de 560 px de large : le panneau couvre toute la scène, barres
  ancrées visibles.

### 6 ter. Écarts attendus à la maquette 03 (à confirmer sur les recadrages)

Panneau sous la barre du haut et les onglets, pas sur toute la hauteur (H8) ; « Enregistrer » et « Enregistrer comme
nouveau » en plus, l'état « Enregistré sur cet appareil » seulement sans changement (H2) ; champ « Nom du profil » ;
section « Taille des boutons » à part (H14) ; commande de choix de la barre (H5) ; sections « Préréglages » et
« Rétablir les barres » (U12) ; lignes « Séparateur » (H12) ; « Monter » et « Descendre » sur la ligne dont on a touché la
poignée (L3-15) ; icône `pen-line` sur « Dessin / Souris » (H24) ; note de la barre d'annotation (H22) ; sélecteur de profil natif (H17) ; police du système au lieu
d'Inter (H18) ; outils de la barre d'outils de `defaut` (la maquette montre une barre réduite d'avant L4).

## 7. Hors périmètre

- Îlots flottants, poignée et repli de la barre, profils fournis réordonnés (L2) ; icône de l'application (L5).
- Panneaux Grille, Image, Bibliothèque, Réglages (`.rb-editor` et `.rb-popover` génériques) : restylés plus tard.
- Enregistrement automatique ; Inter embarquée (Q6) ; thème sombre (Q7) ; mesure sur écrans à 150 % (Q8).
- Position et taille d'une barre flottante (HC2-2) ; préréglages d'autres outils que stylo et pot (HC2-3).
- Coque Tauri, cœur Rust, CLI ; autres dépôts : aucun endroit touché.

Estimation : **8 tâches** (modèle : `moveItemTo`, catalogue, `sameProfile`, `exportProfile` ; icônes et notice ;
`RadioChoices` ; `pointer-gesture` extrait et `sort-drag` ; panneau `ProfileEditor` et styles ; `App` : aperçu, montage, confirmation, flottante, menu ; fiches coque ; retouches des tests et de
l'essai c1 ; essai `design-l3`, captures, comparaison).

## 8. Portes immédiates

Aucune.
