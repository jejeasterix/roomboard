# Plan d'exécution — usage-c7b-texte-riche (C7b : éditeur de texte riche)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Cœur : segments voulus (`SpanInput`, `apply_spans`) et `SetText.spans` | — | `crates/roomboard-core/src/rich_text.rs`, `crates/roomboard-core/src/commands.rs`, `crates/roomboard-core/src/document.rs`, `crates/roomboard-core/src/query.rs`, `crates/roomboard-core/tests/scenarios.rs`, `crates/roomboard-core/tests/compat_socle.rs`, `crates/roomboard-core/tests/texte_riche.rs` (neuf), `crates/roomboard-wasm/src/lib.rs` | isolé (`~/projets/roomboard-wt/usage-c7b-texte-riche--T1`) | concepteur-critique | `cargo test -p roomboard-core` : 0 `FAILED`, ≥ 14 tests C7b nommés dont `plain_spans_write_the_same_update_as_no_spans`, `apply_spans_keeps_raw_out_of_domain_and_unknown_keys`, `concurrent_formats_of_two_words_in_a_text_both_stay` ; `socle_fixture_resaves_identically` et tests C7 verts ; `cargo test -p roomboard-wasm` : `test result: ok` | S5 | #tache-t1 |
| T2 | Contrat TS partagé : frappe ancrée, segments voulus, types de commande et de séance | — | `apps/web/src/core/rich-text.ts`, `apps/web/src/core/rich-text.test.ts`, `apps/web/src/core/api.ts`, `apps/web/src/engine/rich-edit.ts` (neuf, types) | isolé (`~/projets/roomboard-wt/usage-c7b-texte-riche--T2`) | implementeur-tdd | `vitest run src/core/rich-text.test.ts` : 0 échec, bloc « segments voulus et frappe ancrée (C7b) » ≥ 9 tests dont « editSpansAt : « aa », curseur au milieu » ; `tsc` : seul l'écart nommé | S1 | #tache-t2 |
| T3 | Aller-retour DOM de la zone riche (`app/rich-dom.ts`) | — | `apps/web/src/app/rich-dom.ts` (neuf), `apps/web/src/app/rich-dom.test.ts` (neuf) | isolé (`~/projets/roomboard-wt/usage-c7b-texte-riche--T3`) | implementeur-tdd | `vitest run src/app/rich-dom.test.ts` : 0 échec, bloc « segments ↔ DOM (C7b) » ≥ 8 tests dont « lecture robuste » ; `tsc` vide | S1 | #tache-t3 |
| T4 | `coqueCsp` partagée par les essais (R22) | — | `scripts/essais/commun.mjs`, `scripts/essais/c2-image-navigateur.mjs`, `scripts/essais/c9-grille-navigateur.mjs`, `scripts/essais/fichiers-navigateur.mjs`, `scripts/essais/c10a-tableau-navigateur.mjs`, `scripts/tests/coque-csp.test.sh` (neuf), `scripts/verifier.sh` | isolé (`~/projets/roomboard-wt/usage-c7b-texte-riche--T4`) | implementeur-tdd | `bash scripts/tests/coque-csp.test.sh` : « coque-csp.test.sh : OK » ; « C2 image : OK », « C9 grille : OK », « Fichiers lot 5a : OK », « C10a tableau : OK » | S1 | #tache-t4 |
| T5 | Cœur : cellules riches (`SetTableCell.spans`, `TableCellView.spans`, mesure R23 a) | T1 | `crates/roomboard-core/src/commands.rs`, `crates/roomboard-core/src/table.rs`, `crates/roomboard-core/src/rich_text.rs`, `crates/roomboard-core/tests/texte_riche.rs`, `crates/roomboard-core/tests/tableau.rs`, `crates/roomboard-wasm/src/lib.rs` | isolé (`~/projets/roomboard-wt/usage-c7b-texte-riche--T5`) | implementeur-tdd | `cargo test -p roomboard-core` : 0 `FAILED`, ≥ 7 tests cellule C7b nommés dont `concurrent_first_writes_in_an_absent_cell_keep_one` et `set_cell_format_only_is_written` ; `table_fixture_resaves_identically` vert ; `cargo test -p roomboard-wasm` : `test result: ok` | S6 | #tache-t5 |
| T6 | Faux cœur et contrat TS des segments (parité) | T2 | `apps/web/src/core/fake-core.ts`, `apps/web/src/core/fake-core.test.ts`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts` | isolé (`~/projets/roomboard-wt/usage-c7b-texte-riche--T6`) | concepteur-critique | `vitest run src/core` : 0 échec, « contrat C7b : fausse liaison » ≥ 10 tests, « fakeCore — C7b » ≥ 2 ; C10a vert ; `tsc` : seul l'écart nommé | S6 | #tache-t6 |
| T7 | Modèle de séance riche (`createRichEdit`) | T2 | `apps/web/src/engine/rich-edit.ts`, `apps/web/src/engine/rich-edit.test.ts` (neuf) | isolé (`~/projets/roomboard-wt/usage-c7b-texte-riche--T7`) | concepteur-critique | `vitest run src/engine/rich-edit.test.ts` : 0 échec, bloc « séance riche (C7b) » ≥ 14 tests dont « Ctrl+Z annule la dernière mise en forme seule » ; `tsc` : seul l'écart de T2 | S2 | #tache-t7 |
| T8 | Mesure et dessin des cellules par segments | T2 | `apps/web/src/engine/table-geom.ts`, `apps/web/src/engine/table-geom.test.ts`, `apps/web/src/engine/render/table-paint.ts`, `apps/web/src/engine/render/table-paint.test.ts`, `apps/web/src/engine/render/canvas2d.ts`, `apps/web/src/engine/render/canvas2d.test.ts`, `apps/web/src/engine/tools/table.ts`, `apps/web/src/engine/tools/table.test.ts` | isolé (`~/projets/roomboard-wt/usage-c7b-texte-riche--T8`) | implementeur-tdd | `vitest run src/engine/table-geom.test.ts src/engine/render src/engine/tools/table.test.ts` : 0 échec, « cellules par segments (C7b, R17) » ≥ 6 tests, « mêmes fillText qu'un texte d'un segment (B1) » vert ; `tsc` : seul l'écart de T2 (fichiers de T6) | S1 | #tache-t8 |
| T9 | Rangée « Format » de la barre (`ui/FormatRow.tsx`) | T2 | `apps/web/src/ui/FormatRow.tsx` (neuf), `apps/web/src/ui/FormatRow.test.tsx` (neuf), `apps/web/src/ui/item-state.ts`, `apps/web/src/ui/rb.css` | isolé (`~/projets/roomboard-wt/usage-c7b-texte-riche--T9`) | implementeur-tdd | `vitest run src/ui/FormatRow.test.tsx src/ui/Toolbar.test.tsx src/ui/item-state.test.ts` : 0 échec, « rangée Format (C7b) » ≥ 6 tests dont « pointerdown et mousedown empêchés » ; contrôle « aucun switch » vert | S1 | #tache-t9 |
| T10 | Zone de saisie contenteditable (`app/text-editor.ts`) | T3, T7 | `apps/web/src/app/text-editor.ts`, `apps/web/src/app/text-editor.test.ts` | isolé (`~/projets/roomboard-wt/usage-c7b-texte-riche--T10`) | concepteur-critique | `vitest run src/app/text-editor.test.ts` : 0 échec, les 15 cas CL4 et C10a gardés + « zone riche (C7b) » ≥ 12 tests dont « Ctrl+B puis composition « に » » ; `tsc` : seul l'écart de T2 | S3 | #tache-t10 |
| T11 | Outils Texte et Tableau, moteur : segments au commit, format, état | T6, T8, T10 | `apps/web/src/engine/tools/text.ts`, `apps/web/src/engine/tools/text.test.ts`, `apps/web/src/engine/tools/table.ts`, `apps/web/src/engine/tools/table.test.ts`, `apps/web/src/engine/tools/tool.ts`, `apps/web/src/engine/engine.ts`, `apps/web/src/engine/engine.test.ts`, `apps/web/src/app/stage-tags.test.ts` | isolé (`~/projets/roomboard-wt/usage-c7b-texte-riche--T11`) | implementeur-tdd | `vitest run src/engine/tools src/engine/engine.test.ts src/app/stage-tags.test.ts src/app/text-editor.test.ts` : 0 échec, « outil Texte — C7b » ≥ 5, « outil Tableau — C7b » ≥ 4, « moteur — barre de format (C7b) » ≥ 3 ; `tsc` vide | S6 | #tache-t11 |
| T12 | Liaison Wasm des segments, adaptateur, contrat sur le vrai module | T5, T6 | `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts` | isolé (`~/projets/roomboard-wt/usage-c7b-texte-riche--T12`) | implementeur-tdd | `cargo test -p roomboard-wasm spans` ≥ 4 tests ; `ROOMBOARD_WASM_REQUIRED=1 vitest run src/core` : 0 échec, « contrat C7b : vrai module wasm » ≥ 10 tests ; module ≤ 1 572 864 o | S5 | #tache-t12 |
| T13 | Branchement : barre, hôte, session | T9, T11 | `apps/web/src/app/board-session.test.ts`, `apps/web/src/app/toolbar-host.ts`, `apps/web/src/app/toolbar-host.test.ts`, `apps/web/src/ui/Toolbar.tsx`, `apps/web/src/ui/Toolbar.test.tsx` | isolé (`~/projets/roomboard-wt/usage-c7b-texte-riche--T13`) | implementeur-tdd | `vitest run src/app src/ui` : 0 échec, « Toolbar — rangée Format (C7b) » ≥ 2, « session — texte riche (C7b) » ≥ 2 ; `ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web test` 0 échec ; `tsc` vide | S1 | #tache-t13 |
| T14 | Essai Playwright C7b (S1-S4), `verifier.sh --e2e`, deux captures | T4, T12, T13 | `scripts/essais/c7b-texte-riche-navigateur.mjs` (neuf), `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/c7b-texte-riche.png` (neuf), `docs/essais/c7b-cellule-riche.png` (neuf) | isolé (`~/projets/roomboard-wt/usage-c7b-texte-riche--T14`) | implementeur-tdd | `node scripts/essais/c7b-texte-riche-navigateur.mjs` : « C7b texte riche : OK », ≥ 25 lignes `ok —` ; `bash scripts/tests/verifier-e2e.test.sh` : OK ; deux PNG présents | S1, S2, S3, S4 | #tache-t14 |
| T15 | Essais s34, s5b, c10a sur la zone contenteditable | T4, T13 | `scripts/essais/s34-navigateur.mjs`, `scripts/essais/s5b-navigateur.mjs`, `scripts/essais/c10a-tableau-navigateur.mjs` | isolé (`~/projets/roomboard-wt/usage-c7b-texte-riche--T15`) | implementeur-tdd | « S3/S4 lot 4 : OK », « S5b : OK », « C10a tableau : OK » ; même nombre d'appels `check(` qu'avant (comptés à l'étape 1) | S3 | #tache-t15 |

**Vagues (par dépendances).** Vague 1 : T1, T2, T3, T4 (fichiers disjoints, quatre en parallèle). Vague 2 : T5 (dès
T1) ; T6, T7, T8, T9 (dès T2) — cinq en parallèle, fichiers disjoints. Vague 3 : T10 (dès T3 et T7), T12 (dès T5 et
T6) — disjoints. Vague 4 : T11 (dès T6, T8, T10). Vague 5 : T13 (dès T9 et T11). Vague 6 : T14 (dès T4, T12, T13) et
T15 (dès T4 et T13) — disjoints. L'orchestrateur lance chaque tâche dès que ses dépendances sont fusionnées. Fichiers
partagés entre vagues, donc jamais en parallèle : `rich_text.rs`, `commands.rs`, `tests/texte_riche.rs`,
`roomboard-wasm/src/lib.rs` (T1 → T5 → T12) ; `wasm-core.ts`, `wasm-core.contract.test.ts` (T6 → T12) ;
`engine/rich-edit.ts` (T2 → T7) ; `tools/table.ts`, `tools/table.test.ts` (T8 → T11) ; `scripts/verifier.sh` (T4 → T14) ;
`c10a-tableau-navigateur.mjs` (T4 → T15).

**Chemin critique.** T2 (≈ 35 min) → T7 (≈ 60) → T10 (≈ 75) → T11 (≈ 55) → T13 (≈ 40) → T14 (≈ 75) : ≈ 5 h 40 avec
les relectures. Le chemin Rust T1 (50) → T5 (45) → T12 (50) ≈ 2 h 25 n'est pas critique. T11 attend T10 exprès (PC14).

**`tsc` entre les vagues.** Un seul écart nommé, posé par T2 : `TableCell.spans` est exigé dès T2, donc `tsc` signale
`spans` manquant dans `src/core/fake-core.ts` et `src/core/wasm-core.ts` (corrigés par T6), et dans les littéraux de
`src/engine/table-geom.test.ts`, `src/engine/render/table-paint.test.ts`, `src/engine/render/canvas2d.test.ts`
(corrigés par T8). Vitest n'en dépend pas (types effacés). Après T6 et T8, `tsc` est vide ; chaque tâche suivante le
garde vide.

**Module Wasm entre les vagues.** Jusqu'à T12, le module copié de la référence (sans `spans`) suffit : T6 lit une vue de
cellule sans `spans` comme un segment (PC7). À partir de T12, toute tâche qui lance le contrat `src/core` ou un essai
navigateur régénère le module depuis son worktree (GC4b).

**Goal :** on écrit dans un texte et dans une cellule de tableau par une saisie riche (contenteditable) qui respecte
l'IME ; une rangée « Format » de la barre et Ctrl ou Cmd + B, I, U posent gras, italique, souligné, taille et couleur
sur la sélection ; une mise en forme s'annule en une étape ; le collage colle du texte simple ; tout survit à
l'aller-retour `.roomboard`.

**Architecture :** la validation d'une séance envoie l'état voulu (`content` + `spans`) par `SetText` ou `SetTableCell`
(DAR1) ; le cœur applique la différence de texte puis aligne, dans la même transaction, les seuls attributs connus qui
diffèrent de la vue normalisée (`apply_spans`). Côté page, la zone de saisie (`app/text-editor.ts`) relie le DOM
contenteditable (`app/rich-dom.ts`) à un modèle pur de séance (`engine/rich-edit.ts` : frappe relue par différence
ancrée au curseur, format en attente, historique local, état de la barre) (DAR2, DAR3) ; l'état de la barre remonte
par le patron `tableFill` jusqu'à la rangée `ui/FormatRow.tsx` (DAR4).

**Tech Stack :** Rust (yrs 0.28, serde), wasm-bindgen 0.2.130, serde-wasm-bindgen 0.6, TypeScript, SolidJS 1.9.20,
Vitest 3 (happy-dom 21.0.4 pour le DOM), Playwright (Chromium, essai e2e).

**Spec :** `docs/plans/usage-c7b-texte-riche-cadrage.md` (26 décisions R1 à R26, DAR1 à DAR4, scénarios S1 à S6 ; base
`origin/main @ 425d617`).

## Choix du plan (hors cadrage, à relire)

- PC1 Tests du cœur au niveau de l'API publique (R7 par commandes, R23 a, b, c, cellules C7b) dans un fichier
  d'intégration neuf `crates/roomboard-core/tests/texte_riche.rs` (le cadrage dit « `rich_text.rs` (fin) ») : il ne
  touche ni `table.rs` ni `commands.rs` (fichiers de C10b, R24). Les tests qui lisent l'intérieur (octets d'une
  mise à jour à client fixe, valeurs brutes des morceaux, embeds) restent dans `rich_text.rs`.
- PC2 Le contrôle des segments (`BadFormat`) est le **premier** contrôle de `SetText` et de `SetTableCell`, dans les
  deux cœurs : avant `BadText`, `BadTable`, la page ou l'élément inconnus.
- PC3 `Y.Text` dont la table est illisible (C7 T13) : `spans_differ` rend faux et `apply_spans` ne fait rien ; une mise
  en forme seule sur un tel texte est « inchangée ».
- PC4 `rich-text.ts` gagne aussi `insertedRange`, `spliceSpans`, `normalSpans` et exporte `patched` (déjà présent) :
  le modèle et la fausse liaison en ont besoin.
- PC5 `FormatAction`, `FormatState`, `RichBase`, `RichEditState`, `RichEdit` sont posés par T2 dans
  `engine/rich-edit.ts` (types seuls) ; T7 y ajoute `createRichEdit`.
- PC6 `TableCell.spans` est exigé dès T2 (écart `tsc` nommé ci-dessus, levé par T6 et T8).
- PC7 `toTable` (`wasm-core.ts`) lit une cellule sans `spans` comme un segment en T6 (module d'avant C7b) ; T12 les
  exige.
- PC8 Lecture robuste du DOM : un `<br>` dernier enfant d'un bloc (`div`, `p`, `li`) est la marque d'une ligne vide et
  ne compte pas ; l'entrée dans un bloc vaut « \n » si du texte précède sans finir par « \n », ou si un bloc vient de
  se fermer.
- PC9 Curseur illisible : la zone appelle `input(text, -1, -1)` ; le modèle applique `editSpans` (sans borne), curseur
  en fin, sans format en attente.
- PC10 Le format en attente est un `TextAttrsPatch` ; deux actions au même curseur se cumulent ; la première insertion
  (frappe, composition, collage, Entrée) le consomme.
- PC11 `FormatRow(props: { view, act })` ; `Toolbar.tsx` passe `act={(a) => props.host.textFormat(a)}` (T13).
- PC12 La zone signale `formatChanged` à l'ouverture, à la fermeture, après chaque relecture, sélection, action,
  annulation ; les outils appellent aussi `ctx.stateChanged` à l'ouverture et à la validation.
- PC13 `compositionupdate` marque la composition en cours (si `compositionstart` a manqué), sans effet sur le modèle ;
  il n'est relayé à personne (la porte n'en a pas besoin, l'essai l'observe sur `window`).
- PC14 T11 attend T10 : fusionnée avant, l'ancienne zone `<textarea>` (sans `spans()`) casserait
  `text-editor.test.ts` (« outil réel ») et `board-session.test.ts` (Tab dans une cellule).
- PC15 Boutons : « G », « I », « S » (`aria-label` « Gras », « Italique », « Souligné ») ; « 24 », « 36 », « 48 »,
  « 72 » (`aria-label` « Taille 24 »…) ; pastille + libellé pour « Défaut », « Noir », « Rouge », « Bleu », « Vert » ;
  attributs `data-format`, `data-format-size`, `data-format-color` (lus par T13 et T14).
- PC16 Ctrl ou Cmd + B, I, U acceptent Maj (jamais Alt) ; Ctrl+Z (sans Maj) annule, Ctrl+Y et Ctrl+Maj+Z rétablissent,
  dans la zone.
- PC17 Dépôt sur la zone : `preventDefault` et `stopPropagation` (aucun gestionnaire de dépôt plus haut ne le reçoit).

## Global Constraints

- GC1 Budget : une tâche vise 20 à 75 min sur la VM (8 cœurs, 28 Go) ; aucune commande lourde hors celles de sa
  section.
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`,
  `#[ignore]`), aucun seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri
  (`tauri build`), aucun build Android.
- GC4 Préparation du worktree `$WT` (`~/projets/roomboard-wt/usage-c7b-texte-riche--T<n>`, donné par l'orchestrateur),
  une fois : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm apps/web/src/` ;
  `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm-formats apps/web/src/` ;
  tâche Rust : `[ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/target .` (1,5 Go : les
  dépendances ne sont pas recompilées). Modules générés ignorés par git, jamais commités.
- GC4b Régénération du module Wasm depuis le code du worktree (T12, T13, T14, T15) :
  `cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm` ;
  application construite (essais) : `pnpm --filter @roomboard/web build`.
- GC5 Preuve bornée : la commande de la section, telle quelle ; le rapport cite le nombre de tests (N ≥ 1) et les noms
  attendus vus dans la sortie.
- GC6 Commits : chaque fichier ajouté par son chemin (`git add <chemin>`, jamais `git add -A`, `--all`, `.`, ni
  `git commit -a`), auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Aucun `--force`. Ne pas pousser.
- GC7 Dépendances : aucune nouvelle (ni ProseMirror, ni Lexical, ni Tiptap, R20) ; jamais GPL, LGPL ni AGPL ;
  `scripts/controle-licences.mjs` reste vert sans changement.
- GC8 Plafond Wasm H2-13 inchangé : 1 572 864 octets, contrôle de `scripts/verifier.sh` non modifié.
- GC9 Format : `schema` et `formatVersion` inchangés, aucun champ neuf dans `document.ybin` ; clés d'attribut inconnues
  et embeds jamais touchés ; `SetText` et `SetTableCell` sans `spans` gardent le comportement d'aujourd'hui (R7).
- GC10 Couches : `crates/` sans dépendance au navigateur ; le cœur tourne en Wasm dans la page.
- GC11 Interface : dans `apps/web/src/ui/`, aucun `switch`, aucune taille en `px` dans un `.tsx` (commentaires
  compris), libellés en français, aucune icône seule (`aria-label` sur chaque bouton), cibles d'au moins `--rb-btn`.
- GC12 Chantier parallèle OD80 (C10b) sur les fichiers du tableau (`table.rs`, `commands.rs`, `roomboard-wasm/src/lib.rs`,
  `api.ts`, `fake-core.ts`, `wasm-core.ts`, `table-geom.ts`, `table-paint.ts`, `canvas2d.ts`, `tools/table.ts`,
  `Toolbar.tsx`, `c10a-tableau-navigateur.mjs`) : changements minces (champs ajoutés en fin, une ligne d'appel), toute
  logique neuve dans `rich_text.rs` ou les modules neufs (`rich-edit.ts`, `rich-dom.ts`, `FormatRow.tsx`).
- GC13 Périmètre : la tâche ne modifie que ses fichiers touchés.
- GC14 `tsc` : `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"` ne rend rien à la fin de la
  tâche, sauf l'écart nommé dans la section.
- GC15 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne
  `Réutilise :` de la section, et les noms de tests vus.
- GC16 Rust : `cargo fmt --all` puis `cargo clippy -p <crate> --all-targets -- -D warnings` sans avertissement avant le
  commit.
- GC17 Reste OD71 (écriture concurrente Yrs) : mesuré par test, jamais tranché ; aucun changement du modèle de document
  (cellules précréées, clés par client) ; le résultat va au rapport.

Commande de commit type :

```bash
cd "$WT" && git add <fichier1> && git add <fichier2> && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "<message anglais>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Commande de test type (vitest, verbeuse, bornée) :

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web test -- <fichiers> --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -80
```

## Review Focus

1. Frappe ambiguë au curseur : « aa », curseur entre les deux, Ctrl+B, « a » — la deuxième lettre est la neuve et la
   seule grasse ; le patron « préfixe d'abord » d'`editSpans` mettrait la troisième (S1, R3) — tests « editSpansAt :
   « aa », curseur au milieu » (T2), « Ctrl+B au curseur puis « a » : la deuxième lettre grasse » (T7), « frappe
   relue : « aa », curseur au milieu, Ctrl+B, « a » » (T10).
2. Composition IME : rien n'est relu ni redessiné pendant la composition ; un `selectionchange` pendant elle ou après
   un redessin n'oublie pas le format en attente ; à `compositionend`, relire puis relayer (la validation voit le texte
   composé) (S3, R5, R9) — tests « Ctrl+B puis composition « に » » et « ordre à compositionend » (T10), « attente
   gardée si select égal » (T7).
3. Mise en forme seule, texte inchangé : jamais « inchangé », une étape, dans les deux cœurs et dans les outils (S6,
   R6, R7) — tests `set_text_format_only_is_written` (T1), `set_cell_format_only_is_written` (T5), « S6 : même texte,
   segments changés » (T6), « mise en forme seule (S6) » (T11).
4. `Y.Text` écrit par d'autres : valeur brute hors domaine (`bold: "oui"`), clé inconnue, embed — jamais réécrits par
   l'alignement ; segments sans attribut = mêmes octets qu'aucun segment (S5, R7, GC9) — tests
   `apply_spans_keeps_raw_out_of_domain_and_unknown_keys`, `apply_spans_never_formats_an_embed`,
   `socle_fixture_plain_spans_write_the_same_update_as_no_spans` (T1).
5. Clic sur un bouton de la rangée : la zone garde focus et sélection, la séance n'est pas validée ; le clic d'un autre
   bouton de la barre valide toujours (perte du focus) (R13, effet de bord) — tests « pointerdown et mousedown
   empêchés » (T9), « perte du focus : validation demandée » (T10), lecture « G puis rouge : la zone reste ouverte,
   « chat » toujours sélectionné » (T14).

## Carte des fichiers

| fichier | responsabilité | tâche |
|---|---|---|
| `crates/roomboard-core/src/rich_text.rs` | `SpanInput`, `valid_spans`, `spans_differ`, `apply_spans` (T1) ; `cell_spans`, `spans_unchanged` (T5) | T1, T5 |
| `crates/roomboard-core/src/commands.rs` | `SetText.spans` (T1) ; `SetTableCell.spans` (T5) | T1, T5 |
| `crates/roomboard-core/src/table.rs` | `TableCellView.spans`, une ligne dans `view`, alignement dans `cmd_set_table_cell` | T5 |
| `crates/roomboard-core/tests/texte_riche.rs` | R7 par commandes, R23 a, b, c | T1, T5 |
| `crates/roomboard-core/src/document.rs`, `src/query.rs`, `tests/scenarios.rs`, `tests/compat_socle.rs`, `tests/tableau.rs` | constructions `spans: None` ; aller-retours riches | T1, T5 |
| `crates/roomboard-wasm/src/lib.rs` | `spans: None` (T1, T5) ; `read_spans_input`, `set_text` et `set_table_cell` + `spans` (T12) | T1, T5, T12 |
| `apps/web/src/core/api.ts` | `SetText.spans?`, `SetTableCell.spans?`, `TableCell.spans` | T2 |
| `apps/web/src/core/rich-text.ts` | `editSpansAt`, `insertedRange`, `spliceSpans`, `spansText`, `validSpans`, `normalSpans`, `patched` exporté | T2 |
| `apps/web/src/engine/rich-edit.ts` | types de la séance (T2) ; `createRichEdit` (T7) | T2, T7 |
| `apps/web/src/app/rich-dom.ts` | segments → DOM, DOM → texte, sélection UTF-16 | T3 |
| `scripts/essais/commun.mjs` et quatre essais, `scripts/tests/coque-csp.test.sh` | `coqueCsp` unique | T4 |
| `apps/web/src/core/fake-core.ts`, `wasm-core.ts` | parité des segments (T6) ; appels et contrôle du vrai module (T12) | T6, T12 |
| `apps/web/src/engine/table-geom.ts`, `render/table-paint.ts`, `render/canvas2d.ts` | mesure et dessin par segments | T8 |
| `apps/web/src/ui/FormatRow.tsx`, `ui/item-state.ts`, `ui/rb.css` | rangée Format, `ToolbarView.textFormat` | T9 |
| `apps/web/src/app/text-editor.ts` | zone contenteditable | T10 |
| `apps/web/src/engine/tools/text.ts`, `tools/table.ts`, `tools/tool.ts`, `engine.ts` | hôte riche, commit avec `spans`, `format`, `textFormat` | T11 |
| `apps/web/src/app/toolbar-host.ts`, `ui/Toolbar.tsx`, `app/board-session.test.ts` | branchement | T13 |
| `scripts/essais/c7b-texte-riche-navigateur.mjs`, `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/c7b-*.png` | essai e2e, captures | T14 |
| `scripts/essais/s34-navigateur.mjs`, `s5b-navigateur.mjs`, `c10a-tableau-navigateur.mjs` | essais adaptés | T15 |

---

<a id="tache-t1"></a>

### Tâche T1 — Cœur : segments voulus (`SpanInput`, `apply_spans`) et `SetText.spans`

**Objectif.** `SetText` gagne `spans` facultatif (R7, DAR1) : contrôlé d'abord (`BadFormat`), comparé à la vue
normalisée pour la sortie « inchangé », puis aligné dans la même transaction que la différence de texte ou la création,
en n'écrivant que les clés connues qui diffèrent. Absent : comportement de C7. Mesures R23 b et c (texte) par deux
documents fusionnés. Scénario S5 (et S6 côté texte).

**Fichiers.**
- Modifier : `crates/roomboard-core/src/rich_text.rs` (code neuf après `apply_format`, `:344` ; tests en fin du module
  `tests`), `crates/roomboard-core/src/commands.rs:20` (import), `:65-76` (`SetText`), `:306-316` (`TextInput`),
  `:494-515` (bras), `:668-722` (`cmd_set_text`), `:724-750` (`insert_text`)
- Modifier (constructions, `spans: None` après `box_height`) : `commands.rs:1926` (`text_cmd`), `document.rs:1204`,
  `query.rs:924`, `rich_text.rs:726`, `:789`, `:922`, `tests/scenarios.rs:142`, `:247`, `tests/compat_socle.rs:64`,
  `crates/roomboard-wasm/src/lib.rs:1046-1056` (`set_text_inner`)
- Créer : `crates/roomboard-core/tests/texte_riche.rs`
- Tests : `rich_text.rs` (module `tests`), `tests/texte_riche.rs`, `tests/scenarios.rs` (un test neuf)

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit :

```rust
// crates/roomboard-core/src/rich_text.rs
#[derive(Debug, Clone, PartialEq)]
pub struct SpanInput { pub text: String, pub attrs: SpanAttrs }
pub(crate) fn valid_spans(content: &str, spans: &[SpanInput]) -> bool;
pub(crate) fn spans_differ<T: ReadTxn>(txn: &T, text: &TextRef, spans: &[SpanInput]) -> bool;
pub(crate) fn apply_spans(txn: &mut TransactionMut, text: &TextRef, spans: &[SpanInput]);
// crates/roomboard-core/src/commands.rs
Command::SetText { page, id, x, y, content, color, size, box_width, box_height, spans: Option<Vec<SpanInput>> }
```

  T5 ajoute dans `rich_text.rs` `cell_spans` et `spans_unchanged` et réutilise `valid_spans`, `apply_spans`. T12 lit
  `SpanInput` depuis la page.
- Réutilise : `crates/roomboard-core/src/rich_text.rs:254`, `:175`, `:107` — `apply_text_diff(txn, text, new)`,
  `normalize(raw: Option<&Attrs>) -> SpanAttrs`, `char_table(txn, text) -> Option<(Vec<CharAt>, Vec<Attrs>)>` ;
  étendu par `valid_spans`, `spans_differ`, `apply_spans` (comparaison normalisée) ; `format_changes` (`:309`, brut)
  n'est pas employé ; `utf16_range` (`:157`) non appelé (les positions de l'état voulu sont des points de code).
- Réutilise : `crates/roomboard-core/src/rich_text.rs:71`, `:85`, `:297` — `valid_attrs(&[TextAttr]) -> bool`,
  `entry(&TextAttr) -> (&'static str, Any)`, `same_value(Option<&Any>, &Any) -> bool` (domaines T15, arrondi f32 de T11).
- Réutilise : `crates/roomboard-core/src/commands.rs:671` — `SetText` étendu de `spans` (R7).
- Réutilise : `crates/roomboard-core/src/commands.rs:2388-2393`, `document.rs:356` — patron d'échange
  `apply_update(Update::decode_v1(...))` sur un `Doc` brut, `Document::encode_v1()`, `Document::from_update_v1(&[u8])`
  (tests R23).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
cargo test -p roomboard-core 2>&1 | grep -E "^test .*(spans|concurrent|rich_text_set_text|new_text_with|socle_fixture|format_text_is_one_step|set_text_keeps_range)|test result|FAILED|panicked|error\[" | tail -60 ; \
cargo test -p roomboard-wasm 2>&1 | grep -E "test result|FAILED|error\[" | tail -5
```

Attendu : aucun `FAILED`, aucun `error[` ; lignes `... ok` pour `valid_spans_checks_concat_then_domains`,
`plain_spans_write_the_same_update_as_no_spans`, `socle_fixture_plain_spans_write_the_same_update_as_no_spans`,
`apply_spans_keeps_raw_out_of_domain_and_unknown_keys`, `apply_spans_never_formats_an_embed`,
`set_text_with_spans_is_one_undo_step`, `set_text_format_only_is_written`, `set_text_same_spans_is_unchanged`,
`set_text_bad_spans_is_bad_format_first`, `new_text_with_spans_is_created_formatted`,
`concurrent_formats_of_two_words_in_a_text_both_stay`, `concurrent_typing_in_one_text_keeps_both_insertions`,
`rich_text_set_text_round_trips` (≥ 13 noms C7b), plus `socle_fixture_resaves_identically`,
`socle_fixture_text_is_one_plain_span`, `format_text_is_one_step_and_reads_spans`,
`set_text_keeps_range_attributes_outside_the_edit` verts ; `roomboard-wasm` : `test result: ok`.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`#[ignore]`), aucun seuil changé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `[ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/target .`.
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle ; jamais GPL, LGPL ni AGPL.
- GC9 Format : aucun champ neuf dans `document.ybin` ; clés inconnues et embeds jamais touchés ; `SetText` sans
  `spans` = comportement de C7.
- GC10 `crates/` sans dépendance au navigateur.
- GC12 OD80 : dans `commands.rs`, champ ajouté en fin de variante et une ligne dans le bras ; la logique vit dans
  `rich_text.rs`.
- GC13 Périmètre : seuls les fichiers ci-dessus.
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.
- GC16 `cargo fmt --all` puis `cargo clippy -p roomboard-core --all-targets -- -D warnings` et
  `cargo clippy -p roomboard-wasm --all-targets -- -D warnings`.
- GC17 OD71 : R23 b et c mesurés, rien de tranché ; le résultat (deux formats gardés, deux frappes gardées) va au
  rapport.

**Interdits.** Ne pas employer `format_changes` ni `apply_format` dans `apply_spans` (comparaison brute : elle
réécrirait les valeurs hors domaine) ; ne jamais formater une plage qui contient un embed ; ne pas toucher
`cmd_format_text` ; ne pas toucher `SetTableCell` (T5) ; dans `lib.rs`, seulement `spans: None` (la liaison est T12).

**Patron à ne pas reprendre.** `crates/roomboard-core/src/rich_text.rs:297-345` (`same_value`, `format_changes`,
`apply_format` : comparaison des valeurs **brutes** d'un patch sur une plage) et l'enchaînement `SetText` puis
`FormatText` (`commands.rs:1061-1104`) : plusieurs étapes d'annulation, et une valeur brute `bold: "oui"` qu'une cible
laisse sans gras serait réécrite. Chemin de référence : `normalize` (`rich_text.rs:175-197`, vue normalisée) et
`char_table` (`:107-139`, décalages Yrs par caractère, embeds comptés 1).

**Critère « terminé ».** Commande bornée verte, clippy sans avertissement, `cargo fmt --all --check` vide, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4) et vérifier la référence :
  `cargo test -p roomboard-core 2>&1 | grep -E "test result|FAILED" | tail -5` (attendu : aucun `FAILED`).

- [ ] **Étape 2 : tests unitaires rouges dans `rich_text.rs`.** En fin du module `tests` (après
  `string_embed_keeps_view_invariant`), ajouter :

```rust
    // C7b (R7) : état voulu des segments, alignement des seules clés connues qui diffèrent de la vue normalisée.

    fn sp(t: &str, attrs: SpanAttrs) -> SpanInput {
        SpanInput {
            text: t.into(),
            attrs,
        }
    }

    #[test]
    fn valid_spans_checks_concat_then_domains() {
        let ok = vec![sp("Le ", SpanAttrs::default()), sp("chat", red())];
        assert!(valid_spans("Le chat", &ok));
        assert!(valid_spans("", &[]));
        assert!(!valid_spans("Le cha", &ok));
        for bad in [
            SpanAttrs { color: Some("rouge!".into()), ..SpanAttrs::default() },
            SpanAttrs { size: Some(0.0), ..SpanAttrs::default() },
            SpanAttrs { size: Some(1e39), ..SpanAttrs::default() },
            SpanAttrs { font: Some("a;b".into()), ..SpanAttrs::default() },
        ] {
            assert!(!valid_spans("x", &[sp("x", bad.clone())]), "{bad:?}");
        }
    }

    /// Deux `Doc` bruts au même client, tirés de `state` ; `f` et `g` jouées chacune dans une transaction sur le
    /// `Y.Text` du `n`-ième élément de la première page ; rend les deux états encodés.
    fn twin_updates(
        state: &[u8],
        n: u32,
        f: impl Fn(&mut TransactionMut, &TextRef),
        g: impl Fn(&mut TransactionMut, &TextRef),
    ) -> (Vec<u8>, Vec<u8>) {
        use yrs::updates::decoder::Decode;
        use yrs::{Array, Map, StateVector, Update};
        let run = |edit: &dyn Fn(&mut TransactionMut, &TextRef)| {
            let doc = Doc::with_client_id(1);
            let pages = doc.get_or_insert_array("pages");
            doc.transact_mut()
                .apply_update(Update::decode_v1(state).expect("décodage"))
                .expect("mise à jour");
            let text = {
                let txn = doc.transact();
                let Some(Out::YMap(page)) = pages.get(&txn, 0) else {
                    panic!("page")
                };
                let Some(Out::YArray(els)) = page.get(&txn, "elements") else {
                    panic!("éléments")
                };
                let Some(Out::YMap(el)) = els.get(&txn, n) else {
                    panic!("élément")
                };
                let Some(Out::YText(t)) = el.get(&txn, "content") else {
                    panic!("texte")
                };
                t
            };
            edit(&mut doc.transact_mut(), &text);
            doc.transact()
                .encode_state_as_update_v1(&StateVector::default())
        };
        (run(&f), run(&g))
    }

    /// S5 (R7), document neuf : segments sans attribut sur un texte sans attribut = mêmes octets qu'une différence
    /// seule. Patron écarté : un alignement qui écrirait toutes les clés (`Any::Null` compris) changerait les octets.
    #[test]
    fn plain_spans_write_the_same_update_as_no_spans() {
        let (d, _, _) = core_text("Le chat noir");
        let new = "Le gros chat noir";
        let target = vec![sp(new, SpanAttrs::default())];
        let (a, b) = twin_updates(
            &d.encode_v1(),
            0,
            |txn, t| apply_text_diff(txn, t, new),
            |txn, t| {
                apply_text_diff(txn, t, new);
                apply_spans(txn, t, &target);
            },
        );
        assert_eq!(a, b);
    }

    /// S5 (C7 T12, R7) : fichier du socle, troisième élément de la première page (« Bonjour RoomBoard »).
    #[test]
    fn socle_fixture_plain_spans_write_the_same_update_as_no_spans() {
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/socle-v1.roomboard");
        let d = crate::format::load(&std::fs::read(path).expect("fixture")).expect("load");
        let new = "Bonjour à RoomBoard";
        let target = vec![sp(new, SpanAttrs::default())];
        let (a, b) = twin_updates(
            &d.encode_v1(),
            2,
            |txn, t| apply_text_diff(txn, t, new),
            |txn, t| {
                apply_text_diff(txn, t, new);
                apply_spans(txn, t, &target);
            },
        );
        assert_eq!(a, b);
    }

    /// R7 : valeur brute hors domaine (`bold: "oui"`) sur une plage que la cible laisse sans gras, et clé inconnue
    /// (`href`) : gardées ; seul le gras voulu de « chat » est écrit. Patron écarté : comparer les valeurs brutes
    /// (`format_changes`) réécrirait « Le » en retirant `bold: "oui"`.
    #[test]
    fn apply_spans_keeps_raw_out_of_domain_and_unknown_keys() {
        let (doc, text) = doc_with("Le chat noir");
        {
            let mut txn = doc.transact_mut();
            text.format(&mut txn, 0, 2, Attrs::from([(Arc::from("bold"), Any::from("oui"))]));
            text.format(&mut txn, 3, 4, Attrs::from([(Arc::from("href"), Any::from("x"))]));
        }
        let target = vec![
            sp("Le ", SpanAttrs::default()),
            sp("chat", bold()),
            sp(" noir", SpanAttrs::default()),
        ];
        assert!(spans_differ(&doc.transact(), &text, &target));
        apply_spans(&mut doc.transact_mut(), &text, &target);
        let txn = doc.transact();
        let chunks: Vec<(String, Attrs)> = text
            .diff(&txn, YChange::identity)
            .into_iter()
            .map(|c| {
                let s = match &c.insert {
                    Out::Any(Any::String(s)) => s.to_string(),
                    _ => String::new(),
                };
                (s, c.attributes.map(|a| *a).unwrap_or_default())
            })
            .collect();
        let get = |s: &str, k: &str| {
            chunks
                .iter()
                .find(|(t, _)| t == s)
                .and_then(|(_, a)| a.get(k).cloned())
        };
        assert_eq!(get("Le", "bold"), Some(Any::from("oui")));
        assert_eq!(get("chat", "href"), Some(Any::from("x")));
        assert_eq!(get("chat", "bold"), Some(Any::Bool(true)));
        assert!(!spans_differ(&txn, &text, &target));
    }

    /// R7, GC9 : un embed au milieu coupe la plage formatée ; il ne reçoit aucun attribut.
    #[test]
    fn apply_spans_never_formats_an_embed() {
        let (doc, text) = doc_with("abcd");
        text.insert_embed(&mut doc.transact_mut(), 2, embed());
        apply_spans(&mut doc.transact_mut(), &text, &[sp("abcd", bold())]);
        assert_eq!(spans(&doc, &text), vec![with("abcd", bold())]);
        assert_eq!(embeds(&doc, &text), 1);
        let embed_attrs = text
            .diff(&doc.transact(), YChange::identity)
            .into_iter()
            .find(|c| !matches!(c.insert, Out::Any(Any::String(_))))
            .and_then(|c| c.attributes);
        assert!(
            embed_attrs.is_none_or(|a| !a.contains_key("bold")),
            "embed formaté"
        );
    }
```

- [ ] **Étape 3 : test d'intégration rouge.** Créer `crates/roomboard-core/tests/texte_riche.rs` :

```rust
//! C7b (R7, R23) : `SetText` (T1) et `SetTableCell` (T5) avec segments voulus, par l'API publique du cœur ; mesures
//! de l'écriture concurrente (reste OD71, jamais tranché) par deux documents tirés des mêmes octets, fusionnés dans les
//! deux ordres.
use roomboard_core::commands::{Command, CommandError};
use roomboard_core::document::Document;
use roomboard_core::rich_text::{SpanAttrs, SpanInput, TextSpanView};
use yrs::updates::decoder::Decode;
use yrs::{ReadTxn, StateVector, Transact, Update};

fn none() -> SpanAttrs {
    SpanAttrs::default()
}

fn bold() -> SpanAttrs {
    SpanAttrs { bold: true, ..SpanAttrs::default() }
}

fn italic() -> SpanAttrs {
    SpanAttrs { italic: true, ..SpanAttrs::default() }
}

fn red_bold() -> SpanAttrs {
    SpanAttrs { bold: true, color: Some("#dc2626".into()), ..SpanAttrs::default() }
}

fn sp(t: &str, attrs: SpanAttrs) -> SpanInput {
    SpanInput { text: t.into(), attrs }
}

fn view(t: &str, attrs: SpanAttrs) -> TextSpanView {
    TextSpanView { text: t.into(), attrs }
}

/// `SetText` sur le texte `id` (neuf si `None`), segments voulus `spans`.
fn set_text(page: &str, id: Option<&str>, content: &str, spans: Option<Vec<SpanInput>>) -> Command {
    Command::SetText {
        page: page.into(),
        id: id.map(str::to_string),
        x: 100.0,
        y: 200.0,
        content: content.into(),
        color: "#000000".into(),
        size: 36.0,
        box_width: 600.0,
        box_height: 45.0,
        spans,
    }
}

/// Document d'une page et d'un texte sans attribut : (document, page, id).
fn text_doc(content: &str) -> (Document, String, String) {
    let mut d = Document::blank();
    let page = d.page_ids()[0].clone();
    let id = d.apply(set_text(&page, None, content, None)).expect("texte").ids[0].clone();
    (d, page, id)
}

fn text_spans(d: &Document, id: &str) -> Vec<TextSpanView> {
    d.element(id).and_then(|e| e.text).expect("texte").spans
}

fn content(d: &Document, id: &str) -> String {
    d.element(id).and_then(|e| e.text).expect("texte").content
}

/// Deux documents tirés des mêmes octets que `d` (R23).
fn twins(d: &Document) -> (Document, Document) {
    let bytes = d.encode_v1();
    (
        Document::from_update_v1(&bytes).expect("a"),
        Document::from_update_v1(&bytes).expect("b"),
    )
}

/// États de `first` puis de `second` appliqués à un `Doc` brut, relu en document (patron de `commands.rs:2388`).
fn merged(first: &Document, second: &Document) -> Document {
    let raw = yrs::Doc::new();
    {
        let mut txn = raw.transact_mut();
        for d in [first, second] {
            txn.apply_update(Update::decode_v1(&d.encode_v1()).expect("décodage"))
                .expect("mise à jour");
        }
    }
    let bytes = raw.transact().encode_state_as_update_v1(&StateVector::default());
    Document::from_update_v1(&bytes).expect("fusion")
}

/// S1, R6, R7 : texte changé et mis en forme par une seule `SetText` : une seule étape d'annulation.
#[test]
fn set_text_with_spans_is_one_undo_step() {
    let (mut d, page, id) = text_doc("Le chat noir");
    let before = text_spans(&d, &id);
    let spans = vec![sp("Le gros ", none()), sp("chat", red_bold()), sp(" noir", none())];
    d.apply(set_text(&page, Some(&id), "Le gros chat noir", Some(spans))).expect("riche");
    assert_eq!(
        text_spans(&d, &id),
        vec![view("Le gros ", none()), view("chat", red_bold()), view(" noir", none())]
    );
    assert!(d.undo());
    assert_eq!((content(&d, &id), text_spans(&d, &id)), ("Le chat noir".to_string(), before));
}

/// S6 (R6, R7) : même texte, segments changés : la commande s'écrit (jamais « inchangé ») ; une étape.
#[test]
fn set_text_format_only_is_written() {
    let (mut d, page, id) = text_doc("Le chat noir");
    let v = d.version();
    let spans = vec![sp("Le chat ", none()), sp("noir", italic())];
    d.apply(set_text(&page, Some(&id), "Le chat noir", Some(spans))).expect("italique");
    assert!(d.version() > v);
    assert_eq!(text_spans(&d, &id)[1], view("noir", italic()));
    assert!(d.undo());
    assert_eq!(text_spans(&d, &id), vec![view("Le chat noir", none())]);
}

/// D38, R7 : même texte, mêmes segments une fois normalisés (voisins égaux fusionnés) : aucune transaction.
#[test]
fn set_text_same_spans_is_unchanged() {
    let (mut d, page, id) = text_doc("Le chat");
    d.apply(set_text(&page, Some(&id), "Le chat", Some(vec![sp("Le ", none()), sp("chat", bold())])))
        .expect("gras");
    let v = d.version();
    let same = vec![sp("Le", none()), sp(" ", none()), sp("chat", bold())];
    d.apply(set_text(&page, Some(&id), "Le chat", Some(same))).expect("même");
    assert_eq!(d.version(), v);
}

/// R7 (PC2) : segments contrôlés d'abord, `BadFormat` sans transaction, avant l'élément inconnu et le texte invalide.
#[test]
fn set_text_bad_spans_is_bad_format_first() {
    let (mut d, page, id) = text_doc("Le chat");
    let v = d.version();
    let bad = [
        vec![sp("Le cha", none())],
        vec![sp("Le chat", SpanAttrs { color: Some("rouge!".into()), ..none() })],
        vec![sp("Le chat", SpanAttrs { size: Some(0.0), ..none() })],
    ];
    for spans in bad {
        assert_eq!(
            d.apply(set_text(&page, Some(&id), "Le chat", Some(spans.clone()))),
            Err(CommandError::BadFormat)
        );
        assert_eq!(
            d.apply(set_text(&page, Some("absent"), "Le chat", Some(spans.clone()))),
            Err(CommandError::BadFormat)
        );
        let mut tiny = set_text(&page, Some(&id), "Le chat", Some(spans));
        if let Command::SetText { size, .. } = &mut tiny {
            *size = 0.0;
        }
        assert_eq!(d.apply(tiny), Err(CommandError::BadFormat));
    }
    assert_eq!(d.version(), v);
}

/// R7 : boîte neuve avec segments : créée mise en forme dans la même transaction ; annuler la retire.
#[test]
fn new_text_with_spans_is_created_formatted() {
    let mut d = Document::blank();
    let page = d.page_ids()[0].clone();
    let spans = vec![sp("Le ", none()), sp("chat", red_bold())];
    let id = d.apply(set_text(&page, None, "Le chat", Some(spans))).expect("neuf").ids[0].clone();
    assert_eq!(text_spans(&d, &id), vec![view("Le ", none()), view("chat", red_bold())]);
    assert!(d.undo());
    assert!(d.element(&id).is_none());
}

/// R23 b (reste OD71, mesure) : mises en forme concurrentes de deux mots d'un même texte : les deux restent, dans les
/// deux ordres de fusion (l'alignement n'écrit que les plages changées).
#[test]
fn concurrent_formats_of_two_words_in_a_text_both_stay() {
    let (d, page, id) = text_doc("Le chat noir");
    let (mut a, mut b) = twins(&d);
    a.apply(set_text(&page, Some(&id), "Le chat noir", Some(vec![sp("Le ", none()), sp("chat", bold()), sp(" noir", none())])))
        .expect("a");
    b.apply(set_text(&page, Some(&id), "Le chat noir", Some(vec![sp("Le chat ", none()), sp("noir", italic())])))
        .expect("b");
    let ab = text_spans(&merged(&a, &b), &id);
    assert_eq!(ab, text_spans(&merged(&b, &a), &id));
    assert_eq!(
        ab,
        vec![view("Le ", none()), view("chat", bold()), view(" ", none()), view("noir", italic())]
    );
}

/// R23 c (mesure) : frappes concurrentes dans le même texte : les deux insertions restent.
#[test]
fn concurrent_typing_in_one_text_keeps_both_insertions() {
    let (d, page, id) = text_doc("Le chat noir");
    let (mut a, mut b) = twins(&d);
    a.apply(set_text(&page, Some(&id), "Le gros chat noir", Some(vec![sp("Le gros chat noir", none())])))
        .expect("a");
    b.apply(set_text(&page, Some(&id), "Le chat noir et blanc", Some(vec![sp("Le chat noir et blanc", none())])))
        .expect("b");
    let ab = content(&merged(&a, &b), &id);
    assert_eq!(ab, content(&merged(&b, &a), &id));
    assert_eq!(ab, "Le gros chat noir et blanc");
}
```

  Puis, dans `crates/roomboard-core/tests/scenarios.rs`, ajouter `use roomboard_core::rich_text::{SpanAttrs, SpanInput};`
  aux imports et, en fin de fichier :

```rust
/// C7b (S1, S5) : un texte mis en forme par `SetText` avec segments survit à l'aller-retour `.roomboard`.
#[test]
fn rich_text_set_text_round_trips() {
    let mut d = Document::blank();
    let page = d.page_ids()[0].clone();
    let red_bold = SpanAttrs { bold: true, color: Some("#dc2626".into()), ..SpanAttrs::default() };
    let spans = vec![
        SpanInput { text: "Le ".into(), attrs: SpanAttrs::default() },
        SpanInput { text: "chat".into(), attrs: red_bold.clone() },
        SpanInput { text: " noir".into(), attrs: SpanAttrs::default() },
    ];
    let id = d
        .apply(Command::SetText {
            page,
            id: None,
            x: 100.0,
            y: 200.0,
            content: "Le chat noir".into(),
            color: "#000000".into(),
            size: 36.0,
            box_width: 600.0,
            box_height: 45.0,
            spans: Some(spans),
        })
        .expect("texte")
        .ids[0]
        .clone();
    let meta = SaveMeta { app_version: "0.1.0".into(), now: "2026-11-20T00:00:00Z".into(), created: None };
    let back = load(&save(&d, &meta).expect("save")).expect("load");
    let got = back.element(&id).and_then(|e| e.text).expect("texte").spans;
    assert_eq!(got.iter().map(|s| s.text.as_str()).collect::<Vec<_>>(), vec!["Le ", "chat", " noir"]);
    assert_eq!(got[1].attrs, red_bold);
}
```

- [ ] **Étape 4 : vérifier le rouge.** `cargo test -p roomboard-core 2>&1 | grep -E "error\[|cannot find" | head -10`.
  Attendu : `error[E0412]`/`E0425` sur `SpanInput`, `valid_spans`, `apply_spans`, `spans_differ`, et `E0560` (champ
  `spans` inconnu de `Command::SetText`).

- [ ] **Étape 5 : code neuf de `rich_text.rs`.** Après `apply_format` (avant `#[cfg(test)]`), ajouter :

```rust
/// Segment voulu d'un `SetText` ou d'un `SetTableCell` (C7b, R7) : un état, pas un patch ; champ au défaut = absent.
#[derive(Debug, Clone, PartialEq)]
pub struct SpanInput {
    pub text: String,
    pub attrs: SpanAttrs,
}

/// Entrées de `attrs` dans l'ordre de `TextAttr` : chaque clé connue, au défaut comprise (`false`, `None` = retrait).
fn entries(attrs: &SpanAttrs) -> [TextAttr; 6] {
    [
        TextAttr::Bold(attrs.bold),
        TextAttr::Italic(attrs.italic),
        TextAttr::Underline(attrs.underline),
        TextAttr::Color(attrs.color.clone()),
        TextAttr::Size(attrs.size.map(|v| v as f32)),
        TextAttr::Font(attrs.font.clone()),
    ]
}

/// Contrôle d'un état voulu (R7) : concaténation des `text` égale au contenu, valeurs dans les domaines de T15
/// (`valid_attrs`, `size` contrôlé après conversion en `f32`).
pub(crate) fn valid_spans(content: &str, spans: &[SpanInput]) -> bool {
    spans.iter().flat_map(|s| s.text.chars()).eq(content.chars())
        && spans.iter().all(|s| valid_attrs(&entries(&s.attrs)))
}

/// Clés connues dont la vue normalisée `current` diffère de `target`, avec la valeur à écrire (`Any::Null` retire) ;
/// `size` comparé après arrondi en `f32` (T11, `same_value`) ; vide si rien ne change.
fn differing(current: &SpanAttrs, target: &SpanAttrs) -> Attrs {
    let mut out = Attrs::new();
    for (now, want) in entries(current).iter().zip(entries(target).iter()) {
        let (key, have) = entry(now);
        let (_, value) = entry(want);
        if !same_value(Some(&have), &value) {
            out.insert(Arc::from(key), value);
        }
    }
    out
}

/// Plan d'alignement (R7) : chaque caractère comparé, vue normalisée contre cible ; plages Yrs contiguës de même patch
/// (un embed, compté 1 par `char_table`, coupe la plage : jamais formaté). `None` si la table est illisible (T13) ou
/// si sa longueur diffère de la cible (PC3).
fn align_plan<T: ReadTxn>(txn: &T, text: &TextRef, spans: &[SpanInput]) -> Option<Vec<(u32, u32, Attrs)>> {
    let (chars, raw) = char_table(txn, text)?;
    let want: Vec<&SpanAttrs> = spans
        .iter()
        .flat_map(|s| s.text.chars().map(move |_| &s.attrs))
        .collect();
    if want.len() != chars.len() {
        return None;
    }
    let norm: Vec<SpanAttrs> = raw.iter().map(|a| normalize(Some(a))).collect();
    let mut runs: Vec<(u32, u32, Attrs)> = Vec::new();
    for (c, t) in chars.iter().zip(want) {
        let patch = differing(&norm[c.chunk], t);
        if patch.is_empty() {
            continue;
        }
        let len = c.ch.len_utf8() as u32;
        match runs.last_mut() {
            Some((start, n, p)) if *start + *n == c.yrs && *p == patch => *n += len,
            _ => runs.push((c.yrs, len, patch)),
        }
    }
    Some(runs)
}

/// Sortie « inchangé » (R7) : vrai si un caractère porte une valeur connue normalisée différente de la cible ; table
/// illisible : faux (rien n'est aligné, PC3).
pub(crate) fn spans_differ<T: ReadTxn>(txn: &T, text: &TextRef, spans: &[SpanInput]) -> bool {
    align_plan(txn, text, spans).is_some_and(|runs| !runs.is_empty())
}

/// Aligne les attributs connus du `Y.Text` sur la cible (R7, DAR1), dans la transaction de l'appelant, après
/// `apply_text_diff` : n'écrit, par `Text::format`, que les clés qui diffèrent ; clés inconnues, embeds et valeurs
/// brutes hors domaine que la cible laisse sans l'attribut ne sont jamais touchés.
pub(crate) fn apply_spans(txn: &mut TransactionMut, text: &TextRef, spans: &[SpanInput]) {
    let Some(runs) = align_plan(&*txn, text, spans) else {
        return;
    };
    for (start, len, patch) in runs {
        text.format(txn, start, len, patch);
    }
}
```

- [ ] **Étape 6 : `SetText.spans` dans `commands.rs`.** Import `:20` : `use crate::rich_text::{self, SpanInput, TextAttr};`.
  Variante `SetText` (`:65-76`), après `box_height: f64,` :

```rust
        /// C7b (R7) : état voulu des segments, aligné dans la même transaction ; `None` : différence seule (C7).
        spans: Option<Vec<SpanInput>>,
```

  `TextInput` (`:306-316`), après `box_height: f64,` : `spans: Option<&'a [SpanInput]>,`. Bras (`:494-515`) :
  ajouter `spans,` au motif et `spans: spans.as_deref(),` à `TextInput { … }`. Dans `cmd_set_text`, en tête de corps
  (avant le contrôle `BadText`) :

```rust
        // C7b (R7, PC2) : segments contrôlés en premier, sans écriture ; même ordre que `fake-core.ts`.
        if t.spans.is_some_and(|s| !rich_text::valid_spans(t.content, s)) {
            return Err(CommandError::BadFormat);
        }
```

  Remplacer le bloc de lecture et le calcul de `same` :

```rust
        let (found, current, spans_same) = {
            let txn = self.read();
            let unknown = || CommandError::UnknownElement(id.to_string());
            let found = self.find_element(&txn, id).ok_or_else(unknown)?;
            let current = read_text(&txn, &found.element).ok_or_else(unknown)?;
            // R7 : une mise en forme seule (texte égal) n'est jamais « inchangée ».
            let spans_same = t
                .spans
                .is_none_or(|s| !rich_text::spans_differ(&txn, &current.text, s));
            (found, current, spans_same)
        };
```

  puis `let same = current.content == t.content && … && current.box_height == t.box_height && spans_same;` et, dans
  le bloc d'écriture, juste après `rich_text::apply_text_diff(&mut txn, &current.text, t.content);` :

```rust
            if let Some(s) = t.spans {
                rich_text::apply_spans(&mut txn, &current.text, s);
            }
```

  Dans `insert_text`, remplacer le bloc d'écriture par :

```rust
        {
            let mut txn = self.transact_local();
            let el = elements.push_back(&mut txn, fields.into_iter().collect::<MapPrelim>());
            // C7b (R7) : attributs posés dans la même transaction, sur le `Y.Text` relu après l'insertion.
            if let (Some(s), Some(Out::YText(text))) = (t.spans, el.get(&txn, "content")) {
                rich_text::apply_spans(&mut txn, &text, s);
            }
        }
```

- [ ] **Étape 7 : constructions `spans: None`.** Ajouter `spans: None,` après `box_height: …,` dans chaque
  `Command::SetText { … }` listé dans **Fichiers** (`commands.rs:1926`, `document.rs:1204`, `query.rs:924`,
  `rich_text.rs:726`, `:789`, `:922`, `tests/scenarios.rs:142`, `:247`, `tests/compat_socle.rs:64`, et
  `crates/roomboard-wasm/src/lib.rs`, `set_text_inner`). Contrôle :
  `grep -rn "Command::SetText {" crates | wc -l` puis `grep -rn -A11 "Command::SetText {" crates | grep -c "spans"` :
  le second compte vaut le premier moins les motifs `if let Command::SetText { size, .. }`.

- [ ] **Étape 8 : vert.** Lancer la commande bornée de la section. Attendu : tous les noms listés `ok`, aucun `FAILED`.
  Si `plain_spans_write_the_same_update_as_no_spans` rougit, `apply_spans` écrit une clé qui ne diffère pas : corriger
  `differing`, jamais le test.

- [ ] **Étape 9 : format et lint.** `cargo fmt --all && cargo clippy -p roomboard-core --all-targets -- -D warnings 2>&1 | tail -5 && cargo clippy -p roomboard-wasm --all-targets -- -D warnings 2>&1 | tail -5`
  (attendu : `Finished`, aucun `warning`).

- [ ] **Étape 10 : commit.**

```bash
cd "$WT" && git add crates/roomboard-core/src/rich_text.rs && git add crates/roomboard-core/src/commands.rs && \
git add crates/roomboard-core/src/document.rs && git add crates/roomboard-core/src/query.rs && \
git add crates/roomboard-core/tests/scenarios.rs && git add crates/roomboard-core/tests/compat_socle.rs && \
git add crates/roomboard-core/tests/texte_riche.rs && git add crates/roomboard-wasm/src/lib.rs && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(core): SetText carries wanted spans aligned in the same transaction" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Commande bornée et ses noms vus ; mesure R23 b et c (« deux formats gardés », « deux frappes gardées ») ;
une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.

---

<a id="tache-t2"></a>

### Tâche T2 — Contrat TS partagé : frappe ancrée, segments voulus, types de commande et de séance

**Objectif.** Poser ce que les tâches TS de la vague 2 consomment : la différence ancrée au curseur (`editSpansAt`, R3,
cas « aa » de la contre-relecture), le remplacement d'une plage (`spliceSpans`, collage et Entrée, R12), le contrôle et
la normalisation d'un état voulu (`validSpans`, `normalSpans`, R7), les champs `spans` du contrat (`api.ts`, R7, R16) et
les types de la séance riche (`engine/rich-edit.ts`, DAR2, R8, R15). Scénario S1 (geste « aa », Ctrl+B, « a »).

**Fichiers.**
- Modifier : `apps/web/src/core/rich-text.ts` (ajouts après `editSpans` `:35-46` et en fin de fichier ; `patched`
  `:100` exporté), `apps/web/src/core/api.ts:1-15` (en-tête), `:52-64` (`SetText`), `:94` (`SetTableCell`), `:121`
  (`TableCell`)
- Créer : `apps/web/src/engine/rich-edit.ts` (types seuls)
- Tests : `apps/web/src/core/rich-text.test.ts`

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit :

```ts
// core/api.ts
SetText.spans?: readonly TextSpan[];          // C7b : état voulu ; absent : différence seule (C7)
SetTableCell.spans?: readonly TextSpan[];
TableCell { row; col; text; fill; readonly spans: readonly TextSpan[] }   // champ en fin (R24)
// core/rich-text.ts
export function editSpansAt(spans: readonly TextSpan[], content: string, caret: number): TextSpan[]; // caret UTF-16 du nouveau contenu
export function insertedRange(old: string, content: string, caret: number): readonly [number, number]; // [début, fin) UTF-16 du milieu neuf
export function spliceSpans(spans: readonly TextSpan[], start: number, end: number, text: string, attrs: TextAttrs): TextSpan[];
export const spansText: (spans: readonly TextSpan[]) => string;
export function validSpans(content: string, spans: readonly TextSpan[]): boolean;
export function normalSpans(spans: readonly TextSpan[]): TextSpan[];
export function patched(attrs: TextAttrs, patch: TextAttrsPatch): TextAttrs; // existant, désormais exporté
// engine/rich-edit.ts
export type FormatAction =
  | { readonly type: "bold" } | { readonly type: "italic" } | { readonly type: "underline" }
  | { readonly type: "size"; readonly size: number }
  | { readonly type: "color"; readonly color: string | null };   // null = « Défaut »
export interface FormatState { readonly bold: boolean; readonly italic: boolean; readonly underline: boolean;
  readonly size: number | "mixed"; readonly color: string | "default" | "mixed" }
export interface RichBase { readonly size: number; readonly color: string }
export interface RichEditState { readonly spans: readonly TextSpan[]; readonly start: number; readonly end: number;
  readonly pending: TextAttrsPatch | null }
export interface RichEdit { state(): RichEditState; text(): string; input(text: string, start: number, end: number): boolean;
  select(start: number, end: number): void; insert(text: string): void; format(a: FormatAction): boolean;
  formatState(): FormatState; undo(): boolean; redo(): boolean }
```

  T6 (faux cœur) consomme `validSpans`, `normalSpans` ; T7 (modèle) `editSpansAt`, `insertedRange`, `spliceSpans`,
  `patched`, `spansText` et les types ; T8, T9, T10, T11 les types.
- Réutilise : `apps/web/src/core/rich-text.ts:35` — `editSpans(spans, content)` ; étendu par
  `editSpansAt(spans, content, caret)` dans le même module, même `charsOf` et `spansOf` (suffixe borné par le curseur,
  puis préfixe).
- Réutilise : `apps/web/src/core/rich-text.ts:69` — `validPatch(patch)` et `cleanPatch(patch)` ; étendu par
  `validSpans(content, spans)` à côté (même règle que la liaison puis le cœur).
- Réutilise : aucun module existant (nouveau module) — `apps/web/src/engine/rich-edit.ts`, types de la séance
  (`createRichEdit` arrive en T7 ; termes cherchés au cadrage : `history`, `undoStack`, `snapshot`, `pending`,
  `selection` : seul `History` du cœur).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web test -- src/core/rich-text.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -60
```

Attendu : aucun `×` ; au moins 9 lignes `✓ rich-text : segments voulus et frappe ancrée (C7b) > …` dont
« editSpansAt : « aa », curseur au milieu : le milieu neuf est la deuxième lettre » ; les tests C7 du fichier verts.
`tsc` : seul l'écart nommé ci-dessous.

**Écart `tsc` nommé (attendu, levé par T6 et T8).** `TableCell.spans` exigé : `tsc` signale `spans` manquant dans
`src/core/fake-core.ts`, `src/core/wasm-core.ts`, `src/engine/table-geom.test.ts`,
`src/engine/render/table-paint.test.ts`, `src/engine/render/canvas2d.test.ts`, et rien d'autre. Contrôle :
`pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS" | cut -d'(' -f1 | sort -u`.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé, aucun seuil changé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm apps/web/src/` ;
  `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm-formats apps/web/src/`.
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle ; jamais GPL, LGPL ni AGPL.
- GC12 OD80 : `api.ts` : champs ajoutés en fin, aucune autre retouche.
- GC13 Périmètre : seuls les fichiers ci-dessus.
- GC14 `tsc` : seul l'écart nommé ci-dessus.
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.

**Interdits.** Ne pas modifier `editSpans` (C7, fausse liaison et outil Texte s'en servent) ; ne pas écrire
`createRichEdit` (T7) ; ne pas toucher `fake-core.ts`, `wasm-core.ts` ni les tests du moteur pour lever l'écart `tsc`.

**Critère « terminé ».** Commande bornée verte, écart `tsc` exactement celui nommé, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : test rouge.** Dans `apps/web/src/core/rich-text.test.ts`, compléter l'import :
  `import { cleanPatch, editSpans, editSpansAt, formatSpans, insertedRange, normalSpans, patched, plainSpans, sameSpans, spansText, spliceSpans, utf16Bounds, validColor, validFont, validPatch, validSpans } from "./rich-text";`
  et ajouter en fin de fichier :

```ts
describe("rich-text : segments voulus et frappe ancrée (C7b)", () => {
  const BOLD = { bold: true } as const;

  it("editSpansAt : « aa », curseur au milieu : le milieu neuf est la deuxième lettre (S1, R3)", () => {
    // Première lettre rouge, seconde sans attribut ; « a » tapé entre les deux, curseur relu en 2 après la frappe.
    const old: TextSpan[] = [{ text: "a", attrs: RED }, plain("a")];
    expect(editSpansAt(old, "aaa", 2)).toEqual([{ text: "aa", attrs: RED }, plain("a")]);
    expect(insertedRange("aa", "aaa", 2)).toEqual([1, 2]);
    // Patron écarté : le préfixe d'abord place le neuf en troisième, avec les attributs de la seconde.
    expect(editSpans(old, "aaa")).toEqual([{ text: "a", attrs: RED }, plain("aa")]);
  });

  it("editSpansAt : effacement au curseur ; insertion en tête sans attribut (T5)", () => {
    expect(editSpansAt([{ text: "ab", attrs: RED }, plain("c")], "ac", 1)).toEqual([{ text: "a", attrs: RED }, plain("c")]);
    expect(insertedRange("abc", "ac", 1)).toEqual([1, 1]);
    expect(editSpansAt([{ text: "chat", attrs: RED }], "Lchat", 1)).toEqual([plain("L"), { text: "chat", attrs: RED }]);
  });

  it("editSpansAt : curseur en unités UTF-16 (paire de substitution)", () => {
    expect(editSpansAt([plain("🐱")], "🐱🐱", 4)).toEqual([plain("🐱🐱")]);
    expect(insertedRange("🐱", "🐱🐱", 4)).toEqual([2, 4]);
    expect(insertedRange("ab", "aXb", 2)).toEqual([1, 2]);
  });

  it("spliceSpans : remplace une plage par un texte aux attributs donnés, voisins fusionnés (R12)", () => {
    expect(spliceSpans(redCat(), 3, 7, "chien", BOLD)).toEqual([plain("Le "), { text: "chien", attrs: BOLD }, plain(" noir")]);
    expect(spliceSpans(redCat(), 5, 5, "x", RB)).toEqual([plain("Le "), { text: "chxat", attrs: RB }, plain(" noir")]);
    expect(spliceSpans([plain("ab")], 0, 2, "", {})).toEqual([plain("")]);
  });

  it("spansText : concaténation", () => {
    expect(spansText(redCat())).toBe("Le chat noir");
    expect(spansText([])).toBe("");
  });

  it("validSpans : concaténation égale au contenu, valeurs du patch permises (R7)", () => {
    expect(validSpans("Le chat noir", redCat())).toBe(true);
    expect(validSpans("", [])).toBe(true);
    expect(validSpans("Le chat", redCat())).toBe(false);
    const one = (attrs: unknown): TextSpan[] => [{ text: "x", attrs } as TextSpan];
    expect(validSpans("x", one({ bold: false, color: null }))).toBe(true);
    for (const bad of [{ size: 0 }, { size: 1e39 }, { color: 5 }, { href: "y" }, { font: "a;b" }]) expect(validSpans("x", one(bad)), JSON.stringify(bad)).toBe(false);
    expect(validSpans("x", [null as unknown as TextSpan])).toBe(false);
    expect(validSpans("x", [{ text: "x" } as unknown as TextSpan])).toBe(false);
  });

  it("normalSpans : false et null retirés, size en f32, voisins égaux fusionnés, vides retirés (forme de read_spans)", () => {
    const raw = [plain("Le"), plain(" "), { text: "chat", attrs: { bold: false, size: 0.1 } }, { text: "", attrs: RED }] as unknown as TextSpan[];
    expect(normalSpans(raw)).toEqual([plain("Le "), { text: "chat", attrs: { size: Math.fround(0.1) } }]);
    expect(normalSpans([])).toEqual([plain("")]);
    expect(sameSpans(normalSpans(redCat()), redCat())).toBe(true);
  });

  it("patched : exporté ; false et null retirent, size arrondi en f32", () => {
    expect(patched({ bold: true }, { bold: null, color: "#ff0000" })).toEqual({ color: "#ff0000" });
    expect(patched({}, { size: 0.1 })).toEqual({ size: Math.fround(0.1) });
  });

  it("editSpansAt avec le curseur en fin : même résultat qu'editSpans pour un ajout en fin", () => {
    const next = "Le chat noir !";
    expect(editSpansAt(redCat(), next, next.length)).toEqual(editSpans(redCat(), next));
  });
});
```

- [ ] **Étape 3 : vérifier le rouge.** Lancer la commande bornée. Attendu : `FAIL` (exports absents :
  `editSpansAt is not a function` ou équivalent).

- [ ] **Étape 4 : code de `rich-text.ts`.** Changer `function patched(` (`:100`) en `export function patched(`, puis
  ajouter après `editSpans` (`:46`) :

```ts
/** Curseur `caret` (unités UTF-16 du nouveau contenu, borné au contenu) en points de code. */
const caretCodePoints = (content: string, caret: number): number => Array.from(content.slice(0, Math.min(Math.max(0, caret), content.length))).length;

/**
 * Plus long suffixe commun borné par le curseur (`s ≤ longueur − curseur`, en points de code), puis plus long préfixe
 * commun des restes (C7b, R3) : la différence ne passe jamais à gauche du curseur relu après la frappe. Rend [p, s].
 */
function anchoredEnds(old: readonly string[], fresh: readonly string[], caretCp: number): readonly [number, number] {
  const maxS = Math.min(old.length, fresh.length - caretCp);
  let s = 0;
  while (s < maxS && old[old.length - 1 - s] === fresh[fresh.length - 1 - s]) s++;
  const room = Math.min(old.length, fresh.length) - s;
  let p = 0;
  while (p < room && old[p] === fresh[p]) p++;
  return [p, s];
}

/**
 * Segments après une frappe relue du DOM (C7b, R3) : différence ancrée au curseur (`anchoredEnds`) ; le milieu neuf
 * prend les attributs du caractère qui le précède, aucun en tête (règle T5 du cœur). `caret` en unités UTF-16 du
 * nouveau contenu. Le cœur peut placer le même texte autrement : sans effet, l'état voulu envoyé fixe les attributs.
 */
export function editSpansAt(spans: readonly TextSpan[], content: string, caret: number): TextSpan[] {
  const old = charsOf(spans);
  const fresh = Array.from(content);
  const [p, s] = anchoredEnds(old.map((c) => c.ch), fresh, caretCodePoints(content, caret));
  const inherited: TextAttrs = p === 0 ? {} : (old[p - 1]?.attrs ?? {});
  const middle = fresh.slice(p, fresh.length - s).map((ch) => ({ ch, attrs: inherited }));
  return spansOf([...old.slice(0, p), ...middle, ...old.slice(old.length - s)]);
}

/** Milieu neuf d'`editSpansAt` dans le nouveau contenu, [début, fin) en unités UTF-16 (vide pour un effacement). */
export function insertedRange(old: string, content: string, caret: number): readonly [number, number] {
  const fresh = Array.from(content);
  const [p, s] = anchoredEnds(Array.from(old), fresh, caretCodePoints(content, caret));
  const start = fresh.slice(0, p).join("").length;
  return [start, start + fresh.slice(p, fresh.length - s).join("").length];
}
```

  En fin de fichier :

```ts
/** Concaténation des textes des segments. */
export const spansText = (spans: readonly TextSpan[]): string => spans.map((s) => s.text).join("");

/** `text` à la place de [start, end) (unités UTF-16, bornes vérifiées par l'appelant), avec les attributs `attrs`
 *  (collage, Entrée : C7b, R12). */
export function spliceSpans(spans: readonly TextSpan[], start: number, end: number, text: string, attrs: TextAttrs): TextSpan[] {
  let at = 0;
  const before: Char[] = [];
  const after: Char[] = [];
  for (const c of charsOf(spans)) {
    if (at < start) before.push(c);
    else if (at >= end) after.push(c);
    at += c.ch.length;
  }
  return spansOf([...before, ...Array.from(text, (ch) => ({ ch, attrs })), ...after]);
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** État voulu d'un SetText ou d'un SetTableCell (C7b, R7) : segments bien formés, concaténation égale au contenu,
 *  attributs aux valeurs permises (`validPatch` du patch nettoyé : même règle que la liaison puis le cœur). */
export function validSpans(content: string, spans: readonly TextSpan[]): boolean {
  return (
    spans.every((s: unknown) => isRecord(s) && typeof s["text"] === "string" && isRecord(s["attrs"])) &&
    spansText(spans) === content &&
    spans.every((s) => validPatch(cleanPatch(s.attrs)))
  );
}

/** Forme que rend la lecture d'un état voulu (`read_spans` du cœur) : false et null retirés, size en f32, voisins
 *  égaux fusionnés, segments vides retirés ; aucun caractère : un segment vide. */
export function normalSpans(spans: readonly TextSpan[]): TextSpan[] {
  return spansOf(spans.flatMap((s) => {
    const attrs = patched({}, cleanPatch(s.attrs));
    return Array.from(s.text, (ch) => ({ ch, attrs }));
  }));
}
```

- [ ] **Étape 5 : contrat `api.ts`.** En-tête, après la ligne `// C10a : …` (deux lignes), ajouter :
  `// C7b : SetText et SetTableCell gagnent spans (état voulu des segments, appliqué dans la même étape) ; TableCell.spans.`
  Dans `SetText`, après `readonly boxHeight: number;` :

```ts
      /** C7b (R7) : état voulu des segments (concaténation = content) ; absent : différence seule (C7). */
      readonly spans?: readonly TextSpan[];
```

  `SetTableCell` (`:94`) devient :

```ts
  /** row, col = ids ; rowHeight : hauteur exigée mesurée par la page, écrite si plus grande (T5) ; spans : C7b (R7). */
  | { readonly type: "SetTableCell"; readonly id: string; readonly row: string; readonly col: string; readonly content: string; readonly rowHeight?: number; readonly spans?: readonly TextSpan[] }
```

  `TableCell` (`:121`) devient :

```ts
/** Cellule non vide (texte ou remplissage) ; `fill` = remplissage (U32), null sans remplissage ; `spans` = segments du
 *  texte (C7b, R16), un segment sans attribut pour une cellule d'avant C7b. */
export interface TableCell { readonly row: string; readonly col: string; readonly text: string; readonly fill: string | null; readonly spans: readonly TextSpan[] }
```

- [ ] **Étape 6 : types de la séance.** Créer `apps/web/src/engine/rich-edit.ts` :

```ts
/**
 * Séance de saisie riche (C7b, DAR2, DAR3) : modèle pur des segments, de la sélection (unités UTF-16 du texte), du
 * format en attente au curseur (R9), de l'historique local (R10) et de l'état de la barre (R15). Aucun DOM :
 * `app/text-editor.ts` relit le DOM et appelle ce modèle, qui se teste en `node`. Types posés par T2 ; la fabrique
 * `createRichEdit` est écrite par T7.
 */
import type { TextAttrsPatch, TextSpan } from "../core/api";

/** Action de la barre ou d'un raccourci (R8) : bascule G, I, S ; une des tailles ; couleur, `null` = « Défaut ». */
export type FormatAction =
  | { readonly type: "bold" }
  | { readonly type: "italic" }
  | { readonly type: "underline" }
  | { readonly type: "size"; readonly size: number }
  | { readonly type: "color"; readonly color: string | null };

/** État de la barre (R15) : bascules vraies si toute la sélection porte l'attribut ; taille effective (attribut,
 *  sinon celle de l'élément) ; couleur `"default"` sans attribut ; `"mixed"` si la sélection mêle plusieurs valeurs. */
export interface FormatState {
  readonly bold: boolean;
  readonly italic: boolean;
  readonly underline: boolean;
  readonly size: number | "mixed";
  readonly color: string | "default" | "mixed";
}

/** Taille et couleur de l'élément (texte) ou du tableau (cellule) : les défauts des segments. */
export interface RichBase {
  readonly size: number;
  readonly color: string;
}

export interface RichEditState {
  readonly spans: readonly TextSpan[];
  /** Sélection en unités UTF-16 du texte, start ≤ end. */
  readonly start: number;
  readonly end: number;
  /** Format en attente au curseur (R9, PC10) ; null sans attente. */
  readonly pending: TextAttrsPatch | null;
}

export interface RichEdit {
  state(): RichEditState;
  text(): string;
  /** Frappe ou composition relues (R3) : texte du DOM et sélection d'après la frappe ; -1, -1 : curseur illisible
   *  (PC9). Vrai si les segments ont changé. */
  input(text: string, start: number, end: number): boolean;
  /** Sélection relue à `selectionchange` (R9) : différente de celle du modèle, elle oublie le format en attente. */
  select(start: number, end: number): void;
  /** Collage, Entrée (R12, R3) : `text` à la place de la sélection, attributs du caractère précédent plus l'attente ;
   *  une étape. */
  insert(text: string): void;
  /** Action sur la sélection (R8) ; curseur seul : format en attente, aucune étape (R9). Vrai si les segments ont
   *  changé. */
  format(a: FormatAction): boolean;
  formatState(): FormatState;
  /** Historique local de la séance (R10) ; faux s'il n'y a rien à annuler ou à rétablir. */
  undo(): boolean;
  redo(): boolean;
}
```

- [ ] **Étape 7 : vert.** Commande bornée : 0 `×`. Puis le contrôle `tsc` de l'écart nommé : la liste des fichiers en
  erreur est exactement les cinq nommés.

- [ ] **Étape 8 : commit.**

```bash
cd "$WT" && git add apps/web/src/core/rich-text.ts && git add apps/web/src/core/rich-text.test.ts && \
git add apps/web/src/core/api.ts && git add apps/web/src/engine/rich-edit.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): caret-anchored diff, wanted spans and rich session types" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Commande bornée et ses noms vus ; liste `tsc` (écart nommé) ; une ligne `Réutilisation :` par ligne
`Réutilise :`.

---

<a id="tache-t3"></a>

### Tâche T3 — Aller-retour DOM de la zone riche (`app/rich-dom.ts`)

**Objectif.** Module neuf, sans état, que la zone (T10) appelle : segments → DOM (un `<span>` par segment, style en
ligne, `<br data-rb-fin>` final si le texte finit par « \n », R4), DOM → texte (lecture robuste, R3, PC8), sélection en
unités UTF-16 lue et posée (R3), comparaison « le DOM est-il notre rendu ? » (redessin seulement s'il diffère).
Scénario S1.

**Fichiers.**
- Créer : `apps/web/src/app/rich-dom.ts`, `apps/web/src/app/rich-dom.test.ts`

**Interfaces.**
- Consomme : rien d'une autre tâche (`TextSpan`, `TextAttrs` de `core/api.ts`, `TEXT_ATTR_KEYS` de
  `core/rich-text.ts`, `styleOf`, `faceOf`, `TEXT_FONT_FAMILY` de `engine/text-layout.ts`, tous existants).
- Produit :

```ts
// app/rich-dom.ts
export const END_BR = "data-rb-fin";
export interface DomBase { readonly size: number }
export interface DomSelection { readonly start: number; readonly end: number }
export const attrsKey: (a: TextAttrs) => string;
export function renderSpans(root: HTMLElement, spans: readonly TextSpan[], base: DomBase): void;
export function sameRender(root: HTMLElement, spans: readonly TextSpan[]): boolean;
export function readText(root: Node): string;
export function readSelection(root: HTMLElement): DomSelection | null;
export function setSelection(root: HTMLElement, start: number, end: number): void;
```
- Réutilise : `apps/web/src/engine/text-layout.ts:23`, `:71`, `:83` — `styleOf(attrs, base)`, `faceOf(style)` (gras,
  italique, police d'un segment) ; `textFont` reste à la zone (T10).
- Réutilise : aucun module existant (nouveau module) — `apps/web/src/app/rich-dom.ts` : `renderSpans`, `readText`,
  `readSelection`, `setSelection` (termes cherchés au cadrage : `getSelection`, `createRange`, `selectionchange`,
  `contenteditable` : rien).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web test -- src/app/rich-dom.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -40
```

Attendu : aucun `×` ; au moins 8 lignes `✓ segments ↔ DOM (C7b) > …` dont « lecture robuste : <br> et blocs du
navigateur, br de fin et ligne vide jamais lus ». `tsc` vide.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé, aucun seuil changé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm apps/web/src/` ;
  `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm-formats apps/web/src/`.
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle ; jamais GPL, LGPL ni AGPL.
- GC13 Périmètre : seuls les deux fichiers ci-dessus.
- GC14 `tsc` vide.
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.

**Interdits.** Aucun `execCommand`, aucun `innerHTML` dans `rich-dom.ts` (le test peut en poser pour simuler le
navigateur) ; aucun état de module ; ne pas toucher `text-editor.ts` (T10).

**Critère « terminé ».** Commande bornée verte, `tsc` vide, un commit. Si happy-dom (21.0.4) manque `Range.cloneContents`,
`Selection.setBaseAndExtent` ou `createTreeWalker` (HC7b-10), le rapport le dit en tête avec le message d'erreur exact,
et la tâche s'arrête (pas de faux DOM écrit à la main).

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : test rouge.** Créer `apps/web/src/app/rich-dom.test.ts` :

```ts
// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import type { TextSpan } from "../core/api";
import { attrsKey, END_BR, readSelection, readText, renderSpans, sameRender, setSelection } from "./rich-dom";

const plain = (text: string): TextSpan => ({ text, attrs: {} });
const BASE = { size: 36 };
const roots: HTMLElement[] = [];
function root(): HTMLElement {
  const r = document.createElement("div");
  r.contentEditable = "true";
  document.body.append(r);
  roots.push(r);
  return r;
}
afterEach(() => {
  for (const r of roots.splice(0)) r.remove();
  document.getSelection()?.removeAllRanges();
});

describe("segments ↔ DOM (C7b)", () => {
  it("renderSpans : un span par segment non vide, style en ligne tiré des attributs (R4)", () => {
    const r = root();
    renderSpans(r, [plain("Le "), { text: "chat", attrs: { bold: true, color: "#dc2626" } }, { text: " noir", attrs: { italic: true, underline: true, size: 48, font: "Georgia" } }, plain("")], BASE);
    const spans = [...r.querySelectorAll("span")];
    expect(spans.map((s) => s.textContent)).toEqual(["Le ", "chat", " noir"]);
    expect(spans[0]!.style.fontSize).toBe("36px");
    expect(spans[1]!.style.fontWeight).toBe("bold");
    expect(spans[1]!.style.color).toMatch(/#dc2626|rgb\(220, 38, 38\)/);
    expect([spans[2]!.style.fontStyle, spans[2]!.style.textDecoration, spans[2]!.style.fontSize]).toEqual(["italic", "underline", "48px"]);
    expect(spans[2]!.style.fontFamily).toContain("Georgia");
    expect(spans[0]!.getAttribute("data-rb-attrs")).toBe(attrsKey({}));
  });

  it("texte qui finit par « \\n » : <br data-rb-fin> final, jamais lu (R4, R3)", () => {
    const r = root();
    renderSpans(r, [plain("ab\n")], BASE);
    expect(r.lastElementChild?.tagName).toBe("BR");
    expect(r.lastElementChild?.hasAttribute(END_BR)).toBe(true);
    expect(readText(r)).toBe("ab\n");
  });

  it("sameRender : vrai juste après le rendu ; faux si le navigateur a ajouté un nœud, changé un texte ou un bloc", () => {
    const r = root();
    const spans = [plain("Le "), { text: "chat", attrs: { bold: true } }];
    renderSpans(r, spans, BASE);
    expect(sameRender(r, spans)).toBe(true);
    r.append(document.createTextNode("x"));
    expect(sameRender(r, spans)).toBe(false);
    renderSpans(r, spans, BASE);
    r.querySelector("span")!.firstChild!.nodeValue = "La ";
    expect(sameRender(r, spans)).toBe(false);
    renderSpans(r, spans, BASE);
    expect(sameRender(r, [plain("Le "), { text: "chat", attrs: { italic: true } }])).toBe(false);
  });

  it("attrsKey : même clé pour les mêmes attributs, quel que soit l'ordre des clés", () => {
    expect(attrsKey({ bold: true, color: "#f00" })).toBe(attrsKey({ color: "#f00", bold: true }));
    expect(attrsKey({ bold: true })).not.toBe(attrsKey({}));
  });

  it("lecture robuste : <br> et blocs du navigateur, br de fin et ligne vide jamais lus (R3, PC8)", () => {
    const r = root();
    const read = (html: string): string => {
      r.innerHTML = html;
      return readText(r);
    };
    expect(read("a<br>b")).toBe("a\nb");
    expect(read("a<div>b</div>")).toBe("a\nb");
    expect(read("<div>a</div><div>b</div>")).toBe("a\nb");
    expect(read("a<div><br></div>")).toBe("a\n");
    expect(read("<div><br></div><div>x</div>")).toBe("\nx");
    expect(read('<span>ab\n</span><br data-rb-fin="">')).toBe("ab\n");
    expect(read("<div>a</div>b")).toBe("a\nb");
  });

  it("setSelection puis readSelection : positions UTF-16 du texte rendu ; fin après « \\n » : devant le br de fin", () => {
    const r = root();
    renderSpans(r, [plain("Le "), { text: "chat", attrs: { bold: true } }, plain("\n")], BASE);
    setSelection(r, 3, 7);
    expect(readSelection(r)).toEqual({ start: 3, end: 7 });
    expect(String(document.getSelection())).toBe("chat");
    setSelection(r, 8, 8);
    expect(readSelection(r)).toEqual({ start: 8, end: 8 });
    expect(document.getSelection()?.anchorNode).toBe(r);
  });

  it("readSelection : paire de substitution comptée 2 ; sélection hors de la zone : null", () => {
    const r = root();
    renderSpans(r, [plain("🐱a")], BASE);
    setSelection(r, 2, 2);
    expect(readSelection(r)).toEqual({ start: 2, end: 2 });
    const other = root();
    other.textContent = "dehors";
    document.getSelection()?.setBaseAndExtent(other.firstChild!, 1, other.firstChild!, 2);
    expect(readSelection(r)).toBeNull();
  });

  it("readSelection sur un DOM du navigateur (blocs) : curseur au début du second bloc = 2", () => {
    const r = root();
    r.innerHTML = "<div>a</div><div>b</div>";
    const b = r.querySelectorAll("div")[1]!.firstChild!;
    document.getSelection()?.setBaseAndExtent(b, 0, b, 0);
    expect(readSelection(r)).toEqual({ start: 2, end: 2 });
  });
});
```

- [ ] **Étape 3 : vérifier le rouge.** Commande bornée : `FAIL` (module `./rich-dom` introuvable).

- [ ] **Étape 4 : code.** Créer `apps/web/src/app/rich-dom.ts` :

```ts
/**
 * Aller-retour segments ↔ DOM de la zone de saisie riche (C7b, R3, R4, DAR2). Rendu : un `<span>` par segment non vide,
 * style en ligne tiré des attributs (taille en unités monde, gras, italique, souligné, couleur, police), puis un
 * `<br data-rb-fin>` si le texte finit par « \n » (le curseur tient sur la dernière ligne vide). Lecture robuste : un
 * `<br>` ou une frontière de bloc insérés par le navigateur valent « \n » ; le `<br data-rb-fin>` et le `<br>` qui
 * finit seul un bloc (marque de ligne vide) ne sont jamais lus (PC8). Sélection en unités UTF-16 du texte lu. Sans état.
 */
import type { TextAttrs, TextSpan } from "../core/api";
import { TEXT_ATTR_KEYS } from "../core/rich-text";
import { faceOf, styleOf, TEXT_FONT_FAMILY } from "../engine/text-layout";

export const END_BR = "data-rb-fin";
const ATTRS = "data-rb-attrs";
const BLOCKS: ReadonlySet<string> = new Set(["DIV", "P", "LI"]);
const TEXT_NODE = 3;
const ELEMENT_NODE = 1;
/** `NodeFilter.SHOW_TEXT`. */
const SHOW_TEXT = 4;

/** Taille de l'élément ou du tableau : celle d'un segment sans `size`. */
export interface DomBase {
  readonly size: number;
}
export interface DomSelection {
  readonly start: number;
  readonly end: number;
}

/** Clé stable des attributs (ordre de `TEXT_ATTR_KEYS`) : deux objets égaux ont la même clé. */
export const attrsKey = (a: TextAttrs): string => JSON.stringify(TEXT_ATTR_KEYS.map((k) => a[k] ?? null));

const textOf = (spans: readonly TextSpan[]): string => spans.map((s) => s.text).join("");

export function renderSpans(root: HTMLElement, spans: readonly TextSpan[], base: DomBase): void {
  const doc = root.ownerDocument;
  const nodes: Node[] = [];
  for (const s of spans) {
    if (s.text === "") continue;
    const el = doc.createElement("span");
    const st = styleOf(s.attrs, base);
    const face = faceOf(st);
    el.style.fontSize = `${st.size}px`;
    if (face?.bold) el.style.fontWeight = "bold";
    if (face?.italic) el.style.fontStyle = "italic";
    if (face?.font !== undefined) el.style.fontFamily = `"${face.font}", ${TEXT_FONT_FAMILY}`;
    if (st.underline) el.style.textDecoration = "underline";
    if (st.color !== null) el.style.color = st.color;
    el.setAttribute(ATTRS, attrsKey(s.attrs));
    el.textContent = s.text;
    nodes.push(el);
  }
  if (textOf(spans).endsWith("\n")) {
    const br = doc.createElement("br");
    br.setAttribute(END_BR, "");
    nodes.push(br);
  }
  root.replaceChildren(...nodes);
}

/** Vrai si le DOM de `root` est exactement le rendu de `spans` : sinon la zone redessine (R3). */
export function sameRender(root: HTMLElement, spans: readonly TextSpan[]): boolean {
  const want = spans.filter((s) => s.text !== "");
  const end = textOf(spans).endsWith("\n");
  const kids = Array.from(root.childNodes);
  if (kids.length !== want.length + (end ? 1 : 0)) return false;
  const spansOk = want.every((s, i) => {
    const k = kids[i];
    return (
      k !== undefined &&
      k.nodeName === "SPAN" &&
      (k as Element).getAttribute(ATTRS) === attrsKey(s.attrs) &&
      k.childNodes.length === 1 &&
      k.firstChild?.nodeType === TEXT_NODE &&
      k.textContent === s.text
    );
  });
  const last = kids[kids.length - 1];
  return spansOk && (!end || (last !== undefined && last.nodeName === "BR" && (last as Element).hasAttribute(END_BR)));
}

/** Texte du DOM (R3, PC8) : nœuds texte ; `<br>` = « \n » ; entrée dans un bloc = « \n » si un bloc vient de se
 *  fermer, ou si du texte précède sans finir par « \n ». */
export function readText(root: Node): string {
  let out = "";
  let closed = false;
  const emit = (s: string): void => {
    if (closed) out += "\n";
    closed = false;
    out += s;
  };
  const walk = (n: Node): void => {
    const kids = Array.from(n.childNodes);
    kids.forEach((c, i) => {
      if (c.nodeType === TEXT_NODE) {
        const v = c.nodeValue ?? "";
        if (v !== "") emit(v);
      } else if (c.nodeName === "BR") {
        const lineMark = BLOCKS.has(n.nodeName) && i === kids.length - 1;
        if (!(c as Element).hasAttribute(END_BR) && !lineMark) emit("\n");
      } else if (c.nodeType === ELEMENT_NODE) {
        const block = BLOCKS.has(c.nodeName);
        if (block) {
          if (closed || (out !== "" && !out.endsWith("\n"))) out += "\n";
          closed = false;
        }
        walk(c);
        if (block) closed = true;
      }
    });
  };
  walk(root);
  return out;
}

/** Position UTF-16, dans le texte lu, d'une borne DOM ; null hors de `root`. */
function offsetOf(root: HTMLElement, node: Node, offset: number): number | null {
  if (node !== root && !root.contains(node)) return null;
  const r = root.ownerDocument.createRange();
  r.setStart(root, 0);
  r.setEnd(node, offset);
  return readText(r.cloneContents()).length;
}

export function readSelection(root: HTMLElement): DomSelection | null {
  const sel = root.ownerDocument.getSelection();
  if (sel === null || sel.rangeCount === 0 || sel.anchorNode === null || sel.focusNode === null) return null;
  const a = offsetOf(root, sel.anchorNode, sel.anchorOffset);
  const f = offsetOf(root, sel.focusNode, sel.focusOffset);
  if (a === null || f === null) return null;
  return { start: Math.min(a, f), end: Math.max(a, f) };
}

/** Borne DOM de la position UTF-16 `at` d'un texte rendu par `renderSpans` : dans le premier nœud texte qui la
 *  contient ; en fin d'un texte qui finit par « \n », devant le `<br data-rb-fin>`. */
function pointAt(root: HTMLElement, at: number): { readonly node: Node; readonly offset: number } {
  const kids = Array.from(root.childNodes);
  const last = kids[kids.length - 1];
  if (at >= readText(root).length && last?.nodeName === "BR" && (last as Element).hasAttribute(END_BR)) {
    return { node: root, offset: kids.length - 1 };
  }
  let pos = 0;
  const walker = root.ownerDocument.createTreeWalker(root, SHOW_TEXT);
  for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
    const len = (n.nodeValue ?? "").length;
    if (at <= pos + len) return { node: n, offset: Math.max(0, at - pos) };
    pos += len;
  }
  return { node: root, offset: kids.length };
}

export function setSelection(root: HTMLElement, start: number, end: number): void {
  const sel = root.ownerDocument.getSelection();
  if (sel === null) return;
  const a = pointAt(root, start);
  const b = pointAt(root, end);
  sel.setBaseAndExtent(a.node, a.offset, b.node, b.offset);
}
```

- [ ] **Étape 5 : vert.** Commande bornée : 0 `×` ; `tsc` vide (GC14).

- [ ] **Étape 6 : commit.**

```bash
cd "$WT" && git add apps/web/src/app/rich-dom.ts && git add apps/web/src/app/rich-dom.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): spans to DOM round trip with UTF-16 selection" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Commande bornée et ses noms vus ; tout manque de happy-dom en tête ; une ligne `Réutilisation :` par
ligne `Réutilise :`.

---

<a id="tache-t4"></a>

### Tâche T4 — `coqueCsp` partagée par les essais (R22)

**Objectif.** Une seule copie de la lecture de la CSP de la coque : `coqueCsp()` exportée de
`scripts/essais/commun.mjs`, importée par les quatre essais qui la recopiaient (`c2-image`, `c9-grille`, `fichiers`,
`c10a-tableau`) et par l'essai neuf de T14. Ferme le constat ouvert du 2026-11-20 (`c10a-tableau-navigateur.mjs:27`,
« trois copies » : il y en avait quatre). Scénario S1 (l'essai C7b sert la CSP de la coque).

**Fichiers.**
- Modifier : `scripts/essais/commun.mjs:3` (import), fin de fichier (`coqueCsp`) ; `scripts/essais/c2-image-navigateur.mjs:9`,
  `:14`, `:24-29` ; `scripts/essais/c9-grille-navigateur.mjs:7`, `:11`, `:18-23` ; `scripts/essais/fichiers-navigateur.mjs:13`,
  `:17`, `:24-29` ; `scripts/essais/c10a-tableau-navigateur.mjs:11`, `:15`, `:26-31` ; `scripts/verifier.sh:27`
- Créer : `scripts/tests/coque-csp.test.sh`

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit : `export function coqueCsp(): string` dans `scripts/essais/commun.mjs` (directives de
  `apps/desktop/src-tauri/tauri.conf.json` → `"<directive> <valeurs>; …"`, même texte que les copies retirées).
- Réutilise : `scripts/essais/commun.mjs:25-148` — `loadPlaywright`, `serve`, `ROOT` ; étendu par `coqueCsp` exportée
  (R22).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
bash scripts/tests/coque-csp.test.sh 2>&1 | tail -5 && \
pnpm --filter @roomboard/web build 2>&1 | tail -3 && \
for s in c2-image c9-grille fichiers c10a-tableau; do node scripts/essais/$s-navigateur.mjs 2>&1 | grep -E ": OK|ÉCHEC|outil absent" | tail -2; done
```

Attendu : « coque-csp.test.sh : OK » ; « C2 image : OK », « C9 grille : OK », « Fichiers lot 5a : OK (… modes) »,
« C10a tableau : OK » ; aucun « ÉCHEC ».

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé, aucun délai changé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm apps/web/src/` ;
  `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm-formats apps/web/src/`.
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite les lignes « : OK » vues.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle.
- GC12 OD80 : dans `c10a-tableau-navigateur.mjs`, seulement l'import et le retrait de la copie.
- GC13 Périmètre : seuls les fichiers ci-dessus.
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.

**Interdits.** Ne changer aucune vérification des essais ; ne pas toucher le bloc `--e2e` de `verifier.sh` (T14) ; ne
pas lancer `scripts/verifier.sh --e2e`.

**Critère « terminé ».** Commande bornée verte, `grep -l "function coqueCsp" scripts/essais/*.mjs` ne rend que
`commun.mjs`, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : test rouge.** Créer `scripts/tests/coque-csp.test.sh` (exécutable, `chmod +x`) :

```bash
#!/usr/bin/env bash
# Test de coqueCsp (C7b, R22) : exportée par scripts/essais/commun.mjs, CSP de la coque, une seule copie dans
# scripts/essais.
set -uo pipefail
cd "$(dirname "$0")/../.."
fail=0
ko() { echo "ECHEC : $1" >&2; fail=1; }
csp=$(node --input-type=module -e 'import { coqueCsp } from "./scripts/essais/commun.mjs"; console.log(coqueCsp());' 2>&1) || ko "coqueCsp non exportée : $csp"
echo "$csp" | grep -q "style-src 'self' 'unsafe-inline'" || ko "style-src de la coque absent : $csp"
echo "$csp" | grep -q "script-src 'self' 'wasm-unsafe-eval'" || ko "script-src de la coque absent : $csp"
n=$(grep -l "function coqueCsp" scripts/essais/*.mjs | wc -l)
[ "$n" -eq 1 ] || ko "coqueCsp définie dans $n fichiers (une seule copie attendue, commun.mjs)"
[ "$fail" -eq 0 ] && echo "coque-csp.test.sh : OK"
exit "$fail"
```

- [ ] **Étape 3 : vérifier le rouge.** `bash scripts/tests/coque-csp.test.sh` : « ECHEC : coqueCsp non exportée » et
  « définie dans 4 fichiers ».

- [ ] **Étape 4 : code.** Dans `commun.mjs`, l'import `:3` devient
  `import { existsSync, readdirSync, readFileSync } from "node:fs";` ; en fin de fichier :

```js
/** CSP de la coque (`apps/desktop/src-tauri/tauri.conf.json`), envoyée telle quelle par le serveur d'essai (R22) : un
 *  défaut de CSP se voit dans l'essai. Seule copie : les essais l'importent. */
export function coqueCsp() {
  const conf = JSON.parse(readFileSync(join(ROOT, "apps", "desktop", "src-tauri", "tauri.conf.json"), "utf8"));
  const csp = conf.app.security.csp;
  return Object.entries(csp).map(([d, v]) => `${d} ${Array.isArray(v) ? v.join(" ") : v}`).join("; ");
}
```

  Dans chacun des quatre essais : supprimer la fonction `coqueCsp` locale et son commentaire, ajouter `coqueCsp` à
  l'import de `./commun.mjs`, et retirer `readFileSync` de l'import `node:fs` (seule utilisation, vérifiée par
  `grep -n readFileSync <fichier>` après la suppression : aucune ligne). Imports attendus :
  - `c2-image-navigateur.mjs` : `import { existsSync } from "node:fs";` et
    `import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, dropFile, frames, gitSha, inkIn, item, loadPlaywright, serve, stageMouse } from "./commun.mjs";`
  - `c9-grille-navigateur.mjs` : `import { existsSync } from "node:fs";` et
    `import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, frames, gitSha, item, loadPlaywright, serve, stageBox } from "./commun.mjs";`
  - `fichiers-navigateur.mjs` : `import { existsSync } from "node:fs";` et
    `import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, frames as framesOf, gitSha, inkIn, loadPlaywright, serve, stageMouse } from "./commun.mjs";`
  - `c10a-tableau-navigateur.mjs` : `import { existsSync } from "node:fs";` et
    `import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, frames, gitSha, item, loadPlaywright, serve, stageBox, stageMouse } from "./commun.mjs";`

  `ROOT` et `join` restent importés là où le fichier s'en sert encore (`grep -n "ROOT\|join(" <fichier>`) ; sinon les
  retirer de l'import. Dans `verifier.sh`, après `bash scripts/tests/controle-icones.test.sh` (`:27`), ajouter
  `bash scripts/tests/coque-csp.test.sh`.

- [ ] **Étape 5 : vert.** Lancer la commande bornée de la section (build de l'application puis les quatre essais).

- [ ] **Étape 6 : commit.**

```bash
cd "$WT" && git add scripts/essais/commun.mjs && git add scripts/essais/c2-image-navigateur.mjs && \
git add scripts/essais/c9-grille-navigateur.mjs && git add scripts/essais/fichiers-navigateur.mjs && \
git add scripts/essais/c10a-tableau-navigateur.mjs && git add scripts/tests/coque-csp.test.sh && git add scripts/verifier.sh && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "test(essais): share coqueCsp from commun.mjs" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Lignes « : OK » vues ; constat `coqueCsp` fermé (quatre copies retirées) ; une ligne `Réutilisation :`.

---

<a id="tache-t5"></a>

### Tâche T5 — Cœur : cellules riches (`SetTableCell.spans`, `TableCellView.spans`, mesure R23 a)

**Objectif.** `TableCellView` gagne `spans` (lu par `read_spans`, R16) ; `SetTableCell` gagne `spans` facultatif (R7) :
contrôlé d'abord, sortie « inchangé » étendue aux segments, alignement dans la même transaction que la différence ou
la création de la cellule (cellule absente ou sans `text` : `TextRef` relu après l'insertion). Mesure R23 a (première
écriture concurrente dans une cellule absente : une seule reste) et R23 b (cellule existante). Scénario S6.

**Fichiers.**
- Modifier : `crates/roomboard-core/src/commands.rs:117-123` (`SetTableCell`), `:554-560` (bras) ;
  `crates/roomboard-core/src/table.rs:20` (import), `:41-46` (`TableCellView`), `:190-210` (`view`), `:284-303`
  (`insert_cell` rend la cellule), `:389-433` (`cmd_set_table_cell`), `:700-720` et `:1298` (vues littérales des tests),
  `:903` (`set` des tests) ; `crates/roomboard-core/src/rich_text.rs` (après `apply_spans`) ;
  `crates/roomboard-core/tests/tableau.rs:61` ; `crates/roomboard-wasm/src/lib.rs` (`set_table_cell_inner`)
- Tests : `crates/roomboard-core/tests/texte_riche.rs` (ajouts), `crates/roomboard-core/tests/tableau.rs` (un test neuf)

**Interfaces.**
- Consomme (T1) : `SpanInput`, `valid_spans(content, spans)`, `spans_differ(txn, text, spans)`,
  `apply_spans(txn, text, spans)` ; dans `tests/texte_riche.rs` : `none()`, `bold()`, `italic()`, `sp()`, `view()`,
  `twins()`, `merged()`.
- Produit :

```rust
// crates/roomboard-core/src/rich_text.rs
pub(crate) fn cell_spans<T: ReadTxn>(txn: &T, text: Option<&TextRef>) -> Vec<TextSpanView>; // sans Y.Text : un segment vide
pub(crate) fn spans_unchanged<T: ReadTxn>(txn: &T, text: Option<&TextRef>, spans: Option<&[SpanInput]>) -> bool;
// crates/roomboard-core/src/table.rs
pub struct TableCellView { pub row: String, pub col: String, pub text: String, pub fill: Option<String>, pub spans: Vec<TextSpanView> }
pub(crate) fn cmd_set_table_cell(&mut self, id: &str, cell: (&str, &str), content: &str, row_height: Option<f64>, spans: Option<&[SpanInput]>) -> Result<Change, CommandError>;
// crates/roomboard-core/src/commands.rs
Command::SetTableCell { id, row, col, content, row_height, spans: Option<Vec<SpanInput>> }
```
- Réutilise : `crates/roomboard-core/src/rich_text.rs:200` — `read_spans(txn, text) -> Vec<TextSpanView>` (vue des
  segments d'une cellule, par `cell_spans`).
- Réutilise : `crates/roomboard-core/src/table.rs:389` (`cmd_set_table_cell`) — `SetTableCell` étendu de `spans` (R7,
  R16) ; `rich_text::valid_spans`, `apply_spans` de T1 (même alignement que `SetText`).
- Réutilise : `crates/roomboard-core/src/rich_text.rs:254`, `:175` — `apply_text_diff` (inchangé, avant
  l'alignement) ; comparaison normalisée par `spans_differ` (T1), jamais `format_changes`.
- Réutilise : `crates/roomboard-core/src/commands.rs:2388-2393`, `document.rs:356` — échange de mises à jour par
  `twins` et `merged` de `tests/texte_riche.rs` (T1) pour R23 a et b.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
cargo test -p roomboard-core 2>&1 | grep -E "^test .*(cell|concurrent|table_fixture|rich)|test result|FAILED|panicked|error\[" | tail -70 ; \
cargo test -p roomboard-wasm 2>&1 | grep -E "test result|FAILED|error\[" | tail -5
```

Attendu : aucun `FAILED` ; lignes `ok` pour `cell_view_has_spans`, `set_cell_with_spans_formats_in_one_step`,
`absent_cell_with_spans_is_created_formatted`, `set_cell_format_only_is_written`, `set_cell_same_spans_is_unchanged`,
`set_cell_bad_spans_is_bad_format_first`, `set_cell_without_spans_inherits`,
`concurrent_first_writes_in_an_absent_cell_keep_one`, `concurrent_formats_of_two_words_in_a_cell_both_stay`,
`rich_cell_round_trips` (≥ 7 noms cellule C7b) ; `table_fixture_resaves_identically`,
`set_cell_growing_its_row_is_one_undo_step` et les tests T1 verts ; `roomboard-wasm` : `test result: ok`.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`#[ignore]`), aucun seuil changé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `[ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/target .`.
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle ; jamais GPL, LGPL ni AGPL.
- GC9 Format : aucun champ neuf dans `document.ybin` ; `SetTableCell` sans `spans` = comportement de C10a ; une
  commande n'insère que la clé qu'elle change (`text`), jamais de réécriture d'une cellule en bloc.
- GC10 `crates/` sans dépendance au navigateur.
- GC12 OD80 : `table.rs` et `commands.rs` sont aussi touchés par C10b : champ en fin de `TableCellView`, une ligne dans
  `view`, l'alignement par un appel à `rich_text`, `insert_cell` rend sa valeur ; la logique neuve vit dans
  `rich_text.rs`.
- GC13 Périmètre : seuls les fichiers ci-dessus.
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.
- GC16 `cargo fmt --all` puis `cargo clippy -p roomboard-core --all-targets -- -D warnings` et
  `cargo clippy -p roomboard-wasm --all-targets -- -D warnings`.
- GC17 OD71 : R23 a affirme la perte mesurée (une écriture sur deux) sans la corriger ; aucune cellule précréée, aucune
  clé par client ; le résultat va au rapport.

**Interdits.** Aucun changement de `insert_cell` autre que sa valeur de retour ; aucun changement de `cmd_add_table`,
des lignes, des tailles, du remplissage ; dans `lib.rs`, seulement `spans: None` (la liaison est T12).

**Critère « terminé ».** Commande bornée verte, clippy sans avertissement, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges.** En fin de `crates/roomboard-core/tests/texte_riche.rs`, ajouter :

```rust
// C7b (T5) : cellules riches.

/// Tableau 2 × 2 sur une page : (document, id, ids des lignes, ids des colonnes).
fn table_doc() -> (Document, String, Vec<String>, Vec<String>) {
    let mut d = Document::blank();
    let page = d.page_ids()[0].clone();
    let id = d
        .apply(Command::AddTable {
            page,
            x: 100.0,
            y: 200.0,
            cols: 2,
            rows: 2,
            col_width: 240.0,
            row_height: 64.0,
            color: "#000000".into(),
            size: 36.0,
        })
        .expect("tableau")
        .ids[0]
        .clone();
    let t = d.element(&id).and_then(|e| e.table).expect("vue");
    let rows = t.rows.iter().map(|r| r.id.clone()).collect();
    let cols = t.cols.iter().map(|c| c.id.clone()).collect();
    (d, id, rows, cols)
}

fn set_cell(id: &str, row: &str, col: &str, content: &str, spans: Option<Vec<SpanInput>>) -> Command {
    Command::SetTableCell {
        id: id.into(),
        row: row.into(),
        col: col.into(),
        content: content.into(),
        row_height: None,
        spans,
    }
}

/// Segments de la cellule (row, col) ; cellule absente de la vue : aucun.
fn cell_spans(d: &Document, id: &str, row: &str, col: &str) -> Vec<TextSpanView> {
    let t = d.element(id).and_then(|e| e.table).expect("vue");
    t.cells
        .into_iter()
        .find(|c| c.row == row && c.col == col)
        .map(|c| c.spans)
        .unwrap_or_default()
}

/// R16 : la vue d'une cellule porte ses segments ; remplissage seul : un segment vide.
#[test]
fn cell_view_has_spans() {
    let (mut d, id, rows, cols) = table_doc();
    d.apply(set_cell(&id, &rows[0], &cols[0], "Lundi", None)).expect("texte");
    d.apply(Command::SetTableFill { id: id.clone(), row: rows[1].clone(), col: cols[1].clone(), fill: Some("#fef08a".into()) })
        .expect("remplissage");
    assert_eq!(cell_spans(&d, &id, &rows[0], &cols[0]), vec![view("Lundi", none())]);
    assert_eq!(cell_spans(&d, &id, &rows[1], &cols[1]), vec![view("", none())]);
}

/// S1, R7 : cellule existante, texte changé et mis en forme en une seule `SetTableCell` : une étape.
#[test]
fn set_cell_with_spans_formats_in_one_step() {
    let (mut d, id, rows, cols) = table_doc();
    d.apply(set_cell(&id, &rows[0], &cols[0], "aa", None)).expect("aa");
    d.apply(set_cell(&id, &rows[0], &cols[0], "aaaTotal", Some(vec![sp("a", none()), sp("a", bold()), sp("a", none()), sp("Total", bold())])))
        .expect("riche");
    assert_eq!(
        cell_spans(&d, &id, &rows[0], &cols[0]),
        vec![view("a", none()), view("a", bold()), view("a", none()), view("Total", bold())]
    );
    assert!(d.undo());
    assert_eq!(cell_spans(&d, &id, &rows[0], &cols[0]), vec![view("aa", none())]);
}

/// R7, R16 : cellule absente : créée et mise en forme dans la même transaction (`TextRef` relu) ; annuler la retire.
#[test]
fn absent_cell_with_spans_is_created_formatted() {
    let (mut d, id, rows, cols) = table_doc();
    d.apply(set_cell(&id, &rows[1], &cols[0], "Total", Some(vec![sp("Total", bold())]))).expect("neuve");
    assert_eq!(cell_spans(&d, &id, &rows[1], &cols[0]), vec![view("Total", bold())]);
    assert!(d.undo());
    assert!(cell_spans(&d, &id, &rows[1], &cols[0]).is_empty());
}

/// S6 (R6, R7) : cellule « Total » existante, italique seule : écrite (jamais « inchangé »), une étape.
#[test]
fn set_cell_format_only_is_written() {
    let (mut d, id, rows, cols) = table_doc();
    d.apply(set_cell(&id, &rows[0], &cols[0], "Total", None)).expect("Total");
    let v = d.version();
    d.apply(set_cell(&id, &rows[0], &cols[0], "Total", Some(vec![sp("Total", italic())]))).expect("italique");
    assert!(d.version() > v);
    assert_eq!(cell_spans(&d, &id, &rows[0], &cols[0]), vec![view("Total", italic())]);
    assert!(d.undo());
    assert_eq!(cell_spans(&d, &id, &rows[0], &cols[0]), vec![view("Total", none())]);
}

/// D38 : mêmes texte et segments : aucune transaction ; cellule absente et contenu vide avec segments : aucune.
#[test]
fn set_cell_same_spans_is_unchanged() {
    let (mut d, id, rows, cols) = table_doc();
    d.apply(set_cell(&id, &rows[0], &cols[0], "Total", Some(vec![sp("Total", bold())]))).expect("gras");
    let v = d.version();
    d.apply(set_cell(&id, &rows[0], &cols[0], "Total", Some(vec![sp("To", bold()), sp("tal", bold())]))).expect("même");
    d.apply(set_cell(&id, &rows[1], &cols[1], "", Some(vec![sp("", bold())]))).expect("vide");
    assert_eq!(d.version(), v);
}

/// R7 (PC2) : segments contrôlés d'abord : `BadFormat` avant la hauteur invalide et le tableau inconnu.
#[test]
fn set_cell_bad_spans_is_bad_format_first() {
    let (mut d, id, rows, cols) = table_doc();
    let v = d.version();
    let bad = vec![sp("Tota", none())];
    assert_eq!(d.apply(set_cell(&id, &rows[0], &cols[0], "Total", Some(bad.clone()))), Err(CommandError::BadFormat));
    assert_eq!(d.apply(set_cell("absent", &rows[0], &cols[0], "Total", Some(bad.clone()))), Err(CommandError::BadFormat));
    let mut high = set_cell(&id, &rows[0], &cols[0], "Total", Some(bad));
    if let Command::SetTableCell { row_height, .. } = &mut high {
        *row_height = Some(f64::NAN);
    }
    assert_eq!(d.apply(high), Err(CommandError::BadFormat));
    assert_eq!(d.version(), v);
}

/// C10a, C7 T5 : `SetTableCell` sans segments garde la différence avec héritage du caractère précédent.
#[test]
fn set_cell_without_spans_inherits() {
    let (mut d, id, rows, cols) = table_doc();
    d.apply(set_cell(&id, &rows[0], &cols[0], "Total", Some(vec![sp("Total", bold())]))).expect("gras");
    d.apply(set_cell(&id, &rows[0], &cols[0], "Totals", None)).expect("s");
    assert_eq!(cell_spans(&d, &id, &rows[0], &cols[0]), vec![view("Totals", bold())]);
}

/// R23 a (reste OD71, MESURE du défaut connu, non corrigé) : première écriture concurrente dans une même cellule
/// absente : les deux documents convergent, et une seule des deux écritures reste (deux `Y.Map` neufs sous la même
/// clé de `cells` : le dernier écrit gagne). Ce test rougira le jour où le modèle de document corrigera la perte.
#[test]
fn concurrent_first_writes_in_an_absent_cell_keep_one() {
    let (d, id, rows, cols) = table_doc();
    let (mut a, mut b) = twins(&d);
    a.apply(set_cell(&id, &rows[0], &cols[0], "Lundi", None)).expect("a");
    b.apply(set_cell(&id, &rows[0], &cols[0], "Mardi", None)).expect("b");
    let text = |m: &Document| {
        let t = m.element(&id).and_then(|e| e.table).expect("vue");
        t.cells.into_iter().map(|c| c.text).collect::<Vec<_>>()
    };
    let ab = text(&merged(&a, &b));
    assert_eq!(ab, text(&merged(&b, &a)), "les deux documents convergent");
    assert!(ab == vec!["Lundi".to_string()] || ab == vec!["Mardi".to_string()], "une seule écriture reste : {ab:?}");
}

/// R23 b (mesure) : mises en forme concurrentes de deux mots d'une cellule existante : les deux restent.
#[test]
fn concurrent_formats_of_two_words_in_a_cell_both_stay() {
    let (mut d, id, rows, cols) = table_doc();
    d.apply(set_cell(&id, &rows[0], &cols[0], "Le chat noir", None)).expect("texte");
    let (mut a, mut b) = twins(&d);
    a.apply(set_cell(&id, &rows[0], &cols[0], "Le chat noir", Some(vec![sp("Le ", none()), sp("chat", bold()), sp(" noir", none())])))
        .expect("a");
    b.apply(set_cell(&id, &rows[0], &cols[0], "Le chat noir", Some(vec![sp("Le chat ", none()), sp("noir", italic())])))
        .expect("b");
    let ab = cell_spans(&merged(&a, &b), &id, &rows[0], &cols[0]);
    assert_eq!(ab, cell_spans(&merged(&b, &a), &id, &rows[0], &cols[0]));
    assert_eq!(ab, vec![view("Le ", none()), view("chat", bold()), view(" ", none()), view("noir", italic())]);
}
```

  En fin de `crates/roomboard-core/tests/tableau.rs` (ajouter aux imports `use roomboard_core::rich_text::{SpanAttrs, SpanInput};`
  et, s'ils manquent, `use roomboard_core::format::{load, save, SaveMeta};`) :

```rust
/// C7b (S1, R16) : une cellule mise en forme survit à l'aller-retour `.roomboard`.
#[test]
fn rich_cell_round_trips() {
    let mut d = Document::blank();
    let page = d.page_ids()[0].clone();
    let id = d
        .apply(Command::AddTable {
            page,
            x: 0.0,
            y: 0.0,
            cols: 2,
            rows: 2,
            col_width: 240.0,
            row_height: 64.0,
            color: "#000000".into(),
            size: 36.0,
        })
        .expect("tableau")
        .ids[0]
        .clone();
    let t = d.element(&id).and_then(|v| v.table).expect("vue");
    let bold = SpanAttrs { bold: true, ..SpanAttrs::default() };
    d.apply(Command::SetTableCell {
        id: id.clone(),
        row: t.rows[0].id.clone(),
        col: t.cols[0].id.clone(),
        content: "aaTotal".into(),
        row_height: None,
        spans: Some(vec![
            SpanInput { text: "a".into(), attrs: SpanAttrs::default() },
            SpanInput { text: "a".into(), attrs: bold.clone() },
            SpanInput { text: "Total".into(), attrs: bold.clone() },
        ]),
    })
    .expect("cellule");
    let meta = SaveMeta { app_version: "0.1.0".into(), now: "2026-11-20T00:00:00Z".into(), created: None };
    let back = load(&save(&d, &meta).expect("save")).expect("load");
    let cell = back.element(&id).and_then(|v| v.table).expect("vue").cells.remove(0);
    assert_eq!(cell.spans.iter().map(|s| (s.text.as_str(), s.attrs.bold)).collect::<Vec<_>>(), vec![("a", false), ("aTotal", true)]);
}
```

- [ ] **Étape 3 : vérifier le rouge.** `cargo test -p roomboard-core 2>&1 | grep -E "error\[" | head -10` : `E0560`
  (champ `spans` inconnu de `SetTableCell`) et `E0609` (`spans` absent de `TableCellView`).

- [ ] **Étape 4 : `rich_text.rs`.** Après `apply_spans`, ajouter :

```rust
/// Segments d'une cellule (C7b, R16) : ceux de son `Y.Text` ; sans `Y.Text` (remplissage seul), un segment vide.
pub(crate) fn cell_spans<T: ReadTxn>(txn: &T, text: Option<&TextRef>) -> Vec<TextSpanView> {
    text.map_or_else(
        || {
            vec![TextSpanView {
                text: String::new(),
                attrs: SpanAttrs::default(),
            }]
        },
        |t| read_spans(txn, t),
    )
}

/// Sortie « inchangé » d'une cellule (R7) : sans état voulu, ou sans `Y.Text` (contenu vide : rien à aligner), vrai ;
/// sinon, vrai si aucune clé connue ne diffère.
pub(crate) fn spans_unchanged<T: ReadTxn>(txn: &T, text: Option<&TextRef>, spans: Option<&[SpanInput]>) -> bool {
    match (text, spans) {
        (Some(t), Some(s)) => !spans_differ(txn, t, s),
        _ => true,
    }
}
```

- [ ] **Étape 5 : `commands.rs`.** Variante `SetTableCell`, après `row_height: Option<f64>,` :

```rust
        /// C7b (R7) : état voulu des segments de la cellule ; `None` : différence seule (C10a).
        spans: Option<Vec<SpanInput>>,
```

  Bras (`:554-560`) : ajouter `spans,` au motif et passer `spans.as_deref()` en dernier argument :
  `} => self.cmd_set_table_cell(&id, (row.as_str(), col.as_str()), &content, row_height, spans.as_deref()),`.

- [ ] **Étape 6 : `table.rs`.** Import `:20` : `use crate::rich_text::{self, valid_color, SpanInput, TextSpanView};`.
  `TableCellView`, après `pub fill: Option<String>,` : `pub spans: Vec<TextSpanView>,` (champ en fin, GC12). Dans
  `view` (`:200-205`), le littéral devient :

```rust
                cells.push(TableCellView {
                    row: r.id.clone(),
                    col: c.id.clone(),
                    text: cell.content,
                    fill: cell.fill,
                    spans: rich_text::cell_spans(txn, cell.text.as_ref()),
                });
```

  `insert_cell` (`:284-303`) : signature `-> MapRef` et dernier énoncé sans `;` (`cells.insert(txn, cell_key(row, col), fields.into_iter().collect::<MapPrelim>())`).
  `cmd_set_table_cell` devient :

```rust
    /// `SetTableCell` (T3, T5, C7b R7) : segments contrôlés d'abord ; texte par différence (`apply_text_diff`), puis
    /// attributs alignés dans la même transaction (`apply_spans`) ; hauteur écrite seulement si plus grande, la hauteur
    /// du tableau restant bornée en f32 ; même texte, mêmes segments, sans hauteur plus grande : aucune transaction.
    pub(crate) fn cmd_set_table_cell(
        &mut self,
        id: &str,
        (row, col): (&str, &str),
        content: &str,
        row_height: Option<f64>,
        spans: Option<&[SpanInput]>,
    ) -> Result<Change, CommandError> {
        // C7b (R7, PC2) : segments contrôlés en premier, sans écriture ; même ordre que `fake-core.ts`.
        if spans.is_some_and(|s| !rich_text::valid_spans(content, s)) {
            return Err(CommandError::BadFormat);
        }
        if row_height.is_some_and(|h| !finite_positive(h)) {
            return Err(CommandError::BadTable);
        }
        let (page, e, raw) = self.table_of(id)?;
        let line = raw.cell_row(row, col).ok_or(CommandError::BadTable)?;
        let (cell, spans_same) = {
            let txn = self.read();
            let cell = read_cell(&txn, raw.cells.as_ref(), row, col);
            let same = rich_text::spans_unchanged(&txn, cell.as_ref().and_then(|c| c.text.as_ref()), spans);
            (cell, same)
        };
        let current = cell.as_ref().map_or("", |c| c.content.as_str());
        let grow = row_height.filter(|h| *h > line.size);
        if grow.is_some_and(|h| !fits_f32(&[raw.height() - line.size + h])) {
            return Err(CommandError::BadTable);
        }
        if current == content && grow.is_none() && spans_same {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            let text = if current != content {
                match &cell {
                    Some(RawCell { text: Some(t), .. }) => {
                        rich_text::apply_text_diff(&mut txn, t, content);
                        Some(t.clone())
                    }
                    Some(c) => Some(c.map.insert(&mut txn, "text", TextPrelim::new(content))),
                    None => {
                        let m = insert_cell(&mut txn, &e, raw.cells.as_ref(), (row, col), content, None);
                        match m.get(&txn, "text") {
                            Some(Out::YText(t)) => Some(t),
                            _ => None,
                        }
                    }
                }
            } else {
                cell.as_ref().and_then(|c| c.text.clone())
            };
            // C7b (R7) : alignement dans la même transaction, sur le `TextRef` relu après une création.
            if let (Some(s), Some(t)) = (spans, &text) {
                rich_text::apply_spans(&mut txn, t, s);
            }
            if let Some(h) = grow {
                line.map.insert(&mut txn, "height", In::Any(Any::from(h)));
            }
        }
        Ok(self.table_done(page, id))
    }
```

  Tests de `table.rs` : `set` (`:903`) gagne `spans: None,` ; dans les vues littérales (`:707`, `:713`, `:1298`), ajouter
  `spans: plain_spans("Lundi")` (texte de la cellule) ou `spans: plain_spans("")` (remplissage seul), avec, dans le
  module `tests`, l'aide :

```rust
    /// Segments d'une cellule sans attribut (C7b, R16).
    fn plain_spans(t: &str) -> Vec<crate::rich_text::TextSpanView> {
        vec![crate::rich_text::TextSpanView {
            text: t.into(),
            attrs: crate::rich_text::SpanAttrs::default(),
        }]
    }
```

  `tests/tableau.rs:61` et `crates/roomboard-wasm/src/lib.rs` (`set_table_cell_inner`) : `spans: None,` après
  `row_height`. Contrôle : `grep -rn -A7 "Command::SetTableCell {" crates | grep -c "spans"` vaut le nombre de
  constructions (`grep -rn "Command::SetTableCell {" crates | wc -l`), motifs `if let` compris s'ils nomment `..`.

- [ ] **Étape 7 : vert.** Commande bornée de la section. Si `concurrent_first_writes_in_an_absent_cell_keep_one`
  montre les deux écritures, le noter tel quel au rapport (mesure) et ne rien changer au modèle (GC17).

- [ ] **Étape 8 : format et lint** (GC16).

- [ ] **Étape 9 : commit.**

```bash
cd "$WT" && git add crates/roomboard-core/src/commands.rs && git add crates/roomboard-core/src/table.rs && \
git add crates/roomboard-core/src/rich_text.rs && git add crates/roomboard-core/tests/texte_riche.rs && \
git add crates/roomboard-core/tests/tableau.rs && git add crates/roomboard-wasm/src/lib.rs && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(core): rich table cells with wanted spans and span views" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Commande bornée et ses noms vus ; mesure R23 a (laquelle des deux écritures reste) et R23 b ; une ligne
`Réutilisation :` par ligne `Réutilise :`.

---

<a id="tache-t6"></a>

### Tâche T6 — Faux cœur et contrat TS des segments (parité)

**Objectif.** La fausse liaison applique `spans` de `SetText` et `SetTableCell` comme le cœur (T1, T5) : même ordre de
contrôle (segments d'abord, `BadFormat`), même sortie « inchangé » (segments normalisés égaux), mêmes vues (segments
normalisés : `read_spans`), cellules `{ text, spans, fill }` enregistrées et relues (JSON ancien : un segment). Le
contrat gagne le bloc « contrat C7b » (fausse liaison seule jusqu'à T12) et les attentes C10a des cellules portent
`spans`. Scénario S6.

**Fichiers.**
- Modifier : `apps/web/src/core/fake-core.ts:69` (import), `:99` (`FakeCell`), `:152-160` (`tableView`), `:462-500`
  (`SetText`), `:613-629` (`SetTableCell`), `:667-677` (`SetTableFill`), `:923-947` (`loadTable`) ;
  `apps/web/src/core/wasm-core.ts:25` (import), `:132-138` (`toTable`, cellules)
- Tests : `apps/web/src/core/fake-core.test.ts` (`:572` et un bloc neuf), `apps/web/src/core/wasm-core.contract.test.ts`
  (`:1538`, `:1648`, `:1663-1666`, `:1672-1675`, `:1711` et un bloc neuf en fin de fichier)

**Interfaces.**
- Consomme (T2) : `SetText.spans?`, `SetTableCell.spans?`, `TableCell.spans` (`core/api.ts`) ;
  `validSpans(content, spans): boolean`, `normalSpans(spans): TextSpan[]` (`core/rich-text.ts`).
- Produit : parité de la fausse liaison (aucune signature neuve). `toTable` lit une cellule sans `spans` comme un
  segment (PC7, retiré par T12). Constantes du contrat lues par T12 : `const c7bFactories` (fausse liaison seule ici),
  bloc `describe.each(c7bFactories)("contrat C7b : $name", …)`.
- Réutilise : `apps/web/src/core/rich-text.ts:9`, `:120`, `:35` — `plainSpans`, `sameSpans`, `editSpans` (création, sortie
  « inchangé », différence sans état voulu) ; `validSpans`, `normalSpans` de T2.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web test -- src/core --reporter=verbose 2>&1 | grep -E "C7b|C10a|×|FAIL|Test Files|Tests " | tail -80
```

Attendu : aucun `×` ; au moins 10 lignes `✓ contrat C7b : fausse liaison > …`, 2 lignes `✓ fakeCore — C7b …` ; les
blocs C10a (fausse liaison et vrai module copié) verts. `tsc` : plus d'erreur dans `fake-core.ts` ni `wasm-core.ts` ;
restent seulement les trois fichiers de test de T8 (écart de T2).

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé, aucun seuil changé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm apps/web/src/` ;
  `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm-formats apps/web/src/`.
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle.
- GC9 `SetText` et `SetTableCell` sans `spans` gardent le comportement d'aujourd'hui (C7, C10a).
- GC12 OD80 : `fake-core.ts`, `wasm-core.ts` : changements minces (champ `spans` de cellule, contrôle en tête des deux
  commandes) ; la règle vit dans `rich-text.ts`.
- GC13 Périmètre : seuls les fichiers ci-dessus.
- GC14 `tsc` : seul le reste de l'écart de T2 (trois fichiers de test de T8).
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.

**Interdits.** Ne pas brancher `spans` vers le vrai module dans `wasm-core.ts` `apply` (T12 : la liaison n'a pas encore
le paramètre) ; ne pas passer `c7bFactories` à `factories` (T12) ; ne pas toucher `FormatText`.

**Patron à ne pas reprendre.** La sortie « inchangé » actuelle de la fausse liaison (`fake-core.ts:490-492` pour
`SetText`, `:622` pour `SetTableCell`) ne compare que le contenu et les champs : une mise en forme seule y serait
perdue. Chemin de référence : `cmd_set_text` et `cmd_set_table_cell` du cœur après T1 et T5 (segments contrôlés
d'abord, `spans_differ` dans la sortie « inchangé », vue = segments normalisés).

**Critère « terminé ».** Commande bornée verte, `tsc` réduit à l'écart restant, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : attentes C10a des cellules.** Dans `wasm-core.contract.test.ts`, les cellules attendues portent leurs
  segments (fausse liaison et vrai module, ce dernier lu par la tolérance de `toTable`) :
  - `:1538` : `[{ row: r0, col: c0, text: "Lundi", fill: null, spans: [plainSpan("Lundi")] }]`
  - `:1648` : `[{ row: r1, col: c1, text: "", fill: "#fef08a", spans: [plainSpan("")] }]`
  - `:1664-1665` : `{ row: r0, col: c0, text: "A", fill: "#fef08a", spans: [plainSpan("A")] }`,
    `{ row: r1, col: c1, text: "B", fill: null, spans: [plainSpan("B")] }`
  - `:1673-1674` : `{ row: r0, col: c0, text: "A", fill: null, spans: [plainSpan("A")] }`,
    `{ row: r1, col: c1, text: "B", fill: "#bbf7d0", spans: [plainSpan("B")] }`
  - `:1711` : sortie `cells: [{ row: "r1", col: "c1", text: "A", fill: null, spans: [plainSpan("A")] }]` (entrée
    inchangée, sans `spans` : la tolérance de T6).
  Dans `fake-core.test.ts:572` : `[{ row: "r1", col: "c2", text: "B", fill: null, spans: [{ text: "B", attrs: {} }] }]`.

- [ ] **Étape 3 : bloc de contrat rouge.** En fin de `wasm-core.contract.test.ts` :

```ts
// C7b (R7, R16) : `spans` facultatif de SetText et SetTableCell. T12 branche le vrai module (`c7bFactories = factories`).
const c7bFactories = factories.filter((x) => x.name === "fausse liaison");
const C7B_BOLD: TextAttrs = { bold: true };
const C7B_ITALIC: TextAttrs = { italic: true };
const C7B_RED_BOLD: TextAttrs = { bold: true, color: "#dc2626" };
describe.each(c7bFactories)("contrat C7b : $name", ({ f }) => {
  const setText = (d: CoreDocument, p: string, id: string | null, content: string, spans?: readonly TextSpan[]) =>
    d.apply({ type: "SetText", page: p, id, x: 100, y: 200, content, color: "#000000", size: 36, boxWidth: 600, boxHeight: 45, ...(spans === undefined ? {} : { spans }) });
  const spansOf = (d: CoreDocument, id: string): readonly TextSpan[] => {
    const e = d.element(id);
    if (e?.kind !== "text") throw new Error(`texte attendu : ${e?.kind ?? "absent"}`);
    return e.text.spans;
  };
  const setCell = (d: CoreDocument, id: string, row: string, col: string, content: string, spans?: readonly TextSpan[]) =>
    d.apply({ type: "SetTableCell", id, row, col, content, ...(spans === undefined ? {} : { spans }) });
  const cellSpans = (d: CoreDocument, id: string, row: string, col: string): readonly TextSpan[] =>
    tableOf(d, id).cells.find((c) => c.row === row && c.col === col)?.spans ?? [];

  it("SetText avec segments : texte et format en une étape ; annuler rend l'état d'avant (R6, R7)", () => {
    const d = f.blank();
    const p = first(d);
    const id = setText(d, p, null, "Le chat noir").ids[0] ?? "";
    setText(d, p, id, "Le gros chat noir", [plainSpan("Le gros "), { text: "chat", attrs: C7B_RED_BOLD }, plainSpan(" noir")]);
    expect(spansOf(d, id)).toEqual([plainSpan("Le gros "), { text: "chat", attrs: C7B_RED_BOLD }, plainSpan(" noir")]);
    d.undo();
    expect(spansOf(d, id)).toEqual([plainSpan("Le chat noir")]);
    d.free();
  });

  it("S6 : même texte, segments changés : écrit (jamais inchangé), une étape", () => {
    const d = f.blank();
    const p = first(d);
    const id = setText(d, p, null, "Le chat noir").ids[0] ?? "";
    const v = d.version();
    setText(d, p, id, "Le chat noir", [plainSpan("Le chat "), { text: "noir", attrs: C7B_ITALIC }]);
    expect(d.version()).toBeGreaterThan(v);
    expect(spansOf(d, id)[1]).toEqual({ text: "noir", attrs: C7B_ITALIC });
    d.undo();
    expect(spansOf(d, id)).toEqual([plainSpan("Le chat noir")]);
    d.free();
  });

  it("mêmes segments une fois normalisés (voisins égaux, false, null) : aucune étape (D38)", () => {
    const d = f.blank();
    const p = first(d);
    const id = setText(d, p, null, "Le chat").ids[0] ?? "";
    setText(d, p, id, "Le chat", [plainSpan("Le "), { text: "chat", attrs: C7B_BOLD }]);
    const same = [plainSpan("Le"), { text: " ", attrs: { italic: false, color: null } } as unknown as TextSpan, { text: "chat", attrs: C7B_BOLD }];
    unchanged(d, () => setText(d, p, id, "Le chat", same));
    d.free();
  });

  it("segments sans attribut sur un texte sans attribut : même vue qu'un SetText sans spans (S5)", () => {
    const a = f.blank();
    const b = f.blank();
    const ia = setText(a, first(a), null, "Le chat").ids[0] ?? "";
    const ib = setText(b, first(b), null, "Le chat").ids[0] ?? "";
    setText(a, first(a), ia, "Le gros chat");
    setText(b, first(b), ib, "Le gros chat", [plainSpan("Le gros chat")]);
    expect(spansOf(b, ib)).toEqual(spansOf(a, ia));
    expect(b.version()).toBe(a.version());
    a.free();
    b.free();
  });

  it("segments invalides : BadFormat d'abord (concaténation, valeur, clé inconnue), avant texte invalide et id inconnu (PC2)", () => {
    const d = f.blank();
    const p = first(d);
    const id = setText(d, p, null, "Le chat").ids[0] ?? "";
    const bads: TextSpan[][] = [
      [plainSpan("Le cha")],
      [{ text: "Le chat", attrs: { size: 0 } }],
      [{ text: "Le chat", attrs: { color: "pas une couleur !" } }],
      [{ text: "Le chat", attrs: { href: "x" } } as unknown as TextSpan],
    ];
    for (const spans of bads) {
      unchanged(d, () => expect(messageOf(() => setText(d, p, id, "Le chat", spans))).toBe(BAD_FORMAT));
      unchanged(d, () => expect(messageOf(() => setText(d, p, "absent", "Le chat", spans))).toBe(BAD_FORMAT));
      unchanged(d, () =>
        expect(messageOf(() => d.apply({ type: "SetText", page: p, id, x: 0, y: 0, content: "Le chat", color: "#000000", size: 0, boxWidth: 600, boxHeight: 45, spans }))).toBe(BAD_FORMAT),
      );
    }
    d.free();
  });

  it("boîte neuve avec segments : créée mise en forme ; annuler la retire", () => {
    const d = f.blank();
    const p = first(d);
    const id = setText(d, p, null, "Le chat", [plainSpan("Le "), { text: "chat", attrs: C7B_RED_BOLD }]).ids[0] ?? "";
    expect(spansOf(d, id)).toEqual([plainSpan("Le "), { text: "chat", attrs: C7B_RED_BOLD }]);
    d.undo();
    expect(d.element(id)).toBeNull();
    d.free();
  });

  it("SetTableCell avec segments : cellule absente créée en gras, une étape ; vue spans (R16)", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 2, rows: 2 });
    const [r0, , c0] = ids2(tableOf(d, id));
    setCell(d, id, r0, c0, "aaTotal", [plainSpan("a"), { text: "a", attrs: C7B_BOLD }, { text: "Total", attrs: C7B_BOLD }]);
    expect(cellSpans(d, id, r0, c0)).toEqual([plainSpan("a"), { text: "aTotal", attrs: C7B_BOLD }]);
    d.undo();
    expect(tableOf(d, id).cells).toEqual([]);
    d.free();
  });

  it("S6 : cellule « Total » existante, italique seule : écrite, une étape ; mêmes segments : aucune", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 2, rows: 2 });
    const [r0, , c0] = ids2(tableOf(d, id));
    setCell(d, id, r0, c0, "Total");
    const v = d.version();
    setCell(d, id, r0, c0, "Total", [{ text: "Total", attrs: C7B_ITALIC }]);
    expect(d.version()).toBeGreaterThan(v);
    expect(cellSpans(d, id, r0, c0)).toEqual([{ text: "Total", attrs: C7B_ITALIC }]);
    unchanged(d, () => setCell(d, id, r0, c0, "Total", [{ text: "To", attrs: C7B_ITALIC }, { text: "tal", attrs: C7B_ITALIC }]));
    d.undo();
    expect(cellSpans(d, id, r0, c0)).toEqual([plainSpan("Total")]);
    d.free();
  });

  it("SetTableCell sans segments : la frappe hérite du caractère précédent (C7 T5) ; segments invalides : BadFormat avant BadTable", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 2, rows: 2 });
    const [r0, , c0] = ids2(tableOf(d, id));
    setCell(d, id, r0, c0, "Total", [{ text: "Total", attrs: C7B_BOLD }]);
    setCell(d, id, r0, c0, "Totals");
    expect(cellSpans(d, id, r0, c0)).toEqual([{ text: "Totals", attrs: C7B_BOLD }]);
    unchanged(d, () =>
      expect(messageOf(() => d.apply({ type: "SetTableCell", id, row: r0, col: c0, content: "x", rowHeight: -1, spans: [plainSpan("y")] }))).toBe(BAD_FORMAT),
    );
    d.free();
  });

  it("enregistrer puis rouvrir : segments du texte et de la cellule gardés (S1)", () => {
    const d = f.blank();
    const p = first(d);
    const tx = setText(d, p, null, "Le chat", [plainSpan("Le "), { text: "chat", attrs: C7B_RED_BOLD }]).ids[0] ?? "";
    const id = addTable(d, p, { cols: 2, rows: 2 });
    const [r0, , c0] = ids2(tableOf(d, id));
    setCell(d, id, r0, c0, "Total", [{ text: "Total", attrs: C7B_BOLD }]);
    const r = f.load(d.save(now, "0.1.0"));
    expect(spansOf(r, tx)).toEqual(spansOf(d, tx));
    expect(cellSpans(r, id, r0, c0)).toEqual([{ text: "Total", attrs: C7B_BOLD }]);
    r.free();
    d.free();
  });
});
```

  Dans `fake-core.test.ts`, en fin de fichier :

```ts
describe("fakeCore — C7b (cellules riches, JSON)", () => {
  const load = (cells: unknown) =>
    fakeCore.load(new TextEncoder().encode(JSON.stringify({ pages: [{ id: "p1", elements: [{ id: "t1", kind: "table", transform: [1, 0, 0, 1, 0, 0], table: { cols: [{ id: "c1", width: 240 }], rows: [{ id: "r1", height: 64 }], cells } }] }] })));
  const cellOf = (d: CoreDocument) => {
    const v = d.element("t1");
    if (v?.kind !== "table") throw new Error(`tableau attendu : ${v?.kind ?? "absent"}`);
    return v.table.cells[0];
  };

  it("JSON d'avant C7b : cellule sans spans → un segment sans attribut", () => {
    expect(cellOf(load({ "r1:c1": { text: "Lundi", fill: null } }))?.spans).toEqual([{ text: "Lundi", attrs: {} }]);
  });

  it("spans lisibles : normalisés ; illisibles (concaténation fausse, valeur hors domaine) : un segment", () => {
    expect(cellOf(load({ "r1:c1": { text: "ab", fill: null, spans: [{ text: "a", attrs: { bold: true } }, { text: "b", attrs: { bold: true } }] } }))?.spans).toEqual([{ text: "ab", attrs: { bold: true } }]);
    expect(cellOf(load({ "r1:c1": { text: "ab", fill: null, spans: [{ text: "a", attrs: {} }] } }))?.spans).toEqual([{ text: "ab", attrs: {} }]);
    expect(cellOf(load({ "r1:c1": { text: "ab", fill: null, spans: [{ text: "ab", attrs: { size: 0 } }] } }))?.spans).toEqual([{ text: "ab", attrs: {} }]);
  });
});
```

- [ ] **Étape 4 : vérifier le rouge.** Commande bornée : `×` sur le bloc C7b (segments ignorés), sur les attentes C10a
  (`spans` absent de la vue de la fausse liaison) et sur « fakeCore — C7b ».

- [ ] **Étape 5 : fausse liaison.** Import `:69` :
  `import { cleanPatch, editSpans, formatSpans, normalSpans, plainSpans, sameSpans, utf16Bounds, validColor, validPatch, validSpans } from "./rich-text";`.
  En-tête de fichier, après la ligne `// C7 : …` (`:12`), ajouter :
  `// C7b : SetText et SetTableCell avec spans (état voulu, contrôlé d'abord, normalisé) ; cellules { text, spans, fill }.`
  `FakeCell` (`:99`) : `interface FakeCell { readonly text: string; readonly spans: readonly TextSpan[]; readonly fill: string | null }`.
  `tableView` (`:157`) : `cells.push({ row: r.id, col: c.id, text: cell.text, fill: cell.fill, spans: cell.spans });`.
  `SetText` : en tête du cas, avant le contrôle `badText`, et dans la construction de `text` :

```ts
        // C7b (R7, PC2) : segments contrôlés en premier, comme le cœur ; état voulu normalisé (forme de read_spans).
        if (cmd.spans !== undefined && !validSpans(cmd.content, cmd.spans)) throw new Error(MESSAGES.badFormat);
        const want = cmd.spans === undefined ? null : normalSpans(cmd.spans);
```

  puis `spans: want ?? plainSpans(cmd.content)` dans `text` (`:467`) ; la sortie « inchangé » (`:490`) gagne
  `&& (want === null || sameSpans(want, t.spans))` ; l'écriture (`:497`) prend `spans: want ?? editSpans(t.spans, cmd.content)`.
  `SetTableCell` devient :

```ts
      case "SetTableCell": {
        // C7b (R7, PC2) : segments contrôlés en premier, comme `cmd_set_table_cell`.
        if (cmd.spans !== undefined && !validSpans(cmd.content, cmd.spans)) throw new Error(MESSAGES.badFormat);
        const want = cmd.spans === undefined ? null : normalSpans(cmd.spans);
        if (cmd.rowHeight !== undefined && !positive(cmd.rowHeight)) throw new Error(MESSAGES.badTable);
        const { found, t } = this.tableOf(cmd.id);
        const r = t.rows.findIndex((l) => l.id === cmd.row);
        const row = t.rows[r];
        if (!row || !t.cols.some((l) => l.id === cmd.col)) throw new Error(MESSAGES.badTable);
        const key = cellKey(cmd.row, cmd.col);
        const cell = t.cells.get(key);
        const current = cell?.text ?? "";
        const spans = cell?.spans ?? plainSpans(current);
        const grow = cmd.rowHeight !== undefined && cmd.rowHeight > row.height ? cmd.rowHeight : null;
        if (grow !== null && !fitsF32([sum(t.rows.map((l) => l.height)) - row.height + grow])) throw new Error(MESSAGES.badTable);
        const restyle = want !== null && current !== "" && !sameSpans(want, spans);
        if (current === cmd.content && grow === null && !restyle) return this.unchanged();
        const cells = new Map(t.cells);
        if (current !== cmd.content || restyle) {
          cells.set(key, { text: cmd.content, spans: want ?? editSpans(spans, cmd.content), fill: cell?.fill ?? null });
        }
        const rows = grow === null ? t.rows : t.rows.map((l, i) => (i === r ? { ...l, height: grow } : l));
        return this.writeTable(found, cmd.id, { ...t, rows, cells });
      }
```

  `SetTableFill` (`:675`) : `cells.set(key, { text: cell?.text ?? "", spans: cell?.spans ?? plainSpans(""), fill: cmd.fill });`.
  `loadTable` (`:930-936`) :

```ts
    for (const [k, c] of Object.entries(raw)) {
      if (!isRecord(c)) continue;
      const text = typeof c["text"] === "string" ? c["text"] : "";
      const fill = c["fill"];
      const s = c["spans"];
      // C7b : segments lisibles normalisés ; JSON d'avant C7b ou segments illisibles : un segment (R16).
      const spans = Array.isArray(s) && validSpans(text, s as TextSpan[]) ? normalSpans(s as TextSpan[]) : plainSpans(text);
      cells.set(k, { text, spans, fill: typeof fill === "string" && validColor(fill) ? fill : null });
    }
```

- [ ] **Étape 6 : tolérance de `toTable`.** `wasm-core.ts:25` : `import { cleanPatch, plainSpans } from "./rich-text";`.
  Cellules (`:132-138`) :

```ts
    cells: cells.map((c: unknown) => {
      if (!isRecord(c)) throw new Error(ELEMENT);
      const { row, col, text, fill, spans } = c;
      if (typeof row !== "string" || typeof col !== "string" || typeof text !== "string") throw new Error(ELEMENT);
      if (fill !== undefined && fill !== null && typeof fill !== "string") throw new Error(ELEMENT);
      // PC7 : module d'avant C7b sans `spans` → un segment ; T12 les exige.
      return { row, col, text, fill: typeof fill === "string" ? fill : null, spans: spans === undefined ? plainSpans(text) : toSpans(spans, text) };
    }),
```

- [ ] **Étape 7 : vert.** Commande bornée : 0 `×`. Contrôle `tsc` : les seules erreurs restantes sont dans
  `table-geom.test.ts`, `render/table-paint.test.ts`, `render/canvas2d.test.ts` (si T8 n'est pas encore fusionnée).

- [ ] **Étape 8 : commit.**

```bash
cd "$WT" && git add apps/web/src/core/fake-core.ts && git add apps/web/src/core/fake-core.test.ts && \
git add apps/web/src/core/wasm-core.ts && git add apps/web/src/core/wasm-core.contract.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): fake core applies wanted spans like the core" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Commande bornée et ses noms vus ; état de l'écart `tsc` ; une ligne `Réutilisation :`.

---

<a id="tache-t7"></a>

### Tâche T7 — Modèle de séance riche (`createRichEdit`)

**Objectif.** Écrire la fabrique du modèle pur de séance (DAR2, DAR3) dont T2 a posé les types : frappe et composition
relues par différence ancrée au curseur (R3), bascules et valeurs de la barre (R8), format en attente au curseur (R9,
PC10), collage et Entrée (R12), historique local, une étape par action et par suite de frappe (R10, HC7b-11), état de
la barre (R15). Testé en `node` (R26). Scénario S2 (une mise en forme s'annule en une étape) ; sert aussi S1, S3, S4.

**Fichiers.**
- Modifier : `apps/web/src/engine/rich-edit.ts` (types de T2 gardés tels quels ; imports et fabrique ajoutés)
- Créer : `apps/web/src/engine/rich-edit.test.ts`

**Interfaces.**
- Consomme (T2) : types `FormatAction`, `FormatState`, `RichBase`, `RichEditState`, `RichEdit` ;
  `editSpansAt(spans, content, caret)`, `insertedRange(old, content, caret)`, `spliceSpans(spans, start, end, text, attrs)`,
  `patched(attrs, patch)`, `spansText(spans)` (`core/rich-text.ts`).
- Produit :

```ts
// engine/rich-edit.ts
export function createRichEdit(initial: readonly TextSpan[], base: RichBase): RichEdit; // sélection initiale : fin du texte
export function attrsBefore(spans: readonly TextSpan[], at: number): TextAttrs;         // caractère qui finit en `at` ; en tête : {}
```

  T10 (zone) appelle `createRichEdit(session.spans, { size: session.size, color: session.color })` et toutes les
  méthodes de `RichEdit`.
- Réutilise : `apps/web/src/core/rich-text.ts:35` — `editSpans(spans, content)` (curseur illisible, PC9) et
  `editSpansAt` de T2 (frappe ancrée).
- Réutilise : `apps/web/src/core/rich-text.ts:110` — `formatSpans(spans, start, len, patch)` (actions sur une
  sélection, format en attente posé sur le milieu neuf).
- Réutilise : `apps/web/src/core/rich-text.ts:120` — `sameSpans(a, b)` (action sans effet : aucune étape).
- Réutilise : aucun module existant (nouveau module) — `apps/web/src/engine/rich-edit.ts` : `createRichEdit(initial, base): RichEdit`
  (seul `History` du cœur existe, il n'annule que le document).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web test -- src/engine/rich-edit.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -40
```

Attendu : aucun `×` ; au moins 14 lignes `✓ séance riche (C7b) > …` dont « Ctrl+B au curseur puis « a » : la deuxième
lettre grasse » et « Ctrl+Z annule la dernière mise en forme seule ». `tsc` : seul l'écart de T2 (s'il reste).

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé, aucun seuil changé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm apps/web/src/` ;
  `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm-formats apps/web/src/`.
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle.
- GC13 Périmètre : seuls les deux fichiers ci-dessus.
- GC14 `tsc` : seul l'écart de T2 s'il n'est pas encore levé.
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.

**Interdits.** Aucun DOM, aucun import de `app/` ; ne pas changer les types posés par T2 (T9, T10, T11 les lisent) ;
aucune écriture au document (le modèle ne connaît pas le cœur, D38).

**Patron à ne pas reprendre.** `editSpans` (`core/rich-text.ts:35-46`) appliqué à la frappe relue : préfixe d'abord,
il met le neuf **après** les caractères égaux qui suivent le curseur (« aa », curseur 1, Ctrl+B, « a » : la troisième
lettre grasse). Chemin de référence : `editSpansAt` et `insertedRange` (T2), bornés par le curseur relu.

**Critère « terminé ».** Commande bornée verte, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : test rouge.** Créer `apps/web/src/engine/rich-edit.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { TextAttrs, TextSpan } from "../core/api";
import { attrsBefore, createRichEdit } from "./rich-edit";

const plain = (text: string): TextSpan => ({ text, attrs: {} });
const B: TextAttrs = { bold: true };
const RB: TextAttrs = { bold: true, color: "#dc2626" };
const BASE = { size: 36, color: "#000000" };
/** Frappe relue : `before` + `typed` + `after` autour du curseur, curseur après le neuf. */
const type = (e: ReturnType<typeof createRichEdit>, typed: string): void => {
  const { start, end } = e.state();
  const t = e.text();
  const next = t.slice(0, start) + typed + t.slice(end);
  e.input(next, start + typed.length, start + typed.length);
};

describe("séance riche (C7b)", () => {
  it("état initial : segments reçus, curseur en fin, aucune attente", () => {
    const e = createRichEdit([plain("Le "), { text: "chat", attrs: B }], BASE);
    expect(e.state()).toEqual({ spans: [plain("Le "), { text: "chat", attrs: B }], start: 7, end: 7, pending: null });
    expect(e.text()).toBe("Le chat");
  });

  it("Ctrl+B au curseur puis « a » : la deuxième lettre grasse (S1, R3, R9)", () => {
    const e = createRichEdit([plain("aa")], BASE);
    e.select(1, 1);
    expect(e.format({ type: "bold" })).toBe(false);
    expect(e.state().pending).toEqual({ bold: true });
    type(e, "a");
    expect(e.state().spans).toEqual([plain("a"), { text: "a", attrs: B }, plain("a")]);
    expect(e.state().pending).toBeNull();
    expect(e.state()).toMatchObject({ start: 2, end: 2 });
  });

  it("frappe : hérite du caractère précédent ; en tête, aucun attribut (T5)", () => {
    const e = createRichEdit([{ text: "chat", attrs: RB }], BASE);
    type(e, "s");
    expect(e.state().spans).toEqual([{ text: "chats", attrs: RB }]);
    e.select(0, 0);
    type(e, "L");
    expect(e.state().spans).toEqual([plain("L"), { text: "chats", attrs: RB }]);
  });

  it("format sur une sélection : bascule G, I, S — toute la sélection l'a : retiré, sinon posé (R8)", () => {
    const e = createRichEdit([plain("Le "), { text: "chat", attrs: B }], BASE);
    e.select(3, 7);
    expect(e.format({ type: "bold" })).toBe(true);
    expect(e.state().spans).toEqual([plain("Le chat")]);
    e.select(0, 7);
    e.format({ type: "italic" });
    e.format({ type: "underline" });
    expect(e.state().spans).toEqual([{ text: "Le chat", attrs: { italic: true, underline: true } }]);
    e.select(2, 5);
    e.format({ type: "bold" });
    expect(e.state().spans.map((s) => [s.text, s.attrs.bold === true])).toEqual([["Le", false], [" ch", true], ["at", false]]);
  });

  it("taille égale à celle de l'élément → retirée ; couleur « Défaut » (null) → retirée ; autre → posée (R8, HC7b-13)", () => {
    const e = createRichEdit([plain("chat")], BASE);
    e.select(0, 4);
    e.format({ type: "size", size: 72 });
    e.format({ type: "color", color: "#dc2626" });
    expect(e.state().spans).toEqual([{ text: "chat", attrs: { size: 72, color: "#dc2626" } }]);
    e.format({ type: "size", size: 36 });
    e.format({ type: "color", color: null });
    expect(e.state().spans).toEqual([plain("chat")]);
    e.format({ type: "color", color: "#000000" });
    expect(e.state().spans).toEqual([{ text: "chat", attrs: { color: "#000000" } }]);
  });

  it("format au curseur : attente sans étape ; deux bascules s'annulent ; consommée par la première insertion (R9, PC10)", () => {
    const e = createRichEdit([plain("ab")], BASE);
    e.format({ type: "bold" });
    e.format({ type: "bold" });
    expect(e.state().pending).toEqual({ bold: null });
    expect(e.undo()).toBe(false);
    e.format({ type: "bold" });
    type(e, "cd");
    expect(e.state().spans).toEqual([plain("ab"), { text: "cd", attrs: B }]);
    expect(e.state().pending).toBeNull();
  });

  it("attente oubliée par un déplacement ; gardée si la sélection relue est la même (frappe puis selectionchange) (R9, HC7b-5)", () => {
    const e = createRichEdit([plain("ab")], BASE);
    e.format({ type: "bold" });
    e.select(2, 2);
    expect(e.state().pending).toEqual({ bold: true });
    e.select(0, 0);
    expect(e.state().pending).toBeNull();
    type(e, "x");
    expect(e.state().spans).toEqual([plain("xab")]);
  });

  it("Ctrl+Z annule la dernière mise en forme seule ; texte et sélection restent ; Ctrl+Y la remet (S2, R10)", () => {
    const e = createRichEdit([plain("Le chat noir")], BASE);
    e.select(8, 12);
    e.format({ type: "italic" });
    expect(e.state().spans).toEqual([plain("Le chat "), { text: "noir", attrs: { italic: true } }]);
    expect(e.undo()).toBe(true);
    expect(e.state()).toEqual({ spans: [plain("Le chat noir")], start: 8, end: 12, pending: null });
    expect(e.redo()).toBe(true);
    expect(e.state().spans[1]).toEqual({ text: "noir", attrs: { italic: true } });
  });

  it("une suite de frappe = une étape, coupée par un déplacement ou une action (R10, HC7b-11)", () => {
    const e = createRichEdit([plain("")], BASE);
    type(e, "a");
    type(e, "b");
    type(e, "c");
    e.select(1, 1);
    type(e, "x");
    expect(e.text()).toBe("axbc");
    expect(e.undo()).toBe(true);
    expect(e.text()).toBe("abc");
    expect(e.undo()).toBe(true);
    expect(e.text()).toBe("");
    expect(e.undo()).toBe(false);
  });

  it("insert : collage et Entrée remplacent la sélection ; attributs du précédent plus l'attente ; une étape (S4, R12)", () => {
    const e = createRichEdit([{ text: "Total", attrs: B }], BASE);
    e.select(3, 3);
    e.insert("collé");
    expect(e.state().spans).toEqual([{ text: "Totcolléal", attrs: B }]);
    expect(e.state()).toMatchObject({ start: 8, end: 8 });
    e.select(0, 10);
    e.insert("x\ny");
    expect(e.state().spans).toEqual([plain("x\ny")]);
    expect(e.undo()).toBe(true);
    expect(e.text()).toBe("Totcolléal");
    expect(e.undo()).toBe(true);
    expect(e.text()).toBe("Total");
  });

  it("formatState : valeurs effectives ; mixed ; taille de l'élément et « default » sans attribut (R15)", () => {
    const e = createRichEdit([plain("Le "), { text: "chat", attrs: { bold: true, size: 72, color: "#dc2626" } }], BASE);
    e.select(0, 2);
    expect(e.formatState()).toEqual({ bold: false, italic: false, underline: false, size: 36, color: "default" });
    e.select(3, 7);
    expect(e.formatState()).toEqual({ bold: true, italic: false, underline: false, size: 72, color: "#dc2626" });
    e.select(0, 7);
    expect(e.formatState()).toEqual({ bold: false, italic: false, underline: false, size: "mixed", color: "mixed" });
    e.select(7, 7);
    expect(e.formatState().bold).toBe(true);
    e.format({ type: "bold" });
    expect(e.formatState().bold).toBe(false);
  });

  it("curseur illisible (-1, -1) : différence sans borne, curseur en fin, attente non posée (PC9)", () => {
    const e = createRichEdit([plain("ab")], BASE);
    e.format({ type: "bold" });
    expect(e.input("abc", -1, -1)).toBe(true);
    expect(e.state()).toMatchObject({ spans: [plain("abc")], start: 3, end: 3 });
  });

  it("rien à annuler ni à rétablir : false ; texte inchangé relu : false, sélection suivie", () => {
    const e = createRichEdit([plain("ab")], BASE);
    expect([e.undo(), e.redo()]).toEqual([false, false]);
    expect(e.input("ab", 1, 1)).toBe(false);
    expect(e.state()).toMatchObject({ start: 1, end: 1 });
  });

  it("composition relue en bloc à la fin d'un mot gras rouge : « にほん » hérite gras rouge, une étape (S3)", () => {
    const e = createRichEdit([plain("Le "), { text: "chat", attrs: RB }], BASE);
    e.input("Le chatにほん", 10, 10);
    expect(e.state().spans).toEqual([plain("Le "), { text: "chatにほん", attrs: RB }]);
    expect(e.undo()).toBe(true);
    expect(e.text()).toBe("Le chat");
  });

  it("attrsBefore : caractère qui finit en `at` ; en tête et texte vide : aucun attribut", () => {
    const spans = [plain("Le "), { text: "chat", attrs: B }];
    expect(attrsBefore(spans, 4)).toEqual(B);
    expect(attrsBefore(spans, 3)).toEqual({});
    expect(attrsBefore(spans, 0)).toEqual({});
    expect(attrsBefore([plain("")], 0)).toEqual({});
  });
});
```

- [ ] **Étape 3 : vérifier le rouge.** Commande bornée : `FAIL` (`createRichEdit` n'est pas exporté).

- [ ] **Étape 4 : code.** Dans `engine/rich-edit.ts`, remplacer la ligne d'import de T2 par :

```ts
import type { TextAttrs, TextAttrsPatch, TextSpan } from "../core/api";
import { editSpans, editSpansAt, formatSpans, insertedRange, patched, sameSpans, spansText, spliceSpans } from "../core/rich-text";
```

  et ajouter en fin de fichier :

```ts
interface Snapshot {
  readonly spans: readonly TextSpan[];
  readonly start: number;
  readonly end: number;
}

const clamp = (v: number, hi: number): number => Math.min(hi, Math.max(0, v));

/** Attributs du caractère qui finit à l'unité UTF-16 `at` (règle T5) ; en tête ou texte vide : aucun. */
export function attrsBefore(spans: readonly TextSpan[], at: number): TextAttrs {
  let end = 0;
  for (const s of spans) {
    const start = end;
    end += s.text.length;
    if (s.text !== "" && at > start && at <= end) return s.attrs;
  }
  return {};
}

/** Attributs des segments non vides qui recouvrent [start, end). */
function attrsIn(spans: readonly TextSpan[], start: number, end: number): TextAttrs[] {
  const out: TextAttrs[] = [];
  let at = 0;
  for (const s of spans) {
    const s0 = at;
    at += s.text.length;
    if (s.text !== "" && s0 < end && at > start) out.push(s.attrs);
  }
  return out;
}

/** Patch d'une action (R8) sur des caractères d'attributs `list` : bascule (tous l'ont → retrait) ; taille de
 *  l'élément → retrait ; couleur `null` (« Défaut ») → retrait. */
function patchFor(a: FormatAction, list: readonly TextAttrs[], base: RichBase): TextAttrsPatch {
  if (a.type === "size") return { size: a.size === base.size ? null : a.size };
  if (a.type === "color") return { color: a.color };
  const flag = list.length > 0 && list.every((x) => x[a.type] === true) ? null : true;
  if (a.type === "bold") return { bold: flag };
  if (a.type === "italic") return { italic: flag };
  return { underline: flag };
}

/** La valeur commune, sinon "mixed". */
function one<T>(xs: readonly T[]): T | "mixed" {
  const first = xs[0];
  return first !== undefined && xs.every((x) => x === first) ? first : "mixed";
}

export function createRichEdit(initial: readonly TextSpan[], base: RichBase): RichEdit {
  let spans: readonly TextSpan[] = initial;
  const n0 = spansText(initial).length;
  let sel = { start: n0, end: n0 };
  let pending: TextAttrsPatch | null = null;
  /** Suite de frappe en cours (R10, HC7b-11) : une seule étape, coupée par toute autre action ou un déplacement. */
  let typing = false;
  const past: Snapshot[] = [];
  const future: Snapshot[] = [];

  const snap = (): Snapshot => ({ spans, start: sel.start, end: sel.end });
  const push = (): void => {
    past.push(snap());
    future.length = 0;
  };
  const restore = (s: Snapshot): void => {
    spans = s.spans;
    sel = { start: s.start, end: s.end };
    pending = null;
    typing = false;
  };
  /** Attributs d'une insertion au curseur : caractère précédent, puis l'attente. */
  const caretAttrs = (): TextAttrs => patched(attrsBefore(spans, sel.start), pending ?? {});

  return {
    state: () => ({ spans, start: sel.start, end: sel.end, pending }),
    text: () => spansText(spans),
    input(content, start, end) {
      const old = spansText(spans);
      const readable = start >= 0 && end >= 0;
      const s = readable ? clamp(Math.min(start, end), content.length) : content.length;
      const e = readable ? clamp(Math.max(start, end), content.length) : content.length;
      if (content === old) {
        sel = { start: s, end: e };
        return false;
      }
      if (!typing) {
        push();
        typing = true;
      }
      if (readable) {
        let next = editSpansAt(spans, content, s);
        const [a, b] = insertedRange(old, content, s);
        if (pending !== null && b > a) {
          next = formatSpans(next, a, b - a, pending);
          pending = null;
        }
        spans = next;
      } else {
        // PC9 : curseur illisible, différence sans borne (C7).
        spans = editSpans(spans, content);
      }
      sel = { start: s, end: e };
      return true;
    },
    select(start, end) {
      const n = spansText(spans).length;
      const s = clamp(Math.min(start, end), n);
      const e = clamp(Math.max(start, end), n);
      if (s === sel.start && e === sel.end) return;
      sel = { start: s, end: e };
      pending = null;
      typing = false;
    },
    insert(text) {
      if (text === "" && sel.start === sel.end) return;
      push();
      typing = false;
      spans = spliceSpans(spans, sel.start, sel.end, text, caretAttrs());
      pending = null;
      const at = sel.start + text.length;
      sel = { start: at, end: at };
    },
    format(a) {
      typing = false;
      if (sel.start === sel.end) {
        pending = { ...(pending ?? {}), ...patchFor(a, [caretAttrs()], base) };
        return false;
      }
      const patch = patchFor(a, attrsIn(spans, sel.start, sel.end), base);
      const next = formatSpans(spans, sel.start, sel.end - sel.start, patch);
      if (sameSpans(next, spans)) return false;
      push();
      spans = next;
      return true;
    },
    formatState() {
      const found = sel.start === sel.end ? [caretAttrs()] : attrsIn(spans, sel.start, sel.end);
      const list = found.length > 0 ? found : [{}];
      const all = (k: "bold" | "italic" | "underline"): boolean => list.every((x) => x[k] === true);
      return {
        bold: all("bold"),
        italic: all("italic"),
        underline: all("underline"),
        size: one(list.map((x) => x.size ?? base.size)),
        color: one(list.map((x) => x.color ?? "default")),
      };
    },
    undo() {
      const p = past.pop();
      if (p === undefined) return false;
      future.push(snap());
      restore(p);
      return true;
    },
    redo() {
      const f = future.pop();
      if (f === undefined) return false;
      past.push(snap());
      restore(f);
      return true;
    },
  };
}
```

- [ ] **Étape 5 : vert.** Commande bornée : 0 `×`.

- [ ] **Étape 6 : commit.**

```bash
cd "$WT" && git add apps/web/src/engine/rich-edit.ts && git add apps/web/src/engine/rich-edit.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): pure rich edit session model with local history" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Commande bornée et ses noms vus ; une ligne `Réutilisation :` par ligne `Réutilise :`.

---

<a id="tache-t8"></a>

### Tâche T8 — Mesure et dessin des cellules par segments

**Objectif.** Une cellule se mesure et se dessine par ses segments (R17), par le même chemin que les textes
(`layoutRich` puis `paintText`, C7 T10, CL4-4) : `cellContent` rend `spans`, `cellHeight` prend des segments,
`rowHeightsFor` les mesure, `cellTextBoxes` les porte, `cellLinesOf` les met en lignes (clé de cache sur les segments).
Une cellule de C10a (un segment sans attribut) se mesure et se dessine comme avant (effet de bord). Lève la part de
l'écart `tsc` de T2 qui touche ces tests. Scénario S1.

**Fichiers.**
- Modifier : `apps/web/src/engine/table-geom.ts:8-9` (imports), `:61-64` (`cellContent`), `:107-116` (`cellHeight`,
  `rowHeightsFor`) ; `apps/web/src/engine/render/table-paint.ts:5`, `:8-16` (`CellTextBox`), `:60` ;
  `apps/web/src/engine/render/canvas2d.ts:8` (import retiré), `:368-377` (`cellLinesOf`) ;
  `apps/web/src/engine/tools/table.ts:111` (appel de `cellHeight`, une ligne)
- Tests : `apps/web/src/engine/table-geom.test.ts`, `apps/web/src/engine/render/table-paint.test.ts`,
  `apps/web/src/engine/render/canvas2d.test.ts`, `apps/web/src/engine/tools/table.test.ts:307`, `:320`

**Interfaces.**
- Consomme (T2) : `TableCell.spans: readonly TextSpan[]`.
- Produit :

```ts
// engine/table-geom.ts
export function cellContent(t: TableData, rowId: string, colId: string): { readonly text: string; readonly spans: readonly TextSpan[]; readonly fill: string | null };
export function cellHeight(spans: readonly TextSpan[], size: number, colWidth: number, measure: Measure): number;
// engine/render/table-paint.ts
export interface CellTextBox { readonly row: string; readonly col: string; readonly text: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly spans: readonly TextSpan[] }
```

  T11 appelle `cellContent(...).spans` à l'ouverture d'une cellule et `cellHeight(spans, size, colWidth, measure)` à la
  validation. Ici, `tools/table.ts:111` passe provisoirement `plainSpans(content)` (même valeur qu'avant).
- Réutilise : `apps/web/src/engine/text-layout.ts:206` — `layoutRich(spans, base, boxWidth, measure)`,
  `richBoxHeight(lines)` (mesure des segments).
- Réutilise : `apps/web/src/engine/table-geom.ts:61`, `:108`, `:113` — `cellContent`, `cellHeight`, `rowHeightsFor`
  (étendus : segments au lieu du texte brut).
- Réutilise : `apps/web/src/engine/render/canvas2d.ts:369`, `render/table-paint.ts:53` — `cellLinesOf`,
  `cellTextBoxes` (étendus de `spans`).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web test -- src/engine/table-geom.test.ts src/engine/render/table-paint.test.ts src/engine/render/canvas2d.test.ts src/engine/tools/table.test.ts --reporter=verbose 2>&1 | grep -E "C7b|B1|×|FAIL|Test Files|Tests " | tail -40
```

Attendu : aucun `×` ; au moins 6 lignes `✓ … cellules par segments (C7b, R17) …` ; « mêmes fillText qu'un texte d'un
segment (B1) » vert (inchangé) ; `tools/table.test.ts` vert. `tsc` : plus d'erreur dans ces trois fichiers de test ;
restent seulement `fake-core.ts` et `wasm-core.ts` si T6 n'est pas encore fusionnée.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé, aucun seuil changé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm apps/web/src/` ;
  `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm-formats apps/web/src/`.
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle.
- GC12 OD80 : `table-geom.ts`, `table-paint.ts`, `canvas2d.ts`, `tools/table.ts` sont aussi touchés par C10b :
  `spans` ajouté en fin de `CellTextBox` et du retour de `cellContent`, une ligne changée dans `cellLinesOf` et dans
  `tools/table.ts`.
- GC13 Périmètre : seuls les fichiers ci-dessus.
- GC14 `tsc` : seul le reste de l'écart de T2 (fichiers de T6).
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.

**Interdits.** Ne pas toucher `paintTableGrid` ni `paintText` ; ne rien changer d'autre dans `tools/table.ts` que la
ligne `:111` (T11 y branche les segments de la zone).

**Critère « terminé ».** Commande bornée verte, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges.** `table-geom.test.ts` : dans `T` (`:14`), la cellule devient
  `{ row: "r2", col: "c1", text: "Lundi", fill: "#fef08a", spans: plainSpans("Lundi") }` ; `:56-57` :
  `toEqual({ text: "Lundi", spans: plainSpans("Lundi"), fill: "#fef08a" })` et `toEqual({ text: "", spans: plainSpans(""), fill: null })` ;
  `:61`, `:64`, `:71`, `:72` : `cellHeight(plainSpans(""), …)`, `cellHeight(plainSpans(text), …)`,
  `cellHeight(plainSpans("aaaaaaaaaa bbbbbbbbbb cccccccccc"), …)` ; `:69` : la cellule gagne
  `spans: plainSpans("aaaaaaaaaa bbbbbbbbbb cccccccccc")`. Puis ajouter en fin de fichier :

```ts
describe("table-geom — cellules par segments (C7b, R17)", () => {
  /** Mesure par face : 10 par caractère, 30 en gras. */
  const byFace: Measure = (s, _size, face) => s.length * (face?.bold ? 30 : 10);

  it("cellHeight : segments mesurés avec leur face ; un mot gras qui ne tient plus passe à la ligne", () => {
    const plainH = cellHeight(plainSpans("aaaa aaaa"), 36, 240, byFace);
    const boldH = cellHeight([{ text: "aaaa aaaa", attrs: { bold: true } }], 36, 240, byFace);
    expect(plainH).toBe(36 * 1.25 + 2 * TABLE_PADDING);
    expect(boldH).toBe(2 * 36 * 1.25 + 2 * TABLE_PADDING);
  });

  it("cellHeight : un segment de taille 72 fixe la hauteur de sa ligne", () => {
    expect(cellHeight([plainSpans("Le ")[0]!, { text: "chat", attrs: { size: 72 } }], 36, 240, narrow)).toBe(72 * 1.25 + 2 * TABLE_PADDING);
  });

  it("cellule sans attribut : même hauteur que le texte brut d'avant (C10a)", () => {
    expect(cellHeight(plainSpans("Lundi"), 36, 240, narrow)).toBe(richBoxHeight(layoutRich(plainSpans("Lundi"), { size: 36 }, 240 - 2 * TABLE_PADDING, narrow)) + 2 * TABLE_PADDING);
  });

  it("rowHeightsFor : mesure les segments de chaque cellule", () => {
    const big: TableData = { ...T, cells: [{ row: "r1", col: "c1", text: "chat", fill: null, spans: [{ text: "chat", attrs: { size: 72 } }] }] };
    expect(rowHeightsFor(big, [240, 100], narrow)[0]).toBe(72 * 1.25 + 2 * TABLE_PADDING);
  });

  it("cellContent : segments de la cellule ; cellule absente : un segment vide", () => {
    const rich: TableData = { ...T, cells: [{ row: "r1", col: "c1", text: "ab", fill: null, spans: [{ text: "ab", attrs: { bold: true } }] }] };
    expect(cellContent(rich, "r1", "c1").spans).toEqual([{ text: "ab", attrs: { bold: true } }]);
    expect(cellContent(rich, "r2", "c2").spans).toEqual(plainSpans(""));
  });
});
```

  `table-paint.test.ts` : dans `T` (`:13-17`), chaque cellule gagne `spans` (`plainSpans("")`, `plainSpans("Lundi")`,
  `plainSpans("fantôme")`, avec `import { plainSpans } from "../../core/rich-text";`) ; l'attente `:46` gagne
  `spans: plainSpans("Lundi")` ; ajouter :

```ts
describe("table-paint — cellules par segments (C7b, R17)", () => {
  it("cellTextBoxes porte les segments de la cellule", () => {
    const rich: TableData = { ...T, cells: [{ row: "r2", col: "c1", text: "Le chat", fill: null, spans: [plainSpans("Le ")[0]!, { text: "chat", attrs: { bold: true } }] }] };
    expect(cellTextBoxes(rich)[0]?.spans).toEqual([{ text: "Le ", attrs: {} }, { text: "chat", attrs: { bold: true } }]);
  });
});
```

  `canvas2d.test.ts` : dans `TABLE` (`:667`), les cellules gagnent `spans: [{ text: "Lundi", attrs: {} }]` et
  `spans: [{ text: "", attrs: {} }]` ; ajouter dans le bloc « Canvas2DRenderer — tableau (C10a) », après le test
  « mêmes fillText qu'un texte d'un segment (B1) » (qui reste inchangé) :

```ts
  it("cellules par segments (C7b, R17) : le segment gras rouge est peint avec sa police et sa couleur", () => {
    const rich: TableElement = {
      ...TABLE,
      table: { ...TABLE.table, cells: [{ row: "r1", col: "c1", text: "Le chat", fill: null, spans: [{ text: "Le ", attrs: {} }, { text: "chat", attrs: { bold: true, color: "#dc2626" } }] }] },
    };
    const texts = draw([rich]).scene.texts;
    expect(texts).toContainEqual(expect.objectContaining({ text: "chat", font: 'bold 36px "Atkinson Hyperlegible", system-ui, sans-serif', fill: "#dc2626" }));
    expect(texts).toContainEqual(expect.objectContaining({ text: "Le ", fill: "#000000" }));
  });

  it("cellules par segments (C7b, R17) : mêmes textes, autres segments : lignes recalculées sans invalidate (clé du cache)", () => {
    // Même renderer, même id, mêmes textes : seule la clé du cache (segments) peut faire voir le gras.
    let el: TableElement = TABLE;
    const scene = new FakeCtx();
    const src: SceneSource = { element: () => el, outline: () => null };
    const r = new Canvas2DRenderer(asCtx(scene), null, src, {});
    r.resize(100, 100, 1);
    const page = { id: "p", elementIds: ["tb"] };
    r.drawScene(page, IDENTITY, new Set());
    el = { ...TABLE, table: { ...TABLE.table, cells: [{ row: "r1", col: "c1", text: "Lundi", fill: null, spans: [{ text: "Lundi", attrs: { bold: true } }] }] } };
    r.drawScene(page, IDENTITY, new Set());
    expect(scene.texts.at(-1)).toMatchObject({ text: "Lundi", font: 'bold 36px "Atkinson Hyperlegible", system-ui, sans-serif' });
  });
```

  `tools/table.test.ts:307` et `:320` : `const h = cellHeight(plainSpans(long), 36, 240, narrow);` (ajouter
  `import { plainSpans } from "../../core/rich-text";`).

- [ ] **Étape 3 : vérifier le rouge.** Commande bornée : `×` (cellHeight lit encore un texte, `spans` absent des
  boîtes et de `cellContent`).

- [ ] **Étape 4 : code.** `table-geom.ts` : import `:8` `import type { Bounds, CoreDocument, Matrix, TableData, TextSpan } from "../core/api";`.

```ts
export function cellContent(t: TableData, rowId: string, colId: string): { readonly text: string; readonly spans: readonly TextSpan[]; readonly fill: string | null } {
  const c = t.cells.find((x) => x.row === rowId && x.col === colId);
  return { text: c?.text ?? "", spans: c?.spans ?? plainSpans(""), fill: c?.fill ?? null };
}
```

```ts
/** Hauteur exigée par les segments `spans` dans une colonne de `colWidth` (T5, B1, C7b R17) : lignes du dessin + deux marges. */
export function cellHeight(spans: readonly TextSpan[], size: number, colWidth: number, measure: Measure): number {
  return richBoxHeight(layoutRich(spans, { size }, innerWidth(colWidth), measure)) + 2 * TABLE_PADDING;
}

/** Hauteur exigée de chaque ligne aux largeurs `colWidths` (Uniformiser, T11) ; cellule vide : une ligne de texte. */
export function rowHeightsFor(t: TableData, colWidths: readonly number[], measure: Measure): number[] {
  return t.rows.map((r) =>
    Math.max(...t.cols.map((c, i) => cellHeight(cellContent(t, r.id, c.id).spans, t.size, colWidths[i] ?? c.width, measure))),
  );
}
```

  `table-paint.ts` : `import type { TableData, TextSpan } from "../../core/api";` ; `CellTextBox` gagne en fin
  `readonly spans: readonly TextSpan[];` ; `:60` :
  `out.push({ row: cell.row, col: cell.col, text: cell.text, ...cellInnerBox(t, at), spans: cell.spans });`.
  `canvas2d.ts` : retirer `import { plainSpans } from "../../core/rich-text";` (`:8`, plus d'autre usage :
  `grep -n plainSpans src/engine/render/canvas2d.ts` vide) ; `cellLinesOf` :

```ts
  /** Lignes de chaque cellule au texte non vide (B1, C7b R17) : `layoutRich` des segments de la cellule. */
  private cellLinesOf(ctx: CanvasRenderingContext2D, id: string, t: TableData, boxes: readonly CellTextBox[]): readonly (readonly RichLine[])[] {
    const key = `${t.size}|${JSON.stringify(boxes.map((b) => [b.w, b.spans]))}`;
    const cached = this.cellLines.get(id);
    if (cached && cached.key === key) return cached.lines;
    const measure = measureWith(ctx);
    const lines = boxes.map((b) => layoutRich(b.spans, { size: t.size }, b.w, measure));
    this.cellLines.set(id, { key, lines });
    return lines;
  }
```

  `tools/table.ts:111` : `rowHeight: cellHeight(plainSpans(content), o.size, o.colWidth, measure),` (`plainSpans` déjà
  importé).

- [ ] **Étape 5 : vert.** Commande bornée : 0 `×`. Contrôle `tsc` (GC14).

- [ ] **Étape 6 : commit.**

```bash
cd "$WT" && git add apps/web/src/engine/table-geom.ts && git add apps/web/src/engine/table-geom.test.ts && \
git add apps/web/src/engine/render/table-paint.ts && git add apps/web/src/engine/render/table-paint.test.ts && \
git add apps/web/src/engine/render/canvas2d.ts && git add apps/web/src/engine/render/canvas2d.test.ts && \
git add apps/web/src/engine/tools/table.ts && git add apps/web/src/engine/tools/table.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): measure and paint table cells by spans" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Commande bornée et ses noms vus ; état de l'écart `tsc` ; une ligne `Réutilisation :` par ligne
`Réutilise :`.

---

<a id="tache-t9"></a>

### Tâche T9 — Rangée « Format » de la barre (`ui/FormatRow.tsx`)

**Objectif.** Composant neuf de la barre des outils, sur le patron de `TableActionRow` (R13, DAR4) : montré quand
l'outil actif est Texte ou Tableau ; G, I, S (`aria-pressed`), quatre tailles (24, 36, 48, 72), « Défaut » puis quatre
pastilles (noir, rouge, bleu, vert, R14) ; boutons désactivés hors séance (`textFormat` nul) ; chaque bouton empêche
`pointerdown` et `mousedown` (la zone garde focus et sélection, la perte du focus ne valide pas). Boutons seulement,
aucun `<select>` ni `<input type=color>`. `ToolbarView.textFormat` facultatif (R15). Le branchement dans `Toolbar.tsx`
est fait par T13. Scénario S1.

**Fichiers.**
- Créer : `apps/web/src/ui/FormatRow.tsx`, `apps/web/src/ui/FormatRow.test.tsx`
- Modifier : `apps/web/src/ui/item-state.ts:1-14` (`ToolbarView.textFormat`), `apps/web/src/ui/rb.css` (fin de fichier)

**Interfaces.**
- Consomme (T2) : `FormatAction`, `FormatState` (`engine/rich-edit.ts`) ; `TEXT_SIZES` (`engine/text-layout.ts:10`,
  existant).
- Produit :

```ts
// ui/item-state.ts
ToolbarView.textFormat?: FormatState | null;      // absent ou null : aucune séance de saisie (PC9 de C10a : facultatif)
// ui/FormatRow.tsx
export interface TextColor { readonly id: string; readonly label: string; readonly color: string | null }
export const TEXT_COLORS: readonly TextColor[];   // defaut (null), noir #000000, rouge #dc2626, bleu #1d4ed8, vert #15803d
export const FORMAT_TOOLS: readonly string[];      // ["text", "table"] (choix du moteur)
export function FormatRow(props: { view: Accessor<ToolbarView>; act: (a: FormatAction) => void }): JSX.Element;
```

  Attributs posés (lus par T13 et T14) : `[data-format-sep]` (séparateur), `button[data-format="bold"|"italic"|"underline"]`,
  `button[data-format-size="24"|"36"|"48"|"72"]`, `button[data-format-color="defaut"|"noir"|"rouge"|"bleu"|"vert"]`,
  `aria-pressed` sur chacun, `aria-label` (« Gras », « Italique », « Souligné », « Taille 24 »…, « Défaut »…).
- Réutilise : `apps/web/src/engine/engine.ts:205`, `:523` ; `ui/item-state.ts:5` — patron `tableFill` : état publié
  dans `ToolbarView` (ici `textFormat?`), action relayée par une fonction (`act`, branchée par T13 sur
  `ToolbarHost.textFormat`).
- Réutilise : aucun module existant (nouveau module) — `apps/web/src/ui/FormatRow.tsx` : `FormatRow(props: { view, act })`
  (`TableActionRow` de `ui/Toolbar.tsx:111` est propre au tableau : actions de `TABLE_ACTIONS`).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web test -- src/ui/FormatRow.test.tsx src/ui/Toolbar.test.tsx src/ui/item-state.test.ts --reporter=verbose 2>&1 | grep -E "Format|switch|×|FAIL|Test Files|Tests " | tail -30
```

Attendu : aucun `×` ; au moins 6 lignes `✓ rangée Format (C7b, R13-R15) > …` dont « pointerdown et mousedown empêchés
sur chaque bouton » ; `✓ … aucun switch sur l'identifiant, aucun px …` (`Toolbar.test.tsx`, qui lit aussi
`FormatRow.tsx`). `tsc` : seul l'écart de T2 s'il reste.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé, aucun seuil changé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm apps/web/src/` ;
  `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm-formats apps/web/src/`.
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle.
- GC11 Interface : dans `ui/`, aucun `switch`, aucune taille en `px` dans un `.tsx` (commentaires compris), libellés en
  français, `aria-label` sur chaque bouton (aucune icône seule), cibles d'au moins `--rb-btn`.
- GC13 Périmètre : seuls les fichiers ci-dessus (`Toolbar.tsx` est à T13 ; `toolbar.ts` n'est pas touché, R14).
- GC14 `tsc` : seul l'écart de T2 s'il reste.
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.

**Interdits.** Aucun `<select>`, aucun `<input type=color>` ; ne pas ajouter la rangée au catalogue de l'éditeur de
profils (`profile-edit.ts`) ni à `toolbar.ts` ; ne pas toucher `Toolbar.tsx`.

**Critère « terminé ».** Commande bornée verte, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : test rouge.** Créer `apps/web/src/ui/FormatRow.test.tsx` :

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FormatAction, FormatState } from "../engine/rich-edit";
import { FormatRow, TEXT_COLORS } from "./FormatRow";
import type { ToolbarView } from "./item-state";

afterEach(cleanup);

const VIEW: ToolbarView = { tool: "text", eraserMode: "partial", canUndo: false, canRedo: false, pageIndex: 0, pageCount: 1 };
const PLAIN: FormatState = { bold: false, italic: false, underline: false, size: 36, color: "default" };

function setup(view: ToolbarView = VIEW) {
  const act = vi.fn<(a: FormatAction) => void>();
  const [v, setV] = createSignal(view);
  const r = render(() => <FormatRow view={v} act={act} />);
  const all = (): HTMLButtonElement[] => [...r.container.querySelectorAll<HTMLButtonElement>("button")];
  const q = (sel: string): HTMLButtonElement => {
    const b = r.container.querySelector<HTMLButtonElement>(sel);
    if (b === null) throw new Error(`absent : ${sel}`);
    return b;
  };
  return { ...r, act, setV, all, q };
}

describe("rangée Format (C7b, R13-R15)", () => {
  it("outil Texte ou Tableau : séparateur, G, I, S, quatre tailles, Défaut puis quatre pastilles ; autre outil : rien", () => {
    const { container, setV, all } = setup();
    expect(container.querySelector("[data-format-sep]")).not.toBeNull();
    expect(all().map((b) => b.getAttribute("aria-label"))).toEqual([
      "Gras", "Italique", "Souligné", "Taille 24", "Taille 36", "Taille 48", "Taille 72", "Défaut", "Noir", "Rouge", "Bleu", "Vert",
    ]);
    expect(all().slice(0, 3).map((b) => b.textContent)).toEqual(["G", "I", "S"]);
    setV({ ...VIEW, tool: "table" });
    expect(all()).toHaveLength(12);
    setV({ ...VIEW, tool: "pen" });
    expect(all()).toHaveLength(0);
    expect(container.querySelector("[data-format-sep]")).toBeNull();
  });

  it("hors séance (textFormat absent ou null) : tous grisés ; séance ouverte : tous actifs", () => {
    const { setV, all } = setup();
    expect(all().every((b) => b.disabled)).toBe(true);
    setV({ ...VIEW, textFormat: null });
    expect(all().every((b) => b.disabled)).toBe(true);
    setV({ ...VIEW, textFormat: PLAIN });
    expect(all().every((b) => !b.disabled)).toBe(true);
  });

  it("aria-pressed : G, I, S selon l'état ; taille de l'élément et « Défaut » enfoncés sans attribut ; mixed : aucun (R15)", () => {
    const { setV, q } = setup({ ...VIEW, textFormat: PLAIN });
    const pressed = (sel: string): string | null => q(sel).getAttribute("aria-pressed");
    expect([pressed('[data-format="bold"]'), pressed('[data-format-size="36"]'), pressed('[data-format-color="defaut"]')]).toEqual(["false", "true", "true"]);
    setV({ ...VIEW, textFormat: { ...PLAIN, bold: true, size: 72, color: "#dc2626" } });
    expect([pressed('[data-format="bold"]'), pressed('[data-format-size="72"]'), pressed('[data-format-size="36"]'), pressed('[data-format-color="rouge"]'), pressed('[data-format-color="defaut"]')]).toEqual(["true", "true", "false", "true", "false"]);
    setV({ ...VIEW, textFormat: { ...PLAIN, size: "mixed", color: "mixed" } });
    expect([...document.querySelectorAll("[data-format-size], [data-format-color]")].some((b) => b.getAttribute("aria-pressed") === "true")).toBe(false);
  });

  it("clic : act reçoit l'action — bascule, taille, couleur, null pour « Défaut » (R8)", () => {
    const { act, q } = setup({ ...VIEW, textFormat: PLAIN });
    fireEvent.click(q('[data-format="bold"]'));
    fireEvent.click(q('[data-format="underline"]'));
    fireEvent.click(q('[data-format-size="48"]'));
    fireEvent.click(q('[data-format-color="rouge"]'));
    fireEvent.click(q('[data-format-color="defaut"]'));
    expect(act.mock.calls.map((c) => c[0])).toEqual([
      { type: "bold" }, { type: "underline" }, { type: "size", size: 48 }, { type: "color", color: "#dc2626" }, { type: "color", color: null },
    ]);
  });

  it("pointerdown et mousedown empêchés sur chaque bouton : la zone garde le focus et la sélection (R13)", () => {
    const { all } = setup({ ...VIEW, textFormat: PLAIN });
    for (const b of all()) {
      for (const type of ["pointerdown", "mousedown"]) {
        const e = new Event(type, { bubbles: true, cancelable: true });
        b.dispatchEvent(e);
        expect(e.defaultPrevented, `${type} ${b.getAttribute("aria-label")}`).toBe(true);
      }
    }
  });

  it("TEXT_COLORS : Défaut, noir, rouge, bleu, vert du stylo (R14)", () => {
    expect(TEXT_COLORS.map((c) => [c.id, c.color])).toEqual([
      ["defaut", null], ["noir", "#000000"], ["rouge", "#dc2626"], ["bleu", "#1d4ed8"], ["vert", "#15803d"],
    ]);
  });
});
```

- [ ] **Étape 3 : vérifier le rouge.** Commande bornée : `FAIL` (module `./FormatRow` introuvable).

- [ ] **Étape 4 : `item-state.ts`.** Ajouter `import type { FormatState } from "../engine/rich-edit";` et, dans
  `ToolbarView` après `tableCell?` :

```ts
  /** État de la barre de format (C7b, R15) ; absent ou null : aucune séance de saisie (boutons grisés). */
  readonly textFormat?: FormatState | null;
```

- [ ] **Étape 5 : composant.** Créer `apps/web/src/ui/FormatRow.tsx` :

```tsx
/**
 * Rangée « Format » (C7b, R13-R15, DAR4) : outil Texte ou Tableau ; G, I, S, quatre tailles, « Défaut » puis quatre
 * pastilles ; grisée hors séance de saisie (`textFormat` nul), sans changer de hauteur. Chaque bouton empêche
 * `pointerdown` et `mousedown` : la zone de saisie garde focus et sélection, et la perte du focus ne valide pas.
 * Boutons seulement (aucun champ qui prendrait le focus). Hors du catalogue de l'éditeur de profils.
 */
import { For, Show, type Accessor, type JSX } from "solid-js";
import type { FormatAction, FormatState } from "../engine/rich-edit";
import { TEXT_SIZES } from "../engine/text-layout";
import type { ToolbarView } from "./item-state";

export interface TextColor {
  readonly id: string;
  readonly label: string;
  /** null : « Défaut », l'attribut est retiré (couleur de l'élément). */
  readonly color: string | null;
}

/** Couleurs de la barre (R14) : les trois du stylo, plus un vert contrasté sur fond blanc. */
export const TEXT_COLORS: readonly TextColor[] = [
  { id: "defaut", label: "Défaut", color: null },
  { id: "noir", label: "Noir", color: "#000000" },
  { id: "rouge", label: "Rouge", color: "#dc2626" },
  { id: "bleu", label: "Bleu", color: "#1d4ed8" },
  { id: "vert", label: "Vert", color: "#15803d" },
];

/** Outils (choix du moteur) dont la rangée est montrée. */
export const FORMAT_TOOLS: readonly string[] = ["text", "table"];

interface Toggle {
  readonly id: "bold" | "italic" | "underline";
  readonly label: string;
  readonly name: string;
}
const TOGGLES: readonly Toggle[] = [
  { id: "bold", label: "G", name: "Gras" },
  { id: "italic", label: "I", name: "Italique" },
  { id: "underline", label: "S", name: "Souligné" },
];

/** Le bouton ne prend jamais le focus (R13). */
const keep = (e: Event): void => e.preventDefault();

export function FormatRow(props: { view: Accessor<ToolbarView>; act: (a: FormatAction) => void }): JSX.Element {
  const st = (): FormatState | null => props.view().textFormat ?? null;
  const off = (): boolean => st() === null;
  return (
    <Show when={FORMAT_TOOLS.includes(props.view().tool)}>
      <span class="rb-sep" role="separator" data-format-sep />
      <For each={TOGGLES}>
        {(t) => (
          <button
            type="button"
            class="rb-format"
            data-format={t.id}
            aria-label={t.name}
            title={t.name}
            aria-pressed={st()?.[t.id] === true}
            disabled={off()}
            onPointerDown={keep}
            onMouseDown={keep}
            onClick={() => props.act({ type: t.id })}
          >
            {t.label}
          </button>
        )}
      </For>
      <For each={TEXT_SIZES}>
        {(size) => (
          <button
            type="button"
            class="rb-format"
            data-format-size={String(size)}
            aria-label={`Taille ${size}`}
            title={`Taille ${size}`}
            aria-pressed={st()?.size === size}
            disabled={off()}
            onPointerDown={keep}
            onMouseDown={keep}
            onClick={() => props.act({ type: "size", size })}
          >
            {size}
          </button>
        )}
      </For>
      <For each={TEXT_COLORS}>
        {(c) => (
          <button
            type="button"
            class="rb-preset rb-format"
            data-format-color={c.id}
            aria-label={c.label}
            title={c.label}
            aria-pressed={st()?.color === (c.color ?? "default")}
            disabled={off()}
            onPointerDown={keep}
            onMouseDown={keep}
            onClick={() => props.act({ type: "color", color: c.color })}
          >
            <span class="rb-swatch" aria-hidden="true" style={{ "background-color": c.color ?? "transparent" }} />
            {c.label}
          </button>
        )}
      </For>
    </Show>
  );
}
```

  Si Solid rend `aria-pressed={false}` sans attribut (au lieu de `"false"`), remplacer chaque expression par
  `String(<expression>)` et garder le test tel quel.

- [ ] **Étape 6 : style.** En fin de `apps/web/src/ui/rb.css` :

```css
/* Rangée Format (C7b, R13) : G, I, S lisibles d'un coup d'œil ; mêmes cibles que la barre (--rb-btn), aucun saut de
   hauteur à l'ouverture ni à la validation (boutons toujours présents, seulement grisés). */
.rb-format { font-variant-numeric: tabular-nums; }
.rb-format[data-format="bold"] { font-weight: 700; }
.rb-format[data-format="italic"] { font-style: italic; }
.rb-format[data-format="underline"] { text-decoration: underline; }
```

- [ ] **Étape 7 : vert.** Commande bornée : 0 `×`, contrôle « aucun switch, aucun px » vert.

- [ ] **Étape 8 : commit.**

```bash
cd "$WT" && git add apps/web/src/ui/FormatRow.tsx && git add apps/web/src/ui/FormatRow.test.tsx && \
git add apps/web/src/ui/item-state.ts && git add apps/web/src/ui/rb.css && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(ui): format row for bold, italic, underline, size and colour" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Commande bornée et ses noms vus ; une ligne `Réutilisation :` par ligne `Réutilise :`.

---

<a id="tache-t10"></a>

### Tâche T10 — Zone de saisie contenteditable (`app/text-editor.ts`)

**Objectif.** La zone de saisie passe d'un `<textarea>` à un `<div contenteditable>` pour l'outil Texte et les cellules
(R1, R2), même id `#texte-edition`, même fabrique et même placement (`cssMatrix`). Le navigateur mute le DOM à la
frappe et pendant la composition ; hors composition, chaque `input` et la fin d'une composition relisent texte et
sélection (`rich-dom.ts`) et les appliquent au modèle (`createRichEdit`), puis le DOM est redessiné s'il diffère (R3,
R4). Entrée, collage, dépôt, gras natif et annulation native sont pris à `beforeinput` ou à leur événement (R3, R10,
R12) ; aucun `execCommand`. Règles IME (R5) : rien pendant la composition ; à `compositionend`, relire, redessiner,
puis relayer. Raccourcis Ctrl ou Cmd + B, I, U, Z, Y (R10, R11). Format en attente gardé à travers les
`selectionchange` de la composition et du redessin (R9). `formatChanged` relayé à l'outil (R15, PC12). Les quinze
cas du test actuel (IME, Échap, perte du focus, navigation, fond) restent, à l'identique (R26). Scénario S3.

**Fichiers.**
- Modifier : `apps/web/src/app/text-editor.ts` (réécrit ; `TEXT_EDITOR_ID`, `EditorMove`, `editorMove`, `cssMatrix`
  gardés tels quels)
- Tests : `apps/web/src/app/text-editor.test.ts` (réécrit sur happy-dom, mêmes cas + bloc C7b)

**Interfaces.**
- Consomme (T3) : `renderSpans(root, spans, base)`, `sameRender(root, spans)`, `readText(root)`,
  `readSelection(root): DomSelection | null`, `setSelection(root, start, end)` (`app/rich-dom.ts`).
- Consomme (T7) : `createRichEdit(initial, base): RichEdit` et ses méthodes ; types `FormatAction`, `FormatState`
  (`engine/rich-edit.ts`).
- Produit :

```ts
// app/text-editor.ts
export interface TextEditorEvents {
  compositionStart(): void; compositionEnd(): void; requestCommit(): void;
  navigate?(move: EditorMove): boolean;
  /** C7b (R15) : sélection, attente ou segments changés : l'outil republie l'état de la barre. */
  formatChanged?(): void;
}
export interface TextEditor extends TextEditorHost {
  readonly element: HTMLElement;                       // était HTMLTextAreaElement
  follow(camera: Camera): void;
  spans(): readonly TextSpan[];                        // fermée : un segment vide
  format(a: FormatAction): void;                       // fermée ou en composition : rien
  formatState(): FormatState | null;                   // fermée : null
}
export function formatKey(e: KeyMods & { readonly key: string }): FormatAction | null;   // Ctrl/Cmd + B, I, U, jamais Alt
export function historyKey(e: KeyMods & { readonly key: string; readonly shiftKey?: boolean }): "undo" | "redo" | null;
export const plainPaste: (s: string) => string;          // \r\n et \r → \n
export function createTextEditor(parent: HTMLElement, events: () => TextEditorEvents | null): TextEditor; // signature gardée
```

  `KeyMods = { readonly ctrlKey?: boolean; readonly metaKey?: boolean; readonly altKey?: boolean }`. T11 ajoute
  `spans`, `format`, `formatState` à `TextEditorHost` (mêmes signatures) et `formatChanged` aux outils ; T13 lit
  `#texte-edition` comme un `HTMLElement`.
- Réutilise : `apps/web/src/app/text-editor.ts:36`, `:54` — `editorMove(e, value, start, end)` (sur le texte du modèle
  et la sélection UTF-16 relue, R19), `cssMatrix(camera, m)` : gardés tels quels.
- Réutilise : `apps/web/src/app/text-editor.ts:60` — `createTextEditor(parent, events)` : même fabrique, corps
  contenteditable ; `TextEditorEvents.formatChanged?()` ajouté (étendre).
- Réutilise : `apps/web/src/engine/text-layout.ts:23` — `textFont(size)` (police du conteneur, défaut de l'élément ;
  les segments ont la leur par `rich-dom.ts`).
- Réutilise : `apps/web/src/platform/paste.ts:12` — `isEditable(target)` : rien à changer, la zone contenteditable est
  éditable, le collage global d'image l'ignore (test d'appui).
- Réutilise : `apps/web/src/engine/input/keys.ts:17` — `inEditable` (par `keyAction`) : rien à changer, Ctrl+Z dans la
  zone n'annule pas le document (test d'appui).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web test -- src/app/text-editor.test.ts src/app/rich-dom.test.ts src/engine/tools/text.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -60
```

Attendu : aucun `×` ; 9 lignes `✓ zone de saisie du texte (CL4-2, CL4-3) > …`, 6 lignes `✓ zone de saisie — navigation
du tableau (C10a, DAC3) > …` (les quinze cas d'avant), au moins 12 lignes `✓ zone de saisie riche (C7b) > …` dont
« Ctrl+B puis composition « に » : le format en attente survit aux selectionchange » ; `text.test.ts` vert sans
changement. `tsc` : seul l'écart de T2 s'il reste.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé, aucun seuil changé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm apps/web/src/` ;
  `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm-formats apps/web/src/`.
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle (ni ProseMirror, ni Lexical, ni Tiptap, R20).
- GC13 Périmètre : seuls les deux fichiers ci-dessus (`board-session.ts` inchangé : même fabrique, même `element`).
- GC14 `tsc` : seul l'écart de T2 s'il reste.
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.

**Interdits.** Aucun `document.execCommand` ; aucun `<textarea>` gardé sur la scène (R1) ; ne jamais empêcher la frappe
ni `insertCompositionText` (le navigateur mute le DOM pendant l'IME) ; ne pas toucher `tools/text.ts` (T11),
`keys.ts`, `paste.ts`.

**Patron à ne pas reprendre.** La zone `<textarea>` actuelle (`text-editor.ts:60-135`) lit `.value` et laisse au
navigateur l'annulation, le gras natif (Ctrl+B d'un contenteditable) et le collage HTML : avec un contenteditable,
l'historique natif ignore nos redessins et `execCommand` pose des `<b>` que le modèle ne connaît pas. Chemin de
référence : la porte IME (`engine/tools/commit-gate.ts:16-45`, rien pendant la composition) et la contre-relecture du
cadrage (R3 : relire à `input` et à `compositionend`, `beforeinput` pour la structure).

**Critère « terminé ».** Commande bornée verte, `grep -n "execCommand\|textarea" apps/web/src/app/text-editor.ts` vide,
un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4) ; relever les quinze cas actuels :
  `pnpm --filter @roomboard/web test -- src/app/text-editor.test.ts --reporter=verbose 2>&1 | grep -c "✓"` (attendu 15).

- [ ] **Étape 2 : test rouge.** Remplacer `apps/web/src/app/text-editor.test.ts` par :

```ts
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TextSpan } from "../core/api";
import { fakeCore } from "../core/fake-core";
import { IDENTITY } from "../engine/camera";
import { keyAction } from "../engine/input/keys";
import type { InputSample } from "../engine/input/sampler";
import { createTextTool, type TextEditSession, type TextTool } from "../engine/tools/text";
import type { ToolContext } from "../engine/tools/tool";
import { isEditable } from "../platform/paste";
import { readSelection, readText, setSelection } from "./rich-dom";
import { createTextEditor, cssMatrix, editorMove, formatKey, historyKey, plainPaste, TEXT_EDITOR_ID, type TextEditorEvents } from "./text-editor";

const parents: HTMLElement[] = [];
afterEach(() => {
  for (const p of parents.splice(0)) p.remove();
  document.getSelection()?.removeAllRanges();
});

function mount(events: () => TextEditorEvents | null) {
  const parent = document.createElement("div");
  document.body.append(parent);
  parents.push(parent);
  const editor = createTextEditor(parent, events);
  return { parent, zone: editor.element, editor };
}

function recorder() {
  const calls: string[] = [];
  const events: TextEditorEvents = {
    compositionStart: () => calls.push("start"),
    compositionEnd: () => calls.push("end"),
    requestCommit: () => calls.push("commit"),
  };
  return { calls, events };
}

const plain = (text: string): TextSpan => ({ text, attrs: {} });
const session: TextEditSession = {
  page: "p", id: null, matrix: [1, 0, 0, 1, 100, 50], boxWidth: 600, color: "#1e40af", size: 48, initial: "Bonjour",
  spans: [plain("Bonjour")],
};
const withText = (spans: TextSpan[]): TextEditSession => ({ ...session, initial: spans.map((s) => s.text).join(""), spans });
const at = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });
const key = (k: string, o: KeyboardEventInit = {}): KeyboardEvent => new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...o });
const fire = (zone: HTMLElement, e: Event): Event => {
  zone.dispatchEvent(e);
  return e;
};
const before = (inputType: string): InputEvent => new InputEvent("beforeinput", { inputType, bubbles: true, cancelable: true });
const selectionChange = (): void => {
  document.dispatchEvent(new Event("selectionchange"));
};
/** Le navigateur insère `s` à la sélection (DOM aplati ici), place le curseur après, puis émet `input`. */
function typeIn(zone: HTMLElement, s: string): void {
  const sel = readSelection(zone) ?? { start: 0, end: 0 };
  const t = readText(zone);
  zone.textContent = t.slice(0, sel.start) + s + t.slice(sel.end);
  setSelection(zone, sel.start + s.length, sel.start + s.length);
  zone.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: s }));
}
/** Curseur ou sélection posés par l'utilisateur (clic, flèches) : DOM puis `selectionchange`. */
function caret(zone: HTMLElement, start: number, end = start): void {
  setSelection(zone, start, end);
  selectionChange();
}
const paste = (zone: HTMLElement, data: Record<string, string>): Event => {
  const e = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(e, "clipboardData", { value: { getData: (t: string) => data[t] ?? "" } });
  return fire(zone, e);
};
const style = (zone: HTMLElement): string => zone.getAttribute("style") ?? "";

describe("zone de saisie du texte (CL4-2, CL4-3)", () => {
  it("cssMatrix : caméra × matrice de l'élément", () => {
    expect(cssMatrix({ zoom: 2, tx: 10, ty: 20 }, [1, 0, 0, 1, 100, 50])).toBe("matrix(2, 0, 0, 2, 210, 120)");
    expect(cssMatrix(IDENTITY, [2, 0, 0, 3, 5, 6])).toBe("matrix(2, 0, 0, 3, 5, 6)");
  });

  it("montée cachée hors de la scène ; open : visible, placée, police du rendu, valeur initiale, focus", () => {
    const { parent, zone, editor } = mount(() => null);
    expect([...parent.children]).toEqual([zone]);
    expect(zone.id).toBe(TEXT_EDITOR_ID);
    expect(zone.hidden).toBe(true);
    expect(zone.getAttribute("contenteditable")).toBe("true");
    expect(zone.tagName).toBe("DIV");
    const focus = vi.spyOn(zone, "focus");
    editor.open(session, { zoom: 2, tx: 10, ty: 20 });
    expect(zone.hidden).toBe(false);
    expect(editor.value()).toBe("Bonjour");
    expect(zone.textContent).toBe("Bonjour");
    expect(style(zone)).toContain("matrix(2, 0, 0, 2, 210, 120)");
    expect(style(zone)).toContain("600px");
    expect(style(zone)).toContain("48px");
    expect(style(zone)).toMatch(/line-height: 1\.25/);
    expect(style(zone)).toMatch(/#1e40af|rgb\(30, 64, 175\)/);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(readSelection(zone)).toEqual({ start: 7, end: 7 });
  });

  it("close : zone cachée et vidée ; value, spans, formatState de la zone fermée", () => {
    const { zone, editor } = mount(() => null);
    editor.open(session, IDENTITY);
    expect(editor.value()).toBe("Bonjour");
    editor.close();
    expect(zone.hidden).toBe(true);
    expect(zone.childNodes).toHaveLength(0);
    expect([editor.value(), editor.spans(), editor.formatState()]).toEqual(["", [plain("")], null]);
  });

  it("composition : début et fin transmis à l'outil", () => {
    const { calls, events } = recorder();
    const { zone, editor } = mount(() => events);
    editor.open(session, IDENTITY);
    fire(zone, new Event("compositionstart", { bubbles: true }));
    fire(zone, new Event("compositionend", { bubbles: true }));
    expect(calls).toEqual(["start", "end"]);
  });

  it("Échap hors composition : validation demandée, touche gardée", () => {
    const { calls, events } = recorder();
    const { zone, editor } = mount(() => events);
    editor.open(session, IDENTITY);
    const e = fire(zone, key("Escape"));
    expect(calls).toEqual(["commit"]);
    expect(e.defaultPrevented).toBe(true);
    const enter = fire(zone, key("Enter"));
    expect(enter.defaultPrevented).toBe(false);
    expect(calls).toEqual(["commit"]);
  });

  it("Échap pendant la composition reste à l'IME : rien d'écrit avant compositionend (outil réel)", () => {
    const doc = fakeCore.blank();
    const page = doc.pageIds()[0] ?? "";
    const ctx: ToolContext = { doc, page: () => page, camera: () => IDENTITY, run: (cmd) => doc.apply(cmd) };
    let tool: TextTool | null = null;
    const { zone, editor } = mount(() => tool);
    tool = createTextTool(ctx, editor, () => ({ color: "#000000", size: 36 }), (s) => s.length * 10);
    tool.begin(1, [at(100, 200)]);
    tool.close(1, "end");
    expect(zone.hidden).toBe(false);
    fire(zone, new Event("compositionstart", { bubbles: true }));
    zone.textContent = "こん";
    const esc = fire(zone, key("Escape", { isComposing: true }));
    fire(zone, new Event("blur"));
    expect(esc.defaultPrevented).toBe(false);
    expect(doc.elementIds(page)).toEqual([]);
    expect(zone.hidden).toBe(false);
    zone.textContent = "こんにちは";
    setSelection(zone, 5, 5);
    fire(zone, new Event("compositionend", { bubbles: true }));
    const ids = doc.elementIds(page);
    expect(ids).toHaveLength(1);
    expect(doc.element(ids[0] ?? "")).toMatchObject({ kind: "text", text: { content: "こんにちは" } });
    expect(zone.hidden).toBe(true);
  });

  it("perte du focus : validation demandée ; zone fermée, la perte du focus ne redemande rien", () => {
    const { calls, events } = recorder();
    const { zone, editor } = mount(() => events);
    editor.open(session, IDENTITY);
    fire(zone, new Event("blur"));
    expect(calls).toEqual(["commit"]);
    editor.close();
    fire(zone, new Event("blur"));
    expect(calls).toEqual(["commit"]);
  });

  it("aucun outil branché : événements sans effet, sans erreur", () => {
    const { zone, editor } = mount(() => null);
    editor.open(session, IDENTITY);
    expect(() => {
      fire(zone, new Event("compositionstart", { bubbles: true }));
      fire(zone, new Event("compositionend", { bubbles: true }));
      fire(zone, key("Escape"));
      fire(zone, new Event("blur"));
      fire(zone, new InputEvent("input", { bubbles: true }));
      fire(zone, before("insertParagraph"));
      paste(zone, { "text/plain": "x" });
      selectionChange();
    }).not.toThrow();
  });

  it("la zone suit le zoom", () => {
    const { zone, editor } = mount(() => null);
    editor.follow({ zoom: 3, tx: 1, ty: 1 });
    expect(style(zone)).not.toContain("matrix(");
    editor.open(session, { zoom: 1, tx: 0, ty: 0 });
    editor.follow({ zoom: 2, tx: 10, ty: 20 });
    expect(style(zone)).toContain(cssMatrix({ zoom: 2, tx: 10, ty: 20 }, session.matrix));
    editor.close();
    editor.follow({ zoom: 5, tx: 0, ty: 0 });
    expect(style(zone)).toContain(cssMatrix({ zoom: 2, tx: 10, ty: 20 }, session.matrix));
  });
});

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
    const { zone, editor } = mount(() => events);
    editor.open(withText([plain("xy")]), IDENTITY);
    const tab = fire(zone, key("Tab"));
    expect([moves, tab.defaultPrevented]).toEqual([["next"], true]);
    answer = false;
    setSelection(zone, 1, 1);
    fire(zone, key("ArrowLeft"));
    expect(moves).toEqual(["next"]);
    setSelection(zone, 0, 0);
    const left = fire(zone, key("ArrowLeft"));
    expect([moves, left.defaultPrevented]).toEqual([["next", "left"], false]);
  });

  it("composition : aucune touche prise, navigate jamais appelé", () => {
    const moves: string[] = [];
    const events: TextEditorEvents = { ...recorder().events, navigate: (m) => (moves.push(m), true) };
    const { zone, editor } = mount(() => events);
    editor.open(session, IDENTITY);
    const tab = fire(zone, key("Tab", { isComposing: true }));
    expect([moves, tab.defaultPrevented]).toEqual([[], false]);
  });

  it("outil sans navigate (outil Texte) : Tab non pris, rien de demandé", () => {
    const r = recorder();
    const { zone, editor } = mount(() => r.events);
    editor.open(session, IDENTITY);
    const tab = fire(zone, key("Tab"));
    expect([r.calls, tab.defaultPrevented]).toEqual([[], false]);
  });

  it("fond : celui de la session (cellule, HC10-10), transparent sinon", () => {
    const { zone, editor } = mount(() => null);
    editor.open({ ...session, background: "#fef08a" }, IDENTITY);
    expect(style(zone)).toMatch(/#fef08a|rgb\(254, 240, 138\)/);
    editor.close();
    editor.open(session, IDENTITY);
    expect(style(zone)).toContain("transparent");
  });
});

describe("zone de saisie riche (C7b)", () => {
  const B = { bold: true } as const;
  const counter = () => {
    let n = 0;
    const events: TextEditorEvents = { ...recorder().events, formatChanged: () => void n++ };
    return { events, count: () => n };
  };

  it("frappe relue : « aa », curseur au milieu, Ctrl+B, « a » : la deuxième lettre est grasse (S1, R3, R9)", () => {
    const { zone, editor } = mount(() => null);
    editor.open(withText([plain("aa")]), IDENTITY);
    caret(zone, 1);
    expect(fire(zone, key("b", { ctrlKey: true })).defaultPrevented).toBe(true);
    typeIn(zone, "a");
    selectionChange();
    expect(editor.spans()).toEqual([plain("a"), { text: "a", attrs: B }, plain("a")]);
    expect(zone.querySelectorAll("span")).toHaveLength(3);
    expect(readSelection(zone)).toEqual({ start: 2, end: 2 });
  });

  it("Ctrl+B puis composition « に » : le format en attente survit aux selectionchange ; un déplacement l'oublie (S3, R9)", () => {
    const { zone, editor } = mount(() => null);
    editor.open(withText([plain("ab")]), IDENTITY);
    fire(zone, key("b", { ctrlKey: true }));
    fire(zone, new Event("compositionstart", { bubbles: true }));
    zone.textContent = "abに";
    setSelection(zone, 3, 3);
    selectionChange();
    fire(zone, new InputEvent("input", { bubbles: true, inputType: "insertCompositionText", isComposing: true }));
    fire(zone, new Event("compositionend", { bubbles: true }));
    selectionChange();
    expect(editor.spans()).toEqual([plain("ab"), { text: "に", attrs: B }]);
    fire(zone, key("b", { ctrlKey: true }));
    caret(zone, 1);
    typeIn(zone, "x");
    expect(editor.spans()).toEqual([plain("axb"), { text: "に", attrs: B }]);
  });

  it("pendant la composition : aucune relecture, aucun redessin, aucun raccourci, aucune action de barre (R5)", () => {
    const { zone, editor } = mount(() => null);
    editor.open(withText([plain("ab")]), IDENTITY);
    fire(zone, new Event("compositionstart", { bubbles: true }));
    zone.textContent = "abこ";
    const kept = zone.firstChild;
    fire(zone, new InputEvent("input", { bubbles: true, isComposing: true }));
    const ctrlB = fire(zone, key("b", { ctrlKey: true, isComposing: true }));
    editor.format({ type: "bold" });
    expect(ctrlB.defaultPrevented).toBe(false);
    expect(zone.firstChild).toBe(kept);
    expect(editor.value()).toBe("ab");
    expect(editor.formatState()?.bold).toBe(false);
  });

  it("ordre à compositionend : relire puis relayer — la validation voit le texte composé (R5)", () => {
    const seen: string[] = [];
    const holder: { editor?: ReturnType<typeof createTextEditor> } = {};
    const events: TextEditorEvents = { ...recorder().events, compositionEnd: () => void seen.push(holder.editor?.value() ?? "") };
    const { zone, editor } = mount(() => events);
    holder.editor = editor;
    editor.open(withText([plain("")]), IDENTITY);
    fire(zone, new Event("compositionstart", { bubbles: true }));
    zone.textContent = "にほん";
    setSelection(zone, 3, 3);
    fire(zone, new Event("compositionend", { bubbles: true }));
    expect(seen).toEqual(["にほん"]);
  });

  it("Entrée : « \\n » inséré par le modèle (beforeinput empêché), une étape ; br de fin (R3, R4, R10)", () => {
    const { zone, editor } = mount(() => null);
    editor.open(withText([plain("ab")]), IDENTITY);
    expect(fire(zone, before("insertParagraph")).defaultPrevented).toBe(true);
    expect(editor.value()).toBe("ab\n");
    expect(zone.lastElementChild?.hasAttribute("data-rb-fin")).toBe(true);
    expect(fire(zone, before("insertLineBreak")).defaultPrevented).toBe(true);
    expect(editor.value()).toBe("ab\n\n");
    fire(zone, key("z", { ctrlKey: true }));
    expect(editor.value()).toBe("ab\n");
  });

  it("Ctrl+Z dans la zone annule la dernière mise en forme seule ; texte et sélection restent ; Ctrl+Y et historyRedo la remettent (S2, R10)", () => {
    const { zone, editor } = mount(() => null);
    editor.open(withText([plain("Le chat noir")]), IDENTITY);
    caret(zone, 8, 12);
    fire(zone, key("i", { ctrlKey: true }));
    expect(editor.spans()).toEqual([plain("Le chat "), { text: "noir", attrs: { italic: true } }]);
    expect(fire(zone, key("z", { ctrlKey: true })).defaultPrevented).toBe(true);
    expect(editor.spans()).toEqual([plain("Le chat noir")]);
    expect(readSelection(zone)).toEqual({ start: 8, end: 12 });
    fire(zone, key("y", { ctrlKey: true }));
    expect(editor.spans()[1]).toEqual({ text: "noir", attrs: { italic: true } });
    expect(fire(zone, before("historyUndo")).defaultPrevented).toBe(true);
    expect(editor.spans()).toEqual([plain("Le chat noir")]);
    expect(fire(zone, before("historyRedo")).defaultPrevented).toBe(true);
    expect(editor.spans()[1]).toEqual({ text: "noir", attrs: { italic: true } });
  });

  it("collage : texte simple seulement, attributs du caractère précédent, une étape (S4, R12)", () => {
    const { zone, editor } = mount(() => null);
    editor.open(withText([{ text: "Total", attrs: B }]), IDENTITY);
    caret(zone, 3);
    const e = paste(zone, { "text/plain": "x\r\ny", "text/html": "<b>z</b><img src=x>" });
    expect(e.defaultPrevented).toBe(true);
    expect(editor.spans()).toEqual([{ text: "Totx\nyal", attrs: B }]);
    expect(zone.querySelector("img, b")).toBeNull();
    fire(zone, key("z", { ctrlKey: true }));
    expect(editor.value()).toBe("Total");
  });

  it("dépôt dans la zone : refusé, ne remonte pas (R12, PC17)", () => {
    const { parent, zone, editor } = mount(() => null);
    editor.open(session, IDENTITY);
    const up = vi.fn();
    parent.addEventListener("drop", up);
    const e = fire(zone, new Event("drop", { bubbles: true, cancelable: true }));
    expect(e.defaultPrevented).toBe(true);
    expect(up).not.toHaveBeenCalled();
    expect(fire(zone, before("insertFromDrop")).defaultPrevented).toBe(true);
    expect(editor.value()).toBe("Bonjour");
  });

  it("barre : format(a) sur la sélection, zone ouverte ; formatState suit ; formatChanged à chaque changement (R8, R15, PC12)", () => {
    const c = counter();
    const { zone, editor } = mount(() => c.events);
    editor.open(withText([plain("Le chat")]), IDENTITY);
    const afterOpen = c.count();
    expect(afterOpen).toBeGreaterThan(0);
    caret(zone, 3, 7);
    editor.format({ type: "bold" });
    editor.format({ type: "color", color: "#dc2626" });
    expect(editor.spans()).toEqual([plain("Le "), { text: "chat", attrs: { bold: true, color: "#dc2626" } }]);
    expect(editor.formatState()).toEqual({ bold: true, italic: false, underline: false, size: 48, color: "#dc2626" });
    expect(readSelection(zone)).toEqual({ start: 3, end: 7 });
    expect(c.count()).toBeGreaterThanOrEqual(afterOpen + 3);
    editor.close();
    expect(c.count()).toBeGreaterThanOrEqual(afterOpen + 4);
  });

  it("gras natif jamais : beforeinput formatBold empêché, appliqué par le modèle ; Alt Gr (Ctrl+Alt+B) non pris", () => {
    const { zone, editor } = mount(() => null);
    editor.open(withText([plain("chat")]), IDENTITY);
    caret(zone, 0, 4);
    expect(fire(zone, before("formatBold")).defaultPrevented).toBe(true);
    expect(editor.spans()).toEqual([{ text: "chat", attrs: B }]);
    expect(fire(zone, key("b", { ctrlKey: true, altKey: true })).defaultPrevented).toBe(false);
    expect(editor.spans()).toEqual([{ text: "chat", attrs: B }]);
  });

  it("formatKey, historyKey, plainPaste : Ctrl ou Cmd, jamais Alt ; Ctrl+Maj+Z rétablit ; \\r\\n et \\r → \\n (R10-R12, PC16)", () => {
    expect(formatKey({ key: "B", ctrlKey: true })).toEqual({ type: "bold" });
    expect(formatKey({ key: "i", metaKey: true })).toEqual({ type: "italic" });
    expect(formatKey({ key: "u", ctrlKey: true })).toEqual({ type: "underline" });
    expect(formatKey({ key: "b", ctrlKey: true, altKey: true })).toBeNull();
    expect(formatKey({ key: "b" })).toBeNull();
    expect(historyKey({ key: "z", ctrlKey: true })).toBe("undo");
    expect(historyKey({ key: "Z", ctrlKey: true, shiftKey: true })).toBe("redo");
    expect(historyKey({ key: "y", metaKey: true })).toBe("redo");
    expect(historyKey({ key: "z", ctrlKey: true, altKey: true })).toBeNull();
    expect(plainPaste("a\r\nb\rc")).toBe("a\nb\nc");
  });

  it("raccourcis globaux et collage global : la zone est une cible éditable (keys.ts, paste.ts inchangés)", () => {
    const { zone, editor } = mount(() => null);
    editor.open(session, IDENTITY);
    expect(isEditable(zone)).toBe(true);
    expect(keyAction({ key: "z", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, isComposing: false, target: zone })).toBeNull();
  });

  it("DOM mis à mal par le navigateur (bloc ajouté) : relu, puis redessiné en segments (R3)", () => {
    const { zone, editor } = mount(() => null);
    editor.open(withText([{ text: "ab", attrs: B }]), IDENTITY);
    zone.innerHTML = '<span>ab</span><div>c</div>';
    const c = zone.querySelector("div")!.firstChild!;
    document.getSelection()?.setBaseAndExtent(c, 1, c, 1);
    fire(zone, new InputEvent("input", { bubbles: true, inputType: "insertParagraph" }));
    expect(editor.value()).toBe("ab\nc");
    expect(zone.querySelector("div")).toBeNull();
    expect(readSelection(zone)).toEqual({ start: 4, end: 4 });
  });
});
```

- [ ] **Étape 3 : vérifier le rouge.** Commande bornée : `×` sur le bloc C7b et sur les cas d'ouverture (la zone est
  encore un `<textarea>`, `formatKey` n'existe pas).

- [ ] **Étape 4 : code.** Remplacer `apps/web/src/app/text-editor.ts` par :

```ts
/**
 * Zone de saisie riche (D14, CL4-2, CL4-3 ; C7b R1-R5, R9-R12) : un `<div contenteditable>` visible, hors de `#stage`
 * (ses événements ne passent pas par l'échantillonneur), placé par la matrice CSS caméra × élément, en unités monde ;
 * police et interligne du rendu. Pour l'outil Texte et les cellules de l'outil Tableau (C10a DAC3). Le navigateur mute
 * le DOM à la frappe et pendant la composition IME (jamais nous) ; hors composition, chaque `input` et la fin d'une
 * composition relisent texte et sélection du DOM et les appliquent au modèle (`engine/rich-edit.ts`, différence ancrée
 * au curseur), puis le DOM est redessiné s'il diffère (`app/rich-dom.ts`). Entrée, collage, dépôt, gras natif et
 * annulation native sont pris à `beforeinput` ou à leur événement ; aucun `execCommand`. Relaie à l'outil actif la
 * composition, Échap, la perte du focus, Tab et les flèches au bord (`navigate`) et chaque changement de format
 * (`formatChanged`). L'outil seul écrit (une commande par validation, différée pendant une composition).
 */
import type { Matrix, TextSpan } from "../core/api";
import { plainSpans } from "../core/rich-text";
import type { Camera } from "../engine/camera";
import { createRichEdit, type FormatAction, type FormatState, type RichEdit } from "../engine/rich-edit";
import { textFont, TEXT_LINE_HEIGHT } from "../engine/text-layout";
import type { TextEditorHost, TextEditSession } from "../engine/tools/text";
import { readSelection, readText, renderSpans, sameRender, setSelection } from "./rich-dom";

export const TEXT_EDITOR_ID = "texte-edition";

/** Mouvement demandé par la zone (C10a, DAC3) : même union que `NavMove` de `engine/table-geom.ts` (PC7). */
export type EditorMove = "next" | "prev" | "left" | "right" | "up" | "down";

export interface TextEditorEvents {
  compositionStart(): void;
  compositionEnd(): void;
  requestCommit(): void;
  /** Tab, Maj+Tab, flèches au bord du texte ; vrai si l'outil prend la touche. Absent (outil Texte) : rien n'est pris. */
  navigate?(move: EditorMove): boolean;
  /** C7b (R15, PC12) : sélection, format en attente ou segments changés ; l'outil republie l'état de la barre. */
  formatChanged?(): void;
}

interface KeyMods {
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
}

interface MoveKey extends KeyMods {
  readonly key: string;
  readonly shiftKey?: boolean;
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

/** Raccourci de format (R11, PC16) : Ctrl ou Cmd + B, I, U ; jamais avec Alt (Alt Gr = Ctrl+Alt sous Windows). */
export function formatKey(e: KeyMods & { readonly key: string }): FormatAction | null {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return null;
  const k = e.key.toLowerCase();
  if (k === "b") return { type: "bold" };
  if (k === "i") return { type: "italic" };
  if (k === "u") return { type: "underline" };
  return null;
}

/** Annuler, rétablir dans la zone (R10, PC16) : Ctrl ou Cmd + Z ; Ctrl+Y ou Ctrl+Maj+Z ; jamais avec Alt. */
export function historyKey(e: KeyMods & { readonly key: string; readonly shiftKey?: boolean }): "undo" | "redo" | null {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return null;
  const k = e.key.toLowerCase();
  if (k === "z") return e.shiftKey ? "redo" : "undo";
  if (k === "y" && !e.shiftKey) return "redo";
  return null;
}

/** Texte simple du presse-papiers (R12) : `\r\n` et `\r` → « \n ». */
export const plainPaste = (s: string): string => s.replace(/\r\n?/g, "\n");

/** `beforeinput` de mise en forme natif (Ctrl+B d'un contenteditable) → action du modèle (R3). */
const FORMAT_INPUTS: Readonly<Record<string, FormatAction>> = {
  formatBold: { type: "bold" },
  formatItalic: { type: "italic" },
  formatUnderline: { type: "underline" },
};

export interface TextEditor extends TextEditorHost {
  readonly element: HTMLElement;
  /** Session ouverte : réapplique la matrice CSS pour la caméra donnée (CL4-15) ; fermée : rien. */
  follow(camera: Camera): void;
  /** Segments de la séance (C7b, R18) ; fermée : un segment vide. */
  spans(): readonly TextSpan[];
  /** Action de la barre (R8) ; fermée ou pendant une composition : rien (R5). */
  format(a: FormatAction): void;
  /** État de la barre (R15) ; fermée : null. */
  formatState(): FormatState | null;
}

/** Écran (px CSS) = caméra ∘ m : `matrix(z·a, z·b, z·c, z·d, z·e + tx, z·f + ty)`. */
export function cssMatrix(camera: Camera, m: Matrix): string {
  const z = camera.zoom;
  const [a, b, c, d, e, f] = m;
  return `matrix(${z * a}, ${z * b}, ${z * c}, ${z * d}, ${z * e + camera.tx}, ${z * f + camera.ty})`;
}

export function createTextEditor(parent: HTMLElement, events: () => TextEditorEvents | null): TextEditor {
  const doc = parent.ownerDocument;
  const zone = doc.createElement("div");
  zone.id = TEXT_EDITOR_ID;
  zone.hidden = true;
  zone.contentEditable = "true";
  zone.spellcheck = false;
  zone.setAttribute("role", "textbox");
  zone.setAttribute("aria-multiline", "true");
  zone.setAttribute("aria-label", "Texte");
  const s = zone.style;
  s.position = "absolute";
  s.left = "0px";
  s.top = "0px";
  s.transformOrigin = "0 0";
  s.margin = "0";
  s.padding = "0";
  s.border = "1px dashed #1e3a8a";
  s.background = "transparent";
  s.outline = "none";
  s.overflow = "hidden";
  s.whiteSpace = "pre-wrap";
  s.overflowWrap = "anywhere";
  s.zIndex = "3";
  let opened = false;
  let current: TextEditSession | null = null;
  let model: RichEdit | null = null;
  /** Composition IME en cours (R5) : ni relecture, ni redessin, ni raccourci, ni action de barre. */
  let composing = false;
  /** Redessin en cours (R4) : le `selectionchange` qu'il provoque n'oublie pas le format en attente (R9). */
  let redrawing = false;

  const changed = (): void => events()?.formatChanged?.();

  /** Redessine depuis le modèle si le DOM diffère (ou toujours), sélection remise par positions UTF-16. */
  const redraw = (force: boolean): void => {
    if (model === null || current === null) return;
    const st = model.state();
    if (!force && sameRender(zone, st.spans)) return;
    redrawing = true;
    renderSpans(zone, st.spans, { size: current.size });
    setSelection(zone, st.start, st.end);
    redrawing = false;
  };

  /** Relit le DOM après une frappe ou une composition (R3) ; curseur illisible : -1, -1 (PC9). */
  const sync = (): void => {
    if (model === null) return;
    const sel = readSelection(zone);
    model.input(readText(zone), sel?.start ?? -1, sel?.end ?? -1);
    redraw(false);
    changed();
  };

  const apply = (a: FormatAction): void => {
    if (model === null || composing) return;
    if (model.format(a)) redraw(false);
    changed();
  };

  const history = (which: "undo" | "redo"): void => {
    if (model === null) return;
    if (which === "undo" ? model.undo() : model.redo()) redraw(true);
    changed();
  };

  const insert = (text: string): void => {
    if (model === null) return;
    model.insert(text);
    redraw(true);
    changed();
  };

  const onSelection = (): void => {
    if (!opened || composing || redrawing || model === null) return;
    const sel = readSelection(zone);
    if (sel === null) return;
    model.select(sel.start, sel.end);
    changed();
  };

  zone.addEventListener("beforeinput", (e: InputEvent) => {
    if (e.isComposing || composing || model === null) return;
    const t = e.inputType;
    if (t === "insertParagraph" || t === "insertLineBreak") {
      e.preventDefault();
      insert("\n");
    } else if (t === "insertFromPaste" || t === "insertFromPasteAsQuotation") {
      // Un moteur qui n'émet pas `paste` d'abord : même texte simple.
      e.preventDefault();
      const text = e.dataTransfer?.getData("text/plain") ?? "";
      if (text !== "") insert(plainPaste(text));
    } else if (t === "insertFromDrop") {
      e.preventDefault();
    } else if (Object.hasOwn(FORMAT_INPUTS, t)) {
      e.preventDefault();
      apply(FORMAT_INPUTS[t]!);
    } else if (t === "historyUndo" || t === "historyRedo") {
      e.preventDefault();
      history(t === "historyUndo" ? "undo" : "redo");
    }
  });
  zone.addEventListener("input", (e: Event) => {
    if ((e as InputEvent).isComposing || composing) return;
    sync();
  });
  zone.addEventListener("compositionstart", () => {
    composing = true;
    events()?.compositionStart();
  });
  // PC13 : une composition dont le début aurait manqué reste protégée ; aucun effet sur le modèle.
  zone.addEventListener("compositionupdate", () => {
    composing = true;
  });
  zone.addEventListener("compositionend", () => {
    composing = false;
    // R5 : relire et appliquer, redessiner, puis seulement relayer (la validation lit `spans()`).
    sync();
    events()?.compositionEnd();
  });
  zone.addEventListener("keydown", (e: KeyboardEvent) => {
    // Pendant une composition, toute touche appartient à l'IME (choix d'un candidat, CL4-3) : rien n'est pris.
    if (e.isComposing || composing) return;
    if (e.key === "Escape") {
      e.preventDefault();
      events()?.requestCommit();
      return;
    }
    const fmt = formatKey(e);
    if (fmt !== null) {
      e.preventDefault();
      apply(fmt);
      return;
    }
    const h = historyKey(e);
    if (h !== null) {
      e.preventDefault();
      history(h);
      return;
    }
    const st = model?.state();
    const sel = readSelection(zone) ?? { start: st?.start ?? 0, end: st?.end ?? 0 };
    const move = editorMove(e, model?.text() ?? "", sel.start, sel.end);
    if (move !== null && events()?.navigate?.(move) === true) e.preventDefault();
  });
  zone.addEventListener("paste", (e: ClipboardEvent) => {
    if (composing) return;
    e.preventDefault();
    const text = e.clipboardData?.getData("text/plain") ?? "";
    if (text !== "") insert(plainPaste(text));
  });
  // R12, PC17 : le dépôt de fichiers reste sur la scène ; rien n'est déposé dans la zone, rien ne remonte.
  zone.addEventListener("drop", (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  });
  // Perte du focus : l'outil valide, ou attend compositionend si une composition est en cours (CL4-3).
  zone.addEventListener("blur", () => {
    if (opened) events()?.requestCommit();
  });
  parent.append(zone);

  return {
    element: zone,
    open(session: TextEditSession, camera: Camera) {
      opened = true;
      current = session;
      composing = false;
      model = createRichEdit(session.spans, { size: session.size, color: session.color });
      s.transform = cssMatrix(camera, session.matrix);
      s.width = `${session.boxWidth}px`;
      s.minHeight = `${session.size * TEXT_LINE_HEIGHT}px`;
      s.font = textFont(session.size);
      s.lineHeight = String(TEXT_LINE_HEIGHT);
      s.color = session.color;
      s.background = session.background ?? "transparent";
      zone.hidden = false;
      redraw(true);
      zone.focus();
      const st = model.state();
      setSelection(zone, st.start, st.end);
      doc.addEventListener("selectionchange", onSelection);
      changed();
    },
    close() {
      current = null;
      opened = false; // avant de cacher : le blur qui suit ne redemande rien
      composing = false;
      model = null;
      doc.removeEventListener("selectionchange", onSelection);
      zone.hidden = true;
      zone.replaceChildren();
      changed();
    },
    follow(camera) {
      if (current) s.transform = cssMatrix(camera, current.matrix);
    },
    value: () => (model === null ? "" : model.text()),
    spans: () => (model === null ? plainSpans("") : model.state().spans),
    format(a) {
      apply(a);
    },
    formatState: () => (model === null ? null : model.formatState()),
  };
}
```

- [ ] **Étape 5 : vert.** Commande bornée : 0 `×`. Les cas C7b qui émettent `compositionstart` avant leurs touches
  restent verts même si happy-dom ignorait `isComposing` (drapeau `composing`). Seul « composition : aucune touche
  prise, navigate jamais appelé » repose sur `isComposing` : s'il rougit pour cette raison, le rapport le dit en tête
  (message exact), sans modifier le test ni le code pour le contourner.

- [ ] **Étape 6 : contrôles.** `grep -n "execCommand\|textarea" apps/web/src/app/text-editor.ts` vide ; `tsc` (GC14).

- [ ] **Étape 7 : commit.**

```bash
cd "$WT" && git add apps/web/src/app/text-editor.ts && git add apps/web/src/app/text-editor.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): contenteditable rich text zone with IME-safe re-reading" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Commande bornée et ses noms vus (quinze cas d'avant et bloc C7b) ; tout manque de happy-dom rencontré ;
une ligne `Réutilisation :` par ligne `Réutilise :`.

---

<a id="tache-t11"></a>

### Tâche T11 — Outils Texte et Tableau, moteur : segments au commit, format, état

**Objectif.** Les outils passent par l'hôte riche (R18) : `TextEditorHost` gagne `spans()`, `format(a)`,
`formatState()` ; l'outil Texte ouvre sur `el.text.spans`, l'outil Tableau sur `cellContent(...).spans` ; une
validation = une commande (`SetText` ou `SetTableCell`) qui porte `spans`, hauteur mesurée sur eux ; texte et segments
inchangés : aucune commande ; mise en forme seule : la commande part (R6, S6). Les deux outils relaient `format`
(saisie ouverte, hors composition, R5), publient `formatState` et republient l'état à `formatChanged` (R15). Le moteur
publie `state().textFormat` de l'outil actif et relaie `textFormat(a)` (DAR4, patron `tableFill`). Scénario S6.

**Fichiers.**
- Modifier : `apps/web/src/engine/tools/text.ts:7-12` (imports), `:37-51` (`TextEditorHost`, `TextTool`), `:60-86`
  (`commit`), `:88-112` (`open`), `:114-150` (retour) ; `apps/web/src/engine/tools/table.ts:8-10` (imports), `:55-61`
  (`Opened`), `:96-115` (`commit`), `:117-144` (`openActive`), retour (`:189-322`) ;
  `apps/web/src/engine/tools/tool.ts:6` (import), `:55-69` (`TableTool`) ; `apps/web/src/engine/engine.ts` (imports,
  `EngineState` `:19-37`, `Engine` `:66-118`, outils inertes `:128-150`, `state()` `:195-209`, `:320-331`, retour
  `:520-525`)
- Tests : `apps/web/src/engine/tools/text.test.ts`, `apps/web/src/engine/tools/table.test.ts`,
  `apps/web/src/engine/engine.test.ts`, `apps/web/src/app/stage-tags.test.ts:7-21`

**Interfaces.**
- Consomme (T2) : `FormatAction`, `FormatState` ; `SetText.spans?`, `SetTableCell.spans?`. (T6) : fausse liaison qui
  applique `spans`. (T8) : `cellContent(t, row, col): { text, spans, fill }`, `cellHeight(spans, size, colWidth, measure)`.
  (T10) : la vraie zone implémente déjà `spans`, `format`, `formatState` et appelle `formatChanged` (PC14).
- Produit :

```ts
// engine/tools/text.ts
export interface TextEditorHost {
  open(session: TextEditSession, camera: Camera): void; close(): void; value(): string;
  spans(): readonly TextSpan[]; format(a: FormatAction): void; formatState(): FormatState | null;
}
export interface TextTool extends GestureTool { …existant…; format(a: FormatAction): void; formatState(): FormatState | null; formatChanged(): void }
// engine/tools/tool.ts
export interface TableTool extends GestureTool { …existant…; format(a: FormatAction): void; formatState(): FormatState | null; formatChanged(): void }
// engine/engine.ts
EngineState.textFormat: FormatState | null;
Engine.textFormat(a: FormatAction): void;
```

  T13 branche `ToolbarHost.textFormat` sur `Engine.textFormat` et lit `EngineState.textFormat` comme
  `ToolbarView.textFormat`.
- Réutilise : `apps/web/src/engine/tools/text.ts:38` — `TextEditorHost` étendu de `spans()`, `format(a)`,
  `formatState()` (R18).
- Réutilise : `apps/web/src/engine/tools/commit-gate.ts:16` — `createCommitGate(commit, open)` tel quel ;
  `gate.composing()` bloque `format` pendant une composition (R5).
- Réutilise : `apps/web/src/engine/text-layout.ts:206` — `layoutRich`, `richBoxHeight` (hauteur d'un texte sur ses
  segments, plus de prévision par `editSpans`).
- Réutilise : `apps/web/src/core/rich-text.ts:120` — `sameSpans(a, b)` (sortie « aucune commande » de R6).
- Réutilise : `apps/web/src/engine/engine.ts:205`, `:523` — patron `tableCell` / `tableFill` : `textFormat` dans
  l'état, `textFormat(a)` relayé à l'outil actif.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web test -- src/engine/tools src/engine/engine.test.ts src/app/stage-tags.test.ts src/app/text-editor.test.ts --reporter=verbose 2>&1 | grep -E "C7b|×|FAIL|Test Files|Tests " | tail -50
```

Attendu : aucun `×` ; au moins 5 lignes `✓ outil Texte — C7b …`, 4 lignes `✓ outil Tableau — C7b …`, 3 lignes
`✓ moteur — barre de format (C7b, DAR4) …` ; les tests existants des deux outils, du moteur et de la zone verts. `tsc`
vide (GC14).

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé, aucun seuil changé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm apps/web/src/` ;
  `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm-formats apps/web/src/`.
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle.
- GC12 OD80 : `tools/table.ts` est aussi touché par C10b : `initialSpans` dans `Opened`, `spans` passé dans `openActive`
  et `commit`, trois méthodes neuves au retour ; aucune autre retouche.
- GC13 Périmètre : seuls les fichiers ci-dessus.
- GC14 `tsc` vide.
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.

**Interdits.** Ne pas toucher `app/text-editor.ts` ni `commit-gate.ts` ; ne rien écrire au document pendant une séance
(D38) ; `clearCell` garde `SetTableCell` sans `spans`.

**Critère « terminé ».** Commande bornée verte, `tsc` vide, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges — outil Texte.** Dans `text.test.ts`, imports :
  `import type { Command, TextSpan } from "../../core/api";`, `import { editSpans, plainSpans } from "../../core/rich-text";`,
  `import type { FormatAction, FormatState } from "../rich-edit";`. Remplacer `FakeHost` par :

```ts
class FakeHost implements TextEditorHost {
  opened: TextEditSession[] = [];
  closed = 0;
  text = "";
  /** Segments imposés par le test ; null : ceux d'une zone qui hérite (`editSpans` sur le texte saisi). */
  rich: TextSpan[] | null = null;
  formats: FormatAction[] = [];
  state: FormatState | null = null;
  open(s: TextEditSession): void {
    this.opened.push(s);
    this.text = s.initial;
    this.rich = null;
  }
  close(): void {
    this.closed++;
  }
  value(): string {
    return this.text;
  }
  spans(): readonly TextSpan[] {
    const s = this.opened[this.opened.length - 1];
    return this.rich ?? editSpans(s?.spans ?? plainSpans(""), this.text);
  }
  format(a: FormatAction): void {
    this.formats.push(a);
  }
  formatState(): FormatState | null {
    return this.state;
  }
}
```

  Dans `setup`, ajouter `let changes = 0;`, `stateChanged: () => { changes++; },` au `ctx`, et `changes: () => changes`
  au retour. Attente `:75-77` :

```ts
    expect(runs).toEqual([
      { type: "SetText", page, id: null, x: 100, y: 200, content: "Bonjour", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45, spans: [{ text: "Bonjour", attrs: {} }] },
    ]);
```

  En fin de fichier :

```ts
describe("outil Texte — C7b (segments, barre)", () => {
  const ITALIC = { italic: true } as const;
  const PLAIN_STATE: FormatState = { bold: false, italic: false, underline: false, size: 36, color: "default" };

  it("SetText porte les segments de la zone ; hauteur mesurée sur eux (R6, R18)", () => {
    const { host, tool, runs, click } = setup();
    click(100, 200);
    host.text = "Le chat";
    host.rich = [{ text: "Le ", attrs: {} }, { text: "chat", attrs: { size: 48 } }];
    tool.requestCommit();
    expect(runs[0]).toMatchObject({ type: "SetText", content: "Le chat", spans: host.rich, boxHeight: 60 });
  });

  it("S6 : même texte, segments changés : une SetText ; le texte est en italique, annuler le rend sans attribut", () => {
    const { doc, page, host, tool, runs, click } = setup();
    const id = doc.apply({ type: "SetText", page, id: null, x: 100, y: 200, content: "Le chat noir", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 }).ids[0] ?? "";
    click(150, 210);
    host.rich = [{ text: "Le chat ", attrs: {} }, { text: "noir", attrs: ITALIC }];
    tool.requestCommit();
    expect(runs.at(-1)).toMatchObject({ type: "SetText", id, content: "Le chat noir", spans: host.rich });
    const view = (): unknown => {
      const e = doc.element(id);
      return e?.kind === "text" ? e.text.spans : null;
    };
    expect(view()).toEqual(host.rich);
    doc.undo();
    expect(view()).toEqual([{ text: "Le chat noir", attrs: {} }]);
  });

  it("texte et segments inchangés : aucune commande (R6)", () => {
    const { doc, page, tool, runs, click } = setup();
    doc.apply({ type: "SetText", page, id: null, x: 100, y: 200, content: "Le chat", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 });
    click(150, 210);
    tool.requestCommit();
    expect(runs).toEqual([]);
  });

  it("format : relayé à la zone pendant la saisie ; fermée ou pendant une composition : rien (R5, DAR4)", () => {
    const { host, tool, click } = setup();
    tool.format({ type: "bold" });
    expect(host.formats).toEqual([]);
    click(100, 200);
    tool.format({ type: "bold" });
    tool.compositionStart();
    tool.format({ type: "italic" });
    tool.compositionEnd();
    tool.format({ type: "size", size: 72 });
    expect(host.formats).toEqual([{ type: "bold" }, { type: "size", size: 72 }]);
  });

  it("formatState : null hors saisie, celui de la zone sinon ; ouverture, validation et formatChanged republient l'état (PC12)", () => {
    const { host, tool, click, changes } = setup();
    host.state = PLAIN_STATE;
    expect(tool.formatState()).toBeNull();
    const c0 = changes();
    click(100, 200);
    expect(tool.formatState()).toEqual(PLAIN_STATE);
    expect(changes()).toBe(c0 + 1);
    tool.formatChanged();
    expect(changes()).toBe(c0 + 2);
    tool.requestCommit();
    expect(changes()).toBeGreaterThanOrEqual(c0 + 3);
    expect(tool.formatState()).toBeNull();
  });
});
```

- [ ] **Étape 3 : tests rouges — outil Tableau.** Dans `table.test.ts` : mêmes imports (`TextSpan`, `editSpans`,
  `plainSpans`, `FormatAction`, `FormatState`) et même remplacement de `FakeHost` (garder sa méthode `last()`) ; attente
  `:309` :

```ts
    expect(s.last()).toEqual({ type: "SetTableCell", id, row: t.rows[0]?.id, col: t.cols[0]?.id, content: long, rowHeight: h, spans: [{ text: long, attrs: {} }] });
```

  En fin de fichier :

```ts
describe("outil Tableau — C7b (segments, barre)", () => {
  const B = { bold: true } as const;
  const I = { italic: true } as const;
  const cellSpans = (s: ReturnType<typeof setup>, id: string): readonly TextSpan[] | undefined => s.table(id).cells[0]?.spans;

  it("S6 : cellule « Total » existante, italique seule : SetTableCell au même contenu avec spans ; annuler la rend droite", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.type("Total");
    s.tool.requestCommit();
    s.click(110, 210);
    expect(s.host.last().spans).toEqual([{ text: "Total", attrs: {} }]);
    s.host.rich = [{ text: "Total", attrs: I }];
    s.tool.requestCommit();
    const t = s.table(id);
    expect(s.last()).toEqual({ type: "SetTableCell", id, row: t.rows[0]?.id, col: t.cols[0]?.id, content: "Total", rowHeight: cellHeight([{ text: "Total", attrs: I }], 36, 240, narrow), spans: [{ text: "Total", attrs: I }] });
    expect(cellSpans(s, id)).toEqual([{ text: "Total", attrs: I }]);
    s.doc.undo();
    expect(cellSpans(s, id)).toEqual([{ text: "Total", attrs: {} }]);
  });

  it("ouverture : la zone reçoit les segments de la cellule (R18)", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.tool.requestCommit();
    const t = s.table(id);
    s.doc.apply({ type: "SetTableCell", id, row: t.rows[0]?.id ?? "", col: t.cols[0]?.id ?? "", content: "aaTotal", spans: [{ text: "a", attrs: {} }, { text: "aTotal", attrs: B }] });
    s.click(110, 210);
    expect(s.host.last().spans).toEqual([{ text: "a", attrs: {} }, { text: "aTotal", attrs: B }]);
  });

  it("texte et segments inchangés : aucune SetTableCell (R6)", () => {
    const s = setup();
    s.create(100, 200, 2, 2);
    s.type("Lundi");
    s.tool.requestCommit();
    const n = s.runs.length;
    s.click(110, 210);
    s.tool.requestCommit();
    expect(s.runs).toHaveLength(n);
  });

  it("format et formatState : relayés pendant la saisie, null sinon ; composition : rien ; formatChanged republie (R5, R15)", () => {
    const s = setup();
    const st: FormatState = { bold: true, italic: false, underline: false, size: 36, color: "default" };
    s.host.state = st;
    expect(s.tool.formatState()).toBeNull();
    s.tool.format({ type: "bold" });
    s.create(100, 200, 2, 2);
    expect(s.tool.formatState()).toEqual(st);
    s.tool.format({ type: "bold" });
    s.tool.compositionStart();
    s.tool.format({ type: "italic" });
    s.tool.compositionEnd();
    expect(s.host.formats).toEqual([{ type: "bold" }]);
    const c = s.changes();
    s.tool.formatChanged();
    expect(s.changes()).toBe(c + 1);
  });
});
```

- [ ] **Étape 4 : tests rouges — moteur.** Dans `engine.test.ts` : imports
  `import type { FormatState } from "./rich-edit";` et `TextTool` ajouté à l'import de `./tools/text` ; dans
  `fakeTableTool`, ajouter `let fmt: FormatState | null = null;`, au littéral `tool` :

```ts
    format: (a) => {
      log.push(`table.format ${a.type}`);
    },
    formatState: () => fmt,
    formatChanged: () => ctx.stateChanged?.(),
```

  et au retour `setFormat(f: FormatState | null): void { fmt = f; ctx.stateChanged?.(); },`. Dans `setupRealTable`, le
  littéral `host` gagne `spans: () => plainSpans(host.text), format: () => undefined, formatState: () => null,`
  (import `plainSpans` de `../core/rich-text`). Puis ajouter :

```ts
/** Faux outil Texte (C7b) : journalise les actions de format ; `setFormat` change l'état publié et prévient le moteur. */
function fakeTextTool(ctx: ToolContext, log: string[]) {
  let fmt: FormatState | null = null;
  const tool: TextTool = {
    begin: () => undefined,
    extend: () => undefined,
    frame: () => undefined,
    close: () => undefined,
    live: () => NO_LIVE,
    active: () => false,
    editing: () => null,
    composing: () => false,
    compositionStart: () => undefined,
    compositionEnd: () => undefined,
    requestCommit: () => undefined,
    format: (a) => {
      log.push(`text.format ${a.type}`);
    },
    formatState: () => fmt,
    formatChanged: () => ctx.stateChanged?.(),
  };
  return {
    tool,
    setFormat(f: FormatState | null): void {
      fmt = f;
      ctx.stateChanged?.();
    },
  };
}

function setupFormat() {
  const doc = fakeCore.blank();
  const frames = new Frames();
  const renderer = new FakeRenderer();
  const log: string[] = [];
  const holder: { text?: ReturnType<typeof fakeTextTool>; table?: ReturnType<typeof fakeTableTool> } = {};
  const tools: ToolFactories = {
    pen: (ctx) => fakeTool("pen", log, ctx),
    eraser: (ctx) => fakeTool("eraser", log, ctx),
    text: (ctx) => {
      holder.text = fakeTextTool(ctx, log);
      return holder.text.tool;
    },
    table: (ctx) => {
      holder.table = fakeTableTool(ctx, log);
      return holder.table.tool;
    },
  };
  const engine = createEngine({ doc, renderer, frames, tools });
  const { text, table } = holder;
  if (text === undefined || table === undefined) throw new Error("outils non créés");
  return { engine, log, text, table };
}

describe("moteur — barre de format (C7b, DAR4)", () => {
  const BOLD: FormatState = { bold: true, italic: false, underline: false, size: 36, color: "default" };

  it("textFormat(a) : relayé à l'outil Texte ou Tableau actif ; autre outil : rien", () => {
    const { engine, log } = setupFormat();
    engine.setTool("text");
    engine.textFormat({ type: "bold" });
    engine.setTool("table");
    engine.textFormat({ type: "italic" });
    engine.setTool("pen");
    engine.textFormat({ type: "underline" });
    expect(log.filter((l) => l.includes(".format"))).toEqual(["text.format bold", "table.format italic"]);
  });

  it("state().textFormat : celui de l'outil actif ; stateChanged republie ; autre outil : null", () => {
    const { engine, text, table } = setupFormat();
    const seen: (FormatState | null)[] = [];
    engine.onState((s) => seen.push(s.textFormat));
    engine.setTool("text");
    text.setFormat(BOLD);
    expect(seen.at(-1)).toEqual(BOLD);
    expect(engine.state().textFormat).toEqual(BOLD);
    engine.setTool("table");
    expect(engine.state().textFormat).toBeNull();
    table.setFormat({ ...BOLD, bold: false });
    expect(engine.state().textFormat).toEqual({ ...BOLD, bold: false });
    engine.setTool("pen");
    expect(engine.state().textFormat).toBeNull();
  });

  it("sans fabrique text ni table : textFormat null, action sans effet", () => {
    const { engine } = setup();
    engine.setTool("text");
    expect(engine.state().textFormat).toBeNull();
    expect(() => engine.textFormat({ type: "bold" })).not.toThrow();
  });
});
```

  `stage-tags.test.ts` : `base` gagne `textFormat: null,`.

- [ ] **Étape 5 : vérifier le rouge.** Commande bornée : `×` sur les blocs C7b et sur l'attente `SetText` (sans
  `spans`) ; `tsc` signale `formatState`, `textFormat` absents.

- [ ] **Étape 6 : outil Texte.** `text.ts` : imports `import { plainSpans, sameSpans } from "../../core/rich-text";`
  (retirer `editSpans`) et `import type { FormatAction, FormatState } from "../rich-edit";`. `TextEditorHost` :

```ts
/** Zone de saisie de la page (DOM, T56 ; riche en C7b, R18) : le moteur n'en connaît que ceci. */
export interface TextEditorHost {
  open(session: TextEditSession, camera: Camera): void;
  close(): void;
  value(): string;
  /** Segments de la séance (C7b, R18) ; fermée : un segment vide. */
  spans(): readonly TextSpan[];
  /** Action de la barre ou d'un raccourci sur la sélection (R8) ; fermée ou pendant une composition : sans effet. */
  format(a: FormatAction): void;
  /** État de la barre (R15) ; fermée : null. */
  formatState(): FormatState | null;
}
```

  `TextTool`, après `requestCommit(): void;` :

```ts
  /** Barre de format (C7b, DAR4) : relayée à la zone si une saisie est ouverte, hors composition (R5). */
  format(a: FormatAction): void;
  formatState(): FormatState | null;
  /** La zone a changé sélection ou format : l'état du moteur est republié (R15). */
  formatChanged(): void;
```

  `commit` :

```ts
  /** Écrit la boîte ouverte (une SetText au plus, portant les segments de la zone, R6) ; la session est fermée avant
   *  `host.close()` (blur réentrant sans effet). */
  const commit = (): void => {
    const s = session;
    if (!s) return;
    const content = host.value();
    const spans = host.spans();
    const hadHidden = live.hidden.size > 0;
    session = null;
    gate.reset();
    live = NO_LIVE;
    host.close();
    // La boucle est arrêtée (outil inactif) : sans image, l'id masqué resterait invisible jusqu'au geste suivant.
    if (hadHidden) ctx.requestFrame?.();
    ctx.stateChanged?.();
    if (s.id === null && content === "") return;
    // R6 : texte et segments inchangés : aucune commande ; mise en forme seule (S6) : la commande part.
    if (s.id !== null && content === s.initial && sameSpans(spans, s.spans)) return;
    const boxHeight = richBoxHeight(layoutRich(spans, { size: s.size }, s.boxWidth, measure));
    ctx.run({ type: "SetText", page: s.page, id: s.id, x: s.matrix[4], y: s.matrix[5], content, color: s.color, size: s.size, boxWidth: s.boxWidth, boxHeight, spans });
  };
```

  `open` : après `host.open(session, cam);`, ajouter `ctx.stateChanged?.();`. Retour, après `requestCommit() { … },` :

```ts
    format(a) {
      if (session !== null && !gate.composing()) host.format(a);
    },
    formatState: () => (session === null ? null : host.formatState()),
    formatChanged() {
      ctx.stateChanged?.();
    },
```

  Mettre à jour l'en-tête du fichier : « une seule SetText à la validation, portant les segments de la zone (C7b, R6),
  hauteur mesurée par `layoutRich` sur eux ».

- [ ] **Étape 7 : outil Tableau.** `table.ts` : imports `import type { Matrix, TableAxis, TableData, TextSpan } from "../../core/api";`,
  `import { sameSpans } from "../../core/rich-text";` (remplace `plainSpans`, plus employé),
  `import type { FormatAction, FormatState } from "../rich-edit";`. `Opened` gagne
  `/** Segments à l'ouverture (C7b, R6). */ readonly initialSpans: readonly TextSpan[];`. `commit` :

```ts
  /** Écrit la cellule ouverte (une SetTableCell au plus, T9, portant les segments de la zone, C7b R6) ; la saisie est
   *  fermée avant `editor.close()`. */
  function commit(): void {
    const o = opened;
    if (o === null) return;
    const content = editor.value();
    const spans = editor.spans();
    opened = null;
    gate.reset();
    editor.close();
    // R6 : texte et segments inchangés : aucune commande ; mise en forme seule (S6) : la commande part.
    if (content !== o.initial || !sameSpans(spans, o.initialSpans)) {
      ctx.run({
        type: "SetTableCell",
        id: o.ref.id,
        row: o.ref.row,
        col: o.ref.col,
        content,
        rowHeight: cellHeight(spans, o.size, o.colWidth, measure),
        spans,
      });
    }
    refresh();
    ctx.stateChanged?.();
  }
```

  `openActive` : `const { text, spans, fill } = cellContent(at.table, at.ref.row, at.ref.col);`,
  `opened = { ref: at.ref, initial: text, initialSpans: spans, colWidth, size: at.table.size };`, `spans,` (au lieu de
  `spans: plainSpans(text),`) dans la session ouverte, puis `ctx.stateChanged?.();` après `editor.open(...)`. Retour,
  après `requestCommit() { … },` :

```ts
    format(a) {
      if (opened !== null && !gate.composing()) editor.format(a);
    },
    formatState: () => (opened === null ? null : editor.formatState()),
    formatChanged() {
      ctx.stateChanged?.();
    },
```

  `tool.ts` : `import type { FormatAction, FormatState } from "../rich-edit";` et, dans `TableTool` après
  `requestCommit(): void;` :

```ts
  /** Barre de format (C7b, DAR4) : relayée à la zone si une cellule est ouverte, hors composition (R5). */
  format(a: FormatAction): void;
  formatState(): FormatState | null;
  /** La zone a changé sélection ou format : l'état du moteur est republié (R15). */
  formatChanged(): void;
```

- [ ] **Étape 8 : moteur.** `engine.ts` : `import type { FormatAction, FormatState } from "./rich-edit";` ; `TextTool`
  importé de `./tools/text` s'il ne l'est pas. `EngineState`, après `tableCell` :

```ts
  /** État de la barre de format (C7b, R15) : saisie ouverte de l'outil Texte ou Tableau actif ; null sinon. */
  readonly textFormat: FormatState | null;
```

  `Engine`, après `tableFill(...)` :

```ts
  /** Bouton de la rangée Format (C7b, DAR4) : relayé à l'outil actif (Texte ou Tableau) ; autre outil : sans effet. */
  textFormat(a: FormatAction): void;
```

  Outils inertes : `inertTable()` gagne `format() {}, formatState: () => null, formatChanged() {},` ; ajouter :

```ts
function inertText(): TextTool {
  return {
    ...inertTool(),
    editing: () => null,
    composing: () => false,
    compositionStart() {},
    compositionEnd() {},
    requestCommit() {},
    format() {},
    formatState: () => null,
    formatChanged() {},
  };
}
```

  Après `const tableTool: TableTool = …` (`:320`) : `const textTool: TextTool = deps.tools.text?.(ctx, textStyle) ?? inertText();`
  et, dans `tools`, `text: textTool,`. Dans `state()`, après `tableCell: tableTool.cellState(),` :
  `textFormat: tool === "text" ? textTool.formatState() : tool === "table" ? tableTool.formatState() : null,`. Retour,
  après `tableFill(fill) { … },` :

```ts
    textFormat(a) {
      if (tool === "text") textTool.format(a);
      else if (tool === "table") tableTool.format(a);
    },
```

- [ ] **Étape 9 : vert.** Commande bornée : 0 `×` ; `tsc` vide.

- [ ] **Étape 10 : commit.**

```bash
cd "$WT" && git add apps/web/src/engine/tools/text.ts && git add apps/web/src/engine/tools/text.test.ts && \
git add apps/web/src/engine/tools/table.ts && git add apps/web/src/engine/tools/table.test.ts && \
git add apps/web/src/engine/tools/tool.ts && git add apps/web/src/engine/engine.ts && \
git add apps/web/src/engine/engine.test.ts && git add apps/web/src/app/stage-tags.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): tools commit wanted spans and relay the format bar" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Commande bornée et ses noms vus ; une ligne `Réutilisation :` par ligne `Réutilise :`.

---

<a id="tache-t12"></a>

### Tâche T12 — Liaison Wasm des segments, adaptateur, contrat sur le vrai module

**Objectif.** La liaison lit les segments venus de la page (R7) : `set_text` et `set_table_cell` gagnent un dernier
paramètre `spans: JsValue` (`undefined` ou `null` = absent), lu par `read_spans_input` (liste d'objets
`{ text, attrs }`, `attrs` lu par le `PatchVisitor` de `format_text`, `false` et `null` = absent) ; générique pour être
testée en natif. L'adaptateur passe `spans` nettoyés (`cleanPatch`), et `toTable` exige les segments des cellules. Le
contrat C7b joue sur les deux fabriques. Scénario S5.

**Fichiers.**
- Modifier : `crates/roomboard-wasm/src/lib.rs:19` (import), `:212-247` (`PatchVisitor`, `read_patch` : boucle partagée),
  après `:247` (`read_spans_input`, `spans_arg`), `:452-465` (`set_table_cell`), `:650-675` (`set_text`), `:888-902`
  (`set_table_cell_inner`), `:1037-1056` (`set_text_inner`), appels de test (`:1316`, `:1333`, `:1606`, `:1840`,
  `:1878`), tests neufs ; `apps/web/src/core/wasm-core.ts:25` (import), `:132-138` (`toTable`), `:338-342` (`SetText`),
  `:367-368` (`SetTableCell`)
- Tests : `crates/roomboard-wasm/src/lib.rs` (module `tests`), `apps/web/src/core/wasm-core.contract.test.ts`

**Interfaces.**
- Consomme (T1, T5) : `roomboard_core::rich_text::{SpanAttrs, SpanInput, TextAttr}`, `Command::SetText { …, spans }`,
  `Command::SetTableCell { …, spans }`. (T6) : bloc « contrat C7b », `const c7bFactories`, tolérance de `toTable`.
- Produit :

```rust
// crates/roomboard-wasm/src/lib.rs
fn read_spans_input<'de, D: serde::Deserializer<'de>>(d: D) -> Result<Vec<SpanInput>, CommandError>;
pub fn set_text(&mut self, page: &str, id: Option<String>, x: f64, y: f64, content: &str, color: &str, size: f32, box_width: f64, box_height: f64, spans: JsValue) -> Result<JsValue, JsError>;
pub fn set_table_cell(&mut self, id: &str, row: &str, col: &str, content: &str, row_height: Option<f64>, spans: JsValue) -> Result<JsValue, JsError>;
pub fn set_text_inner(&mut self, page: &str, id: Option<String>, at: [f64; 2], content: &str, color: &str, size: f32, boxes: [f64; 2], spans: Option<Vec<SpanInput>>) -> Result<Change, CommandError>;
pub fn set_table_cell_inner(&mut self, id: &str, cell: [&str; 2], content: &str, row_height: Option<f64>, spans: Option<Vec<SpanInput>>) -> Result<Change, CommandError>;
```
- Réutilise : `crates/roomboard-wasm/src/lib.rs:212`, `:179` — `PatchVisitor` (lecture de l'objet `attrs` d'un segment)
  et `wire_attr(k, v)` ; étendu par `read_spans_input` (`deserialize_seq` d'entrées `{ text, attrs }` ; `read_patch`
  lit un objet seul) ; boucle « emplacements → entrées » partagée avec `read_patch` (`entries_of`).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
cargo test -p roomboard-wasm 2>&1 | grep -E "^test .*(spans|read_patch|format_text)|test result|FAILED|error\[" | tail -20 && \
cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm && \
wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && \
wc -c < apps/web/src/wasm/roomboard_wasm_bg.wasm && \
ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web test -- src/core --reporter=verbose 2>&1 | grep -E "C7b|×|FAIL|Test Files|Tests " | tail -60
```

Attendu : `roomboard-wasm` sans `FAILED`, lignes `ok` pour `read_spans_input_reads_text_and_attrs`,
`read_spans_input_refuses_bad_shapes`, `set_text_inner_with_spans_formats_in_one_step`,
`set_table_cell_inner_with_spans_formats_the_cell` (≥ 4) et `read_patch_takes_null_as_removal_and_checks_types`,
`format_text_inner_formats_and_reads_spans` verts ; taille du module ≤ 1 572 864 ; vitest : aucun `×`, au moins 10
lignes `✓ contrat C7b : vrai module wasm > …`, 10 `✓ contrat C7b : fausse liaison > …`, 2 `✓ contrôle de forme C7b …`.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé, aucun seuil changé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm-formats apps/web/src/` ;
  `[ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/target .`.
- GC4b Module Wasm régénéré depuis le worktree (commande ci-dessus), jamais commité.
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite N, les noms vus et la taille du module.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle ; versions de `wasm-bindgen` et `serde-wasm-bindgen` inchangées
  (`scripts/controle-wasm-bindgen.sh` vert).
- GC8 Plafond Wasm 1 572 864 octets, contrôle de `verifier.sh` non modifié.
- GC10 Le cœur tourne en Wasm dans la page ; seules les références traversent la liaison.
- GC12 OD80 : `lib.rs`, `wasm-core.ts` sont aussi touchés par C10b : un paramètre en fin de `set_table_cell`, une ligne
  dans l'appel ; la lecture des segments vit dans des fonctions neuves.
- GC13 Périmètre : seuls les fichiers ci-dessus.
- GC14 `tsc` vide.
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.
- GC16 `cargo fmt --all` puis `cargo clippy -p roomboard-wasm --all-targets -- -D warnings`.

**Interdits.** Ne pas changer `read_patch` hors de l'extraction de sa boucle ; ne pas changer `format_text` ;
`serde_wasm_bindgen` ne s'appelle jamais dans un test natif (il panique hors wasm32).

**Critère « terminé ».** Commande bornée verte, clippy sans avertissement, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests natifs rouges.** Dans le module `tests` de `lib.rs`, après les tests C7 de `read_patch`,
  ajouter (et `use roomboard_core::rich_text::{SpanAttrs, SpanInput};` en tête du module si absent) :

```rust
    // C7b (T12) : segments voulus lus depuis la page ; `set_text_inner` et `set_table_cell_inner` avec `spans`.

    /// Valeur JS simulée en natif, objets et listes compris, lue comme par `serde_wasm_bindgen`.
    #[derive(Clone)]
    enum Jv {
        Null,
        Bool(bool),
        Num(f64),
        Str(&'static str),
        Map(Vec<(&'static str, Jv)>),
        List(Vec<Jv>),
    }

    impl<'de> serde::de::IntoDeserializer<'de> for Jv {
        type Deserializer = Self;

        fn into_deserializer(self) -> Self {
            self
        }
    }

    impl<'de> serde::Deserializer<'de> for Jv {
        type Error = serde::de::value::Error;

        fn deserialize_any<V: serde::de::Visitor<'de>>(
            self,
            v: V,
        ) -> Result<V::Value, Self::Error> {
            match self {
                Jv::Null => v.visit_unit(),
                Jv::Bool(b) => v.visit_bool(b),
                Jv::Num(n) => v.visit_f64(n),
                Jv::Str(s) => v.visit_str(s),
                Jv::Map(m) => v.visit_map(serde::de::value::MapDeserializer::new(m.into_iter())),
                Jv::List(l) => v.visit_seq(serde::de::value::SeqDeserializer::new(l.into_iter())),
            }
        }

        fn deserialize_option<V: serde::de::Visitor<'de>>(
            self,
            v: V,
        ) -> Result<V::Value, Self::Error> {
            match self {
                Jv::Null => v.visit_none(),
                _ => v.visit_some(self),
            }
        }

        serde::forward_to_deserialize_any! {
            bool i8 i16 i32 i64 i128 u8 u16 u32 u64 u128 f32 f64 char str string bytes byte_buf unit unit_struct
            newtype_struct seq tuple tuple_struct map struct enum identifier ignored_any
        }
    }

    fn seg(text: &'static str, attrs: Vec<(&'static str, Jv)>) -> Jv {
        Jv::Map(vec![("text", Jv::Str(text)), ("attrs", Jv::Map(attrs))])
    }

    #[test]
    fn read_spans_input_reads_text_and_attrs() {
        let got = read_spans_input(Jv::List(vec![
            seg("Le ", vec![]),
            seg(
                "chat",
                vec![
                    ("bold", Jv::Bool(true)),
                    ("color", Jv::Str("#dc2626")),
                    ("size", Jv::Num(48.0)),
                    ("italic", Jv::Null),
                    ("underline", Jv::Bool(false)),
                ],
            ),
        ]));
        assert_eq!(
            got,
            Ok(vec![
                SpanInput { text: "Le ".into(), attrs: SpanAttrs::default() },
                SpanInput {
                    text: "chat".into(),
                    attrs: SpanAttrs {
                        bold: true,
                        color: Some("#dc2626".into()),
                        size: Some(48.0),
                        ..SpanAttrs::default()
                    },
                },
            ])
        );
        assert_eq!(read_spans_input(Jv::List(vec![])), Ok(vec![]));
    }

    /// Patron écarté (R7) : `read_patch` lit un objet seul ; ici une liste. Pas une liste, segment incomplet, clé
    /// inconnue (segment ou attributs), type faux : `BadFormat`, jamais une panique.
    #[test]
    fn read_spans_input_refuses_bad_shapes() {
        for bad in [
            Jv::Map(vec![("text", Jv::Str("x"))]),
            Jv::List(vec![Jv::Map(vec![("text", Jv::Str("x"))])]),
            Jv::List(vec![Jv::Map(vec![("text", Jv::Str("x")), ("attrs", Jv::Map(vec![])), ("href", Jv::Str("y"))])]),
            Jv::List(vec![seg("x", vec![("href", Jv::Str("y"))])]),
            Jv::List(vec![seg("x", vec![("bold", Jv::Str("oui"))])]),
            Jv::List(vec![Jv::Map(vec![("text", Jv::Str("x")), ("attrs", Jv::Num(1.0))])]),
            Jv::List(vec![Jv::Str("x")]),
        ] {
            assert_eq!(read_spans_input(bad), Err(CommandError::BadFormat));
        }
    }

    #[test]
    fn set_text_inner_with_spans_formats_in_one_step() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let bold = SpanAttrs { bold: true, ..SpanAttrs::default() };
        let spans = vec![
            SpanInput { text: "Le ".into(), attrs: SpanAttrs::default() },
            SpanInput { text: "chat".into(), attrs: bold.clone() },
        ];
        let id = d
            .set_text_inner(&p, None, [100.0, 200.0], "Le chat", "#000000", 36.0, [600.0, 45.0], Some(spans))
            .expect("texte")
            .ids[0]
            .clone();
        let t = d.core.element(&id).and_then(|e| e.text).expect("texte");
        assert_eq!(t.spans[1].attrs, bold);
        let bad = vec![SpanInput { text: "Le cha".into(), attrs: SpanAttrs::default() }];
        assert_eq!(
            d.set_text_inner(&p, Some(id), [0.0, 0.0], "Le chat", "#000000", 36.0, [600.0, 45.0], Some(bad)),
            Err(CommandError::BadFormat)
        );
    }

    #[test]
    fn set_table_cell_inner_with_spans_formats_the_cell() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .add_table_inner(&p, [0.0, 0.0], [2, 2], [240.0, 64.0], "#000000", 36.0)
            .expect("tableau")
            .ids[0]
            .clone();
        let t = d.core.element(&id).and_then(|e| e.table).expect("vue");
        let bold = SpanAttrs { bold: true, ..SpanAttrs::default() };
        let spans = vec![SpanInput { text: "Total".into(), attrs: bold.clone() }];
        d.set_table_cell_inner(&id, [t.rows[0].id.as_str(), t.cols[0].id.as_str()], "Total", None, Some(spans))
            .expect("cellule");
        let cells = d.core.element(&id).and_then(|e| e.table).expect("vue").cells;
        assert_eq!(cells[0].spans[0].attrs, bold);
    }
```

  Appels existants (`:1316`, `:1333`, `:1606`, `:1840`, `:1878`) : ajouter `None` en dernier argument.

- [ ] **Étape 3 : contrat rouge.** Dans `wasm-core.contract.test.ts` : la ligne de T6
  `const c7bFactories = factories.filter((x) => x.name === "fausse liaison");` devient
  `const c7bFactories = factories; // T12 : vrai module branché, contrat C7b commun aux deux fabriques` ; le test
  « toElementView : tableau contrôlé, fill absent → null » (`:1709-1711`) passe des cellules avec
  `spans: [plainSpan("A")]` en entrée ; ajouter en fin de fichier :

```ts
describe("contrôle de forme C7b (cellules, appels de la liaison)", () => {
  const base = { id: "t1", kind: "table", transform: [1, 0, 0, 1, 0, 0] };
  const table = (cell: Record<string, unknown>) => ({
    color: "#000000", size: 36, cols: [{ id: "c1", width: 240 }], rows: [{ id: "r1", height: 64 }],
    cells: [{ row: "r1", col: "c1", text: "ab", fill: null, ...cell }],
  });

  it("toElementView : segments de cellule exigés et contrôlés (R16)", () => {
    expect(toElementView({ ...base, table: table({ spans: [{ text: "ab", attrs: { bold: true } }] }) })).toMatchObject({ table: { cells: [{ spans: [{ text: "ab", attrs: { bold: true } }] }] } });
    for (const cell of [{}, { spans: [] }, { spans: [{ text: "a", attrs: {} }] }, { spans: [{ text: "ab", attrs: { href: "x" } }] }]) {
      expect(() => toElementView({ ...base, table: table(cell) }), JSON.stringify(cell)).toThrow("ElementView invalide");
    }
  });

  it("SetText et SetTableCell : spans passés nettoyés (clés undefined retirées) ; absents : undefined (R7)", () => {
    const ok = { pages: ["p1"], ids: ["e1"], removed: [], full: false, version: 1 };
    const calls: unknown[][] = [];
    const doc = {
      set_text: (...args: unknown[]): unknown => (calls.push(args), ok),
      set_table_cell: (...args: unknown[]): unknown => (calls.push(args), ok),
    };
    const stub = { Document: { blank: () => doc, load: () => doc }, StrokeBuilder: class {}, version: () => "factice" };
    const d = createWasmCore(stub as unknown as WasmModule).blank();
    const spans = [{ text: "a", attrs: { bold: true, color: undefined } as unknown as TextAttrs }];
    d.apply({ type: "SetText", page: "p1", id: null, x: 0, y: 0, content: "a", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45, spans });
    d.apply({ type: "SetText", page: "p1", id: null, x: 0, y: 0, content: "a", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 });
    d.apply({ type: "SetTableCell", id: "t1", row: "r1", col: "c1", content: "a", spans });
    expect(calls.map((a) => a.at(-1))).toEqual([[{ text: "a", attrs: { bold: true } }], undefined, [{ text: "a", attrs: { bold: true } }]]);
    expect((calls[0]?.at(-1) as { attrs: unknown }[])[0]?.attrs).toStrictEqual({ bold: true });
  });
});
```

- [ ] **Étape 4 : vérifier le rouge.** `cargo test -p roomboard-wasm 2>&1 | grep -E "error\[" | head -5` : `E0425`
  (`read_spans_input` absent), `E0061` (nombre d'arguments). Vitest `src/core` (module encore ancien) : `×` sur
  « contrôle de forme C7b » et sur « contrat C7b : vrai module wasm ».

- [ ] **Étape 5 : liaison.** Import `:19` : `use roomboard_core::rich_text::{SpanAttrs, SpanInput, TextAttr};`. Remplacer
  la boucle de `read_patch` par une aide partagée, et ajouter la lecture des segments :

```rust
/// Emplacements d'un patch lu par `PatchVisitor`, dans l'ordre de `PATCH_KEYS`.
type PatchSlots = [Option<Option<WireValue>>; 6];

/// Emplacements → entrées du cœur (contrôle 1 de T7) : clé connue au mauvais type : `BadFormat`.
fn entries_of(slots: PatchSlots) -> Result<Vec<TextAttr>, CommandError> {
    let mut attrs = Vec::new();
    for (k, v) in PATCH_KEYS.iter().zip(slots) {
        if let Some(v) = v {
            attrs.push(wire_attr(k, v)?);
        }
    }
    Ok(attrs)
}
```

  `PatchVisitor` : `type Value = PatchSlots;`. `read_patch` devient :

```rust
fn read_patch<'de, D: serde::Deserializer<'de>>(d: D) -> Result<Vec<TextAttr>, CommandError> {
    let slots = d
        .deserialize_map(PatchVisitor)
        .map_err(|_| CommandError::BadFormat)?;
    entries_of(slots)
}
```

  Après `read_patch` :

```rust
/// Objet `attrs` d'un segment, lu par le `PatchVisitor` de `format_text`.
struct AttrsSeed;

impl<'de> serde::de::DeserializeSeed<'de> for AttrsSeed {
    type Value = PatchSlots;

    fn deserialize<D: serde::Deserializer<'de>>(self, d: D) -> Result<PatchSlots, D::Error> {
        d.deserialize_map(PatchVisitor)
    }
}

/// Un segment `{ text, attrs }` : les deux clés exigées, aucune autre.
struct SpanVisitor;

impl<'de> serde::de::Visitor<'de> for SpanVisitor {
    type Value = (String, PatchSlots);

    fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        f.write_str("un segment { text, attrs }")
    }

    fn visit_map<A: serde::de::MapAccess<'de>>(self, mut map: A) -> Result<Self::Value, A::Error> {
        let (mut text, mut attrs) = (None, None);
        while let Some(k) = map.next_key::<String>()? {
            match k.as_str() {
                "text" => text = Some(map.next_value::<String>()?),
                "attrs" => attrs = Some(map.next_value_seed(AttrsSeed)?),
                _ => return Err(serde::de::Error::custom("clé inconnue")),
            }
        }
        match (text, attrs) {
            (Some(t), Some(a)) => Ok((t, a)),
            _ => Err(serde::de::Error::custom("segment incomplet")),
        }
    }
}

struct SpanSeed;

impl<'de> serde::de::DeserializeSeed<'de> for SpanSeed {
    type Value = (String, PatchSlots);

    fn deserialize<D: serde::Deserializer<'de>>(self, d: D) -> Result<Self::Value, D::Error> {
        d.deserialize_map(SpanVisitor)
    }
}

/// Liste de segments.
struct SpansVisitor;

impl<'de> serde::de::Visitor<'de> for SpansVisitor {
    type Value = Vec<(String, PatchSlots)>;

    fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        f.write_str("une liste de segments")
    }

    fn visit_seq<A: serde::de::SeqAccess<'de>>(self, mut seq: A) -> Result<Self::Value, A::Error> {
        let mut out = Vec::new();
        while let Some(s) = seq.next_element_seed(SpanSeed)? {
            out.push(s);
        }
        Ok(out)
    }
}

/// Entrées d'un état voulu → attributs (R7) : `false` et `null` valent « absent ».
fn attrs_of(entries: Vec<TextAttr>) -> SpanAttrs {
    let mut a = SpanAttrs::default();
    for e in entries {
        match e {
            TextAttr::Bold(b) => a.bold = b,
            TextAttr::Italic(b) => a.italic = b,
            TextAttr::Underline(b) => a.underline = b,
            TextAttr::Color(c) => a.color = c,
            TextAttr::Size(s) => a.size = s.map(f64::from),
            TextAttr::Font(f) => a.font = f,
        }
    }
    a
}

/// Segments voulus de `set_text` et `set_table_cell` (C7b, R7) : une liste d'objets `{ text, attrs }`, `attrs` lu comme
/// le patch de `format_text` ; pas une liste, clé inconnue, type faux : `BadFormat`. Les valeurs hors domaine sont
/// refusées ensuite par le cœur (`valid_spans`). Générique pour être testée en natif, comme `read_patch`.
fn read_spans_input<'de, D: serde::Deserializer<'de>>(d: D) -> Result<Vec<SpanInput>, CommandError> {
    let raw = d
        .deserialize_seq(SpansVisitor)
        .map_err(|_| CommandError::BadFormat)?;
    let mut out = Vec::with_capacity(raw.len());
    for (text, slots) in raw {
        out.push(SpanInput {
            text,
            attrs: attrs_of(entries_of(slots)?),
        });
    }
    Ok(out)
}

/// Paramètre `spans` de la page : `undefined` ou `null` = absent (comportement d'avant C7b).
fn spans_arg(v: JsValue) -> Result<Option<Vec<SpanInput>>, CommandError> {
    if v.is_undefined() || v.is_null() {
        return Ok(None);
    }
    read_spans_input(serde_wasm_bindgen::Deserializer::from(v)).map(Some)
}
```

  `set_table_cell` (`:452`) : paramètre `spans: JsValue` après `row_height`, corps
  `let spans = spans_arg(spans).map_err(cmd_err)?;` puis
  `.set_table_cell_inner(id, [row, col], content, row_height, spans)`. `set_text` (`:650`) : paramètre `spans: JsValue`
  après `box_height`, même lecture, `spans` passé en dernier à `set_text_inner`. Doc-commentaires : « `spans` : C7b,
  état voulu des segments (`undefined` : absent) ». `set_table_cell_inner` et `set_text_inner` gagnent
  `spans: Option<Vec<SpanInput>>` en dernier et le passent à la commande (au lieu de `spans: None`).

- [ ] **Étape 6 : adaptateur.** `wasm-core.ts` : import `:25` `import { cleanPatch } from "./rich-text";` (retirer
  `plainSpans` s'il n'est plus employé) et `TextSpan` à l'import de types s'il manque ; ajouter près de `toU32` :

```ts
/** Segments voulus (C7b, R7) : attributs nettoyés (`cleanPatch`, comme FormatText) ; absents : undefined (Option::None). */
const spansArg = (spans: readonly TextSpan[] | undefined): unknown =>
  spans === undefined ? undefined : spans.map((s) => ({ text: s.text, attrs: cleanPatch(s.attrs) }));
```

  `SetText` : `this.d.set_text(cmd.page, cmd.id ?? undefined, cmd.x, cmd.y, cmd.content, cmd.color, cmd.size, cmd.boxWidth, cmd.boxHeight, spansArg(cmd.spans))` ;
  `SetTableCell` : `this.d.set_table_cell(cmd.id, cmd.row, cmd.col, cmd.content, cmd.rowHeight, spansArg(cmd.spans))`.
  `toTable`, cellules : `spans: toSpans(spans, text)` (la tolérance de T6 et son commentaire PC7 sont retirés).

- [ ] **Étape 7 : vert.** Commande bornée de la section (tests natifs, module régénéré, taille, contrat).

- [ ] **Étape 8 : format et lint** (GC16) ; `bash scripts/controle-wasm-bindgen.sh Cargo.lock` (attendu : « identique »).

- [ ] **Étape 9 : commit.**

```bash
cd "$WT" && git add crates/roomboard-wasm/src/lib.rs && git add apps/web/src/core/wasm-core.ts && \
git add apps/web/src/core/wasm-core.contract.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(wasm): pass wanted spans to SetText and SetTableCell" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Commande bornée, noms vus, taille du module ; une ligne `Réutilisation :`.

---

<a id="tache-t13"></a>

### Tâche T13 — Branchement : barre, hôte, session

**Objectif.** Relier les pièces (DAR4) : `ToolbarHost.textFormat(a)` relayé au moteur ; une ligne `<FormatRow …/>`
dans `Toolbar.tsx`, après la rangée du tableau ; la session garde la même fabrique de zone (`board-session.ts`
inchangé) et ses tests lisent la zone comme un `HTMLElement` (effet de bord `board-session.test.ts:130`, `:209`).
Tests d'intégration : Ctrl+B dans la zone publie `textFormat` jusqu'à l'état du moteur ; une cellule écrite en gras
par la zone réelle part en `SetTableCell` avec ses segments. Suite web complète verte sur le vrai module. Scénario S1.

**Fichiers.**
- Modifier : `apps/web/src/app/toolbar-host.ts:1-20` (import, `ToolbarHost`, `HostTargets`), `:61-62` (implémentation) ;
  `apps/web/src/ui/Toolbar.tsx:1-18` (import), `:159-160` (une ligne)
- Tests : `apps/web/src/app/toolbar-host.test.ts`, `apps/web/src/ui/Toolbar.test.tsx`, `apps/web/src/app/board-session.test.ts`

**Interfaces.**
- Consomme (T9) : `FormatRow(props: { view, act })`, attributs `data-format*`, `[data-format-sep]` ;
  (T10) `#texte-edition` contenteditable, `readSelection`, `readText`, `setSelection` (T3) pour simuler la frappe ;
  (T11) `Engine.textFormat(a)`, `EngineState.textFormat`.
- Produit :

```ts
// app/toolbar-host.ts
export interface ToolbarHost { …existant…; /** Rangée Format (C7b, R13). */ textFormat(a: FormatAction): void }
HostTargets.engine(): Pick<Engine, …existant… | "textFormat">;
```
- Réutilise : `apps/web/src/app/toolbar-host.ts:13`, `:62` — patron `tableFill` : `textFormat: (a) => t.engine().textFormat(a)`.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web test -- src/app src/ui --reporter=verbose 2>&1 | grep -E "C7b|×|FAIL|Test Files|Tests " | tail -40 && \
cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -1 && rm -rf apps/web/src/wasm && \
wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && \
ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web test 2>&1 | grep -E "Test Files|Tests |FAIL" | tail -10 && \
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep -c "error TS"
```

Attendu : aucun `×` ; au moins 2 lignes `✓ Toolbar — rangée Format (C7b, R13) > …`, 2 lignes
`✓ … session — texte riche (C7b) …`, `✓ textFormat → engine.textFormat` ; suite complète : `Test Files … passed`,
aucun `FAIL` ; `tsc` : `0`.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé, aucun seuil changé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm-formats apps/web/src/` ;
  `[ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/target .`.
- GC4b Module Wasm régénéré depuis le worktree (commande ci-dessus), jamais commité.
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle.
- GC11 Interface : dans `ui/`, aucun `switch`, aucune taille en `px` dans un `.tsx`.
- GC12 OD80 : `Toolbar.tsx` est voisin de C10b : une ligne ajoutée après `<TableActionRow …/>`, un import.
- GC13 Périmètre : seuls les fichiers ci-dessus (`board-session.ts` n'est pas modifié).
- GC14 `tsc` vide.
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.

**Interdits.** Ne pas toucher `board-session.ts`, `TableActionRow`, `toolbar.ts`, `profile-edit.ts`.

**Critère « terminé ».** Commande bornée verte (suite web complète comprise), un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges.** `toolbar-host.test.ts` : le faux moteur (`:7-11`) gagne `textFormat: vi.fn(),` ; à la
  fin du bloc « ToolbarHost local » :

```ts
  it("textFormat → engine.textFormat (C7b, DAR4)", () => {
    const { host, engine } = setup();
    host.textFormat({ type: "bold" });
    host.textFormat({ type: "color", color: null });
    expect(engine.textFormat.mock.calls).toEqual([[{ type: "bold" }], [{ type: "color", color: null }]]);
  });
```

  `Toolbar.test.tsx` : `host` (`:25`) gagne `textFormat: vi.fn()` ; en fin de fichier :

```tsx
describe("Toolbar — rangée Format (C7b, R13)", () => {
  const PLAIN = { bold: false, italic: false, underline: false, size: 36, color: "default" } as const;

  it("outil Texte : rangée Format ; outil Tableau : après la rangée du tableau ; autre outil : rien", () => {
    const { container, setV } = setup();
    expect(container.querySelector("[data-format-sep]")).toBeNull();
    setV({ ...VIEW, tool: "text" });
    expect(container.querySelectorAll("button[data-format], button[data-format-size], button[data-format-color]")).toHaveLength(12);
    setV({ ...VIEW, tool: "table", tableCell: null });
    const buttons = [...container.querySelectorAll("button")];
    const lastFill = buttons.findLastIndex((b) => b.hasAttribute("data-table-fill"));
    const firstFormat = buttons.findIndex((b) => b.hasAttribute("data-format"));
    expect(lastFill).toBeGreaterThanOrEqual(0);
    expect(firstFormat).toBeGreaterThan(lastFill);
    setV({ ...VIEW, tool: "pen" });
    expect(container.querySelector("[data-format-sep]")).toBeNull();
  });

  it("clic sur G : host.textFormat({ type: \"bold\" }) ; grisé sans séance", () => {
    const { container, host, setV } = setup();
    setV({ ...VIEW, tool: "text", textFormat: null });
    expect(container.querySelector<HTMLButtonElement>('[data-format="bold"]')!.disabled).toBe(true);
    setV({ ...VIEW, tool: "text", textFormat: PLAIN });
    fireEvent.click(container.querySelector('[data-format="bold"]')!);
    expect((host.textFormat as ReturnType<typeof vi.fn>).mock.calls).toEqual([[{ type: "bold" }]]);
  });
});
```

  `board-session.test.ts` : `:130` `const area = document.getElementById("texte-edition") as HTMLElement;` ; `:209`
  `expect(on.container.querySelector("#texte-edition, [contenteditable]")).toBeNull();`. Ajouter les imports
  `import { readSelection, readText, setSelection } from "./rich-dom";` et, après le test « outil Tableau : grille,
  saisie, Tab (C10a) » :

```ts
  /** Le navigateur insère `s` à la sélection de la zone (DOM aplati), place le curseur après, puis émet `input`. */
  const typeIn = (zone: HTMLElement, s: string): void => {
    const sel = readSelection(zone) ?? { start: 0, end: 0 };
    const t = readText(zone);
    zone.textContent = t.slice(0, sel.start) + s + t.slice(sel.end);
    setSelection(zone, sel.start + s.length, sel.start + s.length);
    zone.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: s }));
  };

  it("session — texte riche (C7b) : outil Texte, la zone est un contenteditable ; Ctrl+B publie textFormat ; Échap : null", async () => {
    const s = await createBoardSession(fakeCore.blank(), shared);
    s.activate();
    s.engine.setTool("text");
    const c = s.engine.camera();
    s.engine.sink.begin(1, "text", [{ x: 200 * c.zoom + c.tx, y: 150 * c.zoom + c.ty, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 }]);
    s.engine.sink.close(1, "end");
    const zone = document.getElementById("texte-edition") as HTMLElement;
    expect([zone.hidden, zone.getAttribute("contenteditable")]).toEqual([false, "true"]);
    expect(s.engine.state().textFormat).toMatchObject({ bold: false });
    zone.dispatchEvent(new KeyboardEvent("keydown", { key: "b", ctrlKey: true, bubbles: true, cancelable: true }));
    expect(s.engine.state().textFormat?.bold).toBe(true);
    zone.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(s.engine.state().textFormat).toBeNull();
    s.dispose();
  });

  it("session — texte riche (C7b) : cellule, Ctrl+B puis « Total », Tab : SetTableCell en gras (S1)", async () => {
    const doc = fakeCore.blank();
    const s = await createBoardSession(doc, shared);
    s.activate();
    s.engine.setTool("table");
    const c = s.engine.camera();
    s.engine.sink.begin(1, "table", [{ x: 200 * c.zoom + c.tx, y: 150 * c.zoom + c.ty, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 }]);
    s.engine.sink.close(1, "end");
    container.querySelector<HTMLElement>(".rb-table-picker")!.querySelector<HTMLButtonElement>('button[data-cols="2"][data-rows="2"]')!.click();
    const zone = document.getElementById("texte-edition") as HTMLElement;
    zone.dispatchEvent(new KeyboardEvent("keydown", { key: "b", ctrlKey: true, bubbles: true, cancelable: true }));
    typeIn(zone, "Total");
    zone.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
    const id = doc.elementIds(doc.pageIds()[0] ?? "").at(-1) ?? "";
    const el = doc.element(id);
    if (el?.kind !== "table") throw new Error("tableau attendu");
    expect(el.table.cells[0]?.spans).toEqual([{ text: "Total", attrs: { bold: true } }]);
    expect(s.stage.dataset["table"]).toBe("2x2@0,1");
    s.dispose();
  });
```

  (Le second test reprend `container` du test C10a voisin : si ce nom n'est pas en portée, reprendre la même source que
  ce test, `s.stage.parentElement`, pour trouver `.rb-table-picker`.)

- [ ] **Étape 3 : vérifier le rouge.** Commande bornée (premier bloc) : `×` sur « textFormat → engine.textFormat »
  (méthode absente), sur la rangée Format de `Toolbar` (non branchée).

- [ ] **Étape 4 : code.** `toolbar-host.ts` : `import type { FormatAction } from "../engine/rich-edit";` ;
  `ToolbarHost`, après `tableFill(…)` :

```ts
  /** Bouton de la rangée Format (C7b, R13) : relayé au moteur, puis à l'outil actif. */
  textFormat(a: FormatAction): void;
```

  `HostTargets.engine` : ajouter `| "textFormat"` à la liste du `Pick`. Implémentation, après `tableFill: …,` :
  `textFormat: (a) => t.engine().textFormat(a),`. `Toolbar.tsx` : `import { FormatRow } from "./FormatRow";` et, après
  `<TableActionRow view={props.view} host={props.host} />` :

```tsx
        <FormatRow view={props.view} act={(a) => props.host.textFormat(a)} />
```

- [ ] **Étape 5 : vert.** Commande bornée complète : premier bloc vert, module régénéré, suite web complète verte,
  `tsc` `0`.

- [ ] **Étape 6 : commit.**

```bash
cd "$WT" && git add apps/web/src/app/toolbar-host.ts && git add apps/web/src/app/toolbar-host.test.ts && \
git add apps/web/src/ui/Toolbar.tsx && git add apps/web/src/ui/Toolbar.test.tsx && git add apps/web/src/app/board-session.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): wire the format row to the engine and the session" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Commande bornée et ses noms vus ; résultat de la suite complète ; une ligne `Réutilisation :`.

---

<a id="tache-t14"></a>

### Tâche T14 — Essai Playwright C7b (S1-S4), `verifier.sh --e2e`, deux captures

**Objectif.** Le geste du brief, joué au navigateur sur l'application construite (R21) : outil Texte, « Le chat noir »,
« chat » sélectionné, G puis la pastille rouge (zone et sélection gardées), Échap ; S2 (Ctrl+I, Ctrl+Z dans la zone,
puis hors de la zone, Ctrl+Y) ; outil Tableau 2 × 2, « aa », curseur au milieu, Ctrl+B, « a » (la deuxième lettre
grasse), Fin, Ctrl+B, « Total » ; S3 (Ctrl+B puis composition « に » par CDP, repli synthétique ; déplacement qui
oublie l'attente) ; S4 (collage `text/html` + `text/plain` au milieu d'un mot gras, Ctrl+Z) ; Tab ; Ctrl+S, Ctrl+O :
tout relu dans le nouvel onglet. La scène ne bouge ni à l'ouverture ni à la validation (effet de bord R13). Ajouté au
bloc `--e2e` de `verifier.sh` et à son test ; deux captures dans `docs/essais/`. Scénarios S1, S2, S3, S4.

**Fichiers.**
- Créer : `scripts/essais/c7b-texte-riche-navigateur.mjs`, `docs/essais/c7b-texte-riche.png`,
  `docs/essais/c7b-cellule-riche.png`
- Modifier : `scripts/verifier.sh:91-101` (bloc `--e2e`), `scripts/tests/verifier-e2e.test.sh:13` (liste des essais)

**Interfaces.**
- Consomme : (T4) `coqueCsp()` de `commun.mjs` ; (T9, T13) `button[data-format="bold"]`,
  `button[data-format-color="rouge"]`, `aria-pressed` ; (T10) `#texte-edition` contenteditable, un `<span>` par segment ;
  (T12) module Wasm avec `spans` ; `#stage[data-elements]`, `[data-table]`, `[data-camera]`, `[data-ready]` (existants).
- Produit : `node scripts/essais/c7b-texte-riche-navigateur.mjs [--captures]` ; codes 0 réussi, 1 échec, 2 outil
  absent ; dernière ligne « C7b texte riche : OK ».
- Réutilise : `scripts/essais/commun.mjs:25-148` — `loadPlaywright`, `serve`, `frames`, `stageBox`, `stageMouse`,
  `noOverlap`, `item`, `TAB`, `VIEWPORT`, `coqueCsp` (T4).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -1 && rm -rf apps/web/src/wasm && \
wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && \
pnpm --filter @roomboard/web build 2>&1 | tail -2 && \
node scripts/essais/c7b-texte-riche-navigateur.mjs 2>&1 | tail -45 ; \
bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3 ; ls -l docs/essais/c7b-texte-riche.png docs/essais/c7b-cellule-riche.png
```

Attendu : au moins 25 lignes `ok — …` (dont « S1 : G puis rouge : la zone reste ouverte, « chat » toujours
sélectionné », « S1 : « aa », curseur au milieu, Ctrl+B, « a » : la deuxième lettre est grasse », « S2 : Ctrl+Z hors
de la zone : l'italique part en une étape », « S3 : Ctrl+B puis composition « に » : « に » gras », « S4 : collage »),
la ligne `IME : …`, « C7b texte riche : OK » ; « verifier-e2e.test.sh : OK » ; deux PNG présents. Le
`scripts/verifier.sh --e2e` complet est joué à la clôture (étage 4), après T14 et T15.

**Preuve visuelle.** Aucune commande de preuve visuelle automatique au profil (« Aucune automatique pour l'instant ») :
l'essai fait d'abord les lectures, puis les captures.
- Lectures (valeurs lues par l'essai, citées au rapport) : `button[data-format="bold"]` `aria-pressed="true"` sur
  « chat » ; segments de `#texte-edition` `[["Le ",false,false],["chat",true,true],[" noir",false,false]]` (texte, gras,
  rouge) ; cellule `[["a",false],["a",true],["a",false],["Total",true]]` puis après S3 et S4
  `[["ax",false],["にa",true],["a",false],["Total",true]]` ; `#stage[data-table]="2x2@0,1"` après Tab ; boîte de
  `#stage` égale avant l'ouverture, pendant la séance et après la validation.
- Captures (`--captures`, à la main seulement) : `docs/essais/c7b-texte-riche.png` — sur la page, « Le chat noir » avec
  « chat » en gras rouge, rangée Format visible dans la barre (grisée, zone fermée) ; `docs/essais/c7b-cellule-riche.png`
  — tableau 2 × 2, première cellule « axにaaTotal » avec « にa » et « Total » en gras, deuxième cellule active. Le rapport
  décrit ce qu'il voit sur chacune.

**Contraintes (recopiées).**
- GC2 TDD : l'essai d'abord, vu rouge (essai absent de la liste, puis échec sur un dist sans la saisie riche), puis le
  branchement ; aucun délai changé ; un essai qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm-formats apps/web/src/` ;
  `[ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/target .`.
- GC4b Module Wasm régénéré et application construite depuis le worktree (commande ci-dessus).
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite le nombre de lignes `ok —`, la ligne `IME :` et « OK ».
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle (Playwright du cache `npx`, comme les autres essais).
- GC13 Périmètre : seuls les fichiers ci-dessus.
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.

**Interdits.** `verifier.sh --e2e` ne passe jamais `--captures` ; aucune requête hors de 127.0.0.1 ; ne pas modifier
les autres essais (T15) ni `commun.mjs`.

**Critère « terminé ».** Commande bornée verte, deux PNG commités, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4), régénérer le module et construire (GC4b).

- [ ] **Étape 2 : test rouge du branchement.** Dans `scripts/tests/verifier-e2e.test.sh:13`, la liste devient
  `for s in s2-navigateur s34-navigateur fichiers-navigateur s5b-navigateur c2-image-navigateur c1-profils-navigateur c10a-tableau-navigateur c9-grille-navigateur c7b-texte-riche-navigateur; do`.
  `bash scripts/tests/verifier-e2e.test.sh` : « ECHEC : c7b-texte-riche-navigateur absent de verifier.sh ».

- [ ] **Étape 3 : l'essai.** Créer `scripts/essais/c7b-texte-riche-navigateur.mjs` :

```js
#!/usr/bin/env node
// Essai C7b « texte riche » au navigateur (S1 à S4 du cadrage, R21). L'application construite (apps/web/dist) servie
// en local avec la CSP de la coque, Chromium headless de Playwright, mode repli (`?fichiers=repli`), heure figée.
// S1 : outil Texte, « Le chat noir », « chat » sélectionné, G puis la pastille rouge de la rangée Format (zone et
// sélection gardées), Échap. S2 : Ctrl+I et Ctrl+Z dans la zone, puis hors de la zone, Ctrl+Y. Outil Tableau 2 × 2,
// « aa », curseur au milieu, Ctrl+B, « a » : la deuxième lettre grasse ; Fin, Ctrl+B, « Total ». S3 : Ctrl+B puis
// composition « に » (CDP, repli synthétique). S4 : collage text/html + text/plain au milieu de « Total ». Tab, Ctrl+S,
// Ctrl+O : relus dans le nouvel onglet. Oracle : segments de #texte-edition (texte, gras, italique, couleur calculés),
// #stage[data-elements], [data-table], boîte de #stage. Aucune requête hors de 127.0.0.1. Lancé par
// scripts/verifier.sh --e2e, sans option de capture. Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/c7b-texte-riche-navigateur.mjs [--captures]
// (--captures : docs/essais/c7b-texte-riche.png, docs/essais/c7b-cellule-riche.png).
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, frames, gitSha, item, loadPlaywright, noOverlap, serve, stageBox, stageMouse } from "./commun.mjs";

const LABEL = "C7b texte riche";
const FIXED = new Date("2026-11-20T08:00:00.000Z");
/** Points cliqués sur la scène (px de la scène) : coin du texte, coin du tableau. */
const TEXT_AT = [300, 200];
const TABLE_AT = [300, 420];
const COL = 240;
const ROW = 64;
const RED = "rgb(220, 38, 38)";
const BOLD = 'button[data-format="bold"]';

/** Pixels rouges (#dc2626 environ) dans [x0, y0, x1, y1], px CSS de `#scene`. */
function redIn(page, box) {
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
      for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i + 1] < 90 && d[i + 2] < 90) n++;
      return n;
    },
    box,
  );
}

const sameBox = (a, b) => ["x", "y", "width", "height"].every((k) => Math.abs(a[k] - b[k]) < 0.5);
const flags = (spans) => JSON.stringify(spans.map(([t, b]) => [t, b]));

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
  const elements = async () => Number(await attr("data-elements"));
  const waitTable = (v) =>
    page
      .waitForFunction((v) => document.querySelector("#stage")?.getAttribute("data-table") === v, v, { timeout: 15000 })
      .catch(async () => {
        throw new Echec(`data-table attendu « ${v} », lu « ${await attr("data-table")} »`);
      });
  /** Segments rendus dans la zone : [texte, gras, italique, couleur calculée] par `<span>`. */
  const zoneSpans = () =>
    page.$$eval("#texte-edition span", (els) =>
      els.map((e) => {
        const s = getComputedStyle(e);
        return [e.textContent, Number(s.fontWeight) >= 700, s.fontStyle === "italic", s.color];
      }),
    );
  const zoneOpen = () => page.$eval("#texte-edition", (z) => !z.hidden && document.activeElement === z);
  const zoneText = () => page.$eval("#texte-edition", (z) => z.textContent ?? "");
  const selected = () => page.evaluate(() => String(window.getSelection()));
  const camera = async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    return { zoom, tx, ty };
  };
  const toWorld = (c, [x, y]) => [(x - c.tx) / c.zoom, (y - c.ty) / c.zoom];
  const toStage = (c, [wx, wy]) => [wx * c.zoom + c.tx, wy * c.zoom + c.ty];
  const press = async (k, n = 1) => {
    for (let i = 0; i < n; i++) await page.keyboard.press(k);
  };
  const shot = async (name) => {
    if (!captures) return;
    await fr();
    const path = join(ROOT, "docs", "essais", name);
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  };
  const saveTo = async (name) => {
    const dl = page.waitForEvent("download");
    await page.keyboard.press("Control+s");
    const file = join(tmp, name);
    await (await dl).saveAs(file);
    return file;
  };
  const cdp = await page.context().newCDPSession(page);
  let imeMode = null;
  /** Composition IME de `text` validée telle quelle (patron de s34-navigateur.mjs:135-170) : CDP d'abord ; si
   *  `compositionstart` n'est pas vu après `imeSetComposition`, repli synthétique (HC7b-9). */
  const compose = async (text) => {
    await page.evaluate(() => {
      window.__ime = [];
      window.addEventListener("compositionstart", () => window.__ime.push("compositionstart"), { capture: true, once: true });
    });
    let mode = imeMode ?? "CDP Input.imeSetComposition";
    if (mode !== "synthétique") {
      try {
        await cdp.send("Input.imeSetComposition", { text, selectionStart: text.length, selectionEnd: text.length });
      } catch {
        mode = "synthétique";
      }
      await fr();
      if (mode !== "synthétique" && !(await page.evaluate(() => window.__ime.includes("compositionstart")))) mode = "synthétique";
    }
    imeMode = mode;
    if (mode !== "synthétique") {
      await cdp.send("Input.insertText", { text }); // la composition se valide telle quelle : compositionend
      await fr();
    } else {
      await page.evaluate((t) => {
        const z = document.getElementById("texte-edition");
        z.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" }));
        const sel = window.getSelection();
        const r = sel.getRangeAt(0);
        r.deleteContents();
        const n = document.createTextNode(t);
        r.insertNode(n);
        sel.setBaseAndExtent(n, t.length, n, t.length);
        z.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: t }));
      }, text);
      await fr();
    }
  };

  await page.goto(url);
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await fr();

  // S1 : texte, « chat » en gras rouge par la rangée Format.
  await page.click(item("text"));
  await fr();
  check(await page.isDisabled(BOLD), "S1 : outil Texte, rangée Format montrée, grisée hors séance");
  const box0 = await stageBox(page);
  const c1 = await camera();
  const wText = toWorld(c1, TEXT_AT);
  await mouse.click(TEXT_AT[0], TEXT_AT[1]);
  await fr();
  check(await zoneOpen(), "S1 : clic, la zone de saisie riche s'ouvre et a le focus");
  const box1 = await stageBox(page);
  check(!(await page.isDisabled(BOLD)), "S1 : séance ouverte, rangée Format active");
  await page.keyboard.type("Le chat noir");
  await press("Home");
  await press("ArrowRight", 3);
  await press("Shift+ArrowRight", 4);
  check((await selected()) === "chat", "S1 : « chat » sélectionné");
  await page.click(BOLD);
  await page.click('button[data-format-color="rouge"]');
  await fr();
  check((await zoneOpen()) && (await selected()) === "chat", "S1 : G puis rouge : la zone reste ouverte, « chat » toujours sélectionné");
  check((await page.getAttribute(BOLD, "aria-pressed")) === "true", "S1 : G enfoncé sur la sélection");
  const s1 = await zoneSpans();
  check(
    JSON.stringify(s1.map(([t, b, , c]) => [t, b, c === RED])) === JSON.stringify([["Le ", false, false], ["chat", true, true], [" noir", false, false]]),
    `S1 : segments de la zone ${JSON.stringify(s1)}`,
  );
  await press("Escape");
  await fr();
  const box2 = await stageBox(page);
  check(!(await zoneOpen()) && (await elements()) === 1, "S1 : Échap : texte écrit, zone fermée");
  check(sameBox(box0, box1) && sameBox(box1, box2), `S1 : la scène ne bouge ni à l'ouverture ni à la validation (${Math.round(box0.height)} px)`);
  check(box2.height >= 640 && (await noOverlap(page, '[data-toolbar="outils"]')).apart, "S1 : barre et scène sans chevauchement, scène ≥ 640 px (HC7b-3)");
  check((await redIn(page, [TEXT_AT[0], TEXT_AT[1], TEXT_AT[0] + 320, TEXT_AT[1] + 70])) > 0, "S1 : sur la scène, des pixels rouges (« chat »)");
  await shot("c7b-texte-riche.png");

  // S2 : une mise en forme s'annule en une étape, dans la zone puis hors de la zone.
  const reopenText = async (c) => {
    await page.click(item("text"));
    const [x, y] = toStage(c, [wText[0] + 20, wText[1] + 20]);
    await mouse.click(x, y);
    await fr();
  };
  await reopenText(c1);
  check(await zoneOpen(), "S2 : clic sur le texte : la zone se rouvre");
  await press("End");
  await press("Shift+ArrowLeft", 4);
  check((await selected()) === "noir", "S2 : « noir » sélectionné");
  await press("Control+i");
  check((await zoneSpans()).some(([t, , it]) => t === "noir" && it), "S2 : Ctrl+I : « noir » en italique");
  await press("Control+z");
  check(
    !(await zoneSpans()).some(([, , it]) => it) && (await zoneText()) === "Le chat noir" && (await selected()) === "noir",
    "S2 : Ctrl+Z dans la zone : l'italique part, texte et sélection restent",
  );
  await press("Control+i");
  await press("Escape");
  await fr();
  await press("Control+z");
  await fr();
  await reopenText(c1);
  const undone = await zoneSpans();
  check(
    !undone.some(([, , it]) => it) && undone.some(([t, b, , c]) => t === "chat" && b && c === RED),
    "S2 : Ctrl+Z hors de la zone : l'italique part en une étape, « chat » reste gras rouge",
  );
  await press("Escape");
  await fr();
  await press("Control+y");
  await fr();
  await reopenText(c1);
  check((await zoneSpans()).some(([t, , it]) => t === "noir" && it), "S2 : Ctrl+Y : l'italique revient");
  await press("Escape");
  await fr();

  // S1 : cellule, « aa », curseur au milieu, Ctrl+B, « a ».
  await page.click(item("table"));
  await fr();
  check(await page.isDisabled(BOLD), "S1 : outil Tableau, rangée Format grisée sans cellule ouverte");
  const t0 = await stageBox(page);
  const c2 = await camera();
  const wTable = toWorld(c2, TABLE_AT);
  await mouse.click(TABLE_AT[0], TABLE_AT[1]);
  await page.waitForSelector(".rb-table-picker:not([hidden])", { timeout: 5000 });
  await page.click('button[aria-label="2 colonnes, 2 lignes"]');
  await waitTable("2x2@0,0");
  const t1 = await stageBox(page);
  check((await zoneOpen()) && !(await page.isDisabled(BOLD)) && sameBox(t0, t1), "S1 : tableau 2 × 2, cellule ouverte, rangée active, la scène ne bouge pas");
  await page.keyboard.type("aa");
  await press("ArrowLeft");
  await press("Control+b");
  await page.keyboard.type("a");
  const cellA = await zoneSpans();
  check(flags(cellA) === JSON.stringify([["a", false], ["a", true], ["a", false]]), `S1 : « aa », curseur au milieu, Ctrl+B, « a » : la deuxième lettre est grasse (${flags(cellA)})`);
  await press("End");
  await press("Control+b");
  await page.keyboard.type("Total");
  const cellB = await zoneSpans();
  check(flags(cellB) === JSON.stringify([["a", false], ["a", true], ["a", false], ["Total", true]]), `S1 : Fin, Ctrl+B, « Total » en gras (${flags(cellB)})`);

  // S3 : Ctrl+B puis composition « に » après le premier « a » ; puis un déplacement oublie l'attente.
  await press("Home");
  await press("ArrowRight");
  await press("Control+b");
  await compose("に");
  console.log(`IME : ${imeMode}`);
  check(await zoneOpen(), "S3 : composition validée, la cellule reste ouverte");
  const cellC = await zoneSpans();
  check(flags(cellC) === JSON.stringify([["a", false], ["にa", true], ["a", false], ["Total", true]]), `S3 : Ctrl+B puis composition « に » : « に » gras (${flags(cellC)})`);
  await press("Home");
  await press("Control+b");
  await press("ArrowRight");
  await page.keyboard.type("x");
  const cellD = await zoneSpans();
  check(flags(cellD) === JSON.stringify([["ax", false], ["にa", true], ["a", false], ["Total", true]]), `S3 : Ctrl+B puis déplacement : plus de gras (${flags(cellD)})`);

  // S4 : collage au milieu de « Total » : texte brut, en gras, aucune image ; Ctrl+Z le retire seul.
  await press("End");
  await press("ArrowLeft", 2);
  const prior = await zoneText();
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData("text/html", '<b>gras</b><img src="data:,">');
    dt.setData("text/plain", "collé");
    document.getElementById("texte-edition").dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await fr();
  const pasted = await zoneSpans();
  check(
    pasted.some(([t, b]) => t === "Totcolléal" && b) && (await page.$$("#texte-edition img")).length === 0,
    `S4 : collage : « collé » inséré en gras dans « Total », aucune image (${flags(pasted)})`,
  );
  await press("Control+z");
  check((await zoneText()) === prior, "S4 : Ctrl+Z dans la zone : le collage part seul");

  // Tab : la cellule est écrite (une SetTableCell), la suivante s'ouvre ; Échap, capture.
  await press("Tab");
  await waitTable("2x2@0,1");
  check(true, "S1 : Tab : cellule écrite, data-table 2x2@0,1");
  await press("Escape");
  await fr();
  await shot("c7b-cellule-riche.png");

  // S1 : Ctrl+S, Ctrl+O : texte et cellule relus dans le nouvel onglet.
  const before = await page.locator(TAB).count();
  const file = await saveTo("riche.roomboard");
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Control+o");
  await (await chooser).setFiles(file);
  await page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, before + 1, { timeout: 15000 });
  await fr();
  check((await page.locator(TAB).count()) === before + 1, "S1 : Ctrl+S puis Ctrl+O : rouvert dans un nouvel onglet");
  const c3 = await camera();
  await reopenText(c3);
  const r1 = await zoneSpans();
  check(
    r1.some(([t, b, , c]) => t === "chat" && b && c === RED) && r1.some(([t, , it]) => t === "noir" && it),
    `S1 : rouvert : « chat » gras rouge, « noir » italique (${JSON.stringify(r1)})`,
  );
  await press("Escape");
  await fr();
  await page.click(item("table"));
  await fr();
  const [cx, cy] = toStage(c3, [wTable[0] + COL / 2, wTable[1] + ROW / 2]);
  await mouse.click(cx, cy);
  await waitTable("2x2@0,0");
  const r2 = await zoneSpans();
  check(flags(r2) === JSON.stringify([["ax", false], ["にa", true], ["a", false], ["Total", true]]), `S1 : rouvert : la cellule garde sa mise en forme (${flags(r2)})`);
  await press("Escape");
  await fr();
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
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c7b-"));
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

- [ ] **Étape 4 : vérifier l'essai.** `node scripts/essais/c7b-texte-riche-navigateur.mjs 2>&1 | tail -45` : toutes les
  lignes `ok —`, « C7b texte riche : OK ». Un échec réel se corrige dans le code de l'application par une tâche de
  correction (rapport « bloqué », message exact), jamais en affaiblissant une vérification de l'essai.

- [ ] **Étape 5 : branchement.** Dans `scripts/verifier.sh`, bloc `--e2e`, après
  `node scripts/essais/c9-grille-navigateur.mjs` : `node scripts/essais/c7b-texte-riche-navigateur.mjs`.
  `bash scripts/tests/verifier-e2e.test.sh` : « verifier-e2e.test.sh : OK ».

- [ ] **Étape 6 : captures.** `node scripts/essais/c7b-texte-riche-navigateur.mjs --captures 2>&1 | grep capture`
  (deux lignes `capture : …`) ; ouvrir les deux PNG et décrire ce qu'on y voit (Preuve visuelle).

- [ ] **Étape 7 : commit.**

```bash
cd "$WT" && git add scripts/essais/c7b-texte-riche-navigateur.mjs && git add scripts/verifier.sh && \
git add scripts/tests/verifier-e2e.test.sh && git add docs/essais/c7b-texte-riche.png && git add docs/essais/c7b-cellule-riche.png && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "test(essais): C7b rich text browser scenario and captures" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Nombre de lignes `ok —`, ligne `IME :`, lectures de la preuve visuelle, description des deux captures ; une
ligne `Réutilisation :`.

---

<a id="tache-t15"></a>

### Tâche T15 — Essais s34, s5b, c10a sur la zone contenteditable

**Objectif.** Les trois essais qui lisent la zone (R21, effet de bord R1) passent de `textarea#texte-edition`,
`.value` et `inputValue` à `#texte-edition` et `textContent` ; leurs vérifications restent les mêmes, en nombre et en
sens. Scénario S3 (l'IME de `s34` sur la zone riche).

**Fichiers.**
- Modifier : `scripts/essais/s34-navigateur.mjs:63-75`, `:114`, `:143-147`, `:152`, `:163-164`, `:185`, `:188-190`,
  `:198`, `:237` ; `scripts/essais/s5b-navigateur.mjs:227` ; `scripts/essais/c10a-tableau-navigateur.mjs:7`, `:53`

**Interfaces.**
- Consomme : (T10) `#texte-edition` contenteditable (`hidden` fermé, texte lu par `textContent`) ; (T4) imports de
  `c10a-tableau-navigateur.mjs` déjà sur `coqueCsp`.
- Produit : rien de neuf (mêmes essais, mêmes libellés « S3/S4 lot 4 : OK », « S5b : OK », « C10a tableau : OK »).
- Réutilise : `scripts/essais/commun.mjs:25-148` — `stageMouse`, `frames`, `inkIn`, `item` (inchangés).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -1 && rm -rf apps/web/src/wasm && \
wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && \
pnpm --filter @roomboard/web build 2>&1 | tail -2 && \
for s in s34 s5b c10a-tableau; do node scripts/essais/$s-navigateur.mjs > /tmp/c7b-$s.log 2>&1; echo "$s : $(grep -c 'check(' scripts/essais/$s-navigateur.mjs) check, $(grep -c '^ok — ' /tmp/c7b-$s.log) ok"; grep -E ": OK|ÉCHEC|IME :" /tmp/c7b-$s.log | tail -2; done
```

Attendu : « S3/S4 lot 4 : OK », « S5b : OK », « C10a tableau : OK » ; pour chaque essai, le nombre d'appels
`check(` égal à celui relevé à l'étape 1 (mêmes vérifications) ; ligne `IME :` de `s34` présente.

**Contraintes (recopiées).**
- GC2 Aucune vérification retirée ni affaiblie, aucun délai changé ; un essai qui échoue sur un délai est rejoué une
  fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ;
  `[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/apps/web/src/wasm-formats apps/web/src/` ;
  `[ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche/target .`.
- GC4b Module Wasm régénéré et application construite depuis le worktree (commande ci-dessus).
- GC5 Preuve bornée : la commande ci-dessus ; le rapport cite les comptes `ok` avant et après.
- GC6 Commits : `git add <chemin>` un par un (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC12 OD80 : dans `c10a-tableau-navigateur.mjs`, seulement la lecture de la zone (deux lignes) et l'en-tête.
- GC13 Périmètre : seuls les trois essais ci-dessus.
- GC15 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.

**Interdits.** Ne pas modifier `verifier.sh`, `commun.mjs` ni les captures commitées ; aucun `--captures`.

**Critère « terminé ».** Commande bornée verte, mêmes comptes `ok`, un commit.

**Étapes.**

- [ ] **Étape 1 : compter les vérifications de référence**, sur le code d'avant la zone riche (branche principale, sans
  rien construire) : `for s in s34 s5b c10a-tableau; do grep -c "check(" scripts/essais/$s-navigateur.mjs; done`
  (nombre d'appels `check(` par fichier, à retrouver identique après l'étape 3) ; puis préparer le worktree (GC4) et
  construire (GC4b).

- [ ] **Étape 2 : vérifier le rouge.** `node scripts/essais/s34-navigateur.mjs 2>&1 | tail -3` : « ÉCHEC » (attente
  de `textarea#texte-edition`).

- [ ] **Étape 3 : adapter.** `s34-navigateur.mjs` : après `editorOpen` (`:63`), ajouter
  `const zoneText = () => page.$eval("#texte-edition", (z) => z.textContent ?? "");` ; `:70`, `:152`, `:198` :
  `page.inputValue("#texte-edition")` → `zoneText()` ; `:114`, `:185`, `:237` : `"textarea#texte-edition"` →
  `"#texte-edition"` ; repli synthétique `:143-147`, `:163-164`, `:188-190` : `t.value = "…"` → `t.textContent = "…"`
  (mêmes textes : « ni », « Bonjour », « にほん »). `s5b-navigateur.mjs:227` : `"textarea#texte-edition"` →
  `"#texte-edition"`. `c10a-tableau-navigateur.mjs:53` :
  `const editorValue = () => page.$eval("#texte-edition", (z) => z.textContent ?? "");` et, dans l'en-tête `:7`,
  « la valeur de #texte-edition » → « le texte de #texte-edition ». Contrôle :
  `grep -n "textarea\|inputValue(\"#texte\|\.value = " scripts/essais/s34-navigateur.mjs scripts/essais/s5b-navigateur.mjs scripts/essais/c10a-tableau-navigateur.mjs`
  ne rend rien, et `grep -c "check(" …` rend les nombres de l'étape 1.

- [ ] **Étape 4 : vert.** Commande bornée de la section.

- [ ] **Étape 5 : commit.**

```bash
cd "$WT" && git add scripts/essais/s34-navigateur.mjs && git add scripts/essais/s5b-navigateur.mjs && \
git add scripts/essais/c10a-tableau-navigateur.mjs && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "test(essais): read the rich text zone in s34, s5b and c10a" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Comptes `check(` avant et après, lignes `ok —` vues, ligne `IME :` de `s34`, trois « : OK » ; une ligne
`Réutilisation :`.
