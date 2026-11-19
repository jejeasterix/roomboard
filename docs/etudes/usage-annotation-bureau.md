# Étude — L'annotation de bureau

Date : 2026-11-19. Statut : étude, aucun code de produit, aucun essai de plateforme fait. Tout ce qui touche au comportement réel d'une plateforme est classé « Supposé » tant qu'une fiche d'essai (D34) ne l'a pas vérifié.

Demande de Jérôme, mot pour mot : « L'annotation de bureau » et « Un profils pourra permettre le démarrage par défaut en mode annotation de bureau. Une zone sur la toolbar en mode annotation de bureau permet de D&D les fichier afin de les ouvrir dans le Canvas, tout comme le ferrais un D&D sur le Canvas directement. » Il a acté que des fonctions seront impossibles sur Android, iPad et web : cette étude dit seulement où elles manquent.

Règle intacte : le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif. Toute la solution ci-dessous la respecte : l'encre se dessine dans une page web (la fenêtre d'overlay) ; le natif ne fait que poser la fenêtre, régler le clic à travers, capturer le bureau et passer des fichiers.

## Sommaire de la conclusion

1. Deux fenêtres Tauri (une overlay plein écran par écran, une fenêtre de barre d'outils) sont la seule solution portable pour que la barre reste cliquable. Les régions de hit-test natives sont possibles mais fragiles et à réserver à un second temps.
2. Le clic à travers de Tauri est tout ou rien par fenêtre (vérifié) ; la bascule « mode dessin / mode souris » pilotée depuis la fenêtre barre est la parade d'ActivInspire et d'ActCraft.
3. Windows et macOS : faisable. Linux : X11 / XWayland faisable, Wayland natif non (toujours au premier plan non pris en charge, vérifié).
4. Capture du bureau : à faire avant d'afficher l'overlay (bureau figé) ; permissions macOS ; Wayland passe par un portail.
5. Web et iPad : rien de l'overlay ; au mieux une capture ponctuelle par `getDisplayMedia` sur navigateur de bureau.

## Sources

### Fichiers du dépôt lus

- `docs/plans/socle-cadrage.md` : D21 (SolidJS), D22 (barre d'outils comme donnée), D23 (capacités), D26 (`FileHost`), D27 (une fenêtre = une page = une instance Wasm = un document ; CSP lot 5), D34 (essais de plateforme), DA9 (échelle de remèdes de l'encre), DA10.
- `docs/plans/socle-PLAN.md` : lot 5 (« application SolidJS ; barre d'outils depuis le profil ; barre des pages ; `FileHost` ; coque Tauri »).
- `apps/desktop/src-tauri/tauri.conf.json` : une seule fenêtre `main`, `csp: null`, aucune option de transparence.
- `apps/desktop/src-tauri/capabilities/default.json` : `windows: ["main"]`, `core:default` seulement.
- `apps/desktop/src-tauri/src/main.rs` : `tauri::Builder::default()` sans plugin ni commande.
- `apps/desktop/src-tauri/Cargo.lock` : `tauri 2.12.5`, `tao 0.37.2`, `wry 0.57.2`.
- `apps/web/src/toolbar.ts` : `ToolId = "pen" | "eraser" | "select"`, aucune notion d'annotation.

### Acquis ActCraft (`~/projets/actcraft`, lecture seule)

ActCraft (C++/Qt, abandonné) a livré l'annotation de bureau (F-070, F-071) et les outils de bureau (F-080). Ce qu'il a fait :

- `ui/src/desktopcontroller.cpp` et `ui/src/desktopcontroller.h` : une **fenêtre propre** d'annotation, créée depuis un composant QML, avec les drapeaux `Qt::Window | Qt::FramelessWindowHint | Qt::WindowStaysOnTopHint` (`windowFlags()`, l. 720-727). Le clic à travers est `Qt::WindowTransparentForInput`, ajouté ou retiré par `setPassThrough` ; c'est le principe « tout ou rien » de Tauri.
- `followTool(toolId)` (`desktopcontroller.h`, l. 111-113) : pendant l'annotation, l'outil « select » fait passer les clics au bureau, tout autre outil rend la saisie à l'annotation. C'est la bascule dessin / souris, rattachée à l'outil courant plutôt qu'à un bouton.
- Réduction de la **fenêtre principale à l'emprise de la palette**, toujours devant (`desktopcontroller.cpp`, l. 435-455 : `setFlag(Qt::WindowStaysOnTopHint, true)` puis `setGeometry(paletteRect())`) : ActCraft a donc aussi résolu « la barre reste cliquable » par deux fenêtres, la palette étant la fenêtre principale rétrécie.
- `captureBackground()` : capture asynchrone, nos fenêtres masquées d'abord (`m_hidden`, `showOurWindows`), via `QScreen::grabWindow(0)` sur l'écran principal seulement (`desktopcontroller.cpp`, l. 177-178). Limites : écran principal uniquement ; nécessite de cacher ses propres fenêtres ; pas de gestion Wayland ni d'autorisation macOS lue dans ce code.
- `toggleLiveDesktopBackground()` : « superposition » du bureau en direct sur la page affichée (P22), distincte de la capture figée.
- Paperboard propre au bureau, **gardé d'une activation à l'autre** pendant la session (P14) ; « page suivante » crée une page transparente vierge (P13). Tout cela est décrit dans `docs/plans/2026-10-18-livraison-complete-lot7-phase2-amendement.md` (tâches L7-T30, L7-T31, décision 4 bis, l. 150-185 et 1644-1665).
- Roue des outils de bureau (`DesktopToolsWheel.qml`, `desktopwheel.cpp`) : mode « outils de bureau » où la fenêtre principale est réduite et la roue ouverte.
- Pas de dépôt de fichiers sur l'annotation : `docs/specs/2026-11-09-cadre-web-webengine-cadrage.md` (E13) précise que le `DropArea` de l'annotation reste coupé. RoomBoard fait donc ici quelque chose qu'ActCraft n'a pas fait.
- Cadrage d'origine : `docs/specs/2026-10-14-livraison-complete-cadrage.md` (comportement de référence : l'application Python et ActivInspire).

### Pages web consultées

- Tauri, fenêtres JS : https://v2.tauri.app/reference/javascript/api/namespacewindow/ (page lue jusqu'à `setCursorIcon` ; la suite, dont `setIgnoreCursorEvents`, non lue).
- Tauri, configuration : https://v2.tauri.app/reference/config/ (`macOSPrivateApi`).
- Tauri, `WebviewWindowBuilder` : https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindowBuilder.html
- tao, `Window` : https://docs.rs/tao/latest/tao/window/struct.Window.html
- Tauri, issue #9250 (position du curseur, clic à travers) : https://github.com/tauri-apps/tauri/issues/9250
- Tauri, issue #11461 (webview enfant, clic à travers sous Windows 10) : https://github.com/tauri-apps/tauri/issues/11461 (lue par résumé de recherche, non ouverte).
- Tauri, graphismes Linux : https://v2.tauri.app/develop/debug/linux-graphics/ (issues #9394 et #8541 citées par les résultats de recherche, non ouvertes).
- Dépôt `xcap` : https://github.com/nashaofu/xcap
- Promethean, Desktop Annotate : https://learn.prometheanworld.com/using-desktop-annotate-in-your-lessons/
- SMART Ink : https://support.smarttech.com/docs/software/iq/4/en/teaching-tools/acetate.cshtml et https://onlinehelp.smarttech.com/english/windows/help/notebook/10_0_0/ViewingInkAwareList.htm
- ScreenCaptureKit : https://nonstrict.eu/blog/2023/a-look-at-screencapturekit-on-macos-sonoma/ et https://developer.apple.com/documentation/screencapturekit/scscreenshotmanager.md
- Couche shell Wayland : https://github.com/wmww/gtk4-layer-shell et https://gitlab.gnome.org/GNOME/mutter/-/issues/973
- Glisser-déposer Tauri : https://wyhinton.github.io/2026/01/14/Tauri-DragAndDrop-Issues

## Comment font ActivInspire et SMART

### ActivInspire (Promethean)

Vérifié (page Promethean « Using Desktop Annotate ») : « Desktop Annotate » s'ouvre depuis le tableau de bord, le menu Outils ou la boîte à outils. L'application principale se réduit et ne laisse que le navigateur de pages, la boîte à outils et la corbeille. Tous les outils de la boîte à outils restent disponibles. On sort par le bouton Desktop Annotate de la boîte à outils.

Non vérifié par une source ouverte : le détail de « Desktop Tools » (réduire ActivInspire et utiliser les outils sur le bureau) et la bascule précise souris / stylet. Comportement connu de l'usage, à confirmer sur une installation : ActivInspire fige une image du bureau ou superpose un calque transparent, et un outil « souris » rend le clic au bureau. ActCraft a repris cette logique (`followTool` ci-dessus), ce qui la corrobore indirectement.

### SMART (Ink, Notebook)

Vérifié (aide SMART) : SMART Ink écrit en encre numérique par-dessus les fenêtres ouvertes ; l'encre reste attachée à la fenêtre qu'on déplace, redimensionne ou réduit. Pour les programmes « Ink Aware » (Word, Excel, PowerPoint), l'encre peut s'insérer comme texte ou dessin ; pour les autres, elle va sur un calque transparent. Une liste « Ink Aware » active ou coupe le comportement par programme. SMART Ink est inactif quand Notebook est en mode transparent.

Deux idées à retenir et une à écarter : retenir (a) la capture d'écran annotée vers la page, (b) la barre d'outils toujours accessible ; écarter pour le socle l'attachement de l'encre à une fenêtre (il exige des hooks système et des API d'accessibilité, hors de portée d'une coque Tauri).

## Ce que Tauri 2 permet, point par point

### Fenêtre transparente plein écran toujours au premier plan

Vérifié (docs `WebviewWindowBuilder`, tao) :

- `transparent(true)` : les couleurs avec alpha < 1 donnent de la transparence ; sous Windows, `no_redirection_bitmap` peut éviter un flash blanc.
- `always_on_top(true)` / `setAlwaysOnTop` : demande la permission `core:window:allow-set-always-on-top`, absente de `core:window:default`. Sous Linux X11 le gestionnaire de fenêtres décide (suggestion) ; **non pris en charge sous Linux Wayland**, iOS et Android.
- `decorations(false)` : pris en charge sur le bureau.
- `skip_taskbar(true)` : bureau ; **non pris en charge sous macOS** ; la méthode tao est dans l'extension Unix.
- `shadow(false)` : sans effet sur une fenêtre décorée sous Windows ; non pris en charge sous Linux.
- `visible_on_all_workspaces(true)` : non pris en charge sous Windows, iOS, Android.
- `focusable(false)`, `accept_first_mouse(true)` : disponibles ; utiles pour une barre qui ne vole pas le focus de l'application annotée (à essayer).
- `macOSPrivateApi` : la documentation de configuration indique « No-op in Tauri 2.12.1+ because the APIs are always enabled now ». Le dépôt est en `tauri 2.12.5` (`Cargo.lock`) : **le réglage n'est donc plus nécessaire** pour la transparence sur macOS. Reste non vérifié : ce que cela implique pour une publication sur le Mac App Store (l'ancienne réserve venait de l'API privée).

Supposé : un plein écran réel (barre des tâches comprise) se fait par position et taille égales au moniteur plutôt que par `fullscreen: true`, qui sous macOS crée un Space dédié et tue la transparence au-dessus des autres applications. À essayer sur Mac.

Risque connu (relevé dans des résultats de recherche, tickets #8541 et #9394 non ouverts) : sous Linux, des fenêtres transparentes avec WebKitGTK peuvent ne jamais se peindre (certains GPU, KDE Wayland), et le guide Tauri des graphismes Linux liste fenêtres vides et scintillement. Contournement documenté : `WEBKIT_DISABLE_DMABUF_RENDERER=1` (NVIDIA). À mesurer sur la VM (xrdp) et sur une vraie machine.

### Clic à travers et sa limite

Vérifié : `set_ignore_cursor_events` (tao) fait passer les événements aux fenêtres du dessous ; **sur toute la fenêtre**, pas par région ; non pris en charge sous iOS et Android. Une extension communautaire (`tauri-plugin-polygon`) confirme qu'il n'existe pas de région native dans Tauri. Vérifié aussi : une fenêtre qui ignore le curseur ne reçoit plus d'événements de pointeur, donc la page ne voit pas le curseur (issue #9250, résolue par `cursor_position()` côté Rust, pas par des événements d'entrée / sortie ; le mainteneur recommande de sonder la position et de calculer l'intersection soi-même). Un ticket (#11461) signale un cas Windows 10 où une webview enfant ne laissait pas passer les clics : l'enfant n'est pas le cas visé ici (nous utilisons une fenêtre de premier niveau), mais l'essai Windows doit couvrir les deux versions de Windows.

Conséquence : une fenêtre unique « overlay + barre » ne marche pas : soit la barre est cliquable et l'overlay capte tout, soit l'overlay laisse passer et la barre meurt aussi.

### Les solutions, comparées

| Solution | Principe | Avantage | Limite |
|---|---|---|---|
| A. Deux fenêtres | overlay de dessin (plein écran, transparente) + fenêtre barre d'outils (petite, au premier plan, opaque) | Portable (Windows, macOS, X11) ; la barre reste toujours cliquable ; la bascule se fait depuis la barre ; ActCraft a fait pareil | Deux instances Wasm (D27) à relier ; ordre d'empilement des deux fenêtres à tenir |
| B. Bascule dessin / souris | `set_ignore_cursor_events(true)` sur l'overlay en mode souris ; `false` en mode dessin | Comme ActivInspire ; un seul réglage par fenêtre | Il faut un geste pour revenir en mode dessin (la barre, un raccourci global, un bouton de stylet) |
| C. Régions natives | Windows : sous-classer la fenêtre, `WM_NCHITTEST` renvoie `HTTRANSPARENT` hors des objets dessinés ; macOS : `hitTest` de la vue ; X11 : région d'entrée (XShape) ; Wayland : `wl_surface.set_input_region` | Une seule fenêtre, le bureau cliquable entre les traits | Du code natif par plateforme, fragile avec WebView2 (fenêtres enfants) ; l'overlay doit connaître la forme à chaque image |
| D. Sondage du curseur | `cursor_position()` en Rust toutes les 16 ms, bascule `set_ignore_cursor_events` selon que le curseur est sur un objet ou une barre flottante | Sans code natif plus profond | Latence et scintillement ; le stylet et le tactile ne sont pas des « curseurs » : mauvais pour l'encre |

Recommandation : A + B au socle. C seulement si Jérôme veut des objets flottants (règle, rapporteur) dans l'overlay ; D écarté pour l'encre.

### Multi-écrans

Vérifié : tao expose `available_monitors()`. Supposé et à essayer : une overlay **par écran**, positionnée sur la position physique de l'écran, vaut mieux qu'une fenêtre unique à cheval sur plusieurs écrans (mélange d'échelles DPI sous Windows, tailles de texture maximales de la WebView, comportement de `skip_taskbar`). Prix : N instances Wasm ou un seul document partagé par synchronisation Yrs (D27 prévoit la synchronisation entre fenêtres, hors socle). Compromis du socle : un seul écran à la fois (celui de la barre), choix du moniteur dans la barre.

### Stylet et pression dans une WebView transparente

Rien n'est vérifié ici, tout est supposé. Les événements de pointeur (`pointerType: "pen"`, `pressure`) existent dans WebView2 (Chromium) ; WKWebView (macOS) expose les événements de pointeur, mais la pression d'une tablette graphique n'est pas garantie hors Apple Pencil ; WebKitGTK transmet les événements de pointeur et la pression est à mesurer (le prototype du lot 1 `proto-stylet.html` sert déjà à cela). Une WebView transparente ne devrait pas changer le chemin des événements, mais il faut le prouver : refaire la mesure du lot 1 **dans l'overlay transparente** sur chaque plateforme (pression min / max, fréquence, latence). Un défaut ici ne se corrige pas par du natif sans contredire la règle de l'encre (DA9, échelon 6) : la décision reviendrait à Jérôme.

### Capture du bureau sous l'annotation

Deux comportements, comme ActCraft (`captureBackground` et `toggleLiveDesktopBackground`) :

1. **Bureau figé** : capturer l'écran avant d'afficher l'overlay (ou masquer l'overlay un instant), poser l'image en fond de la page d'overlay, annoter par-dessus. L'encre ne bouge pas avec les fenêtres. Simple et sans clic à travers.
2. **Bureau vivant** : overlay transparente, bureau réel visible dessous (ActivInspire « Desktop Annotate », SMART Ink). La capture de l'ensemble n'a lieu qu'à l'envoi.

Bibliothèques (vérifié sur le dépôt de `xcap`, licence Apache-2.0) : `xcap` capture écrans et fenêtres sous Windows, macOS, Linux X11 ; l'enregistrement vidéo est marqué en cours ; sous Wayland la page indique « ⛔ available but not fully supported in some scenarios » et liste `libpipewire` et `libdbus` en dépendances. Version et date de dernière version : non lues. Le crate `screenshots` (même auteur à l'origine) : non lu.

- **macOS** : les captures passent par l'autorisation « Enregistrement de l'écran » ; sur macOS 14 et plus, `SCScreenshotManager.captureImage` (ScreenCaptureKit) est la voie moderne, l'ancien `CGWindowListCreateImage` étant remplacé (relevé dans des articles, non vérifié dans la doc d'Apple). Premier appel : invite système ; l'application doit parfois être relancée après l'octroi (secondaire). La fiche d'essai macOS (D34) doit couvrir : invite, refus, retrait de l'autorisation.
- **Windows** : capture GDI / DXGI sans autorisation ; la fenêtre d'overlay doit être masquée pendant la capture. `set_content_protection` (tao : non pris en charge sous Linux) exclurait au contraire nos fenêtres des captures : utile pour la barre si on capture le bureau en direct.
- **Linux X11** : `xcap` ; **Linux Wayland** : pas de capture libre, il faut le portail `xdg-desktop-portal` (Screenshot ou ScreenCast + PipeWire), avec invite de l'utilisateur. Supposé, non lu dans cette étude.

