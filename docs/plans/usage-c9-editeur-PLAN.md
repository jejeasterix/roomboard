# Plan d'exécution — usage-c9-editeur (C9, éditeur : panneau de grille à aperçu direct, cache des lignes)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | `lineWidth` et lignes d'une grille non enregistrée, du cœur Rust à la page (liaison Wasm, vraie et fausse liaison, épaisseur au rendu) | — | `crates/roomboard-core/src/grid.rs`, `crates/roomboard-core/src/document.rs`, `crates/roomboard-core/src/commands.rs`, `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/api.ts`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/fake-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts`, `apps/web/src/core/fake-core.test.ts`, `apps/web/src/engine/render/grid-paint.ts`, `apps/web/src/engine/render/grid-paint.test.ts`, `apps/web/src/engine/render/canvas2d.test.ts`, `apps/web/src/engine/tools/select.test.ts`, `apps/web/src/engine/tools/shape.test.ts` | isolé | concepteur-critique | `cargo test --workspace` : `test result: ok` partout, ≥ 1 test `read_level_line_width_defaults_to_one`, `set_grid_line_width_round_trip_and_bounds`, `grid_lines_of_matches_grid_lines_after_set_grid`, `grid_lines_of_inner_matches_grid_lines_after_set_grid` ; `ROOMBOARD_WASM_REQUIRED=1` vitest des 4 fichiers web : 0 échec, « gridLinesOf (S3, DAE1) » présent sur les deux fabriques ; `tsc` vide | S3 | #tache-t1 |
| T2 | Cache des lignes de grille (`grid-cache.ts`) tenu par `Canvas2DRenderer` | T1 | `apps/web/src/engine/render/grid-cache.ts` (neuf), `apps/web/src/engine/render/grid-cache.test.ts` (neuf), `apps/web/src/engine/render/canvas2d.ts`, `apps/web/src/engine/render/canvas2d.test.ts` | isolé | concepteur-critique | vitest `grid-cache.test.ts` + `canvas2d.test.ts` : 0 échec, ≥ 8 tests de cache, « S4 : dix images de même caméra → un seul appel au cœur » présent ; tests S5 de la grille (calage, 202 et 152) verts sans retouche ; `tsc` vide | S4 | #tache-t2 |
| T3 | Aperçu de grille au rendu et au moteur (`setGridPreview`, `previewGrid`, `endGridPreview`) | T2 | `apps/web/src/engine/render/renderer.ts`, `apps/web/src/engine/render/canvas2d.ts`, `apps/web/src/engine/render/canvas2d.test.ts`, `apps/web/src/engine/render/webgl2.ts`, `apps/web/src/engine/render/webgl2.test.ts`, `apps/web/src/engine/engine.ts`, `apps/web/src/engine/engine.test.ts` | isolé | implementeur-tdd | vitest `canvas2d.test.ts`, `webgl2.test.ts`, `engine.test.ts` : 0 échec, « setGridPreview → gridLinesOf appelé avec le brouillon, gridLines non » et « switchTo coupe l'aperçu » présents ; `tsc` vide | S4, S1 | #tache-t3 |
| T4 | Brouillon de séance pur (`grid-edit.ts`) et panneau `GridPanel` | T1 | `apps/web/src/grid-edit.ts` (neuf), `apps/web/src/grid-edit.test.ts` (neuf), `apps/web/src/ui/GridPanel.tsx` (neuf), `apps/web/src/ui/GridPanel.test.tsx` (neuf), `apps/web/src/ui/ProfileEditor.tsx` | isolé | implementeur-tdd | vitest `grid-edit.test.ts` + `GridPanel.test.tsx` + `ProfileEditor.test.tsx` : 0 échec, ≥ 15 tests, « S2 : Seyès → preview » et « démontage → endPreview » présents ; `tsc` vide | S2 | #tache-t4 |
| T5 | Bouton « Grille » (barre, profils `defaut` et `annotation`) et séance dans `App` | T3, T4 | `apps/web/src/ui/App.tsx`, `apps/web/src/ui/App.test.tsx`, `apps/web/src/app/toolbar-host.ts`, `apps/web/src/app/toolbar-host.test.ts`, `apps/web/src/toolbar.ts`, `apps/web/src/toolbar.test.ts`, `apps/web/src/toolbar-profiles.ts`, `apps/web/src/toolbar-profiles.test.ts` | isolé | implementeur-tdd | vitest des 4 fichiers de test : 0 échec, « App — grille (C9 éditeur, E7, E8) » ≥ 6 tests présents ; `ROOMBOARD_WASM_REQUIRED=1 pnpm -r test` : 0 échec (dont `profile-store.test.ts`, `profile-edit.test.ts`) ; `pnpm --filter @roomboard/web build` OK | S2, S1 | #tache-t5 |
| T6 | Geste Playwright `c9-grille-navigateur.mjs` dans `verifier.sh --e2e`, capture de l'éditeur | T5 | `scripts/essais/c9-grille-navigateur.mjs` (neuf), `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/c9-editeur-grille.png` (neuf) | isolé | implementeur-tdd | `bash scripts/verifier.sh --e2e` : « C9 grille : OK », « S5b : OK », « C1 : OK », « verifier.sh : e2e OK », « verifier.sh : OK » ; `verifier-e2e.test.sh : OK` ; PNG présent | S1, S5 | #tache-t6 |

**Vagues (par dépendances).** Vague 1 : T1 seule. Vague 2 : T2 et T4 en parallèle (fichiers disjoints : rendu d'un côté,
`grid-edit.ts`, `GridPanel.tsx`, `ProfileEditor.tsx` de l'autre). Vague 3 : T3 (après T2 : `canvas2d.ts` et
`canvas2d.test.ts` partagés). Vague 4 : T5 (après T3 et T4). Vague 5 : T6. Fichiers partagés entre tâches, donc jamais en
parallèle : `canvas2d.test.ts` (T1 → T2 → T3), `canvas2d.ts` (T2 → T3). Chemin critique T1 → T2 → T3 → T5 → T6, environ
60 + 40 + 30 + 35 + 45 min.

**Compte.** Six tâches : le gabarit « courte » (six au plus) tient. T1 est la plus lourde (Rust et TS ensemble, voulu :
le format à 7 nombres par niveau change des deux côtés à la fois, sinon le contrat du vrai module serait rouge entre
deux tâches) ; T6 joue la suite complète `--e2e` (longue).

**Goal :** régler la grille de la page montrée dans un panneau (type parmi les six, pas, couleur, épaisseur, magnétisme)
avec un aperçu direct sur la page, une validation qui fait une seule étape annulable, un aller-retour `.roomboard` qui
garde la grille, et des lignes de grille gardées en cache.

