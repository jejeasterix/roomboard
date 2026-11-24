# Cadrage — design de RoomBoard (OF41)

Statut : cadrage et première maquette, à juger par Jérôme. Aucun code du produit ne change dans ce tour. La chaîne
`nouvelle-feature` démarre après son go, lot par lot (§ 9).

Livrables du tour : ce cadrage ; `docs/design/charte.md` (jetons relevés de RoomFlow, avec leur source) ; les maquettes
`docs/design/maquettes/0*.html` et leurs rendus `0*.png` (1920 × 1080 CSS, `devicePixelRatio` 2, soit 3840 × 2160).

## 1. Demande

Jérôme, 2026-11-24 vers 19:15, mot pour mot :

- « pour ce qui concerne le deign il va y avoir un travail de dingue à faire. Je te conseil de trouvé un skill design
  d'app qui correspond (cherche), et de prendre une autre application de tableau blanc comme refernce. Les boutons avec
  texte, ca va pas etre possible, il faux des icons » ;
- « Oui : tu prépare le cadrage et une première maquette, sur Excalidraw comme référence. Reprend la charte de roomflow
  pour les couleurs » ;
- « la personnalisation de l'interface fait partie des point important et la fonction annotation de bureau sera
  centrale, suivant les profils configurable (interface et mode de démarrage en annotation de bureau) » ;
- « Pour les logos, inspire toi de l'existant. Je serai particulierement intransigent sur la neteté des logos, icons,
  images etc... Les trait doivent etre fin et moderne ».

Méthode : skill `impeccable` (shape, puis critique et détecteur). Le skill demande un entretien avec l'utilisateur ;
aucune question ne pouvait parvenir à Jérôme pendant ce tour. Substitution : la direction part de ses quatre phrases
ci-dessus, et ce qui n'est pas réversible est posé en question (§ 8).

## 2. État des lieux (`main` à `3f18ee1`)

Captures : `docs/design/maquettes/00-avant.png` (tableau) et `00-avant-annotation.png` (barre en annotation).

- **Boutons en texte.** `Toolbar.tsx:47-58` rend `st().label` dans chaque bouton. Le profil par défaut porte 31 éléments (séparateurs exclus)
  dans la barre d'outils (`toolbar-profiles.ts:71-80`) et 9 dans la barre des pages. À 1920 px de large, la barre
  d'outils tient sur **deux lignes** (100 px de haut) ; la barre des pages tronque ses libellés (« Copie .iwb… »).
- **Le modèle prévoit déjà l'icône.** `ToolItem.icon?: string` (`toolbar.ts:41`), lu et réécrit par `parseProfile`
  (`toolbar.ts:232`, `334`, `568`). Aucun composant ne l'affiche. Le passage aux icônes ne change donc pas le format
  `.rbprofile` (U11).
- **Couleurs hors charte.** Actif `#1e3a8a` (`rb.css:23`, `71`), filets `#94a3b8` et `#a1a1aa` (`rb.css:24-25`, `45`,
  `77-78`), onglet montré `#1e3a8a` (`rb.css:79`), onglets `#e4e4e7` et `#f4f4f5` (`rb.css:77-78`) : la palette Tailwind par défaut, pas celle de RoomFlow.
- **Cibles.** `--rb-btn-s: 36px` (`rb.css:2`) est sous les 44 px demandés pour le tactile ; `m` = 44, `l` = 64.
- **Annotation.** En annotation, la fenêtre principale se réduit à la première barre d'outils (`rb.css:30-33`, U16) :
  une bande sur toute la largeur de l'écran, deux lignes de boutons texte, les actions du tableau grisées mais présentes
  (Nouveau, Ouvrir, Grille…). Rien ne dit à l'œil que l'annotation est active.
- **Éditeur de profils.** `ProfileEditor.tsx` : listes déroulantes natives (emplacement, taille, démarrage), boutons
  « Monter » et « Descendre » par élément. Il marche ; il n'a ni aperçu ni hiérarchie visuelle.
