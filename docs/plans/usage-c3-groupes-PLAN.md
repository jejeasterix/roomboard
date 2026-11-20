# Plan d'exécution — usage-c3-groupes (C3 : groupes, fragments et presse-papiers)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Cœur : champ `group`, `Group` / `Ungroup`, gomme qui garde le groupe | — | `crates/roomboard-core/src/element.rs`, `crates/roomboard-core/src/document.rs`, `crates/roomboard-core/src/commands.rs` | isolé (`~/projets/roomboard-wt/usage-c3-groupes--T1`) | implementeur-tdd | `cargo test -p roomboard-core 2>&1 \| grep -E "^test .*(group\|erase)\|test result\|FAILED\|panicked\|error\[" \| tail -40` : 0 `FAILED`, ≥ 8 tests nommés dont `group_writes_new_outer_id_on_each_element`, `partial_erase_keeps_group`, `ungroup_without_group_is_no_step` ; `socle_fixture_resaves_identically` vert | S1, S5 | #tache-t1 |
| T2 | Cœur : recopie profonde, `extract`, `insert_fragment`, `insert_pages` | — | `crates/roomboard-core/src/copy.rs` (neuf), `crates/roomboard-core/src/lib.rs` | isolé (`~/projets/roomboard-wt/usage-c3-groupes--T2`) | concepteur-critique | `cargo test -p roomboard-core copy:: 2>&1 \| grep -E "^test \|test result\|FAILED\|panicked\|error\[" \| tail -30` : 0 `FAILED`, ≥ 12 tests `copy::tests::` dont `insert_twice_gives_distinct_ids_and_groups`, `insert_pages_after_page_copies_backdrop_grid_and_elements`, `extract_has_no_undo_step` | S2, S3, S4 | #tache-t2 |
| T3 | Cœur : `kind` du manifeste, codeur du `.rbitem`, association de la coque | — | `crates/roomboard-core/src/format/mod.rs`, `crates/roomboard-core/src/query.rs`, `crates/roomboard-shell/src/lib.rs`, `apps/desktop/src-tauri/tauri.conf.json` | isolé (`~/projets/roomboard-wt/usage-c3-groupes--T3`) | concepteur-critique | `cargo test -p roomboard-core -p roomboard-shell 2>&1 \| grep -E "^test .*(kind\|fragment\|manifest\|launch_paths\|deterministic)\|test result\|FAILED\|error\[" \| tail -40` : 0 `FAILED`, ≥ 9 tests nommés dont `manifest_without_kind_is_document`, `unknown_kind_is_refused`, `fragment_is_not_a_document`, `document_is_not_a_fragment` ; `save_is_deterministic`, `socle_fixture_resaves_identically` verts | S3, S5 | #tache-t3 |
| T4 | Contrat TS : commandes et méthodes C3, fausse liaison, contrôle de forme `group` | — | `apps/web/src/core/api.ts`, `apps/web/src/core/fake-core.ts`, `apps/web/src/core/fake-core.test.ts`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts` | isolé (`~/projets/roomboard-wt/usage-c3-groupes--T4`) | concepteur-critique | `pnpm --filter @roomboard/web test -- src/core --reporter=verbose 2>&1 \| grep -E "C3\|×\|Test Files\|Tests " \| tail -40` : 0 `×`, « contrat C3 : fausse liaison » ≥ 14 tests, « contrôle de forme C3 » ≥ 2 ; blocs C2, C7, C9, C10a, C7b verts | S1, S2, S3, S4, S5 | #tache-t4 |
| T5 | Règle des groupes dans la page (`groups.ts`), raccourcis Ctrl+G | — | `apps/web/src/engine/groups.ts` (neuf), `apps/web/src/engine/groups.test.ts` (neuf), `apps/web/src/engine/input/keys.ts`, `apps/web/src/engine/input/keys.test.ts` | isolé (`~/projets/roomboard-wt/usage-c3-groupes--T5`) | implementeur-tdd | `pnpm --filter @roomboard/web test -- src/engine/groups.test.ts src/engine/input/keys.test.ts --reporter=verbose 2>&1 \| grep -E "✓\|×\|Tests " \| tail -40` : 0 `×`, « groupes de la page (Z2) » ≥ 7 tests, « keyAction : groupes (Z13) » ≥ 4 | S1 | #tache-t5 |
| T6 | Presse-papiers (enveloppe, interne, système, `handleCopy`) et collage des objets | — | `apps/web/src/platform/clipboard.ts` (neuf), `apps/web/src/platform/clipboard.test.ts` (neuf), `apps/web/src/platform/paste.ts`, `apps/web/src/platform/paste.test.ts` | isolé (`~/projets/roomboard-wt/usage-c3-groupes--T6`) | implementeur-tdd | `pnpm --filter @roomboard/web test -- src/platform/clipboard.test.ts src/platform/paste.test.ts --reporter=verbose 2>&1 \| grep -E "✓\|×\|Tests " \| tail -40` : 0 `×`, « enveloppe (U9, Z8) » ≥ 7, « presse-papiers (Z8) » ≥ 5, « collage des objets (Z9) » ≥ 4 ; tests « collage (R19) » verts | S2 | #tache-t6 |
| T7 | Port de fichiers typés (`typed-files.ts`), profils en instance texte | — | `apps/web/src/platform/typed-files.ts` (neuf), `apps/web/src/platform/typed-files.test.ts` (neuf), `apps/web/src/platform/profile-files.ts` | isolé (`~/projets/roomboard-wt/usage-c3-groupes--T7`) | implementeur-tdd | `pnpm --filter @roomboard/web test -- src/platform/typed-files.test.ts src/platform/profile-files.test.ts --reporter=verbose 2>&1 \| grep -E "✓\|×\|Tests " \| tail -30` : 0 `×`, « fichiers typés (DAZ4) » ≥ 5, « ProfileFiles (C1, P25) » 6 verts | S3 | #tache-t7 |
| T8 | Lecture et écriture des conteneurs en un module (`container-io.ts`) | — | `apps/web/src/app/container-io.ts` (neuf), `apps/web/src/app/container-io.test.ts` (neuf), `apps/web/src/app/workspace.ts` | isolé (`~/projets/roomboard-wt/usage-c3-groupes--T8`) | implementeur-tdd | `pnpm --filter @roomboard/web test -- src/app/container-io.test.ts src/app/workspace.test.ts src/platform/container.contract.test.ts --reporter=verbose 2>&1 \| grep -E "container-io\|×\|Test Files\|Tests " \| tail -30` : 0 `×`, « conteneurs (DAZ3) » ≥ 8 tests ; `workspace.test.ts` et `container.contract.test.ts` verts | S3, S4 | #tache-t8 |
| T9 | Barre : rangée « Sélection », action « Insérer des pages… », hôte de la barre | — | `apps/web/src/ui/SelectionRow.tsx` (neuf), `apps/web/src/ui/SelectionRow.test.tsx` (neuf), `apps/web/src/ui/item-state.ts`, `apps/web/src/ui/Toolbar.tsx`, `apps/web/src/ui/Toolbar.test.tsx`, `apps/web/src/toolbar.ts`, `apps/web/src/toolbar.test.ts`, `apps/web/src/toolbar-profiles.ts`, `apps/web/src/toolbar-profiles.test.ts`, `apps/web/src/ui/PagesBar.test.tsx`, `apps/web/src/profile-edit.test.ts`, `apps/web/src/app/toolbar-host.ts`, `apps/web/src/app/toolbar-host.test.ts` | isolé (`~/projets/roomboard-wt/usage-c3-groupes--T9`) | implementeur-tdd | `pnpm --filter @roomboard/web test -- src/ui src/app/toolbar-host.test.ts src/toolbar-profiles.test.ts src/toolbar.test.ts src/profile-edit.test.ts --reporter=verbose 2>&1 \| grep -E "Sélection\|insert-file\|×\|Test Files\|Tests " \| tail -40` : 0 `×`, « rangée Sélection (Z13) » ≥ 5 tests, « hôte de la barre : C3 » ≥ 2 | S1, S2, S4 | #tache-t9 |
| T10 | Import : `.rbitem` reconnu (nom et en-tête ZIP), filtre « Importer » | — | `apps/web/src/platform/import.ts`, `apps/web/src/platform/import.test.ts`, `apps/web/src/platform/files.ts`, `apps/web/src/platform/files.test.ts`, `apps/web/src/platform/host-repli.test.ts`, `apps/web/src/platform/host-tauri.test.ts`, `apps/web/src/platform/host-fsa.ts`, `apps/web/src/platform/host-fsa.test.ts` | isolé (`~/projets/roomboard-wt/usage-c3-groupes--T10`) | implementeur-tdd | `pnpm --filter @roomboard/web test -- src/platform --reporter=verbose 2>&1 \| grep -E "rbitem\|×\|Test Files\|Tests " \| tail -30` : 0 `×`, « import d'un objet .rbitem (Z10) » ≥ 5 tests ; tous les tests de `src/platform` verts | S3, S5 | #tache-t10 |
| T11 | Liaison Wasm C3, contrat sur le vrai module, fixture `fragment-v1.rbitem` | T1, T2, T3, T4 | `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts`, `crates/roomboard-core/tests/compat_c3.rs` (neuf), `crates/roomboard-core/tests/fixtures/fragment-v1.rbitem` (neuf) | isolé (`~/projets/roomboard-wt/usage-c3-groupes--T11`) | implementeur-tdd | `cargo test -p roomboard-wasm -p roomboard-core c3 2>&1 \| grep -E "^test \|test result\|FAILED\|error\[" \| tail -30` ≥ 7 `ok` ; `ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web test -- src/core --reporter=verbose 2>&1 \| grep -E "C3\|×\|Tests " \| tail -60` : 0 `×`, « contrat C3 : vrai module wasm » ≥ 14, « contrat C3 : vrai module seulement » ≥ 2 ; module ≤ 1 572 864 o | S2, S4, S5 | #tache-t11 |
| T12 | Outil Sélection : clic, Maj+clic et rectangle par groupe | T4, T5 | `apps/web/src/engine/tools/select.ts`, `apps/web/src/engine/tools/select.test.ts` | isolé (`~/projets/roomboard-wt/usage-c3-groupes--T12`) | implementeur-tdd | `pnpm --filter @roomboard/web test -- src/engine/tools/select.test.ts --reporter=verbose 2>&1 \| grep -E "✓\|×\|Tests " \| tail -40` : 0 `×`, « outil Sélection : groupes (Z2) » ≥ 5 tests ; tests existants verts | S1 | #tache-t12 |
| T13 | Moteur : grouper, dégrouper, insérer un fragment ou des pages, état des boutons, attributs `#stage` | T4, T5 | `apps/web/src/engine/engine.ts`, `apps/web/src/engine/engine.test.ts`, `apps/web/src/app/stage-tags.ts`, `apps/web/src/app/stage-tags.test.ts`, `apps/web/src/app/board-session.ts` | isolé (`~/projets/roomboard-wt/usage-c3-groupes--T13`) | implementeur-tdd | `pnpm --filter @roomboard/web test -- src/engine/engine.test.ts src/app/stage-tags.test.ts --reporter=verbose 2>&1 \| grep -E "C3\|×\|Tests " \| tail -40` : 0 `×`, « moteur — C3 » ≥ 8 tests, « stageTags (C3) » ≥ 1 ; tests existants verts | S1, S2, S4 | #tache-t13 |
| T14 | Opérations sur la sélection d'un onglet (`fragments.ts`) | T4, T8 | `apps/web/src/app/fragments.ts` (neuf), `apps/web/src/app/fragments.test.ts` (neuf) | isolé (`~/projets/roomboard-wt/usage-c3-groupes--T14`) | implementeur-tdd | `pnpm --filter @roomboard/web test -- src/app/fragments.test.ts --reporter=verbose 2>&1 \| grep -E "✓\|×\|Tests " \| tail -40` : 0 `×`, « opérations sur la sélection (DAZ3) » ≥ 9 tests | S2, S3, S4 | #tache-t14 |
| T15 | Branchement : copier, couper, coller, exporter, insérer des pages, `.rbitem` déposé | T6, T7, T9, T10, T13, T14 | `apps/web/src/app/workspace.ts`, `apps/web/src/app/workspace.test.ts`, `apps/web/src/platform/typed-files.ts`, `apps/web/src/ui/App.tsx`, `apps/web/src/main.ts` | isolé (`~/projets/roomboard-wt/usage-c3-groupes--T15`) | implementeur-tdd | `pnpm --filter @roomboard/web test -- src/app --reporter=verbose 2>&1 \| grep -E "C3\|×\|Test Files\|Tests " \| tail -40` : 0 `×`, « espace de travail — C3 » ≥ 9 tests ; `pnpm --filter @roomboard/web test 2>&1 \| tail -8` 0 échec ; `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 \| tail -20` vide | S2, S3, S4 | #tache-t15 |
| T16 | Essai navigateur C3 dans `verifier.sh --e2e`, deux captures | T11, T12, T15 | `scripts/essais/c3-groupes-navigateur.mjs` (neuf), `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/c3-groupe-selectionne.png` (neuf), `docs/essais/c3-collage.png` (neuf) | isolé (`~/projets/roomboard-wt/usage-c3-groupes--T16`) | implementeur-tdd | `bash scripts/verifier.sh --e2e 2>&1 \| tail -60` : « C3 groupes : OK », « verifier.sh : e2e OK », « verifier.sh : OK », module Wasm cité ≤ 1572864 ; deux PNG présents | S1, S2, S3, S5 | #tache-t16 |

**Vagues (par dépendances, fichiers disjoints dans chaque vague).**
Vague 1 : T1, T2, T3, T4, T5, T6, T7, T8, T9, T10 (dix tâches, aucun fichier commun).
Vague 2 : T11 (dès T1, T2, T3, T4), T12 et T13 (dès T4, T5), T14 (dès T4, T8) — disjointes entre elles.
Vague 3 : T15 (dès T6, T7, T9, T10, T13, T14). Vague 4 : T16.
L'orchestrateur lance chaque tâche dès que ses dépendances sont fusionnées dans `feat/usage-c3-groupes`.

**Aucune tâche n'attend OD80** (`feat/usage-c10b-tableau`). Toutes partent de la tête de `feat/usage-c3-groupes`. T6 porte
les deux branches du collage (OD80 présent dans sa base ou non). Fichiers aussi touchés par OD80, à réconcilier au rebase
final (étage 4) : T1 `commands.rs` ; T4 `api.ts`, `fake-core.ts`, `fake-core.test.ts`, `wasm-core.ts`,
`wasm-core.contract.test.ts` ; T6 `paste.ts`, `paste.test.ts` ; T8 et T15 `workspace.ts`, `workspace.test.ts` ; T9
`toolbar.ts`, `ui/item-state.ts`, `app/toolbar-host.ts`, `app/toolbar-host.test.ts` ; T10 `import.ts`, `import.test.ts` ;
T11 `roomboard-wasm/src/lib.rs`, `wasm-core.ts`, `wasm-core.contract.test.ts` ; T12 `tools/select.ts`, `select.test.ts` ;
T13 `engine.ts`, `engine.test.ts`, `stage-tags.ts`, `stage-tags.test.ts`, `board-session.ts` ; T15 `main.ts` ; T16
`verifier.sh`, `scripts/tests/verifier-e2e.test.sh`. Chaque ajout de C3 est une branche, une variante ou une ligne de
plus, jamais une réécriture d'un passage d'OD80.

**Chemin critique.** T4 (≈ 45 min) → T13 ou T14 (≈ 35) → T15 (≈ 45) → T16 (≈ 40) ≈ 2 h 45. Rust : T2 (≈ 40) → T11
(≈ 40) → T16. Les autres tâches ne sont pas critiques.

**`tsc` entre les vagues (écarts nommés, les seuls permis).** Les preuves des tâches sont des `vitest`, qui ne vérifient
pas les types ; `tsc` n'est exigé vide qu'à T15 et T16.

| fichier | erreur attendue | fermée par |
|---|---|---|
| `src/core/wasm-core.ts` | `WasmCoreDocument` sans `extract`, `insertFragment`, `insertPages`, `saveFragment`, `saveFragmentParts` ; `createWasmCore` sans `loadFragment`, `loadFragmentParts` | T11 |
| `src/app/container-io.ts`, `container-io.test.ts` | méthodes C3 inconnues de `CoreDocument` / `CoreFactory`, dans le seul worktree de T8 | fusion de T4 |
| `src/app/fragments.ts` | `insertFragment` / `insertPages` inconnues d'`Engine`, dans le seul worktree de T14 | fusion de T13 |
| `src/ui/App.tsx` | `insertPages` et `selection` absents des `HostTargets` passés | T15 |
| littéraux `EngineState` des tests (`stage-tags.test.ts`, tout autre `*.test.*` qui en construit un) | `selectionUnits` / `selectionGrouped` absents | T13 |

**Goal :** grouper et dégrouper des objets, copier, couper et coller une sélection (presse-papiers interne et système,
enveloppe JSON), exporter la sélection en `.rbitem`, insérer un fragment déposé ou importé, insérer les pages d'un
`.roomboard`, le tout gardé à l'aller-retour.

**Architecture :** le cœur porte le champ `group` (vue, `Group`, `Ungroup`, gomme), une seule recopie profonde sur
`AsPrelim` de yrs (`copy.rs` : `extract`, `insert_fragment`, `insert_pages`, méthodes du document, DAZ1, DAZ2) et le
`kind` du manifeste avec le codeur du fragment (`format`). La page tient la règle de sélection par groupe (`groups.ts`,
DAZ5), les conteneurs en un module (`container-io.ts`, DAZ3), les opérations sur la sélection (`fragments.ts`), le
presse-papiers et les fichiers typés en ports (`clipboard.ts`, `typed-files.ts`, DAZ4) ; `handlePaste` reste le seul
point d'entrée du collage (Z9).

**Tech Stack :** Rust (yrs 0.28.1, zip, serde_json), wasm-bindgen, TypeScript, SolidJS 1.9.20, Vitest 3 (happy-dom),
Playwright (essai e2e). Aucune dépendance neuve.

**Spec :** `docs/plans/usage-c3-groupes-cadrage.md` (commit `7c036cc`, base `origin/main` `98bf320`).

## Global Constraints

- G1 — TDD : test rouge d'abord, lancé et vu rouge, puis le code, puis vert.
- G2 — Preuves bornées, qui montrent qu'un test a tourné : `cargo test -p <crate> <filtre> 2>&1 | grep … | tail -N`,
  `pnpm --filter @roomboard/web test -- <fichiers> --reporter=verbose 2>&1 | grep … | tail -N`. Avant toute commande :
  `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Worktree neuf : `pnpm install --frozen-lockfile` à la racine.
- G3 — Aucun build Tauri, aucun build Android.
- G4 — Plafond Wasm 1 572 864 octets (H2-13) ni baissé ni relevé ; module des formats ≤ 3 145 728 octets (R9).
- G5 — Aucun seuil changé, aucun test désactivé, sauté ou affaibli (un test existant adapté garde son intention).
- G6 — Aucune dépendance neuve (et jamais AGPL, GPL, LGPL).
- G7 — Commits : auteur et committer `jejeasterix <jejeasterix@users.noreply.github.com>` ; message anglais ; dernière
  ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (`git add <chemin>`),
  jamais `git add -A`, `git add .`, ni `git commit -a`. Aucun push.
- G8 — Compatibilité : un fichier d'avant C3 s'ouvre toujours, et un document s'écrit avec les mêmes octets
  (`socle_fixture_resaves_identically`, `save_is_deterministic`, `reload_with_strokes_keeps_bytes` verts).
- G9 — `cargo fmt --all --check` et `cargo clippy -p <crate> --all-targets -- -D warnings` propres pour toute tâche Rust.
- G10 — Messages visibles en français, typographie française (« », espaces avant « : ; ? ! »).
- G11 — Commande de commit (gabarit) :
  `git -C <worktree> -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "<message anglais>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

## Review Focus

1. Coller deux fois le même contenu dans le même onglet (S2, S3) : deux copies indépendantes — ids neufs, groupes
   renumérotés, un clic sur une copie ne prend jamais l'autre. Test `insert_twice_gives_distinct_ids_and_groups` (T2) et
   « deux insertions : ids et groupes indépendants » (T4, contrat C3).
2. Texte ordinaire ou JSON étranger dans le presse-papiers (Z8, effet de bord « un texte ordinaire reste ignoré ») :
   aucun objet collé, aucune erreur. Tests « texte ordinaire, JSON d'un autre format, base64 invalide : null » (T6) et
   « texte ordinaire collé : ni objet ni image » (T6).
3. Ctrl+C, Ctrl+X, Ctrl+G dans une zone de saisie (effet de bord « la zone de saisie garde le copier natif ») : rien de
   pris par RoomBoard. Tests « copie dans une zone éditable : non prise » (T6) et « Ctrl+G dans un champ : rien » (T5).
4. Ouvrir un `.rbitem` renommé en `.roomboard`, ou un fichier de `kind` inconnu (effet de bord « ouvrir … échoue
   désormais avec un message ») : message clair, aucun onglet. Tests `fragment_is_not_a_document`,
   `unknown_kind_is_refused` (T3) et « un fragment ouvert comme document : message, aucun onglet » (T15).
5. Annuler une insertion de pages avec images (S4) : une seule étape retire les pages **et** la métadonnée d'asset
   neuve ; la grille et le fond reviennent avec les pages rétablies. Test
   `insert_pages_after_page_copies_backdrop_grid_and_elements` (T2) et « insérer des pages : une étape » (T4).

## Choix du plan (hors cadrage, à relire)

- **PC1** `PasteSink.pasteItems(items: Uint8Array | "newer" | "too-big")` au lieu de `pasteItems(rbitem: Uint8Array)` :
  l'enveloppe refusée (« mettez RoomBoard à jour », « trop gros ») est dite par le même puits, qui rend vrai (pris).
- **PC2** `Clipboard.onChange(cb)` ajouté à l'interface du cadrage : l'état du bouton « Coller » suit une copie faite
  par Ctrl+C, qui ne change pas l'état du moteur.
- **PC3** `FragmentDeps.alive(tab)` ajouté : un onglet fermé pendant une lecture ne reçoit rien (patron d'`ImageTarget.alive`).
- **PC4** Moteur : `group()`, `ungroup()`, `insertFragment(src, dx, dy)`, `insertPages(src)` au lieu d'`insert(src, place)` ;
  le calcul du placement reste dans `fragments.ts`.
- **PC5** `extract` construit le fragment sur un `yrs::Doc` brut puis le décode (`Document::from_update_v1`) : aucune
  étape d'annulation dans le fragment, aucun champ privé de `Document` touché (T2 n'édite pas `document.rs`, que T1 édite).
- **PC6** `typed` passe dans `container-io.ts` (exporté) mais `image-import.ts` ne l'appelle pas : `platform/`
  importerait `app/` ; le constat d'architecture `workspace.ts:151` reste ouvert.
- **PC7** Message de `WrongKind { expected: "fragment" }` : « ce fichier est un document RoomBoard (.roomboard), pas un
  objet : ouvrez-le ou insérez ses pages ».
- **PC8** Un `.rbitem` dont un asset cité n'a pas pu être lu est refusé, comme « Insérer des pages… » (HZ2-6) :
  « <nom> : images non lues, rien n'est inséré ».
- **PC9** Attributs `#stage[data-units]` et `#stage[data-grouped]` (unités de la sélection, « 1 » si un élément
  sélectionné est groupé) : oracle de l'essai e2e.
- **PC10** `Bounds` (`query.rs`) gagne `Deserialize` pour le champ `bounds` du manifeste.
- **PC11** « Insérer des pages… » se place après « Retirer la page » dans `ACTION_TABLE` et dans la barre des pages du
  profil par défaut.

---

### Tâche T1 — Cœur : champ `group`, `Group` / `Ungroup`, gomme qui garde le groupe

<a id="tache-t1"></a>

**Objectif.** Le cœur lit le chemin `group` de chaque élément (vue `ElementView.group`), groupe et dégroupe en une étape
chacun, et la gomme partielle recopie le `group` du trait coupé sur ses morceaux (cadrage Z1, U7, DAU3 ; S1, S5).

**Fichiers.** Modifier `crates/roomboard-core/src/element.rs` (struct `ElementView` l. 75-96, `bare` l. 97, fonctions
neuves après `out_transform`), `crates/roomboard-core/src/document.rs` (`element`, l. 247-318),
`crates/roomboard-core/src/commands.rs` (`Command` l. 30, `CommandError` l. 175 et son `Display`, `apply` l. 472,
`Cut` l. 433, `cmd_erase` l. 979-1053, tests l. 1166+).

**Interfaces.**
- Produit (cœur, lu par T2, T11) :
  - `pub struct ElementView { …, #[serde(skip_serializing_if = "Option::is_none")] pub group: Option<Vec<String>> }`
  - `pub(crate) fn read_group<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<Vec<String>>` (`element.rs`)
  - `pub(crate) fn group_to_any(path: &[String]) -> Any` (`element.rs`)
  - `Command::Group { ids: Vec<String> }`, `Command::Ungroup { ids: Vec<String> }`
  - `CommandError::BadGroup`, `Display` = `groupe invalide (au moins deux objets ou groupes d'une même page, ids connus attendus)`
- Réutilise : `crates/roomboard-core/src/commands.rs:30` (`Command`), `:472` (`apply`) — variantes `Group { ids: Vec<String> }`, `Ungroup { ids: Vec<String> }`, erreur `BadGroup` (étendre).
- Réutilise : `crates/roomboard-core/src/commands.rs:979` (`cmd_erase`, `Cut`) — `Cut.group: Option<Any>` recopié sur chaque morceau (étendre).
- Réutilise : `yrs::uuid_v4` (D3) — un id de groupe neuf par `Group`.
- Réutilise : `crates/roomboard-core/src/commands.rs:458` (`find_unique`), `:899` (`done`), `:904` (`unchanged`), `:442` (`sorted_unique`) — tels quels.

**Test et commande bornée.**
`export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c3-groupes--T1 && cargo test -p roomboard-core 2>&1 | grep -E "^test .*(group|erase)|test result|FAILED|panicked|error\[" | tail -40`
Attendu : 0 `FAILED`, présents et `ok` : `element_view_exposes_group`, `unreadable_group_reads_as_none_and_is_kept`,
`group_writes_new_outer_id_on_each_element`, `group_refuses_unknown_id_other_page_or_single_unit`,
`group_of_group_and_element_nests_paths`, `group_is_one_undo_step`, `ungroup_removes_outer_level_only`,
`ungroup_without_group_is_no_step`, `partial_erase_keeps_group` (≥ 8) ; puis
`cargo test -p roomboard-core 2>&1 | grep -E "test result|FAILED" | tail -12` : aucun `FAILED`
(`socle_fixture_resaves_identically` et les tests de gomme existants verts).

**Contraintes (recopiées).** G1 TDD rouge d'abord · G2 preuves bornées, `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`
· G5 aucun test désactivé ou affaibli · G6 aucune dépendance neuve · G7 commits jejeasterix, message anglais terminé par
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers ajoutés un par un, aucun push · G8 un document sans
groupe s'écrit avec les mêmes octets · G9 `cargo fmt --all --check` et `cargo clippy -p roomboard-core --all-targets -- -D warnings`
propres · G10 messages en français · G11 gabarit de commit.

**Interdits.** Ne pas toucher `format/`, `query.rs`, `copy.rs`, `lib.rs` (autres tâches de la vague). Ne jamais réécrire
`group` à la lecture (`element()` ne fait que lire). Pas de `Any::Map` pour `group` (`Any::Array` de chaînes seulement).
Aucune variante `Command` pour les insertions (DAZ2).

**Terminé quand.** Les 9 tests nommés passent, toute la suite `roomboard-core` est verte, fmt et clippy propres, un
commit `feat(core): group field, Group and Ungroup commands, erase keeps group`.

**Étapes.**

- [ ] **Étape 1 : tests rouges.** Ajouter à la fin du module `tests` de `commands.rs` :

```rust
    fn rect_at(d: &mut Document, p: &str, x: f64) -> String {
        d.apply(Command::AddShape {
            page: p.into(),
            shape: ShapeKind::Rect,
            x0: x,
            y0: 100.0,
            x1: x + 50.0,
            y1: 150.0,
            style: pen(),
            fill: None,
        })
        .expect("forme")
        .ids[0]
            .clone()
    }

    fn group_of(d: &Document, id: &str) -> Option<Vec<String>> {
        d.element(id).expect("vue").group
    }

    fn raw_group(d: &Document, id: &str) -> Option<Out> {
        let txn = d.read();
        let f = d.find_element(&txn, id).expect("élément");
        f.element.get(&txn, "group")
    }

    fn write_raw_group(d: &Document, id: &str, v: Any) {
        let mut txn = d.transact_local();
        let f = d.find_element(&txn, id).expect("élément");
        f.element.insert(&mut txn, "group", v);
    }

    #[test]
    fn element_view_exposes_group() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect_at(&mut d, &p, 0.0);
        assert_eq!(group_of(&d, &a), None);
        write_raw_group(&d, &a, group_to_any(&["g1".into(), "g2".into()]));
        assert_eq!(group_of(&d, &a), Some(vec!["g1".to_string(), "g2".to_string()]));
    }

    #[test]
    fn unreadable_group_reads_as_none_and_is_kept() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect_at(&mut d, &p, 0.0);
        for v in [Any::from(3.0), Any::Array(Vec::<Any>::new().into()), Any::Array(vec![Any::from(1.0)].into())] {
            write_raw_group(&d, &a, v.clone());
            assert_eq!(group_of(&d, &a), None);
            assert_eq!(raw_group(&d, &a), Some(Out::Any(v)));
        }
    }

    #[test]
    fn group_writes_new_outer_id_on_each_element() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect_at(&mut d, &p, 0.0);
        let b = rect_at(&mut d, &p, 100.0);
        let c = d.apply(Command::Group { ids: vec![b.clone(), a.clone()] }).expect("group");
        let mut both = vec![a.clone(), b.clone()];
        both.sort();
        assert_eq!(c.ids, both);
        assert_eq!(c.pages, vec![p.clone()]);
        let ga = group_of(&d, &a).expect("groupe a");
        assert_eq!(ga.len(), 1);
        assert_eq!(group_of(&d, &b), Some(ga.clone()));
        assert_ne!(ga[0], a);
        assert_ne!(ga[0], b);
    }

    #[test]
    fn group_refuses_unknown_id_other_page_or_single_unit() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect_at(&mut d, &p, 0.0);
        let b = rect_at(&mut d, &p, 100.0);
        let q = d.apply(Command::AddPage { after: Some(p.clone()) }).expect("page").pages[0].clone();
        let c = rect_at(&mut d, &q, 0.0);
        let w = writes(&d);
        for ids in [
            vec![a.clone(), "absent".to_string()],
            vec![a.clone(), c.clone()],
            vec![a.clone()],
            vec![a.clone(), a.clone()],
            vec![],
        ] {
            assert_eq!(d.apply(Command::Group { ids }), Err(CommandError::BadGroup));
        }
        d.apply(Command::Group { ids: vec![a.clone(), b.clone()] }).expect("group");
        // a et b forment désormais une seule unité : la regrouper seule est refusé.
        assert_eq!(
            d.apply(Command::Group { ids: vec![a.clone(), b.clone()] }),
            Err(CommandError::BadGroup)
        );
        assert_eq!(w.since(), 1);
        assert_eq!(
            CommandError::BadGroup.to_string(),
            "groupe invalide (au moins deux objets ou groupes d'une même page, ids connus attendus)"
        );
    }

    #[test]
    fn group_of_group_and_element_nests_paths() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect_at(&mut d, &p, 0.0);
        let b = rect_at(&mut d, &p, 100.0);
        let c = rect_at(&mut d, &p, 200.0);
        d.apply(Command::Group { ids: vec![a.clone(), b.clone()] }).expect("g1");
        let inner = group_of(&d, &a).expect("g1")[0].clone();
        d.apply(Command::Group { ids: vec![a.clone(), b.clone(), c.clone()] }).expect("g2");
        let ga = group_of(&d, &a).expect("a");
        assert_eq!(ga.len(), 2);
        assert_eq!(ga[1], inner);
        assert_eq!(group_of(&d, &b), Some(ga.clone()));
        assert_eq!(group_of(&d, &c), Some(vec![ga[0].clone()]));
    }

    #[test]
    fn group_is_one_undo_step() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect_at(&mut d, &p, 0.0);
        let b = rect_at(&mut d, &p, 100.0);
        d.apply(Command::Group { ids: vec![a.clone(), b.clone()] }).expect("group");
        assert!(d.undo());
        assert_eq!((group_of(&d, &a), group_of(&d, &b)), (None, None));
        assert_eq!(d.element_ids(&p), vec![a, b]);
    }

    #[test]
    fn ungroup_removes_outer_level_only() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect_at(&mut d, &p, 0.0);
        let b = rect_at(&mut d, &p, 100.0);
        let c = rect_at(&mut d, &p, 200.0);
        d.apply(Command::Group { ids: vec![a.clone(), b.clone()] }).expect("g1");
        let inner = group_of(&d, &a).expect("g1");
        d.apply(Command::Group { ids: vec![a.clone(), b.clone(), c.clone()] }).expect("g2");
        let ch = d
            .apply(Command::Ungroup { ids: vec![a.clone(), b.clone(), c.clone()] })
            .expect("ungroup");
        assert_eq!(ch.ids.len(), 3);
        assert_eq!(group_of(&d, &a), Some(inner.clone()));
        assert_eq!(group_of(&d, &b), Some(inner));
        assert_eq!(group_of(&d, &c), None);
        assert_eq!(raw_group(&d, &c), None, "chemin vide : champ retiré");
        assert!(d.undo());
        assert_eq!(group_of(&d, &c).map(|g| g.len()), Some(1));
    }

    #[test]
    fn ungroup_without_group_is_no_step() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect_at(&mut d, &p, 0.0);
        let v = d.version();
        let w = writes(&d);
        let ch = d
            .apply(Command::Ungroup { ids: vec![a.clone(), "absent".into()] })
            .expect("ungroup");
        assert!(ch.ids.is_empty() && ch.pages.is_empty());
        assert_eq!(d.version(), v);
        assert_eq!(w.since(), 0);
    }

    #[test]
    fn partial_erase_keeps_group() {
        let mut d = Document::blank();
        let (p, [_, b, c]) = three(&mut d);
        d.apply(Command::Group { ids: vec![b.clone(), c.clone()] }).expect("group");
        let gb = group_of(&d, &b).expect("groupe");
        let ch = d.apply(cut_second(&p)).expect("erase");
        assert_eq!(ch.removed, vec![b]);
        assert!(!ch.ids.is_empty());
        for id in &ch.ids {
            assert_eq!(group_of(&d, id), Some(gb.clone()), "morceau {id}");
        }
    }
```

Ajouter en tête du module `tests` : `use crate::element::group_to_any;` et `use crate::shape::ShapeKind;` s'il n'y est pas
déjà (sinon ne rien dupliquer).

- [ ] **Étape 2 : voir rouge.** `cargo test -p roomboard-core group 2>&1 | grep -E "error\[|cannot find" | head -5` —
  attendu : erreurs de compilation (`group_to_any`, `Command::Group`, `BadGroup` inconnus).

- [ ] **Étape 3 : vue et lecture du groupe (`element.rs`).** Dans `ElementView`, après `table` :

```rust
    /// Chemin de groupes (C3, Z1), du plus extérieur au plus intérieur ; absent sans groupe lisible.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group: Option<Vec<String>>,
```

Dans `bare`, ajouter `group: None,`. Après `out_transform` :

```rust
/// Chemin `group` lisible (Z1) : tableau non vide de chaînes. Absent, vide ou mal formé = sans groupe ; la valeur reste
/// telle quelle dans le document (jamais réécrite à la lecture).
pub(crate) fn read_group<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<Vec<String>> {
    match e.get(txn, "group") {
        Some(Out::Any(Any::Array(items))) if !items.is_empty() => items
            .iter()
            .map(|a| match a {
                Any::String(s) => Some(s.to_string()),
                _ => None,
            })
            .collect(),
        _ => None,
    }
}

/// Valeur écrite du champ `group` : `Any::Array` de chaînes, remplacé en bloc (U7).
pub(crate) fn group_to_any(path: &[String]) -> Any {
    Any::Array(path.iter().map(|s| Any::String(s.as_str().into())).collect())
}
```

- [ ] **Étape 4 : `Document::element` expose le groupe (`document.rs`).** Importer `read_group` dans le `use crate::element::{…}`.
  Dans `element`, lire le groupe avant le `match`, garder le `match` tel quel dans une liaison, puis compléter :

```rust
    pub fn element(&self, id: &str) -> Option<ElementView> {
        let txn = self.doc.transact();
        let found = self.find_element(&txn, id)?;
        let e = &found.element;
        let group = read_group(&txn, e);
        let view = match out_string(e.get(&txn, "kind")).as_deref() {
            // … branches inchangées …
        };
        view.map(|v| ElementView { group, ..v })
    }
```

- [ ] **Étape 5 : commandes (`commands.rs`).** Importer `group_to_any` et `read_group` depuis `crate::element`. Après
  `SetTableFill` dans `Command` :

```rust
    /// Grouper (C3, Z1) : un id de groupe neuf (`uuid_v4`) en tête du chemin `group` de chaque élément ; refusé
    /// (`BadGroup`) si un id est inconnu, si les éléments ne sont pas sur une même page ou s'ils forment moins de deux
    /// unités (unité = groupe extérieur ou élément libre). Une étape.
    Group { ids: Vec<String> },
    /// Dégrouper (C3, Z1, HZ2-1) : retire le groupe extérieur du chemin de chaque élément (chemin vide = champ retiré) ;
    /// ids inconnus ignorés ; aucun élément groupé = aucune étape (D38).
    Ungroup { ids: Vec<String> },
```

`CommandError` gagne `BadGroup` (après `BadTable`) et son `Display` :