**Architecture :** le cœur gagne un champ de niveau facultatif `lineWidth` (pixels CSS d'écran, `[1, 8]`, défaut 1) et
`Document::grid_lines_of`, qui passe une grille non enregistrée au même `grid::lines` (DAG1) ; la liaison l'expose en
`grid_lines_of` et la page en `CoreDocument.gridLinesOf`. Le rendu garde les lignes du cœur pour un rectangle élargi
(`GridLinesCache`, E3) et les recoupe à la vue avant `paintGrid` ; l'aperçu (`Renderer.setGridPreview`, DAE1) remplace la
grille du document dans ce même cache. L'éditeur tient un brouillon pur (`grid-edit.ts`) ; `GridPanel` appelle `preview`
à chaque saisie et `apply` une fois ; `App` écrit un seul `SetGrid` et ferme la séance sur page, onglet ou version
changés.

**Tech Stack :** Rust (yrs 0.28, serde), wasm-bindgen, TypeScript strict, SolidJS 1.9.20, Vitest 3 (happy-dom pour les
composants), Playwright (Chromium headless, essai e2e).

**Spec :** `docs/plans/usage-c9-editeur-cadrage.md` (base `origin/main` `8247215`).

## Global Constraints

- CG1 TDD : chaque comportement commence par son test, lancé et vu rouge (échec ou erreur de compilation attendue), puis
  le code minimal, puis vert.
- CG2 Preuve bornée : chaque commande commence par `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`
  (`$WT` : chemin absolu du worktree de la tâche, donné par l'orchestrateur) ; commandes du profil (`cargo test
  --workspace 2>&1 | tail -20`, `pnpm -r test 2>&1 | tail -20`, `scripts/verifier.sh`) ; sorties coupées (`tail`,
  `grep`) ; échec = `test result: FAILED`, `error[`, `FAIL `, ou code de sortie non nul.
- CG3 Aucun build Tauri (`pnpm --filter @roomboard/desktop tauri build`) ni Android.
- CG4 Aucune dépendance ajoutée (`package.json`, `pnpm-lock.yaml`, `Cargo.toml`, `Cargo.lock` inchangés) ; jamais de
  GPL, AGPL, LGPL.
- CG5 Aucun seuil changé (budgets Wasm 1,5 Mo et 3 Mio, `MAX_GRID_DOTS`, `MAX_GRID_LEVELS`, 640 px de scène, bornes
  202 et 152 des tests S5) ; aucun test désactivé, sauté ou affaibli (`.skip`, `.only`, `#[ignore]`) ; un attendu existant
  ne change que là où la section le dit.
- CG6 Git : jamais `git add -A`, `git add .`, `git commit -a` ; fichiers ajoutés un par un ; aucun push, aucun tag.
- CG7 Commits : auteur et committeur `jejeasterix <jejeasterix@users.noreply.github.com>`
  (`git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit …`) ; message en anglais,
  dernière ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- CG8 Un test qui échoue sur un délai (VM chargée : `Test timed out`, `timeout`) est rejoué une fois ; un second échec est
  un vrai échec.
- CG9 `schema` et `formatVersion` du `.roomboard` inchangés (E1) ; message de `BadGrid` inchangé.
- CG10 Ne toucher que les fichiers de la tâche ; aucun fichier du chantier C10a ; textes visibles en français,
  identifiants en anglais.
- CG11 Rapport de tâche en français ; une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`
  par ligne `Réutilise :` de la section.

## Review Focus

1. Fichier de la PR 12 (niveau sans `lineWidth`) ou d'une version plus récente (`lineWidth` hors `[1, 8]`, non nombre) :
   lu à 1, aucun niveau écarté, réenregistré à l'identique (effet de bord 1 du cadrage) → T1,
   `read_level_line_width_defaults_to_one`, `grid_level_without_line_width_reads_as_one_and_resaves_identically`,
   « lineWidth (E1) : absent ou hors [1, 8] lu à 1 ».
2. Ligne posée exactement sur un bord de la vue après un défilement servi par le cache : présente comme sans cache
   (effet de bord 3, E3) → T2, « ligne posée sur un bord de la vue : gardée » et « S4 : ligne sur le haut de la vue après
   défilement ».
3. Très grande vue (jusqu'à 3840 × 2160, zoom 8) : marge 0, aucun niveau de points sauté à cause du cache (E3, S4) → T2,
   « S4 : vues jusqu'à 3840 × 2160 ».
4. Pas saisi hors `[4, 400]`, vide ou illisible (HE9) : aperçu borné, champ ramené à la borne à la validation, vide sans
   effet → T4, « HE9 : pas borné » (grid-edit) et « HE9 : pas saisi hors bornes » (GridPanel).
5. Onglet changé pendant une séance : panneau fermé, aperçu coupé sur l'onglet de départ, jamais posé sur le nouveau
   (E8) → T5, « E8, Review Focus 5 : onglet changé pendant la séance ».

## Choix du plan (hors cadrage, à relire)

- PC1 « Appliquer » (E8) : `engine.run(SetGrid)` d'abord, fin de l'aperçu et fermeture seulement s'il réussit ; refusé,
  l'aperçu reste avec le panneau ouvert (le cadrage disait « fin de l'aperçu, run, fermé » : même résultat sur succès).
- PC2 Liaison : `grid_lines_of` délègue à `grid_lines_of_inner(&self, page, &GridInput, view: &[f64])`, seule testée en
  natif (convention de `lib.rs:1-3`).
- PC3 S4 du cadrage (« pour toute vue jusqu'à 3840 × 2160 […] ≤ 65 536 ») n'est vrai que si la vue seule tient ; le test
  dit : si la vue tient, le rectangle gardé tient ; sinon le rectangle gardé est la vue (marge 0), comme E3 le décide.
- PC4 `LevelLines.lineWidth` est obligatoire en TS (le cœur l'envoie toujours ; contrôle de forme strict, comme les autres
  champs) : les littéraux de groupes des tests (`grid-paint.test.ts`, contrat) gagnent `lineWidth: 1` par `sed`.
- PC5 L'épaisseur au rendu (`grid-paint.ts`) est faite dans T1 : ses littéraux de test changent de toute façon dans T1.
- PC6 `syncValue` de `ProfileEditor.tsx` est exporté et réutilisé par `GridPanel` (aucune seconde copie).
- PC7 Premier niveau d'un `kind` inconnu (« Autre ») : pas, couleur, épaisseur désactivés ; magnétisme réglable.
- PC8 Choix « Épaisseur » : 1 à 4 px, plus la valeur du document si elle est ailleurs dans `[1, 8]` (`lineWidthOptions`).
- PC9 Couleur qui n'est pas `#rrggbb` : le champ montre `#000000`, la couleur du document reste tant qu'on n'y touche pas.
- PC10 Fermeture de séance (E8) par un mémo `onglet|page|version` : une erreur seule (`#etat`) ne ferme pas.
- PC11 Test « SetGrid écrit les neuf champs » de `fake-core.test.ts` renommé « dix champs ».

---

<a id="tache-t1"></a>
### Tâche T1 — `lineWidth` et lignes d'une grille non enregistrée, du cœur Rust à la page

**Objectif.** Le niveau de grille gagne `lineWidth` (pixels CSS d'écran, fini, `1 ≤ lineWidth ≤ 8` à l'écriture, sinon
`BadGrid` sans transaction ; absent ou hors bornes à la lecture : 1 ; toujours écrit par `SetGrid`), recopié dans chaque
groupe de lignes et peint à `max(1, round(lineWidth·dpr))` pixels physiques (point `max(2, round(2·lineWidth·dpr))`). Le
cœur calcule les lignes d'une grille non enregistrée (`grid_lines_of`, même `grid::lines`), exposées jusqu'à
`CoreDocument.gridLinesOf` sur la vraie et la fausse liaison. La liaison passe à 7 nombres par niveau. Cadrage : E1, E2
(partie lecture), DAE1 ; scénario S3.

**Fichiers.**
- Modifier : `crates/roomboard-core/src/grid.rs` (`:31-44` `GridLevelView`, `:58-66` `LevelLines`, `:113-131`
  `read_level`, `:149-160` `level_fields`, `:163-178` `validate`, `:490`, `:499` poussées ; tests `:555-567`, `:650-685`).
- Modifier : `crates/roomboard-core/src/document.rs` (`:486-521`).
- Modifier : `crates/roomboard-core/src/commands.rs` (tests : `grid_level` `:2745-2757`, tests neufs à la suite de
  `grid_reload_keeps_bytes`).
- Modifier : `crates/roomboard-wasm/src/lib.rs` (`:14`, `:239-275` `grid_input`, `:423-440` `grid_lines`, `:705-714`
  `set_grid_inner`, tests `:1393-1450`).
- Modifier : `apps/web/src/core/api.ts`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/fake-core.ts`.
- Modifier : `apps/web/src/engine/render/grid-paint.ts` (`:1-8`, `:39-40`, `:55-95`).
- Tests : `apps/web/src/core/wasm-core.contract.test.ts`, `apps/web/src/core/fake-core.test.ts`,
  `apps/web/src/engine/render/grid-paint.test.ts`, `apps/web/src/engine/render/canvas2d.test.ts`,
  `apps/web/src/engine/tools/select.test.ts`, `apps/web/src/engine/tools/shape.test.ts` (littéraux seulement pour ces
  deux derniers).

**Interfaces.**
- Consomme : rien des autres tâches.
- Produit (Rust, `roomboard_core::grid`) : `pub const DEFAULT_LINE_WIDTH: f64 = 1.0; pub const MIN_LINE_WIDTH: f64 = 1.0;
  pub const MAX_LINE_WIDTH: f64 = 8.0;` ; `GridLevelView.line_width: f64` (JSON `lineWidth`) ; `LevelLines.line_width:
  f64` (JSON `lineWidth`).
- Produit (Rust, `Document`) : `pub fn grid_lines_of(&self, page: &str, grid: &GridView, rect: Bounds, min_step: f64,
  min_dot_step: f64) -> Option<GridLines>` ; `grid_lines` l'appelle.
- Produit (Wasm) : `grid_lines_of(&self, page: &str, visible: bool, snap: bool, above: bool, kinds: Vec<String>, colors:
  Vec<String>, lines: Vec<String>, nums: &[f64], view: &[f64]) -> Result<JsValue, JsError>` (`view` = `x0, y0, x1, y1,
  min_step, min_dot_step`, autre longueur : `BadGrid` ; `null` : page inconnue ou grille invisible) ;
  `grid_lines_of_inner(&self, page: &str, grid: &GridInput, view: &[f64]) -> Result<Option<GridLines>, CommandError>` ;
  `nums` à 7 nombres par niveau `sx, sy, ox, oy, snap, visible, lineWidth`.
- Produit (TS, `core/api.ts`) : `GridLevel.lineWidth: number` ; `LevelLines.lineWidth: number` ;
  `export const DEFAULT_GRID_LINE_WIDTH = 1; export const MIN_GRID_LINE_WIDTH = 1; export const MAX_GRID_LINE_WIDTH = 8;`
  ; `CoreDocument.gridLinesOf(page: string, grid: GridView, rect: Bounds, minStep: number, minDotStep: number):
  GridLines | null`.
- Produit (TS, `core/wasm-core.ts`) : `export function gridArgs(g: GridView): [boolean, boolean, boolean, string[],
  string[], string[], Float64Array]`.
- Produit (TS, `engine/render/grid-paint.ts`) : `lineWidthPx(dpr: number, lineWidth = 1): number`,
  `dotSizePx(dpr: number, lineWidth = 1): number` ; `DeviceLevel.width` et `.dot` par niveau.
- Réutilise : `crates/roomboard-core/src/grid.rs:513` (`grid::lines`, pure), `document.rs:512` (`grid_lines`),
  `lib.rs:241` (`grid_input`) — Rust `Document::grid_lines_of(&self, page: &str, grid: &GridView, rect: Bounds, min_step:
  f64, min_dot_step: f64) -> Option<GridLines>` (`grid_lines` l'appelle) ; Wasm `grid_lines_of(page, visible, snap, above,
  kinds, colors, lines, nums, view: &[f64]) -> JsValue` ; TS `gridLinesOf(page: string, grid: GridView, rect: Bounds,
  minStep: number, minDotStep: number): GridLines | null` (étendre).
- Réutilise : `apps/web/src/core/wasm-core.ts:306-316` (bras `SetGrid`) — extraction `gridArgs(g: GridView): [boolean,
  boolean, boolean, string[], string[], string[], Float64Array]`, appelée par `SetGrid` et `gridLinesOf`, aucune seconde
  copie (étendre).
- Réutilise : `apps/web/src/core/fake-core.ts:930` (`squaresLines`), `:809`, `:845`, `:873` — `gridLinesOf =
  squaresLines(grid, PAGE_WIDTH, rect, minStep)` ; `lineWidth` lu, comparé, sauvegardé (réutiliser).
- Réutilise : `crates/roomboard-core/src/grid.rs:113`, `:149`, `:163` ; `apps/web/src/engine/render/grid-paint.ts:39-40`
  — `lineWidthPx(dpr, lineWidth = 1)`, `dotSizePx(dpr, lineWidth = 1)` ; `DeviceLevel.width` par niveau (étendre).

**Test et commande bornée.**
- Rust : `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo test -p roomboard-core --lib
  line_width 2>&1 | grep -E "^test |test result"` → au moins `read_level_line_width_defaults_to_one`,
  `validate_grid_line_width_bounds`, `grid_lines_carry_the_level_line_width`, `set_grid_line_width_round_trip_and_bounds`,
  `grid_level_without_line_width_reads_as_one_and_resaves_identically` en `... ok`, `test result: ok`.
- Rust : `cargo test -p roomboard-core --lib grid_lines_of 2>&1 | grep -E "^test |test result"` → 1 test ok ;
  `cargo test -p roomboard-wasm grid_ 2>&1 | grep -E "^test |test result"` → `grid_input_reads_seven_numbers_per_level`,
  `grid_input_rejects_inconsistent_lengths`, `grid_lines_of_inner_matches_grid_lines_after_set_grid` ok.
- Rust, à garder verts : `cargo test -p roomboard-core --test compat_socle 2>&1 | tail -5` (`socle_fixture_resaves_identically`),
  `cargo test -p roomboard-formats --test container socle 2>&1 | tail -5` (`socle_fixture_hash_is_pinned`), puis
  `cargo test --workspace 2>&1 | tail -20` (aucun `FAILED`).
- Web : `cd "$WT" && ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web exec vitest run
  src/core/wasm-core.contract.test.ts src/core/fake-core.test.ts src/engine/render/grid-paint.test.ts
  src/engine/render/canvas2d.test.ts --reporter=verbose 2>&1 | grep -E "gridLinesOf|lineWidth|gridArgs|épaisseur|Test Files|Tests " | head -30`
  → « gridLinesOf (S3, DAE1) » deux fois (deux fabriques), « gridArgs (E1) », « épaisseur du niveau (E1, S3) »,
  `Test Files  4 passed`, 0 échec ; les tests S5 de `canvas2d.test.ts` (« grille (C9, S5 a) », « grille (C9, S5) : tout
  zoom ») verts.
- `cd "$WT" && pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20` → aucune sortie, code 0.
- `cd "$WT" && ROOMBOARD_WASM_REQUIRED=1 pnpm -r test 2>&1 | tail -20` → 0 échec.

**Preuve visuelle.** Aucune (pas d'interface dans cette tâche).

**Contraintes (recopiées de Global Constraints).**
- CG1 TDD : chaque comportement commence par son test, lancé et vu rouge (échec ou erreur de compilation attendue), puis
  le code minimal, puis vert.
- CG2 Preuve bornée : chaque commande commence par `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ;
  commandes du profil ; sorties coupées ; échec = `test result: FAILED`, `error[`, `FAIL `, ou code non nul.
- CG3 Aucun build Tauri ni Android.
- CG4 Aucune dépendance ajoutée ; jamais de GPL, AGPL, LGPL.
- CG5 Aucun seuil changé (budgets Wasm, `MAX_GRID_DOTS`, `MAX_GRID_LEVELS`, bornes 202 et 152) ; aucun test désactivé ou
  sauté ; un attendu existant ne change que là où la section le dit.
- CG6 Jamais `git add -A`, `git add .`, `git commit -a` ; aucun push, aucun tag.
- CG7 Commits auteur et committeur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- CG8 Test échoué sur un délai : rejoué une fois.
- CG9 `schema` et `formatVersion` inchangés ; message de `BadGrid` inchangé.
- CG10 Seulement les fichiers de la tâche ; aucun fichier de C10a.
- CG11 Rapport en français, avec les lignes `Réutilisation : …`.

**Interdits.** Toucher au rendu autre que `grid-paint.ts` (le cache est T2, l'aperçu T3) ; une seconde géométrie de grille
(TS ou Rust) pour l'aperçu ; une seconde copie de l'encodage `nums` ; rejeter un niveau à la lecture à cause de
`lineWidth` ; changer `CommandError::BadGrid` et son message ; changer un attendu des tests S5 (seul le littéral `gridLevel`
gagne `lineWidth: 1`).

**Patron à ne pas reprendre (concepteur-critique).**
- Calculer les lignes de l'aperçu ailleurs que dans `grid::lines` (une fonction TS, ou une copie Rust) : DAG1 veut un seul
  endroit qui sait quelles lignes existent. Référence : `crates/roomboard-core/src/document.rs:511-521` (`grid_lines` →
  `grid::lines`), `crates/roomboard-core/src/grid.rs:509-541`.
- Recopier l'encodage des niveaux dans `gridLinesOf` : la parité vraie liaison ↔ cœur tient à un seul encodeur.
  Référence : `apps/web/src/core/wasm-core.ts:306-316`.
- Lire `lineWidth` strictement (niveau écarté s'il manque) : les fichiers de la PR 12 perdraient leur grille. Référence
  de la lecture tolérante champ par champ : `crates/roomboard-core/src/grid.rs:113-131`, `fake-core.ts:809-823`.
- `lineWidth` en unités de page (multiplié par le zoom) : la grille reste à épaisseur d'écran (G10). Référence :
  `apps/web/src/engine/render/grid-paint.ts:39`.

**Terminé quand.** Les commandes de preuve ci-dessus sont vertes, `cargo fmt --all --check` et `cargo clippy --workspace
--all-targets -- -D warnings` sans sortie d'erreur, `tsc` vide, deux commits (Rust, puis TS).

**Rapport.** Liste des tests ajoutés avec leur sortie ; `Réutilisation : appelé grid::lines (document.rs)`,
`Réutilisation : appelé gridArgs (wasm-core.ts)`, `Réutilisation : appelé squaresLines (fake-core.ts)`,
`Réutilisation : appelé lineWidthPx/dotSizePx (grid-paint.ts)` ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm install --frozen-lockfile 2>&1 | tail -3
```

- [ ] **Étape 2 : tests Rust de `grid.rs` (rouges).** Dans le module de tests de `crates/roomboard-core/src/grid.rs`,
  ajouter `line_width: 1.0,` au littéral de `fn level` (après `line: "solid".into(),`), ajouter `line_width: 3.0,` au
  premier niveau du test `grid_write_then_read_gives_the_same_view_and_none_removes` (à côté de `line: "dashed".into(),`),
  puis ajouter à la fin du module :

```rust
    /// E1, Review Focus 1 : `lineWidth` absent, non nombre, non fini ou hors `[1, 8]` → 1 à la lecture (fichiers de la
    /// PR 12 lus tels quels, aucun niveau écarté) ; 1, 2,5 et 8 gardés.
    #[test]
    fn read_level_line_width_defaults_to_one() {
        let read_width = |w: Option<In>| -> f64 {
            let mut fields = vec![
                ("kind", In::from("squares")),
                ("spacingX", num(40.0)),
                ("spacingY", num(40.0)),
            ];
            if let Some(w) = w {
                fields.push(("lineWidth", w));
            }
            let level = In::Map(fields.into_iter().collect::<MapPrelim>());
            let levels = In::Array(ArrayPrelim::from(vec![level]));
            let (doc, page) = page_with(In::Map(MapPrelim::from([("levels", levels)])));
            let g = read(&doc.transact(), &page).expect("grille lisible");
            assert_eq!(g.levels.len(), 1, "niveau gardé");
            g.levels[0].line_width
        };
        assert_eq!(read_width(None), 1.0);
        for bad in [
            In::from("2"),
            num(0.0),
            num(0.5),
            num(9.0),
            num(-2.0),
            num(f64::NAN),
            num(f64::INFINITY),
        ] {
            assert_eq!(read_width(Some(bad)), 1.0);
        }
        for ok in [1.0, 2.5, 8.0] {
            assert_eq!(read_width(Some(num(ok))), ok);
        }
    }

    /// E1 : `lineWidth` fini dans `[1, 8]` à l'écriture, sinon `BadGrid`.
    #[test]
    fn validate_grid_line_width_bounds() {
        let ok = level("squares", 40.0, 40.0);
        let with = |w: f64| {
            grid(vec![GridLevelView {
                line_width: w,
                ..ok.clone()
            }])
        };
        for w in [1.0, 2.0, 3.5, 8.0] {
            assert_eq!(validate(&with(w)), Ok(()), "{w}");
        }
        for w in [0.0, 0.99, 8.01, 9.0, -1.0, f64::NAN, f64::INFINITY] {
            assert_eq!(validate(&with(w)), Err(CommandError::BadGrid), "{w}");
        }
    }

    /// E1 : chaque groupe porte l'épaisseur de son niveau (Seyès : principal et fines), sérialisée en `lineWidth`.
    #[test]
    fn grid_lines_carry_the_level_line_width() {
        let g = grid(vec![
            GridLevelView {
                line_width: 3.0,
                ..level("seyes", 30.24, 30.24)
            },
            GridLevelView {
                line_width: 2.0,
                ..level("dots", 40.0, 40.0)
            },
        ]);
        let r = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: 400.0,
            y1: 400.0,
        };
        let l = lines(&g, W, r, 4.0, 8.0).expect("visible");
        assert_eq!(
            l.levels
                .iter()
                .map(|x| (x.alpha, x.line_width))
                .collect::<Vec<_>>(),
            vec![(1.0, 3.0), (SEYES_FINE_ALPHA, 3.0), (1.0, 2.0)]
        );
        let json = serde_json::to_value(&l.levels[0]).expect("json");
        assert_eq!(json["lineWidth"], 3.0);
    }
```

- [ ] **Étape 3 : voir rouge.** `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo test -p
  roomboard-core --lib grid:: 2>&1 | grep -E "error\[|test result" | head -5` → `error[E0560]` (`no field line_width`).

- [ ] **Étape 4 : implémenter dans `grid.rs`.** Après `SEYES_FINE_ALPHA`, ajouter :

```rust
/// Épaisseur par défaut d'un niveau, en pixels CSS d'écran (E1) : celle de G10.
pub const DEFAULT_LINE_WIDTH: f64 = 1.0;
/// Bornes de `lineWidth` à l'écriture (E1) ; hors bornes à la lecture : `DEFAULT_LINE_WIDTH`.
pub const MIN_LINE_WIDTH: f64 = 1.0;
pub const MAX_LINE_WIDTH: f64 = 8.0;
```

  Dans `GridLevelView`, après `pub line: String,` :

```rust
    /// Épaisseur en pixels CSS d'écran, `[1, 8]` (E1) ; la grille reste nette à tout zoom (G10).
    pub line_width: f64,
```

  `LevelLines` : ajouter `#[serde(rename_all = "camelCase")]` sous son `#[derive(...)]`, et après `pub alpha: f64,` :

```rust
    /// Épaisseur du niveau, en pixels CSS d'écran (E1).
    pub line_width: f64,
```

  Après `fn out_bool`, ajouter :

```rust
/// `lineWidth` acceptable (E1) : fini dans `[MIN_LINE_WIDTH, MAX_LINE_WIDTH]` (NaN et infinis exclus).
fn line_width_ok(v: f64) -> bool {
    (MIN_LINE_WIDTH..=MAX_LINE_WIDTH).contains(&v)
}
```

  Dans `read_level`, après `line: …,` : `line_width: out_f64(l.get(txn, "lineWidth")).filter(|v| line_width_ok(*v)).unwrap_or(DEFAULT_LINE_WIDTH),`.
  Dans la doc de `read`, ajouter « `lineWidth` absent, non fini ou hors `[1, 8]` → 1 (E1) ». Dans `level_fields`, après
  `("line", …)` : `("lineWidth", In::Any(Any::from(l.line_width))),`. Dans `validate`, ajouter `&& line_width_ok(l.line_width)`
  à `level_ok` et « épaisseur dans `[1, 8]` » à sa doc. Dans `level_lines`, ajouter `line_width: l.line_width,` aux deux
  `out.push(LevelLines { … })`.

- [ ] **Étape 5 : voir vert.** `cargo test -p roomboard-core --lib grid:: 2>&1 | grep -E "FAILED|test result"` →
  `test result: ok`.

- [ ] **Étape 6 : tests de `commands.rs` (rouges).** Dans `fn grid_level` (`:2745`), ajouter `line_width: 1.0,` après
  `line: "solid".into(),`. Après le test `grid_reload_keeps_bytes`, ajouter :

```rust
    /// S3, E1 : `lineWidth` 2 écrit en une étape, relu, gardé par save → load → save (mêmes octets) ; 0, 9, NaN :
    /// `BadGrid` sans transaction.
    #[test]
    fn set_grid_line_width_round_trip_and_bounds() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-20T00:00:00Z".into(),
            created: None,
        };
        let mut d = Document::blank();
        let p = first(&d);
        let ok = crate::grid::GridLevelView {
            line_width: 2.0,
            ..grid_level("squares", 40.0, "#94a3b8")
        };
        let w = writes(&d);
        for bad in [0.0, 9.0, f64::NAN] {
            let level = crate::grid::GridLevelView {
                line_width: bad,
                ..ok.clone()
            };
            assert_eq!(
                apply_grid(&mut d, &p, Some(grid_of(vec![level], true, false))),
                Err(CommandError::BadGrid),
                "{bad}"
            );
        }
        assert_eq!(w.since(), 0);
        let g = grid_of(vec![ok], true, false);
        apply_grid(&mut d, &p, Some(g.clone())).expect("grille");
        assert_eq!(w.since(), 1);
        assert_eq!(page_grid(&d, &p).map(|x| x.levels[0].line_width), Some(2.0));
        let file = save(&d, &meta).expect("save");
        let r = load(&file).expect("load");
        assert_eq!(page_grid(&r, &p), Some(g));
        assert!(save(&r, &meta).expect("resave") == file, "fichier différent au rechargement");
    }

    /// Effet de bord 1, Review Focus 1 : niveau écrit sans `lineWidth` (fichier de la PR 12) : lu à 1, ses lignes
    /// portent 1, le fichier se réenregistre à l'identique.
    #[test]
    fn grid_level_without_line_width_reads_as_one_and_resaves_identically() {
        use crate::format::{load, save, SaveMeta};
        use crate::query::Bounds;
        use yrs::ArrayPrelim;
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-20T00:00:00Z".into(),
            created: None,
        };
        let d = Document::blank();
        let p = first(&d);
        let page = {
            let txn = d.read();
            d.find_page(&txn, &p).expect("page").1
        };
        {
            let mut txn = d.transact_local();
            page.insert(
                &mut txn,
                "grid",
                MapPrelim::from([(
                    "levels",
                    In::Array(ArrayPrelim::from(vec![In::Map(MapPrelim::from([
                        ("kind", In::from("squares")),
                        ("spacingX", In::Any(Any::from(40.0))),
                        ("spacingY", In::Any(Any::from(40.0))),
                    ]))])),
                )]),
            );
        }
        let g = page_grid(&d, &p).expect("grille lisible");
        assert_eq!(g.levels[0].line_width, 1.0);
        let r = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: 100.0,
            y1: 100.0,
        };
        let lines = d.grid_lines(&p, r, 4.0, 8.0).expect("visible");
        assert_eq!(lines.levels[0].line_width, 1.0);
        let file = save(&d, &meta).expect("save");
        let back = load(&file).expect("load");
        assert_eq!(page_grid(&back, &p), Some(g));
        assert!(save(&back, &meta).expect("resave") == file, "relu puis réenregistré : mêmes octets");
    }

    /// DAE1, S3 : `grid_lines_of` d'une grille non enregistrée = `grid_lines` après `SetGrid` de la même grille ; page
    /// inconnue → `None` ; rien n'est écrit.
    #[test]
    fn grid_lines_of_matches_grid_lines_after_set_grid() {
        let mut d = Document::blank();
        let p = first(&d);
        let g = grid_of(
            vec![
                grid_level("seyes", 30.24, "#7b68ee"),
                crate::grid::GridLevelView {
                    line_width: 3.0,
                    ..grid_level("dots", 40.0, "#000000")
                },
            ],
            true,
            false,
        );
        let r = crate::query::Bounds {
            x0: -13.3,
            y0: 1_000_007.0,
            x1: 786.7,
            y1: 1_000_607.0,
        };
        let w = writes(&d);
        let preview = d.grid_lines_of(&p, &g, r, 4.0, 8.0).expect("lignes");
        assert_eq!(w.since(), 0);
        assert_eq!(d.grid_lines(&p, r, 4.0, 8.0), None);
        assert_eq!(d.grid_lines_of("nulle-part", &g, r, 4.0, 8.0), None);
        apply_grid(&mut d, &p, Some(g)).expect("grille");
        assert_eq!(d.grid_lines(&p, r, 4.0, 8.0), Some(preview));
    }
```

  Voir rouge : `cargo test -p roomboard-core --lib grid_lines_of 2>&1 | grep -E "error\[" | head -3` → `error[E0599]`
  (`no method named grid_lines_of`).

- [ ] **Étape 7 : implémenter dans `document.rs`.** Remplacer `grid_lines` (`:511-521`) par :

```rust
    /// Largeur d'une page ; `None` si la page est inconnue ou sans largeur lisible.
    fn page_width(&self, page: &str) -> Option<f64> {
        let txn = self.doc.transact();
        let (_, m) = self.find_page(&txn, page)?;
        out_f64(m.get(&txn, "width"))
    }

    /// Lignes visibles d'une grille non enregistrée sur la page (C9 éditeur, DAE1) : même `grid::lines` que la grille
    /// enregistrée (DAG1), sur la largeur de la page ; rien n'est écrit. `None` : page inconnue ou grille invisible.
    pub fn grid_lines_of(
        &self,
        page: &str,
        grid: &GridView,
        rect: Bounds,
        min_step: f64,
        min_dot_step: f64,
    ) -> Option<GridLines> {
        let width = self.page_width(page)?;
        grid::lines(grid, width, rect, min_step, min_dot_step)
    }

    /// Lignes visibles de la grille de la page (G9) ; `None` sans grille ou grille invisible.
    pub fn grid_lines(
        &self,
        page: &str,
        rect: Bounds,
        min_step: f64,
        min_dot_step: f64,
    ) -> Option<GridLines> {
        let (g, _) = self.page_grid(page)?;
        self.grid_lines_of(page, &g, rect, min_step, min_dot_step)
    }
```

  Voir vert : `cargo test -p roomboard-core --lib 2>&1 | tail -3` → `test result: ok`.

- [ ] **Étape 8 : tests de `lib.rs` (rouges).** Dans le module de tests de `crates/roomboard-wasm/src/lib.rs` : ajouter
  `line_width: 1.0,` à `fn squares` ; remplacer `grid_input_reads_six_numbers_per_level` et
  `grid_input_rejects_inconsistent_lengths` par les deux premiers tests ci-dessous (attendu changé : 7 nombres par
  niveau, E1), puis ajouter le troisième :

```rust
    /// G12, E1 : sept nombres par niveau, `sx, sy, ox, oy, snap, visible, lineWidth`, booléens en 0 ou 1.
    #[test]
    fn grid_input_reads_seven_numbers_per_level() {
        let g = grid_input(
            true,
            true,
            false,
            vec!["squares".into(), "dots".into()],
            vec!["#cccccc".into(), "#000000".into()],
            vec!["solid".into(), "dashed".into()],
            &[
                40.0, 40.0, 0.0, 0.0, 1.0, 1.0, 1.0, 20.0, 10.0, 5.0, -3.0, 0.0, 1.0, 2.5,
            ],
        )
        .expect("grille");
        assert_eq!((g.visible, g.snap, g.above), (true, true, false));
        assert_eq!(g.levels[0], squares(40.0));
        assert_eq!(
            g.levels[1],
            GridLevelView {
                kind: "dots".into(),
                spacing_x: 20.0,
                spacing_y: 10.0,
                origin_x: 5.0,
                origin_y: -3.0,
                color: "#000000".into(),
                line: "dashed".into(),
                line_width: 2.5,
                snap: false,
                visible: true,
            }
        );
    }

    /// G12 : longueurs incohérentes (dont l'ancienne forme à six nombres) → `BadGrid`.
    #[test]
    fn grid_input_rejects_inconsistent_lengths() {
        let s = |len: usize| vec![String::from("x"); len];
        for (k, c, l, n) in [
            (1, 1, 1, 6),
            (1, 1, 1, 8),
            (1, 0, 1, 7),
            (1, 1, 2, 7),
            (0, 0, 0, 7),
        ] {
            assert_eq!(
                grid_input(true, true, false, s(k), s(c), s(l), &vec![1.0; n]),
                Err(CommandError::BadGrid),
                "{k} {c} {l} {n}"
            );
        }
        assert!(grid_input(true, false, false, vec![], vec![], vec![], &[]).is_ok());
    }

    /// DAE1, S3 : `grid_lines_of_inner` = lignes de `grid_lines` après `SetGrid` de la même grille ; vue de longueur ≠ 6 :
    /// `BadGrid` ; page inconnue : `None`.
    #[test]
    fn grid_lines_of_inner_matches_grid_lines_after_set_grid() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let g = GridInput {
            visible: true,
            snap: true,
            above: false,
            levels: vec![GridLevelView {
                line_width: 2.0,
                ..squares(40.0)
            }],
        };
        let view = [0.0, 0.0, 100.0, 100.0, 4.0, 8.0];
        for bad in [&view[..5], &[0.0; 7][..]] {
            assert_eq!(
                d.grid_lines_of_inner(&p, &g, bad),
                Err(CommandError::BadGrid)
            );
        }
        let preview = d
            .grid_lines_of_inner(&p, &g, &view)
            .expect("vue")
            .expect("lignes");
        assert_eq!(preview.levels[0].line_width, 2.0);
        assert_eq!(d.grid_lines_of_inner("nulle-part", &g, &view), Ok(None));
        d.set_grid_inner(&p, Some(g)).expect("grille");
        let r = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: 100.0,
            y1: 100.0,
        };
        assert_eq!(d.core.grid_lines(&p, r, 4.0, 8.0), Some(preview));
    }
```

  Voir rouge : `cargo test -p roomboard-wasm grid_ 2>&1 | grep -E "error\[|FAILED" | head -5`.

- [ ] **Étape 9 : implémenter dans `lib.rs`.** Import : `use roomboard_core::grid::{GridInput, GridLevelView, GridLines};`.
  `grid_input` : doc « `nums` = 7 nombres par niveau (`sx, sy, ox, oy, snap, visible, lineWidth`, booléens en 0 ou 1) »,
  `nums.len() != 7 * n`, `nums.as_chunks::<7>().0`, et `line_width: v[6],` dans le `GridLevelView`. Après `grid_lines`
  (bloc `#[wasm_bindgen] impl Document`) :

```rust
    /// Lignes d'une grille non enregistrée (C9 éditeur, DAE1) : même calcul que `grid_lines` ; `nums` comme `set_grid`,
    /// `view` = `x0, y0, x1, y1, min_step, min_dot_step` (autre longueur : `BadGrid`). `null` : page inconnue ou grille
    /// invisible. Rien n'est écrit.
    #[allow(clippy::too_many_arguments)]
    pub fn grid_lines_of(
        &self,
        page: &str,
        visible: bool,
        snap: bool,
        above: bool,
        kinds: Vec<String>,
        colors: Vec<String>,
        lines: Vec<String>,
        nums: &[f64],
        view: &[f64],
    ) -> Result<JsValue, JsError> {
        let grid = grid_input(visible, snap, above, kinds, colors, lines, nums).map_err(cmd_err)?;
        match self.grid_lines_of_inner(page, &grid, view).map_err(cmd_err)? {
            Some(g) => to_js(&g),
            None => Ok(JsValue::NULL),
        }
    }
```

  Dans le bloc `impl Document` sans `wasm_bindgen` (après `set_grid_inner`) :

```rust
    /// Voir `grid_lines_of` ; `view` = `x0, y0, x1, y1, min_step, min_dot_step`.
    pub fn grid_lines_of_inner(
        &self,
        page: &str,
        grid: &GridInput,
        view: &[f64],
    ) -> Result<Option<GridLines>, CommandError> {
        let [x0, y0, x1, y1, min_step, min_dot_step] = view else {
            return Err(CommandError::BadGrid);
        };
        let rect = Bounds {
            x0: *x0,
            y0: *y0,
            x1: *x1,
            y1: *y1,
        };
        Ok(self
            .core
            .grid_lines_of(page, grid, rect, *min_step, *min_dot_step))
    }
```

- [ ] **Étape 10 : vert, format, lint, commit Rust.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo fmt --all && cargo clippy --workspace --all-targets -- -D warnings 2>&1 | tail -5 && cargo test --workspace 2>&1 | grep -E "FAILED|test result" | sort | uniq -c | tail -10
git add crates/roomboard-core/src/grid.rs crates/roomboard-core/src/document.rs crates/roomboard-core/src/commands.rs crates/roomboard-wasm/src/lib.rs
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(core): grid level lineWidth and grid_lines_of for unsaved grids" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Attendu : aucune ligne `FAILED`, seulement `test result: ok`.

- [ ] **Étape 11 : régénérer les deux modules Wasm de la page** (types de `wasm-core.ts`).

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm-formats && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm && grep -c "grid_lines_of" apps/web/src/wasm/roomboard_wasm.d.ts
```

  Attendu : un nombre ≥ 1.

- [ ] **Étape 12 : littéraux des tests TS (mécanique, attendus inchangés).**

```bash
cd "$WT" && sed -i -E 's/alpha: ([0-9.]+), segments/alpha: \1, lineWidth: 1, segments/g' apps/web/src/engine/render/grid-paint.test.ts apps/web/src/core/wasm-core.contract.test.ts && sed -i 's/line: "solid", snap: true, visible: true }/line: "solid", lineWidth: 1, snap: true, visible: true }/' apps/web/src/engine/tools/select.test.ts apps/web/src/engine/tools/shape.test.ts apps/web/src/core/fake-core.test.ts && grep -c "lineWidth: 1" apps/web/src/engine/render/grid-paint.test.ts apps/web/src/core/wasm-core.contract.test.ts apps/web/src/engine/tools/select.test.ts apps/web/src/engine/tools/shape.test.ts apps/web/src/core/fake-core.test.ts
```

  Puis, à la main, ajouter `lineWidth: 1,` après `line: "solid",` dans les aides multi-lignes : `gridLevel` de
  `wasm-core.contract.test.ts` (`:1102-1112`), `gridLevel` de `canvas2d.test.ts` (`:358-368`), `squares` de
  `fake-core.test.ts` (`:420-430`). Renommer le test « SetGrid écrit les neuf champs d'un niveau, jamais une clé en trop
  (HG8) » en « SetGrid écrit les dix champs d'un niveau, jamais une clé en trop (HG8) ».

- [ ] **Étape 13 : tests TS neufs (rouges).** Dans `wasm-core.contract.test.ts` : ajouter `gridArgs` à l'import de
  `./wasm-core`. Dans le premier test de « contrôle de forme C9 (grille) », ajouter :

```ts
    expect(() => toPageView({ ...page, grid: { ...g, levels: [{ ...gridLevel("squares", 40), lineWidth: "1" }] } })).toThrow("PageView invalide");
```

  Dans `it.each` de « contrôle de forme C9 (lignes de grille) », ajouter la ligne `["épaisseur qui n'est pas un nombre",
  { lineWidth: "2" }],` ; dans ce même `describe`, ajouter :

```ts
  it("gridArgs (E1) : sept nombres par niveau, sx, sy, ox, oy, snap, visible, lineWidth", () => {
    const g = gridOf([{ ...gridLevel("squares", 40, "#94a3b8"), originX: 5, snap: false, lineWidth: 3 }], true, true);
    const [visible, snap, above, kinds, colors, lines, nums] = gridArgs(g);
    expect([visible, snap, above, kinds, colors, lines]).toEqual([true, true, true, ["squares"], ["#94a3b8"], ["solid"]]);
    expect(Array.from(nums)).toEqual([40, 40, 5, 0, 0, 1, 3]);
  });
```

  À la fin du bloc `describe.each(c9Factories)("contrat C9 : $name", …)`, après le test « SetGrid (G2) : grille invalide
  sur une page inconnue → BadGrid d'abord, sans étape » :

```ts
  it("SetGrid (E1, S3) : lineWidth 2 écrit, relu, gardé par save puis load ; 0, 9 ou NaN refusés sans étape", () => {
    const d = f.blank();
    const p = first(d);
    unchanged(d, () => {
      for (const lineWidth of [0, 9, Number.NaN]) {
        expect(messageOf(() => setGrid(d, p, gridOf([{ ...gridLevel("squares", 40), lineWidth }])))).toBe(BAD_GRID);
      }
    });
    const g = gridOf([{ ...gridLevel("squares", 40, "#94a3b8"), lineWidth: 2 }]);
    setGrid(d, p, g);
    expect(d.page(p)?.grid).toEqual(g);
    expect(d.gridLines(p, { x0: 0, y0: 0, x1: 100, y1: 100 }, 4, 8)?.levels.map((l) => l.lineWidth)).toEqual([2]);
    const file = d.save(now, "0.1.0");
    const e = f.load(file);
    expect(e.page(p)?.grid).toEqual(g);
    expect(e.save(now, "0.1.0")).toEqual(file);
    e.free();
    d.free();
  });

  it("gridLinesOf (S3, DAE1) : mêmes lignes que gridLines après SetGrid de la même grille, sans étape ; page inconnue ou grille invisible → null", () => {
    const d = f.blank();
    const p = first(d);
    const g = gridOf([{ ...gridLevel("squares", 40, "#94a3b8"), lineWidth: 3 }]);
    const r = { x0: -13.3, y0: 1_000_007, x1: 786.7, y1: 1_000_607 };
    const v = d.version();
    const preview = d.gridLinesOf(p, g, r, 4, 8);
    expect(d.version()).toBe(v);
    expect(d.canUndo()).toBe(false);
    expect(d.page(p)?.grid).toBeNull();
    expect(preview?.levels.map((l) => l.lineWidth)).toEqual([3]);
    expect(d.gridLinesOf("nulle-part", g, r, 4, 8)).toBeNull();
    expect(d.gridLinesOf(p, { ...g, visible: false }, r, 4, 8)).toBeNull();
    setGrid(d, p, g);
    expect(d.gridLines(p, r, 4, 8)).toEqual(preview);
    d.free();
  });
```

  Dans « contrat C9 : vrai module seulement » :

```ts
  it("gridLinesOf (S3) : Seyès et points rendent les lignes de gridLines après SetGrid, épaisseur comprise", () => {
    const d = need().core.blank();
    const p = first(d);
    const g = gridOf([{ ...gridLevel("seyes", 30.24, "#94a3b8"), lineWidth: 2 }, { ...gridLevel("dots", 40), lineWidth: 4 }]);
    const r = { x0: 0, y0: 0, x1: 400, y1: 400 };
    const preview = d.gridLinesOf(p, g, r, 4, 8);
    expect(preview?.levels.map((l) => [l.alpha, l.lineWidth])).toEqual([[1, 2], [0.5, 2], [1, 4]]);
    setGrid(d, p, g);
    expect(d.gridLines(p, r, 4, 8)).toEqual(preview);
    d.free();
  });
```

  Dans `fake-core.test.ts`, bloc « grille de la fausse liaison (C9, G4) » :

```ts
  it("lineWidth (E1, Review Focus 1) : absent ou hors [1, 8] lu à 1, valeur brute gardée au save ; 2,5 gardé", () => {
    const base = { kind: "squares", spacingX: 40, spacingY: 40 };
    const levels = [base, { ...base, lineWidth: 0 }, { ...base, lineWidth: 9 }, { ...base, lineWidth: "2" }, { ...base, lineWidth: 2.5 }];
    const d = withGrid({ levels });
    expect(d.page(firstPage(d))?.grid?.levels.map((l) => l.lineWidth)).toEqual([1, 1, 1, 1, 2.5]);
    expect(saveJson(d).pages[0]?.["grid"]).toEqual({ levels });
  });

  it("gridLinesOf (DAE1) : carreaux du brouillon, rien d'écrit ; page inconnue → null", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    const g = { visible: true, snap: false, above: false, levels: [{ ...squares(40, 0), lineWidth: 3 }] };
    const v = d.version();
    const r = { x0: 0, y0: 0, x1: 100, y1: 100 };
    expect(d.gridLinesOf(p, g, r, 4, 8)?.levels.map((x) => [x.lineWidth, x.segments.length])).toEqual([[3, (3 + 3) * 4]]);
    expect(d.version()).toBe(v);
    expect(d.page(p)?.grid).toBeNull();
    expect(d.gridLinesOf("nulle-part", g, r, 4, 8)).toBeNull();
  });
```

  Dans `grid-paint.test.ts`, ajouter dans le `describe` :

```ts
  it("épaisseur du niveau (E1, S3) : lineWidth 3 à dpr 2 → 6 pixels physiques, lignes sur round(X) ; point 2·lineWidth·dpr", () => {
    const base = squares40().levels[0]!;
    const lines: GridLines = {
      above: false,
      levels: [{ ...base, lineWidth: 3 }, { color: "#000000", line: "solid", alpha: 1, lineWidth: 2, segments: [], dots: [40, 1_000_047] }],
    };
    const [main, dots] = alignedSegments(lines, far(1), 2, 2, 2);
    expect(main?.width).toBe(6);
    const { v, h } = split(main?.segments ?? []);
    expect(v).toEqual(Array.from({ length: 20 }, (_, i) => 27 + 80 * i));
    expect(h).toEqual(Array.from({ length: 15 }, (_, k) => 66 + 80 * k));
    expect(dots?.width).toBe(4);
    expect(dots?.dot).toBe(8);
    expect(alignedSegments(squares40(), far(1), 2, 2, 2)[0]?.width).toBe(2);
    expect([lineWidthPx(1.25, 3), lineWidthPx(1), dotSizePx(1, 1), dotSizePx(1.25, 3)]).toEqual([4, 1, 2, 8]);
  });
```

  Dans `canvas2d.test.ts`, bloc « Canvas2DRenderer — grille (C9) » :

```ts
  it("épaisseur du niveau (E1) : lineWidth 3 à dpr 1 → trait de 3 pixels", () => {
    const scene = gridScene(1, 1, [{ ...gridLevel("squares", 40, "#7b68ee"), lineWidth: 3 }]);
    expect(scene.log).toContain("stroke #7b68ee 3");
  });
```

  Voir rouge :

```bash
cd "$WT" && ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts src/core/fake-core.test.ts src/engine/render/grid-paint.test.ts src/engine/render/canvas2d.test.ts 2>&1 | grep -E "FAIL|Tests " | head -20
```

  Attendu : des `FAIL` (`gridLinesOf is not a function`, `PageView invalide`, épaisseur 1 au lieu de 3).

- [ ] **Étape 14 : `api.ts`.** En tête, après la ligne « C9 : SetGrid … », ajouter :
  `// C9 éditeur : GridLevel.lineWidth et LevelLines.lineWidth (px CSS d'écran, 1 à 8) ; gridLinesOf (grille non enregistrée, aperçu, DAE1).`
  Dans `GridLevel`, après `readonly line: string;` :

```ts
  /** Épaisseur en pixels CSS d'écran, 1 à 8 (E1) ; absente ou hors bornes à la lecture : 1. */
  readonly lineWidth: number;
```

  Dans `LevelLines`, après `readonly alpha: number;` : `/** Épaisseur du niveau, en pixels CSS d'écran (E1). */ readonly lineWidth: number;`.
  Après `DEFAULT_GRID_COLOR` :

```ts
/** Épaisseur d'un niveau (E1), en pixels CSS d'écran : défaut, puis bornes de l'écriture. */
export const DEFAULT_GRID_LINE_WIDTH = 1;
export const MIN_GRID_LINE_WIDTH = 1;
export const MAX_GRID_LINE_WIDTH = 8;
```

  À la fin de `CoreDocument`, après `gridLines(...)` :

```ts
  /** Lignes d'une grille non enregistrée sur la page (C9 éditeur, DAE1) : même calcul que gridLines ; null si la page est
   *  inconnue ou la grille invisible. Rien n'est écrit. */
  gridLinesOf(page: string, grid: GridView, rect: Bounds, minStep: number, minDotStep: number): GridLines | null;
```

- [ ] **Étape 15 : `wasm-core.ts`.** `toGridLevel` : ajouter `lineWidth` à la déstructuration, `typeof lineWidth !==
  "number" ||` au test, et au retour. `toGridLines` : idem (`lineWidth` contrôlé et rendu). Avant la classe :

```ts
/** Arguments de grille de `set_grid` et `grid_lines_of` (G12, E1) : têtes, kinds, couleurs, traits, puis sept nombres par
 *  niveau `sx, sy, ox, oy, snap, visible, lineWidth` (booléens en 0 ou 1) ; les valeurs sont contrôlées par le cœur. */
export function gridArgs(g: GridView): [boolean, boolean, boolean, string[], string[], string[], Float64Array] {
  const nums = new Float64Array(
    g.levels.flatMap((l) => [l.spacingX, l.spacingY, l.originX, l.originY, l.snap ? 1 : 0, l.visible ? 1 : 0, l.lineWidth]),
  );
  return [g.visible, g.snap, g.above, g.levels.map((l) => l.kind), g.levels.map((l) => l.color), g.levels.map((l) => l.line), nums];
}
```

  Bras `SetGrid` :

```ts
      case "SetGrid": {
        const g = cmd.grid;
        if (g === null) return toChange(this.d.clear_grid(cmd.page));
        return toChange(this.d.set_grid(cmd.page, ...gridArgs(g)));
      }
```

  Après `gridLines(...)` de la classe :

```ts
  gridLinesOf(page: string, grid: GridView, r: Bounds, minStep: number, minDotStep: number): GridLines | null {
    const view = new Float64Array([r.x0, r.y0, r.x1, r.y1, minStep, minDotStep]);
    return toGridLines(this.d.grid_lines_of(page, ...gridArgs(grid), view));
  }
```

- [ ] **Étape 16 : `fake-core.ts`.** En-tête : la ligne DAG3 devient « `snapPoint`, `snapDelta`, `gridLines` et
  `gridLinesOf` ne connaissent que le kind `squares` ». Import des valeurs : ajouter `DEFAULT_GRID_LINE_WIDTH,
  MAX_GRID_LINE_WIDTH, MIN_GRID_LINE_WIDTH`. Après `nonEmpty` :

```ts
/** Épaisseur acceptable (E1) : nombre fini dans [1, 8], comme `grid::line_width_ok`. */
const lineWidthOk = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= MIN_GRID_LINE_WIDTH && v <= MAX_GRID_LINE_WIDTH;
```

  `gridLevelView` : déstructurer `lineWidth`, et ajouter `lineWidth: lineWidthOk(lineWidth) ? lineWidth : DEFAULT_GRID_LINE_WIDTH,`
  après `line`. `LEVEL_KEYS` : ajouter `"lineWidth"` après `"line"`. `validGrid` : ajouter `&& lineWidthOk(l.lineWidth)`.
  `gridRecord` : doc « les dix champs », ajouter `lineWidth: l.lineWidth,` après `line`. `squaresLines` : la poussée
  devient `levels.push({ color: l.color, line: l.line, alpha: 1, lineWidth: l.lineWidth, segments, dots: [] });`. Après
  `gridLines(...)` de la classe :

```ts
  gridLinesOf(page: string, grid: GridView, rect: Bounds, minStep: number, minDotStep: number): GridLines | null {
    void minDotStep; // points : vrai module seulement (DAG3)
    if (!this.state.pages.some((q) => q.id === page)) return null;
    return squaresLines(grid, PAGE_WIDTH, rect, minStep);
  }
```

- [ ] **Étape 17 : `grid-paint.ts`.** En-tête : « épaisseur `max(1, round(lineWidth·dpr))` pixels physiques (`lineWidth` du
  niveau, pixels CSS d'écran, E1 ; 1 par défaut, soit un pixel CSS à tout zoom) ; point = carré de
  `max(2, round(2·lineWidth·dpr))` pixels ». Remplacer `:39-40` par :

```ts
export const lineWidthPx = (dpr: number, lineWidth = 1): number => Math.max(1, Math.round(lineWidth * dpr));
export const dotSizePx = (dpr: number, lineWidth = 1): number => Math.max(2, Math.round(2 * lineWidth * dpr));
```

  Dans `alignedSegments`, retirer `const width = lineWidthPx(dpr);` et `const dot = dotSizePx(dpr);` du haut, et les
  poser en tête du `lines.levels.map((l) => { … })` : `const width = lineWidthPx(dpr, l.lineWidth);` et
  `const dot = dotSizePx(dpr, l.lineWidth);`.

- [ ] **Étape 18 : vert, `tsc`, suite web, commit TS.**

```bash
cd "$WT" && ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts src/core/fake-core.test.ts src/engine/render/grid-paint.test.ts src/engine/render/canvas2d.test.ts --reporter=verbose 2>&1 | grep -E "gridLinesOf|lineWidth|gridArgs|épaisseur|S5|Test Files|Tests " | head -30
cd "$WT" && pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20
cd "$WT" && ROOMBOARD_WASM_REQUIRED=1 pnpm -r test 2>&1 | tail -20
git add apps/web/src/core/api.ts apps/web/src/core/wasm-core.ts apps/web/src/core/fake-core.ts apps/web/src/core/wasm-core.contract.test.ts apps/web/src/core/fake-core.test.ts apps/web/src/engine/render/grid-paint.ts apps/web/src/engine/render/grid-paint.test.ts apps/web/src/engine/render/canvas2d.test.ts apps/web/src/engine/tools/select.test.ts apps/web/src/engine/tools/shape.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(web): grid lineWidth and gridLinesOf on both bindings, painted per level" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Attendu : `Test Files  4 passed`, `tsc` sans sortie, suite web 0 échec.

---

<a id="tache-t2"></a>
### Tâche T2 — Cache des lignes de grille (`grid-cache.ts`) tenu par `Canvas2DRenderer`

**Objectif.** Le rendu ne demande plus les lignes au cœur à chaque redessin : `GridLinesCache` garde le résultat du cœur
pour un rectangle élargi autour de la vue et ne recalcule que si la page change, le zoom change (égalité stricte),
`resize` est appelé, la vue sort du rectangle gardé, ou `invalidate(change)` reçoit `full` ou un `change.pages` qui
contient la page gardée. Avant de peindre, les lignes sont recoupées à la vue (`visibleLines`) : `paintGrid` reçoit
exactement ce qu'il recevait sans cache. Cadrage : E3 ; scénario S4 ; effet de bord 3.

**Fichiers.**
- Créer : `apps/web/src/engine/render/grid-cache.ts`, `apps/web/src/engine/render/grid-cache.test.ts`.
- Modifier : `apps/web/src/engine/render/canvas2d.ts` (`:1-13` en-tête et imports, `:145-148` champs, `:170-182`
  `resize`, `:207-212` `gridOf`, `:306-316` `invalidate`).
- Test : `apps/web/src/engine/render/canvas2d.test.ts` (imports, bloc neuf après « Canvas2DRenderer — grille (C9) »).

**Interfaces.**
- Consomme (T1) : `LevelLines.lineWidth: number` ; `CoreDocument.gridLines(page: string, rect: Bounds, minStep: number,
  minDotStep: number): GridLines | null` (inchangée) ; `NO_CHANGE`, `MAX_GRID_DOTS` de `core/api.ts`.
- Produit (`engine/render/grid-cache.ts`) :
  `export type GridCompute = (page: string, rect: Bounds, minStep: number, minDotStep: number) => GridLines | null;`
  `export const EDGE_EPS = 1e-6;`
  `export function cacheMargin(viewW: number, viewH: number, zoom: number, pageWidth: number): number;` (pixels CSS)
  `export function cacheRect(visible: Bounds, zoom: number, pageWidth: number): Bounds;`
  `export function visibleLines(lines: GridLines, visible: Bounds): GridLines;`
  `export class GridLinesCache { constructor(compute: GridCompute); get(page: string, visible: Bounds, zoom: number,
  pageWidth: number): GridLines | null; clear(): void; invalidate(change: Change): void }`.
- Produit (`Canvas2DRenderer`, privé, utilisé par T3) : champ `private readonly gridCache: GridLinesCache` dont la
  fonction de calcul est une flèche `(page, rect, minStep, minDotStep) => …` (T3 la redirige vers `computeGrid`).
- Réutilise : `apps/web/src/engine/render/canvas2d.ts:145-147`, `:306` (`paths`, `textLines`, `invalidate`) — même
  patron (cache vidé par `Change`), appelé depuis `invalidate` (réutiliser).
- Réutilise : `apps/web/src/engine/page.ts:29` (`visibleGridRect`) — appelée par `gridOf`, inchangée (réutiliser).
- Nouveau module (aucun existant, cadrage § 3) : `engine/render/grid-cache.ts`, interface ci-dessus.

**Test et commande bornée.**
- `cd "$WT" && pnpm --filter @roomboard/web exec vitest run src/engine/render/grid-cache.test.ts src/engine/render/canvas2d.test.ts --reporter=verbose 2>&1 | grep -E "S4|E3|bord|S5|Test Files|Tests " | head -30`
  → « S4 : dix images de même caméra → un seul appel au cœur », « S4 : défilement de 50 px », « S4 : vues jusqu'à
  3840 × 2160 », « ligne posée sur un bord de la vue : gardée », « S4 : ligne sur le haut de la vue après défilement »,
  et les deux tests S5 existants (« grille (C9, S5 a) », « grille (C9, S5) : tout zoom ») en ✓ ; `Test Files  2 passed`.
- `cd "$WT" && pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20` → vide.
- `cd "$WT" && pnpm --filter @roomboard/web test 2>&1 | tail -20` → 0 échec (dont `webgl2.test.ts`, `engine.test.ts`).

**Preuve visuelle.** Aucune (la grille peinte est la même ; prouvé par l'égalité des segments avec un rendu sans cache).

**Contraintes (recopiées de Global Constraints).**
- CG1 TDD : chaque comportement commence par son test, lancé et vu rouge, puis le code minimal, puis vert.
- CG2 Preuve bornée : chaque commande commence par `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ;
  commandes du profil ; sorties coupées ; échec = `test result: FAILED`, `error[`, `FAIL `, ou code non nul.
- CG3 Aucun build Tauri ni Android.
- CG4 Aucune dépendance ajoutée ; jamais de GPL, AGPL, LGPL.
- CG5 Aucun seuil changé (`MAX_GRID_DOTS`, bornes 202 et 152) ; aucun test désactivé ou sauté ; les tests S5 de
  `canvas2d.test.ts` restent tels quels.
- CG6 Jamais `git add -A`, `git add .`, `git commit -a` ; aucun push, aucun tag.
- CG7 Commits auteur et committeur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- CG8 Test échoué sur un délai : rejoué une fois.
- CG10 Seulement les fichiers de la tâche ; aucun fichier de C10a.
- CG11 Rapport en français, avec les lignes `Réutilisation : …`.

**Interdits.** Toucher à `grid-paint.ts`, `renderer.ts`, `webgl2.ts`, `engine.ts` (aperçu : T3) ; changer les tests S5 ;
garder plus d'une entrée de cache (une page, un zoom à la fois suffit) ; arrondir ou décaler les lignes dans le cache.

**Patron à ne pas reprendre (concepteur-critique).**
- Mémoriser sur la clé exacte `(page, rect, zoom)` : chaque image d'un défilement change `rect`
  (`apps/web/src/engine/render/canvas2d.ts:207-212`, `apps/web/src/engine/page.ts:29-35`), le cache ne servirait jamais
  pendant un défilement. Garder un rectangle **élargi** et tester l'inclusion de la vue.
- Peindre les lignes du rectangle élargi sans les recouper : `paintGrid` recevrait plus de segments, aux bouts hors vue ;
  les bornes 202 et 152 de `apps/web/src/engine/render/canvas2d.test.ts:415-438` tomberaient. Recouper à la vue, en
  bornant verticales et horizontales (valeurs exactes) et en recoupant les obliques.
- Vider le cache seulement sur `full` : un `SetGrid` non annulé arrive avec `full: false` et `pages: [p]`
  (`crates/roomboard-core/src/commands.rs:2786-2803`, test `set_grid_is_one_step_then_undo_redo`) ; la grille resterait périmée.
- Chemin de référence (patron du cache vidé par `Change`) : `apps/web/src/engine/render/canvas2d.ts:145-148` et
  `:306-316`.

**Terminé quand.** Commandes de preuve vertes, `tsc` vide, un commit.

**Rapport.** Tests ajoutés et sortie ; `Réutilisation : appelé visibleGridRect (page.ts)`, `Réutilisation : appelé patron
invalidate (canvas2d.ts)` ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (installation, deux modules Wasm : `tsc` en a besoin).

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm install --frozen-lockfile 2>&1 | tail -3 && cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm-formats && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm
```

- [ ] **Étape 2 : écrire `grid-cache.test.ts` (rouge : module absent).**

```ts
import { describe, expect, it, vi } from "vitest";
import { MAX_GRID_DOTS, NO_CHANGE, type Bounds, type GridLines } from "../../core/api";
import { cacheMargin, cacheRect, GridLinesCache, visibleLines } from "./grid-cache";
import { MIN_DOT_PX } from "./grid-paint";

const V: Bounds = { x0: 0, y0: 1000, x1: 800, y1: 1600 };
const one = (segments: number[], dots: number[] = []): GridLines => ({
  above: true,
  levels: [{ color: "#000000", line: "solid", alpha: 1, lineWidth: 1, segments, dots }],
});

describe("rectangle gardé (E3, S4)", () => {
  it("S4, Review Focus 3 : vues jusqu'à 3840 × 2160, tout zoom : le rectangle gardé tient sous MAX_GRID_DOTS au pas minimal ; vue seule au-delà : marge 0", () => {
    for (const [w, h] of [[800, 600], [1280, 720], [1920, 1080], [3840, 2160]] as const) {
      for (const z of [0.15, 0.37, 1, 2.5, 8]) {
        const v = { x0: 0, y0: 5000, x1: w / z, y1: 5000 + h / z };
        const r = cacheRect(v, z, 1920);
        const dots = (b: Bounds): number => (((Math.min(b.x1, 1920) - b.x0) * z) / MIN_DOT_PX + 1) * (((b.y1 - b.y0) * z) / MIN_DOT_PX + 1);
        expect(r.x0 <= v.x0 && r.y0 <= v.y0 && r.x1 >= v.x1 && r.y1 >= v.y1, `${w}×${h} z=${z}`).toBe(true);
        expect(r.y1 - v.y1).toBeLessThanOrEqual(h / 2 / z + 1e-9);
        if (dots(v) <= MAX_GRID_DOTS) expect(dots(r), `${w}×${h} z=${z}`).toBeLessThanOrEqual(MAX_GRID_DOTS);
        else expect(r).toEqual(v);
      }
    }
  });

  it("marge : une demi-hauteur de vue quand elle tient (786,7 × 600 à z = 1 : 300 px) ; vue vide : 0", () => {
    expect(cacheMargin(786.7, 600, 1, 1920)).toBe(300);
    expect(cacheMargin(0, 0, 1, 1920)).toBe(0);
  });
});

describe("visibleLines (E3)", () => {
  it("verticales et horizontales bornées à la vue, valeurs exactes ; hors vue retirées ; above gardé", () => {
    const lines = one([0, 400, 0, 2200, 40, 400, 40, 2200, 900, 400, 900, 2200, 0, 1040, 1920, 1040, 0, 1700, 1920, 1700]);
    expect(visibleLines(lines, V)).toEqual(one([0, 1000, 0, 1600, 40, 1000, 40, 1600, 0, 1040, 800, 1040]));
  });

  it("ligne posée sur un bord de la vue : gardée (Review Focus 2)", () => {
    expect(visibleLines(one([800, 400, 800, 2200, 0, 1000, 1920, 1000]), V)).toEqual(one([800, 1000, 800, 1600, 0, 1000, 800, 1000]));
  });

  it("oblique recoupée (Liang-Barsky) ; points hors vue retirés ; groupe vidé retiré", () => {
    const iso: GridLines = {
      above: false,
      levels: [
        { color: "#111111", line: "solid", alpha: 1, lineWidth: 2, segments: [0, 900, 1000, 1900], dots: [] },
        { color: "#222222", line: "solid", alpha: 1, lineWidth: 1, segments: [], dots: [10, 1010, 900, 1010, 10, 2000] },
        { color: "#333333", line: "solid", alpha: 0.5, lineWidth: 1, segments: [900, 0, 900, 50], dots: [] },
      ],
    };
    const out = visibleLines(iso, V);
    expect(out.levels.map((l) => [l.color, l.lineWidth])).toEqual([["#111111", 2], ["#222222", 1]]);
    // y = x + 900 : entre dans V en (100, 1000), en sort en (700, 1600).
    expect(out.levels[0]!.segments.map((v) => Math.round(v * 1e6) / 1e6)).toEqual([100, 1000, 700, 1600]);
    expect(out.levels[1]!.dots).toEqual([10, 1010]);
  });
});

describe("GridLinesCache (E3, S4)", () => {
  const setup = () => {
    const compute = vi.fn((_page: string, r: Bounds, _minStep: number, _minDotStep: number): GridLines | null => one([0, r.y0, 0, r.y1]));
    return { compute, cache: new GridLinesCache(compute) };
  };
  const at = (dy: number): Bounds => ({ x0: 0, y0: 1000 + dy, x1: 800, y1: 1600 + dy });

  it("S4 : même vue → 1 appel ; défilement dans la marge → 1 ; au-delà → 2 ; zoom → 3 ; page → 4", () => {
    const { compute, cache } = setup();
    for (let i = 0; i < 10; i++) cache.get("p", at(0), 1, 1920);
    expect(compute).toHaveBeenCalledTimes(1);
    expect(compute.mock.calls[0]?.slice(2)).toEqual([4, 8]);
    expect(cache.get("p", at(50), 1, 1920)).toEqual(one([0, 1050, 0, 1650]));
    expect(compute).toHaveBeenCalledTimes(1);
    cache.get("p", at(400), 1, 1920);
    expect(compute).toHaveBeenCalledTimes(2);
    cache.get("p", at(400), 2, 1920);
    expect(compute).toHaveBeenCalledTimes(3);
    expect(compute.mock.calls[2]?.slice(2)).toEqual([2, 4]);
    cache.get("q", at(400), 2, 1920);
    expect(compute).toHaveBeenCalledTimes(4);
  });

  it("invalidate : autre page → rien ; la page ou full → recalcul ; clear → recalcul", () => {
    const { compute, cache } = setup();
    cache.get("p", at(0), 1, 1920);
    cache.invalidate({ ...NO_CHANGE, pages: ["q"] });
    cache.get("p", at(0), 1, 1920);
    expect(compute).toHaveBeenCalledTimes(1);
    cache.invalidate({ ...NO_CHANGE, pages: ["p"] });
    cache.get("p", at(0), 1, 1920);
    expect(compute).toHaveBeenCalledTimes(2);
    cache.invalidate({ ...NO_CHANGE, full: true });
    cache.get("p", at(0), 1, 1920);
    expect(compute).toHaveBeenCalledTimes(3);
    cache.clear();
    cache.get("p", at(0), 1, 1920);
    expect(compute).toHaveBeenCalledTimes(4);
  });

  it("page sans grille : null gardé aussi (aucun appel par image)", () => {
    const compute = vi.fn(() => null);
    const cache = new GridLinesCache(compute);
    expect(cache.get("p", at(0), 1, 1920)).toBeNull();
    expect(cache.get("p", at(10), 1, 1920)).toBeNull();
    expect(compute).toHaveBeenCalledTimes(1);
  });
});
```

  Voir rouge : `cd "$WT" && pnpm --filter @roomboard/web exec vitest run src/engine/render/grid-cache.test.ts 2>&1 | tail -8`
  → `FAIL` (`Failed to resolve import "./grid-cache"`).

- [ ] **Étape 3 : écrire `grid-cache.ts`.**

```ts
/**
 * Cache des lignes de grille (C9 éditeur, E3 ; reste d'OD48). Le cœur calcule les lignes d'un rectangle élargi autour de
 * la vue ; tant que la vue reste dedans, à même page et même zoom, aucun appel au cœur : les lignes gardées sont recoupées
 * à la vue (`visibleLines`), si bien que `paintGrid` reçoit ce qu'il recevait sans cache. Vidé par `clear` (resize,
 * aperçu) et par `invalidate` (`full`, ou `pages` qui contient la page gardée), comme `paths` et `textLines` de
 * `canvas2d.ts`. Une seule entrée : une page, un zoom.
 */
import { MAX_GRID_DOTS, type Bounds, type Change, type GridLines, type LevelLines } from "../../core/api";
import { MIN_DOT_PX, MIN_GRID_PX } from "./grid-paint";

/** Calcul des lignes par le cœur (ou l'aperçu) pour un rectangle monde. */
export type GridCompute = (page: string, rect: Bounds, minStep: number, minDotStep: number) => GridLines | null;

/** Tolérance de recoupe, en unités de page : une ligne posée sur un bord de la vue reste dedans (comme `EPS` du cœur). */
export const EDGE_EPS = 1e-6;

/**
 * Marge du rectangle gardé, en pixels CSS : la plus grande, au plus une demi-hauteur de vue, qui garde
 * `(cw / MIN_DOT_PX + 1)·(ch / MIN_DOT_PX + 1) ≤ MAX_GRID_DOTS` (cw borné à la largeur de page × zoom) : aucun niveau de
 * points n'est sauté à cause de la marge ; 0 si la vue seule dépasse.
 */
export function cacheMargin(viewW: number, viewH: number, zoom: number, pageWidth: number): number {
  const fits = (m: number): boolean => {
    const cw = Math.min(viewW + 2 * m, pageWidth * zoom);
    const ch = viewH + 2 * m;
    return (cw / MIN_DOT_PX + 1) * (ch / MIN_DOT_PX + 1) <= MAX_GRID_DOTS;
  };
  const max = viewH / 2;
  if (!(max > 0) || !fits(0)) return 0;
  if (fits(max)) return max;
  let lo = 0;
  let hi = max;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Rectangle gardé : la vue élargie de `cacheMargin` de chaque côté (en monde), ramenée à x ≥ 0 et y ≥ 0. */
export function cacheRect(visible: Bounds, zoom: number, pageWidth: number): Bounds {
  const m = cacheMargin((visible.x1 - visible.x0) * zoom, (visible.y1 - visible.y0) * zoom, zoom, pageWidth) / zoom;
  return { x0: Math.max(0, visible.x0 - m), y0: Math.max(0, visible.y0 - m), x1: visible.x1 + m, y1: visible.y1 + m };
}

const inside = (v: number, lo: number, hi: number): boolean => v >= lo - EDGE_EPS && v <= hi + EDGE_EPS;
const contains = (outer: Bounds, inner: Bounds): boolean =>
  inner.x0 >= outer.x0 && inner.y0 >= outer.y0 && inner.x1 <= outer.x1 && inner.y1 <= outer.y1;

/** Segment recoupé à `v` : verticale et horizontale par simple bornage (valeurs exactes, celles que le cœur rendrait pour
 *  la vue), oblique par Liang-Barsky ; null s'il sort de la vue. */
function clipSegment(x0: number, y0: number, x1: number, y1: number, v: Bounds): readonly [number, number, number, number] | null {
  if (x0 === x1) {
    if (!inside(x0, v.x0, v.x1)) return null;
    const a = Math.max(Math.min(y0, y1), v.y0);
    const b = Math.min(Math.max(y0, y1), v.y1);
    return a <= b ? [x0, a, x1, b] : null;
  }
  if (y0 === y1) {
    if (!inside(y0, v.y0, v.y1)) return null;
    const a = Math.max(Math.min(x0, x1), v.x0);
    const b = Math.min(Math.max(x0, x1), v.x1);
    return a <= b ? [a, y0, b, y1] : null;
  }
  const dx = x1 - x0;
  const dy = y1 - y0;
  let t0 = 0;
  let t1 = 1;
  const sides: readonly (readonly [number, number])[] = [
    [-dx, x0 - v.x0],
    [dx, v.x1 - x0],
    [-dy, y0 - v.y0],
    [dy, v.y1 - y0],
  ];
  for (const [p, q] of sides) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
  }
  return t0 < t1 ? [x0 + t0 * dx, y0 + t0 * dy, x0 + t1 * dx, y0 + t1 * dy] : null;
}

/** Lignes recoupées à la vue ; un groupe qui n'y a ni segment ni point disparaît (le cœur ne le rendrait pas). */
export function visibleLines(lines: GridLines, visible: Bounds): GridLines {
  const levels: LevelLines[] = [];
  for (const l of lines.levels) {
    const segments: number[] = [];
    for (let i = 0; i + 3 < l.segments.length; i += 4) {
      const s = clipSegment(l.segments[i] ?? 0, l.segments[i + 1] ?? 0, l.segments[i + 2] ?? 0, l.segments[i + 3] ?? 0, visible);
      if (s !== null) segments.push(...s);
    }
    const dots: number[] = [];
    for (let i = 0; i + 1 < l.dots.length; i += 2) {
      const x = l.dots[i] ?? 0;
      const y = l.dots[i + 1] ?? 0;
      if (inside(x, visible.x0, visible.x1) && inside(y, visible.y0, visible.y1)) dots.push(x, y);
    }
    if (segments.length > 0 || dots.length > 0) levels.push({ ...l, segments, dots });
  }
  return { above: lines.above, levels };
}

interface Entry {
  readonly page: string;
  readonly zoom: number;
  readonly rect: Bounds;
  readonly lines: GridLines | null;
}

export class GridLinesCache {
  private entry: Entry | null = null;

  constructor(private readonly compute: GridCompute) {}

  /** Lignes de `page` dans `visible` (monde) au zoom donné ; un appel à `compute` seulement hors de l'entrée gardée. */
  get(page: string, visible: Bounds, zoom: number, pageWidth: number): GridLines | null {
    let e = this.entry;
    if (e === null || e.page !== page || e.zoom !== zoom || !contains(e.rect, visible)) {
      const rect = cacheRect(visible, zoom, pageWidth);
      e = { page, zoom, rect, lines: this.compute(page, rect, MIN_GRID_PX / zoom, MIN_DOT_PX / zoom) };
      this.entry = e;
    }
    return e.lines === null ? null : visibleLines(e.lines, visible);
  }

  clear(): void {
    this.entry = null;
  }

  /** `full`, ou la page gardée dans `pages` : l'entrée est oubliée. */
  invalidate(change: Change): void {
    if (this.entry !== null && (change.full || change.pages.includes(this.entry.page))) this.entry = null;
  }
}
```

  Voir vert : `pnpm --filter @roomboard/web exec vitest run src/engine/render/grid-cache.test.ts 2>&1 | tail -6` →
  `Tests  8 passed`.

- [ ] **Étape 4 : tests de `canvas2d.test.ts` (rouges).** Imports : `import type { Bounds, CoreDocument, ElementView,
  GridInput, GridLevel, TextElement } from "../../core/api";`, `import { NO_CHANGE } from "../../core/api";`,
  `import { IDENTITY, type Camera } from "../camera";`, `import { PAGE_BACKGROUND, SURROUND_COLOR, visibleGridRect } from "../page";`,
  `import { MIN_DOT_PX, MIN_GRID_PX, paintGrid } from "./grid-paint";`. Après le bloc « Canvas2DRenderer — grille (C9) » :

```ts
/** Scène dont la source compte les appels de gridLines (S4) : vue 800 × 600 CSS, dpr 1, caméra S5 descendue de `dy` px. */
function cachedScene(levels: GridLevel[] = [gridLevel("squares", 40, "#7b68ee")]) {
  const doc = fakeCore.blank();
  const p = doc.pageIds()[0] ?? "";
  doc.apply({ type: "SetGrid", page: p, grid: gridOf(levels) });
  const gridLines = vi.fn((page: string, rect: Bounds, minStep: number, minDotStep: number) => doc.gridLines(page, rect, minStep, minDotStep));
  const src: SceneSource = { element: (id) => doc.element(id), outline: (id) => doc.outline(id), gridLines };
  const scene = new FakeCtx();
  const r = new Canvas2DRenderer(asCtx(scene), null, src, { makePath: () => new FakePath() as unknown as Path2D });
  r.resize(800, 600, 1);
  const cam = (dy = 0, zoom = 1): Camera => ({ zoom, tx: 13.3, ty: -1_000_007 * zoom - dy });
  const draw = (c: Camera, page = p): void => {
    scene.path.length = 0;
    scene.log.length = 0;
    r.drawScene({ id: page, elementIds: [] }, c, new Set());
  };
  return { doc, p, r, scene, gridLines, cam, draw };
}

/** Segments d'un rendu sans cache : lignes du cœur pour la seule vue, peintes directement. */
function uncached(doc: CoreDocument, p: string, c: Camera): { v: number[]; h: number[] } {
  const f = new FakeCtx();
  const rect = visibleGridRect(c, 800, 600);
  const lines = rect ? doc.gridLines(p, rect, MIN_GRID_PX / c.zoom, MIN_DOT_PX / c.zoom) : null;
  if (lines) paintGrid(asCtx(f), lines, c, 1, 1, 1);
  return gridSegments(f);
}

describe("Canvas2DRenderer — cache de la grille (C9 éditeur, E3, S4)", () => {
  it("S4 : dix images de même caméra → un seul appel au cœur", () => {
    const { gridLines, cam, draw } = cachedScene();
    for (let i = 0; i < 10; i++) draw(cam());
    expect(gridLines).toHaveBeenCalledTimes(1);
  });

  it("S4 : défilement de 50 px → toujours un appel, segments d'un rendu sans cache ; au-delà de la marge → 2 ; zoom → 3", () => {
    const { doc, p, scene, gridLines, cam, draw } = cachedScene();
    draw(cam());
    draw(cam(50));
    expect(gridLines).toHaveBeenCalledTimes(1);
    expect(gridSegments(scene)).toEqual(uncached(doc, p, cam(50)));
    draw(cam(400));
    expect(gridLines).toHaveBeenCalledTimes(2);
    expect(gridSegments(scene)).toEqual(uncached(doc, p, cam(400)));
    draw(cam(400, 1.25));
    expect(gridLines).toHaveBeenCalledTimes(3);
    expect(gridSegments(scene)).toEqual(uncached(doc, p, cam(400, 1.25)));
  });

  it("S4, Review Focus 2 : ligne sur le haut de la vue après défilement : présente, comme sans cache", () => {
    const { doc, p, scene, gridLines, cam, draw } = cachedScene();
    draw(cam());
    draw(cam(33)); // haut de vue à y = 1 000 040, une ligne
    expect(gridLines).toHaveBeenCalledTimes(1);
    const segs = gridSegments(scene);
    expect(segs).toEqual(uncached(doc, p, cam(33)));
    expect(segs.h[0]).toBe(0.5);
  });

  it("S4 : invalidate d'une autre page → aucun appel ; de la page ou full → un appel neuf ; resize → un appel neuf", () => {
    const { p, r, gridLines, cam, draw } = cachedScene();
    draw(cam());
    r.invalidate({ ...NO_CHANGE, pages: ["autre"] });
    draw(cam());
    expect(gridLines).toHaveBeenCalledTimes(1);
    r.invalidate({ ...NO_CHANGE, pages: [p] });
    draw(cam());
    expect(gridLines).toHaveBeenCalledTimes(2);
    r.invalidate({ ...NO_CHANGE, full: true });
    draw(cam());
    expect(gridLines).toHaveBeenCalledTimes(3);
    r.resize(800, 600, 1);
    draw(cam());
    expect(gridLines).toHaveBeenCalledTimes(4);
  });

  it("S4 : SetGrid puis invalidate : les lignes peintes suivent la nouvelle grille ; page changée : un appel, null gardé", () => {
    const { doc, p, r, scene, gridLines, cam, draw } = cachedScene();
    draw(cam());
    r.invalidate(doc.apply({ type: "SetGrid", page: p, grid: gridOf([gridLevel("squares", 80, "#7b68ee")]) }));
    draw(cam());
    expect(gridSegments(scene)).toEqual(uncached(doc, p, cam()));
    expect(gridSegments(scene).v.length).toBe(10);
    const q = doc.apply({ type: "AddPage", after: p }).pages[0] ?? "";
    const before = gridLines.mock.calls.length;
    draw(cam(), q);
    draw(cam(), q);
    expect(gridLines.mock.calls.length).toBe(before + 1);
    expect(scene.log.filter((l) => l.startsWith("stroke"))).toEqual([]);
  });
});
```

  `h[0]` vaut 0,5 : haut de vue à y = 1 000 040 → pixel 0, épaisseur 1 → `round(0) + 0,5`. Voir rouge :
  `pnpm --filter @roomboard/web exec vitest run src/engine/render/canvas2d.test.ts 2>&1 | grep -E "FAIL|Tests " | head`
  → les tests « S4 : dix images… », « invalidate… » échouent (10 appels, pas 1).

- [ ] **Étape 5 : `canvas2d.ts`.** En-tête : ajouter « lignes de grille gardées par `GridLinesCache` (C9 éditeur, E3) ».
  Import : `import { paintGrid } from "./grid-paint";` (retirer `MIN_DOT_PX`, `MIN_GRID_PX`) et
  `import { GridLinesCache } from "./grid-cache";`. Après le champ `textLines` :

```ts
  /** Lignes de grille gardées (E3) : recalculées sur page, zoom, `resize`, sortie du rectangle gardé ou `Change`. */
  private readonly gridCache = new GridLinesCache((page, rect, minStep, minDotStep) => this.source.gridLines?.(page, rect, minStep, minDotStep) ?? null);
```

  `resize` : dernière ligne `this.gridCache.clear();`. `gridOf` :

```ts
  /** Lignes visibles de la grille de la page (G9), servies par le cache (E3) ; null sans source, sans grille ou hors page. */
  private gridOf(page: string, camera: Camera): GridLines | null {
    const rect = visibleGridRect(camera, this.cssWidth, this.cssHeight);
    if (!rect) return null;
    return this.gridCache.get(page, rect, camera.zoom, PAGE_WIDTH);
  }
```

  `invalidate` : première ligne `this.gridCache.invalidate(change);` (avant le `if (change.full)`).

- [ ] **Étape 6 : vert, `tsc`, suite web, commit.**

```bash
cd "$WT" && pnpm --filter @roomboard/web exec vitest run src/engine/render/grid-cache.test.ts src/engine/render/canvas2d.test.ts --reporter=verbose 2>&1 | grep -E "S4|E3|bord|S5|Test Files|Tests " | head -30
cd "$WT" && pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20
cd "$WT" && pnpm --filter @roomboard/web test 2>&1 | tail -20
git add apps/web/src/engine/render/grid-cache.ts apps/web/src/engine/render/grid-cache.test.ts apps/web/src/engine/render/canvas2d.ts apps/web/src/engine/render/canvas2d.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "perf(render): cache grid lines over an enlarged view rectangle" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t3"></a>
### Tâche T3 — Aperçu de grille au rendu et au moteur

**Objectif.** Le rendu accepte un aperçu (`setGridPreview`) : sur sa page, la grille du brouillon remplace celle du
document, ses lignes viennent de `gridLinesOf` (même cache que T2) ; `null` = aucune grille ; la fin de l'aperçu rend
la grille du document. Le moteur expose `previewGrid(grid)` et `endGridPreview()` ; changer de page (`switchTo`) coupe
l'aperçu. Rien n'est écrit. Cadrage : E2, E8 (coupure), DAE1 ; scénarios S4 (« `setGridPreview` → `gridLinesOf` appelé,
`gridLines` non »), S1 ; effet de bord 4.

**Fichiers.**
- Modifier : `apps/web/src/engine/render/renderer.ts` (`:1-4`, `:35-51`), `apps/web/src/engine/render/canvas2d.ts`
  (champs, `setGridPreview`, `computeGrid`), `apps/web/src/engine/render/webgl2.ts` (`:13`, `:270`, après `:301`),
  `apps/web/src/engine/engine.ts` (`:7`, `:62-102`, `:151-152`, `:191-194`, `:448-450`).
- Tests : `apps/web/src/engine/render/canvas2d.test.ts`, `apps/web/src/engine/render/webgl2.test.ts`,
  `apps/web/src/engine/engine.test.ts`.

**Interfaces.**
- Consomme (T1) : `CoreDocument.gridLinesOf(page: string, grid: GridView, rect: Bounds, minStep: number, minDotStep:
  number): GridLines | null`. Consomme (T2) : `GridLinesCache` (`get`, `clear`, `invalidate`), champ privé `gridCache` de
  `Canvas2DRenderer`, aide de test `cachedScene()` de `canvas2d.test.ts`.
- Produit (`renderer.ts`) : `export interface GridPreview { readonly page: string; readonly grid: GridView | null }` ;
  `Renderer.setGridPreview(p: GridPreview | null): void` ; `SceneSource = Pick<CoreDocument, "element" | "outline"> &
  Partial<Pick<CoreDocument, "gridLines" | "gridLinesOf">>`.
- Produit (`engine.ts`, `Engine`) : `previewGrid(grid: GridView | null): void` ; `endGridPreview(): void`.
- Réutilise : `apps/web/src/engine/render/renderer.ts:38-51` (`Renderer`), `apps/web/src/engine/render/webgl2.ts:295`
  (délégation à la scène) — `export interface GridPreview { readonly page: string; readonly grid: GridView | null }` ;
  `setGridPreview(p: GridPreview | null): void` ; moteur : `previewGrid(grid: GridView | null): void`,
  `endGridPreview(): void` (étendre).

**Test et commande bornée.**
- `cd "$WT" && pnpm --filter @roomboard/web exec vitest run src/engine/render/canvas2d.test.ts src/engine/render/webgl2.test.ts src/engine/engine.test.ts --reporter=verbose 2>&1 | grep -E "aperçu|setGridPreview|previewGrid|switchTo|S4|S5|Test Files|Tests " | head -30`
  → « setGridPreview → gridLinesOf appelé avec le brouillon, gridLines non », « aperçu posé pour une autre page »,
  « setGridPreview : délégué à la scène », « previewGrid (DAE1) », « switchTo coupe l'aperçu (E8) » en ✓ ; tests S4
  (T2) et S5 verts ; `Test Files  3 passed`.
- `cd "$WT" && pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20` → vide.
- `cd "$WT" && pnpm --filter @roomboard/web test 2>&1 | tail -20` → 0 échec.

**Preuve visuelle.** Aucune ici (vue au navigateur en T6).

**Contraintes (recopiées de Global Constraints).**
- CG1 TDD : chaque comportement commence par son test, lancé et vu rouge, puis le code minimal, puis vert.
- CG2 Preuve bornée : chaque commande commence par `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ;
  commandes du profil ; sorties coupées ; échec = `test result: FAILED`, `error[`, `FAIL `, ou code non nul.
- CG3 Aucun build Tauri ni Android.
- CG4 Aucune dépendance ajoutée ; jamais de GPL, AGPL, LGPL.
- CG5 Aucun seuil changé ; aucun test désactivé ou sauté ; les tests S4 (T2) et S5 restent tels quels.
- CG6 Jamais `git add -A`, `git add .`, `git commit -a` ; aucun push, aucun tag.
- CG7 Commits auteur et committeur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- CG8 Test échoué sur un délai : rejoué une fois.
- CG10 Seulement les fichiers de la tâche ; aucun fichier de C10a.
- CG11 Rapport en français, avec les lignes `Réutilisation : …`.

**Interdits.** Écrire dans le document pendant l'aperçu (aucun `run`, aucun `SetGrid`) ; un second cache pour l'aperçu ;
faire suivre le magnétisme au brouillon (HE7) ; émettre un état (`emit`) depuis `previewGrid` ou `endGridPreview`.

**Terminé quand.** Commandes de preuve vertes, `tsc` vide, un commit.

**Rapport.** Tests ajoutés et sortie ; `Réutilisation : appelé Renderer (renderer.ts) et délégation WebGL2 (webgl2.ts)`
ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (même commande que l'étape 1 de T2 : `pnpm install --frozen-lockfile`, puis les
  deux modules Wasm régénérés par `cargo build … --release` et `wasm-bindgen --target web --remove-name-section`).

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm install --frozen-lockfile 2>&1 | tail -3 && cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm-formats && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm
```

- [ ] **Étape 2 : tests du rendu Canvas 2D (rouges).** Dans `canvas2d.test.ts`, import `GridView` ajouté à
  `import type { … } from "../../core/api"`. Dans `cachedScene` (T2), ajouter l'espion et le passer à la source :

```ts
  const gridLinesOf = vi.fn((page: string, grid: GridView, rect: Bounds, minStep: number, minDotStep: number) =>
    doc.gridLinesOf(page, grid, rect, minStep, minDotStep),
  );
  const src: SceneSource = { element: (id) => doc.element(id), outline: (id) => doc.outline(id), gridLines, gridLinesOf };
```

  et rendre `gridLinesOf` dans l'objet retourné. Dans le bloc « Canvas2DRenderer — cache de la grille (C9 éditeur, E3,
  S4) » :

```ts
  it("S4, DAE1 : setGridPreview → gridLinesOf appelé avec le brouillon, gridLines non ; null → aucune grille ; fin → grille du document", () => {
    const { p, r, scene, gridLines, gridLinesOf, cam, draw } = cachedScene();
    const draft = gridOf([{ ...gridLevel("squares", 80, "#94a3b8"), lineWidth: 3 }]);
    r.setGridPreview({ page: p, grid: draft });
    draw(cam());
    expect(gridLines).not.toHaveBeenCalled();
    expect(gridLinesOf).toHaveBeenCalledTimes(1);
    expect(gridLinesOf.mock.calls[0]?.[1]).toBe(draft);
    expect(scene.log).toContain("stroke #94a3b8 3");
    expect(gridSegments(scene).v.length).toBe(10);
    draw(cam(50));
    expect(gridLinesOf).toHaveBeenCalledTimes(1);
    r.setGridPreview({ page: p, grid: null });
    draw(cam());
    expect(scene.log.filter((l) => l.startsWith("stroke"))).toEqual([]);
    r.setGridPreview(null);
    draw(cam());
    expect(gridLines).toHaveBeenCalledTimes(1);
    expect(scene.log).toContain("stroke #7b68ee 1");
  });

  it("aperçu posé pour une autre page : la page montrée garde sa grille", () => {
    const { r, scene, gridLines, gridLinesOf, cam, draw } = cachedScene();
    r.setGridPreview({ page: "autre", grid: null });
    draw(cam());
    expect(gridLinesOf).not.toHaveBeenCalled();
    expect(gridLines).toHaveBeenCalledTimes(1);
    expect(scene.log).toContain("stroke #7b68ee 1");
  });
```

  Voir rouge : `pnpm --filter @roomboard/web exec vitest run src/engine/render/canvas2d.test.ts 2>&1 | grep -E "FAIL|Tests " | head`
  → `r.setGridPreview is not a function`.

- [ ] **Étape 3 : `renderer.ts`.** Import : `import type { Change, CoreDocument, EraseMode, GridView } from "../../core/api";`.
  Remplacer `SceneSource` et ajouter `GridPreview` :

```ts
/** Ce que le rendu lit du document : vue d'un élément, contour local, lignes de la grille et, pour l'aperçu de l'éditeur,
 *  lignes d'une grille non enregistrée (C9). */
export type SceneSource = Pick<CoreDocument, "element" | "outline"> & Partial<Pick<CoreDocument, "gridLines" | "gridLinesOf">>;

/** Aperçu de la grille (C9 éditeur, DAE1) : `grid` remplace celle du document sur `page` ; null = aucune grille. */
export interface GridPreview {
  readonly page: string;
  readonly grid: GridView | null;
}
```

  À la fin de `Renderer` :

```ts
  /** Aperçu de grille (DAE1) : rien n'est écrit ; `null` rend la grille du document. */
  setGridPreview(p: GridPreview | null): void;
```

- [ ] **Étape 4 : `canvas2d.ts`.** Import de type : ajouter `GridPreview` à `import type { … } from "./renderer"`. Champ
  `private gridPreview: GridPreview | null = null;` à côté de `gridCache` ; la flèche du cache devient
  `(page, rect, minStep, minDotStep) => this.computeGrid(page, rect, minStep, minDotStep)`. Après `invalidate` :

```ts
  setGridPreview(p: GridPreview | null): void {
    this.gridPreview = p;
    this.gridCache.clear();
  }

  /** Lignes que le cache demande : celles de l'aperçu sur sa page (DAE1), sinon celles du document. */
  private computeGrid(page: string, rect: Bounds, minStep: number, minDotStep: number): GridLines | null {
    const p = this.gridPreview;
    if (p !== null && p.page === page) {
      return p.grid === null ? null : (this.source.gridLinesOf?.(page, p.grid, rect, minStep, minDotStep) ?? null);
    }
    return this.source.gridLines?.(page, rect, minStep, minDotStep) ?? null;
  }
```

  Voir vert : `pnpm --filter @roomboard/web exec vitest run src/engine/render/canvas2d.test.ts 2>&1 | tail -5`.

- [ ] **Étape 5 : WebGL2 (test rouge puis code).** Dans `webgl2.test.ts` : import `type GridPreview` depuis
  `./renderer` ; `FakeScene implements Pick<Renderer, "drawScene" | "invalidate" | "resize" | "setGridPreview">` avec :

```ts
  setGridPreview(p: GridPreview | null): void {
    this.log.push(`preview ${p === null ? "null" : p.page}`);
  }
```

  et, à la fin du fichier :

```ts
describe("aperçu de grille (C9 éditeur)", () => {
  it("setGridPreview : délégué à la scène Canvas 2D", () => {
    const { scene, r } = make();
    r.setGridPreview({ page: "p", grid: null });
    r.setGridPreview(null);
    expect(scene.log.filter((l) => l.startsWith("preview"))).toEqual(["preview p", "preview null"]);
  });
});
```

  Rouge (`r.setGridPreview is not a function`), puis dans `webgl2.ts` : `GridPreview` ajouté à l'import de type de
  `./renderer` ; `private readonly scene: Pick<Renderer, "drawScene" | "invalidate" | "resize" | "setGridPreview">` ; après
  `invalidate` :

```ts
  setGridPreview(p: GridPreview | null): void {
    this.scene.setGridPreview(p);
  }
```

- [ ] **Étape 6 : tests du moteur (rouges).** Dans `engine.test.ts` : import `type GridPreview` depuis
  `./render/renderer` ; dans `FakeRenderer` :

```ts
  readonly previews: (GridPreview | null)[] = [];
  setGridPreview(p: GridPreview | null): void {
    this.previews.push(p);
  }
```

  Dans `describe("createEngine", …)` :

```ts
  it("previewGrid (DAE1) : aperçu posé sur la page montrée, scène redessinée, rien d'écrit ; endGridPreview l'ôte une fois", () => {
    const { doc, engine, renderer, frames } = setup();
    engine.resize(800, 600, 1);
    frames.tick();
    const p = engine.state().page;
    const v = doc.version();
    const n = renderer.scenes.length;
    const g = { visible: true, snap: false, above: false, levels: [] };
    engine.previewGrid(g);
    frames.tick();
    expect(renderer.previews).toEqual([{ page: p, grid: g }]);
    expect(renderer.scenes.length).toBe(n + 1);
    expect(doc.version()).toBe(v);
    expect(engine.state().canUndo).toBe(false);
    engine.endGridPreview();
    engine.endGridPreview();
    frames.tick();
    expect(renderer.previews).toEqual([{ page: p, grid: g }, null]);
    expect(renderer.scenes.length).toBe(n + 2);
  });

  it("switchTo coupe l'aperçu (E8) : page changée → setGridPreview(null), une seule fois", () => {
    const { engine, renderer } = setup();
    const p = engine.state().page;
    engine.previewGrid(null);
    expect(engine.addPage()).toBe(true);
    expect(renderer.previews).toEqual([{ page: p, grid: null }, null]);
    engine.endGridPreview();
    expect(renderer.previews).toHaveLength(2);
  });
```

  Voir rouge : `pnpm --filter @roomboard/web exec vitest run src/engine/engine.test.ts 2>&1 | grep -E "FAIL|Tests " | head`.

- [ ] **Étape 7 : `engine.ts`.** Import de type : ajouter `GridView` à `import type { Bounds, Change, … } from "../core/api"`.
  Dans `Engine`, après `redraw(): void;` :

```ts
  /** Aperçu d'une grille non enregistrée sur la page montrée (C9 éditeur, DAE1) : rien n'est écrit ; null = aucune grille. */
  previewGrid(grid: GridView | null): void;
  /** Fin de l'aperçu : la grille du document revient ; sans aperçu, rien. Changer de page la coupe aussi (E8). */
  endGridPreview(): void;
```

  Dans `createEngine`, après `let lastHidden … ;` :

```ts
  /** Aperçu de grille posé sur le rendu (DAE1). */
  let previewing = false;
  function stopPreview(): void {
    if (!previewing) return;
    previewing = false;
    renderer.setGridPreview(null);
  }
```

  Dans `switchTo`, après `leaveAll("page");` : `stopPreview();`. Dans l'objet `engine`, après `redraw() { … },` :

```ts
    previewGrid(grid) {
      previewing = true;
      renderer.setGridPreview({ page: pageId, grid });
      requestScene();
    },
    endGridPreview() {
      if (!previewing) return;
      stopPreview();
      requestScene();
    },
```

- [ ] **Étape 8 : vert, `tsc`, suite web, commit.**

```bash
cd "$WT" && pnpm --filter @roomboard/web exec vitest run src/engine/render/canvas2d.test.ts src/engine/render/webgl2.test.ts src/engine/engine.test.ts --reporter=verbose 2>&1 | grep -E "aperçu|setGridPreview|previewGrid|switchTo|S4|S5|Test Files|Tests " | head -30
cd "$WT" && pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20
cd "$WT" && pnpm --filter @roomboard/web test 2>&1 | tail -20
git add apps/web/src/engine/render/renderer.ts apps/web/src/engine/render/canvas2d.ts apps/web/src/engine/render/canvas2d.test.ts apps/web/src/engine/render/webgl2.ts apps/web/src/engine/render/webgl2.test.ts apps/web/src/engine/engine.ts apps/web/src/engine/engine.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(engine): grid preview through the renderer, ended on page switch" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t4"></a>
### Tâche T4 — Brouillon de séance pur (`grid-edit.ts`) et panneau `GridPanel`

**Objectif.** Le brouillon de la séance est un module de fonctions pures (`GridDraft → GridDraft`) : seul le premier niveau
est réglé (type, pas, couleur, épaisseur) avec le magnétisme de tête ; le reste de la grille est recopié tel quel. Le
panneau SolidJS `GridPanel` montre ces réglages, appelle `preview` à chaque saisie, `apply` une fois sur « Appliquer »,
`cancel` sur « Annuler », et `endPreview` à son démontage quel que soit le chemin. Cadrage : E4, E5, E6, E9, HE9 ;
scénario S2.

**Fichiers.**
- Créer : `apps/web/src/grid-edit.ts`, `apps/web/src/grid-edit.test.ts`, `apps/web/src/ui/GridPanel.tsx`,
  `apps/web/src/ui/GridPanel.test.tsx`.
- Modifier : `apps/web/src/ui/ProfileEditor.tsx` (`:70`, `const syncValue` devient `export const syncValue`, rien d'autre).

**Interfaces.**
- Consomme (T1) : `GridLevel.lineWidth: number` ; `DEFAULT_GRID_LINE_WIDTH`, `MIN_GRID_LINE_WIDTH`, `MAX_GRID_LINE_WIDTH`,
  `GRID_KINDS`, `type GridKind`, `type GridLevel`, `type GridView` de `core/api.ts`.
- Produit (`apps/web/src/grid-edit.ts`) : `export type GridChoice = GridKind | "none" | "other";`
  `export interface GridDraft { readonly base: GridView | null; readonly kind: GridChoice; readonly spacing: number;
  readonly color: string; readonly lineWidth: number; readonly snap: boolean }` ;
  `draftOf(g: GridView | null): GridDraft` ; `withKind(d: GridDraft, k: GridKind | "none"): GridDraft` ;
  `withSpacing(d: GridDraft, v: number): GridDraft` ; `spacingOf(raw: string): number` ;
  `withColor(d: GridDraft, c: string): GridDraft` ; `withLineWidth(d: GridDraft, w: number): GridDraft` ;
  `withSnap(d: GridDraft, on: boolean): GridDraft` ; `toGrid(d: GridDraft): GridView | null` ;
  `lineWidthOptions(current: number): readonly number[]` ; `colorInputValue(c: string): string` ;
  `GRID_DEFAULT_SPACING: Readonly<Record<GridKind, number>>` ; `GRID_KIND_LABELS: Readonly<Record<GridKind | "none",
  string>>` ; `GRID_CHOICES: readonly (GridKind | "none")[]` ; `OTHER_KIND_LABEL` ; `NEW_GRID_COLOR = "#94a3b8"` ;
  `GRID_LINE_WIDTHS` ; `MIN_GRID_SPACING = 4` ; `MAX_GRID_SPACING = 400`.
- Produit (`apps/web/src/ui/GridPanel.tsx`) : `export interface GridPanelProps { readonly initial: GridView | null;
  preview(grid: GridView | null): void; endPreview(): void; apply(grid: GridView | null): void; cancel(): void }` ;
  `export function GridPanel(props: GridPanelProps): JSX.Element` ; DOM : `<div id="grille" class="rb-editor"
  role="group" aria-label="Grille de la page">`, `select[data-grille="kind"]`, `input[type="number"][data-grille="spacing"]`,
  `input[type="color"][data-grille="color"]`, `select[data-grille="lineWidth"]`, `input[type="checkbox"][data-grille="snap"]`,
  `button[data-grille="apply"]` « Appliquer », `button[data-grille="cancel"]` « Annuler ».
- Produit (`ui/ProfileEditor.tsx`) : `export const syncValue: (el: HTMLSelectElement, value: () => string) => void`.
- Réutilise : patron `apps/web/src/profile-edit.ts` (fonctions pures testées seules, utilisées par `ProfileEditor`) —
  **nouveau module** `apps/web/src/grid-edit.ts` : `type GridChoice = GridKind | "none" | "other"` ; `GridDraft` ;
  `draftOf`, `withKind`, `withSpacing`, `withColor`, `withLineWidth`, `withSnap`, `toGrid`, `GRID_DEFAULT_SPACING`,
  `GRID_KIND_LABELS` (nouveau module, patron réutilisé).
- Réutilise : patron `apps/web/src/ui/SettingsPanel.tsx`, `apps/web/src/ui/ProfileEditor.tsx` — **nouveau composant**
  `ui/GridPanel.tsx` : `GridPanelProps` et `GridPanel(props: GridPanelProps): JSX.Element` ci-dessus ; `syncValue` de
  `ProfileEditor.tsx:70` appelé (nouveau module, patron réutilisé).
- Réutilise : `apps/web/src/ui/rb.css:57-66` (`.rb-editor`, `.rb-editor-actions`) — classes posées sur `GridPanel`,
  `rb.css` inchangé (réutiliser).

**Test et commande bornée.**
- `cd "$WT" && pnpm --filter @roomboard/web exec vitest run src/grid-edit.test.ts src/ui/GridPanel.test.tsx src/ui/ProfileEditor.test.tsx --reporter=verbose 2>&1 | grep -E "S2|E4|E5|E1|E9|HE9|démontage|Test Files|Tests " | head -40`
  → ≥ 9 tests `grid-edit`, ≥ 7 tests `GridPanel`, dont « S2 : Seyès → preview », « S2 : démontage → endPreview »,
  « HE9 : pas saisi hors bornes » en ✓ ; `ProfileEditor.test.tsx` vert ; `Test Files  3 passed`.
- `cd "$WT" && pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20` → vide.

**Preuve visuelle.** Aucune ici (le panneau est vu au navigateur en T6, capture `docs/essais/c9-editeur-grille.png`).

**Contraintes (recopiées de Global Constraints).**
- CG1 TDD : chaque comportement commence par son test, lancé et vu rouge, puis le code minimal, puis vert.
- CG2 Preuve bornée : chaque commande commence par `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ;
  commandes du profil ; sorties coupées ; échec = `test result: FAILED`, `error[`, `FAIL `, ou code non nul.
- CG3 Aucun build Tauri ni Android.
- CG4 Aucune dépendance ajoutée ; jamais de GPL, AGPL, LGPL.
- CG5 Aucun seuil changé ; aucun test désactivé ou sauté.
- CG6 Jamais `git add -A`, `git add .`, `git commit -a` ; aucun push, aucun tag.
- CG7 Commits auteur et committeur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- CG8 Test échoué sur un délai : rejoué une fois.
- CG10 Seulement les fichiers de la tâche ; aucun fichier de C10a ; libellés visibles en français.
- CG11 Rapport en français, avec les lignes `Réutilisation : …`.

**Interdits.** Toucher à `App.tsx`, à la barre ou au moteur (T5) ; logique de brouillon dans le composant (elle reste dans
`grid-edit.ts`) ; une seconde copie de `syncValue` ; une règle CSS neuve ; écrire `apply` ou `preview` au montage.

**Terminé quand.** Commandes de preuve vertes, `tsc` vide, un commit.

**Rapport.** Tests ajoutés et sortie ; `Réutilisation : appelé patron profile-edit.ts`, `Réutilisation : appelé syncValue
(ProfileEditor.tsx)`, `Réutilisation : appelé .rb-editor (rb.css)` ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (installation et deux modules Wasm, pour `tsc`).

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm install --frozen-lockfile 2>&1 | tail -3 && cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm-formats && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm
```

- [ ] **Étape 2 : `grid-edit.test.ts` (rouge : module absent).**

```ts
import { describe, expect, it } from "vitest";
import type { GridLevel, GridView } from "./core/api";
import {
  colorInputValue,
  draftOf,
  GRID_CHOICES,
  GRID_DEFAULT_SPACING,
  lineWidthOptions,
  NEW_GRID_COLOR,
  spacingOf,
  toGrid,
  withColor,
  withKind,
  withLineWidth,
  withSnap,
  withSpacing,
} from "./grid-edit";

const level = (kind: string, s: number, over: Partial<GridLevel> = {}): GridLevel => ({
  kind, spacingX: s, spacingY: s, originX: 0, originY: 0, color: "#000000", line: "solid", lineWidth: 1, snap: true, visible: true, ...over,
});
const grid = (levels: GridLevel[], over: Partial<GridView> = {}): GridView => ({ visible: true, snap: true, above: false, levels, ...over });

describe("brouillon de la grille (C9 éditeur, E4 à E6)", () => {
  it("S2, E6 : page sans grille → « Aucune » ; Seyès crée un niveau seyes 30,24, #94a3b8, lineWidth 1", () => {
    const d = draftOf(null);
    expect(d.kind).toBe("none");
    expect(toGrid(d)).toBeNull();
    expect(toGrid(withKind(d, "seyes"))).toEqual({
      visible: true,
      snap: false,
      above: false,
      levels: [{ kind: "seyes", spacingX: 30.24, spacingY: 30.24, originX: 0, originY: 0, color: NEW_GRID_COLOR, line: "solid", lineWidth: 1, snap: true, visible: true }],
    });
  });

  it("E5 : choisir un type pose son pas par défaut, garde couleur, épaisseur et magnétisme", () => {
    const d = withSnap(withLineWidth(withColor(withKind(draftOf(null), "squares"), "#ff0000"), 3), true);
    for (const k of ["squares", "lines", "dots", "isometric", "music", "seyes"] as const) {
      expect(withKind(d, k === "squares" ? "lines" : k), k).toMatchObject({ color: "#ff0000", lineWidth: 3, snap: true });
      expect(withKind(withKind(d, "none"), k).spacing, k).toBe(GRID_DEFAULT_SPACING[k]);
    }
    expect(GRID_DEFAULT_SPACING).toEqual({ squares: 40, lines: 40, dots: 40, isometric: 40, music: 20, seyes: 30.24 });
    expect(GRID_CHOICES).toEqual(["none", "squares", "lines", "dots", "isometric", "music", "seyes"]);
  });

  it("E5 : un seul pas écrit dans spacingX et spacingY ; non touché, les deux valeurs du document restent", () => {
    const g = grid([level("lines", 40, { spacingY: 25 })]);
    expect(toGrid(draftOf(g))).toEqual(g);
    expect(toGrid(withSpacing(draftOf(g), 60))?.levels[0]).toMatchObject({ spacingX: 60, spacingY: 60 });
  });

  it("HE9, Review Focus 4 : pas borné à [4, 400] ; vide ou illisible : valeur précédente", () => {
    const d = draftOf(grid([level("squares", 40)]));
    expect(withSpacing(d, 2).spacing).toBe(4);
    expect(withSpacing(d, 1000).spacing).toBe(400);
    expect(withSpacing(d, spacingOf(""))).toBe(d);
    expect(withSpacing(d, spacingOf("abc"))).toBe(d);
    expect(withSpacing(d, spacingOf(" 80 ")).spacing).toBe(80);
  });

  it("E1 : épaisseur hors [1, 8] ou non finie refusée ; couleur vide refusée ; choix 1 à 4 plus la valeur du document", () => {
    const d = draftOf(grid([level("squares", 40)]));
    for (const w of [0, 9, Number.NaN]) expect(withLineWidth(d, w)).toBe(d);
    expect(withLineWidth(d, 8).lineWidth).toBe(8);
    expect(withColor(d, "")).toBe(d);
    expect(lineWidthOptions(2)).toEqual([1, 2, 3, 4]);
    expect(lineWidthOptions(6)).toEqual([1, 2, 3, 4, 6]);
    expect([colorInputValue("#7B68EE"), colorInputValue("red")]).toEqual(["#7b68ee", "#000000"]);
  });

  it("S2, E4 : deux niveaux dont un hexagon en second : le second, above, visible et originX ressortent à l'identique", () => {
    const g = grid([level("squares", 40, { originX: 7, line: "dashed", snap: false }), level("hexagon", 12)], { above: true, visible: false });
    const out = toGrid(withLineWidth(withColor(withSpacing(draftOf(g), 80), "#123456"), 2));
    expect(out).toEqual({ ...g, levels: [{ ...g.levels[0], spacingX: 80, spacingY: 80, color: "#123456", lineWidth: 2 }, g.levels[1]] });
  });

  it("S2, E4 : premier niveau hexagon → « other », gardé ; choisir un type le remplace", () => {
    const g = grid([level("hexagon", 12, { originY: 3 }), level("dots", 40)]);
    const d = draftOf(g);
    expect(d.kind).toBe("other");
    expect(toGrid(withSnap(d, false))).toEqual({ ...g, snap: false });
    expect(toGrid(withKind(d, "squares"))?.levels).toEqual([{ ...g.levels[0], kind: "squares", spacingX: 40, spacingY: 40 }, g.levels[1]]);
  });

  it("S2, E4 : « Aucune » → null (toute la grille retirée, niveaux suivants compris)", () => {
    expect(toGrid(withKind(draftOf(grid([level("squares", 40), level("dots", 20)])), "none"))).toBeNull();
  });

  it("G5 : brouillon inchangé → la grille du document à l'identique (Appliquer sans réglage = aucune étape)", () => {
    const g = grid([level("music", 12, { color: "red", lineWidth: 2.5 })], { snap: false });
    expect(toGrid(draftOf(g))).toEqual(g);
  });
});
```

  Voir rouge : `cd "$WT" && pnpm --filter @roomboard/web exec vitest run src/grid-edit.test.ts 2>&1 | tail -5`.

- [ ] **Étape 3 : écrire `grid-edit.ts`.**

```ts
/**
 * Brouillon de l'éditeur de grille (C9 éditeur, E4 à E6) : fonctions pures `GridDraft → GridDraft`, sans DOM ni moteur,
 * comme `profile-edit.ts` pour l'éditeur de profil. Le panneau (`ui/GridPanel.tsx`) ne fait qu'appeler ces fonctions ;
 * `toGrid` rend la grille que l'aperçu montre et que « Appliquer » écrit en un seul `SetGrid`. Seul le premier niveau est
 * réglé (type, pas, couleur, épaisseur) avec le magnétisme de tête ; le reste (niveaux suivants, `visible`, `above`,
 * origine, trait, `snap` et `visible` du niveau) est recopié tel quel. Une fonction qui ne change rien rend son entrée.
 */
import {
  DEFAULT_GRID_LINE_WIDTH,
  GRID_KINDS,
  MAX_GRID_LINE_WIDTH,
  MIN_GRID_LINE_WIDTH,
  type GridKind,
  type GridLevel,
  type GridView,
} from "./core/api";

export type GridChoice = GridKind | "none" | "other";

export interface GridDraft {
  /** Grille du document à l'ouverture ; null : page sans grille. */
  readonly base: GridView | null;
  readonly kind: GridChoice;
  /** Pas en unités de page, écrit dans spacingX et spacingY (E5). */
  readonly spacing: number;
  readonly color: string;
  /** Épaisseur en pixels CSS d'écran (E1). */
  readonly lineWidth: number;
  /** Magnétisme de tête (`grid.snap`). */
  readonly snap: boolean;
}

/** Pas posé par le choix d'un type (E5) : Seyès 8 mm à 3,78 unités par mm, portée 20. */
export const GRID_DEFAULT_SPACING: Readonly<Record<GridKind, number>> = Object.freeze({
  squares: 40,
  lines: 40,
  dots: 40,
  isometric: 40,
  music: 20,
  seyes: 30.24,
});
export const GRID_KIND_LABELS: Readonly<Record<GridKind | "none", string>> = Object.freeze({
  none: "Aucune",
  squares: "Carreaux",
  lines: "Lignes",
  dots: "Points",
  isometric: "Isométrique",
  music: "Portée",
  seyes: "Seyès",
});
/** Ordre du choix « Type » : Aucune, puis les six types du cœur. */
export const GRID_CHOICES: readonly (GridKind | "none")[] = Object.freeze(["none", ...GRID_KINDS]);
export const OTHER_KIND_LABEL = "Autre (non pris en charge)";
/** Couleur d'une grille neuve (E6) : gris ardoise des séparateurs (`rb.css`). */
export const NEW_GRID_COLOR = "#94a3b8";
export const GRID_LINE_WIDTHS: readonly number[] = Object.freeze([1, 2, 3, 4]);
export const MIN_GRID_SPACING = 4;
export const MAX_GRID_SPACING = 400;

const isKind = (k: string): k is GridKind => (GRID_KINDS as readonly string[]).includes(k);

export function draftOf(g: GridView | null): GridDraft {
  const head = g?.levels[0];
  const snap = g?.snap ?? false;
  if (head === undefined) {
    return { base: g, kind: "none", spacing: GRID_DEFAULT_SPACING.squares, color: NEW_GRID_COLOR, lineWidth: DEFAULT_GRID_LINE_WIDTH, snap };
  }
  return { base: g, kind: isKind(head.kind) ? head.kind : "other", spacing: head.spacingX, color: head.color, lineWidth: head.lineWidth, snap };
}

/** Choisir un type pose son pas par défaut (E5) ; couleur, épaisseur et magnétisme gardés. */
export function withKind(d: GridDraft, k: GridKind | "none"): GridDraft {
  if (k === d.kind) return d;
  return k === "none" ? { ...d, kind: "none" } : { ...d, kind: k, spacing: GRID_DEFAULT_SPACING[k] };
}

/** Pas borné à [4, 400] ; non fini : inchangé (HE9). */
export function withSpacing(d: GridDraft, v: number): GridDraft {
  if (!Number.isFinite(v)) return d;
  const spacing = Math.min(MAX_GRID_SPACING, Math.max(MIN_GRID_SPACING, v));
  return spacing === d.spacing ? d : { ...d, spacing };
}

/** Texte du champ « Pas » → nombre ; vide : NaN (valeur précédente gardée, HE9). */
export const spacingOf = (raw: string): number => (raw.trim() === "" ? Number.NaN : Number(raw));

export function withColor(d: GridDraft, c: string): GridDraft {
  return c === "" || c === d.color ? d : { ...d, color: c };
}

/** Épaisseur dans [1, 8] (E1), sinon inchangé. */
export function withLineWidth(d: GridDraft, w: number): GridDraft {
  if (!Number.isFinite(w) || w < MIN_GRID_LINE_WIDTH || w > MAX_GRID_LINE_WIDTH || w === d.lineWidth) return d;
  return { ...d, lineWidth: w };
}

export function withSnap(d: GridDraft, on: boolean): GridDraft {
  return on === d.snap ? d : { ...d, snap: on };
}

/** Choix « Épaisseur » : 1 à 4 px, plus la valeur du document si elle est ailleurs dans [1, 8]. */
export const lineWidthOptions = (current: number): readonly number[] =>
  GRID_LINE_WIDTHS.includes(current) ? GRID_LINE_WIDTHS : [...GRID_LINE_WIDTHS, current].sort((a, b) => a - b);

/** Valeur d'un `input type="color"` : `#rrggbb` en minuscules ; toute autre couleur du document montre du noir. */
export const colorInputValue = (c: string): string => (/^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : "#000000");

/** Niveau d'une grille neuve (E6) : origine 0, trait plein, aimanté et visible. */
const NEW_LEVEL = { originX: 0, originY: 0, line: "solid", snap: true, visible: true } as const;
const NEW_GRID: GridView = { visible: true, snap: false, above: false, levels: [] };

/** Grille du brouillon : null pour « Aucune » ; « Autre » garde la grille (seul le magnétisme de tête change). */
export function toGrid(d: GridDraft): GridView | null {
  if (d.kind === "none") return null;
  const base = d.base ?? NEW_GRID;
  if (d.kind === "other") return { ...base, snap: d.snap };
  const head = base.levels[0];
  const keep = head !== undefined && head.kind === d.kind && head.spacingX === d.spacing;
  const level: GridLevel = {
    ...NEW_LEVEL,
    ...head,
    kind: d.kind,
    spacingX: keep ? head.spacingX : d.spacing,
    spacingY: keep ? head.spacingY : d.spacing,
    color: d.color,
    lineWidth: d.lineWidth,
  };
  return { ...base, snap: d.snap, levels: [level, ...base.levels.slice(1)] };
}
```

  Voir vert : `pnpm --filter @roomboard/web exec vitest run src/grid-edit.test.ts 2>&1 | tail -5` → `Tests  9 passed`.

- [ ] **Étape 4 : `GridPanel.test.tsx` (rouge : composant absent).**

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GridLevel, GridView } from "../core/api";
import { GridPanel } from "./GridPanel";

afterEach(cleanup);

const level = (kind: string, s: number, over: Partial<GridLevel> = {}): GridLevel => ({
  kind, spacingX: s, spacingY: s, originX: 0, originY: 0, color: "#000000", line: "solid", lineWidth: 1, snap: true, visible: true, ...over,
});
const grid = (levels: GridLevel[], over: Partial<GridView> = {}): GridView => ({ visible: true, snap: true, above: false, levels, ...over });

function setup(initial: GridView | null = null) {
  const preview = vi.fn<(g: GridView | null) => void>();
  const endPreview = vi.fn<() => void>();
  const apply = vi.fn<(g: GridView | null) => void>();
  const cancel = vi.fn<() => void>();
  const r = render(() => <GridPanel initial={initial} preview={preview} endPreview={endPreview} apply={apply} cancel={cancel} />);
  const q = <T extends Element>(k: string): T => {
    const el = r.container.querySelector<T>(`[data-grille="${k}"]`);
    if (el === null) throw new Error(`absent : ${k}`);
    return el;
  };
  return { ...r, preview, endPreview, apply, cancel, q };
}
const choose = (el: HTMLSelectElement, v: string): void => {
  el.value = v;
  fireEvent.change(el);
};
const typeIn = (el: HTMLInputElement, v: string): void => {
  el.value = v;
  fireEvent.input(el);
};
const tick = (el: HTMLInputElement, on: boolean): void => {
  el.checked = on;
  fireEvent.change(el);
};
const last = (fn: { mock: { calls: unknown[][] } }): GridView | null => fn.mock.calls.at(-1)![0] as GridView | null;

describe("GridPanel (C9 éditeur, E9)", () => {
  it("E9 : #grille, groupe nommé, sept types dans l'ordre ; épaisseurs 1 à 4 ; champs désactivés sur « Aucune »", () => {
    const { container, q } = setup();
    const root = container.querySelector("#grille")!;
    expect([root.getAttribute("role"), root.getAttribute("aria-label")]).toEqual(["group", "Grille de la page"]);
    expect([...q<HTMLSelectElement>("kind").options].map((o) => o.textContent)).toEqual(["Aucune", "Carreaux", "Lignes", "Points", "Isométrique", "Portée", "Seyès"]);
    expect(q<HTMLSelectElement>("kind").value).toBe("none");
    expect([...q<HTMLSelectElement>("lineWidth").options].map((o) => o.value)).toEqual(["1", "2", "3", "4"]);
    for (const k of ["spacing", "color", "lineWidth", "snap"]) expect(q<HTMLInputElement>(k).disabled, k).toBe(true);
    expect([q("apply").textContent, q("cancel").textContent]).toEqual(["Appliquer", "Annuler"]);
  });

  it("S2 : Seyès → preview(seyes 30,24, #94a3b8, lineWidth 1) ; chaque réglage = un preview ; apply jamais appelé", () => {
    const { q, preview, apply } = setup();
    choose(q("kind"), "seyes");
    expect(preview).toHaveBeenCalledTimes(1);
    expect(last(preview)?.levels[0]).toMatchObject({ kind: "seyes", spacingX: 30.24, spacingY: 30.24, color: "#94a3b8", lineWidth: 1 });
    expect(q<HTMLInputElement>("spacing").value).toBe("30.24");
    typeIn(q("spacing"), "50");
    typeIn(q("color"), "#ff0000");
    choose(q("lineWidth"), "3");
    tick(q("snap"), true);
    expect(preview).toHaveBeenCalledTimes(5);
    expect(last(preview)).toMatchObject({ snap: true, levels: [{ kind: "seyes", spacingX: 50, spacingY: 50, color: "#ff0000", lineWidth: 3 }] });
    expect(apply).not.toHaveBeenCalled();
  });

  it("S2 : Appliquer → apply une fois avec la grille finale ; Annuler → cancel, apply jamais", () => {
    const a = setup();
    choose(a.q("kind"), "squares");
    typeIn(a.q("spacing"), "80");
    fireEvent.click(a.q("apply"));
    expect(a.apply).toHaveBeenCalledTimes(1);
    expect(last(a.apply)?.levels[0]).toMatchObject({ kind: "squares", spacingX: 80, spacingY: 80 });
    cleanup();
    const b = setup();
    choose(b.q("kind"), "squares");
    fireEvent.click(b.q("cancel"));
    expect(b.cancel).toHaveBeenCalledTimes(1);
    expect(b.apply).not.toHaveBeenCalled();
  });

  it("S2 : démontage → endPreview, quel que soit le chemin", () => {
    const { unmount, endPreview } = setup();
    expect(endPreview).not.toHaveBeenCalled();
    unmount();
    expect(endPreview).toHaveBeenCalledTimes(1);
  });

  it("S2, E4 : deux niveaux (hexagon en second) : Appliquer sans réglage rend la grille telle quelle", () => {
    const g = grid([level("squares", 40, { originX: 7 }), level("hexagon", 12)], { above: true });
    const { q, apply, preview } = setup(g);
    expect(q<HTMLSelectElement>("kind").value).toBe("squares");
    fireEvent.click(q("apply"));
    expect(preview).not.toHaveBeenCalled();
    expect(last(apply)).toEqual(g);
  });

  it("S2, E4 : premier niveau hexagon → « Autre (non pris en charge) » montré, désactivé ; pas, couleur, épaisseur désactivés ; niveau gardé", () => {
    const g = grid([level("hexagon", 12), level("dots", 40)]);
    const { q, apply } = setup(g);
    const kind = q<HTMLSelectElement>("kind");
    expect(kind.value).toBe("other");
    const other = [...kind.options].find((o) => o.value === "other")!;
    expect([other.textContent, other.disabled]).toEqual(["Autre (non pris en charge)", true]);
    for (const k of ["spacing", "color", "lineWidth"]) expect(q<HTMLInputElement>(k).disabled, k).toBe(true);
    expect(q<HTMLInputElement>("snap").disabled).toBe(false);
    fireEvent.click(q("apply"));
    expect(last(apply)).toEqual(g);
  });

  it("S2 : « Aucune » puis Appliquer → apply(null)", () => {
    const { q, apply } = setup(grid([level("squares", 40)]));
    choose(q("kind"), "none");
    fireEvent.click(q("apply"));
    expect(apply).toHaveBeenCalledWith(null);
  });

  it("HE9, Review Focus 4 : pas saisi hors bornes : aperçu borné, champ ramené à la borne à la validation ; vide : aucun aperçu", () => {
    const { q, preview } = setup(grid([level("squares", 40)]));
    const spacing = q<HTMLInputElement>("spacing");
    typeIn(spacing, "2");
    expect(last(preview)?.levels[0]?.spacingX).toBe(4);
    expect(spacing.value).toBe("2");
    fireEvent.change(spacing);
    expect(spacing.value).toBe("4");
    typeIn(spacing, "");
    expect(preview).toHaveBeenCalledTimes(1);
  });
});
```

  Voir rouge : `pnpm --filter @roomboard/web exec vitest run src/ui/GridPanel.test.tsx 2>&1 | tail -5`.

- [ ] **Étape 5 : exporter `syncValue`.** Dans `apps/web/src/ui/ProfileEditor.tsx:70`, `const syncValue =` devient
  `export const syncValue =` (rien d'autre).

- [ ] **Étape 6 : écrire `GridPanel.tsx`.**

```tsx
/**
 * Panneau de la grille (C9 éditeur, E8, E9) : règle le premier niveau de la grille de la page montrée sur un brouillon
 * (`grid-edit.ts`) ; chaque saisie appelle `preview` (aperçu direct, rien n'est écrit). « Appliquer » rend la grille finale
 * (un seul `SetGrid` chez l'appelant) ; « Annuler » abandonne. `endPreview` est appelé au démontage, quel que soit le
 * chemin (Appliquer, Annuler, second clic sur « Grille », autre panneau, page, onglet ou version changés).
 */
import { createEffect, createSignal, For, on, onCleanup, Show, type JSX } from "solid-js";
import type { GridKind, GridView } from "../core/api";
import {
  colorInputValue,
  draftOf,
  GRID_CHOICES,
  GRID_KIND_LABELS,
  lineWidthOptions,
  MAX_GRID_SPACING,
  MIN_GRID_SPACING,
  OTHER_KIND_LABEL,
  spacingOf,
  toGrid,
  withColor,
  withKind,
  withLineWidth,
  withSnap,
  withSpacing,
  type GridDraft,
} from "../grid-edit";
import { syncValue } from "./ProfileEditor";

export interface GridPanelProps {
  /** Grille du document à l'ouverture ; le brouillon en est une copie. */
  readonly initial: GridView | null;
  preview(grid: GridView | null): void;
  endPreview(): void;
  apply(grid: GridView | null): void;
  cancel(): void;
}

const pickChoice = (v: string): GridKind | "none" | undefined => GRID_CHOICES.find((c) => c === v);

export function GridPanel(props: GridPanelProps): JSX.Element {
  const [draft, setDraft] = createSignal<GridDraft>(draftOf(props.initial));
  onCleanup(() => props.endPreview());
  /** Saisie acceptée : brouillon et aperçu ; refusée (même brouillon) : rien. */
  const edit = (next: GridDraft): void => {
    if (next === draft()) return;
    setDraft(next);
    props.preview(toGrid(next));
  };
  const off = (): boolean => draft().kind === "none" || draft().kind === "other";
  return (
    <div id="grille" class="rb-editor" role="group" aria-label="Grille de la page">
      <label>
        Type{" "}
        <select
          data-grille="kind"
          ref={(el) => syncValue(el, () => draft().kind)}
          onChange={(e) => {
            const k = pickChoice(e.currentTarget.value);
            if (k !== undefined) edit(withKind(draft(), k));
          }}
        >
          <For each={GRID_CHOICES}>{(k) => <option value={k}>{GRID_KIND_LABELS[k]}</option>}</For>
          <Show when={draft().kind === "other"}>
            <option value="other" disabled>
              {OTHER_KIND_LABEL}
            </option>
          </Show>
        </select>
      </label>
      <label>
        Pas{" "}
        <input
          type="number"
          data-grille="spacing"
          step="any"
          min={MIN_GRID_SPACING}
          max={MAX_GRID_SPACING}
          disabled={off()}
          ref={(el) => {
            // Réécrit seulement au changement de type : la frappe en cours (« 2 » de « 200 ») n'est pas ramenée à 4.
            createEffect(on(() => draft().kind, () => (el.value = String(draft().spacing))));
          }}
          onInput={(e) => edit(withSpacing(draft(), spacingOf(e.currentTarget.value)))}
          onChange={(e) => (e.currentTarget.value = String(draft().spacing))}
        />
      </label>
      <label>
        Couleur{" "}
        <input
          type="color"
          data-grille="color"
          value={colorInputValue(draft().color)}
          disabled={off()}
          onInput={(e) => edit(withColor(draft(), e.currentTarget.value))}
        />
      </label>
      <label>
        Épaisseur{" "}
        <select
          data-grille="lineWidth"
          disabled={off()}
          ref={(el) => syncValue(el, () => String(draft().lineWidth))}
          onChange={(e) => edit(withLineWidth(draft(), Number(e.currentTarget.value)))}
        >
          <For each={lineWidthOptions(draft().lineWidth)}>{(w) => <option value={String(w)}>{`${w} px`}</option>}</For>
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          data-grille="snap"
          checked={draft().snap}
          disabled={draft().kind === "none"}
          onChange={(e) => edit(withSnap(draft(), e.currentTarget.checked))}
        />{" "}
        Magnétisme
      </label>
      <div class="rb-editor-actions">
        <button type="button" data-grille="apply" onClick={() => props.apply(toGrid(draft()))}>
          Appliquer
        </button>
        <button type="button" data-grille="cancel" onClick={() => props.cancel()}>
          Annuler
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Étape 7 : vert, `tsc`, commit.**

```bash
cd "$WT" && pnpm --filter @roomboard/web exec vitest run src/grid-edit.test.ts src/ui/GridPanel.test.tsx src/ui/ProfileEditor.test.tsx --reporter=verbose 2>&1 | grep -E "S2|E4|E5|E1|E9|HE9|démontage|Test Files|Tests " | head -40
cd "$WT" && pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20
git add apps/web/src/grid-edit.ts apps/web/src/grid-edit.test.ts apps/web/src/ui/GridPanel.tsx apps/web/src/ui/GridPanel.test.tsx apps/web/src/ui/ProfileEditor.tsx
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(ui): grid editor draft and GridPanel with live preview" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t5"></a>
### Tâche T5 — Bouton « Grille » et séance dans `App`

**Objectif.** Une action `grid` « Grille » ouvre et ferme le panneau (`ACTION_TABLE`, `ACTIONS`, `HostTargets.toggle`),
placée dans le groupe `vue` des profils `defaut` et `annotation` avant « Profil » (pas dans `simple`). `App` montre
`GridPanel` dans le même `rb-popover` que les réglages, lié à l'onglet ouvert à l'ouverture : aperçu par
`engine.previewGrid`, « Appliquer » = un seul `engine.run({ type: "SetGrid", … })` puis fin de l'aperçu et fermeture
(refus : message dans `#etat`, panneau ouvert) ; « Annuler », second clic, autre panneau, page, onglet ou version
changés : fermé, brouillon perdu, rien d'écrit. L'annulation existante (bouton « Annuler », Ctrl+Z) défait la séance en
une étape. Cadrage : E7, E8 ; scénarios S2, S1 ; effets de bord 5 et 6.

**Fichiers.**
- Modifier : `apps/web/src/ui/App.tsx` (`:1-8` en-tête et imports, `:46`, après `:113` bloc séance, après `:245` bloc
  `<Show when={panel() === "grid"}>`), `apps/web/src/app/toolbar-host.ts` (`:17`, `:37`), `apps/web/src/toolbar.ts`
  (`:96-113`), `apps/web/src/toolbar-profiles.ts` (`:60`).
- Tests : `apps/web/src/ui/App.test.tsx`, `apps/web/src/app/toolbar-host.test.ts`, `apps/web/src/toolbar.test.ts`,
  `apps/web/src/toolbar-profiles.test.ts`.

**Interfaces.**
- Consomme (T3) : `Engine.previewGrid(grid: GridView | null): void`, `Engine.endGridPreview(): void`,
  `Engine.run(cmd: Command): Change | null`, `Engine.state().page`, `.version`. Consomme (T4) : `GridPanel(props:
  GridPanelProps)` avec `initial`, `preview`, `endPreview`, `apply`, `cancel`. Consomme (T1) : `PageView.grid` avec
  `lineWidth`.
- Produit : action `grid` (`ACTION_TABLE.grid = { label: "Grille" }`, `ACTIONS.grid`) ; `HostTargets.toggle(panel:
  "settings" | "profiles" | "grid"): void` ; `type Panel = "settings" | "profiles" | "editor" | "grid"` (privé à `App`).
- Réutilise : `apps/web/src/ui/App.tsx:46-53` (`Panel`, `setPanel`), `:112` ; `apps/web/src/app/toolbar-host.ts:17`
  (`HostTargets.toggle`) — `toggle(panel: "settings" | "profiles" | "grid")` ; `<Show when={panel() === "grid"}><div
  class="rb-popover"><GridPanel …/></div></Show>` (étendre).
- Réutilise : `apps/web/src/toolbar.ts:97` (`ACTION_TABLE`), `apps/web/src/app/toolbar-host.ts:22` (`ACTIONS`),
  `apps/web/src/toolbar-profiles.ts:60` — `grid: { label: "Grille" }` ; `grid: (t) => t.toggle("grid")` ;
  `action("grid", "Grille")` (étendre).
- Réutilise : `apps/web/src/core/api.ts:76` (`SetGrid`), `apps/web/src/engine/engine.ts:230-248` (`run`) —
  `engine.run({ type: "SetGrid", page, grid })` (réutiliser).
- Réutilise : `apps/web/src/engine/engine.ts:250-265` (`history`), action `undo` (`toolbar-host.ts:23`) — aucune interface
  neuve (réutiliser).
- Réutilise : `apps/web/src/core/api.ts` (`PageView.grid`), `apps/web/src/core/wasm-core.ts:213` (`toGridView`) —
  `board.doc.page(state.page)?.grid ?? null` (réutiliser).

**Test et commande bornée.**
- `cd "$WT" && pnpm --filter @roomboard/web exec vitest run src/ui/App.test.tsx src/app/toolbar-host.test.ts src/toolbar.test.ts src/toolbar-profiles.test.ts --reporter=verbose 2>&1 | grep -E "grille|Grille|grid|E7|E8|inventaire|Test Files|Tests " | head -30`
  → bloc « App — grille (C9 éditeur, E7, E8) » à 6 tests ✓, « grid → toggle("grid") (E7) », « Grille (E7, HE5) » ✓,
  « inventaire : chaque bouton de l'ancienne barre a son élément » ✓ ; `Test Files  4 passed`.
- À garder verts (effet de bord 6 et catalogue de C1) : `pnpm --filter @roomboard/web exec vitest run
  src/profile-store.test.ts src/profile-edit.test.ts src/ui/ProfileEditor.test.tsx 2>&1 | tail -5` → 0 échec.
- `cd "$WT" && pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20` → vide ;
  `cd "$WT" && ROOMBOARD_WASM_REQUIRED=1 pnpm -r test 2>&1 | tail -20` → 0 échec ;
  `cd "$WT" && pnpm --filter @roomboard/web build 2>&1 | tail -5` → build OK.

**Preuve visuelle.** Aucune ici (la barre et le panneau sont vus au navigateur en T6 ; la hauteur de scène de 640 px y est
contrôlée par `s5b-navigateur.mjs` et `c1-profils-navigateur.mjs`).

**Contraintes (recopiées de Global Constraints).**
- CG1 TDD : chaque comportement commence par son test, lancé et vu rouge, puis le code minimal, puis vert.
- CG2 Preuve bornée : chaque commande commence par `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ;
  commandes du profil ; sorties coupées ; échec = `test result: FAILED`, `error[`, `FAIL `, ou code non nul.
- CG3 Aucun build Tauri ni Android.
- CG4 Aucune dépendance ajoutée ; jamais de GPL, AGPL, LGPL.
- CG5 Aucun seuil changé (640 px de scène compris) ; aucun test désactivé ou sauté ; seuls changent les listes
  d'inventaire (« grid » ajouté) et les fausses sessions de `App.test.tsx` (méthodes ajoutées).
- CG6 Jamais `git add -A`, `git add .`, `git commit -a` ; aucun push, aucun tag.
- CG7 Commits auteur et committeur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- CG8 Test échoué sur un délai : rejoué une fois.
- CG10 Seulement les fichiers de la tâche ; aucun fichier de C10a ; libellés visibles en français.
- CG11 Rapport en français, avec les lignes `Réutilisation : …`.

**Interdits.** Bouton « Grille » dans le profil `simple` ; raccourci clavier (HE5) ; « Appliquer » implicite à la
fermeture ; écrire le document avant « Appliquer » ; lier la séance à `ws.active()` au moment du rappel (elle reste liée
à l'onglet ouvert à l'ouverture) ; toucher à `rb.css`.

**Terminé quand.** Commandes de preuve vertes, `tsc` vide, build web OK, un commit.

**Rapport.** Tests ajoutés et sortie ; une ligne `Réutilisation : appelé …` ou `Réutilisation : écart — …` pour chacune des
six lignes `Réutilise :`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (installation et deux modules Wasm).

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm install --frozen-lockfile 2>&1 | tail -3 && cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm-formats && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm
```

- [ ] **Étape 2 : tests de la barre et des profils (rouges).** `toolbar.test.ts:168` : ajouter `"grid"` à la liste, puis
  après la boucle `expect(ACTION_TABLE["grid"]?.label).toBe("Grille");`. `toolbar-profiles.test.ts:37-38` : ajouter
  `"grid"` à la liste de « defaut porte chaque bouton », puis ajouter :

```ts
  it("Grille (E7, HE5) : dans le groupe vue de defaut et d'annotation, avant Profil ; absente de simple", () => {
    for (const id of ["defaut", "annotation"]) {
      const vue = builtinProfile(id)!.toolbars[0]!.groups.find((g) => g.id === "vue")!;
      expect(vue.items.map((i) => i.id), id).toEqual(["sep-4", "fit-page", "grid", "profiles", "settings"]);
    }
    expect(ids("simple")).not.toContain("grid");
  });
```

  `toolbar-host.test.ts`, après « settings et profiles → toggle » :

```ts
  it('grid → toggle("grid") (E7)', () => {
    const { host, t } = setup();
    host.runAction("grid");
    expect(vi.mocked(t.toggle).mock.calls.map((c) => c[0])).toEqual(["grid"]);
  });
```

  Voir rouge : `pnpm --filter @roomboard/web exec vitest run src/toolbar.test.ts src/toolbar-profiles.test.ts src/app/toolbar-host.test.ts 2>&1 | grep -E "FAIL|Tests " | head`.

- [ ] **Étape 3 : barre et profils.** `toolbar.ts` : doc de `ACTION_TABLE` « Actions connues : celles de l'ancienne barre
  (inventaire du plan du lot 5b), et « Grille » (C9 éditeur) » ; après `profiles: { label: "Profil" },` ajouter
  `grid: { label: "Grille" },`. `toolbar-host.ts:17` : `toggle(panel: "settings" | "profiles" | "grid"): void;` ; après
  `profiles: (t) => t.toggle("profiles"),` ajouter `grid: (t) => t.toggle("grid"),`. `toolbar-profiles.ts:60` :

```ts
      { id: "vue", items: [sep("sep-4"), action("fit-page", "Ajuster la page"), action("grid", "Grille"), action("profiles", "Profil"), action("settings", "Réglages")] },
```

  (`App.tsx` ne compile plus : `toggle` reçoit `"grid"` ; l'étape 5 l'élargit.)

- [ ] **Étape 4 : tests de `App` (rouges).** Dans `App.test.tsx`, `fakeTab` : ajouter au moteur
  `previewGrid: vi.fn(), endGridPreview: vi.fn(), run: vi.fn(() => ({ pages: ["p"], ids: [], removed: [], full: false, version: 1 })),`
  et au document `page: (id: string) => ({ id, width: 1920, height: 1080, background: "#ffffff", backdrop: null, grid: null }),`
  (après `pageIds`). Ajouter `"grid"` à la liste du test « inventaire : chaque bouton de l'ancienne barre a son élément ».
  À la fin du fichier :

```tsx
describe("App — grille (C9 éditeur, E7, E8)", () => {
  const GRID = 'button[data-item="grid"]';
  const panelOf = (c: HTMLElement): Element | null => c.querySelector("#grille");
  const chooseKind = (c: HTMLElement, kind: string): void => {
    const el = c.querySelector<HTMLSelectElement>('#grille select[data-grille="kind"]');
    expect(el).not.toBeNull();
    el!.value = kind;
    el!.dispatchEvent(new Event("change", { bubbles: true }));
  };

  it("E7 : « Grille » ouvre #grille ; Carreaux → aperçu sur l'onglet actif ; second clic : fermé, aperçu coupé, rien d'écrit", () => {
    const { container, tab } = renderApp();
    click(container.querySelector(GRID));
    expect(panelOf(container)).not.toBeNull();
    chooseKind(container, "squares");
    expect(tab.engine.previewGrid).toHaveBeenCalledTimes(1);
    expect(tab.engine.previewGrid!.mock.calls[0]![0]).toMatchObject({ levels: [{ kind: "squares", spacingX: 40, color: "#94a3b8", lineWidth: 1 }] });
    click(container.querySelector(GRID));
    expect(panelOf(container)).toBeNull();
    expect(tab.engine.endGridPreview).toHaveBeenCalledTimes(1);
    expect(tab.engine.run).not.toHaveBeenCalled();
  });

  it("S2 : Appliquer → un SetGrid sur la page montrée, aperçu coupé, panneau fermé", () => {
    const { container, tab } = renderApp();
    click(container.querySelector(GRID));
    chooseKind(container, "squares");
    click(container.querySelector('#grille [data-grille="apply"]'));
    expect(tab.engine.run).toHaveBeenCalledTimes(1);
    expect(tab.engine.run!.mock.calls[0]![0]).toMatchObject({ type: "SetGrid", page: "p", grid: { levels: [{ kind: "squares" }] } });
    expect(tab.engine.endGridPreview).toHaveBeenCalled();
    expect(panelOf(container)).toBeNull();
  });

  it("E8 : Appliquer refusé par le cœur : panneau ouvert, aperçu gardé", () => {
    const { container, tab } = renderApp();
    tab.engine.run!.mockReturnValueOnce(null);
    click(container.querySelector(GRID));
    chooseKind(container, "squares");
    click(container.querySelector('#grille [data-grille="apply"]'));
    expect(tab.engine.run).toHaveBeenCalledTimes(1);
    expect(panelOf(container)).not.toBeNull();
    expect(tab.engine.endGridPreview).not.toHaveBeenCalled();
  });

  it("E8 : page ou version qui change pendant la séance : panneau fermé, rien d'écrit ; une erreur seule ne ferme pas", () => {
    const { container, tab } = renderApp();
    click(container.querySelector(GRID));
    tab.emit({ error: "refus" });
    expect(panelOf(container)).not.toBeNull();
    tab.emit({ page: "p2" });
    expect(panelOf(container)).toBeNull();
    click(container.querySelector(GRID));
    tab.emit({ version: 7 });
    expect(panelOf(container)).toBeNull();
    expect(tab.engine.run).not.toHaveBeenCalled();
    expect(tab.engine.endGridPreview).toHaveBeenCalledTimes(2);
  });

  it("E8, Review Focus 5 : onglet changé pendant la séance : panneau fermé, aperçu coupé sur l'onglet de départ seulement", () => {
    const { container, workspace, tab } = renderApp();
    click(container.querySelector(GRID));
    chooseKind(container, "dots");
    const second = fakeTab("B.roomboard");
    workspace.tabs.add("board", second.session, true);
    expect(panelOf(container)).toBeNull();
    expect(tab.engine.endGridPreview).toHaveBeenCalledTimes(1);
    expect(second.engine.endGridPreview).not.toHaveBeenCalled();
    expect(second.engine.previewGrid).not.toHaveBeenCalled();
  });

  it("E7 : ouvrir un autre panneau abandonne la séance", () => {
    const { container, tab } = renderApp();
    click(container.querySelector(GRID));
    chooseKind(container, "squares");
    click(container.querySelector('button[data-item="settings"]'));
    expect(panelOf(container)).toBeNull();
    expect(tab.engine.endGridPreview).toHaveBeenCalledTimes(1);
    expect(tab.engine.run).not.toHaveBeenCalled();
  });
});
```

  Voir rouge : `pnpm --filter @roomboard/web exec vitest run src/ui/App.test.tsx 2>&1 | grep -E "FAIL|Tests " | head`.

- [ ] **Étape 5 : `App.tsx`.** En-tête : ajouter « panneau de la grille (C9 éditeur) » à la liste. Imports :
  `import { createEffect, createMemo, createSignal, For, on, onCleanup, Show, type JSX } from "solid-js";`,
  `import type { BoardSession } from "../app/board-session";`, `import { GridPanel } from "./GridPanel";`.
  `type Panel = "settings" | "profiles" | "editor" | "grid";`. Après la définition de `board` :

```tsx
  /** Séance de la grille (E8) : liée à l'onglet ouvert à son ouverture ; le démontage de `GridPanel` coupe l'aperçu. */
  const gridPanelFor = (b: BoardSession): JSX.Element => (
    <GridPanel
      initial={b.doc.page(b.engine.state().page)?.grid ?? null}
      preview={(g) => b.engine.previewGrid(g)}
      endPreview={() => b.engine.endGridPreview()}
      apply={(grid) => {
        // Refus du cœur : message dans #etat (state().error), panneau ouvert, aperçu gardé (PC1).
        if (b.engine.run({ type: "SetGrid", page: b.engine.state().page, grid }) === null) return;
        b.engine.endGridPreview();
        setPanel(null);
      }}
      cancel={() => setPanel(null)}
    />
  );
  /** Onglet, page ou version qui change pendant la séance (annuler, rétablir, autre écriture) : panneau fermé (E8). */
  const sessionKey = createMemo(() => `${activeId() ?? ""}|${state().page}|${state().version}`);
  createEffect(
    on(
      sessionKey,
      () => {
        if (panel() === "grid") setPanel(null);
      },
      { defer: true },
    ),
  );
```

  Après le bloc `<Show when={panel() === "editor"}>…</Show>` :

```tsx
      <Show when={panel() === "grid"}>
        <div class="rb-popover">{gridPanelFor(ws.active().board)}</div>
      </Show>
```

- [ ] **Étape 6 : vert, suites, build, commit.**

```bash
cd "$WT" && pnpm --filter @roomboard/web exec vitest run src/ui/App.test.tsx src/app/toolbar-host.test.ts src/toolbar.test.ts src/toolbar-profiles.test.ts --reporter=verbose 2>&1 | grep -E "grille|Grille|grid|E7|E8|inventaire|Test Files|Tests " | head -30
cd "$WT" && pnpm --filter @roomboard/web exec vitest run src/profile-store.test.ts src/profile-edit.test.ts src/ui/ProfileEditor.test.tsx 2>&1 | tail -5
cd "$WT" && pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20
cd "$WT" && ROOMBOARD_WASM_REQUIRED=1 pnpm -r test 2>&1 | tail -20
cd "$WT" && pnpm --filter @roomboard/web build 2>&1 | tail -5
git add apps/web/src/ui/App.tsx apps/web/src/ui/App.test.tsx apps/web/src/app/toolbar-host.ts apps/web/src/app/toolbar-host.test.ts apps/web/src/toolbar.ts apps/web/src/toolbar.test.ts apps/web/src/toolbar-profiles.ts apps/web/src/toolbar-profiles.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(ui): Grid button opens the grid panel, one SetGrid per session" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t6"></a>
### Tâche T6 — Geste Playwright dans `verifier.sh --e2e`, capture de l'éditeur

**Objectif.** Un essai au navigateur joue S1 sur l'application construite : ouvrir le panneau, choisir Carreaux puis pas
80 et épaisseur 3 et voir la page changer avant « Appliquer » sans écriture, « Annuler », rouvrir et « Appliquer » (une
étape), défaire et refaire par la barre, enregistrer puis rouvrir le fichier dans un nouvel onglet et relire les réglages.
L'essai entre dans le bloc `--e2e` de `scripts/verifier.sh` et dans la liste de `verifier-e2e.test.sh` ; `--captures`
écrit `docs/essais/c9-editeur-grille.png` (panneau ouvert, Seyès en aperçu). Cadrage : E10 ; scénarios S1, S5 ; effet de
bord 5 (scène de 640 px, rejoué par `s5b-navigateur.mjs` et `c1-profils-navigateur.mjs`).

**Fichiers.**
- Créer : `scripts/essais/c9-grille-navigateur.mjs`, `docs/essais/c9-editeur-grille.png`.
- Modifier : `scripts/verifier.sh` (`:98`, bloc `--e2e`), `scripts/tests/verifier-e2e.test.sh` (`:13`).

**Interfaces.**
- Consomme (T5) : bouton `button[data-item="grid"]` ; panneau `#grille` et ses champs `[data-grille="kind" | "spacing" |
  "lineWidth" | "snap" | "apply" | "cancel"]` (T4) ; `#stage[data-version]`, `#stage[data-ready="1"]`, `#scene`.
- Produit : script `scripts/essais/c9-grille-navigateur.mjs` (code 0 réussi, 1 échec, 2 outil absent ; libellé
  `C9 grille`), aide locale `paintedIn(page, box)`.
- Réutilise : `scripts/essais/commun.mjs` (`serve`, `loadPlaywright`, `item`, `frames`, `stageBox`, `TAB`, `VIEWPORT`) ;
  `scripts/essais/c2-image-navigateur.mjs:125-160` (enregistrer par téléchargement, rouvrir dans un onglet) — mêmes aides ;
  une aide locale `paintedIn(page, box)` (pixels ≠ fond) (réutiliser).

**Test et commande bornée.**
- `cd "$WT" && bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3` → `verifier-e2e.test.sh : OK`.
- `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && bash scripts/verifier.sh --e2e > /tmp/c9-verifier.log 2>&1; echo "code $?"; grep -E "C9 grille|S5b : |C1 : |C2 image|e2e OK|verifier.sh : OK|ÉCHEC|FAIL" /tmp/c9-verifier.log | tail -20`
  → `code 0`, « C9 grille : OK », « S5b : OK », « C1 : OK », « C2 image : OK », « verifier.sh : e2e OK »,
  « verifier.sh : OK », aucun « ÉCHEC ». La suite est longue : la lancer en arrière-plan si l'outil borne à 10 min.
- `cd "$WT" && node scripts/essais/c9-grille-navigateur.mjs --captures 2>&1 | tail -30` → lignes `ok — …` de S1,
  `capture : …/docs/essais/c9-editeur-grille.png`, « C9 grille : OK ».

**Preuve visuelle.** Le profil n'a pas de commande de preuve visuelle automatique (« Aucune automatique pour l'instant »)
ni de lecture `-Lire` (VM Linux) : les valeurs lues d'abord sont celles de l'essai (`inputValue` de `kind`, `spacing`,
`lineWidth`, `isChecked(snap)`, `#stage[data-version]`, nombre de pixels peints dans la zone, recopiés dans le rapport) ;
puis la capture `docs/essais/c9-editeur-grille.png`, lue (outil `Read`) et décrite dans le rapport : panneau « Grille de la
page » en haut à gauche de la scène, type Seyès, aperçu Seyès sur la page, barre du haut avec le bouton « Grille ».

**Contraintes (recopiées de Global Constraints).**
- CG1 TDD : chaque comportement commence par son test, lancé et vu rouge, puis le code minimal, puis vert.
- CG2 Preuve bornée : chaque commande commence par `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ;
  commandes du profil (`scripts/verifier.sh`) ; sorties coupées ; échec = `test result: FAILED`, `error[`, `FAIL `, ou code
  non nul.
- CG3 Aucun build Tauri ni Android (`verifier.sh` n'en lance pas ; ne rien y ajouter).
- CG4 Aucune dépendance ajoutée (Playwright vient du cache `npx` existant, comme les autres essais) ; jamais de GPL, AGPL,
  LGPL ; `scripts/controle-licences.mjs` vert dans `verifier.sh`.
- CG5 Aucun seuil changé (budgets Wasm, 640 px de scène) ; aucun essai retiré ou sauté du bloc `--e2e` ; `verifier.sh` ne
  passe jamais `--captures`.
- CG6 Jamais `git add -A`, `git add .`, `git commit -a` ; aucun push, aucun tag.
- CG7 Commits auteur et committeur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- CG8 Test ou essai échoué sur un délai (VM chargée : `Timeout`, `waitForSelector`) : rejoué une fois ; un second échec est
  un vrai échec.
- CG10 Seulement les fichiers de la tâche ; aucun fichier de C10a ; aucune requête hors de `127.0.0.1`.
- CG11 Rapport en français, avec les lignes `Réutilisation : …`.

**Interdits.** Modifier le code de l'application pour faire passer l'essai (un échec est rapporté à l'orchestrateur avec
sa sortie) ; réécrire une capture commitée d'un autre essai ; régler l'heure autrement que par `page.clock.setFixedTime`.

**Terminé quand.** `verifier-e2e.test.sh : OK`, `verifier.sh --e2e` code 0 avec les lignes attendues, capture écrite et
décrite, un commit.

**Rapport.** Sortie de l'essai (lignes `ok — …`), extrait de `verifier.sh --e2e`, description de la capture ;
`Réutilisation : appelé commun.mjs (serve, loadPlaywright, item, frames, stageBox, TAB, VIEWPORT)` et `Réutilisation :
appelé patron enregistrer-rouvrir de c2-image-navigateur.mjs`, ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree.** `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm install
  --frozen-lockfile 2>&1 | tail -3` (les modules Wasm et `apps/web/dist` sont produits par `verifier.sh`).

- [ ] **Étape 2 : test du bloc `--e2e` (rouge).** Dans `scripts/tests/verifier-e2e.test.sh:13`, la liste devient
  `for s in s2-navigateur s34-navigateur fichiers-navigateur s5b-navigateur c2-image-navigateur c1-profils-navigateur c9-grille-navigateur; do`.
  Voir rouge : `cd "$WT" && bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3` → `ECHEC : c9-grille-navigateur absent
  de verifier.sh`.

- [ ] **Étape 3 : ligne de `verifier.sh`.** Dans le bloc `if [ "$E2E" = 1 ]; then`, après
  `node scripts/essais/c1-profils-navigateur.mjs`, ajouter `  node scripts/essais/c9-grille-navigateur.mjs`. Voir vert :
  `bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3` → `verifier-e2e.test.sh : OK`.

- [ ] **Étape 4 : écrire `scripts/essais/c9-grille-navigateur.mjs`.**

```js
#!/usr/bin/env node
// Essai C9 « éditeur de grille » au navigateur (cadrage usage-c9-editeur, S1). L'application construite (apps/web/dist)
// servie en local avec la CSP de la coque, Chromium headless de Playwright, mode repli (`?fichiers=repli`), heure figée.
// Aucune requête hors de 127.0.0.1. Lancé par scripts/verifier.sh --e2e, sans option de capture.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Usage : node scripts/essais/c9-grille-navigateur.mjs [--captures]
// (--captures : docs/essais/c9-editeur-grille.png, panneau ouvert, Seyès en aperçu).
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, frames, gitSha, item, loadPlaywright, serve, stageBox } from "./commun.mjs";

const LABEL = "C9 grille";
const FIXED = new Date("2026-11-20T08:00:00.000Z");
const PANEL = "#grille";
const field = (k) => `${PANEL} [data-grille="${k}"]`;

/** CSP de la coque (tauri.conf.json), envoyée telle quelle (même lecture que c2-image-navigateur.mjs). */
function coqueCsp() {
  const conf = JSON.parse(readFileSync(join(ROOT, "apps", "desktop", "src-tauri", "tauri.conf.json"), "utf8"));
  const csp = conf.app.security.csp;
  return Object.entries(csp).map(([d, v]) => `${d} ${Array.isArray(v) ? v.join(" ") : v}`).join("; ");
}

/** Pixels différents du fond de page (somme RVB < 750) dans [x0, y0, x1, y1], px CSS de `#scene` : le gris des grilles
 *  neuves (#94a3b8, somme 495) compte, alors qu'`inkIn` (commun.mjs, somme < 300) ne voit que l'encre sombre. */
function paintedIn(page, box) {
  return page.$eval(
    "#scene",
    (c, [x0, y0, x1, y1]) => {
      const ctx = c.getContext("2d");
      const sx = c.width / c.clientWidth;
      const sy = c.height / c.clientHeight;
      const w = Math.max(1, Math.round((x1 - x0) * sx));
      const h = Math.max(1, Math.round((y1 - y0) * sy));
      const d = ctx.getImageData(Math.round(x0 * sx), Math.round(y0 * sy), w, h).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 750) n++;
      return n;
    },
    box,
  );
}

async function scenario(page, url, { captures, tmp }) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const settle = async () => {
    await frames(page);
    await frames(page);
  };
  const version = async () => Number(await page.getAttribute("#stage", "data-version"));
  const tabs = () => page.locator(TAB).count();
  const panelOpen = async () => (await page.locator(PANEL).count()) === 1;
  const openPanel = async () => {
    await page.click(item("grid"));
    await page.waitForSelector(PANEL, { state: "visible", timeout: 15000 });
  };
  const waitTabs = async (n) => {
    await page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, n, { timeout: 15000 });
    await settle();
  };
  /** Focus rendu à la page : un raccourci (Ctrl+S, Ctrl+O) ne part pas d'un champ ou d'un bouton du panneau. */
  const blur = () => page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
  const saveTo = async (name) => {
    await blur();
    const dl = page.waitForEvent("download");
    await page.keyboard.press("Control+s");
    const file = join(tmp, name);
    await (await dl).saveAs(file);
    return file;
  };

  await page.goto(url);
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 15000 });
  await settle();
  const stage = await stageBox(page);
  // Zone vide de la page, loin du panneau (posé en haut à gauche de la scène) et des bords (px CSS de #scene).
  const zone = [stage.width * 0.55, stage.height * 0.55, stage.width * 0.8, stage.height * 0.85];
  const painted = () => paintedIn(page, zone);
  const v0 = await version();
  check((await painted()) === 0, "avant : aucun pixel peint dans la zone vide de la scène");

  // Séance 1 : aperçu direct, puis « Annuler ».
  await openPanel();
  check((await page.inputValue(field("kind"))) === "none", "« Grille » : #grille visible, type « Aucune »");
  await page.selectOption(field("kind"), "squares");
  await settle();
  const n1 = await painted();
  check(n1 > 0, `Carreaux : la grille apparaît avant « Appliquer » (${n1} pixels)`);
  check((await version()) === v0, `Carreaux en aperçu : data-version inchangé (${v0})`);
  await page.fill(field("spacing"), "80");
  await page.selectOption(field("lineWidth"), "3");
  await settle();
  const n2 = await painted();
  check(n2 > 0 && n2 !== n1, `pas 80, épaisseur 3 : la page change (${n1} → ${n2} pixels)`);
  await page.click(field("cancel"));
  await settle();
  check(!(await panelOpen()), "« Annuler » : panneau fermé");
  check((await painted()) === 0 && (await version()) === v0, "« Annuler » : zone vide, data-version inchangé");

  // Séance 2 : « Appliquer », une seule étape.
  await openPanel();
  await page.selectOption(field("kind"), "squares");
  await page.fill(field("spacing"), "80");
  await page.selectOption(field("lineWidth"), "3");
  await page.check(field("snap"));
  await page.click(field("apply"));
  await settle();
  check(!(await panelOpen()), "« Appliquer » : panneau fermé");
  check((await painted()) === n2, `« Appliquer » : grille visible, mêmes pixels que l'aperçu (${n2})`);
  check((await version()) === v0 + 1, `« Appliquer » : une étape (data-version ${v0} → ${v0 + 1})`);

  // Annuler, Rétablir (barre) : la séance part et revient en une étape.
  await page.click(item("undo"));
  await settle();
  check((await painted()) === 0, "« Annuler » de la barre : la grille part en une étape");
  await page.click(item("redo"));
  await settle();
  check((await painted()) === n2, "« Rétablir » : la grille revient");

  // Enregistrer, rouvrir le fichier dans un nouvel onglet, relire les réglages.
  const file = await saveTo("grille.roomboard");
  const before = await tabs();
  await blur();
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Control+o");
  await (await chooser).setFiles(file);
  await waitTabs(before + 1);
  check((await painted()) > 0, "rouvert dans un nouvel onglet : grille visible");
  await openPanel();
  check((await page.inputValue(field("kind"))) === "squares", "rouvert, « Grille » : Carreaux");
  check(Number(await page.inputValue(field("spacing"))) === 80, "rouvert : pas 80");
  check((await page.inputValue(field("lineWidth"))) === "3", "rouvert : épaisseur 3 px");
  check(await page.isChecked(field("snap")), "rouvert : magnétisme coché");
  const vR = await version();
  if (captures) {
    await page.selectOption(field("kind"), "seyes");
    await settle();
    const path = join(ROOT, "docs", "essais", "c9-editeur-grille.png");
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  }
  await page.click(field("cancel"));
  await settle();
  check(!(await panelOpen()) && (await version()) === vR, "rouvert, « Annuler » : rien d'écrit");
  check(errors.length === 0, `aucune erreur dans la page${errors.length > 0 ? ` : ${errors.join(" | ")}` : ""}`);
}

