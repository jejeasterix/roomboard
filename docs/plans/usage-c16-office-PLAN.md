# Plan d'exécution — usage-c16-office (C16 : Word, Excel, PowerPoint)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Cœur et liaison : clé `original` du fond, `from_office_pages`, contrat des deux liaisons, fichier d'avant C16 | — | `crates/roomboard-core/src/document.rs`, `crates/roomboard-core/src/element.rs`, `crates/roomboard-core/src/commands.rs` (un appel de test), `crates/roomboard-core/tests/compat_c12.rs` (neuf), `crates/roomboard-core/tests/fixtures/pdf-c12.roomboard` (neuf), `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/api.ts`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/fake-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts`, `apps/web/src/engine/render/canvas2d.test.ts` (un littéral) | isolé (`~/projets/roomboard-wt/usage-c16-office--T1`) | concepteur-critique | `nice -n 10 cargo test -p roomboard-core -p roomboard-wasm 2>&1 \| grep -E "test result\|FAILED\|panicked\|error\[\|original\|compat_c12" \| tail -40` : 0 `FAILED`, présents `from_pdf_pages_with_original_cites_it_on_every_page`, `insert_pages_and_encode_carry_the_original`, `backdrop_view_keeps_only_a_conforming_original`, `pdf_c12_fixture_opens_without_original_and_resaves_identically`, `from_pdf_pages_inner_with_original_sets_it_on_each_backdrop` ; vitest contrat sous `ROOMBOARD_WASM_REQUIRED=1` : « contrat C16 » 5 tests × 2 fabriques + « contrôle de forme C16 » 1, 0 échec ; `tsc` vide ; `roomboard_wasm_bg.wasm` ≤ 1 572 864 o | S5 | [#tache-t1](#tache-t1) |
| T2 | Coque : fondations de `office.rs` (extensions, en-têtes, recherche, arguments, URL du profil, dossier privé, profil jetable, erreurs), `GrantedPaths::revoke`, dépendances | — | `crates/roomboard-shell/Cargo.toml`, `Cargo.lock`, `crates/roomboard-shell/src/lib.rs`, `crates/roomboard-shell/src/office.rs` (neuf) | isolé (`…--T2`) | implementeur-tdd | `nice -n 10 cargo test -p roomboard-shell 2>&1 \| grep -E "^test \|test result\|FAILED\|panicked\|error\[" \| tail -40` : 0 `FAILED`, ≥ 8 tests `office::tests::` dont `find_converter_prefers_path_then_known_paths`, `profile_has_the_six_values`, `file_url_escapes_and_handles_windows_drives`, `private_dir_refuses_symlink_file_and_foreign_owner`, et `tests::revoke_removes_the_grant` ; `cargo clippy -p roomboard-shell --all-targets -- -D warnings` sans avertissement ; `node scripts/controle-licences.mjs` code 0 | S1, S2 | [#tache-t2](#tache-t2) |
| T3 | Coque : conversion réelle, délai et arbre tué, sortie contrôlée, libération et purge, fichiers d'essai, exemple `convertir_office` | T2 | `crates/roomboard-shell/src/office.rs`, `crates/roomboard-shell/tests/fixtures/cours.docx` (neuf), `crates/roomboard-shell/tests/fixtures/diapos.pptx` (neuf), `crates/roomboard-shell/tests/fixtures/notes.xlsx` (neuf), `crates/roomboard-shell/examples/convertir_office.rs` (neuf) | isolé (`…--T3`) | concepteur-critique | `nice -n 10 cargo test -p roomboard-shell office:: 2>&1 \| grep -E "^test \|test result\|FAILED\|panicked" \| tail -40` : 0 `FAILED`, ≥ 17 tests dont `real_libreoffice_converts_docx_pptx_xlsx`, `timeout_kills_the_launcher_and_its_child`, `hostile_name_never_reaches_the_arguments`, `symlinked_output_is_refused`, `ungranted_file_is_refused_before_any_process`, `corrupt_docx_fails_and_leaves_nothing`, `release_conversion_ignores_foreign_ids` ; `cargo run -q -p roomboard-shell --example convertir_office -- crates/roomboard-shell/tests/fixtures/diapos.pptx /tmp/c16-T3/diapos.pdf` puis `head -c 5` = `%PDF-` | S1, S2, S4 | [#tache-t3](#tache-t3) |
| T4 | Coque : COM Word, Excel, PowerPoint sous `cfg(windows)` (prouvé par lecture) | T2 | `crates/roomboard-shell/src/office/com.rs` (neuf) | isolé (`…--T4`) | implementeur-tdd | lecture : liste de contrôle des 8 points de la section, chaque point cité `com.rs:ligne` au rapport ; `nice -n 10 cargo test -p roomboard-shell 2>&1 \| grep -E "test result\|FAILED" \| tail -5` : 0 `FAILED` ; `rustup target list --installed \| grep -c windows` = 0 (aucun `cargo check` Windows possible) | S1 | [#tache-t4](#tache-t4) |
| T5 | Coque : copies d'originaux (`originals.rs`) : nom assaini, extension et en-tête, relevé taille + date, purge, en-tête décodé | T2 | `crates/roomboard-shell/src/originals.rs` (neuf), `crates/roomboard-shell/src/lib.rs` (une ligne) | isolé (`…--T5`) | implementeur-tdd | `nice -n 10 cargo test -p roomboard-shell originals:: 2>&1 \| grep -E "^test \|test result\|FAILED\|panicked" \| tail -20` : 0 `FAILED`, ≥ 7 tests dont `safe_name_whitelist_reserved_and_length`, `write_needs_office_extension_and_magic`, `changed_reports_each_stable_save_once`, `purge_removes_old_copies_only` ; clippy sans avertissement | S2, S5 | [#tache-t5](#tache-t5) |
| T6 | Coque Tauri : commandes minces, état Office, relevé, purge au lancement ; preuve par lecture ; contrôle hors ligne ; avis de tiers ; fiches de plateforme | T3, T5 | `apps/desktop/src-tauri/src/main.rs`, `apps/desktop/src-tauri/Cargo.lock`, `apps/desktop/src-tauri/capabilities/default.json` (description), `crates/roomboard-shell/tests/coque_c16.rs` (neuf), `scripts/controle-hors-ligne.mjs`, `scripts/tests/controle-hors-ligne.test.sh`, `THIRD_PARTY_NOTICES.md`, `docs/essais/coque-windows.md`, `docs/essais/coque-macos.md` | isolé (`…--T6`) | implementeur-tdd | `nice -n 10 cargo test -p roomboard-shell --test coque_c16 2>&1 \| tail -8` : « 4 passed » ; `bash scripts/tests/controle-hors-ligne.test.sh 2>&1 \| tail -2` : « N+4 cas OK » (N lu avant) ; `rustfmt --edition 2021 --check apps/desktop/src-tauri/src/main.rs` vide ; `grep -c '^name = "open"' apps/desktop/src-tauri/Cargo.lock` = 1 ; `node scripts/controle-licences.mjs` code 0 ; `cargo test -p roomboard-shell` 0 `FAILED` | S5 | [#tache-t6](#tache-t6) |
| T7 | Page : gestionnaires `office` et `office-web`, en-têtes ZIP/CFB, messages, marque de conversion ; registre | — | `apps/web/src/platform/office-import.ts` (neuf), `apps/web/src/platform/office-import.test.ts` (neuf), `apps/web/src/platform/import.ts`, `apps/web/src/platform/import.test.ts` | isolé (`…--T7`) | implementeur-tdd | `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/office-import.test.ts src/platform/import.test.ts --reporter=verbose 2>&1 \| grep -E "C16\|Tests \|Test Files\|FAIL\|×" \| tail -30` : 0 `×`, « office-import (C16) » ≥ 9 tests, « registre C16 » 4 tests ; `pnpm --filter @roomboard/web exec tsc --noEmit` vide | S3, S5 | [#tache-t7](#tache-t7) |
| T8 | Barre : action « Modifier dans l'application d'origine », capacité `officeConverter` | — | `apps/web/src/toolbar.ts`, `apps/web/src/toolbar-profiles.ts`, `apps/web/src/toolbar-profiles.test.ts`, `apps/web/src/app/toolbar-host.ts`, `apps/web/src/app/toolbar-host.test.ts`, `apps/web/src/runtime-capabilities.ts`, `apps/web/src/runtime-capabilities.test.ts`, `apps/web/src/ui/Toolbar.test.tsx` | isolé (`…--T8`) | implementeur-tdd | `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/toolbar.test.ts src/toolbar-profiles.test.ts src/app/toolbar-host.test.ts src/runtime-capabilities.test.ts src/ui/Toolbar.test.tsx --reporter=verbose 2>&1 \| grep -E "C16\|Tests \|Test Files\|FAIL\|×" \| tail -20` : 0 `×`, ≥ 5 tests « C16 » ; `tsc` vide | S3, S5 | [#tache-t8](#tache-t8) |
| T9 | Espace de travail : PDF converti avec original, « Modifier », réimport, repli `.xlsx` | T1, T7 | `apps/web/src/app/workspace.ts`, `apps/web/src/app/workspace.test.ts` | isolé (`…--T9`) | implementeur-tdd | `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app/workspace.test.ts --reporter=verbose 2>&1 \| grep -E "C16\|C12\|Tests \|Test Files\|FAIL\|×" \| tail -30` : 0 `×`, « Office (C16) » ≥ 7 tests, cas « PDF (C12) » verts ; `tsc` vide | S5 | [#tache-t9](#tache-t9) |
| T10 | Ports de la coque et amorce : `host-tauri.ts`, `main.ts`, `App.tsx`, curseur d'attente | T7, T8, T9 | `apps/web/src/platform/host-tauri.ts`, `apps/web/src/platform/host-tauri.test.ts`, `apps/web/src/main.ts`, `apps/web/src/ui/App.tsx`, `apps/web/src/ui/rb.css` | isolé (`…--T10`) | implementeur-tdd | `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/host-tauri.test.ts --reporter=verbose 2>&1 \| grep -E "C16\|Tests \|Test Files\|FAIL\|×" \| tail -20` : 0 `×`, « Office (C16) » ≥ 5 tests ; `nice -n 10 pnpm --filter @roomboard/web build 2>&1 \| tail -5` sans erreur | S5 | [#tache-t10](#tache-t10) |
| T11 | Essai navigateur C16, `verifier.sh --e2e`, capture S4, vérification complète | T3, T6, T10 | `scripts/essais/c16-office-navigateur.mjs` (neuf), `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/c16-pptx-libreoffice.png` (neuf) | isolé (`…--T11`) | implementeur-tdd | `nice -n 10 bash scripts/verifier.sh --e2e 2>&1 \| tail -80` : « C16 Office : OK », « verifier.sh : e2e OK », « verifier.sh : OK », `module Wasm : N octets` (N ≤ 1 572 864), `module formats : 3100845 octets` ; `node scripts/essais/c16-office-navigateur.mjs --captures` : « S4 : … data-page="1/2" », `docs/essais/c16-pptx-libreoffice.png` présent | S3, S4 | [#tache-t11](#tache-t11) |

**Vagues (fichiers disjoints dans chaque vague).**

| vague | tâches en parallèle | condition |
|---|---|---|
| V1 | T1, T2, T7, T8 | aucune |
| V2 | T3, T4, T5 (dès T2) ; T9 (dès T1 et T7) | — |
| V3 | T6 (dès T3 et T5) ; T10 (dès T7, T8, T9) | — |
| V4 | T11 | T3, T6, T10 fusionnées |

Fichiers repris d'une vague à l'autre (jamais en parallèle) : `crates/roomboard-shell/src/office.rs` (T2 puis T3),
`crates/roomboard-shell/src/lib.rs` (T2 puis T5). `Cargo.lock` (racine) n'est touché que par T2.
Chemin critique : T1 (≈ 45 min) → T9 (≈ 35) → T10 (≈ 30) → T11 (≈ 35) ≈ 2 h 25 ; branche Rust : T2 (≈ 30) → T3
(≈ 45) → T6 (≈ 35) → T11 ≈ 2 h 25.

**Spec :** `docs/plans/usage-c16-office-cadrage.md` (commit `1940c77`, base `origin/main` @ `41342b0`).

**Goal :** un fichier Word, Excel ou PowerPoint déposé dans la coque est converti en PDF par LibreOffice (ou Microsoft
Office par COM sous Windows), ouvert comme un PDF dans un nouvel onglet avec l'original gardé, modifiable dans
l'application d'origine puis réimporté ; sur le web, il est refusé avec « exportez en PDF depuis Office », sauf le
`.xlsx` lu en valeurs.

**Architecture :** conversion et copies d'originaux dans `roomboard-shell` (modules `office` et `originals`, testés hors
de Tauri, DA-O1) ; `main.rs` ne fait qu'appeler ; l'original est cité par chaque fond `pdf-page` (clé `original`,
DA-O2) ; relevé des enregistrements en Rust (DA-O3) ; ouverture par la crate `open` depuis Rust (DA-O4) ; au délai,
arbre de processus tué (DA-O5). Côté page : gestionnaires `office` / `office-web` placés avant `sheet` dans le registre
unique `importFiles` (U23).

**Tech Stack :** Rust (yrs, wasm-bindgen, libc, windows 0.62.2, open 5.4.5, zip en test), TypeScript, Solid, Vitest,
Playwright, LibreOffice 26.2 (`/usr/bin/soffice`, programme externe).

## Choix du plan (hors cadrage, à relire)

- PC1 `convert_granted(g, path, c: Option<&Converter>, work_root, timeout)` (cadrage : `c: &Converter`) : sans
  convertisseur, la même fonction rend `NoProgram`, testé (S2) ; la commande Tauri passe `office.converter.as_ref()`.
- PC2 Ajouts à l'interface du cadrage : `office::purge_conversions(work_root)` (O23), `office::office_extension(path)`,
  `office::has_office_magic(ext, head)`, `office::write_profile(profile)`, `Originals::name_of(id)` (charge utile de
  l'événement), `originals::decode_name(header)` (en-tête `x-roomboard-name` encodé en pourcentage),
  `WorkspaceDeps.reimportOriginal?(id)` (la réponse « oui » d'O22 a besoin d'un port).
- PC3 `verifier-e2e.test.sh` : le nom `c16-office-navigateur` est contrôlé sur une **ligne à part**, pas dans la liste
  partagée de la ligne 13 : le conflit sûr avec C13 prévu par O33 n'a plus lieu.
- PC4 `withConversionMark(root)` (O25) vit dans `office-import.ts` et enrobe `convertOffice` dans `main.ts` ; la règle
  `cursor: progress` va dans `ui/rb.css`.
- PC5 « Modifier dans l'application d'origine » entre dans la barre des pages de `defaut` et `annotation`, **avant**
  « Exporter en PDF… » (qui reste en dernier, test C12 inchangé), pas dans `simple`.
- PC6 S3 dépose `crates/roomboard-formats/tests/fixtures/valeurs.xlsx` (fixture de C10b, lue par le vrai lecteur) pour
  le `.xlsx` en valeurs ; `notes.xlsx` (C16) sert aux conversions Rust et aux tests de l'interface.
- PC7 Aucune fixture C12 n'existe (`crates/roomboard-core/tests/fixtures/` n'a pas de document PDF) : T1 l'écrit
  d'abord avec le code d'avant C16 (`pdf-c12.roomboard`), puis change la signature.
- PC8 `stemOf` de `workspace.ts:51` n'est pas modifié : `officeStemOf(name)` (T7) donne la racine d'un nom Office.
- PC9 Sous Windows, `purge_conversions` ne sait pas si un PID vit encore : les restes d'une autre session sont
  supprimés (deux RoomBoard ouverts à la fois sous Windows : la purge du second peut retirer une conversion en cours du
  premier ; rare, réversible).
- PC10 Pré-essai du planificateur, hors dépôt (`/tmp`), sur la VM : LibreOffice 26.2.6.3 convertit les trois fichiers
  minimaux de T3 (`.pptx` de 2 diapositives → `/Type/Page/` ×2, `/Count 2`) en 1,2 s ; accepte le profil aux six
  valeurs ; un `.docx` abîmé rend le code 1 et « Error: source file could not be loaded ». HO2-9 est levée pour la VM.
- PC11 La boîte « Importer » (`IMPORT_EXTENSIONS`, `files.ts`) n'offre pas les extensions Office : hors carte d'impact
  du cadrage, laissé tel quel (dépôt et lancement seulement).
- PC12 Écarts à la carte des tests du cadrage : les deux tests de configuration prévus dans `roomboard-shell/src/lib.rs`
  (`:344-419`) vivent dans `crates/roomboard-shell/tests/coque_c16.rs` (même `include_str!`, `lib.rs` reste à T2 et T5) ;
  `toolbar.test.ts:172` n'est pas modifié (le libellé d'`edit-original` est testé dans `app/toolbar-host.test.ts`, la
  liste des capacités ne change pas).

## Global Constraints

- GC1 TDD : chaque test est écrit et vu rouge avant le code qui le fait passer.
- GC2 Preuves bornées, qui montrent qu'un test a tourné (N ≥ 1, nom attendu présent) : `nice -n 10 cargo test -p
  roomboard-shell … 2>&1 | tail -20`, `nice -n 10 pnpm --filter @roomboard/web … 2>&1 | tail -20`.
- GC3 Une conversion LibreOffice à la fois dans les tests : verrou `CONVERT_LOCK` de `convert_granted` (les faux
  convertisseurs sont écrits sous ce verrou).
- GC4 Les tests qui exigent `soffice` échouent s'il manque avec « soffice introuvable : installez LibreOffice, ou posez
  ROOMBOARD_SANS_SOFFICE=1 pour sauter ce test » ; seul `ROOMBOARD_SANS_SOFFICE=1` les saute, en l'écrivant sur
  `stderr` ; `verifier.sh` et la CI ne posent jamais cette variable.
- GC5 Aucun build Tauri, aucune installation de paquet système, aucune dépendance GPL, LGPL ou AGPL liée.
- GC6 Module Wasm `formats` : rien n'y entre ; plafonds 1 572 864 o (principal) et 3 145 728 o (formats) inchangés.
- GC7 Sécurité : aucun shell, arguments en liste, chemins contrôlés dans le dossier de travail, arbre de processus tué
  au délai de 120 s (délai injectable pour le test), profil jetable supprimé ; un test par cas.
- GC8 Branche COM sous `cfg(windows)`, prouvée par lecture ; commandes Tauri minces dans `main.rs`, prouvées par lecture
  (src-tauri hors du workspace).
- GC9 Geste Playwright ajouté à `verifier.sh --e2e` : `.docx` et `.pptx` générés → « exportez en PDF depuis Office » ;
  `.xlsx` → tableau en valeurs ; enregistrer puis rouvrir ; un test mesure la scène ≥ 640 px.
- GC10 Capture `docs/essais/c16-pptx-libreoffice.png` (S4) : un `.pptx` fabriqué, converti par `/usr/bin/soffice` sur
  la VM, PDF déposé dans le navigateur, pages importées.
- GC11 Compatibilité : un `.roomboard` d'avant C16 s'ouvre toujours (test).
- GC12 Coexistence avec C13 (`feat/usage-c13-lot1-svg-iwb-ubz`) : `apps/web/src/platform/import.ts`, `workspace.ts`,
  `main.ts`, `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `THIRD_PARTY_NOTICES.md` : nos ajouts
  s'insèrent aux endroits nommés, sans réécrire ni déplacer l'existant.
- GC13 Git : fichiers ajoutés un par un (jamais `git add -A`, `--all` ou `.`), pas de `commit -a`, aucun push forcé,
  aucun tag ; message de commit en anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC14 Commentaires et messages en français ; identifiants en anglais ; `cargo fmt` et `clippy -D warnings` propres
  sur les crates touchées.

## Review Focus

1. Extension en majuscules (`COURS.DOCX`, `Notes.Xlsm`) : reconnue partout, copiée sous `source.docx` (O1, O2) —
   tests `office_extension_and_magic` (T2) et « isOfficeFile : extension ET en-tête, casse ignorée » (T7).
2. `.docx` abîmé à en-tête ZIP valide : conversion en échec, « Import impossible (<nom>) : la conversion en PDF a
   échoué », aucun dossier restant (O14, O23) — tests `corrupt_docx_fails_and_leaves_nothing` (T3) et « codes de la
   coque → messages » (T7).
3. Lecture du PDF converti en échec, ou identifiant de conversion hostile : `release_conversion` est appelé quand même,
   et `../x` ne supprime rien (O35, O9) — tests « lecture du PDF en échec : release_conversion appelé quand même » (T10)
   et `release_conversion_ignores_foreign_ids` (T3).
4. « Insérer des pages » d'un document converti : l'original suit dans le document hôte (HO2-10) — tests
   `insert_pages_and_encode_carry_the_original` (T1) et « Insérer des pages … emporte l'original » (T1, contrat).
5. Deuxième enregistrement dans Word après un premier réimport, ou réponse « Non » : la question revient au
   changement suivant, la surveillance continue (O21, O22) — tests `changed_reports_each_stable_save_once` (T5) et
   « oui : reimportOriginal(id) seul … non : rien » (T9).

## Carte des fichiers

| fichier | responsabilité | tâche |
|---|---|---|
| `crates/roomboard-core/src/element.rs` | `BackdropView.original`, lecture et filtre de la clé | T1 |
| `crates/roomboard-core/src/document.rs` | `from_pdf_pages(…, original)` | T1 |
| `crates/roomboard-core/tests/compat_c12.rs` + fixture | fichier d'avant C16 | T1 |
| `crates/roomboard-wasm/src/lib.rs` | `from_office_pages`, `from_pdf_pages_inner(…, original)` | T1 |
| `apps/web/src/core/{api,wasm-core,fake-core}.ts` | `fromPdfPages(…, original?)`, `BackdropView.original` | T1 |
| `crates/roomboard-shell/src/office.rs` | extensions, recherche, arguments, dossier, profil, délai, conversion, libération, purge | T2, T3 |
| `crates/roomboard-shell/src/office/com.rs` | Word, Excel, PowerPoint par COM (`cfg(windows)`) | T4 |
| `crates/roomboard-shell/src/originals.rs` | copies d'originaux, nom assaini, relevé, purge | T5 |
| `crates/roomboard-shell/examples/convertir_office.rs` | conversion en ligne de commande (S4) | T3 |
| `apps/desktop/src-tauri/src/main.rs` | cinq commandes minces, état Office, fil de relevé, purge au lancement | T6 |
| `crates/roomboard-shell/tests/coque_c16.rs` | preuve par lecture de `main.rs`, `Cargo.toml`, capacités | T6 |
| `apps/web/src/platform/office-import.ts` | gestionnaires `office`, `office-web`, en-têtes, libellés, marque de conversion | T7 |
| `apps/web/src/platform/import.ts` | registre : entrée Office avant `sheet`, `ImportDeps` | T7 |
| `apps/web/src/{toolbar,toolbar-profiles,runtime-capabilities}.ts`, `app/toolbar-host.ts` | action et capacité | T8 |
| `apps/web/src/app/workspace.ts` | `openPdf` avec original, `editOriginal`, réimport | T9 |
| `apps/web/src/platform/host-tauri.ts`, `main.ts`, `ui/App.tsx`, `ui/rb.css` | ports de la coque, amorce, curseur | T10 |
| `scripts/essais/c16-office-navigateur.mjs` | S3, S4 au navigateur | T11 |

## Restes de plateforme (hors tâches, pour l'état)

R1 Linux (coque construite), R2 Windows (file d'attente du PC, fiche `docs/essais/coque-windows.md` § 8), R3 macOS
(fiche `docs/essais/coque-macos.md` § 8) ; HO2-11 : `main.rs` et `com.rs` sont compilés pour la première fois à ces
essais.

---

<a id="tache-t1"></a>
### Tâche T1 — Cœur et liaison : clé `original` du fond, `from_office_pages`, contrat des deux liaisons, fichier d'avant C16

**Objectif.** Un document fait d'un PDF converti cite l'original Office dans chaque fond `pdf-page` (clé facultative
`original`, O16, O17, DA-O2) ; les deux liaisons (Wasm et fausse) rendent `backdrop.original` (`string | null`) ; un
`.roomboard` d'avant C16 s'ouvre et se réenregistre à l'identique (O18). Scénario : S5.

**Fichiers.**
- Créer : `crates/roomboard-core/tests/compat_c12.rs`, `crates/roomboard-core/tests/fixtures/pdf-c12.roomboard`
- Modifier : `crates/roomboard-core/src/element.rs:52-63` (`BackdropView`), `:383-414` (`RawBackdrop`, `read_backdrop`),
  `:423-445` (`backdrop_view`), `:452-466` (aide de test `raw`) ; `crates/roomboard-core/src/document.rs:148-189`
  (`from_pdf_pages`) et ses tests `:1570-1690` ; `crates/roomboard-core/src/commands.rs:2953` (un appel de test) ;
  `crates/roomboard-wasm/src/lib.rs:480-490` et `:1416-1428`, test `:2810-2827` ; `apps/web/src/core/api.ts:302-311`,
  `:394-397` ; `apps/web/src/core/wasm-core.ts:309-315`, `:708-709` ; `apps/web/src/core/fake-core.ts:384-399`,
  `:1903-1919` ; `apps/web/src/core/wasm-core.contract.test.ts` (lignes 166, 736, 2752 + blocs neufs) ;
  `apps/web/src/engine/render/canvas2d.test.ts:1006`.

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit (T9 s'en sert) :
  - Rust : `pub fn from_pdf_pages(asset: &AssetRef, sizes: &[(f64, f64)], original: Option<&AssetRef>) -> Result<Document, CommandError>` ;
    `pub struct BackdropView { pub asset, pub kind, pub page, pub w, pub h, pub fit, pub rect, pub original: Option<String> }`.
  - Wasm : `Document::from_office_pages(id: &str, name: &str, mime: &str, size: f64, sizes: Vec<f64>, original_id: &str, original_name: &str, original_mime: &str, original_size: f64) -> Result<Document, JsError>` ;
    `Document::from_pdf_pages_inner(asset: AssetRef, sizes: &[f64], original: Option<AssetRef>) -> Result<Document, CommandError>` ;
    `Document::from_pdf_pages(...)` inchangé.
  - TS : `CoreFactory.fromPdfPages(asset: AssetRef, sizes: readonly PdfPageSize[], original?: AssetRef): CoreDocument` ;
    `BackdropView.original: string | null` (null pour un PDF, une image, une valeur non conforme).
- Réutilise : `crates/roomboard-core/src/document.rs:153` — `from_pdf_pages(asset, sizes)` étendu d'un paramètre `original: Option<&AssetRef>` (même construction hors historique, même `write_asset_meta`).
- Réutilise : `crates/roomboard-core/src/element.rs:54, 394, 423` — `BackdropView`, `read_backdrop`, `backdrop_view` étendus du champ `original: Option<String>` filtré par `is_asset_id` (`asset.rs:7`).
- Réutilise : `crates/roomboard-wasm/src/lib.rs:1417` (`from_pdf_pages_inner`) et `apps/web/src/core/api.ts:397` (`fromPdfPages`) — étendus ; `from_office_pages` neuf à côté de `from_pdf_pages`, qui reste tel quel.
- Réutilise : `apps/web/src/core/wasm-core.ts:310` (`toBackdropView`) et `apps/web/src/core/fake-core.ts:385` (`backdropView`) — champ `original: string | null` dans les deux, même règle (empreinte conforme sinon null).
- Le rapport porte, pour chaque ligne ci-dessus, `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
- Rust : `nice -n 10 cargo test -p roomboard-core -p roomboard-wasm 2>&1 | grep -E "test result|FAILED|panicked|error\[|original|compat_c12" | tail -40`
  → 0 `FAILED` ; noms présents : `from_pdf_pages_with_original_cites_it_on_every_page`,
  `from_pdf_pages_refuses_bad_original_as_bad_asset`, `insert_pages_and_encode_carry_the_original`,
  `backdrop_view_keeps_only_a_conforming_original`, `pdf_c12_fixture_opens_without_original_and_resaves_identically`,
  `from_pdf_pages_inner_with_original_sets_it_on_each_backdrop`. Tests à garder verts : tous ceux de `document.rs`
  (`from_pdf_pages_*`, `pdf_backdrops_survive_encode_and_insert_pages`), `element.rs` (`backdrop_tests`), `commands.rs`,
  `roomboard-wasm` (`from_pdf_pages_inner_reads_pairs_and_refuses_odd_length`).
- TS : `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts src/engine/render/canvas2d.test.ts src/core/fake-core.test.ts --reporter=verbose 2>&1 | grep -E "C16|C12|Tests |Test Files|FAIL|×" | tail -40`
  → 0 `×` ; « contrat C16 : fausse liaison » 5 tests, « contrat C16 : vrai module wasm » 5 tests, « contrôle de forme
  C16 » 1 test ; cas « contrat C12 » verts.
- `nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20` → vide.
- Taille : `wc -c < apps/web/src/wasm/roomboard_wasm_bg.wasm` ≤ 1 572 864 (avant : 1 371 293).

**Contraintes (recopiées de Global Constraints).**
- GC1 TDD : chaque test est écrit et vu rouge avant le code qui le fait passer.
- GC2 Preuves bornées qui montrent qu'un test a tourné (N ≥ 1, nom attendu présent).
- GC5 Aucun build Tauri, aucune installation de paquet système, aucune dépendance GPL, LGPL ou AGPL liée.
- GC6 Module Wasm `formats` : rien n'y entre ; plafonds 1 572 864 o (principal) et 3 145 728 o (formats) inchangés.
- GC11 Compatibilité : un `.roomboard` d'avant C16 s'ouvre toujours (test).
- GC13 Git : fichiers ajoutés un par un, pas de `commit -a`, aucun push forcé, aucun tag ; message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC14 Commentaires en français, identifiants en anglais ; `cargo fmt`, `clippy -D warnings` propres.

**Patron à ne pas reprendre (concepteur-critique).** Une fausse liaison qui pose `original` par une étape `SetBackdrop`
puis vide l'historique, ou qui ne lit pas `original` dans `backdropView` : le contrat commun la prendrait en défaut
(version, `citedAssets`, `null` contre absent). Chemin de référence : la construction d'emblée de C12,
`apps/web/src/core/fake-core.ts:1903-1919`, et son pendant Rust `crates/roomboard-core/src/document.rs:153-188`. Second
patron refusé : un champ `original` ajouté au manifeste ou à une métadonnée de document (non relevé par `cited_assets`,
`document.rs:238-245`, donc l'original ne serait jamais écrit dans `assets/`, U4).

**Interdits.** Aucun changement de `schema`, `formatVersion` ni du manifeste ; `from_pdf_pages` de la liaison Wasm garde
sa signature ; rien dans `crates/roomboard-formats*` ; ne pas régénérer `pdf-c12.roomboard` après l'étape 3.

**Terminé quand.** Les preuves ci-dessus sont vertes, la fixture `pdf-c12.roomboard` est commitée avec le code d'avant
C16, les deux liaisons passent « contrat C16 », la taille du module principal est notée au rapport (avant, après).

**Étapes.**

- [ ] **Étape 0 : préparation du worktree.** `cd ~/projets/roomboard-wt/usage-c16-office--T1 && pnpm install --frozen-lockfile 2>&1 | tail -3`.

- [ ] **Étape 1 : écrire le garde de compatibilité avec le code d'avant C16.** Créer `crates/roomboard-core/tests/compat_c12.rs` :

```rust
//! Garde de compatibilité C16 (O18, S5) : `pdf-c12.roomboard` a été écrit une fois par le code de `main` 41342b0
//! (document d'un PDF importé par C12, aucune clé `original`). Il ne se régénère pas après C16 :
//! `ROOMBOARD_REGENERER_FIXTURES=1` seulement avec le code d'avant C16.
use std::path::PathBuf;

use roomboard_core::asset::AssetRef;
use roomboard_core::document::Document;
use roomboard_core::format::{load, save, SaveMeta};

const PDF: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

fn fixture() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/pdf-c12.roomboard")
}

fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-21T00:00:00Z".into(),
        created: None,
    }
}

fn pdf_asset() -> AssetRef {
    AssetRef {
        id: PDF.into(),
        name: "cours.pdf".into(),
        mime: "application/pdf".into(),
        size: 1234.0,
    }
}

/// Document de C12 : deux pages (portrait puis paysage), fonds `pdf-page`.
fn c12_document() -> Document {
    Document::from_pdf_pages(&pdf_asset(), &[(612.0, 792.0), (792.0, 612.0)]).expect("pdf")
}

fn fixture_bytes() -> Vec<u8> {
    let path = fixture();
    if std::env::var("ROOMBOARD_REGENERER_FIXTURES").as_deref() == Ok("1") {
        std::fs::write(&path, save(&c12_document(), &meta()).expect("save")).expect("écriture");
    }
    std::fs::read(&path).expect(
        "fixture pdf-c12.roomboard absente : ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test compat_c12 (code d'avant C16 seulement)",
    )
}

/// S5, O18 : le document PDF d'avant C16 s'ouvre (2 fonds `pdf-page`, l'asset cité) et se réenregistre à l'identique.
#[test]
fn pdf_c12_fixture_opens_and_resaves_identically() {
    let bytes = fixture_bytes();
    let d = load(&bytes).expect("load");
    let kinds: Vec<Option<(String, Option<u32>)>> = d
        .page_ids()
        .iter()
        .map(|id| d.page(id).and_then(|p| p.backdrop).map(|b| (b.kind, b.page)))
        .collect();
    assert_eq!(
        kinds,
        vec![
            Some(("pdf-page".to_string(), Some(0))),
            Some(("pdf-page".to_string(), Some(1)))
        ]
    );
    assert_eq!(d.cited_assets(), vec![pdf_asset()]);
    assert!(
        save(&d, &meta()).expect("resave") == bytes,
        "fichier d'avant C16 réenregistré à l'identique"
    );
}
```

- [ ] **Étape 2 : écrire la fixture et la voir relue.**
  `ROOMBOARD_REGENERER_FIXTURES=1 nice -n 10 cargo test -p roomboard-core --test compat_c12 2>&1 | tail -5` puis
  `nice -n 10 cargo test -p roomboard-core --test compat_c12 2>&1 | tail -5` → « test result: ok. 1 passed » les deux
  fois ; `ls -l crates/roomboard-core/tests/fixtures/pdf-c12.roomboard` présent.

- [ ] **Étape 3 : commit de la fixture (code d'avant C16).**

```bash
git add crates/roomboard-core/tests/compat_c12.rs
git add crates/roomboard-core/tests/fixtures/pdf-c12.roomboard
git commit -m "test(core): freeze a pre-C16 PDF document fixture

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Étape 4 : tests rouges du cœur.** Dans `crates/roomboard-core/src/document.rs`, module de tests, après `pdf_asset()`
  (ligne ~1578), ajouter :

```rust
    /// Empreinte conforme (SHA-256 du vide) d'un original Office.
    const ORIGINAL: &str = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    fn docx_asset() -> AssetRef {
        AssetRef {
            id: ORIGINAL.into(),
            name: "cours.docx".into(),
            mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document".into(),
            size: 4321.0,
        }
    }

    fn originals_of(d: &Document) -> Vec<Option<String>> {
        d.page_ids()
            .iter()
            .map(|id| d.page(id).and_then(|p| p.backdrop).and_then(|b| b.original))
            .collect()
    }

    /// C16 (O16, O17, S5) : chaque fond porte `original` ; PDF et original cités, métadonnées écrites ; un PDF seul
    /// garde `original: None` (O18) ; rien à annuler.
    #[test]
    fn from_pdf_pages_with_original_cites_it_on_every_page() {
        let d = Document::from_pdf_pages(&pdf_asset(), &SIZES[..2], Some(&docx_asset()))
            .expect("document");
        assert_eq!(
            originals_of(&d),
            vec![Some(ORIGINAL.to_string()), Some(ORIGINAL.to_string())]
        );
        assert_eq!(d.cited_assets(), vec![pdf_asset(), docx_asset()]);
        assert_eq!((d.version(), d.can_undo()), (0, false));
        let plain = Document::from_pdf_pages(&pdf_asset(), &SIZES[..1], None).expect("pdf");
        assert_eq!(originals_of(&plain), vec![None]);
    }

    /// O17 : un original non conforme est refusé comme l'asset (`BadAsset`), avant les tailles.
    #[test]
    fn from_pdf_pages_refuses_bad_original_as_bad_asset() {
        let mut bad = docx_asset();
        bad.mime = String::new();
        assert_eq!(
            Document::from_pdf_pages(&pdf_asset(), &[], Some(&bad)).err(),
            Some(CommandError::BadAsset)
        );
    }

    /// HO2-10 (Review Focus 4) : encodé puis relu, l'original reste ; « Insérer des pages » d'un document converti
    /// l'emporte dans le document hôte.
    #[test]
    fn insert_pages_and_encode_carry_the_original() {
        let d = Document::from_pdf_pages(&pdf_asset(), &SIZES[..1], Some(&docx_asset()))
            .expect("document");
        let back = Document::from_update_v1(&d.encode_v1()).expect("relu");
        assert_eq!(originals_of(&back), vec![Some(ORIGINAL.to_string())]);
        let mut host = Document::blank();
        let first = host.page_ids()[0].clone();
        host.insert_pages(&d, &first).expect("insertion");
        assert_eq!(
            originals_of(&host),
            vec![None, Some(ORIGINAL.to_string())]
        );
        assert_eq!(
            host.cited_assets()
                .into_iter()
                .map(|a| a.id)
                .collect::<Vec<_>>(),
            vec![ABC.to_string(), ORIGINAL.to_string()]
        );
    }
```

  Dans `crates/roomboard-core/src/element.rs`, module `backdrop_tests`, ajouter `original: None,` à la fin du
  `RawBackdrop { … }` de `raw()`, puis :

```rust
    /// C16 (O17) : `original` gardé s'il est une empreinte conforme ; sinon `None`, le fond reste lisible.
    #[test]
    fn backdrop_view_keeps_only_a_conforming_original() {
        let sha = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
        let mut r = raw(1000.0, 500.0);
        r.original = Some(sha.into());
        assert_eq!(
            backdrop_view(r, 1920.0).and_then(|v| v.original).as_deref(),
            Some(sha)
        );
        for bad in ["E3B0C442", "../x", ""] {
            let mut r = raw(1000.0, 500.0);
            r.original = Some(bad.into());
            let v = backdrop_view(r, 1920.0).expect("fond lisible");
            assert_eq!(v.original, None, "{bad}");
        }
    }
```

- [ ] **Étape 5 : les voir rouges.** `nice -n 10 cargo test -p roomboard-core --lib 2>&1 | grep -E "error\[|FAILED" | head -10`
  → `error[E0061]: this function takes 2 arguments but 3 arguments were supplied` et `error[E0560]` / `E0609`
  (champ `original` inconnu).

- [ ] **Étape 6 : `element.rs`.** Dans `BackdropView`, après `pub rect: Option<Bounds>,` :

```rust
    /// C16 (O16, O17) : empreinte de l'original Office d'un fond `pdf-page` converti ; `None` absent ou non conforme.
    pub original: Option<String>,
```

  Dans `RawBackdrop`, après `pub fit: Option<String>,` : `pub original: Option<String>,`. Dans `read_backdrop`, branche
  `Out::YMap(b)` : `original: out_string(b.get(txn, "original")),` ; branche `_` : `original: None,`. Dans
  `backdrop_view`, dernier champ du `BackdropView { … }` rendu : `original: r.original.filter(|o| is_asset_id(o)),`.

- [ ] **Étape 7 : `document.rs`.** Remplacer la signature, le contrôle et le corps de la boucle de `from_pdf_pages` :

```rust
    /// Document d'un PDF importé (C12, PF6, DAPF5) : une page par taille `(w, h)` en points (après /Rotate et CropBox),
    /// fond `pdf-page` d'indice i calé sur la largeur, métadonnée de l'asset ; tout est écrit sans origine avant
    /// `History` (D37) : rien ne s'annule. C16 (O16, O17, DA-O2) : `original` (fichier Office converti) est cité par
    /// chaque fond (clé `original`) et sa métadonnée écrite ; il est contrôlé comme l'asset. Refus : `BadAsset`, puis
    /// `BadImage` (0 ou plus de 500 pages, taille non finie ou ≤ 0).
    pub fn from_pdf_pages(
        asset: &AssetRef,
        sizes: &[(f64, f64)],
        original: Option<&AssetRef>,
    ) -> Result<Self, CommandError> {
        if !valid_asset(asset) || original.is_some_and(|o| !valid_asset(o)) {
            return Err(CommandError::BadAsset);
        }
```

  puis, dans la boucle, remplacer le `page.insert(&mut txn, "backdrop", MapPrelim::from([ … ]));` par :

```rust
                if let Some(Out::YMap(page)) = pages.get(&txn, index) {
                    let mut fields = vec![
                        ("asset", In::from(asset.id.as_str())),
                        ("kind", In::from(PDF_PAGE_KIND)),
                        ("page", In::Any(Any::from(f64::from(index)))),
                        ("w", In::Any(Any::from(w))),
                        ("h", In::Any(Any::from(h))),
                        ("fit", In::from(FIT_WIDTH)),
                    ];
                    if let Some(o) = original {
                        fields.push(("original", In::from(o.id.as_str())));
                    }
                    page.insert(&mut txn, "backdrop", fields.into_iter().collect::<MapPrelim>());
                }
```

  et après `write_asset_meta(&assets, &mut txn, asset);` :

```rust
            if let Some(o) = original {
                write_asset_meta(&assets, &mut txn, o);
            }
```

  Ajouter `, None` aux appels existants : `document.rs` (`from_pdf_pages_builds_one_backdrop_page_per_size`,
  `from_pdf_pages_refuses_bad_asset_then_bad_sizes` ×3, `pdf_backdrops_survive_encode_and_insert_pages`),
  `commands.rs:2953`, `tests/compat_c12.rs` (`c12_document`). Dans `compat_c12.rs`, renommer le test en
  `pdf_c12_fixture_opens_without_original_and_resaves_identically` et ajouter avant le réenregistrement :

```rust
    assert!(
        d.page_ids()
            .iter()
            .all(|id| d.page(id).and_then(|p| p.backdrop).is_some_and(|b| b.original.is_none())),
        "aucun fond d'avant C16 n'a d'original"
    );
```

- [ ] **Étape 8 : voir le cœur vert.** `nice -n 10 cargo test -p roomboard-core 2>&1 | grep -E "test result|FAILED|panicked" | tail -20`
  → aucune ligne `FAILED`, chaque `test result: ok`.

- [ ] **Étape 9 : test rouge de la liaison Wasm.** Dans `crates/roomboard-wasm/src/lib.rs`, après
  `from_pdf_pages_inner_reads_pairs_and_refuses_odd_length` (ajouter `, None` à ses deux appels) :

```rust
    /// C16 (O17) : `from_office_pages` = `from_pdf_pages` + `original` sur chaque fond.
    #[test]
    fn from_pdf_pages_inner_with_original_sets_it_on_each_backdrop() {
        let sha = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
        let pdf = AssetRef {
            id: ABC.into(),
            name: "cours.pdf".into(),
            mime: "application/pdf".into(),
            size: 10.0,
        };
        let docx = AssetRef {
            id: sha.into(),
            name: "cours.docx".into(),
            mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document".into(),
            size: 7.0,
        };
        let d = Document::from_pdf_pages_inner(pdf, &[612.0, 792.0, 792.0, 612.0], Some(docx))
            .expect("document");
        let o: Vec<Option<String>> = d
            .page_ids()
            .iter()
            .map(|id| d.core.page(id).and_then(|p| p.backdrop).and_then(|b| b.original))
            .collect();
        assert_eq!(o, vec![Some(sha.to_string()), Some(sha.to_string())]);
    }
```

  `nice -n 10 cargo test -p roomboard-wasm from_pdf_pages 2>&1 | grep -E "error\[" | head -3` → `error[E0061]`.

- [ ] **Étape 10 : la liaison Wasm.** Remplacer `from_pdf_pages` (corps) et ajouter `from_office_pages` juste après :

```rust
    pub fn from_pdf_pages(
        id: &str,
        name: &str,
        mime: &str,
        size: f64,
        sizes: Vec<f64>,
    ) -> Result<Document, JsError> {
        Self::from_pdf_pages_inner(asset_ref(id, name, mime, size), &sizes, None).map_err(cmd_err)
    }

    /// Document d'un fichier Office converti en PDF (C16, O17) : comme `from_pdf_pages`, chaque fond cite l'original
    /// (`original_*`, métadonnée écrite). Lève une Error au message du cœur (`BadAsset`, `BadImage`).
    #[allow(clippy::too_many_arguments)]
    pub fn from_office_pages(
        id: &str,
        name: &str,
        mime: &str,
        size: f64,
        sizes: Vec<f64>,
        original_id: &str,
        original_name: &str,
        original_mime: &str,
        original_size: f64,
    ) -> Result<Document, JsError> {
        let original = asset_ref(original_id, original_name, original_mime, original_size);
        Self::from_pdf_pages_inner(asset_ref(id, name, mime, size), &sizes, Some(original))
            .map_err(cmd_err)
    }
```

  et `from_pdf_pages_inner` :

```rust
    /// Couples `(w, h)` lus bout à bout ; une longueur impaire est refusée en `BadImage`. C16 : `original` cité par
    /// chaque fond.
    pub fn from_pdf_pages_inner(
        asset: AssetRef,
        sizes: &[f64],
        original: Option<AssetRef>,
    ) -> Result<Document, CommandError> {
        if !sizes.len().is_multiple_of(2) {
            return Err(CommandError::BadImage);
        }
        let pairs: Vec<(f64, f64)> = sizes
            .as_chunks::<2>()
            .0
            .iter()
            .map(|c| (c[0], c[1]))
            .collect();
        CoreDocument::from_pdf_pages(&asset, &pairs, original.as_ref())
            .map(|core| Self::wrap(core, None))
    }
```

  `nice -n 10 cargo test -p roomboard-core -p roomboard-wasm 2>&1 | grep -E "test result|FAILED|panicked|error\[" | tail -20` → vert ;
  `nice -n 10 cargo fmt --all && nice -n 10 cargo clippy -p roomboard-core -p roomboard-wasm --all-targets -- -D warnings 2>&1 | tail -5` → aucun avertissement.

- [ ] **Étape 11 : commit du cœur et de la liaison Rust.**

```bash
git add crates/roomboard-core/src/element.rs
git add crates/roomboard-core/src/document.rs
git add crates/roomboard-core/src/commands.rs
git add crates/roomboard-core/tests/compat_c12.rs
git add crates/roomboard-wasm/src/lib.rs
git commit -m "feat(core): cite the Office original from each converted PDF page backdrop

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Étape 12 : tests rouges du contrat TS.** Dans `apps/web/src/core/wasm-core.contract.test.ts`, juste après le
  bloc `describe("contrôle de forme C12 (fond pdf-page)", …)` :

```ts
// C16 (O16 à O18) : PDF d'un fichier Office converti, contrat commun aux deux fabriques ; l'original est cité par chaque
// fond, construit d'emblée comme C12 (aucune étape), refusé comme l'asset.
const C16_DOCX = { id: "ef".repeat(32), name: "cours.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 4321 };
describe.each(factories)("contrat C16 : $name", ({ f }) => {
  const originals = (d: CoreDocument) => d.pageIds().map((id) => d.page(id)?.backdrop?.original);
  it("fromPdfPages avec original : chaque fond porte original, deux assets cités, rien à annuler (S5, O17)", () => {
    const d = f.fromPdfPages(C12_PDF, C12_SIZES, C16_DOCX);
    expect(originals(d)).toEqual([C16_DOCX.id, C16_DOCX.id, C16_DOCX.id]);
    expect(d.citedAssets()).toEqual([C12_PDF, C16_DOCX]);
    expect([d.version(), d.canUndo()]).toEqual([0, false]);
  });
  it("PDF seul : original null sur chaque fond (O18)", () => {
    expect(originals(f.fromPdfPages(C12_PDF, C12_SIZES))).toEqual([null, null, null]);
  });
  it("original non conforme : BadAsset, avant les tailles (O17)", () => {
    expect(messageOf(() => f.fromPdfPages(C12_PDF, [], { ...C16_DOCX, mime: "" }))).toBe(C12_BAD_ASSET);
  });
  it("enregistré en deux moitiés puis relu : original gardé et cité (S5)", () => {
    const [manifest, ybin] = f.fromPdfPages(C12_PDF, C12_SIZES, C16_DOCX).saveParts(now, "0.1.0");
    const back = f.loadParts(manifest, ybin);
    expect(originals(back)).toEqual([C16_DOCX.id, C16_DOCX.id, C16_DOCX.id]);
    expect(back.citedAssets()).toEqual([C12_PDF, C16_DOCX]);
  });
  it("Insérer des pages d'un document converti emporte l'original (HO2-10, Review Focus 4)", () => {
    const src = f.fromPdfPages(C12_PDF, C12_SIZES.slice(0, 1), C16_DOCX);
    const host = f.blank();
    host.insertPages(src, host.pageIds()[0]!);
    expect(originals(host)).toEqual([null, C16_DOCX.id]);
    expect(host.citedAssets().map((a) => a.id)).toEqual([C12_PDF.id, C16_DOCX.id]);
  });
});

describe("contrôle de forme C16 (original du fond)", () => {
  it("toPageView : original absent → null, chaîne gardée, nombre → erreur", () => {
    const page = { id: "p", width: 1920, height: 1080, background: "#ffffff", grid: undefined };
    const b = { asset: "a".repeat(64), kind: "pdf-page", page: 0, w: 612, h: 792, fit: "width", rect: undefined };
    expect(toPageView({ ...page, backdrop: b })?.backdrop?.original).toBeNull();
    expect(toPageView({ ...page, backdrop: { ...b, original: "b".repeat(64) } })?.backdrop?.original).toBe("b".repeat(64));
    expect(() => toPageView({ ...page, backdrop: { ...b, original: 3 } })).toThrow("PageView invalide");
  });
});
```

  (Si `CoreDocument` n'est pas importé dans ce fichier, l'ajouter à l'import de type de `./api`.) Mettre à jour les
  attentes existantes qui comparent un fond entier : ligne 166 `backdrop: { ...b, page: null, w: null, rect: null, original: null }`,
  ligne 736 `backdrop: { asset: ABC, kind: "image", page: null, w: 1000, h: 500, fit: "width", rect, original: null }`,
  ligne 2752 `…, rect: { x0: 0, y0: 0, x1: 1920, y1: (s.h * 1920) / s.w }, original: null }`. Dans
  `apps/web/src/engine/render/canvas2d.test.ts:1006` : `const base = { asset: PDF.id, page: 0, w: 612, h: 792, fit: "width", original: null };`.

  `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts 2>&1 | tail -15` → échecs
  « contrat C16 » (original `undefined`) et lignes 166, 736, 2752.

- [ ] **Étape 13 : `api.ts`.** Dans `BackdropView`, après `readonly rect: Bounds | null;` :

```ts
  /** C16 (O17) : empreinte de l'original Office d'un PDF converti ; null pour un PDF, une image ou une valeur non conforme. */
  readonly original: string | null;
```

  et la ligne de `CoreFactory` :

```ts
  /** C12 (PF6) : une page par taille, fond `pdf-page` d'indice i, asset cité ; aucune étape (D37). Lève le message
   *  BadAsset, puis BadImage (0 ou plus de PDF_MAX_PAGES pages, taille non finie ou ≤ 0). C16 (O17) : `original`
   *  (fichier Office converti) cité par chaque fond (`backdrop.original`), contrôlé comme l'asset. */
  fromPdfPages(asset: AssetRef, sizes: readonly PdfPageSize[], original?: AssetRef): CoreDocument;
```

- [ ] **Étape 14 : `wasm-core.ts`.** `toBackdropView` :

```ts
// wasm-bindgen rend `undefined` pour une `Option::None` (backdrop, w, h, rect, original) ; le contrat dit `null`.
function toBackdropView(v: unknown): BackdropView | null {
  if (v === null || v === undefined) return null;
  if (!isRecord(v)) throw new Error(PAGE);
  const { asset, kind, fit, original } = v;
  if (typeof asset !== "string" || typeof kind !== "string" || typeof fit !== "string") throw new Error(PAGE);
  if (original !== undefined && original !== null && typeof original !== "string") throw new Error(PAGE);
  return {
    asset,
    kind,
    page: numberOrNull(v["page"], PAGE),
    w: numberOrNull(v["w"], PAGE),
    h: numberOrNull(v["h"], PAGE),
    fit,
    rect: toBounds(v["rect"]),
    original: typeof original === "string" ? original : null,
  };
}
```

  et dans `createWasmCore` :

```ts
    fromPdfPages: (asset: AssetRef, sizes: readonly PdfPageSize[], original?: AssetRef) => {
      const flat = new Float64Array(sizes.flatMap((s) => [s.w, s.h]));
      return new WasmCoreDocument(
        original === undefined
          ? mod.Document.from_pdf_pages(asset.id, asset.name, asset.mime, asset.size, flat)
          : mod.Document.from_office_pages(asset.id, asset.name, asset.mime, asset.size, flat, original.id, original.name, original.mime, original.size),
        mod,
      );
    },
```

- [ ] **Étape 15 : `fake-core.ts`.** `backdropView` : destructurer aussi `original` et rendre en dernier champ
  `original: isAssetId(original) ? original : null,`. `fromPdfPages` :

```ts
  // C12 (D37) : état construit d'emblée, comme `blank` ; jamais par SetBackdrop (une étape par page), que le cœur n'emploie pas.
  // C16 (O17) : `original` cité par chaque fond, contrôlé comme l'asset, métadonnée écrite.
  fromPdfPages: (asset: AssetRef, sizes: readonly PdfPageSize[], original?: AssetRef) => {
    if (!validAsset(asset) || (original !== undefined && !validAsset(original))) throw new Error(MESSAGES.badAsset);
    if (sizes.length === 0 || sizes.length > PDF_MAX_PAGES || sizes.some((s) => !positive(s.w) || !positive(s.h))) {
      throw new Error(MESSAGES.badImage);
    }
    const assets = new Map<string, unknown>();
    putMeta(assets, asset);
    if (original !== undefined) putMeta(assets, original);
    const pages = sizes.map((s, i) => ({
      id: newId(),
      elements: [],
      backdrop: { asset: asset.id, kind: PDF_PAGE_KIND, page: i, w: s.w, h: s.h, fit: "width", ...(original === undefined ? {} : { original: original.id }) },
      grid: null,
      background: DEFAULT_BACKGROUND,
    }));
    return new FakeDocument({ pages, assets });
  },
```

- [ ] **Étape 16 : reconstruire le module Wasm et voir le contrat vert.**

```bash
nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -3
rm -rf apps/web/src/wasm
wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm
wc -c < apps/web/src/wasm/roomboard_wasm_bg.wasm
```

  Si `apps/web/src/wasm-formats` manque (worktree neuf), le construire comme `scripts/verifier.sh:38-41` (sans le
  modifier). Puis la commande TS de la section « Test » (sous `ROOMBOARD_WASM_REQUIRED=1`) et `tsc` → verts ; noter la
  taille (≤ 1 572 864).

- [ ] **Étape 17 : commit de la liaison TS.**

```bash
git add apps/web/src/core/api.ts
git add apps/web/src/core/wasm-core.ts
git add apps/web/src/core/fake-core.ts
git add apps/web/src/core/wasm-core.contract.test.ts
git add apps/web/src/engine/render/canvas2d.test.ts
git commit -m "feat(web): expose the Office original of a backdrop in both core bindings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Tailles du module principal avant et après ; les lignes `Réutilisation : …` ; écarts.

<a id="tache-t2"></a>
### Tâche T2 — Coque : fondations de `office.rs`, `GrantedPaths::revoke`, dépendances

**Objectif.** Poser le module `roomboard_shell::office` sans lancer de processus : extensions et en-têtes (O1, O2),
recherche de LibreOffice sur un `Search` injecté (O6, O7), arguments en liste (O8), URL `file://` du profil (O8),
dossier privé 0700 au propriétaire vérifié (O9), profil jetable aux six valeurs (O10), erreurs et codes stables (O14) ;
`GrantedPaths::revoke` (O35) ; dépendances `open`, `libc`, `windows`, `zip` (test). Scénarios : S1 (profil), S2
(`NoProgram`, dossier refusé).

**Fichiers.**
- Créer : `crates/roomboard-shell/src/office.rs`
- Modifier : `crates/roomboard-shell/Cargo.toml`, `Cargo.lock` (par cargo), `crates/roomboard-shell/src/lib.rs:4-9`
  (une ligne `pub mod office;`), `:65-73` (`revoke` après `granted_path`), tests `:166-481` (un test neuf).

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit (T3, T4, T5, T6 s'en servent), dans `crates/roomboard-shell/src/office.rs` :
  - `pub const OFFICE_EXTENSIONS: &[&str]` (10 extensions sans point) ; `pub const ZIP_EXTENSIONS: &[&str]` ;
    `pub const ZIP_MAGIC: [u8; 4]` ; `pub const CFB_MAGIC: [u8; 8]` ; `pub const CONVERT_TIMEOUT: Duration` (120 s) ;
    `pub const OFFICE_MAX_BYTES: u64` (100 Mio) ; `pub const ERR_KEEP: usize` (2048) ; `pub const PROFILE_XCU: &str`.
  - `pub enum ConvertError { NotOffice, NotGranted, TooLarge, NoProgram, Timeout, Failed(String), NoOutput, Io(String) }`
    + `pub fn code(&self) -> &'static str` (`not-office`, `not-granted`, `too-large`, `no-program`, `timeout`, `failed`,
    `no-output`, `io`) + `Display`.
  - `pub(crate) fn io(e: std::io::Error) -> ConvertError`.
  - `pub fn office_extension(path: &Path) -> Option<String>` (minuscules) ; `pub fn has_office_magic(ext: &str, head: &[u8]) -> bool`.
  - `pub enum Converter { LibreOffice(PathBuf), #[cfg(windows)] MsOffice }` ; `pub struct Search { pub path: Option<OsString>, pub known: Vec<PathBuf> }` ;
    `Search::from_env() -> Search` ; `pub fn find_converter(s: &Search) -> Option<Converter>`.
  - `pub fn file_url(path: &Path) -> String` ; `pub fn libreoffice_args(input: &Path, outdir: &Path, profile: &Path) -> Vec<OsString>` ;
    `pub fn ensure_private_dir(p: &Path) -> Result<(), ConvertError>` ; `pub fn write_profile(profile: &Path) -> Result<(), ConvertError>`.
  - `#[cfg(windows)] pub mod com;` déclaré ici ; T4 écrit `office/com.rs` avec `pub fn available() -> bool` et
    `pub fn convert(input: &Path, out: &Path, timeout: Duration) -> Result<(), ConvertError>`.
  - `crates/roomboard-shell/src/lib.rs` : `impl GrantedPaths { pub fn revoke(&self, path: &Path) -> bool }`.
- Réutilise : `crates/roomboard-shell/src/lib.rs:46-74` — `GrantedPaths` (`grant`, `granted_path`) étendu de `revoke(&self, path: &Path) -> bool` (neuf, O35).
- Réutilise : aucun module existant pour « Conversion en PDF » (liste du cadrage : nouveau module, DA-O1) — `roomboard_shell::office` neuf, interface ci-dessus.
- Le rapport porte, pour chaque ligne ci-dessus, `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`,
  et la sortie de `cargo tree -p roomboard-shell --target all -e normal --prefix none | sort -u` (relevé des licences pour T6).

**Test et commande bornée.**
- `nice -n 10 cargo test -p roomboard-shell 2>&1 | grep -E "^test |test result|FAILED|panicked|error\[" | tail -40` →
  0 `FAILED` ; présents `office::tests::office_extension_and_magic`, `office::tests::error_codes_are_stable`,
  `office::tests::find_converter_prefers_path_then_known_paths`, `office::tests::file_url_escapes_and_handles_windows_drives`,
  `office::tests::libreoffice_args_are_a_fixed_list`, `office::tests::private_dir_is_created_0700_and_tightened`,
  `office::tests::private_dir_refuses_symlink_file_and_foreign_owner`, `office::tests::profile_has_the_six_values`,
  `tests::revoke_removes_the_grant`. Tests à garder verts : tous ceux de `lib.rs` (`granted_file_reads_range` …
  `media_extensions_ignore_case`).
- `nice -n 10 cargo clippy -p roomboard-shell --all-targets -- -D warnings 2>&1 | tail -5` et `cargo fmt --all --check` → vides.
- `node scripts/controle-licences.mjs; echo "code $?"` → `code 0`.

**Contraintes (recopiées de Global Constraints).**
- GC1 TDD : chaque test est écrit et vu rouge avant le code qui le fait passer.
- GC2 Preuves bornées qui montrent qu'un test a tourné (`nice -n 10 cargo test -p roomboard-shell … 2>&1 | tail -20`).
- GC5 Aucun build Tauri, aucune installation de paquet système, aucune dépendance GPL, LGPL ou AGPL liée.
- GC7 Sécurité : aucun shell, arguments en liste, chemins contrôlés dans le dossier de travail, profil jetable ; un
  test par cas.
- GC8 Branche COM sous `cfg(windows)`, prouvée par lecture.
- GC13 Git : fichiers ajoutés un par un, pas de `commit -a`, aucun push forcé, aucun tag ; message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC14 Commentaires en français, identifiants en anglais ; `cargo fmt`, `clippy -D warnings` propres.

**Interdits.** Aucun lancement de processus dans cette tâche (T3) ; aucun `which`, aucun `sh -c`, aucune chaîne de
commande assemblée ; aucun dossier relatif du PATH n'est exploré ; aucune autre crate que `open`, `libc`, `windows`
(normales) et `zip` (test) ; le test du propriétaire étranger ne tourne jamais sous root (il resserrerait `/usr`).

**Terminé quand.** Preuves vertes, `Cargo.lock` à jour (`open 5.4.5`, `is-wsl`, `is-docker`, `windows 0.62.2`),
`controle-licences` à 0.

**Étapes.**

- [ ] **Étape 1 : dépendances.** `crates/roomboard-shell/Cargo.toml` devient :

```toml
[package]
name = "roomboard-shell"
version.workspace = true
edition.workspace = true
license.workspace = true

[dependencies]
sha2 = "0.10.9"
# C16 (O36) : ouvrir l'original avec l'application du système depuis Rust ; ShellExecuteW sous Windows (sans cette
# feature, `open` passerait par powershell.exe -Command : interdit, aucun shell).
open = { version = "5.4.5", default-features = false, features = ["shellexecute-on-windows"] }

[target.'cfg(unix)'.dependencies]
# C16 (O9, O11) : propriétaire du dossier de travail (geteuid), arbre de processus tué (kill du groupe).
libc = "0.2.191"

[target.'cfg(windows)'.dependencies]
# C16 (O11, O13) : objet Job (arbre tué au délai), COM de Word, Excel et PowerPoint. Même version que
# apps/desktop/src-tauri/Cargo.lock.
windows = { version = "0.62.2", features = ["Win32_Foundation", "Win32_Security", "Win32_System_JobObjects", "Win32_System_Threading", "Win32_System_Com", "Win32_System_Ole", "Win32_System_Variant", "Win32_System_Diagnostics_ToolHelp"] }

[dev-dependencies]
serde_json = "1"
# C16 (O27) : fichiers d'essai .docx, .pptx, .xlsx fabriqués par les tests (mêmes features que roomboard-core).
zip = { version = "9.6", default-features = false, features = ["deflate-flate2-zlib-rs"] }
```

  `nice -n 10 cargo metadata --format-version 1 >/dev/null && git diff --stat Cargo.lock` → `Cargo.lock` modifié.

- [ ] **Étape 2 : tests rouges.** Créer `crates/roomboard-shell/src/office.rs` avec seulement l'en-tête et les tests
  (les items viennent à l'étape 4), et ajouter `pub mod office;` dans `lib.rs` après `use std::sync::Mutex;` :

```rust
#[cfg(test)]
mod tests {
    use super::*;

    pub(super) fn dir(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("rb-office-{}-{name}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    #[cfg(unix)]
    pub(super) fn executable(p: &Path, body: &str) -> PathBuf {
        use std::os::unix::fs::PermissionsExt;
        fs::write(p, body).unwrap();
        fs::set_permissions(p, fs::Permissions::from_mode(0o755)).unwrap();
        p.to_path_buf()
    }

    /// O1, O2, Review Focus 1 : extension en minuscules quelle que soit la casse ; en-tête ZIP pour OOXML et ODF, CFB
    /// pour `.doc`, `.xls`, `.ppt`.
    #[test]
    fn office_extension_and_magic() {
        assert_eq!(office_extension(Path::new("/x/COURS.DOCX")).as_deref(), Some("docx"));
        assert_eq!(office_extension(Path::new("notes.Xlsm")).as_deref(), Some("xlsm"));
        assert_eq!(office_extension(Path::new("x.pdf")), None);
        assert_eq!(office_extension(Path::new("docx")), None);
        assert!(has_office_magic("pptx", b"PK\x03\x04rest"));
        assert!(!has_office_magic("pptx", &CFB_MAGIC));
        assert!(has_office_magic("doc", &CFB_MAGIC));
        assert!(!has_office_magic("xls", b"PK\x03\x04"));
        assert!(!has_office_magic("docx", b"PK"));
        let mut all: Vec<&str> = OFFICE_EXTENSIONS.to_vec();
        all.sort_unstable();
        assert_eq!(all, ["doc", "docx", "odp", "ods", "odt", "ppt", "pptx", "xls", "xlsm", "xlsx"]);
    }

    /// O14 : codes rendus à la page, stables.
    #[test]
    fn error_codes_are_stable() {
        let all = [
            (ConvertError::NotOffice, "not-office"),
            (ConvertError::NotGranted, "not-granted"),
            (ConvertError::TooLarge, "too-large"),
            (ConvertError::NoProgram, "no-program"),
            (ConvertError::Timeout, "timeout"),
            (ConvertError::Failed("x".into()), "failed"),
            (ConvertError::NoOutput, "no-output"),
            (ConvertError::Io("y".into()), "io"),
        ];
        for (e, code) in all {
            assert_eq!(e.code(), code);
        }
        assert_eq!(ConvertError::Failed("Error: source".into()).to_string(), "failed : Error: source");
    }

    /// O7 (S2) : `soffice` du PATH d'abord, puis `libreoffice`, fichier ordinaire exécutable exigé ; puis les chemins
    /// connus ; rien : `None` (la commande rend alors `no-program`).
    #[cfg(unix)]
    #[test]
    fn find_converter_prefers_path_then_known_paths() {
        let d = dir("recherche");
        let (a, b, c) = (d.join("a"), d.join("b"), d.join("c"));
        for x in [&a, &b, &c] {
            fs::create_dir(x).unwrap();
        }
        fs::write(a.join("soffice"), b"#!/bin/sh\n").unwrap(); // non exécutable : ignoré
        let lo = executable(&b.join("libreoffice"), "#!/bin/sh\n");
        fs::create_dir(c.join("soffice")).unwrap(); // dossier : ignoré
        let path = std::env::join_paths([&a, &c, &b]).unwrap();
        let search = |path: Option<OsString>, known: Vec<PathBuf>| find_converter(&Search { path, known });
        assert_eq!(search(Some(path.clone()), vec![]), Some(Converter::LibreOffice(lo)));
        let so = executable(&b.join("soffice"), "#!/bin/sh\n");
        assert_eq!(search(Some(path), vec![]), Some(Converter::LibreOffice(so)));
        let known = executable(&d.join("connu"), "#!/bin/sh\n");
        let only_a = std::env::join_paths([&a]).unwrap();
        assert_eq!(
            search(Some(only_a.clone()), vec![d.join("absent"), c.join("soffice"), known.clone()]),
            Some(Converter::LibreOffice(known))
        );
        assert_eq!(search(Some(only_a), vec![d.join("absent")]), None);
        assert_eq!(search(None, vec![]), None);
    }

    /// O8 : URL du profil (espaces, `%`, `#`, non ASCII), lecteur Windows et préfixe `\\?\` de `canonicalize`.
    #[test]
    fn file_url_escapes_and_handles_windows_drives() {
        assert_eq!(file_url(Path::new("/tmp/a b/%#é")), "file:///tmp/a%20b/%25%23%C3%A9");
        assert_eq!(file_url(Path::new(r"C:\Users\a b\profil")), "file:///C:/Users/a%20b/profil");
        assert_eq!(file_url(Path::new(r"\\?\C:\x\profil")), "file:///C:/x/profil");
    }

    /// O8 : liste fixe, le profil en URL, l'entrée en dernier ; aucun nom d'origine (l'entrée est `source.<ext>`).
    #[cfg(unix)]
    #[test]
    fn libreoffice_args_are_a_fixed_list() {
        let a = libreoffice_args(
            Path::new("/w/1-0/source.docx"),
            Path::new("/w/1-0"),
            Path::new("/w/1-0/profil"),
        );
        let want = [
            "--headless",
            "--invisible",
            "--norestore",
            "--nolockcheck",
            "--nodefault",
            "--nologo",
            "-env:UserInstallation=file:///w/1-0/profil",
            "--convert-to",
            "pdf",
            "--outdir",
            "/w/1-0",
            "/w/1-0/source.docx",
        ];
        assert_eq!(a, want.map(OsString::from).to_vec());
    }

    /// O9 : dossier créé en 0700 ; un dossier existant plus ouvert est resserré.
    #[cfg(unix)]
    #[test]
    fn private_dir_is_created_0700_and_tightened() {
        use std::os::unix::fs::PermissionsExt;
        let d = dir("prive");
        let new = d.join("neuf");
        ensure_private_dir(&new).expect("créé");
        assert_eq!(fs::metadata(&new).unwrap().permissions().mode() & 0o777, 0o700);
        let open = d.join("ouvert");
        fs::create_dir(&open).unwrap();
        fs::set_permissions(&open, fs::Permissions::from_mode(0o755)).unwrap();
        ensure_private_dir(&open).expect("resserré");
        assert_eq!(fs::metadata(&open).unwrap().permissions().mode() & 0o777, 0o700);
    }

    /// O9 (S2) : un lien symbolique, un fichier, ou un dossier d'un autre propriétaire ne sert jamais de dossier de travail.
    #[cfg(unix)]
    #[test]
    fn private_dir_refuses_symlink_file_and_foreign_owner() {
        let d = dir("refus");
        let target = d.join("cible");
        fs::create_dir(&target).unwrap();
        let link = d.join("lien");
        std::os::unix::fs::symlink(&target, &link).unwrap();
        assert!(matches!(ensure_private_dir(&link), Err(ConvertError::Io(_))));
        let file = d.join("fichier");
        fs::write(&file, b"x").unwrap();
        assert!(matches!(ensure_private_dir(&file), Err(ConvertError::Io(_))));
        // Jamais sous root : le contrôle du propriétaire passerait et `/usr` serait resserré en 0700.
        // SAFETY : lecture de l'identifiant effectif, sans effet.
        if unsafe { libc::geteuid() } != 0 {
            assert!(
                matches!(ensure_private_dir(Path::new("/usr")), Err(ConvertError::Io(_))),
                "/usr appartient à root"
            );
        }
    }

    /// O10 (S1) : le profil écrit porte les six valeurs (macros coupées, liens jamais mis à jour, formules jamais
    /// recalculées au chargement).
    #[test]
    fn profile_has_the_six_values() {
        let d = dir("profil");
        write_profile(&d.join("profil")).expect("profil");
        let xcu = fs::read_to_string(d.join("profil").join("user").join("registrymodifications.xcu")).expect("xcu");
        for (path, name, value) in [
            ("/org.openoffice.Office.Common/Security/Scripting", "MacroSecurityLevel", "3"),
            ("/org.openoffice.Office.Common/Security/Scripting", "DisableMacrosExecution", "true"),
            ("/org.openoffice.Office.Calc/Content/Update", "Link", "1"),
            ("/org.openoffice.Office.Writer/Content/Update", "Link", "1"),
            ("/org.openoffice.Office.Calc/Formula/Load", "OOXMLRecalcMode", "1"),
            ("/org.openoffice.Office.Calc/Formula/Load", "ODFRecalcMode", "1"),
        ] {
            let item = format!(
                r#"<item oor:path="{path}"><prop oor:name="{name}" oor:op="fuse"><value>{value}</value></prop></item>"#
            );
            assert!(xcu.contains(&item), "{path} {name} = {value} absent");
        }
    }
}
```

  Dans `lib.rs`, module `tests`, après `missing_path_is_not_granted` :

```rust
    /// C16 (O35) : le PDF converti, accordé le temps de sa lecture, ne l'est plus après `revoke` ; un chemin jamais
    /// accordé rend faux.
    #[test]
    fn revoke_removes_the_grant() {
        let d = dir("revoke");
        let f = d.join("source.pdf");
        fs::write(&f, b"%PDF-").unwrap();
        let g = GrantedPaths::default();
        g.grant([f.clone()]);
        assert!(g.revoke(&f));
        assert_eq!(read_granted(&g, &f, 0, 1), Err(ReadError::NotGranted));
        assert!(!g.revoke(&f));
        assert!(!g.revoke(&d.join("absent.pdf")));
    }
```

- [ ] **Étape 3 : les voir rouges.** `nice -n 10 cargo test -p roomboard-shell 2>&1 | grep -E "error\[" | head -5` →
  `error[E0425]: cannot find function` (`office_extension`, …) et `error[E0599]: no method named revoke`.

- [ ] **Étape 4 : `office.rs`, items.** Au-dessus du module de tests :

```rust
//! Conversion d'un document Office en PDF (C16, DA-O1) : extensions et en-têtes (O1, O2), recherche du convertisseur
//! (O6, O7), arguments en liste (O8), dossier de travail privé (O9), profil jetable (O10), erreurs (O14). Le lancement,
//! le délai et l'arbre de processus (O11, O12) suivent dans ce module ; la branche COM vit dans `office/com.rs`
//! (`cfg(windows)`). Aucun interpréteur de commandes, jamais une chaîne de commande assemblée.
use std::ffi::OsString;
use std::fmt;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;

#[cfg(windows)]
pub mod com;

/// Extensions prises (O1), sans point, comparées sans tenir compte de la casse.
pub const OFFICE_EXTENSIONS: &[&str] = &[
    "docx", "doc", "odt", "xlsx", "xlsm", "xls", "ods", "pptx", "ppt", "odp",
];
/// Extensions dont le fichier est un ZIP (OOXML, ODF) ; les autres (`doc`, `xls`, `ppt`) sont des CFB (O2).
pub const ZIP_EXTENSIONS: &[&str] = &["docx", "odt", "xlsx", "xlsm", "ods", "pptx", "odp"];
pub const ZIP_MAGIC: [u8; 4] = [0x50, 0x4b, 0x03, 0x04];
pub const CFB_MAGIC: [u8; 8] = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
/// Délai d'une conversion (O11, U35).
pub const CONVERT_TIMEOUT: Duration = Duration::from_secs(120);
/// Plafond d'un fichier converti (O14) : 100 Mio, comme `OFFICE_MAX_BYTES` de la page.
pub const OFFICE_MAX_BYTES: u64 = 100 * 1024 * 1024;
/// Octets de `soffice.err` gardés pour le message d'échec (O8).
pub const ERR_KEEP: usize = 2048;

/// Profil jetable (O10) : macros coupées, liens jamais mis à jour, formules jamais recalculées au chargement.
pub const PROFILE_XCU: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<oor:items xmlns:oor="http://openoffice.org/2001/registry" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item>
<item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="DisableMacrosExecution" oor:op="fuse"><value>true</value></prop></item>
<item oor:path="/org.openoffice.Office.Calc/Content/Update"><prop oor:name="Link" oor:op="fuse"><value>1</value></prop></item>
<item oor:path="/org.openoffice.Office.Writer/Content/Update"><prop oor:name="Link" oor:op="fuse"><value>1</value></prop></item>
<item oor:path="/org.openoffice.Office.Calc/Formula/Load"><prop oor:name="OOXMLRecalcMode" oor:op="fuse"><value>1</value></prop></item>
<item oor:path="/org.openoffice.Office.Calc/Formula/Load"><prop oor:name="ODFRecalcMode" oor:op="fuse"><value>1</value></prop></item>
</oor:items>
"#;

#[derive(Debug, PartialEq, Eq)]
pub enum ConvertError {
    NotOffice,
    NotGranted,
    TooLarge,
    NoProgram,
    Timeout,
    Failed(String),
    NoOutput,
    Io(String),
}

impl ConvertError {
    /// Code stable rendu à la page par la commande (O14).
    pub fn code(&self) -> &'static str {
        match self {
            ConvertError::NotOffice => "not-office",
            ConvertError::NotGranted => "not-granted",
            ConvertError::TooLarge => "too-large",
            ConvertError::NoProgram => "no-program",
            ConvertError::Timeout => "timeout",
            ConvertError::Failed(_) => "failed",
            ConvertError::NoOutput => "no-output",
            ConvertError::Io(_) => "io",
        }
    }
}

impl fmt::Display for ConvertError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ConvertError::Failed(d) | ConvertError::Io(d) => write!(f, "{} : {d}", self.code()),
            _ => f.write_str(self.code()),
        }
    }
}

pub(crate) fn io(e: std::io::Error) -> ConvertError {
    ConvertError::Io(e.to_string())
}

/// Extension Office de `path`, en minuscules ; `None` si elle n'est pas dans `OFFICE_EXTENSIONS` (O1).
pub fn office_extension(path: &Path) -> Option<String> {
    let e = path.extension()?.to_str()?.to_ascii_lowercase();
    OFFICE_EXTENSIONS.contains(&e.as_str()).then_some(e)
}

/// Vrai si `head` porte l'en-tête attendu pour l'extension `ext` (O2) : ZIP pour OOXML et ODF, CFB sinon.
pub fn has_office_magic(ext: &str, head: &[u8]) -> bool {
    if ZIP_EXTENSIONS.contains(&ext) {
        head.starts_with(&ZIP_MAGIC)
    } else {
        head.starts_with(&CFB_MAGIC)
    }
}

/// Convertisseur trouvé au lancement (O6) : LibreOffice d'abord, Microsoft Office par COM sous Windows ensuite.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Converter {
    LibreOffice(PathBuf),
    #[cfg(windows)]
    MsOffice,
}

