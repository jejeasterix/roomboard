# Plan du lot 3b — Fin du moteur (socle RoomBoard)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**Spec :** `docs/plans/socle-cadrage.md` (D17, D18, D38, D39 ; DA2, DA7, DA9 ; § 3 « Modules à réutiliser ou à
étendre » ; scénario S2). Plan maître : `docs/plans/socle-PLAN.md` (ligne 3b, § Risque n° 1 et table « Si l'essai
échoue »). Plan du lot 3 : `docs/plans/socle-lot3-PLAN.md` (§ « Ce qui part en lot 3b »). État :
`docs/sessions/socle-etat.md` (écarts acceptés, constats d'architecture, pièges).

**Décision qui fonde le lot.** Décision de Jérôme, 2026-11-19, mot pour mot, en réponse à « Est-ce que je relance
RoomBoard dès ce soir, ou est-ce que je garde samedi pour les essais ENI que tu fais avec lui ? » : « oui fait le avancé
en autonomie même si je n'ai pas fais les tests ». Le lot 3b n'attend plus le verdict ENI : les échelons 2 à 4 de DA9
se tranchent depuis les mesures existantes, chacun derrière un réglage réversible. L'essai ENI du samedi 2026-11-21
devient une vérification.

**But :** le moteur du socle est complet pour la caméra (D17 : outil main, espace + glisser, bouton du milieu, caméra
par page), la gomme d'objet et le doigt (D18) sont réglables dans la barre, et chaque échelon 2 à 4 de DA9 existe,
testé, derrière un réglage lu d'un seul endroit (`apps/web/src/engine/settings.ts`), que l'adresse (`?echelons=`)
et la barre basculent pour l'essai de samedi.

**Architecture :** tout reste dans `apps/web/src/engine/input` et `apps/web/src/engine/render` (DA9), plus la barre
et l'amorce. Échelon 2 : décorateur du `GestureSink` (`input/predict.ts`), le routeur et les outils ne changent pas.
Échelon 3 : module branché par la page sur la zone de dessin (`render/ink-trail.ts`). Échelon 4 :
`render/webgl2.ts` remplace le canvas d'interaction derrière `Renderer` (DA2), la scène reste au Canvas 2D ;
`render/select.ts` choisit et replie sur le Canvas 2D. Le cœur Rust ne change pas (une mesure ajoutée en test).

**Tech :** TypeScript 5.6 strict, Vite 6, Vitest 3 (environnement Node, faux objets) ; Rust (freedraw 1.0.4, test de
mesure en release) ; Playwright 1.65.1 (cache npx de la VM) et son Chromium `chromium-1255` pour S2, hors
`verifier.sh`.

**Code du plan essayé à l'écriture** (2026-11-19, copie jetable du dépôt dans `/tmp`, hors worktree, rien commité) :
le code de toutes les sections appliqué tel quel → `tsc --noEmit` sans erreur, Vitest `Test Files  23 passed`,
`Tests  286 passed`, les comptes de chaque tâche exacts ; `vite build` ; S2 `S2 lot 3 : OK` puis
`S2 lot 3b : OK (4 passages)` ; mesure T37 `1 passed` ; `cargo fmt --check` et `clippy -D warnings` verts. Les
exécutants refont tout dans leur worktree : ce relevé ne remplace aucune preuve.

## Échelons et réglages

Mesures existantes : **S1** sur la VM (Chromium headless, souris simulée) : 42 points, retard p95 17,4 ms, 0 erreur.
**OC56** sur le PC (Edge 157, souris simulée) : événements fusionnés, prédits, `pointerrawupdate`, `desynchronized`
et `navigator.ink` pris en charge ; 41 points, p95 17,1 ms, 0 % d'images au-delà de 25 ms ; pas de stylet, aucune
mesure de pression. **OC66** sur le PC : appli web dans Edge et coque Tauri (WebView2) tracent, gomment, annulent, sans
erreur console. **Rien de mesuré** sous WebKit (Safari, WKWebView, WebKitGTK) ni au vrai stylet.

| échelon | réglage (`EngineSettings`) | adresse | valeurs | défaut | mesure qui fonde le défaut |
|---|---|---|---|---|---|
| 2 — prédiction linéaire en TS | `prediction` | `?echelons=2` (= `2:on`), `2:off`, `2:auto` | `auto`, `on`, `off` | `auto` : allumée seulement là où `getPredictedEvents` manque (WebKit) | OC56 : Edge a les prédits natifs, p95 17,1 ms ; S1 : Chromium p95 17,4 ms. Rien ne la demande sous Chromium ; WebKit non mesuré, seul endroit où `auto` l'allume |
| 3 — traînée déléguée `navigator.ink` | `inkTrail` | `?echelons=3`, `3:off` | `on`, `off` | `off` ; là où l'API manque : sans effet, dit dans la barre (« sans effet (navigator.ink absent) ») | OC56 : API présente, mais 0 % d'images > 25 ms et p95 17,1 ms sans elle ; aucun stylet pour juger la pointe |
| 4 — canvas d'interaction en WebGL2 | `webgl` | `?echelons=4`, `4:off` | `on`, `off` | `off` ; contexte WebGL2 nul ou programme refusé : repli Canvas 2D, dit dans la barre | OC56 : 0 % d'images > 25 ms au Canvas 2D ; S1 : 0 erreur ; OC66 : Edge et WebView2 tracent au Canvas 2D |
| paume (D18, D39) | `palm` | `?paume=strict`, `?paume=souple` | `strict`, `lenient` | `strict` : le geste d'une paume posée avant le stylet est annulé quand le stylet touche (écart accepté T1, `cancelTouches`) | aucune mesure (pas de stylet) : le défaut garde le comportement livré au lot 3 et accepté ; ce n'est pas un échelon de DA9 |
| doigt (D18) | `finger` | `?doigt=vue`, `?doigt=trace` | `pan`, `draw` | `pan` : après un stylet vu, le doigt seul déplace la vue | D18 du cadrage ; OC66 sans stylet : rien de mesuré contre |

Échelon 1 (fusionnés, prédits natifs, `desynchronized`) : toujours allumé, rien à régler (S1, OC56). Échelon 5
(`additionalBrowserArgs` de WebView2) : lot 5, `?echelons=5` le dit et l'ignore. Échelon 6 (encre native dans la
coque) : interdit, `?echelons=6` le dit et l'ignore ; le chemin de l'encre ne traverse jamais la frontière page ↔ Rust
natif. Ligne de conduite appliquée sans contradiction : aucun échelon que rien de mesuré ne demande n'est allumé par
défaut ; `auto` de l'échelon 2 allume un chemin jamais mesuré, mais seulement là où le prédit natif manque (risque noté
HL3b-2).

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T30 | Module unique des réglages du moteur (`settings.ts`) | — | apps/web/src/engine/settings.ts, apps/web/src/engine/settings.test.ts | isolé | implementeur-tdd | vitest `settings.test.ts` : `Tests  14 passed (14)`, `échelons 1, 5 et 6 refusés avec leur raison ; valeurs inconnues ignorées, message rendu` présent ; `verifier.sh : OK` | S2 | #tache-t30 |
| T31 | Échelon 2 : prédiction linéaire en TS (décorateur du `GestureSink`) | — | apps/web/src/engine/input/predict.ts, apps/web/src/engine/input/predict.test.ts | isolé | implementeur-tdd | vitest `predict.test.ts` : `Tests  12 passed (12)`, `queue bornée à 48 px` et `éteinte : prédits natifs transmis tels quels` présents ; `verifier.sh : OK` | S2 | #tache-t31 |
| T32 | Échelon 3 : traînée déléguée `navigator.ink` | — | apps/web/src/engine/render/ink-trail.ts, apps/web/src/engine/render/ink-trail.test.ts | isolé | implementeur-tdd | vitest `ink-trail.test.ts` : `Tests  8 passed (8)`, `API absente : statut absent, aucun écouteur` présent ; `verifier.sh : OK` | S2 | #tache-t32 |
| T33 | Échelon 4 : canvas d'interaction en WebGL2 et repli Canvas 2D | — | apps/web/src/engine/render/webgl2.ts, apps/web/src/engine/render/webgl2.test.ts, apps/web/src/engine/render/select.ts, apps/web/src/engine/render/select.test.ts, apps/web/src/engine/render/fake-gl.ts, apps/web/src/engine/render/canvas2d.ts, apps/web/src/engine/render/canvas2d.test.ts | isolé | concepteur-critique | vitest des 3 fichiers : `Tests  30 passed (30)`, `remplissage nonzero par stencil : couleur coupée pendant l'éventail, puis rectangle couvrant` et `contexte WebGL2 nul : repli Canvas 2D, note dite` présents ; `verifier.sh : OK` | S2 | #tache-t33 |
| T34 | Entrées : paume réglable et bouton du milieu | — | apps/web/src/engine/input/sampler.ts, apps/web/src/engine/input/sampler.test.ts, apps/web/src/engine/input/middle-pan.ts, apps/web/src/engine/input/middle-pan.test.ts | isolé | implementeur-tdd | vitest `sampler.test.ts` + `middle-pan.test.ts` : `Tests  36 passed (36)`, `paume souple (cancelTouchesOnPen: false) : le contact posé avant le stylet continue de tracer`, `souris au bouton du milieu : aucun geste` et `bouton du milieu : glisser déplace la vue du déplacement du pointeur` présents ; `verifier.sh : OK` | S2 | #tache-t34 |
| T35 | Routeur : outil main et espace maintenu (D17) | — | apps/web/src/engine/input/router.ts, apps/web/src/engine/input/router.test.ts, apps/web/src/engine/input/gesture.ts | isolé | implementeur-tdd | vitest `router.test.ts` : `Tests  20 passed (20)`, `outil main : stylet et souris déplacent la vue, aucun trait` présent ; `verifier.sh : OK` | S2 | #tache-t35 |
| T36 | Historique des images borné et résumé du banc dit (constats) | — | apps/web/src/proto/frame-loop.ts, apps/web/src/proto/frame-loop.test.ts, apps/web/src/app/banc.ts, apps/web/src/app/banc.test.ts | isolé | implementeur-tdd | vitest `frame-loop.test.ts` + `banc.test.ts` : `Tests  14 passed (14)`, `report(n) garde les n dernières images, pas les n premières` présent ; `verifier.sh : OK` (dont `prototype en fichier unique OK`) | S1 (rejoué) | #tache-t36 |
| T37 | Mesure de la copie du contour au-delà de 2 000 points | — | crates/roomboard-core/src/ink/builder.rs | isolé | implementeur-tdd | `cargo test -p roomboard-core --release --lib -- --ignored --nocapture long_stroke_push_cost` : `1 passed`, trois lignes `Mesure :` (2 000, 5 000, 10 000 points), p95 à 10 000 ≤ 4 ms ; `verifier.sh : OK` | S2 | #tache-t37 |
| T38 | Moteur : outil main, espace, caméra par page, plafond des images | T35, T36 | apps/web/src/engine/engine.ts, apps/web/src/engine/engine.test.ts, apps/web/src/engine/input/keys.ts, apps/web/src/engine/input/keys.test.ts | isolé | implementeur-tdd | vitest `engine.test.ts` + `keys.test.ts` : `Tests  34 passed (34)`, `caméra par page : chaque page garde sa vue` et `releaseKeys : espace relâché à la perte du focus` présents ; `verifier.sh : OK` | S2 | #tache-t38 |
| T39 | Script S2 lot 3b (quatre passages) et fiche « comparer les réglages » | — | scripts/essais/s2-navigateur.mjs, docs/essais/eni-stylet.md | isolé | implementeur-tdd | `node scripts/essais/s2-navigateur.mjs` : 16 `ok —`, `S2 lot 3 : OK`, code 0 ; `node scripts/essais/s2-navigateur.mjs --lot3b` : code 1, `S2 lot 3b : ÉCHEC — [defaut] #stage[data-echelons] absent` (rouge attendu avant T40) ; `verifier.sh : OK` | S2 | #tache-t39 |
| T40 | Amorce et barre : réglages branchés, S2 lot 3b vert, captures | T30, T31, T32, T33, T34, T35, T36, T38, T39 | apps/web/src/main.ts, apps/web/index.html, apps/web/src/app/barre.ts, apps/web/src/app/barre.test.ts, docs/essais/s2-lot3b-defaut.png, docs/essais/s2-lot3b-2.png, docs/essais/s2-lot3b-3.png, docs/essais/s2-lot3b-4.png | isolé | implementeur-tdd | vitest `barre.test.ts` : `Tests  10 passed (10)` ; `node scripts/essais/s2-navigateur.mjs` : `S2 lot 3 : OK` ; `node scripts/essais/s2-navigateur.mjs --lot3b --captures` : 4 lignes `S2 lot 3b [...] : OK` puis `S2 lot 3b : OK (4 passages)`, code 0, 4 captures ; `verifier.sh : OK` | S2 | #tache-t40 |
| T41 | Coque Linux : build Tauri après le build web, la coque trace | T40 | docs/essais/coque-linux-lot3b.png | isolé | orchestrateur | `verifier.sh : OK` puis `CARGO_BUILD_JOBS=2 … tauri build` : paquet `.deb` produit ; capture de la coque qui trace et annule | S5 (partie Linux) | #tache-t41 |

**Vagues** (aucune tâche d'une vague ne touche un fichier d'une autre ; trois places de tests par sujet, la quatrième
tâche d'une vague attend son jeton) :
**1** T30, T33, T34, T37 · **2** T31, T32, T35, T36 · **3** T38, T39 · **4** T40 · **5** T41 (orchestrateur).
T31, T32, T35, T36 et T39 ne dépendent de rien : elles peuvent monter d'une vague si une place se libère. T39 est rouge
en mode `--lot3b` tant que T40 n'est pas fusionnée (c'est sa preuve). T40 rejoue S2 et pose les captures.

**Preuve de fin de lot** (orchestrateur, sur `feat/socle-lot3b` après la vague 4) :
`cd /home/adminjd/projets/roomboard-wt/socle && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30`
→ `verifier.sh : OK` ; `cd /home/adminjd/projets/roomboard-wt/socle && node scripts/essais/s2-navigateur.mjs 2>&1 | tail -5`
→ `S2 lot 3 : OK` ; `cd /home/adminjd/projets/roomboard-wt/socle && node scripts/essais/s2-navigateur.mjs --lot3b 2>&1 | tail -60`
→ `S2 lot 3b : OK (4 passages)` ; `cd /home/adminjd/projets/roomboard-wt/socle && PATH=$HOME/.cargo/bin:$PATH cargo test -p roomboard-core --release --lib -- --ignored --nocapture long_stroke_push_cost 2>&1 | grep -E "Mesure|test result"`
→ trois `Mesure :`, `1 passed`. Puis T41.

## Carte des fichiers

| fichier | tâche | rôle |
|---|---|---|
| `apps/web/src/engine/settings.ts` (+ test) | T30 | `EngineSettings`, `DEFAULT_SETTINGS`, `parseSettings`, `settingsSearch`, `resolvePrediction`, `cycleSetting`, `needsReload`, `echelonsTag`, `settingLabel`, `createSettingsStore` |
| `apps/web/src/engine/input/predict.ts` (+ test) | T31 | `predictLinear`, `withLinearPrediction` (échelon 2) |
| `apps/web/src/engine/render/ink-trail.ts` (+ test) | T32 | `attachInkTrail` (échelon 3) |
| `apps/web/src/engine/render/webgl2.ts` (+ test) | T33 | `WebGL2LiveRenderer`, `parseColor`, `viewTransform`, `pageScissor`, `splitPolygons`, `thickPolyline`, `WEBGL2_CONTEXT` |
| `apps/web/src/engine/render/select.ts` (+ test) | T33 | `chooseRenderer` (échelon 4 ou repli Canvas 2D) |
| `apps/web/src/engine/render/fake-gl.ts` | T33 | `FakeGL`, `asGL` (faux contexte des tests, jamais importé par l'application) |
| `apps/web/src/engine/render/canvas2d.ts` (+ test) | T33 | canvas d'interaction facultatif (`null` sous WebGL2) ; `PEN_HALF_WIDTH` exporté |
| `apps/web/src/engine/input/sampler.ts` (+ test) | T34 | option `cancelTouchesOnPen` (paume) |
| `apps/web/src/engine/input/middle-pan.ts` (+ test) | T34 | `createMiddlePan` (bouton du milieu, D17) |
| `apps/web/src/engine/input/gesture.ts` | T35 | `ToolChoice = DrawTool \| "hand"` |
| `apps/web/src/engine/input/router.ts` (+ test) | T35 | `RouterDeps.currentTool(): ToolChoice`, `RouterDeps.panHeld?()` |
| `apps/web/src/proto/frame-loop.ts` (+ test) | T36 | `createFrameLoop(deps, onFrame, maxDurations?)` |
| `apps/web/src/app/banc.ts` (+ test) | T36 | `panelText` ; résumé « les 600 dernières images au plus » |
| `crates/roomboard-core/src/ink/builder.rs` | T37 | test de mesure `long_stroke_push_cost` (seuil écrit) |
| `apps/web/src/engine/engine.ts` (+ test) | T38 | `ToolChoice`, `keyUp`, `releaseKeys`, `panHeld`, `showPage`, `ENGINE_FRAME_HISTORY` |
| `apps/web/src/engine/input/keys.ts` (+ test) | T38 | `isPanKey` |
| `scripts/essais/s2-navigateur.mjs` | T39 | `--lot3b [--captures]` : quatre passages |
| `docs/essais/eni-stylet.md` | T39 | section « Lot 3b : comparer les réglages » |
| `apps/web/src/main.ts`, `apps/web/index.html` | T40 | amorce : réglages, décorateur, traînée, choix du rendu, bouton du milieu, espace ; `#reglages`, `data-echelons` |
| `apps/web/src/app/barre.ts` (+ test) | T40 | `barModel` (main, mode de gomme), `settingsModel`, `mountSettings` |
| `docs/essais/s2-lot3b-{defaut,2,3,4}.png` | T40 | captures S2 |
| `docs/essais/coque-linux-lot3b.png` | T41 | capture de la coque |

**Carte d'impact du cadrage, entrées du lot 3b.** `apps/web/src/engine/input/` (D18, D20, D39) → T31, T34, T35, T38
(`keys.ts`). `apps/web/src/engine/render/` (D19, D38) → T32, T33. `apps/web/src/engine/camera.ts` (D17) : **non
touché** ; la caméra par page vit dans le moteur (T38), qui appelle `fitPage`, `panBy`, `zoomAt` tels quels.
`apps/web/src/main.ts:1-22` (amorce) → T40 ; effet de bord « l'application démarre sur une page vide » : contrôle
`page vide au démarrage` du script S2, rejoué à chaque passage (T39, T40). `apps/web/index.html:10` (`touch-action:
none`) et `:15-16` (deux canvas) → T40, gardés. `apps/web/src/engine/tools/` : non touché (la gomme d'objet existe,
`Engine.setEraserMode`). `apps/web/src/toolbar.ts:1-24` : non touché (DA10 au lot 5), lu par T40 pour les libellés.
`apps/web/src/core/api.ts` : figé. `crates/` : un test de mesure seulement (T37). `apps/desktop` : non touché, construit
par T41. Constats de l'état : `banc.ts:99` et `frameDurations()` → T36 et T38 ; copie du contour au-delà de 2 000
points → T37.

**Tests à garder verts** (preuve `verifier.sh` de chaque tâche) : `toolbar.test.ts` (2) ; `sampler.test.ts` (26,
dont `souris au bouton du milieu : aucun geste` : T34 ne le change pas), `stats.test.ts`, `recorder.test.ts`,
`frame-loop.test.ts` (5), `polyline.test.ts` (lot 1) ; `fake-core.test.ts`, `wasm-core.contract.test.ts` (lot 2) ;
`camera.test.ts` (7), `keys.test.ts` (9), `router.test.ts` (14), `canvas2d.test.ts` (11), `engine.test.ts` (13),
`pen.test.ts` (10), `eraser.test.ts` (7), `banc.test.ts` (4), `barre.test.ts` (4, adapté par T40 aux nouveaux
boutons) ; `cargo test` du cœur (117 + 3 + 3, 1 ignoré) et de `roomboard-wasm` (14).

**Modules réutilisés** (liste du cadrage § 3 et code des lots 1 à 3) : `engine/input/sampler.ts` `createSampler`,
`SamplerOptions`, `PointerSurface`, `PointerLike`, `InputSample` (T31, T34, T40) ; `engine/input/router.ts`
`createRouter`, `RouterOptions` (T35, T40) ; `engine/camera.ts` `fitPage`, `panBy`, `zoomAt`, `Camera` (T33, T38) ;
`engine/input/keys.ts` `keyAction`, `KeyLike` (T38) ; `engine/render/canvas2d.ts` `Canvas2DRenderer`,
`createCanvas2DRenderer` (T33) ; `engine/engine.ts` `createEngine` (T38, T40) ; `app/barre.ts` `barModel`,
`mountBar` (T40) ; `scripts/essais/s2-navigateur.mjs` (T39) ; `engine/input/support.ts` `detectSupport` (T40) ;
`proto/frame-loop.ts` `createFrameLoop` (T36, T38) ; `ink/builder.rs` `StrokeBuilder` (T37). Le cadrage réserve
`setPointerCapture` et `getPredictedEvents` à `sampler.ts` : `middle-pan.ts` ne capture pas, `predict.ts` ne lit que
les `InputSample` du routeur. Chaque section les cite en ligne `Réutilise :`.

## Global Constraints (recopiées dans chaque section)

- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un. Pas de `--force`. Aucun `git tag`,
  aucune release.
- Aucun workflow GitHub Actions (`.github/workflows/` non touché, D35).
- Un seul build Tauri à la fois ; aucun build Android. Seule T41 (orchestrateur) lance un build Tauri.
- Tests : `scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH`, sous le jeton
  `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire socle/T<n> --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"`.
  Les commandes ciblées (`cargo test -p …`, `pnpm exec vitest run …`, `node scripts/essais/…`) passent sous le même jeton.
- Sous-agents relecteurs au premier plan (`run_in_background: false`).
- Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par la ligne
  exacte `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, quel que soit le modèle qui exécute.
- Aucun seuil baissé, aucun test désactivé, sauté (`.skip`, `.todo`, `#[ignore]` ajouté hors test de mesure) ni
  affaibli. Un test dont l'attendu change parce que la tâche étend le comportement (barre) garde ses contrôles et en
  ajoute.
- Dépôt public : aucun secret, jeton ni chemin personnel hors dépôt dans un fichier commité.
- `$WT` = dossier de travail donné par l'orchestrateur (par défaut `/home/adminjd/projets/roomboard-wt/socle--T<n>`).
  Worktree neuf : `cd "$WT" && pnpm install --frozen-lockfile` d'abord. `tsc` (dans `verifier.sh`) exige le module
  Wasm généré : lancer `verifier.sh` une fois avant de juger une erreur de type sur `./wasm/roomboard_wasm`.
- `apps/web/src/core/api.ts` est figé.
- Rien n'est écrit dans le document avant le relâché (D38) ; une écriture = une commande = une étape d'annulation.
- Moteur (`apps/web/src/engine/`) sans framework ; aucun global du DOM à l'exécution hors `render/canvas2d.ts`
  (`createCanvas2DRenderer`, `Path2D`), `input/support.ts`, et les méthodes des canvas reçus dans `render/select.ts`.
  `URLSearchParams` (standard URL, présent dans Node) est admis dans `settings.ts`.
- Le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif : aucun appel Tauri dans le moteur ;
  échelon 6 interdit ; échelon 5 au lot 5.
- Chaque réglage a un test allumé et un test éteint.
- Cœur : aucune horloge système ni dépendance au navigateur hors tests (D1) ; `cargo fmt` et `clippy -D warnings`
  passent (ils sont dans `verifier.sh`).
- TypeScript strict avec `noUncheckedIndexedAccess` : aucun `any`, aucun `!` sur un index ; `as unknown as` réservé
  aux faux objets des tests et aux événements de `PointerSurface` (patron de `sampler.ts`).

## Review Focus

- WebGL2 absent (contexte nul) ou programme refusé par le pilote : l'encre vive reste visible, au Canvas 2D, sans
  exception, et la barre le dit — DA9 échelon 4 → T33 `contexte WebGL2 nul : repli Canvas 2D, note dite`,
  `programme refusé : canvas remplacé par un clone, repli Canvas 2D, note avec la cause`, `shader refusé : le
  constructeur lève une Error WebGL2`.
- Lettre à boucle ou contour concave (« o », « e », « 8 ») sous WebGL2 : même remplissage « nonzero » que le Canvas 2D,
  aucun débord dans le creux — DA2 (seule l'implémentation change) → T33 `remplissage nonzero par stencil : couleur
  coupée pendant l'éventail, puis rectangle couvrant`.
- Espace maintenu puis fenêtre qui perd le focus (keyup jamais reçu), ou espace tapé dans un champ : la souris ne
  reste pas en déplacement de vue, le champ reçoit son espace — D17 → T38 `releaseKeys : espace relâché à la perte du
  focus`, `espace dans un champ de saisie : rien, la touche reste au champ` ; T38 (keys) `espace dans un champ ou
  pendant une composition IME : non`.
- Prédiction TS sur des échantillons de même horodatage ou un saut brusque : aucune queue projetée au loin — DA9
  échelon 2, D20 → T31 `même horodatage : aucune prédiction`, `queue bornée à 48 px`.
- Adresse mal écrite pour l'essai (`?echelons=5`, `6`, `3:auto`, `abc`) : les autres réglages s'appliquent, la valeur
  fautive garde son défaut, la barre dit pourquoi, rien ne casse — DA9 → T30 `échelons 1, 5 et 6 refusés avec leur
  raison ; valeurs inconnues ignorées, message rendu` ; T40 `notes du démarrage affichées après les boutons (adresse
  mal écrite, repli WebGL2)`.

## Hypothèses prises par ce plan (à revoir)

- **HL3b-1** Prédiction TS : vitesse entre le dernier échantillon et le plus ancien des 32 dernières ms ; deux points
  à 8 et 16 ms devant ; déplacement borné à 48 px CSS ; pression et inclinaison du dernier échantillon.
- **HL3b-2** `prediction: "on"` remplace aussi les prédits natifs (pour comparer à Edge samedi) ; `auto` ne l'allume
  que sans `getPredictedEvents`, donc sous WebKit, où rien n'a été mesuré.
- **HL3b-3** Les échelons 3 et 4 se règlent au chargement : les basculer dans la barre recharge la page (le dessin en
  cours est perdu, dit dans l'infobulle). L'échelon 2, la paume et le doigt changent à chaud.
- **HL3b-4** WebGL2 ne sert que le canvas d'interaction (DA9 « canvas d'interaction ») ; la scène reste au Canvas 2D.
  Queue prédite et aperçu de gomme en segments épais et disques de 12 côtés ; anticrénelage du contexte seulement.
- **HL3b-5** Perte du contexte WebGL2 en séance : non traitée (l'encre vive disparaît jusqu'au relâché, la scène reste
  au Canvas 2D) ; à reprendre si l'essai la montre.
- **HL3b-6** Espace et outil main sont lus au début du geste ; relâcher l'espace pendant un glisser le laisse finir en
  déplacement de vue.
- **HL3b-7** Caméra par page : une page jamais montrée est ajustée à la vue courante (`fitPage`) ; changer de page
  abandonne les gestes en cours sans écriture. Retirer la page montrée (lot 4) n'est pas traité ici.
- **HL3b-8** Historique des durées d'image du moteur borné à 3 600 (une minute à 60 Hz) : l'export JSON du banc porte
  ces 3 600 au plus, le panneau les 600 dernières.
- **HL3b-9** Seuil de la mesure du contour : `push` d'une image (4 points) à 10 000 points, p95 ≤ 4 ms en release
  native (environ 8 ms en Wasm, la moitié d'une image de 16 ms). Au-delà : aucune correction dans ce lot (`api.ts`
  figé) ; l'orchestrateur ajoute une tâche.
- **HL3b-10** Traînée déléguée : diamètre = épaisseur du stylo × zoom, couleur du stylo ; seulement pour l'outil stylo,
  hors espace, hors bouton gomme, hors doigt qui déplace la vue.
- **HL3b-11** Bouton du milieu sans `setPointerCapture` (le cadrage la réserve à `sampler.ts`) : la zone couvre la
  fenêtre ; relâché hors fenêtre, le glisser finit au premier mouvement de retour (`buttons` sans le bit 4).

---

<a id="tache-t30"></a>
### Tâche T30 — Module unique des réglages du moteur (`settings.ts`)

**Objectif.** Un seul endroit où se lisent les réglages du lot 3b : échelons 2 à 4 de DA9, paume (D18, D39) et doigt
(D18). L'adresse les donne au démarrage (`?echelons=`, `?paume=`, `?doigt=`), la barre les change ensuite (T40). Le
module dit aussi l'état effectif (l'échelon 2 en `auto` dépend des prédits natifs ; 3 et 4 de ce que le navigateur
accorde). Scénario : S2 (rejoué avec chaque réglage, T40).

**Fichiers.** Créer `apps/web/src/engine/settings.ts`, `apps/web/src/engine/settings.test.ts`.

**Interfaces.**
- Consomme : rien du lot.
- Réutilise : aucun module existant (nouveau, liste du cadrage § 3 : aucun module de réglages) ; `URLSearchParams`
  (standard URL).
- Produit : `type PredictionSetting = "auto" | "on" | "off"` ; `type Switch = "on" | "off"` ;
  `type PalmSetting = "strict" | "lenient"` ; `type FingerSetting = "pan" | "draw"` ;
  `interface EngineSettings { readonly prediction: PredictionSetting; readonly inkTrail: Switch; readonly webgl: Switch; readonly palm: PalmSetting; readonly finger: FingerSetting }` ;
  `type SettingKey = keyof EngineSettings` ; `DEFAULT_SETTINGS: EngineSettings` ;
  `SETTING_KEYS: readonly SettingKey[]` (ordre `finger, palm, prediction, inkTrail, webgl`) ;
  `needsReload(key: SettingKey): boolean` ;
  `interface ParsedSettings { readonly settings: EngineSettings; readonly errors: readonly string[] }` ;
  `parseSettings(search: string): ParsedSettings` ; `settingsSearch(s: EngineSettings, keep?: string): string` ;
  `resolvePrediction(setting: PredictionSetting, nativePredicted: boolean): boolean` ;
  `cycleSetting(s: EngineSettings, key: SettingKey): EngineSettings` ;
  `type InkTrailState = "on" | "off" | "absent" | "refused"` ; `type WebglState = "on" | "off" | "repli"` ;
  `interface EffectiveEchelons { readonly prediction: boolean; readonly inkTrail: InkTrailState; readonly webgl: WebglState }` ;
  `echelonsTag(e: EffectiveEchelons): string` (forme `2:on,3:absent,4:repli`, lue par S2 dans `#stage[data-echelons]`) ;
  `settingLabel(key: SettingKey, s: EngineSettings, e: EffectiveEchelons): string` ;
  `interface SettingsStore { get(): EngineSettings; set(next: EngineSettings): void; onChange(cb: (s: EngineSettings) => void): () => void }` ;
  `createSettingsStore(initial: EngineSettings): SettingsStore`.

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/engine/settings.test.ts --reporter=verbose 2>&1 | tail -25`
→ `Tests  14 passed (14)` ; noms `échelons 1, 5 et 6 refusés avec leur raison ; valeurs inconnues ignorées, message
rendu` et `défauts : prédiction auto, traînée et WebGL2 éteints, paume stricte, doigt qui déplace la vue` présents.
Puis `verifier.sh` (jeton) → `verifier.sh : OK`.

**Preuve visuelle.** Aucune (T40).

**Contraintes (recopiées de « Global Constraints »).** Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de `--force` ; aucun `git tag`, aucune release ; aucun workflow GitHub Actions (`.github/workflows/` non touché) ; un seul build Tauri à la fois, aucun build Android (aucun dans cette tâche) ; tests par `scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire socle/T30 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"` (commandes ciblées sous le même jeton) ; relecteurs au premier plan (`run_in_background: false`) ; commit d'auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par la ligne exacte `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, quel que soit le modèle qui exécute ; aucun seuil baissé, aucun test désactivé, sauté (`.skip`, `.todo`, `#[ignore]` hors test de mesure) ni affaibli ; dépôt public : aucun secret ni chemin personnel hors dépôt dans un fichier commité ; `$WT` = dossier donné par l'orchestrateur (défaut `/home/adminjd/projets/roomboard-wt/socle--T30`), worktree neuf : `cd "$WT" && pnpm install --frozen-lockfile` d'abord, `verifier.sh` une fois avant de juger une erreur de type sur `./wasm/roomboard_wasm` ; `apps/web/src/core/api.ts` figé ; rien n'est écrit dans le document avant le relâché (D38) ; moteur sans framework ni global du DOM (exceptions : `render/canvas2d.ts`, `input/support.ts`, méthodes des canvas reçus dans `render/select.ts` ; `URLSearchParams` admis dans `settings.ts`) ; le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif (aucun appel Tauri dans le moteur, échelon 6 interdit, échelon 5 au lot 5) ; chaque réglage a un test allumé et un test éteint ; cœur : aucune horloge ni dépendance au navigateur hors tests, `cargo fmt` et `clippy -D warnings` passent ; TypeScript strict (`noUncheckedIndexedAccess`) : aucun `any`, aucun `!` sur un index, `as unknown as` réservé aux faux objets des tests et aux événements de `PointerSurface`.

**Interdits.** Aucun import du DOM, de `../wasm/`, d'un framework. Ne pas toucher `main.ts`, la barre ni le routeur
(T35, T40). Pas de stockage local (`localStorage`) : l'adresse et la barre suffisent pour l'essai. Libellés
exactement ceux du code ci-dessous : T40 et S2 les lisent.

**Terminé quand.** 14 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : écart — module nouveau, aucun
module de réglages existant (cadrage § 3)`.

**Étapes.**

- [ ] **1. Écrire le test (rouge).** `apps/web/src/engine/settings.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  createSettingsStore,
  cycleSetting,
  DEFAULT_SETTINGS,
  echelonsTag,
  needsReload,
  parseSettings,
  resolvePrediction,
  SETTING_KEYS,
  settingLabel,
  settingsSearch,
  type EffectiveEchelons,
  type EngineSettings,
} from "./settings";

