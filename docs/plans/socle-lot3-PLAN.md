# Plan du lot 3 — Moteur d'interaction (socle RoomBoard)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**Spec :** `docs/plans/socle-cadrage.md` (D5, D8, D11, D17, D18, D19, D20, D38, D39 ; DA2, DA5, DA7, DA9 ; scénario S2
au navigateur ; essai S1 rejoué). Plan maître : `docs/plans/socle-PLAN.md` (§ Les 5 lots, § Risque n° 1). État :
`docs/sessions/socle-etat.md` (§ Reprise, § Constats d'architecture, § Fin de lot 2).

**But :** l'application web (et la coque Tauri, qui sert le même `apps/web/dist`) trace au stylet, au doigt et à la
souris avec la pression, gomme, annule et rétablit, pour l'essai de Jérôme du jeudi 2026-11-19 (décision de Jérôme,
2026-11-17 : « Oui, avant jeudi »). Échelon 1 de DA9 seulement (Canvas 2D, événements fusionnés et prédits,
`desynchronized`) ; le rendu reste derrière `Renderer` (DA2) pour les échelons 2 à 4 que le verdict de jeudi pourra
ajouter.

**Architecture :** `apps/web/src/engine/` en TS pur (D1, DA2) : `camera.ts` (D17), `input/router.ts` (D18) branché
sur `input/sampler.ts` (lot 1), `tools/pen.ts` (encre vive D20 par le `StrokeBuilder` du cœur) et `tools/eraser.ts`
(aperçus D38), `render/canvas2d.ts` (deux canvas, D19), `engine.ts` qui relie le tout au `CoreDocument` (`api.ts`,
figé au lot 2) et attrape les erreurs du cœur (`Err(LastPage)`). `apps/web/src/main.ts` monte le moteur et une barre
minimale en DOM simple (`src/app/barre.ts`), remplacée au lot 5 par l'interface SolidJS. Côté Rust, le cache des
contours passe de la liaison au cœur pour que `hit_test_path` (aperçu de la gomme d'objet, à chaque image) ne
recalcule plus 1 000 contours (194 ms mesurés au lot 2).

**Tech :** TypeScript 5.6 strict, Vite 6, Vitest 3 (environnement Node, faux objets) ; Rust (yrs 0.28.1, freedraw
1.0.4) ; wasm-bindgen 0.2.130 ; Playwright 1.65.1 (cache npx de la VM) pour l'essai S2 hors `verifier.sh`.

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T17 | Cache des contours dans le cœur (constat d'architecture) | — | crates/roomboard-core/src/document.rs, crates/roomboard-core/src/query.rs, crates/roomboard-core/src/commands.rs, crates/roomboard-wasm/src/lib.rs | isolé | concepteur-critique | `cargo test -p roomboard-core --lib query::` : 13 passed, 1 ignored, `hit_test_path_computes_each_outline_once` et `cache_follows_partial_erase_and_undo_redo` présents ; `cargo test -p roomboard-wasm` : 14 passed dont `outline_is_cached_and_stable` ; ligne `Mesure :` (appel suivant < 16 ms en release) ; `verifier.sh : OK` | S2 | #tache-t17 |
| T18 | Contrats du moteur, caméra et raccourcis clavier | — | apps/web/src/engine/page.ts, apps/web/src/engine/camera.ts, apps/web/src/engine/camera.test.ts, apps/web/src/engine/input/keys.ts, apps/web/src/engine/input/keys.test.ts, apps/web/src/engine/input/gesture.ts, apps/web/src/engine/render/renderer.ts, apps/web/src/engine/tools/tool.ts | isolé | implementeur-tdd | vitest `camera.test.ts` 7 passed, `zoomAt garde le point du monde sous le pointeur` présent ; vitest `keys.test.ts` 9 passed, `pendant une composition IME : rien` présent ; `verifier.sh : OK` | S2 | #tache-t18 |
| T26 | Banc du lot 1 rejoué dans l'application (`?banc`) | — | apps/web/src/app/banc.ts, apps/web/src/app/banc.test.ts, apps/web/src/engine/input/support.ts, apps/web/src/proto/stylet.ts | isolé | implementeur-tdd | vitest `banc.test.ts` 3 passed, `un trait : points et retards mesurés aux images du moteur` présent ; `verifier.sh : OK` (dont `prototype en fichier unique OK`) | S1 (rejoué) | #tache-t26 |
| T19 | `Canvas2DRenderer` à deux canvas (D19, D38) | T18 | apps/web/src/engine/render/canvas2d.ts, apps/web/src/engine/render/canvas2d.test.ts | isolé | implementeur-tdd | vitest `canvas2d.test.ts` 11 passed, `Path2D en cache par id, invalidé par Change` présent ; `verifier.sh : OK` | S2 | #tache-t19 |
| T20 | Routeur d'entrées D18 (doigt, paume, pincement) | T18 | apps/web/src/engine/input/router.ts, apps/web/src/engine/input/router.test.ts | isolé | implementeur-tdd | vitest `router.test.ts` 14 passed, `second doigt dans les 150 ms : trait annulé sans écriture, puis pincement` présent ; `verifier.sh : OK` | S2 | #tache-t20 |
| T23 | Moteur : boucle d'image, écritures, annuler / rétablir, erreurs du cœur | T18 | apps/web/src/engine/engine.ts, apps/web/src/engine/engine.test.ts | isolé | implementeur-tdd | vitest `engine.test.ts` 13 passed, `Err(LastPage) attrapé : run rend null, message dans l'état, rien ne lève` présent ; `verifier.sh : OK` | S2 | #tache-t23 |
| T21 | Stylo : encre vive D20, pression D8, écriture au relâché | T18 | apps/web/src/engine/tools/pen.ts, apps/web/src/engine/tools/pen.test.ts | isolé | implementeur-tdd | vitest `pen.test.ts` 10 passed, `pointercancel (cancel) garde l'encre reçue (D39)` présent ; `verifier.sh : OK` | S2 | #tache-t21 |
| T22 | Gomme partielle et d'objet avec aperçus D38 | T18 | apps/web/src/engine/tools/eraser.ts, apps/web/src/engine/tools/eraser.test.ts | isolé | implementeur-tdd | vitest `eraser.test.ts` 7 passed, `cancel ou abort : annulé sans écriture (D39), aperçu retiré` présent ; `verifier.sh : OK` | S2 | #tache-t22 |
| T25 | Script S2 au navigateur (Playwright Chromium) et fiche de l'essai du 19 | — | scripts/essais/s2-navigateur.mjs, docs/essais/eni-stylet.md | isolé | implementeur-tdd | `node scripts/essais/s2-navigateur.mjs` sur l'appli actuelle : code 1, `S2 lot 3 : ÉCHEC — l'application ne démarre pas` (rouge attendu avant T24) ; `verifier.sh : OK` | S2 | #tache-t25 |
| T24 | Amorce `main.ts`, barre minimale, S2 au navigateur vert | T17, T19, T20, T21, T22, T23, T25, T26 | apps/web/src/main.ts, apps/web/index.html, apps/web/src/app/barre.ts, apps/web/src/app/barre.test.ts, docs/essais/s2-lot3-vm.png | isolé | implementeur-tdd | vitest `barre.test.ts` 3 passed ; `node scripts/essais/s2-navigateur.mjs --capture docs/essais/s2-lot3-vm.png` : 16 lignes `ok —` puis `S2 lot 3 : OK`, code 0 ; `verifier.sh : OK` | S2, S1 (rejoué) | #tache-t24 |
| T27 | Souris : seul le bouton gauche trace (ajoutée après la relecture du plan) | T18 | apps/web/src/engine/input/sampler.ts, apps/web/src/engine/input/sampler.test.ts | isolé | implementeur-tdd | vitest `sampler.test.ts` 26 passed, `souris au bouton du milieu : aucun geste` présent ; `verifier.sh : OK` | S2 | (prompt, sans section) |
| T28 | Correctifs de la relecture de fin de lot | T24, T27 | docs/essais/eni-stylet.md, apps/web/src/app/barre.ts, barre.test.ts, banc.ts, banc.test.ts, crates/roomboard-core/src/document.rs, crates/roomboard-wasm/src/lib.rs | isolé | implementeur-tdd | `undo_drops_the_outline_of_the_undone_stroke` ; vitest barre 4, banc 4 ; `verifier.sh : OK` | S2 | (prompt, sans section) |
| T29 | Diagnostic de la coque Linux (page hors champ sous Broadway) et capture | T24 | docs/essais/coque-linux-lot3.png | isolé | general-purpose | capture de la coque qui trace ; `verifier.sh : OK` | S5 (partie Linux) | (prompt, sans section) |

**Vagues proposées** (3 sous-agents, environ 30 min chacune, 2 h 30 avec les vérifications) :
**1** T17, T18, T26 · **2** T19, T20, T23 · **3** T21, T22, T25 · **4** T24.
Aucune tâche d'une même vague ne touche un fichier d'une autre. T25 ne dépend de rien : elle peut passer plus tôt si
une place se libère ; son essai est rouge tant que T24 n'est pas fusionnée (c'est sa preuve). T24 rejoue l'essai S2
complet et pose la capture.

**Preuve de fin de lot** (orchestrateur, sur `feat/socle-lot3` après la vague 4) :
`cd /home/adminjd/projets/roomboard-wt/socle && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30`
→ `verifier.sh : OK` ; puis `cd /home/adminjd/projets/roomboard-wt/socle && node scripts/essais/s2-navigateur.mjs 2>&1 | tail -20`
→ `S2 lot 3 : OK`. Le script S2 **n'entre pas dans `verifier.sh`** : il exige Playwright (cache npx de la VM,
`~/.npm/_npx/*/node_modules/playwright`) et son Chromium (`~/.cache/ms-playwright/chromium-1255`), absents d'une
machine neuve ; il rend le code 2 (« outil absent ») plutôt qu'un faux échec. Le parcours Playwright complet
(`verifier.sh --e2e`, enregistrement et réouverture) reste au lot 5.

## Ce qui part en lot 3b (après jeudi)

Rien de ce qui sert à l'essai du 19 (tracé avec pression, gomme, annuler / rétablir, barre, S2) ne part en 3b.
Partent en 3b, faute de temps et parce que l'essai n'en dépend pas :

- caméra, reste de D17 : barre d'espace + glisser, bouton du milieu, outil main ; caméra par page (une seule page
  au lot 3, les pages arrivent au lot 4) ;
- gomme d'objet dans la barre (le mode existe dans le moteur et ses tests, `Engine.setEraserMode`) ; réglage visible
  « le doigt déplace la vue » (l'option existe dans le routeur, `RouterOptions.fingerPansAfterPen`) ;
- échelons 2 à 4 de DA9 (prédiction en TS, traînée `navigator.ink`, canvas d'interaction en WebGL2) : selon le
  verdict de jeudi, tâches ajoutées au lot 3b sans toucher outils ni interface (`Renderer`, `input/`) ;
- mesure et réduction de la copie du contour entier à chaque image au-delà de 2 000 points (mineur de la fin de
  lot 2) : le banc de T26 donne la durée d'image ; une tâche seulement si elle dépasse 25 ms.

## Carte des fichiers

| fichier | tâche | rôle |
|---|---|---|
| `crates/roomboard-core/src/document.rs` | T17 | champs `outlines` (cache par id, gardé par largeur et nombre de points) et `outline_misses` ; `cached_outline`, `forget_outlines`, `outline_cache_misses`, `outline_cache_len` |
| `crates/roomboard-core/src/query.rs` | T17 | `outline`, `stroke_geoms`, `bounds` lisent le cache ; tests du cache ; mesure à deux appels |
| `crates/roomboard-core/src/commands.rs` | T17 | `apply` oublie les ids retirés ; la gomme d'objet lit le cache |
| `crates/roomboard-wasm/src/lib.rs` | T17 | retire le cache propre à la liaison ; `outline` délègue au cœur |
| `apps/web/src/engine/page.ts` | T18 | cadre de page D5 (1920 × 1080) et couleurs du fond |
| `apps/web/src/engine/camera.ts` (+ test) | T18 | `Camera`, `screenToWorld`, `worldToScreen`, `panBy`, `zoomAt` (10 % à 800 %), `fitPage` |
| `apps/web/src/engine/input/keys.ts` (+ test) | T18 | `keyAction` : Ctrl+Z, Ctrl+Y, Ctrl+Maj+Z, Cmd sous macOS |
| `apps/web/src/engine/input/gesture.ts` | T18 | `DrawTool`, `CloseReason`, `GestureSink`, `ViewSink` (types) |
| `apps/web/src/engine/render/renderer.ts` | T18 | `Renderer` (DA2), `PageView`, `LiveLayer`, `LiveStrokeView`, `EraserPreview`, `SceneSource` (types) |
| `apps/web/src/engine/tools/tool.ts` | T18 | `ToolContext`, `GestureTool`, `LivePart` (types) |
| `apps/web/src/engine/render/canvas2d.ts` (+ test) | T19 | `Canvas2DRenderer`, `tracePolygons`, `createCanvas2DRenderer` |
| `apps/web/src/engine/input/router.ts` (+ test) | T20 | `createRouter` (D18) |
| `apps/web/src/engine/engine.ts` (+ test) | T23 | `createEngine`, `EngineState`, `ToolFactories`, `WheelInput` |
| `apps/web/src/engine/tools/pen.ts` (+ test) | T21 | `createPenTool` |
| `apps/web/src/engine/tools/eraser.ts` (+ test) | T22 | `createEraserTool`, `ERASER_RADIUS_PX` |
| `apps/web/src/engine/input/support.ts` | T26 | `detectSupport` (déplacée de `proto/stylet.ts`) |
| `apps/web/src/app/banc.ts` (+ test) | T26 | `createAppBench`, `mountBenchPanel` |
| `apps/web/src/proto/stylet.ts` | T26 | importe `detectSupport` au lieu de la définir |
| `scripts/essais/s2-navigateur.mjs` | T25 | S2 au navigateur (Chromium headless, serveur statique local) |
| `docs/essais/eni-stylet.md` | T25 | section « Essai du 19 novembre — application (lot 3) » |
| `apps/web/src/app/barre.ts` (+ test) | T24 | `barModel`, `mountBar` (barre minimale, remplacée au lot 5) |
| `apps/web/src/main.ts`, `apps/web/index.html` | T24 | amorce : cœur Wasm, moteur, barre, `?banc` ; attributs `data-ready`, `data-elements`, `data-version` |
| `docs/essais/s2-lot3-vm.png` | T24 | capture de l'essai S2 |

**Carte d'impact du cadrage, entrées du lot 3.** `apps/web/src/main.ts:1-22` → T24 (le `resize` passe au `Renderer`,
`start` crée `Document.blank()` puis monte le moteur ; effet de bord « l'application démarre sur une page vide » :
contrôle `page vide au démarrage` du script S2, T25 / T24). `apps/web/index.html:10` (`touch-action: none`) et
`:15-16` (deux canvas) → T24, gardés. `apps/web/src/engine/input/` → T18, T20, T26. `apps/web/src/engine/render/` →
T18, T19. `apps/web/src/engine/camera.ts` → T18. `apps/web/src/engine/tools/` → T18, T21, T22. Constat
d'architecture `query.rs` (`hit_test_path`, 194 ms) → T17. `apps/web/src/toolbar.ts:1-24` : **non touché** (DA10 au
lot 5), lu par T24 pour les libellés. `apps/web/src/ui/`, `apps/web/package.json`, `tsconfig.json` : non touchés
(SolidJS au lot 5). `apps/desktop` : non touché (sert `apps/web/dist`).

**Tests à garder verts** (preuve `verifier.sh` de chaque tâche) : `toolbar.test.ts` (2) ; `sampler.test.ts`,
`stats.test.ts`, `recorder.test.ts`, `frame-loop.test.ts`, `polyline.test.ts` (lot 1) ; `fake-core.test.ts`,
`wasm-core.contract.test.ts` (lot 2, contrat joué sur les deux fabriques) ; `cargo test` du cœur (106 + 3 + 3) et de
`roomboard-wasm` (14), dont `outline_is_cached_and_stable` (T17 change son implémentation).

**Modules réutilisés** (liste du cadrage § 3 et code des lots 1 et 2) : `engine/input/sampler.ts` `createSampler`
(T24), `GestureEvent` / `InputSample` (T18, T20, T21, T22) ; `core/api.ts` `CoreDocument` (T18 à T24, jamais
modifié) ; `core/fake-core.ts` `fakeCore` (tests T21, T22, T23) ; `core/wasm-core.ts` `createWasmCore` (T24) ;
`proto/frame-loop.ts` `createFrameLoop` (T23) ; `proto/recorder.ts` `createRecorder` et `engine/input/stats.ts`
`buildReport`, `effectiveOptions` (T26) ; `toolbar.ts` `toolbar` (T24) ; côté Rust `ink::outline::outline`,
`Document::hit_test_path` (T17). Chaque section les cite en ligne `Réutilise :`.

## Global Constraints (recopiées dans chaque section)

- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un. Pas de `--force`.
- Aucun workflow GitHub Actions (`.github/workflows/` non touché, D35).
- Un seul build Tauri à la fois ; aucun build Android. Aucune tâche du lot 3 ne lance de build Tauri.
- Tests : `scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH`, sous le jeton
  `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire socle/T<n> --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"`.
  Les commandes ciblées (`cargo test -p …`, `pnpm exec vitest run …`, `node scripts/essais/…`) passent sous le même jeton.
- Sous-agents relecteurs au premier plan (`run_in_background: false`).
- Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par la ligne
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Aucun seuil baissé, aucun test désactivé, sauté (`.skip`, `.todo`, `#[ignore]` ajouté) ni affaibli.
- Dépôt public : aucun secret, jeton ni chemin personnel hors dépôt dans un fichier commité.
- `$WT` = dossier de travail donné par l'orchestrateur (par défaut `/home/adminjd/projets/roomboard-wt/socle--T<n>`).
  Worktree neuf : `cd "$WT" && pnpm install --frozen-lockfile` d'abord. `tsc` (dans `verifier.sh`) exige le module
  Wasm généré : lancer `verifier.sh` une fois avant de juger une erreur de type sur `./wasm/roomboard_wasm`.
- `apps/web/src/core/api.ts` est figé : non modifié au lot 3.
- Rien n'est écrit dans le document avant le relâché (D38) ; une écriture = une commande = une étape d'annulation.
- Moteur (`apps/web/src/engine/`) sans framework ; aucun global du DOM à l'exécution hors `render/canvas2d.ts`
  (`createCanvas2DRenderer`, `Path2D`) et `input/support.ts` ; logique testée sur faux objets (D1, DA2).
- Le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif : aucun appel Tauri dans le moteur.
- Cœur : aucune horloge système ni dépendance au navigateur hors tests (D1) ; `cargo fmt` et `clippy -D warnings`
  passent (ils sont dans `verifier.sh`).
- TypeScript strict avec `noUncheckedIndexedAccess` : aucun `any`, aucun `!` sur un index ; `as unknown as` réservé
  aux faux objets des tests.

## Review Focus

- Fin anormale d'un geste (pointercancel, appui long du stylet sous Windows, paume posée) : l'encre reçue est gardée,
  la gomme n'écrit rien, la paume ne laisse aucun trait — D39, D18 → T21 `pointercancel (cancel) garde l'encre reçue
  (D39)`, T22 `cancel ou abort : annulé sans écriture (D39), aperçu retiré`, T20 `paume annulée par le stylet (palm) :
  abort, rien d'écrit`.
- Deux doigts posés presque ensemble (à 150 ms pile), troisième doigt, doigt restant après un pincement — D18 →
  T20 `second doigt dans les 150 ms : trait annulé sans écriture, puis pincement`, `second doigt après 150 ms :
  ignoré, le trait continue`, `troisième doigt pendant un pincement : ignoré`, `fin du pincement : le doigt restant
  n'agit plus jusqu'à son relâché`.
- Ctrl+Z pendant une composition IME, dans un champ, ou Alt Gr (Ctrl+Alt sous Windows) — D11, D14 → T18
  `pendant une composition IME : rien`, `Alt Gr (Ctrl+Alt sous Windows) : rien`, `dans un champ de saisie ou une zone
  éditable : rien`.
- Stylet qui ne rend que 0 ou 0,5, échantillon non fini : aucune erreur « points invalides », trait à largeur
  constante — D8 → T21 `stylet qui ne rend que 0 ou 0,5 : pression constante 0,5 (D8)`, `échantillon non fini ignoré :
  aucune erreur « points invalides »`.
- Fenêtre ou écran qui change de taille en séance : l'encre reste sous la pointe (échelle exacte tampon / CSS,
  caméra non réajustée) — D17, leçon T6c du lot 1 → T19 `resize : tampons au devicePixelRatio, échelle exacte
  tampon / CSS`, T23 `resize : rendu redimensionné, caméra ajustée à la page une seule fois`.
- (Hors des cinq, invariant critique.) Contours en cache après une gomme partielle, annuler puis rétablir : jamais
  l'ancien contour sous un id rendu — S2 → T17 `cache_follows_partial_erase_and_undo_redo`.

## Hypothèses prises par ce plan (à revoir)

- **HL3-1** Rayon de la gomme : 12 px à l'écran, constant quel que soit le zoom (converti en unités monde au début du
  geste). Le cadrage ne le fixe pas.
- **HL3-2** Aperçu de la gomme partielle : la couleur du fond est peinte le long du chemin, découpée au cadre de la
  page (blanc dedans, pourtour gris dehors). Pour un fond uni (D5), c'est l'effet de D38 (« copie de la scène,
  `destination-out` ») sans copie de canvas. L'aperçu couvre le rayon de la gomme ; la coupe réelle ajoute la
  demi-épaisseur du trait (`ink::erase`), un peu plus large que l'aperçu.
- **HL3-3** Stylo par défaut : noir `#000000`, épaisseur 4 unités (H1-8).
- **HL3-4** Pression (D8) : tant qu'aucune pression hors de {0 ; 0,5} n'a été vue dans la séance, la pression est
  prise à 0,5 (trait à largeur constante) ; dès qu'une valeur différente arrive, elle est suivie.
- **HL3-5** Second doigt **après** 150 ms pendant un trait au doigt : ignoré, le trait continue (le cadrage ne dit
  rien) ; deux doigts en déplacement de vue : pincement quel que soit le délai. L'outil d'un geste est fixé au
  `pointerdown` (bouton gomme compris).
- **HL3-6** Caméra : page ajustée au démarrage (95 % de la vue) ; molette = défilement ; Ctrl+molette (ou Cmd) = zoom
  `exp(-deltaY × 0,002)` autour du pointeur.
- **HL3-7** Banc rejoué dans l'application derrière `?banc` (même JSON `roomboard-stylet/1`, champs `geometry:
  "freedraw"` et `coreVersion` en plus), pas en second fichier autonome : le Wasm ne se charge pas en `file://`. Les
  points reçus après la dernière image d'un trait n'ont pas de retard mesuré (le banc du lot 1 dessinait une image de
  plus au relâché).
- **HL3-8** Remise de l'application pour jeudi : `apps/web/dist` servi en http (le Wasm ne se charge pas en `file://`)
  ou coque Tauri. Le mode de remise (adresse servie depuis la VM, build Tauri Windows par la file du PC) n'est pas
  une tâche de ce plan : à trancher par l'orchestrateur.

---

<a id="tache-t17"></a>
### Tâche T17 — Cache des contours dans le cœur (constat d'architecture)