/// Données de la recherche (O7), injectées pour les tests : PATH et chemins connus.
#[derive(Debug, Clone, Default)]
pub struct Search {
    pub path: Option<OsString>,
    pub known: Vec<PathBuf>,
}

impl Search {
    pub fn from_env() -> Self {
        Search {
            path: std::env::var_os("PATH"),
            known: known_paths(),
        }
    }
}

#[cfg(windows)]
const PROGRAM_NAMES: &[&str] = &["soffice.exe"];
#[cfg(not(windows))]
const PROGRAM_NAMES: &[&str] = &["soffice", "libreoffice"];

/// Chemins connus de LibreOffice (O7), essayés après le PATH : une application lancée du Finder n'a qu'un PATH minimal.
fn known_paths() -> Vec<PathBuf> {
    #[allow(unused_mut)]
    let mut v = Vec::new();
    #[cfg(target_os = "linux")]
    {
        v.push(PathBuf::from("/usr/lib/libreoffice/program/soffice"));
        if let Ok(rd) = fs::read_dir("/opt") {
            let mut opt: Vec<PathBuf> = rd
                .flatten()
                .filter(|e| e.file_name().to_string_lossy().starts_with("libreoffice"))
                .map(|e| e.path().join("program").join("soffice"))
                .collect();
            opt.sort();
            v.extend(opt);
        }
        v.push(PathBuf::from("/snap/bin/libreoffice"));
        v.push(PathBuf::from("/var/lib/flatpak/exports/bin/org.libreoffice.LibreOffice"));
    }
    #[cfg(target_os = "macos")]
    {
        let app = Path::new("LibreOffice.app/Contents/MacOS/soffice");
        v.push(Path::new("/Applications").join(app));
        if let Some(home) = std::env::var_os("HOME") {
            v.push(PathBuf::from(home).join("Applications").join(app));
        }
    }
    #[cfg(windows)]
    {
        for var in ["ProgramFiles", "ProgramFiles(x86)"] {
            if let Some(base) = std::env::var_os(var) {
                v.push(PathBuf::from(base).join("LibreOffice").join("program").join("soffice.exe"));
            }
        }
    }
    v
}