const OFF: EffectiveEchelons = { prediction: false, inkTrail: "off", webgl: "off" };

describe("réglages du moteur (lot 3b)", () => {
  it("défauts : prédiction auto, traînée et WebGL2 éteints, paume stricte, doigt qui déplace la vue", () => {
    expect(DEFAULT_SETTINGS).toEqual({ prediction: "auto", inkTrail: "off", webgl: "off", palm: "strict", finger: "pan" });
    expect(parseSettings("")).toEqual({ settings: DEFAULT_SETTINGS, errors: [] });
    expect(parseSettings("?banc")).toEqual({ settings: DEFAULT_SETTINGS, errors: [] });
  });

  it("échelon 2 : 2 et 2:on allument, 2:off éteint, 2:auto revient à auto", () => {
    expect(parseSettings("?echelons=2").settings.prediction).toBe("on");
    expect(parseSettings("?echelons=2:on").settings.prediction).toBe("on");
    expect(parseSettings("?echelons=2:off").settings.prediction).toBe("off");
    expect(parseSettings("?echelons=2:auto").settings.prediction).toBe("auto");
  });

  it("échelon 3 : 3 allume, 3:off éteint", () => {
    expect(parseSettings("?echelons=3").settings.inkTrail).toBe("on");
    expect(parseSettings("?echelons=3:off").settings.inkTrail).toBe("off");
  });

  it("échelon 4 : 4 allume, 4:off éteint", () => {
    expect(parseSettings("?echelons=4").settings.webgl).toBe("on");
    expect(parseSettings("?echelons=4:off").settings.webgl).toBe("off");
  });

  it("plusieurs échelons à la fois, majuscules et espaces admis ; aucun les éteint tous", () => {
    expect(parseSettings("?echelons=2, 4:ON").settings).toMatchObject({ prediction: "on", inkTrail: "off", webgl: "on" });
    expect(parseSettings("?echelons=2,3,4,aucun").settings).toMatchObject({ prediction: "off", inkTrail: "off", webgl: "off" });
  });

  it("paume : souple et strict", () => {
    expect(parseSettings("?paume=souple").settings.palm).toBe("lenient");
    expect(parseSettings("?paume=strict").settings.palm).toBe("strict");
  });

  it("doigt : trace et vue", () => {
    expect(parseSettings("?doigt=trace").settings.finger).toBe("draw");
    expect(parseSettings("?doigt=vue").settings.finger).toBe("pan");
  });

  it("échelons 1, 5 et 6 refusés avec leur raison ; valeurs inconnues ignorées, message rendu", () => {
    const r = parseSettings("?echelons=1,5,6,7,3:auto,2:vite,4:on:off&paume=molle&doigt=pied");
    expect(r.settings).toEqual(DEFAULT_SETTINGS);
    expect(r.errors).toEqual([
      "échelon 1 : toujours allumé, rien à régler",
      "échelon 5 : réglages de WebView2 dans la coque, lot 5",
      "échelon 6 : interdit (l'encre ne traverse jamais la frontière page ↔ Rust natif)",
      "échelon inconnu : 7",
      "valeur inconnue : 3:auto (on ou off)",
      "valeur inconnue : 2:vite (auto, on ou off)",
      "échelon mal écrit : 4:on:off",
      "paume inconnue : molle (strict ou souple)",
      "doigt inconnu : pied (vue ou trace)",
    ]);
  });

  it("settingsSearch : défauts → chaîne vide ; aller-retour exact pour toutes les combinaisons ; autres paramètres gardés", () => {
    expect(settingsSearch(DEFAULT_SETTINGS)).toBe("");
    expect(settingsSearch({ ...DEFAULT_SETTINGS, webgl: "on", finger: "draw" })).toBe("?echelons=4:on&doigt=trace");
    expect(settingsSearch({ ...DEFAULT_SETTINGS, webgl: "on" }, "?banc&echelons=2&paume=souple")).toBe("?banc=&echelons=4:on");
    for (const prediction of ["auto", "on", "off"] as const)
      for (const inkTrail of ["on", "off"] as const)
        for (const webgl of ["on", "off"] as const)
          for (const palm of ["strict", "lenient"] as const)
            for (const finger of ["pan", "draw"] as const) {
              const s: EngineSettings = { prediction, inkTrail, webgl, palm, finger };
              expect(parseSettings(settingsSearch(s))).toEqual({ settings: s, errors: [] });
            }
  });

  it("resolvePrediction : auto allumée seulement sans prédits natifs ; on et off forcent", () => {
    expect(resolvePrediction("auto", true)).toBe(false);
    expect(resolvePrediction("auto", false)).toBe(true);
    expect(resolvePrediction("on", true)).toBe(true);
    expect(resolvePrediction("off", false)).toBe(false);
  });

  it("cycleSetting : auto → on → off → auto ; les autres basculent", () => {
    const a = cycleSetting(DEFAULT_SETTINGS, "prediction");
    const b = cycleSetting(a, "prediction");
    expect([a.prediction, b.prediction, cycleSetting(b, "prediction").prediction]).toEqual(["on", "off", "auto"]);
    expect(cycleSetting(DEFAULT_SETTINGS, "inkTrail").inkTrail).toBe("on");
    expect(cycleSetting(DEFAULT_SETTINGS, "webgl").webgl).toBe("on");
    expect(cycleSetting(DEFAULT_SETTINGS, "palm").palm).toBe("lenient");
    expect(cycleSetting(DEFAULT_SETTINGS, "finger").finger).toBe("draw");
    expect(cycleSetting(cycleSetting(DEFAULT_SETTINGS, "finger"), "finger")).toEqual(DEFAULT_SETTINGS);
  });

  it("needsReload : seuls les échelons 3 et 4 rechargent la page", () => {
    expect(SETTING_KEYS).toEqual(["finger", "palm", "prediction", "inkTrail", "webgl"]);
    expect(SETTING_KEYS.filter((k) => needsReload(k))).toEqual(["inkTrail", "webgl"]);
  });

  it("echelonsTag et settingLabel disent l'état effectif", () => {
    expect(echelonsTag(OFF)).toBe("2:off,3:off,4:off");
    expect(echelonsTag({ prediction: true, inkTrail: "absent", webgl: "repli" })).toBe("2:on,3:absent,4:repli");
    const s = DEFAULT_SETTINGS;
    expect(settingLabel("prediction", s, OFF)).toBe("É2 prédiction : auto (éteinte)");
    expect(settingLabel("prediction", { ...s, prediction: "on" }, { ...OFF, prediction: true })).toBe("É2 prédiction : allumée");
    expect(settingLabel("inkTrail", s, OFF)).toBe("É3 traînée : éteinte");
    expect(settingLabel("inkTrail", s, { ...OFF, inkTrail: "absent" })).toBe("É3 traînée : sans effet (navigator.ink absent)");
    expect(settingLabel("webgl", s, OFF)).toBe("É4 WebGL2 : éteint");
    expect(settingLabel("webgl", s, { ...OFF, webgl: "repli" })).toBe("É4 WebGL2 : repli Canvas 2D");
    expect(settingLabel("palm", s, OFF)).toBe("Paume : stricte");
    expect(settingLabel("palm", { ...s, palm: "lenient" }, OFF)).toBe("Paume : souple");
    expect(settingLabel("finger", s, OFF)).toBe("Doigt : vue");
    expect(settingLabel("finger", { ...s, finger: "draw" }, OFF)).toBe("Doigt : trace");
  });

  it("store : set notifie une fois, rien si inchangé ; désabonnement", () => {
    const store = createSettingsStore(DEFAULT_SETTINGS);
    const seen: EngineSettings[] = [];
    const off = store.onChange((s) => seen.push(s));
    store.set({ ...DEFAULT_SETTINGS });
    expect(seen).toHaveLength(0);
    store.set({ ...DEFAULT_SETTINGS, finger: "draw" });
    expect(seen).toEqual([{ ...DEFAULT_SETTINGS, finger: "draw" }]);
    expect(store.get().finger).toBe("draw");
    off();
    store.set(DEFAULT_SETTINGS);
    expect(seen).toHaveLength(1);
    expect(store.get()).toEqual(DEFAULT_SETTINGS);
  });
});
```

- [ ] **2. Lancer, voir rouge.** `cd "$WT/apps/web" && pnpm exec vitest run src/engine/settings.test.ts 2>&1 | tail -8`
  → échec `Failed to resolve import "./settings"` (ou `Cannot find module`).

- [ ] **3. Écrire le module.** `apps/web/src/engine/settings.ts` :

```ts
/**
 * Réglages du moteur (lot 3b) : échelons 2 à 4 de DA9, paume (D18, D39) et doigt (D18). Seul endroit où ils se
 * lisent : l'adresse (`?echelons=`, `?paume=`, `?doigt=`) les donne au démarrage, la barre les change ensuite.
 * Échelon 1 toujours allumé ; échelon 5 (WebView2) au lot 5 ; échelon 6 interdit (le chemin de l'encre ne traverse
 * jamais la frontière page ↔ Rust natif). Défauts : un échelon que rien de mesuré ne demande est éteint (S1, OC56, OC66).
 */

export type PredictionSetting = "auto" | "on" | "off";
export type Switch = "on" | "off";
export type PalmSetting = "strict" | "lenient";
export type FingerSetting = "pan" | "draw";

export interface EngineSettings {
  /** Échelon 2 : prédiction linéaire en TS ; auto = allumée seulement si `getPredictedEvents` manque (WebKit). */
  readonly prediction: PredictionSetting;
  /** Échelon 3 : traînée déléguée `navigator.ink`. */
  readonly inkTrail: Switch;
  /** Échelon 4 : canvas d'interaction en WebGL2. */
  readonly webgl: Switch;
  /** Paume posée avant le stylet : strict = son geste est annulé quand le stylet touche (écart accepté T1). */
  readonly palm: PalmSetting;
  /** Doigt seul après un stylet vu : pan = déplace la vue (D18), draw = trace. */
  readonly finger: FingerSetting;
}

export type SettingKey = keyof EngineSettings;

export const DEFAULT_SETTINGS: EngineSettings = {
  prediction: "auto",
  inkTrail: "off",
  webgl: "off",
  palm: "strict",
  finger: "pan",
};

/** Ordre de la barre : réglages à chaud d'abord, puis les échelons. */
export const SETTING_KEYS: readonly SettingKey[] = ["finger", "palm", "prediction", "inkTrail", "webgl"];

/** Réglages pris au chargement (présentateur d'encre, contexte du canvas) : les changer recharge la page. */
export function needsReload(key: SettingKey): boolean {
  return key === "inkTrail" || key === "webgl";
}

export interface ParsedSettings {
  readonly settings: EngineSettings;
  readonly errors: readonly string[];
}

const PALM_WORDS: Record<string, PalmSetting> = { strict: "strict", souple: "lenient" };
const FINGER_WORDS: Record<string, FingerSetting> = { vue: "pan", trace: "draw" };

/**
 * Lit `?echelons=2,3:on,4:off&paume=souple&doigt=trace`. Un échelon seul vaut `on` ; `aucun` éteint 2, 3 et 4. Une
 * valeur fautive garde son défaut et ajoute un message (affiché par la barre) ; les autres paramètres sont ignorés.
 */
export function parseSettings(search: string): ParsedSettings {
  const params = new URLSearchParams(search);
  const errors: string[] = [];
  let prediction = DEFAULT_SETTINGS.prediction;
  let inkTrail = DEFAULT_SETTINGS.inkTrail;
  let webgl = DEFAULT_SETTINGS.webgl;
  let palm = DEFAULT_SETTINGS.palm;
  let finger = DEFAULT_SETTINGS.finger;
  const echelons = params.get("echelons");
  if (echelons !== null) {
    for (const raw of echelons.split(",")) {
      const token = raw.trim().toLowerCase();
      if (token === "") continue;
      if (token === "aucun") {
        prediction = "off";
        inkTrail = "off";
        webgl = "off";
        continue;
      }
      const [num, value = "on", extra] = token.split(":");
      if (extra !== undefined) {
        errors.push(`échelon mal écrit : ${token}`);
      } else if (num === "2") {
        if (value === "auto" || value === "on" || value === "off") prediction = value;
        else errors.push(`valeur inconnue : ${token} (auto, on ou off)`);
      } else if (num === "3" || num === "4") {
        if (value === "on" || value === "off") {
          if (num === "3") inkTrail = value;
          else webgl = value;
        } else errors.push(`valeur inconnue : ${token} (on ou off)`);
      } else if (num === "1") {
        errors.push("échelon 1 : toujours allumé, rien à régler");
      } else if (num === "5") {
        errors.push("échelon 5 : réglages de WebView2 dans la coque, lot 5");
      } else if (num === "6") {
        errors.push("échelon 6 : interdit (l'encre ne traverse jamais la frontière page ↔ Rust natif)");
      } else {
        errors.push(`échelon inconnu : ${token}`);
      }
    }
  }
  const p = params.get("paume");
  if (p !== null) {
    const v = PALM_WORDS[p.trim().toLowerCase()];
    if (v) palm = v;
    else errors.push(`paume inconnue : ${p} (strict ou souple)`);
  }
  const d = params.get("doigt");
  if (d !== null) {
    const v = FINGER_WORDS[d.trim().toLowerCase()];
    if (v) finger = v;
    else errors.push(`doigt inconnu : ${d} (vue ou trace)`);
  }
  return { settings: { prediction, inkTrail, webgl, palm, finger }, errors };
}

/**
 * Adresse qui redonne ces réglages au chargement : seuls les écarts au défaut y figurent ; les autres paramètres de
 * `keep` (par exemple `?banc`) sont gardés, devant. Défauts et rien à garder : chaîne vide.
 */
export function settingsSearch(s: EngineSettings, keep = ""): string {
  const params = new URLSearchParams(keep);
  params.delete("echelons");
  params.delete("paume");
  params.delete("doigt");
  const parts: string[] = [];
  const rest = params.toString();
  if (rest !== "") parts.push(rest);
  const tokens: string[] = [];
  if (s.prediction !== DEFAULT_SETTINGS.prediction) tokens.push(`2:${s.prediction}`);
  if (s.inkTrail !== DEFAULT_SETTINGS.inkTrail) tokens.push(`3:${s.inkTrail}`);
  if (s.webgl !== DEFAULT_SETTINGS.webgl) tokens.push(`4:${s.webgl}`);
  if (tokens.length > 0) parts.push(`echelons=${tokens.join(",")}`);
  if (s.palm !== DEFAULT_SETTINGS.palm) parts.push("paume=souple");
  if (s.finger !== DEFAULT_SETTINGS.finger) parts.push("doigt=trace");
  return parts.length === 0 ? "" : `?${parts.join("&")}`;
}

/** Échelon 2 effectif : `auto` l'allume seulement là où le navigateur ne donne aucun point prédit. */
export function resolvePrediction(setting: PredictionSetting, nativePredicted: boolean): boolean {
  if (setting === "on") return true;
  if (setting === "off") return false;
  return !nativePredicted;
}

/** Valeur suivante d'un réglage (bouton de la barre). */
export function cycleSetting(s: EngineSettings, key: SettingKey): EngineSettings {
  switch (key) {
    case "prediction":
      return { ...s, prediction: s.prediction === "auto" ? "on" : s.prediction === "on" ? "off" : "auto" };
    case "inkTrail":
      return { ...s, inkTrail: s.inkTrail === "on" ? "off" : "on" };
    case "webgl":
      return { ...s, webgl: s.webgl === "on" ? "off" : "on" };
    case "palm":
      return { ...s, palm: s.palm === "strict" ? "lenient" : "strict" };
    case "finger":
      return { ...s, finger: s.finger === "pan" ? "draw" : "pan" };
  }
}

export type InkTrailState = "on" | "off" | "absent" | "refused";
export type WebglState = "on" | "off" | "repli";

/** État effectif des échelons après le démarrage (ce que le navigateur a accordé). */
export interface EffectiveEchelons {
  readonly prediction: boolean;
  readonly inkTrail: InkTrailState;
  readonly webgl: WebglState;
}

/** Forme lue par le script S2 dans `#stage[data-echelons]`. */
export function echelonsTag(e: EffectiveEchelons): string {
  return `2:${e.prediction ? "on" : "off"},3:${e.inkTrail},4:${e.webgl}`;
}

const INK_LABELS: Record<InkTrailState, string> = {
  on: "allumée",
  off: "éteinte",
  absent: "sans effet (navigator.ink absent)",
  refused: "refusée par le navigateur",
};

const WEBGL_LABELS: Record<WebglState, string> = { on: "allumé", off: "éteint", repli: "repli Canvas 2D" };

/** Libellé d'un bouton de réglage (barre, T40). */
export function settingLabel(key: SettingKey, s: EngineSettings, e: EffectiveEchelons): string {
  switch (key) {
    case "finger":
      return s.finger === "pan" ? "Doigt : vue" : "Doigt : trace";
    case "palm":
      return s.palm === "strict" ? "Paume : stricte" : "Paume : souple";
    case "prediction": {
      const state = e.prediction ? "allumée" : "éteinte";
      return s.prediction === "auto" ? `É2 prédiction : auto (${state})` : `É2 prédiction : ${state}`;
    }
    case "inkTrail":
      return `É3 traînée : ${INK_LABELS[e.inkTrail]}`;
    case "webgl":
      return `É4 WebGL2 : ${WEBGL_LABELS[e.webgl]}`;
  }
}

export interface SettingsStore {
  get(): EngineSettings;
  /** Remplace les réglages ; notifie seulement si une valeur change. */
  set(next: EngineSettings): void;
  onChange(cb: (s: EngineSettings) => void): () => void;
}

export function createSettingsStore(initial: EngineSettings): SettingsStore {
  let current = initial;
  const listeners = new Set<(s: EngineSettings) => void>();
  return {
    get: () => current,
    set(next) {
      if (SETTING_KEYS.every((k) => next[k] === current[k])) return;
      current = next;
      for (const cb of listeners) cb(current);
    },
    onChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
  };
}
```

- [ ] **4. Lancer, voir vert.** Même commande qu'au § Test → `Tests  14 passed (14)`, les deux noms présents.

- [ ] **5. Suite complète.** `verifier.sh` sous le jeton (§ Contraintes) → `verifier.sh : OK`.

- [ ] **6. Commit.**

```bash
cd "$WT" && git add apps/web/src/engine/settings.ts apps/web/src/engine/settings.test.ts
cd "$WT" && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(engine): single settings module for DA9 rungs, palm and finger" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t31"></a>
### Tâche T31 — Échelon 2 : prédiction linéaire en TS (décorateur du `GestureSink`)

**Objectif.** Échelon 2 de DA9 : là où `getPredictedEvents` manque (WebKit), une queue prédite calculée en TS par
extrapolation linéaire des derniers échantillons, dessinée par le stylo comme les prédits natifs (D20 : jamais
enregistrée). Branchée comme décorateur du `GestureSink` entre le routeur et le moteur : routeur, outils et moteur ne
changent pas. Le réglage (`enabled`) est lu à chaque image, donc basculable à chaud. Scénario : S2 (passage
`?echelons=2`, T40).

**Fichiers.** Créer `apps/web/src/engine/input/predict.ts`, `apps/web/src/engine/input/predict.test.ts`.

**Interfaces.**
- Consomme : rien du lot (T40 lui passe `enabled = () => resolvePrediction(settings.get().prediction, support.predicted)`
  de T30).
- Réutilise : `apps/web/src/engine/input/gesture.ts` — `GestureSink { begin(pointerId, tool: DrawTool, samples); extend(pointerId, samples, predicted); close(pointerId, how: CloseReason) }` ;
  `apps/web/src/engine/input/sampler.ts:7-14` — `InputSample { x, y, pressure, tiltX, tiltY, t }` (px CSS relatifs à
  la zone, `t` en ms).
- Produit : `PREDICT_HORIZON_MS = 16`, `PREDICT_WINDOW_MS = 32`, `PREDICT_POINTS = 2`, `PREDICT_MAX_PX = 48` ;
  `interface PredictOptions { readonly horizonMs: number; readonly windowMs: number; readonly points: number; readonly maxPx: number }` ;
  `DEFAULT_PREDICT: PredictOptions` ;
  `predictLinear(history: readonly InputSample[], o?: PredictOptions): InputSample[]` ;
  `withLinearPrediction(sink: GestureSink, enabled: () => boolean, o?: PredictOptions): GestureSink`.

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/engine/input/predict.test.ts --reporter=verbose 2>&1 | tail -25`
→ `Tests  12 passed (12)` ; noms `queue bornée à 48 px`, `même horodatage : aucune prédiction`, `allumée : remplace
les prédits natifs par l'extrapolation` et `éteinte : prédits natifs transmis tels quels` présents. Puis
`verifier.sh` (jeton) → `verifier.sh : OK`.

**Preuve visuelle.** Aucune (passage `?echelons=2` de S2 en T40).

**Contraintes (recopiées de « Global Constraints »).** Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de `--force` ; aucun `git tag`, aucune release ; aucun workflow GitHub Actions (`.github/workflows/` non touché) ; un seul build Tauri à la fois, aucun build Android (aucun dans cette tâche) ; tests par `scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire socle/T31 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"` (commandes ciblées sous le même jeton) ; relecteurs au premier plan (`run_in_background: false`) ; commit d'auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par la ligne exacte `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, quel que soit le modèle qui exécute ; aucun seuil baissé, aucun test désactivé, sauté (`.skip`, `.todo`, `#[ignore]` hors test de mesure) ni affaibli ; dépôt public : aucun secret ni chemin personnel hors dépôt dans un fichier commité ; `$WT` = dossier donné par l'orchestrateur (défaut `/home/adminjd/projets/roomboard-wt/socle--T31`), worktree neuf : `cd "$WT" && pnpm install --frozen-lockfile` d'abord, `verifier.sh` une fois avant de juger une erreur de type sur `./wasm/roomboard_wasm` ; `apps/web/src/core/api.ts` figé ; rien n'est écrit dans le document avant le relâché (D38) ; moteur sans framework ni global du DOM (exceptions : `render/canvas2d.ts`, `input/support.ts`, méthodes des canvas reçus dans `render/select.ts` ; `URLSearchParams` admis dans `settings.ts`) ; le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif (aucun appel Tauri dans le moteur, échelon 6 interdit, échelon 5 au lot 5) ; chaque réglage a un test allumé et un test éteint ; cœur : aucune horloge ni dépendance au navigateur hors tests, `cargo fmt` et `clippy -D warnings` passent ; TypeScript strict (`noUncheckedIndexedAccess`) : aucun `any`, aucun `!` sur un index, `as unknown as` réservé aux faux objets des tests et aux événements de `PointerSurface`.

**Interdits.** Ne pas lire `getPredictedEvents` ni `PointerEvent` ici (cadrage § 3 : seulement `sampler.ts`). Ne pas
toucher `router.ts`, `pen.ts`, `engine.ts`, `sampler.ts`. Aucun import du DOM. Aucune écriture dans le document.

**Terminé quand.** 12 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : appelé GestureSink (gesture.ts),
InputSample (sampler.ts)`.

**Étapes.**

- [ ] **1. Écrire le test (rouge).** `apps/web/src/engine/input/predict.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { GestureSink } from "./gesture";
import { PREDICT_MAX_PX, predictLinear, withLinearPrediction } from "./predict";
import type { InputSample } from "./sampler";

const s = (x: number, y: number, t: number, pressure = 0.5): InputSample => ({ x, y, pressure, tiltX: 0, tiltY: 0, t });
const xs = (out: readonly InputSample[]): number[][] => out.map((p) => [p.x, p.y, p.t]);

function spy() {
  const calls: { id: number; samples: readonly InputSample[]; predicted: readonly InputSample[] }[] = [];
  const log: string[] = [];
  const sink: GestureSink = {
    begin: (id, tool, samples) => log.push(`begin ${id} ${tool} ${samples.length}`),
    extend: (id, samples, predicted) => calls.push({ id, samples, predicted }),
    close: (id, how) => log.push(`close ${id} ${how}`),
  };
  return { sink, calls, log };
}

describe("predictLinear (échelon 2)", () => {
  it("vitesse constante : deux points à 8 et 16 ms devant le dernier", () => {
    expect(xs(predictLinear([s(0, 0, 0), s(10, 5, 10)]))).toEqual([
      [18, 9, 18],
      [26, 13, 26],
    ]);
  });

  it("fenêtre de 32 ms : un échantillon plus ancien n'entre pas dans la vitesse", () => {
    expect(xs(predictLinear([s(0, 0, 0), s(100, 0, 50), s(110, 0, 60)]))).toEqual([
      [118, 0, 68],
      [126, 0, 76],
    ]);
  });

  it("même horodatage : aucune prédiction", () => {
    expect(predictLinear([s(0, 0, 5), s(4, 0, 5)])).toEqual([]);
  });

  it("un seul échantillon ou aucun : aucune prédiction", () => {
    expect(predictLinear([s(1, 1, 1)])).toEqual([]);
    expect(predictLinear([])).toEqual([]);
  });

  it("queue bornée à 48 px", () => {
    expect(PREDICT_MAX_PX).toBe(48);
    const out = predictLinear([s(0, 0, 0), s(100, 0, 10)]);
    expect(out).toHaveLength(2);
    expect(out[0]?.x).toBeCloseTo(124);
    expect(out[1]?.x).toBeCloseTo(148);
  });

  it("pression et inclinaison du dernier échantillon recopiées", () => {
    const last: InputSample = { x: 4, y: 0, pressure: 0.8, tiltX: 30, tiltY: -10, t: 4 };
    const out = predictLinear([s(0, 0, 0, 0.2), last]);
    expect(out).toHaveLength(2);
    for (const p of out) expect([p.pressure, p.tiltX, p.tiltY]).toEqual([0.8, 30, -10]);
  });
});

