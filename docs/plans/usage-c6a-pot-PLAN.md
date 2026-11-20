# Plan d'exécution — usage-c6a-pot (C6a : pot de peinture vectoriel et mot par mot)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Cœur : `Command::Fill`, `BadFill`, `edge_hit`, liaison Wasm | — | `crates/roomboard-core/src/fill.rs` (neuf), `crates/roomboard-core/src/commands.rs`, `crates/roomboard-core/src/lib.rs`, `crates/roomboard-core/src/query.rs`, `crates/roomboard-core/tests/pot.rs` (neuf), `crates/roomboard-wasm/src/lib.rs` | isolé (`~/projets/roomboard-wt/usage-c6a-pot--T1`) | implementeur-tdd | `cargo test -p roomboard-core -p roomboard-wasm 2>&1 \| grep -E "test result\|FAILED\|panicked\|error\[\|fill\|edge" \| tail -40` : 0 `FAILED`, ≥ 10 tests `pot` dont `fill_inside_is_one_step_undone_and_redone`, `edge_hit_scales_half_width_with_transform`, `socle_fixture_opens_white_and_takes_a_fill`, et `fill_inner_and_edge_hit` (wasm) ; `compat_socle`, `texte_riche`, `tableau` verts ; module ≤ 1 572 864 o, taille citée | S1, S2, S4, S5 | #tache-t1 |
| T2 | Contrat TS : `Fill`, `edgeHit`, fond de la fausse liaison, aiguillage Wasm | — | `apps/web/src/core/api.ts`, `apps/web/src/core/fake-core.ts`, `apps/web/src/core/fake-core.test.ts`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts` | isolé (`~/projets/roomboard-wt/usage-c6a-pot--T2`) | concepteur-critique | `vitest run src/core` : 0 `×`, « contrat C6a : fausse liaison » ≥ 7 tests, « contrôle de forme C6a » ≥ 2, « fakeCore — C6a (fond de page) » ≥ 2 ; blocs C2, C7, C9, C10a, C10b verts | S1, S2, S4, S5 | #tache-t2 |
| T3 | Fond peint par le rendu, contrat du moteur (outil `fill`, `setFillColor`), éditeur de cellule | — | `apps/web/src/engine/render/renderer.ts`, `apps/web/src/engine/render/canvas2d.ts`, `apps/web/src/engine/render/canvas2d.test.ts`, `apps/web/src/engine/render/webgl2.ts`, `apps/web/src/engine/render/webgl2.test.ts`, `apps/web/src/engine/input/gesture.ts`, `apps/web/src/engine/engine.ts`, `apps/web/src/engine/engine.test.ts`, `apps/web/src/engine/tools/table.ts`, `apps/web/src/engine/tools/table.test.ts` | isolé (`~/projets/roomboard-wt/usage-c6a-pot--T3`) | implementeur-tdd | `vitest run src/engine/render/canvas2d.test.ts src/engine/render/webgl2.test.ts src/engine/engine.test.ts src/engine/tools/table.test.ts` : 0 `×`, « Canvas2DRenderer — fond de page (C6a) » ≥ 2, « WebGL2 — fond de page (C6a) » ≥ 2, « moteur — pot (C6a) » ≥ 3, « outil Tableau — fond de page (C6a) » ≥ 2 ; `canvas2d.test.ts` « drawScene : pourtour, page blanche » vert | S4 | #tache-t3 |
| T4 | Mise en lignes : caractère sous un point (`offsetAt`), mot UAX 29 (`wordAt`) | — | `apps/web/src/engine/text-layout.ts`, `apps/web/src/engine/text-layout.test.ts` | isolé (`~/projets/roomboard-wt/usage-c6a-pot--T4`) | implementeur-tdd | `vitest run src/engine/text-layout.test.ts` : 0 `×`, « offsetAt (C6a, D6) » ≥ 5 tests, « wordAt (C6a, D6, D26) » ≥ 4 ; tests d'avant C6a verts | S3 | #tache-t4 |
| T5 | Contrat C6a sur le vrai module Wasm, fichier d'avant C6a | T1, T2 | `apps/web/src/core/wasm-core.contract.test.ts`, `apps/web/src/core/fake-core.ts`, `apps/web/src/core/wasm-core.ts` | isolé (`~/projets/roomboard-wt/usage-c6a-pot--T5`) | implementeur-tdd | module reconstruit ; `ROOMBOARD_WASM_REQUIRED=1 vitest run src/core` : 0 `×`, « contrat C6a : vrai module wasm » ≥ 7, « contrat C6a : vrai module seulement » ≥ 1 ; `tsc` vide ; module ≤ 1 572 864 o, taille citée | S5 | #tache-t5 |
| T6 | Choix de la cible (`fill-target.ts`), outil Pot, fabrique de la session | T2, T3, T4 | `apps/web/src/engine/fill-target.ts` (neuf), `apps/web/src/engine/fill-target.test.ts` (neuf), `apps/web/src/engine/tools/fill.ts` (neuf), `apps/web/src/engine/tools/fill.test.ts` (neuf), `apps/web/src/app/board-session.ts`, `apps/web/src/app/board-session.test.ts` | isolé (`~/projets/roomboard-wt/usage-c6a-pot--T6`) | concepteur-critique | `vitest run src/engine/fill-target.test.ts src/engine/tools/fill.test.ts src/app/board-session.test.ts` : 0 `×`, « cible du pot (C6a) » ≥ 17 tests, « outil Pot (C6a, D15) » ≥ 6, « outil Pot (C6a) : un clic dans le vide colore le fond » 1 ; `pnpm --filter @roomboard/web test` 0 échec | S1, S2, S3, S4 | #tache-t6 |
| T7 | Barre et profils : outil Pot, couleurs, « Aucune », éditeur de profil, hôte | T3 | `apps/web/src/toolbar.ts`, `apps/web/src/toolbar.test.ts`, `apps/web/src/toolbar-profiles.ts`, `apps/web/src/toolbar-profiles.test.ts`, `apps/web/src/profile-edit.ts`, `apps/web/src/profile-edit.test.ts`, `apps/web/src/app/toolbar-host.ts`, `apps/web/src/app/toolbar-host.test.ts`, `apps/web/src/ui/Toolbar.tsx`, `apps/web/src/ui/Toolbar.test.tsx` | isolé (`~/projets/roomboard-wt/usage-c6a-pot--T7`) | implementeur-tdd | `vitest run src/toolbar.test.ts src/toolbar-profiles.test.ts src/profile-edit.test.ts src/app/toolbar-host.test.ts src/ui` : 0 `×`, « Toolbar — rangée du pot (C6a) » ≥ 5, « ToolbarHost — pot (C6a, D16) » ≥ 3, « outil Pot dans les profils (C6a) » 1, « couleurs du pot (C6a, D16, D17) » ≥ 3, « préréglages du pot (C6a, D17) » ≥ 2 | S1, S2 | #tache-t7 |
| T8 | Essai navigateur C6a dans `verifier.sh --e2e`, capture, scène ≥ 640 px, `inkIn` étendu | T5, T6, T7 | `scripts/essais/c6a-pot-navigateur.mjs` (neuf), `scripts/essais/commun.mjs`, `scripts/essais/c9-grille-navigateur.mjs`, `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/c6a-pot.png` (neuf) ; conditionnels : `apps/web/src/ui/Toolbar.tsx` (repli D19 si scène < 640), `crates/roomboard-core/tests/pot.rs` (test du groupe si `Command::Group` existe, D25) | isolé (`~/projets/roomboard-wt/usage-c6a-pot--T8`) | implementeur-tdd | `bash scripts/verifier.sh --e2e 2>&1 \| tail -80` : « C6a pot : OK », « C9 grille : OK », « C10b tableau : OK », « verifier.sh : e2e OK », « verifier.sh : OK » ; `bash scripts/tests/verifier-e2e.test.sh` : « verifier-e2e.test.sh : OK » ; `docs/essais/c6a-pot.png` présent | S1, S2, S3, S4, S5 | #tache-t8 |

**Vagues (par dépendances).** Vague 1 : T1, T2, T3, T4 (fichiers disjoints, quatre en parallèle). Vague 2 : T5 (dès
T1 et T2), T6 (dès T2, T3 et T4), T7 (dès T3) — disjoints entre eux. Vague 3 : T8. L'orchestrateur lance chaque tâche
dès que ses dépendances sont fusionnées dans la branche du chantier. Fichiers partagés entre vagues, donc jamais en
parallèle : `fake-core.ts`, `wasm-core.ts`, `wasm-core.contract.test.ts` (T2 puis T5) ; `ui/Toolbar.tsx` (T7 puis T8,
conditionnel) ; `crates/roomboard-core/tests/pot.rs` (T1 puis T8, conditionnel).

**Chemin critique.** T2 (≈ 40 min) → T6 (≈ 60) → T8 (≈ 50) ≈ 2 h 30 ; T1 (≈ 50) → T5 (≈ 20) et T3 (≈ 35) → T7 (≈ 45)
finissent avant T6. Il reste ≈ 45 min pour les relectures et la fusion.

**`tsc` entre les vagues (écarts nommés, les seuls permis).**

| fichier | erreur attendue | fermée par |
|---|---|---|
| `src/core/wasm-core.ts` | `Property 'fill' does not exist on type 'Document'`, `Property 'edge_hit' does not exist on type 'Document'` : les `.d.ts` du module copiés dans un worktree de tâche datent d'avant T1 | T5 (module reconstruit dans son worktree) ; persiste dans les worktrees de T6 et T7 (`.d.ts` copiés) ; T8 (`verifier.sh` reconstruit le module) |

Après T5 dans son worktree, et dans T8, `tsc` est vide.

**Goal :** l'outil Pot (couleur choisie, puis clic) colore la cible de U28 — intérieur ou contour d'une forme, trait,
mot sous le pointeur dans un texte ou une cellule, cellule, fond de la page — en une étape d'annulation, gardée à
l'aller-retour `.roomboard`.

**Architecture :** le cœur reçoit une commande grossière `Fill { page, target, color }` (DA1) dans un module neuf
`fill.rs`, et la requête `edge_hit` (DA2) : la géométrie du bord reste dans le cœur. Mots et cellules passent par les
commandes existantes (`FormatText`, `SetTableCell.spans`, `SetTableFill`). La page décide de la cible dans un module pur
`engine/fill-target.ts` (DA3) qui mesure le texte (`offsetAt`, `wordAt` de `text-layout.ts`) ; l'outil
`tools/fill.ts` n'est qu'un geste. Le rendu peint `background` de la page (DA4).

**Tech Stack :** Rust (yrs 0.28), wasm-bindgen 0.2.130, TypeScript, SolidJS 1.9.20, Vitest 3 (happy-dom pour le DOM),
`Intl.Segmenter` (UAX 29, aucune dépendance), Playwright (essai e2e).

**Spec :** `docs/plans/usage-c6a-pot-cadrage.md` (base `origin/main` @ 28ba886).

## Choix du plan (hors cadrage, à relire)

- PC1 Une couleur invalide (`valid_color` faux) est refusée en `BadFill` (D12 nomme la validation, pas l'erreur).
- PC2 Ordre des refus de `Fill`, cœur et fausse liaison : couleur (`BadFill`), page (`UnknownPage`), élément cherché
  sur cette page (`UnknownElement`), cible (`BadFill`) ; puis « même valeur » = aucune étape.
- PC3 Un élément d'une autre page que `page` vaut un élément inconnu.
- PC4 `query.rs` : `world_outline` passe de privé à `pub(crate)` (la carte dit « non touché » ; visibilité seule, pour
  que `edge_hit` porte le contour comme `hit_test`).
- PC5 `EngineState.fillColor` est facultatif (les littéraux d'état des tests d'avant C6a restent valides) ; le moteur le
  publie toujours.
- PC6 `ToolbarHost.fillColor(color)` neuf pour « Aucune » ; un préréglage du pot passe par `setTool("fill", id)` →
  `setFillColor`, jamais `setPenStyle`.
- PC7 `fillChoices` : dès que le profil a la clé `presets.fill` (même vide), elle fait foi ; un préréglage sans couleur
  y est sauté.
- PC8 Ids de `FILL_COLORS` : `rouge`, `jaune`, `vert`, `bleu`, `noir` (même nommage que les préréglages du stylo).
- PC9 La rangée du pot garde ses libellés ; le repli « pastilles sans libellé » (D19) n'est posé par T8 que si la
  mesure de la scène, Pot actif, donne moins de 640 px.
- PC10 Point ramené dans la boîte (D7) : texte dans [0, boxWidth] × [0, boxHeight] ; tableau dans [0, W) × [0, H) ; un
  clic dans la marge d'une cellule est « hors mot » (remplissage de la cellule).
- PC11 Matrice non inversible : texte entier pour un texte, fond de la page pour un tableau.
- PC12 La couleur du pot est lue au relâché.
- PC13 Fausse liaison : `background` de page écrit dans son JSON ; absent ou invalide à la lecture : `#ffffff`.
- PC14 WebGL2, aperçu de gomme : un fond que WebGL ne sait pas lire (nom CSS) est peint en `PAGE_BACKGROUND`.
- PC15 `DEFAULT_BACKGROUND = "#ffffff"` exporté par `api.ts` (miroir de `element.rs:15`).

## Global Constraints

- GC1 Budget : l'exécution entière tient en ≈ 3 h 15 sur la VM ; une tâche vise 20 à 60 min ; aucune commande lourde
  hors celles de sa section (`scripts/verifier.sh --e2e` seulement en T8).
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`,
  `#[ignore]`), aucun seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé. Les
  blocs « vrai module » se sautent d'eux-mêmes sans `.wasm` (mécanisme existant) ; T5 et T8 les jouent avec
  `ROOMBOARD_WASM_REQUIRED=1`.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri
  (`tauri build`), aucun build Android.
