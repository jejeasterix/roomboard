# État — usage-c11b-capture

Statut : clos
Gabarit : chantier
Objectif : En coque, Jérôme fige son bureau en fond d'annotation et envoie capture et encre au tableau comme une nouvelle page après la page montrée, avec un fond blanc et un avis quand la capture est impossible.
Avancement : 16/16 tâches terminées
Étage : 4 — clos le 2026-11-23 12:15 (PR #40 fusionnée, `main` 24aee6d)
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c11b-capture   Branche : feat/usage-c11b-capture   Base : origin/main @ a4accb3
Branche principale locale au lancement : a4accb3
Cadrage : docs/plans/usage-c11b-capture-cadrage.md   Plan(s) : docs/plans/usage-c11b-capture-PLAN.md

## Mandat
Ordre OE78. Jérôme, 2026-11-23 vers 07:00 : « Go c11 ». Mandat du 2026-11-19 : « Continue d'avancer autant que possible suivant notre objectif établi. Nous ferons les tests plus tard sur la version à laquelle tu seras parvenu ». Ouvrier CLI : aucune question ne parvient, choix tranchés seuls et écrits. Lancement 09:34 ; arrêt ferme 14:04 (pousser et mettre l'état à jour à 13:54).

## Référence
Tailles avant : module principal 1 374 398 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728) (chiffres de l'ordre, remesurés par la référence complète)
Complète (origin/main @ a4accb3, verifier.sh --e2e) : OK du premier coup (« verifier.sh : e2e OK », « verifier.sh : OK »). Tailles mesurées : 1 374 398 o et 2 794 511 o.

## Compteurs
contre-relecture cadrage 0/2 (sautée, choix tranché : le temps borné à 4 h 30 ; la relecture du plan vérifie aussi les décisions du cadrage) · relecture plan 1/3 (aucun bloquant) · vagues sans progrès 0/2 · correctifs de fin 2/2 (T13+T14, puis T16) · simplification 1 (T15)

## Tâches
Table : `docs/plans/usage-c11b-capture-PLAN.md` en tête. Vagues : 1 = T1, T2, T4, T6, T11 · 2 = T3, T5, T7, T8, T9 · 3 = T10.
Correctifs de la relecture du plan, passés dans les briefs : T3 (cacher `main` d'abord ou remontrer `annotate` sur erreur) ; T7 (`send` s'arrête si la collecte échoue, avec test) ; écart déclaré : `setAnnotationBackdrop(image, page?)`.
| id | état | essais | commit | preuve rejouée |
|----|------|--------|--------|----------------|
| T2 | terminée | 1/3 | fa5026c | `capture` : 17 passed, 1 ignored, `fichier_accorde_lisible_puis_retire` ok ; xcap sous cfg(windows, macos) ; licences OK (rapport) |
| T6 | terminée | 1/3 | 5718208 | `desktop-page.test.ts` 11 passed avec ROOMBOARD_WASM_REQUIRED=1 ; tsc 0 |
| T11 | terminée | 1/3 | 759f034 | 33 cases ; renvoi c11a = 1 |
| T1 | terminée | 1/3 | fdd7fd6 | `annotation` : 22 passed, `placement_reprend_pick_screen_physical_et_split` ok |
| T4 | terminée | 1/3 | eba4a06 | Vitest 3 fichiers 31 passed ; tsc 0 |
| T3 | terminée | 1/3 | 2746188 | `coque_c11b` 5 passed (`capture_hides_then_shows…` ok), `coque_c16` 6 passed ; clippy src-tauri -D warnings `Finished` |
| T5 | terminée | 1/3 | face1ef | `annotation-page.test.ts` 20 passed, nom « opaque : session opaque… » présent ; tsc 0 |
| T7 | terminée | 1/3 | 6a6120e | 89 passed (2 fichiers), noms « capture avant la collecte », « double clic », « collecte sans réponse » présents ; tsc 0 ; revue immédiate : 2 importants, 3 mineurs → T12 |
| T8 | terminée | 1/3 | 30b8901 | `workspace.test.ts` 168 passed, ROOMBOARD_WASM_REQUIRED=1, « compatibilité : socle-v1.roomboard » présent ; `skipIf(real === null)` = patron du dépôt, forcé par la variable |
| T9 | terminée | 1/3 | 9568638 | 5 fichiers 167 passed, « C11b : figer et envoyer » ×3 ; tsc 0 |
| T10 | terminée | 1/3 | 059da0b | essai C11b : code 0, 54 `ok —`, scène 706 px (S1), 658 px (S2), Ctrl+Z retire la page, rouvert : trait et fond sur la page 2 |
| T12 | terminée | 1/3 | 1fb100b | correctifs de revue 1, 2, 3, 5 ; `annotation.test.ts` 46 passed ; tsc 0 ; constat 4 consigné |
| T13 | terminée | 1/3 | ff5c179 | correctifs web du tour 1 (page 0 du fond, setTool après load, avis de fond refusé, warn, App.test, mesures de scène) ; 4 fichiers 286 passed ; essai C11b 57 `ok —` |
| T14 | terminée | 1/3 | 931d2c9 | correctifs Rust du tour 1 (réessai AlreadyExists, sonde macOS avant masquage, `screens_of`/`center_of`, test hide/show strict) ; shell 52/22/19/7/6 passed ; clippy src-tauri `Finished` |
| T15 | terminée | 1/3 | ad26abc | simplification : `IDENTITY_MATRIX` de `core/shapes`, `Placement::default()` ; diff de tests vide |
| T16 | terminée | 1/3 | 9a6b51e | correctifs du tour 2 (réglages d'outil rejoués après `load`, fond refusé retiré, recapture, 100 essais) ; `annotation.test.ts` 58 passed ; `capture` 19 passed |

## Terminé quand
toutes les tâches terminées (aucune bloquée) · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · scénarios réussis · tailles Wasm sous plafond, inchangés · scène ≥ 640 px mesurée · PR mergée par `git merge --no-ff` + `git push` sans force

## Rapport
- Double relecture : tour 1 (conformité, qualité Rust, qualité web) : 0 bloquant, 3 major, minors ; tour 2 : 11/12 fermés, 1 major nouveau (réglages d'outil après « Figer ») corrigé par T16. Aucun bloquant ouvert.
- `verifier.sh --e2e` : OK sur 7d96eed (verifier-1) et sur f6ecc56 (verifier-2) ; final sur eeeba45 (verifier-3) : `verifier.sh : e2e OK`, `verifier.sh : OK`, code 0 ; module Wasm 1 374 398 o, formats 2 794 511 o ; C11b : OK, scène 706 px.
- Scénarios : S1 à S3 joués par l'essai Playwright (faux hôte) : réussis ; S4 tests automatiques : réussis ; S5 : fiche `docs/essais/c11b-coque.md` (33 cases) pour les séances de Jérôme.
- Simplification appliquée : T15. Constat d'architecture écrit : 1 (`crates/roomboard-shell`, duplication `is_capture_id`). Zones à 3 constats ouverts ou plus (proposition d'audit, jamais lancé) : crates/roomboard-core 5, apps/web/src/app 7, apps/web/src 3, apps/web/src/platform 8, crates/roomboard-formats 4.
- Release : non due (aucune release sans go ; aucun tag).
- Porte de fin : aucune question posée (ordre OE78 : aucune question ne parvient à Jérôme pendant le tour) ; hypothèses listées pour sa relecture.

## Hypothèses à revoir
Niveau 1 (visibles des utilisateurs) : HC11b-1 (trois boutons de barre au lieu d'une proposition au retour), HC11b-2 (« Envoyer » quitte l'annotation), HC11b-3 (l'onglet d'annotation garde son encre après l'envoi), HC11b-4 (« Annotation au démarrage » : envoi dans un nouvel onglet), HC11b-5 (fond figé gardé, réentrée figée), HC11b-6 (repli figé seulement sans compositeur X11), HC11b-7 (macOS : la première capture déclenche l'invite et rend `denied`), HC11b-17 (libellés des avis). Le reste (HC11b-8 à 16) : voir le cadrage, § 4.
HC11b-1 (niveau 1, relevée par la relecture du plan) : les trois issues de Q2 deviennent trois boutons de la barre pendant l'annotation, et non une proposition au retour. À faire valider par Jérôme en tête du rapport.

## Hors périmètre
- Revue T7/T8, constat 4 (mineur, non vérifié) : en vivant sans capture, `sendCapture` recopie le fond de la page de la vue ; atteignable seulement si `annotate` montre une page à fond alors que l'entrée était vivante. Correction : passer « figé » à l'espace de travail (contrat `SendRequest`).
- T12 : quand `replaceAnnotation` rend `false`, le contrôleur ne dit aucun avis lui-même.
- T12 : la réentrée figée (P17) lit la page montrée dans la fenêtre principale, pas forcément celle d'`annotate`.
- `crates/roomboard-shell/tests/coque_c11b.rs` non formaté (T3) : corrigé par 730225f.

## Portes
ouvertes : — · passées : fusion locale `git merge --no-ff` + `git push` sans force (ordre OE78) ; aucune release

## Cadrage
36 décisions (P1-P36), 17 hypothèses dont 8 de niveau 1, 4 décisions d'architecture, 25 modules à réutiliser ou étendre (2 nouveaux : `app/desktop-page.ts`, `roomboard_shell::capture`). Scénarios : S1 envoi bureau vivant · S2 capture refusée / Wayland · S3 bureau figé · S4 tests automatiques · S5 essais réels en coque (fiche `docs/essais/c11b-coque.md`).
Capture : `xcap` 0.9.10 (Apache-2.0) sous Windows et macOS seulement ; Linux X11 par `x11-dl` (MIT) + `png` (MIT OU Apache-2.0) ; macOS : `objc2-core-graphics` pour l'autorisation.

## Pièges trouvés
- `main` locale a bougé pendant le chantier : a4accb3 → 4d11442 (autre session) ; intégrer `origin/main` avant la fusion.
- Prémisse démentie : `xcap` sous Linux exige PipeWire (`libspa-sys`, non optionnel) ; essai `cargo check` sur la VM.
- Prémisse démentie : l'encre n'a pas besoin d'un fichier temporaire ; le document d'annotation revient déjà à la fenêtre principale (0272) ; le fragment se fait par `extract` dans la page, seule la capture passe par un fichier accordé.
- Prémisse démentie : sans autorisation macOS, `xcap` rend le fond d'écran seul, sans erreur.
- Prémisse démentie : `fit: "contain"` (U6) : le cœur n'accepte que `"width"` à l'écriture.
- Chantiers sur les mêmes fichiers : aucun (`essai-3d-instantane` ne modifie rien).

## Notes du coffre à poser

### Note 1

Chemin : `00_Journal/2026-11-23-roomboard-usage-c11b-capture-clos.md`

```markdown
---
id: 2026-11-23-roomboard-usage-c11b-capture-clos
type: journal
summary: "RoomBoard usage C11b clos : « Figer le bureau » (capture sans nos fenêtres, fond d'une fenêtre d'annotation opaque, repli automatique sans transparence) et « Envoyer au tableau » (une page après la page montrée : capture en backdrop, encre en fragment, une étape annulable ; fond blanc et avis sans capture) ; xcap sous Windows et macOS, Xlib (x11-dl) sous Linux X11, aucun PipeWire ; PR #40."
created: 2026-11-23
project: "[[roomboard]]"
tags: [projet/roomboard, chaine/nouvelle-feature]
evidence: "docs/sessions/usage-c11b-capture-etat.md ; docs/plans/usage-c11b-capture-cadrage.md ; docs/essais/c11b-coque.md (dépôt jejeasterix/roomboard)"
---

# RoomBoard — usage C11b (capture et envoi au tableau), clos (OE78)

- Livré : `roomboard_shell::capture` (découpe de la zone d'annotation, BGRX → RGBA, PNG, fichier accordé puis retiré, purge des restes au lancement, sonde d'autorisation macOS avant le masquage) ; `roomboard_shell::annotation::placement` partagé ; commandes Tauri minces `annotation_capture`, `release_capture` ; `app/desktop-page.ts` (`capturePage`) ; contrôleur : « Figer le bureau », « Envoyer au tableau », « Envoyer dans un nouvel onglet », repli figé, réentrée figée ; barre : trois actions masquées en mode tableau.
- Capture : `xcap` 0.9.10 (Apache-2.0) sous Windows et macOS seulement, car sous Linux il exige PipeWire (`libspa-sys`, non optionnel ; essai sur la VM) ; Linux X11 par `x11-dl` (MIT) et `png` (MIT OU Apache-2.0) ; macOS : `objc2-core-graphics` (Zlib OU Apache-2.0 OU MIT) pour l'autorisation ; Wayland : fond blanc et avis. `controle-licences` : OK.
- L'encre ne quitte jamais la page : le fragment se fait par `extract` dans la fenêtre principale (le document revient déjà par l'aller-retour de 0272) ; seule la capture passe par un fichier accordé.
- Preuves sans coque : `verifier.sh --e2e` OK ; essai Playwright C11b (57 contrôles, scène 658 à 706 px, Ctrl+Z retire la page envoyée, rouvert : fond et trait sur la page 2) ; Vitest avec le vrai cœur Wasm ; `cargo test` de la capture ; `cargo check` et `clippy -D warnings` de `src-tauri`.
- Tailles inchangées : module principal 1 374 398 o, formats 2 794 511 o.
- Reste aux essais en coque (`docs/essais/c11b-coque.md`, 33 cases) : macOS (autorisation accordée et refusée), Windows, X11 avec et sans compositeur (repli figé), XWayland et Wayland, deux écrans, poids d'une capture 4K. Le code Windows et macOS n'est pas compilé sur la VM.
- Hypothèse de niveau 1 à valider : les trois issues de Q2 sont trois boutons de la barre pendant l'annotation, pas une proposition au retour (HC11b-1).
- Décisions : [[NNNN-roomboard-c11b-capture-shell-sans-pipewire]], [[NNNN-roomboard-c11b-envoi-page-fichier-accorde]].
```

### Note 2

Chemin : `02_Decisions/NNNN-roomboard-c11b-capture-shell-sans-pipewire.md`

```markdown
---
id: NNNN-roomboard-c11b-capture-shell-sans-pipewire
type: decision
summary: "RoomBoard C11b : la capture du bureau vit dans roomboard_shell::capture, isolée par cible ; xcap (Apache-2.0) sous Windows et macOS seulement, Xlib par x11-dl (MIT) sous Linux X11, aucun PipeWire ; Wayland refusé (fond blanc et avis) ; commandes Tauri minces ; prise par l'agent."
created: 2026-11-23
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision/architecture]
evidence: "docs/plans/usage-c11b-capture-cadrage.md (DA1, P18, P19, P35) ; crates/roomboard-shell/Cargo.toml ; crates/roomboard-shell/src/capture.rs (dépôt jejeasterix/roomboard)"
---

# RoomBoard — capture du bureau sans PipeWire (prise par l'agent)

- Constat : `xcap` 0.9.10 tire `pipewire`/`libspa-sys` sous Linux, sans fonctionnalité Cargo pour l'ôter ; `cargo check` échoue sur la VM faute de `libpipewire-0.3`.
- Décision : `xcap` sous `cfg(any(windows, target_os = "macos"))` ; Linux X11 par `XGetImage` sur la racine (`x11-dl`, déjà dans l'arbre de tao), chargé à l'exécution ; Wayland natif : capture refusée avant tout essai, page à fond blanc et avis.
- macOS : `xcap` rend le fond d'écran seul sans autorisation ; la sonde `CGPreflightScreenCaptureAccess` / `CGRequestScreenCaptureAccess` passe avant le masquage des fenêtres.
- Nos fenêtres sont masquées, 250 ms d'attente, capture, puis remontrées quoi qu'il arrive (aucun `?` entre `hide` et `show`, gardé par un test).
- Conséquence : la VM construit et teste la partie Linux ; le code Windows et macOS reste aux essais réels.
```

### Note 3

Chemin : `02_Decisions/NNNN-roomboard-c11b-envoi-page-fichier-accorde.md`

```markdown
---
id: NNNN-roomboard-c11b-envoi-page-fichier-accorde
type: decision
summary: "RoomBoard C11b : la capture passe de Rust à la page par un fichier PNG accordé puis retiré ; l'encre ne quitte jamais la page (fragment par extract) ; la page envoyée est construite en mémoire et insérée par insertPages après la page montrée en une étape annulable ; le bureau figé est un fond du document d'annotation ; les trois issues de Q2 sont des actions de barre ; prise par l'agent."
created: 2026-11-23
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision/architecture]
evidence: "docs/plans/usage-c11b-capture-cadrage.md (DA2, DA3, DA4, P3 à P14, HC11b-1) ; apps/web/src/app/desktop-page.ts ; apps/web/src/app/workspace.ts (dépôt jejeasterix/roomboard)"
---

# RoomBoard — envoi au tableau par fichier accordé (prise par l'agent)

- U21 (fichier temporaire pour l'encre) est dépassée par C11a : le document d'annotation revient déjà à la fenêtre principale ([[0272-roomboard-c11a-document-aller-retour-roomboard]]). Seule la capture passe par un fichier accordé (U24), lu par `read_granted_file`, puis `release_capture`.
- Page envoyée : `capturePage` part d'une page blanche, pose la capture en `backdrop` (`fit: "width"`, seul accepté par le cœur), insère l'encre en fragment ; `insertPages` l'ajoute après la page montrée en une étape : une annulation la retire.
- Sans capture (macOS refusé, Wayland, échec) : fond blanc et avis ; ni encre ni capture : avis « rien à envoyer ».
- Bureau figé : `SetBackdrop` sur la page 0 du document d'annotation (la page qu'`annotate` montre), document renvoyé en opaque ; la réentrée est figée si cette page a un fond ; le repli figé automatique s'applique sans transparence.
- Q2 : trois actions de barre (« Envoyer au tableau », « Envoyer dans un nouvel onglet », sortie) plutôt qu'une question au retour (HC11b-1, à faire valider par Jérôme).
```

### Note 4

Chemin : `01_Projets/roomboard.md`, ligne 21 (remplacer la ligne entière par celle-ci)

```markdown
- Vague 2 en cours : C7b éditeur de texte riche clos (PR 17, `main` 98bf320) ; C10b tableau (fusion, ombrage révélable, collage HTML, import `.xlsx`) clos (PR 18, `main` 54a7c80) — voir [[2026-11-20-roomboard-usage-c10b-tableau-clos]] ; C3 groupes, fragments et presse-papiers clos (PR 19, `main` 1a756bd) — voir [[2026-11-20-roomboard-usage-c3-groupes-clos]] ; C6a pot de peinture vectoriel et mot par mot clos (PR 20) — voir [[2026-11-20-roomboard-usage-c6a-pot-clos]] et [[0254-roomboard-pot-commande-fill]] ; C12 PDF (import en onglet, fond pdf-page, export annoté pdf-lib + krilla) clos (PR 21, `main` 7779629) — voir [[2026-11-20-roomboard-usage-c12-pdf-clos]] et [[0255-roomboard-pdf-fond-tuiles-export-superpose]] ; C5 édition d'image non destructive (rogner, retourner, quarts de tour, luminosité/contraste, couleur transparente, pixels en Worker) clos (PR 22, `main` eb310e1) — voir [[2026-11-20-roomboard-usage-c5-image-clos]] et [[0256-roomboard-c5-contigu-depuis-les-bords]]  ; C14 vidéo et son (élément media, lecture dans le canvas, lien en coque) clos (PR 23, `main` 858fd82) — voir [[2026-11-20-roomboard-usage-c14-media-clos]] et [[0258-roomboard-media-lie-en-coque-lecteurs-hors-coeur]]. ; C6b pot de peinture sur image (remplir, effacer, tolérance, sourceAsset, Rétablir l'original) clos (PR #24, `main` 7cdef4a) — voir [[2026-11-21-roomboard-usage-c6b-pot-image-clos]] et [[0259-roomboard-c6b-pot-image-destructif]] ; C15 3D (élément model3d, orbite, instantané, three à la demande, ZIP) clos (PR 25, `main` 94976f0) — voir [[2026-11-21-roomboard-usage-c15-3d-clos]] et [[0260-roomboard-model3d-rendu-unique-a-la-demande]] ; C8 pot sur zones fermées (élément fill, vue rastérisée, i_overlay dans le module principal) clos (PR #26, `main` 71aab20) — voir [[2026-11-21-roomboard-usage-c8-pot-zones-clos]] et [[0261-roomboard-c8-zone-vue-rasterisee-i-overlay-module-principal]] ; C4 bibliothèque de ressources (panneau, dossiers, recherche, vignettes, glisser vers la page, paquets .rbpack ; IndexedDB sur le web, plugin-fs en coque) clos (PR #27, `main` 3011761) — voir [[2026-11-21-roomboard-usage-c4-bibliotheque-clos]] et [[0263-roomboard-c4-bibliotheque-indexeddb-plugin-fs-rbpack-ts]] ; restes d'OD94 : porte S6 tenue sous charge (médianes 27 à 30 ms, maximum 38 ms, accesseur elementIdsOfKind) et audit d'architecture en rapport seul (`docs/audits/2026-11-21-audit-architecture.md`, 5 candidats) clos (PR #28) — voir [[2026-11-21-roomboard-restes-od94-porte-s6-clos]] et [[0264-roomboard-porte-s6-gains-sans-prechauffage]] ; C16 Word, Excel, PowerPoint (conversion en PDF par LibreOffice ou COM en coque, original gardé et « Modifier dans l'application d'origine », message web) clos (PR #29, `main` bea54d7) — voir [[2026-11-21-roomboard-usage-c16-office-clos]] et [[0265-roomboard-c16-office-conversion-native-original-garde]] ; C13 lot 1 formats de tableaux blancs (lecteur SVG commun, import .iwb et .ubz avec avis, copies .iwb et .ubz ; module formats sous opt-level z) clos (PR #30, `main` e8e112b) — voir [[2026-11-21-roomboard-usage-c13-lot1-tableaux-clos]] et [[0266-roomboard-c13-lecteur-svg-formats-opt-level-z]] ; C13 lot 2 formats de tableaux blancs (import .notebook par le dialecte SMART du lecteur SVG commun, import .olf lu en TypeScript dans le Worker ZIP, refus clair du .flipchart en attendant le lot 3 ; import seul par Q5) clos (PR #32, `main` 13c61f1) — voir [[2026-11-22-roomboard-usage-c13-lot2-notebook-olf-clos]] et [[0268-roomboard-c13-notebook-formats-olf-typescript]] ; C13 lot 3 formats de tableaux blancs (import .flipchart au niveau B : conteneur Bamboo et qCompress en TypeScript dans le Worker ZIP, objets Qt en Rust par portage d'ActCraft ; import seul) clos (PR #33, `main` 69ae924) — voir [[2026-11-22-roomboard-usage-c13-lot3-flipchart-clos]] et [[0269-roomboard-c13-flipchart-conteneur-ts-objets-rust]] ; OE71 marge du module formats (wasm-opt -Oz par le paquet npm binaryen, 3 118 426 → 2 794 511 o, marge 351 217 o) clos (PR #36, `main` 6c97661) — voir [[0271-roomboard-wasm-opt-module-formats]] ; C11a annotation de bureau (fenêtre annotate transparente au premier plan, barre seule cliquable, bascule dessin / souris, démarrage en annotation, zone de dépôt ; document en aller-retour .roomboard base64 ; Wayland natif refusé avec relance XWayland) clos (PR #37, `main` 5beb192) — voir [[2026-11-23-roomboard-usage-c11a-annotation-clos]], [[0272-roomboard-c11a-document-aller-retour-roomboard]], [[0273-roomboard-c11a-fenetres-coque-decoupe-ecran]] et [[0274-roomboard-c11a-mode-souris-sondage-page]] ; OE77 médias liés de l'onglet d'annotation (PR #38) et OE80 essai 3D lu avant décodage (PR #39, `main` 4d11442) clos — voir [[roomboard-instantane-3d-lu-avant-decodage]] ; C11b capture et envoi au tableau (« Figer le bureau » : capture sans nos fenêtres en fond d'une fenêtre d'annotation opaque, repli sans transparence ; « Envoyer au tableau » : une page après la page montrée, capture en backdrop et encre en fragment, une étape annulable, fond blanc et avis sans capture ; xcap sous Windows et macOS, x11-dl sous Linux X11, aucun PipeWire) clos (PR #40, `main` 24aee6d) — voir [[2026-11-23-roomboard-usage-c11b-capture-clos]], [[NNNN-roomboard-c11b-capture-shell-sans-pipewire]] et [[NNNN-roomboard-c11b-envoi-page-fichier-accorde]]
```