```rust
            CommandError::BadGroup => write!(
                f,
                "groupe invalide (au moins deux objets ou groupes d'une même page, ids connus attendus)"
            ),
```

Dans `apply`, après le bras `SetTableFill` :

```rust
            Command::Group { ids } => self.cmd_group(&ids),
            Command::Ungroup { ids } => self.cmd_ungroup(&ids),
```

Après `struct Target` (l. 449), ajouter :

```rust
/// Élément visé par `Group` ou `Ungroup` : son chemin lu (vide sans groupe lisible).
struct GroupTarget {
    id: String,
    page: String,
    element: MapRef,
    path: Vec<String>,
}
```

Dans `impl Document` (près de `cmd_delete`) :

```rust
    fn group_targets(&self, ids: &[String]) -> Vec<GroupTarget> {
        let txn = self.read();
        self.find_unique(&txn, ids)
            .into_iter()
            .map(|(id, f)| GroupTarget {
                path: read_group(&txn, &f.element).unwrap_or_default(),
                id,
                page: f.page_id,
                element: f.element,
            })
            .collect()
    }

    fn cmd_group(&mut self, ids: &[String]) -> Result<Change, CommandError> {
        let unique: BTreeSet<&String> = ids.iter().collect();
        let targets = self.group_targets(ids);
        if targets.len() != unique.len() {
            return Err(CommandError::BadGroup);
        }
        let Some(page) = targets.first().map(|t| t.page.clone()) else {
            return Err(CommandError::BadGroup);
        };
        if targets.iter().any(|t| t.page != page) {
            return Err(CommandError::BadGroup);
        }
        let units: BTreeSet<&String> = targets
            .iter()
            .map(|t| t.path.first().unwrap_or(&t.id))
            .collect();
        if units.len() < 2 {
            return Err(CommandError::BadGroup);
        }
        let gid = yrs::uuid_v4().to_string();
        {
            let mut txn = self.transact_local();
            for t in &targets {
                let mut next = Vec::with_capacity(t.path.len() + 1);
                next.push(gid.clone());
                next.extend(t.path.iter().cloned());
                t.element.insert(&mut txn, "group", group_to_any(&next));
            }
        }
        Ok(self.done(Change {
            pages: vec![page],
            ids: targets.into_iter().map(|t| t.id).collect(),
            ..Default::default()
        }))
    }

    fn cmd_ungroup(&mut self, ids: &[String]) -> Result<Change, CommandError> {
        let targets: Vec<GroupTarget> = self
            .group_targets(ids)
            .into_iter()
            .filter(|t| !t.path.is_empty())
            .collect();
        if targets.is_empty() {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            for t in &targets {
                if t.path.len() == 1 {
                    t.element.remove(&mut txn, "group");
                } else {
                    t.element.insert(&mut txn, "group", group_to_any(&t.path[1..]));
                }
            }
        }
        let pages = sorted_unique(targets.iter().map(|t| t.page.clone()));
        Ok(self.done(Change {
            pages,
            ids: targets.into_iter().map(|t| t.id).collect(),
            ..Default::default()
        }))
    }
```

Note : un élément au `group` illisible compte comme libre ; `Group` remplace alors la valeur (seule écriture qui la touche).

- [ ] **Étape 6 : gomme partielle (`commands.rs`).** `Cut` gagne `group: Option<Any>` (dernier champ). Dans `cmd_erase`,
  à la construction de `Cut` : `group: match e.get(&txn, "group") { Some(Out::Any(a)) => Some(a), _ => None },`. À
  l'écriture des morceaux :

```rust
                for (k, piece) in cut.pieces.iter().enumerate() {
                    let id = yrs::uuid_v4().to_string();
                    let mut prelim = stroke_prelim(&id, &cut.transform, &cut.style, piece);
                    // Z1 : un morceau reste dans le groupe du trait coupé (valeur recopiée telle quelle).
                    if let Some(g) = &cut.group {
                        prelim.insert("group".into(), In::Any(g.clone()));
                    }
                    elements.insert(&mut txn, cut.index + k as u32, prelim);
                    change.ids.push(id);
                }
```

- [ ] **Étape 7 : voir vert.** Commande de la section ; puis `cargo fmt --all --check && cargo clippy -p roomboard-core --all-targets -- -D warnings 2>&1 | tail -5`.

- [ ] **Étape 8 : commit.** `git -C ~/projets/roomboard-wt/usage-c3-groupes--T1 add crates/roomboard-core/src/element.rs`,
  puis `… add crates/roomboard-core/src/document.rs`, puis `… add crates/roomboard-core/src/commands.rs` ; commit (G11)
  `feat(core): group field, Group and Ungroup commands, erase keeps group`.

---

### Tâche T2 — Cœur : recopie profonde, `extract`, `insert_fragment`, `insert_pages`

<a id="tache-t2"></a>

**Objectif.** Une seule routine de recopie profonde (`AsPrelim` de yrs) sert l'extraction d'une sélection en document
d'une page, l'insertion d'un fragment et l'insertion des pages d'un document : ids neufs, groupes renumérotés par une
table commune à l'insertion, translation, métadonnées d'asset recopiées, une transaction `"local"` (cadrage Z4, Z5, DAZ1,
DAZ2, U9, DAU4, DAU10 ; S2, S3, S4).

**Fichiers.** Créer `crates/roomboard-core/src/copy.rs` (code et tests). Modifier `crates/roomboard-core/src/lib.rs`
(`pub mod copy;` après `pub mod commands;`).

**Interfaces.**
- Produit (lu par T11) :
  - `pub(crate) type IdMap = std::collections::HashMap<String, String>;`
  - `pub(crate) fn copy_elements<T: ReadTxn>(src: &T, from: &[MapRef], dst: &mut TransactionMut, into: &ArrayRef, ids: &mut IdMap, dx: f64, dy: f64) -> Vec<String>`
  - `impl Document { pub fn extract(&self, page: &str, ids: &[String]) -> Result<Document, CommandError>; pub fn insert_fragment(&mut self, src: &Document, page: &str, dx: f64, dy: f64) -> Result<Change, CommandError>; pub fn insert_pages(&mut self, src: &Document, after: &str) -> Result<Change, CommandError> }`
- Règles : `extract` → `UnknownPage(page)` si la page est inconnue, `UnknownElement(id)` (premier id absent de la page,
  dans l'ordre donné) ; ids vides = document d'une page vide ; éléments dans l'ordre d'empilement de la source ; aucune
  étape d'annulation dans le résultat. `insert_fragment` → `UnknownPage`, `BadMatrix` si `dx` ou `dy` n'est pas fini ;
  éléments de la première page de `src` ajoutés **en haut** de la pile dans leur ordre ; source sans élément = aucune
  étape (`unchanged`). `insert_pages` → `UnknownPage(after)` ; chaque page de `src` recopiée en entier (`background`,
  `backdrop`, `grid`, `width`, `height`, champs inconnus) avec un id neuf, à la suite de `after` ; source sans page =
  aucune étape. `Change.ids` = ids neufs des éléments ; `Change.pages` = `[page]` (fragment) ou ids des pages créées
  dans l'ordre.
- Réutilise : yrs 0.28.1 `AsPrelim` (`out.rs:106`, `types/map.rs:127`, `types/text.rs:466`) — `MapRef::as_prelim(&txn) -> MapPrelim` (`yrs::types::AsPrelim`).
- Réutilise : aucun module existant pour recopier, extraire, insérer (cadrage : termes `copy`, `clone_`, `out_to_in`, `deep` : rien) — `copy.rs` neuf : `copy_elements(src, from, dst, into, ids, dx, dy) -> Vec<String>`, `Document::extract`, `insert_fragment`, `insert_pages` aux signatures ci-dessus (DAZ1, DAZ2).
- Réutilise : `crates/roomboard-core/src/document.rs:179` (`cited_assets`, sur `collect_out` `:572`) — appelé sur le document extrait et sur la source d'une insertion.
- Réutilise : `crates/roomboard-core/src/document.rs:214` (`insert_asset_meta`) — remplacé ici par la recopie brute du `Y.Map` d'asset de la source (`ReadTxn::get_map("assets")` puis `as_prelim`) : même règle « écrit seulement si absent » (K3), mêmes champs, sans perdre un champ inconnu. Écart à signaler dans le rapport (`Réutilisation : écart — …`).
- Réutilise : `yrs::uuid_v4` (D3) — par élément, page et groupe.
- Réutilise : `crates/roomboard-core/src/document.rs:75` (`insert_page`) — page neuve du fragment dans `extract`.
- Réutilise : `Document::read`, `transact_local`, `pages_ref`, `find_page`, `page_elements`, `done`, `unchanged` (pub(crate)) — tels quels.

**Test et commande bornée.**
`export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c3-groupes--T2 && cargo test -p roomboard-core copy:: 2>&1 | grep -E "^test |test result|FAILED|panicked|error\[" | tail -30`
Attendu : 0 `FAILED`, ≥ 12 `test copy::tests::… ok` dont les noms de l'étape 1 ; puis
`cargo test -p roomboard-core 2>&1 | grep -E "test result|FAILED" | tail -12` sans `FAILED`.

**Contraintes (recopiées).** G1 TDD rouge d'abord · G2 preuves bornées, PATH · G5 aucun test désactivé · G6 aucune
dépendance neuve (yrs seul) · G7 commits jejeasterix, anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`,
fichiers un par un, aucun push · G8 sortie d'un document inchangée (aucun code de `format` touché) · G9 fmt et clippy
`-D warnings` propres · G11 gabarit de commit.

**Patron à ne pas reprendre (concepteur-critique).** Une recopie par type d'élément (`match kind { "stroke" => …,
"table" => … }`) comme `Document::element` (`crates/roomboard-core/src/document.rs:247-318`) : elle perdrait les champs
inconnus (U3) et grossirait à chaque `kind`. Chemin de référence : le parcours générique `collect_out`
(`crates/roomboard-core/src/document.rs:572-597`) et `MapRef::as_prelim` (yrs `types/map.rs:127-140`). Ne pas non plus
appliquer un `document.ybin` comme mise à jour sur la cible (U9) : la cible garderait les ids et l'historique de la source.

**Interdits.** Ne pas toucher `document.rs`, `commands.rs`, `element.rs` (T1), `format/` (T3). Aucune lecture du `kind`
dans la recopie. Aucun `Any::Map` écrit. Aucune transaction sans origine `"local"` sur la cible.

**Terminé quand.** Les 13 tests de l'étape 1 passent, la suite `roomboard-core` est verte, fmt et clippy propres, un
commit `feat(core): deep copy, extract, insert fragment and insert pages`.

**Étapes.**

- [ ] **Étape 1 : tests rouges.** Créer `crates/roomboard-core/src/copy.rs` avec seulement l'en-tête du module et ce
  module de tests ; ajouter `pub mod copy;` à `lib.rs`.

```rust
#[cfg(test)]
mod tests {
    use yrs::{Any, Map, Out};

    use crate::asset::AssetRef;
    use crate::commands::{Command, CommandError, EraseMode};
    use crate::document::Document;
    use crate::element::StrokeStyle;
    use crate::grid::{GridLevelView, GridView};
    use crate::shape::ShapeKind;

    const A1: &str = "1111111111111111111111111111111111111111111111111111111111111111";
    const A2: &str = "2222222222222222222222222222222222222222222222222222222222222222";

    fn pen() -> StrokeStyle {
        StrokeStyle { color: "#000000".into(), width: 4.0 }
    }
    fn first(d: &Document) -> String {
        d.page_ids()[0].clone()
    }
    fn stroke(d: &mut Document, p: &str, y: f32) -> String {
        let points: Vec<f32> = (0..=10).flat_map(|i| [100.0 + i as f32 * 10.0, y, 0.5]).collect();
        d.apply(Command::CommitStroke { page: p.into(), points, style: pen() }).expect("trait").ids[0].clone()
    }
    fn rect(d: &mut Document, p: &str, x: f64) -> String {
        d.apply(Command::AddShape {
            page: p.into(), shape: ShapeKind::Rect, x0: x, y0: 100.0, x1: x + 50.0, y1: 150.0, style: pen(), fill: None,
        })
        .expect("forme")
        .ids[0]
            .clone()
    }
    fn image(d: &mut Document, p: &str, asset: &str, name: &str) -> String {
        d.apply(Command::AddImage {
            page: p.into(),
            asset: AssetRef { id: asset.into(), name: name.into(), mime: "image/png".into(), size: 3.0 },
            w: 10.0,
            h: 10.0,
            matrix: [1.0, 0.0, 0.0, 1.0, 0.0, 0.0],
        })
        .expect("image")
        .ids[0]
            .clone()
    }
    /// Chemin `group` écrit à la main (T1 n'est pas dans la base de cette tâche).
    fn set_group(d: &Document, id: &str, path: &[&str]) {
        let mut txn = d.transact_local();
        let f = d.find_element(&txn, id).expect("élément");
        let v = Any::Array(path.iter().map(|s| Any::String((*s).into())).collect());
        f.element.insert(&mut txn, "group", v);
    }
    fn group(d: &Document, id: &str) -> Option<Vec<String>> {
        let txn = d.read();
        let f = d.find_element(&txn, id)?;
        match f.element.get(&txn, "group") {
            Some(Out::Any(Any::Array(items))) => Some(items.iter().map(|a| match a {
                Any::String(s) => s.to_string(),
                _ => String::new(),
            }).collect()),
            _ => None,
        }
    }
    fn ids_of(d: &Document) -> Vec<String> {
        d.element_ids(&first(d))
    }

    #[test]
    fn extract_copies_elements_with_new_ids_in_stack_order() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = stroke(&mut d, &p, 100.0);
        let _b = rect(&mut d, &p, 300.0);
        let c = rect(&mut d, &p, 500.0);
        let f = d.extract(&p, &[c.clone(), a.clone()]).expect("extract");
        assert_eq!(f.page_count(), 1);
        let got = ids_of(&f);
        assert_eq!(got.len(), 2);
        assert!(!got.contains(&a) && !got.contains(&c));
        let (va, vc) = (d.element(&a).unwrap(), d.element(&c).unwrap());
        let (fa, fc) = (f.element(&got[0]).unwrap(), f.element(&got[1]).unwrap());
        assert_eq!((fa.kind.as_str(), fa.transform, fa.style), ("stroke", va.transform, va.style));
        assert_eq!((fc.kind.as_str(), fc.transform, fc.shape), ("shape", vc.transform, vc.shape));
        assert_eq!(f.outline(&got[0]), d.outline(&a));
    }

    #[test]
    fn extract_unknown_page_or_element_is_refused() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect(&mut d, &p, 0.0);
        assert_eq!(d.extract("absente", &[a.clone()]).err(), Some(CommandError::UnknownPage("absente".into())));
        assert_eq!(d.extract(&p, &[a, "x".into()]).err(), Some(CommandError::UnknownElement("x".into())));
    }

    #[test]
    fn extract_has_no_undo_step() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect(&mut d, &p, 0.0);
        let f = d.extract(&p, &[a]).expect("extract");
        assert!(!f.can_undo());
        assert_eq!(f.schema(), Some(1.0));
    }

    #[test]
    fn extract_keeps_text_spans_and_table_cells() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = d.apply(Command::SetText {
            page: p.clone(), id: None, x: 10.0, y: 10.0, content: "Bonjour".into(), color: "#000000".into(), size: 36.0,
            box_width: 400.0, box_height: 45.0, spans: None,
        }).expect("texte").ids[0].clone();
        d.apply(Command::FormatText {
            id: t.clone(), start: 0, len: 3, attrs: vec![crate::rich_text::TextAttr::Bold(true)], box_height: None,
        }).expect("gras");
        let tb = d.apply(Command::AddTable {
            page: p.clone(), x: 0.0, y: 300.0, cols: 2, rows: 2, col_width: 100.0, row_height: 40.0,
            color: "#000000".into(), size: 24.0,
        }).expect("tableau").ids[0].clone();
        let view = d.element(&tb).unwrap().table.unwrap();
        d.apply(Command::SetTableCell {
            id: tb.clone(), row: view.rows[0].id.clone(), col: view.cols[1].id.clone(), content: "B1".into(),
            row_height: None, spans: None,
        }).expect("cellule");
        let f = d.extract(&p, &[t.clone(), tb.clone()]).expect("extract");
        let got = ids_of(&f);
        assert_eq!(f.element(&got[0]).unwrap().text, d.element(&t).unwrap().text);
        assert_eq!(f.element(&got[1]).unwrap().table, d.element(&tb).unwrap().table);
    }

    #[test]
    fn extract_copies_cited_asset_meta_only() {
        let mut d = Document::blank();
        let p = first(&d);
        let i1 = image(&mut d, &p, A1, "a.png");
        let _i2 = image(&mut d, &p, A2, "b.png");
        let f = d.extract(&p, &[i1]).expect("extract");
        let cited = f.cited_assets();
        assert_eq!(cited.len(), 1);
        assert_eq!((cited[0].id.as_str(), cited[0].name.as_str(), cited[0].mime.as_str()), (A1, "a.png", "image/png"));
    }

    #[test]
    fn groups_are_renumbered_consistently() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect(&mut d, &p, 0.0);
        let b = rect(&mut d, &p, 100.0);
        let c = rect(&mut d, &p, 200.0);
        set_group(&d, &a, &["g1"]);
        set_group(&d, &b, &["g1", "g2"]);
        set_group(&d, &c, &["g1", "g2"]);
        let f = d.extract(&p, &[a, b, c]).expect("extract");
        let got = ids_of(&f);
        let (ga, gb, gc) = (group(&f, &got[0]).unwrap(), group(&f, &got[1]).unwrap(), group(&f, &got[2]).unwrap());
        assert_eq!((ga.len(), gb.len(), gc.len()), (1, 2, 2));
        assert!(ga[0] != "g1" && gb[1] != "g2");
        assert_eq!((gb[0].as_str(), gc[0].as_str()), (ga[0].as_str(), ga[0].as_str()));
        assert_eq!(gb[1], gc[1]);
        assert_ne!(gb[0], gb[1]);
    }

    #[test]
    fn insert_fragment_appends_on_top_translated_one_step() {
        let mut src = Document::blank();
        let sp = first(&src);
        let a = rect(&mut src, &sp, 0.0);
        let f = src.extract(&sp, &[a.clone()]).expect("extract");
        let mut d = Document::blank();
        let p = first(&d);
        let old = stroke(&mut d, &p, 500.0);
        let ch = d.insert_fragment(&f, &p, 10.0, 20.0).expect("insert");
        assert_eq!(ch.pages, vec![p.clone()]);
        let ids = d.element_ids(&p);
        assert_eq!(ids.len(), 2);
        assert_eq!(ids[0], old);
        assert_eq!(ch.ids, vec![ids[1].clone()]);
        let t0 = src.element(&a).unwrap().transform;
        let t1 = d.element(&ids[1]).unwrap().transform;
        assert_eq!((t1[4], t1[5]), (t0[4] + 10.0, t0[5] + 20.0));
        assert!(d.undo());
        assert_eq!(d.element_ids(&p), vec![old]);
    }

    #[test]
    fn insert_twice_gives_distinct_ids_and_groups() {
        let mut src = Document::blank();
        let sp = first(&src);
        let a = rect(&mut src, &sp, 0.0);
        let b = rect(&mut src, &sp, 100.0);
        set_group(&src, &a, &["g"]);
        set_group(&src, &b, &["g"]);
        let f = src.extract(&sp, &[a, b]).expect("extract");
        let mut d = Document::blank();
        let p = first(&d);
        let c1 = d.insert_fragment(&f, &p, 0.0, 0.0).expect("1");
        let c2 = d.insert_fragment(&f, &p, 24.0, 24.0).expect("2");
        assert!(c1.ids.iter().all(|id| !c2.ids.contains(id)));
        let g1 = group(&d, &c1.ids[0]).unwrap();
        let g2 = group(&d, &c2.ids[0]).unwrap();
        assert_ne!(g1, g2);
        assert_eq!(group(&d, &c1.ids[1]), Some(g1));
        assert_eq!(group(&d, &c2.ids[1]), Some(g2));
    }

    #[test]
    fn insert_fragment_copies_missing_asset_meta_and_undo_removes_it() {
        let mut src = Document::blank();
        let sp = first(&src);
        let i = image(&mut src, &sp, A1, "a.png");
        let f = src.extract(&sp, &[i]).expect("extract");
        let mut d = Document::blank();
        let p = first(&d);
        d.insert_fragment(&f, &p, 0.0, 0.0).expect("insert");
        assert_eq!(d.asset(A1).unwrap().name, "a.png");
        assert!(d.undo());
        assert_eq!(d.asset(A1).unwrap().name, A1, "métadonnée retirée avec l'étape");
    }

    #[test]
    fn insert_fragment_refusals_and_empty_source() {
        let mut src = Document::blank();
        let sp = first(&src);
        let a = rect(&mut src, &sp, 0.0);
        let f = src.extract(&sp, &[a]).expect("extract");
        let mut d = Document::blank();
        let p = first(&d);
        assert_eq!(d.insert_fragment(&f, "absente", 0.0, 0.0).err(), Some(CommandError::UnknownPage("absente".into())));
        assert_eq!(d.insert_fragment(&f, &p, f64::NAN, 0.0).err(), Some(CommandError::BadMatrix));
        let empty = src.extract(&sp, &[]).expect("vide");
        let v = d.version();
        let ch = d.insert_fragment(&empty, &p, 0.0, 0.0).expect("vide");
        assert!(ch.ids.is_empty() && !d.can_undo() && d.version() == v);
    }

    #[test]
    fn insert_pages_after_page_copies_backdrop_grid_and_elements() {
        let mut src = Document::blank();
        let s0 = first(&src);
        let s1 = src.apply(Command::AddPage { after: Some(s0.clone()) }).unwrap().pages[0].clone();
        image(&mut src, &s0, A1, "a.png");
        rect(&mut src, &s1, 0.0);
        let grid = GridView {
            visible: true, snap: true, above: false,
            levels: vec![GridLevelView {
                kind: "squares".into(), spacing_x: 40.0, spacing_y: 40.0, origin_x: 0.0, origin_y: 0.0,
                color: "#cccccc".into(), line: "solid".into(), line_width: 1.0, snap: true, visible: true,
            }],
        };
        src.apply(Command::SetGrid { page: s1.clone(), grid: Some(grid.clone()) }).unwrap();
        let mut d = Document::blank();
        let t0 = first(&d);
        let t1 = d.apply(Command::AddPage { after: Some(t0.clone()) }).unwrap().pages[0].clone();
        let ch = d.insert_pages(&src, &t0).expect("insert");
        let pages = d.page_ids();
        assert_eq!(pages.len(), 4);
        assert_eq!((pages[0].as_str(), pages[3].as_str()), (t0.as_str(), t1.as_str()));
        assert_eq!(ch.pages, vec![pages[1].clone(), pages[2].clone()]);
        assert!(!pages.contains(&s0) && !pages.contains(&s1));
        assert_eq!(d.page(&pages[2]).unwrap().grid, Some(grid));
        assert_eq!(d.element_ids(&pages[1]).len(), 1);
        assert_eq!(d.element_ids(&pages[2]).len(), 1);
        assert_eq!(ch.ids.len(), 2);
        assert_eq!(d.asset(A1).unwrap().name, "a.png");
        assert!(d.undo());
        assert_eq!(d.page_ids(), vec![t0, t1]);
        assert_eq!(d.asset(A1).unwrap().name, A1);
    }

    #[test]
    fn insert_pages_unknown_after_is_refused() {
        let src = Document::blank();
        let mut d = Document::blank();
        assert_eq!(d.insert_pages(&src, "absente").err(), Some(CommandError::UnknownPage("absente".into())));
    }

    #[test]
    fn unknown_kind_element_is_copied_with_its_fields() {
        let mut d = Document::blank();
        let p = first(&d);
        {
            let mut txn = d.transact_local();
            let els = d.page_elements(&txn, &p).unwrap();
            els.insert(&mut txn, 0, yrs::MapPrelim::from([
                ("id", yrs::In::from("inconnu")),
                ("kind", yrs::In::from("sticker")),
                ("transform", yrs::In::Any(crate::element::transform_to_any(&[1.0, 0.0, 0.0, 1.0, 5.0, 5.0]))),
                ("foo", yrs::In::from("bar")),
            ]));
        }
        let f = d.extract(&p, &["inconnu".into()]).expect("extract");
        let id = ids_of(&f)[0].clone();
        let txn = f.read();
        let e = f.find_element(&txn, &id).unwrap().element;
        assert_eq!(e.get(&txn, "foo"), Some(Out::Any(Any::String("bar".into()))));
        assert_eq!(e.get(&txn, "kind"), Some(Out::Any(Any::String("sticker".into()))));
        let _ = EraseMode::Partial;
    }
}
```

(`yrs::Array` est requis pour `els.insert` : ajouter `use yrs::Array;` dans le module de tests si le compilateur le
demande ; retirer la ligne `let _ = EraseMode::Partial;` et l'import `EraseMode` si clippy les signale inutiles.)

- [ ] **Étape 2 : voir rouge.** `cargo test -p roomboard-core copy:: 2>&1 | grep -E "error\[|no method" | head -5` —
  attendu : `extract`, `insert_fragment`, `insert_pages` introuvables.

- [ ] **Étape 3 : code de `copy.rs`.** Au-dessus du module de tests :

```rust
//! Recopie profonde (C3, DAZ1, DAZ2) : une seule routine, bâtie sur `AsPrelim` de yrs (copie des `Y.Map`, `Y.Array`,
//! `Y.Text` avec attributs de plage et embeds), sert l'extraction d'une sélection, l'insertion d'un fragment et
//! l'insertion des pages d'un document. Chaque élément garde tous ses champs (types inconnus compris, U3) ; seuls
//! `id`, `group` (renuméroté par une table commune à l'insertion) et la translation de `transform` sont réécrits.
//! Aucune lecture du `kind`.
use std::collections::{HashMap, HashSet};

use yrs::types::AsPrelim;
use yrs::{Any, Array, ArrayPrelim, ArrayRef, Doc, In, Map, MapRef, Out, ReadTxn, Transact, TransactionMut};

use crate::commands::{Change, CommandError};
use crate::document::{insert_page, Document};
use crate::element::{any_f64, out_string, transform_to_any, SCHEMA};

/// Table ancien → neuf des ids de groupe, commune à toute une insertion (Z4).
pub(crate) type IdMap = HashMap<String, String>;

/// Chemin `group` renuméroté ; valeur illisible gardée telle quelle (`None` : ne pas réécrire).
fn renumber(v: &In, ids: &mut IdMap) -> Option<In> {
    let In::Any(Any::Array(items)) = v else { return None };
    let mut out = Vec::with_capacity(items.len());
    for a in items.iter() {
        let Any::String(s) = a else { return None };
        let next = ids.entry(s.to_string()).or_insert_with(|| yrs::uuid_v4().to_string());
        out.push(Any::String(next.as_str().into()));
    }
    Some(In::Any(Any::Array(out.into())))
}

/// `transform` translaté de (dx, dy) ; `None` si illisible (gardé tel quel).
fn translated(v: &In, dx: f64, dy: f64) -> Option<In> {
    let In::Any(Any::Array(items)) = v else { return None };
    if items.len() != 6 {
        return None;
    }
    let mut t = [0.0; 6];
    for (slot, a) in t.iter_mut().zip(items.iter()) {
        *slot = any_f64(a)?;
    }
    t[4] += dx;
    t[5] += dy;
    Some(In::Any(transform_to_any(&t)))
}

/// Recopie `from` (lus dans `src`) en haut de `into`, dans l'ordre : id neuf, groupes renumérotés par `ids`, translation.
/// Rend les ids neufs.
pub(crate) fn copy_elements<T: ReadTxn>(
    src: &T,
    from: &[MapRef],
    dst: &mut TransactionMut,
    into: &ArrayRef,
    ids: &mut IdMap,
    dx: f64,
    dy: f64,
) -> Vec<String> {
    let mut out = Vec::with_capacity(from.len());
    for e in from {
        let mut prelim = e.as_prelim(src);
        let id = yrs::uuid_v4().to_string();
        prelim.insert("id".into(), In::from(id.as_str()));
        if let Some(g) = prelim.get("group").and_then(|g| renumber(g, ids)) {
            prelim.insert("group".into(), g);
        }
        if dx != 0.0 || dy != 0.0 {
            if let Some(t) = prelim.get("transform").and_then(|t| translated(t, dx, dy)) {
                prelim.insert("transform".into(), t);
            }
        }
        let n = into.len(dst);
        into.insert(dst, n, prelim);
        out.push(id);
    }
    out
}

/// Recopie dans `dst_assets` le `Y.Map` d'asset de chaque id de `cited` absent de la cible (K3), lu dans la racine
/// `assets` de `src`.
fn copy_asset_meta<T: ReadTxn>(src: &T, cited: &[String], dst: &mut TransactionMut, dst_assets: &MapRef) {
    let Some(src_assets) = src.get_map("assets") else { return };
    for id in cited {
        if dst_assets.get(dst, id).is_some() {
            continue;
        }
        if let Some(Out::YMap(m)) = src_assets.get(src, id) {
            dst_assets.insert(dst, id.as_str(), m.as_prelim(src));
        }
    }
}

fn decode(doc: &Doc) -> Result<Document, CommandError> {
    let bytes = doc.transact().encode_state_as_update_v1(&yrs::StateVector::default());
    // Un document que l'on vient d'écrire se relit toujours ; une erreur ici serait un défaut du cœur.
    Document::from_update_v1(&bytes).map_err(|_| CommandError::BadFormat)
}

impl Document {
    /// Éléments `ids` de `page`, dans l'ordre d'empilement (D2) ; premier id absent = `UnknownElement`.
    fn picked<T: ReadTxn>(&self, txn: &T, page: &str, ids: &[String]) -> Result<Vec<MapRef>, CommandError> {
        let els = self
            .page_elements(txn, page)
            .ok_or_else(|| CommandError::UnknownPage(page.to_string()))?;
        let wanted: HashSet<&str> = ids.iter().map(String::as_str).collect();
        let mut found = HashSet::new();
        let mut out = Vec::new();
        for o in els.iter(txn) {
            let Out::YMap(e) = o else { continue };
            if let Some(id) = out_string(e.get(txn, "id")) {
                if wanted.contains(id.as_str()) {
                    found.insert(id);
                    out.push(e);
                }
            }
        }
        if let Some(missing) = ids.iter().find(|id| !found.contains(*id)) {
            return Err(CommandError::UnknownElement(missing.clone()));
        }
        Ok(out)
    }

    /// Document neuf d'une page qui porte une recopie des éléments `ids` de `page` (Z5) ; métadonnées des assets
    /// cités recopiées ; aucune étape d'annulation (PC5 : écrit sur un `Doc` brut, puis décodé).
    pub fn extract(&self, page: &str, ids: &[String]) -> Result<Document, CommandError> {
        let src = self.read();
        let picked = self.picked(&src, page, ids)?;
        let doc = Doc::new();
        let meta = doc.get_or_insert_map("meta");
        let pages = doc.get_or_insert_array("pages");
        let assets = doc.get_or_insert_map("assets");
        {
            let mut t = doc.transact_mut();
            meta.insert(&mut t, "schema", f64::from(SCHEMA));
            insert_page(&pages, &mut t, 0);
            let Some(Out::YMap(pm)) = pages.get(&t, 0) else {
                return Err(CommandError::BadFormat);
            };
            let Some(Out::YArray(els)) = pm.get(&t, "elements") else {
                return Err(CommandError::BadFormat);
            };
            copy_elements(&src, &picked, &mut t, &els, &mut IdMap::new(), 0.0, 0.0);
        }
        let cited: Vec<String> = decode(&doc)?.cited_assets().into_iter().map(|a| a.id).collect();
        if !cited.is_empty() {
            let mut t = doc.transact_mut();
            copy_asset_meta(&src, &cited, &mut t, &assets);
        }
        decode(&doc)
    }

    /// Recopie les éléments de la première page de `src` en haut de `page`, translatés de (dx, dy) ; une transaction
    /// `"local"` (une étape) ; source sans élément : aucune étape (D38).
    pub fn insert_fragment(&mut self, src: &Document, page: &str, dx: f64, dy: f64) -> Result<Change, CommandError> {
        if !dx.is_finite() || !dy.is_finite() {
            return Err(CommandError::BadMatrix);
        }
        let into = self.page_elements_or_err(page)?;
        let st = src.read();
        let from: Vec<MapRef> = match src.page_ids().first() {
            Some(p) => src.picked(&st, p, &src.element_ids(p))?,
            None => Vec::new(),
        };
        if from.is_empty() {
            return Ok(self.unchanged());
        }
        let cited: Vec<String> = src.cited_assets().into_iter().map(|a| a.id).collect();
        let ids = {
            let mut t = self.transact_local();
            let ids = copy_elements(&st, &from, &mut t, &into, &mut IdMap::new(), dx, dy);
            if let Some(assets) = t.get_map("assets") {
                copy_asset_meta(&st, &cited, &mut t, &assets);
            }
            ids
        };
        Ok(self.done(Change { pages: vec![page.to_string()], ids, ..Default::default() }))
    }

    /// Recopie chaque page de `src` en entier (fond, grille, champs inconnus) avec un id neuf, à la suite de `after` ;
    /// une transaction `"local"` ; une table de groupes commune à toutes les pages (Z4).
    pub fn insert_pages(&mut self, src: &Document, after: &str) -> Result<Change, CommandError> {
        let at = {
            let txn = self.read();
            self.find_page(&txn, after)
                .map(|(i, _)| i + 1)
                .ok_or_else(|| CommandError::UnknownPage(after.to_string()))?
        };
        let st = src.read();
        let src_pages: Vec<MapRef> = src
            .pages_ref()
            .iter(&st)
            .filter_map(|o| match o {
                Out::YMap(m) => Some(m),
                _ => None,
            })
            .collect();
        if src_pages.is_empty() {
            return Ok(self.unchanged());
        }
        let cited: Vec<String> = src.cited_assets().into_iter().map(|a| a.id).collect();
        let mut change = Change::default();
        {
            let pages = self.pages_ref().clone();
            let mut t = self.transact_local();
            let mut groups = IdMap::new();
            for (k, sp) in src_pages.iter().enumerate() {
                let mut prelim = sp.as_prelim(&st);
                let id = yrs::uuid_v4().to_string();
                prelim.insert("id".into(), In::from(id.as_str()));
                prelim.insert("elements".into(), In::Array(ArrayPrelim::from(Vec::<In>::new())));
                pages.insert(&mut t, at + k as u32, prelim);
                let Some(Out::YMap(pm)) = pages.get(&t, at + k as u32) else { continue };
                let Some(Out::YArray(into)) = pm.get(&t, "elements") else { continue };
                let from: Vec<MapRef> = match sp.get(&st, "elements") {
                    Some(Out::YArray(a)) => a
                        .iter(&st)
                        .filter_map(|o| match o {
                            Out::YMap(m) => Some(m),
                            _ => None,
                        })
                        .collect(),
                    _ => Vec::new(),
                };
                change.ids.extend(copy_elements(&st, &from, &mut t, &into, &mut groups, 0.0, 0.0));
                change.pages.push(id);
            }
            if let Some(assets) = t.get_map("assets") {
                copy_asset_meta(&st, &cited, &mut t, &assets);
            }
        }
        Ok(self.done(change))
    }
}
```

Notes pour l'exécutant : `page_elements_or_err` est `pub(crate)` dans `commands.rs` ; `find_page`, `page_elements`,
`pages_ref`, `read`, `transact_local` sont `pub(crate)` dans `document.rs`. Si le compilateur refuse
`let pages = self.pages_ref().clone()` tenu pendant `transact_local()` (emprunt), le garder ainsi : `ArrayRef` se clone
sans emprunter `self`. Si `any_f64` n'est pas `pub(crate)` dans `element.rs`, **ne pas** éditer `element.rs` (T1) :
écrire une copie locale de trois lignes (`Any::Number(n) => Some(*n)`, `Any::BigInt(i) => Some(*i as f64)`, sinon `None`)
et le dire dans le rapport.

- [ ] **Étape 4 : voir vert.** Commande de la section ; `cargo fmt --all --check && cargo clippy -p roomboard-core --all-targets -- -D warnings 2>&1 | tail -5`
  (si clippy signale `too_many_arguments` sur `copy_elements`, ajouter `#[allow(clippy::too_many_arguments)]` au-dessus,
  la signature étant fixée par le cadrage).

- [ ] **Étape 5 : commit.** `git add crates/roomboard-core/src/copy.rs`, puis `git add crates/roomboard-core/src/lib.rs` ;
  commit (G11) `feat(core): deep copy, extract, insert fragment and insert pages`. Rapport : `Réutilisation : appelé
  yrs AsPrelim, cited_assets, insert_page, uuid_v4` et `Réutilisation : écart — insert_asset_meta remplacé par la
  recopie du Y.Map d'asset (champs inconnus gardés, aucun accès à la racine privée)`.

---

### Tâche T3 — Cœur : `kind` du manifeste, codeur du `.rbitem`, association de la coque

<a id="tache-t3"></a>