### Wayland : limites réelles pour l'overlay

- Vérifié (tao) : `set_always_on_top` non pris en charge sous Wayland ; `cursor_position` renvoie 0,0 ; `decorations(false)` et `skip_taskbar` ont des bugs signalés sous KDE Wayland (tao#899, tauri#9829, relevés dans des résultats de recherche, non ouverts).
- Vérifié (recherches) : le protocole `wlr-layer-shell` (superposition au-dessus de tout) est pris en charge par les compositeurs wlroots et KDE, **pas par GNOME / Mutter**, qui commence un support expérimental à partir de Mutter 47. `gtk-layer-shell` existe pour GTK3 ; un plugin communautaire (`tauri-plugin-widgets`) l'emploie sous Tauri avec repli. Fiabilité pour une overlay interactive plein écran : non établie.
- Supposé : un client Wayland ne peut pas se positionner à des coordonnées absolues ni se garder au premier plan ; la région d'entrée (`set_input_region`) permet le clic à travers par région mais Tauri ne l'expose pas.
- Parade : lancer sous XWayland (`GDK_BACKEND=x11`) : toutes les API de fenêtre ci-dessus fonctionnent comme sous X11, la capture reste limitée. Recommandation : Linux pris en charge « X11 / XWayland » au socle, Wayland natif « au mieux, sans garantie ».

### Retour de la capture annotée vers une page du canvas

Chemin proposé (aucun octet d'encre ne traverse le natif) :

1. L'overlay compose l'image du fond figé et de l'encre dans un canvas hors écran, puis `toBlob("image/png")`.
2. L'image est remise à la fenêtre principale. Deux options : (a) commande Tauri qui écrit le PNG dans un dossier temporaire et renvoie le chemin, puis événement `emit_to("main", …)` portant le chemin ; (b) événement portant directement les octets. (a) évite de faire passer des mégaoctets par le canal d'événements (non mesuré) et réutilise `FileHost` (D26).
3. La fenêtre principale ajoute une page et y place l'image. Le socle n'a pas encore d'élément image dans le document (D2, imports d'images « à venir », `socle-cadrage.md` l. 278) : l'insertion d'image est **une dépendance ouverte**. En attendant, le lot 5b peut seulement enregistrer le PNG.
4. Variante pour plus tard : conserver l'encre vectorielle (le document de l'overlay est un document Yrs) et la fusionner à la page, au lieu d'aplatir. Dépend de la synchronisation entre fenêtres (D27, hors socle).

