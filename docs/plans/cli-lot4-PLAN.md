# CLI lot 4 (Office, médias, 3D, autres images) — plan d'exécution

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Binaire `roomboard-office` (exemple promu, purge, `--check` avec racine) | — | `crates/roomboard-shell/examples/convertir_office.rs` (retiré), `crates/roomboard-shell/src/bin/roomboard-office.rs`, `crates/roomboard-shell/tests/office_bin.rs`, `scripts/verifier.sh`, `scripts/essais/c16-office-navigateur.mjs` | isolé (`~/projets/roomboard-wt/cli-lot4--T1`) | implementeur-tdd | `nice -n 10 cargo test -p roomboard-shell --test office_bin -j 4 2>&1 \| tail -15` : `test result: ok. N passed`, N ≥ 6, nom `check_prints_converter_and_root` présent ; `grep -c convertir_office scripts/essais/c16-office-navigateur.mjs` → `0` | S1, S2 | #tache-t1 |
| T2 | `image-size.ts` (GIF, WebP, BMP, ICO, AVIF, HEIC, SVG), `probeSize` étendu, fabriques d'images | — | `apps/web/src/platform/image-size.ts`, `apps/web/src/platform/image-size.test.ts`, `apps/web/src/platform/image-import.ts`, `apps/web/src/platform/image-import.test.ts`, `scripts/essais/fabriques/images.mjs`, `scripts/essais/fabriques/images.d.mts` | isolé (`~/projets/roomboard-wt/cli-lot4--T2`) | implementeur-tdd | `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/image-size.test.ts src/platform/image-import.test.ts 2>&1 \| tail -15` : `Test Files  2 passed`, aucun `FAIL ` ; `… exec vitest run src/platform/image-size.test.ts -t "headerSize" 2>&1 \| tail -5` : ≥ 12 tests | S5 | #tache-t2 |
| T3 | `media-header.ts` (MP4/MOV/M4A, WebM, WAV, Ogg, MP3), fabriques de médias | — | `apps/web/src/platform/media-header.ts`, `apps/web/src/platform/media-header.test.ts`, `scripts/essais/fabriques/medias.mjs`, `scripts/essais/fabriques/medias.d.mts` | isolé (`~/projets/roomboard-wt/cli-lot4--T3`) | implementeur-tdd | `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/media-header.test.ts src/platform/media-import.test.ts 2>&1 \| tail -15` : `Test Files  2 passed` ; `-t "readMediaHeader"` ≥ 14 tests | S3 | #tache-t3 |
| T4 | CLI 3D : `model3d-node.ts` (globaux de three, D76), `quietError`, erreurs non rattrapées (D77), fabriques 3D | — | `apps/cli/src/model3d-node.ts`, `apps/cli/src/model3d-node.test.ts`, `apps/cli/src/quiet.ts`, `apps/cli/src/quiet.test.ts`, `apps/cli/src/bin.ts`, `apps/cli/src/bin.test.ts`, `scripts/essais/fabriques/modeles.mjs`, `scripts/essais/fabriques/modeles.d.mts` | isolé (`~/projets/roomboard-wt/cli-lot4--T4`) | concepteur-critique | `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/model3d-node.test.ts src/quiet.test.ts src/bin.test.ts 2>&1 \| tail -15` : `Test Files  3 passed`, ≥ 14 tests, nom `D76` présent ; puis build et `node apps/cli/dist/roomboard.mjs formats 2>&1 >/dev/null \| wc -c` → `0` | S4 | #tache-t4 |
| T5 | CLI médias et images : `media-node.ts` (`nodeMedia`, `headerBlocked`) ; parcours ISO partagé | T2, T3 | `apps/cli/src/media-node.ts`, `apps/cli/src/media-node.test.ts`, `apps/web/src/platform/media-header.ts` | isolé (`~/projets/roomboard-wt/cli-lot4--T5`) | implementeur-tdd | `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run --reporter=verbose src/media-node.test.ts 2>&1 \| tail -30` : `Test Files  1 passed`, ≥ 9 tests, noms `headerBlocked — S3` et `RF4` présents ; `nice -n 10 pnpm --filter @roomboard/web exec vitest run --reporter=verbose src/platform/media-header.test.ts 2>&1 \| tail -25` : `1 passed`, nom `RF1` présent | S3, S5 | #tache-t5 |
| T6 | CLI Office : `office-node.ts` (binaire, `--check`, signaux D79), `readDoc`, `convert`, aide | T1 | `apps/cli/src/office-node.ts`, `apps/cli/src/office-node.test.ts`, `apps/cli/src/office.test.ts`, `apps/cli/src/session.ts`, `apps/cli/src/exporter.ts`, `apps/cli/src/main.ts`, `apps/cli/src/main.test.ts`, `apps/cli/src/guards.test.ts`, `apps/cli/src/convert.test.ts` | isolé (`~/projets/roomboard-wt/cli-lot4--T6`) | concepteur-critique | `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run --reporter=verbose src/office-node.test.ts src/office.test.ts src/guards.test.ts src/convert.test.ts src/main.test.ts 2>&1 \| grep -E "✓\|×\|↓\|Test Files"` : `Test Files  5 passed`, ≥ 3 lignes `✓ … S1 —`, ≥ 2 lignes `✓ … S2 —`, ligne `✓ … D79 — SIGINT dès que LibreOffice cite la racine` présente, aucune ligne `↓` (sauté) ni `×` ; `for p in /proc/[0-9]*; do tr '\0' ' ' < $p/cmdline; echo; done 2>/dev/null \| grep -c roomboard-cli-t-` → `0` | S1, S2 | #tache-t6 |
| T7 | Branchement : `importInto`, `FORMAT_LOTS` (`LOT_LIVRE = 4`), scénarios S1 à S5 en Vitest | T4, T5, T6 | `apps/cli/src/importer.ts`, `apps/cli/src/formats.ts`, `apps/cli/src/main.ts`, `apps/cli/src/formats.test.ts`, `apps/cli/src/import.test.ts`, `apps/cli/src/pdf.test.ts`, `apps/cli/src/pdf-node.ts`, `apps/cli/src/contract.ts`, `apps/cli/src/boards.test.ts`, `apps/cli/src/images.test.ts`, `apps/cli/src/media.test.ts`, `apps/cli/src/model3d.test.ts`, `apps/cli/src/office.test.ts` | isolé (`~/projets/roomboard-wt/cli-lot4--T7`) | implementeur-tdd | `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli test 2>&1 \| tail -15` : tous verts, aucun `FAIL ` ; `… exec vitest run --reporter=verbose src/images.test.ts src/media.test.ts src/model3d.test.ts src/office.test.ts src/formats.test.ts 2>&1 \| grep -E "✓\|×\|↓\|Test Files"` : `Test Files  5 passed`, ≥ 20 lignes `✓`, noms `S5 — huit images`, `S3 — import son.wav`, `S4 — import cube.obj`, `RF3 — deux .docx`, `D68 — aucune entrée` présents, aucune ligne `↓` ni `×` | S1, S2, S3, S4, S5 | #tache-t7 |
| T8 | Essai `cli-essai.mjs` (S1 à S5, Ctrl-C), `objets.mjs`, profil, mesure du démarrage, `verifier.sh --e2e` | T7 | `scripts/essais/cli-essai.mjs`, `scripts/essais/fabriques/objets.mjs`, `scripts/essais/fabriques/objets.d.mts`, `.claude/chantier.md` | isolé (`~/projets/roomboard-wt/cli-lot4--T8`) | implementeur-tdd | `nice -n 10 scripts/verifier.sh --e2e 2>&1 \| tail -40` : lignes `CLI : OK`, `verifier.sh : e2e OK`, `module formats : 2794511 octets` ; `grep -c "Lots restants : aucun" .claude/chantier.md` → `1` | S5, S1, S2, S3, S4 | #tache-t8 |

Vagues (dépendances) : 1 = T1 ∥ T2 ∥ T3 ∥ T4 ; 2 = T5 (dès T2 et T3 fusionnées) ∥ T6 (dès T1 fusionnée) ; 3 = T7 ; 4 = T8.
Aucune paire d'une même vague ne partage un fichier : `importer.ts` et `formats.ts` ne sont touchés que par T7 (tâche
d'intégration) ; `media-header.ts` par T3 puis T5 (vagues différentes) ; `office.test.ts` par T6 puis T7. Chemin
critique : T1 → T6 → T7 → T8 (~35 + 50 + 50 + 35 min). Coupe H48 à 07:30.

**Chemin critique recalculé (vague 1 lancée à 05:50 ; arrêt ferme 09:09 ; poussée de sauvegarde 08:59)** : T1 ~05:50–06:25 →
T6 ~06:25–07:20 (T5 ~06:40–07:15 en parallèle, après T3) → T7 ~07:20–08:15 → T8 ~08:15–08:50, dont `verifier.sh --e2e`
(~25 min, non mesuré) : fin ~08:50, **9 min avant la poussée de sauvegarde**, 19 min avant l'arrêt ferme. Marge nulle pour
un correctif de fin. Leviers, dans l'ordre : appliquer la coupe H48 à 07:30 sans attendre ; lancer `verifier.sh --e2e` dès
le commit de l'essai (T8 étape 6), sans attendre le profil ; si T7 n'est pas fusionnée à 08:20, pousser la branche telle
quelle à 08:59 (sauvegarde) et reporter T8.

**Écart au découpage DA21 (7 tâches)** : 8 tâches. Les branchements de `importer.ts` et de `formats.ts` que DA21 confiait à
T4, T5 et T6 en parallèle (fusion par l'orchestrateur) passent dans une seule tâche d'intégration (T7), pour qu'aucune
vague ne partage un fichier ; la 3D (sans dépendance) avance en vague 1. `checkOffice` vit dans `office-node.ts` et
`headerBlocked` dans `media-node.ts` (T6, T5) ; `importer.ts` les réexporte (T7) : l'interface de DA17 reste importable
depuis `importer.ts`.

**Écart à D70 et à la carte d'impact (fabriques)** : D70 prévoyait un seul module neuf `scripts/essais/fabriques/objets.mjs`
(+ `.d.mts`). Le plan en écrit quatre, pour qu'aucune vague ne partage un fichier : `images.mjs` + `.d.mts` (T2),
`medias.mjs` + `.d.mts` (T3), `modeles.mjs` + `.d.mts` (T4), et `objets.mjs` + `.d.mts` (T8) qui les réexporte et, lancé
seul, écrit le jeu des scénarios (interface de D70 tenue). Entrées ajoutées à la carte 3.5 : ces six fichiers, tous
« touché, neuf ».

**Écart à la carte d'impact** : `scripts/essais/c16-office-navigateur.mjs:97` lance `cargo run … --example
convertir_office` (la carte le disait non touché, D50 « aucun script ne l'appelle ») : T1 le passe à `--bin
roomboard-office`, sinon `verifier.sh --e2e` casse.

**Goal :** la CLI importe et lit les fichiers Office (par le binaire `roomboard-office` de la coque puis le chemin PDF du
lot 3), les médias (durée lue dans l'en-tête), les modèles 3D (validés par three, sans instantané) et les images GIF,
WebP, BMP, ICO, SVG, AVIF, HEIC (taille lue dans l'en-tête, aussi dans un tableau blanc) ; plus aucun format ne répond
« lot pas encore livré ».

**Architecture :** deux lecteurs purs côté web (`image-size.ts`, `media-header.ts`), un binaire Rust promu de l'exemple
existant, trois adaptateurs Node minces (`media-node.ts`, `model3d-node.ts`, `office-node.ts`) branchés dans
`createImporter` du produit par `importInto`, et `readDoc` pour l'Office ; `FORMAT_LOTS` passe tout le lot 4 à
« couvert ».

**Tech Stack :** TypeScript (Vite 6, Vitest 3), Node 22, three 0.187 et fflate 0.8.3 (résolus depuis `apps/web`), Rust
(`roomboard-shell`, binaire), LibreOffice 7+ externe (`/usr/bin/soffice` sur la VM), modules Wasm inchangés.

**Spec :** `docs/plans/cli-lot4-cadrage.md` (complète `docs/plans/cli-cadrage.md`, `docs/plans/cli-lot2-cadrage.md`,
`docs/plans/cli-lot3-cadrage.md`).

## Global Constraints

Recopiées dans chaque section concernée (un sous-agent ne lit que la sienne).

- G1 — TDD : test rouge d'abord. Aucun test désactivé ni sauté (`.skip`, `.only` ajouté), aucun seuil baissé ou relevé,
  aucun délai de test existant relevé ; un test qui échoue sur un délai est rejoué une fois.
- G2 — VM partagée : builds et tests en `nice -n 10`, cargo en `-j 4` ; avant toute commande :
  `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- G3 — `roomboard-shell` : seulement `cargo check`/`cargo test`/`cargo clippy`/`cargo build -p roomboard-shell --bin
  roomboard-office` en `nice -n 10 … -j 4` ; aucun `tauri build`, aucun bundle, aucun build Android.
- G4 — LibreOffice en `--headless` (posé par `run_libreoffice`, aucun code neuf) ; chaque processus lancé est fermé ;
  aucun `soffice` vivant après un test (le test le vérifie). Ne tuer aucun processus non lancé par soi (`glycin-svg`
  compris).
- G5 — Fichiers d'essai fabriqués par le code à partir des fabriques et fixtures du dépôt ; aucun fichier téléchargé ;
  rien de `~/telechargements-roomboard/` ; écritures seulement sous `tmpDir()` (tests) ou un `mkdtemp` (essai, Rust).
- G6 — Tailles Wasm inchangées : principal 1 374 215 o (plafond 1 572 864), formats 2 794 511 o (plafond 3 145 728) ;
  aucun crate Wasm touché (`roomboard-core`, `roomboard-wasm`, `roomboard-formats`, `roomboard-formats-wasm`).
- G7 — Aucune dépendance ajoutée (npm ni Cargo) ; aucune AGPL/GPL/LGPL ; aucune installation de paquet système ; polices
  Liberation intouchées.
- G8 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (`--author`), messages en anglais terminés par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un, jamais `git add -A`, `git add .`,
  `git commit -a` ; jamais `--force`.
- G9 — D15 du profil : chaque format livré met à jour `FORMAT_LOTS`, ses tests et `scripts/essais/cli-essai.mjs`.
- G10 — La CLI appelle le code de la page et de la coque, jamais une copie (décision 0281) ; une logique de format vit
  dans `apps/web/src/platform` ou `crates/roomboard-shell`, jamais dans `apps/cli`.
- G11 — Construction de la CLI : modules Wasm construits comme `scripts/verifier.sh` (copiés en G12), puis
  `nice -n 10 pnpm --filter @roomboard/cli build` ; tests `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter
  @roomboard/cli test`.
- G12 — Worktree isolé neuf : `cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r
  /home/adminjd/projets/roomboard-wt/cli-lot4/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot4/apps/web/src/wasm-formats
  apps/web/src/` (dossiers générés, ignorés par git).
- G13 — stderr de la CLI réservé à la ligne `{"error":…}` (DA2) : aucun `console.log`, `console.warn` ni `console.error`
  ajouté au code de la CLI ; seul `quiet.ts` touche `console.warn` et `console.error`.
- G14 — D75 : ne pas aggraver `image-import.ts:244` (`ImageTarget`, non touché) ni le cycle `import.ts` ↔
  `office-import.ts` (aucun import neuf entre eux).
- G15 — Règle de coupe H48, à 07:30 : un format dont le lecteur n'est pas vert (MP3 et Ogg d'abord, puis AVIF/HEIC ; pour
  la 3D, les modèles texturés) est laissé de côté avec sa raison (entrée `read: null`, note `laissé de côté : <raison>`,
  code 3 `<nom> : format non lu par la CLI : <raison>`) ; jamais « au lot N ». La tâche le dit dans son rapport.

## Review Focus

- RF1 — En-tête tronqué ou corrompu (fichier coupé au milieu d'une boîte, VINT nul, page Ogg incomplète, chunk RIFF
  trop long) : `null`, jamais d'exception ni de boucle sans fin. Tests : T2 « RF1 — chaque préfixe d'une image fabriquée :
  taille ou null, jamais d'exception », T3 « RF1 — chaque préfixe d'un média fabriqué : en-tête ou null » (cadrage D62,
  D65 : code 3 « illisible », jamais une pile).
- RF2 — Nom de fichier Office avec espace, accent et apostrophe (« Cours d'été 2.docx ») : converti, `spawn` sans shell.
  Test : T6 « RF2 — nom avec espace, accent et apostrophe » (cadrage S1, D57).
- RF3 — Deux imports Office dans une même session `run` : `--check` lancé une seule fois, deux onglets ouverts, dossier
  `conversions/` vide après. Test : T7 « RF3 — deux .docx dans une session run » (cadrage D56 « une fois par processus »,
  D51).
- RF4 — Extension qui ment (un GIF nommé `x.png`, un `.mp4` qui porte une marque AVIF) : le registre et `headerBlocked`
  tranchent par les octets, jamais par l'extension. Test : T5 « RF4 — x.png qui contient un GIF : taille du GIF, aucun
  code 3 » (cadrage D65, H47).
- RF5 — SVG à `width="100%"` avec `viewBox`, ou unité `em` : taille du navigateur. Test : T2 « RF5 — SVG à 100 % et viewBox,
  SVG en em » (cadrage D64, H39).

## Carte des fichiers

| fichier | rôle | tâche |
|---|---|---|
| `crates/roomboard-shell/src/bin/roomboard-office.rs` | binaire (ex-exemple) : `--check`, conversion, purge | T1 |
| `crates/roomboard-shell/tests/office_bin.rs` | tests d'intégration du binaire (vrai LibreOffice) | T1 |
| `apps/web/src/platform/image-size.ts` | `headerSize`, `isoBoxes` : tailles dans l'en-tête | T2 |
| `apps/web/src/platform/media-header.ts` | `readMediaHeader` : durée et taille dans l'en-tête | T3, T5 |
| `scripts/essais/fabriques/{images,medias,modeles}.mjs` (+ `.d.mts`) | octets d'essai écrits par le code (écart à D70 : trois modules au lieu d'un, réexportés par `objets.mjs`) | T2, T3, T4 |
| `scripts/essais/fabriques/objets.mjs` (+ `.d.mts`) | réexporte les trois fabriques ; lancé seul, écrit le jeu des scénarios | T8 |
| `apps/cli/src/model3d-node.ts` | `nodeModel3d`, `withThreeGlobals` | T4 |
| `apps/cli/src/media-node.ts` | `nodeMedia`, `headerBlocked` | T5 |
| `apps/cli/src/office-node.ts` | `officeBinary`, `officeReady`, `checkOffice`, `convertOfficeFile`, `killLeftovers` | T6 |
| `apps/cli/src/importer.ts` | branche les trois adaptateurs dans `createImporter` | T7 |
| `apps/cli/src/formats.ts` | `LOT_LIVRE = 4`, notes, `leftAsideReason` | T7 |

---
<a id="tache-t1"></a>
### Tâche T1 — Binaire `roomboard-office` (exemple promu, purge, `--check` avec racine)

**Objectif :** promouvoir l'exemple `convertir_office` en binaire `roomboard-office` du paquet `roomboard-shell`, qui
appelle le code de la coque (`find_converter`, `convert_granted`, `release_conversion`, `purge_conversions`), travaille
sous `$XDG_CACHE_HOME/roomboard-office` (sinon `$HOME/.cache/roomboard-office`), purge les conversions mortes au
démarrage, ne libère que sa propre conversion, et rend les codes de DA16. Cadrage : D50 à D54, DA16, H49 ; S1, S2.

**Fichiers :**
- Déplacer : `crates/roomboard-shell/examples/convertir_office.rs` → `crates/roomboard-shell/src/bin/roomboard-office.rs`
  (`git mv`, puis réécrire)
- Créer : `crates/roomboard-shell/tests/office_bin.rs`
- Modifier : `scripts/verifier.sh:83` (ligne avant `pnpm --filter @roomboard/cli build`)
- Modifier : `scripts/essais/c16-office-navigateur.mjs:6,95,97-98` (l'exemple n'existe plus)

**Interfaces :**
- Consomme : rien d'une autre tâche.
- Réutilise : `crates/roomboard-shell/src/office.rs:195` — `find_converter(&Search::from_env()) -> Option<Converter>`
- Réutilise : `crates/roomboard-shell/src/office.rs:570`, `:615` — `convert_granted(&g, path, Some(&c), &root, CONVERT_TIMEOUT) -> Result<Converted, ConvertError>`, `release_conversion(&g, &root, &id)`
- Réutilise : `crates/roomboard-shell/src/office.rs:644` — `purge_conversions(&root)`
- Réutilise (étendu) : `crates/roomboard-shell/examples/convertir_office.rs:11` — `main()` promu en binaire (D50, DA16)
- Produit (lu par T6) :
  ```
  roomboard-office --check                  0 : stdout « convertisseur : <chemin> » puis « racine : <racine> »
                                            3 : stderr « no-program : installez LibreOffice ou Microsoft Office »
  roomboard-office <entrée> <sortie.pdf>    0 : stdout « PDF : <sortie> (<n> octets) »
                                            1 : stderr « <code>[ : <détail>] » (Display de ConvertError)
                                            3 : stderr « no-program : installez LibreOffice ou Microsoft Office »
  sans argument ou autre forme              2 : stderr « usage : roomboard-office --check | roomboard-office <entrée Office> <sortie.pdf> »
  racine = $XDG_CACHE_HOME/roomboard-office (absolu) sinon $HOME/.cache/roomboard-office ; conversions sous <racine>/conversions/<pid>-<n>
  ```

**Contraintes (recopiées de Global Constraints) :**
- G1 — TDD : test rouge d'abord. Aucun test désactivé ni sauté, aucun seuil baissé ou relevé, aucun délai de test
  existant relevé ; un test qui échoue sur un délai est rejoué une fois.
- G2 — VM partagée : builds et tests en `nice -n 10`, cargo en `-j 4` ; avant toute commande :
  `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- G3 — `roomboard-shell` : seulement `cargo check`/`cargo test`/`cargo clippy`/`cargo build -p roomboard-shell --bin
  roomboard-office` en `nice -n 10 … -j 4` ; aucun `tauri build`, aucun bundle, aucun build Android.
- G4 — LibreOffice en `--headless` (posé par `run_libreoffice`, aucun code neuf) ; chaque processus lancé est fermé ;
  aucun `soffice` vivant après un test (le test le vérifie). Ne tuer aucun processus non lancé par soi (`glycin-svg`
  compris).
- G5 — Fichiers d'essai : fixtures suivies `crates/roomboard-shell/tests/fixtures/{cours.docx,diapos.pptx}` ; aucun
  fichier téléchargé ; écritures seulement sous un dossier neuf de `std::env::temp_dir()`, retiré à la fin du test.
- G6 — Aucun crate Wasm touché ; tailles Wasm inchangées (1 374 215 o, 2 794 511 o).
- G7 — Aucune dépendance ajoutée (`Cargo.toml` de `roomboard-shell` inchangé : un binaire de `src/bin/` n'a besoin
  d'aucune section) ; aucune AGPL/GPL/LGPL ; aucune installation de paquet système.
- G8 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais terminés par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un ; jamais `--force`.
- G10 — Aucune logique de conversion recopiée : le binaire n'appelle que `office.rs` (`office.rs` non modifié).

**Interdits :** modifier `crates/roomboard-shell/src/office.rs` ou `src/lib.rs` ; ajouter un gestionnaire de signal au
binaire (D79 : non simple, la CLI s'en charge) ; `remove_dir_all` de `<racine>/conversions` (D51 : effacerait la
conversion d'un autre processus) ; `temp_dir()` comme racine de travail.

**Terminé quand :** les 6 tests de `office_bin.rs` passent avec le vrai LibreOffice ; `cargo clippy -p roomboard-shell
--all-targets -- -D warnings` sans avertissement ; `cargo fmt --check -p roomboard-shell` propre ; aucun `soffice` dont
la ligne de commande contient le dossier du test ; `verifier.sh` construit le binaire avant la CLI ; c16 appelle
`--bin roomboard-office`. Rapport : lignes `Réutilisation : appelé office::find_converter, convert_granted,
release_conversion, purge_conversions` (ou `Réutilisation : écart — <pourquoi>`).

**Étapes :**

- [ ] **Étape 1 : worktree et déplacement**

```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
cd ~/projets/roomboard-wt/cli-lot4--T1
mkdir -p crates/roomboard-shell/src/bin
git mv crates/roomboard-shell/examples/convertir_office.rs crates/roomboard-shell/src/bin/roomboard-office.rs
rmdir crates/roomboard-shell/examples 2>/dev/null || true
```

- [ ] **Étape 2 : écrire les tests d'intégration (rouges)** — `crates/roomboard-shell/tests/office_bin.rs`

```rust
//! Binaire `roomboard-office` (cadrage cli-lot4, D50 à D54, DA16, S1, S2) : lancé tel que construit par cargo
//! (`CARGO_BIN_EXE_roomboard-office`), racine de travail sous un `XDG_CACHE_HOME` jetable. LibreOffice exigé ; absent, les
//! tests réels échouent, sauf `ROOMBOARD_SANS_SOFFICE=1` (saut dit sur stderr), comme `office.rs` (O26).
use std::fs;
use std::io::Write;
use std::ffi::OsStr;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};

const BIN: &str = env!("CARGO_BIN_EXE_roomboard-office");

/// Dossier neuf sous `temp_dir()`, retiré à la fin de la portée.
struct Scratch(PathBuf);
impl Scratch {
    fn new(name: &str) -> Self {
        let p = std::env::temp_dir().join(format!("roomboard-office-bin-{}-{name}", std::process::id()));
        let _ = fs::remove_dir_all(&p);
        fs::create_dir_all(&p).expect("dossier d'essai");
        Scratch(p)
    }
    fn cache(&self) -> PathBuf {
        self.0.join("cache")
    }
    fn root(&self) -> PathBuf {
        self.cache().join("roomboard-office")
    }
}
impl Drop for Scratch {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

fn fixture(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("tests").join("fixtures").join(name)
}

fn run(s: &Scratch, args: &[&OsStr]) -> Output {
    Command::new(BIN)
        .args(args)
        .env("XDG_CACHE_HOME", s.cache())
        .output()
        .expect("lancement de roomboard-office")
}

fn text(b: &[u8]) -> String {
    String::from_utf8_lossy(b).into_owned()
}

/// Vrai si LibreOffice est là ; sinon saut sous `ROOMBOARD_SANS_SOFFICE=1`, échec autrement.
fn soffice(s: &Scratch) -> bool {
    let out = run(s, &[OsStr::new("--check")]);
    if out.status.code() == Some(0) {
        return true;
    }
    if std::env::var("ROOMBOARD_SANS_SOFFICE").as_deref() == Ok("1") {
        let _ = std::io::stderr().write_all(b"test saute : soffice introuvable et ROOMBOARD_SANS_SOFFICE=1\n");
        return false;
    }
    panic!("soffice introuvable : installez LibreOffice, ou posez ROOMBOARD_SANS_SOFFICE=1 pour sauter ce test");
}

/// Processus vivants dont la ligne de commande contient `needle` (Linux : `/proc`) ; vide ailleurs.
fn processes_with(needle: &Path) -> Vec<String> {
    let needle = needle.to_string_lossy().into_owned();
    let Ok(rd) = fs::read_dir("/proc") else { return Vec::new() };
    rd.flatten()
        .filter(|e| e.file_name().to_string_lossy().bytes().all(|b| b.is_ascii_digit()))
        .filter_map(|e| fs::read(e.path().join("cmdline")).ok())
        .map(|c| text(&c).replace('\0', " "))
        .filter(|c| c.contains(&needle))
        .collect()
}

#[test]
fn usage_is_2() {
    let s = Scratch::new("usage");
    let out = run(&s, &[]);
    assert_eq!(out.status.code(), Some(2));
    assert!(text(&out.stderr).starts_with("usage : roomboard-office --check"), "{}", text(&out.stderr));
    let out = run(&s, &[OsStr::new("a"), OsStr::new("b"), OsStr::new("c")]);
    assert_eq!(out.status.code(), Some(2));
}

#[test]
fn check_prints_converter_and_root() {
    let s = Scratch::new("check");
    if !soffice(&s) {
        return;
    }
    let out = run(&s, &[OsStr::new("--check")]);
    let stdout = text(&out.stdout);
    let lines: Vec<&str> = stdout.lines().collect();
    assert_eq!(out.status.code(), Some(0));
    assert!(lines[0].starts_with("convertisseur : "), "{stdout}");
    assert_eq!(lines[1], format!("racine : {}", s.root().display()));
    assert!(text(&out.stderr).is_empty());
}

#[test]
fn converts_docx_then_releases_only_its_conversion() {
    let s = Scratch::new("docx");
    if !soffice(&s) {
        return;
    }
    // Conversion d'un autre processus vivant (le test lui-même) : jamais effacée par ce lancement (D51).
    let other = s.root().join("conversions").join(format!("{}-1", std::process::id()));
    fs::create_dir_all(&other).unwrap();
    let pdf = s.0.join("cours.pdf");
    let out = run(&s, &[fixture("cours.docx").as_os_str(), pdf.as_os_str()]);
    assert_eq!(out.status.code(), Some(0), "{}", text(&out.stderr));
    assert!(text(&out.stdout).starts_with(&format!("PDF : {} (", pdf.display())));
    assert!(fs::read(&pdf).unwrap().starts_with(b"%PDF-"));
    let left: Vec<String> = fs::read_dir(s.root().join("conversions"))
        .unwrap()
        .flatten()
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .collect();
    assert_eq!(left, vec![format!("{}-1", std::process::id())]);
    assert_eq!(processes_with(&s.cache()), Vec::<String>::new(), "soffice encore vivant (G4)");
}

#[test]
fn converts_pptx() {
    let s = Scratch::new("pptx");
    if !soffice(&s) {
        return;
    }
    let pdf = s.0.join("diapos.pdf");
    let out = run(&s, &[fixture("diapos.pptx").as_os_str(), pdf.as_os_str()]);
    assert_eq!(out.status.code(), Some(0), "{}", text(&out.stderr));
    assert!(fs::read(&pdf).unwrap().starts_with(b"%PDF-"));
    assert_eq!(processes_with(&s.cache()), Vec::<String>::new());
}

#[test]
fn purges_dead_conversions_at_start() {
    let s = Scratch::new("purge");
    // PID au-delà de pid_max (4 194 304 au plus sous Linux) : processus mort.
    let dead = s.root().join("conversions").join("999999999-1");
    fs::create_dir_all(&dead).unwrap();
    let _ = run(&s, &[]); // même l'usage purge : la purge précède la lecture des arguments
    assert!(!dead.exists(), "conversion morte non purgée");
}

#[test]
fn not_office_is_1_with_code_first() {
    let s = Scratch::new("notoffice");
    let txt = s.0.join("notes.docx");
    fs::write(&txt, b"pas un docx").unwrap();
    let out = run(&s, &[txt.as_os_str(), s.0.join("x.pdf").as_os_str()]);
    assert_eq!(out.status.code(), Some(1));
    assert_eq!(text(&out.stderr).trim_end(), "not-office");
    assert!(!s.0.join("x.pdf").exists());
}
```

- [ ] **Étape 3 : lancer, constater le rouge**

Run : `cd ~/projets/roomboard-wt/cli-lot4--T1 && nice -n 10 cargo test -p roomboard-shell --test office_bin -j 4 2>&1 | tail -20`
Attendu : échecs (`check_prints_converter_and_root` : pas de ligne `racine :` ; `usage_is_2` : texte d'usage ;
`purges_dead_conversions_at_start` : dossier toujours là).

- [ ] **Étape 4 : réécrire le binaire** — `crates/roomboard-shell/src/bin/roomboard-office.rs` (contenu entier)

```rust
//! Binaire `roomboard-office` (cadrage cli-lot4, D50, D51, DA16) : conversion Office → PDF en ligne de commande, par le
//! même code que la coque (`find_converter`, `convert_granted`, `release_conversion`, `purge_conversions`). Lancé par la
//! CLI (`apps/cli/src/office-node.ts`) et par `scripts/essais/c16-office-navigateur.mjs`.
//! `roomboard-office --check` : 0 « convertisseur : <chemin> » puis « racine : <racine> » ; 3 sans convertisseur.
//! `roomboard-office <entrée> <sortie.pdf>` : 0 succès, 1 échec (code de `ConvertError` en premier mot de stderr),
//! 2 usage, 3 aucun convertisseur.
//! Racine de travail : `$XDG_CACHE_HOME/roomboard-office` (absolu), sinon `$HOME/.cache/roomboard-office`, jamais
//! `temp_dir()` (partagé). Au démarrage, les conversions des processus morts sont purgées ; à la fin, seule la conversion
//! de ce lancement est libérée (une autre peut être en cours). Aucun gestionnaire de signal : LibreOffice vit dans son
//! propre groupe ; la CLI tue les restes après un Ctrl-C (D79).
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use roomboard_shell::office::{
    convert_granted, find_converter, purge_conversions, release_conversion, ConvertError, Converter, Search,
    CONVERT_TIMEOUT,
};
use roomboard_shell::GrantedPaths;

const USAGE: &str = "usage : roomboard-office --check | roomboard-office <entrée Office> <sortie.pdf>";
const NO_PROGRAM: &str = "no-program : installez LibreOffice ou Microsoft Office";

fn work_root() -> Option<PathBuf> {
    std::env::var_os("XDG_CACHE_HOME")
        .map(PathBuf::from)
        .filter(|p| p.is_absolute())
        .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".cache")))
        .map(|c| c.join("roomboard-office"))
}

fn describe(c: &Converter) -> String {
    match c {
        Converter::LibreOffice(p) => p.display().to_string(),
        #[cfg(windows)]
        Converter::MsOffice => "Microsoft Office (COM)".to_string(),
    }
}

fn check(c: Option<&Converter>, root: &Path) -> ExitCode {
    let Some(c) = c else {
        eprintln!("{NO_PROGRAM}");
        return ExitCode::from(3);
    };
    println!("convertisseur : {}", describe(c));
    println!("racine : {}", root.display());
    ExitCode::SUCCESS
}