**Objectif.** `hit_test_path` recalcule le contour `freedraw` de chaque trait à chaque appel : 194 ms (release) pour
1 000 traits, alors que D38 l'appelle à chaque image pour l'aperçu de la gomme d'objet. Le cache des contours passe
de la liaison Wasm au cœur : un contour est calculé une fois par trait et servi au rendu (`outline`), à la collision
(`hit_test`, `hit_test_path`, `ids_in_rect`, `bounds`) et à la gomme d'objet (`Erase`, mode objet). Scénario : S2
(gomme en travers d'un trait, annuler, rétablir).

**Fichiers.** Modifier `crates/roomboard-core/src/document.rs`, `crates/roomboard-core/src/query.rs`,
`crates/roomboard-core/src/commands.rs`, `crates/roomboard-wasm/src/lib.rs`.

**Interfaces.**
- Consomme : rien du lot.
- Réutilise : `crates/roomboard-core/src/ink/outline.rs:32` — `outline(points: &[InkPoint], style: &InkStyle) -> Vec<f32>`
  (seule géométrie de l'encre, DA7), appelée par `cached_outline` seulement.
- Réutilise et étend : `crates/roomboard-core/src/query.rs:100-124` — `Document::hit_test(&self, page: &str, x: f64, y: f64, tol: f32) -> Option<String>`,
  `Document::hit_test_path(&self, page: &str, path: &[f32], radius: f32) -> Vec<String>` (signatures inchangées).
- Produit (`document.rs`, `impl Document`) :
  `pub(crate) fn cached_outline(&self, id: &str, style: &StrokeStyle, pts: &[InkPoint]) -> Rc<[f32]>` ;
  `pub(crate) fn forget_outlines(&self, removed: &[String])` ;
  `pub fn outline_cache_misses(&self) -> u64` (contours calculés depuis la création) ;
  `pub fn outline_cache_len(&self) -> usize`.
- Produit (`roomboard-wasm`) : `Document::outline(&self, id: &str) -> Option<Vec<f32>>` (était `&mut self`), même
  sortie JS.

**Patron à ne pas reprendre.** Le cache actuel vit dans la liaison :
`crates/roomboard-wasm/src/lib.rs:74-78` (champ `outlines`), `:168-176` (`outline`), `:226-231` (`forget`),
`:311-329` (vidé en entier à chaque annuler / rétablir). Il ne sert ni `hit_test_path` ni `ids_in_rect` ni `bounds`
(qui passent par `crates/roomboard-core/src/query.rs:77-98`, `stroke_geoms`, recalcul complet), et un second cache
dans la liaison donnerait deux vérités. Second patron à éviter : une clé par id **seul**, jamais contrôlée. Les points
d'un trait sont immuables (DA4 : un trait coupé = trait retiré + nouveaux ids) mais rien ne l'impose au type : l'entrée
garde la largeur (`f32::to_bits`) et le nombre de points ; un écart = recalcul. Le cache ne se vide pas à l'annulation
(un trait rendu par annuler a le même id et les mêmes points) ; les ids retirés par une commande en sortent (mémoire
bornée), ils sont recalculés une fois s'ils reviennent.

**Test et commande bornée.**
`cd "$WT" && PATH=$HOME/.cargo/bin:$PATH cargo test -p roomboard-core --lib query:: 2>&1 | tail -25`
→ `test result: ok. 13 passed; 0 failed; 1 ignored` ; lignes `test query::tests::hit_test_path_computes_each_outline_once ... ok`
et `test query::tests::cache_follows_partial_erase_and_undo_redo ... ok` présentes (`grep -E "^test query::tests::(hit_test_path_computes_each_outline_once|cache_follows_partial_erase_and_undo_redo|outline_hit_test_and_bounds_share_the_cache|removed_ids_leave_the_cache|object_erase_uses_the_cache) \.\.\. ok$"` → 5 lignes).
`cd "$WT" && PATH=$HOME/.cargo/bin:$PATH cargo test -p roomboard-wasm 2>&1 | tail -8` → `test result: ok. 14 passed`,
`outline_is_cached_and_stable` présent.
Mesure : `cd "$WT" && PATH=$HOME/.cargo/bin:$PATH cargo test -p roomboard-core --release --lib -- --ignored --nocapture hit_test_path_cost 2>&1 | grep "hit_test_path, 1000 traits"`.
Puis `verifier.sh` (jeton) → `verifier.sh : OK` (garde verts le cœur entier, `tests/scenarios.rs`, le contrat vitest
sur le vrai `.wasm`).

**Preuve visuelle.** Aucune.

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de
`--force` ; aucun workflow GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun ici) ; tests par
`scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom
tests --proprietaire socle/T17 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"`
(commandes ciblées sous le même jeton) ; relecteurs au premier plan (`run_in_background: false`) ; commit d'auteur
`jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5
<noreply@anthropic.com>` ; aucun seuil baissé, aucun test désactivé, sauté ou affaibli ; dépôt public : aucun secret ;
worktree neuf : `pnpm install --frozen-lockfile` d'abord ; `apps/web/src/core/api.ts` figé ; rien n'est écrit avant le
relâché (D38) ; cœur sans horloge système ni dépendance au navigateur hors tests, `cargo fmt` et `clippy -D warnings`
passent.

**Interdits.** Aucune lecture n'ouvre de transaction d'écriture (le test `reads_open_no_write_transaction` reste
vert). Ne pas changer les signatures publiques de `query.rs` ni l'API JS de la liaison. Aucun cache côté TS. Ne pas
retirer ni affaiblir `outline_is_cached_and_stable` (liaison) ni le test ignoré de mesure (il reste `#[ignore]`, il
affiche deux temps). Pas de `Arc`/`Mutex` : le document vit dans un seul fil (Wasm), `RefCell` et `Cell` suffisent.

**Terminé quand.** Les 13 tests `query::` passent (5 nouveaux), la liaison passe ses 14 tests, `verifier.sh : OK`, et
le rapport contient : `Réutilisation : appelé ink::outline::outline` (ou `écart — <pourquoi>`) ; `Mesure : premier
appel <X> ms, suivant <Y> ms (avant : 194 ms)` lue sur la commande de mesure, avec `Y < 16` (sinon `écart — <Y> ms`,
sans baisser de seuil).

**Étapes.**

- [ ] **1. Écrire les tests (rouge).** Dans `crates/roomboard-core/src/query.rs`, module `tests` : remplacer les deux
  lignes d'import `use crate::commands::Command;` et `use crate::element::StrokeStyle;` par

```rust
    use crate::commands::{Command, EraseMode};
    use crate::element::StrokeStyle;
    use crate::ink::outline::{outline as ink_outline, InkStyle};
```

  puis ajouter, avant le test `hit_test_path_cost_for_thousand_strokes` :

```rust
    #[test]
    fn hit_test_path_computes_each_outline_once() {
        let (d, p, a, _b) = setup();
        let before = d.outline_cache_misses();
        let path = [150.0, 90.0, 150.0, 110.0];
        assert_eq!(d.hit_test_path(&p, &path, 3.0), vec![a.clone()]);
        assert_eq!(d.outline_cache_misses() - before, 2, "un calcul par trait au premier appel");
        for _ in 0..5 {
            assert_eq!(d.hit_test_path(&p, &path, 3.0), vec![a.clone()]);
        }
        assert_eq!(
            d.outline_cache_misses() - before,
            2,
            "aucun recalcul aux appels suivants (aperçu D38 à chaque image)"
        );
    }

    #[test]
    fn outline_hit_test_and_bounds_share_the_cache() {
        let (d, p, a, b) = setup();
        let o = d.outline(&a).expect("contour");
        let _ = d.outline(&b);
        let m = d.outline_cache_misses();
        assert_eq!(m, 2);
        let _ = d.hit_test(&p, 300.0, 100.0, 2.0);
        let _ = d.ids_in_rect(
            &p,
            Bounds {
                x0: 0.0,
                y0: 0.0,
                x1: 1000.0,
                y1: 1000.0,
            },
        );
        let _ = d.bounds(&[a.clone(), b]);
        assert_eq!(d.outline_cache_misses(), m, "rendu, collision et boîte lisent le même cache");
        let pts = d.stroke_points(&a).expect("points");
        let exact = ink_outline(&pts, &InkStyle { width: 4.0 });
        let bits = |v: &[f32]| v.iter().map(|x| x.to_bits()).collect::<Vec<u32>>();
        assert_eq!(bits(&o), bits(&exact), "le cache rend le contour exact (bit à bit)");
    }

    #[test]
    fn cache_follows_partial_erase_and_undo_redo() {
        let (mut d, p, a, _b) = setup();
        let left_probe = [150.0, 90.0, 150.0, 110.0];
        let cut_probe = [200.0, 95.0, 200.0, 105.0];
        assert_eq!(d.hit_test_path(&p, &left_probe, 3.0), vec![a.clone()]);
        assert_eq!(d.hit_test_path(&p, &cut_probe, 1.0), vec![a.clone()]);
        let ch = d
            .apply(Command::Erase {
                page: p.clone(),
                path: vec![200.0, 80.0, 200.0, 120.0],
                radius: 5.0,
                mode: EraseMode::Partial,
            })
            .expect("gomme partielle");
        assert_eq!(ch.removed, vec![a.clone()]);
        assert_eq!(ch.ids.len(), 2, "a coupé en deux morceaux");
        let left = d.hit_test_path(&p, &left_probe, 3.0);
        assert_eq!(left.len(), 1);
        assert!(ch.ids.contains(&left[0]), "le morceau gauche, jamais l'ancien trait : {left:?}");
        assert!(d.hit_test_path(&p, &cut_probe, 1.0).is_empty(), "plus rien sous la coupe");
        assert!(d.undo());
        assert_eq!(d.hit_test_path(&p, &left_probe, 3.0), vec![a.clone()]);
        assert_eq!(d.hit_test_path(&p, &cut_probe, 1.0), vec![a.clone()], "annuler : le trait entier revient");
        assert!(d.redo());
        assert!(d.hit_test_path(&p, &cut_probe, 1.0).is_empty(), "rétablir : la coupe revient");
    }

    #[test]
    fn removed_ids_leave_the_cache() {
        let (mut d, p, a, _b) = setup();
        let _ = d.hit_test_path(&p, &[0.0, 0.0, 1000.0, 1000.0], 3.0);
        assert_eq!(d.outline_cache_len(), 2);
        d.apply(Command::Delete { ids: vec![a] }).expect("suppression");
        assert_eq!(d.outline_cache_len(), 1);
    }

    #[test]
    fn object_erase_uses_the_cache() {
        let (mut d, p, a, _b) = setup();
        let path = vec![150.0, 90.0, 150.0, 110.0];
        let _ = d.hit_test_path(&p, &path, 3.0);
        let m = d.outline_cache_misses();
        let ch = d
            .apply(Command::Erase {
                page: p.clone(),
                path,
                radius: 3.0,
                mode: EraseMode::Object,
            })
            .expect("gomme d'objet");
        assert_eq!(ch.removed, vec![a]);
        assert_eq!(d.outline_cache_misses(), m, "la commande reprend les contours de l'aperçu");
    }
```

  Et remplacer le corps de mesure de `hit_test_path_cost_for_thousand_strokes` (de `let start` à la fin) par :

```rust
        let start = std::time::Instant::now();
        let hits = d.hit_test_path(&p, &[50.0, 0.0, 50.0, 1000.0], 5.0);
        let first = start.elapsed();
        let start = std::time::Instant::now();
        let again = d.hit_test_path(&p, &[60.0, 0.0, 60.0, 1000.0], 5.0);
        eprintln!(
            "hit_test_path, 1000 traits : premier appel {first:?} ({} touchés), suivant {:?} ({} touchés)",
            hits.len(),
            start.elapsed(),
            again.len()
        );
```

- [ ] **2. Lancer, constater l'échec.** `cargo test -p roomboard-core --lib query:: 2>&1 | tail -5` →
  `error[E0599]: no method named `outline_cache_misses` found` (attendu).

- [ ] **3. Le cache dans `Document`.** `crates/roomboard-core/src/document.rs` : ajouter en tête

```rust
use std::cell::{Cell, RefCell};
use std::collections::HashMap;
use std::rc::Rc;
```

  ajouter `StrokeStyle` à la liste `use crate::element::{…}` existante, et

```rust
use crate::ink::outline::{outline as ink_outline, InkStyle};
use crate::ink::points::InkPoint;
```

  Avant `pub struct Document`, ajouter :

```rust
/// Contour local d'un trait en cache (D7, DA7). Les points d'un trait sont immuables (DA4) ; la largeur et le nombre
/// de points gardent quand même l'entrée : un écart force le recalcul.
struct CachedOutline {
    width_bits: u32,
    points: usize,
    outline: Rc<[f32]>,
}
```

  Ajouter deux champs à la fin de `pub struct Document` :

```rust
    outlines: RefCell<HashMap<String, CachedOutline>>,
    outline_misses: Cell<u64>,
```

  Dans `assemble`, compléter la construction :

```rust
        Self {
            doc,
            meta,
            pages,
            history,
            version: 0,
            outlines: RefCell::new(HashMap::new()),
            outline_misses: Cell::new(0),
        }
```

  Dans `impl Document`, juste après `pub(crate) fn bump`, ajouter :

```rust
    /// Contour local d'un trait, calculé une fois par (id, largeur, nombre de points) puis servi depuis le cache :
    /// rendu, collision et gomme d'objet voient le même polygone (DA7) sans le recalculer à chaque image (D38).
    pub(crate) fn cached_outline(&self, id: &str, style: &StrokeStyle, pts: &[InkPoint]) -> Rc<[f32]> {
        let width_bits = style.width.to_bits();
        if let Some(c) = self.outlines.borrow().get(id) {
            if c.width_bits == width_bits && c.points == pts.len() {
                return Rc::clone(&c.outline);
            }
        }
        self.outline_misses.set(self.outline_misses.get() + 1);
        let outline: Rc<[f32]> = ink_outline(pts, &InkStyle { width: style.width }).into();
        self.outlines.borrow_mut().insert(
            id.to_string(),
            CachedOutline {
                width_bits,
                points: pts.len(),
                outline: Rc::clone(&outline),
            },
        );
        outline
    }

    /// Oublie les contours des ids retirés par une commande (mémoire bornée aux traits présents ; un trait rendu par
    /// annuler est recalculé une fois).
    pub(crate) fn forget_outlines(&self, removed: &[String]) {
        let mut cache = self.outlines.borrow_mut();
        for id in removed {
            cache.remove(id);
        }
    }

    /// Contours calculés depuis la création du document (mesure du cache).
    pub fn outline_cache_misses(&self) -> u64 {
        self.outline_misses.get()
    }

    /// Contours actuellement en cache.
    pub fn outline_cache_len(&self) -> usize {
        self.outlines.borrow().len()
    }
```

- [ ] **4. Les lectures passent par le cache.** `crates/roomboard-core/src/query.rs` : remplacer le commentaire de tête
  et les imports par

```rust
//! Lectures sans écriture (D10, D38) : entrées en coordonnées monde ; points et contours rendus dans le repère local
//! de l'élément (placés par `transform`). Aucune lecture n'ouvre de transaction d'écriture. Les contours viennent du
//! cache du document (`Document::cached_outline`) : calculés une fois par trait, partagés par le rendu, la collision
//! et la gomme d'objet (constat du lot 2 : 194 ms pour 1 000 traits sans cache).

use std::rc::Rc;

use yrs::{Array, Map, Out};

use crate::commands::{read_stroke, world_to_local_path};
use crate::document::Document;
use crate::element::{apply_transform, invert, out_string, Transform};
use crate::ink::hit::{hit_outline, path_hits_outline};
use crate::ink::points::InkPoint;
```

  Dans `struct StrokeGeom`, `outline: Vec<f32>` devient `outline: Rc<[f32]>`. Remplacer `pub fn outline` et
  `fn stroke_geoms` par :

```rust
    pub fn outline(&self, id: &str) -> Option<Vec<f32>> {
        let txn = self.read();
        let found = self.find_element(&txn, id)?;
        let (_, style, pts) = read_stroke(&txn, &found.element)?;
        Some(self.cached_outline(id, &style, &pts).to_vec())
    }

    /// Traits de la page, du dessous vers le dessus ; contours pris dans le cache du document.
    fn stroke_geoms(&self, page: &str) -> Vec<StrokeGeom> {
        let txn = self.read();
        let Some(elements) = self.page_elements(&txn, page) else {
            return Vec::new();
        };
        let mut out = Vec::new();
        for o in elements.iter(&txn) {
            let Out::YMap(e) = o else { continue };
            let Some((transform, style, pts)) = read_stroke(&txn, &e) else {
                continue;
            };
            let id = out_string(e.get(&txn, "id")).unwrap_or_default();
            let outline = self.cached_outline(&id, &style, &pts);
            out.push(StrokeGeom {
                id,
                transform,
                outline,
            });
        }
        out
    }
```

  Dans `pub fn bounds`, remplacer
  `if let Some(b) = world_bounds(&t, &ink_outline(&pts, &InkStyle { width: style.width }))` par
  `if let Some(b) = world_bounds(&t, &self.cached_outline(id, &style, &pts))`. `hit_test`, `hit_test_path` et
  `ids_in_rect` ne changent pas (`&g.outline` se déréférence en `&[f32]`).

- [ ] **5. Les commandes oublient les ids retirés ; la gomme d'objet lit le cache.**
  `crates/roomboard-core/src/commands.rs` : supprimer la ligne `use crate::ink::outline::{outline, InkStyle};`.
  Remplacer `pub fn apply` par :

```rust
    pub fn apply(&mut self, cmd: Command) -> Result<Change, CommandError> {
        let change = match cmd {
            Command::AddPage { after } => self.cmd_add_page(after.as_deref()),
            Command::RemovePage { page } => self.cmd_remove_page(&page),
            Command::CommitStroke {
                page,
                points,
                style,
            } => self.cmd_commit_stroke(&page, &points, &style),
            Command::Erase {
                page,
                path,
                radius,
                mode,
            } => self.cmd_erase(&page, &path, radius, mode),
            Command::Delete { ids } => self.cmd_delete(&ids),
        }?;
        self.forget_outlines(&change.removed);
        Ok(change)
    }
```

  Dans `cmd_erase`, remplacer le corps de la boucle `for (i, o) in elements.iter(&txn).enumerate()` par :

```rust
                let Out::YMap(e) = o else { continue };
                let Some((transform, style, pts)) = read_stroke(&txn, &e) else {
                    continue;
                };
                let Some(local_path) = world_to_local_path(&transform, path) else {
                    continue;
                };
                let id = out_string(e.get(&txn, "id")).unwrap_or_default();
                let pieces = match mode {
                    EraseMode::Partial => erase(&pts, style.width / 2.0, &local_path, radius),
                    EraseMode::Object => {
                        let poly = self.cached_outline(&id, &style, &pts);
                        path_hits_outline(&poly, &local_path, radius).then(Vec::new)
                    }
                };
                if let Some(pieces) = pieces {
                    cuts.push(Cut {
                        index: i as u32,
                        id,
                        transform,
                        style,
                        pieces,
                    });
                }
```

- [ ] **6. La liaison délègue.** `crates/roomboard-wasm/src/lib.rs` : supprimer `use std::collections::HashMap;`, le
  champ `outlines` de `pub struct Document`, la ligne `outlines: HashMap::new(),` de `wrap`, la méthode `forget`, et
  les blocs `if full { self.outlines.clear(); }` de `undo_inner` et `redo_inner`. Remplacer :

```rust
    /// Contour local, mis en cache par le cœur (`Document::cached_outline`, partagé avec la collision).
    pub fn outline(&self, id: &str) -> Option<Vec<f32>> {
        self.core.outline(id)
    }
```

```rust
    fn run(&mut self, cmd: Command) -> Result<Change, CommandError> {
        self.core.apply(cmd)
    }
```

- [ ] **7. Vert.** `cargo fmt --all` puis les deux commandes bornées (13 passed + 1 ignored ; 14 passed) ; `cargo
  clippy --workspace --all-targets -- -D warnings 2>&1 | tail -5` sans `error`. Lancer la mesure (release) et noter
  les deux temps.

- [ ] **8. Suite complète et commit.** `verifier.sh` sous le jeton → `verifier.sh : OK`. Puis :

```bash
cd "$WT" && git add crates/roomboard-core/src/document.rs && git add crates/roomboard-core/src/query.rs \
  && git add crates/roomboard-core/src/commands.rs && git add crates/roomboard-wasm/src/lib.rs \
  && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
     -m "perf(core): cache stroke outlines in the document for hit tests and object erase" \
     -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t18"></a>
### Tâche T18 — Contrats du moteur, caméra et raccourcis clavier

**Objectif.** Poser en une fois les types que les tâches suivantes partagent (routeur, outils, rendu, moteur), pour
qu'elles avancent en parallèle sans se toucher, et les deux modules purs qui n'ont besoin de rien : la caméra (D17,
D5) et la lecture des raccourcis d'annulation (D11). Scénario : S2 (Ctrl+Z, Ctrl+Y ; coordonnées monde).

**Fichiers.** Créer `apps/web/src/engine/page.ts`, `apps/web/src/engine/camera.ts`,
`apps/web/src/engine/camera.test.ts`, `apps/web/src/engine/input/keys.ts`, `apps/web/src/engine/input/keys.test.ts`,
`apps/web/src/engine/input/gesture.ts`, `apps/web/src/engine/render/renderer.ts`, `apps/web/src/engine/tools/tool.ts`.

**Interfaces.**
- Consomme : rien du lot.
- Réutilise : `apps/web/src/engine/input/sampler.ts:7-14` — `InputSample { x, y, pressure, tiltX, tiltY, t }` (px CSS
  relatifs à la zone, `t` = `timeStamp` en ms) ; `apps/web/src/core/api.ts` — `Change`, `Command`, `CoreDocument`,
  `EraseMode` (types seulement, fichier figé).
- Produit (`page.ts`) : `PAGE_WIDTH = 1920`, `PAGE_HEIGHT = 1080`, `PAGE_BACKGROUND = "#ffffff"`,
  `SURROUND_COLOR = "#d4d4d8"`.
- Produit (`camera.ts`) : `interface Camera { readonly zoom: number; readonly tx: number; readonly ty: number }`
  (écran = monde × zoom + (tx, ty)) ; `MIN_ZOOM = 0.1`, `MAX_ZOOM = 8`, `IDENTITY: Camera` ;
  `screenToWorld(c: Camera, sx: number, sy: number): [number, number]` ;
  `worldToScreen(c: Camera, wx: number, wy: number): [number, number]` ;
  `panBy(c: Camera, dx: number, dy: number): Camera` ;
  `zoomAt(c: Camera, sx: number, sy: number, factor: number): Camera` ;
  `fitPage(viewW: number, viewH: number, pageW?: number, pageH?: number, margin?: number): Camera`.
- Produit (`input/keys.ts`) : `interface KeyLike { key; ctrlKey; metaKey; shiftKey; altKey; isComposing; target: { tagName?: string; isContentEditable?: boolean } | null }`,
  `type KeyAction = "undo" | "redo"`, `keyAction(e: KeyLike): KeyAction | null`.
- Produit (`input/gesture.ts`) : `type DrawTool = "pen" | "eraser"` ; `type CloseReason = "end" | "cancel" | "abort"` ;
  `interface GestureSink { begin(pointerId: number, tool: DrawTool, samples: readonly InputSample[]): void; extend(pointerId: number, samples: readonly InputSample[], predicted: readonly InputSample[]): void; close(pointerId: number, how: CloseReason): void }` ;
  `interface ViewSink { panBy(dx: number, dy: number): void; zoomAt(x: number, y: number, factor: number): void }`.
- Produit (`render/renderer.ts`) : `PageView { id; elementIds }`, `LiveStrokeView { outline: Float32Array; predicted: Float32Array; color: string; width: number }`,
  `EraserPreview { path: Float32Array; radius: number; mode: EraseMode }`, `LiveLayer { strokes; erasers }`,
  `EMPTY_LIVE`, `SceneSource = Pick<CoreDocument, "element" | "outline">`,
  `interface Renderer { drawScene(page: PageView, camera: Camera, hidden: ReadonlySet<string>): void; drawLive(live: LiveLayer, camera: Camera): void; resize(width: number, height: number, dpr: number): void; invalidate(change: Change): void }`.
- Produit (`tools/tool.ts`) : `ToolContext { doc: CoreDocument; page(): string; camera(): Camera; run(cmd: Command): Change | null }`,
  `LivePart extends LiveLayer { hidden: ReadonlySet<string> }`,
  `GestureTool { begin(pointerId, samples); extend(pointerId, samples, predicted); frame(); close(pointerId, how: CloseReason); live(): LivePart; active(): boolean }`,
  `NO_LIVE: LivePart`.

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/engine/camera.test.ts src/engine/input/keys.test.ts --reporter=verbose 2>&1 | tail -25`
→ `Tests  16 passed (16)` ; noms `zoomAt garde le point du monde sous le pointeur` et `pendant une composition IME :
rien` présents. Puis `verifier.sh` (jeton) → `verifier.sh : OK` (le `tsc --noEmit` du build web vérifie les fichiers
de types ; garde verts `toolbar.test.ts`, `sampler.test.ts` et les autres).

**Preuve visuelle.** Aucune.

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de
`--force` ; aucun workflow GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun ici) ; tests par
`scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom
tests --proprietaire socle/T18 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"`
(commandes ciblées sous le même jeton) ; relecteurs au premier plan (`run_in_background: false`) ; commit d'auteur
`jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5
<noreply@anthropic.com>` ; aucun seuil baissé, aucun test désactivé, sauté ou affaibli ; dépôt public : aucun secret ;
worktree neuf : `pnpm install --frozen-lockfile` d'abord, `verifier.sh` une fois avant de juger une erreur de type sur
`./wasm/roomboard_wasm` ; `apps/web/src/core/api.ts` figé ; rien n'est écrit avant le relâché (D38) ; moteur sans
framework ni global du DOM ; TypeScript strict (`noUncheckedIndexedAccess`) : aucun `any`, aucun `!` sur un index.

