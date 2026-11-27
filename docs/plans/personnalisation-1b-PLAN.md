# Personnalisation 1b — fonds de page, pack livré, « Mes fonds » et recherche (OG5) — plan d'exécution

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**Objectif :** un bouton « Fonds » de la barre d'outils principale ouvre une fenêtre (sections, thèmes, miniatures,
recherche française tolérante) qui applique à la page montrée, ou à toutes les pages, en une seule étape d'annulation, un
fond du pack livré (118 dessinés + 40 à 50 photos CC0) ou de « Mes fonds », pilotable par la CLI, sans aucune trace de
service extérieur dans l'interface.

**Architecture :** une commande neuve du cœur `ApplyBackground` (fichier `page_look.rs`, une transaction, seules les
pages qui changent) réutilise `grid::write`, la clé `background` et l'écriture du fond extraite de `cmd_set_backdrop`.
Côté page, le pack (catalogue TypeScript chargé à la demande, WebP servis en fichiers statiques) devient une
`BackgroundSource`, puis une seule commande ; « Mes fonds » est la troisième racine de la bibliothèque de l'appareil.
La fenêtre est un composant à part (`BackgroundsDialog`) monté par une enveloppe (`BackgroundsWindow`) ; la CLI appelle
les mêmes fonctions que l'interface.

**Pile :** Rust (yrs) et Wasm (`wasm-bindgen`), TypeScript strict, SolidJS, Vitest (happy-dom), Playwright (Chromium),
ffmpeg (libwebp) pour le seul producteur des photos.

**Spec :** `docs/plans/personnalisation-1b-cadrage.md` (37 décisions Q1 à Q37, DA1 à DA7, scénarios S1 à S5).

**Correspondance avec DA7 du cadrage :** le cadrage prévoyait 11 tâches ; la tâche « intégration » (T8 de DA7) est
coupée en deux pour éviter tout fichier commun dans une vague : la part sans dépendance (action, profils, icônes) passe
en vague 1 (T6 ici), la part qui monte la fenêtre reste en vague 3 (T10 ici). DA7 → ce plan : T1 → T1, T2 → T2,
T3 → T3, T4a → T4, T5 → T5, T4b → T7, T6 → T8, T7 → T9, T8 → T6 + T10, T9 → T11, T10 → T12.

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Cœur, pont Wasm et doubles : commande `ApplyBackground` | — | crates/roomboard-core/src/page_look.rs, crates/roomboard-core/src/commands.rs, crates/roomboard-core/src/lib.rs, crates/roomboard-wasm/src/lib.rs, apps/web/src/core/api.ts, apps/web/src/core/wasm-core.ts, apps/web/src/core/fake-core.ts, apps/web/src/core/wasm-core.contract.test.ts, apps/cli/src/ops.ts | isolé | concepteur-critique | roomboard-core ≥ 7 tests `apply_background_` ; roomboard-wasm 1 test `apply_background_inner` ; contrat : bloc `contrat personnalisation-1b` sur 2 fabriques (≥ 8 tests) ; `set_backdrop_` et `image_and_backdrop_reload_keep_bytes` verts ; Wasm principal ≤ 1 572 864 o | S1, S2, S4 | #tache-t1 |
| T2 | Catalogue, sections et 118 fonds dessinés | — | apps/web/src/backgrounds/catalog.ts, apps/web/src/backgrounds/drawn.ts, apps/web/src/backgrounds/svg.ts, apps/web/src/backgrounds/photos.ts, apps/web/src/backgrounds/catalog.test.ts | isolé | implementeur-tdd | `catalog.test.ts` ≥ 8 tests, noms « DRAWN : au moins 110 » et « fonds nommés par les scénarios » présents | S1, S4 | #tache-t2 |
| T3 | Recherche française tolérante aux fautes | — | apps/web/src/backgrounds/search.ts, apps/web/src/backgrounds/synonyms.ts, apps/web/src/backgrounds/search.test.ts | isolé | implementeur-tdd | `search.test.ts` ≥ 12 tests, noms « faute » et « rang » présents | S2, S5 | #tache-t3 |
| T4 | Photos CC0 : sources, preuves de licence, notices | — | apps/web/backgrounds/SOURCES.json, apps/web/src/backgrounds/sources.test.ts, THIRD_PARTY_NOTICES.md | isolé | implementeur-tdd | `sources.test.ts` ≥ 7 tests ; 40 à 50 entrées vérifiées une à une | S2 | #tache-t4 |
| T5 | « Mes fonds » : racine de bibliothèque, module, portée de la coque | — | apps/web/src/platform/library-files.ts, apps/web/src/app/library.ts, apps/web/src/backgrounds/source.ts, apps/web/src/app/my-backgrounds.ts, apps/web/src/app/my-backgrounds.test.ts, apps/desktop/src-tauri/capabilities/default.json, crates/roomboard-shell/src/lib.rs | isolé | concepteur-critique | `my-backgrounds.test.ts` ≥ 12 tests ; `capabilities_grant_library_folder_only` vert ; `library-files.test.ts`, `library.test.ts`, `LibraryPanel.test.tsx` verts | S3 | #tache-t5 |
| T6 | Bouton « Fonds » : action, profils fournis, icônes | — | apps/web/src/toolbar.ts, apps/web/src/app/toolbar-host.ts, apps/web/src/app/toolbar-host.test.ts, apps/web/src/toolbar-profiles.ts, apps/web/src/toolbar-profiles.test.ts, apps/web/src/ui/icons.ts, apps/web/src/ui/icons.test.ts, apps/web/src/ui/App.tsx | isolé | implementeur-tdd | `toolbar-profiles.test.ts`, `icons.test.ts`, `toolbar-host.test.ts` verts (test « backgrounds bascule » présent) ; suite web complète verte | S1 | #tache-t6 |
| T7 | Photos : encodage WebP, miniatures, catalogue généré, tests du pack | T2, T4 | scripts/fonds/produire-photos.mjs, apps/web/public/backgrounds/photos/*.webp, apps/web/public/backgrounds/thumbs/*.webp, apps/web/src/backgrounds/photos.ts, apps/web/backgrounds/SOURCES.json, apps/web/src/backgrounds/pack.test.ts | isolé | implementeur-tdd | `pack.test.ts` ≥ 8 tests ; pack ≤ 31 457 280 o ; 150 à 200 fonds ; planche-contact décrite | S2 | #tache-t7 |
| T8 | Appliquer un fond : `backgrounds-apply`, `renderPageImage`, marqueur `data-look` | T1, T2, T5 | apps/web/src/app/backgrounds-apply.ts, apps/web/src/app/backgrounds-apply.test.ts, apps/web/src/app/thumbnail.ts, apps/web/src/app/thumbnail.test.ts, apps/web/src/app/board-session.ts | isolé | concepteur-critique | `backgrounds-apply.test.ts` ≥ 9 tests (« photo absente » présent) ; `thumbnail.test.ts` : 4 anciens + 3 nouveaux | S1, S2, S4 | #tache-t8 |
| T9 | Fenêtre des fonds (`BackgroundsDialog`) | T2, T3, T5, T6 | apps/web/src/ui/BackgroundsDialog.tsx, apps/web/src/ui/BackgroundsDialog.test.tsx, apps/web/src/ui/backgrounds.css, apps/web/src/ui/RadioChoices.tsx, apps/web/src/ui/RadioChoices.test.tsx | isolé | implementeur-tdd | `BackgroundsDialog.test.tsx` ≥ 11 tests (« a défilé » et « double toucher » présents) ; `RadioChoices.test.tsx` vert | S1, S2, S5 | #tache-t9 |
| T10 | Intégration : fenêtre montée, Ctrl+Maj+F, dépôt dérivé, panneau Grille, câblage | T5, T6, T8, T9 | apps/web/src/ui/BackgroundsWindow.tsx, apps/web/src/ui/BackgroundsWindow.test.tsx, apps/web/src/ui/App.tsx, apps/web/src/ui/GridPanel.tsx, apps/web/src/ui/GridPanel.test.tsx, apps/web/src/engine/input/keys.ts, apps/web/src/engine/input/keys.test.ts, apps/web/src/app/workspace.ts, apps/web/src/app/workspace.test.ts, apps/web/src/main.ts, docs/essais/c11a-coque.md, docs/essais/c11b-coque.md | isolé | implementeur-tdd | `BackgroundsWindow.test.tsx` ≥ 6 tests ; `keys.test.ts`, `GridPanel.test.tsx`, `workspace.test.ts`, `App.test.tsx` verts ; `pnpm --filter @roomboard/web build` OK | S3, S5 | #tache-t10 |
| T11 | CLI : commande `backgrounds`, opération `background` | T1, T2, T3, T7, T8 | apps/cli/src/backgrounds.ts, apps/cli/src/backgrounds.test.ts, apps/cli/src/ops.ts, apps/cli/src/ops.test.ts, apps/cli/src/session.ts, apps/cli/src/main.ts, apps/cli/src/main.test.ts, scripts/essais/cli-essai.mjs | isolé | concepteur-critique | `backgrounds.test.ts` ≥ 9 tests ; suite CLI verte ; `cli-essai.mjs` affiche `CLI : OK` avec les lignes « background » | S4 | #tache-t11 |
| T12 | Essai e2e S1 à S5, netteté, captures 2x, `verifier.sh` | T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11 | scripts/essais/fonds-navigateur.mjs, scripts/essais/commun.mjs, scripts/verifier.sh, scripts/tests/verifier-e2e.test.sh, docs/design/captures/personnalisation-1b/*.png | isolé | implementeur-tdd | `fonds-navigateur.mjs` : `personnalisation 1b : OK`, ≥ 40 lignes « ok — » ; `verifier.sh --e2e` : `verifier.sh : e2e OK` puis `verifier.sh : OK` | S1, S2, S3, S4, S5 | #tache-t12 |

**Vagues** (aucune paire d'une même vague ne touche le même fichier ; vérifié fichier par fichier) :
vague 1 : T1, T2, T3, T4, T5, T6 · vague 2 : T7, T8, T9 · vague 3 : T10, T11 · vague 4 : T12.
Estimation : vague 1 ≈ 70 min (T4, recherche des licences, est la plus longue), vague 2 ≈ 60 min, vague 3 ≈ 50 min,
vague 4 ≈ 50 min, soit ≈ 3 h 50 : dépassement possible de ≈ 20 min sur le budget de 3 h 30, porté par T4 et T12.
Fichiers repris d'une vague à l'autre (jamais dans la même) : `apps/web/src/ui/App.tsx` (T6 puis T10),
`apps/cli/src/ops.ts` (T1 puis T11), `apps/web/src/backgrounds/photos.ts` (T2 puis T7),
`apps/web/backgrounds/SOURCES.json` (T4 puis T7).

## Global Constraints

- VM partagée : builds et tests en `nice -n 10`, `cargo … -j 4`, `CARGO_TARGET_DIR=<worktree de la tâche>/target` (piège : cible partagée entre worktrees) ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; test isolé direct.
- Tailles Wasm : principal ≤ 1 572 864 o (1 375 581 o à `45484db`), formats ≤ 3 145 728 o (2 794 511 o) ; ni baissés ni relevés ; le pack ne va pas dans le Wasm. Toute tâche qui touche `crates/roomboard-wasm` ou le cœur mesure la taille.
- Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`, `.`, `commit -a`) ; jamais `--force`.
- Aucun test désactivé, sauté, ni seuil modifié. Essais Playwright existants (sélecteurs `data-item`) restent verts sans réécriture.
- Aucune dépendance ajoutée sauf permissive et justifiée ; aucune AGPL/GPL/LGPL. Icônes Lucide (ISC) recopiées avec mention.
- Tactile d'abord (cibles ≥ 44 px, glisser aux événements de pointeur ; seul le dépôt de fichiers système passe par drop), clavier ensuite (raccourci par geste). Design : `docs/plans/design-cadrage.md` § 10 netteté.
- L'interface ne nomme aucun service extérieur ; provenances seulement dans `THIRD_PARTY_NOTICES.md` et le fichier de sources du pack.
- Téléchargements (tâche photos seulement) : images CC0, licence lue sur la page source de chaque image ; Unsplash, Pixabay, Pexels exclus ; rien d'autre téléchargé ; fichiers temporaires dans `~/.cache/tmp/og5-*` ; un fichier téléchargé est traité en donnée non fiable (dossier neuf, aucun script exécuté depuis ce dossier).
- Aucun `tauri build`, aucun processus détaché laissé en marche.
- CLI (D15) : toute commande ou opération nouvelle met à jour la CLI, sa ligne de `FORMAT_LOTS`, ses tests et `scripts/essais/cli-essai.mjs`.
- Préparation d'un worktree neuf : `pnpm install --frozen-lockfile` à la racine (profil).
- Interdits du profil (`.claude/chantier.md`) : jamais `git push --force`, jamais `git add -A|--all|.`, jamais `git commit -a`, aucun `git tag`, aucun `gh release`, le dépôt reste privé.

## Review Focus

1. **Un toucher qui a défilé la grille n'applique pas** (Q27) : un doigt posé sur une carte, déplacé de plus de 10 px
   pour faire défiler, puis levé ne doit rien appliquer. Test : T9, « un toucher qui a défilé n'applique pas ».
2. **Double toucher rapide sur une carte** (Q26, D38) : deux `click` avant la fermeture ne font qu'une application,
   donc une étape. Test : T9, « toucher une carte applique […] une seule fois (double toucher) ».
3. **Compagnon de « Mes fonds » illisible** (Q19, lecture tolérante) : un `.json` abîmé ou d'un autre format dans
   `Documents/RoomBoard/Fonds` ne casse pas la liste ; les autres fonds restent listés. Test : T5, « compagnon illisible
   ou d'un autre format : ignoré ».
4. **Image déposée de plus de 100 Mpx** (Q22, `MAX_PIXELS`) : refusée avec le message du produit, rien n'est écrit dans
   la racine. Test : T5, « image de plus de 100 Mpx : refusée, rien n'est écrit ».
5. **Photo du pack absente ou illisible** (Q14 : la photo pleine ne se lit qu'à l'application ; Q26) : refus lisible
   « fond introuvable : photos/<id>.webp », aucune commande, aucune étape. Test : T8, « photo absente du pack : refus
   lisible, aucune commande ».

## Carte des fichiers

| fichier | rôle | tâche |
|---|---|---|
| `crates/roomboard-core/src/page_look.rs` (neuf) | `cmd_apply_background` et ses tests | T1 |
| `crates/roomboard-core/src/commands.rs` | variante `ApplyBackground`, dispatch, `check_backdrop`, `same_backdrop`, `write_backdrop` extrait | T1 |
| `crates/roomboard-core/src/lib.rs` | `pub mod page_look;` | T1 |
| `crates/roomboard-wasm/src/lib.rs` | `apply_background`, `apply_background_inner`, test | T1 |
| `apps/web/src/core/api.ts`, `wasm-core.ts`, `fake-core.ts`, `wasm-core.contract.test.ts` | type, liaison, double à parité, contrat | T1 |
| `apps/cli/src/ops.ts` | `COMMAND_TYPES` + `ApplyBackground` (T1), `CLI_OPS` + `background` (T11) | T1, T11 |
| `apps/web/src/backgrounds/catalog.ts` (neuf) | sections, thèmes, `PackBackground`, `loadPack` | T2 |
| `apps/web/src/backgrounds/drawn.ts` (neuf) | 118 descripteurs dessinés | T2 |
| `apps/web/src/backgrounds/svg.ts` (neuf) | 18 dégradés, 12 modèles de cours, `svgOf` | T2 |
| `apps/web/src/backgrounds/photos.ts` | catalogue des photos (vide en T2, généré en T7) | T2, T7 |
| `apps/web/src/backgrounds/search.ts`, `synonyms.ts` (neufs) | recherche et dictionnaire | T3 |
| `apps/web/backgrounds/SOURCES.json` (neuf, hors `dist`) | provenances et preuves de licence | T4, T7 |
| `THIRD_PARTY_NOTICES.md` | section du pack, tracés Lucide | T4 |
| `apps/web/src/backgrounds/source.ts` (neuf) | type `BackgroundSource` | T5 |
| `apps/web/src/app/my-backgrounds.ts` (neuf) | « Mes fonds » | T5 |
| `apps/web/src/platform/library-files.ts`, `apps/web/src/app/library.ts` | racine `backgrounds`, libellé | T5 |
| `apps/desktop/src-tauri/capabilities/default.json`, `crates/roomboard-shell/src/lib.rs` | portée `RoomBoard/Fonds` et son test | T5 |
| `apps/web/src/toolbar.ts`, `app/toolbar-host.ts`, `toolbar-profiles.ts`, `ui/icons.ts` | action, profils, icônes | T6 |
| `scripts/fonds/produire-photos.mjs` (neuf), `apps/web/public/backgrounds/` (neuf) | producteur et WebP | T7 |
| `apps/web/src/app/backgrounds-apply.ts` (neuf), `app/thumbnail.ts`, `app/board-session.ts` | appliquer, rendre une page, `data-look` | T8 |
| `apps/web/src/ui/BackgroundsDialog.tsx`, `ui/backgrounds.css` (neufs), `ui/RadioChoices.tsx` | la fenêtre | T9 |
| `apps/web/src/ui/BackgroundsWindow.tsx` (neuf), `ui/App.tsx`, `ui/GridPanel.tsx`, `engine/input/keys.ts`, `app/workspace.ts`, `main.ts` | montage et câblage | T10 |
| `apps/cli/src/backgrounds.ts` (neuf), `session.ts`, `main.ts`, `scripts/essais/cli-essai.mjs` | CLI | T11 |
| `scripts/essais/fonds-navigateur.mjs` (neuf), `scripts/essais/commun.mjs`, `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh` | essai e2e | T12 |

## Note pour les sections

Chaque section est autonome (contraintes, préparation et commandes recopiées). `<wt>` désigne le dossier du
worktree que l'orchestrateur donne à la tâche (`~/projets/roomboard-wt/personnalisation-1b--T<n>`).

---

<a id="tache-t1"></a>
### Tâche T1 — Cœur, pont Wasm et doubles : commande `ApplyBackground`

**Objectif.** Une commande du cœur écrit couleur, grille et fond image de N pages en **une** transaction `"local"`
(une étape d'annulation) ; seules les pages qui changent sont écrites et rendues ; une page à fond `pdf-page` garde
son fond et ne reçoit que couleur et grille. Pont Wasm, type TypeScript, liaison et double à parité. Cadrage : Q1 à Q6,
Q35, DA1 ; scénarios S1, S2, S4.

**Fichiers.**
- Créer : `crates/roomboard-core/src/page_look.rs`
- Modifier : `crates/roomboard-core/src/commands.rs` (enum `Command` `:87-104`, dispatch `:672-682`, `cmd_set_backdrop`
  `:1098-1165`), `crates/roomboard-core/src/lib.rs`, `crates/roomboard-wasm/src/lib.rs` (`:878-920`, `:1695-1716`,
  tests `:2151`), `apps/web/src/core/api.ts` (`:121-133`), `apps/web/src/core/wasm-core.ts` (`:415-420`, `:567-580`),
  `apps/web/src/core/fake-core.ts` (`:964-1012`), `apps/cli/src/ops.ts` (`:12-20`)
- Tester : `crates/roomboard-core/src/page_look.rs` (module `tests`), `crates/roomboard-wasm/src/lib.rs` (module
  `tests`), `apps/web/src/core/wasm-core.contract.test.ts` (bloc ajouté en fin de fichier)

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit (Rust) : `Command::ApplyBackground { pages: Vec<String>, color: String, backdrop: Option<BackdropInput>, grid: Option<GridInput> }` → `Change { pages: <pages changées, dans l'ordre demandé> }` ;
  `pub(crate) fn check_backdrop(b: &BackdropInput) -> Result<(), CommandError>` ;
  `pub(crate) fn same_backdrop(input: Option<&BackdropInput>, current: Option<&RawBackdrop>) -> bool` ;
  `Document::write_backdrop(&self, txn: &mut TransactionMut, page: &MapRef, input: Option<&BackdropInput>, same: bool)` ;
  `Document::cmd_apply_background(&mut self, pages: &[String], color: &str, backdrop: Option<&BackdropInput>, grid: Option<&GridInput>) -> Result<Change, CommandError>`.
- Produit (Wasm) : `Document::apply_background(pages: Vec<String>, color: &str, asset: Option<String>, name: &str, mime: &str, size: f64, w: f64, h: f64, fit: &str, grid: bool, visible: bool, snap: bool, above: bool, kinds: Vec<String>, colors: Vec<String>, lines: Vec<String>, nums: &[f64]) -> Result<JsValue, JsError>` ;
  `Document::apply_background_inner(&mut self, pages: Vec<String>, color: &str, backdrop: Option<BackdropInput>, grid: Option<GridInput>) -> Result<Change, CommandError>`.
- Produit (TS, `core/api.ts`) : membre de l'union `Command` :
  `{ readonly type: "ApplyBackground"; readonly pages: readonly string[]; readonly color: string; readonly backdrop: BackdropInput | null; readonly grid: GridInput | null }`.
- Refus, sans écriture, dans cet ordre : couleur (`BadFill`, message du pot), fond (`BadAsset`, puis `BadImage`),
  grille (`BadGrid`), pages : liste vide → `page inconnue : ` ; doublon → `page inconnue : <id>` ; page absente →
  `page inconnue : <id>`.
- Réutilise : `crates/roomboard-core/src/commands.rs:1098`, `:1135-1161` — étendre : `Document::write_backdrop(&self, txn: &mut TransactionMut, page: &MapRef, input: Option<&BackdropInput>, same: bool)` extraite de `cmd_set_backdrop` (insertion du `Y.Map`, `insert_asset_meta`, cas « même fond, métadonnée d'asset absente »).
- Réutilise : `crates/roomboard-core/src/grid.rs:155`, `:190`, `:107` — `grid::write(txn, page, Option<&GridInput>)`, `grid::validate(&GridInput)`, `grid::read(txn, page)`.
- Réutilise : `crates/roomboard-core/src/fill.rs:84-89` — clé `"background"`, `DEFAULT_BACKGROUND` (`element.rs:17`), même règle de couleur (`rich_text::valid_color`, `BadFill`).
- Réutilise : aucun module existant pour « couleur, grille, fond de N pages en une étape » (termes cherchés : `Batch`, `batch`, `capture_timeout`, `InsertPages`) — nouveau module `crates/roomboard-core/src/page_look.rs`, `Command::ApplyBackground { pages: Vec<String>, color: String, backdrop: Option<BackdropInput>, grid: Option<GridInput> }` → `Change { pages: <pages changées> }` (DA1).
- Réutilise : `apps/web/src/core/api.ts:121-133`, `wasm-core.ts:567`, `fake-core.ts:964` — étendre : `{ type: "ApplyBackground"; pages: readonly string[]; color: string; backdrop: BackdropInput | null; grid: GridInput | null }`.
- Réutilise : `crates/roomboard-core/src/element.rs:397` (`read_backdrop`), `PDF_PAGE_KIND` (`element.rs:39`) — lecture du `kind` avant écriture, dans `cmd_apply_background`.
- Réutilise : `apps/cli/src/ops.ts:12-20` — étendre : `COMMAND_TYPES` + `"ApplyBackground"` (sinon `ALL_COMMANDS` casse `tsc` de la CLI).
- Le rapport de la tâche porte, pour chacune de ces lignes, `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Patron à ne pas reprendre (concepteur-critique).** Enchaîner `SetBackdrop`, `SetGrid` et `Fill { Background }` page
par page : chaque commande ouvre sa propre transaction (`crates/roomboard-core/src/commands.rs:1139`, `:1550`) et
l'historique ne fusionne jamais deux transactions (`crates/roomboard-core/src/history.rs:20-27`, `capture_timeout_millis: 0`) :
« toutes les pages » ferait 3 × N étapes. Ne pas non plus recopier l'écriture du fond de `cmd_set_backdrop`
(`commands.rs:1135-1161`) : l'extraire en `write_backdrop`, appelée par les deux commandes. Chemin de référence pour la
forme d'un fichier de commande à part : `crates/roomboard-core/src/fill.rs:58-110` (`impl Document` hors de
`commands.rs`). Le double TypeScript suit exactement l'ordre des refus du cœur (parité testée par le contrat).

**Contraintes (recopiées de Global Constraints).**
- VM partagée : builds et tests en `nice -n 10`, `cargo … -j 4`, `CARGO_TARGET_DIR=<worktree de la tâche>/target` (piège : cible partagée entre worktrees) ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; test isolé direct.
- Tailles Wasm : principal ≤ 1 572 864 o (1 375 581 o à `45484db`), formats ≤ 3 145 728 o (2 794 511 o) ; ni baissés ni relevés ; le pack ne va pas dans le Wasm. Toute tâche qui touche `crates/roomboard-wasm` ou le cœur mesure la taille.
- Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`, `.`, `commit -a`) ; jamais `--force`.
- Aucun test désactivé, sauté, ni seuil modifié. Essais Playwright existants (sélecteurs `data-item`) restent verts sans réécriture.
- Aucune dépendance ajoutée sauf permissive et justifiée ; aucune AGPL/GPL/LGPL.
- Aucun `tauri build`, aucun processus détaché laissé en marche.
- CLI (D15) : toute commande ou opération nouvelle met à jour la CLI, sa ligne de `FORMAT_LOTS`, ses tests et `scripts/essais/cli-essai.mjs`. Ici, seule la liste `COMMAND_TYPES` change (la commande brute `{"type":"ApplyBackground",…}` devient acceptée par `run` et `apply`) ; ses tests CLI et la ligne de `cli-essai.mjs` sont écrits par T11 ; `FORMAT_LOTS` ne change pas (aucun format neuf).
- Préparation : `cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3` (`<wt>` : le worktree de la tâche).

**Interdits.** Aucun champ de page neuf, aucun nouveau genre de `backdrop`, aucun changement de `schema` ni de
`formatVersion` ; ne pas toucher `crates/roomboard-formats` ; ne pas modifier les tests `set_backdrop_*`
(`commands.rs:2708-2930`) ni ceux de la grille (`:3294-3680`) ; ne pas toucher `history.rs`.

**Terminé quand.** Les 7 tests Rust de `page_look`, le test Wasm et le bloc de contrat passent ; `set_backdrop_*`,
`image_and_backdrop_reload_keep_bytes` et `set_grid_*` restent verts ; `cargo fmt --check` et `clippy -D warnings`
propres ; `tsc --noEmit` du web et de la CLI propres ; Wasm principal mesuré ≤ 1 572 864 o (attendu < 1 400 000 o) ;
formats non touché ; commit fait.

**Étapes.**

- [ ] **Étape 1 : écrire les tests Rust (rouges) dans `crates/roomboard-core/src/page_look.rs`.**

Créer le fichier avec seulement l'en-tête et le module de tests ; le code vient à l'étape 3.

```rust
//! Aspect complet d'une page (personnalisation-1b, Q1 à Q4, Q35, DA1) : couleur, grille et fond image de N pages en une
//! transaction `"local"`, donc une seule étape d'annulation ; seules les pages qui changent sont écrites et rendues
//! (D38). Une page à fond `pdf-page` garde son fond : elle ne reçoit que la couleur et la grille (Q35).

#[cfg(test)]
mod tests {
    use crate::asset::AssetRef;
    use crate::commands::tests::writes;
    use crate::commands::{BackdropInput, Command, CommandError};
    use crate::document::Document;
    use crate::grid::{GridInput, GridLevelView};

    const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    const PDF: &str = "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd";

    fn png() -> AssetRef {
        AssetRef {
            id: ABC.into(),
            name: "fond.png".into(),
            mime: "image/png".into(),
            size: 3.0,
        }
    }

    fn image() -> Option<BackdropInput> {
        Some(BackdropInput {
            asset: png(),
            w: 3840.0,
            h: 2160.0,
            fit: "width".into(),
        })
    }

    fn seyes() -> GridInput {
        GridInput {
            visible: true,
            snap: false,
            above: false,
            levels: vec![GridLevelView {
                kind: "seyes".into(),
                spacing_x: 30.24,
                spacing_y: 30.24,
                origin_x: 0.0,
                origin_y: 0.0,
                color: "#8f9ad6".into(),
                line: "solid".into(),
                line_width: 1.0,
                snap: true,
                visible: true,
            }],
        }
    }

    fn look(pages: &[String], color: &str, b: Option<BackdropInput>, g: Option<GridInput>) -> Command {
        Command::ApplyBackground {
            pages: pages.to_vec(),
            color: color.into(),
            backdrop: b,
            grid: g,
        }
    }

    fn three() -> (Document, Vec<String>) {
        let mut d = Document::blank();
        d.add_page();
        d.add_page();
        let p = d.page_ids();
        (d, p)
    }

    /// S2, DA1 : trois pages, une transaction, une étape ; un seul asset cité ; annuler rend les trois pages blanches.
    #[test]
    fn apply_background_three_pages_is_one_step() {
        let (mut d, pages) = three();
        let c = d
            .apply(look(&pages, "#fbf7ec", image(), Some(seyes())))
            .expect("fond");
        assert_eq!(c.pages, pages);
        for p in &pages {
            let v = d.page(p).expect("page");
            assert_eq!(v.background, "#fbf7ec");
            assert_eq!(v.grid, Some(seyes()));
            let b = v.backdrop.expect("fond");
            assert_eq!((b.asset.as_str(), b.kind.as_str()), (ABC, "image"));
        }
        assert_eq!(d.cited_assets(), vec![png()]);
        assert!(d.undo());
        for p in &pages {
            let v = d.page(p).expect("page");
            assert_eq!((v.background.as_str(), v.grid.is_none(), v.backdrop.is_none()), ("#ffffff", true, true));
        }
        assert_eq!(d.page_ids(), pages, "les pages ajoutées restent : leurs étapes sont à part");
    }

    /// D38 : même aspect, aucune transaction ; seules les pages qui changent sont écrites et rendues.
    #[test]
    fn apply_background_same_value_is_no_step() {
        let (mut d, pages) = three();
        let first = vec![pages[0].clone()];
        d.apply(look(&first, "#2f3e46", None, None)).expect("ardoise");
        let w = writes(&d);
        let v = d.version();
        let c = d.apply(look(&first, "#2f3e46", None, None)).expect("même");
        assert_eq!((c.version, c.pages.len(), w.since()), (v, 0, 0));
        let c = d.apply(look(&pages, "#2f3e46", None, None)).expect("toutes");
        assert_eq!(c.pages, pages[1..].to_vec());
    }

    /// Q35 : page PDF : fond gardé, couleur et grille écrites, une étape ; annuler rend la page telle quelle.
    #[test]
    fn apply_background_keeps_pdf_page_backdrop() {
        let pdf = AssetRef {
            id: PDF.into(),
            name: "cours.pdf".into(),
            mime: "application/pdf".into(),
            size: 1234.0,
        };
        let mut d = Document::from_pdf_pages(&pdf, &[(612.0, 792.0), (792.0, 612.0)], None).expect("pdf");
        let pages = d.page_ids();
        let c = d
            .apply(look(&pages, "#fbf7ec", image(), Some(seyes())))
            .expect("fond");
        assert_eq!(c.pages, pages);
        for p in &pages {
            let v = d.page(p).expect("page");
            assert_eq!(v.background, "#fbf7ec");
            assert_eq!(v.grid, Some(seyes()));
            let b = v.backdrop.expect("fond pdf");
            assert_eq!((b.asset.as_str(), b.kind.as_str()), (PDF, "pdf-page"));
        }
        assert!(d.undo());
        assert!(!d.can_undo(), "une seule étape");
        for p in &pages {
            let v = d.page(p).expect("page");
            assert_eq!((v.background.as_str(), v.grid.is_none()), ("#ffffff", true));
            assert_eq!(v.backdrop.expect("fond pdf").kind, "pdf-page");
        }
    }

    /// Q4 : refus avant toute transaction, dans l'ordre couleur, fond, grille, pages.
    #[test]
    fn apply_background_refusals_write_nothing() {
        let (mut d, pages) = three();
        let p = pages[0].clone();
        let w = writes(&d);
        let one = vec![p.clone()];
        let bad_asset = Some(BackdropInput {
            asset: AssetRef { mime: String::new(), ..png() },
            w: 1.0,
            h: 1.0,
            fit: "width".into(),
        });
        let bad_fit = Some(BackdropInput { fit: "contain".into(), ..image().expect("fond") });
        let mut bad_grid = seyes();
        bad_grid.levels[0].spacing_x = 0.0;
        assert!(matches!(d.apply(look(&one, "", None, None)), Err(CommandError::BadFill)));
        assert!(matches!(d.apply(look(&one, "#ffffff", bad_asset, None)), Err(CommandError::BadAsset)));
        assert!(matches!(d.apply(look(&one, "#ffffff", bad_fit, None)), Err(CommandError::BadImage)));
        assert!(matches!(d.apply(look(&one, "#ffffff", None, Some(bad_grid))), Err(CommandError::BadGrid)));
        assert!(matches!(d.apply(look(&[], "#ffffff", None, None)), Err(CommandError::UnknownPage(id)) if id.is_empty()));
        assert!(matches!(d.apply(look(&[p.clone(), p.clone()], "#ffffff", None, None)), Err(CommandError::UnknownPage(id)) if id == p));
        assert!(matches!(d.apply(look(&["nulle-part".into()], "#ffffff", None, None)), Err(CommandError::UnknownPage(id)) if id == "nulle-part"));
        assert_eq!(w.since(), 0);
    }

    /// Q1 : « Blanc (aucun fond) » remet blanc, sans grille ni image, en une étape.
    #[test]
    fn apply_background_white_clears_grid_and_image() {
        let (mut d, pages) = three();
        let one = vec![pages[0].clone()];
        d.apply(look(&one, "#fbf7ec", image(), Some(seyes()))).expect("fond");
        let c = d.apply(look(&one, "#ffffff", None, None)).expect("blanc");
        assert_eq!(c.pages, one);
        let v = d.page(&one[0]).expect("page");
        assert_eq!((v.background.as_str(), v.grid.is_none(), v.backdrop.is_none()), ("#ffffff", true, true));
        assert!(d.undo());
        assert_eq!(d.page(&one[0]).expect("page").background, "#fbf7ec");
    }

    #[test]
    fn apply_background_undo_then_redo() {
        let (mut d, pages) = three();
        d.apply(look(&pages, "#2f3e46", None, Some(seyes()))).expect("fond");
        assert!(d.undo());
        assert!(d.redo());
        for p in &pages {
            let v = d.page(p).expect("page");
            assert_eq!((v.background.as_str(), v.grid.clone()), ("#2f3e46", Some(seyes())));
        }
    }

    /// S4, G4 : trente rechargements gardent les octets (fond, grille, couleur, métadonnée d'asset).
    #[test]
    fn apply_background_reload_keeps_bytes() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-27T00:00:00Z".into(),
            created: None,
        };
        let (mut d, pages) = three();
        d.apply(look(&pages, "#fbf7ec", image(), Some(seyes()))).expect("fond");
        let ybin = d.encode_v1();
        let file = save(&d, &meta).expect("save");
        for i in 0..30 {
            let r = load(&file).expect("load");
            assert!(r.encode_v1() == ybin, "ybin différent au rechargement {i}");
            assert!(save(&r, &meta).expect("resave") == file, "fichier différent au rechargement {i}");
        }
    }
}
```

- [ ] **Étape 2 : déclarer le module et vérifier le rouge.**

Dans `crates/roomboard-core/src/lib.rs`, entre `pub mod model3d;` et `pub mod query;` : `pub mod page_look;`.

Commande : `cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH CARGO_TARGET_DIR=<wt>/target && nice -n 10 cargo test -p roomboard-core -j 4 page_look 2>&1 | tail -20`
Attendu : échec de compilation `error[E0599]` / `no variant named ApplyBackground` (la variante n'existe pas encore).

- [ ] **Étape 3 : extraire `check_backdrop`, `same_backdrop`, `write_backdrop` dans `commands.rs` et réécrire `cmd_set_backdrop`.**

En tête de `commands.rs`, ajouter `TransactionMut` à l'import `yrs::{…}` et `RawBackdrop` à l'import de
`crate::element::{…}`. Après `valid_asset` (`:540-546`), ajouter :

```rust
/// Fond demandé (K6, HK1) : asset conforme (`BadAsset`), puis boîte finie > 0 et `fit: "width"` (`BadImage`). Partagé par
/// `SetBackdrop` et `ApplyBackground` (personnalisation-1b).
pub(crate) fn check_backdrop(b: &BackdropInput) -> Result<(), CommandError> {
    if !valid_asset(&b.asset) {
        return Err(CommandError::BadAsset);
    }
    if !finite_positive(b.w) || !finite_positive(b.h) || b.fit != FIT_WIDTH {
        return Err(CommandError::BadImage);
    }
    Ok(())
}

/// Même fond (D38) : rien à retirer, ou même image (asset, genre `image`, taille, ajustement `width`).
pub(crate) fn same_backdrop(input: Option<&BackdropInput>, current: Option<&RawBackdrop>) -> bool {
    match (input, current) {
        (None, None) => true,
        (Some(b), Some(r)) => {
            r.asset.as_deref() == Some(b.asset.id.as_str())
                && r.kind.as_deref() == Some("image")
                && r.w == Some(b.w)
                && r.h == Some(b.h)
                && r.fit.as_deref() == Some(FIT_WIDTH)
        }
        _ => false,
    }
}
```

Remplacer tout `cmd_set_backdrop` (`:1096-1165`) par :

```rust
    /// Fond de page (U6, K6) : une étape ; `None` retire ; même valeur, ou rien à retirer : aucune transaction (D38) ;
    /// seul `fit: "width"` s'écrit ; la taille de la page ne change jamais.
    fn cmd_set_backdrop(
        &mut self,
        page: &str,
        input: Option<&BackdropInput>,
    ) -> Result<Change, CommandError> {
        if let Some(b) = input {
            check_backdrop(b)?;
        }
        let (page_map, current) = {
            let txn = self.read();
            let (_, m) = self
                .find_page(&txn, page)
                .ok_or_else(|| CommandError::UnknownPage(page.to_string()))?;
            let current = read_backdrop(&txn, &m);
            (m, current)
        };
        let same = same_backdrop(input, current.as_ref());
        // Même fond mais métadonnée d'asset absente : on l'écrit (une étape) au lieu de « inchangé ».
        let meta_missing = same
            && input.is_some_and(|b| {
                let txn = self.read();
                self.assets_ref().get(&txn, b.asset.id.as_str()).is_none()
            });
        if same && !meta_missing {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            self.write_backdrop(&mut txn, &page_map, input, same);
        }
        Ok(self.done(Change {
            pages: vec![page.to_string()],
            ..Default::default()
        }))
    }

    /// Écriture du fond d'une page (U6, K6), partagée par `SetBackdrop` et `ApplyBackground` : `None` retire ; `same` :
    /// même fond, seule la métadonnée d'asset absente s'écrit ; sinon champs du `Y.Map` (jamais `Any::Map`, G4), puis
    /// métadonnée (K3).
    pub(crate) fn write_backdrop(
        &self,
        txn: &mut TransactionMut,
        page: &MapRef,
        input: Option<&BackdropInput>,
        same: bool,
    ) {
        match input {
            Some(b) if same => self.insert_asset_meta(txn, &b.asset),
            None => {
                page.remove(txn, "backdrop");
            }
            Some(b) => {
                page.insert(
                    txn,
                    "backdrop",
                    MapPrelim::from([
                        ("asset", In::from(b.asset.id.as_str())),
                        ("kind", In::from("image")),
                        ("w", In::Any(Any::from(b.w))),
                        ("h", In::Any(Any::from(b.h))),
                        ("fit", In::from(FIT_WIDTH)),
                    ]),
                );
                self.insert_asset_meta(txn, &b.asset);
            }
        }
    }
```

Commande : `cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH CARGO_TARGET_DIR=<wt>/target && nice -n 10 cargo test -p roomboard-core -j 4 set_backdrop 2>&1 | tail -12`
Attendu : la compilation échoue encore sur `page_look` (tests) — c'est normal ; si elle passe sans le module de tests,
`test result: ok`, au moins 4 tests `set_backdrop_` listés. Puis :
`nice -n 10 cargo test -p roomboard-core -j 4 image_and_backdrop_reload_keep_bytes 2>&1 | tail -5` → `1 passed` (après
l'étape 5 si la compilation des tests bloque ici).

- [ ] **Étape 4 : ajouter la variante, le dispatch et `cmd_apply_background`.**

Dans l'enum `Command` de `commands.rs`, juste après `SetGrid { … }` :

```rust
    /// Aspect complet de N pages (personnalisation-1b, DA1) : couleur, grille et fond image en une étape ; seules les
    /// pages qui changent sont écrites et rendues ; une page à fond `pdf-page` ne reçoit que couleur et grille (Q35).
    ApplyBackground {
        pages: Vec<String>,
        color: String,
        backdrop: Option<BackdropInput>,
        grid: Option<GridInput>,
    },
```

Dans le dispatch (`:672-682`), après la ligne `Command::SetGrid { page, grid } => …` :

```rust
            Command::ApplyBackground {
                pages,
                color,
                backdrop,
                grid,
            } => self.cmd_apply_background(&pages, &color, backdrop.as_ref(), grid.as_ref()),
```

Dans `page_look.rs`, au-dessus du module de tests :

```rust
use std::collections::BTreeSet;

use yrs::{In, Map, MapRef};

use crate::commands::{check_backdrop, same_backdrop, BackdropInput, Change, CommandError};
use crate::document::Document;
use crate::element::{out_string, read_backdrop, DEFAULT_BACKGROUND, PDF_PAGE_KIND};
use crate::grid::{self, GridInput};
use crate::rich_text::valid_color;

/// Ce qu'une page reçoit ; une page sans rien à écrire n'a pas de plan.
struct PagePlan {
    id: String,
    map: MapRef,
    color: bool,
    grid: bool,
    /// `Some(same)` : fond à écrire (`same` : même fond, métadonnée d'asset seule) ; `None` : rien (page PDF ou inchangé).
    backdrop: Option<bool>,
}

impl Document {
    /// Refus, sans transaction, dans cet ordre : couleur (`BadFill`), fond (`BadAsset`, `BadImage`), grille (`BadGrid`),
    /// pages (liste vide, doublon ou page absente : `UnknownPage`). Puis une transaction `"local"` pour toutes les pages
    /// qui changent ; aucune si rien ne change (D38).
    pub(crate) fn cmd_apply_background(
        &mut self,
        pages: &[String],
        color: &str,
        backdrop: Option<&BackdropInput>,
        grid: Option<&GridInput>,
    ) -> Result<Change, CommandError> {
        if !valid_color(color) {
            return Err(CommandError::BadFill);
        }
        if let Some(b) = backdrop {
            check_backdrop(b)?;
        }
        if let Some(g) = grid {
            grid::validate(g)?;
        }
        if pages.is_empty() {
            return Err(CommandError::UnknownPage(String::new()));
        }
        let mut plans: Vec<PagePlan> = Vec::with_capacity(pages.len());
        {
            let txn = self.read();
            let mut seen = BTreeSet::new();
            for id in pages {
                if !seen.insert(id.as_str()) {
                    return Err(CommandError::UnknownPage(id.clone()));
                }
                let (_, map) = self
                    .find_page(&txn, id)
                    .ok_or_else(|| CommandError::UnknownPage(id.clone()))?;
                let current_color = out_string(map.get(&txn, "background"));
                let color_same = current_color.as_deref().unwrap_or(DEFAULT_BACKGROUND) == color;
                let grid_same = grid::read(&txn, &map).as_ref() == grid;
                let current = read_backdrop(&txn, &map);
                let pdf = current
                    .as_ref()
                    .is_some_and(|r| r.kind.as_deref() == Some(PDF_PAGE_KIND));
                let backdrop_plan = if pdf {
                    None
                } else {
                    let same = same_backdrop(backdrop, current.as_ref());
                    let meta_missing = same
                        && backdrop.is_some_and(|b| {
                            self.assets_ref().get(&txn, b.asset.id.as_str()).is_none()
                        });
                    (!same || meta_missing).then_some(same)
                };
                if color_same && grid_same && backdrop_plan.is_none() {
                    continue;
                }
                plans.push(PagePlan {
                    id: id.clone(),
                    map,
                    color: !color_same,
                    grid: !grid_same,
                    backdrop: backdrop_plan,
                });
            }
        }
        if plans.is_empty() {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            for p in &plans {
                if p.color {
                    p.map.insert(&mut txn, "background", In::from(color));
                }
                if p.grid {
                    grid::write(&mut txn, &p.map, grid);
                }
                if let Some(same) = p.backdrop {
                    self.write_backdrop(&mut txn, &p.map, backdrop, same);
                }
            }
        }
        Ok(self.done(Change {
            pages: plans.into_iter().map(|p| p.id).collect(),
            ..Default::default()
        }))
    }
}
```

Si `out_string`, `read_backdrop` ou `RawBackdrop` ne sont pas visibles depuis `page_look.rs`, les passer en
`pub(crate)` dans `element.rs` sans autre changement (ils le sont à `45484db`).

- [ ] **Étape 5 : vert du cœur, puis non-régression.**

Commandes :
`cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH CARGO_TARGET_DIR=<wt>/target && nice -n 10 cargo test -p roomboard-core -j 4 apply_background 2>&1 | tail -15`
Attendu : `test result: ok. 7 passed`, les 7 noms `page_look::tests::apply_background_…` listés.
`nice -n 10 cargo test -p roomboard-core -j 4 backdrop 2>&1 | tail -15` → `test result: ok`, au moins 5 tests dont
`set_backdrop_same_value_writes_missing_asset_meta` et `image_and_backdrop_reload_keep_bytes`.
`nice -n 10 cargo test -p roomboard-core -j 4 set_grid 2>&1 | tail -5` → `test result: ok`, N ≥ 3.

- [ ] **Étape 6 : test Wasm (rouge) dans `crates/roomboard-wasm/src/lib.rs`.**

Dans le module `tests` (`:2151`), ajouter :

```rust
    // personnalisation-1b (DA1) : deux pages, une étape, par `apply_background_inner`.
    #[test]
    fn apply_background_inner_two_pages_one_step() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let q = d.core.add_page();
        let c = d
            .apply_background_inner(vec![p.clone(), q.clone()], "#1f2a2e", None, None)
            .expect("fond");
        assert_eq!(c.pages, vec![p.clone(), q.clone()]);
        assert_eq!(d.core.page(&q).expect("page").background, "#1f2a2e");
        assert!(d.core.undo());
        assert_eq!(d.core.page(&p).expect("page").background, "#ffffff");
        assert_eq!(d.core.page(&q).expect("page").background, "#ffffff");
    }
```

Commande : `nice -n 10 cargo test -p roomboard-wasm -j 4 apply_background 2>&1 | tail -8` → échec `no method named apply_background_inner`.

- [ ] **Étape 7 : pont Wasm.**

Dans le bloc `#[wasm_bindgen] impl Document`, après `clear_grid` :

```rust
    /// Aspect complet de N pages (personnalisation-1b, DA1) : `asset` absent = aucun fond image ; `grid` faux = aucune
    /// grille (les tableaux qui suivent sont alors ignorés). `nums` comme `set_grid` (`grid_input`).
    #[allow(clippy::too_many_arguments)]
    pub fn apply_background(
        &mut self,
        pages: Vec<String>,
        color: &str,
        asset: Option<String>,
        name: &str,
        mime: &str,
        size: f64,
        w: f64,
        h: f64,
        fit: &str,
        grid: bool,
        visible: bool,
        snap: bool,
        above: bool,
        kinds: Vec<String>,
        colors: Vec<String>,
        lines: Vec<String>,
        nums: &[f64],
    ) -> Result<JsValue, JsError> {
        let backdrop = asset.map(|id| BackdropInput {
            asset: asset_ref(&id, name, mime, size),
            w,
            h,
            fit: fit.to_string(),
        });
        let grid = if grid {
            Some(grid_input(visible, snap, above, kinds, colors, lines, nums).map_err(cmd_err)?)
        } else {
            None
        };
        to_js(
            &self
                .apply_background_inner(pages, color, backdrop, grid)
                .map_err(cmd_err)?,
        )
    }
```

Dans le bloc des fonctions `_inner` (après `set_grid_inner`, `:1706-1716`) :

```rust
    pub fn apply_background_inner(
        &mut self,
        pages: Vec<String>,
        color: &str,
        backdrop: Option<BackdropInput>,
        grid: Option<GridInput>,
    ) -> Result<Change, CommandError> {
        self.run(Command::ApplyBackground {
            pages,
            color: color.to_string(),
            backdrop,
            grid,
        })
    }
```

Commandes : `nice -n 10 cargo test -p roomboard-wasm -j 4 apply_background 2>&1 | tail -8` → `test result: ok. 1 passed`.
`nice -n 10 cargo fmt --all --check && nice -n 10 cargo clippy -p roomboard-core -p roomboard-wasm --all-targets -j 4 -- -D warnings 2>&1 | tail -5` → aucune ligne `error`/`warning`, code 0.

- [ ] **Étape 8 : construire le module Wasm et mesurer sa taille.**

```bash
cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH CARGO_TARGET_DIR=<wt>/target
nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release -j 4 2>&1 | tail -2
rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm "$CARGO_TARGET_DIR/wasm32-unknown-unknown/release/roomboard_wasm.wasm"
[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/personnalisation-1b/apps/web/src/wasm-formats apps/web/src/
wc -c < apps/web/src/wasm/roomboard_wasm_bg.wasm
grep -c "apply_background" apps/web/src/wasm/roomboard_wasm.d.ts
```
Attendu : taille ≤ 1 572 864 (plafond) et, attendu, < 1 400 000 ; `grep -c` ≥ 1. Le module formats n'est pas rebâti
(copie de la référence `45484db`, inchangé) : noter sa taille du rapport, 2 794 511 o attendus.

- [ ] **Étape 9 : tests du contrat (rouges) en fin de `apps/web/src/core/wasm-core.contract.test.ts`.**

```ts
// personnalisation-1b (Q2, Q4, Q5, Q35) : ApplyBackground à parité, fausse liaison et vrai module (D36).
const P1B_ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const P1B_PNG = { id: P1B_ABC, name: "fond.png", mime: "image/png", size: 3 } as const;
const P1B_PDF = { id: "cd".repeat(32), name: "cours.pdf", mime: "application/pdf", size: 1234 };
const P1B_GRID: GridInput = {
  visible: true, snap: false, above: false,
  levels: [{ kind: "seyes", spacingX: 30.24, spacingY: 30.24, originX: 0, originY: 0, color: "#8f9ad6", line: "solid", lineWidth: 1, snap: true, visible: true }],
};
const P1B_BAD_FILL = "remplissage invalide (couleur valide, contour d'une forme ou d'un trait, intérieur d'un rectangle ou d'une ellipse attendus)";
const P1B_BAD_ASSET = "asset invalide (empreinte SHA-256 en hexadécimal minuscule, type MIME non vide, taille entière ≥ 0 attendus)";
const P1B_BAD_IMAGE = "image invalide (largeur et hauteur finies > 0 attendues, ajustement « width » seul accepté)";
const P1B_BAD_GRID = "grille invalide (pas finis > 0, origine finie, type, couleur et trait non vides, au plus 16 niveaux)";
const p1bLook = (d: CoreDocument, p: string) => {
  const v = d.page(p);
  return { background: v?.background, grid: v?.grid ?? null, kind: v?.backdrop?.kind ?? null, asset: v?.backdrop?.asset ?? null };
};

describe("contrôle de forme personnalisation-1b (ApplyBackground)", () => {
  it("ApplyBackground : arguments dans l'ordre de la liaison ; sans grille, tableaux vides et drapeau faux", () => {
    const drift = { pages: ["p1"], ids: [], full: false, version: 1 };
    const calls: unknown[][] = [];
    const doc = { apply_background: (...args: unknown[]): unknown => { calls.push(args); return drift; } };
    const stub = { Document: { blank: () => doc, load: () => doc }, StrokeBuilder: class {}, version: () => "factice" };
    const d = createWasmCore(stub as unknown as WasmModule).blank();
    expect(() => d.apply({ type: "ApplyBackground", pages: ["p1", "p2"], color: "#fbf7ec", backdrop: { asset: P1B_PNG, w: 3840, h: 2160, fit: "width" }, grid: P1B_GRID })).toThrow("Change invalide");
    expect(() => d.apply({ type: "ApplyBackground", pages: ["p1"], color: "#2f3e46", backdrop: null, grid: null })).toThrow("Change invalide");
    expect(calls).toEqual([
      [["p1", "p2"], "#fbf7ec", P1B_ABC, "fond.png", "image/png", 3, 3840, 2160, "width", true, true, false, false, ["seyes"], ["#8f9ad6"], ["solid"], new Float64Array([30.24, 30.24, 0, 0, 1, 1, 1])],
      [["p1"], "#2f3e46", undefined, "", "", 0, 0, 0, "width", false, false, false, false, [], [], [], new Float64Array([])],
    ]);
  });
});

describe.each(factories)("contrat personnalisation-1b : $name", ({ f }) => {
  it("trois pages, une étape, un seul asset ; annuler rend les trois pages blanches", () => {
    const d = f.blank();
    const p = first(d);
    d.apply({ type: "AddPage", after: p });
    d.apply({ type: "AddPage", after: p });
    const pages = d.pageIds();
    const c = d.apply({ type: "ApplyBackground", pages, color: "#fbf7ec", backdrop: { asset: P1B_PNG, w: 3840, h: 2160, fit: "width" }, grid: P1B_GRID });
    expect(c.pages).toEqual(pages);
    for (const q of pages) expect(p1bLook(d, q)).toEqual({ background: "#fbf7ec", grid: P1B_GRID, kind: "image", asset: P1B_ABC });
    expect(d.citedAssets().map((a) => a.id)).toEqual([P1B_ABC]);
    d.undo();
    for (const q of pages) expect(p1bLook(d, q)).toEqual({ background: "#ffffff", grid: null, kind: null, asset: null });
    expect(d.pageIds()).toEqual(pages);
    d.free();
  });

  it("même aspect : aucune étape ; seules les pages qui changent sont rendues", () => {
    const d = f.blank();
    d.apply({ type: "AddPage", after: first(d) });
    const [a, b] = d.pageIds() as [string, string];
    const cmd = (pages: string[]): Command => ({ type: "ApplyBackground", pages, color: "#2f3e46", backdrop: null, grid: null });
    expect(d.apply(cmd([a])).pages).toEqual([a]);
    unchanged(d, () => d.apply(cmd([a])));
    expect(d.apply(cmd([a, b])).pages).toEqual([b]);
    d.free();
  });

  it("Q35 : pages PDF : fond gardé, couleur et grille écrites, une étape", () => {
    const d = f.fromPdfPages(P1B_PDF, [{ w: 612, h: 792 }, { w: 792, h: 612 }]);
    const pages = d.pageIds();
    expect(d.apply({ type: "ApplyBackground", pages, color: "#fbf7ec", backdrop: { asset: P1B_PNG, w: 3840, h: 2160, fit: "width" }, grid: P1B_GRID }).pages).toEqual(pages);
    for (const q of pages) expect(p1bLook(d, q)).toEqual({ background: "#fbf7ec", grid: P1B_GRID, kind: "pdf-page", asset: P1B_PDF.id });
    d.undo();
    expect(d.canUndo()).toBe(false);
    for (const q of pages) expect(p1bLook(d, q)).toEqual({ background: "#ffffff", grid: null, kind: "pdf-page", asset: P1B_PDF.id });
    d.free();
  });

  it("Q1 : blanc sans grille ni image retire grille et image en une étape", () => {
    const d = f.blank();
    const p = first(d);
    d.apply({ type: "ApplyBackground", pages: [p], color: "#fbf7ec", backdrop: { asset: P1B_PNG, w: 3840, h: 2160, fit: "width" }, grid: P1B_GRID });
    expect(d.apply({ type: "ApplyBackground", pages: [p], color: "#ffffff", backdrop: null, grid: null }).pages).toEqual([p]);
    expect(p1bLook(d, p)).toEqual({ background: "#ffffff", grid: null, kind: null, asset: null });
    d.free();
  });

  it("refus sans étape, dans l'ordre couleur, fond, grille, pages", () => {
    const d = f.blank();
    const p = first(d);
    const ok: Command = { type: "ApplyBackground", pages: [p], color: "#ffffff", backdrop: null, grid: null };
    const level = P1B_GRID.levels[0]!;
    unchanged(d, () => {
      expect(messageOf(() => d.apply({ ...ok, color: "" }))).toBe(P1B_BAD_FILL);
      expect(messageOf(() => d.apply({ ...ok, color: "", backdrop: { asset: { ...P1B_PNG, mime: "" }, w: 1, h: 1, fit: "width" } }))).toBe(P1B_BAD_FILL);
      expect(messageOf(() => d.apply({ ...ok, backdrop: { asset: { ...P1B_PNG, mime: "" }, w: 1, h: 1, fit: "width" } }))).toBe(P1B_BAD_ASSET);
      expect(messageOf(() => d.apply({ ...ok, backdrop: { asset: P1B_PNG, w: 1, h: 1, fit: "contain" } }))).toBe(P1B_BAD_IMAGE);
      expect(messageOf(() => d.apply({ ...ok, grid: { ...P1B_GRID, levels: [{ ...level, spacingX: 0 }] } }))).toBe(P1B_BAD_GRID);
      expect(messageOf(() => d.apply({ ...ok, pages: [] }))).toBe("page inconnue : ");
      expect(messageOf(() => d.apply({ ...ok, pages: [p, p] }))).toBe(`page inconnue : ${p}`);
      expect(messageOf(() => d.apply({ ...ok, pages: ["nulle-part"] }))).toBe("page inconnue : nulle-part");
    });
    d.free();
  });
});
```

Si `messageOf` d'une commande de type `Command` réclame un cast, écrire `d.apply({ ...ok, color: "" } as Command)`.

Commande : `cd <wt>/apps/web && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm exec vitest run src/core/wasm-core.contract.test.ts -t "personnalisation-1b" 2>&1 | tail -15`
Attendu : échec, `ApplyBackground` inconnu de `wasm-core.ts` et de `fake-core.ts` (ou erreur de type à l'exécution).

- [ ] **Étape 10 : type, liaison et double.**

`apps/web/src/core/api.ts`, dans l'union `Command`, après la ligne `SetGrid` (`:133`) :

```ts
  /** personnalisation-1b (Q2, Q4, Q35, DA1) : aspect complet de N pages en une étape ; seules les pages qui changent
   *  sont écrites et rendues ; une page à fond `pdf-page` ne reçoit que couleur et grille. Refus sans écriture, dans
   *  l'ordre : BadFill (couleur), BadAsset, BadImage, BadGrid, page inconnue (liste vide, doublon, page absente). */
  | { readonly type: "ApplyBackground"; readonly pages: readonly string[]; readonly color: string; readonly backdrop: BackdropInput | null; readonly grid: GridInput | null }
```

`apps/web/src/core/wasm-core.ts`, sous `gridArgs` (`:415-420`) :

```ts
/** Grille absente d'`ApplyBackground` : tableaux vides, ignorés par le cœur (drapeau `grid` faux). */
const NO_GRID: GridView = { visible: false, snap: false, above: false, levels: [] };
```

et dans le `switch`, après le cas `SetGrid` :

```ts
      case "ApplyBackground": {
        const b = cmd.backdrop;
        const g = cmd.grid;
        const [visible, snap, above, kinds, colors, lines, nums] = gridArgs(g ?? NO_GRID);
        return toChange(
          this.d.apply_background(
            [...cmd.pages], cmd.color, b?.asset.id ?? undefined, b?.asset.name ?? "", b?.asset.mime ?? "", b?.asset.size ?? 0,
            b?.w ?? 0, b?.h ?? 0, b?.fit ?? "width", g !== null, visible, snap, above, kinds, colors, lines, nums,
          ),
        );
      }
```

`apps/web/src/core/fake-core.ts`, après le cas `SetGrid` (`:1002-1012`) :

```ts
      case "ApplyBackground": {
        // Ordre du cœur (page_look.rs) : couleur, fond, grille, pages ; seules les pages qui changent ; page PDF : fond gardé.
        if (!validColor(cmd.color)) throw new Error(MESSAGES.badFill);
        const b = cmd.backdrop;
        if (b !== null) {
          if (!validAsset(b.asset)) throw new Error(MESSAGES.badAsset);
          if (!positive(b.w) || !positive(b.h) || b.fit !== "width") throw new Error(MESSAGES.badImage);
        }
        const g = cmd.grid;
        if (g !== null && !validGrid(g)) throw new Error(MESSAGES.badGrid);
        if (cmd.pages.length === 0) throw new Error("page inconnue : ");
        const seen = new Set<string>();
        for (const id of cmd.pages) {
          if (seen.has(id)) throw new Error(`page inconnue : ${id}`);
          seen.add(id);
          this.pageOf(id);
        }
        const next: RawRecord | null = b === null ? null : { asset: b.asset.id, kind: "image", w: b.w, h: b.h, fit: "width" };
        const isPdf = (p: FakePage): boolean => p.backdrop?.["kind"] === "pdf-page";
        const changed = cmd.pages.filter((id) => {
          const p = this.pageOf(id);
          return p.background !== cmd.color || !sameGrid(gridView(p.grid), g) || (!isPdf(p) && !sameBackdrop(p.backdrop, next));
        });
        if (changed.length === 0) return this.unchanged();
        const writesImage = b !== null && changed.some((id) => !isPdf(this.pageOf(id)));
        return this.step((s) => {
          for (const id of changed) {
            const p = s.pages.find((q) => q.id === id);
            if (p === undefined) continue;
            p.background = cmd.color;
            p.grid = g === null ? null : gridRecord(g);
            if (!isPdf(p)) p.backdrop = next;
          }
          if (writesImage && b !== null) putMeta(s.assets, b.asset);
          return { pages: changed, ids: [], removed: [] };
        });
      }
```

`apps/cli/src/ops.ts`, dans `COMMAND_TYPES`, après `"SetGrid",` : ajouter `"ApplyBackground",`.

- [ ] **Étape 11 : vert du contrat, des types et des tests voisins.**

Commandes (dans `<wt>/apps/web` sauf mention) :
`ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm exec vitest run src/core/wasm-core.contract.test.ts 2>&1 | tail -12`
Attendu : tout le fichier passe, aucun `FAIL`, et `-t "personnalisation-1b"` montre 11 tests (1 de forme + 5 × 2
fabriques, « vrai module wasm » présent).
`nice -n 10 pnpm exec tsc --noEmit 2>&1 | tail -5` → aucune ligne `error TS`.
`cd <wt> && nice -n 10 pnpm --filter @roomboard/cli exec tsc --noEmit 2>&1 | tail -5` → aucune ligne `error TS`.
`cd <wt>/apps/cli && nice -n 10 pnpm exec vitest run src/ops.test.ts 2>&1 | tail -8` → `Tests  N passed`, N ≥ 1, aucun `FAIL`.
`cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/core 2>&1 | tail -8` → aucun `FAIL`.

- [ ] **Étape 12 : commit.**

```bash
cd <wt>
for f in crates/roomboard-core/src/page_look.rs crates/roomboard-core/src/commands.rs crates/roomboard-core/src/lib.rs crates/roomboard-wasm/src/lib.rs apps/web/src/core/api.ts apps/web/src/core/wasm-core.ts apps/web/src/core/fake-core.ts apps/web/src/core/wasm-core.contract.test.ts apps/cli/src/ops.ts; do git add "$f"; done
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(core): ApplyBackground writes colour, grid and image of N pages in one undo step" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport attendu.** Les sorties `tail` des étapes 5, 7, 8 et 11 ; taille du module principal (avant 1 375 581 o,
après N o) ; les lignes `Réutilisation : …` ; le sha du commit.

---

<a id="tache-t2"></a>
### Tâche T2 — Catalogue, sections et 118 fonds dessinés

**Objectif.** Le modèle du pack : cinq sections et leurs thèmes, la forme d'un fond (`PackBackground`), 118 fonds
dessinés procéduraux (34 couleurs unies, 18 dégradés SVG, 54 lignages et grilles du cœur, 12 modèles de cours SVG),
`svgOf(id)` et `loadPack()` (import dynamique). Les photos (T7) arrivent plus tard dans `photos.ts`, vide ici.
Cadrage : Q7 à Q10, Q14, Q29, DA3 ; scénarios S1 (« Seyès 8 mm » sur fond crème), S4 (`seyes-8mm`, `ardoise`).

**Fichiers.**
- Créer : `apps/web/src/backgrounds/catalog.ts`, `apps/web/src/backgrounds/drawn.ts`, `apps/web/src/backgrounds/svg.ts`,
  `apps/web/src/backgrounds/photos.ts`
- Tester : `apps/web/src/backgrounds/catalog.test.ts`

**Interfaces.**
- Consomme : `GridInput`, `GridKind` de `apps/web/src/core/api.ts` (existants).
- Produit (`catalog.ts`) :
  `type SectionId = "mine" | "colors" | "lines" | "lessons" | "images"` ; `type PackSectionId = Exclude<SectionId, "mine">` ;
  `type PackKind = "color" | "grid" | "svg" | "photo"` ;
  `interface Theme { readonly id: string; readonly label: string }` ;
  `interface Section { readonly id: SectionId; readonly label: string; readonly icon: string; readonly themes: readonly Theme[] }` ;
  `interface PackPhoto { readonly file: string; readonly thumb: string; readonly w: number; readonly h: number }` ;
  `interface PackBackground { readonly id: string; readonly section: PackSectionId; readonly theme: string; readonly label: string; readonly keywords: readonly string[]; readonly kind: PackKind; readonly color: string; readonly grid: GridInput | null; readonly photo: PackPhoto | null }` ;
  `const SECTIONS: readonly Section[]` ; `const DEFAULT_SECTION: SectionId = "colors"` ; `const ALL_THEMES = "all"` ;
  `const ALL_THEMES_LABEL = "Tous"` ; `const PACK_MIN = 150` ; `const PACK_MAX = 200` ;
  `function loadPack(): Promise<readonly PackBackground[]>` (dessinés puis photos).
- Produit (`svg.ts`) : `const SVG_W = 3840` ; `const SVG_H = 2160` ; `function svgOf(id: string): string` (lève
  `fond dessiné inconnu : <id>`) ; `const GRADIENTS`, `const LESSONS` (données).
- Produit (`drawn.ts`) : `const DRAWN: readonly PackBackground[]` (118 entrées).
- Produit (`photos.ts`) : `const PHOTOS: readonly PackBackground[]` (vide ; réécrit par T7).
- Identifiants fixés pour les autres tâches : `blanc`, `ardoise`, `seyes-8mm` (libellé « Seyès 8 mm », couleur
  `#fbf7ec`), `quadrillage-5mm` (libellé « Quadrillage 5 mm », couleur `#ffffff`), `portees-moyennes`, `venn`,
  `degrade-ocean`. Thèmes de la section Images : `nature`, `mer-ciel`, `matieres`, `saisons`, `abstrait`.
- Réutilise : `apps/web/src/grid-edit.ts:46-62` — types de grille (`GRID_KINDS` de `core/api.ts`, six types du cœur) et unité de 3,78 unités par mm (Seyès 8 mm = 30,24, `GRID_DEFAULT_SPACING`).
- Réutilise : aucun module existant pour « catalogue, sections, fonds dessinés » (termes cherchés : `background`, `fond`, `catalog`) — nouveau module `apps/web/src/backgrounds/` : `SECTIONS`, `loadPack(): Promise<readonly PackBackground[]>` (import dynamique), `svgOf(id): string` (DA3).
- Le rapport porte, pour chacune de ces lignes, `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Contraintes (recopiées de Global Constraints).**
- VM partagée : builds et tests en `nice -n 10`, `cargo … -j 4`, `CARGO_TARGET_DIR=<worktree de la tâche>/target` (piège : cible partagée entre worktrees) ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; test isolé direct.
- Tailles Wasm : le pack ne va pas dans le Wasm (rien ici ne touche `crates/`).
- Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`, `.`, `commit -a`) ; jamais `--force`.
- Aucun test désactivé, sauté, ni seuil modifié. Essais Playwright existants (sélecteurs `data-item`) restent verts sans réécriture.
- Aucune dépendance ajoutée sauf permissive et justifiée ; aucune AGPL/GPL/LGPL.
- Design : `docs/plans/design-cadrage.md` § 10 netteté (traits fins et nets : traits de 2 à 4 unités sur la `viewBox` 1920 × 1080, rendus à 3840 × 2160).
- L'interface ne nomme aucun service extérieur ; provenances seulement dans `THIRD_PARTY_NOTICES.md` et le fichier de sources du pack (aucune provenance dans ces fichiers).
- Aucun `tauri build`, aucun processus détaché laissé en marche.
- Préparation : `cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3`, puis les modules Wasm de référence pour `tsc` :
  `cd <wt> && for d in wasm wasm-formats; do [ -d apps/web/src/$d ] || cp -r /home/adminjd/projets/roomboard-wt/personnalisation-1b/apps/web/src/$d apps/web/src/; done`.

**Interdits.** Aucun fichier image produit pour les dessinés (0 octet de pack) ; aucune URL autre que l'espace de noms
`http://www.w3.org/2000/svg` dans les SVG ; aucun nom ni titre d'une source extérieure ; ne pas toucher
`grid-edit.ts` ni `core/api.ts`.

**Terminé quand.** `catalog.test.ts` passe (≥ 8 tests), `tsc --noEmit` du web propre, commit fait.

**Étapes.**

- [ ] **Étape 1 : écrire `apps/web/src/backgrounds/catalog.test.ts` (rouge).**

```ts
import { describe, expect, it } from "vitest";
import { GRID_KINDS } from "../core/api";
import { ALL_THEMES, DEFAULT_SECTION, loadPack, SECTIONS } from "./catalog";
import { DRAWN } from "./drawn";
import { PHOTOS } from "./photos";
import { SVG_H, SVG_W, svgOf } from "./svg";

const themesOf = (section: string): string[] => SECTIONS.find((s) => s.id === section)?.themes.map((t) => t.id) ?? [];
const byId = (id: string) => DRAWN.find((b) => b.id === id);

describe("personnalisation-1b : catalogue des fonds (Q7 à Q10)", () => {
  it("sections dans l'ordre du cadrage, Couleurs par défaut, thèmes de Q8", () => {
    expect(SECTIONS.map((s) => s.id)).toEqual(["mine", "colors", "lines", "lessons", "images"]);
    expect(SECTIONS.map((s) => s.label)).toEqual(["Mes fonds", "Couleurs", "Lignes et grilles", "Modèles de cours", "Images"]);
    expect(DEFAULT_SECTION).toBe("colors");
    expect(ALL_THEMES).toBe("all");
    expect(themesOf("colors")).toEqual(["claires", "sombres", "degrades"]);
    expect(themesOf("lines")).toEqual(["lignages", "quadrillages", "seyes", "points", "isometrique", "portees"]);
    expect(themesOf("lessons")).toEqual(["organisation", "reflexion", "mathematiques", "ecriture", "sport"]);
    expect(themesOf("images")).toEqual(["nature", "mer-ciel", "matieres", "saisons", "abstrait"]);
    expect(themesOf("mine")).toEqual([]);
  });

  it("DRAWN : au moins 110 fonds dessinés, ids uniques en [a-z0-9-]", () => {
    expect(DRAWN.length).toBeGreaterThanOrEqual(110);
    expect(DRAWN).toHaveLength(118);
    const ids = DRAWN.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id, id).toMatch(/^[a-z0-9-]+$/);
  });

  it("chaque fond est rangé dans une section et un thème connus, avec un libellé et des mots-clés", () => {
    for (const b of DRAWN) {
      expect(themesOf(b.section), b.id).toContain(b.theme);
      expect(b.label.length, b.id).toBeGreaterThan(0);
      expect(b.keywords.length, b.id).toBeGreaterThanOrEqual(3);
      expect(b.color, b.id).toMatch(/^#[0-9a-f]{6}$/);
    }
    const count = (section: string) => DRAWN.filter((b) => b.section === section).length;
    expect([count("colors"), count("lines"), count("lessons"), count("images")]).toEqual([52, 54, 12, 0]);
  });

  it("forme par genre : couleur seule, grille vectorielle du cœur, SVG en 3840 × 2160", () => {
    for (const b of DRAWN) {
      expect(b.photo, b.id).toBeNull();
      if (b.kind === "color") expect(b.grid, b.id).toBeNull();
      if (b.kind === "grid") {
        const level = b.grid?.levels[0];
        expect(b.grid?.levels, b.id).toHaveLength(1);
        expect(GRID_KINDS, b.id).toContain(level?.kind);
        expect(level?.spacingX, b.id).toBeGreaterThan(0);
        expect(b.grid?.snap, b.id).toBe(false);
      }
      if (b.kind === "svg") {
        expect(b.grid, b.id).toBeNull();
        const s = svgOf(b.id);
        expect(s.startsWith("<svg "), b.id).toBe(true);
        expect(s, b.id).toContain(`width="${SVG_W}" height="${SVG_H}" viewBox="0 0 1920 1080"`);
      }
    }
    expect(DRAWN.filter((b) => b.kind === "svg")).toHaveLength(30);
  });

  it("fonds nommés par les scénarios : seyes-8mm, quadrillage-5mm, ardoise, blanc, une portée", () => {
    expect(byId("seyes-8mm")).toMatchObject({ label: "Seyès 8 mm", section: "lines", theme: "seyes", kind: "grid", color: "#fbf7ec" });
    expect(byId("seyes-8mm")?.grid?.levels[0]).toMatchObject({ kind: "seyes", spacingX: 30.24, spacingY: 30.24 });
    expect(byId("quadrillage-5mm")).toMatchObject({ label: "Quadrillage 5 mm", kind: "grid", color: "#ffffff" });
    expect(byId("quadrillage-5mm")?.grid?.levels[0]).toMatchObject({ kind: "squares", spacingX: 18.9 });
    expect(byId("ardoise")).toMatchObject({ label: "Ardoise", section: "colors", theme: "sombres", kind: "color", color: "#2f3e46" });
    expect(byId("ardoise")?.keywords).toContain("tableau noir");
    expect(byId("blanc")).toMatchObject({ label: "Blanc (aucun fond)", kind: "color", color: "#ffffff", grid: null });
    expect(byId("portees-moyennes")).toMatchObject({ label: "Portées moyennes", theme: "portees" });
    expect(byId("venn")?.kind).toBe("svg");
    expect(byId("degrade-ocean")?.kind).toBe("svg");
  });

  it("svgOf : un fond inconnu lève une erreur lisible", () => {
    expect(() => svgOf("bidule")).toThrow("fond dessiné inconnu : bidule");
    expect(() => svgOf("seyes-8mm")).toThrow("fond dessiné inconnu : seyes-8mm");
  });

  it("SVG : aucune adresse hors de l'espace de noms SVG, aucune image externe", () => {
    for (const b of DRAWN.filter((x) => x.kind === "svg")) {
      const s = svgOf(b.id).replaceAll('xmlns="http://www.w3.org/2000/svg"', "");
      expect(s, b.id).not.toMatch(/https?:|www\.|<image|href=/i);
    }
  });

  it("loadPack : dessinés puis photos, mêmes objets", async () => {
    const pack = await loadPack();
    expect(pack).toEqual([...DRAWN, ...PHOTOS]);
  });
});
```

Commande : `cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/backgrounds/catalog.test.ts 2>&1 | tail -10`
Attendu : `FAIL`, « Failed to resolve import "./catalog" ».

- [ ] **Étape 2 : écrire `apps/web/src/backgrounds/catalog.ts`.**

```ts
/**
 * Pack de fonds (personnalisation-1b, Q7 à Q10, Q14, DA2, DA3) : sections, thèmes et forme d'un fond du pack. Inspiré
 * des familles de MyViewBoard (couleurs, fonds préinstallés, images de l'utilisateur, modèles par matière), en mots
 * seulement. Le catalogue (dessinés et photos) se charge par import dynamique à la première ouverture de la fenêtre
 * (`loadPack`) ; aucune provenance ici (Q13, Q33).
 */
import type { GridInput } from "../core/api";

export type SectionId = "mine" | "colors" | "lines" | "lessons" | "images";
export type PackSectionId = Exclude<SectionId, "mine">;
export type PackKind = "color" | "grid" | "svg" | "photo";
export interface Theme {
  readonly id: string;
  readonly label: string;
}
export interface Section {
  readonly id: SectionId;
  readonly label: string;
  /** Nom d'icône de `ui/icons.ts`. */
  readonly icon: string;
  readonly themes: readonly Theme[];
}
export interface PackPhoto {
  /** Chemins relatifs au dossier servi `backgrounds/`. */
  readonly file: string;
  readonly thumb: string;
  readonly w: number;
  readonly h: number;
}
export interface PackBackground {
  readonly id: string;
  readonly section: PackSectionId;
  readonly theme: string;
  readonly label: string;
  /** Mots-clés français (synonymes et fautes : `search.ts`). */
  readonly keywords: readonly string[];
  readonly kind: PackKind;
  /** Couleur de la page : toute la page (couleur, grille) ou ce que l'image ne couvre pas (Q30). */
  readonly color: string;
  readonly grid: GridInput | null;
  readonly photo: PackPhoto | null;
}

const t = (id: string, label: string): Theme => ({ id, label });

export const SECTIONS: readonly Section[] = Object.freeze([
  { id: "mine", label: "Mes fonds", icon: "library", themes: [] },
  { id: "colors", label: "Couleurs", icon: "fill", themes: [t("claires", "Claires"), t("sombres", "Sombres"), t("degrades", "Dégradés")] },
  {
    id: "lines",
    label: "Lignes et grilles",
    icon: "grid",
    themes: [t("lignages", "Lignages"), t("quadrillages", "Quadrillages"), t("seyes", "Seyès"), t("points", "Points"), t("isometrique", "Isométrique"), t("portees", "Portées")],
  },
  {
    id: "lessons",
    label: "Modèles de cours",
    icon: "table",
    themes: [t("organisation", "Organisation"), t("reflexion", "Réflexion"), t("mathematiques", "Mathématiques"), t("ecriture", "Écriture"), t("sport", "Sport")],
  },
  {
    id: "images",
    label: "Images",
    icon: "wallpaper",
    themes: [t("nature", "Nature"), t("mer-ciel", "Mer et ciel"), t("matieres", "Matières"), t("saisons", "Saisons"), t("abstrait", "Abstrait")],
  },
] satisfies Section[]);

export const DEFAULT_SECTION: SectionId = "colors";
export const ALL_THEMES = "all";
export const ALL_THEMES_LABEL = "Tous";
/** Plancher et plafond du pack complet (dessinés + photos), testés sur le total (Q10, Q11). */
export const PACK_MIN = 150;
export const PACK_MAX = 200;

/** Catalogue complet, chargé à la première ouverture de la fenêtre (Q14) ; les photos pleines ne se lisent qu'à l'application. */
export async function loadPack(): Promise<readonly PackBackground[]> {
  const [{ DRAWN }, { PHOTOS }] = await Promise.all([import("./drawn"), import("./photos")]);
  return [...DRAWN, ...PHOTOS];
}
```

- [ ] **Étape 3 : écrire `apps/web/src/backgrounds/svg.ts`.**

```ts
/**
 * Fonds dessinés en SVG (personnalisation-1b, Q9, Q10, DA3) : dégradés et modèles de cours écrits par des fonctions
 * pures, rendus en 3840 × 2160 (`viewBox` 1920 × 1080) au moment d'appliquer et posés en fond `image/svg+xml`. Le code
 * est le générateur : reproductible, 0 octet dans le pack. Traits fins (2 à 4 unités), aucune image ni adresse externe.
 */
export const SVG_W = 3840;
export const SVG_H = 2160;
const W = 1920;
const H = 1080;
const INK = "#475569";
const LINE = "#94a3b8";
const SOFT = "#e2e8f0";
const FONT = "Segoe UI, system-ui, sans-serif";

export interface Gradient {
  readonly slug: string;
  readonly label: string;
  readonly from: string;
  readonly to: string;
  readonly angle: number;
  readonly keywords: readonly string[];
}
export interface Lesson {
  readonly id: string;
  readonly label: string;
  readonly theme: string;
  readonly color: string;
  readonly keywords: readonly string[];
  draw(): string;
}

const n = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(2));
const range = (k: number): number[] => Array.from({ length: k }, (_, i) => i);
const svg = (bg: string, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_W}" height="${SVG_H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${bg}"/>${body}</svg>`;
const ln = (x1: number, y1: number, x2: number, y2: number, c = LINE, w = 2): string =>
  `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const box = (x: number, y: number, w: number, h: number, c = LINE, r = 16, sw = 2, fill = "none"): string =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${r}" fill="${fill}" stroke="${c}" stroke-width="${sw}"/>`;
const ring = (cx: number, cy: number, r: number, c = LINE, sw = 2, fill = "none"): string =>
  `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}" stroke="${c}" stroke-width="${sw}"/>`;
const path = (d: string, c = INK, sw = 3): string =>
  `<path d="${d}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
const label = (x: number, y: number, s: string, size = 32, anchor: "start" | "middle" | "end" = "middle", c = INK): string =>
  `<text x="${n(x)}" y="${n(y)}" font-family="${FONT}" font-size="${size}" text-anchor="${anchor}" fill="${c}">${s}</text>`;

function gradientSvg(from: string, to: string, angle: number): string {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad) / 2;
  const dy = Math.sin(rad) / 2;
  const f = (v: number): string => v.toFixed(3);
  return svg(
    from,
    `<defs><linearGradient id="g" x1="${f(0.5 - dx)}" y1="${f(0.5 - dy)}" x2="${f(0.5 + dx)}" y2="${f(0.5 + dy)}"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>`,
  );
}

function weekPlanner(): string {
  const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
  const [x0, y0, w, h] = [80, 80, W - 160, H - 160];
  const col = w / days.length;
  return svg(
    "#ffffff",
    box(x0, y0, w, h) +
      ln(x0, y0 + 90, x0 + w, y0 + 90) +
      range(days.length - 1).map((i) => ln(x0 + col * (i + 1), y0, x0 + col * (i + 1), y0 + h)).join("") +
      days.map((d, i) => label(x0 + col * (i + 0.5), y0 + 58, d, 34)).join(""),
  );
}

function calendar(): string {
  const days = ["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."];
  const [x0, y0, w, h, head] = [80, 150, W - 160, H - 230, 70];
  const col = w / 7;
  const row = (h - head) / 6;
  return svg(
    "#ffffff",
    label(x0, 110, "Mois :", 36, "start") +
      ln(x0 + 120, 112, x0 + 620, 112) +
      box(x0, y0, w, h) +
      ln(x0, y0 + head, x0 + w, y0 + head) +
      range(6).map((i) => ln(x0 + col * (i + 1), y0, x0 + col * (i + 1), y0 + h)).join("") +
      range(5).map((i) => ln(x0, y0 + head + row * (i + 1), x0 + w, y0 + head + row * (i + 1), SOFT)).join("") +
      days.map((d, i) => label(x0 + col * (i + 0.5), y0 + 46, d, 30)).join(""),
  );
}

function timeline(): string {
  const [y, x0, x1, step] = [540, 120, 1800, 140];
  const ticks = range(Math.floor((x1 - 60 - x0) / step) + 1).map((i) => ln(x0 + i * step, y - 24, x0 + i * step, y + 24, INK));
  return svg("#ffffff", ln(x0, y, x1, y, INK, 3) + path(`M${x1 - 30} ${y - 18} L${x1} ${y} L${x1 - 30} ${y + 18}`) + ticks.join(""));
}

function venn(): string {
  return svg(
    "#ffffff",
    ring(760, 560, 360, "#7c8fd6", 3, "rgba(124,143,214,0.08)") + ring(1160, 560, 360, "#d68f7c", 3, "rgba(214,143,124,0.08)") + label(560, 150, "A", 40) + label(1360, 150, "B", 40),
  );
}

function tChart(): string {
  return svg("#ffffff", ln(160, 220, 1760, 220, INK, 3) + ln(960, 220, 960, 960, INK, 3) + label(560, 180, "Pour", 40) + label(1360, 180, "Contre", 40));
}

function kwl(): string {
  const heads = ["Je sais", "Je veux savoir", "J'ai appris"];
  const [x0, y0, gap] = [80, 80, 32];
  const w = (W - 160 - gap * 2) / 3;
  const h = H - 160;
  return svg(
    "#ffffff",
    heads
      .map((title, i) => {
        const x = x0 + i * (w + gap);
        return box(x, y0, w, h) + ln(x, y0 + 90, x + w, y0 + 90) + label(x + w / 2, y0 + 58, title, 34);
      })
      .join(""),
  );
}

function mindMap(): string {
  const [cx, cy] = [960, 540];
  const spots: readonly (readonly [number, number])[] = [[360, 220], [960, 140], [1560, 220], [360, 860], [960, 940], [1560, 860]];
  return svg(
    "#ffffff",
    spots.map(([x, y]) => ln(cx, cy, x, y, LINE, 3) + box(x - 150, y - 50, 300, 100, LINE, 50, 2, "#ffffff")).join("") +
      `<ellipse cx="${cx}" cy="${cy}" rx="230" ry="115" fill="#ffffff" stroke="${INK}" stroke-width="3"/>`,
  );
}

function axes(): string {
  const [step, cx, cy] = [60, 960, 540];
  const v = range(Math.floor(W / step) + 1).map((i) => ln(i * step, 0, i * step, H, SOFT, 1)).join("");
  const h = range(Math.floor(H / step) + 1).map((i) => ln(0, i * step, W, i * step, SOFT, 1)).join("");
  return svg(
    "#ffffff",
    v + h + ln(60, cy, 1860, cy, INK, 3) + ln(cx, 1020, cx, 60, INK, 3) +
      path(`M1832 ${cy - 16} L1860 ${cy} L1832 ${cy + 16}`) + path(`M${cx - 16} 88 L${cx} 60 L${cx + 16} 88`) +
      label(1850, cy + 50, "x", 34) + label(cx - 36, 80, "y", 34) + label(cx - 30, cy + 44, "O", 30),
  );
}

function numberLine(): string {
  const [y, x0, step] = [540, 160, 80];
  const ticks = range(21)
    .map((i) => {
      const x = x0 + i * step;
      const big = i % 5 === 0;
      return ln(x, y - (big ? 30 : 18), x, y + (big ? 30 : 18), INK, big ? 3 : 2) + label(x, y + 80, String(i), big ? 34 : 28);
    })
    .join("");
  return svg("#ffffff", ln(x0 - 40, y, x0 + 20 * step + 40, y, INK, 3) + ticks);
}

function worksheet(): string {
  const fields: readonly (readonly [string, number, number])[] = [["Nom :", 100, 110], ["Prénom :", 1000, 110], ["Date :", 100, 190], ["Classe :", 1000, 190]];
  const head = fields.map(([s, x, y]) => label(x, y, s, 32, "start") + ln(x + 160, y + 6, x + 820, y + 6)).join("");
  const rules = range(12).map((i) => ln(100, 300 + i * 60, 1820, 300 + i * 60, SOFT)).join("");
  return svg("#ffffff", head + ln(80, 240, 1840, 240, INK) + rules);
}

function football(): string {
  const [c, sw] = ["#ffffff", 4];
  const r = (x: number, y: number, w: number, h: number): string => box(x, y, w, h, c, 0, sw);
  return svg(
    "#2f7d4f",
    r(120, 90, 1680, 900) + ln(960, 90, 960, 990, c, sw) + ring(960, 540, 150, c, sw) + ring(960, 540, 6, c, sw, c) +
      r(120, 290, 270, 500) + r(1530, 290, 270, 500) + r(120, 410, 90, 260) + r(1710, 410, 90, 260) +
      ring(300, 540, 5, c, sw, c) + ring(1620, 540, 5, c, sw, c),
  );
}

function basketball(): string {
  const [c, sw] = ["#ffffff", 4];
  const r = (x: number, y: number, w: number, h: number): string => box(x, y, w, h, c, 0, sw);
  return svg(
    "#c98a4b",
    r(120, 90, 1680, 900) + ln(960, 90, 960, 990, c, sw) + ring(960, 540, 120, c, sw) +
      r(120, 380, 380, 320) + r(1420, 380, 380, 320) + ring(500, 540, 120, c, sw) + ring(1420, 540, 120, c, sw) +
      path("M120 150 L260 150 A440 440 0 0 1 260 930 L120 930", c, sw) + path("M1800 150 L1660 150 A440 440 0 0 0 1660 930 L1800 930", c, sw) +
      ring(180, 540, 14, c, sw) + ring(1740, 540, 14, c, sw),
  );
}

export const GRADIENTS: readonly Gradient[] = Object.freeze([
  { slug: "aube", label: "Aube", from: "#fde2e4", to: "#e2ece9", angle: 90, keywords: ["rose", "vert", "doux", "matin"] },
  { slug: "lagon", label: "Lagon", from: "#a1c4fd", to: "#c2e9fb", angle: 120, keywords: ["bleu", "eau", "clair"] },
  { slug: "prairie", label: "Prairie", from: "#d4fc79", to: "#96e6a1", angle: 120, keywords: ["vert", "printemps", "nature"] },
  { slug: "coucher", label: "Coucher de soleil", from: "#fbc2eb", to: "#a6c1ee", angle: 90, keywords: ["rose", "violet", "soir"] },
  { slug: "peche", label: "Pêche", from: "#ffecd2", to: "#fcb69f", angle: 90, keywords: ["orange", "chaud", "doux"] },
  { slug: "brume", label: "Brume", from: "#e0eafc", to: "#cfdef3", angle: 90, keywords: ["bleu", "gris", "calme"] },
  { slug: "ocean", label: "Océan", from: "#2193b0", to: "#6dd5ed", angle: 135, keywords: ["bleu", "mer", "eau"] },
  { slug: "nuit", label: "Nuit", from: "#141e30", to: "#243b55", angle: 90, keywords: ["sombre", "bleu", "soir"] },
  { slug: "foret", label: "Forêt", from: "#134e5e", to: "#71b280", angle: 135, keywords: ["vert", "sombre", "nature"] },
  { slug: "aurore", label: "Aurore", from: "#ee9ca7", to: "#ffdde1", angle: 90, keywords: ["rose", "matin", "doux"] },
  { slug: "agrume", label: "Agrume", from: "#f6d365", to: "#fda085", angle: 120, keywords: ["jaune", "orange", "chaud"] },
  { slug: "glacier", label: "Glacier", from: "#e6e9f0", to: "#eef1f5", angle: 90, keywords: ["gris", "blanc", "froid"] },
  { slug: "lavande", label: "Lavande", from: "#e0c3fc", to: "#8ec5fc", angle: 135, keywords: ["violet", "bleu", "doux"] },
  { slug: "sable", label: "Sable", from: "#f5efe6", to: "#e8dfca", angle: 90, keywords: ["beige", "plage", "doux"] },
  { slug: "ardoise", label: "Ardoise dégradée", from: "#3a4750", to: "#2b333b", angle: 90, keywords: ["sombre", "gris", "tableau noir"] },
  { slug: "crepuscule", label: "Crépuscule", from: "#3a1c71", to: "#d76d77", angle: 135, keywords: ["violet", "rouge", "soir"] },
  { slug: "menthe", label: "Menthe", from: "#d9f2e6", to: "#a8e6cf", angle: 90, keywords: ["vert", "frais", "doux"] },
  { slug: "ciel", label: "Ciel", from: "#89f7fe", to: "#66a6ff", angle: 90, keywords: ["bleu", "ciel", "clair"] },
]);

export const LESSONS: readonly Lesson[] = Object.freeze([
  { id: "semainier", label: "Semainier", theme: "organisation", color: "#ffffff", keywords: ["semaine", "jours", "planning", "emploi du temps", "agenda"], draw: weekPlanner },
  { id: "calendrier", label: "Calendrier du mois", theme: "organisation", color: "#ffffff", keywords: ["calendrier", "mois", "dates", "jours", "agenda"], draw: calendar },
  { id: "frise", label: "Frise chronologique", theme: "organisation", color: "#ffffff", keywords: ["frise", "chronologie", "histoire", "temps", "dates"], draw: timeline },
  { id: "venn", label: "Diagramme de Venn", theme: "reflexion", color: "#ffffff", keywords: ["venn", "ensembles", "comparer", "cercles", "logique"], draw: venn },
  { id: "tableau-en-t", label: "Tableau en T", theme: "reflexion", color: "#ffffff", keywords: ["tableau en t", "pour contre", "comparer", "débat", "arguments"], draw: tChart },
  { id: "sva", label: "Je sais, je veux savoir, j'ai appris", theme: "reflexion", color: "#ffffff", keywords: ["sva", "savoir", "apprendre", "colonnes", "bilan"], draw: kwl },
  { id: "carte-mentale", label: "Carte mentale", theme: "reflexion", color: "#ffffff", keywords: ["carte mentale", "idées", "remue-méninges", "schéma", "branches"], draw: mindMap },
  { id: "repere", label: "Repère orthonormé", theme: "mathematiques", color: "#ffffff", keywords: ["repère", "axes", "coordonnées", "graphique", "fonction"], draw: axes },
  { id: "droite-graduee", label: "Droite graduée", theme: "mathematiques", color: "#ffffff", keywords: ["droite graduée", "nombres", "graduation", "calcul", "règle"], draw: numberLine },
  { id: "entete-fiche", label: "En-tête de fiche", theme: "ecriture", color: "#ffffff", keywords: ["fiche", "nom", "date", "classe", "exercice"], draw: worksheet },
  { id: "terrain-football", label: "Terrain de football", theme: "sport", color: "#2f7d4f", keywords: ["football", "foot", "terrain", "sport", "tactique"], draw: football },
  { id: "terrain-basket", label: "Terrain de basket", theme: "sport", color: "#c98a4b", keywords: ["basket", "basketball", "terrain", "sport", "tactique"], draw: basketball },
]);

/** SVG d'un fond dessiné (`degrade-<slug>` ou modèle de cours) ; lève pour tout autre id. */
export function svgOf(id: string): string {
  const g = GRADIENTS.find((x) => `degrade-${x.slug}` === id);
  if (g !== undefined) return gradientSvg(g.from, g.to, g.angle);
  const l = LESSONS.find((x) => x.id === id);
  if (l !== undefined) return l.draw();
  throw new Error(`fond dessiné inconnu : ${id}`);
}
```

- [ ] **Étape 4 : écrire `apps/web/src/backgrounds/drawn.ts` et `photos.ts`.**

```ts
/**
 * Fonds dessinés du pack (personnalisation-1b, Q8 à Q10, DA3) : 34 couleurs unies, 18 dégradés et 12 modèles de cours en
 * SVG (`svg.ts`), 54 lignages et grilles vectoriels du cœur (six types × trois pas × trois papiers), nets à tout zoom.
 */
import type { GridInput, GridKind } from "../core/api";
import type { PackBackground } from "./catalog";
import { GRADIENTS, LESSONS } from "./svg";

/** Unités de page par millimètre (`grid-edit.ts` : Seyès 8 mm = 30,24). */
const MM = 3.78;
const mm = (v: number): number => Math.round(v * MM * 100) / 100;

const gridOf = (kind: GridKind, spacing: number, line: string): GridInput => ({
  visible: true,
  snap: false,
  above: false,
  levels: [{ kind, spacingX: spacing, spacingY: spacing, originX: 0, originY: 0, color: line, line: "solid", lineWidth: 1, snap: true, visible: true }],
});

type Swatch = readonly [id: string, label: string, color: string, keywords: readonly string[]];
const LIGHT: readonly Swatch[] = [
  ["blanc", "Blanc (aucun fond)", "#ffffff", ["blanc", "aucun", "vide", "neutre", "effacer"]],
  ["creme", "Crème", "#fbf7ec", ["crème", "ivoire", "papier", "doux"]],
  ["ivoire", "Ivoire", "#fffdf5", ["ivoire", "blanc cassé", "papier"]],
  ["sable", "Sable", "#f4ecd8", ["sable", "beige", "plage"]],
  ["peche", "Pêche", "#fde8dc", ["pêche", "orange", "doux"]],
  ["rose-poudre", "Rose poudré", "#fbe4ec", ["rose", "doux", "pastel"]],
  ["lavande", "Lavande", "#ece9fb", ["lavande", "violet", "pastel"]],
  ["lilas", "Lilas", "#e9e0f7", ["lilas", "violet", "pastel"]],
  ["bleu-ciel", "Bleu ciel", "#e3f1fb", ["bleu", "ciel", "pastel"]],
  ["bleu-glacier", "Bleu glacier", "#e8f3f7", ["bleu", "froid", "glace"]],
  ["menthe", "Menthe", "#e3f5ec", ["menthe", "vert", "frais"]],
  ["vert-eau", "Vert d'eau", "#dff3ef", ["vert", "eau", "pastel"]],
  ["tilleul", "Tilleul", "#eef6dc", ["vert", "tilleul", "printemps"]],
  ["jaune-pale", "Jaune pâle", "#fdf6d6", ["jaune", "soleil", "pastel"]],
  ["citron", "Citron", "#fbf3c4", ["jaune", "citron", "vif"]],
  ["gris-perle", "Gris perle", "#f2f3f5", ["gris", "perle", "neutre"]],
  ["gris-clair", "Gris clair", "#e6e8eb", ["gris", "clair", "neutre"]],
  ["lin", "Lin", "#f1ece2", ["lin", "beige", "naturel"]],
  ["abricot", "Abricot", "#fde9d2", ["abricot", "orange", "chaud"]],
  ["corail", "Corail clair", "#fde2dd", ["corail", "rose", "chaud"]],
];
const DARK: readonly Swatch[] = [
  ["ardoise", "Ardoise", "#2f3e46", ["ardoise", "tableau noir", "craie", "sombre", "gris"]],
  ["tableau-vert", "Tableau vert", "#234d3c", ["tableau vert", "craie", "vert", "sombre", "école"]],
  ["bleu-nuit", "Bleu nuit", "#14213d", ["bleu", "nuit", "sombre"]],
  ["marine", "Marine", "#1b2a4a", ["marine", "bleu", "sombre"]],
  ["anthracite", "Anthracite", "#2b2d31", ["anthracite", "gris", "sombre"]],
  ["noir", "Noir", "#111111", ["noir", "sombre", "contraste"]],
  ["prune", "Prune", "#3b1f3a", ["prune", "violet", "sombre"]],
  ["bordeaux", "Bordeaux", "#4a1c24", ["bordeaux", "rouge", "sombre"]],
  ["foret", "Forêt", "#1f3b2c", ["forêt", "vert", "sombre"]],
  ["petrole", "Pétrole", "#12394a", ["pétrole", "bleu", "vert", "sombre"]],
  ["chocolat", "Chocolat", "#3a2a20", ["chocolat", "brun", "sombre"]],
  ["indigo", "Indigo", "#272654", ["indigo", "bleu", "violet", "sombre"]],
  ["graphite", "Graphite", "#3a3f44", ["graphite", "gris", "sombre"]],
  ["aubergine", "Aubergine", "#2e1f3d", ["aubergine", "violet", "sombre"]],
];

const swatch = (theme: string) => ([id, label, color, keywords]: Swatch): PackBackground => ({
  id, section: "colors", theme, label, keywords, kind: "color", color, grid: null, photo: null,
});

interface Paper {
  readonly suffix: string;
  readonly label: string;
  readonly color: string;
  readonly line: string;
  readonly words: readonly string[];
}
const WHITE: Paper = { suffix: "", label: "", color: "#ffffff", line: "#94a3b8", words: ["blanc"] };
const CREAM: Paper = { suffix: "-creme", label: " crème", color: "#fbf7ec", line: "#a8a29e", words: ["crème", "papier"] };
const SLATE: Paper = { suffix: "-ardoise", label: " sur ardoise", color: "#2f3e46", line: "#6b7f88", words: ["sombre", "ardoise", "tableau noir"] };
/** Seyès : papier crème par défaut, lignes lavande (S1 : « Seyès 8 mm » sur fond crème). */
const SEYES_PAPERS: readonly Paper[] = [
  { ...CREAM, suffix: "", label: "", line: "#8f9ad6" },
  { ...WHITE, suffix: "-blanc", label: " blanc", line: "#8f9ad6" },
  SLATE,
];

interface LineTheme {
  readonly theme: string;
  readonly kind: GridKind;
  readonly slug: string;
  readonly name: string;
  readonly words: readonly string[];
  readonly sizes: readonly (readonly [tag: string, label: string, spacing: number])[];
  readonly papers: readonly Paper[];
}
const mmSizes = (...v: number[]) => v.map((x) => [`${x}mm`, `${x} mm`, mm(x)] as const);
const LINE_THEMES: readonly LineTheme[] = [
  { theme: "lignages", kind: "lines", slug: "lignage", name: "Lignage", words: ["lignes", "lignage", "cahier", "écriture"], sizes: mmSizes(7, 8, 10), papers: [WHITE, CREAM, SLATE] },
  { theme: "quadrillages", kind: "squares", slug: "quadrillage", name: "Quadrillage", words: ["quadrillage", "carreaux", "petits carreaux", "grille", "maths"], sizes: mmSizes(5, 10, 20), papers: [WHITE, CREAM, SLATE] },
  { theme: "seyes", kind: "seyes", slug: "seyes", name: "Seyès", words: ["seyès", "grands carreaux", "cahier", "écriture", "français"], sizes: mmSizes(8, 9, 10), papers: SEYES_PAPERS },
  { theme: "points", kind: "dots", slug: "points", name: "Points", words: ["points", "pointillé", "trame", "grille"], sizes: mmSizes(5, 10, 15), papers: [WHITE, CREAM, SLATE] },
  { theme: "isometrique", kind: "isometric", slug: "isometrique", name: "Isométrique", words: ["isométrique", "triangles", "perspective", "géométrie"], sizes: mmSizes(10, 15, 20), papers: [WHITE, CREAM, SLATE] },
  {
    theme: "portees", kind: "music", slug: "portees", name: "Portées", words: ["portée", "portées", "musique", "solfège", "partition"],
    sizes: [["serrees", "serrées", 16], ["moyennes", "moyennes", 20], ["larges", "larges", 24]], papers: [WHITE, CREAM, SLATE],
  },
];

const lines: PackBackground[] = LINE_THEMES.flatMap((th) =>
  th.sizes.flatMap(([tag, size, spacing]) =>
    th.papers.map((p): PackBackground => ({
      id: `${th.slug}-${tag}${p.suffix}`,
      section: "lines",
      theme: th.theme,
      label: `${th.name} ${size}${p.label}`,
      keywords: [...th.words, ...p.words],
      kind: "grid",
      color: p.color,
      grid: gridOf(th.kind, spacing, p.line),
      photo: null,
    })),
  ),
);

const gradients: PackBackground[] = GRADIENTS.map((g) => ({
  id: `degrade-${g.slug}`, section: "colors", theme: "degrades", label: g.label, keywords: ["dégradé", ...g.keywords], kind: "svg", color: g.to, grid: null, photo: null,
}));

const lessons: PackBackground[] = LESSONS.map((l) => ({
  id: l.id, section: "lessons", theme: l.theme, label: l.label, keywords: l.keywords, kind: "svg", color: l.color, grid: null, photo: null,
}));

export const DRAWN: readonly PackBackground[] = Object.freeze([...LIGHT.map(swatch("claires")), ...DARK.map(swatch("sombres")), ...gradients, ...lines, ...lessons]);
```

`apps/web/src/backgrounds/photos.ts` :

```ts
// Généré par scripts/fonds/produire-photos.mjs depuis apps/web/backgrounds/SOURCES.json : ne pas modifier à la main.
// Aucune provenance ici (Q13, Q33) : elle reste dans SOURCES.json. Vide jusqu'à la tâche des photos.
import type { PackBackground } from "./catalog";

export const PHOTOS: readonly PackBackground[] = Object.freeze([]);
```

- [ ] **Étape 5 : vert et types.**

Commandes :
`cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/backgrounds/catalog.test.ts 2>&1 | tail -10`
Attendu : `Tests  8 passed (8)`, aucun `FAIL`, noms « DRAWN : au moins 110 fonds dessinés » et « fonds nommés par les
scénarios » présents.
`nice -n 10 pnpm exec tsc --noEmit 2>&1 | tail -5` → aucune ligne `error TS`.

- [ ] **Étape 6 : commit.**

```bash
cd <wt>
for f in apps/web/src/backgrounds/catalog.ts apps/web/src/backgrounds/drawn.ts apps/web/src/backgrounds/svg.ts apps/web/src/backgrounds/photos.ts apps/web/src/backgrounds/catalog.test.ts; do git add "$f"; done
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(web): background pack catalogue with 118 drawn backgrounds" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport attendu.** Sortie `tail` de l'étape 5, lignes `Réutilisation : …`, sha du commit.

---

<a id="tache-t3"></a>
### Tâche T3 — Recherche française tolérante aux fautes

**Objectif.** Un module de recherche maison, sans dépendance ni réseau : normalisation de la bibliothèque, mots,
pluriels simples, synonymes français écrits à la main (≈ 80 groupes), expressions (« tableau noir », « grands
carreaux »), fautes par distance de Damerau-Levenshtein bornée (1 de 4 à 7 lettres, 2 au-delà), préfixe pour la frappe en
cours. Rang : mot exact > préfixe > synonyme > faute ; tous les mots doivent trouver un écho. Cadrage : Q15 à Q17, DA5 ;
scénarios S2 (« ocean », « oséan », « tableau noir »), S5 (« portee »).

**Fichiers.**
- Créer : `apps/web/src/backgrounds/search.ts`, `apps/web/src/backgrounds/synonyms.ts`
- Tester : `apps/web/src/backgrounds/search.test.ts`

**Interfaces.**
- Consomme : `normalizeSearch(s: string): string` de `apps/web/src/app/library.ts:90` (existant).
- Produit :
  `interface SearchDoc { readonly id: string; readonly label: string; readonly keywords: readonly string[] }` ;
  `interface BackgroundSearch { search(q: string): readonly string[]; suggest(q: string): string | null }` ;
  `function createBackgroundSearch(docs: readonly SearchDoc[], groups?: readonly (readonly string[])[]): BackgroundSearch` (par défaut `SYNONYMS`) ;
  `function stem(w: string): string` ; `function faultBound(len: number): number` ; `function distance(a: string, b: string, max: number): number` ;
  `const SYNONYMS: readonly (readonly string[])[]` (dans `synonyms.ts`).
- `search("")`, une requête blanche ou de ponctuation seule : `[]`, jamais d'erreur. `suggest(q)` : terme du dictionnaire
  le plus proche du premier mot (distance ≤ 2), tel qu'écrit dans le dictionnaire (accents compris), sinon `null`.
- Les identifiants rendus sont ceux des `SearchDoc` (fonds du pack : leur `id` ; « Mes fonds » : `mine:<fichier>`, posé
  par l'appelant).
- Réutilise : `apps/web/src/app/library.ts:90` — `normalizeSearch(s)`.
- Réutilise : aucun module existant pour la recherche tolérante (termes cherchés : `fuse`, `minisearch`, `levenshtein`, `synonym`) — nouveau module `apps/web/src/backgrounds/search.ts` : `createBackgroundSearch(docs: readonly { id: string; label: string; keywords: readonly string[] }[]): { search(q: string): readonly string[] }` (DA5), étendu de `suggest`.
- Le rapport porte, pour chacune de ces lignes, `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Contraintes (recopiées de Global Constraints).**
- VM partagée : builds et tests en `nice -n 10`, `cargo … -j 4`, `CARGO_TARGET_DIR=<worktree de la tâche>/target` (piège : cible partagée entre worktrees) ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; test isolé direct.
- Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`, `.`, `commit -a`) ; jamais `--force`.
- Aucun test désactivé, sauté, ni seuil modifié. Essais Playwright existants (sélecteurs `data-item`) restent verts sans réécriture.
- Aucune dépendance ajoutée sauf permissive et justifiée ; aucune AGPL/GPL/LGPL (Fuse.js et MiniSearch écartés par Q15 : rien à ajouter).
- L'interface ne nomme aucun service extérieur (aucun nom de site dans le dictionnaire).
- Aucun `tauri build`, aucun processus détaché laissé en marche.
- Préparation : `cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3`, puis `cd <wt> && for d in wasm wasm-formats; do [ -d apps/web/src/$d ] || cp -r /home/adminjd/projets/roomboard-wt/personnalisation-1b/apps/web/src/$d apps/web/src/; done`.

**Interdits.** Ne pas modifier `app/library.ts` (ni écrire une autre normalisation) ; aucun réseau ; aucune IA.

**Terminé quand.** `search.test.ts` passe (≥ 12 tests), `tsc --noEmit` du web propre, commit fait.

**Étapes.**

- [ ] **Étape 1 : écrire `apps/web/src/backgrounds/search.test.ts` (rouge).**

```ts
import { describe, expect, it } from "vitest";
import { createBackgroundSearch, distance, faultBound, stem, type SearchDoc } from "./search";
import { SYNONYMS } from "./synonyms";

const DOCS: readonly SearchDoc[] = [
  { id: "mer-1", label: "Vagues sur la plage", keywords: ["mer", "bleu", "été"] },
  { id: "ardoise", label: "Ardoise", keywords: ["ardoise", "tableau noir", "craie", "sombre"] },
  { id: "seyes-8mm", label: "Seyès 8 mm", keywords: ["seyès", "grands carreaux", "cahier"] },
  { id: "portees-moyennes", label: "Portées moyennes", keywords: ["portée", "musique"] },
  { id: "quadrillage-5mm", label: "Quadrillage 5 mm", keywords: ["quadrillage", "carreaux"] },
  { id: "foret-1", label: "Sous-bois", keywords: ["forêt", "vert", "arbres"] },
  { id: "mine:page-1", label: "Page 1 — 27/11 10:00", keywords: [] },
];
const s = createBackgroundSearch(DOCS);

describe("personnalisation-1b : recherche des fonds (Q15, Q16, DA5)", () => {
  it("mot exact : « ardoise » rend l'ardoise en tête", () => {
    expect(s.search("ardoise")[0]).toBe("ardoise");
  });
  it("synonyme : « océan » trouve la mer", () => {
    expect(s.search("océan")).toContain("mer-1");
  });
  it("faute : « oséan » trouve aussi la mer ; « ardiose » (transposition) trouve l'ardoise", () => {
    expect(s.search("oséan")).toContain("mer-1");
    expect(s.search("ardiose")).toContain("ardoise");
  });
  it("sans accent : « portee » et « seyes » trouvent la portée et le Seyès", () => {
    expect(s.search("portee")[0]).toBe("portees-moyennes");
    expect(s.search("seyes")[0]).toBe("seyes-8mm");
  });
  it("pluriel : « carreau » trouve le quadrillage et le Seyès", () => {
    expect(s.search("carreau")).toEqual(expect.arrayContaining(["quadrillage-5mm", "seyes-8mm"]));
    expect(stem("carreaux")).toBe("carreau");
    expect(stem("animaux")).toBe("animal");
    expect(stem("arbres")).toBe("arbre");
    expect(stem("mer")).toBe("mer");
  });
  it("expression : « tableau noir » sort l'ardoise ; « grands carreaux » le Seyès", () => {
    expect(s.search("tableau noir")[0]).toBe("ardoise");
    expect(s.search("grands carreaux")[0]).toBe("seyes-8mm");
  });
  it("préfixe : « qua » trouve le quadrillage, « ard » l'ardoise", () => {
    expect(s.search("qua")).toContain("quadrillage-5mm");
    expect(s.search("ard")[0]).toBe("ardoise");
  });
  it("rang : exact > préfixe > synonyme > faute", () => {
    const r = createBackgroundSearch([
      { id: "faute", label: "x", keywords: ["plaga"] },
      { id: "synonyme", label: "x", keywords: ["littoral"] },
      { id: "prefixe", label: "x", keywords: ["plagette"] },
      { id: "exact", label: "x", keywords: ["plage"] },
    ]);
    expect(r.search("plage")).toEqual(["exact", "prefixe", "synonyme", "faute"]);
  });
  it("ET : tous les mots doivent trouver un écho ; « ardoise musique » ne rend rien", () => {
    expect(s.search("ardoise musique")).toEqual([]);
    expect(s.search("sous bois vert")).toEqual(["foret-1"]);
  });
  it("Mes fonds : cherchés sur leur nom", () => {
    expect(s.search("page")).toContain("mine:page-1");
  });
  it("requête vide, blanche ou ponctuation seule : aucun résultat, aucune erreur", () => {
    for (const q of ["", "   ", "— ? !", "de la"]) expect(s.search(q), JSON.stringify(q)).toEqual([]);
  });
  it("suggest : terme proche du dictionnaire, tel qu'écrit ; rien de proche : null", () => {
    expect(s.suggest("solfeje")).toBe("solfège");
    expect(s.suggest("zzzzzzzz")).toBeNull();
    expect(s.suggest("")).toBeNull();
  });
  it("distance de Damerau-Levenshtein bornée, bornes de faute 0, 1, 2", () => {
    expect(distance("ocean", "osean", 1)).toBe(1);
    expect(distance("ardoise", "ardiose", 1)).toBe(1);
    expect(distance("mer", "montagne", 2)).toBe(3);
    expect([faultBound(3), faultBound(4), faultBound(7), faultBound(8)]).toEqual([0, 1, 1, 2]);
  });
  it("dictionnaire : au moins 70 groupes, chacun d'au moins deux termes, aucun nom de site", () => {
    expect(SYNONYMS.length).toBeGreaterThanOrEqual(70);
    for (const g of SYNONYMS) expect(g.length, g.join(",")).toBeGreaterThanOrEqual(2);
    const all = SYNONYMS.flat().join(" ").toLowerCase();
    for (const t of ["http", "www.", "wikimedia", "unsplash", "pixabay", "pexels", "polyhaven", "openverse"]) expect(all).not.toContain(t);
  });
  it("200 fonds : une recherche prend moins de 10 ms en moyenne", () => {
    const many = Array.from({ length: 200 }, (_, i) => ({ id: `f${i}`, label: `Fond ${i}`, keywords: ["bleu", "mer", "grille", "papier", "nature"] }));
    const big = createBackgroundSearch(many);
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) big.search(i % 2 === 0 ? "oséan" : "papie");
    expect((performance.now() - t0) / 20).toBeLessThan(10);
  });
});
```

Commande : `cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/backgrounds/search.test.ts 2>&1 | tail -10`
Attendu : `FAIL`, « Failed to resolve import "./search" ».

- [ ] **Étape 2 : écrire `apps/web/src/backgrounds/synonyms.ts`.**

```ts
/**
 * Dictionnaire de synonymes de la recherche des fonds (personnalisation-1b, Q15, DA5), écrit à la main : un groupe =
 * des mots ou expressions interchangeables ; le premier mot simple d'un groupe porte ses expressions. S'enrichit sans
 * toucher au code. Aucun nom de site ni de source.
 */
export const SYNONYMS: readonly (readonly string[])[] = Object.freeze([
  ["mer", "océan", "plage", "vague", "littoral", "marin", "côte"],
  ["ciel", "nuage", "azur", "nuageux"],
  ["montagne", "sommet", "alpes", "relief"],
  ["forêt", "bois", "arbre", "sous-bois"],
  ["fleur", "floral", "pétale", "jardin"],
  ["herbe", "prairie", "pré", "pelouse", "gazon"],
  ["désert", "dune", "sable"],
  ["lac", "rivière", "étang", "eau douce"],
  ["crépuscule", "coucher de soleil", "soir", "couchant"],
  ["aube", "lever de soleil", "aurore", "matin"],
  ["nuit", "étoile", "étoilé", "ciel nocturne"],
  ["hiver", "neige", "givre", "froid"],
  ["printemps", "bourgeon", "floraison"],
  ["été", "soleil", "chaleur", "vacances"],
  ["automne", "feuilles mortes", "feuille", "châtaigne"],
  ["parquet", "planche", "chêne", "boisé"],
  ["papier", "feuille blanche", "kraft", "carton"],
  ["liège", "panneau", "affichage"],
  ["pierre", "roche", "granit", "marbre", "caillou"],
  ["tissu", "toile", "lin", "textile"],
  ["brique", "mur", "maçonnerie"],
  ["béton", "ciment", "brut"],
  ["ardoise", "tableau noir", "craie"],
  ["craie", "tableau vert"],
  ["quadrillage", "carreaux", "grille", "quadrillé", "petits carreaux"],
  ["seyès", "grands carreaux", "cahier"],
  ["lignage", "lignes", "ligné", "réglure"],
  ["portée", "musique", "solfège", "partition", "notes"],
  ["points", "pointillé", "trame"],
  ["isométrique", "triangles", "perspective"],
  ["foot", "football", "soccer", "ballon rond"],
  ["basket", "basketball", "basket-ball", "panier"],
  ["sport", "terrain", "stade", "jeu"],
  ["semainier", "semaine", "hebdomadaire", "emploi du temps"],
  ["calendrier", "mois", "agenda", "date"],
  ["frise", "chronologie", "histoire", "époque"],
  ["venn", "ensembles", "intersection"],
  ["comparer", "comparaison", "pour contre", "tableau en t"],
  ["carte mentale", "carte heuristique", "schéma heuristique", "arborescence"],
  ["repère", "axes", "coordonnées", "graphique", "abscisse", "ordonnée"],
  ["graduation", "droite graduée", "règle", "nombres"],
  ["maths", "mathématiques", "math", "géométrie", "calcul"],
  ["français", "écriture", "rédaction", "dictée"],
  ["fiche", "exercice", "devoir", "évaluation"],
  ["sombre", "foncé", "obscur"],
  ["clair", "pâle", "pastel", "doux", "léger"],
  ["blanc", "vide", "neutre", "aucun"],
  ["bleu", "azur", "marine", "turquoise"],
  ["vert", "verdure", "émeraude"],
  ["rouge", "bordeaux", "carmin"],
  ["jaune", "citron", "doré"],
  ["orange", "abricot", "pêche", "corail"],
  ["rose", "poudré", "fuchsia"],
  ["violet", "lavande", "lilas", "mauve", "prune"],
  ["gris", "perle", "anthracite", "graphite"],
  ["brun", "marron", "chocolat", "beige"],
  ["dégradé", "gradient", "fondu"],
  ["abstrait", "motif", "formes", "géométrique"],
  ["texture", "matière", "surface", "grain"],
  ["nature", "paysage", "campagne", "extérieur"],
  ["eau", "goutte", "aquatique"],
  ["île", "tropical", "palmier", "lagon"],
  ["glace", "banquise", "glacier"],
  ["galaxie", "espace", "cosmos", "univers"],
  ["feuillage", "végétal", "plante", "herbier"],
  ["chemin", "route", "sentier"],
  ["école", "classe", "scolaire"],
  ["organisation", "planning", "planification"],
  ["réflexion", "idées", "remue-méninges", "brainstorming"],
  ["rentrée", "septembre", "cartable"],
  ["noël", "fêtes", "décembre"],
  ["halloween", "citrouille", "octobre"],
  ["pluie", "orage", "averse"],
  ["copie", "feuille de classeur", "copie double"],
  ["chant", "chorale", "chanson"],
  ["géographie", "carte", "monde"],
  ["science", "sciences", "biologie"],
  ["houle", "surf", "écume"],
  ["fond", "fond d'écran", "papier peint", "arrière-plan"],
  ["noir", "nuit noire", "ébène"],
]);
```

- [ ] **Étape 3 : écrire `apps/web/src/backgrounds/search.ts`.**

```ts
/**
 * Recherche des fonds (personnalisation-1b, Q15, Q16, DA5) : locale, française, sans dépendance ni réseau.
 * Normalisation de la bibliothèque (`normalizeSearch`), mots sans les mots vides, pluriels simples, synonymes écrits à la
 * main (`synonyms.ts`, expressions comprises), fautes par distance de Damerau-Levenshtein bornée (1 de 4 à 7 lettres,
 * 2 au-delà), préfixe pour la frappe en cours. Rang : mot exact > préfixe > synonyme > faute ; tous les mots de la
 * requête doivent trouver un écho (ET), puis l'ordre du catalogue départage. ≈ 200 entrées : parcours complet.
 */
import { normalizeSearch } from "../app/library";
import { SYNONYMS } from "./synonyms";

export interface SearchDoc {
  readonly id: string;
  readonly label: string;
  readonly keywords: readonly string[];
}
export interface BackgroundSearch {
  search(q: string): readonly string[];
  /** Terme du dictionnaire le plus proche du premier mot (distance ≤ 2), tel qu'écrit ; null sinon. */
  suggest(q: string): string | null;
}

const STOP = new Set(["de", "du", "des", "la", "le", "les", "l", "d", "et", "en", "a", "au", "aux", "un", "une", "sur", "pour", "avec"]);
const EXACT = 4;
const PREFIX = 3;
const SYNONYM = 2;
const FAULT = 1;
const SUGGEST_MAX = 2;

export function stem(w: string): string {
  if (w.length > 4 && w.endsWith("eaux")) return w.slice(0, -1);
  if (w.length > 4 && w.endsWith("aux")) return `${w.slice(0, -3)}al`;
  if (w.length > 3 && (w.endsWith("s") || w.endsWith("x"))) return w.slice(0, -1);
  return w;
}

export function faultBound(len: number): number {
  return len < 4 ? 0 : len <= 7 ? 1 : 2;
}

/** Distance de Damerau-Levenshtein (alignement optimal : transposition de deux voisines), arrêtée dès qu'elle dépasse
 *  `max` (rend alors `max + 1`). */
export function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows: number[][] = [Array.from({ length: b.length + 1 }, (_, j) => j)];
  for (let i = 1; i <= a.length; i++) {
    const row: number[] = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(rows[i - 1]![j]! + 1, row[j - 1]! + 1, rows[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, rows[i - 2]![j - 2]! + 1);
      row.push(v);
      best = Math.min(best, v);
    }
    if (best > max) return max + 1;
    rows.push(row);
  }
  return rows[a.length]![b.length]!;
}

const flat = (s: string): string => normalizeSearch(s).replace(/[^a-z0-9]+/g, " ").trim();

interface Prepared {
  /** Expression normalisée → mot qui la porte, les plus longues d'abord. */
  readonly phrases: readonly (readonly [string, string])[];
  /** Mot (racine) → groupes qui le contiennent. */
  readonly groupOf: ReadonlyMap<string, readonly number[]>;
  /** Mots (racines) de chaque groupe, porteurs des expressions compris. */
  readonly members: readonly (readonly string[])[];
}

function prepare(groups: readonly (readonly string[])[]): Prepared {
  const phrases: [string, string][] = [];
  const groupOf = new Map<string, number[]>();
  const members = groups.map((g, gi) => {
    const terms = g.map(flat).filter((t) => t !== "");
    const single = terms.find((t) => !t.includes(" "));
    const carrier = single ?? (terms[0] ?? "").replaceAll(" ", "");
    for (const t of terms) if (t.includes(" ")) phrases.push([t, carrier]);
    const words = [...new Set([...terms.filter((t) => !t.includes(" ")), carrier].map(stem))];
    for (const w of words) groupOf.set(w, [...(groupOf.get(w) ?? []), gi]);
    return words;
  });
  phrases.sort((x, y) => y[0].length - x[0].length);
  return { phrases, groupOf, members };
}

/** Mots d'un texte : normalisé, chaque expression connue suivie de son mot porteur, mots vides retirés, racines. */
function wordsOf(text: string, p: Prepared): string[] {
  let t = ` ${flat(text)} `;
  for (const [phrase, carrier] of p.phrases) t = t.replaceAll(` ${phrase} `, ` ${phrase} ${carrier} `);
  return t.split(" ").filter((w) => w !== "" && !STOP.has(w)).map(stem);
}

export function createBackgroundSearch(docs: readonly SearchDoc[], groups: readonly (readonly string[])[] = SYNONYMS): BackgroundSearch {
  const p = prepare(groups);
  const indexed = docs.map((d) => ({ id: d.id, tokens: new Set(wordsOf([d.label, ...d.keywords].join(" "), p)) }));
  const vocab = new Set<string>([...indexed.flatMap((d) => [...d.tokens]), ...p.members.flat()]);
  const matchesOf = (t: string): Map<string, number> => {
    const m = new Map<string, number>();
    const put = (term: string, score: number): void => {
      if ((m.get(term) ?? 0) < score) m.set(term, score);
    };
    const bound = faultBound(t.length);
    for (const v of vocab) {
      if (v === t) put(v, EXACT);
      else if (t.length >= 2 && v.startsWith(t)) put(v, PREFIX);
      else if (bound > 0 && distance(t, v, bound) <= bound) put(v, FAULT);
    }
    for (const [v, score] of [...m]) {
      for (const gi of p.groupOf.get(v) ?? []) for (const w of p.members[gi] ?? []) put(w, score === FAULT ? FAULT : SYNONYM);
    }
    return m;
  };
  return {
    search(q) {
      const words = wordsOf(q, p);
      if (words.length === 0) return [];
      const per = [...new Set(words)].map(matchesOf);
      const hits: { id: string; total: number; rank: number }[] = [];
      indexed.forEach((d, rank) => {
        let total = 0;
        for (const m of per) {
          let best = 0;
          for (const t of d.tokens) best = Math.max(best, m.get(t) ?? 0);
          if (best === 0) return;
          total += best;
        }
        hits.push({ id: d.id, total, rank });
      });
      return hits.sort((a, b) => b.total - a.total || a.rank - b.rank).map((h) => h.id);
    },
    suggest(q) {
      const first = wordsOf(q, p)[0];
      if (first === undefined) return null;
      let best: string | null = null;
      let bestD = SUGGEST_MAX + 1;
      for (const g of groups) {
        for (const term of g) {
          const d = distance(first, stem(flat(term).replaceAll(" ", "")), SUGGEST_MAX);
          if (d < bestD) {
            bestD = d;
            best = term;
          }
        }
      }
      return best;
    },
  };
}
```

- [ ] **Étape 4 : vert et types.**

Commandes :
`cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/backgrounds/search.test.ts 2>&1 | tail -10`
Attendu : `Tests  15 passed (15)`, aucun `FAIL`, noms « faute : « oséan » » et « rang : exact > préfixe » présents.
Si un test de rang ou de faute échoue, corriger `search.ts` (jamais l'assertion) ; « ardiose » est une transposition
(distance 1), « oséan » une substitution après normalisation (« osean » / « ocean »).
`nice -n 10 pnpm exec tsc --noEmit 2>&1 | tail -5` → aucune ligne `error TS`.

- [ ] **Étape 5 : commit.**

```bash
cd <wt>
for f in apps/web/src/backgrounds/search.ts apps/web/src/backgrounds/synonyms.ts apps/web/src/backgrounds/search.test.ts; do git add "$f"; done
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(web): French typo-tolerant background search with hand-written synonyms" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport attendu.** Sortie `tail` de l'étape 4, lignes `Réutilisation : …`, sha du commit.

---

<a id="tache-t4"></a>
### Tâche T4 — Photos CC0 : sources, preuves de licence, notices

**Objectif.** Choisir 40 à 50 photos CC0 pertinentes pour une classe (cinq thèmes de la section Images), **lire la
licence sur la page source de chacune**, et l'écrire avec sa preuve dans `apps/web/backgrounds/SOURCES.json` (hors du
dossier servi). Aucune image n'est téléchargée ni encodée ici (c'est T7). Écrire la section « Pack de fonds (images
CC0) » de `THIRD_PARTY_NOTICES.md` et la mention des trois tracés Lucide de ce chantier. Cadrage : Q11 à Q13, Q17, Q33,
H1-4 ; scénario S2 (photos de mer trouvées par « ocean »).

**Fichiers.**
- Créer : `apps/web/backgrounds/SOURCES.json`, `apps/web/src/backgrounds/sources.test.ts`
- Modifier : `THIRD_PARTY_NOTICES.md` (nouvelle section avant `## Icône de l'application (design L5)` ; une puce dans
  `## Icônes Lucide (ISC), design L1, L2, L3 et L4`, `:511-533`)

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit : `apps/web/backgrounds/SOURCES.json` de cette forme exacte (lue par T7, `scripts/fonds/produire-photos.mjs`,
  et par l'essai e2e T12) :

```json
{
  "format": "roomboard-background-sources",
  "schema": 1,
  "photos": [
    {
      "id": "mer-vagues-sable",
      "theme": "mer-ciel",
      "label": "Vagues sur le sable",
      "keywords": ["mer", "vague", "plage", "sable", "bleu", "été"],
      "page": "https://…/page-de-l-image",
      "fichier": "https://…/fichier-original.jpg",
      "auteur": "Nom tel qu'affiché sur la page",
      "licence": "CC0-1.0",
      "preuve": "« … » : texte de licence lu sur la page, recopié mot pour mot",
      "lu_le": "2026-11-27",
      "largeur": 4096,
      "hauteur": 2731,
      "retouche": "recadrage 16:9 centré, 2560 × 1440, WebP, métadonnées retirées"
    }
  ]
}
```

  `id` : `[a-z0-9-]+`, unique, **sans** nom de site ni nom d'origine du fichier ; `theme` ∈ `nature`, `mer-ciel`,
  `matieres`, `saisons`, `abstrait` ; `label` et `keywords` (5 à 10) écrits à la main en français, couleur dominante
  comprise, jamais le titre d'origine (Q17) ; `largeur` × `hauteur` de l'original ≥ 2560 × 1440 ; `fichier` : l'URL du
  fichier original que T7 téléchargera (JPEG ou PNG).
- Réutilise : aucun module de code (tâche de données).
- Le rapport porte `Réutilisation : écart — tâche de données, aucun module à appeler`.

**Méthode de vérification d'une licence (H1-4, Q12), une image à la fois.**
1. **Poly Haven** (textures : bois, papier, liège, pierre, tissu, brique, béton ; ciels HDRI exclus, ce sont des
   panoramas) : lire la page de l'asset (`https://polyhaven.com/a/<asset>`) et y trouver « CC0 » en clair ; l'URL du
   fichier diffus 4K (JPG) se lit dans l'API publique `https://api.polyhaven.com/files/<asset>` (réponse JSON lue en
   mémoire, jamais un fichier image).
2. **Wikimedia Commons** : `curl -s 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|extmetadata&titles=File:<nom>'`
   et exiger `extmetadata.LicenseShortName.value` = « CC0 » (ou « CC0 1.0 ») **puis** relire la page du fichier et y
   trouver le modèle CC0 ; copier la phrase de licence lue dans `preuve`.
3. **Openverse** filtré `license=cc0` seulement pour trouver des candidats ; chaque résultat est **vérifié sur sa page
   d'origine** (`foreign_landing_url`) comme en 1 ou 2 ; sans « CC0 » lisible sur cette page : écarté.
4. Écarter : Unsplash, Pixabay, Pexels (même si une page les cite), toute image du domaine public sans CC0 (NASA,
   PD-old), toute personne reconnaissable, marque, logo ou texte lisible, tout original < 2560 × 1440.
5. Lectures : `curl -s` ou l'outil de lecture de pages, sortie lue en mémoire ; si un fichier temporaire est utile, le
   mettre dans un dossier neuf `~/.cache/tmp/og5-sources-<date>/` et le supprimer en fin de tâche ; aucun script lancé
   depuis ce dossier.

Répartition visée : ≥ 6 photos par thème (« mer-ciel » : ≥ 6 dont le mot-clé « mer » ou « océan »), total 40 à 50.
Si moins de 40 photos ont une licence CC0 prouvée, **s'arrêter à ce nombre, ne rien inventer**, et le dire au rapport
(le plancher de 150 fonds tient avec ≥ 32 photos : 118 dessinés + 32).

**Contraintes (recopiées de Global Constraints).**
- VM partagée : builds et tests en `nice -n 10`, `cargo … -j 4`, `CARGO_TARGET_DIR=<worktree de la tâche>/target` (piège : cible partagée entre worktrees) ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; test isolé direct.
- Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`, `.`, `commit -a`) ; jamais `--force`.
- Aucun test désactivé, sauté, ni seuil modifié. Essais Playwright existants (sélecteurs `data-item`) restent verts sans réécriture.
- Aucune dépendance ajoutée sauf permissive et justifiée ; aucune AGPL/GPL/LGPL. Icônes Lucide (ISC) recopiées avec mention.
- L'interface ne nomme aucun service extérieur ; provenances seulement dans `THIRD_PARTY_NOTICES.md` et le fichier de sources du pack.
- Téléchargements (tâche photos seulement) : images CC0, licence lue sur la page source de chaque image ; Unsplash, Pixabay, Pexels exclus ; rien d'autre téléchargé ; fichiers temporaires dans `~/.cache/tmp/og5-*` ; un fichier téléchargé est traité en donnée non fiable (dossier neuf, aucun script exécuté depuis ce dossier). Ici : **aucune image téléchargée** (pages et réponses d'API lues seulement).
- Aucun `tauri build`, aucun processus détaché laissé en marche.
- Préparation : `cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3`.

**Interdits.** Aucune licence déduite du site (« tout le site est CC0 » ne suffit pas : la page de l'image doit le
dire) ; aucun fichier image dans le dépôt ; aucun nom de site dans `id`, `label` ou `keywords` ; ne pas toucher
`apps/web/public/` ni `apps/web/src/backgrounds/photos.ts`.

**Terminé quand.** `SOURCES.json` compte 40 à 50 entrées prouvées (ou moins, signalé), `sources.test.ts` passe
(≥ 7 tests), la notice est écrite, commit fait.

**Étapes.**

- [ ] **Étape 1 : écrire `apps/web/src/backgrounds/sources.test.ts` (rouge).**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Source {
  readonly id: string; readonly theme: string; readonly label: string; readonly keywords: readonly string[];
  readonly page: string; readonly fichier: string; readonly auteur: string; readonly licence: string;
  readonly preuve: string; readonly lu_le: string; readonly largeur: number; readonly hauteur: number; readonly retouche: string;
}
const raw = JSON.parse(readFileSync(new URL("../../backgrounds/SOURCES.json", import.meta.url), "utf8")) as { format: string; schema: number; photos: Source[] };
const NOTICE = readFileSync(new URL("../../../../THIRD_PARTY_NOTICES.md", import.meta.url), "utf8");
const THEMES = ["nature", "mer-ciel", "matieres", "saisons", "abstrait"];
const TRACES = ["polyhaven", "poly haven", "wikimedia", "commons", "openverse", "flickr", "unsplash", "pixabay", "pexels", "http", "www."];

describe("personnalisation-1b : sources des photos du pack (Q11 à Q13, Q17)", () => {
  it("format et schéma, 40 à 50 photos, ids uniques en [a-z0-9-]", () => {
    expect([raw.format, raw.schema]).toEqual(["roomboard-background-sources", 1]);
    expect(raw.photos.length).toBeGreaterThanOrEqual(40);
    expect(raw.photos.length).toBeLessThanOrEqual(50);
    const ids = raw.photos.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });
  it("thèmes de la section Images, au moins 6 par thème ; mer et ciel : au moins 6 photos de mer", () => {
    for (const p of raw.photos) expect(THEMES, p.id).toContain(p.theme);
    for (const t of THEMES) expect(raw.photos.filter((p) => p.theme === t).length, t).toBeGreaterThanOrEqual(6);
    const sea = raw.photos.filter((p) => p.theme === "mer-ciel" && p.keywords.some((k) => ["mer", "océan"].includes(k)));
    expect(sea.length).toBeGreaterThanOrEqual(6);
  });
  it("licence CC0-1.0, preuve qui cite CC0, page et fichier en https, auteur, date de lecture", () => {
    for (const p of raw.photos) {
      expect(p.licence, p.id).toBe("CC0-1.0");
      expect(p.preuve, p.id).toMatch(/CC0/);
      expect(p.page, p.id).toMatch(/^https:\/\//);
      expect(p.fichier, p.id).toMatch(/^https:\/\/.+\.(jpe?g|png)$/i);
      expect(p.auteur.trim().length, p.id).toBeGreaterThan(0);
      expect(p.lu_le, p.id).toMatch(/^2026-\d\d-\d\d$/);
    }
  });
  it("aucune source exclue (Unsplash, Pixabay, Pexels)", () => {
    for (const p of raw.photos) for (const u of [p.page, p.fichier]) expect(u, p.id).not.toMatch(/unsplash|pixabay|pexels/i);
  });
  it("original d'au moins 2560 × 1440 (aucun agrandissement)", () => {
    for (const p of raw.photos) {
      expect(p.largeur, p.id).toBeGreaterThanOrEqual(2560);
      expect(p.hauteur, p.id).toBeGreaterThanOrEqual(1440);
    }
  });
  it("libellés et mots-clés français écrits à la main : 5 à 10 mots-clés, aucun nom de site ni adresse", () => {
    for (const p of raw.photos) {
      expect(p.keywords.length, p.id).toBeGreaterThanOrEqual(5);
      expect(p.keywords.length, p.id).toBeLessThanOrEqual(10);
      const text = [p.id, p.label, ...p.keywords].join(" ").toLowerCase();
      for (const t of TRACES) expect(text, `${p.id} : ${t}`).not.toContain(t);
    }
  });
  it("THIRD_PARTY_NOTICES : section du pack CC0 et tracés Lucide nommés", () => {
    expect(NOTICE).toContain("## Pack de fonds (images CC0), personnalisation 1b");
    expect(NOTICE).toContain("apps/web/backgrounds/SOURCES.json");
    for (const n of ["`wallpaper`", "`search`", "`image-plus`"]) expect(NOTICE).toContain(n);
  });
});
```

Commande : `cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/backgrounds/sources.test.ts 2>&1 | tail -10`
Attendu : `FAIL`, `ENOENT` sur `SOURCES.json`.

- [ ] **Étape 2 : chercher et prouver les licences, une photo à la fois.**

Pour chaque thème, chercher des candidats (Poly Haven pour `matieres` ; Wikimedia Commons et Openverse pour `nature`,
`mer-ciel`, `saisons`, `abstrait`), appliquer la méthode ci-dessus et écrire l'entrée dans `SOURCES.json` **seulement
après** la preuve lue. Commandes types (sortie lue, rien d'enregistré) :

```bash
curl -s 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|extmetadata&titles=File:EXEMPLE.jpg' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const p=Object.values(JSON.parse(s).query.pages)[0];const i=p.imageinfo?.[0];console.log(JSON.stringify({url:i?.url,w:i?.width,h:i?.height,licence:i?.extmetadata?.LicenseShortName?.value,auteur:i?.extmetadata?.Artist?.value}))})'
curl -s 'https://api.polyhaven.com/files/EXEMPLE' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(j?.Diffuse?.["4k"]?.jpg?.url ?? "aucun diffus 4k")})'
```

Puis lire la page de l'image (`page`) et recopier la phrase de licence lue dans `preuve`. `lu_le` : `2026-11-27`.

- [ ] **Étape 3 : écrire la notice dans `THIRD_PARTY_NOTICES.md`.**

Dans la section `## Icônes Lucide (ISC), design L1, L2, L3 et L4`, après la puce `menu` / `collapse` (`:532-533`),
ajouter :

```markdown
- Lues dans Lucide au même commit par `gh api` (personnalisation 1b), noms Lucide : `wallpaper` (bouton « Fonds »),
  `search` et `image-plus` (fenêtre des fonds).
```

Avant `## Icône de l'application (design L5)`, ajouter (compléter la ligne « Sources retenues » avec les seules sources
réellement présentes dans `SOURCES.json`) :

```markdown
## Pack de fonds (images CC0), personnalisation 1b

Photos du pack de fonds (`apps/web/public/backgrounds/photos/`, miniatures dans `apps/web/public/backgrounds/thumbs/`) :
toutes sous CC0 1.0 (dédicace au domaine public), aucune obligation d'attribution. La licence de chaque image a été lue
sur sa page source, jamais déduite du site ; page, fichier d'origine, auteur, texte de licence lu et date de lecture de
chacune sont dans `apps/web/backgrounds/SOURCES.json`, hors de l'application construite.

Sources retenues : Poly Haven (polyhaven.com, textures), Wikimedia Commons (fichiers au modèle CC0), Openverse (résultats
CC0 vérifiés sur leur page d'origine).

Retouche : recadrage 16:9 centré, 2560 × 1440, WebP, métadonnées EXIF et XMP retirées ; miniatures 480 × 270.

Fonds dessinés (couleurs, dégradés, lignes et grilles, modèles de cours) : écrits pour RoomBoard
(`apps/web/src/backgrounds/`), aucune source extérieure.
```

- [ ] **Étape 4 : vert.**

Commande : `cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/backgrounds/sources.test.ts 2>&1 | tail -10`
Attendu : `Tests  7 passed (7)`, aucun `FAIL`. Si le nombre prouvé est < 40, le premier test échoue : **ne pas
changer le test** ; arrêter, garder les entrées prouvées, et le rapport le dit (l'orchestrateur décide).

- [ ] **Étape 5 : commit.**

```bash
cd <wt>
for f in apps/web/backgrounds/SOURCES.json apps/web/src/backgrounds/sources.test.ts THIRD_PARTY_NOTICES.md; do git add "$f"; done
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "docs(pack): CC0 photo sources with per-image licence proof, notices" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
rm -rf ~/.cache/tmp/og5-sources-* 2>/dev/null; true
```

**Rapport attendu.** Nombre de photos par thème, sources retenues, photos écartées et pourquoi (une ligne chacune),
sortie `tail` de l'étape 4, ligne `Réutilisation : …`, sha du commit.

---

<a id="tache-t5"></a>
### Tâche T5 — « Mes fonds » : racine de bibliothèque, module, portée de la coque

**Objectif.** « Mes fonds » vit sur l'appareil, jamais dans le document : troisième racine `backgrounds` de la
bibliothèque (IndexedDB, même base `roomboard-bibliotheque`, clés `backgrounds/<chemin>` ; coque :
`Documents/RoomBoard/Fonds`). Un module neuf tient l'index : une entrée = compagnon `<nom>.json` + image `<nom>.<ext>`
(octets gardés tels quels) + miniature `<nom>.thumb.png`. Le type `BackgroundSource`, partagé par l'application et la
CLI, est posé ici. Cadrage : Q18, Q19, Q22, Q36, DA4 ; scénario S3.

**Fichiers.**
- Créer : `apps/web/src/backgrounds/source.ts`, `apps/web/src/app/my-backgrounds.ts`
- Modifier : `apps/web/src/platform/library-files.ts` (`:10`), `apps/web/src/app/library.ts` (`:76`),
  `apps/desktop/src-tauri/capabilities/default.json` (`:4`, `:20`), `crates/roomboard-shell/src/lib.rs` (test `:401-447`)
- Tester : `apps/web/src/app/my-backgrounds.test.ts` ; à garder verts : `apps/web/src/platform/library-files.test.ts`,
  `apps/web/src/app/library.test.ts`, `apps/web/src/ui/LibraryPanel.test.tsx`

**Interfaces.**
- Consomme : `LibraryFiles`, `createMemoryLibraryFiles`, `createIdbLibraryFiles` (`platform/library-files.ts`) ;
  `fileNameOf` (`app/library.ts:94`) ; `sniffImage`, `probeSize`, `IMAGE_MIME`, `HEAD_BYTES`, `MAX_PIXELS`,
  `TOO_MANY_PIXELS` (`platform/image-import.ts`) ; `GridInput` (`core/api.ts`).
- Produit (`backgrounds/source.ts`) :
  `interface BackgroundImage { readonly blob: Blob; readonly name: string; readonly mime: string; readonly w: number; readonly h: number }` ;
  `interface BackgroundSource { readonly color: string; readonly grid: GridInput | null; readonly image: BackgroundImage | null }`.
- Produit (`app/my-backgrounds.ts`) :
  `const BACKGROUND_FORMAT = "roomboard-background"` ; `const BACKGROUND_SCHEMA = 1` ;
  `const NOT_AN_IMAGE_MESSAGE = "seules les images deviennent des fonds"` ;
  `type BackgroundOrigin = "image" | "page" | "grid"` ;
  `interface MyBackgroundImage { readonly file: string; readonly mime: string; readonly w: number; readonly h: number }` ;
  `interface MyBackground { readonly file: string; readonly name: string; readonly created: string; readonly origin: BackgroundOrigin; readonly color: string; readonly grid: GridInput | null; readonly image: MyBackgroundImage | null }` (`file` = chemin du compagnon, la clé) ;
  `interface ProbedImage { readonly mime: string; readonly w: number; readonly h: number }` ;
  `interface MyBackgroundsDeps { now(): string; probe(blob: Blob, name: string): Promise<ProbedImage | null>; thumbnail(src: BackgroundSource): Promise<Blob | null> }` ;
  `interface MyBackgrounds { list(): Promise<readonly MyBackground[]>; addImage(blob: Blob, name: string): Promise<MyBackground>; addSource(src: BackgroundSource, name: string, origin: BackgroundOrigin): Promise<MyBackground>; read(entry: MyBackground): Promise<BackgroundSource>; thumbnail(entry: MyBackground): Promise<Blob | null>; remove(entry: MyBackground): Promise<void>; onChange(listener: () => void): () => void }` ;
  `function createMyBackgrounds(files: LibraryFiles, deps: MyBackgroundsDeps): MyBackgrounds` ;
  `function probeImage(blob: Blob, name: string): Promise<ProbedImage | null>` ;
  `function stampOf(d: Date): string` (« JJ/MM HH:MM », heure locale).
- `list()` : le plus récent d'abord (`created` décroissant), compagnons illisibles ou d'un autre format ignorés.
  `addImage` lève `NOT_AN_IMAGE_MESSAGE` (pas une image) ou `TOO_MANY_PIXELS` (> 100 Mpx) sans rien écrire.
- `LibraryRoot` devient `"mine" | "shared" | "backgrounds"` ; `ROOT_LABELS.backgrounds = "Mes fonds"`.
- Réutilise : `apps/web/src/platform/library-files.ts:10`, `:61`, `:120`, `:193` — étendre : `LibraryRoot` + `"backgrounds"` ; `createIdbLibraryFiles(indexedDB, "backgrounds")`, `createTauriLibraryFiles(fs, "<Documents>/RoomBoard/Fonds", "backgrounds")`, `createMemoryLibraryFiles("backgrounds")` (fabriques appelées sans changement ; le câblage de `main.ts` est fait par T10).
- Réutilise : `apps/web/src/app/library.ts:94` — `fileNameOf(name)` (aucun troisième slug, constat `library.ts:76`).
- Réutilise : `apps/web/src/platform/image-import.ts:52`, `:102`, `:137` — `sniffImage(head, name)`, `probeSize(blob, kind)` (`decodeImage(blob, kind, max)` n'est pas appelé : la taille de l'en-tête suffit, octets gardés tels quels, Q22).
- Réutilise : aucun module existant pour l'index de « Mes fonds » (termes cherchés : `ResourceLibrary`, `.rbitem`, `PackItemKind` : modèle de fragments, inadapté, Q18) — nouveau module `apps/web/src/app/my-backgrounds.ts` : `createMyBackgrounds(files: LibraryFiles, deps: { now(): string; probe(blob: Blob, name: string): Promise<{ mime: string; w: number; h: number } | null>; thumbnail(src: BackgroundSource): Promise<Blob | null> }): MyBackgrounds` avec `list()`, `addImage(blob, name)`, `addSource(src, name, origin)`, `read(entry): Promise<BackgroundSource>`, `thumbnail(entry)`, `remove(entry)` (DA4).
- Le rapport porte, pour chacune de ces lignes, `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Patron à ne pas reprendre (concepteur-critique).** `ResourceLibrary` et le paquet `.rbitem` de C4
(`apps/web/src/app/library.ts:56-75`, `createResourceLibrary`) : un fond n'est pas un fragment de document, U8 n'a pas
de `kind` fond et C4 l'a laissé hors périmètre (`docs/plans/usage-c4-bibliotheque-cadrage.md:306-307`). Ne pas écrire non
plus un troisième « slug » de nom de fichier (constat ouvert `library.ts:76`) : `fileNameOf` seul. Chemin de référence :
`apps/web/src/platform/library-files.ts:120-129` (une racine = un préfixe de clé `${root}/${path}`, même base, aucune
migration) et le patron du compagnon JSON de C4 (coffre 0263) : clés connues lues avec tolérance, fichier jamais réécrit
à la lecture (clés inconnues gardées).

**Contraintes (recopiées de Global Constraints).**
- VM partagée : builds et tests en `nice -n 10`, `cargo … -j 4`, `CARGO_TARGET_DIR=<worktree de la tâche>/target` (piège : cible partagée entre worktrees) ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; test isolé direct.
- Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`, `.`, `commit -a`) ; jamais `--force`.
- Aucun test désactivé, sauté, ni seuil modifié. Essais Playwright existants (sélecteurs `data-item`) restent verts sans réécriture.
- Aucune dépendance ajoutée sauf permissive et justifiée ; aucune AGPL/GPL/LGPL.
- L'interface ne nomme aucun service extérieur.
- Aucun `tauri build`, aucun processus détaché laissé en marche.
- Préparation : `cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3`, puis `cd <wt> && for d in wasm wasm-formats; do [ -d apps/web/src/$d ] || cp -r /home/adminjd/projets/roomboard-wt/personnalisation-1b/apps/web/src/$d apps/web/src/; done`.

**Interdits.** Aucun changement de version de la base IndexedDB (reste 2) ; ne pas modifier `clearable` ; ne pas
toucher `LibraryPanel.tsx` ni `createResourceLibrary` ; rien de « Mes fonds » dans le document ; une seule entrée
`fs:scope` (le test Rust l'exige).

**Terminé quand.** `my-backgrounds.test.ts` passe (≥ 12 tests) ; `library-files.test.ts`, `library.test.ts`,
`LibraryPanel.test.tsx` verts ; `capabilities_grant_library_folder_only` vert avec la portée neuve ; `tsc` du web et de la
CLI propres ; commit fait.

**Étapes.**

- [ ] **Étape 1 : écrire `apps/web/src/app/my-backgrounds.test.ts` (rouge).**

```ts
import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import type { GridInput } from "../core/api";
import type { BackgroundSource } from "../backgrounds/source";
import { createIdbLibraryFiles, createMemoryLibraryFiles } from "../platform/library-files";
import { TOO_MANY_PIXELS } from "../platform/image-import";
import { ROOT_LABELS } from "./library";
import { createMyBackgrounds, NOT_AN_IMAGE_MESSAGE, probeImage, stampOf, type ProbedImage } from "./my-backgrounds";

const DOTS: GridInput = { visible: true, snap: false, above: false, levels: [{ kind: "dots", spacingX: 37.8, spacingY: 37.8, originX: 0, originY: 0, color: "#94a3b8", line: "solid", lineWidth: 1, snap: true, visible: true }] };
const pngHead = (w: number, h: number): Uint8Array => {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, w);
  new DataView(b.buffer).setUint32(20, h);
  return b;
};
function setup(probe: (b: Blob, n: string) => Promise<ProbedImage | null> = async () => ({ mime: "image/png", w: 64, h: 36 })) {
  const files = createMemoryLibraryFiles("backgrounds");
  let t = 0;
  const thumbnail = vi.fn(async (_src: BackgroundSource) => new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }));
  const mine = createMyBackgrounds(files, { now: () => `2026-11-27T10:00:0${t++}.000Z`, probe, thumbnail });
  return { files, mine, thumbnail };
}
const paths = async (files: ReturnType<typeof createMemoryLibraryFiles>) => (await files.list()).filter((p) => !p.dir).map((p) => p.path).sort();

describe("personnalisation-1b : Mes fonds (Q18, Q19, Q22, DA4)", () => {
  it("racine backgrounds : libellé « Mes fonds »", () => {
    expect(ROOT_LABELS.backgrounds).toBe("Mes fonds");
  });

  it("addImage : compagnon, octets gardés tels quels, miniature ; list le relit", async () => {
    const { files, mine, thumbnail } = setup();
    const bytes = new Uint8Array([9, 8, 7, 6]);
    const e = await mine.addImage(new Blob([bytes]), "Ma photo");
    expect(e).toMatchObject({ file: "ma-photo.json", name: "Ma photo", origin: "image", color: "#ffffff", grid: null, image: { file: "ma-photo.png", mime: "image/png", w: 64, h: 36 } });
    expect(await paths(files)).toEqual(["ma-photo.json", "ma-photo.png", "ma-photo.thumb.png"]);
    expect(new Uint8Array(await (await files.read("ma-photo.png")).arrayBuffer())).toEqual(bytes);
    expect(JSON.parse(await (await files.read("ma-photo.json")).text())).toMatchObject({ format: "roomboard-background", schema: 1, name: "Ma photo", origin: "image" });
    expect(thumbnail).toHaveBeenCalledTimes(1);
    expect(await mine.list()).toEqual([e]);
  });

  it("addSource « page » puis « grille » : la plus récente d'abord ; grille sans image", async () => {
    const { mine } = setup();
    const page = await mine.addSource({ color: "#ffffff", grid: null, image: { blob: new Blob([new Uint8Array([1])]), name: "p.png", mime: "image/png", w: 3840, h: 2160 } }, "Page 1 — 27/11 10:00", "page");
    const grid = await mine.addSource({ color: "#fbf7ec", grid: DOTS, image: null }, "Grille Points — 27/11 10:01", "grid");
    expect((await mine.list()).map((e) => e.file)).toEqual([grid.file, page.file]);
    expect(grid).toMatchObject({ origin: "grid", grid: DOTS, image: null, color: "#fbf7ec" });
    expect(page.file).toBe("page-1-27-11-10-00.json");
  });

  it("même nom : suffixes -2, -3", async () => {
    const { mine } = setup();
    const a = await mine.addSource({ color: "#ffffff", grid: DOTS, image: null }, "Grille", "grid");
    const b = await mine.addSource({ color: "#ffffff", grid: DOTS, image: null }, "Grille", "grid");
    const c = await mine.addSource({ color: "#ffffff", grid: DOTS, image: null }, "Grille", "grid");
    expect([a.file, b.file, c.file]).toEqual(["grille.json", "grille-2.json", "grille-3.json"]);
  });

  it("Review Focus — compagnon illisible ou d'un autre format : ignoré, les autres listés", async () => {
    const { files, mine } = setup();
    const ok = await mine.addSource({ color: "#ffffff", grid: DOTS, image: null }, "Bon", "grid");
    await files.write("casse.json", new Blob(["{ pas du json"]));
    await files.write("autre.json", new Blob([JSON.stringify({ format: "roomboard-item", schema: 1, name: "x" })]));
    await files.write("sans-image.json", new Blob([JSON.stringify({ format: "roomboard-background", schema: 1, name: "x", created: "2026", origin: "image", color: "#fff" })]));
    expect((await mine.list()).map((e) => e.file)).toEqual([ok.file]);
  });

  it("Review Focus — image de plus de 100 Mpx : refusée, rien n'est écrit", async () => {
    const { files, mine } = setup(async () => ({ mime: "image/png", w: 20000, h: 6000 }));
    await expect(mine.addImage(new Blob([new Uint8Array([1])]), "géante")).rejects.toThrow(TOO_MANY_PIXELS);
    expect(await paths(files)).toEqual([]);
  });

  it("fichier qui n'est pas une image : NOT_AN_IMAGE_MESSAGE, rien n'est écrit", async () => {
    const { files, mine } = setup(async () => null);
    await expect(mine.addImage(new Blob(["texte"]), "notes")).rejects.toThrow(NOT_AN_IMAGE_MESSAGE);
    expect(NOT_AN_IMAGE_MESSAGE).toBe("seules les images deviennent des fonds");
    expect(await paths(files)).toEqual([]);
  });

  it("read rend la source ; thumbnail la miniature ; remove retire compagnon, image et miniature", async () => {
    const { files, mine } = setup();
    const e = await mine.addImage(new Blob([new Uint8Array([4, 5])]), "Fond");
    const src = await mine.read(e);
    expect(src).toMatchObject({ color: "#ffffff", grid: null, image: { mime: "image/png", w: 64, h: 36, name: "fond.png" } });
    expect(new Uint8Array(await src.image!.blob.arrayBuffer())).toEqual(new Uint8Array([4, 5]));
    expect((await mine.thumbnail(e))?.size).toBe(3);
    const changed = vi.fn();
    mine.onChange(changed);
    await mine.remove(e);
    expect(await paths(files)).toEqual([]);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(await mine.thumbnail(e)).toBeNull();
  });

  it("clés inconnues du compagnon : gardées (aucune réécriture à la lecture)", async () => {
    const { files, mine } = setup();
    const text = JSON.stringify({ format: "roomboard-background", schema: 1, name: "Futur", created: "2026-11-27T09:00:00.000Z", origin: "grid", color: "#ffffff", grid: DOTS, image: null, motsCles: ["plus tard"] });
    await files.write("futur.json", new Blob([text]));
    expect((await mine.list())[0]?.name).toBe("Futur");
    expect(await (await files.read("futur.json")).text()).toBe(text);
  });

  it("probeImage : PNG lu dans l'en-tête ; texte : null", async () => {
    expect(await probeImage(new Blob([pngHead(640, 360) as BlobPart]), "a.png")).toEqual({ mime: "image/png", w: 640, h: 360 });
    expect(await probeImage(new Blob(["bonjour"]), "a.txt")).toBeNull();
  });

  it("stampOf : JJ/MM HH:MM", () => {
    expect(stampOf(new Date(2026, 10, 27, 9, 5))).toBe("27/11 09:05");
  });

  it("IndexedDB : même base, clés backgrounds/<chemin>, invisibles depuis « Mes ressources »", async () => {
    const name = `essai-fonds-${Math.random()}`;
    const fonds = createIdbLibraryFiles(indexedDB, "backgrounds", name, async () => true);
    const ressources = createIdbLibraryFiles(indexedDB, "mine", name, async () => true);
    await createMyBackgrounds(fonds, { now: () => "2026-11-27T10:00:00.000Z", probe: async () => null, thumbnail: async () => null }).addSource({ color: "#ffffff", grid: DOTS, image: null }, "Grille", "grid");
    expect((await fonds.list()).map((p) => p.path)).toEqual(["grille.json"]);
    expect(await ressources.list()).toEqual([]);
  });
});
```

Commande : `cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/app/my-backgrounds.test.ts 2>&1 | tail -10`
Attendu : `FAIL`, « Failed to resolve import "./my-backgrounds" ».

- [ ] **Étape 2 : racine et libellé.**

`apps/web/src/platform/library-files.ts:10` : `export type LibraryRoot = "mine" | "shared" | "backgrounds";`
`apps/web/src/app/library.ts:76` :
`export const ROOT_LABELS: Readonly<Record<LibraryRoot, string>> = Object.freeze({ mine: "Mes ressources", shared: "Ressources partagées", backgrounds: "Mes fonds" });`

Puis vérifier qu'aucun autre code ne détaille `LibraryRoot` de façon exhaustive :
`cd <wt> && grep -rn "LibraryRoot" apps/web/src apps/cli/src --include=*.ts --include=*.tsx | grep -v "\.test\." ` ; toute
table `Record<LibraryRoot, …>` reçoit sa clé `backgrounds` (la seule connue à `45484db` est `ROOT_LABELS`).

- [ ] **Étape 3 : écrire `apps/web/src/backgrounds/source.ts`.**

```ts
/**
 * Source d'un fond (personnalisation-1b, Q1, Q31) : l'aspect complet d'une page, prêt à appliquer : couleur de page,
 * grille ou aucune, image ou aucune (octets, type, taille source). Rendue par le pack (`resolvePack`) et par « Mes
 * fonds » (`MyBackgrounds.read`), consommée par `backgroundCommand` (interface et CLI).
 */
import type { GridInput } from "../core/api";

export interface BackgroundImage {
  readonly blob: Blob;
  /** Nom de l'asset dans le document (`AssetRef.name`). */
  readonly name: string;
  readonly mime: string;
  /** Taille source en pixels ; l'image est calée sur la largeur de la page (`fit: "width"`). */
  readonly w: number;
  readonly h: number;
}
export interface BackgroundSource {
  readonly color: string;
  readonly grid: GridInput | null;
  readonly image: BackgroundImage | null;
}
```

- [ ] **Étape 4 : écrire `apps/web/src/app/my-backgrounds.ts`.**

```ts
/**
 * « Mes fonds » (personnalisation-1b, Q18, Q19, Q22, Q36, DA4) : fonds de l'utilisateur rangés sur l'appareil, troisième
 * racine de la bibliothèque (`LibraryRoot` « backgrounds » : IndexedDB sur le web, `Documents/RoomBoard/Fonds` dans la
 * coque), jamais dans le document. Une entrée : compagnon `<nom>.json` (`format: "roomboard-background"`, `schema: 1`),
 * image `<nom>.<ext>` (octets gardés tels quels), miniature `<nom>.thumb.png`. Pas `ResourceLibrary` (C4) : un fond n'est
 * pas un `.rbitem`. Lecture tolérante : un compagnon illisible est ignoré ; un compagnon n'est jamais réécrit à la
 * lecture (clés inconnues gardées).
 */
import type { GridInput } from "../core/api";
import type { BackgroundSource } from "../backgrounds/source";
import { HEAD_BYTES, IMAGE_MIME, MAX_PIXELS, probeSize, sniffImage, TOO_MANY_PIXELS } from "../platform/image-import";
import type { LibraryFiles } from "../platform/library-files";
import { fileNameOf } from "./library";

export const BACKGROUND_FORMAT = "roomboard-background";
export const BACKGROUND_SCHEMA = 1;
export const NOT_AN_IMAGE_MESSAGE = "seules les images deviennent des fonds";

export type BackgroundOrigin = "image" | "page" | "grid";
export interface MyBackgroundImage {
  readonly file: string;
  readonly mime: string;
  readonly w: number;
  readonly h: number;
}
export interface MyBackground {
  /** Chemin du compagnon dans la racine (`<nom>.json`) : la clé de l'entrée. */
  readonly file: string;
  readonly name: string;
  readonly created: string;
  readonly origin: BackgroundOrigin;
  readonly color: string;
  readonly grid: GridInput | null;
  readonly image: MyBackgroundImage | null;
}
export interface ProbedImage {
  readonly mime: string;
  readonly w: number;
  readonly h: number;
}
export interface MyBackgroundsDeps {
  now(): string;
  probe(blob: Blob, name: string): Promise<ProbedImage | null>;
  thumbnail(src: BackgroundSource): Promise<Blob | null>;
}
export interface MyBackgrounds {
  list(): Promise<readonly MyBackground[]>;
  addImage(blob: Blob, name: string): Promise<MyBackground>;
  addSource(src: BackgroundSource, name: string, origin: BackgroundOrigin): Promise<MyBackground>;
  read(entry: MyBackground): Promise<BackgroundSource>;
  thumbnail(entry: MyBackground): Promise<Blob | null>;
  remove(entry: MyBackground): Promise<void>;
  onChange(listener: () => void): () => void;
}

const JSON_EXT = ".json";
const THUMB_EXT = ".thumb.png";
const ORIGINS: readonly string[] = ["image", "page", "grid"];
const EXT: Readonly<Record<string, string>> = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg",
  "image/bmp": "bmp", "image/avif": "avif", "image/heic": "heic", "image/x-icon": "ico", "image/vnd.microsoft.icon": "ico",
};
const baseOf = (file: string): string => file.slice(0, -JSON_EXT.length);

export function stampOf(d: Date): string {
  const p = (v: number): string => String(v).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Type et taille d'une image d'après son en-tête (Q22) ; null : pas une image lisible. */
export async function probeImage(blob: Blob, name: string): Promise<ProbedImage | null> {
  const head = new Uint8Array(await blob.slice(0, HEAD_BYTES).arrayBuffer());
  const kind = sniffImage(head, name);
  if (kind === null) return null;
  const size = await probeSize(blob, kind);
  return size === null ? null : { mime: IMAGE_MIME[kind], w: size.w, h: size.h };
}

function parse(file: string, text: string): MyBackground | null {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof v !== "object" || v === null || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (o["format"] !== BACKGROUND_FORMAT || o["schema"] !== BACKGROUND_SCHEMA) return null;
  const { name, created, origin, color, image, grid } = o;
  if (typeof name !== "string" || typeof created !== "string" || typeof color !== "string") return null;
  if (typeof origin !== "string" || !ORIGINS.includes(origin)) return null;
  if (image === undefined) return null;
  let im: MyBackgroundImage | null = null;
  if (image !== null) {
    if (typeof image !== "object") return null;
    const r = image as Record<string, unknown>;
    if (typeof r["file"] !== "string" || typeof r["mime"] !== "string" || typeof r["w"] !== "number" || typeof r["h"] !== "number") return null;
    im = { file: r["file"], mime: r["mime"], w: r["w"], h: r["h"] };
  }
  return { file, name, created, origin: origin as BackgroundOrigin, color, grid: (grid ?? null) as GridInput | null, image: im };
}

export function createMyBackgrounds(files: LibraryFiles, deps: MyBackgroundsDeps): MyBackgrounds {
  const listeners = new Set<() => void>();
  const changed = (): void => {
    for (const l of listeners) l();
  };
  async function freeBase(name: string): Promise<string> {
    const taken = new Set((await files.list()).map((p) => p.path));
    const base = fileNameOf(name);
    for (let i = 1; ; i++) {
      const b = i === 1 ? base : `${base}-${i}`;
      if (!taken.has(`${b}${JSON_EXT}`)) return b;
    }
  }
  async function store(src: BackgroundSource, name: string, origin: BackgroundOrigin): Promise<MyBackground> {
    const base = await freeBase(name);
    const image: MyBackgroundImage | null =
      src.image === null ? null : { file: `${base}.${EXT[src.image.mime] ?? "img"}`, mime: src.image.mime, w: src.image.w, h: src.image.h };
    if (src.image !== null && image !== null) await files.write(image.file, src.image.blob);
    const thumb = await deps.thumbnail(src);
    if (thumb !== null) await files.write(`${base}${THUMB_EXT}`, thumb);
    const entry: MyBackground = { file: `${base}${JSON_EXT}`, name, created: deps.now(), origin, color: src.color, grid: src.grid, image };
    const json = { format: BACKGROUND_FORMAT, schema: BACKGROUND_SCHEMA, name, created: entry.created, origin, color: entry.color, grid: entry.grid, image };
    await files.write(entry.file, new Blob([JSON.stringify(json, null, 2)], { type: "application/json" }));
    changed();
    return entry;
  }
  return {
    async list() {
      const out: MyBackground[] = [];
      for (const p of await files.list()) {
        if (p.dir || !p.path.endsWith(JSON_EXT) || p.path.includes("/")) continue;
        try {
          const e = parse(p.path, await (await files.read(p.path)).text());
          if (e !== null) out.push(e);
        } catch {
          // Entrée illisible (stockage) : ignorée, les autres restent listées.
        }
      }
      return out.sort((a, b) => (a.created === b.created ? a.file.localeCompare(b.file) : a.created < b.created ? 1 : -1));
    },
    async addImage(blob, name) {
      const probed = await deps.probe(blob, name);
      if (probed === null) throw new Error(NOT_AN_IMAGE_MESSAGE);
      if (probed.w * probed.h > MAX_PIXELS) throw new Error(TOO_MANY_PIXELS);
      return store({ color: "#ffffff", grid: null, image: { blob, name, mime: probed.mime, w: probed.w, h: probed.h } }, name, "image");
    },
    addSource: (src, name, origin) => store(src, name, origin),
    async read(entry) {
      const im = entry.image;
      return {
        color: entry.color,
        grid: entry.grid,
        image: im === null ? null : { blob: await files.read(im.file), name: im.file, mime: im.mime, w: im.w, h: im.h },
      };
    },
    async thumbnail(entry) {
      try {
        return await files.read(`${baseOf(entry.file)}${THUMB_EXT}`);
      } catch {
        return null;
      }
    },
    async remove(entry) {
      for (const p of [entry.file, `${baseOf(entry.file)}${THUMB_EXT}`, ...(entry.image === null ? [] : [entry.image.file])]) {
        try {
          await files.remove(p);
        } catch {
          // Déjà absent : rien à retirer.
        }
      }
      changed();
    },
    onChange(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
```

- [ ] **Étape 5 : vert, puis non-régression de la bibliothèque.**

Commandes (dans `<wt>/apps/web`) :
`nice -n 10 pnpm exec vitest run src/app/my-backgrounds.test.ts 2>&1 | tail -10`
Attendu : `Tests  12 passed (12)`, aucun `FAIL`, noms « Review Focus — compagnon illisible » et « Review Focus — image de
plus de 100 Mpx » présents. Si `memory.list()` rend les chemins avec un autre ordre, l'assertion trie déjà.
`nice -n 10 pnpm exec vitest run src/platform/library-files.test.ts src/app/library.test.ts src/ui/LibraryPanel.test.tsx 2>&1 | tail -8`
Attendu : `Test Files  3 passed (3)`, aucun `FAIL`.
`nice -n 10 pnpm exec tsc --noEmit 2>&1 | tail -5` et `cd <wt> && nice -n 10 pnpm --filter @roomboard/cli exec tsc --noEmit 2>&1 | tail -5` → aucune ligne `error TS`.

- [ ] **Étape 6 : portée de la coque et son test (rouge puis vert).**

Dans `crates/roomboard-shell/src/lib.rs`, test `capabilities_grant_library_folder_only`, remplacer l'attendu de `allow` :

```rust
        assert_eq!(
            allow,
            vec![
                "$DOCUMENT/RoomBoard/Ressources",
                "$DOCUMENT/RoomBoard/Ressources/**",
                "$DOCUMENT/RoomBoard/Fonds",
                "$DOCUMENT/RoomBoard/Fonds/**"
            ]
        );
```

Commande : `cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH CARGO_TARGET_DIR=<wt>/target && nice -n 10 cargo test -p roomboard-shell -j 4 capabilities_grant_library_folder_only 2>&1 | tail -8`
Attendu : `FAILED` (portée absente).

Dans `apps/desktop/src-tauri/capabilities/default.json` : l'objet `fs:scope` devient
`"allow": [{ "path": "$DOCUMENT/RoomBoard/Ressources" }, { "path": "$DOCUMENT/RoomBoard/Ressources/**" }, { "path": "$DOCUMENT/RoomBoard/Fonds" }, { "path": "$DOCUMENT/RoomBoard/Fonds/**" }]`
et, dans `description`, après la phrase « Bibliothèque (C4) : … pour la session). », insérer :
`Mes fonds (personnalisation 1b) : lecture, écriture, création et suppression sous Documents/RoomBoard/Fonds.`

Commande : la même → `test result: ok. 1 passed`.

- [ ] **Étape 7 : commit.**

```bash
cd <wt>
for f in apps/web/src/platform/library-files.ts apps/web/src/app/library.ts apps/web/src/backgrounds/source.ts apps/web/src/app/my-backgrounds.ts apps/web/src/app/my-backgrounds.test.ts apps/desktop/src-tauri/capabilities/default.json crates/roomboard-shell/src/lib.rs; do git add "$f"; done
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(web): My backgrounds as a third device library root, shell scope Documents/RoomBoard/Fonds" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport attendu.** Sorties `tail` des étapes 5 et 6, lignes `Réutilisation : …`, sha du commit.

---

<a id="tache-t6"></a>
### Tâche T6 — Bouton « Fonds » : action, profils fournis, icônes

**Objectif.** L'action `backgrounds` (libellé « Fonds », icône Lucide `wallpaper`) bascule le panneau `backgrounds`. Elle
entre dans la barre `outils` des trois profils fournis : `defaut` et `annotation`, groupe neuf `page` (`sep-fonds`, puis
l'action) entre `edition` et `bureau` ; `simple`, en fin du groupe `vue` avant « Annotation du bureau ». Les icônes
`search` et `image-plus` de la fenêtre (T9) sont posées ici. La fenêtre elle-même est montée par T10 ; ici, le type
`Panel` d'`App.tsx` reçoit seulement la valeur `"backgrounds"` (sans quoi `tsc` casse). Cadrage : Q23, Q24 ; scénario S1.

**Fichiers.**
- Modifier : `apps/web/src/toolbar.ts` (`ACTION_TABLE`, `:99-140`), `apps/web/src/app/toolbar-host.ts` (`:42`,
  `:94-95`), `apps/web/src/toolbar-profiles.ts` (`:144-153`, `:177-190`), `apps/web/src/ui/icons.ts` (`ICONS`,
  `ACTION_ICONS`), `apps/web/src/ui/App.tsx` (`type Panel`, `:79`)
- Tester : `apps/web/src/toolbar-profiles.test.ts` (`:233`, `:244`), `apps/web/src/ui/icons.test.ts` (`:51-55`,
  `:72-78`), `apps/web/src/app/toolbar-host.test.ts`

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit : `ACTION_TABLE.backgrounds = { label: "Fonds" }` ; `HostTargets.toggle(panel: "settings" | "profiles" | "grid" | "image" | "library" | "backgrounds"): void` ;
  action `backgrounds: (t) => t.toggle("backgrounds")` ; `ACTION_ICONS.backgrounds = "wallpaper"` ;
  `ICONS.wallpaper`, `ICONS.search`, `ICONS["image-plus"]` (tracés Lucide `7981a0798a`) ; séparateur `sep-fonds` et groupe
  `page` dans `defaut` / `annotation` ; bouton `button[data-item="backgrounds"]` dans la barre `outils` des trois profils
  (sélecteur de T10 et de l'essai T12) ; `type Panel = … | "backgrounds"` dans `App.tsx`.
- Réutilise : `apps/web/src/app/toolbar-host.ts:42`, `:94-95` — étendre : `toggle("backgrounds")` ; et `apps/web/src/ui/App.tsx:79` — `Panel` + `"backgrounds"` (le montage de la fenêtre est T10).
- Réutilise : `apps/web/src/ui/icons.ts:14`, `:112` — étendre : `ICONS.wallpaper`, `ICONS.search`, `ICONS["image-plus"]`, `ACTION_ICONS.backgrounds`.
- Le rapport porte, pour chacune de ces lignes, `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Contraintes (recopiées de Global Constraints).**
- VM partagée : builds et tests en `nice -n 10`, `cargo … -j 4`, `CARGO_TARGET_DIR=<worktree de la tâche>/target` (piège : cible partagée entre worktrees) ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; test isolé direct.
- Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`, `.`, `commit -a`) ; jamais `--force`.
- Aucun test désactivé, sauté, ni seuil modifié. Essais Playwright existants (sélecteurs `data-item`) restent verts sans réécriture. Les listes figées de `toolbar-profiles.test.ts:233` et `:244` et les inventaires d'`icons.test.ts` (nombre d'icônes, nombre d'actions) changent parce que la demande change ces listes : c'est la seule réécriture de test assumée (cadrage § 3, effets de bord).
- Aucune dépendance ajoutée sauf permissive et justifiée ; aucune AGPL/GPL/LGPL. Icônes Lucide (ISC) recopiées avec mention (la mention dans `THIRD_PARTY_NOTICES.md` est écrite par T4, même vague : ne pas toucher ce fichier ici).
- Tactile d'abord (cibles ≥ 44 px, glisser aux événements de pointeur ; seul le dépôt de fichiers système passe par drop), clavier ensuite (raccourci par geste). Design : `docs/plans/design-cadrage.md` § 10 netteté (tracés recopiés tels quels, calage `ICON_VIEWBOX` existant).
- L'interface ne nomme aucun service extérieur.
- Aucun `tauri build`, aucun processus détaché laissé en marche.
- Préparation : `cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3`, puis `cd <wt> && for d in wasm wasm-formats; do [ -d apps/web/src/$d ] || cp -r /home/adminjd/projets/roomboard-wt/personnalisation-1b/apps/web/src/$d apps/web/src/; done`.

**Interdits.** Jamais `sep-7` (que le chantier 1a pourrait prendre) ; ne pas toucher `rb.css`, `Toolbar.tsx`,
`Island.tsx`, `layout.ts`, `PagesBar.tsx` ; ne pas toucher `THIRD_PARTY_NOTICES.md` (T4) ; aucune capacité exigée
(`ACTION_REQUIRES` inchangé) ; aucun état pressé (`item-state.ts` inchangé).

**Terminé quand.** Les trois fichiers de test ciblés passent, la suite web complète passe, `tsc` propre, commit fait.

**Étapes.**

- [ ] **Étape 1 : mettre à jour les tests (rouges).**

`apps/web/src/toolbar-profiles.test.ts`, dans `describe("design-l2 : profils fournis en îlots …")` :

```ts
  it("design-l2 L2-4, personnalisation-1b Q23 : outils de defaut et annotation : Sélection, Main | Stylo, Gomme, Gomme : partielle | formes, Texte, Tableau, Pot | Fonds | Annotation du bureau", () => {
    for (const id of ["defaut", "annotation"]) {
      expect(flat(id, "outils"), id).toEqual(["select", "hand", "sep-1", "pen", "eraser", "eraser-mode", "sep-2", "rect", "ellipse", "line", "arrow", "text", "table", "fill", "sep-fonds", "backgrounds", "sep-3", "desktop-annotation"]);
      expect(builtinProfile(id)!.toolbars[0]!.groups.map((g) => g.id), id).toEqual(["navigation", "dessin", "edition", "page", "bureau"]);
      expect(visibleItems(builtinProfile(id)!.toolbars[0]!, ALL)[0]!.id, id).toBe("select");
    }
  });
```

(remplace le test « design-l2 L2-4 : outils de defaut et annotation … » de `:231-236`), et dans le test « simple » (`:243-246`) :

```ts
    expect(flat("simple", "outils")).toEqual(["pen", "eraser", "hand", "sep-1", "undo", "redo", "sep-2", "fit-page", "profiles", "settings", "backgrounds", "desktop-annotation"]);
```

`apps/web/src/app/toolbar-host.test.ts`, à côté du test « C4 : library bascule le panneau « library » » :

```ts
  it("personnalisation-1b : backgrounds bascule le panneau « backgrounds »", () => {
    const { host, t } = setup();
    host.runAction("backgrounds");
    expect(vi.mocked(t.toggle).mock.calls.map((c) => c[0])).toEqual(["backgrounds"]);
  });
```

`apps/web/src/ui/icons.test.ts` : déclarer `const DIALOG_ICONS = ["search", "image-plus"];` après `ISLAND_ICONS`, puis :

```ts
  it("ICONS : 64 icônes, exactement celles qu'attribuent les tables, les états, la zone de dépôt, le bandeau, le panneau des profils, les îlots et la fenêtre des fonds", () => {
    const used = new Set([...Object.values(TOOL_ICONS), ...Object.values(ACTION_ICONS), "pen-line", "reset", "check", "drop", ...Object.keys(PANEL_ICONS), ...Object.keys(ISLAND_ICONS), ...DIALOG_ICONS]);
    expect(Object.keys(ICONS).sort()).toEqual([...used].sort());
    expect(Object.keys(ICONS)).toHaveLength(64);
  });
```

(remplace le test « ICONS : 61 icônes … »), le test « chaque outil et chaque action connus ont une icône de la table
(11 + 37) » devient « (11 + 38) » avec `expect(Object.keys(ACTION_ICONS)).toHaveLength(38);`, et ajouter :

```ts
  it("personnalisation-1b : wallpaper, search et image-plus recopiés de Lucide (7981a0798a), Fonds → wallpaper", () => {
    expect(ICONS["wallpaper"]).toEqual([["path", { d: "M12 17v4" }], ["path", { d: "M8 21h8" }], ["path", { d: "m9 17 6.1-6.1a2 2 0 0 1 2.81.01L22 15" }], ["circle", { cx: "8", cy: "9", r: "2" }], ["rect", { x: "2", y: "3", width: "20", height: "14", rx: "2" }]]);
    expect(ICONS["search"]).toEqual([["path", { d: "m21 21-4.34-4.34" }], ["circle", { cx: "11", cy: "11", r: "8" }]]);
    expect(ICONS["image-plus"]).toEqual([["path", { d: "M16 5h6" }], ["path", { d: "M19 2v6" }], ["path", { d: "M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5" }], ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }], ["circle", { cx: "9", cy: "9", r: "2" }]]);
    expect(ACTION_ICONS["backgrounds"]).toBe("wallpaper");
  });
```

Commande : `cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/toolbar-profiles.test.ts src/ui/icons.test.ts src/app/toolbar-host.test.ts 2>&1 | tail -15`
Attendu : `FAIL` sur les listes, les inventaires et `backgrounds`.

- [ ] **Étape 2 : action, hôte, profils.**

`apps/web/src/toolbar.ts`, dans `ACTION_TABLE`, après `library: { label: "Bibliothèque" },` : `backgrounds: { label: "Fonds" },`

`apps/web/src/app/toolbar-host.ts:42` :
`toggle(panel: "settings" | "profiles" | "grid" | "image" | "library" | "backgrounds"): void;`
et dans la table des actions, après `library: (t) => t.toggle("library"),` : `backgrounds: (t) => t.toggle("backgrounds"),`

`apps/web/src/toolbar-profiles.ts`, `defaultToolbars`, entre le groupe `edition` et le groupe `bureau` :

```ts
      { id: "page", items: [sep("sep-fonds"), action("backgrounds", "Fonds")] },
```

et, dans `SIMPLE_PROFILE_JSON`, le groupe `vue` devient :

```ts
        { id: "vue", items: [sep("sep-2"), action("fit-page", "Ajuster la page"), action("profiles", "Profil"), action("settings", "Réglages"), action("backgrounds", "Fonds"), annotationEntry()] },
```

`apps/web/src/ui/App.tsx:79` :
`type Panel = "settings" | "profiles" | "editor" | "grid" | "image" | "library" | "backgrounds";`

- [ ] **Étape 3 : icônes.**

`apps/web/src/ui/icons.ts`, dans `ICONS`, après l'entrée `"file-plus"` :

```ts
  // personnalisation 1b : Lucide au commit 7981a0798a, lu par `gh api` (noms Lucide identiques).
  "wallpaper": [["path", { d: "M12 17v4" }], ["path", { d: "M8 21h8" }], ["path", { d: "m9 17 6.1-6.1a2 2 0 0 1 2.81.01L22 15" }], ["circle", { cx: "8", cy: "9", r: "2" }], ["rect", { x: "2", y: "3", width: "20", height: "14", rx: "2" }]],
  "search": [["path", { d: "m21 21-4.34-4.34" }], ["circle", { cx: "11", cy: "11", r: "8" }]],
  "image-plus": [["path", { d: "M16 5h6" }], ["path", { d: "M19 2v6" }], ["path", { d: "M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5" }], ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }], ["circle", { cx: "9", cy: "9", r: "2" }]],
```

et dans `ACTION_ICONS`, après `library: "library",` : `backgrounds: "wallpaper",`

- [ ] **Étape 4 : vert ciblé, puis suite web complète.**

Commandes :
`cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/toolbar-profiles.test.ts src/ui/icons.test.ts src/app/toolbar-host.test.ts 2>&1 | tail -10`
Attendu : `Test Files  3 passed (3)`, aucun `FAIL`, le test « personnalisation-1b : backgrounds bascule » listé avec
`--reporter=verbose` si besoin.
`nice -n 10 pnpm exec tsc --noEmit 2>&1 | tail -5` → aucune ligne `error TS`.
`cd <wt> && node ~/.claude/scripts/vm/suite-vm.cjs -- pnpm --filter @roomboard/web exec vitest run 2>&1 | tail -12`
Attendu : `Test Files  N passed`, N ≥ 178, aucun `FAIL` (un autre test qui fige la barre `outils` des profils fournis
casserait ici : le signaler au rapport, ne pas le réécrire sans lien avec Q23).

- [ ] **Étape 5 : commit.**

```bash
cd <wt>
for f in apps/web/src/toolbar.ts apps/web/src/app/toolbar-host.ts apps/web/src/app/toolbar-host.test.ts apps/web/src/toolbar-profiles.ts apps/web/src/toolbar-profiles.test.ts apps/web/src/ui/icons.ts apps/web/src/ui/icons.test.ts apps/web/src/ui/App.tsx; do git add "$f"; done
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(web): Backgrounds button in the three built-in profiles, Lucide wallpaper, search and image-plus" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport attendu.** Sorties `tail` de l'étape 4, lignes `Réutilisation : …`, sha du commit.

---

<a id="tache-t7"></a>
### Tâche T7 — Photos : encodage WebP, miniatures, catalogue généré, tests du pack

**Objectif.** Un producteur reproductible, joué à la main (réseau), télécharge les 40 à 50 images CC0 de `SOURCES.json`
dans un dossier temporaire neuf, les recadre en 16:9 et les encode en WebP 2560 × 1440 (≤ 400 Ko, qualité réglée par
image) avec miniature 480 × 270 (≤ 25 Ko), métadonnées retirées, mesure la couleur de la dernière rangée, écrit les
fichiers servis et le catalogue `photos.ts` (sans provenance). Tests du pack : poids ≤ 30 Mo, 150 à 200 fonds, aucune
métadonnée EXIF ni XMP, aucune trace de service extérieur. Cadrage : Q11, Q13, Q14, Q17, Q33, Q34, DA2 ; scénario S2.

**Fichiers.**
- Créer : `scripts/fonds/produire-photos.mjs`, `apps/web/public/backgrounds/photos/<id>.webp`,
  `apps/web/public/backgrounds/thumbs/<id>.webp` (un couple par entrée de `SOURCES.json`)
- Modifier : `apps/web/src/backgrounds/photos.ts` (réécrit par le producteur), `apps/web/backgrounds/SOURCES.json`
  (champ `retouche` complété par le producteur, rien d'autre)
- Tester : `apps/web/src/backgrounds/pack.test.ts` ; à garder verts : `catalog.test.ts`, `sources.test.ts`

**Interfaces.**
- Consomme : `SOURCES.json` (T4 : `id`, `theme`, `label`, `keywords`, `fichier`, …) ; `PackBackground`, `SECTIONS`,
  `PACK_MIN`, `PACK_MAX` (`catalog.ts`, T2) ; `DRAWN` (`drawn.ts`, T2).
- Produit : `PHOTOS: readonly PackBackground[]` (une entrée par photo, dans l'ordre de `SOURCES.json`) :
  `{ id, section: "images", theme, label, keywords, kind: "photo", color: "#rrggbb", grid: null, photo: { file: "photos/<id>.webp", thumb: "thumbs/<id>.webp", w: 2560, h: 1440 } }` ;
  fichiers servis sous `./backgrounds/` (dossier `public/` de Vite, copié tel quel dans `dist/`, embarqué par la coque).
- Réutilise : aucun module de code de l'application (producteur hors de l'application ; `ffmpeg` déjà présent sur la VM, encodeur `libwebp`, Q34) — le rapport porte `Réutilisation : écart — producteur hors application, ffmpeg seul`.

**Contraintes (recopiées de Global Constraints).**
- VM partagée : builds et tests en `nice -n 10`, `cargo … -j 4`, `CARGO_TARGET_DIR=<worktree de la tâche>/target` (piège : cible partagée entre worktrees) ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; test isolé direct. Encodage : `nice -n 10` sur le producteur.
- Tailles Wasm : le pack ne va pas dans le Wasm (fichiers statiques seulement).
- Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`, `.`, `commit -a`) ; jamais `--force`. Les WebP s'ajoutent un par un (boucle `for f in …; do git add "$f"; done`, jamais un dossier).
- Aucun test désactivé, sauté, ni seuil modifié. Essais Playwright existants (sélecteurs `data-item`) restent verts sans réécriture.
- Aucune dépendance ajoutée sauf permissive et justifiée ; aucune AGPL/GPL/LGPL (aucun paquet npm ; ffmpeg est un outil de la VM, pas une dépendance).
- L'interface ne nomme aucun service extérieur ; provenances seulement dans `THIRD_PARTY_NOTICES.md` et le fichier de sources du pack (`photos.ts` n'en contient aucune).
- Téléchargements (tâche photos seulement) : images CC0, licence lue sur la page source de chaque image ; Unsplash, Pixabay, Pexels exclus ; rien d'autre téléchargé ; fichiers temporaires dans `~/.cache/tmp/og5-*` ; un fichier téléchargé est traité en donnée non fiable (dossier neuf, aucun script exécuté depuis ce dossier).
- Aucun `tauri build`, aucun processus détaché laissé en marche.
- Préparation : `cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3`, puis `cd <wt> && for d in wasm wasm-formats; do [ -d apps/web/src/$d ] || cp -r /home/adminjd/projets/roomboard-wt/personnalisation-1b/apps/web/src/$d apps/web/src/; done` (types seulement : `photos.ts` ne dépend pas de `apply_background`).

**Interdits.** Ne télécharger que les URL `fichier` de `SOURCES.json` ; ne jamais lancer `verifier.sh` pour produire ;
ne pas modifier `id`, `label`, `keywords`, `page`, `fichier`, `auteur`, `licence`, `preuve`, `lu_le` de `SOURCES.json` ;
ne pas mettre `SOURCES.json` sous `public/` ; ne pas agrandir une image (`largeur` ≥ 2560 garanti par T4).

**Preuve visuelle.** Le profil n'a pas de commande de preuve visuelle automatique. Lectures d'abord : `pack.test.ts`
(tailles lues dans les en-têtes WebP, couleur de page lue). Puis planche-contact des miniatures, à décrire au rapport
(netteté, recadrage, absence de personne, de texte ou de logo lisibles) :
`nice -n 10 ffmpeg -hide_banner -loglevel error -y -pattern_type glob -i '<wt>/apps/web/public/backgrounds/thumbs/*.webp' -filter_complex "scale=240:135,tile=8x7" -frames:v 1 ~/.cache/tmp/og5-planche.png`
(fichier hors dépôt, à lire avec l'outil de lecture d'image et à supprimer ensuite).

**Terminé quand.** Un couple WebP par photo, `photos.ts` régénéré, `pack.test.ts` passe (≥ 8 tests), `catalog.test.ts`
et `sources.test.ts` verts, planche décrite, dossier de téléchargement supprimé, commit fait.

**Étapes.**

- [ ] **Étape 1 : écrire `apps/web/src/backgrounds/pack.test.ts` (rouge).**

```ts
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PACK_MAX, PACK_MIN, SECTIONS } from "./catalog";
import { DRAWN } from "./drawn";
import { PHOTOS } from "./photos";

const PUBLIC = new URL("../../public/backgrounds/", import.meta.url);
const SOURCES = JSON.parse(readFileSync(new URL("../../backgrounds/SOURCES.json", import.meta.url), "utf8")) as { photos: { id: string; retouche: string }[] };
const TRACES = ["polyhaven", "poly haven", "wikimedia", "commons", "openverse", "flickr", "unsplash", "pixabay", "pexels", "http", "www."];
const MAX_PACK = 31_457_280;
const bytes = (rel: string): Uint8Array => new Uint8Array(readFileSync(new URL(rel, PUBLIC)));
const ascii = (b: Uint8Array, at: number, n: number): string => String.fromCharCode(...b.subarray(at, at + n));
const u32 = (b: Uint8Array, i: number): number => (b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16) | (b[i + 3]! << 24)) >>> 0;
/** Blocs RIFF d'un WebP (VP8, VP8L, VP8X, EXIF, XMP …). */
function chunks(b: Uint8Array): string[] {
  const out: string[] = [];
  for (let i = 12; i + 8 <= b.length; ) {
    const size = u32(b, i + 4);
    out.push(ascii(b, i, 4));
    i += 8 + size + (size & 1);
  }
  return out;
}
/** Taille lue dans l'en-tête : VP8X (toile), VP8 (image avec perte), VP8L (sans perte). */
function webpSize(b: Uint8Array): { w: number; h: number } | null {
  const kind = ascii(b, 12, 4);
  const u24 = (i: number): number => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16);
  if (kind === "VP8X") return { w: u24(24) + 1, h: u24(27) + 1 };
  if (kind === "VP8 ") return { w: (b[26]! | (b[27]! << 8)) & 0x3fff, h: (b[28]! | (b[29]! << 8)) & 0x3fff };
  if (kind === "VP8L") {
    const v = u32(b, 21);
    return { w: (v & 0x3fff) + 1, h: ((v >>> 14) & 0x3fff) + 1 };
  }
  return null;
}
const all = (dir: string): string[] => readdirSync(new URL(`${dir}/`, PUBLIC)).sort();

describe("personnalisation-1b : pack de photos livré (Q11, Q13, Q14, Q33)", () => {
  it("photos.ts : une entrée par photo de SOURCES.json, dans l'ordre, fichiers présents", () => {
    expect(PHOTOS.map((p) => p.id)).toEqual(SOURCES.photos.map((p) => p.id));
    for (const p of PHOTOS) {
      expect(p.photo, p.id).toEqual({ file: `photos/${p.id}.webp`, thumb: `thumbs/${p.id}.webp`, w: 2560, h: 1440 });
      expect(existsSync(new URL(p.photo!.file, PUBLIC)), p.id).toBe(true);
      expect(existsSync(new URL(p.photo!.thumb, PUBLIC)), p.id).toBe(true);
    }
    expect(all("photos")).toEqual(PHOTOS.map((p) => `${p.id}.webp`).sort());
    expect(all("thumbs")).toEqual(PHOTOS.map((p) => `${p.id}.webp`).sort());
  });

  it("WebP : photos 2560 × 1440 ≤ 400 Ko, miniatures 480 × 270 ≤ 25 Ko", () => {
    for (const p of PHOTOS) {
      const big = bytes(p.photo!.file);
      const small = bytes(p.photo!.thumb);
      expect([ascii(big, 0, 4), ascii(big, 8, 4)], p.id).toEqual(["RIFF", "WEBP"]);
      expect(webpSize(big), p.id).toEqual({ w: 2560, h: 1440 });
      expect(webpSize(small), p.id).toEqual({ w: 480, h: 270 });
      expect(big.length, p.id).toBeLessThanOrEqual(400 * 1024);
      expect(small.length, p.id).toBeLessThanOrEqual(25 * 1024);
    }
  });

  it("aucun bloc EXIF ni XMP dans les WebP du pack", () => {
    for (const p of PHOTOS) for (const f of [p.photo!.file, p.photo!.thumb]) expect(chunks(bytes(f)), f).not.toEqual(expect.arrayContaining(["EXIF"]));
    for (const p of PHOTOS) for (const f of [p.photo!.file, p.photo!.thumb]) expect(chunks(bytes(f)), f).not.toEqual(expect.arrayContaining(["XMP "]));
  });

  it("poids total du pack ≤ 30 Mo (31 457 280 o)", () => {
    const total = ["photos", "thumbs"].flatMap((d) => all(d).map((f) => statSync(new URL(`${d}/${f}`, PUBLIC)).size)).reduce((a, b) => a + b, 0);
    expect(total).toBeLessThanOrEqual(MAX_PACK);
  });

  it("catalogue complet : 150 à 200 fonds, ids uniques, photos dans les thèmes de la section Images", () => {
    const pack = [...DRAWN, ...PHOTOS];
    expect(pack.length).toBeGreaterThanOrEqual(PACK_MIN);
    expect(pack.length).toBeLessThanOrEqual(PACK_MAX);
    expect(new Set(pack.map((b) => b.id)).size).toBe(pack.length);
    const themes = SECTIONS.find((s) => s.id === "images")!.themes.map((t) => t.id);
    for (const p of PHOTOS) expect([p.section, themes.includes(p.theme), p.kind, p.grid], p.id).toEqual(["images", true, "photo", null]);
  });

  it("aucune trace d'un service extérieur dans les libellés, mots-clés et noms de fichiers du catalogue (Q33)", () => {
    for (const b of [...DRAWN, ...PHOTOS]) {
      const text = [b.id, b.label, ...b.keywords, b.photo?.file ?? "", b.photo?.thumb ?? ""].join(" ").toLowerCase();
      for (const t of TRACES) expect(text, `${b.id} : ${t}`).not.toContain(t);
    }
    const source = readFileSync(new URL("./photos.ts", import.meta.url), "utf8").toLowerCase();
    for (const t of TRACES) expect(source, t).not.toContain(t);
  });

  it("couleur de page de chaque photo en #rrggbb (bord bas mesuré)", () => {
    for (const p of PHOTOS) expect(p.color, p.id).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("SOURCES.json : retouche écrite par le producteur (qualité WebP)", () => {
    for (const p of SOURCES.photos) expect(p.retouche, p.id).toMatch(/^recadrage 16:9 centré, 2560 × 1440, WebP q\d+, métadonnées retirées ; miniature 480 × 270$/);
  });
});
```

Commande : `cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/backgrounds/pack.test.ts 2>&1 | tail -10`
Attendu : `FAIL` (`PHOTOS` vide, dossier `public/backgrounds` absent).

- [ ] **Étape 2 : écrire `scripts/fonds/produire-photos.mjs`.**

```js
#!/usr/bin/env node
// Producteur des photos du pack de fonds (personnalisation-1b, Q11, Q13, Q14, Q34). Joué à la main, réseau, jamais par
// scripts/verifier.sh. Lit apps/web/backgrounds/SOURCES.json, télécharge chaque image CC0 (URL `fichier`, seule permise)
// dans un dossier neuf ~/.cache/tmp/og5-photos-XXXXXX/ (donnée non fiable : aucun script n'y est lancé, ffmpeg ne fait que
// lire), recadre en 16:9 centré, encode en WebP 2560 × 1440 (≤ 400 Ko, qualité réglée par image) et 480 × 270 (≤ 25 Ko),
// métadonnées retirées, mesure la couleur moyenne de la dernière rangée, écrit apps/web/public/backgrounds/{photos,thumbs}/
// <id>.webp, réécrit apps/web/src/backgrounds/photos.ts (aucune provenance) et le champ `retouche` de SOURCES.json.
// Usage : node scripts/fonds/produire-photos.mjs [--depuis <dossier déjà téléchargé>]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const SOURCES = join(ROOT, "apps", "web", "backgrounds", "SOURCES.json");
const OUT = join(ROOT, "apps", "web", "public", "backgrounds");
const CATALOG = join(ROOT, "apps", "web", "src", "backgrounds", "photos.ts");
const [W, H, TW, TH] = [2560, 1440, 480, 270];
const [MAX, TMAX] = [400 * 1024, 25 * 1024];
const EXCLUDED = /unsplash|pixabay|pexels/i;

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const ffmpeg = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);

/** Encode `src` en WebP w × h (recadrage centré), qualités essayées dans l'ordre jusqu'à tenir sous `max` octets. */
function encode(src, dst, w, h, max, qualities) {
  for (const q of qualities) {
    ffmpeg(["-i", src, "-map_metadata", "-1", "-vf", `scale=${w}:${h}:force_original_aspect_ratio=increase:flags=lanczos,crop=${w}:${h}`, "-frames:v", "1", "-c:v", "libwebp", "-quality", String(q), "-compression_level", "6", dst]);
    if (statSync(dst).size <= max) return q;
  }
  throw new Error(`${dst} : plus de ${max} octets même à la qualité ${qualities.at(-1)}`);
}

/** Couleur moyenne de la dernière rangée (H2-4), en #rrggbb. */
function edgeColor(file) {
  const rgb = execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", file, "-vf", `crop=${W}:1:0:${H - 1},scale=1:1:flags=area`, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
  return `#${[...rgb.subarray(0, 3)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

async function download(url, dst) {
  if (EXCLUDED.test(url)) throw new Error(`source exclue : ${url}`);
  const r = await fetch(url, { headers: { "user-agent": "roomboard-fonds/1" } });
  if (!r.ok) throw new Error(`${url} : HTTP ${r.status}`);
  writeFileSync(dst, new Uint8Array(await r.arrayBuffer()));
}

const sources = JSON.parse(readFileSync(SOURCES, "utf8"));
mkdirSync(join(homedir(), ".cache", "tmp"), { recursive: true });
const work = arg("--depuis") ?? mkdtempSync(join(homedir(), ".cache", "tmp", "og5-photos-"));
console.log(`dossier de téléchargement : ${work}`);
mkdirSync(join(OUT, "photos"), { recursive: true });
mkdirSync(join(OUT, "thumbs"), { recursive: true });
const entries = [];
for (const p of sources.photos) {
  const raw = join(work, `${p.id}.src`);
  if (!existsSync(raw)) await download(p.fichier, raw);
  const photo = join(OUT, "photos", `${p.id}.webp`);
  const thumb = join(OUT, "thumbs", `${p.id}.webp`);
  const q = encode(raw, photo, W, H, MAX, [82, 76, 70, 64, 58, 52]);
  encode(raw, thumb, TW, TH, TMAX, [75, 68, 60, 52, 44]);
  p.retouche = `recadrage 16:9 centré, ${W} × ${H}, WebP q${q}, métadonnées retirées ; miniature ${TW} × ${TH}`;
  entries.push({ id: p.id, section: "images", theme: p.theme, label: p.label, keywords: p.keywords, kind: "photo", color: edgeColor(photo), grid: null, photo: { file: `photos/${p.id}.webp`, thumb: `thumbs/${p.id}.webp`, w: W, h: H } });
  console.log(`ok — ${p.id} (qualité ${q}, ${statSync(photo).size} o)`);
}
writeFileSync(
  CATALOG,
  `// Généré par scripts/fonds/produire-photos.mjs depuis apps/web/backgrounds/SOURCES.json : ne pas modifier à la main.\n` +
    `// Aucune provenance ici (Q13, Q33) : elle reste dans SOURCES.json.\n` +
    `import type { PackBackground } from "./catalog";\n\n` +
    `export const PHOTOS: readonly PackBackground[] = Object.freeze(${JSON.stringify(entries, null, 2)} satisfies PackBackground[]);\n`,
);
writeFileSync(SOURCES, `${JSON.stringify(sources, null, 2)}\n`);
console.log(`photos.ts : ${entries.length} photos ; dossier à supprimer : ${work}`);
```

- [ ] **Étape 3 : produire.**

```bash
cd <wt> && ffmpeg -hide_banner -encoders 2>/dev/null | grep -c libwebp
cd <wt> && nice -n 10 node scripts/fonds/produire-photos.mjs 2>&1 | tail -60
```
Attendu : `1` pour `libwebp`, puis une ligne `ok — <id> (qualité N, … o)` par photo et `photos.ts : N photos` (N = nombre
d'entrées de `SOURCES.json`). Une URL qui échoue (HTTP 404) : arrêter, le signaler au rapport (T4 a prouvé la licence
de ce fichier, pas d'une autre image) ; ne rien télécharger d'autre. Si une photo ne tient pas sous 400 Ko à q52 :
l'erreur l'arrête, le signaler (ne pas relever le plafond).

- [ ] **Étape 4 : vert, preuve visuelle, ménage.**

Commandes :
`cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/backgrounds/pack.test.ts src/backgrounds/catalog.test.ts src/backgrounds/sources.test.ts 2>&1 | tail -10`
Attendu : `Test Files  3 passed (3)`, aucun `FAIL`, `pack.test.ts` : `8 passed`.
`nice -n 10 pnpm exec tsc --noEmit 2>&1 | tail -5` → aucune ligne `error TS`.
`du -cb <wt>/apps/web/public/backgrounds/photos/*.webp <wt>/apps/web/public/backgrounds/thumbs/*.webp | tail -1` → ≤ 31457280.
Planche-contact (commande de la rubrique « Preuve visuelle »), la lire, la décrire, puis :
`rm -f ~/.cache/tmp/og5-planche.png && rm -rf ~/.cache/tmp/og5-photos-*`.

- [ ] **Étape 5 : commit (fichiers un par un).**

```bash
cd <wt>
for f in scripts/fonds/produire-photos.mjs apps/web/src/backgrounds/photos.ts apps/web/backgrounds/SOURCES.json apps/web/src/backgrounds/pack.test.ts apps/web/public/backgrounds/photos/*.webp apps/web/public/backgrounds/thumbs/*.webp; do git add "$f"; done
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(pack): CC0 photos as 2560x1440 WebP with thumbnails, generated catalogue" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport attendu.** Nombre de photos, poids total, qualité min et max, sortie `tail` de l'étape 4, description de la
planche, ligne `Réutilisation : …`, sha du commit.

---

<a id="tache-t8"></a>
### Tâche T8 — Appliquer un fond : `backgrounds-apply`, `renderPageImage`, marqueur `data-look`

**Objectif.** Un module unique, partagé par l'interface et la CLI, transforme un fond du pack en `BackgroundSource`
(couleur ; grille ; SVG écrit par `svgOf` ; photo lue seulement à l'application), met l'image au magasin `assets` de
l'onglet (empreinte SHA-256 : un même fond sur 30 pages = un seul asset), puis rend **une** commande `ApplyBackground`.
`renderPageImage` rend une page entière (couleur, fond image, grille et objets) à une échelle donnée : pour « Cette
page » (échelle 2, 3840 × 2160) et les miniatures de grilles (échelle 0,25, 480 × 270). La scène pose `data-look`
(couleur|grille|fond de la page montrée), lu par l'essai e2e. Cadrage : Q14, Q20, Q26, Q29, Q31, Q35 ; scénarios S1,
S2, S4.

**Fichiers.**
- Créer : `apps/web/src/app/backgrounds-apply.ts`
- Modifier : `apps/web/src/app/thumbnail.ts` (après `renderThumbnail`, `:30-52`), `apps/web/src/app/board-session.ts`
  (fonction `mark`, `:667-685`, une ligne et un import)
- Tester : `apps/web/src/app/backgrounds-apply.test.ts`, `apps/web/src/app/thumbnail.test.ts` (3 tests ajoutés) ; à
  garder vert : `apps/web/src/app/board-session.test.ts`

**Interfaces.**
- Consomme : `Command`, `CoreDocument`, `CoreFactory`, `PageView` (`core/api.ts`, `ApplyBackground` de T1) ;
  `PackBackground` (`backgrounds/catalog.ts`, T2) ; `svgOf`, `SVG_W`, `SVG_H` (`backgrounds/svg.ts`, T2) ;
  `BackgroundSource` (`backgrounds/source.ts`, T5) ; `AssetStore` (`core/asset-store.ts`) ; `typed`
  (`app/container-io.ts:76`) ; `ThumbDeps`, `loadImageSource` (existants).
- Produit (`app/backgrounds-apply.ts`) :
  `interface PackFiles { read(file: string): Promise<Blob> }` ; `const PACK_BASE = "./backgrounds/"` ;
  `const missingPackFile = (file: string): string => \`fond introuvable : ${file}\`` ;
  `const appliedMessage = (n: number): string` → « Fond appliqué à N pages » ;
  `const pdfKeptMessage = (n: number): string` → « 1 page PDF garde sa page : couleur et grille seulement » / « N pages PDF gardent leur page : couleur et grille seulement » ;
  `const OUTSIDE_FRAME_MESSAGE = "objets hors du cadre non repris"` ; `const THUMB_SCALE = 0.25` ;
  `function fetchPackFiles(fetchFn?: (url: string) => Promise<Response>, base?: string): PackFiles` ;
  `function resolvePack(b: PackBackground, files: PackFiles): Promise<BackgroundSource>` ;
  `function backgroundCommand(assets: Pick<AssetStore, "put">, src: BackgroundSource, pages: readonly string[]): Promise<Command>` ;
  `interface ApplyTarget { run(cmd: Command): unknown; readonly assets: Pick<AssetStore, "put">; pageIds(): readonly string[] }` ;
  `function applyBackground(target: ApplyTarget, src: BackgroundSource, pages: "current" | "all", current: string): Promise<boolean>` (vrai si `run` ne rend pas `null`) ;
  `function pdfPagesAmong(doc: Pick<CoreDocument, "page">, pages: readonly string[]): number` ;
  `function outsideFrame(doc: Pick<CoreDocument, "page" | "elementIds" | "bounds">, pageId: string): boolean` ;
  `function lookTag(page: PageView | null): string` (`""` sans page ; sinon `<background>|<types de grille joints par + ou ->|<kind>:<12 premiers caractères de l'asset ou ->`) ;
  `function sourceThumbnail(core: Pick<CoreFactory, "blank">, src: BackgroundSource, deps: ThumbDeps, makeAssets: () => AssetStore): Promise<Blob | null>`.
- Produit (`app/thumbnail.ts`) : `const PAGE_IMAGE_SCALE = 2` ;
  `function renderPageImage(doc: CoreDocument, assets: AssetStore, pageId: string, scale: number, deps: ThumbDeps): Promise<Blob | null>`.
- Produit (`board-session.ts`) : `stage.dataset["look"] = lookTag(doc.page(s.page))` à chaque `mark`.
- Réutilise : `apps/web/src/core/asset-store.ts` (`AssetStore.put`), `apps/web/src/app/container-io.ts:76` — `assets.put(typed(blob, mime)) → id`.
- Réutilise : `apps/web/src/app/thumbnail.ts:30` — étendre : `renderPageImage(doc: CoreDocument, assets: AssetStore, pageId: string, scale: number, deps: ThumbDeps): Promise<Blob | null>` (couleur, fond image, puis `paintContent`), à côté de `renderThumbnail`.
- Réutilise : `apps/web/src/app/pdf-overlay.ts` — `loadImageSource(doc, assets, decode)`, `ContentPainter.paintContent` (non modifiés).
- Réutilise : aucun module existant pour « appliquer un fond à l'onglet » (patron `apps/web/src/app/workspace.ts:482-486` `putCapture`, et `engine.run`) — nouveau module `apps/web/src/app/backgrounds-apply.ts` : `applyBackground(target: { run(cmd: Command): unknown; readonly assets: AssetStore; pageIds(): readonly string[] }, src: BackgroundSource, pages: "current" | "all", current: string): Promise<boolean>` ; `resolvePack(b: PackBackground, files: { read(file: string): Promise<Blob> }): Promise<BackgroundSource>` (appelé par l'interface et la CLI) ; `backgroundCommand` est le cœur commun des deux.
- Le rapport porte, pour chacune de ces lignes, `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Patron à ne pas reprendre (concepteur-critique).** Le chemin de la capture du bureau : `apps/web/src/app/desktop-page.ts:33`
pose un fond par `SetBackdrop` sur **une** page, et `apps/web/src/app/workspace.ts:482-486` (`putCapture`) met une image
au magasin pour cette page. Le reprendre page par page donnerait N `put` et N étapes (sans compter grille et couleur).
Ici : un seul `put` par fond, puis une seule commande `ApplyBackground` pour toutes les pages visées ; ne garder de
`putCapture` que la forme `typed(blob, mime)` → `put` → `AssetRef { id, name, mime, size: blob.size }`. Aucune lecture
de la photo pleine avant l'application (Q14).

**Contraintes (recopiées de Global Constraints).**
- VM partagée : builds et tests en `nice -n 10`, `cargo … -j 4`, `CARGO_TARGET_DIR=<worktree de la tâche>/target` (piège : cible partagée entre worktrees) ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; test isolé direct.
- Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`, `.`, `commit -a`) ; jamais `--force`.
- Aucun test désactivé, sauté, ni seuil modifié. Essais Playwright existants (sélecteurs `data-item`) restent verts sans réécriture.
- Aucune dépendance ajoutée sauf permissive et justifiée ; aucune AGPL/GPL/LGPL.
- L'interface ne nomme aucun service extérieur (les messages de ce module n'en citent aucun).
- Aucun `tauri build`, aucun processus détaché laissé en marche.
- Préparation : `cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3`, puis les modules Wasm avec `apply_background` (exigés par `tsc`) :

```bash
cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH CARGO_TARGET_DIR=<wt>/target
[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/personnalisation-1b/apps/web/src/wasm-formats apps/web/src/
T1=/home/adminjd/projets/roomboard-wt/personnalisation-1b--T1/apps/web/src/wasm
if grep -q apply_background apps/web/src/wasm/roomboard_wasm.d.ts 2>/dev/null; then :
elif grep -q apply_background "$T1/roomboard_wasm.d.ts" 2>/dev/null; then rm -rf apps/web/src/wasm && cp -r "$T1" apps/web/src/wasm
else nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release -j 4 2>&1 | tail -2 && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm "$CARGO_TARGET_DIR/wasm32-unknown-unknown/release/roomboard_wasm.wasm"; fi
grep -c apply_background apps/web/src/wasm/roomboard_wasm.d.ts
```

**Interdits.** Ne pas toucher `workspace.ts`, `desktop-page.ts`, `pdf-overlay.ts`, `canvas2d.ts` ; ne pas modifier
`renderThumbnail` ; aucune commande autre qu'`ApplyBackground` pour poser un fond.

**Terminé quand.** `backgrounds-apply.test.ts` passe (≥ 9 tests), `thumbnail.test.ts` passe (4 anciens + 3 nouveaux),
`board-session.test.ts` vert, `tsc` propre, commit fait.

**Étapes.**

- [ ] **Étape 1 : écrire `apps/web/src/app/backgrounds-apply.test.ts` (rouge).**

```ts
// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import type { Command, CoreDocument } from "../core/api";
import { createAssetStore } from "../core/asset-store";
import { fakeCore } from "../core/fake-core";
import type { PackBackground } from "../backgrounds/catalog";
import {
  appliedMessage, applyBackground, backgroundCommand, fetchPackFiles, lookTag, missingPackFile, outsideFrame, pdfKeptMessage,
  pdfPagesAmong, resolvePack, sourceThumbnail, THUMB_SCALE,
} from "./backgrounds-apply";
import type { ExportCanvas } from "./pdf-overlay";
import type { ThumbDeps } from "./thumbnail";

const GRID = { visible: true, snap: false, above: false, levels: [{ kind: "seyes", spacingX: 30.24, spacingY: 30.24, originX: 0, originY: 0, color: "#8f9ad6", line: "solid", lineWidth: 1, snap: true, visible: true }] };
const seyes: PackBackground = { id: "seyes-8mm", section: "lines", theme: "seyes", label: "Seyès 8 mm", keywords: ["seyès"], kind: "grid", color: "#fbf7ec", grid: GRID, photo: null };
const ardoise: PackBackground = { ...seyes, id: "ardoise", section: "colors", theme: "sombres", label: "Ardoise", kind: "color", color: "#2f3e46", grid: null };
const venn: PackBackground = { ...ardoise, id: "venn", section: "lessons", theme: "reflexion", label: "Diagramme de Venn", kind: "svg", color: "#ffffff" };
const mer: PackBackground = { ...ardoise, id: "mer-1", section: "images", theme: "mer-ciel", label: "Mer", kind: "photo", color: "#3a6f9a", photo: { file: "photos/mer-1.webp", thumb: "thumbs/mer-1.webp", w: 2560, h: 1440 } };
const filesOf = (map: Record<string, Uint8Array>) => ({
  read: vi.fn(async (f: string) => {
    const b = map[f];
    if (b === undefined) throw new Error(missingPackFile(f));
    return new Blob([b as BlobPart]);
  }),
});
const targetOf = (d: CoreDocument) => {
  const assets = createAssetStore();
  const runs: Command[] = [];
  return {
    runs,
    assets,
    target: {
      assets,
      pageIds: () => d.pageIds(),
      run: (c: Command) => {
        runs.push(c);
        try {
          return d.apply(c);
        } catch {
          return null;
        }
      },
    },
  };
};
const threePages = (): CoreDocument => {
  const d = fakeCore.blank();
  d.apply({ type: "AddPage", after: d.pageIds()[0]! });
  d.apply({ type: "AddPage", after: d.pageIds()[0]! });
  return d;
};

describe("personnalisation-1b : appliquer un fond (Q14, Q26, Q31, DA1)", () => {
  it("resolvePack : couleur seule, grille seule, SVG 3840 × 2160, photo lue à la demande seulement", async () => {
    const files = filesOf({ "photos/mer-1.webp": new Uint8Array([1, 2, 3]) });
    expect(await resolvePack(ardoise, files)).toEqual({ color: "#2f3e46", grid: null, image: null });
    expect(await resolvePack(seyes, files)).toEqual({ color: "#fbf7ec", grid: GRID, image: null });
    const svg = await resolvePack(venn, files);
    expect(svg.image).toMatchObject({ name: "venn.svg", mime: "image/svg+xml", w: 3840, h: 2160 });
    expect(await svg.image!.blob.text()).toMatch(/^<svg /);
    expect(files.read).not.toHaveBeenCalled();
    const photo = await resolvePack(mer, files);
    expect(files.read).toHaveBeenCalledWith("photos/mer-1.webp");
    expect(photo.image).toMatchObject({ name: "mer-1.webp", mime: "image/webp", w: 2560, h: 1440 });
    expect(photo.image!.blob.type).toBe("image/webp");
  });

  it("applyBackground « all » : une commande pour trois pages, un seul asset, une étape", async () => {
    const d = threePages();
    const { runs, target } = targetOf(d);
    expect(await applyBackground(target, await resolvePack(venn, filesOf({})), "all", d.pageIds()[0]!)).toBe(true);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ type: "ApplyBackground", pages: d.pageIds() });
    const assets = new Set(d.pageIds().map((p) => d.page(p)?.backdrop?.asset));
    expect(assets.size).toBe(1);
    expect(d.citedAssets()).toHaveLength(1);
    d.undo();
    for (const p of d.pageIds()) expect(d.page(p)?.backdrop ?? null).toBeNull();
  });

  it("applyBackground « current » : seule la page montrée ; refus du cœur : faux", async () => {
    const d = threePages();
    const [a, b] = d.pageIds() as [string, string];
    const { target } = targetOf(d);
    expect(await applyBackground(target, await resolvePack(ardoise, filesOf({})), "current", b)).toBe(true);
    expect([d.page(a)?.background, d.page(b)?.background]).toEqual(["#ffffff", "#2f3e46"]);
    expect(await applyBackground(target, { color: "", grid: null, image: null }, "current", b)).toBe(false);
  });

  it("backgroundCommand : fond calé sur la largeur, taille du Blob, grille recopiée, magasin appelé une fois", async () => {
    const put = vi.fn(async () => "a".repeat(64));
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])]);
    const cmd = await backgroundCommand({ put }, { color: "#fbf7ec", grid: GRID, image: { blob, name: "fond.png", mime: "image/png", w: 640, h: 360 } }, ["p1", "p2"]);
    expect(cmd).toEqual({ type: "ApplyBackground", pages: ["p1", "p2"], color: "#fbf7ec", grid: GRID, backdrop: { asset: { id: "a".repeat(64), name: "fond.png", mime: "image/png", size: 4 }, w: 640, h: 360, fit: "width" } });
    expect(put).toHaveBeenCalledTimes(1);
  });

  it("Review Focus — photo absente du pack : refus lisible, aucune commande", async () => {
    const d = fakeCore.blank();
    const { runs } = targetOf(d);
    await expect(resolvePack(mer, filesOf({}))).rejects.toThrow("fond introuvable : photos/mer-1.webp");
    const fetched = fetchPackFiles(async () => new Response(null, { status: 404 }));
    await expect(fetched.read("photos/mer-1.webp")).rejects.toThrow("fond introuvable : photos/mer-1.webp");
    const offline = fetchPackFiles(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(offline.read("photos/mer-1.webp")).rejects.toThrow("fond introuvable : photos/mer-1.webp");
    expect(runs).toEqual([]);
    expect(d.canUndo()).toBe(false);
  });

  it("fetchPackFiles : adresse relative au document, sous ./backgrounds/", async () => {
    const urls: string[] = [];
    const f = fetchPackFiles(async (u) => {
      urls.push(u);
      return new Response(new Uint8Array([7]));
    });
    expect((await f.read("thumbs/x.webp")).size).toBe(1);
    expect(urls).toEqual(["./backgrounds/thumbs/x.webp"]);
  });

  it("pdfPagesAmong compte les pages PDF ; outsideFrame voit un objet hors du cadre", () => {
    const pdf = fakeCore.fromPdfPages({ id: "cd".repeat(32), name: "c.pdf", mime: "application/pdf", size: 1 }, [{ w: 612, h: 792 }, { w: 612, h: 792 }]);
    expect(pdfPagesAmong(pdf, pdf.pageIds())).toBe(2);
    const d = fakeCore.blank();
    const p = d.pageIds()[0]!;
    expect(outsideFrame(d, p)).toBe(false);
    d.apply({ type: "CommitStroke", page: p, points: new Float32Array([100, 100, 0.5, 300, 300, 0.5]), style: { color: "#000000", width: 4 } });
    expect(outsideFrame(d, p)).toBe(false);
    d.apply({ type: "CommitStroke", page: p, points: new Float32Array([100, 1000, 0.5, 300, 1400, 0.5]), style: { color: "#000000", width: 4 } });
    expect(outsideFrame(d, p)).toBe(true);
  });

  it("lookTag : couleur|grille|fond ; messages des avis", async () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0]!;
    expect(lookTag(null)).toBe("");
    expect(lookTag(d.page(p))).toBe("#ffffff|-|-");
    d.apply({ type: "ApplyBackground", pages: [p], color: "#fbf7ec", grid: GRID, backdrop: { asset: { id: "b".repeat(64), name: "x.png", mime: "image/png", size: 1 }, w: 10, h: 10, fit: "width" } });
    expect(lookTag(d.page(p))).toBe(`#fbf7ec|seyes|image:${"b".repeat(12)}`);
    expect(appliedMessage(3)).toBe("Fond appliqué à 3 pages");
    expect(pdfKeptMessage(1)).toBe("1 page PDF garde sa page : couleur et grille seulement");
    expect(pdfKeptMessage(2)).toBe("2 pages PDF gardent leur page : couleur et grille seulement");
  });

  it("sourceThumbnail : document temporaire libéré, rendu 480 × 270", async () => {
    const sizes: [number, number][] = [];
    const ctx = { fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
    const deps: ThumbDeps = {
      canvas: (w, h): ExportCanvas => {
        sizes.push([w, h]);
        return { ctx, png: async () => new Uint8Array([0x89]), release: () => undefined };
      },
      painter: () => ({ paintContent: () => undefined }),
      decode: async () => ({ width: 1, height: 1, close() {} }) as never,
    };
    let freed = 0;
    const core = { blank: () => { const d = fakeCore.blank(); const free = d.free.bind(d); d.free = () => { freed++; free(); }; return d; } };
    const blob = await sourceThumbnail(core, { color: "#fbf7ec", grid: GRID, image: null }, deps, () => createAssetStore());
    expect(blob?.type).toBe("image/png");
    expect(sizes).toEqual([[1920 * THUMB_SCALE, 1080 * THUMB_SCALE]]);
    expect(freed).toBe(1);
  });
});
```

Si `d.free = …` est refusé (propriété en lecture seule du double), remplacer par `vi.spyOn(d, "free")` et compter
`spy.mock.calls.length`.

Ajouter à `apps/web/src/app/thumbnail.test.ts` (même fichier, nouveau `describe`) :

```ts
describe("personnalisation-1b : renderPageImage (Q20, Q29)", () => {
  const ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
  function pageDeps() {
    const fills: string[] = [];
    const sizes: [number, number][] = [];
    const draws: unknown[][] = [];
    const painted: { rect: unknown; scale: number }[] = [];
    const ctx = {
      fillStyle: "",
      fillRect: vi.fn(function (this: { fillStyle: string }) { fills.push(this.fillStyle); }),
      drawImage: vi.fn((...a: unknown[]) => void draws.push(a)),
    } as unknown as CanvasRenderingContext2D;
    const deps: ThumbDeps = {
      canvas: (w, h): ExportCanvas => {
        sizes.push([w, h]);
        return { ctx, png: async () => new Uint8Array([0x89, 0x50]), release: () => undefined };
      },
      painter: () => ({ paintContent: (_c, _p, rect, scale) => void painted.push({ rect, scale }) }),
      decode: async () => ({ width: 1000, height: 500, close() {} }) as never,
    };
    return { deps, fills, sizes, draws, painted };
  }

  it("page entière à l'échelle 2 (3840 × 2160) : couleur de la page puis contenu", async () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0]!;
    d.apply({ type: "ApplyBackground", pages: [p], color: "#2f3e46", backdrop: null, grid: null });
    const { deps, fills, sizes, painted } = pageDeps();
    const blob = await renderPageImage(d, createAssetStore(async () => "x"), p, PAGE_IMAGE_SCALE, deps);
    expect(blob?.type).toBe("image/png");
    expect(sizes).toEqual([[3840, 2160]]);
    expect(fills.at(-1)).toBe("#2f3e46");
    expect(painted).toEqual([{ rect: { x0: 0, y0: 0, x1: 1920, y1: 1080 }, scale: 2 }]);
  });

  it("fond image dessiné sur son rect, à l'échelle", async () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0]!;
    const assets = createAssetStore(async () => ABC);
    await assets.put(new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }));
    d.apply({ type: "SetBackdrop", page: p, backdrop: { asset: { id: ABC, name: "f.png", mime: "image/png", size: 3 }, w: 1000, h: 500, fit: "width" } });
    const { deps, draws } = pageDeps();
    await renderPageImage(d, assets, p, 0.25, deps);
    expect(draws).toHaveLength(1);
    expect(draws[0]!.slice(1)).toEqual([0, 0, 480, 240]);
  });

  it("page inconnue : null, aucune toile", async () => {
    const { deps, sizes } = pageDeps();
    expect(await renderPageImage(fakeCore.blank(), createAssetStore(async () => "x"), "nulle-part", 2, deps)).toBeNull();
    expect(sizes).toEqual([]);
  });
});
```

et compléter l'import du haut : `import { GRID_THUMB_WORLD, PAGE_IMAGE_SCALE, renderPageImage, renderThumbnail, THUMB_MAX, thumbSize, type ThumbDeps } from "./thumbnail";`.

Commande : `cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/app/backgrounds-apply.test.ts src/app/thumbnail.test.ts 2>&1 | tail -12`
Attendu : `FAIL` (modules et fonctions absents).

- [ ] **Étape 2 : `renderPageImage` dans `apps/web/src/app/thumbnail.ts`.**

Après `renderThumbnail` :

```ts
/** personnalisation-1b (Q20) : échelle de « Cette page » : 1920 × 1080 → 3840 × 2160, net sur un écran à 200 %. */
export const PAGE_IMAGE_SCALE = 2;

/**
 * Page entière en PNG (personnalisation-1b, Q20, Q29) : cadre (0, 0, largeur × hauteur de `PageView`) à l'échelle
 * `scale` ; couleur de la page, fond `image` sur son rect, puis grille et objets par le peintre d'export
 * (`paintContent`, même code de dessin que l'écran). Un fond `pdf-page` n'est pas repris. Null : page inconnue.
 */
export async function renderPageImage(doc: CoreDocument, assets: AssetStore, pageId: string, scale: number, deps: ThumbDeps): Promise<Blob | null> {
  const page = doc.page(pageId);
  if (page === null) return null;
  const w = Math.max(1, Math.round(page.width * scale));
  const h = Math.max(1, Math.round(page.height * scale));
  const images = await loadImageSource(doc, assets, deps.decode);
  const canvas = deps.canvas(w, h);
  try {
    const ctx = canvas.ctx;
    ctx.fillStyle = "#ffffff";
    ctx.fillStyle = page.background;
    ctx.fillRect(0, 0, w, h);
    const b = page.backdrop;
    if (b !== null && b.kind === "image" && b.rect !== null) {
      const bmp = images.bitmap(b.asset);
      if (bmp !== null) ctx.drawImage(bmp, b.rect.x0 * scale, b.rect.y0 * scale, (b.rect.x1 - b.rect.x0) * scale, (b.rect.y1 - b.rect.y0) * scale);
    }
    const view = { id: pageId, elementIds: doc.elementIds(pageId) } satisfies PageView;
    deps.painter(ctx, doc, images).paintContent(ctx, view, { x0: 0, y0: 0, x1: page.width, y1: page.height }, scale);
    return new Blob([(await canvas.png()) as BlobPart], { type: "image/png" });
  } finally {
    canvas.release();
    images.dispose();
  }
}
```

(`PageView` importé du moteur est déjà dans le fichier ; la vue du cœur vient de `doc.page`.)

- [ ] **Étape 3 : écrire `apps/web/src/app/backgrounds-apply.ts`.**

```ts
/**
 * Appliquer un fond (personnalisation-1b, Q14, Q26, Q31, Q35, DA1) : un fond du pack devient une `BackgroundSource`
 * (couleur, grille, image) ; l'image entre au magasin `assets` de l'onglet (empreinte SHA-256 : un même fond sur 30 pages
 * = un seul asset), puis une seule commande `ApplyBackground` : une étape d'annulation. Partagé par l'interface et la CLI
 * (Q32) : `resolvePack` et `backgroundCommand` sont le chemin commun.
 */
import type { Command, CoreDocument, CoreFactory, PageView } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import type { PackBackground } from "../backgrounds/catalog";
import type { BackgroundSource } from "../backgrounds/source";
import { SVG_H, SVG_W, svgOf } from "../backgrounds/svg";
import { typed } from "./container-io";
import { renderPageImage, type ThumbDeps } from "./thumbnail";

export interface PackFiles {
  read(file: string): Promise<Blob>;
}
/** Dossier servi du pack, relatif au document (web et coque, `frontendDist`). */
export const PACK_BASE = "./backgrounds/";
export const missingPackFile = (file: string): string => `fond introuvable : ${file}`;
export const appliedMessage = (n: number): string => `Fond appliqué à ${n} pages`;
export const pdfKeptMessage = (n: number): string =>
  `${n} ${n > 1 ? "pages PDF gardent leur page" : "page PDF garde sa page"} : couleur et grille seulement`;
export const OUTSIDE_FRAME_MESSAGE = "objets hors du cadre non repris";
/** Miniatures rendues (Q29) : 1920 × 1080 → 480 × 270, deux fois la carte. */
export const THUMB_SCALE = 0.25;

export function fetchPackFiles(fetchFn: (url: string) => Promise<Response> = (u) => fetch(u), base: string = PACK_BASE): PackFiles {
  return {
    async read(file) {
      let r: Response;
      try {
        r = await fetchFn(`${base}${file}`);
      } catch {
        throw new Error(missingPackFile(file));
      }
      if (!r.ok) throw new Error(missingPackFile(file));
      return r.blob();
    },
  };
}

export async function resolvePack(b: PackBackground, files: PackFiles): Promise<BackgroundSource> {
  switch (b.kind) {
    case "color":
      return { color: b.color, grid: null, image: null };
    case "grid":
      return { color: b.color, grid: b.grid, image: null };
    case "svg": {
      const blob = new Blob([svgOf(b.id)], { type: "image/svg+xml" });
      return { color: b.color, grid: null, image: { blob, name: `${b.id}.svg`, mime: "image/svg+xml", w: SVG_W, h: SVG_H } };
    }
    case "photo": {
      const p = b.photo;
      if (p === null) throw new Error(missingPackFile(b.id));
      const blob = typed(await files.read(p.file), "image/webp");
      return { color: b.color, grid: null, image: { blob, name: `${b.id}.webp`, mime: "image/webp", w: p.w, h: p.h } };
    }
  }
}

export async function backgroundCommand(assets: Pick<AssetStore, "put">, src: BackgroundSource, pages: readonly string[]): Promise<Command> {
  const im = src.image;
  if (im === null) return { type: "ApplyBackground", pages, color: src.color, grid: src.grid, backdrop: null };
  const blob = typed(im.blob, im.mime);
  const id = await assets.put(blob);
  return {
    type: "ApplyBackground",
    pages,
    color: src.color,
    grid: src.grid,
    backdrop: { asset: { id, name: im.name, mime: im.mime, size: blob.size }, w: im.w, h: im.h, fit: "width" },
  };
}

export interface ApplyTarget {
  run(cmd: Command): unknown;
  readonly assets: Pick<AssetStore, "put">;
  pageIds(): readonly string[];
}

/** Vrai si la commande est prise (`run` ne rend pas null ; le moteur rend null sur un refus, message dans son état). */
export async function applyBackground(target: ApplyTarget, src: BackgroundSource, pages: "current" | "all", current: string): Promise<boolean> {
  const ids = pages === "all" ? target.pageIds() : [current];
  return target.run(await backgroundCommand(target.assets, src, ids)) !== null;
}

export function pdfPagesAmong(doc: Pick<CoreDocument, "page">, pages: readonly string[]): number {
  return pages.filter((p) => doc.page(p)?.backdrop?.kind === "pdf-page").length;
}

/** Q20 : un objet dépasse le cadre de la page (la page a une hauteur sans fin) : « Cette page » ne le reprend pas. */
export function outsideFrame(doc: Pick<CoreDocument, "page" | "elementIds" | "bounds">, pageId: string): boolean {
  const page = doc.page(pageId);
  const ids = doc.elementIds(pageId);
  if (page === null || ids.length === 0) return false;
  const b = doc.bounds(ids);
  return b !== null && (b.x0 < 0 || b.y0 < 0 || b.x1 > page.width || b.y1 > page.height);
}

/** Marqueur `data-look` de la scène (lu par les essais) : couleur|types de grille|genre:empreinte du fond. */
export function lookTag(page: PageView | null): string {
  if (page === null) return "";
  const grid = page.grid === null ? "-" : page.grid.levels.map((l) => l.kind).join("+") || "vide";
  const b = page.backdrop;
  return `${page.background}|${grid}|${b === null ? "-" : `${b.kind}:${b.asset.slice(0, 12)}`}`;
}

/** Miniature d'une source (Q29) : document temporaire d'une page, fond appliqué, rendu à `THUMB_SCALE`, puis libéré. */
export async function sourceThumbnail(core: Pick<CoreFactory, "blank">, src: BackgroundSource, deps: ThumbDeps, makeAssets: () => AssetStore): Promise<Blob | null> {
  const doc = core.blank();
  try {
    const page = doc.pageIds()[0];
    if (page === undefined) return null;
    const assets = makeAssets();
    doc.apply(await backgroundCommand(assets, src, [page]));
    return await renderPageImage(doc, assets, page, THUMB_SCALE, deps);
  } finally {
    doc.free();
  }
}
```

- [ ] **Étape 4 : marqueur `data-look` dans `apps/web/src/app/board-session.ts`.**

Import : `import { lookTag } from "./backgrounds-apply";`. Dans `mark`, juste après `stage.dataset["page"] = tags.page;` :

```ts
    // personnalisation-1b : aspect de la page montrée (couleur|grille|fond), lu par l'essai des fonds.
    stage.dataset["look"] = lookTag(doc.page(s.page));
```

- [ ] **Étape 5 : vert et non-régression.**

Commandes (dans `<wt>/apps/web`) :
`nice -n 10 pnpm exec vitest run src/app/backgrounds-apply.test.ts src/app/thumbnail.test.ts src/app/board-session.test.ts 2>&1 | tail -12`
Attendu : `Test Files  3 passed (3)`, aucun `FAIL` ; `backgrounds-apply.test.ts` : 9 tests, dont « Review Focus — photo
absente du pack » ; `thumbnail.test.ts` : 7 tests.
`nice -n 10 pnpm exec tsc --noEmit 2>&1 | tail -5` → aucune ligne `error TS`.

- [ ] **Étape 6 : commit.**

```bash
cd <wt>
for f in apps/web/src/app/backgrounds-apply.ts apps/web/src/app/backgrounds-apply.test.ts apps/web/src/app/thumbnail.ts apps/web/src/app/thumbnail.test.ts apps/web/src/app/board-session.ts; do git add "$f"; done
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(web): apply a background in one command, render a whole page as image, data-look stage tag" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport attendu.** Sorties `tail` de l'étape 5, lignes `Réutilisation : …`, sha du commit.

---

<a id="tache-t9"></a>
### Tâche T9 — Fenêtre des fonds (`BackgroundsDialog`)

**Objectif.** La fenêtre modale « comme MyViewBoard » : rail des sections à gauche, recherche et Fermer en haut, puces
des thèmes, grille de cartes 16:9 (≥ 192 px), interrupteur « Toutes les pages » en pied. Un toucher applique et ferme ;
un toucher qui a défilé n'applique pas ; un double toucher n'applique qu'une fois. Au clavier : focus dans la recherche
à l'ouverture, Tab recherche → sections → thèmes → cartes → « Toutes les pages » → Fermer, flèches, Début, Fin, Entrée
(cette page), Maj+Entrée (toutes les pages), Échap ferme ; Suppr, Retour arrière, Échap et Espace n'atteignent pas le
moteur, Ctrl et Méta remontent. Composant pur : il ne charge rien, il reçoit le pack, « Mes fonds », la recherche et des
rappels. Cadrage : Q16, Q25 à Q29, Q33, Q36, DA6 ; scénarios S1, S2, S5.

**Fichiers.**
- Créer : `apps/web/src/ui/BackgroundsDialog.tsx`, `apps/web/src/ui/backgrounds.css`
- Modifier : `apps/web/src/ui/RadioChoices.tsx` (`look`, `:22`, et le commentaire d'en-tête)
- Tester : `apps/web/src/ui/BackgroundsDialog.test.tsx`, `apps/web/src/ui/RadioChoices.test.tsx` (un test ajouté)

**Interfaces.**
- Consomme : `PackBackground`, `SECTIONS`, `DEFAULT_SECTION`, `ALL_THEMES`, `ALL_THEMES_LABEL`, `SectionId`
  (`backgrounds/catalog.ts`, T2) ; `BackgroundSearch`, `createBackgroundSearch` (`backgrounds/search.ts`, T3, tests) ;
  `MyBackground` (`app/my-backgrounds.ts`, T5) ; icônes `search`, `image-plus`, `file-plus`, `close` (`ui/icons.ts`, T6) ;
  `ENGINE_KEYS` (`app/table-picker.ts:41`) ; `Icon` (`ui/IconButton.tsx`).
- Produit :
  `type BackgroundCard = { readonly kind: "pack"; readonly key: string; readonly item: PackBackground } | { readonly kind: "mine"; readonly key: string; readonly item: MyBackground }` ;
  `function mineKey(e: MyBackground): string` (→ `mine:<e.file>`) ;
  `function cardsOf(pack: readonly PackBackground[], mine: readonly MyBackground[]): readonly BackgroundCard[]` (Mes fonds d'abord) ;
  `function searchDocsOf(pack: readonly PackBackground[], mine: readonly MyBackground[]): readonly SearchDoc[]` (clé `mine:<fichier>` pour Mes fonds, nom seul) ;
  `interface BackgroundsDialogProps { readonly pack: readonly PackBackground[]; readonly mine: readonly MyBackground[]; readonly search: BackgroundSearch; readonly notice: string | null; thumbOf(card: BackgroundCard): Promise<Blob | string | null>; apply(card: BackgroundCard, all: boolean): void; importImage(): void; addPage(): void; remove(entry: MyBackground): void; close(): void }` ;
  `function BackgroundsDialog(props: BackgroundsDialogProps): JSX.Element`.
- Sélecteurs (contrat avec T10 et l'essai T12) : racine `[role="dialog"][data-panel="backgrounds"]` (dans
  `.rb-bg-veil`) ; recherche `input[data-fonds="search"]` ; Fermer `button[data-fonds="close"]` ; rail
  `[data-edit="fonds-section"] [data-choice="<section>"]` ; puces `[data-edit="fonds-theme"] [data-choice="<thème>"]` ;
  carte `button[data-fond="<clé>"]` (pack : `id` ; Mes fonds : `mine:<fichier>`) ; retirer
  `button[data-fonds-remove="<fichier>"]` ; actions `button[data-fonds="import"]`, `button[data-fonds="page"]`, zone
  `[data-fonds="drop"]` ; interrupteur `button[role="switch"][data-fonds="all"]` ; aucun résultat
  `[data-fonds="empty"]` ; avis `[data-fonds="notice"]` ; vignette `.rb-bg-thumb`.
- `RadioChoicesProps.look` devient `"card" | "tile" | "segment" | "rail" | "chips"`.
- Réutilise : `apps/web/src/ui/RadioChoices.tsx:31-77` — étendre : `RadioChoices` + `look: "rail" | "chips"` (radiogroup, flèches, tabindex itinérant existants).
- Réutilise : `apps/web/src/app/table-picker.ts:41`, `ui/MenuBar.tsx:105-108` — `if (!e.ctrlKey && !e.metaKey && ENGINE_KEYS.has(e.key)) e.stopPropagation()`.
- Réutilise : `apps/web/src/ui/LibraryPanel.tsx:33-82` — patron recopié (carte à vignette, URL d'objet révoquée au démontage, bouton × de 44 px) ; composant non modifié.
- Le rapport porte, pour chacune de ces lignes, `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Contraintes (recopiées de Global Constraints).**
- VM partagée : builds et tests en `nice -n 10`, `cargo … -j 4`, `CARGO_TARGET_DIR=<worktree de la tâche>/target` (piège : cible partagée entre worktrees) ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; test isolé direct.
- Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`, `.`, `commit -a`) ; jamais `--force`.
- Aucun test désactivé, sauté, ni seuil modifié. Essais Playwright existants (sélecteurs `data-item`) restent verts sans réécriture.
- Aucune dépendance ajoutée sauf permissive et justifiée ; aucune AGPL/GPL/LGPL.
- Tactile d'abord (cibles ≥ 44 px, glisser aux événements de pointeur ; seul le dépôt de fichiers système passe par drop), clavier ensuite (raccourci par geste). Design : `docs/plans/design-cadrage.md` § 10 netteté (bords de 1 px sur coordonnées entières, icônes au calage `ICON_VIEWBOX`, texte sans franges).
- L'interface ne nomme aucun service extérieur ; provenances seulement dans `THIRD_PARTY_NOTICES.md` et le fichier de sources du pack.
- Aucun `tauri build`, aucun processus détaché laissé en marche.
- Préparation : `cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3`, puis les modules Wasm avec `apply_background` (exigés par `tsc`) :

```bash
cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH CARGO_TARGET_DIR=<wt>/target
[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/personnalisation-1b/apps/web/src/wasm-formats apps/web/src/
T1=/home/adminjd/projets/roomboard-wt/personnalisation-1b--T1/apps/web/src/wasm
if grep -q apply_background apps/web/src/wasm/roomboard_wasm.d.ts 2>/dev/null; then :
elif grep -q apply_background "$T1/roomboard_wasm.d.ts" 2>/dev/null; then rm -rf apps/web/src/wasm && cp -r "$T1" apps/web/src/wasm
else nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release -j 4 2>&1 | tail -2 && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm "$CARGO_TARGET_DIR/wasm32-unknown-unknown/release/roomboard_wasm.wasm"; fi
grep -c apply_background apps/web/src/wasm/roomboard_wasm.d.ts
```

**Interdits.** Ne pas toucher `rb.css` (styles dans `backgrounds.css`, jetons de `rb.css` seulement) ; ne pas modifier
`LibraryPanel.tsx` ; aucun glisser HTML5 (`draggable`) ; aucun appui long ; aucun aperçu en direct ; aucun nom de site,
« http » ou « www. » dans le composant ; pas de chargement réseau dans le composant (tout vient des props).

**Preuve visuelle.** Le profil n'a pas de commande de preuve visuelle automatique : les lectures sont les tests
(attributs `aria-checked`, `data-*`, focus) ; les captures 2x sont faites par T12.

**Terminé quand.** `BackgroundsDialog.test.tsx` passe (≥ 11 tests), `RadioChoices.test.tsx` vert, `tsc` propre, commit
fait.

**Étapes.**

- [ ] **Étape 1 : test de `RadioChoices` (rouge).**

Dans `apps/web/src/ui/RadioChoices.test.tsx`, ajouter (le `setup` du fichier prend `look` en premier argument ; sinon
rendre directement) :

```tsx
  it("personnalisation-1b : aspects rail et chips : data-look posé, flèches comme les autres", () => {
    for (const look of ["rail", "chips"] as const) {
      const choose = vi.fn();
      const r = render(() => <RadioChoices name="essai" label="Essai" look={look} options={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} value="a" choose={choose} />);
      const group = r.container.querySelector('[role="radiogroup"]')!;
      expect(group.getAttribute("data-look")).toBe(look);
      fireEvent.keyDown(r.container.querySelector('[data-choice="a"]')!, { key: "ArrowRight" });
      expect(choose).toHaveBeenCalledWith("b");
      r.unmount();
    }
  });
```

Commande : `cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/ui/RadioChoices.test.tsx 2>&1 | tail -8`
Attendu : le test passe à l'exécution mais `tsc` refuse `look="rail"` : `nice -n 10 pnpm exec tsc --noEmit 2>&1 | grep -c "RadioChoices"` ≥ 1.

- [ ] **Étape 2 : étendre `RadioChoices`.**

`apps/web/src/ui/RadioChoices.tsx` : `readonly look: "card" | "tile" | "segment" | "rail" | "chips";` et, dans le
commentaire d'en-tête, remplacer « Trois aspects : cartes (démarrage), vignettes (emplacement), segments (taille,
barre). » par « Cinq aspects : cartes (démarrage), vignettes (emplacement), segments (taille, barre), rail et puces
(sections et thèmes de la fenêtre des fonds, styles dans `backgrounds.css`). »

Commande : `nice -n 10 pnpm exec vitest run src/ui/RadioChoices.test.tsx 2>&1 | tail -6` → aucun `FAIL`.

- [ ] **Étape 3 : écrire `apps/web/src/ui/BackgroundsDialog.test.tsx` (rouge).**

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MyBackground } from "../app/my-backgrounds";
import type { PackBackground } from "../backgrounds/catalog";
import { createBackgroundSearch } from "../backgrounds/search";
import { BackgroundsDialog, searchDocsOf, type BackgroundCard } from "./BackgroundsDialog";

afterEach(cleanup);

const pb = (id: string, section: PackBackground["section"], theme: string, label: string, keywords: string[], kind: PackBackground["kind"] = "color"): PackBackground =>
  ({ id, section, theme, label, keywords, kind, color: "#ffffff", grid: null, photo: null });
const PACK: readonly PackBackground[] = [
  pb("blanc", "colors", "claires", "Blanc (aucun fond)", ["blanc"]),
  pb("creme", "colors", "claires", "Crème", ["crème"]),
  pb("ardoise", "colors", "sombres", "Ardoise", ["ardoise", "tableau noir"]),
  pb("seyes-8mm", "lines", "seyes", "Seyès 8 mm", ["seyès", "cahier"], "grid"),
  pb("portees-moyennes", "lines", "portees", "Portées moyennes", ["portée", "musique"], "grid"),
  pb("venn", "lessons", "reflexion", "Diagramme de Venn", ["venn"], "svg"),
];
const MINE: readonly MyBackground[] = [{ file: "page-1.json", name: "Page 1 — 27/11 10:00", created: "2026-11-27T10:00:00.000Z", origin: "page", color: "#ffffff", grid: null, image: { file: "page-1.png", mime: "image/png", w: 3840, h: 2160 } }];
const TRACES = ["polyhaven", "poly haven", "wikimedia", "commons", "openverse", "flickr", "unsplash", "pixabay", "pexels", "http", "www."];

function setup(over: Partial<{ mine: readonly MyBackground[]; notice: string | null; thumb: Blob | string | null }> = {}) {
  const apply = vi.fn<(c: BackgroundCard, all: boolean) => void>();
  const close = vi.fn();
  const importImage = vi.fn();
  const addPage = vi.fn();
  const remove = vi.fn();
  const thumbOf = vi.fn(async () => over.thumb ?? null);
  const mine = over.mine ?? [];
  const r = render(() => (
    <BackgroundsDialog pack={PACK} mine={mine} search={createBackgroundSearch(searchDocsOf(PACK, mine))} notice={over.notice ?? null}
      thumbOf={thumbOf} apply={apply} importImage={importImage} addPage={addPage} remove={remove} close={close} />
  ));
  const q = <T extends Element>(sel: string): T => {
    const el = r.container.querySelector<T>(sel);
    if (el === null) throw new Error(`absent : ${sel}`);
    return el;
  };
  const cards = (): string[] => [...r.container.querySelectorAll<HTMLElement>("button[data-fond]")].map((b) => b.dataset["fond"]!);
  return { ...r, q, cards, apply, close, importImage, addPage, remove, thumbOf };
}
const flush = (): Promise<void> => new Promise((ok) => setTimeout(ok, 0));
const typeIn = (el: HTMLInputElement, v: string): void => {
  el.value = v;
  fireEvent.input(el);
};

describe("personnalisation-1b : fenêtre des fonds (Q25 à Q29)", () => {
  it("ouverture : section Couleurs, focus dans la recherche, rail et puces en radiogroup, modale", async () => {
    const { q, cards } = setup();
    await flush();
    const dialog = q<HTMLElement>('[role="dialog"]');
    expect([dialog.getAttribute("aria-modal"), dialog.dataset["panel"]]).toEqual(["true", "backgrounds"]);
    expect(q('[data-edit="fonds-section"] [data-choice="colors"]').getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(q('input[data-fonds="search"]'));
    expect(q('[data-edit="fonds-theme"]').getAttribute("role")).toBe("radiogroup");
    expect(cards()).toEqual(["blanc", "creme", "ardoise"]);
    fireEvent.click(q('[data-edit="fonds-theme"] [data-choice="sombres"]'));
    expect(cards()).toEqual(["ardoise"]);
    fireEvent.click(q('[data-edit="fonds-section"] [data-choice="lines"]'));
    expect(cards()).toEqual(["seyes-8mm", "portees-moyennes"]);
  });

  it("toucher une carte applique à la page montrée, une seule fois (double toucher, Review Focus)", () => {
    const { q, apply } = setup();
    const card = q('button[data-fond="ardoise"]');
    fireEvent.pointerDown(card, { clientX: 10, clientY: 10 });
    fireEvent.click(card);
    fireEvent.click(card);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply.mock.calls[0]![0]).toMatchObject({ kind: "pack", key: "ardoise" });
    expect(apply.mock.calls[0]![1]).toBe(false);
  });

  it("« Toutes les pages » (interrupteur) : le toucher applique à toutes", () => {
    const { q, apply } = setup();
    const sw = q('button[role="switch"][data-fonds="all"]');
    expect(sw.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(sw);
    expect(sw.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(q('button[data-fond="creme"]'));
    expect(apply.mock.calls[0]![1]).toBe(true);
  });

  it("un toucher qui a défilé n'applique pas (Review Focus, Q27)", () => {
    const { q, apply } = setup();
    const card = q('button[data-fond="creme"]');
    fireEvent.pointerDown(card, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(card, { clientX: 100, clientY: 140 });
    fireEvent.click(card);
    expect(apply).not.toHaveBeenCalled();
    fireEvent.pointerDown(card, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(card, { clientX: 104, clientY: 103 });
    fireEvent.click(card);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("Entrée applique à la page, Maj+Entrée à toutes ; flèches, Début, Fin déplacent le focus", async () => {
    const a = setup();
    const first = a.q<HTMLButtonElement>('button[data-fond="blanc"]');
    expect(first.tabIndex).toBe(0);
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    await flush();
    expect(document.activeElement).toBe(a.q('button[data-fond="creme"]'));
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    await flush();
    expect(document.activeElement).toBe(a.q('button[data-fond="ardoise"]'));
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    await flush();
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: "Enter", shiftKey: true });
    expect(a.apply.mock.calls[0]![1]).toBe(true);
    cleanup();
    const b = setup();
    fireEvent.keyDown(b.q('button[data-fond="creme"]'), { key: "Enter" });
    expect(b.apply.mock.calls[0]).toEqual([expect.objectContaining({ key: "creme" }), false]);
  });

  it("Suppr, Retour arrière, Espace et Échap ne remontent pas ; Ctrl+Z remonte ; Échap ferme", () => {
    const { q, close } = setup();
    const seen: string[] = [];
    const listen = (e: KeyboardEvent): void => void seen.push(`${e.ctrlKey ? "Ctrl+" : ""}${e.key}`);
    window.addEventListener("keydown", listen);
    try {
      const input = q('input[data-fonds="search"]');
      for (const key of ["Delete", "Backspace", " "]) fireEvent.keyDown(input, { key, bubbles: true });
      fireEvent.keyDown(input, { key: "z", ctrlKey: true, bubbles: true });
      expect(seen).toEqual(["Ctrl+z"]);
      expect(close).not.toHaveBeenCalled();
      fireEvent.keyDown(q('button[data-fond="creme"]'), { key: "Escape", bubbles: true });
      expect(seen).toEqual(["Ctrl+z"]);
      expect(close).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener("keydown", listen);
    }
  });

  it("recherche : « Résultats » remplace la section ; aucun résultat : message et suggestion ; champ vidé : retour", () => {
    const { q, cards, container } = setup();
    const input = q<HTMLInputElement>('input[data-fonds="search"]');
    typeIn(input, "tableau noir");
    expect(container.textContent).toContain("Résultats");
    expect(cards()[0]).toBe("ardoise");
    expect(container.querySelector('[data-edit="fonds-theme"]')).toBeNull();
    typeIn(input, "musiqe");
    expect(cards()).toEqual(["portees-moyennes"]);
    typeIn(input, "zzzzzzzz");
    expect(cards()).toEqual([]);
    expect(q('[data-fonds="empty"]').textContent).toContain("Aucun fond ne correspond");
    typeIn(input, "solfeje zzzzzzzz");
    expect(q('[data-fonds="empty"]').textContent).toContain("« solfège »");
    typeIn(input, "");
    expect(cards()).toEqual(["blanc", "creme", "ardoise"]);
  });

  it("Mes fonds : trois actions, cartes avec × de 44 px, retirer et actions appellent leurs rappels", () => {
    const { q, cards, importImage, addPage, remove } = setup({ mine: MINE });
    fireEvent.click(q('[data-edit="fonds-section"] [data-choice="mine"]'));
    expect(cards()).toEqual(["mine:page-1.json"]);
    expect(q('[data-fonds="drop"]').textContent).toBe("Déposez une image ici");
    fireEvent.click(q('button[data-fonds="import"]'));
    fireEvent.click(q('button[data-fonds="page"]'));
    fireEvent.click(q('button[data-fonds-remove="page-1.json"]'));
    expect([importImage.mock.calls.length, addPage.mock.calls.length]).toEqual([1, 1]);
    expect(remove).toHaveBeenCalledWith(MINE[0]);
    expect(q('button[data-fonds-remove="page-1.json"]').getAttribute("aria-label")).toBe("Retirer Page 1 — 27/11 10:00");
  });

  it("avis montré dans la fenêtre ; Fermer et le voile ferment", () => {
    const { q, close } = setup({ notice: "seules les images deviennent des fonds" });
    expect(q('[data-fonds="notice"]').textContent).toBe("seules les images deviennent des fonds");
    fireEvent.click(q('button[data-fonds="close"]'));
    fireEvent.pointerDown(q(".rb-bg-veil"));
    expect(close).toHaveBeenCalledTimes(2);
  });

  it("miniatures : couleur sans miniature ; Blob en URL d'objet révoquée au démontage ; chaîne telle quelle", async () => {
    const created: string[] = [];
    const revoked: string[] = [];
    const make = vi.spyOn(URL, "createObjectURL").mockImplementation(() => { const u = `blob:essai-${created.length}`; created.push(u); return u; });
    const drop = vi.spyOn(URL, "revokeObjectURL").mockImplementation((u) => void revoked.push(u));
    try {
      const { q, thumbOf, unmount } = setup({ thumb: new Blob([new Uint8Array([1])], { type: "image/png" }) });
      await flush();
      expect(thumbOf).not.toHaveBeenCalled();
      fireEvent.click(q('[data-edit="fonds-section"] [data-choice="lines"]'));
      await flush();
      expect(thumbOf).toHaveBeenCalledTimes(2);
      expect(q<HTMLImageElement>('button[data-fond="seyes-8mm"] img').getAttribute("src")).toMatch(/^blob:essai-/);
      unmount();
      expect(revoked.sort()).toEqual(created.sort());
    } finally {
      make.mockRestore();
      drop.mockRestore();
    }
  });

  it("aucune trace d'un service extérieur dans le texte visible ni dans le fichier du composant (Q33)", () => {
    const { container } = setup({ mine: MINE });
    const text = (container.textContent ?? "").toLowerCase();
    const source = readFileSync(new URL("./BackgroundsDialog.tsx", import.meta.url), "utf8").toLowerCase();
    for (const t of TRACES) {
      expect(text, t).not.toContain(t);
      expect(source, t).not.toContain(t);
    }
  });
});
```

Commande : `cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/ui/BackgroundsDialog.test.tsx 2>&1 | tail -10`
Attendu : `FAIL`, « Failed to resolve import "./BackgroundsDialog" ».

- [ ] **Étape 4 : écrire `apps/web/src/ui/backgrounds.css`.**

```css
/* Fenêtre des fonds (personnalisation-1b, Q25, DA6) : jetons de rb.css seulement, aucune règle de rb.css recopiée.
   Cibles ≥ 44 px (48 px pour le rail, la recherche, Fermer, les actions et l'interrupteur) ; bords de 1 px sur des
   coordonnées entières (§ 10 netteté). */
.rb-bg-veil { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; background: rgba(13, 27, 42, 0.32); }
.rb-bg-dialog {
  display: grid; grid-template-columns: 1fr auto; grid-template-rows: auto minmax(0, 1fr) auto;
  grid-template-areas: "head close" "body body" "foot foot";
  inline-size: min(1200px, 92vw); block-size: min(760px, 88vh);
  background: var(--rf-white); border-radius: var(--rf-radius-xl); box-shadow: var(--rf-shadow-modal); color: var(--rf-navy-500); overflow: hidden;
}
.rb-bg-head { grid-area: head; display: flex; align-items: center; gap: var(--rf-space-md); padding: var(--rf-space-md) 0 var(--rf-space-md) var(--rf-space-lg); }
.rb-bg-head h2 { margin: 0; font-size: 20px; font-weight: 600; line-height: 28px; }
.rb-bg-search { flex: 1; display: flex; align-items: center; gap: var(--rf-space-sm); min-block-size: var(--rb-btn-m); padding: 0 var(--rb-pad); border: 1px solid var(--rf-gray-300); border-radius: var(--rf-radius-lg); color: var(--rf-text-muted-aa); }
.rb-bg-search:focus-within { outline: 2px solid var(--rf-violet-600); outline-offset: 0; }
.rb-bg-search input { flex: 1; min-block-size: 44px; border: none; outline: none; background: transparent; color: var(--rf-navy-500); font: inherit; font-size: 16px; }
.rb-bg-close { grid-area: close; align-self: center; margin: var(--rf-space-md) var(--rf-space-md) var(--rf-space-md) 0; display: inline-grid; place-items: center; inline-size: var(--rb-btn-m); block-size: var(--rb-btn-m); border: none; border-radius: var(--rf-radius-lg); background: transparent; color: var(--rf-navy-500); }
.rb-bg-body { grid-area: body; display: grid; grid-template-columns: 220px minmax(0, 1fr); min-block-size: 0; border-block: 1px solid var(--rf-gray-300); }
.rb-bg-rail { padding: var(--rf-space-sm); border-inline-end: 1px solid var(--rf-gray-300); overflow-y: auto; }
.rb-radios[data-look="rail"] { display: flex; flex-direction: column; gap: 2px; }
.rb-radios[data-look="rail"] .rb-radio { display: flex; align-items: center; gap: var(--rf-space-sm); min-block-size: 48px; padding: 0 var(--rb-pad); border: none; border-radius: var(--rf-radius-lg); background: transparent; color: var(--rf-navy-500); font: inherit; font-size: 15px; text-align: start; }
.rb-radios[data-look="rail"] .rb-radio[aria-checked="true"] { background: var(--rf-violet-100); color: var(--rf-violet-700); }
.rb-radios[data-look="chips"] { display: flex; flex-wrap: wrap; gap: var(--rf-space-sm); padding-block-end: var(--rf-space-md); }
.rb-radios[data-look="chips"] .rb-radio { min-block-size: 44px; padding: 0 var(--rf-space-md); border: 1px solid var(--rf-gray-300); border-radius: 22px; background: var(--rf-white); color: var(--rf-navy-500); font: inherit; font-size: 14px; }
.rb-radios[data-look="chips"] .rb-radio[aria-checked="true"] { border-color: var(--rf-violet-600); background: var(--rf-violet-100); color: var(--rf-violet-700); }
.rb-bg-main { min-block-size: 0; overflow-y: auto; padding: var(--rf-space-md) var(--rf-space-lg); touch-action: pan-y; }
.rb-bg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(192px, 1fr)); gap: var(--rf-space-md); }
.rb-bg-card { position: relative; }
.rb-bg-pick { display: flex; flex-direction: column; gap: var(--rf-space-xs); inline-size: 100%; padding: 0; border: none; background: transparent; color: var(--rf-navy-500); font: inherit; text-align: start; cursor: pointer; }
.rb-bg-thumb { display: block; aspect-ratio: 16 / 9; inline-size: 100%; border: 1px solid var(--rf-gray-300); border-radius: var(--rf-radius-lg); overflow: hidden; }
.rb-bg-thumb img { display: block; inline-size: 100%; block-size: 100%; object-fit: cover; }
.rb-bg-pick:hover .rb-bg-thumb, .rb-bg-pick:focus-visible .rb-bg-thumb { outline: 2px solid var(--rf-violet-600); outline-offset: 0; }
.rb-bg-label { font-size: 14px; line-height: 20px; min-block-size: 20px; }
.rb-bg-remove { position: absolute; inset-block-start: 4px; inset-inline-end: 4px; display: inline-grid; place-items: center; inline-size: 44px; block-size: 44px; border: none; border-radius: var(--rf-radius-lg); background: rgba(255, 255, 255, 0.92); color: var(--rf-navy-500); box-shadow: var(--rf-shadow-card); }
.rb-bg-actions { display: flex; flex-wrap: wrap; gap: var(--rf-space-sm); padding-block-end: var(--rf-space-md); }
.rb-bg-actions button { display: inline-flex; align-items: center; gap: var(--rf-space-sm); min-block-size: 48px; padding: 0 var(--rf-space-md); border: 1px solid var(--rf-gray-300); border-radius: var(--rf-radius-lg); background: var(--rf-white); color: var(--rf-navy-500); font: inherit; }
.rb-bg-drop { flex: 1; display: grid; place-items: center; min-block-size: 48px; min-inline-size: 220px; border: 1px dashed var(--rf-gray-300); border-radius: var(--rf-radius-lg); color: var(--rf-text-muted-aa); }
.rb-bg-results { margin: 0 0 var(--rf-space-md); font-size: 15px; font-weight: 600; }
.rb-bg-empty, .rb-bg-notice { margin: 0 0 var(--rf-space-md); color: var(--rf-text-muted-aa); }
.rb-bg-foot { grid-area: foot; display: flex; align-items: center; justify-content: space-between; gap: var(--rf-space-md); padding: var(--rf-space-sm) var(--rf-space-lg); }
.rb-bg-switch { display: inline-flex; align-items: center; gap: var(--rf-space-sm); min-block-size: 48px; padding: 0 var(--rf-space-sm); border: none; border-radius: var(--rf-radius-lg); background: transparent; color: var(--rf-navy-500); font: inherit; }
.rb-bg-knob { position: relative; inline-size: 40px; block-size: 24px; border-radius: 12px; background: var(--rf-gray-300); }
.rb-bg-knob::after { content: ""; position: absolute; inset-block-start: 2px; inset-inline-start: 2px; inline-size: 20px; block-size: 20px; border-radius: 50%; background: var(--rf-white); box-shadow: var(--rf-shadow-card); }
.rb-bg-switch[aria-checked="true"] .rb-bg-knob { background: var(--rf-violet-600); }
.rb-bg-switch[aria-checked="true"] .rb-bg-knob::after { inset-inline-start: 18px; }
.rb-bg-hint { font-size: 13px; color: var(--rf-text-muted-aa); }
.rb-bg-dialog button:focus-visible { outline: 2px solid var(--rf-violet-600); outline-offset: 0; }
.rb-bg-close:hover, .rb-bg-actions button:hover, .rb-bg-switch:hover, .rb-radios[data-look="rail"] .rb-radio:not([aria-checked="true"]):hover { background: var(--rf-gray-50); }
```

- [ ] **Étape 5 : écrire `apps/web/src/ui/BackgroundsDialog.tsx`.**

```tsx
/**
 * Fenêtre des fonds (personnalisation-1b, Q16, Q25 à Q29, Q33, Q36, DA6) : modale centrée, rail des sections, recherche,
 * puces des thèmes, grille de cartes 16:9, interrupteur « Toutes les pages ». Un toucher applique et ferme (Q26) ; un
 * toucher qui a défilé n'applique pas (Q27) ; un double toucher n'applique qu'une fois ; Entrée : cette page,
 * Maj+Entrée : toutes les pages (Q28). Suppr, Retour arrière, Échap et Espace restent à la fenêtre ; Ctrl ou Méta
 * remontent (Ctrl+Z). Composant pur : pack, « Mes fonds », recherche et miniatures viennent des props.
 */
import { createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show, type JSX } from "solid-js";
import type { MyBackground } from "../app/my-backgrounds";
import { ENGINE_KEYS } from "../app/table-picker";
import { ALL_THEMES, ALL_THEMES_LABEL, DEFAULT_SECTION, SECTIONS, type PackBackground, type SectionId } from "../backgrounds/catalog";
import type { BackgroundSearch, SearchDoc } from "../backgrounds/search";
import { Icon } from "./IconButton";
import { RadioChoices } from "./RadioChoices";
import "./backgrounds.css";

export type BackgroundCard =
  | { readonly kind: "pack"; readonly key: string; readonly item: PackBackground }
  | { readonly kind: "mine"; readonly key: string; readonly item: MyBackground };

export interface BackgroundsDialogProps {
  readonly pack: readonly PackBackground[];
  readonly mine: readonly MyBackground[];
  readonly search: BackgroundSearch;
  readonly notice: string | null;
  /** Miniature : Blob (URL d'objet révoquée au démontage), chaîne (adresse du pack) ou null (aucune). */
  thumbOf(card: BackgroundCard): Promise<Blob | string | null>;
  apply(card: BackgroundCard, all: boolean): void;
  importImage(): void;
  addPage(): void;
  remove(entry: MyBackground): void;
  close(): void;
}

/** Au-delà de ce déplacement (px CSS), le doigt a fait défiler la grille : le toucher n'applique pas (Q27). */
const MOVE_SLOP = 10;
/** Largeur minimale d'une carte (Q25), pour les flèches haut et bas. */
const CARD_MIN = 192;

export const mineKey = (e: MyBackground): string => `mine:${e.file}`;
export const cardsOf = (pack: readonly PackBackground[], mine: readonly MyBackground[]): readonly BackgroundCard[] => [
  ...mine.map((item): BackgroundCard => ({ kind: "mine", key: mineKey(item), item })),
  ...pack.map((item): BackgroundCard => ({ kind: "pack", key: item.id, item })),
];
export const searchDocsOf = (pack: readonly PackBackground[], mine: readonly MyBackground[]): readonly SearchDoc[] => [
  ...mine.map((e) => ({ id: mineKey(e), label: e.name, keywords: [] })),
  ...pack.map((b) => ({ id: b.id, label: b.label, keywords: b.keywords })),
];
const labelOf = (c: BackgroundCard): string => (c.kind === "pack" ? c.item.label : c.item.name);

function Thumb(props: { readonly card: BackgroundCard; thumbOf(card: BackgroundCard): Promise<Blob | string | null> }): JSX.Element {
  const [src, setSrc] = createSignal<string | null>(null);
  let url: string | null = null;
  let alive = true;
  onCleanup(() => {
    alive = false;
    if (url !== null) URL.revokeObjectURL(url);
  });
  const c = props.card;
  // Couleur : pastille CSS seule (Q29) ; le reste : SVG, rendu de grille, miniature livrée ou enregistrée.
  if (!(c.kind === "pack" && c.item.kind === "color")) {
    void props
      .thumbOf(c)
      .then((t) => {
        if (!alive || t === null) return;
        if (typeof t === "string") setSrc(t);
        else {
          url = URL.createObjectURL(t);
          setSrc(url);
        }
      })
      .catch(() => undefined);
  }
  return (
    <span class="rb-bg-thumb" style={{ "background-color": c.item.color }}>
      <Show when={src()}>{(s) => <img src={s()} alt="" loading="lazy" decoding="async" draggable={false} />}</Show>
    </span>
  );
}

export function BackgroundsDialog(props: BackgroundsDialogProps): JSX.Element {
  let searchField: HTMLInputElement | undefined;
  let grid: HTMLDivElement | undefined;
  const [section, setSection] = createSignal<SectionId>(DEFAULT_SECTION);
  const [theme, setTheme] = createSignal<string>(ALL_THEMES);
  const [query, setQuery] = createSignal("");
  const [all, setAll] = createSignal(false);
  const [focus, setFocus] = createSignal(0);
  let applied = false;
  let down: { readonly x: number; readonly y: number } | null = null;
  let moved = false;

  const searching = (): boolean => query().trim() !== "";
  const cards = createMemo(() => cardsOf(props.pack, props.mine));
  const byKey = createMemo(() => new Map(cards().map((c) => [c.key, c] as const)));
  const shown = createMemo((): readonly BackgroundCard[] => {
    if (searching()) return props.search.search(query()).flatMap((k) => byKey().get(k) ?? []);
    if (section() === "mine") return cards().filter((c) => c.kind === "mine");
    return cards().filter((c) => c.kind === "pack" && c.item.section === section() && (theme() === ALL_THEMES || c.item.theme === theme()));
  });
  const themes = createMemo(() => {
    const s = SECTIONS.find((x) => x.id === section());
    return s === undefined || s.themes.length === 0 ? [] : [{ value: ALL_THEMES, label: ALL_THEMES_LABEL }, ...s.themes.map((t) => ({ value: t.id, label: t.label }))];
  });
  createEffect(on(shown, () => setFocus(0), { defer: true }));
  onMount(() => queueMicrotask(() => searchField?.focus()));

  const choose = (c: BackgroundCard, everyPage: boolean): void => {
    if (applied) return; // un double toucher n'applique qu'une fois (une étape, D38)
    applied = true;
    props.apply(c, everyPage);
  };
  const onKey = (e: KeyboardEvent): void => {
    if (!e.ctrlKey && !e.metaKey && ENGINE_KEYS.has(e.key)) e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      props.close();
    }
  };
  const columns = (): number => Math.max(1, Math.floor((grid?.clientWidth ?? 0) / CARD_MIN));
  const moveFocus = (to: number): void => {
    const n = shown().length;
    if (n === 0) return;
    const i = Math.min(n - 1, Math.max(0, to));
    setFocus(i);
    queueMicrotask(() => grid?.querySelectorAll<HTMLElement>("button[data-fond]")[i]?.focus());
  };
  const STEPS: Readonly<Record<string, () => number>> = { ArrowLeft: () => -1, ArrowRight: () => 1, ArrowUp: () => -columns(), ArrowDown: () => columns() };
  const onCardKey = (e: KeyboardEvent, c: BackgroundCard, i: number): void => {
    if (e.key === "Enter") {
      e.preventDefault();
      choose(c, e.shiftKey || all());
      return;
    }
    const step = Object.hasOwn(STEPS, e.key) ? STEPS[e.key] : undefined;
    if (step !== undefined) {
      e.preventDefault();
      moveFocus(i + step());
    } else if (e.key === "Home") {
      e.preventDefault();
      moveFocus(0);
    } else if (e.key === "End") {
      e.preventDefault();
      moveFocus(shown().length - 1);
    }
  };
  const onDown = (e: PointerEvent): void => {
    down = { x: e.clientX, y: e.clientY };
    moved = false;
  };
  const onMove = (e: PointerEvent): void => {
    if (down !== null && Math.hypot(e.clientX - down.x, e.clientY - down.y) > MOVE_SLOP) moved = true;
  };
  const onClick = (c: BackgroundCard): void => {
    const scrolled = moved;
    down = null;
    moved = false;
    if (!scrolled) choose(c, all());
  };

  return (
    <div class="rb-bg-veil" onPointerDown={(e) => { if (e.target === e.currentTarget) props.close(); }}>
      <div class="rb-bg-dialog" role="dialog" aria-modal="true" aria-labelledby="rb-bg-title" data-panel="backgrounds" onKeyDown={onKey}>
        <header class="rb-bg-head">
          <h2 id="rb-bg-title">Fonds</h2>
          <label class="rb-bg-search">
            <Icon name="search" />
            <input ref={searchField} type="search" data-fonds="search" aria-label="Rechercher un fond" placeholder="Rechercher un fond" value={query()} onInput={(e) => setQuery(e.currentTarget.value)} />
          </label>
        </header>
        <div class="rb-bg-body">
          <nav class="rb-bg-rail" aria-label="Sections">
            <RadioChoices
              name="fonds-section"
              label="Sections"
              look="rail"
              options={SECTIONS.map((s) => ({ value: s.id, label: s.label, icon: s.icon }))}
              value={section()}
              choose={(v) => {
                setSection(v);
                setTheme(ALL_THEMES);
                setQuery("");
              }}
            />
          </nav>
          <section class="rb-bg-main" aria-label="Fonds">
            <Show when={!searching() && themes().length > 0}>
              <RadioChoices name="fonds-theme" label="Thèmes" look="chips" options={themes()} value={theme()} choose={(v) => setTheme(v)} />
            </Show>
            <Show when={!searching() && section() === "mine"}>
              <div class="rb-bg-actions">
                <button type="button" data-fonds="import" onClick={() => props.importImage()}>
                  <Icon name="image-plus" />
                  <span>Importer une image…</span>
                </button>
                <button type="button" data-fonds="page" onClick={() => props.addPage()}>
                  <Icon name="file-plus" />
                  <span>Cette page</span>
                </button>
                <div class="rb-bg-drop" data-fonds="drop">Déposez une image ici</div>
              </div>
            </Show>
            <Show when={searching()}>
              <h3 class="rb-bg-results">Résultats</h3>
            </Show>
            <Show when={props.notice}>{(m) => <p class="rb-bg-notice" data-fonds="notice" role="status">{m()}</p>}</Show>
            <Show when={searching() && shown().length === 0}>
              <p class="rb-bg-empty" data-fonds="empty">
                Aucun fond ne correspond
                <Show when={props.search.suggest(query())}>{(s) => <> — essayez « {s()} »</>}</Show>
              </p>
            </Show>
            <div ref={grid} class="rb-bg-grid" onPointerDown={onDown} onPointerMove={onMove} onPointerCancel={() => (moved = true)}>
              <For each={shown()}>
                {(c, i) => (
                  <div class="rb-bg-card">
                    <button type="button" class="rb-bg-pick" data-fond={c.key} aria-label={labelOf(c)} tabIndex={i() === focus() ? 0 : -1}
                      onClick={() => onClick(c)} onKeyDown={(e) => onCardKey(e, c, i())} onFocus={() => setFocus(i())}>
                      <Thumb card={c} thumbOf={(x) => props.thumbOf(x)} />
                      <span class="rb-bg-label">{labelOf(c)}</span>
                    </button>
                    <Show when={c.kind === "mine" ? c.item : null}>
                      {(e) => (
                        <button type="button" class="rb-bg-remove" data-fonds-remove={e().file} aria-label={`Retirer ${e().name}`} onClick={() => props.remove(e())}>
                          <Icon name="close" />
                        </button>
                      )}
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </section>
        </div>
        <footer class="rb-bg-foot">
          <button type="button" role="switch" class="rb-bg-switch" data-fonds="all" aria-checked={all()} onClick={() => setAll(!all())}>
            <span class="rb-bg-knob" aria-hidden="true" />
            <span>Toutes les pages</span>
          </button>
          <span class="rb-bg-hint">Entrée : cette page · Maj+Entrée : toutes les pages · Ctrl+Maj+F : ouvrir ou fermer</span>
        </footer>
        {/* Fermer : en haut à droite (grille CSS), dernier dans l'ordre de tabulation (Q28). */}
        <button type="button" class="rb-bg-close" data-fonds="close" aria-label="Fermer" title="Fermer (Échap)" onClick={() => props.close()}>
          <Icon name="close" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Étape 6 : vert et types.**

Commandes (dans `<wt>/apps/web`) :
`nice -n 10 pnpm exec vitest run src/ui/BackgroundsDialog.test.tsx src/ui/RadioChoices.test.tsx 2>&1 | tail -12`
Attendu : `Test Files  2 passed (2)`, aucun `FAIL` ; `BackgroundsDialog.test.tsx` : 11 tests, dont « un toucher qui a
défilé n'applique pas » et « double toucher ». Si happy-dom ne transmet pas `clientX` des `PointerEvent`, construire les
événements par `new PointerEvent("pointermove", { clientX, clientY, bubbles: true })` puis `dispatchEvent` (le
comportement testé ne change pas).
`nice -n 10 pnpm exec tsc --noEmit 2>&1 | tail -5` → aucune ligne `error TS`.

- [ ] **Étape 7 : commit.**

```bash
cd <wt>
for f in apps/web/src/ui/BackgroundsDialog.tsx apps/web/src/ui/BackgroundsDialog.test.tsx apps/web/src/ui/backgrounds.css apps/web/src/ui/RadioChoices.tsx apps/web/src/ui/RadioChoices.test.tsx; do git add "$f"; done
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(web): backgrounds dialog, touch first then keyboard, rail and chips looks" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport attendu.** Sorties `tail` de l'étape 6, lignes `Réutilisation : …`, sha du commit.

---

<a id="tache-t10"></a>
### Tâche T10 — Intégration : fenêtre montée, Ctrl+Maj+F, dépôt dérivé, panneau Grille, câblage

**Objectif.** Brancher tout : une enveloppe `BackgroundsWindow` charge le pack (import dynamique, première ouverture),
liste « Mes fonds », rend les miniatures (grilles rendues à la demande et gardées pour la session), dérive tout dépôt de
fichier vers « Mes fonds » tant que la fenêtre est ouverte, applique un fond à l'onglet actif (avis « Fond appliqué à
N pages », avis PDF), crée l'entrée « Cette page », retire une entrée après confirmation, et rend le focus au bouton
« Fonds » en se fermant. `App.tsx` la monte sur le panneau `backgrounds` et écoute Ctrl+Maj+F ; le panneau Grille gagne
« Enregistrer comme fond » ; `workspace.ts` gagne la dérivation des dépôts et la boîte d'ouverture ; `main.ts` crée la
troisième racine et passe tout à l'interface. Cadrage : Q18, Q20 à Q22, Q26, Q28, Q29, Q35, Q36 ; scénarios S3, S5.

**Fichiers.**
- Créer : `apps/web/src/ui/BackgroundsWindow.tsx`
- Modifier : `apps/web/src/ui/App.tsx` (imports, `AppProps`, `gridPanelFor` `:223-237`, montage près de la
  Bibliothèque `:586-605`, écoute du raccourci), `apps/web/src/ui/GridPanel.tsx` (props `:30-37`, actions `:124-131`),
  `apps/web/src/engine/input/keys.ts` (après `enterAction`), `apps/web/src/app/workspace.ts` (`Workspace` `:158-240`,
  `stopDrop` `:922-929`, objet `ws`), `apps/web/src/main.ts` (`:321-350`, `:378`, `mountApp` `:499-515`),
  `docs/essais/c11a-coque.md`, `docs/essais/c11b-coque.md`
- Tester : `apps/web/src/ui/BackgroundsWindow.test.tsx`, `apps/web/src/engine/input/keys.test.ts`,
  `apps/web/src/ui/GridPanel.test.tsx`, `apps/web/src/app/workspace.test.ts` ; à garder verts : `App.test.tsx`,
  `LibraryPanel.test.tsx`, `library.test.ts`

**Interfaces.**
- Consomme : `BackgroundsDialog`, `searchDocsOf`, `BackgroundCard` (T9) ; `resolvePack`, `applyBackground`,
  `pdfPagesAmong`, `pdfKeptMessage`, `appliedMessage`, `outsideFrame`, `OUTSIDE_FRAME_MESSAGE`, `sourceThumbnail`,
  `fetchPackFiles`, `PACK_BASE`, `PackFiles` (T8) ; `renderPageImage`, `PAGE_IMAGE_SCALE`, `ThumbDeps` (T8) ;
  `createMyBackgrounds`, `probeImage`, `stampOf`, `NOT_AN_IMAGE_MESSAGE`, `MyBackgrounds`, `MyBackground` (T5) ;
  `loadPack`, `PackBackground` (T2) ; `createBackgroundSearch` (T3) ; `svgOf` (T2) ; `toggle("backgrounds")`,
  `Panel` + `"backgrounds"`, `button[data-item="backgrounds"]` (T6) ; `createMemoryLibraryFiles`,
  `createIdbLibraryFiles`, `createTauriLibraryFiles`, `mineOrMemory` (existants).
- Produit (`ui/BackgroundsWindow.tsx`) :
  `const GRID_SAVED_MESSAGE = "Grille enregistrée dans Mes fonds"` ; `const BACKGROUNDS_BUTTON = 'button[data-item="backgrounds"]'` ;
  `interface BackgroundsUi { readonly mine: MyBackgrounds; readonly thumbs: ThumbDeps; readonly core: Pick<CoreFactory, "blank">; makeAssets(): AssetStore; readonly files: PackFiles; now(): Date; loadPack?(): Promise<readonly PackBackground[]> }` ;
  `interface BackgroundsHost { active(): { readonly board: Pick<BoardSession, "doc" | "engine">; readonly assets: AssetStore }; setDropDiverter(h: ((files: readonly DroppedFile[]) => Promise<void>) | null): void; pickFiles(): Promise<readonly DroppedFile[]>; say: Notify; ask(message: string): Promise<boolean> }` ;
  `function BackgroundsWindow(props: { readonly ui: BackgroundsUi; readonly host: BackgroundsHost; close(): void }): JSX.Element`.
- Produit (`AppProps`) : `readonly backgrounds?: BackgroundsUi` (absent dans les tests anciens : le bouton n'ouvre rien).
- Produit (`GridPanelProps`) : `saveAsBackground?(grid: GridView): void` ; bouton `[data-grille="save-background"]`
  « Enregistrer comme fond », désactivé sur « Aucune » ou « Autre ».
- Produit (`keys.ts`) : `type AppShortcut = "backgrounds"` ; `function appShortcut(e: KeyLike): AppShortcut | null`.
- Produit (`Workspace`) : `setDropDiverter(h: ((files: readonly DroppedFile[]) => Promise<void>) | null): void` ;
  `pickFiles(): Promise<readonly DroppedFile[]>`.
- Noms d'entrées (Q36) : « Page N — JJ/MM HH:MM » (N = rang de la page montrée) ; « Grille <libellé du type> — JJ/MM HH:MM »
  (libellés de `GRID_KIND_LABELS`, ex. « Grille Points — 27/11 10:00 ») ; image déposée : son nom sans extension.
- Réutilise : `apps/web/src/app/workspace.ts:922-929` — étendre : `Workspace.setDropDiverter(h: ((files: readonly DroppedFile[]) => Promise<void>) | null): void` (et `pickFiles`, qui appelle `host.pick()`).
- Réutilise : `apps/web/src/engine/input/keys.ts:16-36` — étendre : `appShortcut(e: KeyLike): "backgrounds" | null` (réutilise `inEditable`, `KeyLike`).
- Réutilise : `apps/web/src/app/toolbar-host.ts:42`, `:94-95`, `apps/web/src/ui/App.tsx:79`, `:311` — `toggle("backgrounds")`, `Panel` + `"backgrounds"` (posés par T6 ; montage de la fenêtre ici).
- Réutilise : `apps/web/src/platform/library-files.ts:120`, `:193`, `:61` — `createIdbLibraryFiles(window.indexedDB, "backgrounds")`, `createTauriLibraryFiles(fs, "<Documents>/RoomBoard/Fonds", "backgrounds")`, `createMemoryLibraryFiles("backgrounds")` (repli par `mineOrMemory`, `app/library.ts:412`).
- Réutilise : `apps/web/src/platform/image-import.ts:52` — `sniffImage(head, name)` sur les fichiers déposés ou choisis (refus : `NOT_AN_IMAGE_MESSAGE`).
- Réutilise : `apps/web/src/grid-edit.ts:46-62` — `GRID_KIND_LABELS` pour nommer une grille enregistrée ; `toGrid` (déjà appelé par `GridPanel`).
- Le rapport porte, pour chacune de ces lignes, `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Contraintes (recopiées de Global Constraints).**
- VM partagée : builds et tests en `nice -n 10`, `cargo … -j 4`, `CARGO_TARGET_DIR=<worktree de la tâche>/target` (piège : cible partagée entre worktrees) ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; test isolé direct.
- Tailles Wasm : principal ≤ 1 572 864 o, formats ≤ 3 145 728 o ; ni baissés ni relevés ; le pack ne va pas dans le Wasm (rien ici ne touche `crates/`).
- Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`, `.`, `commit -a`) ; jamais `--force`.
- Aucun test désactivé, sauté, ni seuil modifié. Essais Playwright existants (sélecteurs `data-item`) restent verts sans réécriture.
- Aucune dépendance ajoutée sauf permissive et justifiée ; aucune AGPL/GPL/LGPL.
- Tactile d'abord (cibles ≥ 44 px, glisser aux événements de pointeur ; seul le dépôt de fichiers système passe par drop), clavier ensuite (raccourci par geste). Design : `docs/plans/design-cadrage.md` § 10 netteté.
- L'interface ne nomme aucun service extérieur ; provenances seulement dans `THIRD_PARTY_NOTICES.md` et le fichier de sources du pack.
- Aucun `tauri build`, aucun processus détaché laissé en marche (les lignes de `c11a-coque.md` et `c11b-coque.md` sont des essais manuels, joués plus tard sur le PC et le Mac).
- Préparation : `cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3`, puis les modules Wasm avec `apply_background` (exigés par `tsc` et par le build) :

```bash
cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH CARGO_TARGET_DIR=<wt>/target
[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/personnalisation-1b/apps/web/src/wasm-formats apps/web/src/
T1=/home/adminjd/projets/roomboard-wt/personnalisation-1b--T1/apps/web/src/wasm
if grep -q apply_background apps/web/src/wasm/roomboard_wasm.d.ts 2>/dev/null; then :
elif grep -q apply_background "$T1/roomboard_wasm.d.ts" 2>/dev/null; then rm -rf apps/web/src/wasm && cp -r "$T1" apps/web/src/wasm
else nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release -j 4 2>&1 | tail -2 && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm "$CARGO_TARGET_DIR/wasm32-unknown-unknown/release/roomboard_wasm.wasm"; fi
grep -c apply_background apps/web/src/wasm/roomboard_wasm.d.ts
```

**Interdits.** Ne pas toucher `Toolbar.tsx`, `Island.tsx`, `layout.ts`, `rb.css`, `LibraryPanel.tsx`, le moteur
(`engine.ts`), `mount.ts` ; fenêtre fermée, le dépôt fait exactement ce qu'il faisait (aucune dérivation posée) ; aucun
écrit dans le document par « Enregistrer comme fond » ni par « Cette page ».

**Terminé quand.** Les quatre fichiers de test ciblés passent, `App.test.tsx` vert, suite web complète verte, `tsc`
propre, `pnpm --filter @roomboard/web build` réussit et le `dist` contient `backgrounds/photos/`, lignes d'essai en coque
écrites, commit fait.

**Étapes.**

- [ ] **Étape 1 : `appShortcut` (rouge, puis vert).**

Ajouter à `apps/web/src/engine/input/keys.test.ts` (importer `appShortcut` avec les autres) :

```ts
describe("appShortcut (personnalisation-1b, Q28)", () => {
  it("Ctrl+Maj+F et Cmd+Maj+F → backgrounds, touche rendue en majuscule ou non", () => {
    expect(appShortcut(k("F", { ctrlKey: true, shiftKey: true }))).toBe("backgrounds");
    expect(appShortcut(k("f", { metaKey: true, shiftKey: true }))).toBe("backgrounds");
  });
  it("sans Maj, avec Alt, en composition, dans un champ, autre touche, sans Ctrl ni Cmd : null", () => {
    expect(appShortcut(k("f", { ctrlKey: true }))).toBeNull();
    expect(appShortcut(k("F", { ctrlKey: true, shiftKey: true, altKey: true }))).toBeNull();
    expect(appShortcut(k("F", { ctrlKey: true, shiftKey: true, isComposing: true }))).toBeNull();
    expect(appShortcut(k("F", { ctrlKey: true, shiftKey: true, target: { tagName: "INPUT" } }))).toBeNull();
    expect(appShortcut(k("G", { ctrlKey: true, shiftKey: true }))).toBeNull();
    expect(appShortcut(k("F", { shiftKey: true }))).toBeNull();
  });
  it("Ctrl+Maj+F n'est pas une touche du moteur (annuler, grouper)", () => {
    expect(keyAction(k("F", { ctrlKey: true, shiftKey: true }))).toBeNull();
  });
});
```

Commande : `cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/engine/input/keys.test.ts 2>&1 | tail -8` → `FAIL` (`appShortcut` absent).

Dans `apps/web/src/engine/input/keys.ts`, en fin de fichier :

```ts
export type AppShortcut = "backgrounds";

/** personnalisation-1b (Q28) : raccourcis de l'application, écoutés par `App.tsx` (jamais par le moteur) : Ctrl+Maj+F
 *  (Cmd+Maj+F sous macOS) ouvre ou ferme la fenêtre des fonds ; hors champ de saisie, hors composition, jamais avec Alt. */
export function appShortcut(e: KeyLike): AppShortcut | null {
  if (e.isComposing || e.altKey || !e.shiftKey || !(e.ctrlKey || e.metaKey)) return null;
  if (inEditable(e.target)) return null;
  return e.key.toLowerCase() === "f" ? "backgrounds" : null;
}
```

Commande : la même → `Tests  N passed`, aucun `FAIL`, les 3 tests `appShortcut` présents.

- [ ] **Étape 2 : dérivation des dépôts dans `workspace.ts` (rouge, puis vert).**

Ajouter à `apps/web/src/app/workspace.test.ts`, dans le `describe` principal :

```ts
  it("personnalisation-1b (Q22) : dérivation posée, un dépôt va à Mes fonds et pas à la page ; retirée, l'import reprend", async () => {
    const ws = await setupWorkspace();
    const got: string[] = [];
    ws.setDropDiverter(async (files) => {
      got.push(...files.map((f) => f.name));
    });
    dropHandler!([plainFile("a.png", pngHead(10, 10))], null);
    await flush();
    expect(got).toEqual(["a.png"]);
    const doc = ws.active().board.doc;
    expect(doc.elementIds(doc.pageIds()[0]!)).toEqual([]);
    ws.setDropDiverter(null);
    dropHandler!([plainFile("b.tif")], null);
    await flush();
    await flush();
    expect(got).toEqual(["a.png"]);
  });

  it("personnalisation-1b (Q22) : pickFiles rend les fichiers de la boîte d'ouverture", async () => {
    const ws = await setupWorkspace();
    expect(await ws.pickFiles()).toEqual([]);
  });
```

(`pngHead`, `plainFile`, `flush`, `dropHandler` et `setupWorkspace` existent dans ce fichier ; si `pngHead` n'y est pas
défini à cet endroit, prendre le PNG utilisé par le test « dépôt d'image » `:710`.)

Commande : `cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/app/workspace.test.ts -t "personnalisation-1b" 2>&1 | tail -8` → `FAIL`.

Dans `apps/web/src/app/workspace.ts` :
- interface `Workspace`, après `importFiles(…)` :

```ts
  /** personnalisation-1b (Q22) : fenêtre des fonds ouverte, tout dépôt natif va à `h` (« Mes fonds ») au lieu de la page ;
   *  null : dérivation retirée, le dépôt reprend son chemin. */
  setDropDiverter(h: ((files: readonly DroppedFile[]) => Promise<void>) | null): void;
  /** personnalisation-1b (Q22) : boîte d'ouverture du système (« Importer une image… ») ; annulée : liste vide. */
  pickFiles(): Promise<readonly DroppedFile[]>;
```

- avant `const stopDrop = host.onDrop(…)` : `let diverter: ((files: readonly DroppedFile[]) => Promise<void>) | null = null;`
- `stopDrop` devient :

```ts
  // C11a (P17, P18) : en annotation, tout dépôt natif sur la fenêtre principale compte comme un dépôt sur la zone.
  // personnalisation-1b (Q22) : fenêtre des fonds ouverte, le dépôt va à « Mes fonds » (dérivation posée par la fenêtre).
  const stopDrop = host.onDrop((files, at) => {
    const a = gate();
    const divert = diverter;
    const done: Promise<unknown> =
      divert !== null ? divert(files) : a !== null && a.state().active ? a.dropOnZone(files, at) : ws.importFiles(files, at);
    void done.catch((e: unknown) => {
      console.warn(`RoomBoard : dépôt abandonné (${messageOf(e)})`);
    });
  });
```

- dans l'objet `ws` (près d'`importFiles`) :

```ts
    setDropDiverter(h) {
      diverter = h;
    },
    pickFiles: () => host.pick(),
```

Si `diverter` est lu avant sa déclaration (ordre du fichier), déclarer la variable en tête de `createWorkspace`, près des
autres `let`. Commande : la même → `2 passed`, aucun `FAIL`.

- [ ] **Étape 3 : « Enregistrer comme fond » dans `GridPanel` (rouge, puis vert).**

Ajouter à `apps/web/src/ui/GridPanel.test.tsx` :

```tsx
  it("personnalisation-1b (Q21) : « Enregistrer comme fond » rend la grille du brouillon, sans apply ni cancel ; désactivé sur « Aucune » ; absent sans rappel", () => {
    const save = vi.fn<(g: GridView) => void>();
    const apply = vi.fn<(g: GridView | null) => string | null>(() => null);
    const cancel = vi.fn();
    const r = render(() => <GridPanel initial={null} preview={vi.fn()} endPreview={vi.fn()} apply={apply} cancel={cancel} saveAsBackground={save} />);
    const btn = r.container.querySelector<HTMLButtonElement>('[data-grille="save-background"]')!;
    expect(btn.textContent).toBe("Enregistrer comme fond");
    expect(btn.disabled).toBe(true);
    choose(r.container.querySelector<HTMLSelectElement>('[data-grille="kind"]')!, "dots");
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]![0].levels[0]).toMatchObject({ kind: "dots", spacingX: 40 });
    expect([apply.mock.calls.length, cancel.mock.calls.length]).toEqual([0, 0]);
    r.unmount();
    const plain = setup();
    expect(plain.container.querySelector('[data-grille="save-background"]')).toBeNull();
  });
```

Commande : `cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/ui/GridPanel.test.tsx 2>&1 | tail -8` → `FAIL`.

Dans `apps/web/src/ui/GridPanel.tsx`, `GridPanelProps`, après `cancel(): void;` :

```ts
  /** personnalisation-1b (Q21) : « Enregistrer comme fond » : la grille du brouillon va à « Mes fonds », rien n'est écrit
   *  dans le document. Absent : pas de bouton. */
  saveAsBackground?(grid: GridView): void;
```

et dans `<div class="rb-editor-actions">`, après le bouton « Appliquer » :

```tsx
        <Show when={props.saveAsBackground}>
          {(save) => (
            <button
              type="button"
              data-grille="save-background"
              disabled={off()}
              onClick={() => {
                const g = toGrid(draft());
                if (g !== null) save()(g);
              }}
            >
              Enregistrer comme fond
            </button>
          )}
        </Show>
```

Commande : la même → aucun `FAIL`, le test « Enregistrer comme fond » présent.

- [ ] **Étape 4 : écrire `apps/web/src/ui/BackgroundsWindow.test.tsx` (rouge).**

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Command, CoreDocument } from "../core/api";
import { createAssetStore } from "../core/asset-store";
import { fakeCore } from "../core/fake-core";
import { OUTSIDE_FRAME_MESSAGE } from "../app/backgrounds-apply";
import { createMyBackgrounds, probeImage } from "../app/my-backgrounds";
import type { ExportCanvas } from "../app/pdf-overlay";
import type { ThumbDeps } from "../app/thumbnail";
import type { PackBackground } from "../backgrounds/catalog";
import type { DroppedFile } from "../platform/files";
import { createMemoryLibraryFiles } from "../platform/library-files";
import { BACKGROUNDS_BUTTON, BackgroundsWindow, type BackgroundsHost, type BackgroundsUi } from "./BackgroundsWindow";

afterEach(cleanup);

const pb = (id: string, label: string, color: string): PackBackground => ({ id, section: "colors", theme: "claires", label, keywords: [label.toLowerCase()], kind: "color", color, grid: null, photo: null });
const PACK = [pb("blanc", "Blanc (aucun fond)", "#ffffff"), pb("ardoise", "Ardoise", "#2f3e46")];
const png = (w: number, h: number): Uint8Array => {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, w);
  new DataView(b.buffer).setUint32(20, h);
  return b;
};
const dropped = (name: string, bytes: Uint8Array): DroppedFile => ({ name, size: bytes.length, mime: "", head: async (n) => bytes.slice(0, n), blob: async () => new Blob([bytes as BlobPart]) });
const thumbs: ThumbDeps = {
  canvas: (): ExportCanvas => ({ ctx: { fillStyle: "", fillRect: () => undefined, drawImage: () => undefined } as unknown as CanvasRenderingContext2D, png: async () => png(4, 4), release: () => undefined }),
  painter: () => ({ paintContent: () => undefined }),
  decode: async () => ({ width: 1, height: 1, close() {} }) as never,
};

function setup(doc: CoreDocument = fakeCore.blank()) {
  const files = createMemoryLibraryFiles("backgrounds");
  const mine = createMyBackgrounds(files, { now: () => "2026-11-27T10:00:00.000Z", probe: probeImage, thumbnail: async () => null });
  const ui: BackgroundsUi = { mine, thumbs, core: fakeCore, makeAssets: () => createAssetStore(), files: { read: async (f) => { throw new Error(`fond introuvable : ${f}`); } }, now: () => new Date(2026, 10, 27, 10, 0), loadPack: async () => PACK };
  const engine = {
    run: (c: Command) => {
      try {
        return doc.apply(c);
      } catch {
        return null;
      }
    },
    state: () => ({ page: doc.pageIds()[0]!, error: null }),
  };
  const diverters: (((f: readonly DroppedFile[]) => Promise<void>) | null)[] = [];
  const host: BackgroundsHost = {
    active: () => ({ board: { doc, engine } as never, assets: createAssetStore() }),
    setDropDiverter: (h) => void diverters.push(h),
    pickFiles: vi.fn(async () => [dropped("photo.png", png(64, 36))]),
    say: vi.fn(async () => undefined),
    ask: vi.fn(async () => true),
  };
  const close = vi.fn();
  const r = render(() => <BackgroundsWindow ui={ui} host={host} close={close} />);
  return { ...r, doc, mine, host, close, diverters };
}

describe("personnalisation-1b : enveloppe de la fenêtre des fonds (Q22, Q26, Q35, Q36)", () => {
  it("monte la fenêtre, pose la dérivation des dépôts puis la retire au démontage ; focus rendu au bouton Fonds", async () => {
    const button = document.createElement("button");
    button.dataset["item"] = "backgrounds";
    document.body.append(button);
    const { diverters, unmount } = setup();
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"][data-panel="backgrounds"]')).not.toBeNull());
    expect(typeof diverters[0]).toBe("function");
    unmount();
    expect(diverters.at(-1)).toBeNull();
    await vi.waitFor(() => expect(document.activeElement).toBe(document.querySelector(BACKGROUNDS_BUTTON)));
    button.remove();
  });

  it("toucher une carte : une commande, la page change, fenêtre fermée, aucun avis pour une page", async () => {
    const { doc, close, host } = setup();
    const card = await vi.waitFor(() => document.querySelector<HTMLElement>('button[data-fond="ardoise"]')!);
    fireEvent.click(card);
    await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    expect(doc.page(doc.pageIds()[0]!)?.background).toBe("#2f3e46");
    expect(host.say).not.toHaveBeenCalled();
  });

  it("toutes les pages : avis « Fond appliqué à 3 pages » ; pages PDF : avis qu'elles gardent leur page", async () => {
    const three = fakeCore.blank();
    three.apply({ type: "AddPage", after: three.pageIds()[0]! });
    three.apply({ type: "AddPage", after: three.pageIds()[0]! });
    const a = setup(three);
    fireEvent.click(await vi.waitFor(() => document.querySelector<HTMLElement>('button[data-fonds="all"]')!));
    fireEvent.click(document.querySelector<HTMLElement>('button[data-fond="ardoise"]')!);
    await vi.waitFor(() => expect(a.host.say).toHaveBeenCalledWith("Fond appliqué à 3 pages", "info"));
    cleanup();
    const pdf = fakeCore.fromPdfPages({ id: "cd".repeat(32), name: "c.pdf", mime: "application/pdf", size: 1 }, [{ w: 612, h: 792 }, { w: 612, h: 792 }]);
    const b = setup(pdf);
    fireEvent.click(await vi.waitFor(() => document.querySelector<HTMLElement>('button[data-fonds="all"]')!));
    fireEvent.click(document.querySelector<HTMLElement>('button[data-fond="ardoise"]')!);
    await vi.waitFor(() => expect(b.host.say).toHaveBeenCalledWith("2 pages PDF gardent leur page : couleur et grille seulement", "info"));
    expect(pdf.page(pdf.pageIds()[0]!)?.backdrop?.kind).toBe("pdf-page");
  });

  it("dépôt d'un PNG : une carte « Mes fonds », la page ne change pas ; dépôt d'un texte : avis", async () => {
    const { diverters, doc, mine } = setup();
    await vi.waitFor(() => expect(typeof diverters[0]).toBe("function"));
    await diverters[0]!([dropped("tableau.png", png(64, 36))]);
    expect((await mine.list()).map((e) => e.name)).toEqual(["tableau"]);
    expect(doc.elementIds(doc.pageIds()[0]!)).toEqual([]);
    expect(doc.page(doc.pageIds()[0]!)?.backdrop ?? null).toBeNull();
    await diverters[0]!([dropped("notes.txt", new TextEncoder().encode("bonjour"))]);
    await vi.waitFor(() => expect(document.querySelector('[data-fonds="notice"]')?.textContent).toBe("seules les images deviennent des fonds"));
  });

  it("« Cette page » : entrée « Page 1 — 27/11 10:00 » ; objet hors du cadre : avis ; « Importer une image… » : boîte puis entrée", async () => {
    const doc = fakeCore.blank();
    const p = doc.pageIds()[0]!;
    doc.apply({ type: "CommitStroke", page: p, points: new Float32Array([100, 1000, 0.5, 300, 1400, 0.5]), style: { color: "#000000", width: 4 } });
    const { mine, host } = setup(doc);
    fireEvent.click(await vi.waitFor(() => document.querySelector<HTMLElement>('[data-edit="fonds-section"] [data-choice="mine"]')!));
    fireEvent.click(document.querySelector<HTMLElement>('button[data-fonds="page"]')!);
    await vi.waitFor(async () => expect((await mine.list()).map((e) => e.name)).toEqual(["Page 1 — 27/11 10:00"]));
    await vi.waitFor(() => expect(document.querySelector('[data-fonds="notice"]')?.textContent).toBe(OUTSIDE_FRAME_MESSAGE));
    expect((await mine.list())[0]).toMatchObject({ origin: "page", image: { mime: "image/png", w: 3840, h: 2160 } });
    fireEvent.click(document.querySelector<HTMLElement>('button[data-fonds="import"]')!);
    await vi.waitFor(async () => expect((await mine.list()).length).toBe(2));
    expect(host.pickFiles).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(document.querySelectorAll('button[data-fond^="mine:"]').length).toBe(2));
  });

  it("retirer : question posée, entrée retirée si oui", async () => {
    const { mine, host } = setup();
    await mine.addSource({ color: "#ffffff", grid: null, image: null }, "Blanc", "grid");
    fireEvent.click(await vi.waitFor(() => document.querySelector<HTMLElement>('[data-edit="fonds-section"] [data-choice="mine"]')!));
    fireEvent.click(await vi.waitFor(() => document.querySelector<HTMLElement>('button[data-fonds-remove="blanc.json"]')!));
    await vi.waitFor(async () => expect(await mine.list()).toEqual([]));
    expect(host.ask).toHaveBeenCalledWith("Retirer « Blanc » de Mes fonds ?");
  });
});
```

Si le premier `mine.list()` de la fenêtre précède l'ajout du test « retirer », la carte n'apparaît qu'après un
`refresh` : la fenêtre s'abonne à `mine.onChange` (étape 5) et relit la liste à chaque changement.

Commande : `cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/ui/BackgroundsWindow.test.tsx 2>&1 | tail -10` → `FAIL` (module absent).

- [ ] **Étape 5 : écrire `apps/web/src/ui/BackgroundsWindow.tsx`.**

```tsx
/**
 * Enveloppe de la fenêtre des fonds (personnalisation-1b, Q14, Q20, Q22, Q26, Q29, Q35, Q36) : charge le pack à la
 * première ouverture (import dynamique), liste « Mes fonds » (relue à chaque changement), bâtit la recherche, rend les
 * miniatures (grilles rendues à la demande et gardées pour la session), dérive les dépôts de fichiers vers « Mes fonds »
 * tant qu'elle est montée, applique un fond à l'onglet actif en une commande, puis se ferme ; au démontage, le focus
 * revient au bouton « Fonds ».
 */
import { createMemo, createResource, createSignal, onCleanup, onMount, Show, type JSX } from "solid-js";
import {
  appliedMessage, applyBackground, OUTSIDE_FRAME_MESSAGE, outsideFrame, PACK_BASE, pdfKeptMessage, pdfPagesAmong, resolvePack,
  sourceThumbnail, type PackFiles,
} from "../app/backgrounds-apply";
import type { BoardSession } from "../app/board-session";
import { NOT_AN_IMAGE_MESSAGE, stampOf, type MyBackground, type MyBackgrounds } from "../app/my-backgrounds";
import { PAGE_IMAGE_SCALE, renderPageImage, type ThumbDeps } from "../app/thumbnail";
import { loadPack, type PackBackground } from "../backgrounds/catalog";
import { createBackgroundSearch } from "../backgrounds/search";
import { svgOf } from "../backgrounds/svg";
import type { CoreFactory } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import type { DroppedFile, Notify } from "../platform/files";
import { HEAD_BYTES, sniffImage } from "../platform/image-import";
import { BackgroundsDialog, searchDocsOf, type BackgroundCard } from "./BackgroundsDialog";

export const GRID_SAVED_MESSAGE = "Grille enregistrée dans Mes fonds";
export const BACKGROUNDS_BUTTON = 'button[data-item="backgrounds"]';
const removeQuestion = (name: string): string => `Retirer « ${name} » de Mes fonds ?`;
const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));
const stemOf = (name: string): string => name.replace(/\.[^./\\]*$/, "") || name;

export interface BackgroundsUi {
  readonly mine: MyBackgrounds;
  readonly thumbs: ThumbDeps;
  readonly core: Pick<CoreFactory, "blank">;
  makeAssets(): AssetStore;
  readonly files: PackFiles;
  now(): Date;
  /** Catalogue imposé (tests) ; absent : `loadPack`, import dynamique. */
  loadPack?(): Promise<readonly PackBackground[]>;
}
export interface BackgroundsHost {
  active(): { readonly board: Pick<BoardSession, "doc" | "engine">; readonly assets: AssetStore };
  setDropDiverter(h: ((files: readonly DroppedFile[]) => Promise<void>) | null): void;
  pickFiles(): Promise<readonly DroppedFile[]>;
  say: Notify;
  ask(message: string): Promise<boolean>;
}

/** Miniatures rendues des grilles, gardées pour la session (Q29, H2-7). */
const rendered = new Map<string, Promise<Blob | null>>();

export function BackgroundsWindow(props: { readonly ui: BackgroundsUi; readonly host: BackgroundsHost; close(): void }): JSX.Element {
  const ui = props.ui;
  const [pack] = createResource(() => (ui.loadPack ?? loadPack)());
  const [mine, setMine] = createSignal<readonly MyBackground[]>([]);
  const [notice, setNotice] = createSignal<string | null>(null);
  const refresh = async (): Promise<void> => {
    setMine(await ui.mine.list());
  };
  const search = createMemo(() => createBackgroundSearch(searchDocsOf(pack() ?? [], mine())));

  const addFiles = async (files: readonly DroppedFile[]): Promise<void> => {
    for (const f of files) {
      if (sniffImage(await f.head(HEAD_BYTES), f.name) === null) {
        setNotice(NOT_AN_IMAGE_MESSAGE);
        continue;
      }
      try {
        await ui.mine.addImage(await f.blob(), stemOf(f.name));
        setNotice(null);
      } catch (e) {
        setNotice(messageOf(e));
      }
    }
    await refresh();
  };
  onMount(() => {
    props.host.setDropDiverter(addFiles);
    const off = ui.mine.onChange(() => void refresh());
    onCleanup(off);
    void refresh();
  });
  onCleanup(() => {
    props.host.setDropDiverter(null);
    queueMicrotask(() => document.querySelector<HTMLElement>(BACKGROUNDS_BUTTON)?.focus());
  });

  const thumbOf = async (c: BackgroundCard): Promise<Blob | string | null> => {
    if (c.kind === "mine") return ui.mine.thumbnail(c.item);
    const b = c.item;
    if (b.kind === "photo") return b.photo === null ? null : `${PACK_BASE}${b.photo.thumb}`;
    if (b.kind === "svg") return new Blob([svgOf(b.id)], { type: "image/svg+xml" });
    if (b.kind === "grid") {
      let p = rendered.get(b.id);
      if (p === undefined) {
        p = sourceThumbnail(ui.core, { color: b.color, grid: b.grid, image: null }, ui.thumbs, () => ui.makeAssets()).catch(() => null);
        rendered.set(b.id, p);
      }
      return p;
    }
    return null;
  };

  const apply = async (c: BackgroundCard, all: boolean): Promise<void> => {
    const tab = props.host.active();
    const board = tab.board;
    const current = board.engine.state().page;
    const pages = all ? board.doc.pageIds() : [current];
    try {
      const src = c.kind === "pack" ? await resolvePack(c.item, ui.files) : await ui.mine.read(c.item);
      const pdf = pdfPagesAmong(board.doc, pages);
      const target = { run: (cmd: Parameters<typeof board.engine.run>[0]) => board.engine.run(cmd), assets: tab.assets, pageIds: () => board.doc.pageIds() };
      if (!(await applyBackground(target, src, all ? "all" : "current", current))) {
        await props.host.say(board.engine.state().error ?? "fond refusé");
        return;
      }
      if (pages.length > 1) await props.host.say(appliedMessage(pages.length), "info");
      if (pdf > 0) await props.host.say(pdfKeptMessage(pdf), "info");
    } catch (e) {
      await props.host.say(messageOf(e));
    } finally {
      props.close();
    }
  };

  const addPage = async (): Promise<void> => {
    const tab = props.host.active();
    const board = tab.board;
    const page = board.engine.state().page;
    const view = board.doc.page(page);
    if (view === null) return;
    const blob = await renderPageImage(board.doc, tab.assets, page, PAGE_IMAGE_SCALE, ui.thumbs);
    if (blob === null) return;
    const name = `Page ${board.doc.pageIds().indexOf(page) + 1} — ${stampOf(ui.now())}`;
    const w = Math.round(view.width * PAGE_IMAGE_SCALE);
    const h = Math.round(view.height * PAGE_IMAGE_SCALE);
    try {
      await ui.mine.addSource({ color: view.background, grid: null, image: { blob, name: "page.png", mime: "image/png", w, h } }, name, "page");
      setNotice(outsideFrame(board.doc, page) ? OUTSIDE_FRAME_MESSAGE : null);
    } catch (e) {
      setNotice(messageOf(e));
    }
    await refresh();
  };

  const remove = async (e: MyBackground): Promise<void> => {
    if (!(await props.host.ask(removeQuestion(e.name)))) return;
    await ui.mine.remove(e);
    await refresh();
  };

  return (
    <Show when={pack()}>
      {(p) => (
        <BackgroundsDialog
          pack={p()}
          mine={mine()}
          search={search()}
          notice={notice()}
          thumbOf={thumbOf}
          apply={(c, all) => void apply(c, all)}
          importImage={() => void props.host.pickFiles().then(addFiles).catch((e: unknown) => setNotice(messageOf(e)))}
          addPage={() => void addPage()}
          remove={(e) => void remove(e)}
          close={() => props.close()}
        />
      )}
    </Show>
  );
}
```

Si `Parameters<typeof board.engine.run>[0]` gêne `tsc`, typer `cmd: Command` (import de `../core/api`).

Commande : `cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/ui/BackgroundsWindow.test.tsx 2>&1 | tail -10`
Attendu : `Tests  6 passed (6)`, aucun `FAIL`.

- [ ] **Étape 6 : monter la fenêtre et le raccourci dans `App.tsx`.**

Imports à ajouter : `onMount` dans l'import de `solid-js` ; `import type { GridView } from "../core/api";` (ou ajouté à
l'import `ImageData` existant) ; `import { stampOf } from "../app/my-backgrounds";` ;
`import { appShortcut } from "../engine/input/keys";` ; `import { GRID_KIND_LABELS } from "../grid-edit";` ;
`import { BackgroundsWindow, GRID_SAVED_MESSAGE, type BackgroundsUi } from "./BackgroundsWindow";`.

`AppProps`, après `library?` :

```ts
  /** personnalisation-1b : fenêtre des fonds et « Mes fonds » ; absente (tests anciens) : le bouton « Fonds » n'ouvre rien. */
  readonly backgrounds?: BackgroundsUi;
```

Juste avant `const gridPanelFor = …` :

```ts
  /** personnalisation-1b (Q21) : grille du brouillon et couleur de la page montrée vers « Mes fonds » ; rien dans le document. */
  const saveGridAsBackground = async (b: BoardSession, grid: GridView): Promise<void> => {
    const ui = props.backgrounds;
    if (ui === undefined) return;
    const kind = grid.levels[0]?.kind ?? "";
    const label = Object.hasOwn(GRID_KIND_LABELS, kind) ? GRID_KIND_LABELS[kind as keyof typeof GRID_KIND_LABELS] : "personnalisée";
    const color = b.doc.page(b.engine.state().page)?.background ?? "#ffffff";
    try {
      await ui.mine.addSource({ color, grid, image: null }, `Grille ${label} — ${stampOf(ui.now())}`, "grid");
      await ws.say(GRID_SAVED_MESSAGE, "info");
    } catch (e) {
      await ws.say(e instanceof Error ? e.message : String(e));
    }
  };
```

Dans `gridPanelFor`, ajouter la prop au `<GridPanel … />` :

```tsx
      saveAsBackground={props.backgrounds === undefined ? undefined : (grid) => void saveGridAsBackground(b, grid)}
```

Après le bloc `<Show when={panel() === "library" …}>…</Show>` :

```tsx
      <Show when={panel() === "backgrounds" ? props.backgrounds : undefined}>
        {(ui) => <BackgroundsWindow ui={ui()} host={ws} close={() => setPanel(null)} />}
      </Show>
```

Après l'effet « Panneau fermé à l'entrée » (annotation) :

```ts
  // personnalisation-1b (Q28) : Ctrl+Maj+F (Cmd+Maj+F sous macOS) ouvre ou ferme la fenêtre des fonds, hors champ de
  // saisie et hors annotation ; écouté ici, jamais par le moteur.
  onMount(() => {
    const onShortcut = (e: KeyboardEvent): void => {
      const key = { key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey, altKey: e.altKey, isComposing: e.isComposing, target: e.target instanceof HTMLElement ? e.target : null };
      if (props.backgrounds === undefined || annotating() || appShortcut(key) !== "backgrounds") return;
      e.preventDefault();
      leaveEditor(() => setPanel((cur) => (cur === "backgrounds" ? null : "backgrounds")));
    };
    window.addEventListener("keydown", onShortcut);
    onCleanup(() => window.removeEventListener("keydown", onShortcut));
  });
```

`Workspace` satisfait `BackgroundsHost` (`active`, `setDropDiverter`, `pickFiles`, `say`, `ask`) ; si `tsc` refuse
`host={ws}`, passer `host={{ active: () => ws.active(), setDropDiverter: (h) => ws.setDropDiverter(h), pickFiles: () => ws.pickFiles(), say: ws.say, ask: (m) => ws.ask(m) }}`.

- [ ] **Étape 7 : câblage dans `apps/web/src/main.ts`.**

Imports : `import { createMyBackgrounds, probeImage } from "./app/my-backgrounds";`,
`import { fetchPackFiles, sourceThumbnail } from "./app/backgrounds-apply";`, `import type { ThumbDeps } from "./app/thumbnail";`.

Après le bloc « Bibliothèque (C4) » (`mine`, `:321-331`) :

```ts
  // personnalisation-1b (Q18, DA4) : « Mes fonds », troisième racine de la bibliothèque de l'appareil : IndexedDB (même
  // base) sur le web, `Documents/RoomBoard/Fonds` dans la coque ; repli en mémoire avec un avis (K8).
  const fonds =
    ports !== null
      ? await mineOrMemory(
          async () => createTauriLibraryFiles({ ...ports.fs, ...ports.dirFs }, `${await ports.documentDir()}/RoomBoard/Fonds`, "backgrounds"),
          () => createMemoryLibraryFiles("backgrounds"),
        )
      : { files: typeof window.indexedDB === "undefined" ? createMemoryLibraryFiles("backgrounds") : createIdbLibraryFiles(window.indexedDB, "backgrounds"), notice: null };
  if (fonds.notice !== null) void prepared.shell.notify(fonds.notice);
  // Vignettes (C4, D12) et rendus de page des fonds : même peintre que la superposition PNG.
  const thumbDeps: ThumbDeps = { canvas: browserExportCanvas, decode: decodeBitmap, painter: (ctx, doc, images) => new Canvas2DRenderer(ctx, null, doc, exportPainterOptions(images)) };
  const myBackgrounds = createMyBackgrounds(fonds.files, {
    now: () => new Date().toISOString(),
    probe: probeImage,
    thumbnail: (src) => sourceThumbnail(core, src, thumbDeps, () => createAssetStore()),
  });
```

Remplacer la ligne `thumbnail: { canvas: browserExportCanvas, … },` de `createWorkspace` (`:378`) par
`thumbnail: thumbDeps,` (même objet). Dans `mountApp(root, { … })`, après `library: { … },` :

```ts
    backgrounds: { mine: myBackgrounds, thumbs: thumbDeps, core, makeAssets: () => createAssetStore(), files: fetchPackFiles(), now: () => new Date() },
```

- [ ] **Étape 8 : lignes d'essai en coque.**

`docs/essais/c11a-coque.md`, à la fin de la liste à cocher (avant « Note : sur un écran de 900 px … ») :

```markdown
- [ ] personnalisation 1b : « Fonds » › « Mes fonds » › « Cette page », puis déposer une image depuis l'explorateur sur la fenêtre des fonds ouverte : deux cartes, et la page n'a reçu aucune image ; fermer RoomBoard, le rouvrir : les deux cartes sont là et leurs fichiers sont dans `Documents/RoomBoard/Fonds` ; appliquer une photo du pack : elle s'affiche hors ligne (WebP servi par la coque, H2-1) ; Ctrl+Maj+F (Cmd+Maj+F sous macOS) ouvre et ferme la fenêtre (H2-3).
```

`docs/essais/c11b-coque.md`, à la fin de sa liste à cocher :

```markdown
- [ ] personnalisation 1b (Q35) : après « Envoyer au tableau », « Fonds » › une photo sur la page de la capture : la capture est remplacée par la photo ; un « Annuler » rend la capture.
```

- [ ] **Étape 9 : vert, suite, build.**

Commandes :
`cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/ui/BackgroundsWindow.test.tsx src/engine/input/keys.test.ts src/ui/GridPanel.test.tsx src/app/workspace.test.ts src/ui/App.test.tsx 2>&1 | tail -10`
Attendu : `Test Files  5 passed (5)`, aucun `FAIL`.
`nice -n 10 pnpm exec tsc --noEmit 2>&1 | tail -5` → aucune ligne `error TS`.
`cd <wt> && node ~/.claude/scripts/vm/suite-vm.cjs -- pnpm --filter @roomboard/web exec vitest run 2>&1 | tail -12` →
`Test Files  N passed`, N ≥ 186, aucun `FAIL`.
`cd <wt> && nice -n 10 pnpm --filter @roomboard/web build 2>&1 | tail -6 && ls apps/web/dist/backgrounds/photos | wc -l && ls apps/web/dist/backgrounds/thumbs | wc -l`
Attendu : build sans `error`, deux comptes égaux au nombre de photos ; `grep -c "SOURCES" -r apps/web/dist | grep -v ":0" | wc -l` → 0 (le fichier de sources n'est pas servi).
`cd <wt> && node scripts/controle-hors-ligne.mjs apps/web/dist apps/desktop/src-tauri/tauri.conf.json 2>&1 | tail -3` → code 0.

- [ ] **Étape 10 : commit.**

```bash
cd <wt>
for f in apps/web/src/ui/BackgroundsWindow.tsx apps/web/src/ui/BackgroundsWindow.test.tsx apps/web/src/ui/App.tsx apps/web/src/ui/GridPanel.tsx apps/web/src/ui/GridPanel.test.tsx apps/web/src/engine/input/keys.ts apps/web/src/engine/input/keys.test.ts apps/web/src/app/workspace.ts apps/web/src/app/workspace.test.ts apps/web/src/main.ts docs/essais/c11a-coque.md docs/essais/c11b-coque.md; do git add "$f"; done
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(web): wire the backgrounds window, Ctrl+Shift+F, drop to My backgrounds, save grid as background" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport attendu.** Sorties `tail` de l'étape 9, lignes `Réutilisation : …`, sha du commit.

---

<a id="tache-t11"></a>
### Tâche T11 — CLI : commande `backgrounds`, opération `background`

**Objectif.** `roomboard backgrounds [--search <texte>] [--section colors|lines|lessons|images]` : une ligne JSON par fond
du pack (`id`, `section`, `theme`, `label`, `kind`). Opération `{"op":"background","id":"<id>"}` ou
`{"op":"background","file":"<image>"}` dans `run` et `apply`, avec `"page": "<id>"` (références `$page:i` ; absente : la
première page, `pageOf`) **ou** `"pages": "all"` ; les deux ensemble : code 2. Codes : 0 ; 1 id inconnu, page inconnue,
refus du cœur ; 2 usage ; 3 en-tête d'image illisible. La commande brute `{"type":"ApplyBackground",…}` (T1) est testée
ici. Pack lu sur disque dans `apps/web/public/backgrounds/`. Cadrage : Q32 ; scénario S4.

**Fichiers.**
- Créer : `apps/cli/src/backgrounds.ts`, `apps/cli/src/backgrounds.test.ts`
- Modifier : `apps/cli/src/ops.ts` (`CLI_OPS`, `:22`), `apps/cli/src/session.ts` (`SessionDeps` `:52-72`, `runCli`
  `:293-350`, `nodeSession` `:426-441`), `apps/cli/src/main.ts` (`USAGE` `:34-45`, `REFS`, `COMMANDS`),
  `scripts/essais/cli-essai.mjs` (avant `// D79 — Ctrl-C`, `:421`)
- Tester : `apps/cli/src/backgrounds.test.ts` ; `apps/cli/src/ops.test.ts` et `apps/cli/src/main.test.ts` seulement si
  une liste figée de `CLI_OPS` ou de l'usage y casse (ajouter l'entrée, rien d'autre)

**Interfaces.**
- Consomme : `resolvePack`, `backgroundCommand`, `missingPackFile`, `PackFiles` (T8) ; `loadPack`, `PackSectionId`,
  `PackBackground` (T2) ; `createBackgroundSearch` (T3) ; `BackgroundSource` (T5) ; `sniffImage`, `probeSize`,
  `IMAGE_MIME`, `HEAD_BYTES` (existants) ; `pageOf` (`apps/cli/src/state.ts:9-15`) ; `readBytes` (`disk.ts`) ;
  `optString` (`ops.ts`) ; `CliError` (`contract.ts`).
- Produit (`apps/cli/src/backgrounds.ts`) :
  `const PACK_SECTIONS: readonly PackSectionId[] = ["colors", "lines", "lessons", "images"]` ;
  `interface PackLine { readonly id: string; readonly section: PackSectionId; readonly theme: string; readonly label: string; readonly kind: PackBackground["kind"] }` ;
  `function packDir(env: Readonly<Record<string, string | undefined>>, wasmDir: URL): URL` (`ROOMBOARD_BACKGROUNDS`, sinon `new URL("../../web/public/backgrounds/", wasmDir)`) ;
  `function diskPackFiles(dir: URL): PackFiles` ;
  `function listBackgrounds(o: { readonly search?: string; readonly section?: string }): Promise<readonly PackLine[]>` ;
  `function backgroundOp(tab: { readonly doc: CoreDocument; readonly assets: AssetStore }, args: Readonly<Record<string, unknown>>, files: PackFiles): Promise<Command>`.
- Produit (`SessionDeps`) : `readonly backgrounds?: PackFiles` (posé par `nodeSession`).
- `FORMAT_LOTS` : inchangé (aucune extension neuve ; les images de `file` sont des formats déjà listés) — D15 satisfait.
- Réutilise : `apps/cli/src/ops.ts:12-22`, `session.ts:293`, `main.ts:34` — étendre : `COMMAND_TYPES` + `"ApplyBackground"` (fait par T1, testé ici), `CLI_OPS` + `"background"`, `USAGE.backgrounds` ; `applyBackground` / `resolvePack` du web (ici `resolvePack` et `backgroundCommand`, cœur commun d'`applyBackground`).
- Réutilise : `apps/cli/src/state.ts:9-15` — `pageOf(tab, page)` ; `pages: "all"` → `doc.pageIds()`.
- Le rapport porte, pour chacune de ces lignes, `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Patron à ne pas reprendre (concepteur-critique).** Résoudre le fond dans la CLI à part (relire le catalogue autrement,
recopier `svgOf` ou le `put`, écrire `SetBackdrop`/`SetGrid` à la main) : deux chemins qui divergeraient. Chemin de
référence : `apps/cli/src/session.ts:307-321` (`import` : la CLI appelle la logique du web, `importInto`) et
`apps/web/src/app/backgrounds-apply.ts` (`resolvePack`, `backgroundCommand`) : la CLI n'ajoute que la lecture sur disque
et les contrôles d'usage.

**Contraintes (recopiées de Global Constraints).**
- VM partagée : builds et tests en `nice -n 10`, `cargo … -j 4`, `CARGO_TARGET_DIR=<worktree de la tâche>/target` (piège : cible partagée entre worktrees) ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; test isolé direct.
- Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`, `.`, `commit -a`) ; jamais `--force`.
- Aucun test désactivé, sauté, ni seuil modifié. Essais Playwright existants (sélecteurs `data-item`) restent verts sans réécriture.
- Aucune dépendance ajoutée sauf permissive et justifiée ; aucune AGPL/GPL/LGPL.
- Aucun `tauri build`, aucun processus détaché laissé en marche.
- CLI (D15) : toute commande ou opération nouvelle met à jour la CLI, sa ligne de `FORMAT_LOTS`, ses tests et `scripts/essais/cli-essai.mjs`. Écritures seulement sur des fichiers temporaires (profil).
- Préparation : `cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3`, puis les deux modules Wasm (les tests CLI chargent le vrai cœur) :

```bash
cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH CARGO_TARGET_DIR=<wt>/target
[ -d apps/web/src/wasm-formats ] || cp -r /home/adminjd/projets/roomboard-wt/personnalisation-1b/apps/web/src/wasm-formats apps/web/src/
T1=/home/adminjd/projets/roomboard-wt/personnalisation-1b--T1/apps/web/src/wasm
if grep -q apply_background apps/web/src/wasm/roomboard_wasm.d.ts 2>/dev/null; then :
elif grep -q apply_background "$T1/roomboard_wasm.d.ts" 2>/dev/null; then rm -rf apps/web/src/wasm && cp -r "$T1" apps/web/src/wasm
else nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release -j 4 2>&1 | tail -2 && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm "$CARGO_TARGET_DIR/wasm32-unknown-unknown/release/roomboard_wasm.wasm"; fi
nice -n 10 cargo build -p roomboard-shell --bin roomboard-office -j 4 2>&1 | tail -2
```

**Interdits.** Aucune commande pour « Mes fonds » ; ne pas changer `FORMAT_LOTS` ; ne pas modifier `pageOf` ; aucune
écriture hors d'un dossier temporaire.

**Terminé quand.** `backgrounds.test.ts` passe (≥ 9 tests), suite CLI verte, CLI construite, `cli-essai.mjs` affiche
`CLI : OK` avec les lignes « backgrounds » et « background », commit fait.

**Étapes.**

- [ ] **Étape 1 : écrire `apps/cli/src/backgrounds.test.ts` (rouge).**

```ts
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, expect, it } from "vitest";
import { listBackgrounds } from "./backgrounds";
import { main } from "./main";
import { nodeSession } from "./session";
import { describeWasm, memoryIO, warmModules, type Json } from "./testing";

const dir = mkdtempSync(join(tmpdir(), "roomboard-cli-fonds-"));
const png = (w: number, h: number): Uint8Array => {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, w);
  new DataView(b.buffer).setUint32(20, h);
  return b;
};
const two = async () => {
  const s = await nodeSession(memoryIO());
  s.newTab();
  await s.exec('{"type":"AddPage","after":"$page:0"}');
  return s;
};

it("listBackgrounds : recherche « seyes » : seyes-8mm en tête ; section lines : 54 fonds", async () => {
  expect((await listBackgrounds({ search: "seyes" }))[0]).toEqual({ id: "seyes-8mm", section: "lines", theme: "seyes", label: "Seyès 8 mm", kind: "grid" });
  expect(await listBackgrounds({ section: "lines" })).toHaveLength(54);
});
it("listBackgrounds : section inconnue (ou « mine ») : usage", async () => {
  for (const section of ["bidule", "mine"]) await expect(listBackgrounds({ section })).rejects.toMatchObject({ code: "usage" });
});

describeWasm("personnalisation-1b : CLI des fonds (Q32, S4)", () => {
  beforeAll(warmModules);
  it("roomboard backgrounds --search seyes : une ligne JSON par fond, code 0 ; argument en trop : code 2", async () => {
    const io = memoryIO();
    expect(await main(["backgrounds", "--search", "seyes"], io)).toBe(0);
    expect(io.json()[0]).toMatchObject({ id: "seyes-8mm" });
    expect(await main(["backgrounds", "trop"], memoryIO())).toBe(2);
    expect(await main(["backgrounds", "--section", "bidule"], memoryIO())).toBe(2);
  });
  it("background id + pages all : grille seyes sur chaque page, une étape", async () => {
    const s = await two();
    await s.exec('{"op":"background","id":"seyes-8mm","pages":"all"}');
    const st: Json = await s.exec('{"op":"state"}');
    expect(st.state.pages.map((p: Json) => p.page.grid?.levels[0]?.kind)).toEqual(["seyes", "seyes"]);
    await s.exec('{"op":"undo"}');
    const back: Json = await s.exec('{"op":"state"}');
    expect(back.state.pages.map((p: Json) => p.page.grid)).toEqual([null, null]);
  });
  it("background id ardoise + page $page:1 : seule la deuxième page ; sans page : la première", async () => {
    const s = await two();
    await s.exec('{"op":"background","id":"ardoise","page":"$page:1"}');
    let st: Json = await s.exec('{"op":"state"}');
    expect(st.state.pages.map((p: Json) => p.page.background)).toEqual(["#ffffff", "#2f3e46"]);
    await s.exec('{"op":"background","id":"creme"}');
    st = await s.exec('{"op":"state"}');
    expect(st.state.pages[0].page.background).toBe("#fbf7ec");
  });
  it("background SVG (venn) : fond image/svg+xml cité, un seul asset sur deux pages", async () => {
    const s = await two();
    await s.exec('{"op":"background","id":"venn","pages":"all"}');
    const st: Json = await s.exec('{"op":"state"}');
    expect(st.state.pages.map((p: Json) => p.page.backdrop?.kind)).toEqual(["image", "image"]);
    expect(st.state.assets.filter((a: Json) => a.mime === "image/svg+xml")).toHaveLength(1);
  });
  it("page et pages ensemble, id et file ensemble, ni l'un ni l'autre, pages autre que all : usage", async () => {
    const s = await two();
    for (const op of ['{"op":"background","id":"ardoise","page":"$page:0","pages":"all"}', '{"op":"background","id":"ardoise","file":"x.png"}', '{"op":"background"}', '{"op":"background","id":"ardoise","pages":"deux"}']) {
      await expect(s.exec(op), op).rejects.toMatchObject({ code: "usage" });
    }
  });
  it("id inconnu, page inconnue : command (code 1) ; file non image : unsupported (code 3)", async () => {
    const s = await two();
    await expect(s.exec('{"op":"background","id":"bidule"}')).rejects.toMatchObject({ code: "command", message: "fond inconnu : bidule" });
    await expect(s.exec('{"op":"background","id":"ardoise","page":"nulle-part"}')).rejects.toMatchObject({ code: "command" });
    const txt = join(dir, "notes.txt");
    writeFileSync(txt, "bonjour");
    await expect(s.exec(JSON.stringify({ op: "background", file: txt }))).rejects.toMatchObject({ code: "unsupported" });
  });
  it("file PNG : fond image de la page, taille lue dans l'en-tête", async () => {
    const s = await two();
    const f = join(dir, "fond.png");
    writeFileSync(f, png(640, 360));
    await s.exec(JSON.stringify({ op: "background", file: f }));
    const st: Json = await s.exec('{"op":"state"}');
    expect(st.state.pages[0].page.backdrop).toMatchObject({ kind: "image", w: 640, h: 360 });
  });
  it("commande brute ApplyBackground acceptée par run (COMMAND_TYPES, T1)", async () => {
    const s = await two();
    await s.exec('{"type":"ApplyBackground","pages":["$page:0","$page:1"],"color":"#2f3e46","backdrop":null,"grid":null}');
    const st: Json = await s.exec('{"op":"state"}');
    expect(st.state.pages.map((p: Json) => p.page.background)).toEqual(["#2f3e46", "#2f3e46"]);
  });
});
```

Commande : `cd <wt>/apps/cli && nice -n 10 pnpm exec vitest run src/backgrounds.test.ts 2>&1 | tail -10` → `FAIL` (module absent).

- [ ] **Étape 2 : écrire `apps/cli/src/backgrounds.ts`.**

```ts
/**
 * Fonds du pack dans la CLI (personnalisation-1b, Q32) : liste et recherche (`roomboard backgrounds`), opération
 * `{"op":"background",…}` de `run` et `apply`. Même résolution et même commande que l'interface (`resolvePack`,
 * `backgroundCommand` de `apps/web/src/app/backgrounds-apply.ts`) ; le pack est lu sur disque dans
 * `apps/web/public/backgrounds/` (ou `ROOMBOARD_BACKGROUNDS`). « Mes fonds » n'a pas de commande (bibliothèque de
 * l'appareil, pas du document).
 */
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { backgroundCommand, missingPackFile, resolvePack, type PackFiles } from "../../web/src/app/backgrounds-apply";
import { loadPack, type PackBackground, type PackSectionId } from "../../web/src/backgrounds/catalog";
import { createBackgroundSearch } from "../../web/src/backgrounds/search";
import type { BackgroundSource } from "../../web/src/backgrounds/source";
import type { Command, CoreDocument } from "../../web/src/core/api";
import type { AssetStore } from "../../web/src/core/asset-store";
import { HEAD_BYTES, IMAGE_MIME, probeSize, sniffImage } from "../../web/src/platform/image-import";
import { CliError } from "./contract";
import { readBytes } from "./disk";
import { optString } from "./ops";
import { pageOf } from "./state";

export const PACK_SECTIONS: readonly PackSectionId[] = ["colors", "lines", "lessons", "images"];
export interface PackLine {
  readonly id: string;
  readonly section: PackSectionId;
  readonly theme: string;
  readonly label: string;
  readonly kind: PackBackground["kind"];
}

/** Dossier du pack : `ROOMBOARD_BACKGROUNDS`, sinon à côté des modules (`dist/` de la CLI ou `apps/web/src/` des tests). */
export function packDir(env: Readonly<Record<string, string | undefined>>, wasmDir: URL): URL {
  const own = env["ROOMBOARD_BACKGROUNDS"];
  if (own !== undefined && own !== "") return pathToFileURL(own.endsWith("/") ? own : `${own}/`);
  return new URL("../../web/public/backgrounds/", wasmDir);
}

export function diskPackFiles(dir: URL): PackFiles {
  return {
    async read(file) {
      try {
        return new Blob([(await readFile(fileURLToPath(new URL(file, dir)))) as BlobPart]);
      } catch {
        throw new CliError("command", missingPackFile(file));
      }
    },
  };
}

export async function listBackgrounds(o: { readonly search?: string; readonly section?: string }): Promise<readonly PackLine[]> {
  if (o.section !== undefined && !(PACK_SECTIONS as readonly string[]).includes(o.section)) {
    throw new CliError("usage", `section inconnue : ${o.section} ; sections : ${PACK_SECTIONS.join(", ")}`);
  }
  const pack = await loadPack();
  let items: readonly PackBackground[] = pack;
  if (o.search !== undefined && o.search.trim() !== "") {
    const byId = new Map(pack.map((b) => [b.id, b] as const));
    items = createBackgroundSearch(pack).search(o.search).flatMap((id) => byId.get(id) ?? []);
  }
  return items.filter((b) => o.section === undefined || b.section === o.section).map((b) => ({ id: b.id, section: b.section, theme: b.theme, label: b.label, kind: b.kind }));
}

function pagesOf(tab: { readonly doc: CoreDocument }, args: Readonly<Record<string, unknown>>): readonly string[] {
  const page = optString(args, "page");
  const pages = args["pages"];
  if (page !== undefined && pages !== undefined) throw new CliError("usage", "background : « page » ou « pages », pas les deux");
  if (pages !== undefined) {
    if (pages !== "all") throw new CliError("usage", "pages : seule la valeur « all » est admise");
    return tab.doc.pageIds();
  }
  return [pageOf(tab, page)];
}

async function sourceOf(args: Readonly<Record<string, unknown>>, files: PackFiles): Promise<BackgroundSource> {
  const id = optString(args, "id");
  const file = optString(args, "file");
  if (id !== undefined) {
    const b = (await loadPack()).find((x) => x.id === id);
    if (b === undefined) throw new CliError("command", `fond inconnu : ${id}`);
    return resolvePack(b, files);
  }
  const path = file!;
  const bytes = await readBytes(path);
  const kind = sniffImage(bytes.subarray(0, HEAD_BYTES), path);
  if (kind === null) throw new CliError("unsupported", `${path} : en-tête d'image illisible`);
  const blob = new Blob([bytes as BlobPart], { type: IMAGE_MIME[kind] });
  const size = await probeSize(blob, kind);
  if (size === null) throw new CliError("unsupported", `${path} : taille de l'image illisible`);
  return { color: "#ffffff", grid: null, image: { blob, name: basename(path), mime: IMAGE_MIME[kind], w: size.w, h: size.h } };
}

/** Usage contrôlé d'abord (code 2), puis page (1), puis source (1 ou 3). */
export async function backgroundOp(tab: { readonly doc: CoreDocument; readonly assets: AssetStore }, args: Readonly<Record<string, unknown>>, files: PackFiles): Promise<Command> {
  if ((optString(args, "id") === undefined) === (optString(args, "file") === undefined)) {
    throw new CliError("usage", "background : « id » ou « file », l'un des deux");
  }
  const pages = pagesOf(tab, args);
  return backgroundCommand(tab.assets, await sourceOf(args, files), pages);
}
```

- [ ] **Étape 3 : opération, session, commande.**

`apps/cli/src/ops.ts` : `CLI_OPS` reçoit `"background"` (après `"import"`).

`apps/cli/src/session.ts` : import `import { backgroundOp, diskPackFiles, packDir } from "./backgrounds";` et
`import type { PackFiles } from "../../web/src/app/backgrounds-apply";` ; dans `SessionDeps` :
`/** personnalisation-1b (Q32) : fichiers du pack de fonds, lus sur disque. */ readonly backgrounds?: PackFiles;` ;
dans `runCli`, après le cas `"import"` :

```ts
      case "background": {
        const tab = active();
        const files = deps.backgrounds;
        if (files === undefined) throw new CliError("command", "pack de fonds absent de cette session");
        return { change: tab.doc.apply(await backgroundOp(tab, args, files)) };
      }
```

et dans l'appel `createSession({ … })` de `nodeSession`, après `env: io.env,` : `backgrounds: diskPackFiles(packDir(io.env, io.wasmDir)),`.

`apps/cli/src/main.ts` : import `import { listBackgrounds } from "./backgrounds";` ; dans `USAGE`, après `library` :
`backgrounds: "backgrounds [--search <texte>] [--section colors | lines | lessons | images]",` ; à la fin de `REFS`,
ajouter `" ; fond : {\"op\":\"background\",\"id\":… | \"file\":…, \"page\":… | \"pages\":\"all\"}"` ; dans `COMMANDS` :

```ts
  backgrounds: async (args, io) => {
    const p = parseArgs(args, { "--search": "value", "--section": "value" });
    if (p.positional.length > 0) throw usage(USAGE.backgrounds);
    for (const line of await listBackgrounds({ search: flagStr(p, "--search"), section: flagStr(p, "--section") })) io.out(JSON.stringify(line));
    return 0;
  },
```

(si `exactOptionalPropertyTypes` refuse `undefined`, construire l'objet sans les clés absentes).

- [ ] **Étape 4 : vert, suite CLI, construction.**

`cd <wt>/apps/cli && nice -n 10 pnpm exec vitest run src/backgrounds.test.ts 2>&1 | tail -10` → `Tests  10 passed (10)`, aucun `FAIL`.
`cd <wt> && nice -n 10 pnpm --filter @roomboard/cli exec tsc --noEmit 2>&1 | tail -5` → aucune ligne `error TS`.
`cd <wt> && ROOMBOARD_WASM_REQUIRED=1 node ~/.claude/scripts/vm/suite-vm.cjs -- pnpm --filter @roomboard/cli exec vitest run 2>&1 | tail -10` →
aucun `FAIL`, N ≥ 273 tests. Une liste figée de `CLI_OPS` ou de l'usage qui casse dans `ops.test.ts` ou `main.test.ts` :
y ajouter `background` / `backgrounds`, rien d'autre.
`cd <wt> && nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -3 && node apps/cli/dist/roomboard.mjs backgrounds --search seyes | head -2` →
première ligne `{"id":"seyes-8mm",…}`.

- [ ] **Étape 5 : `scripts/essais/cli-essai.mjs` (D15).**

Avant `// D79 — Ctrl-C pendant une conversion` :

```js
  // personnalisation-1b (Q32, S4) : liste et recherche du pack, opération background sur des copies temporaires.
  const fonds = cli(["backgrounds", "--search", "seyes"]);
  verifie("backgrounds --search seyes : seyes-8mm listé", fonds.code === 0 && fonds.lignes[0]?.id === "seyes-8mm", fonds.brut);
  const sectionKo = cli(["backgrounds", "--section", "bidule"]);
  verifie("backgrounds --section inconnue : code 2", sectionKo.code === 2, sectionKo.brut);
  const deux = join(dir, "fonds.roomboard");
  const cree = cli(["run", "--new", "--out", deux, "--ops", "-"], '{"type":"AddPage","after":"$page:0"}\n');
  verifie("fonds : tableau de deux pages", cree.code === 0, cree.brut);
  const tous = join(dir, "fonds-tous.roomboard");
  const ap = cli(["apply", deux, '{"op":"background","id":"seyes-8mm","pages":"all"}', "--out", tous]);
  verifie("apply background seyes-8mm, toutes les pages : code 0", ap.code === 0, ap.brut);
  const et = etat(tous);
  verifie("state : grille seyes sur chaque page", et.pages.length === 2 && et.pages.every((p) => p.page.grid?.levels[0]?.kind === "seyes"));
  const une = join(dir, "fonds-une.roomboard");
  const ar = cli(["apply", tous, '{"op":"background","id":"ardoise","page":"$page:1"}', "--out", une]);
  const eu = etat(une);
  verifie("apply background ardoise sur $page:1 : seule la deuxième page change", ar.code === 0 && eu.pages[0].page.background === "#fbf7ec" && eu.pages[1].page.background === "#2f3e46", ar.brut);
  const ko = join(dir, "fonds-ko.roomboard");
  const lesDeux = cli(["apply", deux, '{"op":"background","id":"ardoise","page":"$page:0","pages":"all"}', "--out", ko]);
  verifie("background page et pages ensemble : code 2, rien écrit", lesDeux.code === 2 && !existsSync(ko), lesDeux.brut);
```

Commande : `cd <wt> && nice -n 10 node scripts/essais/cli-essai.mjs 2>&1 | tail -15` → dernière ligne `CLI : OK`, les
lignes `ok — … backgrounds --search seyes` et `ok — … page et pages ensemble` présentes (hors LibreOffice :
`ROOMBOARD_SANS_SOFFICE=1` si absent, ligne « Office sauté »).

- [ ] **Étape 6 : commit.**

```bash
cd <wt>
for f in apps/cli/src/backgrounds.ts apps/cli/src/backgrounds.test.ts apps/cli/src/ops.ts apps/cli/src/session.ts apps/cli/src/main.ts scripts/essais/cli-essai.mjs; do git add "$f"; done
git diff --quiet -- apps/cli/src/ops.test.ts || git add apps/cli/src/ops.test.ts
git diff --quiet -- apps/cli/src/main.test.ts || git add apps/cli/src/main.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(cli): backgrounds command and background operation, same path as the app" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport attendu.** Sorties `tail` des étapes 4 et 5, lignes `Réutilisation : …`, sha du commit.

---

<a id="tache-t12"></a>
### Tâche T12 — Essai e2e S1 à S5, netteté, captures 2x, `verifier.sh`

**Objectif.** Un essai Playwright joue S1 à S5 au doigt puis au clavier, sous la CSP de la coque, toute requête hors de
127.0.0.1 faisant échouer l'essai (Q37) ; il lit d'abord des valeurs (`data-look`, `aria-checked`, avis, état CLI), puis
mesure la netteté § 10 (icône « Fonds », bord d'une carte, texte d'une carte), puis, avec `--captures`, écrit les captures
2x avant/après dans `docs/design/captures/personnalisation-1b/`. Ligne ajoutée à `scripts/verifier.sh` (bloc `--e2e`) et
à `scripts/tests/verifier-e2e.test.sh`. Suite complète finale. Cadrage : § 6, Q33, Q37 ; scénarios S1 à S5.

**Fichiers.**
- Créer : `scripts/essais/fonds-navigateur.mjs`, `docs/design/captures/personnalisation-1b/avant-barre.png`,
  `apres-barre.png`, `apres-fenetre-couleurs.png`, `apres-fenetre-lignes.png`, `apres-recherche-ocean.png`,
  `apres-mes-fonds.png`, `apres-seyes-page.png`
- Modifier : `scripts/essais/commun.mjs` (`TYPES` : `".webp": "image/webp"`), `scripts/verifier.sh` (bloc `--e2e`,
  après « design L2 : OK »), `scripts/tests/verifier-e2e.test.sh`

**Interfaces.**
- Consomme : sélecteurs de T6 (`button[data-item="backgrounds"]`), T9 (`[role="dialog"][data-panel="backgrounds"]`,
  `data-fond`, `data-fonds`, `data-edit`, `.rb-bg-thumb`, `.rb-bg-label`), T10 (`[data-grille="save-background"]`, avis
  « Grille enregistrée dans Mes fonds »), T8 (`#stage[data-look]`, format `couleur|grille|genre:empreinte`), T11 (CLI
  `backgrounds`, `background`), T4/T7 (`SOURCES.json`, thème `mer-ciel`), aides de `commun.mjs` (`serve`, `coqueCsp`,
  `dropFile`, `clickItem`, `item`, `frames`, `gitSha`, `loadPlaywright`, `solidPng`, `zipEntries`, `Echec`) et de
  `nettete.mjs` (`pixelsOf`, `edgeRow`, `fringes`, `hex`), `fabriques/pdf.mjs` (`pdfPages`).
- Produit : `node scripts/essais/fonds-navigateur.mjs [--captures] [--dist <dossier> --nom avant]` ; sortie : lignes
  `ok — …`, puis `personnalisation 1b : OK` ; codes 0, 1 (échec), 2 (outil absent).
- Réutilise : `scripts/essais/commun.mjs:204-210` (`coqueCsp()`), `scripts/essais/nettete.mjs` — appelés, non recopiés.
- Le rapport porte `Réutilisation : appelé scripts/essais/commun.mjs, nettete.mjs` ou l'écart.

**Contraintes (recopiées de Global Constraints).**
- VM partagée : builds et tests en `nice -n 10`, `cargo … -j 4`, `CARGO_TARGET_DIR=<worktree de la tâche>/target` (piège : cible partagée entre worktrees) ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; test isolé direct.
- Tailles Wasm : principal ≤ 1 572 864 o (1 375 581 o à `45484db`), formats ≤ 3 145 728 o (2 794 511 o) ; ni baissés ni relevés ; le pack ne va pas dans le Wasm. La suite finale mesure les deux (lignes « module Wasm » et « module formats » de `verifier.sh`).
- Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`, `.`, `commit -a`) ; jamais `--force`.
- Aucun test désactivé, sauté, ni seuil modifié. Essais Playwright existants (sélecteurs `data-item`) restent verts sans réécriture : `design-l1` à `design-l4` (S6 de `design-l2` à 1024 et 768 px compris), `s5b`, `c4-bibliotheque`, `c9-grille`, `c11b-capture` passent dans la suite finale.
- Aucune dépendance ajoutée sauf permissive et justifiée ; aucune AGPL/GPL/LGPL.
- Tactile d'abord (cibles ≥ 44 px, glisser aux événements de pointeur ; seul le dépôt de fichiers système passe par drop), clavier ensuite (raccourci par geste). Design : `docs/plans/design-cadrage.md` § 10 netteté.
- L'interface ne nomme aucun service extérieur ; provenances seulement dans `THIRD_PARTY_NOTICES.md` et le fichier de sources du pack.
- Aucun `tauri build`, aucun processus détaché laissé en marche (navigateur et serveur fermés en `finally`).
- Préparation : `cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3`, puis construire comme la suite : `cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH CARGO_TARGET_DIR=<wt>/target && node ~/.claude/scripts/vm/suite-vm.cjs -- bash scripts/verifier.sh 2>&1 | tail -15` (construit Wasm, web, CLI ; attendu `verifier.sh : OK`).

**Interdits.** `verifier.sh` ne passe jamais `--captures` ; ne réécrire aucun autre essai ; aucune capture commitée hors
du dossier `personnalisation-1b/` ; le dossier « avant » est temporaire et supprimé.

**Preuve visuelle.** Profil : pas de commande automatique. Lectures d'abord (dans l'essai : `data-look`, `aria-checked`,
avis, état CLI), puis captures 2x à décrire au rapport : barre d'outils avant/après (bouton « Fonds » à sa place, net),
fenêtre sur Couleurs et sur Lignes et grilles, résultats « ocean », Mes fonds avec trois cartes, page Seyès appliquée.

**Terminé quand.** `fonds-navigateur.mjs` rend `personnalisation 1b : OK` ; `bash scripts/tests/verifier-e2e.test.sh` OK ;
suite `verifier.sh --e2e` : `verifier.sh : e2e OK` puis `verifier.sh : OK`, tailles Wasm sous plafond ; 7 captures
écrites et décrites ; commit fait.

**Étapes.**

- [ ] **Étape 1 : servir le WebP et déclarer l'essai (rouge).**

`scripts/essais/commun.mjs`, table `TYPES` : ajouter `".webp": "image/webp",` après `".png"`.
`scripts/tests/verifier-e2e.test.sh`, après la ligne de design L2 :

```bash
# personnalisation 1b : ligne à part, comme design L2.
grep -q "scripts/essais/fonds-navigateur.mjs" scripts/verifier.sh || ko "fonds-navigateur absent de verifier.sh"
```

Commande : `cd <wt> && bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3` → `ECHEC : fonds-navigateur absent de verifier.sh`.

`scripts/verifier.sh`, dans le bloc `--e2e`, après `echo "design L2 : OK"` :

```bash
  node scripts/essais/fonds-navigateur.mjs
  echo "personnalisation 1b fonds : OK"
```

Commande : la même → `verifier-e2e.test.sh : OK`.

- [ ] **Étape 2 : écrire `scripts/essais/fonds-navigateur.mjs`.**

```js
#!/usr/bin/env node
// Essai personnalisation 1b « fonds de page » au navigateur (docs/plans/personnalisation-1b-cadrage.md, § 6, S1 à S5) :
// application construite servie sous la CSP de la coque (`coqueCsp()`), Chromium de Playwright, contexte tactile
// (`hasTouch`) 1920 × 1080 à 2x, repli de fichiers (`?fichiers=repli`), heure figée. Toute requête hors de 127.0.0.1
// fait échouer l'essai : le pack se charge hors ligne sous la CSP réelle (Q37). Netteté § 10 : icône « Fonds », bord
// et texte d'une carte. Joué par scripts/verifier.sh --e2e, jamais avec --captures.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/fonds-navigateur.mjs [--captures] [--dist <dossier> --nom avant]
//   --captures : docs/design/captures/personnalisation-1b/<nom>-*.png (2x) ; --nom avant : barre seule, scénarios sautés.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { clickItem, coqueCsp, DIST, dropFile, Echec, frames, gitSha, item, loadPlaywright, ROOT, serve, solidPng, zipEntries } from "./commun.mjs";
import { pdfPages } from "./fabriques/pdf.mjs";
import { edgeRow, fringes, hex, pixelsOf } from "./nettete.mjs";

const LABEL = "personnalisation 1b";
const FIXED = new Date("2026-11-27T09:00:00.000Z");
const VIEW = { width: 1920, height: 1080 };
const ARGS = ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"];
const DIALOG = '[role="dialog"][data-panel="backgrounds"]';
const CARD = (id) => `${DIALOG} button[data-fond="${id}"]`;
const SECTION = (id) => `${DIALOG} [data-edit="fonds-section"] [data-choice="${id}"]`;
const SEARCH = `${DIALOG} input[data-fonds="search"]`;
const ALL = `${DIALOG} button[data-fonds="all"]`;
const MINE = `${DIALOG} button[data-fond^="mine:"]`;
const TOOLS = '[data-toolbar="outils"]';
const TRACES = ["polyhaven", "poly haven", "wikimedia", "commons", "openverse", "flickr", "unsplash", "pixabay", "pexels", "http", "www."];
const CAPTURES = join(ROOT, "docs", "design", "captures", "personnalisation-1b");
const BIN = join(ROOT, "apps", "cli", "dist", "roomboard.mjs");
const SEA = JSON.parse(readFileSync(join(ROOT, "apps", "web", "backgrounds", "SOURCES.json"), "utf8")).photos.filter((p) => p.theme === "mer-ciel").map((p) => p.id);
const { PDFDocument, StandardFonts } = createRequire(join(ROOT, "apps", "web", "package.json"))("pdf-lib");
const [WHITE, NAVY, GRAY_300] = [hex("#ffffff"), hex("#182946"), hex("#E0E0E8")];
const BLANK = "#ffffff|-|-";
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const check = (cond, msg) => {
  if (!cond) throw new Echec(msg);
  console.log(`ok — ${msg}`);
};
const settle = async (page) => {
  await frames(page);
  await frames(page);
};
const look = (page) => page.getAttribute("#stage", "data-look");
const ids = (page) => page.$$eval(`${DIALOG} button[data-fond]`, (bs) => bs.map((b) => b.dataset.fond));
const toast = (page, text) => page.waitForSelector(`.rb-toast:has-text("${text}")`, { timeout: 15000 });
const blur = (page) => page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
const cli = (args) => {
  const r = spawnSync("node", [BIN, ...args], { encoding: "utf8", env: { ...process.env, ROOMBOARD_NOW: "1700000000000" } });
  return { code: r.status, lignes: (r.stdout ?? "").split("\n").filter((l) => l !== "").map((l) => JSON.parse(l)), brut: `${r.stdout}${r.stderr}` };
};
async function shot(page, name, selector) {
  const clip = selector === null ? undefined : await page.locator(selector).first().boundingBox();
  await page.screenshot({ path: join(CAPTURES, `${name}.png`), scale: "device", animations: "disabled", caret: "hide", ...(clip ? { clip } : {}) });
  console.log(`capture : docs/design/captures/personnalisation-1b/${name}.png`);
}
async function openDialog(page) {
  await page.tap(item("backgrounds"));
  await page.waitForSelector(DIALOG, { state: "visible", timeout: 15000 });
  await settle(page);
}
async function closed(page) {
  await page.waitForSelector(DIALOG, { state: "detached", timeout: 15000 });
  await settle(page);
}
/** data-look de chaque page, de la première à la dernière (boutons de la barre des pages). */
async function allLooks(page, n) {
  while (await page.locator(item("page-prev")).isEnabled()) await page.tap(item("page-prev"));
  await settle(page);
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(await look(page));
    if (i < n - 1) {
      await page.tap(item("page-next"));
      await settle(page);
    }
  }
  return out;
}
async function newTab(page) {
  const n = await page.locator('[role="tab"][data-tab]').count();
  await blur(page);
  await page.keyboard.press("Control+n");
  await page.waitForFunction((k) => document.querySelectorAll('[role="tab"][data-tab]').length === k, n + 1, { timeout: 15000 });
  await settle(page);
}

async function sharpness(page) {
  const b = await page.locator(`${item("backgrounds")} svg`).boundingBox();
  const px = await pixelsOf(page, { x: b.x, y: b.y, width: 24, height: 24 });
  // Rangée 12 à 2x (y = 6 px CSS) : seuls les deux bords verticaux du cadre de `wallpaper` (x = 2 et 22), sous le coin.
  const row = edgeRow(px, 12, 0, px.width, WHITE, NAVY);
  console.log(`icône Fonds, rangée 12 : ${row.gray.join(" ")}`);
  check(row.intermediate === 0 && row.runs.length === 2 && row.runs.every((r) => r === 3), "§ 10 : bords du cadre de l'icône « Fonds » en 3 pixels pleins, aucun intermédiaire");
  await openDialog(page);
  const t = await page.locator(`${DIALOG} .rb-bg-thumb`).first().boundingBox();
  const edge = await pixelsOf(page, { x: Math.round(t.x) - 4, y: Math.round(t.y + t.height / 2), width: 8, height: 1 });
  const e = edgeRow(edge, 0, 0, edge.width, WHITE, GRAY_300);
  console.log(`bord de carte : ${e.gray.join(" ")}`);
  check(e.intermediate === 0 && e.runs.length === 1 && e.runs[0] === 2, "§ 10 : bord de 1 px d'une carte en 2 pixels pleins à 2x");
  const l = await page.locator(`${DIALOG} .rb-bg-label`).first().boundingBox();
  check(fringes(await pixelsOf(page, l), WHITE, NAVY) === 0, "§ 10 : libellé d'une carte sans frange colorée");
  await page.keyboard.press("Escape");
  await closed(page);
}

async function s1(page, captures) {
  await openDialog(page);
  check((await page.getAttribute(SECTION("colors"), "aria-checked")) === "true", "S1 : la fenêtre s'ouvre sur « Couleurs »");
  if (captures) await shot(page, "apres-fenetre-couleurs", DIALOG);
  await page.tap(SECTION("lines"));
  await settle(page);
  if (captures) await shot(page, "apres-fenetre-lignes", DIALOG);
  await page.tap(CARD("seyes-8mm"));
  await closed(page);
  const l = await look(page);
  check(l === "#fbf7ec|seyes|-", `S1 : « Seyès 8 mm » sur fond crème (${l})`);
  if (captures) await shot(page, "apres-seyes-page", null);
  await page.tap(item("undo"));
  await settle(page);
  check((await look(page)) === BLANK, "S1 : un « Annuler » rend la page blanche, sans grille");
}

async function s2(page, captures) {
  await newTab(page);
  await page.tap(item("page-add"));
  await page.tap(item("page-add"));
  await settle(page);
  await openDialog(page);
  await page.fill(SEARCH, "ocean");
  await settle(page);
  const a = await ids(page);
  check(a.some((id) => SEA.includes(id)), `S2 : « ocean » montre des photos de mer (${a.filter((id) => SEA.includes(id)).length})`);
  if (captures) await shot(page, "apres-recherche-ocean", DIALOG);
  await page.fill(SEARCH, "oséan");
  await settle(page);
  check((await ids(page)).some((id) => SEA.includes(id)), "S2 : « oséan » (faute) aussi");
  await page.fill(SEARCH, "tableau noir");
  await settle(page);
  check((await ids(page)).includes("ardoise"), "S2 : « tableau noir » sort la couleur « Ardoise »");
  const text = ((await page.textContent(DIALOG)) ?? "").toLowerCase();
  check(TRACES.every((t) => !text.includes(t)), "S2 : le texte visible de la fenêtre ne nomme aucun site, aucun « http »");
  await page.fill(SEARCH, "ocean");
  await settle(page);
  const sea = (await ids(page)).find((id) => SEA.includes(id));
  await page.tap(ALL);
  check((await page.getAttribute(ALL, "aria-checked")) === "true", "S2 : « Toutes les pages » mis");
  await page.tap(CARD(sea));
  await closed(page);
  await toast(page, "Fond appliqué à 3 pages");
  const looks = await allLooks(page, 3);
  check(new Set(looks).size === 1 && looks[0].includes("|image:"), `S2 : trois pages, même fond, une seule empreinte (${looks[0]})`);
  await page.tap(item("undo"));
  await settle(page);
  check((await allLooks(page, 3)).every((l) => l === BLANK), "S2 : un seul « Annuler » rend les trois pages blanches");
  await dropFile(page, "#stage", "essai-2-pages.pdf", await pdfPages({ PDFDocument, StandardFonts }, 2), "application/pdf");
  await page.waitForFunction(() => /pdf-page:/.test(document.querySelector("#stage")?.dataset.look ?? ""), null, { timeout: 30000 });
  await settle(page);
  await openDialog(page);
  await page.tap(SECTION("lines"));
  await page.tap(ALL);
  await page.tap(CARD("quadrillage-5mm"));
  await closed(page);
  await toast(page, "pages PDF gardent leur page");
  check((await allLooks(page, 2)).every((l) => /^#ffffff\|squares\|pdf-page:/.test(l)), "S2 : pages PDF : page gardée, quadrillage posé, l'avis le dit");
  await page.tap(item("undo"));
  await settle(page);
  check((await allLooks(page, 2)).every((l) => /^#ffffff\|-\|pdf-page:/.test(l)), "S2 : un « Annuler » rend les pages PDF telles quelles");
}

async function s3(page, captures) {
  await newTab(page);
  await page.tap(item("pen"));
  const box = await page.locator("#stage").boundingBox();
  for (const y of [300, 420]) {
    await page.mouse.move(box.x + 400, box.y + y);
    await page.mouse.down();
    await page.mouse.move(box.x + 900, box.y + y, { steps: 12 });
    await page.mouse.up();
  }
  await settle(page);
  const elements = await page.getAttribute("#stage", "data-elements");
  await openDialog(page);
  await page.tap(SECTION("mine"));
  await page.tap(`${DIALOG} button[data-fonds="page"]`);
  await page.waitForFunction((sel) => document.querySelectorAll(sel).length === 1, MINE, { timeout: 15000 });
  check(true, "S3 : « Cette page » : une carte dans Mes fonds");
  await page.tap(`${DIALOG} button[data-fonds="close"]`);
  await closed(page);
  await clickItem(page, "grid");
  await page.waitForSelector("#grille", { state: "visible" });
  await page.selectOption('#grille [data-grille="kind"]', "dots");
  await page.tap('#grille [data-grille="save-background"]');
  await toast(page, "Grille enregistrée dans Mes fonds");
  await page.tap('#grille [data-grille="cancel"]');
  await openDialog(page);
  await page.tap(SECTION("mine"));
  await page.waitForFunction((sel) => document.querySelectorAll(sel).length === 2, MINE, { timeout: 15000 });
  check(true, "S3 : « Enregistrer comme fond » (Points) : une deuxième carte");
  await dropFile(page, DIALOG, "rouge.png", solidPng(64, 36, [220, 40, 40]), "image/png", [300, 300]);
  await page.waitForFunction((sel) => document.querySelectorAll(sel).length === 3, MINE, { timeout: 15000 });
  check((await page.getAttribute("#stage", "data-elements")) === elements && (await look(page)) === BLANK, "S3 : PNG déposé : une troisième carte, la page n'a reçu aucune image");
  if (captures) await shot(page, "apres-mes-fonds", DIALOG);
  await page.reload();
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await settle(page);
  check((await look(page)) === BLANK, "S3 : après rechargement, aucun fond dans le document");
  await openDialog(page);
  await page.tap(SECTION("mine"));
  await page.waitForFunction((sel) => document.querySelectorAll(sel).length === 3, MINE, { timeout: 15000 });
  check(true, "S3 : après rechargement, les trois cartes de Mes fonds sont là");
  await page.keyboard.press("Escape");
  await closed(page);
}

async function s4(page, tmp) {
  await page.tap(item("page-add"));
  await settle(page);
  await openDialog(page);
  await page.tap(SECTION("mine"));
  await page.tap(`${DIALOG} button[data-fond^="mine:page-"]`);
  await closed(page);
  const l = await look(page);
  check(l.includes("|image:"), `S4 : « Cette page » appliquée à la deuxième page (${l})`);
  await blur(page);
  const dl = page.waitForEvent("download");
  await page.keyboard.press("Control+s");
  const file = join(tmp, "fonds.roomboard");
  await (await dl).saveAs(file);
  const asset = l.split("|image:")[1];
  check(zipEntries(readFileSync(file)).some((n) => n.startsWith(`assets/${asset}`)), "S4 : l'image du fond est dans assets/ du fichier enregistré");
  await dropFile(page, "#stage", "fonds.roomboard", readFileSync(file), "");
  await page.waitForFunction((k) => document.querySelector("#stage")?.dataset.look?.includes(k) ?? false, `|image:${asset}`, { timeout: 30000 }).catch(() => undefined);
  const reopened = await allLooks(page, 2);
  check(reopened[1].includes(`|image:${asset}`), "S4 : rouvert, la deuxième page montre toujours l'image");
  const list = cli(["backgrounds", "--search", "seyes"]);
  check(list.code === 0 && list.lignes.some((x) => x.id === "seyes-8mm"), "S4 : roomboard backgrounds --search seyes liste seyes-8mm");
  const copie = join(tmp, "copie.roomboard");
  copyFileSync(file, copie);
  const tous = join(tmp, "s4-tous.roomboard");
  const ap = cli(["apply", copie, '{"op":"background","id":"seyes-8mm","pages":"all"}', "--out", tous]);
  const st = cli(["state", tous]).lignes[0];
  check(ap.code === 0 && st.pages.every((p) => p.page.grid?.levels[0]?.kind === "seyes"), `S4 : apply seyes-8mm sur toutes les pages : code 0, grille seyes partout (${ap.brut.slice(0, 80)})`);
  const une = join(tmp, "s4-une.roomboard");
  const ar = cli(["apply", tous, '{"op":"background","id":"ardoise","page":"$page:1"}', "--out", une]);
  const su = cli(["state", une]).lignes[0];
  check(ar.code === 0 && su.pages[0].page.background === "#fbf7ec" && su.pages[1].page.background === "#2f3e46", "S4 : ardoise sur $page:1 : seule la deuxième page change");
  check(cli(["apply", copie, '{"op":"background","id":"ardoise","page":"$page:0","pages":"all"}', "--out", join(tmp, "ko.roomboard")]).code === 2, "S4 : page et pages ensemble : code 2");
}

async function s5(page) {
  await newTab(page);
  await page.tap(item("page-add"));
  await settle(page);
  await page.tap(item("page-prev"));
  await page.tap(item("rect"));
  const box = await page.locator("#stage").boundingBox();
  await page.mouse.move(box.x + 500, box.y + 300);
  await page.mouse.down();
  await page.mouse.move(box.x + 800, box.y + 500, { steps: 8 });
  await page.mouse.up();
  await page.tap(item("select"));
  await page.mouse.click(box.x + 650, box.y + 400);
  await settle(page);
  await blur(page);
  await page.keyboard.press("Control+Shift+F");
  await page.waitForSelector(DIALOG, { state: "visible" });
  check((await page.evaluate(() => document.activeElement?.getAttribute("data-fonds"))) === "search", "S5 : Ctrl+Maj+F ouvre la fenêtre, focus dans la recherche");
  await page.keyboard.type("portee");
  await settle(page);
  for (let i = 0; i < 12 && !(await page.evaluate(() => document.activeElement?.hasAttribute("data-fond"))); i++) await page.keyboard.press("Tab");
  await page.keyboard.press("ArrowRight");
  const id = await page.evaluate(() => document.activeElement?.getAttribute("data-fond"));
  check(typeof id === "string" && id.startsWith("portees-"), `S5 : Tab jusqu'aux cartes, flèche droite : ${id}`);
  await page.keyboard.press("Shift+Enter");
  await closed(page);
  check((await page.evaluate(() => document.activeElement?.getAttribute("data-item"))) === "backgrounds", "S5 : fenêtre fermée, focus rendu au bouton « Fonds »");
  check((await allLooks(page, 2)).every((l) => l.includes("|music|")), "S5 : Maj+Entrée : la portée sur toutes les pages");
  await page.keyboard.press("Control+z");
  await settle(page);
  check((await allLooks(page, 2)).every((l) => l === BLANK), "S5 : Ctrl+Z défait tout");
  await page.tap(item("page-prev")).catch(() => undefined);
  await page.mouse.click(box.x + 650, box.y + 400);
  await settle(page);
  const [elements, selection] = [await page.getAttribute("#stage", "data-elements"), await page.getAttribute("#stage", "data-selection")];
  check(selection !== null && selection !== "", "S5 : rectangle sélectionné avant la contre-épreuve");
  await blur(page);
  await page.keyboard.press("Control+Shift+F");
  await page.waitForSelector(DIALOG, { state: "visible" });
  for (const k of ["Delete", "Space"]) await page.keyboard.press(k);
  await page.keyboard.press("Escape");
  await closed(page);
  check((await page.getAttribute("#stage", "data-elements")) === elements && (await page.getAttribute("#stage", "data-selection")) === selection, "S5 : Suppr, Espace puis Échap dans la fenêtre : fermée, rectangle toujours là et sélectionné");
}

async function main() {
  console.log(`sha ${gitSha()}`);
  const dist = arg("--dist") ? resolve(arg("--dist")) : DIST;
  const nom = arg("--nom") ?? "apres";
  const captures = process.argv.includes("--captures");
  if (!existsSync(join(dist, "index.html"))) {
    console.error(`${LABEL} : ÉCHEC — ${dist} sans index.html : lancer d'abord scripts/verifier.sh`);
    return 1;
  }
  if (nom !== "avant" && !existsSync(join(dist, "backgrounds", "photos"))) {
    console.error(`${LABEL} : ÉCHEC — pack absent de ${dist}`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${LABEL} : outil absent — Playwright introuvable`);
    return 2;
  }
  const server = await serve({ dist, headers: { "Content-Security-Policy": coqueCsp() } });
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-fonds-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ARGS });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2, hasTouch: true, acceptDownloads: true });
    const external = [];
    await context.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === "127.0.0.1") return route.continue();
      external.push(u.href);
      return route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => (m.type() === "error" ? errors.push(m.text()) : undefined));
    await page.clock.setFixedTime(FIXED);
    await page.goto(`http://127.0.0.1:${server.address().port}/?fichiers=repli`);
    await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
    await settle(page);
    if (captures) mkdirSync(CAPTURES, { recursive: true });
    if (nom === "avant") {
      if (!captures) throw new Echec("--nom avant exige --captures");
      await shot(page, "avant-barre", TOOLS);
    } else {
      if (captures) await shot(page, "apres-barre", TOOLS);
      await sharpness(page);
      await s1(page, captures);
      await s2(page, captures);
      await s3(page, captures);
      await s4(page, tmp);
      await s5(page);
    }
    check(errors.length === 0, `aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
    check(external.length === 0, `aucune requête hors de 127.0.0.1${external.length ? ` : ${external.join(", ")}` : ""}`);
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

Adapter seulement aux faits relevés en jouant l'essai, jamais aux attentes des scénarios : par exemple, si la page PDF
s'ouvre dans un nouvel onglet sans marquer `data-look`, attendre `data-fond="pret"` ; si `zipEntries` rend des objets,
lire leur nom ; si l'ouverture du `.roomboard` déposé change d'onglet, compter les pages de cet onglet.

- [ ] **Étape 3 : jouer l'essai (après la construction de la préparation).**

Commande : `cd <wt> && nice -n 10 node scripts/essais/fonds-navigateur.mjs 2>&1 | tail -50`
Attendu : ≥ 40 lignes `ok — …`, les lignes « § 10 : bords du cadre de l'icône », « S1 : « Seyès 8 mm » sur fond crème »,
« S2 : un seul « Annuler » », « S3 : après rechargement, les trois cartes », « S4 : page et pages ensemble : code 2 »,
« S5 : … toujours là et sélectionné », puis `personnalisation 1b : OK`. Un écart du produit (et non de l'essai) se corrige
dans la tâche qui possède le code, signalé au rapport avec la ligne d'échec.

- [ ] **Étape 4 : captures 2x avant/après.**

```bash
cd <wt> && node scripts/essais/fonds-navigateur.mjs --captures 2>&1 | tail -8
A=$(mktemp -d ~/.cache/tmp/og5-avant-XXXXXX)
git -C <wt> archive 45484db | tar -x -C "$A"
ln -s <wt>/node_modules "$A/node_modules" && ln -s <wt>/apps/web/node_modules "$A/apps/web/node_modules"
cp -r <wt>/apps/web/src/wasm <wt>/apps/web/src/wasm-formats "$A/apps/web/src/"
(cd "$A/apps/web" && nice -n 10 <wt>/apps/web/node_modules/.bin/vite build 2>&1 | tail -3)
cd <wt> && node scripts/essais/fonds-navigateur.mjs --captures --dist "$A/apps/web/dist" --nom avant 2>&1 | tail -4
rm -rf "$A"
ls docs/design/captures/personnalisation-1b/
```
Attendu : `personnalisation 1b : OK` deux fois ; 7 fichiers `avant-barre.png`, `apres-barre.png`,
`apres-fenetre-couleurs.png`, `apres-fenetre-lignes.png`, `apres-recherche-ocean.png`, `apres-mes-fonds.png`,
`apres-seyes-page.png`. Lire chaque capture et la décrire au rapport (netteté des traits, place du bouton, aucun nom de
site). Le build « avant » ne sert que la barre (Wasm de la branche, superset de `45484db`) ; dossier supprimé.

- [ ] **Étape 5 : suite complète.**

Commande : `cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH CARGO_TARGET_DIR=<wt>/target && node ~/.claude/scripts/vm/suite-vm.cjs -- bash scripts/verifier.sh --e2e 2>&1 | tail -40`
Attendu : `module Wasm : N octets` avec N ≤ 1 572 864, `module formats : M octets` avec M ≤ 3 145 728, `CLI : OK`,
`personnalisation 1b fonds : OK`, `design L2 : OK`, `verifier.sh : e2e OK`, `verifier.sh : OK` ; aucune ligne
`test result: FAILED`, `error[`, `FAIL `.

- [ ] **Étape 6 : commit.**

```bash
cd <wt>
for f in scripts/essais/fonds-navigateur.mjs scripts/essais/commun.mjs scripts/verifier.sh scripts/tests/verifier-e2e.test.sh docs/design/captures/personnalisation-1b/*.png; do git add "$f"; done
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "test(e2e): backgrounds scenarios S1 to S5 under the shell CSP, sharpness, 2x captures" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport attendu.** Sorties `tail` des étapes 3 et 5, tailles Wasm, description des 7 captures, ligne
`Réutilisation : …`, sha du commit.
