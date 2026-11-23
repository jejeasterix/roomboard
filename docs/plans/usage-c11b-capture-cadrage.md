# Cadrage — usage-c11b-capture (C11b : annotation, capture et envoi au tableau)

Date : 2026-11-23. Cadrage autonome (ordre OE78, aucune question à Jérôme). Base : `origin/main` @ a4accb3.

## 1. Demande et gabarit

**Demande.** Livrer C11b du cadrage d'usage (`docs/plans/usage-cadrage.md:558`) : en coque, « Figer le bureau » capture
l'écran sans nos fenêtres et le pose en fond d'une fenêtre d'annotation opaque (U18), aussi en repli automatique là où la
transparence ne se peint pas (WebKitGTK) ; « Envoyer au tableau » ajoute une page après la page montrée, avec la capture en
`backdrop` (U6) et l'encre vectorielle en fragment (U9), en une étape (U21 amendée par Q2) ; sans capture possible, fond
blanc et avis. Mandat : « Go c11 » (Jérôme, 2026-11-23 vers 07:00) ; mandat du 2026-11-19.

**Gabarit.** `chantier`, 40 questions au plus, 36 consommées (P1 à P36).

**Sources appliquées telles quelles, citées et non refaites** : U6 (`usage-cadrage.md:59`), U9 (`:62`), U18 (`:71`),
U21 (`:74`) amendée par **Q2, qui prime** (`:625-635`), U24 (`:77`), S13 (`:455-458`), carte d'impact (`:152-153`, `:266`),
étude `docs/etudes/usage-annotation-bureau.md` § « Capture du bureau » (`:117-128`) et § « Retour de la capture »
(`:137-144`) ; C11a : `docs/plans/usage-c11a-annotation-cadrage.md` (P4, P5, P14, P28, P29, DA1 à DA5) et décisions du
coffre 0272 (document en aller-retour `.roomboard` base64), 0273 (fenêtres découpées, logique dans `roomboard_shell`),
0274 (mode souris par sondage).

**Prémisses démenties par les sources ou par l'essai** :

