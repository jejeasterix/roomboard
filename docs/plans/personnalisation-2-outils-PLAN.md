# Plan d'exécution — personnalisation-2-outils (OG12), lot 1 : flèche et ligne

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**Goal :** la flèche et la ligne de RoomBoard se comportent comme celles d'Excalidraw, au doigt d'abord puis à la souris
et au clavier : points intérieurs et courbe, types Droite, Courbe, Coudée, trois pointes neuves, liaison des extrémités aux
objets (suivi, rupture, copie), « Modifier les points », objet relié créé en un geste (carte mentale), le tout piloté par la
CLI, avec un essai navigateur et la fiche `docs/essais/outils-excalidraw.md`.

**Architecture :** le cœur Rust porte le modèle (DA-1 : points intérieurs facultatifs, extrémités (0, 0) et (w, h) ; DA-2 :
liaison écrite sur la flèche seule, lue avec tolérance), la géométrie (`linear.rs`, DA-5), le suivi dans la transaction de la
commande qui bouge l'objet, la route coudée (DA-3) et deux commandes neuves, `SetLinePoints` et `AddLinked` (DA-4). Le faux
cœur TS en est le miroir (route coudée exclue). La page ne compose jamais deux commandes pour un geste : outils Formes et
Sélection, éditeur « Modifier les points », panneau, calque d'édition.

**Tech Stack :** Rust (yrs 0.28, wasm-bindgen), TypeScript (Solid, Vitest), Canvas 2D, roughjs, Playwright (essais).

**Spec :** `docs/plans/personnalisation-2-outils-cadrage.md` (commit `2c8198a9`) ; demande : `~/.cache/tmp/og12-notes/brief.md`.

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Cœur : modèle des lignes, géométrie, `SetLinePoints`, style | — | crates/roomboard-core/src/{linear.rs (neuf), lib.rs, shape.rs, element.rs, style.rs, commands.rs, document.rs, query.rs, fill.rs, zone.rs, copy.rs, format/mod.rs}, crates/roomboard-core/tests/{fleches.rs (neuf), compat_c3.rs, compat_socle.rs, look.rs, order.rs, pot.rs, pot_image.rs, scenarios.rs}, crates/roomboard-wasm/src/lib.rs | isolé | implementeur-tdd | `cargo test -p roomboard-core --test fleches` ≥ 7 tests dont `old_file_keeps_bytes` ; `cargo test -p roomboard-core` vert | S2, S5, S6 | #tache-t1 |
| T2 | Contrat TS : types, aspect, miroir géométrique, aides des outils | — | apps/web/src/core/{api.ts, look.ts, look.test.ts, shapes.ts, shapes.test.ts, wasm-core.ts, fake-core.ts}, apps/web/src/engine/{item-style.ts, item-style.test.ts}, apps/web/src/engine/render/{overlay.ts, overlay.test.ts}, apps/web/src/engine/tools/{tool.ts, line-points.ts (neuf), line-points.test.ts (neuf)}, apps/cli/src/ops.ts | isolé | implementeur-tdd | vitest `shapes.test.ts` ≥ 1 test `bandPolygon` ; `line-points.test.ts` ≥ 1 test `bindEnd` ; `tsc` web et cli verts | S1 à S6 | #tache-t2 |
| T3 | Entrées, raccourcis, icônes | — | apps/web/src/engine/input/{router.ts, router.test.ts, keys.ts, keys.test.ts, double-tap.ts (neuf), double-tap.test.ts (neuf)}, apps/web/src/ui/{shortcuts.ts, shortcuts.test.ts, icons.ts, icons.test.ts} | isolé | implementeur-tdd | vitest `router.test.ts` ≥ 1 test `doigt tardif` ; `keys.test.ts` ≥ 1 test `linkedKey` | S2, S4 | #tache-t3 |
| T4 | Cœur : liaisons, suivi, rupture, copie, `bind_target`, coudée, `AddLinked` | T1 | crates/roomboard-core/src/{linear.rs, commands.rs, copy.rs, query.rs, style.rs}, crates/roomboard-core/tests/fleches.rs | isolé | concepteur-critique | `cargo test -p roomboard-core --test fleches` ≥ 17 tests dont `moving_target_moves_bound_end_in_one_step` ; Wasm ≤ 1 572 864 o | S1, S3, S4, S5 | #tache-t4 |
| T5 | Faux cœur : miroir des lignes et des liaisons | T2 | apps/web/src/core/{fake-core.ts, fake-lines.test.ts (neuf)} | isolé | concepteur-critique | vitest `fake-lines.test.ts` ≥ 10 tests dont `suivi en une étape` ; `fake-core.test.ts` vert | S1, S3, S4 | #tache-t5 |
| T6 | Rendu et export | T2 | apps/web/src/engine/render/{canvas2d.ts, canvas2d.test.ts, sketch.ts, sketch.test.ts}, apps/web/src/app/{board-io.ts, board-io.test.ts} | isolé | implementeur-tdd | vitest `sketch.test.ts` ≥ 1 test `point intérieur déplacé` ; `board-io.test.ts` ≥ 1 test `polyligne` | S2, S6 | #tache-t6 |
| T7 | Panneau d'options : Type de flèche, Angles de la ligne, pointes, Liaison | T2, T3 | apps/web/src/ui/{tool-options.ts, tool-options.test.ts, OptionsPanel.tsx, OptionsPanel.test.tsx}, apps/web/src/engine/{engine.ts, engine.test.ts} | isolé | implementeur-tdd | vitest `tool-options.test.ts` ≥ 1 test `Type de flèche` ; `OptionsPanel.test.tsx` ≥ 1 test `Liaison des flèches` | S2, S4, S6 | #tache-t7 |
| T8 | Outils Formes et Sélection : liaison, poignées d'extrémité, « + » | T2, T3 | apps/web/src/engine/tools/{shape.ts, shape.test.ts, select.ts, select.test.ts} | isolé | implementeur-tdd | vitest `shape.test.ts` ≥ 1 test `liaison à la création` ; `select.test.ts` ≥ 1 test `sans cadre à 8 poignées` | S1, S3, S4, S6 | #tache-t8 |
| T9 | « Modifier les points » | T2, T3 | apps/web/src/engine/tools/{line-edit.ts (neuf), line-edit.test.ts (neuf)} | isolé | implementeur-tdd | vitest `line-edit.test.ts` ≥ 8 tests dont `une SetLinePoints au relâché` | S2, S4, S6 | #tache-t9 |
| T10 | Pont Wasm, contrat commun, essai CLI | T1, T4, T5 | crates/roomboard-wasm/src/lib.rs, apps/web/src/core/{wasm-core.ts, wasm-core.contract.test.ts}, scripts/essais/cli-essai.mjs | isolé | implementeur-tdd | vitest contrat ≥ 1 test `contrat OG12` sur les deux fabriques ; `node scripts/essais/cli-essai.mjs` affiche `CLI : OK` | S5, S1 | #tache-t10 |
| T11 | Moteur : branchement des outils, touches, survol, doigt tardif | T3, T7, T8, T9 | apps/web/src/engine/{engine.ts, engine.test.ts}, apps/web/src/app/{board-session.ts, stage-tags.ts, stage-tags.test.ts}, apps/web/src/ui/{OptionsPanel.tsx, OptionsPanel.test.tsx} | isolé | concepteur-critique | vitest `engine.test.ts` ≥ 1 test `Ctrl+Entrée` ; `stage-tags.test.ts` ≥ 1 test `lineEdit` | S1, S2, S3, S4, S6 | #tache-t11 |
| T12 | Essai navigateur, fiche, licences, captures | T6, T10, T11 | scripts/essais/{gestes.mjs (neuf), outils-excalidraw-navigateur.mjs (neuf)}, scripts/verifier.sh, docs/essais/outils-excalidraw.md (neuf), THIRD_PARTY_NOTICES.md, docs/design/captures/personnalisation-2-outils/ (neuf) | isolé | implementeur-tdd | `node scripts/essais/outils-excalidraw-navigateur.mjs` affiche `outils-excalidraw : OK` ; `scripts/verifier.sh --e2e` affiche `verifier.sh : OK` | S1, S2, S3, S4, S6 | #tache-t12 |

## Vagues (parallélisme)

Les fichiers touchés de deux tâches d'une même vague ne se recoupent jamais.

| vague | tâches en parallèle | durée visée | sert |
|---|---|---|---|
| V1 | T1 ∥ T2 ∥ T3 | 35-40 min | modèle Rust, contrat TS, entrées |
| V2 | T4 ∥ T5 ∥ T6 ∥ T7 ∥ T8 ∥ T9 | 35-40 min | liaisons du cœur, faux cœur, rendu, panneau, outils, éditeur |
| V3 | T10 ∥ T11 | 30-40 min | pont et CLI, branchement du moteur |
| V4 | T12 | 40 min | essai navigateur, fiche, suite complète |

Une seule compilation Rust lourde à la fois par vague (T1 en V1, T4 en V2, T10 en V3) : la VM tient.

**Ordre de sortie si le temps manque** (cadrage § 7, sans rien retirer du périmètre) : (1) route coudée et type Coudée
(T4 : `elbow_route`, `reroute` ; T7 : choix Coudée masqué ; `AddLinked` pose alors une flèche droite liée) ; (2) poignées
« + » au doigt (T8 : `links`), Alt+Maj+flèche restant ; (3) les trois pointes neuves (T1, T6, T7). Chaque retrait s'écrit
au rapport final et dans la fiche.

## Carte des fichiers

| fichier | rôle | tâches |
|---|---|---|
| `crates/roomboard-core/src/linear.rs` (neuf) | chemin, courbe, boîte d'accroche, ancrage, écritures d'une ligne (T1) ; suivi, route coudée, `AddLinked` (T4) | T1, T4 |
| `crates/roomboard-core/src/shape.rs` | `ShapeGeom`, `shape_polygon(&ShapeGeom, width)`, polyligne épaissie | T1 |
| `crates/roomboard-core/src/element.rs` | `Look.elbowed`, pointes neuves, `ShapeView` (points, liaisons) | T1 |
| `crates/roomboard-core/src/style.rs` | `roundness` sur segment, patch `elbowed` (T1) ; reroutage (T4) | T1, T4 |
| `crates/roomboard-core/src/commands.rs` | `ShapeFields`, `AddShape.line`, `SetLinePoints` (T1) ; suivi dans `Transform`, `SetText`, `FormatText`, `AddLinked` (T4) | T1, T4 |
| `crates/roomboard-core/src/copy.rs` | `copy_prelims` + renumérotation des liaisons | T4 (T1 : une ligne de test) |
| `crates/roomboard-core/src/query.rs` | appel de `shape_polygon` (T1) ; `bind_target` (T4) | T1, T4 |
| `crates/roomboard-core/tests/fleches.rs` (neuf) | essais du modèle (T1), des liaisons (T4) | T1, T4 |
| `crates/roomboard-wasm/src/lib.rs` | compilation seule (T1) ; pont complet (T10) | T1, T10 |
| `apps/web/src/core/api.ts`, `look.ts`, `shapes.ts` | contrat TS et miroir géométrique | T2 |
| `apps/web/src/core/fake-core.ts` | bouchons (T2) ; miroir complet (T5) | T2, T5 |
| `apps/web/src/core/wasm-core.ts` | bouchons et lecture des vues (T2) ; appels du pont (T10) | T2, T10 |
| `apps/web/src/engine/render/overlay.ts` | types du calque (poignées, accroche, « + ») | T2 |
| `apps/web/src/engine/tools/tool.ts` | `ToolContext` (`ctrl`, `bindingEnabled`, `pointerType`, `editPoints`), `GestureTool.hover` | T2 |
| `apps/web/src/engine/tools/line-points.ts` (neuf) | aides pures partagées par Formes, Sélection et l'éditeur | T2 |
| `apps/web/src/engine/item-style.ts` | `arrowType`, `arrowBinding` | T2 |
| `apps/web/src/engine/input/*` | doigt tardif, touches, double toucher | T3 |
| `apps/web/src/ui/icons.ts`, `shortcuts.ts` | icônes, raccourcis | T3 |
| `apps/web/src/engine/render/canvas2d.ts`, `sketch.ts`, `apps/web/src/app/board-io.ts` | rendu, export | T6 |
| `apps/web/src/ui/tool-options.ts`, `OptionsPanel.tsx` | sections (T7), boutons d'action (T11) | T7, T11 |
| `apps/web/src/engine/engine.ts` | `patchOf` (T7) ; branchement (T11) | T7, T11 |
| `apps/web/src/engine/tools/shape.ts`, `select.ts` | liaison à la création, poignées | T8 |
| `apps/web/src/engine/tools/line-edit.ts` (neuf) | « Modifier les points » | T9 |
| `apps/web/src/app/board-session.ts`, `stage-tags.ts` | doigt tardif branché, survol, attributs de `#stage` | T11 |
| `scripts/essais/*`, `scripts/verifier.sh`, `docs/essais/outils-excalidraw.md`, `THIRD_PARTY_NOTICES.md` | essai, fiche, licences | T10 (cli-essai), T12 |

Hors carte, voulu : `apps/web/src/ui/rb.css` (supposé touché au cadrage) n'est pas touché : poignées de points, surlignage
et poignées « + » sont peints sur le canevas (T6), pas dans le DOM.

## Global Constraints

Chaque ligne est recopiée dans la section des tâches qu'elle concerne (marque entre crochets).

- **GC1 VM partagée** [toutes] : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; `export CARGO_TARGET_DIR=<worktree
  de la tâche>/target` ; toute commande lourde sous `nice -n 10` ; `cargo … -j 4` ; suites complètes par
  `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`. Aucun `tauri build`.
- **GC2 Tailles Wasm** [T1, T4, T10, T12] : module principal ≤ 1 572 864 o, formats ≤ 3 145 728 o, plafonds intouchables. La CLI
  ne grossit pas les modules.
- **GC3 Tests** [toutes] : aucun test désactivé, sauté ou affaibli ; aucun seuil ni délai relevé ; essais existants
  (`data-item`) verts sans réécriture de fond.
- **GC4 Commits** [toutes] : fichiers ajoutés un par un (jamais `git add -A`, `.`, `commit -a`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais terminés par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Forme : `git -c user.name=jejeasterix -c
  user.email=jejeasterix@users.noreply.github.com commit -m "<message>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
- **GC5 CLI** [T1, T2, T4, T10] : tout ce qui touche le cœur se pilote par la CLI (`apps/cli`, `COMMAND_TYPES`, tests,
  `scripts/essais/cli-essai.mjs`).
- **GC6 Excalidraw** [T1, T2, T4, T5, T12] : code repris d'Excalidraw : mention MIT en tête du fichier et ligne dans
  `THIRD_PARTY_NOTICES.md` (T12 écrit les lignes ; chaque tâche écrit la mention en tête de ses fichiers).
- **GC7 Tactile** [T3, T6, T7, T8, T9, T11, T12] : tactile d'abord (cibles ≥ 44 px, appui long, événements de pointeur), clavier
  ensuite ; netteté des icônes (§ 10 de `docs/plans/design-cadrage.md`, traits fins Lucide, trait 1,5, `ICON_VIEWBOX`).
- **GC8 Format** [T1, T4, T5, T10] : `schema` 1 et `formatVersion` 1 inchangés ; tout champ neuf est facultatif ; un neutre
  n'est jamais écrit ; un fichier de `main` se relit et se réenregistre octet pour octet (n° 14).
- **GC9 Rust** [T1, T4, T10] : `cargo fmt --all --check` et `cargo clippy --workspace --all-targets -j 4 -- -D warnings` verts
  avant le commit.
- **GC10 Worktree neuf** [T2, T3, T5 à T12] : `pnpm install --frozen-lockfile` à la racine avant le premier test.

## Review Focus

1. **Fichier de `main` rouvert puis enregistré sans changement** : mêmes octets, aucune clé neuve (`points`, `startBound`,
   `elbowed`) — cadrage n° 14, S2. Test : `old_file_keeps_bytes` (T1).
2. **Objet lié supprimé puis annulation** : la flèche se lit libre, garde sa forme, puis se lit liée sans écriture — n° 9.
   Test : `deleted_target_reads_free_and_undo_restores` (T4), `cible supprimée lue libre` (T5).
3. **Champs illisibles dans un fichier** (`points` impair ou non numérique, `startFixed` d'un seul nombre, `elbowed: "oui"`) :
   lus neutres, gardés tels quels (U3) — n° 1, 4. Test : `unreadable_line_fields_read_neutral_and_kept` (T1).
4. **Toucher une flèche liée pour la sélectionner** (glisser de moins de 10 px) : aucune liaison rompue — n° 8. Test :
   `flèche liée : un toucher de moins de 10 px ne la déplace pas` (T8).
5. **Paume ou doigt posé pendant un geste au stylet ou à la souris** : ne devient pas Maj ; pincement sous 150 ms inchangé —
   n° 29, effet de bord 1. Test : `doigt tardif pendant un geste au stylet : ignoré` (T3).

---

## Tâches

<a id="tache-t1"></a>
### Tâche T1 — Cœur : modèle des lignes, géométrie, `SetLinePoints`, style

**Objectif.** Le cœur lit et écrit les points intérieurs d'une ligne ou d'une flèche, leur courbe, leurs liaisons et le
type coudé ; la collision et les bornes suivent la polyligne ; `SetLinePoints` réécrit la géométrie en une étape ;
`SetStyle` admet `roundness` sur ligne et flèche, `elbowed` sur flèche et trois pointes neuves. Rien n'est encore suivi
quand un objet bouge (T4).

**Scénarios servis.** S2 (3 points, Courbe, enregistrer et rouvrir), S5 (`SetLinePoints` refusé avec un point), S6 (ligne
liée, courbe). Effets de bord : 5 (mur courbe, par `shape_polygon`), 4 (pointes neuves admises).

**Fichiers.**
- Créer : `crates/roomboard-core/src/linear.rs`, `crates/roomboard-core/tests/fleches.rs`.
- Modifier : `crates/roomboard-core/src/lib.rs` (`pub mod linear;`), `shape.rs` (`ShapeGeom`, `shape_polygon`,
  `band_polygon`, tests du fichier mis à la signature), `element.rs:224-229` (`ShapeView`), `element.rs:367-560` (`Look`,
  `ARROWHEADS`, `LOOK_KEYS`, `look_fields`, `read_look`), `style.rs` (patch), `commands.rs:34-300` (`Command`),
  `commands.rs:455-475` (`ShapeFields`, `read_shape`), `commands.rs:718-990` (`apply`, `cmd_add_shape`), `document.rs:383-395`
  (vue), `query.rs:250`, `fill.rs:221`, `zone.rs:852-862` (appelants), et chaque construction `Command::AddShape { … }` qui
  ne compile plus (`copy.rs`, `document.rs`, `format/mod.rs`, `query.rs`, `zone.rs`, `commands.rs`, `tests/compat_c3.rs`,
  `tests/compat_socle.rs`, `tests/look.rs`, `tests/order.rs`, `tests/pot.rs`, `tests/pot_image.rs`, `tests/scenarios.rs`,
  `crates/roomboard-wasm/src/lib.rs`) : une ligne `line: LineInit::default(),` ajoutée, rien d'autre.

**Interfaces.**
- Consomme : `element::{apply_transform, invert, out_f64, out_string, out_transform, transform_to_any, finite_positive,
  fits_f32, read_image, Transform}`, `commands::{read_shape, read_text}`, `table::{read_raw, TABLE_KIND}`,
  `media::{read_media, MEDIA_KIND}`, `model3d::{read_model3d, MODEL3D_KIND}`, `fill::{differs, set_or_remove}`.
- Réutilise : `crates/roomboard-core/src/shape.rs:81` `shape_polygon` — étendu en `shape_polygon(s: &ShapeGeom<'_>, width:
  f32) -> Vec<f32>` avec `ShapeGeom { kind, w, h, path: &[f64], curve: bool }` ; les appelants `query.rs:250`, `fill.rs:221`,
  `zone.rs:862` et `shape_ring` passent le chemin lu.
- Réutilise : `shape.rs:52` `arrow_wings(w, h, width)` — appelé sur le dernier segment de la polyligne.
- Réutilise : `element.rs:437` `LOOK_KEYS`, `:478` `look_fields`, `:517` `read_look`, `:451` `sanitized` — une clé de plus
  (`elbowed`), domaine des pointes étendu.
- Réutilise : `style.rs:181` `cmd_set_style` — `StylePatch.elbowed: Option<Option<bool>>`, `roundness` admis sur segment.
- Produit (lu par T4, T10) :
  - `pub mod linear` : `pub const MAX_INNER_POINTS: usize = 512`, `CURVE_STEPS: usize = 16`, `CURVE_TENSION: f64 = 0.5`,
    `BIND_RATIO_MAX: f64 = 10.0`, `BASE_BINDING_GAP: f64 = 5.0`, `ANCHOR_RATIOS: [[f64; 2]; 4]` ;
    `pub struct BindInput { pub id: String, pub fx: f64, pub fy: f64 }` ;
    `pub struct LineInit { pub points: Vec<f64>, pub start: Option<BindInput>, pub end: Option<BindInput> }` ;
    `pub enum End { Start, End }` ; `pub fn path_of(w, h, inner: &[f64]) -> Vec<(f64, f64)>` ;
    `pub(crate) fn path(s: &ShapeFields) -> Vec<(f64, f64)>` ; `pub fn catmull_rom(&[(f64, f64)]) -> Vec<[(f64, f64); 4]>` ;
    `pub fn flatten(&[(f64, f64)], curve: bool) -> Vec<(f64, f64)>` ; `pub struct BindBox { pub id, pub t: Transform,
    pub w, pub h, pub ellipse: bool, pub gap: f64 }` ; `pub(crate) fn bind_box<T: ReadTxn>(txn, e) -> Option<BindBox>` ;
    `pub fn bind_gap(width: f64) -> f64` ; `pub fn on_outline(b: &BindBox, q: (f64, f64)) -> bool` ;
    `pub fn anchor(b: &BindBox, fixed: [f64; 2]) -> (f64, f64)` ; `pub(crate) fn read_inner`, `read_binding`, `nums`,
    `nums_in` ; `pub(crate) fn line_writes(t: &Transform, world: &[(f64, f64)], start: Option<&BindInput>, end:
    Option<&BindInput>) -> Result<Vec<(&'static str, Option<In>)>, CommandError>` ; `impl Document { pub(crate) fn
    checked_binding<T: ReadTxn>(&self, txn: &T, b: &BindInput) -> Result<(BindInput, BindBox), CommandError> }`.
  - `Command::AddShape { …, look: Look, line: LineInit }` ; `Command::SetLinePoints { id: String, points: Vec<f64>,
    start: Option<BindInput>, end: Option<BindInput> }` (points en monde, tous, ≥ 2).
  - `ShapeFields { kind, w, h, style, fill, points: Vec<f64>, curve: bool, elbowed: bool, start: Option<BindInput>, end:
    Option<BindInput> }` + `fn geom(&self) -> ShapeGeom<'_>`.
  - `Look.elbowed: Option<bool>` (vue JSON `elbowed: true`) ; `ARROWHEADS: [&str; 7]` ; `StylePatch.elbowed`.
  - `ShapeView { shape, w, h, fill, points: Option<Vec<f64>>, start: Option<BindingView>, end: Option<BindingView> }`,
    `pub struct BindingView { pub id: String, pub fx: f64, pub fy: f64 }` (JSON : `points`, `start`, `end` omis s'ils sont
    absents ; liaison vers un id absent du document : omise).
- Ordre des refus (le faux cœur T5 le reproduit) : `AddShape` : coins non finis `BadShape` → géométrie hors f32 `BadShape` →
  épaisseur `BadWidth` → `line` non vide sur rectangle ou ellipse `BadShape` → points intérieurs impairs, non finis ou plus
  de 512 `BadPoints` → page inconnue → liaison (cible inconnue, non accrochable, rapport non fini) `BadShape`.
  `SetLinePoints` : points impairs, moins de 2, plus de 514, non finis ou hors f32 `BadPoints` → id inconnu
  `UnknownElement` → cible ni ligne ni flèche `BadShape` → liaison `BadShape`.

**Test et commandes bornées** (dans `<wt>`, le worktree de la tâche) :
```bash
cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && export CARGO_TARGET_DIR=$PWD/target
nice -n 10 cargo test -p roomboard-core -j 4 --test fleches 2>&1 | tail -5     # « test result: ok. N passed », N ≥ 7, old_file_keeps_bytes nommé
nice -n 10 cargo test -p roomboard-core -j 4 --lib shape:: 2>&1 | tail -5      # polygon_of_polyline_covers_inner_point présent
nice -n 10 cargo test -p roomboard-core -j 4 --lib linear:: 2>&1 | tail -5     # unreadable_line_fields_read_neutral_and_kept présent
node ~/.claude/scripts/vm/suite-vm.cjs -- bash -c 'nice -n 10 cargo test --workspace -j 4 2>&1 | grep -E "^test result|FAILED|error\[" | tail -40'
```
Tests à garder verts (carte d'impact 3.1) : `tests/look.rs`, `tests/pot.rs`, `tests/compat_*.rs`, `tests/scenarios.rs` — aucun
« FAILED » dans la dernière commande.

**Contraintes (recopiées).**
- GC1 : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`, `export CARGO_TARGET_DIR=<wt>/target`, `nice -n 10`, `cargo … -j 4`,
  suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; aucun `tauri build`.
- GC2 : module principal ≤ 1 572 864 o, formats ≤ 3 145 728 o ; mesure en fin de tâche (étape 12).
- GC3 : aucun test désactivé, sauté ou affaibli ; aucun seuil ni délai relevé ; les tests existants ne gagnent que la ligne
  `line: LineInit::default(),` (et l'import), rien d'autre.
- GC4 : `git add` fichier par fichier, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC5 : la CLI suivra par T2 (`COMMAND_TYPES`) et T10 (pont, essai) ; rien ici ne doit les empêcher (vue JSON stable).
- GC6 : `linear.rs` porte la mention MIT d'Excalidraw en tête (étape 3).
- GC8 : `schema` 1 et `formatVersion` 1 inchangés ; champs neufs facultatifs ; neutre jamais écrit ; octets d'un fichier de
  `main` gardés.
- GC9 : `cargo fmt --all --check` et `cargo clippy --workspace --all-targets -j 4 -- -D warnings` verts.

**Interdits.** Ne pas toucher au suivi ni à la rupture (T4), ni à `copy.rs` hors la ligne de test, ni au pont au-delà de
la compilation (T10). Ne pas renommer `shape_ring`. Ne pas écrire de clé neutre (`points` vide, `elbowed: false`).

**Terminé quand.** Les commandes bornées montrent les tests nommés verts, clippy et fmt verts, taille Wasm relevée au rapport.
Le rapport porte : `Réutilisation : appelé shape_polygon, arrow_wings, LOOK_KEYS/look_fields/read_look, cmd_set_style` (ou
`Réutilisation : écart — <pourquoi>`).

**Étapes.**

- [ ] **1. Écrire les tests de `shape.rs`** (fin du module `tests`, après `polygon_of_ellipse_follows_the_ellipse`) :
```rust
    /// OG12 (DA-1) : un chemin vide et sans courbe rend le polygone du socle, à l'identique.
    #[test]
    fn polygon_of_two_point_path_is_unchanged() {
        let plain = shape_polygon(&ShapeGeom::plain(ShapeKind::Arrow, 100.0, 0.0), 4.0);
        let empty = shape_polygon(
            &ShapeGeom { kind: ShapeKind::Arrow, w: 100.0, h: 0.0, path: &[], curve: true },
            4.0,
        );
        assert_eq!(plain, empty, "deux points : la courbe reste droite");
    }

    /// OG12 (n° 1, 3) : la polyligne (0,0)-(50,-80)-(100,0) touche son point intérieur, pas la corde.
    #[test]
    fn polygon_of_polyline_covers_inner_point() {
        let inner = [50.0, -80.0];
        let p = shape_polygon(
            &ShapeGeom { kind: ShapeKind::Line, w: 100.0, h: 0.0, path: &inner, curve: false },
            4.0,
        );
        assert!(crate::ink::hit::hit_outline(&p, 50.0, -79.0, 1.0));
        assert!(!crate::ink::hit::hit_outline(&p, 50.0, 0.0, 1.0), "milieu de la corde");
        let c = shape_polygon(
            &ShapeGeom { kind: ShapeKind::Arrow, w: 100.0, h: 0.0, path: &inner, curve: true },
            4.0,
        );
        assert!(crate::ink::hit::hit_outline(&c, 50.0, -79.0, 1.0), "la courbe passe par le point");
        let v = vertices(&c);
        let tip = v.iter().any(|(x, y)| (x - 100.0).abs() < 3.0 && y.abs() < 3.0);
        assert!(tip, "bout prolongé près de (100, 0) : {v:?}");
    }
```
  Dans les tests existants du fichier, chaque `shape_polygon(K, w, h, width)` devient
  `shape_polygon(&ShapeGeom::plain(K, w, h), width)` (mêmes valeurs, mêmes assertions).

- [ ] **2. Écrire `crates/roomboard-core/tests/fleches.rs`** (partie T1 ; T4 ajoutera la sienne à la suite) :
```rust
//! OG12 (lot 1) : flèche et ligne. T1 : points intérieurs, courbe, liaisons écrites, `SetLinePoints`, style ; T4 : suivi,
//! rupture, copie, route coudée, `AddLinked`. Cadrage : docs/plans/personnalisation-2-outils-cadrage.md.
use roomboard_core::commands::{Command, CommandError};
use roomboard_core::document::Document;
use roomboard_core::element::{Look, StrokeStyle};
use roomboard_core::format::{load, save, SaveMeta};
use roomboard_core::linear::{BindInput, LineInit};
use roomboard_core::shape::ShapeKind;
use roomboard_core::style::StylePatch;

fn meta() -> SaveMeta {
    SaveMeta { app_version: "0.1.0".into(), now: "2026-11-27T00:00:00Z".into(), created: None }
}
fn pen() -> StrokeStyle {
    StrokeStyle { color: "#000000".into(), width: 4.0 }
}
fn page(d: &Document) -> String {
    d.page_ids()[0].clone()
}
fn shape(d: &mut Document, kind: ShapeKind, c: [f64; 4], line: LineInit) -> Result<String, CommandError> {
    let page = page(d);
    let ch = d.apply(Command::AddShape {
        page,
        shape: kind,
        x0: c[0],
        y0: c[1],
        x1: c[2],
        y1: c[3],
        style: pen(),
        fill: None,
        look: Look::default(),
        line,
    })?;
    Ok(ch.ids[0].clone())
}
fn rect(d: &mut Document, x: f64, y: f64) -> String {
    shape(d, ShapeKind::Rect, [x, y, x + 100.0, y + 50.0], LineInit::default()).expect("rectangle")
}
fn bind(id: &str, fx: f64, fy: f64) -> Option<BindInput> {
    Some(BindInput { id: id.into(), fx, fy })
}
/// Vue JSON d'un élément (ce que voient la page et la CLI).
fn view(d: &Document, id: &str) -> serde_json::Value {
    serde_json::to_value(d.element(id).expect("élément")).expect("json")
}
/// Points monde d'une ligne : départ = translation, puis points intérieurs et (w, h), transform appliquée.
fn world(d: &Document, id: &str) -> Vec<(f64, f64)> {
    let v = view(d, id);
    let t: Vec<f64> = v["transform"].as_array().unwrap().iter().map(|x| x.as_f64().unwrap()).collect();
    let s = &v["shape"];
    let mut local = vec![(0.0, 0.0)];
    if let Some(p) = s["points"].as_array() {
        let p: Vec<f64> = p.iter().map(|x| x.as_f64().unwrap()).collect();
        local.extend(p.chunks(2).map(|c| (c[0], c[1])));
    }
    local.push((s["w"].as_f64().unwrap(), s["h"].as_f64().unwrap()));
    local.iter().map(|(x, y)| (t[0] * x + t[2] * y + t[4], t[1] * x + t[3] * y + t[5])).collect()
}
fn near(a: (f64, f64), b: (f64, f64)) -> bool {
    (a.0 - b.0).abs() < 1e-6 && (a.1 - b.1).abs() < 1e-6
}

/// S6, n° 4, 5 : extrémités liées au contour, projetées avec l'écart 5 + épaisseur / 2 ; points intérieurs gardés.
#[test]
fn arrow_with_inner_points_and_bindings_reads_back() {
    let mut d = Document::blank();
    let a = rect(&mut d, 0.0, 0.0); // boîte (0,0)-(100,50)
    let b = rect(&mut d, 400.0, 0.0); // boîte (400,0)-(500,50)
    let line = LineInit { points: vec![250.0, -60.0], start: bind(&a, 1.0, 0.5), end: bind(&b, 0.0, 0.5) };
    let id = shape(&mut d, ShapeKind::Arrow, [110.0, 25.0, 390.0, 25.0], line).expect("flèche");
    let w = world(&d, &id);
    assert_eq!(w.len(), 3);
    assert!(near(w[0], (107.0, 25.0)), "départ à 5 + 4/2 du côté droit de A : {:?}", w[0]);
    assert!(near(w[1], (250.0, -60.0)));
    assert!(near(w[2], (393.0, 25.0)), "fin à 7 du côté gauche de B : {:?}", w[2]);
    let v = view(&d, &id);
    assert_eq!(v["shape"]["start"]["id"], a.as_str());
    assert_eq!(v["shape"]["end"]["fx"], 0.0);
}

/// S2, S5 : une `SetLinePoints` = une étape ; annuler rend la forme d'avant.
#[test]
fn set_line_points_rewrites_geometry_in_one_step() {
    let mut d = Document::blank();
    let id = shape(&mut d, ShapeKind::Line, [0.0, 0.0, 200.0, 0.0], LineInit::default()).expect("ligne");
    let before = view(&d, &id);
    d.apply(Command::SetLinePoints { id: id.clone(), points: vec![0.0, 0.0, 100.0, 80.0, 200.0, 0.0], start: None, end: None })
        .expect("points");
    assert!(near(world(&d, &id)[1], (100.0, 80.0)));
    assert!(d.undo());
    assert_eq!(view(&d, &id), before, "un seul annuler rend la forme d'avant : une étape");
}

/// S5, n° 12 b : refus sans écriture, dans l'ordre du cadrage.
#[test]
fn set_line_points_refusals() {
    let mut d = Document::blank();
    let r = rect(&mut d, 0.0, 0.0);
    let l = shape(&mut d, ShapeKind::Line, [0.0, 100.0, 200.0, 100.0], LineInit::default()).expect("ligne");
    let v0 = d.version();
    let set = |id: &str, points: Vec<f64>, end: Option<BindInput>| Command::SetLinePoints { id: id.into(), points, start: None, end };
    assert_eq!(d.apply(set(&l, vec![1.0, 2.0], None)), Err(CommandError::BadPoints));
    assert_eq!(d.apply(set(&l, vec![1.0, 2.0, 3.0], None)), Err(CommandError::BadPoints));
    assert_eq!(d.apply(set(&l, vec![0.0; 2 * 515], None)), Err(CommandError::BadPoints));
    assert_eq!(d.apply(set(&l, vec![0.0, 0.0, f64::NAN, 1.0], None)), Err(CommandError::BadPoints));
    assert_eq!(d.apply(set("absent", vec![0.0, 0.0, 1.0, 1.0], None)), Err(CommandError::UnknownElement("absent".into())));
    assert_eq!(d.apply(set(&r, vec![0.0, 0.0, 1.0, 1.0], None)), Err(CommandError::BadShape));
    assert_eq!(d.apply(set(&l, vec![0.0, 0.0, 1.0, 1.0], bind("absent", 0.0, 0.5))), Err(CommandError::BadShape));
    assert_eq!(d.apply(set(&l, vec![0.0, 0.0, 1.0, 1.0], bind(&l, 0.0, 0.5))), Err(CommandError::BadShape), "ligne non accrochable");
    let lr = LineInit { points: vec![10.0, 10.0], ..LineInit::default() };
    assert_eq!(shape(&mut d, ShapeKind::Rect, [0.0, 0.0, 10.0, 10.0], lr), Err(CommandError::BadShape));
    let odd = LineInit { points: vec![10.0], ..LineInit::default() };
    assert_eq!(shape(&mut d, ShapeKind::Line, [0.0, 0.0, 10.0, 10.0], odd), Err(CommandError::BadPoints));
    assert_eq!(d.version(), v0, "rien d'écrit");
}

/// Review Focus 1, n° 14 : un fichier sans champ neuf se réenregistre octet pour octet et n'en gagne aucun.
#[test]
fn old_file_keeps_bytes() {
    let mut d = Document::blank();
    rect(&mut d, 0.0, 0.0);
    let id = shape(&mut d, ShapeKind::Arrow, [0.0, 100.0, 200.0, 150.0], LineInit::default()).expect("flèche");
    let v = view(&d, &id).to_string();
    for key in ["points", "start", "end", "elbowed"] {
        assert!(!v.contains(&format!("\"{key}\"")), "{key} absent de {v}");
    }
    let a = save(&d, &meta()).expect("save");
    let b = save(&load(&a).expect("load"), &meta()).expect("save 2");
    assert_eq!(a, b);
}

/// S2 : points, courbe et liaisons survivent à l'enregistrement.
#[test]
fn line_fields_survive_save_and_load() {
    let mut d = Document::blank();
    let a = rect(&mut d, 0.0, 0.0);
    let line = LineInit { points: vec![150.0, 200.0], start: bind(&a, 0.5, 1.0), end: None };
    let id = shape(&mut d, ShapeKind::Arrow, [50.0, 60.0, 300.0, 60.0], line).expect("flèche");
    d.apply(Command::SetStyle { ids: vec![id.clone()], patch: StylePatch { roundness: Some(Some("round".into())), ..StylePatch::default() } })
        .expect("courbe");
    let back = load(&save(&d, &meta()).expect("save")).expect("load");
    assert_eq!(view(&back, &id), view(&d, &id));
    assert_eq!(view(&back, &id)["look"]["roundness"], "round");
}

/// n° 2, 12 c, 13 : roundness sur ligne et flèche ; elbowed sur flèche seule, vide les points intérieurs ; pointes neuves.
#[test]
fn style_roundness_elbowed_and_new_heads() {
    let mut d = Document::blank();
    let l = shape(&mut d, ShapeKind::Line, [0.0, 0.0, 100.0, 0.0], LineInit::default()).expect("ligne");
    let line = LineInit { points: vec![50.0, 40.0], ..LineInit::default() };
    let a = shape(&mut d, ShapeKind::Arrow, [0.0, 100.0, 100.0, 100.0], line).expect("flèche");
    let style = |d: &mut Document, ids: &[&String], patch: StylePatch| d.apply(Command::SetStyle { ids: ids.iter().map(|s| (*s).clone()).collect(), patch });
    style(&mut d, &[&l], StylePatch { roundness: Some(Some("round".into())), ..StylePatch::default() }).expect("arrondi");
    assert_eq!(view(&d, &l)["look"]["roundness"], "round");
    let v = d.version();
    style(&mut d, &[&l], StylePatch { elbowed: Some(Some(true)), ..StylePatch::default() }).expect("sans effet");
    assert_eq!(d.version(), v, "elbowed inapplicable à la ligne : aucune étape");
    style(&mut d, &[&a], StylePatch { elbowed: Some(Some(true)), ..StylePatch::default() }).expect("coudée");
    assert_eq!(view(&d, &a)["look"]["elbowed"], true);
    style(&mut d, &[&a], StylePatch { elbowed: Some(None), ..StylePatch::default() }).expect("droite");
    assert!(view(&d, &a)["look"].get("elbowed").is_none());
    assert!(view(&d, &a)["shape"].get("points").is_none(), "quitter la coudée garde les deux extrémités seules");
    for head in ["bar", "circle", "circle_outline"] {
        style(&mut d, &[&a], StylePatch { end_arrowhead: Some(Some(head.into())), ..StylePatch::default() }).expect("pointe");
        assert_eq!(view(&d, &a)["look"]["endArrowhead"], head);
    }
    assert_eq!(
        style(&mut d, &[&a], StylePatch { end_arrowhead: Some(Some("diamond".into())), ..StylePatch::default() }),
        Err(CommandError::BadStyle),
        "diamond : lot 2"
    );
}

/// Effet de bord 5, n° 3 : une flèche courbe touche sa courbe, pas sa corde (collision et mur du pot passent par
/// `shape_polygon`).
#[test]
fn curved_arrow_hit_follows_the_curve() {
    let mut d = Document::blank();
    let line = LineInit { points: vec![100.0, -80.0], ..LineInit::default() };
    let id = shape(&mut d, ShapeKind::Arrow, [0.0, 0.0, 200.0, 0.0], line).expect("flèche");
    d.apply(Command::SetStyle { ids: vec![id.clone()], patch: StylePatch { roundness: Some(Some("round".into())), ..StylePatch::default() } })
        .expect("courbe");
    let p = page(&d);
    assert_eq!(d.hit_test(&p, 100.0, -79.0, 2.0).as_deref(), Some(id.as_str()));
    assert_eq!(d.hit_test(&p, 100.0, 0.0, 2.0), None, "corde");
    let b = d.bounds(&[id]).expect("bornes");
    assert!(b.y0 < -78.0, "bornes suivent la courbe : {b:?}");
}
```

- [ ] **3. Lancer les tests (rouge).** `nice -n 10 cargo test -p roomboard-core -j 4 --test fleches 2>&1 | tail -5` — attendu :
  erreurs de compilation (`linear` introuvable, champ `line` inconnu).

- [ ] **4. Créer `crates/roomboard-core/src/linear.rs`** et ajouter `pub mod linear;` dans `lib.rs` (ordre alphabétique,
  après `pub mod ink;`) :
```rust
//! Géométrie des lignes et des flèches (OG12, DA-1, DA-5) : chemin complet, courbe, boîte d'accroche, ancrage d'une
//! extrémité liée, écritures d'une ligne. T4 y ajoute le suivi, la route coudée et `AddLinked`.
//! Courbe adaptée de `curveCatmullRomCubicApproxPoints` (packages/math/src/curve.ts) et écart de `getBindingGap`
//! (packages/element/src/binding.ts) d'Excalidraw (https://github.com/excalidraw/excalidraw), Copyright (c) 2020
//! Excalidraw, licence MIT (THIRD_PARTY_NOTICES.md).
use yrs::{Any, In, Map, MapRef, Out, ReadTxn};

use crate::commands::{read_shape, read_text, CommandError, ShapeFields};
use crate::document::Document;
use crate::element::{
    apply_transform, finite_positive, fits_f32, invert, out_string, out_transform, read_image,
    transform_to_any, Transform,
};
use crate::media::{read_media, MEDIA_KIND};
use crate::model3d::{read_model3d, MODEL3D_KIND};
use crate::shape::ShapeKind;
use crate::table::{self, TABLE_KIND};

/// Plafond des points intérieurs (H8) ; `SetLinePoints` en admet deux de plus (les extrémités).
pub const MAX_INNER_POINTS: usize = 512;
/// Pas d'aplatissement de la courbe par segment (n° 3), le même dans `shapes.ts`.
pub const CURVE_STEPS: usize = 16;
pub const CURVE_TENSION: f64 = 0.5;
/// Rapport de boîte d'une liaison, borné (n° 4).
pub const BIND_RATIO_MAX: f64 = 10.0;
/// Écart de base entre la pointe et le contour (n° 5, `BASE_BINDING_GAP` d'Excalidraw).
pub const BASE_BINDING_GAP: f64 = 5.0;
/// Points d'accroche (n° 18) : milieux des côtés haut, droit, bas, gauche, en rapports de boîte.
pub const ANCHOR_RATIOS: [[f64; 2]; 4] = [[0.5, 0.0], [1.0, 0.5], [0.5, 1.0], [0.0, 0.5]];

/// Liaison demandée ou lue : id de l'objet et rapport de sa boîte locale (`fixedPoint` d'Excalidraw).
#[derive(Debug, Clone, PartialEq, Default)]
pub struct BindInput {
    pub id: String,
    pub fx: f64,
    pub fy: f64,
}

/// Champs neufs d'`AddShape` (n° 12 a) : points intérieurs en monde, liaisons ; vide = forme du socle.
#[derive(Debug, Clone, PartialEq, Default)]
pub struct LineInit {
    pub points: Vec<f64>,
    pub start: Option<BindInput>,
    pub end: Option<BindInput>,
}

impl LineInit {
    pub fn is_empty(&self) -> bool {
        self.points.is_empty() && self.start.is_none() && self.end.is_none()
    }
}

/// Bout d'une ligne.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum End {
    Start,
    End,
}

impl End {
    pub(crate) fn bound_key(self) -> &'static str {
        match self {
            End::Start => "startBound",
            End::End => "endBound",
        }
    }
    pub(crate) fn fixed_key(self) -> &'static str {
        match self {
            End::Start => "startFixed",
            End::End => "endFixed",
        }
    }
}