### Zone de dépôt de la barre d'outils

Vérifié (docs et articles) : `onDragDropEvent` d'une fenêtre ou d'une webview émet `enter`, `over` (avec `position`), `drop` (avec `paths`) et `leave` (le texte officiel lu montre `over`, `drop` et « annulé » ; `enter` et `leave` viennent d'articles). La position est en pixels physiques : la zone de dépôt (un élément du DOM) doit comparer `position / devicePixelRatio` à son rectangle. `dragDropEnabled` vaut `true` par défaut et, **sous Windows, ce gestionnaire natif remplace celui de WebView2 : le glisser-déposer HTML5 ne fonctionne plus dans la même fenêtre** ; macOS et Linux ne sont pas touchés. Un bug de `paths` aléatoires sous Windows est signalé corrigé dans wry 0.52.1 (le dépôt est en 0.57.2).

Conséquence pour la conception :

- La fenêtre barre garde `dragDropEnabled: true` ; tout réordonnancement d'outils dans la barre (profils, étude jumelle) se fait aux événements de pointeur, **jamais au glisser HTML5**.
- À l'événement `drop` sur la zone : la barre émet `open-files` vers la fenêtre principale avec les chemins ; la fenêtre principale les ouvre par le même chemin que son propre dépôt sur le canvas (un seul code d'ouverture : `FileHost`, D26).
- Les chemins déposés doivent être lisibles par le plugin de fichiers : la portée (`scope`) des permissions `fs` de `capabilities/default.json` est à régler. Supposé : Tauri ajoute les fichiers déposés à la portée ; non vérifié pour la v2.
- Quand la fenêtre principale est réduite ou masquée en mode annotation (ActCraft la réduit à la palette), elle doit tout de même recevoir l'événement et réagir : à prévoir.
- Ce que fait la zone quand le fichier est un PDF, une image ou un `.roomboard` : renvoie au lot des imports (hors socle). Au socle : seul `.roomboard` s'ouvre.