- **Logo.** L'icône de la coque (`apps/desktop/src-tauri/icons/icon.png`) est un carré uni `#1E5AA0`, sans dessin.

**Comment les captures « avant » ont été obtenues.** Build web de `main` dans un worktree (`cargo build` des deux
modules Wasm, `wasm-bindgen`, `pnpm --filter @roomboard/web build`), servi par `scripts/essais/commun.mjs` (`serve`),
Chromium sans tête de Playwright (celui des essais du dépôt), 1920 × 1080 à 2x. `00-avant.png` : profil par défaut,
trois traits et un rectangle tracés à la souris. `00-avant-annotation.png` : même page avec le faux hôte
(`?annotation=faux`, `main.ts:229`), clic sur « Annotation du bureau » : `data-mode="annotation"` ; la barre seule
(`[data-toolbar="outils"]`, 1920 × 102) est capturée, puis posée, à l'échelle 1, en haut du même bureau neutre que la
maquette 02, comme la coque la montre (bande du côté de son `dock`, `c11a-coque.md` C11a-1). La coque Linux n'a pas été
lancée : elle exige un `tauri build`, interdit dans ce tour.

## 3. Référence : Excalidraw

Lu : le code d'`excalidraw/excalidraw` (MIT, `master` à `542ad76fa6`), fichiers `css/theme.scss`,
`css/variables.module.scss`, `components/ToolIcon.scss`, `Island.scss`, `Toolbar.scss`, `icons.tsx`. Aucun fichier ni
capture d'Excalidraw n'entre dans le dépôt. Ce que RoomBoard reprend, en mots :

- **Des îlots flottants sur la toile.** La barre n'est pas un ruban collé au bord : un îlot blanc à coins arrondis, une
  ombre douce et un filet, posé au-dessus de la page (`.Island`). Les autres commandes vont dans d'autres îlots, chacun à
  son coin : menu en haut à gauche, annuler et zoom en bas à gauche.
- **Une icône par outil, le texte dans l'infobulle et dans les menus.** Les commandes rares (fichier, export, réglages)
  vont dans un menu à libellés, ouvert par un bouton « menu ». La barre ne garde que les outils de dessin.
- **Les états.** Repos : icône foncée sur fond transparent. Survol : fond gris très clair. Actif : fond de la couleur
  d'accent très claire et icône de l'accent foncé (`ToolIcon--checked`, `--color-surface-primary-container`).
  Désactivé : icône grise, aucun fond au survol. Focus clavier : anneau de 2 px.
- **Un séparateur fin** (1 px, 24 px de haut) entre groupes d'outils (`App-toolbar__divider`).
- **Le trait fin des icônes** : 1,25 à 1,5 sur une grille de 20 (`icons.tsx`).
- **La rangée des propriétés de l'outil actif** (couleur, épaisseur), séparée de la barre des outils.

Ce qui change pour la classe (grand écran tactile, stylet, lecture à 3 m) :

| Excalidraw | RoomBoard | Raison |
|---|---|---|
| boutons de 32 px (`--default-button-size: 2rem`), icônes de 16 | boutons de 48 px, icônes de 24 | cibles d'au moins 44 px au doigt ; lisible à 3 m |
| barre fixe en haut au centre | barre déplaçable (poignée) et repliable (chevron) ; position et taille dans le profil | U12 ; la barre gêne parfois le contenu au tableau |
| raccourcis clavier affichés sous chaque icône | aucun chiffre sous l'icône ; le raccourci dans l'infobulle | au tableau, on touche ; un 10 px ne se lit pas à 3 m |
| propriétés de l'outil dans un panneau à gauche | rangée de préréglages sous la barre, au centre | la main reste près de la barre ; préréglages du profil (U12, P18) |
| violet `#6965db` | violet RoomFlow `#6044EB` et ses dérivés | charte RoomFlow (Jérôme) |
| police Assistant / Excalifont | Inter | charte RoomFlow |
| pas de mode bureau | barre d'annotation, cadre violet de l'écran, bascule Dessin / Souris | C11a, C11b, centraux |