**Interdits.** Aucun import de `../wasm/`, d'un framework ou du DOM dans ces fichiers. Aucune logique dans les fichiers
de types (`gesture.ts`, `renderer.ts`, `tool.ts`) hors constantes vides. Ne pas toucher `sampler.ts` ni `api.ts`.
Noms exactement ceux du bloc Interfaces : les tâches T19 à T24 les importent tels quels.

**Terminé quand.** 16 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : appelé InputSample (sampler.ts),
types de core/api.ts` (ou `écart — <pourquoi>`).

**Étapes.**

- [ ] **1. Écrire les tests (rouge).** `apps/web/src/engine/camera.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { fitPage, IDENTITY, MAX_ZOOM, MIN_ZOOM, panBy, screenToWorld, worldToScreen, zoomAt, type Camera } from "./camera";

describe("camera (D17)", () => {
  const cam: Camera = { zoom: 2, tx: 10, ty: -20 };

  it("écran et monde : aller-retour exact", () => {
    const [wx, wy] = screenToWorld(cam, 110, 80);
    expect([wx, wy]).toEqual([50, 50]);
    expect(worldToScreen(cam, wx, wy)).toEqual([110, 80]);
  });

  it("zoomAt garde le point du monde sous le pointeur", () => {
    const before = screenToWorld(cam, 300, 200);
    const z = zoomAt(cam, 300, 200, 1.5);
    expect(z.zoom).toBeCloseTo(3);
    const after = screenToWorld(z, 300, 200);
    expect(after[0]).toBeCloseTo(before[0]);
    expect(after[1]).toBeCloseTo(before[1]);
  });

  it("zoomAt borne le zoom entre 10 % et 800 %", () => {
    expect(MIN_ZOOM).toBe(0.1);
    expect(MAX_ZOOM).toBe(8);
    expect(zoomAt(IDENTITY, 0, 0, 100).zoom).toBe(MAX_ZOOM);
    expect(zoomAt(IDENTITY, 0, 0, 0.001).zoom).toBe(MIN_ZOOM);
  });

  it("zoomAt ignore un facteur nul, négatif ou non fini", () => {
    for (const f of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) expect(zoomAt(cam, 5, 5, f)).toBe(cam);
  });

  it("panBy déplace la vue et ignore un delta non fini", () => {
    expect(panBy(cam, 5, -7)).toEqual({ zoom: 2, tx: 15, ty: -27 });
    expect(panBy(cam, Number.NaN, 1)).toBe(cam);
  });

  it("fitPage centre la page 1920 × 1080 avec 5 % de marge", () => {
    const c = fitPage(1280, 720);
    expect(c.zoom).toBeCloseTo((1280 / 1920) * 0.95);
    expect(c.tx).toBeCloseTo(32);
    expect(c.ty).toBeCloseTo(18);
    const [x0, y0] = worldToScreen(c, 0, 0);
    const [x1, y1] = worldToScreen(c, 1920, 1080);
    expect(x0 + x1).toBeCloseTo(1280);
    expect(y0 + y1).toBeCloseTo(720);
  });

  it("fitPage sur une vue vide : identité", () => {
    expect(fitPage(0, 720)).toBe(IDENTITY);
  });
});
```

  `apps/web/src/engine/input/keys.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { keyAction, type KeyLike } from "./keys";

const k = (key: string, mods: Partial<Omit<KeyLike, "key">> = {}): KeyLike => ({
  key,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  isComposing: false,
  target: null,
  ...mods,
});

describe("keyAction (D11)", () => {
  it("Ctrl+Z annule", () => {
    expect(keyAction(k("z", { ctrlKey: true }))).toBe("undo");
  });
  it("Cmd+Z annule (macOS)", () => {
    expect(keyAction(k("z", { metaKey: true }))).toBe("undo");
  });
  it("Ctrl+Y rétablit", () => {
    expect(keyAction(k("y", { ctrlKey: true }))).toBe("redo");
  });
  it("Ctrl+Maj+Z rétablit (touche rendue en majuscule)", () => {
    expect(keyAction(k("Z", { ctrlKey: true, shiftKey: true }))).toBe("redo");
  });
  it("Ctrl+Maj+Y : rien", () => {
    expect(keyAction(k("Y", { ctrlKey: true, shiftKey: true }))).toBeNull();
  });
  it("Z sans Ctrl : rien", () => {
    expect(keyAction(k("z"))).toBeNull();
  });
  it("pendant une composition IME : rien", () => {
    expect(keyAction(k("z", { ctrlKey: true, isComposing: true }))).toBeNull();
  });
  it("Alt Gr (Ctrl+Alt sous Windows) : rien", () => {
    expect(keyAction(k("z", { ctrlKey: true, altKey: true }))).toBeNull();
  });
  it("dans un champ de saisie ou une zone éditable : rien", () => {
    expect(keyAction(k("z", { ctrlKey: true, target: { tagName: "TEXTAREA" } }))).toBeNull();
    expect(keyAction(k("z", { ctrlKey: true, target: { tagName: "input" } }))).toBeNull();
    expect(keyAction(k("z", { ctrlKey: true, target: { tagName: "DIV", isContentEditable: true } }))).toBeNull();
    expect(keyAction(k("z", { ctrlKey: true, target: { tagName: "BUTTON" } }))).toBe("undo");
  });
});
```

- [ ] **2. Lancer, constater l'échec** (`Failed to resolve import "./camera"` et `"./keys"`).

- [ ] **3. `apps/web/src/engine/page.ts` :**

```ts
/** Cadre de page (D5) et couleurs de la scène. */
export const PAGE_WIDTH = 1920;
export const PAGE_HEIGHT = 1080;
export const PAGE_BACKGROUND = "#ffffff";
/** Pourtour de la page (plan non borné autour du cadre). */
export const SURROUND_COLOR = "#d4d4d8";
```

- [ ] **4. `apps/web/src/engine/camera.ts` :**

```ts
/** Caméra d'une page (D17) : écran (px CSS) = monde × zoom + (tx, ty). Hors document, jamais annulée. */
import { PAGE_HEIGHT, PAGE_WIDTH } from "./page";