fn convert(c: Option<&Converter>, input: &Path, output: &Path, root: &Path) -> ExitCode {
    let granted = GrantedPaths::default();
    granted.grant([input.to_path_buf()]);
    match convert_granted(&granted, input, c, root, CONVERT_TIMEOUT) {
        Ok(done) => {
            let copied = std::fs::copy(&done.pdf, output);
            release_conversion(&granted, root, &done.id);
            match copied {
                Ok(n) => {
                    println!("PDF : {} ({n} octets)", output.display());
                    ExitCode::SUCCESS
                }
                Err(e) => {
                    eprintln!("{}", ConvertError::Io(e.to_string()));
                    ExitCode::from(1)
                }
            }
        }
        Err(ConvertError::NoProgram) => {
            eprintln!("{NO_PROGRAM}");
            ExitCode::from(3)
        }
        Err(e) => {
            eprintln!("{e}");
            ExitCode::from(1)
        }
    }
}

fn main() -> ExitCode {
    let args: Vec<PathBuf> = std::env::args_os().skip(1).map(PathBuf::from).collect();
    let Some(root) = work_root() else {
        eprintln!("io : ni XDG_CACHE_HOME ni HOME");
        return ExitCode::from(1);
    };
    purge_conversions(&root);
    match args.as_slice() {
        [flag] if flag.as_os_str() == "--check" => check(find_converter(&Search::from_env()).as_ref(), &root),
        [input, output] => convert(find_converter(&Search::from_env()).as_ref(), input, output, &root),
        _ => {
            eprintln!("{USAGE}");
            ExitCode::from(2)
        }
    }
}
```

- [ ] **Étape 5 : tests verts, clippy, fmt**

Run : `nice -n 10 cargo test -p roomboard-shell --test office_bin -j 4 2>&1 | tail -15`
Attendu : `test result: ok. 6 passed; 0 failed`.
Run : `nice -n 10 cargo clippy -p roomboard-shell --all-targets -j 4 -- -D warnings 2>&1 | tail -5 && cargo fmt -p roomboard-shell --check && echo FMT-OK`
Attendu : aucune ligne `warning:`/`error`, puis `FMT-OK` (sinon `cargo fmt -p roomboard-shell` et relancer).
Run : `nice -n 10 cargo test -p roomboard-shell -j 4 2>&1 | grep "test result" ` — toutes les lignes `ok` (garde : tests de
`office.rs`, dont `real_libreoffice_converts_docx_pptx_xlsx`, et `coque_c16.rs`).

- [ ] **Étape 6 : `verifier.sh` construit le binaire avant la CLI (D53)** — `scripts/verifier.sh`, remplacer

```bash
pnpm --filter @roomboard/cli build
node scripts/essais/cli-essai.mjs
```
par
```bash
# cli-lot4 (D53, D55) : binaire de conversion Office lu par la CLI dans target/debug/.
cargo build -p roomboard-shell --bin roomboard-office
pnpm --filter @roomboard/cli build
node scripts/essais/cli-essai.mjs
```

- [ ] **Étape 7 : l'essai C16 appelle le binaire** — `scripts/essais/c16-office-navigateur.mjs`

Ligne 6 : `convertir_office de roomboard-shell` → `roomboard-office de roomboard-shell`. Ligne 95 : `(exemple
convertir_office)` → `(binaire roomboard-office)`. Lignes 97-98 :
```js
    const run = spawnSync("cargo", ["run", "-q", "-p", "roomboard-shell", "--bin", "roomboard-office", "--", join(FIX, "diapos.pptx"), pdfPath], { cwd: ROOT, encoding: "utf8" });
    if (run.status !== 0) throw new Echec(`roomboard-office : code ${run.status} ; ${run.stderr}`);
```
Run : `grep -c convertir_office scripts/essais/c16-office-navigateur.mjs` → `0` ; `node --check scripts/essais/c16-office-navigateur.mjs && echo OK`.

- [ ] **Étape 8 : commit**

```bash
git add crates/roomboard-shell/src/bin/roomboard-office.rs crates/roomboard-shell/examples/convertir_office.rs crates/roomboard-shell/tests/office_bin.rs scripts/verifier.sh scripts/essais/c16-office-navigateur.mjs
git commit --author "jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(shell): roomboard-office binary (check with work root, purge at start, own conversion released)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t2"></a>
### Tâche T2 — `image-size.ts`, `probeSize` étendu, fabriques d'images

**Objectif :** lire dans l'en-tête la taille des images GIF, WebP (VP8, VP8L, VP8X), BMP (info et core, hauteur négative),
ICO (plus grande entrée, 0 = 256), AVIF et HEIC (`ispe` de l'élément principal `pitm`/`ipma`, sinon le plus grand),
SVG (taille du navigateur) ; `probeSize` les appelle, ce qui donne à la page le refus > 100 Mpx avant décodage pour ces
formats (D66) et à la CLI (`nodeDecode`) leur taille. Cadrage : D63, D64, D66, DA19, H39, H43 ; S5.

**Fichiers :**
- Créer : `apps/web/src/platform/image-size.ts`, `apps/web/src/platform/image-size.test.ts`
- Créer : `scripts/essais/fabriques/images.mjs`, `scripts/essais/fabriques/images.d.mts`
- Modifier : `apps/web/src/platform/image-import.ts:3,100-109` (commentaire de tête, `probeSize`)
- Modifier : `apps/web/src/platform/image-import.test.ts:82-86` (bloc `probeSize`), ajout d'un test D66

**Interfaces :**
- Consomme : rien d'une autre tâche.
- Réutilise (étendu) : `apps/web/src/platform/image-import.ts:100` — `probeSize(blob: Blob, kind: ImageKind): Promise<{ readonly w: number; readonly h: number } | null>`
- Réutilise : `apps/web/src/platform/image-import.ts:51` — `sniffImage(head, name)` (les tests vérifient que chaque fabrique est reconnue)
- Produit :
  ```ts
  // apps/web/src/platform/image-size.ts
  export type HeaderKind = Exclude<ImageKind, "png" | "jpeg">;
  export interface IsoBox { readonly type: string; readonly start: number; readonly end: number } // start : début du contenu
  export function isoBoxes(b: Uint8Array, from: number, to: number): Generator<IsoBox>; // lu aussi par media-header.ts (T5)
  export function headerSize(bytes: Uint8Array, kind: HeaderKind): { readonly w: number; readonly h: number } | null;
  // scripts/essais/fabriques/images.mjs (lu par T7, T8)
  export function gif(w: number, h: number): Uint8Array;
  export function webp(chunk: "VP8 " | "VP8L" | "VP8X", w: number, h: number): Uint8Array;
  export function bmp(w: number, h: number, opts?: { core?: boolean; topDown?: boolean }): Uint8Array;
  export function ico(sizes: ReadonlyArray<readonly [number, number]>): Uint8Array;
  export function heif(brand: "avif" | "heic", w: number, h: number, opts?: { pitm?: boolean }): Uint8Array;
  export function svg(attrs: string): Uint8Array;
  ```

**Contraintes (recopiées de Global Constraints) :**
- G1 — TDD : test rouge d'abord. Aucun test désactivé ni sauté, aucun seuil baissé ou relevé, aucun délai de test
  existant relevé ; un test qui échoue sur un délai est rejoué une fois.
- G2 — VM partagée : tests en `nice -n 10` ; avant toute commande : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- G5 — Fichiers d'essai fabriqués par le code (`images.mjs`) ; aucun fichier téléchargé ; rien de
  `~/telechargements-roomboard/`.
- G6 — Aucun crate Wasm touché ; tailles Wasm inchangées.
- G7 — Aucune dépendance ajoutée ; aucune AGPL/GPL/LGPL ; aucune installation de paquet système.
- G8 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais terminés par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un ; jamais `--force`.
- G12 — Worktree isolé neuf : `cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r
  /home/adminjd/projets/roomboard-wt/cli-lot4/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot4/apps/web/src/wasm-formats
  apps/web/src/`.
- G14 — Ne pas toucher `ImageTarget` (`image-import.ts:244`) ; aucun import neuf entre `import.ts` et `office-import.ts`.
- G15 — Coupe H48 à 07:30 : AVIF/HEIC laissés de côté si leur lecteur n'est pas vert (raison au rapport ; T7 l'écrit
  dans `FORMAT_LOTS`).

**Interdits :** décoder une image ; lire `irot` (H43) ; toucher `imageHandler` (D66 vient de `probeSize` seul) ; changer
`sniffImage`.

**Terminé quand :** `image-size.test.ts` et `image-import.test.ts` verts ; chaque fabrique reconnue par `sniffImage` et
mesurée par `probeSize` ; GIF 20 000 × 20 000 refusé sans appel au décodeur. Rapport : `Réutilisation : appelé
probeSize (étendu), sniffImage`.

**Étapes :**

- [ ] **Étape 1 : fabriques** — `scripts/essais/fabriques/images.mjs`

```js
// Fabriques des images d'essai (cadrage cli-lot4, D70) : en-têtes GIF, WebP, BMP, ICO, AVIF, HEIC et SVG écrits par le code,
// aucun fichier téléchargé. Seul l'en-tête compte (la CLI ne décode pas) ; le reste est un remplissage court. Lues par les
// tests de apps/web et apps/cli, par cli-essai.mjs et par objets.mjs.
const enc = (s) => new TextEncoder().encode(s);
const cat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
};
const le16 = (v) => Uint8Array.of(v & 0xff, (v >>> 8) & 0xff);
const le24 = (v) => Uint8Array.of(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff);
const le32 = (v) => Uint8Array.of(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
const be16 = (v) => Uint8Array.of((v >>> 8) & 0xff, v & 0xff);
const be32 = (v) => Uint8Array.of((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);

/** GIF89a w × h : écran logique, une image 1 × 1, fin. */
export const gif = (w, h) =>
  cat(enc("GIF89a"), le16(w), le16(h), Uint8Array.of(0, 0, 0), enc(","), le16(0), le16(0), le16(1), le16(1), Uint8Array.of(0, 2, 2, 0x4c, 0x01, 0), enc(";"));

/** WebP w × h, chunk `VP8 ` (avec perte), `VP8L` (sans perte) ou `VP8X` (étendu). */
export function webp(chunk, w, h) {
  let body;
  if (chunk === "VP8 ") body = cat(Uint8Array.of(0x10, 0x02, 0x00, 0x9d, 0x01, 0x2a), le16(w), le16(h));
  else if (chunk === "VP8L") body = cat(Uint8Array.of(0x2f), le32(((w - 1) & 0x3fff) | (((h - 1) & 0x3fff) << 14)), Uint8Array.of(0));
  else body = cat(Uint8Array.of(0, 0, 0, 0), le24(w - 1), le24(h - 1));
  const size = chunk === "VP8L" ? 5 : body.length; // VP8L : 5 octets utiles, un octet de bourrage (taille impaire)
  const c = cat(enc(chunk), le32(size), body);
  return cat(enc("RIFF"), le32(4 + c.length), enc("WEBP"), c);
}

/** BMP w × h : en-tête info (40 octets, hauteur négative si `topDown`) ou core (12 octets). */
export function bmp(w, h, { core = false, topDown = false } = {}) {
  const dib = core
    ? cat(le32(12), le16(w), le16(h), le16(1), le16(24))
    : cat(le32(40), le32(w), le32(topDown ? -h : h), le16(1), le16(24), le32(0), le32(0), le32(2835), le32(2835), le32(0), le32(0));
  const pixels = new Uint8Array(4);
  return cat(enc("BM"), le32(14 + dib.length + pixels.length), le16(0), le16(0), le32(14 + dib.length), dib, pixels);
}

/** ICO aux entrées `[w, h]` (256 écrit 0) ; contenu factice de 4 octets par entrée. */
export function ico(sizes) {
  const data = Uint8Array.of(0x89, 0x50, 0x4e, 0x47);
  const entries = sizes.map(([w, h], i) =>
    cat(Uint8Array.of(w >= 256 ? 0 : w, h >= 256 ? 0 : h, 0, 0), le16(1), le16(32), le32(data.length), le32(6 + 16 * sizes.length + i * data.length)),
  );
  return cat(le16(0), le16(1), le16(sizes.length), ...entries, ...sizes.map(() => data));
}

const box = (type, ...parts) => {
  const body = cat(...parts);
  return cat(be32(8 + body.length), enc(type), body);
};
const full = (type, version, flags, ...parts) => box(type, Uint8Array.of(version, (flags >>> 16) & 0xff, (flags >>> 8) & 0xff, flags & 0xff), ...parts);

/**
 * AVIF (`avif`) ou HEIC (`heic`) : `ftyp`, puis `meta` avec `pitm` (élément 1, sauf `pitm: false`), `ipco` (`ispe` 64 × 64
 * de la vignette, puis `ispe` w × h) et `ipma` (élément 2 → propriété 1, élément 1 → propriété 2) : la taille lue est
 * celle de l'élément principal, ni la première ni (si w × h < 64 × 64) la plus grande.
 */
export function heif(brand, w, h, { pitm = true } = {}) {
  const ispe = (a, b) => full("ispe", 0, 0, be32(a), be32(b));
  const meta = full(
    "meta",
    0,
    0,
    full("hdlr", 0, 0, be32(0), enc("pict"), new Uint8Array(12), Uint8Array.of(0)),
    ...(pitm ? [full("pitm", 0, 0, be16(1))] : []),
    box("iprp", box("ipco", ispe(64, 64), ispe(w, h)), full("ipma", 0, 0, be32(2), be16(2), Uint8Array.of(1, 0x81), be16(1), Uint8Array.of(1, 0x82))),
  );
  return cat(box("ftyp", enc(brand), be32(0), enc("mif1"), enc(brand)), meta, box("mdat", new Uint8Array(4)));
}

/** SVG dont la balise racine porte `attrs` (ex. `width="40" height="30"`, `viewBox="0 0 400 100"`). */
export const svg = (attrs) => enc(`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" ${attrs}><rect width="10" height="10" fill="red"/></svg>\n`);
```

`scripts/essais/fabriques/images.d.mts` :

```ts
// Types des fabriques d'images (cadrage cli-lot4, D70), `images.mjs`.
export function gif(w: number, h: number): Uint8Array;
export function webp(chunk: "VP8 " | "VP8L" | "VP8X", w: number, h: number): Uint8Array;
export function bmp(w: number, h: number, opts?: { readonly core?: boolean; readonly topDown?: boolean }): Uint8Array;
export function ico(sizes: ReadonlyArray<readonly [number, number]>): Uint8Array;
export function heif(brand: "avif" | "heic", w: number, h: number, opts?: { readonly pitm?: boolean }): Uint8Array;
export function svg(attrs: string): Uint8Array;
```

- [ ] **Étape 2 : tests rouges** — `apps/web/src/platform/image-size.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { bmp, gif, heif, ico, svg, webp } from "../../../../scripts/essais/fabriques/images.mjs";
import { probeSize, sniffImage } from "./image-import";
import { headerSize, isoBoxes } from "./image-size";

const text = (s: string): Uint8Array => new TextEncoder().encode(s);
const svgOf = (attrs: string) => headerSize(svg(attrs), "svg");