describe("withLinearPrediction (échelon 2 derrière le réglage)", () => {
  it("allumée : remplace les prédits natifs par l'extrapolation", () => {
    const { sink, calls } = spy();
    const g = withLinearPrediction(sink, () => true);
    g.begin(1, "pen", [s(0, 0, 0)]);
    g.extend(1, [s(10, 0, 10)], [s(99, 99, 11)]);
    expect(xs(calls[0]?.predicted ?? [])).toEqual([
      [18, 0, 18],
      [26, 0, 26],
    ]);
  });

  it("éteinte : prédits natifs transmis tels quels", () => {
    const { sink, calls } = spy();
    const native = [s(99, 99, 11)];
    const g = withLinearPrediction(sink, () => false);
    g.begin(1, "pen", [s(0, 0, 0)]);
    g.extend(1, [s(10, 0, 10)], native);
    expect(calls[0]?.predicted).toBe(native);
  });

  it("réglage lu à chaque image : bascule à chaud", () => {
    const { sink, calls } = spy();
    let on = false;
    const native = [s(99, 99, 11)];
    const g = withLinearPrediction(sink, () => on);
    g.begin(1, "pen", [s(0, 0, 0)]);
    g.extend(1, [s(10, 0, 10)], native);
    on = true;
    g.extend(1, [s(20, 0, 20)], native);
    expect(calls[0]?.predicted).toBe(native);
    expect(xs(calls[1]?.predicted ?? [])).toEqual([
      [28, 0, 28],
      [36, 0, 36],
    ]);
  });

  it("image sans échantillon nouveau : aucune queue", () => {
    const { sink, calls } = spy();
    const g = withLinearPrediction(sink, () => true);
    g.begin(1, "pen", [s(0, 0, 0)]);
    g.extend(1, [s(10, 0, 10)], []);
    g.extend(1, [], []);
    expect(calls[1]?.predicted).toEqual([]);
  });

  it("close : historique oublié, un nouveau geste ne reprend pas l'ancien", () => {
    const { sink, calls } = spy();
    const g = withLinearPrediction(sink, () => true);
    g.begin(1, "pen", [s(0, 0, 0)]);
    g.extend(1, [s(10, 0, 10)], []);
    g.close(1, "end");
    g.begin(1, "pen", [s(100, 0, 20)]);
    g.extend(1, [s(110, 0, 30)], []);
    expect(xs(calls[1]?.predicted ?? [])).toEqual([
      [118, 0, 38],
      [126, 0, 46],
    ]);
  });

  it("begin et close transmis tels quels (outil, raison) ; échantillons transmis sans copie", () => {
    const { sink, calls, log } = spy();
    const g = withLinearPrediction(sink, () => true);
    g.begin(2, "eraser", [s(0, 0, 0)]);
    const more = [s(1, 0, 1)];
    g.extend(2, more, []);
    g.close(2, "cancel");
    expect(log).toEqual(["begin 2 eraser 1", "close 2 cancel"]);
    expect(calls[0]?.samples).toBe(more);
  });
});
```

- [ ] **2. Lancer, voir rouge.** `cd "$WT/apps/web" && pnpm exec vitest run src/engine/input/predict.test.ts 2>&1 | tail -8`
  → échec `Failed to resolve import "./predict"`.

- [ ] **3. Écrire le module.** `apps/web/src/engine/input/predict.ts` :

```ts
/**
 * Échelon 2 de DA9 : prédiction linéaire en TS, pour les navigateurs sans `getPredictedEvents` (WebKit). Les points
 * prédits sont dessinés en queue provisoire par le stylo, jamais enregistrés (D20). Décorateur du GestureSink : le
 * routeur, les outils et le moteur ne changent pas. Allumée : elle remplace les prédits natifs (comparaison sous Edge,
 * HL3b-2) ; éteinte : les prédits natifs passent tels quels.
 */
import type { GestureSink } from "./gesture";
import type { InputSample } from "./sampler";

export const PREDICT_HORIZON_MS = 16;
export const PREDICT_WINDOW_MS = 32;
export const PREDICT_POINTS = 2;
export const PREDICT_MAX_PX = 48;
/** Échantillons gardés par pointeur : assez pour couvrir la fenêtre à 240 Hz fusionnés. */
const HISTORY = 8;

export interface PredictOptions {
  readonly horizonMs: number;
  readonly windowMs: number;
  readonly points: number;
  readonly maxPx: number;
}

export const DEFAULT_PREDICT: PredictOptions = {
  horizonMs: PREDICT_HORIZON_MS,
  windowMs: PREDICT_WINDOW_MS,
  points: PREDICT_POINTS,
  maxPx: PREDICT_MAX_PX,
};

/**
 * Extrapole depuis le dernier échantillon, à la vitesse mesurée entre lui et le plus ancien de la fenêtre. Aucune
 * prédiction sans durée positive ou sur une vitesse non finie ; déplacement total borné à `maxPx`.
 */
export function predictLinear(history: readonly InputSample[], o: PredictOptions = DEFAULT_PREDICT): InputSample[] {
  const last = history[history.length - 1];
  if (!last) return [];
  let ref: InputSample | undefined;
  for (let i = history.length - 2; i >= 0; i--) {
    const h = history[i];
    if (!h) continue;
    if (last.t - h.t > o.windowMs) break;
    ref = h;
  }
  if (!ref) return [];
  const dt = last.t - ref.t;
  if (!(dt > 0)) return [];
  const vx = (last.x - ref.x) / dt;
  const vy = (last.y - ref.y) / dt;
  if (!Number.isFinite(vx) || !Number.isFinite(vy)) return [];
  const full = Math.hypot(vx, vy) * o.horizonMs;
  const scale = full > o.maxPx ? o.maxPx / full : 1;
  const out: InputSample[] = [];
  for (let k = 1; k <= o.points; k++) {
    const ahead = (o.horizonMs * k) / o.points;
    out.push({
      x: last.x + vx * ahead * scale,
      y: last.y + vy * ahead * scale,
      pressure: last.pressure,
      tiltX: last.tiltX,
      tiltY: last.tiltY,
      t: last.t + ahead,
    });
  }
  return out;
}

/** Décore un GestureSink : `enabled()` est lu à chaque `extend` (réglage à chaud). */
export function withLinearPrediction(
  sink: GestureSink,
  enabled: () => boolean,
  o: PredictOptions = DEFAULT_PREDICT,
): GestureSink {
  const histories = new Map<number, InputSample[]>();
  const remember = (pointerId: number, samples: readonly InputSample[]): InputSample[] => {
    const h = histories.get(pointerId) ?? [];
    for (const smp of samples) {
      if (Number.isFinite(smp.x) && Number.isFinite(smp.y) && Number.isFinite(smp.t)) h.push(smp);
    }
    if (h.length > HISTORY) h.splice(0, h.length - HISTORY);
    histories.set(pointerId, h);
    return h;
  };
  return {
    begin(pointerId, tool, samples) {
      histories.delete(pointerId);
      remember(pointerId, samples);
      sink.begin(pointerId, tool, samples);
    },
    extend(pointerId, samples, predicted) {
      const h = remember(pointerId, samples);
      if (!enabled()) {
        sink.extend(pointerId, samples, predicted);
        return;
      }
      sink.extend(pointerId, samples, samples.length > 0 ? predictLinear(h, o) : []);
    },
    close(pointerId, how) {
      histories.delete(pointerId);
      sink.close(pointerId, how);
    },
  };
}
```

- [ ] **4. Lancer, voir vert.** Même commande qu'au § Test → `Tests  12 passed (12)`, les quatre noms présents.

- [ ] **5. Suite complète.** `verifier.sh` sous le jeton → `verifier.sh : OK`.

- [ ] **6. Commit.**

```bash
cd "$WT" && git add apps/web/src/engine/input/predict.ts apps/web/src/engine/input/predict.test.ts
cd "$WT" && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(input): linear prediction in TS behind a setting (DA9 rung 2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t32"></a>
### Tâche T32 — Échelon 3 : traînée déléguée `navigator.ink`

**Objectif.** Échelon 3 de DA9 : sous Chromium Windows, le système dessine la pointe devant l'encre du moteur
(`navigator.ink.requestPresenter`, `updateInkTrailStartPoint` à chaque `pointermove`). Éteint par défaut ; allumé et
l'API absente : sans effet, et dit (`status: "absent"`). Le moteur n'en sait rien : la page (T40) branche ce module sur
la zone de dessin. Scénario : S2 (passage `?echelons=3`, T40).

**Fichiers.** Créer `apps/web/src/engine/render/ink-trail.ts`, `apps/web/src/engine/render/ink-trail.test.ts`.

**Interfaces.**
- Consomme : rien du lot. Son `InkTrailStatus` a les mêmes valeurs que `InkTrailState` de T30 (`"on" | "off" |
  "absent" | "refused"`) : T40 passe l'un à l'autre.
- Réutilise : `apps/web/src/proto/stylet.ts:19-24` — formes `InkPresenterLike`, `InkLike` du banc du lot 1 (reprises
  ici, exportées ; `stylet.ts` n'est pas modifié) et `:156-167` (`setupInkTrail`, patron de la demande du présentateur
  sur le canvas d'interaction).
- Produit : `interface InkTrailStyle { readonly color: string; readonly diameter: number }` ;
  `interface InkPresenterLike { updateInkTrailStartPoint(evt: PointerEvent, style: InkTrailStyle): void }` ;
  `interface InkLike { requestPresenter(param?: { presentationArea?: Element | null }): Promise<InkPresenterLike> }` ;
  `interface TrailEvent { readonly pointerType: string; readonly buttons: number }` ;
  `interface InkTrailDeps { readonly enabled: boolean; readonly ink: InkLike | undefined; readonly area: Element; readonly surface: { addEventListener(type: string, l: (e: Event) => void): void; removeEventListener(type: string, l: (e: Event) => void): void }; styleFor(e: TrailEvent): InkTrailStyle | null }` ;
  `type InkTrailStatus = "on" | "off" | "absent" | "refused"` ;
  `interface InkTrail { readonly status: InkTrailStatus; failures(): number; dispose(): void }` ;
  `attachInkTrail(deps: InkTrailDeps): Promise<InkTrail>`.

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/engine/render/ink-trail.test.ts --reporter=verbose 2>&1 | tail -20`
→ `Tests  8 passed (8)` ; noms `réglage éteint : statut off, présentateur jamais demandé, aucun écouteur` et `API
absente : statut absent, aucun écouteur` présents. Puis `verifier.sh` (jeton) → `verifier.sh : OK`.

**Preuve visuelle.** Aucune (S2 en T40 ; la pointe déléguée ne se voit que sous Windows, essai de samedi).

**Contraintes (recopiées de « Global Constraints »).** Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de `--force` ; aucun `git tag`, aucune release ; aucun workflow GitHub Actions (`.github/workflows/` non touché) ; un seul build Tauri à la fois, aucun build Android (aucun dans cette tâche) ; tests par `scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire socle/T32 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"` (commandes ciblées sous le même jeton) ; relecteurs au premier plan (`run_in_background: false`) ; commit d'auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par la ligne exacte `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, quel que soit le modèle qui exécute ; aucun seuil baissé, aucun test désactivé, sauté (`.skip`, `.todo`, `#[ignore]` hors test de mesure) ni affaibli ; dépôt public : aucun secret ni chemin personnel hors dépôt dans un fichier commité ; `$WT` = dossier donné par l'orchestrateur (défaut `/home/adminjd/projets/roomboard-wt/socle--T32`), worktree neuf : `cd "$WT" && pnpm install --frozen-lockfile` d'abord, `verifier.sh` une fois avant de juger une erreur de type sur `./wasm/roomboard_wasm` ; `apps/web/src/core/api.ts` figé ; rien n'est écrit dans le document avant le relâché (D38) ; moteur sans framework ni global du DOM (exceptions : `render/canvas2d.ts`, `input/support.ts`, méthodes des canvas reçus dans `render/select.ts` ; `URLSearchParams` admis dans `settings.ts`) ; le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif (aucun appel Tauri dans le moteur, échelon 6 interdit, échelon 5 au lot 5) ; chaque réglage a un test allumé et un test éteint ; cœur : aucune horloge ni dépendance au navigateur hors tests, `cargo fmt` et `clippy -D warnings` passent ; TypeScript strict (`noUncheckedIndexedAccess`) : aucun `any`, aucun `!` sur un index, `as unknown as` réservé aux faux objets des tests et aux événements de `PointerSurface`.

**Interdits.** Aucun accès à `navigator` ni à `window` dans ce fichier : `ink` est passé par la page. Ne pas modifier
`proto/stylet.ts`. Une exception de `updateInkTrailStartPoint` ne remonte jamais (comptée).

**Terminé quand.** 8 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : appelé formes InkLike /
InkPresenterLike de proto/stylet.ts (recopiées et exportées, stylet.ts inchangé)` ou `écart — <pourquoi>`.

**Étapes.**

- [ ] **1. Écrire le test (rouge).** `apps/web/src/engine/render/ink-trail.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  attachInkTrail,
  type InkLike,
  type InkPresenterLike,
  type InkTrailDeps,
  type InkTrailStyle,
  type TrailEvent,
} from "./ink-trail";

class Surface {
  readonly handlers = new Map<string, Set<(e: Event) => void>>();
  addEventListener(type: string, l: (e: Event) => void): void {
    const set = this.handlers.get(type) ?? new Set<(e: Event) => void>();
    set.add(l);
    this.handlers.set(type, set);
  }
  removeEventListener(type: string, l: (e: Event) => void): void {
    this.handlers.get(type)?.delete(l);
  }
  count(): number {
    let n = 0;
    for (const set of this.handlers.values()) n += set.size;
    return n;
  }
  move(e: TrailEvent): void {
    for (const l of this.handlers.get("pointermove") ?? []) l(e as unknown as Event);
  }
}

const AREA = { id: "interaction" } as unknown as Element;
const STYLE: InkTrailStyle = { color: "#000000", diameter: 4 };

function setup(over: Partial<InkTrailDeps> = {}) {
  const surface = new Surface();
  const updates: InkTrailStyle[] = [];
  const asked: unknown[] = [];
  const presenter: InkPresenterLike = {
    updateInkTrailStartPoint: (_e, style) => {
      updates.push(style);
    },
  };
  const ink: InkLike = {
    requestPresenter: async (p) => {
      asked.push(p?.presentationArea);
      return presenter;
    },
  };
  const deps: InkTrailDeps = { enabled: true, ink, area: AREA, surface, styleFor: () => STYLE, ...over };
  return { surface, updates, asked, deps };
}

describe("attachInkTrail (échelon 3)", () => {
  it("réglage éteint : statut off, présentateur jamais demandé, aucun écouteur", async () => {
    const { deps, asked, surface } = setup({ enabled: false });
    const t = await attachInkTrail(deps);
    expect(t.status).toBe("off");
    expect(asked).toEqual([]);
    expect(surface.count()).toBe(0);
  });

  it("API absente : statut absent, aucun écouteur", async () => {
    const { deps, surface } = setup({ ink: undefined });
    const t = await attachInkTrail(deps);
    expect(t.status).toBe("absent");
    expect(surface.count()).toBe(0);
  });

  it("requestPresenter refusé : statut refused, aucun écouteur", async () => {
    const { deps, surface } = setup({ ink: { requestPresenter: () => Promise.reject(new Error("NotAllowedError")) } });
    const t = await attachInkTrail(deps);
    expect(t.status).toBe("refused");
    expect(surface.count()).toBe(0);
  });

  it("allumée : présentateur demandé sur la zone d'interaction, chaque pointermove pressé met la pointe à jour", async () => {
    const { deps, surface, updates, asked } = setup();
    const t = await attachInkTrail(deps);
    expect(t.status).toBe("on");
    expect(asked).toEqual([AREA]);
    surface.move({ pointerType: "pen", buttons: 1 });
    surface.move({ pointerType: "mouse", buttons: 1 });
    expect(updates).toEqual([STYLE, STYLE]);
  });

  it("styleFor rend null (gomme, main, vue) ou un diamètre nul : aucune mise à jour", async () => {
    let style: InkTrailStyle | null = null;
    const { deps, surface, updates } = setup({ styleFor: () => style });
    await attachInkTrail(deps);
    surface.move({ pointerType: "pen", buttons: 1 });
    style = { color: "#000000", diameter: 0 };
    surface.move({ pointerType: "pen", buttons: 1 });
    expect(updates).toEqual([]);
  });

  it("pointeur levé (buttons 0) : aucune mise à jour", async () => {
    const { deps, surface, updates } = setup();
    await attachInkTrail(deps);
    surface.move({ pointerType: "pen", buttons: 0 });
    expect(updates).toEqual([]);
  });

  it("updateInkTrailStartPoint qui lève : compté, jamais propagé", async () => {
    const { deps, surface } = setup({
      ink: {
        requestPresenter: async () => ({
          updateInkTrailStartPoint: () => {
            throw new Error("InvalidStateError");
          },
        }),
      },
    });
    const t = await attachInkTrail(deps);
    expect(() => surface.move({ pointerType: "pen", buttons: 1 })).not.toThrow();
    expect(t.failures()).toBe(1);
  });

  it("dispose retire l'écouteur", async () => {
    const { deps, surface } = setup();
    const t = await attachInkTrail(deps);
    expect(surface.count()).toBe(1);
    t.dispose();
    expect(surface.count()).toBe(0);
  });
});
```

- [ ] **2. Lancer, voir rouge.** `cd "$WT/apps/web" && pnpm exec vitest run src/engine/render/ink-trail.test.ts 2>&1 | tail -8`
  → échec `Failed to resolve import "./ink-trail"`.

- [ ] **3. Écrire le module.** `apps/web/src/engine/render/ink-trail.ts` :

```ts
/**
 * Échelon 3 de DA9 : traînée déléguée `navigator.ink` (Chromium sous Windows : le système dessine la pointe devant
 * l'encre du moteur). Éteinte par défaut ; là où l'API manque, sans effet et dit (`absent`). Le moteur n'en sait
 * rien : la page branche ce module sur la zone de dessin et lui passe `navigator.ink` (aucun global ici).
 */

export interface InkTrailStyle {
  readonly color: string;
  /** Diamètre de la pointe en px CSS. */
  readonly diameter: number;
}

export interface InkPresenterLike {
  updateInkTrailStartPoint(evt: PointerEvent, style: InkTrailStyle): void;
}

export interface InkLike {
  requestPresenter(param?: { presentationArea?: Element | null }): Promise<InkPresenterLike>;
}

/** Ce que `styleFor` lit de l'événement : type de pointeur et boutons (bouton gomme, souris levée). */
export interface TrailEvent {
  readonly pointerType: string;
  readonly buttons: number;
}

export interface InkTrailDeps {
  /** Réglage `inkTrail` (T30) : faux = rien n'est demandé au navigateur. */
  readonly enabled: boolean;
  readonly ink: InkLike | undefined;
  /** Canvas d'interaction : zone où le système dessine la pointe. */
  readonly area: Element;
  readonly surface: {
    addEventListener(type: string, l: (e: Event) => void): void;
    removeEventListener(type: string, l: (e: Event) => void): void;
  };
  /** Style de la pointe pour ce geste, ou null s'il ne trace pas (gomme, outil main, espace, doigt qui déplace la vue). */
  styleFor(e: TrailEvent): InkTrailStyle | null;
}

export type InkTrailStatus = "on" | "off" | "absent" | "refused";

export interface InkTrail {
  readonly status: InkTrailStatus;
  /** Appels refusés par le navigateur (événement non accepté), comptés sans être propagés. */
  failures(): number;
  dispose(): void;
}

const inert = (status: InkTrailStatus): InkTrail => ({ status, failures: () => 0, dispose: () => {} });

export async function attachInkTrail(deps: InkTrailDeps): Promise<InkTrail> {
  if (!deps.enabled) return inert("off");
  const ink = deps.ink;
  if (!ink || typeof ink.requestPresenter !== "function") return inert("absent");
  let presenter: InkPresenterLike;
  try {
    presenter = await ink.requestPresenter({ presentationArea: deps.area });
  } catch {
    return inert("refused");
  }
  let failures = 0;
  const onMove = (ev: Event): void => {
    const e = ev as PointerEvent;
    if (e.buttons === 0) return;
    const style = deps.styleFor(e);
    if (!style || !(style.diameter > 0)) return;
    try {
      presenter.updateInkTrailStartPoint(e, style);
    } catch {
      failures++;
    }
  };
  deps.surface.addEventListener("pointermove", onMove);
  return {
    status: "on",
    failures: () => failures,
    dispose: () => deps.surface.removeEventListener("pointermove", onMove),
  };
}
```

- [ ] **4. Lancer, voir vert.** Même commande qu'au § Test → `Tests  8 passed (8)`, les deux noms présents.

- [ ] **5. Suite complète.** `verifier.sh` sous le jeton → `verifier.sh : OK`.

- [ ] **6. Commit.**

```bash
cd "$WT" && git add apps/web/src/engine/render/ink-trail.ts apps/web/src/engine/render/ink-trail.test.ts
cd "$WT" && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(render): delegated ink trail behind a setting (DA9 rung 3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t33"></a>
### Tâche T33 — Échelon 4 : canvas d'interaction en WebGL2 et repli Canvas 2D

**Objectif.** Échelon 4 de DA9 : le canvas d'interaction (encre vive, queue prédite, aperçu de gomme) dessiné en
WebGL2 derrière l'interface `Renderer` (DA2 : seule l'implémentation change), la scène restant au Canvas 2D. Éteint
par défaut. Contexte WebGL2 nul : repli Canvas 2D, dit. Programme refusé (pilote, SwiftShader) : le canvas, déjà lié à
WebGL2, est remplacé par un clone neuf et le Canvas 2D s'y ouvre. Le résultat doit être le même qu'au Canvas 2D,
contours concaves compris. Scénario : S2 (passage `?echelons=4`, T40 ; sous Chromium headless WebGL2 passe par
SwiftShader s'il est permis, sinon le passage prouve le repli).

**Fichiers.** Créer `apps/web/src/engine/render/webgl2.ts`, `apps/web/src/engine/render/webgl2.test.ts`,
`apps/web/src/engine/render/select.ts`, `apps/web/src/engine/render/select.test.ts`,
`apps/web/src/engine/render/fake-gl.ts`. Modifier `apps/web/src/engine/render/canvas2d.ts:45-72` et `:97-100`
(canvas d'interaction facultatif, `PEN_HALF_WIDTH` exporté), `apps/web/src/engine/render/canvas2d.test.ts` (un test
ajouté).

**Interfaces.**
- Consomme : rien du lot.
- Réutilise : `apps/web/src/engine/render/renderer.ts` — `Renderer { drawScene; drawLive; resize; invalidate }`,
  `LiveLayer`, `LiveStrokeView { outline (polygones x, y monde séparés par NaN, NaN), predicted (x, y monde), color, width }`,
  `EraserPreview { path, radius, mode }`, `PageView`, `SceneSource` ;
  `apps/web/src/engine/render/canvas2d.ts` — `Canvas2DRenderer` (étendu : `live: CanvasRenderingContext2D | null`),
  `createCanvas2DRenderer(scene, live, source)` (appelée telle quelle), `PEN_HALF_WIDTH` (exporté) ;
  `apps/web/src/engine/camera.ts` — `Camera { zoom, tx, ty }` (écran = monde × zoom + t) ;
  `apps/web/src/engine/page.ts` — `PAGE_WIDTH`, `PAGE_HEIGHT`, `PAGE_BACKGROUND`, `SURROUND_COLOR`.
- Produit (`webgl2.ts`) : `type Rgba = readonly [number, number, number, number]` ; `parseColor(css: string): Rgba` ;
  `viewTransform(c: Camera, bufW: number, bufH: number, sx: number, sy: number): [number, number, number, number]`
  (ax, bx, ay, by : clip = monde × a + b) ;
  `pageScissor(c: Camera, bufW: number, bufH: number, sx: number, sy: number): [number, number, number, number]`
  (x, y, largeur, hauteur, origine en bas) ; `splitPolygons(flat: ArrayLike<number>): Float32Array[]` ;
  `boundsOf(poly: Float32Array): [number, number, number, number]` ;
  `thickPolyline(path: ArrayLike<number>, half: number, discSegments?: number): Float32Array` (TRIANGLES) ;
  `WEBGL2_CONTEXT` (options du contexte, `stencil: true`) ;
  `class WebGL2LiveRenderer implements Renderer { constructor(scene: Pick<Renderer, "drawScene" | "invalidate" | "resize">, gl: WebGL2RenderingContext) }`
  (lève `Error("WebGL2 : …")` si un shader ou le programme est refusé).
- Produit (`select.ts`) : `interface RendererChoice { readonly renderer: Renderer; readonly webgl: boolean; readonly note: string | null }` ;
  `chooseRenderer(scene: HTMLCanvasElement, live: HTMLCanvasElement, source: SceneSource, wantWebgl: boolean): RendererChoice`
  (notes exactes : `"WebGL2 indisponible : repli Canvas 2D"`, `"WebGL2 refusé (<message>) : repli Canvas 2D"`).
- Produit (`fake-gl.ts`, tests seulement) : `class FakeGL` (constantes nommées, `log`, `draws: FakeDraw[]`,
  `compileOk`, `linkOk`), `interface FakeDraw { mode; count; color; stencil; scissor; rgba }`,
  `asGL(f: FakeGL): WebGL2RenderingContext`.

**Patron à ne pas reprendre.** Remplir le contour par `gl.drawArrays(gl.TRIANGLE_FAN, …)` en couleur, comme on
remplit un polygone convexe : le contour `freedraw` d'une lettre est concave et se recoupe (« o », « e », boucles),
l'éventail déborderait dans les creux et ne suivrait pas la règle « nonzero » du Canvas 2D
(`apps/web/src/engine/render/canvas2d.ts:133-137`, `ctx.fill("nonzero")`). Pas de triangulation par image non plus
(aucune dépendance ajoutée, coût par image). Patron retenu : stencil (éventail couleur coupée qui compte les tours,
`INCR_WRAP` devant, `DECR_WRAP` derrière), puis le rectangle englobant en couleur là où le stencil n'est pas nul, qui
remet le stencil à zéro. Chemin de référence pour la parité : `apps/web/src/engine/render/canvas2d.ts:97-118`
(`drawLive`, `setView`), `:133-147` (trait vif et queue prédite), `:153-178` (aperçu de gomme : pourtour puis fond de
page découpé au cadre), `:182-191` (contextes : interaction `desynchronized`).

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/engine/render/webgl2.test.ts src/engine/render/select.test.ts src/engine/render/canvas2d.test.ts --reporter=verbose 2>&1 | tail -45`
→ `Tests  30 passed (30)` (webgl2 14, select 4, canvas2d 12) ; noms `remplissage nonzero par stencil : couleur coupée
pendant l'éventail, puis rectangle couvrant`, `contexte WebGL2 nul : repli Canvas 2D, note dite`, `programme refusé :
canvas remplacé par un clone, repli Canvas 2D, note avec la cause`, `réglage éteint : Canvas 2D, contexte WebGL2 jamais
demandé` présents. Puis `verifier.sh` (jeton) → `verifier.sh : OK` (le `tsc --noEmit` vérifie les types WebGL2 du
DOM ; garde vert `canvas2d.test.ts`).

**Preuve visuelle.** Aucune ici (passage `?echelons=4` de S2 en T40, capture `s2-lot3b-4.png`).

**Contraintes (recopiées de « Global Constraints »).** Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de `--force` ; aucun `git tag`, aucune release ; aucun workflow GitHub Actions (`.github/workflows/` non touché) ; un seul build Tauri à la fois, aucun build Android (aucun dans cette tâche) ; tests par `scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire socle/T33 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"` (commandes ciblées sous le même jeton) ; relecteurs au premier plan (`run_in_background: false`) ; commit d'auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par la ligne exacte `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, quel que soit le modèle qui exécute ; aucun seuil baissé, aucun test désactivé, sauté (`.skip`, `.todo`, `#[ignore]` hors test de mesure) ni affaibli ; dépôt public : aucun secret ni chemin personnel hors dépôt dans un fichier commité ; `$WT` = dossier donné par l'orchestrateur (défaut `/home/adminjd/projets/roomboard-wt/socle--T33`), worktree neuf : `cd "$WT" && pnpm install --frozen-lockfile` d'abord, `verifier.sh` une fois avant de juger une erreur de type sur `./wasm/roomboard_wasm` ; `apps/web/src/core/api.ts` figé ; rien n'est écrit dans le document avant le relâché (D38) ; moteur sans framework ni global du DOM (exceptions : `render/canvas2d.ts`, `input/support.ts`, méthodes des canvas reçus dans `render/select.ts` ; `URLSearchParams` admis dans `settings.ts`) ; le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif (aucun appel Tauri dans le moteur, échelon 6 interdit, échelon 5 au lot 5) ; chaque réglage a un test allumé et un test éteint ; cœur : aucune horloge ni dépendance au navigateur hors tests, `cargo fmt` et `clippy -D warnings` passent ; TypeScript strict (`noUncheckedIndexedAccess`) : aucun `any`, aucun `!` sur un index, `as unknown as` réservé aux faux objets des tests et aux événements de `PointerSurface`.

**Interdits.** Aucun import de `../wasm/`, d'un framework, de `main.ts`. Ne pas toucher `renderer.ts`, `engine.ts`, les
outils. `fake-gl.ts` n'est importé que par les tests. Aucune dépendance npm ajoutée. Pas de `preserveDrawingBuffer:
true` (coût par image). `chooseRenderer` ne lève jamais pour une raison WebGL2 (seulement si même le Canvas 2D manque).

**Terminé quand.** 30 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : appelé Canvas2DRenderer et
createCanvas2DRenderer (canvas2d.ts, étendu : interaction facultative), Renderer (renderer.ts), Camera (camera.ts)`.

**Étapes.**

- [ ] **1. Écrire le faux contexte des tests.** `apps/web/src/engine/render/fake-gl.ts` :

```ts
/** Faux contexte WebGL2 des tests du rendu (Node n'a pas WebGL) : journalise états et dessins. Tests seulement. */

export interface FakeDraw {
  readonly mode: number;
  readonly count: number;
  /** colorMask au moment du dessin. */
  readonly color: boolean;
  readonly stencil: boolean;
  readonly scissor: boolean;
  /** Dernière couleur passée à `u_color` (valeurs Float32). */
  readonly rgba: readonly number[];
}

export class FakeGL {
  readonly canvas = { width: 0, height: 0 };
  readonly log: string[] = [];
  readonly draws: FakeDraw[] = [];
  compileOk = true;
  linkOk = true;
  readonly VERTEX_SHADER = 0x8b31;
  readonly FRAGMENT_SHADER = 0x8b30;
  readonly COMPILE_STATUS = 0x8b81;
  readonly LINK_STATUS = 0x8b82;
  readonly ARRAY_BUFFER = 0x8892;
  readonly STREAM_DRAW = 0x88e0;
  readonly FLOAT = 0x1406;
  readonly TRIANGLES = 0x0004;
  readonly TRIANGLE_STRIP = 0x0005;
  readonly TRIANGLE_FAN = 0x0006;
  readonly COLOR_BUFFER_BIT = 0x4000;
  readonly STENCIL_BUFFER_BIT = 0x0400;
  readonly STENCIL_TEST = 0x0b90;
  readonly SCISSOR_TEST = 0x0c11;
  readonly DEPTH_TEST = 0x0b71;
  readonly CULL_FACE = 0x0b44;
  readonly BLEND = 0x0be2;
  readonly ALWAYS = 0x0207;
  readonly NOTEQUAL = 0x0205;
  readonly KEEP = 0x1e00;
  readonly ZERO = 0;
  readonly ONE = 1;
  readonly ONE_MINUS_SRC_ALPHA = 0x0303;
  readonly INCR_WRAP = 0x8507;
  readonly DECR_WRAP = 0x8508;
  readonly FRONT = 0x0404;
  readonly BACK = 0x0405;
  private colorOn = true;
  private stencilOn = false;
  private scissorOn = false;
  private rgba: readonly number[] = [];

  createShader(): object {
    return {};
  }
  shaderSource(): void {}
  compileShader(): void {}
  getShaderParameter(): boolean {
    return this.compileOk;
  }
  getShaderInfoLog(): string {
    return "erreur de compilation simulée";
  }
  deleteShader(): void {}
  createProgram(): object {
    return {};
  }
  attachShader(): void {}
  linkProgram(): void {}
  getProgramParameter(): boolean {
    return this.linkOk;
  }
  getProgramInfoLog(): string {
    return "erreur d'édition de liens simulée";
  }
  useProgram(): void {}
  createBuffer(): object {
    return {};
  }
  bindBuffer(): void {}
  bufferData(): void {}
  enableVertexAttribArray(): void {}
  vertexAttribPointer(): void {}
  getAttribLocation(): number {
    return 0;
  }
  getUniformLocation(_program: unknown, name: string): { name: string } {
    return { name };
  }
  uniform4fv(loc: { name: string }, v: ArrayLike<number>): void {
    if (loc.name === "u_color") this.rgba = Array.from(v);
    else this.log.push(`${loc.name} ${Array.from(v, (n) => +n.toFixed(4)).join(",")}`);
  }
  blendFunc(): void {}
  viewport(x: number, y: number, w: number, h: number): void {
    this.log.push(`viewport ${x},${y},${w},${h}`);
  }
  enable(cap: number): void {
    this.toggle(cap, true);
  }
  disable(cap: number): void {
    this.toggle(cap, false);
  }
  colorMask(r: boolean): void {
    this.colorOn = r;
  }
  stencilFunc(func: number): void {
    this.log.push(`stencilFunc ${func}`);
  }
  stencilOp(fail: number, zfail: number, zpass: number): void {
    this.log.push(`stencilOp ${fail} ${zfail} ${zpass}`);
  }
  stencilOpSeparate(face: number, _fail: number, _zfail: number, zpass: number): void {
    this.log.push(`stencilOpSeparate ${face} ${zpass}`);
  }
  clearColor(): void {}
  clearStencil(): void {}
  clear(mask: number): void {
    this.log.push(`clear ${mask}`);
  }
  scissor(x: number, y: number, w: number, h: number): void {
    this.log.push(`scissor ${x},${y},${w},${h}`);
  }
  drawArrays(mode: number, _first: number, count: number): void {
    this.draws.push({
      mode,
      count,
      color: this.colorOn,
      stencil: this.stencilOn,
      scissor: this.scissorOn,
      rgba: this.rgba,
    });
  }
  private toggle(cap: number, on: boolean): void {
    if (cap === this.STENCIL_TEST) this.stencilOn = on;
    if (cap === this.SCISSOR_TEST) this.scissorOn = on;
  }
}

export const asGL = (f: FakeGL): WebGL2RenderingContext => f as unknown as WebGL2RenderingContext;
```

- [ ] **2. Écrire les tests (rouge).** `apps/web/src/engine/render/webgl2.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { Change } from "../../core/api";
import { IDENTITY, type Camera } from "../camera";
import { PAGE_BACKGROUND, SURROUND_COLOR } from "../page";
import { asGL, FakeGL } from "./fake-gl";
import type { LiveLayer, PageView, Renderer } from "./renderer";
import {
  pageScissor,
  parseColor,
  splitPolygons,
  thickPolyline,
  viewTransform,
  WebGL2LiveRenderer,
} from "./webgl2";

class FakeScene implements Pick<Renderer, "drawScene" | "invalidate" | "resize"> {
  readonly log: string[] = [];
  drawScene(page: PageView): void {
    this.log.push(`scene ${page.id}`);
  }
  invalidate(change: Change): void {
    this.log.push(`invalidate ${change.version}`);
  }
  resize(w: number, h: number, dpr: number): void {
    this.log.push(`resize ${w},${h},${dpr}`);
  }
}

function make() {
  const gl = new FakeGL();
  const scene = new FakeScene();
  const r = new WebGL2LiveRenderer(scene, asGL(gl));
  r.resize(200, 100, 1);
  return { gl, scene, r };
}

const f32 = (v: readonly number[]): number[] => Array.from(new Float32Array(v));
/** Contour concave en U (8 sommets) : un éventail en couleur depuis le premier sommet déborderait dans le creux. */
const U = new Float32Array([0, 0, 30, 0, 30, 30, 20, 30, 20, 10, 10, 10, 10, 30, 0, 30]);
const stroke = (outline: Float32Array, predicted = new Float32Array(0)): LiveLayer => ({
  strokes: [{ outline, predicted, color: "#ff0000", width: 4 }],
  erasers: [],
});

describe("géométrie WebGL2 (échelon 4)", () => {
  it("parseColor : #rrggbb et #rgb ; autre chose → noir opaque", () => {
    expect(parseColor("#ff8000")).toEqual([1, 128 / 255, 0, 1]);
    expect(parseColor("#F00")).toEqual([1, 0, 0, 1]);
    expect(parseColor("rouge")).toEqual([0, 0, 0, 1]);
  });

  it("viewTransform : coins du tampon en coins de découpe", () => {
    const cam: Camera = { zoom: 2, tx: 10, ty: 20 };
    const [ax, bx, ay, by] = viewTransform(cam, 200, 100, 1, 1);
    expect(-5 * ax + bx).toBeCloseTo(-1);
    expect(95 * ax + bx).toBeCloseTo(1);
    expect(-10 * ay + by).toBeCloseTo(1);
    expect(40 * ay + by).toBeCloseTo(-1);
  });

  it("pageScissor : cadre de page en pixels du tampon, origine en bas, borné au tampon", () => {
    expect(pageScissor({ zoom: 0.5, tx: 10, ty: 20 }, 1280, 720, 1, 1)).toEqual([10, 160, 960, 540]);
    expect(pageScissor({ zoom: 0.5, tx: 10, ty: 20 }, 1280, 720, 2, 2)[2]).toBe(1260);
  });

  it("splitPolygons : une paire NaN sépare deux polygones ; moins de 3 sommets écarté", () => {
    const flat = [0, 0, 1, 0, 1, 1, NaN, NaN, 5, 5, 6, 6, NaN, NaN, 9, 9, 10, 9, 10, 10];
    expect(splitPolygons(flat).map((p) => Array.from(p))).toEqual([
      [0, 0, 1, 0, 1, 1],
      [9, 9, 10, 9, 10, 10],
    ]);
  });

  it("thickPolyline : un segment = deux triangles à ± demi-épaisseur ; un disque par sommet", () => {
    expect(Array.from(thickPolyline([0, 0, 10, 0], 2, 0))).toEqual([0, 2, 0, -2, 10, 2, 10, 2, 0, -2, 10, -2]);
    expect(thickPolyline([0, 0, 10, 0], 2, 12)).toHaveLength(12 + 2 * 12 * 6);
    expect(thickPolyline([5, 5], 3, 12)).toHaveLength(12 * 6);
  });
});

describe("WebGL2LiveRenderer (échelon 4)", () => {
  it("remplissage nonzero par stencil : couleur coupée pendant l'éventail, puis rectangle couvrant", () => {
    const { gl, r } = make();
    r.drawLive(stroke(U), IDENTITY);
    expect(gl.draws.map((d) => [d.mode, d.count, d.color, d.stencil])).toEqual([
      [gl.TRIANGLE_FAN, 8, false, true],
      [gl.TRIANGLE_STRIP, 4, true, true],
    ]);
    expect(gl.log).toContain(`stencilOpSeparate ${gl.FRONT} ${gl.INCR_WRAP}`);
    expect(gl.log).toContain(`stencilOpSeparate ${gl.BACK} ${gl.DECR_WRAP}`);
    expect(gl.log).toContain(`stencilFunc ${gl.NOTEQUAL}`);
    expect(gl.draws.some((d) => d.mode === gl.TRIANGLE_FAN && d.color)).toBe(false);
    expect(gl.draws[1]?.rgba).toEqual([1, 0, 0, 1]);
  });

  it("contour en blocs (paire NaN) : un passage stencil par polygone", () => {
    const { gl, r } = make();
    const two = new Float32Array([...U, NaN, NaN, ...U.map((v) => v + 40)]);
    r.drawLive(stroke(two), IDENTITY);
    expect(gl.draws.map((d) => d.mode)).toEqual([gl.TRIANGLE_FAN, gl.TRIANGLE_STRIP, gl.TRIANGLE_FAN, gl.TRIANGLE_STRIP]);
  });

  it("queue prédite : triangles épais à la largeur du trait, en couleur, hors stencil", () => {
    const { gl, r } = make();
    r.drawLive(stroke(U, new Float32Array([30, 30, 40, 30])), IDENTITY);
    expect(gl.draws[2]).toMatchObject({
      mode: gl.TRIANGLES,
      color: true,
      stencil: false,
      count: thickPolyline([30, 30, 40, 30], 2).length / 2,
    });
  });

  it("drawLive sans aperçu : effacé seulement (couleur et stencil), aucun dessin", () => {
    const { gl, r } = make();
    r.drawLive({ strokes: [], erasers: [] }, IDENTITY);
    expect(gl.draws).toEqual([]);
    expect(gl.log).toContain(`clear ${gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT}`);
  });

  it("gomme partielle : pourtour le long du chemin, puis fond de page découpé au cadre (scissor)", () => {
    const { gl, r } = make();
    const cam: Camera = { zoom: 0.05, tx: 10, ty: 20 };
    r.drawLive({ strokes: [], erasers: [{ path: new Float32Array([0, 0, 100, 0]), radius: 10, mode: "partial" }] }, cam);
    expect(gl.draws.map((d) => [d.mode, d.scissor, d.rgba])).toEqual([
      [gl.TRIANGLES, false, f32(parseColor(SURROUND_COLOR))],
      [gl.TRIANGLES, true, f32(parseColor(PAGE_BACKGROUND))],
    ]);
    expect(gl.log).toContain(`scissor ${pageScissor(cam, 200, 100, 1, 1).join(",")}`);
    expect(gl.draws[0]?.count).toBe(thickPolyline([0, 0, 100, 0], 12).length / 2);
  });

  it("gomme d'objet : rien de dessiné (les traits touchés sont masqués de la scène)", () => {
    const { gl, r } = make();
    r.drawLive({ strokes: [], erasers: [{ path: new Float32Array([0, 0, 100, 0]), radius: 10, mode: "object" }] }, IDENTITY);
    expect(gl.draws).toEqual([]);
  });

  it("resize : tampon au devicePixelRatio, viewport, scène redimensionnée", () => {
    const { gl, scene, r } = make();
    r.resize(100.4, 50, 2);
    expect(gl.canvas).toEqual({ width: 201, height: 100 });
    expect(gl.log).toContain("viewport 0,0,201,100");
    expect(scene.log).toContain("resize 100.4,50,2");
  });

  it("drawScene et invalidate passent à la scène Canvas 2D", () => {
    const { scene, r } = make();
    r.drawScene({ id: "p", elementIds: [] }, IDENTITY, new Set<string>());
    r.invalidate({ pages: [], ids: [], removed: [], full: true, version: 7 });
    expect(scene.log).toEqual(["resize 200,100,1", "scene p", "invalidate 7"]);
  });

  it("shader refusé : le constructeur lève une Error WebGL2", () => {
    const gl = new FakeGL();
    gl.compileOk = false;
    expect(() => new WebGL2LiveRenderer(new FakeScene(), asGL(gl))).toThrow(/^WebGL2 : shader refusé/);
  });
});
```

`apps/web/src/engine/render/select.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { Canvas2DRenderer } from "./canvas2d";
import { FakeGL } from "./fake-gl";
import type { SceneSource } from "./renderer";
import { chooseRenderer } from "./select";
import { WebGL2LiveRenderer } from "./webgl2";

/** Faux canvas : rend le contexte demandé s'il est prévu, sinon null (comme un navigateur sans WebGL2). */
class FakeCanvas {
  readonly asked: string[] = [];
  replacedBy: FakeCanvas | null = null;
  constructor(private readonly contexts: Record<string, unknown>) {}
  getContext(kind: string): unknown {
    this.asked.push(kind);
    return this.contexts[kind] ?? null;
  }
  cloneNode(): FakeCanvas {
    return new FakeCanvas({ "2d": ctx2d() });
  }
  replaceWith(n: FakeCanvas): void {
    this.replacedBy = n;
  }
}

const ctx2d = (): unknown => ({ canvas: { width: 0, height: 0 } });
const SRC: SceneSource = { element: () => null, outline: () => null };
const el = (c: FakeCanvas): HTMLCanvasElement => c as unknown as HTMLCanvasElement;

describe("chooseRenderer (échelon 4 et repli)", () => {
  it("réglage éteint : Canvas 2D, contexte WebGL2 jamais demandé", () => {
    const scene = new FakeCanvas({ "2d": ctx2d() });
    const live = new FakeCanvas({ "2d": ctx2d(), webgl2: new FakeGL() });
    const c = chooseRenderer(el(scene), el(live), SRC, false);
    expect(c.renderer).toBeInstanceOf(Canvas2DRenderer);
    expect(c).toMatchObject({ webgl: false, note: null });
    expect(live.asked).toEqual(["2d"]);
  });

  it("réglage allumé et WebGL2 donné : rendu WebGL2, scène en Canvas 2D", () => {
    const scene = new FakeCanvas({ "2d": ctx2d() });
    const live = new FakeCanvas({ webgl2: new FakeGL() });
    const c = chooseRenderer(el(scene), el(live), SRC, true);
    expect(c.renderer).toBeInstanceOf(WebGL2LiveRenderer);
    expect(c).toMatchObject({ webgl: true, note: null });
    expect(live.asked).toEqual(["webgl2"]);
    expect(scene.asked).toEqual(["2d"]);
  });

  it("contexte WebGL2 nul : repli Canvas 2D, note dite", () => {
    const scene = new FakeCanvas({ "2d": ctx2d() });
    const live = new FakeCanvas({ "2d": ctx2d() });
    const c = chooseRenderer(el(scene), el(live), SRC, true);
    expect(c.renderer).toBeInstanceOf(Canvas2DRenderer);
    expect(c).toMatchObject({ webgl: false, note: "WebGL2 indisponible : repli Canvas 2D" });
    expect(live.asked).toEqual(["webgl2", "2d"]);
  });

  it("programme refusé : canvas remplacé par un clone, repli Canvas 2D, note avec la cause", () => {
    const gl = new FakeGL();
    gl.compileOk = false;
    const scene = new FakeCanvas({ "2d": ctx2d() });
    const live = new FakeCanvas({ webgl2: gl });
    const c = chooseRenderer(el(scene), el(live), SRC, true);
    expect(live.replacedBy).not.toBeNull();
    expect(live.replacedBy?.asked).toEqual(["2d"]);
    expect(c.renderer).toBeInstanceOf(Canvas2DRenderer);
    expect(c.webgl).toBe(false);
    expect(c.note).toMatch(/^WebGL2 refusé \(WebGL2 : shader refusé.*\) : repli Canvas 2D$/);
  });
});
```

Ajouter à la fin du `describe` de `apps/web/src/engine/render/canvas2d.test.ts` :

```ts
  it("sans canvas d'interaction (null) : drawLive ne fait rien, resize ne touche que la scène", () => {
    const scene = new FakeCtx();
    const r = new Canvas2DRenderer(asCtx(scene), null, { element: () => null, outline: () => null });
    r.resize(100, 50, 2);
    expect(scene.canvas).toEqual({ width: 200, height: 100 });
    expect(() => r.drawLive({ strokes: [], erasers: [] }, IDENTITY)).not.toThrow();
  });
```

- [ ] **3. Lancer, voir rouge.** Commande du § Test → échecs `Failed to resolve import "./webgl2"` et `"./select"` ;
  le test ajouté à `canvas2d.test.ts` échoue au typage ou à l'exécution (`null` refusé, `ctx.canvas` de null).

- [ ] **4. Étendre `canvas2d.ts`.** Remplacer la constante privée (ligne 46) et rendre le canvas d'interaction
  facultatif :

```ts
/** Demi-épaisseur du stylo par défaut (4 unités, HL3-3) : la coupe réelle vaut rayon + demi-épaisseur (HL3-2). */
export const PEN_HALF_WIDTH = 2;
```

```ts
  constructor(
    private readonly scene: CanvasRenderingContext2D,
    /** Canvas d'interaction ; null quand WebGL2 le dessine (échelon 4, `webgl2.ts`). */
    private readonly live: CanvasRenderingContext2D | null,
    private readonly source: SceneSource,
    opts: Canvas2DOptions = {},
  ) {
    this.makePath = opts.makePath ?? (() => new Path2D());
  }

  resize(width: number, height: number, dpr: number): void {
    const w = Math.max(1, Math.round(width * dpr));
    const h = Math.max(1, Math.round(height * dpr));
    for (const ctx of [this.scene, this.live]) {
      if (!ctx) continue;
      if (ctx.canvas.width !== w) ctx.canvas.width = w;
      if (ctx.canvas.height !== h) ctx.canvas.height = h;
    }
    this.sx = width > 0 ? w / width : dpr;
    this.sy = height > 0 ? h / height : dpr;
  }
```

et au début de `drawLive` :

```ts
  drawLive(live: LiveLayer, camera: Camera): void {
    const ctx = this.live;
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
```

(le reste de `drawLive` et de la classe inchangé ; `createCanvas2DRenderer` inchangée).

- [ ] **5. Écrire `webgl2.ts`.** `apps/web/src/engine/render/webgl2.ts` :

```ts
/**
 * Échelon 4 de DA9 : canvas d'interaction en WebGL2 (DA2 : seule l'implémentation change). La scène reste au Canvas 2D
 * (`Canvas2DRenderer` sans canvas d'interaction). Contours remplis en « nonzero » comme le Canvas 2D, par le stencil :
 * éventail couleur coupée qui compte les tours, puis rectangle englobant en couleur là où le compte n'est pas nul. Un
 * éventail en couleur remplirait mal un contour concave (lettres « o », « e », boucles). Queue prédite et aperçu de
 * gomme : segments épais et disques (bouts et jointures ronds).
 */
import type { Change } from "../../core/api";
import type { Camera } from "../camera";
import { PAGE_BACKGROUND, PAGE_HEIGHT, PAGE_WIDTH, SURROUND_COLOR } from "../page";
import { PEN_HALF_WIDTH } from "./canvas2d";
import type { EraserPreview, LiveLayer, LiveStrokeView, PageView, Renderer } from "./renderer";

export type Rgba = readonly [number, number, number, number];

/** `#rrggbb` ou `#rgb` en composantes 0..1 ; toute autre écriture : noir opaque. */
export function parseColor(css: string): Rgba {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(css.trim());
  const hex = m?.[1];
  if (hex === undefined) return [0, 0, 0, 1];
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  const n = Number.parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
}

/**
 * Monde → espace de découpe : clip = monde × (ax, ay) + (bx, by), y vers le haut. `sx`, `sy` : échelle exacte
 * tampon / CSS (comme `Canvas2DRenderer.setView`).
 */
export function viewTransform(
  c: Camera,
  bufW: number,
  bufH: number,
  sx: number,
  sy: number,
): [number, number, number, number] {
  return [
    (2 * c.zoom * sx) / bufW,
    (2 * c.tx * sx) / bufW - 1,
    (-2 * c.zoom * sy) / bufH,
    1 - (2 * c.ty * sy) / bufH,
  ];
}

/** Cadre de page en pixels du tampon pour `gl.scissor` (x, y, largeur, hauteur ; origine en bas), borné au tampon. */
export function pageScissor(
  c: Camera,
  bufW: number,
  bufH: number,
  sx: number,
  sy: number,
): [number, number, number, number] {
  const x0 = Math.max(0, Math.floor(c.tx * sx));
  const x1 = Math.min(bufW, Math.ceil((PAGE_WIDTH * c.zoom + c.tx) * sx));
  const top = Math.max(0, Math.floor(c.ty * sy));
  const bottom = Math.min(bufH, Math.ceil((PAGE_HEIGHT * c.zoom + c.ty) * sy));
  return [x0, bufH - bottom, Math.max(0, x1 - x0), Math.max(0, bottom - top)];
}

/** Polygones x, y séparés par une paire non finie ; ceux de moins de 3 sommets sont écartés. */
export function splitPolygons(flat: ArrayLike<number>): Float32Array[] {
  const out: Float32Array[] = [];
  let cur: number[] = [];
  const flush = (): void => {
    if (cur.length >= 6) out.push(new Float32Array(cur));
    cur = [];
  };
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const x = flat[i] ?? Number.NaN;
    const y = flat[i + 1] ?? Number.NaN;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      flush();
      continue;
    }
    cur.push(x, y);
  }
  flush();
  return out;
}