export interface Camera {
  readonly zoom: number;
  readonly tx: number;
  readonly ty: number;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;
export const IDENTITY: Camera = { zoom: 1, tx: 0, ty: 0 };

const clampZoom = (z: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export function screenToWorld(c: Camera, sx: number, sy: number): [number, number] {
  return [(sx - c.tx) / c.zoom, (sy - c.ty) / c.zoom];
}

export function worldToScreen(c: Camera, wx: number, wy: number): [number, number] {
  return [wx * c.zoom + c.tx, wy * c.zoom + c.ty];
}

export function panBy(c: Camera, dx: number, dy: number): Camera {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return c;
  return { zoom: c.zoom, tx: c.tx + dx, ty: c.ty + dy };
}

/** Zoom autour d'un point écran : le point du monde sous (sx, sy) y reste. Facteur nul, négatif ou non fini : rien. */
export function zoomAt(c: Camera, sx: number, sy: number, factor: number): Camera {
  if (!Number.isFinite(factor) || factor <= 0 || !Number.isFinite(sx) || !Number.isFinite(sy)) return c;
  const zoom = clampZoom(c.zoom * factor);
  const [wx, wy] = screenToWorld(c, sx, sy);
  return { zoom, tx: sx - wx * zoom, ty: sy - wy * zoom };
}

/** « Ajuster la page » : page entière visible et centrée, avec une marge. Vue vide : identité. */
export function fitPage(
  viewW: number,
  viewH: number,
  pageW: number = PAGE_WIDTH,
  pageH: number = PAGE_HEIGHT,
  margin = 0.95,
): Camera {
  if (!(viewW > 0) || !(viewH > 0)) return IDENTITY;
  const zoom = clampZoom(Math.min(viewW / pageW, viewH / pageH) * margin);
  return { zoom, tx: (viewW - pageW * zoom) / 2, ty: (viewH - pageH * zoom) / 2 };
}
```

- [ ] **5. `apps/web/src/engine/input/keys.ts` :**

```ts
/** Raccourcis d'annulation (D11) : Ctrl+Z, Ctrl+Y, Ctrl+Maj+Z ; Cmd sous macOS. */
export interface KeyLike {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly isComposing: boolean;
  readonly target: { readonly tagName?: string; readonly isContentEditable?: boolean } | null;
}

export type KeyAction = "undo" | "redo";

const EDITABLE = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function keyAction(e: KeyLike): KeyAction | null {
  // Composition IME : la touche appartient à l'IME (D14). Alt Gr = Ctrl+Alt sous Windows : un caractère, pas un raccourci.
  if (e.isComposing || e.altKey) return null;
  if (!(e.ctrlKey || e.metaKey)) return null;
  const t = e.target;
  if (t !== null && (t.isContentEditable === true || (t.tagName !== undefined && EDITABLE.has(t.tagName.toUpperCase())))) {
    return null;
  }
  const key = e.key.toLowerCase();
  if (key === "z") return e.shiftKey ? "redo" : "undo";
  if (key === "y" && !e.shiftKey) return "redo";
  return null;
}
```

- [ ] **6. `apps/web/src/engine/input/gesture.ts` :**

```ts
/** Contrats entre le routeur d'entrées (D18) et le moteur. Coordonnées en px CSS relatifs à la zone de dessin. */
import type { InputSample } from "./sampler";

/** Outil d'un geste de tracé ; le bouton gomme du stylet impose "eraser" (D12). */
export type DrawTool = "pen" | "eraser";

/**
 * Fin d'un geste. "end" : relâché. "cancel" : fin anormale (pointercancel, capture perdue) ; l'encre reçue est gardée,
 * la gomme n'écrit rien (D39). "abort" : décidé par le routeur (second doigt, paume) ; rien n'est écrit.
 */
export type CloseReason = "end" | "cancel" | "abort";

export interface GestureSink {
  begin(pointerId: number, tool: DrawTool, samples: readonly InputSample[]): void;
  extend(pointerId: number, samples: readonly InputSample[], predicted: readonly InputSample[]): void;
  close(pointerId: number, how: CloseReason): void;
}

export interface ViewSink {
  panBy(dx: number, dy: number): void;
  zoomAt(x: number, y: number, factor: number): void;
}
```

- [ ] **7. `apps/web/src/engine/render/renderer.ts` :**

```ts
/** Rendu derrière une interface (DA2, D19) : Canvas 2D au socle ; WebGL2 pourra remplacer l'implémentation (DA9). */
import type { Change, CoreDocument, EraseMode } from "../../core/api";
import type { Camera } from "../camera";

export interface PageView {
  readonly id: string;
  readonly elementIds: readonly string[];
}

/** Trait en cours : contour du StrokeBuilder (polygones x, y monde séparés par NaN, NaN) et queue prédite. */
export interface LiveStrokeView {
  readonly outline: Float32Array;
  /** x, y monde : dernier point reçu puis points prédits ; vide si aucun. Jamais enregistrés (D20). */
  readonly predicted: Float32Array;
  readonly color: string;
  /** Épaisseur en unités monde. */
  readonly width: number;
}

/** Passage de gomme en cours (D38) : chemin x, y monde, rayon en unités monde. */
export interface EraserPreview {
  readonly path: Float32Array;
  readonly radius: number;
  readonly mode: EraseMode;
}

export interface LiveLayer {
  readonly strokes: readonly LiveStrokeView[];
  readonly erasers: readonly EraserPreview[];
}

export const EMPTY_LIVE: LiveLayer = { strokes: [], erasers: [] };

/** Ce que le rendu lit du document : vue d'un élément (transformation, style) et contour local. */
export type SceneSource = Pick<CoreDocument, "element" | "outline">;

export interface Renderer {
  /** Scène fixe : pourtour, cadre de page, éléments sauf `hidden` (masqués pendant un aperçu, D38). */
  drawScene(page: PageView, camera: Camera, hidden: ReadonlySet<string>): void;
  /** Canvas d'interaction : effacé puis redessiné à chaque image. */
  drawLive(live: LiveLayer, camera: Camera): void;
  /** Taille de la zone en px CSS et devicePixelRatio. */
  resize(width: number, height: number, dpr: number): void;
  /** Oublie les chemins en cache des éléments touchés (`full` : tous). */
  invalidate(change: Change): void;
}
```

- [ ] **8. `apps/web/src/engine/tools/tool.ts` :**

```ts
/** Contrat des outils de geste (stylo, gomme) : aperçu sans écriture, une écriture au relâché (D38). */
import type { Change, Command, CoreDocument } from "../../core/api";
import type { Camera } from "../camera";
import type { CloseReason } from "../input/gesture";
import type { InputSample } from "../input/sampler";
import type { LiveLayer } from "../render/renderer";

/** Ce qu'un outil voit du moteur. `run` ne lève jamais : null si le cœur refuse (message dans l'état du moteur). */
export interface ToolContext {
  readonly doc: CoreDocument;
  page(): string;
  camera(): Camera;
  run(cmd: Command): Change | null;
}

/** Aperçu d'un outil : couche vive et éléments masqués de la scène. */
export interface LivePart extends LiveLayer {
  readonly hidden: ReadonlySet<string>;
}

export interface GestureTool {
  begin(pointerId: number, samples: readonly InputSample[]): void;
  extend(pointerId: number, samples: readonly InputSample[], predicted: readonly InputSample[]): void;
  /** Une fois par image : pousse les points en attente, met l'aperçu à jour. */
  frame(): void;
  close(pointerId: number, how: CloseReason): void;
  live(): LivePart;
  active(): boolean;
}

export const NO_LIVE: LivePart = { strokes: [], erasers: [], hidden: new Set<string>() };
```

- [ ] **9. Vert.** La commande bornée → `Tests  16 passed (16)`.

- [ ] **10. Suite complète et commit.** `verifier.sh` sous le jeton → `verifier.sh : OK`. Puis :

```bash
cd "$WT" && git add apps/web/src/engine/page.ts && git add apps/web/src/engine/camera.ts \
  && git add apps/web/src/engine/camera.test.ts && git add apps/web/src/engine/input/keys.ts \
  && git add apps/web/src/engine/input/keys.test.ts && git add apps/web/src/engine/input/gesture.ts \
  && git add apps/web/src/engine/render/renderer.ts && git add apps/web/src/engine/tools/tool.ts \
  && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
     -m "feat(engine): camera, undo shortcuts and engine contracts" \
     -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t26"></a>
### Tâche T26 — Banc du lot 1 rejoué dans l'application (`?banc`)

**Objectif.** Rejouer le banc du lot 1 avec la géométrie du produit (plan maître, lot 3 ; DA7 : « coût mesuré au
lot 3 par le banc du lot 1 ») : mêmes mesures `roomboard-stylet/1` (pression, fréquence, retard interne, durées
d'image), mais prises sur l'encre dessinée par le moteur (contour `freedraw` du cœur), pour que Jérôme compare jeudi le
JSON de l'application à celui du 16. Ce module ne dépend pas du moteur : il reçoit l'échantillonneur et deux rappels ;
T24 le branche derrière `?banc`. Scénario : S1 rejoué (essai du 19).

**Fichiers.** Créer `apps/web/src/app/banc.ts`, `apps/web/src/app/banc.test.ts`,
`apps/web/src/engine/input/support.ts`. Modifier `apps/web/src/proto/stylet.ts` (la fonction `detectSupport` y est
retirée et importée).

**Interfaces.**
- Consomme : rien du lot (aucune tâche du lot 3 avant elle).
- Réutilise : `apps/web/src/proto/recorder.ts:45` — `createRecorder(options: BenchOptions): Recorder` (`handle(g)`,
  `markDrawn(now)`, `strokes()`).
- Réutilise : `apps/web/src/engine/input/stats.ts:239` — `buildReport(input: ReportInput): BenchReport` ;
  `:97` `effectiveOptions(o: BenchOptions): BenchOptions` ; types `BenchOptions`, `BenchReport`, `Environment`,
  `Support`, `REPORT_FORMAT`.
- Réutilise : `apps/web/src/engine/input/sampler.ts:68-72` — `Sampler` (`onGesture(cb): () => void`, `stats():
  SamplerStats`).
- Étend : `apps/web/src/proto/stylet.ts:31-42` — `detectSupport(): Support`, déplacée telle quelle dans
  `engine/input/support.ts` et importée par le banc du lot 1 (une seule détection pour les deux bancs).
- Produit (`app/banc.ts`) :
  `interface AppBenchDeps { sampler: Pick<Sampler, "onGesture" | "stats">; onLiveDrawn(cb: (now: number) => void): () => void; frameDurations(): number[]; options: BenchOptions; environment: Environment; coreVersion: string; now(): string }` ;
  `interface AppBenchReport extends BenchReport { geometry: "freedraw"; coreVersion: string }` ;
  `interface AppBench { report(): AppBenchReport; dispose(): void }` ;
  `createAppBench(deps: AppBenchDeps): AppBench` ;
  `mountBenchPanel(bench: AppBench, host?: HTMLElement): () => void` (DOM, appelé par T24).
- Produit (`engine/input/support.ts`) : `detectSupport(): Support`.

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/app/banc.test.ts --reporter=verbose 2>&1 | tail -15`
→ `Tests  3 passed (3)`, nom `un trait : points et retards mesurés aux images du moteur` présent. Puis `verifier.sh`
(jeton) → `verifier.sh : OK`, avec la ligne `verifier.sh : prototype en fichier unique OK` (le banc du lot 1 se
construit toujours en un seul fichier) ; `recorder.test.ts`, `stats.test.ts` restent verts.

**Preuve visuelle.** Aucune dans cette tâche (le panneau est monté par T24, essayé jeudi).

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de
`--force` ; aucun workflow GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun ici) ; tests par
`scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom
tests --proprietaire socle/T26 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"`
(commandes ciblées sous le même jeton) ; relecteurs au premier plan (`run_in_background: false`) ; commit d'auteur
`jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5
<noreply@anthropic.com>` ; aucun seuil baissé, aucun test désactivé, sauté ou affaibli ; dépôt public : aucun secret ;
worktree neuf : `pnpm install --frozen-lockfile` d'abord ; `apps/web/src/core/api.ts` figé ; rien n'est écrit avant le
relâché (D38) ; moteur sans framework ; TypeScript strict (`noUncheckedIndexedAccess`) : aucun `any`, aucun `!` sur un
index, `as unknown as` réservé aux faux objets des tests.

**Interdits.** Ne pas modifier `stats.ts`, `recorder.ts` ni le format `roomboard-stylet/1` (les champs `geometry` et
`coreVersion` s'ajoutent dans `AppBenchReport` seulement). Ne pas toucher `main.ts` (T24 branche le banc). Le banc du
lot 1 garde son comportement : seule la définition de `detectSupport` change de fichier. Aucun import du moteur
(`engine/engine.ts`) dans `banc.ts`.

**Terminé quand.** 3 tests verts, `verifier.sh : OK` avec `prototype en fichier unique OK`, rapport avec
`Réutilisation : appelé createRecorder, buildReport, effectiveOptions ; detectSupport déplacée` (ou `écart —
<pourquoi>`).

**Étapes.**

- [ ] **1. Écrire les tests (rouge).** `apps/web/src/app/banc.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { GestureEvent, InputSample, Sampler, SamplerStats } from "../engine/input/sampler";
import { REPORT_FORMAT, type Environment } from "../engine/input/stats";
import { createAppBench, type AppBenchDeps } from "./banc";

const ENV: Environment = {
  userAgent: "test",
  devicePixelRatio: 1,
  support: { coalesced: true, predicted: true, desynchronized: true, inkPresenter: false, pointerRawUpdate: false, secureContext: true },
};
const STATS: SamplerStats = {
  moveEvents: 2,
  samples: 3,
  rawUpdateUsed: false,
  pointerCancels: 0,
  lostCaptures: 0,
  touchIgnored: 1,
  eraserSeen: false,
  gestures: 1,
};

const smp = (t: number): InputSample => ({ x: t, y: 0, pressure: 0.5, tiltX: 0, tiltY: 0, t });
const gest = (kind: GestureEvent["kind"], samples: InputSample[] = []): GestureEvent => ({
  kind,
  pointerId: 1,
  pointerType: "pen",
  eraserButton: false,
  samples,
  predicted: [],
});

function setup() {
  const gestureCbs = new Set<(g: GestureEvent) => void>();
  const drawnCbs = new Set<(now: number) => void>();
  const sampler: Pick<Sampler, "onGesture" | "stats"> = {
    onGesture: (cb) => {
      gestureCbs.add(cb);
      return () => {
        gestureCbs.delete(cb);
      };
    },
    stats: () => STATS,
  };
  const deps: AppBenchDeps = {
    sampler,
    onLiveDrawn: (cb) => {
      drawnCbs.add(cb);
      return () => {
        drawnCbs.delete(cb);
      };
    },
    frameDurations: () => [16, 17, 30],
    options: { coalesced: true, predicted: true, raw: false, desynchronized: true, inkTrail: false },
    environment: ENV,
    coreVersion: "0.1.0",
    now: () => "2026-11-19T09:00:00.000Z",
  };
  const fire = (g: GestureEvent): void => {
    for (const cb of gestureCbs) cb(g);
  };
  const draw = (now: number): void => {
    for (const cb of drawnCbs) cb(now);
  };
  return { bench: createAppBench(deps), fire, draw, gestureCbs, drawnCbs };
}

describe("createAppBench", () => {
  it("rapport roomboard-stylet/1, géométrie du produit et version du cœur", () => {
    const { bench } = setup();
    const r = bench.report();
    expect(r.format).toBe(REPORT_FORMAT);
    expect(r.geometry).toBe("freedraw");
    expect(r.coreVersion).toBe("0.1.0");
    expect(r.createdAt).toBe("2026-11-19T09:00:00.000Z");
    expect(r.frames?.count).toBe(3);
    expect(r.counters.touchIgnored).toBe(1);
  });

  it("un trait : points et retards mesurés aux images du moteur", () => {
    const { bench, fire, draw } = setup();
    fire(gest("start", [smp(0)]));
    fire(gest("move", [smp(4), smp(8)]));
    draw(20);
    fire(gest("end"));
    const strokes = bench.report().strokes;
    expect(strokes).toHaveLength(1);
    expect(strokes[0]?.points).toBe(3);
    expect(strokes[0]?.pointerType).toBe("pen");
    expect(bench.report().totals.penLatencyP95).toBe(20);
  });

  it("dispose : désabonné du moteur et de l'échantillonneur", () => {
    const { bench, gestureCbs, drawnCbs } = setup();
    bench.dispose();
    expect(gestureCbs.size).toBe(0);
    expect(drawnCbs.size).toBe(0);
  });
});
```

- [ ] **2. Lancer, constater l'échec** (`Failed to resolve import "./banc"`).

- [ ] **3. Déplacer `detectSupport`.** Créer `apps/web/src/engine/input/support.ts` :

```ts
/** Prise en charge des API d'entrée et d'affichage (D30), lue dans le navigateur courant. Banc du lot 1 et application. */
import type { Support } from "./stats";

export function detectSupport(): Support {
  const proto = typeof PointerEvent === "undefined" ? null : PointerEvent.prototype;
  const probe = document.createElement("canvas").getContext("2d", { desynchronized: true });
  return {
    coalesced: proto !== null && "getCoalescedEvents" in proto,
    predicted: proto !== null && "getPredictedEvents" in proto,
    desynchronized: probe?.getContextAttributes().desynchronized === true,
    inkPresenter: "ink" in navigator,
    pointerRawUpdate: "onpointerrawupdate" in window,
    secureContext: window.isSecureContext,
  };
}
```

  Dans `apps/web/src/proto/stylet.ts` : supprimer la fonction `detectSupport` (lignes 31-42), ajouter
  `import { detectSupport } from "../engine/input/support";` aux imports, et retirer `type Support` de l'import de
  `../engine/input/stats` (plus utilisé dans ce fichier).

- [ ] **4. `apps/web/src/app/banc.ts` :**

```ts
/**
 * Banc du lot 1 rejoué dans l'application (plan maître, lot 3) : mêmes mesures `roomboard-stylet/1`, mais encre
 * dessinée par le moteur avec la géométrie du produit (contour freedraw du cœur). Ouvert par `?banc` (main.ts).
 * Limite : les points reçus après la dernière image d'un trait n'ont pas de retard mesuré.
 */
import type { Sampler } from "../engine/input/sampler";
import {
  buildReport,
  effectiveOptions,
  type BenchOptions,
  type BenchReport,
  type Environment,
} from "../engine/input/stats";
import { createRecorder } from "../proto/recorder";

export interface AppBenchDeps {
  readonly sampler: Pick<Sampler, "onGesture" | "stats">;
  onLiveDrawn(cb: (now: number) => void): () => void;
  frameDurations(): number[];
  readonly options: BenchOptions;
  readonly environment: Environment;
  readonly coreVersion: string;
  now(): string;
}

export interface AppBenchReport extends BenchReport {
  readonly geometry: "freedraw";
  readonly coreVersion: string;
}

export interface AppBench {
  report(): AppBenchReport;
  dispose(): void;
}

export function createAppBench(deps: AppBenchDeps): AppBench {
  const recorder = createRecorder(effectiveOptions(deps.options));
  const offGesture = deps.sampler.onGesture((g) => recorder.handle(g));
  const offDrawn = deps.onLiveDrawn((now) => recorder.markDrawn(now));
  return {
    report: () => ({
      ...buildReport({
        createdAt: deps.now(),
        environment: deps.environment,
        counters: deps.sampler.stats(),
        frameDurations: deps.frameDurations(),
        strokes: recorder.strokes(),
      }),
      geometry: "freedraw",
      coreVersion: deps.coreVersion,
    }),
    dispose() {
      offGesture();
      offDrawn();
    },
  };
}

const fmt = (v: number | null | undefined, digits = 1): string =>
  v === null || v === undefined ? "—" : v.toFixed(digits);

/** Petit panneau (DOM) : résumé toutes les 500 ms et export du JSON. Hors de la zone de dessin. */
export function mountBenchPanel(bench: AppBench, host: HTMLElement = document.body): () => void {
  const box = document.createElement("div");
  box.id = "banc";
  box.style.cssText =
    "position:absolute;right:8px;bottom:8px;z-index:3;max-width:30rem;padding:8px;background:#fafafaee;" +
    "border:1px solid #a1a1aa;border-radius:6px;font:12px ui-monospace,monospace;";
  const pre = document.createElement("pre");
  pre.style.margin = "0 0 6px";
  pre.style.whiteSpace = "pre-wrap";
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Télécharger le JSON";
  button.addEventListener("click", () => {
    const text = JSON.stringify(bench.report(), null, 2);
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `roomboard-appli-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  box.append(pre, button);
  host.append(box);
  const paint = (): void => {
    const r = bench.report();
    const t = r.totals;
    pre.textContent = [
      `Banc (géométrie du produit, cœur ${r.coreVersion})`,
      `Traits ${t.strokes} (stylet ${t.penStrokes}) · pression stylet ${fmt(t.penPressure?.min, 2)}–${fmt(t.penPressure?.max, 2)}`,
      `Retard interne p50 ${fmt(t.latencyP50)} / p95 ${fmt(t.latencyP95)} ms`,
      `Images ${r.frames?.count ?? 0}, p95 ${fmt(r.frames?.p95)} ms, > 25 ms ${fmt(r.frames ? r.frames.overBudgetShare * 100 : null)} %`,
    ].join("\n");
  };
  paint();
  const timer = window.setInterval(paint, 500);
  return () => {
    window.clearInterval(timer);
    box.remove();
    bench.dispose();
  };
}
```

- [ ] **5. Vert.** La commande bornée → `Tests  3 passed (3)`.

- [ ] **6. Suite complète et commit.** `verifier.sh` sous le jeton → `verifier.sh : OK` et `prototype en fichier
  unique OK`. Puis :

```bash
cd "$WT" && git add apps/web/src/app/banc.ts && git add apps/web/src/app/banc.test.ts \
  && git add apps/web/src/engine/input/support.ts && git add apps/web/src/proto/stylet.ts \
  && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
     -m "feat(web): stylus bench replayed in the app with the product geometry" \
     -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t19"></a>
### Tâche T19 — `Canvas2DRenderer` à deux canvas (D19, D38)

**Objectif.** Implémenter `Renderer` (DA2) en Canvas 2D : scène fixe (pourtour, page blanche 1920 × 1080, traits
remplis depuis leur contour local placé par `transform`, `Path2D` en cache par id invalidé par `Change`) et canvas
d'interaction ouvert avec `desynchronized: true` (encre vive, queue prédite, aperçu de la gomme partielle). Tampons au
`devicePixelRatio` avec l'échelle exacte tampon / CSS (leçon T6c du lot 1 : sinon l'encre tombe à côté de la pointe).
Scénario : S2 (pixels d'encre lus sur le canvas de scène).

**Fichiers.** Créer `apps/web/src/engine/render/canvas2d.ts`, `apps/web/src/engine/render/canvas2d.test.ts`.

**Interfaces.**
- Consomme (T18) : `Renderer`, `PageView`, `LiveLayer`, `LiveStrokeView`, `EraserPreview`, `SceneSource` de
  `./renderer` ; `Camera`, `IDENTITY` de `../camera` ; `PAGE_WIDTH`, `PAGE_HEIGHT`, `PAGE_BACKGROUND`,
  `SURROUND_COLOR` de `../page`.
- Réutilise : `apps/web/src/core/api.ts` — `CoreDocument.element(id): ElementView | null` (`transform`, `style.color`),
  `CoreDocument.outline(id): Float32Array | null` (contour local, mis en cache par le cœur après T17), type `Change`.
- Réutilise : la mise à l'échelle de `apps/web/src/proto/stylet.ts:127-139` (`fitCanvases` : échelle `tampon / CSS`
  exacte), reprise dans `resize` (même calcul, pas d'import du banc).
- Produit : `class Canvas2DRenderer implements Renderer` avec
  `constructor(scene: CanvasRenderingContext2D, live: CanvasRenderingContext2D, source: SceneSource, opts?: Canvas2DOptions)` ;
  `interface Canvas2DOptions { makePath?: () => Path2D }` ;
  `interface PathSink { moveTo(x: number, y: number): void; lineTo(x: number, y: number): void; closePath(): void }` ;
  `tracePolygons(p: PathSink, flat: ArrayLike<number>): void` (paire NaN = nouveau polygone) ;
  `createCanvas2DRenderer(scene: HTMLCanvasElement, live: HTMLCanvasElement, source: SceneSource): Canvas2DRenderer`.

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/engine/render/canvas2d.test.ts --reporter=verbose 2>&1 | tail -20`
→ `Tests  11 passed (11)`, noms `Path2D en cache par id, invalidé par Change` et `resize : tampons au devicePixelRatio,
échelle exacte tampon / CSS` présents. Puis `verifier.sh` (jeton) → `verifier.sh : OK`.

**Preuve visuelle.** Aucune dans cette tâche (lecture des pixels par le script S2 à T24).

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de
`--force` ; aucun workflow GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun ici) ; tests par
`scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom
tests --proprietaire socle/T19 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"`
(commandes ciblées sous le même jeton) ; relecteurs au premier plan (`run_in_background: false`) ; commit d'auteur
`jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5
<noreply@anthropic.com>` ; aucun seuil baissé, aucun test désactivé, sauté ou affaibli ; dépôt public : aucun secret ;
worktree neuf : `pnpm install --frozen-lockfile` d'abord ; `apps/web/src/core/api.ts` figé ; rien n'est écrit avant le
relâché (D38) ; moteur sans framework, globals du DOM permis ici seulement dans `createCanvas2DRenderer` et la fabrique
`Path2D` par défaut ; TypeScript strict (`noUncheckedIndexedAccess`) : aucun `any`, aucun `!` sur un index,
`as unknown as` réservé aux faux objets des tests.

**Interdits.** Aucun appel au document en écriture. Pas de WebGL (échelon 4 de DA9, lot 3b si le verdict l'exige).
Ne pas modifier `renderer.ts` (contrat de T18). Pas de `getImageData` ni de copie de canvas à chaque image.

**Terminé quand.** 11 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : appelé CoreDocument.element,
CoreDocument.outline ; calcul d'échelle de fitCanvases repris` (ou `écart — <pourquoi>`).

**Étapes.**

- [ ] **1. Écrire les tests (rouge).** `apps/web/src/engine/render/canvas2d.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { IDENTITY } from "../camera";
import { PAGE_BACKGROUND, SURROUND_COLOR } from "../page";
import { Canvas2DRenderer, createCanvas2DRenderer, tracePolygons } from "./canvas2d";
import type { SceneSource } from "./renderer";

class FakeCtx {
  readonly canvas = { width: 0, height: 0 };
  readonly log: string[] = [];
  fillStyle = "";
  strokeStyle = "";
  lineWidth = 1;
  lineCap = "butt";
  lineJoin = "miter";
  save(): void { this.log.push("save"); }
  restore(): void { this.log.push("restore"); }
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.log.push(`setTransform ${[a, b, c, d, e, f].map((v) => +v.toFixed(4)).join(",")}`);
  }
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.log.push(`transform ${[a, b, c, d, e, f].join(",")}`);
  }
  clearRect(): void { this.log.push("clearRect"); }
  fillRect(): void { this.log.push(`fillRect ${this.fillStyle}`); }
  beginPath(): void { this.log.push("beginPath"); }
  moveTo(): void { this.log.push("moveTo"); }
  lineTo(): void { this.log.push("lineTo"); }
  closePath(): void { this.log.push("closePath"); }
  rect(): void { this.log.push("rect"); }
  clip(): void { this.log.push("clip"); }
  fill(): void { this.log.push(`fill ${this.fillStyle}`); }
  stroke(): void { this.log.push(`stroke ${this.strokeStyle} ${this.lineWidth}`); }
}

class FakePath {
  moves = 0;
  lines = 0;
  closes = 0;
  moveTo(): void { this.moves++; }
  lineTo(): void { this.lines++; }
  closePath(): void { this.closes++; }
}

const asCtx = (f: FakeCtx): CanvasRenderingContext2D => f as unknown as CanvasRenderingContext2D;
const square = new Float32Array([0, 0, 10, 0, 10, 10, 0, 10]);

function make(outlines: Record<string, Float32Array | null>) {
  const calls: string[] = [];
  const src: SceneSource = {
    element: (id) =>
      id in outlines
        ? { id, kind: "stroke", transform: [1, 0, 0, 1, 5, 6], style: { color: "#000000", width: 4 } }
        : null,
    outline: (id) => {
      calls.push(id);
      return outlines[id] ?? null;
    },
  };
  const scene = new FakeCtx();
  const live = new FakeCtx();
  const r = new Canvas2DRenderer(asCtx(scene), asCtx(live), src, { makePath: () => new FakePath() as unknown as Path2D });
  return { r, scene, live, calls, src };
}

describe("Canvas2DRenderer (D19, DA2)", () => {
  it("resize : tampons au devicePixelRatio, échelle exacte tampon / CSS", () => {
    const { r, scene, live } = make({});
    r.resize(1001, 500, 1.5);
    expect([scene.canvas.width, scene.canvas.height, live.canvas.width, live.canvas.height]).toEqual([1502, 750, 1502, 750]);
    r.drawScene({ id: "p", elementIds: [] }, IDENTITY, new Set());
    expect(scene.log).toContain(`setTransform ${+(1502 / 1001).toFixed(4)},0,0,1.5,0,0`);
  });

  it("drawScene : pourtour, page blanche, un remplissage par élément à sa transformation", () => {
    const { r, scene } = make({ a: square, b: square });
    r.resize(100, 100, 1);
    r.drawScene({ id: "p", elementIds: ["a", "b"] }, IDENTITY, new Set());
    expect(scene.log.filter((l) => l.startsWith("fillRect"))).toEqual([`fillRect ${SURROUND_COLOR}`, `fillRect ${PAGE_BACKGROUND}`]);
    expect(scene.log.filter((l) => l.startsWith("fill "))).toEqual(["fill #000000", "fill #000000"]);
    expect(scene.log).toContain("transform 1,0,0,1,5,6");
  });

  it("drawScene : les éléments masqués (aperçu D38) ne sont pas dessinés", () => {
    const { r, scene } = make({ a: square, b: square });
    r.drawScene({ id: "p", elementIds: ["a", "b"] }, IDENTITY, new Set(["a"]));
    expect(scene.log.filter((l) => l.startsWith("fill "))).toEqual(["fill #000000"]);
  });

  it("Path2D en cache par id, invalidé par Change", () => {
    const { r, calls } = make({ a: square, b: square });
    const page = { id: "p", elementIds: ["a", "b"] };
    r.drawScene(page, IDENTITY, new Set());
    r.drawScene(page, IDENTITY, new Set());
    expect(calls).toEqual(["a", "b"]);
    r.invalidate({ pages: [], ids: ["a"], removed: [], full: false, version: 2 });
    r.drawScene(page, IDENTITY, new Set());
    expect(calls).toEqual(["a", "b", "a"]);
    r.invalidate({ pages: [], ids: [], removed: [], full: true, version: 3 });
    r.drawScene(page, IDENTITY, new Set());
    expect(calls).toEqual(["a", "b", "a", "a", "b"]);
  });

  it("élément sans contour ou inconnu : ignoré sans erreur", () => {
    const { r, scene } = make({ a: null });
    r.drawScene({ id: "p", elementIds: ["a", "inconnu"] }, IDENTITY, new Set());
    expect(scene.log.filter((l) => l.startsWith("fill "))).toEqual([]);
  });

  it("tracePolygons : une paire NaN sépare deux polygones", () => {
    const p = new FakePath();
    tracePolygons(p, new Float32Array([0, 0, 1, 0, 1, 1, Number.NaN, Number.NaN, 5, 5, 6, 5, 6, 6]));
    expect([p.moves, p.lines, p.closes]).toEqual([2, 4, 2]);
  });

  it("drawLive : efface, puis trait vif rempli et queue prédite tracée", () => {
    const { r, live } = make({});
    r.resize(100, 100, 1);
    r.drawLive(
      { strokes: [{ outline: square, predicted: new Float32Array([10, 10, 14, 12]), color: "#1e40af", width: 4 }], erasers: [] },
      IDENTITY,
    );
    expect(live.log[0]).toBe("setTransform 1,0,0,1,0,0");
    expect(live.log[1]).toBe("clearRect");
    expect(live.log).toContain("fill #1e40af");
    expect(live.log).toContain("stroke #1e40af 4");
  });

  it("drawLive sans aperçu : effacé seulement", () => {
    const { r, live } = make({});
    r.drawLive({ strokes: [], erasers: [] }, IDENTITY);
    expect(live.log).toEqual(["setTransform 1,0,0,1,0,0", "clearRect"]);
  });

  it("gomme partielle : fond de page puis pourtour repeints le long du chemin, largeur 2 × rayon", () => {
    const { r, live } = make({});
    r.drawLive({ strokes: [], erasers: [{ path: new Float32Array([0, 0, 50, 50]), radius: 6, mode: "partial" }] }, IDENTITY);
    expect(live.log.filter((l) => l.startsWith("stroke"))).toEqual([`stroke ${PAGE_BACKGROUND} 12`, `stroke ${SURROUND_COLOR} 12`]);
    expect(live.log.filter((l) => l === "clip")).toHaveLength(2);
  });

  it("gomme d'objet : rien de peint (les traits touchés sont masqués de la scène)", () => {
    const { r, live } = make({});
    r.drawLive({ strokes: [], erasers: [{ path: new Float32Array([0, 0, 50, 50]), radius: 6, mode: "object" }] }, IDENTITY);
    expect(live.log.filter((l) => l.startsWith("stroke"))).toEqual([]);
  });

  it("createCanvas2DRenderer : scène opaque, interaction en desynchronized", () => {
    const opts: unknown[] = [];
    const canvas = (): HTMLCanvasElement =>
      ({
        getContext: (_type: string, o: unknown) => {
          opts.push(o);
          return asCtx(new FakeCtx());
        },
      }) as unknown as HTMLCanvasElement;
    createCanvas2DRenderer(canvas(), canvas(), make({}).src);
    expect(opts).toEqual([{ alpha: false }, { desynchronized: true }]);
  });
});
```

- [ ] **2. Lancer, constater l'échec** (`Failed to resolve import "./canvas2d"`).

- [ ] **3. `apps/web/src/engine/render/canvas2d.ts` :**

```ts
/**
 * Rendu Canvas 2D à deux canvas (D19, DA2) : scène fixe (redessinée sur changement ou caméra) et interaction
 * (`desynchronized`, effacée à chaque image : encre vive, queue prédite, aperçu de gomme). `Path2D` en cache par id,
 * invalidé par `Change`. Échelle exacte tampon / CSS : l'arrondi du tampon ne décale pas l'encre (lot 1, T6c).
 */
import type { Change } from "../../core/api";
import type { Camera } from "../camera";
import { PAGE_BACKGROUND, PAGE_HEIGHT, PAGE_WIDTH, SURROUND_COLOR } from "../page";
import type { EraserPreview, LiveLayer, LiveStrokeView, PageView, Renderer, SceneSource } from "./renderer";

export interface PathSink {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
}

export interface Canvas2DOptions {
  /** Fabrique de chemins : Node n'a pas Path2D, les tests en passent une fausse. */
  readonly makePath?: () => Path2D;
}

/** Polygones fermés x, y alternés ; une paire non finie (NaN, NaN) commence un nouveau polygone. */
export function tracePolygons(p: PathSink, flat: ArrayLike<number>): void {
  let open = false;
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const x = flat[i] ?? Number.NaN;
    const y = flat[i + 1] ?? Number.NaN;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      if (open) p.closePath();
      open = false;
      continue;
    }
    if (open) p.lineTo(x, y);
    else {
      p.moveTo(x, y);
      open = true;
    }
  }
  if (open) p.closePath();
}

/** Bord lointain du pourtour pour la découpe de l'aperçu de gomme (unités monde). */
const FAR = 1e7;

export class Canvas2DRenderer implements Renderer {
  private readonly paths = new Map<string, Path2D | null>();
  private readonly makePath: () => Path2D;
  private sx = 1;
  private sy = 1;

  constructor(
    private readonly scene: CanvasRenderingContext2D,
    private readonly live: CanvasRenderingContext2D,
    private readonly source: SceneSource,
    opts: Canvas2DOptions = {},
  ) {
    this.makePath = opts.makePath ?? (() => new Path2D());
  }

  resize(width: number, height: number, dpr: number): void {
    const w = Math.max(1, Math.round(width * dpr));
    const h = Math.max(1, Math.round(height * dpr));
    for (const ctx of [this.scene, this.live]) {
      if (ctx.canvas.width !== w) ctx.canvas.width = w;
      if (ctx.canvas.height !== h) ctx.canvas.height = h;
    }
    this.sx = width > 0 ? w / width : dpr;
    this.sy = height > 0 ? h / height : dpr;
  }

  drawScene(page: PageView, camera: Camera, hidden: ReadonlySet<string>): void {
    const ctx = this.scene;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = SURROUND_COLOR;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.setView(ctx, camera);
    ctx.fillStyle = PAGE_BACKGROUND;
    ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    for (const id of page.elementIds) {
      if (hidden.has(id)) continue;
      const el = this.source.element(id);
      if (!el) continue;
      const path = this.pathOf(id);
      if (!path) continue;
      const [a, b, c, d, e, f] = el.transform;
      ctx.save();
      ctx.transform(a, b, c, d, e, f);
      ctx.fillStyle = el.style.color;
      ctx.fill(path, "nonzero");
      ctx.restore();
    }
  }

  drawLive(live: LiveLayer, camera: Camera): void {
    const ctx = this.live;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (live.strokes.length === 0 && live.erasers.length === 0) return;
    this.setView(ctx, camera);
    for (const e of live.erasers) this.paintEraser(ctx, e);
    for (const s of live.strokes) this.paintStroke(ctx, s);
  }

  invalidate(change: Change): void {
    if (change.full) {
      this.paths.clear();
      return;
    }
    for (const id of change.ids) this.paths.delete(id);
    for (const id of change.removed) this.paths.delete(id);
  }

  private setView(ctx: CanvasRenderingContext2D, c: Camera): void {
    ctx.setTransform(this.sx * c.zoom, 0, 0, this.sy * c.zoom, this.sx * c.tx, this.sy * c.ty);
  }

  private pathOf(id: string): Path2D | null {
    const cached = this.paths.get(id);
    if (cached !== undefined) return cached;
    const outline = this.source.outline(id);
    let path: Path2D | null = null;
    if (outline && outline.length >= 6) {
      path = this.makePath();
      tracePolygons(path, outline);
    }
    this.paths.set(id, path);
    return path;
  }

  private paintStroke(ctx: CanvasRenderingContext2D, s: LiveStrokeView): void {
    ctx.fillStyle = s.color;
    ctx.beginPath();
    tracePolygons(ctx, s.outline);
    ctx.fill("nonzero");
    if (s.predicted.length < 4) return;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(s.predicted[0] ?? 0, s.predicted[1] ?? 0);
    for (let i = 2; i + 1 < s.predicted.length; i += 2) ctx.lineTo(s.predicted[i] ?? 0, s.predicted[i + 1] ?? 0);
    ctx.stroke();
  }

  /**
   * Gomme partielle (D38, HL3-2) : la couleur du fond est peinte le long du chemin, découpée au cadre de la page
   * (blanc dedans, pourtour dehors). Gomme d'objet : rien ici, les traits touchés sont masqués de la scène.
   */
  private paintEraser(ctx: CanvasRenderingContext2D, e: EraserPreview): void {
    if (e.mode !== "partial" || e.path.length < 2) return;
    const x0 = e.path[0] ?? 0;
    const y0 = e.path[1] ?? 0;
    const along = (color: string, region: () => void): void => {
      ctx.save();
      ctx.beginPath();
      region();
      ctx.clip("evenodd");
      ctx.strokeStyle = color;
      ctx.lineWidth = e.radius * 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      if (e.path.length === 2) ctx.lineTo(x0, y0);
      for (let i = 2; i + 1 < e.path.length; i += 2) ctx.lineTo(e.path[i] ?? x0, e.path[i + 1] ?? y0);
      ctx.stroke();
      ctx.restore();
    };
    along(PAGE_BACKGROUND, () => ctx.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT));
    along(SURROUND_COLOR, () => {
      ctx.rect(-FAR, -FAR, 2 * FAR, 2 * FAR);
      ctx.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    });
  }
}

/** Ouvre les deux contextes : scène opaque, interaction `desynchronized` quand le navigateur le permet (D19). */
export function createCanvas2DRenderer(
  scene: HTMLCanvasElement,
  live: HTMLCanvasElement,
  source: SceneSource,
): Canvas2DRenderer {
  const sceneCtx = scene.getContext("2d", { alpha: false });
  const liveCtx = live.getContext("2d", { desynchronized: true });
  if (!sceneCtx || !liveCtx) throw new Error("canvas 2D indisponible");
  return new Canvas2DRenderer(sceneCtx, liveCtx, source);
}
```

- [ ] **4. Vert.** La commande bornée → `Tests  11 passed (11)`.

- [ ] **5. Suite complète et commit.** `verifier.sh` sous le jeton → `verifier.sh : OK`. Puis :

```bash
cd "$WT" && git add apps/web/src/engine/render/canvas2d.ts && git add apps/web/src/engine/render/canvas2d.test.ts \
  && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
     -m "feat(engine): Canvas 2D renderer with scene and desynchronized live layers" \
     -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t20"></a>
### Tâche T20 — Routeur d'entrées D18 (doigt, paume, pincement)

**Objectif.** Décider pour chaque geste de l'échantillonneur (lot 1) s'il trace, déplace la vue, pince ou est ignoré
(D18) : un geste par `pointerId` (deux stylets, ou stylet et souris, tracent ensemble) ; le stylet et la souris
tracent avec l'outil courant, le bouton gomme du stylet impose la gomme ; un doigt trace tant qu'aucun stylet n'a été
vu (ENI tactiles sans stylet) ; un second doigt posé dans les 150 ms annule le trait commencé (rien d'écrit) et passe en
pincement ; dès qu'un stylet a été vu, le doigt seul déplace la vue (réglable). La paume (contact `touch` annulé par
l'échantillonneur parce que le stylet touche) est fermée sans écriture. Scénario : S2 (souris) et l'essai du 19 (doigt,
stylet).

**Fichiers.** Créer `apps/web/src/engine/input/router.ts`, `apps/web/src/engine/input/router.test.ts`.

**Interfaces.**
- Consomme (T18) : `DrawTool`, `CloseReason`, `GestureSink`, `ViewSink` de `./gesture`.
- Réutilise : `apps/web/src/engine/input/sampler.ts:18-27` — `GestureEvent { kind: "start" | "move" | "end" | "cancel"; pointerId; pointerType; eraserButton; samples: readonly InputSample[]; predicted; palm? }`
  et `InputSample` (`t` = `timeStamp` en ms : sert à la règle des 150 ms). L'échantillonneur ignore déjà tout contact
  `touch` pendant que le stylet touche et ferme une paume posée avant la pointe par `cancel` + `palm: true`.
- Produit : `SECOND_FINGER_MS = 150` ;
  `interface RouterOptions { fingerPansAfterPen: boolean; secondFingerMs: number }` ;
  `DEFAULT_ROUTER_OPTIONS: RouterOptions` (`true`, `150`) ;
  `interface RouterDeps { currentTool(): DrawTool; gestures: GestureSink; view: ViewSink }` ;
  `interface Router { handle(g: GestureEvent): void; penSeen(): boolean }` ;
  `createRouter(opts: RouterOptions, deps: RouterDeps): Router`.

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/engine/input/router.test.ts --reporter=verbose 2>&1 | tail -22`
→ `Tests  14 passed (14)`, nom `second doigt dans les 150 ms : trait annulé sans écriture, puis pincement` présent.
Puis `verifier.sh` (jeton) → `verifier.sh : OK` (`sampler.test.ts` reste vert).

**Preuve visuelle.** Aucune (essai au doigt et au stylet jeudi, fiche de T25).

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de
`--force` ; aucun workflow GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun ici) ; tests par
`scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom
tests --proprietaire socle/T20 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"`
(commandes ciblées sous le même jeton) ; relecteurs au premier plan (`run_in_background: false`) ; commit d'auteur
`jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5
<noreply@anthropic.com>` ; aucun seuil baissé, aucun test désactivé, sauté ou affaibli ; dépôt public : aucun secret ;
worktree neuf : `pnpm install --frozen-lockfile` d'abord ; `apps/web/src/core/api.ts` figé ; rien n'est écrit avant le
relâché (D38) ; moteur sans framework ni global du DOM ; TypeScript strict (`noUncheckedIndexedAccess`) : aucun `any`,
aucun `!` sur un index.

**Interdits.** Ne pas modifier `sampler.ts` (ses règles D39 et de paume restent la source). Aucune horloge
(`performance.now`, `Date`) : le temps vient de `InputSample.t`. Aucun accès au document ni à la caméra : le routeur
n'appelle que `GestureSink` et `ViewSink`.

**Terminé quand.** 14 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : appelé GestureEvent / InputSample
de sampler.ts` (ou `écart — <pourquoi>`).

**Étapes.**

- [ ] **1. Écrire les tests (rouge).** `apps/web/src/engine/input/router.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { DrawTool, GestureSink, ViewSink } from "./gesture";
import { createRouter, DEFAULT_ROUTER_OPTIONS, SECOND_FINGER_MS, type RouterOptions } from "./router";
import type { GestureEvent, GestureKind, InputSample } from "./sampler";

const s = (x: number, y: number, t: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t });

function ev(
  kind: GestureKind,
  pointerId: number,
  pointerType: string,
  samples: InputSample[],
  extra: Partial<GestureEvent> = {},
): GestureEvent {
  return { kind, pointerId, pointerType, eraserButton: false, samples, predicted: [], ...extra };
}

function setup(opts: RouterOptions = DEFAULT_ROUTER_OPTIONS, tool: DrawTool = "pen") {
  const log: string[] = [];
  const gestures: GestureSink = {
    begin: (id, t, samples) => log.push(`begin ${id} ${t} ${samples.length}`),
    extend: (id, samples) => log.push(`extend ${id} ${samples.length}`),
    close: (id, how) => log.push(`close ${id} ${how}`),
  };
  const view: ViewSink = {
    panBy: (dx, dy) => log.push(`pan ${dx} ${dy}`),
    zoomAt: (x, y, f) => log.push(`zoom ${x} ${y} ${f}`),
  };
  return { router: createRouter(opts, { currentTool: () => tool, gestures, view }), log };
}

/** Un trait au stylet, relâché : le stylet a été vu. */
function penSeen(router: ReturnType<typeof createRouter>, log: string[]): void {
  router.handle(ev("start", 1, "pen", [s(0, 0, 0)]));
  router.handle(ev("end", 1, "pen", []));
  log.length = 0;
}

describe("createRouter (D18)", () => {
  it("stylet : trace avec l'outil courant", () => {
    const { router, log } = setup();
    router.handle(ev("start", 1, "pen", [s(0, 0, 0)]));
    router.handle(ev("move", 1, "pen", [s(1, 1, 5), s(2, 2, 6)]));
    router.handle(ev("end", 1, "pen", []));
    expect(log).toEqual(["begin 1 pen 1", "extend 1 2", "close 1 end"]);
    expect(router.penSeen()).toBe(true);
  });

  it("bouton gomme du stylet : le geste passe à la gomme", () => {
    const { router, log } = setup();
    router.handle(ev("start", 1, "pen", [s(0, 0, 0)], { eraserButton: true }));
    expect(log).toEqual(["begin 1 eraser 1"]);
  });

  it("souris : trace avec l'outil courant (gomme choisie)", () => {
    const { router, log } = setup(DEFAULT_ROUTER_OPTIONS, "eraser");
    router.handle(ev("start", 7, "mouse", [s(0, 0, 0)]));
    expect(log).toEqual(["begin 7 eraser 1"]);
    expect(router.penSeen()).toBe(false);
  });

  it("deux stylets tracent ensemble : un geste par pointerId", () => {
    const { router, log } = setup();
    router.handle(ev("start", 1, "pen", [s(0, 0, 0)]));
    router.handle(ev("start", 2, "pen", [s(9, 9, 1)]));
    router.handle(ev("move", 2, "pen", [s(10, 10, 2)]));
    router.handle(ev("end", 1, "pen", []));
    expect(log).toEqual(["begin 1 pen 1", "begin 2 pen 1", "extend 2 1", "close 1 end"]);
  });

  it("doigt seul, aucun stylet vu : trace (ENI sans stylet)", () => {
    const { router, log } = setup();
    router.handle(ev("start", 3, "touch", [s(0, 0, 0)]));
    router.handle(ev("move", 3, "touch", [s(5, 0, 8)]));
    expect(log).toEqual(["begin 3 pen 1", "extend 3 1"]);
  });

  it(`second doigt dans les ${SECOND_FINGER_MS} ms : trait annulé sans écriture, puis pincement`, () => {
    const { router, log } = setup();
    router.handle(ev("start", 3, "touch", [s(100, 100, 0)]));
    router.handle(ev("start", 4, "touch", [s(200, 100, 150)]));
    router.handle(ev("move", 4, "touch", [s(300, 100, 160)]));
    expect(log).toEqual(["begin 3 pen 1", "close 3 abort", "pan 50 0", "zoom 200 100 2"]);
  });

  it("second doigt après 150 ms : ignoré, le trait continue", () => {
    const { router, log } = setup();
    router.handle(ev("start", 3, "touch", [s(0, 0, 0)]));
    router.handle(ev("start", 4, "touch", [s(50, 50, 151)]));
    router.handle(ev("move", 4, "touch", [s(60, 60, 160)]));
    router.handle(ev("move", 3, "touch", [s(5, 5, 161)]));
    router.handle(ev("end", 4, "touch", []));
    router.handle(ev("end", 3, "touch", []));
    expect(log).toEqual(["begin 3 pen 1", "extend 3 1", "close 3 end"]);
  });

  it("après un stylet vu, le doigt seul déplace la vue", () => {
    const { router, log } = setup();
    penSeen(router, log);
    router.handle(ev("start", 3, "touch", [s(10, 10, 100)]));
    router.handle(ev("move", 3, "touch", [s(30, 25, 110)]));
    router.handle(ev("end", 3, "touch", []));
    expect(log).toEqual(["pan 20 15"]);
  });

  it("réglage coupé : le doigt trace même après un stylet", () => {
    const { router, log } = setup({ ...DEFAULT_ROUTER_OPTIONS, fingerPansAfterPen: false });
    penSeen(router, log);
    router.handle(ev("start", 3, "touch", [s(10, 10, 100)]));
    expect(log).toEqual(["begin 3 pen 1"]);
  });

  it("deux doigts en déplacement de vue : pincement, quel que soit le délai", () => {
    const { router, log } = setup();
    penSeen(router, log);
    router.handle(ev("start", 3, "touch", [s(100, 100, 1000)]));
    router.handle(ev("start", 4, "touch", [s(200, 100, 5000)]));
    router.handle(ev("move", 3, "touch", [s(0, 100, 5010)]));
    expect(log).toEqual(["pan -50 0", "zoom 100 100 2"]);
  });

  it("paume annulée par le stylet (palm) : abort, rien d'écrit", () => {
    const { router, log } = setup();
    router.handle(ev("start", 3, "touch", [s(0, 0, 0)]));
    router.handle(ev("cancel", 3, "touch", [], { palm: true }));
    expect(log).toEqual(["begin 3 pen 1", "close 3 abort"]);
  });

  it("pointercancel d'un trait : close cancel (l'outil garde l'encre, D39)", () => {
    const { router, log } = setup();
    router.handle(ev("start", 1, "pen", [s(0, 0, 0)]));
    router.handle(ev("cancel", 1, "pen", []));
    expect(log).toEqual(["begin 1 pen 1", "close 1 cancel"]);
  });

  it("fin du pincement : le doigt restant n'agit plus jusqu'à son relâché", () => {
    const { router, log } = setup();
    router.handle(ev("start", 3, "touch", [s(100, 100, 0)]));
    router.handle(ev("start", 4, "touch", [s(200, 100, 10)]));
    router.handle(ev("end", 4, "touch", []));
    log.length = 0;
    router.handle(ev("move", 3, "touch", [s(150, 150, 50)]));
    router.handle(ev("end", 3, "touch", []));
    router.handle(ev("start", 5, "touch", [s(0, 0, 100)]));
    expect(log).toEqual(["begin 5 pen 1"]);
  });

  it("troisième doigt pendant un pincement : ignoré", () => {
    const { router, log } = setup();
    router.handle(ev("start", 3, "touch", [s(100, 100, 0)]));
    router.handle(ev("start", 4, "touch", [s(200, 100, 10)]));
    log.length = 0;
    router.handle(ev("start", 5, "touch", [s(300, 300, 20)]));
    router.handle(ev("move", 5, "touch", [s(310, 300, 30)]));
    router.handle(ev("end", 5, "touch", []));
    expect(log).toEqual([]);
  });
});
```

- [ ] **2. Lancer, constater l'échec** (`Failed to resolve import "./router"`).

- [ ] **3. `apps/web/src/engine/input/router.ts` :**

```ts
/**
 * Routeur d'entrées (D18) : pour chaque geste de l'échantillonneur, tracer, déplacer la vue, pincer ou ignorer.
 * Un geste par pointerId. Stylet et souris tracent avec l'outil courant (bouton gomme du stylet : gomme). Doigt : trace
 * tant qu'aucun stylet n'a été vu (ENI sans stylet), sinon déplace la vue (réglable). Un second doigt posé dans les
 * 150 ms du premier annule le trait commencé (rien d'écrit) et passe en pincement. L'outil d'un geste est fixé au début.
 */
import type { CloseReason, DrawTool, GestureSink, ViewSink } from "./gesture";
import type { GestureEvent, InputSample } from "./sampler";

export const SECOND_FINGER_MS = 150;

export interface RouterOptions {
  /** Après un stylet vu dans la séance, le doigt seul déplace la vue au lieu de tracer (D18, réglable). */
  readonly fingerPansAfterPen: boolean;
  readonly secondFingerMs: number;
}

export const DEFAULT_ROUTER_OPTIONS: RouterOptions = { fingerPansAfterPen: true, secondFingerMs: SECOND_FINGER_MS };

export interface RouterDeps {
  currentTool(): DrawTool;
  readonly gestures: GestureSink;
  readonly view: ViewSink;
}

export interface Router {
  handle(g: GestureEvent): void;
  penSeen(): boolean;
}

type Role = "draw" | "pan" | "pinch" | "ignored";

interface Track {
  role: Role;
  readonly pointerType: string;
  readonly startT: number;
  x: number;
  y: number;
}

const lastOf = (samples: readonly InputSample[]): InputSample | undefined => samples[samples.length - 1];

export function createRouter(opts: RouterOptions, deps: RouterDeps): Router {
  const tracks = new Map<number, Track>();
  let seenPen = false;

  const touches = (role: Role): [number, Track][] =>
    [...tracks].filter(([, t]) => t.pointerType === "touch" && t.role === role);

  const pinchPair = (): [Track, Track] | null => {
    const p = touches("pinch");
    const a = p[0];
    const b = p[1];
    return a && b ? [a[1], b[1]] : null;
  };

  const onStart = (g: GestureEvent): void => {
    const s = g.samples[0];
    if (!s) return;
    const track: Track = { role: "ignored", pointerType: g.pointerType, startT: s.t, x: s.x, y: s.y };
    tracks.set(g.pointerId, track);
    if (g.pointerType === "pen") seenPen = true;
    if (g.pointerType !== "touch") {
      track.role = "draw";
      deps.gestures.begin(g.pointerId, g.eraserButton ? "eraser" : deps.currentTool(), g.samples);
      return;
    }
    if (pinchPair()) return; // troisième doigt : ignoré
    const drawing = touches("draw")[0];
    const panning = touches("pan")[0];
    if (drawing && s.t - drawing[1].startT <= opts.secondFingerMs) {
      deps.gestures.close(drawing[0], "abort");
      drawing[1].role = "pinch";
      track.role = "pinch";
      return;
    }
    if (panning) {
      panning[1].role = "pinch";
      track.role = "pinch";
      return;
    }
    if (drawing) return; // second doigt tardif : ignoré, le trait continue (HL3-5)
    if (seenPen && opts.fingerPansAfterPen) {
      track.role = "pan";
      return;
    }
    track.role = "draw";
    deps.gestures.begin(g.pointerId, deps.currentTool(), g.samples);
  };

  const onMove = (g: GestureEvent): void => {
    const t = tracks.get(g.pointerId);
    const s = lastOf(g.samples);
    if (!t || !s) return;
    if (t.role === "draw") {
      deps.gestures.extend(g.pointerId, g.samples, g.predicted);
    } else if (t.role === "pan") {
      deps.view.panBy(s.x - t.x, s.y - t.y);
    } else if (t.role === "pinch") {
      const pair = pinchPair();
      if (pair) {
        const [a, b] = pair;
        const cx0 = (a.x + b.x) / 2;
        const cy0 = (a.y + b.y) / 2;
        const d0 = Math.hypot(a.x - b.x, a.y - b.y);
        t.x = s.x;
        t.y = s.y;
        const cx1 = (a.x + b.x) / 2;
        const cy1 = (a.y + b.y) / 2;
        const d1 = Math.hypot(a.x - b.x, a.y - b.y);
        deps.view.panBy(cx1 - cx0, cy1 - cy0);
        if (d0 > 0 && d1 > 0) deps.view.zoomAt(cx1, cy1, d1 / d0);
      }
    }
    t.x = s.x;
    t.y = s.y;
  };

  const onClose = (g: GestureEvent): void => {
    const t = tracks.get(g.pointerId);
    if (!t) return;
    tracks.delete(g.pointerId);
    if (t.role === "draw") {
      const how: CloseReason = g.palm === true ? "abort" : g.kind === "cancel" ? "cancel" : "end";
      deps.gestures.close(g.pointerId, how);
    } else if (t.role === "pinch") {
      for (const [, other] of touches("pinch")) other.role = "ignored";
    }
  };

  return {
    handle(g) {
      if (g.kind === "start") onStart(g);
      else if (g.kind === "move") onMove(g);
      else onClose(g);
    },
    penSeen: () => seenPen,
  };
}
```

- [ ] **4. Vert.** La commande bornée → `Tests  14 passed (14)`.

- [ ] **5. Suite complète et commit.** `verifier.sh` sous le jeton → `verifier.sh : OK`. Puis :

```bash
cd "$WT" && git add apps/web/src/engine/input/router.ts && git add apps/web/src/engine/input/router.test.ts \
  && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
     -m "feat(engine): input router for pen, mouse, finger, palm and pinch (D18)" \
     -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t23"></a>
### Tâche T23 — Moteur : boucle d'image, écritures, annuler / rétablir, erreurs du cœur

**Objectif.** Relier routeur, outils, caméra, rendu et cœur sans DOM (DA2) : le moteur reçoit les gestes par `sink`
et les déplacements de vue par `view` (routeur, T20), confie chaque geste à l'outil choisi au début, fait tourner la
boucle d'image tant qu'un geste est actif ou que la scène est sale (frame des outils → scène si sale ou si l'ensemble
masqué change → couche vive), écrit par `run` (une commande = une étape), annule et rétablit (Ctrl+Z, Ctrl+Y,
Ctrl+Maj+Z, D11), défile et zoome à la molette (D17), ajuste la page au premier dimensionnement. Toute erreur du cœur
est attrapée et rendue dans l'état (`Err(LastPage)` levée côté JS au lot 2 : reprise de l'état « Fin de lot 2 »),
jamais levée. Les outils sont injectés (T21, T22 en parallèle) ; les tests utilisent de faux outils. Scénario : S2.

**Fichiers.** Créer `apps/web/src/engine/engine.ts`, `apps/web/src/engine/engine.test.ts`.

**Interfaces.**
- Consomme (T18) : `Camera`, `IDENTITY`, `fitPage`, `panBy`, `zoomAt` (`./camera`) ; `keyAction`, `KeyLike`,
  `KeyAction` (`./input/keys`) ; `DrawTool`, `GestureSink`, `ViewSink` (`./input/gesture`) ; `Renderer`
  (`./render/renderer`) ; `GestureTool`, `LivePart`, `ToolContext` (`./tools/tool`).
- Réutilise : `apps/web/src/proto/frame-loop.ts:17` — `createFrameLoop(deps: FrameLoopDeps, onFrame: (now: number) => void): FrameLoop`
  (`start`, `stop`, `durations`) ; `FrameLoopDeps { requestFrame; cancelFrame; now }`.
- Réutilise : `apps/web/src/core/api.ts` — `CoreDocument.apply(cmd): Change` (lève une `Error` au message lisible :
  « la dernière page ne se supprime pas », « points invalides »…), `undo(): Change`, `redo(): Change`, `canUndo()`,
  `canRedo()`, `version()`, `pageIds()`, `elementIds(page)` ; `core/fake-core.ts` `fakeCore.blank()` dans les tests.
- Produit :
  `interface EngineState { tool: DrawTool; eraserMode: EraseMode; canUndo: boolean; canRedo: boolean; page: string; elementCount: number; version: number; error: string | null }` ;
  `interface WheelInput { x: number; y: number; deltaX: number; deltaY: number; ctrlKey: boolean }` (px CSS relatifs à la zone) ;
  `interface ToolFactories { pen(ctx: ToolContext, style: () => StrokeStyle): GestureTool; eraser(ctx: ToolContext, mode: () => EraseMode): GestureTool }` ;
  `interface EngineDeps { doc: CoreDocument; renderer: Renderer; frames: FrameLoopDeps; tools: ToolFactories; penStyle?: StrokeStyle }` ;
  `interface Engine { sink: GestureSink; view: ViewSink; tool(): DrawTool; setTool(t: DrawTool): void; setEraserMode(m: EraseMode): void; run(cmd: Command): Change | null; undo(): void; redo(): void; key(e: KeyLike): boolean; wheel(e: WheelInput): void; resize(width: number, height: number, dpr: number): void; camera(): Camera; state(): EngineState; onState(cb: (s: EngineState) => void): () => void; onLiveDrawn(cb: (now: number) => void): () => void; frameDurations(): number[]; dispose(): void }` ;
  `DEFAULT_PEN_STYLE: StrokeStyle` (`#000000`, 4) ; `WHEEL_ZOOM_SPEED = 0.002` ;
  `createEngine(deps: EngineDeps): Engine`.

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/engine/engine.test.ts --reporter=verbose 2>&1 | tail -22`
→ `Tests  13 passed (13)`, nom `Err(LastPage) attrapé : run rend null, message dans l'état, rien ne lève` présent.
Puis `verifier.sh` (jeton) → `verifier.sh : OK` (`frame-loop.test.ts`, `fake-core.test.ts` restent verts).

**Preuve visuelle.** Aucune (S2 au navigateur à T24).

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de
`--force` ; aucun workflow GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun ici) ; tests par
`scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom
tests --proprietaire socle/T23 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"`
(commandes ciblées sous le même jeton) ; relecteurs au premier plan (`run_in_background: false`) ; commit d'auteur
`jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5
<noreply@anthropic.com>` ; aucun seuil baissé, aucun test désactivé, sauté ou affaibli ; dépôt public : aucun secret ;
worktree neuf : `pnpm install --frozen-lockfile` d'abord ; `apps/web/src/core/api.ts` figé ; rien n'est écrit avant le
relâché (D38) ; moteur sans framework ni global du DOM (le temps vient de `FrameLoopDeps`) ; aucun appel Tauri ;
TypeScript strict (`noUncheckedIndexedAccess`) : aucun `any`, aucun `!` sur un index, `as unknown as` réservé aux faux
objets des tests.