## Ce qui marche sur iPad (web) / ce qui demande la coque

| Fonction | Web (iPad, autres navigateurs) | Coque Tauri |
|---|---|---|
| Dessiner au-dessus du bureau, ou d'une autre application | **Impossible** : la page ne dessine que dans son propre onglet ou fenêtre | Windows, macOS, Linux X11 : oui (deux fenêtres) ; Wayland natif : non garanti ; Android : manque (Tauri mobile n'a pas d'overlay) |
| Clic à travers vers le bureau | **Impossible** | Oui, tout ou rien par fenêtre (`set_ignore_cursor_events`) |
| Fenêtre toujours au premier plan | **Impossible** (au mieux l'API « Document Picture-in-Picture » sous Chromium de bureau : supposé, non lu) | Oui sauf Wayland |
| Capture ponctuelle de l'écran | Partielle : `getDisplayMedia()` sur navigateur de bureau, après un geste et un sélecteur de l'utilisateur, pas sur tous les navigateurs de tablette (supposé, non lu) | Oui, sans sélecteur (autorisation macOS, portail Wayland) |
| Annoter une capture figée dans le canvas | Oui, une fois l'image obtenue | Oui |
| Zone de dépôt de fichiers | Oui sur le canvas par HTML5 `drop` (objets `File`, sans chemin) | Oui, avec chemins (`onDragDropEvent`) |
| Démarrage par défaut en annotation de bureau (profil) | Sans objet : à masquer ou à ignorer | Oui |

À prendre au lot 5b : un outil ou un mode « annotation de bureau » est une **capacité** (D23, D22) absente sur le web, Android et iPad ; la barre et le profil ne doivent pas planter quand elle manque (voir étude jumelle `docs/etudes/usage-profils-toolbar.md`).

## Vérifié

- `apps/desktop` : une fenêtre `main`, aucune transparence, aucune permission de fenêtre ; `tauri 2.12.5`, `tao 0.37.2`, `wry 0.57.2`.
- `set_ignore_cursor_events` : tout ou rien ; non pris en charge sur iOS et Android (tao).
- `set_always_on_top` : non pris en charge sous Wayland ; suggestion sous X11 (tao).
- `skip_taskbar` : non pris en charge sous macOS ; `visible_on_all_workspaces` : non pris en charge sous Windows.
- `macOSPrivateApi` sans effet depuis Tauri 2.12.1 (doc de configuration).
- Permission `core:window:allow-set-always-on-top` hors du défaut.
- `dragDropEnabled` contre glisser HTML5 sous Windows ; `cursor_position` sous Wayland : 0,0.
- Comportement de « Desktop Annotate » d'ActivInspire (réduction, boîte à outils conservée) et de SMART Ink (calque transparent, liste Ink Aware).
- Ce qu'ActCraft a fait, avec chemins (section dédiée).

## Supposé

- Pression et inclinaison du stylet dans une WebView transparente sous WebView2, WKWebView et WebKitGTK.
- Placement plein écran sans Space dédié sous macOS ; empilement de l'overlay au-dessus d'un diaporama plein écran (PowerPoint) et au-dessus des applications plein écran de macOS (le ticket tauri#9557 en parle, non lu).
- Fenêtre transparente WebKitGTK correctement peinte sur la VM et sur le matériel de Jérôme.
- Débit des événements Tauri pour une image de plusieurs mégaoctets ; ajout automatique des fichiers déposés à la portée `fs`.
- Détails d'ActivInspire « Desktop Tools » et de la bascule souris.
- Portail Wayland (Screenshot, ScreenCast), `getDisplayMedia` sur iPad, « Document Picture-in-Picture ».
- Régions de hit-test natives par plateforme (solution C).
- État et dates de `xcap` et `screenshots`.

## Recommandation pour RoomBoard

Options :

1. **Deux fenêtres + bascule dessin / souris (recommandée).** Une fenêtre d'overlay transparente par écran (un seul au socle), une petite fenêtre barre au premier plan avec la zone de dépôt ; bureau figé (capture avant affichage) comme mode de base, bureau vivant avec clic à travers comme second mode ; capture annotée renvoyée par chemin temporaire. Cohérent avec D27 (une fenêtre = un document), D26 et ActCraft.
2. **Une seule fenêtre et régions natives de hit-test.** Un geste de moins, mais du code natif par plateforme et fragile ; à n'envisager qu'après l'option 1 si des objets flottants dans l'overlay le demandent.
3. **Bureau figé seulement (sans overlay vivante).** Aucun clic à travers, aucune difficulté Wayland pour l'overlay (reste la capture) ; fonction réduite par rapport à ce que fait ActivInspire.

Ce que le lot 5 / 5b doit déjà prévoir (détail dans l'étude jumelle) :

- la table des capacités porte `desktopAnnotation` ; la barre et le profil le lisent (D22, D23) ; *correction du cadrage d'usage (2026-11-19) : le champ existe déjà (`crates/roomboard-core/src/capabilities.rs:16`), statique, vrai sous Linux même sous Wayland natif : la coque le corrige à l'exécution (cadrage d'usage, U10)* ;
- la barre d'outils doit pouvoir vivre dans **sa propre fenêtre** : son code SolidJS ne dépend d'aucune hypothèse « je suis dans la même page que le canvas » ; elle parle à la page principale par une interface de messages, pas par des variables partagées ;
- l'ouverture de fichiers passe par une seule porte `FileHost.openPaths` ou équivalent, appelée par le dépôt du canvas et par le dépôt de la zone ;
- la configuration Tauri est écrite pour **plusieurs fenêtres** : `capabilities/default.json` liste des fenêtres nommées (`main`, `annotate`, `toolbar`), CSP (lot 5) valable pour toutes, et `main.rs` n'est plus un `Builder::default()` nu ;
- ne pas utiliser le glisser HTML5 dans la fenêtre barre.

Plan d'essai proposé (une fiche par plateforme, selon D34) : (1) overlay transparente plein écran, bascule du clic à travers, barre cliquable ; (2) mesure de pression et de latence du stylet dans l'overlay (reprendre `proto-stylet.html`) ; (3) capture du bureau (invite macOS, X11, portail Wayland) ; (4) dépôt d'un `.roomboard` et d'une image sur la zone ; (5) deux écrans de tailles et d'échelles différentes. Linux sur la VM (xrdp, X11), Windows dans la file du PC, macOS par Jérôme.

## Questions ouvertes

1. Un seul écran au socle, ou une overlay par écran dès le départ ?
2. Le mode par défaut de l'annotation est-il « bureau figé » (simple, sûr) ou « bureau vivant » (comme ActivInspire) ?
3. L'encre de la capture est-elle aplatie dans une image ou gardée vectorielle (dépend de la synchronisation Yrs entre fenêtres, hors socle) ?
4. Le document d'annotation est-il gardé d'une activation à l'autre, comme le paperboard d'ActCraft (P14), et enregistrable en `.roomboard` ?
5. Wayland natif : acceptable de n'offrir que le repli XWayland ?
6. Sur quels Windows l'essai (10 et 11) et quelle version minimale de macOS (ScreenCaptureKit demande macOS 14 pour la capture ponctuelle) ?
7. Quel geste ramène du mode souris au mode dessin : bouton de la barre, raccourci global (permission système) ou bouton du stylet ?
8. Y a-t-il une image dans le modèle du document au socle (D2) pour recevoir la capture ?