/// Tous les points locaux (DA-1) : (0, 0), les points intérieurs, (w, h).
pub fn path_of(w: f64, h: f64, inner: &[f64]) -> Vec<(f64, f64)> {
    let mut out = Vec::with_capacity(inner.len() / 2 + 2);
    out.push((0.0, 0.0));
    out.extend(inner.chunks_exact(2).map(|c| (c[0], c[1])));
    out.push((w, h));
    out
}

pub(crate) fn path(s: &ShapeFields) -> Vec<(f64, f64)> {
    path_of(s.w, s.h, &s.points)
}

/// Segments de Bézier cubiques de Catmull-Rom (tension 0,5, extrémités doublées) : `[départ, c1, c2, arrivée]`.
pub fn catmull_rom(pts: &[(f64, f64)]) -> Vec<[(f64, f64); 4]> {
    let n = pts.len();
    if n < 2 {
        return Vec::new();
    }
    (0..n - 1)
        .map(|i| {
            let p0 = pts[i.saturating_sub(1)];
            let p1 = pts[i];
            let p2 = pts[(i + 1).min(n - 1)];
            let p3 = pts[(i + 2).min(n - 1)];
            let t1 = ((p2.0 - p0.0) * CURVE_TENSION, (p2.1 - p0.1) * CURVE_TENSION);
            let t2 = ((p3.0 - p1.0) * CURVE_TENSION, (p3.1 - p1.1) * CURVE_TENSION);
            [
                p1,
                (p1.0 + t1.0 / 3.0, p1.1 + t1.1 / 3.0),
                (p2.0 - t2.0 / 3.0, p2.1 - t2.1 / 3.0),
                p2,
            ]
        })
        .collect()
}

/// Chemin aplati : tel quel sans courbe ou avec deux points ; sinon `CURVE_STEPS` pas par segment de Bézier.
pub fn flatten(pts: &[(f64, f64)], curve: bool) -> Vec<(f64, f64)> {
    if !curve || pts.len() < 3 {
        return pts.to_vec();
    }
    let mut out = vec![pts[0]];
    for [a, b, c, d] in catmull_rom(pts) {
        for k in 1..=CURVE_STEPS {
            let t = k as f64 / CURVE_STEPS as f64;
            let u = 1.0 - t;
            let (w0, w1, w2, w3) = (u * u * u, 3.0 * u * u * t, 3.0 * u * t * t, t * t * t);
            out.push((
                w0 * a.0 + w1 * b.0 + w2 * c.0 + w3 * d.0,
                w0 * a.1 + w1 * b.1 + w2 * c.1 + w3 * d.1,
            ));
        }
    }
    out
}

/// Nombres d'un `Any::Array` ; `None` si la valeur n'en est pas un ou porte autre chose qu'un nombre.
pub(crate) fn nums(v: Option<Out>) -> Option<Vec<f64>> {
    let Some(Out::Any(Any::Array(a))) = v else {
        return None;
    };
    a.iter()
        .map(|x| match x {
            Any::Number(n) => Some(*n),
            Any::BigInt(i) => Some(*i as f64),
            _ => None,
        })
        .collect()
}

/// `Any::Array` de nombres à plat (jamais `Any::Map`, D25).
pub(crate) fn nums_in(v: &[f64]) -> In {
    In::Any(Any::Array(v.iter().map(|x| Any::Number(*x)).collect()))
}

/// Points intérieurs lus : paires finies, au plus `MAX_INNER_POINTS` ; sinon aucun (segment du socle, U3).
pub(crate) fn read_inner<T: ReadTxn>(txn: &T, e: &MapRef) -> Vec<f64> {
    nums(e.get(txn, "points"))
        .filter(|p| p.len() % 2 == 0 && p.len() <= 2 * MAX_INNER_POINTS && p.iter().all(|v| v.is_finite()))
        .unwrap_or_default()
}

/// Liaison lue : id chaîne et deux nombres finis, rapport borné ; sinon libre (U3).
pub(crate) fn read_binding<T: ReadTxn>(txn: &T, e: &MapRef, end: End) -> Option<BindInput> {
    let id = out_string(e.get(txn, end.bound_key()))?;
    let f = nums(e.get(txn, end.fixed_key())).filter(|f| f.len() == 2 && f.iter().all(|v| v.is_finite()))?;
    Some(BindInput {
        id,
        fx: f[0].clamp(-BIND_RATIO_MAX, BIND_RATIO_MAX),
        fy: f[1].clamp(-BIND_RATIO_MAX, BIND_RATIO_MAX),
    })
}

/// Boîte d'accroche d'un objet (n° 6) : `t` place la boîte locale (0, 0)-(w, h) ; `gap` en unités monde (H7).
#[derive(Debug, Clone, PartialEq)]
pub struct BindBox {
    pub id: String,
    pub t: Transform,
    pub w: f64,
    pub h: f64,
    pub ellipse: bool,
    pub gap: f64,
}

/// Écart de liaison (n° 5) : 5 + épaisseur / 2.
pub fn bind_gap(width: f64) -> f64 {
    BASE_BINDING_GAP + width / 2.0
}

/// Rectangle, ellipse, texte, image, tableau, média, objet 3D ; ni trait, ni ligne, ni flèche, ni `fill`, ni élément
/// inconnu ; boîte nulle ou non finie : aucune (n° 6, H13).
pub(crate) fn bind_box<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<BindBox> {
    let id = out_string(e.get(txn, "id"))?;
    let kind = out_string(e.get(txn, "kind"))?;
    let (t, w, h, ellipse, width) = match kind.as_str() {
        "shape" => {
            let s = read_shape(txn, e)?;
            if s.kind.is_segment() {
                return None;
            }
            let t = out_transform(e.get(txn, "transform"))?;
            (t, s.w, s.h, s.kind == ShapeKind::Ellipse, f64::from(s.style.width))
        }
        "text" => {
            let tf = read_text(txn, e)?;
            (out_transform(e.get(txn, "transform"))?, tf.box_width, tf.box_height, false, 0.0)
        }
        "image" => {
            let (t, i) = read_image(txn, e)?;
            let (bw, bh) = i.display_size();
            (t, bw, bh, false, 0.0)
        }
        k if k == TABLE_KIND => {
            let tb = table::read_raw(txn, e)?;
            (tb.transform, tb.width(), tb.height(), false, 0.0)
        }
        k if k == MEDIA_KIND => {
            let (t, m) = read_media(txn, e)?;
            (t, m.w, m.h, false, 0.0)
        }
        k if k == MODEL3D_KIND => {
            let (t, m) = read_model3d(txn, e)?;
            (t, m.w, m.h, false, 0.0)
        }
        _ => return None,
    };
    (finite_positive(w) && finite_positive(h)).then(|| BindBox { id, t, w, h, ellipse, gap: bind_gap(width) })
}

/// Point local `q` sur le contour ou dehors : au plus 0,5 unité locale à l'intérieur (n° 4 : le mode se déduit du point).
pub fn on_outline(b: &BindBox, q: (f64, f64)) -> bool {
    const IN: f64 = 0.5;
    if b.ellipse {
        let (rx, ry) = (b.w / 2.0 - IN, b.h / 2.0 - IN);
        if rx <= 0.0 || ry <= 0.0 {
            return true;
        }
        ((q.0 - b.w / 2.0) / rx).powi(2) + ((q.1 - b.h / 2.0) / ry).powi(2) >= 1.0
    } else {
        q.0 <= IN || q.1 <= IN || q.0 >= b.w - IN || q.1 >= b.h - IN
    }
}

/// Point monde d'une extrémité liée (n° 4, 5, 17) : rapport × boîte ; sur le contour, projeté depuis le centre sur le
/// contour puis écarté de `gap` (monde) dans la même direction ; dedans, le point lui-même, sans écart.
pub fn anchor(b: &BindBox, fixed: [f64; 2]) -> (f64, f64) {
    let (cx, cy) = (b.w / 2.0, b.h / 2.0);
    let q = (fixed[0] * b.w, fixed[1] * b.h);
    let (dx, dy) = (q.0 - cx, q.1 - cy);
    if !on_outline(b, q) || dx.hypot(dy) < 1e-9 {
        return apply_transform(&b.t, q.0, q.1);
    }
    let s = if b.ellipse {
        1.0 / ((dx / cx).powi(2) + (dy / cy).powi(2)).sqrt()
    } else {
        1.0 / (dx.abs() / cx).max(dy.abs() / cy)
    };
    let edge = apply_transform(&b.t, cx + s * dx, cy + s * dy);
    let center = apply_transform(&b.t, cx, cy);
    let (ux, uy) = (edge.0 - center.0, edge.1 - center.1);
    let l = ux.hypot(uy);
    if l < 1e-9 {
        return edge;
    }
    (edge.0 + ux / l * b.gap, edge.1 + uy / l * b.gap)
}

/// Écritures d'une ligne (DA-1) : partie linéaire de `t` gardée, translation = premier point, (w, h) = dernier point,
/// points intérieurs locaux (absents s'il n'y en a pas) ; liaisons écrites ou retirées. `world` a au moins deux points.
pub(crate) fn line_writes(
    t: &Transform,
    world: &[(f64, f64)],
    start: Option<&BindInput>,
    end: Option<&BindInput>,
) -> Result<Vec<(&'static str, Option<In>)>, CommandError> {
    let p0 = world[0];
    let inv = invert(&[t[0], t[1], t[2], t[3], 0.0, 0.0]).ok_or(CommandError::BadMatrix)?;
    let local: Vec<(f64, f64)> = world.iter().map(|p| apply_transform(&inv, p.0 - p0.0, p.1 - p0.1)).collect();
    let (w, h) = local[local.len() - 1];
    let inner: Vec<f64> = local[1..local.len() - 1].iter().flat_map(|p| [p.0, p.1]).collect();
    let nt = [t[0], t[1], t[2], t[3], p0.0, p0.1];
    if !fits_f32(&[nt[4], nt[5], w, h]) || !fits_f32(&inner) {
        return Err(CommandError::BadPoints);
    }
    let mut v = vec![
        ("transform", Some(In::Any(transform_to_any(&nt)))),
        ("w", Some(In::Any(Any::from(w)))),
        ("h", Some(In::Any(Any::from(h)))),
        ("points", (!inner.is_empty()).then(|| nums_in(&inner))),
    ];
    for (e, b) in [(End::Start, start), (End::End, end)] {
        v.push((e.bound_key(), b.map(|b| In::from(b.id.as_str()))));
        v.push((e.fixed_key(), b.map(|b| nums_in(&[b.fx, b.fy]))));
    }
    Ok(v)
}

impl Document {
    /// Liaison demandée (n° 12 b) : rapport fini, cible connue et accrochable ; rapport borné à ±10 ; sinon `BadShape`.
    pub(crate) fn checked_binding<T: ReadTxn>(
        &self,
        txn: &T,
        b: &BindInput,
    ) -> Result<(BindInput, BindBox), CommandError> {
        if !b.fx.is_finite() || !b.fy.is_finite() {
            return Err(CommandError::BadShape);
        }
        let found = self.find_element(txn, &b.id).ok_or(CommandError::BadShape)?;
        let bx = bind_box(txn, &found.element).ok_or(CommandError::BadShape)?;
        let fixed = BindInput {
            id: b.id.clone(),
            fx: b.fx.clamp(-BIND_RATIO_MAX, BIND_RATIO_MAX),
            fy: b.fy.clamp(-BIND_RATIO_MAX, BIND_RATIO_MAX),
        };
        Ok((fixed, bx))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::Command;
    use crate::element::{Look, StrokeStyle};

    #[test]
    fn flatten_keeps_two_points_and_passes_through_inner_points() {
        let two = [(0.0, 0.0), (100.0, 0.0)];
        assert_eq!(flatten(&two, true), two.to_vec());
        let three = [(0.0, 0.0), (50.0, -80.0), (100.0, 0.0)];
        let f = flatten(&three, true);
        assert_eq!(f.len(), 1 + 2 * CURVE_STEPS);
        assert!(f.iter().any(|p| (p.0 - 50.0).abs() < 1e-9 && (p.1 + 80.0).abs() < 1e-9));
        assert_eq!(f[f.len() - 1], (100.0, 0.0));
    }

    #[test]
    fn anchor_projects_on_outline_with_gap_and_keeps_inside_points() {
        let b = BindBox { id: "a".into(), t: [1.0, 0.0, 0.0, 1.0, 10.0, 20.0], w: 100.0, h: 50.0, ellipse: false, gap: 7.0 };
        assert_eq!(anchor(&b, [1.0, 0.5]), (117.0, 45.0));
        assert_eq!(anchor(&b, [0.3, 0.4]), (40.0, 40.0), "dedans : sans écart");
        let e = BindBox { ellipse: true, ..b.clone() };
        let (x, y) = anchor(&e, [0.5, 0.0]);
        assert!((x - 60.0).abs() < 1e-9 && (y - 13.0).abs() < 1e-9, "haut de l'ellipse : ({x}, {y})");
    }

    /// Review Focus 3 (U3) : champs illisibles lus neutres, gardés tels quels après une autre commande.
    #[test]
    fn unreadable_line_fields_read_neutral_and_kept() {
        let mut d = Document::blank();
        let page = d.page_ids()[0].clone();
        let id = d
            .apply(Command::AddShape {
                page,
                shape: ShapeKind::Arrow,
                x0: 0.0,
                y0: 0.0,
                x1: 100.0,
                y1: 0.0,
                style: StrokeStyle { color: "#000000".into(), width: 4.0 },
                fill: None,
                look: Look::default(),
                line: LineInit::default(),
            })
            .expect("flèche")
            .ids[0]
            .clone();
        {
            let txn = d.read();
            let e = d.find_element(&txn, &id).expect("élément").element;
            drop(txn);
            let mut w = d.transact_local();
            e.insert(&mut w, "points", nums_in(&[1.0]));
            e.insert(&mut w, "startBound", In::from("x"));
            e.insert(&mut w, "startFixed", nums_in(&[0.5]));
            e.insert(&mut w, "elbowed", In::from("oui"));
        }
        let v = serde_json::to_value(d.element(&id).expect("vue")).expect("json");
        assert!(v["shape"].get("points").is_none());
        assert!(v["shape"].get("start").is_none());
        assert!(v.get("look").is_none_or(|l| l.get("elbowed").is_none()));
        d.apply(Command::Transform { ids: vec![id.clone()], matrix: [1.0, 0.0, 0.0, 1.0, 5.0, 5.0] })
            .expect("déplacer");
        let txn = d.read();
        let e = d.find_element(&txn, &id).expect("élément").element;
        assert_eq!(nums(e.get(&txn, "points")), Some(vec![1.0]), "gardé tel quel");
        assert_eq!(out_string(e.get(&txn, "elbowed")).as_deref(), Some("oui"));
    }
}
```
  Si `Document::read`, `transact_local` ou `find_element` ne sont pas visibles depuis `linear.rs`, ils le sont déjà en
  `pub(crate)` (`document.rs:563-575`, `:667`) : aucune visibilité à changer.

- [ ] **5. `shape.rs`** : ajouter `ShapeGeom`, changer la signature de `shape_polygon`, ajouter `band_polygon`, adapter
  `shape_ring`. Le corps existant de `shape_polygon` reste tel quel après la nouvelle garde.
```rust
/// Géométrie locale d'une forme (OG12) : `path` = points intérieurs à plat (ligne, flèche), `curve` = courbe de
/// Catmull-Rom (`roundness: "round"` hors coudée). `plain` : forme du socle.
#[derive(Debug, Clone, Copy)]
pub struct ShapeGeom<'a> {
    pub kind: ShapeKind,
    pub w: f64,
    pub h: f64,
    pub path: &'a [f64],
    pub curve: bool,
}

impl ShapeGeom<'static> {
    pub fn plain(kind: ShapeKind, w: f64, h: f64) -> ShapeGeom<'static> {
        ShapeGeom { kind, w, h, path: &[], curve: false }
    }
}

pub fn shape_polygon(s: &ShapeGeom<'_>, width: f32) -> Vec<f32> {
    let (kind, w, h) = (s.kind, s.w, s.h);
    if kind.is_segment() {
        let pts = crate::linear::flatten(&crate::linear::path_of(w, h, s.path), s.curve);
        if pts.len() > 2 {
            return band_polygon(&pts, width, kind == ShapeKind::Arrow);
        }
    }
    let half = (f64::from(width) / 2.0).max(1.0);
    // … corps existant inchangé (match kind { Rect, Ellipse, Line | Arrow }) …
}

/// Polyligne épaissie (OG12) : côté gauche à l'aller, côté droit au retour, onglets bornés à 4 demi-épaisseurs, bouts
/// prolongés d'une demi-épaisseur comme le segment ; la flèche ajoute la pointe de son dernier segment (`arrow_wings`).
fn band_polygon(raw: &[(f64, f64)], width: f32, arrow: bool) -> Vec<f32> {
    let half = (f64::from(width) / 2.0).max(1.0);
    let mut pts: Vec<(f64, f64)> = Vec::with_capacity(raw.len());
    for p in raw {
        if pts.last().is_none_or(|q| (q.0 - p.0).hypot(q.1 - p.1) > 1e-9) {
            pts.push(*p);
        }
    }
    if pts.len() < 2 {
        let (x, y) = raw.first().copied().unwrap_or((0.0, 0.0));
        return [x - half, y - half, x + half, y - half, x + half, y + half, x - half, y + half]
            .iter()
            .map(|v| *v as f32)
            .collect();
    }
    let n = pts.len();
    let dir = |i: usize| {
        let (a, b) = (pts[i], pts[i + 1]);
        let l = (b.0 - a.0).hypot(b.1 - a.1);
        ((b.0 - a.0) / l, (b.1 - a.1) / l)
    };
    let mut left = Vec::with_capacity(n);
    let mut right = Vec::with_capacity(n);
    for i in 0..n {
        let (p, off) = if i == 0 {
            let (ux, uy) = dir(0);
            ((pts[0].0 - ux * half, pts[0].1 - uy * half), (-uy * half, ux * half))
        } else if i == n - 1 {
            let (ux, uy) = dir(n - 2);
            ((pts[i].0 + ux * half, pts[i].1 + uy * half), (-uy * half, ux * half))
        } else {
            let (ax, ay) = dir(i - 1);
            let (bx, by) = dir(i);
            let (mx, my) = (-(ay + by), ax + bx);
            let ml = mx.hypot(my);
            let (mx, my) = if ml < 1e-9 { (-ay, ax) } else { (mx / ml, my / ml) };
            let cos = (mx * -ay + my * ax).max(0.25);
            (pts[i], (mx * half / cos, my * half / cos))
        };
        left.push((p.0 + off.0, p.1 + off.1));
        right.push((p.0 - off.0, p.1 - off.1));
    }
    let (lx, ly) = pts[n - 2];
    let (ex, ey) = pts[n - 1];
    let wings = if arrow {
        arrow_wings(ex - lx, ey - ly, width).map(|w| [w[0] + lx, w[1] + ly, w[2] + lx, w[3] + ly])
    } else {
        None
    };
    let mut out: Vec<(f64, f64)> = Vec::with_capacity(2 * n + 4);
    match wings {
        // Aile `back − a` (x2, y2) du côté gauche (+n), aile `back + a` du côté droit, comme le segment du socle.
        Some([x1, y1, x2, y2]) => {
            let (ux, uy) = dir(n - 2);
            let len = (ex - lx).hypot(ey - ly);
            let k = ((x2 - lx) * ux + (y2 - ly) * uy).clamp(0.0, len);
            let (fx, fy) = (lx + k * ux, ly + k * uy);
            let (nx, ny) = (-uy * half, ux * half);
            out.extend_from_slice(&left[..n - 1]);
            out.extend([(fx + nx, fy + ny), (x2, y2), left[n - 1], right[n - 1], (x1, y1), (fx - nx, fy - ny)]);
            out.extend(right[..n - 1].iter().rev());
        }
        None => {
            out.extend_from_slice(&left);
            out.extend(right.iter().rev());
        }
    }
    out.iter().flat_map(|(x, y)| [*x as f32, *y as f32]).collect()
}
```
  Dans `shape_ring` : `let outer = shape_polygon(&ShapeGeom::plain(kind, w, h), width);` (signature de `shape_ring`
  inchangée). Mettre à jour le commentaire d'en-tête du fichier : « Ligne et flèche : (0, 0), points intérieurs
  facultatifs, (w, h) (OG12, DA-1) ».

- [ ] **6. `element.rs`** :
  - `Look` gagne, après `link` :
```rust
    /// OG12 (n° 2) : flèche coudée ; `true` seul s'écrit, jamais `false` (neutre).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub elbowed: Option<bool>,
```
  - `ARROWHEADS: [&str; 7] = ["none", "arrow", "triangle", "triangle_outline", "bar", "circle", "circle_outline"];`
  - `LOOK_KEYS: [&str; 11]` : ajouter `"elbowed"` en dernier.
  - `sanitized` : `elbowed: self.elbowed.filter(|b| *b),`.
  - `look_fields`, après la boucle `strings` : `if l.elbowed == Some(true) { v.push(("elbowed", In::Any(Any::Bool(true)))); }`.
  - `read_look` : `elbowed: match e.get(txn, "elbowed") { Some(Out::Any(Any::Bool(b))) => Some(b), _ => None },`.
  - `ShapeView` gagne les trois champs, et `BindingView` est ajoutée juste après :
```rust
    /// OG12 (DA-1) : points intérieurs locaux à plat ; absent = segment du socle.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub points: Option<Vec<f64>>,
    /// OG12 (DA-2) : liaisons lisibles vers un objet présent ; absentes sinon (lecture tolérante, n° 9).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub start: Option<BindingView>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end: Option<BindingView>,
}

/// Liaison d'une extrémité dans la vue : id de l'objet et rapport de sa boîte.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct BindingView {
    pub id: String,
    pub fx: f64,
    pub fy: f64,
}
```
  (`ShapeView` garde ses attributs `derive` et `serde` existants.)

- [ ] **7. `commands.rs`** :
  - Imports : `use crate::linear::{self, BindInput, LineInit, MAX_INNER_POINTS};` et `use crate::shape::{normalize,
    ShapeGeom, ShapeKind};`, `use crate::element::read_look;` (ajouter à la liste existante).
  - `Command::AddShape` gagne `line: LineInit,` après `look` (doc : « OG12 (n° 12 a) : points intérieurs (monde) et
    liaisons ; vide : la forme du socle »). Ajouter la variante, après `SetStyle` :
```rust
    /// OG12 (n° 12 b, DA-4) : tous les points en monde (≥ 2) et les liaisons d'une ligne ou d'une flèche ; une étape ;
    /// même géométrie et mêmes liaisons : aucune (D38).
    SetLinePoints {
        id: String,
        points: Vec<f64>,
        start: Option<BindInput>,
        end: Option<BindInput>,
    },
```
  - `ShapeFields` et `read_shape` :
```rust
pub(crate) struct ShapeFields {
    pub kind: ShapeKind,
    pub w: f64,
    pub h: f64,
    pub style: StrokeStyle,
    pub fill: Option<String>,
    /// OG12 (DA-1) : points intérieurs locaux à plat ; vide = segment du socle.
    pub points: Vec<f64>,
    /// Courbe : `roundness: "round"` sur une ligne ou une flèche non coudée (n° 2).
    pub curve: bool,
    /// Flèche coudée (`elbowed: true`, flèche seule).
    pub elbowed: bool,
    pub start: Option<BindInput>,
    pub end: Option<BindInput>,
}

impl ShapeFields {
    pub fn geom(&self) -> ShapeGeom<'_> {
        ShapeGeom { kind: self.kind, w: self.w, h: self.h, path: &self.points, curve: self.curve }
    }
}

pub(crate) fn read_shape<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<ShapeFields> {
    if out_string(e.get(txn, "kind"))? != "shape" {
        return None;
    }
    let kind = ShapeKind::parse(&out_string(e.get(txn, "shape"))?)?;
    let seg = kind.is_segment();
    let look = if seg { read_look(txn, e) } else { Look::default() };
    let elbowed = kind == ShapeKind::Arrow && look.elbowed == Some(true);
    Some(ShapeFields {
        kind,
        w: out_f64(e.get(txn, "w"))?,
        h: out_f64(e.get(txn, "h"))?,
        style: read_style(txn, e)?,
        fill: out_string(e.get(txn, "fill")),
        points: if seg { linear::read_inner(txn, e) } else { Vec::new() },
        curve: seg && !elbowed && look.roundness.as_deref() == Some("round"),
        elbowed,
        start: if seg { linear::read_binding(txn, e, linear::End::Start) } else { None },
        end: if seg { linear::read_binding(txn, e, linear::End::End) } else { None },
    })
}
```
  - `apply` : `Command::AddShape { page, shape, x0, y0, x1, y1, style, fill, look, line } => self.cmd_add_shape(&page,
    shape, [x0, y0, x1, y1], &style, fill.as_deref(), &look, &line),` et
    `Command::SetLinePoints { id, points, start, end } => self.cmd_set_line_points(&id, &points, start.as_ref(), end.as_ref()),`.
  - `cmd_add_shape` (`#[allow(clippy::too_many_arguments)]`, nouveau paramètre `line: &LineInit`) : après le contrôle de
    `BadWidth`, puis autour de l'écriture :
```rust
        // OG12 (n° 12 a) : points intérieurs et liaisons, ligne et flèche seulement.
        if !line.is_empty() && !kind.is_segment() {
            return Err(CommandError::BadShape);
        }
        if !valid_inner(&line.points) {
            return Err(CommandError::BadPoints);
        }
        let elements = self.page_elements_or_err(page)?;
        let ends = {
            let txn = self.read();
            let s = line.start.as_ref().map(|b| self.checked_binding(&txn, b)).transpose()?;
            let e = line.end.as_ref().map(|b| self.checked_binding(&txn, b)).transpose()?;
            [s, e]
        };
        // Extrémités liées recalées sur leur ancre (n° 17) ; repère : translation au départ, comme `normalize`.
        let mut world: Vec<(f64, f64)> = vec![(x0, y0)];
        world.extend(line.points.chunks_exact(2).map(|c| (c[0], c[1])));
        world.push((x1, y1));
        let last = world.len() - 1;
        if let Some((b, bx)) = &ends[0] {
            world[0] = linear::anchor(bx, [b.fx, b.fy]);
        }
        if let Some((b, bx)) = &ends[1] {
            world[last] = linear::anchor(bx, [b.fx, b.fy]);
        }
```
    Pour un segment (`kind.is_segment()`), `tx, ty, w, h` viennent alors de `world[0]` et `world[last]` (`(world[0].0,
    world[0].1, world[last].0 - world[0].0, world[last].1 - world[0].1)`), contrôlés par `fits_f32` comme aujourd'hui ;
    pour un rectangle ou une ellipse, `normalize` reste seul. Après `fields.extend(look_fields(look));` (où `look` est
    d'abord privé d'`elbowed` hors flèche : `let look = Look { elbowed: look.elbowed.filter(|_| kind == ShapeKind::Arrow),
    ..look.clone() };`), ajouter :
```rust
        let inner: Vec<f64> = world[1..last].iter().flat_map(|p| [p.0 - world[0].0, p.1 - world[0].1]).collect();
        if !inner.is_empty() {
            fields.push(("points", linear::nums_in(&inner)));
        }
        for (end, b) in [(linear::End::Start, &ends[0]), (linear::End::End, &ends[1])] {
            if let Some((b, _)) = b {
                fields.push((end.bound_key(), In::from(b.id.as_str())));
                fields.push((end.fixed_key(), linear::nums_in(&[b.fx, b.fy])));
            }
        }
```
    et la fonction libre, à côté de `world_to_local_path` :