/** Boîte englobante x0, y0, x1, y1 d'un polygone (sommets x, y). */
export function boundsOf(poly: Float32Array): [number, number, number, number] {
  let x0 = Number.POSITIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (let i = 0; i + 1 < poly.length; i += 2) {
    const x = poly[i] ?? 0;
    const y = poly[i + 1] ?? 0;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}

/**
 * Trait épais en triangles (mode TRIANGLES) : un quadrilatère par segment, puis un disque à chaque sommet (bouts et
 * jointures ronds, comme `lineCap` / `lineJoin = "round"` du Canvas 2D). `discSegments` < 3 : segments seuls.
 */
export function thickPolyline(path: ArrayLike<number>, half: number, discSegments = 12): Float32Array {
  const v: number[] = [];
  const n = Math.floor(path.length / 2);
  const px = (i: number): number => path[2 * i] ?? 0;
  const py = (i: number): number => path[2 * i + 1] ?? 0;
  for (let i = 0; i + 1 < n; i++) {
    const x0 = px(i);
    const y0 = py(i);
    const x1 = px(i + 1);
    const y1 = py(i + 1);
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (!(len > 0)) continue;
    const nx = (-(y1 - y0) / len) * half;
    const ny = ((x1 - x0) / len) * half;
    v.push(x0 + nx, y0 + ny, x0 - nx, y0 - ny, x1 + nx, y1 + ny);
    v.push(x1 + nx, y1 + ny, x0 - nx, y0 - ny, x1 - nx, y1 - ny);
  }
  if (discSegments >= 3) {
    for (let i = 0; i < n; i++) {
      const cx = px(i);
      const cy = py(i);
      for (let k = 0; k < discSegments; k++) {
        const a0 = (2 * Math.PI * k) / discSegments;
        const a1 = (2 * Math.PI * (k + 1)) / discSegments;
        v.push(cx, cy, cx + Math.cos(a0) * half, cy + Math.sin(a0) * half, cx + Math.cos(a1) * half, cy + Math.sin(a1) * half);
      }
    }
  }
  return new Float32Array(v);
}

/** Options du contexte : stencil pour le remplissage nonzero, `desynchronized` comme le canvas 2D d'interaction (D19). */
export const WEBGL2_CONTEXT: WebGLContextAttributes & { readonly desynchronized?: boolean } = {
  alpha: true,
  premultipliedAlpha: true,
  antialias: true,
  stencil: true,
  depth: false,
  preserveDrawingBuffer: false,
  desynchronized: true,
};

const VERTEX = `#version 300 es
in vec2 a_pos;
uniform vec4 u_view;
void main() {
  gl_Position = vec4(a_pos.x * u_view.x + u_view.y, a_pos.y * u_view.z + u_view.w, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision mediump float;
uniform vec4 u_color;
out vec4 o_color;
void main() {
  o_color = vec4(u_color.rgb * u_color.a, u_color.a);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("WebGL2 : shader non créé");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true) {
    const log = gl.getShaderInfoLog(shader) ?? "";
    gl.deleteShader(shader);
    throw new Error(`WebGL2 : shader refusé ${log}`.trim());
  }
  return shader;
}

function link(gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error("WebGL2 : programme non créé");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true) {
    const log = gl.getProgramInfoLog(program) ?? "";
    throw new Error(`WebGL2 : programme refusé ${log}`.trim());
  }
  return program;
}

export class WebGL2LiveRenderer implements Renderer {
  private readonly uView: WebGLUniformLocation;
  private readonly uColor: WebGLUniformLocation;
  private sx = 1;
  private sy = 1;

  constructor(
    private readonly scene: Pick<Renderer, "drawScene" | "invalidate" | "resize">,
    private readonly gl: WebGL2RenderingContext,
  ) {
    const program = link(gl, compile(gl, gl.VERTEX_SHADER, VERTEX), compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    const buffer = gl.createBuffer();
    const uView = gl.getUniformLocation(program, "u_view");
    const uColor = gl.getUniformLocation(program, "u_color");
    const aPos = gl.getAttribLocation(program, "a_pos");
    if (!buffer || !uView || !uColor || aPos < 0) throw new Error("WebGL2 : ressources du programme introuvables");
    this.uView = uView;
    this.uColor = uColor;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  drawScene(page: PageView, camera: Camera, hidden: ReadonlySet<string>): void {
    this.scene.drawScene(page, camera, hidden);
  }

  invalidate(change: Change): void {
    this.scene.invalidate(change);
  }

  resize(width: number, height: number, dpr: number): void {
    this.scene.resize(width, height, dpr);
    const w = Math.max(1, Math.round(width * dpr));
    const h = Math.max(1, Math.round(height * dpr));
    const canvas = this.gl.canvas;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    this.sx = width > 0 ? w / width : dpr;
    this.sy = height > 0 ? h / height : dpr;
    this.gl.viewport(0, 0, w, h);
  }

  drawLive(live: LiveLayer, camera: Camera): void {
    const gl = this.gl;
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.colorMask(true, true, true, true);
    gl.clearColor(0, 0, 0, 0);
    gl.clearStencil(0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    if (live.strokes.length === 0 && live.erasers.length === 0) return;
    const w = gl.canvas.width;
    const h = gl.canvas.height;
    gl.uniform4fv(this.uView, new Float32Array(viewTransform(camera, w, h, this.sx, this.sy)));
    for (const e of live.erasers) this.paintEraser(e, camera, w, h);
    for (const s of live.strokes) this.paintStroke(s);
  }

  private draw(mode: number, vertices: Float32Array): void {
    if (vertices.length < 6) return;
    const gl = this.gl;
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STREAM_DRAW);
    gl.drawArrays(mode, 0, vertices.length / 2);
  }

  private color(css: string): void {
    this.gl.uniform4fv(this.uColor, new Float32Array(parseColor(css)));
  }

  /** Remplissage nonzero (parité avec `ctx.fill("nonzero")` du Canvas 2D), puis queue prédite à la largeur du trait. */
  private paintStroke(s: LiveStrokeView): void {
    const gl = this.gl;
    this.color(s.color);
    for (const poly of splitPolygons(s.outline)) {
      gl.enable(gl.STENCIL_TEST);
      gl.colorMask(false, false, false, false);
      gl.stencilFunc(gl.ALWAYS, 0, 0xff);
      gl.stencilOpSeparate(gl.FRONT, gl.KEEP, gl.KEEP, gl.INCR_WRAP);
      gl.stencilOpSeparate(gl.BACK, gl.KEEP, gl.KEEP, gl.DECR_WRAP);
      this.draw(gl.TRIANGLE_FAN, poly);
      gl.colorMask(true, true, true, true);
      gl.stencilFunc(gl.NOTEQUAL, 0, 0xff);
      gl.stencilOp(gl.ZERO, gl.ZERO, gl.ZERO);
      const [x0, y0, x1, y1] = boundsOf(poly);
      this.draw(gl.TRIANGLE_STRIP, new Float32Array([x0, y0, x1, y0, x0, y1, x1, y1]));
      gl.disable(gl.STENCIL_TEST);
    }
    if (s.predicted.length >= 4) this.draw(gl.TRIANGLES, thickPolyline(s.predicted, s.width / 2));
  }

  /**
   * Gomme partielle (D38, HL3-2) : pourtour peint le long du chemin, puis fond de page par-dessus, découpé au cadre de
   * la page (même résultat que les deux découpes du Canvas 2D). Gomme d'objet : rien ici.
   */
  private paintEraser(e: EraserPreview, camera: Camera, w: number, h: number): void {
    if (e.mode !== "partial" || e.path.length < 2) return;
    const gl = this.gl;
    const band = thickPolyline(e.path, e.radius + PEN_HALF_WIDTH);
    this.color(SURROUND_COLOR);
    this.draw(gl.TRIANGLES, band);
    const [x, y, sw, sh] = pageScissor(camera, w, h, this.sx, this.sy);
    if (sw === 0 || sh === 0) return;
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(x, y, sw, sh);
    this.color(PAGE_BACKGROUND);
    this.draw(gl.TRIANGLES, band);
    gl.disable(gl.SCISSOR_TEST);
  }
}
```

- [ ] **6. Écrire `select.ts`.** `apps/web/src/engine/render/select.ts` :

```ts
/**
 * Choix du rendu (échelon 4 de DA9) : WebGL2 pour le canvas d'interaction si le réglage le demande et que le navigateur
 * le donne, sinon Canvas 2D. Contexte WebGL2 nul : repli direct. Programme refusé : le canvas, déjà lié à WebGL2, est
 * remplacé par un clone neuf (même id) pour ouvrir le Canvas 2D. Ne lève jamais pour une raison WebGL2.
 */
import { Canvas2DRenderer, createCanvas2DRenderer } from "./canvas2d";
import type { Renderer, SceneSource } from "./renderer";
import { WEBGL2_CONTEXT, WebGL2LiveRenderer } from "./webgl2";

export interface RendererChoice {
  readonly renderer: Renderer;
  /** Vrai si le canvas d'interaction est dessiné en WebGL2. */
  readonly webgl: boolean;
  /** Repli dit à l'utilisateur (barre), ou null. */
  readonly note: string | null;
}

export function chooseRenderer(
  scene: HTMLCanvasElement,
  live: HTMLCanvasElement,
  source: SceneSource,
  wantWebgl: boolean,
): RendererChoice {
  if (!wantWebgl) return { renderer: createCanvas2DRenderer(scene, live, source), webgl: false, note: null };
  const gl = live.getContext("webgl2", WEBGL2_CONTEXT);
  if (!gl) {
    return {
      renderer: createCanvas2DRenderer(scene, live, source),
      webgl: false,
      note: "WebGL2 indisponible : repli Canvas 2D",
    };
  }
  const sceneCtx = scene.getContext("2d", { alpha: false });
  if (!sceneCtx) throw new Error("canvas 2D indisponible");
  try {
    return { renderer: new WebGL2LiveRenderer(new Canvas2DRenderer(sceneCtx, null, source), gl), webgl: true, note: null };
  } catch (e) {
    const fresh = live.cloneNode(false) as HTMLCanvasElement;
    live.replaceWith(fresh);
    const liveCtx = fresh.getContext("2d", { desynchronized: true });
    if (!liveCtx) throw new Error("canvas 2D indisponible");
    const cause = e instanceof Error ? e.message : String(e);
    return {
      renderer: new Canvas2DRenderer(sceneCtx, liveCtx, source),
      webgl: false,
      note: `WebGL2 refusé (${cause}) : repli Canvas 2D`,
    };
  }
}
```

- [ ] **7. Lancer, voir vert.** Commande du § Test → `Tests  30 passed (30)`, les quatre noms présents. Si
  `WebGLContextAttributes` du `lib.dom` de TS 5.6 a déjà `desynchronized`, l'intersection de type reste valide.

- [ ] **8. Suite complète.** `verifier.sh` sous le jeton → `verifier.sh : OK`.

- [ ] **9. Commit.**

```bash
cd "$WT" && git add apps/web/src/engine/render/webgl2.ts apps/web/src/engine/render/webgl2.test.ts apps/web/src/engine/render/select.ts apps/web/src/engine/render/select.test.ts apps/web/src/engine/render/fake-gl.ts apps/web/src/engine/render/canvas2d.ts apps/web/src/engine/render/canvas2d.test.ts
cd "$WT" && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(render): WebGL2 interaction canvas with Canvas 2D fallback (DA9 rung 4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t34"></a>
### Tâche T34 — Entrées : paume réglable et bouton du milieu

**Objectif.** Deux ajouts à la couche d'entrée, sans changer le tracé. (1) Paume (D18, D39) : l'annulation du geste
d'une paume posée **avant** le stylet (écart accepté T1, `cancelTouches`) devient un réglage, `strict` par défaut ;
`lenient` la laisse continuer. Un contact posé **pendant** que le stylet touche reste ignoré dans les deux cas (D18).
Le réglage est lu à chaque pose du stylet (la page passe un accesseur). (2) Bouton du milieu de la souris (D17) :
glisser déplace la vue ; module à part, l'échantillonneur continue d'ignorer ce bouton (T27). Scénario : S2 (bouton du
milieu au passage par défaut, T40).

**Fichiers.** Modifier `apps/web/src/engine/input/sampler.ts:29-33` (option) et `:161` (lecture),
`apps/web/src/engine/input/sampler.test.ts` (4 tests ajoutés). Créer `apps/web/src/engine/input/middle-pan.ts`,
`apps/web/src/engine/input/middle-pan.test.ts`.

**Interfaces.**
- Consomme : rien du lot (T40 passe `get cancelTouchesOnPen() { return settings.get().palm === "strict"; }`).
- Réutilise : `apps/web/src/engine/input/sampler.ts` — `createSampler(target: PointerSurface, opts: SamplerOptions)`,
  `cancelTouches` (`:140-150`, inchangée), `PointerSurface`, `PointerLike` (étendus : rien ; option ajoutée à
  `SamplerOptions`) ; `apps/web/src/engine/input/gesture.ts` — `ViewSink { panBy(dx, dy); zoomAt(x, y, factor) }`.
- Produit : `SamplerOptions.cancelTouchesOnPen?: boolean` (absent ou vrai = strict) ;
  `interface MiddlePan { dispose(): void }` ;
  `createMiddlePan(surface: PointerSurface, view: ViewSink): MiddlePan` (écoute `pointerdown`, `pointermove`,
  `pointerup`, `pointercancel`, `lostpointercapture` ; aucune capture du pointeur).

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/engine/input/sampler.test.ts src/engine/input/middle-pan.test.ts --reporter=verbose 2>&1 | tail -45`
→ `Tests  36 passed (36)` (sampler 30, middle-pan 6) ; noms `paume souple (cancelTouchesOnPen: false) : le contact
posé avant le stylet continue de tracer`, `paume stricte explicite (cancelTouchesOnPen: true) : même effet que le
défaut`, `souris au bouton du milieu : aucun geste` (lot 3, inchangé) et `bouton du milieu : glisser déplace la vue du
déplacement du pointeur` présents. Puis `verifier.sh` (jeton) → `verifier.sh : OK`.

**Preuve visuelle.** Aucune ici (S2 en T40 : `bouton du milieu : la vue revient, aucun trait`).

**Contraintes (recopiées de « Global Constraints »).** Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de `--force` ; aucun `git tag`, aucune release ; aucun workflow GitHub Actions (`.github/workflows/` non touché) ; un seul build Tauri à la fois, aucun build Android (aucun dans cette tâche) ; tests par `scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire socle/T34 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"` (commandes ciblées sous le même jeton) ; relecteurs au premier plan (`run_in_background: false`) ; commit d'auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par la ligne exacte `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, quel que soit le modèle qui exécute ; aucun seuil baissé, aucun test désactivé, sauté (`.skip`, `.todo`, `#[ignore]` hors test de mesure) ni affaibli ; dépôt public : aucun secret ni chemin personnel hors dépôt dans un fichier commité ; `$WT` = dossier donné par l'orchestrateur (défaut `/home/adminjd/projets/roomboard-wt/socle--T34`), worktree neuf : `cd "$WT" && pnpm install --frozen-lockfile` d'abord, `verifier.sh` une fois avant de juger une erreur de type sur `./wasm/roomboard_wasm` ; `apps/web/src/core/api.ts` figé ; rien n'est écrit dans le document avant le relâché (D38) ; moteur sans framework ni global du DOM (exceptions : `render/canvas2d.ts`, `input/support.ts`, méthodes des canvas reçus dans `render/select.ts` ; `URLSearchParams` admis dans `settings.ts`) ; le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif (aucun appel Tauri dans le moteur, échelon 6 interdit, échelon 5 au lot 5) ; chaque réglage a un test allumé et un test éteint ; cœur : aucune horloge ni dépendance au navigateur hors tests, `cargo fmt` et `clippy -D warnings` passent ; TypeScript strict (`noUncheckedIndexedAccess`) : aucun `any`, aucun `!` sur un index, `as unknown as` réservé aux faux objets des tests et aux événements de `PointerSurface`.

**Interdits.** Ne pas modifier les tests existants de `sampler.test.ts` (dont `souris au bouton du milieu : aucun
geste` et `paume posée avant le stylet : son geste est annulé quand le stylet touche`) : ils prouvent le défaut. Pas de
`setPointerCapture` dans `middle-pan.ts` (cadrage § 3 : seulement `sampler.ts`). Ne pas toucher le routeur ni le
moteur.

**Terminé quand.** 36 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : appelé createSampler,
PointerSurface, PointerLike (sampler.ts, étendu d'une option), ViewSink (gesture.ts)`.

**Étapes.**

- [ ] **1. Écrire les tests (rouge).** Ajouter à la fin du `describe("createSampler", …)` de
  `apps/web/src/engine/input/sampler.test.ts` :

```ts
  it("paume stricte explicite (cancelTouchesOnPen: true) : même effet que le défaut", () => {
    const surface = new FakeSurface();
    const out = record(createSampler(surface, { ...ALL, cancelTouchesOnPen: true }));
    surface.fire("pointerdown", { pointerId: 2, pointerType: "touch" });
    surface.fire("pointerdown", { pointerId: 1, pointerType: "pen" });
    expect(out.map((g) => `${g.kind}:${g.pointerId}${g.palm === true ? ":palm" : ""}`)).toEqual([
      "start:2",
      "cancel:2:palm",
      "start:1",
    ]);
  });

  it("paume souple (cancelTouchesOnPen: false) : le contact posé avant le stylet continue de tracer", () => {
    const surface = new FakeSurface();
    const sampler = createSampler(surface, { ...ALL, cancelTouchesOnPen: false });
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 2, pointerType: "touch" });
    surface.fire("pointerdown", { pointerId: 1, pointerType: "pen" });
    surface.fire("pointermove", { pointerId: 2, pointerType: "touch" });
    surface.fire("pointerup", { pointerId: 2, pointerType: "touch" });
    expect(out.map((g) => `${g.kind}:${g.pointerId}`)).toEqual(["start:2", "start:1", "move:2", "end:2"]);
    expect(sampler.stats().touchIgnored).toBe(0);
  });

  it("paume souple : un contact posé pendant que le stylet touche reste ignoré (D18)", () => {
    const surface = new FakeSurface();
    const sampler = createSampler(surface, { ...ALL, cancelTouchesOnPen: false });
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 1, pointerType: "pen" });
    surface.fire("pointerdown", { pointerId: 2, pointerType: "touch" });
    surface.fire("pointermove", { pointerId: 2, pointerType: "touch" });
    expect(out.map((g) => `${g.kind}:${g.pointerId}`)).toEqual(["start:1"]);
    expect(sampler.stats().touchIgnored).toBe(1);
  });

  it("réglage de la paume lu à chaque pose du stylet (accesseur de la page)", () => {
    let strict = false;
    const opts: SamplerOptions = {
      ...ALL,
      get cancelTouchesOnPen() {
        return strict;
      },
    };
    const surface = new FakeSurface();
    const out = record(createSampler(surface, opts));
    surface.fire("pointerdown", { pointerId: 2, pointerType: "touch" });
    surface.fire("pointerdown", { pointerId: 1, pointerType: "pen" });
    surface.fire("pointerup", { pointerId: 1 });
    strict = true;
    surface.fire("pointerdown", { pointerId: 3, pointerType: "pen" });
    expect(out.map((g) => `${g.kind}:${g.pointerId}`)).toEqual(["start:2", "start:1", "end:1", "cancel:2", "start:3"]);
  });
```

`apps/web/src/engine/input/middle-pan.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { ViewSink } from "./gesture";
import { createMiddlePan } from "./middle-pan";
import type { PointerLike, PointerSurface } from "./sampler";

type Init = Partial<Omit<PointerLike, "preventDefault">> & { pointerId: number };

class Surface implements PointerSurface {
  readonly handlers = new Map<string, Set<(e: Event) => void>>();
  readonly captured: number[] = [];
  addEventListener(type: string, l: (e: Event) => void): void {
    const set = this.handlers.get(type) ?? new Set<(e: Event) => void>();
    set.add(l);
    this.handlers.set(type, set);
  }
  removeEventListener(type: string, l: (e: Event) => void): void {
    this.handlers.get(type)?.delete(l);
  }
  setPointerCapture(pointerId: number): void {
    this.captured.push(pointerId);
  }
  getBoundingClientRect(): { left: number; top: number } {
    return { left: 0, top: 0 };
  }
  count(): number {
    let n = 0;
    for (const set of this.handlers.values()) n += set.size;
    return n;
  }
  /** Déclenche un événement souris au bouton du milieu par défaut ; rend vrai si preventDefault a été appelé. */
  fire(type: string, init: Init): boolean {
    let prevented = false;
    const e: PointerLike = {
      pointerType: "mouse",
      clientX: 0,
      clientY: 0,
      pressure: 0,
      tiltX: 0,
      tiltY: 0,
      buttons: 4,
      timeStamp: 0,
      ...init,
      preventDefault: () => {
        prevented = true;
      },
    };
    for (const l of this.handlers.get(type) ?? []) l(e as unknown as Event);
    return prevented;
  }
}

function setup() {
  const surface = new Surface();
  const log: string[] = [];
  const view: ViewSink = {
    panBy: (dx, dy) => log.push(`pan ${dx} ${dy}`),
    zoomAt: () => log.push("zoom"),
  };
  return { surface, log, pan: createMiddlePan(surface, view) };
}

describe("createMiddlePan (D17)", () => {
  it("bouton du milieu : glisser déplace la vue du déplacement du pointeur", () => {
    const { surface, log } = setup();
    surface.fire("pointerdown", { pointerId: 1, clientX: 100, clientY: 100 });
    surface.fire("pointermove", { pointerId: 1, clientX: 130, clientY: 90 });
    surface.fire("pointermove", { pointerId: 1, clientX: 130, clientY: 90 });
    surface.fire("pointermove", { pointerId: 1, clientX: 100, clientY: 95 });
    expect(log).toEqual(["pan 30 -10", "pan -30 5"]);
  });

  it("défilement automatique empêché ; aucune capture du pointeur (réservée à sampler.ts, cadrage § 3)", () => {
    const { surface } = setup();
    expect(surface.fire("pointerdown", { pointerId: 1 })).toBe(true);
    expect(surface.captured).toEqual([]);
  });

  it("bouton gauche, droit, gauche et milieu ensemble, stylet ou doigt : rien", () => {
    const { surface, log } = setup();
    const inits: Partial<Omit<PointerLike, "preventDefault">>[] = [{ buttons: 1 }, { buttons: 2 }, { buttons: 5 }, { pointerType: "pen" }, { pointerType: "touch" }];
    for (const init of inits) {
      expect(surface.fire("pointerdown", { pointerId: 1, ...init })).toBe(false);
      surface.fire("pointermove", { pointerId: 1, clientX: 50, ...init });
      surface.fire("pointerup", { pointerId: 1, buttons: 0 });
    }
    expect(log).toEqual([]);
  });

  it("relâché, pointercancel ou capture perdue : la vue ne bouge plus", () => {
    for (const end of ["pointerup", "pointercancel", "lostpointercapture"]) {
      const { surface, log } = setup();
      surface.fire("pointerdown", { pointerId: 1 });
      surface.fire(end, { pointerId: 1, buttons: 0 });
      surface.fire("pointermove", { pointerId: 1, clientX: 40 });
      expect(log).toEqual([]);
    }
  });

  it("bouton du milieu lâché hors de la zone (buttons sans 4 au retour) : fin du glisser", () => {
    const { surface, log } = setup();
    surface.fire("pointerdown", { pointerId: 1 });
    surface.fire("pointermove", { pointerId: 1, clientX: 10, buttons: 0 });
    surface.fire("pointermove", { pointerId: 1, clientX: 20 });
    expect(log).toEqual([]);
  });

  it("dispose retire les écouteurs", () => {
    const { surface, pan } = setup();
    expect(surface.count()).toBe(5);
    pan.dispose();
    expect(surface.count()).toBe(0);
  });
});
```

- [ ] **2. Lancer, voir rouge.** Commande du § Test → `middle-pan.test.ts` : `Failed to resolve import
  "./middle-pan"` ; `sampler.test.ts` : `paume souple (cancelTouchesOnPen: false) …` et `réglage de la paume lu …`
  échouent (`cancel:2` reçu), et `tsc` refuserait `cancelTouchesOnPen` (propriété inconnue).

- [ ] **3. Étendre `sampler.ts`.** Dans `SamplerOptions` (après `raw`) :

```ts
  /**
   * Paume posée avant le stylet (D18, réglage « paume ») : absent ou vrai = son geste est annulé quand le stylet touche
   * (écart accepté T1) ; faux = il continue. Lu à chaque pose du stylet : la page peut passer un accesseur.
   */
  readonly cancelTouchesOnPen?: boolean;
```

et dans `onDown`, remplacer `if (e.pointerType === "pen") cancelTouches();` par :

```ts
    if (e.pointerType === "pen" && opts.cancelTouchesOnPen !== false) cancelTouches();
```

- [ ] **4. Écrire `middle-pan.ts`.** `apps/web/src/engine/input/middle-pan.ts` :

```ts
/**
 * Bouton du milieu de la souris (D17) : glisser déplace la vue, jamais un trait (l'échantillonneur ignore ce bouton,
 * T27). Module à part pour garder l'échantillonneur sur le tracé ; même surface que lui. Sans capture du pointeur
 * (cadrage § 3 : `setPointerCapture` seulement dans sampler.ts) : la zone couvre la fenêtre, et un relâché hors de
 * la fenêtre se voit au premier mouvement de retour (`buttons` sans le bit du milieu).
 */
import type { ViewSink } from "./gesture";
import type { PointerLike, PointerSurface } from "./sampler";

const LEFT = 1;
const MIDDLE = 4;

export interface MiddlePan {
  dispose(): void;
}

export function createMiddlePan(surface: PointerSurface, view: ViewSink): MiddlePan {
  let drag: { readonly id: number; x: number; y: number } | null = null;

  const onDown = (ev: Event): void => {
    const e = ev as unknown as PointerLike;
    if (drag !== null || e.pointerType !== "mouse") return;
    if ((e.buttons & MIDDLE) === 0 || (e.buttons & LEFT) !== 0) return;
    e.preventDefault(); // pas de défilement automatique du bouton du milieu
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };

  const onMove = (ev: Event): void => {
    const e = ev as unknown as PointerLike;
    if (drag === null || e.pointerId !== drag.id) return;
    if ((e.buttons & MIDDLE) === 0) {
      drag = null;
      return;
    }
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (dx !== 0 || dy !== 0) view.panBy(dx, dy);
  };

  const onEnd = (ev: Event): void => {
    const e = ev as unknown as PointerLike;
    if (drag !== null && e.pointerId === drag.id) drag = null;
  };

  const bindings: ReadonlyArray<readonly [string, (e: Event) => void]> = [
    ["pointerdown", onDown],
    ["pointermove", onMove],
    ["pointerup", onEnd],
    ["pointercancel", onEnd],
    ["lostpointercapture", onEnd],
  ];
  for (const [type, listener] of bindings) surface.addEventListener(type, listener);

  return {
    dispose() {
      for (const [type, listener] of bindings) surface.removeEventListener(type, listener);
      drag = null;
    },
  };
}
```

- [ ] **5. Lancer, voir vert.** Commande du § Test → `Tests  36 passed (36)`, les quatre noms présents.

- [ ] **6. Suite complète.** `verifier.sh` sous le jeton → `verifier.sh : OK`.

- [ ] **7. Commit.**

```bash
cd "$WT" && git add apps/web/src/engine/input/sampler.ts apps/web/src/engine/input/sampler.test.ts apps/web/src/engine/input/middle-pan.ts apps/web/src/engine/input/middle-pan.test.ts
cd "$WT" && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(input): palm setting and middle-button pan (D17, D18)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t35"></a>
### Tâche T35 — Routeur : outil main et espace maintenu (D17)

**Objectif.** Reste de D17 côté entrées : avec l'outil main, ou la barre d'espace tenue, tout geste (stylet, souris,
doigt) déplace la vue au lieu de tracer ; deux doigts pincent comme avant. Lus au début du geste. Le type `ToolChoice`
(outil de dessin ou main) est posé ici, pour le moteur (T38) et la barre (T40). Vérifier aussi que le réglage du doigt
(`fingerPansAfterPen`) est relu à chaque geste, ce que T40 exploite par un accesseur. Scénario : S2 (outil main et
espace + glisser au passage par défaut, T40).

**Fichiers.** Modifier `apps/web/src/engine/input/gesture.ts` (type ajouté), `apps/web/src/engine/input/router.ts:19-23`
(`RouterDeps`) et `:56-88` (`onStart`), `apps/web/src/engine/input/router.test.ts` (6 tests ajoutés).

**Interfaces.**
- Consomme : rien du lot.
- Réutilise : `apps/web/src/engine/input/router.ts` — `createRouter(opts: RouterOptions, deps: RouterDeps)`,
  `RouterOptions { fingerPansAfterPen; secondFingerMs }`, `DEFAULT_ROUTER_OPTIONS`, `SECOND_FINGER_MS` (étendu) ;
  `apps/web/src/engine/input/gesture.ts` — `DrawTool`, `GestureSink`, `ViewSink` (étendu d'un type).
- Produit (`gesture.ts`) : `type ToolChoice = DrawTool | "hand"`.
- Produit (`router.ts`) : `RouterDeps { currentTool(): ToolChoice; panHeld?(): boolean; readonly gestures: GestureSink; readonly view: ViewSink }`
  (`panHeld` absent = jamais tenu ; les appelants du lot 3 restent valides).

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/engine/input/router.test.ts --reporter=verbose 2>&1 | tail -30`
→ `Tests  20 passed (20)` ; noms `outil main : stylet et souris déplacent la vue, aucun trait`, `espace maintenu : la
souris déplace la vue ; relâché, elle trace de nouveau` et `réglage du doigt lu à chaque geste (accesseur) : bascule
à chaud` présents ; les 14 tests du lot 3 inchangés et verts. Puis `verifier.sh` (jeton) → `verifier.sh : OK`.

**Preuve visuelle.** Aucune ici (S2 en T40).

**Contraintes (recopiées de « Global Constraints »).** Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de `--force` ; aucun `git tag`, aucune release ; aucun workflow GitHub Actions (`.github/workflows/` non touché) ; un seul build Tauri à la fois, aucun build Android (aucun dans cette tâche) ; tests par `scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire socle/T35 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"` (commandes ciblées sous le même jeton) ; relecteurs au premier plan (`run_in_background: false`) ; commit d'auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par la ligne exacte `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, quel que soit le modèle qui exécute ; aucun seuil baissé, aucun test désactivé, sauté (`.skip`, `.todo`, `#[ignore]` hors test de mesure) ni affaibli ; dépôt public : aucun secret ni chemin personnel hors dépôt dans un fichier commité ; `$WT` = dossier donné par l'orchestrateur (défaut `/home/adminjd/projets/roomboard-wt/socle--T35`), worktree neuf : `cd "$WT" && pnpm install --frozen-lockfile` d'abord, `verifier.sh` une fois avant de juger une erreur de type sur `./wasm/roomboard_wasm` ; `apps/web/src/core/api.ts` figé ; rien n'est écrit dans le document avant le relâché (D38) ; moteur sans framework ni global du DOM (exceptions : `render/canvas2d.ts`, `input/support.ts`, méthodes des canvas reçus dans `render/select.ts` ; `URLSearchParams` admis dans `settings.ts`) ; le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif (aucun appel Tauri dans le moteur, échelon 6 interdit, échelon 5 au lot 5) ; chaque réglage a un test allumé et un test éteint ; cœur : aucune horloge ni dépendance au navigateur hors tests, `cargo fmt` et `clippy -D warnings` passent ; TypeScript strict (`noUncheckedIndexedAccess`) : aucun `any`, aucun `!` sur un index, `as unknown as` réservé aux faux objets des tests et aux événements de `PointerSurface`.

**Interdits.** Ne pas modifier les 14 tests existants de `router.test.ts`. Ne pas toucher `engine.ts`, `keys.ts`,
`main.ts` (T38, T40). Aucune lecture du clavier ici : l'espace arrive par `panHeld`.

**Terminé quand.** 20 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : appelé createRouter,
RouterOptions (router.ts, étendu), DrawTool, GestureSink, ViewSink (gesture.ts)`.

**Étapes.**

- [ ] **1. Écrire les tests (rouge).** Dans `apps/web/src/engine/input/router.test.ts`, importer le type
  (`import type { DrawTool, GestureSink, ToolChoice, ViewSink } from "./gesture";`), ajouter après `penSeen` :

```ts
function setupTool(tool: () => ToolChoice, held: () => boolean = () => false, opts: RouterOptions = DEFAULT_ROUTER_OPTIONS) {
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
  return { router: createRouter(opts, { currentTool: tool, panHeld: held, gestures, view }), log };
}
```

et à la fin du `describe("createRouter (D18)", …)` :

```ts
  it("outil main : stylet et souris déplacent la vue, aucun trait", () => {
    const { router, log } = setupTool(() => "hand");
    router.handle(ev("start", 1, "pen", [s(0, 0, 0)]));
    router.handle(ev("move", 1, "pen", [s(5, 2, 5)]));
    router.handle(ev("end", 1, "pen", []));
    router.handle(ev("start", 2, "mouse", [s(10, 10, 20)]));
    router.handle(ev("move", 2, "mouse", [s(4, 10, 25)]));
    router.handle(ev("end", 2, "mouse", []));
    expect(log).toEqual(["pan 5 2", "pan -6 0"]);
    expect(router.penSeen()).toBe(true);
  });

  it("outil main : le bouton gomme du stylet déplace aussi la vue, aucune gomme", () => {
    const { router, log } = setupTool(() => "hand");
    router.handle(ev("start", 1, "pen", [s(0, 0, 0)], { eraserButton: true }));
    router.handle(ev("move", 1, "pen", [s(3, 0, 5)], { eraserButton: true }));
    router.handle(ev("end", 1, "pen", [], { eraserButton: true }));
    expect(log).toEqual(["pan 3 0"]);
  });

  it("outil main : un doigt déplace la vue, un second le pince, même sans stylet vu", () => {
    const { router, log } = setupTool(() => "hand");
    router.handle(ev("start", 3, "touch", [s(100, 100, 0)]));
    router.handle(ev("move", 3, "touch", [s(110, 100, 10)]));
    router.handle(ev("start", 4, "touch", [s(200, 100, 50)]));
    router.handle(ev("move", 3, "touch", [s(20, 100, 60)]));
    expect(log).toEqual(["pan 10 0", "pan -45 0", "zoom 110 100 2"]);
  });

  it("espace maintenu : la souris déplace la vue ; relâché, elle trace de nouveau", () => {
    let held = true;
    const { router, log } = setupTool(() => "pen", () => held);
    router.handle(ev("start", 1, "mouse", [s(0, 0, 0)]));
    router.handle(ev("move", 1, "mouse", [s(7, 0, 5)]));
    router.handle(ev("end", 1, "mouse", []));
    held = false;
    router.handle(ev("start", 2, "mouse", [s(0, 0, 10)]));
    expect(log).toEqual(["pan 7 0", "begin 2 pen 1"]);
  });

  it("espace lu au début du geste : relâché pendant le glisser, la vue suit jusqu'au relâché", () => {
    let held = true;
    const { router, log } = setupTool(() => "pen", () => held);
    router.handle(ev("start", 1, "mouse", [s(0, 0, 0)]));
    held = false;
    router.handle(ev("move", 1, "mouse", [s(4, 4, 5)]));
    router.handle(ev("end", 1, "mouse", []));
    expect(log).toEqual(["pan 4 4"]);
  });

  it("réglage du doigt lu à chaque geste (accesseur) : bascule à chaud", () => {
    let pans = true;
    const opts: RouterOptions = {
      get fingerPansAfterPen() {
        return pans;
      },
      secondFingerMs: SECOND_FINGER_MS,
    };
    const { router, log } = setupTool(() => "pen", () => false, opts);
    penSeen(router, log);
    router.handle(ev("start", 3, "touch", [s(0, 0, 100)]));
    router.handle(ev("end", 3, "touch", []));
    pans = false;
    router.handle(ev("start", 4, "touch", [s(0, 0, 200)]));
    expect(log).toEqual(["begin 4 pen 1"]);
  });
```

- [ ] **2. Lancer, voir rouge.** Commande du § Test → les tests de l'outil main et de l'espace échouent (`begin 1 hand
  1` ou `begin 1 pen 1` au lieu de `pan …`) ; `ToolChoice` inconnu au typage.

- [ ] **3. Ajouter le type.** À la fin de `apps/web/src/engine/input/gesture.ts` :

```ts
/** Outil choisi dans la barre : un outil de dessin, ou la main (D17) qui fait de tout geste un déplacement de vue. */
export type ToolChoice = DrawTool | "hand";
```

- [ ] **4. Étendre le routeur.** Dans `apps/web/src/engine/input/router.ts`, l'import devient
  `import type { CloseReason, GestureSink, ToolChoice, ViewSink } from "./gesture";`, et :

```ts
export interface RouterDeps {
  /** Outil courant ; "hand" (outil main, D17) : tout geste déplace la vue. */
  currentTool(): ToolChoice;
  /** Barre d'espace tenue (D17) : lue au début du geste ; absent = jamais tenue. */
  panHeld?(): boolean;
  readonly gestures: GestureSink;
  readonly view: ViewSink;
}
```

`onStart` devient (le reste du fichier inchangé ; le commentaire d'en-tête gagne la phrase « Outil main ou espace
tenu : tout geste déplace la vue (D17). ») :

```ts
  const onStart = (g: GestureEvent): void => {
    const s = g.samples[0];
    if (!s) return;
    const track: Track = { role: "ignored", pointerType: g.pointerType, startT: s.t, x: s.x, y: s.y };
    tracks.set(g.pointerId, track);
    if (g.pointerType === "pen") seenPen = true;
    const tool = deps.currentTool();
    const held = deps.panHeld?.() === true;
    if (g.pointerType !== "touch") {
      if (tool === "hand" || held) {
        track.role = "pan";
        return;
      }
      track.role = "draw";
      deps.gestures.begin(g.pointerId, g.eraserButton ? "eraser" : tool, g.samples);
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
    if (drawing) return; // second doigt tardif : ignoré, le trait continue
    if (tool === "hand" || held || (seenPen && opts.fingerPansAfterPen)) {
      track.role = "pan";
      return;
    }
    track.role = "draw";
    deps.gestures.begin(g.pointerId, tool, g.samples);
  };
```

- [ ] **5. Lancer, voir vert.** Commande du § Test → `Tests  20 passed (20)`, les trois noms présents.

- [ ] **6. Suite complète.** `verifier.sh` sous le jeton → `verifier.sh : OK` (`main.ts` passe encore
  `currentTool: () => engine.tool()`, qui rend un `DrawTool` : compatible).

- [ ] **7. Commit.**

```bash
cd "$WT" && git add apps/web/src/engine/input/gesture.ts apps/web/src/engine/input/router.ts apps/web/src/engine/input/router.test.ts
cd "$WT" && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(input): hand tool and held space pan the view (D17)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t36"></a>
### Tâche T36 — Historique des images borné et résumé du banc dit (constats)

**Objectif.** Fermer deux constats de l'état. (1) `createFrameLoop` garde toutes les durées d'image d'une séance et
`durations()` les copie toutes : une borne facultative (`maxDurations`) en garde au plus N, les plus récentes, à coût
amorti constant ; sans borne, rien ne change (banc du lot 1). Le moteur passera 3 600 (T38). (2) Le panneau du banc
(`banc.ts:99`) résume les 600 dernières images sans le dire : il le dit ; et le test distingue enfin `slice(-n)` de
`slice(0, n)`. Scénario : S1 (banc rejoué, `?banc`).

**Fichiers.** Modifier `apps/web/src/proto/frame-loop.ts`, `apps/web/src/proto/frame-loop.test.ts` (3 tests ajoutés),
`apps/web/src/app/banc.ts:92-101` (`paint` du panneau ; la ligne `Images …` est la 99 du constat), `apps/web/src/app/banc.test.ts` (2 tests ajoutés).

**Interfaces.**
- Consomme : rien du lot.
- Réutilise : `apps/web/src/proto/frame-loop.ts` — `createFrameLoop(deps: FrameLoopDeps, onFrame)`, `FrameLoop`
  (étendu d'un paramètre facultatif) ; `apps/web/src/app/banc.ts` — `createAppBench`, `AppBenchReport`,
  `mountBenchPanel`, `PANEL_RECENT_FRAMES = 600` (étendu : `panelText` sorti de `paint`).
- Produit : `createFrameLoop(deps: FrameLoopDeps, onFrame: (now: number) => void, maxDurations?: number): FrameLoop`
  (borne invalide — 0, négative, non finie — : sans borne) ; `panelText(r: AppBenchReport): string` (quatre lignes ;
  la quatrième contient `les 600 dernières images au plus`).

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/proto/frame-loop.test.ts src/app/banc.test.ts --reporter=verbose 2>&1 | tail -25`
→ `Tests  14 passed (14)` (frame-loop 8, banc 6) ; noms `report(n) garde les n dernières images, pas les n premières`,
`maxDurations : seules les N dernières durées, dans l'ordre` et `panneau : le résumé dit qu'il porte sur les 600
dernières images` présents. Puis `verifier.sh` (jeton) → `verifier.sh : OK`, dont `verifier.sh : prototype en fichier
unique OK` (le prototype importe `frame-loop.ts`).

**Preuve visuelle.** Aucune.

**Contraintes (recopiées de « Global Constraints »).** Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de `--force` ; aucun `git tag`, aucune release ; aucun workflow GitHub Actions (`.github/workflows/` non touché) ; un seul build Tauri à la fois, aucun build Android (aucun dans cette tâche) ; tests par `scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire socle/T36 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"` (commandes ciblées sous le même jeton) ; relecteurs au premier plan (`run_in_background: false`) ; commit d'auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par la ligne exacte `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, quel que soit le modèle qui exécute ; aucun seuil baissé, aucun test désactivé, sauté (`.skip`, `.todo`, `#[ignore]` hors test de mesure) ni affaibli ; dépôt public : aucun secret ni chemin personnel hors dépôt dans un fichier commité ; `$WT` = dossier donné par l'orchestrateur (défaut `/home/adminjd/projets/roomboard-wt/socle--T36`), worktree neuf : `cd "$WT" && pnpm install --frozen-lockfile` d'abord, `verifier.sh` une fois avant de juger une erreur de type sur `./wasm/roomboard_wasm` ; `apps/web/src/core/api.ts` figé ; rien n'est écrit dans le document avant le relâché (D38) ; moteur sans framework ni global du DOM (exceptions : `render/canvas2d.ts`, `input/support.ts`, méthodes des canvas reçus dans `render/select.ts` ; `URLSearchParams` admis dans `settings.ts`) ; le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif (aucun appel Tauri dans le moteur, échelon 6 interdit, échelon 5 au lot 5) ; chaque réglage a un test allumé et un test éteint ; cœur : aucune horloge ni dépendance au navigateur hors tests, `cargo fmt` et `clippy -D warnings` passent ; TypeScript strict (`noUncheckedIndexedAccess`) : aucun `any`, aucun `!` sur un index, `as unknown as` réservé aux faux objets des tests et aux événements de `PointerSurface`.

**Interdits.** Ne pas changer l'appel de `createFrameLoop` dans `proto/stylet.ts` (le banc du lot 1 garde tout) ni
dans `engine.ts` (T38). Ne pas modifier les 5 tests de `frame-loop.test.ts` ni les 4 de `banc.test.ts`.

**Terminé quand.** 14 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : appelé createFrameLoop
(frame-loop.ts, étendu), createAppBench / mountBenchPanel (banc.ts, étendu)`.

**Étapes.**

- [ ] **1. Écrire les tests (rouge).** À la fin du `describe("createFrameLoop", …)` de
  `apps/web/src/proto/frame-loop.test.ts` :

```ts
  it("maxDurations : seules les N dernières durées, dans l'ordre", () => {
    const clock = fakeClock();
    const loop = createFrameLoop(clock.deps, () => {}, 3);
    loop.start();
    for (const ms of [10, 11, 12, 13, 14, 15, 16, 17]) clock.advance(ms);
    expect(loop.durations()).toEqual([15, 16, 17]);
  });

  it("sans borne : toutes les durées (banc du lot 1)", () => {
    const clock = fakeClock();
    const loop = createFrameLoop(clock.deps, () => {});
    loop.start();
    for (let i = 0; i < 1000; i++) clock.advance(16);
    expect(loop.durations()).toHaveLength(999);
  });

  it("borne invalide (0, négative, NaN) : sans borne", () => {
    for (const max of [0, -5, Number.NaN]) {
      const clock = fakeClock();
      const loop = createFrameLoop(clock.deps, () => {}, max);
      loop.start();
      for (let i = 0; i < 10; i++) clock.advance(16);
      expect(loop.durations()).toHaveLength(9);
    }
  });
```

Dans `apps/web/src/app/banc.test.ts`, l'import devient `import { createAppBench, panelText, PANEL_RECENT_FRAMES,
type AppBenchDeps } from "./banc";`, et à la fin du `describe("createAppBench", …)` :

```ts
  it("report(n) garde les n dernières images, pas les n premières", () => {
    const { bench } = setupWith([...Array.from({ length: 900 }, () => 10), ...Array.from({ length: 100 }, () => 40)]);
    expect(bench.report(100).frames).toMatchObject({ count: 100, p50: 40, p95: 40 });
    expect(bench.report().frames?.count).toBe(1000);
  });

  it("panneau : le résumé dit qu'il porte sur les 600 dernières images", () => {
    const { bench } = setup();
    expect(PANEL_RECENT_FRAMES).toBe(600);
    const text = panelText(bench.report(PANEL_RECENT_FRAMES));
    expect(text.split("\n")).toHaveLength(4);
    expect(text).toContain("les 600 dernières images au plus");
  });
```

- [ ] **2. Lancer, voir rouge.** Commande du § Test → `maxDurations : …` rend 7 durées au lieu de 3 ;
  `panelText` n'est pas exporté (`panelText is not a function`). `report(n) garde …` passe déjà (le code fait
  `slice(-n)`) : il fige ce comportement, la mutation `slice(0, n)` le ferait échouer (à dire dans le rapport).

- [ ] **3. Borner la boucle.** `apps/web/src/proto/frame-loop.ts`, `createFrameLoop` devient :

```ts
/**
 * `maxDurations` : au plus N durées gardées, les plus récentes (retrait par paquets : coût amorti constant, jamais plus
 * de 2 × N en mémoire). Absent, nul, négatif ou non fini : toutes (banc du lot 1).
 */
export function createFrameLoop(
  deps: FrameLoopDeps,
  onFrame: (now: number) => void,
  maxDurations: number = Number.POSITIVE_INFINITY,
): FrameLoop {
  const cap = Number.isFinite(maxDurations) && maxDurations >= 1 ? Math.floor(maxDurations) : Number.POSITIVE_INFINITY;
  let id: number | null = null;
  let last: number | null = null;
  let measured: number[] = [];

  const tick = (): void => {
    const now = deps.now();
    if (last !== null) {
      measured.push(now - last);
      if (measured.length > 2 * cap) measured.splice(0, measured.length - cap);
    }
    last = now;
    id = deps.requestFrame(tick);
    onFrame(now);
  };

  return {
    start() {
      if (id !== null) return;
      last = null;
      id = deps.requestFrame(tick);
    },
    stop() {
      if (id !== null) deps.cancelFrame(id);
      id = null;
      last = null;
    },
    running: () => id !== null,
    durations: () => (measured.length > cap ? measured.slice(-cap) : measured.slice()),
    clear() {
      measured = [];
    },
  };
}
```

- [ ] **4. Dire le résumé du panneau.** Dans `apps/web/src/app/banc.ts`, sortir le texte de `paint` dans une fonction
  exportée, placée après `fmt` :

```ts
/** Texte du panneau : quatre lignes ; le résumé des images porte sur les PANEL_RECENT_FRAMES dernières, et le dit. */
export function panelText(r: AppBenchReport): string {
  const t = r.totals;
  return [
    `Banc (géométrie du produit, cœur ${r.coreVersion})`,
    `Traits ${t.strokes} (stylet ${t.penStrokes}) · pression stylet ${fmt(t.penPressure?.min, 2)}–${fmt(t.penPressure?.max, 2)}`,
    `Retard interne p50 ${fmt(t.latencyP50)} / p95 ${fmt(t.latencyP95)} ms`,
    `Images ${r.frames?.count ?? 0} (les ${PANEL_RECENT_FRAMES} dernières images au plus), p95 ${fmt(r.frames?.p95)} ms, > 25 ms ${fmt(r.frames ? r.frames.overBudgetShare * 100 : null)} %`,
  ].join("\n");
}
```

et `paint` devient :

```ts
  const paint = (): void => {
    pre.textContent = panelText(bench.report(PANEL_RECENT_FRAMES));
  };
```

Le bouton d'export reçoit une infobulle : `button.title = "Toutes les images retenues par le moteur (3 600 au plus)";`
(ligne ajoutée après `button.textContent = …`).

- [ ] **5. Lancer, voir vert.** Commande du § Test → `Tests  14 passed (14)`, les trois noms présents.

- [ ] **6. Suite complète.** `verifier.sh` sous le jeton → `verifier.sh : OK` et `prototype en fichier unique OK`.

- [ ] **7. Commit.**

```bash
cd "$WT" && git add apps/web/src/proto/frame-loop.ts apps/web/src/proto/frame-loop.test.ts apps/web/src/app/banc.ts apps/web/src/app/banc.test.ts
cd "$WT" && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "fix(bench): bounded frame history and a panel that says what it sums up" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t37"></a>
### Tâche T37 — Mesure de la copie du contour au-delà de 2 000 points

**Objectif.** Constat des lots 2 et 3 : au-delà de 2 000 points (`FULL_LIMIT`), `StrokeBuilder::push` fige des blocs de
256 points mais rend encore, à chaque image, le contour entier (blocs figés recopiés + queue recalculée) ; la liaison
le copie vers la page. Mesurer ce coût par un test de mesure en release, avec un seuil écrit, sans changer le code.
Seuil : `push` d'une image (4 points) sur un trait de 10 000 points, p95 ≤ 4 ms en release native (environ 8 ms en
Wasm, la moitié d'une image de 16 ms ; HL3b-9). Au-delà : le test échoue, le seuil ne baisse pas, la tâche le rapporte
et l'orchestrateur décide d'une tâche de réduction (elle toucherait `api.ts`, figé ici). Scénario : S2 (encre vive d'un
long trait).

**Fichiers.** Modifier `crates/roomboard-core/src/ink/builder.rs` (un test ajouté dans `mod tests`).

**Interfaces.**
- Consomme : rien du lot.
- Réutilise : `crates/roomboard-core/src/ink/builder.rs` — `StrokeBuilder::new(style: InkStyle)`,
  `StrokeBuilder::push(&mut self, flat: &[f32]) -> Vec<f32>`, `FULL_LIMIT = 2000`, `BLOCK = 256` ;
  `crates/roomboard-core/src/ink/outline.rs` — `InkStyle { width }` ; patron du test de mesure
  `crates/roomboard-core/src/query.rs:453-483` (`#[ignore = "mesure de coût, lancée à la main"]`, `Instant` en test).
- Produit : test `ink::builder::tests::long_stroke_push_cost` (ignoré par défaut, lancé en release) ; lignes
  `Mesure : <n> points, contour <len> flottants, push p50 <x> ms, p95 <y> ms`.

**Test et commande bornée.**
`cd "$WT" && PATH=$HOME/.cargo/bin:$PATH cargo test -p roomboard-core --release --lib -- --ignored --nocapture long_stroke_push_cost 2>&1 | grep -E "Mesure|test result|panicked"`
→ trois lignes `Mesure :` (2 000, 5 000, 10 000 points), `test result: ok. 1 passed`. Relevé à l'écriture du plan
(copie d'essai, VM) : p95 0,016 / 0,017 / 0,019 ms, contour de 22 664 flottants à 10 000 points : très en deçà du
seuil. Puis `verifier.sh` (jeton) →
`verifier.sh : OK` (le test compile sous `clippy --all-targets -D warnings` ; il reste ignoré dans `cargo test
--workspace`, comme la mesure de `query.rs`).

**Preuve visuelle.** Aucune.

**Contraintes (recopiées de « Global Constraints »).** Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de `--force` ; aucun `git tag`, aucune release ; aucun workflow GitHub Actions (`.github/workflows/` non touché) ; un seul build Tauri à la fois, aucun build Android (aucun dans cette tâche) ; tests par `scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire socle/T37 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"` (commandes ciblées sous le même jeton) ; relecteurs au premier plan (`run_in_background: false`) ; commit d'auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par la ligne exacte `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, quel que soit le modèle qui exécute ; aucun seuil baissé, aucun test désactivé, sauté (`.skip`, `.todo`, `#[ignore]` hors test de mesure) ni affaibli ; dépôt public : aucun secret ni chemin personnel hors dépôt dans un fichier commité ; `$WT` = dossier donné par l'orchestrateur (défaut `/home/adminjd/projets/roomboard-wt/socle--T37`), worktree neuf : `cd "$WT" && pnpm install --frozen-lockfile` d'abord, `verifier.sh` une fois avant de juger une erreur de type sur `./wasm/roomboard_wasm` ; `apps/web/src/core/api.ts` figé ; rien n'est écrit dans le document avant le relâché (D38) ; moteur sans framework ni global du DOM (exceptions : `render/canvas2d.ts`, `input/support.ts`, méthodes des canvas reçus dans `render/select.ts` ; `URLSearchParams` admis dans `settings.ts`) ; le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif (aucun appel Tauri dans le moteur, échelon 6 interdit, échelon 5 au lot 5) ; chaque réglage a un test allumé et un test éteint ; cœur : aucune horloge ni dépendance au navigateur hors tests, `cargo fmt` et `clippy -D warnings` passent ; TypeScript strict (`noUncheckedIndexedAccess`) : aucun `any`, aucun `!` sur un index, `as unknown as` réservé aux faux objets des tests et aux événements de `PointerSurface`.

**Interdits.** Aucun changement du code de `StrokeBuilder` ni de la liaison. Seuil non modifiable par la tâche. Pas de
dépendance de banc (`criterion`) ajoutée. `#[ignore]` permis ici seulement parce que c'est un test de mesure (patron
de `query.rs`), avec la raison écrite.

**Terminé quand.** Le test tourne en release, `1 passed`, les trois mesures recopiées telles quelles dans le rapport
(ligne `Mesure :` du rapport) ; ou `panicked` avec la valeur mesurée, rapportée comme « au-delà du seuil » ;
`verifier.sh : OK` ; rapport avec `Réutilisation : appelé StrokeBuilder::push (builder.rs)`.

**Étapes.**

- [ ] **1. Écrire le test de mesure.** À la fin de `mod tests` de `crates/roomboard-core/src/ink/builder.rs` :

```rust
    /// Mesure (constat des lots 2 et 3, lot 3b T37) : coût d'un `push` d'une image (4 points) sur un trait déjà long,
    /// copie du contour entier comprise (le `Vec<f32>` rendu est celui que la liaison copie vers la page). Seuil écrit :
    /// p95 ≤ 4 ms en release native à 10 000 points, soit environ 8 ms en Wasm, la moitié d'une image de 16 ms.
    /// `cargo test -p roomboard-core --release --lib -- --ignored --nocapture long_stroke_push_cost`
    #[test]
    #[ignore = "mesure de coût, lancée à la main en release"]
    fn long_stroke_push_cost() {
        const FRAME: usize = 4;
        const SAMPLES: usize = 200;
        let mut p95_at_10k = f64::MAX;
        for n in [2_000_usize, 5_000, 10_000] {
            let mut b = StrokeBuilder::new(InkStyle { width: 6.0 });
            let all: Vec<f32> = (0..n + FRAME * SAMPLES)
                .flat_map(|i| [i as f32 * 2.0, (i as f32 * 0.05).sin() * 40.0, 0.5])
                .collect();
            for chunk in all[..n * 3].chunks(FRAME * 3) {
                b.push(chunk);
            }
            let mut times: Vec<f64> = Vec::with_capacity(SAMPLES);
            let mut len = 0;
            for chunk in all[n * 3..].chunks(FRAME * 3) {
                let start = std::time::Instant::now();
                let out = b.push(chunk);
                times.push(start.elapsed().as_secs_f64() * 1000.0);
                len = out.len();
            }
            times.sort_by(f64::total_cmp);
            let p50 = times[times.len() / 2];
            let p95 = times[times.len() * 95 / 100];
            eprintln!("Mesure : {n} points, contour {len} flottants, push p50 {p50:.3} ms, p95 {p95:.3} ms");
            if n == 10_000 {
                p95_at_10k = p95;
            }
        }
        assert!(
            p95_at_10k <= 4.0,
            "push à 10 000 points : p95 {p95_at_10k:.3} ms > 4 ms (seuil du lot 3b, HL3b-9)"
        );
    }
```

- [ ] **2. Vérifier qu'il est ignoré par défaut.** `cd "$WT" && PATH=$HOME/.cargo/bin:$PATH cargo test -p roomboard-core --lib ink::builder 2>&1 | grep -E "test result|long_stroke"`
  → `long_stroke_push_cost ... ignored`, `test result: ok. 8 passed; 0 failed; 1 ignored` (les 8 tests du builder verts).

- [ ] **3. Lancer la mesure.** Commande du § Test (release). Recopier les trois lignes `Mesure :` dans le rapport.

- [ ] **4. Suite complète.** `verifier.sh` sous le jeton → `verifier.sh : OK` (`cargo fmt --check` : formater par
  `cargo fmt -p roomboard-core` si besoin ; `clippy -D warnings` vert).

- [ ] **5. Commit.**

```bash
cd "$WT" && git add crates/roomboard-core/src/ink/builder.rs
cd "$WT" && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "test(ink): measure live outline copy beyond 2000 points with a written threshold" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t38"></a>
### Tâche T38 — Moteur : outil main, espace, caméra par page, plafond des images

**Objectif.** Reste de D17 dans le moteur : l'outil main (`setTool("hand")`), la barre d'espace tenue (`key` /
`keyUp` / `releaseKeys` / `panHeld`, lue par le routeur au début d'un geste), la caméra par page (`showPage` : chaque
page garde sa vue, une page jamais montrée est ajustée à la vue). Constat de l'état : l'historique des durées d'image
du moteur est borné à 3 600 (`ENGINE_FRAME_HISTORY`). Scénario : S2 (outil main et espace + glisser au passage par
défaut, T40).

**Fichiers.** Remplacer `apps/web/src/engine/engine.ts` (texte complet ci-dessous). Modifier
`apps/web/src/engine/input/keys.ts` (fonction ajoutée), `apps/web/src/engine/engine.test.ts` (8 tests ajoutés, import
de `fitPage` et `ENGINE_FRAME_HISTORY`), `apps/web/src/engine/input/keys.test.ts` (4 tests ajoutés).

**Interfaces.**
- Consomme : T35 — `ToolChoice = DrawTool | "hand"` (`input/gesture.ts`) ; T36 —
  `createFrameLoop(deps, onFrame, maxDurations?: number)` (`proto/frame-loop.ts`).
- Réutilise : `apps/web/src/engine/engine.ts` — `createEngine(deps: EngineDeps): Engine` (étendu) ;
  `apps/web/src/engine/camera.ts` — `fitPage(viewW, viewH)`, `panBy`, `zoomAt`, `IDENTITY`, `Camera` (appelées
  telles quelles) ; `apps/web/src/engine/input/keys.ts` — `keyAction(e: KeyLike)`, `KeyLike` (étendu de `isPanKey`).
- Produit (`engine.ts`) : `EngineState.tool: ToolChoice` (seul champ changé) ; `Engine.tool(): ToolChoice` ;
  `Engine.setTool(t: ToolChoice): void` ; `Engine.key(e: KeyLike): boolean` (vrai aussi pour l'espace tenu) ;
  `Engine.keyUp(e: KeyLike): boolean` ; `Engine.releaseKeys(): void` ; `Engine.panHeld(): boolean` ;
  `Engine.showPage(id: string): boolean` ; `ENGINE_FRAME_HISTORY = 3600`.
- Produit (`keys.ts`) : `isPanKey(e: KeyLike): boolean` (espace, sans Ctrl, Cmd ni Alt, hors champ de saisie et hors
  composition IME ; un bouton n'est pas un champ).

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/engine/engine.test.ts src/engine/input/keys.test.ts --reporter=verbose 2>&1 | tail -45`
→ `Tests  34 passed (34)` (engine 21, keys 13) ; noms `caméra par page : chaque page garde sa vue`, `releaseKeys :
espace relâché à la perte du focus`, `espace dans un champ de saisie : rien, la touche reste au champ`, `frameDurations
plafonné à 3 600 images (ENGINE_FRAME_HISTORY)` et `espace dans un champ ou pendant une composition IME : non`
présents ; les 13 tests du moteur et les 9 des touches du lot 3 inchangés et verts. Puis `verifier.sh` (jeton) →
`verifier.sh : OK` (garde verts `barre.test.ts` et `banc.test.ts`, qui lisent `EngineState`).

**Preuve visuelle.** Aucune ici (S2 en T40).

**Contraintes (recopiées de « Global Constraints »).** Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de `--force` ; aucun `git tag`, aucune release ; aucun workflow GitHub Actions (`.github/workflows/` non touché) ; un seul build Tauri à la fois, aucun build Android (aucun dans cette tâche) ; tests par `scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire socle/T38 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"` (commandes ciblées sous le même jeton) ; relecteurs au premier plan (`run_in_background: false`) ; commit d'auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par la ligne exacte `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, quel que soit le modèle qui exécute ; aucun seuil baissé, aucun test désactivé, sauté (`.skip`, `.todo`, `#[ignore]` hors test de mesure) ni affaibli ; dépôt public : aucun secret ni chemin personnel hors dépôt dans un fichier commité ; `$WT` = dossier donné par l'orchestrateur (défaut `/home/adminjd/projets/roomboard-wt/socle--T38`), worktree neuf : `cd "$WT" && pnpm install --frozen-lockfile` d'abord, `verifier.sh` une fois avant de juger une erreur de type sur `./wasm/roomboard_wasm` ; `apps/web/src/core/api.ts` figé ; rien n'est écrit dans le document avant le relâché (D38) ; moteur sans framework ni global du DOM (exceptions : `render/canvas2d.ts`, `input/support.ts`, méthodes des canvas reçus dans `render/select.ts` ; `URLSearchParams` admis dans `settings.ts`) ; le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif (aucun appel Tauri dans le moteur, échelon 6 interdit, échelon 5 au lot 5) ; chaque réglage a un test allumé et un test éteint ; cœur : aucune horloge ni dépendance au navigateur hors tests, `cargo fmt` et `clippy -D warnings` passent ; TypeScript strict (`noUncheckedIndexedAccess`) : aucun `any`, aucun `!` sur un index, `as unknown as` réservé aux faux objets des tests et aux événements de `PointerSurface`.

**Interdits.** Aucun champ ajouté à `EngineState` (la barre et ses tests le construisent : seul le type de `tool`
s'élargit). Ne pas toucher `camera.ts`, le routeur, les outils, `main.ts`. Ne pas modifier les tests existants.

**Terminé quand.** 34 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : appelé createEngine (étendu),
fitPage / panBy / zoomAt (camera.ts), keyAction (keys.ts), createFrameLoop avec borne (T36), ToolChoice (T35)`.

**Étapes.**

- [ ] **1. Écrire les tests (rouge).** `apps/web/src/engine/input/keys.test.ts` : l'import devient
  `import { isPanKey, keyAction, type KeyLike } from "./keys";`, et à la fin du fichier :

```ts
describe("isPanKey (D17 : espace + glisser)", () => {
  it("espace seul : déplacement de vue (Maj admise)", () => {
    expect(isPanKey(k(" "))).toBe(true);
    expect(isPanKey(k(" ", { shiftKey: true }))).toBe(true);
  });
  it("espace avec Ctrl, Cmd ou Alt : non", () => {
    expect(isPanKey(k(" ", { ctrlKey: true }))).toBe(false);
    expect(isPanKey(k(" ", { metaKey: true }))).toBe(false);
    expect(isPanKey(k(" ", { altKey: true }))).toBe(false);
  });
  it("espace dans un champ ou pendant une composition IME : non", () => {
    expect(isPanKey(k(" ", { target: { tagName: "input" } }))).toBe(false);
    expect(isPanKey(k(" ", { target: { isContentEditable: true } }))).toBe(false);
    expect(isPanKey(k(" ", { isComposing: true }))).toBe(false);
    expect(isPanKey(k(" ", { target: { tagName: "BUTTON" } }))).toBe(true);
  });
  it("autre touche : non", () => {
    expect(isPanKey(k("a"))).toBe(false);
    expect(isPanKey(k("Spacebar"))).toBe(false);
  });
});
```

`apps/web/src/engine/engine.test.ts` : les imports deviennent
`import { fitPage, type Camera } from "./camera";` et
`import { createEngine, ENGINE_FRAME_HISTORY, WHEEL_ZOOM_SPEED, type ToolFactories } from "./engine";`, et à la fin
du `describe("createEngine", …)` :

```ts
  it("outil main : setTool('hand') dans l'état et dans tool()", () => {
    const { engine } = setup();
    const seen: string[] = [];
    engine.onState((s) => seen.push(s.tool));
    engine.setTool("hand");
    expect(engine.tool()).toBe("hand");
    expect(seen).toEqual(["hand"]);
  });

  it("espace : keydown tient la vue (panHeld), keyup la rend ; les deux demandent preventDefault", () => {
    const { engine } = setup();
    expect(engine.panHeld()).toBe(false);
    expect(engine.key(key(" "))).toBe(true);
    expect(engine.panHeld()).toBe(true);
    expect(engine.key(key(" "))).toBe(true);
    expect(engine.keyUp(key(" "))).toBe(true);
    expect(engine.panHeld()).toBe(false);
    expect(engine.keyUp(key(" "))).toBe(false);
    expect(engine.keyUp(key("z"))).toBe(false);
  });

  it("espace dans un champ de saisie : rien, la touche reste au champ", () => {
    const { engine } = setup();
    expect(engine.key(key(" ", { target: { tagName: "INPUT" } }))).toBe(false);
    expect(engine.panHeld()).toBe(false);
    expect(engine.keyUp(key(" ", { target: { tagName: "INPUT" } }))).toBe(false);
  });

  it("releaseKeys : espace relâché à la perte du focus", () => {
    const { engine } = setup();
    engine.key(key(" "));
    engine.releaseKeys();
    expect(engine.panHeld()).toBe(false);
  });

  it("caméra par page : chaque page garde sa vue", () => {
    const { doc, engine } = setup();
    const p1 = engine.state().page;
    expect(engine.run({ type: "AddPage", after: p1 })).not.toBeNull();
    const p2 = doc.pageIds().find((id) => id !== p1) ?? "";
    engine.resize(1280, 720, 1);
    engine.view.panBy(100, 0);
    const cam1: Camera = engine.camera();
    expect(engine.showPage(p2)).toBe(true);
    expect(engine.state().page).toBe(p2);
    expect(engine.camera()).toEqual(fitPage(1280, 720));
    engine.view.zoomAt(0, 0, 2);
    const cam2 = engine.camera();
    expect(engine.showPage(p1)).toBe(true);
    expect(engine.camera()).toEqual(cam1);
    expect(engine.showPage(p2)).toBe(true);
    expect(engine.camera()).toEqual(cam2);
  });

  it("showPage d'une page inconnue : false, rien ne change", () => {
    const { engine } = setup();
    const before = engine.state();
    const cam = engine.camera();
    expect(engine.showPage("inconnue")).toBe(false);
    expect(engine.state()).toEqual(before);
    expect(engine.camera()).toBe(cam);
  });

  it("showPage ferme les gestes en cours sans écriture (abort) et redessine la page montrée", () => {
    const { doc, engine, log, frames, renderer } = setup();
    const p1 = engine.state().page;
    engine.run({ type: "AddPage", after: p1 });
    const p2 = doc.pageIds().find((id) => id !== p1) ?? "";
    engine.sink.begin(1, "pen", [sample]);
    expect(engine.showPage(p2)).toBe(true);
    expect(log).toContain("pen.close 1 abort");
    frames.tick();
    expect(renderer.scenes.at(-1)?.page.id).toBe(p2);
    expect(doc.elementIds(p1)).toEqual([]);
  });

  it("frameDurations plafonné à 3 600 images (ENGINE_FRAME_HISTORY)", () => {
    const { engine, frames } = setup();
    expect(ENGINE_FRAME_HISTORY).toBe(3600);
    engine.sink.begin(1, "pen", [sample]);
    for (let i = 0; i < 3700; i++) frames.tick();
    expect(engine.frameDurations()).toHaveLength(3600);
  });
```

- [ ] **2. Lancer, voir rouge.** Commande du § Test → `isPanKey is not a function`, `engine.panHeld is not a
  function`, `engine.showPage is not a function`, `frameDurations` rend 3 699 durées.

- [ ] **3. Ajouter `isPanKey`.** Dans `apps/web/src/engine/input/keys.ts`, après `const EDITABLE = …` :

```ts
/** Cible d'édition (champ, zone éditable) : ses touches lui appartiennent. Un bouton n'en est pas une. */
const inEditable = (t: KeyLike["target"]): boolean =>
  t !== null && (t.isContentEditable === true || (t.tagName !== undefined && EDITABLE.has(t.tagName.toUpperCase())));

/** Barre d'espace sans Ctrl, Cmd ni Alt, hors champ de saisie et hors composition IME (D17 : espace + glisser). */
export function isPanKey(e: KeyLike): boolean {
  return e.key === " " && !e.ctrlKey && !e.metaKey && !e.altKey && !e.isComposing && !inEditable(e.target);
}
```

et dans `keyAction`, remplacer le test de la cible par `if (inEditable(e.target)) return null;` (même règle,
écrite une fois).

- [ ] **4. Remplacer `engine.ts`.** `apps/web/src/engine/engine.ts` :

```ts
/**
 * Moteur d'interaction (DA2) : relie le routeur (par `sink` et `view`), les outils, la caméra, le rendu et le cœur.
 * Sans framework ni DOM : la page (main.ts) branche les événements et injecte outils et rendu. Une écriture par geste,
 * au relâché (D38) ; toute erreur du cœur (dernière page, points invalides…) est attrapée et rendue dans l'état.
 * Lot 3b (D17) : outil main, barre d'espace tenue (lue par le routeur), caméra par page ; historique des images borné.
 */
import type { Change, Command, CoreDocument, EraseMode, StrokeStyle } from "../core/api";
import { createFrameLoop, type FrameLoopDeps } from "../proto/frame-loop";
import { fitPage, IDENTITY, panBy as panCamera, zoomAt as zoomCamera, type Camera } from "./camera";
import type { CloseReason, DrawTool, GestureSink, ToolChoice, ViewSink } from "./input/gesture";
import { isPanKey, keyAction, type KeyAction, type KeyLike } from "./input/keys";
import type { Renderer } from "./render/renderer";
import type { GestureTool, LivePart, ToolContext } from "./tools/tool";

export interface EngineState {
  readonly tool: ToolChoice;
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
  tool(): ToolChoice;
  setTool(t: ToolChoice): void;
  setEraserMode(m: EraseMode): void;
  run(cmd: Command): Change | null;
  undo(): void;
  redo(): void;
  /** Vrai si la touche est prise par le moteur (annuler, rétablir, espace tenu) : la page appelle preventDefault. */
  key(e: KeyLike): boolean;
  /** Relâché d'une touche : vrai si c'était l'espace tenu par le moteur. */
  keyUp(e: KeyLike): boolean;
  /** Perte du focus de la fenêtre : l'espace est relâché (son keyup ne viendra pas). */
  releaseKeys(): void;
  /** Barre d'espace tenue (D17) : le routeur la lit au début d'un geste. */
  panHeld(): boolean;
  /** Montre une page (caméra par page, D17) ; false si elle est inconnue. Les gestes en cours sont abandonnés. */
  showPage(id: string): boolean;
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
/** Durées d'image retenues (une minute à 60 Hz) : le banc et son export en lisent au plus autant (HL3b-8). */
export const ENGINE_FRAME_HISTORY = 3600;

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean =>
  a.size === b.size && [...a].every((x) => b.has(x));

export function createEngine(deps: EngineDeps): Engine {
  const { doc, renderer } = deps;
  const first = doc.pageIds()[0];
  if (first === undefined) throw new Error("document sans page");
  let pageId: string = first;
  const style = deps.penStyle ?? DEFAULT_PEN_STYLE;
  let camera: Camera = IDENTITY;
  /** Caméra de chaque page quittée (D17 : par page, dans l'interface, jamais dans le document). */
  const cameras = new Map<string, Camera>();
  /** Pages déjà ajustées à la vue : l'ajustement ne se fait qu'une fois par page (HL3-6, HL3b-7). */
  const fitted = new Set<string>();
  let viewW = 0;
  let viewH = 0;
  let tool: ToolChoice = "pen";
  let spaceHeld = false;
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

  function closeAll(how: CloseReason): void {
    for (const [id, g] of owner) g.close(id, how);
    owner.clear();
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

  const loop = createFrameLoop(deps.frames, frame, ENGINE_FRAME_HISTORY);

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
      if (isPanKey(e)) {
        spaceHeld = true;
        return true;
      }
      const action = keyAction(e);
      if (action === null) return false;
      history(action);
      return true;
    },
    keyUp(e) {
      if (e.key !== " " || !spaceHeld) return false;
      spaceHeld = false;
      return true;
    },
    releaseKeys() {
      spaceHeld = false;
    },
    panHeld: () => spaceHeld,
    showPage(id) {
      if (id === pageId) return true;
      if (!doc.pageIds().includes(id)) return false;
      closeAll("abort");
      cameras.set(pageId, camera);
      pageId = id;
      const saved = cameras.get(id);
      if (saved) {
        camera = saved;
      } else if (viewW > 0 && viewH > 0) {
        camera = fitPage(viewW, viewH);
        fitted.add(id);
      } else {
        camera = IDENTITY;
      }
      requestScene();
      emit();
      return true;
    },
    wheel(e) {
      if (e.ctrlKey) view.zoomAt(e.x, e.y, Math.exp(-e.deltaY * WHEEL_ZOOM_SPEED));
      else view.panBy(-e.deltaX, -e.deltaY);
    },
    resize(width, height, dpr) {
      renderer.resize(width, height, dpr);
      viewW = width;
      viewH = height;
      if (!fitted.has(pageId) && width > 0 && height > 0) {
        camera = fitPage(width, height);
        fitted.add(pageId);
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
      closeAll("abort");
      loop.stop();
      stateListeners.clear();
      drawnListeners.clear();
    },
  };
}
```

- [ ] **5. Lancer, voir vert.** Commande du § Test → `Tests  34 passed (34)`, les cinq noms présents.

- [ ] **6. Suite complète.** `verifier.sh` sous le jeton → `verifier.sh : OK` (`main.ts` et `barre.ts` compilent :
  `setTool` accepte encore `"pen"` et `"eraser"`).

- [ ] **7. Commit.**

```bash
cd "$WT" && git add apps/web/src/engine/engine.ts apps/web/src/engine/engine.test.ts apps/web/src/engine/input/keys.ts apps/web/src/engine/input/keys.test.ts
cd "$WT" && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(engine): hand tool, held space, per-page camera and bounded frame history (D17)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t39"></a>
### Tâche T39 — Script S2 lot 3b (quatre passages) et fiche « comparer les réglages »

**Objectif.** Étendre le script S2 du lot 3 (T25) sans changer son mode par défaut : `--lot3b` rejoue le même parcours
quatre fois dans Chromium headless (réglages par défaut, puis `?echelons=2`, `3`, `4`), lit les réglages effectifs
(`#stage[data-echelons]`), vérifie l'encre vive pendant un geste (capture lue en pixels) et, au passage par défaut,
l'outil main, le bouton du milieu, l'espace + glisser et la gomme d'objet ; `--captures` pose une capture par passage
(`docs/essais/s2-lot3b-<réglage>.png`). Sous Chromium headless, WebGL2 passe par SwiftShader s'il est permis (drapeaux
au lancement) ; sinon le passage 4 prouve le repli (`4:repli`). Ajouter à la fiche ENI la section « Lot 3b : comparer
les réglages ». Scénario : S2.

**Fichiers.** Remplacer `scripts/essais/s2-navigateur.mjs` (texte complet ci-dessous). Modifier
`docs/essais/eni-stylet.md` (section ajoutée à la fin).

**Interfaces.**
- Consomme : contrat de page produit par T40 (écrit ici, T40 le respecte) : `#stage[data-ready="1"]`,
  `#stage[data-elements]` (lot 3) ; `#stage[data-echelons]` = `echelonsTag` de T30 (`2:off,3:off,4:off` sous Chromium
  par défaut) ; boutons `#barre button[data-action="pen" | "eraser" | "hand" | "eraser-mode" | "undo" | "redo"]`,
  `aria-pressed="true"` sur l'outil choisi et sur `eraser-mode` en gomme d'objet ; canvas de scène `#scene` en 2D.
- Réutilise : `scripts/essais/s2-navigateur.mjs` (T25) — `loadPlaywright`, `serve`, `scenario` (étendu d'un paramètre
  `pass`), contrôles du lot 3 inchangés (16 lignes `ok —`) ; `docs/essais/eni-stylet.md` (section du 19 gardée).
- Produit : `node scripts/essais/s2-navigateur.mjs [--capture <png>]` (inchangé : `S2 lot 3 : OK`) ;
  `node scripts/essais/s2-navigateur.mjs --lot3b [--captures]` → par passage `S2 lot 3b [<nom>] : OK`, puis
  `S2 lot 3b : OK (4 passages)` ; codes 0 réussi, 1 échec, 2 outil absent.

**Test et commande bornée.** (le « test rouge » de cette tâche est le mode `--lot3b` joué sur l'application actuelle)
1. `cd "$WT" && node --check scripts/essais/s2-navigateur.mjs && echo syntaxe-ok` → `syntaxe-ok`.
2. `cd "$WT" && node scripts/essais/s2-navigateur.mjs > /tmp/s2-T39-lot3.txt 2>&1; echo "code=$?"; tail -20 /tmp/s2-T39-lot3.txt`
   (après `verifier.sh`, qui construit `apps/web/dist`) → `code=0`, 16 lignes `ok —`, `S2 lot 3 : OK` (régression du
   lot 3 : rien ne change).
3. `cd "$WT" && node scripts/essais/s2-navigateur.mjs --lot3b > /tmp/s2-T39-lot3b.txt 2>&1; echo "code=$?"; tail -5 /tmp/s2-T39-lot3b.txt`
   → `code=1`, `S2 lot 3b : ÉCHEC — [defaut] #stage[data-echelons] absent : l'application ne dit pas ses réglages`
   (rouge attendu tant que T40 n'est pas fusionnée).
4. `cd "$WT" && grep -c "^## Lot 3b : comparer les réglages" docs/essais/eni-stylet.md` → `1`.
Puis `verifier.sh` (jeton) → `verifier.sh : OK`.

**Preuve visuelle.** Aucune ici (captures en T40).

**Contraintes (recopiées de « Global Constraints »).** Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de `--force` ; aucun `git tag`, aucune release ; aucun workflow GitHub Actions (`.github/workflows/` non touché) ; un seul build Tauri à la fois, aucun build Android (aucun dans cette tâche) ; tests par `scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire socle/T39 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"` (commandes ciblées sous le même jeton) ; relecteurs au premier plan (`run_in_background: false`) ; commit d'auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par la ligne exacte `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, quel que soit le modèle qui exécute ; aucun seuil baissé, aucun test désactivé, sauté (`.skip`, `.todo`, `#[ignore]` hors test de mesure) ni affaibli ; dépôt public : aucun secret ni chemin personnel hors dépôt dans un fichier commité ; `$WT` = dossier donné par l'orchestrateur (défaut `/home/adminjd/projets/roomboard-wt/socle--T39`), worktree neuf : `cd "$WT" && pnpm install --frozen-lockfile` d'abord, `verifier.sh` une fois avant de juger une erreur de type sur `./wasm/roomboard_wasm` ; `apps/web/src/core/api.ts` figé ; rien n'est écrit dans le document avant le relâché (D38) ; moteur sans framework ni global du DOM (exceptions : `render/canvas2d.ts`, `input/support.ts`, méthodes des canvas reçus dans `render/select.ts` ; `URLSearchParams` admis dans `settings.ts`) ; le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif (aucun appel Tauri dans le moteur, échelon 6 interdit, échelon 5 au lot 5) ; chaque réglage a un test allumé et un test éteint ; cœur : aucune horloge ni dépendance au navigateur hors tests, `cargo fmt` et `clippy -D warnings` passent ; TypeScript strict (`noUncheckedIndexedAccess`) : aucun `any`, aucun `!` sur un index, `as unknown as` réservé aux faux objets des tests et aux événements de `PointerSurface`.

**Interdits.** Ne pas mettre le script dans `verifier.sh` (Playwright et son Chromium ne sont pas sur une machine
neuve). Ne pas changer la sortie du mode par défaut (16 `ok —`, `S2 lot 3 : OK`). Aucune dépendance npm ajoutée
(décodage de la capture dans la page, par `createImageBitmap`). Ne pas toucher `apps/web`.

**Terminé quand.** Les quatre contrôles du § Test donnent l'attendu, `verifier.sh : OK`, rapport avec
`Réutilisation : appelé loadPlaywright, serve, scenario (s2-navigateur.mjs, étendu)`.

**Étapes.**

- [ ] **1. Constater le départ.** Contrôle 2 du § Test sur le script actuel → `S2 lot 3 : OK` (référence).

- [ ] **2. Remplacer le script.** `scripts/essais/s2-navigateur.mjs` :

```js
#!/usr/bin/env node
// Scénario S2 au navigateur (cadrage § 6). Lot 3 (T25) : l'application web construite (apps/web/dist) servie en local,
// Chromium headless de Playwright, souris simulée ; trois traits, gomme au milieu du deuxième, Ctrl+Z, Ctrl+Y,
// Ctrl+Maj+Z, boutons de la barre ; lit le nombre d'éléments (#stage[data-elements]) et les pixels d'encre du canvas
// de scène. Lot 3b (T39) : `--lot3b` rejoue ce parcours quatre fois (réglages par défaut, puis ?echelons=2, 3, 4),
// lit les réglages effectifs (#stage[data-echelons]), vérifie l'encre vive pendant un geste et, au passage par défaut,
// l'outil main, le bouton du milieu, l'espace + glisser et la gomme d'objet. Hors de scripts/verifier.sh : exige
// Playwright (cache npx) et son Chromium. Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/s2-navigateur.mjs [--capture docs/essais/s2-lot3-vm.png]
//         node scripts/essais/s2-navigateur.mjs --lot3b [--captures]   (docs/essais/s2-lot3b-<réglage>.png)
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

/** Passages du lot 3b : `attendu` lit #stage[data-echelons] (forme `2:off,3:off,4:off`, engine/settings.ts). */
const PASSES = [
  { nom: "defaut", query: "", attendu: (tag) => tag === "2:off,3:off,4:off", extras: true },
  { nom: "2", query: "?echelons=2", attendu: (tag) => tag.startsWith("2:on,"), extras: false },
  { nom: "3", query: "?echelons=3", attendu: (tag) => /,3:(on|absent|refused),/.test(tag), extras: false },
  { nom: "4", query: "?echelons=4", attendu: (tag) => /,4:(on|repli)$/.test(tag), extras: false },
];
/** WebGL2 sous Chromium headless : SwiftShader s'il est permis ; sinon le passage 4 prouve le repli Canvas 2D. */
const LOT3B_ARGS = ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-angle=swiftshader"];

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

/** `pass` absent : parcours du lot 3, sortie inchangée. `pass` donné : réglages lus, encre vive, contrôles du lot 3b. */
async function scenario(page, url, { capture = null, pass = null } = {}) {
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
  const pressed = (action) => page.getAttribute(`#barre button[data-action="${action}"]`, "aria-pressed");
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
  // Pixels d'encre à l'écran (capture composée : scène et canvas d'interaction, Canvas 2D ou WebGL2), décodés dans la page.
  const shotInk = async ([x0, y0, x1, y1]) => {
    const png = await page.screenshot({ clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } });
    return page.evaluate(async (b64) => {
      const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
      const bmp = await createImageBitmap(blob);
      const c = new OffscreenCanvas(bmp.width, bmp.height);
      const ctx = c.getContext("2d");
      ctx.drawImage(bmp, 0, 0);
      const d = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 300) n++;
      return n;
    }, png.toString("base64"));
  };
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

  await page.goto(url);
  try {
    await page.waitForSelector('#stage[data-ready="1"]', { timeout: 15000 });
  } catch {
    throw new Echec(`l'application ne démarre pas (#stage[data-ready="1"] absent) ${errors.join(" | ")}`);
  }
  await frames();

  if (pass) {
    const tag = await page.getAttribute("#stage", "data-echelons");
    if (tag === null) throw new Echec("#stage[data-echelons] absent : l'application ne dit pas ses réglages");
    check(pass.attendu(tag), `réglages effectifs ${tag}`);
  }

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
  check((await pressed("eraser")) === "true", "gomme choisie dans la barre");
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

  if (!pass) {
    check(errors.length === 0, `aucune erreur dans la page${errors.length > 0 ? ` : ${errors.join(" | ")}` : ""}`);
    if (capture) {
      await page.screenshot({ path: capture });
      console.log(`capture : ${capture}`);
    }
    return;
  }

  // Lot 3b : encre vive pendant le geste (canvas d'interaction), rien d'écrit avant le relâché (D38).
  await click("pen");
  await page.mouse.move(400, 550);
  await page.mouse.down();
  await page.mouse.move(900, 550, { steps: 12 });
  await frames();
  check((await elements()) === 4, "pendant le geste : rien d'écrit dans le document (D38)");
  check((await shotInk([640, 540, 660, 560])) > 0, "encre vive visible pendant le geste (canvas d'interaction)");
  await page.mouse.up();
  await frames();
  check((await elements()) === 5, "relâché : le trait est écrit (cinq traits)");

  if (pass.extras) {
    const LEFT = [300, 440, 390, 460]; // à gauche du troisième trait (x de 400 à 900, y = 450)
    check((await ink(LEFT)) === 0, "vue de départ : rien à gauche du troisième trait");
    await click("hand");
    check((await pressed("hand")) === "true", "outil main choisi dans la barre");
    await drag([[700, 620], [550, 620]]);
    check((await elements()) === 5 && (await ink(LEFT)) > 0, "outil main : la vue suit le glisser, aucun trait");
    await page.mouse.move(550, 620);
    await page.mouse.down({ button: "middle" });
    await page.mouse.move(700, 620, { steps: 8 });
    await page.mouse.up({ button: "middle" });
    await frames();
    check((await elements()) === 5 && (await ink(LEFT)) === 0, "bouton du milieu : la vue revient, aucun trait");
    await click("pen");
    await page.keyboard.down("Space");
    await drag([[700, 620], [550, 620]]);
    await page.keyboard.up("Space");
    await frames();
    check((await elements()) === 5 && (await ink(LEFT)) > 0, "espace + glisser : la vue suit, aucun trait");
    await click("eraser-mode");
    check((await pressed("eraser-mode")) === "true", "gomme d'objet choisie dans la barre");
    await click("eraser");
    await drag([[500, 210], [500, 250], [500, 290]]); // premier trait (y = 250), vue décalée de 150 px : x de 250 à 750
    check((await elements()) === 4, "gomme d'objet : le premier trait part en entier (5 → 4)");
  }

  check(errors.length === 0, `aucune erreur dans la page${errors.length > 0 ? ` : ${errors.join(" | ")}` : ""}`);
  if (capture) {
    await page.screenshot({ path: capture });
    console.log(`capture : ${capture}`);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const lot3b = argv.includes("--lot3b");
  const label = lot3b ? "S2 lot 3b" : "S2 lot 3";
  if (!existsSync(join(DIST, "index.html"))) {
    console.error(`${label} : ÉCHEC — apps/web/dist absent : lancer d'abord scripts/verifier.sh (Wasm et application)`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(
      `${label} : outil absent — Playwright introuvable (le poser : npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=<chemin de playwright/index.mjs>)`,
    );
    return 2;
  }
  const server = await serve();
  const port = server.address().port;
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: lot3b ? LOT3B_ARGS : ["--no-sandbox"] });
    } catch (e) {
      console.error(`${label} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    if (!lot3b) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
      await scenario(page, `http://127.0.0.1:${port}/`, { capture: captureTarget(argv) });
      console.log("S2 lot 3 : OK");
      return 0;
    }
    const captures = argv.includes("--captures");
    for (const pass of PASSES) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
      try {
        const page = await context.newPage();
        console.log(`— passage ${pass.nom} (${pass.query || "réglages par défaut"})`);
        const capture = captures ? join(ROOT, "docs", "essais", `s2-lot3b-${pass.nom}.png`) : null;
        try {
          await scenario(page, `http://127.0.0.1:${port}/${pass.query}`, { capture, pass });
        } catch (e) {
          if (e instanceof Echec) throw new Echec(`[${pass.nom}] ${e.message}`);
          throw e;
        }
        console.log(`S2 lot 3b [${pass.nom}] : OK`);
      } finally {
        await context.close();
      }
    }
    console.log(`S2 lot 3b : OK (${PASSES.length} passages)`);
    return 0;
  } catch (e) {
    console.error(`${label} : ÉCHEC — ${e instanceof Echec ? e.message : e instanceof Error ? e.stack : e}`);
    return 1;
  } finally {
    await browser?.close();
    server.close();
  }
}

process.exitCode = await main();
```

- [ ] **3. Ajouter la section de la fiche.** À la fin de `docs/essais/eni-stylet.md` :

```markdown
## Lot 3b : comparer les réglages

Le lot 3b a été livré sans attendre l'essai (décision de Jérôme, 2026-11-19 : « oui fait le avancé en autonomie même
si je n'ai pas fais les tests ») : chaque échelon de DA9 est un réglage, éteint par défaut tant que rien de mesuré ne
le demande (S1, OC56, OC66). L'essai ENI du samedi 21 novembre vérifie ces défauts. Ouvrir la même adresse que
l'application, suivie du réglage ; la seconde ligne de la barre montre l'état effectif et bascule chaque réglage (les
échelons 3 et 4 rechargent la page : le dessin en cours est perdu).

| réglage | adresse | quoi regarder |
|---|---|---|
| défauts | (rien) | Le trait suit-il la pointe ? C'est la référence des lignes suivantes. |
| É2 prédiction TS | `?echelons=2` | La queue devant la pointe colle-t-elle mieux, ou dépasse-t-elle dans les virages ? |
| É3 traînée `navigator.ink` | `?echelons=3` | Sous Edge Windows, la pointe dessinée par le système rattrape-t-elle le stylet ? « sans effet » dans la barre : l'API manque. |
| É4 WebGL2 | `?echelons=4` | Traits longs et rapides : moins de saccades ? « repli Canvas 2D » dans la barre : WebGL2 manque. |
| paume souple | `?paume=souple` | Paume posée avant le stylet : son trait continue-t-il (attendu : oui en souple, non par défaut) ? |
| doigt qui trace | `?doigt=trace` | Après le stylet, le doigt trace au lieu de déplacer la vue ; le bouton « Doigt » de la barre bascule à chaud. |

Combiner : `?echelons=2,4`. Tout éteindre : `?echelons=aucun`. Avec le banc : `?banc&echelons=4`. Le panneau du banc
résume les 600 dernières images ; l'export JSON garde les 3 600 dernières que le moteur retient.
Nouveautés à essayer en passant : outil « Main », barre d'espace + glisser, bouton du milieu de la souris (la vue suit,
rien ne trace) ; bouton « Gomme : partielle / objet » (en gomme d'objet, un passage retire le trait entier).
```

- [ ] **4. Lancer les contrôles.** Contrôles 1 à 4 du § Test → attendus (dont le rouge du contrôle 3).

- [ ] **5. Suite complète.** `verifier.sh` sous le jeton → `verifier.sh : OK`.

- [ ] **6. Commit.**

```bash
cd "$WT" && git add scripts/essais/s2-navigateur.mjs docs/essais/eni-stylet.md
cd "$WT" && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "test(e2e): S2 lot 3b passes per setting and an ENI sheet to compare them" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t40"></a>
### Tâche T40 — Amorce et barre : réglages branchés, S2 lot 3b vert, captures

**Objectif.** Brancher le lot dans l'application : l'amorce lit les réglages de l'adresse (T30), choisit le rendu
(T33), décore le puits des gestes par la prédiction (T31), branche la traînée (T32), le bouton du milieu et la paume
(T34), l'outil main et l'espace (T35, T38), et publie l'état effectif des échelons (`#stage[data-echelons]`). La barre
gagne l'outil « Main » et le bouton « Gomme : partielle / objet » (D38) ; une seconde ligne (`#reglages`) montre et
bascule les réglages (doigt, paume, échelons 2 à 4), avec les notes du démarrage (adresse mal écrite, repli WebGL2).
Rejouer S2 (lot 3, puis lot 3b quatre passages) et poser les captures. Scénario : S2.

**Fichiers.** Remplacer `apps/web/src/main.ts`, `apps/web/index.html`, `apps/web/src/app/barre.ts`,
`apps/web/src/app/barre.test.ts` (textes complets ci-dessous). Créer `docs/essais/s2-lot3b-defaut.png`,
`docs/essais/s2-lot3b-2.png`, `docs/essais/s2-lot3b-3.png`, `docs/essais/s2-lot3b-4.png` (par le script).

**Interfaces.**
- Consomme : T30 `parseSettings`, `createSettingsStore`, `resolvePrediction`, `echelonsTag`, `cycleSetting`,
  `needsReload`, `settingLabel`, `settingsSearch`, `SETTING_KEYS`, `EngineSettings`, `EffectiveEchelons`,
  `SettingKey`, `SettingsStore` ; T31 `withLinearPrediction(sink, enabled)` ; T32 `attachInkTrail(deps)`, `InkLike` ;
  T33 `chooseRenderer(scene, live, source, wantWebgl)` → `{ renderer, webgl, note }` ; T34
  `SamplerOptions.cancelTouchesOnPen`, `createMiddlePan(surface, view)` ; T35 `ToolChoice`, `RouterDeps.panHeld` ;
  T38 `Engine.keyUp`, `releaseKeys`, `panHeld`, `setTool(ToolChoice)`, `DEFAULT_PEN_STYLE` ; T39 contrat de page
  (§ Interfaces de T39).
- Réutilise : `apps/web/src/main.ts` — `start`, `el`, `keyOf`, suivi du `devicePixelRatio`, molette, `?banc`
  (étendus) ; `apps/web/src/app/barre.ts` — `barModel`, `mountBar` (étendus), `toolbar.ts` `toolbar` (libellés) ;
  `apps/web/src/engine/input/sampler.ts` `createSampler` ; `apps/web/src/engine/input/router.ts` `createRouter`,
  `SECOND_FINGER_MS`, `RouterOptions` ; `apps/web/src/engine/input/support.ts` `detectSupport` ;
  `scripts/essais/s2-navigateur.mjs` (T39).
- Produit : `type BarAction = ToolChoice | "eraser-mode" | "undo" | "redo"` ; `barModel(s: EngineState): BarButton[]`
  (six boutons) ; `mountBar(root, engine: Pick<Engine, "setTool" | "setEraserMode" | "undo" | "redo" | "state" | "onState">)` ;
  `interface SettingButton { readonly key: SettingKey; readonly label: string; readonly reload: boolean }` ;
  `settingsModel(s: EngineSettings, e: EffectiveEchelons): SettingButton[]` ;
  `interface SettingsBarDeps { readonly store: SettingsStore; effective(): EffectiveEchelons; readonly notes: readonly string[]; search(): string; navigate(search: string): void }` ;
  `mountSettings(root: HTMLElement, deps: SettingsBarDeps): () => void` ; page : `#reglages`,
  `#reglages button[data-reglage=<clé>]`, `#echelons-notes`, `#stage[data-echelons]`.

**Test et commande bornée.**
1. `cd "$WT/apps/web" && pnpm exec vitest run src/app/barre.test.ts --reporter=verbose 2>&1 | tail -20` →
   `Tests  10 passed (10)` ; noms `six boutons : stylo, gomme, main, mode de gomme, annuler, rétablir ; libellés de
   toolbar.ts`, `É4 : un clic recharge avec ?echelons=4:on et garde ?banc` et `notes du démarrage affichées après les
   boutons (adresse mal écrite, repli WebGL2)` présents.
2. `verifier.sh` (jeton) → `verifier.sh : OK` (construit `apps/web/dist`).
3. `cd "$WT" && node scripts/essais/s2-navigateur.mjs > /tmp/s2-T40-lot3.txt 2>&1; echo "code=$?"; tail -3 /tmp/s2-T40-lot3.txt`
   → `code=0`, `S2 lot 3 : OK`.
4. `cd "$WT" && node scripts/essais/s2-navigateur.mjs --lot3b --captures > /tmp/s2-T40-lot3b.txt 2>&1; echo "code=$?"; grep -E "réglages effectifs|S2 lot 3b|capture" /tmp/s2-T40-lot3b.txt`
   → `code=0` ; `ok — réglages effectifs 2:off,3:off,4:off`, `2:on,…`, `…,3:<on|absent|refused>,…`,
   `…,4:<on|repli>` ; quatre `S2 lot 3b [<nom>] : OK` ; `S2 lot 3b : OK (4 passages)` ; quatre lignes `capture :`.
   Recopier dans le rapport les quatre valeurs `réglages effectifs` (elles disent si WebGL2 a tourné sous
   SwiftShader ou si le repli a joué, et si `navigator.ink` existe sous Chromium Linux). Relevé à l'écriture du plan
   (copie d'essai, Chromium 1255 headless) : `2:off,3:off,4:off`, `2:on,3:off,4:off`, `2:off,3:on,4:off`,
   `2:off,3:off,4:on` (WebGL2 tourne sous SwiftShader ; `navigator.ink` existe sous Chromium Linux, sans pointe visible).

**Preuve visuelle.** Lectures d'abord (contrôle 4 : `data-echelons`, `data-elements` lus par le script, une valeur
lue prouve plus qu'une image), puis les quatre captures à décrire dans le rapport, une phrase chacune :
`docs/essais/s2-lot3b-defaut.png` — page blanche, quatre traits restants (le premier parti à la gomme d'objet, le
deuxième coupé au milieu), vue décalée vers la gauche, barre « Stylo · Gomme · Main · Gomme : objet · Annuler ·
Rétablir », seconde ligne « Doigt : vue · Paume : stricte · É2 prédiction : auto (éteinte) · É3 traînée : éteinte ·
É4 WebGL2 : éteint » ; `s2-lot3b-2.png` — cinq traits, seconde ligne « É2 prédiction : allumée » ; `s2-lot3b-3.png` —
« É3 traînée : allumée » ou « sans effet (navigator.ink absent) » ; `s2-lot3b-4.png` — « É4 WebGL2 : allumé » ou
« repli Canvas 2D », avec la note du repli à droite des boutons.

**Contraintes (recopiées de « Global Constraints »).** Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de `--force` ; aucun `git tag`, aucune release ; aucun workflow GitHub Actions (`.github/workflows/` non touché) ; un seul build Tauri à la fois, aucun build Android (aucun dans cette tâche) ; tests par `scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire socle/T40 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"` (commandes ciblées sous le même jeton) ; relecteurs au premier plan (`run_in_background: false`) ; commit d'auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par la ligne exacte `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, quel que soit le modèle qui exécute ; aucun seuil baissé, aucun test désactivé, sauté (`.skip`, `.todo`, `#[ignore]` hors test de mesure) ni affaibli ; dépôt public : aucun secret ni chemin personnel hors dépôt dans un fichier commité ; `$WT` = dossier donné par l'orchestrateur (défaut `/home/adminjd/projets/roomboard-wt/socle--T40`), worktree neuf : `cd "$WT" && pnpm install --frozen-lockfile` d'abord, `verifier.sh` une fois avant de juger une erreur de type sur `./wasm/roomboard_wasm` ; `apps/web/src/core/api.ts` figé ; rien n'est écrit dans le document avant le relâché (D38) ; moteur sans framework ni global du DOM (exceptions : `render/canvas2d.ts`, `input/support.ts`, méthodes des canvas reçus dans `render/select.ts` ; `URLSearchParams` admis dans `settings.ts`) ; le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif (aucun appel Tauri dans le moteur, échelon 6 interdit, échelon 5 au lot 5) ; chaque réglage a un test allumé et un test éteint ; cœur : aucune horloge ni dépendance au navigateur hors tests, `cargo fmt` et `clippy -D warnings` passent ; TypeScript strict (`noUncheckedIndexedAccess`) : aucun `any`, aucun `!` sur un index, `as unknown as` réservé aux faux objets des tests et aux événements de `PointerSurface`.

**Interdits.** Ne pas toucher le moteur, le routeur, l'échantillonneur, le rendu ni les réglages (T30 à T38 figés :
les consommer tels quels). Ne pas toucher `toolbar.ts` (DA10 au lot 5) ni `api.ts`. Ne pas modifier le script S2. Les
tests de la barre changent d'attendu parce que la barre gagne deux boutons : leurs contrôles (libellés de
`toolbar.ts`, outil pressé, annuler et rétablir désactivés, `#etat` après les boutons) restent tous, étendus.
`touch-action: none` et les deux canvas de `index.html` gardés.

**Terminé quand.** 10 tests verts, `verifier.sh : OK`, `S2 lot 3 : OK`, `S2 lot 3b : OK (4 passages)`, quatre
captures commitées et décrites, rapport avec `Réutilisation : appelé createSampler, createRouter, detectSupport,
barModel / mountBar (étendus), s2-navigateur.mjs` et les quatre valeurs `réglages effectifs`.

**Étapes.**

- [ ] **1. Écrire le test (rouge).** `apps/web/src/app/barre.test.ts` :

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EngineState } from "../engine/engine";
import { createSettingsStore, DEFAULT_SETTINGS, type EffectiveEchelons } from "../engine/settings";
import { barModel, mountBar, mountSettings, settingsModel } from "./barre";

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