**Objectif.** Le manifeste porte un `kind` facultatif, jamais écrit pour un document (mêmes octets qu'avant C3) ; la
lecture refuse un `kind` inconnu et sépare documents et fragments ; le cœur écrit et lit un `.rbitem` ; la coque
associe `.rbitem` (cadrage Z3, Z6, Z10, U8 ; S3, S5).

**Fichiers.** Modifier `crates/roomboard-core/src/format/mod.rs` (`Manifest` l. 22-31, `FormatError` l. 42-60,
`check_manifest` l. 189, `load_parts` l. 237, `load_with_manifest` l. 263, tests l. 288+),
`crates/roomboard-core/src/query.rs` (l. 20 : `Deserialize` sur `Bounds`, PC10),
`crates/roomboard-shell/src/lib.rs` (l. 14 et test `launch_paths_keeps_associated_extensions` l. 264),
`apps/desktop/src-tauri/tauri.conf.json` (`bundle.fileAssociations`).

**Interfaces.**
- Produit (lu par T11) :
  - `pub const KIND_DOCUMENT: &str = "document"; pub const KIND_FRAGMENT: &str = "fragment"; pub const FRAGMENT_EXTENSION: &str = "rbitem"; pub const FRAGMENT_MIME: &str = "application/x-roomboard-item";`
  - `Manifest { …, #[serde(default, skip_serializing_if = "Option::is_none")] pub kind: Option<String>, … name: Option<String>, … bounds: Option<Bounds> }` (champs ajoutés **après** `modified`)
  - `FormatError::UnknownKind { found: String }` → « type de fichier RoomBoard inconnu (« X ») : pris en charge dans une prochaine version »
  - `FormatError::WrongKind { expected: &'static str }` → `expected == "document"` : « ce fichier est un objet RoomBoard (.rbitem) : déposez-le ou importez-le sur une page » ; `expected == "fragment"` : « ce fichier est un document RoomBoard (.roomboard), pas un objet : ouvrez-le ou insérez ses pages » (PC7)
  - `pub fn save_fragment_parts(doc: &Document, meta: &SaveMeta, name: &str) -> Result<Parts, FormatError>`
  - `pub fn save_fragment(doc: &Document, meta: &SaveMeta, name: &str) -> Result<Vec<u8>, FormatError>`
  - `pub fn load_fragment_parts(manifest: &[u8], ybin: &[u8]) -> Result<(Document, Manifest), FormatError>`
  - `pub fn load_fragment(bytes: &[u8]) -> Result<(Document, Manifest), FormatError>`
  - `ASSOCIATED_EXTENSIONS = &["roomboard", "rbitem"]`
- Réutilise : `crates/roomboard-core/src/format/mod.rs:22-29` (`Manifest`), `:189` (`check_manifest`), `:237` (`load_parts`) — étendus aux signatures ci-dessus.
- Réutilise : `crates/roomboard-core/src/format/mod.rs:149` (`save_parts`), `:162` (`write_parts`), `:263` (`decode_checked`), `:136` (`entry_options`) — appelés tels quels ; sortie d'un document inchangée.
- Réutilise : `crates/roomboard-core/src/query.rs:227` (`Document::bounds`) — boîte monde des éléments de la page unique.
- Réutilise : `crates/roomboard-shell/src/lib.rs:14` (`ASSOCIATED_EXTENSIONS`), `tauri.conf.json` (`fileAssociations`) — une entrée de plus chacun.

**Test et commande bornée.**
`export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c3-groupes--T3 && cargo test -p roomboard-core -p roomboard-shell 2>&1 | grep -E "^test .*(kind|fragment|manifest|launch_paths|deterministic)|test result|FAILED|error\[" | tail -40`
Attendu : 0 `FAILED` ; `ok` pour `manifest_without_kind_is_document`, `document_manifest_has_no_kind_field`,
`unknown_kind_is_refused`, `fragment_is_not_a_document`, `document_is_not_a_fragment`,
`fragment_round_trip_keeps_name_bounds_and_elements`, `fragment_save_is_deterministic`,
`fragment_parts_need_one_page`, `launch_paths_keeps_associated_extensions`, `manifest_fields_are_written`,
`save_is_deterministic` ; puis `cargo test --workspace 2>&1 | grep -E "test result|FAILED" | tail -20` sans `FAILED`
(`socle_fixture_resaves_identically`, `roomboard-formats` verts).

**Contraintes (recopiées).** G1 · G2 PATH, preuves bornées · G3 aucun build Tauri (le `tauri.conf.json` est écrit, jamais
construit) · G5 · G6 · G7 commits jejeasterix, anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, un par
un, aucun push · G8 **un document s'écrit avec les mêmes octets** : aucun `kind` écrit pour un document ·
G9 fmt, clippy `-p roomboard-core -p roomboard-shell` propres · G10 messages français · G11.

**Patron à ne pas reprendre (concepteur-critique).** Écrire `kind: "document"` dans tout manifeste (le chemin
« évident » d'un champ de type) : `socle_fixture_resaves_identically` (`crates/roomboard-core/tests/compat_socle.rs:105`)
casserait. Référence : `skip_serializing_if` déjà employé par `ElementView` (`crates/roomboard-core/src/element.rs:80-95`),
et la lecture contrôlée `check_manifest` (`format/mod.rs:189-208`). Ne pas refuser un fragment dans `check_manifest` :
`roomboard-formats` (conteneur avec assets) l'appelle par `open` pour les deux types.

**Interdits.** Ne pas toucher `document.rs`, `commands.rs`, `element.rs`, `copy.rs`, `lib.rs`. Ne pas changer
`save_parts` ni `save`. Pas de `deny_unknown_fields`.

**Terminé quand.** Tests nommés verts, suite du workspace Cargo verte, fmt et clippy propres, `tauri.conf.json` valide
(`node -e "JSON.parse(require('fs').readFileSync('apps/desktop/src-tauri/tauri.conf.json','utf8'))"` sans erreur), un
commit `feat(format): manifest kind, rbitem fragment codec, rbitem association`.

**Étapes.**

- [ ] **Étape 1 : tests rouges (`format/mod.rs`, module `tests`).** Adapter `manifest_json` (le littéral `Manifest`
  gagne `kind: None, name: None, bounds: None`) et ajouter un second assistant et les tests :

```rust
    fn manifest_with_kind(kind: &str) -> Vec<u8> {
        let mut m: serde_json::Value = serde_json::from_slice(&manifest_json("roomboard", 1, 1)).expect("json");
        m["kind"] = serde_json::Value::String(kind.into());
        serde_json::to_vec(&m).expect("json")
    }

    fn one_rect() -> Document {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        d.apply(crate::commands::Command::AddShape {
            page: p,
            shape: crate::shape::ShapeKind::Rect,
            x0: 10.0, y0: 20.0, x1: 110.0, y1: 70.0,
            style: crate::element::StrokeStyle { color: "#000000".into(), width: 4.0 },
            fill: None,
        })
        .expect("forme");
        d
    }

    #[test]
    fn manifest_without_kind_is_document() {
        let ybin = Document::blank().encode_v1();
        assert!(load_parts(&manifest_json("roomboard", 1, 1), &ybin).is_ok());
        assert!(load_parts(&manifest_with_kind("document"), &ybin).is_ok());
    }

    #[test]
    fn document_manifest_has_no_kind_field() {
        let parts = save_parts(&Document::blank(), &meta()).expect("parts");
        let text = String::from_utf8(parts.manifest).expect("utf8");
        assert!(!text.contains("\"kind\"") && !text.contains("\"name\"") && !text.contains("\"bounds\""));
    }

    #[test]
    fn unknown_kind_is_refused() {
        let ybin = Document::blank().encode_v1();
        for k in ["grid", "pack", "autre"] {
            let e = load_parts(&manifest_with_kind(k), &ybin).err();
            assert_eq!(e, Some(FormatError::UnknownKind { found: k.into() }));
            assert_eq!(load_fragment_parts(&manifest_with_kind(k), &ybin).err(), e);
        }
        assert_eq!(
            FormatError::UnknownKind { found: "grid".into() }.to_string(),
            "type de fichier RoomBoard inconnu (« grid ») : pris en charge dans une prochaine version"
        );
    }

    #[test]
    fn fragment_is_not_a_document() {
        let bytes = save_fragment(&one_rect(), &meta(), "Sélection").expect("fragment");
        assert_eq!(load(&bytes).err(), Some(FormatError::WrongKind { expected: KIND_DOCUMENT }));
        let parts = save_fragment_parts(&one_rect(), &meta(), "Sélection").expect("parts");
        assert_eq!(
            load_parts(&parts.manifest, &parts.ybin).err(),
            Some(FormatError::WrongKind { expected: KIND_DOCUMENT })
        );
        assert_eq!(
            FormatError::WrongKind { expected: KIND_DOCUMENT }.to_string(),
            "ce fichier est un objet RoomBoard (.rbitem) : déposez-le ou importez-le sur une page"
        );
    }

    #[test]
    fn document_is_not_a_fragment() {
        let bytes = save(&Document::blank(), &meta()).expect("save");
        assert_eq!(load_fragment(&bytes).err(), Some(FormatError::WrongKind { expected: KIND_FRAGMENT }));
        assert_eq!(
            FormatError::WrongKind { expected: KIND_FRAGMENT }.to_string(),
            "ce fichier est un document RoomBoard (.roomboard), pas un objet : ouvrez-le ou insérez ses pages"
        );
    }

    #[test]
    fn fragment_round_trip_keeps_name_bounds_and_elements() {
        let d = one_rect();
        let bytes = save_fragment(&d, &meta(), "Sélection").expect("fragment");
        let (f, m) = load_fragment(&bytes).expect("lecture");
        assert_eq!(m.kind.as_deref(), Some(KIND_FRAGMENT));
        assert_eq!(m.name.as_deref(), Some("Sélection"));
        let ids = d.element_ids(&d.page_ids()[0]);
        assert_eq!(m.bounds, d.bounds(&ids));
        assert!(m.bounds.is_some());
        assert_eq!(f.element_ids(&f.page_ids()[0]), ids);
        let parts = save_fragment_parts(&d, &meta(), "Sélection").expect("parts");
        assert!(load_fragment_parts(&parts.manifest, &parts.ybin).is_ok());
    }

    #[test]
    fn fragment_save_is_deterministic() {
        let d = one_rect();
        assert_eq!(save_fragment(&d, &meta(), "x").expect("1"), save_fragment(&d, &meta(), "x").expect("2"));
    }

    #[test]
    fn fragment_parts_need_one_page() {
        let mut d = Document::blank();
        d.add_page();
        assert!(matches!(save_fragment_parts(&d, &meta(), "x"), Err(FormatError::Corrupt(_))));
    }
```

Dans `crates/roomboard-shell/src/lib.rs`, test `launch_paths_keeps_associated_extensions` : ajouter l'argument
`"/x/objet.RBITEM"` après `"/x/b.roomboard"` et `PathBuf::from("/x/objet.RBITEM")` en fin du `vec!` attendu.

- [ ] **Étape 2 : voir rouge.** `cargo test -p roomboard-core -p roomboard-shell 2>&1 | grep -E "error\[|FAILED" | head -8`.

- [ ] **Étape 3 : `Bounds` désérialisable (`query.rs` l. 20).** `#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]`.

- [ ] **Étape 4 : manifeste, erreurs, lecture contrôlée (`format/mod.rs`).**

```rust
use crate::query::Bounds;

pub const KIND_DOCUMENT: &str = "document";
pub const KIND_FRAGMENT: &str = "fragment";
pub const FRAGMENT_EXTENSION: &str = "rbitem";
pub const FRAGMENT_MIME: &str = "application/x-roomboard-item";
```

`Manifest`, après `modified` :

```rust
    /// Type du fichier (U8) : absent ou `"document"` = document ; `"fragment"` = objet `.rbitem` ; jamais écrit pour
    /// un document (mêmes octets qu'avant C3).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub kind: Option<String>,
    /// Nom d'un fragment (Z6).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    /// Boîte monde des objets d'un fragment (Z6, Z7).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bounds: Option<Bounds>,
```

`save_parts` : compléter le littéral par `kind: None, name: None, bounds: None,`. `FormatError` gagne
`UnknownKind { found: String }` et `WrongKind { expected: &'static str }` ; `Display` :

```rust
            FormatError::UnknownKind { found } => write!(
                f,
                "type de fichier RoomBoard inconnu (« {found} ») : pris en charge dans une prochaine version"
            ),
            FormatError::WrongKind { expected } if *expected == KIND_FRAGMENT => write!(
                f,
                "ce fichier est un document RoomBoard (.roomboard), pas un objet : ouvrez-le ou insérez ses pages"
            ),
            FormatError::WrongKind { .. } => write!(
                f,
                "ce fichier est un objet RoomBoard (.rbitem) : déposez-le ou importez-le sur une page"
            ),
```

Fin de `check_manifest`, avant `Ok(manifest)` :

```rust
    match manifest.kind.as_deref() {
        None | Some(KIND_DOCUMENT) | Some(KIND_FRAGMENT) => {}
        Some(other) => {
            return Err(FormatError::UnknownKind {
                found: other.to_string(),
            })
        }
    }
```

Puis :

```rust
/// Le manifeste dit-il le type attendu ? `kind` absent = document (U8).
fn expect_kind(m: &Manifest, expected: &'static str) -> Result<(), FormatError> {
    if m.kind.as_deref().unwrap_or(KIND_DOCUMENT) == expected {
        Ok(())
    } else {
        Err(FormatError::WrongKind { expected })
    }
}
```

`load_parts` devient :

```rust
pub fn load_parts(manifest: &[u8], ybin: &[u8]) -> Result<(Document, Manifest), FormatError> {
    let m = check_manifest(manifest)?;
    expect_kind(&m, KIND_DOCUMENT)?;
    decode_checked(m, ybin)
}
```

`load_with_manifest` : `let opened = open(bytes)?; expect_kind(&opened.manifest, KIND_DOCUMENT)?;` puis inchangé. Ajouter :

```rust
/// Manifeste et `document.ybin` d'un fragment (Z6) : `kind: "fragment"`, `name`, `bounds` des éléments de la page
/// unique ; `created` = maintenant (un fragment n'a pas d'historique d'enregistrement).
pub fn save_fragment_parts(doc: &Document, meta: &SaveMeta, name: &str) -> Result<Parts, FormatError> {
    let pages = doc.page_ids();
    if pages.len() != 1 {
        return Err(FormatError::Corrupt(format!(
            "fragment de {} pages : une seule attendue",
            pages.len()
        )));
    }
    let schema = doc
        .schema()
        .ok_or_else(|| FormatError::Corrupt("meta.schema absent".into()))? as u32;
    let manifest = Manifest {
        format: FORMAT.into(),
        format_version: FORMAT_VERSION,
        schema,
        app_version: meta.app_version.clone(),
        created: meta.created.clone().unwrap_or_else(|| meta.now.clone()),
        modified: meta.now.clone(),
        kind: Some(KIND_FRAGMENT.into()),
        name: Some(name.into()),
        bounds: doc.bounds(&doc.element_ids(&pages[0])),
    };
    let json =
        serde_json::to_vec_pretty(&manifest).map_err(|e| FormatError::Corrupt(e.to_string()))?;
    Ok(Parts { manifest: json, ybin: doc.encode_v1() })
}

/// `.rbitem` complet sans asset (mêmes options de date fixe que `save`).
pub fn save_fragment(doc: &Document, meta: &SaveMeta, name: &str) -> Result<Vec<u8>, FormatError> {
    let w = write_parts(&save_fragment_parts(doc, meta, name)?)?;
    Ok(w.finish().map_err(zip_err)?.into_inner())
}

/// Lit un fragment depuis ses deux moitiés ; un document est refusé (`WrongKind`).
pub fn load_fragment_parts(manifest: &[u8], ybin: &[u8]) -> Result<(Document, Manifest), FormatError> {
    let m = check_manifest(manifest)?;
    expect_kind(&m, KIND_FRAGMENT)?;
    decode_checked(m, ybin)
}

/// Lit un `.rbitem` sans asset (repli quand le module des formats manque).
pub fn load_fragment(bytes: &[u8]) -> Result<(Document, Manifest), FormatError> {
    let opened = open(bytes)?;
    expect_kind(&opened.manifest, KIND_FRAGMENT)?;
    decode_checked(opened.manifest, &opened.parts.ybin)
}
```

- [ ] **Étape 5 : coque.** `crates/roomboard-shell/src/lib.rs:14` :
  `pub const ASSOCIATED_EXTENSIONS: &[&str] = &["roomboard", "rbitem"];`. `tauri.conf.json`, dans `fileAssociations`,
  après l'entrée `roomboard` :

```json
      {
        "ext": ["rbitem"],
        "name": "Objet RoomBoard",
        "description": "Objet RoomBoard",
        "mimeType": "application/x-roomboard-item",
        "role": "Editor"
      }
```

- [ ] **Étape 6 : voir vert.** Commandes de la section ; `cargo fmt --all --check && cargo clippy -p roomboard-core -p roomboard-shell --all-targets -- -D warnings 2>&1 | tail -5` ;
  `bash scripts/tests/coque-csp.test.sh 2>&1 | tail -3` vert.

- [ ] **Étape 7 : commit.** `git add` un par un : `crates/roomboard-core/src/format/mod.rs`,
  `crates/roomboard-core/src/query.rs`, `crates/roomboard-shell/src/lib.rs`, `apps/desktop/src-tauri/tauri.conf.json` ;
  commit (G11) `feat(format): manifest kind, rbitem fragment codec, rbitem association`.

---

### Tâche T4 — Contrat TS : commandes et méthodes C3, fausse liaison, contrôle de forme `group`

<a id="tache-t4"></a>

**Objectif.** Le contrat `api.ts` décrit tout C3 (vue `group`, `Group`, `Ungroup`, `extract`, `insertFragment`,
`insertPages`, `saveFragment(Parts)`, `loadFragment(Parts)`) ; la fausse liaison le tient avec les mêmes refus et les
mêmes messages que le cœur ; un bloc « contrat C3 » le joue sur la fausse liaison (T11 y branche le vrai module) ;
`toElementView` contrôle `group` (cadrage Z1, Z3, Z5, Z14, DAZ2 ; S1 à S5).

**Fichiers.** Modifier `apps/web/src/core/api.ts` (`Command` l. 35, `ElementBase` l. 135, `CoreDocument` l. 176,
`CoreFactory` l. 211, constantes après l. 220), `apps/web/src/core/fake-core.ts`, `apps/web/src/core/fake-core.test.ts`,
`apps/web/src/core/wasm-core.ts` (`toElementView` l. 147 seulement), `apps/web/src/core/wasm-core.contract.test.ts`
(bloc neuf en fin de fichier).

**Interfaces.**
- Produit (lu par T8, T11, T12, T13, T14, T15) :

```ts
// Command, deux variantes de plus :
  | { readonly type: "Group"; readonly ids: readonly string[] }
  | { readonly type: "Ungroup"; readonly ids: readonly string[] }
// ElementBase :
interface ElementBase {
  readonly id: string;
  readonly transform: Matrix;
  /** C3 (Z1) : chemin de groupes, extérieur d'abord ; absent sans groupe. */
  readonly group?: readonly string[];
}
// CoreDocument :
  /** C3 (Z5) : document neuf d'une page qui porte une recopie des éléments `ids` de `page` (ids neufs, aucune étape). */
  extract(page: string, ids: readonly string[]): CoreDocument;
  /** C3 : éléments de la première page de `src` en haut de `page`, translatés ; une étape ; source vide : aucune. */
  insertFragment(src: CoreDocument, page: string, dx: number, dy: number): Change;
  /** C3 : pages de `src` recopiées à la suite de `after` ; une étape. */
  insertPages(src: CoreDocument, after: string): Change;
  /** C3 (Z6) : `.rbitem` sans asset (ZIP du cœur). */
  saveFragment(now: string, appVersion: string, name: string): Uint8Array;
  /** C3 (Z6) : manifeste et `document.ybin` d'un fragment, pour le conteneur avec assets. */
  saveFragmentParts(now: string, appVersion: string, name: string): readonly [Uint8Array, Uint8Array];
// CoreFactory :
  /** C3 : lit un `.rbitem` sans asset ; un document est refusé (message du cœur). */
  loadFragment(bytes: Uint8Array): CoreDocument;
  loadFragmentParts(manifest: Uint8Array, ybin: Uint8Array): CoreDocument;
// constantes :
export const BAD_GROUP_MESSAGE = "groupe invalide (au moins deux objets ou groupes d'une même page, ids connus attendus)";
export const NOT_A_DOCUMENT_MESSAGE = "ce fichier est un objet RoomBoard (.rbitem) : déposez-le ou importez-le sur une page";
export const NOT_A_FRAGMENT_MESSAGE = "ce fichier est un document RoomBoard (.roomboard), pas un objet : ouvrez-le ou insérez ses pages";
export const unknownKindMessage = (kind: string): string =>
  `type de fichier RoomBoard inconnu (« ${kind} ») : pris en charge dans une prochaine version`;
/** Source d'une insertion venue de l'autre liaison (fausse ↔ Wasm) : jamais mêlées (DAZ2). */
export const MIXED_SOURCE_MESSAGE = "source d'une autre liaison : insertion impossible";
```

- Réutilise : `apps/web/src/core/api.ts:35` (`Command`), `:135` (`ElementBase`), `:176` (`CoreDocument`), `:211` (`CoreFactory`) — étendus ci-dessus.
- Réutilise : `apps/web/src/core/fake-core.ts:722` (`saveParts`), `:787` (`save`), `:1014` (`loadFake`), `:1038` (`loadParts`) — mêmes méthodes neuves (Z14).
- Réutilise : `apps/web/src/core/wasm-core.ts:147` (`toElementView`) — lit `group`.
- Réutilise : `apps/web/src/core/wasm-core.contract.test.ts:197` (`factories`), patron `const c7bFactories = factories` (l. 1738) — bloc `describe.each(c3Factories)`.

**Test et commande bornée.**
`export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c3-groupes--T4 && pnpm install --frozen-lockfile >/dev/null && pnpm --filter @roomboard/web test -- src/core --reporter=verbose 2>&1 | grep -E "C3|×|Test Files|Tests " | tail -40`
Attendu : 0 `×` ; ≥ 14 lignes `✓ … contrat C3 : fausse liaison > …` ; ≥ 2 `✓ … contrôle de forme C3 > …` ; ≥ 3
`✓ … fakeCore — C3 > …` ; ligne `Tests` sans `failed`. (Sans `.wasm` dans le worktree, les blocs du vrai module se
sautent : c'est attendu ici.)

**Contraintes (recopiées).** G1 TDD rouge d'abord · G2 preuves bornées, PATH, `pnpm install --frozen-lockfile` dans un
worktree neuf · G5 aucun test sauté ou affaibli · G6 aucune dépendance · G7 commits jejeasterix, anglais,
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un, aucun push · G10 messages français,
identiques au cœur · G11. `tsc` : seul écart permis, `WasmCoreDocument` et `createWasmCore` sans les méthodes C3 (fermé
par T11).

**Patron à ne pas reprendre (concepteur-critique).** Implémenter la fausse liaison « à peu près » et exclure ses écarts
du contrat : le contrat C3 doit passer à l'identique sur les deux fabriques (mêmes refus, mêmes messages, mêmes `Change`,
ids triés comme le cœur). Référence de parité : le bloc C10a (`wasm-core.contract.test.ts:1502-1706`) et
`fake-core.ts:597-690` (mêmes refus dans le même ordre que `table.rs`). Ordre des contrôles à reproduire : `Group` →
ids vides ou inconnus, puis pages différentes, puis moins de deux unités (tous `BAD_GROUP_MESSAGE`) ;
`insertFragment` → source d'une autre liaison, déplacement non fini (`matrice invalide (six nombres finis, inversible)`),
page inconnue (`page inconnue : X`) ; `extract` → page inconnue, puis premier id absent (`élément inconnu : X`).

**Interdits.** Ne pas appeler de méthode Wasm neuve dans `wasm-core.ts` (T11). Ne pas toucher `engine/`, `app/`,
`platform/`. Pas d'`as any`.

**Terminé quand.** Commande verte avec les comptes ci-dessus, aucun test existant de `src/core` rouge, un commit
`feat(web-core): C3 contract, fake binding groups and fragments`.

**Étapes.**

- [ ] **Étape 1 : tests rouges — bloc « contrat C3 » (fin de `wasm-core.contract.test.ts`).** Importer `BAD_GROUP_MESSAGE`,
  `NOT_A_DOCUMENT_MESSAGE`, `NOT_A_FRAGMENT_MESSAGE` depuis `./api`.

```ts
// C3 (Z1, Z5, Z6) : groupes, extraction, insertion, fragments. T11 branche le vrai module (`c3Factories = factories`).
const c3Factories: { name: string; f: CoreFactory }[] = [{ name: "fausse liaison", f: fakeCore }];
const C3_ASSET = { id: "ab".repeat(32), name: "a.png", mime: "image/png", size: 3 };
const C3_GRID: GridInput = {
  visible: true, snap: true, above: false,
  levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#cccccc", line: "solid", lineWidth: 1, snap: true, visible: true }],
};
describe.each(c3Factories)("contrat C3 : $name", ({ f }) => {
  const rect = (d: CoreDocument, p: string, x: number): string => {
    const id = d.apply({ type: "AddShape", page: p, shape: "rect", x0: x, y0: 100, x1: x + 50, y1: 150, style, fill: null }).ids[0];
    if (id === undefined) throw new Error("aucun id");
    return id;
  };
  const groupOf = (d: CoreDocument, id: string): readonly string[] | undefined => d.element(id)?.group;

  it("un élément sans groupe n'a pas de champ group", () => {
    const d = f.blank();
    const a = rect(d, first(d), 0);
    expect(d.element(a)).not.toHaveProperty("group");
  });

  it("Group : un groupe neuf en tête du chemin, ids triés, une étape", () => {
    const d = f.blank();
    const p = first(d);
    const a = rect(d, p, 0);
    const b = rect(d, p, 100);
    const c = d.apply({ type: "Group", ids: [b, a] });
    expect(c.ids).toEqual([a, b].sort());
    expect(c.pages).toEqual([p]);
    const g = groupOf(d, a);
    expect(g).toHaveLength(1);
    expect(groupOf(d, b)).toEqual(g);
    d.undo();
    expect([groupOf(d, a), groupOf(d, b)]).toEqual([undefined, undefined]);
  });

  it("Group refusé : vide, id inconnu, autre page, une seule unité ; rien d'écrit", () => {
    const d = f.blank();
    const p = first(d);
    const a = rect(d, p, 0);
    const b = rect(d, p, 100);
    const q = d.apply({ type: "AddPage", after: p }).pages[0]!;
    const c = rect(d, q, 0);
    for (const ids of [[], [a, "absent"], [a, c], [a], [a, a]]) {
      unchanged(d, () => expect(messageOf(() => d.apply({ type: "Group", ids }))).toBe(BAD_GROUP_MESSAGE));
    }
    d.apply({ type: "Group", ids: [a, b] });
    unchanged(d, () => expect(messageOf(() => d.apply({ type: "Group", ids: [a, b] }))).toBe(BAD_GROUP_MESSAGE));
  });

  it("groupe de groupe : chemins imbriqués ; Ungroup retire le niveau extérieur", () => {
    const d = f.blank();
    const p = first(d);
    const a = rect(d, p, 0);
    const b = rect(d, p, 100);
    const c = rect(d, p, 200);
    d.apply({ type: "Group", ids: [a, b] });
    const inner = groupOf(d, a)!;
    d.apply({ type: "Group", ids: [a, b, c] });
    const outer = groupOf(d, a)!;
    expect(outer).toHaveLength(2);
    expect(outer[1]).toBe(inner[0]);
    expect(groupOf(d, c)).toEqual([outer[0]]);
    const u = d.apply({ type: "Ungroup", ids: [a, b, c] });
    expect(u.ids).toEqual([a, b, c].sort());
    expect([groupOf(d, a), groupOf(d, b), groupOf(d, c)]).toEqual([inner, inner, undefined]);
  });

  it("Ungroup sans élément groupé : aucune étape", () => {
    const d = f.blank();
    const a = rect(d, first(d), 0);
    unchanged(d, () => expect(d.apply({ type: "Ungroup", ids: [a, "absent"] }).ids).toEqual([]));
  });

  it("extract : une page, ids neufs, ordre d'empilement, aucune étape", () => {
    const d = f.blank();
    const p = first(d);
    const a = commit(d, p, 100);
    rect(d, p, 300);
    const c = rect(d, p, 500);
    const x = d.extract(p, [c, a]);
    expect(x.pageIds()).toHaveLength(1);
    const ids = x.elementIds(first(x));
    expect(ids).toHaveLength(2);
    expect(ids).not.toContain(a);
    expect(x.element(ids[0]!)?.kind).toBe("stroke");
    expect(x.element(ids[1]!)?.transform).toEqual(d.element(c)?.transform);
    expect(x.canUndo()).toBe(false);
  });

  it("extract refusé : page ou élément inconnus", () => {
    const d = f.blank();
    const a = rect(d, first(d), 0);
    expect(messageOf(() => d.extract("absente", [a]))).toBe("page inconnue : absente");
    expect(messageOf(() => d.extract(first(d), [a, "x"]))).toBe("élément inconnu : x");
  });

  it("extract recopie texte riche, tableau et métadonnée des seuls assets cités", () => {
    const d = f.blank();
    const p = first(d);
    const t = d.apply({ type: "SetText", page: p, id: null, x: 10, y: 10, content: "Bonjour", color: "#000000", size: 36, boxWidth: 400, boxHeight: 45 }).ids[0]!;
    d.apply({ type: "FormatText", id: t, start: 0, len: 3, attrs: { bold: true } });
    const tb = d.apply({ type: "AddTable", page: p, x: 0, y: 300, cols: 2, rows: 2, colWidth: 100, rowHeight: 40, color: "#000000", size: 24 }).ids[0]!;
    const i = d.apply({ type: "AddImage", page: p, asset: C3_ASSET, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] }).ids[0]!;
    d.apply({ type: "AddImage", page: p, asset: { ...C3_ASSET, id: "cd".repeat(32), name: "b.png" }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] });
    const x = d.extract(p, [t, tb, i]);
    const ids = x.elementIds(first(x));
    expect(x.element(ids[0]!)).toMatchObject({ kind: "text", text: (d.element(t) as { text: unknown }).text });
    expect(x.element(ids[1]!)).toMatchObject({ table: (d.element(tb) as { table: unknown }).table });
    expect(x.citedAssets()).toEqual([C3_ASSET]);
  });

  it("insertFragment : en haut de la pile, translaté, une étape", () => {
    const s = f.blank();
    const a = rect(s, first(s), 0);
    const frag = s.extract(first(s), [a]);
    const d = f.blank();
    const p = first(d);
    const old = commit(d, p, 500);
    const c = d.insertFragment(frag, p, 10, 20);
    const ids = d.elementIds(p);
    expect(ids[0]).toBe(old);
    expect(c.ids).toEqual([ids[1]]);
    expect(c.pages).toEqual([p]);
    const t0 = s.element(a)!.transform;
    const t1 = d.element(ids[1]!)!.transform;
    expect([t1[4], t1[5]]).toEqual([t0[4] + 10, t0[5] + 20]);
    d.undo();
    expect(d.elementIds(p)).toEqual([old]);
  });

  it("deux insertions : ids et groupes indépendants", () => {
    const s = f.blank();
    const sp = first(s);
    const a = rect(s, sp, 0);
    const b = rect(s, sp, 100);
    s.apply({ type: "Group", ids: [a, b] });
    const frag = s.extract(sp, [a, b]);
    const d = f.blank();
    const p = first(d);
    const c1 = d.insertFragment(frag, p, 0, 0);
    const c2 = d.insertFragment(frag, p, 24, 24);
    expect(c1.ids.some((id) => c2.ids.includes(id))).toBe(false);
    const g1 = groupOf(d, c1.ids[0]!);
    const g2 = groupOf(d, c2.ids[0]!);
    expect(g1).toHaveLength(1);
    expect(g1).not.toEqual(g2);
    expect(groupOf(d, c1.ids[1]!)).toEqual(g1);
    expect(groupOf(d, c2.ids[1]!)).toEqual(g2);
    expect(g1).not.toEqual(groupOf(s, a));
  });

  it("insertFragment refusé : déplacement non fini, page inconnue ; source vide : aucune étape", () => {
    const s = f.blank();
    const a = rect(s, first(s), 0);
    const frag = s.extract(first(s), [a]);
    const d = f.blank();
    const p = first(d);
    unchanged(d, () => expect(messageOf(() => d.insertFragment(frag, p, Number.NaN, 0))).toBe("matrice invalide (six nombres finis, inversible)"));
    unchanged(d, () => expect(messageOf(() => d.insertFragment(frag, "absente", 0, 0))).toBe("page inconnue : absente"));
    unchanged(d, () => expect(d.insertFragment(s.extract(first(s), []), p, 0, 0).ids).toEqual([]));
  });

  it("insertPages : pages recopiées après la page, grille et image, une étape", () => {
    const s = f.blank();
    const s0 = first(s);
    const s1 = s.apply({ type: "AddPage", after: s0 }).pages[0]!;
    s.apply({ type: "AddImage", page: s0, asset: C3_ASSET, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] });
    rect(s, s1, 0);
    s.apply({ type: "SetGrid", page: s1, grid: C3_GRID });
    const d = f.blank();
    const t0 = first(d);
    const t1 = d.apply({ type: "AddPage", after: t0 }).pages[0]!;
    const c = d.insertPages(s, t0);
    const pages = d.pageIds();
    expect(pages).toHaveLength(4);
    expect([pages[0], pages[3]]).toEqual([t0, t1]);
    expect(c.pages).toEqual([pages[1], pages[2]]);
    expect(pages).not.toContain(s0);
    expect(d.page(pages[2]!)?.grid).toEqual(C3_GRID);
    expect(c.ids).toHaveLength(2);
    expect(d.asset(C3_ASSET.id)).toEqual(C3_ASSET);
    d.undo();
    expect(d.pageIds()).toEqual([t0, t1]);
    expect(d.asset(C3_ASSET.id)?.name).toBe(C3_ASSET.id);
  });

  it("insertPages : page inconnue refusée", () => {
    const d = f.blank();
    unchanged(d, () => expect(messageOf(() => d.insertPages(f.blank(), "absente"))).toBe("page inconnue : absente"));
  });

  it("fragment : saveFragment puis loadFragment ; groupes gardés ; parts", () => {
    const s = f.blank();
    const sp = first(s);
    const a = rect(s, sp, 0);
    const b = rect(s, sp, 100);
    s.apply({ type: "Group", ids: [a, b] });
    const frag = s.extract(sp, [a, b]);
    const back = f.loadFragment(frag.saveFragment(now, "0.1.0", "Sélection"));
    const ids = back.elementIds(first(back));
    expect(ids).toHaveLength(2);
    expect(groupOf(back, ids[0]!)).toHaveLength(1);
    expect(groupOf(back, ids[0]!)).toEqual(groupOf(back, ids[1]!));
    const [m, y] = frag.saveFragmentParts(now, "0.1.0", "Sélection");
    expect(f.loadFragmentParts(m, y).elementIds(first(frag))).toHaveLength(2);
  });

  it("un fragment n'est pas un document, un document n'est pas un fragment", () => {
    const s = f.blank();
    const frag = s.extract(first(s), [rect(s, first(s), 0)]);
    expect(messageOf(() => f.load(frag.saveFragment(now, "0.1.0", "x")))).toBe(NOT_A_DOCUMENT_MESSAGE);
    expect(messageOf(() => f.loadFragment(f.blank().save(now, "0.1.0")))).toBe(NOT_A_FRAGMENT_MESSAGE);
  });

  it("enregistrer puis relire garde les groupes", () => {
    const d = f.blank();
    const p = first(d);
    const a = rect(d, p, 0);
    const b = rect(d, p, 100);
    d.apply({ type: "Group", ids: [a, b] });
    const back = f.load(d.save(now, "0.1.0"));
    expect(back.element(a)?.group).toEqual(d.element(a)?.group);
  });
});

describe("contrôle de forme C3", () => {
  const base = { id: "e", kind: "stroke", transform: [1, 0, 0, 1, 0, 0], style: { color: "#000000", width: 4 } };
  it("group lisible recopié, absent laissé absent", () => {
    expect(toElementView({ ...base, group: ["g1", "g2"] })).toMatchObject({ group: ["g1", "g2"] });
    expect(toElementView(base)).not.toHaveProperty("group");
  });
  it("group mal formé : erreur de forme", () => {
    for (const group of [3, [], [1], "g"]) expect(() => toElementView({ ...base, group })).toThrow("ElementView invalide");
  });
});
```

(`messageOf`, `unchanged`, `first`, `commit`, `style`, `now`, `GridInput` sont déjà dans le fichier ; vérifier que
`GridInput` est importé — il l'est, l. 4.)

- [ ] **Étape 2 : tests rouges — `fake-core.test.ts`.** Ajouter :

```ts
describe("fakeCore — C3", () => {
  it("JSON d'un kind inconnu : refusé comme le cœur ; d'un fragment ouvert comme document : refusé", () => {
    const grid = new TextEncoder().encode(JSON.stringify({ kind: "grid", pages: [] }));
    expect(() => fakeCore.load(grid)).toThrow("type de fichier RoomBoard inconnu (« grid ») : pris en charge dans une prochaine version");
    expect(() => fakeCore.loadFragment(grid)).toThrow("(« grid »)");
  });
  it("group illisible dans le JSON : retiré (PC6), l'élément reste", () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0]!;
    d.apply({ type: "AddShape", page: p, shape: "rect", x0: 0, y0: 0, x1: 10, y1: 10, style: { color: "#000000", width: 4 }, fill: null });
    const json = JSON.parse(new TextDecoder().decode(d.save("n", "v"))) as { pages: { elements: Record<string, unknown>[] }[] };
    json.pages[0]!.elements[0]!["group"] = [1];
    const back = fakeCore.load(new TextEncoder().encode(JSON.stringify(json)));
    const id = back.elementIds(back.pageIds()[0]!)[0]!;
    expect(back.element(id)).not.toHaveProperty("group");
  });
  it("source d'une autre liaison : erreur", () => {
    const d = fakeCore.blank();
    const other = { ...fakeCore.blank() } as unknown as CoreDocument;
    expect(() => d.insertFragment(other, d.pageIds()[0]!, 0, 0)).toThrow("source d'une autre liaison : insertion impossible");
    expect(() => d.insertPages(other, d.pageIds()[0]!)).toThrow("source d'une autre liaison : insertion impossible");
  });
});
```

(Importer `type CoreDocument` depuis `./api` si absent.)

- [ ] **Étape 3 : voir rouge.** `pnpm --filter @roomboard/web test -- src/core 2>&1 | grep -E "×|Tests " | tail -10`.

- [ ] **Étape 4 : `api.ts`.** Ajouter les variantes, le champ `group`, les méthodes et constantes de « Interfaces »
  (variantes `Group` et `Ungroup` en fin de l'union `Command` ; commentaire d'en-tête : ligne
  `// C3 : Group, Ungroup ; ElementBase.group ; extract, insertFragment, insertPages, saveFragment(Parts), loadFragment(Parts).`).

- [ ] **Étape 5 : `wasm-core.ts`, contrôle de `group` seulement.** Dans `toElementView`, remplacer la ligne `const base = …` :

```ts
  const group = v["group"];
  if (group !== undefined && group !== null && (!isStrings(group) || group.length === 0)) throw new Error(ELEMENT);
  const base = { id, transform: toMatrix(v["transform"]), ...(isStrings(group) ? { group } : {}) };
```

- [ ] **Étape 6 : fausse liaison (`fake-core.ts`).** En-tête : ajouter une ligne
  `// C3 : chemin group (Group, Ungroup), extract, insertFragment, insertPages, fragments JSON { kind: "fragment", name, … } ; mêmes refus et messages que le cœur.`
  Imports : `BAD_GROUP_MESSAGE`, `MIXED_SOURCE_MESSAGE`, `NOT_A_DOCUMENT_MESSAGE`, `NOT_A_FRAGMENT_MESSAGE`,
  `unknownKindMessage` depuis `./api`. `FakeElement` gagne `readonly group?: readonly string[];` ; `SavedElement`
  gagne `group?: unknown;`. Ajouter près de `clone` :

```ts
const readGroup = (v: unknown): readonly string[] | undefined =>
  Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === "string") ? (v as string[]) : undefined;
const withGroup = (g: readonly string[] | undefined): { group?: readonly string[] } => (g === undefined ? {} : { group: g });

/** Recopie (Z4) : id neuf, chemin renuméroté par `groups` (commun à l'insertion), translation si le transform est lu. */
function copyElement(e: FakeElement, groups: Map<string, string>, dx: number, dy: number): FakeElement {
  const group = e.group?.map((g) => {
    let n = groups.get(g);
    if (n === undefined) {
      n = newId();
      groups.set(g, n);
    }
    return n;
  });
  const { group: _old, ...rest } = e;
  const moves = (dx !== 0 || dy !== 0) && e.unknown?.hasTransform !== false && e.malformed === undefined;
  const t = e.transform;
  const transform: Matrix = moves ? [t[0], t[1], t[2], t[3], t[4] + dx, t[5] + dy] : t;
  return { ...rest, id: newId(), transform, ...withGroup(group) };
}
```

`element(id)` : `const base = { id, transform: e.transform, ...withGroup(e.group) };`. `savedElement` : ajouter
`...withGroup(e.group)` à chaque objet rendu sauf la branche `malformed` (le brut garde déjà son `group`). `loadElement` :
`const group = readGroup(e.group);` en tête, puis `...withGroup(group)` sur chaque `FakeElement` rendu sauf `malformed`.
`MESSAGES` gagne `badGroup: BAD_GROUP_MESSAGE`.

Dans `apply`, deux bras :

```ts
      case "Group": {
        const unique = [...new Set(cmd.ids)];
        const found = unique.map((id) => this.find(id));
        if (unique.length === 0 || found.some((x) => x === undefined)) throw new Error(MESSAGES.badGroup);
        const hits = found as Found[];
        const pageId = hits[0]!.page.id;
        if (hits.some((x) => x.page.id !== pageId)) throw new Error(MESSAGES.badGroup);
        if (new Set(hits.map((x) => x.element.group?.[0] ?? x.element.id)).size < 2) throw new Error(MESSAGES.badGroup);
        const gid = newId();
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === pageId);
          p?.elements.forEach((e, i) => {
            if (unique.includes(e.id)) p.elements[i] = { ...e, group: [gid, ...(e.group ?? [])] };
          });
          return { pages: [pageId], ids: [...unique].sort(), removed: [] };
        });
      }
      case "Ungroup": {
        const hits = [...new Set(cmd.ids)]
          .map((id) => this.find(id))
          .filter((x): x is Found => x !== undefined && (x.element.group?.length ?? 0) > 0);
        if (hits.length === 0) return this.unchanged();
        const ids = hits.map((x) => x.element.id).sort();
        const pages = [...new Set(hits.map((x) => x.page.id))].sort();
        return this.step((s) => {
          for (const p of s.pages) {
            p.elements.forEach((e, i) => {
              if (!ids.includes(e.id) || e.group === undefined) return;
              const { group: _g, ...rest } = e;
              const tail = e.group.slice(1);
              p.elements[i] = tail.length > 0 ? { ...rest, group: tail } : rest;
            });
          }
          return { pages, ids, removed: [] };
        });
      }
```

Méthodes de `FakeDocument` (après `asset`) ; `save` est réécrit pour partager le corps JSON (même ordre de clés) :

```ts
  private json(now: string, appVersion: string): Record<string, unknown> {
    return {
      now,
      appVersion,
      assets: Object.fromEntries(this.state.assets),
      pages: this.state.pages.map((p) => ({ id: p.id, backdrop: p.backdrop, elements: p.elements.map(savedElement), ...(p.grid !== null ? { grid: p.grid } : {}) })),
    };
  }
  save(now: string, appVersion: string): Uint8Array {
    return new TextEncoder().encode(JSON.stringify(this.json(now, appVersion)));
  }
  saveFragment(now: string, appVersion: string, name: string): Uint8Array {
    const n = this.state.pages.length;
    if (n !== 1) throw new Error(`document RoomBoard endommagé : fragment de ${n} pages : une seule attendue`);
    return new TextEncoder().encode(JSON.stringify({ kind: "fragment", name, ...this.json(now, appVersion) }));
  }
  saveFragmentParts(now: string, appVersion: string, name: string): readonly [Uint8Array, Uint8Array] {
    const manifest = new TextEncoder().encode(JSON.stringify({ format: "roomboard-fake", kind: "fragment", name, appVersion, modified: now }));
    return [manifest, this.saveFragment(now, appVersion, name)] as const;
  }
  extract(page: string, ids: readonly string[]): CoreDocument {
    const p = this.pageOf(page);
    for (const id of ids) if (!p.elements.some((e) => e.id === id)) throw new Error(`élément inconnu : ${id}`);
    const wanted = new Set(ids);
    const groups = new Map<string, string>();
    const elements = p.elements.filter((e) => wanted.has(e.id)).map((e) => copyElement(e, groups, 0, 0));
    const out = new FakeDocument({ pages: [{ id: newId(), elements, backdrop: null, grid: null }], assets: new Map() });
    for (const a of out.citedAssets()) {
      const v = this.state.assets.get(a.id);
      if (v !== undefined) out.state.assets.set(a.id, v);
    }
    return out;
  }
  insertFragment(src: CoreDocument, page: string, dx: number, dy: number): Change {
    if (!(src instanceof FakeDocument)) throw new Error(MIXED_SOURCE_MESSAGE);
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) throw new Error(MESSAGES.badMatrix);
    this.pageOf(page);
    const from = src.state.pages[0]?.elements ?? [];
    if (from.length === 0) return this.unchanged();
    const groups = new Map<string, string>();
    const copies = from.map((e) => copyElement(e, groups, dx, dy));
    const cited = src.citedAssets().map((a) => a.id);
    return this.step((s) => {
      s.pages.find((q) => q.id === page)?.elements.push(...copies);
      adoptMeta(s.assets, src.state.assets, cited);
      return { pages: [page], ids: copies.map((c) => c.id), removed: [] };
    });
  }
  insertPages(src: CoreDocument, after: string): Change {
    if (!(src instanceof FakeDocument)) throw new Error(MIXED_SOURCE_MESSAGE);
    const at = this.state.pages.findIndex((p) => p.id === after);
    if (at < 0) throw new Error(`page inconnue : ${after}`);
    if (src.state.pages.length === 0) return this.unchanged();
    const groups = new Map<string, string>();
    const pages: FakePage[] = src.state.pages.map((p) => ({
      id: newId(),
      elements: p.elements.map((e) => copyElement(e, groups, 0, 0)),
      backdrop: p.backdrop,
      grid: p.grid,
    }));
    const cited = src.citedAssets().map((a) => a.id);
    return this.step((s) => {
      s.pages.splice(at + 1, 0, ...pages);
      adoptMeta(s.assets, src.state.assets, cited);
      return { pages: pages.map((p) => p.id), ids: pages.flatMap((p) => p.elements.map((e) => e.id)), removed: [] };
    });
  }
```

Fonction libre, près de `putMeta` :

```ts
/** Métadonnées des assets cités, recopiées seulement si absentes de la cible (K3). */
function adoptMeta(into: Map<string, unknown>, from: ReadonlyMap<string, unknown>, cited: readonly string[]): void {
  for (const id of cited) {
    const v = from.get(id);
    if (v !== undefined && !into.has(id)) into.set(id, v);
  }
}
```

`loadFake` devient `loadFake(bytes: Uint8Array, expected: "document" | "fragment" = "document")` ; juste après le
contrôle `isRecord(raw) && Array.isArray(raw["pages"])` :

```ts
  const kind = raw["kind"] ?? "document";
  if (kind !== "document" && kind !== "fragment") throw new Error(unknownKindMessage(String(kind)));
  if (kind !== expected) throw new Error(expected === "document" ? NOT_A_DOCUMENT_MESSAGE : NOT_A_FRAGMENT_MESSAGE);
```

Attention : le contrôle `Array.isArray(raw["pages"])` passe avant ; pour le test « kind inconnu », le JSON porte
`pages: []`. `fakeCore` gagne :

```ts
  loadFragment: (bytes: Uint8Array) => loadFake(bytes, "fragment"),
  loadFragmentParts: (manifest: Uint8Array, ybin: Uint8Array) => {
    void manifest;
    return loadFake(ybin, "fragment");
  },
```

et `load: (bytes) => loadFake(bytes)`, `loadParts` inchangé (appelle `loadFake(ybin)`).

- [ ] **Étape 7 : voir vert.** Commande de la section ; puis `pnpm --filter @roomboard/web test -- src/core 2>&1 | tail -6` (0 échec).

- [ ] **Étape 8 : commit.** `git add` un par un : `apps/web/src/core/api.ts`, `apps/web/src/core/fake-core.ts`,
  `apps/web/src/core/fake-core.test.ts`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts` ;
  commit (G11) `feat(web-core): C3 contract, fake binding groups and fragments`.

---

### Tâche T5 — Règle des groupes dans la page (`groups.ts`), raccourcis Ctrl+G

<a id="tache-t5"></a>

**Objectif.** Un module pur dit, à partir des vues, le groupe extérieur d'un élément, l'extension d'une sélection aux
groupes entiers, le filtre du rectangle (groupe pris seulement entier) et les unités d'une sélection ; `keyAction` rend
`"group"` (Ctrl+G) et `"ungroup"` (Ctrl+Maj+G), Cmd sous macOS, hors champ éditable (cadrage Z2, Z13, DAZ5, HZ1-2 ; S1).

**Fichiers.** Créer `apps/web/src/engine/groups.ts`, `apps/web/src/engine/groups.test.ts`. Modifier
`apps/web/src/engine/input/keys.ts` (`KeyAction` l. 12, `keyAction` l. 25), `apps/web/src/engine/input/keys.test.ts`.

**Interfaces.**
- Produit (lu par T12, T13) :

```ts
/** Vue minimale lue par la règle (structurelle : `ElementView` s'y range). */
export interface GroupedView { readonly id: string; readonly group?: readonly string[] }
export function outerGroup(e: GroupedView): string | null;
export function expandToGroups(ids: readonly string[], page: readonly GroupedView[]): string[];
export function keepWholeGroups(ids: readonly string[], page: readonly GroupedView[]): string[];
export function selectionUnits(ids: readonly string[], page: readonly GroupedView[]): { units: number; grouped: boolean };
// keys.ts
export type KeyAction = "undo" | "redo" | "group" | "ungroup";
```

- Réutilise : aucun module existant pour la règle (cadrage : termes `group`, `outer`, `expand` : rien) — `engine/groups.ts` neuf, signatures du cadrage (le type `ElementView` y est remplacé par sa forme structurelle `GroupedView`, que `ElementView` satisfait).
- Réutilise : `apps/web/src/engine/input/keys.ts:25` (`keyAction`) — `KeyAction` gagne `"group"`, `"ungroup"` (étendre).

**Test et commande bornée.**
`export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c3-groupes--T5 && pnpm install --frozen-lockfile >/dev/null && pnpm --filter @roomboard/web test -- src/engine/groups.test.ts src/engine/input/keys.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|Tests " | tail -40`
Attendu : 0 `×`, ≥ 7 `✓ groupes de la page (Z2) > …`, ≥ 4 `✓ keyAction : groupes (Z13) > …`, tests « keyAction (D11) »
verts.

**Contraintes (recopiées).** G1 · G2 PATH, preuves bornées, `pnpm install --frozen-lockfile` · G5 · G6 · G7 commits
jejeasterix, anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, un par un, aucun push · G11.

**Interdits.** `groups.ts` n'importe rien du cœur ni du DOM. Ne pas toucher `engine.ts`, `tools/select.ts` (T12, T13).

**Terminé quand.** Tests verts, un commit `feat(engine): group selection rules and Ctrl+G shortcuts`.

**Étapes.**

- [ ] **Étape 1 : tests rouges.** `apps/web/src/engine/groups.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { expandToGroups, keepWholeGroups, outerGroup, selectionUnits, type GroupedView } from "./groups";

const page: GroupedView[] = [
  { id: "a", group: ["G", "g"] },
  { id: "b", group: ["G", "g"] },
  { id: "c", group: ["G"] },
  { id: "d" },
  { id: "e", group: ["H"] },
  { id: "f", group: ["H"] },
];

describe("groupes de la page (Z2)", () => {
  it("outerGroup : premier id du chemin, null sans groupe", () => {
    expect(outerGroup(page[0]!)).toBe("G");
    expect(outerGroup(page[3]!)).toBeNull();
    expect(outerGroup({ id: "x", group: [] })).toBeNull();
  });
  it("expandToGroups : un membre d'un groupe imbriqué donne tout le groupe extérieur, ordre de la page", () => {
    expect(expandToGroups(["b"], page)).toEqual(["a", "b", "c"]);
  });
  it("expandToGroups : élément libre seul ; plusieurs groupes ; id absent de la page gardé", () => {
    expect(expandToGroups(["d"], page)).toEqual(["d"]);
    expect(expandToGroups(["e", "c"], page)).toEqual(["a", "b", "c", "e", "f"]);
    expect(expandToGroups(["z"], page)).toEqual(["z"]);
  });
  it("keepWholeGroups : un groupe n'est gardé que si tous ses membres sont dans le rectangle", () => {
    expect(keepWholeGroups(["a", "b", "d", "e"], page)).toEqual(["d"]);
    expect(keepWholeGroups(["a", "b", "c", "e", "f"], page)).toEqual(["a", "b", "c", "e", "f"]);
  });
  it("keepWholeGroups : sans groupe, inchangé", () => {
    expect(keepWholeGroups(["d"], page)).toEqual(["d"]);
  });
  it("selectionUnits : groupes extérieurs et éléments libres comptés une fois", () => {
    expect(selectionUnits(["a", "b", "c", "d"], page)).toEqual({ units: 2, grouped: true });
    expect(selectionUnits(["d"], page)).toEqual({ units: 1, grouped: false });
    expect(selectionUnits([], page)).toEqual({ units: 0, grouped: false });
  });
  it("selectionUnits : deux groupes = deux unités", () => {
    expect(selectionUnits(["a", "b", "c", "e", "f"], page)).toEqual({ units: 2, grouped: true });
  });
});
```

Dans `keys.test.ts` :

```ts
describe("keyAction : groupes (Z13)", () => {
  it("Ctrl+G groupe, Cmd+G aussi", () => {
    expect(keyAction(k("g", { ctrlKey: true }))).toBe("group");
    expect(keyAction(k("g", { metaKey: true }))).toBe("group");
  });
  it("Ctrl+Maj+G dégroupe (touche rendue en majuscule)", () => {
    expect(keyAction(k("G", { ctrlKey: true, shiftKey: true }))).toBe("ungroup");
  });
  it("G seul ou Alt+Ctrl+G : rien", () => {
    expect(keyAction(k("g"))).toBeNull();
    expect(keyAction(k("g", { ctrlKey: true, altKey: true }))).toBeNull();
  });
  it("Ctrl+G dans un champ : rien", () => {
    expect(keyAction(k("g", { ctrlKey: true, target: { tagName: "INPUT" } }))).toBeNull();
    expect(keyAction(k("g", { ctrlKey: true, target: { isContentEditable: true } }))).toBeNull();
  });
});
```

- [ ] **Étape 2 : voir rouge.** Commande de la section (module `./groups` introuvable, `"group"` attendu).

- [ ] **Étape 3 : `groups.ts`.**

```ts
/**
 * Règle de sélection des groupes (C3, Z2, DAZ5) : tenue dans la page sur le champ `group` des vues, sans requête du
 * cœur. Un clic prend le groupe extérieur ; Maj+clic ajoute ou retire le groupe entier ; le rectangle ne prend un groupe
 * que s'il y est entier. Pas d'entrée dans un groupe (HZ1-6).
 */
export interface GroupedView {
  readonly id: string;
  readonly group?: readonly string[];
}

export function outerGroup(e: GroupedView): string | null {
  return e.group?.[0] ?? null;
}

/** Ids augmentés des membres des groupes extérieurs qu'ils touchent ; ordre de la page, ids hors page en fin. */
export function expandToGroups(ids: readonly string[], page: readonly GroupedView[]): string[] {
  const want = new Set(ids);
  const groups = new Set<string>();
  for (const e of page) {
    const g = outerGroup(e);
    if (g !== null && want.has(e.id)) groups.add(g);
  }
  const out = page.filter((e) => want.has(e.id) || groups.has(outerGroup(e) ?? "")).map((e) => e.id);
  const known = new Set(page.map((e) => e.id));
  return [...out, ...ids.filter((id) => !known.has(id))];
}

/** Ids du rectangle, sans les membres d'un groupe dont un membre au moins manque. */
export function keepWholeGroups(ids: readonly string[], page: readonly GroupedView[]): string[] {
  const inRect = new Set(ids);
  const broken = new Set<string>();
  for (const e of page) {
    const g = outerGroup(e);
    if (g !== null && !inRect.has(e.id)) broken.add(g);
  }
  const byId = new Map(page.map((e) => [e.id, e] as const));
  return ids.filter((id) => {
    const e = byId.get(id);
    const g = e === undefined ? null : outerGroup(e);
    return g === null || !broken.has(g);
  });
}

/** Unités (groupe extérieur ou élément libre) et présence d'un groupe ; Grouper exige 2 unités (HZ2-2). */
export function selectionUnits(ids: readonly string[], page: readonly GroupedView[]): { units: number; grouped: boolean } {
  const byId = new Map(page.map((e) => [e.id, e] as const));
  const units = new Set<string>();
  let grouped = false;
  for (const id of ids) {
    const e = byId.get(id);
    const g = e === undefined ? null : outerGroup(e);
    if (g !== null) grouped = true;
    units.add(g === null ? `#${id}` : `g${g}`);
  }
  return { units: units.size, grouped };
}
```

- [ ] **Étape 4 : `keys.ts`.** Commentaire d'en-tête : ajouter « Ctrl+G grouper, Ctrl+Maj+G dégrouper (C3, Z13) ».
  `export type KeyAction = "undo" | "redo" | "group" | "ungroup";`. Dans `keyAction`, avant `return null;` final :
  `if (key === "g") return e.shiftKey ? "ungroup" : "group";`.

- [ ] **Étape 5 : voir vert ; commit.** `git add apps/web/src/engine/groups.ts`, `apps/web/src/engine/groups.test.ts`,
  `apps/web/src/engine/input/keys.ts`, `apps/web/src/engine/input/keys.test.ts` (un par un) ; commit (G11)
  `feat(engine): group selection rules and Ctrl+G shortcuts`.

Note : `engine.ts` appelle `history(action)` pour toute `KeyAction` (l. 471-473) ; tant que T13 n'est pas fusionné,
Ctrl+G y passerait pour un « rétablir ». T13 corrige ce branchement ; ne pas le toucher ici (fichier de T13), et le
signaler dans le rapport.

---

### Tâche T6 — Presse-papiers (enveloppe, interne, système, `handleCopy`) et collage des objets

<a id="tache-t6"></a>

**Objectif.** L'enveloppe `{"format":"roomboard-items/1","rbitem":"<base64>"}` s'écrit et se lit sans dépendance ; le
presse-papiers interne (un par fenêtre) et le système (`ClipboardItem` avec promesse pendant le geste, repli
`writeText`) sont tenus par un port ; `handleCopy` décide si la copie est prise ; `handlePaste` reste le seul point
d'entrée du collage, objets RoomBoard d'abord (cadrage Z8, Z9, U9, DAZ4, HZ1-1, HZ2-3, HZ2-4 ; S2).

**Fichiers.** Créer `apps/web/src/platform/clipboard.ts`, `apps/web/src/platform/clipboard.test.ts`. Modifier
`apps/web/src/platform/paste.ts`, `apps/web/src/platform/paste.test.ts`.

**Interfaces.**
- Produit (lu par T15) :

```ts
// clipboard.ts
export const ITEMS_FORMAT = "roomboard-items/1";
export const MAX_ITEMS_BYTES = 100 * 1024 * 1024;
export const NEWER_ITEMS_MESSAGE = "objets copiés par une version plus récente de RoomBoard : mettez RoomBoard à jour";
export const TOO_BIG_ITEMS_MESSAGE = "objets copiés trop gros (plus de 100 Mo)";
export const INTERNAL_ONLY_MESSAGE = "copié dans RoomBoard seulement";
export type ItemsRefusal = "newer" | "too-big";
export function toBase64(bytes: Uint8Array): string;
export function fromBase64(text: string): Uint8Array | null;
export function toEnvelope(rbitem: Uint8Array): string;
export function fromEnvelope(text: string, max?: number): Uint8Array | ItemsRefusal | null; // max = MAX_ITEMS_BYTES
export interface SystemClipboard { write(text: Promise<string>): Promise<void> }
export interface NavigatorLike {
  readonly clipboard?: { write?(items: ClipboardItem[]): Promise<void>; writeText?(text: string): Promise<void> };
}
export type ClipboardItemCtor = new (items: Record<string, Promise<Blob>>) => ClipboardItem;
export function browserSystemClipboard(nav: NavigatorLike, Item?: ClipboardItemCtor): SystemClipboard | null;
export interface Clipboard {
  /** Appelée pendant le geste : l'écriture système part avant toute attente. */
  put(rbitem: Promise<Uint8Array>): Promise<"system" | "internal">;
  last(): Uint8Array | null;
  /** PC2 : après chaque copie retenue. */
  onChange(cb: () => void): () => void;
}
export function createClipboard(sys: SystemClipboard | null): Clipboard;
export interface CopyEventLike { readonly target: EventTarget | null }
export interface CopySink { hasSelection(): boolean; copySelection(cut: boolean): Promise<void> }
export function handleCopy(e: CopyEventLike, sink: CopySink, cut: boolean): Promise<void> | null;
// paste.ts
export interface PasteEventLike {
  readonly target: EventTarget | null;
  readonly clipboardData: { readonly files: ArrayLike<File>; getData?(type: string): string } | null;
}
export function pastedItems(e: PasteEventLike): Uint8Array | ItemsRefusal | null;
export interface PasteSink {
  /** C3 (PC1) : objets RoomBoard dans l'onglet actif, ou refus à dire ; vrai si pris. */
  pasteItems(items: Uint8Array | ItemsRefusal): Promise<boolean>;
  importFiles(files: readonly DroppedFile[], at: null): Promise<unknown>;
  // + pasteTable(html: string): Promise<boolean> si OD80 est dans la base (branche A)
}
export function handlePaste(e: PasteEventLike, sink: PasteSink): Promise<void> | null;
```

- Réutilise : `feat/usage-c10b-tableau:apps/web/src/platform/paste.ts` (`handlePaste`, `PasteSink`) — `PasteSink.pasteItems` ajouté ; branche en tête de `handlePaste` (étendre, Z9).
- Réutilise : `apps/web/src/platform/paste.ts:13` (`isEditable`) — appelé par `handleCopy` et `pastedItems`.
- Réutilise : `apps/web/src/platform/paste.ts:20` (`pastedFiles`) — inchangé, dernière branche de `handlePaste`.
- Réutilise : aucun module existant pour l'enveloppe et le presse-papiers (cadrage : seul `proto/stylet.ts` appelle `clipboard.writeText`) — `platform/clipboard.ts` neuf (DAZ4).

**Deux branches, choisies au démarrage.** Dans le worktree :
`grep -q "export function handlePaste" apps/web/src/platform/paste.ts && echo A || echo B`.
- **Branche A (OD80 déjà dans la base).** Ne pas réécrire `paste.ts` : ajouter `pastedItems`, `pasteItems` dans
  `PasteSink` (en tête de l'interface, avant `pasteTable`), et la branche objets **en tête** de `handlePaste`
  (code de l'étape 4, première instruction). Garder `pastedTableHtml`, `pasteTable` et leurs tests tels quels.
- **Branche B (OD80 absent, cas attendu le 2026-11-20).** Créer `handlePaste` et `PasteSink` avec la signature exacte
  d'OD80 (`handlePaste(e: PasteEventLike, sink: PasteSink): Promise<void> | null`, `PasteEventLike.clipboardData.getData?`),
  sans la branche tableau ni `pasteTable` (ils arrivent avec OD80) : au rebase, le conflit se réduit à garder les deux
  branches, ordre objets → tableau → images (Z9). `pastedFiles` reste exporté (encore appelé par `main.ts` jusqu'à T15).

**Test et commande bornée.**
`export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c3-groupes--T6 && pnpm install --frozen-lockfile >/dev/null && pnpm --filter @roomboard/web test -- src/platform/clipboard.test.ts src/platform/paste.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|Tests " | tail -40`
Attendu : 0 `×` ; ≥ 7 `✓ enveloppe (U9, Z8) > …`, ≥ 5 `✓ presse-papiers (Z8) > …`, ≥ 4 `✓ collage des objets (Z9) > …`,
les 3 tests « collage (R19) » verts (et, en branche A, ceux d'OD80).

**Contraintes (recopiées).** G1 · G2 PATH, preuves bornées, `pnpm install --frozen-lockfile` · G5 · G6 aucune dépendance
(base64 par `btoa`/`atob` par morceaux) · G7 commits jejeasterix, anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`,
un par un, aucun push · G10 messages français · G11.

**Interdits.** Aucun second écouteur `paste` ; ne pas toucher `main.ts` (T15). `clipboard.ts` n'importe ni le cœur ni
`app/`. Pas de format natif de la coque (hors périmètre).

**Terminé quand.** Tests verts, un commit `feat(platform): clipboard envelope, internal and system clipboard, paste items first`.

**Étapes.**

- [ ] **Étape 1 : tests rouges.** `apps/web/src/platform/clipboard.test.ts` :

```ts
// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createClipboard, fromBase64, fromEnvelope, handleCopy, ITEMS_FORMAT, MAX_ITEMS_BYTES, toBase64, toEnvelope, browserSystemClipboard, type ClipboardItemCtor } from "./clipboard";

const bytes = (...b: number[]): Uint8Array => new Uint8Array(b);

describe("enveloppe (U9, Z8)", () => {
  it("toEnvelope : JSON exact, format puis rbitem", () => {
    expect(toEnvelope(bytes(1, 2, 3))).toBe('{"format":"roomboard-items/1","rbitem":"AQID"}');
    expect(ITEMS_FORMAT).toBe("roomboard-items/1");
  });
  it("aller-retour, y compris plus de 32 768 octets (base64 par morceaux)", () => {
    const big = new Uint8Array(100_000).map((_, i) => i % 251);
    expect(fromEnvelope(toEnvelope(big))).toEqual(big);
    expect(fromBase64(toBase64(bytes()))).toEqual(bytes());
  });
  it("texte ordinaire, JSON d'un autre format, base64 invalide : null", () => {
    for (const t of ["bonjour", "", "{}", '{"format":"autre/1","rbitem":"AQID"}', '{"format":"roomboard-items/1","rbitem":"@@@"}', '{"format":"roomboard-items/1"}', "[1,2]"]) {
      expect(fromEnvelope(t), t).toBeNull();
    }
  });
  it("format plus récent : newer, avant de lire rbitem", () => {
    expect(fromEnvelope('{"format":"roomboard-items/2","nouveau":true}')).toBe("newer");
  });
  it("format illisible (roomboard-items/x, /0) : null", () => {
    expect(fromEnvelope('{"format":"roomboard-items/x","rbitem":"AQID"}')).toBeNull();
    expect(fromEnvelope('{"format":"roomboard-items/0","rbitem":"AQID"}')).toBeNull();
  });
  it("plus de 100 Mo décodés : too-big, sans décoder (borne passée en paramètre pour le test)", () => {
    expect(MAX_ITEMS_BYTES).toBe(100 * 1024 * 1024);
    expect(fromEnvelope('{"format":"roomboard-items/1","rbitem":"AAAAAAAA"}', 5)).toBe("too-big");
    expect(fromEnvelope('{"format":"roomboard-items/1","rbitem":"AAAAAAAA"}', 6)).toEqual(new Uint8Array(6));
  });
  it("espaces en tête tolérés", () => {
    expect(fromEnvelope(`  ${toEnvelope(bytes(9))}`)).toEqual(bytes(9));
  });
});

describe("presse-papiers (Z8)", () => {
  it("put : système écrit avec l'enveloppe, interne retenu, onChange appelé", async () => {
    const written: string[] = [];
    const cb = createClipboard({ write: async (t) => void written.push(await t) });
    const seen = vi.fn();
    cb.onChange(seen);
    expect(await cb.put(Promise.resolve(bytes(1)))).toBe("system");
    expect(written).toEqual([toEnvelope(bytes(1))]);
    expect(cb.last()).toEqual(bytes(1));
    expect(seen).toHaveBeenCalledTimes(1);
  });
  it("put : l'écriture système part avant que les octets soient prêts (geste)", () => {
    const write = vi.fn(async (_t: Promise<string>) => undefined);
    const cb = createClipboard({ write });
    void cb.put(new Promise<Uint8Array>(() => undefined));
    expect(write).toHaveBeenCalledTimes(1);
  });
  it("échec du système ou aucun système : interne seul", async () => {
    const failing = createClipboard({ write: async () => { throw new Error("refus"); } });
    expect(await failing.put(Promise.resolve(bytes(2)))).toBe("internal");
    expect(failing.last()).toEqual(bytes(2));
    expect(await createClipboard(null).put(Promise.resolve(bytes(3)))).toBe("internal");
  });
  it("octets en échec : put rejette, interne inchangé", async () => {
    const cb = createClipboard(null);
    await expect(cb.put(Promise.reject(new Error("vide")))).rejects.toThrow("vide");
    expect(cb.last()).toBeNull();
  });
  it("browserSystemClipboard : ClipboardItem text/plain, repli writeText, null sans presse-papiers", async () => {
    const items: unknown[] = [];
    class Item { constructor(readonly parts: Record<string, Promise<Blob>>) { items.push(parts); } }
    const write = vi.fn(async () => undefined);
    const sys = browserSystemClipboard({ clipboard: { write } }, Item as unknown as ClipboardItemCtor)!;
    await sys.write(Promise.resolve("x"));
    expect(write).toHaveBeenCalledTimes(1);
    expect(Object.keys(items[0] as object)).toEqual(["text/plain"]);
    const writeText = vi.fn(async (_t: string) => undefined);
    await browserSystemClipboard({ clipboard: { writeText } }, undefined)!.write(Promise.resolve("y"));
    expect(writeText).toHaveBeenCalledWith("y");
    expect(browserSystemClipboard({}, undefined)).toBeNull();
  });
});

describe("copie et coupe (Z8)", () => {
  it("copie dans une zone éditable : non prise", () => {
    const area = document.createElement("textarea");
    const sink = { hasSelection: () => true, copySelection: vi.fn(async () => undefined) };
    expect(handleCopy({ target: area }, sink, false)).toBeNull();
    expect(sink.copySelection).not.toHaveBeenCalled();
  });
  it("sans sélection : non prise ; avec : copySelection(cut)", async () => {
    const empty = { hasSelection: () => false, copySelection: vi.fn(async () => undefined) };
    expect(handleCopy({ target: document.body }, empty, false)).toBeNull();
    const sink = { hasSelection: () => true, copySelection: vi.fn(async (_c: boolean) => undefined) };
    await handleCopy({ target: document.body }, sink, true);
    expect(sink.copySelection).toHaveBeenCalledWith(true);
  });
});
```

Dans `paste.test.ts`, ajouter (importer `handlePaste`, `pastedItems` depuis `./paste`, `toEnvelope` depuis `./clipboard`) :

```ts
const withText = (text: string, ...f: File[]) => ({ files: f, getData: (t: string) => (t === "text/plain" ? text : "") });
const sinkOf = () => ({
  pasteItems: vi.fn(async (_i: Uint8Array | "newer" | "too-big") => true),
  importFiles: vi.fn(async () => undefined),
  pasteTable: vi.fn(async (_h: string) => false), // ignoré en branche B (champ en trop toléré par le type structurel)
});

describe("collage des objets (Z9)", () => {
  it("une enveloppe passe avant les images jointes", async () => {
    const sink = sinkOf();
    await handlePaste({ target: document.body, clipboardData: withText(toEnvelope(new Uint8Array([1, 2])), png) }, sink);
    expect(sink.pasteItems).toHaveBeenCalledWith(new Uint8Array([1, 2]));
    expect(sink.importFiles).not.toHaveBeenCalled();
  });
  it("enveloppe plus récente : pasteItems(\"newer\")", async () => {
    const sink = sinkOf();
    await handlePaste({ target: document.body, clipboardData: withText('{"format":"roomboard-items/9"}') }, sink);
    expect(sink.pasteItems).toHaveBeenCalledWith("newer");
  });
  it("texte ordinaire collé : ni objet ni image ; collage normal (null)", () => {
    const sink = sinkOf();
    expect(handlePaste({ target: document.body, clipboardData: withText("bonjour") }, sink)).toBeNull();
    expect(sink.pasteItems).not.toHaveBeenCalled();
  });
  it("cible éditable : null, rien de pris ; pastedItems null", () => {
    const area = document.createElement("textarea");
    const sink = sinkOf();
    const e = { target: area, clipboardData: withText(toEnvelope(new Uint8Array([1])), png) };
    expect(pastedItems(e)).toBeNull();
    expect(handlePaste(e, sink)).toBeNull();
  });
  it("images seules : importFiles(files, null)", async () => {
    const sink = sinkOf();
    await handlePaste({ target: document.body, clipboardData: files(png) }, sink);
    expect(sink.importFiles).toHaveBeenCalledTimes(1);
  });
});
```

(`vi` à importer depuis `vitest` ; `png`, `files` existent déjà dans le fichier. En branche A, si OD80 a déjà un test
« images seules », ne pas le dupliquer : garder le sien.)

- [ ] **Étape 2 : voir rouge.** Commande de la section.

- [ ] **Étape 3 : `clipboard.ts`.**

```ts
/**
 * Presse-papiers des objets (C3, Z8, U9, DAZ4) : enveloppe JSON `{format: "roomboard-items/1", rbitem: <base64>}` en
 * `text/plain` (HZ1-1), presse-papiers interne (un par fenêtre, partagé par les onglets) et système. L'écriture système
 * part pendant le geste (`ClipboardItem` avec promesse), repli `writeText` ; un échec laisse l'interne seul (HZ2-3).
 * Le format natif de la coque se branchera derrière `SystemClipboard` (DAZ4).
 */
import { isEditable } from "./paste";

export const ITEMS_FORMAT = "roomboard-items/1";
const FORMAT_PREFIX = "roomboard-items/";
const CURRENT = 1;
export const MAX_ITEMS_BYTES = 100 * 1024 * 1024;
export const NEWER_ITEMS_MESSAGE = "objets copiés par une version plus récente de RoomBoard : mettez RoomBoard à jour";
export const TOO_BIG_ITEMS_MESSAGE = "objets copiés trop gros (plus de 100 Mo)";
export const INTERNAL_ONLY_MESSAGE = "copié dans RoomBoard seulement";
export type ItemsRefusal = "newer" | "too-big";

const CHUNK = 0x8000;
const B64 = /^[A-Za-z0-9+/]*={0,2}$/;

export function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += CHUNK) s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(s);
}