/// Fichier ordinaire (lien suivi : `/usr/bin/soffice` en est un) et exécutable sous Unix.
fn is_executable_file(p: &Path) -> bool {
    let Ok(m) = fs::metadata(p) else {
        return false;
    };
    if !m.is_file() {
        return false;
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        m.permissions().mode() & 0o111 != 0
    }
    #[cfg(not(unix))]
    {
        true
    }
}

/// O6, O7 : `soffice` puis `libreoffice` dans les dossiers absolus du PATH (recherche écrite ici, aucun `which`), puis
/// les chemins connus, puis (Windows) Word, Excel ou PowerPoint enregistrés pour COM.
pub fn find_converter(s: &Search) -> Option<Converter> {
    let dirs: Vec<PathBuf> = s
        .path
        .as_deref()
        .map(|p| std::env::split_paths(p).filter(|d| d.is_absolute()).collect())
        .unwrap_or_default();
    for name in PROGRAM_NAMES {
        for d in &dirs {
            let c = d.join(name);
            if is_executable_file(&c) {
                return Some(Converter::LibreOffice(c));
            }
        }
    }
    if let Some(k) = s.known.iter().find(|k| is_executable_file(k)) {
        return Some(Converter::LibreOffice(k.clone()));
    }
    #[cfg(windows)]
    if com::available() {
        return Some(Converter::MsOffice);
    }
    None
}