## 4. Direction

Mode impeccable : **Operate** (on accomplit une tâche ; l'interface s'efface devant la page). Monde visuel : celui de
RoomFlow, déjà établi (charte), étendu à un outil de dessin ; pas de nouveau monde à inventer.

- **Thèse.** La page est la scène ; l'interface flotte autour en îlots blancs, calmes, à icônes fines. Une seule couleur
  d'accent, le violet RoomFlow, marque l'outil actif et l'action principale.
- **Premier écran.** Le tableau ouvert : la page au centre, la barre d'outils en haut, les pages en bas, rien d'autre de
  fort (maquette 01).
- **Moment propre au produit.** L'annotation du bureau : un cadre violet de 3 px entoure l'écran (« l'encre est active
  ici »), la barre se réduit aux outils de l'annotation, « Envoyer au tableau » est le seul bouton plein (maquette 02).
- **Personnalisation visible.** L'éditeur de profils est un panneau latéral ; la barre change derrière lui, en direct
  (maquette 03).
- **Risque assumé.** Une barre à icônes seules demande d'apprendre les icônes. Parade : infobulle au survol et à
  l'appui long, libellés dans les menus et dans l'éditeur de profils, noms accessibles (`aria-label`) inchangés.

## 5. Décisions

Réversibles, tranchées dans ce tour ; chacune reste ouverte à la correction de Jérôme.

