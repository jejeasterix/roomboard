# Cadrage — design-l1 (lot L1 du design : jetons, icônes, bouton à icône, tailles)

Source maîtresse : `docs/plans/design-cadrage.md` (OF41, PR 51), cité ici et jamais refait ; charte : `docs/design/charte.md` ;
maquettes : `docs/design/maquettes/01-tableau.html`, `02-annotation-bureau.html`, `03-profils.html` et leurs PNG.
Coffre : `02_Decisions/0290-roomboard-design-icones-lucide-trait-calage.md`. Cadrage autonome : aucune question n'a pu
parvenir à Jérôme ; ce qui n'a pas de source est une hypothèse (§ 4).

## 1. Demande et gabarit

Poser le lot L1 du design (`design-cadrage.md` § 9) : jetons de la charte dans `rb.css`, table d'icônes Lucide (24 px,
trait 1,5, calage `viewBox="-0.25 -0.25 24 24"`), bouton à icône avec infobulle et nom accessible, tailles S 44 / M 48 /
L 64, avec la preuve du § 9 (test rouge d'abord, contrôle de netteté § 10, captures avant/après à 2x).

Gabarit : **courte** (10 questions au plus ; 10 consommées).

Go de Jérôme (2026-11-24, sur les maquettes de la PR 51), mot pour mot : « c'est franchement mieux. suis cette
direction » ; il couvre le cadrage design et les recommandations de ses questions (§ 8), Q8 restant ouverte (trait 1,5
gardé). Exigence : « Je serai particulierement intransigent sur la neteté des logos, icons, images etc... Les trait
doivent etre fin et moderne ».

## 2. Décisions

| # | Point | Décision | Source | Réversible ? |
|---|---|---|---|---|
| L1-1 | Où vit la table d'icônes, forme des tracés | Module neuf `apps/web/src/ui/icons.ts`, sans JSX ni dépendance. `ICONS` : nom d'icône → `IconNode`, liste de `[balise, attributs]` (balises admises : `path`, `rect`, `circle`, `line`, `polyline`, `ellipse` ; attributs en chaînes, copiés tels quels du tracé source). Noms d'icônes : ceux des maquettes sans le préfixe `i-` (`rect`, `pen`, `eraser-part`…), plus les noms Lucide des 8 icônes absentes des maquettes, plus `row-remove` et `col-remove` (dessinées). Deux tables d'attribution : `TOOL_ICONS` (ToolId → nom) et `ACTION_ICONS` (ActionId → nom). `toolbar.ts` n'est pas modifié (modèle sans interface, lu par la CLI). Rendu par `<Dynamic>` de Solid dans un `<svg>`, jamais par `innerHTML`. | `design-cadrage.md:140` (§ 7, `icons.ts` neuf, sans dépendance npm) ; maquettes 01-03 (`<symbol id="i-…">`, l. 94-268 de 01) ; brief (aucune dépendance) | oui |
| L1-2 | Quelle icône pour chaque identifiant ; d'où viennent les tracés | Table du § 2 bis. Tracés : (a) recopiés des `<symbol>` des maquettes (Lucide `lucide-icons/lucide@7981a0798a`, et `annotate`, `eraser-part`, `line` dessinées, `01-tableau.html:5`) ; (b) 9 tracés Lucide absents des maquettes (les 8 de la table d'origine L, plus `pen-line`, L1-3), lus au même commit par `gh api 'repos/lucide-icons/lucide/contents/icons/<nom>.svg?ref=7981a0798a' -H 'Accept: application/vnd.github.raw'` (lecture sur la sortie standard, aucun fichier écrit dans le dépôt), nom Lucide en commentaire de chaque entrée ; `edit-original` prend `square-arrow-up-right-exit` (lu : `M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6`, `m21 3-9 9`, `M15 3h6v6`) ; son ancien nom `square-arrow-out-up-right` n'est plus qu'un alias obsolète dans `square-arrow-up-right-exit.json` (404 en `.svg` au commit) ; sans accès à `gh api`, la tâche s'arrête et rend « source absente : Lucide » (aucun repli local : pas de `lucide-react` sur la VM) ; (c) `row-remove` et `col-remove` dessinées sur la grille de 24, coordonnées entières, même trait. Seules les 46 icônes utilisées entrent dans `ICONS` (pas les 56 symboles des maquettes). | `charte.md:73-84` ; brief (« une icône sans équivalent Lucide est dessinée dans le même style ») ; maquettes (association libellé → icône relevée dans 01 et 02) | oui |
| L1-3 | Attribution `item.icon` → icône | `iconFor(item, stateIcon?)` : (1) `item.icon` s'il est une clé propre d'`ICONS` (`Object.hasOwn`) ; (2) sinon l'icône d'état rendue par `itemState` ; (3) sinon `TOOL_ICONS[item.tool]` ou `ACTION_ICONS[item.action]` ; (4) sinon `null` : le bouton montre son libellé en texte, jamais vide. Icône d'état : `ItemState` gagne `icon?: string`, posé par `ACTION_STATE` pour deux actions seulement : `annotation-pointer` (libellé « Souris » → `pointer`, « Dessin » → `pen-line`, Lucide : un stylo distinct de l'outil Stylo `pen`, qui reste dans la même barre) et `annotation-freeze` quand le bureau vivant n'est pas offert (« Recapturer le bureau » → `reset`). `eraser-mode` n'a **pas** d'icône d'état : `eraser-part` dans les deux modes ; le mode « objet » se lit au fond enfoncé (`aria-pressed`, `--rf-violet-100`) et au libellé « Gomme : objet » de l'infobulle (aucune icône Lucide ne dit « gomme d'objet » sans se confondre avec l'outil Gomme `eraser`, H13). Le format `.rbprofile` ne change pas. | `design-cadrage.md:141` (« `item.icon` du profil prioritaire sur la table ») et § 9 L1 (inconnu → table ; rien → texte) ; `toolbar.ts:41` (`icon?: string` lu, jamais affiché) ; `item-state.ts:54-74` ; maquette 02 l. 278 (Souris → `pointer`) ; `pen-line` lu au commit `7981a0798a` | oui |
| L1-4 | Nom accessible et infobulle | Le bouton porte `aria-label={libellé}` **et** garde son libellé en texte dans un `<span class="rb-sr">` masqué à l'œil (le `textContent` reste le libellé) ; le `<svg>` est `aria-hidden="true"` et `focusable="false"`. Pas d'attribut `title` (deux infobulles sinon). Infobulle maison : montrée après 400 ms de survol à la souris, au focus clavier (`:focus-visible`), et après 500 ms d'appui au doigt ou au stylet ; cachée à la sortie, au blur, 1 500 ms après le relâcher. L'appui long **n'annule pas** le clic : l'outil est choisi au relâcher, comme aujourd'hui. Une seule infobulle à la fois, rendue par `Portal` dans `body` (jamais enfant de `.rb-bar`), `role="tooltip"`, `pointer-events: none`, position en px entiers (`Math.round`, aucun `transform`), sous le bouton, au-dessus s'il manque la place, bornée à la fenêtre. Style de la maquette (`.tip`, `01-tableau.html:64-65`) : fond `--rf-navy-500`, texte blanc 14 px graisse 500, rayon `--rf-radius-md`, `--rf-shadow-card`. Libellé seul, sans raccourci. | `design-cadrage.md:99-100` (§ 4 : infobulle au survol et à l'appui long, `aria-label`) ; coffre 0290 (« le libellé reste `aria-label` et infobulle ») ; `charte.md:24` (navy pour l'infobulle) ; tests existants qui lisent `textContent` (§ 3.2) | oui |
| L1-5 | Quels boutons passent en icône dans L1 | Passent par le nouveau bouton : les éléments `tool` et `action` de `Toolbar` (`Toolbar.tsx:46-59`), les 9 actions de la rangée du tableau (`Toolbar.tsx:151-160`) ; les pastilles (préréglages, « Aucune » du pot, couleurs de cellule, `Toolbar.tsx:113-123`, `162-174`) gardent la pastille seule, libellé en `rb-sr`, `aria-label` et infobulle. Restent tels quels : la barre des pages (`PagesBar.tsx`, lot L2), la rangée Sélection (`SelectionRow.tsx`, hors `ACTION_TABLE`), la rangée Format (G, I, S déjà en glyphes), la zone de dépôt (texte), le curseur de tolérance, les menus, l'éditeur de profils, le sélecteur de tableau. | `design-cadrage.md:141`, `144` (§ 7 : `Toolbar.tsx` en L1, `PagesBar.tsx` en L2) ; maquette 01 (pastilles sans texte, D-DS7) ; brief (« le texte reste dans les menus et l'éditeur de profils ») | oui |
| L1-6 | Jetons et leur nommage dans `rb.css` | En tête de `:root`, recopie des lignes 12-33 de `01-tableau.html` : 16 couleurs `--rf-*` de la charte (l. 12-27), 3 ombres `--rf-shadow-{card,hover,modal}` (l. 28-30), `--rf-radius-{sm,md,lg,xl}` (4, 6, 8, 12), `--rf-space-{xs,sm,md,lg,xl}` (4, 8, 16, 24, 32), `--rf-font`, chacun avec sa source en commentaire. Puis `--rb-btn-s: 44px`, `--rb-btn-m: 48px`, `--rb-btn-l: 64px` (noms inchangés) et `--rb-icon: 24px`. Règles des barres : fond `--rf-white` ; bouton sans bordure, fond transparent, rayon `--rf-radius-lg`, icône `--rf-navy-500` ; survol `--rf-gray-50` ; enfoncé et page montrée `--rf-violet-100` et `--rf-violet-700` ; grisé `--rf-gray-500` ; focus clavier anneau 2 px `--rf-violet-600` en `outline` ; séparateur 1 × 24 px `--rf-gray-300` ; bouton à icône seule `inline-size` et `block-size` = `--rb-btn`, `padding: 0`, `flex: none`, icône centrée. **Aucun pixel de hauteur ajouté à une barre** : ni filet, ni bordure, ni `padding` de plus sur `.rb-bar` (la scène outil Tableau actif n'a que ≈ 2 px de marge, § 3 effets de bord). Couleurs remplacées, ligne par ligne : `rb.css:23`, `:71` (enfoncé, page montrée) → fond `--rf-violet-100`, bordure `--rf-violet-600`, texte `--rf-violet-700` ; `:79` (onglet choisi) → bordure `--rf-violet-600` ; `:100` (case allumée du sélecteur) → fond `--rf-violet-100`, bordure `--rf-violet-600` ; `:139` (bouton enfoncé de la barre du média, hors `.rb-bar`) → fond `--rf-violet-100`, bordure `--rf-violet-600`, **texte `--rf-violet-700`** (le blanc deviendrait illisible) ; `:24`, `:25`, `:123` (`#94a3b8`) → `--rf-gray-300` ; `#a1a1aa` → `--rf-gray-300` sur les cadres à fond blanc : `:45` (`.rb-popover`, cadre des panneaux et de la barre du média), `:96` (cadre du sélecteur), `:99` (cases du sélecteur), `:109` (filet de menu), `:136` (barre du média). **Restent** : `:77`, `:78` (bande et onglets à fond gris `#e4e4e7`, `#f4f4f5` : un filet `#E0E0E8` y serait invisible ; repris avec les onglets en îlots, L2) ; l'intérieur des panneaux (`:55`, `:63`, `:113`, `:116`), `:87`, les ombres `rgba(0, 0, 0, 0.2)` de `:96`, `:136`, les couleurs d'erreur et du canvas (H9). `--rf-font` est déclaré, pas appliqué (Inter n'est pas embarquée, Q6). | `charte.md` (tables, l. 16-59) ; `design-cadrage.md:111-112` (D-DS3, D-DS5), `:139` (§ 7, `--rf-*`), `:37-39` (§ 2, couleurs hors charte) ; maquette 01 l. 12-33 (jetons), l. 45-56 (`.btn`, `.sep`) ; `rb.css` relu ligne par ligne ; contre-relecture tour 1 (hauteur, `:139`) | oui |
| L1-7 | Contrôle de netteté § 10, mesuré automatiquement | Essai neuf `scripts/essais/design-l1-navigateur.mjs`, joué par `verifier.sh --e2e` sur la VM : Chromium de Playwright, `viewport` 1920 × 1080, `deviceScaleFactor: 2`, arguments `--disable-lcd-text` et `--force-color-profile=srgb`, profil par défaut, outil Stylo actif, souris hors de la barre. (1) **Calage** : pour chaque `svg.rb-icon` visible, `x` et `y` de sa boîte × 2 sont entiers ; joué sur les profils `defaut` (barre en haut, M) et `simple` (à gauche, L). (2) **Bord du Rectangle** : capture découpée du bouton `[data-item="rect"]`, décodée dans un canvas de la page ; rangée du milieu de l'icône (y = haut du svg + 12 px CSS, × 2) ; fond = 1er pixel de la rangée dans le svg, encre = `#182946` ; un pixel est « plein » s'il est à 1 au plus de l'un des deux par composante ; critère : **0 pixel intermédiaire**, exactement 2 suites d'encre de 3 pixels. Les valeurs de la rangée sont imprimées en gris comme au § 10 (`255 … 39 39 39 … 255`). (3) **Franges** : dans la même capture et dans celle de l'infobulle du Rectangle (survol), tout pixel est à 2 au plus du segment RVB fond → encre (fond blanc → `#182946` ; fond `#182946` → blanc pour l'infobulle) ; critère : **0 frange colorée**. (4) **Contre-épreuve** dans le même essai : un svg témoin `viewBox="0 0 24 24"` injecté dans la page doit donner au moins 2 pixels intermédiaires, sinon la mesure est déclarée aveugle et l'essai échoue. (5) **Appui long (S2)**, dans un second contexte du même essai : Chromium sans tête, `hasTouch: true`, session CDP ; `Input.dispatchTouchEvent` `touchStart` au centre de `[data-item="eraser"]`, attente de 800 ms, l'infobulle `[role="tooltip"]` « Gomme » est visible, puis `touchEnd` ; écouteurs posés sur le bouton : `pointerdown`, `pointerup`, `click` reçus, **aucun `contextmenu`** ; ensuite `[data-item="eraser"]` est `aria-pressed="true"`. Séquence relevée sur la VM par la contre-relecture ; WebView2 n'est pas vérifié (H12). Fonctions de mesure pures dans `scripts/essais/nettete.mjs`, testées par `node --test scripts/tests/nettete.test.mjs` sur des rangées fabriquées. | `design-cadrage.md:207-221` (§ 10) ; `:201` (§ 9, preuve L1) ; coffre 0290 (mesure, contre-épreuve) ; profil (Playwright sur la VM, essais `--e2e`) | oui |
| L1-8 | Captures avant/après | Le même essai, avec `--captures`, écrit à 2x : `docs/essais/design-l1-apres.png` (fenêtre entière, 3840 × 2160), `design-l1-apres-barre.png` (bande de la barre d'outils seule, à 100 %), `design-l1-infobulle.png` (Rectangle survolé). Scène : celle de `design-cadrage.md:49-50` (profil par défaut, trois traits et un rectangle tracés à la souris). Avec `--dist <dossier> --nom avant`, il sert un autre build : l'avant se prend sur un build web d'`origin/main` (5a34c9b, application identique à 3f18ee1 des captures 00) fait dans un worktree temporaire `~/.cache/tmp/of43-design-l1-avant` (jamais `/tmp`), retiré ensuite par `git worktree remove`. Les modules Wasm sont ignorés par git (`.gitignore:5-6`) : on copie `apps/web/src/wasm` et `apps/web/src/wasm-formats` du worktree du chantier dans le worktree temporaire au lieu de recompiler (le Rust ne change pas, L1-10). En mode « avant », l'essai **saute toutes les mesures** (calage, bord, franges, contre-épreuve, appui long : l'avant n'a pas d'icône) et ne fait que les captures. `verifier.sh` ne passe jamais `--captures`. La PR montre les deux paires et liste, écart par écart, ce qui sépare l'après de `01-tableau.png` (îlots, menu, rangée des préréglages : lots L2 à L4). | brief ; `design-cadrage.md:47-54` (§ 2, méthode des captures « avant ») ; `scripts/tests/verifier-e2e.test.sh:22` (aucune option de capture dans `verifier.sh`) ; convention `docs/essais/<chantier>-*.png` | oui |
| L1-9 | Comment les tests existants restent verts | (a) `textContent` des boutons inchangé grâce au `rb-sr` (L1-4) : `Toolbar.test.tsx:125`, `203`, `242-243`, `309`, `App.test.tsx:618`, `c11a-annotation-navigateur.mjs:100`, `117`, `120`, `c11b-capture-navigateur.mjs:123`, `226`, `251`, `267` passent sans retouche ; (b) l'infobulle n'est jamais enfant de la barre (`Toolbar.test.tsx:199-200` compte les enfants) ; (c) les règles de `rb.css` lues par expression régulière restent : `.rb-bar { … align-items: center }`, `.rb-bar button { … padding … }`, `.rb-pages-list`, la règle `:is([data-item="export-iwb"], [data-item="export-ubz"])`, `.rb-tab*`, `.rb-stage*`, `.rb-layout` ; `App.test.tsx:389-393` interdit `position: absolute|fixed` dans toute règle dont le sélecteur contient `.rb-bar` : `.rb-sr` et l'infobulle (`.rb-tip`) sont des règles **de premier niveau**, jamais écrites `.rb-bar .rb-sr` ni `.rb-bar .rb-tip` ; (d) les attributs `data-item`, `data-preset`, `data-table-action`, `data-table-fill`, `aria-pressed`, `disabled` sont posés comme aujourd'hui ; (e) la grille du sélecteur de tableau garde ses cases de 36 px (`--rb-cell: 36px`, `rb.css:98-99`), seule hors de la règle S/M/L ; (f) **retouche de forme admise, à citer dans la PR** : `c7b-texte-riche-navigateur.mjs:309` compare la scène après Échap, outil Tableau encore actif (c7b:322 reclique Texte ensuite), à `boxTool` mesurée outil Texte ; elle compare désormais à `boxTable` (l. 208, même outil Tableau actif), l'intention « scène immobile à la validation du tableau » gardée. Un test existant ne se retouche que sur la forme ; un test qui échoue sur le fond arrête la tâche. | brief (« restent verts sans être réécrits sur le fond ») ; relevés § 3.2 | oui |
| L1-10 | Licence, dépendances, Wasm | Section « Icônes Lucide (ISC) » ajoutée à `THIRD_PARTY_NOTICES.md` : commit `7981a0798a`, liste des icônes reprises, texte ISC de Lucide et texte MIT de Feather (Cole Bemis), les deux étant dans la licence de Lucide ; mention des 5 icônes dessinées pour RoomBoard ; texte de licence recopié de cette lecture. Aucun paquet npm ni crate ajouté (`package.json` et `pnpm-lock.yaml` inchangés). Aucun fichier Rust touché : les deux modules Wasm ne bougent pas, leurs plafonds de `verifier.sh` (1,5 Mo, 3 Mio) restent les contrôles. | brief ; `THIRD_PARTY_NOTICES.md:1-5` ; licence Lucide lue par `gh api 'repos/lucide-icons/lucide/contents/LICENSE?ref=7981a0798a' -H 'Accept: application/vnd.github.raw'` (ISC « Copyright (c) 2026 Lucide Icons and Contributors », puis MIT de Feather, Cole Bemis) ; `verifier.sh` (plafonds) | oui |

### 2 bis. Table d'attribution (L1-2)

Origine : **M** = symbole des maquettes (Lucide, ou dessiné si marqué *) ; **L** = Lucide lu au commit `7981a0798a` ;
**D** = dessinée pour ce lot.

| Identifiant | Icône | Orig. | Identifiant | Icône | Orig. |
|---|---|---|---|---|---|
| outil `pen` | `pen` | M | `file-save-as` | `save` | M |
| outil `eraser` | `eraser` | M | `settings` | `settings` | M |
| outil `hand` | `hand` | M | `profiles` | `profile` | M |
| outil `select` | `select` | M | `grid` | `grid` | M |
| outil `rect` | `rect` | M | `library` | `library` | M |
| outil `ellipse` | `ellipse` | M | `desktop-annotation` | `annotate` | M* |
| outil `line` | `line` | M* | `annotation-pointer` | `pointer` (état « Dessin » : `pen-line`) | M, L |
| outil `arrow` | `arrow` | M | `annotation-screen` | `screen` | M |
| outil `text` | `text` | M | `annotation-freeze` | `freeze` (« Recapturer » : `reset`) | M |
| outil `table` | `table` | M | `annotation-send` | `board` | M |
| outil `fill` | `fill` | M | `annotation-send-new` | `plus` | M |
| `eraser-mode` | `eraser-part` | M* | `table-row-insert` | `between-horizontal-start` | L |
| `undo`, `redo` | `undo`, `redo` | M | `table-col-insert` | `between-vertical-start` | L |
| `page-prev`, `page-next` | `prev`, `next` | M | `table-row-remove` | `row-remove` : les deux rectangles de `between-horizontal-start`, chevron remplacé par `M2 12h4` | D |
| `page-add` | `plus` | M | `table-col-remove` | `col-remove` : les deux rectangles de `between-vertical-start`, chevron remplacé par `M10 4h4` | D |
| `page-remove` | `trash` | M | `table-uniform` | `columns-3` | L |
| `page-insert-file` | `file-import` | M | `table-merge` | `table-cells-merge` | L |
| `edit-original` | `square-arrow-up-right-exit` (ex-`square-arrow-out-up-right`, alias obsolète) | L | `table-split` | `table-cells-split` | L |
| `export-pdf` | `pdf` | M | `table-shade` | `droplet` | L |
| `export-iwb`, `export-ubz` | `export` | M | `table-unshade` | `droplet-off` | L |
| `fit-page` | `fit` | M | `file-new`, `file-open`, `file-import`, `file-save` | `file-new`, `file-open`, `file-import`, `save` | M |

11 outils et 37 actions, 46 icônes distinctes (dont 9 L et 2 D).

## 3. Carte d'impact

Graphe présent (`~/.cache/graphes/roomboard/graphify-out/graph.json`), interrogé ; recherche texte en plus pour les
chaînes, sélecteurs, règles CSS et essais.

### 3.1 Interface web (`apps/web/src/ui`)

| Endroit | Touché ? | Pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/ui/Toolbar.tsx:46-59` (`Button`) | oui | délègue à `IconButton`, icône par `iconFor` | V |
| `apps/web/src/ui/Toolbar.tsx:95-141` (`PresetRow`), `:161-175` (pastilles du tableau) | oui | pastille seule, libellé en `rb-sr`, infobulle | V |
| `apps/web/src/ui/Toolbar.tsx:147-160` (`TableActionRow`) | oui | 9 actions en bouton à icône | V |
| `apps/web/src/ui/item-state.ts:45`, `:63-74` | oui | `ItemState.icon?`, posé pour `annotation-pointer` et `annotation-freeze` | V |
| `apps/web/src/ui/rb.css:1-8`, `:15`, `:23-25`, `:45`, `:71`, `:79`, `:96`, `:98-100`, `:109`, `:123`, `:136-139` | oui | jetons, tailles, styles des barres, couleurs hors charte (liste ligne par ligne : L1-6) | V |
| `apps/web/src/ui/rb.css:77`, `:78` (bande et onglets) | non | fonds gris hors charte, filet `#a1a1aa` gardé jusqu'à L2 ; seul `:79` change | V |
| `apps/web/src/ui/icons.ts`, `IconButton.tsx`, `tooltip.ts` (neufs) | oui | table, bouton, infobulle | — |
| `apps/web/src/ui/PagesBar.tsx` | non (aspect seulement, par `.rb-bar button`) | texte gardé jusqu'à L2 | V |
| `apps/web/src/toolbar.ts:84`, `:99` ; `toolbar-profiles.ts` ; `ProfileEditor.tsx` | non | lus, jamais modifiés ; format `.rbprofile` inchangé | V |

Persistance (`.rbprofile`), CLI (`apps/cli`), cœur Rust, modules Wasm, coque Tauri, autres dépôts : non touchés (le
champ `icon` existe déjà, `toolbar.ts:41`, `:334`, `:568`).

### 3.2 Tests et essais

| Endroit | Touché ? | Pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/ui/icons.test.ts`, `IconButton.test.tsx`, `tooltip.test.ts` (neufs) | oui | tests rouges d'abord (§ 9 L1) | — |
| `apps/web/src/ui/Toolbar.test.tsx` | oui (ajouts) | `item.icon` inconnu → icône de la table ; sans icône → libellé visible ; jamais de bouton vide ; lignes 125, 199-203, 242-243, 309 gardées telles quelles | V |
| `apps/web/src/ui/item-state.test.ts` | oui (ajouts) | icône d'état des deux actions | V |
| `scripts/essais/design-l1-navigateur.mjs`, `nettete.mjs`, `scripts/tests/nettete.test.mjs` (neufs) | oui | mesure § 10, captures | — |
| `scripts/essais/commun.mjs:39` (`serve`) | oui | option `dist` (défaut `DIST`) | V |
| `scripts/verifier.sh:140-141`, `scripts/tests/verifier-e2e.test.sh:13-21` | oui | essai L1 dans le bloc `--e2e`, ligne à part ; `node --test scripts/tests/nettete.test.mjs` hors du bloc | V |
| `App.test.tsx:385-401`, `:618` ; `PagesBar.test.tsx:125-160` ; `TabsBar.test.tsx:92-104` | non : à garder verts | lisent `rb.css` par expressions régulières ou le `textContent` | V |
| `scripts/essais/c7b-texte-riche-navigateur.mjs:309` | oui (forme) | compare outil Tableau actif à `boxTool` (outil Texte) : Texte 2 rangées, Tableau 3 → rouge ; passe à `boxTable` (l. 208), L1-9 (f) | V |
| `scripts/essais/c7b-texte-riche-navigateur.mjs:208`, `:216` (`stageBox`, `boxCell.height >= 640`) | non : à garder vert | outil Tableau actif, scène ≈ 642 px (calcul, non mesuré) : 2 px de marge | V |
| `c11a-annotation-navigateur.mjs:100-120`, `c11b-capture-navigateur.mjs:123-267` | non : à garder verts | lisent le texte des boutons | V |
| `c10a`, `c10b`, `c12`, `c13-tableaux`, `c14`, `c16` (`stageBox(page, 640)`) ; `c1-profils:103-117` (`allVisible`) | non : à garder verts | hauteur de scène et boutons dans la fenêtre, en 1280 × 900 | V |

### 3.3 Licence, documents

| Endroit | Touché ? | Pourquoi | V/S |
|---|---|---|---|
| `THIRD_PARTY_NOTICES.md` | oui | section Lucide (ISC + MIT de Feather) | V |
| `docs/essais/design-l1-{avant,apres}{,-barre}.png`, `design-l1-infobulle.png` | oui (neufs) | captures de la PR | — |
| `docs/essais/c1-*.png` et autres captures commitées | non | jamais réécrites par `verifier.sh` | V |

### Effets de bord sur l'existant

- **Hauteur des barres.** M passe de 44 à 48 px, les boutons à icône sont plus étroits : le nombre de rangées change.
  En 1280 × 900, barre par défaut : 24 boutons et 4 séparateurs font environ 1 296 px pour 1 272 disponibles, deux
  rangées ; outil Texte actif, deux rangées ; **outil Tableau actif, trois rangées** (rangée du tableau en icônes et
  pastilles, plus la rangée Format : `FORMAT_TOOLS = ["text", "table"]`, `FormatRow.tsx:29`), **scène ≈ 642 px (calcul
  du relecteur, non mesuré)** pour un plancher de 640 (`commun.mjs:103`). Aucun pixel de hauteur ajouté à une barre
  (L1-6). La tâche CSS **mesure** la scène outil Tableau actif dans l'essai (`stageBox` après `page.click(item("table"))`,
  1280 × 900) et consigne la valeur dans son rapport et dans la PR ; sous 640 px, elle s'arrête et le signale, aucun
  seuil n'est baissé. Couvert par `stageBox(page, 640)` de `c7b-texte-riche-navigateur.mjs:208-216`,
  `c10a-tableau-navigateur.mjs`, `c10b`, `c13-tableaux-navigateur.mjs`, `c12-pdf-navigateur.mjs`,
  `c14-media-navigateur.mjs`, `c16-office-navigateur.mjs`, et `allVisible` de `c1-profils-navigateur.mjs` (profil
  simple, L, à gauche) ; `c7b:309` passe à `boxTable` (L1-9 f).
- **Risque non relu : `--rb-btn-m` de 44 à 48 px hors des barres.** Il fixe aussi la hauteur des boutons des menus de
  profils (`rb.css:108`), de l'éditeur de profils (`:117-118`), du formulaire du sélecteur de tableau (`:103-104`) et
  de la barre du média (`:138`, `:140`) : 4 px de plus par ligne. La barre du média flotte dans la scène (sans effet sur
  `stageBox`) ; les menus et l'éditeur sont dans `.rb-popover` (`max-height: 100%`, `overflow: auto`). Couvert par
  `c1-profils-navigateur.mjs` (éditeur, `allVisible`) et `c14-media-navigateur.mjs` ; les menus n'ont aucun essai de
  hauteur : contrôle sur les captures de la PR.
- **Allure de la barre des pages, de la barre du média, des onglets et du sélecteur de tableau** : couleurs d'accent et
  filets remplacés, texte inchangé. Couvert par `PagesBar.test.tsx`, `TabsBar.test.tsx`, `App.test.tsx:385-401`.
- **Curseur de tolérance** : `min-block-size: var(--rb-btn-s)` passe de 36 à 44 px, dans une barre de 48. Couvert par
  `Toolbar.test.tsx:309-325` et `c6b-pot-image-navigateur.mjs`.
- **Texte de la page** : quand une infobulle est montrée, son libellé entre dans `document.body.innerText`
  (`c14-media-navigateur.mjs:182`, `c15-3d-navigateur.mjs:171-175` y cherchent un message) ; aucune infobulle sans survol,
  ces essais restent verts.
- **Bascule Souris / Dessin** : l'icône suit le libellé. Couvert par `item-state.test.ts` (ajout) et
  `c11a-annotation-navigateur.mjs:117-120`.

### Chantiers en cours

- `/home/adminjd/projets/roomboard-wt/trait-pointe` (`fix/trait-pointe`, à 5a34c9b, aucun fichier modifié, aucun commit) :
  aucun recouvrement.
- PR ouvertes : aucune (`gh pr list --state open`).
- Autre machine : aucun worktree transmis par l'orchestrateur.

### Termes cherchés

- Graphe : `graphify affected "itemState"`, `graphify affected "ACTION_TABLE"`,
  `graphify query "quel composant rend les boutons de la barre d'outils et leur libellé" --budget 1500`.
- Texte : `icon` dans `apps/web/src` (seulement `toolbar.ts:41`, `232`, `334`, `347`, `568`) ; `<svg` dans `apps/web/src`
  (rien) ; `title=\|aria-label\|tooltip\|data-tip` dans `apps/web/src/ui` (attributs `title` natifs, aucun composant
  d'infobulle) ; `textContent\|getByText\|getByRole\|innerText\|hasText` dans les tests et `scripts/essais` ; `rb\.css`
  dans les tests ; `rb-btn` dans `rb.css` (23 usages) ; `1e3a8a\|94a3b8\|a1a1aa` dans `apps/web` ;
  `deviceScaleFactor\|getImageData\|screenshot` dans `scripts/essais` ; `stageBox(page, 640)` dans `scripts/essais` ;
  `w3.org` dans `scripts/controle-hors-ligne.mjs` (déjà permis, l. 15) ; `lucide` dans les maquettes ; `sameBox\|boxTool\|stageBox`
  dans `scripts/essais/c7b-texte-riche-navigateur.mjs` ; `FORMAT_TOOLS` dans `apps/web/src` ; `rb-btn-m` dans `rb.css`
  (l. 103-118, 138-140) ; `position: (absolute|fixed)` dans `App.test.tsx` ; `wasm` dans `.gitignore`.
- Lucide au commit `7981a0798a` (`gh api 'repos/lucide-icons/lucide/contents/<chemin>?ref=7981a0798a' -H
  'Accept: application/vnd.github.raw'`) : `icons/square-arrow-out-up-right.svg` (404), `icons/square-arrow-up-right-exit.svg`
  et `.json` (alias obsolète), `icons/pen-line.svg`, `icons/mouse-pointer-2.svg`, `icons/brush.svg`, `LICENSE`.
- Coffre : « roomboard design icônes netteté », « roomboard barre boutons taille profils », « netteté icônes SVG
  demi-pixel flou », « playwright capture deviceScaleFactor pixels », « infobulle appui long tactile ».

### Modules à réutiliser ou à étendre

| Besoin du chantier | Module existant | Interface appelée ou étendue | Décision |
|---|---|---|---|
| état d'un bouton (enfoncé, grisé, libellé) | `apps/web/src/ui/item-state.ts:116` (`itemState`), `:54` (`ACTION_STATE`) | `ItemState` gagne `readonly icon?: string` ; deux entrées d'`ACTION_STATE` le posent | étendre |
| liste des outils et des actions connus | `apps/web/src/toolbar.ts:84` (`TOOL_TABLE`), `:99` (`ACTION_TABLE`) | clés lues par les tests de complétude ; aucune écriture | réutiliser |
| rendu d'un élément de barre | `apps/web/src/ui/Toolbar.tsx:46` (`Button`), `:71` (`RENDER`) | `Button` rend `IconButton` ; `RENDER` inchangé | étendre |
| table d'icônes et attribution | aucun (termes : `icon`, `<svg`, `lucide`, `Icon` dans `apps/web/src`) | `apps/web/src/ui/icons.ts` : `type IconTag = "path" \| "rect" \| "circle" \| "line" \| "polyline" \| "ellipse"` ; `type IconNode = readonly (readonly [IconTag, Readonly<Record<string, string>>])[]` ; `ICONS: Readonly<Record<string, IconNode>>` ; `TOOL_ICONS: Readonly<Record<ToolId, string>>` ; `ACTION_ICONS: Readonly<Record<ActionId, string>>` ; `ICON_VIEWBOX = "-0.25 -0.25 24 24"` ; `iconFor(item: ToolItem, stateIcon?: string): string \| null` | nouveau module |
| bouton à icône, nom accessible | aucun (termes : `aria-label`, `rb-sr`, `visually` dans `apps/web/src/ui`) | `apps/web/src/ui/IconButton.tsx` : `Icon(props: { name: string }): JSX.Element` ; `IconButton(props: { icon: string \| null; label: string; pressed?: boolean \| null; disabled?: boolean; attrs?: Readonly<Record<string, string>>; children?: JSX.Element; onPress: () => void }): JSX.Element` (libellé visible seulement sans `icon` ni `children`) | nouveau module |
| infobulle (survol, focus, appui long) | aucun (termes : `tooltip`, `infobulle`, `data-tip` ; seuls des `title` natifs) | `apps/web/src/ui/tooltip.ts` : `createTip(opts?: { hoverMs?: number; holdMs?: number; lingerMs?: number }): { shown: Accessor<boolean>; enter(): void; leave(): void; down(pointerType: string): void; up(): void; focus(): void; blur(): void }` (une seule montrée à la fois, signal de module) ; le rendu `Portal` est dans `IconButton` | nouveau module |
| servir un build web aux essais | `scripts/essais/commun.mjs:39` (`serve`) | `serve({ headers, dist = DIST })` | étendre |
| Playwright, sélecteur d'élément | `scripts/essais/commun.mjs:27` (`loadPlaywright`), `:101` (`item`) | appelés tels quels | réutiliser |
| lire les pixels d'une capture et mesurer bord et franges | `scripts/essais/commun.mjs:74` (`inkIn`) lit le canvas de scène, pas le rendu DOM : non substituable | `scripts/essais/nettete.mjs` : `pixelsOf(page, clip): Promise<{ width: number; height: number; data: Uint8ClampedArray }>` ; `edgeRow(px, y, x0, x1, bg, ink, tol = 1): { gray: number[]; intermediate: number; runs: number[] }` ; `fringes(px, bg, ink, tol = 2): number` ; réutilisable par L2-L5 (§ 10 « à refaire à chaque lot ») | nouveau module |

Constats d'architecture (`docs/architecture-constats.md`) : aucun constat ouvert dans `apps/web/src/ui` ni `rb.css`. Le
constat ouvert `annotation-page.ts:35` (`viewOf` recopie `ToolbarView` champ par champ) n'est pas aggravé : le chantier
étend `ItemState`, pas `ToolbarView`. Aucune zone « Constats à fermer ».

## 4. Hypothèses à revoir

Niveau 1 (visibles des utilisateurs) :

- H1 — Infobulle : 400 ms au survol, 500 ms d'appui, 1 500 ms après le relâcher ; l'appui long n'annule pas le clic
  (l'outil est choisi au relâcher). Défaut retenu pour ne pas changer le comportement d'un appui au stylet un peu long.
- H2 — « Enregistrer » et « Enregistrer sous » ont la même icône `save` (maquette 01, l. 295-296, menu à libellés) : deux disquettes
  côte à côte dans la barre jusqu'à L2, qui les range dans le menu à libellés.
- H3 — Pastilles sans texte dans la barre (préréglages, « Aucune », couleurs de cellule) ; libellé en infobulle et en nom
  accessible. Anticipe D-DS7 et garde la scène à 640 px.
- H4 — Les 11 icônes sans maquette (§ 2 bis, origines L et D, `pen-line` compris), dont `plus` pour « Envoyer dans un nouvel onglet » (icône
  « Nouvel onglet » de la maquette 01) en attendant le bouton accolé de L4.
- H5 — La bascule Souris / Dessin change d'icône avec son libellé (`pointer` ↔ `pen-line`, distinct de l'outil Stylo
  `pen`), en attendant la commande segmentée de L4 (Q3), dont la maquette 02 met `pen` sur « Dessin ».
- H12 — Appui long : vérifié dans Chromium sans tête (CDP, 800 ms : `pointerdown`, `pointerup`, `click`, aucun
  `contextmenu`) ; non vérifié dans WebView2 sous Windows au doigt ou au stylet (menu contextuel ou annulation du clic
  possibles), à jouer sur écran réel.
- H13 — `eraser-mode` garde `eraser-part` dans ses deux modes ; « objet » se lit au fond enfoncé et à l'infobulle
  (« Gomme : objet »), faute d'icône Lucide qui ne se confonde pas avec l'outil Gomme.

Niveau 2 :

- H6 — `--rf-font` déclaré, non appliqué : Inter n'est pas embarquée (Q6, licence à lire, lot à venir).
- H7 — Les franges se mesurent avec `--disable-lcd-text`, comme le § 10 ; le texte de WebView2 sous Windows (ClearType)
  n'est pas mesuré ici (écrans réels, Q8).
- H8 — Le sélecteur de tableau garde des cases de 36 px (`--rb-cell`).
- H9 — Restent hors charte jusqu'à leur lot (liste ligne par ligne : L1-6) : bande et onglets, fonds et filets
  (`rb.css:77`, `:78`, L2) ; intérieur des panneaux (`:55`, `:63`, `:113`, `:116`), dont le cadre `.rb-popover` (`:45`)
  passe pourtant à `--rf-gray-300` ; ombres `rgba(0, 0, 0, 0.2)` (`:96`, `:136`) ; couleurs d'erreur ; couleurs dessinées
  dans le canvas (`SELECTION_COLOR`, `canvas2d.ts:101`).
- H10 — Tolérances de mesure : 1 par composante pour « plein », 2 pour l'écart au segment fond → encre.
- H11 — Tracés et licence Lucide lus au commit `7981a0798a` par `gh api`, sans repli local ; injoignable : la tâche
  s'arrête (« source absente : Lucide »).

## 5. Décisions d'architecture

Aucune : gabarit `courte`, tout est réversible (les interfaces des trois modules neufs tiennent dans la liste du § 3).

## 6. Scénarios d'acceptation

- **S1 — Barre nette à 2x.** Ouvrir RoomBoard en 1920 × 1080 à 200 %, profil par défaut : la barre d'outils montre des
  icônes de 24 px dans des boutons de 48 px ; la rangée qui traverse l'icône Rectangle donne `255 … 39 39 39 … 255` des
  deux côtés (0 pixel intermédiaire), aucune frange ; toutes les icônes tombent sur la grille de pixels.
- **S2 — Infobulle.** Survoler « Rectangle » à la souris : « Rectangle » apparaît sous le bouton ; Tab jusqu'à
  « Annuler » : l'infobulle « Annuler » apparaît ; au doigt, garder l'appui sur « Gomme » : l'infobulle apparaît, et au
  relâcher la gomme est choisie (joué par `design-l1-navigateur.mjs`, L1-7 (5), appui CDP de 800 ms).
- **S3 — Nom accessible et bascule.** Un lecteur d'écran annonce « Annuler » sur le bouton d'annulation ; en annotation
  (faux hôte), « Souris » montre le pointeur, un clic passe à « Dessin » et à l'icône du stylo.
- **S4 — Icône du profil.** Importer un `.rbprofile` dont le stylo porte `"icon": "inconnue"` : le bouton montre l'icône
  du stylo ; un profil qui porte `"icon": "rect"` sur le stylo montre le rectangle ; un outil sans icône dans la table
  montre son libellé en texte, jamais un bouton vide.
- **S5 — Tailles.** Choisir « Simple (grands boutons) » : barre à gauche, boutons de 64 px, icônes de 24 px calées ;
  un profil en `s` donne des boutons de 44 px ; les fichiers `.rbprofile` existants gardent leur jeton `s`, `m` ou `l`.

## 7. Hors périmètre

- Îlots flottants, menu, onglets et pages en îlots, profils fournis réordonnés (L2) ; barre des pages en icônes (L2).
- Éditeur de profils en panneau, icônes dans l'éditeur et les menus (L3).
- Barre d'annotation propre, commande segmentée, cadre violet, bouton accolé (L4) ; icône de l'application (L5).
- Police Inter embarquée (Q6) ; thème sombre (Q7) ; mesure sur écrans à 150 % (Q8).
- Raccourcis clavier dans l'infobulle (D-DS12) ; icônes des rangées Sélection et Format, de la zone de dépôt.
- Couleurs du canvas (sélection, progression du média) ; mise en page des barres (grille de `layout.ts`).
- Autres dépôts : aucun endroit touché.

## 8. Portes immédiates

Aucune.