async function main() {
  console.log(`sha ${gitSha()}`);
  if (!existsSync(join(DIST, "index.html"))) {
    console.error(`${LABEL} : ÉCHEC — apps/web/dist absent : lancer d'abord scripts/verifier.sh (Wasm et application)`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${LABEL} : outil absent — Playwright introuvable (npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=…)`);
    return 2;
  }
  const server = await serve({ headers: { "Content-Security-Policy": coqueCsp() } });
  const port = server.address().port;
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c9-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, acceptDownloads: true });
    const external = [];
    await context.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === "127.0.0.1") return route.continue();
      external.push(u.href);
      return route.abort();
    });
    const page = await context.newPage();
    await page.clock.setFixedTime(FIXED);
    await scenario(page, `http://127.0.0.1:${port}/?fichiers=repli`, { captures: process.argv.includes("--captures"), tmp });
    if (external.length > 0) throw new Echec(`requêtes hors de 127.0.0.1 : ${external.join(", ")}`);
    console.log(`${LABEL} : OK`);
    return 0;
  } catch (e) {
    console.error(`${LABEL} : ÉCHEC — ${e instanceof Echec ? e.message : e instanceof Error ? e.stack : e}`);
    return 1;
  } finally {
    await browser?.close();
    server.close();
    await rm(tmp, { recursive: true, force: true });
  }
}

process.exitCode = await main();
```

- [ ] **Étape 5 : suite complète `--e2e`** (construit les modules Wasm et `apps/web/dist`, puis joue les huit essais).

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && bash scripts/verifier.sh --e2e > /tmp/c9-verifier.log 2>&1; echo "code $?"; grep -E "C9 grille|S5b : |C1 : |C2 image|e2e OK|verifier.sh : OK|ÉCHEC|FAIL" /tmp/c9-verifier.log | tail -20
```

  Attendu : `code 0` et les lignes de la preuve. Un « ÉCHEC » de `S5b` ou `C1` sur la hauteur de scène (bouton de plus
  dans la barre, effet de bord 5) est rapporté tel quel à l'orchestrateur, sans retoucher l'application.

- [ ] **Étape 6 : capture.**

```bash
cd "$WT" && node scripts/essais/c9-grille-navigateur.mjs --captures 2>&1 | tail -30 && ls -l docs/essais/c9-editeur-grille.png
```

  Lire la capture (`Read` sur `docs/essais/c9-editeur-grille.png`) et la décrire dans le rapport.

- [ ] **Étape 7 : commit.**

```bash
cd "$WT" && git add scripts/essais/c9-grille-navigateur.mjs scripts/verifier.sh scripts/tests/verifier-e2e.test.sh docs/essais/c9-editeur-grille.png
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "test(e2e): grid editor gesture in verifier.sh --e2e, editor capture" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Couverture du cadrage (relecture du plan)

- E1 → T1 (modèle, liaison, bornes, lecture tolérante, rendu `grid-paint.ts`). E2 → T1 (`grid_lines_of`), T3 (aperçu au
  rendu), T5 (une écriture à « Appliquer »). E3 → T2. E4, E5, E6 → T4. E7 → T5. E8 → T3 (`switchTo`), T4 (`endPreview` au
  démontage), T5 (fermetures). E9 → T4. E10 → T6. DAE1 → T1, T3.
- Carte d'impact : chaque entrée « oui » est dans les fichiers touchés d'une tâche (cœur et liaison : T1 ; `grid-cache.ts`,
  `canvas2d.ts` : T2, T3 ; `renderer.ts`, `webgl2.ts`, `engine.ts` : T3 ; `grid-paint.ts` : T1 ; `GridPanel.tsx`,
  `grid-edit.ts` : T4 ; `App.tsx`, `toolbar-host.ts`, `toolbar.ts`, `toolbar-profiles.ts` : T5 ; essai, `verifier.sh`,
  `verifier-e2e.test.sh`, capture : T6 ; tests listés : dans la tâche qui touche leur zone). `ui/rb.css` (« non,
  réutilisé ») : classes réutilisées par T4, fichier intact. Fichiers ajoutés hors carte : `select.test.ts`,
  `shape.test.ts` (littéraux, T1), `webgl2.test.ts` (faux rendu, T3), `ProfileEditor.tsx` (export de `syncValue`, T4).
- Effets de bord : 1 (fichiers de la PR 12) → T1 `read_level_line_width_defaults_to_one`,
  `grid_level_without_line_width_reads_as_one_and_resaves_identically`, `grid_reload_keeps_bytes`, `compat_socle`,
  `container` (preuve de T1) ; 2 (7 nombres) → T1 contrat commun et `grid_input_*` ; 3 (grille périmée) → T2 tests S4 ;
  4 (`setGridPreview` dans `Renderer`) → T3 `engine.test.ts`, `webgl2.test.ts` ; 5 (scène de 640 px) → T6, `s5b` et `c1`
  dans `--e2e` ; 6 (profil `defaut` enregistré avant) → T5, `profile-store.test.ts` gardé vert.
- Scénarios : S1 → T6 (et T3, T5) ; S2 → T4, T5 ; S3 → T1 ; S4 → T2, T3 ; S5 → T6.
