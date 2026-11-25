# Cadrage — design-l4 (lot L4 du design : barre d'annotation, bascule segmentée, bouton accolé, cadre, avis)

Source maîtresse : `docs/plans/design-cadrage.md` (OF41, PR 51), citée et jamais refaite : § 5 (D-DS8, D-DS9), § 6,
§ 8 (Q3, Q4, Q9), § 9 (lot L4), § 10 (netteté). Lot L1 livré (PR 54) : `docs/plans/design-l1-cadrage.md`, coffre
`02_Decisions/0294-roomboard-design-bouton-icone-infobulle.md`. Annotation : `usage-c11a-annotation-cadrage.md`,
`usage-c11b-capture-cadrage.md` (P2, P5, P7, P12, P15, P22, P28, P29), coffre 0272, 0273, 0276. Cadrage autonome :
aucune question n'a pu parvenir à Jérôme ; ce qui n'a pas de source est une hypothèse (§ 4).

## 1. Demande et gabarit

Poser le lot L4 : une barre `role: "annotation"` dans `toolbars` (Q9), la bascule Dessin / Souris en commande segmentée
(Q3), le bouton accolé « nouvel onglet », l'avis « envoyé au tableau » au style de la maquette 02, le cadre violet de
3 px désactivable dans les réglages de l'appareil (Q4), aux jetons, icônes et tailles de L1 ; fusion avec
`scripts/verifier.sh --e2e : OK`.

Gabarit : **courte** (10 questions au plus ; 10 consommées). Go de Jérôme (2026-11-24 vers 19:55, sur les maquettes),
mot pour mot : « c'est franchement mieux. suis cette direction » ; il couvre le cadrage design et les recommandations du
§ 8 ; Q8 (écrans à 150 %) reste ouverte, trait 1,5 gardé. Exigence : « Je serai particulierement intransigent sur la
neteté des logos, icons, images etc... Les trait doivent etre fin et moderne ».

## 2. Décisions