const OFF: EffectiveEchelons = { prediction: false, inkTrail: "off", webgl: "off" };

describe("barModel", () => {
  it("six boutons : stylo, gomme, main, mode de gomme, annuler, rétablir ; libellés de toolbar.ts", () => {
    expect(barModel(base).map((b) => [b.action, b.label])).toEqual([
      ["pen", "Stylo"],
      ["eraser", "Gomme"],
      ["hand", "Main"],
      ["eraser-mode", "Gomme : partielle"],
      ["undo", "Annuler"],
      ["redo", "Rétablir"],
    ]);
  });

  it("l'outil courant est pressé, les autres non (main comprise)", () => {
    expect(barModel({ ...base, tool: "eraser" }).map((b) => b.pressed)).toEqual([false, true, false, false, null, null]);
    expect(barModel({ ...base, tool: "hand" }).map((b) => b.pressed)).toEqual([false, false, true, false, null, null]);
  });

  it("annuler et rétablir désactivés sans étape", () => {
    expect(barModel(base).map((b) => b.disabled)).toEqual([false, false, false, false, true, true]);
    expect(barModel({ ...base, canUndo: true, canRedo: true }).map((b) => b.disabled)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it("mode de gomme : libellé et état pressé suivent le mode (gomme d'objet, D38)", () => {
    expect(barModel({ ...base, eraserMode: "object" }).find((b) => b.action === "eraser-mode")).toMatchObject({
      label: "Gomme : objet",
      pressed: true,
    });
  });
});

describe("settingsModel", () => {
  it("cinq réglages, doigt et paume d'abord ; seuls les échelons 3 et 4 rechargent", () => {
    expect(settingsModel(DEFAULT_SETTINGS, OFF).map((b) => [b.key, b.label, b.reload])).toEqual([
      ["finger", "Doigt : vue", false],
      ["palm", "Paume : stricte", false],
      ["prediction", "É2 prédiction : auto (éteinte)", false],
      ["inkTrail", "É3 traînée : éteinte", true],
      ["webgl", "É4 WebGL2 : éteint", true],
    ]);
  });
});

/** Faux nœud DOM minimal (pas d'environnement DOM dans la suite) : `append` déplace un nœud déjà attaché, comme le vrai. */
class FakeNode {
  children: FakeNode[] = [];
  parent: FakeNode | null = null;
  dataset: Record<string, string> = {};
  attrs: Record<string, string> = {};
  listeners = new Map<string, () => void>();
  id = "";
  type = "";
  title = "";
  disabled = false;
  textContent = "";
  ownerDocument: { getElementById(id: string): FakeNode | null };
  constructor(owner: { getElementById(id: string): FakeNode | null }) {
    this.ownerDocument = owner;
  }
  append(...nodes: FakeNode[]): void {
    for (const n of nodes) {
      n.parent?.children.splice(n.parent.children.indexOf(n), 1);
      n.parent = this;
      this.children.push(n);
    }
  }
  appendChild(n: FakeNode): FakeNode {
    this.append(n);
    return n;
  }
  addEventListener(type: string, cb: () => void): void {
    this.listeners.set(type, cb);
  }
  click(): void {
    this.listeners.get("click")?.();
  }
  setAttribute(k: string, v: string): void {
    this.attrs[k] = v;
  }
  removeAttribute(k: string): void {
    delete this.attrs[k];
  }
}

const NONE = { getElementById: (_: string): FakeNode | null => null };

describe("mountBar", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("les boutons précèdent la zone d'état #etat, même déjà présente avant eux dans la page", () => {
    const owner = { getElementById: (_: string): FakeNode | null => status };
    const root = new FakeNode(owner);
    const status = new FakeNode(owner);
    status.id = "etat";
    root.append(status);
    vi.stubGlobal("document", { createElement: () => new FakeNode(owner) });
    mountBar(root as unknown as HTMLElement, {
      setTool: () => {},
      setEraserMode: () => {},
      undo: () => {},
      redo: () => {},
      state: () => base,
      onState: () => () => {},
    });
    expect(root.children.map((c) => c.dataset["action"] ?? c.id)).toEqual([
      "pen",
      "eraser",
      "hand",
      "eraser-mode",
      "undo",
      "redo",
      "etat",
    ]);
  });

  it("mode de gomme : un clic bascule partielle ↔ objet", () => {
    const root = new FakeNode(NONE);
    vi.stubGlobal("document", { createElement: () => new FakeNode(NONE) });
    let state: EngineState = base;
    const modes: string[] = [];
    mountBar(root as unknown as HTMLElement, {
      setTool: () => {},
      setEraserMode: (m) => {
        modes.push(m);
        state = { ...state, eraserMode: m };
      },
      undo: () => {},
      redo: () => {},
      state: () => state,
      onState: () => () => {},
    });
    const button = root.children.find((c) => c.dataset["action"] === "eraser-mode");
    button?.click();
    button?.click();
    expect(modes).toEqual(["object", "partial"]);
  });
});

describe("mountSettings", () => {
  afterEach(() => vi.unstubAllGlobals());

  function mount(search = "") {
    const root = new FakeNode(NONE);
    vi.stubGlobal("document", { createElement: () => new FakeNode(NONE) });
    const store = createSettingsStore(DEFAULT_SETTINGS);
    const went: string[] = [];
    mountSettings(root as unknown as HTMLElement, {
      store,
      effective: () => OFF,
      notes: ["échelon inconnu : 7"],
      search: () => search,
      navigate: (s) => went.push(s),
    });
    const button = (key: string): FakeNode | undefined => root.children.find((c) => c.dataset["reglage"] === key);
    return { root, store, went, button };
  }

  it("doigt : un clic bascule le réglage sans recharger, le libellé suit", () => {
    const { store, went, button } = mount();
    button("finger")?.click();
    expect(store.get().finger).toBe("draw");
    expect(button("finger")?.textContent).toBe("Doigt : trace");
    expect(went).toEqual([]);
  });

  it("É4 : un clic recharge avec ?echelons=4:on et garde ?banc", () => {
    const { store, went, button } = mount("?banc");
    button("webgl")?.click();
    expect(went).toEqual(["?banc=&echelons=4:on"]);
    expect(store.get().webgl).toBe("off");
    expect(button("webgl")?.title).toBe("Recharge la page : le dessin en cours est perdu");
  });

  it("notes du démarrage affichées après les boutons (adresse mal écrite, repli WebGL2)", () => {
    const { root } = mount();
    expect(root.children).toHaveLength(6);
    const last = root.children.at(-1);
    expect(last?.id).toBe("echelons-notes");
    expect(last?.textContent).toBe("échelon inconnu : 7");
  });
});
```

- [ ] **2. Lancer, voir rouge.** Commande 1 du § Test → `mountSettings` et `settingsModel` absents, quatre boutons au
  lieu de six.

- [ ] **3. Remplacer la barre.** `apps/web/src/app/barre.ts` :

```ts
/**
 * Barre minimale (lot 3, étendue au lot 3b), en DOM simple ; remplacée au lot 5. Première ligne : Stylo, Gomme, Main,
 * mode de gomme, Annuler, Rétablir, état. Seconde ligne (`#reglages`) : réglages du moteur (engine/settings.ts) ;
 * les échelons 3 et 4 rechargent la page avec la nouvelle adresse.
 */
import type { EraseMode } from "../core/api";
import type { Engine, EngineState } from "../engine/engine";
import type { ToolChoice } from "../engine/input/gesture";
import {
  cycleSetting,
  needsReload,
  SETTING_KEYS,
  settingLabel,
  settingsSearch,
  type EffectiveEchelons,
  type EngineSettings,
  type SettingKey,
  type SettingsStore,
} from "../engine/settings";
import { toolbar } from "../toolbar";

export type BarAction = ToolChoice | "eraser-mode" | "undo" | "redo";

export interface BarButton {
  readonly action: BarAction;
  readonly label: string;
  /** État pressé d'un outil ou du mode objet ; null pour une action. */
  readonly pressed: boolean | null;
  readonly disabled: boolean;
}

/** Libellés absents de toolbar.ts (DA10, lot 5). */
const EXTRA_LABELS: Partial<Record<ToolChoice, string>> = { hand: "Main" };
const labelOf = (id: ToolChoice): string => toolbar.find((t) => t.id === id)?.label ?? EXTRA_LABELS[id] ?? id;
const ERASER_MODE_LABELS: Record<EraseMode, string> = { partial: "Gomme : partielle", object: "Gomme : objet" };

export function barModel(s: EngineState): BarButton[] {
  return [
    { action: "pen", label: labelOf("pen"), pressed: s.tool === "pen", disabled: false },
    { action: "eraser", label: labelOf("eraser"), pressed: s.tool === "eraser", disabled: false },
    { action: "hand", label: labelOf("hand"), pressed: s.tool === "hand", disabled: false },
    {
      action: "eraser-mode",
      label: ERASER_MODE_LABELS[s.eraserMode],
      pressed: s.eraserMode === "object",
      disabled: false,
    },
    { action: "undo", label: "Annuler", pressed: null, disabled: !s.canUndo },
    { action: "redo", label: "Rétablir", pressed: null, disabled: !s.canRedo },
  ];
}

export function mountBar(
  root: HTMLElement,
  engine: Pick<Engine, "setTool" | "setEraserMode" | "undo" | "redo" | "state" | "onState">,
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
      else if (b.action === "eraser-mode") {
        engine.setEraserMode(engine.state().eraserMode === "partial" ? "object" : "partial");
      } else engine.setTool(b.action);
    });
    buttons.set(b.action, el);
    root.append(el);
  }
  const status = root.ownerDocument.getElementById("etat") ?? root.appendChild(document.createElement("span"));
  status.id = "etat";
  root.append(status); // après les boutons : un message d'erreur long ne les pousse pas (déplace #etat s'il précède)
  status.setAttribute("role", "status");
  const paint = (s: EngineState): void => {
    for (const b of barModel(s)) {
      const el = buttons.get(b.action);
      if (!el) continue;
      el.textContent = b.label;
      el.disabled = b.disabled;
      if (b.pressed === null) el.removeAttribute("aria-pressed");
      else el.setAttribute("aria-pressed", String(b.pressed));
    }
    status.textContent = s.error ?? "";
  };
  paint(engine.state());
  return engine.onState(paint);
}