```rust
/// Points intérieurs admis (n° 1) : paires finies, au plus `MAX_INNER_POINTS`, tenues en f32.
fn valid_inner(p: &[f64]) -> bool {
    p.len() % 2 == 0 && p.len() <= 2 * MAX_INNER_POINTS && p.iter().all(|v| v.is_finite()) && fits_f32(p)
}
```
  - `cmd_set_line_points`, après `cmd_transform` :
```rust
    /// `SetLinePoints` (n° 12 b) : contrôles dans l'ordre du cadrage, plan en lecture, au plus une écriture (D38).
    fn cmd_set_line_points(
        &mut self,
        id: &str,
        points: &[f64],
        start: Option<&BindInput>,
        end: Option<&BindInput>,
    ) -> Result<Change, CommandError> {
        let n = points.len() / 2;
        if points.len() % 2 != 0 || n < 2 || n > MAX_INNER_POINTS + 2 || !points.iter().all(|v| v.is_finite()) || !fits_f32(points) {
            return Err(CommandError::BadPoints);
        }
        let (e, page, plan) = {
            let txn = self.read();
            let found = self
                .find_element(&txn, id)
                .ok_or_else(|| CommandError::UnknownElement(id.to_string()))?;
            let _s = read_shape(&txn, &found.element).filter(|s| s.kind.is_segment()).ok_or(CommandError::BadShape)?;
            let t = out_transform(found.element.get(&txn, "transform")).ok_or(CommandError::BadShape)?;
            let a = start.map(|b| self.checked_binding(&txn, b)).transpose()?;
            let b = end.map(|b| self.checked_binding(&txn, b)).transpose()?;
            let mut world: Vec<(f64, f64)> = points.chunks_exact(2).map(|c| (c[0], c[1])).collect();
            let last = world.len() - 1;
            if let Some((bi, bx)) = &a {
                world[0] = linear::anchor(bx, [bi.fx, bi.fy]);
            }
            if let Some((bi, bx)) = &b {
                world[last] = linear::anchor(bx, [bi.fx, bi.fy]);
            }
            // T4 : une flèche coudée (`_s.elbowed`) est reroutée ici, entre `world[0]` et `world[last]`.
            let writes = linear::line_writes(&t, &world, a.as_ref().map(|x| &x.0), b.as_ref().map(|x| &x.0))?;
            let plan: Vec<(&'static str, Option<In>)> = writes
                .into_iter()
                .filter(|(k, v)| crate::fill::differs(&txn, &found.element, k, v.as_ref()))
                .collect();
            (found.element, found.page_id, plan)
        };
        if plan.is_empty() {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            for (k, v) in plan {
                crate::fill::set_or_remove(&e, &mut txn, k, v);
            }
        }
        Ok(self.done(Change { pages: vec![page], ids: vec![id.to_string()], ..Default::default() }))
    }
```
  - Chaque construction `Command::AddShape { … }` du dépôt gagne `line: LineInit::default(),` (et l'import
    `use roomboard_core::linear::LineInit;` dans les tests d'intégration, `crate::linear::LineInit` dans le crate).

- [ ] **8. `style.rs`** :
  - `StylePatch` gagne `pub elbowed: Option<Option<bool>>,` (doc : « OG12 (n° 12 c) : `Some(Some(true))` écrit
    `elbowed`, `Some(None)` et `Some(Some(false))` le retirent ; flèche seulement »).
  - `writes_for` : `roundness` admis si `matches!(shape, Some("rect" | "line" | "arrow"))` ; dans le bloc
    `if is_shape && shape == Some("arrow")`, ajouter
    `if let Some(e) = p.elbowed { w.push(("elbowed", (e == Some(true)).then(|| In::Any(Any::Bool(true))))); }`.
  - `cmd_set_style`, dans la boucle, après le calcul de `writes_for` et avant `if any && …` :
```rust
                // OG12 (n° 12 c) : changer de type coudé vide les points intérieurs dans la même étape (quitter : les
                // deux extrémités restent ; entrer : T4 reroute).
                let switched = patch.elbowed.is_some_and(|want| {
                    kind == "shape"
                        && shape.as_deref() == Some("arrow")
                        && (read_look(&txn, &e).elbowed == Some(true)) != (want == Some(true))
                });
                if switched && differs(&txn, &e, "points", None) {
                    plan.push((e.clone(), "points", None));
                    any = true;
                }
```
    (`differs` est déjà importé depuis `crate::fill`.)

- [ ] **9. `document.rs`** (vue `Some("shape")`, `:383`) :
```rust
            Some("shape") => {
                let transform = out_transform(e.get(&txn, "transform"))?;
                let s = read_shape(&txn, e)?;
                let bound = |b: Option<crate::linear::BindInput>| {
                    b.filter(|b| self.find_element(&txn, &b.id).is_some())
                        .map(|b| crate::element::BindingView { id: b.id, fx: b.fx, fy: b.fy })
                };
                let points = (!s.points.is_empty()).then(|| s.points.clone());
                let (start, end) = (bound(s.start.clone()), bound(s.end.clone()));
                Some(ElementView {
                    style: Some(s.style),
                    shape: Some(ShapeView { shape: s.kind.as_str().to_string(), w: s.w, h: s.h, fill: s.fill, points, start, end }),
                    look: look_view(&txn, e),
                    ..ElementView::bare(id, "shape", transform)
                })
            }
```

- [ ] **10. Appelants de `shape_polygon`** : `query.rs:250` `outline: shape_polygon(&s.geom(), s.style.width).into(),` ;
  `zone.rs:862` `&shape_polygon(&s.geom(), s.style.width),` ; `fill.rs:221`
  `shape_polygon(&ShapeGeom::plain(s.kind, s.w, s.h), 0.0)` (imports `ShapeGeom` ajoutés). Pont
  `crates/roomboard-wasm/src/lib.rs` : `line: LineInit::default(),` dans `add_shape_inner`, `elbowed: None,` dans le
  littéral `StylePatch` de `set_style`, et `elbowed: None` dans tout littéral `Look { … }` complet (`look_of`) — rien
  d'autre (T10 fait le pont).
  Toute autre construction complète de `ShapeView { … }`, `Look { … }` ou `StylePatch { … }` qui ne compile plus (le
  compilateur les nomme) gagne les champs neufs à `None`, rien d'autre.

- [ ] **11. Vert.** Les quatre commandes bornées de la section ; attendu : `test result: ok` partout, `fleches` ≥ 7 tests,
  aucune ligne `FAILED`. Puis `cargo fmt --all` puis `cargo fmt --all --check` (vide) et
  `nice -n 10 cargo clippy --workspace --all-targets -j 4 -- -D warnings 2>&1 | tail -3` (« Finished », aucun `error`).

- [ ] **12. Taille Wasm** (GC2) :
```bash
cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH CARGO_TARGET_DIR=$PWD/target
nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release -j 4 2>&1 | tail -1
mkdir -p /tmp/og12-t1-wasm && wasm-bindgen --target web --remove-name-section --out-dir /tmp/og12-t1-wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm
stat -c %s /tmp/og12-t1-wasm/roomboard_wasm_bg.wasm   # ≤ 1572864 ; la valeur va au rapport
```

- [ ] **13. Commit** (GC4) : `git add` de chaque fichier de la liste « Fichiers », un par un, puis
  `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(core): line points, curves, bindings and SetLinePoints (OG12 T1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

<a id="tache-t2"></a>
### Tâche T2 — Contrat TS : types, aspect, miroir géométrique, aides des outils

**Objectif.** Poser le contrat que toutes les tâches TS de V2 consomment : types de commandes et de vues, aspect
(`elbowed`, pointes neuves), miroir de `linear.rs` dans `shapes.ts`, types du calque d'édition, contexte des outils, style
courant (`arrowType`, `arrowBinding`) et aides pures `line-points.ts`. Les deux fabriques compilent avec des bouchons que
T5 (faux cœur) et T10 (pont) remplacent.

**Scénarios servis.** S1 à S6 (contrat commun). La CLI accepte les deux commandes neuves (GC5).

**Fichiers.**
- Créer : `apps/web/src/engine/tools/line-points.ts`, `apps/web/src/engine/tools/line-points.test.ts`.
- Modifier : `apps/web/src/core/api.ts` (`Command`, `ShapeData`, `CoreDocument`), `look.ts` (+ `look.test.ts`), `shapes.ts`
  (+ `shapes.test.ts`), `wasm-core.ts` (`toElementView`, bouchons), `fake-core.ts` (bouchons seuls), `engine/item-style.ts`
  (+ `item-style.test.ts`), `engine/render/overlay.ts` (+ `overlay.test.ts`), `engine/tools/tool.ts`, `apps/cli/src/ops.ts`.

**Interfaces.**
- Consomme : rien des autres tâches. Les noms et valeurs miroirs de T1 (`MAX_INNER_POINTS` 512, `CURVE_STEPS` 16, tension
  0,5, `BIND_RATIO_MAX` 10, `BASE_BINDING_GAP` 5, `ANCHOR_RATIOS` haut, droite, bas, gauche, pointes
  `bar`/`circle`/`circle_outline`).
- Réutilise : `apps/web/src/core/shapes.ts` `arrowWings` — appelé sur le dernier segment (`bandPolygon`).
- Réutilise : `apps/web/src/core/shapes.ts` `shapePolygon(kind, w, h, width)` — étendu d'un 5e paramètre facultatif
  `line?: LineGeom` (miroir de `shape_polygon(&ShapeGeom, width)`), appelants existants inchangés.
- Produit (consommé par T5 à T11) :
  - `api.ts` : `export interface LineBinding { readonly id: string; readonly fx: number; readonly fy: number }` ;
    `ShapeData` gagne `readonly points?: readonly number[]; readonly start?: LineBinding; readonly end?: LineBinding` ;
    `export type LinkDir = "up" | "down" | "left" | "right"` ;
    `export interface BindHit { readonly id: string; readonly fixed: readonly [number, number]; readonly onOutline: boolean;
    readonly anchors: readonly (readonly [number, number])[] }` (4 ancres monde, ordre `ANCHOR_RATIOS`) ;
    `AddShape` gagne `readonly points?: readonly number[]; readonly start?: LineBinding | null; readonly end?: LineBinding |
    null` (points intérieurs en monde) ; `{ readonly type: "SetLinePoints"; readonly id: string; readonly points: readonly
    number[]; readonly start: LineBinding | null; readonly end: LineBinding | null }` (tous les points en monde) ;
    `{ readonly type: "AddLinked"; readonly id: string; readonly dir: LinkDir }` (change.ids = [copie, flèche]) ;
    `CoreDocument.bindTarget(page: string, x: number, y: number, tol: number): BindHit | null`.
  - `look.ts` : `Arrowhead` + `"bar" | "circle" | "circle_outline"` ; `ARROWHEADS` (7) ; `Look.elbowed?: true` ;
    `LookPatch.elbowed?: boolean | null` ; `toLook` lit `elbowed === true` ; `lookFrom(s)` accepte `s.elbowed?: boolean` ;
    `export const elbowedOf = (l: Look | undefined): boolean => l?.elbowed === true`.
  - `shapes.ts` : `MAX_INNER_POINTS`, `CURVE_STEPS`, `CURVE_TENSION`, `BIND_RATIO_MAX`, `BASE_BINDING_GAP`, `ANCHOR_RATIOS`,
    `type Pt = readonly [number, number]`, `linePath(w, h, inner?) : Pt[]`, `catmullRom(pts): [Pt, Pt, Pt, Pt][]`,
    `flattenPath(pts, curve): Pt[]`, `interface LineGeom { inner; curve }`, `lineGeomOf(s: ShapeData, look?: Look): LineGeom`,
    `shapePolygon(kind, w, h, width, line?)`, `interface BindBox { id; m: Matrix; w; h; ellipse; gap }`, `bindGap(width)`,
    `onOutline(b, qx, qy)`, `anchorPoint(b, fx, fy): [number, number]`.
  - `overlay.ts` : `PointHandle { x; y; kind: "point" | "mid"; selected: boolean }`, `BindHint { id: string; anchors:
    readonly (readonly [number, number])[] }`, `LinkHandle { dir: LinkDir; x; y }` ; `EditOverlay` gagne
    `points?: readonly PointHandle[]`, `bind?: BindHint | null`, `links?: readonly LinkHandle[]` ; `ShapePreview` gagne
    `points?: readonly number[]` (points intérieurs monde) ; `mergeOverlays`, `isEmptyOverlay` en tiennent compte, et
    `EMPTY_OVERLAY` ne change pas (clé `overlayKey` des aperçus existants inchangée).
  - `tool.ts` : `ToolContext` gagne `ctrl?(): boolean`, `bindingEnabled?(): boolean`, `pointerType?(): string`,
    `editPoints?(id: string): void` ; `GestureTool` gagne `hover?(x: number, y: number): void` (px de la scène).
  - `item-style.ts` : `ItemStyle.arrowType: "sharp" | "round" | "elbow"` (défaut `"sharp"`, H1) ; `ItemStyle.arrowBinding:
    boolean` (défaut `true`, H12) ; `export type ArrowType`.
  - `line-points.ts` : `BIND_PX = 15`, `BIND_TOUCH_PX = 30`, `ANCHOR_SNAP_PX = 16`, `ANCHOR_SNAP_TOUCH_PX = 24`,
    `POINT_REACH_PX = HANDLE_GRAB_PX` (12), `POINT_REACH_TOUCH_PX = 22`, `MID_MIN_PX = 40`, `LINK_OFFSET_PX = 40`,
    `LINK_REACH_PX = 22`, `BOUND_DRAG_PX = 10` ; `worldPoints(v: ShapeElement): [number, number][]` ;
    `interface PointHit { kind: "point" | "mid"; index: number }` ; `pickHandle(pts, x, y, zoom, touch, mids): PointHit | null` ;
    `pointHandles(pts, selected, zoom, mids): PointHandle[]` ; `interface EndBind { at: readonly [number, number]; bind:
    LineBinding | null; hint: BindHint | null }` ; `bindEnd(doc, page, x, y, zoom, touch, enabled, exclude?): EndBind` ;
    `linkHandles(frame: Bounds, zoom): LinkHandle[]` ; `pickLink(handles, x, y, zoom): LinkDir | null`.
  - Bouchons, remplacés plus tard : `wasm-core.ts` (`SetLinePoints`, `AddLinked` : `throw new Error("commande non prise
    en charge : <type>")` ; `bindTarget` : `null`) — T10 ; `fake-core.ts` (mêmes bouchons) — T5.
- Ordre et forme de vue (T5 et T10 s'y tiennent) : `shape.points` (absent si vide), `shape.start`, `shape.end` (absents si
  libres ou cible absente), `look.elbowed` (absent ou `true`).

**Test et commandes bornées** :
```bash
cd <wt> && pnpm install --frozen-lockfile >/dev/null
pnpm --filter @roomboard/web exec vitest run src/core/shapes.test.ts src/core/look.test.ts src/engine/tools/line-points.test.ts src/engine/item-style.test.ts src/engine/render/overlay.test.ts 2>&1 | tail -6   # « Test Files  5 passed », bandPolygon et bindEnd nommés
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | tail -5     # aucune ligne « error TS »
pnpm --filter @roomboard/cli exec tsc --noEmit -p . 2>&1 | tail -5     # idem (ALL_COMMANDS)
pnpm --filter @roomboard/web exec vitest run src/core/fake-core.test.ts src/engine/tools/shape.test.ts 2>&1 | tail -4   # existants verts
```
Si `tsc -p .` demande les types Wasm générés (`../wasm/roomboard_wasm`), les construire une fois comme `scripts/verifier.sh`
(lignes 34-38) avant la commande.

**Contraintes (recopiées).**
- GC1 : `nice -n 10` pour les suites longues ; suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- GC3 : aucun test désactivé, sauté ou affaibli ; aucun seuil relevé ; `fake-core.test.ts` et `shape.test.ts` verts tels quels.
- GC4 : `git add` fichier par fichier, auteur `jejeasterix`, message anglais avec `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC5 : `COMMAND_TYPES` gagne `SetLinePoints` et `AddLinked` (sinon `tsc` casse) ; les `points` d'`AddShape` et de
  `SetLinePoints` restent des tableaux de nombres (pas de `Float32Array`, précision du monde).
- GC6 : `shapes.ts` porte la mention MIT d'Excalidraw pour la courbe et l'écart.
- GC10 : `pnpm install --frozen-lockfile` avant le premier test.

**Interdits.** Pas de logique de faux cœur au-delà des bouchons (T5) ; pas d'appel au pont (T10) ; ne pas changer
`EMPTY_OVERLAY` ni la sortie d'`overlayKey` pour un calque sans champ neuf.

**Terminé quand.** Les commandes bornées passent ; le rapport porte `Réutilisation : appelé arrowWings, shapePolygon`.

**Étapes.**

- [ ] **1. Tests d'abord** — ajouter à `apps/web/src/core/shapes.test.ts` :
```ts
import { anchorPoint, bandPolygonForTest, flattenPath, linePath, shapePolygon, ANCHOR_RATIOS, CURVE_STEPS } from "./shapes";
describe("OG12 : chemin, courbe et ancrage (miroir de linear.rs)", () => {
  it("flattenPath : deux points tels quels, trois points en 2 × 16 pas passant par le point intérieur", () => {
    expect(flattenPath(linePath(100, 0), true)).toEqual([[0, 0], [100, 0]]);
    const f = flattenPath(linePath(100, 0, [50, -80]), true);
    expect(f.length).toBe(1 + 2 * CURVE_STEPS);
    expect(f.some(([x, y]) => Math.abs(x - 50) < 1e-9 && Math.abs(y + 80) < 1e-9)).toBe(true);
  });
  it("bandPolygon : chemin vide = polygone du socle ; polyligne couvre son point intérieur", () => {
    expect(shapePolygon("arrow", 100, 0, 4, { inner: [], curve: true })).toEqual(shapePolygon("arrow", 100, 0, 4));
    const p = bandPolygonForTest([[0, 0], [50, -80], [100, 0]], 4, false);
    const xs = p.filter((_, i) => i % 2 === 0);
    const ys = p.filter((_, i) => i % 2 === 1);
    expect(Math.min(...ys)).toBeLessThan(-80);
    expect(Math.max(...xs)).toBeGreaterThan(100);
  });
  it("anchorPoint : contour + écart 5 + épaisseur / 2, dedans sans écart, ellipse", () => {
    const b = { id: "a", m: [1, 0, 0, 1, 10, 20] as const, w: 100, h: 50, ellipse: false, gap: 7 };
    expect(anchorPoint(b, 1, 0.5)).toEqual([117, 45]);
    expect(anchorPoint(b, 0.3, 0.4)).toEqual([40, 40]);
    const [x, y] = anchorPoint({ ...b, ellipse: true }, 0.5, 0);
    expect([x, Math.round(y * 1e9) / 1e9]).toEqual([60, 13]);
    expect(ANCHOR_RATIOS).toEqual([[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]]);
  });
});
```
  Créer `apps/web/src/engine/tools/line-points.test.ts` :
```ts
import { describe, expect, it } from "vitest";
import type { BindHit, CoreDocument } from "../../core/api";
import { bindEnd, linkHandles, pickHandle, pickLink, pointHandles, worldPoints } from "./line-points";

const doc = (hit: BindHit | null): CoreDocument => ({ bindTarget: () => hit }) as unknown as CoreDocument;
const HIT: BindHit = { id: "b", fixed: [0, 0.3], onOutline: true, anchors: [[450, 0], [500, 25], [450, 50], [400, 25]] };

describe("line-points (OG12)", () => {
  it("worldPoints : départ, points intérieurs, fin, matrice appliquée", () => {
    const v = { id: "l", kind: "shape", transform: [1, 0, 0, 1, 10, 0], style: { color: "#000", width: 4 }, shape: { shape: "line", w: 100, h: 0, fill: null, points: [50, 20] } } as const;
    expect(worldPoints(v as never)).toEqual([[10, 0], [60, 20], [110, 0]]);
  });
  it("bindEnd : désactivé = libre ; ancre calée à moins de 16 px (24 au doigt)", () => {
    expect(bindEnd(doc(HIT), "p", 401, 30, 1, false, false).bind).toBeNull();
    expect(bindEnd(doc(HIT), "p", 401, 30, 1, false, true).bind).toEqual({ id: "b", fx: 0, fy: 0.5 });
    expect(bindEnd(doc(HIT), "p", 401, 60, 1, false, true).bind).toEqual({ id: "b", fx: 0, fy: 0.3 });
    expect(bindEnd(doc(HIT), "p", 401, 48, 1, true, true).bind).toEqual({ id: "b", fx: 0, fy: 0.5 });
    expect(bindEnd(doc(HIT), "p", 401, 30, 1, false, true, "b").bind).toBeNull();
    expect(bindEnd(doc(HIT), "p", 401, 30, 1, false, true).hint).toEqual({ id: "b", anchors: HIT.anchors });
  });
  it("pickHandle : points d'abord, milieux sous 40 px écran masqués, portée 22 px au doigt", () => {
    const pts: [number, number][] = [[0, 0], [100, 0], [130, 0]];
    expect(pickHandle(pts, 99, 1, 1, false, true)).toEqual({ kind: "point", index: 1 });
    expect(pickHandle(pts, 50, 0, 1, false, true)).toEqual({ kind: "mid", index: 0 });
    expect(pickHandle(pts, 115, 0, 1, false, true)).toBeNull();
    expect(pickHandle(pts, 18, 0, 1, true, false)).toEqual({ kind: "point", index: 0 });
    expect(pointHandles(pts, [1], 1, true).filter((h) => h.kind === "mid")).toHaveLength(1);
  });
  it("linkHandles : quatre « + » à 40 px écran des milieux du cadre ; pickLink à 22 px", () => {
    const h = linkHandles({ x0: 0, y0: 0, x1: 100, y1: 50 }, 2);
    expect(h).toEqual([
      { dir: "up", x: 50, y: -20 }, { dir: "right", x: 120, y: 25 }, { dir: "down", x: 50, y: 70 }, { dir: "left", x: -20, y: 25 },
    ]);
    expect(pickLink(h, 125, 25, 2)).toBe("right");
    expect(pickLink(h, 140, 25, 2)).toBeNull();
  });
});
```
  Ajouter à `item-style.test.ts` : `it("OG12 : arrowType et arrowBinding, défauts et validation", …)` qui vérifie
  `DEFAULT_ITEM_STYLE.arrowType === "sharp"`, `DEFAULT_ITEM_STYLE.arrowBinding === true`,
  `parseItemStyle('{"arrowType":"elbow","arrowBinding":false}')` → ces valeurs, `parseItemStyle('{"arrowType":"x"}')` → `null`,
  et `parseItemStyle('{"color":"#000000"}')?.arrowType === "sharp"` (style gardé d'avant OG12 lisible). Ajouter à
  `look.test.ts` : `toLook({ elbowed: true })` → `{ elbowed: true }`, `toLook({ elbowed: "oui" })` → `undefined`,
  `toLook({ endArrowhead: "circle_outline" }).endArrowhead === "circle_outline"`, `lookFrom({ …neutre, elbowed: true },
  null)` → `{ elbowed: true }`. Ajouter à `overlay.test.ts` : `mergeOverlays` concatène `points` et `links`, garde le
  premier `bind`, et `overlayKey(EMPTY_OVERLAY)` vaut la même chaîne qu'avant (copier la valeur lue avant la modification
  dans l'assertion).

- [ ] **2. Rouge** : `pnpm --filter @roomboard/web exec vitest run src/core/shapes.test.ts src/engine/tools/line-points.test.ts 2>&1 | tail -4`
  — attendu : échec d'import.

- [ ] **3. `api.ts`** : ajouter les types de la section Interfaces ; `ShapeData` :
```ts
export interface LineBinding { readonly id: string; readonly fx: number; readonly fy: number }
/** OG12 (DA-1, DA-2) : `points` = points intérieurs locaux à plat (absent : segment du socle) ; `start`, `end` : liaisons
 *  vers un objet présent (absentes sinon, lecture tolérante). */
export interface ShapeData {
  readonly shape: ShapeKind; readonly w: number; readonly h: number; readonly fill: string | null;
  readonly points?: readonly number[]; readonly start?: LineBinding; readonly end?: LineBinding;
}
```
  Dans `AddShape` : `/** OG12 (n° 12 a) : points intérieurs en monde ; liaisons (null ou absent : libre). */ readonly points?:
  readonly number[]; readonly start?: LineBinding | null; readonly end?: LineBinding | null;`. Les deux membres neufs de
  `Command` avec leur doc (refus `BadPoints` : « points invalides … », `BadShape` : « forme invalide … », messages du cœur).
  `CoreDocument` : `/** OG12 (n° 17) : cible d'accroche sous (x, y) monde à `tol` monde ; null sans cible. */
  bindTarget(page: string, x: number, y: number, tol: number): BindHit | null;`.

- [ ] **4. `look.ts`** : types, `ARROWHEADS = ["none", "arrow", "triangle", "triangle_outline", "bar", "circle",
  "circle_outline"]`, `Look.elbowed?: true`, `LookPatch.elbowed?: boolean | null`, dans `toLook` :
  `if (v["elbowed"] === true) out.elbowed = true;`, dans `lookFrom` (paramètre `s` gagne `elbowed?: boolean`) :
  `if (s.elbowed === true) out.elbowed = true;`, et `elbowedOf`.

- [ ] **5. `shapes.ts`** — en tête, sous la première ligne : `// OG12 : chemin, courbe et ancrage, miroir de
  crates/roomboard-core/src/linear.rs ; courbe (curveCatmullRomCubicApproxPoints, packages/math/src/curve.ts) et écart
  (getBindingGap, packages/element/src/binding.ts) adaptés d'Excalidraw, Copyright (c) 2020 Excalidraw, licence MIT.` puis :
```ts
import { elbowedOf, roundnessOf, type Look } from "./look";
import type { Matrix, ShapeData, ShapeKind } from "./api";

export const MAX_INNER_POINTS = 512;
export const CURVE_STEPS = 16;
export const CURVE_TENSION = 0.5;
export const BIND_RATIO_MAX = 10;
export const BASE_BINDING_GAP = 5;
export const ANCHOR_RATIOS: readonly (readonly [number, number])[] = [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]];
export type Pt = readonly [number, number];

export function linePath(w: number, h: number, inner: readonly number[] = []): Pt[] {
  const out: Pt[] = [[0, 0]];
  for (let i = 0; i + 1 < inner.length; i += 2) out.push([inner[i]!, inner[i + 1]!]);
  out.push([w, h]);
  return out;
}

export function catmullRom(pts: readonly Pt[]): [Pt, Pt, Pt, Pt][] {
  const n = pts.length;
  const out: [Pt, Pt, Pt, Pt][] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)]!;
    const p1 = pts[i]!;
    const p2 = pts[Math.min(i + 1, n - 1)]!;
    const p3 = pts[Math.min(i + 2, n - 1)]!;
    const t1 = [(p2[0] - p0[0]) * CURVE_TENSION, (p2[1] - p0[1]) * CURVE_TENSION];
    const t2 = [(p3[0] - p1[0]) * CURVE_TENSION, (p3[1] - p1[1]) * CURVE_TENSION];
    out.push([p1, [p1[0] + t1[0]! / 3, p1[1] + t1[1]! / 3], [p2[0] - t2[0]! / 3, p2[1] - t2[1]! / 3], p2]);
  }
  return out;
}

export function flattenPath(pts: readonly Pt[], curve: boolean): Pt[] {
  if (!curve || pts.length < 3) return [...pts];
  const out: Pt[] = [pts[0]!];
  for (const [a, b, c, d] of catmullRom(pts)) {
    for (let k = 1; k <= CURVE_STEPS; k++) {
      const t = k / CURVE_STEPS;
      const u = 1 - t;
      const w0 = u * u * u, w1 = 3 * u * u * t, w2 = 3 * u * t * t, w3 = t * t * t;
      out.push([w0 * a[0] + w1 * b[0] + w2 * c[0] + w3 * d[0], w0 * a[1] + w1 * b[1] + w2 * c[1] + w3 * d[1]]);
    }
  }
  return out;
}

export interface LineGeom { readonly inner: readonly number[]; readonly curve: boolean }
/** Chemin d'une forme lue (miroir de `read_shape`) : courbe = `roundness: "round"` sur ligne ou flèche non coudée. */
export function lineGeomOf(s: ShapeData, look?: Look): LineGeom {
  const seg = isSegment(s.shape);
  const elbow = s.shape === "arrow" && elbowedOf(look);
  return { inner: seg ? (s.points ?? []) : [], curve: seg && !elbow && roundnessOf(look) === "round" };
}
```
  `shapePolygon` gagne `line?: LineGeom` ; en tête du corps :
```ts
  if (isSegment(kind) && line !== undefined) {
    const pts = flattenPath(linePath(w, h, line.inner), line.curve);
    if (pts.length > 2) return bandPolygon(pts, width, kind === "arrow");
  }
```
  puis le corps existant. `bandPolygon` est la traduction ligne à ligne de `band_polygon` (T1, étape 5 : mêmes
  dédoublonnage à 1e-9, onglets `max(cos, 0.25)`, bouts prolongés, ailes `arrowWings(ex - lx, ey - ly, width)` décalées de
  `(lx, ly)`, même ordre des sommets) et rend `number[]` ; l'exporter aussi sous `export const bandPolygonForTest =
  bandPolygon;`. Ancrage :
```ts
export interface BindBox { readonly id: string; readonly m: Matrix; readonly w: number; readonly h: number; readonly ellipse: boolean; readonly gap: number }
export const bindGap = (width: number): number => BASE_BINDING_GAP + width / 2;
export function onOutline(b: BindBox, qx: number, qy: number): boolean {
  const IN = 0.5;
  if (b.ellipse) {
    const rx = b.w / 2 - IN;
    const ry = b.h / 2 - IN;
    if (rx <= 0 || ry <= 0) return true;
    return ((qx - b.w / 2) / rx) ** 2 + ((qy - b.h / 2) / ry) ** 2 >= 1;
  }
  return qx <= IN || qy <= IN || qx >= b.w - IN || qy >= b.h - IN;
}
export function anchorPoint(b: BindBox, fx: number, fy: number): [number, number] {
  const cx = b.w / 2;
  const cy = b.h / 2;
  const qx = fx * b.w;
  const qy = fy * b.h;
  const dx = qx - cx;
  const dy = qy - cy;
  if (!onOutline(b, qx, qy) || Math.hypot(dx, dy) < 1e-9) return applyMatrix(b.m, qx, qy);
  const s = b.ellipse ? 1 / Math.sqrt((dx / cx) ** 2 + (dy / cy) ** 2) : 1 / Math.max(Math.abs(dx) / cx, Math.abs(dy) / cy);
  const edge = applyMatrix(b.m, cx + s * dx, cy + s * dy);
  const center = applyMatrix(b.m, cx, cy);
  const ux = edge[0] - center[0];
  const uy = edge[1] - center[1];
  const l = Math.hypot(ux, uy);
  return l < 1e-9 ? edge : [edge[0] + (ux / l) * b.gap, edge[1] + (uy / l) * b.gap];
}
```

- [ ] **6. `overlay.ts`** : types de la section Interfaces (import `LinkDir` de `../../core/api`) ; `mergeOverlays` :
  dans la branche à plusieurs parties, ajouter `...(pts.length > 0 ? { points: pts } : {})`, `...(bind ? { bind } : {})`,
  `...(links.length > 0 ? { links } : {})` avec `const pts = present.flatMap((p) => p.points ?? [])`, `const bind =
  present.find((p) => p.bind)?.bind ?? null`, `const links = present.flatMap((p) => p.links ?? [])` ; `isEmptyOverlay`
  ajoute `&& (o.points?.length ?? 0) === 0 && !o.bind && (o.links?.length ?? 0) === 0`.

- [ ] **7. `tool.ts`** : les quatre méthodes facultatives de `ToolContext` (doc : « OG12 : Ctrl/Cmd tenu (inverse la
  liaison, n° 19) », « réglage Liaison des flèches, vrai par défaut », « type du pointeur du geste en cours (`touch`,
  `mouse`, `pen`) », « entre dans Modifier les points pour la ligne ou la flèche `id` (n° 21) ») et `hover?` de
  `GestureTool` (« survol souris ou stylet sans bouton, px de la scène ; absent : sans effet »).

- [ ] **8. `item-style.ts`** : champs, défauts et validateurs :
```ts
export type ArrowType = "sharp" | "round" | "elbow";
  /** OG12 (n° 24, H1) : type de la prochaine flèche ; « sharp » (Droite) par défaut. */
  readonly arrowType: ArrowType;
  /** OG12 (n° 19, H12) : réglage « Liaison des flèches », gardé sur l'appareil. */
  readonly arrowBinding: boolean;
// DEFAULT_ITEM_STYLE : arrowType: "sharp", arrowBinding: true
// ok : arrowType: (v) => v === "sharp" || v === "round" || v === "elbow", arrowBinding: (v) => typeof v === "boolean",
```

- [ ] **9. `line-points.ts`** :
```ts
/** OG12 : aides pures des poignées de points, de la liaison d'une extrémité et des poignées « + », partagées par les
 *  outils Formes (T8), Sélection (T8) et « Modifier les points » (T9). Distances écran converties par `zoom`. */
import type { Bounds, CoreDocument, LineBinding, LinkDir, ShapeElement } from "../../core/api";
import { ANCHOR_RATIOS, applyMatrix, linePath } from "../../core/shapes";
import type { BindHint, LinkHandle, PointHandle } from "../render/overlay";
import { HANDLE_GRAB_PX } from "./handles";

export const BIND_PX = 15;
export const BIND_TOUCH_PX = 30;
export const ANCHOR_SNAP_PX = 16;
export const ANCHOR_SNAP_TOUCH_PX = 24;
export const POINT_REACH_PX = HANDLE_GRAB_PX;
export const POINT_REACH_TOUCH_PX = 22;
export const MID_MIN_PX = 40;
export const LINK_OFFSET_PX = 40;
export const LINK_REACH_PX = 22;
/** n° 8 : une flèche liée déplacée seule ne bouge qu'au-delà de 10 px écran (`DRAGGING_THRESHOLD` d'Excalidraw). */
export const BOUND_DRAG_PX = 10;

export function worldPoints(v: ShapeElement): [number, number][] {
  return linePath(v.shape.w, v.shape.h, v.shape.points ?? []).map(([x, y]) => applyMatrix(v.transform, x, y));
}

const mid = (a: readonly [number, number], b: readonly [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const longEnough = (a: readonly [number, number], b: readonly [number, number], zoom: number): boolean =>
  Math.hypot(b[0] - a[0], b[1] - a[1]) * zoom >= MID_MIN_PX;

export interface PointHit { readonly kind: "point" | "mid"; readonly index: number }

/** Poignée sous (x, y) monde : le point le plus proche à portée (12 px, 22 au doigt), sinon le milieu d'un segment d'au
 *  moins 40 px écran (si `mids`). */
export function pickHandle(pts: readonly (readonly [number, number])[], x: number, y: number, zoom: number, touch: boolean, mids: boolean): PointHit | null {
  const reach = (touch ? POINT_REACH_TOUCH_PX : POINT_REACH_PX) / zoom;
  let best: PointHit | null = null;
  let bestD = reach;
  pts.forEach((p, i) => {
    const d = Math.hypot(p[0] - x, p[1] - y);
    if (d <= bestD) { best = { kind: "point", index: i }; bestD = d; }
  });
  if (best !== null || !mids) return best;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    if (!longEnough(a, b, zoom)) continue;
    const m = mid(a, b);
    const d = Math.hypot(m[0] - x, m[1] - y);
    if (d <= bestD) { best = { kind: "mid", index: i }; bestD = d; }
  }
  return best;
}

export function pointHandles(pts: readonly (readonly [number, number])[], selected: readonly number[], zoom: number, mids: boolean): PointHandle[] {
  const out: PointHandle[] = pts.map(([x, y], i) => ({ x, y, kind: "point", selected: selected.includes(i) }));
  if (mids) {
    for (let i = 0; i + 1 < pts.length; i++) {
      if (longEnough(pts[i]!, pts[i + 1]!, zoom)) {
        const [x, y] = mid(pts[i]!, pts[i + 1]!);
        out.push({ x, y, kind: "mid", selected: false });
      }
    }
  }
  return out;
}

export interface EndBind { readonly at: readonly [number, number]; readonly bind: LineBinding | null; readonly hint: BindHint | null }

/** Liaison d'une extrémité posée en (x, y) monde (n° 17, 18, 19) : `enabled` faux (réglage coupé, ou Ctrl qui l'inverse)
 *  = libre ; sinon `bindTarget` à 15 px écran (30 au doigt) ; une ancre à moins de 16 px (24 au doigt) l'emporte. */
export function bindEnd(doc: CoreDocument, page: string, x: number, y: number, zoom: number, touch: boolean, enabled: boolean, exclude?: string): EndBind {
  const free: EndBind = { at: [x, y], bind: null, hint: null };
  if (!enabled) return free;
  const hit = doc.bindTarget(page, x, y, (touch ? BIND_TOUCH_PX : BIND_PX) / zoom);
  if (hit === null || hit.id === exclude) return free;
  const snap = (touch ? ANCHOR_SNAP_TOUCH_PX : ANCHOR_SNAP_PX) / zoom;
  let fixed: readonly [number, number] = hit.fixed;
  let bestD = snap;
  hit.anchors.forEach((a, i) => {
    const d = Math.hypot(a[0] - x, a[1] - y);
    if (d <= bestD) { bestD = d; fixed = ANCHOR_RATIOS[i]!; }
  });
  return { at: [x, y], bind: { id: hit.id, fx: fixed[0], fy: fixed[1] }, hint: { id: hit.id, anchors: hit.anchors } };
}

/** Poignées « + » (n° 28) : centrées à 40 px écran des milieux du cadre, haut, droite, bas, gauche. */
export function linkHandles(f: Bounds, zoom: number): LinkHandle[] {
  const o = LINK_OFFSET_PX / zoom;
  const cx = (f.x0 + f.x1) / 2;
  const cy = (f.y0 + f.y1) / 2;
  return [
    { dir: "up", x: cx, y: f.y0 - o }, { dir: "right", x: f.x1 + o, y: cy },
    { dir: "down", x: cx, y: f.y1 + o }, { dir: "left", x: f.x0 - o, y: cy },
  ];
}

export function pickLink(handles: readonly LinkHandle[], x: number, y: number, zoom: number): LinkDir | null {
  const reach = LINK_REACH_PX / zoom;
  return handles.find((h) => Math.hypot(h.x - x, h.y - y) <= reach)?.dir ?? null;
}
```

- [ ] **10. Bouchons et lecture des vues.** `wasm-core.ts`, `toElementView`, cas `shape` : après le contrôle de `fill`,
```ts
      const points = s["points"];
      if (points !== undefined && !(Array.isArray(points) && points.length % 2 === 0 && points.every((x) => typeof x === "number"))) throw new Error(ELEMENT);
      const bindingOf = (b: unknown): LineBinding | undefined => {
        if (b === undefined || b === null) return undefined;
        if (!isRecord(b) || typeof b["id"] !== "string" || typeof b["fx"] !== "number" || typeof b["fy"] !== "number") throw new Error(ELEMENT);
        return { id: b["id"], fx: b["fx"], fy: b["fy"] };
      };
      const start = bindingOf(s["start"]);
      const end = bindingOf(s["end"]);
      return { ...base, kind, style, shape: { shape, w, h, fill: typeof fill === "string" ? fill : null,
        ...(Array.isArray(points) && points.length > 0 ? { points: points as number[] } : {}), ...(start ? { start } : {}), ...(end ? { end } : {}) } };
```
  Dans `apply` des deux fabriques : `case "SetLinePoints": case "AddLinked": throw new Error(\`commande non prise en charge
  : ${cmd.type}\`);` ; méthode `bindTarget(): BindHit | null { return null; }` (commentaire : « bouchon OG12, remplacé par
  T10 » dans `wasm-core.ts`, « … par T5 » dans `fake-core.ts`).

- [ ] **11. `apps/cli/src/ops.ts`** : `COMMAND_TYPES` gagne `"SetLinePoints", "AddLinked"` (fin de liste) ; la conversion
  en `Float32Array` ne vise plus que les commandes qui l'attendent :
```ts
/** Clés converties en `Float32Array`, par commande (trait et gomme) ; ailleurs (`AddShape`, `SetLinePoints`, OG12) les
 *  points restent des nombres du monde, contrôlés de la même façon. */
const FLOAT_KEYS_OF: Readonly<Record<string, readonly string[]>> = { CommitStroke: ["points"], Erase: ["path"] };
```
  et dans `parseOp`, la boucle parcourt `FLOAT_KEYS` (inchangée) pour le contrôle « tableau de nombres attendu », mais ne
  remplace `cmd[key]` par `new Float32Array(…)` que si `FLOAT_KEYS_OF[type]?.includes(key)`.

- [ ] **12. Vert** : les commandes bornées de la section.

- [ ] **13. Commit** (GC4) : fichiers un par un ; message
  `feat(web): OG12 contract — line types, look, geometry mirror, tool helpers (T2)` + ligne `Co-Authored-By`.

<a id="tache-t3"></a>
### Tâche T3 — Entrées, raccourcis, icônes

**Objectif.** Le doigt tardif tenu pendant un geste au doigt vaut Maj (n° 29) ; les touches Ctrl+Entrée et Alt+Maj+flèche
sont reconnues ; le double toucher se détecte (300 ms, 35 px) ; la table des raccourcis et les icônes neuves existent.

**Scénarios servis.** S2 (doigt tardif = 15°, double toucher), S4 (Ctrl+Entrée, Alt+Maj+→, raccourcis dans le menu et
l'Aide). Effet de bord 1.

**Fichiers.**
- Créer : `apps/web/src/engine/input/double-tap.ts`, `double-tap.test.ts`.
- Modifier : `apps/web/src/engine/input/router.ts` (+ `router.test.ts`), `keys.ts` (+ `keys.test.ts`),
  `apps/web/src/ui/shortcuts.ts` (+ `shortcuts.test.ts`), `apps/web/src/ui/icons.ts` (+ `icons.test.ts`).

**Interfaces.**
- Consomme : rien des autres tâches (`LinkDir` est redéclaré localement en `"up" | "down" | "left" | "right"` dans
  `keys.ts`, même littéral que `api.ts` de T2 ; T11 les relie par le type structurel).
- Réutilise : `apps/web/src/ui/shortcuts.ts:5` `SHORTCUTS`, `:45` `ARIA` — lignes `line-edit`, `linked-node`, `no-binding` ;
  `ARIA` gagne `←`, `→`, `Entrée`.
- Réutilise : `apps/web/src/engine/input/keys.ts` — `lineEditKey`, `linkedKey` à côté d'`orderKey` (inchangé).
- Réutilise : `apps/web/src/ui/icons.ts` (table Lucide, trait 1,5, `ICON_VIEWBOX`) — entrées neuves.
- Produit :
  - `router.ts` : `RouterDeps.modifier?(held: boolean): void` — appelé `true` quand un doigt se pose plus de
    `secondFingerMs` après le début d'un geste **au doigt** dont l'outil n'est ni `pen` ni `eraser`, `false` quand ce doigt
    se lève (ou quand le geste se ferme). Un doigt tardif pendant un geste au stylet ou à la souris reste ignoré.
  - `keys.ts` : `export type LinkDir = "up" | "down" | "left" | "right"` ; `lineEditKey(e: KeyLike): boolean` (Ctrl/Cmd+Entrée,
    sans Maj ni Alt, hors champ, hors IME) ; `linkedKey(e: KeyLike): LinkDir | null` (Alt+Maj+↑ ↓ ← →, sans Ctrl ni Cmd,
    hors champ, hors IME) ; `isCtrlKey(e: { key: string }): boolean` (`"Control"` ou `"Meta"`).
  - `double-tap.ts` : `export const TAP_TWICE_MS = 300`, `DOUBLE_TAP_PX = 35`, `export interface Tap { readonly t: number;
    readonly x: number; readonly y: number }` (px écran), `isDoubleTap(prev: Tap | null, cur: Tap): boolean`.
  - `shortcuts.ts` : lignes `s("line-edit", "Édition", "Modifier les points", "Ctrl+Entrée")`,
    `s("linked-node", "Édition", "Objet relié", "Alt+Maj+↑ ↓ ← →")`, `s("no-binding", "Édition", "Flèche sans liaison",
    "Ctrl tenu")` ; `ARIA` : `"←": "ArrowLeft"`, `"→": "ArrowRight"`, `"Entrée": "Enter"`.
  - `icons.ts` : `arrow-type-sharp`, `arrow-type-round`, `arrow-type-elbow`, `head-bar`, `head-circle`,
    `head-circle-outline`, `edit-points`, `point-remove`, `arrow-binding`.

**Test et commandes bornées** :
```bash
cd <wt> && pnpm install --frozen-lockfile >/dev/null
pnpm --filter @roomboard/web exec vitest run src/engine/input/router.test.ts src/engine/input/keys.test.ts src/engine/input/double-tap.test.ts src/ui/shortcuts.test.ts src/ui/icons.test.ts src/ui/HelpPanel.test.tsx 2>&1 | tail -6
# « Test Files  6 passed » ; « doigt tardif » et « linkedKey » nommés ; les cas existants du pincement restent verts
```

**Contraintes (recopiées).**
- GC1 : `nice -n 10` pour les suites longues ; suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- GC3 : aucun test désactivé, sauté ou affaibli ; seuil du pincement (150 ms) inchangé ; les cas existants de
  `router.test.ts` restent verts sans retouche.
- GC4 : `git add` fichier par fichier, auteur `jejeasterix`, message anglais avec `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC7 : icônes au trait 1,5 de la grille 24 (`ICON_VIEWBOX`), traits fins façon Lucide ; tracé repris de Lucide : nom
  Lucide en commentaire ; dessinée : « dessinée pour OG12 ».
- GC10 : `pnpm install --frozen-lockfile` avant le premier test.

**Interdits.** Ne pas toucher à la branche du pincement ni au geste de la gomme (chantier `gomme-surface-contact` : nos
ajouts tiennent dans une fonction à part, `lateFinger`) ; `orderKey` inchangé.

**Terminé quand.** Commandes bornées vertes ; le rapport porte `Réutilisation : appelé SHORTCUTS/ARIA, keys.ts, icons.ts`.

**Étapes.**

- [ ] **1. Tests d'abord.** `router.test.ts`, nouveau `describe("OG12 : doigt tardif = Maj (n° 29)")` sur le patron des
  cas existants (`createRouter(DEFAULT_ROUTER_OPTIONS, deps)` avec un `modifier: vi.fn()`) :
  - `doigt tardif pendant un geste au doigt de Sélection : modifier(true) puis modifier(false) au lever` : doigt 1 en
    `t = 0` outil `select`, doigt 2 en `t = 400` → `modifier` appelé `[true]`, le geste du doigt 1 continue (`extend` reçu),
    lever du doigt 2 → `[false]`.
  - `doigt tardif pendant un geste au stylet : ignoré` (Review Focus 5) : stylet en `t = 0`, doigt en `t = 400` → `modifier`
    jamais appelé, `begin` du doigt jamais appelé.
  - `doigt tardif avec le stylo ou la gomme : ignoré` : outil `pen` au doigt, doigt 2 en `t = 400` → `modifier` jamais appelé.
  - `second doigt sous 150 ms : pincement inchangé` : `close(…, "abort")` du premier, `modifier` jamais appelé.
  - `geste fermé pendant que le doigt tardif est posé : modifier(false)`.
  `keys.test.ts` : `lineEditKey` vrai pour `{ key: "Enter", ctrlKey: true }` et `{ key: "Enter", metaKey: true }`, faux
  avec Maj, Alt, dans un `INPUT`, en composition ; `linkedKey` rend `right` pour `{ key: "ArrowRight", altKey: true,
  shiftKey: true }`, `null` sans Maj, avec Ctrl, dans un champ ; `orderKey` inchangé pour `Ctrl+↑`. `double-tap.test.ts` :
  `isDoubleTap(null, …)` faux ; 250 ms et 20 px vrai ; 350 ms faux ; 40 px faux. `shortcuts.test.ts` : les trois ids
  existent ; `ariaShortcut("line-edit", false) === "Control+Enter"`, `ariaShortcut("line-edit", true) === "Meta+Enter"` ;
  `ariaShortcut("linked-node", false) === null` (liste de touches, pas un raccourci unique). `icons.test.ts` : chaque nom
  neuf est dans `ICONS` et passe les contrôles existants de la table (boucle existante sur `ICONS`).

- [ ] **2. Rouge** : la commande bornée — attendu : échecs `modifier`, `lineEditKey`, `isDoubleTap`.

- [ ] **3. `router.ts`** : dans `RouterDeps`, `/** OG12 (n° 29, DA-6) : doigt tardif tenu pendant un geste au doigt = Maj ;
  absent : ignoré comme avant. */ modifier?(held: boolean): void;`. Dans `Track`, `late?: boolean`. Remplacer la ligne
  `if (drawing) return; // second doigt tardif : ignoré, le trait continue` par :
```ts
    if (drawing) {
      lateFinger(drawing[1], track); // OG12 : doigt tardif = Maj pendant un geste au doigt, jamais le stylo ni la gomme
      return;
    }
```
  et ajouter, dans `createRouter` avant `onStart` :
```ts
  /** OG12 (n° 29) : seul un geste au doigt (le premier contact `draw` est tactile par construction de `touches`) dont
   *  l'outil n'est ni le stylo ni la gomme donne ce sens au doigt tardif ; le doigt garde le rôle `ignored`. */
  const lateFinger = (drawing: Track, track: Track): void => {
    if (drawing.tool === "pen" || drawing.tool === "eraser" || deps.modifier === undefined) return;
    track.late = true;
    deps.modifier(true);
  };
```
  Dans `onClose` : en tête, après `tracks.delete(g.pointerId);`, `if (t.late) deps.modifier?.(false);` ; dans la branche
  `t.role === "draw"`, après `deps.gestures.close(…)`, relâcher tout doigt tardif encore posé :
  `for (const [, o] of tracks) if (o.late) { o.late = false; deps.modifier?.(false); }`.

- [ ] **4. `keys.ts`** (après `orderKey`) :
```ts
export type LinkDir = "up" | "down" | "left" | "right";
/** OG12 (n° 21) : Ctrl+Entrée (Cmd+Entrée sous macOS) entre dans « Modifier les points » ; hors champ, hors IME. */
export function lineEditKey(e: KeyLike): boolean {
  return e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && !e.isComposing && !inEditable(e.target);
}
const LINK_KEYS: Readonly<Record<string, LinkDir>> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
/** OG12 (n° 28, H2) : Alt+Maj+flèche (⌥⇧ sous macOS) crée un objet relié ; Ctrl+flèche reste au rangement (OG14). */
export function linkedKey(e: KeyLike): LinkDir | null {
  if (e.isComposing || !e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey || inEditable(e.target)) return null;
  return Object.hasOwn(LINK_KEYS, e.key) ? LINK_KEYS[e.key]! : null;
}
/** OG12 (n° 19) : touche Ctrl ou Cmd seule (tenue pendant un glisser). */
export const isCtrlKey = (e: { readonly key: string }): boolean => e.key === "Control" || e.key === "Meta";
```

- [ ] **5. `double-tap.ts`** :
```ts
/** OG12 (n° 21) : double toucher ou double-clic (`TAP_TWICE_TIMEOUT` 300 ms, `DOUBLE_TAP_POSITION_THRESHOLD` 35 px
 *  d'Excalidraw) ; px écran. */
export const TAP_TWICE_MS = 300;
export const DOUBLE_TAP_PX = 35;
export interface Tap { readonly t: number; readonly x: number; readonly y: number }
export function isDoubleTap(prev: Tap | null, cur: Tap): boolean {
  return prev !== null && cur.t - prev.t <= TAP_TWICE_MS && cur.t >= prev.t && Math.hypot(cur.x - prev.x, cur.y - prev.y) <= DOUBLE_TAP_PX;
}
```

- [ ] **6. `shortcuts.ts`** : les trois lignes après `s("link", …)` ; `ARIA` étendue.

- [ ] **7. `icons.ts`** (bloc OG12 après `head-triangle-outline`) :
```ts
  // OG12 : types de flèche (dessinées pour OG12, d'après les icônes d'Excalidraw), pointes neuves (dessinées), Lucide spline
  // (ISC) pour « Modifier les points », Lucide circle-minus (ISC) pour « Retirer le point », liaison (dessinée).
  "arrow-type-sharp": [["path", { d: "M5 19 19 5" }], ["path", { d: "M10 5h9v9" }]],
  "arrow-type-round": [["path", { d: "M5 19C7 11 11 7 19 5" }], ["path", { d: "m13.5 3.5 5.5 1.5-2 5.5" }]],
  "arrow-type-elbow": [["path", { d: "M5 19v-8h14" }], ["path", { d: "m15 7 4 4-4 4" }]],
  "head-bar": [["path", { d: "M4 12h16" }], ["path", { d: "M20 6v12" }]],
  "head-circle": [["path", { d: "M4 12h11" }], ["circle", { cx: "17.5", cy: "12", r: "2.5" }], ["circle", { cx: "17.5", cy: "12", r: "1" }]],
  "head-circle-outline": [["path", { d: "M4 12h11" }], ["circle", { cx: "17.5", cy: "12", r: "2.5" }]],
  "edit-points": [["circle", { cx: "19", cy: "5", r: "2" }], ["circle", { cx: "5", cy: "19", r: "2" }], ["path", { d: "M5 17A12 12 0 0 1 17 5" }]],
  "point-remove": [["circle", { cx: "12", cy: "12", r: "10" }], ["path", { d: "M8 12h8" }]],
  "arrow-binding": [["path", { d: "M3 12h9" }], ["rect", { x: "14", y: "6", width: "7", height: "12", rx: "1" }], ["circle", { cx: "12.5", cy: "12", r: "1.5" }]],
```
  Si un contrôle existant de `icons.test.ts` refuse une valeur (coordonnée hors grille, attribut), corriger le tracé, pas
  le contrôle.

- [ ] **8. Vert** : la commande bornée.

- [ ] **9. Commit** (GC4) : fichiers un par un ; message `feat(web): late finger as Shift, line-edit and linked-node keys, double tap, icons (OG12 T3)` + `Co-Authored-By`.

<a id="tache-t4"></a>
### Tâche T4 — Cœur : liaisons, suivi, rupture, copie, `bind_target`, coudée, `AddLinked`

**Objectif.** Quand un objet lié bouge (`Transform`, `SetText`, `FormatText`), ses flèches et lignes suivent dans la même
transaction ; une flèche déplacée seule se délie bout par bout ; la copie renvoie les liaisons vers les copies ; la
requête `bind_target` trouve la cible d'accroche ; la flèche coudée est routée par le cœur ; `AddLinked` pose copie et
flèche coudée liée en une étape.

**Scénarios servis.** S1 (suivi et annulation en une étape), S3 (carte mentale, glissement sur le côté, reroutage), S4
(Ctrl+D : copie liée aux copies, copie seule libre), S5 (`Transform` puis `undo`, `AddLinked`). Effets de bord 2, 3, 6.

**Patron à ne pas reprendre.**
- Ne pas appeler `insert_fragment` depuis `AddLinked` : il ouvre sa propre `transact_local` (`copy.rs:268`), d'où deux
  étapes. Ne pas non plus passer la même transaction en lecture et en écriture à `copy_elements` (emprunt `&` et `&mut`
  du même `TransactionMut`) : séparer la recopie en `copy_prelims` (lecture) puis insertion (écriture), et appeler
  `copy_prelims` sous une lecture fermée avant la `transact_local` unique.
- Ne pas suivre les liaisons dans une seconde commande ou une seconde transaction après `Transform` (deux étapes
  d'annulation, contraire à S1) : le suivi s'écrit dans le bloc `let mut txn = self.transact_local();` de `cmd_transform`
  (`commands.rs:1066-1071`).
- Ne pas tenir de `boundElements` côté objet (DA-2) : on parcourt les éléments.
Chemins de référence : `crates/roomboard-core/src/copy.rs:61-90` (`copy_elements`), `:246-280` (`insert_fragment`),
`crates/roomboard-core/src/commands.rs:1043-1081` (`cmd_transform`), `:1763-1800` (`cmd_format_text`).

**Fichiers.** Modifier : `crates/roomboard-core/src/linear.rs`, `commands.rs`, `copy.rs`, `query.rs`, `style.rs`,
`crates/roomboard-core/tests/fleches.rs`.

**Interfaces.**
- Consomme (T1) : `linear::{BindInput, BindBox, bind_box, anchor, line_writes, path, End, ANCHOR_RATIOS}`,
  `ShapeFields { points, elbowed, start, end, … }`, `Document::checked_binding`, `Command::SetLinePoints`.
- Réutilise : `crates/roomboard-core/src/query.rs:278` `hit_test`, `:139` `outline` ; `api.ts:392` `hitTest` — étendu par une
  requête voisine `pub fn bind_target(&self, page: &str, x: f64, y: f64, tol: f32) -> Option<BindHit>` avec
  `BindHit { id: String, fixed: [f64; 2], on_outline: bool, anchors: [[f64; 2]; 4] }` (JSON `onOutline`) ; mêmes lecteurs
  de boîte que `hit_test` (par `bind_box`), objets accrochables seuls, le plus petit qui contient le point passe devant.
- Réutilise : `copy.rs:61` `copy_elements` (chemin commun d'`extract`, `insert_fragment`, `insert_pages`, de la duplication
  de page), `:26` `renumber`, table `IdMap` — étendu : `copy_prelims` renumérote `startBound` / `endBound` vers les copies,
  retire la liaison (et son `*Fixed`) si la cible n'est pas copiée.
- Réutilise : `copy.rs:61` `copy_elements(src, from, dst, into, ids, dx, dy)` pour la copie d'`AddLinked` — par sa moitié
  lecture `copy_prelims`, dans la transaction unique d'`AddLinked` ; jamais `insert_fragment`.
- Produit (lu par T10) :
  - `linear` : `pub struct ElbowEnd { pub p: (f64, f64), pub normal: Option<(f64, f64)> }`, `pub const ELBOW_PADDING: f64 =
    40.0`, `pub fn elbow_route(a: ElbowEnd, b: ElbowEnd) -> Vec<(f64, f64)>` (≤ 5 segments, orthogonale),
    `pub(crate) fn side_normal(b: &BindBox, fixed: [f64; 2]) -> (f64, f64)`, `pub(crate) fn follow(doc: &Document, txn: &mut
    TransactionMut, moved: &[String], m: Option<&Transform>) -> Vec<String>` (ids réécrits), `pub(crate) fn reroute(doc:
    &Document, txn: &mut TransactionMut, e: &MapRef)`, `pub const LINK_GAP: f64 = 100.0`,
    `pub enum LinkDir { Up, Down, Left, Right }` + `LinkDir::parse(&str) -> Option<LinkDir>`, `Document::cmd_add_linked`.
  - `Command::AddLinked { id: String, dir: LinkDir }` ; refus : id inconnu `UnknownElement`, cible ni rectangle ni ellipse
    `BadShape`. Change : `ids = [copie, flèche]`, une étape.
  - `copy::copy_prelims<T: ReadTxn>(src: &T, from: &[MapRef], ids: &mut IdMap, dx: f64, dy: f64) -> Vec<(String,
    MapPrelim)>`.
  - `query::BindHit`, `Document::bind_target`.
- Règles écrites (le faux cœur T5 les reproduit, la route coudée exceptée) :
  - Suivi (n° 7) : pour chaque ligne ou flèche de toute page portant une liaison dont la cible est dans `moved` et qui
    n'est pas elle-même dans `moved` : extrémités liées recalées par `anchor` ; points intérieurs gardés en monde, sauf si
    les deux bouts sont liés à des cibles de `moved` et que `m` est donnée : ils prennent alors `m` (en bloc) ; coudée :
    reroutée. Cible absente du document : bout laissé tel quel.
  - Rupture (n° 8) : une ligne de `moved` perd chaque liaison dont la cible n'est pas dans `moved` ; les liaisons gardées
    sont recalées.
  - `AddLinked` (n° 27) : rectangle ou ellipse seulement ; copie (champs gardés, `group` retiré, id neuf) décalée de
    (largeur + 100) ou (hauteur + 100) monde dans la direction ; tant que sa boîte coupe la boîte d'un objet accrochable
    de la page (hors source), elle glisse sur le côté (`Right`/`Left` : vers le bas, `Up`/`Down` : vers la droite) de
    (taille + 100), 64 fois au plus ; flèche coudée (`elbowed: true`, couleur et épaisseur de la source, pointe de fin
    neutre `arrow`) liée au milieu du côté de la source qui regarde la direction et au milieu du côté opposé de la copie.

**Test et commandes bornées** :
```bash
cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && export CARGO_TARGET_DIR=$PWD/target
nice -n 10 cargo test -p roomboard-core -j 4 --test fleches 2>&1 | tail -5     # N ≥ 17 ; moving_target_moves_bound_end_in_one_step présent
nice -n 10 cargo test -p roomboard-core -j 4 --lib linear:: 2>&1 | tail -5     # elbow_route_is_orthogonal_and_short présent
node ~/.claude/scripts/vm/suite-vm.cjs -- bash -c 'nice -n 10 cargo test --workspace -j 4 2>&1 | grep -E "^test result|FAILED|error\[" | tail -40'
```
Tests à garder verts : `tests/pot.rs` (murs courbes, effet 5), `tests/compat_c3.rs` (copie, groupes), `tests/scenarios.rs`,
`tests/look.rs` — aucun « FAILED ».

**Contraintes (recopiées).**
- GC1 : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`, `export CARGO_TARGET_DIR=<wt>/target`, `nice -n 10`, `cargo … -j 4`,
  suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; aucun `tauri build`.
- GC2 : module principal ≤ 1 572 864 o, formats ≤ 3 145 728 o ; mesure en fin de tâche.
- GC3 : aucun test désactivé, sauté ou affaibli ; aucun seuil relevé.
- GC4 : `git add` fichier par fichier, auteur `jejeasterix`, message anglais avec `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC5 : `AddLinked` se pilote par la CLI (T10 l'expose) ; sa vue et ses refus sont ceux écrits ici.
- GC6 : la route simple est adaptée de `getSimpleRoute` d'Excalidraw (`packages/element/src/elbowArrow.ts:1433`) et
  `AddLinked` de `flowchart.ts` (`addNewNodes`, `createBindingArrow`) : compléter la mention MIT en tête de `linear.rs`.
- GC8 : aucun champ neutre écrit ; aucun `boundElements`.
- GC9 : `cargo fmt --all --check`, `cargo clippy --workspace --all-targets -j 4 -- -D warnings` verts.

**Interdits.** Pas d'A* ni d'évitement d'obstacles ; pas de segments fixes (lot 2) ; pas de suivi pour `SetTableSizes`,
`SetImageParams`, lignes de tableau (H11, lot 2) ; ne pas réécrire une flèche dont la cible a été supprimée (n° 9).

**Terminé quand.** Commandes bornées vertes, taille Wasm au rapport, rapport avec `Réutilisation : appelé
copy_elements/copy_prelims, hit_test (géométries par bind_box)` ou l'écart et sa raison.

**Étapes.**

- [ ] **1. Tests d'abord** — à la suite de `tests/fleches.rs` (aides de T1 réutilisées) :
```rust
fn mv(d: &mut Document, ids: &[&String], dx: f64, dy: f64) {
    d.apply(Command::Transform { ids: ids.iter().map(|s| (*s).clone()).collect(), matrix: [1.0, 0.0, 0.0, 1.0, dx, dy] })
        .expect("déplacer");
}
fn linked_arrow(d: &mut Document) -> (String, String, String) {
    let a = rect(d, 0.0, 0.0);
    let b = rect(d, 400.0, 0.0);
    let line = LineInit { points: vec![], start: bind(&a, 1.0, 0.5), end: bind(&b, 0.0, 0.5) };
    let f = shape(d, ShapeKind::Arrow, [100.0, 25.0, 400.0, 25.0], line).expect("flèche");
    (a, b, f)
}

/// S1, effet de bord 2 : B déplacé de 200 : la fin suit à 7 du contour ; annuler une fois rend B et la flèche.
#[test]
fn moving_target_moves_bound_end_in_one_step() {
    let mut d = Document::blank();
    let (_a, b, f) = linked_arrow(&mut d);
    let before = view(&d, &f);
    mv(&mut d, &[&b], 0.0, 200.0);
    let w = world(&d, &f);
    assert!(near(w[1], (393.0, 225.0)), "fin suivie : {:?}", w[1]);
    assert!(near(w[0], (107.0, 25.0)), "départ inchangé");
    assert!(d.undo());
    assert_eq!(view(&d, &f), before);
}

/// Effet de bord 3, n° 8 : flèche seule : rompue aux deux bouts ; flèche + A : fin rompue, départ gardé ; flèche + A + B :
/// tout gardé.
#[test]
fn moving_arrow_alone_unbinds_end_by_end() {
    let mut d = Document::blank();
    let (a, b, f) = linked_arrow(&mut d);
    mv(&mut d, &[&f, &a], 0.0, 50.0);
    let v = view(&d, &f);
    assert_eq!(v["shape"]["start"]["id"], a.as_str());
    assert!(v["shape"].get("end").is_none());
    d.undo();
    mv(&mut d, &[&f, &a, &b], 30.0, 0.0);
    let v = view(&d, &f);
    assert!(v["shape"].get("start").is_some() && v["shape"].get("end").is_some());
    d.undo();
    mv(&mut d, &[&f], 0.0, 80.0);
    let v = view(&d, &f);
    assert!(v["shape"].get("start").is_none() && v["shape"].get("end").is_none());
}

/// Review Focus 2, n° 9 : cible supprimée : lue libre, forme gardée, rien d'écrit sur la flèche ; annuler : liée.
#[test]
fn deleted_target_reads_free_and_undo_restores() {
    let mut d = Document::blank();
    let (_a, b, f) = linked_arrow(&mut d);
    let w0 = world(&d, &f);
    d.apply(Command::Delete { ids: vec![b.clone()] }).expect("supprimer");
    let v = view(&d, &f);
    assert!(v["shape"].get("end").is_none());
    assert_eq!(world(&d, &f), w0);
    d.undo();
    assert_eq!(view(&d, &f)["shape"]["end"]["id"], b.as_str());
}

/// S4, effet de bord 6, n° 10 : copie avec ses deux cibles liée aux copies ; copie seule libre.
#[test]
fn duplicate_with_targets_rebinds_to_copies_alone_frees() {
    let mut d = Document::blank();
    let (a, b, f) = linked_arrow(&mut d);
    let p = page(&d);
    let frag = d.extract(&p, &[a.clone(), b.clone(), f.clone()]).expect("extrait");
    let ch = d.insert_fragment(&frag, &p, 10.0, 10.0).expect("coller");
    let [ca, cb, cf] = [&ch.ids[0], &ch.ids[1], &ch.ids[2]];
    let v = view(&d, cf);
    assert_eq!(v["shape"]["start"]["id"], ca.as_str());
    assert_eq!(v["shape"]["end"]["id"], cb.as_str());
    let alone = d.extract(&p, &[f.clone()]).expect("extrait seul");
    let ch = d.insert_fragment(&alone, &p, 10.0, 10.0).expect("coller seul");
    let v = view(&d, &ch.ids[0]);
    assert!(v["shape"].get("start").is_none() && v["shape"].get("end").is_none());
}

/// Carte d'impact 3.1 : la duplication de page renvoie les liaisons vers les copies de la page.
#[test]
fn duplicate_page_rebinds_bindings() {
    let mut d = Document::blank();
    let (_a, _b, _f) = linked_arrow(&mut d);
    let p = page(&d);
    d.apply(Command::DuplicatePage { page: p }).expect("dupliquer la page");
    let q = d.page_ids()[1].clone();
    let ids = d.element_ids(&q);
    let v = view(&d, &ids[2]);
    assert_eq!(v["shape"]["start"]["id"], ids[0].as_str());
    assert_eq!(v["shape"]["end"]["id"], ids[1].as_str());
}

/// n° 7 : SetText qui élargit un texte lié recale l'extrémité dans la même étape.
#[test]
fn text_box_change_moves_bound_end() {
    let mut d = Document::blank();
    let p = page(&d);
    let text = |d: &mut Document, id: Option<String>, w: f64| {
        d.apply(Command::SetText {
            page: p.clone(), id, x: 0.0, y: 0.0, content: "nœud".into(), color: "#000000".into(), size: 36.0,
            box_width: w, box_height: 50.0, spans: None, look: Look::default(),
        })
        .expect("texte")
    };
    let t = text(&mut d, None, 100.0).ids[0].clone();
    let line = LineInit { points: vec![], start: None, end: bind(&t, 1.0, 0.5) };
    let f = shape(&mut d, ShapeKind::Line, [300.0, 25.0, 100.0, 25.0], line).expect("ligne");
    assert!(near(world(&d, &f)[1], (105.0, 25.0)), "écart 5 + 0 pour un texte");
    text(&mut d, Some(t.clone()), 200.0);
    assert!(near(world(&d, &f)[1], (205.0, 25.0)));
}

/// n° 17 : le plus petit objet qui contient le point passe devant ; près du contour : projeté ; ancres monde.
#[test]
fn bind_target_prefers_smaller_containing_and_projects_outline() {
    let mut d = Document::blank();
    let big = shape(&mut d, ShapeKind::Rect, [0.0, 0.0, 400.0, 400.0], LineInit::default()).expect("grand");
    let small = rect(&mut d, 100.0, 100.0); // (100,100)-(200,150)
    let p = page(&d);
    let h = d.bind_target(&p, 150.0, 120.0, 15.0).expect("cible");
    assert_eq!(h.id, small);
    assert!(!h.on_outline);
    let h = d.bind_target(&p, 395.0, 300.0, 15.0).expect("bord");
    assert_eq!(h.id, big);
    assert!(h.on_outline && (h.fixed[0] - 1.0).abs() < 1e-9 && (h.fixed[1] - 0.75).abs() < 1e-9);
    assert_eq!(h.anchors[1], [400.0, 200.0]);
    assert!(d.bind_target(&p, 900.0, 900.0, 15.0).is_none());
    let l = shape(&mut d, ShapeKind::Line, [600.0, 600.0, 700.0, 600.0], LineInit::default()).expect("ligne");
    assert!(d.bind_target(&p, 650.0, 600.0, 15.0).is_none_or(|h| h.id != l), "une ligne n'est pas accrochable");
}

/// S3, S5 : AddLinked à droite : copie à 100, flèche coudée liée aux deux, une étape ; place prise : glisse.
#[test]
fn add_linked_places_copy_and_elbow_arrow_in_one_step() {
    let mut d = Document::blank();
    let a = rect(&mut d, 0.0, 0.0);
    let n0 = d.element_ids(&page(&d)).len();
    let ch = d.apply(Command::AddLinked { id: a.clone(), dir: roomboard_core::linear::LinkDir::Right }).expect("relié");
    let (c, f) = (ch.ids[0].clone(), ch.ids[1].clone());
    assert_eq!(d.element_ids(&page(&d)).len(), n0 + 2);
    assert_eq!(view(&d, &c)["transform"][4], 200.0, "100 de large + 100");
    let v = view(&d, &f);
    assert_eq!(v["look"]["elbowed"], true);
    assert_eq!(v["shape"]["start"]["id"], a.as_str());
    assert_eq!(v["shape"]["end"]["id"], c.as_str());
    let w = world(&d, &f);
    assert!(w.windows(2).all(|s| (s[0].0 - s[1].0).abs() < 1e-9 || (s[0].1 - s[1].1).abs() < 1e-9), "orthogonale : {w:?}");
    let again = d.apply(Command::AddLinked { id: a.clone(), dir: roomboard_core::linear::LinkDir::Right }).expect("encore");
    let y = view(&d, &again.ids[0])["transform"][5].as_f64().unwrap();
    assert!(y >= 150.0, "glissée sous la première copie : {y}");
    assert!(d.undo());
    assert_eq!(d.element_ids(&page(&d)).len(), n0 + 2, "une étape");
    let l = shape(&mut d, ShapeKind::Line, [0.0, 500.0, 10.0, 500.0], LineInit::default()).expect("ligne");
    assert_eq!(d.apply(Command::AddLinked { id: l, dir: roomboard_core::linear::LinkDir::Up }), Err(CommandError::BadShape));
}

/// S3 : glisser le premier nœud reroute la coudée.
#[test]
fn moving_node_reroutes_elbow_arrow() {
    let mut d = Document::blank();
    let a = rect(&mut d, 0.0, 0.0);
    let ch = d.apply(Command::AddLinked { id: a.clone(), dir: roomboard_core::linear::LinkDir::Right }).expect("relié");
    mv(&mut d, &[&a], 0.0, 300.0);
    let w = world(&d, &ch.ids[1]);
    assert!(near(w[0], (107.0, 325.0)), "départ suivi : {:?}", w[0]);
    assert!(w.windows(2).all(|s| (s[0].0 - s[1].0).abs() < 1e-9 || (s[0].1 - s[1].1).abs() < 1e-9));
}

/// n° 12 c : passer à coudée reroute dans la même étape.
#[test]
fn set_style_elbowed_reroutes() {
    let mut d = Document::blank();
    let (_a, b, f) = linked_arrow(&mut d);
    mv(&mut d, &[&b], 0.0, 200.0);
    d.apply(Command::SetStyle { ids: vec![f.clone()], patch: StylePatch { elbowed: Some(Some(true)), ..StylePatch::default() } })
        .expect("coudée");
    let w = world(&d, &f);
    assert!(w.len() >= 4, "route à angles droits : {w:?}");
    assert!(w.windows(2).all(|s| (s[0].0 - s[1].0).abs() < 1e-9 || (s[0].1 - s[1].1).abs() < 1e-9));
}
```

- [ ] **2. Rouge** : `nice -n 10 cargo test -p roomboard-core -j 4 --test fleches 2>&1 | tail -5` — erreurs de compilation
  (`bind_target`, `AddLinked`, `LinkDir`).

- [ ] **3. `copy.rs`** : remplacer le corps de `copy_elements` par l'appel de `copy_prelims`, ajouter `copy_prelims`
  (imports : `crate::linear::End`, `HashSet` déjà importé) :
```rust
/// Recopies de `from` (lus dans `src`), sans écrire : id neuf, groupes renumérotés par `ids`, translation ; OG12 (n° 10) :
/// `startBound` / `endBound` renvoyés vers la copie de leur cible quand elle est copiée aussi, retirés avec leur `*Fixed`
/// sinon (`fixDuplicatedBindingsAfterDuplication` d'Excalidraw). Rend (id neuf, prélim), dans l'ordre.
pub(crate) fn copy_prelims<T: ReadTxn>(
    src: &T,
    from: &[MapRef],
    ids: &mut IdMap,
    dx: f64,
    dy: f64,
) -> Vec<(String, MapPrelim)> {
    let mut fresh: HashMap<String, String> = HashMap::new();
    let mut own: Vec<String> = Vec::with_capacity(from.len());
    for e in from {
        let id = yrs::uuid_v4().to_string();
        if let Some(old) = out_string(e.get(src, "id")) {
            fresh.entry(old).or_insert_with(|| id.clone());
        }
        own.push(id);
    }
    from.iter()
        .zip(own)
        .map(|(e, id)| {
            let mut prelim = e.as_prelim(src);
            prelim.insert("id".into(), In::from(id.as_str()));
            if let Some(g) = prelim.get("group").and_then(|g| renumber(g, ids)) {
                prelim.insert("group".into(), g);
            }
            if dx != 0.0 || dy != 0.0 {
                if let Some(mut t) = out_transform(e.get(src, "transform")) {
                    t[4] += dx;
                    t[5] += dy;
                    prelim.insert("transform".into(), In::Any(transform_to_any(&t)));
                }
            }
            for end in [End::Start, End::End] {
                let Some(old) = out_string(e.get(src, end.bound_key())) else { continue };
                match fresh.get(&old) {
                    Some(n) => {
                        prelim.insert(end.bound_key().into(), In::from(n.as_str()));
                    }
                    None => {
                        prelim.remove(end.bound_key());
                        prelim.remove(end.fixed_key());
                    }
                }
            }
            (id, prelim)
        })
        .collect()
}

pub(crate) fn copy_elements<T: ReadTxn>(src: &T, from: &[MapRef], dst: &mut TransactionMut, into: &ArrayRef, ids: &mut IdMap, dx: f64, dy: f64) -> Vec<String> {
    let mut out = Vec::with_capacity(from.len());
    for (id, prelim) in copy_prelims(src, from, ids, dx, dy) {
        let n = into.len(dst);
        into.insert(dst, n, prelim);
        out.push(id);
    }
    out
}
```
  (Le dédoublonnage `or_insert_with` garde la première occurrence d'un id répété : chaque recopie a toujours un id neuf
  qui lui est propre.)

- [ ] **4. `linear.rs` — route coudée** (compléter l'en-tête : « Route simple adaptée de `getSimpleRoute`
  (packages/element/src/elbowArrow.ts) et objet relié de `addNewNodes` / `createBindingArrow`
  (packages/element/src/flowchart.ts) d'Excalidraw, même licence ») :
```rust
/// Marge de sortie d'une flèche coudée (`BASE_PADDING` d'Excalidraw).
pub const ELBOW_PADDING: f64 = 40.0;

/// Bout d'une coudée : point monde et normale sortante (axe dominant), `None` pour un bout libre.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ElbowEnd {
    pub p: (f64, f64),
    pub normal: Option<(f64, f64)>,
}

fn toward(from: (f64, f64), to: (f64, f64)) -> (f64, f64) {
    let (dx, dy) = (to.0 - from.0, to.1 - from.1);
    if dx.abs() >= dy.abs() {
        (if dx < 0.0 { -1.0 } else { 1.0 }, 0.0)
    } else {
        (0.0, if dy < 0.0 { -1.0 } else { 1.0 })
    }
}

/// Route simple (n° 11, DA-3) : sortie perpendiculaire au côté lié (vers l'autre bout si libre), en Z quand les deux
/// sorties se font face sur le même axe, sinon sortie à 40, un coude, entrée à 40 ; au plus 5 segments, sans A*.
pub fn elbow_route(a: ElbowEnd, b: ElbowEnd) -> Vec<(f64, f64)> {
    let da = a.normal.unwrap_or_else(|| toward(a.p, b.p));
    let db = b.normal.unwrap_or_else(|| toward(b.p, a.p));
    let horiz = |d: (f64, f64)| d.0 != 0.0;
    let mut pts = vec![a.p];
    if horiz(da) && horiz(db) && da.0 * (b.p.0 - a.p.0) > 0.0 && db.0 * (a.p.0 - b.p.0) > 0.0 {
        let mx = (a.p.0 + b.p.0) / 2.0;
        pts.extend([(mx, a.p.1), (mx, b.p.1)]);
    } else if !horiz(da) && !horiz(db) && da.1 * (b.p.1 - a.p.1) > 0.0 && db.1 * (a.p.1 - b.p.1) > 0.0 {
        let my = (a.p.1 + b.p.1) / 2.0;
        pts.extend([(a.p.0, my), (b.p.0, my)]);
    } else {
        let ea = (a.p.0 + da.0 * ELBOW_PADDING, a.p.1 + da.1 * ELBOW_PADDING);
        let eb = (b.p.0 + db.0 * ELBOW_PADDING, b.p.1 + db.1 * ELBOW_PADDING);
        let c = if horiz(da) { (ea.0, eb.1) } else { (eb.0, ea.1) };
        pts.extend([ea, c, eb]);
    }
    pts.push(b.p);
    simplify(pts)
}

/// Points confondus et points alignés sur un même axe retirés (les bouts restent).
fn simplify(pts: Vec<(f64, f64)>) -> Vec<(f64, f64)> {
    let mut out: Vec<(f64, f64)> = Vec::with_capacity(pts.len());
    for p in pts {
        if out.last().is_some_and(|q| (q.0 - p.0).abs() < 1e-9 && (q.1 - p.1).abs() < 1e-9) {
            continue;
        }
        if out.len() >= 2 {
            let (a, b) = (out[out.len() - 2], out[out.len() - 1]);
            let same_x = (a.0 - b.0).abs() < 1e-9 && (b.0 - p.0).abs() < 1e-9;
            let same_y = (a.1 - b.1).abs() < 1e-9 && (b.1 - p.1).abs() < 1e-9;
            if same_x || same_y {
                out.pop();
            }
        }
        out.push(p);
    }
    out
}

/// Normale monde sortante du côté le plus proche du rapport `fixed` (haut, droite, bas, gauche), ramenée à l'axe dominant.
pub(crate) fn side_normal(b: &BindBox, fixed: [f64; 2]) -> (f64, f64) {
    let d = [fixed[1], 1.0 - fixed[0], 1.0 - fixed[1], fixed[0]];
    let k = (0..4).min_by(|i, j| d[*i].total_cmp(&d[*j])).unwrap_or(0);
    let local = [(0.0, -1.0), (1.0, 0.0), (0.0, 1.0), (-1.0, 0.0)][k];
    let (x, y) = (b.t[0] * local.0 + b.t[2] * local.1, b.t[1] * local.0 + b.t[3] * local.1);
    toward((0.0, 0.0), (x, y))
}
```
  Tests unitaires dans le module `tests` de `linear.rs` :
```rust
    #[test]
    fn elbow_route_is_orthogonal_and_short() {
        let r = elbow_route(ElbowEnd { p: (107.0, 25.0), normal: Some((1.0, 0.0)) }, ElbowEnd { p: (393.0, 225.0), normal: Some((-1.0, 0.0)) });
        assert_eq!(r, vec![(107.0, 25.0), (250.0, 25.0), (250.0, 225.0), (393.0, 225.0)]);
        let r = elbow_route(ElbowEnd { p: (0.0, 0.0), normal: Some((1.0, 0.0)) }, ElbowEnd { p: (-200.0, 300.0), normal: Some((0.0, -1.0)) });
        assert!(r.len() <= 6 && r.windows(2).all(|s| s[0].0 == s[1].0 || s[0].1 == s[1].1), "{r:?}");
        let free = elbow_route(ElbowEnd { p: (0.0, 0.0), normal: None }, ElbowEnd { p: (100.0, 0.0), normal: None });
        assert_eq!(free, vec![(0.0, 0.0), (100.0, 0.0)]);
    }
```

- [ ] **5. `linear.rs` — suivi, reroutage** (imports : `std::collections::HashSet`, `yrs::{Array, TransactionMut}`,
  `crate::element::compose`, `crate::fill::set_or_remove`) :
```rust
/// Bouts monde d'une ligne lue, sa matrice et ses champs.
fn world_of(t: &Transform, s: &ShapeFields) -> Vec<(f64, f64)> {
    path(s).into_iter().map(|(x, y)| apply_transform(t, x, y)).collect()
}

/// Bout coudé : ancre et normale du côté lié, ou point libre.
fn elbow_end<T: ReadTxn>(doc: &Document, txn: &T, b: Option<&BindInput>, p: (f64, f64)) -> ElbowEnd {
    let target = b.and_then(|b| doc.find_element(txn, &b.id).and_then(|f| bind_box(txn, &f.element)).map(|bx| (b, bx)));
    match target {
        Some((b, bx)) => ElbowEnd { p: anchor(&bx, [b.fx, b.fy]), normal: Some(side_normal(&bx, [b.fx, b.fy])) },
        None => ElbowEnd { p, normal: None },
    }
}

/// Géométrie recalculée d'une ligne (n° 7, 11) : bouts liés recalés sur leur ancre (cible présente), coudée reroutée.
fn settle<T: ReadTxn>(doc: &Document, txn: &T, s: &ShapeFields, mut world: Vec<(f64, f64)>, start: Option<&BindInput>, end: Option<&BindInput>) -> Vec<(f64, f64)> {
    let last = world.len() - 1;
    let a = elbow_end(doc, txn, start, world[0]);
    let b = elbow_end(doc, txn, end, world[last]);
    if s.elbowed {
        return elbow_route(a, b);
    }
    world[0] = a.p;
    world[last] = b.p;
    world
}

/// Applique les écritures d'une ligne (seules celles qui changent).
fn write_line(txn: &mut TransactionMut, e: &MapRef, t: &Transform, world: &[(f64, f64)], start: Option<&BindInput>, end: Option<&BindInput>) -> bool {
    let Ok(writes) = line_writes(t, world, start, end) else { return false };
    let mut any = false;
    for (k, v) in writes {
        any |= set_or_remove(e, txn, k, v);
    }
    any
}

/// Suivi et rupture (n° 7, 8), dans la transaction de la commande qui a bougé `moved` ; `m` : matrice du `Transform`
/// (`None` : boîte d'un texte changée). Rend les ids réécrits (Change).
pub(crate) fn follow(doc: &Document, txn: &mut TransactionMut, moved: &[String], m: Option<&Transform>) -> Vec<String> {
    let moved: HashSet<&str> = moved.iter().map(String::as_str).collect();
    let mut work: Vec<(MapRef, String, Transform, ShapeFields)> = Vec::new();
    for page in doc.pages_ref().iter(&*txn) {
        let Out::YMap(pm) = page else { continue };
        let Some(Out::YArray(els)) = pm.get(&*txn, "elements") else { continue };
        for o in els.iter(&*txn) {
            let Out::YMap(e) = o else { continue };
            let Some(s) = read_shape(&*txn, &e).filter(|s| s.kind.is_segment() && (s.start.is_some() || s.end.is_some())) else { continue };
            let (Some(id), Some(t)) = (out_string(e.get(&*txn, "id")), out_transform(e.get(&*txn, "transform"))) else { continue };
            work.push((e, id, t, s));
        }
    }
    let mut out = Vec::new();
    for (e, id, t, s) in work {
        let in_moved = |b: &Option<BindInput>| b.as_ref().is_some_and(|b| moved.contains(b.id.as_str()));
        let (sm, em) = (in_moved(&s.start), in_moved(&s.end));
        let (start, end) = if moved.contains(id.as_str()) {
            (s.start.clone().filter(|_| sm), s.end.clone().filter(|_| em))
        } else if sm || em {
            (s.start.clone(), s.end.clone())
        } else {
            continue;
        };
        let mut world = world_of(&t, &s);
        if let (false, true, true, Some(m)) = (moved.contains(id.as_str()), sm, em, m) {
            let last = world.len() - 1;
            for p in &mut world[1..last] {
                *p = apply_transform(m, p.0, p.1);
            }
        }
        let world = settle(doc, &*txn, &s, world, start.as_ref(), end.as_ref());
        if write_line(txn, &e, &t, &world, start.as_ref(), end.as_ref()) {
            out.push(id);
        }
    }
    out
}

/// Reroutage d'une flèche qui vient de passer coudée (n° 12 c), dans la transaction de `SetStyle`.
pub(crate) fn reroute(doc: &Document, txn: &mut TransactionMut, e: &MapRef) {
    let (Some(s), Some(t)) = (read_shape(&*txn, e), out_transform(e.get(&*txn, "transform"))) else { return };
    let world = settle(doc, &*txn, &s, world_of(&t, &s), s.start.as_ref(), s.end.as_ref());
    write_line(txn, e, &t, &world, s.start.as_ref(), s.end.as_ref());
}
```
  `compose` n'est pas nécessaire si le compilateur le signale inutilisé : ne pas l'importer.

- [ ] **6. `linear.rs` — `AddLinked`** :
```rust
/// Écart entre un nœud et son objet relié (`VERTICAL_OFFSET` / `HORIZONTAL_OFFSET` d'Excalidraw).
pub const LINK_GAP: f64 = 100.0;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LinkDir {
    Up,
    Down,
    Left,
    Right,
}

impl LinkDir {
    pub fn parse(s: &str) -> Option<LinkDir> {
        Some(match s {
            "up" => LinkDir::Up,
            "down" => LinkDir::Down,
            "left" => LinkDir::Left,
            "right" => LinkDir::Right,
            _ => return None,
        })
    }
    fn unit(self) -> (f64, f64) {
        match self {
            LinkDir::Up => (0.0, -1.0),
            LinkDir::Down => (0.0, 1.0),
            LinkDir::Left => (-1.0, 0.0),
            LinkDir::Right => (1.0, 0.0),
        }
    }
    /// Milieu du côté de la source qui regarde la direction ; le côté opposé de la copie est `(1 - fx, 1 - fy)`.
    fn ratio(self) -> [f64; 2] {
        match self {
            LinkDir::Up => [0.5, 0.0],
            LinkDir::Down => [0.5, 1.0],
            LinkDir::Left => [0.0, 0.5],
            LinkDir::Right => [1.0, 0.5],
        }
    }
}

/// Boîte monde alignée d'une boîte d'accroche.
fn world_box(b: &BindBox) -> (f64, f64, f64, f64) {
    let c = [(0.0, 0.0), (b.w, 0.0), (b.w, b.h), (0.0, b.h)].map(|(x, y)| apply_transform(&b.t, x, y));
    let xs = c.map(|p| p.0);
    let ys = c.map(|p| p.1);
    let min = |v: [f64; 4]| v.iter().copied().fold(f64::INFINITY, f64::min);
    let max = |v: [f64; 4]| v.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    (min(xs), min(ys), max(xs), max(ys))
}

impl Document {
    /// `AddLinked` (n° 27, DA-4) : plan sous une lecture fermée (copie par `copy_prelims`), puis une seule `transact_local`.
    pub(crate) fn cmd_add_linked(&mut self, id: &str, dir: LinkDir) -> Result<Change, CommandError> {
        let (page, into, copy_id, copy, arrow) = {
            let txn = self.read();
            let found = self.find_element(&txn, id).ok_or_else(|| CommandError::UnknownElement(id.to_string()))?;
            let s = read_shape(&txn, &found.element)
                .filter(|s| matches!(s.kind, ShapeKind::Rect | ShapeKind::Ellipse))
                .ok_or(CommandError::BadShape)?;
            let src = bind_box(&txn, &found.element).ok_or(CommandError::BadShape)?;
            let into = self.page_elements(&txn, &found.page_id).ok_or_else(|| CommandError::UnknownPage(found.page_id.clone()))?;
            let others: Vec<(f64, f64, f64, f64)> = into
                .iter(&txn)
                .filter_map(|o| match o { Out::YMap(e) => Some(e), _ => None })
                .filter_map(|e| bind_box(&txn, &e))
                .filter(|b| b.id != id)
                .map(|b| world_box(&b))
                .collect();
            let (x0, y0, x1, y1) = world_box(&src);
            let (sw, sh) = (x1 - x0, y1 - y0);
            let (ux, uy) = dir.unit();
            let (mut dx, mut dy) = (ux * (sw + LINK_GAP), uy * (sh + LINK_GAP));
            let hits = |dx: f64, dy: f64| others.iter().any(|o| x0 + dx < o.2 && x1 + dx > o.0 && y0 + dy < o.3 && y1 + dy > o.1);
            for _ in 0..64 {
                if !hits(dx, dy) {
                    break;
                }
                if ux != 0.0 { dy += sh + LINK_GAP } else { dx += sw + LINK_GAP }
            }
            let mut prelims = crate::copy::copy_prelims(&txn, std::slice::from_ref(&found.element), &mut Default::default(), dx, dy);
            let (copy_id, mut copy) = prelims.remove(0);
            copy.remove("group");
            let dst = BindBox { id: copy_id.clone(), t: [src.t[0], src.t[1], src.t[2], src.t[3], src.t[4] + dx, src.t[5] + dy], ..src.clone() };
            let [fx, fy] = dir.ratio();
            let start = BindInput { id: id.to_string(), fx, fy };
            let end = BindInput { id: copy_id.clone(), fx: 1.0 - fx, fy: 1.0 - fy };
            let route = elbow_route(
                ElbowEnd { p: anchor(&src, [fx, fy]), normal: Some((ux, uy)) },
                ElbowEnd { p: anchor(&dst, [end.fx, end.fy]), normal: Some((-ux, -uy)) },
            );
            let arrow = linked_arrow_fields(&route, &s.style, &start, &end)?;
            (found.page_id, into, copy_id, copy, arrow)
        };
        let arrow_id = arrow.0.clone();
        {
            let mut txn = self.transact_local();
            let n = into.len(&txn);
            into.insert(&mut txn, n, copy);
            into.push_back(&mut txn, arrow.1);
        }
        Ok(self.done(Change { pages: vec![page], ids: vec![copy_id, arrow_id], ..Default::default() }))
    }
}

/// Champs de la flèche coudée d'`AddLinked` : comme `cmd_add_shape`, `elbowed: true`, liaisons et points de la route.
fn linked_arrow_fields(route: &[(f64, f64)], style: &crate::element::StrokeStyle, start: &BindInput, end: &BindInput) -> Result<(String, yrs::MapPrelim), CommandError> {
    let id = yrs::uuid_v4().to_string();
    let mut fields: Vec<(&str, In)> = vec![
        ("id", In::from(id.as_str())),
        ("kind", In::from("shape")),
        ("shape", In::from("arrow")),
        ("color", In::from(style.color.as_str())),
        ("width", In::Any(Any::from(f64::from(style.width)))),
    ];
    for (k, v) in line_writes(&crate::element::IDENTITY, route, Some(start), Some(end))? {
        if let Some(v) = v {
            fields.push((k, v));
        }
    }
    fields.push(("elbowed", In::Any(Any::Bool(true))));
    Ok((id, fields.into_iter().collect()))
}
```
  L'ordre des clés d'un `MapPrelim` ne compte pas pour les octets (yrs ordonne à l'encodage) : seule l'absence des neutres
  compte (GC8).

- [ ] **7. `query.rs` — `bind_target`** (après `hit_test` ; imports `crate::linear::{bind_box, BindBox, ANCHOR_RATIOS}`,
  `crate::element::invert`) :
```rust
/// Cible d'accroche (OG12, n° 17, 18) : objet accrochable, rapport de sa boîte, sur le contour ou dedans, et ses quatre
/// ancres monde (milieux des côtés, sans écart).
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BindHit {
    pub id: String,
    pub fixed: [f64; 2],
    pub on_outline: bool,
    pub anchors: [[f64; 2]; 4],
}

/// Point du contour le plus proche de `q` (local), sa distance locale, et `q` dedans.
fn nearest_outline(b: &BindBox, q: (f64, f64)) -> ((f64, f64), f64, bool) {
    if b.ellipse {
        let (cx, cy) = (b.w / 2.0, b.h / 2.0);
        let r = (((q.0 - cx) / cx).powi(2) + ((q.1 - cy) / cy).powi(2)).sqrt();
        let p = if r < 1e-12 { (cx, 0.0) } else { (cx + (q.0 - cx) / r, cy + (q.1 - cy) / r) };
        return (p, (q.0 - p.0).hypot(q.1 - p.1), r <= 1.0);
    }
    let inside = (0.0..=b.w).contains(&q.0) && (0.0..=b.h).contains(&q.1);
    let p = if inside {
        let d = [q.1, b.w - q.0, b.h - q.1, q.0];
        match (0..4).min_by(|i, j| d[*i].total_cmp(&d[*j])).unwrap_or(0) {
            0 => (q.0, 0.0),
            1 => (b.w, q.1),
            2 => (q.0, b.h),
            _ => (0.0, q.1),
        }
    } else {
        (q.0.clamp(0.0, b.w), q.1.clamp(0.0, b.h))
    };
    (p, (q.0 - p.0).hypot(q.1 - p.1), inside)
}

impl Document {
    pub fn bind_target(&self, page: &str, x: f64, y: f64, tol: f32) -> Option<BindHit> {
        struct Cand { area: f64, dist: f64, contains: bool, near: bool, hit: BindHit }
        let txn = self.read();
        let elements = self.page_elements(&txn, page)?;
        let mut cands: Vec<Cand> = Vec::new();
        for o in elements.iter(&txn) {
            let Out::YMap(e) = o else { continue };
            let Some(b) = bind_box(&txn, &e) else { continue };
            let Some(inv) = invert(&b.t) else { continue };
            let q = apply_transform(&inv, x, y);
            let scale = (b.t[0] * b.t[3] - b.t[1] * b.t[2]).abs().sqrt().max(1e-12);
            let (p, d_local, contains) = nearest_outline(&b, q);
            let near = d_local * scale <= f64::from(tol);
            if !near && !contains {
                continue;
            }
            let fixed = if near { [p.0 / b.w, p.1 / b.h] } else { [q.0 / b.w, q.1 / b.h] };
            let anchors = ANCHOR_RATIOS.map(|r| {
                let (ax, ay) = apply_transform(&b.t, r[0] * b.w, r[1] * b.h);
                [ax, ay]
            });
            cands.push(Cand { area: b.w * b.h * scale * scale, dist: d_local * scale, contains, near, hit: BindHit { id: b.id.clone(), fixed, on_outline: near, anchors } });
        }
        // Le plus petit qui contient le point passe devant le plus proche du contour, s'il est plus petit que lui.
        let inside = cands.iter().filter(|c| c.contains).min_by(|a, b| a.area.total_cmp(&b.area));
        let nearest = cands.iter().filter(|c| c.near).min_by(|a, b| a.dist.total_cmp(&b.dist));
        let pick = match (inside, nearest) {
            (Some(i), Some(n)) => if i.area < n.area || i.hit.id == n.hit.id { i } else { n },
            (Some(i), None) => i,
            (None, Some(n)) => n,
            (None, None) => return None,
        };
        Some(pick.hit.clone())
    }
}
```
  Note : quand le plus petit contenant est aussi celui dont le contour est proche (`i.hit.id == n.hit.id`), `pick = i`
  porte `on_outline` et `fixed` projetés (calculés plus haut avec `near`).

- [ ] **8. `commands.rs`** :
  - Variante `AddLinked { id: String, dir: crate::linear::LinkDir }` (doc : « OG12 (n° 27, DA-4) : copie d'un rectangle ou
    d'une ellipse et flèche coudée liée aux deux, une étape ») ; dans `apply` :
    `Command::AddLinked { id, dir } => self.cmd_add_linked(&id, dir),`.
  - `cmd_transform`, dans le bloc d'écriture, après la boucle des matrices :
```rust
            let moved: Vec<String> = targets.iter().map(|t| t.3.clone()).collect();
            followed = crate::linear::follow(self, &mut txn, &moved, Some(m));
```
    avec `let mut followed: Vec<String> = Vec::new();` déclaré avant le bloc ; `ids` du `Change` = les ids déplacés
    suivis de `followed` (sans doublon), `pages` inchangé (les lignes suivies sont sur les pages de leurs cibles).
  - `cmd_set_text` : dans chaque bloc `let mut txn = self.transact_local();` qui écrit un texte **existant** (branche où
    `t.id` est `Some`, hors retrait du texte vidé), en dernière instruction du bloc :
    `crate::linear::follow(self, &mut txn, &[id.to_string()], None);`. `cmd_format_text` : même ligne en dernière
    instruction de son bloc d'écriture, quand `height` est `Some`.
  - `cmd_set_line_points` : remplacer le commentaire laissé par T1 par
    `if _s.elbowed { world = linear::settle_route(self, &txn, &_s, world, a.as_ref().map(|x| &x.0), b.as_ref().map(|x| &x.0)); }`
    — et exposer dans `linear.rs` `pub(crate) fn settle_route<T: ReadTxn>(…) -> Vec<(f64, f64)>` qui appelle `settle`
    (renommer `_s` en `s`).

- [ ] **9. `style.rs`** : dans `cmd_set_style`, collecter `let mut reroute: Vec<MapRef> = Vec::new();` et, quand `switched`
  et `want == Some(true)`, `reroute.push(e.clone())` ; dans le bloc d'écriture, après la boucle `set_or_remove` :
  `for e in &reroute { crate::linear::reroute(self, &mut txn, e); }`.

- [ ] **10. Vert** : les commandes bornées ; `cargo fmt --all --check` ; `nice -n 10 cargo clippy --workspace --all-targets -j 4 -- -D warnings 2>&1 | tail -3`.

- [ ] **11. Taille Wasm** : mêmes trois commandes que T1 étape 12 (`/tmp/og12-t4-wasm`) ; valeur ≤ 1 572 864 au rapport,
  avec l'écart à la mesure de T1.

- [ ] **12. Commit** (GC4) : fichiers un par un ; message `feat(core): binding follow, unbind, copy rebinding, bind_target, elbow route, AddLinked (OG12 T4)` + `Co-Authored-By`.

<a id="tache-t5"></a>
### Tâche T5 — Faux cœur : miroir des lignes et des liaisons

**Objectif.** `fake-core.ts` reproduit T1 et T4 (mêmes vues, mêmes refus dans le même ordre, une étape par commande),
route coudée exceptée (DA-3) : les outils (T8, T9) et le contrat commun (T10) s'y appuient.

**Scénarios servis.** S1 (suivi, annuler), S3 (`AddLinked`, glissement), S4 (Ctrl+D lié aux copies, libre seul).

**Patron à ne pas reprendre.** `copyElement(e, groups, dx, dy)` (`fake-core.ts:589-603`) recopie un élément à la fois :
appelé tel quel, il ne peut pas renvoyer une liaison vers la copie d'un autre élément du lot. Écrire `copyElements(list,
groups, dx, dy)` qui tire d'abord la table ancien → neuf du lot, puis renumérote `start` / `end`, et l'appeler depuis
`extract`, `insertFragment`, `insertPages` et `DuplicatePage` (`fake-core.ts:912`, `:1834-1870`). Ne pas écrire de route
coudée « à peu près » : une flèche coudée du faux cœur garde ses seuls bouts (écart assumé, ligne d'en-tête du fichier).

**Fichiers.** Modifier : `apps/web/src/core/fake-core.ts`. Créer : `apps/web/src/core/fake-lines.test.ts`.

**Interfaces.**
- Consomme (T2) : `api.ts` (`LineBinding`, `BindHit`, `LinkDir`, `SetLinePoints`, `AddLinked`, champs d'`AddShape`),
  `shapes.ts` (`linePath`, `lineGeomOf`, `shapePolygon(…, line)`, `anchorPoint`, `bindGap`, `ANCHOR_RATIOS`,
  `MAX_INNER_POINTS`, `BIND_RATIO_MAX`, `BindBox`), `look.ts` (`elbowedOf`, `ARROWHEADS`).
- Règles (copie exacte de T1 et T4, sections « Ordre des refus » et « Règles écrites ») : refus d'`AddShape` et de
  `SetLinePoints` dans le même ordre ; messages : `MESSAGES.badShape`, `MESSAGES.badWidth`, `"points invalides"` (celui du
  faux cœur d'aujourd'hui), `élément inconnu : <id>` ; suivi, rupture, copie, `AddLinked` (placement et glissement
  identiques, flèche `elbowed` **sans** points intérieurs), `SetStyle` (`roundness` sur `line`/`arrow`, `elbowed` sur
  `arrow` qui vide `points` quand il change, pointes à 7 valeurs), `bindTarget` (même choix que `bind_target` :
  le plus petit contenant passe devant le plus proche s'il est plus petit, ou s'il est le même).
- Produit : `FakeDocument.bindTarget(page, x, y, tol): BindHit | null` ; `element(id)` rend `shape.start` / `shape.end`
  seulement si la cible existe ; sauvegarde et relecture JSON gardent `shape.points`, `shape.start`, `shape.end`,
  `look.elbowed` (la forme est déjà recopiée en bloc : `fake-core.ts:2020`, `:2201`).

**Test et commande bornée** :
```bash
cd <wt> && pnpm install --frozen-lockfile >/dev/null
pnpm --filter @roomboard/web exec vitest run src/core/fake-lines.test.ts src/core/fake-core.test.ts 2>&1 | tail -5
# « Test Files  2 passed », ≥ 10 tests dans fake-lines, « suivi en une étape » nommé
```

**Contraintes (recopiées).**
- GC1 : `nice -n 10` pour les suites longues ; suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- GC3 : aucun test désactivé, sauté ou affaibli ; `fake-core.test.ts` vert sans retouche.
- GC4 : `git add` fichier par fichier, auteur `jejeasterix`, message anglais avec `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC6 : en-tête de `fake-core.ts` : ligne « OG12 : … écart assumé, exclu du contrat commun : la route coudée (une
  flèche coudée garde ses bouts) ; règles copiées de linear.rs, adaptées d'Excalidraw (MIT) ».
- GC8 : neutres jamais gardés (`points` vide retiré, `elbowed` seulement `true`).
- GC10 : `pnpm install --frozen-lockfile` avant le premier test.

**Interdits.** Ne pas toucher aux autres fichiers ; ne pas changer le comportement des commandes existantes hors
`AddShape`, `Transform`, `SetText`, `FormatText`, `SetStyle`, `extract`, `insertFragment`, `insertPages`, `DuplicatePage`.

**Terminé quand.** Commande bornée verte ; rapport `Réutilisation : appelé shapePolygon(…, line), anchorPoint, copyElement
(étendu en copyElements)`.

**Étapes.**

- [ ] **1. Tests d'abord** — `apps/web/src/core/fake-lines.test.ts` (patron de `fake-core.test.ts`, `fakeCore.blank()`) :
```ts
import { describe, expect, it } from "vitest";
import type { Command, CoreDocument, LineBinding } from "./api";
import { fakeCore } from "./fake-core";
import { applyMatrix, linePath } from "./shapes";

const PEN = { color: "#000000", width: 4 };
const rect = (d: CoreDocument, x: number, y: number): string =>
  d.apply({ type: "AddShape", page: d.pageIds()[0]!, shape: "rect", x0: x, y0: y, x1: x + 100, y1: y + 50, style: PEN, fill: null }).ids[0]!;
const add = (d: CoreDocument, shape: "line" | "arrow", c: [number, number, number, number], extra: Partial<Extract<Command, { type: "AddShape" }>> = {}): string =>
  d.apply({ type: "AddShape", page: d.pageIds()[0]!, shape, x0: c[0], y0: c[1], x1: c[2], y1: c[3], style: PEN, fill: null, ...extra }).ids[0]!;
const b = (id: string, fx: number, fy: number): LineBinding => ({ id, fx, fy });
function world(d: CoreDocument, id: string): [number, number][] {
  const v = d.element(id);
  if (v?.kind !== "shape") throw new Error("forme attendue");
  return linePath(v.shape.w, v.shape.h, v.shape.points ?? []).map(([x, y]) => applyMatrix(v.transform, x, y));
}
function linked(d: CoreDocument): [string, string, string] {
  const a = rect(d, 0, 0);
  const bb = rect(d, 400, 0);
  return [a, bb, add(d, "arrow", [100, 25, 400, 25], { start: b(a, 1, 0.5), end: b(bb, 0, 0.5) })];
}

describe("faux cœur OG12 : lignes et liaisons", () => {
  it("AddShape : extrémités recalées à 5 + épaisseur / 2, points intérieurs gardés", () => {
    const d = fakeCore.blank();
    const a = rect(d, 0, 0);
    const z = rect(d, 400, 0);
    const f = add(d, "arrow", [110, 25, 390, 25], { points: [250, -60], start: b(a, 1, 0.5), end: b(z, 0, 0.5) });
    expect(world(d, f)).toEqual([[107, 25], [250, -60], [393, 25]]);
  });
  it("suivi en une étape : B déplacé, la fin suit ; annuler rend tout", () => {
    const d = fakeCore.blank();
    const [, z, f] = linked(d);
    const before = d.element(f);
    d.apply({ type: "Transform", ids: [z], matrix: [1, 0, 0, 1, 0, 200] });
    expect(world(d, f)[1]).toEqual([393, 225]);
    d.undo();
    expect(d.element(f)).toEqual(before);
  });
  it("rupture bout par bout", () => {
    const d = fakeCore.blank();
    const [a, , f] = linked(d);
    d.apply({ type: "Transform", ids: [f, a], matrix: [1, 0, 0, 1, 0, 50] });
    const v = d.element(f);
    expect(v?.kind === "shape" && v.shape.start?.id === a && v.shape.end === undefined).toBe(true);
  });
  it("cible supprimée lue libre ; annuler : liée", () => {
    const d = fakeCore.blank();
    const [, z, f] = linked(d);
    d.apply({ type: "Delete", ids: [z] });
    const v = d.element(f);
    expect(v?.kind === "shape" && v.shape.end).toBeFalsy();
    d.undo();
    const w = d.element(f);
    expect(w?.kind === "shape" && w.shape.end?.id).toBe(z);
  });
  it("copie : liée aux copies avec ses cibles, libre seule", () => {
    const d = fakeCore.blank();
    const [a, z, f] = linked(d);
    const p = d.pageIds()[0]!;
    const all = d.insertFragment(d.extract(p, [a, z, f]), p, 10, 10).ids;
    const v = d.element(all[2]!);
    expect(v?.kind === "shape" && [v.shape.start?.id, v.shape.end?.id]).toEqual([all[0], all[1]]);
    const alone = d.insertFragment(d.extract(p, [f]), p, 10, 10).ids;
    const w = d.element(alone[0]!);
    expect(w?.kind === "shape" && (w.shape.start ?? w.shape.end)).toBeFalsy();
  });
  it("SetLinePoints : une étape ; refus dans l'ordre du cœur", () => {
    const d = fakeCore.blank();
    const r = rect(d, 0, 0);
    const l = add(d, "line", [0, 100, 200, 100]);
    d.apply({ type: "SetLinePoints", id: l, points: [0, 100, 100, 180, 200, 100], start: null, end: null });
    expect(world(d, l)[1]).toEqual([100, 180]);
    const set = (id: string, points: number[], end: LineBinding | null = null): Command => ({ type: "SetLinePoints", id, points, start: null, end });
    expect(() => d.apply(set(l, [1, 2]))).toThrow("points invalides");
    expect(() => d.apply(set("absent", [0, 0, 1, 1]))).toThrow("élément inconnu : absent");
    expect(() => d.apply(set(r, [0, 0, 1, 1]))).toThrow("forme invalide");
    expect(() => d.apply(set(l, [0, 0, 1, 1], b(l, 0, 0.5)))).toThrow("forme invalide");
  });
  it("AddLinked : copie à droite à +200, flèche coudée liée, une étape ; place prise : glisse dessous", () => {
    const d = fakeCore.blank();
    const a = rect(d, 0, 0);
    const [c, f] = d.apply({ type: "AddLinked", id: a, dir: "right" }).ids;
    expect(d.element(c!)?.transform[4]).toBe(200);
    const v = d.element(f!);
    expect(v?.kind === "shape" && v.look?.elbowed && v.shape.start?.id === a && v.shape.end?.id === c).toBe(true);
    const [c2] = d.apply({ type: "AddLinked", id: a, dir: "right" }).ids;
    expect(d.element(c2!)?.transform[5]).toBeGreaterThanOrEqual(150);
    d.undo();
    expect(d.elementIds(d.pageIds()[0]!)).toHaveLength(3);
  });
  it("bindTarget : plus petit contenant, contour projeté, ancres, ligne exclue", () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0]!;
    const big = d.apply({ type: "AddShape", page: p, shape: "rect", x0: 0, y0: 0, x1: 400, y1: 400, style: PEN, fill: null }).ids[0]!;
    const small = rect(d, 100, 100);
    expect(d.bindTarget(p, 150, 120, 15)).toMatchObject({ id: small, onOutline: false });
    expect(d.bindTarget(p, 395, 300, 15)).toMatchObject({ id: big, onOutline: true, fixed: [1, 0.75] });
    expect(d.bindTarget(p, 395, 300, 15)?.anchors[1]).toEqual([400, 200]);
    expect(d.bindTarget(p, 900, 900, 15)).toBeNull();
  });
  it("SetStyle : roundness sur la ligne, elbowed sur la flèche seule, pointes neuves", () => {
    const d = fakeCore.blank();
    const l = add(d, "line", [0, 0, 100, 0]);
    const f = add(d, "arrow", [0, 100, 100, 100], { points: [50, 140] });
    d.apply({ type: "SetStyle", ids: [l], patch: { roundness: "round" } });
    expect(d.element(l)?.look?.roundness).toBe("round");
    const v0 = d.version();
    d.apply({ type: "SetStyle", ids: [l], patch: { elbowed: true } });
    expect(d.version()).toBe(v0);
    d.apply({ type: "SetStyle", ids: [f], patch: { elbowed: true, endArrowhead: "circle" } });
    const v = d.element(f);
    expect(v?.kind === "shape" && v.look?.elbowed && v.look.endArrowhead === "circle" && v.shape.points === undefined).toBe(true);
  });
  it("SetText élargi : l'extrémité liée suit", () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0]!;
    const t = d.apply({ type: "SetText", page: p, id: null, x: 0, y: 0, content: "nœud", color: "#000000", size: 36, boxWidth: 100, boxHeight: 50 }).ids[0]!;
    const l = add(d, "line", [300, 25, 100, 25], { end: b(t, 1, 0.5) });
    expect(world(d, l)[1]).toEqual([105, 25]);
    d.apply({ type: "SetText", page: p, id: t, x: 0, y: 0, content: "nœud", color: "#000000", size: 36, boxWidth: 200, boxHeight: 50 });
    expect(world(d, l)[1]).toEqual([205, 25]);
  });
  it("hitTest suit la polyligne", () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0]!;
    const l = add(d, "line", [0, 0, 200, 0], { points: [100, -80] });
    expect(d.hitTest(p, 100, -79, 2)).toBe(l);
    expect(d.hitTest(p, 100, 0, 2)).toBeNull();
  });
});
```
  (Si `d.version()` n'est pas dans `CoreDocument`, comparer `d.apply(…).version` au `version` du `Change` précédent.)

- [ ] **2. Rouge** : la commande bornée — attendu : « commande non prise en charge : SetLinePoints », `bindTarget` null.

- [ ] **3. Aides** (au-dessus de la classe) :
```ts
/** OG12 : boîte d'accroche (miroir de `bind_box`) ; null pour un trait, une ligne, une flèche, un `fill`, un inconnu. */
function bindBoxOf(e: FakeElement): BindBox | null {
  if (e.malformed || e.unknown || e.fill || e.local !== undefined) return null;
  const box = (w: number, h: number, ellipse: boolean, width: number): BindBox | null =>
    positive(w) && positive(h) ? { id: e.id, m: e.transform, w, h, ellipse, gap: bindGap(width) } : null;
  if (e.shape) return isSegment(e.shape.shape) ? null : box(e.shape.w, e.shape.h, e.shape.shape === "ellipse", e.style.width);
  if (e.text) return box(e.text.boxWidth, e.text.boxHeight, false, 0);
  if (e.image) return box(...displaySize(e.image), false, 0);
  if (e.table) return box(tableWidth(e.table), tableHeight(e.table), false, 0);
  if (e.media) return box(e.media.w, e.media.h, false, 0);
  if (e.model3d) return box(e.model3d.w, e.model3d.h, false, 0);
  return null;
}
/** Points monde d'une ligne. */
const worldOf = (e: FakeElement): [number, number][] =>
  e.shape ? linePath(e.shape.w, e.shape.h, e.shape.points ?? []).map(([x, y]) => applyMatrix(e.transform, x, y)) : [];
/** Écriture d'une ligne (miroir de `line_writes`) : partie linéaire gardée, départ = premier point, points intérieurs
 *  locaux (absents s'il n'y en a pas), liaisons posées ou retirées ; null si la partie linéaire n'est pas inversible. */
function withLine(e: FakeElement, world: readonly (readonly [number, number])[], start: LineBinding | null, end: LineBinding | null): FakeElement | null {
  const s = e.shape;
  if (!s) return null;
  const [p0] = world;
  const inv = invertMatrix([e.transform[0], e.transform[1], e.transform[2], e.transform[3], 0, 0]);
  if (!p0 || !inv) return null;
  const local = world.map(([x, y]) => applyMatrix(inv, x - p0[0], y - p0[1]));
  const [w, h] = local[local.length - 1]!;
  const inner = local.slice(1, -1).flat();
  const { points: _p, start: _s, end: _e, ...rest } = s;
  return {
    ...e,
    transform: [e.transform[0], e.transform[1], e.transform[2], e.transform[3], p0[0], p0[1]],
    shape: { ...rest, w, h, ...(inner.length > 0 ? { points: inner } : {}), ...(start ? { start } : {}), ...(end ? { end } : {}) },
  };
}
```
  (`invertMatrix`, `linePath`, `anchorPoint`, `bindGap`, `ANCHOR_RATIOS`, `MAX_INNER_POINTS`, `BIND_RATIO_MAX`,
  `lineGeomOf` importés de `./shapes` ; `elbowedOf` de `./look`.) `worldPolygon` passe la ligne :
  `shapePolygon(e.shape.shape, e.shape.w, e.shape.h, e.style.width, lineGeomOf(e.shape, e.look))`.

- [ ] **4. Méthodes privées de la classe** — `checkedBinding(b)` (rapport fini sinon `badShape` ; cible trouvée par
  `this.find` sinon `badShape` ; `bindBoxOf` non null sinon `badShape` ; rend `{ bind: { id, fx: clamp(fx, ±10), fy: … },
  box }`), `anchored(world, start, end)` (recale `world[0]` et `world[last]` par `anchorPoint`), et `follow(s: State,
  moved: ReadonlySet<string>, m: Matrix | null): string[]` qui applique, sur l'état `s` passé à `step`, la règle « Suivi »
  et « Rupture » de T4 mot pour mot : parcourir chaque page et chaque élément ligne ou flèche à liaison ; `sm`, `em` ;
  ligne dans `moved` → liaisons hors `moved` retirées ; sinon, aucune cible dans `moved` → rien ; points intérieurs pris
  par `m` si les deux bouts suivent ; bouts liés recalés (cible lue dans `s`, absente → bout laissé) ; une flèche
  `elbowed` garde ses deux bouts seuls (aucun point intérieur, écart assumé) ; élément remplacé par `withLine(…)` ; ids
  réécrits rendus.

- [ ] **5. Commandes** :
  - `AddShape` : après `badWidth`, `line = { points, start, end }` contrôlé dans l'ordre de T1 (`points`/liaison sur
    rectangle ou ellipse → `badShape` ; points impairs, non finis, > 512 paires → `"points invalides"` ; `pageOf` ;
    `checkedBinding` de chaque bout) ; dans `step`, élément posé puis, si la ligne n'est pas vide, remplacé par
    `withLine(élément, anchored([[x0, y0], …paires de points, [x1, y1]], start, end), start, end)` ; `look.elbowed`
    retiré hors flèche.
  - `SetLinePoints` : ordre de T1 (`"points invalides"` pour longueur impaire, < 2 points, > 514, non finis ; `élément
    inconnu` ; `badShape` si ni ligne ni flèche ; `badShape` pour une liaison) ; élément remplacé par `withLine` après
    `anchored` ; même résultat (JSON égal) → `this.unchanged()`.
  - `Transform` : dans `step`, après la boucle des matrices, `const followed = this.follow(s, new Set(ids), m);` ; `ids`
    du `Change` = `[...ids, ...followed.filter((x) => !ids.includes(x))]`.
  - `SetText` (texte existant réécrit) et `FormatText` (hauteur changée) : `this.follow(s, new Set([id]), null)` dans leur
    `step`.
  - `SetStyle` (`restyled`) : `roundness` admis si `shape?.shape` vaut `rect`, `line` ou `arrow` ; pour une flèche,
    `if ("elbowed" in p) { const want = p.elbowed === true; if (elbowedOf(e.look) !== want) { put("elbowed", want ? true :
    undefined); shape = shape && shape.points ? (({ points: _x, ...r }) => r)(shape) : shape; changed = true; } }`.
  - `AddLinked` : élément trouvé (`élément inconnu`), rectangle ou ellipse (`badShape`) ; boîte monde de la source
    (`worldPolygon` → min/max), obstacles = `bindBoxOf` des autres éléments de la page (boîtes monde), même boucle de
    glissement que T4 (64 au plus) ; copie par `copyElements([source], new Map(), dx, dy)[0]` sans `group` ; flèche
    `{ id: newId(), transform: …, style: source.style, shape: { shape: "arrow", w, h, fill: null, start, end }, look: {
    elbowed: true } }` posée par `withLine(…, [anchorPoint(srcBox, fx, fy), anchorPoint(copyBox, 1 - fx, 1 - fy)], start,
    end)` ; une `step`, `ids: [copie, flèche]`.
  - `bindTarget(page, x, y, tol)` : traduction de `bind_target` (T4, étape 7 : `nearestOutline`, candidats, choix), ancres
    `ANCHOR_RATIOS.map(([rx, ry]) => applyMatrix(box.m, rx * box.w, ry * box.h))`.
  - `copyElements(list, groups, dx, dy)` : table `old → newId()` du lot (première occurrence), puis `copyElement` de
    chacun avec cet id, et `start` / `end` renvoyés vers la copie ou retirés ; `extract`, `insertFragment`, `insertPages`,
    `DuplicatePage` l'appellent à la place de `list.map((e) => copyElement(…))`. `copyElement` gagne un paramètre `id`
    facultatif (défaut `newId()`).
  - `element(id)` : `shape` rendu par `shapeView(e.shape)` qui retire `start` / `end` dont la cible n'est pas trouvée
    (`this.find(b.id) === undefined`).

- [ ] **6. Vert** : la commande bornée.

- [ ] **7. Commit** (GC4) : `git add apps/web/src/core/fake-core.ts`, puis `git add apps/web/src/core/fake-lines.test.ts` ;
  message `feat(web): fake core mirror of line points and bindings (OG12 T5)` + `Co-Authored-By`.

<a id="tache-t6"></a>
### Tâche T6 — Rendu et export

**Objectif.** La scène et les aperçus tracent polyligne, courbe (Bézier de Catmull-Rom), coudée, pointes neuves (barre,
rond, rond creux) aux deux bouts orientés par le premier et le dernier segment ; le tracé roughjs suit les points ; le
calque d'édition peint poignées de points, surlignage et ancres d'accroche, poignées « + » ; l'export `.iwb` / `.ubz`
écrit une ligne à plusieurs points en polyligne.

**Scénarios servis.** S2 (le tracé passe par le point), S6 (ligne courbe), S1 (surlignage, 4 points d'accroche visibles),
S3 (poignées « + »). Effet de bord 7 (export).

**Fichiers.** Modifier : `apps/web/src/engine/render/canvas2d.ts` (+ `canvas2d.test.ts`), `sketch.ts` (+ `sketch.test.ts`),
`apps/web/src/app/board-io.ts` (+ `board-io.test.ts`).

**Interfaces.**
- Consomme (T2) : `ShapeData.points`, `lineGeomOf`, `linePath`, `catmullRom`, `flattenPath`, `Look.elbowed`, `Arrowhead`
  (7 valeurs), `EditOverlay.points | bind | links`, `ShapePreview.points`.
- Réutilise : `apps/web/src/engine/render/sketch.ts:114-118` `keyOf` — la clé ajoute `s.points` et `elbowedOf(look)` ;
  `:59` `adjustRoughness` mesure la taille sur la boîte du chemin.
- Réutilise : `canvas2d.ts:242` `traceShape`, `:297` `paintShape`, `arrowhead`, `headWings` — étendus au chemin.
- Produit : `traceShape(ctx, s, width, round, look?)` trace le chemin (polyligne ou Bézier) ; `arrowhead(…)` accepte
  `bar`, `circle`, `circle_outline` ; peinture du calque : poignée de point = disque de 10 px écran, blanc bordé
  de `SELECTION_COLOR`, rempli de `SELECTION_COLOR` quand le point est choisi ; milieu = disque de 8 px à 50 % d'opacité ; surlignage = contour de l'objet
  `bind.id` à 2 px écran `SELECTION_COLOR` + 4 ancres (disques de 8 px) ; « + » = disque de 28 px écran blanc bordé, signe
  « + » de 12 px au trait 1,5 px écran. Export : `BoardObject` `stroke` (polyligne) pour une ligne ou une flèche à
  plusieurs points, avis `"bent"` (« flèche à plusieurs points écrite sans pointe ») pour une flèche.

**Test et commandes bornées** :
```bash
cd <wt> && pnpm install --frozen-lockfile >/dev/null
pnpm --filter @roomboard/web exec vitest run src/engine/render/sketch.test.ts src/engine/render/canvas2d.test.ts src/engine/render/overlay.test.ts src/app/board-io.test.ts 2>&1 | tail -6
# « Test Files  4 passed » ; « point intérieur déplacé » et « polyligne » nommés ; ARCHITECTE_RECT_MAIN (tracé d'avant) vert
```

**Contraintes (recopiées).**
- GC1 : `nice -n 10` pour les suites longues ; suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- GC3 : aucun test désactivé, sauté ou affaibli ; un élément sans `points` ni `elbowed` se trace par les mêmes appels
  qu'avant (tests existants de `canvas2d.test.ts`, `sketch.test.ts` verts sans retouche).
- GC4 : `git add` fichier par fichier, auteur `jejeasterix`, message anglais avec `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC7 : cibles ≥ 44 px (les poignées sont dessinées plus petites, la prise est de 44 au doigt, T2) ; traits fins (1,5 px
  écran) pour les « + ».
- GC10 : `pnpm install --frozen-lockfile` avant le premier test.

**Interdits.** Pas de `quadraticCurveTo` (l'export vectoriel ne le connaît pas, `canvas2d.ts:233`) : seulement `lineTo`
et `bezierCurveTo` ; pas de changement de `webgl2.ts` ni de `select.ts` du rendu.

**Terminé quand.** Commande bornée verte ; rapport `Réutilisation : appelé keyOf, adjustRoughness, traceShape/paintShape,
arrowhead/headWings`.

**Étapes.**

- [ ] **1. Tests d'abord.** `sketch.test.ts` : `it("point intérieur déplacé : tracé roughjs changé", …)` — `sketchShape`
  deux fois sur la même `SketchMemo` avec `{ shape: "line", w: 200, h: 0, fill: null, points: [100, -50] }` puis
  `points: [100, -60]`, `look: { roughness: 1, seed: 3 }` : le plan gardé (`memo.cache.get(id)`) change de `key` ; et
  `it("même ligne sans points : même clé qu'avant OG12", …)` (clé de `{ shape: "line", w: 200, h: 0, fill: null }` égale à
  la chaîne attendue avant la modification, copiée dans le test). `canvas2d.test.ts` (enregistreur existant
  `RecordingContext2D` ou contexte factice du fichier) : `traceShape` d'une ligne `points: [50, -80]` émet `moveTo(0,0)`,
  `lineTo(50,-80)`, `lineTo(100,0)` ; même ligne avec `look.roundness: "round"` émet deux `bezierCurveTo` (contrôles de
  `catmullRom`) ; `arrowhead(ctx, "bar", 100, 0, 0, 0, 4)` trace un segment perpendiculaire de longueur `max(12, 3 × 4)`
  centré sur (100, 0) ; `"circle"` remplit un cercle de rayon `max(4, 1,5 × 4)` centré à un rayon en arrière de la pointe ;
  `"circle_outline"` le trace sans remplir ; une flèche à points dont la pointe de fin vaut `arrow` oriente ses ailes par
  le dernier segment (ailes de `headWings(100, 0, 50, -80, 4)`). Calque : `paintOverlayChrome` avec `points` (deux poignées
  et un milieu), `bind` (contour + 4 ancres), `links` (4 « + ») appelle `arc` le bon nombre de fois. `board-io.test.ts` :
  `it("ligne à plusieurs points : polyligne", …)` — export `.iwb` d'une ligne `points: [50, 40]` : l'objet écrit est
  `kind: "stroke"` avec les points aplatis en triplets (pression 0,5) ; flèche à points : même polyligne et avis « flèche à
  plusieurs points écrite sans pointe » ; flèche droite : `kind: "shape"` comme avant.

- [ ] **2. Rouge**, puis **3. `sketch.ts`** : `keyOf` ajoute `s.points ?? null, elbowedOf(look)` à la fin du tableau
  `JSON.stringify` ; `adjustRoughness` reçoit `w`, `h` de la boîte du chemin (`pathExtent(s)` : largeur et hauteur des
  `linePath` min/max) quand `s.points` existe ; `planOf`, branche segment : sans `points` ni courbe, `gen.line(...)` comme
  aujourd'hui ; avec points ou courbe : `gen.curve(flat, opts)` si courbe (comme Excalidraw, `shape.ts:994`), sinon
  `gen.linearPath(pts, opts)` ; pointes : `addHead(endKind, last, prev)` et `addHead(startKind, first, second)` où `prev`
  et `second` sont l'avant-dernier et le second point du chemin aplati ; `bar` → `gen.line` perpendiculaire,
  `circle`/`circle_outline` → `gen.circle(cx, cy, 2r, fill?)`.

- [ ] **4. `canvas2d.ts`** : `traceShape(ctx, s, width, round = false, look?: Look)` — branche segment :
```ts
    const g = lineGeomOf(s, look);
    const pts = linePath(s.w, s.h, g.inner);
    ctx.moveTo(0, 0);
    if (g.curve && pts.length > 2) for (const [, c1, c2, p] of catmullRom(pts)) ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p[0], p[1]);
    else for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
    const [fx, fy] = headFrom(pts, g.curve);
    const head = s.shape === "arrow" ? headWings(s.w, s.h, fx, fy, width) : null;
```
  où `headFrom` rend l'avant-dernier point du chemin aplati (`flattenPath(pts, curve)`). `paintShape` passe `look` à
  `traceShape` ; sa branche « pointes personnalisées » trace le fût par `traceShape` sans pointe (paramètre
  `noHead = true`) et place chaque pointe sur `(dernier, avant-dernier aplatis)` et `(premier, second aplatis)`. `arrowhead`
  gagne :
```ts
  if (kind === "bar") {
    const l = Math.max(12, 3 * width) / 2;
    const d = Math.hypot(tipX - fromX, tipY - fromY) || 1;
    const nx = -(tipY - fromY) / d;
    const ny = (tipX - fromX) / d;
    ctx.beginPath();
    ctx.moveTo(tipX + nx * l, tipY + ny * l);
    ctx.lineTo(tipX - nx * l, tipY - ny * l);
    return true;
  }
  if (kind === "circle" || kind === "circle_outline") {
    const r = Math.max(4, 1.5 * width);
    const d = Math.hypot(tipX - fromX, tipY - fromY) || 1;
    ctx.beginPath();
    ctx.arc(tipX - ((tipX - fromX) / d) * r, tipY - ((tipY - fromY) / d) * r, r, 0, Math.PI * 2);
    if (kind === "circle") {
      if (color !== undefined) ctx.fillStyle = color;
      ctx.fill();
    }
    return true;
  }
```
  (Excalidraw : `getArrowheadPoints`, `arrowheads.ts`.) `paintOverlayContent` : une `ShapePreview` avec `points` est
  tracée avec `shape.points` en local (`points` monde − départ). `paintOverlayChrome` : après le cadre, peindre `o.bind`
  (contour de l'élément `o.bind.id` lu par `this.source.element`, tracé par `traceShape` sous sa matrice ou `rect` de sa
  boîte, `lineWidth = 2 * px`, puis les 4 ancres), `o.points`, `o.links` (dimensions de la section Interfaces, en `px`
  écran par le `px = 1 / zoom` existant).

- [ ] **5. `board-io.ts`** : `EXPORT_LABELS` gagne `["bent", "flèche à plusieurs points écrite sans pointe", "flèches à
  plusieurs points écrites sans pointe"]` (après `arrow`) ; cas `"shape"` :
```ts
    case "shape": {
      const g = lineGeomOf(el.shape, el.look);
      // Une courbe à deux points est droite (n° 3) : seuls les points intérieurs font une polyligne.
      if (isSegment(el.shape.shape) && g.inner.length > 0) {
        const flat = flattenPath(linePath(el.shape.w, el.shape.h, g.inner), g.curve);
        if (el.shape.shape === "arrow") add("bent");
        return { kind: "stroke", m, color: el.style.color, width: el.style.width, points: flat.flatMap(([x, y]) => [x, y, 0.5]) };
      }
      if (format === "ubz" && el.shape.shape === "arrow") add("arrow");
      return { kind: "shape", shape: el.shape.shape, m, x0: 0, y0: 0, x1: el.shape.w, y1: el.shape.h, color: el.style.color, width: el.style.width, fill: el.shape.fill };
    }
```

- [ ] **6. Vert** : la commande bornée. **7. Commit** (GC4) : fichiers un par un ; message
  `feat(web): render and export line paths, curves, new arrowheads, edit overlay (OG12 T6)` + `Co-Authored-By`.

<a id="tache-t7"></a>
### Tâche T7 — Panneau d'options : Type de flèche, Angles de la ligne, pointes, Liaison

**Objectif.** Le panneau montre, pour la flèche, la section « Type de flèche » (Droite · Courbe · Coudée) juste avant
Pointes ; pour la ligne, la section « Angles » (Droits · Arrondis) ; Pointes gagne Barre, Rond, Rond creux et
l'interrupteur « Liaison des flèches ». Un choix sur une sélection écrit un `SetStyle` (une étape) sur les seules flèches
pour le type.

**Scénarios servis.** S2 (Type de flèche → Courbe), S4 (interrupteur coupé : flèche libre), S6 (Angles → Arrondis sur la
ligne). Effet de bord 4.

**Fichiers.** Modifier : `apps/web/src/ui/tool-options.ts` (+ `tool-options.test.ts`), `apps/web/src/ui/OptionsPanel.tsx`
(+ `OptionsPanel.test.tsx`), `apps/web/src/engine/engine.ts` (`setItem`, `patchOf` seulement) (+ `engine.test.ts`).

**Interfaces.**
- Consomme (T2) : `ItemStyle.arrowType`, `ItemStyle.arrowBinding`, `ArrowType`, `LookPatch.elbowed`, `elbowedOf`,
  `Arrowhead` (7) ; (T3) icônes `arrow-type-sharp`, `arrow-type-round`, `arrow-type-elbow`, `head-bar`, `head-circle`,
  `head-circle-outline`, `arrow-binding`.
- Réutilise : `apps/web/src/ui/tool-options.ts:7-28` (`OPTION_ORDER`, `BY_TOOL`, `BY_KIND`), `OptionsPanel.tsx:57-64`
  (`LABEL`), `RadioChoices` — clé `arrowType`, ligne dans `BY_TOOL`, `roundness` pour la ligne (jamais un nouveau bloc de
  mise en page, règle commune avec OG23).
- Produit : `OptionKey` gagne `"arrowType"` (rangée dans `OPTION_ORDER` juste avant `"arrowheads"`) ; `BY_TOOL.line =
  [...FORM, "roundness"]` ; `BY_TOOL.arrow = [...FORM.slice(0, 4), "arrowType", "arrowheads", "opacity"]` ; sélecteurs
  `[data-option="arrowType"] [data-option-value="sharp|round|elbow"]`, `[data-option="arrowheads"]
  [data-option-value="arrow-binding"]` (bouton `role="switch"`, `aria-checked`).

**Test et commandes bornées** :
```bash
cd <wt> && pnpm install --frozen-lockfile >/dev/null
pnpm --filter @roomboard/web exec vitest run src/ui/tool-options.test.ts src/ui/OptionsPanel.test.tsx src/ui/OptionsPanel.link.test.tsx src/engine/engine.test.ts 2>&1 | tail -6
# « Test Files  4 passed » ; « Type de flèche » et « Liaison des flèches » nommés
```

**Contraintes (recopiées).**
- GC1 : `nice -n 10` pour les suites longues ; suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- GC3 : aucun test désactivé, sauté ou affaibli ; `personnalisation-2-navigateur.mjs:1047` parcourt les quatre pointes par
  leur valeur : les valeurs `none`, `arrow`, `triangle`, `triangle_outline` restent, dans cet ordre, en tête de la liste.
- GC4 : `git add` fichier par fichier, auteur `jejeasterix`, message anglais avec `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC7 : boutons de 44 px (classe `rb-opt-btn`, `RadioChoices` `look="segment"` existants) ; icônes de T3.
- GC10 : `pnpm install --frozen-lockfile` avant le premier test.

**Interdits.** Pas de nouveau bloc de mise en page ni de nouvelle classe CSS (chantier OG23 voisin) ; ne pas toucher au
reste d'`engine.ts` (T11) ; pas de boutons « Modifier les points » / « Retirer le point » (T11).

**Terminé quand.** Commande bornée verte ; rapport `Réutilisation : appelé OPTION_ORDER/BY_TOOL/BY_KIND, LABEL, RadioChoices`.

**Étapes.**

- [ ] **1. Tests d'abord.** `tool-options.test.ts` : `it("Type de flèche : section de l'outil Flèche, juste avant Pointes ;
  Angles pour la ligne", …)` — `sectionsFor("arrow", [], false)` contient `arrowType` à l'indice de `arrowheads` − 1 ;
  `sectionsFor("line", [], false)` contient `roundness` et pas `arrowType` ; une flèche sélectionnée (vue factice
  `{ kind: "shape", shape: { shape: "arrow", … } }`) donne `arrowType`. `OptionsPanel.test.tsx` (patron des cas
  existants) : outil Flèche → trois choix `sharp`, `round`, `elbow` (libellés « Droite », « Courbe », « Coudée ») ; Pointes
  de fin à 7 choix, dont `bar`, `circle`, `circle_outline` (« Barre », « Rond », « Rond creux ») ; `it("Liaison des
  flèches : interrupteur, écrit arrowBinding", …)` — bouton `[data-option-value="arrow-binding"]`, `aria-checked="true"`,
  un appui appelle `setItemStyle({ arrowBinding: false })` ; flèche coudée sélectionnée (`look.elbowed`) → choix `elbow`
  enfoncé. `engine.test.ts` : `it("arrowType sur une sélection mixte : SetStyle des seules flèches", …)` — rectangle et
  flèche sélectionnés, `setItemStyle({ arrowType: "round" })` → la flèche a `look.roundness === "round"`, le rectangle n'a
  pas de `roundness` ; `{ arrowType: "elbow" }` → `look.elbowed === true` ; un seul `undo` rend l'état d'avant ;
  `setItemStyle({ arrowBinding: false })` n'écrit aucune commande (version inchangée).

- [ ] **2. Rouge**, puis **3. `tool-options.ts`** : `OptionKey` et `OPTION_ORDER` gagnent `"arrowType"` avant `"arrowheads"` ;
  `BY_TOOL` comme dans Interfaces.

- [ ] **4. `OptionsPanel.tsx`** :
```tsx
const ARROW_TYPES: readonly RadioOption<ArrowType>[] = [
  { value: "sharp", label: "Droite", icon: "arrow-type-sharp" },
  { value: "round", label: "Courbe", icon: "arrow-type-round" },
  { value: "elbow", label: "Coudée", icon: "arrow-type-elbow" },
];
// HEADS : après triangle_outline
  { value: "bar", label: "Barre", icon: "head-bar" },
  { value: "circle", label: "Rond", icon: "head-circle" },
  { value: "circle_outline", label: "Rond creux", icon: "head-circle-outline" },
// LABEL : arrowType: "Type de flèche",
// readers :
    arrowType: (e) => (e.kind === "shape" && e.shape.shape === "arrow" ? (elbowedOf(e.look) ? "elbow" : roundnessOf(e.look) === "round" ? "round" : "sharp") : undefined),
// fallbacks : arrowType: (s) => s.arrowType,
// bodies :
    arrowType: () => (
      <RadioChoices keepFocus name="arrowType" label={LABEL.arrowType} look="segment" options={ARROW_TYPES} valueAttr="data-option-value"
        value={(value("arrowType") as ArrowType | null) ?? null} choose={(t) => write({ arrowType: t })} />
    ),
```
  et, dans le corps `arrowheads`, après les deux `RadioChoices` :
```tsx
        <IconButton keepFocus icon="arrow-binding" label="Liaison des flèches"
          attrs={{ "data-option-value": "arrow-binding", class: "rb-opt-btn", role: "switch", "aria-checked": String(cur().arrowBinding) }}
          onPress={() => write({ arrowBinding: !cur().arrowBinding })} />
```
  La section `roundness` existante sert la ligne telle quelle (lecteur `roundnessOf`, libellés Droits / Angles arrondis).

- [ ] **5. `engine.ts`** (`setItem`) : remplacer le bloc `if (writeSelection && ids.length > 0) { … }` par :
```ts
    if (writeSelection && ids.length > 0) {
      const accepted = Object.fromEntries(keys.filter((k) => k in p && p[k] === next[k]).map((k) => [k, p[k]])) as Partial<ItemStyle>;
      // OG12 : `arrowBinding` est un réglage de l'appareil (aucune commande) ; `arrowType` ne touche que les flèches (n° 24).
      const { arrowType, arrowBinding: _device, ...rest } = accepted;
      const cmds: Command[] = [];
      const patch = patchOf(rest);
      if (Object.keys(patch).length > 0) cmds.push({ type: "SetStyle", ids, patch });
      if (arrowType !== undefined) {
        const arrows = ids.filter((id) => {
          const v = doc.element(id);
          return v?.kind === "shape" && v.shape.shape === "arrow";
        });
        if (arrows.length > 0) {
          cmds.push({ type: "SetStyle", ids: arrows, patch: { roundness: arrowType === "round" ? "round" : null, elbowed: arrowType === "elbow" ? true : null } });
        }
      }
      if (cmds.length > 0) {
        runAll(cmds);
        return;
      }
    }
```
  (`runAll` : une étape d'annulation pour le lot, comme le panneau l'utilise déjà, `OptionsPanel.tsx:394`.)

- [ ] **6. Vert**, **7. Commit** (GC4) : fichiers un par un ; message `feat(web): arrow type, line corners, new arrowheads, arrow binding toggle in options panel (OG12 T7)` + `Co-Authored-By`.

<a id="tache-t8"></a>
### Tâche T8 — Outils Formes et Sélection : liaison, poignées d'extrémité, « + »

**Objectif.** Une flèche ou une ligne tirée depuis ou vers un objet s'y lie (15 px, 30 au doigt ; ancres à 16, 24 au
doigt ; Ctrl inverse ; réglage coupé : libre), avec l'objet visé surligné et ses 4 ancres ; une ligne ou une flèche seule
sélectionnée n'a plus de cadre à 8 poignées mais une poignée à chaque bout (tirer : déplace, lie, délie) et un milieu
(deux points, non coudée : tirer insère un point) ; une flèche liée déplacée seule ne bouge qu'au-delà de 10 px ; un
rectangle ou une ellipse seul sélectionné montre quatre « + » qui lancent `AddLinked` ; un double toucher sur une ligne ou
une flèche non coudée appelle `ctx.editPoints`.

**Scénarios servis.** S1 (glisser de A vers B au doigt, liaison, poignées sans cadre), S3 (« + »), S4 (Ctrl tenu,
interrupteur coupé, Maj 15°), S6 (ligne liée, double toucher). Effet de bord 8, Review Focus 4.

**Fichiers.** Modifier : `apps/web/src/engine/tools/shape.ts` (+ `shape.test.ts`), `apps/web/src/engine/tools/select.ts`
(+ `select.test.ts`).

**Interfaces.**
- Consomme (T2) : `line-points.ts` (`bindEnd`, `worldPoints`, `pickHandle`, `pointHandles`, `linkHandles`, `pickLink`,
  `BOUND_DRAG_PX`), `ToolContext.ctrl | bindingEnabled | pointerType | editPoints`, `GestureTool.hover`,
  `ItemStyle.arrowType`, `Command` `AddShape.start|end`, `SetLinePoints`, `AddLinked`, `EditOverlay.points | bind | links`,
  `ShapePreview.points`, `elbowedOf` ; (T3) `isDoubleTap`, `Tap`.
- Réutilise : `apps/web/src/engine/tools/shape.ts:20` `constrainEnd` — appelé pour le point tiré, par rapport à son voisin.
- Réutilise : `CoreDocument.snapPoint` (`shape.ts:56-58`) — même appel pour le bout tiré (Alt : brut).
- Réutilise : `apps/web/src/engine/tools/handles.ts` `HANDLE_GRAB_PX` — portée des poignées de bout (via `line-points.ts`) ;
  `hitHandle` garde le cadre des sélections multiples. Rapport : `Réutilisation : écart — hitHandle ne connaît que les 8
  poignées d'un cadre ; les poignées de points passent par pickHandle (line-points.ts), à la même portée`.
- Produit : comportement ; aucune signature neuve hors des modules.

**Test et commande bornée** :
```bash
cd <wt> && pnpm install --frozen-lockfile >/dev/null
pnpm --filter @roomboard/web exec vitest run src/engine/tools/shape.test.ts src/engine/tools/select.test.ts src/engine/tools/handles.test.ts 2>&1 | tail -6
# « Test Files  3 passed » ; « liaison à la création » et « sans cadre à 8 poignées » nommés ; cas existants verts
```

**Contraintes (recopiées).**
- GC1 : `nice -n 10` pour les suites longues ; suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- GC3 : aucun test désactivé, sauté ou affaibli ; seuils existants inchangés (`MIN_SHAPE_PX` 4, `DRAG_THRESHOLD_PX` 2,
  `REVEAL_TAP_PX` 8, `HANDLE_GRAB_PX` 12) ; le seuil de 10 px ne vaut que pour une ligne ou flèche liée seule.
- GC4 : `git add` fichier par fichier, auteur `jejeasterix`, message anglais avec `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC7 : tactile d'abord : portées au doigt (30, 24, 22 px), « + » de 44 px centrés à 40 px du cadre (hors des 12 px des
  poignées de redimensionnement) ; souris et clavier ensuite (Ctrl tenu, Maj).
- GC10 : `pnpm install --frozen-lockfile` avant le premier test.

**Interdits.** Pas de mode multi-points au clic (lot 2) ; pas de rotation ; pas d'écriture pendant le glisser (une commande
au relâché, D38) ; ne pas toucher à `engine.ts` (T11) ni à `handles.ts`.

**Terminé quand.** Commande bornée verte ; rapport avec les lignes `Réutilisation :` ci-dessus.

**Étapes.**

- [ ] **1. Tests d'abord.** Dans `shape.test.ts`, `setup()` gagne `ctrl`, `binding`, `pointer` réglables et la doublure de
  `bindTarget` :
```ts
const HIT_A = { id: "A", fixed: [1, 0.3] as const, onOutline: true, anchors: [[50, 0], [100, 25], [50, 50], [0, 25]] as const };
const HIT_B = { id: "B", fixed: [0, 0.5] as const, onOutline: true, anchors: [[450, 0], [500, 25], [450, 50], [400, 25]] as const };
// dans setup : let ctrl = false, binding = true, pointer = "mouse";
// ctx : ctrl: () => ctrl, bindingEnabled: () => binding, pointerType: () => pointer,
// vi.spyOn(doc, "bindTarget").mockImplementation((_p, x) => (x < 150 ? HIT_A : x > 350 ? HIT_B : null));
describe("OG12 : liaison à la création (n° 17 à 19)", () => {
  it("liaison à la création : départ sur A (ancre droite calée), fin sur B", () => {
    const { ctx, runs } = setup();
    const t = createShapeTool(ctx, "arrow", () => PEN);
    t.begin(1, [at(102, 20)]);
    t.extend(1, [at(402, 25)], []);
    t.close(1, "end");
    expect(runs[0]).toMatchObject({ type: "AddShape", shape: "arrow", start: { id: "A", fx: 1, fy: 0.5 }, end: { id: "B", fx: 0, fy: 0.5 } });
  });
  const drag = (t: ReturnType<typeof createShapeTool>, from: [number, number], to: [number, number]): void => {
    t.begin(1, [at(...from)]);
    t.extend(1, [at(...to)], []);
    t.close(1, "end");
  };
  it("Ctrl tenu inverse la liaison ; réglage coupé : libre ; coupé + Ctrl : liée", () => {
    const k = setup();
    k.setCtrl(true);
    drag(createShapeTool(k.ctx, "arrow", () => PEN), [102, 20], [402, 25]);
    expect(k.runs[0]).not.toHaveProperty("start");
    expect(k.runs[0]).not.toHaveProperty("end");
    k.setCtrl(false);
    k.setBinding(false);
    drag(createShapeTool(k.ctx, "arrow", () => PEN), [102, 20], [402, 25]);
    expect(k.runs[1]).not.toHaveProperty("end");
    k.setCtrl(true);
    drag(createShapeTool(k.ctx, "arrow", () => PEN), [102, 20], [402, 25]);
    expect(k.runs[2]).toMatchObject({ end: { id: "B" } });
  });
  it("au doigt : tolérance 30 px écran", () => {
    const k = setup(2);
    k.setPointer("touch");
    drag(createShapeTool(k.ctx, "arrow", () => PEN), [102, 20], [402, 25]);
    expect(k.bindTarget).toHaveBeenCalledWith(k.page, expect.any(Number), expect.any(Number), 15);
  });
  it("pendant le glisser : la cible est surlignée avec ses 4 ancres", () => {
    const k = setup();
    const t = createShapeTool(k.ctx, "arrow", () => PEN);
    t.begin(1, [at(200, 200)]);
    t.extend(1, [at(402, 25)], []);
    expect(t.live().overlay?.bind).toEqual({ id: "B", anchors: HIT_B.anchors });
  });
  it("ligne : liée aux deux bouts, Angles du style courant ; flèche coudée : elbowed", () => {
    const k = setup();
    drag(createShapeTool(k.ctx, "line", () => ({ ...DEFAULT_ITEM_STYLE, roundness: "round" })), [102, 20], [402, 25]);
    expect(k.runs[0]).toMatchObject({ shape: "line", start: { id: "A" }, end: { id: "B" }, look: { roundness: "round" } });
    drag(createShapeTool(k.ctx, "arrow", () => ({ ...DEFAULT_ITEM_STYLE, arrowType: "elbow" })), [200, 200], [300, 300]);
    expect(k.runs[1]).toMatchObject({ shape: "arrow", look: { elbowed: true } });
  });
  it("survol sans geste : hover montre la cible", () => {
    const k = setup();
    const t = createShapeTool(k.ctx, "arrow", () => PEN);
    t.hover?.(410, 25);
    expect(t.live().overlay?.bind?.id).toBe("B");
  });
});
```
  `setup(zoom)` rend en plus `setCtrl`, `setBinding`, `setPointer` et `bindTarget` (la doublure `vi.spyOn`). Dans `select.test.ts` (même doublure
  de `bindTarget`, `ctx.run` qui rend `{ pages: [], ids: ["copie", "fleche"], removed: [], full: false, version: 1 }` pour
  `AddLinked` et `doc.apply(cmd)` sinon) :
  - `ligne seule sélectionnée : sans cadre à 8 poignées, deux bouts et un milieu` : ligne (0,0)-(200,0) sélectionnée ;
    `live().overlay` a `frame === null`, `handles === false`, `points` = 2 `point` + 1 `mid`.
  - `tirer un bout : une SetLinePoints au relâché, liée sous le doigt` : appui en (200, 0), glisser vers (402, 25) →
    `{ type: "SetLinePoints", points: [0, 0, 402, 25], start: null, end: { id: "B", fx: 0, fy: 0.5 } }`.
  - `tirer le milieu : insère un point` : appui en (100, 0), glisser vers (100, 80) → `points: [0, 0, 100, 80, 200, 0]`.
  - `flèche liée : un toucher de moins de 10 px ne la déplace pas` (Review Focus 4) : `vi.spyOn(doc, "element")` rend la
    vue avec `shape.start = { id: "A", fx: 1, fy: 0.5 }` ; appui sur le fût à 60 px d'un bout, glisser de 8 px → aucune
    commande ; 12 px → une `Transform`.
  - `poignée « + » : AddLinked, la copie devient la sélection` : rectangle (0,0)-(100,50) seul sélectionné, zoom 1, toucher
    en (140, 25) → `{ type: "AddLinked", dir: "right" }`, `selection()` = `["copie"]` ; deux objets sélectionnés : pas de
    `links` dans le calque.
  - `double toucher sur une ligne : editPoints` : deux appuis sans glisser à 200 ms et 10 px d'écart → `editPoints`
    appelé avec l'id ; flèche coudée (`look.elbowed`) : jamais.

- [ ] **2. Rouge.**

- [ ] **3. `shape.ts`** : `Draft` gagne `readonly touch: boolean; readonly startBind: EndBind | null; end: EndBind | null`.
  En tête de `createShapeTool` :
```ts
  const linear = kind === "line" || kind === "arrow";
  /** n° 19 : le réglage « Liaison des flèches », inversé par Ctrl tenu. */
  const binding = (): boolean => (ctx.bindingEnabled?.() ?? true) !== (ctx.ctrl?.() === true);
  let hovered: EndBind | null = null;
```
  Dans `begin` : `const touch = ctx.pointerType?.() === "touch";` ; `startBind: linear ? bindEnd(ctx.doc, page, x, y,
  cam.zoom, touch, binding()) : null` ; aspect :
```ts
          roundness: kind === "rect" || kind === "line" ? st.roundness : kind === "arrow" && st.arrowType === "round" ? "round" : "sharp",
          elbowed: kind === "arrow" && st.arrowType === "elbow",
```
  Dans `extend` : `if (linear) d.end = bindEnd(ctx.doc, d.page, x, y, d.zoom, d.touch, binding(), d.startBind?.bind?.id);`.
  Dans `close` (après `drawn`) : `const end = linear ? bindEnd(ctx.doc, d.page, d.x1, d.y1, d.zoom, d.touch, binding(),
  d.startBind?.bind?.id) : null;` puis la commande gagne `...(d.startBind?.bind ? { start: d.startBind.bind } : {}),
  ...(end?.bind ? { end: end.bind } : {})`. Dans `live` : `overlay: { ...EMPTY_OVERLAY, shapes, bind: [...drafts.values()]
  .find((x) => x.end?.hint)?.end?.hint ?? null }` ; sans brouillon, `hovered?.hint` donne `{ …, overlay: { ...EMPTY_OVERLAY,
  bind: hovered.hint } }`. `hover(sx, sy)` : `hovered = linear ? bindEnd(ctx.doc, ctx.page(), ...screenToWorld(ctx.camera(),
  sx, sy), ctx.camera().zoom, false, binding()) : null; ctx.requestFrame?.();` ; `leave` remet `hovered = null`.

- [ ] **4. `select.ts`** : `Mode` gagne `"line-end" | "line-mid" | "link"` ; `Drag` gagne `readonly hit?: PointHit;
  readonly link?: LinkDir; readonly bound?: boolean; readonly target?: string | null; readonly touch?: boolean`. Aides :
```ts
const isLine = (v: ElementView | null): v is ShapeElement => v?.kind === "shape" && isSegment(v.shape.shape);
const isNode = (v: ElementView | null): boolean => v?.kind === "shape" && (v.shape.shape === "rect" || v.shape.shape === "ellipse");
/** n° 39 : poignées hors édition : les deux bouts ; le milieu si deux points et non coudée. */
const endHandles = (v: ShapeElement): { pts: [number, number][]; mids: boolean } => {
  const all = worldPoints(v);
  const mids = all.length === 2 && !elbowedOf(v.look);
  return { pts: mids ? all : [all[0]!, all[all.length - 1]!], mids };
};
```
  Dans le corps : `let lastTap: (Tap & { id: string }) | null = null;` ; `const one = (): ElementView | null =>
  selection.length === 1 ? ctx.doc.element(selection[0]!) : null;` ; seuil du glisser :
  `const moved = (d) => Math.hypot(d.x - d.x0, d.y - d.y0) * d.zoom >= (d.bound ? BOUND_DRAG_PX : DRAG_THRESHOLD_PX);`.
  Dans `begin`, avant `const frame = …` :
```ts
      const v = one();
      const touch = ctx.pointerType?.() === "touch";
      if (isLine(v)) {
        const { pts, mids } = endHandles(v);
        const hit = pickHandle(pts, x, y, zoom, touch, mids);
        if (hit) {
          startDrag(pointerId, hit.kind === "point" ? "line-end" : "line-mid", x, y, { hit, touch });
          return;
        }
      } else if (isNode(v)) {
        const f = ctx.doc.bounds(selection);
        const dir = f ? pickLink(linkHandles(f, zoom), x, y, zoom) : null;
        if (dir) {
          startDrag(pointerId, "link", x, y, { link: dir });
          return;
        }
      }
```
  `grabbedHandle` n'est cherché que si `!isLine(v)` (n° 39 : pas de cadre à 8 poignées pour une ligne seule). Quand le
  geste devient `move`, `bound` vaut `isLine(one()) && !!(v.shape.start || v.shape.end)` et `target` l'id touché (`hit`).
  Dans `close`, avant la branche `tap-shade` :
```ts
      if (!moved(d)) {
        const id = d.target ?? (isLine(one()) ? selection[0]! : null);
        const cur: Tap = { t: d.t, x: d.sx, y: d.sy };
        const view = id === null ? null : ctx.doc.element(id);
        if (id !== null && lastTap?.id === id && isDoubleTap(lastTap, cur) && isLine(view) && !elbowedOf(view.look)) {
          lastTap = null;
          ctx.editPoints?.(id);
          return;
        }
        lastTap = id === null ? null : { ...cur, id };
      }
      if (d.mode === "link") {
        if (!moved(d) && d.link) {
          const ch = ctx.run({ type: "AddLinked", id: selection[0]!, dir: d.link });
          if (ch && ch.ids[0] !== undefined) selection = [ch.ids[0]];
        }
        return;
      }
      if (d.mode === "line-end" || d.mode === "line-mid") {
        const v = one();
        if (!isLine(v) || !moved(d) || !d.hit) return;
        const next = draggedLine(v, d);
        ctx.run({ type: "SetLinePoints", id: v.id, points: next.pts.flat(), start: next.start, end: next.end });
        return;
      }
```
  (`Drag` gagne `t`, `sx`, `sy` : temps et point écran du premier échantillon, pris dans `startDrag`.) `draggedLine(v, d)` :
  points monde complets de `worldPoints(v)` ; bout tiré (`hit.index` 0 → premier, 1 → dernier ; `mid` → point inséré entre
  les deux) placé en `(d.x, d.y)` aimanté (`ctx.doc.snapPoint`, brut si Alt) puis contraint par Maj (`constrainEnd("line",
  voisin, point)`) ; bout tiré lié par `bindEnd(ctx.doc, page, x, y, d.zoom, d.touch === true, binding())` (`binding` comme
  dans `shape.ts`), l'autre bout garde `v.shape.start ?? null` / `v.shape.end ?? null` ; rend `{ pts, start, end, hint }`.
  Dans `live` : ligne seule hors glisser → `frame: null, handles: false, points: pointHandles(pts, [], zoom, mids)` ;
  glisser `line-*` → `hidden: new Set([v.id])`, `shapes: [aperçu avec points intérieurs]`, `points`, `bind: hint` ; nœud
  seul hors glisser → `links: linkHandles(bounds, zoom)` en plus du cadre.

- [ ] **5. Vert**, **6. Commit** (GC4) : `git add` de `shape.ts`, `shape.test.ts`, `select.ts`, `select.test.ts`, un par un ;
  message `feat(web): bind arrows at creation, endpoint handles, linked-node handles, double tap (OG12 T8)` + `Co-Authored-By`.

<a id="tache-t9"></a>
### Tâche T9 — « Modifier les points »

**Objectif.** L'éditeur de points d'une ligne ou d'une flèche non coudée : une poignée par point (44 px au doigt) et une
par milieu de segment (masquée sous 40 px écran) ; toucher un point le choisit, Maj+clic en ajoute un ; tirer un point le
déplace (aimant, Maj 15° depuis son voisin ; un bout tiré se lie ou se délie) ; tirer un milieu insère un point ; « retirer »
enlève les points choisis (moins de deux : la ligne est supprimée) ; toucher hors de l'objet sort. Une `SetLinePoints` au
relâché, une étape par glisser.

**Scénarios servis.** S2 (milieu tiré de 80 px, doigt tardif = 15°, toucher hors de l'objet), S4 (clic sur un point, Suppr,
Échap — touches branchées par T11), S6 (milieu tiré de 60 px).

**Fichiers.** Créer : `apps/web/src/engine/tools/line-edit.ts`, `apps/web/src/engine/tools/line-edit.test.ts`.

**Interfaces.**
- Consomme (T2) : `line-points.ts` (`worldPoints`, `pickHandle`, `pointHandles`, `bindEnd`), `ToolContext` (`ctrl`,
  `bindingEnabled`, `pointerType`, `shift`, `alt`), `ShapePreview.points`, `EditOverlay.points | bind`,
  `Command.SetLinePoints`, `elbowedOf` ; `select.ts` `SELECT_TOL_PX`, `DRAG_THRESHOLD_PX` (constantes existantes).
- Réutilise : `apps/web/src/engine/tools/shape.ts:20` `constrainEnd` — point tiré contraint par rapport à son voisin.
- Réutilise : `CoreDocument.snapPoint` — même appel pour le point tiré.
- Réutilise : `apps/web/src/engine/tools/handles.ts` `HANDLE_GRAB_PX` (par `POINT_REACH_PX`) ; `hitHandle` : écart, même
  raison que T8 (poignées de points hors cadre).
- Produit (consommé par T11) :
```ts
export interface LineEditor extends GestureTool {
  readonly id: string;
  /** Indices des points choisis (pour « Retirer le point »). */
  selectedPoints(): readonly number[];
  /** Suppr, Retour arrière, bouton « Retirer le point » : vrai si une commande est partie. */
  removeSelected(): boolean;
}
/** `exit` : appelé quand l'éditeur se ferme de lui-même (toucher hors de l'objet, ligne supprimée ou absente). */
export function createLineEditor(ctx: ToolContext, id: string, exit: () => void): LineEditor;
```

**Test et commande bornée** :
```bash
cd <wt> && pnpm install --frozen-lockfile >/dev/null
pnpm --filter @roomboard/web exec vitest run src/engine/tools/line-edit.test.ts 2>&1 | tail -5
# « Tests  N passed », N ≥ 8, « une SetLinePoints au relâché » nommé
```

**Contraintes (recopiées).**
- GC1 : `nice -n 10` pour les suites longues ; suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- GC3 : aucun test désactivé, sauté ou affaibli ; seuil de glisser `DRAG_THRESHOLD_PX` (2 px) réutilisé, jamais relevé.
- GC4 : `git add` fichier par fichier, auteur `jejeasterix`, message anglais avec `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC7 : poignées de 44 px au doigt (portée 22 px), 12 px à la souris ; tactile d'abord, Maj+clic ensuite.
- GC10 : `pnpm install --frozen-lockfile` avant le premier test.

**Interdits.** Pas d'entrée dans l'éditeur pour une flèche coudée (n° 21, 25) ; pas d'écriture pendant le glisser ; pas de
Ctrl+D de points ni d'Alt+clic (lot 2).

**Terminé quand.** Commande bornée verte ; rapport avec `Réutilisation : appelé constrainEnd, snapPoint, HANDLE_GRAB_PX`
et l'écart `hitHandle`.

**Étapes.**

- [ ] **1. Tests d'abord** — `line-edit.test.ts` (setup de `shape.test.ts` : `fakeCore.blank()`, ligne posée par
  `AddShape` (0,0)-(200,0), `runs` enregistrées, `ctx.run` qui rend `doc.apply(cmd)` sauf pour `SetLinePoints` où il
  enregistre et rend un `Change` factice, `vi.spyOn(doc, "element")` pour les vues à points) :
  - `poignées : un point par sommet, un milieu par segment d'au moins 40 px écran` (zoom 1 : 2 points + 1 milieu ;
    zoom 0,1 : 2 points seulement).
  - `une SetLinePoints au relâché : milieu tiré de 80 px` : appui (100, 0), glisser (100, 80) → une seule commande
    `{ type: "SetLinePoints", points: [0, 0, 100, 80, 200, 0], start: null, end: null }` ; pendant le glisser, aucune
    commande et `live().hidden` contient l'id.
  - `point tiré aimanté puis contraint par Maj à 15° depuis son voisin` : vue à 3 points, Maj tenue, point 1 tiré vers
    (110, 25) depuis (100, 80) → angle depuis (0, 0) multiple de 15°.
  - `bout tiré sur un objet : lié ; tiré hors de portée : délié` (doublure de `bindTarget`).
  - `Maj+toucher ajoute au choix ; removeSelected retire les points choisis` (3 points, choix [1] → `points: [0, 0, 200, 0]`).
  - `retirer un bout : sa liaison part` (bout 0 choisi, vue liée en `start` → commande avec `start: null`).
  - `moins de deux points : Delete et sortie` (`exit` appelé une fois).
  - `toucher hors de l'objet : sortie ; toucher sur le fût hors poignée : reste`.
  - `au doigt : portée 22 px` (`pointerType` `touch`, appui à 20 px d'un point → ce point).

- [ ] **2. Rouge.**

- [ ] **3. `line-edit.ts`** :
```ts
/**
 * « Modifier les points » (OG12, n° 20 à 23, DA-7) : édition des points d'une ligne ou d'une flèche non coudée, adaptée de
 * `LinearElementEditor` d'Excalidraw (packages/element/src/linearElementEditor.ts, MIT). Une SetLinePoints au relâché
 * (une étape par glisser) ; aperçu dans le calque d'édition, élément masqué pendant le glisser.
 */
import type { ShapeElement } from "../../core/api";
import { elbowedOf } from "../../core/look";
import { isSegment } from "../../core/shapes";
import { screenToWorld } from "../camera";
import type { CloseReason } from "../input/gesture";
import { EMPTY_OVERLAY } from "../render/overlay";
import { bindEnd, pickHandle, pointHandles, worldPoints, type EndBind, type PointHit } from "./line-points";
import { DRAG_THRESHOLD_PX, SELECT_TOL_PX } from "./select";
import { constrainEnd } from "./shape";
import type { GestureTool, LivePart, ToolContext } from "./tool";

export interface LineEditor extends GestureTool {
  readonly id: string;
  selectedPoints(): readonly number[];
  removeSelected(): boolean;
}

interface Drag {
  readonly pointerId: number;
  readonly hit: PointHit;
  readonly x0: number;
  readonly y0: number;
  x: number;
  y: number;
  readonly zoom: number;
  readonly touch: boolean;
}

const NONE: ReadonlySet<string> = new Set<string>();

export function createLineEditor(ctx: ToolContext, id: string, exit: () => void): LineEditor {
  let selected: number[] = [];
  let drag: Drag | null = null;
  const view = (): ShapeElement | null => {
    const v = ctx.doc.element(id);
    return v?.kind === "shape" && isSegment(v.shape.shape) && !elbowedOf(v.look) ? v : null;
  };
  const binding = (): boolean => (ctx.bindingEnabled?.() ?? true) !== (ctx.ctrl?.() === true);
  const moved = (d: Drag): boolean => Math.hypot(d.x - d.x0, d.y - d.y0) * d.zoom >= DRAG_THRESHOLD_PX;
  /** Points pendant le glisser : point tiré ou inséré, aimanté (brut avec Alt), puis Maj : 15° depuis son voisin. */
  const dragged = (v: ShapeElement, d: Drag): { pts: [number, number][]; index: number } => {
    const pts = worldPoints(v);
    const index = d.hit.kind === "mid" ? d.hit.index + 1 : d.hit.index;
    if (d.hit.kind === "mid") pts.splice(index, 0, [d.x, d.y]);
    let [x, y] = ctx.alt?.() === true ? [d.x, d.y] : (ctx.doc.snapPoint(ctx.page(), d.x, d.y) ?? [d.x, d.y]);
    const n = index === 0 ? pts[1] : pts[index - 1];
    if (ctx.shift?.() === true && n) [x, y] = constrainEnd("line", n[0], n[1], x, y);
    pts[index] = [x, y];
    return { pts, index };
  };
  /** Liaisons : un bout tiré se lie ou se délie (n° 17) ; l'autre garde la sienne. */
  const ends = (v: ShapeElement, pts: readonly [number, number][], index: number, d: Drag): { start: EndBind["bind"]; end: EndBind["bind"]; hint: EndBind["hint"] } => {
    const last = pts.length - 1;
    let start = v.shape.start ?? null;
    let end = v.shape.end ?? null;
    let hint: EndBind["hint"] = null;
    if (index === 0 || index === last) {
      const p = pts[index]!;
      const b = bindEnd(ctx.doc, ctx.page(), p[0], p[1], d.zoom, d.touch, binding());
      if (index === 0) start = b.bind;
      else end = b.bind;
      hint = b.hint;
    }
    return { start, end, hint };
  };
  return {
    id,
    begin(pointerId, samples) {
      const s = samples[0];
      if (!s || drag !== null) return;
      const v = view();
      if (v === null) {
        exit();
        return;
      }
      const cam = ctx.camera();
      const [x, y] = screenToWorld(cam, s.x, s.y);
      const touch = ctx.pointerType?.() === "touch";
      const hit = pickHandle(worldPoints(v), x, y, cam.zoom, touch, true);
      if (hit === null) {
        if (ctx.doc.hitTest(ctx.page(), x, y, SELECT_TOL_PX / cam.zoom) !== id) exit(); // n° 22 : toucher hors de l'objet
        return;
      }
      if (hit.kind === "point") {
        const i = hit.index;
        selected = ctx.shift?.() === true ? (selected.includes(i) ? selected.filter((k) => k !== i) : [...selected, i]) : [i];
      }
      drag = { pointerId, hit, x0: x, y0: y, x, y, zoom: cam.zoom, touch };
    },
    extend(pointerId, samples) {
      const s = samples[samples.length - 1];
      if (!drag || drag.pointerId !== pointerId || !s) return;
      [drag.x, drag.y] = screenToWorld(ctx.camera(), s.x, s.y);
    },
    frame() {
      // aperçu calculé dans live()
    },
    close(pointerId: number, how: CloseReason) {
      const d = drag;
      if (!d || d.pointerId !== pointerId) return;
      drag = null;
      const v = view();
      if (how !== "end" || v === null || !moved(d)) return;
      const { pts, index } = dragged(v, d);
      const { start, end } = ends(v, pts, index, d);
      ctx.run({ type: "SetLinePoints", id, points: pts.flat(), start, end });
      selected = [index];
    },
    live(): LivePart {
      const v = view();
      if (v === null) return { strokes: [], erasers: [], hidden: NONE };
      const zoom = ctx.camera().zoom;
      const d = drag;
      if (d && moved(d)) {
        const { pts, index } = dragged(v, d);
        const { hint } = ends(v, pts, index, d);
        const first = pts[0]!;
        const last = pts[pts.length - 1]!;
        return {
          strokes: [],
          erasers: [],
          hidden: new Set([id]),
          overlay: {
            ...EMPTY_OVERLAY,
            shapes: [{ shape: v.shape.shape, x0: first[0], y0: first[1], x1: last[0], y1: last[1], points: pts.slice(1, -1).flat(), style: v.style, fill: null, ...(v.look ? { look: v.look } : {}) }],
            points: pointHandles(pts, [index], zoom, false),
            bind: hint,
          },
        };
      }
      return { strokes: [], erasers: [], hidden: NONE, overlay: { ...EMPTY_OVERLAY, points: pointHandles(worldPoints(v), selected, zoom, true) } };
    },
    active: () => drag !== null,
    leave() {
      drag = null;
      selected = [];
    },
    selectedPoints: () => selected,
    removeSelected() {
      const v = view();
      if (v === null || selected.length === 0) return false;
      const pts = worldPoints(v);
      const gone = new Set(selected);
      const keep = pts.filter((_, i) => !gone.has(i));
      selected = [];
      if (keep.length < 2) {
        ctx.run({ type: "Delete", ids: [id] });
        exit();
        return true;
      }
      const start = gone.has(0) ? null : (v.shape.start ?? null);
      const end = gone.has(pts.length - 1) ? null : (v.shape.end ?? null);
      ctx.run({ type: "SetLinePoints", id, points: keep.flat(), start, end });
      return true;
    },
  };
}
```

- [ ] **4. Vert**, **5. Commit** (GC4) : `git add apps/web/src/engine/tools/line-edit.ts` puis le test ; message
  `feat(web): line point editor "Modifier les points" (OG12 T9)` + `Co-Authored-By`.

<a id="tache-t10"></a>
### Tâche T10 — Pont Wasm, contrat commun, essai CLI

**Objectif.** Le vrai module expose `AddShape` avec points et liaisons, `SetLinePoints`, `AddLinked`, `bindTarget` et le
patch `elbowed` ; `wasm-core.ts` remplace les bouchons de T2 ; le contrat commun joue les règles d'OG12 sur les deux
fabriques (route coudée sur le vrai module seulement) ; `cli-essai.mjs` joue S5.

**Scénarios servis.** S5 (CLI de bout en bout), S1 (suivi en une étape, prouvé sur le vrai module).

**Fichiers.** Modifier : `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/wasm-core.ts`,
`apps/web/src/core/wasm-core.contract.test.ts`, `scripts/essais/cli-essai.mjs`.

**Interfaces.**
- Consomme : T1 et T4 (`Command::AddShape.line`, `SetLinePoints`, `AddLinked`, `LinkDir::parse`, `BindInput`, `LineInit`,
  `StylePatch.elbowed`, `Document::bind_target` → `BindHit` sérialisé `{ id, fixed, onOutline, anchors }`) ; T2 (types TS,
  bouchons à remplacer) ; T5 (faux cœur complet).
- Réutilise : `apps/cli/src/ops.ts:11` `COMMAND_TYPES` (étendu par T2) et `scripts/essais/cli-essai.mjs` (`verifie`,
  `cli`, `lignesOps`) — un bloc « OG12 ».
- Produit — pont (positionnel, comme l'existant) :
```rust
    // add_shape : à la suite de `link`, dans cet ordre
    elbowed: Option<bool>, points: Option<Vec<f64>>, start_id: Option<String>, start_fixed: Option<Vec<f64>>,
    end_id: Option<String>, end_fixed: Option<Vec<f64>>,
    pub fn set_line_points(&mut self, id: &str, points: Vec<f64>, start_id: Option<String>, start_fixed: Option<Vec<f64>>, end_id: Option<String>, end_fixed: Option<Vec<f64>>) -> Result<JsValue, JsError>
    pub fn add_linked(&mut self, id: &str, dir: &str) -> Result<JsValue, JsError>      // dir inconnu : BadShape
    pub fn bind_target(&self, page: &str, x: f64, y: f64, tol: f32) -> Result<JsValue, JsError>   // null sans cible
    // set_style : à la suite de `link`
    elbowed_set: bool, elbowed: Option<bool>,
```
  Aide : `fn binding_arg(id: Option<String>, fixed: Option<Vec<f64>>) -> Result<Option<BindInput>, CommandError>` —
  `(None, None)` → `None` ; `(Some(id), Some(f))` avec `f.len() == 2` → `Some` ; tout autre cas → `BadShape`.
  Fonctions natives testées : `add_shape_inner(…, look, line: LineInit)`, `set_line_points_inner(id, points, start, end)`,
  `add_linked_inner(id, dir)`.

**Test et commandes bornées** :
```bash
cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && export CARGO_TARGET_DIR=$PWD/target && pnpm install --frozen-lockfile >/dev/null
nice -n 10 cargo test -p roomboard-wasm -j 4 2>&1 | grep -E "^test result|FAILED" | tail -5          # set_line_points_inner nommé, aucun FAILED
nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release -j 4 2>&1 | tail -1
wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm
stat -c %s apps/web/src/wasm/roomboard_wasm_bg.wasm                                                    # ≤ 1572864
ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts 2>&1 | tail -5   # « contrat OG12 » sur les deux fabriques, aucun « skipped » neuf
node ~/.claude/scripts/vm/suite-vm.cjs -- bash -c 'pnpm --filter @roomboard/cli build >/dev/null && node scripts/essais/cli-essai.mjs 2>&1 | tail -4'   # « CLI : OK », lignes « OG12 : »
```
Le module formats n'est pas reconstruit ici (aucun changement : `crates/roomboard-formats` intact) ; si l'essai CLI en a
besoin, le construire comme `scripts/verifier.sh` (lignes 40-48) sans rien y changer. Tests à garder verts :
`apps/cli/src/main.test.ts`, `formats.test.ts` (`pnpm --filter @roomboard/cli test 2>&1 | tail -4`).

**Contraintes (recopiées).**
- GC1 : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`, `export CARGO_TARGET_DIR=<wt>/target`, `nice -n 10`,
  `cargo … -j 4`, suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; aucun `tauri build`.
- GC2 : module principal ≤ 1 572 864 o, formats ≤ 3 145 728 o, plafonds intouchables ; la CLI ne grossit pas les modules.
- GC3 : aucun test désactivé, sauté ou affaibli ; le contrat ne gagne aucun `skip` neuf ; aucun délai relevé (un test qui
  échoue sur un délai est rejoué une fois).
- GC4 : `git add` fichier par fichier, auteur `jejeasterix`, message anglais avec `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC5 : tout se pilote par la CLI : `cli-essai.mjs` joue S5 tel quel.
- GC8 : `schema` 1, `formatVersion` 1 ; un fichier sans champ neuf garde ses octets.
- GC9 : `cargo fmt --all --check`, `cargo clippy --workspace --all-targets -j 4 -- -D warnings` verts.
- GC10 : `pnpm install --frozen-lockfile` avant le premier test.

**Interdits.** Aucun changement de `crates/roomboard-formats`, de `FORMAT_LOTS` ni de `contract.ts` (`roomboard-cli/1` gardé) ;
aucun fichier de Jérôme écrit (fichiers temporaires de l'essai seulement).

**Terminé quand.** Commandes bornées vertes ; taille Wasm au rapport ; rapport avec `Réutilisation : appelé COMMAND_TYPES,
cli-essai.mjs (verifie, cli, lignesOps)`.

**Étapes.**

- [ ] **1. Tests d'abord.** Dans `lib.rs` (module de tests natifs, patron de `add_shape_inner_reads_back_shape`) :
  `set_line_points_inner_rewrites_points` (ligne posée, trois points, vue `shape.points == [100, 80]` en local),
  `set_line_points_inner_one_point_is_bad_points`, `add_linked_inner_unknown_dir_is_bad_shape` (`"diagonale"` →
  `BadShape`), `binding_arg_needs_id_and_two_numbers`. Les deux appels existants d'`add_shape_inner` gagnent
  `LineInit::default()`. Dans `wasm-core.contract.test.ts`, bloc `describe.each(FACTORIES)("contrat OG12 (%s)", …)` sur le
  patron des blocs existants, avec les cas de `fake-lines.test.ts` (T5) recopiés à l'identique (AddShape lié et ancré,
  suivi en une étape, rupture bout par bout, cible supprimée lue libre, copie liée aux copies et copie seule libre,
  SetLinePoints et ses refus par sous-chaîne de message, AddLinked : ids, `transform[4] === 200`, liaisons, glissement,
  une étape, bindTarget, SetStyle roundness/elbowed/pointes, SetText suivi, hitTest de la polyligne) ; et un bloc « contrat
  OG12 : vrai module seulement » (patron du bloc C9) : la flèche d'`AddLinked` a au moins deux points et des segments
  orthogonaux ; `SetStyle { elbowed: true }` sur une flèche liée en diagonale rend une route d'au moins 4 points ; un
  fichier enregistré sans champ neuf se relit et se réenregistre aux mêmes octets (`save` / `load`).

- [ ] **2. Rouge** (cargo test du pont, contrat).

- [ ] **3. `lib.rs`** : paramètres et fonctions de la section Interfaces ; `add_shape` :
```rust
        let mut look = look_of(stroke_style, roughness, seed, roundness, opacity, named).map_err(cmd_err)?;
        look.elbowed = elbowed;
        let line = LineInit {
            points: points.unwrap_or_default(),
            start: binding_arg(start_id, start_fixed).map_err(cmd_err)?,
            end: binding_arg(end_id, end_fixed).map_err(cmd_err)?,
        };
        to_js(&self.add_shape_inner(page, shape, [x0, y0, x1, y1], color, width, fill, look, line).map_err(cmd_err)?)
```
  `set_style` : `elbowed: elbowed_set.then_some(elbowed),` dans le `StylePatch`. `bind_target` :
  `to_js(&self.core.bind_target(page, x, y, tol))` (`Option` → `null`).

- [ ] **4. `wasm-core.ts`** : cas `AddShape` (à la suite de `...lookArgs(l)`) :
```ts
            l?.elbowed, cmd.points && cmd.points.length > 0 ? new Float64Array(cmd.points) : undefined,
            cmd.start?.id, cmd.start ? new Float64Array([cmd.start.fx, cmd.start.fy]) : undefined,
            cmd.end?.id, cmd.end ? new Float64Array([cmd.end.fx, cmd.end.fy]) : undefined),
```
  cas neufs (remplacent les bouchons de T2) :
```ts
      case "SetLinePoints":
        return toChange(this.d.set_line_points(cmd.id, new Float64Array(cmd.points),
          cmd.start?.id, cmd.start ? new Float64Array([cmd.start.fx, cmd.start.fy]) : undefined,
          cmd.end?.id, cmd.end ? new Float64Array([cmd.end.fx, cmd.end.fy]) : undefined));
      case "AddLinked":
        return toChange(this.d.add_linked(cmd.id, cmd.dir));
```
  `set_style` : `"elbowed" in p, p.elbowed ?? undefined` en fin d'arguments. `bindTarget` :
```ts
  bindTarget(page: string, x: number, y: number, tol: number): BindHit | null {
    const v: unknown = this.d.bind_target(page, x, y, tol);
    if (v === null || v === undefined) return null;
    if (!isRecord(v) || typeof v["id"] !== "string" || typeof v["onOutline"] !== "boolean") throw new Error(ELEMENT);
    const f = v["fixed"];
    const a = v["anchors"];
    if (!Array.isArray(f) || f.length !== 2 || !Array.isArray(a) || a.length !== 4) throw new Error(ELEMENT);
    return { id: v["id"], fixed: [Number(f[0]), Number(f[1])], onOutline: v["onOutline"], anchors: a.map((p: unknown) => (Array.isArray(p) ? [Number(p[0]), Number(p[1])] as const : [0, 0] as const)) };
  }
```

- [ ] **5. `cli-essai.mjs`** : bloc avant `console.log("CLI : OK")`, sur le patron du bloc « personnalisation-2 » :
```js
  // OG12 (S5) : deux rectangles, une flèche liée, Transform suivi puis undo en une étape, SetLinePoints refusé, AddLinked.
  {
    const f = join(dir, "fleches.roomboard");
    const rect = (x) => ({ type: "AddShape", page: "$page:0", shape: "rect", x0: x, y0: 0, x1: x + 100, y1: 50, style: { color: "#000000", width: 4 }, fill: null });
    const fleche = { type: "AddShape", page: "$page:0", shape: "arrow", x0: 100, y0: 25, x1: 400, y1: 25, style: { color: "#000000", width: 4 }, fill: null, start: { id: "$1", fx: 1, fy: 0.5 }, end: { id: "$2", fx: 0, fy: 0.5 } };
    const neuf = cli(["run", "--new", "--out", f, "--ops", "-"], lignesOps(rect(0), rect(400), fleche, { op: "state" }));
    const el = (st, k) => st?.pages?.[0]?.elements?.[k];
    const etat0 = neuf.lignes[3]?.state;
    verifie("OG12 : flèche liée aux deux rectangles", neuf.code === 0 && el(etat0, 2)?.shape?.start?.id === el(etat0, 0)?.id && el(etat0, 2)?.shape?.end?.id === el(etat0, 1)?.id, neuf.brut);
    const id2 = el(etat0, 1).id;
    const s = cli(["run", f, "--save", "--ops", "-"], lignesOps({ type: "Transform", ids: [id2], matrix: [1, 0, 0, 1, 0, 200] }, { op: "state" }, { op: "undo" }, { op: "state" }));
    const fin = (st) => { const a = el(st, 2); return [a.transform[4] + a.shape.w, a.transform[5] + a.shape.h]; };
    verifie("OG12 : Transform du second rectangle : l'extrémité suit (393, 225)", s.code === 0 && JSON.stringify(fin(s.lignes[1].state)) === "[393,225]", s.brut);
    verifie("OG12 : undo, une étape : extrémité revenue (393, 25)", JSON.stringify(fin(s.lignes[3].state)) === "[393,25]", s.brut);
    const un = cli(["run", f, "--ops", "-"], lignesOps({ type: "SetLinePoints", id: el(etat0, 2).id, points: [0, 0], start: null, end: null }));
    verifie("OG12 : SetLinePoints avec un seul point : code 1, points invalides", un.code === 1 && un.brut.includes("points invalides"), un.brut);
    const lie = cli(["run", f, "--save", "--ops", "-"], lignesOps({ type: "AddLinked", id: el(etat0, 0).id, dir: "right" }, { op: "state" }, { op: "undo" }, { op: "state" }));
    const n = (st) => st?.pages?.[0]?.elements?.length;
    verifie("OG12 : AddLinked à droite : deux éléments de plus, une étape", lie.code === 0 && lie.lignes[0].change.ids.length === 2 && n(lie.lignes[1].state) === 5 && n(lie.lignes[3].state) === 3, lie.brut);
    console.log("OG12 : flèches liées, suivi, AddLinked");
  }
```
  Placer ce bloc juste avant `console.log("CLI : OK")` : `lignesOps` (déclarée avant le bloc « personnalisation-1a ») y
  est déjà visible.

- [ ] **6. Vert** (toutes les commandes bornées), `cargo fmt --all --check`, clippy.

- [ ] **7. Commit** (GC4) : fichiers un par un ; message `feat: wasm bridge, contract and CLI essay for OG12 lines and bindings (T10)` + `Co-Authored-By`.

<a id="tache-t11"></a>
### Tâche T11 — Moteur : branchement des outils, touches, survol, doigt tardif

**Objectif.** Le moteur relie tout : contexte des outils (`ctrl`, `bindingEnabled`, `pointerType`, `editPoints`, Maj du doigt
tardif), mode « Modifier les points » (gestes routés vers l'éditeur, sortie, Suppr, Échap), Ctrl+Entrée, Alt+Maj+flèche,
survol des outils Ligne et Flèche, boutons « Modifier les points » et « Retirer le point » du panneau, attributs de `#stage`
pour les essais.

**Scénarios servis.** S1 (liaison au doigt, surlignage lu), S2 (double toucher → éditeur, doigt tardif → 15°, toucher
dehors → sortie), S3 (« + » puis sélection de la copie), S4 (Ctrl tenu, Ctrl+Entrée, Suppr, Échap, Alt+Maj+→), S6.
Effet de bord 1 (le doigt tardif devient Maj, branché ici).

**Patron à ne pas reprendre.** Ne pas ranger l'éditeur de points dans `tools` comme un outil de la barre (`engine.ts:712-723`) :
ce n'est pas un `DrawTool`, il vit pendant l'outil Sélection et sort sans changer d'outil. Le router comme l'orbite C15 :
un état `lineEditor` du moteur, prioritaire dans `sink.begin` (`engine.ts:871-893`), après le rognage et l'orbite. Ne pas
écrire dans l'éditeur depuis `key()` avant les cas existants du rognage (`engine.ts:1053-1075`) : ses cas passent juste
après eux. Chemin de référence de l'orbite : `engine.ts:876-889`.

**Fichiers.** Modifier : `apps/web/src/engine/engine.ts` (+ `engine.test.ts`), `apps/web/src/app/board-session.ts`,
`apps/web/src/app/stage-tags.ts` (+ `stage-tags.test.ts`), `apps/web/src/ui/OptionsPanel.tsx` (+ `OptionsPanel.test.tsx`).

**Interfaces.**
- Consomme : T2 (`ToolContext`, `GestureTool.hover`, `ItemStyle.arrowBinding`, `isSegment`, `elbowedOf`), T3 (`lineEditKey`,
  `linkedKey`, `isCtrlKey`, `RouterDeps.modifier`), T7 (`setItem` modifié), T8 (outils), T9 (`createLineEditor`,
  `LineEditor`).
- Réutilise : `apps/web/src/engine/input/keys.ts` (`lineEditKey`, `linkedKey` à côté d'`orderKey`) et
  `apps/web/src/ui/shortcuts.ts` (lignes de T3, lues par le menu et l'Aide sans code neuf).
- Réutilise : `apps/web/src/ui/pointer-gesture.ts` — non appelé : les poignées « + » et de points sont dans le canevas et
  passent par le moteur ; rapport : `Réutilisation : écart — aucune poignée DOM, pointer-gesture.ts inutile`.
- Produit :
  - `Engine` : `editLinePoints(): boolean` (une ligne ou flèche non coudée seule sélectionnée), `removeLinePoints(): boolean`,
    `exitLineEdit(): void`, `addLinked(dir: LinkDir): boolean` (rectangle ou ellipse seul sélectionné ; la copie devient la
    sélection), `setTouchModifier(held: boolean): void`, `hover(x: number, y: number): void` (px de la scène).
  - `EngineState` : `lineEditing?: string | null`, `linePointsSelected?: number`, `bindHint?: string | null` (facultatifs,
    publiés toujours, comme `linkEditing`).
  - `#stage` : `data-line-edit` (id ou vide), `data-bind` (id surligné ou vide), `data-line-points` (nombre choisi).
  - Panneau, section Actions : `[data-option-value="line-edit"]` « Modifier les points » (icône `edit-points`, une ligne ou
    flèche non coudée seule, hors édition) ; `[data-option-value="point-remove"]` « Retirer le point » (icône
    `point-remove`, en édition, au moins un point choisi).

**Test et commandes bornées** :
```bash
cd <wt> && pnpm install --frozen-lockfile >/dev/null
pnpm --filter @roomboard/web exec vitest run src/engine/engine.test.ts src/app/stage-tags.test.ts src/app/board-session.test.ts src/ui/OptionsPanel.test.tsx 2>&1 | tail -6
# « Test Files  4 passed » ; « Ctrl+Entrée » et « lineEdit » nommés
node ~/.claude/scripts/vm/suite-vm.cjs -- bash -c 'cd apps/web && VITEST_MAX_WORKERS=3 pnpm exec vitest run 2>&1 | tail -6'   # suite web complète verte
```

**Contraintes (recopiées).**
- GC1 : `nice -n 10` pour les suites longues ; suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- GC3 : aucun test désactivé, sauté ou affaibli ; les attributs existants de `#stage` gardent leur valeur ; seuils inchangés.
- GC4 : `git add` fichier par fichier, auteur `jejeasterix`, message anglais avec `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC7 : tactile d'abord (double toucher, doigt tardif, boutons de 44 px `rb-opt-btn`), clavier ensuite (Ctrl+Entrée,
  Suppr, Échap, Alt+Maj+flèche, Ctrl tenu) ; chaque raccourci est dans la table de T3.
- GC10 : `pnpm install --frozen-lockfile` avant le premier test.

**Interdits.** Ne pas toucher à `router.ts` (T3), aux outils (T8, T9) ni à `tool-options.ts` (T7) ; pas d'îlot
« Modificateurs » (lot 2) ; Alt-glisser reste à OG23.

**Terminé quand.** Commandes bornées vertes ; rapport avec les lignes `Réutilisation :` ci-dessus.

**Étapes.**

- [ ] **1. Tests d'abord.** `engine.test.ts` (patron des cas existants, moteur sur `fakeCore`, rendu factice) :
  - `Ctrl+Entrée : Modifier les points sur la flèche seule sélectionnée` → `state().lineEditing === id` ; coudée : rien.
  - `en édition : un appui sur une poignée va à l'éditeur, Suppr retire le point choisi, Échap sort` (une `SetLinePoints`,
    puis `lineEditing === null`, sélection gardée).
  - `toucher hors de l'objet en édition : sortie` ; `changer d'outil : sortie`.
  - `Alt+Maj+→ sur un rectangle seul : AddLinked, la copie devient la sélection` ; sur deux objets : la touche passe (faux).
  - `Ctrl tenu : ctx.ctrl() vrai jusqu'au keyUp et à la perte du focus`.
  - `doigt tardif : setTouchModifier(true) vaut Maj pour l'outil` (un redimensionnement au doigt garde les proportions).
  - `bindHint publié quand le calque surligne une cible` (outil Flèche, `hover` sur un rectangle → `state().bindHint`).
  `stage-tags.test.ts` : `lineEdit`, `bind`, `linePoints` (valeurs et vides). `OptionsPanel.test.tsx` : bouton
  « Modifier les points » visible pour une ligne seule, absent pour une flèche coudée, appelle `editLinePoints` ;
  « Retirer le point » visible en édition avec un point choisi, appelle `removeLinePoints`.

- [ ] **2. Rouge.**

- [ ] **3. `engine.ts`** :
  - État : `let ctrlHeld = false; let touchShift = false; let lastPointer = "mouse"; let lineEditor: LineEditor | null =
    null; let bindHint: string | null = null;`.
  - `ctx` : `shift: () => shiftHeld || touchShift`, `ctrl: () => ctrlHeld`, `bindingEnabled: () => item.arrowBinding`,
    `pointerType: () => lastPointer`, `editPoints: (id) => void enterLineEdit(id)`.
  - Fonctions (déclarations `function`, hissées) :
```ts
  /** OG12 (n° 21) : entre dans « Modifier les points » pour `id` (ligne ou flèche non coudée), sélection = `id`. */
  function enterLineEdit(id: string): boolean {
    const v = doc.element(id);
    if (v?.kind !== "shape" || !isSegment(v.shape.shape) || elbowedOf(v.look)) return false;
    lineEditor?.leave?.("tool");
    lineEditor = createLineEditor(ctx, id, exitLineEdit);
    selectTool.setSelection([id]);
    requestScene();
    emit();
    return true;
  }
  function exitLineEdit(): void {
    if (lineEditor === null) return;
    lineEditor.leave?.("tool");
    lineEditor = null;
    requestScene();
    emit();
  }
```
  - `sink.begin` : `lastPointer = pointerType ?? "mouse";` en tête ; le choix du geste devient
    `imageEdit … ? imageEdit.gesture : orbit !== null ? orbit.gesture : lineEditor !== null && t === "select" ? lineEditor : tools[t]`.
  - `frame` : les parts lues sont `toolList` sans `selectTool` quand `lineEditor !== null`, plus `lineEditor` ; après la
    fusion : `const hint = overlay.bind?.id ?? null; if (hint !== bindHint) { bindHint = hint; emit(); }`.
  - `setTool(t)` : `if (t !== "select") exitLineEdit();` ; après `undo`/`redo`/suppression (là où `selectTool.prune()`
    est appelé) : `if (lineEditor !== null && doc.element(lineEditor.id) === null) exitLineEdit();`.
  - `key(e)` : en tête, `if (isCtrlKey(e)) { ctrlHeld = true; return false; }` ; après le bloc du rognage et de l'orbite :
```ts
      if (lineEditKey(e)) {
        const sel = selectTool.selection();
        return sel.length === 1 && enterLineEdit(sel[0]!);
      }
      if (lineEditor !== null && edit === "delete") {
        lineEditor.removeSelected();
        return true;
      }
      if (lineEditor !== null && edit === "escape") {
        exitLineEdit();
        return true;
      }
      const dir = linkedKey(e);
      if (dir !== null) return engine.addLinked(dir);
```
    `keyUp` : `if (isCtrlKey(e)) ctrlHeld = false;` ; perte du focus (là où l'espace est relâché) : `ctrlHeld = false;
    touchShift = false;`.
  - Méthodes de `Engine` (section Interfaces) ; `addLinked(dir)` : sélection d'un seul rectangle ou ellipse, sinon `false` ;
    `const ch = run({ type: "AddLinked", id, dir })` ; `ch?.ids[0]` devient la sélection (`selectTool.setSelection`) ;
    `hover(x, y)` : `tools[tool].hover?.(x, y); loop.start();` ; `setTouchModifier(held)` : `touchShift = held;`.
  - `state()` publie `lineEditing: lineEditor?.id ?? null`, `linePointsSelected: lineEditor?.selectedPoints().length ?? 0`,
    `bindHint`.

- [ ] **4. `board-session.ts`** : dans les `deps` de `createRouter` (`:419`), après `view: engine.view,` :
  `modifier: (held) => engine.setTouchModifier(held),`. Survol : sur `stage` (l'élément passé à `createSampler`,
  `:407`), `stage.addEventListener("pointermove", onHover)` avec
  `const onHover = (e: PointerEvent): void => { if (e.buttons !== 0 || e.pointerType === "touch") return; const r =
  stage.getBoundingClientRect(); engine.hover(e.clientX - r.left, e.clientY - r.top); };` — mêmes coordonnées que
  l'échantillonneur (`sampler.ts:135`, `clientX - left`). Retirer
  l'écouteur là où la session retire les siens (`removeEventListener` au démontage).

- [ ] **5. `stage-tags.ts`** : la clé de retour gagne `"lineEdit" | "bind" | "linePoints"` ; valeurs `s.lineEditing ?? ""`,
  `s.bindHint ?? ""`, `String(s.linePointsSelected ?? 0)`.

- [ ] **6. `OptionsPanel.tsx`**, section `actions`, avant « Dupliquer » :
```tsx
        <Show when={lineTarget() && !props.state().lineEditing}>
          <IconButton keepFocus icon="edit-points" label="Modifier les points (Ctrl+Entrée)" attrs={{ "data-option-value": "line-edit", class: "rb-opt-btn" }} onPress={() => void props.engine().editLinePoints()} />
        </Show>
        <Show when={props.state().lineEditing && (props.state().linePointsSelected ?? 0) > 0}>
          <IconButton keepFocus icon="point-remove" label="Retirer le point (Suppr)" attrs={{ "data-option-value": "point-remove", class: "rb-opt-btn" }} onPress={() => void props.engine().removeLinePoints()} />
        </Show>
```
  avec `const lineTarget = (): boolean => { const t = targets(); return t.length === 1 && t[0]!.kind === "shape" &&
  isSegment(t[0]!.shape.shape) && !elbowedOf(t[0]!.look); };`.

- [ ] **7. Vert**, **8. Commit** (GC4) : fichiers un par un ; message `feat(web): wire point editor, linked nodes, Ctrl and late-finger modifiers, hover (OG12 T11)` + `Co-Authored-By`.

<a id="tache-t12"></a>
### Tâche T12 — Essai navigateur, fiche, licences, captures

**Objectif.** Prouver S1, S2, S3, S4, S6 dans Chromium (doigt `pointerType: "touch"` d'abord, souris et clavier ensuite),
brancher l'essai dans `scripts/verifier.sh --e2e`, écrire la fiche `docs/essais/outils-excalidraw.md` (ossature de
l'annexe A du cadrage, flèche et ligne remplies, les autres outils marqués « lot 2 » ou à leur état actuel), compléter
`THIRD_PARTY_NOTICES.md`, et poser les captures 2x avant/après.

**Scénarios servis.** S1, S2, S3, S4, S6 (essai navigateur) ; S5 est joué par `cli-essai.mjs` (T10) dans la même suite.

**Fichiers.** Créer : `scripts/essais/gestes.mjs`, `scripts/essais/outils-excalidraw-navigateur.mjs`,
`docs/essais/outils-excalidraw.md`, `docs/design/captures/personnalisation-2-outils/` (PNG). Modifier :
`scripts/verifier.sh` (une ligne d'essai et son écho, après `personnalisation-2-navigateur.mjs`), `THIRD_PARTY_NOTICES.md`.

**Interfaces.**
- Consomme : sélecteurs `button[data-item="arrow|line|select|rect"]`, `[data-options] [data-option="arrowType|roundness|arrowheads"]
  [data-option-value="…"]`, `[data-option-value="line-edit|point-remove|arrow-binding"]`, attributs `#stage`
  `data-line-edit`, `data-bind`, `data-line-points`, `data-selection`, `data-bounds`, `data-tool` ; état par `roomboard
  state` (CLI) après Ctrl+S (`?fichiers=repli`) ; T11 (raccourcis), T6 (rendu), T10 (CLI construite).
- Réutilise : `scripts/essais/commun.mjs` (`serve`, `loadPlaywright`, `stageBox`, `frames`, `item`, `Echec`, `gitSha`, `DIST`,
  `ROOT`) et `scripts/essais/nettete.mjs` (contrôle de netteté § 10) ; les gestes et la lecture d'état de
  `personnalisation-2-navigateur.mjs:46-196` sont **recopiés** dans `gestes.mjs` (le fichier d'OG11 n'est pas modifié,
  GC3), puis importés par le nouvel essai.
- Produit : `node scripts/essais/outils-excalidraw-navigateur.mjs [--captures] [--dist <d> --nom avant]` ; sortie
  `outils-excalidraw : OK`, codes 0 / 1 / 2 comme l'essai d'OG11 ; lignes `Lire : <clé>=<valeur>` (preuves lues).

**Test et commandes bornées** :
```bash
cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && export CARGO_TARGET_DIR=$PWD/target && pnpm install --frozen-lockfile >/dev/null
node ~/.claude/scripts/vm/suite-vm.cjs -- bash -c 'nice -n 10 scripts/verifier.sh 2>&1 | tail -3'                    # construit dist et la CLI ; « verifier.sh : OK »
node scripts/essais/outils-excalidraw-navigateur.mjs 2>&1 | grep -E "^ok —|^Lire :|outils-excalidraw :" | tail -40   # « outils-excalidraw : OK »
node ~/.claude/scripts/vm/suite-vm.cjs -- bash -c 'nice -n 10 scripts/verifier.sh --e2e 2>&1 | grep -E "OK$|ÉCHEC|FAIL" | tail -40'   # « verifier.sh : e2e OK » puis « verifier.sh : OK »
```
Tests à garder verts (carte d'impact 3.7) : `s34-navigateur.mjs`, `s5b-navigateur.mjs`, `personnalisation-2-navigateur.mjs`,
`c9-grille-navigateur.mjs`, `c3-groupes-navigateur.mjs`, `c4-bibliotheque-navigateur.mjs`, `c13-tableaux-navigateur.mjs` —
joués par `--e2e`, sans réécriture. Si l'un d'eux redimensionne une ligne ou une flèche seule par son cadre (effet de bord
8), le signaler au rapport sans le réécrire : l'orchestrateur décide.

**Preuve visuelle.** Lectures d'abord, dans la sortie de l'essai : `Lire : S1.bind=<idB>`, `Lire : S1.startBound=<idA>`,
`Lire : S1.endBound=<idB>`, `Lire : S1.gap=7`, `Lire : S2.points=3`, `Lire : S2.roundness=round`, `Lire : S2.angle15=1`,
`Lire : S3.elbowed=true`, `Lire : S3.nodes=3`, `Lire : S4.ctrl.free=1`, `Lire : S4.copy.bound=1`, `Lire : S6.start=<idA>` ;
puis `node scripts/essais/outils-excalidraw-navigateur.mjs --captures` écrit à 2x dans
`docs/design/captures/personnalisation-2-outils/` : `apres-fleche-liee.png` (S1, surlignage et ancres visibles),
`apres-modifier-points.png` (S2, poignées), `apres-carte.png` (S3, « + » et coudées), `apres-panneau-fleche.png` (Type de
flèche, Pointes, Liaison) ; `--dist <dist d'avant> --nom avant --captures` écrit `avant-fleche.png` et
`avant-panneau-fleche.png`. Dist d'avant : `~/.cache/tmp/og12-ref/apps/web/dist` (référence de l'orchestrateur) si son
`index.html` existe ; sinon `git -C <wt> worktree add --detach ~/.cache/tmp/og12-avant cddbde49`, puis dans ce dossier
`pnpm install --frozen-lockfile` et les lignes 34-38 et 58 de `scripts/verifier.sh` (Wasm principal puis
`pnpm --filter @roomboard/web build`), puis `git -C <wt> worktree remove ~/.cache/tmp/og12-avant` une fois les captures prises.
Le rapport décrit chaque capture en une ligne (ce qu'on y voit), et le contrôle de netteté des icônes neuves à 2x
(`nettete.mjs`, contre-épreuve comme `personnalisation-2-navigateur.mjs:505-578`).

**Contraintes (recopiées).**
- GC1 : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`, `export CARGO_TARGET_DIR=<wt>/target`, `nice -n 10`,
  suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; aucun `tauri build`.
- GC2 : module principal ≤ 1 572 864 o, formats ≤ 3 145 728 o (contrôlés par `verifier.sh`, valeurs lues au rapport).
- GC3 : aucun test désactivé, sauté ou affaibli ; aucun seuil ni délai relevé ; essais existants verts sans réécriture de fond ;
  un test qui échoue sur un délai est rejoué une fois.
- GC4 : `git add` fichier par fichier (chaque PNG nommé), auteur `jejeasterix`, message anglais avec `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC6 : `THIRD_PARTY_NOTICES.md`, section « Code adapté d'Excalidraw » : lignes OG12 (courbe `curveCatmullRomCubicApproxPoints`,
  écart `getBindingGap`, liaisons `binding.ts`, éditeur `linearElementEditor.ts`, route `getSimpleRoute` de
  `elbowArrow.ts`, objet relié `flowchart.ts`), avec les fichiers de RoomBoard qui les portent (`linear.rs`, `shapes.ts`,
  `fake-core.ts`, `line-edit.ts`) ; section Lucide : `spline`, `circle-minus`.
- GC7 : doigt d'abord (`Input.dispatchTouchEvent`, `pointerType: "touch"`), souris et clavier ensuite ; cibles ≥ 44 px
  mesurées (`boundingBox`) pour les boutons neufs ; netteté § 10 à 2x.

**Interdits.** Ne pas modifier `personnalisation-2-navigateur.mjs` ni les autres essais ; ne pas écrire dans un fichier
de Jérôme ; aucun téléchargement de fichier d'essai (tout est fabriqué dans l'essai).

**Terminé quand.** `outils-excalidraw : OK` et `verifier.sh : OK` après `--e2e` lus dans la sortie ; fiche et captures
commitées ; rapport avec les lectures, la description des captures, la taille des deux modules Wasm, et
`Réutilisation : appelé commun.mjs, nettete.mjs ; écart — gestes recopiés de personnalisation-2-navigateur.mjs dans
gestes.mjs (le fichier d'OG11 ne s'importe pas sans lancer son main)`.

**Étapes.**

- [ ] **1. `gestes.mjs`** : recopier de `personnalisation-2-navigateur.mjs` `newPage` (`:46-65`), `waitAttr`, `touchDrag`
  (`:77-96`), `tapAt`, `tapStage`, `press`, `useTool`, `saved`, `readState` (`:179-196`), exportés ; ajouter :
```js
/** Doigt tenu puis second doigt posé après `afterMs` (> 150 ms) pendant le glisser : Maj tactile (n° 29). */
export async function touchDragWithLateFinger(page, cdp, from, to, second, { afterMs = 300, steps = 10 } = {}) {
  const box = await stageBox(page);
  const at = ([x, y], id) => ({ x: Math.round(box.x + x), y: Math.round(box.y + y), id });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [at(from, 1)] });
  await page.waitForTimeout(afterMs);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [at(from, 1), at(second, 2)] });
  for (let i = 1; i <= steps; i++) {
    const p = [from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [at(p, 1), at(second, 2)] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(400);
  await frames(page);
}
/** Double toucher par le protocole (deux contacts à 120 ms), en px de la scène. */
export async function doubleTouch(page, cdp, [x, y]) {
  const box = await stageBox(page);
  const p = { x: Math.round(box.x + x), y: Math.round(box.y + y) };
  for (let k = 0; k < 2; k++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [p] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    if (k === 0) await page.waitForTimeout(120);
  }
  await page.waitForTimeout(400);
  await frames(page);
}
```

- [ ] **2. `outils-excalidraw-navigateur.mjs`** : en-tête (« Essai OG12, lot 1, cadrage § 6, S1 à S4 et S6, au doigt puis
  souris et clavier ; Chromium de Playwright, `--disable-lcd-text`, `--force-color-profile=srgb` ; codes 0, 1, 2 ; joué par
  `scripts/verifier.sh --e2e` »), `main()` sur le patron de `personnalisation-2-navigateur.mjs:1206-1280` (dist, CLI,
  Playwright, serveur, `--captures`, `--nom avant`, `--only sN`), et un `async function` par scénario. Chaque scénario
  ouvre une page neuve (`newPage(…, { query: "/?fichiers=repli" })`), pose ses rectangles au doigt (outil `rect`,
  `touchDrag`), puis :
  - **S1 (doigt)** : après la pose de A et B, `saved(page, tmp, "s1-avant.roomboard")` donne leurs ids (ordre de
    pose) ; outil `arrow` ; `const end = await touchDrag(page, cdp, [A.droite], [B.gauche], { hold: true })` ; pendant le
    contact, `waitAttr(page, "data-bind", idB)` (`Lire : S1.bind`) ; `await end()` ; Ctrl+S, `readState` : la flèche a `shape.start.id ===
    A`, `shape.end.id === B` (`Lire : S1.startBound`, `S1.endBound`) ; outil `select`, toucher la flèche : `data-selection
    = 1` et les poignées de bout présentes (pixel bleu de `SELECTION_COLOR` aux deux bouts, pixel blanc au centre du cadre
    absent) ; glisser B de 200 px vers le bas au doigt ; état : fin à `B.gauche − 7` (`Lire : S1.gap=7`) ; Ctrl+Z une fois :
    B et la flèche reviennent (état égal à l'état d'avant le glisser).
  - **S2 (doigt)** : flèche droite posée ; `doubleTouch` sur son milieu → `data-line-edit` non vide ; `touchDrag` du milieu
    de 80 px vers le haut → état : 3 points (`Lire : S2.points=3`) ; panneau Type de flèche → `round` (`press(page,
    "doigt", …)`) → `look.roundness === "round"` ; `touchDragWithLateFinger` d'un bout → angle du dernier segment multiple
    de 15° (`Lire : S2.angle15=1`) ; toucher le vide → `data-line-edit` vide ; Ctrl+S, fermer, rouvrir le fichier (même
    patron que l'essai d'OG11 pour rouvrir) : mêmes points, même type, mêmes liaisons ; un fichier fabriqué par la CLI de
    `main` (`run --new` avec un rectangle et une flèche) ouvert puis enregistré sans changement : mêmes octets
    pour la partie document (entrée Yrs du conteneur lue par `zipEntries` de `commun.mjs`, `sha256` égal) — le manifeste
    porte la date d'enregistrement et change seul.
  - **S3 (doigt)** : rectangle sélectionné ; toucher le « + » de droite (40 px à droite du milieu du côté droit) → 3
    éléments, flèche `look.elbowed === true` liée aux deux, `data-selection = 1` ; « + » du bas sur la copie → 5
    éléments ; reprendre le premier rectangle, « + » de droite → la nouvelle copie ne coupe aucune autre boîte
    (`Lire : S3.nodes=3`) ; glisser le premier rectangle → les flèches restent liées, segments orthogonaux ; Ctrl+Z : une
    création annulée par appui.
  - **S4 (souris et clavier)** : flèche tirée de A vers B, `page.keyboard.down("Control")` pendant le glisser souris →
    libre (`Lire : S4.ctrl.free=1`) ; Maj tenue → angle à 15° ; sélectionner une flèche, Ctrl+Entrée → `data-line-edit` ;
    clic sur un point intérieur, Suppr → un point de moins ; Échap → sortie ; rectangle sélectionné, Alt+Maj+ArrowRight →
    objet relié à droite ; sélectionner A, B et la flèche (cadre à la souris), Ctrl+D → la copie de la flèche est liée aux
    copies (`Lire : S4.copy.bound=1`) ; Ctrl+D de la flèche seule → copie libre ; interrupteur « Liaison des flèches »
    coupé (`press(page, "clavier", …)`) → une flèche tirée sur B reste libre ; menu ☰ des raccourcis et Aide : les lignes
    « Modifier les points », « Objet relié », « Flèche sans liaison » présentes.
  - **S6 (doigt)** : outil `line`, glisser de A à B → `start.id === A`, `end.id === B` (`Lire : S6.start`) ; panneau Angles →
    `round` ; `doubleTouch` sur la ligne → édition ; milieu tiré de 60 px → 3 points ; toucher dehors ; glisser A → le
    départ suit ; Ctrl+Z → A et la ligne reviennent ; `look.endArrowhead` absent (aucune pointe).
  - **Cibles** : chaque bouton neuf (`line-edit`, `point-remove`, `arrow-binding`, choix `arrowType`) mesure au moins
    44 × 44 px (`boundingBox`).
  - **Netteté** : icônes `arrow-type-*`, `head-bar`, `head-circle`, `head-circle-outline`, `edit-points`, `point-remove`,
    `arrow-binding` à 2x par `nettete.mjs` (`edgeRow`, `fringes`), contre-épreuve sur une icône floutée, comme l'essai d'OG11.

- [ ] **3. `scripts/verifier.sh`** : après `echo "personnalisation-2 : OK"`, deux lignes :
  `node scripts/essais/outils-excalidraw-navigateur.mjs` puis `echo "outils-excalidraw : OK"`. Si
  `scripts/tests/verifier-e2e.test.sh` liste les essais attendus, y ajouter la même ligne (sinon rien).

- [ ] **4. `docs/essais/outils-excalidraw.md`** : titre, une phrase de méthode (références `~/.cache/tmp/og12-excalidraw` à
  `f4e5226`, états **copié**, **adapté au tactile**, **écarté (raison)**, **lot 2**), puis un tableau par outil —
  sélection, main, rectangle, losange, ellipse, flèche, ligne, crayon, texte, image, gomme, sélection d'objets, raccourcis
  d'outils — aux colonnes `comportement · source Excalidraw (fichier:fonction) · état · essai`. Flèche et ligne : chaque
  ligne de l'annexe A du cadrage (`docs/plans/personnalisation-2-outils-cadrage.md:414-425`) avec son état et son essai
  (`outils-excalidraw-navigateur.mjs` S1 à S6, `tests/fleches.rs::<test>`, `cli-essai.mjs` « OG12 », `line-edit.test.ts`…).
  Autres outils : les lignes de l'annexe A, état « lot 2 », ou leur état actuel quand il est déjà copié (Maj au
  redimensionnement, Ctrl+D, Espace, pincement), avec l'essai existant qui le prouve quand il y en a un. Un paragraphe
  « Nom de l'action » : « Modifier les points » et sa raison (DA-7, recopiée). Les écarts du lot 1 (ordre de sortie
  appliqué ou non) y sont écrits.

- [ ] **5. `THIRD_PARTY_NOTICES.md`** : lignes de GC6.

- [ ] **6. Vert** : les trois commandes bornées ; captures (section Preuve visuelle).

- [ ] **7. Commit** (GC4) : `git add` de chaque fichier et de chaque PNG, un par un ; message
  `test: OG12 browser essay, tool sheet, notices and captures (T12)` + `Co-Authored-By`.

---

## Lot 2 (hors de ce plan)

Au périmètre, hors du temps de ce tour (cadrage § 7 ; environ 10 tâches, un plan `personnalisation-2-outils-LOT2-PLAN.md`
à écrire au prochain tour) :

- Losange : `ShapeKind::Diamond` (cœur, miroir `shapes.ts`, outil, icône, export), accrochable (n° 33).
- Édition des points des formes : rectangle, losange, ellipse convertis en ligne fermée (`polygon: true`), section dans
  l'accordéon d'OG23 (n° 34, H5).
- Rotation (poignée, Maj 15°).
- Îlot « Modificateurs » au doigt (Proportions, Depuis le centre) (n° 31, H4).
- Flèches du clavier (1 px, Maj 5 px).
- Texte dans une forme (double toucher, Entrée).
- Lettres et chiffres des outils, A répété qui fait tourner le type de flèche.
- Multi-points au clic, Alt+clic qui ajoute un point au bout.
- Segments fixes des coudées (milieux tirés, double toucher pour les retirer) (n° 25).
- Étiquettes sur flèche (H3).
- Navigation Alt+flèche entre nœuds et grappe centrée du flowchart (n° 27).
- Suivi des autres changements de boîte : `SetTableSizes`, lignes de tableau, `SetImageParams` (H11).
- Pointes restantes : `diamond`, `diamond_outline`, `cardinality_*` (n° 13).
- Fiche complète des autres outils, avec leurs essais au doigt puis à la souris et au clavier (n° 36).