**Interdits.** Ne pas importer `tools/pen.ts`, `tools/eraser.ts`, `input/router.ts` ni `render/canvas2d.ts` (injectés
par `main.ts`, T24). Aucun `try/catch` autour d'autre chose que `doc.apply` (une erreur d'un abonné ou du rendu ne doit
pas passer pour une erreur du cœur). Ne pas modifier `proto/frame-loop.ts`.

**Terminé quand.** 13 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : appelé createFrameLoop,
CoreDocument.apply/undo/redo` (ou `écart — <pourquoi>`).

**Étapes.**

- [ ] **1. Écrire les tests (rouge).** `apps/web/src/engine/engine.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { Change, StrokeStyle } from "../core/api";
import { fakeCore } from "../core/fake-core";
import type { FrameLoopDeps } from "../proto/frame-loop";
import type { Camera } from "./camera";
import { createEngine, WHEEL_ZOOM_SPEED, type ToolFactories } from "./engine";
import type { CloseReason } from "./input/gesture";
import type { KeyLike } from "./input/keys";
import type { InputSample } from "./input/sampler";
import type { LiveLayer, PageView, Renderer } from "./render/renderer";
import type { GestureTool, ToolContext } from "./tools/tool";

class Frames implements FrameLoopDeps {
  private next = 1;
  private readonly queue = new Map<number, (ts: number) => void>();
  t = 0;
  requestFrame(cb: (ts: number) => void): number {
    const id = this.next++;
    this.queue.set(id, cb);
    return id;
  }
  cancelFrame(id: number): void {
    this.queue.delete(id);
  }
  now(): number {
    return this.t;
  }
  pending(): number {
    return this.queue.size;
  }
  tick(): void {
    this.t += 16;
    const cbs = [...this.queue.values()];
    this.queue.clear();
    for (const cb of cbs) cb(this.t);
  }
}

class FakeRenderer implements Renderer {
  readonly scenes: { page: PageView; camera: Camera; hidden: string[] }[] = [];
  readonly lives: LiveLayer[] = [];
  readonly sizes: number[][] = [];
  readonly changes: Change[] = [];
  drawScene(page: PageView, camera: Camera, hidden: ReadonlySet<string>): void {
    this.scenes.push({ page, camera, hidden: [...hidden] });
  }
  drawLive(live: LiveLayer): void {
    this.lives.push(live);
  }
  resize(width: number, height: number, dpr: number): void {
    this.sizes.push([width, height, dpr]);
  }
  invalidate(change: Change): void {
    this.changes.push(change);
  }
}

const PEN: StrokeStyle = { color: "#000000", width: 4 };
const sample: InputSample = { x: 1, y: 2, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 };

interface FakeTool extends GestureTool {
  hide(ids: string[]): void;
}

/** Faux outil : journalise ; le faux stylo écrit un trait au relâché "end" (comme T21). */
function fakeTool(name: "pen" | "eraser", log: string[], ctx: ToolContext): FakeTool {
  const active = new Set<number>();
  let hidden: ReadonlySet<string> = new Set<string>();
  return {
    hide(ids) {
      hidden = new Set(ids);
    },
    begin(id) {
      active.add(id);
      log.push(`${name}.begin ${id}`);
    },
    extend(id) {
      log.push(`${name}.extend ${id}`);
    },
    frame() {
      log.push(`${name}.frame`);
    },
    close(id: number, how: CloseReason) {
      active.delete(id);
      log.push(`${name}.close ${id} ${how}`);
      if (name === "pen" && how === "end") {
        ctx.run({ type: "CommitStroke", page: ctx.page(), points: new Float32Array([10, 10, 0.5, 20, 20, 0.5]), style: PEN });
      }
    },
    live: () => ({ strokes: [], erasers: [], hidden }),
    active: () => active.size > 0,
  };
}

function setup() {
  const doc = fakeCore.blank();
  const frames = new Frames();
  const renderer = new FakeRenderer();
  const log: string[] = [];
  const made = new Map<string, FakeTool>();
  const tools: ToolFactories = {
    pen: (ctx) => {
      const t = fakeTool("pen", log, ctx);
      made.set("pen", t);
      return t;
    },
    eraser: (ctx) => {
      const t = fakeTool("eraser", log, ctx);
      made.set("eraser", t);
      return t;
    },
  };
  const engine = createEngine({ doc, renderer, frames, tools });
  const tool = (n: string): FakeTool => {
    const t = made.get(n);
    if (!t) throw new Error(`outil absent : ${n}`);
    return t;
  };
  return { doc, frames, renderer, log, engine, tool };
}

const key = (k: string, mods: Partial<Omit<KeyLike, "key">> = {}): KeyLike => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  isComposing: false,
  target: null,
  ...mods,
});