export interface SettingButton {
  readonly key: SettingKey;
  readonly label: string;
  /** Vrai si le changer recharge la page (échelons 3 et 4). */
  readonly reload: boolean;
}

export function settingsModel(s: EngineSettings, e: EffectiveEchelons): SettingButton[] {
  return SETTING_KEYS.map((key) => ({ key, label: settingLabel(key, s, e), reload: needsReload(key) }));
}

export interface SettingsBarDeps {
  readonly store: SettingsStore;
  effective(): EffectiveEchelons;
  /** Notes du démarrage (adresse mal écrite, repli WebGL2), affichées après les boutons. */
  readonly notes: readonly string[];
  /** Adresse actuelle (`location.search`), gardée au rechargement (`?banc`). */
  search(): string;
  /** Recharge la page avec une nouvelle adresse (`location.search = …`). */
  navigate(search: string): void;
}

export function mountSettings(root: HTMLElement, deps: SettingsBarDeps): () => void {
  const buttons = new Map<SettingKey, HTMLButtonElement>();
  for (const b of settingsModel(deps.store.get(), deps.effective())) {
    const el = document.createElement("button");
    el.type = "button";
    el.dataset["reglage"] = b.key;
    if (b.reload) el.title = "Recharge la page : le dessin en cours est perdu";
    el.addEventListener("click", () => {
      const next = cycleSetting(deps.store.get(), b.key);
      if (b.reload) deps.navigate(settingsSearch(next, deps.search()));
      else deps.store.set(next);
    });
    buttons.set(b.key, el);
    root.append(el);
  }
  const notes = document.createElement("span");
  notes.id = "echelons-notes";
  notes.textContent = deps.notes.join(" · ");
  root.append(notes);
  const paint = (s: EngineSettings): void => {
    for (const b of settingsModel(s, deps.effective())) {
      const el = buttons.get(b.key);
      if (el) el.textContent = b.label;
    }
  };
  paint(deps.store.get());
  return deps.store.onChange(paint);
}
```

- [ ] **4. Lancer, voir vert.** Commande 1 du § Test → `Tests  10 passed (10)`, les trois noms présents.

- [ ] **5. Remplacer la page.** `apps/web/index.html` :

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
      #reglages { position: absolute; top: 60px; left: 8px; z-index: 2; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; max-width: calc(100vw - 16px); font-size: 13px; user-select: none; -webkit-user-select: none; }
      #reglages button { min-height: 32px; padding: 0 10px; font: inherit; border: 1px solid #a1a1aa; border-radius: 8px; background: #ffffff; color: #18181b; }
      #echelons-notes { margin-left: 8px; color: #b45309; }
    </style>
  </head>
  <body>
    <div id="stage">
      <canvas id="scene"></canvas>
      <canvas id="interaction"></canvas>
    </div>
    <div id="barre" role="toolbar" aria-label="Outils"><span id="etat" role="status"></span></div>
    <div id="reglages" role="group" aria-label="Réglages du moteur"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **6. Remplacer l'amorce.** `apps/web/src/main.ts` :

```ts
/**
 * Amorce de l'application (lot 3, étendue au lot 3b) : cœur Wasm, moteur d'interaction, barre minimale en DOM simple
 * (remplacée au lot 5 par l'interface SolidJS). Réglages du moteur lus dans l'adresse (`?echelons=`, `?paume=`,
 * `?doigt=`, engine/settings.ts) puis changés par la barre ; état effectif publié dans `#stage[data-echelons]` (S2).
 * `?banc` ajoute le banc du lot 1 rejoué (géométrie du produit).
 */