/// URL `file://` d'un chemin (O8, `-env:UserInstallation=`) : séparateurs Windows en `/`, préfixe `\\?\` retiré, tout
/// octet hors `A-Z a-z 0-9 - . _ ~ / :` encodé en pourcentage.
pub fn file_url(path: &Path) -> String {
    let raw = path.to_string_lossy();
    let s = raw.strip_prefix(r"\\?\").unwrap_or(&raw).replace('\\', "/");
    let mut out = String::from("file://");
    if !s.starts_with('/') {
        out.push('/');
    }
    for b in s.bytes() {
        if b.is_ascii_alphanumeric() || matches!(b, b'-' | b'.' | b'_' | b'~' | b'/' | b':') {
            out.push(char::from(b));
        } else {
            out.push_str(&format!("%{b:02X}"));
        }
    }
    out
}

/// Arguments de LibreOffice (O8), en liste ; l'entrée est toujours `<dossier>/source.<ext>` (le nom d'origine n'y
/// arrive jamais).
pub fn libreoffice_args(input: &Path, outdir: &Path, profile: &Path) -> Vec<OsString> {
    let mut a: Vec<OsString> = [
        "--headless",
        "--invisible",
        "--norestore",
        "--nolockcheck",
        "--nodefault",
        "--nologo",
    ]
    .into_iter()
    .map(OsString::from)
    .collect();
    a.push(OsString::from(format!("-env:UserInstallation={}", file_url(profile))));
    a.push(OsString::from("--convert-to"));
    a.push(OsString::from("pdf"));
    a.push(OsString::from("--outdir"));
    a.push(outdir.as_os_str().to_owned());
    a.push(input.as_os_str().to_owned());
    a
}

/// Dossier privé (O9) : créé en 0700 s'il manque (le parent doit exister) ; existant, il doit être un vrai dossier (pas
/// un lien), à l'utilisateur courant (Unix), puis il est resserré en 0700.
pub fn ensure_private_dir(p: &Path) -> Result<(), ConvertError> {
    match fs::symlink_metadata(p) {
        Ok(m) => {
            if m.file_type().is_symlink() || !m.is_dir() {
                return Err(ConvertError::Io(format!("dossier privé attendu : {}", p.display())));
            }
            #[cfg(unix)]
            {
                use std::os::unix::fs::{MetadataExt, PermissionsExt};
                // SAFETY : lecture de l'identifiant effectif, sans effet.
                if m.uid() != unsafe { libc::geteuid() } {
                    return Err(ConvertError::Io(format!("propriétaire différent : {}", p.display())));
                }
                fs::set_permissions(p, fs::Permissions::from_mode(0o700)).map_err(io)?;
            }
            Ok(())
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            let mut b = fs::DirBuilder::new();
            #[cfg(unix)]
            {
                use std::os::unix::fs::DirBuilderExt;
                b.mode(0o700);
            }
            b.create(p).map_err(io)
        }
        Err(e) => Err(io(e)),
    }
}

/// Écrit le profil jetable `<profil>/user/registrymodifications.xcu` (O10) avant le lancement.
pub fn write_profile(profile: &Path) -> Result<(), ConvertError> {
    let user = profile.join("user");
    fs::create_dir_all(&user).map_err(io)?;
    fs::write(user.join("registrymodifications.xcu"), PROFILE_XCU).map_err(io)
}
```

  Dans `lib.rs`, après `granted_path` :

```rust
    /// Retire l'accord de `path` (O35) : chemin canonique s'il se résout encore, et chemin reçu ; vrai si l'un des deux
    /// était accordé.
    pub fn revoke(&self, path: &Path) -> bool {
        let mut set = self.paths.lock().unwrap_or_else(|e| e.into_inner());
        let canonical = path.canonicalize().ok().is_some_and(|c| set.remove(&c));
        let raw = set.remove(path);
        canonical || raw
    }
```

- [ ] **Étape 5 : les voir verts.** Commande de la section « Test » → 0 `FAILED`, les 9 noms présents ; clippy et fmt
  vides ; `controle-licences` à 0.

- [ ] **Étape 6 : commit.**

```bash
git add crates/roomboard-shell/Cargo.toml
git add Cargo.lock
git add crates/roomboard-shell/src/lib.rs
git add crates/roomboard-shell/src/office.rs
git commit -m "feat(shell): office module foundations: converter search, argument list, private work dir, throwaway profile

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Sortie de `cargo tree` (licences), lignes `Réutilisation : …`, écarts.

<a id="tache-t3"></a>
### Tâche T3 — Coque : conversion réelle, délai et arbre tué, sortie contrôlée, libération et purge, fichiers d'essai, exemple `convertir_office`

**Objectif.** `convert_granted` copie le fichier accordé sous `source.<ext>` dans un dossier de conversion neuf et privé,
lance LibreOffice (arguments en liste, profil jetable, sorties dans des fichiers), attend au plus `timeout`, tue l'arbre
entier au délai et après la fin, contrôle `source.pdf`, l'accorde et rend `{ id, pdf, size }` ; `release_conversion`
retire l'accord et supprime le dossier ; `purge_conversions` nettoie au lancement (O8 à O12, O23, O28, O35, DA-O5).
Fichiers d'essai fabriqués par les tests (O27) ; exemple en ligne de commande pour la capture S4. Scénarios : S1, S2, S4.

**Fichiers.**
- Créer : `crates/roomboard-shell/tests/fixtures/cours.docx`, `crates/roomboard-shell/tests/fixtures/diapos.pptx`,
  `crates/roomboard-shell/tests/fixtures/notes.xlsx` (écrits par les tests), `crates/roomboard-shell/examples/convertir_office.rs`
- Modifier : `crates/roomboard-shell/src/office.rs` (imports en tête ; code après `write_profile` ; tests ajoutés à la fin
  de `mod tests`).

**Interfaces.**
- Consomme (T2, `office.rs`) : `office_extension`, `has_office_magic`, `Converter`, `Search::from_env`, `find_converter`,
  `libreoffice_args`, `ensure_private_dir`, `write_profile`, `io`, `ConvertError`, `CONVERT_TIMEOUT`, `OFFICE_MAX_BYTES`,
  `ERR_KEEP`, aides de test `dir(name)` et `executable(path, body)` ; `crate::GrantedPaths` (`grant`, `granted_path`,
  `revoke`), `crate::read_granted`, `crate::ReadError`. Sous `cfg(windows)` : `com::convert(input, out, timeout)` (T4).
- Produit (T6 s'en sert) :
  - `pub struct Converted { pub id: String, pub pdf: PathBuf, pub size: u64 }` (`pdf` canonique, accordé).
  - `pub fn convert_granted(g: &GrantedPaths, path: &Path, c: Option<&Converter>, work_root: &Path, timeout: Duration) -> Result<Converted, ConvertError>`
    (ordre des refus : `NotGranted`, `NotOffice` (extension), `TooLarge`, `NotOffice` (en-tête), `NoProgram`, puis
    `Io`, `Timeout`, `Failed`, `NoOutput`).
  - `pub fn release_conversion(g: &GrantedPaths, work_root: &Path, id: &str)` (identifiant `<chiffres>-<chiffres>` seul).
  - `pub fn purge_conversions(work_root: &Path)`.
  - Dossier : `<work_root>/conversions/<pid>-<n>/` (`source.<ext>`, `source.pdf`, `soffice.out`, `soffice.err`, `profil/`).
- Réutilise : `crates/roomboard-shell/src/lib.rs:82-97` — patron de `read_granted` : `g.granted_path(path)` d'abord, puis seul le chemin canonique vérifié est ouvert (copié ici).
- Réutilise : `crates/roomboard-shell/src/lib.rs:46-74` — `GrantedPaths::grant` pour le PDF produit, `GrantedPaths::revoke` (T2) à la libération.
- Réutilise : `crates/roomboard-formats/src/sheet.rs:332` — patron de fabrication d'un `.xlsx` (`ZipWriter`, `SimpleFileOptions`, `CompressionMethod::Deflated`), recopié dans les tests (crate différente, test seulement).
- Le rapport porte, pour chaque ligne ci-dessus, `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
- `nice -n 10 cargo test -p roomboard-shell office:: 2>&1 | grep -E "^test |test result|FAILED|panicked" | tail -40` →
  0 `FAILED`, ≥ 17 tests (8 de T2 + 10 ici), dont `real_libreoffice_converts_docx_pptx_xlsx`,
  `timeout_kills_the_launcher_and_its_child`, `hostile_name_never_reaches_the_arguments`, `symlinked_output_is_refused`,
  `ungranted_file_is_refused_before_any_process`, `too_large_not_office_and_no_program_launch_nothing`,
  `symlinked_work_root_is_refused`, `corrupt_docx_fails_and_leaves_nothing`, `release_conversion_ignores_foreign_ids`,
  `purge_removes_conversions_of_dead_processes`. Aucune ligne « test sauté » (`ROOMBOARD_SANS_SOFFICE` non posée).
- `nice -n 10 cargo test -p roomboard-shell 2>&1 | grep -E "test result|FAILED" | tail -5` → tous les tests de la crate verts.
- `mkdir -p /tmp/c16-T3 && nice -n 10 cargo run -q -p roomboard-shell --example convertir_office -- crates/roomboard-shell/tests/fixtures/diapos.pptx /tmp/c16-T3/diapos.pdf && head -c 5 /tmp/c16-T3/diapos.pdf; echo` → ligne `convertisseur : /usr/bin/soffice`, puis `%PDF-`.
- clippy `-D warnings` et `cargo fmt --all --check` vides.

**Contraintes (recopiées de Global Constraints).**
- GC1 TDD : chaque test est écrit et vu rouge avant le code qui le fait passer.
- GC2 Preuves bornées qui montrent qu'un test a tourné (`nice -n 10 cargo test -p roomboard-shell … 2>&1 | tail -20`).
- GC3 Une conversion LibreOffice à la fois dans les tests : verrou `CONVERT_LOCK` de `convert_granted` ; les faux
  convertisseurs sont écrits sous ce verrou.
- GC4 Les tests qui exigent `soffice` échouent s'il manque avec « soffice introuvable : installez LibreOffice, ou posez
  ROOMBOARD_SANS_SOFFICE=1 pour sauter ce test » ; seul `ROOMBOARD_SANS_SOFFICE=1` les saute, en l'écrivant sur
  `stderr` ; `verifier.sh` et la CI ne posent jamais cette variable.
- GC5 Aucun build Tauri, aucune installation de paquet système, aucune dépendance GPL, LGPL ou AGPL liée.
- GC7 Sécurité : aucun shell, arguments en liste, chemins contrôlés dans le dossier de travail, arbre de processus tué
  au délai de 120 s (délai injectable pour le test), profil jetable supprimé ; un test par cas.
- GC8 Branche COM sous `cfg(windows)`, prouvée par lecture (ici : un seul bras de `match`).
- GC13 Git : fichiers ajoutés un par un, pas de `commit -a`, aucun push forcé, aucun tag ; message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC14 Commentaires en français, identifiants en anglais ; `cargo fmt`, `clippy -D warnings` propres.

**Patron à ne pas reprendre (concepteur-critique).** `child.kill()` puis `wait()` au délai : `soffice` est un script
qui lance `oosplash` puis `soffice.bin` ; tuer la racine laisse l'enfant vivant (coffre,
`04_Pieges/edge-sans-tete-screenshot-ne-rend-pas-la-main.md`). Second patron refusé : `stdout(Stdio::piped())` lu à
la fin (le tube se remplit et bloque) ; troisième : lancer avec le chemin d'origine en argument. Chemin de référence :
`crates/roomboard-shell/src/lib.rs:82-97` (accord vérifié puis chemin canonique), DA-O5 du cadrage
(`docs/plans/usage-c16-office-cadrage.md:352-356`).

**Interdits.** Aucun `sh -c`, aucun `Command::new("sh")` dans le code de la crate (les faux convertisseurs des tests
sont des scripts exécutés directement, comme `soffice`) ; aucun `/tmp` partagé comme racine de travail dans le code
(les tests passent leur propre racine) ; aucun accord d'un autre fichier que `source.pdf` ; ne jamais suivre un lien
pour la sortie.

**Terminé quand.** Preuves vertes sur la VM avec `/usr/bin/soffice`, trois fixtures commitées, l'exemple produit un PDF.

**Étapes.**

- [ ] **Étape 1 : aides de test et fabriques.** À la fin de `mod tests` d'`office.rs` (T2), ajouter :

```rust
    use std::io::{Cursor, Write};
    use std::time::SystemTime;
    use zip::write::SimpleFileOptions;
    use zip::{CompressionMethod, ZipWriter};

    use crate::{read_granted, ReadError};

    const XML: &str = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>"#;
    const CT: &str = "http://schemas.openxmlformats.org/package/2006/content-types";
    const PR: &str = "http://schemas.openxmlformats.org/package/2006/relationships";
    const R: &str = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    const A: &str = "http://schemas.openxmlformats.org/drawingml/2006/main";
    const P: &str = "http://schemas.openxmlformats.org/presentationml/2006/main";
    const DEFAULTS: &str = r#"<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>"#;

    fn zip_of(parts: &[(&str, String)]) -> Vec<u8> {
        let mut w = ZipWriter::new(Cursor::new(Vec::new()));
        let o = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
        for (name, body) in parts {
            w.start_file(*name, o).expect("entrée");
            w.write_all(body.as_bytes()).expect("écriture");
        }
        w.finish().expect("zip").into_inner()
    }

    fn types(overrides: &[(&str, &str)]) -> String {
        let o: String = overrides
            .iter()
            .map(|(part, ct)| format!(r#"<Override PartName="{part}" ContentType="{ct}"/>"#))
            .collect();
        format!(r#"{XML}<Types xmlns="{CT}">{DEFAULTS}{o}</Types>"#)
    }

    fn rels(items: &[(&str, &str, &str)]) -> String {
        let r: String = items
            .iter()
            .map(|(id, kind, target)| format!(r#"<Relationship Id="{id}" Type="{R}/{kind}" Target="{target}"/>"#))
            .collect();
        format!(r#"{XML}<Relationships xmlns="{PR}">{r}</Relationships>"#)
    }

    /// `.docx` d'un paragraphe (O27).
    fn docx() -> Vec<u8> {
        zip_of(&[
            ("[Content_Types].xml", types(&[("/word/document.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml")])),
            ("_rels/.rels", rels(&[("rId1", "officeDocument", "word/document.xml")])),
            ("word/document.xml", format!(r#"{XML}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>RoomBoard cours</w:t></w:r></w:p></w:body></w:document>"#)),
        ])
    }

    /// `.xlsx` d'une feuille (O27, patron `roomboard-formats/src/sheet.rs:332`).
    fn xlsx() -> Vec<u8> {
        const S: &str = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
        zip_of(&[
            ("[Content_Types].xml", types(&[
                ("/xl/workbook.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"),
                ("/xl/worksheets/sheet1.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"),
            ])),
            ("_rels/.rels", rels(&[("rId1", "officeDocument", "xl/workbook.xml")])),
            ("xl/workbook.xml", format!(r#"{XML}<workbook xmlns="{S}" xmlns:r="{R}"><sheets><sheet name="Notes" sheetId="1" r:id="rId1"/></sheets></workbook>"#)),
            ("xl/_rels/workbook.xml.rels", rels(&[("rId1", "worksheet", "worksheets/sheet1.xml")])),
            ("xl/worksheets/sheet1.xml", format!(r#"{XML}<worksheet xmlns="{S}"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Note</t></is></c><c r="B1"><v>12</v></c></row></sheetData></worksheet>"#)),
        ])
    }

    /// Thème minimal exigé par PowerPoint et LibreOffice Impress.
    fn theme() -> String {
        let scheme = r#"<a:clrScheme name="C"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1F497D"/></a:dk2><a:lt2><a:srgbClr val="EEECE1"/></a:lt2><a:accent1><a:srgbClr val="4F81BD"/></a:accent1><a:accent2><a:srgbClr val="C0504D"/></a:accent2><a:accent3><a:srgbClr val="9BBB59"/></a:accent3><a:accent4><a:srgbClr val="8064A2"/></a:accent4><a:accent5><a:srgbClr val="4BACC6"/></a:accent5><a:accent6><a:srgbClr val="F79646"/></a:accent6><a:hlink><a:srgbClr val="0000FF"/></a:hlink><a:folHlink><a:srgbClr val="800080"/></a:folHlink></a:clrScheme>"#;
        let fonts = r#"<a:fontScheme name="F"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>"#;
        let fill = r#"<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>"#;
        let line = format!(r#"<a:ln w="9525">{fill}</a:ln>"#);
        let effect = "<a:effectStyle><a:effectLst/></a:effectStyle>";
        format!(
            r#"{XML}<a:theme xmlns:a="{A}" name="T"><a:themeElements>{scheme}{fonts}<a:fmtScheme name="M"><a:fillStyleLst>{fill}{fill}{fill}</a:fillStyleLst><a:lnStyleLst>{line}{line}{line}</a:lnStyleLst><a:effectStyleLst>{effect}{effect}{effect}</a:effectStyleLst><a:bgFillStyleLst>{fill}{fill}{fill}</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>"#
        )
    }

    /// `.pptx` de 2 diapositives (O27 ; accepté par LibreOffice 26.2, pré-essai PC10 du plan).
    fn pptx() -> Vec<u8> {
        let ns = format!(r#"xmlns:a="{A}" xmlns:r="{R}" xmlns:p="{P}""#);
        let tree = |shapes: &str| {
            format!(r#"<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>{shapes}</p:spTree></p:cSld>"#)
        };
        let text = |t: &str| {
            format!(r#"<p:sp><p:nvSpPr><p:cNvPr id="2" name="T"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="914400" y="914400"/><a:ext cx="7315200" cy="1371600"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:p><a:r><a:rPr lang="fr-FR" sz="4400"/><a:t>{t}</a:t></a:r></a:p></p:txBody></p:sp>"#)
        };
        let slide = |t: &str| format!(r#"{XML}<p:sld {ns}>{}<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>"#, tree(&text(t)));
        let master = format!(
            r#"{XML}<p:sldMaster {ns}>{}<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>"#,
            tree("")
        );
        let layout = format!(r#"{XML}<p:sldLayout {ns} type="blank">{}<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>"#, tree(""));
        let presentation = format!(
            r#"{XML}<p:presentation {ns}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId3"/></p:sldIdLst><p:sldSz cx="9144000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>"#
        );
        let to_layout = rels(&[("rId1", "slideLayout", "../slideLayouts/slideLayout1.xml")]);
        let pml = |kind: &str| format!("application/vnd.openxmlformats-officedocument.presentationml.{kind}+xml");
        let (pres_ct, master_ct, layout_ct, slide_ct) =
            (pml("presentation.main"), pml("slideMaster"), pml("slideLayout"), pml("slide"));
        zip_of(&[
            ("[Content_Types].xml", types(&[
                ("/ppt/presentation.xml", pres_ct.as_str()),
                ("/ppt/slideMasters/slideMaster1.xml", master_ct.as_str()),
                ("/ppt/slideLayouts/slideLayout1.xml", layout_ct.as_str()),
                ("/ppt/theme/theme1.xml", "application/vnd.openxmlformats-officedocument.theme+xml"),
                ("/ppt/slides/slide1.xml", slide_ct.as_str()),
                ("/ppt/slides/slide2.xml", slide_ct.as_str()),
            ])),
            ("_rels/.rels", rels(&[("rId1", "officeDocument", "ppt/presentation.xml")])),
            ("ppt/presentation.xml", presentation),
            ("ppt/_rels/presentation.xml.rels", rels(&[
                ("rId1", "slideMaster", "slideMasters/slideMaster1.xml"),
                ("rId2", "slide", "slides/slide1.xml"),
                ("rId3", "slide", "slides/slide2.xml"),
                ("rId4", "theme", "theme/theme1.xml"),
            ])),
            ("ppt/slideMasters/slideMaster1.xml", master),
            ("ppt/slideMasters/_rels/slideMaster1.xml.rels", rels(&[
                ("rId1", "slideLayout", "../slideLayouts/slideLayout1.xml"),
                ("rId2", "theme", "../theme/theme1.xml"),
            ])),
            ("ppt/slideLayouts/slideLayout1.xml", layout),
            ("ppt/slideLayouts/_rels/slideLayout1.xml.rels", rels(&[("rId1", "slideMaster", "../slideMasters/slideMaster1.xml")])),
            ("ppt/theme/theme1.xml", theme()),
            ("ppt/slides/slide1.xml", slide("Diapositive 1")),
            ("ppt/slides/_rels/slide1.xml.rels", to_layout.clone()),
            ("ppt/slides/slide2.xml", slide("Diapositive 2")),
            ("ppt/slides/_rels/slide2.xml.rels", to_layout),
        ])
    }

    /// Fixture commitée, relue par l'essai navigateur (O27) ; régénérée par `ROOMBOARD_REGENERER_FIXTURES=1`.
    fn fixture(name: &str, make: fn() -> Vec<u8>) -> Vec<u8> {
        let p = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests").join("fixtures").join(name);
        if std::env::var("ROOMBOARD_REGENERER_FIXTURES").as_deref() == Ok("1") {
            fs::create_dir_all(p.parent().expect("dossier")).expect("dossier");
            fs::write(&p, make()).expect("écriture");
        }
        fs::read(&p).unwrap_or_else(|_| {
            panic!("fixture {name} absente : ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-shell office")
        })
    }

    /// O26 : LibreOffice exigé ; absent, le test échoue, sauf `ROOMBOARD_SANS_SOFFICE=1` (saut dit sur stderr).
    fn soffice() -> Option<Converter> {
        match find_converter(&Search::from_env()) {
            Some(c) => Some(c),
            None if std::env::var("ROOMBOARD_SANS_SOFFICE").as_deref() == Ok("1") => {
                eprintln!("test sauté : soffice introuvable et ROOMBOARD_SANS_SOFFICE=1");
                None
            }
            None => panic!("soffice introuvable : installez LibreOffice, ou posez ROOMBOARD_SANS_SOFFICE=1 pour sauter ce test"),
        }
    }

    /// Faux convertisseur (script lancé directement, comme `soffice`) écrit sous `CONVERT_LOCK` : aucun lancement d'un
    /// autre test ne garde le fichier ouvert en écriture (ETXTBSY). `$d` = dossier du script.
    #[cfg(unix)]
    fn fake_converter(dir: &Path, body: &str) -> Converter {
        let _one = CONVERT_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let script = format!("#!/bin/sh\nd=$(dirname \"$0\")\n{body}\n");
        Converter::LibreOffice(executable(&dir.join("faux-soffice"), &script))
    }

    fn granted(dir: &Path, name: &str, bytes: &[u8]) -> (GrantedPaths, PathBuf) {
        let p = dir.join(name);
        fs::write(&p, bytes).unwrap();
        let g = GrantedPaths::default();
        g.grant([p.clone()]);
        (g, p)
    }

    fn left_in(work: &Path) -> usize {
        fs::read_dir(work.join(CONVERSIONS_DIR)).map(|r| r.count()).unwrap_or(0)
    }

    /// Pages d'un PDF : objets `/Type/Page` ou `/Type /Page` (jamais `/Pages`).
    fn pdf_pages(b: &[u8]) -> usize {
        [&b"/Type/Page"[..], &b"/Type /Page"[..]]
            .iter()
            .map(|pat| b.windows(pat.len() + 1).filter(|w| w.starts_with(pat) && w[pat.len()] != b's').count())
            .sum()
    }
```

- [ ] **Étape 2 : tests rouges.** À la suite :

```rust
    /// S1 (O8, O28, O35) : `cours.docx`, `diapos.pptx` (2 diapositives) et `notes.xlsx` convertis par LibreOffice :
    /// PDF lus par l'accord, `%PDF-`, 2 pages pour le `.pptx`, profil supprimé ; après `release_conversion`, ni
    /// dossier sous `conversions/`, ni accord.
    #[cfg(unix)]
    #[test]
    fn real_libreoffice_converts_docx_pptx_xlsx() {
        let Some(conv) = soffice() else { return };
        let d = dir("reel");
        let work = d.join("travail");
        let cases = [
            ("cours.docx", fixture("cours.docx", docx), 1),
            ("diapos.pptx", fixture("diapos.pptx", pptx), 2),
            ("notes.xlsx", fixture("notes.xlsx", xlsx), 1),
        ];
        for (name, bytes, pages) in cases {
            let (g, src) = granted(&d, name, &bytes);
            let c = convert_granted(&g, &src, Some(&conv), &work, CONVERT_TIMEOUT)
                .unwrap_or_else(|e| panic!("{name} : {e}"));
            let pdf = read_granted(&g, &c.pdf, 0, c.size).expect("PDF accordé");
            assert!(pdf.starts_with(b"%PDF-"), "{name} : %PDF- attendu");
            assert_eq!(pdf_pages(&pdf), pages, "{name} : pages");
            assert!(!c.pdf.parent().expect("dossier").join("profil").exists(), "{name} : profil supprimé");
            release_conversion(&g, &work, &c.id);
            assert_eq!(read_granted(&g, &c.pdf, 0, 1), Err(ReadError::NotGranted));
            assert_eq!(left_in(&work), 0, "{name} : dossier de conversion supprimé");
        }
    }

    /// Processus absent ou zombie (état `Z` de `/proc/<pid>/stat`), attendu jusqu'à 2 s.
    #[cfg(target_os = "linux")]
    fn gone(pid: u32) -> bool {
        for _ in 0..40 {
            match fs::read_to_string(format!("/proc/{pid}/stat")) {
                Err(_) => return true,
                Ok(s) if s.rsplit_once(") ").is_some_and(|(_, rest)| rest.starts_with('Z')) => return true,
                Ok(_) => std::thread::sleep(Duration::from_millis(50)),
            }
        }
        false
    }

    /// S2 (O11, DA-O5) : un faux convertisseur lance un enfant puis attend ; délai de 2 s : `Timeout` moins de 4 s après
    /// son lancement (heure de `parent.pid` : l'attente du verrou ne compte pas), ni lui ni son enfant ne vivent, le
    /// dossier de conversion est supprimé.
    #[cfg(target_os = "linux")]
    #[test]
    fn timeout_kills_the_launcher_and_its_child() {
        let d = dir("delai");
        let conv = fake_converter(&d, "echo $$ > \"$d/parent.pid\"\nsleep 60 &\necho $! > \"$d/enfant.pid\"\nwait");
        let (g, src) = granted(&d, "cours.docx", b"PK\x03\x04x");
        let work = d.join("travail");
        let r = convert_granted(&g, &src, Some(&conv), &work, Duration::from_secs(2));
        assert_eq!(r.err(), Some(ConvertError::Timeout));
        let started = fs::metadata(d.join("parent.pid")).and_then(|m| m.modified()).expect("lancé");
        let took = SystemTime::now().duration_since(started).unwrap_or_default();
        assert!(took < Duration::from_secs(4), "délai : {took:?}");
        for f in ["parent.pid", "enfant.pid"] {
            let pid: u32 = fs::read_to_string(d.join(f)).expect(f).trim().parse().expect("pid");
            assert!(gone(pid), "{f} ({pid}) encore vivant");
        }
        assert_eq!(left_in(&work), 0);
    }

    /// S2 (O8, O9) : le nom d'origine n'atteint jamais les arguments ; l'entrée est copiée sous `source.docx`.
    #[cfg(unix)]
    #[test]
    fn hostile_name_never_reaches_the_arguments() {
        let d = dir("nom");
        let conv = fake_converter(&d, "for a in \"$@\"; do printf '%s\\n' \"$a\" >> \"$d/args.txt\"; done");
        let (g, src) = granted(&d, "-x; $(touch pwn).docx", b"PK\x03\x04x");
        let work = d.join("travail");
        assert_eq!(
            convert_granted(&g, &src, Some(&conv), &work, CONVERT_TIMEOUT).err(),
            Some(ConvertError::NoOutput)
        );
        let args = fs::read_to_string(d.join("args.txt")).expect("arguments");
        let lines: Vec<&str> = args.lines().collect();
        assert_eq!(lines.len(), 12, "{args}");
        assert_eq!(&lines[..6], &["--headless", "--invisible", "--norestore", "--nolockcheck", "--nodefault", "--nologo"]);
        assert!(lines[6].starts_with("-env:UserInstallation=file://"));
        assert!(lines[11].ends_with("/source.docx"));
        assert!(!args.contains("pwn") && !args.contains("-x;"));
        assert!(!d.join("pwn").exists());
        assert_eq!(left_in(&work), 0);
    }

    /// S2 (O9) : une sortie `source.pdf` en lien symbolique est refusée (`NoOutput`), sa cible jamais accordée.
    #[cfg(unix)]
    #[test]
    fn symlinked_output_is_refused() {
        let d = dir("lien");
        fs::write(d.join("secret.txt"), b"s").unwrap();
        let conv = fake_converter(&d, "ln -s \"$d/secret.txt\" \"$(pwd)/source.pdf\"");
        let (g, src) = granted(&d, "cours.docx", b"PK\x03\x04x");
        let work = d.join("travail");
        assert_eq!(
            convert_granted(&g, &src, Some(&conv), &work, CONVERT_TIMEOUT).err(),
            Some(ConvertError::NoOutput)
        );
        assert_eq!(read_granted(&g, &d.join("secret.txt"), 0, 1), Err(ReadError::NotGranted));
        assert_eq!(left_in(&work), 0);
    }

    /// S2 (U24) : fichier non accordé : `NotGranted`, aucun processus lancé, aucun dossier de travail créé.
    #[cfg(unix)]
    #[test]
    fn ungranted_file_is_refused_before_any_process() {
        let d = dir("accord");
        let conv = fake_converter(&d, "touch \"$d/lance\"");
        let src = d.join("cours.docx");
        fs::write(&src, b"PK\x03\x04x").unwrap();
        let work = d.join("travail");
        assert_eq!(
            convert_granted(&GrantedPaths::default(), &src, Some(&conv), &work, CONVERT_TIMEOUT).err(),
            Some(ConvertError::NotGranted)
        );
        assert!(!d.join("lance").exists());
        assert!(!work.exists());
    }

    /// S2 (O2, O14) : plus de 100 Mio : `TooLarge` ; en-tête ou extension faux : `NotOffice` ; sans convertisseur :
    /// `NoProgram` ; aucun processus lancé.
    #[cfg(unix)]
    #[test]
    fn too_large_not_office_and_no_program_launch_nothing() {
        let d = dir("refus");
        let conv = fake_converter(&d, "touch \"$d/lance\"");
        let work = d.join("travail");
        let big = d.join("gros.docx");
        fs::File::create(&big).unwrap().set_len(OFFICE_MAX_BYTES + 1).unwrap();
        let g = GrantedPaths::default();
        g.grant([big.clone()]);
        assert_eq!(convert_granted(&g, &big, Some(&conv), &work, CONVERT_TIMEOUT).err(), Some(ConvertError::TooLarge));
        let (g2, fake) = granted(&d, "faux.docx", b"MZ\x90\x00");
        assert_eq!(convert_granted(&g2, &fake, Some(&conv), &work, CONVERT_TIMEOUT).err(), Some(ConvertError::NotOffice));
        let (g3, pdf) = granted(&d, "cours.pdf", b"%PDF-");
        assert_eq!(convert_granted(&g3, &pdf, Some(&conv), &work, CONVERT_TIMEOUT).err(), Some(ConvertError::NotOffice));
        let (g4, ok) = granted(&d, "cours.docx", b"PK\x03\x04x");
        assert_eq!(convert_granted(&g4, &ok, None, &work, CONVERT_TIMEOUT).err(), Some(ConvertError::NoProgram));
        assert!(!d.join("lance").exists());
    }

    /// S2 (O9) : racine de travail en lien symbolique : refusée, rien écrit dans la cible, aucun processus.
    #[cfg(unix)]
    #[test]
    fn symlinked_work_root_is_refused() {
        let d = dir("racine");
        let conv = fake_converter(&d, "touch \"$d/lance\"");
        let real = d.join("vraie");
        fs::create_dir(&real).unwrap();
        let link = d.join("racine-lien");
        std::os::unix::fs::symlink(&real, &link).unwrap();
        let (g, src) = granted(&d, "cours.docx", b"PK\x03\x04x");
        assert!(matches!(convert_granted(&g, &src, Some(&conv), &link, CONVERT_TIMEOUT), Err(ConvertError::Io(_))));
        assert!(!d.join("lance").exists());
        assert!(!real.join(CONVERSIONS_DIR).exists());
    }

    /// Review Focus 2 : `.docx` abîmé à en-tête ZIP valide : LibreOffice rend 1 (« source file could not be loaded »)
    /// → `Failed` (ou `NoOutput`), rien ne reste.
    #[cfg(unix)]
    #[test]
    fn corrupt_docx_fails_and_leaves_nothing() {
        let Some(conv) = soffice() else { return };
        let d = dir("abime");
        let (g, src) = granted(&d, "abime.docx", b"PK\x03\x04garbagegarbage");
        let work = d.join("travail");
        let r = convert_granted(&g, &src, Some(&conv), &work, CONVERT_TIMEOUT);
        assert!(matches!(r, Err(ConvertError::Failed(_)) | Err(ConvertError::NoOutput)), "{r:?}");
        assert_eq!(left_in(&work), 0);
    }

    /// O35, Review Focus 3 : seul un identifiant `<chiffres>-<chiffres>` est libéré ; `../x` ne supprime rien.
    #[test]
    fn release_conversion_ignores_foreign_ids() {
        let d = dir("liberer");
        let work = d.join("travail");
        fs::create_dir_all(work.join(CONVERSIONS_DIR).join("12-3")).unwrap();
        fs::write(work.join("secret"), b"s").unwrap();
        let g = GrantedPaths::default();
        for bad in ["../secret", "..", "12-3/..", "a-b", "12", "1-2-3", ""] {
            release_conversion(&g, &work, bad);
        }
        assert!(work.join("secret").exists());
        assert!(work.join(CONVERSIONS_DIR).join("12-3").exists());
        release_conversion(&g, &work, "12-3");
        assert!(!work.join(CONVERSIONS_DIR).join("12-3").exists());
    }

    /// O23 : au lancement, les dossiers d'un processus mort sont supprimés ; ceux du processus courant et les noms
    /// étrangers restent.
    #[cfg(unix)]
    #[test]
    fn purge_removes_conversions_of_dead_processes() {
        let d = dir("purge");
        let work = d.join("travail");
        let conversions = work.join(CONVERSIONS_DIR);
        let dead = conversions.join("4294967294-0");
        let mine = conversions.join(format!("{}-999", std::process::id()));
        let other = conversions.join("pas-un-id");
        for p in [&dead, &mine, &other] {
            fs::create_dir_all(p).unwrap();
        }
        purge_conversions(&work);
        assert!(!dead.exists());
        assert!(mine.exists() && other.exists());
    }
```

- [ ] **Étape 3 : les voir rouges.** `nice -n 10 cargo test -p roomboard-shell office:: 2>&1 | grep -E "error\[" | head -5`
  → `error[E0425]: cannot find value CONVERT_LOCK` / `function convert_granted`.

- [ ] **Étape 4 : imports.** En tête d'`office.rs`, compléter :

```rust
use std::io::Read;
use std::process::{Child, Command, ExitStatus, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::Instant;

use crate::GrantedPaths;
```

- [ ] **Étape 5 : dossier de conversion, verrou, garde.** Après `write_profile` :

```rust
/// Une conversion à la fois (O12) : la seconde attend la première ; le délai ne court que pendant le processus.
static CONVERT_LOCK: Mutex<()> = Mutex::new(());
/// Compteur des dossiers de conversion de ce processus (`<pid>-<n>`).
static NEXT_CONVERSION: AtomicU64 = AtomicU64::new(0);
const CONVERSIONS_DIR: &str = "conversions";
/// Sortie attendue dans le dossier de conversion (l'entrée y est copiée sous `source.<ext>`).
const OUTPUT_NAME: &str = "source.pdf";

/// PDF produit (O35) : `pdf` (chemin canonique) reste accordé jusqu'à `release_conversion(id)`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Converted {
    pub id: String,
    pub pdf: PathBuf,
    pub size: u64,
}

/// Supprime un dossier à la fin de sa portée (succès, erreur ou délai), sauf `keep`.
struct RemoveOnDrop(Option<PathBuf>);

impl RemoveOnDrop {
    fn keep(mut self) {
        self.0 = None;
    }
}

impl Drop for RemoveOnDrop {
    fn drop(&mut self) {
        if let Some(p) = self.0.take() {
            let _ = fs::remove_dir_all(p);
        }
    }
}

/// Identifiant de conversion : `<chiffres>-<chiffres>`, jamais un chemin.
fn is_conversion_id(id: &str) -> bool {
    let digits = |s: &str| !s.is_empty() && s.bytes().all(|b| b.is_ascii_digit());
    let mut parts = id.split('-');
    matches!((parts.next(), parts.next(), parts.next()), (Some(a), Some(b), None) if digits(a) && digits(b))
}

/// Dossier neuf `<racine>/conversions/<pid>-<n>` créé par `create_dir` (échoue s'il existe) ; racine et `conversions/`
/// privées (O9).
fn new_conversion_dir(work_root: &Path) -> Result<(String, PathBuf), ConvertError> {
    if let Some(parent) = work_root.parent() {
        fs::create_dir_all(parent).map_err(io)?;
    }
    ensure_private_dir(work_root)?;
    let conversions = work_root.join(CONVERSIONS_DIR);
    ensure_private_dir(&conversions)?;
    let id = format!(
        "{}-{}",
        std::process::id(),
        NEXT_CONVERSION.fetch_add(1, Ordering::Relaxed)
    );
    let dir = conversions.join(&id);
    fs::create_dir(&dir).map_err(io)?;
    Ok((id, dir))
}
```

- [ ] **Étape 6 : arbre de processus.** À la suite :

```rust
/// Arbre de processus d'une conversion (O11, DA-O5) : groupe de processus sous Unix (`process_group(0)` au lancement),
/// objet Job `KILL_ON_JOB_CLOSE` sous Windows (affecté juste après `spawn` ; un enfant lancé avant échappe au Job,
/// risque accepté, HO2-13).
#[cfg(unix)]
struct ProcessTree(libc::pid_t);

#[cfg(unix)]
impl ProcessTree {
    fn attach(child: &Child) -> Self {
        ProcessTree(child.id() as libc::pid_t)
    }

    fn kill(&self) {
        // SAFETY : signal envoyé au groupe créé par `process_group(0)` ; aucune mémoire partagée.
        unsafe {
            libc::kill(-self.0, libc::SIGKILL);
        }
    }
}

#[cfg(windows)]
struct ProcessTree(Option<windows::Win32::Foundation::HANDLE>);

#[cfg(windows)]
impl ProcessTree {
    fn attach(child: &Child) -> Self {
        use std::os::windows::io::AsRawHandle;
        use windows::Win32::Foundation::{CloseHandle, HANDLE};
        use windows::Win32::System::JobObjects::{
            AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation, SetInformationJobObject,
            JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
        };
        // SAFETY : poignées possédées ; le Job est fermé par `kill` (KILL_ON_JOB_CLOSE tue l'arbre).
        unsafe {
            let Ok(job) = CreateJobObjectW(None, windows::core::PCWSTR::null()) else {
                return ProcessTree(None);
            };
            let mut info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
            info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            let set = SetInformationJobObject(
                job,
                JobObjectExtendedLimitInformation,
                &info as *const _ as *const core::ffi::c_void,
                std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
            );
            if set.is_err() || AssignProcessToJobObject(job, HANDLE(child.as_raw_handle())).is_err() {
                let _ = CloseHandle(job);
                return ProcessTree(None);
            }
            ProcessTree(Some(job))
        }
    }

    fn kill(&self) {
        use windows::Win32::Foundation::CloseHandle;
        use windows::Win32::System::JobObjects::TerminateJobObject;
        if let Some(job) = self.0 {
            // SAFETY : Job possédé, fermé une seule fois.
            unsafe {
                let _ = TerminateJobObject(job, 1);
                let _ = CloseHandle(job);
            }
        }
    }
}

/// Attend la fin par `try_wait` toutes les 50 ms ; au délai et après la fin, tue l'arbre entier, puis `wait()` (aucun
/// zombie) ; au délai, `Timeout`.
fn wait_tree(mut child: Child, timeout: Duration) -> Result<ExitStatus, ConvertError> {
    let tree = ProcessTree::attach(&child);
    let start = Instant::now();
    let status = loop {
        match child.try_wait().map_err(io)? {
            Some(s) => break Some(s),
            None if start.elapsed() >= timeout => break None,
            None => std::thread::sleep(Duration::from_millis(50)),
        }
    };
    tree.kill();
    if status.is_none() {
        let _ = child.kill(); // repli si le Job n'a pas pu être posé (Windows)
    }
    let waited = child.wait().map_err(io)?;
    status.map(|_| waited).ok_or(ConvertError::Timeout)
}
```

- [ ] **Étape 7 : lancement de LibreOffice et sortie contrôlée.** À la suite :

```rust
/// Derniers `ERR_KEEP` octets d'un fichier de sortie, pour le message d'échec.
fn tail_of(p: &Path) -> String {
    let b = fs::read(p).unwrap_or_default();
    String::from_utf8_lossy(&b[b.len().saturating_sub(ERR_KEEP)..]).trim().to_string()
}

/// Lance LibreOffice (O8, O10, O11) : profil jetable écrit avant, supprimé à la fin (garde) ; `stdin` nul, `stdout` et
/// `stderr` dans des fichiers du dossier (aucun tube qui se remplit) ; dossier courant = dossier de conversion.
fn run_libreoffice(program: &Path, input: &Path, dir: &Path, timeout: Duration) -> Result<(), ConvertError> {
    let profile = dir.join("profil");
    let _profile_guard = RemoveOnDrop(Some(profile.clone()));
    write_profile(&profile)?;
    let out = fs::File::create(dir.join("soffice.out")).map_err(io)?;
    let err = fs::File::create(dir.join("soffice.err")).map_err(io)?;
    let mut cmd = Command::new(program);
    cmd.args(libreoffice_args(input, dir, &profile))
        .current_dir(dir)
        .stdin(Stdio::null())
        .stdout(Stdio::from(out))
        .stderr(Stdio::from(err));
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        cmd.process_group(0);
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let child = cmd.spawn().map_err(io)?;
    let status = wait_tree(child, timeout)?;
    if !status.success() {
        let mut detail = tail_of(&dir.join("soffice.err"));
        if detail.is_empty() {
            detail = tail_of(&dir.join("soffice.out"));
        }
        return Err(ConvertError::Failed(detail));
    }
    Ok(())
}

/// `source.pdf` exigé fichier ordinaire (jamais un lien), directement sous le dossier canonique (O9).
fn checked_output(dir: &Path) -> Result<PathBuf, ConvertError> {
    let pdf = dir.join(OUTPUT_NAME);
    let Ok(m) = fs::symlink_metadata(&pdf) else {
        return Err(ConvertError::NoOutput);
    };
    if !m.file_type().is_file() {
        return Err(ConvertError::NoOutput);
    }
    let canon_dir = dir.canonicalize().map_err(io)?;
    let canon = pdf.canonicalize().map_err(io)?;
    if canon.parent() != Some(canon_dir.as_path()) {
        return Err(ConvertError::NoOutput);
    }
    Ok(canon)
}

/// Convertit en PDF un fichier accordé (O8 à O12, O35). Refus dans l'ordre : non accordé, extension, taille, en-tête,
/// aucun convertisseur ; puis copie sous `source.<ext>` dans un dossier neuf, lancement, contrôle et accord de la
/// sortie. Tout échec supprime le dossier.
pub fn convert_granted(
    g: &GrantedPaths,
    path: &Path,
    c: Option<&Converter>,
    work_root: &Path,
    timeout: Duration,
) -> Result<Converted, ConvertError> {
    let src = g.granted_path(path).ok_or(ConvertError::NotGranted)?;
    let ext = office_extension(&src).ok_or(ConvertError::NotOffice)?;
    if fs::metadata(&src).map_err(io)?.len() > OFFICE_MAX_BYTES {
        return Err(ConvertError::TooLarge);
    }
    let mut head = Vec::new();
    fs::File::open(&src)
        .map_err(io)?
        .take(8)
        .read_to_end(&mut head)
        .map_err(io)?;
    if !has_office_magic(&ext, &head) {
        return Err(ConvertError::NotOffice);
    }
    let converter = c.ok_or(ConvertError::NoProgram)?;
    let _one = CONVERT_LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let (id, dir) = new_conversion_dir(work_root)?;
    let guard = RemoveOnDrop(Some(dir.clone()));
    let input = dir.join(format!("source.{ext}"));
    fs::copy(&src, &input).map_err(io)?;
    match converter {
        Converter::LibreOffice(program) => run_libreoffice(program, &input, &dir, timeout)?,
        #[cfg(windows)]
        Converter::MsOffice => com::convert(&input, &dir.join(OUTPUT_NAME), timeout)?,
    }
    let pdf = checked_output(&dir)?;
    let size = fs::metadata(&pdf).map_err(io)?.len();
    let pdf = g.grant([pdf]).into_iter().next().ok_or(ConvertError::NoOutput)?;
    guard.keep();
    Ok(Converted { id, pdf, size })
}

/// Retire l'accord du PDF et supprime le dossier de la conversion `id` (O35) ; tout autre identifiant est ignoré.
pub fn release_conversion(g: &GrantedPaths, work_root: &Path, id: &str) {
    if !is_conversion_id(id) {
        return;
    }
    let dir = work_root.join(CONVERSIONS_DIR).join(id);
    g.revoke(&dir.join(OUTPUT_NAME));
    let _ = fs::remove_dir_all(&dir);
}

#[cfg(unix)]
fn process_alive(pid: u32) -> bool {
    let Ok(p) = libc::pid_t::try_from(pid) else {
        return false;
    };
    if p <= 0 {
        return false;
    }
    // SAFETY : signal 0, sans effet ; seule l'existence du processus est testée.
    let r = unsafe { libc::kill(p, 0) };
    r == 0 || std::io::Error::last_os_error().raw_os_error() == Some(libc::EPERM)
}

/// Windows : la vie d'un PID n'est pas testée (PC9 du plan) ; les restes d'une autre session sont supprimés.
#[cfg(not(unix))]
fn process_alive(_pid: u32) -> bool {
    false
}

/// Au lancement (O23) : supprime les dossiers de `conversions/` dont le processus n'existe plus (plantage).
pub fn purge_conversions(work_root: &Path) {
    let Ok(rd) = fs::read_dir(work_root.join(CONVERSIONS_DIR)) else {
        return;
    };
    for e in rd.flatten() {
        let name = e.file_name();
        let Some(name) = name.to_str() else { continue };
        if !is_conversion_id(name) {
            continue;
        }
        let pid: u32 = name.split('-').next().and_then(|p| p.parse().ok()).unwrap_or(0);
        if pid != std::process::id() && !process_alive(pid) {
            let _ = fs::remove_dir_all(e.path());
        }
    }
}
```

- [ ] **Étape 8 : fixtures, puis tests verts.**
  `ROOMBOARD_REGENERER_FIXTURES=1 nice -n 10 cargo test -p roomboard-shell office::tests::real 2>&1 | tail -5` (écrit les
  trois fixtures), puis la commande de la section « Test » sans la variable → vert. Si LibreOffice refuse le `.pptx`
  (HO2-9, non attendu d'après PC10) : le rapport le dit, avec `soffice.err`, et la tâche s'arrête là (bloquée).

- [ ] **Étape 9 : exemple.** Créer `crates/roomboard-shell/examples/convertir_office.rs` :

```rust
//! Conversion en ligne de commande (C16, O28, S4) : même code que la coque (`convert_granted`). Usage :
//! `cargo run -p roomboard-shell --example convertir_office -- <entrée Office> <sortie.pdf>`.
use std::path::PathBuf;
use std::process::ExitCode;

use roomboard_shell::office::{convert_granted, find_converter, release_conversion, Converter, Search, CONVERT_TIMEOUT};
use roomboard_shell::GrantedPaths;

fn main() -> ExitCode {
    let args: Vec<PathBuf> = std::env::args_os().skip(1).map(PathBuf::from).collect();
    let [input, output] = args.as_slice() else {
        eprintln!("usage : convertir_office <entrée Office> <sortie.pdf>");
        return ExitCode::from(2);
    };
    let Some(converter) = find_converter(&Search::from_env()) else {
        eprintln!("no-program : installez LibreOffice ou Microsoft Office");
        return ExitCode::from(1);
    };
    match &converter {
        Converter::LibreOffice(p) => println!("convertisseur : {}", p.display()),
        #[cfg(windows)]
        Converter::MsOffice => println!("convertisseur : Microsoft Office (COM)"),
    }
    let granted = GrantedPaths::default();
    granted.grant([input.clone()]);
    let root = std::env::temp_dir().join(format!("roomboard-convertir-{}", std::process::id()));
    let code = match convert_granted(&granted, input, Some(&converter), &root, CONVERT_TIMEOUT) {
        Ok(c) => {
            let copied = std::fs::copy(&c.pdf, output);
            release_conversion(&granted, &root, &c.id);
            match copied {
                Ok(n) => {
                    println!("PDF : {} ({n} octets)", output.display());
                    0
                }
                Err(e) => {
                    eprintln!("io : {e}");
                    1
                }
            }
        }
        Err(e) => {
            eprintln!("{e}");
            1
        }
    };
    let _ = std::fs::remove_dir_all(&root);
    ExitCode::from(code)
}
```

  Commande de la section « Test » (exemple) → `convertisseur : /usr/bin/soffice`, `PDF : /tmp/c16-T3/diapos.pdf (…)`, `%PDF-`.

- [ ] **Étape 10 : propreté.** `nice -n 10 cargo fmt --all && nice -n 10 cargo clippy -p roomboard-shell --all-targets -- -D warnings 2>&1 | tail -5` → vide.

- [ ] **Étape 11 : commit.**

```bash
git add crates/roomboard-shell/src/office.rs
git add crates/roomboard-shell/tests/fixtures/cours.docx
git add crates/roomboard-shell/tests/fixtures/diapos.pptx
git add crates/roomboard-shell/tests/fixtures/notes.xlsx
git add crates/roomboard-shell/examples/convertir_office.rs
git commit -m "feat(shell): convert Office files with LibreOffice, kill the whole process tree on timeout

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Durée des trois conversions réelles, tailles des PDF, lignes `Réutilisation : …`, écarts.

<a id="tache-t4"></a>
### Tâche T4 — Coque : COM Word, Excel, PowerPoint sous `cfg(windows)` (prouvé par lecture)

**Objectif.** Écrire `office/com.rs` : sans LibreOffice, Word, Excel ou PowerPoint convertit l'entrée en PDF par COM
(liaison tardive `IDispatch`, fil STA dédié), macros coupées avant toute ouverture, ouverture en lecture seule sans
fenêtre ni fichier récent, liens non mis à jour ; on ne ferme que ce qu'on a ouvert, on ne quitte l'application que si
on l'a lancée ; au délai, seuls les processus Office apparus pendant la conversion sont tués (O6, O13, HO2-5).
Scénario : S1 (branche Windows de la conversion ; essai réel R2 sur le PC).

**Fichiers.**
- Créer : `crates/roomboard-shell/src/office/com.rs`

**Interfaces.**
- Consomme (T2, `office.rs`) : `super::office_extension(path: &Path) -> Option<String>`, `super::ConvertError`,
  feature `windows` déclarée dans `crates/roomboard-shell/Cargo.toml` (`Win32_Foundation`, `Win32_System_Com`,
  `Win32_System_Ole`, `Win32_System_Variant`, `Win32_System_Threading`, `Win32_System_Diagnostics_ToolHelp`) ;
  `#[cfg(windows)] pub mod com;` déjà déclaré dans `office.rs`.
- Produit (appelé par `find_converter`, T2, et `convert_granted`, T3) :
  - `pub fn available() -> bool` (un des trois ProgID se résout) ;
  - `pub fn convert(input: &Path, out: &Path, timeout: Duration) -> Result<(), ConvertError>` (`input` =
    `<dossier>/source.<ext>`, `out` = `<dossier>/source.pdf`, même dossier de conversion, O9).
- Réutilise : `crates/roomboard-shell/src/office.rs` (T2) — `office_extension` pour choisir l'application, `ConvertError` (`Failed`, `Timeout`, `NotOffice`) pour les erreurs ; aucun module existant de COM (liste du cadrage : « Conversion en PDF », nouveau module).
- Le rapport porte `Réutilisation : appelé roomboard_shell::office` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.** Pas de test exécutable : la cible Windows n'est pas installée sur la VM (GC5 interdit de
l'installer). Exception explicite à GC1 pour ce fichier seul. Preuves :
- `rustup target list --installed | grep -c windows` → `0` (donc aucun `cargo check --target x86_64-pc-windows-msvc`).
- `nice -n 10 cargo test -p roomboard-shell 2>&1 | grep -E "test result|FAILED" | tail -5` → 0 `FAILED` (le fichier
  n'est pas compilé hors Windows, la crate reste verte).
- Lecture : le rapport recopie la liste de contrôle ci-dessous, chaque point suivi de `com.rs:<ligne>` :
  1. `AutomationSecurity = 3` posé avant tout `Open` (Word, Excel, PowerPoint) ;
  2. alertes coupées (`DisplayAlerts`) avant tout `Open`, valeurs d'origine remises si l'application était déjà ouverte ;
  3. Word : `Documents.Open` avec `ReadOnly`, `AddToRecentFiles=False`, `Visible=False`, `ConfirmConversions=False`, `PasswordDocument=""` ; `ExportAsFixedFormat(OutputFileName, 17)` ;
  4. Excel : `Workbooks.Open` avec `UpdateLinks=0`, `ReadOnly=True`, `AddToMru=False`, `Password=""` ; `ExportAsFixedFormat(Type=0, Filename)` ;
  5. PowerPoint : `Presentations.Open` avec `ReadOnly=msoTrue`, `Untitled=msoTrue`, `WithWindow=msoFalse` ; `SaveAs(FileName, 32)` ;
  6. fermeture du seul document ouvert, sans enregistrer, même si l'export échoue ;
  7. `Quit` seulement si `GetActiveObject` avait échoué avant `CoCreateInstance` (application lancée par nous) ;
  8. délai : `recv_timeout(timeout)` ; seuls les PID de `WINWORD.EXE`, `EXCEL.EXE`, `POWERPNT.EXE` absents avant la
     conversion sont tués ; `Timeout` rendu.

**Contraintes (recopiées de Global Constraints).**
- GC5 Aucun build Tauri, aucune installation de paquet système (ni de cible `rustup`), aucune dépendance GPL, LGPL ou AGPL liée.
- GC7 Sécurité : aucun shell, chemins contrôlés dans le dossier de travail, arbre tué au délai de 120 s (délai injecté par l'appelant).
- GC8 Branche COM sous `cfg(windows)`, prouvée par lecture.
- GC13 Git : fichier ajouté par son nom, pas de `commit -a`, aucun push forcé, aucun tag ; message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC14 Commentaires en français, identifiants en anglais.

**Interdits.** Aucun `powershell`, `cscript`, `wscript` ni script VBA ; aucune modification persistante des options
d'Office (`Options.*` de Word, `AskToUpdateLinks` d'Excel) ; ne jamais tuer un processus Office présent avant la
conversion ; aucun fichier hors de `office/com.rs`.

**Terminé quand.** Le fichier existe, les 8 points sont cités avec leur ligne, la crate reste verte sur la VM. Les
signatures `windows` 0.62 non vérifiées par un compilateur sont listées au rapport (HO2-11 : compilées au premier essai
R2).

**Étapes.**

- [ ] **Étape 1 : écrire `crates/roomboard-shell/src/office/com.rs`.**

```rust
//! Conversion par Microsoft Office (C16, O13) : Word, Excel ou PowerPoint par COM, liaison tardive (`IDispatch`), sur
//! un fil STA dédié. Sous `cfg(windows)` seulement : prouvé par lecture sur la VM (aucune cible Windows installée),
//! essai réel sur le PC (R2). Avant toute ouverture : `AutomationSecurity = 3` (`msoAutomationSecurityForceDisable`),
//! alertes coupées ; ouverture en lecture seule, sans fenêtre, hors fichiers récents, liens non mis à jour. On ne ferme
//! que ce qu'on a ouvert ; on ne quitte l'application que si on l'a lancée ; au délai, seuls les processus Office
//! apparus pendant la conversion sont tués (une instance ouverte avant par l'utilisateur ne l'est jamais, HO2-5).
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::time::Duration;

use windows::core::{IUnknown, BSTR, GUID, HSTRING, PCWSTR};
use windows::Win32::Foundation::CloseHandle;
use windows::Win32::System::Com::{
    CLSIDFromProgID, CoCreateInstance, CoInitializeEx, CoUninitialize, IDispatch, CLSCTX_LOCAL_SERVER,
    COINIT_APARTMENTTHREADED, DISPATCH_FLAGS, DISPATCH_METHOD, DISPATCH_PROPERTYGET, DISPATCH_PROPERTYPUT, DISPPARAMS,
};
use windows::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
};
use windows::Win32::System::Ole::{GetActiveObject, DISPID_PROPERTYPUT};
use windows::Win32::System::Threading::{OpenProcess, TerminateProcess, PROCESS_TERMINATE};
use windows::Win32::System::Variant::VARIANT;

use super::{office_extension, ConvertError};

/// `LOCALE_USER_DEFAULT`.
const LCID: u32 = 0x0400;
/// `msoAutomationSecurityForceDisable` : macros coupées pour les fichiers ouverts par programme.
const FORCE_DISABLE: i32 = 3;
const WD_FORMAT_PDF: i32 = 17;
const WD_DO_NOT_SAVE: i32 = 0;
const WD_ALERTS_NONE: i32 = 0;
const XL_TYPE_PDF: i32 = 0;
const XL_UPDATE_LINKS_NEVER: i32 = 0;
const PP_SAVE_AS_PDF: i32 = 32;
const PP_ALERTS_NONE: i32 = 1;
const MSO_TRUE: i32 = -1;
const MSO_FALSE: i32 = 0;

#[derive(Clone, Copy)]
enum App {
    Word,
    Excel,
    PowerPoint,
}

impl App {
    const ALL: [App; 3] = [App::Word, App::Excel, App::PowerPoint];

    fn of(input: &Path) -> Option<App> {
        match office_extension(input)?.as_str() {
            "docx" | "doc" | "odt" => Some(App::Word),
            "xlsx" | "xlsm" | "xls" | "ods" => Some(App::Excel),
            "pptx" | "ppt" | "odp" => Some(App::PowerPoint),
            _ => None,
        }
    }

    fn prog_id(self) -> &'static str {
        match self {
            App::Word => "Word.Application",
            App::Excel => "Excel.Application",
            App::PowerPoint => "PowerPoint.Application",
        }
    }

    fn image(self) -> &'static str {
        match self {
            App::Word => "WINWORD.EXE",
            App::Excel => "EXCEL.EXE",
            App::PowerPoint => "POWERPNT.EXE",
        }
    }
}

fn com_err(e: windows::core::Error) -> ConvertError {
    ConvertError::Failed(format!("COM : {e}"))
}

fn text(s: &str) -> VARIANT {
    VARIANT::from(BSTR::from(s))
}

fn path_text(p: &Path) -> VARIANT {
    text(&p.to_string_lossy())
}

/// Objet COM en liaison tardive.
struct Disp(IDispatch);

impl Disp {
    /// `IDispatch::Invoke` par noms : méthode (ou propriété) puis arguments nommés ; pour `PROPERTYPUT`, la valeur seule
    /// avec `DISPID_PROPERTYPUT`. Arguments rangés à l'envers, comme l'exige `Invoke`.
    fn invoke(&self, name: &str, flags: DISPATCH_FLAGS, args: Vec<(&str, VARIANT)>) -> Result<VARIANT, ConvertError> {
        let put = flags == DISPATCH_PROPERTYPUT;
        let mut wanted = vec![name];
        if !put {
            wanted.extend(args.iter().map(|(n, _)| *n));
        }
        let wide: Vec<HSTRING> = wanted.iter().map(|n| HSTRING::from(*n)).collect();
        let names: Vec<PCWSTR> = wide.iter().map(|w| PCWSTR(w.as_ptr())).collect();
        let mut ids = vec![0i32; names.len()];
        // SAFETY : `names` et `ids` ont la même longueur et vivent pendant l'appel.
        unsafe { self.0.GetIDsOfNames(&GUID::zeroed(), names.as_ptr(), names.len() as u32, LCID, ids.as_mut_ptr()) }
            .map_err(com_err)?;
        let mut named: Vec<i32> = if put { vec![DISPID_PROPERTYPUT] } else { ids[1..].iter().rev().copied().collect() };
        let mut values: Vec<VARIANT> = args.into_iter().map(|(_, v)| v).rev().collect();
        let params = DISPPARAMS {
            rgvarg: values.as_mut_ptr(),
            rgdispidNamedArgs: named.as_mut_ptr(),
            cArgs: values.len() as u32,
            cNamedArgs: if values.is_empty() { 0 } else { named.len() as u32 },
        };
        let mut out = VARIANT::default();
        // SAFETY : `values` et `named` vivent jusqu'au retour d'`Invoke` ; `out` est possédé ici.
        unsafe { self.0.Invoke(ids[0], &GUID::zeroed(), LCID, flags, &params, Some(&mut out), None, None) }
            .map_err(com_err)?;
        Ok(out)
    }

    fn value(&self, name: &str) -> Result<VARIANT, ConvertError> {
        self.invoke(name, DISPATCH_PROPERTYGET, vec![])
    }

    fn get(&self, name: &str) -> Result<Disp, ConvertError> {
        let v = self.value(name)?;
        IDispatch::try_from(&v).map(Disp).map_err(com_err)
    }

    fn put(&self, name: &str, v: VARIANT) -> Result<(), ConvertError> {
        self.invoke(name, DISPATCH_PROPERTYPUT, vec![("", v)]).map(|_| ())
    }

    fn call(&self, name: &str, args: Vec<(&str, VARIANT)>) -> Result<VARIANT, ConvertError> {
        self.invoke(name, DISPATCH_FLAGS(DISPATCH_METHOD.0 | DISPATCH_PROPERTYGET.0), args)
    }

    fn object(&self, name: &str, args: Vec<(&str, VARIANT)>) -> Result<Disp, ConvertError> {
        let v = self.call(name, args)?;
        IDispatch::try_from(&v).map(Disp).map_err(com_err)
    }
}

/// Pose `AutomationSecurity` et les alertes avant toute ouverture, lance `work`, puis remet les valeurs d'origine
/// (instance déjà ouverte par l'utilisateur).
fn guarded(app: &Disp, alerts: VARIANT, work: impl FnOnce() -> Result<(), ConvertError>) -> Result<(), ConvertError> {
    let old_security = app.value("AutomationSecurity")?;
    let old_alerts = app.value("DisplayAlerts")?;
    app.put("AutomationSecurity", VARIANT::from(FORCE_DISABLE))?;
    app.put("DisplayAlerts", alerts)?;
    let r = work();
    let _ = app.put("DisplayAlerts", old_alerts);
    let _ = app.put("AutomationSecurity", old_security);
    r
}

fn export_word(app: &Disp, input: &Path, out: &Path) -> Result<(), ConvertError> {
    guarded(app, VARIANT::from(WD_ALERTS_NONE), || {
        let doc = app.get("Documents")?.object(
            "Open",
            vec![
                ("FileName", path_text(input)),
                ("ConfirmConversions", VARIANT::from(false)),
                ("ReadOnly", VARIANT::from(true)),
                ("AddToRecentFiles", VARIANT::from(false)),
                ("PasswordDocument", text("")),
                ("Visible", VARIANT::from(false)),
            ],
        )?;
        let r = doc
            .call("ExportAsFixedFormat", vec![("OutputFileName", path_text(out)), ("ExportFormat", VARIANT::from(WD_FORMAT_PDF))])
            .map(|_| ());
        let _ = doc.call("Close", vec![("SaveChanges", VARIANT::from(WD_DO_NOT_SAVE))]);
        r
    })
}

fn export_excel(app: &Disp, input: &Path, out: &Path) -> Result<(), ConvertError> {
    guarded(app, VARIANT::from(false), || {
        let book = app.get("Workbooks")?.object(
            "Open",
            vec![
                ("Filename", path_text(input)),
                ("UpdateLinks", VARIANT::from(XL_UPDATE_LINKS_NEVER)),
                ("ReadOnly", VARIANT::from(true)),
                ("Password", text("")),
                ("IgnoreReadOnlyRecommended", VARIANT::from(true)),
                ("Notify", VARIANT::from(false)),
                ("AddToMru", VARIANT::from(false)),
            ],
        )?;
        let r = book
            .call("ExportAsFixedFormat", vec![("Type", VARIANT::from(XL_TYPE_PDF)), ("Filename", path_text(out))])
            .map(|_| ());
        let _ = book.call("Close", vec![("SaveChanges", VARIANT::from(false))]);
        r
    })
}

fn export_powerpoint(app: &Disp, input: &Path, out: &Path) -> Result<(), ConvertError> {
    guarded(app, VARIANT::from(PP_ALERTS_NONE), || {
        let pres = app.get("Presentations")?.object(
            "Open",
            vec![
                ("FileName", path_text(input)),
                ("ReadOnly", VARIANT::from(MSO_TRUE)),
                ("Untitled", VARIANT::from(MSO_TRUE)),
                ("WithWindow", VARIANT::from(MSO_FALSE)),
            ],
        )?;
        let r = pres
            .call("SaveAs", vec![("FileName", path_text(out)), ("FileFormat", VARIANT::from(PP_SAVE_AS_PDF))])
            .map(|_| ());
        let _ = pres.call("Close", vec![]);
        r
    })
}

/// Corps du fil STA : application obtenue par `CoCreateInstance` ; `Quit` seulement si elle ne tournait pas avant.
fn run_app(app: App, input: &Path, out: &Path) -> Result<(), ConvertError> {
    // SAFETY : appels COM sur ce fil, initialisé STA par `sta`.
    let clsid = unsafe { CLSIDFromProgID(&HSTRING::from(app.prog_id())) }.map_err(com_err)?;
    let mut active: Option<IUnknown> = None;
    // SAFETY : `active` reçoit une référence comptée, libérée à la sortie de portée.
    let running = unsafe { GetActiveObject(&clsid, None, &mut active) }.is_ok();
    drop(active);
    // SAFETY : création hors processus (serveur local) ; l'interface est libérée avec `d`.
    let disp: IDispatch = unsafe { CoCreateInstance(&clsid, None, CLSCTX_LOCAL_SERVER) }.map_err(com_err)?;
    let d = Disp(disp);
    let r = match app {
        App::Word => export_word(&d, input, out),
        App::Excel => export_excel(&d, input, out),
        App::PowerPoint => export_powerpoint(&d, input, out),
    };
    if !running {
        let _ = d.call("Quit", vec![]);
    }
    r
}

fn sta(app: App, input: &Path, out: &Path) -> Result<(), ConvertError> {
    // SAFETY : fil dédié, initialisé STA ici et désinitialisé avant de rendre ; tout objet COM est libéré avant.
    unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) }.ok().map_err(com_err)?;
    let r = run_app(app, input, out);
    // SAFETY : pendant de `CoInitializeEx` ci-dessus.
    unsafe { CoUninitialize() };
    r
}

/// PID des processus `image` (sans tenir compte de la casse).
fn pids_of(image: &str) -> HashSet<u32> {
    let mut out = HashSet::new();
    // SAFETY : instantané possédé, fermé avant de rendre ; `dwSize` posé avant le premier appel.
    unsafe {
        let Ok(snap) = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) else {
            return out;
        };
        let mut entry = PROCESSENTRY32W {
            dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
            ..Default::default()
        };
        let mut ok = Process32FirstW(snap, &mut entry).is_ok();
        while ok {
            let len = entry.szExeFile.iter().position(|&c| c == 0).unwrap_or(entry.szExeFile.len());
            if String::from_utf16_lossy(&entry.szExeFile[..len]).eq_ignore_ascii_case(image) {
                out.insert(entry.th32ProcessID);
            }
            ok = Process32NextW(snap, &mut entry).is_ok();
        }
        let _ = CloseHandle(snap);
    }
    out
}

fn kill(pid: u32) {
    // SAFETY : poignée ouverte puis fermée ici ; seul un processus Office apparu pendant la conversion est visé.
    unsafe {
        if let Ok(h) = OpenProcess(PROCESS_TERMINATE, false, pid) {
            let _ = TerminateProcess(h, 1);
            let _ = CloseHandle(h);
        }
    }
}

/// Vrai si Word, Excel ou PowerPoint est enregistré pour COM (O7).
pub fn available() -> bool {
    App::ALL
        .iter()
        // SAFETY : lecture du registre COM, sans effet.
        .any(|a| unsafe { CLSIDFromProgID(&HSTRING::from(a.prog_id())) }.is_ok())
}

/// Convertit `input` en `out` (même dossier de conversion, O9) par l'application de son extension ; au délai, rend
/// `Timeout` après avoir tué les seuls processus de cette application apparus pendant la conversion.
pub fn convert(input: &Path, out: &Path, timeout: Duration) -> Result<(), ConvertError> {
    let app = App::of(input).ok_or(ConvertError::NotOffice)?;
    let before = pids_of(app.image());
    let (tx, rx) = mpsc::channel();
    let (i, o): (PathBuf, PathBuf) = (input.to_path_buf(), out.to_path_buf());
    std::thread::spawn(move || {
        let _ = tx.send(sta(app, &i, &o));
    });
    match rx.recv_timeout(timeout) {
        Ok(r) => r,
        Err(_) => {
            for pid in pids_of(app.image()).difference(&before) {
                kill(*pid);
            }
            Err(ConvertError::Timeout)
        }
    }
}
```

- [ ] **Étape 2 : preuves.** Les trois commandes de la section « Test » ; relire le fichier et noter, pour chacun des 8
  points, la ligne qui le porte. Lister au rapport les appels dont la signature `windows` 0.62.2 est supposée
  (`GetActiveObject`, `OpenProcess` à `bool`, `IDispatch::try_from(&VARIANT)`, `VARIANT::from(bool | i32 | BSTR)`).

- [ ] **Étape 3 : commit.**

```bash
git add crates/roomboard-shell/src/office/com.rs
git commit -m "feat(shell): Microsoft Office COM fallback for Windows (read-only, macros disabled, quits only what it started)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t5"></a>
### Tâche T5 — Coque : copies d'originaux (`originals.rs`)

**Objectif.** « Modifier dans l'application d'origine » écrit une copie de l'original dans
`<cache>/originaux/<id>/<nom>` : nom par liste blanche (lettres et chiffres Unicode, `-`, `_`, `.`, espace), sans `-`,
`.` ni espace en tête, sans `.` ni espace en fin, 120 caractères au plus, noms réservés de Windows refusés ; extension
Office et en-tête ZIP ou CFB exigés ; dossier privé ; marque Internet sous Windows (O20, DA-O4). La coque relève taille
et date des seules copies écrites ici ; un changement stable sur deux relevés est dit une fois (O21, DA-O3). Copies
purgées au lancement au-delà de 7 jours (O23). Scénarios : S2 (`safe_name`, `.exe` refusé), S5 (relevé).

**Fichiers.**
- Créer : `crates/roomboard-shell/src/originals.rs`
- Modifier : `crates/roomboard-shell/src/lib.rs` (une ligne `pub mod originals;` sous `pub mod office;`).

**Interfaces.**
- Consomme (T2, `office.rs`) : `ensure_private_dir(p) -> Result<(), ConvertError>`, `office_extension(path) -> Option<String>`,
  `has_office_magic(ext, head) -> bool`, `ConvertError`, `pub(crate) io`, `OFFICE_MAX_BYTES`.
- Produit (T6 s'en sert), dans `crates/roomboard-shell/src/originals.rs` :
  - `pub const NAME_MAX_CHARS: usize` (120) ; `pub fn safe_name(name: &str) -> Option<String>` ;
    `pub fn decode_name(header: &str) -> Option<String>` (pourcentage → UTF-8) ;
  - `pub struct Originals` ; `Originals::new(root: PathBuf) -> Originals` ;
    `pub fn write(&self, name: &str, bytes: &[u8]) -> Result<(String, PathBuf), ConvertError>` (id `<pid>-<n>`) ;
    `pub fn path_of(&self, id: &str) -> Option<PathBuf>` ; `pub fn name_of(&self, id: &str) -> Option<String>` ;
    `pub fn changed(&self) -> Vec<(String, PathBuf)>` (trié par id) ;
  - `pub fn purge(root: &Path, older_than: Duration)`.
- Réutilise : `crates/roomboard-shell/src/office.rs` (T2) — `ensure_private_dir`, `office_extension`, `has_office_magic`, `ConvertError` ; aucun module existant de relevé (liste du cadrage : « Copies d'originaux et relevé », nouveau module, DA-O3, DA-O4).
- Le rapport porte `Réutilisation : appelé roomboard_shell::office` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
- `nice -n 10 cargo test -p roomboard-shell originals:: 2>&1 | grep -E "^test |test result|FAILED|panicked" | tail -20`
  → 0 `FAILED`, ≥ 7 tests : `safe_name_whitelist_reserved_and_length`, `decode_name_reads_percent_encoding`,
  `write_needs_office_extension_and_magic`, `originals_root_is_private`, `changed_reports_each_stable_save_once`,
  `changed_ignores_unknown_and_missing_files`, `purge_removes_old_copies_only`.
- `nice -n 10 cargo test -p roomboard-shell 2>&1 | grep -E "test result|FAILED" | tail -5` → crate verte ; clippy
  `-D warnings` et `cargo fmt --all --check` vides.

**Contraintes (recopiées de Global Constraints).**
- GC1 TDD : chaque test est écrit et vu rouge avant le code qui le fait passer.
- GC2 Preuves bornées qui montrent qu'un test a tourné (`nice -n 10 cargo test -p roomboard-shell … 2>&1 | tail -20`).
- GC5 Aucun build Tauri, aucune installation de paquet système, aucune dépendance GPL, LGPL ou AGPL liée.
- GC7 Sécurité : aucun shell, chemins contrôlés dans le dossier de travail ; un test par cas.
- GC13 Git : fichiers ajoutés un par un, pas de `commit -a`, aucun push forcé, aucun tag ; message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC14 Commentaires en français, identifiants en anglais ; `cargo fmt`, `clippy -D warnings` propres.

**Interdits.** Aucun appel à `open` ni lancement de programme ici (T6, `main.rs`) ; aucune dépendance neuve (pas de
`notify`, pas de `filetime`) ; jamais une copie supprimée à la sortie (O23) ; aucun chemin reçu de la page.

**Terminé quand.** Preuves vertes ; aucune autre modification de `lib.rs` qu'une ligne.

**Étapes.**

- [ ] **Étape 1 : tests rouges.** Créer `crates/roomboard-shell/src/originals.rs` avec l'en-tête, les `use` et les tests,
  et `pub mod originals;` dans `lib.rs` :

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn dir(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("rb-originals-{}-{name}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    /// O20 (S2) : liste blanche, têtes et fins nettoyées, noms réservés de Windows refusés (casse et extension
    /// ignorées), 120 caractères au plus en gardant l'extension.
    #[test]
    fn safe_name_whitelist_reserved_and_length() {
        assert_eq!(safe_name("a/../b<>.docx").as_deref(), Some("a_.._b__.docx"));
        assert_eq!(safe_name("Leçon 3 — été.pptx").as_deref(), Some("Leçon 3 _ été.pptx"));
        assert_eq!(safe_name("-x; $(touch pwn).docx").as_deref(), Some("x_ __touch pwn_.docx"));
        assert_eq!(safe_name(" ..cours.docx. ").as_deref(), Some("cours.docx"));
        for r in ["CON.docx", "con.DOCX", "Nul.xlsx", "COM1.pptx", "lpt9.doc", "AUX", "prn .odt"] {
            assert_eq!(safe_name(r), None, "{r}");
        }
        assert_eq!(safe_name(""), None);
        assert_eq!(safe_name("..."), None);
        assert_eq!(safe_name("CONSOLE.docx").as_deref(), Some("CONSOLE.docx"));
        let long = format!("{}.docx", "é".repeat(200));
        let s = safe_name(&long).expect("tronqué");
        assert_eq!(s.chars().count(), NAME_MAX_CHARS);
        assert!(s.ends_with(".docx"));
    }

    /// O20 : l'en-tête `x-roomboard-name` est encodé en pourcentage par la page (`encodeURIComponent`).
    #[test]
    fn decode_name_reads_percent_encoding() {
        assert_eq!(decode_name("Le%C3%A7on%203.pptx").as_deref(), Some("Leçon 3.pptx"));
        assert_eq!(decode_name("cours.docx").as_deref(), Some("cours.docx"));
        assert_eq!(decode_name("bad%2"), None);
        assert_eq!(decode_name("%zz"), None);
        assert_eq!(decode_name("%FF"), None);
    }

    /// O20 (S2, DA-O4) : extension Office et en-tête exigés ; un `.exe`, un `.docx` à en-tête MZ, un `.doc` à en-tête
    /// ZIP ou un nom réservé est refusé ; le nom écrit est le nom assaini.
    #[test]
    fn write_needs_office_extension_and_magic() {
        let d = dir("ecrire");
        let o = Originals::new(d.join("originaux"));
        for (name, bytes) in [
            ("virus.exe", &b"PK\x03\x04"[..]),
            ("cours.docx", &b"MZ\x90\x00"[..]),
            ("vieux.doc", &b"PK\x03\x04"[..]),
            ("CON.docx", &b"PK\x03\x04"[..]),
            ("cours.docx.exe", &b"PK\x03\x04"[..]),
        ] {
            assert_eq!(o.write(name, bytes).err(), Some(ConvertError::NotOffice), "{name}");
        }
        let (id, path) = o.write("a/../cours.docx", b"PK\x03\x04x").expect("écrit");
        assert_eq!(path, d.join("originaux").join(&id).join("a_.._cours.docx"));
        assert_eq!(fs::read(&path).unwrap(), b"PK\x03\x04x");
        assert_eq!(o.path_of(&id), Some(path));
        assert_eq!(o.name_of(&id).as_deref(), Some("a_.._cours.docx"));
        assert_eq!(o.path_of("../x"), None);
    }

    /// O9, O20 : `originaux/` créé en 0700 ; une racine en lien symbolique est refusée, rien n'est écrit dans sa cible.
    #[cfg(unix)]
    #[test]
    fn originals_root_is_private() {
        use std::os::unix::fs::PermissionsExt;
        let d = dir("prive");
        let o = Originals::new(d.join("originaux"));
        o.write("cours.docx", b"PK\x03\x04").expect("écrit");
        assert_eq!(fs::metadata(d.join("originaux")).unwrap().permissions().mode() & 0o777, 0o700);
        let real = d.join("vrai");
        fs::create_dir(&real).unwrap();
        std::os::unix::fs::symlink(&real, d.join("lien")).unwrap();
        assert!(matches!(
            Originals::new(d.join("lien")).write("cours.docx", b"PK\x03\x04"),
            Err(ConvertError::Io(_))
        ));
        assert_eq!(fs::read_dir(&real).unwrap().count(), 0);
    }

    /// O21, Review Focus 5 : un changement est dit après deux relevés égaux, une seule fois ; un second
    /// enregistrement est dit à nouveau ; un enregistrement par fichier temporaire puis renommage est vu.
    #[test]
    fn changed_reports_each_stable_save_once() {
        let d = dir("releve");
        let o = Originals::new(d.join("originaux"));
        let (id, path) = o.write("cours.docx", b"PK\x03\x04v1").expect("écrit");
        assert!(o.changed().is_empty());
        fs::write(&path, b"PK\x03\x04version 2").unwrap();
        assert!(o.changed().is_empty(), "premier relevé du changement : peut-être en cours d'écriture");
        assert_eq!(o.changed(), vec![(id.clone(), path.clone())]);
        assert!(o.changed().is_empty(), "déjà dit");
        let tmp = path.with_file_name("~cours.tmp");
        fs::write(&tmp, b"PK\x03\x04troisieme version").unwrap();
        fs::rename(&tmp, &path).unwrap();
        assert!(o.changed().is_empty());
        assert_eq!(o.changed(), vec![(id, path)]);
    }

    /// O21 : un fichier absent pendant un renommage n'est pas un changement ; un id inconnu n'a ni chemin ni nom.
    #[test]
    fn changed_ignores_unknown_and_missing_files() {
        let d = dir("absent");
        let o = Originals::new(d.join("originaux"));
        let (id, path) = o.write("notes.xlsx", b"PK\x03\x04").expect("écrit");
        fs::remove_file(&path).unwrap();
        assert!(o.changed().is_empty());
        assert!(o.changed().is_empty());
        fs::write(&path, b"PK\x03\x04").unwrap();
        assert!(o.changed().is_empty());
        assert_eq!(o.name_of("9-9"), None);
        assert!(o.path_of(&id).is_some());
    }

    /// O23 : copies purgées au lancement au-delà de 7 jours ; les récentes restent.
    #[cfg(unix)]
    #[test]
    fn purge_removes_old_copies_only() {
        let d = dir("purge");
        let root = d.join("originaux");
        let (old, recent) = (root.join("1-0"), root.join("1-1"));
        for p in [&old, &recent] {
            fs::create_dir_all(p).unwrap();
        }
        let week = Duration::from_secs(7 * 24 * 3600);
        fs::File::open(&old)
            .unwrap()
            .set_modified(SystemTime::now() - week - Duration::from_secs(3600))
            .unwrap();
        purge(&root, week);
        assert!(!old.exists());
        assert!(recent.exists());
    }
}
```

  Note du test `changed_ignores_unknown_and_missing_files` : après suppression puis réécriture du même contenu, la date
  change ; le troisième relevé voit un changement pour la première fois (pas encore dit), d'où `is_empty()`.

- [ ] **Étape 2 : les voir rouges.** `nice -n 10 cargo test -p roomboard-shell originals:: 2>&1 | grep -E "error\[" | head -3`
  → `error[E0425]: cannot find function safe_name`.

- [ ] **Étape 3 : le module.** Au-dessus des tests :

```rust
//! Copies des originaux ouverts par « Modifier dans l'application d'origine » (C16, O20, O21, O23, DA-O3, DA-O4) :
//! nom par liste blanche, extension et en-tête Office exigés, dossier privé, marque Internet sous Windows ; relevé de la
//! taille et de la date des seules copies écrites ici (aucun `watch`, aucune permission pour la page).
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, SystemTime};

use crate::office::{ensure_private_dir, has_office_magic, io, office_extension, ConvertError, OFFICE_MAX_BYTES};

/// Longueur maximale d'un nom de copie, en caractères (O20).
pub const NAME_MAX_CHARS: usize = 120;
/// Noms réservés de Windows (sans tenir compte de la casse ni de l'extension).
const RESERVED: &[&str] = &[
    "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2",
    "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

/// Nom de copie sûr (O20) ; `None` s'il est vide ou réservé.
pub fn safe_name(name: &str) -> Option<String> {
    let mapped: String = name
        .chars()
        .map(|c| if c.is_alphanumeric() || matches!(c, '-' | '_' | '.' | ' ') { c } else { '_' })
        .collect();
    let mut s = mapped
        .trim_start_matches(['-', '.', ' '])
        .trim_end_matches(['.', ' '])
        .to_string();
    if s.chars().count() > NAME_MAX_CHARS {
        let (stem, ext) = match s.rfind('.') {
            Some(i) => (&s[..i], &s[i..]),
            None => (s.as_str(), ""),
        };
        let keep = NAME_MAX_CHARS.saturating_sub(ext.chars().count());
        let cut: String = stem.chars().take(keep).collect();
        s = format!("{}{ext}", cut.trim_end_matches(['.', ' ']));
    }
    if s.is_empty() {
        return None;
    }
    let stem = s.split('.').next().unwrap_or("").trim_end().to_ascii_uppercase();
    if RESERVED.contains(&stem.as_str()) {
        return None;
    }
    Some(s)
}

/// Nom reçu dans l'en-tête `x-roomboard-name`, encodé en pourcentage ; `None` si l'encodage ou l'UTF-8 est faux.
pub fn decode_name(header: &str) -> Option<String> {
    let b = header.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' {
            let hex = header.get(i + 1..i + 3)?;
            out.push(u8::from_str_radix(hex, 16).ok()?);
            i += 3;
        } else {
            out.push(b[i]);
            i += 1;
        }
    }
    String::from_utf8(out).ok()
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Stamp {
    len: u64,
    modified: Option<SystemTime>,
}

fn stamp_of(p: &Path) -> Option<Stamp> {
    let m = fs::metadata(p).ok()?;
    Some(Stamp {
        len: m.len(),
        modified: m.modified().ok(),
    })
}

struct Watched {
    name: String,
    path: PathBuf,
    /// Dernier état dit (ou celui de l'écriture).
    base: Option<Stamp>,
    /// État du relevé précédent.
    seen: Option<Stamp>,
}

/// Copies écrites par la coque et leur relevé (O20, O21).
pub struct Originals {
    root: PathBuf,
    next: AtomicU64,
    files: Mutex<HashMap<String, Watched>>,
}

impl Originals {
    pub fn new(root: PathBuf) -> Self {
        Originals {
            root,
            next: AtomicU64::new(0),
            files: Mutex::new(HashMap::new()),
        }
    }

    fn files(&self) -> std::sync::MutexGuard<'_, HashMap<String, Watched>> {
        self.files.lock().unwrap_or_else(|e| e.into_inner())
    }

    /// Écrit `<racine>/<id>/<nom assaini>` (O20) : nom sûr, extension Office, en-tête ZIP ou CFB, 100 Mio au plus ;
    /// racine privée ; marque Internet sous Windows (mode protégé d'Office, HO1-7). Rend l'id et le chemin.
    pub fn write(&self, name: &str, bytes: &[u8]) -> Result<(String, PathBuf), ConvertError> {
        let safe = safe_name(name).ok_or(ConvertError::NotOffice)?;
        let ext = office_extension(Path::new(&safe)).ok_or(ConvertError::NotOffice)?;
        if !has_office_magic(&ext, bytes) {
            return Err(ConvertError::NotOffice);
        }
        if bytes.len() as u64 > OFFICE_MAX_BYTES {
            return Err(ConvertError::TooLarge);
        }
        if let Some(parent) = self.root.parent() {
            fs::create_dir_all(parent).map_err(io)?;
        }
        ensure_private_dir(&self.root)?;
        let id = format!("{}-{}", std::process::id(), self.next.fetch_add(1, Ordering::Relaxed));
        let dir = self.root.join(&id);
        fs::create_dir(&dir).map_err(io)?;
        let path = dir.join(&safe);
        fs::write(&path, bytes).map_err(io)?;
        #[cfg(windows)]
        mark_internet(&path);
        let stamp = stamp_of(&path);
        self.files().insert(
            id.clone(),
            Watched {
                name: safe,
                path: path.clone(),
                base: stamp,
                seen: stamp,
            },
        );
        Ok((id, path))
    }

    pub fn path_of(&self, id: &str) -> Option<PathBuf> {
        self.files().get(id).map(|w| w.path.clone())
    }

    pub fn name_of(&self, id: &str) -> Option<String> {
        self.files().get(id).map(|w| w.name.clone())
    }

    /// Relevé (O21) : copies dont la taille ou la date a changé et n'a plus bougé depuis le relevé précédent ; chaque
    /// changement est dit une fois. Trié par id.
    pub fn changed(&self) -> Vec<(String, PathBuf)> {
        let mut out = Vec::new();
        for (id, w) in self.files().iter_mut() {
            let now = stamp_of(&w.path);
            if now.is_some() && now != w.base && now == w.seen {
                w.base = now;
                out.push((id.clone(), w.path.clone()));
            }
            w.seen = now;
        }
        out.sort();
        out
    }
}

/// Windows : flux `Zone.Identifier` (`ZoneId=3`, Internet) sur la copie.
#[cfg(windows)]
fn mark_internet(path: &Path) {
    let mut ads = path.as_os_str().to_owned();
    ads.push(":Zone.Identifier");
    let _ = fs::write(PathBuf::from(ads), "[ZoneTransfer]\r\nZoneId=3\r\n");
}

/// Au lancement (O23) : supprime les dossiers de copies plus vieux que `older_than` (date du dossier, mise à jour par
/// chaque enregistrement qui y crée ou renomme un fichier).
pub fn purge(root: &Path, older_than: Duration) {
    let Ok(rd) = fs::read_dir(root) else {
        return;
    };
    let now = SystemTime::now();
    for e in rd.flatten() {
        let Ok(m) = fs::symlink_metadata(e.path()) else {
            continue;
        };
        if !m.is_dir() {
            continue;
        }
        let old = m
            .modified()
            .ok()
            .and_then(|t| now.duration_since(t).ok())
            .is_some_and(|age| age > older_than);
        if old {
            let _ = fs::remove_dir_all(e.path());
        }
    }
}
```

- [ ] **Étape 4 : les voir verts.** Commandes de la section « Test » → vertes.

- [ ] **Étape 5 : commit.**

```bash
git add crates/roomboard-shell/src/originals.rs
git add crates/roomboard-shell/src/lib.rs
git commit -m "feat(shell): sanitized copies of Office originals with save polling

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t6"></a>
### Tâche T6 — Coque Tauri : commandes minces, état Office, relevé, purge au lancement ; preuve par lecture ; contrôle hors ligne ; avis de tiers ; fiches de plateforme

**Objectif.** `main.rs` gagne cinq commandes minces qui n'appellent que `roomboard_shell` : `office_converter`,
`convert_office(path)` (en `spawn_blocking`), `release_conversion(id)`, `open_original` (corps brut, nom en en-tête),
`reimport_original(id)` (par `grant_and_emit`) ; un état `Office` (racine `app_cache_dir`, convertisseur trouvé au
lancement, copies surveillées) ; un fil de relevé lancé au premier « Modifier » ; la purge au lancement (O9, O20 à O24,
O29, O35, O36). Aucun plugin, aucune permission neuve : prouvé par lecture (tests `include_str!`) et par
`controle-hors-ligne.mjs`. Avis de tiers et fiches de plateforme (R2, R3). Scénario : S5.

**Fichiers.**
- Créer : `crates/roomboard-shell/tests/coque_c16.rs`
- Modifier : `apps/desktop/src-tauri/src/main.rs` (imports `:3-12`, constantes `:14-16`, types et commandes après
  `quit_app` `:107-110`, `main()` `:161-193`) ; `apps/desktop/src-tauri/Cargo.lock` (par `cargo metadata`, sans build) ;
  `apps/desktop/src-tauri/capabilities/default.json` (une phrase à la fin de `description`) ;
  `scripts/controle-hors-ligne.mjs` (fonction `checkOpener` après `checkAssetProtocol`, appel dans `main`) ;
  `scripts/tests/controle-hors-ligne.test.sh` (cas 27 à 30 avant le cas 23) ; `THIRD_PARTY_NOTICES.md` (section ajoutée
  à la fin) ; `docs/essais/coque-windows.md`, `docs/essais/coque-macos.md` (section 8 ajoutée à la fin).

**Interfaces.**
- Consomme : T3 — `roomboard_shell::office::{convert_granted, release_conversion, purge_conversions, find_converter, Search, Converter, Converted, CONVERT_TIMEOUT}`
  (`convert_granted(g, path, c: Option<&Converter>, work_root, timeout) -> Result<Converted, ConvertError>`,
  `ConvertError::code() -> &'static str`) ; T5 — `roomboard_shell::originals::{Originals, decode_name, purge}`
  (`Originals::new(root)`, `write(name, bytes) -> Result<(String, PathBuf), ConvertError>`, `path_of(id)`, `name_of(id)`,
  `changed() -> Vec<(String, PathBuf)>`) ; crate `open` (dépendance de `roomboard-shell`, T2).
- Produit (T10 s'en sert ; noms exacts côté page) :
  - commandes : `office_converter() -> bool` ; `convert_office({ path }) -> { id: string, pdf: string, size: number }`,
    rejet = code (`no-program`, `timeout`, `failed`, `no-output`, `not-granted`, `not-office`, `too-large`, `io`) ;
    `release_conversion({ id })` ; `open_original(<octets bruts>, en-tête x-roomboard-name) -> string` (id de la copie) ;
    `reimport_original({ id })` ;
  - événement `roomboard://original-changed` de charge `{ id: string, path: string, name: string }` ;
  - le réimport émet `roomboard://dropped` (`{ paths, position: null }`) comme un dépôt.
- Réutilise : `apps/desktop/src-tauri/src/main.rs:113` — `grant_and_emit(app, &[copie], None)` pour le réimport (la page ne nomme jamais un chemin).
- Réutilise : `apps/desktop/src-tauri/src/main.rs:40-56` — patron des commandes minces (`read_granted_file` : `async`, `State`, erreur en `String`) pour les cinq commandes.
- Réutilise : crate `open` 5.4.5 (`src/lib.rs:388`, feature `shellexecute-on-windows`) — `open::that_detached(path)` appelé depuis Rust.
- Réutilise : `scripts/controle-hors-ligne.mjs:131` — patron `checkAssetProtocol(conf, cargoToml)` pour `checkOpener(cargoToml, capabilities)`.
- Le rapport porte, pour chaque ligne ci-dessus, `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
- `nice -n 10 cargo test -p roomboard-shell --test coque_c16 2>&1 | tail -8` → « test result: ok. 4 passed » :
  `office_commands_are_registered_and_thin`, `no_opener_plugin_nor_watch_permission`,
  `open_original_takes_a_raw_body_and_opens_from_rust`, `open_crate_uses_shellexecute_on_windows`.
- `nice -n 10 cargo test -p roomboard-shell 2>&1 | grep -E "test result|FAILED" | tail -6` → 0 `FAILED` (dont
  `capabilities_grant_library_folder_only`, `tauri_conf_associations_match_associated_extensions` verts).
- `bash scripts/tests/controle-hors-ligne.test.sh 2>&1 | tail -2` → « controle-hors-ligne.test.sh : N+4 cas OK » (N lu
  avant la modification).
- `rustfmt --edition 2021 --check apps/desktop/src-tauri/src/main.rs; echo "code $?"` → `code 0`.
- `grep -c '^name = "open"' apps/desktop/src-tauri/Cargo.lock` → `1` ; `node scripts/controle-licences.mjs; echo "code $?"` → `code 0`.

**Contraintes (recopiées de Global Constraints).**
- GC1 TDD : chaque test est écrit et vu rouge avant le code qui le fait passer.
- GC2 Preuves bornées qui montrent qu'un test a tourné (`nice -n 10 cargo test -p roomboard-shell … 2>&1 | tail -20`).
- GC5 Aucun build Tauri (ni `cargo build`, ni `cargo check` dans `src-tauri`), aucune installation de paquet système,
  aucune dépendance GPL, LGPL ou AGPL liée.
- GC7 Sécurité : aucun shell, arguments en liste, chemins contrôlés dans le dossier de travail ; un test par cas.
- GC8 Commandes Tauri minces dans `main.rs`, prouvées par lecture (src-tauri hors du workspace).
- GC12 Coexistence avec C13 : `THIRD_PARTY_NOTICES.md` : section ajoutée à la fin, rien d'existant réécrit ni déplacé.
- GC13 Git : fichiers ajoutés un par un, pas de `commit -a`, aucun push forcé, aucun tag ; message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC14 Commentaires en français, identifiants en anglais.

**Interdits.** Aucun `tauri-plugin-opener`, aucune feature `watch` de `tauri-plugin-fs`, aucune permission `opener:*` ni
`fs:allow-watch` ; aucune logique dans `main.rs` au-delà de l'appel (pas de contrôle de nom, d'extension, de chemin) ;
`tauri.conf.json` et `src-tauri/Cargo.toml` inchangés ; aucun build de `src-tauri` (`cargo metadata` seulement).

**Terminé quand.** Preuves vertes ; `Cargo.lock` de `src-tauri` porte `open`, `is-wsl`, `is-docker` ; fiches § 8 écrites.

**Étapes.**

- [ ] **Étape 1 : test rouge de lecture.** Créer `crates/roomboard-shell/tests/coque_c16.rs` :

```rust
//! Coque C16 (O29) : src-tauri est hors du workspace et n'est pas construit sur la VM ; sa configuration est prouvée
//! par lecture : commandes Office enregistrées et minces, aucun plugin opener, aucune permission opener ni fs:*watch,
//! corps brut pour l'original, `open` en Rust avec ShellExecuteW sous Windows.
const MAIN_RS: &str = include_str!("../../../apps/desktop/src-tauri/src/main.rs");
const DESKTOP_TOML: &str = include_str!("../../../apps/desktop/src-tauri/Cargo.toml");
const CAPABILITIES: &str = include_str!("../../../apps/desktop/src-tauri/capabilities/default.json");
const SHELL_TOML: &str = include_str!("../Cargo.toml");
const COMMANDS: [&str; 5] = ["office_converter", "convert_office", "release_conversion", "open_original", "reimport_original"];

#[test]
fn office_commands_are_registered_and_thin() {
    let handler = MAIN_RS
        .split("generate_handler![")
        .nth(1)
        .and_then(|s| s.split(']').next())
        .expect("generate_handler!");
    for c in COMMANDS {
        assert!(handler.split(',').any(|x| x.trim() == c), "{c} absente de generate_handler!");
        assert!(MAIN_RS.contains(&format!("fn {c}(")), "fonction {c} absente");
    }
    for needle in ["office::convert_granted(", "office::release_conversion(", "office::purge_conversions(", "originals::purge(", "spawn_blocking", "app_cache_dir"] {
        assert!(MAIN_RS.contains(needle), "{needle} absent de main.rs");
    }
    for forbidden in ["Command::new", "safe_name", "\"sh\"", "powershell"] {
        assert!(!MAIN_RS.contains(forbidden), "{forbidden} dans main.rs (la logique vit dans roomboard-shell)");
    }
}

#[test]
fn no_opener_plugin_nor_watch_permission() {
    assert!(!DESKTOP_TOML.contains("tauri-plugin-opener"));
    assert!(!DESKTOP_TOML.contains("\"watch\""));
    let caps: serde_json::Value = serde_json::from_str(CAPABILITIES).expect("default.json lisible");
    for p in caps["permissions"].as_array().expect("permissions") {
        let id = p.as_str().or_else(|| p["identifier"].as_str()).unwrap_or("");
        assert!(!id.starts_with("opener:"), "{id}");
        assert!(!id.ends_with("watch"), "{id}");
    }
}

#[test]
fn open_original_takes_a_raw_body_and_opens_from_rust() {
    for needle in ["InvokeBody::Raw", "x-roomboard-name", "originals::decode_name", "open::that_detached", "grant_and_emit(&app, &[path], None)", "roomboard://original-changed"] {
        assert!(MAIN_RS.contains(needle), "{needle} absent de main.rs");
    }
}

#[test]
fn open_crate_uses_shellexecute_on_windows() {
    let line = SHELL_TOML
        .lines()
        .find(|l| l.trim_start().starts_with("open "))
        .expect("dépendance open");
    assert!(line.contains("default-features = false"), "{line}");
    assert!(line.contains("shellexecute-on-windows"), "{line}");
}
```

  `nice -n 10 cargo test -p roomboard-shell --test coque_c16 2>&1 | tail -8` → 3 échecs (`…absente de generate_handler!`,
  `InvokeBody::Raw absent`) ; `open_crate_uses_shellexecute_on_windows` déjà vert (T2).

- [ ] **Étape 2 : `main.rs`, imports et constantes.** Remplacer les lignes `:3-12` par :

```rust
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use roomboard_shell::office::{self, Converter, Search, CONVERT_TIMEOUT};
use roomboard_shell::originals::{self, Originals};
use roomboard_shell::{
    check_linked_media, launch_paths, read_granted, sha256_granted, size_granted, GrantedPaths,
    ReadError, ASSOCIATED_EXTENSIONS,
};
use serde::Serialize;
use tauri::{AppHandle, DragDropEvent, Emitter, Manager, RunEvent, Runtime, State, WindowEvent};
use tauri_plugin_fs::FsExt;
```

  et après `const DROPPED_EVENT: &str = "roomboard://dropped";` :

```rust
/// C16 (O21) : une copie d'original a été enregistrée dans l'application d'origine.
const ORIGINAL_CHANGED_EVENT: &str = "roomboard://original-changed";
/// C16 (O20) : nom de l'original, encodé en pourcentage par la page.
const NAME_HEADER: &str = "x-roomboard-name";
/// C16 (O23) : copies d'originaux gardées 7 jours.
const ORIGINALS_KEEP: Duration = Duration::from_secs(7 * 24 * 3600);
```

- [ ] **Étape 3 : `main.rs`, état et commandes.** Après `quit_app` :

```rust
/// État Office de la coque (C16) : racine de travail privée (cache de l'application, jamais `/tmp` partagé, O9),
/// convertisseur trouvé au lancement (O24), copies d'originaux surveillées (O21).
struct Office {
    root: PathBuf,
    converter: Option<Converter>,
    originals: Originals,
    watching: AtomicBool,
}

#[derive(Serialize)]
struct ConvertedPayload {
    id: String,
    pdf: String,
    size: u64,
}

#[derive(Clone, Serialize)]
struct OriginalChanged {
    id: String,
    path: String,
    name: String,
}

/// O24 : vrai si LibreOffice ou Microsoft Office a été trouvé au lancement.
#[tauri::command]
fn office_converter(office: State<'_, Office>) -> bool {
    office.converter.is_some()
}

/// O8 à O12, O35 : conversion hors du fil principal (jusqu'à 120 s, une à la fois) ; le PDF accordé est lu ensuite par
/// `read_granted_file`, puis libéré par `release_conversion`. Rejet : code stable (`no-program`, `timeout`, …).
#[tauri::command]
async fn convert_office(app: AppHandle, path: String) -> Result<ConvertedPayload, String> {
    let handle = app.clone();
    let done = tauri::async_runtime::spawn_blocking(move || {
        let office = handle.state::<Office>();
        let granted = handle.state::<GrantedPaths>();
        office::convert_granted(&granted, &PathBuf::from(path), office.converter.as_ref(), &office.root, CONVERT_TIMEOUT)
    })
    .await
    .map_err(|e| e.to_string())?;
    done.map(|c| ConvertedPayload {
        id: c.id,
        pdf: c.pdf.to_string_lossy().into_owned(),
        size: c.size,
    })
    .map_err(|e| e.code().to_string())
}

/// O35 : retire l'accord du PDF converti et supprime son dossier.
#[tauri::command]
fn release_conversion(office: State<'_, Office>, granted: State<'_, GrantedPaths>, id: String) {
    office::release_conversion(&granted, &office.root, &id);
}

/// O20 : octets de l'original en corps brut, nom dans l'en-tête `x-roomboard-name` ; copie contrôlée par
/// `roomboard_shell::originals`, ouverte depuis Rust (`open`, ShellExecuteW sous Windows) ; aucune permission pour la
/// page. Le fil de relevé part au premier appel. Rend l'id de la copie.
#[tauri::command]
async fn open_original(
    app: AppHandle,
    office: State<'_, Office>,
    request: tauri::ipc::Request<'_>,
) -> Result<String, String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err("corps brut attendu".into());
    };
    let name = request
        .headers()
        .get(NAME_HEADER)
        .and_then(|v| v.to_str().ok())
        .and_then(originals::decode_name)
        .ok_or_else(|| "nom absent".to_string())?;
    let (id, path) = office.originals.write(&name, bytes).map_err(|e| e.code().to_string())?;
    open::that_detached(&path).map_err(|e| e.to_string())?;
    if !office.watching.swap(true, Ordering::SeqCst) {
        spawn_watch(app.clone());
    }
    Ok(id)
}

/// O21 : relevé chaque seconde des seules copies écrites par `open_original` ; un changement stable est émis.
fn spawn_watch(app: AppHandle) {
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_secs(1));
        let office = app.state::<Office>();
        for (id, path) in office.originals.changed() {
            let name = office.originals.name_of(&id).unwrap_or_default();
            let payload = OriginalChanged {
                id,
                path: path.to_string_lossy().into_owned(),
                name,
            };
            if let Err(e) = app.emit(ORIGINAL_CHANGED_EVENT, payload) {
                eprintln!("RoomBoard : modification de l'original non transmise ({e})");
            }
        }
    });
}

/// O22 : la coque accorde la copie et émet un dépôt (patron `grant_and_emit`) : nouvel onglet par `importFiles` ; la
/// page ne nomme jamais un chemin.
#[tauri::command]
fn reimport_original(app: AppHandle, office: State<'_, Office>, id: String) -> Result<(), String> {
    let path = office.originals.path_of(&id).ok_or_else(|| "original inconnu".to_string())?;
    grant_and_emit(&app, &[path], None);
    Ok(())
}
```

- [ ] **Étape 4 : `main.rs`, `main()`.** Entre `.manage(Launch(…))` et `.invoke_handler(…)`, ajouter :

```rust
        // C16 (O9, O23, O24) : racine privée dans le cache de l'application ; restes purgés ; convertisseur cherché une fois.
        .setup(|app| {
            let root = app.path().app_cache_dir()?;
            std::fs::create_dir_all(&root)?;
            office::purge_conversions(&root);
            originals::purge(&root.join("originaux"), ORIGINALS_KEEP);
            app.manage(Office {
                converter: office::find_converter(&Search::from_env()),
                originals: Originals::new(root.join("originaux")),
                root,
                watching: AtomicBool::new(false),
            });
            Ok(())
        })
```

  et compléter la liste :

```rust
        .invoke_handler(tauri::generate_handler![
            read_granted_file,
            granted_file_size,
            link_media,
            relink_media,
            launch_files,
            quit_app,
            office_converter,
            convert_office,
            release_conversion,
            open_original,
            reimport_original
        ])
```

  `rustfmt --edition 2021 apps/desktop/src-tauri/src/main.rs` puis la commande de l'étape 1 → 4 passed.

- [ ] **Étape 5 : capacités (description seule).** Dans `apps/desktop/src-tauri/capabilities/default.json`, ajouter à
  la fin de `description`, avant le guillemet fermant : ` Office (C16) : conversion, ouverture de l'original et réimport
  par les commandes de la coque (office_converter, convert_office, release_conversion, open_original, reimport_original),
  appelées depuis Rust, sans permission pour la page.` La liste `permissions` ne change pas.

- [ ] **Étape 6 : verrou de `src-tauri`, sans build.**
  `nice -n 10 cargo metadata --manifest-path apps/desktop/src-tauri/Cargo.toml --format-version 1 >/dev/null && grep -c '^name = "open"' apps/desktop/src-tauri/Cargo.lock`
  → `1` ; `git diff --stat apps/desktop/src-tauri/Cargo.lock` → seulement des ajouts (`open`, `is-wsl`, `is-docker`).

- [ ] **Étape 7 : contrôle hors ligne, cas rouges.** Lire `N` : `bash scripts/tests/controle-hors-ligne.test.sh 2>&1 | tail -1`.
  Dans `scripts/tests/controle-hors-ligne.test.sh`, juste avant la ligne `node "$script" "$tmp/propre" "$racine/apps/desktop/src-tauri/tauri.conf.json" …`
  (cas 23), insérer :

```bash
# 27-30. Office (C16, O29, O36) : l'original s'ouvre depuis Rust (crate open) et le relevé se fait en Rust :
# ni tauri-plugin-opener, ni feature watch de tauri-plugin-fs, ni permission opener: ou fs:allow-watch.
for d in opener watch perm-opener perm-watch; do
  mkdir -p "$tmp/c16-$d/capabilities"
  cp "$tmp/coque/tauri.conf.json" "$tmp/coque/Cargo.toml" "$tmp/c16-$d/"
  echo '{ "permissions": ["core:default"] }' > "$tmp/c16-$d/capabilities/default.json"
done
printf 'tauri-plugin-opener = "2"\n' >> "$tmp/c16-opener/Cargo.toml"
printf 'tauri-plugin-fs = { version = "2", features = ["watch"] }\n' >> "$tmp/c16-watch/Cargo.toml"
echo '{ "permissions": ["core:default", "opener:default"] }' > "$tmp/c16-perm-opener/capabilities/default.json"
echo '{ "permissions": ["core:default", { "identifier": "fs:allow-watch" }] }' > "$tmp/c16-perm-watch/capabilities/default.json"
refuse 27 "$tmp/propre" "$tmp/c16-opener/tauri.conf.json" "tauri-plugin-opener"
refuse 28 "$tmp/propre" "$tmp/c16-watch/tauri.conf.json" "feature watch"
refuse 29 "$tmp/propre" "$tmp/c16-perm-opener/tauri.conf.json" "opener:default"
refuse 30 "$tmp/propre" "$tmp/c16-perm-watch/tauri.conf.json" "fs:allow-watch"
```

  `bash scripts/tests/controle-hors-ligne.test.sh 2>&1 | tail -2` → `ÉCHEC : cas 27 : accepté`.

- [ ] **Étape 8 : `checkOpener`.** Dans `scripts/controle-hors-ligne.mjs`, après `checkAssetProtocol` :

```js
/**
 * Office (C16, O29, O36) : l'original s'ouvre depuis Rust (crate `open`) et le relevé des enregistrements se fait en
 * Rust : ni `tauri-plugin-opener`, ni feature `watch` de `tauri-plugin-fs`, ni permission `opener:*` ou `fs:*watch`.
 */
export function checkOpener(cargoToml, capabilities) {
  const toml = cargoToml ?? "";
  const errors = [];
  if (/tauri-plugin-opener/.test(toml)) errors.push("tauri-plugin-opener dans src-tauri/Cargo.toml (l'original s'ouvre depuis Rust, crate open)");
  if (/^\s*tauri-plugin-fs\s*=\s*\{[^}]*["']watch["']/m.test(toml)) errors.push("feature watch de tauri-plugin-fs (le relevé des originaux se fait en Rust)");
  const perms = Array.isArray(capabilities?.permissions) ? capabilities.permissions : [];
  for (const p of perms) {
    const id = typeof p === "string" ? p : typeof p?.identifier === "string" ? p.identifier : "";
    if (id.startsWith("opener:") || /^fs:(allow|deny)-(un)?watch$/.test(id)) errors.push(`permission ${id} interdite (C16 : aucune permission pour la page)`);
  }
  return errors;
}
```

  et dans `main`, après la lecture de `cargoToml` :

```js
  let capabilities = null;
  try {
    capabilities = JSON.parse(readFileSync(join(dirname(confPath), "capabilities", "default.json"), "utf8"));
  } catch {
    capabilities = null;
  }
```

  puis compléter `errors.push(...checkCsp(conf), …, ...checkAssetProtocol(conf, cargoToml))` par `, ...checkOpener(cargoToml, capabilities)`.
  `bash scripts/tests/controle-hors-ligne.test.sh 2>&1 | tail -2` → « N+4 cas OK ».

- [ ] **Étape 9 : avis de tiers.** À la fin de `THIRD_PARTY_NOTICES.md`, ajouter (versions relevées par
  `cargo tree -p roomboard-shell --target all -e normal --prefix none | sort -u`, licences lues dans
  `~/.cargo/registry/src/*/<crate>/Cargo.toml`) :

```markdown
## Coque (C16, conversion Office)

Crates ajoutées à `roomboard-shell` (et donc à `apps/desktop/src-tauri`). LibreOffice et Microsoft Office sont des
programmes externes, lancés comme processus (LibreOffice) ou appelés par COM (Office) ; ils ne sont ni liés ni
distribués.

| crate | version | licence | dépôt | cible |
|---|---|---|---|---|
| open | 5.4.5 | MIT | https://github.com/Byron/open-rs | toutes |
| is-wsl | 0.4.0 | MIT | https://github.com/TheLarkInn/is-wsl | Linux |
| is-docker | 0.2.0 | MIT | https://github.com/TheLarkInn/is-docker | Linux |
| dunce | 1.0.5 | CC0-1.0 OR MIT-0 OR Apache-2.0 | https://gitlab.com/kornelski/dunce | Windows |
| windows (et `windows-*` tirées) | 0.62.2 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs | Windows |
| libc | 0.2.191 | MIT OR Apache-2.0 | https://github.com/rust-lang/libc | Unix |
```

  Corriger le dépôt et la licence de chaque ligne d'après le `Cargo.toml` lu (champ `repository`, `license`). Puis une
  section `## Texte de licence : open 5.4.5, is-wsl 0.4.0, is-docker 0.2.0 (MIT)` par texte distinct, recopié
  verbatim de `~/.cargo/registry/src/*/open-5.4.5/LICENSE.md`, `…/is-wsl-0.4.0/LICENSE`, `…/is-docker-0.2.0/LICENSE`
  (même forme que `## Texte de licence : generic-array 0.14.7 (MIT)`).

- [ ] **Étape 10 : fiches de plateforme.** À la fin de `docs/essais/coque-windows.md` :

```markdown
## 8. Office (C16) — conversion, « Modifier dans l'application d'origine », réimport (R2, file d'attente du PC)

Coque construite comme au § 2. Fichiers d'essai : `crates/roomboard-shell/tests/fixtures/cours.docx`, `notes.xlsx`,
`diapos.pptx` (2 diapositives). Premier essai de compilation de `main.rs` et `office/com.rs` (HO2-11).

| geste | action | attendu |
|---|---|---|
| C16-1 | LibreOffice installé : déposer `cours.docx`, `notes.xlsx`, `diapos.pptx` | trois onglets `cours.roomboard`, `notes.roomboard`, `diapos.roomboard` (2 pages) ; curseur d'attente pendant chaque conversion |
| C16-2 | page 1 de `diapos.roomboard` → « Modifier dans l'application d'origine » | Impress ouvre la copie ; avec Office : PowerPoint en mode protégé (« Activer la modification », HO1-7) |
| C16-3 | modifier, enregistrer, revenir à RoomBoard | « diapos.pptx a été modifié. Le réimporter dans un nouvel onglet ? » ; Oui : un onglet de plus, l'ancien intact ; second enregistrement : la question revient |
| C16-4 | désinstaller LibreOffice (ou le retirer du PATH et de `%ProgramFiles%`), Office seul, relancer | mêmes conversions par Word, Excel, PowerPoint (COM), aucune fenêtre Office visible ; une instance de PowerPoint ouverte avant reste ouverte |
| C16-5 | délai : `.pptx` protégé par mot de passe | après 120 s : « <nom> : conversion trop longue (plus de 120 s) » ; Gestionnaire des tâches : aucun `soffice.bin` ni `POWERPNT.EXE` lancé par RoomBoard restant |
| C16-6 | ni LibreOffice ni Office, relancer | `cours.docx` : « cours.docx : installez LibreOffice ou Microsoft Office » ; `notes.xlsx` : un tableau et « notes.xlsx : importé en valeurs ; installez LibreOffice ou Microsoft Office pour ses pages » ; bouton « Modifier… » absent |

Rapporter chaque geste : conforme / écart (une ligne). Capture : `coque-windows-c16-modifier.png` (geste C16-2).
```

  À la fin de `docs/essais/coque-macos.md` :

```markdown
## 8. Office (C16) — LibreOffice.app (R3)

| geste | action | attendu |
|---|---|---|
| C16-1 | `LibreOffice.app` dans `/Applications`, RoomBoard lancé du Finder (PATH minimal) ; déposer `diapos.pptx` | onglet `diapos.roomboard` de 2 pages (chemin connu `/Applications/LibreOffice.app/Contents/MacOS/soffice`) |
| C16-2 | « Modifier dans l'application d'origine », enregistrer dans Impress | la question de réimport arrive ; Oui : nouvel onglet |
| C16-3 | `LibreOffice.app` déplacé hors d'`/Applications` et de `~/Applications`, relancer | « <nom> : installez LibreOffice ou Microsoft Office » |

Rapporter chaque geste : conforme / écart (une ligne).
```

- [ ] **Étape 11 : preuves, puis commit.** Toutes les commandes de la section « Test » ; puis :

```bash
git add crates/roomboard-shell/tests/coque_c16.rs
git add apps/desktop/src-tauri/src/main.rs
git add apps/desktop/src-tauri/Cargo.lock
git add apps/desktop/src-tauri/capabilities/default.json
git add scripts/controle-hors-ligne.mjs
git add scripts/tests/controle-hors-ligne.test.sh
git add THIRD_PARTY_NOTICES.md
git add docs/essais/coque-windows.md
git add docs/essais/coque-macos.md
git commit -m "feat(desktop): thin Office commands (convert, release, open original, reimport), proved by reading

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t7"></a>
### Tâche T7 — Page : gestionnaires `office` et `office-web`, en-têtes ZIP/CFB, messages, marque de conversion ; registre

**Objectif.** Module neuf `platform/office-import.ts` : détection par extension ET en-tête (O1, O2), gestionnaire
`office` de la coque (conversion par `convert(path)`, ouverture par `open({ name, original, pdf })`, repli `.xlsx` sur
`sheet` sans convertisseur ou sans chemin, messages d'O14), gestionnaire `office-web` (« <nom> : exportez en PDF depuis
Office », `.xlsx`/`.xlsm` laissés à `sheet`, O3), libellés figés (HO1-6), `withConversionMark` (O25). Registre :
l'entrée Office avant `sheet` (O33), `ImportDeps.convertOffice?` et `openOffice?` en fin. Scénarios : S3, S5.

**Fichiers.**
- Créer : `apps/web/src/platform/office-import.ts`, `apps/web/src/platform/office-import.test.ts`
- Modifier : `apps/web/src/platform/import.ts` (`:118` `hasExtension` exporté ; une ligne d'import après `:24` ; deux
  champs à la fin d'`ImportDeps`, après `model3d` `:72` ; deux constantes et une entrée dans `createImporter` `:261-289`) ;
  `apps/web/src/platform/import.test.ts` (une ligne d'import, un bloc `describe` à la fin du fichier).

**Interfaces.**
- Consomme : rien d'une autre tâche ; `import.ts` : `ImportHandler`, `ImportContext`, `hasZipMagic`, `hasExtension`,
  `isSheetName`, `sheetHandler`, `SHEET_MAX_BYTES` ; `files.ts` : `DroppedFile`.
- Produit (T9, T10 s'en servent), dans `apps/web/src/platform/office-import.ts` :
  - `OFFICE_ZIP_EXTENSIONS`, `OFFICE_CFB_EXTENSIONS`, `OFFICE_EXTENSIONS: readonly string[]` (avec le point) ;
    `CFB_MAGIC: readonly number[]` ; `OFFICE_MAX_BYTES = 104857600` ;
  - libellés : `OFFICE_EXPORT_MESSAGE = "exportez en PDF depuis Office"`, `OFFICE_INSTALL_MESSAGE = "installez LibreOffice ou Microsoft Office"`,
    `OFFICE_TOO_BIG_MESSAGE = "fichier Office trop gros pour être converti"`, `OFFICE_TIMEOUT_MESSAGE = "conversion trop longue (plus de 120 s)"`,
    `OFFICE_FAILED_MESSAGE = "la conversion en PDF a échoué"`, `OFFICE_VALUES_MESSAGE = "importé en valeurs ; installez LibreOffice ou Microsoft Office pour ses pages"`,
    `NOT_OFFICE_PAGE_MESSAGE = "cette page ne vient pas d'un fichier Word, Excel ou PowerPoint"`,
    `originalChangedMessage(name: string): string` → `"<nom> a été modifié. Le réimporter dans un nouvel onglet ?"` ;
  - `class OfficeConvertError extends Error { readonly code: string }` ;
  - `hasCfbMagic(head: Uint8Array): boolean` ; `isOfficeName(name: string): boolean` ; `isOfficeFile(head: Uint8Array, name: string): boolean` ;
    `officeMimeOf(name: string): string` ; `officeStemOf(name: string): string` ; `convertFailureMessage(name: string, code: string): string` ;
  - `interface OfficeHandlerDeps { convert(path: string): Promise<Blob>; open(f: { readonly name: string; readonly original: Blob; readonly pdf: Blob }): Promise<boolean>; readonly sheet?: ImportHandler }` ;
    `officeHandler(deps: OfficeHandlerDeps): ImportHandler` (id `office`) ; `officeWebHandler(): ImportHandler` (id `office-web`) ;
  - `CONVERSION_ATTR = "data-conversion"` ; `withConversionMark(root: Pick<HTMLElement, "setAttribute" | "removeAttribute">): <T>(run: () => Promise<T>) => Promise<T>`.
  - Dans `import.ts` : `export function hasExtension(name: string, ext: string): boolean` ; `ImportDeps.convertOffice?(path: string): Promise<Blob>` ;
    `ImportDeps.openOffice?(file: { readonly name: string; readonly original: Blob; readonly pdf: Blob }): Promise<boolean>`.
- Réutilise : `apps/web/src/platform/import.ts:96-115` (`ImportHandler`) et `:261` (`createImporter`) — `{ id: "office", nature: "document", detect, run, limit }` et `{ id: "office-web", nature: "document", detect, run }`, entrée insérée avant `sheet`.
- Réutilise : `apps/web/src/platform/import.ts:146-148` — `hasZipMagic(head)`.
- Réutilise : `apps/web/src/platform/import.ts:118` — `hasExtension(name, ext)` (exporté) pour `isOfficeName` et `isOfficeFile` (en-tête CFB et extensions Office : nouveau module, liste du cadrage).
- Réutilise : `apps/web/src/platform/import.ts:208-228` — `sheetHandler({ readSheet })` passé à `officeHandler` comme `sheet`, appelé par `sheet.run(f, ctx)` (repli `.xlsx`).
- Le rapport porte, pour chaque ligne ci-dessus, `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
- Préparation (worktree neuf) : `pnpm install --frozen-lockfile` ; si `apps/web/src/wasm/roomboard_wasm.d.ts` ou
  `apps/web/src/wasm-formats` manque, construire les deux modules comme `scripts/verifier.sh:33-41` (sans le modifier).
- `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/office-import.test.ts src/platform/import.test.ts --reporter=verbose 2>&1 | grep -E "C16|Tests |Test Files|FAIL|×" | tail -30`
  → 0 `×` ; « office-import (C16) » 10 tests, « registre C16 » 4 tests ; les autres cas d'`import.test.ts` verts
  (« Tests  N passed »).
- `nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20` → vide.

**Contraintes (recopiées de Global Constraints).**
- GC1 TDD : chaque test est écrit et vu rouge avant le code qui le fait passer.
- GC2 Preuves bornées qui montrent qu'un test a tourné (`nice -n 10 pnpm --filter @roomboard/web … 2>&1 | tail -20`).
- GC5 Aucune dépendance npm neuve, aucune installation de paquet système.
- GC6 Module Wasm `formats` : rien n'y entre.
- GC12 Coexistence avec C13 : dans `import.ts`, ajouts aux endroits nommés (import en fin de liste, champs en fin
  d'`ImportDeps`, entrée juste avant `sheet`) ; aucune ligne existante réécrite ni déplacée, sauf le mot `export` devant
  `hasExtension`.
- GC13 Git : fichiers ajoutés un par un, pas de `commit -a`, aucun push forcé, aucun tag ; message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC14 Commentaires et messages en français, identifiants en anglais.

**Interdits.** Aucune constante de niveau module d'`office-import.ts` ne lit une valeur importée d'`import.ts` (cycle
d'import : `OFFICE_MAX_BYTES` est une valeur littérale, un test la compare à `SHEET_MAX_BYTES`) ; `office-web` ne
revendique jamais `.xlsx` ni `.xlsm` ; aucun appel à la coque dans ce module (les ports arrivent par `deps`).

**Terminé quand.** Preuves vertes ; `createImporter` sans `convertOffice` rend « exportez en PDF depuis Office » pour
les huit extensions non tableur, et un tableau pour `.xlsx`.

**Étapes.**

- [ ] **Étape 1 : tests rouges du module.** Créer `apps/web/src/platform/office-import.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import type { DroppedFile } from "./files";
import { SHEET_MAX_BYTES, type ImportContext, type ImportHandler, type ImportOutcome } from "./import";
import {
  CONVERSION_ATTR, convertFailureMessage, hasCfbMagic, isOfficeFile, isOfficeName, NOT_OFFICE_PAGE_MESSAGE, OFFICE_EXPORT_MESSAGE,
  OFFICE_EXTENSIONS, OFFICE_FAILED_MESSAGE, OFFICE_INSTALL_MESSAGE, OFFICE_MAX_BYTES, OFFICE_TIMEOUT_MESSAGE, OFFICE_TOO_BIG_MESSAGE,
  OFFICE_VALUES_MESSAGE, OfficeConvertError, officeHandler, officeMimeOf, officeStemOf, officeWebHandler, originalChangedMessage,
  withConversionMark,
} from "./office-import";

const PK = new Uint8Array([0x50, 0x4b, 3, 4, 7]);
const CFB = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const file = (name: string, path?: string, bytes: Uint8Array<ArrayBuffer> = PK): DroppedFile => ({
  name, size: bytes.byteLength, mime: "", ...(path === undefined ? {} : { path }), head: async (n: number) => bytes.slice(0, n), blob: async () => new Blob([bytes]),
});
function ctx() {
  const notify = vi.fn(async (_m: string) => undefined);
  const c: ImportContext = { blob: new Blob([PK]), head: PK, at: null, inserted: 0, target: null, notify, companions: [] };
  return { c, notify };
}
function sheetFake(out: ImportOutcome = "inserted") {
  const run = vi.fn(async (_f: DroppedFile, _c: ImportContext): Promise<ImportOutcome> => out);
  const h: ImportHandler = { id: "sheet", nature: "objet", detect: () => true, run };
  return { h, run };
}
const PDF = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])]);

describe("office-import (C16)", () => {
  it("libellés figés (HO1-6), plafond = celui du classeur, dix extensions (O1, O14)", () => {
    expect([OFFICE_EXPORT_MESSAGE, OFFICE_INSTALL_MESSAGE, OFFICE_TOO_BIG_MESSAGE, OFFICE_TIMEOUT_MESSAGE, OFFICE_FAILED_MESSAGE, OFFICE_VALUES_MESSAGE, NOT_OFFICE_PAGE_MESSAGE]).toEqual([
      "exportez en PDF depuis Office",
      "installez LibreOffice ou Microsoft Office",
      "fichier Office trop gros pour être converti",
      "conversion trop longue (plus de 120 s)",
      "la conversion en PDF a échoué",
      "importé en valeurs ; installez LibreOffice ou Microsoft Office pour ses pages",
      "cette page ne vient pas d'un fichier Word, Excel ou PowerPoint",
    ]);
    expect(originalChangedMessage("cours.docx")).toBe("cours.docx a été modifié. Le réimporter dans un nouvel onglet ?");
    expect(OFFICE_MAX_BYTES).toBe(SHEET_MAX_BYTES);
    expect([...OFFICE_EXTENSIONS].sort()).toEqual([".doc", ".docx", ".odp", ".ods", ".odt", ".ppt", ".pptx", ".xls", ".xlsm", ".xlsx"]);
  });

  it("isOfficeFile : extension ET en-tête, casse ignorée (O2, Review Focus 1)", () => {
    expect(isOfficeFile(PK, "COURS.DOCX")).toBe(true);
    expect(isOfficeFile(PK, "diapos.pptx")).toBe(true);
    expect(isOfficeFile(CFB, "vieux.DOC")).toBe(true);
    expect(isOfficeFile(CFB, "cours.docx")).toBe(false);
    expect(isOfficeFile(PK, "vieux.xls")).toBe(false);
    expect(isOfficeFile(PK, "notes.txt")).toBe(false);
    expect(isOfficeFile(PK, ".docx")).toBe(false);
    expect(hasCfbMagic(CFB.subarray(0, 7))).toBe(false);
    expect([isOfficeName("a.ODP"), isOfficeName("a.pdf")]).toEqual([true, false]);
  });

  it("officeMimeOf et officeStemOf (O16)", () => {
    expect(officeMimeOf("cours.DOCX")).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(officeMimeOf("diapos.pptx")).toBe("application/vnd.openxmlformats-officedocument.presentationml.presentation");
    expect(officeMimeOf("notes.xlsx")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(officeMimeOf("vieux.doc")).toBe("application/msword");
    expect(officeMimeOf("x.bin")).toBe("application/octet-stream");
    expect([officeStemOf("Cours 3.docx"), officeStemOf("notes.XLSM"), officeStemOf("sans extension")]).toEqual(["Cours 3", "notes", "sans extension"]);
  });

  it("office-web : message, « failed » ; .xlsx et .xlsm laissés au classeur (O3, S3)", async () => {
    const h = officeWebHandler();
    expect([h.id, h.nature]).toEqual(["office-web", "document"]);
    expect([h.detect(PK, "notes.xlsx"), h.detect(PK, "m.xlsm"), h.detect(CFB, "vieux.xls"), h.detect(PK, "cours.docx")]).toEqual([false, false, true, true]);
    const { c, notify } = ctx();
    expect(await h.run(file("cours.docx"), c)).toBe("failed");
    expect(notify.mock.calls).toEqual([[`cours.docx : ${OFFICE_EXPORT_MESSAGE}`]]);
  });

  it("office (coque) : convert(path), puis open({ name, original : octets déposés, pdf }) → opened ; plafond de 100 Mio (S5, O14)", async () => {
    const convert = vi.fn(async (_p: string) => PDF);
    const open = vi.fn(async (_f: { readonly name: string; readonly original: Blob; readonly pdf: Blob }) => true);
    const h = officeHandler({ convert, open });
    expect([h.id, h.nature, h.limit]).toEqual(["office", "document", { maxBytes: OFFICE_MAX_BYTES, message: OFFICE_TOO_BIG_MESSAGE }]);
    expect(h.detect(PK, "notes.xlsx")).toBe(true);
    const { c } = ctx();
    expect(await h.run(file("cours.docx", "/home/u/cours.docx"), c)).toBe("opened");
    expect(convert.mock.calls).toEqual([["/home/u/cours.docx"]]);
    const arg = open.mock.calls[0]![0];
    expect([arg.name, arg.pdf]).toEqual(["cours.docx", PDF]);
    expect(arg.original).toBe(c.blob);
  });

  it("office : codes de la coque → messages ; une erreur sans code → échec générique (O14, Review Focus 2)", async () => {
    for (const [code, want] of [
      ["no-program", `cours.docx : ${OFFICE_INSTALL_MESSAGE}`],
      ["timeout", `cours.docx : ${OFFICE_TIMEOUT_MESSAGE}`],
      ["failed", `Import impossible (cours.docx) : ${OFFICE_FAILED_MESSAGE}`],
      ["no-output", `Import impossible (cours.docx) : ${OFFICE_FAILED_MESSAGE}`],
      ["io", `Import impossible (cours.docx) : ${OFFICE_FAILED_MESSAGE}`],
    ] as const) {
      const open = vi.fn(async () => true);
      const h = officeHandler({ convert: async () => { throw new OfficeConvertError(code); }, open });
      const { c, notify } = ctx();
      expect(await h.run(file("cours.docx", "/x/cours.docx"), c), code).toBe("failed");
      expect(notify.mock.calls, code).toEqual([[want]]);
      expect(open).not.toHaveBeenCalled();
    }
    const h = officeHandler({ convert: async () => { throw new Error("réseau"); }, open: async () => true });
    const { c, notify } = ctx();
    await h.run(file("cours.docx", "/x/cours.docx"), c);
    expect(notify.mock.calls).toEqual([[`Import impossible (cours.docx) : ${OFFICE_FAILED_MESSAGE}`]]);
    expect(convertFailureMessage("a.pptx", "timeout")).toBe(`a.pptx : ${OFFICE_TIMEOUT_MESSAGE}`);
  });

  it("office : .xlsx sans convertisseur (no-program) → classeur puis l'avis « importé en valeurs… » ; classeur en échec : aucun avis de plus (O4)", async () => {
    const sheet = sheetFake();
    const h = officeHandler({ convert: async () => { throw new OfficeConvertError("no-program"); }, open: async () => true, sheet: sheet.h });
    const { c, notify } = ctx();
    expect(await h.run(file("notes.xlsx", "/x/notes.xlsx"), c)).toBe("inserted");
    expect(sheet.run).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls).toEqual([[`notes.xlsx : ${OFFICE_VALUES_MESSAGE}`]]);
    const failing = sheetFake("failed");
    const h2 = officeHandler({ convert: async () => { throw new OfficeConvertError("no-program"); }, open: async () => true, sheet: failing.h });
    const second = ctx();
    expect(await h2.run(file("notes.xlsx", "/x/notes.xlsx"), second.c)).toBe("failed");
    expect(second.notify).not.toHaveBeenCalled();
  });

  it("office : .docx sans convertisseur → « installez… », jamais le classeur (O14)", async () => {
    const sheet = sheetFake();
    const h = officeHandler({ convert: async () => { throw new OfficeConvertError("no-program"); }, open: async () => true, sheet: sheet.h });
    const { c, notify } = ctx();
    expect(await h.run(file("cours.docx", "/x/cours.docx"), c)).toBe("failed");
    expect(sheet.run).not.toHaveBeenCalled();
    expect(notify.mock.calls).toEqual([[`cours.docx : ${OFFICE_INSTALL_MESSAGE}`]]);
  });

  it("office : fichier sans chemin (collage) : .xlsx → classeur, .docx → « exportez en PDF depuis Office » ; convert jamais appelé (O14)", async () => {
    const convert = vi.fn(async () => PDF);
    const sheet = sheetFake();
    const h = officeHandler({ convert, open: async () => true, sheet: sheet.h });
    const a = ctx();
    expect(await h.run(file("notes.xlsx"), a.c)).toBe("inserted");
    const b = ctx();
    expect(await h.run(file("cours.docx"), b.c)).toBe("failed");
    expect(b.notify.mock.calls).toEqual([[`cours.docx : ${OFFICE_EXPORT_MESSAGE}`]]);
    expect(convert).not.toHaveBeenCalled();
  });

  it("withConversionMark : data-conversion posé pendant, retiré après succès comme après échec, imbrications comptées (O25)", async () => {
    const attrs = new Map<string, string>();
    const root = { setAttribute: (k: string, v: string) => void attrs.set(k, v), removeAttribute: (k: string) => void attrs.delete(k) };
    const mark = withConversionMark(root);
    let during: string | undefined;
    expect(await mark(async () => { during = attrs.get(CONVERSION_ATTR); return 7; })).toBe(7);
    expect([during, attrs.has(CONVERSION_ATTR)]).toEqual(["en-cours", false]);
    await expect(mark(async () => { throw new Error("x"); })).rejects.toThrow("x");
    expect(attrs.has(CONVERSION_ATTR)).toBe(false);
    let release!: () => void;
    const slow = mark(() => new Promise<void>((r) => { release = r; }));
    await mark(async () => undefined);
    expect(attrs.get(CONVERSION_ATTR)).toBe("en-cours");
    release();
    await slow;
    expect(attrs.has(CONVERSION_ATTR)).toBe(false);
  });
});
```

- [ ] **Étape 2 : les voir rouges.** `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/office-import.test.ts 2>&1 | tail -8`
  → `Failed to resolve import "./office-import"`.

- [ ] **Étape 3 : exporter `hasExtension`.** `import.ts:118` : `function hasExtension(` devient `export function hasExtension(`.

- [ ] **Étape 4 : le module.** Créer `apps/web/src/platform/office-import.ts` :

```ts
/**
 * Documents Office (C16, O1 à O4, O14, O25) : `office` (coque : conversion en PDF par LibreOffice ou Microsoft Office,
 * puis ouverture comme un PDF, l'original gardé) et `office-web` (web, iPad : « exportez en PDF depuis Office »). Reconnus
 * par l'extension ET l'en-tête : ZIP pour OOXML et ODF, CFB pour `.doc`, `.xls`, `.ppt` (U23). Placés avant `sheet` dans
 * le registre : sur le web, `.xlsx` et `.xlsm` restent au classeur (C10b) ; dans la coque, ils sont convertis, avec repli
 * sur le classeur sans convertisseur ou sans chemin.
 * Cycle d'import avec `import.ts` : aucune constante de ce module ne lit une valeur importée (fonctions seulement).
 */
import type { DroppedFile } from "./files";
import { hasExtension, hasZipMagic, isSheetName, type ImportHandler } from "./import";

export const OFFICE_ZIP_EXTENSIONS: readonly string[] = Object.freeze([".docx", ".odt", ".xlsx", ".xlsm", ".ods", ".pptx", ".odp"]);
export const OFFICE_CFB_EXTENSIONS: readonly string[] = Object.freeze([".doc", ".xls", ".ppt"]);
export const OFFICE_EXTENSIONS: readonly string[] = Object.freeze([...OFFICE_ZIP_EXTENSIONS, ...OFFICE_CFB_EXTENSIONS]);
/** En-tête d'un fichier composé (CFB) : `.doc`, `.xls`, `.ppt`. */
export const CFB_MAGIC: readonly number[] = Object.freeze([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
/** Plafond de tout fichier Office (O14) : 100 Mio, la valeur de `SHEET_MAX_BYTES` (littérale : cycle d'import). */
export const OFFICE_MAX_BYTES = 100 * 1024 * 1024;

export const OFFICE_EXPORT_MESSAGE = "exportez en PDF depuis Office";
export const OFFICE_INSTALL_MESSAGE = "installez LibreOffice ou Microsoft Office";
export const OFFICE_TOO_BIG_MESSAGE = "fichier Office trop gros pour être converti";
export const OFFICE_TIMEOUT_MESSAGE = "conversion trop longue (plus de 120 s)";
export const OFFICE_FAILED_MESSAGE = "la conversion en PDF a échoué";
export const OFFICE_VALUES_MESSAGE = "importé en valeurs ; installez LibreOffice ou Microsoft Office pour ses pages";
export const NOT_OFFICE_PAGE_MESSAGE = "cette page ne vient pas d'un fichier Word, Excel ou PowerPoint";
export const originalChangedMessage = (name: string): string => `${name} a été modifié. Le réimporter dans un nouvel onglet ?`;

/** Rejet de la coque : `code` = `ConvertError::code` (Rust) : `no-program`, `timeout`, `failed`, `no-output`, … */
export class OfficeConvertError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "OfficeConvertError";
  }
}

export const hasCfbMagic = (head: Uint8Array): boolean => head.length >= CFB_MAGIC.length && CFB_MAGIC.every((b, i) => head[i] === b);

const extensionOf = (name: string): string | undefined => OFFICE_EXTENSIONS.find((e) => hasExtension(name, e));

export const isOfficeName = (name: string): boolean => extensionOf(name) !== undefined;

/** O2 : extension Office ET en-tête attendu ; sinon le registre refuse comme avant (« prochaine version »). */
export function isOfficeFile(head: Uint8Array, name: string): boolean {
  if (OFFICE_ZIP_EXTENSIONS.some((e) => hasExtension(name, e))) return hasZipMagic(head);
  if (OFFICE_CFB_EXTENSIONS.some((e) => hasExtension(name, e))) return hasCfbMagic(head);
  return false;
}

const MIMES: Readonly<Record<string, string>> = Object.freeze({
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xlsm": "application/vnd.ms-excel.sheet.macroEnabled.12",
  ".xls": "application/vnd.ms-excel",
  ".ods": "application/vnd.oasis.opendocument.spreadsheet",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".ppt": "application/vnd.ms-powerpoint",
  ".odp": "application/vnd.oasis.opendocument.presentation",
});

/** Type MIME de l'original gardé (O16). */
export const officeMimeOf = (name: string): string => MIMES[extensionOf(name) ?? ""] ?? "application/octet-stream";

/** Racine du nom (O5) : `Cours 3.docx` → `Cours 3` ; un nom sans extension Office est rendu tel quel. */
export function officeStemOf(name: string): string {
  const e = extensionOf(name);
  return e === undefined ? name : name.slice(0, -e.length);
}

/** O14 : message d'un rejet de la coque. */
export function convertFailureMessage(name: string, code: string): string {
  if (code === "no-program") return `${name} : ${OFFICE_INSTALL_MESSAGE}`;
  if (code === "timeout") return `${name} : ${OFFICE_TIMEOUT_MESSAGE}`;
  return `Import impossible (${name}) : ${OFFICE_FAILED_MESSAGE}`;
}

export interface OfficeHandlerDeps {
  /** Conversion par la coque (PDF lu par morceaux, dossier libéré) ; rejette `OfficeConvertError` (code de la coque). */
  convert(path: string): Promise<Blob>;
  /** Ouvre le PDF converti dans un nouvel onglet, l'original gardé (O5, O16) ; false si refusé (avis déjà dit). */
  open(f: { readonly name: string; readonly original: Blob; readonly pdf: Blob }): Promise<boolean>;
  /** Repli du `.xlsx` sans convertisseur ou sans chemin (O4, O14) : le gestionnaire `sheet` de C10b. */
  readonly sheet?: ImportHandler;
}

/** Entrée `office` (coque) : dit elle-même ses messages (O14). */
export function officeHandler(deps: OfficeHandlerDeps): ImportHandler {
  const sheet = deps.sheet;
  const asSheet = (f: DroppedFile): ImportHandler | null => (sheet !== undefined && isSheetName(f.name) ? sheet : null);
  return {
    id: "office",
    nature: "document",
    detect: (head, name) => isOfficeFile(head, name),
    limit: { maxBytes: OFFICE_MAX_BYTES, message: OFFICE_TOO_BIG_MESSAGE },
    async run(f, ctx) {
      const path = f.path;
      if (path === undefined || path === "") {
        // Collage dans la coque : comme le web (O14).
        const s = asSheet(f);
        if (s !== null) return s.run(f, ctx);
        await ctx.notify(`${f.name} : ${OFFICE_EXPORT_MESSAGE}`);
        return "failed";
      }
      let pdf: Blob;
      try {
        pdf = await deps.convert(path);
      } catch (e) {
        const code = e instanceof OfficeConvertError ? e.code : "failed";
        const s = code === "no-program" ? asSheet(f) : null;
        if (s !== null) {
          const out = await s.run(f, ctx);
          if (out === "inserted") await ctx.notify(`${f.name} : ${OFFICE_VALUES_MESSAGE}`);
          return out;
        }
        await ctx.notify(convertFailureMessage(f.name, code));
        return "failed";
      }
      return (await deps.open({ name: f.name, original: ctx.blob, pdf })) ? "opened" : "failed";
    },
  };
}

/** Entrée `office-web` (web, iPad, O3) : rien d'inséré ; `.xlsx` et `.xlsm` laissés au classeur. */
export function officeWebHandler(): ImportHandler {
  return {
    id: "office-web",
    nature: "document",
    detect: (head, name) => !isSheetName(name) && isOfficeFile(head, name),
    async run(f, ctx) {
      await ctx.notify(`${f.name} : ${OFFICE_EXPORT_MESSAGE}`);
      return "failed";
    },
  };
}

export const CONVERSION_ATTR = "data-conversion";

/** O25 : `data-conversion="en-cours"` sur `root` pendant `run` (curseur d'attente par la feuille de style), retiré
 *  après la dernière conversion en cours, succès ou échec. */
export function withConversionMark(root: Pick<HTMLElement, "setAttribute" | "removeAttribute">): <T>(run: () => Promise<T>) => Promise<T> {
  let running = 0;
  return async <T>(run: () => Promise<T>): Promise<T> => {
    running += 1;
    root.setAttribute(CONVERSION_ATTR, "en-cours");
    try {
      return await run();
    } finally {
      running -= 1;
      if (running === 0) root.removeAttribute(CONVERSION_ATTR);
    }
  };
}
```

  `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/office-import.test.ts 2>&1 | tail -6` → « Tests  10 passed ».

- [ ] **Étape 5 : tests rouges du registre.** Dans `import.test.ts`, ajouter à la liste des imports :
  `import { OFFICE_EXPORT_MESSAGE, OFFICE_MAX_BYTES, OFFICE_TOO_BIG_MESSAGE } from "./office-import";` puis, à la fin du
  fichier :

```ts
describe("registre C16 : documents Office (O2, O3, O4, S3)", () => {
  const PK = new Uint8Array([0x50, 0x4b, 3, 4, 9]);
  const CFB = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0]);
  const G: TableGrid = { rows: 1, cols: 1, cells: ["a"], merges: [], sourceRows: 1, sourceCols: 1, cutCells: false };

  it("web : .docx, .pptx, .odt, .odp, .ods, .doc, .ppt, .xls → « <nom> : exportez en PDF depuis Office », rien d'ouvert ni d'inséré ; .xlsx → tableau (S3)", async () => {
    const t = fakeTarget();
    const openDocument = vi.fn(async () => true);
    const notify = vi.fn(async (_m: string) => undefined);
    const readSheet = vi.fn(async (_b: Blob) => G);
    const office = [file("cours.docx", PK), file("diapos.pptx", PK), file("a.odt", PK), file("b.odp", PK), file("c.ods", PK), file("vieux.doc", CFB), file("vieux.ppt", CFB), file("vieux.xls", CFB)];
    const r = await createImporter({ openDocument, notify, target: () => t.target, readSheet }).importFiles([...office, file("valeurs.xlsx", PK)], null);
    expect(r).toEqual({ opened: [], inserted: ["valeurs.xlsx"], refused: [], failed: office.map((f) => f.name) });
    expect(notify.mock.calls.map((c) => c[0])).toEqual(office.map((f) => `${f.name} : ${OFFICE_EXPORT_MESSAGE}`));
    expect(openDocument).not.toHaveBeenCalled();
    expect(t.cmds.map((c) => c.type)).toEqual(["ImportTable"]);
  });

  it("extension Office sans le bon en-tête : refusé comme avant, « prochaine version » (O2)", async () => {
    const notify = vi.fn(async (_m: string) => undefined);
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify }).importFiles([file("faux.docx", CFB), file("faux.doc", PK)], null);
    expect(r.refused).toEqual(["faux.docx", "faux.doc"]);
    expect(notify).toHaveBeenCalledWith(`faux.docx, faux.doc : ${LATER_FORMAT_MESSAGE}`);
  });

  it("coque : convertOffice(path) puis openOffice avec l'original ; .xlsx converti aussi, readSheet jamais appelé (O4, S5)", async () => {
    const pdf = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])]);
    const convertOffice = vi.fn(async (_p: string) => pdf);
    const opened: Array<[string, number[], Blob]> = [];
    const openOffice = vi.fn(async (f: { readonly name: string; readonly original: Blob; readonly pdf: Blob }) => {
      opened.push([f.name, Array.from(new Uint8Array(await f.original.arrayBuffer())), f.pdf]);
      return true;
    });
    const readSheet = vi.fn(async (_b: Blob) => G);
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: vi.fn(async () => undefined), readSheet, convertOffice, openOffice })
      .importFiles([file("cours.docx", PK, "/home/u/cours.docx"), file("notes.xlsx", PK, "/home/u/notes.xlsx")], null);
    expect(r).toEqual({ opened: ["cours.docx", "notes.xlsx"], inserted: [], refused: [], failed: [] });
    expect(convertOffice.mock.calls).toEqual([["/home/u/cours.docx"], ["/home/u/notes.xlsx"]]);
    expect(opened).toEqual([["cours.docx", Array.from(PK), pdf], ["notes.xlsx", Array.from(PK), pdf]]);
    expect(readSheet).not.toHaveBeenCalled();
  });

  it("coque : plus de 100 Mio : « gros.pptx : fichier Office trop gros pour être converti », jamais lu ni converti (O14)", async () => {
    const blob = vi.fn(async () => new Blob([PK]));
    const big: DroppedFile = { name: "gros.pptx", size: OFFICE_MAX_BYTES + 1, mime: "", path: "/home/u/gros.pptx", head: async () => PK, blob };
    const notify = vi.fn(async (_m: string) => undefined);
    const convertOffice = vi.fn(async () => new Blob());
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify, convertOffice, openOffice: vi.fn(async () => true) }).importFiles([big], null);
    expect(r.failed).toEqual(["gros.pptx"]);
    expect(notify).toHaveBeenCalledWith(`gros.pptx : ${OFFICE_TOO_BIG_MESSAGE}`);
    expect(blob).not.toHaveBeenCalled();
    expect(convertOffice).not.toHaveBeenCalled();
  });
});
```

  `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/import.test.ts 2>&1 | tail -8` → 3 échecs
  « registre C16 » (le second passe déjà).

- [ ] **Étape 6 : le registre.** Dans `import.ts` : après la ligne `import { insertTableGrid } from "./table-insert";` :

```ts
import { officeHandler, officeWebHandler } from "./office-import";
```

  À la fin d'`ImportDeps`, après `readonly model3d?: Model3dDeps;` :

```ts
  /** C16 (O4, O35) : conversion par la coque du fichier `path` en PDF ; absente (web, iPad) : « exportez en PDF depuis
   *  Office », `.xlsx` en valeurs. Rejette `OfficeConvertError` (code de la coque). */
  convertOffice?(path: string): Promise<Blob>;
  /** C16 (O5, O16) : ouvre le PDF converti dans un nouvel onglet, l'original gardé ; false si refusé (avis déjà dit). */
  openOffice?(file: { readonly name: string; readonly original: Blob; readonly pdf: Blob }): Promise<boolean>;
```

  Dans `createImporter`, juste avant `// C14 (M11) : \`media\` avant \`image\` …` :

```ts
  const convertOffice = deps.convertOffice?.bind(deps);
  const openOffice = deps.openOffice?.bind(deps);
```

  et dans la liste, juste avant `...(readSheet ? [sheetHandler({ readSheet })] : []),` :

```ts
      // C16 (O3, O4, O33) : avant `sheet` ; coque : conversion, `.xlsx` compris (repli sur `sheet` sans convertisseur) ;
      // web : message, `.xlsx` laissé à `sheet`.
      convertOffice && openOffice
        ? officeHandler({ convert: convertOffice, open: openOffice, ...(readSheet ? { sheet: sheetHandler({ readSheet }) } : {}) })
        : officeWebHandler(),
```

- [ ] **Étape 7 : verts, puis `tsc`.** Commandes de la section « Test » → vertes.

- [ ] **Étape 8 : commit.**

```bash
git add apps/web/src/platform/office-import.ts
git add apps/web/src/platform/office-import.test.ts
git add apps/web/src/platform/import.ts
git add apps/web/src/platform/import.test.ts
git commit -m "feat(web): Office import handlers (desktop conversion, web refusal message) ahead of the sheet handler

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t8"></a>
### Tâche T8 — Barre : action « Modifier dans l'application d'origine », capacité `officeConverter`

**Objectif.** L'action `edit-original` (libellé « Modifier dans l'application d'origine ») entre dans `ACTION_TABLE`,
dans la barre des pages de `defaut` et `annotation` (avant « Exporter en PDF… », avec `requires: ["officeConverter"]`),
et dans `ACTIONS` (`t.editOriginal?.()`) ; `runtimeCapabilities` lit `env.officeConverter` (vrai seulement dans la
coque) (O19, O24, HO1-5). Scénarios : S3 (bouton absent sur le web), S5.

**Fichiers.**
- Modifier : `apps/web/src/toolbar.ts:99-128` (une entrée d'`ACTION_TABLE`), `apps/web/src/toolbar-profiles.ts:24-41`
  (`pagesBar`), `:53-66` (`defaultToolbars`), `apps/web/src/app/toolbar-host.ts:28-41` (`HostTargets`), `:45-73`
  (`ACTIONS`), `apps/web/src/runtime-capabilities.ts:14-24` ; tests :
  `apps/web/src/toolbar-profiles.test.ts`, `apps/web/src/app/toolbar-host.test.ts`,
  `apps/web/src/runtime-capabilities.test.ts`, `apps/web/src/ui/Toolbar.test.tsx` (un `describe` ajouté à la fin de chacun).

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit (T10 s'en sert) :
  - `ACTION_TABLE["edit-original"] = { label: "Modifier dans l'application d'origine" }` ;
  - `HostTargets.editOriginal?(): void` ; `ACTIONS["edit-original"] = (t) => t.editOriginal?.()` ;
  - `runtimeCapabilities(staticCaps: unknown, env: { readonly tauri: boolean; readonly officeConverter?: boolean }): RuntimeCapabilities`
    (`officeConverter = env.tauri && env.officeConverter === true`).
- Réutilise : `apps/web/src/toolbar.ts:25-30` (`CapabilityKey` `officeConverter`, déjà prévue) et `apps/web/src/runtime-capabilities.ts:14` — `runtimeCapabilities(staticCaps, env: { tauri; officeConverter? })`.
- Réutilise : `apps/web/src/toolbar.ts:108` (`ACTION_TABLE`), `apps/web/src/app/toolbar-host.ts:51` (`ACTIONS`), `apps/web/src/toolbar-profiles.ts:36` (barre des pages) — `"edit-original": { label: "Modifier dans l'application d'origine" }`, `(t) => t.editOriginal?.()`, `{ …action("edit-original", …), requires: ["officeConverter"] }`.
- Le rapport porte, pour chaque ligne ci-dessus, `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
- Préparation (worktree neuf) : `pnpm install --frozen-lockfile` ; modules Wasm construits comme `scripts/verifier.sh:33-41`
  s'ils manquent (pour `tsc`).
- `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/toolbar.test.ts src/toolbar-profiles.test.ts src/app/toolbar-host.test.ts src/runtime-capabilities.test.ts src/ui/Toolbar.test.tsx --reporter=verbose 2>&1 | grep -E "C16|Tests |Test Files|FAIL|×" | tail -20`
  → 0 `×`, 5 tests « C16 » ; tests à garder verts : « barre : Exporter en PDF (C12, PF19) » (« Exporter en PDF… » en
  dernier), « RuntimeCapabilities (U10, DAU8) », « chaque action d'ACTION_TABLE a son entrée dans ACTIONS ».
- `nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -10` → vide.

**Contraintes (recopiées de Global Constraints).**
- GC1 TDD : chaque test est écrit et vu rouge avant le code qui le fait passer.
- GC2 Preuves bornées qui montrent qu'un test a tourné (`nice -n 10 pnpm --filter @roomboard/web … 2>&1 | tail -20`).
- GC5 Aucune dépendance npm neuve.
- GC13 Git : fichiers ajoutés un par un, pas de `commit -a`, aucun push forcé, aucun tag ; message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC14 Commentaires et libellés en français, identifiants en anglais.

**Interdits.** Aucun bouton dans le profil `simple` ; « Exporter en PDF… » reste le dernier bouton de la barre des pages ;
aucun `switch`, ni `localStorage`, ni DOM dans `toolbar.ts` et `toolbar-profiles.ts` (garde de source existante) ;
`App.tsx` n'est pas touché ici (T10).

**Terminé quand.** Preuves vertes.

**Étapes.**

- [ ] **Étape 1 : tests rouges.** À la fin de `apps/web/src/toolbar-profiles.test.ts` :

```ts
describe("barre : Modifier dans l'application d'origine (C16, O19)", () => {
  it("defaut et annotation : edit-original juste avant « Exporter en PDF… », requires officeConverter ; simple ne l'a pas", () => {
    for (const id of ["defaut", "annotation"]) {
      const items = builtinProfile(id)!.toolbars.find((b) => b.role === "pages")!.groups.flatMap((g) => g.items);
      const at = items.findIndex((i) => i.id === "edit-original");
      expect(items[at], id).toMatchObject({ kind: "action", action: "edit-original", label: "Modifier dans l'application d'origine", requires: ["officeConverter"] });
      expect(items[at + 1]?.id, id).toBe("export-pdf");
    }
    expect(ids("simple")).not.toContain("edit-original");
  });
  it("visible seulement avec officeConverter (HO1-5)", () => {
    const pages = builtinProfile("defaut")!.toolbars.find((b) => b.role === "pages")!;
    expect(visibleItems(pages, { ...ALL, officeConverter: false }).map((i) => i.id)).not.toContain("edit-original");
    expect(visibleItems(pages, ALL).map((i) => i.id)).toContain("edit-original");
  });
});
```

  À la fin de `apps/web/src/app/toolbar-host.test.ts` :

```ts
describe("barre : Modifier dans l'application d'origine (C16, O19)", () => {
  it("edit-original → editOriginal() ; hôte partiel sans editOriginal : rien, aucune erreur", () => {
    const editOriginal = vi.fn();
    const t = { engine: () => ({}), runFile: vi.fn(), importFiles: vi.fn(), toggle: vi.fn(), insertPages: vi.fn(), selection: vi.fn(), editOriginal } as unknown as HostTargets;
    createLocalToolbarHost(t, () => BUILTIN_PROFILES[0]!).runAction("edit-original");
    expect(editOriginal).toHaveBeenCalledTimes(1);
    const partial = { engine: () => ({}), runFile: vi.fn(), importFiles: vi.fn(), toggle: vi.fn(), insertPages: vi.fn(), selection: vi.fn() } as unknown as HostTargets;
    expect(() => createLocalToolbarHost(partial, () => BUILTIN_PROFILES[0]!).runAction("edit-original")).not.toThrow();
    expect(ACTION_TABLE["edit-original"]?.label).toBe("Modifier dans l'application d'origine");
  });
});
```

  À la fin de `apps/web/src/runtime-capabilities.test.ts` :

```ts
describe("RuntimeCapabilities : officeConverter (C16, O24)", () => {
  it("coque : suit l'environnement ; web : toujours faux", () => {
    expect(runtimeCapabilities({}, { tauri: true, officeConverter: true }).officeConverter).toBe(true);
    expect(runtimeCapabilities({}, { tauri: true, officeConverter: false }).officeConverter).toBe(false);
    expect(runtimeCapabilities({}, { tauri: true }).officeConverter).toBe(false);
    expect(runtimeCapabilities({ officeConverter: true }, { tauri: false, officeConverter: true }).officeConverter).toBe(false);
  });
});
```

  À la fin de `apps/web/src/ui/Toolbar.test.tsx` :

```tsx
describe("Toolbar : barre des pages (C16, O19)", () => {
  it("edit-original absent sans officeConverter ; capacité ajoutée (signal) : présent, clic → runAction(edit-original)", () => {
    const pages = BUILTIN_PROFILES[0]!.toolbars.find((b) => b.role === "pages")!;
    const { container, setC, host } = setup(pages);
    expect(container.querySelector('[data-item="edit-original"]')).toBeNull();
    setC({ ...NO_CAPS, officeConverter: true });
    const button = container.querySelector('[data-item="edit-original"]');
    expect(button).not.toBeNull();
    fireEvent.click(button!);
    expect(host.runAction).toHaveBeenCalledWith("edit-original");
  });
});
```

  `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/toolbar-profiles.test.ts src/app/toolbar-host.test.ts src/runtime-capabilities.test.ts src/ui/Toolbar.test.tsx 2>&1 | tail -8`
  → 4 échecs (5 attendus verts ensuite ; le cas `visibleItems` échoue aussi).

- [ ] **Étape 2 : `toolbar.ts`.** Dans `ACTION_TABLE`, après `"export-pdf": { label: "Exporter en PDF…" },` :

```ts
  "edit-original": { label: "Modifier dans l'application d'origine" },
```

- [ ] **Étape 3 : `toolbar-profiles.ts`.** Remplacer `pagesBar` et l'appel dans `defaultToolbars` :

```ts
/** Barre des pages ; `office` (C16, O19) : « Modifier dans l'application d'origine » avant « Exporter en PDF… », visible
 *  seulement avec un convertisseur (coque). */
const pagesBar = (office = false) => ({
  id: "pages",
  role: "pages",
  dock: "bottom",
  groups: [
    {
      id: "pages",
      items: [
        action("page-prev", "Page précédente"),
        action("page-next", "Page suivante"),
        action("page-add", "Ajouter une page"),
        action("page-remove", "Retirer la page"),
        action("page-insert-file", "Insérer des pages…"),
        ...(office ? [{ ...action("edit-original", "Modifier dans l'application d'origine"), requires: ["officeConverter"] }] : []),
        action("export-pdf", "Exporter en PDF…"),
      ],
    },
  ],
});
```

  et, dans `defaultToolbars`, `pagesBar(),` devient `pagesBar(true),` (le profil `simple` garde `pagesBar()`).

- [ ] **Étape 4 : `toolbar-host.ts`.** Dans `HostTargets`, après `exportPdf?(): void;` :

```ts
  /** C16 (O19) : « Modifier dans l'application d'origine » ; absent (hôte partiel) : sans effet. */
  editOriginal?(): void;
```

  et dans `ACTIONS`, après `"export-pdf": (t) => t.exportPdf?.(),` : `"edit-original": (t) => t.editOriginal?.(),`.

- [ ] **Étape 5 : `runtime-capabilities.ts`.**

```ts
/** C16 (O24) : `env.officeConverter` vient de la coque (commande `office_converter`, lue par l'amorce). */
export function runtimeCapabilities(staticCaps: unknown, env: { readonly tauri: boolean; readonly officeConverter?: boolean }): RuntimeCapabilities {
  const s = typeof staticCaps === "object" && staticCaps !== null ? (staticCaps as Record<string, unknown>) : {};
  const flag = (k: string): boolean => env.tauri && s[k] === true;
  const caps = {
    desktopAnnotation: flag("desktopAnnotation"),
    multiWindow: flag("multiWindow"),
    dropPaths: env.tauri,
    officeConverter: env.tauri && env.officeConverter === true,
  };
  return Object.fromEntries(CAPABILITY_KEYS.map((k) => [k, caps[k]])) as RuntimeCapabilities;
}
```

- [ ] **Étape 6 : verts.** Commandes de la section « Test » → vertes ; `tsc` vide.

- [ ] **Étape 7 : commit.**

```bash
git add apps/web/src/toolbar.ts
git add apps/web/src/toolbar-profiles.ts
git add apps/web/src/app/toolbar-host.ts
git add apps/web/src/runtime-capabilities.ts
git add apps/web/src/toolbar-profiles.test.ts
git add apps/web/src/app/toolbar-host.test.ts
git add apps/web/src/runtime-capabilities.test.ts
git add apps/web/src/ui/Toolbar.test.tsx
git commit -m "feat(web): edit-original page-bar action, shown only with an Office converter

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  (`toolbar.test.ts` est lancé, non modifié : il garde la liste des actions et des capacités.)

<a id="tache-t9"></a>
### Tâche T9 — Espace de travail : PDF converti avec original, « Modifier », réimport, repli `.xlsx`

**Objectif.** `openPdf` accepte un `original` (Blob) : deux assets (le PDF converti `<racine>.pdf`, `application/pdf`,
et l'original, nom et type Office), `fromPdfPages(…, original)`, onglet `<racine>.roomboard` sans cible (O5, O16,
O17) ; l'importeur reçoit `convertOffice` et `openOffice` dans la coque (O4) ; `editOriginal()` envoie l'original de la
page montrée à la coque (O19, O20) ; l'événement « original modifié » pose la question d'O22 et, sur « oui », appelle
`reimportOriginal(id)` (la coque émet le dépôt : nouvel onglet). Scénario : S5.

**Fichiers.**
- Modifier : `apps/web/src/app/workspace.ts` (imports `:8-41` : une ligne ; `WorkspaceDeps` `:63-110` : quatre champs à la
  fin, après `importPack` ; `Workspace` `:111-160` : signature d'`openPdf`, `editOriginal()` juste avant `dispose(): void;` ;
  importeur `:346-366` ; `openPdf` `:396-430` ; méthode `editOriginal` juste avant `dispose() {` ; abonnement après
  `const stopDrop = host.onDrop(…)` ; `dispose` : une ligne) ; `apps/web/src/app/workspace.test.ts` (imports, `SetupOptions`,
  `setupWorkspace`, un bloc `describe` à la fin).

**Interfaces.**
- Consomme : T1 — `CoreFactory.fromPdfPages(asset, sizes, original?: AssetRef)`, `BackdropView.original: string | null` ;
  T7 — `officeStemOf(name)`, `officeMimeOf(name)`, `NOT_OFFICE_PAGE_MESSAGE`, `originalChangedMessage(name)`,
  `OfficeConvertError`, `OFFICE_VALUES_MESSAGE` (tests), `ImportDeps.convertOffice?(path)`, `ImportDeps.openOffice?(f)`.
- Produit (T10 s'en sert) :
  - `WorkspaceDeps.convertOffice?(path: string): Promise<Blob>` ;
    `WorkspaceDeps.openOriginal?(file: { readonly name: string; readonly blob: Blob }): Promise<void>` ;
    `WorkspaceDeps.reimportOriginal?(id: string): Promise<void>` ;
    `WorkspaceDeps.onOriginalChanged?(cb: (e: { readonly id: string; readonly name: string }) => void): () => void` ;
  - `Workspace.openPdf(file: { readonly name: string; readonly blob: Blob; readonly original?: Blob }): Promise<boolean>` ;
  - `Workspace.editOriginal(): Promise<boolean>`.
- Réutilise : `apps/web/src/app/workspace.ts:396-430` — `openPdf(file: { name: string; blob: Blob; original?: Blob })` étendu (même ouverture pdf.js, mêmes refus C12).
- Réutilise : `apps/web/src/app/container-io.ts:67` — `typed(blob, mime)` pour le PDF et pour l'original (sans le recopier).
- Le rapport porte, pour chaque ligne ci-dessus, `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
- Préparation (worktree neuf) : `pnpm install --frozen-lockfile` ; modules Wasm reconstruits avec le code de T1 comme
  `scripts/verifier.sh:33-41` (le `.d.ts` doit porter `from_office_pages`, sinon `tsc` échoue sur `wasm-core.ts`).
- `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app/workspace.test.ts --reporter=verbose 2>&1 | grep -E "C16|C12|Tests |Test Files|FAIL|×" | tail -30`
  → 0 `×` ; « espace de travail : Office (C16) » 7 tests ; « espace de travail : PDF (C12) » verts.
- `nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -10` → vide.

**Contraintes (recopiées de Global Constraints).**
- GC1 TDD : chaque test est écrit et vu rouge avant le code qui le fait passer.
- GC2 Preuves bornées qui montrent qu'un test a tourné (`nice -n 10 pnpm --filter @roomboard/web … 2>&1 | tail -20`).
- GC11 Compatibilité : un `.roomboard` d'avant C16 s'ouvre toujours (test « d'avant C16 »).
- GC12 Coexistence avec C13 : dans `workspace.ts`, champs ajoutés **à la fin** de `WorkspaceDeps`, `editOriginal` juste
  avant `dispose`, `openPdf` étendu sans toucher `openDocument` ni un `openBoard` voisin ; aucune ligne existante déplacée.
- GC13 Git : fichiers ajoutés un par un, pas de `commit -a`, aucun push forcé, aucun tag ; message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC14 Commentaires et messages en français, identifiants en anglais.

**Interdits.** La page ne nomme jamais un chemin à accorder (le réimport passe un id, la coque émet le dépôt) ; l'onglet
d'origine n'est jamais modifié par un réimport (HO1-2) ; `stemOf` (`workspace.ts:51`) n'est pas modifié (PC8) ; aucun
appel à `ipc` ici.

**Terminé quand.** Preuves vertes.

**Étapes.**

- [ ] **Étape 1 : préparer les tests.** Dans `workspace.test.ts` : ajouter
  `import { NOT_OFFICE_PAGE_MESSAGE, OFFICE_VALUES_MESSAGE, OfficeConvertError, originalChangedMessage } from "../platform/office-import";`,
  ajouter `type TableGrid` à l'import de `../platform/html-table` ; dans `SetupOptions`, à la fin :

```ts
  readonly convertOffice?: WorkspaceDeps["convertOffice"];
  readonly openOriginal?: WorkspaceDeps["openOriginal"];
  readonly reimportOriginal?: WorkspaceDeps["reimportOriginal"];
  readonly onOriginalChanged?: WorkspaceDeps["onOriginalChanged"];
```

  et dans `setupWorkspace`, après la ligne `...(o.model3d ? { model3d: o.model3d } : {}),` (ou la dernière ligne du même
  genre) :

```ts
    ...(o.convertOffice ? { convertOffice: o.convertOffice } : {}),
    ...(o.openOriginal ? { openOriginal: o.openOriginal } : {}),
    ...(o.reimportOriginal ? { reimportOriginal: o.reimportOriginal } : {}),
    ...(o.onOriginalChanged ? { onOriginalChanged: o.onOriginalChanged } : {}),
```

- [ ] **Étape 2 : tests rouges.** À la fin de `workspace.test.ts` :

```ts
describe("espace de travail : Office (C16)", () => {
  const PDF_HEAD = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a]);
  const DOCX = new Uint8Array([0x50, 0x4b, 3, 4, 1, 2, 3]);
  const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const G: TableGrid = { rows: 1, cols: 1, cells: ["a"], merges: [], sourceRows: 1, sourceCols: 1, cutCells: false };
  const engine = (pages = 2): PdfEngine => ({
    open: async (_b: Blob): Promise<PdfFile> => ({ pageCount: pages, pageSize: async () => ({ w: 612, h: 792 }), renderTile: async () => ({}) as TileBitmap, destroy: () => undefined }),
  });
  const office = (name: string, bytes: Uint8Array<ArrayBuffer> = DOCX, path: string | null = `/home/u/${name}`): DroppedFile => ({
    name, size: bytes.byteLength, mime: "", ...(path === null ? {} : { path }), head: async (n: number) => bytes.slice(0, n), blob: async () => new Blob([bytes]),
  });
  const converting = () => vi.fn(async (_p: string) => new Blob([PDF_HEAD]));
  const originals = (doc: CoreDocument) => doc.pageIds().map((id) => doc.page(id)?.backdrop?.original ?? null);

  it("S5 : cours.docx déposé avec un chemin : convertOffice(path), onglet « cours.roomboard », chaque fond porte original, PDF « cours.pdf » et original « cours.docx » au magasin", async () => {
    const convertOffice = converting();
    const ws = await setupWorkspace({ kind: "tauri", pdf: engine(), convertOffice });
    const r = await ws.importFiles([office("cours.docx")], null);
    expect(r.opened).toEqual(["cours.docx"]);
    expect(convertOffice.mock.calls).toEqual([["/home/u/cours.docx"]]);
    const tab = ws.active();
    const doc = tab.board.doc;
    expect([tab.files.name(), tab.files.isDirty(), doc.canUndo()]).toEqual(["cours.roomboard", false, false]);
    const orig = doc.citedAssets().find((a) => a.name === "cours.docx");
    const pdf = doc.citedAssets().find((a) => a.name === "cours.pdf");
    expect([orig?.mime, orig?.size, pdf?.mime]).toEqual([DOCX_MIME, DOCX.byteLength, "application/pdf"]);
    expect(originals(doc)).toEqual([orig!.id, orig!.id]);
    expect(Array.from(new Uint8Array(await tab.assets.get(orig!.id)!.arrayBuffer()))).toEqual(Array.from(DOCX));
    expect(tab.assets.get(orig!.id)!.type).toBe(DOCX_MIME);
  });

  it("S5 : enregistrer puis rouvrir : l'original est écrit dans les assets, même empreinte, chaque fond garde original", async () => {
    const ws = await setupWorkspace({ kind: "tauri", pdf: engine(), convertOffice: converting() });
    await ws.importFiles([office("cours.docx")], null);
    const doc = ws.active().board.doc;
    const orig = doc.citedAssets().find((a) => a.name === "cours.docx")!;
    expect(await ws.active().files.run("save")).toBe(true);
    const [manifest, ybin, assets] = codec.write.mock.calls[0]!;
    expect(assets.map((a) => a.id).sort()).toEqual(doc.citedAssets().map((a) => a.id).sort());
    expect(assets.find((a) => a.id === orig.id)?.mime).toBe(DOCX_MIME);
    codec.read.mockResolvedValueOnce({ manifest, ybin, assets: assets.map((a) => [a.id, a.blob] as const), warnings: [] });
    expect(await ws.openDocument({ name: "cours.roomboard", bytes: new Uint8Array([1]), target: null })).toBe(true);
    expect(originals(ws.active().board.doc)).toEqual([orig.id, orig.id]);
    expect(ws.active().assets.has(orig.id)).toBe(true);
  });

  it("S5 : « Modifier dans l'application d'origine » envoie le nom et les octets de l'original de la page montrée", async () => {
    const openOriginal = vi.fn(async (_f: { readonly name: string; readonly blob: Blob }) => undefined);
    const ws = await setupWorkspace({ kind: "tauri", pdf: engine(), convertOffice: converting(), openOriginal });
    await ws.importFiles([office("cours.docx")], null);
    expect(await ws.editOriginal()).toBe(true);
    const arg = openOriginal.mock.calls[0]![0];
    expect(arg.name).toBe("cours.docx");
    expect(Array.from(new Uint8Array(await arg.blob.arrayBuffer()))).toEqual(Array.from(DOCX));
  });

  it("page sans original : avis « cette page ne vient pas d'un fichier Word, Excel ou PowerPoint », rien envoyé (O19)", async () => {
    const openOriginal = vi.fn(async () => undefined);
    const ws = await setupWorkspace({ openOriginal });
    expect(await ws.editOriginal()).toBe(false);
    expect(shell.notify).toHaveBeenCalledWith(NOT_OFFICE_PAGE_MESSAGE);
    expect(openOriginal).not.toHaveBeenCalled();
  });

  it("S5, Review Focus 5 : original modifié : question ; oui : reimportOriginal(id) seul, le dépôt émis par la coque ouvre un second onglet, l'onglet d'origine intact ; non : rien ; dispose désabonne", async () => {
    const hook: { fire: ((e: { readonly id: string; readonly name: string }) => void) | null } = { fire: null };
    const onOriginalChanged = vi.fn((cb: (e: { readonly id: string; readonly name: string }) => void) => {
      hook.fire = cb;
      return () => {
        hook.fire = null;
      };
    });
    const reimportOriginal = vi.fn(async (_id: string) => {
      dropHandler?.([office("cours.docx", DOCX, "/cache/originaux/1-0/cours.docx")], null);
    });
    const ws = await setupWorkspace({ kind: "tauri", pdf: engine(), convertOffice: converting(), onOriginalChanged, reimportOriginal });
    await ws.importFiles([office("cours.docx")], null);
    const origin = ws.active();
    const pages = origin.board.doc.pageIds();
    answer = true;
    hook.fire!({ id: "1-0", name: "cours.docx" });
    await vi.waitFor(() => expect(ws.tabs.list()).toHaveLength(3));
    expect(shell.confirm).toHaveBeenCalledWith(originalChangedMessage("cours.docx"));
    expect(reimportOriginal.mock.calls).toEqual([["1-0"]]);
    expect(origin.board.doc.pageIds()).toEqual(pages);
    answer = false;
    hook.fire!({ id: "1-0", name: "cours.docx" });
    await flush();
    expect(reimportOriginal).toHaveBeenCalledTimes(1);
    ws.dispose();
    expect(hook.fire).toBeNull();
  });

  it("S5, O18 : un .roomboard d'avant C16 (PDF de C12, sans original) s'ouvre comme avant : original null partout", async () => {
    const ws = await setupWorkspace();
    const c12 = fakeCore.fromPdfPages({ id: "cd".repeat(32), name: "cours.pdf", mime: "application/pdf", size: 9 }, [{ w: 612, h: 792 }, { w: 792, h: 612 }]);
    const [manifest, ybin] = c12.saveParts(NOW, "0.1.0");
    codec.read.mockResolvedValueOnce({ manifest, ybin, assets: [], warnings: [] });
    expect(await ws.openDocument({ name: "cours.roomboard", bytes: new Uint8Array([1]), target: null })).toBe(true);
    const doc = ws.active().board.doc;
    expect(doc.pageIds().map((id) => doc.page(id)?.backdrop?.kind)).toEqual(["pdf-page", "pdf-page"]);
    expect(originals(doc)).toEqual([null, null]);
  });

  it("S5, O4 : sans convertisseur (no-program), notes.xlsx donne un tableau et l'avis « importé en valeurs… » ; cours.docx : « installez… »", async () => {
    const convertOffice = vi.fn(async (_p: string): Promise<Blob> => {
      throw new OfficeConvertError("no-program");
    });
    const readSheet = vi.fn(async (_b: Blob) => G);
    const ws = await setupWorkspace({ kind: "tauri", pdf: engine(), convertOffice, readSheet });
    const r = await ws.importFiles([office("notes.xlsx"), office("cours.docx")], null);
    expect([r.inserted, r.failed]).toEqual([["notes.xlsx"], ["cours.docx"]]);
    expect(readSheet).toHaveBeenCalledTimes(1);
    expect(shell.notify).toHaveBeenCalledWith(`notes.xlsx : ${OFFICE_VALUES_MESSAGE}`);
    expect(shell.notify).toHaveBeenCalledWith("cours.docx : installez LibreOffice ou Microsoft Office");
    expect(ws.tabs.list()).toHaveLength(1);
  });
});
```

  (Si `NOW` n'existe pas sous ce nom dans le fichier, utiliser la constante de date déjà employée par les tests
  « conteneur » ; si `CoreDocument` n'est pas importé, il l'est déjà ligne 4.)
  `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app/workspace.test.ts 2>&1 | tail -10` → échecs
  « Office (C16) » (le test « d'avant C16 » peut déjà passer).

- [ ] **Étape 3 : `workspace.ts`, imports et dépendances.** Ajouter, après
  `import { createImporter, WEB_MAX_BYTES, type ImportReport } from "../platform/import";` :

```ts
import { NOT_OFFICE_PAGE_MESSAGE, officeMimeOf, officeStemOf, originalChangedMessage } from "../platform/office-import";
```

  Ajouter `type AssetRef` à l'import de `../core/api` s'il n'y est pas. À la fin de `WorkspaceDeps` (après `importPack?`) :

```ts
  /** C16 (O4, O35) : conversion d'un fichier Office de la coque en PDF (lu par morceaux, dossier libéré) ; absent (web) :
   *  « exportez en PDF depuis Office ». Transmis à l'importeur. */
  convertOffice?(path: string): Promise<Blob>;
  /** C16 (O20) : envoie l'original à la coque, qui l'ouvre avec l'application du système. */
  openOriginal?(file: { readonly name: string; readonly blob: Blob }): Promise<void>;
  /** C16 (O22) : la coque accorde sa copie `id` et émet un dépôt ; la page ne nomme jamais un chemin. */
  reimportOriginal?(id: string): Promise<void>;
  /** C16 (O21) : « original modifié » émis par la coque ; rend le désabonnement. */
  onOriginalChanged?(cb: (e: { readonly id: string; readonly name: string }) => void): () => void;
```

  Dans `Workspace`, la ligne d'`openPdf` devient
  `openPdf(file: { readonly name: string; readonly blob: Blob; readonly original?: Blob }): Promise<boolean>;` (commentaire :
  ajouter « C16 (O16) : `original`, fichier Office converti, gardé comme second asset. ») et, juste avant `dispose(): void;` :

```ts
  /** C16 (O19, O20) : « Modifier dans l'application d'origine » sur la page montrée ; faux sans port, sans original ou
   *  refusé (avis dit). */
  editOriginal(): Promise<boolean>;
```

- [ ] **Étape 4 : importeur.** Après `const importPack = deps.importPack;` : `const convertOffice = deps.convertOffice;`.
  Dans l'objet passé à `createImporter`, après `...(importPack ? { importPack } : {}),` :

```ts
    // C16 (O4, O5) : coque seulement ; le PDF converti s'ouvre par `openPdf`, l'original gardé.
    ...(convertOffice && deps.pdf
      ? {
          convertOffice,
          openOffice: (f: { readonly name: string; readonly original: Blob; readonly pdf: Blob }) => ws.openPdf({ name: f.name, blob: f.pdf, original: f.original }),
        }
      : {}),
```

- [ ] **Étape 5 : `openPdf`.** Remplacer le bloc entre `const assets = makeAssets();` et `return (await addTab(…)) !== null;` par :

```ts
        const assets = makeAssets();
        const blob = typed(file.blob, PDF_MIME);
        // C16 (O5, O16) : PDF converti nommé `<racine>.pdf`, original gardé (nom et type Office), onglet `<racine>.roomboard`.
        const original = file.original;
        const stem = original === undefined ? stemOf(name, PDF_EXTENSION) : officeStemOf(name);
        const id = await assets.put(blob);
        const pdfRef: AssetRef = { id, name: original === undefined ? name : `${stem}${PDF_EXTENSION}`, mime: PDF_MIME, size: blob.size };
        let originalRef: AssetRef | undefined;
        if (original !== undefined) {
          const ob = typed(original, officeMimeOf(name));
          originalRef = { id: await assets.put(ob), name, mime: ob.type, size: ob.size };
        }
        const doc = originalRef === undefined ? core.fromPdfPages(pdfRef, sizes) : core.fromPdfPages(pdfRef, sizes, originalRef);
        if (total > PDF_MAX_PAGES) await say(pdfFirstPagesMessage(name, total));
        return (await addTab(doc, { name: `${stem}${ROOMBOARD_EXTENSION}`, target: null }, assets)) !== null;
```

- [ ] **Étape 6 : `editOriginal` et abonnement.** Juste avant `dispose() {` dans l'objet `ws` :

```ts
    async editOriginal() {
      const open = deps.openOriginal;
      if (open === undefined) return false;
      const tab = ws.active(); // onglet montré à l'appel (R3)
      const id = tab.board.doc.page(tab.board.engine.state().page)?.backdrop?.original ?? null;
      if (id === null) {
        await say(NOT_OFFICE_PAGE_MESSAGE);
        return false;
      }
      const blob = tab.assets.get(id);
      const info = tab.board.doc.asset(id);
      if (blob === undefined || info === null) {
        await say(UNREAD_ASSETS_MESSAGE);
        return false;
      }
      try {
        await open({ name: info.name, blob });
        return true;
      } catch (e) {
        await say(`Ouverture impossible (${info.name}) : ${messageOf(e)}`);
        return false;
      }
    },
```

  Juste après le bloc `const stopDrop = host.onDrop(…);` :

```ts
  // C16 (O22) : « original modifié » → question ; oui : la coque réimporte (dépôt émis, nouvel onglet) ; non : rien, la
  // surveillance continue.
  const reimport = deps.reimportOriginal;
  const stopOriginal =
    deps.onOriginalChanged?.((e) => {
      void (async () => {
        if (reimport !== undefined && (await ask(originalChangedMessage(e.name)))) await reimport(e.id);
      })().catch((err: unknown) => {
        console.warn(`RoomBoard : réimport abandonné (${messageOf(err)})`);
      });
    }) ?? (() => undefined);
```

  et dans `dispose()`, après `stopDrop();` : `stopOriginal();`.

- [ ] **Étape 7 : verts.** Commandes de la section « Test » → vertes ; `tsc` vide.

- [ ] **Étape 8 : commit.**

```bash
git add apps/web/src/app/workspace.ts
git add apps/web/src/app/workspace.test.ts
git commit -m "feat(web): open converted Office PDFs with their original, edit and reimport it

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t10"></a>
### Tâche T10 — Ports de la coque et amorce : `host-tauri.ts`, `main.ts`, `App.tsx`, curseur d'attente

**Objectif.** Les ports Office de la coque côté page : `officeConverter(ipc)` (O24), `convertOffice(ipc, path)` (PDF lu
par `grantedFile`, puis `release_conversion` dans tous les cas, O35), `openOriginal(ipc, name, blob)` (corps brut, nom en
en-tête encodé en pourcentage, O20), `reimportOriginal(ipc, id)` (O22), `onOriginalChanged(ipc, cb)` (O21) ; `TauriIpc.invoke`
accepte un corps brut et des en-têtes. L'amorce lit `office_converter` avant `runtimeCapabilities`, branche les ports dans
`createWorkspace` (coque seulement), marque la conversion (`data-conversion`, curseur d'attente, O25) ; `App.tsx` relie
`editOriginal`. Scénario : S5.

**Fichiers.**
- Modifier : `apps/web/src/platform/host-tauri.ts` (`TauriIpc` `:61-64` ; constantes après `:68` ; fonctions après
  `relinkMedia` `:107-110` ; `loadTauriPorts` `:265-268`) ; `apps/web/src/platform/host-tauri.test.ts` (imports, un
  `describe` à la fin) ; `apps/web/src/main.ts` (import `:31`, une ligne d'import, `env` `:154`, deps de
  `createWorkspace` après le bloc C14 `:283-289`) ; `apps/web/src/ui/App.tsx:251` (une ligne) ; `apps/web/src/ui/rb.css`
  (une règle à la fin).

**Interfaces.**
- Consomme : T7 — `OfficeConvertError`, `withConversionMark(root)` ; T8 — `runtimeCapabilities(staticCaps, env: { tauri; officeConverter? })`,
  `HostTargets.editOriginal?()` ; T9 — `WorkspaceDeps.convertOffice?`, `openOriginal?`, `reimportOriginal?`,
  `onOriginalChanged?`, `Workspace.editOriginal()` ; T6 — commandes `office_converter`, `convert_office` (`{ path }` →
  `{ id, pdf, size }`, rejet = code), `release_conversion` (`{ id }`), `open_original` (corps brut + en-tête
  `x-roomboard-name`), `reimport_original` (`{ id }`), événement `roomboard://original-changed` (`{ id, path, name }`).
- Produit, dans `apps/web/src/platform/host-tauri.ts` :
  - `TauriIpc.invoke<T>(cmd: string, args?: Record<string, unknown> | Uint8Array, options?: { readonly headers: Readonly<Record<string, string>> }): Promise<T>` ;
  - `ORIGINAL_CHANGED_EVENT = "roomboard://original-changed"`, `NAME_HEADER = "x-roomboard-name"` ;
  - `officeConverter(ipc: TauriIpc): Promise<boolean>` ; `convertOffice(ipc: TauriIpc, path: string): Promise<Blob>` ;
    `openOriginal(ipc: TauriIpc, name: string, blob: Blob): Promise<void>` ; `reimportOriginal(ipc: TauriIpc, id: string): Promise<void>` ;
    `onOriginalChanged(ipc: TauriIpc, cb: (e: { readonly id: string; readonly name: string }) => void): () => void`.
- Réutilise : `apps/web/src/platform/host-tauri.ts:77-101` — `grantedFile(ipc, path, size).blob()` pour lire le PDF converti par morceaux de 8 Mio (`read_granted_file`), jamais en un seul message IPC.
- Le rapport porte `Réutilisation : appelé grantedFile (host-tauri.ts)` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
- Préparation (worktree neuf) : `pnpm install --frozen-lockfile` ; modules Wasm reconstruits (code de T1) comme
  `scripts/verifier.sh:33-41`.
- `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/host-tauri.test.ts --reporter=verbose 2>&1 | grep -E "C16|Tests |Test Files|FAIL|×" | tail -20`
  → 0 `×`, « coque : Office (C16) » 5 tests ; cas « coque : dépôt, lancement, sortie (T86) » verts.
- `nice -n 10 pnpm --filter @roomboard/web test 2>&1 | tail -8` → « Test Files … passed », 0 failed.
- `nice -n 10 pnpm --filter @roomboard/web build 2>&1 | tail -5` → build sans erreur (`tsc --noEmit && vite build`).

**Contraintes (recopiées de Global Constraints).**
- GC1 TDD : chaque test est écrit et vu rouge avant le code qui le fait passer.
- GC2 Preuves bornées qui montrent qu'un test a tourné (`nice -n 10 pnpm --filter @roomboard/web … 2>&1 | tail -20`).
- GC5 Aucune dépendance npm neuve, aucun build Tauri.
- GC6 Module Wasm `formats` : rien n'y entre ; plafonds inchangés.
- GC12 Coexistence avec C13 : dans `main.ts`, l'import et le bloc `createWorkspace` s'ajoutent après les blocs
  existants (C14) ; rien d'existant n'est réécrit ni déplacé.
- GC13 Git : fichiers ajoutés un par un, pas de `commit -a`, aucun push forcé, aucun tag ; message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC14 Commentaires en français, identifiants en anglais.

**Interdits.** Jamais l'original en JSON (`Array.from(bytes)` ou `{ bytes }`) : corps brut seulement ; jamais le PDF
converti en un seul `invoke` ; la page n'envoie jamais un chemin à `reimport_original` ; aucune permission Tauri neuve.

**Terminé quand.** Preuves vertes ; le build web passe.

**Étapes.**

- [ ] **Étape 1 : tests rouges.** Dans `host-tauri.test.ts`, ajouter à l'import de `./host-tauri` : `convertOffice`,
  `NAME_HEADER`, `officeConverter`, `onOriginalChanged`, `openOriginal`, `ORIGINAL_CHANGED_EVENT`, `reimportOriginal` ;
  et `import { OfficeConvertError } from "./office-import";`. À la fin du fichier :

```ts
describe("coque : Office (C16)", () => {
  type Call = { readonly cmd: string; readonly args: unknown; readonly options: unknown };
  function officeIpc(o: { convert?: () => Promise<unknown>; size?: number; failRead?: boolean; converter?: () => Promise<boolean> } = {}) {
    const calls: Call[] = [];
    const listeners = new Map<string, (e: { payload: unknown }) => void>();
    const size = o.size ?? 5;
    const ipc: TauriIpc = {
      async invoke<T>(cmd: string, args?: Record<string, unknown> | Uint8Array, options?: { readonly headers: Readonly<Record<string, string>> }): Promise<T> {
        calls.push({ cmd, args, options });
        if (cmd === "convert_office") return (await (o.convert ?? (async () => ({ id: "7-0", pdf: "/cache/conversions/7-0/source.pdf", size })))()) as T;
        if (cmd === "read_granted_file") {
          if (o.failRead === true) throw new Error("disque");
          const { offset, len } = args as { offset: number; len: number };
          return new Uint8Array(Math.max(0, Math.min(len, size - offset))).fill(0x25).buffer as T;
        }
        if (cmd === "office_converter") return (await (o.converter ?? (async () => true))()) as T;
        if (cmd === "open_original") return "3-0" as T;
        if (cmd === "release_conversion" || cmd === "reimport_original") return undefined as T;
        throw new Error(cmd);
      },
      async listen(event, cb) {
        listeners.set(event, cb as (e: { payload: unknown }) => void);
        return () => void listeners.delete(event);
      },
    };
    return { ipc, calls, listeners };
  }
  const tick = () => new Promise((r) => setTimeout(r, 0));

  it("convertOffice : convert_office(path), PDF lu par morceaux, release_conversion(id) à la fin (O35)", async () => {
    const f = officeIpc({ size: READ_CHUNK + 2 });
    const blob = await convertOffice(f.ipc, "/home/u/cours.docx");
    expect(blob.size).toBe(READ_CHUNK + 2);
    expect(f.calls.map((c) => c.cmd)).toEqual(["convert_office", "read_granted_file", "read_granted_file", "release_conversion"]);
    expect(f.calls[0]!.args).toEqual({ path: "/home/u/cours.docx" });
    expect(f.calls[1]!.args).toEqual({ path: "/cache/conversions/7-0/source.pdf", offset: 0, len: READ_CHUNK });
    expect(f.calls.at(-1)!.args).toEqual({ id: "7-0" });
  });

  it("lecture du PDF en échec : release_conversion appelé quand même, l'erreur remonte (Review Focus 3)", async () => {
    const f = officeIpc({ failRead: true });
    await expect(convertOffice(f.ipc, "/home/u/cours.docx")).rejects.toThrow("disque");
    expect(f.calls.map((c) => c.cmd)).toEqual(["convert_office", "read_granted_file", "release_conversion"]);
  });

  it("rejet de la coque (chaîne) : OfficeConvertError au même code, ni lecture ni libération (O14)", async () => {
    const f = officeIpc({ convert: () => Promise.reject("timeout") });
    const e = await convertOffice(f.ipc, "/x/cours.docx").catch((x: unknown) => x);
    expect(e).toBeInstanceOf(OfficeConvertError);
    expect((e as OfficeConvertError).code).toBe("timeout");
    expect(f.calls.map((c) => c.cmd)).toEqual(["convert_office"]);
  });

  it("openOriginal : corps brut (Uint8Array), nom dans l'en-tête encodé en pourcentage, jamais en JSON (O20)", async () => {
    const f = officeIpc();
    await openOriginal(f.ipc, "Leçon 3.pptx", new Blob([new Uint8Array([0x50, 0x4b, 3, 4])]));
    const c = f.calls[0]!;
    expect(c.cmd).toBe("open_original");
    expect(c.args).toBeInstanceOf(Uint8Array);
    expect(Array.from(c.args as Uint8Array)).toEqual([0x50, 0x4b, 3, 4]);
    expect(c.options).toEqual({ headers: { [NAME_HEADER]: "Le%C3%A7on%203.pptx" } });
  });

  it("reimportOriginal : l'id seul ; onOriginalChanged : rappel puis désabonnement ; officeConverter : vrai, faux si l'appel échoue (O22, O24)", async () => {
    const f = officeIpc();
    await reimportOriginal(f.ipc, "3-0");
    expect(f.calls.at(-1)).toEqual({ cmd: "reimport_original", args: { id: "3-0" }, options: undefined });
    const seen: Array<{ id: string; name: string }> = [];
    const stop = onOriginalChanged(f.ipc, (e) => void seen.push({ id: e.id, name: e.name }));
    await tick();
    f.listeners.get(ORIGINAL_CHANGED_EVENT)!({ payload: { id: "3-0", path: "/cache/originaux/3-0/cours.docx", name: "cours.docx" } });
    expect(seen).toEqual([{ id: "3-0", name: "cours.docx" }]);
    stop();
    await tick();
    expect(f.listeners.has(ORIGINAL_CHANGED_EVENT)).toBe(false);
    expect(await officeConverter(f.ipc)).toBe(true);
    expect(await officeConverter(officeIpc({ converter: () => Promise.reject(new Error("absente")) }).ipc)).toBe(false);
  });
});
```

  `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/host-tauri.test.ts 2>&1 | tail -6` → échecs
  (fonctions absentes).

- [ ] **Étape 2 : `host-tauri.ts`.** `TauriIpc` devient :

```ts
export interface TauriIpc {
  /** C16 (O20) : `args` peut être un corps brut (`Uint8Array`), avec des en-têtes. */
  invoke<T>(cmd: string, args?: Record<string, unknown> | Uint8Array, options?: { readonly headers: Readonly<Record<string, string>> }): Promise<T>;
  listen<T>(event: string, cb: (e: { readonly payload: T }) => void): Promise<() => void>;
}
```

  Ajouter `import { OfficeConvertError } from "./office-import";` après l'import de `./files` ; après
  `export const READ_CHUNK = 8 * 1024 * 1024;` :

```ts
/** C16 (O21) : une copie d'original a été enregistrée dans l'application d'origine. */
export const ORIGINAL_CHANGED_EVENT = "roomboard://original-changed";
/** C16 (O20) : nom de l'original, encodé en pourcentage (lu par `originals::decode_name`). */
export const NAME_HEADER = "x-roomboard-name";
```

  et après `relinkMedia` :

```ts
/** C16 (O24) : vrai si la coque a trouvé LibreOffice ou Microsoft Office au lancement ; appel en échec : faux. */
export async function officeConverter(ipc: TauriIpc): Promise<boolean> {
  try {
    return (await ipc.invoke<boolean>("office_converter")) === true;
  } catch {
    return false;
  }
}

/** C16 (O35) : conversion par la coque ; le PDF accordé est lu par morceaux (`read_granted_file`), puis
 *  `release_conversion` retire l'accord et le dossier, que la lecture réussisse ou non. Rejet de la coque (chaîne) :
 *  `OfficeConvertError(code)`. */
export async function convertOffice(ipc: TauriIpc, path: string): Promise<Blob> {
  type Converted = { readonly id: string; readonly pdf: string; readonly size: number };
  let converted: Converted;
  try {
    converted = await ipc.invoke<Converted>("convert_office", { path });
  } catch (e) {
    throw new OfficeConvertError(typeof e === "string" ? e : "failed");
  }
  try {
    return await grantedFile(ipc, converted.pdf, converted.size).blob();
  } finally {
    await ipc.invoke<void>("release_conversion", { id: converted.id }).catch(() => undefined);
  }
}

/** C16 (O20) : l'original en corps brut, le nom dans l'en-tête ; la coque l'écrit, le contrôle et l'ouvre. */
export async function openOriginal(ipc: TauriIpc, name: string, blob: Blob): Promise<void> {
  await ipc.invoke<string>("open_original", new Uint8Array(await blob.arrayBuffer()), { headers: { [NAME_HEADER]: encodeURIComponent(name) } });
}

/** C16 (O22) : la coque accorde sa copie `id` et émet un dépôt ; aucun chemin ne part de la page. */
export const reimportOriginal = (ipc: TauriIpc, id: string): Promise<void> => ipc.invoke<void>("reimport_original", { id });

/** C16 (O21) : abonnement à « original modifié » ; le désabonnement attend la fin de `listen` s'il le faut. */
export function onOriginalChanged(ipc: TauriIpc, cb: (e: { readonly id: string; readonly name: string }) => void): () => void {
  let stop: (() => void) | null = null;
  let stopped = false;
  ipc
    .listen<{ readonly id: string; readonly name: string }>(ORIGINAL_CHANGED_EVENT, (e) => cb({ id: e.payload.id, name: e.payload.name }))
    .then(
      (s) => {
        if (stopped) s();
        else stop = s;
      },
      (err: unknown) => console.warn("RoomBoard : écoute des originaux indisponible", err),
    );
  return () => {
    stopped = true;
    stop?.();
  };
}
```

  Dans `loadTauriPorts`, `ipc.invoke` devient :

```ts
      invoke: (cmd, args, options) => core.invoke(cmd, args, options === undefined ? undefined : { headers: { ...options.headers } }),
```

  `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/host-tauri.test.ts 2>&1 | tail -6` → vert.

- [ ] **Étape 3 : `main.ts`.** Compléter l'import de `./platform/host-tauri` par `convertOffice, officeConverter, onOriginalChanged, openOriginal, reimportOriginal`
  et ajouter `import { withConversionMark } from "./platform/office-import";` après la dernière ligne d'import. La ligne
  `const env = { tauri, userAgent: navigator.userAgent };` devient :

```ts
  // C16 (O24) : capacité `officeConverter` lue de la coque avant le profil (convertisseur cherché une fois au lancement).
  const env = { tauri, userAgent: navigator.userAgent, officeConverter: ipc === null ? false : await officeConverter(ipc) };
```

  Dans l'objet passé à `createWorkspace`, juste après le bloc `...(ipc === null || ports === null ? {} : { linkMedia: …, relinkMedia: … }),` :

```ts
    // Office (C16) : coque seulement ; conversion marquée sur la racine (curseur d'attente, O25), original ouvert,
    // surveillé et réimporté par la coque (O20 à O22).
    ...(ipc === null
      ? {}
      : {
          convertOffice: (p: string) => markConversion(() => convertOffice(ipc, p)),
          openOriginal: (f: { readonly name: string; readonly blob: Blob }) => openOriginal(ipc, f.name, f.blob),
          reimportOriginal: (id: string) => reimportOriginal(ipc, id),
          onOriginalChanged: (cb: (e: { readonly id: string; readonly name: string }) => void) => onOriginalChanged(ipc, cb),
        }),
```

  avec, juste avant `const workspace = await createWorkspace({` :

```ts
  const markConversion = withConversionMark(document.documentElement);
```

- [ ] **Étape 4 : `App.tsx` et style.** Dans `createLocalToolbarHost({ … })` de `ui/App.tsx`, après
  `exportPdf: () => void ws.exportPdf(),` : `editOriginal: () => void ws.editOriginal(),`. À la fin de `ui/rb.css` :

```css
/* C16 (O25) : conversion Office en cours : curseur d'attente sur la scène (le moteur pose son curseur en ligne). */
:root[data-conversion="en-cours"] .rb-stage,
:root[data-conversion="en-cours"] .rb-stage * { cursor: progress !important; }
```

- [ ] **Étape 5 : verts.** Les trois commandes de la section « Test ».

- [ ] **Étape 6 : commit.**

```bash
git add apps/web/src/platform/host-tauri.ts
git add apps/web/src/platform/host-tauri.test.ts
git add apps/web/src/main.ts
git add apps/web/src/ui/App.tsx
git add apps/web/src/ui/rb.css
git commit -m "feat(web): desktop Office ports (convert, open original as raw body, reimport) and wiring

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t11"></a>
### Tâche T11 — Essai navigateur C16, `verifier.sh --e2e`, capture S4, vérification complète

**Objectif.** Un essai Playwright (application construite, CSP de la coque, Chromium 1280 × 900, repli
`?fichiers=repli`) joue S3 sur le web : `cours.docx` et `diapos.pptx` (fixtures de T3) → deux avis « <nom> : exportez en
PDF depuis Office », aucun onglet ni élément ; `valeurs.xlsx` → un tableau en valeurs ; enregistrer puis rouvrir ; la
scène mesure au moins 640 px ; le bouton « Modifier dans l'application d'origine » est absent. Avec `--captures` : S4,
`diapos.pptx` converti par `/usr/bin/soffice` (exemple `convertir_office`, même code que la coque), le PDF déposé, 2
pages, capture `docs/essais/c16-pptx-libreoffice.png`. L'essai entre dans `verifier.sh --e2e` (sans option de capture)
et la vérification complète passe. Scénarios : S3, S4.

**Fichiers.**
- Créer : `scripts/essais/c16-office-navigateur.mjs`, `docs/essais/c16-pptx-libreoffice.png` (écrit par l'essai)
- Modifier : `scripts/verifier.sh` (deux lignes après `node scripts/essais/c12-pdf-navigateur.mjs`, `:108`) ;
  `scripts/tests/verifier-e2e.test.sh` (deux lignes après la boucle `for s in …; done`, `:13-15`).

**Interfaces.**
- Consomme : T3 — fixtures `crates/roomboard-shell/tests/fixtures/{cours.docx,diapos.pptx}`, exemple
  `cargo run -q -p roomboard-shell --example convertir_office -- <entrée> <sortie.pdf>` (imprime `convertisseur : <chemin>`) ;
  T7 — gestionnaire `office-web` (avis `<nom> : exportez en PDF depuis Office`) ; T8 — bouton `button[data-item="edit-original"]`
  absent sans `officeConverter` ; C10b — `crates/roomboard-formats/tests/fixtures/valeurs.xlsx` ; C12 — import PDF
  (`#stage[data-page]`, `[data-fond]`).
- Produit : `scripts/essais/c16-office-navigateur.mjs [--captures]` (code 0 réussi, 1 échec, 2 outil absent ; dernière
  ligne « C16 Office : OK »).
- Réutilise : `scripts/essais/commun.mjs:103, 145` et `c12-pdf-navigateur.mjs` — `stageBox(page, 640)`, `dropFile(page, "#stage", name, bytes, type, at)`, `serve`, `coqueCsp`, `loadPlaywright`, `frames`, `item`, `TAB`, `VIEWPORT`, `Echec`, `gitSha` ; même squelette `main()` que l'essai C12.
- Le rapport porte `Réutilisation : appelé scripts/essais/commun.mjs` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
- `nice -n 10 bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3` → « verifier-e2e.test.sh : OK ».
- `nice -n 10 bash scripts/verifier.sh --e2e 2>&1 | tail -80` → lignes « C16 Office : OK », « verifier.sh : e2e OK »,
  « verifier.sh : OK », `module Wasm : N octets` (N ≤ 1 572 864, à comparer à 1 371 293), `module formats : 3100845 octets`
  (inchangé). Tests à garder verts : tous les essais d'avant (« C12 PDF : OK », « C10b … : OK », « C15 3D : OK », …).
- Preuve visuelle (S4) : `node scripts/essais/c16-office-navigateur.mjs --captures 2>&1 | tail -15` → d'abord les
  lectures `ok — S4 : diapos.pptx converti par /usr/bin/soffice : %PDF-` et `ok — S4 : nouvel onglet, data-page="1/2",
  data-fond="pret"`, puis `capture : …/docs/essais/c16-pptx-libreoffice.png` ; ouvrir la capture et la décrire au
  rapport (page 1 d'une présentation, texte « Diapositive 1 » sur fond blanc, barre des pages en bas, onglet
  `diapos.roomboard`).

**Contraintes (recopiées de Global Constraints).**
- GC2 Preuves bornées qui montrent qu'un test a tourné.
- GC4 Les tests qui exigent `soffice` échouent s'il manque ; `verifier.sh` et la CI ne posent jamais
  `ROOMBOARD_SANS_SOFFICE`.
- GC5 Aucun build Tauri, aucune installation de paquet système.
- GC6 Plafonds 1 572 864 o (principal) et 3 145 728 o (formats) inchangés ; module `formats` inchangé.
- GC9 Geste Playwright ajouté à `verifier.sh --e2e` : `.docx` et `.pptx` générés → « exportez en PDF depuis Office » ;
  `.xlsx` → tableau en valeurs ; enregistrer puis rouvrir ; un test mesure la scène ≥ 640 px.
- GC10 Capture `docs/essais/c16-pptx-libreoffice.png` (S4) : un `.pptx` fabriqué, converti par `/usr/bin/soffice` sur la
  VM, PDF déposé dans le navigateur, pages importées.
- GC12 Coexistence avec C13 : `verifier.sh` et `verifier-e2e.test.sh` : lignes insérées aux endroits nommés, la liste
  partagée de `verifier-e2e.test.sh:13` n'est pas modifiée.
- GC13 Git : fichiers ajoutés un par un, pas de `commit -a`, aucun push forcé, aucun tag ; message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC14 Commentaires et messages en français.

**Interdits.** `verifier.sh --e2e` ne passe jamais `--captures` ; l'essai n'appelle aucun interpréteur de commandes
(`spawnSync("cargo", [...])`, arguments en liste) ; aucune requête hors de `127.0.0.1` ; aucune capture commitée
d'autrui réécrite.

**Terminé quand.** `verifier.sh --e2e` vert de bout en bout, capture commitée et décrite, tailles au rapport.

**Étapes.**

- [ ] **Étape 1 : l'essai.** Créer `scripts/essais/c16-office-navigateur.mjs` :

```js
#!/usr/bin/env node
// Essai C16 Office au navigateur (S3, S4 du cadrage). Web (repli `?fichiers=repli`, CSP de la coque, Chromium) :
// cours.docx puis diapos.pptx (fabriqués par les tests de roomboard-shell) → « <nom> : exportez en PDF depuis Office »,
// rien d'ajouté ; valeurs.xlsx (C10b) → un tableau en valeurs ; enregistrer puis rouvrir ; scène ≥ 640 px ; bouton
// « Modifier dans l'application d'origine » absent. `--captures` : S4, diapos.pptx converti par LibreOffice (exemple
// convertir_office de roomboard-shell, même code que la coque), le PDF déposé (2 pages), capture
// docs/essais/c16-pptx-libreoffice.png. Code : 0 réussi, 1 échec, 2 outil absent.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, dropFile, frames, gitSha, item, loadPlaywright, serve, stageBox } from "./commun.mjs";

const LABEL = "C16 Office";
const FIXED = new Date("2026-11-21T08:00:00.000Z");
const FIX = join(ROOT, "crates", "roomboard-shell", "tests", "fixtures");
const XLSX = join(ROOT, "crates", "roomboard-formats", "tests", "fixtures", "valeurs.xlsx");
const EXPORT = "exportez en PDF depuis Office";

async function scenario(page, url, { captures, tmp }) {
  const errors = [];
  const dialogs = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("dialog", async (d) => {
    dialogs.push(d.message());
    await d.accept();
  });
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const attr = (name) => page.getAttribute("#stage", name);
  const waitAttr = (name, v) =>
    page.waitForFunction(([n, v]) => document.querySelector("#stage")?.getAttribute(n) === v, [name, v], { timeout: 30000 }).catch(async () => {
      throw new Echec(`${name} attendu « ${v} », lu « ${await attr(name)} »`);
    });
  const waitDialog = async (text) => {
    for (let i = 0; i < 300; i++) {
      if (dialogs.some((d) => d.includes(text))) return;
      await page.waitForTimeout(100);
    }
    throw new Echec(`boîte attendue « ${text} » ; reçues : ${dialogs.join(" | ")}`);
  };
  const tabs = () => page.locator(TAB).count();
  const waitTabs = (n) =>
    page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, n, { timeout: 30000 }).catch(async () => {
      throw new Echec(`onglets attendus ${n}, lus ${await tabs()} ; erreurs : ${errors.join(" | ")}`);
    });
  const download = async (press, name) => {
    const dl = page.waitForEvent("download");
    await press();
    const file = join(tmp, name);
    await (await dl).saveAs(file);
    return file;
  };

  await page.goto(url);
  await page.waitForSelector("#stage");
  await frames(page);
  const box = await stageBox(page, 640);
  check(box.height >= 640, `S3 : scène de ${box.height} px (≥ 640)`);
  check((await page.locator(item("edit-original")).count()) === 0, "S3 : « Modifier dans l'application d'origine » absent de la barre (web)");

  // S3 : documents Office refusés avec le message, rien d'ajouté.
  const n0 = await tabs();
  const e0 = (await attr("data-elements")) ?? "0";
  await dropFile(page, "#stage", "cours.docx", readFileSync(join(FIX, "cours.docx")));
  await waitDialog(`cours.docx : ${EXPORT}`);
  await dropFile(page, "#stage", "diapos.pptx", readFileSync(join(FIX, "diapos.pptx")));
  await waitDialog(`diapos.pptx : ${EXPORT}`);
  await frames(page);
  check((await tabs()) === n0 && ((await attr("data-elements")) ?? "0") === e0, `S3 : deux avis « <nom> : ${EXPORT} », aucun onglet ni élément ajouté`);

  // S3 : .xlsx en valeurs (C10b inchangé), au centre de la scène.
  const mid = [box.width / 2, box.height / 2];
  await dropFile(page, "#stage", "valeurs.xlsx", readFileSync(XLSX), "", mid);
  await waitAttr("data-elements", String(Number(e0) + 1));
  check(true, "S3 : valeurs.xlsx : un tableau en valeurs");

  // S3 : enregistrer puis rouvrir.
  const saved = await download(() => page.keyboard.press("Control+s"), "c16-valeurs.roomboard");
  const n1 = await tabs();
  await dropFile(page, "#stage", "c16-valeurs.roomboard", await readFile(saved), "application/x-roomboard");
  await waitTabs(n1 + 1);
  await waitAttr("data-elements", String(Number(e0) + 1));
  check(true, "S3 : enregistré puis rouvert : le tableau est là");
  const box2 = await stageBox(page, 640);
  check(box2.height >= 640, `S3 : scène de ${box2.height} px (≥ 640) après réouverture`);

  if (captures) {
    // S4 : conversion réelle par le code de la coque (exemple convertir_office), puis dépôt du PDF.
    const pdfPath = join(tmp, "diapos.pdf");
    const run = spawnSync("cargo", ["run", "-q", "-p", "roomboard-shell", "--example", "convertir_office", "--", join(FIX, "diapos.pptx"), pdfPath], { cwd: ROOT, encoding: "utf8" });
    if (run.status !== 0) throw new Echec(`convertir_office : code ${run.status} ; ${run.stderr}`);
    const converter = (run.stdout.match(/convertisseur : (.+)/) ?? [])[1] ?? "?";
    const pdf = await readFile(pdfPath);
    check(pdf.subarray(0, 5).toString("latin1") === "%PDF-", `S4 : diapos.pptx converti par ${converter} : %PDF-`);
    const n2 = await tabs();
    await dropFile(page, "#stage", "diapos.pdf", pdf, "application/pdf");
    await waitTabs(n2 + 1);
    await waitAttr("data-page", "1/2");
    await waitAttr("data-fond", "pret");
    check(true, 'S4 : nouvel onglet, data-page="1/2", data-fond="pret"');
    await frames(page);
    const path = join(ROOT, "docs", "essais", "c16-pptx-libreoffice.png");
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  }
  check(errors.length === 0, `aucune erreur dans la page${errors.length > 0 ? ` : ${errors.join(" | ")}` : ""}`);
}

async function main() {
  console.log(`sha ${gitSha()}`);
  if (!existsSync(join(DIST, "index.html"))) {
    console.error(`${LABEL} : ÉCHEC — apps/web/dist absent : lancer d'abord scripts/verifier.sh (Wasm et application)`);
    return 1;
  }
  for (const f of [join(FIX, "cours.docx"), join(FIX, "diapos.pptx"), XLSX]) {
    if (!existsSync(f)) {
      console.error(`${LABEL} : ÉCHEC — fixture absente : ${f}`);
      return 1;
    }
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${LABEL} : outil absent — Playwright introuvable (npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=…)`);
    return 2;
  }
  const server = await serve({ headers: { "Content-Security-Policy": coqueCsp() } });
  const port = server.address().port;
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c16-"));
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

  (Recopier la fin de `main()` — fermeture du navigateur, du serveur, du dossier temporaire, code de sortie — à
  l'identique de `scripts/essais/c12-pdf-navigateur.mjs` si elle diffère de la forme ci-dessus.)

- [ ] **Étape 2 : l'essai seul, rouge puis vert.** Sans `apps/web/dist` construit avec T7 à T10, l'essai échoue
  (« boîte attendue … exportez en PDF depuis Office »). Construire : `nice -n 10 pnpm --filter @roomboard/web build 2>&1 | tail -3`
  (modules Wasm construits avant, comme `scripts/verifier.sh:33-41`), puis
  `nice -n 10 node scripts/essais/c16-office-navigateur.mjs 2>&1 | tail -15` → les lignes `ok — S3 : …` et « C16 Office : OK ».

- [ ] **Étape 3 : `verifier-e2e.test.sh` rouge.** Juste après la ligne `done` qui ferme la boucle `for s in … ; do … done`
  (ligne 15), ajouter :

```bash
# C16 : ligne à part (la liste ci-dessus est partagée avec d'autres chantiers, O33).
grep -q "scripts/essais/c16-office-navigateur.mjs" scripts/verifier.sh || ko "c16-office-navigateur absent de verifier.sh"
```

  `bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -2` → `ECHEC : c16-office-navigateur absent de verifier.sh`.

- [ ] **Étape 4 : `verifier.sh`.** Juste après la ligne `  node scripts/essais/c12-pdf-navigateur.mjs` :

```bash
  node scripts/essais/c16-office-navigateur.mjs
  echo "C16 Office : OK"
```

  `bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -2` → « verifier-e2e.test.sh : OK ».

- [ ] **Étape 5 : vérification complète.** `nice -n 10 bash scripts/verifier.sh --e2e 2>&1 | tail -80` → attendus de la
  section « Test ». Noter les deux tailles.

- [ ] **Étape 6 : capture S4.** `nice -n 10 node scripts/essais/c16-office-navigateur.mjs --captures 2>&1 | tail -15` →
  lectures puis capture ; ouvrir `docs/essais/c16-pptx-libreoffice.png` et la décrire au rapport.

- [ ] **Étape 7 : commit.**

```bash
git add scripts/essais/c16-office-navigateur.mjs
git add scripts/verifier.sh
git add scripts/tests/verifier-e2e.test.sh
git add docs/essais/c16-pptx-libreoffice.png
git commit -m "test(e2e): C16 Office browser check (web refusal, sheet values, save and reopen) and LibreOffice capture

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Tailles des deux modules (avant 1 371 293 o et 3 100 845 o, après), description de la capture, durée de
`verifier.sh --e2e`, lignes `Réutilisation : …`, écarts.