describe("createEngine", () => {
  it("démarre sur la première page : rien à annuler, aucune erreur, outil stylo", () => {
    const { doc, engine } = setup();
    expect(engine.state()).toMatchObject({
      tool: "pen",
      eraserMode: "partial",
      canUndo: false,
      canRedo: false,
      elementCount: 0,
      error: null,
    });
    expect(engine.state().page).toBe(doc.pageIds()[0]);
  });

  it("resize : rendu redimensionné, caméra ajustée à la page une seule fois", () => {
    const { engine, renderer } = setup();
    engine.resize(1280, 720, 2);
    const fitted = engine.camera();
    expect(fitted.zoom).toBeCloseTo((1280 / 1920) * 0.95);
    engine.view.panBy(10, 0);
    engine.resize(1000, 700, 2);
    expect(engine.camera().tx).toBeCloseTo(fitted.tx + 10);
    expect(renderer.sizes).toEqual([
      [1280, 720, 2],
      [1000, 700, 2],
    ]);
  });

  it("sink : le geste va à l'outil demandé par le routeur, la boucle d'image démarre", () => {
    const { engine, log, frames } = setup();
    engine.sink.begin(1, "eraser", [sample]);
    engine.sink.extend(1, [sample], []);
    expect(log).toEqual(["eraser.begin 1", "eraser.extend 1"]);
    expect(frames.pending()).toBe(1);
  });

  it("une image : frame des outils, scène si sale, couche vive, onLiveDrawn", () => {
    const { engine, renderer, frames, log } = setup();
    const drawn: number[] = [];
    engine.onLiveDrawn((now) => drawn.push(now));
    engine.sink.begin(1, "pen", [sample]);
    frames.tick();
    expect(log).toEqual(["pen.begin 1", "pen.frame", "eraser.frame"]);
    expect(renderer.scenes).toHaveLength(1);
    expect(renderer.lives).toHaveLength(1);
    expect(drawn).toEqual([16]);
    frames.tick();
    expect(renderer.scenes).toHaveLength(1);
    expect(renderer.lives).toHaveLength(2);
  });

  it("fin du geste : une écriture, scène redessinée avec l'élément, état émis, boucle arrêtée", () => {
    const { engine, renderer, frames } = setup();
    const states: boolean[] = [];
    engine.onState((s) => states.push(s.canUndo));
    engine.sink.begin(1, "pen", [sample]);
    frames.tick();
    engine.sink.close(1, "end");
    expect(states).toEqual([true]);
    expect(engine.state().elementCount).toBe(1);
    expect(renderer.changes).toHaveLength(1);
    frames.tick();
    expect(renderer.scenes.at(-1)?.page.elementIds).toHaveLength(1);
    expect(frames.pending()).toBe(0);
  });

  it("Err(LastPage) attrapé : run rend null, message dans l'état, rien ne lève", () => {
    const { engine } = setup();
    const errors: (string | null)[] = [];
    engine.onState((s) => errors.push(s.error));
    let result: Change | null | undefined;
    expect(() => {
      result = engine.run({ type: "RemovePage", page: engine.state().page });
    }).not.toThrow();
    expect(result).toBeNull();
    expect(errors).toEqual(["la dernière page ne se supprime pas"]);
    expect(engine.state().error).toBe("la dernière page ne se supprime pas");
  });

  it("l'erreur s'efface à la commande réussie suivante", () => {
    const { engine } = setup();
    engine.run({ type: "RemovePage", page: engine.state().page });
    const ok = engine.run({ type: "CommitStroke", page: engine.state().page, points: new Float32Array([1, 1, 0.5]), style: PEN });
    expect(ok?.ids).toHaveLength(1);
    expect(engine.state().error).toBeNull();
  });

  it("Ctrl+Z annule, Ctrl+Y et Ctrl+Maj+Z rétablissent ; invalidation complète", () => {
    const { engine, renderer } = setup();
    engine.sink.begin(1, "pen", [sample]);
    engine.sink.close(1, "end");
    expect(engine.key(key("z", { ctrlKey: true }))).toBe(true);
    expect(engine.state()).toMatchObject({ elementCount: 0, canUndo: false, canRedo: true });
    expect(renderer.changes.at(-1)?.full).toBe(true);
    expect(engine.key(key("y", { ctrlKey: true }))).toBe(true);
    expect(engine.state().elementCount).toBe(1);
    engine.key(key("z", { ctrlKey: true }));
    expect(engine.key(key("Z", { ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(engine.state().elementCount).toBe(1);
    expect(engine.key(key("a", { ctrlKey: true }))).toBe(false);
  });

  it("Ctrl+Z sur un document neuf : rien, aucune erreur, la page initiale reste (D37)", () => {
    const { engine, doc } = setup();
    expect(engine.key(key("z", { ctrlKey: true }))).toBe(true);
    expect(doc.pageIds()).toHaveLength(1);
    expect(engine.state().error).toBeNull();
  });

  it("molette : défilement ; Ctrl+molette : zoom autour du pointeur", () => {
    const { engine } = setup();
    engine.wheel({ x: 0, y: 0, deltaX: 10, deltaY: 100, ctrlKey: false });
    expect(engine.camera()).toEqual({ zoom: 1, tx: -10, ty: -100 });
    engine.wheel({ x: 50, y: 50, deltaX: 0, deltaY: -100, ctrlKey: true });
    expect(engine.camera().zoom).toBeCloseTo(Math.exp(100 * WHEEL_ZOOM_SPEED));
  });

  it("masquage d'aperçu : la scène est redessinée quand l'ensemble masqué change", () => {
    const { engine, renderer, frames, tool } = setup();
    engine.sink.begin(1, "eraser", [sample]);
    frames.tick();
    tool("eraser").hide(["x"]);
    frames.tick();
    expect(renderer.scenes.map((s) => s.hidden)).toEqual([[], ["x"]]);
    frames.tick();
    expect(renderer.scenes).toHaveLength(2);
  });

  it("view : pincement et défilement déplacent la caméra et redessinent la scène", () => {
    const { engine, renderer, frames } = setup();
    engine.view.zoomAt(0, 0, 2);
    engine.view.panBy(5, 5);
    frames.tick();
    expect(engine.camera()).toEqual({ zoom: 2, tx: 5, ty: 5 });
    expect(renderer.scenes.at(-1)?.camera).toEqual({ zoom: 2, tx: 5, ty: 5 });
    expect(frames.pending()).toBe(0);
  });

  it("dispose : les gestes en cours sont fermés sans écriture (abort), la boucle s'arrête", () => {
    const { engine, log, frames } = setup();
    engine.sink.begin(1, "pen", [sample]);
    engine.dispose();
    expect(log).toContain("pen.close 1 abort");
    expect(frames.pending()).toBe(0);
  });
});
```

- [ ] **2. Lancer, constater l'échec** (`Failed to resolve import "./engine"`).

- [ ] **3. `apps/web/src/engine/engine.ts` :**

```ts
/**
 * Moteur d'interaction (DA2) : relie le routeur (par `sink` et `view`), les outils, la caméra, le rendu et le cœur.
 * Sans framework ni DOM : la page (main.ts) branche les événements et injecte outils et rendu. Une écriture par geste,
 * au relâché (D38) ; toute erreur du cœur (dernière page, points invalides…) est attrapée et rendue dans l'état.
 */
import type { Change, Command, CoreDocument, EraseMode, StrokeStyle } from "../core/api";
import { createFrameLoop, type FrameLoopDeps } from "../proto/frame-loop";
import { fitPage, IDENTITY, panBy as panCamera, zoomAt as zoomCamera, type Camera } from "./camera";
import type { DrawTool, GestureSink, ViewSink } from "./input/gesture";
import { keyAction, type KeyAction, type KeyLike } from "./input/keys";
import type { Renderer } from "./render/renderer";
import type { GestureTool, LivePart, ToolContext } from "./tools/tool";

export interface EngineState {
  readonly tool: DrawTool;
  readonly eraserMode: EraseMode;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly page: string;
  readonly elementCount: number;
  readonly version: number;
  /** Dernier refus du cœur (message lisible), effacé à la commande réussie suivante. */
  readonly error: string | null;
}

/** Molette en px CSS relatifs à la zone de dessin (deltas déjà ramenés en px par la page). */
export interface WheelInput {
  readonly x: number;
  readonly y: number;
  readonly deltaX: number;
  readonly deltaY: number;
  readonly ctrlKey: boolean;
}

export interface ToolFactories {
  pen(ctx: ToolContext, style: () => StrokeStyle): GestureTool;
  eraser(ctx: ToolContext, mode: () => EraseMode): GestureTool;
}

export interface EngineDeps {
  readonly doc: CoreDocument;
  readonly renderer: Renderer;
  readonly frames: FrameLoopDeps;
  readonly tools: ToolFactories;
  readonly penStyle?: StrokeStyle;
}

export interface Engine {
  readonly sink: GestureSink;
  readonly view: ViewSink;
  tool(): DrawTool;
  setTool(t: DrawTool): void;
  setEraserMode(m: EraseMode): void;
  run(cmd: Command): Change | null;
  undo(): void;
  redo(): void;
  /** Vrai si la touche est un raccourci reconnu et exécuté : la page appelle alors preventDefault. */
  key(e: KeyLike): boolean;
  wheel(e: WheelInput): void;
  resize(width: number, height: number, dpr: number): void;
  camera(): Camera;
  state(): EngineState;
  onState(cb: (s: EngineState) => void): () => void;
  onLiveDrawn(cb: (now: number) => void): () => void;
  frameDurations(): number[];
  dispose(): void;
}

/** Stylo par défaut (H1-8, HL3-3). */
export const DEFAULT_PEN_STYLE: StrokeStyle = { color: "#000000", width: 4 };
/** Ctrl+molette : facteur exp(-deltaY × vitesse) (HL3-6). */
export const WHEEL_ZOOM_SPEED = 0.002;

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean =>
  a.size === b.size && [...a].every((x) => b.has(x));

export function createEngine(deps: EngineDeps): Engine {
  const { doc, renderer } = deps;
  const first = doc.pageIds()[0];
  if (first === undefined) throw new Error("document sans page");
  const pageId: string = first;
  const style = deps.penStyle ?? DEFAULT_PEN_STYLE;
  let camera: Camera = IDENTITY;
  let fitted = false;
  let tool: DrawTool = "pen";
  let eraserMode: EraseMode = "partial";
  let error: string | null = null;
  let sceneDirty = true;
  let lastHidden: ReadonlySet<string> = new Set<string>();
  const stateListeners = new Set<(s: EngineState) => void>();
  const drawnListeners = new Set<(now: number) => void>();
  const owner = new Map<number, GestureTool>();

  function state(): EngineState {
    return {
      tool,
      eraserMode,
      canUndo: doc.canUndo(),
      canRedo: doc.canRedo(),
      page: pageId,
      elementCount: doc.elementIds(pageId).length,
      version: doc.version(),
      error,
    };
  }

  function emit(): void {
    const s = state();
    for (const cb of stateListeners) cb(s);
  }

  function requestScene(): void {
    sceneDirty = true;
    loop.start();
  }

  function run(cmd: Command): Change | null {
    let change: Change;
    try {
      change = doc.apply(cmd);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      emit();
      return null;
    }
    renderer.invalidate(change);
    error = null;
    requestScene();
    emit();
    return change;
  }

  function history(which: KeyAction): void {
    const change = which === "undo" ? doc.undo() : doc.redo();
    renderer.invalidate(change);
    error = null;
    requestScene();
    emit();
  }

  const ctx: ToolContext = { doc, page: () => pageId, camera: () => camera, run };
  const tools: Record<DrawTool, GestureTool> = {
    pen: deps.tools.pen(ctx, () => style),
    eraser: deps.tools.eraser(ctx, () => eraserMode),
  };
  const toolList: readonly GestureTool[] = [tools.pen, tools.eraser];

  function frame(now: number): void {
    for (const t of toolList) t.frame();
    const parts: LivePart[] = toolList.map((t) => t.live());
    const hidden = new Set<string>();
    for (const p of parts) for (const id of p.hidden) hidden.add(id);
    if (sceneDirty || !sameSet(hidden, lastHidden)) {
      renderer.drawScene({ id: pageId, elementIds: doc.elementIds(pageId) }, camera, hidden);
      sceneDirty = false;
      lastHidden = hidden;
    }
    renderer.drawLive({ strokes: parts.flatMap((p) => p.strokes), erasers: parts.flatMap((p) => p.erasers) }, camera);
    for (const cb of drawnListeners) cb(now);
    if (!toolList.some((t) => t.active())) loop.stop();
  }

  const loop = createFrameLoop(deps.frames, frame);

  const sink: GestureSink = {
    begin(pointerId, t, samples) {
      const g = tools[t];
      owner.set(pointerId, g);
      g.begin(pointerId, samples);
      loop.start();
    },
    extend(pointerId, samples, predicted) {
      owner.get(pointerId)?.extend(pointerId, samples, predicted);
    },
    close(pointerId, how) {
      const g = owner.get(pointerId);
      if (!g) return;
      owner.delete(pointerId);
      g.close(pointerId, how);
      loop.start(); // une image de plus : couche vive effacée, aperçu retiré
    },
  };

  const view: ViewSink = {
    panBy(dx, dy) {
      camera = panCamera(camera, dx, dy);
      requestScene();
    },
    zoomAt(x, y, factor) {
      camera = zoomCamera(camera, x, y, factor);
      requestScene();
    },
  };

  return {
    sink,
    view,
    tool: () => tool,
    setTool(t) {
      tool = t;
      emit();
    },
    setEraserMode(m) {
      eraserMode = m;
      emit();
    },
    run,
    undo: () => history("undo"),
    redo: () => history("redo"),
    key(e) {
      const action = keyAction(e);
      if (action === null) return false;
      history(action);
      return true;
    },
    wheel(e) {
      if (e.ctrlKey) view.zoomAt(e.x, e.y, Math.exp(-e.deltaY * WHEEL_ZOOM_SPEED));
      else view.panBy(-e.deltaX, -e.deltaY);
    },
    resize(width, height, dpr) {
      renderer.resize(width, height, dpr);
      if (!fitted && width > 0 && height > 0) {
        camera = fitPage(width, height);
        fitted = true;
      }
      requestScene();
    },
    camera: () => camera,
    state,
    onState(cb) {
      stateListeners.add(cb);
      return () => {
        stateListeners.delete(cb);
      };
    },
    onLiveDrawn(cb) {
      drawnListeners.add(cb);
      return () => {
        drawnListeners.delete(cb);
      };
    },
    frameDurations: () => loop.durations(),
    dispose() {
      for (const [id, g] of owner) g.close(id, "abort");
      owner.clear();
      loop.stop();
      stateListeners.clear();
      drawnListeners.clear();
    },
  };
}
```

- [ ] **4. Vert.** La commande bornée → `Tests  13 passed (13)`.

- [ ] **5. Suite complète et commit.** `verifier.sh` sous le jeton → `verifier.sh : OK`. Puis :

```bash
cd "$WT" && git add apps/web/src/engine/engine.ts && git add apps/web/src/engine/engine.test.ts \
  && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
     -m "feat(engine): frame loop, single-step writes, undo/redo shortcuts and core errors caught" \
     -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t21"></a>
### Tâche T21 — Stylo : encre vive D20, pression D8, écriture au relâché

**Objectif.** L'outil stylo de l'essai du 19 : les échantillons du geste (px écran) sont ramenés en coordonnées monde
par la caméra, accumulés, poussés **une fois par image** au `StrokeBuilder` du cœur (D20, DA5 : un passage Wasm par
image) dont le contour est dessiné sur le canvas d'interaction ; les points prédits forment une queue provisoire,
jamais enregistrée, effacée sur une image sans point nouveau. Au relâché, une seule `CommitStroke` (D38). Fin anormale
(`cancel`, D39) : l'encre reçue est gardée ; `abort` (second doigt, paume) : rien d'écrit. Pression : suivie dès
qu'elle varie, sinon 0,5 (D8, HL3-4). Scénario : S2 (traits tracés à la souris) et l'essai du 19 (stylet).

**Fichiers.** Créer `apps/web/src/engine/tools/pen.ts`, `apps/web/src/engine/tools/pen.test.ts`.

**Interfaces.**
- Consomme (T18) : `GestureTool`, `LivePart`, `ToolContext` (`./tool`) ; `screenToWorld` (`../camera`) ;
  `LiveStrokeView` (`../render/renderer`) ; `CloseReason` (`../input/gesture`).
- Réutilise : `apps/web/src/core/api.ts` — `CoreDocument.newStrokeBuilder(style: StrokeStyle): StrokeBuilderApi`
  (`push(points: Float32Array): Float32Array` = contour courant, polygones x, y monde séparés par NaN ; `free()`),
  commande `CommitStroke { page, points: Float32Array /* triplets x, y, pression monde */, style }`.
- Réutilise : `apps/web/src/engine/input/sampler.ts` — `InputSample` (la souris et le doigt arrivent déjà à 0,5, D8).
- Réutilise (tests) : `apps/web/src/core/fake-core.ts` — `fakeCore.blank()`.
- Produit : `createPenTool(ctx: ToolContext, style: () => StrokeStyle): GestureTool` (signature de
  `ToolFactories.pen`, T23).

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/engine/tools/pen.test.ts --reporter=verbose 2>&1 | tail -20`
→ `Tests  10 passed (10)`, noms `pointercancel (cancel) garde l'encre reçue (D39)` et `stylet qui ne rend que 0 ou
0,5 : pression constante 0,5 (D8)` présents. Puis `verifier.sh` (jeton) → `verifier.sh : OK`.

**Preuve visuelle.** Aucune dans cette tâche (S2 à T24).

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de
`--force` ; aucun workflow GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun ici) ; tests par
`scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom
tests --proprietaire socle/T21 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"`
(commandes ciblées sous le même jeton) ; relecteurs au premier plan (`run_in_background: false`) ; commit d'auteur
`jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5
<noreply@anthropic.com>` ; aucun seuil baissé, aucun test désactivé, sauté ou affaibli ; dépôt public : aucun secret ;
worktree neuf : `pnpm install --frozen-lockfile` d'abord ; `apps/web/src/core/api.ts` figé ; rien n'est écrit avant le
relâché (D38) ; moteur sans framework ni global du DOM ; le chemin de l'encre reste dans la page (Wasm), aucun appel
Tauri ; TypeScript strict (`noUncheckedIndexedAccess`) : aucun `any`, aucun `!` sur un index.

**Interdits.** Aucun calcul de contour en TS (DA7 : une seule géométrie, dans le cœur). Aucun appel à `ctx.run`
avant `close`. Ne pas enregistrer les points prédits. Ne pas appeler `push` plus d'une fois par image et par trait.

**Terminé quand.** 10 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : appelé
CoreDocument.newStrokeBuilder, CommitStroke` (ou `écart — <pourquoi>`).

**Étapes.**

- [ ] **1. Écrire les tests (rouge).** `apps/web/src/engine/tools/pen.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { Command, StrokeBuilderApi, StrokeStyle } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import type { Camera } from "../camera";
import type { InputSample } from "../input/sampler";
import { createPenTool } from "./pen";
import type { ToolContext } from "./tool";

const s = (x: number, y: number, pressure = 0.5): InputSample => ({ x, y, pressure, tiltX: 0, tiltY: 0, t: 0 });
const PEN: StrokeStyle = { color: "#000000", width: 4 };

function setup(cam: Camera = { zoom: 1, tx: 0, ty: 0 }, refuse = false) {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  const runs: Command[] = [];
  const builders = { created: 0, pushes: 0, freed: 0 };
  const original = doc.newStrokeBuilder.bind(doc);
  doc.newStrokeBuilder = (st: StrokeStyle): StrokeBuilderApi => {
    builders.created++;
    const b = original(st);
    return {
      push: (p) => {
        builders.pushes++;
        return b.push(p);
      },
      finish: () => b.finish(),
      free: () => {
        builders.freed++;
        b.free();
      },
    };
  };
  let style = PEN;
  const ctx: ToolContext = {
    doc,
    page: () => page,
    camera: () => cam,
    run: (c) => {
      runs.push(c);
      return refuse ? null : doc.apply(c);
    },
  };
  const tool = createPenTool(ctx, () => style);
  return { doc, page, runs, builders, tool, setStyle: (st: StrokeStyle) => { style = st; } };
}

function commitOf(runs: Command[]): Extract<Command, { type: "CommitStroke" }> {
  const c = runs[0];
  if (c?.type !== "CommitStroke") throw new Error("CommitStroke attendue");
  return c;
}

describe("createPenTool (D20, D38)", () => {
  it("rien n'est écrit avant le relâché (D38)", () => {
    const { doc, runs, tool } = setup();
    tool.begin(1, [s(10, 10)]);
    tool.extend(1, [s(20, 10), s(30, 10)], []);
    tool.frame();
    expect(runs).toEqual([]);
    expect(doc.version()).toBe(0);
    expect(tool.active()).toBe(true);
    expect(tool.live().strokes).toHaveLength(1);
    expect(tool.live().strokes[0]?.outline.length).toBeGreaterThan(0);
  });

  it("relâché : une CommitStroke en coordonnées monde, triplets x, y, pression", () => {
    const { doc, page, runs, tool } = setup({ zoom: 2, tx: 10, ty: 20 });
    tool.begin(1, [s(30, 60, 0.4)]);
    tool.extend(1, [s(50, 60, 0.6)], []);
    tool.close(1, "end");
    expect(runs).toHaveLength(1);
    const c = commitOf(runs);
    expect(c.page).toBe(page);
    expect(Array.from(c.points)).toEqual([10, 20, 0.4, 20, 20, 0.6].map((v) => Math.fround(v)));
    expect(c.style).toEqual(PEN);
    expect(doc.elementIds(page)).toHaveLength(1);
    expect(tool.active()).toBe(false);
  });

  it("un push du builder par image, seulement s'il y a des points nouveaux", () => {
    const { builders, tool } = setup();
    tool.begin(1, [s(0, 0)]);
    tool.extend(1, [s(5, 0)], []);
    tool.extend(1, [s(9, 0)], []);
    tool.frame();
    tool.frame();
    expect(builders.pushes).toBe(1);
  });

  it("pointercancel (cancel) garde l'encre reçue (D39)", () => {
    const { runs, builders, tool } = setup();
    tool.begin(1, [s(0, 0)]);
    tool.extend(1, [s(5, 0)], []);
    tool.close(1, "cancel");
    expect(commitOf(runs).points.length).toBe(6);
    expect(builders.freed).toBe(1);
  });

  it("abort (second doigt, paume) : rien d'écrit, builder libéré", () => {
    const { doc, runs, builders, tool } = setup();
    tool.begin(1, [s(0, 0)]);
    tool.extend(1, [s(5, 0)], []);
    tool.frame();
    tool.close(1, "abort");
    expect(runs).toEqual([]);
    expect(doc.version()).toBe(0);
    expect([builders.created, builders.freed]).toEqual([1, 1]);
    expect(tool.live().strokes).toHaveLength(0);
  });

  it("queue prédite : du dernier point reçu aux prédits, effacée sur une image sans point nouveau", () => {
    const { tool } = setup();
    tool.begin(1, [s(0, 0)]);
    tool.extend(1, [s(10, 0)], [s(14, 0), s(18, 0)]);
    tool.frame();
    expect(Array.from(tool.live().strokes[0]?.predicted ?? [])).toEqual([10, 0, 14, 0, 18, 0]);
    tool.frame();
    expect(tool.live().strokes[0]?.predicted.length).toBe(0);
  });

  it("échantillon non fini ignoré : aucune erreur « points invalides »", () => {
    const { doc, page, runs, tool } = setup();
    tool.begin(1, [s(0, 0)]);
    tool.extend(1, [s(Number.NaN, 5), s(10, Number.POSITIVE_INFINITY), s(10, 10)], []);
    tool.close(1, "end");
    const c = commitOf(runs);
    expect(c.points.length).toBe(6);
    expect(c.points.every((v) => Number.isFinite(v))).toBe(true);
    expect(doc.elementIds(page)).toHaveLength(1);
  });

  it("stylet qui ne rend que 0 ou 0,5 : pression constante 0,5 (D8)", () => {
    const { runs, tool } = setup();
    tool.begin(1, [s(0, 0, 0)]);
    tool.extend(1, [s(5, 0, 0), s(9, 0, 0.5)], []);
    tool.close(1, "end");
    const c = commitOf(runs);
    expect([c.points[2], c.points[5], c.points[8]]).toEqual([0.5, 0.5, 0.5]);
  });

  it("deux pointeurs : deux traits indépendants ; le style est figé au début du geste", () => {
    const { runs, tool, setStyle } = setup();
    tool.begin(1, [s(0, 0)]);
    setStyle({ color: "#dc2626", width: 8 });
    tool.begin(2, [s(100, 100)]);
    tool.extend(1, [s(5, 0)], []);
    tool.extend(2, [s(105, 100)], []);
    tool.frame();
    expect(tool.live().strokes).toHaveLength(2);
    tool.close(2, "end");
    tool.close(1, "end");
    expect(runs.map((c) => (c.type === "CommitStroke" ? c.style.color : c.type))).toEqual(["#dc2626", "#000000"]);
  });

  it("écriture refusée par le cœur (run rend null) : aucune exception, geste fermé", () => {
    const { tool } = setup(undefined, true);
    tool.begin(1, [s(0, 0)]);
    expect(() => tool.close(1, "end")).not.toThrow();
    expect(tool.active()).toBe(false);
  });
});
```

- [ ] **2. Lancer, constater l'échec** (`Failed to resolve import "./pen"`).

- [ ] **3. `apps/web/src/engine/tools/pen.ts` :**

```ts
/**
 * Stylo (D20, D38) : encre vive par le StrokeBuilder du cœur (un push par image), queue prédite provisoire, une seule
 * CommitStroke au relâché. "cancel" (fin anormale, D39) garde l'encre reçue ; "abort" (second doigt, paume) n'écrit rien.
 * Pression (D8, HL3-4) : 0,5 tant qu'aucune valeur hors de {0 ; 0,5} n'a été vue, suivie ensuite.
 */
import type { StrokeBuilderApi, StrokeStyle } from "../../core/api";
import { screenToWorld } from "../camera";
import type { CloseReason } from "../input/gesture";
import type { InputSample } from "../input/sampler";
import type { LiveStrokeView } from "../render/renderer";
import type { GestureTool, LivePart, ToolContext } from "./tool";

interface LiveStroke {
  readonly page: string;
  readonly style: StrokeStyle;
  readonly builder: StrokeBuilderApi;
  /** Triplets x, y, pression monde de tout le trait (envoyés au relâché). */
  readonly all: number[];
  /** Triplets reçus depuis la dernière image. */
  pending: number[];
  outline: Float32Array;
  predicted: Float32Array;
}

const EMPTY = new Float32Array(0);
const NONE: ReadonlySet<string> = new Set<string>();

export function createPenTool(ctx: ToolContext, style: () => StrokeStyle): GestureTool {
  const strokes = new Map<number, LiveStroke>();
  let pressureVaries = false;

  const pressureFor = (raw: number): number => {
    const p = Math.min(1, Math.max(0, raw));
    if (pressureVaries) return p;
    if (p !== 0 && p !== 0.5) {
      pressureVaries = true;
      return p;
    }
    return 0.5;
  };

  const add = (l: LiveStroke, samples: readonly InputSample[]): void => {
    const cam = ctx.camera();
    for (const s of samples) {
      if (!Number.isFinite(s.x) || !Number.isFinite(s.y) || !Number.isFinite(s.pressure)) continue;
      const [x, y] = screenToWorld(cam, s.x, s.y);
      const p = pressureFor(s.pressure);
      l.pending.push(x, y, p);
      l.all.push(x, y, p);
    }
  };

  const flush = (l: LiveStroke): void => {
    if (l.pending.length === 0) return;
    l.outline = l.builder.push(new Float32Array(l.pending));
    l.pending = [];
  };

  const tail = (l: LiveStroke, predicted: readonly InputSample[]): Float32Array => {
    const n = l.all.length;
    if (predicted.length === 0 || n < 3) return EMPTY;
    const cam = ctx.camera();
    const out: number[] = [l.all[n - 3] ?? 0, l.all[n - 2] ?? 0];
    for (const s of predicted) {
      if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
      const [x, y] = screenToWorld(cam, s.x, s.y);
      out.push(x, y);
    }
    return out.length >= 4 ? new Float32Array(out) : EMPTY;
  };

  return {
    begin(pointerId, samples) {
      const st = style();
      const l: LiveStroke = {
        page: ctx.page(),
        style: st,
        builder: ctx.doc.newStrokeBuilder(st),
        all: [],
        pending: [],
        outline: EMPTY,
        predicted: EMPTY,
      };
      strokes.set(pointerId, l);
      add(l, samples);
    },
    extend(pointerId, samples, predicted) {
      const l = strokes.get(pointerId);
      if (!l) return;
      add(l, samples);
      l.predicted = tail(l, predicted);
    },
    frame() {
      for (const l of strokes.values()) {
        // Queue prédite seulement sur une image qui reçoit des points : stylet arrêté, elle s'efface (lot 1).
        if (l.pending.length === 0) l.predicted = EMPTY;
        else flush(l);
      }
    },
    close(pointerId: number, how: CloseReason) {
      const l = strokes.get(pointerId);
      if (!l) return;
      strokes.delete(pointerId);
      l.builder.free();
      if (how === "abort" || l.all.length < 3) return;
      ctx.run({ type: "CommitStroke", page: l.page, points: new Float32Array(l.all), style: l.style });
    },
    live(): LivePart {
      const views: LiveStrokeView[] = [];
      for (const l of strokes.values()) {
        views.push({ outline: l.outline, predicted: l.predicted, color: l.style.color, width: l.style.width });
      }
      return { strokes: views, erasers: [], hidden: NONE };
    },
    active: () => strokes.size > 0,
  };
}
```

- [ ] **4. Vert.** La commande bornée → `Tests  10 passed (10)`.

- [ ] **5. Suite complète et commit.** `verifier.sh` sous le jeton → `verifier.sh : OK`. Puis :

```bash
cd "$WT" && git add apps/web/src/engine/tools/pen.ts && git add apps/web/src/engine/tools/pen.test.ts \
  && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
     -m "feat(engine): pen tool with live ink, predicted tail and single commit on release" \
     -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t22"></a>
### Tâche T22 — Gomme partielle et d'objet avec aperçus D38

**Objectif.** La gomme de l'essai du 19 : le chemin du geste (px écran → monde par la caméra) s'accumule sans rien
écrire ; une seule commande `Erase { page, path, radius, mode }` au relâché (D12, D38). Gomme partielle : l'aperçu est
peint par le rendu (`EraserPreview`, T19). Gomme d'objet : à chaque image, `hitTestPath` (lecture seule) sur les seuls
points nouveaux et le point de jonction, et les traits touchés sont masqués de la scène (`hidden`). Fin anormale
(`cancel`) ou `abort` : annulé sans écriture (D39). Rayon : 12 px à l'écran, converti en monde au début du geste
(HL3-1). Scénario : S2 (gomme en travers du deuxième trait).

**Fichiers.** Créer `apps/web/src/engine/tools/eraser.ts`, `apps/web/src/engine/tools/eraser.test.ts`.

**Interfaces.**
- Consomme (T18) : `GestureTool`, `LivePart`, `ToolContext` (`./tool`) ; `screenToWorld` (`../camera`) ;
  `EraserPreview` (`../render/renderer`) ; `CloseReason` (`../input/gesture`).
- Réutilise : `apps/web/src/core/api.ts` — `CoreDocument.hitTestPath(page: string, path: Float32Array, radius: number): string[]`
  (lecture sans écriture ; après T17, contours en cache dans le cœur), commande
  `Erase { page; path: Float32Array /* paires x, y monde */; radius; mode: EraseMode }`.
- Réutilise (tests) : `apps/web/src/core/fake-core.ts` — `fakeCore.blank()` (sa gomme partielle retire le trait
  entier : écart assumé du lot 2, sans effet sur ces tests).
- Produit : `ERASER_RADIUS_PX = 12` ;
  `createEraserTool(ctx: ToolContext, mode: () => EraseMode, radiusPx?: number): GestureTool` (signature compatible
  avec `ToolFactories.eraser`, T23).

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/engine/tools/eraser.test.ts --reporter=verbose 2>&1 | tail -18`
→ `Tests  7 passed (7)`, nom `cancel ou abort : annulé sans écriture (D39), aperçu retiré` présent. Puis `verifier.sh`
(jeton) → `verifier.sh : OK`.

**Preuve visuelle.** Aucune dans cette tâche (S2 à T24).

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de
`--force` ; aucun workflow GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun ici) ; tests par
`scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom
tests --proprietaire socle/T22 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"`
(commandes ciblées sous le même jeton) ; relecteurs au premier plan (`run_in_background: false`) ; commit d'auteur
`jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5
<noreply@anthropic.com>` ; aucun seuil baissé, aucun test désactivé, sauté ou affaibli ; dépôt public : aucun secret ;
worktree neuf : `pnpm install --frozen-lockfile` d'abord ; `apps/web/src/core/api.ts` figé ; rien n'est écrit avant le
relâché (D38) ; moteur sans framework ni global du DOM ; TypeScript strict (`noUncheckedIndexedAccess`) : aucun `any`,
aucun `!` sur un index.

**Interdits.** Aucune écriture avant `close(…, "end")`. Aucun calcul de collision en TS (le cœur décide). Ne pas
rejouer tout le chemin dans `hitTestPath` à chaque image (seulement le segment nouveau, jonction comprise).

**Terminé quand.** 7 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : appelé CoreDocument.hitTestPath,
Erase` (ou `écart — <pourquoi>`).

**Étapes.**

- [ ] **1. Écrire les tests (rouge).** `apps/web/src/engine/tools/eraser.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { Command, EraseMode, StrokeStyle } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import { IDENTITY, type Camera } from "../camera";
import type { InputSample } from "../input/sampler";
import { createEraserTool, ERASER_RADIUS_PX } from "./eraser";
import type { ToolContext } from "./tool";

const s = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });
const PEN: StrokeStyle = { color: "#000000", width: 4 };
const hline = (y: number): Float32Array => {
  const a: number[] = [];
  for (let i = 0; i <= 40; i++) a.push(100 + i * 10, y, 0.5);
  return new Float32Array(a);
};

function setup(mode: EraseMode = "partial", cam: Camera = IDENTITY) {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  const target = doc.apply({ type: "CommitStroke", page, points: hline(100), style: PEN }).ids[0] ?? "";
  const runs: Command[] = [];
  const probes: number[] = [];
  const original = doc.hitTestPath.bind(doc);
  doc.hitTestPath = (p: string, path: Float32Array, r: number): string[] => {
    probes.push(path.length);
    return original(p, path, r);
  };
  let current = mode;
  const ctx: ToolContext = {
    doc,
    page: () => page,
    camera: () => cam,
    run: (c) => {
      runs.push(c);
      return doc.apply(c);
    },
  };
  const tool = createEraserTool(ctx, () => current);
  return { doc, page, target, runs, probes, tool, setMode: (m: EraseMode) => { current = m; } };
}

function eraseOf(runs: Command[]): Extract<Command, { type: "Erase" }> {
  const c = runs[0];
  if (c?.type !== "Erase") throw new Error("Erase attendue");
  return c;
}

describe("createEraserTool (D12, D38)", () => {
  it("gomme partielle : rien d'écrit pendant le geste, une seule Erase au relâché", () => {
    const { doc, page, runs, tool } = setup();
    const v = doc.version();
    tool.begin(1, [s(300, 80)]);
    tool.extend(1, [s(300, 100), s(300, 120)], []);
    tool.frame();
    expect(doc.version()).toBe(v);
    expect(tool.live().erasers).toHaveLength(1);
    expect(tool.live().erasers[0]?.mode).toBe("partial");
    expect(tool.live().hidden.size).toBe(0);
    tool.close(1, "end");
    expect(runs).toEqual([
      { type: "Erase", page, path: new Float32Array([300, 80, 300, 100, 300, 120]), radius: ERASER_RADIUS_PX, mode: "partial" },
    ]);
    expect(doc.version()).toBe(v + 1);
  });

  it("rayon constant à l'écran : 12 px divisés par le zoom ; un appui seul gomme aussi", () => {
    const { runs, tool } = setup("partial", { zoom: 2, tx: 0, ty: 0 });
    tool.begin(1, [s(600, 200)]);
    tool.close(1, "end");
    const c = eraseOf(runs);
    expect(c.radius).toBe(6);
    expect(Array.from(c.path)).toEqual([300, 100]);
  });

  it("gomme d'objet : traits touchés masqués à chaque image, sans écriture", () => {
    const { doc, target, tool } = setup("object");
    const v = doc.version();
    tool.begin(1, [s(300, 80)]);
    tool.extend(1, [s(300, 120)], []);
    tool.frame();
    expect([...tool.live().hidden]).toEqual([target]);
    expect(doc.version()).toBe(v);
  });

  it("gomme d'objet : hitTestPath ne reçoit que les points nouveaux et le point de jonction", () => {
    const { probes, tool } = setup("object");
    tool.begin(1, [s(0, 0)]);
    tool.extend(1, [s(1, 0), s(2, 0)], []);
    tool.frame();
    tool.extend(1, [s(3, 0)], []);
    tool.frame();
    tool.frame();
    expect(probes).toEqual([6, 4]);
  });

  it("cancel ou abort : annulé sans écriture (D39), aperçu retiré", () => {
    const { doc, runs, tool } = setup("object");
    const v = doc.version();
    for (const how of ["cancel", "abort"] as const) {
      tool.begin(1, [s(300, 80)]);
      tool.extend(1, [s(300, 120)], []);
      tool.frame();
      tool.close(1, how);
    }
    expect(runs).toEqual([]);
    expect(doc.version()).toBe(v);
    expect(tool.live().hidden.size).toBe(0);
    expect(tool.live().erasers).toHaveLength(0);
    expect(tool.active()).toBe(false);
  });

  it("le mode est figé au début du geste", () => {
    const { runs, tool, setMode } = setup("partial");
    tool.begin(1, [s(300, 80)]);
    setMode("object");
    tool.close(1, "end");
    expect(eraseOf(runs).mode).toBe("partial");
  });

  it("gomme qui ne touche rien : document inchangé, aucune étape (D38)", () => {
    const { doc, tool } = setup();
    const v = doc.version();
    tool.begin(1, [s(900, 900)]);
    tool.close(1, "end");
    expect(doc.version()).toBe(v);
  });
});
```

- [ ] **2. Lancer, constater l'échec** (`Failed to resolve import "./eraser"`).

- [ ] **3. `apps/web/src/engine/tools/eraser.ts` :**

```ts
/**
 * Gomme (D12, D38) : aperçu sans écriture, une seule commande Erase au relâché ; "cancel" et "abort" n'écrivent rien
 * (D39). Gomme d'objet : hitTestPath (lecture seule) sur le segment nouveau à chaque image, traits touchés masqués.
 * Rayon constant à l'écran (HL3-1), converti en unités monde au début du geste. Mode figé au début du geste.
 */
import type { EraseMode } from "../../core/api";
import { screenToWorld } from "../camera";
import type { CloseReason } from "../input/gesture";
import type { InputSample } from "../input/sampler";
import type { EraserPreview } from "../render/renderer";
import type { GestureTool, LivePart, ToolContext } from "./tool";

export const ERASER_RADIUS_PX = 12;

interface Pass {
  readonly page: string;
  readonly mode: EraseMode;
  readonly radius: number;
  /** Paires x, y monde. */
  readonly path: number[];
  /** Paires déjà soumises à hitTestPath. */
  checked: number;
  readonly hits: Set<string>;
}

export function createEraserTool(
  ctx: ToolContext,
  mode: () => EraseMode,
  radiusPx: number = ERASER_RADIUS_PX,
): GestureTool {
  const passes = new Map<number, Pass>();

  const add = (p: Pass, samples: readonly InputSample[]): void => {
    const cam = ctx.camera();
    for (const s of samples) {
      if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
      const [x, y] = screenToWorld(cam, s.x, s.y);
      p.path.push(x, y);
    }
  };

  const probe = (p: Pass): void => {
    const pairs = p.path.length / 2;
    if (p.mode !== "object" || pairs <= p.checked) return;
    const from = Math.max(0, p.checked - 1); // le point de jonction : le segment qui relie deux images est testé
    for (const id of ctx.doc.hitTestPath(p.page, new Float32Array(p.path.slice(from * 2)), p.radius)) p.hits.add(id);
    p.checked = pairs;
  };

  return {
    begin(pointerId, samples) {
      const p: Pass = {
        page: ctx.page(),
        mode: mode(),
        radius: radiusPx / ctx.camera().zoom,
        path: [],
        checked: 0,
        hits: new Set<string>(),
      };
      passes.set(pointerId, p);
      add(p, samples);
    },
    extend(pointerId, samples) {
      const p = passes.get(pointerId);
      if (p) add(p, samples);
    },
    frame() {
      for (const p of passes.values()) probe(p);
    },
    close(pointerId: number, how: CloseReason) {
      const p = passes.get(pointerId);
      if (!p) return;
      passes.delete(pointerId);
      if (how !== "end" || p.path.length < 2) return;
      ctx.run({ type: "Erase", page: p.page, path: new Float32Array(p.path), radius: p.radius, mode: p.mode });
    },
    live(): LivePart {
      const erasers: EraserPreview[] = [];
      const hidden = new Set<string>();
      for (const p of passes.values()) {
        erasers.push({ path: new Float32Array(p.path), radius: p.radius, mode: p.mode });
        for (const id of p.hits) hidden.add(id);
      }
      return { strokes: [], erasers, hidden };
    },
    active: () => passes.size > 0,
  };
}
```

- [ ] **4. Vert.** La commande bornée → `Tests  7 passed (7)`.

- [ ] **5. Suite complète et commit.** `verifier.sh` sous le jeton → `verifier.sh : OK`. Puis :

```bash
cd "$WT" && git add apps/web/src/engine/tools/eraser.ts && git add apps/web/src/engine/tools/eraser.test.ts \
  && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
     -m "feat(engine): partial and object eraser with write-free previews (D38)" \
     -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t25"></a>
### Tâche T25 — Script S2 au navigateur (Playwright Chromium) et fiche de l'essai du 19

**Objectif.** Écrire l'essai S2 du lot 3 au navigateur (cadrage § 6, partie « au navigateur » du lot 3 ; pas
l'enregistrement de fichier, qui reste au lot 5) : un script Node qui sert `apps/web/dist` en local, ouvre l'application
dans le Chromium headless de Playwright (déjà présent sur la VM : c'est ainsi que l'essai S1 du lot 1 a été joué,
capture `docs/essais/proto-stylet-essai-vm.png`), trace trois traits à la souris simulée, gomme le milieu du deuxième,
annule et rétablit au clavier et à la barre, et **lit** à chaque pas le nombre d'éléments (`#stage[data-elements]`) et
les pixels d'encre du canvas de scène. Le script est écrit contre le contrat DOM ci-dessous, que T24 réalise ; avant
T24, il échoue (application blanche) : c'est la preuve qu'il sait échouer. Ajouter à la fiche d'essai la section de
l'essai du 19. Scénario : S2.

**Contrat DOM (réalisé par T24, lu par ce script).**
`#stage[data-ready="1"]` quand le moteur est monté ; `#stage[data-elements]` = nombre d'éléments de la page courante ;
`#stage[data-version]` ; `#scene` = canvas de scène (lisible par `getImageData`) ; barre `#barre` avec
`button[data-action="pen" | "eraser" | "undo" | "redo"]`, `aria-pressed="true"` sur l'outil courant, `disabled` sur
Annuler / Rétablir sans étape ; `#etat` = message d'erreur (vide sinon). Zone de dessin plein écran à (0, 0) ; page
ajustée à la vue au démarrage.

**Fichiers.** Créer `scripts/essais/s2-navigateur.mjs`. Modifier `docs/essais/eni-stylet.md` (section ajoutée à la fin).

**Interfaces.**
- Consomme : rien du lot (contrat DOM ci-dessus, réalisé par T24).
- Réutilise : Playwright 1.65.1 du cache npx de la VM (`~/.npm/_npx/*/node_modules/playwright/index.mjs`, ou
  `PLAYWRIGHT_MODULE=<chemin>`) — `chromium.launch`, `page.mouse`, `page.keyboard.press`, `page.$eval`,
  `page.screenshot` ; son Chromium `~/.cache/ms-playwright/chromium-1255` (le même que pour l'essai S1 du lot 1).
- Réutilise : `apps/web/dist` construit par `scripts/verifier.sh` (`pnpm --filter @roomboard/web build`).
- Produit : `node scripts/essais/s2-navigateur.mjs [--capture <png>]` ; sortie : une ligne `ok — <contrôle>` par
  contrôle (16), puis `S2 lot 3 : OK` ; code 0 réussi, 1 échec (`S2 lot 3 : ÉCHEC — <cause>`), 2 outil absent.

**Hors de `verifier.sh`.** Le script exige Playwright et son Chromium, absents d'une machine neuve : il n'entre pas
dans `scripts/verifier.sh` (le parcours Playwright intégré, `verifier.sh --e2e`, arrive au lot 5). Il est lancé par
T24 et par l'orchestrateur en fin de lot.

**Test et commande bornée.**
D'abord `verifier.sh` (jeton) → `verifier.sh : OK` (construit `apps/web/dist` avec l'amorce actuelle, encore blanche).
Puis, sous le même jeton :
`cd "$WT" && node scripts/essais/s2-navigateur.mjs; echo "code=$?"` → `S2 lot 3 : ÉCHEC — l'application ne démarre pas
(#stage[data-ready="1"] absent)` et `code=1` (rouge attendu : prouve que le serveur, Playwright et Chromium tournent et
que le contrôle lit le DOM). Sans Playwright (`PLAYWRIGHT_MODULE=/nulle/part HOME=/tmp/vide node scripts/essais/s2-navigateur.mjs; echo "code=$?"`)
→ `S2 lot 3 : outil absent — Playwright introuvable` et `code=2`.

**Preuve visuelle.** Aucune dans cette tâche (capture posée par T24).

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de
`--force` ; aucun workflow GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun ici) ; tests par
`scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom
tests --proprietaire socle/T25 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"`
(commandes ciblées, dont le script S2, sous le même jeton) ; relecteurs au premier plan (`run_in_background: false`) ;
commit d'auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By:
Claude Opus 5.5 <noreply@anthropic.com>` ; aucun seuil baissé, aucun test désactivé, sauté ou affaibli ; dépôt public :
aucun secret ni chemin personnel en dur (le script trouve Playwright par `homedir()`) ; worktree neuf :
`pnpm install --frozen-lockfile` d'abord ; `apps/web/src/core/api.ts` figé ; rien n'est écrit avant le relâché (D38).

**Interdits.** Ne pas toucher `scripts/verifier.sh`, `apps/web/` ni `package.json` (aucune dépendance Playwright
ajoutée au dépôt au lot 3). Aucun téléchargement de navigateur par le script. Aucun contrôle affaibli pour passer
(seuils de pixels, nombres d'éléments). Ne pas modifier les sections existantes de la fiche.

**Terminé quand.** Le script rend `code=1` avec la cause « l'application ne démarre pas » sur l'amorce actuelle et
`code=2` sans Playwright, `verifier.sh : OK`, la fiche a sa section, et le rapport contient `Réutilisation : appelé
Playwright 1.65.1 (cache npx) et chromium-1255` (ou `écart — <pourquoi>`).

**Étapes.**

- [ ] **1. Écrire le script.** `scripts/essais/s2-navigateur.mjs` :

```js
#!/usr/bin/env node
// Scénario S2 au navigateur, partie du lot 3 (cadrage § 6 ; plan du lot 3, T25) : l'application web construite
// (apps/web/dist) servie en local, Chromium headless de Playwright, souris simulée. Trois traits, gomme au milieu du
// deuxième, Ctrl+Z, Ctrl+Y, Ctrl+Maj+Z, boutons de la barre ; lit le nombre d'éléments (#stage[data-elements]) et les
// pixels d'encre du canvas de scène. Hors de scripts/verifier.sh : exige Playwright (cache npx) et son Chromium.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/s2-navigateur.mjs [--capture docs/essais/s2-lot3-vm.png]
import { existsSync, readdirSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const DIST = join(ROOT, "apps", "web", "dist");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".wasm": "application/wasm",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

class Echec extends Error {}

function captureTarget(argv) {
  const i = argv.indexOf("--capture");
  if (i < 0) return null;
  return resolve(ROOT, argv[i + 1] ?? "docs/essais/s2-lot3-vm.png");
}

async function loadPlaywright() {
  const candidates = [];
  if (process.env.PLAYWRIGHT_MODULE) candidates.push(process.env.PLAYWRIGHT_MODULE);
  const npx = join(homedir(), ".npm", "_npx");
  if (existsSync(npx)) {
    for (const d of readdirSync(npx)) candidates.push(join(npx, d, "node_modules", "playwright", "index.mjs"));
  }
  const found = candidates.find((c) => existsSync(c));
  return found ? import(pathToFileURL(found).href) : null;
}

function serve() {
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url ?? "/", "http://local").pathname);
      const rel = normalize(path).replace(/^[/\\]+/, "");
      const file = join(DIST, rel === "" ? "index.html" : rel);
      if (file !== DIST && !file.startsWith(DIST + sep)) {
        res.writeHead(403).end();
        return;
      }
      const target = (await stat(file)).isDirectory() ? join(file, "index.html") : file;
      const body = await readFile(target);
      res.writeHead(200, { "content-type": TYPES[extname(target)] ?? "application/octet-stream" }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

async function scenario(page, port, capture) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const frames = () =>
    page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))));
  const elements = async () => Number(await page.getAttribute("#stage", "data-elements"));
  const disabled = (action) => page.$eval(`#barre button[data-action="${action}"]`, (b) => b.disabled);
  // Pixels d'encre (somme RVB < 300) dans une boîte en px CSS du canvas de scène.
  const ink = (box) =>
    page.$eval(
      "#scene",
      (c, [x0, y0, x1, y1]) => {
        const ctx = c.getContext("2d");
        const sx = c.width / c.clientWidth;
        const sy = c.height / c.clientHeight;
        const w = Math.max(1, Math.round((x1 - x0) * sx));
        const h = Math.max(1, Math.round((y1 - y0) * sy));
        const d = ctx.getImageData(Math.round(x0 * sx), Math.round(y0 * sy), w, h).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 300) n++;
        return n;
      },
      box,
    );
  const drag = async (points) => {
    const [first, ...rest] = points;
    await page.mouse.move(first[0], first[1]);
    await page.mouse.down();
    for (const [x, y] of rest) await page.mouse.move(x, y, { steps: 8 });
    await page.mouse.up();
    await frames();
  };
  const press = async (keys) => {
    await page.keyboard.press(keys);
    await frames();
  };
  const click = async (action) => {
    await page.click(`#barre button[data-action="${action}"]`);
    await frames();
  };

  await page.goto(`http://127.0.0.1:${port}/`);
  try {
    await page.waitForSelector('#stage[data-ready="1"]', { timeout: 15000 });
  } catch {
    throw new Echec(`l'application ne démarre pas (#stage[data-ready="1"] absent) ${errors.join(" | ")}`);
  }
  await frames();

  const MID = [645, 340, 655, 360]; // milieu du deuxième trait (y = 350), sous la gomme
  const REST = [450, 340, 500, 360]; // partie gauche du deuxième trait, loin de la gomme

  check((await elements()) === 0, "page vide au démarrage");
  check(await disabled("undo"), "Annuler désactivé sur un document neuf");
  await press("Control+z");
  check((await elements()) === 0 && (await page.textContent("#etat")) === "", "Ctrl+Z sur un document neuf : rien, aucune erreur");

  for (const y of [250, 350, 450]) await drag([[400, y], [650, y], [900, y]]);
  check((await elements()) === 3, "trois traits tracés à la souris");
  check((await ink(MID)) > 0, "encre visible au milieu du deuxième trait");

  await click("eraser");
  check((await page.getAttribute('#barre button[data-action="eraser"]', "aria-pressed")) === "true", "gomme choisie dans la barre");
  await drag([[650, 310], [650, 350], [650, 390]]);
  check((await elements()) === 4, "gomme en travers du deuxième trait : il reste quatre traits");
  check((await ink(MID)) === 0, "l'encre a disparu sous la gomme");
  check((await ink(REST)) > 0, "le reste du deuxième trait est toujours là");

  await press("Control+z");
  check((await elements()) === 3, "Ctrl+Z : trois traits");
  check((await ink(MID)) > 0, "Ctrl+Z : l'encre revient");
  await press("Control+y");
  check((await elements()) === 4 && (await ink(MID)) === 0, "Ctrl+Y : quatre traits, encre de nouveau effacée");
  await press("Control+z");
  await press("Control+Shift+z");
  check((await elements()) === 4, "Ctrl+Maj+Z : rétablit aussi");
  await click("undo");
  check((await elements()) === 3, "bouton Annuler");
  await click("redo");
  check((await elements()) === 4, "bouton Rétablir");
  check(errors.length === 0, `aucune erreur dans la page${errors.length > 0 ? ` : ${errors.join(" | ")}` : ""}`);

  if (capture) {
    await page.screenshot({ path: capture });
    console.log(`capture : ${capture}`);
  }
}

