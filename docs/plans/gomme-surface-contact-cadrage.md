# Cadrage — gomme à la surface de contact (OG25)

Cadrage autonome (étage 1, aucune question parvenue à Jérôme), écrit le 2026-11-27 sur `origin/main` @ `53a14b6e`.

## 1. Demande et gabarit

Jérôme, mot pour mot :

> « Pour la gomme ajoute la detection tactile d'epaisseur. je m'explique:
> Si j'utilise le doigt ou un stylet la surface de point est classique et mesurable. Si j'utlise plusieurs doigt, la paume ou le poing la surface de contact est plus garnde et il faut une bascule automatique vers une gomme proportionelle en taille à la surface detecté puis retour sur l'outil precedent à la perte de contacte »

En une phrase : une paume, un poing ou trois doigts serrés posés sur le tableau gomment tout seuls, à la taille du
contact, et l'outil d'avant reste en place au lever.

Gabarit : **chantier** (40 questions au plus ; 35 tranchées ci-dessous).

### Ce que les navigateurs donnent comme géométrie de contact

| Moteur | Ce qui est établi | Source | Vérifié ? |
|---|---|---|---|
| Spécification | `PointerEvent.width` / `height` : taille du contact **en px CSS** ; sans géométrie du matériel, le navigateur « MUST return a default value of `1` » ; la valeur « MAY be updated on each event » (§ 4.1). `pointermove` doit partir quand la géométrie (`width`, `height`) change, même sans déplacement (§ 4.2.4). | [W3C Pointer Events 3](https://www.w3.org/TR/pointerevents3/) | lu |
| MDN | `width` en px CSS, défaut 1, « Baseline widely available » depuis 2020. `Touch.radiusX` / `radiusY` : rayon de l'ellipse de contact en px CSS, pas Baseline. | [MDN PointerEvent.width](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/width), [MDN Touch.radiusX](https://developer.mozilla.org/en-US/docs/Web/API/Touch/radiusX) | lu |
| Windows (sous WebView2 et Chromium) | Le pilote donne `rcContact`, le rectangle du contact en pixels ; « if the device does not report a contact area, this field defaults to a 0-by-0 rectangle ». | [POINTER_TOUCH_INFO](https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-pointer_touch_info) | lu |
| Chromium (WebView2, Chrome, Android) | Blink construit ses événements de pointeur à partir des points de contact. Un relecteur a noté « Width/height should be radius*2 » : le rayon servait alors tel quel de largeur. Le correctif a été suivi à part (crbug 731725), son état n'a pas été vérifié. Chromium peut donc rendre la **moitié** de la taille réelle. | [codereview 2860663006](https://codereview.chromium.org/2860663006) | lu, issue de suite non lue |
| WebKit (Safari, iPadOS) | `width` / `height` ajoutés aux événements de pointeur en 2018 (r236378). Ce que reçoit le toucher n'est pas documenté. Le bug « exposer le rayon du toucher » est toujours ouvert (dernière modification le 2026-01-12). | [WebKit 189867](https://bugs.webkit.org/show_bug.cgi?id=189867), [WebKit 133642](https://bugs.webkit.org/show_bug.cgi?id=133642) | lu ; valeurs réelles non vérifiées |
| WebKitGTK (coque Tauri Linux) | Aucune source trouvée. | — | non vérifié |

Conséquence : la géométrie est **facultative, de taille incertaine (rayon ou diamètre) et d'unité physique variable**
(un px CSS vaut environ 0,2 mm sur un iPad et 0,4 à 0,9 mm sur un écran interactif de 75 à 86 pouces, selon la mise
à l'échelle). La détection doit échouer du côté sûr : une valeur sous-estimée ne bascule pas, ce qui redonne le
comportement d'aujourd'hui.

## 2. Décisions

| # | Point | Décision | Source | Réversible ? |
|---|---|---|---|---|
| 1 | Où vit la détection | Côté TS, dans le routeur d'entrées, l'unique décideur du rôle d'un geste (`router.ts:1-7`, `board-session.ts:439`). Seuils et calculs dans un module pur neuf `engine/input/contact.ts`. Aucun octet Wasm ajouté. | brief (Wasm sous plafond, détection TS, fonctions pures) ; `router.ts:2` | oui |
| 2 | Lecture de la géométrie | L'échantillonneur lit `width` / `height` de l'événement envoyé (pas des fusionnés) et les met sur le `GestureEvent` (champ facultatif `contact`), seulement quand ils sont valides. | `sampler.ts:18-27` (patron du champ `palm`, posé seulement quand il est vrai, `sampler.ts:125`) | oui |
| 3 | Géométrie absente | `width` et `height` tous deux ≤ 1, non finis ou absents : pas de géométrie, aucune bascule par la taille. Le 1 est le défaut W3C, le 0 celui de Windows. | W3C § 4.1 ; `rcContact` Microsoft ; brief point 8 | oui |
| 4 | Repli `Touch.radiusX` / `radiusY` | **Pas construit dans ce lot.** Sous Chromium, les deux viennent du même point de contact : rien n'est gagné. Sous WebKit, rien n'est mesuré, et ce repli augmenterait le risque de fausse bascule sur iPad (déc. 7). | codereview 2860663006 ; WebKit 133642 | oui (à revoir, H1) |
| 5 | Qui peut basculer | Seulement `pointerType === "touch"`. Le stylet (même large) et la souris ne basculent jamais. Le bouton gomme du stylet reste la gomme manuelle. | brief point 1 ; `router.ts:75-83` | oui |
| 6 | Mesure d'un contact | Taille D = `max(width, height)` en px CSS. Le maximum, et non l'aire, capte le tranchant de la main (allongé, environ 70 × 20 mm), geste naturel pour effacer. | demande (« paume ou poing ») | oui |
| 7 | Seuil « contact large » | **D ≥ 80 px CSS.** Un doigt (10 à 20 mm à plat) fait 23 à 46 px sur un écran interactif à 100 %, 30 à 67 px sur un portable tactile ; une paume ou un poing (50 à 100 mm) fait 115 à 230 px à 100 % et 77 à 150 px à 150 %. Une fausse bascule efface, un oubli dessine comme aujourd'hui : le seuil penche vers l'oubli. Chromium peut rendre le rayon (déc. table § 1) : l'erreur va alors vers l'oubli. | calcul ci-contre ; § 1 | oui (constante, à revoir H2) |
| 8 | Fenêtre de détection | Un contact peut basculer dans les **250 ms** qui suivent sa pose, pas après. La paume s'étale en quelques images (`pointermove` à chaque changement de géométrie, W3C § 4.2.4). 250 ms dépasse les 150 ms du second doigt (`SECOND_FINGER_MS`, `router.ts:11`) pour laisser arriver un troisième doigt. Au-delà, un trait au doigt bien parti n'est jamais transformé en gomme. | `router.ts:11` ; brief point 5 (« premières images du contact ») | oui (constante) |
| 9 | Trois doigts serrés | **3 contacts ou plus posés en même temps** (tous encore posés : trois tapes rapides ne comptent pas), le dernier posé dans la fenêtre du premier, dont les centres tiennent dans une boîte de **160 px CSS** au plus de côté, avec au moins un contact qui porte une géométrie : bascule. Trois doigts côte à côte font 35 à 60 mm entre les centres extrêmes, soit 80 à 140 px sur un écran interactif à 100 %. Deux personnes au tableau sont plus éloignées. Aujourd'hui, le troisième doigt est ignoré (`router.ts:85`) : aucun geste existant n'est pris. | `router.ts:85` ; brief point 6 | oui (constantes) |
| 10 | Deux doigts | Deux doigts gardent toujours leur geste (pincement ou défilement, `router.ts:88-98`), qu'ils bougent ensemble ou s'écartent. Ils ne basculent que si l'un d'eux est large (déc. 7). Le nombre seul (deux) ne bascule jamais. | brief point 6 ; `router.ts:88-98` | oui |
| 11 | Sans géométrie, trois doigts | Pas de bascule : la règle des trois doigts exige au moins un contact qui porte une géométrie. Lecture stricte du brief (« garde le comportement d'aujourd'hui »). | brief point 8 | oui (à revoir, H3) |
| 12 | Ce qui bascule | Au déclenchement, tous les contacts tactiles posés forment le **groupe gomme** (les déc. 13 et 32 garantissent qu'aucun n'a un geste établi) : un trait commencé se ferme par `abort` (rien n'est écrit, `pen.ts:118`) ; un déplacement de vue seul, encore dans sa fenêtre, est défait (`panBy` inverse du cumul) ; un pincement encore dans sa fenêtre s'arrête. Un contact déjà ignoré (troisième doigt tardif) le reste. Un nouveau contact posé à 160 px au plus de la boîte du groupe le rejoint (paume découpée en plusieurs contacts) ; un contact plus loin est ignoré. | `gesture.ts:9-12` (`abort` : rien n'est écrit) ; `pen.ts:4` ; brief point 5 | oui |
| 13 | Trait au doigt établi | Si un trait au doigt a dépassé sa fenêtre, un contact large posé ensuite garde le comportement d'aujourd'hui (ignoré) et le trait continue, comme le second doigt tardif d'aujourd'hui. | `router.ts:99` | oui |
| 14 | Outil main, barre d'espace | Avec l'outil Main ou l'espace tenu, aucune bascule : tout geste déplace la vue. | D17, `router.ts:76`, `router.ts:100` | oui |
| 15 | Stylet posé pendant la gomme | Un stylet qui touche ferme la gomme automatique par `abort` (rien n'est écrit), même en réglage « Paume : souple ». Une main posée pour écrire n'est pas une gomme. Un toucher posé quand le stylet touche déjà reste ignoré par l'échantillonneur. | `sampler.ts:164-168` (D18) ; brief point 1 | oui |
| 16 | L'outil courant ne change pas | **Le routeur donne l'outil « eraser » au geste**, comme il le fait déjà pour le bouton gomme du stylet (`router.ts:81`). Il n'appelle jamais `engine.setTool`, qui ferait quitter l'outil courant (`leaveAll`, `engine.ts:778-784` : texte validé, sélection vidée). L'outil et ses options sont donc intacts au lever (pour les outils qui peuvent basculer, déc. 33). La barre ne change pas pendant la bascule ; c'est l'anneau qui la montre. | `router.ts:5` (« l'outil d'un geste est fixé au début ») ; `engine.ts:778` | oui (décision d'architecture A1) |
| 17 | Position de la gomme | Centre de la boîte englobante des contacts du groupe ; le chemin de la gomme part du point de bascule. | brief point 2 (enveloppe) | oui |
| 18 | Taille de la gomme | Rayon = moitié du plus grand côté de la boîte englobante des contacts (chaque contact compté avec sa largeur et sa hauteur), **borné à 24 px minimum et 160 px maximum** (px d'écran). 24 px de rayon donne un diamètre de 48 px, au-dessus de la cible tactile de 44 px et du double de la gomme manuelle (rayon 12, `eraser.ts:13`). 160 px de rayon (320 px de diamètre, un sixième d'une vue de 1920 px) empêche un avant-bras de vider la moitié du tableau. | brief point 3 ; `eraser.ts:13` ; D-DS3 | oui (constantes) |
| 19 | Taille pendant le contact | Le rayon suit la surface **en ne faisant que grandir** pendant le contact (le plus grand vu). La commande `Erase` n'a qu'un rayon pour tout le chemin (`api.ts:70`, `commands.rs:1533-1539`). L'aperçu redessine tout le chemin au rayon courant : pour les **traits**, ce qui se voit est ce qui s'écrit. L'aperçu de la gomme partielle peint la couleur du fond le long du chemin (`canvas2d.ts:770-777`), alors que `Erase` ne coupe que les traits : une image, un texte ou une forme semblent effacés pendant le geste et reviennent au lever. **Constat accepté** : c'est déjà le cas de la gomme manuelle (D38, HL3-2), plus visible ici à cause de la taille (H13). | `api.ts:70` ; D38 ; `canvas2d.ts:770-777` | oui (décision d'architecture A2) |
| 20 | Mode de la gomme automatique | Le mode courant de la gomme (partielle par défaut, `engine.ts:367`), figé au début du geste comme pour la gomme manuelle. | `eraser.ts:4` ; `engine.ts:367` | oui (à revoir, H6) |
| 21 | Annulation | Le trait avorté n'écrit rien (`pen.ts:118`), et la gomme écrit **une** commande `Erase` au lever du dernier contact, donc une transaction et une étape d'annulation (`commands.rs:1`, `commands.rs:1594`). Les étapes ne fusionnent jamais (`history.rs:21`, `capture_timeout_millis: 0`) : une seule commande est le seul moyen d'avoir une seule étape. Seuls les outils sans effet au `begin` peuvent basculer (déc. 33) : rien d'autre n'a été écrit avant la bascule. Une paume qui rebondit (levée puis reposée) fait deux gestes, donc deux `Erase` et deux étapes (H14). | `commands.rs:1-2`, `commands.rs:1594` ; `history.rs:21` ; brief point 5 | oui |
| 22 | Fin du geste | La gomme se ferme au lever du **dernier** contact du groupe (`end` : écrit). Un `pointercancel` d'un contact le retire du groupe, et la gomme continue avec les autres ; si c'était le dernier, elle se ferme par `cancel` (rien d'écrit, D39). Un stylet la ferme par `abort` (déc. 15). Le rejet de paume du pilote Windows peut annuler un contact large ou ne jamais le transmettre (H15). | brief point 4 ; `eraser.ts:74` ; `gesture.ts:9-12` | oui |
| 23 | Retouche d'image et orbite 3D ouvertes | Aucune bascule : la retouche prend tous les gestes, et l'orbite prend l'appui sur son objet et renvoie l'appui à côté à l'outil courant (`engine.ts:708-714`, `missedOrbit`). Le moteur expose `gesturesToTools(): boolean` (faux si une retouche est active ou une orbite ouverte), et le routeur le lit avant de basculer. Une paume y garde donc le comportement d'aujourd'hui du doigt, y compris un trait tracé à côté de l'objet 3D (constat accepté). | `engine.ts:704-716` | oui |
| 24 | Anneau de la gomme | Un anneau DOM (`pointer-events: none`), posé dans la scène au centre et au rayon de la gomme, affiché seulement pendant la bascule. Il ne dépend ni du rendu Canvas 2D ni du rendu WebGL2, et il reste visible en annotation transparente, où l'aperçu de la gomme partielle n'est pas peint (`canvas2d.ts:777`). Trait de 1,5 px violet `--rf-violet-600` doublé d'un filet blanc de 1 px, sans remplissage. | brief point 7 ; D-DS5 (accent unique) ; D-DS4 (trait 1,5) ; `canvas2d.ts:775-777` | oui (porte visuelle, H7) |
| 25 | Réglage | « Gomme automatique à la paume », **actif par défaut**, gardé sur l'appareil par `DeviceSettings` (clé `roomboard.gomme.paume`, valeur `non` quand il est coupé, absente sinon : patron du cadre, `device-settings.ts:9-10`). Jamais dans le profil ni dans l'adresse. | brief point 7 ; `device-settings.ts:4-6` (L4-14) | oui |
| 26 | Où se règle-t-il | Un bouton `data-reglage="gomme-paume"` dans le panneau Réglages (`SettingsPanel.tsx`), affiché **sur toutes les plateformes**, par une prop neuve. La prop `device` reste réservée au cadre (H10 de design-l4 : seulement avec la capacité d'annotation, `App.tsx:641`). Le panneau d'options (`OptionsPanel.tsx`) n'est pas touché. | brief (« toucher le moins possible le panneau d'options ») ; `SettingsPanel.tsx:29-31` | oui |
| 27 | Raccourci clavier | **Ctrl+Maj+H** (Cmd+Maj+H sous macOS) coupe ou rallume le réglage, avec un toast « Gomme automatique à la paume : active / coupée ». Ctrl+Maj+E est pris par l'export PDF du chantier personnalisation-2b (non fusionné) ; Ctrl+Maj+G, F, P, L, S sont pris ; Ctrl+Maj+K reste au navigateur ; Ctrl+Maj+Q quitte Chrome sous Linux ; Ctrl+Maj+U est la saisie Unicode de GTK. Sous macOS, ⌘⇧H ouvrirait la page d'accueil dans Chrome et Safari (non vérifié) : sans effet dans la coque Tauri (WKWebView, sans menu de navigateur), le bouton du panneau reste le repli sur le web. | `shortcuts.ts:4-26` ; branche `feat/personnalisation-2b` (`shortcuts.ts`, « export-pdf … Ctrl+Maj+E ») | oui (à revoir, H5) |
| 28 | CLI | **Rien à faire.** La CLI pilote le document (commandes `new`, `state`, `run`, `apply`, `import`, `export`, `convert`, `library`, `backgrounds`, `main.ts:36-48`) et ses opérations (`ops.ts:13`, `Erase` compris), jamais les réglages d'outil ni de l'interface. `Erase` ne change pas. | `apps/cli/src/main.ts:36-48`, `ops.ts:13` ; profil § CLI (D15) | — |
| 29 | Empreinte S6 | **Non touchée.** Elle mesure le pot sur des zones fermées (`zone-s6-banc.test.ts:1-3`), et ni le cœur, ni le pot, ni le contour ne changent. Elle reste verte sans relevé neuf. | `zone-s6-banc.test.ts:1-3` ; `docs/essais/c8-porte-s6.md` | — |
| 30 | Fenêtre d'annotation | La gomme automatique y marche aussi (même `createBoardSession`, `annotate-start.ts:60`). Le réglage y arrive **par le canal du cadre** : `main.ts:516` → `app/annotation.ts:79`, `:152` → `DocumentPayload` + `palmEraser?: boolean` et `palmEraserField` (patron `frame` / `frameField`, `platform/annotation-port.ts:133-137`) → `annotation-page.ts:214`, qui le pose dans une variable lue par `SessionShared.palmEraser` (`annotate-start.ts`). Absent : actif (charge d'avant ce lot). | `platform/annotation-port.ts:128-137` ; `app/annotation.ts:79`, `:151-152`, `:193`, `:307` ; `annotation-page.ts:214` ; `main.ts:516` | oui |
| 31 | Essais navigateur | `PointerEvent` synthétiques envoyés sur `#stage` (`pointerType`, `pointerId`, `width`, `height`, `clientX/Y`, `buttons`). L'échantillonneur supporte déjà une capture refusée (`sampler.ts:169-173`). Témoin en plus : un toucher CDP avec `radiusX` relève ce que Chromium remonte comme `width` (rayon ou diamètre), consigné dans `docs/essais/`. | brief ; `sampler.ts:169-173` ; `gomme-trait-epais-navigateur.mjs:89-90` | oui |
| 32 | Geste de vue établi | Si un autre contact tactile tient un **défilement ou un pincement établi** (au-delà de sa fenêtre de 250 ms), aucune bascule : le contact large ou le troisième doigt garde le comportement d'aujourd'hui (il devient la seconde moitié du pincement s'il arrive pendant un défilement, `router.ts:94-97` ; il est ignoré pendant un pincement, `router.ts:85`). | `router.ts:85`, `router.ts:94-97` ; contre-relecture, bloquant 1 | oui |
| 33 | Outils qui peuvent basculer | Seulement les outils **sans effet au `begin`** : Stylo, Gomme, Rectangle, Ellipse, Ligne, Flèche, Pot (ils n'écrivent ou n'agissent qu'au relâché : `pen.ts:118`, `shape.ts:95-107`, `fill.ts:32-44`). **Sélection, Texte et Tableau ne basculent pas dans ce lot** : leur `begin` agit tout de suite (Sélection remplace ou vide la sélection, `select.ts:178`, `:182`, et `abort` ne la rend pas, `:205` ; Texte valide la saisie ouverte, une étape de plus, ou ouvre une boîte, `text.ts:131-136` ; Tableau valide la saisie ou ferme la grille, `table.ts:283-290`). Différer leur `begin` de 250 ms pour un toucher retarderait chaque appui et changerait le minutage d'essais existants. L'outil est lu à la pose du premier contact du groupe. | `select.ts:178-205` ; `text.ts:131-136` ; `table.ts:278-290` ; contre-relecture, bloquant 2 | oui (à revoir, H16) |
| 34 | Paume après un stylet vu | La paume bascule aussi quand le doigt seul déplace la vue (`finger: "pan"`, défaut, `settings.ts:38`, après un stylet vu) : effacer de la paume en écrivant au stylet est l'usage visé. Une paume posée puis levée sans stylet efface donc un disque, là où elle déplaçait la vue (H17). | demande (« paume ») ; `settings.ts:38` ; `router.ts:100` | oui |
| 35 | Identifiant du geste gomme | Le groupe ouvre son geste sous un **identifiant réservé négatif** (compteur du routeur : -1, -2…), jamais celui d'un contact : le moteur range les gestes par identifiant (`engine.ts:712`), le contact porteur peut se lever avant les autres, et son `pointerId` peut être redonné à un nouveau toucher. `roleOf` de chaque contact du groupe rend `"erase"`. | `engine.ts:704-728` ; contre-relecture | oui |

### Règle finale de partage avec le zoom et le défilement

1. Stylet et souris : comme aujourd'hui, jamais de bascule.
2. Un contact tactile **large** (D ≥ 80 px) dans les 250 ms qui suivent sa pose bascule en gomme, sauf : outil Main ou
   espace tenu ; outil Sélection, Texte ou Tableau ; retouche ou orbite ouverte ; trait au doigt, défilement ou
   pincement déjà établi (au-delà de 250 ms) par un autre contact ; réglage coupé. Dans ces cas, rien ne change par
   rapport à aujourd'hui.
3. **Trois contacts tactiles ou plus posés en même temps**, le dernier dans les 250 ms du premier, centres dans une
   boîte de 160 px au plus, au moins un avec géométrie, mêmes exceptions : bascule.
4. **Deux doigts** : pincement et défilement inchangés (`router.ts:88-98`), qu'ils s'écartent ou bougent ensemble.
5. Après la bascule : la vue ne bouge plus jusqu'au lever du dernier contact ; un stylet posé annule la gomme.

Raison : le zoom et le défilement n'utilisent que deux doigts (`router.ts:57-65`, `pinchPair`), et le troisième doigt
est aujourd'hui ignoré (`router.ts:85`). Un geste de vue établi n'est jamais interrompu (déc. 32). La règle ne prend
aucun geste existant. Les seuls cas qui changent : le troisième doigt serré posé tôt, qui ne faisait rien, et la paume
après un stylet vu, qui déplaçait la vue (déc. 34).

## 3. Carte d'impact

Graphe : `~/.cache/graphes/roomboard/graphify-out/graph.json` (13 833 nœuds, mis à jour le 2026-11-27 à 17:58).
Recherche texte en plus, pour les chaînes et les clés.

### Interface : entrées et gestes

| Endroit | Touché ? | Pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/engine/input/sampler.ts:51` (`PointerLike`) | oui | ajoute `width?`, `height?` | V |
| `apps/web/src/engine/input/sampler.ts:18` (`GestureEvent`), `:185`, `:210` | oui | champ facultatif `contact`, posé sur `start` et `move` seulement si la géométrie est valide | V |
| `apps/web/src/engine/input/router.ts:13` (`RouterOptions`), `:21` (`RouterDeps`) | oui | `autoEraser` (accesseur, lu à chaque pose) et `ring?` | V |
| `apps/web/src/engine/input/router.ts:40-147` (rôles, `onStart`, `onMove`, `onClose`) | oui | rôle `palm`, groupe gomme, fenêtre de 250 ms, défaire le déplacement, abandon par le stylet | V |
| `apps/web/src/engine/input/router.ts:156` (`roleOf`) | oui | rend `"erase"` pour un contact du groupe (la traînée déléguée s'arrête, `trail-style.ts:11`) | V |
| `apps/web/src/engine/input/gesture.ts:14-19` (`GestureSink`) | oui | méthode facultative `resize?(pointerId, radiusPx)` | V |
| `apps/web/src/engine/input/predict.ts:139` (`withPrediction`) | oui | relaie `resize` | V |
| `apps/web/src/engine/input/contact.ts` | oui (neuf) | fonctions pures et seuils | — |
| `apps/web/src/engine/input/middle-pan.ts` | non | bouton du milieu de la souris | V |
| `apps/web/src/engine/input/keys.ts:104` (`appShortcut`) | oui | `"palm-eraser"` sur Ctrl+Maj+H | V |
| `apps/web/src/engine/input/keys.test.ts` | oui (ajout) | Ctrl+Maj+H rend `"palm-eraser"`, hors champ de saisie | V |
| `apps/web/src/engine/input/stats.ts:115` | non | compteurs du banc, aucun neuf | V |
| `apps/web/src/proto/stylet.ts:169` | non | prototype, n'utilise pas le routeur | V |

### Moteur et outils

| Endroit | Touché ? | Pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/engine/engine.ts:704-728` (`sink`) | oui | `resize` relayé à l'outil du geste (`owner`) | V |
| `apps/web/src/engine/engine.ts:150-215` (`Engine`), `:711-716` | oui | `gesturesToTools(): boolean` (ni retouche active ni orbite) | V |
| `apps/web/src/engine/engine.ts:778` (`setTool`) | non | jamais appelé par la bascule (déc. 16) | V |
| `apps/web/src/engine/tools/tool.ts:124` (`GestureTool`) | oui | `resize?` facultatif | V |
| `apps/web/src/engine/tools/eraser.ts:15-87` | oui | rayon du passage modifiable (le plus grand) ; en gomme d'objet, la sonde repart du début quand le rayon grandit | V |
| `apps/web/src/engine/tools/pen.ts:113-118` | non | `abort` n'écrit déjà rien | V |
| `apps/web/src/engine/tools/select.ts:178-205`, `text.ts:131-136`, `table.ts:278-290` | non | leur `begin` agit tout de suite : ces outils ne basculent pas (déc. 33), leur comportement au toucher reste celui d'aujourd'hui | V |
| `apps/web/src/engine/tools/shape.ts:95-107`, `fill.ts:32-44` | non | `begin` sans effet, `abort` n'écrit rien : peuvent basculer | V |
| `apps/web/src/engine/render/canvas2d.ts:774`, `webgl2.ts:390` | non | l'aperçu lit `EraserPreview.radius` à chaque image | V |
| `apps/web/src/engine/render/trail-style.ts:11` | non | lit `roleOf` à chaque déplacement | V |
| `apps/web/src/engine/settings.ts` | non | les réglages du moteur passent par l'adresse ; le nouveau est un réglage de l'appareil | V |

### Session, réglages, interface

| Endroit | Touché ? | Pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/app/board-session.ts:63` (`SessionShared`), `:406-421` | oui | `palmEraser?: () => boolean` (absent : actif) ; accesseur `autoEraser` ; anneau branché | V |
| `apps/web/src/app/eraser-ring.ts` | oui (neuf) | anneau DOM de la gomme | — |
| `apps/web/src/device-settings.ts:85` (`DeviceSettings`) | oui | `palmEraser()`, `setPalmEraser(on)` | V |
| `apps/web/src/main.ts:262`, `:538` | oui | passe le réglage à la session et au panneau | V |
| `apps/web/src/annotate-start.ts:40-60` | oui | variable du réglage, posée par la page d'annotation et lue par `SessionShared.palmEraser` | V |
| `apps/web/src/platform/annotation-port.ts:128-137` (`DocumentPayload`, `frameField`) | oui | `palmEraser?: boolean`, `palmEraserField` | V |
| `apps/web/src/app/annotation.ts:79`, `:151-152`, `:193`, `:307` | oui | `palmEraser?(): boolean` à côté de `frame?()`, champ ajouté aux deux envois | V |
| `apps/web/src/app/annotation-page.ts:214` | oui | lit `p?.palmEraser !== false` à côté du cadre | V |
| `apps/web/src/platform/annotation-fake.ts`, `annotation-tauri.ts` | non | relaient la charge telle quelle (patron `frameField`, « même code pour la coque et le faux hôte ») | S |
| `apps/web/src/ui/SettingsPanel.tsx:20-85` | oui | bouton `gomme-paume`, prop neuve | V |
| `apps/web/src/ui/App.tsx:423-434`, `:633-642` | oui | raccourci Ctrl+Maj+H et toast ; prop du panneau | V |
| `apps/web/src/ui/shortcuts.ts:4-26` | oui | ligne « Gomme automatique à la paume », Ctrl+Maj+H | V |
| `apps/web/src/ui/rb.css` (fin du fichier) | oui | `.rb-eraser-ring` | V |
| `apps/web/src/ui/rb.css:181` (`.rb-stage`, `touch-action: none`) | non | déjà sans geste du navigateur | V |
| `apps/web/src/ui/OptionsPanel.tsx`, `tool-options.ts` | non | panneau d'options laissé aux chantiers OG12 et OG23 | V |
| `apps/web/src/ui/Toolbar.tsx`, `toolbar.ts:102` | non | la barre ne change pas pendant la bascule | V |
| `apps/web/src/app/stage-tags.ts` | non | l'essai lit l'anneau lui-même | S |

### Persistance

| Endroit | Touché ? | Pourquoi | V/S |
|---|---|---|---|
| `localStorage` `roomboard.gomme.paume` | oui (neuf) | réglage de l'appareil | — |
| format `.roomboard`, `.rbprofile` | non | rien n'est enregistré dans le document ni dans le profil | V |

### Cœur Rust, Wasm, export

| Endroit | Touché ? | Pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core/src/commands.rs:1533` (`cmd_erase`) | non | un rayon, un chemin, une transaction : suffisant | V |
| `crates/roomboard-core/src/ink/erase.rs` | non | coupe au rayon réel (OG20) inchangée | V |
| `crates/roomboard-core/src/history.rs:21` | non | étapes jamais fusionnées : une commande, une étape | V |
| modules Wasm (principal 1 572 864 o, formats 3 145 728 o) | non | aucun code Rust ajouté | V |
| exports PDF, IWB, UBZ | non | ne lisent que le document | V |

### Autres dépôts, CLI

| Endroit | Touché ? | Pourquoi | V/S |
|---|---|---|---|
| `apps/cli/src/main.ts:36-48`, `ops.ts:13` | non | aucune commande, opération, format ni champ d'état neuf (D15) | V |
| `apps/desktop` (coque Tauri) | non | aucune capacité neuve | V |
| autres dépôts | non | — | V |

### Tests (non touché = à garder vert sans réécriture)

| Endroit | Touché ? | Pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/engine/input/contact.test.ts` | oui (neuf) | seuils, géométrie absente, enveloppe, bornes | — |
| `apps/web/src/engine/input/router.test.ts` | oui (ajouts) | règle des gestes ; les cas existants n'ont pas de géométrie et restent verts | V |
| `apps/web/src/engine/input/sampler.test.ts:100-146` | oui (ajouts) | `contact` posé ou absent ; les `toEqual` existants restent verts (clé absente sans géométrie) | V |
| `apps/web/src/engine/input/predict.test.ts` | oui (ajout) | `resize` relayé | S |
| `apps/web/src/engine/tools/eraser.test.ts` | oui (ajouts) | rayon qui grandit, une seule `Erase` | V |
| `apps/web/src/engine/engine.test.ts` | oui (ajout) | `resize` relayé, `gesturesToTools` | S |
| `apps/web/src/device-settings.test.ts` | oui (ajout) | clé, défaut, stockage qui refuse | V |
| `apps/web/src/platform/annotation-port.test.ts`, `app/annotation.test.ts`, `app/annotation-page.test.ts` | oui (ajouts) | champ `palmEraser` écrit seulement s'il est donné, lu à la charge ; tests du cadre verts | V (fichiers) |
| `apps/web/src/ui/SettingsPanel.test.tsx:130-152` | oui (ajout) | bouton neuf ; les tests du cadre restent verts | V |
| `apps/web/src/ui/shortcuts.test.ts:59` | non | l'unicité des ids reste vérifiée | V |
| `apps/web/src/ui/App.test.tsx`, `app/board-session.test.ts` | oui (ajout) | raccourci et toast ; branchement | S |
| `apps/web/src/engine/zone-s6-banc.test.ts` | non | empreinte S6 inchangée | V |
| `scripts/essais/gomme-paume-navigateur.mjs` | oui (neuf) | scénarios S1 à S8, ajouté à `verifier.sh --e2e` et `scripts/tests/verifier-e2e.test.sh` | — |
| `scripts/essais/gomme-trait-epais-navigateur.mjs:89-96` | non | toucher CDP au rayon par défaut, loin des 80 px | V |
| `scripts/essais/design-l1…l3`, `personnalisation-1a`, `personnalisation-2` `-navigateur.mjs` | non | touchers d'un seul point | S |
| `scripts/essais/design-l4-navigateur.mjs:29` | non | bouton du cadre inchangé | V |
| `scripts/essais/cli-essai.mjs` | non | CLI inchangée | V |

### Effets de bord sur l'existant

1. Un troisième doigt serré posé dans les 250 ms, sur un écran qui donne la géométrie, gomme. Aujourd'hui il est ignoré
   (`router.ts:85`). Test : `router.test.ts`, « trois doigts serrés gomment ; trois doigts éloignés ou tardifs
   gardent le pincement ».
2. Un doigt qui s'élargit dans ses 250 ms abandonne son trait (rien n'est écrit) au lieu de le garder. Test :
   `router.test.ts`, « un trait avorté à la bascule n'écrit rien », et S7.
3. Après un stylet vu, une paume gomme au lieu de déplacer la vue (`fingerPansAfterPen`). Le défilement fait pendant la
   fenêtre est défait. Test : `router.test.ts`, « paume après stylet : gomme, vue revenue ».
4. Un stylet posé ferme la gomme automatique sans rien écrire, même en « Paume : souple ». Test : `router.test.ts`.
5. `GestureEvent` porte un champ `contact` sur les appareils qui donnent la géométrie. Seul le routeur le lit. Test :
   `sampler.test.ts` (clé absente sans géométrie, présente sinon).
6. Le panneau Réglages gagne un bouton sur toutes les plateformes. Test : `SettingsPanel.test.tsx` ; S8.
7. La table des raccourcis gagne Ctrl+Maj+H, et le menu des raccourcis l'affiche. Test : `shortcuts.test.ts:59`
   (unicité), `keys.test.ts` et `App.test.tsx`.
8. Un défilement ou un pincement établi n'est jamais interrompu par une paume ni par un troisième doigt (déc. 32). Test :
   `router.test.ts`, « paume posée pendant un pincement établi : ignorée, le pincement continue » et « paume posée
   pendant un défilement établi : devient la seconde moitié du pincement, comme aujourd'hui ».
9. Avec Sélection, Texte ou Tableau, une paume garde le comportement d'aujourd'hui (déc. 33). Test : `router.test.ts`,
   « outil Sélection, contact qui grandit : aucune gomme, `begin` de la sélection une seule fois » ; S2 (variante).
10. Le `pointercancel` d'un contact du groupe ne ferme pas la gomme tant qu'un autre contact reste (déc. 22). Test :
    `router.test.ts`.
11. La charge d'annotation porte un champ `palmEraser` quand le réglage est donné. Test : `annotation-port.test.ts`,
    `annotation-page.test.ts`.

### Chantiers en cours

- `feat/personnalisation-2b` (`~/projets/roomboard-wt/personnalisation-2`, non fusionné, conflit en cours sur
  `icons.test.ts`) : touche `board-session.ts`, `engine.ts`, `engine/input/keys.ts`, `main.ts`, `ui/App.tsx`,
  `ui/shortcuts.ts`, `ui/rb.css`. Il réserve **Ctrl+Maj+E** (export PDF), `S` et `G` seuls. Conflits attendus : petits
  ajouts aux mêmes tables. Le raccourci choisi l'évite.
- `fix/portrait-pleine-largeur` (OG24, `~/projets/roomboard-wt/portrait-pleine-largeur`) : touche `board-session.ts`
  (ascenseur près de `fit`), `engine.ts`, `engine/input/keys.ts` (`scrollKey`), `main.ts`, `ui/rb.css`. Recoupe peu
  (autres fonctions des mêmes fichiers).
- PR ouvertes : aucune (`gh pr list --state open` : `[]`).
- Autre machine : rien n'a été signalé.

### Termes cherchés

- Graphe : `graphify affected "createRouter"`, `graphify affected "createEraserTool"`,
  `graphify query "contact geometry width height touch palm eraser" --budget 1200`.
- Texte (`grep -rn`, `apps/web/src`) : `radiusX|radiusY|ev\.width|e\.width|contact\b|TouchEvent|touchstart` (aucune
  lecture de la géométrie aujourd'hui) ; `createRouter|createSampler|fingerPansAfterPen|cancelTouchesOnPen` ;
  `erasers|EraserPreview` ; `cursor` ; `capture_timeout|UndoManager::with` (`crates/`) ;
  `Erase|Batch|transaction` (`commands.rs`) ; `eraser|gomme|palm|paume|settings|réglage` (`apps/cli/src`) ;
  `data-reglage` (tests et essais) ; `dispatchTouchEvent|pointerType: "touch"` (`scripts/essais`) ;
  `Ctrl+Maj` (`shortcuts.ts`, `main` et `feat/personnalisation-2b`) ; `editImage|orbitModel` ;
  `6044EB|--rf-violet` (`rb.css`) ; `touch-action`.
- Web : « Chromium Windows touch PointerEvent width height contact area WM_POINTER rcContact » ; « Safari iOS
  PointerEvent width height touch » ; pages lues : W3C PE3, MDN (deux), Microsoft `POINTER_TOUCH_INFO`, codereview
  Chromium 2860663006, WebKit 189867 et 133642.

### Modules à réutiliser ou à étendre

| Besoin du chantier | Module existant | Interface appelée ou étendue | Décision |
|---|---|---|---|
| Décider le rôle d'un geste tactile | `engine/input/router.ts:53` (`createRouter`) | `RouterOptions` + `readonly autoEraser: boolean` (accesseur) ; `RouterDeps` + `ring?(c: { readonly x: number; readonly y: number; readonly radius: number } \| null): void` ; rôle interne `"palm"` ; `roleOf` rend `"erase"` pour un contact du groupe | étendre |
| Lire la géométrie du contact | `engine/input/sampler.ts:98` (`createSampler`) | `PointerLike` + `readonly width?: number; readonly height?: number` ; `GestureEvent` + `readonly contact?: { readonly width: number; readonly height: number }` (posé si `contactGeometry` n'est pas null) | étendre |
| Seuils, géométrie, enveloppe | aucun (termes : `radiusX`, `contact`, `e.width` : rien) | `engine/input/contact.ts` : `LARGE_CONTACT_PX = 80`, `CLUSTER_PX = 160`, `CLUSTER_COUNT = 3`, `DETECT_MS = 250`, `AUTO_ERASER_MIN_RADIUS_PX = 24`, `AUTO_ERASER_MAX_RADIUS_PX = 160` ; `contactGeometry(width?: number, height?: number): { width: number; height: number } \| null` ; `isLargeContact(g: { width: number; height: number } \| null): boolean` ; `interface ContactBox { readonly x: number; readonly y: number; readonly width: number; readonly height: number }` (0 × 0 sans géométrie) ; `isTightCluster(boxes: readonly ContactBox[]): boolean` ; `eraserCircle(boxes: readonly ContactBox[]): { x: number; y: number; radius: number }` (centre de la boîte englobante, rayon borné) | nouveau module (A3) |
| Gommer le long d'un chemin, aperçu, une écriture | `engine/tools/eraser.ts:26` (`createEraserTool`) | `GestureTool.resize?(pointerId: number, radiusPx: number): void` : rayon monde = `max(rayon, radiusPx / zoom)` ; en mode objet, `checked = 0` quand il grandit | étendre |
| Faire passer le rayon jusqu'à l'outil | `engine/input/gesture.ts:14-19` (`GestureSink`), `predict.ts:139`, `engine.ts:704` | `resize?(pointerId: number, radiusPx: number): void` relayé tel quel | étendre |
| Savoir si les outils reçoivent les gestes | `engine/engine.ts:711-716` (choix de `owner`) | `Engine.gesturesToTools(): boolean` | étendre |
| Abandonner un trait sans rien écrire | `CloseReason "abort"` (`gesture.ts:9-12`), `pen.ts:118` | `gestures.close(id, "abort")` | réutiliser |
| Défaire le déplacement de vue | `ViewSink.panBy` (`gesture.ts:21-24`) | `panBy(-dx, -dy)` du cumul du contact | réutiliser |
| Réglage gardé sur l'appareil | `device-settings.ts:113` (`createDeviceSettings`, patron `FRAME_KEY`) | `palmEraser(): boolean` ; `setPalmEraser(on: boolean): boolean` (vrai si gardé ; notifie `onChange`) ; `PALM_ERASER_KEY = "roomboard.gomme.paume"` | étendre |
| Bouton de réglage | `ui/SettingsPanel.tsx:36` | prop `palmEraser?: DeviceSettings` (bouton `data-reglage="gomme-paume"`, libellés `PALM_ERASER_LABELS`) | étendre |
| Réglage dans la fenêtre d'annotation | `platform/annotation-port.ts:133-137` (`DocumentPayload.frame`, `frameField`), `app/annotation.ts:152` (`frameOf`), `annotation-page.ts:214` | `DocumentPayload` + `readonly palmEraser?: boolean` ; `palmEraserField(o: { readonly palmEraser?: boolean }): { readonly palmEraser?: boolean }` ; `AnnotationDeps.palmEraser?(): boolean` ; page : `d.palmEraser?.(p?.palmEraser !== false)` | étendre |
| Raccourci et toast | `ui/shortcuts.ts:4` (`SHORTCUTS`), `engine/input/keys.ts:104` (`appShortcut`), `ui/toast.ts` | ligne `palm-eraser` ; `appShortcut` rend `"palm-eraser"` ; toast existant | étendre, réutiliser |
| Anneau de la gomme | aucun (termes : `cursor`, `erasers`, `EraserPreview` : rien pour un anneau) | `app/eraser-ring.ts` : `createEraserRing(stage: HTMLElement): { show(c: { x: number; y: number; radius: number } \| null): void; dispose(): void }` (une écriture de style par image, `requestAnimationFrame`) | nouveau module (A4) |

## 4. Hypothèses à revoir

### Niveau 1 : difficiles à défaire ou visibles des utilisateurs

- **H1** — Le repli `Touch.radiusX` / `radiusY` n'est pas construit (déc. 4). Sur un appareil qui ne remplit que
  `radiusX`, rien ne bascule. À revoir après une mesure sur iPad ou Android.
- **H2** — Seuil de 80 px CSS (déc. 7), calculé et non mesuré. Il est à calibrer sur l'écran interactif (ENI) de Jérôme,
  à sa mise à l'échelle réelle : relever D pour un doigt, un pouce à plat, une paume, un poing. Sur iPad, si WebKit
  donne la géométrie, un pouce à plat (environ 105 px) pourrait basculer.
- **H3** — Sans géométrie, trois doigts ne gomment pas (déc. 11, lecture stricte du brief). La demande de Jérôme
  (« plusieurs doigts ») plaiderait pour l'inverse.
- **H4** — Le rayon ne fait que grandir pendant le contact (déc. 19) : une paume qui se relève à moitié garde sa
  grande gomme.
- **H7** — Anneau violet de 1,5 px doublé de blanc (déc. 24) : à montrer à la porte visuelle de fin de lot (netteté
  § 10 ; un cercle est lissé par nature).
- **H8** — La barre d'outils ne montre pas la gomme pendant la bascule (déc. 16).
- **H13** — Pendant le geste, l'aperçu de la gomme partielle repeint le fond sur les images, textes et formes, qui
  reviennent au lever (déc. 19), comme avec la gomme manuelle, mais jusqu'à 320 px de large.
- **H16** — Sélection, Texte et Tableau ne basculent pas (déc. 33). Les faire basculer demande de différer leur `begin`
  pour un toucher.
- **H17** — Après un stylet vu, une paume posée sans intention gomme un disque au lieu de déplacer la vue (déc. 34).

### Niveau 2

- **H5** — Raccourci Ctrl+Maj+H (déc. 27) : non pris par Chrome ni Edge à notre connaissance ; Firefox l'utilise
  (historique), et Firefox n'est pas une cible.
- **H6** — Le mode courant de la gomme (partielle ou objet) vaut aussi pour la gomme automatique (déc. 20).
- **H9** — Fenêtre de 250 ms (déc. 8) et boîte de 160 px des trois doigts (déc. 9), non mesurées.
- **H10** — Le chemin de la gomme part du point de bascule : la zone touchée avant la bascule (moins de 250 ms) n'est
  couverte que par le rayon.
- **H11** — Un pincement interrompu par la bascule n'est pas défait (seul le défilement à un doigt l'est).
- **H14** — Une paume qui rebondit (levée puis reposée) fait deux étapes d'annulation (déc. 21).
- **H15** — Le rejet de paume du pilote Windows (bit « Confidence » des écrans HID) peut annuler un contact large, ce
  qui ferme la gomme sans écrire, ou ne jamais le transmettre : non vérifié, à observer à l'essai sur l'écran interactif.

## 5. Décisions d'architecture

**A1 — La bascule fixe l'outil du geste, pas l'outil courant.**
Contexte : changer l'outil (`setTool`) fait quitter le précédent (`leaveAll` : texte validé, sélection vidée), qui ne
reviendrait pas intact.
Décision : le routeur ouvre le geste avec l'outil « eraser », comme pour le bouton gomme du stylet (`router.ts:81`).
Conséquences : l'outil et ses options restent tels quels ; Sélection, Texte et Tableau, dont le `begin` agit, ne basculent pas (déc. 33) ; la barre ne bouge pas ; l'anneau seul montre
la bascule. Réversible : allumer la gomme dans la barre pendant le geste reste possible plus tard.

**A2 — Un seul rayon par passage, le plus grand vu.**
Contexte : `Erase` porte un rayon pour tout le chemin, et les étapes d'annulation ne fusionnent jamais (`history.rs:21`).
Décision : le rayon ne fait que grandir ; l'aperçu redessine tout le chemin au rayon courant ; une commande `Erase` au
lever.
Conséquences : une étape d'annulation, ce qui se voit est ce qui s'écrit, aucun octet Wasm. Réversible : un rayon par
point (`radii` facultatif dans `Erase`) pourra venir plus tard, avec la CLI (D15).

**A3 — Module pur `engine/input/contact.ts`.**
Contexte : seuils et calculs doivent se tester à part (brief), et le routeur est déjà long de règles.
Décision : constantes et quatre fonctions pures (interface § 3) ; le routeur les appelle et garde l'état des contacts.
Conséquences : tests sans DOM ; les seuils changent en un seul endroit. Réversible.

**A4 — Anneau en DOM, hors des rendus.**
Contexte : deux rendus (Canvas 2D, WebGL2) et un mode transparent qui ne peint pas l'aperçu de la gomme partielle.
Décision : `app/eraser-ring.ts`, un élément `pointer-events: none` dans la scène, piloté par le routeur en px d'écran.
Conséquences : aucun changement des deux rendus ; visible en annotation. Réversible.

**A5 — Réglage de l'appareil, pas du moteur ni du profil.**
Contexte : les réglages du moteur se lisent dans l'adresse (`settings.ts:2-3`) et ne sont pas gardés ; le brief veut un
réglage gardé sur l'appareil.
Décision : `DeviceSettings` (patron du cadre, L4-14), accesseur lu à chaque pose de contact.
Conséquences : aucun changement de `.rbprofile` ni de l'adresse ; un poste partagé garde son choix. Réversible.

## 6. Scénarios d'acceptation

Jouables dans `scripts/essais/gomme-paume-navigateur.mjs` (Chromium de Playwright, application construite servie en
local, `deviceScaleFactor` 2) par des `PointerEvent` synthétiques sur `#stage`, profil par défaut, outil Stylo.
**Chaque scénario part d'une page rechargée** : un stylet vu fait déplacer la vue au doigt (`finger: "pan"`, défaut,
`settings.ts:38`), ce qui fausserait les scénarios suivants. Les paumes sont posées petites (`width` 30) puis grandies
après le `pointerdown`, comme une vraie paume qui s'étale.

- **S1 — Doigt fin dessine.** Toucher (`width` 20, `height` 20) glissé sur 300 px : un trait de plus au document,
  aucun anneau, outil Stylo toujours enfoncé.
- **S2 — Paume gomme à la bonne taille puis retour à l'outil d'avant.** Tracer un trait horizontal (souris), puis
  choisir la couleur et l'épaisseur voulues. Toucher posé à `width` 30, grandi à `width` 140, `height` 120 dans les
  100 ms, puis glissé verticalement à travers le trait :
  l'anneau est visible, de diamètre 140 ± 2 px pendant le glissé ; au lever, l'anneau disparaît, le trait est coupé
  par un trou d'environ 140 px sur son axe, le bouton Stylo est toujours enfoncé ; un trait au doigt fin a la couleur
  et l'épaisseur choisies avant. Variante Rectangle : même paume, outil Rectangle : le trait est coupé, aucun rectangle
  neuf, le bouton Rectangle est toujours enfoncé. Variante Sélection (déc. 33) : un objet sélectionné, la même paume
  posée à côté de lui : aucun anneau, aucun trait coupé, la sélection fait ce qu'elle fait aujourd'hui (vidée par
  l'appui dans le vide), et rien n'est écrit.
- **S3 — Trois doigts serrés gomment.** Trois touchers (`width` 24) posés à 0, 40 et 80 ms, centres espacés de 30 px,
  glissés ensemble à travers un trait : le trait est coupé, aucun trait neuf, vue inchangée. Contre-épreuve : les mêmes
  à 400 px d'écart ne gomment pas.
- **S4 — Pincement à deux doigts zoome.** Deux touchers (`width` 24) qui s'écartent de 100 à 300 px : le zoom change,
  aucun trait coupé, aucun trait neuf, aucun anneau ; puis deux doigts qui glissent ensemble : la vue défile.
  Variante (déc. 32) : pendant un pincement tenu depuis 400 ms, une paume (`width` 140) posée sur un trait : aucun
  anneau, aucun trait coupé, le pincement continue.
- **S5 — Stylet large dessine.** `pointerType` « pen », `width` 150, `height` 150, pression 0,5 : un trait neuf, aucun
  anneau.
- **S6 — Appareil sans géométrie dessine.** Toucher glissé avec `width` et `height` à 1 (défaut W3C, aussi la valeur
  d'un `PointerEvent` construit sans ces champs), puis à 0 (0 × 0 de Windows) : deux traits neufs, aucun anneau. Trois
  doigts serrés à `width` 1 : aucun trait coupé. Le champ absent est couvert par `sampler.test.ts`.
- **S7 — Annulation en une étape.** Sur deux traits voisins, un toucher posé à `width` 30 qui trace 60 ms, puis grandit
  à `width` 140 (la paume s'étale) et passe sur les deux traits : au lever, aucun trait neuf (le début de trait a
  disparu), les deux traits sont coupés ; un seul Ctrl+Z les rend entiers, et un second Ctrl+Z défait l'action d'avant
  l'essai (le trait de départ).
- **S8 — Réglage coupé et gardé.** Ctrl+Maj+H : toast « Gomme automatique à la paume : coupée », bouton
  `gomme-paume` du panneau Réglages à « coupée » ; une paume (`width` 140) dessine un trait comme aujourd'hui ; après
  rechargement, le réglage est toujours coupé ; Ctrl+Maj+H le rallume.

Témoin consigné, pas porte : un toucher CDP `Input.dispatchTouchEvent` à `radiusX` 40 relève la `width` reçue (40 ou
80) dans `docs/essais/gomme-paume.md`.

## 7. Hors périmètre

- Essai sur un vrai écran tactile (ENI, Windows) et calibrage du seuil : sur un poste avec Jérôme, pas sur la VM (H2).
- Repli `Touch.radiusX` / `radiusY` (H1) ; mesures sur iPad, Android, WebKitGTK.
- Rayon variable le long du chemin (dans le cœur, `Erase` avec un rayon par point) et gomme qui rétrécit (A2).
- Anneau de la gomme manuelle (souris, stylet).
- Changer la réjection de paume du stylet (`sampler.ts:143-168`, D18).
- Dessin à plusieurs personnes en même temps au tableau.
- Toute modification du panneau d'options (OG12, OG23), du cœur Rust, des modules Wasm et de la CLI.

## 8. Portes immédiates

Aucune.

## Amendements de l'exécution (relectures de fin de lot, 2026-11-27)

Ces amendements précisent les décisions 12 et 32 et la règle 5 des gestes. Ils viennent des relectures de fin de lot
(trois relecteurs, puis deux tours de correctifs) ; chacun a ses tests dans `router.test.ts`.

- **A-1 (déc. 12, contact ignoré).** Un contact que le routeur a mis en « ignoré » (doigt posé pendant un trait) compte
  dans le groupe tant qu'il est dans sa fenêtre de 250 ms : une paume qui s'étale en deux contacts bascule quand même.
  Les contacts d'une gomme fermée passent en rôle « usé » (`spent`) : inertes, ils ne rouvrent rien.
- **A-2 (déc. 12, distance).** Le groupe ne prend que les contacts à 160 px (`CLUSTER_PX`) au plus du déclencheur.
  Raison : à deux au tableau, la paume de l'un ne doit pas avorter le trait de l'autre ni ouvrir une gomme entre eux.
  Un trait lointain garde son geste. Compromis : un doigt de la même main à plus de 160 px de la paume garde son trait.
- **A-3 (pincement).** Le partenaire d'un membre qui rejoint le groupe le rejoint aussi : une paire de pincement entre
  en entier. Il compte alors dans le cercle de la gomme (hypothèse H18 : cercle centré entre les deux, rayon plafonné).
- **A-4 (règle 5, vue figée).** À la bascule, un défilement ou un pincement tactile lointain, encore dans sa fenêtre,
  passe en « usé » : la vue ne bouge plus tant que la gomme est ouverte. Le déplacement qu'il avait déjà fait reste.
- **A-5 (déc. 32).** Un geste établi (fenêtre dépassée), où qu'il soit, bloque toujours la bascule.
- **A-6 (cible tactile).** Les boutons du panneau Réglages passent à 44 px de haut (`rb.css`) : ils mesuraient 21 px.
