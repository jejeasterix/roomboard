# Plan d'exécution — usage-c10a-tableau (C10a : tableau, structure et saisie)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Cœur : vue et lecture tolérante du tableau, repli inconnu | — | `crates/roomboard-core/src/table.rs` (neuf), `crates/roomboard-core/src/lib.rs`, `crates/roomboard-core/src/element.rs`, `crates/roomboard-core/src/document.rs`, `crates/roomboard-core/src/query.rs`, `crates/roomboard-core/tests/element_inconnu.rs` | isolé (`~/projets/roomboard-wt/usage-c10a-tableau--T1`) | concepteur-critique | `cargo test -p roomboard-core 2>&1 \| grep -E "test result\|FAILED\|panicked\|error\[\|table" \| tail -60` : 0 `FAILED`, ≥ 10 tests `table`, `table_without_readable_line_falls_back_to_unknown` et `table_shape_under_unknown_kind_is_kept_byte_for_byte` présents ; `socle_fixture_resaves_identically`, `unknown_fixture_resaves_identically` verts | S4 | #tache-t1 |
| T2 | Cœur : six commandes, `BadTable`, fixture `tableau-4x3` | T1 | `crates/roomboard-core/src/table.rs`, `crates/roomboard-core/src/commands.rs`, `crates/roomboard-core/src/document.rs`, `crates/roomboard-core/tests/tableau.rs` (neuf), `crates/roomboard-core/tests/fixtures/tableau-4x3.roomboard` (neuf) | isolé (`~/projets/roomboard-wt/usage-c10a-tableau--T2`) | implementeur-tdd | `cargo test -p roomboard-core 2>&1 \| grep -E "test result\|FAILED\|panicked\|error\[\|table\|every_known" \| tail -60` : 0 `FAILED`, ≥ 22 tests `table`, `table_reload_keeps_bytes`, `every_known_kind_has_view_and_geom`, `table_fixture_resaves_identically` présents | S1, S3, S4 | #tache-t2 |
| T3 | Contrat TS, fausse liaison du tableau, contrôle de forme | — | `apps/web/src/core/api.ts`, `apps/web/src/core/fake-core.ts`, `apps/web/src/core/fake-core.test.ts`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts` | isolé (`~/projets/roomboard-wt/usage-c10a-tableau--T3`) | concepteur-critique | `vitest run src/core` : 0 échec, bloc « contrat C10a : fausse liaison » ≥ 10 tests, « contrôle de forme C10a (tableau) » ≥ 2, « fakeCore — C10a (tableau) » ≥ 3 ; `tsc` vide | S1, S3, S4 | #tache-t3 |
| T4 | Contrat du moteur et géométrie des cellules | — | `apps/web/src/engine/table-geom.ts` (neuf), `apps/web/src/engine/table-geom.test.ts` (neuf), `apps/web/src/core/shapes.ts`, `apps/web/src/core/shapes.test.ts`, `apps/web/src/engine/input/gesture.ts`, `apps/web/src/engine/tools/tool.ts`, `apps/web/src/engine/engine.ts`, `apps/web/src/engine/engine.test.ts`, `apps/web/src/app/stage-tags.test.ts` | isolé (`~/projets/roomboard-wt/usage-c10a-tableau--T4`) | implementeur-tdd | `vitest run src/engine/table-geom.test.ts src/core/shapes.test.ts src/engine/engine.test.ts` : 0 échec, « géométrie des cellules (C10a, DAC6) » ≥ 8 tests, « moteur — outil Tableau (C10a, contrat T4) » ≥ 6 tests ; `tsc` : seul l'écart nommé | S2 | #tache-t4 |
| T5 | Porte IME extraite, zone de saisie (navigation, fond), grille de choix | — | `apps/web/src/engine/tools/commit-gate.ts` (neuf), `apps/web/src/engine/tools/commit-gate.test.ts` (neuf), `apps/web/src/engine/tools/text.ts`, `apps/web/src/app/text-editor.ts`, `apps/web/src/app/text-editor.test.ts`, `apps/web/src/app/table-picker.ts` (neuf), `apps/web/src/app/table-picker.test.ts` (neuf) | isolé (`~/projets/roomboard-wt/usage-c10a-tableau--T5`) | implementeur-tdd | `vitest run src/engine/tools/commit-gate.test.ts src/engine/tools/text.test.ts src/app/text-editor.test.ts src/app/table-picker.test.ts` : 0 échec, « porte de validation IME » ≥ 4, « navigation du tableau » ≥ 5, « grille de choix du tableau » ≥ 6 ; `text.test.ts` vert sans changement ; `tsc` vide | S1, S2 | #tache-t5 |
| T6 | Liaison Wasm des six commandes, adaptateur, contrat sur le vrai module | T2, T3 | `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts`, `docs/essais/taille-wasm.md` (seulement si le module dépasse 1 400 000 o) | isolé (`~/projets/roomboard-wt/usage-c10a-tableau--T6`) | implementeur-tdd | `ROOMBOARD_WASM_REQUIRED=1 vitest run src/core` : 0 échec, « contrat C10a : vrai module wasm » ≥ 10 tests, « contrat C10a : vrai module seulement » ≥ 1 ; `cargo test -p roomboard-wasm table` ≥ 3 tests ; module ≤ 1 572 864 o | S1, S3 | #tache-t6 |
| T7 | Rendu du tableau : fonds et traits, texte des cellules par `paintText` | T3, T4 | `apps/web/src/engine/render/table-paint.ts` (neuf), `apps/web/src/engine/render/table-paint.test.ts` (neuf), `apps/web/src/engine/render/canvas2d.ts`, `apps/web/src/engine/render/canvas2d.test.ts` | isolé (`~/projets/roomboard-wt/usage-c10a-tableau--T7`) | implementeur-tdd | `vitest run src/engine/render/table-paint.test.ts src/engine/render/canvas2d.test.ts` : 0 échec, « fonds et traits du tableau » ≥ 4, « Canvas2DRenderer — tableau (C10a) » ≥ 3 dont « mêmes fillText qu'un texte d'un segment (B1) » ; `tsc` vide | S1, S3 | #tache-t7 |
| T8 | Barre : outil Tableau, cinq actions, rangée contextuelle, pastilles | T3, T4 | `apps/web/src/toolbar.ts`, `apps/web/src/toolbar.test.ts`, `apps/web/src/toolbar-profiles.ts`, `apps/web/src/toolbar-profiles.test.ts`, `apps/web/src/ui/item-state.ts`, `apps/web/src/ui/item-state.test.ts`, `apps/web/src/ui/Toolbar.tsx`, `apps/web/src/ui/Toolbar.test.tsx`, `apps/web/src/ui/PagesBar.tsx`, `apps/web/src/ui/rb.css`, `apps/web/src/app/toolbar-host.ts`, `apps/web/src/app/toolbar-host.test.ts` | isolé (`~/projets/roomboard-wt/usage-c10a-tableau--T8`) | implementeur-tdd | `vitest run src/toolbar.test.ts src/toolbar-profiles.test.ts src/ui/item-state.test.ts src/ui/Toolbar.test.tsx src/ui/PagesBar.test.tsx src/app/toolbar-host.test.ts` : 0 échec, « rangée du tableau (C10a, T10) » ≥ 3, « actions du tableau (C10a) » ≥ 3 ; contrôle « aucun switch » vert ; `tsc` vide | S1, S3 | #tache-t8 |
| T9 | Outil Tableau : création, cellule active, clavier, actions, `prune` | T3, T4, T5 | `apps/web/src/engine/tools/table.ts` (neuf), `apps/web/src/engine/tools/table.test.ts` (neuf), `apps/web/src/engine/engine.test.ts` | isolé (`~/projets/roomboard-wt/usage-c10a-tableau--T9`) | concepteur-critique | `vitest run src/engine/tools/table.test.ts src/engine/engine.test.ts src/engine/tools/text.test.ts` : 0 échec, « outil Tableau (C10a) » ≥ 18 tests, « moteur et outil Tableau (C10a, S2) » ≥ 3 ; `tsc` vide | S1, S2, S3 | #tache-t9 |
| T10 | Reste OD56 : `DroppedFile.head(n)`, en-tête seul lu avant refus | T8 | `apps/web/src/platform/files.ts`, `apps/web/src/platform/import.ts`, `apps/web/src/platform/import.test.ts`, `apps/web/src/platform/host-tauri.ts`, `apps/web/src/platform/host-tauri.test.ts`, `apps/web/src/platform/drop-web.ts`, `apps/web/src/platform/drop-web.test.ts`, `apps/web/src/platform/controller.test.ts`, `apps/web/src/app/workspace.test.ts`, `apps/web/src/app/toolbar-host.test.ts` | isolé (`~/projets/roomboard-wt/usage-c10a-tableau--T10`) | implementeur-tdd | `vitest run src/platform src/app/workspace.test.ts src/app/toolbar-host.test.ts` : 0 échec, « S5 : non reconnu, head(4096) une fois, blob() jamais » et « head(4096) : un seul read_granted_file » présents ; `tsc` vide | S5 | #tache-t10 |
| T11 | Branchement de la session : outil, grille, zone de saisie, `data-table` | T5, T8, T9 | `apps/web/src/app/board-session.ts`, `apps/web/src/app/board-session.test.ts`, `apps/web/src/app/stage-tags.ts`, `apps/web/src/app/stage-tags.test.ts` | isolé (`~/projets/roomboard-wt/usage-c10a-tableau--T11`) | implementeur-tdd | `vitest run src/app/board-session.test.ts src/app/stage-tags.test.ts src/app/workspace.test.ts` : 0 échec, « outil Tableau : grille, saisie, Tab (C10a) » et « mousedown empêché aussi pour l'outil Tableau » présents ; `pnpm --filter @roomboard/web test` 0 échec ; `tsc` vide | S1, S2 | #tache-t11 |
| T12 | Essai e2e S1 dans `verifier.sh --e2e`, capture 4 × 3 | T6, T7, T10, T11 | `scripts/essais/c10a-tableau-navigateur.mjs` (neuf), `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/c10a-tableau-4x3.png` (neuf) | isolé (`~/projets/roomboard-wt/usage-c10a-tableau--T12`) | implementeur-tdd | `bash scripts/verifier.sh --e2e 2>&1 \| tail -40` : « C10a tableau : OK », « C1 : OK », « C2 image : OK », « S3/S4 lot 4 : OK », « verifier.sh : e2e OK », « verifier.sh : OK », module Wasm ≤ 1 572 864 o ; PNG présent | S1 | #tache-t12 |

**Vagues (par dépendances).** Vague 1 : T1, T3, T4, T5 (fichiers disjoints, quatre en parallèle). Vague 2 : T2 (dès T1),
T7 et T8 (dès T3 et T4), T9 (dès T3, T4, T5) — disjoints entre eux. Vague 3 : T6 (dès T2 et T3), T10 (dès T8), T11 (dès
T5, T8, T9) — disjoints entre eux. Vague 4 : T12. L'orchestrateur lance chaque tâche dès que ses dépendances sont
fusionnées (pas d'attente de fin de vague). Fichiers partagés entre vagues, donc jamais en parallèle : `table.rs` et
`document.rs` (T1 puis T2) ; `wasm-core.ts` et `wasm-core.contract.test.ts` (T3 puis T6) ; `engine.test.ts` (T4 puis
T9) ; `stage-tags.test.ts` (T4 puis T11) ; `toolbar-host.test.ts` (T8 puis T10).

**Chemin critique.** T4 ou T5 (≈ 40 min) → T9 (≈ 60 min) → T11 (≈ 30 min) → T12 (≈ 45 min) : ≈ 2 h 55 avec les
relectures. Le chemin Rust T1 (35) → T2 (45) → T6 (35) ≈ 2 h n'est pas critique.

**`tsc` entre les vagues.** Écart nommé, un seul : dans le worktree de T4 seul, `tsc` signale `TableData` (et la
comparaison `kind === "table"`) absents de `core/api.ts`, dans `src/engine/table-geom.ts` et `src/engine/table-geom.test.ts`
seulement (types écrits par T3, effacés à l'exécution : `vitest` reste vert). Après la vague 1, `tsc` est vide. T3 pose
des cas `apply` qui lèvent pour les six commandes dans `wasm-core.ts` : `tsc` reste vide, T6 les branche.

**Goal :** créer un tableau par une grille de choix 8 × 8 (ou une boîte colonnes, lignes), écrire dans ses cellules au
clavier (Tab passe à la suivante, ajoute une ligne en fin de tableau), insérer et supprimer lignes et colonnes,
uniformiser les tailles, remplir une cellule d'une couleur, et le retrouver en rouvrant le `.roomboard` ; plus les deux
restes du brief OD71 (en-tête seul lu avant refus, OD56 ; geste Playwright S11 et capture d'un 4 × 3 rempli).

**Architecture :** le cœur porte le tableau dans `crates/roomboard-core/src/table.rs` (DAC1) : lecture tolérante (T2),
repli sur la vue « inconnu » d'un tableau mal formé (`element::unknown_view`), une fonction par commande appelée par un
bras court d'`apply`. La page mesure la hauteur exigée d'une cellule avec la même mise en lignes que le dessin et la
passe à la commande (DAC2) ; la géométrie des cellules vit côté page (`engine/table-geom.ts`, DAC6). L'outil Tableau
réutilise la zone de saisie du lot 4, qui relaie Tab et les flèches par `navigate` (DAC3), et la porte IME extraite de
l'outil Texte. Les cinq boutons de structure sont des actions de barre (DAC4) montrées dans la rangée contextuelle.

**Tech Stack :** Rust (yrs 0.28.1, serde), wasm-bindgen 0.2.130, serde-wasm-bindgen, TypeScript, SolidJS 1.9.20,
Vitest 3 (happy-dom pour le DOM), Playwright (essai e2e).

**Spec :** `docs/plans/usage-c10a-tableau-cadrage.md` (commit `7b2280c`, base `origin/main` `8247215`).

## Choix du plan (hors cadrage, à relire)

- PC1 Le cœur est coupé en deux tâches (T1 lecture, T2 commandes) : même fichier `table.rs`, en série ; T1 pose des
  `#[allow(dead_code)]` sur les champs que seules les commandes lisent, T2 les retire.
- PC2 Les commandes du tableau sont des méthodes `impl Document` écrites dans `table.rs` ; `done`, `unchanged` et
  `page_elements_or_err` de `commands.rs` passent `pub(crate)` (aucun autre changement de ces aides).
- PC3 La vue ne liste que les cellules non vides (texte ou remplissage), dans l'ordre de lecture ; une ligne ou colonne
  dont l'`id` a déjà été vu est sautée (comme une entrée illisible) ; `id` vide refusé.
- PC4 Flèches ← et → : cellule précédente ou suivante dans l'ordre de lecture (S2 : « → puis → passe à la cellule
  suivante » depuis la dernière colonne) ; ↑ et ↓ : même colonne ; au bord du tableau, rien (T8 : jamais d'ajout).
- PC5 Après « + Ligne », « + Colonne », « Uniformiser » ou une pastille, la saisie reste fermée (la cellule reste
  active) ; le cadrage ne dit rien de la réouverture.
- PC6 La fausse liaison retire au chargement les entrées illisibles d'un JSON mal formé (le cœur les garde) : écart
  déclaré dans son en-tête, hors contrat (le JSON de la fausse liaison n'est pas le `.roomboard`).
- PC7 Deux unions identiques pour les mouvements : `NavMove` (`engine/table-geom.ts`, T4) et `EditorMove`
  (`app/text-editor.ts`, T5), écrites en parallèle ; `board-session.ts` (T11) passe l'outil comme `TextEditorEvents`,
  et `tsc` y échoue si elles divergent.
- PC8 Le composant de la rangée s'appelle `TableActionRow` (le cadrage dit `TableRow`, nom déjà pris par le type
  `TableRow` de `core/api.ts`).
- PC9 `ToolbarView.tableCell` est facultatif (les vues littérales des tests existants restent valides) ;
  `EngineState.tableCell` est obligatoire.
- PC10 Fixture `tableau-4x3.roomboard` écrite par un fichier de test neuf `crates/roomboard-core/tests/tableau.rs`
  (le cadrage ne nomme pas le fichier qui l'écrit).
- PC11 La grille de choix s'ouvre avec 1 × 1 en surbrillance ; la boîte propose 3 × 3 par défaut.
- PC12 Un fichier ouvert avec un tableau dont `cells` n'est pas un `Y.Map` : la première écriture d'une cellule pose
  un `Y.Map` neuf sous `cells` (la valeur étrangère est remplacée).

## Global Constraints

- GC1 Budget : l'exécution entière tient en environ 3 h sur la VM de 8 cœurs, chargée ; une tâche vise 20 à 60 min ;
  aucune commande lourde hors celles de sa section (`scripts/verifier.sh --e2e` seulement en T12).
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`,
  `#[ignore]`), aucun seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri
  (`tauri build`), aucun build Android.
- GC4 Préparation du worktree `$WT` (`~/projets/roomboard-wt/usage-c10a-tableau--T<n>`, donné par l'orchestrateur),
  une fois : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ; modules Wasm générés (ignorés par
  git, jamais commités) : `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/apps/web/src/wasm apps/web/src/`
  et `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/apps/web/src/wasm-formats apps/web/src/` ;
  tâche Rust : `[ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/target .` (1,4 Go : les
  dépendances ne sont pas recompilées).
- GC5 Preuve bornée : la commande de la section, telle quelle ; le rapport cite le nombre de tests (N ≥ 1) et les noms
  attendus vus dans la sortie.
- GC6 Commits : chaque fichier ajouté par son chemin (`git add <chemin>`, jamais `git add -A`, `--all`, `.`, ni
  `git commit -a`), auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Aucun `--force`. Ne pas pousser.
- GC7 Dépendances : aucune nouvelle ; jamais GPL, LGPL ni AGPL.
- GC8 Plafond Wasm H2-13 inchangé : 1 572 864 octets, contrôle de `scripts/verifier.sh` non modifié ; mesure détaillée
  (`docs/essais/taille-wasm.md`, OD55) seulement si le module dépasse 1 400 000 octets.
- GC9 Format : `schema` et `formatVersion` restent 1 ; aucune `Any::Map` ; C10a n'écrit jamais `shade`, `span`,
  `mergedInto` ; une commande n'insère que la clé qu'elle change (`text` ou `fill`, `width` ou `height`), les clés
  inconnues restent ; jamais de réécriture d'une cellule en bloc.
- GC10 Couches : `crates/` sans dépendance au navigateur ; le cœur tourne en Wasm dans la page, le chemin de l'encre ne
  traverse jamais la frontière page ↔ Rust natif.
- GC11 Interface : dans `apps/web/src/ui/`, aucun `switch`, aucune taille en `px` dans un `.tsx`, libellés en français,
  aucune icône seule, cibles d'au moins `--rb-btn-m`.
- GC12 Largeur de page : lue sur la page (`ctx.doc.page(page).width`) ; aucun nouvel usage de `PAGE_WIDTH` dans
  `apps/web/src/engine` ni `apps/web/src/app` (constat `architecture-constats.md:8`).
- GC13 Périmètre : la tâche ne modifie que ses fichiers touchés.
- GC14 `tsc` : `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"` ne rend rien à la fin de la
  tâche, sauf l'écart nommé dans la section.
- GC15 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne
  `Réutilise :` de la section, et les noms de tests vus.
- GC16 Rust : `cargo fmt --all` puis `cargo clippy -p <crate> --all-targets -- -D warnings` sans avertissement avant le
  commit.

Commande de commit type :

```bash
cd "$WT" && git add <fichier1> && git add <fichier2> && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "<message anglais>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Commande de test type (vitest, verbeuse, bornée) :

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run <fichiers> --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -80
```

## Review Focus

1. Cellule active périmée : annuler l'ajout de sa ligne, retirer sa colonne, supprimer le tableau, recharger — jamais
   d'écriture sur une ligne disparue, la saisie se ferme sans rien écrire (T7, I1, S2) — tests « S2 : Échap puis annuler
   l'ajout de ligne : la cellule active disparaît » et « tableau supprimé pendant la saisie : saisie fermée sans écrire »
   (T9), « prune de l'outil Tableau après chaque commande et chaque annuler / rétablir (I1) » (T4).
2. Tableau mal formé ou écrit par un autre (aucune ligne lisible, ids en double, entrée qui n'est pas un `Y.Map`,
   `text` qui n'est pas un `Y.Text`) : toujours visible, jamais `None`, rien d'écrit à la lecture (T2, effet de bord
   « `read_unknown` coupée en deux ») — tests `unreadable_lines_are_skipped_and_kept`,
   `table_without_readable_line_falls_back_to_unknown` (T1), « JSON : mal formé : cadre inconnu » (T3).
3. Clavier aux bords : Tab à 64 lignes, Maj+Tab dans la première cellule, flèche au bord du tableau — la saisie reste
   ouverte, rien n'est perdu (T4, T8, HC10-9) — tests « S3 : à 64 lignes, Tab en dernière cellule : sans effet, saisie
   ouverte » et « Maj+Tab dans la première cellule : pris, rien ne change » (T9).
4. Composition IME pendant Tab, Échap, un clic ou un changement d'outil : rien n'est pris ni écrit avant
   `compositionend` (T8, effet de bord « porte IME extraite ») — tests « composition : Tab non pris, validation différée
   jusqu'à compositionend » (T9), « pendant la composition : request attend compositionend » (T5).
5. Tableau créé près du bord droit de la page, ou plus large qu'elle : décalé à gauche, jamais x < 0, largeur lue sur
   la page (T4, GC12) — test « tableau qui dépasserait la largeur de page : décalé à gauche, x ≥ 0 » (T9).

## Carte des fichiers

| fichier | responsabilité | tâche |
|---|---|---|
| `crates/roomboard-core/src/table.rs` | vue, lecture tolérante (T1) ; six commandes (T2) | T1, T2 |
| `crates/roomboard-core/src/element.rs` | `KNOWN_KINDS` + `"table"`, `ElementView.table`, `unknown_view` | T1 |
| `crates/roomboard-core/src/document.rs` | bras `table` d'`element()` (T1) ; test `every_known_kind_has_view_and_geom` (T2) | T1, T2 |
| `crates/roomboard-core/src/query.rs` | boîte du tableau dans `element_geom` | T1 |
| `crates/roomboard-core/src/commands.rs` | six variantes, `BadTable`, bras courts, aides `pub(crate)` | T2 |
| `crates/roomboard-core/tests/element_inconnu.rs` | S4 : forme du tableau sous un `kind` inconnu, tableau mal formé | T1 |
| `crates/roomboard-core/tests/tableau.rs`, `tests/fixtures/tableau-4x3.roomboard` | fixture pour C10b | T2 |
| `crates/roomboard-wasm/src/lib.rs` | six méthodes et leurs `*_inner` | T6 |
| `apps/web/src/core/api.ts` | `TableElement`, `TableData`, six commandes, constantes | T3 |
| `apps/web/src/core/fake-core.ts` | parité du tableau | T3 |
| `apps/web/src/core/wasm-core.ts` | `toTable` (T3), six appels (T6) | T3, T6 |
| `apps/web/src/core/shapes.ts` | `invertMatrix` | T4 |
| `apps/web/src/engine/table-geom.ts` | géométrie pure des cellules, hauteur exigée | T4 |
| `apps/web/src/engine/engine.ts`, `tools/tool.ts`, `input/gesture.ts` | contrat `TableTool`, branchement du moteur | T4 |
| `apps/web/src/engine/tools/commit-gate.ts`, `tools/text.ts` | porte IME extraite ; `TextEditSession.background` | T5 |
| `apps/web/src/app/text-editor.ts` | `navigate`, fond opaque | T5 |
| `apps/web/src/app/table-picker.ts` | grille de choix et boîte | T5 |
| `apps/web/src/engine/render/table-paint.ts`, `render/canvas2d.ts` | fonds et traits ; texte par `paintText`, cache | T7 |
| `apps/web/src/toolbar.ts`, `toolbar-profiles.ts`, `ui/*`, `app/toolbar-host.ts` | outil, actions, rangée, pastilles | T8 |
| `apps/web/src/engine/tools/table.ts` | outil Tableau | T9 |
| `apps/web/src/platform/*` | `DroppedFile.head(n)` | T10 |
| `apps/web/src/app/board-session.ts`, `app/stage-tags.ts` | branchement, `data-table` | T11 |
| `scripts/essais/c10a-tableau-navigateur.mjs`, `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/c10a-tableau-4x3.png` | essai e2e, capture | T12 |

---

<a id="tache-t1"></a>

### Tâche T1 — Cœur : vue et lecture tolérante du tableau, repli inconnu

**Objectif.** Le cœur lit un élément `kind: "table"` (T1, T2 du cadrage) : vue `TableView` (couleur, taille, colonnes,
lignes, cellules non vides), boîte `(0, 0)-(Σ largeurs, Σ hauteurs)` pour la collision et les bornes ; un tableau mal
formé (aucune ligne ou colonne lisible, `transform` illisible) se lit comme cadre « inconnu » (`sourceKind: "table"`),
jamais `None`. `read_unknown` est coupée en `KNOWN_KINDS` + `unknown_view`. S4 : la forme exacte d'un tableau sous un
`kind` inconnu est gardée octet pour octet.

**Fichiers.**
- Créer : `crates/roomboard-core/src/table.rs`
- Modifier : `crates/roomboard-core/src/lib.rs:2-13` (`pub mod table;`), `crates/roomboard-core/src/element.rs:27`,
  `:72-104`, `:239-255`, `crates/roomboard-core/src/document.rs:18-22` (imports), `:247-304` (`element`),
  `crates/roomboard-core/src/query.rs:12-14` (imports), `:110-150` (`element_geom`)
- Tests : `crates/roomboard-core/src/table.rs` (module `tests`), `crates/roomboard-core/tests/element_inconnu.rs`

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit (lu par T2, T6) :
  - `pub const TABLE_KIND: &str = "table"`, `DEFAULT_TABLE_COLOR: &str = "#000000"`, `DEFAULT_TABLE_SIZE: f64 = 36.0`,
    `MAX_TABLE_LINES: u32 = 64` (dans `crate::table`).
  - `pub struct TableView { pub color: String, pub size: f64, pub cols: Vec<TableColView>, pub rows: Vec<TableRowView>, pub cells: Vec<TableCellView> }`,
    `TableColView { id: String, width: f64 }`, `TableRowView { id: String, height: f64 }`,
    `TableCellView { row: String, col: String, text: String, fill: Option<String> }` (tous `serde::Serialize`, champs
    publics, noms sérialisés tels quels : `color`, `size`, `cols`, `rows`, `cells`, `id`, `width`, `height`, `row`,
    `col`, `text`, `fill`).
  - `pub(crate) struct Line { id: String, size: f64, map: MapRef, index: u32 }`, `pub(crate) struct RawTable { transform, color, size, cols_arr: ArrayRef, rows_arr: ArrayRef, cells: Option<MapRef>, cols: Vec<Line>, rows: Vec<Line> }`,
    `pub(crate) struct RawCell { map: MapRef, text: Option<TextRef>, content: String, fill: Option<String> }`.
  - `pub(crate) fn read_raw<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<RawTable>`,
    `pub(crate) fn read<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<(Transform, TableView)>`,
    `pub(crate) fn read_cell<T: ReadTxn>(txn: &T, cells: Option<&MapRef>, row: &str, col: &str) -> Option<RawCell>`,
    `pub(crate) fn cell_key(row: &str, col: &str) -> String` (`"<row>:<col>"`), `RawTable::width()`, `RawTable::height()`,
    `RawTable::view(&self, txn) -> TableView`.
  - `ElementView.table: Option<TableView>` (`skip_serializing_if = "Option::is_none"`), `KNOWN_KINDS: [&str; 5]`,
    `pub(crate) fn unknown_view<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<(Transform, UnknownView)>` (toujours `Some`).
  - Test public au crate : `table::tests::doc_with(element: MapPrelim) -> Document` (utilisé par T2).
- Réutilise : `crates/roomboard-core/src/rich_text.rs:54` — `valid_color(&str) -> bool` (couleur du tableau, `fill`).
- Réutilise : `crates/roomboard-core/src/element.rs:220` — `finite_positive(v: f64) -> bool` (aucune troisième copie).
- Réutilise : `crates/roomboard-core/src/element.rs:154-200` — `out_transform`, `out_f64`, `out_string`.
- Réutilise : `crates/roomboard-core/src/element.rs:27` ; `document.rs:247` ; `query.rs:112` — `KNOWN_KINDS`,
  `Document::element`, `element_geom` : étendus d'un bras `table` chacun, appelant `table::read` / `table::read_raw`
  (constat `architecture-constats.md:10` laissé ouvert, non aggravé au-delà d'un bras par endroit).
- Réutilise : `crates/roomboard-core/src/element.rs:242-255` — `read_unknown` coupée en contrôle de `KNOWN_KINDS` +
  `unknown_view(txn, &MapRef) -> Option<(Transform, UnknownView)>`, appelée par le repli du tableau.
- Réutilise : `crates/roomboard-core/src/shape.rs` — `box_polygon(w, h)` (boîte de collision, appelée `query.rs:126`).
- Réutilise : aucun module existant (nouveau module, DAC1) — `crates/roomboard-core/src/table.rs` : `read`, `read_raw`,
  `read_cell` (T1) ; `create`/commandes en T2.
- Réutilise : `crates/roomboard-core/tests/element_inconnu.rs` — patrons `hologram_ybin`, `raw_h1`, `unknown_bytes`
  (état yrs brut, relecture dans un `Doc` neuf).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
cargo test -p roomboard-core 2>&1 | grep -E "test result|FAILED|panicked|error\[|table" | tail -60
```

Attendu : aucune ligne `FAILED` ni `error[` ; toutes les lignes `test result: ok` ; au moins 10 lignes de tests dont le
nom contient `table` (7 dans `table::tests`, 3 dans `element_inconnu`), dont `table_without_readable_line_falls_back_to_unknown`
et `table_shape_under_unknown_kind_is_kept_byte_for_byte`. Tests à garder verts (cités par la carte d'impact) :
`socle_fixture_resaves_identically`, `socle_fixture_has_two_pages_and_three_kinds` (`compat_socle.rs`), les six de
`scenarios.rs`, `unknown_fixture_resaves_identically`, `unknown_kind_view_has_box_and_no_style`,
`unknown_without_transform_is_identity_selectable_deletable` (`element_inconnu.rs`) — vérifiés par
`cargo test -p roomboard-core 2>&1 | grep -E "socle_fixture|unknown_|test result"`.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`,
  `#[ignore]`), aucun seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/target .)`.
- GC5 Preuve bornée : la commande ci-dessus, telle quelle ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle ; jamais GPL, LGPL ni AGPL.
- GC8 Plafond Wasm H2-13 inchangé : 1 572 864 octets, contrôle de `scripts/verifier.sh` non modifié (le cœur grossit le
  module : rien de lourd ajouté, aucune dépendance) ; mesure détaillée seulement au-delà de 1 400 000 octets (T6).
- GC9 Format : `schema` et `formatVersion` restent 1 ; aucune `Any::Map` ; aucune écriture à la lecture.
- GC10 `crates/` sans dépendance au navigateur.
- GC13 Périmètre : seuls les fichiers ci-dessus.
- GC15 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne
  `Réutilise :` ci-dessus.
- GC16 `cargo fmt --all` puis `cargo clippy -p roomboard-core --all-targets -- -D warnings` sans avertissement.

**Interdits.** Aucune commande (`Command`) ni écriture du tableau ici (T2) ; ne pas toucher `commands.rs` ; ne pas
changer le comportement d'un `kind` inconnu existant (`hologram` reste 300 × 200 et 100 × 100) ; ne pas régénérer
`element-inconnu.roomboard` ; ne pas modifier le fichier d'état.

**Patron à ne pas reprendre.** `crates/roomboard-core/src/element.rs:225-237` (`read_image`) rend `None` pour un
élément connu mal formé : appliqué au tableau, un tableau sans ligne lisible disparaîtrait de la page (vue `None`,
aucune géométrie). Chemin de référence : le repli `unknown` de `document.rs:298-304` et `query.rs:123-129`, appelé
explicitement par le bras `table` quand `table::read` rend `None`. Second patron à éviter : `crates/roomboard-core/src/grid.rs:136-152`
(`grid::write` en bloc) — la lecture de T1 garde les références (`Line.map`, `Line.index`) pour que T2 écrive clé par
clé, jamais en bloc.

**Critère « terminé ».** La commande bornée est verte avec les noms attendus ; `cargo clippy -p roomboard-core
--all-targets -- -D warnings` sans avertissement ; un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
([ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/target .) && git log --oneline -1
```

- [ ] **Étape 2 : écrire la lecture dans `table.rs` (le moteur ne l'appelle pas encore : les tests de l'étape 3
  restent rouges jusqu'aux étapes 5 à 7).** Créer `crates/roomboard-core/src/table.rs` :

```rust
//! Tableau (U32, DAU10, C10a, DAC1) : élément `Y.Map{ id, kind: "table", transform, color, size, cols, rows, cells }` ;
//! `cols` = `Y.Array<Y.Map{ id, width }>`, `rows` = `Y.Array<Y.Map{ id, height }>`, ids `yrs::uuid_v4` ; `cells` =
//! `Y.Map` clé `"<rowId>:<colId>"` → `Y.Map{ text: Y.Text, fill? }`, cellule absente = vide. Lecture tolérante (T2) :
//! entrée de `cols` / `rows` illisible ou d'un id déjà vu sautée (gardée dans le document), `text` qui n'est pas un
//! `Y.Text` → vide, `fill` invalide → aucun, aucune ligne ou aucune colonne lisible → `None` : l'appelant se replie sur
//! `element::unknown_view` (jamais invisible). C10a n'écrit jamais `shade`, `span`, `mergedInto` (place gardée pour
//! C10b) ; aucune `Any::Map`.
use std::collections::HashSet;

use yrs::{Array, ArrayRef, GetString, Map, MapRef, Out, ReadTxn, TextRef};

use crate::element::{finite_positive, out_f64, out_string, out_transform, Transform};
use crate::rich_text::valid_color;

pub const TABLE_KIND: &str = "table";
pub const DEFAULT_TABLE_COLOR: &str = "#000000";
pub const DEFAULT_TABLE_SIZE: f64 = 36.0;
/// Plafond des lignes et des colonnes, à la création et à l'insertion (T4, HC10-9).
pub const MAX_TABLE_LINES: u32 = 64;

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct TableColView {
    pub id: String,
    pub width: f64,
}

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct TableRowView {
    pub id: String,
    pub height: f64,
}

/// Cellule non vide (texte ou remplissage) ; `fill` = remplissage (U32), distinct de l'ombrage de C10b.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct TableCellView {
    pub row: String,
    pub col: String,
    pub text: String,
    pub fill: Option<String>,
}

/// Vue d'un tableau (T13) : `color` = traits et texte, `size` = taille du texte ; cellules dans l'ordre de lecture.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct TableView {
    pub color: String,
    pub size: f64,
    pub cols: Vec<TableColView>,
    pub rows: Vec<TableRowView>,
    pub cells: Vec<TableCellView>,
}

/// Ligne ou colonne lisible : id, taille, son `Y.Map` et son rang brut dans le `Y.Array` (entrées illisibles
/// comprises) : les commandes (T2) écrivent dans `map` et insèrent ou retirent à `index`.
#[allow(dead_code)] // `map`, `index` : lus par les commandes (T2)
pub(crate) struct Line {
    pub id: String,
    pub size: f64,
    pub map: MapRef,
    pub index: u32,
}

/// Tableau lu, avec les références que les commandes écrivent.
#[allow(dead_code)] // `cols_arr`, `rows_arr` : lus par les commandes (T2)
pub(crate) struct RawTable {
    pub transform: Transform,
    pub color: String,
    pub size: f64,
    pub cols_arr: ArrayRef,
    pub rows_arr: ArrayRef,
    pub cells: Option<MapRef>,
    pub cols: Vec<Line>,
    pub rows: Vec<Line>,
}

/// Cellule lue ; `text` : son `Y.Text` s'il en est un.
#[allow(dead_code)] // `map`, `text` : lus par les commandes (T2)
pub(crate) struct RawCell {
    pub map: MapRef,
    pub text: Option<TextRef>,
    pub content: String,
    pub fill: Option<String>,
}

pub(crate) fn cell_key(row: &str, col: &str) -> String {
    format!("{row}:{col}")
}

/// Entrées lisibles d'un `Y.Array` de lignes : `Y.Map` avec un `id` texte non vide pas encore vu et `key` fini > 0.
fn lines<T: ReadTxn>(txn: &T, arr: &ArrayRef, key: &str) -> Vec<Line> {
    let mut seen = HashSet::new();
    let mut out = Vec::new();
    for (i, o) in arr.iter(txn).enumerate() {
        let Out::YMap(map) = o else { continue };
        let Some(id) = out_string(map.get(txn, "id")).filter(|s| !s.is_empty()) else {
            continue;
        };
        let Some(size) = out_f64(map.get(txn, key)).filter(|v| finite_positive(*v)) else {
            continue;
        };
        if !seen.insert(id.clone()) {
            continue;
        }
        out.push(Line {
            id,
            size,
            map,
            index: i as u32,
        });
    }
    out
}

/// Tableau bien formé (T2) : `kind` = `"table"`, `transform` lisible, au moins une ligne et une colonne lisibles ;
/// `color` invalide ou absente → `#000000`, `size` absente ou non finie > 0 → 36.
pub(crate) fn read_raw<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<RawTable> {
    if out_string(e.get(txn, "kind")).as_deref() != Some(TABLE_KIND) {
        return None;
    }
    let transform = out_transform(e.get(txn, "transform"))?;
    let Some(Out::YArray(cols_arr)) = e.get(txn, "cols") else {
        return None;
    };
    let Some(Out::YArray(rows_arr)) = e.get(txn, "rows") else {
        return None;
    };
    let cols = lines(txn, &cols_arr, "width");
    let rows = lines(txn, &rows_arr, "height");
    if cols.is_empty() || rows.is_empty() {
        return None;
    }
    let cells = match e.get(txn, "cells") {
        Some(Out::YMap(m)) => Some(m),
        _ => None,
    };
    Some(RawTable {
        transform,
        color: out_string(e.get(txn, "color"))
            .filter(|c| valid_color(c))
            .unwrap_or_else(|| DEFAULT_TABLE_COLOR.to_string()),
        size: out_f64(e.get(txn, "size"))
            .filter(|v| finite_positive(*v))
            .unwrap_or(DEFAULT_TABLE_SIZE),
        cols_arr,
        rows_arr,
        cells,
        cols,
        rows,
    })
}

/// Cellule `"<row>:<col>"` ; `None` si `cells` manque ou si l'entrée n'est pas un `Y.Map`.
pub(crate) fn read_cell<T: ReadTxn>(
    txn: &T,
    cells: Option<&MapRef>,
    row: &str,
    col: &str,
) -> Option<RawCell> {
    let Some(Out::YMap(map)) = cells?.get(txn, &cell_key(row, col)) else {
        return None;
    };
    let text = match map.get(txn, "text") {
        Some(Out::YText(t)) => Some(t),
        _ => None,
    };
    let content = text.as_ref().map(|t| t.get_string(txn)).unwrap_or_default();
    let fill = out_string(map.get(txn, "fill")).filter(|c| valid_color(c));
    Some(RawCell {
        map,
        text,
        content,
        fill,
    })
}

impl RawTable {
    pub(crate) fn width(&self) -> f64 {
        self.cols.iter().map(|l| l.size).sum()
    }

    pub(crate) fn height(&self) -> f64 {
        self.rows.iter().map(|l| l.size).sum()
    }

    /// Vue (T13) : cellules non vides dans l'ordre de lecture, sur les seules lignes et colonnes lisibles.
    pub(crate) fn view<T: ReadTxn>(&self, txn: &T) -> TableView {
        let mut cells = Vec::new();
        for r in &self.rows {
            for c in &self.cols {
                let Some(cell) = read_cell(txn, self.cells.as_ref(), &r.id, &c.id) else {
                    continue;
                };
                if cell.content.is_empty() && cell.fill.is_none() {
                    continue;
                }
                cells.push(TableCellView {
                    row: r.id.clone(),
                    col: c.id.clone(),
                    text: cell.content,
                    fill: cell.fill,
                });
            }
        }
        TableView {
            color: self.color.clone(),
            size: self.size,
            cols: self
                .cols
                .iter()
                .map(|l| TableColView {
                    id: l.id.clone(),
                    width: l.size,
                })
                .collect(),
            rows: self
                .rows
                .iter()
                .map(|l| TableRowView {
                    id: l.id.clone(),
                    height: l.size,
                })
                .collect(),
            cells,
        }
    }
}

/// Tableau bien formé : transform et vue ; `None` sinon (l'appelant prend `element::unknown_view`, T2).
pub(crate) fn read<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<(Transform, TableView)> {
    let raw = read_raw(txn, e)?;
    Some((raw.transform, raw.view(txn)))
}
```

Ajouter `pub mod table;` à `crates/roomboard-core/src/lib.rs`, après `pub mod shape;`.

- [ ] **Étape 3 : écrire les tests du module (rouges : `element()` ne connaît pas encore `table`).** À la fin de
  `table.rs` :

```rust
#[cfg(test)]
pub(crate) mod tests {
    use yrs::{Any, ArrayPrelim, Doc, In, MapPrelim, StateVector, TextPrelim, Transact};

    use super::*;
    use crate::document::Document;
    use crate::element::IDENTITY;
    use crate::query::Bounds;

    /// Document d'une page `p1` dont l'unique élément est `element` (état yrs brut, patron `hologram_ybin`).
    pub(crate) fn doc_with(element: MapPrelim) -> Document {
        let doc = Doc::with_client_id(7);
        let meta = doc.get_or_insert_map("meta");
        let pages = doc.get_or_insert_array("pages");
        {
            let mut txn = doc.transact_mut();
            meta.insert(&mut txn, "schema", 1.0);
            let page = MapPrelim::from([
                ("id", In::from("p1")),
                ("width", In::from(1920.0)),
                ("height", In::from(1080.0)),
                ("background", In::from("#ffffff")),
                (
                    "elements",
                    In::Array(ArrayPrelim::from(vec![In::Map(element)])),
                ),
            ]);
            pages.push_back(&mut txn, page);
        }
        let bytes = doc
            .transact()
            .encode_state_as_update_v1(&StateVector::default());
        Document::from_update_v1(&bytes).expect("état")
    }

    pub(crate) fn line(id: &str, key: &str, v: f64) -> In {
        In::Map(MapPrelim::from([("id", In::from(id)), (key, In::from(v))]))
    }

    fn translate(x: f64, y: f64) -> In {
        let t: Vec<Any> = [1.0, 0.0, 0.0, 1.0, x, y].into_iter().map(Any::from).collect();
        In::Any(Any::Array(t.into()))
    }

    /// Tableau `t1` en (100, 50), sans `color` ni `size` (défauts lus) ; `extra` ajoute ou remplace des champs.
    fn table_prelim(
        cols: Vec<In>,
        rows: Vec<In>,
        cells: MapPrelim,
        extra: Vec<(&'static str, In)>,
    ) -> MapPrelim {
        let mut fields: Vec<(&str, In)> = vec![
            ("id", In::from("t1")),
            ("kind", In::from("table")),
            ("transform", translate(100.0, 50.0)),
            ("cols", In::Array(ArrayPrelim::from(cols))),
            ("rows", In::Array(ArrayPrelim::from(rows))),
            ("cells", In::Map(cells)),
        ];
        fields.extend(extra);
        fields.into_iter().collect()
    }

    /// Colonnes `c1` (240), `c2` (100) ; lignes `r1` (64), `r2` (64).
    fn two_by_two(cells: MapPrelim, extra: Vec<(&'static str, In)>) -> MapPrelim {
        table_prelim(
            vec![line("c1", "width", 240.0), line("c2", "width", 100.0)],
            vec![line("r1", "height", 64.0), line("r2", "height", 64.0)],
            cells,
            extra,
        )
    }

    fn cell(text: In, more: Vec<(&'static str, In)>) -> In {
        let mut f: Vec<(&str, In)> = vec![("text", text)];
        f.extend(more);
        In::Map(f.into_iter().collect())
    }

    #[test]
    fn table_view_reads_lines_cells_and_defaults() {
        let cells = MapPrelim::from([
            ("r1:c1", cell(In::from(TextPrelim::new("Lundi")), vec![])),
            (
                "r2:c2",
                cell(
                    In::from(TextPrelim::new("")),
                    vec![("fill", In::from("#fef08a"))],
                ),
            ),
            ("r2:c1", cell(In::from(TextPrelim::new("")), vec![])),
        ]);
        let d = doc_with(two_by_two(cells, vec![]));
        let before = d.encode_v1();
        let v = d.element("t1").expect("vue");
        assert_eq!(v.kind, "table");
        assert_eq!(v.transform, [1.0, 0.0, 0.0, 1.0, 100.0, 50.0]);
        assert_eq!(v.style, None);
        let t = v.table.expect("tableau");
        assert_eq!((t.color.as_str(), t.size), ("#000000", 36.0));
        assert_eq!(
            t.cols,
            vec![
                TableColView { id: "c1".into(), width: 240.0 },
                TableColView { id: "c2".into(), width: 100.0 },
            ]
        );
        assert_eq!(
            t.rows.iter().map(|r| r.id.as_str()).collect::<Vec<_>>(),
            vec!["r1", "r2"]
        );
        assert_eq!(
            t.cells,
            vec![
                TableCellView { row: "r1".into(), col: "c1".into(), text: "Lundi".into(), fill: None },
                TableCellView { row: "r2".into(), col: "c2".into(), text: String::new(), fill: Some("#fef08a".into()) },
            ]
        );
        assert!(d.encode_v1() == before, "la lecture a écrit dans le document");
        assert!(!d.can_undo());
    }

    #[test]
    fn unreadable_lines_are_skipped_and_kept() {
        let cols = vec![
            In::from(5.0),
            In::Map(MapPrelim::from([("width", In::from(240.0))])),
            line("c-neg", "width", -1.0),
            line("", "width", 240.0),
            line("c-ok", "width", 240.0),
            line("c-ok", "width", 120.0),
        ];
        let d = doc_with(table_prelim(
            cols,
            vec![line("r1", "height", 64.0)],
            MapPrelim::default(),
            vec![],
        ));
        let t = d.element("t1").and_then(|v| v.table).expect("tableau");
        assert_eq!(t.cols, vec![TableColView { id: "c-ok".into(), width: 240.0 }]);
        let txn = d.read();
        let e = d.find_element(&txn, "t1").expect("élément").element;
        let Some(Out::YArray(raw)) = e.get(&txn, "cols") else {
            panic!("cols")
        };
        assert_eq!(raw.len(&txn), 6, "entrées illisibles gardées dans le document");
    }

    #[test]
    fn table_without_readable_line_falls_back_to_unknown() {
        let d = doc_with(table_prelim(
            vec![line("c1", "width", 240.0)],
            vec![In::from("pas une ligne")],
            MapPrelim::default(),
            vec![],
        ));
        let v = d.element("t1").expect("jamais invisible");
        assert_eq!(v.kind, "unknown");
        assert_eq!(v.transform, [1.0, 0.0, 0.0, 1.0, 100.0, 50.0]);
        let u = v.unknown.expect("inconnu");
        assert_eq!((u.source_kind.as_str(), u.w, u.h), ("table", 100.0, 100.0));
        assert_eq!(
            d.bounds(&["t1".to_string()]),
            Some(Bounds { x0: 100.0, y0: 50.0, x1: 200.0, y1: 150.0 })
        );
        assert_eq!(d.hit_test("p1", 150.0, 100.0, 0.0), Some("t1".to_string()));
    }

    #[test]
    fn table_without_transform_is_an_identity_box() {
        let mut p = two_by_two(MapPrelim::default(), vec![]);
        p.remove("transform");
        let d = doc_with(p);
        let v = d.element("t1").expect("jamais invisible");
        assert_eq!((v.kind.as_str(), v.transform), ("unknown", IDENTITY));
        assert_eq!(v.unknown.map(|u| (u.w, u.h)), Some((100.0, 100.0)));
    }

    #[test]
    fn table_geometry_is_its_box() {
        let d = doc_with(two_by_two(MapPrelim::default(), vec![]));
        let id = vec!["t1".to_string()];
        assert_eq!(
            d.bounds(&id),
            Some(Bounds { x0: 100.0, y0: 50.0, x1: 440.0, y1: 178.0 })
        );
        assert_eq!(d.hit_test("p1", 400.0, 170.0, 0.0), Some("t1".to_string()));
        assert_eq!(d.hit_test("p1", 450.0, 170.0, 0.0), None);
        assert_eq!(d.snap_box(&id), d.bounds(&id));
    }

    #[test]
    fn c10b_keys_are_ignored_and_kept() {
        let cells = MapPrelim::from([
            (
                "r1:c1",
                cell(
                    In::from(TextPrelim::new("A")),
                    vec![("span", In::from(2.0)), ("shade", In::Any(Any::Bool(true)))],
                ),
            ),
            (
                "r1:c2",
                cell(In::from(TextPrelim::new("")), vec![("mergedInto", In::from("r1:c1"))]),
            ),
        ]);
        let d = doc_with(two_by_two(cells, vec![("shade", In::Any(Any::Bool(true)))]));
        let before = d.encode_v1();
        let t = d.element("t1").and_then(|v| v.table).expect("tableau");
        assert_eq!(t.cells.len(), 1);
        assert_eq!(t.cells[0].text, "A");
        assert!(d.encode_v1() == before, "la lecture a écrit dans le document");
    }

    #[test]
    fn text_not_ytext_is_empty_and_bad_fill_is_none() {
        let cells = MapPrelim::from([
            (
                "r1:c1",
                cell(In::from("brut"), vec![("fill", In::from("pas une couleur !"))]),
            ),
            ("r1:c2", In::from(3.0)),
        ]);
        let d = doc_with(two_by_two(
            cells,
            vec![("color", In::from("!!")), ("size", In::from(-2.0))],
        ));
        let t = d.element("t1").and_then(|v| v.table).expect("tableau");
        assert!(t.cells.is_empty());
        assert_eq!((t.color.as_str(), t.size), ("#000000", 36.0));
    }
}
```

- [ ] **Étape 4 : voir les tests rouges.**
  `cargo test -p roomboard-core table:: 2>&1 | grep -E "test result|FAILED|error\[" | tail -20` — attendu : échecs
  (`v.kind` vaut `unknown`, champ `table` absent d'`ElementView` : erreur de compilation `no field table`).

- [ ] **Étape 5 : `element.rs` — `KNOWN_KINDS`, champ `table`, `unknown_view`.** Remplacer la ligne 27 :

```rust
pub const KNOWN_KINDS: [&str; 5] = ["stroke", "shape", "text", "image", "table"];
```

Dans `ElementView` (après `unknown`) et dans `bare` :

```rust
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unknown: Option<UnknownView>,
    /// Tableau (C10a, T13) ; absent pour tout autre `kind`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub table: Option<TableView>,
}
```

```rust
            unknown: None,
            table: None,
```

Ajouter `use crate::table::TableView;` aux imports. Remplacer `read_unknown` (lignes 239-255) par :

```rust
/// Élément inconnu (K8) : transform et vue ; `None` pour un `kind` connu. `kind` absent ou non textuel : `""`.
pub(crate) fn read_unknown<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<(Transform, UnknownView)> {
    let kind = out_string(e.get(txn, "kind")).unwrap_or_default();
    if KNOWN_KINDS.contains(&kind.as_str()) {
        return None;
    }
    unknown_view(txn, e)
}

/// Vue « inconnu » de tout élément (K8), aussi le repli d'un tableau mal formé (C10a, T2) : `source_kind` = le `kind`
/// lu (`""` sans `kind` textuel) ; sans `transform` lisible : identité, rien n'est écrit ; boîte `w`, `h` s'ils sont tous
/// deux finis > 0, sinon 100 × 100. Toujours `Some`.
pub(crate) fn unknown_view<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<(Transform, UnknownView)> {
    let source_kind = out_string(e.get(txn, "kind")).unwrap_or_default();
    let (w, h) = match (out_f64(e.get(txn, "w")), out_f64(e.get(txn, "h"))) {
        (Some(w), Some(h)) if finite_positive(w) && finite_positive(h) => (w, h),
        _ => (UNKNOWN_BOX, UNKNOWN_BOX),
    };
    Some((
        out_transform(e.get(txn, "transform")).unwrap_or(IDENTITY),
        UnknownView { source_kind, w, h },
    ))
}
```

Mettre à jour le commentaire de `KNOWN_KINDS` : « Types d'élément que ce cœur sait lire (C10a : `table`) ; tout autre
`kind` est gardé et rendu comme élément inconnu (U3, K8). »

- [ ] **Étape 6 : `document.rs` — bras `table` d'`element()`.** Ajouter `unknown_view` à l'import de
  `crate::element` (lignes 18-22). Dans `element()`, avant le bras `_ =>` (ligne 298) :

```rust
            Some(crate::table::TABLE_KIND) => Some(match crate::table::read(&txn, e) {
                Some((transform, table)) => ElementView {
                    table: Some(table),
                    ..ElementView::bare(id, "table", transform)
                },
                // T2 : tableau mal formé → cadre inconnu, jamais `None`.
                None => {
                    let (transform, unknown) = unknown_view(&txn, e)?;
                    ElementView {
                        unknown: Some(unknown),
                        ..ElementView::bare(id, "unknown", transform)
                    }
                }
            }),
```

- [ ] **Étape 7 : `query.rs` — boîte du tableau dans `element_geom`.** Ajouter `unknown_view` à l'import de
  `crate::element` et `use crate::table::{self, TABLE_KIND};`. Dans `element_geom`, juste après le bloc
  `read_stroke` (avant `read_unknown`) :

```rust
        if out_string(e.get(txn, "kind")).as_deref() == Some(TABLE_KIND) {
            // Boîte (0, 0)-(Σ largeurs, Σ hauteurs) ; tableau mal formé : la boîte inconnue (T2).
            let (transform, w, h) = match table::read_raw(txn, e) {
                Some(t) => (t.transform, t.width(), t.height()),
                None => {
                    let (transform, u) = unknown_view(txn, e)?;
                    (transform, u.w, u.h)
                }
            };
            return Some(Geom {
                id: raw_id?,
                transform,
                outline: box_polygon(w, h).into(),
            });
        }
```

Mettre à jour le commentaire d'`element_geom` : « … boîte (texte, image, tableau, élément inconnu) ».

- [ ] **Étape 8 : tests verts du module.**
  `cargo test -p roomboard-core table:: 2>&1 | grep -E "test result|FAILED|error\[" | tail -20` — attendu :
  `7 passed`, aucun `FAILED`.

- [ ] **Étape 9 : test S4 rouge puis vert dans `tests/element_inconnu.rs`.** Ajouter `GetString` et `TextPrelim` à
  l'import `yrs::{…}`, puis à la fin du fichier :

```rust
fn table_line(id: &str, key: &str, v: f64) -> In {
    In::Map(MapPrelim::from([("id", In::from(id)), (key, In::from(v))]))
}

/// État Yrs d'un tableau C10a de forme exacte (`cols`, `rows` en `Y.Array` de `Y.Map`, `cells` en `Y.Map` de `Y.Map`
/// avec `Y.Text`) sous le `kind` donné : `"table-v2"` simule un lecteur qui ne connaît pas ce `kind` (HC10-14 : chemin
/// inchangé depuis C2, référence `main` `8247215`) ; `with_rows = false` : tableau mal formé (aucune ligne).
fn table_shaped_ybin(kind: &str, with_rows: bool) -> Vec<u8> {
    let doc = Doc::with_client_id(9);
    let meta = doc.get_or_insert_map("meta");
    let pages = doc.get_or_insert_array("pages");
    {
        let mut txn = doc.transact_mut();
        meta.insert(&mut txn, "schema", 1.0);
        let transform: Vec<Any> = [1.0, 0.0, 0.0, 1.0, 100.0, 50.0]
            .into_iter()
            .map(Any::from)
            .collect();
        let cells = MapPrelim::from([(
            "r1:c1",
            In::Map(MapPrelim::from([("text", In::from(TextPrelim::new("Lundi")))])),
        )]);
        let rows = if with_rows {
            vec![table_line("r1", "height", 64.0)]
        } else {
            Vec::new()
        };
        let t = MapPrelim::from([
            ("id", In::from("t1")),
            ("kind", In::from(kind)),
            ("transform", In::Any(Any::Array(transform.into()))),
            ("color", In::from("#000000")),
            ("size", In::from(36.0)),
            (
                "cols",
                In::Array(ArrayPrelim::from(vec![table_line("c1", "width", 240.0)])),
            ),
            ("rows", In::Array(ArrayPrelim::from(rows))),
            ("cells", In::Map(cells)),
        ]);
        let page = MapPrelim::from([
            ("id", In::from("p1")),
            ("width", In::from(1920.0)),
            ("height", In::from(1080.0)),
            ("background", In::from("#ffffff")),
            ("elements", In::Array(ArrayPrelim::from(vec![In::Map(t)]))),
        ]);
        pages.push_back(&mut txn, page);
    }
    let txn = doc.transact();
    txn.encode_state_as_update_v1(&StateVector::default())
}

/// Texte de la cellule `r1:c1` de `t1`, relu dans un `Doc` yrs neuf.
fn raw_cell_text(d: &Document) -> Option<String> {
    let raw = Doc::new();
    let pages = raw.get_or_insert_array("pages");
    raw.transact_mut()
        .apply_update(Update::decode_v1(&d.encode_v1()).expect("décodage"))
        .expect("application");
    let txn = raw.transact();
    let Some(Out::YMap(page)) = pages.get(&txn, 0) else { return None };
    let Some(Out::YArray(els)) = page.get(&txn, "elements") else { return None };
    let Some(Out::YMap(t)) = els.get(&txn, 0) else { return None };
    let Some(Out::YMap(cells)) = t.get(&txn, "cells") else { return None };
    let Some(Out::YMap(c)) = cells.get(&txn, "r1:c1") else { return None };
    match c.get(&txn, "text") {
        Some(Out::YText(x)) => Some(x.get_string(&txn)),
        _ => None,
    }
}

/// S4 : un tableau sous un `kind` inconnu est un cadre gris de 100 × 100, se déplace et se réenregistre octet pour
/// octet ; son `Y.Text` survit au déplacement et au rechargement.
#[test]
fn table_shape_under_unknown_kind_is_kept_byte_for_byte() {
    let d = Document::from_update_v1(&table_shaped_ybin("table-v2", true)).expect("état");
    let file = save(&d, &meta()).expect("save");
    let r = load(&file).expect("load");
    assert!(save(&r, &meta()).expect("resave") == file, "réenregistré octet pour octet");
    let v = r.element("t1").expect("vue");
    assert_eq!(v.kind, "unknown");
    let u = v.unknown.expect("inconnu");
    assert_eq!((u.source_kind.as_str(), u.w, u.h), ("table-v2", 100.0, 100.0));
    let mut m = r;
    m.apply(Command::Transform {
        ids: vec!["t1".into()],
        matrix: [1.0, 0.0, 0.0, 1.0, 10.0, 0.0],
    })
    .expect("transform");
    let again = load(&save(&m, &meta()).expect("save")).expect("reload");
    assert_eq!(
        again.element("t1").expect("vue").transform,
        [1.0, 0.0, 0.0, 1.0, 110.0, 50.0]
    );
    assert_eq!(raw_cell_text(&again).as_deref(), Some("Lundi"));
}

#[test]
fn same_shape_as_table_is_read_by_this_version() {
    let d = Document::from_update_v1(&table_shaped_ybin("table", true)).expect("état");
    let t = d.element("t1").and_then(|v| v.table).expect("tableau");
    assert_eq!(t.cells.len(), 1);
    assert_eq!(t.cells[0].text, "Lundi");
}

/// S4 : `kind: "table"` sans ligne lisible : cadre gris (jamais invisible), supprimable.
#[test]
fn malformed_table_is_a_gray_box_and_deletable() {
    let mut d = Document::from_update_v1(&table_shaped_ybin("table", false)).expect("état");
    let v = d.element("t1").expect("jamais invisible");
    assert_eq!(v.kind, "unknown");
    assert_eq!(
        v.unknown.map(|u| (u.source_kind, u.w, u.h)),
        Some(("table".to_string(), 100.0, 100.0))
    );
    d.apply(Command::Delete { ids: vec!["t1".into()] }).expect("delete");
    assert!(d.element_ids("p1").is_empty());
}
```

Vérifier vert (les étapes 5 à 7 sont faites) :
`cargo test -p roomboard-core --test element_inconnu 2>&1 | grep -E "test result|FAILED|table"` — attendu : 3 tests
`table` en `ok`, `test result: ok`.

- [ ] **Étape 10 : preuve bornée, format, clippy.** Lancer la commande bornée de la section ; puis
  `cargo fmt --all && cargo clippy -p roomboard-core --all-targets -- -D warnings 2>&1 | tail -5` — attendu : aucun
  `warning`, aucun `error`.

- [ ] **Étape 11 : commit.**

```bash
cd "$WT" && git add crates/roomboard-core/src/table.rs && git add crates/roomboard-core/src/lib.rs && \
git add crates/roomboard-core/src/element.rs && git add crates/roomboard-core/src/document.rs && \
git add crates/roomboard-core/src/query.rs && git add crates/roomboard-core/tests/element_inconnu.rs && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(core): read table elements tolerantly, fall back to unknown box" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : N tests, noms vus, et une ligne `Réutilisation :` par ligne `Réutilise :` (huit lignes).

---

<a id="tache-t2"></a>

### Tâche T2 — Cœur : six commandes, `BadTable`, fixture `tableau-4x3`

**Objectif.** Six commandes (T3 du cadrage), chacune une transaction `"local"` = une étape, aucune transaction sans
effet (D38) : `AddTable`, `SetTableCell` (hauteur écrite seulement si plus grande, T5), `InsertTableLine` (taille de
la voisine), `RemoveTableLine` (retire aussi les cellules de la ligne), `SetTableSizes` (Uniformiser, peut réduire,
T11), `SetTableFill`. Erreur `BadTable` ; id qui n'est pas un tableau → `UnknownElement`. S3 : enregistrer, recharger,
réenregistrer donne les mêmes octets. Garde I3 : `every_known_kind_has_view_and_geom`. Fixture `tableau-4x3.roomboard`.

**Fichiers.**
- Modifier : `crates/roomboard-core/src/table.rs` (commandes, retrait des `#[allow(dead_code)]` de T1),
  `crates/roomboard-core/src/commands.rs:30-104` (`Command`), `:125-139` (`CommandError`), `:141-185` (`Display`),
  `:416-485` (`apply`), `:410` et `:778-790` (`page_elements_or_err`, `done`, `unchanged` → `pub(crate)`)
- Tests : `crates/roomboard-core/src/table.rs` (module `tests`), `crates/roomboard-core/src/document.rs` (module
  `tests`, test neuf), `crates/roomboard-core/tests/tableau.rs` (neuf)
- Créer : `crates/roomboard-core/tests/fixtures/tableau-4x3.roomboard` (écrit par le test, commité)

**Interfaces.**
- Consomme (T1) : `table::{read_raw, read_cell, cell_key, RawTable, RawCell, Line, TableView, TableCellView, TABLE_KIND, MAX_TABLE_LINES}`,
  `table::tests::doc_with` (pas utilisé ici, gardé).
- Produit (lu par T6) :
  - `pub enum TableAxis { Row, Col }` (`Debug, Clone, Copy, PartialEq, Eq`) dans `crate::table`.
  - `Command::AddTable { page: String, x: f64, y: f64, cols: u32, rows: u32, col_width: f64, row_height: f64, color: String, size: f64 }`
  - `Command::SetTableCell { id: String, row: String, col: String, content: String, row_height: Option<f64> }`
  - `Command::InsertTableLine { id: String, axis: TableAxis, at: u32 }`
  - `Command::RemoveTableLine { id: String, axis: TableAxis, line: String }`
  - `Command::SetTableSizes { id: String, col_width: f64, row_height: f64 }`
  - `Command::SetTableFill { id: String, row: String, col: String, fill: Option<String> }`
  - `CommandError::BadTable`, message exact : `tableau invalide (1 à 64 lignes et colonnes, tailles finies > 0, couleur valide, ligne ou colonne existante, au moins une ligne et une colonne attendues)`
    (recopié tel quel par T3 dans `fake-core.ts`).
  - Chaque commande réussie rend `Change { pages: [page], ids: [id du tableau], .. }`.
- Réutilise : `crates/roomboard-core/src/rich_text.rs:254` — `apply_text_diff(txn, &TextRef, &str)` (texte d'une
  cellule sans tout remplacer).
- Réutilise : `crates/roomboard-core/src/rich_text.rs:54` — `valid_color(&str)` (couleur d'`AddTable`, `fill`).
- Réutilise : `crates/roomboard-core/src/commands.rs:778-790` ; `document.rs:369` — `done(Change)`, `unchanged()`,
  `transact_local()` (une commande = une étape, aucune étape vide).
- Réutilise : `crates/roomboard-core/src/document.rs:463` ; `commands.rs:410` — `find_element(txn, id)`,
  `page_elements_or_err(page)`.
- Réutilise : `crates/roomboard-core/src/element.rs:185` — `transform_to_any(&Transform)` (matrice d'`AddTable`).
- Réutilise : `crates/roomboard-core/src/commands.rs:2899` (`grid_reload_keeps_bytes`) ; `tests/element_inconnu.rs`
  (`regenerate`, `fixture`) — patrons « recharger garde les octets » et fixture régénérée.
- Réutilise : `crates/roomboard-core/src/element.rs:27` ; `document.rs:247` ; `query.rs:112` — `KNOWN_KINDS`,
  `Document::element`, `element_geom` : garde `every_known_kind_has_view_and_geom` (I3).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
cargo test -p roomboard-core 2>&1 | grep -E "test result|FAILED|panicked|error\[|table|every_known" | tail -60
```

Attendu : aucun `FAILED` ni `error[` ; au moins 22 lignes de tests `table` (7 de T1, 10 neufs dans `table::tests`, 2 dans
`tests/tableau.rs`, 3 dans `element_inconnu`) dont `table_reload_keeps_bytes`, `table_fixture_resaves_identically` ;
`every_known_kind_has_view_and_geom ... ok`. À garder verts : `grid_reload_keeps_bytes`,
`socle_fixture_resaves_identically`, les tests de `scenarios.rs` (`cargo test -p roomboard-core 2>&1 | grep -E "grid_reload|socle_fixture|test result"`).

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`,
  `#[ignore]`), aucun seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/target .)`.
- GC5 Preuve bornée : la commande ci-dessus, telle quelle ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle ; jamais GPL, LGPL ni AGPL.
- GC8 Plafond Wasm H2-13 inchangé : 1 572 864 octets, contrôle de `scripts/verifier.sh` non modifié (le cœur grossit le
  module : rien de lourd ajouté, aucune dépendance) ; mesure détaillée seulement au-delà de 1 400 000 octets (T6).
- GC9 Format : `schema` et `formatVersion` restent 1 ; aucune `Any::Map` ; C10a n'écrit jamais `shade`, `span`,
  `mergedInto` ; une commande n'insère que la clé qu'elle change (`text` ou `fill`, `width` ou `height`), les clés
  inconnues restent ; jamais de réécriture d'une cellule en bloc.
- GC10 `crates/` sans dépendance au navigateur.
- GC13 Périmètre : seuls les fichiers ci-dessus.
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.
- GC16 `cargo fmt --all` puis `cargo clippy -p roomboard-core --all-targets -- -D warnings` sans avertissement.

**Interdits.** Ne pas toucher `element.rs`, `query.rs` (faits en T1), ni la liaison Wasm (T6) ; ne pas écrire de cellule
par `MapPrelim` sur une cellule existante (une clé à la fois) ; ne pas modifier le fichier d'état.

**Critère « terminé ».** Commande bornée verte, fixture commitée et relue par `table_fixture_reads_as_a_filled_4x3`,
clippy sans avertissement, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (comme GC4) puis `git log --oneline -3` (le commit de T1 est là).

- [ ] **Étape 2 : tests rouges des commandes.** Ajouter au module `tests` de `table.rs`, après les tests de T1 :

```rust
    use crate::commands::tests::writes;
    use crate::commands::{Change, Command, CommandError};
    use crate::element::StrokeStyle;

    fn add(d: &mut Document, cols: u32, rows: u32) -> String {
        let p = d.page_ids()[0].clone();
        d.apply(Command::AddTable {
            page: p,
            x: 100.0,
            y: 200.0,
            cols,
            rows,
            col_width: 240.0,
            row_height: 64.0,
            color: "#000000".into(),
            size: 36.0,
        })
        .expect("tableau")
        .ids[0]
            .clone()
    }

    fn view(d: &Document, id: &str) -> TableView {
        d.element(id).and_then(|v| v.table).expect("tableau")
    }

    fn set(
        d: &mut Document,
        id: &str,
        row: &str,
        col: &str,
        content: &str,
        h: Option<f64>,
    ) -> Result<Change, CommandError> {
        d.apply(Command::SetTableCell {
            id: id.into(),
            row: row.into(),
            col: col.into(),
            content: content.into(),
            row_height: h,
        })
    }

    #[test]
    fn add_table_writes_its_shape_in_one_step() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let c = d
            .apply(Command::AddTable {
                page: p.clone(),
                x: 100.0,
                y: 200.0,
                cols: 4,
                rows: 3,
                col_width: 240.0,
                row_height: 64.0,
                color: "#1d4ed8".into(),
                size: 36.0,
            })
            .expect("tableau");
        assert_eq!(c.pages, vec![p]);
        let id = c.ids[0].clone();
        let v = d.element(&id).expect("vue");
        assert_eq!((v.kind.as_str(), v.transform), ("table", [1.0, 0.0, 0.0, 1.0, 100.0, 200.0]));
        let t = v.table.expect("tableau");
        assert_eq!((t.color.as_str(), t.size, t.cols.len(), t.rows.len()), ("#1d4ed8", 36.0, 4, 3));
        assert!(t.cols.iter().all(|c| c.width == 240.0) && t.rows.iter().all(|r| r.height == 64.0));
        assert!(t.cells.is_empty());
        assert_eq!(
            d.bounds(&[id.clone()]),
            Some(Bounds { x0: 100.0, y0: 200.0, x1: 1060.0, y1: 392.0 })
        );
        {
            let txn = d.read();
            let e = d.find_element(&txn, &id).expect("élément").element;
            for k in ["shade", "span", "mergedInto"] {
                assert!(e.get(&txn, k).is_none(), "{k} jamais écrit par C10a");
            }
            assert!(matches!(e.get(&txn, "cells"), Some(Out::YMap(_))));
        }
        assert!(d.can_undo());
        assert!(d.undo());
        assert!(d.element(&id).is_none());
    }

    #[test]
    fn add_table_refuses_bad_input_without_writing() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let cmd = |cols: u32, rows: u32, sizes: [f64; 3], color: &str, x: f64| Command::AddTable {
            page: p.clone(),
            x,
            y: 0.0,
            cols,
            rows,
            col_width: sizes[0],
            row_height: sizes[1],
            color: color.into(),
            size: sizes[2],
        };
        let ok = [240.0, 64.0, 36.0];
        let w = writes(&d);
        for c in [
            cmd(0, 2, ok, "#000000", 0.0),
            cmd(65, 2, ok, "#000000", 0.0),
            cmd(2, 0, ok, "#000000", 0.0),
            cmd(2, 65, ok, "#000000", 0.0),
            cmd(2, 2, [f64::NAN, 64.0, 36.0], "#000000", 0.0),
            cmd(2, 2, [240.0, 0.0, 36.0], "#000000", 0.0),
            cmd(2, 2, [240.0, 64.0, -1.0], "#000000", 0.0),
            cmd(2, 2, ok, "!!", 0.0),
            cmd(2, 2, ok, "#000000", f64::INFINITY),
        ] {
            assert_eq!(d.apply(c), Err(CommandError::BadTable));
        }
        assert_eq!(w.since(), 0, "aucune transaction sur un refus");
        assert!(!d.can_undo());
        assert_eq!(
            d.apply(Command::AddTable {
                page: "zz".into(),
                x: 0.0,
                y: 0.0,
                cols: 2,
                rows: 2,
                col_width: 240.0,
                row_height: 64.0,
                color: "#000000".into(),
                size: 36.0,
            }),
            Err(CommandError::UnknownPage("zz".into()))
        );
        assert!(d.apply(cmd(64, 64, ok, "#000000", 0.0)).is_ok());
    }

    #[test]
    fn set_cell_writes_text_and_grows_only_its_row() {
        let mut d = Document::blank();
        let id = add(&mut d, 2, 2);
        let t = view(&d, &id);
        let (r0, r1, c0) = (t.rows[0].id.clone(), t.rows[1].id.clone(), t.cols[0].id.clone());
        set(&mut d, &id, &r0, &c0, "Lundi", Some(61.0)).expect("texte");
        let t = view(&d, &id);
        assert_eq!((t.cells.len(), t.cells[0].text.as_str(), t.rows[0].height), (1, "Lundi", 64.0));
        let c = set(&mut d, &id, &r0, &c0, "Lundi et un long texte", Some(150.0)).expect("plus haut");
        assert_eq!(c.ids, vec![id.clone()]);
        let t = view(&d, &id);
        assert_eq!((t.rows[0].height, t.rows[1].height), (150.0, 64.0));
        let w = writes(&d);
        let v = d.version();
        assert_eq!(set(&mut d, &id, &r0, &c0, "Lundi et un long texte", Some(100.0)).expect("inchangé").version, v);
        assert_eq!(set(&mut d, &id, &r1, &c0, "", None).expect("vide").version, v);
        assert_eq!(w.since(), 0, "aucune transaction sans effet (D38)");
        assert!(d.undo());
        let t = view(&d, &id);
        assert_eq!((t.cells[0].text.as_str(), t.rows[0].height), ("Lundi", 64.0));
    }

    #[test]
    fn set_cell_keeps_its_unknown_keys() {
        let mut d = Document::blank();
        let id = add(&mut d, 2, 2);
        let t = view(&d, &id);
        let (r, c) = (t.rows[0].id.clone(), t.cols[0].id.clone());
        set(&mut d, &id, &r, &c, "Lundi", None).expect("texte");
        {
            let mut txn = d.transact_local();
            let e = d.find_element(&txn, &id).expect("élément").element;
            let Some(Out::YMap(cells)) = e.get(&txn, "cells") else { panic!("cells") };
            let Some(Out::YMap(cell)) = cells.get(&txn, &cell_key(&r, &c)) else { panic!("cellule") };
            cell.insert(&mut txn, "shade", In::Any(Any::Bool(true)));
        }
        set(&mut d, &id, &r, &c, "Lundi soir", None).expect("texte");
        assert_eq!(view(&d, &id).cells[0].text, "Lundi soir");
        let txn = d.read();
        let e = d.find_element(&txn, &id).expect("élément").element;
        let Some(Out::YMap(cells)) = e.get(&txn, "cells") else { panic!("cells") };
        let Some(Out::YMap(cell)) = cells.get(&txn, &cell_key(&r, &c)) else { panic!("cellule") };
        assert!(matches!(cell.get(&txn, "shade"), Some(Out::Any(Any::Bool(true)))), "clé C10b gardée");
        assert!(matches!(cell.get(&txn, "text"), Some(Out::YText(_))));
    }

    #[test]
    fn set_cell_refuses_unknown_line_and_non_table() {
        let mut d = Document::blank();
        let id = add(&mut d, 2, 2);
        let t = view(&d, &id);
        let (row, col) = (t.rows[0].id.clone(), t.cols[0].id.clone());
        let p = d.page_ids()[0].clone();
        let s = d
            .apply(Command::CommitStroke {
                page: p,
                points: vec![10.0, 10.0, 0.5, 20.0, 20.0, 0.5],
                style: StrokeStyle { color: "#000000".into(), width: 4.0 },
            })
            .expect("trait")
            .ids[0]
            .clone();
        assert_eq!(set(&mut d, &id, "absente", &col, "x", None), Err(CommandError::BadTable));
        assert_eq!(set(&mut d, &id, &row, "absente", "x", None), Err(CommandError::BadTable));
        assert_eq!(set(&mut d, &id, &row, &col, "x", Some(0.0)), Err(CommandError::BadTable));
        assert_eq!(set(&mut d, &s, &row, &col, "x", None), Err(CommandError::UnknownElement(s.clone())));
        assert_eq!(
            set(&mut d, "nulle-part", &row, &col, "x", None),
            Err(CommandError::UnknownElement("nulle-part".into()))
        );
    }

    #[test]
    fn insert_line_copies_its_neighbour_and_respects_bounds() {
        let mut d = Document::blank();
        let id = add(&mut d, 2, 2);
        let t = view(&d, &id);
        let (r0, c0) = (t.rows[0].id.clone(), t.cols[0].id.clone());
        set(&mut d, &id, &r0, &c0, "haut", Some(150.0)).expect("haut");
        let ins = |d: &mut Document, axis: TableAxis, at: u32| {
            d.apply(Command::InsertTableLine { id: id.clone(), axis, at })
        };
        assert_eq!(ins(&mut d, TableAxis::Row, 0).expect("en tête").ids, vec![id.clone()]);
        let t = view(&d, &id);
        assert_eq!(t.rows.iter().map(|r| r.height).collect::<Vec<_>>(), vec![150.0, 150.0, 64.0]);
        assert_eq!(t.rows[1].id, r0);
        ins(&mut d, TableAxis::Col, 2).expect("à droite");
        let t = view(&d, &id);
        assert_eq!(t.cols.iter().map(|c| c.width).collect::<Vec<_>>(), vec![240.0, 240.0, 240.0]);
        assert_eq!(t.cells.len(), 1, "les cellules suivent leurs ids");
        assert_eq!(ins(&mut d, TableAxis::Row, 4), Err(CommandError::BadTable));
        let full = add(&mut d, 1, 64);
        assert_eq!(
            d.apply(Command::InsertTableLine { id: full, axis: TableAxis::Row, at: 64 }),
            Err(CommandError::BadTable)
        );
    }

    #[test]
    fn remove_line_drops_its_cells_and_keeps_the_last_one() {
        let mut d = Document::blank();
        let id = add(&mut d, 2, 2);
        let t = view(&d, &id);
        for r in &t.rows {
            for c in &t.cols {
                set(&mut d, &id, &r.id, &c.id, &format!("{}{}", r.id, c.id), None).expect("texte");
            }
        }
        let rm = |d: &mut Document, axis: TableAxis, line: &str| {
            d.apply(Command::RemoveTableLine { id: id.clone(), axis, line: line.into() })
        };
        rm(&mut d, TableAxis::Row, &t.rows[0].id).expect("ligne");
        let v = view(&d, &id);
        assert_eq!((v.rows.len(), v.cells.len()), (1, 2));
        assert!(v.cells.iter().all(|c| c.row == t.rows[1].id));
        {
            let txn = d.read();
            let e = d.find_element(&txn, &id).expect("élément").element;
            let Some(Out::YMap(cells)) = e.get(&txn, "cells") else { panic!("cells") };
            assert_eq!(cells.len(&txn), 2, "clés de la ligne retirée effacées");
        }
        assert_eq!(rm(&mut d, TableAxis::Row, &t.rows[1].id), Err(CommandError::BadTable));
        assert_eq!(rm(&mut d, TableAxis::Col, "absente"), Err(CommandError::BadTable));
        rm(&mut d, TableAxis::Col, &t.cols[1].id).expect("colonne");
        assert_eq!(view(&d, &id).cells.len(), 1);
        assert!(d.undo());
        assert_eq!(view(&d, &id).cols.len(), 2);
    }

    #[test]
    fn set_sizes_uniforms_and_skips_when_uniform() {
        let mut d = Document::blank();
        let id = add(&mut d, 3, 2);
        let t = view(&d, &id);
        set(&mut d, &id, &t.rows[0].id, &t.cols[0].id, "x", Some(150.0)).expect("haut");
        d.apply(Command::SetTableSizes { id: id.clone(), col_width: 200.0, row_height: 107.0 }).expect("uniforme");
        let v = view(&d, &id);
        assert!(v.cols.iter().all(|c| c.width == 200.0) && v.rows.iter().all(|r| r.height == 107.0));
        let w = writes(&d);
        let ver = d.version();
        assert_eq!(
            d.apply(Command::SetTableSizes { id: id.clone(), col_width: 200.0, row_height: 107.0 })
                .expect("même")
                .version,
            ver
        );
        assert_eq!(w.since(), 0);
        assert_eq!(
            d.apply(Command::SetTableSizes { id, col_width: 0.0, row_height: 64.0 }),
            Err(CommandError::BadTable)
        );
    }

    #[test]
    fn set_fill_sets_skips_and_clears() {
        let mut d = Document::blank();
        let id = add(&mut d, 2, 2);
        let t = view(&d, &id);
        let (r, c) = (t.rows[1].id.clone(), t.cols[1].id.clone());
        let fill = |d: &mut Document, f: Option<&str>| {
            d.apply(Command::SetTableFill {
                id: id.clone(),
                row: r.clone(),
                col: c.clone(),
                fill: f.map(str::to_string),
            })
        };
        fill(&mut d, Some("#fef08a")).expect("jaune");
        assert_eq!(
            view(&d, &id).cells,
            vec![TableCellView { row: r.clone(), col: c.clone(), text: String::new(), fill: Some("#fef08a".into()) }]
        );
        let w = writes(&d);
        let v = d.version();
        assert_eq!(fill(&mut d, Some("#fef08a")).expect("même").version, v);
        assert_eq!(w.since(), 0);
        fill(&mut d, None).expect("aucun");
        assert!(view(&d, &id).cells.is_empty());
        assert_eq!(fill(&mut d, Some("pas une couleur !")), Err(CommandError::BadTable));
    }

    /// S3 : enregistrer, recharger, réenregistrer : mêmes octets, même vue (patron `grid_reload_keeps_bytes`).
    #[test]
    fn table_reload_keeps_bytes() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-20T00:00:00Z".into(),
            created: None,
        };
        let mut d = Document::blank();
        let id = add(&mut d, 4, 3);
        let t = view(&d, &id);
        for (i, r) in t.rows.iter().enumerate() {
            for (j, c) in t.cols.iter().enumerate() {
                set(&mut d, &id, &r.id, &c.id, &format!("L{i}C{j}"), None).expect("texte");
            }
        }
        d.apply(Command::SetTableFill {
            id: id.clone(),
            row: t.rows[0].id.clone(),
            col: t.cols[0].id.clone(),
            fill: Some("#bbf7d0".into()),
        })
        .expect("vert");
        d.apply(Command::InsertTableLine { id: id.clone(), axis: TableAxis::Col, at: 4 }).expect("colonne");
        let want = view(&d, &id);
        let file = save(&load(&save(&d, &meta).expect("save")).expect("load"), &meta).expect("resave");
        for i in 0..30 {
            let r = load(&file).expect("load");
            assert_eq!(view(&r, &id), want, "vue au rechargement {i}");
            assert!(save(&r, &meta).expect("resave") == file, "fichier différent au rechargement {i}");
        }
    }

    #[test]
    fn one_command_is_one_undo_step() {
        let mut d = Document::blank();
        let id = add(&mut d, 2, 2);
        let before = view(&d, &id);
        d.apply(Command::InsertTableLine { id: id.clone(), axis: TableAxis::Row, at: 2 }).expect("ligne");
        let after = view(&d, &id);
        assert!(d.undo());
        assert_eq!(view(&d, &id), before);
        assert!(d.redo());
        assert_eq!(view(&d, &id), after);
    }
```

Ajouter `use crate::table::TableAxis;` n'est pas utile (même module : `super::*`). Vérifier rouge :
`cargo test -p roomboard-core table:: 2>&1 | grep -E "error\[|test result" | head` — attendu : `error[E0599]` ou
`E0559` (variantes `AddTable`… absentes).

- [ ] **Étape 3 : `commands.rs` — variantes, erreur, bras courts, aides `pub(crate)`.** Dans `enum Command`, après
  `SetGrid { … }` :

```rust
    /// Tableau (U32, C10a, T3) : `cols` × `rows` (1 à 64), colonnes et lignes à la taille donnée ; coin en (x, y).
    AddTable {
        page: String,
        x: f64,
        y: f64,
        cols: u32,
        rows: u32,
        col_width: f64,
        row_height: f64,
        color: String,
        size: f64,
    },
    /// Texte d'une cellule (`row`, `col` = ids) ; `row_height` : hauteur exigée mesurée par la page, écrite si plus
    /// grande (T5, DAC2).
    SetTableCell {
        id: String,
        row: String,
        col: String,
        content: String,
        row_height: Option<f64>,
    },
    /// Ligne ou colonne insérée au rang `at` (0..=n), taille copiée de la voisine `at - 1`, sinon de la première.
    InsertTableLine {
        id: String,
        axis: crate::table::TableAxis,
        at: u32,
    },
    /// Ligne ou colonne `line` (id) retirée avec ses cellules ; refusée s'il n'en reste qu'une.
    RemoveTableLine {
        id: String,
        axis: crate::table::TableAxis,
        line: String,
    },
    /// Uniformiser (T11) : toutes les colonnes à `col_width`, toutes les lignes à `row_height` (peut réduire).
    SetTableSizes {
        id: String,
        col_width: f64,
        row_height: f64,
    },
    /// Remplissage d'une cellule (U32) ; `None` le retire.
    SetTableFill {
        id: String,
        row: String,
        col: String,
        fill: Option<String>,
    },
```

Dans `enum CommandError`, après `BadGrid` : `BadTable,`. Dans `Display`, après le bras `BadGrid` :

```rust
            CommandError::BadTable => write!(
                f,
                "tableau invalide (1 à 64 lignes et colonnes, tailles finies > 0, couleur valide, ligne ou colonne existante, au moins une ligne et une colonne attendues)"
            ),
```

Dans `apply`, après le bras `SetGrid` :

```rust
            Command::AddTable {
                page,
                x,
                y,
                cols,
                rows,
                col_width,
                row_height,
                color,
                size,
            } => self.cmd_add_table(&crate::table::NewTable {
                page: &page,
                x,
                y,
                cols,
                rows,
                col_width,
                row_height,
                color: &color,
                size,
            }),
            Command::SetTableCell {
                id,
                row,
                col,
                content,
                row_height,
            } => self.cmd_set_table_cell(&id, (row.as_str(), col.as_str()), &content, row_height),
            Command::InsertTableLine { id, axis, at } => self.cmd_insert_table_line(&id, axis, at),
            Command::RemoveTableLine { id, axis, line } => {
                self.cmd_remove_table_line(&id, axis, &line)
            }
            Command::SetTableSizes {
                id,
                col_width,
                row_height,
            } => self.cmd_set_table_sizes(&id, col_width, row_height),
            Command::SetTableFill { id, row, col, fill } => {
                self.cmd_set_table_fill(&id, (row.as_str(), col.as_str()), fill.as_deref())
            }
```

Passer en `pub(crate)` : `fn page_elements_or_err` (ligne 410), `fn done` et `fn unchanged` (lignes 778-790). Rien
d'autre ne change dans ces aides.

- [ ] **Étape 4 : `table.rs` — les six commandes.** Retirer les trois `#[allow(dead_code)]` de T1. Compléter les
  imports :

```rust
use yrs::{
    Any, Array, ArrayPrelim, ArrayRef, GetString, In, Map, MapPrelim, MapRef, Out, ReadTxn, TextPrelim,
    TextRef, TransactionMut,
};

use crate::commands::{Change, CommandError};
use crate::document::Document;
use crate::element::{finite_positive, out_f64, out_string, out_transform, transform_to_any, Transform};
use crate::rich_text::{self, valid_color};
```

Puis, après `read` :

```rust
/// Axe d'une insertion ou d'une suppression.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TableAxis {
    Row,
    Col,
}

/// Entrée d'`AddTable` (évite une fonction à neuf paramètres).
pub(crate) struct NewTable<'a> {
    pub page: &'a str,
    pub x: f64,
    pub y: f64,
    pub cols: u32,
    pub rows: u32,
    pub col_width: f64,
    pub row_height: f64,
    pub color: &'a str,
    pub size: f64,
}

fn lines_ok(n: u32) -> bool {
    (1..=MAX_TABLE_LINES).contains(&n)
}

fn size_key(axis: TableAxis) -> &'static str {
    match axis {
        TableAxis::Row => "height",
        TableAxis::Col => "width",
    }
}

fn line_prelim(id: &str, key: &'static str, size: f64) -> MapPrelim {
    MapPrelim::from([("id", In::from(id)), (key, In::Any(Any::from(size)))])
}

/// Clé `"<row>:<col>"` dans la ligne (ou colonne) `line` ; découpe au premier `:` (ids `uuid_v4` sans `:`).
fn in_line(key: &str, axis: TableAxis, line: &str) -> bool {
    key.split_once(':').is_some_and(|(r, c)| match axis {
        TableAxis::Row => r == line,
        TableAxis::Col => c == line,
    })
}

/// `cells` du tableau, posé neuf s'il manque ou n'est pas un `Y.Map` (PC12).
fn cells_or_new(txn: &mut TransactionMut, e: &MapRef, cells: Option<&MapRef>) -> MapRef {
    match cells {
        Some(m) => m.clone(),
        None => e.insert(txn, "cells", MapPrelim::default()),
    }
}

impl RawTable {
    fn axis(&self, axis: TableAxis) -> (&[Line], &ArrayRef) {
        match axis {
            TableAxis::Row => (&self.rows, &self.rows_arr),
            TableAxis::Col => (&self.cols, &self.cols_arr),
        }
    }

    fn has_cell(&self, row: &str, col: &str) -> bool {
        self.rows.iter().any(|l| l.id == row) && self.cols.iter().any(|l| l.id == col)
    }
}

impl Document {
    /// Tableau `id` : page, `Y.Map` de l'élément, lecture brute ; absent ou pas un tableau lisible : `UnknownElement`.
    fn table_of(&self, id: &str) -> Result<(String, MapRef, RawTable), CommandError> {
        let txn = self.read();
        let unknown = || CommandError::UnknownElement(id.to_string());
        let found = self.find_element(&txn, id).ok_or_else(unknown)?;
        let raw = read_raw(&txn, &found.element).ok_or_else(unknown)?;
        Ok((found.page_id, found.element, raw))
    }

    fn table_done(&mut self, page: String, id: &str) -> Change {
        self.done(Change {
            pages: vec![page],
            ids: vec![id.to_string()],
            ..Default::default()
        })
    }

    /// `AddTable` (T3) : refus `BadTable` avant la page ; une transaction, cellules vides (`cells` = `Y.Map` vide).
    pub(crate) fn cmd_add_table(&mut self, t: &NewTable<'_>) -> Result<Change, CommandError> {
        let valid = lines_ok(t.cols)
            && lines_ok(t.rows)
            && finite_positive(t.col_width)
            && finite_positive(t.row_height)
            && finite_positive(t.size)
            && t.x.is_finite()
            && t.y.is_finite()
            && valid_color(t.color);
        if !valid {
            return Err(CommandError::BadTable);
        }
        let elements = self.page_elements_or_err(t.page)?;
        let id = yrs::uuid_v4().to_string();
        let cols: Vec<In> = (0..t.cols)
            .map(|_| In::Map(line_prelim(&yrs::uuid_v4().to_string(), "width", t.col_width)))
            .collect();
        let rows: Vec<In> = (0..t.rows)
            .map(|_| In::Map(line_prelim(&yrs::uuid_v4().to_string(), "height", t.row_height)))
            .collect();
        let fields: Vec<(&str, In)> = vec![
            ("id", In::from(id.as_str())),
            ("kind", In::from(TABLE_KIND)),
            ("transform", In::Any(transform_to_any(&[1.0, 0.0, 0.0, 1.0, t.x, t.y]))),
            ("color", In::from(t.color)),
            ("size", In::Any(Any::from(t.size))),
            ("cols", In::Array(ArrayPrelim::from(cols))),
            ("rows", In::Array(ArrayPrelim::from(rows))),
            ("cells", In::Map(MapPrelim::default())),
        ];
        {
            let mut txn = self.transact_local();
            elements.push_back(&mut txn, fields.into_iter().collect::<MapPrelim>());
        }
        Ok(self.table_done(t.page.to_string(), &id))
    }

    /// `SetTableCell` (T3, T5) : texte par différence (`apply_text_diff`) ; hauteur écrite seulement si plus grande ;
    /// même texte sans hauteur plus grande : aucune transaction (D38).
    pub(crate) fn cmd_set_table_cell(
        &mut self,
        id: &str,
        (row, col): (&str, &str),
        content: &str,
        row_height: Option<f64>,
    ) -> Result<Change, CommandError> {
        if row_height.is_some_and(|h| !finite_positive(h)) {
            return Err(CommandError::BadTable);
        }
        let (page, e, raw) = self.table_of(id)?;
        if !raw.has_cell(row, col) {
            return Err(CommandError::BadTable);
        }
        let line = raw.rows.iter().find(|l| l.id == row).ok_or(CommandError::BadTable)?;
        let cell = {
            let txn = self.read();
            read_cell(&txn, raw.cells.as_ref(), row, col)
        };
        let current = cell.as_ref().map_or("", |c| c.content.as_str());
        let grow = row_height.filter(|h| *h > line.size);
        if current == content && grow.is_none() {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            if current != content {
                match &cell {
                    Some(RawCell { text: Some(t), .. }) => rich_text::apply_text_diff(&mut txn, t, content),
                    Some(c) => {
                        c.map.insert(&mut txn, "text", TextPrelim::new(content));
                    }
                    None => {
                        let cells = cells_or_new(&mut txn, &e, raw.cells.as_ref());
                        cells.insert(
                            &mut txn,
                            cell_key(row, col),
                            MapPrelim::from([("text", In::from(TextPrelim::new(content)))]),
                        );
                    }
                }
            }
            if let Some(h) = grow {
                line.map.insert(&mut txn, "height", In::Any(Any::from(h)));
            }
        }
        Ok(self.table_done(page, id))
    }

    /// `InsertTableLine` (T3) : `at` ∈ 0..=n, plafond 64 ; inséré au rang brut de la `at`-ième ligne lisible.
    pub(crate) fn cmd_insert_table_line(
        &mut self,
        id: &str,
        axis: TableAxis,
        at: u32,
    ) -> Result<Change, CommandError> {
        let (page, _, raw) = self.table_of(id)?;
        let (lines, arr) = raw.axis(axis);
        let n = lines.len() as u32;
        if at > n || n >= MAX_TABLE_LINES {
            return Err(CommandError::BadTable);
        }
        let size = lines[at.saturating_sub(1) as usize].size;
        let index = if at == n {
            let txn = self.read();
            arr.len(&txn)
        } else {
            lines[at as usize].index
        };
        let line_id = yrs::uuid_v4().to_string();
        {
            let mut txn = self.transact_local();
            arr.insert(&mut txn, index, line_prelim(&line_id, size_key(axis), size));
        }
        Ok(self.table_done(page, id))
    }

    /// `RemoveTableLine` (T3) : la ligne et ses cellules dans la même transaction ; dernière ligne refusée.
    pub(crate) fn cmd_remove_table_line(
        &mut self,
        id: &str,
        axis: TableAxis,
        line: &str,
    ) -> Result<Change, CommandError> {
        let (page, _, raw) = self.table_of(id)?;
        let (lines, arr) = raw.axis(axis);
        let target = lines.iter().find(|l| l.id == line).ok_or(CommandError::BadTable)?;
        if lines.len() <= 1 {
            return Err(CommandError::BadTable);
        }
        let keys: Vec<String> = match &raw.cells {
            Some(cells) => {
                let txn = self.read();
                cells
                    .keys(&txn)
                    .filter(|k| in_line(k, axis, line))
                    .map(str::to_string)
                    .collect()
            }
            None => Vec::new(),
        };
        {
            let mut txn = self.transact_local();
            arr.remove(&mut txn, target.index);
            if let Some(cells) = &raw.cells {
                for k in &keys {
                    cells.remove(&mut txn, k);
                }
            }
        }
        Ok(self.table_done(page, id))
    }

    /// `SetTableSizes` (T11) : écrit seulement les tailles qui changent ; déjà uniforme : aucune transaction.
    pub(crate) fn cmd_set_table_sizes(
        &mut self,
        id: &str,
        col_width: f64,
        row_height: f64,
    ) -> Result<Change, CommandError> {
        if !finite_positive(col_width) || !finite_positive(row_height) {
            return Err(CommandError::BadTable);
        }
        let (page, _, raw) = self.table_of(id)?;
        let cols: Vec<&Line> = raw.cols.iter().filter(|l| l.size != col_width).collect();
        let rows: Vec<&Line> = raw.rows.iter().filter(|l| l.size != row_height).collect();
        if cols.is_empty() && rows.is_empty() {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            for l in cols {
                l.map.insert(&mut txn, "width", In::Any(Any::from(col_width)));
            }
            for l in rows {
                l.map.insert(&mut txn, "height", In::Any(Any::from(row_height)));
            }
        }
        Ok(self.table_done(page, id))
    }

    /// `SetTableFill` (T12) : clé `fill` seule posée ou retirée ; cellule absente : `Y.Map{ text: "", fill }`.
    pub(crate) fn cmd_set_table_fill(
        &mut self,
        id: &str,
        (row, col): (&str, &str),
        fill: Option<&str>,
    ) -> Result<Change, CommandError> {
        if fill.is_some_and(|c| !valid_color(c)) {
            return Err(CommandError::BadTable);
        }
        let (page, e, raw) = self.table_of(id)?;
        if !raw.has_cell(row, col) {
            return Err(CommandError::BadTable);
        }
        let cell = {
            let txn = self.read();
            read_cell(&txn, raw.cells.as_ref(), row, col)
        };
        if cell.as_ref().and_then(|c| c.fill.as_deref()) == fill {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            match (fill, &cell) {
                (Some(f), Some(c)) => {
                    c.map.insert(&mut txn, "fill", In::from(f));
                }
                (Some(f), None) => {
                    let cells = cells_or_new(&mut txn, &e, raw.cells.as_ref());
                    cells.insert(
                        &mut txn,
                        cell_key(row, col),
                        MapPrelim::from([("text", In::from(TextPrelim::new(""))), ("fill", In::from(f))]),
                    );
                }
                (None, Some(c)) => {
                    c.map.remove(&mut txn, "fill");
                }
                (None, None) => {}
            }
        }
        Ok(self.table_done(page, id))
    }
}
```

Si `cells.keys(&txn)` ne compile pas (signature de `Map::keys` à yrs 0.28.1 : `fn keys<'a, T: ReadTxn + 'a>(&'a self, txn: &'a T)`),
garder la même logique avec `cells.iter(&txn).map(|(k, _)| k)`.

- [ ] **Étape 5 : tests verts.** `cargo test -p roomboard-core table:: 2>&1 | grep -E "test result|FAILED|error\[" | tail -20`
  — attendu : 17 tests `ok` (7 de T1 + 10).

- [ ] **Étape 6 : garde I3 dans `document.rs` (rouge si un `kind` n'a pas de fabrique, vert ici).** À la fin du module
  `tests` de `document.rs` :

```rust
    /// I3 (constat `architecture-constats.md:10`) : chaque `kind` de `KNOWN_KINDS` a une vue de son `kind` (jamais
    /// `unknown`) et une boîte ; un `kind` ajouté sans fabrique fait paniquer ce test.
    #[test]
    fn every_known_kind_has_view_and_geom() {
        use crate::asset::AssetRef;
        use crate::commands::Command;
        use crate::element::{StrokeStyle, KNOWN_KINDS};
        use crate::shape::ShapeKind;
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let pen = StrokeStyle { color: "#000000".into(), width: 4.0 };
        for kind in KNOWN_KINDS {
            let cmd = match kind {
                "stroke" => Command::CommitStroke {
                    page: p.clone(),
                    points: vec![10.0, 10.0, 0.5, 60.0, 60.0, 0.5],
                    style: pen.clone(),
                },
                "shape" => Command::AddShape {
                    page: p.clone(),
                    shape: ShapeKind::Rect,
                    x0: 0.0,
                    y0: 0.0,
                    x1: 50.0,
                    y1: 40.0,
                    style: pen.clone(),
                    fill: None,
                },
                "text" => Command::SetText {
                    page: p.clone(),
                    id: None,
                    x: 0.0,
                    y: 0.0,
                    content: "a".into(),
                    color: "#000000".into(),
                    size: 36.0,
                    box_width: 600.0,
                    box_height: 45.0,
                },
                "image" => Command::AddImage {
                    page: p.clone(),
                    asset: AssetRef {
                        id: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad".into(),
                        name: "a.png".into(),
                        mime: "image/png".into(),
                        size: 3.0,
                    },
                    w: 64.0,
                    h: 48.0,
                    matrix: [1.0, 0.0, 0.0, 1.0, 0.0, 0.0],
                },
                "table" => Command::AddTable {
                    page: p.clone(),
                    x: 0.0,
                    y: 0.0,
                    cols: 2,
                    rows: 2,
                    col_width: 240.0,
                    row_height: 64.0,
                    color: "#000000".into(),
                    size: 36.0,
                },
                other => panic!("kind sans fabrique : {other} (ajouter sa commande ici, son bras dans element() et element_geom)"),
            };
            let id = d.apply(cmd).expect(kind).ids[0].clone();
            assert_eq!(d.element(&id).map(|v| v.kind), Some(kind.to_string()), "vue de {kind}");
            assert!(d.bounds(&[id]).is_some(), "boîte de {kind}");
        }
    }
```

Lancer `cargo test -p roomboard-core every_known 2>&1 | grep -E "test result|FAILED"` — attendu : `1 passed`.

- [ ] **Étape 7 : fixture et son test.** Créer `crates/roomboard-core/tests/tableau.rs` :

```rust
//! Fixture `tableau-4x3.roomboard` (C10a) : un 4 × 3 rempli et une cellule jaune, écrit par `format::save` après un
//! rechargement (aucun historique), pour C10b et les versions suivantes. Régénérée par
//! `ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test tableau -- --test-threads=1`.
use std::path::PathBuf;

use roomboard_core::commands::Command;
use roomboard_core::document::Document;
use roomboard_core::format::{load, save, SaveMeta};

const TEXTS: [&str; 12] = [
    "Lundi", "Mardi", "Mercredi", "Jeudi", "Maths", "Français", "Histoire", "Sport", "Anglais", "Musique", "Dessin",
    "Sciences",
];

fn fixture() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/tableau-4x3.roomboard")
}

fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-20T00:00:00Z".into(),
        created: None,
    }
}

fn regenerate() -> bool {
    std::env::var("ROOMBOARD_REGENERER_FIXTURES").as_deref() == Ok("1")
}

fn build() -> Document {
    let mut d = Document::blank();
    let p = d.page_ids()[0].clone();
    let id = d
        .apply(Command::AddTable {
            page: p,
            x: 100.0,
            y: 100.0,
            cols: 4,
            rows: 3,
            col_width: 240.0,
            row_height: 64.0,
            color: "#000000".into(),
            size: 36.0,
        })
        .expect("tableau")
        .ids[0]
        .clone();
    let t = d.element(&id).and_then(|v| v.table).expect("vue");
    for (i, text) in TEXTS.iter().enumerate() {
        d.apply(Command::SetTableCell {
            id: id.clone(),
            row: t.rows[i / 4].id.clone(),
            col: t.cols[i % 4].id.clone(),
            content: (*text).into(),
            row_height: None,
        })
        .expect("cellule");
    }
    d.apply(Command::SetTableFill {
        id,
        row: t.rows[0].id.clone(),
        col: t.cols[0].id.clone(),
        fill: Some("#fef08a".into()),
    })
    .expect("jaune");
    d
}

fn bytes() -> Vec<u8> {
    let path = fixture();
    if regenerate() {
        let once = load(&save(&build(), &meta()).expect("save")).expect("load");
        std::fs::write(&path, save(&once, &meta()).expect("resave")).expect("écriture");
    }
    std::fs::read(&path).expect(
        "fixture tableau-4x3.roomboard absente : ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test tableau -- --test-threads=1",
    )
}

#[test]
fn table_fixture_resaves_identically() {
    let b = bytes();
    let d = load(&b).expect("lecture sans erreur");
    assert!(save(&d, &meta()).expect("resave") == b);
}

#[test]
fn table_fixture_reads_as_a_filled_4x3() {
    let d = load(&bytes()).expect("load");
    let p = d.page_ids()[0].clone();
    let id = d
        .element_ids(&p)
        .into_iter()
        .find(|e| d.element(e).is_some_and(|v| v.kind == "table"))
        .expect("un tableau");
    let t = d.element(&id).and_then(|v| v.table).expect("vue");
    assert_eq!((t.cols.len(), t.rows.len()), (4, 3));
    assert_eq!(t.cells.iter().map(|c| c.text.as_str()).collect::<Vec<_>>(), TEXTS.to_vec());
    assert_eq!(t.cells[0].fill.as_deref(), Some("#fef08a"));
}
```

Voir rouge (`fixture … absente`) : `cargo test -p roomboard-core --test tableau 2>&1 | grep -E "absente|test result"`.
Écrire la fixture une fois :
`ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test tableau -- --test-threads=1 2>&1 | grep "test result"`,
puis vert sans la variable : `cargo test -p roomboard-core --test tableau 2>&1 | grep -E "test result|FAILED"` —
attendu : `2 passed`.

- [ ] **Étape 8 : preuve bornée, format, clippy.** Commande bornée de la section ; puis
  `cargo fmt --all && cargo clippy -p roomboard-core --all-targets -- -D warnings 2>&1 | tail -5` (aucun avertissement).

- [ ] **Étape 9 : commit.**

```bash
cd "$WT" && git add crates/roomboard-core/src/table.rs && git add crates/roomboard-core/src/commands.rs && \
git add crates/roomboard-core/src/document.rs && git add crates/roomboard-core/tests/tableau.rs && \
git add crates/roomboard-core/tests/fixtures/tableau-4x3.roomboard && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(core): table commands (add, cell, insert, remove, sizes, fill) and 4x3 fixture" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : N tests, noms vus, et une ligne `Réutilisation :` par ligne `Réutilise :` (sept lignes).

---

<a id="tache-t3"></a>

### Tâche T3 — Contrat TS, fausse liaison du tableau, contrôle de forme

**Objectif.** Le contrat de la page connaît le tableau (T13 du cadrage) : `TableElement`, `TableData`, les six
commandes ; la fausse liaison les joue avec **parité complète** du cœur (mêmes refus dans le même ordre, mêmes
messages, une étape par commande, aucune étape sans effet, tableau mal formé lu comme cadre inconnu
`sourceKind: "table"`) ; l'adaptateur Wasm contrôle la forme d'une vue de tableau (`toTable`). Le contrat commun
« contrat C10a » est écrit ici, joué sur la fausse liaison ; T6 le branche sur le vrai module.

**Fichiers.**
- Modifier : `apps/web/src/core/api.ts:1-10` (en-tête), `:16` (`ElementKind`), `:31-76` (`Command`), `:91-102`
  (`ElementView`), constantes en fin de fichier ; `apps/web/src/core/fake-core.ts:1-17` (en-tête), `:18-44` (imports),
  `:47-66` (`FakeElement`), `:78` (`MESSAGES`), `:91` (`KNOWN_KINDS`), `:203-215` (`worldPolygon`), `:305-510`
  (`apply`), `:515` (`element`), `:682-752` (sauvegarde, lecture) ; `apps/web/src/core/wasm-core.ts:110-165`
  (`toElementView`), `:277-310` (`apply`)
- Tests : `apps/web/src/core/fake-core.test.ts`, `apps/web/src/core/wasm-core.contract.test.ts`

**Interfaces.**
- Consomme : rien (le message `BadTable` est recopié du cadrage et de T2, à l'identique).
- Produit (lu par T4, T6, T7, T8, T9) :

```ts
export type TableAxis = "row" | "col";
export interface TableCol { readonly id: string; readonly width: number }
export interface TableRow { readonly id: string; readonly height: number }
/** Cellule non vide (texte ou remplissage) ; `fill` = remplissage (U32), null sans remplissage. */
export interface TableCell { readonly row: string; readonly col: string; readonly text: string; readonly fill: string | null }
export interface TableData {
  readonly color: string;
  readonly size: number;
  readonly cols: readonly TableCol[];
  readonly rows: readonly TableRow[];
  readonly cells: readonly TableCell[];
}
export interface TableElement extends ElementBase { readonly kind: "table"; readonly table: TableData }
export const TABLE_MAX_LINES = 64;
export const DEFAULT_TABLE_COLOR = "#000000";
export const DEFAULT_TABLE_SIZE = 36;
// Command :
| { readonly type: "AddTable"; readonly page: string; readonly x: number; readonly y: number; readonly cols: number; readonly rows: number; readonly colWidth: number; readonly rowHeight: number; readonly color: string; readonly size: number }
| { readonly type: "SetTableCell"; readonly id: string; readonly row: string; readonly col: string; readonly content: string; readonly rowHeight?: number }
| { readonly type: "InsertTableLine"; readonly id: string; readonly axis: TableAxis; readonly at: number }
| { readonly type: "RemoveTableLine"; readonly id: string; readonly axis: TableAxis; readonly line: string }
| { readonly type: "SetTableSizes"; readonly id: string; readonly colWidth: number; readonly rowHeight: number }
| { readonly type: "SetTableFill"; readonly id: string; readonly row: string; readonly col: string; readonly fill: string | null }
```

  - `fake-core.ts` exporte `KNOWN_KINDS: ReadonlySet<string>` (`stroke`, `shape`, `text`, `image`, `table`).
  - `wasm-core.ts` exporte `toTable(v: unknown): TableData` (interne à `toElementView`, exporté pour les tests).
  - Message `BadTable` (exact) : `tableau invalide (1 à 64 lignes et colonnes, tailles finies > 0, couleur valide, ligne ou colonne existante, au moins une ligne et une colonne attendues)`.
  - Dans `wasm-core.contract.test.ts` : `const c10aFactories` (fausse liaison seule ici, T6 le remplace par `factories`),
    aides `addTable(d, page, over?) → string`, `tableOf(d, id) → TableData`, `TABLE_MESSAGE`.
- Réutilise : `apps/web/src/core/rich-text.ts:55` — `validColor(c)` (couleur d'`AddTable`, `fill`, lecture du JSON).
- Réutilise : `apps/web/src/core/fake-core.ts:92` — `finitePositive(v)` local (aucune troisième copie, constat ouvert).
- Réutilise : `apps/web/src/core/fake-core.ts:91` — `KNOWN_KINDS` étendu de `"table"` (même liste que le cœur).
- Réutilise : `apps/web/src/core/wasm-core.ts:110` ; `api.ts:91-102` — `toElementView` (cas `table`), union `ElementView`.
- Réutilise : `apps/web/src/core/fake-core.ts:305-742` — `apply`, `element`, `savedElement`, `loadElement` : cas `table`
  (étendre, jamais un second document).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/core --reporter=verbose 2>&1 | grep -E "C10a|×|FAIL|Test Files|Tests " | tail -60
```

Attendu : `Tests` sans échec ; au moins 10 lignes `✓ … contrat C10a : fausse liaison`, 2 `contrôle de forme C10a
(tableau)`, 3 `fakeCore — C10a (tableau)`. À garder verts : « fixture élément inconnu (S4, fausse liaison) »,
« contrat commun », « contrat C2 », « contrat C9 » (même commande, aucune ligne `×`). `tsc` vide (GC14).

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`), aucun
  seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/apps/web/src/wasm apps/web/src/` ;
  `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/apps/web/src/wasm-formats apps/web/src/`.
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle ; jamais GPL, LGPL ni AGPL.
- GC9 Format : la fausse liaison n'écrit ni `shade`, ni `span`, ni `mergedInto` ; une commande ne change que la clé
  qu'elle vise.
- GC13 Périmètre : seuls les fichiers ci-dessus.
- GC14 `tsc` : `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"` vide.
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.

**Interdits.** Ne pas appeler le vrai module pour le tableau (les six cas d'`apply` de `wasm-core.ts` lèvent ici, T6
les branche) ; ne pas changer l'ordre ni le sens des contrôles d'une autre commande ; aucune `switch` ajoutée hors
`apply` et `toElementView` (déjà des `switch`).

**Patron à ne pas reprendre.** `apps/web/src/core/fake-core.ts:175-182` (image mal formée → `malformed`, que
`element()` rend `null`, `fake-core.ts:515-517`) : un tableau mal formé deviendrait invisible, contraire à T2 (« jamais
`None` »). Chemin de référence : le cœur après T1, `crates/roomboard-core/src/document.rs` bras `table` → repli
`unknown_view` ; côté fausse liaison, l'objet `FakeUnknown` de `fake-core.ts:47-56` avec `sourceKind: "table"`.
Second patron : `fake-core.ts:404-414` (`SetText` remplace l'objet `text` entier) — ici une commande ne change que la
cellule ou la ligne qu'elle vise, les autres objets du tableau sont repris tels quels.

**Critère « terminé ».** Commande bornée verte avec les blocs attendus, `tsc` vide, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : contrat `api.ts`.** Ajouter à l'en-tête (après la ligne C9) :

```ts
// C10a : AddTable, SetTableCell, InsertTableLine, RemoveTableLine, SetTableSizes, SetTableFill (une étape chacune, D38) ;
// élément table (TableData, cellules non vides dans l'ordre de lecture) ; tableau mal formé : élément unknown, sourceKind "table".
```

`ElementKind` : `"stroke" | "shape" | "text" | "image" | "table" | "unknown"`. Ajouter les six variantes de
`Command` (bloc Produit ci-dessus) après `SetGrid`, chacune précédée d'un commentaire d'une ligne :
`AddTable` « 1 à 64 colonnes et lignes ; coin en (x, y) » ; `SetTableCell` « row, col = ids ; rowHeight : hauteur exigée
mesurée par la page, écrite si plus grande (T5) » ; `InsertTableLine` « at ∈ 0..=n ; taille de la voisine at - 1, sinon
de la première » ; `RemoveTableLine` « retire aussi ses cellules ; refusée s'il n'en reste qu'une » ; `SetTableSizes`
« Uniformiser : toutes les colonnes, toutes les lignes (peut réduire, T11) » ; `SetTableFill` « null retire ». Ajouter
les types `TableAxis`, `TableCol`, `TableRow`, `TableCell`, `TableData`, `TableElement` après `UnknownData`, puis
`ElementView = StrokeElement | ShapeElement | TextElement | ImageElement | TableElement | UnknownElement`, et les trois
constantes après `PAGE_HEIGHT`.

- [ ] **Étape 3 : tests rouges du contrat commun.** Dans `wasm-core.contract.test.ts`, ajouter `Command` et
  `TableData` à l'import de `./api`, puis à la fin du fichier :

```ts
// C10a (tableau) : contrat commun ; T6 remplace `c10aFactories` par `factories` (vrai module branché).
const c10aFactories = factories.filter((x) => x.name === "fausse liaison");
const TABLE_MESSAGE =
  "tableau invalide (1 à 64 lignes et colonnes, tailles finies > 0, couleur valide, ligne ou colonne existante, au moins une ligne et une colonne attendues)";
type AddTableCmd = Extract<Command, { type: "AddTable" }>;
const addTable = (d: CoreDocument, page: string, over: Partial<Omit<AddTableCmd, "type" | "page">> = {}): string => {
  const id = d.apply({ type: "AddTable", page, x: 100, y: 200, cols: 4, rows: 3, colWidth: 240, rowHeight: 64, color: "#000000", size: 36, ...over }).ids[0];
  if (id === undefined) throw new Error("aucun id");
  return id;
};
const tableOf = (d: CoreDocument, id: string): TableData => {
  const v = d.element(id);
  if (v?.kind !== "table") throw new Error(`pas un tableau : ${v?.kind ?? "absent"}`);
  return v.table;
};
const ids2 = (t: TableData): [string, string, string, string] => {
  const [r0, r1] = t.rows;
  const [c0, c1] = t.cols;
  if (!r0 || !r1 || !c0 || !c1) throw new Error("2 × 2 attendu");
  return [r0.id, r1.id, c0.id, c1.id];
};

describe.each(c10aFactories)("contrat C10a : $name", ({ f }) => {
  it("AddTable (S1) : 4 × 3, une étape, vue exacte, boîte et collision ; annuler le retire", () => {
    const d = f.blank();
    const p = first(d);
    const c = d.apply({ type: "AddTable", page: p, x: 100, y: 200, cols: 4, rows: 3, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 });
    expect(c.pages).toEqual([p]);
    const id = c.ids[0] ?? "";
    expect(d.element(id)?.transform).toEqual([1, 0, 0, 1, 100, 200]);
    const t = tableOf(d, id);
    expect([t.color, t.size, t.cols.length, t.rows.length, t.cells]).toEqual(["#000000", 36, 4, 3, []]);
    expect(t.cols.every((x) => x.width === 240) && t.rows.every((x) => x.height === 64)).toBe(true);
    expect(new Set([...t.cols, ...t.rows].map((x) => x.id)).size).toBe(7);
    expect(d.bounds([id])).toEqual({ x0: 100, y0: 200, x1: 1060, y1: 392 });
    expect(d.hitTest(p, 300, 250, 0)).toBe(id);
    expect(d.canUndo()).toBe(true);
    d.undo();
    expect(d.element(id)).toBeNull();
    d.free();
  });

  it("AddTable refusé (BadTable, D38) : dimensions hors 1..=64 ou non entières, tailles, couleur, position ; page inconnue", () => {
    const d = f.blank();
    const p = first(d);
    for (const over of [{ cols: 0 }, { cols: 65 }, { rows: 0 }, { rows: 2.5 }, { colWidth: Number.NaN }, { rowHeight: 0 }, { size: -1 }, { color: "!!" }, { x: Number.POSITIVE_INFINITY }]) {
      unchanged(d, () => expect(messageOf(() => addTable(d, p, over))).toBe(TABLE_MESSAGE));
    }
    expect(messageOf(() => addTable(d, "zz"))).toBe("page inconnue : zz");
    expect(tableOf(d, addTable(d, p, { cols: 64, rows: 64 })).rows).toHaveLength(64);
    d.free();
  });

  it("SetTableCell : texte, ligne agrandie seulement si plus haute, inchangé sans étape (T5, D38)", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 2, rows: 2 });
    const [r0, r1, c0] = ids2(tableOf(d, id));
    d.apply({ type: "SetTableCell", id, row: r0, col: c0, content: "Lundi", rowHeight: 61 });
    expect(tableOf(d, id).cells).toEqual([{ row: r0, col: c0, text: "Lundi", fill: null }]);
    expect(tableOf(d, id).rows.map((r) => r.height)).toEqual([64, 64]);
    expect(d.apply({ type: "SetTableCell", id, row: r0, col: c0, content: "Lundi soir", rowHeight: 150 }).ids).toEqual([id]);
    expect(tableOf(d, id).rows.map((r) => r.height)).toEqual([150, 64]);
    unchanged(d, () => d.apply({ type: "SetTableCell", id, row: r0, col: c0, content: "Lundi soir", rowHeight: 100 }));
    unchanged(d, () => d.apply({ type: "SetTableCell", id, row: r1, col: c0, content: "" }));
    d.undo();
    expect(tableOf(d, id).cells[0]?.text).toBe("Lundi");
    expect(tableOf(d, id).rows[0]?.height).toBe(64);
    d.free();
  });

  it("SetTableCell refusé : ligne, colonne inconnue ou hauteur ≤ 0 (BadTable) ; trait ou id absent (élément inconnu)", () => {
    const d = f.blank();
    const p = first(d);
    const id = addTable(d, p, { cols: 2, rows: 2 });
    const [row, , col] = ids2(tableOf(d, id));
    const s = commit(d, p, 900);
    unchanged(d, () => {
      expect(messageOf(() => d.apply({ type: "SetTableCell", id, row: "absente", col, content: "x" }))).toBe(TABLE_MESSAGE);
      expect(messageOf(() => d.apply({ type: "SetTableCell", id, row, col: "absente", content: "x" }))).toBe(TABLE_MESSAGE);
      expect(messageOf(() => d.apply({ type: "SetTableCell", id, row, col, content: "x", rowHeight: 0 }))).toBe(TABLE_MESSAGE);
      expect(messageOf(() => d.apply({ type: "SetTableCell", id: s, row, col, content: "x" }))).toBe(`élément inconnu : ${s}`);
      expect(messageOf(() => d.apply({ type: "SetTableCell", id: "nulle-part", row, col, content: "x" }))).toBe("élément inconnu : nulle-part");
    });
    d.free();
  });

  it("InsertTableLine : taille de la voisine, en tête et à la fin, ids neufs ; hors bornes et à 64 → BadTable", () => {
    const d = f.blank();
    const p = first(d);
    const id = addTable(d, p, { cols: 2, rows: 2 });
    const [r0, , c0] = ids2(tableOf(d, id));
    d.apply({ type: "SetTableCell", id, row: r0, col: c0, content: "haut", rowHeight: 150 });
    expect(d.apply({ type: "InsertTableLine", id, axis: "row", at: 0 }).ids).toEqual([id]);
    expect(tableOf(d, id).rows.map((r) => r.height)).toEqual([150, 150, 64]);
    expect(tableOf(d, id).rows[1]?.id).toBe(r0);
    d.apply({ type: "InsertTableLine", id, axis: "col", at: 2 });
    expect(tableOf(d, id).cols.map((c) => c.width)).toEqual([240, 240, 240]);
    expect(tableOf(d, id).cells).toHaveLength(1);
    unchanged(d, () => {
      expect(messageOf(() => d.apply({ type: "InsertTableLine", id, axis: "row", at: 4 }))).toBe(TABLE_MESSAGE);
      expect(messageOf(() => d.apply({ type: "InsertTableLine", id, axis: "row", at: -1 }))).toBe(TABLE_MESSAGE);
    });
    const full = addTable(d, p, { cols: 1, rows: 64 });
    unchanged(d, () => expect(messageOf(() => d.apply({ type: "InsertTableLine", id: full, axis: "row", at: 64 }))).toBe(TABLE_MESSAGE));
    d.free();
  });

  it("RemoveTableLine : les cellules de la ligne partent avec elle ; dernière ligne ou ligne absente → BadTable", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 2, rows: 2 });
    const [r0, r1, c0, c1] = ids2(tableOf(d, id));
    for (const row of [r0, r1]) for (const col of [c0, c1]) d.apply({ type: "SetTableCell", id, row, col, content: `${row}/${col}` });
    d.apply({ type: "RemoveTableLine", id, axis: "row", line: r0 });
    expect(tableOf(d, id).rows.map((r) => r.id)).toEqual([r1]);
    expect(tableOf(d, id).cells.map((c) => c.text)).toEqual([`${r1}/${c0}`, `${r1}/${c1}`]);
    unchanged(d, () => {
      expect(messageOf(() => d.apply({ type: "RemoveTableLine", id, axis: "row", line: r1 }))).toBe(TABLE_MESSAGE);
      expect(messageOf(() => d.apply({ type: "RemoveTableLine", id, axis: "col", line: "absente" }))).toBe(TABLE_MESSAGE);
    });
    d.apply({ type: "RemoveTableLine", id, axis: "col", line: c1 });
    expect(tableOf(d, id).cells.map((c) => c.text)).toEqual([`${r1}/${c0}`]);
    d.undo();
    expect(tableOf(d, id).cols).toHaveLength(2);
    d.free();
  });

  it("SetTableSizes (Uniformiser, T11) : toutes à la taille donnée, peut réduire ; déjà uniforme : aucune étape", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 3, rows: 2 });
    const [r0, , c0] = ids2(tableOf(d, id));
    d.apply({ type: "SetTableCell", id, row: r0, col: c0, content: "x", rowHeight: 150 });
    d.apply({ type: "SetTableSizes", id, colWidth: 200, rowHeight: 107 });
    const t = tableOf(d, id);
    expect([t.cols.map((c) => c.width), t.rows.map((r) => r.height)]).toEqual([[200, 200, 200], [107, 107]]);
    unchanged(d, () => d.apply({ type: "SetTableSizes", id, colWidth: 200, rowHeight: 107 }));
    unchanged(d, () => expect(messageOf(() => d.apply({ type: "SetTableSizes", id, colWidth: 0, rowHeight: 64 }))).toBe(TABLE_MESSAGE));
    d.free();
  });

  it("SetTableFill (T12) : pose, même valeur sans étape, null retire ; couleur invalide → BadTable", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 2, rows: 2 });
    const [, r1, , c1] = ids2(tableOf(d, id));
    d.apply({ type: "SetTableFill", id, row: r1, col: c1, fill: "#fef08a" });
    expect(tableOf(d, id).cells).toEqual([{ row: r1, col: c1, text: "", fill: "#fef08a" }]);
    unchanged(d, () => d.apply({ type: "SetTableFill", id, row: r1, col: c1, fill: "#fef08a" }));
    d.apply({ type: "SetTableFill", id, row: r1, col: c1, fill: null });
    expect(tableOf(d, id).cells).toEqual([]);
    unchanged(d, () => expect(messageOf(() => d.apply({ type: "SetTableFill", id, row: r1, col: c1, fill: "pas une couleur !" }))).toBe(TABLE_MESSAGE));
    d.free();
  });

  it("S3 : enregistrer, recharger, réenregistrer : mêmes octets, même vue", () => {
    const d = f.blank();
    const id = addTable(d, first(d));
    const t = tableOf(d, id);
    t.rows.forEach((r, i) => t.cols.forEach((c, j) => d.apply({ type: "SetTableCell", id, row: r.id, col: c.id, content: `L${i}C${j}` })));
    d.apply({ type: "SetTableFill", id, row: t.rows[0]?.id ?? "", col: t.cols[0]?.id ?? "", fill: "#fef08a" });
    const once = f.load(d.save(now, "0.1.0"));
    const bytes = once.save(now, "0.1.0");
    const twice = f.load(bytes);
    expect(twice.save(now, "0.1.0")).toEqual(bytes);
    expect(twice.element(id)).toEqual(d.element(id));
    for (const x of [d, once, twice]) x.free();
  });

  it("un geste = une étape (D11) : annuler l'insertion rend la vue d'avant, rétablir la remet", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 2, rows: 2 });
    const before = tableOf(d, id);
    d.apply({ type: "InsertTableLine", id, axis: "row", at: 2 });
    const after = tableOf(d, id);
    d.undo();
    expect(tableOf(d, id)).toEqual(before);
    d.redo();
    expect(tableOf(d, id)).toEqual(after);
    d.free();
  });
});

describe("contrôle de forme C10a (tableau)", () => {
  const base = { id: "t1", kind: "table", transform: [1, 0, 0, 1, 0, 0] };
  const table = { color: "#000000", size: 36, cols: [{ id: "c1", width: 240 }], rows: [{ id: "r1", height: 64 }], cells: [{ row: "r1", col: "c1", text: "A", fill: undefined }] };
  it("toElementView : tableau contrôlé, fill absent → null", () => {
    expect(toElementView({ ...base, table })).toEqual({ ...base, table: { ...table, cells: [{ row: "r1", col: "c1", text: "A", fill: null }] } });
  });
  it("toElementView : forme fausse → erreur", () => {
    expect(() => toElementView({ ...base })).toThrow("ElementView invalide");
    expect(() => toElementView({ ...base, table: { ...table, cols: "x" } })).toThrow("ElementView invalide");
    expect(() => toElementView({ ...base, table: { ...table, rows: [{ id: "r1", height: 0 }] } })).toThrow("ElementView invalide");
    expect(() => toElementView({ ...base, table: { ...table, cells: [{ row: "r1", col: "c1", text: 3 }] } })).toThrow("ElementView invalide");
    expect(() => toElementView({ ...base, table: { ...table, size: "36" } })).toThrow("ElementView invalide");
  });
});
```

Voir rouge : commande bornée — attendu : `×` sur « contrat C10a » (commande inconnue : `apply` rend `undefined`) et
sur « contrôle de forme C10a » (kind `table` rendu en `unknown`).

- [ ] **Étape 4 : `wasm-core.ts` — `toTable`, cas `table`, six cas d'`apply` qui lèvent.** Ajouter `TableData` à
  l'import de types, puis avant `toElementView` :

```ts
/** Vue d'un tableau venue de Wasm (T13) : forme contrôlée ; `fill` absent (Option::None) → null. */
export function toTable(v: unknown): TableData {
  if (!isRecord(v)) throw new Error(ELEMENT);
  const { color, size, cols, rows, cells } = v;
  if (typeof color !== "string" || typeof size !== "number" || !Array.isArray(cols) || !Array.isArray(rows) || !Array.isArray(cells)) {
    throw new Error(ELEMENT);
  }
  return {
    color,
    size,
    cols: cols.map((c: unknown) => {
      if (!isRecord(c)) throw new Error(ELEMENT);
      const { id, width } = c;
      if (typeof id !== "string" || !finitePositive(width)) throw new Error(ELEMENT);
      return { id, width };
    }),
    rows: rows.map((r: unknown) => {
      if (!isRecord(r)) throw new Error(ELEMENT);
      const { id, height } = r;
      if (typeof id !== "string" || !finitePositive(height)) throw new Error(ELEMENT);
      return { id, height };
    }),
    cells: cells.map((c: unknown) => {
      if (!isRecord(c)) throw new Error(ELEMENT);
      const { row, col, text, fill } = c;
      if (typeof row !== "string" || typeof col !== "string" || typeof text !== "string") throw new Error(ELEMENT);
      if (fill !== undefined && fill !== null && typeof fill !== "string") throw new Error(ELEMENT);
      return { row, col, text, fill: typeof fill === "string" ? fill : null };
    }),
  };
}
```

Dans `toElementView`, avant `case "unknown"` :

```ts
    case "table":
      return { ...base, kind, table: toTable(v["table"]) };
```

Dans `apply`, après `case "SetGrid"` :

```ts
      case "AddTable":
      case "SetTableCell":
      case "InsertTableLine":
      case "RemoveTableLine":
      case "SetTableSizes":
      case "SetTableFill":
        // C10a : branchées sur la liaison Wasm par T6 ; d'ici là le vrai module ne les connaît pas.
        throw new Error(`commande ${cmd.type} : liaison Wasm à venir (C10a, T6)`);
```

- [ ] **Étape 5 : fausse liaison — en-tête, types, aides.** Ajouter à l'en-tête de `fake-core.ts` :

```ts
// C10a : tableau (AddTable, SetTableCell, InsertTableLine, RemoveTableLine, SetTableSizes, SetTableFill) au modèle de
// `table.rs` : mêmes refus dans le même ordre, mêmes messages, une étape par commande, aucune étape sans effet ; vue
// = cellules non vides dans l'ordre de lecture ; tableau mal formé lu comme cadre inconnu (sourceKind "table").
// Écart assumé, hors contrat (PC6) : les entrées illisibles d'un JSON de la fausse liaison sont retirées au
// chargement, là où le cœur les garde dans le document.
```

Imports : ajouter les types `TableAxis, TableCell, TableCol, TableData, TableRow` et les valeurs
`DEFAULT_TABLE_COLOR, DEFAULT_TABLE_SIZE, TABLE_MAX_LINES` de `./api`, et `validColor` de `./rich-text`. Dans
`FakeElement`, après `image` : `readonly table?: FakeTable;`. Après `type RawRecord` :

```ts
/** Cellule de la fausse liaison ; absente du Map = vide. */
interface FakeCell { readonly text: string; readonly fill: string | null }
/** Tableau (C10a) : objets repris tels quels d'une étape à l'autre, sauf ceux qu'une commande change. */
interface FakeTable {
  readonly color: string;
  readonly size: number;
  readonly cols: readonly TableCol[];
  readonly rows: readonly TableRow[];
  /** Clé `<rowId>:<colId>`. */
  readonly cells: ReadonlyMap<string, FakeCell>;
}
```

Dans `MESSAGES`, après `badGrid` :

```ts
  badTable: "tableau invalide (1 à 64 lignes et colonnes, tailles finies > 0, couleur valide, ligne ou colonne existante, au moins une ligne et une colonne attendues)",
```

Remplacer la ligne `KNOWN_KINDS` :

```ts
/** Kinds lus par la fausse liaison : même liste que `KNOWN_KINDS` du cœur (`element.rs`). */
export const KNOWN_KINDS: ReadonlySet<string> = new Set(["stroke", "shape", "text", "image", "table"]);
```

Après `unknownBox` :

```ts
const cellKey = (row: string, col: string): string => `${row}:${col}`;
const validLines = (n: number): boolean => Number.isInteger(n) && n >= 1 && n <= TABLE_MAX_LINES;
const tableWidth = (t: FakeTable): number => t.cols.reduce((s, c) => s + c.width, 0);
const tableHeight = (t: FakeTable): number => t.rows.reduce((s, r) => s + r.height, 0);
/** Clé dans la ligne (ou colonne) `line` : découpe au premier `:`, comme `in_line` du cœur. */
function inLine(key: string, axis: TableAxis, line: string): boolean {
  const i = key.indexOf(":");
  if (i < 0) return false;
  return axis === "row" ? key.slice(0, i) === line : key.slice(i + 1) === line;
}
/** Vue (T13) : cellules non vides dans l'ordre de lecture, comme `RawTable::view`. */
function tableView(t: FakeTable): TableData {
  const cells: TableCell[] = [];
  for (const r of t.rows) {
    for (const c of t.cols) {
      const cell = t.cells.get(cellKey(r.id, c.id));
      if (cell && (cell.text !== "" || cell.fill !== null)) cells.push({ row: r.id, col: c.id, text: cell.text, fill: cell.fill });
    }
  }
  return { color: t.color, size: t.size, cols: t.cols, rows: t.rows, cells };
}
```

Dans `worldPolygon`, avant `: e.unknown` :

```ts
        : e.table
          ? boxPolygon(tableWidth(e.table), tableHeight(e.table))
```

(réindenter la chaîne : `e.image ? … : e.table ? … : e.unknown ? … : null`). Dans `element()`, après la ligne
`if (e.image) …` :

```ts
    if (e.table) return { ...base, kind: "table", table: tableView(e.table) };
```

- [ ] **Étape 6 : fausse liaison — six cas d'`apply`.** Dans la classe, après `unchanged()` :

```ts
  /** Tableau `id` ; absent ou pas un tableau : élément inconnu (ordre du cœur : après les contrôles d'arguments). */
  private tableOf(id: string): { readonly found: Found; readonly t: FakeTable } {
    const found = this.find(id);
    const t = found?.element.table;
    if (!found || !t) throw new Error(`élément inconnu : ${id}`);
    return { found, t };
  }

  /** Une étape : le tableau `id` remplacé par `next` (les autres éléments repris tels quels). */
  private writeTable(found: Found, id: string, next: FakeTable): Change {
    const pageId = found.page.id;
    return this.step((s) => {
      const p = s.pages.find((q) => q.id === pageId);
      const i = p ? p.elements.findIndex((e) => e.id === id) : -1;
      const old = p?.elements[i];
      if (p && old) p.elements[i] = { ...old, table: next };
      return { pages: [pageId], ids: [id], removed: [] };
    });
  }
```

Dans `apply`, après `case "SetGrid"` :

```ts
      case "AddTable": {
        // Ordre du cœur : arguments (BadTable), puis page.
        const ok =
          validLines(cmd.cols) && validLines(cmd.rows) && positive(cmd.colWidth) && positive(cmd.rowHeight) && positive(cmd.size) &&
          Number.isFinite(cmd.x) && Number.isFinite(cmd.y) && validColor(cmd.color);
        if (!ok) throw new Error(MESSAGES.badTable);
        this.pageOf(cmd.page);
        return this.step((s) => {
          const id = newId();
          const table: FakeTable = {
            color: cmd.color,
            size: cmd.size,
            cols: Array.from({ length: cmd.cols }, () => ({ id: newId(), width: cmd.colWidth })),
            rows: Array.from({ length: cmd.rows }, () => ({ id: newId(), height: cmd.rowHeight })),
            cells: new Map(),
          };
          s.pages.find((p) => p.id === cmd.page)?.elements.push({ id, transform: translate(cmd.x, cmd.y), style: NO_STYLE, table });
          return { pages: [cmd.page], ids: [id], removed: [] };
        });
      }
      case "SetTableCell": {
        if (cmd.rowHeight !== undefined && !positive(cmd.rowHeight)) throw new Error(MESSAGES.badTable);
        const { found, t } = this.tableOf(cmd.id);
        const r = t.rows.findIndex((l) => l.id === cmd.row);
        const row = t.rows[r];
        if (!row || !t.cols.some((l) => l.id === cmd.col)) throw new Error(MESSAGES.badTable);
        const key = cellKey(cmd.row, cmd.col);
        const cell = t.cells.get(key);
        const current = cell?.text ?? "";
        const grow = cmd.rowHeight !== undefined && cmd.rowHeight > row.height ? cmd.rowHeight : null;
        if (current === cmd.content && grow === null) return this.unchanged();
        const cells = new Map(t.cells);
        if (current !== cmd.content) cells.set(key, { text: cmd.content, fill: cell?.fill ?? null });
        const rows = grow === null ? t.rows : t.rows.map((l, i) => (i === r ? { ...l, height: grow } : l));
        return this.writeTable(found, cmd.id, { ...t, rows, cells });
      }
      case "InsertTableLine": {
        const { found, t } = this.tableOf(cmd.id);
        const n = cmd.axis === "row" ? t.rows.length : t.cols.length;
        const at = cmd.at;
        if (!Number.isInteger(at) || at < 0 || at > n || n >= TABLE_MAX_LINES) throw new Error(MESSAGES.badTable);
        const near = Math.max(0, at - 1);
        if (cmd.axis === "row") {
          const height = t.rows[near]?.height ?? 0;
          return this.writeTable(found, cmd.id, { ...t, rows: [...t.rows.slice(0, at), { id: newId(), height }, ...t.rows.slice(at)] });
        }
        const width = t.cols[near]?.width ?? 0;
        return this.writeTable(found, cmd.id, { ...t, cols: [...t.cols.slice(0, at), { id: newId(), width }, ...t.cols.slice(at)] });
      }
      case "RemoveTableLine": {
        const { found, t } = this.tableOf(cmd.id);
        const lines: readonly { readonly id: string }[] = cmd.axis === "row" ? t.rows : t.cols;
        if (!lines.some((l) => l.id === cmd.line) || lines.length <= 1) throw new Error(MESSAGES.badTable);
        const cells = new Map([...t.cells].filter(([k]) => !inLine(k, cmd.axis, cmd.line)));
        return this.writeTable(
          found,
          cmd.id,
          cmd.axis === "row" ? { ...t, rows: t.rows.filter((l) => l.id !== cmd.line), cells } : { ...t, cols: t.cols.filter((l) => l.id !== cmd.line), cells },
        );
      }
      case "SetTableSizes": {
        if (!positive(cmd.colWidth) || !positive(cmd.rowHeight)) throw new Error(MESSAGES.badTable);
        const { found, t } = this.tableOf(cmd.id);
        if (t.cols.every((c) => c.width === cmd.colWidth) && t.rows.every((r) => r.height === cmd.rowHeight)) return this.unchanged();
        return this.writeTable(found, cmd.id, {
          ...t,
          cols: t.cols.map((c) => (c.width === cmd.colWidth ? c : { ...c, width: cmd.colWidth })),
          rows: t.rows.map((r) => (r.height === cmd.rowHeight ? r : { ...r, height: cmd.rowHeight })),
        });
      }
      case "SetTableFill": {
        if (cmd.fill !== null && !validColor(cmd.fill)) throw new Error(MESSAGES.badTable);
        const { found, t } = this.tableOf(cmd.id);
        if (!t.rows.some((l) => l.id === cmd.row) || !t.cols.some((l) => l.id === cmd.col)) throw new Error(MESSAGES.badTable);
        const key = cellKey(cmd.row, cmd.col);
        const cell = t.cells.get(key);
        if ((cell?.fill ?? null) === cmd.fill) return this.unchanged();
        const cells = new Map(t.cells);
        cells.set(key, { text: cell?.text ?? "", fill: cmd.fill });
        return this.writeTable(found, cmd.id, { ...t, cells });
      }
```

- [ ] **Étape 7 : fausse liaison — sauvegarde et lecture.** Après `type SavedText` :

```ts
/** Tableau enregistré par la fausse liaison : cellules en objet `<rowId>:<colId>` → cellule. */
interface SavedTable {
  readonly color: string;
  readonly size: number;
  readonly cols: readonly TableCol[];
  readonly rows: readonly TableRow[];
  readonly cells: Readonly<Record<string, FakeCell>>;
}
```

Dans `SavedElement`, après `image?` : `table?: SavedTable | unknown;`. Dans `savedElement`, avant la ligne
`if (e.image) …` :

```ts
  if (e.table) return { id: e.id, kind: "table", transform: [...e.transform], table: { ...e.table, cells: Object.fromEntries(e.table.cells) } };
```

Avant `toMatrix6`, ajouter la lecture tolérante :

```ts
/** Entrées lisibles (T2) : objet avec un `id` texte non vide pas encore vu et `key` fini > 0 ; les autres retirées (PC6). */
function readLines(v: unknown, key: "width" | "height"): { readonly id: string; readonly size: number }[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: { id: string; size: number }[] = [];
  for (const x of v) {
    if (!isRecord(x)) continue;
    const id = x["id"];
    const size = x[key];
    if (typeof id !== "string" || id === "" || seen.has(id) || !finitePositive(size)) continue;
    seen.add(id);
    out.push({ id, size });
  }
  return out;
}

/** Tableau lu comme le cœur (T2) ; null sans ligne ou sans colonne lisible. */
function loadTable(v: unknown): FakeTable | null {
  if (!isRecord(v)) return null;
  const cols = readLines(v["cols"], "width").map((l) => ({ id: l.id, width: l.size }));
  const rows = readLines(v["rows"], "height").map((l) => ({ id: l.id, height: l.size }));
  if (cols.length === 0 || rows.length === 0) return null;
  const cells = new Map<string, FakeCell>();
  const raw = v["cells"];
  if (isRecord(raw)) {
    for (const [k, c] of Object.entries(raw)) {
      if (!isRecord(c)) continue;
      const text = c["text"];
      const fill = c["fill"];
      cells.set(k, { text: typeof text === "string" ? text : "", fill: typeof fill === "string" && validColor(fill) ? fill : null });
    }
  }
  const color = v["color"];
  const size = v["size"];
  return {
    color: typeof color === "string" && validColor(color) ? color : DEFAULT_TABLE_COLOR,
    size: finitePositive(size) ? size : DEFAULT_TABLE_SIZE,
    cols,
    rows,
    cells,
  };
}
```

Dans `loadElement`, juste après le bloc du `kind` inconnu :

```ts
  if (e.kind === "table") {
    // Repli d'un tableau mal formé (T2) : cadre inconnu, jamais invisible ; brut gardé sous `raw.table`, réécrit tel quel.
    const source = e.table ?? e.raw?.["table"];
    const t = loadTable(source);
    const m = toMatrix6(e.transform);
    if (t !== null && m !== null) return { id: e.id, transform: m, style: NO_STYLE, table: t };
    const raw = { table: source };
    const unknown: FakeUnknown = {
      sourceKind: "table",
      raw,
      box: unknownBox(raw),
      hasTransform: m !== null,
      ...(m === null && e.transform !== undefined ? { rawTransform: e.transform } : {}),
    };
    return { id: e.id, transform: m ?? IDENTITY, style: NO_STYLE, unknown };
  }
```

- [ ] **Étape 8 : tests de la fausse liaison.** Dans `fake-core.test.ts`, importer `KNOWN_KINDS` de `./fake-core`
  et `Command` de `./api` (s'ils ne le sont pas), puis à la fin :

```ts
describe("fakeCore — C10a (tableau)", () => {
  const saveJson = (d: CoreDocument): { pages: { elements: Record<string, unknown>[] }[] } =>
    JSON.parse(new TextDecoder().decode(d.save("2026-11-20T00:00:00Z", "0.1.0"))) as { pages: { elements: Record<string, unknown>[] }[] };

  it("chaque kind connu a une vue de son kind et une boîte (pendant de every_known_kind_has_view_and_geom, I3)", () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0] ?? "";
    const pen = { color: "#000000", width: 4 };
    const make: Readonly<Record<string, () => Command>> = {
      stroke: () => ({ type: "CommitStroke", page: p, points: new Float32Array([10, 10, 0.5, 60, 60, 0.5]), style: pen }),
      shape: () => ({ type: "AddShape", page: p, shape: "rect", x0: 0, y0: 0, x1: 50, y1: 40, style: pen, fill: null }),
      text: () => ({ type: "SetText", page: p, id: null, x: 0, y: 0, content: "a", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 }),
      image: () => ({ type: "AddImage", page: p, asset: { id: "ab".repeat(32), name: "a.png", mime: "image/png", size: 3 }, w: 64, h: 48, matrix: [1, 0, 0, 1, 0, 0] }),
      table: () => ({ type: "AddTable", page: p, x: 0, y: 0, cols: 2, rows: 2, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 }),
    };
    for (const kind of KNOWN_KINDS) {
      const build = make[kind];
      if (build === undefined) throw new Error(`kind sans fabrique : ${kind}`);
      const id = d.apply(build()).ids[0] ?? "";
      expect(d.element(id)?.kind, kind).toBe(kind);
      expect(d.bounds([id]), kind).not.toBeNull();
    }
  });

  it("JSON : un tableau enregistré se relit à l'identique, cellules comprises", () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0] ?? "";
    const id = d.apply({ type: "AddTable", page: p, x: 10, y: 20, cols: 2, rows: 1, colWidth: 240, rowHeight: 64, color: "#1d4ed8", size: 36 }).ids[0] ?? "";
    const v = d.element(id);
    if (v?.kind !== "table") throw new Error("tableau");
    d.apply({ type: "SetTableCell", id, row: v.table.rows[0]?.id ?? "", col: v.table.cols[1]?.id ?? "", content: "B" });
    const r = fakeCore.load(d.save("2026-11-20T00:00:00Z", "0.1.0"));
    expect(r.element(id)).toEqual(d.element(id));
    expect(saveJson(r).pages[0]?.elements[0]?.["kind"]).toBe("table");
  });

  it("JSON : tableau mal formé (aucune ligne) : cadre inconnu 100 × 100, réécrit tel quel", () => {
    const json = { pages: [{ id: "p1", elements: [{ id: "t1", kind: "table", transform: [1, 0, 0, 1, 10, 20], table: { cols: [{ id: "c1", width: 240 }], rows: [], cells: {} } }] }] };
    const d = fakeCore.load(new TextEncoder().encode(JSON.stringify(json)));
    expect(d.element("t1")).toEqual({ id: "t1", kind: "unknown", transform: [1, 0, 0, 1, 10, 20], unknown: { sourceKind: "table", w: 100, h: 100 } });
    const again = fakeCore.load(d.save("2026-11-20T00:00:00Z", "0.1.0"));
    expect(again.element("t1")).toEqual(d.element("t1"));
    expect(saveJson(again)).toEqual(saveJson(d));
  });
});
```

(`CoreDocument` est déjà importé par le fichier pour le bloc C9 ; sinon l'ajouter à l'import de `./api`.)

- [ ] **Étape 9 : preuve bornée et `tsc`.** Commande bornée de la section, puis
  `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"` — attendu : rien.

- [ ] **Étape 10 : commit.**

```bash
cd "$WT" && git add apps/web/src/core/api.ts && git add apps/web/src/core/fake-core.ts && \
git add apps/web/src/core/fake-core.test.ts && git add apps/web/src/core/wasm-core.ts && \
git add apps/web/src/core/wasm-core.contract.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web-core): table contract, fake core parity and shape check" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : N tests par bloc, noms vus, une ligne `Réutilisation :` par ligne `Réutilise :` (cinq lignes).

---

<a id="tache-t4"></a>

### Tâche T4 — Contrat du moteur et géométrie des cellules

**Objectif.** Poser, côté page, tout ce que l'outil Tableau (T9), la barre (T8) et le rendu (T7) consomment sans
attendre l'outil : la géométrie pure des cellules (`engine/table-geom.ts`, DAC6 : cellule sous un point, rectangle,
cellule suivante, hauteur exigée par la même mise en lignes que le dessin, tableau le plus haut sous un point même sous
l'encre, I2), `invertMatrix`, le contrat `TableTool` et son branchement dans le moteur : `EngineState.tableCell`,
`Engine.tableAction` / `tableFill`, `prune` après chaque commande et chaque annuler / rétablir (I1), Suppr avec l'outil
Tableau (T7), `ToolContext.stateChanged`, `DrawTool` `"table"`.

**Fichiers.**
- Créer : `apps/web/src/engine/table-geom.ts`, `apps/web/src/engine/table-geom.test.ts`
- Modifier : `apps/web/src/core/shapes.ts:81-90` (`invertMatrix` à côté de `applyMatrix`), `apps/web/src/engine/input/gesture.ts:6`,
  `apps/web/src/engine/tools/tool.ts:9-52`, `apps/web/src/engine/engine.ts:18-34`, `:45-58`, `:60-110`, `:113-121`,
  `:135-170`, `:228-260`, `:265-280`, `:376-388`, `:399-498`
- Tests : `apps/web/src/core/shapes.test.ts`, `apps/web/src/engine/engine.test.ts`, `apps/web/src/app/stage-tags.test.ts`
  (une ligne : `tableCell: null` dans `base`)

**Interfaces.**
- Consomme : types `TableData`, `Matrix`, `Bounds`, `CoreDocument` de `core/api.ts` (T3 écrit `TableData` en parallèle :
  écart `tsc` nommé ci-dessous).
- Produit :

```ts
// engine/table-geom.ts
export const TABLE_COL_WIDTH = 240;
export const TABLE_ROW_HEIGHT = 64;
export const TABLE_PADDING = 8;
export const TABLE_LINE_WIDTH = 2;
export type NavMove = "next" | "prev" | "left" | "right" | "up" | "down";
export type TableAction = "row-insert" | "col-insert" | "row-remove" | "col-remove" | "uniform";
export interface Cell { readonly row: number; readonly col: number }
export interface CellRef { readonly id: string; readonly row: string; readonly col: string }
export interface TableCellState { readonly id: string; readonly row: number; readonly col: number; readonly rows: number; readonly cols: number }
export interface TableHit { readonly id: string; readonly transform: Matrix; readonly table: TableData; readonly cell: Cell }
export function tableAt(doc: Pick<CoreDocument, "elementIds" | "element">, page: string, x: number, y: number): TableHit | null;
export function cellAt(t: TableData, lx: number, ly: number): Cell | null;
export function cellRect(t: TableData, c: Cell): Bounds;
export function cellOf(t: TableData, ref: CellRef): Cell | null;
export function cellContent(t: TableData, rowId: string, colId: string): { readonly text: string; readonly fill: string | null };
export function step(t: TableData, c: Cell, move: NavMove): Cell | "add-row" | null;
export function cellHeight(text: string, size: number, colWidth: number, measure: Measure): number;
export function rowHeightsFor(t: TableData, colWidths: readonly number[], measure: Measure): number[];
// core/shapes.ts
export function invertMatrix(m: Matrix): Matrix | null;
// engine/tools/tool.ts
export interface ToolContext { …; /** L'outil a changé l'état publié (cellule active) sans écrire ; absent = sans effet. */ stateChanged?(): void }
export interface TableTool extends GestureTool {
  cell(): CellRef | null;
  cellState(): TableCellState | null;
  act(a: TableAction): void;
  fill(color: string | null): void;
  /** Suppr, saisie fermée : vide la cellule active ; false sans cellule active ou saisie ouverte. */
  clearCell(): boolean;
  prune(): void;
  /** Tab, Maj+Tab, flèches au bord (DAC3) ; vrai si la touche est prise. */
  navigate(move: NavMove): boolean;
  compositionStart(): void;
  compositionEnd(): void;
  requestCommit(): void;
}
// engine/engine.ts
EngineState.tableCell: TableCellState | null;
ToolFactories.table?(ctx: ToolContext, style: () => TextStyle): TableTool;
Engine.tableAction(a: TableAction): void;
Engine.tableFill(fill: string | null): void;
// engine/input/gesture.ts
export type DrawTool = "pen" | "eraser" | "select" | ShapeKind | "text" | "table";
```

- Réutilise : `apps/web/src/engine/text-layout.ts:206`, `:228` ; `core/rich-text.ts:9` — `layoutRich(plainSpans(texte), { size }, largeur, measure)`,
  `richBoxHeight(lines)`, `plainSpans` (hauteur exigée d'une cellule, la même mise en lignes que le dessin, B1).
- Réutilise : `apps/web/src/core/shapes.ts:81` — `applyMatrix(m, x, y)` ; `invertMatrix(m): Matrix | null` ajouté à
  côté (aucune inversion côté page aujourd'hui).
- Réutilise : `apps/web/src/core/api.ts:131`, `:135` — `CoreDocument.elementIds`, `CoreDocument.element` (tableau le
  plus haut sous un point, sans `hitTest` ni liaison neuve, I2).
- Réutilise : `apps/web/src/engine/tools/tool.ts:49` (`SelectionTool.prune`) ; `engine.ts:244`, `:258` — même forme :
  `TableTool.prune()`, appelé aux deux mêmes endroits (I1).
- Réutilise : aucun module existant (nouveau module, DAC6) — `apps/web/src/engine/table-geom.ts` (`tableAt`, `cellAt`,
  `cellRect`, `step`, `rowHeightsFor`).

**Écart `tsc` nommé (seul admis).** Dans ce worktree seul, `tsc` signale `TableData` absent de `../core/api` et la
comparaison `el?.kind !== "table"` sans recouvrement, dans `src/engine/table-geom.ts`, `src/engine/table-geom.test.ts`
et, par ricochet, `src/engine/tools/tool.ts` (import de types) — rien d'autre. Vérifier :
`pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS" | grep -v -E "table-geom|tools/tool.ts"` vide.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/engine/table-geom.test.ts src/core/shapes.test.ts src/engine/engine.test.ts src/app/stage-tags.test.ts --reporter=verbose 2>&1 | grep -E "C10a|invertMatrix|×|FAIL|Test Files|Tests " | tail -60
```

Attendu : aucun `×` ; au moins 8 lignes `✓ géométrie des cellules (C10a, DAC6)`, 6 `✓ moteur — outil Tableau (C10a,
contrat T4)`, 1 `invertMatrix`. Tests à garder verts : tout `engine.test.ts` (Suppr de la sélection, annuler,
rétablir), `stage-tags.test.ts`.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`), aucun
  seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/apps/web/src/wasm apps/web/src/` ;
  `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/apps/web/src/wasm-formats apps/web/src/`.
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle ; jamais GPL, LGPL ni AGPL.
- GC12 Largeur de page : aucun usage de `PAGE_WIDTH` dans le code neuf.
- GC13 Périmètre : seuls les fichiers ci-dessus.
- GC14 `tsc` : vide sauf l'écart nommé ci-dessus.
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.

**Interdits.** Ne pas écrire l'outil Tableau (T9) ; ne pas changer le comportement de Suppr avec un autre outil que
Tableau ; ne pas toucher `board-session.ts`, `stage-tags.ts` (T11).

**Critère « terminé ».** Commande bornée verte, `tsc` vide hors écart nommé, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : `invertMatrix`, test rouge puis code.** Dans `shapes.test.ts`, ajouter `composeMatrix` et
  `invertMatrix` à l'import de `./shapes`, puis :

```ts
describe("invertMatrix (C10a, miroir de element::invert)", () => {
  it("invertMatrix : m ∘ m⁻¹ = identité ; non inversible ou NaN : null", () => {
    const m = [2, 0.5, -1, 3, 100, 50] as const;
    const inv = invertMatrix(m);
    expect(inv).not.toBeNull();
    const id = composeMatrix(m, inv ?? m);
    [1, 0, 0, 1, 0, 0].forEach((v, i) => expect(id[i]).toBeCloseTo(v, 12));
    expect(invertMatrix([1, 2, 2, 4, 0, 0])).toBeNull();
    expect(invertMatrix([Number.NaN, 0, 0, 1, 0, 0])).toBeNull();
  });
});
```

Code, dans `shapes.ts` après `composeMatrix` :

```ts
/** Inverse de `m` (`element::invert` du cœur) : null si le déterminant est NaN ou de valeur absolue < 1e-12. */
export function invertMatrix(m: Matrix): Matrix | null {
  const det = m[0] * m[3] - m[1] * m[2];
  if (Number.isNaN(det) || Math.abs(det) < 1e-12) return null;
  const a = m[3] / det;
  const b = -m[1] / det;
  const c = -m[2] / det;
  const d = m[0] / det;
  return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
}
```

- [ ] **Étape 3 : tests rouges de la géométrie.** Créer `apps/web/src/engine/table-geom.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { CoreDocument, ElementView, Matrix, TableData } from "../core/api";
import { plainSpans } from "../core/rich-text";
import { cellAt, cellContent, cellHeight, cellOf, cellRect, rowHeightsFor, step, tableAt, TABLE_PADDING } from "./table-geom";
import { layoutRich, richBoxHeight, type Measure } from "./text-layout";

/** 10 unités par caractère à toute taille. */
const narrow: Measure = (s) => s.length * 10;
const T: TableData = {
  color: "#000000",
  size: 36,
  cols: [{ id: "c1", width: 240 }, { id: "c2", width: 100 }],
  rows: [{ id: "r1", height: 64 }, { id: "r2", height: 80 }],
  cells: [{ row: "r2", col: "c1", text: "Lundi", fill: "#fef08a" }],
};
const at = (row: number, col: number) => ({ row, col });
const docOf = (els: ElementView[]): Pick<CoreDocument, "elementIds" | "element"> => ({
  elementIds: () => els.map((e) => e.id),
  element: (id) => els.find((e) => e.id === id) ?? null,
});
const table = (id: string, transform: Matrix): ElementView => ({ id, kind: "table", transform, table: T });
const ink: ElementView = { id: "s", kind: "stroke", transform: [1, 0, 0, 1, 0, 0], style: { color: "#000000", width: 4 } };

describe("géométrie des cellules (C10a, DAC6)", () => {
  it("cellAt : cellule sous un point local ; bords gauche et haut inclus ; hors du tableau ou NaN : null", () => {
    expect(cellAt(T, 0, 0)).toEqual(at(0, 0));
    expect(cellAt(T, 239.9, 63.9)).toEqual(at(0, 0));
    expect(cellAt(T, 240, 64)).toEqual(at(1, 1));
    expect(cellAt(T, 339.9, 143.9)).toEqual(at(1, 1));
    for (const [x, y] of [[-0.1, 10], [10, -0.1], [340, 10], [10, 144], [Number.NaN, 10]] as const) expect(cellAt(T, x, y)).toBeNull();
  });

  it("cellRect : rectangle local d'une cellule", () => {
    expect(cellRect(T, at(0, 0))).toEqual({ x0: 0, y0: 0, x1: 240, y1: 64 });
    expect(cellRect(T, at(1, 1))).toEqual({ x0: 240, y0: 64, x1: 340, y1: 144 });
  });

  it("step : Tab et ←/→ dans l'ordre de lecture, ↑/↓ dans la colonne ; ajout de ligne seulement par Tab en dernière cellule (T8, PC4)", () => {
    expect(step(T, at(0, 1), "next")).toEqual(at(1, 0));
    expect(step(T, at(1, 1), "next")).toBe("add-row");
    expect(step(T, at(0, 1), "right")).toEqual(at(1, 0));
    expect(step(T, at(1, 1), "right")).toBeNull();
    expect(step(T, at(1, 0), "prev")).toEqual(at(0, 1));
    expect(step(T, at(0, 0), "prev")).toBeNull();
    expect(step(T, at(1, 0), "left")).toEqual(at(0, 1));
    expect(step(T, at(0, 0), "left")).toBeNull();
    expect(step(T, at(1, 1), "up")).toEqual(at(0, 1));
    expect(step(T, at(0, 1), "up")).toBeNull();
    expect(step(T, at(0, 1), "down")).toEqual(at(1, 1));
    expect(step(T, at(1, 1), "down")).toBeNull();
  });

  it("cellOf, cellContent : par ids ; ligne disparue : null ; cellule absente : vide", () => {
    expect(cellOf(T, { id: "t", row: "r2", col: "c2" })).toEqual(at(1, 1));
    expect(cellOf(T, { id: "t", row: "r9", col: "c2" })).toBeNull();
    expect(cellContent(T, "r2", "c1")).toEqual({ text: "Lundi", fill: "#fef08a" });
    expect(cellContent(T, "r1", "c1")).toEqual({ text: "", fill: null });
  });

  it("cellHeight : même mise en lignes que le dessin (layoutRich, B1), plus deux marges (T5)", () => {
    expect(cellHeight("", 36, 240, narrow)).toBe(36 * 1.25 + 2 * TABLE_PADDING);
    const text = "aaaaaaaaaa bbbbbbbbbb cccccccccc dddddddddd eeeeeeeeee";
    const want = richBoxHeight(layoutRich(plainSpans(text), { size: 36 }, 240 - 2 * TABLE_PADDING, narrow)) + 2 * TABLE_PADDING;
    expect(cellHeight(text, 36, 240, narrow)).toBe(want);
    expect(want).toBeGreaterThan(2 * 45 + 2 * TABLE_PADDING);
  });

  it("rowHeightsFor : par ligne, la plus haute cellule aux largeurs données (Uniformiser, T11)", () => {
    const long: TableData = { ...T, cells: [{ row: "r1", col: "c2", text: "aaaaaaaaaa bbbbbbbbbb cccccccccc", fill: null }] };
    const h = rowHeightsFor(long, [170, 170], narrow);
    expect(h[0]).toBe(cellHeight("aaaaaaaaaa bbbbbbbbbb cccccccccc", 36, 170, narrow));
    expect(h[1]).toBe(cellHeight("", 36, 170, narrow));
  });

  it("tableAt : le tableau le plus haut sous le point, même sous un trait (I2) ; point ramené au repère du tableau", () => {
    const d = docOf([table("bas", [1, 0, 0, 1, 0, 0]), table("haut", [2, 0, 0, 2, 100, 50]), ink]);
    expect(tableAt(d, "p", 100 + 2 * 250, 50 + 2 * 70)).toMatchObject({ id: "haut", cell: at(1, 1) });
    expect(tableAt(d, "p", 10, 10)).toMatchObject({ id: "bas", cell: at(0, 0), transform: [1, 0, 0, 1, 0, 0] });
    expect(tableAt(d, "p", 5000, 5000)).toBeNull();
  });

  it("tableAt : matrice non inversible sautée", () => {
    const d = docOf([table("bas", [1, 0, 0, 1, 0, 0]), table("plat", [0, 0, 0, 0, 0, 0])]);
    expect(tableAt(d, "p", 10, 10)?.id).toBe("bas");
  });
});
```

Voir rouge : `vitest run src/engine/table-geom.test.ts` — attendu : échec de l'import (`table-geom` absent).

- [ ] **Étape 4 : `engine/table-geom.ts`.**

```ts
/**
 * Géométrie des cellules côté page (C10a, DAC6) : fonctions pures, sans liaison neuve. Le cœur ne connaît que la boîte
 * entière du tableau ; la page trouve le tableau le plus haut sous un point (même recouvert d'encre, I2), la cellule
 * sous un point local, son rectangle, la suivante (T8), et mesure la hauteur qu'exige un texte (DAC2) avec la mise en
 * lignes du dessin (`layoutRich`, B1). Tailles par défaut en unités de page (T4) ; la largeur de page se lit sur la
 * page, jamais ici.
 */
import type { Bounds, CoreDocument, Matrix, TableData } from "../core/api";
import { plainSpans } from "../core/rich-text";
import { applyMatrix, invertMatrix } from "../core/shapes";
import { layoutRich, richBoxHeight, type Measure } from "./text-layout";

export const TABLE_COL_WIDTH = 240;
export const TABLE_ROW_HEIGHT = 64;
/** Marge intérieure d'une cellule : 36 × 1,25 + 2 × 8 = 61 ≤ 64. */
export const TABLE_PADDING = 8;
export const TABLE_LINE_WIDTH = 2;

export type NavMove = "next" | "prev" | "left" | "right" | "up" | "down";
export type TableAction = "row-insert" | "col-insert" | "row-remove" | "col-remove" | "uniform";
/** Cellule par rangs (0 = première ligne, première colonne). */
export interface Cell { readonly row: number; readonly col: number }
/** Cellule active par ids : survit aux insertions et suppressions des autres lignes. */
export interface CellRef { readonly id: string; readonly row: string; readonly col: string }
/** Ce que publie le moteur (barre, `#stage[data-table]`) : rangs et taille du tableau. */
export interface TableCellState { readonly id: string; readonly row: number; readonly col: number; readonly rows: number; readonly cols: number }
export interface TableHit { readonly id: string; readonly transform: Matrix; readonly table: TableData; readonly cell: Cell }

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

/** Rang de la bande qui contient `v` (bord gauche ou haut inclus) ; -1 hors du tableau ou NaN. */
function band(sizes: readonly number[], v: number): number {
  if (!(v >= 0)) return -1;
  let acc = 0;
  for (let i = 0; i < sizes.length; i++) {
    acc += sizes[i] ?? 0;
    if (v < acc) return i;
  }
  return -1;
}

export function cellAt(t: TableData, lx: number, ly: number): Cell | null {
  const col = band(t.cols.map((c) => c.width), lx);
  const row = band(t.rows.map((r) => r.height), ly);
  return col < 0 || row < 0 ? null : { row, col };
}

export function cellRect(t: TableData, c: Cell): Bounds {
  const x0 = sum(t.cols.slice(0, c.col).map((x) => x.width));
  const y0 = sum(t.rows.slice(0, c.row).map((x) => x.height));
  return { x0, y0, x1: x0 + (t.cols[c.col]?.width ?? 0), y1: y0 + (t.rows[c.row]?.height ?? 0) };
}

export function cellOf(t: TableData, ref: CellRef): Cell | null {
  const row = t.rows.findIndex((r) => r.id === ref.row);
  const col = t.cols.findIndex((c) => c.id === ref.col);
  return row < 0 || col < 0 ? null : { row, col };
}

export function cellContent(t: TableData, rowId: string, colId: string): { readonly text: string; readonly fill: string | null } {
  const c = t.cells.find((x) => x.row === rowId && x.col === colId);
  return { text: c?.text ?? "", fill: c?.fill ?? null };
}

/** Le tableau le plus haut sous (x, y) monde, du dessus vers le dessous (I2) ; matrice non inversible : sauté. */
export function tableAt(doc: Pick<CoreDocument, "elementIds" | "element">, page: string, x: number, y: number): TableHit | null {
  const ids = doc.elementIds(page);
  for (let i = ids.length - 1; i >= 0; i--) {
    const id = ids[i];
    if (id === undefined) continue;
    const el = doc.element(id);
    if (el?.kind !== "table") continue;
    const inv = invertMatrix(el.transform);
    if (inv === null) continue;
    const [lx, ly] = applyMatrix(inv, x, y);
    const cell = cellAt(el.table, lx, ly);
    if (cell !== null) return { id, transform: el.transform, table: el.table, cell };
  }
  return null;
}

/** Cellule voisine (T8, PC4) : Tab et ←/→ dans l'ordre de lecture ; ↑/↓ dans la colonne ; Tab en dernière cellule :
 *  "add-row" ; au bord, null. */
export function step(t: TableData, c: Cell, move: NavMove): Cell | "add-row" | null {
  const cols = t.cols.length;
  const count = t.rows.length * cols;
  const flat = c.row * cols + c.col;
  const nth = (i: number): Cell => ({ row: Math.floor(i / cols), col: i % cols });
  if (move === "next") return flat + 1 < count ? nth(flat + 1) : "add-row";
  if (move === "right") return flat + 1 < count ? nth(flat + 1) : null;
  if (move === "prev" || move === "left") return flat > 0 ? nth(flat - 1) : null;
  if (move === "up") return c.row > 0 ? { row: c.row - 1, col: c.col } : null;
  return c.row + 1 < t.rows.length ? { row: c.row + 1, col: c.col } : null;
}

/** Hauteur exigée par `text` dans une colonne de `colWidth` (T5, B1) : lignes du dessin + deux marges. */
export function cellHeight(text: string, size: number, colWidth: number, measure: Measure): number {
  const inner = Math.max(1, colWidth - 2 * TABLE_PADDING);
  return richBoxHeight(layoutRich(plainSpans(text), { size }, inner, measure)) + 2 * TABLE_PADDING;
}

/** Hauteur exigée de chaque ligne aux largeurs `colWidths` (Uniformiser, T11) ; cellule vide : une ligne de texte. */
export function rowHeightsFor(t: TableData, colWidths: readonly number[], measure: Measure): number[] {
  return t.rows.map((r) =>
    Math.max(...t.cols.map((c, i) => cellHeight(cellContent(t, r.id, c.id).text, t.size, colWidths[i] ?? c.width, measure))),
  );
}
```

Vert : `vitest run src/engine/table-geom.test.ts` — attendu : 8 tests `✓`.

- [ ] **Étape 5 : contrat de l'outil.** `gesture.ts:6` :

```ts
export type DrawTool = "pen" | "eraser" | "select" | ShapeKind | "text" | "table";
```

Dans `tools/tool.ts`, ajouter l'import `import type { CellRef, NavMove, TableAction, TableCellState } from "../table-geom";`,
le membre de `ToolContext` (après `requestFrame?`) :

```ts
  /** L'outil a changé ce que publie l'état (cellule active du tableau) sans écrire ; absent = sans effet. */
  stateChanged?(): void;
```

et l'interface `TableTool` du bloc Produit, après `SelectionTool`, précédée de :
`/** Outil Tableau (C10a) : cellule active tenue par ids, retirée par prune quand elle disparaît (I1). */`.

- [ ] **Étape 6 : tests rouges du moteur.** Dans `engine.test.ts`, ajouter les imports
  `import type { TableCellState } from "./table-geom";` et `NO_LIVE, type TableTool` à l'import de `./tools/tool`, puis
  à la fin :

```ts
/** Faux outil Tableau : journalise ; `setCell` change la cellule publiée et prévient le moteur (stateChanged). */
function fakeTableTool(ctx: ToolContext, log: string[]) {
  let cell: TableCellState | null = null;
  let clears = false;
  const tool: TableTool = {
    begin: () => {
      log.push("table.begin");
    },
    extend: () => undefined,
    frame: () => undefined,
    close: () => undefined,
    live: () => NO_LIVE,
    active: () => false,
    cell: () => (cell === null ? null : { id: cell.id, row: "r", col: "c" }),
    cellState: () => cell,
    act: (a) => {
      log.push(`act ${a}`);
    },
    fill: (c) => {
      log.push(`fill ${String(c)}`);
    },
    clearCell: () => {
      log.push("clear");
      return clears;
    },
    prune: () => {
      log.push("prune");
    },
    navigate: () => false,
    compositionStart: () => undefined,
    compositionEnd: () => undefined,
    requestCommit: () => undefined,
  };
  return {
    tool,
    setCell(c: TableCellState | null): void {
      cell = c;
      ctx.stateChanged?.();
    },
    setClears(v: boolean): void {
      clears = v;
    },
  };
}

function setupTable() {
  const doc = fakeCore.blank();
  const frames = new Frames();
  const renderer = new FakeRenderer();
  const log: string[] = [];
  const holder: { t?: ReturnType<typeof fakeTableTool> } = {};
  const tools: ToolFactories = {
    pen: (ctx) => fakeTool("pen", log, ctx),
    eraser: (ctx) => fakeTool("eraser", log, ctx),
    table: (ctx) => {
      holder.t = fakeTableTool(ctx, log);
      return holder.t.tool;
    },
  };
  const engine = createEngine({ doc, renderer, frames, tools });
  const table = holder.t;
  if (table === undefined) throw new Error("outil Tableau non créé");
  return { doc, engine, log, table };
}

describe("moteur — outil Tableau (C10a, contrat T4)", () => {
  const CELL: TableCellState = { id: "t", row: 0, col: 1, rows: 3, cols: 4 };

  it("tableCell : publié par l'outil ; stateChanged émet un état", () => {
    const { engine, table } = setupTable();
    const seen: (TableCellState | null)[] = [];
    engine.onState((s) => seen.push(s.tableCell));
    expect(engine.state().tableCell).toBeNull();
    table.setCell(CELL);
    expect(seen[seen.length - 1]).toEqual(CELL);
    expect(engine.state().tableCell).toEqual(CELL);
  });

  it("prune de l'outil Tableau après chaque commande et chaque annuler / rétablir (I1)", () => {
    const { doc, engine, log } = setupTable();
    engine.run({ type: "AddPage", after: doc.pageIds()[0] ?? null });
    expect(log.filter((l) => l === "prune")).toHaveLength(1);
    engine.undo();
    engine.redo();
    expect(log.filter((l) => l === "prune")).toHaveLength(3);
  });

  it("Suppr avec l'outil Tableau (T7) : pris si l'outil vide une cellule, sinon rien ; autre outil : clearCell jamais appelé", () => {
    const { engine, log, table } = setupTable();
    engine.setTool("table");
    table.setClears(true);
    expect(engine.key(key("Delete"))).toBe(true);
    table.setClears(false);
    expect(engine.key(key("Backspace"))).toBe(false);
    expect(log.filter((l) => l === "clear")).toHaveLength(2);
    engine.setTool("pen");
    expect(engine.key(key("Delete"))).toBe(false);
    expect(log.filter((l) => l === "clear")).toHaveLength(2);
  });

  it("tableAction, tableFill : délégués à l'outil Tableau", () => {
    const { engine, log } = setupTable();
    engine.tableAction("row-insert");
    engine.tableAction("uniform");
    engine.tableFill("#fef08a");
    engine.tableFill(null);
    expect(log.filter((l) => l.startsWith("act") || l.startsWith("fill"))).toEqual(["act row-insert", "act uniform", "fill #fef08a", "fill null"]);
  });

  it("geste avec l'outil Tableau : begin reçu par l'outil", () => {
    const { engine, log } = setupTable();
    engine.setTool("table");
    engine.sink.begin(1, "table", [sample]);
    expect(log).toContain("table.begin");
  });

  it("sans fabrique table : outil inerte, tableCell null, actions et Suppr sans effet", () => {
    const { engine } = setup();
    engine.setTool("table");
    expect(engine.state().tableCell).toBeNull();
    engine.tableAction("uniform");
    engine.tableFill(null);
    expect(engine.key(key("Delete"))).toBe(false);
  });
});
```

Dans `apps/web/src/app/stage-tags.test.ts`, ajouter `tableCell: null,` à `base` (après `error: null,`). Voir rouge :
commande bornée — attendu : échecs `tableAction is not a function`, `tableCell` indéfini.

- [ ] **Étape 7 : branchement du moteur (`engine.ts`).** Imports :

```ts
import type { TableAction, TableCellState } from "./table-geom";
import { NO_LIVE, type GestureTool, type LeaveReason, type LivePart, type SelectionTool, type TableTool, type ToolContext } from "./tools/tool";
```

`EngineState`, après `selectionBounds` :

```ts
  /** Cellule active de l'outil Tableau (C10a) : rangs et taille du tableau ; null sans cellule active. */
  readonly tableCell: TableCellState | null;
```

`ToolFactories`, après `text?` :

```ts
  /** Outil Tableau (C10a) ; absent : outil inerte. */
  table?(ctx: ToolContext, style: () => TextStyle): TableTool;
```

`Engine`, après `setPenStyle` :

```ts
  /** Bouton de structure de la rangée du tableau (C10a, DAC4) : sur la cellule active de l'outil Tableau. */
  tableAction(a: TableAction): void;
  /** Pastille de remplissage (T12) : sur la cellule active ; null retire le remplissage. */
  tableFill(fill: string | null): void;
```

Après `inertSelection` :

```ts
function inertTable(): TableTool {
  return {
    ...inertTool(),
    cell: () => null,
    cellState: () => null,
    act() {},
    fill() {},
    clearCell: () => false,
    prune() {},
    navigate: () => false,
    compositionStart() {},
    compositionEnd() {},
    requestCommit() {},
  };
}
```

Dans `state()`, après `selectionBounds` : `tableCell: tableTool.cellState(),`. Dans `run`, après `selectTool.prune();` :
`tableTool.prune();` ; même ajout dans `history`, après `selectTool.prune();`. Le contexte :

```ts
  const ctx: ToolContext = {
    doc,
    page: () => pageId,
    camera: () => camera,
    run,
    shift: () => shiftHeld,
    alt: () => altHeld,
    requestFrame: requestScene,
    stateChanged: () => emit(),
  };
```

Après la ligne `const selectTool …` :

```ts
  const tableTool: TableTool =
    deps.tools.table?.(ctx, () => ({ color: style.color, size: DEFAULT_TEXT_SIZE })) ?? inertTable();
```

Dans la table `tools`, après `text:` : `table: tableTool,`. Dans `key(e)`, en tête du bloc `if (edit !== null) {` :

```ts
        // T7 : avec l'outil Tableau, Suppr ou Retour arrière (saisie fermée) vide la cellule active ; sinon la sélection.
        if (edit === "delete" && tool === "table" && tableTool.clearCell()) return true;
```

Dans l'objet `engine`, après `setPenStyle(s) { … },` :

```ts
    tableAction(a) {
      tableTool.act(a);
    },
    tableFill(fill) {
      tableTool.fill(fill);
    },
```

- [ ] **Étape 8 : preuve bornée et `tsc`.** Commande bornée de la section ; puis la commande `tsc` de l'écart nommé
  (vide hors `table-geom` et `tools/tool.ts`).

- [ ] **Étape 9 : commit.**

```bash
cd "$WT" && git add apps/web/src/engine/table-geom.ts && git add apps/web/src/engine/table-geom.test.ts && \
git add apps/web/src/core/shapes.ts && git add apps/web/src/core/shapes.test.ts && \
git add apps/web/src/engine/input/gesture.ts && git add apps/web/src/engine/tools/tool.ts && \
git add apps/web/src/engine/engine.ts && git add apps/web/src/engine/engine.test.ts && \
git add apps/web/src/app/stage-tags.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(engine): table cell geometry, TableTool contract and engine wiring" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : N tests, noms vus, l'écart `tsc` constaté (fichiers exacts), une ligne `Réutilisation :` par ligne
`Réutilise :` (cinq lignes).

---

<a id="tache-t5"></a>

### Tâche T5 — Porte IME extraite, zone de saisie (navigation, fond), grille de choix

**Objectif.** Trois briques d'interface que l'outil Tableau (T9) et la session (T11) assemblent : (1) la porte de
validation IME de l'outil Texte extraite dans `engine/tools/commit-gate.ts` (T8 du cadrage), l'outil Texte
l'appelle sans changer de comportement ; (2) la zone de saisie du lot 4 relaie Tab, Maj+Tab et les flèches au bord du
texte par `navigate` (DAC3), jamais pendant une composition, et prend un fond opaque (`TextEditSession.background`,
HC10-10) ; (3) la grille de choix 8 × 8 et sa boîte colonnes, lignes (T6 du cadrage, HC10-1 : « 4 × 3 » = 4 colonnes
× 3 lignes).

**Fichiers.**
- Créer : `apps/web/src/engine/tools/commit-gate.ts`, `apps/web/src/engine/tools/commit-gate.test.ts`,
  `apps/web/src/app/table-picker.ts`, `apps/web/src/app/table-picker.test.ts`
- Modifier : `apps/web/src/engine/tools/text.ts:20-39` (`TextEditSession.background`), `:50-163` (porte extraite),
  `apps/web/src/app/text-editor.ts:14-18`, `:62-67`, `:76-90`
- Tests : `apps/web/src/app/text-editor.test.ts` ; `apps/web/src/engine/tools/text.test.ts` reste vert **sans être
  modifié**

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit :

```ts
// engine/tools/commit-gate.ts
export interface CommitGate { request(): void; compositionStart(): void; compositionEnd(): void; composing(): boolean; reset(): void }
export function createCommitGate(commit: () => void, open: () => boolean): CommitGate;
// engine/tools/text.ts
TextEditSession.background?: string; // fond opaque de la zone (cellule de tableau) ; absent : transparent
// app/text-editor.ts
export type EditorMove = "next" | "prev" | "left" | "right" | "up" | "down"; // même union que NavMove (T4, PC7)
export interface TextEditorEvents { compositionStart(): void; compositionEnd(): void; requestCommit(): void; navigate?(move: EditorMove): boolean }
export function editorMove(e: { readonly key: string; readonly shiftKey?: boolean; readonly ctrlKey?: boolean; readonly metaKey?: boolean; readonly altKey?: boolean }, value: string, start: number, end: number): EditorMove | null;
// app/table-picker.ts
export const PICKER_SIZE = 8;
export const PICKER_MAX = 64;
export const PICKER_CLASS = "rb-table-picker";
export interface TablePickerHost {
  readonly element: HTMLElement;
  /** `at` en px CSS relatifs au parent (la case des scènes : même origine que #stage). */
  open(at: { readonly x: number; readonly y: number }, pick: (cols: number, rows: number) => void): void;
  close(): void;
  isOpen(): boolean;
}
export const pickerLabel = (cols: number, rows: number): string; // "4 × 3"
export const pickerAria = (cols: number, rows: number): string;  // "4 colonnes, 3 lignes"
export const clampLines = (v: number): number;                   // 1..=64, arrondi
export function createTablePicker(parent: HTMLElement): TablePickerHost;
```

  Attributs posés (lus par T12 et T8 pour la CSS) : `.rb-table-picker` (racine, `hidden` fermée),
  `.rb-table-picker-grid`, boutons `data-cols`, `data-rows`, `aria-label` = `pickerAria`, `data-on` sur les cases
  en surbrillance, `[data-picker-label]` (texte `pickerLabel`), formulaire avec deux `input` (`aria-label` « Colonnes »,
  « Lignes ») et un bouton « Créer ».
- Réutilise : `apps/web/src/engine/tools/text.ts:91-98`, `:154-160` — porte IME extraite :
  `engine/tools/commit-gate.ts`, `createCommitGate(commit: () => void, open: () => boolean): { request(): void; compositionStart(): void; compositionEnd(): void; composing(): boolean; reset(): void }`,
  appelée par l'outil Texte (ici) et l'outil Tableau (T9).
- Réutilise : `apps/web/src/app/text-editor.ts:33` ; `engine/tools/text.ts:20-39` — `createTextEditor` (événement
  `navigate?(move): boolean`, fond `background?`), `TextEditSession`, `TextEditorHost` (étendre, DAC3).
- Réutilise : aucun module existant (nouveau module) — `apps/web/src/app/table-picker.ts` : `createTablePicker(parent): TablePickerHost`
  (`.rb-popover` de `rb.css:28` est un panneau de grille, pas un menu au point).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/engine/tools/commit-gate.test.ts src/engine/tools/text.test.ts src/app/text-editor.test.ts src/app/table-picker.test.ts --reporter=verbose 2>&1 | grep -E "C10a|IME|×|FAIL|Test Files|Tests " | tail -60
```

Attendu : aucun `×` ; au moins 4 lignes `✓ porte de validation IME`, 5 `✓ … navigation du tableau`, 6 `✓ grille de
choix du tableau` ; les tests de `text.test.ts` (composition, validation différée, « clic ailleurs pendant la
composition ») et de `text-editor.test.ts` existants restent verts — `git diff --stat` ne montre pas `text.test.ts`.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`), aucun
  seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/apps/web/src/wasm apps/web/src/` ;
  `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/apps/web/src/wasm-formats apps/web/src/`.
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle ; jamais GPL, LGPL ni AGPL.
- GC11 Interface : libellés en français, aucune icône seule (la grille porte des `aria-label`).
- GC13 Périmètre : seuls les fichiers ci-dessus (la CSS de la grille est écrite par T8 dans `rb.css`).
- GC14 `tsc` : `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"` vide.
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.

**Interdits.** Ne pas modifier `text.test.ts` ; l'outil Texte n'implémente pas `navigate` (son Tab garde le
comportement du navigateur) ; aucune règle CSS ici (`rb.css` est à T8) ; ne pas toucher `board-session.ts` (T11).

**Critère « terminé ».** Commande bornée verte, `text.test.ts` inchangé et vert, `tsc` vide, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : test rouge de la porte.** Créer `apps/web/src/engine/tools/commit-gate.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { createCommitGate } from "./commit-gate";

function setup(open = true) {
  let commits = 0;
  let isOpen = open;
  const gate = createCommitGate(() => {
    commits++;
  }, () => isOpen);
  return { gate, commits: () => commits, setOpen: (v: boolean) => (isOpen = v) };
}

describe("porte de validation IME (CL4-3, C10a T8)", () => {
  it("hors composition : request valide tout de suite ; saisie fermée : rien", () => {
    const s = setup();
    s.gate.request();
    expect(s.commits()).toBe(1);
    s.setOpen(false);
    s.gate.request();
    expect(s.commits()).toBe(1);
  });

  it("pendant la composition : request attend compositionend, puis valide une fois", () => {
    const s = setup();
    s.gate.compositionStart();
    expect(s.gate.composing()).toBe(true);
    s.gate.request();
    s.gate.request();
    expect(s.commits()).toBe(0);
    s.gate.compositionEnd();
    expect([s.commits(), s.gate.composing()]).toEqual([1, false]);
    s.gate.compositionEnd();
    expect(s.commits()).toBe(1);
  });

  it("compositionStart sans saisie ouverte : ignoré", () => {
    const s = setup(false);
    s.gate.compositionStart();
    expect(s.gate.composing()).toBe(false);
  });

  it("composition finie sans demande : rien n'est validé", () => {
    const s = setup();
    s.gate.compositionStart();
    s.gate.compositionEnd();
    expect(s.commits()).toBe(0);
  });

  it("reset : composition et demande en attente oubliées", () => {
    const s = setup();
    s.gate.compositionStart();
    s.gate.request();
    s.gate.reset();
    expect(s.gate.composing()).toBe(false);
    s.gate.compositionEnd();
    expect(s.commits()).toBe(0);
  });
});
```

Voir rouge (module absent), puis créer `apps/web/src/engine/tools/commit-gate.ts` :

```ts
/**
 * Porte de validation IME (CL4-3, C10a T8), extraite de l'outil Texte : pendant une composition, toute demande de
 * validation attend `compositionend` ; même règle que `engine/input/keys.ts:27` (la touche appartient à l'IME, D14).
 * Partagée par l'outil Texte et l'outil Tableau.
 */
export interface CommitGate {
  /** Valide tout de suite, ou à la fin de la composition ; rien si aucune saisie n'est ouverte. */
  request(): void;
  compositionStart(): void;
  compositionEnd(): void;
  composing(): boolean;
  /** Saisie ouverte ou fermée : composition et demande en attente oubliées. */
  reset(): void;
}

export function createCommitGate(commit: () => void, open: () => boolean): CommitGate {
  let composing = false;
  /** Validation demandée pendant la composition : jouée à `compositionend`. */
  let pending = false;
  return {
    request() {
      if (!open()) return;
      if (composing) {
        pending = true;
        return;
      }
      commit();
    },
    compositionStart() {
      if (open()) composing = true;
    },
    compositionEnd() {
      composing = false;
      if (pending) {
        pending = false;
        commit();
      }
    },
    composing: () => composing,
    reset() {
      composing = false;
      pending = false;
    },
  };
}
```

Vert : `vitest run src/engine/tools/commit-gate.test.ts` (5 tests).

- [ ] **Étape 3 : l'outil Texte appelle la porte, sans changer de comportement.** Dans `tools/text.ts`, ajouter
  `import { createCommitGate } from "./commit-gate";` et, dans `TextEditSession` après `spans` :

```ts
  /** Fond opaque de la zone (cellule de tableau, C10a HC10-10) ; absent : transparent. */
  readonly background?: string;
```

Remplacer le corps de `createTextTool` (lignes 51-162) par :

```ts
  let session: TextEditSession | null = null;
  let live: LivePart = NO_LIVE;
  /** Porte IME (CL4-3), partagée avec l'outil Tableau : toute validation attend la fin d'une composition. */
  const gate = createCommitGate(() => commit(), () => session !== null);

  /** Écrit la boîte ouverte (une SetText au plus) ; la session est fermée avant `host.close()` (blur réentrant sans effet). */
  function commit(): void {
    const s = session;
    if (!s) return;
    const content = host.value();
    const hadHidden = live.hidden.size > 0;
    session = null;
    gate.reset();
    live = NO_LIVE;
    host.close();
    // La boucle est arrêtée (outil inactif) : sans image, l'id masqué resterait invisible jusqu'au geste suivant.
    if (hadHidden) ctx.requestFrame?.();
    if (s.id === null && content === "") return;
    if (s.id !== null && content === s.initial) return;
    const boxHeight = richBoxHeight(layoutRich(editSpans(s.spans, content), { size: s.size }, s.boxWidth, measure));
    ctx.run({
      type: "SetText",
      page: s.page,
      id: s.id,
      x: s.matrix[4],
      y: s.matrix[5],
      content,
      color: s.color,
      size: s.size,
      boxWidth: s.boxWidth,
      boxHeight,
    });
  }

  const open = (x: number, y: number): void => {
    const page = ctx.page();
    const cam = ctx.camera();
    const hit = ctx.doc.hitTest(page, x, y, TEXT_HIT_TOL_PX / cam.zoom);
    const el = hit === null ? null : ctx.doc.element(hit);
    if (el?.kind === "text") {
      session = {
        page,
        id: el.id,
        matrix: el.transform,
        boxWidth: el.text.boxWidth,
        color: el.style.color,
        size: el.text.size,
        initial: el.text.content,
        spans: el.text.spans,
      };
      live = { ...NO_LIVE, hidden: new Set([el.id]) };
    } else {
      const st = style();
      session = { page, id: null, matrix: [1, 0, 0, 1, x, y], boxWidth: DEFAULT_TEXT_BOX_WIDTH, color: st.color, size: st.size, initial: "", spans: plainSpans("") };
      live = NO_LIVE;
    }
    gate.reset();
    host.open(session, cam);
  };

  return {
    begin(_pointerId, samples) {
      const s = samples[0];
      if (!s) return;
      if (session) {
        gate.request();
        return;
      }
      const [x, y] = screenToWorld(ctx.camera(), s.x, s.y);
      open(x, y);
    },
    extend() {
      // la saisie passe par l'hôte
    },
    frame() {
      // rien à pousser
    },
    close() {
      // le clic a tout fait au begin
    },
    live: () => live,
    active: () => false,
    leave() {
      gate.request();
    },
    editing: () => session,
    composing: () => gate.composing(),
    compositionStart() {
      gate.compositionStart();
    },
    compositionEnd() {
      gate.compositionEnd();
    },
    requestCommit() {
      gate.request();
    },
  };
```

Mettre à jour l'en-tête du fichier : « Composition IME (CL4-3) : toute demande de validation attend `compositionend`
(porte partagée, `commit-gate.ts`) ». Vérifier `text.test.ts` vert sans le modifier :
`vitest run src/engine/tools/text.test.ts` — attendu : tous `✓`, aucun `×`.

- [ ] **Étape 4 : tests rouges de la navigation et du fond.** Dans `app/text-editor.test.ts` : ajouter à `FakeArea`
  les champs `selectionStart = 0;` et `selectionEnd = 0;` ; ajouter `editorMove` à l'import de `./text-editor` ; puis à
  la fin du fichier :

```ts
interface NavKey { key: string; shiftKey: boolean; isComposing: boolean; prevented: boolean; preventDefault(): void }
const navKey = (key: string, shiftKey = false, isComposing = false): NavKey => {
  const e: NavKey = { key, shiftKey, isComposing, prevented: false, preventDefault() { e.prevented = true; } };
  return e;
};

describe("zone de saisie — navigation du tableau (C10a, DAC3)", () => {
  it("editorMove : Tab, Maj+Tab ; Ctrl+Tab et Alt+Tab non pris", () => {
    expect(editorMove({ key: "Tab" }, "ab", 1, 1)).toBe("next");
    expect(editorMove({ key: "Tab", shiftKey: true }, "ab", 1, 1)).toBe("prev");
    expect(editorMove({ key: "Tab", ctrlKey: true }, "ab", 1, 1)).toBeNull();
    expect(editorMove({ key: "Tab", altKey: true }, "ab", 1, 1)).toBeNull();
  });

  it("editorMove : flèches au bord du texte seulement (lignes logiques, HC10-8) ; sélection, Maj, Entrée : rien", () => {
    expect(editorMove({ key: "ArrowLeft" }, "xy", 0, 0)).toBe("left");
    expect(editorMove({ key: "ArrowLeft" }, "xy", 1, 1)).toBeNull();
    expect(editorMove({ key: "ArrowRight" }, "xy", 2, 2)).toBe("right");
    expect(editorMove({ key: "ArrowRight" }, "xy", 1, 1)).toBeNull();
    expect(editorMove({ key: "ArrowUp" }, "a\nb", 1, 1)).toBe("up");
    expect(editorMove({ key: "ArrowUp" }, "a\nb", 3, 3)).toBeNull();
    expect(editorMove({ key: "ArrowDown" }, "a\nb", 2, 2)).toBe("down");
    expect(editorMove({ key: "ArrowDown" }, "a\nb", 1, 1)).toBeNull();
    expect(editorMove({ key: "ArrowRight" }, "xy", 0, 2)).toBeNull();
    expect(editorMove({ key: "ArrowLeft", shiftKey: true }, "xy", 0, 0)).toBeNull();
    expect(editorMove({ key: "Enter" }, "xy", 2, 2)).toBeNull();
  });

  it("keydown : navigate reçoit le mouvement ; touche prise (preventDefault) seulement s'il rend vrai", () => {
    const moves: string[] = [];
    let answer = true;
    const events: TextEditorEvents = { ...recorder().events, navigate: (m) => (moves.push(m), answer) };
    const { area, editor } = mount(() => events);
    editor.open(session, IDENTITY);
    const tab = navKey("Tab");
    area.fire("keydown", tab);
    expect([moves, tab.prevented]).toEqual([["next"], true]);
    answer = false;
    area.value = "xy";
    area.selectionStart = 1;
    area.selectionEnd = 1;
    const left = navKey("ArrowLeft");
    area.fire("keydown", left);
    expect(moves).toEqual(["next"]);
    area.selectionStart = 0;
    area.selectionEnd = 0;
    area.fire("keydown", left);
    expect([moves, left.prevented]).toEqual([["next", "left"], false]);
  });

  it("composition : aucune touche prise, navigate jamais appelé", () => {
    const moves: string[] = [];
    const events: TextEditorEvents = { ...recorder().events, navigate: (m) => (moves.push(m), true) };
    const { area, editor } = mount(() => events);
    editor.open(session, IDENTITY);
    const tab = navKey("Tab", false, true);
    area.fire("keydown", tab);
    expect([moves, tab.prevented]).toEqual([[], false]);
  });

  it("outil sans navigate (outil Texte) : Tab non pris, rien de demandé", () => {
    const r = recorder();
    const { area, editor } = mount(() => r.events);
    editor.open(session, IDENTITY);
    const tab = navKey("Tab");
    area.fire("keydown", tab);
    expect([r.calls, tab.prevented]).toEqual([[], false]);
  });

  it("fond : celui de la session (cellule, HC10-10), transparent sinon", () => {
    const { area, editor } = mount(() => null);
    editor.open({ ...session, background: "#fef08a" }, IDENTITY);
    expect(area.style["background"]).toBe("#fef08a");
    editor.close();
    editor.open(session, IDENTITY);
    expect(area.style["background"]).toBe("transparent");
  });
});
```

Voir rouge : `editorMove` absent, `navigate` jamais appelé, fond inchangé.

- [ ] **Étape 5 : `text-editor.ts`.** Mettre à jour l'en-tête (« Relaie la composition IME, Échap, la perte du focus,
  et pour l'outil Tableau Tab, Maj+Tab et les flèches au bord du texte (`navigate`, C10a DAC3) »). Remplacer
  `TextEditorEvents` et ajouter `EditorMove`, `editorMove` :

```ts
/** Mouvement demandé par la zone (C10a, DAC3) : même union que `NavMove` de `engine/table-geom.ts` (PC7). */
export type EditorMove = "next" | "prev" | "left" | "right" | "up" | "down";

export interface TextEditorEvents {
  compositionStart(): void;
  compositionEnd(): void;
  requestCommit(): void;
  /** Tab, Maj+Tab, flèches au bord du texte ; vrai si l'outil prend la touche. Absent (outil Texte) : rien n'est pris. */
  navigate?(move: EditorMove): boolean;
}

interface MoveKey {
  readonly key: string;
  readonly shiftKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
}

/** Touche → mouvement : Tab (Maj+Tab) toujours ; flèche sans modificateur, curseur sans sélection, au bord du texte
 *  (← au début, → à la fin, ↑ sans saut de ligne avant le curseur, ↓ sans saut de ligne après, HC10-8). */
export function editorMove(e: MoveKey, value: string, start: number, end: number): EditorMove | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (e.key === "Tab") return e.shiftKey ? "prev" : "next";
  if (e.shiftKey || start !== end) return null;
  if (e.key === "ArrowLeft") return start === 0 ? "left" : null;
  if (e.key === "ArrowRight") return start === value.length ? "right" : null;
  if (e.key === "ArrowUp") return value.slice(0, start).includes("\n") ? null : "up";
  if (e.key === "ArrowDown") return value.slice(start).includes("\n") ? null : "down";
  return null;
}
```

Remplacer l'écouteur `keydown` (lignes 62-67) :

```ts
  area.addEventListener("keydown", (e: KeyboardEvent) => {
    // Pendant une composition, toute touche appartient à l'IME (choix d'un candidat, CL4-3) : rien n'est pris.
    if (e.isComposing) return;
    if (e.key === "Escape") {
      e.preventDefault();
      events()?.requestCommit();
      return;
    }
    const move = editorMove(e, area.value, area.selectionStart, area.selectionEnd);
    if (move !== null && events()?.navigate?.(move) === true) e.preventDefault();
  });
```

Dans `open`, après `s.color = session.color;` : `s.background = session.background ?? "transparent";`.

Vert : `vitest run src/app/text-editor.test.ts` — attendu : anciens et nouveaux tests `✓` (le test existant d'Échap
reste vert).

- [ ] **Étape 6 : tests rouges de la grille de choix.** Créer `apps/web/src/app/table-picker.test.ts` :

```ts
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { clampLines, createTablePicker, pickerAria, pickerLabel, PICKER_CLASS } from "./table-picker";

afterEach(() => {
  document.body.innerHTML = "";
});

function setup() {
  const parent = document.createElement("div");
  document.body.append(parent);
  const picker = createTablePicker(parent);
  const pick = vi.fn();
  return { parent, picker, pick, cell: (c: number, r: number) => picker.element.querySelector<HTMLButtonElement>(`button[data-cols="${c}"][data-rows="${r}"]`)! };
}
const key = (el: Element, k: string): void => {
  el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
};

describe("grille de choix du tableau (C10a, T6)", () => {
  it("montée cachée ; open : visible au point, 64 cases, libellés « 4 colonnes, 3 lignes » (HC10-1)", () => {
    const { parent, picker, pick } = setup();
    expect(parent.contains(picker.element)).toBe(true);
    expect(picker.element.classList.contains(PICKER_CLASS)).toBe(true);
    expect(picker.isOpen()).toBe(false);
    picker.open({ x: 120, y: 80 }, pick);
    expect(picker.isOpen()).toBe(true);
    expect([picker.element.style.left, picker.element.style.top]).toEqual(["120px", "80px"]);
    expect(picker.element.querySelectorAll("button[data-cols]")).toHaveLength(64);
    expect(picker.element.querySelector('button[aria-label="4 colonnes, 3 lignes"]')).not.toBeNull();
    expect([pickerLabel(4, 3), pickerAria(1, 1)]).toEqual(["4 × 3", "1 colonne, 1 ligne"]);
  });

  it("survol de 4 × 3 : douze cases en surbrillance et libellé « 4 × 3 » ; clic : pick(4, 3), fermée", () => {
    const { picker, pick, cell } = setup();
    picker.open({ x: 0, y: 0 }, pick);
    cell(4, 3).dispatchEvent(new Event("pointerenter"));
    expect(picker.element.querySelectorAll("button[data-on]")).toHaveLength(12);
    expect(picker.element.querySelector("[data-picker-label]")?.textContent).toBe("4 × 3");
    cell(4, 3).click();
    expect(pick).toHaveBeenCalledWith(4, 3);
    expect(picker.isOpen()).toBe(false);
  });

  it("flèches : surbrillance déplacée, bornée à 8 ; Entrée : crée la surbrillance", () => {
    const { picker, pick } = setup();
    picker.open({ x: 0, y: 0 }, pick);
    const grid = picker.element.querySelector(".rb-table-picker-grid")!;
    for (const k of ["ArrowRight", "ArrowRight", "ArrowDown", "ArrowLeft"]) key(grid, k);
    expect(picker.element.querySelector("[data-picker-label]")?.textContent).toBe("2 × 2");
    for (let i = 0; i < 10; i++) key(grid, "ArrowDown");
    expect(picker.element.querySelector("[data-picker-label]")?.textContent).toBe("2 × 8");
    key(grid, "Enter");
    expect(pick).toHaveBeenCalledWith(2, 8);
  });

  it("Échap : fermée, rien de créé", () => {
    const { picker, pick } = setup();
    picker.open({ x: 0, y: 0 }, pick);
    key(picker.element.querySelector(".rb-table-picker-grid")!, "Escape");
    expect(picker.isOpen()).toBe(false);
    expect(pick).not.toHaveBeenCalled();
  });

  it("boîte colonnes, lignes : « Créer » borne à 1..=64 (T4)", () => {
    const { picker, pick } = setup();
    picker.open({ x: 0, y: 0 }, pick);
    const [cols, rows] = [...picker.element.querySelectorAll<HTMLInputElement>("form input")];
    cols!.value = "70";
    rows!.value = "0";
    picker.element.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(pick).toHaveBeenCalledWith(64, 1);
    expect([clampLines(Number.NaN), clampLines(2.6), clampLines(-3)]).toEqual([1, 3, 1]);
  });

  it("close : fermée ; un clic d'avant ne crée plus rien", () => {
    const { picker, pick, cell } = setup();
    picker.open({ x: 0, y: 0 }, pick);
    picker.close();
    cell(2, 2).click();
    expect([picker.isOpen(), pick.mock.calls.length]).toEqual([false, 0]);
  });
});
```

Voir rouge (module absent).

- [ ] **Étape 7 : `app/table-picker.ts`.**

```ts
/**
 * Grille de choix du tableau (C10a, T6) : 8 × 8 cases posées au point cliqué ; survol, focus ou flèches : surbrillance
 * et libellé « 4 × 3 » (4 colonnes × 3 lignes, HC10-1) ; clic ou Entrée : crée ; Échap : ferme. Sous elle, la boîte
 * colonnes, lignes (1 à 64, T4) et « Créer ». Hors de la scène : ses événements ne passent pas par l'échantillonneur.
 * Styles : `.rb-table-picker` dans `ui/rb.css`.
 */
export const PICKER_SIZE = 8;
export const PICKER_MAX = 64;
export const PICKER_CLASS = "rb-table-picker";

export interface TablePickerHost {
  readonly element: HTMLElement;
  /** `at` en px CSS relatifs au parent (la case des scènes : même origine que #stage). */
  open(at: { readonly x: number; readonly y: number }, pick: (cols: number, rows: number) => void): void;
  close(): void;
  isOpen(): boolean;
}

export const pickerLabel = (cols: number, rows: number): string => `${cols} × ${rows}`;
export const pickerAria = (cols: number, rows: number): string =>
  `${cols} colonne${cols > 1 ? "s" : ""}, ${rows} ligne${rows > 1 ? "s" : ""}`;
/** Champ de la boîte : entier de 1 à 64 (illisible : 1). */
export const clampLines = (v: number): number => (Number.isFinite(v) ? Math.min(PICKER_MAX, Math.max(1, Math.round(v))) : 1);

const ARROWS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowUp: [0, -1],
};
const within = (v: number): number => Math.min(PICKER_SIZE, Math.max(1, v));

export function createTablePicker(parent: HTMLElement): TablePickerHost {
  const doc = parent.ownerDocument;
  const root = doc.createElement("div");
  root.className = PICKER_CLASS;
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "Nouveau tableau");
  const grid = doc.createElement("div");
  grid.className = "rb-table-picker-grid";
  grid.setAttribute("role", "grid");
  const label = doc.createElement("span");
  label.dataset["pickerLabel"] = "";
  const cells: HTMLButtonElement[] = [];
  let onPick: ((cols: number, rows: number) => void) | null = null;
  let hot = { cols: 1, rows: 1 };

  const show = (cols: number, rows: number): void => {
    hot = { cols, rows };
    for (const b of cells) b.toggleAttribute("data-on", Number(b.dataset["cols"]) <= cols && Number(b.dataset["rows"]) <= rows);
    label.textContent = pickerLabel(cols, rows);
  };
  const close = (): void => {
    root.hidden = true;
    onPick = null;
  };
  const choose = (cols: number, rows: number): void => {
    const f = onPick;
    close();
    f?.(cols, rows);
  };

  for (let r = 1; r <= PICKER_SIZE; r++) {
    for (let c = 1; c <= PICKER_SIZE; c++) {
      const b = doc.createElement("button");
      b.type = "button";
      b.dataset["cols"] = String(c);
      b.dataset["rows"] = String(r);
      b.setAttribute("aria-label", pickerAria(c, r));
      b.addEventListener("pointerenter", () => show(c, r));
      b.addEventListener("focus", () => show(c, r));
      b.addEventListener("click", () => choose(c, r));
      cells.push(b);
      grid.append(b);
    }
  }
  grid.addEventListener("keydown", (e: KeyboardEvent) => {
    const d = Object.hasOwn(ARROWS, e.key) ? ARROWS[e.key] : undefined;
    if (d !== undefined) {
      e.preventDefault();
      const cols = within(hot.cols + d[0]);
      const rows = within(hot.rows + d[1]);
      show(cols, rows);
      cells[(rows - 1) * PICKER_SIZE + (cols - 1)]?.focus();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      choose(hot.cols, hot.rows);
    }
  });
  root.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    close();
  });

  const form = doc.createElement("form");
  const field = (name: string, value: string): HTMLInputElement => {
    const input = doc.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = String(PICKER_MAX);
    input.value = value;
    input.setAttribute("aria-label", name);
    return input;
  };
  const colsInput = field("Colonnes", "3");
  const rowsInput = field("Lignes", "3");
  const create = doc.createElement("button");
  create.type = "submit";
  create.textContent = "Créer";
  form.append(colsInput, rowsInput, create);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    choose(clampLines(Number(colsInput.value)), clampLines(Number(rowsInput.value)));
  });

  root.append(grid, label, form);
  parent.append(root);

  return {
    element: root,
    open(at, pick) {
      onPick = pick;
      root.style.left = `${at.x}px`;
      root.style.top = `${at.y}px`;
      root.hidden = false;
      show(1, 1);
      cells[0]?.focus();
    },
    close,
    isOpen: () => !root.hidden,
  };
}
```

Note : le test « Entrée » envoie `keydown` sur la grille ; le `focus` de la case suit aussi la surbrillance. Le test
« flèches » attend « 2 × 2 » après →, →, ↓, ← depuis 1 × 1 (3, 1 → 3, 2 → 2, 2).

Vert : `vitest run src/app/table-picker.test.ts` — attendu : 6 tests `✓`.

- [ ] **Étape 8 : preuve bornée et `tsc`.** Commande bornée de la section, puis
  `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"` (vide) et `git diff --stat` (sans
  `text.test.ts`).

- [ ] **Étape 9 : commit.**

```bash
cd "$WT" && git add apps/web/src/engine/tools/commit-gate.ts && git add apps/web/src/engine/tools/commit-gate.test.ts && \
git add apps/web/src/engine/tools/text.ts && git add apps/web/src/app/text-editor.ts && \
git add apps/web/src/app/text-editor.test.ts && git add apps/web/src/app/table-picker.ts && \
git add apps/web/src/app/table-picker.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): shared IME commit gate, editor navigation and background, table picker" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : N tests par bloc, `text.test.ts` inchangé, une ligne `Réutilisation :` par ligne `Réutilise :` (trois lignes).

---

<a id="tache-t6"></a>

### Tâche T6 — Liaison Wasm des six commandes, adaptateur, contrat sur le vrai module

**Objectif.** Exposer les six commandes au module Wasm (T13 du cadrage) sur le patron `set_grid` / `set_grid_inner`,
brancher les six cas d'`apply` de `wasm-core.ts` (posés en levée par T3), jouer le contrat C10a sur les deux fabriques
et relire la fixture `tableau-4x3.roomboard` par le vrai module. Mesurer le module : ≤ 1 572 864 o (H2-13) ; mesure
détaillée seulement au-delà de 1 400 000 o (OD55).

**Fichiers.**
- Modifier : `crates/roomboard-wasm/src/lib.rs:9-20` (imports), `:391-410` (méthodes exposées, après `clear_grid`),
  `:705-716` (`*_inner`, après `set_grid_inner`), module `tests` ; `apps/web/src/core/wasm-core.ts:277-310` (`apply`) ;
  `apps/web/src/core/wasm-core.contract.test.ts` (`c10aFactories`, bloc « vrai module seulement »)
- Modifier seulement si le module dépasse 1 400 000 o : `docs/essais/taille-wasm.md` (une ligne de mesure datée)

**Interfaces.**
- Consomme (T2) : `Command::{AddTable, SetTableCell, InsertTableLine, RemoveTableLine, SetTableSizes, SetTableFill}`,
  `roomboard_core::table::TableAxis`, `CommandError::BadTable` ; (T3) les six variantes TS de `Command`, `toU32`,
  `toChange`, `c10aFactories`, `addTable`, `tableOf`.
- Produit (méthodes wasm-bindgen de `Document`, lues par `wasm-core.ts`) :

```rust
#[allow(clippy::too_many_arguments)]
pub fn add_table(&mut self, page: &str, x: f64, y: f64, cols: u32, rows: u32, col_width: f64, row_height: f64, color: &str, size: f64) -> Result<JsValue, JsError>;
pub fn set_table_cell(&mut self, id: &str, row: &str, col: &str, content: &str, row_height: Option<f64>) -> Result<JsValue, JsError>;
pub fn insert_table_line(&mut self, id: &str, row: bool, at: u32) -> Result<JsValue, JsError>;
pub fn remove_table_line(&mut self, id: &str, row: bool, line: &str) -> Result<JsValue, JsError>;
pub fn set_table_sizes(&mut self, id: &str, col_width: f64, row_height: f64) -> Result<JsValue, JsError>;
pub fn set_table_fill(&mut self, id: &str, row: &str, col: &str, fill: Option<String>) -> Result<JsValue, JsError>;
// natifs, testés hors wasm32 :
pub fn add_table_inner(&mut self, page: &str, origin: [f64; 2], dims: [u32; 2], sizes: [f64; 2], color: &str, size: f64) -> Result<Change, CommandError>;
pub fn set_table_cell_inner(&mut self, id: &str, cell: [&str; 2], content: &str, row_height: Option<f64>) -> Result<Change, CommandError>;
pub fn insert_table_line_inner(&mut self, id: &str, row: bool, at: u32) -> Result<Change, CommandError>;
pub fn remove_table_line_inner(&mut self, id: &str, row: bool, line: &str) -> Result<Change, CommandError>;
pub fn set_table_sizes_inner(&mut self, id: &str, col_width: f64, row_height: f64) -> Result<Change, CommandError>;
pub fn set_table_fill_inner(&mut self, id: &str, cell: [&str; 2], fill: Option<String>) -> Result<Change, CommandError>;
```

  La vue passe par `element()` (sérialisation de `ElementView.table`, aucune méthode neuve de lecture).
- Réutilise : `crates/roomboard-wasm/src/lib.rs:391-410`, `:705` — patron `set_grid` / `set_grid_inner`, `run`,
  `cmd_err`, `to_js` (étendre).
- Réutilise : `apps/web/src/core/wasm-core.ts:34` (`toChange`), `:107` (`toU32`) — un rang ou une dimension hors des
  u32 arrive comme u32::MAX, refusé en `BadTable` comme par la fausse liaison.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
cargo test -p roomboard-wasm table 2>&1 | grep -E "test result|FAILED|error\[|table" | tail -20 && \
ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web exec vitest run src/core --reporter=verbose 2>&1 | grep -E "C10a|×|FAIL|Test Files|Tests " | tail -60 && \
wc -c apps/web/src/wasm/roomboard_wasm_bg.wasm
```

Attendu : `cargo` ≥ 3 tests `table` `ok` ; `vitest` sans `×`, au moins 10 lignes `✓ … contrat C10a : vrai module wasm`,
10 `✓ … contrat C10a : fausse liaison`, 1 `✓ contrat C10a : vrai module seulement` ; taille ≤ 1 572 864 (le rapport la
cite ; au-delà de 1 400 000, ligne ajoutée à `docs/essais/taille-wasm.md`). À garder verts : « contrat commun », « contrat
C2 », « contrat C9 » sur les deux fabriques (même sortie).

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`,
  `#[ignore]`), aucun seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/target .` ;
  `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/apps/web/src/wasm-formats apps/web/src/`
  (le module `apps/web/src/wasm` est reconstruit ici, étape 4 ; jamais commité).
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite N, les noms vus et la taille du module.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle ; jamais GPL, LGPL ni AGPL.
- GC8 Plafond Wasm H2-13 inchangé : 1 572 864 octets, contrôle de `scripts/verifier.sh` non modifié ; mesure détaillée
  (`docs/essais/taille-wasm.md`, OD55) seulement si le module dépasse 1 400 000 octets.
- GC10 Le cœur tourne en Wasm dans la page ; aucune lecture neuve dans la liaison (DAC6).
- GC13 Périmètre : seuls les fichiers ci-dessus.
- GC14 `tsc` : `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"` vide (avec le module
  reconstruit).
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.
- GC16 `cargo fmt --all` puis `cargo clippy -p roomboard-wasm --all-targets -- -D warnings` sans avertissement.

**Interdits.** Aucune méthode de lecture neuve dans la liaison (la géométrie des cellules est côté page, DAC6) ; ne pas
commiter `apps/web/src/wasm/` ; ne pas modifier `scripts/verifier.sh`.

**Critère « terminé ».** Commande bornée verte, taille citée, `tsc` vide, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests natifs rouges.** Dans le module `tests` de `crates/roomboard-wasm/src/lib.rs` :

```rust
    // C10a (T6) : tableau par les `*_inner`.

    fn table_of(d: &Document, id: &str) -> roomboard_core::table::TableView {
        d.core.element(id).and_then(|e| e.table).expect("tableau")
    }

    #[test]
    fn add_table_inner_creates_and_refuses() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let c = d
            .add_table_inner(&p, [100.0, 200.0], [4, 3], [240.0, 64.0], "#000000", 36.0)
            .expect("tableau");
        let t = table_of(&d, &c.ids[0]);
        assert_eq!((t.cols.len(), t.rows.len()), (4, 3));
        assert_eq!(
            d.add_table_inner(&p, [0.0, 0.0], [u32::MAX, 3], [240.0, 64.0], "#000000", 36.0),
            Err(CommandError::BadTable)
        );
        assert_eq!(
            d.add_table_inner(&p, [0.0, 0.0], [0, 3], [240.0, 64.0], "#000000", 36.0),
            Err(CommandError::BadTable)
        );
    }

    #[test]
    fn table_cell_line_size_fill_inner() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .add_table_inner(&p, [0.0, 0.0], [2, 2], [240.0, 64.0], "#000000", 36.0)
            .expect("tableau")
            .ids[0]
            .clone();
        let t = table_of(&d, &id);
        let (r0, c0) = (t.rows[0].id.clone(), t.cols[0].id.clone());
        d.set_table_cell_inner(&id, [r0.as_str(), c0.as_str()], "Lundi", Some(150.0)).expect("cellule");
        assert_eq!(table_of(&d, &id).rows[0].height, 150.0);
        d.insert_table_line_inner(&id, false, 2).expect("colonne");
        assert_eq!(table_of(&d, &id).cols.len(), 3);
        d.remove_table_line_inner(&id, true, &r0).expect("ligne");
        assert!(table_of(&d, &id).cells.is_empty());
        d.set_table_sizes_inner(&id, 200.0, 70.0).expect("uniforme");
        assert!(table_of(&d, &id).cols.iter().all(|c| c.width == 200.0));
        let t = table_of(&d, &id);
        let (r1, c1) = (t.rows[0].id.clone(), t.cols[1].id.clone());
        d.set_table_fill_inner(&id, [r1.as_str(), c1.as_str()], Some("#fef08a".into())).expect("jaune");
        assert_eq!(table_of(&d, &id).cells[0].fill.as_deref(), Some("#fef08a"));
        d.set_table_fill_inner(&id, [r1.as_str(), c1.as_str()], None).expect("aucun");
        assert!(table_of(&d, &id).cells.is_empty());
    }

    #[test]
    fn table_inner_refuses_with_core_errors() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .add_table_inner(&p, [0.0, 0.0], [1, 1], [240.0, 64.0], "#000000", 36.0)
            .expect("tableau")
            .ids[0]
            .clone();
        let t = table_of(&d, &id);
        assert_eq!(d.insert_table_line_inner(&id, true, u32::MAX), Err(CommandError::BadTable));
        assert_eq!(d.remove_table_line_inner(&id, true, &t.rows[0].id), Err(CommandError::BadTable));
        assert_eq!(
            d.set_table_cell_inner("absent", ["r", "c"], "x", None),
            Err(CommandError::UnknownElement("absent".into()))
        );
    }
```

Voir rouge : `cargo test -p roomboard-wasm table 2>&1 | grep -E "error\[|test result" | head` (méthodes absentes).

- [ ] **Étape 3 : méthodes de la liaison.** Import : `use roomboard_core::table::TableAxis;`. Après `clear_grid` (bloc
  `#[wasm_bindgen] impl Document`) :

```rust
    /// Tableau (C10a, T13) : `cols`, `rows` en u32 ; une valeur hors des u32 arrive comme u32::MAX (`toU32` de la page),
    /// refusée en `BadTable`.
    #[allow(clippy::too_many_arguments)]
    pub fn add_table(
        &mut self,
        page: &str,
        x: f64,
        y: f64,
        cols: u32,
        rows: u32,
        col_width: f64,
        row_height: f64,
        color: &str,
        size: f64,
    ) -> Result<JsValue, JsError> {
        to_js(
            &self
                .add_table_inner(page, [x, y], [cols, rows], [col_width, row_height], color, size)
                .map_err(cmd_err)?,
        )
    }

    /// `row`, `col` : ids ; `row_height` : hauteur exigée mesurée par la page (T5).
    pub fn set_table_cell(
        &mut self,
        id: &str,
        row: &str,
        col: &str,
        content: &str,
        row_height: Option<f64>,
    ) -> Result<JsValue, JsError> {
        to_js(
            &self
                .set_table_cell_inner(id, [row, col], content, row_height)
                .map_err(cmd_err)?,
        )
    }

    /// `row` : vrai pour une ligne, faux pour une colonne.
    pub fn insert_table_line(&mut self, id: &str, row: bool, at: u32) -> Result<JsValue, JsError> {
        to_js(&self.insert_table_line_inner(id, row, at).map_err(cmd_err)?)
    }

    pub fn remove_table_line(&mut self, id: &str, row: bool, line: &str) -> Result<JsValue, JsError> {
        to_js(&self.remove_table_line_inner(id, row, line).map_err(cmd_err)?)
    }

    pub fn set_table_sizes(
        &mut self,
        id: &str,
        col_width: f64,
        row_height: f64,
    ) -> Result<JsValue, JsError> {
        to_js(&self.set_table_sizes_inner(id, col_width, row_height).map_err(cmd_err)?)
    }

    /// `fill` absent ou null : retire le remplissage.
    pub fn set_table_fill(
        &mut self,
        id: &str,
        row: &str,
        col: &str,
        fill: Option<String>,
    ) -> Result<JsValue, JsError> {
        to_js(&self.set_table_fill_inner(id, [row, col], fill).map_err(cmd_err)?)
    }
```

Après `set_grid_inner` (bloc natif `impl Document`) :

```rust
    pub fn add_table_inner(
        &mut self,
        page: &str,
        origin: [f64; 2],
        dims: [u32; 2],
        sizes: [f64; 2],
        color: &str,
        size: f64,
    ) -> Result<Change, CommandError> {
        self.run(Command::AddTable {
            page: page.to_string(),
            x: origin[0],
            y: origin[1],
            cols: dims[0],
            rows: dims[1],
            col_width: sizes[0],
            row_height: sizes[1],
            color: color.to_string(),
            size,
        })
    }

    pub fn set_table_cell_inner(
        &mut self,
        id: &str,
        cell: [&str; 2],
        content: &str,
        row_height: Option<f64>,
    ) -> Result<Change, CommandError> {
        self.run(Command::SetTableCell {
            id: id.to_string(),
            row: cell[0].to_string(),
            col: cell[1].to_string(),
            content: content.to_string(),
            row_height,
        })
    }

    pub fn insert_table_line_inner(&mut self, id: &str, row: bool, at: u32) -> Result<Change, CommandError> {
        self.run(Command::InsertTableLine {
            id: id.to_string(),
            axis: if row { TableAxis::Row } else { TableAxis::Col },
            at,
        })
    }

    pub fn remove_table_line_inner(&mut self, id: &str, row: bool, line: &str) -> Result<Change, CommandError> {
        self.run(Command::RemoveTableLine {
            id: id.to_string(),
            axis: if row { TableAxis::Row } else { TableAxis::Col },
            line: line.to_string(),
        })
    }

    pub fn set_table_sizes_inner(
        &mut self,
        id: &str,
        col_width: f64,
        row_height: f64,
    ) -> Result<Change, CommandError> {
        self.run(Command::SetTableSizes {
            id: id.to_string(),
            col_width,
            row_height,
        })
    }

    pub fn set_table_fill_inner(
        &mut self,
        id: &str,
        cell: [&str; 2],
        fill: Option<String>,
    ) -> Result<Change, CommandError> {
        self.run(Command::SetTableFill {
            id: id.to_string(),
            row: cell[0].to_string(),
            col: cell[1].to_string(),
            fill,
        })
    }
```

Vert : `cargo test -p roomboard-wasm table 2>&1 | grep -E "test result|FAILED"` — 3 tests `ok` ; puis
`cargo fmt --all && cargo clippy -p roomboard-wasm --all-targets -- -D warnings 2>&1 | tail -3`.

- [ ] **Étape 4 : reconstruire le module de la page** (une fois, mêmes options que `verifier.sh`) :

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -3 && \
rm -rf apps/web/src/wasm && \
wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && \
grep -c "add_table\|set_table_cell\|insert_table_line\|remove_table_line\|set_table_sizes\|set_table_fill" apps/web/src/wasm/roomboard_wasm.d.ts
```

Attendu : build sans erreur ; le `grep -c` rend au moins 6.

- [ ] **Étape 5 : contrat sur le vrai module, rouge.** Dans `wasm-core.contract.test.ts`, remplacer la ligne
  `const c10aFactories = factories.filter(…)` par :

```ts
const c10aFactories = factories; // T6 : vrai module branché, contrat C10a commun aux deux fabriques
```

et ajouter à la fin du fichier :

```ts
describe.skipIf(loaded === null)("contrat C10a : vrai module seulement", () => {
  it("fixture tableau-4x3.roomboard (T2) : un 4 × 3 rempli, première cellule jaune", () => {
    const bytes = new Uint8Array(fs.readFileSync(new URL("../../../../crates/roomboard-core/tests/fixtures/tableau-4x3.roomboard", import.meta.url)));
    const d = need().core.load(bytes);
    const p = first(d);
    const id = d.elementIds(p).find((e) => d.element(e)?.kind === "table") ?? "";
    const t = tableOf(d, id);
    expect([t.cols.length, t.rows.length]).toEqual([4, 3]);
    expect(t.cells.map((c) => c.text)).toEqual(["Lundi", "Mardi", "Mercredi", "Jeudi", "Maths", "Français", "Histoire", "Sport", "Anglais", "Musique", "Dessin", "Sciences"]);
    expect(t.cells[0]?.fill).toBe("#fef08a");
    expect(t.cells[1]?.fill).toBeNull();
    d.free();
  });
});
```

Voir rouge : `ROOMBOARD_WASM_REQUIRED=1 … vitest run src/core` — attendu : `×` sur « contrat C10a : vrai module wasm »
(« liaison Wasm à venir »).

- [ ] **Étape 6 : `wasm-core.ts` — les six appels.** Remplacer le groupe de cas qui lève (posé par T3) par :

```ts
      case "AddTable":
        return toChange(
          this.d.add_table(cmd.page, cmd.x, cmd.y, toU32(cmd.cols), toU32(cmd.rows), cmd.colWidth, cmd.rowHeight, cmd.color, cmd.size),
        );
      case "SetTableCell":
        return toChange(this.d.set_table_cell(cmd.id, cmd.row, cmd.col, cmd.content, cmd.rowHeight));
      case "InsertTableLine":
        return toChange(this.d.insert_table_line(cmd.id, cmd.axis === "row", toU32(cmd.at)));
      case "RemoveTableLine":
        return toChange(this.d.remove_table_line(cmd.id, cmd.axis === "row", cmd.line));
      case "SetTableSizes":
        return toChange(this.d.set_table_sizes(cmd.id, cmd.colWidth, cmd.rowHeight));
      case "SetTableFill":
        // null → undefined : Option::None côté Rust.
        return toChange(this.d.set_table_fill(cmd.id, cmd.row, cmd.col, cmd.fill ?? undefined));
```

Mettre à jour le commentaire de `toU32` : « Bornes de FormatText et rangs ou dimensions du tableau (C10a) : hors des
u32, u32::MAX, que le cœur refuse ».

- [ ] **Étape 7 : preuve bornée et `tsc`.** Commande bornée de la section ; `tsc` (GC14) vide. Si la taille dépasse
  1 400 000 o : ajouter à `docs/essais/taille-wasm.md` une ligne « 2026-11-20 — C10a (tableau) : N octets
  (`roomboard_wasm_bg.wasm`, `--remove-name-section`) » et l'ajouter au commit.

- [ ] **Étape 8 : commit.**

```bash
cd "$WT" && git add crates/roomboard-wasm/src/lib.rs && git add apps/web/src/core/wasm-core.ts && \
git add apps/web/src/core/wasm-core.contract.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(wasm): expose table commands and run the C10a contract on the real module" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : N tests, taille du module en octets, une ligne `Réutilisation :` par ligne `Réutilise :` (deux lignes).

---

<a id="tache-t7"></a>

### Tâche T7 — Rendu du tableau : fonds et traits, texte des cellules par `paintText`

**Objectif.** Dessiner un tableau dans la scène Canvas 2D (T13 du cadrage, B1 : **un seul chemin de dessin du
texte**) : `render/table-paint.ts` ne dessine que les fonds des cellules remplies et les traits (`paintTableGrid`), et
rend les rectangles de texte (`cellTextBoxes`) ; aucun `fillText` dedans. Le texte de chaque cellule passe par
`paintText` de `canvas2d.ts`, dans `paintElement`, sur des lignes `layoutRich(plainSpans(texte), { size }, largeur,
measureWith(ctx))`, translation au coin intérieur de la cellule et découpe au rectangle ; cache par tableau, invalidé
par le même `invalidate`.

**Fichiers.**
- Créer : `apps/web/src/engine/render/table-paint.ts`, `apps/web/src/engine/render/table-paint.test.ts`
- Modifier : `apps/web/src/engine/render/canvas2d.ts:6-15` (imports), `:145-150` (champs), `:215-237`
  (`paintElement`), `:306-328` (`invalidate`, cache des cellules)
- Tests : `apps/web/src/engine/render/canvas2d.test.ts`

**Interfaces.**
- Consomme (T3) : `TableData`, `TableElement` ; (T4) `cellRect`, `TABLE_PADDING`, `TABLE_LINE_WIDTH` de
  `engine/table-geom.ts`.
- Produit :

```ts
// engine/render/table-paint.ts
export interface CellTextBox { readonly row: string; readonly col: string; readonly text: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number }
/** Fonds des cellules remplies puis traits (couleur du tableau, épaisseur TABLE_LINE_WIDTH), repère local ; aucun texte. */
export function paintTableGrid(ctx: CanvasRenderingContext2D, t: TableData): void;
/** Rectangle intérieur (marge TABLE_PADDING) de chaque cellule au texte non vide, dans l'ordre de `t.cells`. */
export function cellTextBoxes(t: TableData): CellTextBox[];
```

- Réutilise : `apps/web/src/engine/render/canvas2d.ts:122`, `:312-328` — `paintText(ctx, RichLine[], color)` ; cache
  `textLines` / `linesOf` et `invalidate`, étendus aux cellules (B1).
- Réutilise : `apps/web/src/engine/render/canvas2d.ts:215` ; patron `render/grid-paint.ts:99` — `paintElement` appelle
  `paintTableGrid(ctx, t)` et `cellTextBoxes(t)` de `render/table-paint.ts` (nouveau module), puis `paintText` par
  cellule.
- Réutilise : `apps/web/src/engine/text-layout.ts:206`, `:30` ; `core/rich-text.ts:9` — `layoutRich`, `measureWith(ctx)`,
  `plainSpans` (mêmes lignes que la mesure de l'outil, `cellHeight` de T4).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/engine/render/table-paint.test.ts src/engine/render/canvas2d.test.ts --reporter=verbose 2>&1 | grep -E "tableau|C10a|×|FAIL|Test Files|Tests " | tail -40
```

Attendu : aucun `×` ; au moins 4 lignes `✓ fonds et traits du tableau`, 3 `✓ Canvas2DRenderer — tableau (C10a)` dont
« mêmes fillText qu'un texte d'un segment (B1) ». Tests à garder verts (carte d'impact) : tout `canvas2d.test.ts`
(texte, cache, C7, grille, images et inconnus).

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`), aucun
  seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/apps/web/src/wasm apps/web/src/` ;
  `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/apps/web/src/wasm-formats apps/web/src/`.
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle ; jamais GPL, LGPL ni AGPL.
- GC13 Périmètre : seuls les fichiers ci-dessus (`webgl2.ts` non touché : la scène reste Canvas 2D).
- GC14 `tsc` : `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"` vide.
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.

**Interdits.** Aucun `fillText` dans `table-paint.ts` (contrôlé par un test) ; ne pas écrire une seconde mise en lignes
du texte ; ne pas changer le dessin d'un élément `text`.

**Critère « terminé ».** Commande bornée verte, `tsc` vide, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges de `table-paint`.** Créer `apps/web/src/engine/render/table-paint.test.ts` :

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { TableData } from "../../core/api";
import { TABLE_LINE_WIDTH, TABLE_PADDING } from "../table-geom";
import { asCtx, FakeCtx } from "./fake-ctx";
import { cellTextBoxes, paintTableGrid } from "./table-paint";

const T: TableData = {
  color: "#1d4ed8",
  size: 36,
  cols: [{ id: "c1", width: 240 }, { id: "c2", width: 100 }],
  rows: [{ id: "r1", height: 64 }, { id: "r2", height: 80 }],
  cells: [
    { row: "r1", col: "c2", text: "", fill: "#fef08a" },
    { row: "r2", col: "c1", text: "Lundi", fill: null },
    { row: "r9", col: "c1", text: "fantôme", fill: "#bbf7d0" },
  ],
};

describe("fonds et traits du tableau (C10a, T13, B1)", () => {
  it("fond de la cellule remplie à son rectangle ; ligne ou colonne inconnue : rien", () => {
    const ctx = new FakeCtx();
    paintTableGrid(asCtx(ctx), T);
    expect(ctx.rects).toEqual([[240, 0, 100, 64]]);
    expect(ctx.log).toContain("fillRect #fef08a");
  });

  it("traits : une verticale par bord de colonne, une horizontale par bord de ligne, couleur et épaisseur du tableau", () => {
    const ctx = new FakeCtx();
    paintTableGrid(asCtx(ctx), T);
    expect(ctx.log.filter((l) => l === "moveTo")).toHaveLength(3 + 3);
    expect(ctx.path.filter(([k]) => k === "M")).toEqual([["M", 0, 0], ["M", 240, 0], ["M", 340, 0], ["M", 0, 0], ["M", 0, 64], ["M", 0, 144]]);
    expect(ctx.log).toContain(`stroke #1d4ed8 ${TABLE_LINE_WIDTH}`);
  });

  it("aucun texte dessiné ici : un seul chemin du texte (B1)", () => {
    const ctx = new FakeCtx();
    paintTableGrid(asCtx(ctx), T);
    expect(ctx.texts).toEqual([]);
    const source = readFileSync(new URL("./table-paint.ts", import.meta.url), "utf8");
    expect(source.includes("fillText")).toBe(false);
  });

  it("cellTextBoxes : rectangle intérieur des cellules au texte non vide, lignes et colonnes connues seulement", () => {
    expect(cellTextBoxes(T)).toEqual([
      { row: "r2", col: "c1", text: "Lundi", x: TABLE_PADDING, y: 64 + TABLE_PADDING, w: 240 - 2 * TABLE_PADDING, h: 80 - 2 * TABLE_PADDING },
    ]);
  });
});
```

Voir rouge (module absent). Si `node:fs` n'est pas typé dans `apps/web` (pas de `@types/node`), reprendre le motif de
`wasm-core.contract.test.ts:12-14` (import dynamique typé localement) pour lire la source.

- [ ] **Étape 3 : `render/table-paint.ts`.**

```ts
/**
 * Fonds et traits d'un tableau (C10a, T13, B1) : aucun texte ici — le texte des cellules passe par `paintText` de
 * `canvas2d.ts`, seul chemin de dessin du texte. Repère local du tableau (coin en 0, 0), sous sa matrice.
 */
import type { TableData } from "../../core/api";
import { cellRect, TABLE_LINE_WIDTH, TABLE_PADDING } from "../table-geom";

export interface CellTextBox {
  readonly row: string;
  readonly col: string;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Bords successifs : 0, puis la somme des tailles. */
const edges = (sizes: readonly number[]): number[] =>
  sizes.reduce<number[]>((acc, s) => [...acc, (acc[acc.length - 1] ?? 0) + s], [0]);

/** Rangs d'une cellule par ids ; null si sa ligne ou sa colonne n'est plus lue. */
function indexOf(t: TableData, row: string, col: string): { row: number; col: number } | null {
  const r = t.rows.findIndex((x) => x.id === row);
  const c = t.cols.findIndex((x) => x.id === col);
  return r < 0 || c < 0 ? null : { row: r, col: c };
}

export function paintTableGrid(ctx: CanvasRenderingContext2D, t: TableData): void {
  for (const cell of t.cells) {
    if (cell.fill === null) continue;
    const at = indexOf(t, cell.row, cell.col);
    if (at === null) continue;
    const b = cellRect(t, at);
    // Couleur lisible d'abord : le canvas ignore une couleur qu'il ne sait pas lire (validColor accepte tout nom de 3 à
    // 20 lettres), la valeur d'avant resterait.
    ctx.fillStyle = "transparent";
    ctx.fillStyle = cell.fill;
    ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  }
  const xs = edges(t.cols.map((c) => c.width));
  const ys = edges(t.rows.map((r) => r.height));
  const w = xs[xs.length - 1] ?? 0;
  const h = ys[ys.length - 1] ?? 0;
  ctx.beginPath();
  for (const x of xs) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (const y of ys) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.strokeStyle = t.color;
  ctx.lineWidth = TABLE_LINE_WIDTH;
  ctx.lineCap = "square";
  ctx.stroke();
}

export function cellTextBoxes(t: TableData): CellTextBox[] {
  const out: CellTextBox[] = [];
  for (const cell of t.cells) {
    if (cell.text === "") continue;
    const at = indexOf(t, cell.row, cell.col);
    if (at === null) continue;
    const b = cellRect(t, at);
    out.push({
      row: cell.row,
      col: cell.col,
      text: cell.text,
      x: b.x0 + TABLE_PADDING,
      y: b.y0 + TABLE_PADDING,
      w: Math.max(1, b.x1 - b.x0 - 2 * TABLE_PADDING),
      h: Math.max(0, b.y1 - b.y0 - 2 * TABLE_PADDING),
    });
  }
  return out;
}
```

Vert : `vitest run src/engine/render/table-paint.test.ts` (4 tests).

- [ ] **Étape 4 : tests rouges du rendu.** Dans `canvas2d.test.ts`, ajouter `TableElement` à l'import de types, puis à
  la fin :

```ts
describe("Canvas2DRenderer — tableau (C10a)", () => {
  const TABLE: TableElement = {
    id: "tb",
    kind: "table",
    transform: [1, 0, 0, 1, 10, 20],
    table: {
      color: "#000000",
      size: 36,
      cols: [{ id: "c1", width: 240 }, { id: "c2", width: 240 }],
      rows: [{ id: "r1", height: 64 }],
      cells: [{ row: "r1", col: "c1", text: "Lundi", fill: null }, { row: "r1", col: "c2", text: "", fill: "#fef08a" }],
    },
  };
  function draw(els: ElementView[]) {
    const scene = new FakeCtx();
    const src: SceneSource = { element: (id) => els.find((e) => e.id === id) ?? null, outline: () => null };
    const r = new Canvas2DRenderer(asCtx(scene), null, src, {});
    r.resize(100, 100, 1);
    const page = { id: "p", elementIds: els.map((e) => e.id) };
    r.drawScene(page, IDENTITY, new Set());
    return { r, scene, page };
  }

  it("fonds et traits sous la matrice du tableau, puis le texte dans la cellule (découpe, coin intérieur)", () => {
    const { scene } = draw([TABLE]);
    expect(scene.log).toContain("transform 1,0,0,1,10,20");
    expect(scene.rects).toContainEqual([240, 0, 240, 64]);
    const i = scene.log.indexOf("transform 1,0,0,1,8,8");
    expect(i).toBeGreaterThan(scene.log.indexOf("clip"));
    expect(scene.log.indexOf("fillText Lundi 0,0")).toBeGreaterThan(i);
  });

  it("mêmes fillText qu'un texte d'un segment (B1) : police, couleur, ligne de base", () => {
    const text: TextElement = {
      id: "tx",
      kind: "text",
      transform: [1, 0, 0, 1, 0, 0],
      style: { color: "#000000", width: 0 },
      text: { content: "Lundi", size: 36, boxWidth: 224, boxHeight: 45, spans: [{ text: "Lundi", attrs: {} }] },
    };
    const a = draw([TABLE]).scene.texts;
    const b = draw([text]).scene.texts;
    expect(a).toEqual(b);
    expect(a).toEqual([{ text: "Lundi", x: 0, y: 0, font: '36px "Atkinson Hyperlegible", system-ui, sans-serif', fill: "#000000", baseline: "top" }]);
  });

  it("cache des lignes de cellules : remesuré seulement après invalidate (Change)", () => {
    const { r, scene, page } = draw([TABLE]);
    const first = scene.measures;
    expect(first).toBeGreaterThan(0);
    r.drawScene(page, IDENTITY, new Set());
    expect(scene.measures).toBe(first);
    r.invalidate({ pages: [], ids: ["tb"], removed: [], full: false, version: 2 });
    r.drawScene(page, IDENTITY, new Set());
    expect(scene.measures).toBeGreaterThan(first);
  });
});
```

Voir rouge : aucun `transform 1,0,0,1,8,8`, aucun `fillText Lundi`.

- [ ] **Étape 5 : `canvas2d.ts`.** Imports : ajouter `TableData` aux types de `../../core/api`, `import { plainSpans }
  from "../../core/rich-text";` et `import { cellTextBoxes, paintTableGrid, type CellTextBox } from "./table-paint";`.
  Champ, après `textLines` :

```ts
  /** Lignes du texte des cellules, par tableau (B1) : même cache et même invalidation que `textLines`. */
  private readonly cellLines = new Map<string, { readonly key: string; readonly lines: readonly (readonly RichLine[])[] }>();
```

Dans `paintElement`, avant `} else if (el.kind === "unknown") {` :

```ts
    } else if (el.kind === "table") {
      paintTableGrid(ctx, el.table);
      const boxes = cellTextBoxes(el.table);
      const lines = this.cellLinesOf(ctx, el.id, el.table, boxes);
      boxes.forEach((b, i) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(b.x, b.y, b.w, b.h);
        ctx.clip();
        ctx.transform(1, 0, 0, 1, b.x, b.y);
        paintText(ctx, lines[i] ?? [], el.table.color);
        ctx.restore();
      });
```

Dans `invalidate`, ajouter `this.cellLines.clear();` à côté de `this.textLines.clear();` et
`this.cellLines.delete(id);` à côté de `this.textLines.delete(id);`. Après `linesOf` :

```ts
  /** Lignes de chaque cellule au texte non vide (B1) : `layoutRich` du texte brut (C7b remplacera `plainSpans`). */
  private cellLinesOf(ctx: CanvasRenderingContext2D, id: string, t: TableData, boxes: readonly CellTextBox[]): readonly (readonly RichLine[])[] {
    const key = `${t.size}|${JSON.stringify(boxes.map((b) => [b.w, b.text]))}`;
    const cached = this.cellLines.get(id);
    if (cached && cached.key === key) return cached.lines;
    const measure = measureWith(ctx);
    const lines = boxes.map((b) => layoutRich(plainSpans(b.text), { size: t.size }, b.w, measure));
    this.cellLines.set(id, { key, lines });
    return lines;
  }
```

Mettre à jour l'en-tête de `paintText` : « Texte (D14, CL4-4, C7, C10a) : élément `text` et cellules de tableau ».

- [ ] **Étape 6 : preuve bornée et `tsc`** (GC14 vide).

- [ ] **Étape 7 : commit.**

```bash
cd "$WT" && git add apps/web/src/engine/render/table-paint.ts && git add apps/web/src/engine/render/table-paint.test.ts && \
git add apps/web/src/engine/render/canvas2d.ts && git add apps/web/src/engine/render/canvas2d.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(render): draw tables; cell text through paintText with a per-table cache" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : N tests, noms vus, une ligne `Réutilisation :` par ligne `Réutilise :` (trois lignes).

---

<a id="tache-t8"></a>

### Tâche T8 — Barre : outil Tableau, cinq actions, rangée contextuelle, pastilles

**Objectif.** L'outil **Tableau** entre au catalogue (`TOOL_TABLE.table`) et au groupe `edition` des profils
`defaut` et `annotation`, après Texte (T6 du cadrage ; pas `simple`). Les cinq boutons de structure sont des actions de
barre (DAC4, T10) : `table-row-insert` (« + Ligne »), `table-col-insert` (« + Colonne »), `table-row-remove`
(« − Ligne »), `table-col-remove` (« − Colonne »), `table-uniform` (« Uniformiser »), exécutées par `ACTIONS` vers
`Engine.tableAction`, grisées par `ACTION_STATE` sans cellule active, « − » à une seule ligne ou colonne, « + » à 64
(T4). La rangée contextuelle `TableActionRow` (PC8) les montre quand l'outil actif est Tableau, puis six pastilles
(aucune, `#fef08a`, `#bbf7d0`, `#bfdbfe`, `#fecdd3`, `#e5e7eb`, T12) vers `ToolbarHost.tableFill`. `toolbar-host.ts:45`
passe par `presetsOf` (ferme le constat). Styles de la rangée et de la grille de choix dans `rb.css`.

**Fichiers.**
- Modifier : `apps/web/src/toolbar.ts:84-113` (tables, `TABLE_ACTIONS`, `TABLE_FILLS`), `apps/web/src/toolbar-profiles.ts:57`,
  `apps/web/src/ui/item-state.ts:1-24`, `apps/web/src/ui/Toolbar.tsx:1-15`, `:78-123`, `apps/web/src/ui/PagesBar.tsx:22`,
  `apps/web/src/ui/rb.css:50-51` (après la rangée des préréglages), `apps/web/src/app/toolbar-host.ts:1-60`
- Tests : `apps/web/src/toolbar.test.ts:167`, `apps/web/src/toolbar-profiles.test.ts`, `apps/web/src/ui/item-state.test.ts`,
  `apps/web/src/ui/Toolbar.test.tsx`, `apps/web/src/app/toolbar-host.test.ts`

**Interfaces.**
- Consomme (T4) : `TableAction`, `TableCellState` (`engine/table-geom.ts`), `Engine.tableAction`, `Engine.tableFill`,
  `DrawTool` / `ToolChoice` `"table"` ; (T3) `TABLE_MAX_LINES` (`core/api.ts`).
- Produit :

```ts
// toolbar.ts
TOOL_TABLE.table = { label: "Tableau", choice: "table" };
ACTION_TABLE["table-row-insert" | "table-col-insert" | "table-row-remove" | "table-col-remove" | "table-uniform"];
export const TABLE_ACTIONS: readonly ActionId[]; // dans l'ordre de la rangée
export interface TableFill { readonly id: string; readonly label: string; readonly color: string | null }
export const TABLE_FILLS: readonly TableFill[]; // aucun, jaune, vert, bleu, rose, gris
// ui/item-state.ts
ToolbarView.tableCell?: TableCellState | null;
// app/toolbar-host.ts
ToolbarHost.tableFill(fill: string | null): void;
HostTargets.engine(): Pick<Engine, … | "tableAction" | "tableFill">;
```

  Attributs du DOM (lus par T12) : `[data-table-sep]`, `button[data-table-action="<id>"]` (libellé de `ACTION_TABLE`),
  `button[data-table-fill="<id>"]` (libellés « Aucun », « Jaune », « Vert », « Bleu », « Rose », « Gris »).
- Réutilise : `apps/web/src/toolbar.ts:84`, `:97` ; `toolbar-profiles.ts:57` — `TOOL_TABLE`, `ACTION_TABLE`,
  `defaultToolbars()` (étendre).
- Réutilise : `apps/web/src/ui/item-state.ts:14`, `:41` — `ACTION_STATE`, `itemState` (étendre : état grisé des cinq
  actions).
- Réutilise : `apps/web/src/ui/Toolbar.tsx:79` — `PresetRow` (patron, même place) → `TableActionRow`.
- Réutilise : `apps/web/src/app/toolbar-host.ts:7`, `:22` ; `toolbar.ts:132` — `ACTIONS`, `ToolbarHost.tableFill`
  (étendre) ; `presetsOf` à `toolbar-host.ts:45` (réutiliser).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/toolbar.test.ts src/toolbar-profiles.test.ts src/ui/item-state.test.ts src/ui/Toolbar.test.tsx src/ui/PagesBar.test.tsx src/app/toolbar-host.test.ts --reporter=verbose 2>&1 | grep -E "C10a|tableau|switch|×|FAIL|Test Files|Tests " | tail -60
```

Attendu : aucun `×` ; au moins 3 lignes `✓ … rangée du tableau (C10a, T10)`, 3 `✓ … actions du tableau (C10a)`, 1
`✓ … Tableau après Texte` ; le contrôle « aucun switch sur l'identifiant » de `Toolbar.test.tsx` vert ; à garder
verts (carte d'impact) : `toolbar-host.test.ts:41-42` (« chaque action d'ACTION_TABLE a son entrée dans ACTIONS »),
`toolbar-profiles.test.ts:36-40`, `Toolbar.test.tsx:41`, `:180`, `:201`, `PagesBar.test.tsx`.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`), aucun
  seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé. Le changement
  d'attendu de `toolbar.test.ts:167` (`table` ajouté) est le seul attendu changé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/apps/web/src/wasm apps/web/src/` ;
  `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/apps/web/src/wasm-formats apps/web/src/`.
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle ; jamais GPL, LGPL ni AGPL.
- GC11 Interface : dans `apps/web/src/ui/`, aucun `switch`, aucune taille en `px` dans un `.tsx`, libellés en français,
  aucune icône seule, cibles d'au moins `--rb-btn-m`.
- GC13 Périmètre : seuls les fichiers ci-dessus ; le profil `simple` n'est pas touché.
- GC14 `tsc` : `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"` vide.
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.

**Interdits.** Aucune barre flottante ni menu contextuel sur le tableau (T10) ; ne pas changer `ProfileEditor.tsx` (le
catalogue lit les tables, P15) ; ne pas changer l'ordre des éléments existants des profils.

**Critère « terminé ».** Commande bornée verte, `tsc` vide, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges des tables et des profils.** Dans `toolbar.test.ts:167`, l'attendu devient
  `["arrow", "ellipse", "eraser", "hand", "line", "pen", "rect", "select", "table", "text"]`. Ajouter (importer
  `TABLE_ACTIONS`, `TABLE_FILLS`) :

```ts
describe("actions du tableau (C10a)", () => {
  it("TOOL_TABLE.table : « Tableau », choix table", () => {
    expect(TOOL_TABLE["table"]).toEqual({ label: "Tableau", choice: "table" });
  });
  it("ACTION_TABLE porte les cinq actions ; TABLE_ACTIONS dans l'ordre de la rangée (T10)", () => {
    expect(TABLE_ACTIONS).toEqual(["table-row-insert", "table-col-insert", "table-row-remove", "table-col-remove", "table-uniform"]);
    expect(TABLE_ACTIONS.map((a) => ACTION_TABLE[a]?.label)).toEqual(["+ Ligne", "+ Colonne", "− Ligne", "− Colonne", "Uniformiser"]);
  });
  it("TABLE_FILLS : aucune puis cinq teintes claires (T12, HC10-5)", () => {
    expect(TABLE_FILLS.map((f) => [f.id, f.label, f.color])).toEqual([
      ["aucun", "Aucun", null],
      ["jaune", "Jaune", "#fef08a"],
      ["vert", "Vert", "#bbf7d0"],
      ["bleu", "Bleu", "#bfdbfe"],
      ["rose", "Rose", "#fecdd3"],
      ["gris", "Gris", "#e5e7eb"],
    ]);
  });
});
```

Dans `toolbar-profiles.test.ts` :

```ts
describe("outil Tableau dans les profils (C10a, T6)", () => {
  it("defaut et annotation : Tableau juste après Texte ; simple : sans Tableau", () => {
    for (const p of ["defaut", "annotation"]) {
      const edition = builtinProfile(p)!.toolbars[0]!.groups.find((g) => g.id === "edition")!.items.map((i) => i.id);
      expect(edition.indexOf("table"), p).toBe(edition.indexOf("text") + 1);
    }
    expect(ids("simple")).not.toContain("table");
  });
});
```

(`ids` et `builtinProfile` sont déjà définis ou importés par le fichier, ligne 14.)

- [ ] **Étape 3 : `toolbar.ts` et `toolbar-profiles.ts`.** Dans `TOOL_TABLE`, après `text` :
  `table: { label: "Tableau", choice: "table" },`. Dans `ACTION_TABLE`, après `profiles` :

```ts
  "table-row-insert": { label: "+ Ligne" },
  "table-col-insert": { label: "+ Colonne" },
  "table-row-remove": { label: "− Ligne" },
  "table-col-remove": { label: "− Colonne" },
  "table-uniform": { label: "Uniformiser" },
```

Après `ACTION_TABLE` :

```ts
/** Boutons de structure du tableau (C10a, DAC4), dans l'ordre de la rangée contextuelle. */
export const TABLE_ACTIONS: readonly ActionId[] = Object.freeze([
  "table-row-insert",
  "table-col-insert",
  "table-row-remove",
  "table-col-remove",
  "table-uniform",
]);

/** Pastille de remplissage d'une cellule (T12, HC10-5) ; `color` null : retire le remplissage. */
export interface TableFill { readonly id: string; readonly label: string; readonly color: string | null }
/** Aucune, puis cinq teintes claires (le texte noir reste lisible). */
export const TABLE_FILLS: readonly TableFill[] = Object.freeze([
  { id: "aucun", label: "Aucun", color: null },
  { id: "jaune", label: "Jaune", color: "#fef08a" },
  { id: "vert", label: "Vert", color: "#bbf7d0" },
  { id: "bleu", label: "Bleu", color: "#bfdbfe" },
  { id: "rose", label: "Rose", color: "#fecdd3" },
  { id: "gris", label: "Gris", color: "#e5e7eb" },
]);
```

Dans `toolbar-profiles.ts:57`, groupe `edition` : `…, tool("text", "Texte"), tool("table", "Tableau")] },`.

- [ ] **Étape 4 : tests rouges de l'état et de l'hôte.** Dans `ui/item-state.test.ts` :

```ts
describe("état des actions du tableau (C10a, T10)", () => {
  const cell = (rows: number, cols: number) => ({ id: "t", row: 0, col: 0, rows, cols });
  it("sans cellule active : les cinq actions grisées", () => {
    for (const a of ["table-row-insert", "table-col-insert", "table-row-remove", "table-col-remove", "table-uniform"]) {
      expect(itemState(action(a), view()).disabled, a).toBe(true);
      expect(itemState(action(a), view({ tableCell: null })).disabled, a).toBe(true);
    }
  });
  it("cellule active : tout permis ; une seule ligne ou colonne : « − » grisé ; 64 : « + » grisé (T4, HC10-9)", () => {
    expect(itemState(action("table-row-remove"), view({ tableCell: cell(3, 4) })).disabled).toBe(false);
    expect(itemState(action("table-row-remove"), view({ tableCell: cell(1, 4) })).disabled).toBe(true);
    expect(itemState(action("table-col-remove"), view({ tableCell: cell(3, 1) })).disabled).toBe(true);
    expect(itemState(action("table-row-insert"), view({ tableCell: cell(64, 4) })).disabled).toBe(true);
    expect(itemState(action("table-col-insert"), view({ tableCell: cell(3, 64) })).disabled).toBe(true);
    expect(itemState(action("table-col-insert"), view({ tableCell: cell(3, 63) })).disabled).toBe(false);
    expect(itemState(action("table-uniform"), view({ tableCell: cell(3, 4) })).disabled).toBe(false);
  });
});
```

Dans `app/toolbar-host.test.ts`, ajouter `tableAction: vi.fn(), tableFill: vi.fn(),` à l'objet `engine` de `setup`,
puis :

```ts
describe("ToolbarHost — tableau (C10a, DAC4)", () => {
  it("les cinq actions vont à engine.tableAction", () => {
    const { host, engine } = setup();
    for (const id of ["table-row-insert", "table-col-insert", "table-row-remove", "table-col-remove", "table-uniform"]) host.runAction(id);
    expect(engine.tableAction.mock.calls.map((c) => c[0])).toEqual(["row-insert", "col-insert", "row-remove", "col-remove", "uniform"]);
  });
  it("tableFill → engine.tableFill (null retire)", () => {
    const { host, engine } = setup();
    host.tableFill("#fef08a");
    host.tableFill(null);
    expect(engine.tableFill.mock.calls).toEqual([["#fef08a"], [null]]);
  });
  it("outil Tableau : setTool(table) → engine.setTool(table)", () => {
    const { host, engine } = setup();
    host.setTool("table");
    expect(engine.setTool).toHaveBeenCalledWith("table");
  });
});
```

Voir rouge.

- [ ] **Étape 5 : `item-state.ts` et `toolbar-host.ts`.** `item-state.ts` :

```ts
import { TABLE_MAX_LINES } from "../core/api";
import type { TableCellState } from "../engine/table-geom";
import { TOOL_TABLE, type ToolItem } from "../toolbar";
```

Dans `ToolbarView`, après `pageCount` :

```ts
  /** Cellule active de l'outil Tableau (C10a) ; absente ou null : aucune (PC9). */
  readonly tableCell?: TableCellState | null;
```

Dans `ACTION_STATE`, après `page-remove` :

```ts
  "table-row-insert": (v) => ({ disabled: !v.tableCell || v.tableCell.rows >= TABLE_MAX_LINES }),
  "table-col-insert": (v) => ({ disabled: !v.tableCell || v.tableCell.cols >= TABLE_MAX_LINES }),
  "table-row-remove": (v) => ({ disabled: !v.tableCell || v.tableCell.rows <= 1 }),
  "table-col-remove": (v) => ({ disabled: !v.tableCell || v.tableCell.cols <= 1 }),
  "table-uniform": (v) => ({ disabled: !v.tableCell }),
```

`toolbar-host.ts` : import `presetsOf` de `../toolbar` ; `ToolbarHost` gagne

```ts
  /** Pastille de remplissage de la rangée du tableau (C10a, T12) ; null retire. */
  tableFill(fill: string | null): void;
```

`HostTargets.engine` : ajouter `| "tableAction" | "tableFill"` au `Pick`. Dans `ACTIONS`, après `profiles` :

```ts
  "table-row-insert": (t) => t.engine().tableAction("row-insert"),
  "table-col-insert": (t) => t.engine().tableAction("col-insert"),
  "table-row-remove": (t) => t.engine().tableAction("row-remove"),
  "table-col-remove": (t) => t.engine().tableAction("col-remove"),
  "table-uniform": (t) => t.engine().tableAction("uniform"),
```

Dans `createLocalToolbarHost`, remplacer la ligne 45 par
`const p = presetsOf(profile().presets, tool).find((x) => x.id === preset);` et ajouter après `dropFiles` :

```ts
    tableFill: (fill) => t.engine().tableFill(fill),
```

- [ ] **Étape 6 : tests rouges de la rangée.** Dans `ui/Toolbar.test.tsx`, ajouter `tableFill: vi.fn()` à l'objet
  `host` de `setup`, puis :

```tsx
describe("Toolbar — rangée du tableau (C10a, T10)", () => {
  const CELL = { id: "t", row: 0, col: 0, rows: 3, cols: 4 };
  const actionIds = (root: ParentNode): (string | null)[] =>
    [...root.querySelectorAll("button[data-table-action]")].map((b) => b.getAttribute("data-table-action"));

  it("outil Tableau actif : séparateur, cinq actions puis six pastilles ; autre outil : rien", () => {
    const { container, setV } = setup();
    expect(container.querySelector("[data-table-sep]")).toBeNull();
    setV({ ...VIEW, tool: "table", tableCell: CELL });
    expect(actionIds(container)).toEqual(["table-row-insert", "table-col-insert", "table-row-remove", "table-col-remove", "table-uniform"]);
    expect(container.querySelector('[data-table-action="table-row-insert"]')!.textContent).toBe("+ Ligne");
    expect([...container.querySelectorAll("button[data-table-fill]")].map((b) => b.textContent)).toEqual(["Aucun", "Jaune", "Vert", "Bleu", "Rose", "Gris"]);
    expect(container.querySelector("button[data-table-action][data-item]")).toBeNull();
    setV({ ...VIEW, tool: "pen" });
    expect(actionIds(container)).toEqual([]);
  });

  it("sans cellule active : tout grisé ; une seule ligne : « − Ligne » grisé ; 64 colonnes : « + Colonne » grisé", () => {
    const { container, setV } = setup();
    setV({ ...VIEW, tool: "table", tableCell: null });
    expect([...container.querySelectorAll<HTMLButtonElement>("button[data-table-action], button[data-table-fill]")].every((b) => b.disabled)).toBe(true);
    setV({ ...VIEW, tool: "table", tableCell: { ...CELL, rows: 1, cols: 64 } });
    const q = (id: string) => container.querySelector<HTMLButtonElement>(`[data-table-action="${id}"]`)!;
    expect([q("table-row-remove").disabled, q("table-col-insert").disabled, q("table-row-insert").disabled]).toEqual([true, true, false]);
  });

  it("clic : runAction de l'action ; pastille : tableFill (null pour « Aucun »)", () => {
    const { container, host, setV } = setup();
    setV({ ...VIEW, tool: "table", tableCell: CELL });
    fireEvent.click(container.querySelector('[data-table-action="table-col-insert"]')!);
    expect(host.runAction).toHaveBeenCalledWith("table-col-insert");
    fireEvent.click(container.querySelector('[data-table-fill="jaune"]')!);
    fireEvent.click(container.querySelector('[data-table-fill="aucun"]')!);
    expect((host.tableFill as ReturnType<typeof vi.fn>).mock.calls).toEqual([["#fef08a"], [null]]);
  });
});
```

Voir rouge.

- [ ] **Étape 7 : `Toolbar.tsx`, `PagesBar.tsx`, `rb.css`.** `Toolbar.tsx` : ajouter `ACTION_TABLE`, `TABLE_ACTIONS`,
  `TABLE_FILLS` à l'import de `../toolbar`. Après `PresetRow` :

```tsx
/** Action fabriquée pour l'état des boutons du tableau : même table `ACTION_STATE` qu'une action de profil. */
const tableItem = (id: string): ToolItem => ({ id, kind: "action", action: id, label: ACTION_TABLE[id]?.label ?? id, requires: [], rest: {} });

/** Rangée du tableau (C10a, T10, DAC4) : outil Tableau actif, à la place des préréglages ; cinq actions, puis les pastilles. */
function TableActionRow(props: { view: Accessor<ToolbarView>; host: ToolbarHost }): JSX.Element {
  return (
    <Show when={props.view().tool === TOOL_TABLE["table"]?.choice}>
      <span class="rb-sep" role="separator" data-table-sep />
      <For each={TABLE_ACTIONS}>
        {(id) => {
          const st = createMemo(() => itemState(tableItem(id), props.view()));
          return (
            <button type="button" data-table-action={id} disabled={st().disabled} onClick={() => props.host.runAction(id)}>
              {st().label}
            </button>
          );
        }}
      </For>
      <For each={TABLE_FILLS}>
        {(f) => (
          <button
            type="button"
            class="rb-preset"
            data-table-fill={f.id}
            title={f.label}
            disabled={!props.view().tableCell}
            onClick={() => props.host.tableFill(f.color)}
          >
            <span class="rb-swatch rb-swatch-square" aria-hidden="true" style={{ "background-color": f.color ?? "transparent" }} />
            {f.label}
          </button>
        )}
      </For>
    </Show>
  );
}
```

Dans `Toolbar`, dans `<Show when={props.bar.role === "tools"}>`, après `<PresetRow … />` :
`<TableActionRow view={props.view} host={props.host} />` (envelopper les deux dans un fragment `<>…</>`).

`PagesBar.tsx:22` : `NEUTRAL` gagne `tableCell: null` (vue neutre explicite).

`rb.css`, après `.rb-swatch` :

```css
/* Tableau (C10a) : pastilles carrées de la rangée du tableau ; grille de choix posée au point cliqué (app/table-picker.ts). */
.rb-swatch-square { border-radius: 2px; }
.rb-table-picker { position: absolute; z-index: 4; display: grid; gap: var(--rb-gap); padding: var(--rb-pad); background: #ffffff; border: 1px solid #a1a1aa; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); }
.rb-table-picker[hidden] { display: none; }
.rb-table-picker-grid { display: grid; grid-template-columns: repeat(8, var(--rb-btn-s)); gap: 2px; }
.rb-table-picker-grid button { inline-size: var(--rb-btn-s); block-size: var(--rb-btn-s); padding: 0; border: 1px solid #a1a1aa; background: #ffffff; }
.rb-table-picker-grid button[data-on] { background: #bfdbfe; border-color: #1e3a8a; }
.rb-table-picker [data-picker-label] { font-variant-numeric: tabular-nums; }
.rb-table-picker form { display: flex; align-items: center; gap: var(--rb-gap); }
.rb-table-picker input { inline-size: 4em; min-block-size: var(--rb-btn-m); }
.rb-table-picker form button { min-block-size: var(--rb-btn-m); padding: 0 var(--rb-pad); }
```

(Cases de la grille à `--rb-btn-s` : 8 × 36 px tiennent sous le doigt ; la boîte et « Créer » restent à `--rb-btn-m`.)

- [ ] **Étape 8 : preuve bornée et `tsc`** (GC14 vide).

- [ ] **Étape 9 : commit.**

```bash
cd "$WT" && git add apps/web/src/toolbar.ts && git add apps/web/src/toolbar.test.ts && \
git add apps/web/src/toolbar-profiles.ts && git add apps/web/src/toolbar-profiles.test.ts && \
git add apps/web/src/ui/item-state.ts && git add apps/web/src/ui/item-state.test.ts && \
git add apps/web/src/ui/Toolbar.tsx && git add apps/web/src/ui/Toolbar.test.tsx && \
git add apps/web/src/ui/PagesBar.tsx && git add apps/web/src/ui/rb.css && \
git add apps/web/src/app/toolbar-host.ts && git add apps/web/src/app/toolbar-host.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(toolbar): Table tool, five table actions, contextual row and fill swatches" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : N tests, noms vus, une ligne `Réutilisation :` par ligne `Réutilise :` (quatre lignes).

---

<a id="tache-t9"></a>

### Tâche T9 — Outil Tableau : création, cellule active, clavier, actions, `prune`

**Objectif.** L'outil Tableau (T6 à T12 du cadrage) : clic hors d'un tableau → grille de choix au point (px de la
scène) ; choix → `AddTable` au point (décalé à gauche si le tableau dépasse la largeur **lue sur la page**), saisie
ouverte sur la première cellule ; clic sur un tableau → **le tableau le plus haut sous le point, même sous l'encre**
(I2), sa cellule devient active et s'ouvre ; une `SetTableCell` par validation, avec la hauteur exigée (T5) ; Tab,
Maj+Tab, flèches au bord par `navigate` (Tab en dernière cellule ajoute une ligne, inerte à 64) ; porte IME partagée ;
clic pendant la saisie : valide seulement ; actions de structure, Uniformiser, remplissage, Suppr ; cellule active
tenue **par ids**, retirée par `prune` quand elle disparaît (I1), glissée à la voisine après « − Ligne » / « − Colonne »
sur sa propre ligne (HC10-17).

**Fichiers.**
- Créer : `apps/web/src/engine/tools/table.ts`, `apps/web/src/engine/tools/table.test.ts`
- Modifier (tests) : `apps/web/src/engine/engine.test.ts` (bloc neuf « moteur et outil Tableau (C10a, S2) »)

**Interfaces.**
- Consomme : (T3) `TableData`, `TableAxis`, `TABLE_MAX_LINES`, la fausse liaison du tableau ; (T4) `TableTool`,
  `ToolContext.stateChanged`, `tableAt`, `cellAt`, `cellRect`, `cellOf`, `cellContent`, `step`, `cellHeight`,
  `rowHeightsFor`, `TABLE_COL_WIDTH`, `TABLE_ROW_HEIGHT`, `TABLE_PADDING`, `CellRef`, `Cell`, `NavMove`, `TableAction`,
  `TableCellState`, `invertMatrix` ; (T5) `createCommitGate`, `TextEditSession.background`, `TextEditorHost`,
  `TextStyle`.
- Produit (lu par T11) :

```ts
/** Grille de choix (hôte DOM : app/table-picker.ts, même forme que TablePickerHost) ; `at` en px CSS de la scène. */
export interface TablePicker {
  open(at: { readonly x: number; readonly y: number }, pick: (cols: number, rows: number) => void): void;
  close(): void;
  isOpen(): boolean;
}
/** Fond de la zone de saisie d'une cellule sans remplissage (HC10-10). */
export const CELL_EDITOR_BACKGROUND = "#ffffff";
export function createTableTool(ctx: ToolContext, editor: TextEditorHost, picker: TablePicker, style: () => TextStyle, measure: Measure): TableTool;
```

- Réutilise : `apps/web/src/engine/tools/text.ts:50` (patron de l'outil Texte) ; `commit-gate.ts` (porte IME) —
  `engine/tools/table.ts` : `createTableTool(ctx, editor, picker, style, measure): TableTool`, `TableTool extends GestureTool { cell(); act(); fill(); clearCell(); prune(); navigate(m); compositionStart(); compositionEnd(); requestCommit() }`
  (nouveau module, dans le patron de l'outil Texte).
- Réutilise : `apps/web/src/engine/tools/tool.ts:10`, `:32`, `:52` ; `render/overlay.ts:21-32` — `ToolContext`,
  `GestureTool`, `NO_LIVE`, `EditOverlay.frame` (cadre de la cellule active).
- Réutilise : `apps/web/src/core/api.ts:113-120` (`PageView.width`) par `CoreDocument.page` — `ctx.doc.page(page).width`
  (jamais `PAGE_WIDTH`, constat `architecture-constats.md:8`).
- Réutilise : `apps/web/src/core/shapes.ts:8`, `:86` ; `engine/camera.ts:16` — `translateMatrix`, `composeMatrix`,
  `applyMatrix`, `screenToWorld`.
- Réutilise : `apps/web/src/engine/table-geom.ts` (T4) — `tableAt(doc, page, x, y)` (parcours de `elementIds` du
  dessus vers le dessous, sans `hitTest`, I2), `step`, `cellHeight`, `rowHeightsFor`.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/engine/tools/table.test.ts src/engine/engine.test.ts src/engine/tools/text.test.ts --reporter=verbose 2>&1 | grep -E "Tableau|C10a|×|FAIL|Test Files|Tests " | tail -60
```

Attendu : aucun `×` ; au moins 18 lignes `✓ outil Tableau (C10a)`, 3 `✓ moteur et outil Tableau (C10a, S2)` ; tout
`engine.test.ts` et `text.test.ts` verts (carte d'impact : outil Texte inchangé).

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`), aucun
  seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/apps/web/src/wasm apps/web/src/` ;
  `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/apps/web/src/wasm-formats apps/web/src/`.
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle ; jamais GPL, LGPL ni AGPL.
- GC12 Largeur de page : lue sur la page (`ctx.doc.page(page).width`) ; aucun usage de `PAGE_WIDTH`.
- GC13 Périmètre : seuls les fichiers ci-dessus.
- GC14 `tsc` : `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"` vide.
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.

**Interdits.** Pas de sélection de plage de cellules ; l'outil Texte n'édite pas une cellule (HC10-11) ; aucune
liaison neuve ; ne pas toucher `engine.ts` (branché par T4), `board-session.ts` (T11).

**Patron à ne pas reprendre.** (1) `apps/web/src/engine/tools/text.ts:100-104` : `ctx.doc.hitTest(page, x, y, tol)`
rend l'élément **du dessus** — un trait tracé sur une cellule ouvrirait une boîte de texte au lieu de la cellule (I2).
Chemin de référence : `tableAt` de `engine/table-geom.ts` (T4), qui parcourt `doc.elementIds(page)` du dessus vers
le dessous en ne retenant que les `kind: "table"`. (2) Tenir la cellule active par rangs (`{ row: 1, col: 0 }`) :
après une insertion ou un Ctrl+Z, le rang désigne une autre cellule ou une ligne absente ; chemin de référence :
`tools/select.ts` (sélection par ids) et `engine.ts:244`, `:258` (`prune` après chaque commande et chaque historique) —
la cellule active est un `CellRef` (ids), relue par `cellOf` à chaque usage. (3) Retirer une ligne puis chercher la
voisine : `prune`, appelé par `run` pendant la commande, aurait déjà retiré la cellule active ; la voisine est posée
**avant** la commande et remise si le cœur refuse.

**Critère « terminé ».** Commande bornée verte, `tsc` vide, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges de l'outil.** Créer `apps/web/src/engine/tools/table.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { Command, TableData } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import type { InputSample } from "../input/sampler";
import { cellHeight } from "../table-geom";
import type { Measure } from "../text-layout";
import { createTableTool, type TablePicker } from "./table";
import type { TextEditorHost, TextEditSession } from "./text";
import type { TableTool, ToolContext } from "./tool";

const at = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });
/** 10 unités par caractère à toute taille. */
const narrow: Measure = (s) => s.length * 10;
type AddTable = Extract<Command, { type: "AddTable" }>;

class FakeHost implements TextEditorHost {
  opened: TextEditSession[] = [];
  closed = 0;
  text = "";
  open(s: TextEditSession): void {
    this.opened.push(s);
    this.text = s.initial;
  }
  close(): void {
    this.closed++;
  }
  value(): string {
    return this.text;
  }
  last(): TextEditSession {
    const s = this.opened[this.opened.length - 1];
    if (!s) throw new Error("rien d'ouvert");
    return s;
  }
}

class FakePicker implements TablePicker {
  at: { x: number; y: number } | null = null;
  private pick: ((cols: number, rows: number) => void) | null = null;
  open(at: { readonly x: number; readonly y: number }, pick: (cols: number, rows: number) => void): void {
    this.at = { x: at.x, y: at.y };
    this.pick = pick;
  }
  close(): void {
    this.at = null;
    this.pick = null;
  }
  isOpen(): boolean {
    return this.at !== null;
  }
  /** Comme la vraie grille : fermée, puis le choix. */
  choose(cols: number, rows: number): void {
    const p = this.pick;
    this.close();
    p?.(cols, rows);
  }
}

function setup() {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  const runs: Command[] = [];
  let changes = 0;
  const host = new FakeHost();
  const picker = new FakePicker();
  const holder: { tool?: TableTool } = {};
  // Comme `run` du moteur : erreur rendue null, `prune` après chaque commande (I1).
  const ctx: ToolContext = {
    doc,
    page: () => page,
    camera: () => ({ zoom: 1, tx: 0, ty: 0 }),
    run: (cmd) => {
      runs.push(cmd);
      try {
        const c = doc.apply(cmd);
        holder.tool?.prune();
        return c;
      } catch {
        return null;
      }
    },
    requestFrame: () => undefined,
    stateChanged: () => {
      changes++;
    },
  };
  const tool = createTableTool(ctx, host, picker, () => ({ color: "#000000", size: 36 }), narrow);
  holder.tool = tool;
  const click = (x: number, y: number): void => {
    tool.begin(1, [at(x, y)]);
    tool.close(1, "end");
  };
  const table = (id: string): TableData => {
    const v = doc.element(id);
    if (v?.kind !== "table") throw new Error("tableau");
    return v.table;
  };
  /** Tableau cols × rows créé par la grille en (x, y) ; saisie ouverte sur sa première cellule. */
  const create = (x: number, y: number, cols: number, rows: number): string => {
    click(x, y);
    picker.choose(cols, rows);
    const ids = doc.elementIds(page);
    return ids[ids.length - 1] ?? "";
  };
  const last = (): Command | undefined => runs[runs.length - 1];
  return { doc, page, runs, host, picker, tool, click, create, table, last, type: (s: string) => (host.text = s), changes: () => changes };
}

/** 2 × 2 en (100, 200), « xy » saisi dans la dernière cellule (1, 1), saisie ouverte. */
function lastCellXY() {
  const s = setup();
  const id = s.create(100, 200, 2, 2);
  s.tool.navigate("next");
  s.tool.navigate("next");
  s.tool.navigate("next");
  s.type("xy");
  return { ...s, id };
}

describe("outil Tableau (C10a)", () => {
  it("S1 : clic hors d'un tableau : grille au point ; 4 × 3 choisi : AddTable au point, saisie ouverte sur la première cellule", () => {
    const s = setup();
    s.click(100, 200);
    expect(s.picker.at).toEqual({ x: 100, y: 200 });
    expect(s.runs).toEqual([]);
    s.picker.choose(4, 3);
    expect(s.runs[0]).toEqual({ type: "AddTable", page: s.page, x: 100, y: 200, cols: 4, rows: 3, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 });
    const o = s.host.last();
    expect([o.matrix, o.boxWidth, o.background, o.initial, o.size, o.color]).toEqual([[1, 0, 0, 1, 108, 208], 224, "#ffffff", "", 36, "#000000"]);
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 0, rows: 3, cols: 4 });
    expect(s.changes()).toBeGreaterThan(0);
  });

  it("tableau qui dépasserait la largeur de page : décalé à gauche, x ≥ 0 (T4, GC12)", () => {
    const s = setup();
    s.create(1800, 50, 4, 2);
    expect((s.runs[0] as AddTable).x).toBe(1920 - 4 * 240);
    s.tool.requestCommit();
    s.click(1800, 600);
    s.picker.choose(9, 1);
    expect((s.last() as AddTable).x).toBe(0);
  });

  it("Tab : valide la cellule et ouvre la suivante ; fin de ligne → début de la suivante (T8)", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.type("a");
    expect(s.tool.navigate("next")).toBe(true);
    expect(s.last()).toMatchObject({ type: "SetTableCell", id, content: "a" });
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 1 });
    s.type("b");
    s.tool.navigate("next");
    expect(s.tool.cellState()).toMatchObject({ row: 1, col: 0 });
    expect(s.host.last().matrix).toEqual([1, 0, 0, 1, 108, 272]);
  });

  it("S2 : Tab dans la dernière cellule ajoute une ligne et ouvre sa première cellule ; deux étapes (T9, HC10-2)", () => {
    const s = lastCellXY();
    const v0 = s.doc.version();
    expect(s.tool.navigate("next")).toBe(true);
    expect(s.runs.slice(-2).map((c) => c.type)).toEqual(["SetTableCell", "InsertTableLine"]);
    expect(s.last()).toEqual({ type: "InsertTableLine", id: s.id, axis: "row", at: 2 });
    expect(s.doc.version()).toBe(v0 + 2);
    expect(s.tool.cellState()).toMatchObject({ row: 2, col: 0, rows: 3 });
    expect(s.host.last().initial).toBe("");
  });

  it("S2 : Maj+Tab revient à la cellule « xy » (rouverte avec son texte)", () => {
    const s = lastCellXY();
    s.tool.navigate("next");
    expect(s.tool.navigate("prev")).toBe(true);
    expect(s.tool.cellState()).toMatchObject({ row: 1, col: 1 });
    expect(s.host.last().initial).toBe("xy");
  });

  it("S2 : flèche → en dernière colonne : cellule suivante dans l'ordre de lecture ; ↑ au bord, ↓ au bord : non pris", () => {
    const s = lastCellXY();
    s.tool.navigate("next");
    s.tool.navigate("prev");
    expect(s.tool.navigate("right")).toBe(true);
    expect(s.tool.cellState()).toMatchObject({ row: 2, col: 0 });
    expect(s.tool.navigate("down")).toBe(false);
    s.tool.navigate("up");
    s.tool.navigate("up");
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 0 });
    expect(s.tool.navigate("up")).toBe(false);
  });

  it("Maj+Tab dans la première cellule : pris, rien ne change, saisie ouverte", () => {
    const s = setup();
    s.create(100, 200, 2, 2);
    const [opened, closed] = [s.host.opened.length, s.host.closed];
    expect(s.tool.navigate("prev")).toBe(true);
    expect([s.host.opened.length, s.host.closed]).toEqual([opened, closed]);
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 0 });
  });

  it("S2 : cellule sous un trait : c'est la cellule qui s'ouvre (I2)", () => {
    const s = setup();
    s.create(100, 200, 2, 2);
    s.tool.requestCommit();
    s.doc.apply({ type: "CommitStroke", page: s.page, points: new Float32Array([300, 260, 0.5, 420, 260, 0.5]), style: { color: "#000000", width: 4 } });
    s.click(400, 260);
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 1 });
    expect(s.host.last().matrix).toEqual([1, 0, 0, 1, 348, 208]);
    expect(s.picker.isOpen()).toBe(false);
  });

  it("S2 : Échap puis annuler l'ajout de ligne : la cellule active disparaît ; annuler encore : « xy » disparaît (I1)", () => {
    const s = lastCellXY();
    s.tool.navigate("next");
    s.tool.requestCommit();
    expect(s.tool.cellState()).toMatchObject({ row: 2, col: 0 });
    s.doc.undo();
    s.tool.prune();
    expect(s.tool.cellState()).toBeNull();
    expect(s.tool.live().overlay).toBeUndefined();
    s.doc.undo();
    expect(s.table(s.id).cells).toEqual([]);
  });

  it("tableau supprimé pendant la saisie : saisie fermée sans écrire (I1)", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.type("perdu");
    const n = s.runs.length;
    s.doc.apply({ type: "Delete", ids: [id] });
    s.tool.prune();
    expect([s.host.closed, s.tool.cellState()]).toEqual([1, null]);
    s.tool.requestCommit();
    expect(s.runs.length).toBe(n);
  });

  it("S2, HC10-17 : − Ligne sur la ligne active : la ligne du dessous devient active, saisie fermée ; dernière ligne : celle du dessus", () => {
    const s = setup();
    const id = s.create(100, 200, 1, 3);
    s.tool.navigate("next");
    const below = s.table(id).rows[2]?.id;
    const closed = s.host.closed;
    s.tool.act("row-remove");
    expect(s.last()).toMatchObject({ type: "RemoveTableLine", id, axis: "row" });
    expect(s.tool.cell()?.row).toBe(below);
    expect(s.tool.cellState()).toMatchObject({ row: 1, col: 0, rows: 2 });
    expect(s.host.closed).toBe(closed + 1);
    s.tool.act("row-remove");
    expect(s.tool.cellState()).toMatchObject({ row: 0, rows: 1 });
    const n = s.runs.length;
    s.tool.act("row-remove");
    expect([s.runs.length, s.table(id).rows.length]).toEqual([n, 1]);
  });

  it("− Colonne : la colonne de droite devient active, sinon celle de gauche", () => {
    const s = setup();
    const id = s.create(100, 200, 3, 1);
    s.tool.navigate("next");
    const right = s.table(id).cols[2]?.id;
    s.tool.act("col-remove");
    expect(s.tool.cell()?.col).toBe(right);
    expect(s.tool.cellState()).toMatchObject({ col: 1, cols: 2 });
  });

  it("+ Ligne dessous, + Colonne à droite (étude § 3.3) ; la cellule active reste la même", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.tool.act("row-insert");
    expect(s.last()).toEqual({ type: "InsertTableLine", id, axis: "row", at: 1 });
    s.tool.act("col-insert");
    expect(s.last()).toEqual({ type: "InsertTableLine", id, axis: "col", at: 1 });
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 0, rows: 3, cols: 3 });
  });

  it("S2 : Suppr — clearCell vide la cellule active, une étape ; saisie ouverte ou sans cellule : false (T7)", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    expect(s.tool.clearCell()).toBe(false);
    s.type("xy");
    s.tool.requestCommit();
    const v = s.doc.version();
    expect(s.tool.clearCell()).toBe(true);
    expect(s.table(id).cells).toEqual([]);
    expect(s.doc.version()).toBe(v + 1);
    expect(setup().tool.clearCell()).toBe(false);
  });

  it("S3 : texte long : SetTableCell porte la hauteur exigée ; la ligne grandit, les autres non (T5)", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    const long = "aaaaaaaaaa bbbbbbbbbb cccccccccc dddddddddd";
    s.type(long);
    s.tool.requestCommit();
    const h = cellHeight(long, 36, 240, narrow);
    const t = s.table(id);
    expect(s.last()).toEqual({ type: "SetTableCell", id, row: t.rows[0]?.id, col: t.cols[0]?.id, content: long, rowHeight: h });
    expect(h).toBeGreaterThan(64);
    expect(t.rows.map((r) => r.height)).toEqual([h, 64]);
  });

  it("S3 : Uniformiser : colonnes égales, largeur gardée, lignes égales et le long texte tient ; une étape ; déjà uniforme : aucune", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    const long = "aaaaaaaaaa bbbbbbbbbb cccccccccc dddddddddd";
    s.type(long);
    s.tool.requestCommit();
    const h = cellHeight(long, 36, 240, narrow);
    const v = s.doc.version();
    s.tool.act("uniform");
    const t = s.table(id);
    expect([t.cols.map((c) => c.width), t.rows.map((r) => r.height)]).toEqual([[240, 240], [h, h]]);
    expect(s.doc.version()).toBe(v + 1);
    s.tool.act("uniform");
    expect(s.doc.version()).toBe(v + 1);
  });

  it("S3 : pastille jaune : SetTableFill sur la cellule active ; sans cellule active : rien", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.tool.fill("#fef08a");
    const t = s.table(id);
    expect(s.last()).toEqual({ type: "SetTableFill", id, row: t.rows[0]?.id, col: t.cols[0]?.id, fill: "#fef08a" });
    expect(t.cells[0]?.fill).toBe("#fef08a");
    const u = setup();
    u.tool.fill("#fef08a");
    expect(u.runs).toEqual([]);
  });

  it("S3 : à 64 lignes, Tab en dernière cellule : sans effet, saisie ouverte (T4, HC10-9)", () => {
    const s = setup();
    s.doc.apply({ type: "AddTable", page: s.page, x: 0, y: 0, cols: 1, rows: 64, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 });
    s.click(120, 63 * 64 + 32);
    expect(s.tool.cellState()).toMatchObject({ row: 63, rows: 64 });
    const [n, closed] = [s.runs.length, s.host.closed];
    expect(s.tool.navigate("next")).toBe(true);
    expect([s.runs.length, s.host.closed]).toEqual([n, closed]);
  });

  it("composition : Tab non pris, validation différée jusqu'à compositionend (CL4-3)", () => {
    const s = setup();
    s.create(100, 200, 2, 2);
    s.type("日本");
    s.tool.compositionStart();
    expect(s.tool.navigate("next")).toBe(false);
    const n = s.runs.length;
    s.tool.requestCommit();
    s.click(5000, 5000);
    expect(s.runs.length).toBe(n);
    s.tool.compositionEnd();
    expect(s.last()).toMatchObject({ type: "SetTableCell", content: "日本" });
    expect(s.picker.isOpen()).toBe(false);
  });

  it("clic pendant la saisie : valide seulement ; grille ouverte : un clic la ferme seulement", () => {
    const s = setup();
    s.create(100, 200, 2, 2);
    s.type("a");
    const opened = s.host.opened.length;
    s.click(5000, 5000);
    expect(s.last()).toMatchObject({ type: "SetTableCell", content: "a" });
    expect([s.host.opened.length, s.picker.isOpen()]).toEqual([opened, false]);
    s.click(5000, 5000);
    expect(s.picker.isOpen()).toBe(true);
    s.click(5000, 5000);
    expect(s.picker.isOpen()).toBe(false);
  });

  it("leave : valide la saisie, retire la cellule active ; ferme la grille", () => {
    const s = setup();
    s.create(100, 200, 2, 2);
    s.type("a");
    s.tool.leave?.("tool");
    expect(s.last()).toMatchObject({ type: "SetTableCell", content: "a" });
    expect(s.tool.cellState()).toBeNull();
    const u = setup();
    u.click(10, 10);
    u.tool.leave?.("page");
    expect(u.picker.isOpen()).toBe(false);
  });

  it("aperçu : cadre de la cellule active en monde (EditOverlay.frame) ; sans cellule : aucun", () => {
    const s = setup();
    s.create(100, 200, 2, 2);
    expect(s.tool.live().overlay?.frame).toEqual({ x0: 100, y0: 200, x1: 340, y1: 264 });
    s.tool.leave?.("tool");
    expect(s.tool.live().overlay).toBeUndefined();
  });
});
```

Voir rouge (module absent).

- [ ] **Étape 3 : `engine/tools/table.ts`.**

```ts
/**
 * Outil Tableau (C10a, T6 à T12) : clic hors d'un tableau → grille de choix au point ; choix → AddTable, saisie ouverte
 * sur la première cellule. Clic sur un tableau → le plus haut sous le point, même sous l'encre (I2) : sa cellule devient
 * active et s'ouvre dans la zone de saisie du lot 4, fond opaque (HC10-10). Une SetTableCell par validation, hauteur
 * exigée mesurée comme le dessin (T5, B1) ; Tab, Maj+Tab, flèches au bord par `navigate` (DAC3) ; porte IME partagée
 * avec l'outil Texte. Cellule active tenue par ids, retirée par `prune` quand elle disparaît (I1).
 */
import type { Matrix, TableAxis, TableData } from "../../core/api";
import { TABLE_MAX_LINES } from "../../core/api";
import { plainSpans } from "../../core/rich-text";
import { applyMatrix, composeMatrix, translateMatrix } from "../../core/shapes";
import { screenToWorld } from "../camera";
import { EMPTY_OVERLAY } from "../render/overlay";
import {
  cellContent,
  cellHeight,
  cellOf,
  cellRect,
  rowHeightsFor,
  step,
  tableAt,
  TABLE_COL_WIDTH,
  TABLE_PADDING,
  TABLE_ROW_HEIGHT,
  type Cell,
  type CellRef,
} from "../table-geom";
import type { Measure } from "../text-layout";
import { createCommitGate } from "./commit-gate";
import type { TextEditorHost, TextStyle } from "./text";
import { NO_LIVE, type LivePart, type TableTool, type ToolContext } from "./tool";

/** Grille de choix (hôte DOM : `app/table-picker.ts`, même forme que `TablePickerHost`) ; `at` en px CSS de la scène. */
export interface TablePicker {
  open(at: { readonly x: number; readonly y: number }, pick: (cols: number, rows: number) => void): void;
  close(): void;
  isOpen(): boolean;
}

/** Fond de la zone de saisie d'une cellule sans remplissage (HC10-10). */
export const CELL_EDITOR_BACKGROUND = "#ffffff";

/** Cellule retrouvée dans le document : son tableau, sa matrice, ses rangs. */
interface Located {
  readonly ref: CellRef;
  readonly transform: Matrix;
  readonly table: TableData;
  readonly cell: Cell;
}
/** Saisie ouverte : la cellule (par ids), son texte à l'ouverture, la largeur et la taille pour la mesure. */
interface Opened {
  readonly ref: CellRef;
  readonly initial: string;
  readonly colWidth: number;
  readonly size: number;
}

export function createTableTool(ctx: ToolContext, editor: TextEditorHost, picker: TablePicker, style: () => TextStyle, measure: Measure): TableTool {
  let active: CellRef | null = null;
  let opened: Opened | null = null;
  let live: LivePart = NO_LIVE;
  const gate = createCommitGate(() => commit(), () => opened !== null);

  const locate = (ref: CellRef | null): Located | null => {
    if (ref === null) return null;
    const el = ctx.doc.element(ref.id);
    if (el?.kind !== "table") return null;
    const cell = cellOf(el.table, ref);
    return cell === null ? null : { ref, transform: el.transform, table: el.table, cell };
  };

  const refAt = (id: string, t: TableData, row: number, col: number): CellRef | null => {
    const r = t.rows[row];
    const c = t.cols[col];
    return r && c ? { id, row: r.id, col: c.id } : null;
  };

  /** Cadre de la cellule active (boîte monde de ses quatre coins), redemandé à chaque changement. */
  const refresh = (): void => {
    const at = locate(active);
    if (at === null) {
      live = NO_LIVE;
    } else {
      const r = cellRect(at.table, at.cell);
      const pts = [
        applyMatrix(at.transform, r.x0, r.y0),
        applyMatrix(at.transform, r.x1, r.y0),
        applyMatrix(at.transform, r.x1, r.y1),
        applyMatrix(at.transform, r.x0, r.y1),
      ];
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      live = { ...NO_LIVE, overlay: { ...EMPTY_OVERLAY, frame: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) } } };
    }
    ctx.requestFrame?.();
  };

  const setActive = (ref: CellRef | null): void => {
    active = ref;
    refresh();
    ctx.stateChanged?.();
  };

  /** Écrit la cellule ouverte (une SetTableCell au plus, T9) ; la saisie est fermée avant `editor.close()`. */
  function commit(): void {
    const o = opened;
    if (o === null) return;
    const content = editor.value();
    opened = null;
    gate.reset();
    editor.close();
    if (content !== o.initial) {
      ctx.run({
        type: "SetTableCell",
        id: o.ref.id,
        row: o.ref.row,
        col: o.ref.col,
        content,
        rowHeight: cellHeight(content, o.size, o.colWidth, measure),
      });
    }
    refresh();
  }

  /** Ouvre la saisie sur la cellule active : coin intérieur, largeur de colonne moins les marges, fond de la cellule. */
  const openActive = (): void => {
    const at = locate(active);
    if (at === null) {
      setActive(null);
      return;
    }
    const r = cellRect(at.table, at.cell);
    const colWidth = r.x1 - r.x0;
    const { text, fill } = cellContent(at.table, at.ref.row, at.ref.col);
    opened = { ref: at.ref, initial: text, colWidth, size: at.table.size };
    gate.reset();
    editor.open(
      {
        page: ctx.page(),
        id: at.ref.id,
        matrix: composeMatrix(at.transform, translateMatrix(r.x0 + TABLE_PADDING, r.y0 + TABLE_PADDING)),
        boxWidth: Math.max(1, colWidth - 2 * TABLE_PADDING),
        color: at.table.color,
        size: at.table.size,
        initial: text,
        spans: plainSpans(text),
        background: fill ?? CELL_EDITOR_BACKGROUND,
      },
      ctx.camera(),
    );
  };

  /** Grille choisie (T6) : coin au point, décalé à gauche si le tableau dépasse la largeur de la page (T4, x ≥ 0). */
  const create = (x: number, y: number, cols: number, rows: number): void => {
    const page = ctx.page();
    const width = ctx.doc.page(page)?.width;
    if (width === undefined) return;
    const st = style();
    const x0 = Math.max(0, Math.min(x, width - cols * TABLE_COL_WIDTH));
    const id = ctx.run({ type: "AddTable", page, x: x0, y, cols, rows, colWidth: TABLE_COL_WIDTH, rowHeight: TABLE_ROW_HEIGHT, color: st.color, size: st.size })?.ids[0];
    const el = id === undefined ? null : ctx.doc.element(id);
    if (id === undefined || el?.kind !== "table") return;
    setActive(refAt(id, el.table, 0, 0));
    openActive();
  };

  /** − Ligne / − Colonne (T7, HC10-17) : la voisine (suivante, sinon précédente) devient active avant la commande, pour
   *  que `prune` la garde ; refus du cœur : la cellule d'avant revient. */
  const removeLine = (ref: CellRef, axis: TableAxis, ids: readonly string[], i: number): void => {
    const line = ids[i];
    const near = ids[i + 1] ?? ids[i - 1];
    if (ids.length <= 1 || line === undefined || near === undefined) return;
    active = axis === "row" ? { ...ref, row: near } : { ...ref, col: near };
    if (ctx.run({ type: "RemoveTableLine", id: ref.id, axis, line }) === null) active = ref;
  };

  /** Uniformiser (T11) : colonnes à la largeur moyenne ; lignes à max(hauteur moyenne, plus grande hauteur exigée). */
  const uniform = (id: string, t: TableData): void => {
    const w = t.cols.reduce((s, c) => s + c.width, 0) / t.cols.length;
    const need = Math.max(...rowHeightsFor(t, t.cols.map(() => w), measure));
    const mean = t.rows.reduce((s, r) => s + r.height, 0) / t.rows.length;
    ctx.run({ type: "SetTableSizes", id, colWidth: w, rowHeight: Math.max(mean, need) });
  };

  return {
    begin(_pointerId, samples) {
      const s = samples[0];
      if (!s) return;
      // Clic pendant la saisie : valide seulement (comme l'outil Texte) ; grille ouverte : la ferme seulement.
      if (opened !== null) {
        gate.request();
        return;
      }
      if (picker.isOpen()) {
        picker.close();
        return;
      }
      const [x, y] = screenToWorld(ctx.camera(), s.x, s.y);
      const hit = tableAt(ctx.doc, ctx.page(), x, y);
      if (hit !== null) {
        setActive(refAt(hit.id, hit.table, hit.cell.row, hit.cell.col));
        openActive();
        return;
      }
      picker.open({ x: s.x, y: s.y }, (cols, rows) => create(x, y, cols, rows));
    },
    extend() {
      // la saisie passe par la zone
    },
    frame() {
      // rien à pousser
    },
    close() {
      // le clic a tout fait au begin
    },
    live: () => live,
    active: () => false,
    leave() {
      gate.request();
      picker.close();
      if (active !== null) setActive(null);
    },
    cell: () => active,
    cellState() {
      const at = locate(active);
      return at === null ? null : { id: at.ref.id, row: at.cell.row, col: at.cell.col, rows: at.table.rows.length, cols: at.table.cols.length };
    },
    act(a) {
      if (opened !== null) commit();
      const at = locate(active);
      if (at === null) return;
      const { ref, table: t, cell: c } = at;
      if (a === "row-insert") ctx.run({ type: "InsertTableLine", id: ref.id, axis: "row", at: c.row + 1 });
      else if (a === "col-insert") ctx.run({ type: "InsertTableLine", id: ref.id, axis: "col", at: c.col + 1 });
      else if (a === "row-remove") removeLine(ref, "row", t.rows.map((r) => r.id), c.row);
      else if (a === "col-remove") removeLine(ref, "col", t.cols.map((x) => x.id), c.col);
      else uniform(ref.id, t);
      refresh();
      ctx.stateChanged?.();
    },
    fill(color) {
      if (opened !== null) commit();
      const at = locate(active);
      if (at === null) return;
      ctx.run({ type: "SetTableFill", id: at.ref.id, row: at.ref.row, col: at.ref.col, fill: color });
      refresh();
    },
    clearCell() {
      if (opened !== null) return false;
      const at = locate(active);
      if (at === null) return false;
      ctx.run({ type: "SetTableCell", id: at.ref.id, row: at.ref.row, col: at.ref.col, content: "" });
      refresh();
      return true;
    },
    prune() {
      if (active === null) return;
      if (locate(active) !== null) {
        refresh();
        return;
      }
      // I1 : tableau, ligne ou colonne disparus : cellule retirée, saisie fermée sans rien écrire.
      active = null;
      if (opened !== null) {
        opened = null;
        gate.reset();
        editor.close();
      }
      refresh();
      ctx.stateChanged?.();
    },
    navigate(move) {
      const o = opened;
      if (o === null || gate.composing()) return false;
      const at = locate(o.ref);
      if (at === null) return false;
      const next = step(at.table, at.cell, move);
      const tab = move === "next" || move === "prev";
      // Au bord : Tab est pris (la saisie reste ouverte), une flèche est rendue à la zone.
      if (next === null) return tab;
      // 64 lignes : Tab en dernière cellule est inerte, la saisie reste ouverte (T4).
      if (next === "add-row" && at.table.rows.length >= TABLE_MAX_LINES) return true;
      commit();
      if (next === "add-row") {
        if (ctx.run({ type: "InsertTableLine", id: o.ref.id, axis: "row", at: at.table.rows.length }) === null) return true;
        const el = ctx.doc.element(o.ref.id);
        setActive(el?.kind === "table" ? refAt(o.ref.id, el.table, el.table.rows.length - 1, 0) : null);
      } else {
        setActive(refAt(o.ref.id, at.table, next.row, next.col));
      }
      openActive();
      return true;
    },
    compositionStart() {
      gate.compositionStart();
    },
    compositionEnd() {
      gate.compositionEnd();
    },
    requestCommit() {
      gate.request();
    },
  };
}
```

Vert : `vitest run src/engine/tools/table.test.ts` — attendu : 22 tests `✓`.

- [ ] **Étape 4 : intégration au moteur (S2), test rouge puis vert sans code neuf.** Dans `engine.test.ts`, ajouter les
  imports `createTableTool, type TablePicker` de `./tools/table` et `type TextEditorHost, type TextEditSession` de
  `./tools/text`, puis :

```ts
function setupRealTable() {
  const doc = fakeCore.blank();
  const frames = new Frames();
  const renderer = new FakeRenderer();
  const log: string[] = [];
  const host: TextEditorHost & { text: string } = {
    text: "",
    open(s: TextEditSession) {
      host.text = s.initial;
    },
    close() {},
    value: () => host.text,
  };
  let pick: ((c: number, r: number) => void) | null = null;
  const picker: TablePicker = {
    open: (_at, p) => {
      pick = p;
    },
    close: () => {
      pick = null;
    },
    isOpen: () => pick !== null,
  };
  const holder: { t?: TableTool } = {};
  const tools: ToolFactories = {
    pen: (ctx) => fakeTool("pen", log, ctx),
    eraser: (ctx) => fakeTool("eraser", log, ctx),
    table: (ctx, style) => {
      holder.t = createTableTool(ctx, host, picker, style, (s) => s.length * 10);
      return holder.t;
    },
  };
  const engine = createEngine({ doc, renderer, frames, tools });
  const tool = holder.t;
  if (tool === undefined) throw new Error("outil Tableau non créé");
  engine.setTool("table");
  /** Clic au point monde (caméra identité) puis choix cols × rows dans la grille. */
  const create = (x: number, y: number, cols: number, rows: number): void => {
    engine.sink.begin(1, "table", [{ ...sample, x, y }]);
    engine.sink.close(1, "end");
    const p = pick;
    pick = null;
    p?.(cols, rows);
  };
  return { doc, engine, host, tool, create };
}

describe("moteur et outil Tableau (C10a, S2)", () => {
  it("Ctrl+Z qui retire la ligne de la cellule active : tableCell null (I1)", () => {
    const { engine, tool, create } = setupRealTable();
    create(100, 200, 2, 1);
    expect(engine.state().tableCell).toMatchObject({ row: 0, col: 0, rows: 1, cols: 2 });
    tool.navigate("next");
    tool.navigate("next");
    tool.requestCommit();
    expect(engine.state().tableCell).toMatchObject({ row: 1, col: 0, rows: 2 });
    expect(engine.key(key("z", { ctrlKey: true }))).toBe(true);
    expect(engine.state().tableCell).toBeNull();
  });

  it("Suppr, outil Tableau, cellule active : vide la cellule, une étape ; outil Sélection : Suppr à la sélection", () => {
    const { doc, engine, host, tool, create } = setupRealTable();
    create(100, 200, 2, 2);
    host.text = "xy";
    tool.requestCommit();
    const v = doc.version();
    expect(engine.key(key("Delete"))).toBe(true);
    expect(doc.version()).toBe(v + 1);
    engine.setTool("select");
    expect(engine.state().tableCell).toBeNull();
    expect(engine.key(key("Delete"))).toBe(false);
  });

  it("− Ligne par engine.tableAction : la cellule active passe à la voisine, l'état suit", () => {
    const { engine, tool, create } = setupRealTable();
    create(100, 200, 1, 3);
    tool.navigate("next");
    tool.requestCommit();
    engine.tableAction("row-remove");
    expect(engine.state().tableCell).toMatchObject({ row: 1, col: 0, rows: 2 });
  });
});
```

`TableTool` vient de `./tools/tool` (import ajouté par T4). Lancer la commande bornée : les trois tests passent avec le
branchement de T4 (sinon, l'écart est un défaut de T4 à signaler, pas à corriger ici).

- [ ] **Étape 5 : preuve bornée et `tsc`** (GC14 vide).

- [ ] **Étape 6 : commit.**

```bash
cd "$WT" && git add apps/web/src/engine/tools/table.ts && git add apps/web/src/engine/tools/table.test.ts && \
git add apps/web/src/engine/engine.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(engine): Table tool (picker, active cell, Tab and arrows, structure, fill, prune)" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : N tests, noms vus, une ligne `Réutilisation :` par ligne `Réutilise :` (cinq lignes).

---

<a id="tache-t10"></a>

### Tâche T10 — Reste OD56 : `DroppedFile.head(n)`, en-tête seul lu avant refus

**Objectif.** Un fichier non reconnu est refusé après la lecture de son seul en-tête (T14 du cadrage, DAC5) :
`DroppedFile` gagne `head(n): Promise<Uint8Array>` (obligatoire) ; `importFiles` lit `head(HEAD_BYTES)` (sauf un
`.roomboard`, reconnu par son nom), détecte, refuse sans jamais appeler `blob()` ; `blob()` seulement pour un fichier
reconnu. Dans la coque, `head(n)` = un seul `read_granted_file{ offset: 0, len: n }`. S5 : `notes.xyz` de 50 Mo refusé
après un seul appel de 4 096 octets. Ferme le constat `platform/files.ts:49`.

**Fichiers.**
- Modifier : `apps/web/src/platform/files.ts:48-55`, `apps/web/src/platform/import.ts:107-127`,
  `apps/web/src/platform/host-tauri.ts:70-88` (`grantedFile`), `:146-150` (`pick`), `apps/web/src/platform/drop-web.ts:22-24`
- Tests : `apps/web/src/platform/import.test.ts`, `apps/web/src/platform/host-tauri.test.ts`,
  `apps/web/src/platform/drop-web.test.ts`, et les `DroppedFile` littéraux de `apps/web/src/platform/controller.test.ts:523`,
  `:533`, `apps/web/src/app/workspace.test.ts:136-148`, `apps/web/src/app/toolbar-host.test.ts:114` (gagnent `head`)

**Interfaces.**
- Consomme : rien de neuf (après T8, `toolbar-host.test.ts` est dans l'état de T8 : n'y changer que la ligne 114 ou son
  équivalent).
- Produit :

```ts
export interface DroppedFile {
  readonly name: string;
  readonly size: number;
  readonly mime: string;
  readonly path?: string;
  /** Au plus les `n` premiers octets ; dans la coque, un seul `read_granted_file` (OD56, DAC5). */
  head(n: number): Promise<Uint8Array>;
  /** Tout le fichier (par morceaux dans la coque), seulement pour un fichier reconnu. */
  blob(): Promise<Blob>;
}
```

- Réutilise : `apps/web/src/platform/files.ts:49` ; `host-tauri.ts:70` ; `drop-web.ts:22` ; `image-import.ts:28` —
  `DroppedFile.head(n)` (étendre, DAC5) ; `grantedFile`, `droppedFromFile` ; `HEAD_BYTES` (4 096).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/platform src/app/workspace.test.ts src/app/toolbar-host.test.ts --reporter=verbose 2>&1 | grep -E "S5|head|×|FAIL|Test Files|Tests " | tail -40
```

Attendu : aucun `×` ; présents : « S5 : non reconnu, head(4096) une fois, blob() jamais », « reconnu : head puis blob une
fois », « head(4096) : un seul read_granted_file », « droppedFromFile : head lit les n premiers octets ». À garder verts
(effet de bord « `DroppedFile` gagne `head` ») : tout `import.test.ts`, `host-tauri.test.ts` (« dépôt dans la coque :
lecture par morceaux »), `drop-web.test.ts`, `controller.test.ts`, `workspace.test.ts`, `toolbar-host.test.ts` ;
l'essai `c2-image-navigateur.mjs` est rejoué par T12.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`), aucun
  seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/apps/web/src/wasm apps/web/src/` ;
  `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/apps/web/src/wasm-formats apps/web/src/`.
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle ; jamais GPL, LGPL ni AGPL.
- GC13 Périmètre : seuls les fichiers ci-dessus ; `main.rs` (coque) n'est pas touché (`read_granted_file` lit déjà
  `offset`, `len`) ; aucun build Tauri.
- GC14 `tsc` : `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"` vide.
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.

**Interdits.** Ne pas changer la boîte « Importer » de la coque au-delà de `head` (hors périmètre : elle lit encore le
fichier choisi en entier, HR9) ; ne pas changer le message de refus (`LATER_FORMAT_MESSAGE`).

**Critère « terminé ».** Commande bornée verte, `tsc` vide, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges.** `import.test.ts` : la fabrique `file` gagne
  `head: async (n: number) => bytes.slice(0, n),` ; le `DroppedFile` `bad` (ligne 44) gagne
  `head: async () => new Uint8Array(),` ; celui de la ligne 175 gagne `head: async (n: number) => pngHead(10, 10).slice(0, n),`.
  Ajouter à la fin :

```ts
describe("en-tête seul avant refus (OD56, T14, DAC5)", () => {
  it("S5 : non reconnu, head(4096) une fois, blob() jamais ; message de refus", async () => {
    const head = vi.fn(async (n: number) => new Uint8Array(Math.min(n, 16)));
    const blob = vi.fn(async (): Promise<Blob> => {
      throw new Error("blob() ne doit pas être lu");
    });
    const f: DroppedFile = { name: "notes.xyz", size: 50 * 1024 * 1024, mime: "", head, blob };
    const notify = vi.fn(async (_m: string) => undefined);
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify }).importFiles([f]);
    expect(r.refused).toEqual(["notes.xyz"]);
    expect(head).toHaveBeenCalledTimes(1);
    expect(head).toHaveBeenCalledWith(4096);
    expect(blob).not.toHaveBeenCalled();
    expect(notify.mock.calls[0]![0]).toBe(`notes.xyz : ${LATER_FORMAT_MESSAGE}`);
  });

  it("reconnu : head puis blob une fois ; .roomboard : blob seul (reconnu par son nom)", async () => {
    const t = fakeTarget();
    const png = pngHead(200, 100);
    const head = vi.fn(async (n: number) => png.slice(0, n));
    const blob = vi.fn(async () => new Blob([png]));
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: vi.fn(async () => undefined), target: () => t.target, decode: decoded(200, 100) })
      .importFiles([{ name: "a.png", size: png.length, mime: "", head, blob }], null);
    expect(r.inserted).toEqual(["a.png"]);
    expect([head.mock.calls.length, blob.mock.calls.length]).toEqual([1, 1]);
    const rbHead = vi.fn(async () => new Uint8Array());
    const rbBlob = vi.fn(async () => new Blob([new Uint8Array([1, 2])]));
    await createImporter({ openDocument: vi.fn(async () => true), notify: vi.fn(async () => undefined) })
      .importFiles([{ name: "Cours.roomboard", size: 2, mime: "", head: rbHead, blob: rbBlob }]);
    expect([rbHead.mock.calls.length, rbBlob.mock.calls.length]).toEqual([0, 1]);
  });

  it("head qui lève : rangé dans failed, message, les autres continuent", async () => {
    const notify = vi.fn(async (_m: string) => undefined);
    const bad: DroppedFile = { name: "x.png", size: 1, mime: "", head: async () => { throw new Error("disque"); }, blob: async () => new Blob() };
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify }).importFiles([bad, file("b.txt")]);
    expect(r.failed).toEqual(["x.png"]);
    expect(r.refused).toEqual(["b.txt"]);
    expect(notify.mock.calls[0]![0]).toContain("Import impossible (x.png) : disque");
  });
});
```

`host-tauri.test.ts`, dans le bloc « coque : dépôt, lancement, sortie (T86) » :

```ts
  it("head(4096) : un seul read_granted_file, offset 0, len 4096 (S5, OD56)", async () => {
    const f = ipcFake({ "/tmp/notes.xyz": 50 * 1024 * 1024 });
    const h = await grantedFile(f.ipc, "/tmp/notes.xyz", 50 * 1024 * 1024).head(4096);
    expect(h.byteLength).toBe(4096);
    expect(f.reads).toEqual([{ path: "/tmp/notes.xyz", offset: 0, len: 4096 }]);
  });
```

`drop-web.test.ts` :

```ts
  it("droppedFromFile : head lit les n premiers octets (slice), sans tout lire", async () => {
    const f = new File([new Uint8Array([1, 2, 3, 4, 5])], "a.bin");
    expect([...(await droppedFromFile(f).head(3))]).toEqual([1, 2, 3]);
  });
```

Les littéraux `DroppedFile` des autres fichiers de tests gagnent `head` : `controller.test.ts:523`, `:533` →
`head: async () => new Uint8Array([1]),` ; `workspace.test.ts` `roomboardFile` → `head: async (n: number) => bytes.slice(0, n),`,
`plainFile` → `head: async (n: number) => bytes.slice(0, n),` ; `toolbar-host.test.ts:114` →
`head: async () => new Uint8Array(),`. Voir rouge : commande bornée (« blob() ne doit pas être lu », `head is not a function`).

- [ ] **Étape 3 : le code.** `files.ts:48-55` : l'interface du bloc Produit (commentaire de tête : « Fichier entrant
  (U23) : `path` dans la coque seulement ; `head(n)` avant la détection, `blob()` seulement pour un fichier reconnu
  (OD56) »). `import.ts`, remplacer le bloc `let blob … continue; }` et la détection (lignes 113-126) par :

```ts
        // OD56 (DAC5) : l'en-tête seul avant la détection ; un fichier non reconnu n'est jamais lu en entier.
        let head: Uint8Array;
        try {
          head = roomboard ? EMPTY : (await f.head(HEAD_BYTES)).subarray(0, HEAD_BYTES);
        } catch (e) {
          failed.push(f.name);
          await deps.notify(`${roomboard ? "Ouverture" : "Import"} impossible (${f.name}) : ${messageOf(e)}`);
          continue;
        }
        const handler = registry.find((h) => h.detect(head, f.name));
        if (handler === undefined) {
          refused.push(f.name);
          continue;
        }
        let blob: Blob;
        try {
          blob = await f.blob();
        } catch (e) {
          failed.push(f.name);
          await deps.notify(`${roomboard ? "Ouverture" : "Import"} impossible (${f.name}) : ${messageOf(e)}`);
          continue;
        }
```

(la suite, `handler.run(f, { blob, head, … })`, ne change pas). `host-tauri.ts`, dans `grantedFile`, avant `blob()` :

```ts
    async head(n: number) {
      return new Uint8Array(await ipc.invoke<ArrayBuffer>("read_granted_file", { path, offset: 0, len: n }));
    },
```

et dans `pick` : `{ name: baseName(path), size: bytes.byteLength, mime: "", path, head: async (n: number) => bytes.slice(0, n), blob: async () => new Blob([bytes.slice()]) }`.
`drop-web.ts:22-24` :

```ts
export function droppedFromFile(f: File): DroppedFile {
  return { name: f.name, size: f.size, mime: f.type, head: async (n) => new Uint8Array(await f.slice(0, n).arrayBuffer()), blob: async () => f };
}
```

- [ ] **Étape 4 : preuve bornée et `tsc`** (GC14 vide).

- [ ] **Étape 5 : commit.**

```bash
cd "$WT" && git add apps/web/src/platform/files.ts && git add apps/web/src/platform/import.ts && \
git add apps/web/src/platform/import.test.ts && git add apps/web/src/platform/host-tauri.ts && \
git add apps/web/src/platform/host-tauri.test.ts && git add apps/web/src/platform/drop-web.ts && \
git add apps/web/src/platform/drop-web.test.ts && git add apps/web/src/platform/controller.test.ts && \
git add apps/web/src/app/workspace.test.ts && git add apps/web/src/app/toolbar-host.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "fix(import): read only the header before refusing an unknown file (DroppedFile.head)" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : N tests, noms vus, une ligne `Réutilisation :` (une ligne `Réutilise :`).

---

<a id="tache-t11"></a>

### Tâche T11 — Branchement de la session : outil, grille, zone de saisie, `data-table`

**Objectif.** Assembler dans `board-session.ts` l'outil Tableau (T9), la grille de choix (T5) et la zone de saisie
(T5) : fabrique `table` du moteur ; événements de la zone vers **l'outil actif** (Tableau ou Texte, DAC3) ; `mousedown`
de la scène empêché aussi avec l'outil Tableau (sinon la zone ouverte perdrait le focus) ; grille fermée à
`deactivate`, retirée à `dispose`. Publier `#stage[data-table]` = `"<colonnes>x<lignes>@<rang>,<colonne>"` de la cellule
active (vide sinon), lu par l'essai S1 (T15 du cadrage).

**Fichiers.**
- Modifier : `apps/web/src/app/board-session.ts:30-40` (imports), `:136-157` (zone, outils), `:196-202` (`mousedown`),
  `:250-259` (`mark`), `:316-345` (`deactivate`, `dispose`), `apps/web/src/app/stage-tags.ts:1-19`
- Tests : `apps/web/src/app/board-session.test.ts`, `apps/web/src/app/stage-tags.test.ts`

**Interfaces.**
- Consomme : (T9) `createTableTool(ctx, editor, picker, style, measure): TableTool`, `TablePicker` ; (T5)
  `createTablePicker(parent): TablePickerHost`, `TextEditorEvents.navigate`, `createTextEditor(parent, events)` ;
  (T4) `EngineState.tableCell`, `ToolFactories.table`, `TableCellState`.
- Produit : `stageTags(s): Record<"page" | "selection" | "bounds" | "tool" | "table", string>` ;
  `#stage[data-table]` ; `.rb-table-picker` monté dans la case des scènes (`shared.container`).
- Réutilise : `apps/web/src/app/stage-tags.ts:12` — `stageTags(s)` : clé `table` (étendre).
- Réutilise : `apps/web/src/app/text-editor.ts:33` — `createTextEditor(parent, events)` : `events` rend l'outil actif
  (Tableau ou Texte), même zone `#texte-edition` (CL5b-2).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/app/board-session.test.ts src/app/stage-tags.test.ts src/app/workspace.test.ts --reporter=verbose 2>&1 | grep -E "Tableau|C10a|×|FAIL|Test Files|Tests " | tail -40 && \
pnpm --filter @roomboard/web test 2>&1 | grep -E "Test Files|Tests |FAIL" | tail -5
```

Attendu : aucun `×` ; « outil Tableau : grille, saisie, Tab (C10a) », « mousedown empêché aussi pour l'outil Tableau
(C10a) », « table : colonnes x lignes @ rang, colonne ; vide sans cellule » présents ; la suite complète de la page :
`Tests … passed`, aucun `FAIL`. À garder verts : « mousedown empêché seulement pour l'outil Texte (CL4-2) » (inchangé),
« attributs data-* de #stage publiés comme avant », `workspace.test.ts`.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`), aucun
  seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/apps/web/src/wasm apps/web/src/` ;
  `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/apps/web/src/wasm-formats apps/web/src/`.
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle ; jamais GPL, LGPL ni AGPL.
- GC13 Périmètre : seuls les fichiers ci-dessus (`ui/App.tsx:137` passe déjà l'état du moteur à la barre).
- GC14 `tsc` : `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"` vide (contrôle aussi PC7 :
  l'outil Tableau passé comme `TextEditorEvents`).
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.

**Interdits.** Aucun écouteur posé sur `window` par la session (test existant « aucun écouteur posé sur window ») ; ne
pas toucher l'outil ni le moteur.

**Critère « terminé ».** Commande bornée verte (suite complète de la page comprise), `tsc` vide, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges.** `stage-tags.test.ts`, dans le `describe` existant :

```ts
  it("table : colonnes x lignes @ rang, colonne ; vide sans cellule (C10a, T15)", () => {
    expect(stageTags(base).table).toBe("");
    expect(stageTags({ ...base, tableCell: { id: "t", row: 2, col: 3, rows: 3, cols: 4 } }).table).toBe("4x3@2,3");
  });
```

`board-session.test.ts`, dans `describe("createBoardSession (T93)")` :

```ts
  it("mousedown empêché aussi pour l'outil Tableau (C10a)", async () => {
    const s = await createBoardSession(fakeCore.blank(), shared);
    const down = (): boolean => {
      const e = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
      s.stage.dispatchEvent(e);
      return e.defaultPrevented;
    };
    s.engine.setTool("table");
    expect(down()).toBe(true);
    s.engine.setTool("select");
    expect(down()).toBe(false);
  });

  it("outil Tableau : grille, saisie, Tab (C10a) — clic dans le vide, 2 × 2 choisi, Tab va à l'outil Tableau", async () => {
    const s = await createBoardSession(fakeCore.blank(), shared);
    s.activate();
    s.engine.setTool("table");
    const c = s.engine.camera();
    const [sx, sy] = [200 * c.zoom + c.tx, 150 * c.zoom + c.ty];
    s.engine.sink.begin(1, "table", [{ x: sx, y: sy, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 }]);
    s.engine.sink.close(1, "end");
    const picker = container.querySelector<HTMLElement>(".rb-table-picker");
    expect(picker?.hidden).toBe(false);
    picker!.querySelector<HTMLButtonElement>('button[data-cols="2"][data-rows="2"]')!.click();
    expect(s.stage.dataset["table"]).toBe("2x2@0,0");
    const area = document.getElementById("texte-edition") as HTMLTextAreaElement;
    expect(area.hidden).toBe(false);
    const tab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    area.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(s.stage.dataset["table"]).toBe("2x2@0,1");
    s.deactivate();
    expect(picker?.hidden).toBe(true);
    s.dispose();
    expect(container.querySelector(".rb-table-picker")).toBeNull();
  });
```

Voir rouge (`data-table` absent, grille absente).

- [ ] **Étape 3 : `stage-tags.ts`.**

```ts
import type { Bounds } from "../core/api";
import type { EngineState } from "../engine/engine";
import type { TableCellState } from "../engine/table-geom";

const tenth = (v: number): string => String(Math.round(v * 10) / 10);
const boundsTag = (b: Bounds | null): string => (b === null ? "" : [b.x0, b.y0, b.x1, b.y1].map(tenth).join(","));
/** `#stage[data-table]` (C10a, T15) : `<colonnes>x<lignes>@<rang>,<colonne>` de la cellule active, vide sinon. */
const tableTag = (c: TableCellState | null): string => (c === null ? "" : `${c.cols}x${c.rows}@${c.row},${c.col}`);

/** Attributs de `#stage` lus par les scénarios S3/S4 (contrat du lot) et S1 de C10a (`table`). */
export function stageTags(s: EngineState): Record<"page" | "selection" | "bounds" | "tool" | "table", string> {
  return {
    page: `${s.pageIndex + 1}/${s.pageCount}`,
    selection: String(s.selection.length),
    bounds: boundsTag(s.selectionBounds),
    tool: s.tool,
    table: tableTag(s.tableCell),
  };
}
```

(garder l'en-tête de fichier existant).

- [ ] **Étape 4 : `board-session.ts`.** Imports : `import { createTableTool } from "../engine/tools/table";`,
  `import type { TableTool } from "../engine/tools/tool";`, `import { createTablePicker } from "./table-picker";` ; à
  l'import de `./text-editor`, ajouter `type TextEditorEvents`. Remplacer le bloc de la zone de saisie (lignes 136-141)
  et la table `tools` du moteur :

```ts
  // Zone de saisie hors de la scène (CL4-2) ; les outils Texte et Tableau sont créés par le moteur, après elle. Ses
  // événements vont à l'outil actif (C10a, DAC3). Sans id tant que la session n'est pas active (un seul #texte-edition).
  let textTool: TextTool | null = null;
  let tableTool: TableTool | null = null;
  let editorTarget = (): TextEditorEvents | null => textTool;
  const editor = createTextEditor(container, () => editorTarget());
  editor.element.removeAttribute("id");
  undo.push(() => editor.element.remove());
  // Grille de choix du tableau (C10a, T6), dans la case des scènes : même origine que #stage.
  const picker = createTablePicker(container);
  undo.push(() => picker.element.remove());
  undo.push(() => choice.release());
```

et dans `tools` (après `text: …`) :

```ts
      table: (ctx, style) => {
        tableTool = createTableTool(ctx, editor, picker, style, measure);
        return tableTool;
      },
```

Juste après `const engine = createEngine({ … });` :

```ts
  editorTarget = () => (engine.tool() === "table" ? tableTool : textTool);
```

`mousedown` (lignes 196-202) :

```ts
  // Outils Texte et Tableau seulement : sans cela, le mousedown qui suit le pointerdown donnerait le focus à la page, et
  // la zone de saisie, tout juste ouverte, le perdrait et validerait aussitôt. Avec les autres outils on laisse le
  // mousedown faire son travail : le dernier bouton cliqué perd le focus (Entrée ne le redéclenche plus).
  stage.addEventListener(
    "mousedown",
    (e) => {
      const t = engine.tool();
      if (t === "text" || t === "table") e.preventDefault();
    },
    { signal },
  );
```

Dans `mark`, après `stage.dataset["tool"] = tags.tool;` : `stage.dataset["table"] = tags.table;`. Dans
`deactivate`, après `engine.releaseKeys();` : `picker.close();`. Dans `dispose`, après `editor.element.remove();` :
`picker.element.remove();`. Mettre à jour l'en-tête du fichier : « … sa zone de texte et sa grille de choix du tableau
(C10a) ».

- [ ] **Étape 5 : preuve bornée et `tsc`** (GC14 vide ; la suite complète de la page passe).

- [ ] **Étape 6 : commit.**

```bash
cd "$WT" && git add apps/web/src/app/board-session.ts && git add apps/web/src/app/board-session.test.ts && \
git add apps/web/src/app/stage-tags.ts && git add apps/web/src/app/stage-tags.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(app): wire the Table tool, picker and editor routing into the board session" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : N tests, noms vus, une ligne `Réutilisation :` par ligne `Réutilise :` (deux lignes).

---

<a id="tache-t12"></a>

### Tâche T12 — Essai e2e S1 dans `verifier.sh --e2e`, capture 4 × 3

**Objectif.** Le geste S1 (S11, partie C10a) joué par Playwright sur l'application construite, ajouté au bloc `--e2e`
de `verifier.sh` et à la liste de `verifier-e2e.test.sh` (T15 du cadrage) ; capture `docs/essais/c10a-tableau-4x3.png`
d'un 4 × 3 rempli, prise avant toute insertion, avec `--captures` seulement. Suite complète verte, module Wasm mesuré.

**Fichiers.**
- Créer : `scripts/essais/c10a-tableau-navigateur.mjs`, `docs/essais/c10a-tableau-4x3.png`
- Modifier : `scripts/verifier.sh:95-104` (une ligne dans le bloc `--e2e`), `scripts/tests/verifier-e2e.test.sh:13`

**Interfaces.**
- Consomme : l'application entière (T1 à T11) ; `#stage[data-table]` (T11), `#stage[data-tool]`, `#stage[data-camera]`,
  `button[data-item="table"]` (T8), `.rb-table-picker`, `button[aria-label="4 colonnes, 3 lignes"]`,
  `[data-picker-label]` (T5), `button[data-table-action="table-col-insert" | "table-row-insert"]` (T8),
  `#texte-edition` (zone du lot 4) ; `commun.mjs`.
- Produit : l'essai `c10a-tableau-navigateur.mjs` (codes 0 réussi, 1 échec, 2 outil absent ; sortie « C10a tableau :
  OK ») et la capture.
- Réutilise : `scripts/essais/commun.mjs` ; `c2-image-navigateur.mjs` (`saveTo`, `scenario`, `main`) — `serve`,
  `loadPlaywright`, `stageMouse`, `stageBox`, `item`, `frames`, `TAB`, `VIEWPORT`, `Echec`, `gitSha`, `DIST`, `ROOT`.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3 && \
bash scripts/verifier.sh --e2e 2>&1 | grep -E "ok — |OK|ÉCHEC|module Wasm|error|FAIL" | tail -60
```

Attendu : `verifier-e2e.test.sh : OK` ; dans la sortie de `verifier.sh --e2e` : les lignes `ok — S1 : …` de l'essai,
`C10a tableau : OK`, et les essais à garder verts (effets de bord : barre gagnant « Tableau », `head`, `mousedown`) :
`S2 lot 3 : OK`, `S2 lot 3b : OK (…)`, `S3/S4 lot 4 : OK`, `S5b : OK`, `C2 image : OK` (dépôt, collage, Importer, TIFF refusé),
`C1 : OK` (`c1-profils-navigateur.mjs` : barre à gauche en l, scène ≥ 640 px), la ligne de réussite de
`fichiers-navigateur.mjs`, puis `verifier.sh : e2e OK`, `verifier.sh : OK` ; `module Wasm : N octets` avec
N ≤ 1 572 864 (cité au rapport). Un essai qui échoue sur un délai (`waitForFunction … Timeout`) est rejoué une fois
seul (`node scripts/essais/<essai>.mjs`) avant d'être jugé.

**Preuve visuelle.** D'abord les lectures (une valeur lue prouve plus qu'une image regardée), toutes dans la sortie de
l'essai : `data-tool="table"` ; `[data-picker-label]` = `4 × 3` au survol ; `data-table` = `4x3@0,0`, `4x3@0,1`,
`4x3@0,2`, … `4x3@1,0` (passage de ligne), `4x3@2,3`, puis `5x3@2,3` (« + Colonne »), `5x4@2,3` (« + Ligne ») ; après
Ctrl+S et Ctrl+O, `data-table` = `5x4@0,0` et `#texte-edition` = « Lundi », puis `5x4@0,1` / « Mardi », `5x4@0,2` /
« Mercredi ». Puis la capture : `node scripts/essais/c10a-tableau-navigateur.mjs --captures` (après le
`verifier.sh --e2e` qui a construit `apps/web/dist`), et décrire au rapport ce qu'elle montre (ouvrir le PNG avec
l'outil de lecture d'image) : un tableau de 4 colonnes × 3 lignes aux traits noirs, les douze textes lisibles dans
leurs cellules (« Lundi » … « Sciences »), la cellule (2, 3) encadrée (cellule active), la barre avec « Tableau »
enfoncé et la rangée « + Ligne … Uniformiser » et les pastilles, et toute anomalie (texte coupé, débordement, rangée
sur deux lignes).

**Contraintes (recopiées).**
- GC1 Budget : `scripts/verifier.sh --e2e` lancé ici seulement, une fois (plus un rejeu ciblé si un délai échoue).
- GC2 TDD : l'essai est écrit avant d'être ajouté au bloc `--e2e`, vu échouer sur une valeur fausse (étape 3), puis
  vert. Aucun test sauté ni désactivé, aucun seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois
  avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10a-tableau/target .` (`verifier.sh` reconstruit
  les modules Wasm et l'application).
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite les lignes `OK` vues et la taille du module.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle (Playwright du cache `npx`, comme les autres essais) ; jamais GPL, LGPL ni AGPL.
- GC8 Plafond Wasm H2-13 inchangé : 1 572 864 octets, contrôle de `scripts/verifier.sh` non modifié.
- GC13 Périmètre : seuls les fichiers ci-dessus ; `verifier.sh` ne gagne qu'une ligne, sans option de capture.
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.

**Interdits.** Aucune option `--captures` dans `verifier.sh` (contrôlé par `verifier-e2e.test.sh`) ; aucune requête
hors de 127.0.0.1 ; ne pas modifier un autre essai pour le faire passer (un essai existant rouge est un défaut à
rapporter, avec la ligne d'échec) ; ne pas réécrire une autre capture commitée.

**Critère « terminé ».** `verifier.sh --e2e` vert avec « C10a tableau : OK », capture commitée et décrite, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4) ; `git log --oneline -12` montre les commits de T1 à T11.

- [ ] **Étape 2 : écrire l'essai.** Créer `scripts/essais/c10a-tableau-navigateur.mjs` :

```js
#!/usr/bin/env node
// Essai C10a « tableau » au navigateur (S1 du cadrage, partie C10a de S11). L'application construite (apps/web/dist)
// servie en local avec la CSP de la coque, Chromium headless de Playwright, mode repli (`?fichiers=repli`), heure figée.
// Geste : outil Tableau, grille de choix 4 × 3, « Lundi », Tab, « Mardi », Tab, « Mercredi » (S1), puis les neuf autres
// cellules par Tab (passage de ligne compris), Échap, capture (avec --captures seulement), « + Colonne », « + Ligne »,
// Ctrl+S, Ctrl+O, relecture des trois premières cellules dans le nouvel onglet. Oracle : #stage[data-table] =
// "<colonnes>x<lignes>@<rang>,<colonne>" et la valeur de #texte-edition. Aucune requête hors de 127.0.0.1.
// Lancé par scripts/verifier.sh --e2e, sans option de capture.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Usage : node scripts/essais/c10a-tableau-navigateur.mjs [--captures]
// (--captures : docs/essais/c10a-tableau-4x3.png).
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, frames, gitSha, item, loadPlaywright, serve, stageBox, stageMouse } from "./commun.mjs";

const LABEL = "C10a tableau";
const FIXED = new Date("2026-11-20T08:00:00.000Z");
/** Point cliqué sur la scène (px de la scène) : coin haut gauche du tableau. */
const CLICK = [200, 150];
const COL = 240;
const ROW = 64;
const FIRST = ["Lundi", "Mardi", "Mercredi"];
const REST = ["Jeudi", "Maths", "Français", "Histoire", "Sport", "Anglais", "Musique", "Dessin", "Sciences"];

/** CSP de la coque (tauri.conf.json), envoyée telle quelle (même lecture que c2-image-navigateur.mjs). */
function coqueCsp() {
  const conf = JSON.parse(readFileSync(join(ROOT, "apps", "desktop", "src-tauri", "tauri.conf.json"), "utf8"));
  const csp = conf.app.security.csp;
  return Object.entries(csp).map(([d, v]) => `${d} ${Array.isArray(v) ? v.join(" ") : v}`).join("; ");
}

async function scenario(page, url, { captures, tmp }) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("dialog", (d) => d.accept());
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const fr = () => frames(page);
  const mouse = stageMouse(page);
  const attr = (name) => page.getAttribute("#stage", name);
  const waitTable = (v) =>
    page
      .waitForFunction((v) => document.querySelector("#stage")?.getAttribute("data-table") === v, v, { timeout: 15000 })
      .catch(async () => {
        throw new Echec(`data-table attendu « ${v} », lu « ${await attr("data-table")} »`);
      });
  const editorValue = () => page.$eval("#texte-edition", (a) => a.value);
  const editorOpen = () => page.$eval("#texte-edition", (a) => !a.hidden && document.activeElement === a);
  const camera = async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    return { zoom, tx, ty };
  };
  const saveTo = async (name) => {
    const dl = page.waitForEvent("download");
    await page.keyboard.press("Control+s");
    const file = join(tmp, name);
    await (await dl).saveAs(file);
    return file;
  };

  await page.goto(url);
  await page.waitForSelector("#stage");
  await fr();
  await page.click(item("table"));
  await fr();
  check((await attr("data-tool")) === "table", 'S1 : outil Tableau actif (data-tool="table")');
  const box = await stageBox(page);
  check(box.height >= 640, `S1 : la scène garde ${Math.round(box.height)} px de haut avec la rangée du tableau (HC10-15)`);
  const c1 = await camera();
  const world = [(CLICK[0] - c1.tx) / c1.zoom, (CLICK[1] - c1.ty) / c1.zoom];

  // S1 : grille de choix au point cliqué, 4 × 3.
  await mouse.click(CLICK[0], CLICK[1]);
  await page.waitForSelector(".rb-table-picker:not([hidden])", { timeout: 5000 });
  const cell43 = 'button[aria-label="4 colonnes, 3 lignes"]';
  await page.hover(cell43);
  check((await page.textContent("[data-picker-label]")) === "4 × 3", "S1 : la grille montre « 4 × 3 » au survol");
  await page.click(cell43);
  await waitTable("4x3@0,0");
  check(await editorOpen(), 'S1 : tableau 4 × 3, saisie ouverte sur la première cellule (data-table="4x3@0,0")');

  // S1 : trois cellules par Tab.
  await page.keyboard.type(FIRST[0]);
  await page.keyboard.press("Tab");
  await waitTable("4x3@0,1");
  await page.keyboard.type(FIRST[1]);
  await page.keyboard.press("Tab");
  await waitTable("4x3@0,2");
  await page.keyboard.type(FIRST[2]);
  check((await editorValue()) === FIRST[2], "S1 : « Lundi », Tab, « Mardi », Tab, « Mercredi » (data-table 4x3@0,1 puis 4x3@0,2)");

  // Remplissage des neuf autres, passage de ligne compris, puis Échap.
  for (const [i, text] of REST.entries()) {
    await page.keyboard.press("Tab");
    const n = FIRST.length + i;
    await waitTable(`4x3@${Math.floor(n / 4)},${n % 4}`);
    await page.keyboard.type(text);
  }
  check((await attr("data-table")) === "4x3@2,3", "les neuf autres cellules par Tab, passage de ligne compris (4x3@1,0 … 4x3@2,3)");
  await page.keyboard.press("Escape");
  await fr();
  check(
    (await page.$eval("#texte-edition", (a) => a.hidden)) && (await attr("data-table")) === "4x3@2,3",
    "Échap : saisie fermée, la cellule reste active (4x3@2,3)",
  );
  if (captures) {
    await fr();
    const path = join(ROOT, "docs", "essais", "c10a-tableau-4x3.png");
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  }

  // S1 : « + Colonne », « + Ligne ».
  await page.click('button[data-table-action="table-col-insert"]');
  await waitTable("5x3@2,3");
  check(true, "S1 : « + Colonne » : 5x3@2,3");
  await page.click('button[data-table-action="table-row-insert"]');
  await waitTable("5x4@2,3");
  check(true, "S1 : « + Ligne » : 5x4@2,3");

  // S1 : Ctrl+S, Ctrl+O sur le fichier : nouvel onglet.
  const before = await page.locator(TAB).count();
  const file = await saveTo("tableau.roomboard");
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Control+o");
  await (await chooser).setFiles(file);
  await page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, before + 1, { timeout: 15000 });
  await fr();
  check((await page.locator(TAB).count()) === before + 1, "S1 : Ctrl+S puis Ctrl+O : rouvert dans un nouvel onglet");

  // S1 : outil Tableau, clic dans les trois premières cellules du tableau rouvert.
  await page.click(item("table"));
  await fr();
  const c2 = await camera();
  const screen = (wx, wy) => [wx * c2.zoom + c2.tx, wy * c2.zoom + c2.ty];
  for (const [j, text] of FIRST.entries()) {
    const [sx, sy] = screen(world[0] + COL * j + COL / 2, world[1] + ROW / 2);
    await mouse.click(sx, sy);
    await waitTable(`5x4@0,${j}`);
    const v = await editorValue();
    check(v === text, `S1 : rouvert, cellule ${j + 1} : « ${v} » (data-table="5x4@0,${j}")`);
    await page.keyboard.press("Escape");
    await fr();
  }
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
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c10a-"));
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

- [ ] **Étape 3 : construire l'application et voir l'essai rouge puis vert, seul.** Construire une fois (mêmes
  commandes que `verifier.sh`, sans la suite) :

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm && \
wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && \
cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm-formats && \
wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm && \
pnpm --filter @roomboard/web build 2>&1 | tail -3
```

Rouge contrôlé : remplacer temporairement `"4x3@0,1"` par `"4x3@9,9"` dans l'essai, lancer
`node scripts/essais/c10a-tableau-navigateur.mjs; echo "code $?"` — attendu : `C10a tableau : ÉCHEC — data-table
attendu « 4x3@9,9 »…`, `code 1` ; remettre la valeur, relancer — attendu : `C10a tableau : OK`, `code 0`.

- [ ] **Étape 4 : l'ajouter au bloc `--e2e`.** Dans `scripts/verifier.sh`, après
  `node scripts/essais/c1-profils-navigateur.mjs` : `  node scripts/essais/c10a-tableau-navigateur.mjs`. Dans
  `scripts/tests/verifier-e2e.test.sh:13`, ajouter `c10a-tableau-navigateur` à la fin de la liste `for s in …`.
  Vérifier : `bash scripts/tests/verifier-e2e.test.sh` — attendu : `verifier-e2e.test.sh : OK`.

- [ ] **Étape 5 : suite complète.** La commande bornée de la section (`verifier.sh --e2e`, environ 15 à 25 min sur la
  VM chargée). Relever la ligne `module Wasm : N octets`. Si N > 1 400 000 : le signaler au rapport (OD55, T6 aurait dû
  l'écrire ; ne pas modifier `docs/essais/taille-wasm.md` ici).

- [ ] **Étape 6 : capture.** `node scripts/essais/c10a-tableau-navigateur.mjs --captures` — attendu : `capture :
  …/docs/essais/c10a-tableau-4x3.png`, `C10a tableau : OK`. Ouvrir le PNG avec l'outil de lecture d'image et le décrire
  (bloc Preuve visuelle).

- [ ] **Étape 7 : commit.**

```bash
cd "$WT" && git add scripts/essais/c10a-tableau-navigateur.mjs && git add scripts/verifier.sh && \
git add scripts/tests/verifier-e2e.test.sh && git add docs/essais/c10a-tableau-4x3.png && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "test(e2e): C10a table gesture in verifier.sh --e2e and 4x3 capture" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : lignes `OK` vues, taille du module, description de la capture, une ligne `Réutilisation :` (une ligne
`Réutilise :`).

---

## Couverture du cadrage

**Décisions.** T1 schéma → T1 (lecture), T2 (écriture, GC9) · T2 lecture tolérante, repli inconnu, version sans C10a →
T1 (S4), T3 (fausse liaison) · T3 six commandes, `BadTable` → T2, T3, T6 · T4 tailles, largeur lue sur la page, 64 →
T4 (constantes), T9 (décalage, Tab inerte), T8 (grisé), T5 (boîte bornée) · T5 hauteur des lignes → T4 (`cellHeight`),
T9 (`rowHeight`), T2 (écrite si plus grande) · T6 création, grille 8 × 8, boîte → T5, T9, T8 (outil au profil) · T7
cellule active, I1, I2, Suppr → T4 (moteur), T9 · T8 clavier, porte IME → T5, T9 · T9 annulation → T2 (une étape),
T9 (deux étapes pour Tab en fin) · T10 rangée contextuelle, actions → T8 · T11 Uniformiser → T9, T2 · T12 couleur → T8,
T9, T2 · T13 liaison, contrat, fausse liaison, rendu B1, OD55 → T3, T6, T7 · T14 OD56 → T10 · T15 e2e et capture →
T11 (`data-table`), T12.

**Scénarios.** S1 → T2, T3, T5, T6, T7, T8, T9, T11, T12 · S2 → T4, T5, T9, T11 · S3 → T2, T3, T6, T7, T8, T9 ·
S4 → T1, T2, T3 · S5 → T10 (et T12 : `c2-image-navigateur.mjs` resté vert).

**Carte d'impact, entrées « touché ».** `table.rs`, `lib.rs` → T1, T2 · `element.rs` → T1 · `document.rs` → T1, T2 ·
`commands.rs` → T2 · `query.rs` → T1 · `roomboard-wasm/src/lib.rs` → T6 · `api.ts`, `fake-core.ts` → T3 ·
`wasm-core.ts` → T3, T6 · `core/shapes.ts` → T4 · `input/gesture.ts`, `engine.ts` (état, fabriques, `run`, `history`,
Suppr) → T4 · `tools/table.ts` → T9 · `table-geom.ts` → T4 · `tools/commit-gate.ts`, `tools/text.ts` → T5 ·
`render/canvas2d.ts`, `render/table-paint.ts` → T7 · `app/text-editor.ts`, `app/table-picker.ts` → T5 ·
`app/board-session.ts`, `app/stage-tags.ts` → T11 · `app/toolbar-host.ts`, `toolbar.ts`, `toolbar-profiles.ts`,
`ui/item-state.ts`, `ui/Toolbar.tsx`, `ui/PagesBar.tsx`, `ui/rb.css` → T8 · `platform/files.ts`, `import.ts`,
`host-tauri.ts`, `drop-web.ts` → T10 · `scripts/essais/c10a-tableau-navigateur.mjs`, `scripts/verifier.sh`,
`scripts/tests/verifier-e2e.test.sh`, `docs/essais/c10a-tableau-4x3.png` → T12 · tests : `table.rs` (T1, T2),
`element_inconnu.rs` (T1), `every_known_kind_has_view_and_geom` et son pendant (T2, T3), fixture (T2),
`wasm-core.contract.test.ts` et `fake-core.test.ts` (T3, T6), `toolbar.test.ts:167` (T8), `text-editor.test.ts` (T5),
`import.test.ts`, `host-tauri.test.ts` (T10), `tools/table.test.ts` (T9), `table-geom.test.ts` (T4),
`commit-gate.test.ts` (T5), `table-paint.test.ts` (T7), `table-picker.test.ts` (T5), `engine.test.ts` (T4, T9),
`canvas2d.test.ts` (T7).

**Effets de bord → test.** Barre gagnant « Tableau », scène ≥ 640 px → T12 (`stageBox`, `C1 : OK`) ·
`toolbar.test.ts:167` → T8 · catalogue de l'éditeur de profil → T8 (`toolbar-host.test.ts:41-42`, `item-state.test.ts`
neuf) · `DroppedFile.head` → T10 (`import.test.ts`, `host-tauri.test.ts`, `drop-web.test.ts`) et T12
(`c2-image-navigateur.mjs`) · `mousedown` empêché avec l'outil Tableau → T11 (test neuf), T12 (`s34-navigateur.mjs`) ·
tableau ouvert par une version sans C10a → T1 (`table_shape_under_unknown_kind_is_kept_byte_for_byte`) · `read_unknown`
coupée → T1 (tests `unknown_*` gardés verts), T2 (`every_known_kind_has_view_and_geom`) · porte IME extraite → T5
(`text.test.ts` inchangé et vert, `commit-gate.test.ts`) · `toolbar-host.ts:45` par `presetsOf` → T8
(`toolbar-host.test.ts`, préréglages, vert).

**Modules à réutiliser ou à étendre** (34 lignes du cadrage) : chacune est une ligne `Réutilise :` d'une section —
`apply_text_diff` (T2) · `valid_color` / `validColor` (T1, T2, T3) · `finite_positive` / `finitePositive` (T1, T3) ·
`done`, `unchanged`, `transact_local` (T2) · `find_element`, `page_elements_or_err` (T2) · `transform_to_any`,
`out_transform`, `out_f64`, `out_string` (T1, T2) · `KNOWN_KINDS`, `Document::element`, `element_geom` (T1, T2, T3) ·
`read_unknown` → `unknown_view` (T1) · `box_polygon` (T1) · `table.rs` neuf (T1) · patron `set_grid` (T6) ·
`toElementView`, union `ElementView` (T3) · fausse liaison (T3) · `layoutRich`, `richBoxHeight`, `measureWith`,
`plainSpans` (T4, T7) · `paintText` et son cache (T7) · porte IME extraite (T5) · `createTextEditor`, `TextEditSession`
(T5, T11) · matrices de la page, `invertMatrix` (T4, T9) · `ToolContext`, `GestureTool`, `NO_LIVE`, `EditOverlay.frame`
(T9) · patron `SelectionTool.prune` (T4) · `elementIds`, `element` pour le tableau sous l'encre (T4) · `PageView.width`
(T9) · `table-geom.ts` neuf (T4, T9) · outil Tableau neuf (T9) · grille de choix neuve (T5) · rendu, patron
`grid-paint` (T7) · `TOOL_TABLE`, `ACTION_TABLE`, `defaultToolbars` (T8) · `ACTION_STATE`, `itemState` (T8) ·
`PresetRow` → `TableActionRow` (T8) · `ACTIONS`, `tableFill`, `presetsOf` (T8) · `stageTags` (T11) ·
`DroppedFile.head`, `grantedFile`, `droppedFromFile`, `HEAD_BYTES` (T10) · `commun.mjs`, `c2-image-navigateur.mjs`
(T12) · patrons « recharger garde les octets », `kind` inconnu (T1, T2). Aucune tâche ne crée un module que la liste
donne comme existant.

## Relecture du plan (faite)

- Couverture : les quinze décisions, les cinq scénarios, chaque entrée « touché » de la carte d'impact, chaque effet de
  bord et les 34 lignes de modules ont leur tâche (section ci-dessus). Aucune tâche sans scénario.
- Noms d'une tâche à l'autre, vérifiés : `TableData`, `TableCol`, `TableRow`, `TableCell`, `TableAxis` (T3 → T4, T7,
  T8, T9) ; `TABLE_MAX_LINES` (T3 → T8, T9) ; `NavMove`, `TableAction`, `CellRef`, `Cell`, `TableCellState`, `TableTool`,
  `stateChanged` (T4 → T8, T9, T11) ; `createCommitGate`, `TextEditSession.background`, `EditorMove`, `navigate`,
  `TablePickerHost` (T5 → T9, T11) ; `TablePicker`, `createTableTool` (T9 → T11) ; `Command::AddTable` … (T2 → T6) ;
  `BadTable` et son message identiques en Rust (T2) et TS (T3) ; `data-table`, `data-table-action`, `data-table-fill`,
  `[data-picker-label]` (T5, T8, T11 → T12).
- Ordre des contrôles d'un refus identique cœur / fausse liaison : `AddTable` (arguments puis page),
  `SetTableCell` (hauteur, tableau, ligne/colonne), `InsertTableLine` (tableau, bornes), `RemoveTableLine`
  (tableau, ligne, dernière), `SetTableSizes` (tailles, tableau), `SetTableFill` (couleur, tableau, cellule).
- Points à surveiller à l'exécution (non vérifiés ici, signalés aux sections) : signature de `Map::keys` à yrs 0.28.1
  (T2, repli `iter` donné) ; coercition `&String` → `&str` dans les fermetures de test de T2 (sinon `.as_str()`) ; la
  barre à gauche en taille l de `c1-profils-navigateur.mjs` gagne un bouton (T12 : rapporter, ne pas corriger l'essai).