async function main() {
  if (!existsSync(join(DIST, "index.html"))) {
    console.error("S2 lot 3 : ÉCHEC — apps/web/dist absent : lancer d'abord scripts/verifier.sh (Wasm et application)");
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(
      "S2 lot 3 : outil absent — Playwright introuvable (le poser : npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=<chemin de playwright/index.mjs>)",
    );
    return 2;
  }
  const server = await serve();
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`S2 lot 3 : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await scenario(page, server.address().port, captureTarget(process.argv.slice(2)));
    console.log("S2 lot 3 : OK");
    return 0;
  } catch (e) {
    console.error(`S2 lot 3 : ÉCHEC — ${e instanceof Echec ? e.message : e instanceof Error ? e.stack : e}`);
    return 1;
  } finally {
    await browser?.close();
    server.close();
  }
}

process.exitCode = await main();
```

- [ ] **2. Rouge attendu.** `verifier.sh` sous le jeton (construit `apps/web/dist`), puis la commande bornée →
  `S2 lot 3 : ÉCHEC — l'application ne démarre pas (#stage[data-ready="1"] absent)`, `code=1`. Puis la commande
  « sans Playwright » → `code=2`. Si `code=2` apparaît dans le premier cas : noter la sortie exacte au rapport (outil
  absent de la VM) et s'arrêter, sans contourner.

- [ ] **3. Fiche.** Ajouter à la fin de `docs/essais/eni-stylet.md` :

```markdown
## Essai du 19 novembre — application (lot 3)

Ce qui change depuis le banc du 16 : l'encre est celle du produit (contour `freedraw` calculé par le cœur Wasm,
`StrokeBuilder`), dessinée par le moteur sur ses deux canvas. À ouvrir : l'application web construite
(`apps/web/dist`, servie en http : le Wasm ne se charge pas en `file://`) ou la coque Tauri. La barre (Stylo, Gomme,
Annuler, Rétablir) est provisoire : l'interface complète arrive au lot 5.