- GC4 Préparation du worktree `$WT` (`~/projets/roomboard-wt/usage-c6a-pot--T<n>`, donné par l'orchestrateur), une
  fois : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ; tâche Rust ou qui reconstruit le
  module (T1, T5, T8) : `[ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c6a-pot/target .` ; tâche TS
  (T2, T3, T4, T6, T7) : types seuls des modules Wasm, jamais le `.wasm` :
  `mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c6a-pot/apps/web/src/wasm/*.d.ts apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c6a-pot/apps/web/src/wasm-formats/*.d.ts apps/web/src/wasm-formats/`.
  Ces dossiers sont ignorés par git, jamais commités.
- GC5 Preuve bornée : la commande de la section, telle quelle ; le rapport cite le nombre de tests (N ≥ 1) et les noms
  attendus vus dans la sortie.
- GC6 Commits : chaque fichier ajouté par son chemin (`git add <chemin>`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Ne pas pousser.
- GC7 Interdits git : jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC8 Dépendances : aucune nouvelle (mots par `Intl.Segmenter`, pas de `unicode-segmentation`) ; jamais AGPL, GPL ni
  LGPL.
- GC9 Plafond du module Wasm principal 1 572 864 o (H2-13), contrôle de `scripts/verifier.sh` ni baissé ni relevé ; T1,
  T5 et T8 citent la taille du module.
- GC10 Format : aucun champ neuf (`fill`, `color`, `background` existent) ; `schema` et `formatVersion` inchangés ;
  `Fill` n'écrit que la clé qu'il change ; aucune `Any::Map`.
- GC11 Couches : `crates/` sans dépendance au navigateur ; la distance au bord d'une forme se mesure dans le cœur
  (`edge_hit`), la page ne la recode pas (seule la fausse liaison en a le miroir, D36) ; la fausse liaison suit le cœur
  dans le même ordre de refus et avec les mêmes messages.
- GC12 Interface : dans `apps/web/src/ui/`, aucun `switch`, aucune taille en `px` dans un `.tsx`, libellés en
  français, cibles d'au moins `--rb-btn-m` ; aucun style neuf dans `rb.css`.
- GC13 `tsc` : `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"` ne rend rien à la fin de la
  tâche, sauf les écarts nommés de la table « `tsc` entre les vagues ».
- GC14 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne
  `Réutilise :` de la section, et les noms de tests vus.
- GC15 Rust : `cargo fmt --all` puis `cargo clippy -p <crate> --all-targets -- -D warnings` sans avertissement avant le
  commit.
- GC16 Voisinage de C3 (D24) : aucun changement de `engine/tools/select.ts`, `engine/input/keys.ts`,
  `app/workspace.ts`, `crates/roomboard-core/src/element.rs`, `crates/roomboard-core/src/format/`, `ui/item-state.ts`.
- GC17 Aucun processus laissé en marche à la fin de la tâche (serveur, navigateur, `vite`).
- GC18 Périmètre : la tâche ne modifie que ses fichiers touchés.

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

1. Clic dans la bande de tolérance hors de la boîte d'un texte ou d'un tableau (D7, HC6-12) : ramené dans la boîte,
   puis règle ordinaire — tests « bande à gauche d'un texte : ramené dans la boîte, premier mot » et « bande sous le
   tableau : cellule de la dernière ligne » (T6).
2. Mot accentué, emoji, paires de substitution (UAX 29, bornes UTF-16 de `FormatText`, D6, D26) — tests
   « wordAt : « été » après un emoji, bornes UTF-16 », « repli sans Intl.Segmenter : lettres, chiffres, marques » (T4),
   « mot après un emoji : FormatText accepté par la fausse liaison » (T6).
3. Forme transformée, échelle uniforme ou non (bande du bord à l'échelle, D5, HC6-10) —
   `edge_hit_scales_half_width_with_transform` (T1), « edgeHit : … à l'échelle de la forme » (T2).
4. Cellule couverte par une fusion, cellule ombrée (D8, D9, HC6-8) — tests « cellule couverte : remplissage de
   l'ancre », « cellule ombrée : SetTableFill, aucun mot » (T6).
5. Geste interrompu et « Aucune » sans effet (D15, D11, D38, HC6-5) — tests « cancel et abort : aucune commande »,
   « « Aucune » sur un trait : aucune commande » (T6), `none_removes_fill_but_never_an_edge` (T1).

## Carte des fichiers

| fichier | responsabilité | tâche |
|---|---|---|
| `crates/roomboard-core/src/fill.rs` (neuf), `commands.rs`, `lib.rs`, `query.rs` | `FillTarget`, `cmd_fill`, `edge_hit` ; variante `Fill`, `BadFill`, bras d'`apply` ; `mod fill` ; `world_outline` en `pub(crate)` | T1 |
| `crates/roomboard-core/tests/pot.rs` (neuf) | étape, annulation, D38, refus, aller-retour, fixture d'avant C6a | T1 (T8 : groupe, conditionnel) |
| `crates/roomboard-wasm/src/lib.rs` | `fill`, `edge_hit`, `fill_inner` | T1 |
| `apps/web/src/core/api.ts`, `fake-core.ts`, `wasm-core.ts` (+ tests) | contrat `Fill`, `edgeHit`, fond de la fausse liaison (T2) ; écarts du vrai module (T5) | T2, T5 |
| `apps/web/src/engine/render/*`, `engine/input/gesture.ts`, `engine/engine.ts`, `engine/tools/table.ts` | fond peint, outil `fill`, `setFillColor`, fond de l'éditeur de cellule | T3 |
| `apps/web/src/engine/text-layout.ts` | `offsetAt`, `wordAt` | T4 |
| `apps/web/src/engine/fill-target.ts`, `engine/tools/fill.ts`, `app/board-session.ts` | cible du pot, geste, fabrique | T6 |
| `apps/web/src/toolbar.ts`, `toolbar-profiles.ts`, `profile-edit.ts`, `app/toolbar-host.ts`, `ui/Toolbar.tsx` | outil Pot, `FILL_COLORS`, rangée, préréglages, hôte | T7 |
| `scripts/essais/*`, `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/c6a-pot.png` | essai e2e, capture, `inkIn` étendu | T8 |

---

### Tâche T1 — Cœur : `Command::Fill`, `BadFill`, `edge_hit`, liaison Wasm
<a id="tache-t1"></a>

**Objectif.** Le cœur écrit la couleur d'un contour (`color`), d'un intérieur (`fill`) ou du fond d'une page
(`background`) par une commande `Fill` d'une seule transaction (une étape, D11 du socle), sans étape quand rien ne
change (D38) ; il répond « le point est-il sur le bord de cette forme ? » (`edge_hit`, DA2). La liaison Wasm expose les
deux. Sert S1, S2, S4, S5.

**Fichiers.**
- Créer : `crates/roomboard-core/src/fill.rs`
- Créer : `crates/roomboard-core/tests/pot.rs`
- Modifier : `crates/roomboard-core/src/commands.rs` (`Command` vers `:30-191`, `CommandError` `:212-227`, `Display`
  `:229-277`, `apply` `:509-668`)
- Modifier : `crates/roomboard-core/src/lib.rs` (`pub mod fill;`)
- Modifier : `crates/roomboard-core/src/query.rs:66` (`fn world_outline` → `pub(crate) fn world_outline`, PC4)
- Modifier : `crates/roomboard-wasm/src/lib.rs` (méthode exposée après `hit_test` `:904`, `fill_inner` dans le second
  `impl Document`, test natif dans `mod tests`)

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit (lu par T2 pour le miroir, par T5 et le module) :

```rust
// crates/roomboard-core/src/fill.rs
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FillTarget { Edge { id: String }, Inside { id: String }, Background }
impl Document {
    pub(crate) fn cmd_fill(&mut self, page: &str, target: &FillTarget, color: Option<&str>) -> Result<Change, CommandError>;
    pub fn edge_hit(&self, id: &str, x: f64, y: f64, tol: f32) -> bool;
}
// crates/roomboard-core/src/commands.rs
Command::Fill { page: String, target: crate::fill::FillTarget, color: Option<String> }
CommandError::BadFill // Display : "remplissage invalide (couleur valide, contour d'une forme ou d'un trait, intérieur d'un rectangle ou d'une ellipse attendus)"
// crates/roomboard-wasm/src/lib.rs (wasm-bindgen, lu par wasm-core.ts de T2)
pub fn fill(&mut self, page: &str, target: &str, id: Option<String>, color: Option<String>) -> Result<JsValue, JsError>; // target : "edge" | "inside" | "background"
pub fn edge_hit(&self, id: &str, x: f64, y: f64, tol: f32) -> bool;
pub fn fill_inner(&mut self, page: &str, target: &str, id: Option<&str>, color: Option<String>) -> Result<Change, CommandError>;
```

- Réutilise : `crates/roomboard-core/src/ink/hit.rs:32` — `dist_to_edges(poly: &[f32], x: f32, y: f32) -> f32`.
- Réutilise : `crates/roomboard-core/src/shape.rs:69` — `shape_polygon(kind, w, h, 0.0)` (tracé élargi d'une unité,
  D5) ; `crates/roomboard-core/src/commands.rs:306` — `read_shape(txn, e) -> Option<ShapeFields>`.
- Réutilise : `crates/roomboard-core/src/commands.rs:30` (`Command`) — étendu par `Fill` (DA1).
- Réutilise : `crates/roomboard-core/src/rich_text.rs:54` — `valid_color(c: &str) -> bool`.
- Réutilise : `crates/roomboard-core/src/query.rs:192` (`hit_test`) et `:66` (`world_outline`) — même portage du
  contour en monde que `hit_test`.
- Réutilise : `crates/roomboard-core/src/commands.rs:372` — `similarity_scale(t) -> Option<f64>`.
- Réutilise : `crates/roomboard-core/tests/compat_socle.rs:12` — patron `fixture(name)` et
  `tests/fixtures/socle-v1.roomboard`.
- Réutilise : `crates/roomboard-core/src/document.rs:81`, `:171` — champ `background`, déjà écrit et lu.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
cargo test -p roomboard-core -p roomboard-wasm 2>&1 | grep -E "test result|FAILED|panicked|error\[|fill|edge" | tail -40 && \
cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -1 && rm -rf /tmp/c6a-t1-wasm && \
wasm-bindgen --target web --remove-name-section --out-dir /tmp/c6a-t1-wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && \
wc -c /tmp/c6a-t1-wasm/roomboard_wasm_bg.wasm
```

Attendu : aucun `FAILED`, aucun `error[` ; les 10 tests de `pot.rs` (`fill_inside_is_one_step_undone_and_redone`,
`fill_edge_writes_color_of_shape_and_stroke`, `none_removes_fill_but_never_an_edge`, `same_value_is_no_step`,
`background_is_written_and_none_means_white`, `bad_fill_is_refused_in_core_order_without_step`,
`bad_fill_message_is_readable`, `edge_hit_band_is_tolerance_plus_half_width`,
`edge_hit_scales_half_width_with_transform`, `fill_survives_save_and_load`) plus
`socle_fixture_opens_white_and_takes_a_fill` en `ok` ; `fill_inner_and_edge_hit` (wasm) en `ok` ; toutes les lignes
`test result` à `0 failed` (tests à garder verts : `compat_socle`, `texte_riche`, `tableau`, `tableau_fusion`,
`scenarios`) ; taille ≤ 1 572 864, citée.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun `#[ignore]`, aucun seuil changé.
- GC3 `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile) && ([ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c6a-pot/target .)`.
- GC5 Preuve : la commande ci-dessus, telle quelle ; le rapport cite N, les noms vus et la taille du module.
- GC6 Commits : `git add <chemin>` un par un, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message
  anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; ne pas pousser.
- GC7 Jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC8 Aucune dépendance nouvelle ; jamais AGPL, GPL ni LGPL.
- GC9 Plafond du module 1 572 864 o ni baissé ni relevé ; taille citée.
- GC10 Aucun champ neuf ; `schema` inchangé ; `Fill` n'écrit que la clé qu'il change ; aucune `Any::Map`.
- GC11 `crates/` sans dépendance au navigateur ; la distance au bord se mesure ici, dans le cœur.
- GC14 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.
- GC15 `cargo fmt --all` puis `cargo clippy -p roomboard-core -p roomboard-wasm --all-targets -- -D warnings` sans avertissement.
- GC16 Aucun changement de `element.rs` ni de `format/` (voisinage de C3, D24).
- GC17 Aucun processus laissé en marche.
- GC18 Périmètre : seuls les six fichiers ci-dessus.

**Interdits.** Ne pas toucher `history.rs`, `element.rs`, `format/` ; ne pas ajouter de champ ni de `kind` ; ne pas
commiter `apps/web/src/wasm/` ; dans `commands.rs`, seulement la variante, `BadFill`, son message et le bras d'`apply`
(D24).

**Critère « terminé ».** Commande bornée verte, clippy et fmt propres, taille citée, un ou deux commits.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : écrire les tests rouges** `crates/roomboard-core/tests/pot.rs` :

```rust
//! Pot de peinture (C6a, D12, DA1, DA2) : `Command::Fill` et `edge_hit` par l'API publique du cœur.
use std::path::PathBuf;

use roomboard_core::commands::{Command, CommandError};
use roomboard_core::document::Document;
use roomboard_core::element::StrokeStyle;
use roomboard_core::fill::FillTarget;
use roomboard_core::format::{load, save, SaveMeta};
use roomboard_core::shape::ShapeKind;

fn pen() -> StrokeStyle {
    StrokeStyle {
        color: "#000000".into(),
        width: 4.0,
    }
}

fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-20T00:00:00Z".into(),
        created: None,
    }
}

fn setup() -> (Document, String) {
    let d = Document::blank();
    let p = d.page_ids()[0].clone();
    (d, p)
}

fn shape(d: &mut Document, p: &str, kind: ShapeKind, c: [f64; 4]) -> String {
    d.apply(Command::AddShape {
        page: p.to_string(),
        shape: kind,
        x0: c[0],
        y0: c[1],
        x1: c[2],
        y1: c[3],
        style: pen(),
        fill: None,
    })
    .expect("forme")
    .ids[0]
        .clone()
}

fn stroke(d: &mut Document, p: &str) -> String {
    let points: Vec<f32> = (0..=20)
        .flat_map(|i| [100.0 + i as f32 * 10.0, 500.0, 0.5])
        .collect();
    d.apply(Command::CommitStroke {
        page: p.to_string(),
        points,
        style: pen(),
    })
    .expect("trait")
    .ids[0]
        .clone()
}

fn text(d: &mut Document, p: &str) -> String {
    d.apply(Command::SetText {
        page: p.to_string(),
        id: None,
        x: 400.0,
        y: 400.0,
        content: "abc".into(),
        color: "#000000".into(),
        size: 36.0,
        box_width: 600.0,
        box_height: 45.0,
        spans: None,
    })
    .expect("texte")
    .ids[0]
        .clone()
}

fn fill(p: &str, target: FillTarget, color: Option<&str>) -> Command {
    Command::Fill {
        page: p.to_string(),
        target,
        color: color.map(str::to_string),
    }
}

fn inside(id: &str) -> FillTarget {
    FillTarget::Inside { id: id.to_string() }
}

fn edge(id: &str) -> FillTarget {
    FillTarget::Edge { id: id.to_string() }
}

fn fill_of(d: &Document, id: &str) -> Option<String> {
    d.element(id).and_then(|e| e.shape).and_then(|s| s.fill)
}

fn color_of(d: &Document, id: &str) -> String {
    d.element(id)
        .and_then(|e| e.style)
        .map(|s| s.color)
        .unwrap_or_default()
}

fn background(d: &Document, p: &str) -> String {
    d.page(p).expect("page").background
}

#[test]
fn fill_inside_is_one_step_undone_and_redone() {
    // S1 : remplir, annuler en une étape, rétablir.
    let (mut d, p) = setup();
    let r = shape(&mut d, &p, ShapeKind::Rect, [100.0, 100.0, 300.0, 200.0]);
    let v = d.version();
    let c = d.apply(fill(&p, inside(&r), Some("#facc15"))).expect("pot");
    assert_eq!((c.pages.clone(), c.ids.clone()), (vec![p.clone()], vec![r.clone()]));
    assert!(c.version > v);
    assert_eq!(fill_of(&d, &r).as_deref(), Some("#facc15"));
    assert!(d.undo());
    assert_eq!(fill_of(&d, &r), None);
    assert!(d.redo());
    assert_eq!(fill_of(&d, &r).as_deref(), Some("#facc15"));
}

#[test]
fn fill_edge_writes_color_of_shape_and_stroke() {
    // S2 : contour d'une forme (l'intérieur gardé), trait du stylo.
    let (mut d, p) = setup();
    let r = shape(&mut d, &p, ShapeKind::Rect, [100.0, 100.0, 300.0, 200.0]);
    let s = stroke(&mut d, &p);
    d.apply(fill(&p, inside(&r), Some("#facc15"))).expect("intérieur");
    d.apply(fill(&p, edge(&r), Some("#dc2626"))).expect("contour");
    assert_eq!((color_of(&d, &r), fill_of(&d, &r).as_deref()), ("#dc2626".to_string(), Some("#facc15")));
    d.apply(fill(&p, edge(&s), Some("#dc2626"))).expect("trait");
    assert_eq!(color_of(&d, &s), "#dc2626");
    let l = shape(&mut d, &p, ShapeKind::Line, [100.0, 300.0, 300.0, 300.0]);
    d.apply(fill(&p, edge(&l), Some("#1d4ed8"))).expect("ligne");
    assert_eq!(color_of(&d, &l), "#1d4ed8");
}

#[test]
fn none_removes_fill_but_never_an_edge() {
    // D11 : « Aucune » retire le remplissage ; sur un contour ou un trait, aucune étape (D38).
    let (mut d, p) = setup();
    let r = shape(&mut d, &p, ShapeKind::Ellipse, [100.0, 100.0, 300.0, 200.0]);
    let s = stroke(&mut d, &p);
    d.apply(fill(&p, inside(&r), Some("#facc15"))).expect("intérieur");
    d.apply(fill(&p, inside(&r), None)).expect("aucune");
    assert_eq!(fill_of(&d, &r), None);
    let v = d.version();
    for c in [fill(&p, inside(&r), None), fill(&p, edge(&r), None), fill(&p, edge(&s), None)] {
        let ch = d.apply(c).expect("sans effet");
        assert_eq!(ch.version, v);
    }
    assert_eq!((color_of(&d, &r), color_of(&d, &s)), ("#000000".to_string(), "#000000".to_string()));
}

#[test]
fn same_value_is_no_step() {
    // D38 : même valeur, aucune étape.
    let (mut d, p) = setup();
    let r = shape(&mut d, &p, ShapeKind::Rect, [100.0, 100.0, 300.0, 200.0]);
    d.apply(fill(&p, inside(&r), Some("#facc15"))).expect("intérieur");
    let v = d.version();
    assert_eq!(d.apply(fill(&p, inside(&r), Some("#facc15"))).expect("même").version, v);
    assert_eq!(d.apply(fill(&p, edge(&r), Some("#000000"))).expect("même contour").version, v);
    assert_eq!(d.apply(fill(&p, FillTarget::Background, Some("#ffffff"))).expect("même fond").version, v);
    assert_eq!(d.apply(fill(&p, FillTarget::Background, None)).expect("blanc").version, v);
}

#[test]
fn background_is_written_and_none_means_white() {
    // S4, D10, D11 : fond écrit ; « Aucune » = #ffffff ; annuler rend le bleu.
    let (mut d, p) = setup();
    let c = d.apply(fill(&p, FillTarget::Background, Some("#1d4ed8"))).expect("fond");
    assert_eq!((c.pages.clone(), c.ids.len()), (vec![p.clone()], 0));
    assert_eq!(background(&d, &p), "#1d4ed8");
    d.apply(fill(&p, FillTarget::Background, None)).expect("aucune");
    assert_eq!(background(&d, &p), "#ffffff");
    assert!(d.undo());
    assert_eq!(background(&d, &p), "#1d4ed8");
}

#[test]
fn bad_fill_is_refused_in_core_order_without_step() {
    // D12, PC1 à PC3 : couleur, page, élément (sur la page), cible ; aucune étape.
    let (mut d, p) = setup();
    let r = shape(&mut d, &p, ShapeKind::Rect, [100.0, 100.0, 300.0, 200.0]);
    let l = shape(&mut d, &p, ShapeKind::Arrow, [100.0, 300.0, 300.0, 300.0]);
    let s = stroke(&mut d, &p);
    let t = text(&mut d, &p);
    let p2 = d.apply(Command::AddPage { after: None }).expect("page").pages[0].clone();
    let v = d.version();
    let cases = [
        (fill("nope", inside(&r), Some("#12")), CommandError::BadFill),
        (fill("nope", inside(&r), Some("#facc15")), CommandError::UnknownPage("nope".into())),
        (fill(&p, inside("nope"), Some("#facc15")), CommandError::UnknownElement("nope".into())),
        (fill(&p2, inside(&r), Some("#facc15")), CommandError::UnknownElement(r.clone())),
        (fill(&p, inside(&l), Some("#facc15")), CommandError::BadFill),
        (fill(&p, inside(&s), Some("#facc15")), CommandError::BadFill),
        (fill(&p, edge(&t), Some("#facc15")), CommandError::BadFill),
        (fill(&p, inside(&t), None), CommandError::BadFill),
    ];
    for (cmd, err) in cases {
        assert_eq!(d.apply(cmd.clone()), Err(err), "{cmd:?}");
    }
    assert_eq!(d.version(), v);
}

#[test]
fn bad_fill_message_is_readable() {
    assert_eq!(
        CommandError::BadFill.to_string(),
        "remplissage invalide (couleur valide, contour d'une forme ou d'un trait, intérieur d'un rectangle ou d'une ellipse attendus)"
    );
}

#[test]
fn edge_hit_band_is_tolerance_plus_half_width() {
    // D5, HC6-10 : tracé élargi d'une unité (x = 99), bande = tol + demi-épaisseur (6 + 2).
    let (mut d, p) = setup();
    let r = shape(&mut d, &p, ShapeKind::Rect, [100.0, 100.0, 300.0, 200.0]);
    let e = shape(&mut d, &p, ShapeKind::Ellipse, [100.0, 300.0, 300.0, 400.0]);
    let l = shape(&mut d, &p, ShapeKind::Line, [100.0, 500.0, 300.0, 500.0]);
    let s = stroke(&mut d, &p);
    assert!(d.edge_hit(&r, 103.0, 150.0, 6.0));
    assert!(d.edge_hit(&r, 107.0, 150.0, 6.0));
    assert!(!d.edge_hit(&r, 110.0, 150.0, 6.0));
    assert!(!d.edge_hit(&r, 200.0, 150.0, 6.0));
    assert!(d.edge_hit(&e, 104.0, 350.0, 6.0));
    assert!(!d.edge_hit(&e, 200.0, 350.0, 6.0));
    assert!(!d.edge_hit(&l, 200.0, 500.0, 6.0));
    assert!(!d.edge_hit(&s, 200.0, 500.0, 6.0));
    assert!(!d.edge_hit("nope", 103.0, 150.0, 6.0));
}

#[test]
fn edge_hit_scales_half_width_with_transform() {
    // Similitude × 2 : contour monde x = 198, bande 6 + 2 × 2 = 10 ; échelle (2, 1) : racine du déterminant, √2.
    let (mut d, p) = setup();
    let r = shape(&mut d, &p, ShapeKind::Rect, [100.0, 100.0, 300.0, 200.0]);
    d.apply(Command::Transform {
        ids: vec![r.clone()],
        matrix: [2.0, 0.0, 0.0, 2.0, 0.0, 0.0],
    })
    .expect("échelle");
    assert!(d.edge_hit(&r, 190.0, 300.0, 6.0));
    assert!(!d.edge_hit(&r, 186.0, 300.0, 6.0));
    let q = shape(&mut d, &p, ShapeKind::Rect, [100.0, 600.0, 300.0, 700.0]);
    d.apply(Command::Transform {
        ids: vec![q.clone()],
        matrix: [2.0, 0.0, 0.0, 1.0, 0.0, 0.0],
    })
    .expect("anisotrope");
    assert!(d.edge_hit(&q, 190.0, 650.0, 6.0));
    assert!(!d.edge_hit(&q, 189.0, 650.0, 6.0));
}

#[test]
fn fill_survives_save_and_load() {
    // S5, D21 : valeurs de champs existants, gardées à l'aller-retour.
    let (mut d, p) = setup();
    let r = shape(&mut d, &p, ShapeKind::Rect, [100.0, 100.0, 300.0, 200.0]);
    d.apply(fill(&p, inside(&r), Some("#facc15"))).expect("intérieur");
    d.apply(fill(&p, edge(&r), Some("#dc2626"))).expect("contour");
    d.apply(fill(&p, FillTarget::Background, Some("#1d4ed8"))).expect("fond");
    let back = load(&save(&d, &meta()).expect("save")).expect("load");
    assert_eq!(fill_of(&back, &r).as_deref(), Some("#facc15"));
    assert_eq!(color_of(&back, &r), "#dc2626");
    assert_eq!(background(&back, &p), "#1d4ed8");
    assert_eq!(back.schema(), Some(1.0));
}

#[test]
fn socle_fixture_opens_white_and_takes_a_fill() {
    // S5, D21 : un fichier d'avant C6a s'ouvre, fond blanc, et le pot y colore le fond.
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/socle-v1.roomboard");
    let mut d = load(&std::fs::read(path).expect("fixture")).expect("load");
    let p = d.page_ids()[0].clone();
    assert_eq!(background(&d, &p), "#ffffff");
    d.apply(fill(&p, FillTarget::Background, Some("#1d4ed8"))).expect("fond");
    assert_eq!(background(&d, &p), "#1d4ed8");
}
```

- [ ] **Étape 3 : les voir rouges.**
  `cargo test -p roomboard-core --test pot 2>&1 | grep -E "error\[|unresolved|FAILED" | head -5` — attendu :
  `error[E0432]: unresolved import roomboard_core::fill` (le module n'existe pas).

- [ ] **Étape 4 : écrire `crates/roomboard-core/src/fill.rs`.**

```rust
//! Pot de peinture (C6a, DA1, DA2) : commande `Fill` (contour, intérieur, fond de page), une transaction, aucune étape
//! sans effet (D38), et requête `edge_hit` (bord d'un rectangle ou d'une ellipse, mesuré comme `hit_test`). Mots et
//! cellules gardent `FormatText`, `SetTableCell`, `SetTableFill` (D6, D8, D9). C6b et C8 ajouteront une variante de
//! `FillTarget`.
use yrs::{In, Map, MapRef, ReadTxn};

use crate::commands::{read_shape, similarity_scale, Change, CommandError};
use crate::document::Document;
use crate::element::{out_string, out_transform, DEFAULT_BACKGROUND};
use crate::ink::hit::dist_to_edges;
use crate::query::world_outline;
use crate::rich_text::valid_color;
use crate::shape::shape_polygon;

/// Cible du pot (D12) : contour d'une forme ou d'un trait (`color`), intérieur d'un rectangle ou d'une ellipse (`fill`),
/// fond de la page (`background`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FillTarget {
    Edge { id: String },
    Inside { id: String },
    Background,
}

/// Clé écrite pour une cible d'élément ; `None` si la cible ne convient pas (intérieur d'une ligne, d'une flèche, d'un
/// trait ; texte, image, tableau, élément inconnu ou mal formé).
fn field_for<T: ReadTxn>(txn: &T, e: &MapRef, inside: bool) -> Option<&'static str> {
    match out_string(e.get(txn, "kind")).as_deref() {
        Some("stroke") if !inside => Some("color"),
        Some("shape") => {
            let s = read_shape(txn, e)?;
            if inside {
                (!s.kind.is_segment()).then_some("fill")
            } else {
                Some("color")
            }
        }
        _ => None,
    }
}

impl Document {
    /// Ordre des refus (PC2) : couleur, page, élément cherché sur cette page (PC3), cible ; puis même valeur : aucune
    /// étape. « Aucune » : intérieur retiré, fond à `#ffffff`, contour ou trait sans effet (D11).
    pub(crate) fn cmd_fill(
        &mut self,
        page: &str,
        target: &FillTarget,
        color: Option<&str>,
    ) -> Result<Change, CommandError> {
        if color.is_some_and(|c| !valid_color(c)) {
            return Err(CommandError::BadFill);
        }
        let (map, key, value, ids) = {
            let txn = self.read();
            let (_, page_map) = self
                .find_page(&txn, page)
                .ok_or_else(|| CommandError::UnknownPage(page.to_string()))?;
            match target {
                FillTarget::Background => (
                    page_map,
                    "background",
                    Some(color.unwrap_or(DEFAULT_BACKGROUND).to_string()),
                    Vec::new(),
                ),
                FillTarget::Edge { id } | FillTarget::Inside { id } => {
                    let found = self
                        .find_element(&txn, id)
                        .filter(|f| f.page_id == page)
                        .ok_or_else(|| CommandError::UnknownElement(id.clone()))?;
                    let inside = matches!(target, FillTarget::Inside { .. });
                    let key = field_for(&txn, &found.element, inside).ok_or(CommandError::BadFill)?;
                    if key == "color" && color.is_none() {
                        return Ok(self.unchanged());
                    }
                    (found.element, key, color.map(str::to_string), vec![id.clone()])
                }
            }
        };
        let current = {
            let txn = self.read();
            out_string(map.get(&txn, key))
        };
        if current == value {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            match &value {
                Some(v) => {
                    map.insert(&mut txn, key, In::from(v.as_str()));
                }
                None => {
                    map.remove(&mut txn, key);
                }
            }
        }
        Ok(self.done(Change {
            pages: vec![page.to_string()],
            ids,
            ..Default::default()
        }))
    }

    /// Bord d'un rectangle ou d'une ellipse (D5, DA2) : distance du point (monde) au tracé `shape_polygon(kind, w, h,
    /// 0.0)` porté en monde comme `hit_test`, au plus `tol` + demi-épaisseur × échelle de la matrice (similitude : son
    /// facteur ; sinon racine du déterminant). Faux pour une ligne, une flèche, un trait, tout autre élément, un id inconnu.
    pub fn edge_hit(&self, id: &str, x: f64, y: f64, tol: f32) -> bool {
        let txn = self.read();
        let Some(found) = self.find_element(&txn, id) else {
            return false;
        };
        let e = &found.element;
        let (Some(s), Some(t)) = (read_shape(&txn, e), out_transform(e.get(&txn, "transform"))) else {
            return false;
        };
        if s.kind.is_segment() {
            return false;
        }
        let scale = similarity_scale(&t).unwrap_or_else(|| (t[0] * t[3] - t[1] * t[2]).abs().sqrt());
        let band = f64::from(tol) + f64::from(s.style.width) / 2.0 * scale;
        let outline = world_outline(&t, &shape_polygon(s.kind, s.w, s.h, 0.0));
        f64::from(dist_to_edges(&outline, x as f32, y as f32)) <= band
    }
}
```

- [ ] **Étape 5 : brancher le module.** `lib.rs` : ajouter `pub mod fill;` entre `pub mod element;` et `pub mod format;`.
  `query.rs:66` : `fn world_outline(` → `pub(crate) fn world_outline(`. `commands.rs` : après la variante
  `ImportTable { … },` (fin de l'enum `Command`) :

```rust
    /// Pot (C6a, D12, DA1) : contour (`color`), intérieur (`fill`) ou fond de la page (`background`) ; `None` = « Aucune »
    /// (intérieur retiré, fond blanc, contour inchangé). Une transaction, aucune étape sans effet (D38).
    Fill {
        page: String,
        target: crate::fill::FillTarget,
        color: Option<String>,
    },
```

  dans `CommandError`, après `BadTable,` : `BadFill,` ; dans `Display`, après le bras `BadTable` :

```rust
            CommandError::BadFill => write!(
                f,
                "remplissage invalide (couleur valide, contour d'une forme ou d'un trait, intérieur d'un rectangle ou d'une ellipse attendus)"
            ),
```

  dans `apply`, après le bras `Command::ImportTable { … } => self.cmd_import_table(…),` :

```rust
            Command::Fill {
                page,
                target,
                color,
            } => self.cmd_fill(&page, &target, color.as_deref()),
```

- [ ] **Étape 6 : les voir verts.** `cargo test -p roomboard-core 2>&1 | grep -E "test result|FAILED|panicked" | tail -20` —
  attendu : `0 failed` partout, `pot.rs` à 11 tests.

- [ ] **Étape 7 : test natif rouge de la liaison.** Dans `mod tests` de `crates/roomboard-wasm/src/lib.rs`, à la fin :

```rust
    // C6a (T1) : pot de peinture par `fill_inner`, bord par `edge_hit`.

    #[test]
    fn fill_inner_and_edge_hit() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let r = d
            .add_shape_inner(&p, "rect", [100.0, 100.0, 300.0, 200.0], "#000000", 4.0, None)
            .expect("forme")
            .ids[0]
            .clone();
        d.fill_inner(&p, "inside", Some(&r), Some("#facc15".into()))
            .expect("intérieur");
        d.fill_inner(&p, "edge", Some(&r), Some("#dc2626".into()))
            .expect("contour");
        let e = d.core.element(&r).expect("élément");
        assert_eq!(
            (e.style.map(|s| s.color), e.shape.and_then(|s| s.fill)),
            (Some("#dc2626".to_string()), Some("#facc15".to_string()))
        );
        d.fill_inner(&p, "background", None, Some("#1d4ed8".into()))
            .expect("fond");
        assert_eq!(d.core.page(&p).expect("page").background, "#1d4ed8");
        assert_eq!(d.fill_inner(&p, "inside", None, None), Err(CommandError::BadFill));
        assert_eq!(d.fill_inner(&p, "zone", Some(&r), None), Err(CommandError::BadFill));
        assert!(d.edge_hit(&r, 103.0, 150.0, 6.0));
        assert!(!d.edge_hit(&r, 200.0, 150.0, 6.0));
    }
```

  `cargo test -p roomboard-wasm fill 2>&1 | grep -E "error\[" | head -3` — attendu : `error[E0599]: no method named `fill_inner``.

- [ ] **Étape 8 : la liaison.** Import : `use roomboard_core::fill::FillTarget;`. Dans le premier `impl Document`
  (`#[wasm_bindgen]`), après `hit_test` :

```rust
    /// Pot (C6a, D12) : `target` = "edge", "inside" ou "background" ; `id` exigé sauf pour le fond ; `color` absent ou
    /// null : « Aucune ».
    pub fn fill(
        &mut self,
        page: &str,
        target: &str,
        id: Option<String>,
        color: Option<String>,
    ) -> Result<JsValue, JsError> {
        to_js(
            &self
                .fill_inner(page, target, id.as_deref(), color)
                .map_err(cmd_err)?,
        )
    }

    /// Bord d'un rectangle ou d'une ellipse (C6a, DA2), lecture seule ; `tol` en unités monde.
    pub fn edge_hit(&self, id: &str, x: f64, y: f64, tol: f32) -> bool {
        self.core.edge_hit(id, x, y, tol)
    }
```

  dans le second `impl Document` (méthodes `*_inner`), après `import_table_inner` :

```rust
    pub fn fill_inner(
        &mut self,
        page: &str,
        target: &str,
        id: Option<&str>,
        color: Option<String>,
    ) -> Result<Change, CommandError> {
        let target = match (target, id) {
            ("edge", Some(id)) => FillTarget::Edge { id: id.to_string() },
            ("inside", Some(id)) => FillTarget::Inside { id: id.to_string() },
            ("background", _) => FillTarget::Background,
            _ => return Err(CommandError::BadFill),
        };
        self.run(Command::Fill {
            page: page.to_string(),
            target,
            color,
        })
    }
```

- [ ] **Étape 9 : vert, fmt, clippy, preuve.** `cargo fmt --all && cargo clippy -p roomboard-core -p roomboard-wasm --all-targets -- -D warnings 2>&1 | tail -3`
  (attendu : `Finished`, aucun `warning`), puis la commande bornée.

- [ ] **Étape 10 : commit.** `git add crates/roomboard-core/src/fill.rs crates/roomboard-core/src/commands.rs crates/roomboard-core/src/lib.rs crates/roomboard-core/src/query.rs crates/roomboard-core/tests/pot.rs crates/roomboard-wasm/src/lib.rs`
  un par un (GC6), message `feat(core): Fill command and edge_hit query for the paint bucket (C6a)`.

---

### Tâche T2 — Contrat TS : `Fill`, `edgeHit`, fond de la fausse liaison, aiguillage Wasm
<a id="tache-t2"></a>

**Objectif.** Le contrat de la page connaît `Fill` et `edgeHit` ; la fausse liaison les joue au modèle du cœur (même
ordre de refus, mêmes messages, une étape, aucune étape vide) et garde `background` de chaque page (créé, lu, écrit,
rechargé) ; `wasm-core.ts` aiguille vers les méthodes de T1. Le bloc « contrat C6a » tourne sur la fausse liaison ici et
sur le vrai module en T5. Sert S1, S2, S4, S5.

**Fichiers.**
- Modifier : `apps/web/src/core/api.ts` (`Command` `:37-129`, `CoreDocument` `:210-243`, constantes `:252+`)
- Modifier : `apps/web/src/core/fake-core.ts` (`FakePage` `:123`, `MESSAGES` `:127`, `clone` `:147`, `AddPage` `:498`,
  `apply` (bras neuf), `page()` `:907`, `hitTest` voisin `:931`, `save` `:987`, `SavedPage` `:1097`, `loadFake`
  `:1232`, `blank` `:1244`)
- Modifier : `apps/web/src/core/fake-core.test.ts` (bloc neuf en fin)
- Modifier : `apps/web/src/core/wasm-core.ts` (bras `Fill` dans `apply`, méthode `edgeHit`)
- Modifier : `apps/web/src/core/wasm-core.contract.test.ts` (blocs neufs en fin de fichier)

**Interfaces.**
- Consomme (T1, par le module ; absent de ce worktree, écart `tsc` nommé) :
  `Document.fill(page: string, target: string, id?: string, color?: string): unknown`,
  `Document.edge_hit(id: string, x: number, y: number, tol: number): boolean`.
- Produit (lu par T5, T6, T8) :

```ts
// apps/web/src/core/api.ts
export type FillTarget = { readonly kind: "edge" | "inside"; readonly id: string } | { readonly kind: "background" };
// dans l'union Command :
| { readonly type: "Fill"; readonly page: string; readonly target: FillTarget; readonly color: string | null }
// dans CoreDocument :
edgeHit(id: string, x: number, y: number, tol: number): boolean;
export const DEFAULT_BACKGROUND = "#ffffff";
```

- Réutilise : `apps/web/src/core/fake-core.ts:931` (`hitTest`), `:316` (`distToSegment`) — étendus par `edgeHit` (même
  distance aux arêtes, contour par `shapePolygon(kind, w, h, 0)` porté par la matrice).
- Réutilise : `apps/web/src/core/rich-text.ts:94` — `validColor(c)` (miroir de `valid_color`).
- Réutilise : `apps/web/src/core/shapes.ts:43` (`shapePolygon`), `:81` (`applyMatrix`), `:6` (`isSegment`).
- Réutilise : `apps/web/src/core/api.ts:221` (`hitTest`) — `edgeHit` à côté, même unité (monde).

**Patron à ne pas reprendre.** `polygonHit` (`apps/web/src/core/fake-core.ts:363-376`) compte « dedans » comme touché :
`edgeHit` ne mesure que la distance aux arêtes, jamais l'intérieur, et la bande n'est pas `tol` seul mais
`tol + demi-épaisseur × échelle`. Ne pas reprendre non plus `strokeHalfWidth` (`fake-core.ts:345`, plus petite valeur
singulière) : le cœur prend le facteur d'une similitude, sinon la racine du déterminant. Chemin de référence : le code de
`edge_hit` et `cmd_fill` dans la section T1 de ce plan ; `crates/roomboard-core/src/commands.rs:372-381`
(`similarity_scale`) ; `crates/roomboard-core/src/query.rs:66-80` (`world_outline`).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/core --reporter=verbose 2>&1 | grep -E "C6a|×|FAIL|Test Files|Tests " | tail -40 && \
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS" | sed 's/(.*//' | sort | uniq -c
```

Attendu : aucun `×` ni `FAIL` ; 7 `✓ … contrat C6a : fausse liaison > …`, 2 `✓ contrôle de forme C6a > …`, 2
`✓ fakeCore — C6a (fond de page) > …` ; les autres blocs du contrat verts (tests à garder verts) ; `tsc` : seul
`src/core/wasm-core.ts` (écart nommé : `fill`, `edge_hit` inconnus du `.d.ts` copié).

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun `skip`, `only`, `todo` ; aucun seuil changé.
- GC3 `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile) && mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c6a-pot/apps/web/src/wasm/*.d.ts apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c6a-pot/apps/web/src/wasm-formats/*.d.ts apps/web/src/wasm-formats/` (jamais le `.wasm`, jamais commités).
- GC5 Preuve : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message
  anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; ne pas pousser.
- GC7 Jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC8 Aucune dépendance nouvelle.
- GC10 Aucun champ neuf ; la fausse liaison écrit `background` dans son JSON, comme le cœur l'a déjà.
- GC11 La fausse liaison suit le cœur dans le même ordre de refus et avec les mêmes messages (PC2, PC3).
- GC13 `tsc` vide sauf l'écart nommé `src/core/wasm-core.ts` (`fill`, `edge_hit`).
- GC14 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :`.
- GC17 Aucun processus laissé en marche.
- GC18 Périmètre : seuls les cinq fichiers ci-dessus.

**Interdits.** Ne pas toucher au cœur Rust ni aux `.d.ts` ; ne pas sortir `Fill` du contrat commun (aucun écart assumé
neuf) ; aucun `switch` neuf hors de `apply`.

**Critère « terminé ».** Commande bornée verte, seul écart `tsc` nommé, un ou deux commits.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges du contrat.** À la fin de `wasm-core.contract.test.ts` (ajouter `ShapeKind` est déjà
  importé ; rien d'autre à importer) :

```ts
// C6a (pot de peinture) : Fill (contour, intérieur, fond de page) et edgeHit ; T5 joue ce bloc sur le vrai module.
const c6aFactories = factories;
const BAD_FILL = "remplissage invalide (couleur valide, contour d'une forme ou d'un trait, intérieur d'un rectangle ou d'une ellipse attendus)";
const shapeAt = (d: CoreDocument, page: string, shape: ShapeKind = "rect", c: readonly [number, number, number, number] = [100, 100, 300, 200]): string => {
  const id = d.apply({ type: "AddShape", page, shape, x0: c[0], y0: c[1], x1: c[2], y1: c[3], style: { color: "#000000", width: 4 }, fill: null }).ids[0];
  if (id === undefined) throw new Error("aucune forme");
  return id;
};
const shapeFill = (d: CoreDocument, id: string): string | null => {
  const e = d.element(id);
  return e?.kind === "shape" ? e.shape.fill : null;
};
const strokeColor = (d: CoreDocument, id: string): string => {
  const e = d.element(id);
  return e?.kind === "shape" || e?.kind === "stroke" ? e.style.color : "";
};
const bg = (d: CoreDocument, page: string): string => d.page(page)?.background ?? "";

describe.each(c6aFactories)("contrat C6a : $name", ({ f }) => {
  it("Fill intérieur : une étape, annulée puis rétablie (S1)", () => {
    const d = f.blank();
    const p = first(d);
    const r = shapeAt(d, p);
    const c = d.apply({ type: "Fill", page: p, target: { kind: "inside", id: r }, color: "#facc15" });
    expect([c.pages, c.ids]).toEqual([[p], [r]]);
    expect(shapeFill(d, r)).toBe("#facc15");
    d.undo();
    expect(shapeFill(d, r)).toBeNull();
    d.redo();
    expect(shapeFill(d, r)).toBe("#facc15");
    d.free();
  });

  it("Fill contour : couleur d'une forme (intérieur gardé) et d'un trait (S2)", () => {
    const d = f.blank();
    const p = first(d);
    const r = shapeAt(d, p);
    const s = commit(d, p, 500);
    d.apply({ type: "Fill", page: p, target: { kind: "inside", id: r }, color: "#facc15" });
    d.apply({ type: "Fill", page: p, target: { kind: "edge", id: r }, color: "#dc2626" });
    d.apply({ type: "Fill", page: p, target: { kind: "edge", id: s }, color: "#dc2626" });
    expect([strokeColor(d, r), shapeFill(d, r), strokeColor(d, s)]).toEqual(["#dc2626", "#facc15", "#dc2626"]);
    d.free();
  });

  it("« Aucune » : intérieur retiré ; sur un contour ou un trait, aucune étape (D11, D38)", () => {
    const d = f.blank();
    const p = first(d);
    const r = shapeAt(d, p, "ellipse");
    const s = commit(d, p, 500);
    d.apply({ type: "Fill", page: p, target: { kind: "inside", id: r }, color: "#facc15" });
    d.apply({ type: "Fill", page: p, target: { kind: "inside", id: r }, color: null });
    expect(shapeFill(d, r)).toBeNull();
    unchanged(d, () => d.apply({ type: "Fill", page: p, target: { kind: "inside", id: r }, color: null }));
    unchanged(d, () => d.apply({ type: "Fill", page: p, target: { kind: "edge", id: r }, color: null }));
    unchanged(d, () => d.apply({ type: "Fill", page: p, target: { kind: "edge", id: s }, color: null }));
    unchanged(d, () => d.apply({ type: "Fill", page: p, target: { kind: "edge", id: r }, color: "#000000" }));
    d.free();
  });

  it("Fill fond de page : écrit, « Aucune » = #ffffff, même valeur sans étape, annulé (S4, D10)", () => {
    const d = f.blank();
    const p = first(d);
    expect(bg(d, p)).toBe("#ffffff");
    unchanged(d, () => d.apply({ type: "Fill", page: p, target: { kind: "background" }, color: null }));
    const c = d.apply({ type: "Fill", page: p, target: { kind: "background" }, color: "#1d4ed8" });
    expect([c.pages, c.ids]).toEqual([[p], []]);
    expect(bg(d, p)).toBe("#1d4ed8");
    unchanged(d, () => d.apply({ type: "Fill", page: p, target: { kind: "background" }, color: "#1d4ed8" }));
    d.apply({ type: "Fill", page: p, target: { kind: "background" }, color: null });
    expect(bg(d, p)).toBe("#ffffff");
    d.undo();
    expect(bg(d, p)).toBe("#1d4ed8");
    const p2 = d.apply({ type: "AddPage", after: p }).pages[0] ?? "";
    expect(bg(d, p2)).toBe("#ffffff");
    d.free();
  });

  it("refus dans l'ordre du cœur, sans étape : couleur, page, élément de la page, cible (D12, PC2, PC3)", () => {
    const d = f.blank();
    const p = first(d);
    const r = shapeAt(d, p);
    const l = shapeAt(d, p, "line", [100, 300, 300, 300]);
    const s = commit(d, p, 500);
    const t = d.apply({ type: "SetText", page: p, id: null, x: 400, y: 600, content: "abc", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 }).ids[0] ?? "";
    const p2 = d.apply({ type: "AddPage", after: p }).pages[0] ?? "";
    const cases: [Command, string][] = [
      [{ type: "Fill", page: "nope", target: { kind: "inside", id: r }, color: "#12" }, BAD_FILL],
      [{ type: "Fill", page: "nope", target: { kind: "inside", id: r }, color: "#facc15" }, "page inconnue : nope"],
      [{ type: "Fill", page: p, target: { kind: "inside", id: "nope" }, color: "#facc15" }, "élément inconnu : nope"],
      [{ type: "Fill", page: p2, target: { kind: "inside", id: r }, color: "#facc15" }, `élément inconnu : ${r}`],
      [{ type: "Fill", page: p, target: { kind: "inside", id: l }, color: "#facc15" }, BAD_FILL],
      [{ type: "Fill", page: p, target: { kind: "inside", id: s }, color: "#facc15" }, BAD_FILL],
      [{ type: "Fill", page: p, target: { kind: "edge", id: t }, color: "#facc15" }, BAD_FILL],
      [{ type: "Fill", page: p, target: { kind: "inside", id: t }, color: null }, BAD_FILL],
    ];
    for (const [cmd, msg] of cases) unchanged(d, () => expect(messageOf(() => d.apply(cmd)), JSON.stringify(cmd)).toBe(msg));
    d.free();
  });

  it("edgeHit : bande = tolérance + demi-épaisseur, à l'échelle de la forme (D5, DA2)", () => {
    const d = f.blank();
    const p = first(d);
    const r = shapeAt(d, p);
    const l = shapeAt(d, p, "line", [100, 300, 300, 300]);
    expect([d.edgeHit(r, 103, 150, 6), d.edgeHit(r, 110, 150, 6), d.edgeHit(r, 200, 150, 6)]).toEqual([true, false, false]);
    expect([d.edgeHit(l, 200, 300, 6), d.edgeHit("nope", 103, 150, 6)]).toEqual([false, false]);
    d.apply({ type: "Transform", ids: [r], matrix: [2, 0, 0, 2, 0, 0] });
    expect([d.edgeHit(r, 190, 300, 6), d.edgeHit(r, 186, 300, 6)]).toEqual([true, false]);
    d.free();
  });

  it("aller-retour : remplissage, contour et fond gardés (S5)", () => {
    const d = f.blank();
    const p = first(d);
    const r = shapeAt(d, p);
    d.apply({ type: "Fill", page: p, target: { kind: "inside", id: r }, color: "#facc15" });
    d.apply({ type: "Fill", page: p, target: { kind: "edge", id: r }, color: "#dc2626" });
    d.apply({ type: "Fill", page: p, target: { kind: "background" }, color: "#1d4ed8" });
    const back = f.load(d.save(now, "0.1.0"));
    expect([shapeFill(back, r), strokeColor(back, r), bg(back, p)]).toEqual(["#facc15", "#dc2626", "#1d4ed8"]);
    back.free();
    d.free();
  });
});

describe("contrôle de forme C6a", () => {
  const ok = { pages: ["p1"], ids: ["e1"], removed: [], full: false, version: 1 };
  const setup = () => {
    const calls: unknown[][] = [];
    const doc = {
      fill: (...args: unknown[]): unknown => (calls.push(["fill", ...args]), ok),
      edge_hit: (...args: unknown[]): boolean => (calls.push(["edge_hit", ...args]), true),
    };
    const stub = { Document: { blank: () => doc, load: () => doc }, StrokeBuilder: class {}, version: () => "factice" };
    return { calls, d: createWasmCore(stub as unknown as WasmModule).blank() };
  };

  it("Fill : cible, id et couleur passés ; fond sans id ; null → undefined (Option::None)", () => {
    const { calls, d } = setup();
    d.apply({ type: "Fill", page: "p1", target: { kind: "inside", id: "e1" }, color: "#facc15" });
    d.apply({ type: "Fill", page: "p1", target: { kind: "edge", id: "e1" }, color: null });
    d.apply({ type: "Fill", page: "p1", target: { kind: "background" }, color: null });
    expect(calls).toEqual([
      ["fill", "p1", "inside", "e1", "#facc15"],
      ["fill", "p1", "edge", "e1", undefined],
      ["fill", "p1", "background", undefined, undefined],
    ]);
  });

  it("edgeHit : arguments passés tels quels, booléen rendu", () => {
    const { calls, d } = setup();
    expect(d.edgeHit("e1", 103, 150, 6)).toBe(true);
    expect(calls).toEqual([["edge_hit", "e1", 103, 150, 6]]);
  });
});
```

  À la fin de `fake-core.test.ts` :

```ts
describe("fakeCore — C6a (fond de page)", () => {
  const json = (pages: unknown[]): Uint8Array => new TextEncoder().encode(JSON.stringify({ pages }));

  it("le fond est écrit dans le JSON et relu", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    d.apply({ type: "Fill", page: p, target: { kind: "background" }, color: "#bfdbfe" });
    const back = fakeCore.load(d.save("2026-11-20T00:00:00Z", "0.1.0"));
    expect(back.page(p)?.background).toBe("#bfdbfe");
  });

  it("JSON sans fond ou au fond illisible : #ffffff (PC13)", () => {
    const d = fakeCore.load(json([{ id: "a", elements: [] }, { id: "b", elements: [], background: 42 }, { id: "c", elements: [], background: "#12" }]));
    expect(["a", "b", "c"].map((id) => d.page(id)?.background)).toEqual(["#ffffff", "#ffffff", "#ffffff"]);
  });
});
```

- [ ] **Étape 3 : les voir rouges.** La commande bornée — attendu : `×` sur les tests C6a (`d.edgeHit is not a
  function`, message `Fill` inconnu ou `undefined`).

- [ ] **Étape 4 : `api.ts`.** Avant `export type Command =` :

```ts
/** Cible du pot (C6a, D12) : contour (`color` d'une forme ou d'un trait), intérieur (`fill` d'un rectangle ou d'une
 *  ellipse), fond de la page (`background`). */
export type FillTarget = { readonly kind: "edge" | "inside"; readonly id: string } | { readonly kind: "background" };
```

  à la fin de l'union `Command` (après le membre `ImportTable`, remplacer son `;` final par la suite) :

```ts
  /** C6a (D12) : color null = « Aucune » (intérieur retiré, fond #ffffff, contour inchangé) ; même valeur : aucune étape. */
  | { readonly type: "Fill"; readonly page: string; readonly target: FillTarget; readonly color: string | null };
```

  dans `CoreDocument`, après `hitTest(…)` :

```ts
  /** Bord d'un rectangle ou d'une ellipse sous (x, y) monde (C6a, DA2) : tol + demi-épaisseur à l'échelle de la forme ;
   *  faux pour tout autre élément ou un id inconnu. Rien n'est écrit. */
  edgeHit(id: string, x: number, y: number, tol: number): boolean;
```

  après `export const PAGE_HEIGHT = 1080;` :

```ts
/** Fond d'une page neuve, et « Aucune » du pot sur le fond (`DEFAULT_BACKGROUND` de `element.rs`). */
export const DEFAULT_BACKGROUND = "#ffffff";
```

  et ajouter à l'en-tête la ligne `// C6a : Fill (contour, intérieur, fond de page ; une étape, D38) ; edgeHit (bord d'une forme, mesuré par le cœur, DA2).`

- [ ] **Étape 5 : `fake-core.ts`.** Importer `DEFAULT_BACKGROUND` (depuis `./api`, valeur) et `isSegment` (ajouter à
  l'import de `./shapes`). Puis :
  - `interface FakePage { readonly id: string; readonly elements: FakeElement[]; backdrop: RawRecord | null; grid: unknown; background: string }` ;
  - `MESSAGES` : ajouter `badFill: "remplissage invalide (couleur valide, contour d'une forme ou d'un trait, intérieur d'un rectangle ou d'une ellipse attendus)",` ;
  - `clone` : `({ id: p.id, elements: [...p.elements], backdrop: p.backdrop, grid: p.grid, background: p.background })` ;
  - `AddPage` (`:498`) et `blank` (`:1244`) : `{ id, elements: [], backdrop: null, grid: null, background: DEFAULT_BACKGROUND }` ;
  - `page()` : `background: p.background` au lieu de `"#ffffff"` ;
  - `save` : `({ id: p.id, background: p.background, backdrop: p.backdrop, elements: …` ;
  - `interface SavedPage { id: string; elements: SavedElement[]; backdrop?: unknown; grid?: unknown; background?: unknown }` ;
  - `loadFake` : ajouter `background: typeof p.background === "string" && validColor(p.background) ? p.background : DEFAULT_BACKGROUND,` ;
  - avant `function polygonHit`, le miroir de `similarity_scale` :

```ts
/** Facteur d'une similitude, null pour toute autre matrice (`similarity_scale` du cœur : tolérance relative 1e-9). */
function similarityScale(m: Matrix): number | null {
  const [a, b, c, d] = m;
  const s = Math.hypot(a, b);
  const eps = 1e-9 * Math.max(s, Math.hypot(c, d));
  const direct = Math.abs(a - d) <= eps && Math.abs(b + c) <= eps;
  const mirror = Math.abs(a + d) <= eps && Math.abs(b - c) <= eps;
  return Number.isFinite(s) && s > 0 && (direct || mirror) ? s : null;
}
```

  - dans `apply`, après le bras `ImportTable` :

```ts
      case "Fill": {
        // Ordre du cœur (`fill.rs`, PC2) : couleur, page, élément de cette page (PC3), cible ; même valeur : aucune étape.
        if (cmd.color !== null && !validColor(cmd.color)) throw new Error(MESSAGES.badFill);
        const page = this.pageOf(cmd.page);
        const t = cmd.target;
        const color = cmd.color;
        if (t.kind === "background") {
          const next = color ?? DEFAULT_BACKGROUND;
          if (page.background === next) return this.unchanged();
          return this.step((s) => {
            const p = s.pages.find((q) => q.id === cmd.page);
            if (p) p.background = next;
            return { pages: [cmd.page], ids: [], removed: [] };
          });
        }
        const e = page.elements.find((x) => x.id === t.id);
        if (!e) throw new Error(`élément inconnu : ${t.id}`);
        const shape = e.shape;
        const inside = t.kind === "inside";
        const key = !inside && (e.local !== undefined || shape) ? "color" : inside && shape && !isSegment(shape.shape) ? "fill" : null;
        if (key === null) throw new Error(MESSAGES.badFill);
        const write = (next: (old: FakeElement) => FakeElement): Change =>
          this.step((s) => {
            const p = s.pages.find((q) => q.id === cmd.page);
            const i = p ? p.elements.findIndex((x) => x.id === t.id) : -1;
            const old = p?.elements[i];
            if (p && old) p.elements[i] = next(old);
            return { pages: [cmd.page], ids: [t.id], removed: [] };
          });
        if (key === "color") {
          if (color === null || e.style.color === color) return this.unchanged();
          return write((old) => ({ ...old, style: { ...old.style, color } }));
        }
        if (shape === undefined || shape.fill === color) return this.unchanged();
        return write((old) => (old.shape ? { ...old, shape: { ...old.shape, fill: color } } : old));
      }
```

  - après `hitTest(…) { … }` :

```ts
  edgeHit(id: string, x: number, y: number, tol: number): boolean {
    // Miroir d'`edge_hit` (`fill.rs`) : tracé `shapePolygon(kind, w, h, 0)` porté par la matrice, arêtes seules (jamais
    // l'intérieur), bande = tol + demi-épaisseur × (facteur de similitude, sinon racine du déterminant).
    const e = this.find(id)?.element;
    const s = e?.shape;
    if (!e || !s || isSegment(s.shape)) return false;
    const local = shapePolygon(s.shape, s.w, s.h, 0);
    const world: number[] = [];
    for (let i = 0; i + 1 < local.length; i += 2) world.push(...applyMatrix(e.transform, local[i] ?? 0, local[i + 1] ?? 0));
    const n = world.length / 2;
    let edge = Number.POSITIVE_INFINITY;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      edge = Math.min(edge, distToSegment(x, y, world[2 * i] ?? 0, world[2 * i + 1] ?? 0, world[2 * j] ?? 0, world[2 * j + 1] ?? 0));
    }
    const m = e.transform;
    const scale = similarityScale(m) ?? Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
    return edge <= tol + (e.style.width / 2) * scale;
  }
```

  - en-tête du fichier : ajouter `// C6a : Fill (contour, intérieur, fond) au modèle de \`fill.rs\` (même ordre de refus, mêmes messages) ; edgeHit, miroir d'\`edge_hit\` ; fond de page gardé dans le JSON.`

- [ ] **Étape 6 : `wasm-core.ts`.** Dans `apply`, après le bras `ImportTable` :

```ts
      case "Fill": {
        // null → undefined : Option::None côté Rust (« Aucune ») ; le fond n'a pas d'id.
        const t = cmd.target;
        return toChange(this.d.fill(cmd.page, t.kind, t.kind === "background" ? undefined : t.id, cmd.color ?? undefined));
      }
```

  après `hitTest(…)` : `edgeHit(id: string, x: number, y: number, tol: number): boolean { return this.d.edge_hit(id, x, y, tol); }`.

- [ ] **Étape 7 : vert.** La commande bornée ; `tsc` ne doit montrer que `src/core/wasm-core.ts` (écart nommé).

- [ ] **Étape 8 : commit.** Les cinq fichiers un par un (GC6), message
  `feat(core-ts): Fill and edgeHit contract, page background in the fake core (C6a)`.

---

### Tâche T3 — Fond peint par le rendu, contrat du moteur (outil `fill`, `setFillColor`), éditeur de cellule
<a id="tache-t3"></a>

**Objectif.** La scène peint `background` de la page montrée (DA4) et l'aperçu de gomme partielle repeint ce fond-là
(D20) ; le moteur connaît l'outil `fill` (fabrique facultative, couleur du pot propre, défaut `#dc2626`, D16) ;
l'éditeur de cellule prend `fill ?? fond de la page`. Aucune différence pour un document existant (blanc). Sert S4.

**Fichiers.**
- Modifier : `apps/web/src/engine/render/renderer.ts:6` (`PageView`)
- Modifier : `apps/web/src/engine/render/canvas2d.ts:195-203` (`drawScene`), `:439` (`paintEraser`)
- Modifier : `apps/web/src/engine/render/webgl2.ts:295` (`drawScene`), `:384` (`paintEraser`)
- Modifier : `apps/web/src/engine/input/gesture.ts:6` (`DrawTool`)
- Modifier : `apps/web/src/engine/engine.ts` (`EngineState` `:20`, `ToolFactories` `:54`, `Engine` `:72`, état `:239`,
  table `tools` `:372`, `drawScene` `:397`, objet `engine` `:568`)
- Modifier : `apps/web/src/engine/tools/table.ts:207` (fond de l'éditeur)
- Tests : `canvas2d.test.ts`, `webgl2.test.ts`, `engine.test.ts`, `tools/table.test.ts` (blocs neufs en fin)

**Interfaces.**
- Consomme : `CoreDocument.page(id): PageView | null` (existant, `background: string`).
- Produit (lu par T6, T7) :

```ts
// engine/input/gesture.ts
export type DrawTool = "pen" | "eraser" | "select" | ShapeKind | "text" | "table" | "fill";
// engine/render/renderer.ts
export interface PageView { readonly id: string; readonly elementIds: readonly string[]; readonly background?: string }
// engine/engine.ts
export const DEFAULT_FILL_COLOR = "#dc2626";
// EngineState : readonly fillColor?: string | null;
// ToolFactories : fill?(ctx: ToolContext, color: () => string | null): GestureTool;
// Engine : setFillColor(color: string | null): void;
```

- Réutilise : `apps/web/src/engine/render/canvas2d.ts:201`, `:439`, `apps/web/src/engine/render/webgl2.ts:384`,
  `apps/web/src/engine/page.ts:6` — `PageView` du rendu gagne `background?: string` (défaut `PAGE_BACKGROUND`, rien de
  recopié, DA4).
- Réutilise : `apps/web/src/engine/tools/tool.ts:36` (`GestureTool`), `apps/web/src/engine/engine.ts:372` (table
  `tools`) — étendus par la fabrique `fill?`.
- Réutilise : `apps/web/src/engine/engine.ts:568` (`setPenStyle`, patron) — `Engine.setFillColor(color: string | null): void`.
- Réutilise : `apps/web/src/core/rich-text.ts:94` — `validColor(c)` pour `setFillColor`.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/engine/render/canvas2d.test.ts src/engine/render/webgl2.test.ts src/engine/engine.test.ts src/engine/tools/table.test.ts --reporter=verbose 2>&1 | grep -E "C6a|page blanche|gomme partielle|×|FAIL|Test Files|Tests " | tail -40 && \
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS" | sed 's/(.*//' | sort | uniq -c
```

Attendu : aucun `×` ; 2 `✓ Canvas2DRenderer — fond de page (C6a) > …`, 2 `✓ WebGL2 — fond de page (C6a) > …`, 3
`✓ moteur — pot (C6a) > …`, 2 `✓ outil Tableau — fond de page (C6a) > …` ; tests à garder verts vus : « drawScene :
pourtour, page blanche… », « gomme partielle : fond de page puis pourtour… », « gomme partielle : pourtour le long du
chemin… » ; `tsc` vide.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge. Aucun `skip`, `only`, `todo`, aucun seuil changé.
- GC3 `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile) && mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c6a-pot/apps/web/src/wasm/*.d.ts apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c6a-pot/apps/web/src/wasm-formats/*.d.ts apps/web/src/wasm-formats/`.
- GC5 Preuve : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message
  anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; ne pas pousser.
- GC7 Jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC8 Aucune dépendance nouvelle.
- GC13 `tsc` vide.
- GC14 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :`.
- GC16 Aucun changement de `tools/select.ts`, `input/keys.ts`, `app/workspace.ts`, `ui/item-state.ts` (D24).
- GC17 Aucun processus laissé en marche.
- GC18 Périmètre : seuls les dix fichiers ci-dessus.

**Interdits.** `drawLive` ne change pas de signature (D20) ; `PAGE_BACKGROUND` reste le défaut, aucune copie de la
constante ; ne pas créer l'outil Pot ici (T6) ; aucune clé `fill` dans `stage-tags.ts`.

**Critère « terminé ».** Commande bornée verte, `tsc` vide, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges.** Fin de `canvas2d.test.ts` :

```ts
describe("Canvas2DRenderer — fond de page (C6a)", () => {
  it("drawScene : le fond reçu (#bfdbfe) est peint au lieu du blanc (DA4)", () => {
    const { r, scene } = make({});
    r.resize(100, 100, 1);
    r.drawScene({ id: "p", elementIds: [], background: "#bfdbfe" }, IDENTITY, new Set());
    expect(scene.log.filter((l) => l.startsWith("fillRect"))).toEqual([`fillRect ${SURROUND_COLOR}`, "fillRect #bfdbfe"]);
  });

  it("gomme partielle : le fond retenu du dernier drawScene est repeint (D20)", () => {
    const { r, live } = make({});
    r.resize(100, 100, 1);
    r.drawScene({ id: "p", elementIds: [], background: "#bfdbfe" }, IDENTITY, new Set());
    r.drawLive({ strokes: [], erasers: [{ path: new Float32Array([0, 0, 50, 50]), radius: 6, mode: "partial" }] }, IDENTITY);
    expect(live.log.filter((l) => l.startsWith("stroke"))).toEqual(["stroke #bfdbfe 16", `stroke ${SURROUND_COLOR} 16`]);
  });
});
```

  Fin de `webgl2.test.ts` :

```ts
describe("WebGL2 — fond de page (C6a)", () => {
  const partial: LiveLayer = { strokes: [], erasers: [{ path: new Float32Array([0, 0, 100, 0]), radius: 10, mode: "partial" }] };

  it("gomme partielle : fond retenu du dernier drawScene, transmis à la scène (D20)", () => {
    const { gl, r, scene } = make();
    r.drawScene({ id: "p", elementIds: [], background: "#bfdbfe" }, IDENTITY, new Set());
    r.drawLive(partial, IDENTITY);
    expect(scene.log).toContain("scene p");
    expect(gl.draws.map((d) => d.rgba)).toEqual([f32(parseColor(SURROUND_COLOR)), f32(parseColor("#bfdbfe"))]);
  });

  it("fond illisible pour WebGL (nom CSS) : PAGE_BACKGROUND, aucune couleur signalée (PC14)", () => {
    const { gl, r } = make();
    r.drawScene({ id: "p", elementIds: [], background: "rouge" }, IDENTITY, new Set());
    r.drawLive(partial, IDENTITY);
    expect(gl.draws[1]?.rgba).toEqual(f32(parseColor(PAGE_BACKGROUND)));
    expect(r.badColors.has("rouge")).toBe(false);
  });
});
```

  Fin de `engine.test.ts` :

```ts
describe("moteur — pot (C6a)", () => {
  const inert: GestureTool = { begin() {}, extend() {}, frame() {}, close() {}, live: () => NO_LIVE, active: () => false };

  it("drawScene reçoit le fond de la page montrée (DA4)", () => {
    const { doc, engine, frames, renderer } = setup();
    engine.redraw();
    frames.tick();
    expect(renderer.scenes.at(-1)?.page.background).toBe("#ffffff");
    const page = doc.page.bind(doc);
    doc.page = (id) => {
      const p = page(id);
      return p === null ? null : { ...p, background: "#bfdbfe" };
    };
    engine.redraw();
    frames.tick();
    expect(renderer.scenes.at(-1)?.page.background).toBe("#bfdbfe");
  });

  it("setFillColor : défaut rouge, couleur valide gardée, invalide ignorée, null = « Aucune » ; le stylo ne change pas (D16)", () => {
    const { engine } = setup();
    expect(engine.state().fillColor).toBe("#dc2626");
    engine.setFillColor("#facc15");
    expect(engine.state().fillColor).toBe("#facc15");
    engine.setFillColor("");
    engine.setFillColor("pas une couleur !");
    expect(engine.state().fillColor).toBe("#facc15");
    engine.setFillColor(null);
    expect(engine.state().fillColor).toBeNull();
    expect(engine.textStyle().color).toBe("#000000");
  });

  it("fabrique fill : reçoit la couleur courante ; setTool(fill) : outil Pot actif", () => {
    const got: { color?: () => string | null } = {};
    const engine = createEngine({
      doc: fakeCore.blank(),
      renderer: new FakeRenderer(),
      frames: new Frames(),
      tools: {
        pen: () => inert,
        eraser: () => inert,
        fill: (_ctx, c) => {
          got.color = c;
          return inert;
        },
      },
    });
    engine.setFillColor("#16a34a");
    expect(got.color?.()).toBe("#16a34a");
    engine.setTool("fill");
    expect(engine.state().tool).toBe("fill");
  });
});
```

  Fin de `tools/table.test.ts` :

```ts
describe("outil Tableau — fond de page (C6a)", () => {
  it("éditeur d'une cellule sans remplissage : fond de la page (D20)", () => {
    const s = setup();
    const page = s.doc.page.bind(s.doc);
    s.doc.page = (id) => {
      const p = page(id);
      return p === null ? null : { ...p, background: "#bfdbfe" };
    };
    s.create(100, 200, 2, 2);
    expect(s.host.last().background).toBe("#bfdbfe");
  });

  it("cellule remplie : son remplissage passe avant le fond de la page", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    const t = s.table(id);
    s.doc.apply({ type: "SetTableFill", id, row: t.rows[0]?.id ?? "", col: t.cols[1]?.id ?? "", fill: "#fef08a" });
    s.tool.navigate("next");
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 1 });
    expect(s.host.last().background).toBe("#fef08a");
  });
});
```

- [ ] **Étape 3 : les voir rouges.** La commande bornée — attendu : `×` sur les blocs C6a (`fillRect #ffffff`,
  `setFillColor is not a function`, `#ffffff` attendu `#bfdbfe`).

- [ ] **Étape 4 : rendu.** `renderer.ts` :

```ts
export interface PageView {
  readonly id: string;
  readonly elementIds: readonly string[];
  /** Fond de la page (C6a, DA4) ; absent : `PAGE_BACKGROUND`. */
  readonly background?: string;
}
```

  `canvas2d.ts` : champ `/** Fond du dernier drawScene, repeint par l'aperçu de gomme partielle (D20). */ private background = PAGE_BACKGROUND;`
  ; dans `drawScene`, remplacer `ctx.fillStyle = PAGE_BACKGROUND;` par :

```ts
    this.background = page.background ?? PAGE_BACKGROUND;
    // Blanc d'abord : le canvas ignore une couleur qu'il ne sait pas lire (un nom CSS accepté par le cœur).
    ctx.fillStyle = PAGE_BACKGROUND;
    ctx.fillStyle = this.background;
```

  dans `paintEraser`, `if (page) along(PAGE_BACKGROUND, pageRect);` → `if (page) along(this.background, pageRect);`.
  `webgl2.ts` : champ `private background = PAGE_BACKGROUND;` ; `drawScene` :

```ts
  drawScene(page: PageView, camera: Camera, hidden: ReadonlySet<string>, overlay?: EditOverlay): void {
    this.background = page.background !== undefined && tryParseColor(page.background) !== null ? page.background : PAGE_BACKGROUND;
    this.scene.drawScene(page, camera, hidden, overlay);
  }
```

  et dans `paintEraser`, `this.color(PAGE_BACKGROUND);` → `this.color(this.background);`.

- [ ] **Étape 5 : moteur.** `gesture.ts:6` : `export type DrawTool = "pen" | "eraser" | "select" | ShapeKind | "text" | "table" | "fill";`.
  `engine.ts` : imports `import { validColor } from "../core/rich-text";` et `import { PAGE_BACKGROUND } from "./page";` ;
  dans `EngineState`, après `textFormat` :

```ts
  /** Couleur du pot (C6a, D16) ; null = « Aucune ». Facultative (PC5) : le moteur la publie toujours. */
  readonly fillColor?: string | null;
```

  dans `ToolFactories`, après `table?` :

```ts
  /** Outil Pot (C6a, D15) ; `color` lue au relâché ; absent : outil inerte. */
  fill?(ctx: ToolContext, color: () => string | null): GestureTool;
```

  dans `Engine`, après `setPenStyle` :

```ts
  /** Couleur du pot (C6a, D16), propre au pot : ni le stylo ni les formes ne changent ; null = « Aucune » ; une couleur
   *  invalide est ignorée. */
  setFillColor(color: string | null): void;
```

  après `DEFAULT_PEN_STYLE` : `/** Couleur du pot au démarrage (D16). */ export const DEFAULT_FILL_COLOR = "#dc2626";` ;
  dans `createEngine`, après `let style = …` : `let fillColor: string | null = DEFAULT_FILL_COLOR;` ; dans `state()`,
  après `textFormat: …,` : `fillColor,` ; dans `tools`, après `text: textTool,` :
  `fill: deps.tools.fill?.(ctx, () => fillColor) ?? inertTool(),` ; l'appel de scène devient :

```ts
      renderer.drawScene(
        { id: pageId, elementIds: doc.elementIds(pageId), background: doc.page(pageId)?.background ?? PAGE_BACKGROUND },
        camera,
        hidden,
        overlay,
      );
```

  dans l'objet `engine`, après `setPenStyle(s) { … },` :

```ts
    setFillColor(c) {
      if (c !== null && (typeof c !== "string" || !validColor(c))) return;
      fillColor = c;
      emit();
    },
```

- [ ] **Étape 6 : éditeur de cellule.** `tools/table.ts:207` :
  `background: fill ?? ctx.doc.page(ctx.page())?.background ?? CELL_EDITOR_BACKGROUND,` (le commentaire de
  `CELL_EDITOR_BACKGROUND` devient « … sans remplissage, quand la page n'a pas de fond lisible »).

- [ ] **Étape 7 : vert.** La commande bornée ; `tsc` vide.

- [ ] **Étape 8 : commit.** Les dix fichiers un par un (GC6), message
  `feat(engine): paint the page background, fill tool slot and setFillColor (C6a)`.

---

### Tâche T4 — Mise en lignes : caractère sous un point (`offsetAt`), mot UAX 29 (`wordAt`)
<a id="tache-t4"></a>

**Objectif.** Deux fonctions pures à côté de `layoutRich` : le rang UTF-16 du caractère sous un point local d'une boîte
de texte (mêmes lignes que le dessin) et les limites du mot qui le contient (UAX 29 par `Intl.Segmenter`, repli lettres,
chiffres, marques). Sert S3.

**Fichiers.**
- Modifier : `apps/web/src/engine/text-layout.ts` (après `graphemes` `:40` et après `layoutRich` `:206`)
- Modifier : `apps/web/src/engine/text-layout.test.ts` (blocs neufs en fin)

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit (lu par T6) :

```ts
export function offsetAt(spans: readonly TextSpan[], base: { readonly size: number }, boxWidth: number, measure: Measure, lx: number, ly: number): number | null;
export function wordAt(content: string, offset: number): readonly [number, number] | null; // [début, fin) en unités UTF-16
```

- Réutilise : `apps/web/src/engine/text-layout.ts:206` — `layoutRich(spans, base, boxWidth, measure)` : mêmes lignes
  que le rendu ; `offsetAt` ne recode aucune coupure.
- Réutilise : `apps/web/src/engine/text-layout.ts:40` — `graphemes(s)` et son cache d'`Intl.Segmenter` (même patron de
  cache pour la granularité `word`) ; `faceOf` `:83`.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/engine/text-layout.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -50 && \
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS" | sed 's/(.*//' | sort | uniq -c
```

Attendu : aucun `×` ; 5 `✓ offsetAt (C6a, D6) > …`, 4 `✓ wordAt (C6a, D6, D26) > …` ; les tests d'avant C6a du
fichier verts ; `tsc` vide.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge. Aucun `skip`, `only`, `todo`.
- GC3 `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile) && mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c6a-pot/apps/web/src/wasm/*.d.ts apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c6a-pot/apps/web/src/wasm-formats/*.d.ts apps/web/src/wasm-formats/`.
- GC5 Preuve : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message
  anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; ne pas pousser.
- GC7 Jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC8 Aucune dépendance nouvelle (mots par `Intl.Segmenter`, pas de bibliothèque).
- GC13 `tsc` vide.
- GC14 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :`.
- GC17 Aucun processus laissé en marche.
- GC18 Périmètre : seuls les deux fichiers ci-dessus.

**Interdits.** Ne pas changer `layoutRich`, `breakParagraph` ni `graphemes` (le rendu et la hauteur des boîtes en
dépendent).

**Critère « terminé ».** Commande bornée verte, `tsc` vide, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges.** Ajouter `offsetAt, wordAt` à l'import de `./text-layout` en tête du fichier de test,
  puis à la fin :

```ts
const ten: Measure = (s) => s.length * 10;
const plain = (text: string): TextSpan[] => [{ text, attrs: {} }];

describe("offsetAt (C6a, D6)", () => {
  it("une ligne : rang du caractère sous le point ; espace compris ; hors des caractères : null", () => {
    const s = plain("Le chat noir");
    expect(offsetAt(s, { size: 36 }, 600, ten, 35, 10)).toBe(3);
    expect(offsetAt(s, { size: 36 }, 600, ten, 25, 10)).toBe(2);
    expect(offsetAt(s, { size: 36 }, 600, ten, 125, 10)).toBeNull();
    expect(offsetAt(s, { size: 36 }, 600, ten, 5, 50)).toBeNull();
    expect(offsetAt(s, { size: 36 }, 600, ten, -1, 10)).toBeNull();
  });

  it("deux lignes (coupure à l'espace) : rang dans le contenu, pas dans la ligne", () => {
    const s = plain("Le chat noir");
    expect(offsetAt(s, { size: 36 }, 70, ten, 65, 10)).toBe(6);
    expect(offsetAt(s, { size: 36 }, 70, ten, 5, 50)).toBe(8);
  });

  it("paragraphes : la ligne après le saut de ligne commence après lui", () => {
    expect(offsetAt(plain("ab\ncd"), { size: 36 }, 600, ten, 5, 50)).toBe(3);
  });

  it("segments stylés : rang continu d'un segment à l'autre", () => {
    const s: TextSpan[] = [{ text: "Le ", attrs: {} }, { text: "chat", attrs: { bold: true } }, { text: " noir", attrs: {} }];
    expect(offsetAt(s, { size: 36 }, 600, ten, 35, 10)).toBe(3);
    expect(offsetAt(s, { size: 36 }, 600, ten, 95, 10)).toBe(9);
  });

  it("emoji : un graphème de deux unités UTF-16, rang suivant décalé de deux", () => {
    expect(offsetAt(plain("😀 été"), { size: 36 }, 600, ten, 5, 10)).toBe(0);
    expect(offsetAt(plain("😀 été"), { size: 36 }, 600, ten, 45, 10)).toBe(4);
  });
});

describe("wordAt (C6a, D6, D26)", () => {
  it("UAX 29 : le mot qui contient le rang ; espace et fin de texte : null", () => {
    expect(wordAt("Le chat noir", 3)).toEqual([3, 7]);
    expect(wordAt("Le chat noir", 6)).toEqual([3, 7]);
    expect(wordAt("Le chat noir", 2)).toBeNull();
    expect(wordAt("Le chat noir", 12)).toBeNull();
    expect(wordAt("Le chat noir", -1)).toBeNull();
    expect(wordAt("Lundi matin", 8)).toEqual([6, 11]);
  });

  it("wordAt : « été » après un emoji, bornes UTF-16 ; ponctuation : null", () => {
    expect(wordAt("😀 été", 4)).toEqual([3, 6]);
    expect(wordAt("café, crème", 4)).toBeNull();
    expect(wordAt("café, crème", 7)).toEqual([6, 11]);
  });

  it("chiffres : un nombre est un mot", () => {
    expect(wordAt("page 42 ici", 5)).toEqual([5, 7]);
  });

  it("repli sans Intl.Segmenter : lettres, chiffres, marques (D26)", () => {
    const saved = Intl.Segmenter;
    Object.defineProperty(Intl, "Segmenter", { value: undefined, configurable: true, writable: true });
    try {
      expect(wordAt("Le chat noir", 3)).toEqual([3, 7]);
      expect(wordAt("café noir", 2)).toEqual([0, 5]);
      expect(wordAt("😀 été", 4)).toEqual([3, 6]);
      expect(wordAt("a b", 1)).toBeNull();
    } finally {
      Object.defineProperty(Intl, "Segmenter", { value: saved, configurable: true, writable: true });
    }
  });
});
```

- [ ] **Étape 3 : les voir rouges.** La commande bornée — attendu : `×` (`offsetAt is not a function`).

- [ ] **Étape 4 : le code.** Après `graphemes` :

```ts
let words: { readonly ctor: typeof Intl.Segmenter; readonly seg: Intl.Segmenter } | null = null;
/** Caractère d'un mot du repli (D26) : lettre, chiffre ou marque Unicode. */
const WORD_CHAR = /[\p{L}\p{N}\p{M}]/u;

/**
 * Mot qui contient le rang `offset` (unités UTF-16) : [début, fin) d'un segment UAX 29 « word-like » (`Intl.Segmenter`,
 * granularité `word`) ; null sur une espace, une ponctuation ou hors du texte (D6). Sans `Intl.Segmenter` : suite
 * maximale de lettres, chiffres et marques, par points de code (D26).
 */
export function wordAt(content: string, offset: number): readonly [number, number] | null {
  if (!Number.isInteger(offset) || offset < 0 || offset >= content.length) return null;
  const ctor = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (ctor) {
    if (words?.ctor !== ctor) words = { ctor, seg: new ctor(undefined, { granularity: "word" }) };
    const s = words.seg.segment(content).containing(offset);
    return s !== undefined && s.isWordLike === true ? [s.index, s.index + s.segment.length] : null;
  }
  const points: { readonly at: number; readonly ch: string }[] = [];
  for (const ch of Array.from(content)) points.push({ at: (points.at(-1)?.at ?? 0) + (points.at(-1)?.ch.length ?? 0), ch });
  const k = points.findIndex((p) => p.at <= offset && offset < p.at + p.ch.length);
  const isWord = (i: number): boolean => WORD_CHAR.test(points[i]?.ch ?? "");
  if (k < 0 || !isWord(k)) return null;
  let a = k;
  let b = k;
  while (a > 0 && isWord(a - 1)) a--;
  while (b + 1 < points.length && isWord(b + 1)) b++;
  const last = points[b];
  return [points[a]?.at ?? 0, (last?.at ?? 0) + (last?.ch.length ?? 0)];
}
```

  Après `layoutRich` :

```ts
/**
 * Caractère sous un point local de la boîte (C6a, D6) : rang UTF-16, dans le contenu (`spans` bout à bout), du graphème
 * dont la case [x, x + largeur) × [haut de ligne, haut + hauteur) contient (lx, ly). Mêmes lignes que le dessin
 * (`layoutRich`) : chaque ligne est retrouvée dans le contenu à partir de la fin de la précédente (seules des espaces ou
 * un saut de ligne les séparent). null hors des caractères : marge, après la fin d'une ligne, sous la dernière.
 */
export function offsetAt(spans: readonly TextSpan[], base: { readonly size: number }, boxWidth: number, measure: Measure, lx: number, ly: number): number | null {
  if (!Number.isFinite(lx) || !Number.isFinite(ly) || lx < 0 || ly < 0) return null;
  const content = spans.map((s) => s.text).join("");
  let cursor = 0;
  for (const line of layoutRich(spans, base, boxWidth, measure)) {
    const text = line.segments.map((s) => s.text).join("");
    const found = text === "" ? cursor : content.indexOf(text, cursor);
    const start = found < 0 ? cursor : found;
    cursor = start + text.length;
    if (ly < line.top || ly >= line.top + line.height) continue;
    let at = start;
    for (const seg of line.segments) {
      const face = faceOf(seg.style);
      let k = 0;
      for (const g of graphemes(seg.text)) {
        const x0 = seg.x + measure(seg.text.slice(0, k), seg.style.size, face);
        const x1 = seg.x + measure(seg.text.slice(0, k + g.length), seg.style.size, face);
        if (lx >= x0 && lx < x1) return at + k;
        k += g.length;
      }
      at += seg.text.length;
    }
    return null;
  }
  return null;
}
```

- [ ] **Étape 5 : vert.** La commande bornée ; `tsc` vide.

- [ ] **Étape 6 : commit.** Les deux fichiers (GC6), message `feat(text-layout): offsetAt and UAX 29 wordAt for the paint bucket (C6a)`.

---

### Tâche T5 — Contrat C6a sur le vrai module Wasm, fichier d'avant C6a
<a id="tache-t5"></a>

**Objectif.** Reconstruire le module avec le cœur de T1 dans le worktree, jouer le bloc « contrat C6a » de T2 sur le
vrai module (parité D36), ajouter un test « vrai module seulement » sur la fixture `socle-v1.roomboard` d'avant C6a
(S5, D21), corriger côté page tout écart révélé (la fausse liaison suit le cœur). Ferme l'écart `tsc` de
`wasm-core.ts`. Sert S5.

**Fichiers.**
- Modifier : `apps/web/src/core/wasm-core.contract.test.ts` (bloc « contrat C6a : vrai module seulement » en fin)
- Modifier si un écart apparaît : `apps/web/src/core/fake-core.ts`, `apps/web/src/core/wasm-core.ts`

**Interfaces.**
- Consomme (T1) : `Document.fill`, `Document.edge_hit` du module ; (T2) le bloc « contrat C6a », `first`, `need`,
  `shapeFill`, `bg`, `c6aFactories`.
- Produit : rien de neuf.
- Réutilise : `crates/roomboard-core/tests/fixtures/socle-v1.roomboard` — lu comme les fixtures C10a, C10b
  (`wasm-core.contract.test.ts:1729-1743`, `fs.readFileSync(new URL("../../../../crates/…", import.meta.url))`).
- Réutilise : `apps/web/src/core/fake-core.ts:931` (`hitTest`), `:316` (`distToSegment`) — seulement si un écart de
  `edgeHit` est à corriger, jamais recodé ailleurs.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -1 && rm -rf apps/web/src/wasm && \
wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && \
ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web exec vitest run src/core --reporter=verbose 2>&1 | grep -E "C6a|×|FAIL|Test Files|Tests " | tail -40 && \
wc -c apps/web/src/wasm/roomboard_wasm_bg.wasm && pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS" | sed 's/(.*//' | sort | uniq -c
```

Attendu : aucun `×` ; 7 `✓ … contrat C6a : vrai module wasm > …`, 7 `✓ … contrat C6a : fausse liaison > …`, 1
`✓ contrat C6a : vrai module seulement > …` ; « contrat commun », « contrat C2 », « contrat C10a », « contrat C10b »
verts sur les deux fabriques (tests à garder verts) ; taille ≤ 1 572 864 o, citée ; `tsc` vide.

**Contraintes (recopiées).**
- GC2 TDD : le test « vrai module seulement » est vu rouge (`need()` sans module, ou assertion) avant tout correctif ;
  aucun `skip`, `only`, `todo` ; le vrai module est exigé (`ROOMBOARD_WASM_REQUIRED=1`).
- GC3 `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile) && ([ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c6a-pot/target .) && mkdir -p apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c6a-pot/apps/web/src/wasm-formats/*.d.ts apps/web/src/wasm-formats/`
  (le module `apps/web/src/wasm` est reconstruit par la commande bornée ; jamais commité).
- GC5 Preuve : la commande ci-dessus ; le rapport cite N, les noms vus et la taille du module.
- GC6 Commits : `git add <chemin>` un par un, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message
  anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; ne pas pousser.
- GC7 Jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC9 Plafond du module 1 572 864 o ni baissé ni relevé ; taille citée.
- GC11 Le cœur est la référence : un écart se corrige dans la fausse liaison ou l'aiguillage, pas en changeant
  l'attendu du contrat ; un écart du cœur lui-même est rapporté (pas corrigé ici).
- GC13 `tsc` vide.
- GC14 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :`.
- GC17 Aucun processus laissé en marche.
- GC18 Périmètre : seuls les trois fichiers ci-dessus.

**Interdits.** Ne pas toucher au cœur Rust ; ne pas commiter `apps/web/src/wasm/` ; ne pas affaiblir un test du bloc
« contrat C6a ».

**Critère « terminé ».** Commande bornée verte avec le vrai module, `tsc` vide, taille citée, un commit (plus un par
correctif éventuel).

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : test rouge.** À la fin de `wasm-core.contract.test.ts` :

```ts
describe.skipIf(loaded === null)("contrat C6a : vrai module seulement", () => {
  it("fixture socle-v1.roomboard (d'avant C6a, S5, D21) : fond blanc, le pot y colore le fond, relu après enregistrement", () => {
    const bytes = new Uint8Array(fs.readFileSync(new URL("../../../../crates/roomboard-core/tests/fixtures/socle-v1.roomboard", import.meta.url)));
    const d = need().core.load(bytes);
    const p = first(d);
    expect(bg(d, p)).toBe("#ffffff");
    d.apply({ type: "Fill", page: p, target: { kind: "background" }, color: "#1d4ed8" });
    const back = need().core.load(d.save(now, "0.1.0"));
    expect(bg(back, p)).toBe("#1d4ed8");
    back.free();
    d.free();
  });
});
```

- [ ] **Étape 3 : rouge puis vert.** Lancer d'abord `pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts 2>&1 | grep -E "C6a|Tests " | tail -5`
  sans module (attendu : le bloc sauté, compté « skipped ») ; puis la commande bornée (module reconstruit).

- [ ] **Étape 4 : écarts.** Si un test « contrat C6a : vrai module wasm » échoue : lire le message, corriger la
  fausse liaison (`fake-core.ts`, bras `Fill`, `edgeHit`) ou l'aiguillage (`wasm-core.ts`) pour suivre le cœur ; relancer
  la commande bornée. Écrire chaque écart trouvé dans le rapport (une ligne : test, cause, correctif).

- [ ] **Étape 5 : commit.** Fichiers modifiés un par un (GC6), message `test(core-ts): C6a contract on the real wasm module`.

---

### Tâche T6 — Choix de la cible (`fill-target.ts`), outil Pot, fabrique de la session
<a id="tache-t6"></a>

**Objectif.** De l'élément le plus haut sous le point, décider la commande du pot (règles D3 à D11 du cadrage) dans un
module pur testable sur la fausse liaison ; poser le geste (une commande au relâché, rien sur `cancel` ni `abort`) ;
brancher la fabrique dans la session de l'onglet. Sert S1, S2, S3, S4.

**Fichiers.**
- Créer : `apps/web/src/engine/fill-target.ts`, `apps/web/src/engine/fill-target.test.ts`
- Créer : `apps/web/src/engine/tools/fill.ts`, `apps/web/src/engine/tools/fill.test.ts`
- Modifier : `apps/web/src/app/board-session.ts` (fabriques `:159-171`, import)
- Modifier : `apps/web/src/app/board-session.test.ts` (un test dans « createBoardSession (T93) »)

**Interfaces.**
- Consomme : (T2) `Command` `{ type: "Fill"; page; target: FillTarget; color }`, `CoreDocument.edgeHit(id, x, y, tol)`,
  fausse liaison qui les joue ; (T3) `DrawTool` avec `"fill"`, `ToolFactories.fill?(ctx, color: () => string | null)`,
  `DEFAULT_FILL_COLOR = "#dc2626"` ; (T4) `offsetAt(spans, base, boxWidth, measure, lx, ly): number | null`,
  `wordAt(content, offset): readonly [number, number] | null`.
- Produit :

```ts
// engine/fill-target.ts
export const FILL_HIT_TOL_PX = 6;
export type FillDoc = Pick<CoreDocument, "hitTest" | "element" | "edgeHit">;
export function fillCommand(doc: FillDoc, page: string, x: number, y: number, zoom: number, color: string | null, measure: Measure): Command | null;
// engine/tools/fill.ts
export function createFillTool(ctx: ToolContext, color: () => string | null, measure: Measure): GestureTool;
```

- Réutilise : `apps/web/src/core/api.ts:221` (`hitTest(page, x, y, tol)`), cœur `query.rs:192` — tel quel, tolérance
  `6 / zoom` (même calcul que `TEXT_HIT_TOL_PX`, `engine/tools/text.ts:15`, `:96`, D3).
- Réutilise : `apps/web/src/core/api.ts` (`edgeHit`, de T2) — le bord se décide dans le cœur (DA2).
- Réutilise : `{ type: "FormatText", id, start, len, attrs: { color } }` (`commands.rs:93`) — mot ou texte entier (D6, D7).
- Réutilise : `SetTableCell { …, content: inchangé, spans: formatSpans(spans, start, len, { color }) }`
  (`commands.rs:119`, `apps/web/src/core/rich-text.ts:149`) — mot d'une cellule (D8).
- Réutilise : `SetTableFill` (`commands.rs:150`) — tel quel, cellule hors mot, vide ou ombrée (D9).
- Réutilise : `apps/web/src/engine/table-geom.ts:97` (`cellAt`, qui rend l'ancre via `anchorOf` `:85`), `:225`
  (`cellInnerBox`), `:158` (`cellContent`) ; `tableAt` (`:168`) n'est pas appelé : `hitTest` a déjà rendu le tableau le
  plus haut.
- Réutilise : `apps/web/src/core/shapes.ts:98` (`invertMatrix`), `:81` (`applyMatrix`), `:6` (`isSegment`).
- Réutilise : `apps/web/src/engine/table-geom.ts:221` (`innerWidth` via `cellInnerBox`) et
  `apps/web/src/engine/render/table-paint.ts:127` (`cellTextBoxes`) — même largeur intérieure et même taille
  (`t.size`) que le dessin des cellules (`render/canvas2d.ts:374`).
- Réutilise : `apps/web/src/engine/tools/tool.ts:36` (`GestureTool`) — `createFillTool`.
- Réutilise : `apps/web/src/app/board-session.ts:159-171` (fabriques, `measure` de la session) — fabrique `fill`.

**Patron à ne pas reprendre.** `FormatText` sur une cellule : il ne vise qu'un élément texte (`commands.rs:93`, pas de
`row`/`col`) ; le mot d'une cellule passe par `SetTableCell` avec `spans`. Ne pas remonter au groupe comme l'outil
Sélection (`engine/tools/select.ts:148-160`) : le pot vise l'élément touché (D4). Ne pas tester « dedans » soi-même
(`polygonHit`, `core/fake-core.ts:363`) : le bord vient d'`edgeHit`. Chemins de référence : `engine/tools/text.ts:93-96`
(tolérance de toucher), `engine/render/canvas2d.ts:358-377` (mise en lignes des textes et des cellules).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/engine/fill-target.test.ts src/engine/tools/fill.test.ts src/app/board-session.test.ts --reporter=verbose 2>&1 | grep -E "C6a|×|FAIL|Test Files|Tests " | tail -50 && \
pnpm --filter @roomboard/web test 2>&1 | grep -E "Test Files|Tests |FAIL" | tail -5 && \
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS" | sed 's/(.*//' | sort | uniq -c
```

Attendu : aucun `×` ; 17 `✓ cible du pot (C6a) > …`, 6 `✓ outil Pot (C6a, D15) > …`, 1
`✓ createBoardSession (T93) > outil Pot (C6a) : un clic dans le vide colore le fond…` ; suite web : `Tests` sans échec
(tests à garder verts : `engine.test.ts`, `tools/*.test.ts`, `ui/Toolbar.test.tsx`) ; `tsc` : au plus l'écart nommé
`src/core/wasm-core.ts` (`fill`, `edge_hit`).

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge. Aucun `skip`, `only`, `todo`, aucun seuil changé.
- GC3 `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile) && mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c6a-pot/apps/web/src/wasm/*.d.ts apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c6a-pot/apps/web/src/wasm-formats/*.d.ts apps/web/src/wasm-formats/`.
- GC5 Preuve : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message
  anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; ne pas pousser.
- GC7 Jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC8 Aucune dépendance nouvelle.
- GC11 La page ne recode pas la distance au bord : `edgeHit` seulement.
- GC13 `tsc` vide sauf l'écart nommé `src/core/wasm-core.ts`.
- GC14 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :`.
- GC16 Aucun changement de `tools/select.ts`, `input/keys.ts`, `app/workspace.ts`, `ui/item-state.ts` (D24).
- GC17 Aucun processus laissé en marche.
- GC18 Périmètre : seuls les six fichiers ci-dessus.

**Interdits.** Aucun raccourci clavier ni curseur du pot (hors périmètre) ; aucune commande neuve du cœur ; aucune
écriture pendant le geste (une seule au relâché).

**Critère « terminé ».** Commande bornée verte, suite web verte, un ou deux commits.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges de la cible.** `apps/web/src/engine/fill-target.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { Change, Command, CoreDocument, TableData } from "../core/api";
import { fakeCore } from "../core/fake-core";
import { fillCommand } from "./fill-target";
import type { Measure } from "./text-layout";

/** 10 unités par unité UTF-16, à toute taille. */
const ten: Measure = (s) => s.length * 10;
const RED = "#dc2626";
const idOf = (c: Change): string => c.ids[0] ?? "";
const tableOf = (d: CoreDocument, id: string): TableData => {
  const e = d.element(id);
  if (e?.kind !== "table") throw new Error("tableau");
  return e.table;
};

/** Rectangle (100, 100)-(300, 200) ; ligne y = 300 ; texte « Le chat noir » en (500, 100) ; tableau 2 × 2 en
 *  (100, 400), « Lundi matin » en (0, 0) ; trait y = 700 ; tout en noir, épaisseur 4. */
function setup() {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  const style = { color: "#000000", width: 4 };
  const rect = idOf(doc.apply({ type: "AddShape", page, shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style, fill: null }));
  const line = idOf(doc.apply({ type: "AddShape", page, shape: "line", x0: 100, y0: 300, x1: 300, y1: 300, style, fill: null }));
  const text = idOf(doc.apply({ type: "SetText", page, id: null, x: 500, y: 100, content: "Le chat noir", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 }));
  const table = idOf(doc.apply({ type: "AddTable", page, x: 100, y: 400, cols: 2, rows: 2, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 }));
  const t = tableOf(doc, table);
  const r = t.rows.map((x) => x.id);
  const c = t.cols.map((x) => x.id);
  doc.apply({ type: "SetTableCell", id: table, row: r[0] ?? "", col: c[0] ?? "", content: "Lundi matin" });
  const stroke = idOf(doc.apply({ type: "CommitStroke", page, points: new Float32Array([100, 700, 0.5, 200, 700, 0.5, 300, 700, 0.5]), style }));
  const at = (x: number, y: number, color: string | null = RED, zoom = 1): Command | null => fillCommand(doc, page, x, y, zoom, color, ten);
  return { doc, page, rect, line, text, table, stroke, r, c, at };
}

describe("cible du pot (C6a)", () => {
  it("forme, centre : intérieur (S1)", () => {
    const s = setup();
    expect(s.at(200, 150)).toEqual({ type: "Fill", page: s.page, target: { kind: "inside", id: s.rect }, color: RED });
  });

  it("forme, à 3 du bord : contour (S2, D5)", () => {
    const s = setup();
    expect(s.at(103, 150)).toEqual({ type: "Fill", page: s.page, target: { kind: "edge", id: s.rect }, color: RED });
  });

  it("tolérance 6 px écran = 6 / zoom (D3) : à 7 du tracé, contour au zoom 1, intérieur au zoom 2", () => {
    const s = setup();
    expect(s.at(106, 150, RED, 1)).toMatchObject({ target: { kind: "edge" } });
    expect(s.at(106, 150, RED, 2)).toMatchObject({ target: { kind: "inside" } });
  });

  it("« Aucune » : intérieur retiré ; sur le contour, aucune commande (D11)", () => {
    const s = setup();
    expect(s.at(200, 150, null)).toEqual({ type: "Fill", page: s.page, target: { kind: "inside", id: s.rect }, color: null });
    expect(s.at(103, 150, null)).toBeNull();
  });

  it("ligne et trait : toujours le contour (D5)", () => {
    const s = setup();
    expect(s.at(200, 301)).toEqual({ type: "Fill", page: s.page, target: { kind: "edge", id: s.line }, color: RED });
    expect(s.at(200, 700)).toEqual({ type: "Fill", page: s.page, target: { kind: "edge", id: s.stroke }, color: RED });
  });

  it("« Aucune » sur un trait : aucune commande (D11)", () => {
    expect(setup().at(200, 700, null)).toBeNull();
  });

  it("texte, sur « chat » : FormatText du mot seul (S3, D6)", () => {
    const s = setup();
    const cmd = s.at(535, 110);
    expect(cmd).toEqual({ type: "FormatText", id: s.text, start: 3, len: 4, attrs: { color: RED } });
    s.doc.apply(cmd as Command);
    const e = s.doc.element(s.text);
    expect(e?.kind === "text" ? e.text.spans : []).toEqual([{ text: "Le ", attrs: {} }, { text: "chat", attrs: { color: RED } }, { text: " noir", attrs: {} }]);
  });

  it("texte, sur l'espace : texte entier (S3, D7)", () => {
    const s = setup();
    expect(s.at(525, 110)).toEqual({ type: "FormatText", id: s.text, start: 0, len: 12, attrs: { color: RED } });
  });

  it("bande à gauche d'un texte : ramené dans la boîte, premier mot (D7, HC6-12)", () => {
    const s = setup();
    expect(s.at(497, 110)).toEqual({ type: "FormatText", id: s.text, start: 0, len: 2, attrs: { color: RED } });
  });

  it("mot après un emoji : FormatText accepté par la fausse liaison (bornes UTF-16)", () => {
    const s = setup();
    const id = idOf(s.doc.apply({ type: "SetText", page: s.page, id: null, x: 500, y: 200, content: "😀 été", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 }));
    const cmd = s.at(545, 210);
    expect(cmd).toEqual({ type: "FormatText", id, start: 3, len: 3, attrs: { color: RED } });
    expect(() => s.doc.apply(cmd as Command)).not.toThrow();
  });

  it("cellule, sur « matin » : SetTableCell, même contenu, le mot seul coloré (S3, D8)", () => {
    const s = setup();
    const cmd = s.at(183, 418);
    expect(cmd).toEqual({
      type: "SetTableCell", id: s.table, row: s.r[0], col: s.c[0], content: "Lundi matin",
      spans: [{ text: "Lundi ", attrs: {} }, { text: "matin", attrs: { color: RED } }],
    });
    expect(() => s.doc.apply(cmd as Command)).not.toThrow();
  });

  it("cellule vide, marge d'une cellule : remplissage de la cellule (S3, D9, PC10)", () => {
    const s = setup();
    expect(s.at(460, 432)).toEqual({ type: "SetTableFill", id: s.table, row: s.r[0], col: s.c[1], fill: RED });
    expect(s.at(103, 430)).toEqual({ type: "SetTableFill", id: s.table, row: s.r[0], col: s.c[0], fill: RED });
  });

  it("bande sous le tableau : cellule de la dernière ligne (D7, HC6-12)", () => {
    const s = setup();
    expect(s.at(150, 531)).toEqual({ type: "SetTableFill", id: s.table, row: s.r[1], col: s.c[0], fill: RED });
  });

  it("cellule ombrée : SetTableFill, aucun mot (D9, HC6-8)", () => {
    const s = setup();
    const cell = { row: s.r[1] ?? "", col: s.c[0] ?? "" };
    s.doc.apply({ type: "SetTableCell", id: s.table, ...cell, content: "Mardi" });
    s.doc.apply({ type: "SetTableShade", id: s.table, from: cell, to: cell, shade: "#94a3b8" });
    expect(s.at(118, 474)).toEqual({ type: "SetTableFill", id: s.table, ...cell, fill: RED });
  });

  it("cellule couverte : remplissage de l'ancre (D8)", () => {
    const s = setup();
    const a = { row: s.r[0] ?? "", col: s.c[0] ?? "" };
    s.doc.apply({ type: "MergeTableCells", id: s.table, from: a, to: { row: s.r[0] ?? "", col: s.c[1] ?? "" } });
    expect(s.at(460, 432)).toEqual({ type: "SetTableFill", id: s.table, ...a, fill: RED });
  });

  it("image : fond de la page (D1, S4)", () => {
    const s = setup();
    s.doc.apply({ type: "AddImage", page: s.page, asset: { id: "a".repeat(64), name: "x.png", mime: "image/png", size: 1 }, w: 100, h: 100, matrix: [1, 0, 0, 1, 700, 500] });
    expect(s.at(750, 550)).toEqual({ type: "Fill", page: s.page, target: { kind: "background" }, color: RED });
  });

  it("rien sous le pointeur : fond de la page ; « Aucune » : fond retiré (D10, D11)", () => {
    const s = setup();
    expect(s.at(1500, 1000)).toEqual({ type: "Fill", page: s.page, target: { kind: "background" }, color: RED });
    expect(s.at(1500, 1000, null)).toEqual({ type: "Fill", page: s.page, target: { kind: "background" }, color: null });
  });
});
```

- [ ] **Étape 3 : les voir rouges.** `pnpm --filter @roomboard/web exec vitest run src/engine/fill-target.test.ts 2>&1 | grep -E "Error|×" | head -3` —
  attendu : `Failed to resolve import "./fill-target"`.

- [ ] **Étape 4 : `apps/web/src/engine/fill-target.ts`.**

```ts
/**
 * Cible du pot (C6a, U28, DA3) : de l'élément le plus haut sous le point (`hitTest` tel quel, 6 px écran, D3) à la
 * commande ; null = aucune étape. Forme : bord (`edgeHit` du cœur, D5, DA2) → contour, sinon intérieur ; ligne, flèche,
 * trait : contour ; texte : mot sous le pointeur (UAX 29), sinon texte entier (D6, D7) ; tableau : mot de la cellule
 * par `SetTableCell` (D8), sinon remplissage de la cellule (D9) ; image, élément inconnu ou rien : fond de la page (D1,
 * D10). Un point de la bande de tolérance hors de la boîte d'un texte ou d'un tableau y est ramené (D7, PC10). Le pot
 * vise l'élément touché, jamais son groupe (D4).
 */
import type { Command, CoreDocument, TableElement, TextElement } from "../core/api";
import { formatSpans } from "../core/rich-text";
import { applyMatrix, invertMatrix, isSegment } from "../core/shapes";
import { cellAt, cellContent, cellInnerBox } from "./table-geom";
import { offsetAt, wordAt, type Measure } from "./text-layout";

/** Tolérance de toucher, en px d'écran (celle de l'outil Texte, D3). */
export const FILL_HIT_TOL_PX = 6;
export type FillDoc = Pick<CoreDocument, "hitTest" | "element" | "edgeHit">;

const clamp = (v: number, max: number): number => Math.min(Math.max(v, 0), max);
/** Dans [0, max) : `cellAt` exclut le bord droit et le bas. */
const within = (v: number, max: number): number => clamp(v, Math.max(0, max - 1e-6));
const sum = (vs: readonly number[]): number => vs.reduce((a, b) => a + b, 0);

const background = (page: string, color: string | null): Command => ({ type: "Fill", page, target: { kind: "background" }, color });

function textCommand(el: TextElement, x: number, y: number, color: string | null, measure: Measure): Command {
  const t = el.text;
  const whole: Command = { type: "FormatText", id: el.id, start: 0, len: t.content.length, attrs: { color } };
  const inv = invertMatrix(el.transform);
  if (inv === null) return whole;
  const [lx, ly] = applyMatrix(inv, x, y);
  const at = offsetAt(t.spans, { size: t.size }, t.boxWidth, measure, clamp(lx, t.boxWidth), clamp(ly, t.boxHeight));
  const word = at === null ? null : wordAt(t.content, at);
  return word === null ? whole : { type: "FormatText", id: el.id, start: word[0], len: word[1] - word[0], attrs: { color } };
}

function tableCommand(page: string, el: TableElement, x: number, y: number, color: string | null, measure: Measure): Command {
  const t = el.table;
  const inv = invertMatrix(el.transform);
  if (inv === null) return background(page, color);
  const [lx, ly] = applyMatrix(inv, x, y);
  const cx = within(lx, sum(t.cols.map((c) => c.width)));
  const cy = within(ly, sum(t.rows.map((r) => r.height)));
  const cell = cellAt(t, cx, cy);
  const row = cell === null ? undefined : t.rows[cell.row]?.id;
  const col = cell === null ? undefined : t.cols[cell.col]?.id;
  if (cell === null || row === undefined || col === undefined) return background(page, color);
  const fill: Command = { type: "SetTableFill", id: el.id, row, col, fill: color };
  const content = cellContent(t, row, col);
  if (content.text === "" || content.shade !== null) return fill;
  const box = cellInnerBox(t, cell);
  const at = offsetAt(content.spans, { size: t.size }, box.w, measure, cx - box.x, cy - box.y);
  const word = at === null ? null : wordAt(content.text, at);
  if (word === null) return fill;
  return { type: "SetTableCell", id: el.id, row, col, content: content.text, spans: formatSpans(content.spans, word[0], word[1] - word[0], { color }) };
}

/** Commande du pot au point (x, y) monde de `page`, caméra au `zoom` ; null : aucune étape (« Aucune » sur un contour
 *  ou un trait, D11). */
export function fillCommand(doc: FillDoc, page: string, x: number, y: number, zoom: number, color: string | null, measure: Measure): Command | null {
  const tol = FILL_HIT_TOL_PX / zoom;
  const id = doc.hitTest(page, x, y, tol);
  const el = id === null ? null : doc.element(id);
  if (el === null) return background(page, color);
  const edge = (): Command | null => (color === null ? null : { type: "Fill", page, target: { kind: "edge", id: el.id }, color });
  if (el.kind === "stroke") return edge();
  if (el.kind === "shape") {
    if (isSegment(el.shape.shape) || doc.edgeHit(el.id, x, y, tol)) return edge();
    return { type: "Fill", page, target: { kind: "inside", id: el.id }, color };
  }
  if (el.kind === "text") return textCommand(el, x, y, color, measure);
  if (el.kind === "table") return tableCommand(page, el, x, y, color, measure);
  return background(page, color);
}
```

- [ ] **Étape 5 : vert.** `pnpm --filter @roomboard/web exec vitest run src/engine/fill-target.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|Tests " | tail -20` — 17 `✓`.

- [ ] **Étape 6 : tests rouges du geste.** `apps/web/src/engine/tools/fill.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { Command } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import type { InputSample } from "../input/sampler";
import { createFillTool } from "./fill";
import type { ToolContext } from "./tool";

const at = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });

/** Caméra zoom 2, décalée de (10, 20) : l'écran (410, 320) est le monde (200, 150). */
function setup() {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  const runs: Command[] = [];
  const ctx: ToolContext = {
    doc,
    page: () => page,
    camera: () => ({ zoom: 2, tx: 10, ty: 20 }),
    run: (cmd) => {
      runs.push(cmd);
      try {
        return doc.apply(cmd);
      } catch {
        return null;
      }
    },
  };
  let color: string | null = "#facc15";
  const tool = createFillTool(ctx, () => color, (s) => s.length * 10);
  const rect = doc.apply({ type: "AddShape", page, shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
  return { doc, page, runs, tool, rect, setColor: (c: string | null) => (color = c) };
}

describe("outil Pot (C6a, D15)", () => {
  it("relâché : une commande, au point d'appui (pas au point de relâché)", () => {
    const s = setup();
    s.tool.begin(1, [at(410, 320)]);
    s.tool.extend(1, [at(2000, 2000)], []);
    expect(s.runs).toEqual([]);
    s.tool.close(1, "end");
    expect(s.runs).toEqual([{ type: "Fill", page: s.page, target: { kind: "inside", id: s.rect }, color: "#facc15" }]);
  });

  it("cancel et abort : aucune commande (HC6-5)", () => {
    const s = setup();
    s.tool.begin(1, [at(410, 320)]);
    s.tool.close(1, "cancel");
    s.tool.begin(2, [at(410, 320)]);
    s.tool.close(2, "abort");
    expect(s.runs).toEqual([]);
  });

  it("la couleur est lue au relâché (PC12)", () => {
    const s = setup();
    s.tool.begin(1, [at(410, 320)]);
    s.setColor("#16a34a");
    s.tool.close(1, "end");
    expect(s.runs[0]).toMatchObject({ color: "#16a34a" });
  });

  it("« Aucune » sur un contour : aucune commande (D11)", () => {
    const s = setup();
    s.setColor(null);
    s.tool.begin(1, [at(10 + 2 * 102, 320)]);
    s.tool.close(1, "end");
    expect(s.runs).toEqual([]);
  });

  it("active() pendant l'appui seulement ; aucun aperçu", () => {
    const s = setup();
    expect(s.tool.active()).toBe(false);
    s.tool.begin(1, [at(410, 320)]);
    expect(s.tool.active()).toBe(true);
    expect(s.tool.live().hidden.size).toBe(0);
    s.tool.close(1, "end");
    expect(s.tool.active()).toBe(false);
  });

  it("close sans begin, begin sans point fini : rien", () => {
    const s = setup();
    s.tool.close(9, "end");
    s.tool.begin(1, [at(Number.NaN, 0)]);
    s.tool.close(1, "end");
    expect(s.runs).toEqual([]);
  });
});
```

- [ ] **Étape 7 : `apps/web/src/engine/tools/fill.ts`.**

```ts
/**
 * Outil Pot (C6a, D2, D15) : aucun aperçu ; au relâché (`close("end")`), une commande au point d'appui, décidée par
 * `fillCommand` (couleur lue à ce moment, PC12) ; `cancel` et `abort` (paume, second doigt) n'écrivent rien (comme la
 * gomme, D39). Un clic = une commande = une étape (D2).
 */
import { screenToWorld } from "../camera";
import { fillCommand } from "../fill-target";
import type { CloseReason } from "../input/gesture";
import type { Measure } from "../text-layout";
import { NO_LIVE, type GestureTool, type ToolContext } from "./tool";

interface Press {
  readonly page: string;
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export function createFillTool(ctx: ToolContext, color: () => string | null, measure: Measure): GestureTool {
  const presses = new Map<number, Press>();
  return {
    begin(pointerId, samples) {
      const s = samples.find((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
      if (!s) return;
      const cam = ctx.camera();
      const [x, y] = screenToWorld(cam, s.x, s.y);
      presses.set(pointerId, { page: ctx.page(), x, y, zoom: cam.zoom });
    },
    extend() {},
    frame() {},
    close(pointerId: number, how: CloseReason) {
      const p = presses.get(pointerId);
      presses.delete(pointerId);
      if (!p || how !== "end") return;
      const cmd = fillCommand(ctx.doc, p.page, p.x, p.y, p.zoom, color(), measure);
      if (cmd !== null) ctx.run(cmd);
    },
    live: () => NO_LIVE,
    active: () => presses.size > 0,
  };
}
```

- [ ] **Étape 8 : fabrique de la session, test rouge puis code.** Dans `board-session.test.ts`, dans
  `describe("createBoardSession (T93)", …)`, après le test « outil Tableau : grille, saisie, Tab (C10a) … » :

```ts
  it("outil Pot (C6a) : un clic dans le vide colore le fond de la page (fabrique branchée, rouge par défaut)", async () => {
    const doc = fakeCore.blank();
    const s = await createBoardSession(doc, shared);
    s.activate();
    s.engine.setTool("fill");
    const c = s.engine.camera();
    const [sx, sy] = [1500 * c.zoom + c.tx, 900 * c.zoom + c.ty];
    s.engine.sink.begin(1, "fill", [{ x: sx, y: sy, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 }]);
    s.engine.sink.close(1, "end");
    expect(doc.page(doc.pageIds()[0] ?? "")?.background).toBe("#dc2626");
    s.dispose();
  });
```

  Rouge (fond `#ffffff`, outil inerte). Puis `board-session.ts` : `import { createFillTool } from "../engine/tools/fill";`
  et, dans `tools`, après la fabrique `table` :

```ts
      fill: (ctx, color) => createFillTool(ctx, color, measure),
```

- [ ] **Étape 9 : vert.** La commande bornée.

- [ ] **Étape 10 : commit.** Les six fichiers un par un (GC6), message
  `feat(engine): paint bucket target rules and fill tool (C6a)`.

---

### Tâche T7 — Barre et profils : outil Pot, couleurs, « Aucune », éditeur de profil, hôte
<a id="tache-t7"></a>

**Objectif.** L'outil Pot apparaît après Tableau dans les profils `defaut` et `annotation` ; Pot actif, la rangée des
préréglages montre `presets.fill` du profil s'il en a, sinon Rouge, Jaune, Vert, Bleu, Noir, puis « Aucune » ; un clic
règle la couleur du pot sans toucher au stylo ; l'éditeur de profil édite la couleur des préréglages du pot. Sert S1,
S2.

**Fichiers.**
- Modifier : `apps/web/src/toolbar.ts` (`TOOL_TABLE` `:84`, après `TABLE_FILLS` `:142`)
- Modifier : `apps/web/src/toolbar-profiles.ts:57` (groupe `edition`)
- Modifier : `apps/web/src/profile-edit.ts:31-45`, `:131-135` (`PRESET_FIELDS`, `NEW_PRESET`, `addPreset`)
- Modifier : `apps/web/src/app/toolbar-host.ts` (`ToolbarHost` `:8`, `HostTargets` `:18`, `setTool` `:57`)
- Modifier : `apps/web/src/ui/Toolbar.tsx:83-106` (`PresetRow`)
- Tests : `toolbar.test.ts`, `toolbar-profiles.test.ts`, `profile-edit.test.ts`, `app/toolbar-host.test.ts`,
  `ui/Toolbar.test.tsx`

**Interfaces.**
- Consomme (T3) : `ToolChoice` avec `"fill"`, `Engine.setFillColor(color: string | null): void`.
- Produit (lu par T8 par le DOM : `button[data-item="fill"]`, `button[data-preset="<id>"]`, `button[data-fill-none]`) :

```ts
// toolbar.ts
export interface FillColor { readonly id: string; readonly label: string; readonly color: string }
export const FILL_COLORS: readonly FillColor[]; // rouge #dc2626, jaune #facc15, vert #16a34a, bleu #1d4ed8, noir #000000
export const FILL_NONE_LABEL = "Aucune";
export function fillChoices(table: Profile["presets"]): readonly FillColor[];
// app/toolbar-host.ts
// ToolbarHost : fillColor(color: string | null): void ; HostTargets.engine() : Pick<…, … | "setFillColor">
```

- Réutilise : `apps/web/src/toolbar.ts:84` (`TOOL_TABLE`), `apps/web/src/toolbar-profiles.ts:41`, `:57` —
  `fill: { label: "Pot", choice: "fill" }`, `tool("fill", "Pot")`.
- Réutilise : `apps/web/src/toolbar.ts:142` (`TABLE_FILLS`, patron) — `FILL_COLORS`.
- Réutilise : `apps/web/src/ui/Toolbar.tsx:83` (`PresetRow`) — étendue : `fillChoices` ou `presetsOf`, puis « Aucune ».
- Réutilise : `apps/web/src/app/toolbar-host.ts:57` (`setTool`, `presetsOf`) — préréglage du pot → `setFillColor` (D16).
- Réutilise : `apps/web/src/profile-edit.ts:32` (`PRESET_FIELDS`), `:45` (`NEW_PRESET`) — `fill: [color]`, préréglage
  neuf selon l'outil.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/toolbar.test.ts src/toolbar-profiles.test.ts src/profile-edit.test.ts src/app/toolbar-host.test.ts src/ui --reporter=verbose 2>&1 | grep -E "C6a|×|FAIL|Test Files|Tests " | tail -40 && \
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS" | sed 's/(.*//' | sort | uniq -c
```

Attendu : aucun `×` ; 5 `✓ Toolbar — rangée du pot (C6a) > …`, 3 `✓ ToolbarHost — pot (C6a, D16) > …`, 1
`✓ outil Pot dans les profils (C6a) > …`, 3 `✓ couleurs du pot (C6a, D16, D17) > …`, 2 `✓ préréglages du pot (C6a, D17) > …` ;
tests à garder verts : « tables : chaque outil du moteur a son entrée », « catalogue : barre tools = outils et actions
absents », « champs modifiables : stylo… », « defaut : un bouton par élément visible », `ui/ProfileEditor.test.tsx`,
`ui/App.test.tsx` ; `tsc` : au plus l'écart nommé `src/core/wasm-core.ts`.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge. Aucun `skip`, `only`, `todo`, aucun seuil changé.
- GC3 `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile) && mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c6a-pot/apps/web/src/wasm/*.d.ts apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c6a-pot/apps/web/src/wasm-formats/*.d.ts apps/web/src/wasm-formats/`.
- GC5 Preuve : la commande ci-dessus ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message
  anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; ne pas pousser.
- GC7 Jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC8 Aucune dépendance nouvelle.
- GC12 Dans `ui/` : aucun `switch`, aucune taille en `px` dans un `.tsx`, libellés en français, cibles d'au moins
  `--rb-btn-m` (classes `rb-preset`, `rb-swatch` existantes) ; aucun style neuf dans `rb.css`.
- GC13 `tsc` vide sauf l'écart nommé `src/core/wasm-core.ts`.
- GC14 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :`.
- GC16 Aucun changement de `ui/item-state.ts` (l'état enfoncé du Pot vient de `TOOL_TABLE`), ni de `input/keys.ts` (D24).
- GC17 Aucun processus laissé en marche.
- GC18 Périmètre : seuls les dix fichiers ci-dessus.

**Interdits.** Aucun `presets.fill` dans les profils livrés (D17) ; « Aucune » n'est jamais un préréglage (D11) ; aucun
raccourci clavier ; pas de Pot dans le profil `simple` ; `toolbar.ts` et `toolbar-profiles.ts` restent sans `switch`,
sans DOM, sans `localStorage` (test source existant).

**Critère « terminé ».** Commande bornée verte, un ou deux commits.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges.** `toolbar.test.ts` : ajouter `fillChoices, FILL_COLORS` à l'import de `./toolbar` ;
  dans « tables : chaque outil du moteur a son entrée », la liste devient
  `["arrow", "ellipse", "eraser", "fill", "hand", "line", "pen", "rect", "select", "table", "text"]` ; à la fin :

```ts
describe("couleurs du pot (C6a, D16, D17)", () => {
  it("FILL_COLORS : Rouge, Jaune, Vert, Bleu, Noir ; Pot dans TOOL_TABLE", () => {
    expect(FILL_COLORS.map((c) => [c.id, c.label, c.color])).toEqual([
      ["rouge", "Rouge", "#dc2626"], ["jaune", "Jaune", "#facc15"], ["vert", "Vert", "#16a34a"], ["bleu", "Bleu", "#1d4ed8"], ["noir", "Noir", "#000000"],
    ]);
    expect(TOOL_TABLE["fill"]).toEqual({ label: "Pot", choice: "fill" });
  });

  it("fillChoices : sans presets.fill, la liste figée ; avec, elle fait foi (même vide), sans couleur sautée (PC7)", () => {
    expect(fillChoices({ pen: [] })).toBe(FILL_COLORS);
    const orange = { id: "orange", label: "Orange", color: "#f97316", rest: {} };
    expect(fillChoices({ fill: [orange, { id: "x", label: "X", rest: {} }] })).toEqual([{ id: "orange", label: "Orange", color: "#f97316" }]);
    expect(fillChoices({ fill: [] })).toEqual([]);
  });

  it(".rbprofile : presets.fill gardé à l'aller-retour, sans épaisseur", () => {
    const p = ok(base()).profile;
    const q: Profile = { ...p, presets: { ...p.presets, fill: [{ id: "orange", label: "Orange", color: "#f97316", rest: {} }] } };
    expect(ok(serializeProfile(q)).profile.presets["fill"]).toEqual([{ id: "orange", label: "Orange", color: "#f97316", rest: {} }]);
  });
});
```

  `toolbar-profiles.test.ts`, à la fin :

```ts
describe("outil Pot dans les profils (C6a)", () => {
  it("defaut et annotation : Pot juste après Tableau ; simple : sans Pot ; aucun presets.fill livré (D17, D18, HC6-7)", () => {
    for (const p of ["defaut", "annotation"]) {
      const edition = builtinProfile(p)!.toolbars[0]!.groups.find((g) => g.id === "edition")!.items.map((i) => i.id);
      expect(edition.indexOf("fill"), p).toBe(edition.indexOf("table") + 1);
    }
    expect(ids("simple")).not.toContain("fill");
    for (const p of ["defaut", "annotation", "simple"]) expect(Object.hasOwn(builtinProfile(p)!.presets, "fill"), p).toBe(false);
  });
});
```

  `profile-edit.test.ts` : dans « catalogue : … (P15) », la liste de `simple` devient
  `["select", "rect", "ellipse", "line", "arrow", "text", "table", "fill"]` ; dans « champs modifiables : … »,
  `expect(PRESET_TOOLS).toEqual(["pen", "fill"]);` ; à la fin :

```ts
describe("préréglages du pot (C6a, D17)", () => {
  it("champ couleur seul ; préréglage ajouté noir, sans épaisseur", () => {
    expect(presetFields("fill").map((f) => [f.key, f.input])).toEqual([["color", "color"]]);
    expect(addPreset(DEFAUT, "fill").presets["fill"]).toEqual([{ id: "couleur", label: "Couleur 1", color: "#000000", rest: {} }]);
    expect(addPreset(DEFAUT, "pen").presets.pen!.at(-1)).toEqual({ id: "couleur", label: "Couleur 4", color: "#000000", width: 4, rest: {} });
  });

  it("copie utilisateur du profil defaut sans Pot : le catalogue le propose (HC6-7)", () => {
    const copy: Profile = { ...DEFAUT, toolbars: DEFAUT.toolbars.map((b) => ({ ...b, groups: b.groups.map((g) => ({ ...g, items: g.items.filter((i) => i.id !== "fill") })) })) };
    expect(catalog(copy, "outils").find((e) => e.ref === "fill")).toEqual({ kind: "tool", ref: "fill", label: "Pot" });
  });
});
```

  `app/toolbar-host.test.ts` : dans `setup`, ajouter `setFillColor: vi.fn(),` à l'objet `engine` ; à la fin :

```ts
describe("ToolbarHost — pot (C6a, D16)", () => {
  it('setTool("fill", "jaune") sans presets.fill : setFillColor(#facc15), le stylo ne change pas', () => {
    const { host, engine } = setup();
    host.setTool("fill", "jaune");
    expect(engine.setFillColor).toHaveBeenCalledWith("#facc15");
    expect(engine.setPenStyle).not.toHaveBeenCalled();
    expect(engine.setTool).toHaveBeenCalledWith("fill");
  });

  it("presets.fill du profil : il fait foi ; un id de la liste figée absent du profil : couleur inchangée (PC7)", () => {
    const base = BUILTIN_PROFILES[0]!;
    const profile: Profile = { ...base, presets: { ...base.presets, fill: [{ id: "orange", label: "Orange", color: "#f97316", rest: {} }] } };
    const { host, engine } = setup({}, profile);
    host.setTool("fill", "orange");
    host.setTool("fill", "jaune");
    expect(engine.setFillColor.mock.calls).toEqual([["#f97316"]]);
  });

  it("fillColor(null) → setFillColor(null) (« Aucune », D11)", () => {
    const { host, engine } = setup();
    host.fillColor(null);
    expect(engine.setFillColor).toHaveBeenCalledWith(null);
  });
});
```

  `ui/Toolbar.test.tsx` : dans `setup`, ajouter `fillColor: vi.fn()` à l'objet `host` ; à la fin :

```tsx
describe("Toolbar — rangée du pot (C6a)", () => {
  const POT: ToolbarView = { ...VIEW, tool: "fill" };
  const presetIdsOf = (c: HTMLElement) => [...c.querySelectorAll("button[data-preset]")].map((e) => e.getAttribute("data-preset"));

  it("profil sans presets.fill : cinq couleurs figées puis « Aucune » en dernier (D16, D17)", () => {
    const { container, setV } = setup(outils, NO_CAPS, "m", {});
    setV(POT);
    expect(presetIdsOf(container)).toEqual(["rouge", "jaune", "vert", "bleu", "noir"]);
    const bar = container.querySelector('[data-toolbar="outils"]')!;
    const none = bar.querySelector("button[data-fill-none]")!;
    expect(none.textContent).toContain("Aucune");
    const kids = [...bar.children];
    expect(kids.indexOf(none)).toBe(kids.indexOf(bar.querySelector('[data-preset="noir"]')!) + 1);
  });

  it("presets.fill du profil : seuls ses préréglages, puis « Aucune »", () => {
    const { container, setV } = setup(outils, NO_CAPS, "m", { fill: [{ id: "orange", label: "Orange", color: "#f97316", rest: {} }] });
    setV(POT);
    expect(presetIdsOf(container)).toEqual(["orange"]);
    expect(container.querySelector("button[data-fill-none]")).not.toBeNull();
  });

  it("presets.fill vide : « Aucune » seule", () => {
    const { container, setV } = setup(outils, NO_CAPS, "m", { fill: [] });
    setV(POT);
    expect(presetIdsOf(container)).toEqual([]);
    expect(container.querySelector("button[data-fill-none]")).not.toBeNull();
  });

  it("clic sur Jaune → host.setTool(fill, jaune) ; « Aucune » → host.fillColor(null)", () => {
    const { container, host, setV } = setup(outils, NO_CAPS, "m", {});
    setV(POT);
    fireEvent.click(container.querySelector('button[data-preset="jaune"]')!);
    fireEvent.click(container.querySelector("button[data-fill-none]")!);
    expect(host.setTool).toHaveBeenCalledWith("fill", "jaune");
    expect(host.fillColor).toHaveBeenCalledWith(null);
  });

  it("Stylo actif : ni couleurs du pot ni « Aucune »", () => {
    const { container } = setup(outils, NO_CAPS, "m", {});
    expect(presetIdsOf(container)).toEqual([]);
    expect(container.querySelector("button[data-fill-none]")).toBeNull();
  });
});
```

- [ ] **Étape 3 : les voir rouges.** La commande bornée — attendu : `×` (`fill` absent de `TOOL_TABLE`,
  `fillChoices is not a function`, `setFillColor` jamais appelé).

- [ ] **Étape 4 : `toolbar.ts`.** Dans `TOOL_TABLE`, après `table: …,` : `fill: { label: "Pot", choice: "fill" },`.
  Après `TABLE_FILLS` :

```ts
/** Couleur du pot (C6a, D17). */
export interface FillColor { readonly id: string; readonly label: string; readonly color: string }
/** Couleurs du pot quand le profil n'a pas `presets.fill` (même patron que `TABLE_FILLS`) ; Rouge est le défaut du moteur. */
export const FILL_COLORS: readonly FillColor[] = Object.freeze([
  { id: "rouge", label: "Rouge", color: "#dc2626" },
  { id: "jaune", label: "Jaune", color: "#facc15" },
  { id: "vert", label: "Vert", color: "#16a34a" },
  { id: "bleu", label: "Bleu", color: "#1d4ed8" },
  { id: "noir", label: "Noir", color: "#000000" },
]);
/** Bouton fixe de fin de rangée du pot (D11) : retire la couleur posée ; jamais un préréglage. */
export const FILL_NONE_LABEL = "Aucune";

/** Couleurs proposées par le pot (D16, PC7) : `presets.fill` du profil dès que la clé existe (même vide), sinon
 *  `FILL_COLORS` ; un préréglage sans couleur est sauté. */
export function fillChoices(table: Profile["presets"]): readonly FillColor[] {
  if (!Object.hasOwn(table, "fill")) return FILL_COLORS;
  return presetsOf(table, "fill").flatMap((p) => (p.color === undefined ? [] : [{ id: p.id, label: p.label, color: p.color }]));
}
```

- [ ] **Étape 5 : `toolbar-profiles.ts`.** Groupe `edition` : ajouter `tool("fill", "Pot")` après `tool("table", "Tableau")`.

- [ ] **Étape 6 : `profile-edit.ts`.** Remplacer le commentaire et `PRESET_FIELDS`, `NEW_PRESET`, `addPreset` :

```ts
/** Champs que le moteur applique, par outil (P17) : stylo par `setPenStyle`, pot par `setFillColor` (C6a, D17). */
const PRESET_FIELDS: Readonly<Record<ToolId, readonly PresetField[]>> = Object.freeze({
  pen: Object.freeze([
    { key: "color", label: "Couleur", input: "color" },
    { key: "width", label: "Épaisseur", input: "number" },
  ] as const),
  fill: Object.freeze([{ key: "color", label: "Couleur", input: "color" }] as const),
});
```

```ts
/** Préréglage ajouté, par outil : noir, épaisseur 4 (celle des livrés) ; pot : noir, sans épaisseur (D17). */
const NEW_PRESET: Readonly<Record<ToolId, PresetPatch>> = Object.freeze({
  pen: { color: "#000000", width: 4 },
  fill: { color: "#000000" },
});
const DEFAULT_NEW_PRESET: PresetPatch = { color: "#000000", width: 4 };
```

```ts
export function addPreset(p: Profile, tool: ToolId): Profile {
  const list = presetsOf(p.presets, tool);
  const id = uniqueId("couleur", new Set(list.map((x) => x.id)));
  const fields = Object.hasOwn(NEW_PRESET, tool) ? (NEW_PRESET[tool] ?? DEFAULT_NEW_PRESET) : DEFAULT_NEW_PRESET;
  return withPresets(p, tool, [...list, { id, label: `Couleur ${list.length + 1}`, ...fields, rest: {} }]);
}
```

- [ ] **Étape 7 : `app/toolbar-host.ts`.** Import : ajouter `fillChoices` à l'import de `../toolbar`. Dans `ToolbarHost`,
  après `tableFill` : `/** « Aucune » de la rangée du pot (C6a, D11) ; une couleur la règle directement. */ fillColor(color: string | null): void;`.
  Dans `HostTargets.engine()`, ajouter `| "setFillColor"` au `Pick`. `setTool` devient :

```ts
    setTool(tool, preset) {
      if (!isKnownTool(tool)) return;
      const choice = TOOL_TABLE[tool]!.choice;
      if (preset !== undefined && choice === "fill") {
        // Pot (D16) : sa couleur propre, jamais celle du stylo.
        const c = fillChoices(profile().presets).find((x) => x.id === preset);
        if (c !== undefined) t.engine().setFillColor(c.color);
      } else if (preset !== undefined) {
        const p = presetsOf(profile().presets, tool).find((x) => x.id === preset);
        if (p?.color !== undefined && p.width !== undefined) t.engine().setPenStyle({ color: p.color, width: p.width });
      }
      t.engine().setTool(choice);
    },
```

  et, après `tableFill: …,` : `fillColor: (color) => t.engine().setFillColor(color),`.

- [ ] **Étape 8 : `ui/Toolbar.tsx`.** Import : ajouter `fillChoices, FILL_NONE_LABEL` à l'import de `../toolbar`.
  `PresetRow` devient :

```tsx
/** Rangée contextuelle (C1, P18, P19) : un bouton `data-preset` par préréglage de l'outil actif, sans état enfoncé ;
 *  Pot (C6a, D16) : `presets.fill` du profil ou la liste figée, puis « Aucune » (`data-fill-none`, D11). */
function PresetRow(props: { presets: Accessor<PresetTable>; view: Accessor<ToolbarView>; host: ToolbarHost }): JSX.Element {
  const tool = createMemo(() => toolOf(props.view().tool));
  const pot = createMemo(() => props.view().tool === TOOL_TABLE["fill"]?.choice);
  const list = createMemo((): readonly { readonly id: string; readonly label: string; readonly color?: string }[] => {
    const t = tool();
    if (t === null) return [];
    return pot() ? fillChoices(props.presets()) : presetsOf(props.presets(), t);
  });
  const press = (presetId: string): void => {
    const t = tool();
    if (t !== null) props.host.setTool(t, presetId);
  };
  return (
    <Show when={list().length > 0 || pot()}>
      <span class="rb-sep" role="separator" data-presets-sep />
      <For each={list()}>
        {(p) => (
          <button type="button" class="rb-preset" data-preset={p.id} title={p.label} onClick={() => press(p.id)}>
            <span class="rb-swatch" aria-hidden="true" style={{ "background-color": p.color ?? "transparent" }} />
            {p.label}
          </button>
        )}
      </For>
      <Show when={pot()}>
        <button type="button" class="rb-preset" data-fill-none title={FILL_NONE_LABEL} onClick={() => props.host.fillColor(null)}>
          <span class="rb-swatch" aria-hidden="true" style={{ "background-color": "transparent" }} />
          {FILL_NONE_LABEL}
        </button>
      </Show>
    </Show>
  );
}
```

- [ ] **Étape 9 : vert.** La commande bornée.

- [ ] **Étape 10 : commit.** Les dix fichiers un par un (GC6), message
  `feat(toolbar): paint bucket tool, colours, None button and fill presets (C6a)`.

---

### Tâche T8 — Essai navigateur C6a dans `verifier.sh --e2e`, capture, scène ≥ 640 px, `inkIn` étendu
<a id="tache-t8"></a>

**Objectif.** Jouer S1 à S5 dans un vrai Chromium sur l'application construite avec le vrai module : remplir, annuler,
rétablir ; contour, trait, « Aucune » ; mot d'un texte (gardé à l'édition), texte entier, mot d'une cellule, cellule
vide ; fond, image → fond, « Aucune » ; enregistrer, rouvrir, ouvrir le fichier d'avant C6a ; scène ≥ 640 px Pot actif ;
capture. `inkIn` gagne la lecture d'une couleur (D27) et remplace `paintedIn` de C9. Sert S1 à S5.

**Fichiers.**
- Créer : `scripts/essais/c6a-pot-navigateur.mjs`, `docs/essais/c6a-pot.png`
- Modifier : `scripts/essais/commun.mjs:70-87` (`inkIn`)
- Modifier : `scripts/essais/c9-grille-navigateur.mjs:11`, `:18-35` (`paintedIn` → `inkIn(…, { max: 750 })`)
- Modifier : `scripts/verifier.sh:92-104` (ligne de l'essai), `scripts/tests/verifier-e2e.test.sh:13` (liste)
- Conditionnel : `apps/web/src/ui/Toolbar.tsx` (repli D19, étape 7) ; `crates/roomboard-core/tests/pot.rs` (groupe,
  étape 8)

**Interfaces.**
- Consomme (T6, T7, par le DOM) : `button[data-item="fill"]`, `button[data-preset="rouge|jaune|vert|bleu"]`,
  `button[data-fill-none]`, `#stage[data-elements|data-camera|data-table|data-ready]`, `#texte-edition` ; (T5) module
  et contrat verts ; (T1) `crates/roomboard-core/tests/fixtures/socle-v1.roomboard`.
- Produit : `inkIn(page, box, opts = {})` avec `opts.max` (somme RVB, défaut 300), `opts.rgb` (`[r, g, b]`) et
  `opts.tol` (écart par composante, défaut 40) ; `rgb` donné : pixels proches de cette couleur.
- Réutilise : `scripts/essais/commun.mjs:71` (`inkIn`, étendu), `:94` (`stageBox`), `:103` (`stageMouse`), `:136`
  (`dropFile`), `serve`, `coqueCsp`, `loadPlaywright` — rien de recopié ; aucun troisième compteur (D27).
- Réutilise : `scripts/essais/c2-image-navigateur.mjs:24-58` (`crc32`, `chunk`, `solidPng`, patron) — PNG uni fabriqué
  dans l'essai (aucun fichier d'image commité hors capture).
- Réutilise : `crates/roomboard-core/tests/fixtures/socle-v1.roomboard` — fichier d'avant C6a, ouvert par Ctrl+O.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
bash scripts/verifier.sh --e2e 2>&1 | tail -80 && bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3 && \
ls -l docs/essais/c6a-pot.png && pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS" | sed 's/(.*//' | sort | uniq -c
```

Attendu : `ok — …` pour chaque vérification de l'essai C6a puis `C6a pot : OK` ; `C9 grille : OK` (`paintedIn` par
`inkIn`), `C10b tableau : OK`, `C7b texte riche : OK`, `C1 profils : OK`, `S5b : OK` et les autres essais (tests à
garder verts : la barre gagne un bouton, `stageBox` ≥ 640 dans chacun) ; `verifier.sh : e2e OK` puis
`verifier.sh : OK` ; `verifier-e2e.test.sh : OK` ; le PNG listé ; `tsc` vide ; la taille du module lue dans la sortie
de `verifier.sh`, ≤ 1 572 864 o, citée.

**Preuve visuelle.** Lectures d'abord (une valeur lue prouve plus qu'une image) : l'essai lit des couleurs exactes dans
`#scene` (`inkIn` avec `rgb`), les segments de `#texte-edition` rouvert (`style.color` = `rgb(220, 38, 38)` sur
« chat »), `#stage[data-elements]` et la hauteur de `#stage`. Puis la capture
`node scripts/essais/c6a-pot-navigateur.mjs --captures` → `docs/essais/c6a-pot.png`, à décrire dans le rapport :
rectangle rempli de jaune au contour rouge, trait rouge, « chat » rouge dans « Le gros chat noir », « matin » rouge et
la cellule voisine rouge, fond de page bleu, rangée du pot visible (cinq couleurs et « Aucune »).

**Contraintes (recopiées).**
- GC1 `scripts/verifier.sh --e2e` n'est lancé que dans cette tâche.
- GC2 TDD : l'essai est d'abord vu en échec (étape 3) avant tout correctif ; aucun test sauté ni désactivé, aucun seuil
  ni délai relevé (dont `stageBox` 640 et les `timeout` existants) ; un essai qui échoue sur un délai est rejoué une
  fois avant d'être jugé ; le vrai module est exigé (`verifier.sh` pose `ROOMBOARD_WASM_REQUIRED=1`).
- GC3 `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Aucun build Tauri (`tauri build`), aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile) && ([ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c6a-pot/target .)`
  (les modules sont reconstruits par `verifier.sh` ; jamais commités).
- GC5 Preuve : la commande ci-dessus ; le rapport cite les lignes `ok —` de C6a, les lignes `: OK` vues et la taille.
- GC6 Commits : `git add <chemin>` un par un, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message
  anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; ne pas pousser.
- GC7 Jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC8 Aucune dépendance nouvelle (Playwright du cache npx, comme les autres essais).
- GC9 Plafond du module 1 572 864 o ni baissé ni relevé (contrôle de `verifier.sh` intact) ; taille citée.
- GC12 Si l'étape 7 touche `ui/Toolbar.tsx` : aucun `switch`, aucune taille en `px`, `title` et `aria-label` en
  français, aucun style neuf dans `rb.css`.
- GC13 `tsc` vide.
- GC14 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :`.
- GC17 Aucun processus laissé en marche (serveur, navigateur) ; l'essai ferme les siens dans `finally`.
- GC18 Périmètre : seuls les fichiers ci-dessus (les deux conditionnels seulement si leur étape l'exige).

**Interdits.** `verifier.sh --e2e` ne passe aucune option de capture ; ne pas réécrire une capture d'un autre essai ;
aucune requête hors de 127.0.0.1 ; ne pas modifier les autres essais au-delà de `paintedIn` de C9 ; aucun troisième
compteur de pixels.

**Critère « terminé ».** Commande bornée verte, capture commitée et décrite, un ou deux commits.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : `inkIn` étendu et `paintedIn` de C9.** `commun.mjs`, remplacer `inkIn` :

```js
/** Pixels d'une boîte [x0, y0, x1, y1] en px CSS du canvas de scène `#scene` : d'encre (somme RVB < `max`, défaut 300),
 *  ou, si `rgb` est donné, proches de cette couleur à `tol` près par composante (C6a, D27). */
export function inkIn(page, box, opts = {}) {
  const { max = 300, rgb = null, tol = 40 } = opts;
  return page.$eval(
    "#scene",
    (c, [[x0, y0, x1, y1], max, rgb, tol]) => {
      const ctx = c.getContext("2d");
      const sx = c.width / c.clientWidth;
      const sy = c.height / c.clientHeight;
      const w = Math.max(1, Math.round((x1 - x0) * sx));
      const h = Math.max(1, Math.round((y1 - y0) * sy));
      const d = ctx.getImageData(Math.round(x0 * sx), Math.round(y0 * sy), w, h).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const hit = rgb === null
          ? d[i] + d[i + 1] + d[i + 2] < max
          : Math.abs(d[i] - rgb[0]) <= tol && Math.abs(d[i + 1] - rgb[1]) <= tol && Math.abs(d[i + 2] - rgb[2]) <= tol;
        if (hit) n++;
      }
      return n;
    },
    [box, max, rgb, tol],
  );
}
```

  `c9-grille-navigateur.mjs` : ajouter `inkIn` à l'import de `./commun.mjs` et remplacer toute la fonction `paintedIn`
  (garder son commentaire) par :

```js
/** Pixels différents du fond de page (somme RVB < 750) : le gris des grilles neuves (#94a3b8, somme 495) compte, alors
 *  que l'encre seule (`inkIn` sans option, somme < 300) ne le voit pas (C6a, D27 : un seul compteur). */
const paintedIn = (page, box) => inkIn(page, box, { max: 750 });
```

- [ ] **Étape 3 : l'essai, d'abord en échec.** Créer `scripts/essais/c6a-pot-navigateur.mjs` :

```js
#!/usr/bin/env node
// Essai C6a « pot de peinture » au navigateur (S1 à S5 du cadrage usage-c6a-pot). Application construite (apps/web/dist)
// servie en local avec la CSP de la coque, Chromium headless de Playwright, mode repli (`?fichiers=repli`), heure figée.
// Oracles : couleurs lues dans `#scene` (`inkIn` avec `rgb`, D27), segments de `#texte-edition` rouvert, attributs de
// `#stage` ; aucune requête hors de 127.0.0.1. Lancé par scripts/verifier.sh --e2e, sans option de capture.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Usage : node scripts/essais/c6a-pot-navigateur.mjs [--captures]
// (--captures : docs/essais/c6a-pot.png : forme remplie, contour, trait, mot, cellule et fond colorés).
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, dropFile, frames, gitSha, inkIn, item, loadPlaywright, serve, stageBox, stageMouse } from "./commun.mjs";

