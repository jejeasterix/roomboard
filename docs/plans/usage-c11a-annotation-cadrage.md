# Cadrage — usage-c11a-annotation (C11a : annotation de bureau, fenêtre, bascule, zone de dépôt)

Date : 2026-11-23. Cadrage autonome (aucune question à Jérôme). Base : `origin/main` @ 6c97661.

## 1. Demande et gabarit

**Demande.** Livrer C11a du cadrage d'usage (`docs/plans/usage-cadrage.md:557`) : en coque (Windows, macOS, Linux
X11), une fenêtre `annotate` transparente, plein écran et au premier plan, où l'on dessine par-dessus le bureau vivant,
la fenêtre principale réduite à sa barre, une bascule dessin / souris, le démarrage en annotation par le profil, une
zone de dépôt dans la barre ; capacité absente et dite sous Wayland natif, entrée masquée sur le web, l'iPad et Android.
Mandat : « Go c11 » (Jérôme, 2026-11-23 vers 07:00) et mandat du 2026-11-19 (« Continue d'avancer autant que possible
suivant notre objectif établi. Nous ferons les tests plus tard sur la version à laquelle tu seras parvenu »).

**Gabarit.** `chantier`, cadrage court (20 questions au plus, 18 consommées). Budget total du chantier : 4 h.

**Prémisses de la demande démenties par les sources** (détail dans les décisions) :

- **Zone de dépôt (P17).** La demande relayée reprend U22 (`usage-cadrage.md:75`) : rester en annotation, menu
  « Insérer ses pages » / « Ouvrir (quitte l'annotation) », avis « ajouté à la page N » avec « Voir ». Jérôme a tranché
  après U22, par Q2 (`usage-cadrage.md:632`, 2026-11-20) : « Un fichier déposé sur la barre en annotation **quitte
  l'annotation** et montre son nouvel onglet ». Q1 (`:619-624`) dit aussi qu'un document déposé ouvre toujours un nouvel
  onglet, sans menu, et que le dépôt n'insère jamais ses pages. Q2 répond à HU1-11 (`:299-300`). Une décision de Jérôme
  l'emporte sur la spec : le menu disparaît. L'avis « ajouté à la page N » reste pour un objet.
- **Onglet d'annotation (P3, P4).** U16 (`:69`) est amendée par Q2 : l'annotation est « un onglet indépendant »
  (`kind: "annotation"`), gardé au retour pour y revenir. Correction de l'orchestrateur (2026-11-23) : le document de cet
  onglet appartient à la fenêtre principale et fait l'aller-retour `.roomboard` avec `annotate` (un message à l'entrée, un
  à la sortie) ; il s'enregistre comme tout onglet.
- **Bascule (P8).** Q2 : « L'outil sélection devient l'outil curseur Windows ou Mac. Attention la sélection des objets
  reste disponible si l'utilisateur clic sur un objet du Canvas ». Le clic à travers est tout ou rien par fenêtre
  (étude, `usage-annotation-bureau.md:94`) : il faut le couper sous les objets (DA5).
- **Permissions de fenêtre (P12).** La carte d'impact d'usage (`:151`) liste `core:window:allow-set-always-on-top`,
  `allow-set-ignore-cursor-events`, `allow-set-decorations`, `allow-set-size` et `allow-set-position`. Ces permissions
  ne servent que si la page appelle l'API JS des fenêtres. Ici, tout se règle par des commandes Rust minces (DA3) :
  aucune permission de fenêtre n'est ajoutée à la page.