import { mountBar, mountSettings } from "./app/barre";
import { createWasmCore } from "./core/wasm-core";
import { createEngine, DEFAULT_PEN_STYLE, type EngineState } from "./engine/engine";
import type { KeyLike } from "./engine/input/keys";
import { createMiddlePan } from "./engine/input/middle-pan";
import { withLinearPrediction } from "./engine/input/predict";
import { createRouter, SECOND_FINGER_MS, type RouterOptions } from "./engine/input/router";
import { createSampler, type SamplerOptions } from "./engine/input/sampler";
import { detectSupport } from "./engine/input/support";
import { attachInkTrail, type InkLike } from "./engine/render/ink-trail";
import { chooseRenderer } from "./engine/render/select";
import {
  createSettingsStore,
  echelonsTag,
  parseSettings,
  resolvePrediction,
  type EffectiveEchelons,
} from "./engine/settings";
import { createEraserTool } from "./engine/tools/eraser";
import { createPenTool } from "./engine/tools/pen";
import init, * as wasm from "./wasm/roomboard_wasm";

/** Bit du bouton gomme du stylet dans `PointerEvent.buttons`. */
const ERASER_BUTTON = 32;

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
  const parsed = parseSettings(window.location.search);
  const settings = createSettingsStore(parsed.settings);
  const support = detectSupport();
  // Échelon 4 : WebGL2 pour le canvas d'interaction si demandé, sinon (ou s'il manque) Canvas 2D.
  const choice = chooseRenderer(
    el<HTMLCanvasElement>("scene"),
    el<HTMLCanvasElement>("interaction"),
    doc,
    parsed.settings.webgl === "on",
  );
  const engine = createEngine({
    doc,
    renderer: choice.renderer,
    frames: {
      requestFrame: (cb) => requestAnimationFrame(cb),
      cancelFrame: (id) => cancelAnimationFrame(id),
      now: () => performance.now(),
    },
    tools: { pen: createPenTool, eraser: createEraserTool },
  });

  // Échelon 1 de DA9 : fusionnés et prédits ; pointerrawupdate coupé (pas de prédits sous Chromium avec lui).
  // Paume (D18, réglage) : lue à chaque pose du stylet.
  const samplerOptions: SamplerOptions = {
    coalesced: true,
    predicted: true,
    raw: false,
    get cancelTouchesOnPen() {
      return settings.get().palm === "strict";
    },
  };
  const sampler = createSampler(stage, samplerOptions);
  // Doigt (D18, réglage) : lu à chaque geste.
  const routerOptions: RouterOptions = {
    get fingerPansAfterPen() {
      return settings.get().finger === "pan";
    },
    secondFingerMs: SECOND_FINGER_MS,
  };
  // Échelon 2 : prédiction TS, lue à chaque image (auto : seulement sans prédits natifs).
  const prediction = (): boolean => resolvePrediction(settings.get().prediction, support.predicted);
  const router = createRouter(routerOptions, {
    currentTool: () => engine.tool(),
    panHeld: () => engine.panHeld(),
    gestures: withLinearPrediction(engine.sink, prediction),
    view: engine.view,
  });
  sampler.onGesture((g) => router.handle(g));
  createMiddlePan(stage, engine.view);

  // Échelon 3 : traînée déléguée, seulement pour un geste qui trace au stylo.
  const trail = await attachInkTrail({
    enabled: parsed.settings.inkTrail === "on",
    ink: (navigator as Navigator & { ink?: InkLike }).ink,
    area: el<HTMLCanvasElement>("interaction"),
    surface: stage,
    styleFor: (e) => {
      if (engine.tool() !== "pen" || engine.panHeld() || (e.buttons & ERASER_BUTTON) !== 0) return null;
      if (e.pointerType === "mouse" && (e.buttons & 1) === 0) return null;
      if (e.pointerType === "touch" && router.penSeen() && settings.get().finger === "pan") return null;
      return { color: DEFAULT_PEN_STYLE.color, diameter: DEFAULT_PEN_STYLE.width * engine.camera().zoom };
    },
  });
  const effective = (): EffectiveEchelons => ({
    prediction: prediction(),
    inkTrail: trail.status,
    webgl: parsed.settings.webgl === "off" ? "off" : choice.webgl ? "on" : "repli",
  });

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
  window.addEventListener("keyup", (e) => {
    if (engine.keyUp(keyOf(e))) e.preventDefault();
  });
  window.addEventListener("blur", () => engine.releaseKeys());
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
    stage.style.cursor = s.tool === "hand" ? "grab" : "";
  };
  mark(engine.state());
  engine.onState(mark);
  const markEchelons = (): void => {
    stage.dataset["echelons"] = echelonsTag(effective());
  };
  markEchelons();
  settings.onChange(markEchelons);
  mountBar(el<HTMLDivElement>("barre"), engine);
  mountSettings(el<HTMLDivElement>("reglages"), {
    store: settings,
    effective,
    notes: choice.note === null ? parsed.errors : [...parsed.errors, choice.note],
    search: () => window.location.search,
    navigate: (search) => {
      window.location.search = search;
    },
  });

  if (new URLSearchParams(window.location.search).has("banc")) {
    const { createAppBench, mountBenchPanel } = await import("./app/banc");
    mountBenchPanel(
      createAppBench({
        sampler,
        onLiveDrawn: (cb) => engine.onLiveDrawn(cb),
        frameDurations: () => engine.frameDurations(),
        options: { coalesced: true, predicted: true, raw: false, desynchronized: true, inkTrail: trail.status === "on" },
        environment: {
          userAgent: navigator.userAgent,
          devicePixelRatio: window.devicePixelRatio || 1,
          support,
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

- [ ] **7. Suite complète.** `verifier.sh` sous le jeton → `verifier.sh : OK` (le `tsc --noEmit` du build vérifie
  l'amorce et la barre ; `apps/web/dist` reconstruit).

- [ ] **8. S2 au navigateur.** Commandes 3 et 4 du § Test → `S2 lot 3 : OK` ; `S2 lot 3b : OK (4 passages)` et les
  quatre captures. Un échec d'un contrôle du lot 3b se corrige dans `main.ts`, `index.html` ou `barre.ts`, jamais dans
  le script ni les modules T30 à T38 (si la cause est là : s'arrêter et le rapporter, avec la sortie du script).

- [ ] **9. Décrire les captures.** Ouvrir les quatre PNG (outil de lecture d'image) et les décrire dans le rapport,
  une phrase chacune, en regard de l'attendu du § Preuve visuelle.

- [ ] **10. Commit.**

```bash
cd "$WT" && git add apps/web/src/main.ts apps/web/index.html apps/web/src/app/barre.ts apps/web/src/app/barre.test.ts docs/essais/s2-lot3b-defaut.png docs/essais/s2-lot3b-2.png docs/essais/s2-lot3b-3.png docs/essais/s2-lot3b-4.png
cd "$WT" && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(app): wire engine settings, hand tool and object eraser into the minimal bar; S2 lot 3b green" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t41"></a>
### Tâche T41 — Coque Linux : build Tauri après le build web, la coque trace

**Subagent : orchestrateur** (tâche de fin de lot, faite par l'orchestrateur lui-même, sur `feat/socle-lot3b` après la
fusion de T40). Scénario : S5 (partie Linux).

**Objectif.** Prouver que la coque Tauri Linux embarque l'application du lot 3b et qu'elle trace et annule. La coque
embarque le `apps/web/dist` présent au build (pas de `beforeBuildCommand`, piège de l'état) : construire le web
d'abord.

**Fichiers.** Créer `docs/essais/coque-linux-lot3b.png`. Aucun fichier de code.

**Interfaces.** Consomme : `apps/web/dist` construit par `verifier.sh` après T40 ; `apps/desktop` (non modifié).
Réutilise : méthode de T29 du lot 3 (shim `LD_PRELOAD` qui force un DPI de 96 sous Broadway, hors dépôt, si le
`devicePixelRatio` négatif de Broadway sort la page du champ).

**Commandes et preuve.**
1. `cd /home/adminjd/projets/roomboard-wt/socle && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30`
   → `verifier.sh : OK`.
2. Vérifier qu'aucun autre build Tauri ne tourne : `pgrep -fa "tauri build" || echo aucun` → `aucun`.
3. `cd /home/adminjd/projets/roomboard-wt/socle && CARGO_BUILD_JOBS=2 PATH=$HOME/.cargo/bin:$PATH pnpm --filter @roomboard/desktop tauri build 2>&1 | tail -15`
   → fin sans `error`, paquet `.deb` listé sous `target/release/bundle/deb/` (lot 3 : 10 min 17, pic 1,29 Go).
4. Lancer la coque sous Broadway (méthode T29), tracer deux traits à la souris, Ctrl+Z (un trait disparaît),
   capturer la fenêtre dans `docs/essais/coque-linux-lot3b.png`. Fermer par le ✕ de la fenêtre (piège : `broadwayd`
   plante si on tue un client).

**Contraintes (recopiées de « Global Constraints »).** Un seul build Tauri à la fois, aucun build Android ; jamais
`git add -A`, `git add .`, `git commit -a` ; pas de `--force` ; aucun `git tag`, aucune release ; aucun workflow
GitHub Actions ; dépôt public : le shim DPI et ses chemins restent hors dépôt ; commit d'auteur
`jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; relecteurs au premier plan (`run_in_background: false`).

**Interdits.** Aucune modification de `apps/desktop` ni de l'application pour faire passer la coque ; un défaut vu ici
devient une tâche ou un constat. Pas d'essai sur un vrai X11 ou Wayland exigé (non disponible sur la VM : le dire).

**Terminé quand.** `verifier.sh : OK`, `.deb` produit (taille et durée notées dans l'état), capture commitée et décrite
(« la coque trace, Ctrl+Z annule »), ou constat écrit si la coque ne trace pas.

```bash
cd /home/adminjd/projets/roomboard-wt/socle && git add docs/essais/coque-linux-lot3b.png
cd /home/adminjd/projets/roomboard-wt/socle && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "docs(essais): Linux shell capture for lot 3b" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