1. Stylet : écrire « Bonjour la classe » en appuyant plus ou moins fort : l'épaisseur suit la pression.
2. Gomme (bouton « Gomme », ou bouton gomme du stylet) : passer en travers d'un mot ; au relâché, l'encre touchée
   disparaît, le reste des traits demeure.
3. Ctrl+Z, puis Ctrl+Y (ou Ctrl+Maj+Z), puis les boutons « Annuler » et « Rétablir ».
4. Doigt avant tout stylet : il trace. Deux doigts posés ensemble (moins de 150 ms) : aucun trait, la vue se pince.
   Après un trait au stylet : un doigt déplace la vue, deux doigts pincent.
5. Paume posée en écrivant au stylet : aucun trait de paume.
6. Molette : la vue défile ; Ctrl+molette : zoom autour du pointeur.
7. Banc : ouvrir la même adresse suivie de `?banc`, écrire comme le 16, « Télécharger le JSON »
   (`roomboard-stylet/1`, champs `geometry: "freedraw"` et `coreVersion` en plus), le comparer au JSON du 16
   (retard p95, part des images > 25 ms).

Verdict : le ressenti de Jérôme (« le trait suit la pointe »), comme le 16 (D31). Si le trait ne suit pas : tableau
« Si l'essai échoue » ci-dessus (échelons 2 à 4 de DA9, lot 3b).
```

- [ ] **4. Suite complète et commit.** `verifier.sh` sous le jeton → `verifier.sh : OK`. Puis :

```bash
cd "$WT" && git add scripts/essais/s2-navigateur.mjs && git add docs/essais/eni-stylet.md \
  && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
     -m "test(e2e): S2 browser run for lot 3 (Playwright Chromium) and test sheet for Nov 19" \
     -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t24"></a>
### Tâche T24 — Amorce `main.ts`, barre minimale, S2 au navigateur vert

**Objectif.** Ce que Jérôme essaie jeudi : `main.ts` charge le cœur Wasm, crée `Document.blank()`, monte le moteur
(rendu Canvas 2D, routeur, stylo, gomme) sur la page, branche le clavier (Ctrl+Z, Ctrl+Y, Ctrl+Maj+Z), la molette, le
redimensionnement et le changement d'écran (`devicePixelRatio`), et ajoute une barre minimale en DOM simple (Stylo,
Gomme, Annuler, Rétablir ; message d'erreur du cœur). L'appli web et la coque Tauri (qui sert le même `apps/web/dist`)
tracent alors au stylet, au doigt et à la souris. `?banc` monte le banc de T26. La barre sera remplacée au lot 5
(SolidJS). Réalise le contrat DOM de T25 et rend l'essai S2 vert, capture comprise. Scénarios : S2 ; S1 rejoué (banc).

**Fichiers.** Modifier `apps/web/src/main.ts` (remplacé), `apps/web/index.html`. Créer `apps/web/src/app/barre.ts`,
`apps/web/src/app/barre.test.ts`, `docs/essais/s2-lot3-vm.png` (capture produite par le script).

**Interfaces.**
- Consomme : `createEngine`, `EngineState`, `Engine` (T23, `./engine/engine`) ; `createRouter`,
  `DEFAULT_ROUTER_OPTIONS` (T20, `./engine/input/router`) ; `createCanvas2DRenderer` (T19,
  `./engine/render/canvas2d`) ; `createPenTool` (T21, `./engine/tools/pen`) ; `createEraserTool` (T22,
  `./engine/tools/eraser`) ; `KeyLike` (T18) ; `DrawTool` (T18, `./engine/input/gesture`) ; `createAppBench`,
  `mountBenchPanel` (T26, `./app/banc`) et `detectSupport` (T26, `./engine/input/support`) ; script
  `scripts/essais/s2-navigateur.mjs` (T25) et son contrat DOM.
- Réutilise et étend : `apps/web/src/main.ts:1-22` (`init`, `resize`, `start`) — `init()` du module Wasm gardé ;
  `resize` repris par `Renderer.resize` (via `Engine.resize`) ; `start` crée `core.blank()` puis monte moteur et barre.
- Réutilise : `apps/web/src/core/wasm-core.ts:87` — `createWasmCore(mod: WasmModule): CoreFactory` ;
  `apps/web/src/engine/input/sampler.ts:91` — `createSampler(target: PointerSurface, opts: SamplerOptions): Sampler`
  (sur `#stage`, fusionnés et prédits actifs, `pointerrawupdate` coupé : échelon 1 de DA9) ;
  `apps/web/src/toolbar.ts:8` — `toolbar` (libellés « Stylo » et « Gomme », sans changer le fichier).
- Produit (`app/barre.ts`) : `type BarAction = DrawTool | "undo" | "redo"` ;
  `interface BarButton { action: BarAction; label: string; pressed: boolean | null; disabled: boolean }` ;
  `barModel(s: EngineState): BarButton[]` ;
  `mountBar(root: HTMLElement, engine: Pick<Engine, "setTool" | "undo" | "redo" | "state" | "onState">): () => void`.
- Produit (DOM) : le contrat de T25 (`#stage[data-ready]`, `[data-elements]`, `[data-version]`,
  `#barre button[data-action]`, `aria-pressed`, `disabled`, `#etat`).

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/app/barre.test.ts --reporter=verbose 2>&1 | tail -12` → `Tests  3 passed (3)`.
`verifier.sh` (jeton) → `verifier.sh : OK` (tsc et build de l'application compris ; une seule ligne
`module Wasm : N octets`, N ≤ 1572864).
Puis, sous le jeton : `cd "$WT" && node scripts/essais/s2-navigateur.mjs --capture docs/essais/s2-lot3-vm.png 2>&1 | tail -20; echo "code=${PIPESTATUS[0]}"`
→ 16 lignes `ok — …`, puis `capture : …/docs/essais/s2-lot3-vm.png`, `S2 lot 3 : OK`, `code=0`.

**Preuve visuelle.** Lectures d'abord (elles prouvent plus que l'image) : les lignes `ok — page vide au démarrage`,
`ok — gomme en travers du deuxième trait : il reste quatre traits` (`data-elements` = 4), `ok — l'encre a disparu sous
la gomme` (0 pixel d'encre sous la gomme), `ok — Ctrl+Z : trois traits`, `ok — Ctrl+Y : quatre traits, encre de
nouveau effacée`. Puis la capture `docs/essais/s2-lot3-vm.png`, à décrire au rapport : page blanche sur pourtour gris,
trois traits noirs horizontaux, le deuxième coupé en son milieu, barre en haut à gauche avec « Gomme » pressée.

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de
`--force` ; aucun workflow GitHub Actions ; un seul build Tauri à la fois, aucun build Android (cette tâche n'en lance
aucun) ; tests par `scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node
~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire socle/T24 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"`
(commandes ciblées, dont le script S2, sous le même jeton) ; relecteurs au premier plan (`run_in_background: false`) ;
commit d'auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By:
Claude Opus 5.5 <noreply@anthropic.com>` ; aucun seuil baissé, aucun test désactivé, sauté ou affaibli ; dépôt public :
aucun secret ; worktree neuf : `pnpm install --frozen-lockfile` d'abord ; `apps/web/src/core/api.ts` figé ; rien n'est
écrit avant le relâché (D38) ; le chemin de l'encre reste dans la page (aucun appel Tauri) ; TypeScript strict
(`noUncheckedIndexedAccess`) : aucun `any`, aucun `!` sur un index.

**Interdits.** Aucun framework (SolidJS au lot 5, dans `src/ui/`). Ne pas modifier `toolbar.ts`, le moteur
(`src/engine/`), `app/banc.ts`, ni le script S2 (s'il échoue, corriger l'application, jamais les contrôles). Ne pas
toucher `apps/desktop`. Garder `touch-action: none` et les deux canvas `#scene` et `#interaction` de `index.html`.

**Terminé quand.** 3 tests verts, `verifier.sh : OK`, l'essai S2 sort `S2 lot 3 : OK` avec `code=0`, la capture est
commitée, et le rapport contient : `Réutilisation : appelé createWasmCore, createSampler, toolbar ; main.ts étendu`
(ou `écart — <pourquoi>`) ; les 16 lignes `ok —` ; la description de la capture.

**Étapes.**

- [ ] **1. Écrire le test de la barre (rouge).** `apps/web/src/app/barre.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { EngineState } from "../engine/engine";
import { barModel } from "./barre";

const base: EngineState = {
  tool: "pen",
  eraserMode: "partial",
  canUndo: false,
  canRedo: false,
  page: "p",
  elementCount: 0,
  version: 0,
  error: null,
};

describe("barModel", () => {
  it("quatre boutons : stylo, gomme, annuler, rétablir ; libellés repris de toolbar.ts", () => {
    expect(barModel(base).map((b) => [b.action, b.label])).toEqual([
      ["pen", "Stylo"],
      ["eraser", "Gomme"],
      ["undo", "Annuler"],
      ["redo", "Rétablir"],
    ]);
  });

  it("l'outil courant est pressé, l'autre non", () => {
    expect(barModel({ ...base, tool: "eraser" }).map((b) => b.pressed)).toEqual([false, true, null, null]);
  });

  it("annuler et rétablir désactivés sans étape", () => {
    expect(barModel(base).map((b) => b.disabled)).toEqual([false, false, true, true]);
    expect(barModel({ ...base, canUndo: true, canRedo: true }).map((b) => b.disabled)).toEqual([false, false, false, false]);
  });
});
```

- [ ] **2. Lancer, constater l'échec** (`Failed to resolve import "./barre"`).

- [ ] **3. `apps/web/src/app/barre.ts` :**

```ts
/** Barre minimale de l'essai du 19 novembre (Stylo, Gomme, Annuler, Rétablir), en DOM simple ; remplacée au lot 5. */
import type { Engine, EngineState } from "../engine/engine";
import type { DrawTool } from "../engine/input/gesture";
import { toolbar } from "../toolbar";

export type BarAction = DrawTool | "undo" | "redo";

export interface BarButton {
  readonly action: BarAction;
  readonly label: string;
  /** État pressé d'un outil ; null pour une action. */
  readonly pressed: boolean | null;
  readonly disabled: boolean;
}

const labelOf = (id: DrawTool): string => toolbar.find((t) => t.id === id)?.label ?? id;

export function barModel(s: EngineState): BarButton[] {
  return [
    { action: "pen", label: labelOf("pen"), pressed: s.tool === "pen", disabled: false },
    { action: "eraser", label: labelOf("eraser"), pressed: s.tool === "eraser", disabled: false },
    { action: "undo", label: "Annuler", pressed: null, disabled: !s.canUndo },
    { action: "redo", label: "Rétablir", pressed: null, disabled: !s.canRedo },
  ];
}

export function mountBar(
  root: HTMLElement,
  engine: Pick<Engine, "setTool" | "undo" | "redo" | "state" | "onState">,
): () => void {
  const buttons = new Map<BarAction, HTMLButtonElement>();
  for (const b of barModel(engine.state())) {
    const el = document.createElement("button");
    el.type = "button";
    el.dataset["action"] = b.action;
    el.textContent = b.label;
    el.addEventListener("click", () => {
      if (b.action === "undo") engine.undo();
      else if (b.action === "redo") engine.redo();
      else engine.setTool(b.action);
    });
    buttons.set(b.action, el);
    root.append(el);
  }
  const status = document.createElement("span");
  status.id = "etat";
  status.setAttribute("role", "status");
  root.append(status);
  const paint = (s: EngineState): void => {
    for (const b of barModel(s)) {
      const el = buttons.get(b.action);
      if (!el) continue;
      el.disabled = b.disabled;
      if (b.pressed === null) el.removeAttribute("aria-pressed");
      else el.setAttribute("aria-pressed", String(b.pressed));
    }
    status.textContent = s.error ?? "";
  };
  paint(engine.state());
  return engine.onState(paint);
}
```

- [ ] **4. `apps/web/index.html` (remplacé) :**

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>RoomBoard</title>
    <style>
      html, body { margin: 0; height: 100%; overflow: hidden; font: 15px system-ui, sans-serif; }
      #stage { position: relative; width: 100vw; height: 100vh; touch-action: none; user-select: none; -webkit-user-select: none; }
      #stage canvas { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; pointer-events: none; }
      #barre { position: absolute; top: 8px; left: 8px; z-index: 2; display: flex; gap: 6px; align-items: center; user-select: none; -webkit-user-select: none; }
      #barre button { min-width: 44px; min-height: 44px; padding: 0 14px; font: inherit; border: 1px solid #a1a1aa; border-radius: 8px; background: #ffffff; color: #18181b; }
      #barre button[aria-pressed="true"] { background: #1e3a8a; border-color: #1e3a8a; color: #ffffff; }
      #barre button:disabled { opacity: 0.4; }
      #etat { margin-left: 8px; color: #b91c1c; }
    </style>
  </head>
  <body>
    <div id="stage">
      <canvas id="scene"></canvas>
      <canvas id="interaction"></canvas>
    </div>
    <div id="barre" role="toolbar" aria-label="Outils"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

  (La barre est hors de `#stage` : ses clics n'arrivent pas à l'échantillonneur. Canvas en `pointer-events: none` : les
  événements visent `#stage`, comme dans le banc du lot 1.)

- [ ] **5. `apps/web/src/main.ts` (remplacé) :**

```ts
/**
 * Amorce de l'application (lot 3, essai du 19 novembre 2026) : cœur Wasm, moteur d'interaction, barre minimale en DOM
 * simple, remplacée au lot 5 par l'interface SolidJS. `?banc` ajoute le banc du lot 1 rejoué (géométrie du produit).
 */
import { mountBar } from "./app/barre";
import { createWasmCore } from "./core/wasm-core";
import { createEngine, type EngineState } from "./engine/engine";
import type { KeyLike } from "./engine/input/keys";
import { createRouter, DEFAULT_ROUTER_OPTIONS } from "./engine/input/router";
import { createSampler, type SamplerOptions } from "./engine/input/sampler";
import { createCanvas2DRenderer } from "./engine/render/canvas2d";
import { createEraserTool } from "./engine/tools/eraser";
import { createPenTool } from "./engine/tools/pen";
import init, * as wasm from "./wasm/roomboard_wasm";

/** Échelon 1 de DA9 : fusionnés et prédits ; pointerrawupdate coupé (pas de prédits sous Chromium avec lui). */
const SAMPLER: SamplerOptions = { coalesced: true, predicted: true, raw: false };

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`élément absent : #${id}`);
  return found as T;
}

function keyOf(e: KeyboardEvent): KeyLike {
  return {
    key: e.key,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
    shiftKey: e.shiftKey,
    altKey: e.altKey,
    isComposing: e.isComposing,
    target: e.target instanceof HTMLElement ? e.target : null,
  };
}

async function start(): Promise<void> {
  await init();
  const core = createWasmCore(wasm);
  const doc = core.blank();
  const stage = el<HTMLDivElement>("stage");
  const renderer = createCanvas2DRenderer(el<HTMLCanvasElement>("scene"), el<HTMLCanvasElement>("interaction"), doc);
  const engine = createEngine({
    doc,
    renderer,
    frames: {
      requestFrame: (cb) => requestAnimationFrame(cb),
      cancelFrame: (id) => cancelAnimationFrame(id),
      now: () => performance.now(),
    },
    tools: { pen: createPenTool, eraser: createEraserTool },
  });
  const sampler = createSampler(stage, SAMPLER);
  const router = createRouter(DEFAULT_ROUTER_OPTIONS, {
    currentTool: () => engine.tool(),
    gestures: engine.sink,
    view: engine.view,
  });
  sampler.onGesture((g) => router.handle(g));

  // Taille de la zone et devicePixelRatio suivis (fenêtre, panneau, changement d'écran) : l'encre reste sous la pointe.
  const fit = (): void => {
    const r = stage.getBoundingClientRect();
    engine.resize(r.width, r.height, window.devicePixelRatio || 1);
  };
  const watchDpr = (): void => {
    window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`).addEventListener(
      "change",
      () => {
        fit();
        watchDpr();
      },
      { once: true },
    );
  };
  new ResizeObserver(() => fit()).observe(stage);
  fit();
  watchDpr();

  window.addEventListener("keydown", (e) => {
    if (engine.key(keyOf(e))) e.preventDefault();
  });
  stage.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      const unit = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : e.deltaMode === WheelEvent.DOM_DELTA_PAGE ? r.height : 1;
      engine.wheel({
        x: e.clientX - r.left,
        y: e.clientY - r.top,
        deltaX: e.deltaX * unit,
        deltaY: e.deltaY * unit,
        ctrlKey: e.ctrlKey || e.metaKey,
      });
    },
    { passive: false },
  );

  const mark = (s: EngineState): void => {
    stage.dataset["elements"] = String(s.elementCount);
    stage.dataset["version"] = String(s.version);
  };
  mark(engine.state());
  engine.onState(mark);
  mountBar(el<HTMLDivElement>("barre"), engine);

  if (new URLSearchParams(window.location.search).has("banc")) {
    const { createAppBench, mountBenchPanel } = await import("./app/banc");
    const { detectSupport } = await import("./engine/input/support");
    mountBenchPanel(
      createAppBench({
        sampler,
        onLiveDrawn: (cb) => engine.onLiveDrawn(cb),
        frameDurations: () => engine.frameDurations(),
        options: { ...SAMPLER, desynchronized: true, inkTrail: false },
        environment: {
          userAgent: navigator.userAgent,
          devicePixelRatio: window.devicePixelRatio || 1,
          support: detectSupport(),
        },
        coreVersion: core.version(),
        now: () => new Date().toISOString(),
      }),
    );
  }
  stage.dataset["ready"] = "1";
}

start().catch((e: unknown) => {
  const message = e instanceof Error ? e.message : String(e);
  document.body.dataset["erreur"] = message;
  const etat = document.getElementById("etat");
  if (etat) etat.textContent = `RoomBoard n'a pas pu démarrer : ${message}`;
  console.error(e);
});
```

- [ ] **6. Vert, unitaire.** `pnpm exec vitest run src/app/barre.test.ts` → `Tests  3 passed (3)`.

- [ ] **7. Suite complète.** `verifier.sh` sous le jeton → `verifier.sh : OK` (construit `apps/web/dist` avec la
  nouvelle amorce).

- [ ] **8. S2 au navigateur.** Sous le jeton :
  `cd "$WT" && node scripts/essais/s2-navigateur.mjs --capture docs/essais/s2-lot3-vm.png 2>&1 | tail -20; echo "code=${PIPESTATUS[0]}"`
  → 16 lignes `ok —`, `S2 lot 3 : OK`, `code=0`. Si un contrôle échoue : corriger l'application (jamais le script),
  relancer les étapes 7 et 8. Ouvrir la capture et la décrire au rapport.

- [ ] **9. Commit.**

```bash
cd "$WT" && git add apps/web/src/main.ts && git add apps/web/index.html && git add apps/web/src/app/barre.ts \
  && git add apps/web/src/app/barre.test.ts && git add docs/essais/s2-lot3-vm.png \
  && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
     -m "feat(web): mount the interaction engine with a minimal toolbar for the Nov 19 trial" \
     -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