describe("headerSize (cli-lot4, D63, DA19)", () => {
  it("headerSize — GIF : écran logique", () => expect(headerSize(gif(320, 200), "gif")).toEqual({ w: 320, h: 200 }));
  it("headerSize — WebP VP8, VP8L, VP8X", () => {
    expect(headerSize(webp("VP8 ", 640, 480), "webp")).toEqual({ w: 640, h: 480 });
    expect(headerSize(webp("VP8L", 300, 7), "webp")).toEqual({ w: 300, h: 7 });
    expect(headerSize(webp("VP8X", 5000, 3000), "webp")).toEqual({ w: 5000, h: 3000 });
  });
  it("headerSize — BMP info, hauteur négative (de haut en bas), core", () => {
    expect(headerSize(bmp(33, 21), "bmp")).toEqual({ w: 33, h: 21 });
    expect(headerSize(bmp(33, 21, { topDown: true }), "bmp")).toEqual({ w: 33, h: 21 });
    expect(headerSize(bmp(12, 9, { core: true }), "bmp")).toEqual({ w: 12, h: 9 });
  });
  it("headerSize — ICO : plus grande entrée, 0 = 256", () => {
    expect(headerSize(ico([[16, 16], [48, 48], [32, 32]]), "ico")).toEqual({ w: 48, h: 48 });
    expect(headerSize(ico([[16, 16], [256, 256]]), "ico")).toEqual({ w: 256, h: 256 });
  });
  it("headerSize — AVIF et HEIC : ispe de l'élément principal (pitm, ipma), pas le plus grand", () => {
    expect(headerSize(heif("avif", 40, 30), "avif")).toEqual({ w: 40, h: 30 });
    expect(headerSize(heif("heic", 4032, 3024), "heic")).toEqual({ w: 4032, h: 3024 });
  });
  it("headerSize — AVIF sans pitm : le plus grand ispe", () => expect(headerSize(heif("avif", 40, 30, { pitm: false }), "avif")).toEqual({ w: 64, h: 64 }));
  it("headerSize — SVG width/height absolus, unités (D64)", () => {
    expect(svgOf('width="40" height="30"')).toEqual({ w: 40, h: 30 });
    expect(svgOf('width="40px" height="30px"')).toEqual({ w: 40, h: 30 });
    expect(svgOf('width="1in" height="72pt"')).toEqual({ w: 96, h: 96 });
    expect(svgOf('width="2.54cm" height="25.4mm"')).toEqual({ w: 96, h: 96 });
    expect(svgOf('width="1pc" height="2em"')).toEqual({ w: 16, h: 32 });
  });
  it("headerSize — SVG viewBox seul : 300 de large (S5 : vb.svg 400 × 100 → 300 × 75)", () =>
    expect(svgOf('viewBox="0 0 400 100"')).toEqual({ w: 300, h: 75 }));
  it("headerSize — SVG sans dimension ni viewBox : 300 × 150 (H39)", () => expect(svgOf("")).toEqual({ w: 300, h: 150 }));
  it("headerSize — SVG une seule dimension : l'autre par le viewBox, sinon défaut du navigateur", () => {
    expect(svgOf('width="200" viewBox="0,0,400,100"')).toEqual({ w: 200, h: 50 });
    expect(svgOf('height="50" viewBox="0 0 400 100"')).toEqual({ w: 200, h: 50 });
    expect(svgOf('width="200"')).toEqual({ w: 200, h: 150 });
    expect(svgOf('height="50"')).toEqual({ w: 300, h: 50 });
  });
  it("RF5 — SVG à 100 % et viewBox, SVG en em : taille du navigateur", () => {
    expect(svgOf('width="100%" height="100%" viewBox="0 0 400 200"')).toEqual({ w: 300, h: 150 });
    expect(svgOf('width="10em" height="5em"')).toEqual({ w: 160, h: 80 });
  });
  it("headerSize — en-têtes illisibles : null", () => {
    expect(headerSize(text("GIF89a"), "gif")).toBeNull();
    expect(headerSize(text("RIFF\0\0\0\0WEBPVP8 "), "webp")).toBeNull();
    expect(headerSize(text("BM"), "bmp")).toBeNull();
    expect(headerSize(Uint8Array.of(0, 0, 1, 0, 0, 0), "ico")).toBeNull();
    expect(headerSize(heif("avif", 40, 30).subarray(0, 24), "avif")).toBeNull();
    expect(headerSize(text("<html><body>pas un svg</body></html>"), "svg")).toBeNull();
    expect(headerSize(gif(0, 10), "gif")).toBeNull();
  });
  it("RF1 — chaque préfixe d'une image fabriquée : taille ou null, jamais d'exception", () => {
    const all: Array<[Uint8Array, "gif" | "webp" | "bmp" | "ico" | "avif" | "svg"]> = [
      [gif(3, 4), "gif"], [webp("VP8X", 3, 4), "webp"], [bmp(3, 4), "bmp"], [ico([[3, 4]]), "ico"], [heif("avif", 3, 4), "avif"], [svg('width="3" height="4"'), "svg"],
    ];
    for (const [bytes, kind] of all) for (let n = 0; n <= bytes.length; n++) expect(() => headerSize(bytes.subarray(0, n), kind)).not.toThrow();
  });
  it("isoBoxes — boîtes d'un fichier HEIF ; boîte trop longue rendue jusqu'à la fin puis arrêt", () => {
    const b = heif("heic", 8, 8);
    expect([...isoBoxes(b, 0, b.length)].map((x) => x.type)).toEqual(["ftyp", "meta", "mdat"]);
    expect([...isoBoxes(b, 0, 20)].map((x) => [x.type, x.end])).toEqual([["ftyp", 20]]);
  });
  it("chaque fabrique est reconnue par sniffImage et mesurée par probeSize (D63)", async () => {
    const cases: Array<[Uint8Array, string, string, { w: number; h: number }]> = [
      [gif(320, 200), "i.gif", "gif", { w: 320, h: 200 }],
      [webp("VP8 ", 64, 48), "i.webp", "webp", { w: 64, h: 48 }],
      [bmp(33, 21), "i.bmp", "bmp", { w: 33, h: 21 }],
      [ico([[48, 48]]), "i.ico", "ico", { w: 48, h: 48 }],
      [heif("avif", 120, 80), "i.avif", "avif", { w: 120, h: 80 }],
      [heif("heic", 120, 80), "i.heic", "heic", { w: 120, h: 80 }],
      [svg('width="40" height="30"'), "i.svg", "svg", { w: 40, h: 30 }],
    ];
    for (const [bytes, name, kind, size] of cases) {
      expect(sniffImage(bytes.subarray(0, 4096), name), name).toBe(kind);
      expect(await probeSize(new Blob([bytes as BlobPart]), kind as never), name).toEqual(size);
    }
  });
});
```

Dans `apps/web/src/platform/image-import.test.ts`, remplacer la ligne 85
(`it("autres formats : null (contrôlés après décodage)", …)`) et le titre du bloc (l. 82) :

```ts
describe("probeSize (R15, cli-lot4 D63 : en-tête de tous les formats)", () => {
  it("PNG : IHDR", async () => expect(await probeSize(new Blob([pngHead(640, 480)]), "png")).toEqual({ w: 640, h: 480 }));
  it("JPEG : premier SOFn après APP0", async () => expect(await probeSize(new Blob([jpeg(640, 480)]), "jpeg")).toEqual({ w: 640, h: 480 }));
  it("GIF tronqué : null (taille illisible)", async () => expect(await probeSize(new Blob([bytes("GIF89a")]), "gif")).toBeNull());
  it("GIF : écran logique (D63)", async () => expect(await probeSize(new Blob([bytes("GIF89a", [0x40, 0x01, 0xc8, 0x00, 0, 0, 0])]), "gif")).toEqual({ w: 320, h: 200 }));
```

(garder la ligne suivante, `jpegSize`… le cas échéant, et l'accolade de fin du bloc), puis ajouter à la fin du fichier :

```ts
describe("D66 (cli-lot4) — refus avant décodage pour les formats lus dans l'en-tête", () => {
  it("GIF 20 000 × 20 000 : refusé avant décodage, même message TOO_MANY_PIXELS", async () => {
    const head = bytes("GIF89a", [0x20, 0x4e, 0x20, 0x4e, 0, 0, 0]);
    const decode = vi.fn(async () => ({ bitmap: { close() {} } as unknown as ImageBitmap, w: 1, h: 1 }));
    const notify = vi.fn(async () => {});
    const target = {
      assets: { put: vi.fn(async () => "sha") },
      page: () => "p",
      camera: () => IDENTITY,
      stageRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
      run: vi.fn(() => null),
    };
    const out = await imageHandler({ decode }).run({ name: "g.gif" } as never, { blob: new Blob([head]), head, at: null, inserted: 0, target, notify } as never);
    expect(out).toBe("failed");
    expect(decode).not.toHaveBeenCalled();
    expect(target.assets.put).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(`g.gif : ${TOO_MANY_PIXELS}`);
  });
});
```

et ajouter `TOO_MANY_PIXELS` à l'import de `./image-import` (l. 3-16).

- [ ] **Étape 3 : rouge**

Run : `cd ~/projets/roomboard-wt/cli-lot4--T2 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/image-size.test.ts src/platform/image-import.test.ts 2>&1 | tail -15`
Attendu : `image-size.test.ts` échoue (module absent) ; « GIF : écran logique » et D66 échouent.

- [ ] **Étape 4 : le module** — `apps/web/src/platform/image-size.ts`

```ts
/**
 * Tailles d'images lues dans l'en-tête (cadrage cli-lot4, D63, D64, DA19) : GIF, WebP (VP8, VP8L, VP8X), BMP (info et
 * core), ICO (plus grande entrée), AVIF et HEIC (`ispe` de l'élément principal), SVG (taille que le navigateur donne).
 * Lecteurs purs, sans DOM ni décodeur, appelés par `probeSize` (page, CLI, tableaux blancs) ; null : illisible.
 * H43 : rotation `irot` non appliquée.
 */
import type { ImageKind } from "./image-decode";

export type HeaderKind = Exclude<ImageKind, "png" | "jpeg">;
type Size = { readonly w: number; readonly h: number };

const at = (b: Uint8Array, i: number): number => b[i] ?? 0;
const ascii = (b: Uint8Array, from: number, to: number): string => {
  let s = "";
  for (let i = from; i < to && i < b.length; i++) s += String.fromCharCode(at(b, i));
  return s;
};
const u16le = (b: Uint8Array, i: number): number => at(b, i) | (at(b, i + 1) << 8);
const u24le = (b: Uint8Array, i: number): number => u16le(b, i) | (at(b, i + 2) << 16);
const u32le = (b: Uint8Array, i: number): number => (u24le(b, i) | (at(b, i + 3) << 24)) >>> 0;
const i32le = (b: Uint8Array, i: number): number => u24le(b, i) | (at(b, i + 3) << 24);
const u16be = (b: Uint8Array, i: number): number => (at(b, i) << 8) | at(b, i + 1);
const u32be = (b: Uint8Array, i: number): number => ((at(b, i) << 24) | (at(b, i + 1) << 16) | (at(b, i + 2) << 8) | at(b, i + 3)) >>> 0;
const sized = (w: number, h: number): Size | null => (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 ? { w, h } : null);

function gifSize(b: Uint8Array): Size | null {
  return b.length < 10 ? null : sized(u16le(b, 6), u16le(b, 8));
}

function webpSize(b: Uint8Array): Size | null {
  if (b.length < 30 || ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 12) !== "WEBP") return null;
  const chunk = ascii(b, 12, 16);
  if (chunk === "VP8 ") {
    if (at(b, 23) !== 0x9d || at(b, 24) !== 0x01 || at(b, 25) !== 0x2a) return null;
    return sized(u16le(b, 26) & 0x3fff, u16le(b, 28) & 0x3fff);
  }
  if (chunk === "VP8L") {
    if (at(b, 20) !== 0x2f) return null;
    const v = u32le(b, 21);
    return sized((v & 0x3fff) + 1, ((v >>> 14) & 0x3fff) + 1);
  }
  if (chunk === "VP8X") return sized(u24le(b, 24) + 1, u24le(b, 27) + 1);
  return null;
}

function bmpSize(b: Uint8Array): Size | null {
  if (b.length < 26 || ascii(b, 0, 2) !== "BM") return null;
  const dib = u32le(b, 14);
  if (dib === 12) return sized(u16le(b, 18), u16le(b, 20));
  return dib >= 40 ? sized(Math.abs(i32le(b, 18)), Math.abs(i32le(b, 22))) : null;
}

function icoSize(b: Uint8Array): Size | null {
  if (b.length < 6 || u16le(b, 0) !== 0 || u16le(b, 2) !== 1) return null;
  let best: Size | null = null;
  for (let i = 0; i < u16le(b, 4); i++) {
    const e = 6 + 16 * i;
    if (e + 16 > b.length) break;
    const w = at(b, e) || 256;
    const h = at(b, e + 1) || 256;
    if (best === null || w * h > best.w * best.h) best = { w, h };
  }
  return best;
}

export interface IsoBox {
  readonly type: string;
  /** Début du contenu (après la taille, le type et la taille longue éventuelle). */
  readonly start: number;
  readonly end: number;
}

/** Boîtes ISO (ISOBMFF) de `b` entre `from` et `to` ; une boîte qui dépasse `to` est rendue jusqu'à `to` (en-tête
 *  tronqué), puis le parcours s'arrête ; taille 0 : jusqu'à `to`. */
export function* isoBoxes(b: Uint8Array, from: number, to: number): Generator<IsoBox> {
  let i = from;
  while (i + 8 <= to) {
    let size = u32be(b, i);
    const type = ascii(b, i + 4, i + 8);
    let head = 8;
    if (size === 1) {
      if (i + 16 > to) return;
      size = u32be(b, i + 8) * 2 ** 32 + u32be(b, i + 12);
      head = 16;
    } else if (size === 0) size = to - i;
    if (size < head) return;
    if (i + size > to) {
      yield { type, start: i + head, end: to };
      return;
    }
    yield { type, start: i + head, end: i + size };
    i += size;
  }
}

const childOf = (b: Uint8Array, parent: IsoBox, type: string, skip = 0): IsoBox | null => {
  for (const x of isoBoxes(b, parent.start + skip, parent.end)) if (x.type === type) return x;
  return null;
};

/** AVIF, HEIC : `ispe` associé à l'élément principal (`pitm`, `ipma`), sinon le plus grand `ispe`. */
function heifSize(b: Uint8Array): Size | null {
  let meta: IsoBox | null = null;
  for (const x of isoBoxes(b, 0, b.length)) if (x.type === "meta") meta = x;
  if (meta === null) return null;
  const pitm = childOf(b, meta, "pitm", 4); // `meta` est une boîte pleine : version et drapeaux d'abord
  const iprp = childOf(b, meta, "iprp", 4);
  const ipco = iprp === null ? null : childOf(b, iprp, "ipco");
  if (iprp === null || ipco === null) return null;
  const props = [...isoBoxes(b, ipco.start, ipco.end)];
  const ispeOf = (p: IsoBox | undefined): Size | null =>
    p !== undefined && p.type === "ispe" && p.end - p.start >= 12 ? sized(u32be(b, p.start + 4), u32be(b, p.start + 8)) : null;
  const ipma = childOf(b, iprp, "ipma");
  if (pitm !== null && ipma !== null) {
    const primary = at(b, pitm.start) === 0 ? u16be(b, pitm.start + 4) : u32be(b, pitm.start + 4);
    const version = at(b, ipma.start);
    const wide = (at(b, ipma.start + 3) & 1) === 1;
    let i = ipma.start + 8;
    const count = u32be(b, ipma.start + 4);
    for (let e = 0; e < count && i < ipma.end; e++) {
      const item = version < 1 ? u16be(b, i) : u32be(b, i);
      i += version < 1 ? 2 : 4;
      const n = at(b, i);
      i += 1;
      for (let k = 0; k < n; k++) {
        const index = wide ? u16be(b, i) & 0x7fff : at(b, i) & 0x7f;
        i += wide ? 2 : 1;
        if (item === primary) {
          const s = ispeOf(props[index - 1]);
          if (s !== null) return s;
        }
      }
    }
  }
  let best: Size | null = null;
  for (const p of props) {
    const s = ispeOf(p);
    if (s !== null && (best === null || s.w * s.h > best.w * best.h)) best = s;
  }
  return best;
}

/** Unités absolues en px CSS (D64) ; `em` = 16 px. */
const UNITS: Readonly<Record<string, number>> = Object.freeze({ "": 1, px: 1, pt: 4 / 3, pc: 16, in: 96, cm: 96 / 2.54, mm: 96 / 25.4, em: 16 });

function lengthOf(v: string | undefined): number | null {
  if (v === undefined) return null;
  const m = /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*([a-z]*)\s*$/i.exec(v);
  if (m === null) return null;
  const unit = (m[2] ?? "").toLowerCase();
  if (!Object.hasOwn(UNITS, unit)) return null;
  const n = Number(m[1]) * (UNITS[unit] ?? Number.NaN);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function attributesOf(tag: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of tag.matchAll(/([A-Za-z_:][-\w:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) out.set((m[1] ?? "").toLowerCase(), m[2] ?? m[3] ?? "");
  return out;
}

/**
 * Taille d'un SVG comme le navigateur la donne (D64, mesures Chrome 151) : `width` et `height` absolus ; une seule
 * dimension : l'autre par le `viewBox`, sinon le défaut du navigateur (300 de large, 150 de haut) ; aucune : `viewBox` →
 * 300 × 300·h/w, sinon 300 × 150. `%` n'est pas absolu. Arrondi au pixel.
 */
function svgSize(b: Uint8Array): Size | null {
  const m = /<svg(?=[\s>/])([^>]*)>/i.exec(new TextDecoder("utf-8").decode(b));
  if (m === null) return null;
  const a = attributesOf(m[1] ?? "");
  const w = lengthOf(a.get("width"));
  const h = lengthOf(a.get("height"));
  const vb = (a.get("viewbox") ?? "").trim().split(/[\s,]+/).map(Number);
  const vw = vb[2] ?? 0;
  const vh = vb[3] ?? 0;
  const ratio = vb.length === 4 && vb.every(Number.isFinite) && vw > 0 && vh > 0 ? vh / vw : null;
  let size: [number, number];
  if (w !== null && h !== null) size = [w, h];
  else if (w !== null) size = [w, ratio === null ? 150 : w * ratio];
  else if (h !== null) size = [ratio === null ? 300 : h / ratio, h];
  else size = ratio === null ? [300, 150] : [300, 300 * ratio];
  return sized(Math.max(1, Math.round(size[0])), Math.max(1, Math.round(size[1])));
}

/** Taille lue dans l'en-tête de `bytes` (le premier Mio suffit) ; null : illisible. */
export function headerSize(bytes: Uint8Array, kind: HeaderKind): Size | null {
  switch (kind) {
    case "gif":
      return gifSize(bytes);
    case "webp":
      return webpSize(bytes);
    case "bmp":
      return bmpSize(bytes);
    case "ico":
      return icoSize(bytes);
    case "avif":
    case "heic":
      return heifSize(bytes);
    case "svg":
      return svgSize(bytes);
  }
}
```

Note : `gif(0, 10)` du test « illisibles » rend null par `sized` ; `ico` à entrée 0 × 0 vaut 256 × 256 (règle du format).

- [ ] **Étape 5 : `probeSize` délègue** — `apps/web/src/platform/image-import.ts`

Ajouter l'import `import { headerSize } from "./image-size";` (après l'import de `./image-decode`). Remplacer le
commentaire et la dernière ligne de `probeSize` (l. 99-109) :

```ts
/** Taille lue dans l'en-tête, avant tout décodage (R15) : PNG (IHDR), JPEG (SOFn), puis (cli-lot4, D63) GIF, WebP, BMP,
 *  ICO, AVIF, HEIC et SVG par `headerSize` sur le premier Mio ; null : illisible. */
export async function probeSize(blob: Blob, kind: ImageKind): Promise<{ readonly w: number; readonly h: number } | null> {
  if (kind === "png") {
    const h = new Uint8Array(await blob.slice(0, 24).arrayBuffer());
    if (h.length < 24 || ascii(h, 12, 16) !== "IHDR") return null;
    const v = new DataView(h.buffer, h.byteOffset, h.byteLength);
    return { w: v.getUint32(16), h: v.getUint32(20) };
  }
  if (kind === "jpeg") return jpegSize(new Uint8Array(await blob.slice(0, JPEG_SCAN).arrayBuffer()));
  return headerSize(new Uint8Array(await blob.slice(0, JPEG_SCAN).arrayBuffer()), kind);
}
```

et, dans le commentaire de tête (l. 2), `taille lue dans l'en-tête (PNG, JPEG seulement, R15)` → `taille lue dans
l'en-tête (R15 ; tous les formats depuis cli-lot4, D63)`. `JPEG_SCAN` (1 Mio, l. 35) sert aux deux lectures.

- [ ] **Étape 6 : vert, et garde de la page**

Run : `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/image-size.test.ts src/platform/image-import.test.ts 2>&1 | tail -15`
Attendu : `Test Files  2 passed`.
Run : `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform src/app 2>&1 | tail -8` — aucun `FAIL ` (garde :
`media-import.test.ts`, `import.test.ts`, `board-io` des tableaux).
Run : `nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | tail -5` — aucune erreur.

- [ ] **Étape 7 : commit**

```bash
git add apps/web/src/platform/image-size.ts apps/web/src/platform/image-size.test.ts apps/web/src/platform/image-import.ts apps/web/src/platform/image-import.test.ts scripts/essais/fabriques/images.mjs scripts/essais/fabriques/images.d.mts
git commit --author "jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(web): image sizes read from headers (GIF, WebP, BMP, ICO, AVIF, HEIC, SVG)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t3"></a>
### Tâche T3 — `media-header.ts` (MP4/MOV/M4A, WebM, WAV, Ogg, MP3), fabriques de médias

**Objectif :** lire dans l'en-tête la durée (et la taille d'une vidéo) des médias que le produit accepte : MP4, MOV,
M4A, M4V (`mvhd`, `tkhd` de la première piste vidéo), WebM (`Info`, `Tracks`, sinon dernier `Cluster` + dernier bloc),
WAV (`fmt `, `data`), Ogg (Vorbis, Opus, Theora : dernière granule), MP3 (`Xing`/`Info`/`VBRI`, sinon débit constant
du premier cadre). Module pur à côté de `sniffMedia` ; la page n'en dépend pas. Cadrage : D61, D62, DA18, H42 ; S3.

**Fichiers :**
- Créer : `apps/web/src/platform/media-header.ts`, `apps/web/src/platform/media-header.test.ts`
- Créer : `scripts/essais/fabriques/medias.mjs`, `scripts/essais/fabriques/medias.d.mts`

**Interfaces :**
- Consomme : rien d'une autre tâche (T5 remplacera le parcours local `isoBoxes` par celui de `image-size.ts`, même
  signature : garder le nom et la forme ci-dessous).
- Réutilise : `apps/web/src/platform/media-import.ts:68` — `sniffMedia(head, name): MediaSniff | null` (les tests
  vérifient que chaque fabrique est reconnue au bon format) ; `MediaFormat` (`media-import.ts:13`, import de type).
- Produit :
  ```ts
  // apps/web/src/platform/media-header.ts
  export interface MediaHeader { readonly duration: number; readonly width: number; readonly height: number } // s (au ms) ; 0 × 0 : son
  export function readMediaHeader(bytes: Uint8Array, format: MediaFormat): MediaHeader | null; // null : durée illisible
  // scripts/essais/fabriques/medias.mjs (lu par T5, T7, T8)
  export function wav(seconds: number, rate?: number): Uint8Array;                       // PCM 16 bits mono, 8 kHz par défaut
  export function mp4(o: { duration: number; timescale?: number; width?: number; height?: number; brand?: string; moovLast?: boolean; version1?: boolean }): Uint8Array;
  export function mp4Broken(): Uint8Array;                                               // `ftyp` sans `moov` (casse.mp4)
  export function webm(o: { duration: number | null; width?: number; height?: number; clusters?: number[]; lastBlock?: number }): Uint8Array;
  export function ogg(o: { codec: "vorbis" | "opus" | "theora" | "flac"; granule: number; rate?: number; preSkip?: number; width?: number; height?: number; frn?: number; frd?: number; shift?: number }): Uint8Array;
  export function mp3(o: { frames: number; kbps?: number; xing?: boolean; id3?: boolean }): Uint8Array;
  ```

**Contraintes (recopiées de Global Constraints) :**
- G1 — TDD : test rouge d'abord. Aucun test désactivé ni sauté, aucun seuil baissé ou relevé, aucun délai de test
  existant relevé ; un test qui échoue sur un délai est rejoué une fois.
- G2 — VM partagée : tests en `nice -n 10` ; avant toute commande : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- G5 — Fichiers d'essai fabriqués par le code (`medias.mjs`, sur le modèle de `c14-media-navigateur.mjs:24-55`, qui n'est
  pas touché) ; aucun fichier téléchargé ; rien de `~/telechargements-roomboard/`.
- G6 — Aucun crate Wasm touché ; tailles Wasm inchangées.
- G7 — Aucune dépendance ajoutée ; aucune AGPL/GPL/LGPL ; aucune installation de paquet système.
- G8 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais terminés par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un ; jamais `--force`.
- G12 — Worktree isolé neuf : `cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r
  /home/adminjd/projets/roomboard-wt/cli-lot4/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot4/apps/web/src/wasm-formats
  apps/web/src/`.
- G15 — Coupe H48 à 07:30 : MP3 et Ogg d'abord laissés de côté si leur lecteur n'est pas vert (raison au rapport ; T7
  l'écrit dans `FORMAT_LOTS`).

**Interdits :** décoder un média ; importer `media-header.ts` depuis `media-import.ts` (la page n'en dépend pas, DA18) ;
modifier `media-import.ts` ; `try`/`catch` global qui masquerait une lecture hors bornes (les lecteurs bornent eux-mêmes,
RF1 le prouve) ; `BigInt` (granules lues en `number`, exactes jusqu'à 2^53).

**Terminé quand :** `media-header.test.ts` vert (≥ 14 tests `readMediaHeader`), `media-import.test.ts` vert ; chaque
fabrique reconnue par `sniffMedia`. Rapport : `Réutilisation : appelé sniffMedia (tests), MediaFormat`.

**Étapes :**

- [ ] **Étape 1 : fabriques** — `scripts/essais/fabriques/medias.mjs`

```js
// Fabriques des médias d'essai (cadrage cli-lot4, D70) : WAV, MP4/MOV/M4A, WebM, Ogg et MP3 écrits par le code, sur le
// modèle de c14-media-navigateur.mjs:24-55 ; aucun fichier téléchargé. Seuls les en-têtes comptent (la CLI ne décode pas).
const enc = (s) => new TextEncoder().encode(s);
const cat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
};
const le16 = (v) => Uint8Array.of(v & 0xff, (v >>> 8) & 0xff);
const le32 = (v) => Uint8Array.of(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
const be16 = (v) => Uint8Array.of((v >>> 8) & 0xff, v & 0xff);
const be24 = (v) => Uint8Array.of((v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
const be32 = (v) => Uint8Array.of((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);

/** WAV PCM 16 bits mono à `rate` Hz (8 kHz), `seconds` secondes de silence. */
export function wav(seconds, rate = 8000) {
  const data = Math.round(rate * seconds) * 2;
  return cat(enc("RIFF"), le32(36 + data), enc("WAVE"), enc("fmt "), le32(16), le16(1), le16(1), le32(rate), le32(rate * 2), le16(2), le16(16), enc("data"), le32(data), new Uint8Array(data));
}

const box = (type, ...parts) => {
  const body = cat(...parts);
  return cat(be32(8 + body.length), enc(type), body);
};
const full = (type, version, flags, ...parts) => box(type, Uint8Array.of(version, (flags >>> 16) & 0xff, (flags >>> 8) & 0xff, flags & 0xff), ...parts);
const MATRIX = cat(...[0x10000, 0, 0, 0, 0x10000, 0, 0, 0, 0x40000000].map(be32));

/**
 * MP4 (MOV avec `brand: "qt  "`, M4A avec `brand: "M4A "`) : `ftyp`, `moov` (`mvhd`, une piste : `tkhd` w × h en 16.16,
 * `mdia/hdlr` `vide` si w > 0, sinon `soun`) et `mdat` ; `moovLast` : `moov` après `mdat` ; `version1` : `mvhd` et `tkhd`
 * en version 1 (dates et durée sur 64 bits).
 */
export function mp4({ duration, timescale = 1000, width = 0, height = 0, brand = "isom", moovLast = false, version1 = false }) {
  const units = Math.round(duration * timescale);
  const t = (v) => (version1 ? cat(be32(0), be32(v)) : be32(v));
  const mvhd = full("mvhd", version1 ? 1 : 0, 0, t(0), t(0), be32(timescale), t(units), be32(0x10000), be16(0x100), new Uint8Array(10), MATRIX, new Uint8Array(24), be32(2));
  const tkhd = full("tkhd", version1 ? 1 : 0, 3, t(0), t(0), be32(1), be32(0), t(units), new Uint8Array(8), be16(0), be16(0), be16(width > 0 ? 0 : 0x100), be16(0), MATRIX, be32(width * 65536), be32(height * 65536));
  const hdlr = full("hdlr", 0, 0, be32(0), enc(width > 0 ? "vide" : "soun"), new Uint8Array(12), Uint8Array.of(0));
  const moov = box("moov", mvhd, box("trak", tkhd, box("mdia", hdlr)));
  const ftyp = box("ftyp", enc(brand), be32(0), enc("isom"), enc("mp41"));
  const mdat = box("mdat", new Uint8Array(16));
  return moovLast ? cat(ftyp, mdat, moov) : cat(ftyp, moov, mdat);
}

/** MP4 cassé (S3, casse.mp4) : `ftyp` et `mdat`, aucun `moov`. */
export const mp4Broken = () => cat(box("ftyp", enc("isom"), be32(0), enc("isom")), box("mdat", new Uint8Array(16)));

/** Élément EBML : identifiant (marqueur compris), taille sur 8 octets (1 si `short`), contenu. */
const el = (id, body, short = false) => cat(Uint8Array.of(...id), short ? Uint8Array.of(0x80 | body.length) : cat(Uint8Array.of(0x01, 0, 0, 0), be32(body.length)), body);
const UNKNOWN = Uint8Array.of(0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff);
const f64 = (v) => {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setFloat64(0, v);
  return b;
};
const block = (rel) => el([0xa3], cat(Uint8Array.of(0x81), be16(rel & 0xffff), Uint8Array.of(0x80, 0, 0, 0)));

/**
 * WebM : en-tête EBML (DocType `webm`, taille sur un octet comme l'attend `sniffMedia`), `Segment` de taille inconnue
 * (comme MediaRecorder) avec `Info` (`TimecodeScale` 1 ms, `Duration` absent si `duration: null`), `Tracks` (vidéo w × h,
 * ou son si w = 0), puis un `Cluster` de taille inconnue par temps de `clusters` (ms), blocs à +0 et +`lastBlock` ms.
 */
export function webm({ duration, width = 0, height = 0, clusters = [0], lastBlock = 0 }) {
  const scale = 1_000_000;
  const header = el([0x1a, 0x45, 0xdf, 0xa3], cat(el([0x42, 0x86], Uint8Array.of(1), true), el([0x42, 0x82], enc("webm"), true), el([0x42, 0x87], Uint8Array.of(2), true)));
  const info = el([0x15, 0x49, 0xa9, 0x66], cat(el([0x2a, 0xd7, 0xb1], be32(scale)), ...(duration === null ? [] : [el([0x44, 0x89], f64((duration * 1e9) / scale))])));
  const video = width > 0 ? [el([0xe0], cat(el([0xb0], be16(width)), el([0xba], be16(height))))] : [];
  const track = el([0xae], cat(el([0xd7], Uint8Array.of(1)), el([0x83], Uint8Array.of(width > 0 ? 1 : 2)), el([0x86], enc(width > 0 ? "V_VP8" : "A_OPUS")), ...video));
  const tracks = el([0x16, 0x54, 0xae, 0x6b], track);
  const cl = clusters.map((t) => cat(Uint8Array.of(0x1f, 0x43, 0xb6, 0x75), UNKNOWN, el([0xe7], be32(t)), block(0), block(lastBlock)));
  return cat(header, Uint8Array.of(0x18, 0x53, 0x80, 0x67), UNKNOWN, info, tracks, ...cl);
}

/** Page Ogg (CRC non calculé : aucun lecteur de la CLI ne le lit) ; `type` 2 : début de flux, 4 : fin. */
function oggPage(serial, seq, granule, type, packet) {
  const lacing = [];
  let n = packet.length;
  while (n >= 255) {
    lacing.push(255);
    n -= 255;
  }
  lacing.push(n);
  const g = cat(le32(granule % 2 ** 32), le32(Math.floor(granule / 2 ** 32)));
  return cat(enc("OggS"), Uint8Array.of(0, type), g, le32(serial), le32(seq), le32(0), Uint8Array.of(lacing.length), Uint8Array.of(...lacing), packet);
}

/**
 * Ogg d'un flux : page d'identification (`vorbis` à `rate` Hz ; `opus` 48 kHz, `preSkip` ; `theora` w × h, `frn`/`frd`
 * images par seconde, décalage `shift` des images clés ; `flac` : codec non lu, H42), puis une page de données à la
 * granule `granule`.
 */
export function ogg({ codec, granule, rate = 44100, preSkip = 312, width = 0, height = 0, frn = 25, frd = 1, shift = 6 }) {
  let id;
  if (codec === "vorbis") id = cat(Uint8Array.of(1), enc("vorbis"), le32(0), Uint8Array.of(1), le32(rate), le32(0), le32(128000), le32(0), Uint8Array.of(0xb8, 1));
  else if (codec === "opus") id = cat(enc("OpusHead"), Uint8Array.of(1, 1), le16(preSkip), le32(48000), le16(0), Uint8Array.of(0));
  else if (codec === "theora")
    id = cat(Uint8Array.of(0x80), enc("theora"), Uint8Array.of(3, 2, 1), be16(Math.ceil(width / 16)), be16(Math.ceil(height / 16)), be24(width), be24(height), Uint8Array.of(0, 0), be32(frn), be32(frd), be24(1), be24(1), Uint8Array.of(0), be24(0), be16((shift & 0x1f) << 5));
  else id = cat(Uint8Array.of(0x7f), enc("FLAC"), new Uint8Array(30));
  return cat(oggPage(7, 0, 0, 2, id), oggPage(7, 1, granule, 4, new Uint8Array(8)));
}

const MP3_KBPS = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];

/**
 * MP3 MPEG-1 couche III, 44,1 kHz stéréo, `kbps` constant (128) : `frames` cadres de ⌊144 × débit / 44 100⌋ octets
 * (417 à 128 kbit/s) ; `xing` : un premier cadre porteur d'un en-tête `Xing` (drapeau 1, `frames`) ; `id3` : balise
 * ID3v2 de 100 octets devant.
 */
export function mp3({ frames, kbps = 128, xing = false, id3 = false }) {
  const size = Math.floor((144 * kbps * 1000) / 44100);
  const frame = () => {
    const f = new Uint8Array(size);
    f.set([0xff, 0xfb, MP3_KBPS.indexOf(kbps) << 4, 0x00]);
    return f;
  };
  const out = [];
  if (id3) out.push(cat(enc("ID3"), Uint8Array.of(3, 0, 0, 0, 0, 0, 100), new Uint8Array(100)));
  if (xing) {
    const f = frame();
    f.set(enc("Xing"), 36);
    f.set(be32(1), 40);
    f.set(be32(frames), 44);
    out.push(f);
  }
  for (let i = 0; i < frames; i++) out.push(frame());
  return cat(...out);
}
```

`scripts/essais/fabriques/medias.d.mts` :

```ts
// Types des fabriques de médias (cadrage cli-lot4, D70), `medias.mjs`.
export function wav(seconds: number, rate?: number): Uint8Array;
export function mp4(o: { readonly duration: number; readonly timescale?: number; readonly width?: number; readonly height?: number; readonly brand?: string; readonly moovLast?: boolean; readonly version1?: boolean }): Uint8Array;
export function mp4Broken(): Uint8Array;
export function webm(o: { readonly duration: number | null; readonly width?: number; readonly height?: number; readonly clusters?: readonly number[]; readonly lastBlock?: number }): Uint8Array;
export function ogg(o: { readonly codec: "vorbis" | "opus" | "theora" | "flac"; readonly granule: number; readonly rate?: number; readonly preSkip?: number; readonly width?: number; readonly height?: number; readonly frn?: number; readonly frd?: number; readonly shift?: number }): Uint8Array;
export function mp3(o: { readonly frames: number; readonly kbps?: number; readonly xing?: boolean; readonly id3?: boolean }): Uint8Array;
```

- [ ] **Étape 2 : tests rouges** — `apps/web/src/platform/media-header.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { mp3, mp4, mp4Broken, ogg, wav, webm } from "../../../../scripts/essais/fabriques/medias.mjs";
import { readMediaHeader } from "./media-header";
import { sniffMedia, type MediaFormat } from "./media-import";

const head = (b: Uint8Array, name: string) => sniffMedia(b.subarray(0, 4096), name);

describe("readMediaHeader (cli-lot4, D61, DA18)", () => {
  it("readMediaHeader — MP4 vidéo 2,5 s 640 × 360 (S3, clip.mp4)", () =>
    expect(readMediaHeader(mp4({ duration: 2.5, width: 640, height: 360 }), "mp4")).toEqual({ duration: 2.5, width: 640, height: 360 }));
  it("readMediaHeader — MP4 moov après mdat, mvhd et tkhd en version 1", () =>
    expect(readMediaHeader(mp4({ duration: 4, timescale: 90000, width: 320, height: 240, moovLast: true, version1: true }), "mp4")).toEqual({ duration: 4, width: 320, height: 240 }));
  it("readMediaHeader — M4A et MOV : son 0 × 0, vidéo w × h", () => {
    expect(readMediaHeader(mp4({ duration: 1.25, brand: "M4A " }), "m4a")).toEqual({ duration: 1.25, width: 0, height: 0 });
    expect(readMediaHeader(mp4({ duration: 3, width: 1920, height: 1080, brand: "qt  " }), "mov")).toEqual({ duration: 3, width: 1920, height: 1080 });
  });
  it("readMediaHeader — MP4 sans moov (S3, casse.mp4) : null", () => expect(readMediaHeader(mp4Broken(), "mp4")).toBeNull());
  it("readMediaHeader — WAV 1 s à 8 kHz (S3, son.wav)", () => expect(readMediaHeader(wav(1), "wav")).toEqual({ duration: 1, width: 0, height: 0 }));
  it("readMediaHeader — WAV sans chunk data : null", () => expect(readMediaHeader(wav(1).subarray(0, 36), "wav")).toBeNull());
  it("readMediaHeader — WebM avec Duration 3,2 s, vidéo 320 × 240", () =>
    expect(readMediaHeader(webm({ duration: 3.2, width: 320, height: 240 }), "webm")).toEqual({ duration: 3.2, width: 320, height: 240 }));
  it("readMediaHeader — WebM sans Duration (MediaRecorder) : dernier Cluster + dernier bloc", () =>
    expect(readMediaHeader(webm({ duration: null, width: 320, height: 240, clusters: [0, 1000, 2000], lastBlock: 500 }), "webm")).toEqual({ duration: 2.5, width: 320, height: 240 }));
  it("readMediaHeader — WebM son seul : 0 × 0", () => expect(readMediaHeader(webm({ duration: 1.5 }), "webm")).toEqual({ duration: 1.5, width: 0, height: 0 }));
  it("readMediaHeader — Ogg Vorbis 2 s, Opus 1,5 s (pré-saut retiré)", () => {
    expect(readMediaHeader(ogg({ codec: "vorbis", granule: 88200, rate: 44100 }), "ogg")).toEqual({ duration: 2, width: 0, height: 0 });
    expect(readMediaHeader(ogg({ codec: "opus", granule: 72312, preSkip: 312 }), "ogg")).toEqual({ duration: 1.5, width: 0, height: 0 });
  });
  it("readMediaHeader — Ogg Theora 3 s à 25 i/s, 320 × 240 (granule : image clé décalée de 6 bits)", () =>
    expect(readMediaHeader(ogg({ codec: "theora", granule: (70 << 6) + 5, width: 320, height: 240, frn: 25, frd: 1, shift: 6 }), "ogg")).toEqual({ duration: 3, width: 320, height: 240 }));
  it("readMediaHeader — Ogg FLAC : null (H42)", () => expect(readMediaHeader(ogg({ codec: "flac", granule: 44100 }), "ogg")).toBeNull());
  it("readMediaHeader — MP3 Xing : cadres × 1152 / 44 100", () => expect(readMediaHeader(mp3({ frames: 100, xing: true }), "mp3")).toEqual({ duration: 2.612, width: 0, height: 0 }));
  it("readMediaHeader — MP3 sans Xing : débit constant du premier cadre (H42), aussi derrière une balise ID3", () => {
    expect(readMediaHeader(mp3({ frames: 100 }), "mp3")).toEqual({ duration: 2.606, width: 0, height: 0 });
    expect(readMediaHeader(mp3({ frames: 100, id3: true }), "mp3")).toEqual({ duration: 2.606, width: 0, height: 0 });
  });
  it("readMediaHeader — MP3 sans cadre valide : null", () => expect(readMediaHeader(new Uint8Array(64).fill(0xff), "mp3")).toBeNull());
  it("RF1 — chaque préfixe d'un média fabriqué : en-tête ou null, jamais d'exception", () => {
    const all: Array<[Uint8Array, MediaFormat]> = [
      [mp4({ duration: 1, width: 8, height: 8 }), "mp4"], [webm({ duration: null, width: 8, height: 8, clusters: [0, 40] }), "webm"], [wav(0.01), "wav"],
      [ogg({ codec: "theora", granule: 64, width: 8, height: 8 }), "ogg"], [mp3({ frames: 3, xing: true, id3: true }), "mp3"],
    ];
    for (const [bytes, format] of all) for (let n = 0; n <= bytes.length; n++) expect(() => readMediaHeader(bytes.subarray(0, n), format)).not.toThrow();
  });
  it("chaque fabrique est reconnue par sniffMedia au format attendu", () => {
    expect(head(mp4({ duration: 1, width: 8, height: 8 }), "a.mp4")).toEqual({ format: "mp4", mime: "video/mp4" });
    expect(head(mp4({ duration: 1, brand: "M4A " }), "a.m4a")).toEqual({ format: "m4a", mime: "audio/mp4" });
    expect(head(mp4({ duration: 1, width: 8, height: 8, brand: "qt  " }), "a.mov")).toEqual({ format: "mov", mime: "video/quicktime" });
    expect(head(webm({ duration: 1 }), "a.webm")).toEqual({ format: "webm", mime: "video/webm" });
    expect(head(wav(0.01), "a.wav")).toEqual({ format: "wav", mime: "audio/wav" });
    expect(head(ogg({ codec: "vorbis", granule: 1 }), "a.ogg")).toEqual({ format: "ogg", mime: "audio/ogg" });
    expect(head(mp3({ frames: 2 }), "a.mp3")).toEqual({ format: "mp3", mime: "audio/mpeg" });
    expect(head(mp3({ frames: 2, id3: true }), "a.mp3")).toEqual({ format: "mp3", mime: "audio/mpeg" });
    expect(head(mp4Broken(), "casse.mp4")).toEqual({ format: "mp4", mime: "video/mp4" });
  });
});
```

Calcul des attendus MP3 : Xing 100 × 1152 / 44 100 = 2,61224… → 2,612 ; sans Xing 100 × 417 octets × 8 / 128 000 =
2,60625 → 2,606 (arrondi au ms comme `probeMedia`).

- [ ] **Étape 3 : rouge**

Run : `cd ~/projets/roomboard-wt/cli-lot4--T3 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/media-header.test.ts 2>&1 | tail -10`
Attendu : échec (module `./media-header` absent).

- [ ] **Étape 4 : le module** — `apps/web/src/platform/media-header.ts`

```ts
/**
 * Durée et taille d'un média lues dans l'en-tête (cadrage cli-lot4, D61, DA18) : MP4, MOV, M4A, M4V (`mvhd`, `tkhd` de la
 * première piste vidéo), WebM (`Info`, `Tracks`, sinon dernier `Cluster` + dernier bloc), WAV (`fmt `, `data`), Ogg
 * (Vorbis, Opus, Theora : dernière granule), MP3 (`Xing`, `Info`, `VBRI`, sinon débit constant du premier cadre, H42).
 * Module pur, sans DOM ni dépendance, à côté de `sniffMedia` ; la page n'en dépend pas, la CLI l'injecte comme `probe`
 * (DA20). Durée arrondie au ms comme `probeMedia` ; vidéo si `width > 0` (règle M16 d'`addMedia`). null : illisible.
 */
import type { MediaFormat } from "./media-import";

export interface MediaHeader {
  /** Secondes, arrondies au ms. */
  readonly duration: number;
  /** 0 × 0 : son. */
  readonly width: number;
  readonly height: number;
}

const at = (b: Uint8Array, i: number): number => b[i] ?? 0;
const ascii = (b: Uint8Array, from: number, to: number): string => {
  let s = "";
  for (let i = from; i < to && i < b.length; i++) s += String.fromCharCode(at(b, i));
  return s;
};
const u16le = (b: Uint8Array, i: number): number => at(b, i) | (at(b, i + 1) << 8);
const u32le = (b: Uint8Array, i: number): number => (u16le(b, i) | (at(b, i + 2) << 16) | (at(b, i + 3) << 24)) >>> 0;
const u16be = (b: Uint8Array, i: number): number => (at(b, i) << 8) | at(b, i + 1);
const u24be = (b: Uint8Array, i: number): number => (at(b, i) << 16) | u16be(b, i + 1);
const u32be = (b: Uint8Array, i: number): number => ((at(b, i) << 24) | u24be(b, i + 1)) >>> 0;
const u64be = (b: Uint8Array, i: number): number => u32be(b, i) * 2 ** 32 + u32be(b, i + 4);
const uintBe = (b: Uint8Array, i: number, n: number): number => {
  let v = 0;
  for (let k = 0; k < n; k++) v = v * 256 + at(b, i + k);
  return v;
};
const i16be = (b: Uint8Array, i: number): number => {
  const v = u16be(b, i);
  return v >= 0x8000 ? v - 0x10000 : v;
};
const found = (seconds: number, width = 0, height = 0): MediaHeader | null =>
  Number.isFinite(seconds) && seconds > 0 ? { duration: Math.round(seconds * 1000) / 1000, width, height } : null;

interface IsoBox {
  readonly type: string;
  readonly start: number;
  readonly end: number;
}
/** Boîtes ISO entre `from` et `to` (même contrat qu'`isoBoxes` d'`image-size.ts`, que T5 branche ici). */
function* isoBoxes(b: Uint8Array, from: number, to: number): Generator<IsoBox> {
  let i = from;
  while (i + 8 <= to) {
    let size = u32be(b, i);
    const type = ascii(b, i + 4, i + 8);
    let head = 8;
    if (size === 1) {
      if (i + 16 > to) return;
      size = u64be(b, i + 8);
      head = 16;
    } else if (size === 0) size = to - i;
    if (size < head) return;
    if (i + size > to) {
      yield { type, start: i + head, end: to };
      return;
    }
    yield { type, start: i + head, end: i + size };
    i += size;
  }
}

function mvhdSeconds(b: Uint8Array, x: IsoBox): number | null {
  const v1 = at(b, x.start) === 1;
  if (x.end - x.start < (v1 ? 32 : 20)) return null;
  const scale = u32be(b, x.start + (v1 ? 20 : 12));
  const units = v1 ? u64be(b, x.start + 24) : u32be(b, x.start + 16);
  return scale > 0 ? units / scale : null;
}

function videoSize(b: Uint8Array, trak: IsoBox): { readonly width: number; readonly height: number } | null {
  let tkhd: IsoBox | null = null;
  let video = false;
  for (const x of isoBoxes(b, trak.start, trak.end)) {
    if (x.type === "tkhd") tkhd = x;
    else if (x.type === "mdia") for (const y of isoBoxes(b, x.start, x.end)) if (y.type === "hdlr" && ascii(b, y.start + 8, y.start + 12) === "vide") video = true;
  }
  if (!video || tkhd === null) return null;
  const w = tkhd.start + (at(b, tkhd.start) === 1 ? 88 : 76);
  if (w + 8 > tkhd.end) return null;
  const width = Math.round(u32be(b, w) / 65536);
  const height = Math.round(u32be(b, w + 4) / 65536);
  return width > 0 && height > 0 ? { width, height } : null;
}

function isoHeader(b: Uint8Array): MediaHeader | null {
  let moov: IsoBox | null = null;
  for (const x of isoBoxes(b, 0, b.length)) if (x.type === "moov") moov = x;
  if (moov === null) return null;
  let seconds: number | null = null;
  let size: { readonly width: number; readonly height: number } | null = null;
  for (const x of isoBoxes(b, moov.start, moov.end)) {
    if (x.type === "mvhd") seconds = mvhdSeconds(b, x);
    else if (x.type === "trak" && size === null) size = videoSize(b, x);
  }
  return seconds === null ? null : found(seconds, size?.width ?? 0, size?.height ?? 0);
}

function wavHeader(b: Uint8Array): MediaHeader | null {
  if (ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 12) !== "WAVE") return null;
  let byteRate = 0;
  let i = 12;
  while (i + 8 <= b.length) {
    const id = ascii(b, i, i + 4);
    const size = u32le(b, i + 4);
    if (id === "fmt " && size >= 16 && i + 20 <= b.length) byteRate = u32le(b, i + 16);
    if (id === "data") {
      const data = Math.min(size, b.length - i - 8);
      return byteRate > 0 ? found(data / byteRate) : null;
    }
    i += 8 + size + (size & 1);
  }
  return null;
}

/** Éléments maîtres de WebM parcourus en profondeur : Segment, Info, Tracks, TrackEntry, Video, Cluster, BlockGroup. */
const EBML_MASTERS: ReadonlySet<number> = new Set([0x18538067, 0x1549a966, 0x1654ae6b, 0xae, 0xe0, 0x1f43b675, 0xa0]);

/** Entier à longueur variable d'EBML ; `id` : marqueur gardé ; taille « inconnue » (tous les bits à 1) : -1. */
function vint(b: Uint8Array, i: number, id: boolean): { readonly value: number; readonly length: number } | null {
  const first = at(b, i);
  if (first === 0 || i >= b.length) return null;
  const length = Math.clz32(first) - 23;
  if (i + length > b.length) return null;
  let value = id ? first : first & (0xff >> length);
  let ones = value === 0xff >> length;
  for (let k = 1; k < length; k++) {
    const x = at(b, i + k);
    value = value * 256 + x;
    if (x !== 0xff) ones = false;
  }
  return { value: !id && ones ? -1 : value, length };
}

/**
 * WebM, parcours à plat : un maître n'est pas sauté (ses enfants suivent), ce qui lit aussi les `Segment` et `Cluster` de
 * taille inconnue (MediaRecorder). `Duration` (unités de `TimecodeScale` ns), sinon dernier temps de cluster + dernier bloc.
 */
function webmHeader(b: Uint8Array): MediaHeader | null {
  let scale = 1_000_000;
  let duration: number | null = null;
  let width = 0;
  let height = 0;
  let cluster = 0;
  let last: number | null = null;
  let i = 0;
  while (i < b.length) {
    const id = vint(b, i, true);
    if (id === null) break;
    const size = vint(b, i + id.length, false);
    if (size === null) break;
    const data = i + id.length + size.length;
    if (EBML_MASTERS.has(id.value)) {
      i = data;
      continue;
    }
    if (size.value < 0 || data + size.value > b.length) break;
    const n = size.value;
    if (id.value === 0x2ad7b1) scale = uintBe(b, data, n);
    else if (id.value === 0x4489 && (n === 4 || n === 8)) {
      const v = new DataView(b.buffer, b.byteOffset + data, n);
      duration = n === 4 ? v.getFloat32(0) : v.getFloat64(0);
    } else if (id.value === 0xb0 && width === 0) width = uintBe(b, data, n);
    else if (id.value === 0xba && height === 0) height = uintBe(b, data, n);
    else if (id.value === 0xe7) cluster = uintBe(b, data, n);
    else if (id.value === 0xa3 || id.value === 0xa1) {
      const track = vint(b, data, false);
      if (track !== null && track.length + 2 <= n) last = cluster + i16be(b, data + track.length);
    }
    i = data + n;
  }
  const units = duration ?? last;
  return units === null ? null : found((units * scale) / 1e9, width, height);
}

/** Ogg : codec du premier paquet du premier flux, dernière granule de ce flux ; Vorbis, Opus, Theora seulement (H42). */
function oggHeader(b: Uint8Array): MediaHeader | null {
  let serial: number | null = null;
  let codec: "vorbis" | "opus" | "theora" | null = null;
  let rate = 0;
  let preSkip = 0;
  let width = 0;
  let height = 0;
  let frn = 0;
  let frd = 0;
  let shift = 0;
  let granule: number | null = null;
  let i = 0;
  while (i + 27 <= b.length && ascii(b, i, i + 4) === "OggS") {
    const segments = at(b, i + 26);
    let body = 0;
    for (let k = 0; k < segments; k++) body += at(b, i + 27 + k);
    const p = i + 27 + segments;
    if (p + body > b.length) break;
    const s = u32le(b, i + 14);
    if (serial === null) {
      serial = s;
      if (ascii(b, p, p + 7) === "\x01vorbis") {
        codec = "vorbis";
        rate = u32le(b, p + 12);
      } else if (ascii(b, p, p + 8) === "OpusHead") {
        codec = "opus";
        rate = 48000;
        preSkip = u16le(b, p + 10);
      } else if (ascii(b, p, p + 7) === "\x80theora") {
        codec = "theora";
        width = u24be(b, p + 14);
        height = u24be(b, p + 17);
        frn = u32be(b, p + 22);
        frd = u32be(b, p + 26);
        shift = (u16be(b, p + 40) >> 5) & 0x1f;
      } else return null;
    } else if (s === serial) {
      const lo = u32le(b, i + 6);
      const hi = u32le(b, i + 10);
      if (!(lo === 0xffffffff && hi === 0xffffffff)) granule = hi * 2 ** 32 + lo;
    }
    i = p + body;
  }
  if (codec === null || granule === null) return null;
  if (codec === "theora") {
    if (frn === 0 || frd === 0) return null;
    const unit = 2 ** shift;
    const frames = Math.floor(granule / unit) + (granule % unit);
    return found((frames * frd) / frn, width, height);
  }
  return rate > 0 ? found((granule - preSkip) / rate) : null;
}

/** Débits en kbit/s par couche (1 à 3), MPEG-1 puis MPEG-2 et 2.5 ; fréquences par version (bits 0 : 2.5, 2 : 2, 3 : 1). */
const KBPS_MPEG1: readonly (readonly number[])[] = [
  [],
  [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
  [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
];
const KBPS_MPEG2: readonly (readonly number[])[] = [
  [],
  [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
  [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
];
const MP3_RATES: readonly (readonly number[])[] = [[11025, 12000, 8000], [], [22050, 24000, 16000], [44100, 48000, 32000]];

interface Mp3Frame {
  readonly mpeg1: boolean;
  readonly layer: number;
  readonly rate: number;
  readonly kbps: number;
  readonly samples: number;
  readonly mono: boolean;
}

function mp3Frame(b: Uint8Array, i: number): Mp3Frame | null {
  if (at(b, i) !== 0xff || (at(b, i + 1) & 0xe0) !== 0xe0 || i + 4 > b.length) return null;
  const version = (at(b, i + 1) >> 3) & 3;
  const layerBits = (at(b, i + 1) >> 1) & 3;
  const index = at(b, i + 2) >> 4;
  const rateIndex = (at(b, i + 2) >> 2) & 3;
  if (version === 1 || layerBits === 0 || index === 0 || index === 15 || rateIndex === 3) return null;
  const layer = 4 - layerBits;
  const mpeg1 = version === 3;
  const kbps = (mpeg1 ? KBPS_MPEG1 : KBPS_MPEG2)[layer]?.[index] ?? 0;
  const rate = MP3_RATES[version]?.[rateIndex] ?? 0;
  const samples = layer === 1 ? 384 : layer === 2 ? 1152 : mpeg1 ? 1152 : 576;
  return kbps > 0 && rate > 0 ? { mpeg1, layer, rate, kbps, samples, mono: at(b, i + 3) >> 6 === 3 } : null;
}

/** MP3 : balise ID3v2 sautée, premier cadre valide dans les 64 Kio suivants ; `Xing`/`Info`, `VBRI`, sinon débit constant. */
function mp3Header(b: Uint8Array): MediaHeader | null {
  let start = 0;
  if (ascii(b, 0, 3) === "ID3" && b.length >= 10) {
    const size = ((at(b, 6) & 0x7f) << 21) | ((at(b, 7) & 0x7f) << 14) | ((at(b, 8) & 0x7f) << 7) | (at(b, 9) & 0x7f);
    start = 10 + size + ((at(b, 5) & 0x10) !== 0 ? 10 : 0);
  }
  const limit = Math.min(b.length - 4, start + 65536);
  let i = start;
  let f: Mp3Frame | null = null;
  for (; i < limit; i++) {
    f = mp3Frame(b, i);
    if (f !== null) break;
  }
  if (f === null) return null;
  const side = f.mpeg1 ? (f.mono ? 17 : 32) : f.mono ? 9 : 17;
  const x = i + 4 + side;
  const tag = ascii(b, x, x + 4);
  if (f.layer === 3 && (tag === "Xing" || tag === "Info") && (u32be(b, x + 4) & 1) === 1 && x + 12 <= b.length) return found((u32be(b, x + 8) * f.samples) / f.rate);
  if (ascii(b, i + 36, i + 40) === "VBRI" && i + 54 <= b.length) return found((u32be(b, i + 50) * f.samples) / f.rate);
  let end = b.length;
  if (end - 128 >= i && ascii(b, end - 128, end - 125) === "TAG") end -= 128;
  return found(((end - i) * 8) / (f.kbps * 1000));
}

/** Durée (et taille d'une vidéo) lue dans l'en-tête de `bytes` (le fichier entier : WebM, Ogg et MP3 lisent la fin). */
export function readMediaHeader(bytes: Uint8Array, format: MediaFormat): MediaHeader | null {
  switch (format) {
    case "mp4":
    case "mov":
    case "m4a":
      return isoHeader(bytes);
    case "webm":
      return webmHeader(bytes);
    case "wav":
      return wavHeader(bytes);
    case "ogg":
      return oggHeader(bytes);
    case "mp3":
      return mp3Header(bytes);
  }
}
```

Note VBRI : en-tête à `i + 36` ; nombre de cadres à `+14` de « VBRI » (`i + 50`). Note `vint` : `Math.clz32` d'un octet
non nul vaut 24 à 31, d'où une longueur de 1 à 8.

- [ ] **Étape 5 : vert**

Run : `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/media-header.test.ts src/platform/media-import.test.ts 2>&1 | tail -15`
Attendu : `Test Files  2 passed` ; `-t "readMediaHeader"` : ≥ 14 tests.
Run : `nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | tail -5` — aucune erreur.

- [ ] **Étape 6 : commit**

```bash
git add apps/web/src/platform/media-header.ts apps/web/src/platform/media-header.test.ts scripts/essais/fabriques/medias.mjs scripts/essais/fabriques/medias.d.mts
git commit --author "jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(web): media duration and size read from headers (MP4, WebM, WAV, Ogg, MP3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t4"></a>
### Tâche T4 — CLI 3D : `model3d-node.ts` (globaux de three, D76), `quietError`, erreurs non rattrapées (D77), fabriques 3D

**Objectif :** donner à la CLI les dépendances 3D de `createImporter` (`Model3dDeps`) en réutilisant le rendu partagé de
la page sans WebGL (three valide le modèle, instantané `null`, avis `NO_WEBGL_MESSAGE` du produit) et le lecteur de ZIP
en processus ; poser les trois globaux du navigateur que three attend **seulement le temps d'un `view.load()`** ; filtrer
le seul message de console de three déjà dit par `missing` ; transformer toute erreur non rattrapée en une ligne JSON,
code 1. Cadrage : D67, D76, D77, D78, DA20, H40, H44 ; S4.

**Patron à ne pas reprendre :** le faux réseau du test de la page (`apps/web/src/platform/model-view-three.test.ts:96-135`,
`fakeNetwork`) : il remplace `fetch` par un réseau surveillé et pose des globaux par `vi.stubGlobal` pour toute la durée
d'un test. La CLI garde le vrai `fetch` de Node (les URL `blob:nodedata:` se lisent, essai 1 du cadrage) et ne pose
`self`, `ProgressEvent`, `document` que s'ils manquent, le temps d'un `load`, puis les retire dans `finally` : pdf.js,
évalué dans le même fichier construit, lit `self` et `document` pour reconnaître son environnement (D76). Aucun module
commun avec ce test (deux besoins différents). Chemin de référence de la vue : `apps/web/src/platform/model-view-three.ts:271-345`
(`createThreeModelView`, `guardUrl`), sans-WebGL prouvé par `model-view-three.test.ts:266-282`.

**Fichiers :**
- Créer : `apps/cli/src/model3d-node.ts`, `apps/cli/src/model3d-node.test.ts`
- Créer : `scripts/essais/fabriques/modeles.mjs`, `scripts/essais/fabriques/modeles.d.mts`
- Modifier : `apps/cli/src/quiet.ts` (ajout de `quietError`), `apps/cli/src/quiet.test.ts`
- Modifier : `apps/cli/src/bin.ts:20-40` (écouteurs `uncaughtException`, `unhandledRejection`), `apps/cli/src/bin.test.ts:15-34`

**Interfaces :**
- Consomme : rien d'une autre tâche.
- Réutilise : `apps/web/src/platform/model-view-three.ts:271` — `createThreeModelView({ createCanvas, createRenderer, urls }): ModelView`
- Réutilise : `apps/web/src/platform/model-view.ts:73` — `createModelViewLoader(load: () => Promise<ModelView>): ModelViewLoader`
- Réutilise : `apps/web/src/platform/zip-read.ts:48`, `zip-worker.ts:158`, `one-shot-worker.ts:55` — `createZipReader(inlineWorker((m) => zipJobReply(m as ZipJob)))` (patron `apps/cli/src/board-node.ts:36`)
- Réutilise : `apps/web/src/platform/model3d-handlers.ts:149,173,227` — par `createImporter({ model3d })` (T7 branche)
- Réutilise (étendu) : `apps/cli/src/quiet.ts` — `quietError` sur le patron de `quietWarn`
- Produit (lu par T7) :
  ```ts
  // apps/cli/src/model3d-node.ts
  export function nodeModel3d(): Model3dDeps;                                  // { view(): Promise<ModelView>; readZip(blob): Promise<ZipEntry[]> }
  export function withThreeGlobals<T>(run: () => Promise<T>): Promise<T>;      // D76
  // apps/cli/src/quiet.ts
  export const THREE_ERRORS: readonly string[];                                // ["THREE.GLTFLoader: Couldn't load texture"]
  export function quietError(error: (...a: unknown[]) => void): (...a: unknown[]) => void;
  // scripts/essais/fabriques/modeles.mjs (lu par T7, T8)
  export function png1(): Uint8Array;                                          // PNG 2 × 2
  export function cubeObj(): Uint8Array;                                       // `mtllib cube.mtl`, `usemtl rouge`, deux faces avec vt
  export function cubeMtl(texture?: string | null): Uint8Array;                // `map_Kd <texture>` (« tex.png » par défaut ; null : aucune)
  export function stlTriangle(): Uint8Array;                                   // STL binaire, un triangle
  export function plyTriangle(): Uint8Array;                                   // PLY ASCII, un triangle
  export function gltfPair(o?: { image?: string | null }): { gltf: Uint8Array; bin: Uint8Array }; // `tri.gltf` qui cite `tri.bin` (60 octets)
  export function glbTextured(): Uint8Array;                                   // GLB, texture PNG incorporée (bufferView)
  ```

**Contraintes (recopiées de Global Constraints) :**
- G1 — TDD : test rouge d'abord. Aucun test désactivé ni sauté, aucun seuil baissé ou relevé, aucun délai de test
  existant relevé ; un test qui échoue sur un délai est rejoué une fois.
- G2 — VM partagée : builds et tests en `nice -n 10` ; avant toute commande : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- G5 — Fichiers d'essai fabriqués par le code (`modeles.mjs`, PNG par `solidPng` de `scripts/essais/commun.mjs`) ; aucun
  fichier téléchargé ; rien de `~/telechargements-roomboard/` ; écritures seulement sous `tmpDir()`.
- G6 — Aucun crate Wasm touché ; tailles Wasm inchangées.
- G7 — Aucune dépendance ajoutée (three et fflate résolus depuis `apps/web/node_modules`, `apps/cli/package.json` et
  `vite.config.ts` inchangés sauf refus du build : le dire au rapport) ; aucune AGPL/GPL/LGPL ; aucune installation de
  paquet système.
- G8 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais terminés par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un ; jamais `--force`.
- G10 — La CLI appelle le code de la page (`createThreeModelView`, `createZipReader`, `zipJobReply`), jamais une copie.
- G11 — Construction de la CLI : `nice -n 10 pnpm --filter @roomboard/cli build` ; tests `ROOMBOARD_WASM_REQUIRED=1 nice -n
  10 pnpm --filter @roomboard/cli test`.
- G12 — Worktree isolé neuf : `cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r
  /home/adminjd/projets/roomboard-wt/cli-lot4/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot4/apps/web/src/wasm-formats
  apps/web/src/`.
- G13 — stderr de la CLI réservé à la ligne `{"error":…}` : aucun `console.*` ajouté ; seul `quiet.ts` touche
  `console.warn` et `console.error`.
- G15 — Coupe H48 à 07:30 : si les modèles texturés ne sont pas verts, ils sont refusés en code 1 « textures non lues par
  la CLI » (T7 l'écrit dans les notes de `.gltf`, `.glb`, `.obj`) ; le dire au rapport.

**Interdits :** `await` de premier niveau dans tout module de la CLI (piège du lot 3, commentaire de `bin.ts`) ; poser un
global hors d'un `load` ; écraser un global déjà présent ; décoder une texture ; filtrer un autre message que le préfixe
de `THREE_ERRORS` ; toucher `apps/web` ; brancher `nodeModel3d` dans `importer.ts` (T7).

**Terminé quand :** `model3d-node.test.ts`, `quiet.test.ts`, `bin.test.ts` verts ; la CLI construite sort sans rien sur
stderr pour `formats` (three évalué au démarrage, D78) ; mesure `version` (médiane de 5, avant/après) dans le rapport.
Rapport : `Réutilisation : appelé createThreeModelView, createModelViewLoader, createZipReader, zipJobReply` et le
temps de démarrage.

**Étapes :**

- [ ] **Étape 1 : fabriques 3D** — `scripts/essais/fabriques/modeles.mjs`

```js
// Fabriques des modèles 3D d'essai (cadrage cli-lot4, D70) : OBJ + MTL + texture PNG, STL binaire, PLY ASCII, glTF + .bin,
// GLB à texture incorporée, écrits par le code ; aucun fichier téléchargé. Lues par les tests de apps/cli, par
// cli-essai.mjs et par objets.mjs.
import { solidPng } from "../commun.mjs";

const enc = (s) => new TextEncoder().encode(s);
const cat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
};
const le32 = (v) => Uint8Array.of(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
const f32s = (values) => {
  const b = new Uint8Array(values.length * 4);
  const v = new DataView(b.buffer);
  values.forEach((x, i) => v.setFloat32(i * 4, x, true));
  return b;
};
const pad4 = (b, fill) => {
  const n = (4 - (b.length % 4)) % 4;
  return n === 0 ? b : cat(b, new Uint8Array(n).fill(fill));
};
const TRI = [0, 0, 0, 1, 0, 0, 0, 1, 0];
const UV = [0, 0, 1, 0, 0, 1];
const ACCESSORS = [
  { bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] },
  { bufferView: 1, componentType: 5126, count: 3, type: "VEC2" },
];
const TEXTURED = { materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }], textures: [{ source: 0 }] };
const scene = (material) => ({
  asset: { version: "2.0" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, ...(material ? { material: 0 } : {}) }] }],
});

/** PNG 2 × 2 (texture). */
export const png1 = () => new Uint8Array(solidPng(2, 2, [200, 60, 40]));

/** OBJ : carré de deux faces, coordonnées de texture, matériau `rouge` de `cube.mtl`. */
export const cubeObj = () => enc("mtllib cube.mtl\nusemtl rouge\nv 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nvt 0 0\nvt 1 0\nvt 1 1\nvt 0 1\nf 1/1 2/2 3/3\nf 1/1 3/3 4/4\n");

/** MTL : `rouge`, couleur diffuse, texture `texture` (« tex.png » ; null : aucune). */
export const cubeMtl = (texture = "tex.png") => enc(`newmtl rouge\nKd 0.8 0.2 0.2\n${texture ? `map_Kd ${texture}\n` : ""}`);

/** STL binaire : en-tête de 80 octets nuls (pas « solid »), un triangle. */
export const stlTriangle = () => cat(new Uint8Array(80), le32(1), f32s([0, 0, 1, ...TRI]), new Uint8Array(2));

/** PLY ASCII : un triangle. */
export const plyTriangle = () =>
  enc("ply\nformat ascii 1.0\nelement vertex 3\nproperty float x\nproperty float y\nproperty float z\nelement face 1\nproperty list uchar int vertex_indices\nend_header\n0 0 0\n1 0 0\n0 1 0\n3 0 1 2\n");

/** glTF `tri.gltf` qui cite `tri.bin` (positions et UV, 60 octets) ; `image` : texture externe citée par son chemin. */
export function gltfPair({ image = null } = {}) {
  const bin = cat(f32s(TRI), f32s(UV));
  const json = {
    ...scene(image !== null),
    ...(image !== null ? { ...TEXTURED, images: [{ uri: image }] } : {}),
    buffers: [{ uri: "tri.bin", byteLength: bin.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36 },
      { buffer: 0, byteOffset: 36, byteLength: 24 },
    ],
    accessors: ACCESSORS,
  };
  return { gltf: enc(JSON.stringify(json)), bin };
}

/** GLB : triangle texturé, PNG incorporé dans le tampon binaire (`images[0].bufferView`). */
export function glbTextured() {
  const png = png1();
  const bin = cat(f32s(TRI), f32s(UV), pad4(png, 0));
  const json = {
    ...scene(true),
    ...TEXTURED,
    images: [{ bufferView: 2, mimeType: "image/png" }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36 },
      { buffer: 0, byteOffset: 36, byteLength: 24 },
      { buffer: 0, byteOffset: 60, byteLength: png.length },
    ],
    accessors: ACCESSORS,
  };
  const j = pad4(enc(JSON.stringify(json)), 0x20);
  return cat(enc("glTF"), le32(2), le32(12 + 8 + j.length + 8 + bin.length), le32(j.length), enc("JSON"), j, le32(bin.length), Uint8Array.of(0x42, 0x49, 0x4e, 0x00), bin);
}
```

`scripts/essais/fabriques/modeles.d.mts` :

```ts
// Types des fabriques 3D (cadrage cli-lot4, D70), `modeles.mjs`.
export function png1(): Uint8Array;
export function cubeObj(): Uint8Array;
export function cubeMtl(texture?: string | null): Uint8Array;
export function stlTriangle(): Uint8Array;
export function plyTriangle(): Uint8Array;
export function gltfPair(o?: { readonly image?: string | null }): { readonly gltf: Uint8Array; readonly bin: Uint8Array };
export function glbTextured(): Uint8Array;
```

- [ ] **Étape 2 : tests rouges** — `apps/cli/src/model3d-node.test.ts`

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { cubeMtl, cubeObj, glbTextured, gltfPair, plyTriangle, png1, stlTriangle } from "../../../scripts/essais/fabriques/modeles.mjs";
import { DEFAULT_CAMERA } from "../../web/src/engine/render/model-frames";
import type { ModelSource } from "../../web/src/platform/model-view";
import { quietError } from "./quiet";
import { nodeModel3d, withThreeGlobals } from "./model3d-node";
import { fabZip } from "./testing";

const SLOTS = ["self", "ProgressEvent", "document"] as const;
const present = (): boolean[] => SLOTS.map((k) => k in globalThis);
const blob = (b: Uint8Array): Blob => new Blob([b as BlobPart]);
const src = (format: ModelSource["format"], name: string, main: Uint8Array, files: Array<[string, Uint8Array]> = []): ModelSource => ({
  format,
  name,
  main: blob(main),
  files: new Map(files.map(([p, b]) => [p, blob(b)])),
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("nodeModel3d (cli-lot4, D67)", () => {
  it("S4 — OBJ + MTL + texture, STL, PLY, glTF + .bin, GLB texturé : lus sans WebGL, missing vide, instantané null", async () => {
    const view = await nodeModel3d().view();
    expect(view.available()).toBe(false);
    const { gltf, bin } = gltfPair();
    const sources = [
      src("obj", "cube.obj", cubeObj(), [["cube.mtl", cubeMtl()], ["tex.png", png1()]]),
      src("stl", "tri.stl", stlTriangle()),
      src("ply", "tri.ply", plyTriangle()),
      src("gltf", "tri.gltf", gltf, [["tri.bin", bin]]),
      src("glb", "tex.glb", glbTextured()),
    ];
    for (const s of sources) {
      const m = await view.load(s);
      expect(m.missing, s.name).toEqual([]);
      expect(await view.snapshot(m, DEFAULT_CAMERA, { w: 64, h: 48 }), s.name).toBeNull();
      view.release(m);
    }
    expect(present()).toEqual([false, false, false]);
  });
  it("S4 — glTF sans son .bin : rejet, globaux retirés", async () => {
    const view = await nodeModel3d().view();
    await expect(view.load(src("gltf", "tri.gltf", gltfPair().gltf))).rejects.toThrow();
    expect(present()).toEqual([false, false, false]);
  });
  it("D77 — texture absente : missing [\"tex.png\"], le seul message de three filtré par quietError", async () => {
    const shown = vi.fn();
    const original = console.error;
    console.error = quietError(shown);
    try {
      const view = await nodeModel3d().view();
      const { gltf, bin } = gltfPair({ image: "tex.png" });
      const m = await view.load(src("gltf", "tri.gltf", gltf, [["tri.bin", bin]]));
      expect(m.missing).toEqual(["tex.png"]);
    } finally {
      console.error = original;
    }
    expect(shown).not.toHaveBeenCalled();
  });
  it("D77 — aucun console.warn ni console.error pendant la lecture des fabriques de S4", async () => {
    const warn = vi.spyOn(console, "warn");
    const error = vi.spyOn(console, "error");
    const view = await nodeModel3d().view();
    await view.load(src("glb", "tex.glb", glbTextured()));
    await view.load(src("obj", "cube.obj", cubeObj(), [["cube.mtl", cubeMtl()], ["tex.png", png1()]]));
    expect([warn.mock.calls, error.mock.calls]).toEqual([[], []]);
  });
  it("readZip — ZIP de deux modèles lu en processus (inlineWorker) : deux entrées", async () => {
    const entries = await nodeModel3d().readZip(new Blob([fabZip({ "a.stl": stlTriangle(), "b/c.ply": plyTriangle() }) as BlobPart]));
    expect(entries.map((e) => e.path).sort()).toEqual(["a.stl", "b/c.ply"]);
  });
});

describe("withThreeGlobals (cli-lot4, D76)", () => {
  it("D76 — self, ProgressEvent, document posés le temps de run seulement, retirés après un succès comme après un rejet", async () => {
    expect(present()).toEqual([false, false, false]);
    let during: boolean[] = [];
    await withThreeGlobals(async () => {
      during = present();
    });
    expect(during).toEqual([true, true, true]);
    expect(present()).toEqual([false, false, false]);
    await expect(withThreeGlobals(async () => Promise.reject(new Error("x")))).rejects.toThrow("x");
    expect(present()).toEqual([false, false, false]);
  });
  it("D76 — un global déjà présent n'est ni remplacé ni retiré", async () => {
    const mine = { mine: true };
    vi.stubGlobal("document", mine);
    await withThreeGlobals(async () => expect((globalThis as { document?: unknown }).document).toBe(mine));
    expect((globalThis as { document?: unknown }).document).toBe(mine);
  });
  it("D76 — image sans canvas : contenu non vide → load, URL vide → error", async () => {
    const outcome = (b: Blob): Promise<string> =>
      withThreeGlobals(
        () =>
          new Promise<string>((resolve) => {
            const doc = (globalThis as unknown as { document: { createElementNS(ns: string, n: string): { addEventListener(t: string, cb: () => void): void; src: string } } }).document;
            const img = doc.createElementNS("http://www.w3.org/1999/xhtml", "img");
            img.addEventListener("load", () => resolve("load"));
            img.addEventListener("error", () => resolve("error"));
            img.src = URL.createObjectURL(b);
          }),
      );
    expect(await outcome(blob(png1()))).toBe("load");
    expect(await outcome(new Blob([]))).toBe("error");
  });
  it("D76 — ProgressEvent : lengthComputable, loaded, total", async () => {
    await withThreeGlobals(async () => {
      const P = (globalThis as unknown as { ProgressEvent: new (t: string, i?: object) => { type: string; loaded: number; total: number; lengthComputable: boolean } }).ProgressEvent;
      const e = new P("progress", { lengthComputable: true, loaded: 3, total: 9 });
      expect([e.type, e.lengthComputable, e.loaded, e.total]).toEqual(["progress", true, 3, 9]);
    });
  });
});
```

Dans `apps/cli/src/quiet.test.ts`, ajouter (et `quietError`, `THREE_ERRORS` à l'import) :

```ts
describe("quietError (cli-lot4, D77)", () => {
  it("quietError — retire le message de texture absente de GLTFLoader (déjà dit par missing)", () => {
    const error = vi.fn();
    quietError(error)("THREE.GLTFLoader: Couldn't load texture", "blob:nodedata:1234");
    expect(error).not.toHaveBeenCalled();
    expect(THREE_ERRORS).toEqual(["THREE.GLTFLoader: Couldn't load texture"]);
  });
  it("quietError — garde tout autre message, préfixe lu au début du premier argument seul", () => {
    const error = vi.fn();
    const q = quietError(error);
    q("THREE.GLTFLoader: autre chose");
    q("erreur\nTHREE.GLTFLoader: Couldn't load texture");
    q(new Error("x"));
    expect(error.mock.calls.map((c) => String(c[0]))).toEqual(["THREE.GLTFLoader: autre chose", "erreur\nTHREE.GLTFLoader: Couldn't load texture", "Error: x"]);
  });
});
```

Dans `apps/cli/src/bin.test.ts`, remplacer `loadBin` (l. 15-34) par une version qui relève aussi les écouteurs
`uncaughtException` et `unhandledRejection` **sans les brancher sur le processus de test** (sinon ils captureraient les
erreurs de Vitest) :

```ts
type Listener = (...a: unknown[]) => void;
const CAUGHT = new Set(["exit", "uncaughtException", "unhandledRejection"]);

/** Importe `bin.ts` avec `main` remplacé ; rend les écouteurs `exit`, `uncaughtException`, `unhandledRejection` qu'il
 *  pose (jamais branchés sur le processus de test) ; les autres `process.on` passent. */
async function loadListeners(main: () => Promise<number>): Promise<Map<string, Listener>> {
  vi.resetModules();
  vi.doMock("./main", () => ({ main }));
  const caught = new Map<string, Listener>();
  const on = process.on.bind(process);
  const spy = vi.spyOn(process, "on").mockImplementation(((event: string | symbol, l: Listener) => {
    if (typeof event === "string" && CAUGHT.has(event)) caught.set(event, l);
    else on(event as never, l as never);
    return process;
  }) as never);
  try {
    await import("./bin");
  } finally {
    spy.mockRestore();
  }
  await new Promise((r) => setImmediate(r)); // une promesse réglée l'est avant la sortie : son `.then` est passé
  return caught;
}

async function loadBin(main: () => Promise<number>): Promise<ExitListener> {
  const listener = (await loadListeners(main)).get("exit");
  if (listener === undefined) throw new Error("bin.ts n'a posé aucun écouteur exit");
  return listener as ExitListener;
}
```

puis ajouter à la fin :

```ts
it("D77 — uncaughtException et unhandledRejection : une ligne {\"error\":{code:command, message:erreur interne : …}}, code 1, aucune pile", async () => {
  for (const event of ["uncaughtException", "unhandledRejection"]) {
    const listener = (await loadListeners(() => new Promise<number>(() => {}))).get(event);
    expect(listener, event).toBeDefined();
    const stderr: string[] = [];
    const write = vi.spyOn(process.stderr, "write").mockImplementation(((chunk: string | Uint8Array) => {
      stderr.push(String(chunk));
      return true;
    }) as never);
    const exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
    try {
      listener!(new Error("boum"));
      expect(exit).toHaveBeenCalledWith(1);
    } finally {
      write.mockRestore();
      exit.mockRestore();
    }
    expect(stderr.map((l) => JSON.parse(l) as unknown)).toEqual([{ error: { code: "command", message: "erreur interne : boum" } }]);
    expect(stderr.join("")).not.toMatch(/\n\s+at /);
  }
});
```

- [ ] **Étape 3 : rouge**

Run : `cd ~/projets/roomboard-wt/cli-lot4--T4 && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/model3d-node.test.ts src/quiet.test.ts src/bin.test.ts 2>&1 | tail -15`
Attendu : `model3d-node.test.ts` échoue (module absent), `quietError` absent, test D77 de `bin` en échec (écouteur absent).

- [ ] **Étape 4 : le module** — `apps/cli/src/model3d-node.ts`

```ts
/**
 * 3D de la CLI (cadrage cli-lot4, D67, D76, DA20) : le rendu partagé de la page (`createThreeModelView`) sans WebGL —
 * three valide le modèle, l'instantané est null, le produit dit `NO_WEBGL_MESSAGE` une fois (H44) — et le lecteur de ZIP
 * de la page en processus (`inlineWorker`, patron de `board-node.ts`). three attend trois globaux du navigateur (`self`,
 * `ProgressEvent`, `document.createElementNS` pour les images) : posés seulement s'ils manquent, le temps d'un
 * `view.load()`, puis retirés (pdf.js, évalué dans le même fichier construit, lit `self` et `document`). Les images ne
 * sont pas décodées : `load` si l'URL `blob:` a un contenu, `error` sinon (texture absente → `missing`).
 * Aucun `await` de premier niveau (piège du lot 3, `bin.ts`).
 */
import type { Model3dDeps } from "../../web/src/platform/model3d-handlers";
import { createModelViewLoader, type ModelView } from "../../web/src/platform/model-view";
import { inlineWorker } from "../../web/src/platform/one-shot-worker";
import { createZipReader } from "../../web/src/platform/zip-read";
import { zipJobReply, type ZipJob } from "../../web/src/platform/zip-worker";

type Slot = "self" | "ProgressEvent" | "document";
const slots = globalThis as unknown as Record<Slot, unknown>;

class NodeProgressEvent extends Event {
  readonly lengthComputable: boolean;
  readonly loaded: number;
  readonly total: number;
  constructor(type: string, init: { readonly lengthComputable?: boolean; readonly loaded?: number; readonly total?: number } = {}) {
    super(type);
    this.lengthComputable = init.lengthComputable ?? false;
    this.loaded = init.loaded ?? 0;
    this.total = init.total ?? 0;
  }
}

type ImageListener = (this: unknown, e: Event) => void;

/** Image sans canvas (D76) : `src` posé → `fetch` de l'URL ; contenu non vide → `load` (1 × 1), vide ou illisible → `error`. */
function nodeImage(): object {
  const on = new Map<string, ImageListener[]>();
  const img = {
    width: 1,
    height: 1,
    naturalWidth: 1,
    naturalHeight: 1,
    crossOrigin: null as string | null,
    addEventListener(type: string, cb: ImageListener): void {
      on.set(type, [...(on.get(type) ?? []), cb]);
    },
    removeEventListener(type: string, cb: ImageListener): void {
      on.set(type, (on.get(type) ?? []).filter((x) => x !== cb));
    },
    set src(url: string) {
      void fetch(url)
        .then((r) => r.arrayBuffer())
        .then(
          (b) => b.byteLength > 0,
          () => false,
        )
        .then((ok) => {
          const type = ok ? "load" : "error";
          for (const cb of on.get(type) ?? []) cb.call(img, new Event(type));
        });
    },
  };
  return img;
}

const BROWSER: Readonly<Record<Slot, unknown>> = Object.freeze({
  self: globalThis,
  ProgressEvent: NodeProgressEvent,
  document: Object.freeze({ createElementNS: (_ns: string, _name: string): object => nodeImage() }),
});

let depth = 0;
let posed: Slot[] = [];

/** D76 : `run` avec `self`, `ProgressEvent`, `document` posés s'ils manquent ; retirés à la fin du dernier `run` en cours. */
export async function withThreeGlobals<T>(run: () => Promise<T>): Promise<T> {
  if (depth === 0) {
    posed = (Object.keys(BROWSER) as Slot[]).filter((k) => !(k in globalThis));
    for (const k of posed) slots[k] = BROWSER[k];
  }
  depth++;
  try {
    return await run();
  } finally {
    depth--;
    if (depth === 0) {
      for (const k of posed) delete slots[k];
      posed = [];
    }
  }
}

/** Toile sans DOM : la vue n'y pose que ses écouteurs de perte de contexte ; aucun rendu. */
const nodeCanvas = (): HTMLCanvasElement => ({ addEventListener: () => undefined, removeEventListener: () => undefined }) as unknown as HTMLCanvasElement;

/** Dépendances 3D de `createImporter` (D67) : vue chargée au premier besoin, ZIP lu en processus. */
export function nodeModel3d(): Model3dDeps {
  const loader = createModelViewLoader(async (): Promise<ModelView> => {
    const { createThreeModelView } = await import("../../web/src/platform/model-view-three");
    const view = createThreeModelView({
      createCanvas: nodeCanvas,
      createRenderer: () => {
        throw new Error("aucun WebGL dans la CLI");
      },
      urls: { create: (b) => URL.createObjectURL(b), revoke: (u) => URL.revokeObjectURL(u) },
    });
    return { ...view, load: (src) => withThreeGlobals(() => view.load(src)) };
  });
  return {
    view: () => loader.load(),
    readZip: createZipReader(inlineWorker((m) => zipJobReply(m as ZipJob))),
  };
}
```

Si TypeScript refuse `{ ...view, load }` (méthodes d'une interface), écrire l'objet champ par champ : `available:
() => view.available()`, `draw: (m, v, px) => view.draw(m, v, px)`, `snapshot: (m, v, px) => view.snapshot(m, v, px)`,
`release: (m) => view.release(m)`, `onLost: (cb) => view.onLost(cb)`, `load: …`.

- [ ] **Étape 5 : `quietError`** — `apps/cli/src/quiet.ts`

Ajouter au commentaire de tête : « cli-lot4 (D77) : `console.error` filtré de même pour le seul message de texture
absente de GLTFLoader, déjà dit par `missing` (avis du produit) ; tout autre message passe. » Puis, après `quietWarn` :

```ts
/** cli-lot4 (D77) : préfixe du message de three retiré de `console.error`. */
export const THREE_ERRORS: readonly string[] = ["THREE.GLTFLoader: Couldn't load texture"];

export function quietError(error: (...a: unknown[]) => void): (...a: unknown[]) => void {
  return (...a) => {
    const first = a[0];
    if (typeof first === "string" && THREE_ERRORS.some((p) => first.startsWith(p))) return;
    error(...a);
  };
}
```

et, sous `console.warn = quietWarn(…)` :

```ts
console.error = quietError(console.error.bind(console));
```

- [ ] **Étape 6 : erreurs non rattrapées** — `apps/cli/src/bin.ts`

Ajouter l'import `import { messageOf } from "../../web/src/platform/controller";`, puis, juste après la déclaration
`let settled = false;` (et avant `process.on("exit", …)`) :

```ts
// cli-lot4 (D77) : une erreur jamais rattrapée (three, pdf.js, un écouteur) sort en une ligne `{"error":…}`, code 1,
// jamais en pile Node (D9) ; l'écriture atomique (D3) garantit qu'aucun fichier n'est à moitié écrit.
const fatal = (e: unknown): void => {
  settled = true;
  err(JSON.stringify({ error: new CliError("command", `erreur interne : ${messageOf(e)}`) }));
  process.exitCode = 1;
  process.exit(1);
};
process.on("uncaughtException", fatal);
process.on("unhandledRejection", fatal);
```

- [ ] **Étape 7 : vert, build, stderr vide, démarrage**

Run : `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/model3d-node.test.ts src/quiet.test.ts src/bin.test.ts 2>&1 | tail -15`
Attendu : `Test Files  3 passed`, aucun `FAIL `.
Si un format échoue sans WebGL (texture GLB, MTL), lire `model-view-three.ts:330-345` et `three/examples/jsm/loaders/
GLTFLoader.js` (chemin des images d'un bufferView : `self.URL.createObjectURL`, puis `TextureLoader` → `ImageLoader`
→ `document.createElementNS`) avant de toucher au code ; coupe G15 à 07:30.
Run : `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli test 2>&1 | tail -8` — aucun `FAIL ` (garde :
`pdf.test.ts`, `boards.test.ts`, `session.test.ts`).
Mesure du démarrage (D78) : avant = `node apps/cli/dist/roomboard.mjs version` construit à l'étape 1 sur la base (lancer
la même boucle juste après `pnpm install`, avant toute modification : `nice -n 10 pnpm --filter @roomboard/cli build`),
après = ci-dessous :
```bash
nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -3
node apps/cli/dist/roomboard.mjs formats 2>&1 >/dev/null | wc -c          # attendu : 0
for i in 1 2 3 4 5; do /usr/bin/time -f %e node apps/cli/dist/roomboard.mjs version 2>&1 >/dev/null | tail -1; done | sort -n | sed -n 3p   # médiane
```
Écrire les deux médianes au rapport (D78 ; au-delà de +0,3 s : le dire, sans autre changement).

- [ ] **Étape 8 : commit**

```bash
git add apps/cli/src/model3d-node.ts apps/cli/src/model3d-node.test.ts apps/cli/src/quiet.ts apps/cli/src/quiet.test.ts apps/cli/src/bin.ts apps/cli/src/bin.test.ts scripts/essais/fabriques/modeles.mjs scripts/essais/fabriques/modeles.d.mts
git commit --author "jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(cli): 3D dependencies without WebGL, scoped browser globals for three, JSON line on uncaught errors

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t5"></a>
### Tâche T5 — CLI médias et images : `media-node.ts` (`nodeMedia`, `headerBlocked`) ; parcours ISO partagé

**Objectif :** donner à la CLI la sonde des médias de `createImporter` (`probe`, `mediaUrls`) par un seul mécanisme
d'URL, celui de Node (`URL.createObjectURL`, `resolveObjectURL`), qui lit l'en-tête par `readMediaHeader` (poster nul) ;
et le pré-contrôle `headerBlocked` (code 3 avant toute écriture pour une image ou un média d'en-tête illisible). Brancher
`media-header.ts` sur `isoBoxes` d'`image-size.ts` (un seul parcours de boîtes ISO). Cadrage : D60, D62, D65, DA17,
DA20, H45, H47 ; S3, S5.

**Fichiers :**
- Créer : `apps/cli/src/media-node.ts`, `apps/cli/src/media-node.test.ts`
- Modifier : `apps/web/src/platform/media-header.ts` (retirer le `isoBoxes` local et l'interface `IsoBox` locale, importer
  ceux d'`image-size.ts`)

**Interfaces :**
- Consomme (T2) : `isoBoxes(b: Uint8Array, from: number, to: number): Generator<IsoBox>`, `IsoBox` (`apps/web/src/platform/image-size.ts`) ;
  `probeSize` étendu ; fabriques `gif`, `svg`, `heif` (`scripts/essais/fabriques/images.mjs`).
- Consomme (T3) : `readMediaHeader(bytes, format): MediaHeader | null` (`apps/web/src/platform/media-header.ts`) ; fabriques
  `wav`, `mp4`, `mp4Broken`, `webm` (`scripts/essais/fabriques/medias.mjs`).
- Réutilise : `apps/web/src/platform/media-import.ts:68` — `sniffMedia(head, name)` ; `:15` — `MEDIA_MIME` ; `MediaProbe`
- Réutilise : `apps/web/src/platform/media-import.ts:307` — `mediaHandler` (par `createImporter({ probe, mediaUrls })`, `import.ts:74-79`, branché par T7)
- Réutilise : `apps/web/src/platform/image-import.ts:51` — `sniffImage(head, name)` ; `:100` — `probeSize(blob, kind)` ; `HEAD_BYTES`
- Réutilise : `apps/cli/src/formats.ts` — `formatOf(name)` (lecture seule, aucune modification)
- Produit (lu par T7) :
  ```ts
  // apps/cli/src/media-node.ts
  export function nodeMedia(): { readonly probe: (url: string) => Promise<MediaProbe>; readonly mediaUrls: { create(b: Blob): string; revoke(u: string): void } };
  export async function headerBlocked(name: string, bytes: Uint8Array): Promise<string | null>;
  // messages exacts (D62, D65) :
  //   « <nom> : durée du média illisible dans l'en-tête (la CLI ne décode pas les médias) »
  //   « <nom> : taille de l'image <kind> illisible dans l'en-tête (la CLI ne décode pas les images) »
  ```

**Contraintes (recopiées de Global Constraints) :**
- G1 — TDD : test rouge d'abord. Aucun test désactivé ni sauté, aucun seuil baissé ou relevé, aucun délai de test
  existant relevé ; un test qui échoue sur un délai est rejoué une fois.
- G2 — VM partagée : builds et tests en `nice -n 10` ; avant toute commande : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- G5 — Fichiers d'essai fabriqués par le code (`images.mjs`, `medias.mjs`) ; aucun fichier téléchargé ; rien de
  `~/telechargements-roomboard/` ; écritures seulement sous `tmpDir()`.
- G6 — Aucun crate Wasm touché ; tailles Wasm inchangées.
- G7 — Aucune dépendance ajoutée ; aucune AGPL/GPL/LGPL ; aucune installation de paquet système.
- G8 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais terminés par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un ; jamais `--force`.
- G10 — Aucune logique de format dans `apps/cli` : la sonde et le contrôle appellent `readMediaHeader`, `sniffMedia`,
  `sniffImage`, `probeSize` ; aucune règle d'en-tête recopiée.
- G11 — Tests `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli test`.
- G12 — Worktree isolé neuf : `cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r
  /home/adminjd/projets/roomboard-wt/cli-lot4/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot4/apps/web/src/wasm-formats
  apps/web/src/`.
- G13 — Aucun `console.*` ajouté au code de la CLI.
- G15 — Coupe H48 à 07:30 : un format laissé de côté par T2 ou T3 est dit au rapport (T7 l'écrit).

**Interdits :** toucher `importer.ts` ou `formats.ts` (T7) ; `linkMedia` (D60 : tout média est inclus, 100 Mo au plus) ;
une seconde table d'URL (D60 : un seul mécanisme, celui de Node) ; lire l'extension pour choisir le lecteur (RF4 : les
octets décident, l'extension ne fait que filtrer les sources contrôlées, H47).

**Terminé quand :** `media-node.test.ts` vert (≥ 9 tests) ; `media-header.test.ts` toujours vert après le branchement sur
`isoBoxes` ; `grep -c "function\* isoBoxes" apps/web/src/platform/media-header.ts` → `0`. Rapport : `Réutilisation :
appelé readMediaHeader, sniffMedia, sniffImage, probeSize, isoBoxes`.

**Étapes :**

- [ ] **Étape 1 : tests rouges** — `apps/cli/src/media-node.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { gif, svg } from "../../../scripts/essais/fabriques/images.mjs";
import { mp4, mp4Broken, wav, webm } from "../../../scripts/essais/fabriques/medias.mjs";
import { headerBlocked, nodeMedia } from "./media-node";

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);
const DURATION = (n: string) => `${n} : durée du média illisible dans l'en-tête (la CLI ne décode pas les médias)`;
const SIZE = (n: string, k: string) => `${n} : taille de l'image ${k} illisible dans l'en-tête (la CLI ne décode pas les images)`;

describe("nodeMedia (cli-lot4, D60)", () => {
  it("nodeMedia — probe d'une URL de mediaUrls : MP4 2,5 s 640 × 360, poster nul (S3)", async () => {
    const m = nodeMedia();
    const url = m.mediaUrls.create(new Blob([mp4({ duration: 2.5, width: 640, height: 360 }) as BlobPart], { type: "video/mp4" }));
    try {
      expect(await m.probe(url)).toEqual({ duration: 2.5, width: 640, height: 360, poster: null });
    } finally {
      m.mediaUrls.revoke(url);
    }
  });
  it("nodeMedia — WAV 1 s : son 0 × 0 ; WebM 3,2 s 320 × 240", async () => {
    const m = nodeMedia();
    const a = m.mediaUrls.create(new Blob([wav(1) as BlobPart], { type: "audio/wav" }));
    const v = m.mediaUrls.create(new Blob([webm({ duration: 3.2, width: 320, height: 240 }) as BlobPart], { type: "video/webm" }));
    expect(await m.probe(a)).toEqual({ duration: 1, width: 0, height: 0, poster: null });
    expect(await m.probe(v)).toEqual({ duration: 3.2, width: 320, height: 240, poster: null });
    m.mediaUrls.revoke(a);
    m.mediaUrls.revoke(v);
  });
  it("nodeMedia — URL révoquée, type inconnu ou en-tête illisible : rejet (mediaHandler dit « codec non lu »)", async () => {
    const m = nodeMedia();
    const url = m.mediaUrls.create(new Blob([wav(1) as BlobPart], { type: "audio/wav" }));
    m.mediaUrls.revoke(url);
    await expect(m.probe(url)).rejects.toThrow();
    const untyped = m.mediaUrls.create(new Blob([wav(1) as BlobPart]));
    await expect(m.probe(untyped)).rejects.toThrow();
    const broken = m.mediaUrls.create(new Blob([mp4Broken() as BlobPart], { type: "video/mp4" }));
    await expect(m.probe(broken)).rejects.toThrow();
  });
});

describe("headerBlocked (cli-lot4, D62, D65, DA17, H47)", () => {
  it("headerBlocked — S3 : casse.mp4 (ftyp sans moov) → message de durée", async () =>
    expect(await headerBlocked("/tmp/x/casse.mp4", mp4Broken())).toBe(DURATION("casse.mp4")));
  it("headerBlocked — S5 : casse.gif (en-tête tronqué) → message de taille « gif »", async () =>
    expect(await headerBlocked("casse.gif", enc("GIF89a"))).toBe(SIZE("casse.gif", "gif")));
  it("headerBlocked — fichiers lisibles : null", async () => {
    for (const [name, bytes] of [["i.gif", gif(3, 4)], ["son.wav", wav(1)], ["clip.mp4", mp4({ duration: 1, width: 8, height: 8 })], ["vb.svg", svg('viewBox="0 0 400 100"')]] as const) {
      expect(await headerBlocked(name, bytes), name).toBeNull();
    }
  });
  it("headerBlocked — extensions hors image et média : null même illisible (tableau, PDF, fichier lié 3D, Office)", async () => {
    expect(await headerBlocked("a.iwb", enc("GIF89a"))).toBeNull();
    expect(await headerBlocked("tri.bin", Uint8Array.of(0xff, 0xe2, 0, 0))).toBeNull();
    expect(await headerBlocked("x.pdf", enc("GIF89a"))).toBeNull();
    expect(await headerBlocked("x.docx", mp4Broken())).toBeNull();
  });
  it("headerBlocked — extension absente de la table (.dat) : contrôlée par ses octets", async () => {
    expect(await headerBlocked("x.dat", mp4Broken())).toBe(DURATION("x.dat"));
    expect(await headerBlocked("notes.txt", enc("bonjour"))).toBeNull();
  });
  it("RF4 — x.png qui contient un GIF : taille du GIF lue, aucun code 3 ; GIF tronqué nommé .png : message « gif »", async () => {
    expect(await headerBlocked("x.png", gif(5, 6))).toBeNull();
    expect(await headerBlocked("x.png", enc("GIF89a"))).toBe(SIZE("x.png", "gif"));
  });
});
```

- [ ] **Étape 2 : rouge**

Run : `cd ~/projets/roomboard-wt/cli-lot4--T5 && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/media-node.test.ts 2>&1 | tail -10`
Attendu : échec (module `./media-node` absent).

- [ ] **Étape 3 : le module** — `apps/cli/src/media-node.ts`

```ts
/**
 * Médias et en-têtes d'images dans la CLI (cadrage cli-lot4, D60, D62, D65, DA17, DA20). `nodeMedia` : `probe` et
 * `mediaUrls` de `createImporter` par un seul mécanisme d'URL, celui de Node (`URL.createObjectURL`, `resolveObjectURL`) ;
 * la sonde lit l'en-tête (`readMediaHeader`, format tiré du type que `mediaHandler` pose sur le Blob, `MEDIA_MIME`),
 * sans poster (rien ne décode). `headerBlocked` : avant `createImporter`, une image ou un média dont l'en-tête est
 * illisible sort en code 3 (message rendu ici, levé par `importInto`) ; seules les extensions au lecteur `image` ou
 * `media` de `FORMAT_LOTS`, ou absentes de la table, sont contrôlées (H47) ; les octets décident du lecteur (RF4).
 */
import { resolveObjectURL } from "node:buffer";
import { basename } from "node:path";
import { HEAD_BYTES, probeSize, sniffImage } from "../../web/src/platform/image-import";
import { readMediaHeader } from "../../web/src/platform/media-header";
import { MEDIA_MIME, sniffMedia, type MediaFormat, type MediaProbe } from "../../web/src/platform/media-import";
import { formatOf } from "./formats";

const formatOfMime = (mime: string): MediaFormat | null =>
  (Object.entries(MEDIA_MIME) as Array<[MediaFormat, string]>).find(([, m]) => m === mime)?.[0] ?? null;

export function nodeMedia(): { readonly probe: (url: string) => Promise<MediaProbe>; readonly mediaUrls: { create(b: Blob): string; revoke(u: string): void } } {
  return {
    async probe(url) {
      const blob = resolveObjectURL(url);
      if (blob === undefined) throw new Error(`média introuvable : ${url}`);
      const format = formatOfMime(blob.type);
      const header = format === null ? null : readMediaHeader(new Uint8Array(await blob.arrayBuffer()), format);
      if (header === null) throw new Error("durée du média illisible dans l'en-tête");
      return { duration: header.duration, width: header.width, height: header.height, poster: null };
    },
    mediaUrls: { create: (b) => URL.createObjectURL(b), revoke: (u) => URL.revokeObjectURL(u) },
  };
}

/** Message du code 3 d'une source d'en-tête illisible, ou null (DA17). */
export async function headerBlocked(name: string, bytes: Uint8Array): Promise<string | null> {
  const handler = formatOf(name)?.handler;
  if (handler !== undefined && handler !== "image" && handler !== "media") return null;
  const base = basename(name);
  const head = bytes.subarray(0, HEAD_BYTES);
  const media = sniffMedia(head, base);
  if (media !== null && "format" in media) {
    return readMediaHeader(bytes, media.format) === null ? `${base} : durée du média illisible dans l'en-tête (la CLI ne décode pas les médias)` : null;
  }
  const kind = sniffImage(head, base);
  if (kind === null) return null;
  return (await probeSize(new Blob([bytes as BlobPart]), kind)) === null ? `${base} : taille de l'image ${kind} illisible dans l'en-tête (la CLI ne décode pas les images)` : null;
}
```

Note : `resolveObjectURL` rend un `Blob` de `node:buffer` (même classe que le `Blob` global de Node 22) ; le type posé par
`mediaHandler` (`new Blob([…], { type: sniff.mime })`) s'y retrouve. `formatOfMime` : les sept MIME de `MEDIA_MIME` sont
distincts (`video/mp4` pour `mp4`, `audio/mp4` pour `m4a`).

- [ ] **Étape 4 : vert**

Run : `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run --reporter=verbose src/media-node.test.ts 2>&1 | tail -30`
Attendu : `Test Files  1 passed`, ≥ 9 lignes `✓`, dont `headerBlocked — S3 : casse.mp4` et `RF4 — x.png qui contient un GIF`.

- [ ] **Étape 5 : un seul parcours ISO** — `apps/web/src/platform/media-header.ts`

Supprimer l'interface locale `IsoBox` et la fonction locale `isoBoxes` (bloc « Boîtes ISO entre `from` et `to` … »),
puis ajouter en tête :

```ts
import { isoBoxes, type IsoBox } from "./image-size";
```

(`u64be` reste utilisé par `mvhdSeconds`.)
Run : `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/media-header.test.ts src/platform/image-size.test.ts 2>&1 | tail -6` — `Test Files  2 passed`.
Run : `grep -c "function\* isoBoxes" apps/web/src/platform/media-header.ts` → `0` ; `nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | tail -3` — aucune erreur.

- [ ] **Étape 6 : garde et commit**

Run : `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli test 2>&1 | tail -8` — aucun `FAIL `.

```bash
git add apps/cli/src/media-node.ts apps/cli/src/media-node.test.ts apps/web/src/platform/media-header.ts
git commit --author "jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(cli): media probe from headers through Node object URLs; header pre-check for images and media

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t6"></a>
### Tâche T6 — CLI Office : `office-node.ts` (binaire, `--check`, signaux D79), `readDoc`, `convert`, aide

**Objectif :** la CLI trouve le binaire `roomboard-office` (T1), le sonde une fois par processus (`--check`, racine de
travail), convertit un fichier Office en PDF par lui seul (jamais de LibreOffice lancé depuis Node), et ouvre le PDF par
le chemin du lot 3 avec l'original gardé (`readPdfFile` du produit). `state`, `convert` et `tab.open` lisent un fichier
Office (onglet sans fichier) ; `convert x.docx y.roomboard` passe de 2 à 0. Un Ctrl-C pendant une conversion est
transmis au binaire, puis les restes de LibreOffice de cette conversion sont tués. Cadrage : D54 à D59, D72, D79, DA16,
DA17, DA20, H41, H46, H49, H50 ; S1, S2.

**Patron à ne pas reprendre :** (1) lancer `soffice` depuis Node ou recopier une règle de `office.rs` (profil jetable,
délai, racine) : tout passe par le binaire, la CLI ne lit que son code de sortie, le premier mot de stderr et la ligne
`racine :` de `--check` ; (2) le chemin `readDoc` qui contrôle le convertisseur **avant** de lire le fichier : ici on lit
d'abord (un `.docx` absent reste une erreur `io`, code 1, `guards.test.ts`), seul `import` contrôle avant toute lecture
(T7) ; (3) tuer « tous les soffice » : seuls les processus dont la ligne de commande cite `<racine>/conversions/<pid du
binaire>-` sont visés (G4). Chemins de référence : la page câble l'Office en `apps/web/src/app/workspace.ts:461-465`
(`openOffice: (f) => ws.openPdf({ name: f.name, blob: f.pdf, original: f.original })`) ; l'original est gardé par
`apps/web/src/app/pdf-convert.ts:65-72` ; le message d'échec vient de `apps/web/src/platform/office-import.ts:73`.

**Fichiers :**
- Créer : `apps/cli/src/office-node.ts`, `apps/cli/src/office-node.test.ts`, `apps/cli/src/office.test.ts`
- Modifier : `apps/cli/src/session.ts:1-10,50-66,96-107,171-204,231,388-420` (en-tête, `SessionDeps.env`, interface
  `openPdf`, `readPdfNoticed`, `readDoc`, `open`, `openPdf`, `nodeSession`)
- Modifier : `apps/cli/src/exporter.ts:98,105` (`CONVERT_SOURCES`, commentaire de `checkConvert`)
- Modifier : `apps/cli/src/main.ts:32,37,46` (`USAGE.state`, `USAGE.convert`, `ENV`), `apps/cli/src/main.test.ts:36,41-42`
- Modifier : `apps/cli/src/guards.test.ts:48-56`, `apps/cli/src/convert.test.ts:115-122`

**Interfaces :**
- Consomme (T1) : binaire `target/debug/roomboard-office` (contrat DA16 de la section T1 : `--check` → 0 avec
  `convertisseur : …` puis `racine : <racine>`, 3 sans LibreOffice ; conversion → 0, 1 avec `<code>[ : détail]` en
  stderr, 3 `no-program`).
- Réutilise : `apps/web/src/platform/office-import.ts:30` — `OfficeConvertError(code)` ; `:73` — `convertFailureMessage(name, code)` ; `:14` — `OFFICE_EXTENSIONS`
- Réutilise : `apps/web/src/platform/import.ts:222` — `isSheetName(name)` (sources de `convert`, D58, D59)
- Réutilise (étendu) : `apps/cli/src/exporter.ts:98` + `apps/web/src/platform/office-import.ts:14` — `CONVERT_SOURCES` gagne `OFFICE_EXTENSIONS.filter((e) => !isSheetName("x" + e))` (aucune liste recopiée)
- Réutilise : `apps/web/src/app/pdf-convert.ts:49` — `readPdfFile({ name, blob, original }, deps)` par `readPdfNoticed` (étendu de `original?`)
- Réutilise : `crates/roomboard-shell/src/office.rs:195,570,615,644` — par le binaire seulement (jamais appelé ni recopié en Node)
- Produit (lu par T7) :
  ```ts
  // apps/cli/src/office-node.ts
  export type Env = Readonly<Record<string, string | undefined>>;
  export type OfficeReady = { readonly root: string } | { readonly reason: string };
  export const BINARY_MISSING: string; // « convertisseur roomboard-office introuvable (cargo build -p roomboard-shell --bin roomboard-office, ou ROOMBOARD_OFFICE=<chemin>) »
  export const NO_SOFFICE: string;     // « LibreOffice introuvable (soffice ou libreoffice dans le PATH) »
  export function unavailableMessage(name: string, reason: string): string; // « <base> : conversion Office indisponible : <raison> »
  export function officeBinary(env?: Env): string | null;
  export function officeReady(env?: Env): Promise<OfficeReady>;              // `--check` une fois par binaire et par processus
  export async function checkOffice(sources: readonly string[], env?: Env): Promise<void>; // CliError("unsupported") si une source au lecteur `office` et pas de convertisseur
  export async function convertOfficeFile(path: string, env?: Env, onInterrupt?: (sig: NodeJS.Signals, code: number) => void): Promise<Blob>; // rejette OfficeConvertError(code)
  export const interruptedExitCode: (sig: NodeJS.Signals) => number;                     // 130 (SIGINT), 143 (SIGTERM)
  export function exitInterrupted(sig: NodeJS.Signals, code: number): void;              // ligne {"error":…} puis process.exit(code)
  export function killLeftovers(root: string, pid: number, procDir?: string, kill?: (pid: number, sig: NodeJS.Signals) => void): number[];
  // apps/cli/src/session.ts
  SessionDeps.env?: Readonly<Record<string, string | undefined>>;                        // posé par nodeSession (io.env)
  Session.openPdf(file: { readonly name: string; readonly blob: Blob; readonly original?: Blob }): Promise<boolean>;
  ```

**Contraintes (recopiées de Global Constraints) :**
- G1 — TDD : test rouge d'abord. Aucun test désactivé ni sauté, aucun seuil baissé ou relevé, aucun délai de test
  existant relevé ; un test qui échoue sur un délai est rejoué une fois. Tests réels sautés seulement sous
  `ROOMBOARD_SANS_SOFFICE=1` (D54, convention du dépôt) ; un test neuf qui lance LibreOffice porte son propre délai
  (`{ timeout: 180_000 }`), aucun délai existant relevé.
- G2 — VM partagée : builds et tests en `nice -n 10`, cargo en `-j 4` ; avant toute commande :
  `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- G3 — `roomboard-shell` : seulement `nice -n 10 cargo build -p roomboard-shell --bin roomboard-office -j 4` dans cette
  tâche ; aucun `tauri build`, aucun bundle, aucun build Android.
- G4 — LibreOffice en `--headless` (posé par le binaire) ; chaque processus lancé est fermé ; aucun `soffice` vivant
  après un test (le test le vérifie). Ne tuer aucun processus non lancé par soi (`glycin-svg` compris).
- G5 — Fichiers d'essai : fixtures suivies `crates/roomboard-shell/tests/fixtures/{cours.docx,diapos.pptx}`, copiées sous
  `tmpDir()` si renommées ; faux binaires (scripts `sh`) écrits sous `tmpDir()` ; aucun fichier téléchargé ; rien de
  `~/telechargements-roomboard/`.
- G6 — Aucun crate Wasm touché ; tailles Wasm inchangées.
- G7 — Aucune dépendance ajoutée ; aucune AGPL/GPL/LGPL (LibreOffice reste un programme externe) ; aucune installation de
  paquet système.
- G8 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais terminés par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un ; jamais `--force`.
- G9 — D15 : les formats Office changent de comportement dans `convert` et `state` ; `FORMAT_LOTS` et `cli-essai.mjs` sont
  mis à jour par T7 et T8 (ne pas les toucher ici).
- G10 — La CLI appelle le code de la page (`readPdfFile`, `convertFailureMessage`, `OfficeConvertError`) et de la coque
  (le binaire), jamais une copie.
- G11 — Construction de la CLI : `nice -n 10 pnpm --filter @roomboard/cli build` ; tests `ROOMBOARD_WASM_REQUIRED=1 nice -n
  10 pnpm --filter @roomboard/cli test`.
- G12 — Worktree isolé neuf : `cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r
  /home/adminjd/projets/roomboard-wt/cli-lot4/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot4/apps/web/src/wasm-formats
  apps/web/src/`, puis `nice -n 10 cargo build -p roomboard-shell --bin roomboard-office -j 4` (le binaire est lu dans
  `target/debug/` du worktree, D55).
- G13 — stderr de la CLI réservé à la ligne `{"error":…}` : aucun `console.*` ajouté ; la seule écriture directe sur
  `process.stderr` est la ligne `{"error":…}` d'une conversion interrompue (D79, `exitInterrupted`, appelée après le
  retrait du dossier `mkdtemp` : aucun `process.exit` dans la promesse de conversion).
- G14 — Aucun import neuf entre `import.ts` et `office-import.ts`.

**Interdits :** toucher `importer.ts` ou `formats.ts` (T7) ; lancer `soffice`/`libreoffice` depuis Node ; un délai propre
côté Node (H46 : 120 s du binaire) ; `shell: true` ou une chaîne de commande (RF2 : `spawn`/`execFile` avec un tableau
d'arguments) ; `process.kill` d'un pid qui ne cite pas la conversion du binaire lancé.

**Terminé quand :** le test réel `D79 — SIGINT dès que LibreOffice cite la racine` vert (code 130, aucun processus restant,
aucun dossier `roomboard-office-*` laissé) ; `office-node.test.ts`, `office.test.ts`, `guards.test.ts`, `convert.test.ts`, `main.test.ts` verts avec
le vrai binaire et le vrai LibreOffice ; aucun `soffice` dont la ligne de commande cite un dossier de test après la suite ;
suite CLI entière verte. Rapport : `Réutilisation : appelé readPdfFile (original), convertFailureMessage,
OfficeConvertError, OFFICE_EXTENSIONS, isSheetName ; binaire roomboard-office`.

**Étapes :**

- [ ] **Étape 1 : worktree et binaire**

```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
cd ~/projets/roomboard-wt/cli-lot4--T6
pnpm install --frozen-lockfile 2>&1 | tail -3
cp -r /home/adminjd/projets/roomboard-wt/cli-lot4/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot4/apps/web/src/wasm-formats apps/web/src/
nice -n 10 cargo build -p roomboard-shell --bin roomboard-office -j 4 2>&1 | tail -2
./target/debug/roomboard-office --check     # attendu : « convertisseur : … » puis « racine : … », code 0
```

- [ ] **Étape 2 : tests unitaires rouges** — `apps/cli/src/office-node.test.ts`

```ts
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { OfficeConvertError } from "../../web/src/platform/office-import";
import { CliError } from "./contract";
import { BINARY_MISSING, checkOffice, convertOfficeFile, killLeftovers, NO_SOFFICE, officeBinary, officeReady } from "./office-node";
import { tmpDir } from "./testing";

/** Faux binaire `sh` : `--check` rend `check` (code, et la racine `root` sur stdout si 0) ; une conversion rend `convert`. */
function fakeBinary(dir: string, o: { check: number; convert?: string; log?: string }): string {
  const bin = join(dir, "faux-office");
  const log = o.log === undefined ? "" : `echo "$1" >> '${o.log}'\n`;
  const check = o.check === 0 ? `echo "convertisseur : /faux/soffice"; echo "racine : ${join(dir, "racine")}"; exit 0` : `echo "no-program : installez LibreOffice ou Microsoft Office" >&2; exit ${o.check}`;
  writeFileSync(bin, `#!/bin/sh\n${log}if [ "$1" = "--check" ]; then ${check}; fi\n${o.convert ?? "exit 1"}\n`);
  chmodSync(bin, 0o755);
  return bin;
}

describe("officeBinary (cli-lot4, D55, H41)", () => {
  it("officeBinary — ROOMBOARD_OFFICE présent : ce chemin ; absent du disque : null", () => {
    const dir = tmpDir();
    const bin = fakeBinary(dir, { check: 0 });
    expect(officeBinary({ ROOMBOARD_OFFICE: bin })).toBe(bin);
    expect(officeBinary({ ROOMBOARD_OFFICE: join(dir, "absent") })).toBeNull();
  });
  it("officeBinary — sans variable : target/debug/roomboard-office du dépôt (construit à l'étape 1)", () => {
    const found = officeBinary({});
    expect(found).not.toBeNull();
    expect(found!.endsWith(join("target", "debug", "roomboard-office"))).toBe(true);
    expect(existsSync(found!)).toBe(true);
  });
});

describe("officeReady et checkOffice (cli-lot4, D56, DA17)", () => {
  it("officeReady — binaire qui rend 0 : racine lue sur --check ; lancé une seule fois par processus", async () => {
    const dir = tmpDir();
    const log = join(dir, "appels.log");
    const env = { ROOMBOARD_OFFICE: fakeBinary(dir, { check: 0, log }) };
    expect(await officeReady(env)).toEqual({ root: join(dir, "racine") });
    expect(await officeReady(env)).toEqual({ root: join(dir, "racine") });
    expect(readFileSync(log, "utf8")).toBe("--check\n");
  });
  it("officeReady — binaire qui rend 3 : LibreOffice introuvable ; binaire absent : convertisseur introuvable", async () => {
    const dir = tmpDir();
    expect(await officeReady({ ROOMBOARD_OFFICE: fakeBinary(dir, { check: 3 }) })).toEqual({ reason: NO_SOFFICE });
    expect(await officeReady({ ROOMBOARD_OFFICE: join(dir, "absent") })).toEqual({ reason: BINARY_MISSING });
  });
  it("S2 — checkOffice : .docx sans binaire → CliError unsupported (code 3), message de DA17", async () => {
    const env = { ROOMBOARD_OFFICE: join(tmpDir(), "absent") };
    const e = await checkOffice(["/x/a.png", "/x/cours.docx"], env).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(CliError);
    expect(e).toMatchObject({ code: "unsupported", exit: 3, message: `cours.docx : conversion Office indisponible : ${BINARY_MISSING}` });
  });
  it("D58 — checkOffice : aucune source Office (.xlsx compris) → rien lancé, aucune erreur", async () => {
    const env = { ROOMBOARD_OFFICE: join(tmpDir(), "absent") };
    await expect(checkOffice(["/x/a.png", "/x/valeurs.xlsx", "/x/b.xlsm"], env)).resolves.toBeUndefined();
  });
});

describe("convertOfficeFile (cli-lot4, D57)", () => {
  it("convertOfficeFile — échec du binaire : OfficeConvertError avec le premier mot de stderr", async () => {
    const dir = tmpDir();
    const env = { ROOMBOARD_OFFICE: fakeBinary(dir, { check: 0, convert: `echo "timeout" >&2; exit 1` }) };
    await expect(convertOfficeFile(join(dir, "x.docx"), env)).rejects.toEqual(new OfficeConvertError("timeout"));
    const env2 = { ROOMBOARD_OFFICE: fakeBinary(tmpDir(), { check: 0, convert: `echo "failed : boum" >&2; exit 1` }) };
    await expect(convertOfficeFile(join(dir, "x.docx"), env2)).rejects.toMatchObject({ code: "failed" });
  });
  it("convertOfficeFile — succès : le PDF écrit par le binaire, en Blob application/pdf", async () => {
    const dir = tmpDir();
    const env = { ROOMBOARD_OFFICE: fakeBinary(dir, { check: 0, convert: `printf '%%PDF-1.7 faux' > "$2"; exit 0` }) };
    const pdf = await convertOfficeFile(join(dir, "x.docx"), env);
    expect(pdf.type).toBe("application/pdf");
    expect(new TextDecoder().decode(await pdf.arrayBuffer())).toBe("%PDF-1.7 faux");
  });
  it("convertOfficeFile — binaire qui rend 3 à la conversion : OfficeConvertError no-program (H49)", async () => {
    const dir = tmpDir();
    const env = { ROOMBOARD_OFFICE: fakeBinary(dir, { check: 0, convert: `echo "no-program : installez LibreOffice ou Microsoft Office" >&2; exit 3` }) };
    await expect(convertOfficeFile(join(dir, "x.docx"), env)).rejects.toMatchObject({ code: "no-program" });
  });
});

describe("officeReady, clé du cache (cli-lot4, D79)", () => {
  it("officeReady — même binaire, autre XDG_CACHE_HOME : --check relancé, racine de cet environnement", async () => {
    const dir = tmpDir();
    const log = join(dir, "appels.log");
    const bin = join(dir, "faux-office");
    writeFileSync(bin, `#!/bin/sh\necho "$1" >> '${log}'\necho "racine : $XDG_CACHE_HOME/roomboard-office"\nexit 0\n`);
    chmodSync(bin, 0o755);
    const a = await officeReady({ ROOMBOARD_OFFICE: bin, XDG_CACHE_HOME: join(dir, "a") });
    const b = await officeReady({ ROOMBOARD_OFFICE: bin, XDG_CACHE_HOME: join(dir, "b") });
    expect([a, b]).toEqual([{ root: join(dir, "a", "roomboard-office") }, { root: join(dir, "b", "roomboard-office") }]);
    expect(readFileSync(log, "utf8")).toBe("--check\n--check\n");
  });
});

describe("Ctrl-C, faux binaire (cli-lot4, D79)", () => {
  it("D79 — SIGINT transmis : onInterrupt(SIGINT, 130) après le retrait du dossier mkdtemp", async () => {
    const dir = tmpDir();
    const mark = join(dir, "lance");
    const bin = fakeBinary(dir, { check: 0, convert: `echo go > '${mark}'\nexec sleep 30` });
    const temp = (): string[] => readdirSync(tmpdir()).filter((n) => n.startsWith("roomboard-office-"));
    const before = new Set(temp());
    const onInterrupt = vi.fn();
    const pending = convertOfficeFile(join(dir, "x.docx"), { ROOMBOARD_OFFICE: bin }, onInterrupt).catch((e: unknown) => e);
    for (let i = 0; i < 100 && !existsSync(mark); i++) await new Promise((r) => setTimeout(r, 50));
    process.emit("SIGINT");
    expect(await pending).toEqual(new OfficeConvertError("interrupted"));
    expect(onInterrupt).toHaveBeenCalledWith("SIGINT", 130);
    expect(temp().filter((n) => !before.has(n))).toEqual([]);
  });
});

describe("killLeftovers (cli-lot4, D79, G4)", () => {
  it("D79 — seuls les processus qui citent <racine>/conversions/<pid>- sont tués (groupe d'abord)", () => {
    const proc = tmpDir();
    const root = join(tmpDir(), "racine");
    const cmd = (pid: string, line: string): void => {
      mkdirSync(join(proc, pid));
      writeFileSync(join(proc, pid, "cmdline"), line.replaceAll(" ", "\0"));
    };
    cmd("100", `soffice --headless -env:UserInstallation=file://${root}/conversions/77-1/profile ${root}/conversions/77-1/source.docx`);
    cmd("101", `soffice --headless ${root}/conversions/78-1/source.docx`);
    cmd("102", "glycin-svg --sandbox");
    mkdirSync(join(proc, "self"));
    const calls: Array<[number, string]> = [];
    const kill = (p: number, s: NodeJS.Signals): void => {
      calls.push([p, s]);
    };
    expect(killLeftovers(root, 77, proc, kill)).toEqual([100]);
    expect(calls).toEqual([[-100, "SIGKILL"]]);
  });
  it("D79 — pas de /proc (hors Linux) : rien tué", () => expect(killLeftovers("/r", 1, join(tmpDir(), "absent"), () => undefined)).toEqual([]));
});
```

- [ ] **Étape 3 : tests de scénario rouges** — `apps/cli/src/office.test.ts`

```ts
// S1, S2 (cadrage cli-lot4) par `convert` et `state` : vrai binaire roomboard-office (target/debug, construit par
// `cargo build -p roomboard-shell --bin roomboard-office`) et vrai LibreOffice ; `ROOMBOARD_SANS_SOFFICE=1` saute les
// cas réels (D54). Racine de travail sous un XDG_CACHE_HOME jetable ; après chaque cas : `conversions/` vide, aucun
// processus ne cite ce dossier (G4). T7 ajoute les cas `import`.
import { chmodSync, copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { describe, expect, it, vi } from "vitest";
import { OfficeConvertError } from "../../web/src/platform/office-import";
import { main } from "./main";
import { BINARY_MISSING, convertOfficeFile, NO_SOFFICE } from "./office-node";
import { describeWasm, memoryIO, tmpDir, type Json } from "./testing";

const REAL = process.env["ROOMBOARD_SANS_SOFFICE"] !== "1";
const itReal = REAL ? it : it.skip; // D54
const FIX = fileURLToPath(new URL("../../../crates/roomboard-shell/tests/fixtures/", import.meta.url));
const SLOW = { timeout: 180_000 };
const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

/** Processus vivants dont la ligne de commande cite `needle` (Linux). */
function processesWith(needle: string): string[] {
  let names: string[];
  try {
    names = readdirSync("/proc").filter((n) => /^\d+$/.test(n));
  } catch {
    return [];
  }
  return names.flatMap((n) => {
    try {
      const c = readFileSync(join("/proc", n, "cmdline"), "latin1").replaceAll("\0", " ");
      return c.includes(needle) ? [c] : [];
    } catch {
      return [];
    }
  });
}

function scratch(): { dir: string; cache: string; env: Record<string, string> } {
  const dir = tmpDir();
  const cache = join(dir, "cache");
  return { dir, cache, env: { XDG_CACHE_HOME: cache } };
}

function cleanAfter(cache: string): void {
  const conv = join(cache, "roomboard-office", "conversions");
  expect(existsSync(conv) ? readdirSync(conv) : []).toEqual([]);
  expect(processesWith(cache)).toEqual([]);
}

describeWasm("S1 — Office converti, puis chemin PDF (convert, state)", () => {
  itReal("S1 — convert diapos.pptx diapos.roomboard : 2 pages pdf-page, PDF et original en assets", SLOW, async () => {
    const { dir, cache, env } = scratch();
    const out = join(dir, "diapos.roomboard");
    const io = memoryIO([], env);
    expect(await main(["convert", join(FIX, "diapos.pptx"), out], io)).toBe(0);
    expect(io.json()[0]).toEqual({ file: out, from: join(FIX, "diapos.pptx"), pages: 2, notices: [] });
    const st = memoryIO();
    expect(await main(["state", out], st)).toBe(0);
    const s = st.json()[0];
    expect(s.pages.map((p: Json) => p.page.backdrop?.kind)).toEqual(["pdf-page", "pdf-page"]);
    expect(s.assets.map((a: Json) => [a.name, a.mime]).sort()).toEqual([["diapos.pdf", "application/pdf"], ["diapos.pptx", PPTX_MIME]]);
    cleanAfter(cache);
  });
  itReal("S1 — convert cours.docx cours.pdf : PDF qui commence par %PDF-", SLOW, async () => {
    const { dir, cache, env } = scratch();
    const out = join(dir, "cours.pdf");
    expect(await main(["convert", join(FIX, "cours.docx"), out], memoryIO([], env))).toBe(0);
    expect(readFileSync(out).subarray(0, 5).toString("latin1")).toBe("%PDF-");
    cleanAfter(cache);
  });
  itReal("S1 — state cours.docx : pages au fond pdf-page ; run tab.open : onglet sans fichier", SLOW, async () => {
    const { cache, env } = scratch();
    const st = memoryIO([], env);
    expect(await main(["state", join(FIX, "cours.docx")], st)).toBe(0);
    const s = st.json()[0];
    expect(s.pages.length).toBeGreaterThan(0);
    expect(s.pages.every((p: Json) => p.page.backdrop?.kind === "pdf-page")).toBe(true);
    const run = memoryIO([JSON.stringify({ op: "tab.open", file: join(FIX, "cours.docx") }), JSON.stringify({ op: "tab.list" })], env);
    expect(await main(["run", "--new", "--ops", "-"], run)).toBe(0);
    const tabs = run.json().filter((l: Json) => Array.isArray(l.tabs)).at(-1).tabs as Json[];
    expect(tabs).toHaveLength(2);
    expect(tabs[1]).toMatchObject({ file: null });
    cleanAfter(cache);
  });
  itReal("RF2 — nom avec espace, accent et apostrophe : converti, original et PDF nommés d'après lui", SLOW, async () => {
    const { dir, cache, env } = scratch();
    const src = join(dir, "Cours d'été 2.docx");
    copyFileSync(join(FIX, "cours.docx"), src);
    const out = join(dir, "c.roomboard");
    expect(await main(["convert", src, out], memoryIO([], env))).toBe(0);
    const st = memoryIO();
    expect(await main(["state", out], st)).toBe(0);
    expect(st.json()[0].assets.map((a: Json) => a.name).sort()).toEqual(["Cours d'été 2.docx", "Cours d'été 2.pdf"]);
    cleanAfter(cache);
  });
});

describe("D79 — Ctrl-C pendant une vraie conversion (cli-lot4)", () => {
  itReal("D79 — SIGINT dès que LibreOffice cite la racine : code 130, aucun processus restant, dossier mkdtemp retiré", SLOW, async () => {
    const { dir, cache, env } = scratch();
    const src = join(dir, "diapos.pptx");
    copyFileSync(join(FIX, "diapos.pptx"), src);
    const temp = (): string[] => readdirSync(tmpdir()).filter((n) => n.startsWith("roomboard-office-"));
    const before = new Set(temp());
    const onInterrupt = vi.fn();
    const pending = convertOfficeFile(src, env, onInterrupt).then(
      () => "converti",
      (e: unknown) => (e instanceof OfficeConvertError ? e.code : String(e)),
    );
    const conversions = join(cache, "roomboard-office", "conversions");
    for (let i = 0; i < 600 && processesWith(conversions).length === 0; i++) await new Promise((r) => setTimeout(r, 100));
    expect(processesWith(conversions).length, "LibreOffice jamais vu sous la racine").toBeGreaterThan(0);
    // L'écouteur posé par runConversion, sans signal du système : le processus de Vitest ne doit pas en recevoir.
    process.emit("SIGINT");
    expect(await pending).toBe("interrupted");
    expect(onInterrupt).toHaveBeenCalledWith("SIGINT", 130);
    for (let i = 0; i < 50 && processesWith(cache).length > 0; i++) await new Promise((r) => setTimeout(r, 100));
    expect(processesWith(cache)).toEqual([]);
    expect(temp().filter((n) => !before.has(n))).toEqual([]);
  });
});

describeWasm("S2 — Office impossible : code 3, rien écrit (convert, state)", () => {
  it("S2 — ROOMBOARD_OFFICE absent : convert cours.docx x.roomboard → 3, message de DA17, rien écrit", async () => {
    const { dir, env } = scratch();
    const out = join(dir, "x.roomboard");
    const io = memoryIO([], { ...env, ROOMBOARD_OFFICE: join(dir, "absent") });
    expect(await main(["convert", join(FIX, "cours.docx"), out], io)).toBe(3);
    expect(io.errors()[0].error).toEqual({ code: "unsupported", message: `cours.docx : conversion Office indisponible : ${BINARY_MISSING}` });
    expect(existsSync(out)).toBe(false);
  });
  it("S2 — faux binaire qui rend 3 à --check : state cours.docx → 3 « LibreOffice introuvable (…) »", async () => {
    const { dir, env } = scratch();
    const bin = join(dir, "faux-office");
    writeFileSync(bin, '#!/bin/sh\necho "no-program : installez LibreOffice ou Microsoft Office" >&2\nexit 3\n');
    chmodSync(bin, 0o755);
    const io = memoryIO([], { ...env, ROOMBOARD_OFFICE: bin });
    expect(await main(["state", join(FIX, "cours.docx")], io)).toBe(3);
    expect(io.errors()[0].error).toEqual({ code: "unsupported", message: `cours.docx : conversion Office indisponible : ${NO_SOFFICE}` });
  });
  it("D59 — échec de conversion (faux binaire) : code 1, message du produit", async () => {
    const { dir, env } = scratch();
    const bin = join(dir, "faux-office");
    writeFileSync(bin, `#!/bin/sh\nif [ "$1" = "--check" ]; then echo "racine : ${join(dir, "r")}"; exit 0; fi\necho "failed : boum" >&2\nexit 1\n`);
    chmodSync(bin, 0o755);
    const docx = join(dir, "x.docx");
    writeFileSync(docx, "PK\u0003\u0004");
    const io = memoryIO([], { ...env, ROOMBOARD_OFFICE: bin });
    expect(await main(["convert", docx, join(dir, "x.roomboard")], io)).toBe(1);
    expect(io.errors()[0].error).toEqual({ code: "format", message: "Import impossible (x.docx) : la conversion en PDF a échoué" });
  });
});
```

Modifier `apps/cli/src/guards.test.ts:48-56` :

```ts
describeWasm("D25 — sources du lot 4 (constat 2 ; cli-lot4 D59 : Office lu)", () => {
  it("convert : .webp et .gif : 2 ; .docx et .pdf absents : 1 (lus depuis les lots 3 et 4, fichier lu avant le convertisseur)", async () => {
    const dir = tmpDir();
    const out = join(dir, "x.roomboard");
    expect(await main(["convert", join(dir, "photo.webp"), out], memoryIO())).toBe(2);
    expect(await main(["convert", join(dir, "photo.gif"), out], memoryIO())).toBe(2);
    expect(await main(["convert", join(dir, "texte.docx"), out], memoryIO())).toBe(1);
    expect(await main(["convert", join(dir, "doc.pdf"), out], memoryIO())).toBe(1);
  });
});
```

Modifier `apps/cli/src/convert.test.ts:115-122` : titre `"convert : sources et sorties refusées (sortie .docx, .rbitem,
.rbpack, .png : 2 ; source .docx absente : 1, cli-lot4 D59)"` et la ligne 119 :

```ts
    expect(await main(["convert", join(dir, "doc.docx"), join(dir, "x.roomboard")], memoryIO())).toBe(1);
```

Modifier `apps/cli/src/main.test.ts` : ligne 36 → `expect(out.usage).toContain("roomboard convert <source .roomboard | .pdf | tableau | Office> <sortie.roomboard | .iwb | .ubz | .pdf>");`,
et après la ligne 42 (`ROOMBOARD_NOW`) :

```ts
      expect(out.env).toContain("ROOMBOARD_OFFICE=<chemin>");
      expect(out.usage.some((u: string) => u.startsWith("roomboard state <fichier.roomboard | fichier.rbitem | fichier.pdf | fichier Office"))).toBe(true);
```

- [ ] **Étape 4 : rouge**

Run : `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/office-node.test.ts src/office.test.ts src/guards.test.ts src/convert.test.ts src/main.test.ts 2>&1 | tail -20`
Attendu : `office-node.test.ts` (module absent), S1/S2 (`convert` d'un `.docx` : 2), `guards`, `convert`, `main` en échec.

- [ ] **Étape 5 : le module** — `apps/cli/src/office-node.ts`

```ts
/**
 * Office dans la CLI (cadrage cli-lot4, D55 à D57, D79, DA16, DA17, DA20) : le binaire `roomboard-office` de la coque
 * (`crates/roomboard-shell/src/bin/roomboard-office.rs`) convertit en PDF par le même code qu'elle ; la CLI ne lit que
 * son code de sortie, le premier mot de stderr (code de `ConvertError`) et la ligne `racine :` de `--check`. Binaire :
 * `ROOMBOARD_OFFICE`, sinon `target/debug/` puis `target/release/` du dépôt (H41). `--check` une fois par binaire et par
 * processus. Délai : celui du binaire (120 s, H46). Ctrl-C (SIGINT, SIGTERM) pendant une conversion : transmis au
 * binaire ; après sa sortie, sous Linux, les processus qui citent `<racine>/conversions/<pid du binaire>-` (LibreOffice,
 * dans son propre groupe) sont tués, puis sortie en 130 ou 143 avec une ligne `{"error":…}` (D79 ; limite H50).
 */
import { execFile, spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { OfficeConvertError } from "../../web/src/platform/office-import";
import { CliError } from "./contract";
import { formatOf } from "./formats";

export type Env = Readonly<Record<string, string | undefined>>;
export type OfficeReady = { readonly root: string } | { readonly reason: string };

/** Racine du dépôt : même profondeur depuis `apps/cli/src/` et `apps/cli/dist/` (D55). */
const REPO = new URL("../../../", import.meta.url);
export const BINARY_MISSING =
  "convertisseur roomboard-office introuvable (cargo build -p roomboard-shell --bin roomboard-office, ou ROOMBOARD_OFFICE=<chemin>)";
export const NO_SOFFICE = "LibreOffice introuvable (soffice ou libreoffice dans le PATH)";
export const unavailableMessage = (name: string, reason: string): string => `${basename(name)} : conversion Office indisponible : ${reason}`;
const interruptedMessage = (sig: NodeJS.Signals): string => `conversion Office interrompue (${sig}) : rien n'est enregistré`;

export function officeBinary(env: Env = process.env): string | null {
  const set = env["ROOMBOARD_OFFICE"];
  if (set !== undefined && set !== "") return existsSync(set) ? set : null;
  const exe = process.platform === "win32" ? "roomboard-office.exe" : "roomboard-office";
  for (const dir of ["target/debug/", "target/release/"]) {
    const p = fileURLToPath(new URL(dir + exe, REPO));
    if (existsSync(p)) return p;
  }
  return null;
}

const childEnv = (env: Env): NodeJS.ProcessEnv => ({ ...process.env, ...env });
const checked = new Map<string, Promise<OfficeReady>>();
/** Clé du cache de `--check` : binaire ET variables qui fixent sa racine (`XDG_CACHE_HOME`, `HOME`) ; une autre racine
 *  (autre test, autre environnement) relance `--check`, et `killLeftovers` ne reçoit jamais une racine périmée. */
const checkKey = (bin: string, env: Env): string =>
  [bin, env["XDG_CACHE_HOME"] ?? process.env["XDG_CACHE_HOME"] ?? "", env["HOME"] ?? process.env["HOME"] ?? ""].join("\0");

/** `--check` du binaire, une fois par binaire, par racine et par processus (D56) ; raison du code 3 sinon. */
export function officeReady(env: Env = process.env): Promise<OfficeReady> {
  const bin = officeBinary(env);
  if (bin === null) return Promise.resolve({ reason: BINARY_MISSING });
  const key = checkKey(bin, env);
  let ready = checked.get(key);
  if (ready === undefined) {
    ready = new Promise<OfficeReady>((resolve) => {
      execFile(bin, ["--check"], { env: childEnv(env), encoding: "utf8" }, (error, stdout) => {
        if (error === null) {
          const root = /^racine : (.+)$/m.exec(stdout)?.[1];
          resolve(root === undefined ? { reason: "réponse de roomboard-office --check illisible" } : { root });
        } else resolve({ reason: error.code === 3 ? NO_SOFFICE : `roomboard-office --check a échoué (${String(error.code ?? error.message)})` });
      });
    });
    checked.set(key, ready);
  }
  return ready;
}

/** D56 : avant toute lecture, une source au lecteur `office` de `FORMAT_LOTS` (`.xlsx`, `.xlsm` : `sheet`, D58) exige le
 *  convertisseur ; sinon `CliError("unsupported")`, code 3. */
export async function checkOffice(sources: readonly string[], env: Env = process.env): Promise<void> {
  const first = sources.find((s) => formatOf(s)?.handler === "office");
  if (first === undefined) return;
  const r = await officeReady(env);
  if ("reason" in r) throw new CliError("unsupported", unavailableMessage(first, r.reason));
}

/** D79 : processus dont la ligne de commande cite `<racine>/conversions/<pid>-` : tués (groupe, sinon processus) ;
 *  rend leurs pids. Sans `/proc` (hors Linux) : rien (H50). */
export function killLeftovers(root: string, pid: number, procDir = "/proc", kill: (pid: number, sig: NodeJS.Signals) => void = (p, s) => void process.kill(p, s)): number[] {
  let conversions = join(root, "conversions");
  try {
    conversions = realpathSync(conversions); // le binaire canonise ce dossier (office.rs, `new_conversion_dir`)
  } catch {
    // absent : le chemin tel quel
  }
  const needles = [...new Set([`${join(root, "conversions")}/${pid}-`, `${conversions}/${pid}-`])];
  let names: string[];
  try {
    names = readdirSync(procDir).filter((n) => /^\d+$/.test(n));
  } catch {
    return [];
  }
  const killed: number[] = [];
  for (const n of names) {
    let cmd: string;
    try {
      cmd = readFileSync(join(procDir, n, "cmdline"), "latin1").replaceAll("\0", " ");
    } catch {
      continue;
    }
    if (!needles.some((x) => cmd.includes(x))) continue;
    const p = Number(n);
    try {
      kill(-p, "SIGKILL");
    } catch {
      try {
        kill(p, "SIGKILL");
      } catch {
        continue;
      }
    }
    killed.push(p);
  }
  return killed;
}

/** Code de sortie d'une conversion interrompue (D79) : 130 pour SIGINT, 143 pour SIGTERM. */
export const interruptedExitCode = (sig: NodeJS.Signals): number => (sig === "SIGINT" ? 130 : 143);

/** Sortie d'une conversion interrompue (D79) : une ligne `{"error":…}`, puis 130 ou 143 ; appelée après le retrait du
 *  dossier `mkdtemp` (aucun `finally` sauté). Remplacée dans les tests (le processus de Vitest ne sort pas). */
export function exitInterrupted(sig: NodeJS.Signals, code: number): void {
  process.stderr.write(`${JSON.stringify({ error: new CliError("command", interruptedMessage(sig)) })}\n`);
  process.exit(code);
}

type Run = { readonly code: number | null; readonly stderr: string; readonly caught: NodeJS.Signals | null };

function runConversion(bin: string, args: readonly string[], env: Env, root: string): Promise<Run> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { env: childEnv(env), stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    let caught: NodeJS.Signals | null = null;
    const relay = (sig: NodeJS.Signals) => (): void => {
      caught ??= sig;
      child.kill(sig);
    };
    const onInt = relay("SIGINT");
    const onTerm = relay("SIGTERM");
    process.on("SIGINT", onInt);
    process.on("SIGTERM", onTerm);
    const done = (): void => {
      process.off("SIGINT", onInt);
      process.off("SIGTERM", onTerm);
    };
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (c: string) => {
      stderr += c;
    });
    child.on("error", (e) => {
      done();
      reject(e);
    });
    child.on("close", (code) => {
      done();
      if (caught !== null && child.pid !== undefined) killLeftovers(root, child.pid); // D79 : LibreOffice de cette conversion
      resolve({ code, stderr, caught }); // aucun process.exit ici : le dossier mkdtemp est retiré d'abord
    });
  });
}

/** D57 : PDF du fichier Office `path`, écrit par le binaire dans un dossier `mkdtemp` (0700) retiré à la fin, Ctrl-C
 *  compris ; rejette `OfficeConvertError(code)` (code = premier mot de stderr ; `no-program` pour le code 3, H49). Après
 *  un Ctrl-C (D79) : dossier retiré, puis `onInterrupt(signal, 130 | 143)` (par défaut : ligne `{"error":…}` et sortie). */
export async function convertOfficeFile(
  path: string,
  env: Env = process.env,
  onInterrupt: (sig: NodeJS.Signals, code: number) => void = exitInterrupted,
): Promise<Blob> {
  const ready = await officeReady(env);
  const bin = officeBinary(env);
  if ("reason" in ready || bin === null) throw new OfficeConvertError("no-program");
  const dir = await mkdtemp(join(tmpdir(), "roomboard-office-"));
  const out = join(dir, "sortie.pdf");
  const run = await runConversion(bin, [path, out], env, ready.root)
    .then(async (r) => ({ ...r, pdf: r.caught === null && r.code === 0 ? new Blob([await readFile(out)], { type: "application/pdf" }) : null }))
    .finally(() => rm(dir, { recursive: true, force: true }));
  if (run.caught !== null) {
    onInterrupt(run.caught, interruptedExitCode(run.caught));
    throw new OfficeConvertError("interrupted"); // atteint seulement si `onInterrupt` ne sort pas (tests)
  }
  if (run.pdf === null) throw new OfficeConvertError(run.code === 3 ? "no-program" : (/^\s*([a-z-]+)/.exec(run.stderr)?.[1] ?? "failed"));
  return run.pdf;
}
```

- [ ] **Étape 6 : la session lit l'Office** — `apps/cli/src/session.ts`

En-tête (après la phrase cli-lot3) : « cli-lot4 (D57, D59) : un fichier Office (lecteur `office` de `FORMAT_LOTS`) est
converti par `roomboard-office` (`office-node.ts`), puis lu comme un PDF, l'original gardé, en onglet sans fichier. »

Imports :
```ts
import { convertFailureMessage, OfficeConvertError } from "../../web/src/platform/office-import";
import { checkOffice, convertOfficeFile, NO_SOFFICE, unavailableMessage } from "./office-node";
```

`SessionDeps` (après `pdfWriter`) :
```ts
  /** cli-lot4 (D55, D56) : variables du processus (`ROOMBOARD_OFFICE`, `XDG_CACHE_HOME`) ; absent : `process.env`. */
  readonly env?: Readonly<Record<string, string | undefined>>;
```

Interface `Session`, ligne 106 :
```ts
  /** PDF ouvert par l'importeur (`openPdf`, `openOffice` : `original` gardé, D57) en onglet sans fichier : false si
   *  refusé, l'avis est dans `notices`. */
  openPdf(file: { readonly name: string; readonly blob: Blob; readonly original?: Blob }): Promise<boolean>;
```

Après `boardFormatOf` (l. 74), au niveau du module :
```ts
/** cli-lot4 (D59) : fichier converti par roomboard-office (`.xlsx`, `.xlsm` : lecteur `sheet`, jamais converti, D58). */
const isOfficeDoc = (path: string): boolean => formatOf(path)?.handler === "office";
```

`readPdfNoticed` (l. 171-180) :
```ts
  async function readPdfNoticed(name: string, blob: Blob, original?: Blob): Promise<PdfRead> {
    let read: PdfRead;
    try {
      read = await readPdfFile({ name, blob, ...(original === undefined ? {} : { original }) }, { core: deps.core, pdf: deps.pdf, makeAssets: () => createAssetStore() });
    } catch (e) {
      throw new CliError("format", messageOf(e));
    }
    deps.notices.push(...read.warnings);
    return read;
  }
```

Dans `readDoc`, juste après `sources.add(path);` (le fichier est lu d'abord : absent → `io`, code 1) :
```ts
    if (kind === "document" && isOfficeDoc(path)) {
      const name = basename(path);
      const env = deps.env ?? process.env;
      await checkOffice([path], env); // D56 : code 3 sans convertisseur
      let pdf: Blob;
      try {
        pdf = await convertOfficeFile(path, env);
      } catch (e) {
        const code = e instanceof OfficeConvertError ? e.code : "failed";
        if (code === "no-program") throw new CliError("unsupported", unavailableMessage(name, NO_SOFFICE)); // course après --check
        throw new CliError("format", convertFailureMessage(name, code));
      }
      const read = await readPdfNoticed(name, pdf, new Blob([bytes as BlobPart]));
      return { doc: read.doc, assets: read.assets };
    }
```

`open` (l. 201-204) : onglet sans fichier aussi pour l'Office :
```ts
    return add({ doc: read.doc, assets: read.assets, file: boardFormatOf(path) === null && !isPdfOut(path) && !isOfficeDoc(path) ? path : null });
```

`openPdf` (l. 231) :
```ts
  const openPdf = (file: { readonly name: string; readonly blob: Blob; readonly original?: Blob }): Promise<boolean> =>
    openReadTab(file.name, () => readPdfNoticed(file.name, file.blob, file.original));
```

`nodeSession` (l. 407-420) : ajouter `env: io.env,` dans l'objet passé à `createSession`.

- [ ] **Étape 7 : `convert` depuis l'Office** — `apps/cli/src/exporter.ts`

Imports : `import { isSheetName } from "../../web/src/platform/import";` et `import { OFFICE_EXTENSIONS } from
"../../web/src/platform/office-import";`. Ligne 98 :
```ts
/** cli-lot4 (D59) : fichiers Office convertis (`.xlsx`, `.xlsm` exclus : tableaux en valeurs, D58), constante importée. */
const CONVERT_SOURCES: ReadonlySet<string> = new Set([
  ".roomboard", ".pdf", ".iwb", ".ubz", ".notebook", ".olf", ".flipchart",
  ...OFFICE_EXTENSIONS.filter((e) => !isSheetName(`x${e}`)),
]);
```
Commentaire de `checkConvert` (l. 105) : `/** D25, D42 : avant tout chargement ; toute source ou sortie hors des listes : 2 ; une
source Office sans convertisseur : 3 (cli-lot4, D56, au chargement). */`

- [ ] **Étape 8 : aide** — `apps/cli/src/main.ts`

```ts
  state: "state <fichier.roomboard | fichier.rbitem | fichier.pdf | fichier Office .docx .odt .pptx .odp .doc .ppt .xls .ods | tableau .iwb .ubz .notebook .olf .flipchart> [--page <id>] [--points]",
  convert: "convert <source .roomboard | .pdf | tableau | Office> <sortie.roomboard | .iwb | .ubz | .pdf>",
```
et
```ts
const ENV =
  "ROOMBOARD_NOW=<millisecondes depuis 1970> : date du manifeste (essais reproductibles), sinon l'heure du système ; " +
  "ROOMBOARD_OFFICE=<chemin> : binaire roomboard-office des fichiers Office, sinon target/debug/ puis target/release/ du dépôt";
```

- [ ] **Étape 9 : vert**

Run : `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run --reporter=verbose src/office-node.test.ts src/office.test.ts src/guards.test.ts src/convert.test.ts src/main.test.ts 2>&1 | grep -E "✓|×|↓|Test Files"`
Attendu : `Test Files  5 passed`, aucune ligne `×` ni `↓` (LibreOffice présent sur la VM) ; lignes `✓` de `S1 — convert
diapos.pptx`, `RF2 — nom avec espace`, `S2 — faux binaire`, `D79 — SIGINT dès que LibreOffice cite la racine`, `D79 — SIGINT
transmis`, `officeReady — même binaire, autre XDG_CACHE_HOME`.
Run : `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli test 2>&1 | tail -8` — aucun `FAIL ` (garde :
`pdf.test.ts`, `session.test.ts`, `export.test.ts`).
Run : `for p in /proc/[0-9]*; do tr '\0' ' ' < $p/cmdline 2>/dev/null; echo; done | grep -c "roomboard-cli-t-"` → `0`
(aucun processus ne cite un dossier de test ; ne rien tuer d'autre, G4).
Run : `nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -3 && node apps/cli/dist/roomboard.mjs --help | grep -c ROOMBOARD_OFFICE` → `1`.

- [ ] **Étape 10 : commit**

```bash
git add apps/cli/src/office-node.ts apps/cli/src/office-node.test.ts apps/cli/src/office.test.ts apps/cli/src/session.ts apps/cli/src/exporter.ts apps/cli/src/main.ts apps/cli/src/main.test.ts apps/cli/src/guards.test.ts apps/cli/src/convert.test.ts
git commit --author "jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(cli): Office files through roomboard-office, then the PDF path (state, convert, tab.open)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t7"></a>
### Tâche T7 — Branchement : `importInto`, `FORMAT_LOTS` (`LOT_LIVRE = 4`), scénarios S1 à S5 en Vitest

**Objectif :** brancher les trois adaptateurs (T4, T5, T6) dans `createImporter` du produit par `importInto`, poser les
deux refus avant écriture (`checkOffice` avant toute lecture, `headerBlocked` avant `createImporter`), passer tout le
lot 4 à « couvert » dans `FORMAT_LOTS` avec ses notes, et prouver S1 à S5 au vrai Wasm. Seule tâche qui touche
`importer.ts` et `formats.ts`. Cadrage : D56, D58, D60, D65, D67, D68, D69, D73, D80, DA17, H37 à H48 ; S1 à S5.

**Fichiers :**
- Modifier : `apps/cli/src/importer.ts` (en-tête, imports, `nodeDecode`, `nodeFile`, `checkSources`, `importInto`, réexports)
- Modifier : `apps/cli/src/formats.ts` (en-tête, `LOT_LIVRE`, `UNREAD_IMAGES` retiré, lignes du lot 4, `LEFT_ASIDE`, `leftAsideReason`)
- Modifier : `apps/cli/src/main.ts:173` (gestionnaire `import` : `checkOffice` après `checkSources`)
- Modifier : `apps/cli/src/pdf-node.ts:124-140` (message sans « lot 4 », D68, D69), `apps/cli/src/contract.ts:13` (sens du code 3, D73, D80)
- Modifier : `apps/cli/src/formats.test.ts`, `apps/cli/src/import.test.ts:57-70`, `apps/cli/src/pdf.test.ts:243-253`,
  `apps/cli/src/boards.test.ts` (seulement si un avis attendu change : images désormais lues)
- Créer : `apps/cli/src/images.test.ts`, `apps/cli/src/media.test.ts`, `apps/cli/src/model3d.test.ts`
- Modifier : `apps/cli/src/office.test.ts` (créé par T6 : ajout des cas `import`)

**Interfaces :**
- Consomme (T4) : `nodeModel3d(): Model3dDeps` (`apps/cli/src/model3d-node.ts`) ; fabriques `cubeObj`, `cubeMtl`, `png1`,
  `stlTriangle`, `plyTriangle`, `gltfPair`, `glbTextured` (`scripts/essais/fabriques/modeles.mjs`).
- Consomme (T5) : `nodeMedia()`, `headerBlocked(name, bytes): Promise<string | null>` (`apps/cli/src/media-node.ts`).
- Consomme (T6) : `checkOffice(sources, env?)`, `convertOfficeFile(path, env?)`, `officeBinary(env?)`, `BINARY_MISSING`
  (`apps/cli/src/office-node.ts`) ; `SessionDeps.env` ; `Session.openPdf({ name, blob, original? })` ; dans
  `office.test.ts` : `scratch()`, `cleanAfter(cache)`, `itReal`, `SLOW`, `FIX`.
- Consomme (T2, T3) : fabriques `gif`, `webp`, `bmp`, `ico`, `heif`, `svg` (`images.mjs`) ; `wav`, `mp4`, `mp4Broken`,
  `webm`, `ogg`, `mp3` (`medias.mjs`).
- Réutilise : `apps/web/src/platform/import.ts:337` — `createImporter({ …, probe, mediaUrls, model3d, convertOffice, openOffice, officeConverter })` (toutes les dépendances existent déjà)
- Réutilise : `apps/web/src/platform/office-import.ts:113` — `officeHandler` (par `createImporter`) ; `import.ts:222` — `isSheetName`
- Réutilise : `apps/cli/src/importer.ts:33` — `nodeDecode` (appelle `probeSize` étendu ; images des tableaux blancs, `board-io.ts:436-446`)
- Réutilise (étendu) : `apps/cli/src/importer.ts:68` — `checkSources` ; `checkOffice` et `headerBlocked` réexportés ici (DA17)
- Réutilise (étendu) : `apps/cli/src/formats.ts:52-73` — lignes et `LOT_LIVRE`
- Produit :
  ```ts
  // apps/cli/src/formats.ts
  export const LOT_LIVRE: Lot; // 4
  export const LEFT_ASIDE = "laissé de côté : ";
  export function leftAsideReason(name: string): string | null; // H48
  // apps/cli/src/importer.ts
  export { checkOffice } from "./office-node";
  export { headerBlocked } from "./media-node";
  ```

**Contraintes (recopiées de Global Constraints) :**
- G1 — TDD : test rouge d'abord. Aucun test désactivé ni sauté, aucun seuil baissé ou relevé, aucun délai de test
  existant relevé ; un test qui échoue sur un délai est rejoué une fois. Tests réels Office sautés seulement sous
  `ROOMBOARD_SANS_SOFFICE=1` (D54) ; un test neuf qui lance LibreOffice porte son propre délai (`SLOW`).
- G2 — VM partagée : builds et tests en `nice -n 10`, cargo en `-j 4` ; avant toute commande :
  `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- G3 — `roomboard-shell` : seulement `nice -n 10 cargo build -p roomboard-shell --bin roomboard-office -j 4` ; aucun
  `tauri build`, aucun bundle, aucun build Android.
- G4 — LibreOffice en `--headless` (posé par le binaire) ; chaque processus lancé est fermé ; aucun `soffice` vivant
  après un test (`cleanAfter` le vérifie). Ne tuer aucun processus non lancé par soi (`glycin-svg` compris).
- G5 — Fichiers d'essai fabriqués par le code (fabriques `images.mjs`, `medias.mjs`, `modeles.mjs`, `tableaux.mjs`,
  fixtures suivies) ; aucun fichier téléchargé ; rien de `~/telechargements-roomboard/` ; écritures sous `tmpDir()`.
- G6 — Tailles Wasm inchangées : principal 1 374 215 o (plafond 1 572 864), formats 2 794 511 o (plafond 3 145 728) ;
  aucun crate Wasm touché.
- G7 — Aucune dépendance ajoutée ; aucune AGPL/GPL/LGPL ; aucune installation de paquet système.
- G8 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais terminés par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un ; jamais `--force`.
- G9 — D15 : chaque format du lot 4 met à jour `FORMAT_LOTS` (ici), ses tests (ici) et `scripts/essais/cli-essai.mjs` (T8).
- G10 — La CLI appelle le code de la page et de la coque, jamais une copie : `importInto` ne fait que passer des ports à
  `createImporter`.
- G11 — Construction de la CLI : `nice -n 10 pnpm --filter @roomboard/cli build` ; tests `ROOMBOARD_WASM_REQUIRED=1 nice -n
  10 pnpm --filter @roomboard/cli test`.
- G12 — Worktree isolé neuf : `cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r
  /home/adminjd/projets/roomboard-wt/cli-lot4/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot4/apps/web/src/wasm-formats
  apps/web/src/`, puis `nice -n 10 cargo build -p roomboard-shell --bin roomboard-office -j 4`.
- G13 — stderr de la CLI réservé à la ligne `{"error":…}` : aucun `console.*` ajouté.
- G14 — Aucun import neuf entre `import.ts` et `office-import.ts`.
- G15 — Coupe H48 à 07:30 : un format signalé « laissé de côté » par T2 à T5 prend ici `read: null`, la note
  `${LEFT_ASIDE}<raison>` et sort en code 3 `<nom> : format non lu par la CLI : <raison>` (par `leftAsideReason` dans
  `checkSources`) ; jamais « au lot N ».

**Interdits :** recopier une règle de format dans `apps/cli` ; `linkMedia` ; un chemin pour un `.xlsx`/`.xlsm` (D58) ;
toucher `apps/web` ; changer `exporter.ts`, `session.ts`, `office-node.ts`, `media-node.ts`, `model3d-node.ts` (sauf
défaut prouvé par un test rouge : le dire au rapport).

**Terminé quand :** suite CLI entière verte ; `images.test.ts`, `media.test.ts`, `model3d.test.ts`, `office.test.ts`,
`formats.test.ts` verts (≥ 20 tests) ; `node apps/cli/dist/roomboard.mjs formats` : chaque ligne `read: true` ou portant
la note `laissé de côté : …` (coupe H48) ;
`grep -rn "lot 4" apps/cli/src/*.ts | grep -v test` → rien. Rapport : `Réutilisation : appelé createImporter (probe,
mediaUrls, model3d, convertOffice, openOffice, officeConverter), nodeDecode, checkSources (étendu)`, et la liste des
formats laissés de côté (vide si aucun).

**Étapes :**

- [ ] **Étape 1 : worktree** (G12, binaire compris).

- [ ] **Étape 2 : tests rouges** — `apps/cli/src/images.test.ts`

```ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { bmp, gif, heif, ico, svg, webp } from "../../../scripts/essais/fabriques/images.mjs";
import { IWB_HEAD } from "../../../scripts/essais/fabriques/tableaux.mjs";
import { main } from "./main";
import { describeWasm, fabZip, memoryIO, stampOf, tmpDir, type Json } from "./testing";

async function board(): Promise<{ dir: string; a: string }> {
  const dir = tmpDir();
  const a = join(dir, "a.roomboard");
  expect(await main(["new", a], memoryIO())).toBe(0);
  return { dir, a };
}
const nameOf = (state: Json, id: string): string => state.assets.find((x: Json) => x.id === id)?.name;

describeWasm("S5 — autres images (cli-lot4)", () => {
  it("S5 — huit images insérées aux tailles de l'en-tête (vb.svg à viewBox seul : 300 × 75)", async () => {
    const { dir, a } = await board();
    const files: Record<string, Uint8Array> = {
      "i.gif": gif(320, 200), "i.webp": webp("VP8 ", 64, 48), "i.bmp": bmp(33, 21), "i.ico": ico([[16, 16], [48, 48]]),
      "i.svg": svg('width="40" height="30"'), "vb.svg": svg('viewBox="0 0 400 100"'), "i.avif": heif("avif", 120, 80), "i.heic": heif("heic", 90, 60),
    };
    for (const [n, b] of Object.entries(files)) writeFileSync(join(dir, n), b);
    const io = memoryIO();
    expect(await main(["import", a, ...Object.keys(files).map((n) => join(dir, n))], io)).toBe(0);
    expect(io.json()[0]).toMatchObject({ inserted: Object.keys(files), refused: [], failed: [] });
    expect(io.stderr).toEqual([]);
    const st = memoryIO();
    expect(await main(["state", a], st)).toBe(0);
    const s = st.json()[0];
    const sizes = Object.fromEntries(s.pages[0].elements.map((e: Json) => [nameOf(s, e.image.asset), [e.image.w, e.image.h]]));
    expect(sizes).toEqual({
      "i.gif": [320, 200], "i.webp": [64, 48], "i.bmp": [33, 21], "i.ico": [48, 48],
      "i.svg": [40, 30], "vb.svg": [300, 75], "i.avif": [120, 80], "i.heic": [90, 60],
    });
  });
  it("S5 — import casse.gif : code 3 « taille de l'image gif illisible dans l'en-tête », rien écrit", async () => {
    const { dir, a } = await board();
    const casse = join(dir, "casse.gif");
    writeFileSync(casse, "GIF89a");
    const before = stampOf(a);
    const io = memoryIO();
    expect(await main(["import", a, casse], io)).toBe(3);
    expect(io.errors()[0].error).toEqual({ code: "unsupported", message: "casse.gif : taille de l'image gif illisible dans l'en-tête (la CLI ne décode pas les images)" });
    expect(stampOf(a)).toEqual(before);
  });
  it("S5 — convert gif.iwb : l'image GIF du tableau est lue, aucun avis d'image sautée", async () => {
    const dir = tmpDir();
    const xml = `${IWB_HEAD}<svg:svg viewbox="0 0 960 540"><svg:pageset><svg:page id="p1"><svg:image id="i1" xlink:href="images/i.gif" x="10" y="10" width="64" height="64"/></svg:page></svg:pageset></svg:svg></iwb>`;
    const iwb = join(dir, "gif.iwb");
    writeFileSync(iwb, fabZip({ "content.xml": new TextEncoder().encode(xml), "images/i.gif": gif(64, 64) }));
    const out = join(dir, "g.roomboard");
    const io = memoryIO();
    expect(await main(["convert", iwb, out], io)).toBe(0);
    expect(io.json()[0].notices.join(" ")).not.toMatch(/image/i);
    const st = memoryIO();
    expect(await main(["state", out], st)).toBe(0);
    expect(st.json()[0].pages[0].elements.filter((e: Json) => e.kind === "image")).toHaveLength(1);
  });
  it("S5 — formats : chaque format est lu, aucune note ne cite un lot (D68)", async () => {
    const io = memoryIO();
    expect(await main(["formats"], io)).toBe(0);
    const rows = io.json()[0].formats as Json[];
    expect(rows.filter((r) => r.read !== true && !r.notes.some((n: string) => n.startsWith("laissé de côté : "))).map((r) => r.ext)).toEqual([]);
    expect(rows.flatMap((r) => r.notes).filter((n: string) => /\blots?\b/i.test(n))).toEqual([]);
  });
  it("D69 — export .pdf d'un tableau qui porte une image GIF : code 1, raison « aucun décodeur d'image »", async () => {
    const { dir, a } = await board();
    writeFileSync(join(dir, "i.gif"), gif(8, 8));
    expect(await main(["import", a, join(dir, "i.gif")], memoryIO())).toBe(0);
    const io = memoryIO();
    expect(await main(["export", a, join(dir, "x.pdf")], io)).toBe(1);
    expect(io.errors()[0].error.message).toContain("aucun décodeur d'image");
  });
});
```

`apps/cli/src/media.test.ts` :

```ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { mp3, mp4, mp4Broken, ogg, wav, webm } from "../../../scripts/essais/fabriques/medias.mjs";
import { main } from "./main";
import { describeWasm, memoryIO, stampOf, tmpDir, type Json } from "./testing";

async function board(): Promise<{ dir: string; a: string }> {
  const dir = tmpDir();
  const a = join(dir, "a.roomboard");
  expect(await main(["new", a], memoryIO())).toBe(0);
  return { dir, a };
}
async function mediaByName(a: string): Promise<Record<string, Json>> {
  const st = memoryIO();
  expect(await main(["state", a], st)).toBe(0);
  const s = st.json()[0];
  const name = (id: string): string => s.assets.find((x: Json) => x.id === id)?.name;
  return Object.fromEntries(s.pages[0].elements.filter((e: Json) => e.kind === "media").map((e: Json) => [name(e.media.asset), e.media]));
}

describeWasm("S3 — médias (cli-lot4)", () => {
  it("S3 — import son.wav clip.mp4 clip.webm : trois médias, durée et taille de l'en-tête, poster nul", async () => {
    const { dir, a } = await board();
    const files: Record<string, Uint8Array> = { "son.wav": wav(1), "clip.mp4": mp4({ duration: 2.5, width: 640, height: 360 }), "clip.webm": webm({ duration: 3.2, width: 320, height: 240 }) };
    for (const [n, b] of Object.entries(files)) writeFileSync(join(dir, n), b);
    const io = memoryIO();
    expect(await main(["import", a, ...Object.keys(files).map((n) => join(dir, n))], io)).toBe(0);
    expect(io.json()[0]).toMatchObject({ inserted: ["son.wav", "clip.mp4", "clip.webm"], refused: [], failed: [] });
    expect(io.stderr).toEqual([]);
    const m = await mediaByName(a);
    expect(m["son.wav"]).toMatchObject({ mediaType: "audio", w: 480, h: 120, duration: 1, poster: null });
    expect(m["clip.mp4"]).toMatchObject({ mediaType: "video", w: 640, h: 360, duration: 2.5, poster: null });
    expect(m["clip.webm"]).toMatchObject({ mediaType: "video", w: 320, h: 240, duration: 3.2, poster: null });
  });
  it("S3 — MP3 (Xing) et Ogg Vorbis : sons, durées lues", async () => {
    const { dir, a } = await board();
    writeFileSync(join(dir, "a.mp3"), mp3({ frames: 100, xing: true }));
    writeFileSync(join(dir, "b.ogg"), ogg({ codec: "vorbis", granule: 88200 }));
    expect(await main(["import", a, join(dir, "a.mp3"), join(dir, "b.ogg")], memoryIO())).toBe(0);
    const m = await mediaByName(a);
    expect([m["a.mp3"]?.duration, m["b.ogg"]?.duration, m["a.mp3"]?.mediaType]).toEqual([2.612, 2, "audio"]);
  });
  it("S3 — import casse.mp4 (ftyp sans moov) : code 3 « durée du média illisible dans l'en-tête », rien écrit", async () => {
    const { dir, a } = await board();
    const casse = join(dir, "casse.mp4");
    writeFileSync(casse, mp4Broken());
    const before = stampOf(a);
    const io = memoryIO();
    expect(await main(["import", a, casse], io)).toBe(3);
    expect(io.errors()[0].error).toEqual({ code: "unsupported", message: "casse.mp4 : durée du média illisible dans l'en-tête (la CLI ne décode pas les médias)" });
    expect(stampOf(a)).toEqual(before);
  });
});
```

`apps/cli/src/model3d.test.ts` :

```ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { cubeMtl, cubeObj, glbTextured, gltfPair, plyTriangle, png1, stlTriangle } from "../../../scripts/essais/fabriques/modeles.mjs";
import { COMPANION_ALONE_MESSAGE, NO_WEBGL_MESSAGE } from "../../web/src/platform/model3d-import";
import { MODEL3D_UNREADABLE } from "../../web/src/platform/model3d-handlers";
import { main } from "./main";
import { describeWasm, fabZip, memoryIO, pdfFixture, tmpDir, type Json } from "./testing";

async function board(): Promise<{ dir: string; a: string }> {
  const dir = tmpDir();
  const a = join(dir, "a.roomboard");
  expect(await main(["new", a], memoryIO())).toBe(0);
  return { dir, a };
}
const put = (dir: string, files: Record<string, Uint8Array>): string[] =>
  Object.entries(files).map(([n, b]) => {
    writeFileSync(join(dir, n), b);
    return join(dir, n);
  });

describeWasm("S4 — 3D sans vignette (cli-lot4)", () => {
  it("S4 — import cube.obj cube.mtl tex.png tri.stl tri.gltf tri.bin tex.glb : quatre objets, instantané nul, avis une fois, stderr vide", async () => {
    const { dir, a } = await board();
    const { gltf, bin } = gltfPair();
    const paths = put(dir, { "cube.obj": cubeObj(), "cube.mtl": cubeMtl(), "tex.png": png1(), "tri.stl": stlTriangle(), "tri.gltf": gltf, "tri.bin": bin, "tex.glb": glbTextured() });
    const io = memoryIO();
    expect(await main(["import", a, ...paths], io)).toBe(0);
    const [r] = io.json();
    expect(r).toMatchObject({ inserted: ["cube.obj", "tri.stl", "tri.gltf", "tex.glb"], refused: [], failed: [] });
    expect(r.notices.filter((n: string) => n === NO_WEBGL_MESSAGE)).toHaveLength(1);
    expect(io.stderr).toEqual([]);
    const st = memoryIO();
    expect(await main(["state", a], st)).toBe(0);
    const s = st.json()[0];
    const name = (id: string): string => s.assets.find((x: Json) => x.id === id)?.name;
    const models = Object.fromEntries(s.pages[0].elements.filter((e: Json) => e.kind === "model3d").map((e: Json) => [name(e.model3d.asset), e.model3d]));
    expect(Object.keys(models).sort()).toEqual(["cube.obj", "tex.glb", "tri.gltf", "tri.stl"]);
    expect(Object.values(models).every((m: Json) => m.snapshot === null)).toBe(true);
    expect(models["cube.obj"].files.map((f: Json) => f.path).sort()).toEqual(["cube.mtl", "tex.png"]);
    expect(models["tri.gltf"].files.map((f: Json) => f.path)).toEqual(["tri.bin"]);
  });
  it("S4 — .gltf sans son .bin : code 1, avis « modèle 3D illisible », aucune pile", async () => {
    const { dir, a } = await board();
    const io = memoryIO();
    expect(await main(["import", a, ...put(dir, { "seul.gltf": gltfPair().gltf })], io)).toBe(1);
    expect(io.json()[0]).toMatchObject({ failed: ["seul.gltf"] });
    expect(io.json()[0].notices.join(" ")).toContain(MODEL3D_UNREADABLE);
    expect(io.stderr.join("")).not.toMatch(/\n\s+at /);
  });
  it("S4 — seul.mtl : code 1, failed, avis du fichier lié seul", async () => {
    const { dir, a } = await board();
    const io = memoryIO();
    expect(await main(["import", a, ...put(dir, { "seul.mtl": cubeMtl(null) })], io)).toBe(1);
    expect(io.json()[0]).toMatchObject({ failed: ["seul.mtl"] });
    expect(io.json()[0].notices.join(" ")).toContain(COMPANION_ALONE_MESSAGE);
  });
  it("S4 — ZIP de deux modèles : deux objets 3D", async () => {
    const { dir, a } = await board();
    expect(await main(["import", a, ...put(dir, { "modeles.zip": fabZip({ "a.stl": stlTriangle(), "b.ply": plyTriangle() }) })], memoryIO())).toBe(0);
    const st = memoryIO();
    expect(await main(["state", a], st)).toBe(0);
    expect(st.json()[0].pages[0].elements.filter((e: Json) => e.kind === "model3d")).toHaveLength(2);
  });
  it("D76 — session run : import 3D puis tab.open d'un PDF : code 0, globaux du navigateur retirés", async () => {
    const { dir } = await board();
    const [stl] = put(dir, { "tri.stl": stlTriangle() });
    const pdf = await pdfFixture(dir);
    const io = memoryIO([JSON.stringify({ op: "import", files: [stl] }), JSON.stringify({ op: "tab.open", file: pdf })]);
    expect(await main(["run", "--new", "--ops", "-"], io)).toBe(0);
    expect(["self", "ProgressEvent", "document"].map((k) => k in globalThis)).toEqual([false, false, false]);
  });
});
```

Ajouter à `apps/cli/src/office.test.ts` (imports : `stampOf`, `XLSX_FIXTURE` de `./testing`, `officeBinary` de
`./office-node`, `copyFileSync` déjà importé) :

```ts
describeWasm("S1, S2 — import d'un fichier Office (cli-lot4, T7)", () => {
  const fresh = async (dir: string): Promise<string> => {
    const a = join(dir, "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    return a;
  };
  itReal("S1 — import a.roomboard cours.docx : opened [cours.docx], conversions/ vide, aucun soffice", SLOW, async () => {
    const { dir, cache, env } = scratch();
    const a = await fresh(dir);
    const io = memoryIO([], env);
    expect(await main(["import", a, join(FIX, "cours.docx")], io)).toBe(0);
    expect(io.json()[0]).toMatchObject({ opened: ["cours.docx"], inserted: [], refused: [], failed: [] });
    cleanAfter(cache);
  });
  it("D58 — import valeurs.xlsx : tableau inséré, aucun binaire lancé (même avec un convertisseur)", async () => {
    const { dir, env } = scratch();
    const a = await fresh(dir);
    const log = join(dir, "appels.log");
    const bin = join(dir, "faux-office");
    writeFileSync(bin, `#!/bin/sh\necho "$1" >> '${log}'\nexit 1\n`);
    chmodSync(bin, 0o755);
    const io = memoryIO([], { ...env, ROOMBOARD_OFFICE: bin });
    expect(await main(["import", a, XLSX_FIXTURE], io)).toBe(0);
    expect(io.json()[0]).toMatchObject({ inserted: ["valeurs.xlsx"] });
    expect(existsSync(log)).toBe(false);
  });
  it("S2 — import avec ROOMBOARD_OFFICE absent : code 3, message de DA17, a.roomboard inchangé, rien lu", async () => {
    const { dir, env } = scratch();
    const a = await fresh(dir);
    const before = stampOf(a);
    const io = memoryIO([], { ...env, ROOMBOARD_OFFICE: join(dir, "absent") });
    expect(await main(["import", a, join(FIX, "cours.docx")], io)).toBe(3);
    expect(io.errors()[0].error).toEqual({ code: "unsupported", message: `cours.docx : conversion Office indisponible : ${BINARY_MISSING}` });
    expect(stampOf(a)).toEqual(before);
    const absent = memoryIO([], { ...env, ROOMBOARD_OFFICE: join(dir, "absent") });
    expect(await main(["import", join(dir, "absent.roomboard"), join(dir, "absent.docx")], absent)).toBe(3); // rien lu : sinon io (1)
  });
  itReal("RF3 — deux .docx dans une session run : --check une fois, deux onglets de plus, conversions/ vide", SLOW, async () => {
    const { dir, cache, env } = scratch();
    const real = officeBinary({});
    expect(real).not.toBeNull();
    const log = join(dir, "appels.log");
    const bin = join(dir, "enveloppe");
    writeFileSync(bin, `#!/bin/sh\necho "$1" >> '${log}'\nexec '${real}' "$@"\n`);
    chmodSync(bin, 0o755);
    const two = join(dir, "deux.docx");
    copyFileSync(join(FIX, "cours.docx"), two);
    const ops = [{ op: "import", files: [join(FIX, "cours.docx")] }, { op: "import", files: [two] }, { op: "tab.list" }].map((o) => JSON.stringify(o));
    const io = memoryIO(ops, { ...env, ROOMBOARD_OFFICE: bin });
    expect(await main(["run", "--new", "--ops", "-"], io)).toBe(0);
    const calls = readFileSync(log, "utf8").trim().split("\n");
    expect(calls.filter((c) => c === "--check")).toHaveLength(1);
    expect(calls).toHaveLength(3);
    expect(io.json().filter((l: Json) => Array.isArray(l.tabs)).at(-1).tabs).toHaveLength(3);
    cleanAfter(cache);
  });
});
```

Modifier `apps/cli/src/import.test.ts:57-70` : remplacer le test « import x.docx : code 3 « lot 4 » … » par :

```ts
  it("import x.docx sans convertisseur : code 3 « conversion Office indisponible », rien lu ni écrit (cli-lot4, D56)", async () => {
    const { dir, a } = await board();
    const docx = join(dir, "lettre.docx");
    writeFileSync(docx, "pas un docx");
    const before = stampOf(a);
    const env = { ROOMBOARD_OFFICE: join(dir, "absent") };
    const io = memoryIO([], env);
    expect(await main(["import", a, docx], io)).toBe(3);
    expect(io.stdout).toEqual([]);
    expect(io.errors()[0].error).toEqual({ code: "unsupported", message: `lettre.docx : conversion Office indisponible : ${BINARY_MISSING}` });
    expect(stampOf(a)).toEqual(before);
    // Rien lu : tableau et source absents du disque, une lecture rendrait io (code 1) au lieu de 3.
    expect(await main(["import", join(dir, "absent.roomboard"), join(dir, "absent.docx")], memoryIO([], env))).toBe(3);
  });
```

(import : `import { BINARY_MISSING } from "./office-node";`).

Modifier `apps/cli/src/pdf.test.ts:243-253` : titre `"S4 — formats : .pdf lu et écrit ; convert a.roomboard x.docx : 2
(l'import d'un .docx : office.test.ts, cli-lot4)"`, et retirer les trois lignes `const imp = memoryIO(); …` à
`expect(imp.errors()[0].error.message).toContain("lot 4");`.

Modifier `apps/cli/src/formats.test.ts` : le test « lots livrés (LOT_LIVRE = 3) » devient

```ts
  it("lots livrés (LOT_LIVRE = 4, cli-lot4 D68) : tout format est lu ; écrits inchangés", () => {
    expect(LOT_LIVRE).toBe(4);
    const rows = formatRows();
    expect(rows.filter((r) => !r.read && !r.notes.some((n) => n.startsWith(LEFT_ASIDE))).map((r) => r.ext)).toEqual([]);
    expect(rows.find((r) => r.ext === ".rbpack")?.notes.join(" ")).toContain("library import");
    expect(rows.find((r) => r.ext === ".notebook")?.notes.join(" ")).toContain("lecture seule");
    expect(rows.filter((r) => r.write).map((r) => r.ext).sort()).toEqual([".iwb", ".pdf", ".rbitem", ".rbpack", ".roomboard", ".ubz"]);
    expect(rows.find((r) => r.ext === ".pdf")?.notes.join(" ")).toContain("pdf-page");
    expect(rows.find((r) => r.ext === ".pdf")?.notes.join(" ")).toContain("aucun décodeur");
    expect(rows).toContainEqual({ ext: ".roomboard", read: true, write: true, readLot: 1, writeLot: 1, notes: [] });
    expect(rows.find((r) => r.ext === ".rbitem")?.notes.join(" ")).toContain("--grid");
    expect(rows).toContainEqual(expect.objectContaining({ ext: ".rbitem", read: true, write: true, readLot: 2, writeLot: 1 }));
    expect(rows.find((r) => r.ext === ".svg")?.notes.join(" ")).toContain("300 × 150");
    expect(rows.find((r) => r.ext === ".docx")?.notes.join(" ")).toContain("roomboard-office");
    expect(rows.find((r) => r.ext === ".xlsx")?.notes.join(" ")).toContain("H37");
  });
```

dans « importBlocked : … », `expect(importBlocked("r.DOCX")).toBe(4);` devient `expect(importBlocked("r.DOCX")).toBeNull();`,
et ajouter :

```ts
  it("D68 — aucune entrée « au lot N » : importBlocked null pour chaque clé, aucune note ne cite un lot", () => {
    for (const ext of Object.keys(FORMAT_LOTS)) expect(importBlocked(`x${ext}`), ext).toBeNull();
    for (const r of formatRows()) for (const n of r.notes) expect(n, r.ext).not.toMatch(/\blots?\b/i);
  });
  it("H48 — leftAsideReason : null pour tout format livré ; la note de coupe a son préfixe", () => {
    for (const ext of Object.keys(FORMAT_LOTS)) expect(leftAsideReason(`x${ext}`), ext).toBeNull();
    expect(LEFT_ASIDE).toBe("laissé de côté : ");
  });
```

(import : `leftAsideReason`, `LEFT_ASIDE`). Si la coupe G15 a eu lieu, ce dernier test liste les extensions laissées de
côté au lieu de « null pour tout ».

- [ ] **Étape 3 : rouge**

Run : `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/images.test.ts src/media.test.ts src/model3d.test.ts src/office.test.ts src/formats.test.ts src/import.test.ts 2>&1 | tail -20`
Attendu : échecs (code 3 « au lot 4 » pour les images, médias, 3D ; `LOT_LIVRE` vaut 3).

- [ ] **Étape 4 : `formats.ts`**

En-tête : remplacer la dernière phrase par « cli-lot3 (D42) : `.pdf` couvert. cli-lot4 (D68, D73) : tout le lot 4 couvert en
lecture (écriture `null`), `LOT_LIVRE = 4` ; le code 3 ne sort plus que d'une variante non lue : en-tête illisible,
convertisseur Office absent, format laissé de côté (H48). » Puis :

```ts
export const LOT_LIVRE: Lot = 4;
```

Retirer `UNREAD_IMAGES` et ajouter, à sa place :

```ts
/** cli-lot4 (H48) : préfixe de la note d'un format laissé de côté (`read: null`), suivi de sa raison. */
export const LEFT_ASIDE = "laissé de côté : ";
/** cli-lot4 : entrée lue par la CLI, jamais écrite (lecture seule, comme la page). */
const lot4 = (handler: string, ...notes: string[]): FormatEntry => branched(4, null, handler, { read: true, write: false }, ...notes);
const HEADER_SIZE = "taille lue dans l'en-tête ; illisible : code 3";
const PDF_EXPORT = "export .pdf : refusé, aucun décodeur d'image dans la CLI (code 1, D69)";
```

`ROWS` :

```ts
const ROWS: ReadonlyArray<readonly [string, FormatEntry]> = [
  [".roomboard", entry(1, 1, "roomboard")],
  [".rbitem", branched(2, 1, "rbitem", { read: true, write: true }, "insertion par `import` ; `--grid`")],
  [".rbpack", branched(2, 2, "rbpack", { read: true, write: true }, "par `library import` / `library export`")],
  [".pdf", branched(3, 3, "pdf", { read: true, write: true }, "fond `pdf-page`, PDF d'origine gardé en asset", "export : pages d'origine recopiées, annotation vectorielle ; sans repli en image (code 1)", "couleurs nommées et texte mesurés comme H25, H26", "image GIF, WebP, BMP, ICO, SVG, AVIF, HEIC : export refusé, krilla ne prend que PNG et JPEG et aucun décodeur d'image dans la CLI (code 1, D69)")],
  [".iwb", branched(2, 2, "iwb", { read: true, write: true }, "images lues par leur en-tête")],
  [".ubz", branched(2, 2, "ubz", { read: true, write: true }, "images lues par leur en-tête")],
  [".notebook", branched(2, null, "notebook", { read: true, write: false }, "lecture seule", "images lues par leur en-tête")],
  [".olf", branched(2, null, "olf", { read: true, write: false }, "lecture seule", "images lues par leur en-tête")],
  [".flipchart", branched(2, null, "flipchart", { read: true, write: false }, "lecture seule", "images lues par leur en-tête")],
  [".png", entry(1, null, "image", "taille lue dans l'en-tête")],
  ...each([".jpg", ".jpeg"], entry(1, null, "image", "taille lue dans l'en-tête, orientation EXIF non appliquée (H2)")),
  ...each([".gif", ".webp", ".bmp", ".ico"], lot4("image", HEADER_SIZE, PDF_EXPORT)),
  [".svg", lot4("image", "taille du navigateur (300 × 150 sans dimensions, H39) ; illisible : code 3", PDF_EXPORT)],
  ...each([".avif", ".heic", ".heif"], lot4("image", HEADER_SIZE, "rotation irot non appliquée (H43)", PDF_EXPORT)),
  ...each([".mp4", ".m4v", ".mov", ".webm", ".ogv", ".m4a", ".mp3", ".wav", ".ogg", ".oga"], lot4("media", "durée lue dans l'en-tête, sans poster (H40) ; illisible : code 3", "inclus, 100 Mo au plus (H45)")),
  ...each([".glb", ".gltf", ".obj", ".stl", ".ply"], lot4("model3d", "validé par three, sans instantané (cadre gris dans l'application, H40)")),
  ...each([".mtl", ".bin"], lot4("model3d-companion", "avec son modèle seulement")),
  [".zip", lot4("zip3d", "modèles 3D d'un ZIP, validés par three, sans instantané")],
  ...each([".xlsx", ".xlsm"], entry(1, null, "sheet", "valeurs de la première feuille ; largeur du texte approchée (H1)", "jamais converti en pages, même avec LibreOffice (H37)")),
  ...each([".docx", ".odt", ".ods", ".pptx", ".odp", ".doc", ".xls", ".ppt"], lot4("office", "converti par roomboard-office et LibreOffice (code 3 sans eux) ; original gardé en asset", "lecture seule")),
];
```

Après `importBlocked` :

```ts
/** H48 : raison d'un format laissé de côté (`read: null`, note `laissé de côté : …`) ; null sinon. */
export function leftAsideReason(name: string): string | null {
  const e = formatOf(name);
  const note = e !== null && e.read === null ? e.notes.find((n) => n.startsWith(LEFT_ASIDE)) : undefined;
  return note === undefined ? null : note.slice(LEFT_ASIDE.length);
}
```

Coupe G15 : un format laissé de côté s'écrit `[".mp3", make(null, null, "media", { read: false, write: false },
[\`${LEFT_ASIDE}<raison>\`])]` (raison du rapport de T2 à T5).

- [ ] **Étape 5 : `importer.ts`**

En-tête, phrase ajoutée : « cli-lot4 (D56, D58, D60, D63, D65, D67, DA17) : Office converti par roomboard-office
(`checkOffice` avant toute lecture), médias sondés par leur en-tête (`nodeMedia`), modèles 3D validés sans WebGL
(`nodeModel3d`), images de tout format à la taille de l'en-tête ; une image ou un média d'en-tête illisible sort en
code 3 avant `createImporter` (`headerBlocked`) ; un classeur n'a pas de chemin : tableau en valeurs. »

Imports (remplacer la ligne de `../../web/src/platform/import` et celle de `./formats`, ajouter les trois adaptateurs) :

```ts
import { createImporter, isSheetName, type ImportReport } from "../../web/src/platform/import";
import { extOf, importBlocked, leftAsideReason, packMessage, unsupportedMessage } from "./formats";
import { headerBlocked, nodeMedia } from "./media-node";
import { nodeModel3d } from "./model3d-node";
import { checkOffice, convertOfficeFile } from "./office-node";

/** DA17 : refus avant écriture, importables d'ici. */
export { checkOffice } from "./office-node";
export { headerBlocked } from "./media-node";
```

`nodeDecode` (l. 32-37) :

```ts
/** Taille par l'en-tête (tous les formats, D63) ; illisible : l'image est refusée (aucun décodeur d'image dans la CLI). */
export const nodeDecode: ImageDecoder = async (blob, kind) => {
  const size = await probeSize(blob, kind);
  if (size === null) throw new Error(`image ${kind} : taille illisible dans l'en-tête (aucun décodeur d'image dans la CLI)`);
  return { bitmap: { close: () => undefined } as unknown as ImageBitmap, w: size.w, h: size.h };
};
```

`nodeFile` (l. 39-48) :

```ts
export function nodeFile(path: string, bytes: Uint8Array): DroppedFile {
  const name = basename(path);
  return {
    name,
    size: bytes.byteLength,
    mime: "",
    // D58 : un classeur n'a pas de chemin : `officeHandler` le laisse au lecteur `sheet` (valeurs), aucun binaire lancé.
    ...(isSheetName(name) ? {} : { path }),
    head: async (n) => bytes.subarray(0, n),
    blob: async () => new Blob([bytes as BlobPart]),
  };
}
```

`checkSources` (l. 67-74) :

```ts
/** Code 3 avant toute lecture ni écriture (D9) : format laissé de côté (H48) ou lot non livré ; un paquet `.rbpack` :
 *  code 2, renvoi à `library` (D26). Le convertisseur Office (`checkOffice`) se contrôle à la suite, avant toute lecture. */
export function checkSources(sources: readonly string[]): void {
  for (const s of sources) {
    if (extOf(s) === ".rbpack") throw new CliError("usage", packMessage(s)); // D26 : un paquet va dans une bibliothèque
    const why = leftAsideReason(s);
    if (why !== null) throw new CliError("unsupported", `${basename(s)} : format non lu par la CLI : ${why}`);
    const lot = importBlocked(s);
    if (lot !== null) throw new CliError("unsupported", unsupportedMessage(s, lot));
  }
}
```

`importInto` (l. 88-116) :

```ts
export async function importInto(session: Session, req: ImportRequest): Promise<ImportResult> {
  checkSources(req.sources);
  const env = session.deps.env ?? process.env;
  await checkOffice(req.sources, env); // D56 : code 3 avant toute lecture (`--check` une fois par processus)
  const tab = session.active();
  const page = pageOf(tab, req.page);
  const read = await Promise.all(req.sources.map(async (s) => ({ s, bytes: await readBytes(s) })));
  for (const { s, bytes } of read) {
    const blocked = await headerBlocked(s, bytes); // D62, D65 : code 3 avant `createImporter`, rien écrit
    if (blocked !== null) throw new CliError("unsupported", blocked);
  }
  const files = read.map(({ s, bytes }) => {
    session.noteSource(s); // un tableau importé n'a pas de chemin dans `openBoard` : la source est retenue ici
    return nodeFile(s, bytes);
  });
  const { notices, formats } = session.deps;
  const before = notices.length;
  const importer = createImporter({
    openDocument: async (f) => (await session.openBytes(f.name, f.bytes, f.path ?? null)) !== null,
    openBoard: (f) => session.openBoard(f), // D22 : tableau en onglet sans fichier
    openPdf: (f) => session.openPdf(f), // D40 : PDF en onglet sans fichier
    notify: async (m) => {
      notices.push(m);
    },
    full: () => session.tabs.list().length >= MAX_TABS,
    target: () => headlessTarget(tab, page, notices, session.deps.fragments),
    decode: nodeDecode,
    readSheet: async (blob) => readSheet(await formats(), blob),
    ...nodeMedia(), // D60 : `probe` et `mediaUrls` par les URL de Node, durée lue dans l'en-tête, aucun lien
    model3d: nodeModel3d(), // D67 : three sans WebGL, instantané null
    convertOffice: (path) => convertOfficeFile(path, env), // D57 : roomboard-office
    openOffice: (f) => session.openPdf({ name: f.name, blob: f.pdf, original: f.original }), // comme la page (workspace.ts:461-465)
    officeConverter: true, // D56 : vérifié par `checkOffice` avant toute lecture
  });
  const report = await importer.importFiles(files, req.at ?? null);
  return { ...report, notices: notices.slice(before) };
}
```

- [ ] **Étape 6 : `main.ts`, `pdf-node.ts`, `contract.ts`**

`apps/cli/src/main.ts` : import `checkOffice` depuis `./importer` (ligne 20), et dans le gestionnaire `import`, après
`checkSources(sources); // code 3 avant toute lecture (D9)` :

```ts
    await checkOffice(sources, io.env); // D56 : convertisseur Office, code 3 avant toute lecture (document compris)
```

`apps/cli/src/pdf-node.ts:124-140` : commentaire « image autre que PNG ou JPEG : lève (lot 4, H24) » → « image autre que
PNG ou JPEG : lève (aucun décodeur d'image dans la CLI, H24, D69) » ; message :

```ts
      throw new Error(`image ${mime} : conversion en PNG indisponible dans la CLI (aucun décodeur d'image, D69)`);
```

`apps/cli/src/contract.ts:13` :

```ts
/** 1 refus (cœur, fichier illisible, import partiel), 2 usage, 3 variante que la CLI ne lit pas : en-tête illisible,
 *  convertisseur Office absent, format laissé de côté (D9 ; cli-lot4 D73, D80 : plus aucun lot non livré). */
```

Si `boards.test.ts` attendait un avis d'image sautée pour une image désormais lue, remplacer l'attente par l'image lue
(nombre d'éléments) et le dire au rapport ; sinon ne pas le toucher.

- [ ] **Étape 7 : vert**

Run : `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run --reporter=verbose src/images.test.ts src/media.test.ts src/model3d.test.ts src/office.test.ts src/formats.test.ts src/import.test.ts src/pdf.test.ts 2>&1 | grep -E "✓|×|↓|Test Files"`
Attendu : `Test Files  7 passed`, aucune ligne `×` ni `↓` ; lignes `✓` de `S5 — huit images`, `S3 — import son.wav`, `S4 — import
cube.obj`, `D76 — session run`, `S1 — import a.roomboard cours.docx`, `RF3 — deux .docx`, `D68 — aucune entrée`.
Run : `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli test 2>&1 | tail -10` — tous verts (garde :
`boards`, `export`, `library`, `main`, `rbitem`, `session`, `target`, `pdf-node`, `guards`, `convert`).
Run : `nice -n 10 pnpm --filter @roomboard/web test 2>&1 | tail -6` — aucun `FAIL ` (garde : `media-import`,
`model-view-three`, `model3d-handlers`, `office-import`, `import`, `zip-read`).
Run : `nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -3 && node apps/cli/dist/roomboard.mjs formats | node -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8")).formats;console.log(r.filter(x=>!x.read&&!x.notes.some(n=>n.startsWith("laissé de côté : "))).length)'` → `0` (lue, ou laissée de côté avec sa raison, H48).
Run : `grep -rn "lot 4" apps/cli/src/*.ts | grep -v "\.test\.ts"` → rien.
Run : `for p in /proc/[0-9]*; do tr '\0' ' ' < $p/cmdline; echo; done 2>/dev/null | grep -c roomboard-cli-t-` → `0`.

- [ ] **Étape 8 : commit**

```bash
git add apps/cli/src/importer.ts apps/cli/src/formats.ts apps/cli/src/main.ts apps/cli/src/pdf-node.ts apps/cli/src/contract.ts apps/cli/src/formats.test.ts apps/cli/src/import.test.ts apps/cli/src/pdf.test.ts apps/cli/src/images.test.ts apps/cli/src/media.test.ts apps/cli/src/model3d.test.ts apps/cli/src/office.test.ts
# et apps/cli/src/boards.test.ts seulement s'il a changé
git commit --author "jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(cli): lot 4 wired into import (Office, media, 3D, other images); FORMAT_LOTS fully covered

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t8"></a>
### Tâche T8 — Essai `cli-essai.mjs` (S1 à S5, Ctrl-C), `objets.mjs`, profil, mesure du démarrage, `verifier.sh --e2e`

**Objectif :** l'essai de bout en bout de la CLI construite joue S1 à S5 (fichiers écrits par `objets.mjs`, binaire et
LibreOffice réels), le Ctrl-C d'une conversion (D79), et vérifie qu'aucun processus ne reste ; les contrôles « .docx code
3 lot 4 » et « convert depuis .docx : code 2 » sont remplacés ; le profil dit « Lots restants : aucun » et le nouveau sens
du code 3 ; le démarrage est mesuré avant/après (D78) ; `scripts/verifier.sh --e2e` passe. Cadrage : D70, D71, D72, D78,
D79, H50, H51 ; S5 (et les contrôles de S1 à S4).

**Fichiers :**
- Créer : `scripts/essais/fabriques/objets.mjs`, `scripts/essais/fabriques/objets.d.mts`
- Modifier : `scripts/essais/cli-essai.mjs` (en-tête l. 1-7, `cli()` l. 35, contrôles l. 153-158 et 247, bloc « Lot 4 »
  avant `console.log("CLI : OK")`)
- Modifier : `.claude/chantier.md:47,51-52`

**Interfaces :**
- Consomme (T2, T3, T4) : fabriques `images.mjs`, `medias.mjs`, `modeles.mjs` (signatures de leurs sections) ;
  `IWB_HEAD` de `scripts/essais/fabriques/tableaux.mjs`.
- Consomme (T1, T6, T7) : CLI construite (`apps/cli/dist/roomboard.mjs`) avec le lot 4 branché ; binaire
  `target/debug/roomboard-office` (construit par `verifier.sh`, T1) ; messages exacts : « <nom> : durée du média illisible
  dans l'en-tête (la CLI ne décode pas les médias) », « <nom> : taille de l'image gif illisible dans l'en-tête (la CLI ne
  décode pas les images) », « cours.docx : conversion Office indisponible : convertisseur roomboard-office introuvable (…) »,
  « conversion Office interrompue (SIGINT) : rien n'est enregistré » (code 130).
- Réutilise : `scripts/essais/fabriques/pdf.mjs` (patron D43 : fabrique lue par les tests et l'essai) ; `scripts/essais/c14-media-navigateur.mjs:24-55` (référence des WAV/EBML écrits à la main, non touché)
- Produit :
  ```js
  // scripts/essais/fabriques/objets.mjs
  export * from "./images.mjs"; export * from "./medias.mjs"; export * from "./modeles.mjs";
  export const TAILLES: Readonly<Record<string, string>>;   // tailles attendues des images de S5, « <w>x<h> »
  export function jeu(zip?: (files: Record<string, Uint8Array>) => Uint8Array): Record<string, Uint8Array>;
  export function ecrireJeu(dir: string, zip?: …): string[]; // écrit le jeu des scénarios dans `dir`, rend les noms
  // lancé seul : node scripts/essais/fabriques/objets.mjs <dossier>
  ```

**Contraintes (recopiées de Global Constraints) :**
- G1 — Aucun contrôle désactivé ni sauté (hors la ligne « Office sauté » sous `ROOMBOARD_SANS_SOFFICE=1`, D54), aucun
  seuil baissé ou relevé, aucun délai relevé ; un contrôle qui échoue sur un délai est rejoué une fois.
- G2 — VM partagée : builds et essais en `nice -n 10`, cargo en `-j 4` ; avant toute commande :
  `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- G3 — `roomboard-shell` : seulement `cargo build -p roomboard-shell --bin roomboard-office` (par `verifier.sh`) ; aucun
  `tauri build`, aucun bundle, aucun build Android.
- G4 — LibreOffice en `--headless` ; chaque processus lancé est fermé ; aucun `soffice` vivant après l'essai (l'essai le
  vérifie). Ne tuer aucun processus non lancé par soi (`glycin-svg` compris) : le seul `kill` de l'essai vise le pid écrit
  par son faux binaire.
- G5 — Fichiers d'essai fabriqués par le code (`objets.mjs`, fixtures suivies `cours.docx`, `diapos.pptx`,
  `valeurs.xlsx`) ; aucun fichier téléchargé ; rien de `~/telechargements-roomboard/` ; écritures sous le `mkdtemp` de
  l'essai, retiré à la fin.
- G6 — Tailles Wasm inchangées : principal 1 374 215 o (plafond 1 572 864), formats 2 794 511 o (plafond 3 145 728) ;
  `verifier.sh` les imprime, les relever au rapport.
- G7 — Aucune dépendance ajoutée ; aucune AGPL/GPL/LGPL ; aucune installation de paquet système ; polices Liberation
  intouchées.
- G8 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais terminés par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un ; jamais `--force`.
- G9 — D15 : `scripts/essais/cli-essai.mjs` porte les contrôles de chaque format livré.
- G11 — Construction de la CLI : modules Wasm comme `scripts/verifier.sh`, puis `nice -n 10 pnpm --filter @roomboard/cli
  build`.
- G12 — Worktree isolé neuf : `cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r
  /home/adminjd/projets/roomboard-wt/cli-lot4/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot4/apps/web/src/wasm-formats
  apps/web/src/`, puis `nice -n 10 cargo build -p roomboard-shell --bin roomboard-office -j 4`.
- G13 — Contrôle « stderr vide » exigé pour l'import des médias, des images et de la 3D (S4) et pour `convert` d'un Office.

**Interdits :** toucher le code de `apps/` ou `crates/` (un écart trouvé par l'essai est rapporté avec la commande qui le
montre, sans correctif ici) ; fichier d'essai suivi dans le dépôt ; `pkill`, `killall` ou tout `kill` d'un processus
non lancé par l'essai.

**Terminé quand :** `node scripts/essais/cli-essai.mjs` → dernière ligne `CLI : OK` ; `nice -n 10 scripts/verifier.sh
--e2e` → `CLI : OK`, `verifier.sh : e2e OK`, modules 1 374 215 o et 2 794 511 o ; `node scripts/essais/fabriques/objets.mjs
<dossier>` écrit le jeu ; profil à jour. Rapport : médianes de `version` avant/après (D78), tailles Wasm, durée de
`verifier.sh --e2e`, ligne `Réutilisation : appelé fabriques pdf.mjs (patron), images.mjs, medias.mjs, modeles.mjs`.

**Étapes :**

- [ ] **Étape 1 : `objets.mjs`** — `scripts/essais/fabriques/objets.mjs`

```js
// Jeu d'essai du lot 4 (cadrage cli-lot4, D70) : réexporte les fabriques d'images, de médias et de modèles 3D ; lancé
// seul (`node scripts/essais/fabriques/objets.mjs <dossier>`), écrit dans <dossier> les fichiers des scénarios S3 à S5.
// Aucun fichier téléchargé. Lu par cli-essai.mjs.
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bmp, gif, heif, ico, svg, webp } from "./images.mjs";
import { mp3, mp4, mp4Broken, ogg, wav, webm } from "./medias.mjs";
import { cubeMtl, cubeObj, glbTextured, gltfPair, plyTriangle, png1, stlTriangle } from "./modeles.mjs";
import { IWB_HEAD } from "./tableaux.mjs";

export * from "./images.mjs";
export * from "./medias.mjs";
export * from "./modeles.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const enc = (s) => new TextEncoder().encode(s);

/** Tailles attendues des images de S5 (`<w>x<h>`) ; `vb.svg` (viewBox 400 × 100 seul) : 300 × 75 (D64). */
export const TAILLES = Object.freeze({ "i.gif": "320x200", "i.webp": "64x48", "i.bmp": "33x21", "i.ico": "48x48", "i.svg": "40x30", "vb.svg": "300x75", "i.avif": "120x80", "i.heic": "90x60" });

/** Fichiers des scénarios S3 à S5 ; `zip` (fflate `zipSync`) ajoute `gif.iwb`, tableau dont l'image est un GIF. */
export function jeu(zip) {
  const { gltf, bin } = gltfPair();
  const files = {
    "son.wav": wav(1),
    "clip.mp4": mp4({ duration: 2.5, width: 640, height: 360 }),
    "clip.webm": webm({ duration: 3.2, width: 320, height: 240 }),
    "casse.mp4": mp4Broken(),
    "a.mp3": mp3({ frames: 100, xing: true }),
    "b.ogg": ogg({ codec: "vorbis", granule: 88200 }),
    "i.gif": gif(320, 200),
    "i.webp": webp("VP8 ", 64, 48),
    "i.bmp": bmp(33, 21),
    "i.ico": ico([[16, 16], [48, 48]]),
    "i.svg": svg('width="40" height="30"'),
    "vb.svg": svg('viewBox="0 0 400 100"'),
    "i.avif": heif("avif", 120, 80),
    "i.heic": heif("heic", 90, 60),
    "casse.gif": enc("GIF89a"),
    "cube.obj": cubeObj(),
    "cube.mtl": cubeMtl(),
    "tex.png": png1(),
    "tri.stl": stlTriangle(),
    "tri.ply": plyTriangle(),
    "tri.gltf": gltf,
    "tri.bin": bin,
    "tex.glb": glbTextured(),
    "seul.gltf": gltf,
    "seul.mtl": cubeMtl(null),
  };
  if (zip) {
    const xml = `${IWB_HEAD}<svg:svg viewbox="0 0 960 540"><svg:pageset><svg:page id="p1"><svg:image id="i1" xlink:href="images/i.gif" x="10" y="10" width="64" height="64"/></svg:page></svg:pageset></svg:svg></iwb>`;
    files["gif.iwb"] = zip({ "content.xml": enc(xml), "images/i.gif": gif(64, 64) });
  }
  return files;
}

/** Écrit `jeu(zip)` dans `dir` (créé au besoin) ; rend les noms écrits. */
export function ecrireJeu(dir, zip) {
  mkdirSync(dir, { recursive: true });
  const files = jeu(zip);
  for (const [name, bytes] of Object.entries(files)) writeFileSync(join(dir, name), bytes);
  return Object.keys(files);
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2];
  if (dir === undefined) {
    console.error("usage : node scripts/essais/fabriques/objets.mjs <dossier>");
    process.exit(2);
  }
  const { zipSync } = createRequire(join(ROOT, "apps", "web", "package.json"))("fflate");
  console.log(ecrireJeu(dir, zipSync).join("\n"));
}
```

`scripts/essais/fabriques/objets.d.mts` :

```ts
// Types du jeu d'essai du lot 4 (cadrage cli-lot4, D70), `objets.mjs`.
export * from "./images.mjs";
export * from "./medias.mjs";
export * from "./modeles.mjs";
export const TAILLES: Readonly<Record<string, string>>;
export function jeu(zip?: (files: Record<string, Uint8Array>) => Uint8Array): Record<string, Uint8Array>;
export function ecrireJeu(dir: string, zip?: (files: Record<string, Uint8Array>) => Uint8Array): string[];
```

Run : `cd ~/projets/roomboard-wt/cli-lot4--T8 && d=$(mktemp -d) && node scripts/essais/fabriques/objets.mjs $d | wc -l && ls $d | head -3 && rm -rf $d`
Attendu : `26` (25 fichiers + `gif.iwb`), puis des noms du jeu.

- [ ] **Étape 2 : `cli-essai.mjs`, l'en-tête et `cli()`**

En-tête, remplacer la fin de la ligne 7 (`… stderr vide des commandes PDF, D23 pour .pdf ; code 3 sur import … x.docx.`)
par `… stderr vide des commandes PDF, D23 pour .pdf.` et ajouter :

```js
// Lot 4 (cadrage cli-lot4, S1 à S5, D71, D79) : médias, images et 3D fabriqués par objets.mjs ; Office par le binaire
// roomboard-office et LibreOffice (sauté sous ROOMBOARD_SANS_SOFFICE=1, ligne « Office sauté ») ; conversions/ vide et aucun
// processus ne citant la racine XDG_CACHE_HOME de l'essai ; Ctrl-C d'une conversion : 130 et une ligne {"error":…}.
```

Imports : `import { spawn, spawnSync } from "node:child_process";`, ajouter `readdirSync` à l'import de `node:fs`,
et `import { ecrireJeu, TAILLES } from "./fabriques/objets.mjs";`.

`cli()` (l. 35-37) prend des variables en plus :

```js
function cli(args, input, env = {}) {
  const r = spawnSync("node", [BIN, ...args], { encoding: "utf8", input, env: { ...process.env, ROOMBOARD_NOW: "1700000000000", ...env } });
```

et, après `egal` (l. 87), l'aide :

```js
/** Processus vivants dont la ligne de commande cite `needle` (Linux, `/proc`). */
const processusAvec = (needle) =>
  readdirSync("/proc")
    .filter((n) => /^\d+$/.test(n))
    .flatMap((n) => {
      try {
        const c = readFileSync(join("/proc", n, "cmdline"), "latin1").replaceAll("\0", " ");
        return c.includes(needle) ? [c] : [];
      } catch {
        return [];
      }
    });
```

- [ ] **Étape 3 : remplacer les deux contrôles du lot 3 (effets de bord)**

Lignes 153-158 : garder `const docx = join(dir, "x.docx");` et `writeFileSync(docx, "PK\u0003\u0004");`, supprimer
`const avantDocx …`, `const rd …` et les deux `verifie("import d'un .docx : …")` (S2 les remplace dans le bloc du lot 4).
Ligne 247, remplacer `verifie("convert depuis .docx : code 2", …)` par :

```js
  const sansOffice = { ROOMBOARD_OFFICE: join(dir, "absent") };
  const cdx = cli(["convert", docx, join(dir, "docx.roomboard")], undefined, sansOffice);
  verifie("convert depuis .docx sans convertisseur : code 3, rien écrit (D56, D59)", cdx.code === 3 && cdx.err?.error?.code === "unsupported" && !existsSync(join(dir, "docx.roomboard")), cdx.brut);
```

- [ ] **Étape 4 : bloc du lot 4** — insérer avant `console.log("CLI : OK");`

```js
  // ---- Lot 4 (cadrage cli-lot4, S1 à S5) : fichiers écrits par objets.mjs, binaire roomboard-office ----
  const cache = join(dir, "cache");
  const envOffice = { XDG_CACHE_HOME: cache };
  const lot4 = join(dir, "lot4");
  ecrireJeu(lot4, zipSync);
  const de = (...noms) => noms.map((x) => join(lot4, x));
  const nomDe = (st, id) => st.assets.find((x) => x.id === id)?.name;
  const f4 = cli(["formats"]).lignes[0].formats;
  const nonLus = f4.filter((x) => x.read !== true && !x.notes.some((t) => t.startsWith("laissé de côté : ")));
  verifie("formats : chaque format lu, ou laissé de côté avec sa raison (D68, H48)", nonLus.length === 0, JSON.stringify(nonLus.map((x) => x.ext)));
  verifie("formats : aucune note ne cite un lot", f4.every((x) => x.notes.every((t) => !/\blots?\b/i.test(t))));
  const b4 = join(dir, "b4.roomboard");
  verifie("new b4.roomboard", cli(["new", b4]).code === 0);

  // S3 — médias
  const m3 = cli(["import", b4, ...de("son.wav", "clip.mp4", "clip.webm", "a.mp3", "b.ogg")]);
  verifie("S3 : import son.wav clip.mp4 clip.webm a.mp3 b.ogg : cinq insérés", m3.code === 0 && m3.lignes[0]?.inserted.length === 5, m3.brut);
  verifie("stderr vide : import des médias", m3.stderr === "", m3.stderr);
  const e3 = etat(b4);
  const medias = Object.fromEntries(e3.pages[0].elements.filter((x) => x.kind === "media").map((x) => [nomDe(e3, x.media.asset), x.media]));
  const decrit = (x) => (x === undefined ? "absent" : `${x.mediaType} ${x.w}x${x.h} ${x.duration}s ${x.poster === null ? "sans poster" : "poster"}`);
  egal("S3 : durées et tailles lues dans l'en-tête", Object.fromEntries(Object.entries(medias).map(([k, x]) => [k, decrit(x)])), {
    "son.wav": "audio 480x120 1s sans poster",
    "clip.mp4": "video 640x360 2.5s sans poster",
    "clip.webm": "video 320x240 3.2s sans poster",
    "a.mp3": "audio 480x120 2.612s sans poster",
    "b.ogg": "audio 480x120 2s sans poster",
  });
  const avantCasse = empreinte(b4);
  const cm = cli(["import", b4, ...de("casse.mp4")]);
  verifie("S3 : casse.mp4 : code 3 « durée du média illisible dans l'en-tête », fichier inchangé", cm.code === 3 && cm.err?.error?.message === "casse.mp4 : durée du média illisible dans l'en-tête (la CLI ne décode pas les médias)" && empreinte(b4) === avantCasse, cm.brut);

  // S5 — autres images, aussi dans un tableau blanc
  const im = cli(["import", b4, ...de(...Object.keys(TAILLES))]);
  verifie("S5 : huit images insérées", im.code === 0 && im.lignes[0]?.inserted.length === 8, im.brut);
  verifie("stderr vide : import des images", im.stderr === "", im.stderr);
  const e5 = etat(b4);
  egal("S5 : tailles lues dans l'en-tête (vb.svg : 300 × 75)", Object.fromEntries(e5.pages[0].elements.filter((x) => x.kind === "image").map((x) => [nomDe(e5, x.image.asset), `${x.image.w}x${x.image.h}`])), { ...TAILLES });
  const cg = cli(["import", b4, ...de("casse.gif")]);
  verifie("S5 : casse.gif : code 3 « taille de l'image gif illisible dans l'en-tête »", cg.code === 3 && cg.err?.error?.message === "casse.gif : taille de l'image gif illisible dans l'en-tête (la CLI ne décode pas les images)", cg.brut);
  const g4 = join(dir, "g.roomboard");
  const gi = cli(["convert", ...de("gif.iwb"), g4]);
  verifie("S5 : convert gif.iwb : aucun avis d'image", gi.code === 0 && !/image/i.test(gi.lignes[0].notices.join(" ")), gi.brut);
  verifie("S5 : l'image GIF du tableau est lue", etat(g4).pages[0].elements.filter((x) => x.kind === "image").length === 1);

  // S4 — 3D sans vignette
  const t4 = cli(["import", b4, ...de("cube.obj", "cube.mtl", "tex.png", "tri.stl", "tri.gltf", "tri.bin", "tex.glb")]);
  verifie("S4 : quatre objets 3D insérés", t4.code === 0 && JSON.stringify(t4.lignes[0]?.inserted) === JSON.stringify(["cube.obj", "tri.stl", "tri.gltf", "tex.glb"]), t4.brut);
  verifie("S4 : « 3D indisponible sur ce poste » dit une fois", t4.lignes[0].notices.filter((t) => t.startsWith("3D indisponible sur ce poste")).length === 1, JSON.stringify(t4.lignes[0].notices));
  verifie("stderr vide : import 3D (S4)", t4.stderr === "", t4.stderr);
  const e4 = etat(b4);
  const modeles = e4.pages[0].elements.filter((x) => x.kind === "model3d");
  verifie("S4 : quatre model3d, instantanés nuls", modeles.length === 4 && modeles.every((x) => x.model3d.snapshot === null), String(modeles.length));
  const sg = cli(["import", b4, ...de("seul.gltf")]);
  verifie("S4 : .gltf sans .bin : code 1, aucune pile", sg.code === 1 && !/\n\s+at /.test(sg.stderr), sg.brut);
  const sm = cli(["import", b4, ...de("seul.mtl")]);
  verifie("S4 : seul.mtl : code 1, « déposez-le avec son modèle »", sm.code === 1 && sm.lignes[0]?.notices.join(" ").includes("déposez-le avec son modèle"), sm.brut);
  const r4 = cli(["run", "--new", "--ops", "-"], `${JSON.stringify({ op: "import", files: de("tri.stl") })}\n${JSON.stringify({ op: "tab.open", file: trois })}\n`);
  verifie("S4 : run import 3D puis tab.open d'un PDF : code 0 (D76)", r4.code === 0, r4.brut);

  // S1 — Office converti, puis chemin PDF
  const FIXO = join(ROOT, "crates", "roomboard-shell", "tests", "fixtures");
  if (process.env.ROOMBOARD_SANS_SOFFICE === "1") console.log("Office sauté : ROOMBOARD_SANS_SOFFICE=1");
  else {
    const dr = join(dir, "diapos.roomboard");
    const cd = cli(["convert", join(FIXO, "diapos.pptx"), dr], undefined, envOffice);
    verifie("S1 : convert diapos.pptx : 2 pages, aucun avis", cd.code === 0 && cd.lignes[0]?.pages === 2 && cd.lignes[0].notices.length === 0, cd.brut);
    verifie("stderr vide : convert diapos.pptx", cd.stderr === "", cd.stderr);
    const ed = etat(dr);
    verifie("S1 : fonds pdf-page, diapos.pdf et l'original diapos.pptx en assets", fondsPdf(ed) && ed.assets.some((x) => x.name === "diapos.pdf" && x.mime === "application/pdf") && ed.assets.some((x) => x.name === "diapos.pptx" && x.mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation"), JSON.stringify(ed.assets));
    const cp = join(dir, "cours.pdf");
    const cdo = cli(["convert", join(FIXO, "cours.docx"), cp], undefined, envOffice);
    verifie("S1 : convert cours.docx cours.pdf : %PDF-", cdo.code === 0 && readFileSync(cp).subarray(0, 5).toString("latin1") === "%PDF-", cdo.brut);
    const idx = cli(["import", b4, join(FIXO, "cours.docx")], undefined, envOffice);
    verifie("S1 : import cours.docx : ouvert", idx.code === 0 && JSON.stringify(idx.lignes[0]?.opened) === JSON.stringify(["cours.docx"]), idx.brut);
    const ixl = cli(["import", b4, XLSX], undefined, envOffice);
    verifie("S1 : import valeurs.xlsx : tableau en valeurs (D58)", ixl.code === 0 && ixl.lignes[0]?.inserted.includes("valeurs.xlsx"), ixl.brut);
    const conv = join(cache, "roomboard-office", "conversions");
    verifie("S1 : conversions/ vide", !existsSync(conv) || readdirSync(conv).length === 0);
    verifie("S1 : aucun processus ne cite la racine de l'essai (G4)", processusAvec(cache).length === 0, processusAvec(cache).join(" | "));
  }

  // S2 — Office impossible : code 3, rien écrit
  const avantS2 = empreinte(b4);
  const s2 = cli(["import", b4, join(FIXO, "cours.docx")], undefined, { ...envOffice, ROOMBOARD_OFFICE: join(dir, "absent") });
  verifie("S2 : ROOMBOARD_OFFICE absent : code 3, « conversion Office indisponible », fichier inchangé", s2.code === 3 && s2.err?.error?.code === "unsupported" && String(s2.err.error.message).startsWith("cours.docx : conversion Office indisponible : convertisseur roomboard-office introuvable") && empreinte(b4) === avantS2, s2.brut);

  // D79 — Ctrl-C pendant une conversion : transmis au binaire, sortie 130, une ligne {"error":…}
  const faux = join(dir, "faux-office");
  const marque = join(dir, "faux-office.pid");
  writeFileSync(faux, `#!/bin/sh\nif [ "$1" = "--check" ]; then echo "racine : ${join(dir, "racine")}"; exit 0; fi\necho $$ > '${marque}'\nexec sleep 30\n`, { mode: 0o755 });
  const lent = join(dir, "lent.docx");
  writeFileSync(lent, "PK\u0003\u0004");
  const enfant = spawn("node", [BIN, "convert", lent, join(dir, "lent.roomboard")], { env: { ...process.env, ROOMBOARD_OFFICE: faux }, stdio: ["ignore", "pipe", "pipe"] });
  let errEnfant = "";
  enfant.stderr.setEncoding("utf8").on("data", (c) => (errEnfant += c));
  const fin = new Promise((r) => enfant.on("close", (code, signal) => r({ code, signal })));
  for (let i = 0; i < 300 && !existsSync(marque); i++) await new Promise((r) => setTimeout(r, 100));
  const pidFaux = existsSync(marque) ? Number(readFileSync(marque, "utf8").trim()) : null;
  enfant.kill("SIGINT");
  const sortie = await fin;
  if (pidFaux !== null) {
    try {
      process.kill(pidFaux, "SIGKILL"); // seulement le faux binaire de l'essai, s'il vivait encore
    } catch {
      // déjà sorti
    }
  }
  verifie("D79 : Ctrl-C pendant une conversion : code 130", pidFaux !== null && sortie.code === 130, JSON.stringify(sortie));
  verifie("D79 : une ligne {\"error\":…} « conversion Office interrompue »", errEnfant.trim().split("\n").length === 1 && JSON.parse(errEnfant).error?.message?.startsWith("conversion Office interrompue (SIGINT)"), errEnfant);
  verifie("D79 : rien écrit", !existsSync(join(dir, "lent.roomboard")));
```

(`zipSync`, `XLSX`, `trois`, `fondsPdf`, `etat`, `empreinte`, `egal`, `verifie` existent déjà dans l'essai.)

- [ ] **Étape 5 : profil** — `.claude/chantier.md`

Ligne 47, ajouter à la fin : « ; les fichiers Office passent par `cargo build -p roomboard-shell --bin roomboard-office`
(binaire lu dans `target/debug/`, ou `ROOMBOARD_OFFICE=<chemin>`) et LibreOffice. »
Ligne 51 : `- Lots restants : aucun. Lots livrés : 2 (`docs/plans/cli-lot2-cadrage.md`), 3, PDF (`docs/plans/cli-lot3-cadrage.md`),
4, Office, médias, 3D, autres images (`docs/plans/cli-lot4-cadrage.md`).`
Ligne 52 : `- Codes de sortie : 0 succès ; 1 refus (cœur, fichier, import partiel) ; 2 usage ; 3 variante que la CLI ne lit pas
(en-tête d'image ou de média illisible, convertisseur Office absent, format laissé de côté) ; toute écriture de document
(`new`, `save`, `--save`, `--out`, `apply`, `import`) vise un `.roomboard`, sinon 2 (D23).`

Run : `grep -c "Lots restants : 4\|format d'un lot non livré" .claude/chantier.md` → `0` ; `grep -c "Lots restants : aucun" .claude/chantier.md` → `1`.

- [ ] **Étape 6 : essai et mesure**

```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
nice -n 10 cargo build -p roomboard-shell --bin roomboard-office -j 4 2>&1 | tail -2
nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -3
nice -n 10 node scripts/essais/cli-essai.mjs 2>&1 | tail -60
```
Attendu : dernière ligne `CLI : OK` ; lignes `ok — … S1 :`, `S2 :`, `S3 :`, `S4 :`, `S5 :`, `D79 :`, `stderr vide : import 3D (S4)`.
Mesure D78 (médiane de 5) ; « avant » : CLI de référence de `origin/main` construite par la référence de fond, si elle
existe (`~/.cache/tmp/ctl-cli-zc9h/apps/cli/dist/roomboard.mjs`), sinon le dire au rapport :
```bash
med() { for i in 1 2 3 4 5; do /usr/bin/time -f %e node "$1" version 2>&1 >/dev/null | tail -1; done | sort -n | sed -n 3p; }
[ -f ~/.cache/tmp/ctl-cli-zc9h/apps/cli/dist/roomboard.mjs ] && echo "avant : $(med ~/.cache/tmp/ctl-cli-zc9h/apps/cli/dist/roomboard.mjs) s"
echo "après : $(med apps/cli/dist/roomboard.mjs) s"
```
Au-delà de +0,3 s : l'écrire au rapport (H51), sans autre changement.

- [ ] **Étape 7 : vérification complète**

Run (en fond, borné : `timeout 3600`) : `nice -n 10 timeout 3600 scripts/verifier.sh --e2e > /tmp/cli-lot4-verifier.log 2>&1; echo "code $?"`
Puis : `grep -E "CLI : OK|e2e OK|module formats|module principal|octets|FAIL|ÉCHEC|error\[" /tmp/cli-lot4-verifier.log | tail -20`
Attendu : `code 0`, `CLI : OK`, `verifier.sh : e2e OK`, modules aux tailles de G6. Un essai `--e2e` qui échoue sur un délai est
rejoué une fois (G1) ; un écart réel est rapporté avec sa ligne de journal.
Run : `for p in /proc/[0-9]*; do tr '\0' ' ' < $p/cmdline; echo; done 2>/dev/null | grep -c "roomboard-cli-essai-"` → `0`.

- [ ] **Étape 8 : commit**

```bash
git add scripts/essais/fabriques/objets.mjs scripts/essais/fabriques/objets.d.mts scripts/essais/cli-essai.mjs .claude/chantier.md
git commit --author "jejeasterix <jejeasterix@users.noreply.github.com>" -m "test(cli): lot 4 end-to-end checks (Office, media, 3D, images, Ctrl-C); profile: no lot left

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