| # | Point | Décision | Source | Réversible ? |
|---|---|---|---|---|
| L4-1 | Barre d'annotation dans le modèle | Une entrée de `toolbars` de rôle `"annotation"` ; la première de ce rôle sert. Dans les profils livrés, elle est **la dernière** de `toolbars` (`outils`, `pages`, `annotation`) : `toolbars[0]` reste la barre d'outils et `toolbars[1]` la barre des pages, que des tests lisent par rang (`toolbar.test.ts:377-440`, `runtime-capabilities.test.ts:52`). Schéma, `PROFILE_MINOR` et `parseProfile` inchangés (tout rôle est accepté, `toolbar.ts:376`). | Q9 (`design-cadrage.md:186-190`), go | oui |
| L4-2 | Quelle barre en annotation | Fonction unique `annotationBarOf(p)` dans `toolbar.ts` : première barre `annotation`, sinon première `tools` (comportement actuel), une barre flottante posée en haut. Lue par `App.tsx` (rendu) **et** `main.ts` (`measureBar`, épaisseur de la bande de la coque). | `App.tsx:324-330`, `main.ts:449-457` (même règle écrite deux fois) ; référence anti-refactorisation (duplication nette) | oui |
| L4-3 | Au tableau | Une barre de rôle `annotation` n'est jamais montrée au tableau, ni en bande ni flottante. | Q9 (barre propre à l'annotation) ; `App.tsx:322-323` | oui |
| L4-4 | Rangées contextuelles | Préréglages, tableau, sélection et format s'affichent sur les barres `tools` **et** `annotation` (table `CONTEXT_ROLES`) ; les préréglages vont sur `annotationBarOf` en annotation, sur la première `tools` au tableau. | `Toolbar.tsx:196-203`, `App.tsx:352-355` ; maquette 02 l. 278 (pastilles dans la barre) | oui |
| L4-5 | Identifiants dans les profils fournis | Les éléments propres à l'annotation **passent** de la barre d'outils à la barre d'annotation avec leurs ids : `annotation-pointer`, `annotation-screen`, `annotation-freeze`, `annotation-send`, `annotation-send-new`, `depot-annotation`. La barre d'outils garde l'entrée `desktop-annotation`. Les outils et actions présents dans les deux barres prennent le préfixe `ann-` dans la barre d'annotation : `ann-pen`, `ann-eraser`, `ann-eraser-mode`, `ann-arrow`, `ann-rect`, `ann-text`, `ann-undo`, `ann-desktop-annotation`. | `toolbar.ts:320-323` (id en double refusé dans tout le profil) ; `profile-edit.ts:59` (opérations par id sur tout le profil) ; sélecteurs des essais (`commun.mjs:102`) ; D-DS6 (la barre du tableau sans les commandes de bureau) | oui |
| L4-6 | Barre de `defaut` et `annotation` | `id: "annotation"`, `dock: "top"`, groupes : `annotation-pointer` · `ann-pen`, `ann-eraser`, `ann-eraser-mode` (« Gomme : partielle », gardée : elle est en annotation aujourd'hui et dans `ANNOTATION_REMOTE_ACTIONS`, `toolbar.ts:653`), `ann-arrow`, `ann-rect`, `ann-text` · `ann-undo`, `annotation-freeze`, `annotation-screen` · `depot-annotation`, `annotation-send`, `annotation-send-new` · `ann-desktop-annotation`. Actions d'annotation et zone avec `requires: ["desktopAnnotation"]` (`needs`). Une seule source pour les deux profils (`defaultToolbars`). | D-DS8 ; maquette 02 l. 278 ; `toolbar-profiles.ts:47-58`, `:68-83` | oui |
| L4-7 | Barre de `simple` | `dock: "left"` (comme sa barre d'outils), sans zone (comme aujourd'hui) : `annotation-pointer` · `ann-pen`, `ann-eraser` · `ann-undo` · `annotation-freeze`, `annotation-screen` · `annotation-send`, `annotation-send-new` · `ann-desktop-annotation` (11 boutons de 64 px, environ 760 px de haut). | `toolbar-profiles.ts:96-117` | oui |
| L4-7 bis | Barre verticale (`left`, `right`) | La barre reste une colonne (`rb.css:42`), une colonne `auto` de la grille (`layout.ts:20`) ; `measureBar` lit sa largeur (`main.ts:455`). Commande segmentée **empilée** : `.rb-seg` prend `flex-direction: column` sous `[data-dock="left"]` et `[data-dock="right"]`, « Dessin » au-dessus de « Souris », fond et rayon communs. Accolement des boutons pleins par `margin-block-start: -2px` au lieu de `margin-inline-start`. Zone de dépôt couchée : `--rb-btn` de large, 96 px de haut. Aucune règle `position` dans une règle `.rb-bar` (`App.test.tsx:389-393`). | `rb.css:41-42`, `:164` (séparateurs en colonne) ; `layout.ts:8-22` ; `main.ts:449-457` | oui |
| L4-8 | Commande segmentée | Rendu de l'action `annotation-pointer` par une table `ACTION_RENDER` de `Toolbar.tsx` (jamais un branchement sur l'id) : composant neuf `PointerSwitch`, deux `IconButton` accolés dans un fond `--rf-gray-50`, rayon `--rf-radius-lg` : « Dessin » (`pen-line`) puis « Souris » (`pointer`). Le segment de l'état présent est `aria-pressed="true"` (fond `--rf-violet-100`, icône `--rf-violet-700`). Le segment **inactif** porte `data-item=<id de l'élément>` : il est le bouton qui bascule, son libellé et son icône sont ceux qu'`ACTION_STATE` rend déjà (`item-state.ts:63-67`). Les deux portent `data-segment="draw"` ou `"mouse"`. Grisés hors annotation, comme aujourd'hui. | Q3 ; maquette 02 l. 77, 278 ; L1-3 (`pen-line` distinct de l'outil `pen`) ; `c11a-annotation-navigateur.mjs:115-120`, `Toolbar.test.tsx:428-435` (restent verts sans retouche) | oui |
| L4-9 | Bascule sans aller-retour au double clic | `AnnotationControl` gagne `pointer(mode)` (en file, sans effet si le mode est déjà celui-là ; `toggle` devient `pointer(autre)`). `ToolbarHost` gagne `pointer?(mode)` ; le segment l'appelle ; `runAction("annotation-pointer")` reste `toggle`. | `annotation.ts:139-144`, `:244-248`, `:345-355` ; `toolbar-host.ts:31-35`, `:66` | oui |
| L4-10 | Bouton accolé « nouvel onglet » | `annotation-send` et `annotation-send-new` en boutons pleins (classe `rb-primary` posée par une table `PRIMARY_ACTIONS` : fond `--rf-violet-600`, icône blanche ; grisé : fond `--rf-gray-50`, icône `--rf-gray-500`). Accolés par CSS quand ils se suivent (2 px entre eux au lieu de 4), carrés à `--rb-btn`. Icônes de L1 : `board` et `plus`. Action directe, sans menu. | D-DS8 ; maquette 02 l. 78-79, 278 ; coffre 0273 (la fenêtre principale n'est que la bande : un menu déroulant y serait rogné) ; table d'icônes L1 (`icons.ts:118-119`) | oui |
| L4-11 | Zone de dépôt | `Drop` rend l'icône `drop` (Lucide `file-down`, tracé du `<symbol id="i-drop">`, maquette 02 l. 236), le libellé en `rb-sr` (le `textContent` reste « Déposer ici ») et l'infobulle de L1 (`Bubble` exportée d'`IconButton.tsx`) ; cadre 1,5 px pointillé `--rf-gray-500`, rayon `--rf-radius-lg`, 96 px × `--rb-btn`. | maquette 02 l. 80 ; coffre 0294 ; `Toolbar.tsx:62-69`, `rb.css:66` | oui |
| L4-12 | Où est dessiné le cadre | Par la fenêtre `annotate` : un `div.rb-annot-frame` ajouté par `annotate-start.ts`, `position: fixed; inset: 0`, `box-shadow: inset 0 0 0 3px var(--rf-violet-600)`, `pointer-events: none`, montré quand `html[data-cadre="1"]`. Il borde la zone d'annotation (l'écran moins la bande de la barre). | Q4 ; D-DS9 ; maquette 02 l. 76 ; coffre 0273 (deux fenêtres découpées dans l'écran) ; `charte.md:18` (violet = cadre de l'annotation) | oui |
| L4-13 | Transport du réglage vers `annotate` | `DocumentPayload.frame?: boolean` (absent : vrai), posé par `enter` et `load` ; `createAnnotationPage` reçoit `frame?(on: boolean)` et l'applique à chaque document ; le faux hôte publie `annotationCadre` (`"1"`/`"0"`). | `annotation-port.ts:120-124`, `:158-161` (patron `opaque`, C11b P15, P28) | oui |
| L4-14 | Réglage de l'appareil | Module neuf `device-settings.ts`, sur le patron du dossier partagé de la bibliothèque (`app/library.ts:374`, clé `roomboard.bibliotheque.partage`, `kv` injecté, `null` : mémoire seule) : `kv: KeyValue | null` (`profile-store.ts:4`, `browserKeyValue` `:149`, le même `settingsKv` que `main.ts:250`), clé `roomboard.annotation.cadre` (espace `roomboard.<zone>.<réglage>`), `"non"` écrit seulement quand le cadre est masqué (absent : affiché). Bouton `data-reglage="cadre"` dans le panneau Réglages, « Cadre de l'annotation : affiché » / « masqué », montré seulement si la capacité `desktopAnnotation` est vraie. | Q4 (« `settings`, pas le profil ») ; U11 et C1 P7 (réglages de l'appareil = `localStorage`) ; `engine/settings.ts:1-5`, `:68` (les `settings` existants sont des réglages du moteur lus dans l'adresse, non gardés, absents d'`annotate`) | oui |
| L4-15 | Image envoyée sans cadre | Aucun code de capture ne change. Le cadre n'entre pas dans l'image : `annotation_capture` cache `annotate` et `main` 250 ms avant la capture (C11b P22) ; l'encre part en fragment du document, jamais en pixels (P2) ; le cadre est du DOM, pas un élément du document. Même chose pour « Figer le bureau » (même capture). | `usage-c11b-capture-cadrage.md:56`, `:76` | — (constat) |
| L4-16 | Avis « envoyé au tableau » | Bandeau non modal au style de la maquette (fond blanc, rayon `--rf-radius-xl`, filet `--rf-gray-300` et `--rf-shadow-hover`, pastille 32 px `--rf-success` avec l'icône `check`, texte 16 px `--rf-gray-800`, « page N » en 600 `--rf-violet-700`). Module neuf `ui/toast.ts` et composant `Toasts` monté par `App` dans la zone de la scène (`grid-area: stage`, en bas à droite, 24 px des bords, `pointer-events: none`), `role="status"`, montré 4 s ; **caché en annotation** (ajouté à la liste `rb.css:71-74`) et effacé à l'entrée en annotation. `AnnotationDeps.sent?(page)` le déclenche ; absent : `say(sentToBoardMessage(page), "info")` comme aujourd'hui. **Une seule source du texte** : `annotation-port.ts` gagne `SENT_TO_BOARD = "envoyé au tableau"`, dont dérivent `sentToBoardMessage(n)` (inchangé à l'octet) et `sentToBoardToast(n): ToastMessage` (`{ text: "Envoyé au tableau :", strong: "page N" }`, majuscule posée par la fonction). Les autres avis restent des boîtes. | brief ; maquette 02 l. 82-85, 280 ; C11b P7 (le tableau revient avant l'avis), P12 ; `annotation.ts:343` | oui |
| L4-17 | Libellés et icônes gardés | « Souris » et « Dessin » (pas « Souris : clic au bureau ») ; la sortie garde l'icône `annotate` enfoncée et le libellé « Quitter l'annotation » ; infobulle sombre de L1. | `c11a-annotation-navigateur.mjs:100`, `:117-120` ; L1-3, L1-4 | oui |
| L4-18 | Éditeur de profils | `ROLE_LABELS` gagne `annotation: "Barre d'annotation"` ; la barre est éditable comme les autres (liste, emplacement, catalogue d'outils et d'actions). | `ProfileEditor.tsx:61`, `:286` ; `profile-edit.ts:108-121` | oui |
| L4-19 | Essais existants | Retouches **de forme**, intention gardée, listées dans la PR : sélecteurs en annotation (`c11a` l. 83, 100, 121 et `c11b` l. 252, 271 : `ann-desktop-annotation` ; `c11a` l. 112 : `ann-pen` ; `c11a` l. 109 et `c11b` l. 229 cliquent « Sélection », absente de la barre d'annotation : ils cliquent le segment « Souris » `button[data-segment="mouse"]`, qui fait `setTool("select")` par `pointer("mouse")`, même chemin `onTool` ; libellé du message « Souris → … » au lieu de « Sélection → … ») et lecture de l'avis dans le bandeau au lieu de la boîte (`c11b` l. 127-128, 182-183, 235-236, 295-296 ; en S2, l'avis d'échec de capture l. 180-181 reste une boîte, seul le second devient le bandeau). Tests Vitest qui lisent `defaut` : liste au § 3.2. Toute autre rougeur arrête la tâche. | brief ; précédent L1-9 (f) ; `toolbar.ts:322` (ids uniques : `pen`, `select`, `desktop-annotation` ne peuvent être dans les deux barres) ; avis aujourd'hui en boîte (`shell-web.ts:23`, `host-tauri.ts:249`) attendue par `waitDialog` | oui |
| L4-20 | Preuve | Essai neuf `scripts/essais/design-l4-navigateur.mjs` dans `verifier.sh --e2e` (S1, S3, S4, S5, S6) ; `--captures` : recadrages à 2x lus à 100 % et comparaison à `02-annotation-bureau.png` ; netteté par `scripts/essais/nettete.mjs` ; ligne ajoutée à C11b-1 ; section C11a-9 ajoutée à `c11a-coque.md` (gestes du § 6 bis). | brief ; `design-cadrage.md` § 9-10 ; L1-7, L1-8 | oui |
| L4-22 | Profil de test « sans barre d'annotation » | Fichier figé `apps/web/src/fixtures/profils/defaut-avant-l4.rbprofile` : `DEFAULT_PROFILE_JSON` d'`origin/main` @ 136cbbb, tel quel (aucune barre de rôle `annotation`, éléments d'annotation dans `outils`). Il remplace le `DEFAULT_PROFILE_JSON` vivant comme point de départ des copies anciennes : `oldCopy()` (`App.test.tsx:297-304`, donc `:612-619`), `oldDefault()` (`toolbar.test.ts:368-374`) et le profil « avant C11b » (`toolbar.test.ts:430-440`). Le test « première barre sinon » le lit directement. | contre-relecture du cadrage ; `fixtures/profils/` (patron existant) | oui |
| L4-21 | Rust, Wasm, CLI | Aucun fichier Rust ; les charges entre fenêtres sont du JSON entre pages, que la coque relaie sans le lire ; la CLI ne lit ni profil ni réglage de l'appareil : aucune commande, format ni champ d'état ne change (D15 sans effet). Plafonds Wasm inchangés. **Aucune dépendance ajoutée** (`package.json`, `pnpm-lock.yaml`, `Cargo.lock` inchangés). | `grep` : aucun `opaque`/`base64` de charge dans `crates/roomboard-shell/src`, `apps/desktop/src-tauri/src` ; aucun `parseProfile`/`toolbar-profiles` dans `apps/cli/src` | oui |

## 3. Carte d'impact

Graphe présent (`~/.cache/graphes/roomboard/graphify-out/graph.json`, du 2026-11-24 21:38, avant la fusion de la PR 54),
interrogé ; recherche texte en plus pour les ids, sélecteurs, règles CSS et charges. Gabarit `courte` : endroits touchés
seulement, sauf les tests à garder verts.

### 3.1 Page et interface (`apps/web/src`)

| Endroit | Touché ? | Pourquoi | V/S |
|---|---|---|---|
| `toolbar.ts:648-683` | oui | `ANNOTATION_ROLE`, `annotationBarOf` (L4-2) ; `itemsForMode` inchangé | V |
| `toolbar-profiles.ts:47-58`, `:68-83`, `:102-112` | oui | annotations retirées des barres d'outils, barres d'annotation (L4-5 à L4-7) | V |
| `ui/App.tsx:322-337` (barres montrées), `:352-355` (préréglages), `:416-428` (Réglages) | oui | choix par `annotationBarOf`, barres `annotation` cachées au tableau, `Toasts`, réglage du cadre | V |
| `main.ts:449-457` (`measureBar`), `:461-481` (contrôleur), `:250` (`settingsKv`), `:490` (`mountApp`) | oui | même barre que le rendu ; `frame`, `sent` ; réglages de l'appareil | V |
| `ui/Toolbar.tsx:62-86` (`Drop`, `RENDER`), `:196` (rôles), boutons pleins | oui | `ACTION_RENDER`, `PointerSwitch`, `PRIMARY_ACTIONS`, zone à icône (L4-8, L4-10, L4-11) | V |
| `ui/IconButton.tsx:42` (`Bubble`) ; `ui/icons.ts` | oui | `Bubble` exportée ; icônes `check` et `drop` (Lucide `check`, `file-down`) | V |
| `ui/rb.css:37-66` (barre), `:70-79` (annotation) | oui | segment (empilé en colonne), `rb-primary`, accolement (ligne et colonne), zone, `.rb-toast` (caché en annotation, `:71-74`), `.rb-annot-frame` (règles de premier niveau) | V |
| `app/toolbar-host.ts:12-35`, `:66` | oui | `ToolbarHost.pointer?`, `HostTargets.annotation.pointer` | V |
| `app/annotation.ts:45-76` (deps), `:139-144`, `:179`, `:244-248`, `:296`, `:343`, `:387-402` | oui | `pointer(mode)`, `frame?`, `sent?`, hôte distant | V |
| `platform/annotation-port.ts:120-124`, `:158-161` ; `annotation-tauri.ts:85`, `:95` ; `annotation-fake.ts:88-111` | oui | `frame` dans la charge ; faux : `annotationCadre`, `annotationBande` (`<dock>:<épaisseur>`) | V |
| `app/annotation-page.ts:63-76`, `:186` ; `annotate-start.ts:24-29` | oui | cadre appliqué à chaque document ; élément du cadre | V |
| `device-settings.ts` (neuf) ; `ui/SettingsPanel.tsx:16-25`, `:51-67` | oui | réglage du cadre (L4-14) | V |
| `ui/toast.ts`, `ui/Toasts.tsx`, `ui/PointerSwitch.tsx` (neufs) | oui | bandeau, commande segmentée | — |
| `ui/ProfileEditor.tsx:61` | oui | libellé du rôle | V |
| `ui/item-state.ts:63-67` (`ACTION_STATE`) | non | relu par `PointerSwitch` tel quel | V |

Persistance `.rbprofile` : schéma inchangé, seuls les profils livrés changent. Copies d'utilisateur (`localStorage`
`roomboard.profils`) : non réécrites ; sans barre d'annotation, elles gardent la première barre `tools`. Cœur Rust,
modules Wasm, coque Tauri, CLI, autres dépôts : non touchés (L4-21).

### 3.2 Tests et essais

| Endroit | Touché ? | Pourquoi | V/S |
|---|---|---|---|
| `toolbar.test.ts` (ajouts) ; `:368-374`, `:381-386`, `:421-428`, `:430-440` | oui (ajouts ; forme) | `annotationBarOf` (annotation, sinon première `tools`, flottante en haut) ; `:381-386` et la moitié « annotation » de `:421-428` appellent `itemsForMode` sur `annotationBarOf(defaut)` au lieu de `toolbars[0]` (la moitié « tableau » reste sur `toolbars[0]`) ; `oldDefault()` et « avant C11b » partent du profil figé (L4-22) | V |
| `toolbar-profiles.test.ts:44-49`, `:52-57`, `:146-165` | oui | contenu des profils livrés : groupe `vue`, trois barres, éléments C11a dans la barre d'annotation, `requires` | V |
| `ui/App.test.tsx` (ajouts) ; `:297-304`, `:571-586`, `:600-611` | oui (ajouts ; forme) | **barre d'annotation montrée en annotation, première barre `tools` sinon (profil figé L4-22), barres `annotation` cachées au tableau**, bandeau caché en annotation ; `oldCopy()` part du profil figé (`:612-619` reste vert sans autre retouche) ; `:571-586` : `[data-toolbar="annotation"]`, `ann-pen`, vue `tool: "eraser"` → `ann-eraser` enfoncé (au lieu de `select`, absent), `ann-desktop-annotation` ; `:600-611` : `ann-eraser-mode` | V |
| `ui/ProfileEditor.test.tsx:48`, `:81` | oui (forme) | barres `["outils", "pages", "annotation"]` ; dernier élément d'`outils` : `desktop-annotation` au lieu de `depot-annotation` | V |
| `ui/Toolbar.test.tsx` (ajouts) ; `PointerSwitch`, `toast`, `device-settings`, `SettingsPanel` (tests neufs ou ajouts) | oui | segment pressé, `data-item` sur l'inactif, boutons pleins, zone à icône, réglage gardé | — |
| `app/annotation.test.ts`, `annotation-page.test.ts`, `annotation-fake.test.ts`, `annotation-tauri.test.ts`, `toolbar-host.test.ts` (ajouts) | oui | `pointer(mode)` idempotent, `frame` à `enter` et `load`, `sent` | V |
| `ui/rb-css.test.ts` (ajouts) | oui | `.rb-annot-frame` (3 px, `pointer-events: none`), `.rb-toast`, aucune `position` dans une règle `.rb-bar` | V |
| `scripts/essais/c11a-annotation-navigateur.mjs:83`, `:100`, `:109`, `:112`, `:121` | oui (forme) | `ann-desktop-annotation`, `[data-segment="mouse"]`, `ann-pen` (L4-19) | V |
| `scripts/essais/c11b-capture-navigateur.mjs:126-127`, `:175-176`, `:229`, `:236-237`, `:252`, `:271`, `:295-296` | oui (forme) | bandeau au lieu de la boîte ; sélecteurs en annotation (L4-19) | V |
| `scripts/essais/design-l4-navigateur.mjs` (neuf) ; `scripts/verifier.sh` (bloc `--e2e`) ; `scripts/tests/verifier-e2e.test.sh` | oui | S1, S3, S4, S5, S6 | V |
| `item-state.test.ts:125-128`, `:172-174` ; `Toolbar.test.tsx:46`, `:428-435` ; `c11a…:115-120` | non : à garder verts | libellé et icône de la bascule inchangés (segment inactif) | V |
| `App.test.tsx:385-401` ; `runtime-capabilities.test.ts:45-53` ; `design-l1-navigateur.mjs` ; `c1-profils-navigateur.mjs:103-117` | non : à garder verts | règles `.rb-bar` lues par regex ; `toolbars[0]` reste `outils` (L4-1) ; netteté L1 au tableau ; `allVisible` du profil simple | V |
| `stageBox(page, 640)` (c7b, c10a, c10b, c11a, c11b, c12, c13, c14, c16) | non : à garder verts | la barre du tableau perd deux boutons grisés : scène égale ou plus haute | V |

### 3.3 Documents et licence

| Endroit | Touché ? | Pourquoi | V/S |
|---|---|---|---|
| `docs/essais/c11b-coque.md:9-17` | oui | ligne C11b-1 : cadre absent de l'image envoyée ; l. 14 : l'avis devient le bandeau | V |
| `docs/essais/c11a-coque.md` | oui | section « C11a-9 — design L4 » (§ 6 bis) | V |
| `docs/essais/design-l4-*.png` (neufs) | oui | recadrages et comparaison à la maquette 02 | — |
| `THIRD_PARTY_NOTICES.md:511-525` | oui | `check` et `file-down` ajoutés à la liste Lucide | V |

### Effets de bord sur l'existant

- **Barre du tableau des profils livrés** : « Souris » et « Écran suivant », grisés au tableau, n'y sont plus (passés à
  la barre d'annotation) ; « Figer », « Envoyer… » et la zone y étaient déjà masqués. Couvert par
  `toolbar-profiles.test.ts` (mis à jour) et `c11a-annotation-navigateur.mjs:93` (entrée toujours là).
- **Épaisseur de la bande en coque** : mesurée sur la barre d'annotation, plus sur la barre d'outils, qui n'est plus
  rendue en annotation (sans le changement de `measureBar`, `querySelector` rendait `null` et la bande prenait 64 px par
  défaut). Couvert par `toolbar.test.ts` (`annotationBarOf`) et S1 (`annotationBande` du faux hôte).
- **L'avis de réussite n'est plus une boîte** : il n'arrête plus rien (ni `alert` au web, ni `dialog.message` en coque) ;
  les avis d'échec (« capture du bureau impossible… », « rien à envoyer ») restent des boîtes. Couvert par S4 et
  `c11b-capture-navigateur.mjs` (retouché, L4-19), `annotation.test.ts` (sans `sent` : `say` inchangé).
- **Bascule** : un double clic sur un segment ne revient plus en arrière (`pointer(mode)`) ; l'élément de profil et son
  action ne changent pas. Couvert par `annotation.test.ts` (ajout) et `c11a-annotation-navigateur.mjs:115-120`.
- **Panneau Réglages** : un bouton de plus quand la capacité d'annotation existe (coque, faux hôte) ; aucun au web.
  Couvert par `SettingsPanel.test.tsx` et S3.
- **Profils d'utilisateur** : inchangés ; une copie de `defaut` faite avant L4 garde ses éléments d'annotation dans sa
  barre d'outils et le comportement actuel. Couvert par `App.test.tsx` (« première barre sinon ») et `oldCopy()`
  (`App.test.tsx:298`).

### Chantiers en cours

- Worktrees : `/home/adminjd/projets/roomboard` (`main`, 136cbbb, propre) ; ce worktree. Aucun recouvrement.
- PR ouvertes : aucune (`gh pr list --state open`).
- Autre machine : aucun worktree transmis par l'orchestrateur.

### Termes cherchés

- Graphe : `graphify query "where does annotation mode choose which toolbar to show" --budget 1500` ;
  `graphify affected "itemsForMode"` ; `graphify affected "AnnotationWindows"`.
- Texte (`apps/web/src`, `scripts/essais`) : `annotation-pointer\|Souris\|Dessin` ; `role === "tools"\|"tools"` ;
  `toolbars\[0\]` ; `Déposer ici\|rb-drop\|data-toolbar=` ; `sentToBoardMessage\|envoyé au tableau\|rien à envoyer` ;
  `notify` (`platform/*.ts`) ; `browserKeyValue\|KeyValue` ; `"roomboard\.[a-z-]*"` ; `segment\|toast\|snackbar\|radiogroup\|aria-live` ;
  `doublon\|seen` (`toolbar.ts`) ; `item("…")` des essais c11a, c11b, c1 ; `waitDialog` (c11b) ; `data-dock\|flex-direction` (`rb.css`) ;
  `opaque\|annotation-document\|base64` (`crates/roomboard-shell/src`, `apps/desktop/src-tauri/src`) ;
  `toolbar-profiles\|parseProfile\|rbprofile` (`apps/cli/src`, `crates`) ; `transparent` (`tauri.conf.json`) ;
  symboles `i-check`, `i-drop` de la maquette 02.
- Coffre : « roomboard annotation barre cadre violet », « roomboard design bouton icône infobulle ».

### Modules à réutiliser ou à étendre

| Besoin du chantier | Module existant | Interface appelée ou étendue | Décision |
|---|---|---|---|
| barre montrée et mesurée en annotation | `toolbar.ts:672` (`itemsForMode`) ; règle écrite deux fois (`App.tsx:325-330`, `main.ts:451-452`) | `export const ANNOTATION_ROLE = "annotation"` ; `export function annotationBarOf(p: Profile): Toolbar \| null` (première `annotation`, sinon première `tools`, `dock` `floating` → `top`) | étendre `toolbar.ts` |
| éléments selon le mode | `toolbar.ts:672` (`itemsForMode`) | appelé tel quel sur la barre d'annotation | réutiliser |
| libellé et icône de la bascule | `ui/item-state.ts:63` (`ACTION_STATE["annotation-pointer"]`) | `itemState(item, view)` pour le segment inactif | réutiliser |
| bouton, infobulle | `ui/IconButton.tsx:75` (`IconButton`), `:42` (`Bubble`), `ui/tooltip.ts` (`createTip`) | `export function Bubble(props: { label: string; anchor: HTMLElement }): JSX.Element` | étendre |
| icônes | `ui/icons.ts` (`ICONS`, `iconFor`) | entrées `check` et `drop` | étendre |
| commande segmentée | aucun (termes : `segment`, `radiogroup`, `aria-pressed` dans `ui/`) | `ui/PointerSwitch.tsx` : `PointerSwitch(props: { item: ToolItem; view: Accessor<ToolbarView>; host: ToolbarHost }): JSX.Element` ; branché par `ACTION_RENDER: Readonly<Record<ActionId, (item: ToolItem, ctx: Ctx) => JSX.Element>>` dans `Toolbar.tsx` | nouveau module |
| bascule idempotente | `app/annotation.ts:244` (`toggle`), `:139` (`setPointer`, privé) | `AnnotationControl.pointer(mode: PointerMode): Promise<void>` ; `ToolbarHost.pointer?(mode: PointerMode): void` ; `HostTargets.annotation` : `Pick<…, "pointer">` | étendre |
| stockage de l'appareil | `app/library.ts:374` (`SHARED_FOLDER_KEY`, patron d'un réglage gardé sur l'appareil, propre à la bibliothèque) ; `profile-store.ts:4` (`KeyValue`), `:149` (`browserKeyValue`) | `device-settings.ts` : `export const FRAME_KEY = "roomboard.annotation.cadre"` ; `createDeviceSettings(kv: KeyValue \| null): { frame(): boolean; setFrame(on: boolean): boolean; onChange(cb: () => void): () => void }` | nouveau module (patron de `library.ts:374` ; `createSharedFolder` est propre au dossier et à sa boîte, non substituable) |
| panneau des réglages | `ui/SettingsPanel.tsx:29` | `SettingsPanelProps.device?: { frame(): boolean; setFrame(on: boolean): boolean; onChange(cb: () => void): () => void }` | étendre |
| réglage vers `annotate` | `platform/annotation-port.ts:120` (`DocumentPayload`), `:158-161` (`enter`, `load`) | `frame?: boolean` dans la charge et les deux options ; `AnnotationDeps.frame?(): boolean` ; `AnnotationPageDeps.frame?(on: boolean): void` | étendre |
| avis non modal | `ShellPort.notify` (`files.ts:129`) : boîte modale (`shell-web.ts:23`, `host-tauri.ts:249`), non substituable | `ui/toast.ts` : `export interface ToastMessage { readonly text: string; readonly strong?: string }` ; `showToast(m: ToastMessage, ms?: number): void` (un seul à la fois, signal de module, comme `tooltip.ts`) ; `ui/Toasts.tsx` : `Toasts(): JSX.Element` ; `AnnotationDeps.sent?(page: number): void` | nouveau module |
| faux hôte | `platform/annotation-fake.ts:88-111` | `dataset` : `annotationCadre`, `annotationBande` | étendre |
| mesure de netteté | `scripts/essais/nettete.mjs` (`pixelsOf`, `edgeRow`, `fringes`) | appelés tels quels | réutiliser |
| essais navigateur | `scripts/essais/commun.mjs` (`serve`, `loadPlaywright`, `item`, `stageBox`, `frames`) | appelés tels quels | réutiliser |

Constats d'architecture (`docs/architecture-constats.md`) : ouverts dans les zones touchées, `annotation-page.ts:35`
(`viewOf` recopie `ToolbarView`) et `toolbar.ts:634` (`ACTION_REQUIRES` recopie les `requires` livrés). Le chantier
n'ajoute ni champ à `ToolbarView` ni action : il ne les aggrave pas. `toolbar.ts:634` : les éléments déplacés gardent
`needs(…)`, le test du constat reste vert. Aucune zone « Constats à fermer ».

## 4. Hypothèses à revoir

Niveau 1 (visibles des utilisateurs ou difficiles à défaire) :

- H1 — **Stylo dans la barre d'annotation**, absent de la maquette : sans lui, après la Gomme, rien ne rend le stylo
  (« Dessin » ne bascule que depuis Souris). Le profil permet de le masquer.
- H2 — **`data-item` sur le segment inactif** (L4-8) : garde `c11a` et `Toolbar.test.tsx` verts sans retouche, et
  colle à l'ancien sens (le bouton qui bascule). Autre choix : `data-item` sur le groupe, essai retouché.
- H3 — **Bouton accolé carré, icône `plus`, sans menu** ; la maquette montre un chevron de 44 px (« … »).
- H4 — **Cadre autour de la zone d'annotation seulement** : la bande de la barre n'est pas bordée (fenêtre à part).
- H5 — **Bandeau** : 4 s, en bas à droite de la scène, seul l'avis d'envoi ; « ajouté à la page N », « PDF exporté »
  restent des boîtes.
- H6 — **« Dessin » revient au dernier outil de dessin** (`lastDraw`, Rectangle par exemple), pas forcément au Stylo.
- H7 — **La barre du tableau perd « Souris » et « Écran suivant »** (grisés au tableau) dans les profils livrés.
- H8 — **Pastilles en fin de barre, Stylo actif seulement** (rangée contextuelle) ; la maquette les montre au milieu.
  Les placer au milieu demanderait une sorte d'élément nouvelle (schéma changé, contraire à Q9).
- H9 — **Sortie** : icône `annotate` enfoncée (L1), pas la croix `close` de la maquette.
- H10 — **Réglage du cadre montré seulement avec la capacité d'annotation** (coque, faux hôte).
- H18 — **Profil exporté après L4 ouvert par une version d'avant L4** : le rôle `annotation` y est inconnu et rendu comme une barre d'outils (`App.tsx:357-374`, « tout autre rôle est une barre d'outils ») : au tableau, une bande de plus (Stylo, Gomme… ; les actions d'annotation y restent masquées ou grisées). Le fichier s'ouvre sans erreur (ids uniques, schéma inchangé). Accepté plutôt qu'une mineure de schéma ; à revoir si des postes restent sur l'ancienne version.
- H19 — « Gomme : partielle » gardée dans la barre d'annotation de `defaut` (absente de la maquette), pour ne pas retirer la gomme d'objet en annotation.

Niveau 2 :

- H11 — Clé `roomboard.annotation.cadre`, valeur `"non"` seulement quand masqué.
- H12 — Barre d'annotation de `simple` à gauche en L (≈ 760 px) : tient dans 1080 px et dans les 900 px des essais.
- H13 — Le bloc « Barre d'annotation » de l'éditeur reste visible au web (sans annotation) : il fait partie du profil
  exporté.
- H14 — Infobulle de L1 en coque : dans la bande, elle n'a ni place dessous ni dessus ; à observer (geste C11a-9).
- H15 — Cadre de 3 px à 150 % (4,5 pixels) : un bord adouci, comme le trait de 1,5 (Q8 ouverte).
- H16 — Infobulle sombre de L1 gardée ; la maquette 02 en montre une claire (`.tip.light`).
- H17 — Partage du stockage : non utilisé (le réglage voyage dans la charge, L4-13) ; rien à vérifier en coque.

## 5. Décisions d'architecture

Aucune : gabarit `courte`, tout est réversible ; les interfaces des trois modules neufs tiennent dans la liste du § 3.

## 6. Scénarios d'acceptation

Jouables sur la VM : Vitest (`pnpm -r test`) et Playwright Chromium par `scripts/verifier.sh --e2e`.

- **S1 — Barre d'annotation.** Ouvrir `?fichiers=repli&annotation=faux`, profil par défaut, entrer en annotation :
  seule `[data-role="annotation"]` est montrée (la barre `outils` est absente) ; « Dessin » est enfoncé ; cliquer
  « Souris » : `data-pointeur=mouse`, « Souris » enfoncé ; cliquer deux fois vite « Dessin » : `draw`, sans retour à la
  souris ; `annotationBande` vaut `top:<hauteur de la barre d'annotation>`. Quitter : la barre d'outils revient, sans
  barre d'annotation ni « Souris ».
- **S2 — Profil sans barre d'annotation, et éditeur** (Vitest, `App.test.tsx`). Une copie de `defaut` d'avant L4 :
  en annotation, la première barre `tools` est montrée, comme aujourd'hui. Avec `defaut` : l'éditeur montre « Barre
  d'annotation » ; masquer `ann-text` : le bouton Texte n'est plus dans la barre d'annotation, la barre d'outils garde
  le sien.
- **S3 — Cadre désactivable.** Faux hôte : Réglages, « Cadre de l'annotation : affiché » → « masqué » ; entrer :
  `annotationCadre=0` ; recharger la page : toujours masqué ; réafficher, entrer : `annotationCadre=1`. Vitest : la page
  d'annotation pose `data-cadre` selon la charge ; au web sans faux hôte, le bouton n'existe pas.
- **S4 — Envoi et avis.** `&encre=1`, entrer, « Envoyer au tableau » : le tableau revient sur la page 2 de 3, aucune
  boîte, le bandeau « Envoyé au tableau : page 2 » est en bas à droite de la scène, puis disparaît ; réentrer,
  « Envoyer dans un nouvel onglet » (bouton accolé) : onglet « Capture du bureau » montré, même bandeau (page 1).
- **S5 — Netteté et maquette.** 1920 × 1080 à 2x, `--disable-lcd-text`, en annotation : rangée du milieu de
  `ann-rect` = `255 … 39 39 39 … 255` (0 pixel intermédiaire) ; 0 frange sur la barre, sur le segment enfoncé
  (`#4F35C4` sur `#EDE8FD`), sur « Envoyer au tableau » (blanc sur `#6044EB`) et sur le texte du bandeau ; toutes les
  icônes calées sur la grille ; avec `--captures`, recadrages de la barre et du bandeau comparés à
  `02-annotation-bureau.png`, écarts listés (§ 6 ter).
- **S6 — Profil « Simple » en annotation (barre verticale).** Faux hôte, 1280 × 900, choisir « Simple (grands
  boutons) », entrer : `[data-toolbar="annotation"][data-dock="left"]` est la seule barre ; `annotationBande` vaut
  `left:<largeur de la barre>` (lue par `getBoundingClientRect`, arrondie au-dessus) ; une seule colonne (tous les
  boutons au même `x`) ; chaque bouton de la barre est entier dans la fenêtre (patron `allVisible` de
  `c1-profils-navigateur.mjs:103`) ; « Souris » est sous « Dessin », collé ; « Envoyer dans un nouvel onglet » est
  2 px sous « Envoyer au tableau ».

### 6 bis. Gestes à rejouer en coque (PC Windows, Mac), section C11a-9 de `c11a-coque.md`

- C11a-1 : la bande est la barre d'annotation (pas la barre d'outils), à sa juste épaisseur, du côté de son `dock` ;
  profil « Simple » : bande à gauche, grands boutons, rien de coupé.
- C11a-3 : la commande segmentée montre l'état présent ; « Souris » laisse cliquer le bureau, « Dessin » rend l'encre ;
  le cadre ne bloque aucun clic à travers.
- C11a-4 : sortir par le bouton de la barre d'annotation, par Échap, par Alt+F4 (Cmd+W).
- C11a-5 : déposer une image sur la zone à icône : même comportement.
- C11a-6 : « Écran suivant » : le cadre suit l'écran de l'annotation.
- C11a-8 : fenêtre maximisée, entrer puis sortir.
- Neuf : cadre de 3 px, net, visible tout autour de la zone d'annotation (à 100 %, 150 %, 200 %) ; réglage « masqué » :
  aucun cadre à l'entrée suivante ; infobulle d'un bouton dans la bande : visible ou rognée (H14) ; après « Envoyer au
  tableau », le bandeau en bas à droite, aucune boîte système.
- C11b-1 (ligne ajoutée) : dans l'image envoyée au tableau, aucun liseré violet sur les bords (cadre absent de la
  capture).

### 6 ter. Écarts attendus à la maquette 02 (à confirmer sur les recadrages)

Bande pleine largeur au lieu d'un îlot et pas de poignée (L2 ; fenêtre principale opaque en coque) ; Stylo et « Gomme : partielle » en plus
(H1, H19) ; `pen-line` sur « Dessin » (L1-3) ; pastilles en fin de barre (H8) ; bouton accolé `plus` carré (H3) ; sortie
`annotate` enfoncée (H9) ; infobulle sombre (H16) ; cadre et bandeau hors de la barre (fenêtre `annotate`, retour au
tableau : C11b P7).

## 7. Hors périmètre

- Îlots flottants, poignée, barre repliable, profils fournis réordonnés (L2) ; éditeur en panneau (L3) ; icône de
  l'application (L5).
- Bandeau pour les autres avis de réussite ; thème sombre (Q7) ; Inter embarquée (Q6) ; mesure sur écrans à 150 % (Q8).
- Durcissement des capacités de la coque (`c11a-coque.md`, point connu) ; coque Tauri, cœur Rust, CLI : rien à changer.
- Autres dépôts : aucun endroit touché.

Estimation : **8 tâches** (modèle et profils livrés ; choix et mesure de la barre, éditeur ; segment, bouton plein,
zone, icônes, colonne ; profil figé et retouches des tests Vitest ; cadre et réglage de l'appareil ; bandeau ; essai `design-l4` et retouches c11a / c11b ; captures,
comparaison et fiches).

## 8. Portes immédiates

Aucune.