| # | Décision | Source |
|---|---|---|
| D-DS1 | **Icônes seules dans les barres** ; le libellé reste le nom accessible et l'infobulle. Les menus (fichier, export) et l'éditeur de profils gardent icône **et** texte. | Jérôme (« il faux des icons ») ; Excalidraw (menu à libellés) |
| D-DS2 | **Îlots flottants** : barre d'outils, onglets, menu, pages, annuler et zoom, bibliothèque et profil, chacun dans son îlot blanc (rayon 12, filet `#E0E0E8`, `--rf-shadow-hover`). | Excalidraw `.Island` ; charte (rayon XL, ombre Hover) |
| D-DS3 | **Tailles de bouton : S 44, M 48, L 64** (aujourd'hui 36, 44, 64). Défaut M. | brief (« cibles d'au moins 44 px ») ; `rb.css:2-4` |
| D-DS4 | **Icônes de 24 px, trait 1,5, calées par `viewBox="-0.25 -0.25 24 24"`.** À `devicePixelRatio` 2, chaque trait droit fait 3 pixels pleins (mesuré, § 10). Le 1,25 a été écarté : 2,5 pixels à 2x, donc un bord à demi-teinte de chaque côté. Les icônes de 20 px sont écartées : la grille de 24 de Lucide réduite à 20 tombe hors des pixels. | Jérôme (« fin et moderne », netteté) ; Lucide ; mesure § 10 |
| D-DS5 | **Accent unique `#6044EB`**, dérivés `#4F35C4` (icône active) et `#EDE8FD` (fond actif) ; icônes au repos `#182946` ; aucune autre couleur d'interface. Les couleurs d'encre restent celles du profil. | charte (`docs/design/charte.md`) |
| D-DS6 | **Barre d'outils du tableau** : Sélection, Main | Stylo, Gomme (« Gomme : partielle », `eraser-mode`, devient un préréglage de la gomme dans la rangée contextuelle, icône `eraser-part`) | Rectangle, Ellipse, Ligne, Flèche, Texte, Tableau, Pot | Annotation du bureau | Replier. Fichier, export, grille et réglages passent dans le **menu** ; Bibliothèque et Profil dans un îlot en haut à droite ; Annuler et Rétablir en bas à gauche avec le zoom. | Excalidraw ; profil par défaut actuel (`toolbar-profiles.ts:71-80`) |
| D-DS7 | **Rangée des préréglages** sous la barre, en îlot séparé : couleurs (pastilles de 24, anneau violet sur la choisie), puis épaisseurs. | U12 (rangée contextuelle) ; Excalidraw |
| D-DS8 | **Barre d'annotation** : poignée ; bascule **Dessin / Souris** en commande segmentée (deux boutons accolés, l'actif en violet clair) ; Gomme, Flèche, Rectangle, Texte ; trois couleurs ; Annuler ; Figer le bureau ; Écran suivant ; zone de dépôt (carré pointillé, icône « fichier ») ; **Envoyer au tableau** en bouton plein violet, accolé à un chevron « Envoyer dans un nouvel onglet… » (les trois issues de Q2 de l'usage : envoyer, envoyer dans un nouvel onglet, quitter) ; Quitter. D'où vient cette barre : Q9. | U17 (bouton dédié en plus de l'outil), U18, U19, U21, U22 ; `usage-cadrage.md:624-633` (Q2) et `usage-c11b-capture-cadrage.md:55` (P5) ; libellés actuels (`item-state.ts:61-71`, `toolbar.ts:122-127`) |
| D-DS9 | **Cadre de l'annotation** : un filet violet de 3 px à l'intérieur du bord de l'écran tant que l'annotation est active. | demande (« centrale ») ; état des lieux (rien ne signale le mode) |
| D-DS10 | **Éditeur de profils en panneau latéral** (600 px, à droite), sans voile : la barre derrière montre le réglage en direct. Démarrage en deux cartes (Tableau, Annotation du bureau) ; emplacement en cinq vignettes (En haut, En bas, À gauche, À droite, Flottante) ; taille en commande segmentée ; outils en liste avec poignée de tri et œil (afficher / masquer), dans l'ordre exact de la barre, la bascule Dessin / Souris en une seule ligne ; Importer et Exporter `.rbprofile` à côté du profil ; « Revenir à l'origine » en pied. | U11-U14 ; libellés actuels (`ProfileEditor.tsx:58-60`) |
| D-DS11 | **Bureau neutre des maquettes** : dégradé `#1E3355` → `#0D1B2A`, fenêtre schématique grise, aucune capture d'un vrai bureau. | brief |
| D-DS12 | **Pas de chiffre de raccourci sous les icônes** ; le raccourci va dans l'infobulle. | lisibilité à 3 m ; au tableau, on touche |
| D-DS13 | **Police Inter** de RoomFlow, embarquée dans la coque (pas de chargement réseau, hors ligne). Tailles 14, 15, 16, 20. | charte (`Tokens.Semantic.xaml:77-85`) ; contrôle hors ligne du dépôt (`scripts/controle-hors-ligne.mjs`) |

## 6. Comment le design sert d'abord les profils et l'annotation

- **Profils (C1).** Ce qui était une liste de réglages devient un panneau qui montre l'effet : emplacement en vignettes,
  barre réelle mise à jour derrière, outils triés à la main. Le profil « Annotation au démarrage » se lit en une carte
  (« La barre seule, sur le bureau »), avec la note de repli (web, iPad, Wayland : tableau, U14). Les icônes rendent la
  barre courte : une barre verticale à gauche tient en 9 boutons, ce que le texte ne permettait pas.
- **Annotation (C11a, C11b).** La barre d'annotation n'emprunte plus la barre du tableau grisée : elle n'a que ce qui sert
  sur le bureau, sur une ligne. La bascule Dessin / Souris est la première commande, toujours visible. « Envoyer au
  tableau » est la seule action pleine : c'est la fin naturelle d'une annotation. Le cadre violet dit que l'encre est
  active, même quand la barre est repliée. L'avis « Envoyé au tableau : page 3 » reprend le texte de C11b.
- **Même grammaire partout.** Un outil a la même icône dans la barre du tableau, la barre d'annotation et l'éditeur de
  profils ; c'est ce qui rend les icônes seules apprenables.

## 7. Carte d'impact (pour les lots suivants ; rien n'est touché ici)

| Fichier | Changement prévu | Lot |
|---|---|---|
| `apps/web/src/ui/rb.css` | jetons de la charte en variables CSS (`--rf-*`), îlots, états, tailles S 44 / M 48 / L 64 | L1 |
| `apps/web/src/ui/icons.ts` (neuf) | table `id d'outil ou d'action → tracé Lucide` (ISC, tracés recopiés avec la licence dans `THIRD_PARTY_NOTICES.md`), sans dépendance npm ajoutée ; cinq icônes dessinées (`annotate`, `eraser-part`, `line`, `row-remove`, `col-remove`) | L1 |
| `apps/web/src/ui/Toolbar.tsx` | bouton = icône + `aria-label` + infobulle ; `item.icon` du profil prioritaire sur la table | L1 |
| `apps/web/src/toolbar-profiles.ts` | profils fournis réordonnés (barre d'outils sans les actions de fichier) | L2 |
| `apps/web/src/ui/App.tsx`, `layout.ts` | îlots flottants au-dessus de la scène au lieu de la grille à bandes ; menu ; îlot des pages | L2 |
| `apps/web/src/ui/TabsBar.tsx`, `PagesBar.tsx` | onglets et pages en îlots | L2 |
| `apps/web/src/ui/ProfileEditor.tsx`, `ProfileMenu.tsx` | panneau latéral, vignettes, liste triable au pointeur (U12 : jamais le glisser HTML5) | L3 |
| `apps/web/src/annotate-start.ts`, `rb.css` (`data-mode="annotation"`), `toolbar.ts`, `toolbar-profiles.ts`, `ui/App.tsx` | barre `role: "annotation"` montrée en annotation (Q9), cadre violet, bascule segmentée, bouton accolé « nouvel onglet » | L4 |
| `apps/desktop/src-tauri/icons/*` | nouvelle icône si Q1 est accordée | L5 |
| tests `Toolbar.test.tsx`, `App.test.tsx`, essais `scripts/essais/*` | les sélecteurs `data-item` restent ; les tests qui lisent le texte du bouton lisent `aria-label` | L1-L4 |

Lots L1 à L3 : pas d'effet sur le format `.rbprofile` (le champ `icon` existe). Lot L4 : une barre d'annotation propre au
profil ajoute une entrée `role: "annotation"` à `toolbars` (Q9) ; `parseProfile` accepte déjà tout rôle
(`toolbar.ts:376`), donc pas de changement de schéma, mais les profils fournis changent (`toolbar-profiles.ts`). Le
cadre de l'annotation (Q4) est un réglage de l'appareil, pas du profil. Rien sur le cœur Rust ni sur la coque hors icône.

## 8. Questions à Jérôme

Chacune avec ma recommandation et sa raison. Q1, Q2, Q3 et Q9 décident du reste.

1. **Q1 — Icône de RoomBoard.** L'icône actuelle est un carré bleu uni. Je propose une retouche dans la famille des
   produits RoomFlow (`roomflow-{docs,library,manager,studio,tools}-icon.svg`) : l'hexagone existant et un motif « tableau »,
   sans nouveau dessin de marque. **Recommandation : oui, en lot L5**, maquette à part avant tout fichier d'icône. Raison :
   le carré uni se voit dans la barre des tâches et le Dock ; la famille existe déjà.
2. **Q2 — Barre du tableau : îlot flottant au centre, ou bande collée au bord comme aujourd'hui ?** **Recommandation :
   îlot flottant** (maquette 01). Raison : la page garde toute la hauteur, la barre se déplace et se replie ; c'est ce qui
   rend Excalidraw lisible. Une bande reste possible par le profil (`dock` en haut, en bas, à gauche, à droite).
3. **Q3 — Bascule Dessin / Souris : commande segmentée en tête de barre (maquette 02), ou un seul bouton dont le
   libellé change (« Souris » puis « Dessin », `item-state.ts:63-66`) comme aujourd'hui ?** **Recommandation : la commande segmentée.** Raison : c'est la question que l'enseignant se pose sans
   cesse sur le bureau (« est-ce que je dessine ou est-ce que je clique ? ») ; un bouton qui change de nom montre ce
   qu'il fera, pas l'état présent.
4. **Q4 — Cadre violet de l'écran en annotation.** **Recommandation : oui, 3 px, désactivable dans les réglages de
   l'appareil (`settings`, pas le profil).**
   Raison : seul signe que l'encre est active quand la barre est repliée. Risque : il passe dans une capture si la coque
   ne masque pas la fenêtre ; C11b masque déjà nos fenêtres.
5. **Q5 — Tailles de bouton S 44 / M 48 / L 64.** **Recommandation : oui.** Raison : 36 px est sous la cible tactile ;
   les profils existants gardent leur jeton `s`, `m`, `l`, seule la valeur change.
6. **Q6 — Embarquer Inter** (les fichiers de `RoomFlow2.App/Assets/Fonts`) dans la coque et dans la version web.
   **Recommandation : oui, après lecture de sa licence** (Inter est publiée sous OFL ; le dépôt RoomFlow ne joint pas de
   fichier de licence à côté des `.ttf`, à vérifier). Raison : la charte l'impose ; sans elle, chaque système affiche une
   autre police.
7. **Q7 — Thème sombre** (la charte web en a un, `index.css:77-113`). **Recommandation : plus tard**, après les lots
   L1-L4. Raison : au tableau, la page blanche domine ; le sombre sert surtout en annotation, où la barre est déjà sur le
   bureau.
8. **Q8 — Netteté sur les écrans à 150 %.** Le trait de 1,5 est calé pour 100 % (trait de 1,5 px, toujours un bord doux)
   et 200 % (3 px pleins). À 150 % (2,25 px), aucun réglage ne le rend plein. **Recommandation : garder 1,5 et mesurer sur
   les écrans réels de la classe** (lesquels, et à quelle échelle ?). Raison : le 2 de RoomFlow serait net partout, mais
   plus lourd, contraire à « fin et moderne ».
9. **Q9 — D'où vient la barre d'annotation ?** Aujourd'hui, l'annotation montre la première barre du profil
   (`rb.css:29-33`), et les profils `defaut` et `annotation` ont les mêmes barres (`toolbar-profiles.ts:68`). La maquette
   02 montre une barre propre à l'annotation. **Recommandation : une barre `role: "annotation"` dans `toolbars`,
   éditable dans l'éditeur de profils comme les autres**, présente dans les trois profils fournis ; un profil sans elle
   garde le comportement actuel (première barre). Raison : la personnalisation de l'annotation par profil est ce que
   Jérôme a demandé ; une barre figée dans le code la retirerait. Coût : profils fournis modifiés, schéma inchangé.

## 9. Découpage en lots

Chaque lot est une chaîne `nouvelle-feature`, après le go de Jérôme sur ce cadrage. **Ordre** : L1, puis L4 et L3 (les
deux points centraux, qui ne dépendent que de L1), puis L2, puis L5.

| Lot | Contenu | Dépend de | Preuve attendue (bornée) |
|---|---|---|---|
| L1 | jetons de la charte dans `rb.css`, table d'icônes, bouton à icône + infobulle, tailles S/M/L | go | test rouge d'abord : chaque `ToolId` de `TOOL_TABLE` et chaque `ActionId` de `ACTION_TABLE` a une icône ; un `item.icon` inconnu affiche l'icône de la table, et sans icône du tout le libellé texte (jamais un bouton vide) ; mesure de netteté (§ 10) sur l'app : 0 pixel intermédiaire au bord du Rectangle, 0 frange colorée |
| L4 | barre `role: "annotation"` (Q9), bascule segmentée, bouton « nouvel onglet », cadre, avis | L1, Q3, Q4, Q9 | tests : la barre d'annotation est montrée en annotation, la première barre sinon ; fiche `c11a-coque.md` rejouée en coque (PC, Mac) ; ligne ajoutée à `c11b-coque.md` C11b-1 : le cadre violet est absent de l'image envoyée au tableau ; recadrages à 100 % de la barre comparés à la maquette 02, écarts listés un par un et justifiés |
| L3 | éditeur de profils en panneau | L1 | S1 de l'usage (barre à droite, grands boutons) joué au navigateur ; tri au pointeur testé ; recadrages comparés à 03, écarts listés |
| L2 | îlots : barre flottante déplaçable et repliable, menu, onglets, pages, annuler et zoom ; profils fournis réordonnés | L1, Q2 | essai `s5b-navigateur.mjs` adapté (sélecteurs `data-item` inchangés) ; aucune bande ne réduit la hauteur de la scène (`#stage` = hauteur de la fenêtre) ; recadrages comparés à 01, écarts listés |
| L5 | icône de l'application | Q1 | rendus de l'icône à 16, 32, 48 et 256 px relus à 100 % (aucun trait plus fin qu'un pixel à 16 et 32 px, aucun flou), puis `controle-icones.mjs` (présence et tailles du `.ico` seulement) |

## 10. Contrôle de netteté (méthode, à refaire à chaque lot)

1. Rendu à `devicePixelRatio` 2 dans Chromium sans tête (Playwright), page en 1920 × 1080.
2. Pour un bouton à icône droite (Rectangle, carré de Lucide), lecture dans le PNG de la rangée de pixels qui traverse
   ses deux bords verticaux (`ffmpeg … crop=48:1:x:y -pix_fmt gray`).
3. Critère : chaque bord est fait de pixels pleins, sans valeur intermédiaire entre le fond et le trait.
4. Relecture à 100 % des recadrages des barres (aucun agrandissement d'image).

5. Texte : rendu sans lissage sous-pixel (`--disable-lcd-text`) ; critère en RVB : aucun pixel de texte hors de la
   droite fond → encre (pas de frange rouge ou bleue). Sur `03-profils.png`, rangée 322, x 2808-2831 : `43 59 85`,
   `180 186 195`, `130 139 155`, sur la droite blanc → `#182946`.

Résultat sur les maquettes de ce tour : avec le calage, `255 … 39 39 39 … 255` (3 pixels pleins, 0 intermédiaire) ;
contre-épreuve sans calage (`viewBox="0 0 24 24"`) : `255 146 39 39 146 255` (bord à demi-teinte de chaque côté). Les
diagonales et les courbes restent lissées par nature : c'est l'anticrénelage normal, pas un flou.

**Police des rendus.** Inter n'est pas installée sur la VM. Les maquettes du dépôt la cherchent par `local("Inter")` et
retombent sinon sur Segoe UI ou la police du système. Les PNG ont été rendus avec les fichiers Inter de `roomflow2`
injectés au rendu seulement (rien n'est copié dans le dépôt) ; le script de rendu vérifie que les trois graisses sont
chargées (`Inter400, Inter500, Inter600`).

## 11. Hypothèses à revoir

- L'écran de classe type : 65 à 86 pouces, 4K, mis à l'échelle 200 % (1920 × 1080 CSS). Non vérifié : Q8.
- La barre flottante ne cache pas d'objet important : elle se déplace et se replie ; à mesurer en classe.
- Les icônes sans texte s'apprennent en une séance grâce à l'infobulle et à la même icône partout ; à vérifier avec un
  enseignant (essai court sur la maquette).