- **`macOSPrivateApi`.** La transparence ne demande plus rien sous macOS : la feature `macos-private-api` est sans
  effet depuis Tauri 2.12.1 (`tauri-2.12.5/src/lib.rs:40`, lu ; dépôt en 2.12.5).

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|-------|----------|--------|--------------|
| P1 | Fenêtres | Deux fenêtres : `annotate` (transparente, sans cadre, au premier plan, hors barre des tâches) porte **son moteur** et, pendant l'annotation, une copie chargée du document de l'onglet d'annotation (P4) ; la fenêtre principale se réduit à sa barre, au premier plan, sans cadre ; sa géométrie d'avant est gardée et rendue à la sortie. | DAU2 (`usage-cadrage.md:338-345`) ; U16 (`:69`) ; étude `:96`, `:107` | oui (DA1) |
| P2 | Chemin de l'encre | L'encre se dessine dans la page de `annotate`. Aucun point d'encre ne passe par Rust ni par un événement. Entre les deux pages ne passent que des **commandes de barre** (appels `ToolbarHost`), la **vue de barre** (`ToolbarView`) et, une fois à l'entrée et une fois à la sortie, le **document entier en octets `.roomboard`** (P4) ; jamais un trait point par point. | profil, « Règles propres au projet » ; étude `:7` ; U15 (`:68`) | non (règle) |
| P3 | Onglet d'annotation | Un vrai onglet `kind: "annotation"` de la fenêtre principale (une `TabSession` ordinaire : document, historique, pages, enregistrement), créé vierge à la première entrée ; un seul à la fois. `tabs.ts` accepte `"annotation"` (la garde `ANNOTATION_NOT_YET` est retirée). Activé sur le tableau, il se montre comme un document ordinaire ; « Annotation du bureau » réutilise cet onglet s'il existe. Sa fermeture suit la règle des onglets (question s'il est modifié). | Q2 (`:625-635`, « onglet indépendant », « conservé l'onglet d'annotation afin de pouvoir ré basculé ») ; correction de l'orchestrateur (2026-11-23) ; `tabs.ts:6-8, 41` ; D27 amendée | oui (DA1) |
| P4 | Aller-retour `.roomboard` | **Entrée** : la fenêtre principale encode le document de l'onglet d'annotation en `.roomboard` (`ContainerIO.encode`, `container-io.ts:61`, `{ kind: "document" }`) et l'envoie en **un seul message** à `annotate`, qui le lit (`ContainerIO.read`, `:64`) et y dessine localement. **Sortie** (bouton, Échap, dépôt, fermeture de l'application) : `annotate` encode son document et le renvoie en un message ; la fenêtre principale le charge dans l'onglet d'annotation (document remplacé, onglet marqué modifié s'il a changé), qui s'enregistre ensuite comme tout onglet. Sans réponse de `annotate` sous 5 s : sortie quand même, onglet inchangé, avis « encre de l'annotation non récupérée ». L'envoi au tableau d'origine (fragment, capture) reste à C11b. | correction de l'orchestrateur (2026-11-23) ; demande (« aller-retour `.roomboard` ») ; Q2 ; P2 ; U21 (`:74`) pour C11b | oui (DA1, HC11-3) |
| P5 | Retour sur le tableau | Document récupéré (P4), `annotate` cachée, onglet d'annotation gardé, onglet d'origine montré, **sans question** : les choix « coller une capture dans l'onglet d'origine / dans un nouvel onglet » demandent la capture (C11b). | Q2 ; C11b (`:558`) | oui (HC11-1) |
| P6 | Entrée et sortie | Action `desktop-annotation` : libellé « Annotation du bureau » sur le tableau, « Quitter l'annotation » en annotation (bouton enfoncé). `requires: ["desktopAnnotation"]`. Ajoutée au groupe `vue` des barres livrées `defaut` et `annotation`, et à la barre `vue` de `simple`. | U16 ; U10 (`:63`) ; `toolbar-profiles.ts:56-67` | oui |
| P7 | Sortie toujours atteignable | En annotation, la barre montre `desktop-annotation` et `annotation-pointer` même si le profil ne les a pas (copie utilisateur d'avant C11a). Ajout au rendu seulement : le profil n'est pas réécrit. | patron C1 P33 (`toolbar.ts:461-493`, `ensureProfilesAccess`) | oui |
| P8 | Bascule dessin / souris | Liée à l'outil : en annotation, **Sélection = souris** (clic à travers) ; tout autre outil = dessin. Un bouton dédié `annotation-pointer` (« Souris » / « Dessin ») bascule entre Sélection et le dernier outil de dessin (Stylo par défaut). Pas de raccourci global. | Q2 ; U17 (`:70`) | oui |
| P9 | Objets en mode souris | En mode souris, le clic à travers se coupe quand le curseur est sur un objet de l'annotation ou pendant un geste tenu. Un sondage du curseur en Rust (30 ms) compare la position aux rectangles d'objets poussés par la page. Le tracé n'en dépend pas : en mode dessin, la fenêtre capte tout. | Q2 (« Attention la sélection des objets reste disponible ») ; étude `:94` (sonder et calculer l'intersection soi-même), solution D (`:105`, écartée pour l'encre seulement) | oui (DA5, HC11-7) |
| P10 | Géométrie | L'écran se découpe en une **bande de barre**, du côté du `dock` de la première barre `tools` (`floating` → haut), d'épaisseur mesurée dans la page, et une **zone d'annotation** pour le reste. Les deux fenêtres ne se chevauchent pas : il n'y a plus d'ordre d'empilement à tenir. | DAU2, conséquence « deux fenêtres au premier plan à ordonner » (`:345`) ; ActCraft `paletteRect` (étude `:35`) | oui (DA4, HC11-2) |
| P11 | Plein écran | Position et taille du moniteur, en pixels physiques. Jamais `fullscreen: true` (Space dédié sous macOS). | étude `:88` (supposé) | oui (HC11-11) |
| P12 | Réglages natifs | La création et le réglage des fenêtres passent par des commandes Rust minces `annotation_*` (DA3), qui appellent la crate. La page n'a aucune permission de fenêtre. Nouvelle capacité `capabilities/annotate.json` (`windows: ["annotate"]`, `core:default` seul : événements compris, sans fs ni dialog). `default.json` est inchangé. | `capabilities/default.json` (lu) ; `tauri-2.12.5/permissions/event/autogenerated/reference.md:10` (`allow-emit-to` dans le défaut, lu) | oui (DA3) |
| P13 | Vie de `annotate` | Créée à la première entrée (`WebviewWindowBuilder`, `index.html?fenetre=annotation`, `transparent(true)`, `decorations(false)`, `always_on_top(true)`, `skip_taskbar(true)`, `drag_and_drop(false)`, `focused(false)`). Cachée au retour, montrée à la réentrée (le document lui est renvoyé à chaque entrée, P4), détruite à la fermeture de l'onglet d'annotation. `tauri.conf.json` garde la seule fenêtre `main`. | carte d'impact d'usage (`:150`, « créée à la volée ») ; `webview_window.rs:641, 781, 1146` (lu) | oui (HC11-12) |
| P14 | Rendu transparent | Option `transparent` du rendu Canvas 2D : le pourtour (`SURROUND_COLOR`) et le fond de page sont effacés au lieu d'être peints (`canvas2d.ts:358-367`). Pas de WebGL2 dans `annotate`. La page de 1920 de large s'ajuste à la largeur de l'écran ; elle est infinie en hauteur (D5 amendée). Le cœur ne change pas. | `engine/page.ts:4-8` ; D5 amendée (`socle-cadrage.md:377-383`) | oui (HC11-15) |
| P15 | Écran | Par défaut, celui de la fenêtre principale à l'entrée. L'action `annotation-screen` (« Écran suivant ») fait le tour des moniteurs ; elle est grisée s'il n'y en a qu'un. Une seule fenêtre `annotate` à la fois. | U19 (`:72`) | oui (HC11-10) |
| P16 | Wayland | La crate détecte la session par l'environnement : `WAYLAND_DISPLAY` ou `XDG_SESSION_TYPE=wayland`, sans `GDK_BACKEND=x11`, vaut Wayland natif. La commande `annotation_support` rend `{ supported, reason }` ; `runtimeCapabilities` abaisse `desktopAnnotation` (statique ∧ détecté). Si le profil demandait l'annotation : question « Relancer en mode compatibilité ? ». La relance lance le même exécutable avec `GDK_BACKEND=x11`, puis quitte. Aucun code `layer-shell`. | U20 (`:73`) ; U10 ; DAU8 (`:389-393`) ; étude `:130-135` | oui (HC11-8, HC11-9) |
| P17 | Zone de dépôt | **Q2 prime sur U22.** Un fichier déposé sur la zone fait **quitter l'annotation** (document récupéré, onglet d'annotation gardé), puis passe par `importFiles` comme un dépôt sur le canvas de l'onglet d'origine, `at = null` : un document ouvre un nouvel onglet, qui est montré (Q1) ; un objet va sur la page montrée de l'onglet d'origine, avec l'avis « ajouté à la page N ». Pas de menu, pas d'« Insérer ses pages ». | Q2 (`:632`) ; Q1 (`:619-624`) ; HU1-11 (`:299-300`) ; U23 et U25 (`:78`) ; `workspace.ts:650` | oui |
| P18 | Dépôt natif dans la coque | En annotation, tout dépôt natif sur la fenêtre principale (réduite à la barre) compte comme un dépôt sur la zone. Le glisser HTML5 est coupé sous Windows. Un dépôt sur `annotate` est ignoré : glisser natif coupé dans la fenêtre, `preventDefault` dans la page. `main.rs` ne traite que les dépôts de `window.label() == "main"`. | étude `:148` (HTML5 coupé sous Windows) ; U24 (`:77`) ; `main.rs:334-342` | oui |
| P19 | Visibilité de la zone | Une « zone d'annotation » est une `dropzone` qui exige `desktopAnnotation`. Elle ne s'affiche qu'en annotation. Toute autre `dropzone` garde son comportement actuel. La zone « Déposer ici » est ajoutée aux barres livrées `defaut` et `annotation`. | U22 (élément livré par C11a) ; `Toolbar.test.tsx:55, 116, 150` (à garder verts) | oui (HC11-5) |
| P20 | Barre en annotation | Seule la première barre `tools` du profil s'affiche, avec sa rangée de préréglages. Onglets, scène, barre des pages et panneaux sont masqués. Les actions transmises à `annotate` : outils et préréglages, `undo`, `redo`, `eraser-mode`, pot (couleur, tolérance), format de texte. Les actions de la fenêtre principale : `desktop-annotation`, `annotation-pointer`, `annotation-screen`, dépôt. Les autres actions sont grisées. | U15 ; DAU7 (`:383-387`) | oui (HC11-4) |
| P21 | `ToolbarHost` distant | Côté principal, `createRemoteToolbarHost` envoie les appels par `emitTo("annotate", "roomboard://annotation-command", …)`. Côté `annotate`, les appels sont rejoués sur un `createLocalToolbarHost` (existant), avec le profil reçu à l'ouverture et à chaque changement. `annotate` renvoie sa vue de barre par `emitTo("main", "roomboard://annotation-view", …)`. | U15 ; `toolbar-host.ts:9-26, 81` | oui (DA2) |
| P22 | `startMode` | L'appel existant `host.setMode(resolveStartMode(...).mode)` (`App.tsx:261`) entre en annotation. Les capacités sont calculées avant le montage, après `annotation_support`. Sans capacité, repli silencieux sur `board` ; sous Wayland, la question de P16. | U14 (`:67`) ; C1 P10 ; `toolbar.ts:635-642` | oui |
| P23 | Web, iPad, Android | Entrées `requires: ["desktopAnnotation"]` masquées par `visibleItems` (existant) ; la capacité y est fausse. | U10 ; `runtime-capabilities.ts:15-24` ; `capabilities.rs:21-25` | oui |
| P24 | Clavier dans `annotate` | Ctrl+Z et Ctrl+Y agissent sur le document chargé dans `annotate` (l'historique repart du document reçu à chaque entrée). Échap demande à la fenêtre principale de quitter l'annotation (avec retour du document, P4). | défaut (ActivInspire « bouton de sortie », étude `:63`) | oui (HC11-6) |
| P25 | Fermer l'application | En annotation, la demande de fermeture fait d'abord **sortir** (document récupéré, P4), puis la garde ordinaire des onglets modifiés s'applique (`anyDirty`, inchangé). Aucune question propre à l'annotation. | correction de l'orchestrateur (2026-11-23) ; `workspace.ts:406`, `:822` | oui |
| P26 | Compatibilité | Aucun changement du format `.roomboard` (l'onglet d'annotation s'enregistre en document ordinaire ; le `kind` d'onglet n'est pas écrit dans le fichier), du schéma de profil (`PROFILE_MINOR` reste 1 ; les actions sont des chaînes ouvertes, U13) ni du cœur. Un `.roomboard` et un profil d'avant C11a s'ouvrent ; un profil C11a lu par une version plus ancienne masque les actions inconnues. | `toolbar.ts:12-14`, `:605-612` ; U13 | oui |
| P27 | Tailles Wasm | `crates/roomboard-core`, `roomboard-wasm`, `roomboard-formats` et `roomboard-formats-wasm` ne changent pas : tailles identiques à l'octet (1 374 398 et 2 794 511), plafonds inchangés. | fichier d'état, « Référence » | non (mesure) |
| P28 | Logique testable | Rust : nouveau module `roomboard_shell::annotation` (session, géométrie, choix d'écran, état et transitions, clic à travers, environnement de relance), testé par `cargo test`. TS : `app/annotation.ts` (contrôleur : transitions, bascule, routage du dépôt) avec un faux hôte de fenêtres. Commandes Tauri minces. `src-tauri` : `cargo check` seulement, aucun `tauri build`. | brief ; patron C16 (`crates/roomboard-shell/src/lib.rs:1-3`) ; profil (un seul build Tauri) | oui |
| P29 | Essai navigateur | Nouveau `scripts/essais/c11a-annotation-navigateur.mjs`, joué par `verifier.sh --e2e` et listé dans `verifier-e2e.test.sh`. Le faux hôte se branche par `?annotation=faux`, honoré seulement hors coque. Il annonce la capacité et un écran, et publie son état sur `document.body.dataset` (`annotation`, `pointeur`). | brief (geste Playwright) ; patron `?banc` (`main.ts:1-5`) | oui (HC11-14) |
| P30 | Stylet et bureau figé | La mesure du stylet dans la fenêtre transparente (C11a, `:557`) est une fiche d'essai en coque (`proto-stylet.html`), pas un test de la VM. Le bureau figé et son repli automatique quand WebKitGTK ne peint pas la transparence vont à C11b. C11a livre le bureau vivant seul. | ligne C11a (`:557`) ; U18 (`:71`) ; profil (essais de plateforme séparés) | oui (HC11-16) |

## 3. Carte d'impact

Le profil n'a pas de ligne « Surfaces d'impact » : les rubriques sont déduites (affichage, coque, persistance et
formats, tests, autres dépôts, CLI). Il n'existe pas de graphe graphify pour RoomBoard (`~/.cache/graphes/` n'a que
`claude-config`, `roomflow2` et `roomflow2-web`, prémisse déjà notée par C1) : toute la carte vient de la recherche texte
et de la lecture.

### 3.1 Affichage et logique de la page (`apps/web/src`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `runtime-capabilities.ts:15-24` (`runtimeCapabilities`) | oui | `env.annotationSupported?: boolean` (absent : statique gardé, tests actuels inchangés ; échec de la commande : `false`) | V |
| `toolbar.ts:97-130` (`ACTION_TABLE`) | oui | `desktop-annotation`, `annotation-pointer`, `annotation-screen` | V |
| `toolbar.ts:618-630` (`visibleItems`) | non | réutilisée telle quelle ; le filtrage par mode se fait dans `itemsForMode` | V |
| `toolbar.ts` (nouvelle `itemsForMode`, près de `:618`) | oui | `itemsForMode(bar, caps, mode)` : tableau = `visibleItems` sans zone d'annotation ; annotation = `visibleItems` plus sortie et bascule si absentes (P7, P19) | V |
| `toolbar.ts:635-642` (`resolveStartMode`) | non | réutilisée | V |
| `toolbar.ts:461-493` (`ensureProfilesAccess`) | non | patron repris pour P7, au rendu et non à la lecture | V |
| `toolbar-profiles.ts:56-67` (`defaultToolbars`), `:83-104` (`simple`) | oui | entrée, bascule, écran suivant et zone dans les barres livrées (P6, P19) | V |
| `app/toolbar-host.ts:9-26` (`ToolbarHost`) | non | interface gardée ; le distant l'implémente | V |
| `app/toolbar-host.ts:28-79` (`HostTargets`, `ACTIONS`) | oui | trois actions → `HostTargets.annotation?` (contrôleur) ; absent : sans effet (patron PC9) | V |
| `app/toolbar-host.ts:105-109` (`setMode`) | oui | appelle le contrôleur d'annotation au lieu du `console.info` | V |
| `ui/item-state.ts:39-59` (`ACTION_STATE`) | oui | `desktop-annotation` enfoncé et libellé ; `annotation-pointer` libellé ; `annotation-screen` grisé à un écran ; actions non transmises grisées en annotation (P20) | V |
| `ui/Toolbar.tsx:58-65` (`Drop`) | non | réutilisé : dépôt HTML5 (web, faux hôte, macOS et Linux) → `host.dropFiles` | V |
| `ui/Toolbar.tsx:178` (`visibleItems` dans la barre) | oui | passe par `itemsForMode` avec le mode reçu en prop (absent : `board`) | V |
| `ui/App.tsx:246-261` (hôte local, `setMode`) | oui | hôte local ou distant selon le mode ; mode d'interface `data-mode="annotation"` (barre seule) | V |
| `ui/App.tsx:286-330` (disposition) | oui | en annotation, seule la première barre `tools` s'affiche ; sa taille mesurée part vers la coque | V |
| `ui/TabsBar.tsx:18-74` | oui | onglet `kind: "annotation"` marqué (libellé « Annotation ») | V |
| `ui/rb.css:25-28` (`.rb-drop`, `.rb-layout`) | oui | mode barre seule ; page transparente dans `annotate` (`html, body` sans fond) | V |
| `ui/ProfileEditor.tsx:60` (`START_LABELS`) | non | « Annotation du bureau » existe déjà | V |
| `app/workspace.ts:406` (`anyDirty`) | non | inchangé : l'onglet d'annotation est un onglet ordinaire | V |
| `app/workspace.ts:822` (`guardClose`) | oui | en annotation : sortir d'abord (document récupéré), puis la garde ordinaire (P25) | V |
| `app/workspace.ts:314-370` (`addTab`, `tabs.add("board", …)`) | oui | création de l'onglet `"annotation"` (vierge) et remplacement de son document au retour (P3, P4) | V |
| `app/container-io.ts:61, 64` (`encode`, `read`) | non | réutilisés pour l'aller-retour `.roomboard` (P4) | V |
| `app/workspace.ts:823-827` (`host.onDrop`) | oui | en annotation, routé par le contrôleur (P17, P18) | V |
| `app/workspace.ts:650` (`importFiles`) | non | réutilisée ; l'avis « ajouté à la page N » se lit dans `ImportReport.inserted` (`platform/import.ts:36-41`) | V |
| `app/tabs.ts:6-8, 41` | oui | `add("annotation", …)` accepté (garde `ANNOTATION_NOT_YET` retirée), un seul onglet d'annotation (P3) | V |
| `app/board-session.ts:58-80, 135` (`SessionShared`, `createBoardSession`) | oui | option `transparent` passée au rendu (page `annotate`) | V |
| `engine/render/canvas2d.ts:355-367` (`drawScene`) | oui | effacer au lieu de peindre pourtour et fond (P14) | V |
| `engine/render/canvas2d.ts:730` (aperçu de gomme : repeint du fond) | oui (à vérifier) | sur fond transparent, l'aperçu de la gomme partielle repeint du transparent (HC11-15) | S |
| `engine/page.ts:4-8` | non | constantes lues seulement | V |
| `main.ts:57-120` (`start`) | oui | branche `?fenetre=annotation` (amorce de `annotate`) et `?annotation=faux` ; `annotation_support` avant les capacités | V |
| `platform/host-tauri.ts:62-66` (`TauriIpc`), `:284-342` (`loadTauriPorts`) | oui | `emitTo` ajouté (`@tauri-apps/api/event`) | V |
| `platform/host-tauri.ts:155-170` (`onOriginalChanged`) | oui | son patron stop/stopped est extrait en une aide d'abonnement, réutilisée par les nouveaux abonnements (constat ouvert, `architecture-constats.md:30`) | V |
| nouveau `app/annotation.ts` | oui | contrôleur et hôte distant (voir 3.7) | — |
| nouveau `app/annotation-page.ts` | oui | amorce de la page `annotate` : reçoit le `.roomboard`, le lit, le renvoie encodé à la sortie | — |
| nouveau `platform/annotation-tauri.ts` | oui | hôte de fenêtres de la coque (commandes et événements) | — |
| nouveau `platform/annotation-fake.ts` | oui | faux hôte (tests, `?annotation=faux`) | — |

### 3.2 Coque (`apps/desktop/src-tauri`, `crates/roomboard-shell`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-shell/src/lib.rs:11-12` (`pub mod`) | oui | `pub mod annotation;` | V |
| nouveau `crates/roomboard-shell/src/annotation.rs` | oui | logique pure (3.7) | — |
| `crates/roomboard-shell/Cargo.toml` | non | aucune dépendance nouvelle (std seul) | V |
| `apps/desktop/src-tauri/src/main.rs:321-333` (`invoke_handler`) | oui | `annotation_support`, `annotation_enter`, `annotation_exit`, `annotation_close`, `annotation_pointer`, `annotation_hits`, `relaunch_compat` | V |
| `main.rs:334-342` (`on_window_event`) | oui | dépôts de `main` seulement (P18) ; `Destroyed` de `annotate` → état remis | V |
| `main.rs:265-293` (`on_run_event`, Cmd+Q macOS) | non | inchangé : la page reçoit `roomboard://quit-requested` et sort d'abord de l'annotation (P25) | V |
| `main.rs:247-260` (`grant_and_emit`, `app.emit`) | non | réutilisé ; la diffusion vers toutes les fenêtres est gardée, `annotate` n'écoute pas `roomboard://dropped` | V |
| `main.rs:295-320` (`main`, `.manage`) | oui | état `Annotation` (géré par Tauri), fil de sondage démarré en mode souris | V |
| `tauri.conf.json:9` (`app.windows`) | non | `annotate` est créée à la volée (P13) ; la CSP vaut pour les deux fenêtres | V |
| `capabilities/default.json` | non | reste `windows: ["main"]` ; aucune permission de fenêtre (P12) | V |
| nouveau `capabilities/annotate.json` | oui | `windows: ["annotate"]`, `core:default` | — |
| `src-tauri/Cargo.toml:11` (`tauri` features) | non | ni `macos-private-api` (sans effet en 2.12.5) ni autre feature | V |
| `src-tauri/build.rs` | non | `tauri_build::build()` sans manifeste de commandes : commandes de l'application permises | V |
| `crates/roomboard-core/src/capabilities.rs:14-29` | non | table statique gardée (DAU8) | V |

### 3.3 Persistance et formats

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| format `.roomboard` (cœur, `format::`) | non | réutilisé tel quel pour l'aller-retour et l'enregistrement de l'onglet d'annotation (P4, P26) | V |
| `toolbar.ts:12-14` (`PROFILE_SCHEMA`, `PROFILE_MINOR`) | non | profils compatibles (P26) | V |
| `profile-store.ts`, `profile-file.ts` | non | profils livrés en code ; copies utilisateur inchangées | V |
| `localStorage` / IndexedDB | non | pas de réglage persistant nouveau (écran choisi gardé en mémoire, HC11-10) | V |

### 3.4 Tests

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-shell/tests/` | oui | nouveau fichier de tests d'`annotation` (ou tests du module) | V |
| `apps/web/src/runtime-capabilities.test.ts` | oui | cas Wayland, cas absent, cas échec | V |
| `apps/web/src/toolbar.test.ts:135, 304` | non | à garder verts (zone `requires: ["dropPaths"]`) | V |
| `apps/web/src/toolbar-profiles.test.ts` | oui | nouveaux éléments des barres livrées | V |
| `apps/web/src/ui/Toolbar.test.tsx:55, 116, 150` | non | à garder verts (zones sans `desktopAnnotation`) | V |
| `apps/web/src/app/toolbar-host.test.ts` | oui | `setMode`, trois actions, hôte distant | V |
| `apps/web/src/ui/App.test.tsx`, `ui/TabsBar.test.tsx` | oui | mode barre seule, onglet d'annotation | V |
| `apps/web/src/app/workspace.test.ts` | oui | aller-retour (faux hôte) : tracer en annotation, sortir, enregistrer, rouvrir → le trait est là ; fermeture en annotation : sortie d'abord | V |
| `apps/web/src/app/annotation.test.ts` (nouveau) | oui | transitions, bascule, routage du dépôt, délai de 5 s sans réponse | — |
| `apps/web/src/engine/render/canvas2d.test.ts` | oui | option `transparent` | V |
| `apps/web/src/app/tabs.test.ts` | oui | le cas `ANNOTATION_NOT_YET` devient « `"annotation"` accepté » | V |
| `apps/web/src/core/wasm-core.contract.test.ts:364-366` | non | à garder vert (capacités statiques) | V |
| `crates/roomboard-core/src/capabilities.rs:35` (`desktop_annotation_only_on_desktops`) | non | à garder vert | V |
| `scripts/essais/c1-profils-navigateur.mjs:236-245` | non | à garder vert : « annotation au navigateur : tableau ordinaire, #etat vide », aucune boîte | V |
| `scripts/essais/c10a-tableau-navigateur.mjs:67`, `c4-bibliotheque-navigateur.mjs:122`, `c15-3d-navigateur.mjs:187` | non | mesures de la scène ≥ 640 px, à garder vertes | V |
| nouveau `scripts/essais/c11a-annotation-navigateur.mjs` | oui | S1 à S3 ; scène ≥ 640 px mesurée après retour | — |
| `scripts/verifier.sh:99-128`, `scripts/tests/verifier-e2e.test.sh` | oui | brancher et lister le nouvel essai | V |
| `scripts/tests/coque-csp.test.sh` | non | CSP inchangée, à garder vert | V |
| `docs/essais/coque-*.md` (fiches) | oui | fiches C11a-1 et suivantes (Windows, macOS, X11, Wayland, stylet) | V |

### 3.5 Autres dépôts

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `~/projets/actcraft` | non | référence lue par l'étude seulement | V |

### 3.6 CLI

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| aucune CLI dans le dépôt | non | — | V |

### Effets de bord sur l'existant

- `setMode("desktop-annotation")` ouvrait un `console.info` ; il entre désormais en annotation quand la capacité est vraie.
  Test : `toolbar-host.test.ts` (setMode) et `App.test.tsx` (démarrage avec le profil `annotation` et un faux hôte).
- Les barres livrées `defaut`, `simple` et `annotation` gagnent des éléments : la barre du haut s'allonge en coque.
  Tests : `toolbar-profiles.test.ts` et les mesures de scène ≥ 640 px (`c10a`, `c4`, `c15`, plus le nouvel essai).
  Sur le web, ces éléments sont masqués (capacité fausse) : la barre ne change pas.
- `runtimeCapabilities` lit un nouveau champ ; absent, le comportement reste celui d'aujourd'hui. Test :
  `runtime-capabilities.test.ts`.
- `main.rs` ne traite plus que les dépôts de la fenêtre `main`. Une seule fenêtre existe aujourd'hui, donc rien ne
  change hors annotation. Test : fiche coque (dépôt sur `annotate` ignoré) et `cargo check`.
- `tabs.add("annotation")` ne lève plus : l'onglet d'annotation devient un onglet ordinaire (enregistrable, fermeture
  gardée). Test : `tabs.test.ts` (cas réécrit) et `workspace.test.ts` (aller-retour).
- La fermeture de l'application en annotation sort d'abord de l'annotation, puis applique la garde ordinaire. Test :
  `workspace.test.ts` (faux hôte).
- Rendu Canvas 2D : la nouvelle option `transparent` vaut faux par défaut, le rendu actuel est identique. Test :
  `canvas2d.test.ts`.
- `host-tauri.ts` : `onOriginalChanged` passe par l'aide extraite. Test : `host-tauri.test.ts` (désabonnement avant la
  fin de `listen`).

### Chantiers en cours

Aucun. `git worktree list` : le dépôt principal (`main` @ 6c97661) et ce worktree seulement. `gh pr list` : sortie vide,
aucune PR ouverte. L'orchestrateur n'a signalé aucun worktree sur une autre machine.

### Termes cherchés

- Graphe : aucun graphe RoomBoard (`ls ~/.cache/graphes/`) ; requêtes graphify non jouables.
- `grep -nE "C11|U10|U1[4-9]|U20|U22|DAU2|DAU8|S12|S13|annotat|Wayland|annotate" docs/plans/usage-cadrage.md`
- `grep -rn "quitte l'annotation\|nouvel onglet" docs` ; `grep -rn "onglet indépendant" docs ~/SecondBrain`
- `grep -nE "startMode|StartMode|desktop-annotation|dropzone|desktopAnnotation|dropPaths|requires|CAPABILITY_KEYS|resolveStartMode|cursor|visibleItems" apps/web/src/{toolbar,toolbar-profiles,main}.ts apps/web/src/ui/*.tsx apps/web/src/app/*.ts apps/web/src/profile-*.ts apps/web/src/platform/*.ts`
- `grep -n "importFiles\|openDocument\|insertPages\|notice\|toast\|avis\|tabs\.\|kind" apps/web/src/app/workspace.ts`
- `grep -n "background" apps/web/src/engine/render/canvas2d.ts` ; `grep -n "PAGE_BACKGROUND\|SURROUND_COLOR" -r apps/web/src/engine`
- `grep -n "emitTo\|getCurrentWindow" apps/web/src/platform/*.ts` ; `grep -n "listen\|emit" apps/web/src/platform/host-tauri.ts`
- `grep -n "dropzone" apps/web/src/ui/*.test.tsx apps/web/src/toolbar.test.ts`
- `grep -n "640" scripts/essais/*.mjs` ; `grep -n "essais/.*\.mjs\|e2e" scripts/verifier.sh`
- `grep -rn "set_ignore_cursor_events\|cursor_position\|drag_and_drop\|skip_taskbar\|transparent" ~/.cargo/registry/src/*/tauri-2.12.5/src/{webview/webview_window.rs,window/mod.rs}` ; `grep -n "macos-private-api" tauri-2.12.5/{Cargo.toml,src/lib.rs}` ; `permissions/event/autogenerated/reference.md`
- `grep -nE "annotation|toolbar|App.tsx|workspace|main.ts|tabs|host" docs/architecture-constats.md`
- Coffre : `chercher.js "roomboard annotation bureau fenêtre transparente" 8`, `"tauri fenêtre transparente clic à travers wayland" 8`, `"roomboard onglets annotation Q2 capture" 6` (aucune décision ni aucun piège sur l'annotation ; piège lu : la VM est Ubuntu 26.04 en Wayland seul, avec xrdp et Xfce en X11, `04_Pieges/gnome-remote-desktop-systeme-boucle-avec-windows-app.md`)

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| Capacité corrigée à l'exécution | `apps/web/src/runtime-capabilities.ts:15` | `runtimeCapabilities(staticCaps, env: { tauri; officeConverter?; annotationSupported?: boolean })` | étendre |
| Masquer les entrées sans capacité | `apps/web/src/toolbar.ts:618` | `visibleItems(bar, caps)` | réutiliser |
| Éléments selon le mode | `apps/web/src/toolbar.ts:618` (voisin) | `itemsForMode(bar: Toolbar, caps: RuntimeCapabilities, mode: StartMode): ToolItem[]` | étendre (fonction ajoutée à côté, sur `visibleItems`) |
| Mode de démarrage | `apps/web/src/toolbar.ts:635` ; `ui/App.tsx:261` | `resolveStartMode(p, caps)` ; `host.setMode(mode)` | réutiliser |
| Sortie toujours atteignable | `apps/web/src/toolbar.ts:466` (`ensureProfilesAccess`) | patron repris dans `itemsForMode` (ajout au rendu) | réutiliser (patron) |
| Actions de la barre | `apps/web/src/app/toolbar-host.ts:47` (`ACTIONS`), `:28` (`HostTargets`) | `ACTIONS["desktop-annotation" \| "annotation-pointer" \| "annotation-screen"] = (t) => t.annotation?.…` ; `HostTargets.annotation?: AnnotationControl` | étendre |
| État des boutons | `apps/web/src/ui/item-state.ts:39` (`ACTION_STATE`) ; `ToolbarView` `:5` | `ToolbarView.annotation?: { active: boolean; pointer: "draw" \| "mouse"; screens: number }` | étendre |
| Rejouer les commandes dans `annotate` | `apps/web/src/app/toolbar-host.ts:81` | `createLocalToolbarHost(targets, profile)` sur la session de `annotate` | réutiliser |
| Envoyer les commandes depuis la barre | aucun (termes : `emitTo`, `remote`, `ToolbarHost` distant) | nouveau `app/annotation.ts` : `createRemoteToolbarHost(send: (m: AnnotationCommand) => void, local: ToolbarHost, remoteActions: ReadonlySet<string>): ToolbarHost` | nouveau module : rien n'envoie de commandes entre fenêtres |
| Transitions, bascule, routage du dépôt | aucun (termes : `annotation`, `setMode`, `pointer`, `ignore`) | `createAnnotationController(deps: { windows: AnnotationWindows; importFiles(files, at): Promise<ImportReport>; say(m): Promise<void>; barRect(): Rect; encodeTab(): Promise<Uint8Array>; loadTab(bytes: Uint8Array): Promise<boolean> }): AnnotationControl` avec `AnnotationControl { state(): AnnotationState; enter(): Promise<void>; exit(): Promise<void>; close(): Promise<boolean>; toggle(): Promise<void>; nextScreen(): Promise<void>; onTool(tool: string): void; dropOnZone(files, at): Promise<void>; onChange(cb): () => void }` | nouveau module (même fichier) |
| Hôte de fenêtres (coque, faux) | aucun (termes : `WebviewWindow`, `set_ignore`, `annotate`) | `AnnotationWindows { support(): Promise<{ supported: boolean; reason: "wayland" \| null; screens: number }>; enter(o: { screen: number; dock: Dock; thickness: number; document: Uint8Array }): Promise<void>; exit(): Promise<Uint8Array \| null>` (document renvoyé par `annotate`, `null` après 5 s) `; close(): Promise<void>; pointer(mode: "draw" \| "mouse"): Promise<void>; send(m: AnnotationCommand): void; onView(cb: (v: ToolbarView) => void): () => void; onExitRequest(cb: () => void): () => void; relaunchCompat(): Promise<void> }` : `platform/annotation-tauri.ts` (coque), `platform/annotation-fake.ts` (tests, `?annotation=faux`) | nouveau module |
| Session de dessin dans `annotate` | `apps/web/src/app/board-session.ts:135` | `createBoardSession(shared, doc, …)` avec `SessionShared.transparent?: boolean` | étendre |
| Rendu transparent | `apps/web/src/engine/render/canvas2d.ts:355` | option `transparent` de `Canvas2DRenderer` (effacer au lieu de peindre) | étendre |
| Import d'un dépôt | `apps/web/src/app/workspace.ts:650` | `ws.importFiles(files, null): Promise<ImportReport>` ; avis par `ImportReport.inserted` (`platform/import.ts:36`) | réutiliser |
| Dépôt natif | `apps/web/src/app/workspace.ts:823` (`host.onDrop`) | gestionnaire routé : `annotation.state().active ? annotation.dropOnZone(f, at) : ws.importFiles(f, at)` | étendre |
| Dépôt HTML5 sur la zone | `apps/web/src/ui/Toolbar.tsx:58` (`Drop`) ; `platform/drop-web.ts:26` | `listenWebDrop(el, handler, { stopPropagation })` | réutiliser |
| Onglet d'annotation | `apps/web/src/app/tabs.ts:40` (`add(kind, session)`) ; `app/workspace.ts:314` (`addTab`) ; `ui/TabsBar.tsx:18` | `tabs.add("annotation", tab)` ; `ws.annotationTab(): TabSession` (crée vierge ou rend l'existant) ; `ws.replaceDocument(tab, bytes: Uint8Array): Promise<boolean>` ; `TabEntry.kind` lu par `TabsBar` | étendre |
| Aller-retour `.roomboard` | `apps/web/src/app/container-io.ts:61, 64` | `io.encode(doc, assets, now, appVersion, { kind: "document" })` ; `io.read(name, bytes, "document")` | réutiliser |
| Fermeture gardée | `apps/web/src/app/workspace.ts:822` (`guardClose`) ; `anyDirty` `:406` | avant la garde : `annotation.state().active ? await annotation.exit() : …` ; `anyDirty` inchangé | étendre |
| Événements entre fenêtres | `apps/web/src/platform/host-tauri.ts:62` (`TauriIpc`) | `emitTo<T>(target: string, event: string, payload: T): Promise<void>` | étendre |
| Abonnement arrêtable | `apps/web/src/platform/host-tauri.ts:155` (`onOriginalChanged`, patron dupliqué du `guardClose`, `:248`) | `subscribe<T>(ipc, event, cb): () => void` extrait, réutilisé par `annotation-tauri.ts` | étendre (extraction ; ferme en partie le constat `architecture-constats.md:30`) |
| Fichiers déposés accordés | `apps/desktop/src-tauri/src/main.rs:247` (`grant_and_emit`) ; `crates/roomboard-shell/src/lib.rs:48` (`GrantedPaths`) | inchangés | réutiliser |
| Logique native testable | `crates/roomboard-shell` (C16) | nouveau module `annotation` : `enum Session { X11, XWayland, WaylandNative, Other }` ; `fn detect_session(os: &str, env: impl Fn(&str) -> Option<String>) -> Session` ; `fn supported(s: Session) -> Result<(), Unsupported>` ; `struct Rect { x: i32, y: i32, w: u32, h: u32 }` ; `enum Side { Top, Bottom, Left, Right }` ; `fn split(screen: Rect, side: Side, thickness: u32) -> (Rect, Rect)` (barre, annotation) ; `fn pick_screen(screens: &[Rect], wanted: Option<usize>, main_center: (i32, i32)) -> usize` ; `struct PassThrough { mouse: bool, hits: Vec<Rect>, holding: bool }` avec `fn ignore(&self, cursor: Option<(f64, f64)>) -> bool` ; `struct Machine` (états `Board`, `Annotating { screen, saved: Rect }`, `Hidden { saved }`) avec `enter(saved, screen) -> Result<Rect, …>`, `exit() -> Option<Rect>` (géométrie à rendre), `close()` ; `fn compat_env() -> [(&'static str, &'static str); 1]` | nouveau module : termes `wayland`, `monitor`, `geometry`, `cursor` sans résultat dans `crates/` |
| Capacités statiques | `crates/roomboard-core/src/capabilities.rs:21` | `capabilities(platform)` | réutiliser |
| Libellé du mode dans l'éditeur | `apps/web/src/ui/ProfileEditor.tsx:60` | `START_LABELS` | réutiliser |
| Avis lus par les essais | `scripts/essais/avis.mjs`, `commun.mjs` | aides existantes | réutiliser |

## 4. Hypothèses à revoir

**Niveau 1 : difficiles à défaire ou visibles des utilisateurs**

- **HC11-1** Le retour sur le tableau ne pose aucune question : l'onglet d'annotation est gardé (document récupéré). Le choix « coller une
  capture dans l'onglet d'origine / nouvel onglet / garder » de Q2 arrive avec la capture (C11b).
- **HC11-2** La bande de la barre ne se dessine pas : l'annotation couvre l'écran moins la bande (P10). Autre option :
  annotation plein écran et barre au-dessus, avec un ordre d'empilement à tenir.
- **HC11-3** Aller-retour `.roomboard` en un message à l'entrée et un à la sortie (P4, décision de l'orchestrateur).
  Reste à revoir : sans réponse de `annotate` sous 5 s, la sortie se fait sans l'encre de cette séance (avis) ; le poids
  d'un message (document avec images de plusieurs Mio) n'est pas mesuré (étude, « Débit des événements », supposé).
- **HC11-4** En annotation, seule la première barre `tools` s'affiche (pas de barre des pages). Fichier, panneaux et
  export sont grisés (P20).
- **HC11-5** La zone « Déposer ici » n'apparaît qu'en annotation et seulement dans les profils livrés `defaut` et
  `annotation` (P19). Le dépôt fait quitter l'annotation (Q2) ; l'avis « ajouté à la page N » reste pour un objet, sans
  « Voir » puisque la page est déjà montrée.
- **HC11-6** Échap dans `annotate` quitte l'annotation (P24).
- **HC11-7** En mode souris, les objets se sélectionnent par sondage du curseur toutes les 30 ms. Leur forme compte
  comme leur rectangle englobant, et il y a un léger retard à l'entrée sur un objet (P9).

**Niveau 2**

- **HC11-8** Wayland natif se détecte par l'environnement, pas par le type d'affichage GDK (P16).
- **HC11-9** La relance en mode compatibilité n'est proposée que par une question au démarrage, quand le profil
  demandait l'annotation. Aucun élément de barre ne la propose (U20 dit « la barre propose ») : il faudrait une capacité
  de plus.
- **HC11-10** L'écran se choisit par « Écran suivant » (tour des moniteurs), pas par un menu. Le choix est gardé en
  mémoire pour la session seulement.
- **HC11-11** Le plein écran se fait par position et taille du moniteur (Space macOS évité) : à vérifier sur le Mac.
- **HC11-12** `annotate` est créée à la première entrée, cachée au retour et détruite à la fermeture de l'onglet
  d'annotation.
- **HC11-13** Un seul onglet `kind: "annotation"` à la fois ; activé sur le tableau, il s'affiche comme un document
  ordinaire (fond blanc), la transparence n'existant que dans `annotate`.
- **HC11-14** Le faux hôte se branche par `?annotation=faux`, honoré seulement hors coque (P29).
- **HC11-15** L'aperçu de la gomme partielle repeint le fond (`canvas2d.ts:730`) : sur fond transparent, il doit
  effacer (`destination-out`). À vérifier à l'exécution.
- **HC11-16** Le repli automatique sur le bureau figé quand la transparence ne se peint pas (WebKitGTK, U18) est
  reporté à C11b, avec le bureau figé.
- **HC11-17** Une copie utilisateur de `defaut` faite avant C11a ne reçoit pas l'entrée « Annotation du bureau » : pas
  d'ajout à la lecture, seule la sortie s'ajoute au rendu en annotation (P7).

## 5. Décisions d'architecture

**DA1 — Le document d'annotation appartient à la fenêtre principale ; aller-retour `.roomboard` avec `annotate`.**
Contexte : Q2 veut un onglet indépendant (`kind: "annotation"`) ; la demande exige que l'encre rejoigne le document
principal ; la règle de l'encre interdit le trait point par point entre fenêtres.
Décision : l'onglet d'annotation est une `TabSession` de la fenêtre principale ; à l'entrée, son `.roomboard` part en un
message vers `annotate`, qui dessine localement ; à la sortie, `annotate` renvoie son `.roomboard` en un message.
Conséquences : l'onglet s'enregistre comme tout onglet ; un seul format (`ContainerIO`) ; coût d'un encodage par passage.

**DA2 — Entre les pages, seulement des commandes de barre et une vue de barre.**
Contexte : la règle de l'encre ; `ToolbarHost` est l'unique interface de la barre (U15) ; deux instances Wasm.
Décision : `roomboard://annotation-command` (principale → `annotate`) porte les appels `ToolbarHost` sérialisés ;
`roomboard://annotation-view` (`annotate` → principale) porte la `ToolbarView` ; `roomboard://annotation-document`
(dans les deux sens) porte le `.roomboard` entier, une fois par passage (DA1) ; `emitTo`, jamais `emit`.
Conséquences : chaque côté se teste avec un faux canal ; la barre ne sait pas dans quelle fenêtre est le moteur.

**DA3 — Fenêtres réglées par la coque, logique dans la crate, page sans permission de fenêtre.**
Contexte : `src-tauri` est hors du workspace et ne se construit pas sur la VM ; C16 a posé une crate testable ; moindre
privilège.
Décision : commandes `annotation_*` minces, qui appellent `roomboard_shell::annotation` (session, géométrie, écran,
machine d'états, clic à travers) ; `capabilities/annotate.json` minimal ; aucune permission `core:window:allow-set-*`.
Conséquences : `cargo test` couvre la logique ; seuls les appels Tauri restent aux fiches d'essai.

**DA4 — L'écran se découpe en bande de barre et zone d'annotation.**
Contexte : deux fenêtres au premier plan doivent être ordonnées (DAU2) ; sous X11, le gestionnaire de fenêtres décide.
Décision : `split(screen, side, thickness)` rend deux rectangles disjoints : la fenêtre principale prend la bande (côté
du `dock`), `annotate` prend le reste.
Conséquences : la barre ne peut pas être recouverte ; la bande ne se dessine pas (HC11-2).

**DA5 — Mode souris : le clic à travers se coupe sous les objets, par sondage en Rust.**
Contexte : Q2 garde la sélection d'objets en mode souris ; le clic à travers est tout ou rien et la page ne voit plus le
curseur (étude `:94`).
Décision : en mode souris, la page pousse les rectangles des objets (`annotation_hits`) ; un fil Rust sonde
`cursor_position` toutes les 30 ms et applique `PassThrough::ignore` ; un geste tenu garde la saisie.
Conséquences : pas de région native ; un léger retard au survol ; sans effet sur le tracé (mode dessin : saisie totale).

## 6. Scénarios d'acceptation

- **S1** (Playwright, web, sans coque) Ouvrir RoomBoard dans le navigateur : ni « Annotation du bureau » ni « Déposer
  ici » dans la barre. Choisir le profil « Annotation au démarrage » et recharger : tableau ordinaire, `#etat` vide,
  aucune boîte. La scène mesure au moins 640 px.
- **S2** (Playwright, faux hôte `?annotation=faux`) Cliquer « Annotation du bureau » : la fenêtre passe en barre seule
  (`data-mode="annotation"`), le faux hôte a ouvert `annotate` en mode dessin (`data-pointeur="draw"`) et le bouton est
  enfoncé (« Quitter l'annotation »). Choisir Sélection : `data-pointeur="mouse"`. Reprendre le Stylo : `draw`. Le bouton
  « Souris » fait l'aller-retour. « Quitter l'annotation » : le tableau revient, avec l'onglet « Annotation » dans les
  onglets et une scène d'au moins 640 px ; le faux hôte a reçu un `.roomboard` à l'entrée et en a rendu un à la sortie.
  Rentrer en annotation : le faux hôte reçoit le document de l'onglet d'annotation.
- **S3** (Playwright, faux hôte) En annotation, déposer une image PNG sur « Déposer ici » : l'annotation se ferme,
  l'image est sur la page montrée de l'onglet d'origine, avis « ajouté à la page 1 », onglet d'annotation gardé. Rentrer en
  annotation et déposer un `.roomboard` : nouvel onglet ouvert et montré, onglet d'origine inchangé.
- **S4** (tests unitaires : `cargo test`, Vitest) **Aller-retour** (faux hôte qui charge le document reçu dans un vrai
  cœur et y trace un trait) : entrer, tracer, sortir, enregistrer l'onglet d'annotation, rouvrir le fichier → le trait est
  là ; fermer l'application en annotation → sortie d'abord, puis question de l'onglet modifié ; faux hôte muet → sortie
  après 5 s avec l'avis. Session Wayland natif : capacité fausse, entrée masquée ; profil
  « Annotation au démarrage » : la question de relance est posée et sa réponse oui appelle `relaunchCompat`. X11 et
  XWayland : capacité vraie. Géométrie : bande et zone disjointes sur les quatre côtés et sur deux écrans d'échelles
  différentes ; écran choisi. Clic à travers : vrai hors objet, faux sur un objet et pendant un geste tenu. Un profil
  d'avant C11a (copie `defaut` sans l'entrée) en annotation montre « Quitter l'annotation » ; un `.roomboard` d'avant
  C11a s'ouvre ; tailles Wasm inchangées à l'octet.
- **S5** (essai en coque, manuel ; fiches dans `docs/essais/`, reprend S12 et la partie C11a de S13) Windows 10 22H2 et
  11, macOS 14, Linux X11 : choisir « Annotation au démarrage » et relancer : l'écran est couvert par l'annotation
  transparente, la barre seule au premier plan et cliquable. Écrire au stylet sur le bureau (mesure de pression et de
  latence par `proto-stylet`) ; Sélection : cliquer une icône du bureau à travers, puis cliquer un trait : il se
  sélectionne ; reprendre le Stylo : l'encre revient. Depuis l'explorateur, déposer une image puis un `.roomboard` sur
  la barre (comportement de S3). Deux écrans : « Écran suivant ». Sous Wayland natif : démarrage sur le tableau, question
  « Relancer en mode compatibilité » ; après relance sous XWayland, l'annotation fonctionne.

## 7. Hors périmètre

- C11b : bureau figé, capture, « Envoyer au tableau », choix au retour (coller une capture), repli figé automatique
  (WebKitGTK).
- Plusieurs fenêtres d'annotation à la fois (une par écran) ; régions natives de clic à travers (solution C) ; raccourci
  global ; `layer-shell` sous Wayland.
- Essais réels en coque (Windows, macOS, X11, Wayland, stylet) : séances de Jérôme ; build Tauri (`tauri build`) sur la
  VM.
- Autres dépôts : aucun.

## 8. Portes immédiates

Aucune.