- **L'encre par fichier temporaire (U21).** U21 fait passer l'encre en `.rbitem` « par fichier temporaire créé par la
  coque + événement ». C11a (DA1, coffre 0272) a fait revenir le document d'annotation dans la fenêtre principale à chaque
  sortie : l'encre y est déjà, dans la page. Le fragment se construit donc dans la page par `extract` (C3) : c'est le
  fragment de U9 (« document neuf d'une page »). Seule la capture passe par un fichier accordé (U24). La règle de l'encre
  est tenue sans détour.
- **`xcap` ou équivalent (carte `:153`, `:266`, HU2-12 `:319`).** Essai du 2026-11-23 : `xcap` 0.9.10 (Apache-2.0) ne se
  construit pas sous Linux sans PipeWire. `pipewire` y est une dépendance Linux obligatoire, pas une fonctionnalité
  Cargo : `cargo check` échoue sur `libspa-sys` (« The system library `libpipewire-0.3` … was not found »). Choix :
  `xcap` sous Windows et macOS seulement ; sous Linux X11, Xlib par `x11-dl` (MIT), déjà dans l'arbre de Tauri (tao).
  Une sonde construite dans `/tmp`, hors dépôt, passe `cargo check` sous Linux.
- **Autorisation macOS.** `xcap` ne vérifie pas l'autorisation pour un écran : `capture_image` appelle
  `CGWindowListCreateImage` (`xcap-0.9.10/src/macos/capture.rs:15`, lu), qui rend le fond d'écran sans les fenêtres
  quand l'accès est refusé. Il faut appeler `CGPreflightScreenCaptureAccess` puis `CGRequestScreenCaptureAccess`
  nous-mêmes (`objc2-core-graphics` 0.3.2, fonctionnalité `CGWindow`, `src/generated/CGWindow.rs:285, :293`, lu).
- **`fit: "contain"` (U6).** Le contrat du cœur n'accepte que `fit = "width"` à l'écriture (`apps/web/src/core/api.ts:30`,
  K6). La capture est posée en `"width"`.
- **« au document principal après la page montrée » (demande).** Q2 donne trois issues au retour : coller dans
  l'onglet d'origine, dans un nouvel onglet, ou garder l'onglet d'annotation. Avec un profil « Annotation au démarrage »,
  seulement le nouvel onglet ou garder. Le « document principal » est l'onglet d'origine (celui montré à l'entrée, C11a
  `annotation.ts:91`).
- **`main.rs` : capture d'écran (carte `:152`).** La logique va dans `roomboard_shell::capture`. `main.rs` garde des
  commandes minces (coffre 0273, test `coque_c16` : aucun `Command::new`, chemins de crates déclarés).

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|-------|----------|--------|--------------|
| P1 | Règle de l'encre | Aucun point d'encre ne passe par Rust. L'encre est lue dans le document de l'onglet d'annotation, rendu à la fenêtre principale à la sortie (aller-retour existant). Le natif ne fait que la capture et rend un fichier accordé. | profil (« Règles propres au projet ») ; coffre 0272 ; C11a P2, P4 | non (règle) |
| P2 | Fragment d'encre | Toute l'encre de la page montrée dans `annotate` (tous ses éléments) devient un fragment par `doc.extract(page, ids)` (`api.ts:381`, C3 Z5), sans passer par des octets : aucune frontière n'est franchie. Le codeur `.rbitem` reste le seul pour fichier et presse-papiers (U9). | U9 (`usage-cadrage.md:62`) ; U21 ; prémisse démentie 1 | oui |
| P3 | Page envoyée | Construite dans un document temporaire par le module nouveau `app/desktop-page.ts` : `core.blank()`, `SetBackdrop` (capture, `fit: "width"`), `insertFragment(F, page, 0, 0)`, puis `Transform(ids, matrice de vue)` (P13). Insérée dans l'onglet cible par `engine.insertPages(T)` (`engine.ts:597`) : **une transaction, une étape**, page montrée ensuite (`commit(…, true)`). Le cœur ne change pas. | U21 (« insérée en une étape ») ; U9 (`InsertPages`, une étape) ; `api.ts:83, :121, :383-385` | oui |
| P4 | Annulation | Ctrl+Z dans l'onglet cible retire la page entière (capture et encre) en une fois ; Ctrl+Y la remet. | demande ; P3 | oui |
| P5 | Trois issues de Q2 | Trois actions de la barre d'annotation : `annotation-send` « Envoyer au tableau » (onglet d'origine, après sa page montrée), `annotation-send-new` « Envoyer dans un nouvel onglet », et la sortie existante `desktop-annotation` « Quitter l'annotation » (garder l'onglet). Pas de boîte posée après le retour (voir DA4). | Q2 (`:625-635`) ; HC11-1 de C11a (choix reporté à C11b) | oui (HC11b-1) |
| P6 | Cible de l'envoi | Règle pure `sendTarget(wanted, startMode, originKind)` : `"new"` si `wanted = "new"`, si le profil actif rend `desktop-annotation` par `resolveStartMode` (Q2 : seulement nouvel onglet), ou si l'origine est absente ou est l'onglet d'annotation lui-même ; sinon `"origin"`. Quand la cible est déjà `"new"`, `annotation-send-new` est grisé. | Q2 ; `toolbar.ts:676` (`resolveStartMode`) | oui (HC11b-4) |
| P7 | Envoyer = retour | « Envoyer » capture (si vivant), puis sort de l'annotation par le chemin existant (`doExit` : collecte, remplacement, onglet d'origine montré), puis insère la page et montre l'onglet cible. On n'envoie pas en restant en annotation. | Q2 (« Au retour l'app propose de coller ») ; S13 (« sortir : le tableau montre les nouvelles pages ») | oui (HC11b-2) |
| P8 | Onglet d'annotation après l'envoi | Gardé avec son encre (rien ne se perd). L'utilisateur le ferme ou l'efface. | U21, 1re phrase (document gardé d'une activation à l'autre) ; C11a P3 | oui (HC11b-3) |
| P9 | Nouvel onglet | `addTab(T, { name: "Capture du bureau", target: null }, magasin neuf)` (`workspace.ts:350`) : onglet `board` non enregistré, montré. | Q1 (`:619-624`) ; patron C12 (`workspace.ts:636`) | oui |
| P10 | Sans capture | Page à fond blanc (pas de `SetBackdrop`), encre insérée, avis « capture du bureau impossible (<raison>) : page à fond blanc ». Raisons : `denied` → « autorisation “Enregistrement de l'écran” refusée : l'accorder dans Réglages Système › Confidentialité et sécurité, puis relancer RoomBoard » ; `wayland` → « Wayland » ; `failed` → « échec de la capture ». | demande ; U21 (« Sans capture … page à fond blanc ») | oui |
| P11 | Rien à envoyer | Ni capture ni élément : avis « rien à envoyer », aucune page. Capture sans encre : la page porte la capture seule. | défaut | oui (HC11b-8) |
| P12 | Avis de réussite | « envoyé au tableau : page N » (rang de la page insérée dans l'onglet cible), par `say` comme l'avis C11a « ajouté à la page N ». | patron C11a (`annotation-port.ts:42`) | oui |
| P13 | Correspondance encre ↔ capture | En vivant, la capture couvre la zone d'`annotate`. La page de `annotate` rend dans sa réponse `view: { page, matrix }` : `page` est le rang de la page montrée, `matrix` passe du monde d'`annotate` à la page envoyée (`k = zoom · 1920 / largeur CSS`, translation `−k·(x0, y0)` du coin haut-gauche). Absent (faux hôte, page d'avant C11b) : page 0, identité. En figé, l'encre et le fond sont déjà dans le même repère : identité. | U6 (fond posé en haut, largeur de la page) ; C11a P14 (page de 1920 ajustée à la largeur) ; `annotation-page.ts:132` (`screenToWorld`) | oui (HC11b-13) |
| P14 | Bureau figé | Le fond figé est un `backdrop` image de la page montrée du **document d'annotation**, posé dans la fenêtre principale (adopter l'asset, `SetBackdrop`), puis renvoyé à `annotate` par l'aller-retour existant : collecte, remplacement, nouvel envoi. Aucun transport nouveau. Le fond se voit aussi quand l'onglet d'annotation est montré sur le tableau. | U18 (« capture puis image en fond ») ; coffre 0272 ; C2 (`backdrop` image, `api.ts:121`) | oui (DA3, HC11b-5) |
| P15 | Fenêtre opaque | `DocumentPayload` gagne `opaque?: boolean` (absent : faux, compatible C11a). `opaque` vrai : la session d'`annotate` est créée sans `transparent` (fond de page et pourtour peints, `canvas2d.ts:364, :376`), et le mode souris ne coupe jamais le clic (pas de sondage). Dans la principale, `setPointer` n'appelle jamais `pointer("mouse")` en figé : Sélection y sélectionne des objets. | U18 (« fenêtre opaque ») ; coffre 0274 ; constat `main.rs:322` (deux écrivains du clic à travers : les deux tiennent la règle) | oui |
| P16 | Bascule figé / vivant | Action `annotation-freeze` : vivant → capture, puis fond posé, `opaque` ; figé → fond retiré (`SetBackdrop` null), transparent. Libellés : « Figer le bureau » ; enfoncé : « Bureau vivant ». Échec de la capture en vivant : on reste vivant, avec l'avis de P10. | U18 ; Q2 (« Bureau vivant par défaut, figé en option ») | oui |
| P17 | Réentrée | Vivant par défaut (U18), sauf si la page montrée du document d'annotation a déjà un fond : la réentrée est alors figée, pour retrouver les « annotations en cours » sur leur image. | U18 ; Q2 (« conservé l'onglet d'annotation afin de pouvoir ré basculé sur les annotations en cours ») | oui (HC11b-5) |
| P18 | Repli automatique | `annotation_support` rend `transparent: boolean`. Sous Linux, faux quand aucun compositeur X11 ne tient la sélection `_NET_WM_CM_S<écran>` (Xlib par `x11-dl`) ; vrai si la sonde échoue, et sous Windows et macOS. Sans transparence, l'entrée capture d'abord et entre figée. « Bureau vivant » n'est pas offert : l'action devient « Recapturer le bureau » (nouvelle capture qui remplace le fond). Une capture en échec donne un figé blanc et opaque, avec l'avis. | U18 (« repli automatique là où la transparence ne se peint pas ») ; étude `:90` (fenêtres jamais peintes) ; HC11-16 de C11a | oui (HC11b-6) |
| P19 | Bibliothèque de capture | `xcap` 0.9.10 (Apache-2.0, `default-features = false`) sous `cfg(any(windows, target_os = "macos"))`. Linux : `x11-dl` 2.21 (MIT) pour `XGetImage` sur la fenêtre racine, et `png` 0.18 (MIT OU Apache-2.0) pour l'encodage. macOS : `objc2-core-graphics` 0.3.2 (Zlib OU Apache-2.0 OU MIT), `features = ["std", "CGWindow"]`, pour l'autorisation. Aucun PipeWire, aucun portail. | essai du 2026-11-23 (sondes `/tmp/sonde-capture`, `/tmp/sonde-xcap-linux`) ; carte `:153` | oui (DA1) |
| P20 | Licences | Contrôlées par `scripts/controle-licences.mjs` sur le graphe de toutes les cibles : workspace modifié, **307 crates : OK** ; seule alternative non permise, `r-efi` (« MIT OR Apache-2.0 OR LGPL-2.1-or-later »), passe par MIT. Aucune AGPL, GPL ou LGPL liée. Le verrou gagne 148 paquets (toutes cibles), dont 0 version existante changée ; même relevé dans `src-tauri/Cargo.lock` (93 ajouts). | U39 ; `scripts/controle-licences.mjs:16` ; essai du 2026-11-23 (`/tmp/sonde-ws`) | oui |
| P21 | Wayland | Session `XWayland` ou `WaylandNative` (`annotation::detect_session`) : `CaptureError::Wayland`, sans essai de capture (la racine X d'XWayland ne voit pas les fenêtres Wayland). Fond blanc et avis (P10). Pas de portail `xdg-desktop-portal`. | demande (« Wayland ») ; ligne C11b (« portail Wayland non pris en charge », `:558`) ; coffre 0273 | oui |
| P22 | Nos fenêtres masquées | Commande `async annotation_capture(screen, dock, thickness)` : elle calcule l'écran et la zone comme `annotation_enter`, par une fonction pure partagée `annotation::placement`. Puis elle cache `annotate` (si montrée) et `main`, attend **250 ms**, capture l'écran dans `spawn_blocking`, découpe la zone, réaffiche ce qui était montré, encode en PNG, écrit et accorde le fichier. | étude `:128` (« la fenêtre d'overlay doit être masquée ») ; ActCraft `desktopcontroller.cpp:161-163` (`kHiddenWindowsSettleMs = 250`, lu) | oui (HC11b-9) |
| P23 | Zone capturée | La zone d'`annotate` (l'écran moins la bande de la barre, C11a DA4), découpée dans l'image de l'écran avec une échelle `largeur image / largeur écran`, ce qui couvre les points macOS et les pixels physiques. | C11a P10, DA4 ; P13 | oui (HC11b-11) |
| P24 | Fichier temporaire | `<app_cache_dir>/captures/<id>.png`, dans un dossier privé (`office::ensure_private_dir`, réutilisée), ajouté aux **chemins accordés** (`GrantedPaths::grant`). La page le lit par `read_granted_file` (`grantedFile(…).blob()`), puis appelle `release_capture(id)` (accord retiré, fichier supprimé), que la lecture réussisse ou non. Les restes sont purgés au lancement. | U24 (« les fichiers temporaires qu'elle crée (U21) ») ; patron C16 `convert_granted` / `release_conversion` / `purge_conversions` (`office.rs:571, :616, :645`) ; `host-tauri.ts:130-146` | oui (HC11b-12) |
| P25 | Format de l'image | PNG RGBA 8 bits, compression rapide (`png::Compression::Fast`) ; asset `capture-du-bureau.png`, `image/png`, empreinte SHA-256 par `AssetStore.put` (`asset-store.ts:17`). | C2 (assets par empreinte, U4) | oui (HC11b-10) |
| P26 | Logique testable hors Tauri | Nouveau module `roomboard_shell::capture` : fonctions pures (découpe, BGRX → RGBA, PNG, règle de transparence, codes d'erreur, écriture, accord, retrait, purge), plus des adaptateurs par plateforme sous `#[cfg]`. Test X11 réel en `#[ignore]` (joué à la main avec `DISPLAY`). `main.rs` : commandes minces ; nouveau test `tests/coque_c11b.rs` sur le patron de `coque_c16.rs` (commandes enregistrées, aucun `xcap::` ni `x11_dl::` dans `main.rs`). | coffre 0265, 0273 ; brief | oui |
| P27 | Commandes Tauri | `annotation_capture` (P22) → `{ id, path, size, width, height }` ou rejet par code (`denied`, `wayland`, `failed`) ; `release_capture(id)` ; `annotation_support` gagne `transparent`. Aucune permission nouvelle : les commandes de l'application ne sont pas filtrées par capacité (point connu, `annotate.json`). Seule la principale les appelle. | C11a P12, DA3 ; `capabilities/annotate.json` | oui |
| P28 | Port des fenêtres | `AnnotationWindows` gagne `capture(place): Promise<CaptureOutcome>` et `load({ document, opaque }): Promise<void>` (le document seul, sans replacer les fenêtres) ; `enter` reçoit `opaque` ; `collect` rend `view?` ; `support` rend `transparent`. Coque : `annotation-tauri.ts` ; faux : `annotation-fake.ts`. | C11a P28 ; `annotation-port.ts:84-102` | oui |
| P29 | Barre | Les trois actions (`annotation-freeze`, `annotation-send`, `annotation-send-new`) entrent dans `ACTION_TABLE`, `ACTION_REQUIRES` (`desktopAnnotation`), `ANNOTATION_MAIN_ACTIONS`, `HostTargets.annotation`, `ACTION_STATE` et les barres livrées `defaut`, `annotation` et `simple` (`annotationItems`). **Masquées en mode tableau** (`itemsForMode`, avec la zone) : la barre du tableau ne s'allonge pas. En annotation, `annotation-send` est ajoutée au rendu si le profil ne l'a pas (patron C11a P7). | C11a P6, P7, P19 ; `toolbar.ts:634-670` ; `toolbar-profiles.ts:48-54` ; constat `toolbar.ts:634` (les deux tables, avec un test) | oui (HC11b-14) |
| P30 | Faux hôte | `createFakeAnnotationWindows` gagne `capture?` (résultat injecté), `transparent?`, et publie `annotationOpaque` et `annotationCaptures` sur `dataset`. Branché par `?annotation=faux` (honoré hors coque seulement), avec `&capture=refus` (`denied`), `&capture=wayland`, `&transparence=non`, `&encre=1` (le `draw` du faux ajoute un trait connu, de (200, 200) à (600, 200), épaisseur 8). Par défaut, la capture du faux est un PNG 320 × 180 uni `#3366cc`, peint par un `canvas` dans `main.ts`. | C11a P29, HC11-14 ; brief (geste Playwright) | oui (HC11b-15) |
| P31 | Aller-retour `.roomboard` | Aucun changement de format. La page envoyée, ou le fond figé de l'onglet d'annotation, est un `backdrop` image (C2) avec ses éléments : enregistrer puis rouvrir les rend. Un fichier d'avant C11b (`socle-v1.roomboard`, un document C11a) s'ouvre tel quel. | C2 (U6) ; C11a P26 | oui |
| P32 | Cœur et tailles Wasm | **Le chantier ne touche pas le cœur Wasm** : `roomboard-core`, `roomboard-wasm`, `roomboard-formats` et `roomboard-formats-wasm` sont inchangés. Leurs arbres de dépendances pour `wasm32` sont identiques, à l'empreinte près, avec ou sans les nouvelles dépendances (essai `/tmp/sonde-ws`, `cargo tree` md5). Attendus : module principal 1 374 398 o (plafond 1 572 864), `formats` 2 794 511 o (plafond 3 145 728), à l'octet. Aucun plafond ne bouge. | fichier d'état (« Référence ») ; essai du 2026-11-23 | non (mesure) |
| P33 | Scène ≥ 640 px | Les trois actions sont masquées en mode tableau (P29). L'essai C11b mesure la scène après chaque retour (`stageBox(page, 640)`). Les essais `c10a`, `c4`, `c15` et `c11a` restent verts. | brief ; C11a P29 (706 px mesurés) | oui |
| P34 | Essai navigateur | Nouveau `scripts/essais/c11b-capture-navigateur.mjs`, joué par `verifier.sh --e2e` et listé dans `scripts/tests/verifier-e2e.test.sh` (patron C11a P29). | brief ; `verifier.sh:99-128` | oui |
| P35 | Coque sur la VM | `cargo check`, `cargo test` et `cargo clippy -D warnings` de `apps/desktop/src-tauri` en `nice -n 10 … -j 4`. Aucun `tauri build`, aucun bundle. Le code Windows et macOS (`xcap`, autorisation) ne se compile pas sur la VM (aucune cible Windows ni macOS installée, `rustup target list --installed`) : il reste aux fiches d'essai. `cargo fetch` une fois (réseau), puis `--offline` pour `controle-licences`. | brief ; profil (un seul build Tauri) | oui |
| P36 | Essais réels | Nouvelle fiche `docs/essais/c11b-coque.md` (patron `c11a-coque.md`) : autorisation macOS (invite, refus, octroi puis relance), Windows 10 et 11, X11 avec et sans compositeur (repli figé), XWayland (fond blanc et avis), deux écrans d'échelles différentes, écran 4K, nos fenêtres absentes de la capture. La ligne « transparence non peinte » de C11a-7 renvoie vers cette fiche. | brief ; profil (essais de plateforme séparés) | oui |

## 3. Carte d'impact

Le profil n'a pas de ligne « Surfaces d'impact » : rubriques déduites (page, coque, persistance, tests, autres dépôts, CLI,
documents). Aucun graphe graphify pour RoomBoard (`ls ~/.cache/graphes/` : `claude-config`, `roomflow2`, `roomflow2-web`) :
toute la carte vient de la recherche texte et de la lecture.

### 3.1 Page et application (`apps/web/src`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `platform/annotation-port.ts:54-65` (`DocumentPayload`, `ReturnedPayload`) | oui | `opaque?: boolean` ; `view?: { page: number; matrix: Matrix }` (P13, P15) | V |
| `platform/annotation-port.ts:67-71` (`AnnotationSupport`) | oui | `transparent: boolean` (P18) | V |
| `platform/annotation-port.ts:84-102` (`AnnotationWindows`) | oui | `capture`, `load`, `enter({ …, opaque })`, `collect` avec `view` (P28) | V |
| `platform/annotation-port.ts:104-128` (`AnnotationState`, `AnnotationControl`) | oui | `frozen`, `live`, `sendTarget` ; `freeze()`, `send(to)` | V |
| `platform/annotation-port.ts:40-42` (messages) | oui | messages de P10, P11, P12 | V |
| `app/annotation.ts:80-108` (`doEnter`) | oui | repli figé (capture à l'entrée), réentrée figée (P17, P18) ; l'ordre change : barre seule, mesure, capture, encodage, entrée | V |
| `app/annotation.ts:110-129` (`doExit`) | oui | réutilisée par `send` (P7) ; rend `view` | V |
| `app/annotation.ts:74-78` (`setPointer`) | oui | jamais `mouse` en figé (P15) | V |
| `app/annotation.ts:179-188` (`dropOnZone`) | non | inchangé (patron de la file `serial`, repris) | V |
| `app/annotation.ts:207-223` (`createRemoteToolbarHost`) | non | les nouvelles actions passent par `ANNOTATION_MAIN_ACTIONS` → `local.runAction` | V |
| `app/annotation-page.ts:138-153` (`follow`) | oui | pas de sondage ni de clic à travers si `opaque` | V |
| `app/annotation-page.ts:170-198` (`load`) | oui | lit `opaque`, passe la session opaque ou transparente | V |
| `app/annotation-page.ts:214-227` (`collect`) | oui | ajoute `view` (page montrée, matrice) | V |
| `app/annotation-page.ts:35-46` (`viewOf`) | non | vue de barre inchangée (constat `:35` ouvert, non aggravé) | V |
| `annotate-start.ts:33-58` (`shared`, `makeSession`) | oui | `makeSession(doc, assets, opaque)` → `transparent: !opaque` | V |
| `app/board-session.ts:80-81, :295` (`SessionShared.transparent`) | non | réutilisé tel quel | V |
| `engine/render/canvas2d.ts:364, :376, :378` | non | `backdrop` peint même en transparent ; opaque = rendu ordinaire | V |
| nouveau `app/desktop-page.ts` | oui | construction de la page envoyée (3.8) | — |
| `app/workspace.ts:684-709` (`annotationTab`, `replaceAnnotation`) | oui | à côté : `setAnnotationBackdrop(image \| null)`, `annotationBackdrop()`, `sendCapture(o)` | V |
| `app/workspace.ts:350` (`addTab`) | non | réutilisée pour le nouvel onglet (P9) | V |
| `app/workspace.ts:650` (`importFiles`) | non | — | V |
| `app/fragments.ts:184-193` (`insertPages` d'un fichier) | non | patron repris (adopter, puis `engine.insertPages`), pas l'appel : la source est un document en mémoire | V |
| `engine/engine.ts:597-598` (`insertPages`) | non | réutilisée (une étape, page montrée) | V |
| `core/api.ts:83, :121, :381-385` (`Transform`, `SetBackdrop`, `extract`, `insertFragment`, `insertPages`) | non | réutilisés, contrat inchangé | V |
| `core/asset-store.ts:15-26` (`put`, `adopt`, `pick`) | non | réutilisés | V |
| `platform/host-tauri.ts:84-104` (`grantedFile`) | non | réutilisée pour lire la capture | V |
| `platform/host-tauri.ts:130-146` (`convertOffice`) | non | patron repris (`finally` → `release_capture`) | V |
| `platform/annotation-tauri.ts:68-118` | oui | `capture` (invoke, `grantedFile`, release), `load`, `opaque`, `view`, `transparent` | V |
| `platform/annotation-fake.ts:35-131` | oui | P30 | V |
| `main.ts:175-196` (branchement du faux hôte), `:417-430` (dépendances du contrôleur) | oui | paramètres `capture`, `transparence`, `encre` ; nouvelles dépendances (`sendCapture`, `setAnnotationBackdrop`, `startMode`, `core`) | V |
| `toolbar.ts:99-130` (`ACTION_TABLE`), `:634-649` (`ACTION_REQUIRES`, `ANNOTATION_MAIN_ACTIONS`), `:661-670` (`itemsForMode`) | oui | P29 | V |
| `toolbar-profiles.ts:48-54` (`annotationItems`) | oui | trois actions | V |
| `ui/item-state.ts:7-11` (`AnnotationView`), `:53-61` (`ACTION_STATE`) | oui | `frozen`, `live`, `sendTarget` ; libellés, enfoncé, grisé (P6, P16, P18) | V |
| `app/toolbar-host.ts:31-32, :59-64` (`HostTargets.annotation`, `ACTIONS`) | oui | `freeze`, `send("origin")`, `send("new")` par `settle` | V |
| `ui/Toolbar.tsx`, `ui/App.tsx`, `ui/TabsBar.tsx` | non | rendu inchangé (les éléments passent par `itemsForMode`) | V |
| `ui/rb.css` | non | aucun style nouveau (boutons d'action ordinaires) | S |
| `runtime-capabilities.ts:15-24` | non | `desktopAnnotation` inchangé ; la transparence n'est pas une capacité de barre | V |

### 3.2 Coque (`apps/desktop/src-tauri`, `crates/roomboard-shell`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-shell/src/lib.rs:11-13` (`pub mod`) | oui | `pub mod capture;` | V |
| nouveau `crates/roomboard-shell/src/capture.rs` | oui | 3.8 | — |
| `crates/roomboard-shell/src/annotation.rs:75, :128, :147` (`split`, `physical`, `pick_screen`) | oui | `placement(…)` pure, partagée par `annotation_enter` et `annotation_capture` ; `transparency(session, composited)` | V |
| `crates/roomboard-shell/src/lib.rs:49-90` (`GrantedPaths`) | non | réutilisé (`grant`, `revoke`) | V |
| `crates/roomboard-shell/src/office.rs:273` (`ensure_private_dir`) | non | réutilisée pour `captures/` | V |
| `crates/roomboard-shell/Cargo.toml` | oui | `xcap`, `objc2-core-graphics` (Windows, macOS), `x11-dl`, `png` (Linux) (P19) | V |
| `Cargo.lock` (racine) | oui | 148 paquets ajoutés, 0 version changée | V |
| `apps/desktop/src-tauri/Cargo.lock` | oui | 93 paquets ajoutés, 0 version changée | V |
| `apps/desktop/src-tauri/Cargo.toml` | non | aucune dépendance directe nouvelle (tout passe par `roomboard-shell`) | V |
| `main.rs:333-342` (`annotation_support`) | oui | `transparent` (P18) | V |
| `main.rs:346-402` (`annotation_enter`) | oui | passe par `ann::placement` (aucun changement de comportement) | V |
| `main.rs` (nouvelles `annotation_capture`, `release_capture`) | oui | P22, P24, P27 | — |
| `main.rs:486-498` (`setup`) | oui | racine de capture gérée, `capture::purge` au lancement | V |
| `main.rs:499-517` (`invoke_handler`) | oui | deux commandes | V |
| `main.rs:422-430` (`annotation_exit`), `:519-546` (`on_window_event`) | non | — | V |
| `tauri.conf.json` (CSP `img-src 'self' data: blob:`) | non | l'image arrive en `Blob` dans la page : aucune règle CSP nouvelle | V |
| `capabilities/default.json`, `capabilities/annotate.json` | non | aucune permission nouvelle (P27) | V |
| `src-tauri/build.rs` | non | sans manifeste (point connu) | V |

### 3.3 Persistance et formats

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| format `.roomboard` (cœur, `format::`) | non | `backdrop` image et éléments, déjà lus et écrits (C2) | V |
| `.rbitem` (C3) | non | non utilisé par l'envoi (P2) | V |
| `toolbar.ts:12-14` (`PROFILE_MINOR`) | non | actions en chaînes ouvertes (U13) ; profil C11b lu par une version plus ancienne : actions inconnues masquées | V |
| `localStorage`, IndexedDB | non | aucun réglage persistant | V |
| `<app_cache_dir>/captures/` | oui | fichiers temporaires, purgés (P24) | — |

### 3.4 Tests

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| nouveau `crates/roomboard-shell/tests/capture.rs` (ou tests du module) | oui | découpe et échelle, BGRX → RGBA, PNG relu, écriture + accord + retrait + purge, codes, `transparency`, `placement` | — |
| nouveau `crates/roomboard-shell/tests/coque_c11b.rs` | oui | commandes enregistrées et minces ; aucun `xcap::` ni `x11_dl::` dans `main.rs` | — |
| `crates/roomboard-shell/tests/annotation.rs` | oui | `placement` (mêmes cas que `split`) ; les 17 tests existants restent verts | V |
| `crates/roomboard-shell/tests/coque_c16.rs:18-50, :198` | non | à garder vert (aucun `Command::new`, crates déclarées) | V |
| `apps/web/src/app/annotation.test.ts` | oui | capture avant collecte, envoi (origine, nouvel onglet, `startMode`), refus → blanc, rien à envoyer, figé sans clic à travers, réentrée figée, repli figé, échec en vivant | V |
| `apps/web/src/app/annotation-page.test.ts` | oui | `opaque` : pas de sondage ; `view` dans la réponse | V |
| `apps/web/src/platform/annotation-fake.test.ts`, `annotation-tauri.test.ts`, `annotation-port.test.ts` | oui | `capture` (base64 absent : la capture passe par fichier), `release_capture` dans `finally`, `load`, `opaque` gardé par le canal JSON | V |
| nouveau `apps/web/src/app/desktop-page.test.ts` | oui | vrai cœur Wasm : page avec fond et trait, matrice, sans fond, rien à envoyer | — |
| `apps/web/src/app/workspace.test.ts` | oui | `sendCapture` : page après la page montrée, une étape (Ctrl+Z, Ctrl+Y), assets adoptés, enregistrer puis rouvrir ; nouvel onglet ; `socle-v1.roomboard` et un document C11a s'ouvrent | V |
| `apps/web/src/toolbar.test.ts`, `toolbar-profiles.test.ts`, `ui/item-state.test.ts`, `app/toolbar-host.test.ts` | oui | actions, masquage en tableau, ajout de `annotation-send` en annotation, `ACTION_REQUIRES` cohérent avec les profils livrés | V |
| `apps/web/src/ui/Toolbar.test.tsx:55, 116, 150` | non | à garder verts | V |
| `apps/web/src/core/wasm-core.contract.test.ts` | non | à garder vert (contrat inchangé) | V |
| nouveau `scripts/essais/c11b-capture-navigateur.mjs` | oui | S1 à S3 ; scène ≥ 640 px | — |
| `scripts/essais/c11a-annotation-navigateur.mjs` | non | à garder vert (31 contrôles ; la barre en annotation gagne des boutons) | V |
| `scripts/essais/c1-profils-navigateur.mjs:236-245`, `c10a…:67`, `c4…:122`, `c15…:187` | non | à garder verts (aucune boîte sur le web, scène ≥ 640 px) | V |
| `scripts/verifier.sh:99-128`, `scripts/tests/verifier-e2e.test.sh` | oui | brancher et lister l'essai C11b | V |
| `scripts/tests/coque-csp.test.sh` | non | CSP inchangée | V |
| `scripts/controle-licences.mjs`, `scripts/tests/controle-licences.test.sh` | non | à garder verts avec le nouveau verrou | V |
| `scripts/controle-wasm-bindgen.sh` | non | version de `wasm-bindgen` inchangée | V |

### 3.5 Autres dépôts

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `~/projets/actcraft` | non | référence lue (délai de 250 ms, masquage de nos fenêtres) | V |

### 3.6 CLI

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| aucune CLI dans le dépôt | non | — | V |

### 3.7 Documents d'essai

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| nouveau `docs/essais/c11b-coque.md` | oui | P36 | — |
| `docs/essais/c11a-coque.md:45` (C11a-7, transparence non peinte) | oui | renvoi vers la fiche C11b | V |
| `docs/essais/taille-wasm.md` | non | tailles inchangées | V |

### 3.8 Interfaces nouvelles (reprises par le plan telles quelles)

Rust, `roomboard_shell::capture` :

```rust
pub struct Frame { pub width: u32, pub height: u32, pub rgba: Vec<u8> }
pub enum CaptureError { Denied, Wayland, Failed(String) }        // code() : "denied" | "wayland" | "failed"
pub struct Captured { pub id: String, pub path: PathBuf, pub size: u64, pub width: u32, pub height: u32 }
pub fn area_in_frame(frame_w: u32, frame_h: u32, monitor: Rect, area: Rect) -> Option<Rect>   // échelle image / écran
pub fn crop(frame: &Frame, r: Rect) -> Frame
pub fn bgrx_to_rgba(src: &[u8], width: u32, height: u32, stride: usize) -> Vec<u8>
pub fn encode_png(frame: &Frame) -> Result<Vec<u8>, CaptureError>
pub fn save_granted(g: &GrantedPaths, root: &Path, png: &[u8], width: u32, height: u32) -> Result<Captured, CaptureError>
pub fn release(g: &GrantedPaths, root: &Path, id: &str)
pub fn purge(root: &Path)
pub fn capture_monitor(session: Session, monitor: Rect) -> Result<Frame, CaptureError>   // #[cfg] par plateforme
pub fn composited() -> Option<bool>                                                        // Linux : _NET_WM_CM_S<n> ; ailleurs None
```

Rust, `roomboard_shell::annotation` (ajouts) :

```rust
pub struct Placement { pub index: usize, pub bar: Rect, pub area: Rect, pub monitor: Rect }
pub fn placement(screens: &[(Rect, f64)], wanted: Option<usize>, main_center: (i32, i32), dock: &str, thickness_css: f64) -> Placement
pub fn transparency(session: Session, composited: Option<bool>) -> bool
```

TypeScript :

```ts
// platform/annotation-port.ts
export interface CapturedImage { readonly blob: Blob; readonly width: number; readonly height: number }
export type CaptureOutcome = { readonly ok: true; readonly image: CapturedImage } | { readonly ok: false; readonly reason: "denied" | "wayland" | "failed" };
export interface AnnotationViewport { readonly page: number; readonly matrix: Matrix }
export type SendTarget = "origin" | "new";
// AnnotationWindows : capture(o: AnnotationPlace): Promise<CaptureOutcome> ; load(o: { document: Uint8Array; opaque: boolean }): Promise<void>
// AnnotationControl : freeze(): Promise<void> ; send(to: SendTarget): Promise<void>
export function sendTarget(wanted: SendTarget, startMode: StartMode, originKind: "board" | "annotation" | null): SendTarget;

// app/desktop-page.ts
export interface PageBackdrop { readonly ref: AssetRef; readonly w: number; readonly h: number }
/** Document temporaire d'une page : fond (ou blanc), encre de `ink.page` recopiée puis transformée par `matrix` ;
 *  null : ni fond ni élément. Le document rendu appartient à l'appelant (free). */
export function capturePage(core: Pick<CoreFactory, "blank">, ink: { readonly doc: CoreDocument; readonly page: string } | null, backdrop: PageBackdrop | null, matrix: Matrix): CoreDocument | null;

// app/workspace.ts
setAnnotationBackdrop(image: CapturedImage | null): Promise<boolean>;   // page montrée du document d'annotation
annotationBackdrop(): PageBackdrop | null;
sendCapture(o: { to: SendTarget; origin: string | null; image: CapturedImage | null; view: AnnotationViewport | null }): Promise<{ readonly to: SendTarget; readonly page: number } | null>;
```

### Effets de bord sur l'existant

- `annotation_enter` passe par `ann::placement` : même géométrie qu'avant. Tests : `tests/annotation.rs` (cas de `split`
  repris par `placement`) et `cargo check` de `src-tauri`.
- `doEnter` change d'ordre : barre seule, puis mesure, puis capture éventuelle, puis encodage, puis entrée. En vivant,
  avec un document sans fond, le message d'entrée est le même qu'en C11a, plus `opaque: false`. Tests :
  `annotation.test.ts` (cas C11a gardés) et essai C11a.
- `DocumentPayload` et `ReturnedPayload` gagnent des champs facultatifs : une page `annotate` qui ne les connaît pas
  reste transparente et rend l'identité. Test : `annotation-page.test.ts`.
- La barre en annotation gagne trois boutons ; la bande s'allonge. En tableau, rien ne change. Tests :
  `toolbar.test.ts` (`itemsForMode`), essai C11a, mesures de scène.
- Le figé coupe le mode souris : Sélection y sélectionne des objets. Tests : `annotation.test.ts` (aucun
  `pointer("mouse")` en figé), `annotation-page.test.ts` (aucun `ignore(true)` en `opaque`).
- Le verrou Cargo de la racine et celui de `src-tauri` grossissent (toutes cibles) ; aucune version existante ne bouge.
  Tests : `controle-licences.mjs` (verifier), tailles Wasm à l'octet.
- `annotation_support` rend un champ de plus ; un lecteur d'avant C11b l'ignore. Test : `annotation-tauri.test.ts`.

### Chantiers en cours

- `~/projets/roomboard-wt/essai-3d-instantane` (`fix/essai-3d-instantane`, a4accb3) : aucun fichier modifié
  (`git status` vide). Son nom vise l'essai C15 (`scripts/essais/c15-3d-navigateur.mjs`), que C11b garde vert sans le
  toucher.
- `gh pr list --state open` : aucune PR ouverte.
- Aucun worktree d'une autre machine signalé par l'orchestrateur.

### Termes cherchés

- Graphe : aucun graphe RoomBoard (`ls ~/.cache/graphes/`) ; requêtes graphify non jouables.
- `grep -n -E 'C11b|C11a|U18|U21|U6\b|U9\b|U24|S13|Q2|xcap|backdrop|capture|main\.rs|fragment' docs/plans/usage-cadrage.md`
- `grep -rn 'insertPages(\|SetBackdrop' apps/web/src --include=*.ts` ; `grep -n 'readonly type: "' apps/web/src/core/api.ts`
- `grep -n 'ask\b\|choose\|confirm(\|Dialog' apps/web/src/app/workspace.ts` ; `grep -rln 'role="dialog"' apps/web/src/ui`
- `grep -n 'transparent\|backdrop' apps/web/src/engine/render/canvas2d.ts apps/web/src/app/board-session.ts apps/web/src/annotate-start.ts`
- `grep -n 'ANNOTATION_MAIN_ACTIONS\|itemsForMode\|annotation-' apps/web/src/toolbar.ts apps/web/src/toolbar-profiles.ts apps/web/src/ui/item-state.ts apps/web/src/app/toolbar-host.ts`
- `grep -n 'convert_office\|release_conversion\|read_granted_file' -r apps/web/src` ; `grep -n 'pub fn' crates/roomboard-shell/src/{lib,office,annotation}.rs`
- `grep -n 'img-src\|assetProtocol' apps/desktop/src-tauri/tauri.conf.json` ; `grep -rn 'convertFileSrc\|assetUrl' apps/web/src`
- `grep -n 'kHiddenWindowsSettleMs\|captureBackground\|grabWindow' ~/projets/actcraft/ui/src/desktopcontroller.cpp`
- Crates : `cargo info xcap` ; lecture de `xcap-0.9.10/Cargo.toml` et `src/macos/capture.rs` ; `grep -n 'XGetImage\|XGetSelectionOwner' x11-dl-2.21.0/src/xlib.rs` ; `grep -rn 'CGPreflightScreenCaptureAccess' objc2-core-graphics-0.3.2/src` ; `pkg-config --exists libpipewire-0.3` (absent) ; `rustup target list --installed`
- Sondes : `/tmp/sonde-capture` (`cargo check` Linux OK ; `cargo tree --target x86_64-pc-windows-msvc` et `aarch64-apple-darwin`) ; `/tmp/sonde-xcap-linux` (échec PipeWire) ; `/tmp/sonde-ws` (copie du workspace : `cargo metadata`, diff du verrou, `cargo check -p roomboard-shell` OK, `cargo tree -p roomboard-wasm|roomboard-formats-wasm --target wasm32-unknown-unknown` identiques, `controle-licences.mjs --cargo-json`)
- `grep -nE 'annotation|toolbar|main.rs|host-tauri|workspace' docs/architecture-constats.md`
- Coffre : `chercher.js "roomboard capture bureau annotation envoyer au tableau" 8`, `"capture d'écran xcap pipewire licence crate tauri" 8`, `"piège tauri fenêtre transparente webkitgtk capture" 6`, `"roomboard licence dépendance GPL contrôle" 5` (lus : 0272, 0273, 0274, 0265, journal C11a ; aucun piège sur la capture)

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| Fragment d'encre | `core/api.ts:381` (`extract`) | `doc.extract(page, doc.elementIds(page)): CoreDocument` | réutiliser |
| Encre dans la page temporaire | `core/api.ts:383` (`insertFragment`), `:83` (`Transform`) | `T.insertFragment(F, page, 0, 0)` ; `T.apply({ type: "Transform", ids: change.ids, matrix })` | réutiliser |
| Fond de la page | `core/api.ts:121` (`SetBackdrop`), `:31` (`BackdropInput`) | `{ type: "SetBackdrop", page, backdrop: { asset, w, h, fit: "width" } }` | réutiliser |
| Insertion en une étape après la page montrée | `engine/engine.ts:597` (`insertPages`) | `tab.board.engine.insertPages(T): Change \| null` | réutiliser |
| Assets de la page | `core/asset-store.ts:17-26` | `put(blob)`, `adopt(id, blob)`, `pick(ids)` | réutiliser |
| Page envoyée (fond + encre) | aucun (termes : `SetBackdrop` hors cœur, `insertPages(` en mémoire, `capture`) | nouveau `app/desktop-page.ts` : `capturePage(core, ink, backdrop, matrix): CoreDocument \| null` (3.8) | nouveau module : rien ne construit une page avec fond dans l'application (seuls `fromPdfPages` du cœur et les lecteurs de fichiers) |
| Nouvel onglet | `app/workspace.ts:350` (`addTab`) | `addTab(T, { name: "Capture du bureau", target: null }, assets)` | réutiliser |
| Envoi depuis l'espace de travail | `app/workspace.ts:684-709` (`annotationTab`, `replaceAnnotation`) | `setAnnotationBackdrop`, `annotationBackdrop`, `sendCapture` (3.8) | étendre |
| Contrôleur d'annotation | `app/annotation.ts:57` (`createAnnotationController`) | `AnnotationDeps` gagne `sendCapture`, `setAnnotationBackdrop`, `annotationBackdrop`, `startMode()`, `originKind()` ; `AnnotationControl` gagne `freeze()`, `send(to)` ; règle pure `sendTarget` | étendre |
| Port des fenêtres | `platform/annotation-port.ts:84` (`AnnotationWindows`) | `capture`, `load`, `opaque`, `view`, `transparent` (P28) | étendre |
| Hôte coque | `platform/annotation-tauri.ts:26` | `invoke("annotation_capture", place)`, `grantedFile(ipc, path, size).blob()`, `invoke("release_capture", { id })` dans `finally` | étendre |
| Lecture du fichier accordé | `platform/host-tauri.ts:85` (`grantedFile`) | `grantedFile(ipc, path, size): DroppedFile` | réutiliser |
| Faux hôte | `platform/annotation-fake.ts:35` | options `capture?`, `transparent?` ; `dataset.annotationOpaque`, `annotationCaptures` | étendre |
| Page `annotate` opaque | `app/annotation-page.ts:84` ; `annotate-start.ts:58` ; `board-session.ts:81` | `makeSession(doc, assets, opaque)` → `createBoardSession(doc, { ...shared, transparent: !opaque }, assets)` | étendre |
| Vue d'`annotate` | `engine/camera` (`screenToWorld`, `annotation-page.ts:132`) | `view = { page: state.pageIndex, matrix }` dans `collect` | réutiliser |
| Actions de barre | `toolbar.ts:99, :634, :647-649, :661` ; `toolbar-profiles.ts:49` ; `ui/item-state.ts:53` ; `app/toolbar-host.ts:59` | entrées des trois actions ; `itemsForMode` masque en tableau | étendre |
| Mode de démarrage | `toolbar.ts:676` (`resolveStartMode`) | `resolveStartMode(profile, caps).mode` | réutiliser |
| Géométrie de l'écran | `crates/roomboard-shell/src/annotation.rs:75, :128, :147` | `placement(…)` (3.8), appelée par `annotation_enter` et `annotation_capture` | étendre (sinon la géométrie serait recopiée dans deux commandes) |
| Session Wayland / X11 | `annotation.rs:41` (`detect_session`) | `detect_session(OS, env)` | réutiliser |
| Fichiers accordés | `crates/roomboard-shell/src/lib.rs:53-90` | `grant`, `revoke` | réutiliser |
| Dossier privé et purge | `crates/roomboard-shell/src/office.rs:273, :616, :645` | `ensure_private_dir(p)` ; patron `release_conversion` / `purge_conversions` | réutiliser (fonction) ; patron repris pour `capture::release` / `purge` |
| Capture d'écran | aucun (termes : `capture`, `screenshot`, `XGetImage`, `xcap` dans `crates/`) | nouveau `roomboard_shell::capture` (3.8) | nouveau module : aucune capture dans le dépôt ; logique pure testable, adaptateurs sous `#[cfg]` |
| Garde-fou de `main.rs` | `crates/roomboard-shell/tests/coque_c16.rs:4, :124` (`MAIN_RS`, `undeclared_roots`) | même lecture en texte dans `coque_c11b.rs` | réutiliser (patron) |
| Contrôle des licences | `scripts/controle-licences.mjs` | inchangé | réutiliser |
| Aides des essais | `scripts/essais/commun.mjs` (`stageBox`, `item`, `TAB`, `solidPng`, `frames`) ; patron `c11a-annotation-navigateur.mjs` | inchangées | réutiliser |

## 4. Hypothèses à revoir

**Niveau 1 : difficiles à défaire ou visibles des utilisateurs**

- **HC11b-1** Les trois issues de Q2 sont trois boutons de la barre d'annotation (« Envoyer au tableau », « Envoyer dans
  un nouvel onglet », « Quitter l'annotation »), pas une question posée après le retour. La fenêtre principale n'est
  alors qu'une bande : une boîte du DOM y serait coupée. Une question au retour imposerait une capture à chaque sortie
  (et l'invite macOS dès un Échap). Autre option : boîte à trois choix dans la fenêtre rendue à sa taille, avec capture à
  chaque sortie.
- **HC11b-2** « Envoyer » fait quitter l'annotation (P7). Envoyer plusieurs pages demande de rentrer à chaque fois.
- **HC11b-3** Après l'envoi, l'onglet d'annotation garde son encre (P8). Lecture possible de Q2 (« ou ») : l'envoi le
  vide ou le ferme.
- **HC11b-4** Avec un profil « Annotation au démarrage », « Envoyer au tableau » va dans un nouvel onglet et « Envoyer
  dans un nouvel onglet » est grisé. Si l'onglet d'origine est l'onglet d'annotation lui-même : nouvel onglet (P6).
- **HC11b-5** Le fond figé est gardé dans le document d'annotation (P14). La réentrée est figée si la page a un fond
  (P17) ; « Bureau vivant » le retire. Autre option : un fond figé jetable, jamais enregistré, perdu à la sortie.
- **HC11b-6** Le repli figé automatique ne se déclenche que sans compositeur X11. Une transparence non peinte avec
  compositeur (pilote GPU, `WEBKIT_DISABLE_DMABUF_RENDERER`) n'est pas détectée : il reste « Figer le bureau » à la main
  (P18).
- **HC11b-7** macOS : la première capture déclenche l'invite système et rend `denied`. L'avis guide vers les Réglages
  et une relance. XWayland : jamais de capture, fond blanc (P10, P21).
- **HC11b-8** Ni encre ni capture : avis « rien à envoyer », aucune page (P11).

**Niveau 2**

- **HC11b-9** Délai de 250 ms entre le masquage et la capture (repris d'ActCraft) ; nos fenêtres réapparaissent après
  la capture, même à l'envoi (court clignotement accepté).
- **HC11b-10** PNG en compression rapide ; poids d'une capture 4K non mesuré.
- **HC11b-11** La capture couvre la zone d'annotation (écran moins la bande de la barre), pas l'écran entier (P23).
- **HC11b-12** Fichier temporaire dans le cache de l'application, supprimé après lecture, restes purgés au lancement
  (P24).
- **HC11b-13** Vue zoomée ou défilée dans `annotate` : en vivant, la matrice de P13 garde l'encre sur le bureau capturé.
  En figé, la page est rechargée vue en haut, ajustée à la largeur : une encre tracée vue défilée avant « Figer » se
  décale.
- **HC11b-14** Les trois actions sont masquées en mode tableau, et seule « Envoyer au tableau » est ajoutée au rendu
  pour un profil d'avant C11b (P29).
- **HC11b-15** Faux hôte : `?capture=refus|wayland`, `?transparence=non`, `?encre=1` (P30).
- **HC11b-16** macOS à plusieurs écrans : l'écran `xcap` est choisi par son rectangle mis à l'échelle (points ou
  pixels). À vérifier sur le Mac, comme `CGWindowListCreateImage`, marqué obsolète depuis macOS 15 (cible de l'ENI :
  macOS 14).
- **HC11b-17** Libellés des avis (P10, P11, P12) et nom « Capture du bureau » du nouvel onglet.

## 5. Décisions d'architecture

**DA1 — La capture vit dans `roomboard_shell::capture`, isolée par cible ; aucun PipeWire.**
Contexte : `xcap` exige PipeWire sous Linux (essai) ; la VM n'a pas ses en-têtes ; aucune installation système permise.
Décision : `xcap` sous Windows et macOS ; Xlib (`x11-dl`, déjà dans l'arbre de tao) sous Linux X11 ; Wayland refusé. La
logique pure est testée par `cargo test`, les commandes Tauri restent minces.
Conséquences : la VM construit et teste la partie Linux ; le code Windows et macOS reste aux fiches d'essai.

**DA2 — La capture passe par un fichier accordé ; l'encre ne quitte pas la page.**
Contexte : règle de l'encre ; l'encre est déjà dans la fenêtre principale (coffre 0272) ; U24 prévoit les fichiers
temporaires de la coque.
Décision : PNG écrit et accordé par Rust, lu par `read_granted_file`, puis retiré. Page construite en mémoire
(`desktop-page.ts`), insérée par `insertPages` en une étape.
Conséquences : aucune image en base64 dans un événement ; aucun changement du cœur ni de la CSP.

**DA3 — Le bureau figé est un fond du document d'annotation, transporté par l'aller-retour existant.**
Contexte : U18 veut une fenêtre opaque avec l'image en fond ; C11a a déjà un seul transport (le document).
Décision : `SetBackdrop` dans la principale, document renvoyé avec `opaque` ; `annotate` peint le fond et ne laisse
plus passer le clic.
Conséquences : le fond s'enregistre avec l'onglet d'annotation et revient à la réentrée ; coût d'un aller-retour par
bascule.

**DA4 — Les trois issues de Q2 sont des actions de barre, avec une règle pure de cible.**
Contexte : Q2 donne trois issues au retour ; en annotation, la fenêtre principale n'est qu'une bande.
Décision : `annotation-send`, `annotation-send-new` et la sortie existante ; `sendTarget(wanted, startMode, originKind)`.
Conséquences : pas de boîte nouvelle ; la capture n'a lieu que sur demande ; une boîte au retour reste possible plus tard
(HC11b-1).

## 6. Scénarios d'acceptation

- **S1** (Playwright, faux hôte `?annotation=faux&encre=1`, vivant) Ouvrir RoomBoard, ajouter une page (2 pages),
  revenir à la page 1. « Annotation du bureau », puis « Envoyer au tableau » : l'annotation se ferme. L'onglet d'origine
  montre la page 2 de 3, avec la capture du faux hôte en fond (pixel au centre de la scène `#3366cc` à ±8 près) et le
  trait sélectionnable (clic avec Sélection : sélection d'un objet). Avis « envoyé au tableau : page 2 ». Ctrl+Z :
  2 pages ; Ctrl+Y : 3 pages. Enregistrer (`?fichiers=repli`), rouvrir le fichier : 3 pages, fond et trait présents.
  Scène ≥ 640 px après le retour ; aucune erreur dans la page.
- **S2** (Playwright, faux hôte `&capture=refus`, puis `&capture=wayland`) « Envoyer au tableau » : page à fond blanc
  (pixel blanc) avec le trait sélectionnable. Avis « capture du bureau impossible (autorisation “Enregistrement de
  l'écran” refusée … ) : page à fond blanc », puis « … (Wayland) … ». Sans `encre` ni capture : avis « rien à envoyer »,
  nombre de pages inchangé.
- **S3** (Playwright, faux hôte, figé) En annotation, « Figer le bureau » : `annotationOpaque=1`, bouton enfoncé
  « Bureau vivant ». Choisir Sélection : `data-pointeur` reste `draw` (pas de clic à travers). « Envoyer dans un nouvel
  onglet » : un nouvel onglet « Capture du bureau » est montré, d'une page, avec le fond bleu et le trait ; l'onglet
  d'origine est inchangé. Rentrer : l'entrée est figée (`annotationOpaque=1`) ; « Bureau vivant » : `annotationOpaque=0`.
  Avec `&transparence=non`, l'entrée est figée d'emblée et le bouton dit « Recapturer le bureau ». Avec le profil
  « Annotation au démarrage » : « Envoyer au tableau » ouvre un nouvel onglet et « Envoyer dans un nouvel onglet » est
  grisé.
- **S4** (tests automatiques : `cargo test`, Vitest, `verifier.sh --e2e`) `capture` : découpe d'une zone à l'échelle
  1 et 2, BGRX → RGBA, PNG relu à l'identique, fichier accordé lisible par `read_granted`, puis retiré et supprimé,
  purge des restes, `transparency` (X11 sans compositeur : faux ; Windows : vrai), `Wayland` sans capture. Contrôleur :
  la capture vient avant la collecte, et une seule insertion d'une étape. `desktop-page` (vrai cœur) : la matrice place
  le trait. `socle-v1.roomboard` et un document C11a s'ouvrent. `cargo check` et `clippy -D warnings` de `src-tauri`
  passent. `controle-licences` OK. Tailles Wasm à l'octet : 1 374 398 o et 2 794 511 o.
- **S5** (en coque, à la main, fiche `docs/essais/c11b-coque.md`, reprend la partie C11b de S13) Windows 10 et 11,
  macOS 14, Linux X11 : en annotation, écrire sur le bureau puis « Envoyer au tableau ». Le tableau montre la page
  insérée après la page montrée, avec le bureau en fond, **sans la barre ni l'encre dans l'image**, et le trait par-dessus
  au même endroit. « Figer le bureau » : la fenêtre devient opaque, l'image ne bouge plus quand on déplace une fenêtre
  dessous. macOS : invite, refus (fond blanc et avis), octroi puis relance (capture). Linux X11 sans compositeur : entrée
  figée d'emblée. XWayland : fond blanc et avis « Wayland ». Deux écrans : la capture vient de l'écran de l'annotation.

## 7. Hors périmètre

- Portail Wayland (`xdg-desktop-portal` Screenshot ou ScreenCast, PipeWire) et capture sous Wayland natif.
- Boîte de choix posée au retour (HC11b-1), envoi sans quitter l'annotation, capture de plusieurs écrans à la fois.
- Détection d'une transparence non peinte avec compositeur (pilote GPU) ; réglage `WEBKIT_DISABLE_DMABUF_RENDERER`.
- Durcissement des capacités (manifeste de commandes dans `build.rs`), constat ouvert `main.rs:322` (deux écrivains du
  clic à travers) : la règle du figé est tenue des deux côtés, l'écrivain unique reste à faire.
- Compilation Windows et macOS sur la VM ; `tauri build` ; bundle.
- Essais réels en coque (Windows, macOS, X11, XWayland, deux écrans) : séances de Jérôme (S5).
- Autres dépôts : aucun.

## 8. Portes immédiates

Aucune.