const LABEL = "C6a pot";
const FIXED = new Date("2026-11-20T08:00:00.000Z");
const FONT = '36px "Atkinson Hyperlegible", system-ui, sans-serif';
const SOCLE = join(ROOT, "crates", "roomboard-core", "tests", "fixtures", "socle-v1.roomboard");
/** Points de la scène, px de la scène (caméra du premier onglet, largeur ajustée). */
const RECT = [[200, 150], [420, 300]];
const CENTRE = [310, 225];
const NEAR_EDGE = [203, 225];
const STROKE = [[200, 380], [420, 380]];
const TEXT_AT = [600, 150];
const TABLE_AT = [200, 430];
const VOID = [1100, 560];
const DROP_AT = [1000, 300];
const YELLOW = [250, 204, 21];
const RED = [220, 38, 38];
const BLUE = [29, 78, 216];
const GREEN = [22, 163, 74];
const WHITE = [255, 255, 255];
const RED_CSS = "rgb(220, 38, 38)";
const BLUE_CSS = "rgb(29, 78, 216)";

// PNG uni (patron de c2-image-navigateur.mjs) : l'image déposée en S4.
const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function solidPng(w, h, [r, g, b]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const row = Buffer.alloc(1 + 3 * w);
  for (let x = 0; x < w; x++) row.set([r, g, b], 1 + 3 * x);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
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
  const key = async (k) => {
    await page.keyboard.press(k);
    await fr();
  };
  const waitAttr = (name, v) =>
    page
      .waitForFunction(([n, w]) => document.querySelector("#stage")?.getAttribute(n) === w, [name, v], { timeout: 15000 })
      .catch(async () => {
        throw new Echec(`${name} attendu « ${v} », lu « ${await attr(name)} »`);
      });
  const camera = async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    return { zoom, tx, ty };
  };
  const c0 = await (async () => {
    await page.goto(url);
    await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
    await fr();
    return camera();
  })();
  /** Monde d'un point de scène (caméra du premier onglet) ; puis scène d'un point monde par la caméra courante. */
  const world = ([x, y]) => [(x - c0.tx) / c0.zoom, (y - c0.ty) / c0.zoom];
  const screen = async ([wx, wy]) => {
    const c = await camera();
    return [wx * c.zoom + c.tx, wy * c.zoom + c.ty];
  };
  const clickWorld = async (w) => {
    const [x, y] = await screen(w);
    await mouse.click(x, y);
    await fr();
  };
  const sq = async (w, r = 8) => {
    const [x, y] = await screen(w);
    return [x - r, y - r, x + r, y + r];
  };
  const near = async (w, rgb, tol = 40, r = 8) => inkIn(page, await sq(w, r), { rgb, tol });
  const pot = async () => {
    await page.click(item("fill"));
    await fr();
  };
  const pick = async (id) => {
    await page.click(`button[data-preset="${id}"]`);
    await fr();
  };
  const none = async () => {
    await page.click("button[data-fill-none]");
    await fr();
  };
  const drag = async (a, b) => {
    await mouse.move(a[0], a[1]);
    await mouse.down();
    await mouse.move(b[0], b[1], { steps: 6 });
    await mouse.up();
    await fr();
  };
  const width = (s) =>
    page.evaluate(([s, font]) => {
      const c = document.createElement("canvas").getContext("2d");
      c.font = font;
      return c.measureText(s).width;
    }, [s, FONT]);
  /** Segments de la zone de saisie : [texte, "rouge" | "bleu" | ""] (couleur du segment lue en `style.color`), voisins
   *  de même couleur fusionnés ; un segment sans couleur du pot vaut "" quelle que soit la couleur héritée. */
  const segs = async () => {
    const raw = await page.$eval("#texte-edition", (z) =>
      [...z.children].filter((e) => e.tagName === "SPAN").map((e) => ({ t: e.textContent ?? "", c: e.style.color })),
    );
    const out = [];
    for (const s of raw) {
      const c = s.c === RED_CSS ? "rouge" : s.c === BLUE_CSS ? "bleu" : "";
      const l = out[out.length - 1];
      if (l && l[1] === c) l[0] += s.t;
      else out.push([s.t, c]);
    }
    return out;
  };
  const openText = async (w) => {
    await page.click(item("text"));
    await fr();
    await clickWorld(w);
    await page.waitForSelector("#texte-edition", { state: "visible", timeout: 5000 });
    await fr();
  };
  const openCell = async (w, tag) => {
    await page.click(item("table"));
    await fr();
    await clickWorld(w);
    await waitAttr("data-table", tag);
    await page.waitForSelector("#texte-edition", { state: "visible", timeout: 5000 });
    await fr();
  };
  const show = (v) => JSON.stringify(v);
  const saveTo = async (name) => {
    const dl = page.waitForEvent("download");
    await page.keyboard.press("Control+s");
    const file = join(tmp, name);
    await (await dl).saveAs(file);
    return file;
  };
  const openFile = async (file) => {
    const before = await page.locator(TAB).count();
    const chooser = page.waitForEvent("filechooser");
    await page.keyboard.press("Control+o");
    await (await chooser).setFiles(file);
    await page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, before + 1, { timeout: 15000 });
    await fr();
  };

  const centre = world(CENTRE);
  const nearEdge = world(NEAR_EDGE);
  const strokeMid = world([310, 380]);
  const voidW = world(VOID);
  const dropW = world(DROP_AT);
  const textW = world(TEXT_AT);
  const tableW = world(TABLE_AT);

  // S1 : rectangle vide, Pot puis Jaune, clic au centre ; Annuler, Rétablir.
  await page.click(item("rect"));
  await fr();
  await drag(RECT[0], RECT[1]);
  await waitAttr("data-elements", "1");
  await pot();
  const box = await stageBox(page);
  check(box.height >= 640, `S5 : Pot actif, la scène garde ${Math.round(box.height)} px de haut (D19)`);
  check(
    (await page.locator("button[data-preset]").count()) === 5 && (await page.locator("button[data-fill-none]").count()) === 1,
    "S1 : Pot actif : cinq couleurs et « Aucune » dans la rangée (D16, D17)",
  );
  await pick("jaune");
  check((await near(centre, YELLOW)) === 0, "S1 : avant le clic, le rectangle est vide");
  await clickWorld(centre);
  check((await near(centre, YELLOW)) > 150, "S1 : clic au centre : le rectangle se remplit de jaune");
  await key("Control+z");
  check((await near(centre, YELLOW)) === 0, "S1 : Annuler : il redevient vide (une étape)");
  await key("Control+y");
  check((await near(centre, YELLOW)) > 150, "S1 : Rétablir : jaune");

  // S2 : contour à 3 px du bord, trait du stylo, « Aucune » au centre.
  await pick("rouge");
  check((await near(nearEdge, RED, 40, 6)) === 0, "S2 : avant le clic, le contour n'est pas rouge");
  await clickWorld(nearEdge);
  check((await near(nearEdge, RED, 40, 6)) > 10, "S2 : clic à 3 px du bord : le contour devient rouge");
  check((await near(centre, YELLOW)) > 150, "S2 : l'intérieur reste jaune");
  await page.click(item("pen"));
  await fr();
  await drag(STROKE[0], STROKE[1]);
  await waitAttr("data-elements", "2");
  await pot();
  check((await near(strokeMid, RED, 40, 6)) === 0, "S2 : le trait est noir avant le clic");
  await clickWorld(strokeMid);
  check((await near(strokeMid, RED, 40, 6)) > 10, "S2 : clic sur le trait : il devient rouge");
  await none();
  await clickWorld(centre);
  check((await near(centre, YELLOW)) === 0, "S2 : « Aucune » au centre : remplissage retiré");
  await key("Control+z");
  check((await near(centre, YELLOW)) > 150, "S2 : Annuler : le jaune revient (une étape)");

  // S4 (début) : fond de la page.
  await pick("bleu");
  await clickWorld(voidW);
  check((await near(voidW, BLUE)) > 150, "S4 : Pot Bleu, clic dans le vide : le fond de la page devient bleu");

  // S3 : mot d'un texte, gardé à l'édition.
  await page.click(item("text"));
  await fr();
  await clickWorld(textW);
  await page.waitForSelector("#texte-edition", { state: "visible", timeout: 5000 });
  await page.keyboard.type("Le chat noir");
  await key("Escape");
  await waitAttr("data-elements", "3");
  await pot();
  await pick("rouge");
  const chatX = (await width("Le ")) + (await width("chat")) / 2;
  await clickWorld([textW[0] + chatX, textW[1] + 22]);
  await openText([textW[0] + 10, textW[1] + 10]);
  const s3a = await segs();
  console.log(`segments : ${show(s3a)}`);
  check(show(s3a) === show([["Le ", ""], ["chat", "rouge"], [" noir", ""]]), "S3 : clic sur « chat » : seul ce mot devient rouge");
  await key("Home");
  for (let i = 0; i < 3; i++) await key("ArrowRight");
  await page.keyboard.type("gros ");
  await key("Escape");
  await openText([textW[0] + 10, textW[1] + 10]);
  const s3b = await segs();
  check(show(s3b) === show([["Le gros ", ""], ["chat", "rouge"], [" noir", ""]]), `S3 : « Le gros chat noir » : « chat » reste rouge (${show(s3b)})`);
  await key("Escape");

  // S3 : mot d'une cellule (une étape), cellule vide.
  await page.click(item("table"));
  await fr();
  await clickWorld(tableW);
  await page.waitForSelector(".rb-table-picker:not([hidden])", { timeout: 5000 });
  await page.click('button[aria-label="2 colonnes, 2 lignes"]');
  await waitAttr("data-table", "2x2@0,0");
  await page.keyboard.type("Lundi matin");
  await key("Escape");
  await waitAttr("data-elements", "4");
  await pot();
  await pick("rouge");
  const oneLine = (await width("Lundi matin")) <= 240 - 16;
  const matin = oneLine
    ? [tableW[0] + 8 + (await width("Lundi ")) + (await width("matin")) / 2, tableW[1] + 8 + 22]
    : [tableW[0] + 8 + (await width("matin")) / 2, tableW[1] + 8 + 45 + 22];
  await clickWorld(matin);
  await openCell([tableW[0] + 30, tableW[1] + 20], "2x2@0,0");
  const cell = await segs();
  check(show(cell) === show([["Lundi ", ""], ["matin", "rouge"]]), `S3 : clic sur « matin » : seul ce mot devient rouge (${show(cell)})`);
  await key("Escape");
  await key("Control+z");
  await openCell([tableW[0] + 30, tableW[1] + 20], "2x2@0,0");
  check((await segs()).every(([, c]) => c === ""), "S3 : Annuler : « matin » n'est plus rouge (une étape)");
  await key("Escape");
  await key("Control+y");
  await pot();
  const emptyCell = [tableW[0] + 240 + 120, tableW[1] + 32];
  await clickWorld(emptyCell);
  check((await near(emptyCell, RED)) > 150, "S3 : clic dans le blanc d'une cellule vide : la cellule se remplit");

  if (captures) {
    await fr();
    const path = join(ROOT, "docs", "essais", "c6a-pot.png");
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  }

  // S3 : clic sur l'espace entre « Le » et « gros » : tout le texte en bleu, « chat » compris.
  await pick("bleu");
  await clickWorld([textW[0] + (await width("Le")) + (await width(" ")) / 2, textW[1] + 22]);
  await openText([textW[0] + 10, textW[1] + 10]);
  const s3c = await segs();
  check(s3c.length === 1 && s3c[0][1] === "bleu", `S3 : clic sur l'espace : tout le texte devient bleu, « chat » compris (${show(s3c)})`);
  await key("Escape");

  // S4 : image → fond (C6b absent) ; « Aucune » dans le vide : blanc ; Annuler : la couleur revient.
  await dropFile(page, "#stage", "sombre.png", solidPng(200, 150, [20, 20, 20]), "image/png", DROP_AT);
  await waitAttr("data-elements", "5");
  await pot();
  await pick("vert");
  await clickWorld(dropW);
  check((await near(voidW, GREEN)) > 150, "S4 : clic sur l'image : le fond de la page change (vert)");
  check((await inkIn(page, await sq(dropW))) > 150, "S4 : l'image reste intacte (pixels sombres gardés)");
  await none();
  await clickWorld(voidW);
  check((await near(voidW, WHITE, 6)) > 150, "S4 : « Aucune » dans le vide : fond blanc");
  await key("Control+z");
  check((await near(voidW, GREEN)) > 150, "S4 : Annuler : le vert revient");

  // S5 : enregistrer, rouvrir ; fichier d'avant C6a.
  const file = await saveTo("c6a.roomboard");
  await openFile(file);
  check((await attr("data-elements")) === "5", "S5 : rouvert dans un nouvel onglet, cinq éléments");
  check((await near(centre, YELLOW)) > 150 && (await near(nearEdge, RED, 40, 6)) > 10, "S5 : rouvert : rectangle jaune au contour rouge");
  check((await near(voidW, GREEN)) > 150 && (await near(emptyCell, RED)) > 150, "S5 : rouvert : fond vert, cellule rouge");
  await openText([textW[0] + 10, textW[1] + 10]);
  const reText = await segs();
  check(reText.length === 1 && reText[0][1] === "bleu", `S5 : rouvert : texte bleu (${show(reText)})`);
  await key("Escape");
  await openFile(SOCLE);
  check((await near(voidW, WHITE, 6)) > 150, "S5 : socle-v1.roomboard (d'avant C6a) s'ouvre, fond blanc");
  await pot();
  await pick("bleu");
  await clickWorld(voidW);
  check((await near(voidW, BLUE)) > 150, "S5 : le pot colore le fond du fichier d'avant C6a");
  check((await stageBox(page)).height >= 640, "S5 : Pot actif, la scène garde au moins 640 px");
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
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c6a-"));
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

  Puis : `bash scripts/verifier.sh 2>&1 | tail -5` (construit `apps/web/dist` avec le vrai module) et
  `node scripts/essais/c6a-pot-navigateur.mjs 2>&1 | tail -20`. Si les tâches T5 à T7 sont fusionnées, l'essai peut
  déjà passer ; sinon l'échec attendu est `C6a pot : ÉCHEC — …` sur la première vérification. Noter la ligne d'échec
  vue (TDD).