export function fromBase64(text: string): Uint8Array | null {
  if (text.length % 4 !== 0 || !B64.test(text)) return null;
  let s: string;
  try {
    s = atob(text);
  } catch {
    return null;
  }
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function toEnvelope(rbitem: Uint8Array): string {
  return JSON.stringify({ format: ITEMS_FORMAT, rbitem: toBase64(rbitem) });
}

/** Octets du `.rbitem`, ou refus (`newer` : format plus récent ; `too-big` : plus de 100 Mo décodés), ou null (pas une enveloppe). */
export function fromEnvelope(text: string, max: number = MAX_ITEMS_BYTES): Uint8Array | ItemsRefusal | null {
  const t = text.trimStart();
  if (!t.startsWith("{") || !t.includes(`"${FORMAT_PREFIX}`)) return null;
  let v: unknown;
  try {
    v = JSON.parse(t);
  } catch {
    return null;
  }
  if (typeof v !== "object" || v === null || Array.isArray(v)) return null;
  const { format, rbitem } = v as Record<string, unknown>;
  if (typeof format !== "string" || !format.startsWith(FORMAT_PREFIX)) return null;
  const rest = format.slice(FORMAT_PREFIX.length);
  const n = /^\d+$/.test(rest) ? Number(rest) : Number.NaN;
  if (!Number.isInteger(n) || n < 1) return null;
  if (n > CURRENT) return "newer";
  if (typeof rbitem !== "string") return null;
  const pad = rbitem.endsWith("==") ? 2 : rbitem.endsWith("=") ? 1 : 0;
  if ((rbitem.length / 4) * 3 - pad > max) return "too-big";
  return fromBase64(rbitem);
}

export interface SystemClipboard {
  write(text: Promise<string>): Promise<void>;
}
export interface NavigatorLike {
  readonly clipboard?: { write?(items: ClipboardItem[]): Promise<void>; writeText?(text: string): Promise<void> };
}
export type ClipboardItemCtor = new (items: Record<string, Promise<Blob>>) => ClipboardItem;

export function browserSystemClipboard(
  nav: NavigatorLike,
  Item: ClipboardItemCtor | undefined = typeof ClipboardItem === "undefined" ? undefined : ClipboardItem,
): SystemClipboard | null {
  const cb = nav.clipboard;
  if (cb === undefined || (cb.write === undefined && cb.writeText === undefined)) return null;
  return {
    async write(text) {
      if (Item !== undefined && cb.write !== undefined) {
        try {
          await cb.write([new Item({ "text/plain": text.then((t) => new Blob([t], { type: "text/plain" })) })]);
          return;
        } catch (e) {
          if (cb.writeText === undefined) throw e;
        }
      }
      if (cb.writeText === undefined) throw new Error("presse-papiers système indisponible");
      await cb.writeText(await text);
    },
  };
}

export interface Clipboard {
  put(rbitem: Promise<Uint8Array>): Promise<"system" | "internal">;
  last(): Uint8Array | null;
  onChange(cb: () => void): () => void;
}

export function createClipboard(sys: SystemClipboard | null): Clipboard {
  let last: Uint8Array | null = null;
  const listeners = new Set<() => void>();
  return {
    put(rbitem) {
      // Écriture système lancée tout de suite, pendant le geste ; son issue n'est lue qu'une fois les octets prêts.
      const system: Promise<"system" | "internal"> =
        sys === null
          ? Promise.resolve("internal")
          : sys.write(rbitem.then(toEnvelope)).then(
              () => "system" as const,
              () => "internal" as const,
            );
      return rbitem.then(async (bytes) => {
        last = bytes;
        for (const cb of [...listeners]) cb();
        return system;
      });
    },
    last: () => last,
    onChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
  };
}

export interface CopyEventLike {
  readonly target: EventTarget | null;
}
export interface CopySink {
  hasSelection(): boolean;
  copySelection(cut: boolean): Promise<void>;
}

/** Corps des écouteurs `copy` et `cut` : pris hors cible éditable et avec une sélection ; null = copie native. */
export function handleCopy(e: CopyEventLike, sink: CopySink, cut: boolean): Promise<void> | null {
  if (isEditable(e.target) || !sink.hasSelection()) return null;
  return sink.copySelection(cut);
}
```

- [ ] **Étape 4 : `paste.ts`.** Commentaire d'en-tête : « Collage (R19, C3) : objets RoomBoard (enveloppe en
  `text/plain`, Z9) d'abord, puis fichiers `image/*` ; ignoré quand la cible est éditable ; texte ordinaire ignoré. »
  Importer `fromEnvelope`, `type ItemsRefusal` depuis `./clipboard` (import circulaire `clipboard.ts` ↔ `paste.ts` :
  fonctions seulement, sans effet au chargement ; acceptable). Branche B — `PasteEventLike.clipboardData` gagne
  `getData?(type: string): string` (commentaire d'OD80 recopié), puis :

```ts
/** Enveloppe d'objets RoomBoard dans `text/plain` (Z9) ; null sur une cible éditable ou sans enveloppe. */
export function pastedItems(e: PasteEventLike): Uint8Array | ItemsRefusal | null {
  if (isEditable(e.target)) return null;
  const text = e.clipboardData?.getData?.("text/plain") ?? "";
  return text === "" ? null : fromEnvelope(text);
}

/** Ce que le collage atteint : le workspace (`main.ts`), un faux dans les tests. */
export interface PasteSink {
  /** C3 (PC1) : objets dans l'onglet actif, ou refus à dire (version plus récente, trop gros) ; vrai si pris. */
  pasteItems(items: Uint8Array | ItemsRefusal): Promise<boolean>;
  importFiles(files: readonly DroppedFile[], at: null): Promise<unknown>;
}

/** Corps de l'écouteur `paste` (R19, C3, Z9) : objets RoomBoard, puis images. Null : collage non pris (cible éditable,
 *  rien à coller), le collage normal suit ; sinon l'appelant fait `preventDefault`. */
export function handlePaste(e: PasteEventLike, sink: PasteSink): Promise<void> | null {
  const items = pastedItems(e);
  if (items !== null) return sink.pasteItems(items).then(() => undefined);
  const files = pastedFiles(e);
  if (files.length === 0) return null;
  return sink.importFiles(files, null).then(() => undefined);
}
```

Branche A : `pastedItems` identique ; `pasteItems` ajouté en tête de `PasteSink` ; en tête du corps de `handlePaste`
d'OD80 : `const items = pastedItems(e); if (items !== null) return sink.pasteItems(items).then(() => undefined);`.

- [ ] **Étape 5 : voir vert ; commit.** `git add` un par un : `apps/web/src/platform/clipboard.ts`,
  `apps/web/src/platform/clipboard.test.ts`, `apps/web/src/platform/paste.ts`, `apps/web/src/platform/paste.test.ts` ;
  commit (G11) `feat(platform): clipboard envelope, internal and system clipboard, paste items first`. Rapport : branche
  suivie (A ou B).

---

### Tâche T7 — Port de fichiers typés (`typed-files.ts`), profils en instance texte

<a id="tache-t7"></a>

**Objectif.** Un port choisit et écrit un fichier d'un type donné (web : `<input type=file>` et téléchargement ; coque :
boîtes filtrées puis `plugin-fs`) ; `ProfileFiles` en devient une instance texte, sans changer son comportement
(cadrage Z11, DAZ4 ; S3).

**Fichiers.** Créer `apps/web/src/platform/typed-files.ts`, `apps/web/src/platform/typed-files.test.ts`. Modifier
`apps/web/src/platform/profile-files.ts` (garder `profile-files.test.ts` inchangé et vert).

**Interfaces.**
- Produit (lu par T15) :

```ts
export interface FileType {
  readonly extension: string; // ".rbprofile"
  readonly mime: string;
  readonly filter: { readonly name: string; readonly extensions: readonly string[] };
  readonly accept: string;
}
export interface TypedFiles {
  /** null : boîte annulée. Lève si la lecture échoue. */
  pick(): Promise<{ readonly name: string; readonly bytes: Uint8Array } | null>;
  /** faux : boîte annulée. Lève si l'écriture échoue. */
  save(name: string, bytes: Uint8Array): Promise<boolean>;
}
export function createWebTypedFiles(deps: Pick<FallbackDeps, "pickFile" | "download">, type: FileType): TypedFiles;
export function createTauriTypedFiles(dialog: Pick<TauriDialog, "open" | "save">, fs: TauriFs, type: FileType): TypedFiles;
// profile-files.ts : export const PROFILE_TYPE: FileType ; ProfileFiles, PROFILE_ACCEPT, PROFILE_FILTER, createWebProfileFiles, createTauriProfileFiles inchangés de signature
```

- Réutilise : `apps/web/src/platform/profile-files.ts:10-50` (`ProfileFiles`) — généralisé en `platform/typed-files.ts` ; `ProfileFiles` = enveloppe texte d'une instance (étendre, DAZ4).
- Réutilise : `apps/web/src/platform/host-repli.ts:23` (`FallbackDeps.pickFile`, `download`), `host-tauri.ts` (`baseName`, `TauriDialog`, `TauriFs`) — appelés tels quels.

**Test et commande bornée.**
`export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c3-groupes--T7 && pnpm install --frozen-lockfile >/dev/null && pnpm --filter @roomboard/web test -- src/platform/typed-files.test.ts src/platform/profile-files.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|Tests " | tail -30`
Attendu : 0 `×`, ≥ 5 `✓ fichiers typés (DAZ4) > …`, 6 `✓ ProfileFiles (C1, P25) > …`.

**Contraintes (recopiées).** G1 · G2 PATH, preuves bornées · G5 `profile-files.test.ts` non modifié · G6 · G7 commits
jejeasterix, anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, un par un, aucun push · G11.

**Interdits.** `FileHost` reste réservé au `.roomboard` (décision C1) : ne pas le toucher. Ne pas toucher `main.ts`.

**Terminé quand.** Tests verts, un commit `refactor(platform): typed files port, profile files as a text instance`.

**Étapes.**

- [ ] **Étape 1 : tests rouges.** `apps/web/src/platform/typed-files.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import { createTauriTypedFiles, createWebTypedFiles, type FileType } from "./typed-files";

const T: FileType = { extension: ".rbitem", mime: "application/x-roomboard-item", filter: { name: "Objet RoomBoard", extensions: ["rbitem"] }, accept: ".rbitem,application/x-roomboard-item" };
const b = (...x: number[]) => new Uint8Array(x);

describe("fichiers typés (DAZ4)", () => {
  it("web : pick passe l'accept du type et rend les octets", async () => {
    const pickFile = vi.fn(async (_a: string) => ({ name: "x.rbitem", bytes: b(1) }));
    expect(await createWebTypedFiles({ pickFile, download: vi.fn() }, T).pick()).toEqual({ name: "x.rbitem", bytes: b(1) });
    expect(pickFile).toHaveBeenCalledWith(T.accept);
  });
  it("web : save télécharge les octets avec le type MIME, rend vrai", async () => {
    const download = vi.fn();
    expect(await createWebTypedFiles({ pickFile: vi.fn(), download }, T).save("Sélection.rbitem", b(2))).toBe(true);
    expect(download).toHaveBeenCalledWith("Sélection.rbitem", b(2), T.mime);
  });
  it("coque : open filtré, nom = dernier segment", async () => {
    const dialog = { open: vi.fn(async () => "/home/u/x.rbitem"), save: vi.fn(async () => null) };
    const fs = { readFile: vi.fn(async () => b(3)), writeFile: vi.fn(async () => undefined) };
    expect(await createTauriTypedFiles(dialog, fs, T).pick()).toEqual({ name: "x.rbitem", bytes: b(3) });
    expect(dialog.open).toHaveBeenCalledWith({ multiple: false, directory: false, filters: [T.filter] });
  });
  it("coque : save au chemin choisi, defaultPath = nom proposé", async () => {
    const dialog = { open: vi.fn(async () => null), save: vi.fn(async () => "/home/u/Sélection.rbitem") };
    const fs = { readFile: vi.fn(async () => b()), writeFile: vi.fn(async (_p: string, _d: Uint8Array) => undefined) };
    expect(await createTauriTypedFiles(dialog, fs, T).save("Sélection.rbitem", b(4))).toBe(true);
    expect(dialog.save).toHaveBeenCalledWith({ defaultPath: "Sélection.rbitem", filters: [T.filter] });
    expect(fs.writeFile).toHaveBeenCalledWith("/home/u/Sélection.rbitem", b(4));
  });
  it("coque : boîtes annulées → null et faux, rien lu ni écrit", async () => {
    const dialog = { open: vi.fn(async (): Promise<string | null> => null), save: vi.fn(async (): Promise<string | null> => null) };
    const fs = { readFile: vi.fn(async () => b()), writeFile: vi.fn(async () => undefined) };
    const files = createTauriTypedFiles(dialog, fs, T);
    expect(await files.pick()).toBeNull();
    expect(await files.save("a", b())).toBe(false);
    expect(fs.readFile).not.toHaveBeenCalled();
    expect(fs.writeFile).not.toHaveBeenCalled();
  });
});
```

- [ ] **Étape 2 : voir rouge.** Commande de la section.

- [ ] **Étape 3 : `typed-files.ts`.**

```ts
/**
 * Port des fichiers typés (C3, DAZ4) : un type (extension, MIME, filtre, accept) ; web : `<input type=file>` et
 * téléchargement de l'hôte de repli ; coque : boîtes natives filtrées, lecture et écriture par `plugin-fs` au chemin
 * choisi. `FileHost` reste réservé au `.roomboard` (décision C1).
 */
import type { FallbackDeps } from "./host-repli";
import { baseName, type TauriDialog, type TauriFs } from "./host-tauri";

export interface FileType {
  readonly extension: string;
  readonly mime: string;
  readonly filter: { readonly name: string; readonly extensions: readonly string[] };
  readonly accept: string;
}

export interface TypedFiles {
  pick(): Promise<{ readonly name: string; readonly bytes: Uint8Array } | null>;
  save(name: string, bytes: Uint8Array): Promise<boolean>;
}

export function createWebTypedFiles(deps: Pick<FallbackDeps, "pickFile" | "download">, type: FileType): TypedFiles {
  return {
    async pick() {
      const f = await deps.pickFile(type.accept);
      return f === null ? null : { name: f.name, bytes: f.bytes };
    },
    async save(name, bytes) {
      deps.download(name, bytes, type.mime);
      return true;
    },
  };
}

export function createTauriTypedFiles(dialog: Pick<TauriDialog, "open" | "save">, fs: TauriFs, type: FileType): TypedFiles {
  return {
    async pick() {
      const path = await dialog.open({ multiple: false, directory: false, filters: [type.filter] });
      if (path === null) return null;
      return { name: baseName(path), bytes: await fs.readFile(path) };
    },
    async save(name, bytes) {
      const path = await dialog.save({ defaultPath: name, filters: [type.filter] });
      if (path === null) return false;
      await fs.writeFile(path, bytes);
      return true;
    },
  };
}
```

(Si le type de `filters` de `TauriDialog` refuse un tableau `readonly`, convertir à l'appel :
`filters: [{ name: type.filter.name, extensions: [...type.filter.extensions] }]`, et adapter l'attendu des tests à la
même forme ; vérifier d'abord avec `PROFILE_FILTER`, déjà `as const`.)

- [ ] **Étape 4 : `profile-files.ts`.** Garder `ProfileFiles`, `PROFILE_ACCEPT`, `PROFILE_FILTER` ; remplacer les deux
  fabriques :

```ts
import { createTauriTypedFiles, createWebTypedFiles, type FileType, type TypedFiles } from "./typed-files";

export const PROFILE_TYPE: FileType = { extension: PROFILE_EXTENSION, mime: PROFILE_MIME, filter: PROFILE_FILTER, accept: PROFILE_ACCEPT };

const asText = (files: TypedFiles): ProfileFiles => ({
  async pick() {
    const f = await files.pick();
    return f === null ? null : { name: f.name, text: decode(f.bytes) };
  },
  save: (name, text) => files.save(name, encode(text)),
});

export function createWebProfileFiles(deps: Pick<FallbackDeps, "pickFile" | "download">): ProfileFiles {
  return asText(createWebTypedFiles(deps, PROFILE_TYPE));
}

export function createTauriProfileFiles(dialog: Pick<TauriDialog, "open" | "save">, fs: TauriFs): ProfileFiles {
  return asText(createTauriTypedFiles(dialog, fs, PROFILE_TYPE));
}
```

Retirer l'import `baseName` devenu inutile ; mettre à jour le commentaire d'en-tête (« instance texte du port
`typed-files.ts` »).

- [ ] **Étape 5 : voir vert ; commit.** `git add` : `apps/web/src/platform/typed-files.ts`,
  `apps/web/src/platform/typed-files.test.ts`, `apps/web/src/platform/profile-files.ts` ; commit (G11)
  `refactor(platform): typed files port, profile files as a text instance`. Rapport : `Réutilisation : appelé
  profile-files.ts (généralisé), host-repli, host-tauri`.

---

### Tâche T8 — Lecture et écriture des conteneurs en un module (`container-io.ts`)

<a id="tache-t8"></a>

**Objectif.** `encodeTab` et `readDocument` quittent `workspace.ts` pour `app/container-io.ts`, sans changer de
comportement pour un document, et servent aussi le fragment : sans asset cité, ZIP du cœur (second module jamais chargé) ;
avec assets, parties du cœur puis `ContainerCodec.write` ; lecture par `ContainerCodec.read`, repli par le cœur seul si
le module manque (cadrage Z6, Z12, DAZ3 ; S3, S4).

**Fichiers.** Créer `apps/web/src/app/container-io.ts`, `apps/web/src/app/container-io.test.ts`. Modifier
`apps/web/src/app/workspace.ts` (l. 147-210 : `typed`, `missingOf`, `encodeTab`, `readDocument` remplacés par un
`ContainerIO` ; `CODEC_FALLBACK_MESSAGE` réexporté).

**Interfaces.**
- Produit (lu par T14, T15) :

```ts
export const CODEC_FALLBACK_MESSAGE = "images non lues : le module des images ne s'est pas chargé";
export type EncodeAs = { readonly kind: "document" } | { readonly kind: "fragment"; readonly name: string };
export type ReadKind = "document" | "fragment";
export interface ReadResult { readonly doc: CoreDocument; readonly assets: AssetStore; readonly unread: boolean }
export interface ContainerIODeps {
  readonly core: CoreFactory;
  readonly codec: ContainerCodec;
  say(message: string): Promise<void>;
  makeAssets(): AssetStore;
}
export interface ContainerIO {
  encode(doc: CoreDocument, assets: AssetStore, now: string, appVersion: string, as: EncodeAs): Promise<Uint8Array>;
  read(name: string, bytes: Uint8Array, kind: ReadKind): Promise<ReadResult | null>;
}
export function createContainerIO(deps: ContainerIODeps): ContainerIO;
export function typed(blob: Blob, mime: string | undefined): Blob;
export function missingOf(doc: CoreDocument, assets: AssetStore): string[];
```

- Consomme (T4, types seulement) : `CoreDocument.saveFragment`, `saveFragmentParts`, `CoreFactory.loadFragment`,
  `loadFragmentParts`. Les tests de cette tâche les fournissent par des doublures ; `tsc` dans ce worktree : écart nommé
  (fermé par la fusion de T4).
- Réutilise : `apps/web/src/app/workspace.ts:161-169` (`encodeTab`), `:172-210` (`readDocument`) ; `apps/web/src/platform/container.ts:29-35` (`ContainerCodec`) — déplacés dans `app/container-io.ts` avec `createContainerIO(deps)`, `ContainerIO.encode(…, as)`, `ContainerIO.read(name, bytes, kind)` (étendre, DAZ3).
- Réutilise : `apps/web/src/app/workspace.ts:151` (`typed`) — part avec `container-io.ts` et devient exporté (PC6 : `image-import.ts` ne l'appelle pas).
- Réutilise : `apps/web/src/core/asset-store.ts:19` (`adopt`), `pick` — tels quels.

**Test et commande bornée.**
`export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c3-groupes--T8 && pnpm install --frozen-lockfile >/dev/null && pnpm --filter @roomboard/web test -- src/app/container-io.test.ts src/app/workspace.test.ts src/platform/container.contract.test.ts --reporter=verbose 2>&1 | grep -E "container-io|conteneurs|×|Test Files|Tests " | tail -30`
Attendu : 0 `×`, ≥ 8 `✓ … conteneurs (DAZ3) > …` ; `workspace.test.ts` et `container.contract.test.ts` sans échec
(ligne `Test Files  3 passed`).

**Contraintes (recopiées).** G1 · G2 PATH, preuves bornées, `pnpm install --frozen-lockfile` · G5 `workspace.test.ts`
non affaibli (même comportement : il reste vert sans changement) · G6 · G7 commits jejeasterix, anglais,
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, un par un, aucun push · G8 un document sans image s'écrit
toujours par `doc.save` (mêmes octets, garde `compat_socle`) · G10 · G11.

**Interdits.** Ne pas changer un message dit à l'utilisateur ni l'ordre des contrôles de `readDocument`. Ne pas toucher
`image-import.ts`, `controller.ts`, `fragments.ts`.

**Terminé quand.** Tests verts, `workspace.ts` n'a plus de corps `encodeTab` ni `readDocument`, un commit
`refactor(app): container io module for documents and fragments`.

**Étapes.**

- [ ] **Étape 1 : tests rouges.** `apps/web/src/app/container-io.test.ts` :

```ts
// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import type { CoreDocument, CoreFactory } from "../core/api";
import { createAssetStore } from "../core/asset-store";
import { CodecUnavailableError, type ContainerCodec } from "../platform/container";
import { CODEC_FALLBACK_MESSAGE, createContainerIO } from "./container-io";

const ID = "ab".repeat(32);
const hasher = async (): Promise<string> => ID;
const u8 = (...b: number[]) => new Uint8Array(b);

/** Doublure de document : enregistre les appels ; `cited` = assets cités. */
function docStub(cited: string[] = []) {
  const calls: string[] = [];
  const d = {
    citedAssets: () => cited.map((id) => ({ id, name: "a.png", mime: "image/png", size: 3 })),
    asset: (id: string) => (cited.includes(id) ? { id, name: "a.png", mime: "image/png", size: 3 } : null),
    save: (n: string, v: string) => (calls.push(`save ${n} ${v}`), u8(1)),
    saveParts: () => (calls.push("saveParts"), [u8(2), u8(3)] as const),
    saveFragment: (n: string, v: string, name: string) => (calls.push(`saveFragment ${name}`), u8(4)),
    saveFragmentParts: (_n: string, _v: string, name: string) => (calls.push(`saveFragmentParts ${name}`), [u8(5), u8(6)] as const),
    free: vi.fn(),
  } as unknown as CoreDocument;
  return { d, calls };
}
function coreStub(doc: CoreDocument) {
  const calls: string[] = [];
  const core = {
    load: (b: Uint8Array) => (calls.push(`load ${b.length}`), doc),
    loadParts: () => (calls.push("loadParts"), doc),
    loadFragment: (b: Uint8Array) => (calls.push(`loadFragment ${b.length}`), doc),
    loadFragmentParts: () => (calls.push("loadFragmentParts"), doc),
  } as unknown as CoreFactory;
  return { core, calls };
}
const codecOk = (assets: [string, Blob][] = []): ContainerCodec => ({
  read: vi.fn(async () => ({ manifest: u8(9), ybin: u8(8), assets, warnings: [] })),
  write: vi.fn(async () => u8(7)),
});
const codecDown: ContainerCodec = {
  read: async () => { throw new CodecUnavailableError(new Error("absent")); },
  write: async () => { throw new CodecUnavailableError(new Error("absent")); },
};
function io(core: CoreFactory, codec: ContainerCodec, said: string[] = []) {
  return createContainerIO({ core, codec, say: async (m) => void said.push(m), makeAssets: () => createAssetStore(hasher) });
}

describe("conteneurs (DAZ3)", () => {
  it("document sans asset : doc.save, codec jamais appelé", async () => {
    const { d, calls } = docStub();
    const codec = codecOk();
    expect(await io(coreStub(d).core, codec).encode(d, createAssetStore(hasher), "n", "v", { kind: "document" })).toEqual(u8(1));
    expect(calls).toEqual(["save n v"]);
    expect(codec.write).not.toHaveBeenCalled();
  });
  it("document avec asset : saveParts puis codec.write avec les octets du magasin", async () => {
    const { d, calls } = docStub([ID]);
    const assets = createAssetStore(hasher);
    assets.adopt(ID, new Blob([u8(1, 2, 3)], { type: "image/png" }));
    const codec = codecOk();
    expect(await io(coreStub(d).core, codec).encode(d, assets, "n", "v", { kind: "document" })).toEqual(u8(7));
    expect(calls).toEqual(["saveParts"]);
    expect(vi.mocked(codec.write).mock.calls[0]![2].map((a) => [a.id, a.mime])).toEqual([[ID, "image/png"]]);
  });
  it("fragment sans asset : saveFragment(name)", async () => {
    const { d, calls } = docStub();
    expect(await io(coreStub(d).core, codecOk()).encode(d, createAssetStore(hasher), "n", "v", { kind: "fragment", name: "Sélection" })).toEqual(u8(4));
    expect(calls).toEqual(["saveFragment Sélection"]);
  });
  it("fragment avec asset : saveFragmentParts(name) puis codec.write", async () => {
    const { d, calls } = docStub([ID]);
    const assets = createAssetStore(hasher);
    assets.adopt(ID, new Blob([u8(1)]));
    expect(await io(coreStub(d).core, codecOk()).encode(d, assets, "n", "v", { kind: "fragment", name: "x" })).toEqual(u8(7));
    expect(calls).toEqual(["saveFragmentParts x"]);
  });
  it("lecture d'un document : codec.read puis loadParts, assets adoptés et typés", async () => {
    const { d } = docStub([ID]);
    const { core, calls } = coreStub(d);
    const r = await io(core, codecOk([[ID, new Blob([u8(1)])]])).read("a.roomboard", u8(1), "document");
    expect(calls).toEqual(["loadParts"]);
    expect(r?.unread).toBe(false);
    expect(r?.assets.get(ID)?.type).toBe("image/png");
  });
  it("lecture d'un fragment : loadFragmentParts", async () => {
    const { d } = docStub();
    const { core, calls } = coreStub(d);
    expect(await io(core, codecOk()).read("x.rbitem", u8(1), "fragment")).not.toBeNull();
    expect(calls).toEqual(["loadFragmentParts"]);
  });
  it("module indisponible : repli load / loadFragment ; images citées : unread et message", async () => {
    const said: string[] = [];
    const { d } = docStub([ID]);
    const { core, calls } = coreStub(d);
    const r = await io(core, codecDown, said).read("a.roomboard", u8(1, 2), "document");
    expect(calls).toEqual(["load 2"]);
    expect(r?.unread).toBe(true);
    expect(said).toEqual([`a.roomboard : ${CODEC_FALLBACK_MESSAGE}`]);
    const f = await io(coreStub(docStub().d).core, codecDown).read("x.rbitem", u8(1, 2, 3), "fragment");
    expect(f?.unread).toBe(false);
  });
  it("fichier refusé par le cœur : message « Ouverture impossible », null", async () => {
    const said: string[] = [];
    const core = { loadParts: () => { throw new Error("refus du cœur"); }, loadFragmentParts: () => { throw new Error("refus du cœur"); } } as unknown as CoreFactory;
    expect(await io(core, codecOk(), said).read("x.rbitem", u8(1), "fragment")).toBeNull();
    expect(said).toEqual(["Ouverture impossible (x.rbitem) : refus du cœur"]);
  });
});
```

- [ ] **Étape 2 : voir rouge.** Commande de la section (module `./container-io` introuvable).

- [ ] **Étape 3 : `container-io.ts`** (corps repris de `workspace.ts:147-210`, comportement inchangé pour un document) :

```ts
/**
 * Conteneurs (C3, DAZ3) : écriture et lecture d'un `.roomboard` ou d'un `.rbitem`, décidées à chaque appel. Sans asset
 * cité : ZIP du cœur (`save` / `saveFragment`), second module jamais chargé (garde `compat_socle`) ; avec assets :
 * parties du cœur puis `ContainerCodec.write`. Lecture par le conteneur, repli par le cœur seul (R7). Repris de
 * `workspace.ts` (`encodeTab`, `readDocument`) sans changement de comportement.
 */
import type { CoreDocument, CoreFactory } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import { CodecUnavailableError, type ContainerCodec, type ContainerContents } from "../platform/container";
import { messageOf } from "../platform/controller";

/** Repli R7 : le module du conteneur ne s'est pas chargé, le document s'ouvre par le cœur seul. */
export const CODEC_FALLBACK_MESSAGE = "images non lues : le module des images ne s'est pas chargé";

export type EncodeAs = { readonly kind: "document" } | { readonly kind: "fragment"; readonly name: string };
export type ReadKind = "document" | "fragment";
export interface ReadResult {
  readonly doc: CoreDocument;
  readonly assets: AssetStore;
  readonly unread: boolean;
}
export interface ContainerIODeps {
  readonly core: CoreFactory;
  readonly codec: ContainerCodec;
  say(message: string): Promise<void>;
  makeAssets(): AssetStore;
}
export interface ContainerIO {
  encode(doc: CoreDocument, assets: AssetStore, now: string, appVersion: string, as: EncodeAs): Promise<Uint8Array>;
  read(name: string, bytes: Uint8Array, kind: ReadKind): Promise<ReadResult | null>;
}

export const typed = (blob: Blob, mime: string | undefined): Blob =>
  mime !== undefined && mime !== "" && mime !== blob.type ? new Blob([blob], { type: mime }) : blob;

export const missingOf = (doc: CoreDocument, assets: AssetStore): string[] =>
  assets.pick(doc.citedAssets().map((a) => a.id)).missing;

export function createContainerIO(deps: ContainerIODeps): ContainerIO {
  const { core, codec, say } = deps;
  return {
    async encode(doc, assets, now, appVersion, as) {
      const cited = doc.citedAssets();
      if (cited.length === 0) {
        return as.kind === "document" ? doc.save(now, appVersion) : doc.saveFragment(now, appVersion, as.name);
      }
      const [manifest, ybin] = as.kind === "document" ? doc.saveParts(now, appVersion) : doc.saveFragmentParts(now, appVersion, as.name);
      const mimeOf = new Map(cited.map((a) => [a.id, a.mime]));
      const { present } = assets.pick(cited.map((a) => a.id));
      return codec.write(manifest, ybin, present.map(([id, blob]) => ({ id, mime: mimeOf.get(id) ?? blob.type, blob })));
    },
    async read(name, bytes, kind) {
      const assets = deps.makeAssets();
      let contents: ContainerContents;
      try {
        contents = await codec.read(new Blob([bytes as BlobPart]) /* le Blob copie déjà les octets */);
      } catch (e) {
        if (!(e instanceof CodecUnavailableError)) {
          await say(`Ouverture impossible (${name}) : ${messageOf(e)}`);
          return null;
        }
        let doc: CoreDocument;
        try {
          doc = kind === "document" ? core.load(bytes) : core.loadFragment(bytes);
        } catch (e2) {
          await say(`Ouverture impossible (${name}) : ${messageOf(e2)}`);
          return null;
        }
        const unread = doc.citedAssets().length > 0;
        if (unread) await say(`${name} : ${CODEC_FALLBACK_MESSAGE}`);
        return { doc, assets, unread };
      }
      let doc: CoreDocument;
      try {
        doc = kind === "document" ? core.loadParts(contents.manifest, contents.ybin) : core.loadFragmentParts(contents.manifest, contents.ybin);
      } catch (e) {
        await say(`Ouverture impossible (${name}) : ${messageOf(e)}`);
        return null;
      }
      try {
        for (const [id, blob] of contents.assets) assets.adopt(id, typed(blob, doc.asset(id)?.mime));
      } catch (e) {
        doc.free();
        await say(`Ouverture impossible (${name}) : ${messageOf(e)}`);
        return null;
      }
      if (contents.warnings.length > 0) await say(`${name} : ${contents.warnings.join(" ; ")}`);
      // un asset cité mais ignoré par le conteneur (trop gros…) : marqué, Enregistrer refusé (R30)
      return { doc, assets, unread: missingOf(doc, assets).length > 0 };
    },
  };
}
```

- [ ] **Étape 4 : `workspace.ts`.** Supprimer `typed`, `missingOf`, `encodeTab`, `readDocument` et la constante
  `CODEC_FALLBACK_MESSAGE` locale ; ajouter `export { CODEC_FALLBACK_MESSAGE } from "./container-io";` et importer
  `createContainerIO`, `missingOf`. Après `makeAssets` :

```ts
  const io = createContainerIO({ core, codec: deps.codec, say, makeAssets });
```

Remplacer les appels : `encode: (now, appVersion) => io.encode(board.doc, assets, now, appVersion, { kind: "document" })`
dans `addTab` ; dans `openDocument`, `const read = await io.read(name, file.bytes, "document");`. Retirer les imports
devenus inutiles (`CodecUnavailableError`, `ContainerContents`).

- [ ] **Étape 5 : voir vert ; commit.** `git add` : `apps/web/src/app/container-io.ts`,
  `apps/web/src/app/container-io.test.ts`, `apps/web/src/app/workspace.ts` ; commit (G11)
  `refactor(app): container io module for documents and fragments`. Rapport : `Réutilisation : appelé encodeTab et
  readDocument (déplacés), ContainerCodec, AssetStore.adopt` et `Réutilisation : écart — typed exporté mais non appelé
  par image-import.ts (PC6)`.

---

### Tâche T9 — Barre : rangée « Sélection », action « Insérer des pages… », hôte de la barre

<a id="tache-t9"></a>

**Objectif.** Une rangée contextuelle « Sélection » (outil Sélection actif) porte cinq boutons — Grouper, Dégrouper,
Copier, Coller, Exporter — désactivés selon l'état ; « Insérer des pages… » entre au catalogue (`page-insert-file`) et
dans la barre des pages du profil par défaut ; l'hôte de la barre relaie `selection(a)` et `insertPages()` (cadrage Z13,
HZ1-4 ; S1, S2, S4).

**Fichiers.** Créer `apps/web/src/ui/SelectionRow.tsx`, `apps/web/src/ui/SelectionRow.test.tsx`. Modifier
`apps/web/src/ui/item-state.ts` (`ToolbarView` l. 6-17), `apps/web/src/ui/Toolbar.tsx` (l. 159-163),
`apps/web/src/ui/Toolbar.test.tsx` (l. 25, doublure de l'hôte), `apps/web/src/toolbar.ts` (`ACTION_TABLE` l. 98-119),
`apps/web/src/toolbar.test.ts` (l. 168), `apps/web/src/toolbar-profiles.ts` (`pagesBar` l. 24-39),
`apps/web/src/toolbar-profiles.test.ts` (l. 38), `apps/web/src/ui/PagesBar.test.tsx` (seulement si un de ses tests lit
la barre du profil par défaut), `apps/web/src/profile-edit.test.ts` (l. 84), `apps/web/src/app/toolbar-host.ts`,
`apps/web/src/app/toolbar-host.test.ts`.

**Interfaces.**
- Produit (lu par T15) :

```ts
// app/toolbar-host.ts
export type SelectionAction = "group" | "ungroup" | "copy" | "paste" | "export";
export interface ToolbarHost { …; /** C3 (Z13) : bouton de la rangée Sélection. */ selection(a: SelectionAction): void }
export interface HostTargets { …; /** C3 (Z12). */ insertPages(): void; /** C3 (Z13). */ selection(a: SelectionAction): void }
ACTIONS["page-insert-file"] = (t) => t.insertPages();
// ui/item-state.ts, ToolbarView gagne (tous facultatifs) :
readonly selection?: readonly string[];
readonly selectionUnits?: number;
readonly selectionGrouped?: boolean;
readonly canPaste?: boolean;
// ui/SelectionRow.tsx
export const SELECTION_ACTIONS: readonly { readonly id: SelectionAction; readonly label: string }[];
export function selectionDisabled(a: SelectionAction, v: ToolbarView): boolean;
export function SelectionRow(props: { view: Accessor<ToolbarView>; host: ToolbarHost }): JSX.Element;
// toolbar.ts : ACTION_TABLE["page-insert-file"] = { label: "Insérer des pages…" } (après "page-remove", PC11)
```

- Réutilise : `apps/web/src/ui/Toolbar.tsx:112` (`TableActionRow`), `ui/FormatRow.tsx` — patron de la rangée contextuelle ; composant voisin `SelectionRow(props: { view: Accessor<ToolbarView>; host: ToolbarHost }): JSX.Element` ; `ToolbarHost.selection(a: SelectionAction): void` (nouveau module `ui/SelectionRow.tsx`).
- Réutilise : `apps/web/src/toolbar.ts:98` (`ACTION_TABLE`), `apps/web/src/app/toolbar-host.ts:27` (`ACTIONS`), `apps/web/src/toolbar-profiles.ts:24` (`pagesBar`) — entrée `page-insert-file` (étendre).

**Test et commande bornée.**
`export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c3-groupes--T9 && pnpm install --frozen-lockfile >/dev/null && pnpm --filter @roomboard/web test -- src/ui src/app/toolbar-host.test.ts src/toolbar-profiles.test.ts src/toolbar.test.ts src/profile-edit.test.ts --reporter=verbose 2>&1 | grep -E "Sélection|C3|×|Test Files|Tests " | tail -40`
Attendu : 0 `×`, ≥ 5 `✓ rangée Sélection (Z13) > …`, ≥ 2 `✓ hôte de la barre : C3 > …`, ≥ 1 `✓ … rangée Sélection dans la barre d'outils`,
aucune ligne `failed`.

**Contraintes (recopiées).** G1 · G2 PATH, preuves bornées, `pnpm install --frozen-lockfile` · G5 tests adaptés gardent
leur intention (liste du profil par défaut : une entrée de plus) · G6 · G7 commits jejeasterix, anglais,
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, un par un, aucun push · G10 libellés français · G11.

**Interdits.** La rangée n'entre pas au catalogue de l'éditeur de profils (C7b R13) : aucune entrée `group`, `copy`…
dans `ACTION_TABLE`. Ne pas toucher `App.tsx` (T15), `engine.ts` (T13). Pas de nouvelle icône ni de CSS (classes
existantes `rb-sep`).

**Terminé quand.** Tests verts, un commit `feat(ui): selection row, insert pages action, toolbar host targets`.

**Étapes.**

- [ ] **Étape 1 : tests rouges.** `apps/web/src/ui/SelectionRow.test.tsx` :

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ToolbarHost } from "../app/toolbar-host";
import type { ToolbarView } from "./item-state";
import { SELECTION_ACTIONS, SelectionRow } from "./SelectionRow";

afterEach(cleanup);
const base: ToolbarView = { tool: "select", eraserMode: "partial", canUndo: false, canRedo: false, pageIndex: 0, pageCount: 1 };
const btn = (c: HTMLElement, id: string): HTMLButtonElement | null => c.querySelector(`[data-selection-action="${id}"]`);
function setup(v: ToolbarView) {
  const [view, setView] = createSignal(v);
  const selection = vi.fn();
  const host = { selection } as unknown as ToolbarHost;
  const { container } = render(() => <SelectionRow view={view} host={host} />);
  return { container, setView, selection };
}

describe("rangée Sélection (Z13)", () => {
  it("montrée avec l'outil Sélection seulement, cinq boutons dans l'ordre", () => {
    const { container, setView } = setup({ ...base, tool: "pen" });
    expect(container.querySelectorAll("[data-selection-action]")).toHaveLength(0);
    setView({ ...base });
    const ids = [...container.querySelectorAll("[data-selection-action]")].map((b) => [b.getAttribute("data-selection-action"), b.textContent]);
    expect(ids).toEqual([["group", "Grouper"], ["ungroup", "Dégrouper"], ["copy", "Copier"], ["paste", "Coller"], ["export", "Exporter"]]);
    expect(SELECTION_ACTIONS.map((a) => a.id)).toEqual(["group", "ungroup", "copy", "paste", "export"]);
  });
  it("Grouper : désactivé sous deux unités", () => {
    const { container, setView } = setup({ ...base, selection: ["a"], selectionUnits: 1 });
    expect(btn(container, "group")!.disabled).toBe(true);
    setView({ ...base, selection: ["a", "b"], selectionUnits: 2 });
    expect(btn(container, "group")!.disabled).toBe(false);
  });
  it("Dégrouper : désactivé sans groupe dans la sélection", () => {
    const { container, setView } = setup({ ...base, selection: ["a"], selectionUnits: 1, selectionGrouped: false });
    expect(btn(container, "ungroup")!.disabled).toBe(true);
    setView({ ...base, selection: ["a"], selectionUnits: 1, selectionGrouped: true });
    expect(btn(container, "ungroup")!.disabled).toBe(false);
  });
  it("Copier, Exporter : désactivés sans sélection ; Coller : désactivé sans presse-papiers interne", () => {
    const { container, setView } = setup({ ...base });
    expect([btn(container, "copy")!.disabled, btn(container, "export")!.disabled, btn(container, "paste")!.disabled]).toEqual([true, true, true]);
    setView({ ...base, selection: ["a"], canPaste: true });
    expect([btn(container, "copy")!.disabled, btn(container, "export")!.disabled, btn(container, "paste")!.disabled]).toEqual([false, false, false]);
  });
  it("clic : host.selection(id)", () => {
    const { container, selection } = setup({ ...base, selection: ["a", "b"], selectionUnits: 2, canPaste: true });
    for (const id of ["group", "copy", "paste", "export"]) fireEvent.click(btn(container, id)!);
    expect(selection.mock.calls.map((c) => c[0])).toEqual(["group", "copy", "paste", "export"]);
  });
});
```

Dans `apps/web/src/app/toolbar-host.test.ts` : la doublure `t` de `setup` (l. 12) gagne
`insertPages: vi.fn(), selection: vi.fn()` ; ajouter :

```ts
describe("hôte de la barre : C3", () => {
  it("page-insert-file → insertPages()", () => {
    const { t, host } = setup();
    host.runAction("page-insert-file");
    expect(vi.mocked((t as unknown as { insertPages: () => void }).insertPages)).toHaveBeenCalledTimes(1);
    expect(Object.hasOwn(ACTIONS, "page-insert-file")).toBe(true);
    expect(ACTION_TABLE["page-insert-file"]?.label).toBe("Insérer des pages…");
  });
  it("selection(a) relayée telle quelle", () => {
    const { t, host } = setup();
    host.selection("ungroup");
    host.selection("export");
    expect(vi.mocked((t as unknown as { selection: (a: string) => void }).selection).mock.calls).toEqual([["ungroup"], ["export"]]);
  });
});
```

Dans `apps/web/src/ui/Toolbar.test.tsx` : la doublure `host` (l. 25) gagne `selection: vi.fn()` ; ajouter dans
`describe("Toolbar", …)` :

```tsx
  it("rangée Sélection dans la barre d'outils : outil Sélection seulement (C3)", () => {
    const { container, setV } = setup();
    expect(container.querySelectorAll("[data-selection-action]")).toHaveLength(0);
    setV({ ...VIEW, tool: "select" });
    expect(container.querySelectorAll("[data-selection-action]")).toHaveLength(5);
  });
```
`toolbar-profiles.test.ts:38` : ajouter `"page-insert-file"` à la liste. `toolbar.test.ts:168` : ajouter
`"page-insert-file"`. `profile-edit.test.ts:84` : attendu
`["page-prev", "page-next", "page-add", "page-remove", "page-insert-file"]`.

- [ ] **Étape 2 : voir rouge.** Commande de la section.

- [ ] **Étape 3 : `toolbar-host.ts`.** Ajouter `export type SelectionAction = …` ; `ToolbarHost.selection` ;
  `HostTargets.insertPages`, `HostTargets.selection` ; `"page-insert-file": (t) => t.insertPages(),` dans `ACTIONS`
  (après `"page-remove"`) ; dans `createLocalToolbarHost` : `selection: (a) => t.selection(a),`.

- [ ] **Étape 4 : `item-state.ts`.** Champs facultatifs de « Interfaces » dans `ToolbarView`, chacun avec son
  commentaire `/** C3 (Z13) … */`.

- [ ] **Étape 5 : `SelectionRow.tsx`.**

```tsx
/** Rangée « Sélection » (C3, Z13, HZ1-4) : outil Sélection actif ; cinq actions, hors catalogue des profils (C7b R13). */
import { For, Show, type Accessor, type JSX } from "solid-js";
import type { SelectionAction, ToolbarHost } from "../app/toolbar-host";
import { TOOL_TABLE } from "../toolbar";
import type { ToolbarView } from "./item-state";

export const SELECTION_ACTIONS: readonly { readonly id: SelectionAction; readonly label: string }[] = Object.freeze([
  { id: "group", label: "Grouper" },
  { id: "ungroup", label: "Dégrouper" },
  { id: "copy", label: "Copier" },
  { id: "paste", label: "Coller" },
  { id: "export", label: "Exporter" },
]);

export function selectionDisabled(a: SelectionAction, v: ToolbarView): boolean {
  const n = v.selection?.length ?? 0;
  switch (a) {
    case "group":
      return (v.selectionUnits ?? 0) < 2;
    case "ungroup":
      return v.selectionGrouped !== true;
    case "copy":
    case "export":
      return n === 0;
    case "paste":
      return v.canPaste !== true;
  }
}

export function SelectionRow(props: { view: Accessor<ToolbarView>; host: ToolbarHost }): JSX.Element {
  return (
    <Show when={props.view().tool === TOOL_TABLE["select"]?.choice}>
      <span class="rb-sep" role="separator" data-selection-sep />
      <For each={SELECTION_ACTIONS}>
        {(a) => (
          <button type="button" data-selection-action={a.id} disabled={selectionDisabled(a.id, props.view())} onClick={() => props.host.selection(a.id)}>
            {a.label}
          </button>
        )}
      </For>
    </Show>
  );
}
```

- [ ] **Étape 6 : `Toolbar.tsx`.** Importer `SelectionRow` ; dans le `<Show when={props.bar.role === "tools"}>`, après
  `<TableActionRow … />` : `<SelectionRow view={props.view} host={props.host} />`.

- [ ] **Étape 7 : catalogue et profil.** `toolbar.ts`, `ACTION_TABLE` après `"page-remove"` :
  `"page-insert-file": { label: "Insérer des pages…" },`. `toolbar-profiles.ts`, `pagesBar`, après
  `action("page-remove", "Retirer la page")` : `action("page-insert-file", "Insérer des pages…"),`.

- [ ] **Étape 8 : voir vert ; commit.** `git add` un par un chaque fichier modifié ou créé de la section ; commit (G11)
  `feat(ui): selection row, insert pages action, toolbar host targets`.

---

### Tâche T10 — Import : `.rbitem` reconnu (nom et en-tête ZIP), filtre « Importer »

<a id="tache-t10"></a>

**Objectif.** Le registre d'import gagne l'entrée `rbitem` (nature `objet`) : nom en `.rbitem` **et** en-tête ZIP
`PK\x03\x04` ; le fichier est remis à un `insertItems` fourni par l'espace de travail, avec le point de dépôt ;
« Importer » propose `.rbitem` (cadrage Z10, U25, DAU5 ; S3, S5).

**Fichiers.** Modifier `apps/web/src/platform/import.ts` (`ImportDeps` l. 26, registre l. 88),
`apps/web/src/platform/import.test.ts`, `apps/web/src/platform/files.ts` (constantes l. 6-9, `IMPORT_EXTENSIONS` l. 66),
`apps/web/src/platform/files.test.ts` (l. 65), `apps/web/src/platform/host-fsa.ts` (`IMPORT_TYPES` l. 35),
`apps/web/src/platform/host-fsa.test.ts`, `apps/web/src/platform/host-repli.test.ts` et
`apps/web/src/platform/host-tauri.test.ts` (l. 226 ; à garder verts, à adapter seulement s'ils listent les extensions
en dur — ils lisent `IMPORT_ACCEPT` et `IMPORT_FILTER` aujourd'hui).

**Interfaces.**
- Produit (lu par T15) :

```ts
// files.ts
export const RBITEM_EXTENSION = ".rbitem";
export const RBITEM_MIME = "application/x-roomboard-item";
export const IMPORT_EXTENSIONS = ["roomboard", "rbitem", "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg", "avif", "heic", "heif"] as const;
// import.ts
export function isRbitemName(name: string): boolean;
export function rbitemHandler(deps: { insert(rbitem: Blob, name: string, at: Point | null): Promise<boolean> }): ImportHandler;
export interface ImportDeps { …; /** C3 (Z10) : objet RoomBoard inséré dans l'onglet actif ; absent : `.rbitem` refusé. */ insertItems?(rbitem: Blob, name: string, at: Point | null): Promise<boolean> }
```

- Réutilise : `apps/web/src/platform/import.ts:59-64` (`ImportHandler`), `:88` (registre) — `rbitemHandler(deps: { insert(rbitem: Blob, name: string, at: Point | null): Promise<boolean> }): ImportHandler` (étendre).
- Réutilise : `apps/web/src/platform/files.ts:6-9`, `:66-67` (`IMPORT_EXTENSIONS`, `IMPORT_FILTER`) — `rbitem` importable (étendre).

**Test et commande bornée.**
`export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c3-groupes--T10 && pnpm install --frozen-lockfile >/dev/null && pnpm --filter @roomboard/web test -- src/platform --reporter=verbose 2>&1 | grep -E "rbitem|×|Test Files|Tests " | tail -30`
Attendu : 0 `×`, ≥ 5 `✓ … import d'un objet .rbitem (Z10) > …`, ≥ 1 `✓ … rbitem` dans `files.test.ts` ou
`host-fsa.test.ts`, aucun fichier en échec dans `src/platform`.

**Contraintes (recopiées).** G1 · G2 PATH, preuves bornées, `pnpm install --frozen-lockfile` · G5 test du filtre adapté
(une extension de plus, même intention) · G6 · G7 commits jejeasterix, anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`,
un par un, aucun push · G10 · G11.

**Interdits.** Un `.rbitem` n'ouvre jamais d'onglet ; un `.roomboard` déposé n'insère jamais de pages (Q1). Ne pas
toucher `workspace.ts` (T8, T15). Ne lire le fichier en entier qu'une fois reconnu (OD56).

**Terminé quand.** Tests verts, un commit `feat(platform): rbitem import handler and import filter`.

**Étapes.**

- [ ] **Étape 1 : tests rouges.** Dans `import.test.ts` (importer `isRbitemName` en plus) :

```ts
const ZIP = new Uint8Array([0x50, 0x4b, 3, 4, 0, 0]);
describe("import d'un objet .rbitem (Z10)", () => {
  it("nom .rbitem et en-tête ZIP : insertItems(blob, nom, point), compté inséré", async () => {
    const insertItems = vi.fn(async (_b: Blob, _n: string, _at: unknown) => true);
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: vi.fn(async () => undefined), insertItems })
      .importFiles([file("Sélection.RBITEM", ZIP)], { x: 10, y: 20 });
    expect(r.inserted).toEqual(["Sélection.RBITEM"]);
    expect(insertItems.mock.calls[0]!.slice(1)).toEqual(["Sélection.RBITEM", { x: 10, y: 20 }]);
  });
  it("insertItems rend faux : compté en échec, aucun message de plus", async () => {
    const notify = vi.fn(async () => undefined);
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify, insertItems: async () => false }).importFiles([file("a.rbitem", ZIP)]);
    expect(r.failed).toEqual(["a.rbitem"]);
    expect(notify).not.toHaveBeenCalled();
  });
  it("sans en-tête ZIP : refusé « prochaine version »", async () => {
    const insertItems = vi.fn(async () => true);
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: vi.fn(async () => undefined), insertItems })
      .importFiles([file("a.rbitem", new Uint8Array([1, 2, 3, 4]))]);
    expect(r.refused).toEqual(["a.rbitem"]);
    expect(insertItems).not.toHaveBeenCalled();
  });
  it("sans insertItems : .rbitem refusé", async () => {
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: vi.fn(async () => undefined) }).importFiles([file("a.rbitem", ZIP)]);
    expect(r.refused).toEqual(["a.rbitem"]);
  });
  it("insertItems lève : « Import impossible (nom) : cause »", async () => {
    const notify = vi.fn(async (_m: string) => undefined);
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify, insertItems: async () => { throw new Error("cassé"); } })
      .importFiles([file("a.rbitem", ZIP)]);
    expect(r.failed).toEqual(["a.rbitem"]);
    expect(notify.mock.calls[0]![0]).toBe("Import impossible (a.rbitem) : cassé");
  });
  it("isRbitemName : extension seule refusée, casse ignorée", () => {
    expect([isRbitemName("a.rbitem"), isRbitemName("A.RbItem"), isRbitemName(".rbitem"), isRbitemName("a.roomboard")]).toEqual([true, true, false, false]);
  });
});
```

`files.test.ts:65` : attendu `extensions: ["roomboard", "rbitem", "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg", "avif", "heic", "heif"]`
et ajouter `expect([RBITEM_EXTENSION, RBITEM_MIME]).toEqual([".rbitem", "application/x-roomboard-item"]);`.
`host-fsa.test.ts` : ajouter un test « IMPORT_TYPES : rbitem sous son type, jamais sous image/* » :
`expect(IMPORT_TYPES[0]!.accept["application/x-roomboard-item"]).toEqual([".rbitem"]);`
`expect(IMPORT_TYPES[0]!.accept["image/*"]).not.toContain(".rbitem");`.

- [ ] **Étape 2 : voir rouge.** Commande de la section.

- [ ] **Étape 3 : `files.ts`.** Constantes après `ROOMBOARD_MIME` ; `IMPORT_EXTENSIONS` de « Interfaces » (commentaire :
  « le .roomboard, l'objet .rbitem (C3) et les images d'U33 »). `host-fsa.ts`, `IMPORT_TYPES[0].accept` :
  `[ROOMBOARD_MIME]: [ROOMBOARD_EXTENSION], [RBITEM_MIME]: [RBITEM_EXTENSION], "image/*": IMPORT_EXTENSIONS.filter((e) => e !== "roomboard" && e !== "rbitem").map((e) => \`.${e}\`)`
  (importer `RBITEM_EXTENSION`, `RBITEM_MIME`).

- [ ] **Étape 4 : `import.ts`.** Commentaire d'en-tête : ajouter « `rbitem` (objet, nom `.rbitem` et en-tête ZIP, C3 Z10)
  s'insère dans l'onglet actif au point de dépôt ». Importer `RBITEM_EXTENSION`. Ajouter :

```ts
/** En-tête d'une entrée ZIP locale (`PK\x03\x04`) : un `.rbitem` est un ZIP (Z10). */
const ZIP_HEAD = [0x50, 0x4b, 0x03, 0x04] as const;

export function isRbitemName(name: string): boolean {
  return name.toLowerCase().endsWith(RBITEM_EXTENSION) && name.length > RBITEM_EXTENSION.length;
}

export function rbitemHandler(deps: { insert(rbitem: Blob, name: string, at: Point | null): Promise<boolean> }): ImportHandler {
  return {
    id: "rbitem",
    nature: "objet",
    detect: (head, name) => isRbitemName(name) && ZIP_HEAD.every((b, i) => head[i] === b),
    async run(f, ctx) {
      try {
        return (await deps.insert(ctx.blob, f.name, ctx.at)) ? "inserted" : "failed";
      } catch (e) {
        await ctx.notify(`Import impossible (${f.name}) : ${messageOf(e)}`);
        return "failed";
      }
    },
  };
}
```

`ImportDeps` gagne `insertItems?` (Interfaces). Registre :

```ts
  const registry: readonly ImportHandler[] = [
    roomboardHandler(deps),
    ...(deps.insertItems ? [rbitemHandler({ insert: deps.insertItems })] : []),
    imageHandler(deps.decode ? { decode: deps.decode } : {}),
  ];
```

(Si OD80 est dans la base, son `sheetHandler` reste à sa place ; l'entrée `rbitem` se met juste après `roomboard`.)

- [ ] **Étape 5 : voir vert ; commit.** `git add` un par un ; commit (G11) `feat(platform): rbitem import handler and import filter`.

---

### Tâche T11 — Liaison Wasm C3, contrat sur le vrai module, fixture `fragment-v1.rbitem`

<a id="tache-t11"></a>

**Objectif.** Le module Wasm expose `group`, `ungroup`, `extract`, `insert_fragment`, `insert_pages`, `save_fragment(_parts)`,
`load_fragment(_parts)` ; `wasm-core.ts` les branche au contrat ; le bloc « contrat C3 » passe sur les deux fabriques ;
un essai de compatibilité relit le fixture du socle (mêmes octets) et un fragment figé (cadrage Z5, Z6, Z14, DAZ2 ; S2,
S4, S5).

**Fichiers.** Modifier `crates/roomboard-wasm/src/lib.rs` (méthodes exposées près de `save_parts` l. 425 et de `delete`
l. 727 ; méthodes `_inner` près de `load_parts_inner` l. 905 ; tests l. 1250+), `apps/web/src/core/wasm-core.ts`
(`apply` l. 332, classe `WasmCoreDocument`, `createWasmCore` l. 441), `apps/web/src/core/wasm-core.contract.test.ts`.
Créer `crates/roomboard-core/tests/compat_c3.rs`, `crates/roomboard-core/tests/fixtures/fragment-v1.rbitem`.

**Interfaces.**
- Consomme : T1 (`Command::Group`, `Command::Ungroup`, `ElementView.group`), T2 (`Document::extract`,
  `insert_fragment`, `insert_pages`), T3 (`format::save_fragment(_parts)`, `load_fragment(_parts)`, `FormatError::{UnknownKind, WrongKind}`),
  T4 (`api.ts` C3, `MIXED_SOURCE_MESSAGE`, `unknownKindMessage`, bloc `c3Factories`).
- Produit (Wasm) :

```rust
pub fn group(&mut self, ids: Vec<String>) -> Result<JsValue, JsError>;
pub fn ungroup(&mut self, ids: Vec<String>) -> Result<JsValue, JsError>;
pub fn extract(&self, page: &str, ids: Vec<String>) -> Result<Document, JsError>;
pub fn insert_fragment(&mut self, src: &Document, page: &str, dx: f64, dy: f64) -> Result<JsValue, JsError>;
pub fn insert_pages(&mut self, src: &Document, after: &str) -> Result<JsValue, JsError>;
pub fn save_fragment(&self, now: String, app_version: String, name: String) -> Result<Vec<u8>, JsError>;
pub fn save_fragment_parts(&self, now: String, app_version: String, name: String) -> Result<SavedParts, JsError>;
pub fn load_fragment(bytes: &[u8]) -> Result<Document, JsError>;
pub fn load_fragment_parts(manifest: &[u8], ybin: &[u8]) -> Result<Document, JsError>;
```

- Réutilise : `crates/roomboard-wasm/src/lib.rs:412` (`load`), `:421` (`load_parts`), `:425` (`save_parts`), `:807` (`element`) — patron « méthode exposée → `_inner` testé en natif » ; `load` et `load_parts` refusent un fragment par le cœur (T3), sans code ici.
- Réutilise : `crates/roomboard-core/tests/compat_socle.rs:105` (`socle_fixture_resaves_identically`) — patron de `compat_c3.rs` (régénération par `ROOMBOARD_REGENERER_FIXTURES=1`).
- Réutilise : `apps/web/src/core/wasm-core.contract.test.ts:203-1742` — `c3Factories = factories`.

**Test et commande bornée.**
```
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c3-groupes--T11
cargo test -p roomboard-wasm -p roomboard-core c3 2>&1 | grep -E "^test |test result|FAILED|error\[" | tail -30
cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2
rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm
wc -c < apps/web/src/wasm/roomboard_wasm_bg.wasm
pnpm install --frozen-lockfile >/dev/null && ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web test -- src/core --reporter=verbose 2>&1 | grep -E "C3|×|Test Files|Tests " | tail -60
```
Attendu : ≥ 7 `test … c3… ok` (5 dans `roomboard-wasm`, 3 dans `compat_c3`), 0 `FAILED` ; taille ≤ 1572864 ;
≥ 15 `✓ … contrat C3 : vrai module wasm > …`, ≥ 15 `✓ … contrat C3 : fausse liaison > …`, 3
`✓ … contrat C3 : vrai module seulement > …`, 0 `×`, aucun `failed` dans `src/core` (blocs C2 à C10a et C7b verts).

**Contraintes (recopiées).** G1 · G2 PATH, preuves bornées · G3 aucun build Tauri ni Android (le `cargo build` vise
`wasm32-unknown-unknown` seulement) · G4 **plafond 1 572 864 octets ni baissé ni relevé** · G5 · G6 · G7 commits
jejeasterix, anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, un par un, aucun push · G8
`socle_fixture_resaves_identically` et le neuf `c3_socle_fixture_resaves_identically` verts · G9 fmt, clippy
`-p roomboard-wasm -p roomboard-core` propres · G11.

**Interdits.** Ne pas committer `apps/web/src/wasm/` (ignoré). Ne pas régénérer `socle-v1.roomboard`. Ne pas changer
`verifier.sh`.

**Terminé quand.** Commandes vertes, `tsc` sans l'écart « `WasmCoreDocument` sans méthodes C3 »
(`pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | grep -c wasm-core.ts` = 0), un commit
`feat(wasm): C3 binding, contract on the real module, rbitem fixture`.

**Étapes.**

- [ ] **Étape 1 : tests rouges natifs (`roomboard-wasm/src/lib.rs`, module `tests`).**

```rust
    fn c3_rect(d: &mut Document, p: &str, x: f64) -> String {
        d.add_shape_inner(p, "rect", x, 100.0, x + 50.0, 150.0, "#000000", 4.0, None)
            .expect("forme")
            .ids[0]
            .clone()
    }

    #[test]
    fn c3_group_and_ungroup_inner() {
        let mut d = Document::blank();
        let p = d.core.page_ids()[0].clone();
        let a = c3_rect(&mut d, &p, 0.0);
        let b = c3_rect(&mut d, &p, 100.0);
        assert_eq!(d.group_inner(vec![a.clone()]), Err(CommandError::BadGroup));
        assert_eq!(d.group_inner(vec![a.clone(), b.clone()]).expect("group").ids.len(), 2);
        assert!(d.core.element(&a).expect("vue").group.is_some());
        assert_eq!(d.ungroup_inner(vec![a.clone(), b]).expect("ungroup").ids.len(), 2);
        assert_eq!(d.core.element(&a).expect("vue").group, None);
    }

    #[test]
    fn c3_extract_insert_fragment_inner() {
        let mut s = Document::blank();
        let sp = s.core.page_ids()[0].clone();
        let a = c3_rect(&mut s, &sp, 0.0);
        let frag = s.extract_inner(&sp, &[a]).expect("extract");
        let mut d = Document::blank();
        let p = d.core.page_ids()[0].clone();
        let c = d.insert_fragment_inner(&frag, &p, 5.0, 5.0).expect("insert");
        assert_eq!(c.ids.len(), 1);
        assert!(d.core.can_undo());
    }

    #[test]
    fn c3_insert_pages_inner() {
        let mut s = Document::blank();
        s.add_page_after_inner(None).expect("page");
        let mut d = Document::blank();
        let p = d.core.page_ids()[0].clone();
        assert_eq!(d.insert_pages_inner(&s, &p).expect("pages").pages.len(), 2);
        assert_eq!(d.core.page_count(), 3);
    }

    #[test]
    fn c3_fragment_save_load_inner() {
        let mut s = Document::blank();
        let sp = s.core.page_ids()[0].clone();
        let a = c3_rect(&mut s, &sp, 0.0);
        let frag = s.extract_inner(&sp, &[a]).expect("extract");
        let bytes = frag.save_fragment_inner("n", "v", "Sélection").expect("save");
        assert_eq!(Document::load_fragment_inner(&bytes).expect("load").core.page_count(), 1);
        let parts = frag.save_fragment_parts_inner("n", "v", "Sélection").expect("parts");
        assert!(Document::load_fragment_parts_inner(&parts.manifest, &parts.ybin).is_ok());
    }

    #[test]
    fn c3_load_refuses_fragment() {
        let s = Document::blank();
        let sp = s.core.page_ids()[0].clone();
        let frag = s.extract_inner(&sp, &[]).expect("extract");
        let bytes = frag.save_fragment_inner("n", "v", "x").expect("save");
        assert!(matches!(Document::load_inner(&bytes), Err(FormatError::WrongKind { .. })));
    }
```

(Adapter l'appel `add_shape_inner` à sa signature réelle, l. 1119 ; garder les valeurs.)

`crates/roomboard-core/tests/compat_c3.rs` :

```rust
//! Garde de compatibilité C3 (Z14) : `socle-v1.roomboard` relu puis réécrit aux mêmes octets par le code de C3 ;
//! `fragment-v1.rbitem` (trait, forme, texte riche, tableau, groupe imbriqué) écrit une fois, puis relu et réécrit à
//! l'identique. Régénérer : `ROOMBOARD_REGENERER_FIXTURES=1` (jamais pour le socle).
use std::path::PathBuf;

use roomboard_core::commands::Command;
use roomboard_core::document::Document;
use roomboard_core::element::StrokeStyle;
use roomboard_core::format::{load, load_fragment, save, save_fragment, SaveMeta, KIND_FRAGMENT};
use roomboard_core::rich_text::TextAttr;
use roomboard_core::shape::ShapeKind;

fn fixture(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures").join(name)
}
fn meta() -> SaveMeta {
    SaveMeta { app_version: "0.1.0".into(), now: "2026-11-20T00:00:00Z".into(), created: None }
}
fn pen() -> StrokeStyle {
    StrokeStyle { color: "#1e40af".into(), width: 4.0 }
}

fn fragment_document() -> Document {
    let mut d = Document::blank();
    let p = d.page_ids()[0].clone();
    let points: Vec<f32> = (0..=20).flat_map(|i| [100.0 + i as f32 * 10.0, 100.0, 0.5]).collect();
    let s = d.apply(Command::CommitStroke { page: p.clone(), points, style: pen() }).unwrap().ids[0].clone();
    let r = d.apply(Command::AddShape { page: p.clone(), shape: ShapeKind::Rect, x0: 100.0, y0: 200.0, x1: 300.0, y1: 300.0, style: pen(), fill: None }).unwrap().ids[0].clone();
    let t = d.apply(Command::SetText { page: p.clone(), id: None, x: 100.0, y: 400.0, content: "Bonjour".into(), color: "#000000".into(), size: 36.0, box_width: 400.0, box_height: 45.0, spans: None }).unwrap().ids[0].clone();
    d.apply(Command::FormatText { id: t.clone(), start: 0, len: 3, attrs: vec![TextAttr::Bold(true)], box_height: None }).unwrap();
    let tb = d.apply(Command::AddTable { page: p.clone(), x: 500.0, y: 100.0, cols: 2, rows: 2, col_width: 100.0, row_height: 40.0, color: "#000000".into(), size: 24.0 }).unwrap().ids[0].clone();
    d.apply(Command::Group { ids: vec![s.clone(), r.clone()] }).unwrap();
    d.apply(Command::Group { ids: vec![s.clone(), r.clone(), t.clone()] }).unwrap();
    d.extract(&p, &[s, r, t, tb]).expect("extract")
}

fn fragment_bytes() -> Vec<u8> {
    let path = fixture("fragment-v1.rbitem");
    if std::env::var("ROOMBOARD_REGENERER_FIXTURES").as_deref() == Ok("1") {
        std::fs::write(&path, save_fragment(&fragment_document(), &meta(), "Fixture C3").expect("save")).expect("écriture");
    }
    std::fs::read(&path).expect("fixture fragment-v1.rbitem absente : la créer avec ROOMBOARD_REGENERER_FIXTURES=1")
}

#[test]
fn c3_socle_fixture_resaves_identically() {
    let bytes = std::fs::read(fixture("socle-v1.roomboard")).expect("socle");
    let doc = load(&bytes).expect("load");
    assert!(save(&doc, &meta()).expect("resave") == bytes, "C3 change les octets du socle");
}

#[test]
fn c3_fragment_fixture_reads_groups_and_kinds() {
    let (f, m) = load_fragment(&fragment_bytes()).expect("lecture");
    assert_eq!(m.kind.as_deref(), Some(KIND_FRAGMENT));
    assert_eq!(m.name.as_deref(), Some("Fixture C3"));
    let ids = f.element_ids(&f.page_ids()[0]);
    let kinds: Vec<String> = ids.iter().map(|id| f.element(id).unwrap().kind).collect();
    assert_eq!(kinds, vec!["stroke", "shape", "text", "table"]);
    let g: Vec<Option<usize>> = ids.iter().map(|id| f.element(id).unwrap().group.map(|g| g.len())).collect();
    assert_eq!(g, vec![Some(2), Some(2), Some(1), None]);
    assert!(load(&fragment_bytes()).is_err(), "un fragment ne s'ouvre pas comme document");
}

#[test]
fn c3_fragment_fixture_resaves_identically() {
    let bytes = fragment_bytes();
    let (f, m) = load_fragment(&bytes).expect("lecture");
    let meta = SaveMeta { created: Some(m.created.clone()), ..meta() };
    assert!(save_fragment(&f, &meta, m.name.as_deref().unwrap_or("")).expect("resave") == bytes);
}
```

Créer le fixture une fois : `ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test compat_c3 c3_fragment_fixture_reads 2>&1 | tail -3`,
puis relancer **sans** la variable (le fixture doit alors être lu, pas réécrit).

Dans `wasm-core.contract.test.ts` : remplacer `const c3Factories: … = [{ name: "fausse liaison", f: fakeCore }];` par
`const c3Factories = factories; // T11 : vrai module branché, contrat C3 commun aux deux fabriques`, importer
`MIXED_SOURCE_MESSAGE` et `unknownKindMessage`, et ajouter :

```ts
describe.skipIf(loaded === null)("contrat C3 : vrai module seulement", () => {
  it("gomme partielle : les morceaux gardent le groupe du trait coupé", () => {
    const d = need().core.blank();
    const p = first(d);
    const a = commit(d, p, 100);
    const b = commit(d, p, 200);
    d.apply({ type: "Group", ids: [a, b] });
    const g = d.element(a)?.group;
    const c = d.apply({ type: "Erase", page: p, path: new Float32Array([300, 50, 300, 150]), radius: 10, mode: "partial" });
    expect(c.removed).toEqual([a]);
    expect(c.ids.length).toBeGreaterThan(0);
    for (const id of c.ids) expect(d.element(id)?.group).toEqual(g);
  });
  it("kind inconnu dans le manifeste : refusé « prochaine version »", () => {
    const d = need().core.blank();
    const [m, y] = d.extract(first(d), []).saveFragmentParts(now, "0.1.0", "x");
    const json = JSON.parse(new TextDecoder().decode(m)) as Record<string, unknown>;
    json["kind"] = "grid";
    const grid = new TextEncoder().encode(JSON.stringify(json));
    expect(messageOf(() => need().core.loadFragmentParts(grid, y))).toBe(unknownKindMessage("grid"));
    expect(messageOf(() => need().core.loadParts(grid, y))).toBe(unknownKindMessage("grid"));
  });
  it("source d'une autre liaison : erreur, rien d'écrit", () => {
    const d = need().core.blank();
    const s = fakeCore.blank();
    unchanged(d, () => expect(messageOf(() => d.insertFragment(s, first(d), 0, 0))).toBe(MIXED_SOURCE_MESSAGE));
    unchanged(d, () => expect(messageOf(() => d.insertPages(s, first(d)))).toBe(MIXED_SOURCE_MESSAGE));
  });
});
```

- [ ] **Étape 2 : voir rouge.** `cargo test -p roomboard-wasm c3 2>&1 | grep -E "error\[" | head -3` (méthodes `_inner`
  absentes) ; `cargo test -p roomboard-core --test compat_c3 2>&1 | tail -3` (fixture absente avant l'étape de création).

- [ ] **Étape 3 : `roomboard-wasm/src/lib.rs`.** Méthodes exposées (dans `#[wasm_bindgen] impl Document`) :

```rust
    /// Grouper (C3, Z1) : une étape ; `BadGroup` sinon.
    pub fn group(&mut self, ids: Vec<String>) -> Result<JsValue, JsError> {
        to_js(&self.group_inner(ids).map_err(cmd_err)?)
    }

    /// Dégrouper le niveau extérieur (C3, Z1) ; aucun élément groupé : aucune étape.
    pub fn ungroup(&mut self, ids: Vec<String>) -> Result<JsValue, JsError> {
        to_js(&self.ungroup_inner(ids).map_err(cmd_err)?)
    }

    /// Document neuf d'une page qui porte une recopie des éléments `ids` de `page` (C3, Z5) ; aucune étape.
    pub fn extract(&self, page: &str, ids: Vec<String>) -> Result<Document, JsError> {
        self.extract_inner(page, &ids).map_err(cmd_err)
    }

    /// Éléments de la première page de `src` en haut de `page`, translatés ; une étape (C3, Z5).
    pub fn insert_fragment(&mut self, src: &Document, page: &str, dx: f64, dy: f64) -> Result<JsValue, JsError> {
        to_js(&self.insert_fragment_inner(src, page, dx, dy).map_err(cmd_err)?)
    }

    /// Pages de `src` à la suite de `after` ; une étape (C3, Z5, Z12).
    pub fn insert_pages(&mut self, src: &Document, after: &str) -> Result<JsValue, JsError> {
        to_js(&self.insert_pages_inner(src, after).map_err(cmd_err)?)
    }

    /// `.rbitem` sans asset (C3, Z6).
    pub fn save_fragment(&self, now: String, app_version: String, name: String) -> Result<Vec<u8>, JsError> {
        self.save_fragment_inner(&now, &app_version, &name).map_err(fmt_err)
    }

    /// Manifeste et `document.ybin` d'un fragment, pour le conteneur avec assets (C3, Z6).
    pub fn save_fragment_parts(&self, now: String, app_version: String, name: String) -> Result<SavedParts, JsError> {
        let p = self.save_fragment_parts_inner(&now, &app_version, &name).map_err(fmt_err)?;
        Ok(SavedParts { manifest: p.manifest, ybin: p.ybin })
    }

    /// Lit un `.rbitem` sans asset ; un document est refusé (`WrongKind`).
    pub fn load_fragment(bytes: &[u8]) -> Result<Document, JsError> {
        Self::load_fragment_inner(bytes).map_err(fmt_err)
    }

    pub fn load_fragment_parts(manifest: &[u8], ybin: &[u8]) -> Result<Document, JsError> {
        Self::load_fragment_parts_inner(manifest, ybin).map_err(fmt_err)
    }
```

Méthodes natives (dans `impl Document` non exposé, près de `load_parts_inner`) :

```rust
    pub fn group_inner(&mut self, ids: Vec<String>) -> Result<Change, CommandError> {
        self.run(Command::Group { ids })
    }

    pub fn ungroup_inner(&mut self, ids: Vec<String>) -> Result<Change, CommandError> {
        self.run(Command::Ungroup { ids })
    }

    pub fn extract_inner(&self, page: &str, ids: &[String]) -> Result<Document, CommandError> {
        Ok(Self::wrap(self.core.extract(page, ids)?, None))
    }

    pub fn insert_fragment_inner(&mut self, src: &Document, page: &str, dx: f64, dy: f64) -> Result<Change, CommandError> {
        self.core.insert_fragment(&src.core, page, dx, dy)
    }

    pub fn insert_pages_inner(&mut self, src: &Document, after: &str) -> Result<Change, CommandError> {
        self.core.insert_pages(&src.core, after)
    }

    /// Un fragment n'a pas d'historique d'enregistrement : `created` = maintenant.
    fn fragment_meta(now: &str, app_version: &str) -> SaveMeta {
        SaveMeta { app_version: app_version.to_string(), now: now.to_string(), created: None }
    }

    pub fn save_fragment_inner(&self, now: &str, app_version: &str, name: &str) -> Result<Vec<u8>, FormatError> {
        format::save_fragment(&self.core, &Self::fragment_meta(now, app_version), name)
    }

    pub fn save_fragment_parts_inner(&self, now: &str, app_version: &str, name: &str) -> Result<Parts, FormatError> {
        format::save_fragment_parts(&self.core, &Self::fragment_meta(now, app_version), name)
    }

    pub fn load_fragment_inner(bytes: &[u8]) -> Result<Document, FormatError> {
        let (core, _) = format::load_fragment(bytes)?;
        Ok(Self::wrap(core, None))
    }

    pub fn load_fragment_parts_inner(manifest: &[u8], ybin: &[u8]) -> Result<Document, FormatError> {
        let (core, _) = format::load_fragment_parts(manifest, ybin)?;
        Ok(Self::wrap(core, None))
    }
```

- [ ] **Étape 4 : `wasm-core.ts`.** Importer `MIXED_SOURCE_MESSAGE` depuis `./api`. Dans `apply`, deux bras :
  `case "Group": return toChange(this.d.group([...cmd.ids]));` et `case "Ungroup": return toChange(this.d.ungroup([...cmd.ids]));`.
  Dans `WasmCoreDocument` :

```ts
  /** Source d'une insertion : même liaison exigée (DAZ2). */
  private other(src: CoreDocument): Wasm.Document {
    if (!(src instanceof WasmCoreDocument)) throw new Error(MIXED_SOURCE_MESSAGE);
    return src.d;
  }
  extract(page: string, ids: readonly string[]): CoreDocument { return new WasmCoreDocument(this.d.extract(page, [...ids]), this.mod); }
  insertFragment(src: CoreDocument, page: string, dx: number, dy: number): Change { return toChange(this.d.insert_fragment(this.other(src), page, dx, dy)); }
  insertPages(src: CoreDocument, after: string): Change { return toChange(this.d.insert_pages(this.other(src), after)); }
  saveFragment(now: string, appVersion: string, name: string): Uint8Array { return this.d.save_fragment(now, appVersion, name); }
  saveFragmentParts(now: string, appVersion: string, name: string): readonly [Uint8Array, Uint8Array] {
    const p = this.d.save_fragment_parts(now, appVersion, name);
    try {
      return [p.manifest(), p.ybin()] as const;
    } finally {
      p.free();
    }
  }
```

`createWasmCore` gagne :
`loadFragment: (bytes: Uint8Array) => new WasmCoreDocument(mod.Document.load_fragment(bytes), mod),` et
`loadFragmentParts: (manifest: Uint8Array, ybin: Uint8Array) => new WasmCoreDocument(mod.Document.load_fragment_parts(manifest, ybin), mod),`.

- [ ] **Étape 5 : voir vert.** Toutes les commandes de la section ; `cargo fmt --all --check && cargo clippy -p roomboard-wasm -p roomboard-core --all-targets -- -D warnings 2>&1 | tail -5`.
  Si `ROOMBOARD_WASM_REQUIRED=1` fait échouer un bloc C3 sur le vrai module seulement : la parité est rompue ; corriger
  le cœur ou la fausse liaison pour qu'ils disent la même chose, jamais en excluant le test du vrai module.

- [ ] **Étape 6 : commit.** `git add` un par un : `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/wasm-core.ts`,
  `apps/web/src/core/wasm-core.contract.test.ts`, `crates/roomboard-core/tests/compat_c3.rs`,
  `crates/roomboard-core/tests/fixtures/fragment-v1.rbitem` ; commit (G11)
  `feat(wasm): C3 binding, contract on the real module, rbitem fixture`. Rapport : taille du module mesurée.

---

### Tâche T12 — Outil Sélection : clic, Maj+clic et rectangle par groupe

<a id="tache-t12"></a>

**Objectif.** Un clic sur un membre prend tout son groupe extérieur ; Maj+clic ajoute ou retire le groupe entier ; le
rectangle ne prend un groupe que s'il y est entier ; déplacer et redimensionner restent une `Transform{ids}` sur les
membres (cadrage Z2, DAZ5, HZ1-6, effet de bord « clic sur un élément groupé » ; S1).

**Fichiers.** Modifier `apps/web/src/engine/tools/select.ts` (`begin` l. 116-136, rectangle l. 158-161),
`apps/web/src/engine/tools/select.test.ts`.

**Interfaces.**
- Consomme : T5 `expandToGroups(ids, page)`, `keepWholeGroups(ids, page)`, `type GroupedView` (`engine/groups.ts`) ;
  T4 `Command` `Group` et `ElementView.group` (fausse liaison des tests).
- Réutilise : `apps/web/src/engine/groups.ts` (T5) — `expandToGroups(ids: readonly string[], page: readonly GroupedView[]): string[]`, `keepWholeGroups(ids: readonly string[], page: readonly GroupedView[]): string[]`.
- Réutilise : `crates/roomboard-core/src/commands.rs:644` (`Transform{ids, matrix}`) ; `select.ts:158-167` — appelés avec les ids des membres (inchangé).
- Réutilise : `crates/roomboard-core/src/query.rs:192` (`hit_test`), `:218` (`ids_in_rect`) par `ctx.doc.hitTest`, `ctx.doc.idsInRect` — tels quels.

**Test et commande bornée.**
`export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c3-groupes--T12 && pnpm install --frozen-lockfile >/dev/null && pnpm --filter @roomboard/web test -- src/engine/tools/select.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|Tests " | tail -40`
Attendu : 0 `×`, ≥ 5 `✓ outil Sélection : groupes (Z2) > …`, tous les tests « outil Sélection (D15, D38) » verts.

**Contraintes (recopiées).** G1 · G2 PATH, preuves bornées, `pnpm install --frozen-lockfile` · G5 tests existants
inchangés et verts · G6 · G7 commits jejeasterix, anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`,
un par un, aucun push · G11.

**Interdits.** Aucune requête neuve au cœur (DAZ5). Pas d'« entrée » dans un groupe (double-clic). Ne pas toucher
`tools/text.ts`, `tools/table.ts` (leur `hitTest` reste propre : un texte groupé reste éditable).

**Terminé quand.** Tests verts, un commit `feat(select): click, shift-click and band select whole groups`.

**Étapes.**

- [ ] **Étape 1 : tests rouges (fin de `select.test.ts`).**

```ts
describe("outil Sélection : groupes (Z2)", () => {
  function grouped() {
    const s = setup();
    const a = s.rect(100, 100, 200, 200);
    const b = s.rect(300, 100, 400, 200);
    const c = s.rect(500, 100, 600, 200);
    s.doc.apply({ type: "Group", ids: [a, b] });
    return { ...s, a, b, c };
  }
  it("clic sur un membre : groupe extérieur (sans écriture)", () => {
    const { tool, runs, a, b } = grouped();
    gesture(tool, [[150, 150]]);
    expect(tool.selection()).toEqual([a, b]);
    expect(runs).toEqual([]);
  });
  it("groupe imbriqué : un clic prend le groupe le plus extérieur", () => {
    const { tool, doc, a, b, c } = grouped();
    doc.apply({ type: "Group", ids: [a, b, c] });
    gesture(tool, [[550, 150]]);
    expect(tool.selection()).toEqual([a, b, c]);
  });
  it("Maj+clic : groupe entier (ajouté puis retiré)", () => {
    const { tool, setShift, a, b, c } = grouped();
    gesture(tool, [[550, 150]]);
    setShift(true);
    gesture(tool, [[150, 150]]);
    expect(tool.selection()).toEqual([c, a, b]);
    gesture(tool, [[350, 150]]);
    expect(tool.selection()).toEqual([c]);
  });
  it("glisser un membre : une Transform sur tous les membres", () => {
    const { tool, runs, a, b } = grouped();
    gesture(tool, [[150, 150], [250, 150]]);
    expect(runs).toEqual([{ type: "Transform", ids: [a, b], matrix: [1, 0, 0, 1, 100, 0] }]);
  });
  it("rectangle : groupe pris seulement entier", () => {
    const { tool, a, b, c } = grouped();
    gesture(tool, [[90, 90], [250, 210]]);
    expect(tool.selection()).toEqual([]);
    gesture(tool, [[90, 90], [610, 210]]);
    expect(tool.selection()).toEqual([a, b, c]);
  });
});
```

- [ ] **Étape 2 : voir rouge.** Commande de la section.

- [ ] **Étape 3 : `select.ts`.** En-tête : ajouter « C3 (Z2) : un clic prend le groupe extérieur entier, Maj+clic
  l'ajoute ou le retire entier, le rectangle ne prend un groupe qu'entier (`engine/groups.ts`). ». Importer
  `expandToGroups`, `keepWholeGroups`, `type GroupedView` depuis `../groups`. Dans `createSelectTool`, après `moved` :

```ts
  /** Vues de la page montrée (C3, Z2), lues au geste, jamais gardées. */
  const pageViews = (): GroupedView[] =>
    ctx.doc.elementIds(ctx.page()).flatMap((id) => {
      const v = ctx.doc.element(id);
      return v === null ? [] : [v];
    });
```

Dans `begin`, remplacer le bloc `if (hit !== null) { … }` par :

```ts
      if (hit !== null) {
        const unit = expandToGroups([hit], pageViews()); // C3 : le groupe extérieur entier
        if (shift) {
          selection = selection.includes(hit)
            ? selection.filter((id) => !unit.includes(id))
            : [...selection, ...unit.filter((id) => !selection.includes(id))];
          startDrag(pointerId, "none", x, y);
          return;
        }
        if (!selection.includes(hit)) selection = unit;
        startDrag(pointerId, "move", x, y);
        return;
      }
```

Dans `close`, branche `band` : `const ids = keepWholeGroups(ctx.doc.idsInRect(ctx.page(), norm(d.x0, d.y0, d.x, d.y)), pageViews());`.

- [ ] **Étape 4 : voir vert ; commit.** `git add apps/web/src/engine/tools/select.ts`, puis
  `apps/web/src/engine/tools/select.test.ts` ; commit (G11) `feat(select): click, shift-click and band select whole groups`.
  Rapport : `Réutilisation : appelé engine/groups.ts (expandToGroups, keepWholeGroups)`.

---

### Tâche T13 — Moteur : grouper, dégrouper, insérer un fragment ou des pages, état des boutons, attributs `#stage`

<a id="tache-t13"></a>

**Objectif.** Le moteur groupe et dégroupe la sélection (bouton ou Ctrl+G / Ctrl+Maj+G), publie les unités de la
sélection et la présence d'un groupe, insère un fragment (outil Sélection, objets insérés sélectionnés) ou les pages
d'un document (première page insérée montrée), chaque fois une étape ; `#stage` porte `data-units` et `data-grouped`
(cadrage Z1, Z7, Z12, Z13, HZ1-2, HZ1-3 ; PC4, PC9 ; S1, S2, S4).

**Fichiers.** Modifier `apps/web/src/engine/engine.ts` (`EngineState` l. 20-37, `Engine` l. 70-118, `state` l. 215,
`run` l. 291, `history` l. 312, `key` l. 440-473, objet `engine`), `apps/web/src/engine/engine.test.ts`,
`apps/web/src/app/stage-tags.ts`, `apps/web/src/app/stage-tags.test.ts`, `apps/web/src/app/board-session.ts`
(`mark`, l. 263-273).

**Interfaces.**
- Consomme : T5 `selectionUnits(ids, page)`, `type GroupedView`, `KeyAction` `"group" | "ungroup"` ; T4
  `CoreDocument.insertFragment`, `insertPages`, `Command` `Group` / `Ungroup`.
- Produit (lu par T14, T15, T16) :

```ts
// EngineState
  /** C3 (Z13) : unités de la sélection (groupes extérieurs et éléments libres) ; 0 sans sélection. */
  readonly selectionUnits: number;
  /** C3 (Z13) : un élément sélectionné au moins porte un groupe. */
  readonly selectionGrouped: boolean;
// Engine
  /** C3 (Z1) : groupe la sélection (≥ 2 unités) ; une étape ; sélection gardée ; faux si rien n'est fait. */
  group(): boolean;
  /** C3 (Z1) : retire le groupe extérieur de la sélection ; faux sans groupe. */
  ungroup(): boolean;
  /** C3 (Z7) : objets de `src` en haut de la page montrée, translatés ; outil Sélection, sélection = objets insérés. */
  insertFragment(src: CoreDocument, dx: number, dy: number): Change | null;
  /** C3 (Z12) : pages de `src` après la page montrée ; la première insérée est montrée. */
  insertPages(src: CoreDocument): Change | null;
// stage-tags.ts : stageTags(s) rend aussi { units: String(s.selectionUnits), grouped: s.selectionGrouped ? "1" : "0" }
```

- Réutilise : `apps/web/src/engine/engine.ts:70-118` (`Engine`), `:30` (`EngineState.selection`), `:440-472` (`key`) — `group`, `ungroup`, insertion (PC4), état des boutons ; Ctrl+G (étendre).
- Réutilise : `apps/web/src/engine/groups.ts` (T5) — `selectionUnits(ids: readonly string[], page: readonly GroupedView[]): { units: number; grouped: boolean }`.

**Test et commande bornée.**
`export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c3-groupes--T13 && pnpm install --frozen-lockfile >/dev/null && pnpm --filter @roomboard/web test -- src/engine/engine.test.ts src/app/stage-tags.test.ts --reporter=verbose 2>&1 | grep -E "C3|×|Tests " | tail -40`
Attendu : 0 `×`, ≥ 8 `✓ moteur — C3 > …`, ≥ 1 `✓ stageTags (C3) > …`, tous les tests existants du moteur verts.

**Contraintes (recopiées).** G1 · G2 PATH, preuves bornées, `pnpm install --frozen-lockfile` · G5 tests existants
verts (seules les attentes exactes de `stageTags` gagnent `units` et `grouped`) · G6 · G7 commits jejeasterix, anglais,
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, un par un, aucun push · G11. `tsc` : ajouter
`selectionUnits: 0, selectionGrouped: false` à tout littéral `EngineState` de test (`grep -rln "selectionBounds:" apps/web/src --include=*.test.*`).

**Interdits.** Aucun calcul de placement dans le moteur (il reçoit `dx`, `dy`). Ne pas toucher `tools/select.ts` (T12),
`workspace.ts`, `App.tsx`. Ctrl+G est pris (rend vrai) même sans effet (HZ1-2).

**Terminé quand.** Tests verts, un commit `feat(engine): group, ungroup, insert fragment and pages, selection units`.

**Étapes.**

- [ ] **Étape 1 : tests rouges (fin de `engine.test.ts`).**

```ts
describe("moteur — C3", () => {
  function c3() {
    const doc = fakeCore.blank();
    const tools: ToolFactories = {
      pen: (ctx) => fakeTool("pen", [], ctx),
      eraser: (ctx) => fakeTool("eraser", [], ctx),
      select: (ctx) => createSelectTool(ctx),
    };
    const engine = createEngine({ doc, renderer: new FakeRenderer(), frames: new Frames(), tools });
    const page = engine.state().page;
    const rect = (x: number): string =>
      doc.apply({ type: "AddShape", page, shape: "rect", x0: x, y0: 100, x1: x + 50, y1: 150, style: PEN, fill: null }).ids[0] ?? "";
    const ctrl = (key: string, shiftKey = false): KeyLike => ({ key, ctrlKey: true, metaKey: false, shiftKey, altKey: false, isComposing: false, target: null });
    return { doc, engine, page, rect, ctrl };
  }
  /** Sélection posée par un vrai geste de rectangle de l'outil Sélection. */
  const band = (engine: ReturnType<typeof createEngine>, x0: number, x1: number): void => {
    engine.setTool("select");
    engine.sink.begin(1, "select", [{ ...sample, x: x0, y: 50 }]);
    engine.sink.extend(1, [{ ...sample, x: x1, y: 250 }], []);
    engine.sink.close(1, "end");
  };

  it("état : unités et groupe de la sélection", () => {
    const { engine, rect } = c3();
    rect(100);
    rect(300);
    expect(engine.state()).toMatchObject({ selectionUnits: 0, selectionGrouped: false });
    band(engine, 50, 400);
    expect(engine.state()).toMatchObject({ selectionUnits: 2, selectionGrouped: false });
  });
  it("group() : une étape, sélection gardée, une seule unité ensuite", () => {
    const { engine, doc, rect } = c3();
    const a = rect(100);
    const b = rect(300);
    band(engine, 50, 400);
    expect(engine.group()).toBe(true);
    expect(engine.state()).toMatchObject({ selection: [a, b], selectionUnits: 1, selectionGrouped: true });
    expect(doc.element(a)?.group).toEqual(doc.element(b)?.group);
    engine.undo();
    expect(doc.element(a)?.group).toBeUndefined();
  });
  it("group() sous deux unités : faux, aucune écriture", () => {
    const { engine, doc, rect } = c3();
    rect(100);
    band(engine, 50, 200);
    const v = doc.version();
    expect(engine.group()).toBe(false);
    expect(doc.version()).toBe(v);
  });
  it("ungroup() : sans groupe faux ; avec groupe une étape", () => {
    const { engine, rect } = c3();
    rect(100);
    rect(300);
    band(engine, 50, 400);
    expect(engine.ungroup()).toBe(false);
    engine.group();
    expect(engine.ungroup()).toBe(true);
    expect(engine.state()).toMatchObject({ selectionUnits: 2, selectionGrouped: false });
  });
  it("Ctrl+G groupe, Ctrl+Maj+G dégroupe ; la touche est prise même sans effet", () => {
    const { engine, rect, ctrl } = c3();
    rect(100);
    rect(300);
    expect(engine.key(ctrl("g"))).toBe(true); // rien de sélectionné : pris, sans effet
    band(engine, 50, 400);
    expect(engine.key(ctrl("g"))).toBe(true);
    expect(engine.state().selectionGrouped).toBe(true);
    expect(engine.key(ctrl("G", true))).toBe(true);
    expect(engine.state().selectionGrouped).toBe(false);
  });
  it("insertFragment : outil Sélection, objets insérés sélectionnés, une étape", () => {
    const { engine, doc, page, rect } = c3();
    const s = fakeCore.blank();
    const sp = s.pageIds()[0]!;
    const x = s.apply({ type: "AddShape", page: sp, shape: "rect", x0: 0, y0: 0, x1: 10, y1: 10, style: PEN, fill: null }).ids[0]!;
    rect(100);
    engine.setTool("pen");
    const c = engine.insertFragment(s.extract(sp, [x]), 24, 24);
    expect(c?.ids).toHaveLength(1);
    expect(engine.state()).toMatchObject({ tool: "select", selection: c?.ids });
    expect(doc.elementIds(page)).toHaveLength(2);
    engine.undo();
    expect(doc.elementIds(page)).toHaveLength(1);
  });
  it("insertFragment refusé : null, erreur dans l'état, outil inchangé", () => {
    const { engine } = c3();
    engine.setTool("pen");
    const s = fakeCore.blank();
    const sp = s.pageIds()[0]!;
    const x = s.apply({ type: "AddShape", page: sp, shape: "rect", x0: 0, y0: 0, x1: 10, y1: 10, style: PEN, fill: null }).ids[0]!;
    expect(engine.insertFragment(s.extract(sp, [x]), Number.NaN, 0)).toBeNull();
    expect(engine.state()).toMatchObject({ tool: "pen", error: "matrice invalide (six nombres finis, inversible)" });
  });
  it("insertPages : après la page montrée, la première insérée est montrée ; Annuler les retire", () => {
    const { engine, doc, page } = c3();
    const s = fakeCore.blank();
    s.apply({ type: "AddPage", after: s.pageIds()[0]! });
    const c = engine.insertPages(s);
    expect(c?.pages).toHaveLength(2);
    expect(doc.pageIds()).toEqual([page, ...(c?.pages ?? [])]);
    expect(engine.state().page).toBe(c?.pages[0]);
    engine.undo();
    expect(doc.pageIds()).toEqual([page]);
    expect(engine.state().page).toBe(page);
  });
});
```

(`sample`, `PEN`, `Frames`, `FakeRenderer`, `fakeTool`, `KeyLike`, `createSelectTool`, `ToolFactories` existent déjà
dans le fichier ; le rectangle du geste `band` part de y = 50, au-dessus des formes, donc hors de tout `hitTest`.)

`stage-tags.test.ts` : `base` gagne `selectionUnits: 0, selectionGrouped: false` ; les deux attentes exactes du premier
test gagnent `units: "0", grouped: "0"` ; ajouter :

```ts
describe("stageTags (C3)", () => {
  it("units et grouped (PC9)", () => {
    expect(stageTags({ ...base, selection: ["a", "b", "c"], selectionUnits: 1, selectionGrouped: true })).toMatchObject({ units: "1", grouped: "1" });
    expect(stageTags(base)).toMatchObject({ units: "0", grouped: "0" });
  });
});
```

- [ ] **Étape 2 : voir rouge.** Commande de la section.

- [ ] **Étape 3 : `engine.ts`.** Importer `selectionUnits`, `type GroupedView` depuis `./groups`. Champs d'`EngineState` et
  méthodes d'`Engine` de « Interfaces ». Remplacer `run` par un tronc commun :

```ts
  /** Écriture commune (commande ou insertion, C3) : refus dans l'état ; pages suivies ; outils élagués ; une émission. */
  function commit(write: () => Change, showAppeared: boolean): Change | null {
    lastDeleted = null;
    const before = doc.pageIds();
    let change: Change;
    try {
      change = write();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      emit();
      return null;
    }
    renderer.invalidate(change);
    error = null;
    followPages(before, showAppeared);
    selectTool.prune();
    tableTool.prune();
    requestScene();
    emit();
    return change;
  }

  function run(cmd: Command): Change | null {
    return commit(() => doc.apply(cmd), false);
  }
```

`history(which: KeyAction)` devient `history(which: "undo" | "redo")`. Avant `const ctx` :

```ts
  /** Vues des éléments sélectionnés (C3) : unités et groupe, sans parcourir toute la page. */
  const selectedViews = (): GroupedView[] =>
    selectTool.selection().flatMap((id) => {
      const v = doc.element(id);
      return v === null ? [] : [v];
    });

  function group(): boolean {
    const sel = [...selectTool.selection()];
    if (selectionUnits(sel, selectedViews()).units < 2) return false;
    return run({ type: "Group", ids: sel }) !== null;
  }

  function ungroup(): boolean {
    const sel = [...selectTool.selection()];
    if (!selectionUnits(sel, selectedViews()).grouped) return false;
    return run({ type: "Ungroup", ids: sel }) !== null;
  }
```

`selectedViews`, `group`, `ungroup` utilisent `selectTool`, déclaré plus bas : les placer **après** la déclaration de
`selectTool` (l. 201 du corps de `createEngine`). Dans `state()` :

```ts
    const sel = selectTool.selection();
    const units = sel.length === 0 ? { units: 0, grouped: false } : selectionUnits(sel, selectedViews());
    // … champs existants …
      selectionUnits: units.units,
      selectionGrouped: units.grouped,
```

Dans `key`, remplacer la fin :

```ts
      const action = keyAction(e);
      if (action === null) return false;
      // C3 (Z13, HZ1-2) : Ctrl+G et Ctrl+Maj+G sont pris même sans effet (plus de « rechercher le suivant »).
      if (action === "group") {
        group();
        return true;
      }
      if (action === "ungroup") {
        ungroup();
        return true;
      }
      history(action);
      return true;
```

Dans l'objet `engine` :

```ts
    group,
    ungroup,
    insertFragment(src, dx, dy) {
      const change = commit(() => doc.insertFragment(src, pageId, dx, dy), false);
      if (change === null || change.ids.length === 0) return change;
      engine.setTool("select"); // quitte l'outil courant (texte ouvert validé) avant de poser la sélection
      selectTool.setSelection(change.ids);
      requestScene();
      emit();
      return change;
    },
    insertPages(src) {
      return commit(() => doc.insertPages(src, pageId), true);
    },
```

- [ ] **Étape 4 : `stage-tags.ts` et `board-session.ts`.** `stageTags` rend aussi `units` et `grouped` (type de retour
  `Record<"page" | "selection" | "bounds" | "tool" | "table" | "units" | "grouped", string>`) ; commentaire « C3 (PC9) :
  `units`, `grouped` ». Dans `mark` de `board-session.ts`, après `stage.dataset["table"] = tags.table;` :
  `stage.dataset["units"] = tags.units;` et `stage.dataset["grouped"] = tags.grouped;`.

- [ ] **Étape 5 : voir vert ; commit.** Commande de la section ; puis
  `pnpm --filter @roomboard/web test -- src/engine src/app 2>&1 | tail -6` (0 échec). `git add` un par un :
  `apps/web/src/engine/engine.ts`, `apps/web/src/engine/engine.test.ts`, `apps/web/src/app/stage-tags.ts`,
  `apps/web/src/app/stage-tags.test.ts`, `apps/web/src/app/board-session.ts` (et tout `*.test.*` complété pour `tsc`) ;
  commit (G11) `feat(engine): group, ungroup, insert fragment and pages, selection units`.

---

### Tâche T14 — Opérations sur la sélection d'un onglet (`fragments.ts`)

<a id="tache-t14"></a>

**Objectif.** Encoder la sélection d'un onglet en `.rbitem`, insérer un `.rbitem` (collé : centre de la vue avec
cascade de 24 px par collage successif du même contenu ; déposé : centre de ses bornes au point de dépôt), insérer les
pages d'un `.roomboard`, assets adoptés par le magasin de l'onglet ; refus si un asset cité n'a pas pu être lu (cadrage
Z4, Z6, Z7, Z12, DAZ3, HZ1-3, HZ2-6 ; PC3, PC8 ; S2, S3, S4).

**Fichiers.** Créer `apps/web/src/app/fragments.ts`, `apps/web/src/app/fragments.test.ts`.

**Interfaces.**
- Consomme : T8 `ContainerIO` (`encode(doc, assets, now, appVersion, { kind: "fragment", name })`,
  `read(name, bytes, "fragment" | "document")`, `ReadResult`), T4 (`CoreDocument.extract`, `bounds`, `citedAssets`),
  T13 (`Engine.insertFragment(src, dx, dy)`, `Engine.insertPages(src)` — types seulement ; les tests passent par une
  doublure de l'onglet ; `tsc` : écart nommé fermé par la fusion de T13).
- Produit (lu par T15) :

```ts
export const SELECTION_NAME = "Sélection";
export const UNREAD_ITEMS_MESSAGE = "images non lues, rien n'est inséré";
export const TAB_GONE_MESSAGE = "onglet fermé pendant la lecture, rien n'est inséré";
export interface FragmentDeps {
  readonly io: ContainerIO;
  now(): string;
  readonly appVersion: string;
  say(message: string): Promise<void>;
  /** PC3 : faux une fois l'onglet fermé. */
  alive(tab: TabSession): boolean;
}
export interface FragmentOps {
  encodeSelection(tab: TabSession): Promise<Uint8Array | null>;
  insert(tab: TabSession, rbitem: Uint8Array, name: string, at: Point | null): Promise<boolean>;
  insertPages(tab: TabSession, file: OpenedFile): Promise<boolean>;
  /** Nouvelle copie : le prochain collage repart au centre (Z7). */
  resetCascade(): void;
}
export function createFragmentOps(deps: FragmentDeps): FragmentOps;
```

- Réutilise : aucun module existant pour ces opérations (cadrage : `copySelection`, `export`, `fragment` : rien) — `app/fragments.ts` : `createFragmentOps(deps: { io: ContainerIO; now(): string; appVersion: string; say(m: string): Promise<void> }): FragmentOps` (+ `alive`, PC3 ; + `resetCascade`) ; `FragmentOps.encodeSelection(tab: TabSession): Promise<Uint8Array | null>` ; `FragmentOps.insert(tab: TabSession, rbitem: Uint8Array, name: string, at: Point | null): Promise<boolean>` ; `FragmentOps.insertPages(tab: TabSession, file: OpenedFile): Promise<boolean>` (nouveau module, DAZ3).
- Réutilise : `apps/web/src/platform/image-import.ts:194` (`anchorOf`), `:31` (`CASCADE_STEP`) — `anchorOf(rect, camera, at)` puis cascade.
- Réutilise : `apps/web/src/core/asset-store.ts:19` (`adopt`) — `assets.adopt(id, blob)`.
- Réutilise : `apps/web/src/app/container-io.ts` (T8) — `ContainerIO.encode`, `ContainerIO.read`.

**Test et commande bornée.**
`export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c3-groupes--T14 && pnpm install --frozen-lockfile >/dev/null && pnpm --filter @roomboard/web test -- src/app/fragments.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|Tests " | tail -40`
Attendu : 0 `×`, ≥ 9 `✓ opérations sur la sélection (DAZ3) > …`.

**Contraintes (recopiées).** G1 · G2 PATH, preuves bornées, `pnpm install --frozen-lockfile` · G5 · G6 · G7 commits
jejeasterix, anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, un par un, aucun push · G10 messages
français · G11.

**Interdits.** Aucun accès au DOM hors `tab.board.stage.getBoundingClientRect()`. Ne jamais appliquer un
`document.ybin` comme mise à jour (U9). Le `doc` lu est toujours libéré (`free`), y compris en refus. Ne pas toucher
`workspace.ts` (T15).

**Terminé quand.** Tests verts, un commit `feat(app): selection operations, encode, insert fragment and pages`.

**Étapes.**

- [ ] **Étape 1 : tests rouges.** `apps/web/src/app/fragments.test.ts` :

```ts
// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import type { CoreDocument } from "../core/api";
import { createAssetStore } from "../core/asset-store";
import { fakeCore } from "../core/fake-core";
import { CodecUnavailableError, type ContainerCodec, type ContainerContents } from "../platform/container";
import { createContainerIO } from "./container-io";
import { createFragmentOps, SELECTION_NAME, TAB_GONE_MESSAGE, UNREAD_ITEMS_MESSAGE } from "./fragments";
import type { TabSession } from "./workspace";

const ID = "ab".repeat(32);
const NOW = "2026-11-20T00:00:00Z";

/** Conteneur de test : écrit en mémoire ; tout octet qui n'en vient pas = module absent (repli par le cœur seul). */
function memoryCodec(): ContainerCodec {
  const store = new Map<number, ContainerContents>();
  let n = 0;
  return {
    async write(manifest, ybin, assets) {
      store.set(++n, { manifest, ybin, assets: assets.map((a) => [a.id, a.blob] as const), warnings: [] });
      return new Uint8Array([0xfe, n]);
    },
    async read(file) {
      const b = new Uint8Array(await file.arrayBuffer());
      const c = b[0] === 0xfe ? store.get(b[1] ?? 0) : undefined;
      if (c === undefined) throw new CodecUnavailableError(new Error("pas un conteneur de test"));
      return c;
    },
  };
}

function tabOf(doc: CoreDocument = fakeCore.blank()) {
  const assets = createAssetStore(async () => ID);
  let selection: string[] = [];
  const engine = {
    state: () => ({ selection, page: doc.pageIds()[0]! }),
    camera: () => ({ zoom: 1, tx: 0, ty: 0 }),
    insertFragment: (src: CoreDocument, dx: number, dy: number) => doc.insertFragment(src, doc.pageIds()[0]!, dx, dy),
    insertPages: (src: CoreDocument) => doc.insertPages(src, doc.pageIds()[0]!),
  };
  const stage = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }) };
  const tab = { board: { doc, engine, stage }, assets, files: {} } as unknown as TabSession;
  return { tab, doc, assets, select: (ids: string[]) => void (selection = ids) };
}

function opsOf(codec: ContainerCodec = memoryCodec(), alive = (_t: TabSession) => true) {
  const said: string[] = [];
  const say = async (m: string) => void said.push(m);
  const io = createContainerIO({ core: fakeCore, codec, say, makeAssets: () => createAssetStore(async () => ID) });
  return { ops: createFragmentOps({ io, now: () => NOW, appVersion: "0.1.0", say, alive }), said };
}

const rectIn = (d: CoreDocument, x0: number, y0: number, x1: number, y1: number): string =>
  d.apply({ type: "AddShape", page: d.pageIds()[0]!, shape: "rect", x0, y0, x1, y1, style: { color: "#000000", width: 4 }, fill: null }).ids[0]!;
const centre = (d: CoreDocument, ids: readonly string[]): [number, number] => {
  const b = d.bounds(ids)!;
  return [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
};

describe("opérations sur la sélection (DAZ3)", () => {
  it("encodeSelection : sélection vide → null", async () => {
    const { ops } = opsOf();
    expect(await ops.encodeSelection(tabOf().tab)).toBeNull();
  });

  it("copier puis coller : objets au centre de la vue, groupe gardé, ids neufs", async () => {
    const { ops } = opsOf();
    const src = tabOf();
    const a = rectIn(src.doc, 0, 0, 100, 100);
    const b = rectIn(src.doc, 200, 0, 300, 100);
    src.doc.apply({ type: "Group", ids: [a, b] });
    src.select([a, b]);
    const bytes = (await ops.encodeSelection(src.tab))!;
    const dst = tabOf();
    expect(await ops.insert(dst.tab, bytes, "presse-papiers", null)).toBe(true);
    const ids = dst.doc.elementIds(dst.doc.pageIds()[0]!);
    expect(ids).toHaveLength(2);
    expect(ids).not.toContain(a);
    expect(centre(dst.doc, ids)).toEqual([400, 300]);
    expect(dst.doc.element(ids[0]!)?.group).toEqual(dst.doc.element(ids[1]!)?.group);
  });

  it("collages successifs du même contenu : décalés de 24 px ; resetCascade repart au centre", async () => {
    const { ops } = opsOf();
    const src = tabOf();
    src.select([rectIn(src.doc, 0, 0, 100, 100)]);
    const bytes = (await ops.encodeSelection(src.tab))!;
    const dst = tabOf();
    const at = (k: number) => centre(dst.doc, [dst.doc.elementIds(dst.doc.pageIds()[0]!)[k]!]);
    await ops.insert(dst.tab, bytes, "p", null);
    await ops.insert(dst.tab, bytes.slice(), "p", null); // mêmes octets, autre tableau
    expect(at(0)).toEqual([400, 300]);
    expect(at(1)).toEqual([424, 324]);
    ops.resetCascade();
    await ops.insert(dst.tab, bytes, "p", null);
    expect(at(2)).toEqual([400, 300]);
  });

  it("déposé à un point : centre des bornes au point, sans cascade", async () => {
    const { ops } = opsOf();
    const src = tabOf();
    src.select([rectIn(src.doc, 0, 0, 100, 100)]);
    const bytes = (await ops.encodeSelection(src.tab))!;
    const dst = tabOf();
    await ops.insert(dst.tab, bytes, "x.rbitem", { x: 100, y: 50 });
    await ops.insert(dst.tab, bytes, "x.rbitem", { x: 100, y: 50 });
    const ids = dst.doc.elementIds(dst.doc.pageIds()[0]!);
    expect(centre(dst.doc, [ids[0]!])).toEqual([100, 50]);
    expect(centre(dst.doc, [ids[1]!])).toEqual([100, 50]);
  });

  it("image : octets écrits par le conteneur, adoptés par le magasin de l'onglet cible", async () => {
    const { ops } = opsOf();
    const src = tabOf();
    const i = src.doc.apply({ type: "AddImage", page: src.doc.pageIds()[0]!, asset: { id: ID, name: "a.png", mime: "image/png", size: 3 }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] }).ids[0]!;
    src.assets.adopt(ID, new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }));
    src.select([i]);
    const bytes = (await ops.encodeSelection(src.tab))!;
    expect(bytes[0]).toBe(0xfe); // conteneur avec assets
    const dst = tabOf();
    expect(await ops.insert(dst.tab, bytes, "x.rbitem", null)).toBe(true);
    expect(dst.assets.has(ID)).toBe(true);
  });

  it("un document donné pour un objet : message du cœur, rien inséré", async () => {
    const { ops, said } = opsOf();
    const dst = tabOf();
    expect(await ops.insert(dst.tab, fakeCore.blank().save(NOW, "0.1.0"), "x.rbitem", null)).toBe(false);
    expect(said).toEqual(["Ouverture impossible (x.rbitem) : ce fichier est un document RoomBoard (.roomboard), pas un objet : ouvrez-le ou insérez ses pages"]);
    expect(dst.doc.elementIds(dst.doc.pageIds()[0]!)).toEqual([]);
  });

  it("asset cité non lu (module absent) : refus, rien inséré (PC8)", async () => {
    const { ops, said } = opsOf(memoryCodec());
    const s = fakeCore.blank();
    const i = s.apply({ type: "AddImage", page: s.pageIds()[0]!, asset: { id: ID, name: "a.png", mime: "image/png", size: 3 }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] }).ids[0]!;
    const json = s.extract(s.pageIds()[0]!, [i]).saveFragment(NOW, "0.1.0", "x"); // JSON : le conteneur de test le refuse
    const dst = tabOf();
    expect(await ops.insert(dst.tab, json, "x.rbitem", null)).toBe(false);
    expect(said.at(-1)).toBe(`x.rbitem : ${UNREAD_ITEMS_MESSAGE}`);
    expect(dst.doc.elementIds(dst.doc.pageIds()[0]!)).toEqual([]);
  });

  it("onglet fermé pendant la lecture : rien inséré", async () => {
    const { ops, said } = opsOf(memoryCodec(), () => false);
    const src = tabOf();
    src.select([rectIn(src.doc, 0, 0, 10, 10)]);
    const bytes = (await ops.encodeSelection(src.tab))!;
    const dst = tabOf();
    expect(await ops.insert(dst.tab, bytes, "p", null)).toBe(false);
    expect(said).toEqual([TAB_GONE_MESSAGE]);
  });

  it("insérer des pages : pages après la page montrée, une étape ; source illisible : rien", async () => {
    const { ops, said } = opsOf();
    const s = fakeCore.blank();
    s.apply({ type: "AddPage", after: s.pageIds()[0]! });
    const dst = tabOf();
    expect(await ops.insertPages(dst.tab, { name: "b.roomboard", bytes: s.save(NOW, "0.1.0"), target: { kind: "download", name: "b.roomboard" } })).toBe(true);
    expect(dst.doc.pageIds()).toHaveLength(3);
    expect(await ops.insertPages(dst.tab, { name: "c.roomboard", bytes: new Uint8Array([1]), target: { kind: "download", name: "c.roomboard" } })).toBe(false);
    expect(said.at(-1)).toMatch(/^Ouverture impossible \(c\.roomboard\) : /);
    expect(dst.doc.pageIds()).toHaveLength(3);
    expect(SELECTION_NAME).toBe("Sélection");
  });
});
```

(Si `SaveTarget` n'accepte pas `{ kind: "download", name }`, reprendre la forme de cible utilisée par
`workspace.test.ts` l. 210-226.)

- [ ] **Étape 2 : voir rouge.** Commande de la section.

- [ ] **Étape 3 : `fragments.ts`.**

```ts
/**
 * Opérations sur la sélection d'un onglet (C3, DAZ3) : encoder la sélection en `.rbitem` ; insérer un `.rbitem` collé
 * (centre de la vue, cascade de 24 px par collage successif du même contenu, Z7) ou déposé (centre de ses bornes au
 * point) ; insérer les pages d'un `.roomboard` après la page montrée (Z12). Assets adoptés par le magasin de l'onglet ;
 * un asset cité non lu : refus (HZ2-6, PC8). Lecture et écriture par `container-io.ts`.
 */
import { anchorOf, CASCADE_STEP } from "../platform/image-import";
import type { OpenedFile, Point } from "../platform/files";
import type { ContainerIO, ReadResult } from "./container-io";
import type { TabSession } from "./workspace";

export const SELECTION_NAME = "Sélection";
export const UNREAD_ITEMS_MESSAGE = "images non lues, rien n'est inséré";
export const TAB_GONE_MESSAGE = "onglet fermé pendant la lecture, rien n'est inséré";

export interface FragmentDeps {
  readonly io: ContainerIO;
  now(): string;
  readonly appVersion: string;
  say(message: string): Promise<void>;
  alive(tab: TabSession): boolean;
}

export interface FragmentOps {
  encodeSelection(tab: TabSession): Promise<Uint8Array | null>;
  insert(tab: TabSession, rbitem: Uint8Array, name: string, at: Point | null): Promise<boolean>;
  insertPages(tab: TabSession, file: OpenedFile): Promise<boolean>;
  resetCascade(): void;
}

const sameBytes = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((v, i) => v === b[i]);

export function createFragmentOps(deps: FragmentDeps): FragmentOps {
  let last: Uint8Array | null = null;
  let cascade = 0;

  /** Refus (doc libéré) si un asset cité n'a pas été lu ou si l'onglet est fermé ; sinon assets adoptés par l'onglet. */
  async function accept(tab: TabSession, read: ReadResult, name: string): Promise<boolean> {
    if (read.unread) {
      read.doc.free();
      await deps.say(`${name} : ${UNREAD_ITEMS_MESSAGE}`);
      return false;
    }
    if (!deps.alive(tab)) {
      read.doc.free();
      await deps.say(TAB_GONE_MESSAGE);
      return false;
    }
    const { present } = read.assets.pick(read.doc.citedAssets().map((a) => a.id));
    for (const [id, blob] of present) tab.assets.adopt(id, blob);
    return true;
  }

  return {
    async encodeSelection(tab) {
      const { selection, page } = tab.board.engine.state();
      if (selection.length === 0) return null;
      const frag = tab.board.doc.extract(page, selection);
      try {
        return await deps.io.encode(frag, tab.assets, deps.now(), deps.appVersion, { kind: "fragment", name: SELECTION_NAME });
      } finally {
        frag.free();
      }
    },
    async insert(tab, rbitem, name, at) {
      const read = await deps.io.read(name, rbitem, "fragment");
      if (read === null) return false;
      if (!(await accept(tab, read, name))) return false;
      const src = read.doc;
      try {
        const page = src.pageIds()[0];
        const box = page === undefined ? null : src.bounds(src.elementIds(page));
        if (box === null) return false;
        const [ax, ay] = anchorOf(tab.board.stage.getBoundingClientRect(), tab.board.engine.camera(), at);
        let n = 0;
        if (at === null) {
          n = last !== null && sameBytes(last, rbitem) ? cascade + 1 : 0;
          last = rbitem;
          cascade = n;
        }
        const dx = ax + CASCADE_STEP * n - (box.x0 + box.x1) / 2;
        const dy = ay + CASCADE_STEP * n - (box.y0 + box.y1) / 2;
        return tab.board.engine.insertFragment(src, dx, dy) !== null;
      } finally {
        src.free();
      }
    },
    async insertPages(tab, file) {
      const read = await deps.io.read(file.name, file.bytes, "document");
      if (read === null) return false;
      if (!(await accept(tab, read, file.name))) return false;
      try {
        return tab.board.engine.insertPages(read.doc) !== null;
      } finally {
        read.doc.free();
      }
    },
    resetCascade() {
      last = null;
      cascade = 0;
    },
  };
}
```

Note : le premier test « copier puis coller » attend un centre exact `[400, 300]` : la fausse liaison translate le
`transform` et `bounds` suit ; si un arrondi flottant apparaît, comparer avec `toBeCloseTo` composante par composante
(pas d'autre tolérance).

- [ ] **Étape 4 : voir vert ; commit.** `git add apps/web/src/app/fragments.ts`, puis `apps/web/src/app/fragments.test.ts` ;
  commit (G11) `feat(app): selection operations, encode, insert fragment and pages`. Rapport : `Réutilisation : appelé
  container-io (encode, read), anchorOf, CASCADE_STEP, AssetStore.adopt`.

---

### Tâche T15 — Branchement : copier, couper, coller, exporter, insérer des pages, `.rbitem` déposé

<a id="tache-t15"></a>

**Objectif.** L'espace de travail relie presse-papiers, opérations sur la sélection, import et barre : Ctrl+C, Ctrl+X,
Ctrl+V (événements `copy`, `cut`, `paste` sur `window`), boutons de la rangée « Sélection », « Insérer des pages… »,
`.rbitem` déposé, importé ou passé au lancement ; l'état « Coller » suit le presse-papiers interne (cadrage Z8 à Z13,
Q1 ; S2, S3, S4).

**Fichiers.** Modifier `apps/web/src/app/workspace.ts`, `apps/web/src/app/workspace.test.ts`,
`apps/web/src/platform/typed-files.ts` (constante `RBITEM_TYPE`), `apps/web/src/ui/App.tsx` (hôte de la barre l. 139,
vue de la barre l. 165-167), `apps/web/src/main.ts` (création de l'espace de travail l. 79-93, écouteurs l. 109-116).

**Interfaces.**
- Consomme : T6 (`createClipboard`, `browserSystemClipboard`, `handleCopy`, `handlePaste`, `INTERNAL_ONLY_MESSAGE`,
  `NEWER_ITEMS_MESSAGE`, `TOO_BIG_ITEMS_MESSAGE`, `type Clipboard`, `type ItemsRefusal`), T7 (`createWebTypedFiles`,
  `createTauriTypedFiles`, `type TypedFiles`, `type FileType`), T8 (`createContainerIO` déjà branché), T9
  (`type SelectionAction`, `HostTargets.insertPages`, `HostTargets.selection`, `ToolbarView.canPaste`), T10
  (`ImportDeps.insertItems`, `RBITEM_EXTENSION`, `RBITEM_MIME`), T13 (`Engine.group`, `ungroup`), T14
  (`createFragmentOps`, `SELECTION_NAME`).
- Produit :

```ts
// workspace.ts
export interface WorkspaceDeps { …; /** C3 (Z8) : défaut presse-papiers interne seul. */ readonly clipboard?: Clipboard; /** C3 (Z11) : absent → « Exporter » sans effet. */ readonly itemFiles?: TypedFiles }
export interface Workspace {
  …;
  hasSelection(): boolean;
  copySelection(cut: boolean): Promise<void>;
  pasteItems(items: Uint8Array | ItemsRefusal): Promise<boolean>;
  pasteInternal(): Promise<boolean>;
  exportSelection(): Promise<boolean>;
  insertPages(): Promise<boolean>;
  selection(a: SelectionAction): void;
  canPaste(): boolean;
  onClipboard(cb: () => void): () => void;
}
// typed-files.ts
export const RBITEM_TYPE: FileType; // { extension: ".rbitem", mime: "application/x-roomboard-item", filter: { name: "Objet RoomBoard", extensions: ["rbitem"] }, accept: ".rbitem,application/x-roomboard-item" }
```

- Réutilise : `apps/web/src/app/workspace.ts:60-80` (`Workspace`), `:317` (`importFiles`) — `copySelection`, `pasteItems`, `pasteInternal`, `exportSelection`, `insertPages` (étendre).
- Réutilise : `apps/web/src/platform/files.ts:69-72` (`FileHost.open`) — appelé tel quel pour « Insérer des pages… ».
- Réutilise : `apps/web/src/platform/paste.ts` (`handlePaste`, T6) — seul écouteur `paste` ; `apps/web/src/main.ts:109-116` (écouteur unique).
- Réutilise : `apps/web/src/platform/import.ts` (T10) — `rbitemHandler` par `ImportDeps.insertItems`.
- Réutilise : `apps/web/src/platform/typed-files.ts` (T7) — `createWebTypedFiles`, `createTauriTypedFiles`.

**Test et commande bornée.**
```
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c3-groupes--T15 && pnpm install --frozen-lockfile >/dev/null
pnpm --filter @roomboard/web test -- src/app --reporter=verbose 2>&1 | grep -E "C3|×|Test Files|Tests " | tail -40
pnpm --filter @roomboard/web test 2>&1 | tail -8
pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20
```
Attendu : 0 `×`, ≥ 9 `✓ … espace de travail — C3 > …` ; suite web complète sans échec ; `tsc` sans sortie (si
`apps/web/src/wasm/` manque dans le worktree, le construire d'abord par les deux commandes Wasm de T11 ; aucun écart
nommé ne doit rester).

**Contraintes (recopiées).** G1 · G2 PATH, preuves bornées, `pnpm install --frozen-lockfile` · G3 aucun build Tauri ·
G5 tests existants de `workspace.test.ts` verts (la doublure de session gagne des champs, aucun test retiré) · G6 ·
G7 commits jejeasterix, anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, un par un, aucun push ·
G10 messages français · G11.

**Interdits.** Un seul écouteur par événement (`copy`, `cut`, `paste`) sur `window`. Un `.roomboard` déposé ouvre
toujours un onglet, jamais d'insertion de pages (Q1). Aucun format natif de la coque. Ne pas toucher `engine/`,
`platform/clipboard.ts`, `platform/paste.ts`.

**Terminé quand.** Commandes vertes, `tsc` vide, un commit `feat(app): wire copy, cut, paste, export, insert pages and rbitem drop`.

**Étapes.**

- [ ] **Étape 1 : tests rouges (`workspace.test.ts`).** Doublure de session (`fakeSession`, l. 67) : l'objet `engine`
  gagne

```ts
      state: () => ({ version: doc.version(), page: doc.pageIds()[0] ?? "", selection: [...sel] }),
      select: (ids: string[]) => { sel = ids; },
      insertFragment: (src: CoreDocument, dx: number, dy: number) => doc.insertFragment(src, doc.pageIds()[0] ?? "", dx, dy),
      insertPages: (src: CoreDocument) => doc.insertPages(src, doc.pageIds()[0] ?? ""),
      group: vi.fn(() => true),
      ungroup: vi.fn(() => true),
```

(avec `let sel: string[] = [];` en tête de `fakeSession` ; `state` remplace l'ancien, qui rendait déjà `version` et
`page`). `SetupOptions` gagne `clipboard?: WorkspaceDeps["clipboard"]` et `itemFiles?: WorkspaceDeps["itemFiles"]`,
passés tels quels à `createWorkspace`. Ajouter :

```ts
describe("espace de travail — C3", () => {
  const selectAll = (tab: TabSession): string[] => {
    const ids = tab.board.doc.elementIds(tab.board.doc.pageIds()[0]!);
    (tab.board.engine as unknown as { select(ids: string[]): void }).select(ids);
    return ids;
  };
  const rect = (tab: TabSession, x: number): string =>
    tab.board.doc.apply({ type: "AddShape", page: tab.board.doc.pageIds()[0]!, shape: "rect", x0: x, y0: 0, x1: x + 50, y1: 50, style: { color: "#000000", width: 4 }, fill: null }).ids[0]!;

  it("copier sans presse-papiers système : interne retenu, avis, Coller possible", async () => {
    const ws = await setupWorkspace();
    rect(ws.active(), 0);
    selectAll(ws.active());
    const seen = vi.fn();
    ws.onClipboard(seen);
    expect(ws.canPaste()).toBe(false);
    await ws.copySelection(false);
    expect(ws.canPaste()).toBe(true);
    expect(seen).toHaveBeenCalledTimes(1);
    expect(shell.notify).toHaveBeenCalledWith("copié dans RoomBoard seulement");
  });

  it("copier avec presse-papiers système : enveloppe écrite, aucun avis", async () => {
    const written: string[] = [];
    const ws = await setupWorkspace({ clipboard: createClipboard({ write: async (t) => void written.push(await t) }) });
    rect(ws.active(), 0);
    selectAll(ws.active());
    await ws.copySelection(false);
    expect(written[0]).toMatch(/^\{"format":"roomboard-items\/1","rbitem":"/);
    expect(shell.notify).not.toHaveBeenCalled();
  });

  it("couper : copie puis Delete, une étape", async () => {
    const ws = await setupWorkspace();
    const tab = ws.active();
    rect(tab, 0);
    selectAll(tab);
    const v = tab.board.doc.version();
    await ws.copySelection(true);
    expect(strokes(tab)).toBe(0);
    expect(tab.board.doc.version()).toBe(v + 1);
    expect(ws.canPaste()).toBe(true);
  });

  it("Coller (bouton) dans un autre onglet : ids neufs ; second collage décalé", async () => {
    const ws = await setupWorkspace();
    const a = rect(ws.active(), 0);
    selectAll(ws.active());
    await ws.copySelection(false);
    await ws.newBlank();
    const dst = ws.active();
    expect(await ws.pasteInternal()).toBe(true);
    expect(await ws.pasteInternal()).toBe(true);
    const ids = dst.board.doc.elementIds(dst.board.doc.pageIds()[0]!);
    expect(ids).toHaveLength(2);
    expect(ids).not.toContain(a);
    const b0 = dst.board.doc.bounds([ids[0]!])!;
    const b1 = dst.board.doc.bounds([ids[1]!])!;
    expect([b1.x0 - b0.x0, b1.y0 - b0.y0]).toEqual([24, 24]);
  });

  it("pasteItems : enveloppe plus récente → avis, rien inséré, pris", async () => {
    const ws = await setupWorkspace();
    expect(await ws.pasteItems("newer")).toBe(true);
    expect(shell.notify).toHaveBeenCalledWith("objets copiés par une version plus récente de RoomBoard : mettez RoomBoard à jour");
    expect(strokes(ws.active())).toBe(0);
  });

  it("exporter : Sélection.rbitem écrit par itemFiles ; sans sélection : rien", async () => {
    const save = vi.fn(async (_n: string, _b: Uint8Array) => true);
    const ws = await setupWorkspace({ itemFiles: { pick: async () => null, save } });
    expect(await ws.exportSelection()).toBe(false);
    rect(ws.active(), 0);
    selectAll(ws.active());
    expect(await ws.exportSelection()).toBe(true);
    expect(save.mock.calls[0]![0]).toBe("Sélection.rbitem");
  });

  it("insérer des pages : boîte FileHost.open, pages après la page montrée", async () => {
    const ws = await setupWorkspace();
    const src = fakeCore.blank();
    src.apply({ type: "AddPage", after: src.pageIds()[0]! });
    opening = { name: "/cours/b.roomboard", bytes: src.save(NOW, "0.1.0"), target: { kind: "download", name: "b.roomboard" } };
    expect(await ws.insertPages()).toBe(true);
    expect(ws.active().board.doc.pageIds()).toHaveLength(3);
    opening = null;
    expect(await ws.insertPages()).toBe(false);
  });

  it("un .rbitem déposé s'insère dans l'onglet actif ; un .roomboard déposé ouvre un onglet (Q1)", async () => {
    const ws = await setupWorkspace();
    const s = fakeCore.blank();
    const frag = s.extract(s.pageIds()[0]!, [s.apply({ type: "AddShape", page: s.pageIds()[0]!, shape: "rect", x0: 0, y0: 0, x1: 10, y1: 10, style: { color: "#000000", width: 4 }, fill: null }).ids[0]!]);
    codec.read.mockResolvedValueOnce({ manifest: new Uint8Array(), ybin: frag.saveFragment(NOW, "0.1.0", "x"), assets: [], warnings: [] });
    const r = await ws.importFiles([plainFile("objet.rbitem", new Uint8Array([0x50, 0x4b, 3, 4, 0]))], { x: 10, y: 10 });
    expect(r.inserted).toEqual(["objet.rbitem"]);
    expect(strokes(ws.active())).toBe(1);
    expect(ws.tabs.list()).toHaveLength(1);
    await ws.importFiles([roomboardFile("/cours/c.roomboard")], { x: 10, y: 10 });
    expect(ws.tabs.list()).toHaveLength(2);
  });

  it("un fragment ouvert comme document : message, aucun onglet", async () => {
    const ws = await setupWorkspace();
    const s = fakeCore.blank();
    const bytes = s.extract(s.pageIds()[0]!, []).saveFragment(NOW, "0.1.0", "x");
    expect(await ws.openDocument({ name: "x.roomboard", bytes, target: null })).toBe(false);
    expect(ws.tabs.list()).toHaveLength(1);
    expect(shell.notify).toHaveBeenCalledWith("Ouverture impossible (x.roomboard) : ce fichier est un objet RoomBoard (.rbitem) : déposez-le ou importez-le sur une page");
  });

  it("selection(a) : grouper et dégrouper relayés au moteur", async () => {
    const ws = await setupWorkspace();
    ws.selection("group");
    ws.selection("ungroup");
    const e = ws.active().board.engine as unknown as { group: ReturnType<typeof vi.fn>; ungroup: ReturnType<typeof vi.fn> };
    expect([e.group.mock.calls.length, e.ungroup.mock.calls.length]).toEqual([1, 1]);
  });
});
```

(Importer `createClipboard` depuis `../platform/clipboard`. Si `SaveTarget` n'admet pas `{ kind: "download", name }`,
reprendre la cible de la l. 250. Le premier onglet du test « déposé » est vierge et non modifié : un dépôt de
`.roomboard` y ouvre un second onglet, comme le test existant de Q1.)

- [ ] **Étape 2 : voir rouge.** Première commande de la section.

- [ ] **Étape 3 : `typed-files.ts`.** Ajouter :

```ts
import { RBITEM_EXTENSION, RBITEM_MIME } from "./files";

/** C3 (Z11) : objet RoomBoard exporté par « Exporter ». */
export const RBITEM_TYPE: FileType = {
  extension: RBITEM_EXTENSION,
  mime: RBITEM_MIME,
  filter: { name: "Objet RoomBoard", extensions: ["rbitem"] },
  accept: `${RBITEM_EXTENSION},${RBITEM_MIME}`,
};
```

- [ ] **Étape 4 : `workspace.ts`.** En-tête : ajouter « C3 : presse-papiers de la fenêtre (Z8), opérations sur la
  sélection de l'onglet actif (`fragments.ts`), `.rbitem` déposé ou importé inséré dans l'onglet actif (Z10), « Insérer
  des pages… » (Z12) ». Imports : `createClipboard`, `INTERNAL_ONLY_MESSAGE`, `NEWER_ITEMS_MESSAGE`,
  `TOO_BIG_ITEMS_MESSAGE`, `type Clipboard`, `type ItemsRefusal` (`../platform/clipboard`) ; `RBITEM_EXTENSION`,
  `type OpenedFile` (`../platform/files`) ; `type TypedFiles` (`../platform/typed-files`) ; `createFragmentOps`,
  `SELECTION_NAME` (`./fragments`) ; `type SelectionAction` (`./toolbar-host`). Champs de `WorkspaceDeps` et méthodes de
  `Workspace` de « Interfaces ». Après `const io = createContainerIO(…)` (T8) et après la déclaration de `released` :

```ts
  const clipboard = deps.clipboard ?? createClipboard(null);
  const fragments = createFragmentOps({ io, now: deps.now, appVersion: APP_VERSION, say, alive: (t) => !released.has(t) });
  /** Nom dit dans les messages d'un collage (aucun fichier). */
  const PASTE_NAME = "presse-papiers";
```

Dans `createImporter({ … })`, ajouter :

```ts
    insertItems: async (rbitem, name, at) => {
      const t = tabs.active()?.session;
      if (t === undefined) return false;
      return fragments.insert(t, new Uint8Array(await rbitem.arrayBuffer()), name, at);
    },
```

Dans l'objet `ws` :

```ts
    hasSelection: () => ws.active().board.engine.state().selection.length > 0,
    copySelection(cut) {
      const tab = ws.active();
      const ids = [...tab.board.engine.state().selection];
      const bytes = fragments.encodeSelection(tab).then((b) => {
        if (b === null) throw new Error("sélection vide");
        return b;
      });
      fragments.resetCascade();
      // `put` est appelé ici, sans attente : l'écriture système part pendant le geste (Z8, HZ2-3).
      return clipboard.put(bytes).then(
        async (where) => {
          if (where === "internal") await say(INTERNAL_ONLY_MESSAGE);
          if (cut && !released.has(tab)) tab.board.engine.run({ type: "Delete", ids });
        },
        async (e: unknown) => {
          await say(`Copie impossible : ${messageOf(e)}`);
        },
      );
    },
    async pasteItems(items) {
      if (items === "newer" || items === "too-big") {
        await say(items === "newer" ? NEWER_ITEMS_MESSAGE : TOO_BIG_ITEMS_MESSAGE);
        return true;
      }
      await fragments.insert(ws.active(), items, PASTE_NAME, null);
      return true; // pris : inséré, ou refusé avec avis (PC1)
    },
    async pasteInternal() {
      const last = clipboard.last();
      return last === null ? false : fragments.insert(ws.active(), last, PASTE_NAME, null);
    },
    async exportSelection() {
      const files = deps.itemFiles;
      if (files === undefined) return false;
      try {
        const bytes = await fragments.encodeSelection(ws.active());
        return bytes === null ? false : await files.save(`${SELECTION_NAME}${RBITEM_EXTENSION}`, bytes);
      } catch (e) {
        await say(`Export impossible : ${messageOf(e)}`);
        return false;
      }
    },
    async insertPages() {
      let file: OpenedFile | null;
      try {
        file = await host.open();
      } catch (e) {
        await say(`Ouverture impossible : ${messageOf(e)}`);
        return false;
      }
      if (file === null) return false;
      return fragments.insertPages(ws.active(), { ...file, name: baseName(file.name) });
    },
    selection(a) {
      const engine = ws.active().board.engine;
      if (a === "group") engine.group();
      else if (a === "ungroup") engine.ungroup();
      else if (a === "copy") void ws.copySelection(false);
      else if (a === "paste") void ws.pasteInternal();
      else void ws.exportSelection();
    },
    canPaste: () => clipboard.last() !== null,
    onClipboard: (cb) => clipboard.onChange(cb),
```

- [ ] **Étape 5 : `App.tsx`.** Dans `createLocalToolbarHost({ … })`, ajouter `insertPages: () => void ws.insertPages(),`
  et `selection: (a) => ws.selection(a),`. Après la création de `state` :

```tsx
  /** Vue de la barre (C3) : état du moteur et presse-papiers interne (bouton « Coller »). */
  const view = (): ToolbarView => {
    tick();
    return { ...state(), canPaste: ws.canPaste() };
  };
```

et `const stopClipboard = ws.onClipboard(() => bump());` (appelé dans le `onCleanup` existant). Dans `toolbarOf`,
`view={view}` au lieu de `view={state}` (la barre des pages garde `view={state}`). Importer `type ToolbarView`.

- [ ] **Étape 6 : `main.ts`.** Imports : `browserSystemClipboard`, `createClipboard`, `handleCopy`
  (`./platform/clipboard`) ; `handlePaste` (`./platform/paste`, à la place de `pastedFiles` si celui-ci y est encore) ;
  `createTauriTypedFiles`, `createWebTypedFiles`, `RBITEM_TYPE` (`./platform/typed-files`). Après `profileFiles` :

```ts
  // Objets exportés (C3, Z11) : boîte native filtrée dans la coque ; ailleurs téléchargement.
  const itemFiles =
    ports === null ? createWebTypedFiles(browserFallbackDeps(document, URL), RBITEM_TYPE) : createTauriTypedFiles(ports.dialog, ports.fs, RBITEM_TYPE);
```

Dans `createWorkspace({ … })` : `clipboard: createClipboard(browserSystemClipboard(navigator)),` et `itemFiles,`.
Écouteurs (remplacent le bloc `paste` de `pastedFiles` s'il est encore là ; si `handlePaste` y est déjà — OD80 —, garder
son bloc tel quel) :

```ts
  // Copier et couper (C3, Z8) : la sélection de l'onglet actif, hors zone éditable ; sinon la copie native suit.
  for (const [type, cut] of [["copy", false], ["cut", true]] as const) {
    window.addEventListener(type, (e) => {
      const done = handleCopy(e, workspace, cut);
      if (done === null) return;
      e.preventDefault();
      void done.catch((err: unknown) => {
        console.warn(`RoomBoard : copie abandonnée (${err instanceof Error ? err.message : String(err)})`);
      });
    });
  }
  // Collage (R19, C3, Z9) : un seul point d'entrée, objets RoomBoard d'abord, puis images ; zone de texte : collage normal.
  window.addEventListener("paste", (e) => {
    const done = handlePaste(e, workspace);
    if (done === null) return;
    e.preventDefault();
    void done.catch((err: unknown) => {
      console.warn(`RoomBoard : collage abandonné (${err instanceof Error ? err.message : String(err)})`);
    });
  });
```

- [ ] **Étape 7 : voir vert ; commit.** Trois commandes de la section. `git add` un par un :
  `apps/web/src/app/workspace.ts`, `apps/web/src/app/workspace.test.ts`, `apps/web/src/platform/typed-files.ts`,
  `apps/web/src/ui/App.tsx`, `apps/web/src/main.ts` ; commit (G11)
  `feat(app): wire copy, cut, paste, export, insert pages and rbitem drop`.

---

### Tâche T16 — Essai navigateur C3 dans `verifier.sh --e2e`, deux captures

<a id="tache-t16"></a>

**Objectif.** Un essai Playwright joue S1, S2, S3 et S5 sur l'application construite (grouper deux objets, les déplacer
ensemble, copier par Ctrl+C réel, coller par `ClipboardEvent` puis par le bouton « Coller », exporter la sélection,
la redéposer, enregistrer puis rouvrir) ; il entre dans `scripts/verifier.sh --e2e` ; deux captures sont commitées
(cadrage Z15 ; S1, S2, S3, S5).

**Fichiers.** Créer `scripts/essais/c3-groupes-navigateur.mjs`, `docs/essais/c3-groupe-selectionne.png`,
`docs/essais/c3-collage.png`. Modifier `scripts/verifier.sh` (liste `--e2e` l. 92-103),
`scripts/tests/verifier-e2e.test.sh` (liste des essais).

**Interfaces.**
- Consomme : `#stage[data-selection|data-units|data-grouped|data-bounds|data-elements|data-tool|data-camera]` (T13),
  `button[data-item="select"]`, `button[data-item="rect"]`, `button[data-selection-action="paste|export"]` (T9),
  enveloppe `roomboard-items/1` (T6).
- Réutilise : `scripts/essais/commun.mjs` (`serve`, `loadPlaywright`, `coqueCsp`, `inkIn`, `stageMouse`, `stageBox`, `item`, `frames`, `dropFile`, `TAB`, `Echec`, `VIEWPORT`, `DIST`, `ROOT`, `gitSha`) — appelés tels quels.
- Réutilise : `scripts/essais/c10a-tableau-navigateur.mjs` — gabarit de `main()` (serveur, CSP de la coque, route
  hors 127.0.0.1 refusée, horloge figée, codes de sortie 0, 1, 2) ; patron du `ClipboardEvent` synthétique de
  `feat/usage-c10b-tableau:scripts/essais/c10b-tableau-navigateur.mjs:139-147`.

**Test et commande bornée.**
```
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c3-groupes--T16 && pnpm install --frozen-lockfile >/dev/null
bash scripts/verifier.sh 2>&1 | tail -15
node scripts/essais/c3-groupes-navigateur.mjs --captures 2>&1 | tail -30
bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3
bash scripts/verifier.sh --e2e 2>&1 | tail -60
```
Attendu : « C3 groupes : OK » avec ≥ 14 lignes `ok — …` ; captures écrites ; « verifier-e2e.test.sh : OK » ;
« verifier.sh : e2e OK », « verifier.sh : OK », ligne `module Wasm : N octets` avec N ≤ 1572864 ; les essais existants
(s2, s34, fichiers, s5b, c2, c1, c10a, c9, c7b) tous « OK ».

**Preuve visuelle.** Le profil n'a pas de commande de preuve visuelle automatique : les lectures d'attributs de l'essai
font foi (`data-selection="3"`, `data-units="1"`, `data-grouped="1"`, `data-elements`, `data-bounds` décalée) ; puis
décrire les deux captures dans le rapport (un cadre unique autour des trois objets groupés ; deux copies collées, la
seconde décalée de 24 px, sélectionnées, rangée « Sélection » visible).

**Contraintes (recopiées).** G2 PATH, preuves bornées · G3 aucun build Tauri ni Android (`verifier.sh` n'en lance pas) ·
G4 plafond Wasm 1 572 864 octets ni baissé ni relevé ; formats ≤ 3 145 728 · G5 aucun essai existant retiré ou
affaibli ; `verifier.sh --e2e` ne passe aucune option de capture · G6 aucune dépendance (Playwright déjà employé) ·
G7 commits jejeasterix, anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, un par un, aucun push ·
G11.

**Interdits.** Aucune requête hors 127.0.0.1. Ne pas modifier `commun.mjs` (OD80 le modifie). Aucun build Tauri. Ne pas
réécrire les captures d'autres essais.

**Terminé quand.** `verifier.sh --e2e` vert, deux PNG commités, un commit
`test(e2e): C3 groups, clipboard, export and reopen browser scenario`.

**Étapes.**

- [ ] **Étape 1 : l'essai.** `scripts/essais/c3-groupes-navigateur.mjs`, en-tête au modèle de C10a (« Essai C3 groupes
  au navigateur (S1, S2, S3, S5 du cadrage) … Usage : node scripts/essais/c3-groupes-navigateur.mjs [--captures] »),
  `LABEL = "C3 groupes"`, `FIXED = new Date("2026-11-20T08:00:00.000Z")`, `main()` repris de C10a à trois différences
  près : `mkdtemp(join(tmpdir(), "roomboard-c3-"))` ; après `browser.newContext(…)`,
  `await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: \`http://127.0.0.1:${port}\` });` ;
  appel de `scenario(page, url, { captures, tmp })`. Le scénario :

```js
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
  const waitAttr = (name, v) =>
    page
      .waitForFunction(([n, v]) => document.querySelector("#stage")?.getAttribute(n) === v, [name, v], { timeout: 15000 })
      .catch(async () => {
        throw new Echec(`${name} attendu « ${v} », lu « ${await attr(name)} »`);
      });
  const bounds = async () => ((await attr("data-bounds")) ?? "").split(",").map(Number);
  const elements = async () => Number(await attr("data-elements"));
  const drag = async (x0, y0, x1, y1) => {
    await mouse.move(x0, y0);
    await mouse.down();
    await mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 });
    await mouse.move(x1, y1, { steps: 4 });
    await mouse.up();
    await fr();
  };
  const shot = async (name) => {
    if (!captures) return;
    await fr();
    const path = join(ROOT, "docs", "essais", name);
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  };

  await page.goto(url);
  await page.waitForSelector("#stage");
  await fr();

  // S1 : deux rectangles et un trait, puis rectangle de sélection autour des trois.
  await page.click(item("rect"));
  await drag(120, 120, 220, 200);
  await drag(260, 120, 360, 200);
  await page.click(item("pen"));
  await drag(120, 260, 360, 260);
  await waitAttr("data-elements", "3");
  await page.click(item("select"));
  await fr();
  await drag(90, 90, 400, 300);
  await waitAttr("data-selection", "3");
  check((await attr("data-units")) === "3" && (await attr("data-grouped")) === "0", "S1 : trois objets sélectionnés, trois unités, aucun groupe");
  await page.keyboard.press("Control+g");
  await waitAttr("data-grouped", "1");
  check((await attr("data-units")) === "1", 'S1 : Ctrl+G : data-units="1", data-grouped="1"');
  await page.keyboard.press("Escape");
  await waitAttr("data-selection", "0");
  await mouse.click(170, 160);
  await waitAttr("data-selection", "3");
  check(true, "S1 : un clic sur un rectangle prend les trois objets du groupe");
  await shot("c3-groupe-selectionne.png");
  const before = await bounds();
  await drag(170, 160, 270, 210);
  const cam = ((await attr("data-camera")) ?? "").split(",").map(Number);
  const moved = await bounds();
  const dx = (moved[0] - before[0]) * cam[0];
  check(Math.abs(dx - 100) < 2 && (await attr("data-selection")) === "3", `S1 : glisser : les trois bougent ensemble (Δx écran ${dx.toFixed(1)} px)`);
  await page.keyboard.press("Control+z");
  await page.waitForFunction((b) => document.querySelector("#stage")?.getAttribute("data-bounds") === b, before.join(","), { timeout: 15000 }).catch(() => undefined);
  check((await bounds()).join(",") === before.join(","), "S1 : Annuler une fois : les trois reviennent");

  // S2 : Ctrl+C réel, enveloppe relue dans le presse-papiers système.
  await mouse.click(170, 160);
  await waitAttr("data-selection", "3");
  await page.keyboard.press("Control+c");
  const envelope = await page
    .waitForFunction(async () => {
      const t = await navigator.clipboard.readText();
      return t.startsWith('{"format":"roomboard-items/1","rbitem":"') ? t : null;
    }, null, { timeout: 15000, polling: 250 })
    .then((h) => h.jsonValue())
    .catch(() => null);
  check(typeof envelope === "string", "S2 : Ctrl+C : le presse-papiers système porte {\"format\":\"roomboard-items/1\",\"rbitem\":…}");

  // S2 : coller (ClipboardEvent porteur de l'enveloppe), deux fois, puis Annuler, puis le bouton « Coller ».
  const n0 = await elements();
  const paste = () =>
    page.evaluate((text) => {
      const dt = new DataTransfer();
      dt.setData("text/plain", text);
      document.body.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    }, envelope);
  await paste();
  await waitAttr("data-elements", String(n0 + 3));
  check((await attr("data-tool")) === "select" && (await attr("data-selection")) === "3" && (await attr("data-units")) === "1", "S2 : collé : trois objets neufs, sélectionnés, toujours groupés");
  const b1 = await bounds();
  await paste();
  await waitAttr("data-elements", String(n0 + 6));
  const b2 = await bounds();
  check(Math.abs(b2[0] - b1[0] - 24) < 0.2 && Math.abs(b2[1] - b1[1] - 24) < 0.2, "S2 : second collage décalé de 24 px");
  await shot("c3-collage.png");
  await page.keyboard.press("Control+z");
  await waitAttr("data-elements", String(n0 + 3));
  check(true, "S2 : Annuler retire un collage");
  await page.click('button[data-selection-action="paste"]');
  await waitAttr("data-elements", String(n0 + 6));
  check(true, "S2 : le bouton « Coller » colle depuis le presse-papiers interne");

  // S3 : exporter la sélection, puis la redéposer.
  const dl = page.waitForEvent("download");
  await page.click('button[data-selection-action="export"]');
  const download = await dl;
  check(download.suggestedFilename() === "Sélection.rbitem", "S3 : « Exporter » propose Sélection.rbitem");
  const file = join(tmp, "Sélection.rbitem");
  await download.saveAs(file);
  const bytes = await readFile(file);
  check(bytes[0] === 0x50 && bytes[1] === 0x4b, "S3 : le fichier exporté est un ZIP (PK)");
  const n1 = await elements();
  await dropFile(page, "#stage", "Sélection.rbitem", bytes, "application/x-roomboard-item");
  await waitAttr("data-elements", String(n1 + 3));
  check((await attr("data-units")) === "1", "S3 : déposé : un groupe neuf de trois objets");

  // S5 : enregistrer, rouvrir, le groupe est là.
  const save = page.waitForEvent("download");
  await page.keyboard.press("Control+s");
  const saved = join(tmp, "c3.roomboard");
  await (await save).saveAs(saved);
  const tabs = await page.locator(TAB).count();
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Control+o");
  await (await chooser).setFiles(saved);
  await page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, tabs + 1, { timeout: 15000 });
  await fr();
  await page.click(item("select"));
  await fr();
  await mouse.click(170, 160);
  await waitAttr("data-selection", "3");
  check((await attr("data-grouped")) === "1", "S5 : enregistré puis rouvert : un clic prend les trois objets groupés");
  check(errors.length === 0, `aucune erreur dans la page${errors.length > 0 ? ` : ${errors.join(" | ")}` : ""}`);
}
```

Imports : `import { existsSync } from "node:fs"; import { mkdtemp, readFile, rm } from "node:fs/promises";` et ceux de
`commun.mjs` listés en « Interfaces ». Points d'appui : `stageMouse` (`commun.mjs:103`) expose `move(x, y, o)`,
`click(x, y)`, `down()`, `up()` en px de scène ; `hit_test` du cœur prend l'intérieur d'une forme (test pair-impair,
`query.rs:192`), donc un clic en (170, 160) touche le premier rectangle ; `dropFile` (`commun.mjs:136`) dépose au point
(50, 50) de la cible. Le point de clic après le glisser de S1 vise la position **avant** déplacement, rétablie par
Ctrl+Z.

- [ ] **Étape 2 : brancher.** `scripts/verifier.sh`, après `node scripts/essais/c7b-texte-riche-navigateur.mjs` :
  `node scripts/essais/c3-groupes-navigateur.mjs`. `scripts/tests/verifier-e2e.test.sh` : ajouter
  `c3-groupes-navigateur` à la liste `for s in …`.

- [ ] **Étape 3 : jouer.** Commandes de la section dans l'ordre (le premier `verifier.sh` construit `apps/web/dist` ;
  la ligne `--captures` écrit les deux PNG).

- [ ] **Étape 4 : commit.** `git add` un par un : `scripts/essais/c3-groupes-navigateur.mjs`, `scripts/verifier.sh`,
  `scripts/tests/verifier-e2e.test.sh`, `docs/essais/c3-groupe-selectionne.png`, `docs/essais/c3-collage.png` ; commit
  (G11) `test(e2e): C3 groups, clipboard, export and reopen browser scenario`. Rapport : sortie `tail` de
  `verifier.sh --e2e`, taille du module Wasm, description des deux captures.