- [ ] **Étape 4 : mise au point de l'essai.** Un `ÉCHEC` se lit sur sa ligne : si le défaut est dans l'application
  (pas dans l'essai), ne pas le contourner dans l'essai — le rapporter à l'orchestrateur avec la ligne, le fichier
  fautif présumé et la sortie ; si c'est l'essai (point mal placé, police non chargée, ordre d'attente), le corriger
  sans relâcher un seuil (`> 150`, `> 10`, `=== 0`, 640). Rejouer un échec de délai une fois (GC2).

- [ ] **Étape 5 : `verifier.sh` et son test.** `scripts/verifier.sh`, dans le bloc `if [ "$E2E" = 1 ]`, après
  `node scripts/essais/c7b-texte-riche-navigateur.mjs` : `  node scripts/essais/c6a-pot-navigateur.mjs` ;
  `scripts/tests/verifier-e2e.test.sh:13`, ajouter `c6a-pot-navigateur` à la fin de la liste `for s in …`.

- [ ] **Étape 6 : capture.** `node scripts/essais/c6a-pot-navigateur.mjs --captures 2>&1 | tail -3` (attendu :
  `capture : …/docs/essais/c6a-pot.png` puis `C6a pot : OK`) ; ouvrir l'image et la décrire (section « Preuve
  visuelle »).

- [ ] **Étape 7 (conditionnelle, D19) : repli de la rangée.** Seulement si la vérification « S5 : Pot actif, la scène
  garde … px » échoue sous 640 : dans `apps/web/src/ui/Toolbar.tsx`, `PresetRow`, remplacer pour le pot seul le libellé
  visible par le `title` et un `aria-label` :

```tsx
          <button type="button" class="rb-preset" data-preset={p.id} title={p.label} aria-label={p.label} onClick={() => press(p.id)}>
            <span class="rb-swatch" aria-hidden="true" style={{ "background-color": p.color ?? "transparent" }} />
            <Show when={!pot()}>{p.label}</Show>
          </button>
```

  relancer `pnpm --filter @roomboard/web exec vitest run src/ui --reporter=verbose 2>&1 | grep -E "×|Tests " | tail -5`
  (le test « libellé Rouge » du stylo reste vert ; le test du pot qui lit `textContent` de « Aucune » aussi), puis la
  commande bornée. Sinon, ne pas toucher `Toolbar.tsx` et écrire dans le rapport `D19 : scène à <N> px, repli non posé`.

- [ ] **Étape 8 (conditionnelle, D25) : un objet groupé se colore seul.** `grep -n "Group {" crates/roomboard-core/src/commands.rs`.
  Rien : écrire dans le rapport `D25 : Command::Group absent de la branche (C3 non fusionné) ; test hérité par C3` et
  passer. Sinon : lire la variante (`grep -n "Group {" -A 6 crates/roomboard-core/src/commands.rs`), ajouter à la fin
  de `crates/roomboard-core/tests/pot.rs` le test ci-dessous en adaptant les champs de `Command::Group` à leur
  définition, le voir vert par `cargo test -p roomboard-core --test pot 2>&1 | grep -E "grouped|test result"` :

```rust
#[test]
fn grouped_shape_fills_alone() {
    // D4, D25 : le pot vise l'élément touché, jamais son groupe.
    let (mut d, p) = setup();
    let a = shape(&mut d, &p, ShapeKind::Rect, [100.0, 100.0, 300.0, 200.0]);
    let b = shape(&mut d, &p, ShapeKind::Rect, [400.0, 100.0, 600.0, 200.0]);
    d.apply(Command::Group { ids: vec![a.clone(), b.clone()] }).expect("groupe");
    d.apply(fill(&p, inside(&a), Some("#facc15"))).expect("pot");
    assert_eq!(fill_of(&d, &a).as_deref(), Some("#facc15"));
    assert_eq!(fill_of(&d, &b), None);
}
```

- [ ] **Étape 9 : preuve.** La commande bornée, en entier.

- [ ] **Étape 10 : commit.** `scripts/essais/c6a-pot-navigateur.mjs`, `scripts/essais/commun.mjs`,
  `scripts/essais/c9-grille-navigateur.mjs`, `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`,
  `docs/essais/c6a-pot.png` (et les fichiers conditionnels touchés) un par un (GC6), message
  `test(e2e): C6a paint bucket browser run, capture and colour-aware inkIn`.
