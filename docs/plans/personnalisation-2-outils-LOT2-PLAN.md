# Plan d'exécution — personnalisation-2-outils (OG12), lot 2a : losange et édition des points des formes

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**Goal :** un outil Losange (`ShapeKind::Diamond`) accrochable par les flèches, et « Modifier les points » sur un rectangle,
un losange ou une ellipse, qui le convertit en ligne fermée (`polygon: true`) en une étape annulable ; au doigt d'abord,
puis souris, clavier et CLI ; fiche et essai navigateur mis à jour.

**Architecture :** le cœur porte le genre `diamond` (collision, anneau, accroche, `AddLinked`) et une commande neuve
`ShapeToPolygon { id }` qui réécrit l'élément **en place** (même id) en ligne fermée : DA-1 gardé (départ = translation,
points intérieurs, dernier sommet = (w, h)), la fermeture du dernier sommet vers le départ est **implicite**. Le faux cœur
en est le miroir ; le moteur appelle `ShapeToPolygon` puis ouvre l'éditeur du lot 1 sur le même id.

**Tech Stack :** Rust (yrs 0.28, wasm-bindgen), TypeScript (Solid, Vitest), Canvas 2D, roughjs, Playwright.

**Spec :** `docs/plans/personnalisation-2-outils-cadrage.md` (§ 2.5 n° 33 à 36, § 2.4, H4, H5, H10, H11, annexe A) ; plan du
lot 1 : `docs/plans/personnalisation-2-outils-PLAN.md` ; fiche : `docs/essais/outils-excalidraw.md` ; demande :
`~/.cache/tmp/og12-notes/brief.md` ; consignes : `~/.cache/tmp/og12-notes/consignes-tache.md`.

## Table des tâches

| id | titre | dépend | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|--------|------------------|----------|----------|--------|----------|---------|
| L1 | Cœur : losange, ligne fermée, `ShapeToPolygon` | — | crates/roomboard-core/src/{shape.rs, linear.rs, query.rs, element.rs, commands.rs, style.rs, fill.rs, zone.rs}, crates/roomboard-core/tests/formes.rs (neuf), crates/roomboard-wasm/src/lib.rs | isolé | concepteur-critique | `cargo test -p roomboard-core --test formes` ≥ 9 tests dont `shape_to_polygon_rect_in_one_step_undo_restores` ; `--test fleches` vert ; Wasm ≤ 1 572 864 o | S7, S8, S9 | #tache-l1 |
| L2 | Contrat TS, miroir `shapes.ts`, faux cœur, CLI | — | apps/web/src/core/{api.ts, shapes.ts, shapes.test.ts, fake-core.ts, fake-formes.test.ts (neuf)}, apps/cli/src/ops.ts | isolé | concepteur-critique | vitest `fake-formes.test.ts` ≥ 7 tests dont `ShapeToPolygon en une étape` ; `shapes.test.ts` ≥ 1 test `losange` ; `tsc` web et cli verts | S7, S8, S9 | #tache-l2 |
| L3 | Rendu et export du losange et de la ligne fermée | L2 | apps/web/src/engine/render/{canvas2d.ts, canvas2d.test.ts, sketch.ts, sketch.test.ts}, apps/web/src/app/{board-io.ts, board-io.test.ts} | isolé | implementeur-tdd | vitest `canvas2d.test.ts` ≥ 1 test `losange` et ≥ 1 test `ligne fermée remplie` ; `board-io.test.ts` ≥ 1 test `losange en polyligne fermée` | S7, S8 | #tache-l3 |
| L4 | Moteur : outil Losange, entrée des formes dans « Modifier les points » | L2 | apps/web/src/engine/input/{gesture.ts, router.ts, router.test.ts}, apps/web/src/engine/tools/{shape.ts, shape.test.ts, select.ts, select.test.ts}, apps/web/src/engine/{engine.ts, engine.test.ts}, apps/web/src/{toolbar.ts, toolbar.test.ts, toolbar-profiles.ts, toolbar-profiles.test.ts}, apps/web/src/ui/{icons.ts, icons.test.ts} | isolé | implementeur-tdd | vitest `engine.test.ts` ≥ 1 test `Ctrl+Entrée sur un rectangle : ligne fermée` ; `select.test.ts` ≥ 1 test `double toucher sur une forme` ; `shape.test.ts` ≥ 1 test `losange` | S7, S8, S9 | #tache-l4 |
| L5 | Éditeur et panneau des lignes fermées | L2 | apps/web/src/engine/tools/{line-edit.ts, line-edit.test.ts, line-points.ts, line-points.test.ts}, apps/web/src/ui/{tool-options.ts, tool-options.test.ts, OptionsPanel.tsx, OptionsPanel.test.tsx} | isolé | implementeur-tdd | vitest `line-edit.test.ts` ≥ 1 test `segment de fermeture` et ≥ 1 test `trois points au moins` ; `OptionsPanel.test.tsx` ≥ 1 test `Modifier les points sur une forme` | S8, S9 | #tache-l5 |
| L6 | Pont, contrat commun, essai CLI, essai navigateur, fiche, captures | L1, L3, L4, L5 | apps/web/src/core/{wasm-core.ts, wasm-core.contract.test.ts}, scripts/essais/{cli-essai.mjs, outils-excalidraw-navigateur.mjs}, docs/essais/outils-excalidraw.md, docs/design/captures/personnalisation-2-outils/{apres-losange.png, apres-losange-lie.png, apres-forme-points.png, apres-forme-points-ellipse.png} (neufs) | isolé | implementeur-tdd | vitest contrat ≥ 1 test `contrat OG12 lot 2a` sur les deux fabriques ; `node scripts/essais/cli-essai.mjs` affiche `CLI : OK` ; `node scripts/essais/outils-excalidraw-navigateur.mjs` affiche `outils-excalidraw : OK` ; `scripts/verifier.sh --e2e` affiche `verifier.sh : OK` | S7, S8, S9 | #tache-l6 |

## Vagues (parallélisme)

Les fichiers touchés de deux tâches d'une même vague ne se recoupent jamais.

| vague | tâches en parallèle | durée visée | sert |
|---|---|---|---|
| V1 | L1 ∥ L2 | 30-35 min | cœur Rust, contrat TS et faux cœur |
| V2 | L3 ∥ L4 ∥ L5 | 30 min | rendu et export, moteur, éditeur et panneau |
| fin | L6 | 35-40 min | pont, contrats, essais, fiche, `verifier.sh --e2e` |

Deux vagues de code, puis la tâche de fin, qui dépend de tout. Une seule compilation Rust lourde par vague (L1 en V1, la
reconstruction Wasm en fin). **Ordre de sortie si le temps manque** : (1) l'ellipse convertie (L1 `ellipse_vertices`, S8 au
bouton) : le bouton reste masqué sur une ellipse, rectangle et losange gardés ; (2) le `fill` modifiable après conversion
(L1 `style.rs`, L2 `fake-core.ts`, L5 `tool-options.ts`) : le fond d'origine reste, le panneau ne l'offre plus. Chaque
retrait s'écrit au rapport final et dans la fiche.

## Scénarios du lot 2a (dérivés de n° 33, 34, 29, 21 ; à revoir)

Le cadrage n'a de scénarios que pour le lot 1 (S1 à S6). Ceux-ci en découlent, joués par `outils-excalidraw-navigateur.mjs`.

- **S7 — Losange au doigt, accroché.** Au doigt : prendre Losange (`data-item="diamond"`), glisser de (300, 200) à
  (420, 300) écran. Toucher dans un coin de la boîte, hors du losange : rien n'est sélectionné. Poser un rectangle A, prendre
  la Flèche, glisser de A vers le losange : `endBound` = losange, et la pointe est à `5 + épaisseur / 2` de son contour.
  Glisser le losange de 150 px : la fin suit ; annuler : une étape. Un second doigt tardif pendant le tracé d'un losange
  donne `w = h`.
- **S8 — Points d'une forme au doigt.** Au doigt : un rectangle rempli sélectionné, double toucher : l'élément garde son id
  et se lit `shape: "line"`, `polygon: true`, 4 sommets, fond gardé ; poignées visibles, dont celle du segment de
  fermeture. Tirer un coin de 60 px, puis le milieu du segment de fermeture : 5 sommets. Annuler trois fois : le rectangle
  d'origine. Une ellipse, bouton « Modifier les points » du panneau : 16 sommets.
- **S9 — Souris, clavier et CLI.** Souris : losange sélectionné, **Ctrl+Entrée** : ligne fermée à 4 sommets. Clic sur un
  sommet, **Suppr** : 3 sommets ; un second Suppr sur 3 sommets ne retire rien. **Échap** : sortie. Alt+Maj+→ sur un
  losange : objet relié (losange copié). CLI : `AddShape` diamond, `ShapeToPolygon`, `undo` en une étape, `SetLinePoints`
  de deux points sur la ligne fermée : code 1, `BadPoints` ; sortie `CLI : OK`.

## Carte des fichiers

| fichier | rôle | tâches |
|---|---|---|
| `crates/roomboard-core/src/shape.rs` | `ShapeKind::Diamond`, polygone et anneau du losange, `ShapeGeom.closed`, `closed_polygon` | L1 |
| `crates/roomboard-core/src/linear.rs` | `BindBox.outline` (`Outline`), contour et ancrage du losange, `AddLinked` sur losange | L1 |
| `crates/roomboard-core/src/query.rs` | `nearest_outline` du losange ; `ShapeGeom.closed` passé | L1 |
| `crates/roomboard-core/src/element.rs` | `ShapeView.polygon`, lecture de `polygon`, courbe neutre sur ligne fermée | L1 |
| `crates/roomboard-core/src/commands.rs` | `Command::ShapeToPolygon`, `cmd_shape_to_polygon`, garde de `SetLinePoints` | L1 |
| `crates/roomboard-core/src/style.rs` | fond admis sur ligne fermée, `roundness` refusé | L1 |
| `crates/roomboard-core/src/fill.rs`, `zone.rs` | littéraux `ShapeGeom` ; pot dans un losange | L1 |
| `crates/roomboard-core/tests/formes.rs` (neuf) | essais du lot 2a | L1 |
| `apps/web/src/core/api.ts`, `shapes.ts`, `fake-core.ts` | contrat, miroir géométrique, faux cœur | L2 |
| `apps/cli/src/ops.ts` | `COMMAND_TYPES` + `ShapeToPolygon` | L2 |
| `apps/web/src/engine/render/canvas2d.ts`, `sketch.ts`, `apps/web/src/app/board-io.ts` | tracé, remplissage, export | L3 |
| `apps/web/src/engine/input/gesture.ts`, `router.ts`, `tools/shape.ts`, `tools/select.ts`, `engine.ts`, `toolbar*.ts`, `ui/icons.ts` | outil Losange, double toucher, `enterLineEdit` | L4 |
| `apps/web/src/engine/tools/line-edit.ts`, `line-points.ts`, `ui/tool-options.ts`, `ui/OptionsPanel.tsx` | éditeur fermé, section du panneau | L5 |
| `apps/web/src/core/wasm-core.ts`, contrat, `scripts/essais/*`, fiche, captures | pont, preuves | L6 |

Hors carte, voulu : `crates/roomboard-formats` n'est pas touché (son `ShapeKind` est le sien, `board.rs:103`) : le losange
et la ligne fermée s'exportent en polyligne fermée par le `stroke` existant (L3).

## Global Constraints

Chaque ligne est recopiée dans la section des tâches qu'elle concerne (marque entre crochets).

- **GC1 VM partagée** [toutes] : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; `export CARGO_TARGET_DIR=<worktree
  de la tâche>/target` ; `export CARGO_BUILD_JOBS=4` ; toute commande lourde sous `nice -n 10` ; `cargo … -j 4` ; suites
  complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`. Aucun `tauri build`. Commande de plus de 2 min :
  `run_in_background: true`, jamais de boucle `sleep`.
- **GC2 Tailles Wasm** [L1, L6] : module principal ≤ 1 572 864 o, formats ≤ 3 145 728 o, plafonds intouchables. La CLI ne
  grossit pas les modules.
- **GC3 Tests** [toutes] : aucun test désactivé, sauté ou affaibli ; aucun seuil ni délai relevé ; essais existants
  (`data-item`) verts sans réécriture de fond.
- **GC4 Commits** [toutes] : fichiers ajoutés un par un (jamais `git add -A`, `.`, `commit -a`, `--force`), forme :
  `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "<message anglais>" -m
  "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
- **GC5 CLI** [L1, L2, L6] : tout ce qui touche le cœur se pilote par la CLI (`apps/cli`, `COMMAND_TYPES`, tests,
  `scripts/essais/cli-essai.mjs`).
- **GC6 Excalidraw** [L1, L2, L5, L6] : code repris d'Excalidraw (`~/.cache/tmp/og12-excalidraw`, MIT) : mention MIT en tête
  du fichier ; `THIRD_PARTY_NOTICES.md` a déjà la ligne OG12 du lot 1 (à compléter seulement si un fichier neuf en reprend).
- **GC7 Tactile** [L4, L5, L6] : tactile d'abord (cibles ≥ 44 px, appui long, événements de pointeur, jamais HTML5 drag),
  clavier ensuite ; netteté des icônes (§ 10 de `docs/plans/design-cadrage.md`, Lucide, trait 1,5, `ICON_VIEWBOX`).
- **GC8 Format** [L1, L2, L6] : `schema` 1 et `formatVersion` 1 inchangés ; `shape: "diamond"` et `polygon` sont
  facultatifs ; un neutre n'est jamais écrit (`polygon: false` jamais écrit) ; un fichier de `main` se relit et se
  réenregistre octet pour octet (n° 14).
- **GC9 Rust** [L1, L6] : `cargo fmt --all --check` et `cargo clippy --workspace --all-targets -j 4 -- -D warnings` verts
  avant le commit.
- **GC10 Worktree neuf** [L2 à L6] : `pnpm install --frozen-lockfile` à la racine avant le premier test.
- **GC11 Rouge connu** [L2 à L6] : aucun connu à la base `f8028fc0` (lot 1 vert). Tout rouge hors périmètre est consigné
  au rapport, jamais corrigé.

## Review Focus

1. **Flèche liée à une forme convertie** : la forme devient une ligne, non accrochable ; la flèche se lit libre sans
   écriture, l'annulation de la conversion la rend liée — n° 9 (lecture tolérante), n° 34. Test :
   `bound_arrow_reads_free_after_polygon` (L1), `flèche liée lue libre après ShapeToPolygon` (L2).
2. **DA-1 gardé par la ligne fermée** : jamais de dernier point égal au départ (w = h = 0) ; fermeture implicite — n° 1,
   34. Test : `shape_to_polygon_rect_in_one_step_undo_restores` (L1), `ShapeToPolygon en une étape` (L2).
3. **Rectangle arrondi converti** : `roundness` retiré, sinon la ligne fermée serait lue courbe ouverte — H5. Test :
   `rounded_rect_converted_reads_straight` (L1).
4. **Fichier de `main` rouvert** : mêmes octets, aucune clé `polygon` — n° 14. Test : `old_file_keeps_bytes`
   (`tests/fleches.rs`, gardé vert par L1).
5. **Losange : un coin de sa boîte n'est pas le losange** — n° 33. Test : `diamond_hits_inside_not_box_corners` (L1),
   `losange : coin de la boîte hors de la forme` (L2).

---

## Tâches

<a id="tache-l1"></a>
### Tâche L1 — Cœur : losange, ligne fermée, `ShapeToPolygon`

**Objectif :** `ShapeKind::Diamond` (parse `"diamond"`, collision, anneau, accroche, `AddLinked`) ; champ facultatif
`polygon: true` sur une ligne ; commande `ShapeToPolygon { id }` qui convertit en place un rectangle, un losange ou une
ellipse en ligne fermée, en une étape (n° 33, 34, H5, H10).

**Patron à ne pas reprendre :** le `polygon` d'Excalidraw ferme la ligne en répétant le premier point à la fin
(`~/.cache/tmp/og12-excalidraw/packages/element/src/typeChecks.ts`, `isValidPolygon`). Ici, ce dernier point donnerait
`(w, h) = (0, 0)` et casserait DA-1 (bornes, export, lecteur ancien qui voit le segment (0, 0)-(w, h)). Chemin de
référence à suivre : `crates/roomboard-core/src/linear.rs:296-320` (`line_writes`, départ = translation, dernier = (w, h))
et `crates/roomboard-core/src/commands.rs:1200-1270` (`cmd_set_line_points` : plan en lecture, une écriture, D38).
Fermeture **implicite** du dernier sommet vers le départ.

**Fichiers :** `crates/roomboard-core/src/{shape.rs, linear.rs, query.rs, element.rs, commands.rs, style.rs, fill.rs,
zone.rs}`, `crates/roomboard-core/tests/formes.rs` (neuf), `crates/roomboard-wasm/src/lib.rs` (compilation seule, si un
`match` sur `ShapeKind` l'exige).

**Interfaces :**
- Produit : `ShapeKind::Diamond` (`"diamond"`) ; `ShapeGeom { kind, w, h, path, curve, closed: bool }` ;
  `fn closed_polygon(raw: &[(f64, f64)], width: f32) -> Vec<f32>` (privée à `shape.rs`) ;
  `pub enum Outline { Box, Ellipse, Diamond }` et `BindBox.outline: Outline` (remplace `ellipse: bool`) ;
  `Command::ShapeToPolygon { id: String }` (JSON `{ "type": "ShapeToPolygon", "id": "…" }`), `Change.ids = [id]` ;
  `ShapeView.polygon: Option<bool>` (sérialisé `"polygon": true` seulement) ; refus : `UnknownElement`, `BadShape`
  (ligne, flèche, boîte nulle) ; `SetLinePoints` sur ligne fermée : `BadShape` si `start` ou `end`, `BadPoints` sous 3
  points.
- Réutilise : `crates/roomboard-core/src/shape.rs:81` — `shape_polygon(s: &ShapeGeom, width) -> Vec<f32>` (étendue :
  losange, `closed`).
- Réutilise : `crates/roomboard-core/src/shape.rs:285` — `shape_ring(kind, w, h, width)` (étendue : losange).
- Réutilise : `crates/roomboard-core/src/linear.rs:296` — `line_writes(t, world, start, end)` (appelée telle quelle par
  `ShapeToPolygon`).
- Réutilise : `crates/roomboard-core/src/linear.rs:191,252,266` — `bind_box`, `on_outline`, `anchor` (étendues : losange).
- Réutilise : `crates/roomboard-core/src/query.rs:378` — `nearest_outline(b, q)` (étendue : losange).
- Réutilise : `crates/roomboard-core/src/linear.rs:675` — `cmd_add_linked` (filtre étendu à `Diamond`).
- Réutilise : `crates/roomboard-core/src/style.rs:181` — `cmd_set_style` (admission du fond sur ligne fermée, `roundness`
  inapplicable).
- Consommé par : L2 (miroir), L6 (pont, contrat, CLI).

**Test et commande bornée :**
```bash
cd <worktree> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH CARGO_TARGET_DIR=<worktree>/target CARGO_BUILD_JOBS=4 \
 && nice -n 10 cargo test -p roomboard-core --test formes -j 4 2>&1 | tail -15
# attendu : « test result: ok. N passed », N ≥ 9, `shape_to_polygon_rect_in_one_step_undo_restores` nommé
nice -n 10 cargo test -p roomboard-core --test fleches -j 4 2>&1 | tail -5   # vert, dont old_file_keeps_bytes
node ~/.claude/scripts/vm/suite-vm.cjs -- cargo test -p roomboard-core -j 4 2>&1 | tail -5   # « test result: ok » partout
nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release -j 4 \
 && stat -c %s target/wasm32-unknown-unknown/release/roomboard_wasm.wasm   # ≤ 1 572 864 (avant wasm-bindgen : noter les deux)
```

**Contraintes (recopiées) :**
- GC1 VM partagée : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; `CARGO_TARGET_DIR=<worktree>/target` ;
  `CARGO_BUILD_JOBS=4` ; `nice -n 10` ; `cargo … -j 4` ; suites complètes par `suite-vm.cjs` ; aucun `tauri build` ;
  commande longue en arrière-plan, jamais de boucle `sleep`.
- GC2 Tailles Wasm : principal ≤ 1 572 864 o, formats ≤ 3 145 728 o, intouchables.
- GC3 Tests : aucun test désactivé, sauté ou affaibli ; aucun seuil relevé.
- GC4 Commits : fichiers un par un, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, trailer
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC5 CLI : `ShapeToPolygon` est pilotable (L2 ajoute le type à `COMMAND_TYPES`, L6 l'essai).
- GC6 Excalidraw : mention MIT en tête d'un fichier qui en reprend du code (ici, aucun code repris : la conversion est
  propre à RoomBoard, la fermeture implicite est un écart écrit dans la fiche par L6).
- GC8 Format : `schema` 1 et `formatVersion` 1 ; `polygon: false` jamais écrit ; fichier de `main` relu octet pour octet.
- GC9 Rust : `cargo fmt --all --check` et `cargo clippy --workspace --all-targets -j 4 -- -D warnings` verts.

**Interdits :** ne touche ni `apps/`, ni `crates/roomboard-formats`, ni `tests/fleches.rs` (il doit rester vert tel quel).
Pas de nouveau champ côté objet lié (DA-2). Aucun `insert_fragment`.

**Terminé :** `--test formes` ≥ 9 tests verts, `--test fleches` vert, `cargo test -p roomboard-core` vert, fmt et clippy
verts, taille Wasm notée ≤ plafond, un commit. Rapport : lignes `Réutilisation : appelé <module>` ou
`Réutilisation : écart — <pourquoi>` pour chaque `Réutilise :` ci-dessus.

**Étapes :**

1. Écrire `crates/roomboard-core/tests/formes.rs` (rouge : `Diamond`, `ShapeToPolygon` inconnus).

```rust
//! OG12 (lot 2a) : losange (n° 33) et ligne fermée par `ShapeToPolygon` (n° 34, H5). Cadrage :
//! docs/plans/personnalisation-2-outils-cadrage.md.
use roomboard_core::commands::{Command, CommandError};
use roomboard_core::document::Document;
use roomboard_core::element::{Look, StrokeStyle};
use roomboard_core::linear::{BindInput, LineInit, LinkDir};
use roomboard_core::shape::ShapeKind;
use roomboard_core::style::StylePatch;

fn pen() -> StrokeStyle {
    StrokeStyle { color: "#000000".into(), width: 4.0 }
}
fn page(d: &Document) -> String {
    d.page_ids()[0].clone()
}
fn add(d: &mut Document, kind: ShapeKind, c: [f64; 4], fill: Option<String>, look: Look, line: LineInit) -> Result<String, CommandError> {
    let page = page(d);
    let ch = d.apply(Command::AddShape {
        page, shape: kind, x0: c[0], y0: c[1], x1: c[2], y1: c[3], style: pen(), fill, look, line,
    })?;
    Ok(ch.ids[0].clone())
}
fn plain(d: &mut Document, kind: ShapeKind, c: [f64; 4]) -> String {
    add(d, kind, c, None, Look::default(), LineInit::default()).expect("forme")
}
fn view(d: &Document, id: &str) -> serde_json::Value {
    serde_json::to_value(d.element(id).expect("élément")).expect("json")
}
/// Sommets monde : départ, points intérieurs, (w, h).
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
fn to_polygon(d: &mut Document, id: &str) -> Result<(), CommandError> {
    d.apply(Command::ShapeToPolygon { id: id.into() }).map(|_| ())
}

/// S7, n° 33 : le losange se lit, se touche dedans, pas dans les coins de sa boîte.
#[test]
fn diamond_hits_inside_not_box_corners() {
    let mut d = Document::blank();
    let id = plain(&mut d, ShapeKind::Diamond, [0.0, 0.0, 100.0, 100.0]);
    assert_eq!(view(&d, &id)["shape"]["shape"], "diamond");
    let p = page(&d);
    assert_eq!(d.hit_test(&p, 50.0, 50.0, 0.0).as_deref(), Some(id.as_str()));
    assert_eq!(d.hit_test(&p, 8.0, 8.0, 0.0), None, "coin de la boîte hors du losange");
}

/// S7, n° 5, 17 : une flèche se lie au sommet haut du losange, pointe à 5 + 4/2 du contour.
#[test]
fn arrow_binds_to_diamond_outline_with_gap() {
    let mut d = Document::blank();
    let id = plain(&mut d, ShapeKind::Diamond, [0.0, 0.0, 100.0, 100.0]);
    let hit = d.bind_target(&page(&d), 50.0, -3.0, 15.0).expect("cible");
    assert_eq!(hit.id, id);
    assert!(hit.on_outline);
    let line = LineInit { points: vec![], start: None, end: Some(BindInput { id: id.clone(), fx: 0.5, fy: 0.0 }) };
    let a = add(&mut d, ShapeKind::Arrow, [50.0, -200.0, 50.0, -3.0], None, Look::default(), line).expect("flèche");
    let w = world(&d, &a);
    assert!(near(*w.last().unwrap(), (50.0, -7.0)), "sommet haut (50, 0) écarté de 7 : {w:?}");
}

/// H10 levée au lot 2a : `AddLinked` copie un losange.
#[test]
fn add_linked_accepts_diamond() {
    let mut d = Document::blank();
    let id = plain(&mut d, ShapeKind::Diamond, [0.0, 0.0, 100.0, 60.0]);
    let ch = d.apply(Command::AddLinked { id, dir: LinkDir::Right }).expect("relié");
    assert_eq!(view(&d, &ch.ids[0])["shape"]["shape"], "diamond");
}

/// S8, n° 34, DA-1 : rectangle rempli converti en place, une étape ; fermeture implicite (dernier ≠ départ).
#[test]
fn shape_to_polygon_rect_in_one_step_undo_restores() {
    let mut d = Document::blank();
    let id = add(&mut d, ShapeKind::Rect, [10.0, 20.0, 110.0, 70.0], Some("#ff0000".into()), Look::default(), LineInit::default()).expect("rect");
    let before = view(&d, &id);
    to_polygon(&mut d, &id).expect("conversion");
    let v = view(&d, &id);
    assert_eq!(v["shape"]["shape"], "line");
    assert_eq!(v["shape"]["polygon"], true);
    assert_eq!(v["shape"]["fill"], "#ff0000");
    let w = world(&d, &id);
    assert_eq!(w.len(), 4);
    for (p, q) in w.iter().zip([(10.0, 20.0), (110.0, 20.0), (110.0, 70.0), (10.0, 70.0)]) {
        assert!(near(*p, q), "{w:?}");
    }
    assert!(d.undo());
    assert_eq!(view(&d, &id), before, "une seule étape");
}

/// S8 : losange 4 sommets (haut, droite, bas, gauche) ; ellipse 16 sommets.
#[test]
fn shape_to_polygon_diamond_and_ellipse_vertices() {
    let mut d = Document::blank();
    let dm = plain(&mut d, ShapeKind::Diamond, [0.0, 0.0, 100.0, 60.0]);
    to_polygon(&mut d, &dm).expect("losange");
    let w = world(&d, &dm);
    assert_eq!(w.len(), 4);
    assert!(near(w[0], (50.0, 0.0)) && near(w[1], (100.0, 30.0)) && near(w[2], (50.0, 60.0)) && near(w[3], (0.0, 30.0)), "{w:?}");
    let el = plain(&mut d, ShapeKind::Ellipse, [0.0, 0.0, 100.0, 60.0]);
    to_polygon(&mut d, &el).expect("ellipse");
    let w = world(&d, &el);
    assert_eq!(w.len(), 16);
    assert!(near(w[0], (50.0, 0.0)), "départ en haut : {w:?}");
}

/// H5 : un rectangle arrondi converti perd `roundness` (sinon courbe ouverte).
#[test]
fn rounded_rect_converted_reads_straight() {
    let mut d = Document::blank();
    let id = plain(&mut d, ShapeKind::Rect, [0.0, 0.0, 100.0, 50.0]);
    d.apply(Command::SetStyle { ids: vec![id.clone()], patch: StylePatch { roundness: Some(Some("round".into())), ..Default::default() } }).expect("arrondi");
    to_polygon(&mut d, &id).expect("conversion");
    assert!(view(&d, &id)["look"]["roundness"].is_null(), "roundness retiré");
}

/// n° 1 : une ligne fermée se touche dedans, ses bornes valent celles du rectangle.
#[test]
fn polygon_hits_inside_like_the_rect() {
    let mut d = Document::blank();
    let id = plain(&mut d, ShapeKind::Rect, [0.0, 0.0, 100.0, 50.0]);
    let b0 = d.element_bounds(&id).expect("bornes");
    to_polygon(&mut d, &id).expect("conversion");
    assert_eq!(d.hit_test(&page(&d), 50.0, 25.0, 0.0).as_deref(), Some(id.as_str()));
    let b1 = d.element_bounds(&id).expect("bornes");
    assert_eq!(b0, b1);
}

/// n° 12 b : sur une ligne fermée, liaisons refusées, moins de 3 sommets refusés ; ligne ou flèche : pas de conversion.
#[test]
fn polygon_refuses_bindings_and_fewer_than_3_points() {
    let mut d = Document::blank();
    let id = plain(&mut d, ShapeKind::Rect, [0.0, 0.0, 100.0, 50.0]);
    let other = plain(&mut d, ShapeKind::Rect, [300.0, 0.0, 400.0, 50.0]);
    to_polygon(&mut d, &id).expect("conversion");
    let two = Command::SetLinePoints { id: id.clone(), points: vec![0.0, 0.0, 100.0, 0.0], start: None, end: None };
    assert_eq!(d.apply(two).unwrap_err(), CommandError::BadPoints);
    let bound = Command::SetLinePoints {
        id: id.clone(), points: vec![0.0, 0.0, 100.0, 0.0, 100.0, 50.0],
        start: Some(BindInput { id: other, fx: 0.0, fy: 0.5 }), end: None,
    };
    assert_eq!(d.apply(bound).unwrap_err(), CommandError::BadShape);
    let line = plain(&mut d, ShapeKind::Line, [0.0, 0.0, 50.0, 50.0]);
    assert_eq!(to_polygon(&mut d, &line).unwrap_err(), CommandError::BadShape);
}

/// Review Focus 1, n° 9 : flèche liée au rectangle converti : lue libre, l'annulation la rend liée.
#[test]
fn bound_arrow_reads_free_after_polygon() {
    let mut d = Document::blank();
    let r = plain(&mut d, ShapeKind::Rect, [0.0, 0.0, 100.0, 50.0]);
    let line = LineInit { points: vec![], start: None, end: Some(BindInput { id: r.clone(), fx: 0.0, fy: 0.5 }) };
    let a = add(&mut d, ShapeKind::Arrow, [-200.0, 25.0, -7.0, 25.0], None, Look::default(), line).expect("flèche");
    to_polygon(&mut d, &r).expect("conversion");
    assert!(view(&d, &a)["shape"]["end"].is_null(), "lue libre");
    assert!(d.undo());
    assert_eq!(view(&d, &a)["shape"]["end"]["id"], r.as_str());
}
```

   Si `Document::element_bounds` n'existe pas sous ce nom, prendre la requête de bornes publique de `query.rs` (même
   usage que `tests/fleches.rs`) et le noter au rapport. Commande : `cargo test -p roomboard-core --test formes` → rouge
   (`no variant named Diamond`).

2. `shape.rs` : variante et polygones.

```rust
pub enum ShapeKind { Rect, Ellipse, Diamond, Line, Arrow }
// parse : "diamond" => ShapeKind::Diamond ; as_str : ShapeKind::Diamond => "diamond"

/// Sommets du losange (haut, droite, bas, gauche), décalés de `off` le long de la normale (`off` > 0 : dehors) ;
/// décalage d'un sommet = off × hypot(w, h) / côté opposé (droites parallèles à `off` des arêtes).
fn diamond_points(w: f64, h: f64, off: f64) -> Vec<f64> {
    let l = w.hypot(h);
    let (ox, oy) = (off * l / h, off * l / w);
    vec![w / 2.0, -oy, w + ox, h / 2.0, w / 2.0, h + oy, -ox, h / 2.0]
}
```

   Dans `shape_polygon` : `ShapeKind::Diamond` → si `w < 1e-9 || h < 1e-9`, le rectangle élargi (même liste que `Rect`),
   sinon `diamond_points(w, h, half)`. `ShapeGeom` gagne `pub closed: bool` (`plain` : `false`) ; en tête de
   `shape_polygon` :

```rust
    if kind.is_segment() && s.closed {
        let pts = crate::linear::flatten(&crate::linear::path_of(w, h, s.path), false);
        return closed_polygon(&pts, width);
    }
```

```rust
/// Ligne fermée (OG12, n° 34) : sommets dédoublonnés, fermeture implicite ; chaque sommet poussé de la demi-épaisseur
/// le long de la bissectrice extérieure (onglet borné à 4 demi-épaisseurs, comme `band_polygon`). Moins de 3 sommets :
/// la polyligne épaissie.
fn closed_polygon(raw: &[(f64, f64)], width: f32) -> Vec<f32> {
    let half = (f64::from(width) / 2.0).max(1.0);
    let mut pts: Vec<(f64, f64)> = Vec::with_capacity(raw.len());
    for p in raw {
        if pts.last().is_none_or(|q| (q.0 - p.0).hypot(q.1 - p.1) > 1e-9) {
            pts.push(*p);
        }
    }
    if pts.len() > 1 && (pts[0].0 - pts[pts.len() - 1].0).hypot(pts[0].1 - pts[pts.len() - 1].1) <= 1e-9 {
        pts.pop();
    }
    if pts.len() < 3 {
        return band_polygon(raw, width, false);
    }
    let n = pts.len();
    let area: f64 = (0..n).map(|i| { let (a, b) = (pts[i], pts[(i + 1) % n]); a.0 * b.1 - b.0 * a.1 }).sum();
    let sgn = if area >= 0.0 { 1.0 } else { -1.0 };
    let normal = |a: (f64, f64), b: (f64, f64)| {
        let (dx, dy) = (b.0 - a.0, b.1 - a.1);
        let l = dx.hypot(dy);
        (sgn * dy / l, -sgn * dx / l)
    };
    let mut out = Vec::with_capacity(2 * n);
    for i in 0..n {
        let (p, prev, next) = (pts[i], pts[(i + n - 1) % n], pts[(i + 1) % n]);
        let (na, nb) = (normal(prev, p), normal(p, next));
        let (mx, my) = (na.0 + nb.0, na.1 + nb.1);
        let ml = mx.hypot(my);
        let (mx, my) = if ml < 1e-9 { na } else { (mx / ml, my / ml) };
        let cos = (mx * na.0 + my * na.1).max(0.25);
        out.push((p.0 + mx * half / cos) as f32);
        out.push((p.1 + my * half / cos) as f32);
    }
    out
}
```

   `shape_ring` : `ShapeKind::Diamond` → intérieur `diamond_points(w, h, -half)` parcouru en sens inverse (sommets 0, 3,
   2, 1), vide si `2.0 * half * w.hypot(h) / w >= h` ou `2.0 * half * w.hypot(h) / h >= w`. Chaque littéral
   `ShapeGeom { … }` du cœur (`query.rs`, `fill.rs`, `zone.rs`) gagne `closed: <lu>` (voir étape 3).

3. `element.rs` : lecture de `polygon` (clé de premier niveau de l'élément, comme `points` ; `Any::Bool(true)` seulement,
   toute autre valeur lue `false` et gardée telle quelle, U3) sur `shape: "line"` seulement ; `ShapeView` gagne

```rust
    /// OG12 lot 2a (n° 34) : ligne fermée, fermeture implicite du dernier sommet vers le départ ; absent = ouverte.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub polygon: Option<bool>,
```

   et le `curve` lu devient `roundness == round && !elbowed && !polygon`. La structure de lecture de la forme
   (`read_shape`) porte `polygon: bool`, passé à `ShapeGeom.closed` par les appelants de `shape_polygon`.

4. `linear.rs` : `BindBox.ellipse: bool` devient `outline: Outline` ; `bind_box` donne `Outline::Ellipse` pour une ellipse,
   `Outline::Diamond` pour un losange, `Outline::Box` ailleurs ; la ligne fermée reste non accrochable (`is_segment`).

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Outline { Box, Ellipse, Diamond }

// on_outline, branche losange :
Outline::Diamond => {
    let (cx, cy) = (b.w / 2.0 - IN, b.h / 2.0 - IN);
    if cx <= 0.0 || cy <= 0.0 { return true; }
    (q.0 - b.w / 2.0).abs() / cx + (q.1 - b.h / 2.0).abs() / cy >= 1.0
}
// anchor, facteur de projection :
let s = match b.outline {
    Outline::Ellipse => 1.0 / ((dx / cx).powi(2) + (dy / cy).powi(2)).sqrt(),
    Outline::Diamond => 1.0 / (dx.abs() / cx + dy.abs() / cy),
    Outline::Box => 1.0 / (dx.abs() / cx).max(dy.abs() / cy),
};
```

   Les tests internes (`linear.rs:886,892`) passent `outline: Outline::Box` et `outline: Outline::Ellipse`.
   `cmd_add_linked` : `matches!(s.kind, ShapeKind::Rect | ShapeKind::Ellipse | ShapeKind::Diamond)`.

5. `query.rs` `nearest_outline`, branche losange, avant la branche rectangle :

```rust
    if b.outline == Outline::Diamond {
        let (cx, cy) = (b.w / 2.0, b.h / 2.0);
        let v = [(cx, 0.0), (b.w, cy), (cx, b.h), (0.0, cy)];
        let mut best = (v[0], f64::INFINITY);
        for i in 0..4 {
            let (a, c) = (v[i], v[(i + 1) % 4]);
            let (ex, ey) = (c.0 - a.0, c.1 - a.1);
            let t = (((q.0 - a.0) * ex + (q.1 - a.1) * ey) / (ex * ex + ey * ey)).clamp(0.0, 1.0);
            let p = (a.0 + t * ex, a.1 + t * ey);
            let dist = (q.0 - p.0).hypot(q.1 - p.1);
            if dist < best.1 { best = (p, dist); }
        }
        let inside = (q.0 - cx).abs() / cx + (q.1 - cy).abs() / cy <= 1.0;
        return (best.0, best.1, inside);
    }
```

6. `commands.rs` : variante `ShapeToPolygon { id: String }` (doc : « OG12 lot 2a (n° 34, H5) : rectangle, losange ou
   ellipse convertis en place en ligne fermée, une étape ; `BadShape` sinon »), branchée dans `apply` comme
   `SetLinePoints`. Garde de `cmd_set_line_points` : si la cible est fermée, `start.is_some() || end.is_some()` →
   `BadShape`, `n < 3` → `BadPoints`.

```rust
    /// `ShapeToPolygon` (n° 34) : sommets locaux de la forme, mis en monde par sa transform, écrits par `line_writes`
    /// (départ = translation, dernier = (w, h), fermeture implicite) ; `shape` = "line", `polygon` = true, `roundness`
    /// retiré ; fond, couleurs, trait gardés. Une transaction.
    fn cmd_shape_to_polygon(&mut self, id: &str) -> Result<Change, CommandError> {
        let (e, page, plan) = {
            let txn = self.read();
            let found = self.find_element(&txn, id).ok_or_else(|| CommandError::UnknownElement(id.to_string()))?;
            let s = read_shape(&txn, &found.element).ok_or(CommandError::BadShape)?;
            let t = out_transform(found.element.get(&txn, "transform")).ok_or(CommandError::BadShape)?;
            let (w, h) = (s.w, s.h);
            if s.kind.is_segment() || !(w > 0.0 && h > 0.0 && w.is_finite() && h.is_finite()) {
                return Err(CommandError::BadShape);
            }
            let local: Vec<(f64, f64)> = match s.kind {
                ShapeKind::Rect => vec![(0.0, 0.0), (w, 0.0), (w, h), (0.0, h)],
                ShapeKind::Diamond => vec![(w / 2.0, 0.0), (w, h / 2.0), (w / 2.0, h), (0.0, h / 2.0)],
                _ => (0..16)
                    .map(|k| {
                        let a = -std::f64::consts::FRAC_PI_2 + std::f64::consts::TAU * k as f64 / 16.0;
                        (w / 2.0 + w / 2.0 * a.cos(), h / 2.0 + h / 2.0 * a.sin())
                    })
                    .collect(),
            };
            let world: Vec<(f64, f64)> = local.iter().map(|p| apply_transform(&t, p.0, p.1)).collect();
            let mut plan = linear::line_writes(&t, &world, None, None)?;
            plan.push(("shape", Some(In::Any(Any::from("line")))));
            plan.push(("polygon", Some(In::Any(Any::Bool(true)))));
            (found.element, found.page_id, plan)
        };
        {
            let mut txn = self.transact_local();
            for (k, v) in plan {
                crate::fill::set_or_remove(&e, &mut txn, k, v);
            }
            // H5 : `roundness` retiré par le chemin de `cmd_set_style` pour un neutre (même transaction).
            crate::style::clear_roundness(&e, &mut txn);
        }
        Ok(self.done(Change { pages: vec![page], ids: vec![id.to_string()], ..Default::default() }))
    }
```

   `crate::style::clear_roundness(e, txn)` : petite fonction `pub(crate)` de `style.rs`, qui retire la clé d'aspect
   `roundness` comme le fait `cmd_set_style` pour `Some(None)` (même clé, même emplacement : `element.rs:437`
   `LOOK_KEYS`). Les noms `In`, `Any`, `apply_transform` sont ceux déjà importés par `commands.rs` ; s'ils diffèrent,
   suivre l'usage de `cmd_set_line_points`. Au lot 1, la translation de `t` vaut le coin haut-gauche : la forme ne bouge
   pas à l'écran.

7. `style.rs` : `background` et `fillStyle` admis sur une ligne fermée (comme rectangle et ellipse) ; `roundness`
   inapplicable sur une ligne fermée (aucune étape, D38). `fill.rs` : le pot remplit l'intérieur d'un losange comme celui
   d'un rectangle (`field_for`) ; `zone.rs` : le losange compte comme mur par `shape_ring`, la ligne fermée non (pas
   d'anneau, comme une ligne). Tout `match` exhaustif sur `ShapeKind` (compilateur) reçoit `Diamond` traité comme
   `Rect` sauf polygone et contour.

8. Vert : `cargo test -p roomboard-core --test formes` (≥ 9 passed), `--test fleches` vert, `cargo test -p roomboard-core`
   par `suite-vm.cjs`, `cargo fmt --all --check`, `cargo clippy --workspace --all-targets -j 4 -- -D warnings`, taille du
   module Wasm notée. Commit : `feat(core): diamond shape and ShapeToPolygon closed line (OG12 lot 2a)`.

<a id="tache-l2"></a>
### Tâche L2 — Contrat TS, miroir `shapes.ts`, faux cœur, CLI

**Objectif :** le contrat TS et le faux cœur connaissent `diamond`, `polygon` et `ShapeToPolygon`, au comportement exact du
cœur (L1, même contrat écrit ci-dessous) ; la CLI accepte le type.

**Patron à ne pas reprendre :** fermer la ligne en répétant le premier point (Excalidraw `isValidPolygon`) : DA-1 cassé.
Ne pas non plus réécrire une boucle de collision dans `fake-core.ts` (constat ouvert `fake-core.ts:1081`, `edgeHit`) : tout
passe par `shapePolygon` de `shapes.ts`. Chemin de référence : `apps/web/src/core/fake-core.ts:1106` (`case
"SetLinePoints"`, une étape, D38) et `apps/web/src/core/shapes.ts:99-130` (`shapePolygon`).

**Fichiers :** `apps/web/src/core/{api.ts, shapes.ts, shapes.test.ts, fake-core.ts, fake-formes.test.ts (neuf)}`,
`apps/cli/src/ops.ts`.

**Interfaces :**
- Produit (`api.ts`) : `type ShapeKind = "rect" | "ellipse" | "diamond" | "line" | "arrow"` ; `ShapeView.polygon?: true` ;
  `| { readonly type: "ShapeToPolygon"; readonly id: string }` dans `Command`.
- Produit (`shapes.ts`) : `SHAPE_KINDS` avec `"diamond"` ; `LineGeom.closed?: boolean` ;
  `shapePolygon(kind, w, h, width, line?)` (losange, fermée) ; `export type Outline = "box" | "ellipse" | "diamond"` et
  `BindBox.outline: Outline` (remplace `ellipse: boolean`) ; `export const isClosedShape = (v: ShapeView): boolean =>
  v.shape === "line" && v.polygon === true` ; `export const isPointsShape = (k: ShapeKind): boolean => k === "rect" ||
  k === "ellipse" || k === "diamond"` (formes convertibles).
- Produit (`ops.ts`) : `"ShapeToPolygon"` dans `COMMAND_TYPES`.
- Réutilise : `apps/web/src/core/shapes.ts:99` — `shapePolygon` (étendue) ; `shapes.ts:236-256` — `BindBox`, contour et
  ancrage (étendus).
- Réutilise : `apps/web/src/core/fake-core.ts:656` — `bindBoxOf` (étendu) ; `fake-core.ts:1106` — `case "SetLinePoints"`
  (garde fermée) ; `fake-core.ts:1142` — `AddLinked` (losange admis).
- Réutilise : `apps/cli/src/ops.ts:11` — `COMMAND_TYPES`.
- Consommé par : L3, L4, L5, L6.

**Test et commande bornée :**
```bash
cd <worktree> && pnpm install --frozen-lockfile >/dev/null && cd apps/web \
 && npx vitest run src/core/fake-formes.test.ts src/core/shapes.test.ts src/core/fake-core.test.ts 2>&1 | tail -8
# attendu : « Test Files  3 passed », ≥ 7 tests dans fake-formes dont « ShapeToPolygon en une étape », « losange » nommé dans shapes.test.ts
npx tsc --noEmit -p . 2>&1 | tail -5 ; cd ../cli && npx tsc --noEmit -p . 2>&1 | tail -5   # aucune erreur
```

**Contraintes (recopiées) :**
- GC1 VM partagée : `nice -n 10` ; suites complètes (`npx vitest run` sans filtre) par `node ~/.claude/scripts/vm/suite-vm.cjs
  -- <commande>` ; commande longue en arrière-plan ; aucun `tauri build`.
- GC3 Tests : aucun test désactivé, sauté ou affaibli ; ne touche pas `wasm-core.contract.test.ts` (L6).
- GC4 Commits : fichiers un par un, auteur `jejeasterix`, message anglais, trailer `Co-Authored-By: Claude Opus 5.5
  <noreply@anthropic.com>`.
- GC5 CLI : `ShapeToPolygon` dans `COMMAND_TYPES` (le compilateur le vérifie, `ops.ts:18-20`).
- GC6 Excalidraw : mention MIT seulement si du code d'Excalidraw est repris (aucun ici).
- GC8 Format : `polygon` jamais écrit à `false` ; un neutre jamais écrit.
- GC10 Worktree neuf : `pnpm install --frozen-lockfile` à la racine.
- GC11 : rouge hors périmètre consigné, jamais corrigé.

**Interdits :** ne touche ni `wasm-core.ts` ni le contrat (L6), ni l'interface. Aucune route coudée dans le faux cœur.

**Terminé :** les trois fichiers de test verts, `tsc` web et cli verts, suite web verte par `suite-vm.cjs`, un commit.
Rapport : une ligne `Réutilisation : …` par `Réutilise :`.

**Étapes :**

1. Écrire `apps/web/src/core/fake-formes.test.ts` (rouge). Reprendre les aides de `fake-lines.test.ts` (création du faux
   document, `apply`, `element`) en tête du fichier.

```ts
import { describe, expect, it } from "vitest";
import { createFakeCore } from "./fake-core";
import type { ShapeElement } from "./api";

const doc = () => createFakeCore().blank();
const pen = { color: "#000000", width: 4 };
function add(d: ReturnType<typeof doc>, shape: "rect" | "diamond" | "ellipse" | "arrow" | "line", c: [number, number, number, number], extra: Record<string, unknown> = {}): string {
  const page = d.pageIds()[0]!;
  const ch = d.apply({ type: "AddShape", page, shape, x0: c[0], y0: c[1], x1: c[2], y1: c[3], style: pen, fill: null, ...extra } as never);
  return ch.ids[0]!;
}
const shapeOf = (d: ReturnType<typeof doc>, id: string) => (d.element(id) as ShapeElement).shape;

describe("OG12 lot 2a : losange et ligne fermée (faux cœur)", () => {
  it("losange : coin de la boîte hors de la forme", () => {
    const d = doc();
    const id = add(d, "diamond", [0, 0, 100, 100]);
    expect(shapeOf(d, id).shape).toBe("diamond");
    expect(d.hitTest(d.pageIds()[0]!, 50, 50, 0)).toBe(id);
    expect(d.hitTest(d.pageIds()[0]!, 8, 8, 0)).toBeNull();
  });
  it("flèche liée au sommet haut du losange, écart 5 + 4/2", () => {
    const d = doc();
    const id = add(d, "diamond", [0, 0, 100, 100]);
    const a = add(d, "arrow", [50, -200, 50, -3], { end: { id, fx: 0.5, fy: 0 } });
    const s = shapeOf(d, a);
    const e = d.element(a)!;
    expect(e.transform[5] + s.h).toBeCloseTo(-7, 6);
  });
  it("ShapeToPolygon en une étape : rectangle rempli converti en place", () => {
    const d = doc();
    const id = add(d, "rect", [10, 20, 110, 70], { fill: "#ff0000" });
    const before = JSON.stringify(d.element(id));
    d.apply({ type: "ShapeToPolygon", id });
    const s = shapeOf(d, id);
    expect(s.shape).toBe("line");
    expect(s.polygon).toBe(true);
    expect(s.fill).toBe("#ff0000");
    expect(s.points).toEqual([100, 0, 100, 50]);
    expect([s.w, s.h]).toEqual([0, 50]);
    expect(d.undo()).toBe(true);
    expect(JSON.stringify(d.element(id))).toBe(before);
  });
  it("ellipse convertie : 16 sommets, départ en haut", () => {
    const d = doc();
    const id = add(d, "ellipse", [0, 0, 100, 60]);
    d.apply({ type: "ShapeToPolygon", id });
    const s = shapeOf(d, id);
    expect((s.points?.length ?? 0) / 2 + 2).toBe(16);
    expect(d.element(id)!.transform.slice(4)).toEqual([50, 0]);
  });
  it("ligne fermée : liaisons refusées, moins de 3 sommets refusés, ligne non convertible", () => {
    const d = doc();
    const id = add(d, "rect", [0, 0, 100, 50]);
    const other = add(d, "rect", [300, 0, 400, 50]);
    d.apply({ type: "ShapeToPolygon", id });
    expect(() => d.apply({ type: "SetLinePoints", id, points: [0, 0, 100, 0], start: null, end: null })).toThrow(/BadPoints|points/);
    expect(() => d.apply({ type: "SetLinePoints", id, points: [0, 0, 100, 0, 100, 50], start: { id: other, fx: 0, fy: 0.5 }, end: null })).toThrow(/BadShape|forme/);
    const line = add(d, "line", [0, 0, 50, 50]);
    expect(() => d.apply({ type: "ShapeToPolygon", id: line })).toThrow(/BadShape|forme/);
  });
  it("flèche liée lue libre après ShapeToPolygon, liée après annulation", () => {
    const d = doc();
    const r = add(d, "rect", [0, 0, 100, 50]);
    const a = add(d, "arrow", [-200, 25, -7, 25], { end: { id: r, fx: 0, fy: 0.5 } });
    d.apply({ type: "ShapeToPolygon", id: r });
    expect(shapeOf(d, a).end).toBeUndefined();
    d.undo();
    expect(shapeOf(d, a).end?.id).toBe(r);
  });
  it("ligne fermée touchée dedans ; roundness retiré (H5)", () => {
    const d = doc();
    const id = add(d, "rect", [0, 0, 100, 50]);
    d.apply({ type: "SetStyle", ids: [id], patch: { roundness: "round" } } as never);
    d.apply({ type: "ShapeToPolygon", id });
    expect(d.hitTest(d.pageIds()[0]!, 50, 25, 0)).toBe(id);
    expect(d.element(id)!.look?.roundness).toBeUndefined();
  });
});
```

   Adapter seulement les noms d'aides (`createFakeCore`, `blank`, forme exacte des erreurs) à ceux de
   `fake-lines.test.ts`, sans changer les attentes. Dans `shapes.test.ts`, ajouter :

```ts
it("losange : polygone élargi le long des normales", () => {
  const p = shapePolygon("diamond", 100, 60, 2);
  const l = Math.hypot(100, 60);
  expect(p).toEqual([50, -l / 100, 100 + l / 60, 30, 50, 60 + l / 100, -l / 60, 30].map((v) => expect.closeTo(v, 6)));
});
it("ligne fermée : bornes du rectangle d'origine", () => {
  const p = shapePolygon("line", 0, 50, 2, { inner: [100, 0, 100, 50], curve: false, closed: true });
  const xs = p.filter((_, i) => i % 2 === 0);
  const ys = p.filter((_, i) => i % 2 === 1);
  expect([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([-1, -1, 101, 51]);
});
```

   (adapter la forme de `LineGeom` à celle de `shapes.ts` si ses champs portent d'autres noms). Rouge attendu.

2. `api.ts` : les trois ajouts de l'interface ; commentaire de la ligne 6 : « diamond = losange inscrit dans la boîte ;
   line + polygon = ligne fermée (fermeture implicite) ».

3. `shapes.ts` : miroirs exacts de `diamond_points`, `closed_polygon`, `Outline`, branche losange de `on_outline` et
   d'`anchor`, et de `nearest_outline` si le miroir en a un (mêmes formules que L1, étapes 2, 4, 5, traduites en TS) :

```ts
function diamondPoints(w: number, h: number, off: number): number[] {
  const l = Math.hypot(w, h);
  const ox = (off * l) / h;
  const oy = (off * l) / w;
  return [w / 2, -oy, w + ox, h / 2, w / 2, h + oy, -ox, h / 2];
}
function closedPolygon(raw: readonly (readonly [number, number])[], width: number): number[] {
  const half = Math.max(width / 2, 1);
  const pts: [number, number][] = [];
  for (const p of raw) {
    const q = pts[pts.length - 1];
    if (!q || Math.hypot(q[0] - p[0], q[1] - p[1]) > 1e-9) pts.push([p[0], p[1]]);
  }
  if (pts.length > 1 && Math.hypot(pts[0]![0] - pts[pts.length - 1]![0], pts[0]![1] - pts[pts.length - 1]![1]) <= 1e-9) pts.pop();
  if (pts.length < 3) return bandPolygon(raw, width, false);
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) { const a = pts[i]!; const b = pts[(i + 1) % n]!; area += a[0] * b[1] - b[0] * a[1]; }
  const sgn = area >= 0 ? 1 : -1;
  const normal = (a: readonly [number, number], b: readonly [number, number]): [number, number] => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy);
    return [(sgn * dy) / l, (-sgn * dx) / l];
  };
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    const na = normal(pts[(i + n - 1) % n]!, p);
    const nb = normal(p, pts[(i + 1) % n]!);
    let mx = na[0] + nb[0];
    let my = na[1] + nb[1];
    const ml = Math.hypot(mx, my);
    [mx, my] = ml < 1e-9 ? na : [mx / ml, my / ml];
    const cos = Math.max(mx * na[0] + my * na[1], 0.25);
    out.push(p[0] + (mx * half) / cos, p[1] + (my * half) / cos);
  }
  return out;
}
```

   En tête de `shapePolygon` : `if (isSegment(kind) && line?.closed === true) return closedPolygon(flattenPath(linePath(w,
   h, line.inner), false), width);` ; branche `kind === "diamond"` : rectangle élargi si `w < 1e-9 || h < 1e-9`, sinon
   `diamondPoints(w, h, half)`. Le cœur calcule en f64 puis rend des f32 : comparer au contrat avec la même tolérance que
   les cas existants de `shapes.test.ts`.

4. `fake-core.ts` : `bindBoxOf` donne `outline` (losange, ellipse, boîte) ; la géométrie de collision passe
   `closed: shape.polygon === true` et `curve` faux sur une ligne fermée ; `case "ShapeToPolygon"` (ordre des contrôles du
   cœur : id inconnu, segment ou boîte nulle → `badShape` ; sommets locaux comme L1 étape 6 ; écriture par le même chemin
   que `case "SetLinePoints"` : translation = premier sommet, `points` = intérieurs, `(w, h)` = dernier ; `shape = "line"`,
   `polygon = true`, `look.roundness` retiré ; une étape) ; `case "SetLinePoints"` : garde fermée (liaison → `badShape`,
   moins de 3 sommets → `badPoints`) ; `SetStyle` : `fill` et `fillStyle` admis sur une ligne fermée (lignes 298 et 322),
   `roundness` inapplicable ; `AddLinked` : losange admis (ligne 1142).

5. `ops.ts` : `"ShapeToPolygon"` après `"AddLinked"`.

6. Vert : commande bornée ci-dessus, puis `node ~/.claude/scripts/vm/suite-vm.cjs -- npx vitest run` (dans `apps/web`),
   suite verte. Commit : `feat(web): diamond and closed line in contract and fake core (OG12 lot 2a)`.

<a id="tache-l3"></a>
### Tâche L3 — Rendu et export du losange et de la ligne fermée

**Objectif :** Canvas 2D et roughjs tracent le losange (fond compris) et la ligne fermée (contour fermé, fond si `fill`) ;
l'export `.iwb` / `.ubz` écrit les deux en polyligne fermée.

**Fichiers :** `apps/web/src/engine/render/{canvas2d.ts, canvas2d.test.ts, sketch.ts, sketch.test.ts}`,
`apps/web/src/app/{board-io.ts, board-io.test.ts}`.

**Interfaces :**
- Consomme (L2) : `ShapeKind` avec `"diamond"`, `ShapeView.polygon`, `isClosedShape(v)` de `core/shapes.ts`.
- Réutilise : `apps/web/src/engine/render/canvas2d.ts:271,359` — tracé et fond des formes (étendus).
- Réutilise : `apps/web/src/engine/render/sketch.ts:111,114-118,138,158` — `hasHachure`, `keyOf`, `closed`, générateur roughjs
  (étendus ; la clé de cache ajoute `polygon`).
- Réutilise : `apps/web/src/app/board-io.ts:341` — `pts` de l'export (étendu).
- Produit : rien de neuf pour les autres tâches.

**Test et commande bornée :**
```bash
cd <worktree> && pnpm install --frozen-lockfile >/dev/null && cd apps/web \
 && npx vitest run src/engine/render/canvas2d.test.ts src/engine/render/sketch.test.ts src/app/board-io.test.ts 2>&1 | tail -8
# attendu : « Test Files  3 passed » ; « losange », « ligne fermée remplie », « losange en polyligne fermée » nommés ;
# ARCHITECTE_RECT_MAIN (tracé d'avant) vert
```

**Contraintes (recopiées) :**
- GC1 VM partagée : `nice -n 10` ; suite complète par `suite-vm.cjs` ; aucun `tauri build`.
- GC3 Tests : aucun test désactivé, sauté ou affaibli ; tracés d'avant (rectangle, ellipse, lignes du lot 1) inchangés.
- GC4 Commits : fichiers un par un, auteur `jejeasterix`, message anglais, trailer `Co-Authored-By: Claude Opus 5.5
  <noreply@anthropic.com>`.
- GC10 Worktree neuf : `pnpm install --frozen-lockfile` à la racine.
- GC11 : rouge hors périmètre consigné, jamais corrigé.

**Interdits :** ne touche pas `core/` ni `crates/` ; pas de pointe sur une ligne fermée.

**Terminé :** les trois fichiers verts, suite web verte (`suite-vm.cjs`), un commit.

**Étapes :**

1. Tests rouges (`canvas2d.test.ts`, avec le faux contexte `fake-ctx.ts` comme les cas existants) :

```ts
it("losange : quatre sommets, chemin fermé", () => {
  const ctx = fakeCtx();
  drawShape(ctx, shapeOf({ shape: "diamond", w: 100, h: 60, fill: null }), STYLE);
  expect(ctx.calls.filter((c) => c.op === "moveTo" || c.op === "lineTo").map((c) => c.args)).toEqual([[50, 0], [100, 30], [50, 60], [0, 30]]);
  expect(ctx.calls.some((c) => c.op === "closePath")).toBe(true);
});
it("ligne fermée remplie : fill puis stroke, chemin fermé", () => {
  const ctx = fakeCtx();
  drawShape(ctx, shapeOf({ shape: "line", w: 0, h: 50, fill: "#ff0000", points: [100, 0, 100, 50], polygon: true }), STYLE);
  const ops = ctx.calls.map((c) => c.op);
  expect(ops).toContain("closePath");
  expect(ops.indexOf("fill")).toBeGreaterThan(-1);
  expect(ops.indexOf("fill")).toBeLessThan(ops.lastIndexOf("stroke"));
});
```

   (`fakeCtx`, `drawShape`, `shapeOf`, `STYLE` : les noms des aides déjà présentes dans `canvas2d.test.ts` ; garder leurs
   vrais noms). `sketch.test.ts` : « losange : roughjs polygon à 4 sommets » (le générateur reçoit
   `[[50,0],[100,30],[50,60],[0,30]]`) et « ligne fermée : clé de cache change avec polygon ». `board-io.test.ts` :
   « losange en polyligne fermée » (export d'un losange 100×60 en (0, 0) : 5 points, le dernier égal au premier) et
   « ligne fermée en polyligne fermée ».

2. `canvas2d.ts` : à côté de la branche ellipse (`:271`) :

```ts
  } else if (s.shape === "diamond") {
    ctx.moveTo(s.w / 2, 0);
    ctx.lineTo(s.w, s.h / 2);
    ctx.lineTo(s.w / 2, s.h);
    ctx.lineTo(0, s.h / 2);
    ctx.closePath();
```

   Ligne fermée : le tracé polyligne du lot 1 (points aplatis, `curve` faux) suivi de `ctx.closePath()` quand
   `isClosedShape(s)` ; fond (`:359`) : condition étendue à `s.shape === "diamond" || isClosedShape(s)` ; aucune pointe.

3. `sketch.ts` : `hasHachure` (`:111`) et `closed` (`:138`) étendus aux mêmes cas ; losange par
   `gen.polygon([[s.w / 2, 0], [s.w, s.h / 2], [s.w / 2, s.h], [0, s.h / 2]], opts)` ; ligne fermée par
   `gen.polygon(pointsAplatis, opts)` ; `keyOf` ajoute `polygon`.

4. `board-io.ts` (`:341`) : losange → `[haut, droite, bas, gauche, haut]` mis en monde par `applyMatrix(o.m, …)` ; ligne
   fermée → ses sommets puis le premier ; même flux `stroke` que la polyligne du lot 1, aucun avis neuf.

5. Vert, suite web par `suite-vm.cjs`, commit : `feat(render): draw and export diamond and closed line (OG12 lot 2a)`.

<a id="tache-l4"></a>
### Tâche L4 — Moteur : outil Losange, entrée des formes dans « Modifier les points »

**Objectif :** outil Losange dans la barre (icône Lucide fine), tracé au doigt et à la souris (Maj et doigt tardif =
w = h) ; « Modifier les points » sur un rectangle, un losange ou une ellipse : `ShapeToPolygon` puis l'éditeur du lot 1 sur
le même id, par double toucher (300 ms, 35 px), double-clic, Ctrl+Entrée ou le bouton (n° 21, 34) ; `AddLinked` et poignées
« + » sur le losange.

**Fichiers :** `apps/web/src/engine/input/{gesture.ts, router.ts, router.test.ts}`,
`apps/web/src/engine/tools/{shape.ts, shape.test.ts, select.ts, select.test.ts}`, `apps/web/src/engine/{engine.ts,
engine.test.ts}`, `apps/web/src/{toolbar.ts, toolbar.test.ts, toolbar-profiles.ts, toolbar-profiles.test.ts}`,
`apps/web/src/ui/{icons.ts, icons.test.ts}`.

**Interfaces :**
- Consomme (L2) : `ShapeKind` `"diamond"`, `Command` `ShapeToPolygon`, `isPointsShape(k)`, `isClosedShape(v)`.
- Produit : `DrawTool` avec `"diamond"` (`gesture.ts:29`) ; entrée `TOOL_TABLE.diamond = { label: "Losange", choice:
  "diamond" }` ; icône `"diamond"` ; `engine.editLinePoints()` accepte une forme convertible (contrat inchangé :
  `boolean`) ; état publié : inchangé (`lineEditing`).
- Réutilise : `apps/web/src/engine/engine.ts:627` — `enterLineEdit(id)` (étendue : conversion d'abord).
- Réutilise : `apps/web/src/engine/engine.ts:873` — `shapeTool(kind)` (appelé avec `"diamond"`).
- Réutilise : `apps/web/src/engine/tools/select.ts:270-272` — double toucher `isDoubleTap` → `ctx.editPoints` (étendu aux
  formes) ; `select.ts:74` `isNode` (losange).
- Réutilise : `apps/web/src/engine/input/double-tap.ts` — `isDoubleTap(prev, cur)` (appelé tel quel).
- Réutilise : `apps/web/src/ui/icons.ts` — table Lucide (une entrée de plus).

**Test et commande bornée :**
```bash
cd <worktree> && pnpm install --frozen-lockfile >/dev/null && cd apps/web \
 && npx vitest run src/engine/engine.test.ts src/engine/tools/select.test.ts src/engine/tools/shape.test.ts \
    src/engine/input/router.test.ts src/toolbar.test.ts src/toolbar-profiles.test.ts src/ui/icons.test.ts 2>&1 | tail -10
# attendu : « Test Files  7 passed » ; « Ctrl+Entrée sur un rectangle : ligne fermée », « double toucher sur une forme »,
# « losange » nommés ; cas existants de « Ctrl+Entrée » et du double toucher verts
```

**Contraintes (recopiées) :**
- GC1 VM partagée : `nice -n 10` ; suite complète par `suite-vm.cjs` ; aucun `tauri build`.
- GC3 Tests : aucun test désactivé, sauté ou affaibli ; essais existants (`data-item`) verts sans réécriture de fond. Si un
  test fige la liste exacte des outils du profil par défaut, seule l'addition de `diamond` y entre (consignée au rapport).
- GC4 Commits : fichiers un par un, auteur `jejeasterix`, message anglais, trailer `Co-Authored-By: Claude Opus 5.5
  <noreply@anthropic.com>`.
- GC7 Tactile : cibles ≥ 44 px, double toucher au doigt d'abord, clavier ensuite ; icône Lucide (ISC), trait 1,5,
  `ICON_VIEWBOX`, netteté § 10 de `docs/plans/design-cadrage.md`.
- GC10 Worktree neuf : `pnpm install --frozen-lockfile` à la racine.
- GC11 : rouge hors périmètre consigné, jamais corrigé.

**Interdits :** ne touche ni `line-edit.ts`, ni `line-points.ts`, ni `OptionsPanel.tsx`, ni `tool-options.ts` (L5). Aucune
lettre d'outil neuve (lot 2b : S et G pris par les pipettes). La page ne compose jamais deux commandes pour un geste : la
conversion est une commande, les glissers suivants en sont d'autres.

**Terminé :** sept fichiers verts, suite web verte, un commit.

**Étapes :**

1. Tests rouges.

```ts
// engine.test.ts (aides du fichier : moteur avec faux cœur, `press`, `state`)
it("Ctrl+Entrée sur un rectangle : ligne fermée et « Modifier les points »", () => {
  const { engine, doc } = setup();
  const id = addShape(doc, "rect", [0, 0, 100, 50]);
  engine.selectIds([id]);
  press(engine, { key: "Enter", ctrlKey: true });
  const v = doc.element(id)!;
  expect(v.kind === "shape" && v.shape.shape === "line" && v.shape.polygon === true).toBe(true);
  expect(engine.state().lineEditing).toBe(true);
  expect(doc.undo()).toBe(true);
  expect((doc.element(id) as { shape: { shape: string } }).shape.shape).toBe("rect");
});
it("Ctrl+Entrée sur un rectangle refusé par le cœur : ni éditeur, ni étape", () => { /* boîte nulle forcée par le faux cœur : editLinePoints() renvoie false */ });
// select.test.ts
it("double toucher sur une forme : editPoints appelé", () => {
  const calls: string[] = [];
  const { tool, id } = setupWith("diamond", { editPoints: (x: string) => calls.push(x) });
  tapTwice(tool, 50, 30, "touch");
  expect(calls).toEqual([id]);
});
// shape.test.ts
it("losange : glisser écrit AddShape diamond, fond du style courant", () => { /* comme le cas rect existant, shape: "diamond" */ });
// toolbar.test.ts / icons.test.ts
it("losange : entrée de la barre et icône", () => {
  expect(TOOL_TABLE.diamond).toEqual({ label: "Losange", choice: "diamond" });
  expect(ICONS.diamond).toBeDefined();
});
```

   Écrire chaque cas avec les aides réelles du fichier visé (noms à reprendre des cas voisins : « Ctrl+Entrée » du lot 1
   dans `engine.test.ts`, « double toucher » dans `select.test.ts`, cas `rect` de `shape.test.ts`). Le second cas
   d'`engine.test.ts` : un élément dont `w = 0` (faux cœur) donne `editLinePoints() === false` et aucune étape.

2. `gesture.ts` : `"diamond"` dans `DrawTool`. `router.ts:92` : `"diamond"` dans `SWITCHABLE`. `engine.ts:873` :
   `diamond: shapeTool("diamond")`. `shape.ts:98,113` : `kind === "rect" || kind === "ellipse" || kind === "diamond"`
   (boîte aplatie refusée, fond du style courant).

3. `engine.ts` `enterLineEdit` (`:627`) :

```ts
  /** OG12 (n° 21, 34) : « Modifier les points » ; une forme (rectangle, losange, ellipse) devient d'abord une ligne
   *  fermée par `ShapeToPolygon` (même id, une étape), puis l'éditeur s'ouvre. */
  function enterLineEdit(id: string): boolean {
    let v = doc.element(id);
    if (!doc.elementIds(pageId).includes(id)) return false;
    if (v?.kind === "shape" && isPointsShape(v.shape.shape)) {
      try {
        doc.apply({ type: "ShapeToPolygon", id });
      } catch {
        return false;
      }
      v = doc.element(id);
    }
    if (v?.kind !== "shape" || !isSegment(v.shape.shape) || elbowedOf(v.look)) return false;
    if (tool !== "select") engine.setTool("select");
    lineEditor?.leave?.("tool");
    lineEditor = createLineEditor(ctx, id, exitLineEdit);
    selectTool.setSelection([id]);
    requestScene();
    emit();
    return true;
  }
```

   (si `doc.apply` signale un refus par sa valeur de retour plutôt que par une exception, suivre l'usage d'`addLinked`
   dans le même fichier). `engine.ts:1543` (`addLinked`) : `isPointsShape(v.shape.shape)` à la place du test rect ou
   ellipse.

4. `select.ts:270` : condition du double toucher `isLine(view) && !elbowedOf(view.look)` devient
   `((isLine(view) && !elbowedOf(view.look)) || (view?.kind === "shape" && isPointsShape(view.shape.shape)))` ; `isNode`
   (`:74`) : `isPointsShape`. Le double-clic à la souris passe par le même chemin (vérifier dans le test).

5. `icons.ts` : entrée Lucide `diamond` (ISC, mention déjà en tête de la table) :

```ts
  "diamond": [["path", { d: "M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z" }]],
```

   et `diamond: "diamond"` dans la table des outils (`icons.ts:168`). Vérifier le tracé contre
   `node_modules/lucide-static/icons/diamond.svg` s'il est installé, sinon contre la source Lucide déjà citée dans
   `icons.ts` ; consigner au rapport.

6. `toolbar.ts:106` : `diamond: { label: "Losange", choice: "diamond" }` après l'ellipse ; `toolbar-profiles.ts:153` :
   `tool("diamond", "Losange")` entre Rectangle et Ellipse (ordre d'Excalidraw : rectangle, losange, ellipse).

7. Vert (commande bornée), suite web par `suite-vm.cjs`. Commit : `feat(engine): diamond tool and shape point editing entry
   (OG12 lot 2a)`.

<a id="tache-l5"></a>
### Tâche L5 — Éditeur et panneau des lignes fermées

**Objectif :** l'éditeur du lot 1 gère une ligne fermée : poignée de milieu du segment de fermeture, aucune liaison aux
extrémités, retrait refusé sous 3 sommets ; le panneau montre « Modifier les points » sur un rectangle, un losange ou une
ellipse seul sélectionné, dans une section rangeable dans l'accordéon d'OG23 ; options du losange et de la ligne fermée.

**Fichiers :** `apps/web/src/engine/tools/{line-edit.ts, line-edit.test.ts, line-points.ts, line-points.test.ts}`,
`apps/web/src/ui/{tool-options.ts, tool-options.test.ts, OptionsPanel.tsx, OptionsPanel.test.tsx}`.

**Interfaces :**
- Consomme (L2) : `isClosedShape(v)`, `isPointsShape(k)`, `ShapeView.polygon`.
- Produit : `pickHandle(pts, x, y, zoom, touch, mids, closed = false)` et `pointHandles(pts, selected, zoom, mids, closed =
  false)` (milieu `index = n - 1` = segment de fermeture) ; `dragLine` insère après le dernier sommet pour ce milieu ;
  `tool-options.ts` : `BY_KIND.diamond` (comme `rect`, sans `roundness`) et `BY_KIND.polygon` (`strokeColor`,
  `background`, `fillStyle`, `strokeWidth`, `strokeStyle`, `roughness`, `opacity`) avec `kindOf(v)` qui rend `"polygon"`
  pour une ligne fermée.
- Réutilise : `apps/web/src/engine/tools/line-points.ts:34,54,105` — `pickHandle`, `pointHandles`, `dragLine` (étendus,
  paramètre final facultatif, appels du lot 1 inchangés).
- Réutilise : `apps/web/src/engine/tools/line-points.ts:71` — `bindEnd` (non appelé pour une ligne fermée).
- Réutilise : `apps/web/src/engine/tools/line-edit.ts:36` — `createLineEditor` (étendu).
- Réutilise : `apps/web/src/ui/tool-options.ts:7-28,102` — `OPTION_ORDER`, `BY_TOOL`, `BY_KIND`, `DRAW` (étendus).
- Réutilise : `apps/web/src/ui/OptionsPanel.tsx:130,409` — `lineTarget`, bouton `data-option-value="line-edit"` (étendus).

**Test et commande bornée :**
```bash
cd <worktree> && pnpm install --frozen-lockfile >/dev/null && cd apps/web \
 && npx vitest run src/engine/tools/line-edit.test.ts src/engine/tools/line-points.test.ts src/ui/tool-options.test.ts src/ui/OptionsPanel.test.tsx 2>&1 | tail -8
# attendu : « Test Files  4 passed » ; « segment de fermeture », « trois points au moins », « Modifier les points sur une forme » nommés ;
# « une SetLinePoints au relâché » (lot 1) vert
```

**Contraintes (recopiées) :**
- GC1 VM partagée : `nice -n 10` ; suite complète par `suite-vm.cjs` ; aucun `tauri build`.
- GC3 Tests : aucun test désactivé, sauté ou affaibli ; cas du lot 1 (ligne, flèche) verts sans réécriture.
- GC4 Commits : fichiers un par un, auteur `jejeasterix`, message anglais, trailer `Co-Authored-By: Claude Opus 5.5
  <noreply@anthropic.com>`.
- GC6 Excalidraw : `line-edit.ts` garde sa mention MIT d'en-tête ; comportement fermé adapté de
  `linearElementEditor.ts` (MIT), à citer dans le commentaire d'en-tête.
- GC7 Tactile : poignées de 44 px au doigt (portée `POINT_REACH_TOUCH_PX`), bouton du panneau ≥ 44 px ; clavier : Suppr,
  Échap, Ctrl+Entrée.
- GC10 Worktree neuf : `pnpm install --frozen-lockfile` à la racine.
- GC11 : rouge hors périmètre consigné, jamais corrigé.

**Interdits :** ne touche pas `engine.ts`, `select.ts` (L4) ni `core/` (L2). Pas d'accordéon construit ici (OG23) : la
section porte seulement son attribut.

**Terminé :** quatre fichiers verts, suite web verte, un commit.

**Étapes :**

1. Tests rouges.

```ts
// line-points.test.ts
it("segment de fermeture : milieu entre le dernier et le premier sommet", () => {
  const pts: [number, number][] = [[0, 0], [100, 0], [100, 50], [0, 50]];
  const open = pointHandles(pts, [], 1, true).filter((h) => h.kind === "mid");
  const closed = pointHandles(pts, [], 1, true, true).filter((h) => h.kind === "mid");
  expect(closed.length).toBe(open.length + 1);
  expect(closed[closed.length - 1]).toMatchObject({ index: 3, x: 0, y: 25 });
  expect(pickHandle(pts, 0, 25, 1, false, true, true)).toEqual({ kind: "mid", index: 3 });
});
// line-edit.test.ts (aides du fichier : faux cœur, `pointer`, `applied`)
it("ligne fermée : tirer le milieu du segment de fermeture ajoute un sommet à la fin, une SetLinePoints sans liaison", () => {
  const { editor, doc, id, applied } = setupClosed([[0, 0], [100, 0], [100, 50], [0, 50]]);
  drag(editor, [0, 25], [-40, 25], "touch");
  const cmd = applied().at(-1)!;
  expect(cmd).toMatchObject({ type: "SetLinePoints", id, start: null, end: null });
  expect((cmd as { points: number[] }).points).toEqual([0, 0, 100, 0, 100, 50, 0, 50, -40, 25]);
  void doc;
});
it("ligne fermée : un sommet tiré près d'un rectangle ne se lie pas", () => { /* rectangle voisin, start et end restent null */ });
it("trois points au moins : Suppr sur une ligne fermée à 3 sommets ne retire rien", () => {
  const { editor, applied } = setupClosed([[0, 0], [100, 0], [50, 50]]);
  tap(editor, [100, 0]);
  const n = applied().length;
  expect(editor.removeSelected()).toBe(false);
  expect(applied().length).toBe(n);
});
// OptionsPanel.test.tsx
it("Modifier les points sur une forme : bouton visible pour rectangle, losange, ellipse ; pas pour un texte", () => { /* rendu du panneau avec chaque sélection ; [data-option-value="line-edit"] présent, dans [data-section="points"] */ });
// tool-options.test.ts
it("losange et ligne fermée : options de forme, sans Angles ni pointes", () => {
  expect(optionsFor(kindOfView({ shape: "diamond" }))).not.toContain("roundness");
  expect(optionsFor(kindOfView({ shape: "line", polygon: true }))).toEqual(["strokeColor", "background", "fillStyle", "strokeWidth", "strokeStyle", "roughness", "opacity"]);
});
```

   Reprendre les aides réelles de chaque fichier (`setup…`, `drag`, `tap`, `optionsFor`) depuis les cas du lot 1 ; un
   cas « ligne fermée » s'écrit en posant un élément `shape: "line"`, `polygon: true` par `SetLinePoints` après un
   `ShapeToPolygon` du faux cœur.

2. `line-points.ts` : paramètre `closed = false` dans `pickHandle` et `pointHandles` : milieux pour `i in 0..n-2`, plus
   `i = n - 1` entre `pts[n-1]` et `pts[0]` si `closed` (masqué sous `MID_MIN_PX` comme les autres) ; `dragLine` : un
   milieu d'index `n - 1` insère le point après le dernier sommet (`splice(n, 0, p)`).

3. `line-edit.ts` : `view()` accepte une ligne fermée (déjà `isSegment`) ; `const closed = isClosedShape(v.shape)` passé à
   `pickHandle` et `pointHandles` ; pour une ligne fermée, `dragLine` est appelé sans liaison (`bindEnd` sauté : `start` et
   `end` restent `null`) ; `removeSelected` : `if (closed && pts.length - selected.length < 3) return false;` avant toute
   commande ; la sortie sous deux points du lot 1 reste pour les lignes ouvertes.

4. `tool-options.ts` : `BY_KIND.diamond` = celui de `rect` sans `roundness` ; `BY_KIND.polygon` (liste ci-dessus) ;
   `kindOf(v)` rend `"polygon"` si `isClosedShape(v.shape)` ; `BY_TOOL.diamond` comme `BY_TOOL.rect` sans `roundness` ;
   `"diamond"` dans `DRAW` (`:102`).

5. `OptionsPanel.tsx` : `lineTarget` (`:130`) devient

```ts
  /** OG12 : cible de « Modifier les points » : ligne ou flèche non coudée, ou forme convertible (n° 34). */
  const lineTarget = (): boolean => {
    const t = targets();
    if (t.length !== 1 || t[0]!.kind !== "shape") return false;
    const s = t[0]!.shape;
    return (isSegment(s.shape) && !elbowedOf(t[0]!.look)) || isPointsShape(s.shape);
  };
```

   et le bouton `line-edit` passe dans un bloc `<div class="rb-pick-row" data-section="points">` à part, juste avant la
   rangée Actions (libellé de section « Points », même style que les autres sections) : OG23 le rangera dans son accordéon
   par cet attribut. Le bouton « Retirer le point » suit dans ce bloc.

6. Vert (commande bornée), suite web par `suite-vm.cjs`. Commit : `feat(editor): closed line editing and shape points
   button (OG12 lot 2a)`.

<a id="tache-l6"></a>
### Tâche L6 — Pont, contrat commun, essai CLI, essai navigateur, fiche, captures

**Objectif :** le vrai module Wasm et le faux cœur jouent le même contrat du lot 2a ; la CLI le prouve ; l'essai navigateur
joue S7, S8, S9 au doigt puis à la souris et au clavier ; la fiche passe les lignes du lot 2a de « lot 2 » à « copié » ou
« adapté » ; captures à 2x ; `scripts/verifier.sh --e2e` vert.

**Fichiers :** `apps/web/src/core/{wasm-core.ts, wasm-core.contract.test.ts}`,
`scripts/essais/{cli-essai.mjs, outils-excalidraw-navigateur.mjs}`, `docs/essais/outils-excalidraw.md`,
`docs/design/captures/personnalisation-2-outils/{apres-losange.png, apres-losange-lie.png, apres-forme-points.png,
apres-forme-points-ellipse.png}` (neufs).

**Interfaces :**
- Consomme : L1 (`ShapeToPolygon`, `diamond`, `polygon` dans la vue), L2 (contrat TS), L3, L4, L5 (interface).
- Réutilise : `apps/web/src/core/wasm-core.ts` — lecture des vues (`polygon` passé tel quel) et `apply` (la commande
  traverse le pont en JSON, sans code neuf si le pont sérialise les commandes génériquement).
- Réutilise : `scripts/essais/cli-essai.mjs:549-561` — bloc « OG12 » et `verifie` (étendu d'un bloc « OG12 lot 2a »).
- Réutilise : `scripts/essais/outils-excalidraw-navigateur.mjs` et `scripts/essais/gestes.mjs` — gestes au doigt du lot 1
  (`pointerType: "touch"`), lectures `Lire :`.
- Produit : rien pour d'autres tâches.

**Test et commande bornée :**
```bash
cd <worktree> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH CARGO_TARGET_DIR=<worktree>/target CARGO_BUILD_JOBS=4 \
 && nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release -j 4 \
 && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm \
 && stat -c %s apps/web/src/wasm/roomboard_wasm_bg.wasm      # ≤ 1 572 864
cd apps/web && npx vitest run src/core/wasm-core.contract.test.ts -t "contrat OG12 lot 2a" 2>&1 | tail -6
# attendu : « Tests  N passed », N ≥ 2 (vrai module wasm et faux cœur)
cd <worktree> && pnpm --filter @roomboard/cli build >/dev/null && node scripts/essais/cli-essai.mjs 2>&1 | tail -4      # « CLI : OK »
node scripts/essais/outils-excalidraw-navigateur.mjs 2>&1 | tail -12      # « outils-excalidraw : OK », lignes « Lire : S7… S8… S9… »
node ~/.claude/scripts/vm/suite-vm.cjs -- scripts/verifier.sh --e2e 2>&1 | tail -6      # « verifier.sh : OK »
```

**Preuve visuelle :** l'essai écrit d'abord ses lectures (`Lire : S7.diamond=1`, `Lire : S7.corner=none`,
`Lire : S7.end=<id losange>`, `Lire : S7.gap=7`, `Lire : S8.polygon=1`, `Lire : S8.vertices=4`, `Lire : S8.after=5`,
`Lire : S8.undo=rect`, `Lire : S8.ellipse=16`, `Lire : S9.after=3`, `Lire : S9.refuse=3`, `Lire : S9.linked=diamond`), puis
les captures à 2x (`deviceScaleFactor: 2`) dans `docs/design/captures/personnalisation-2-outils/` : `apres-losange.png`
(losange sélectionné, icône de la barre), `apres-losange-lie.png` (flèche liée, pointe à l'écart), `apres-forme-points.png`
(rectangle converti, poignées de sommets et du segment de fermeture), `apres-forme-points-ellipse.png` (16 poignées). À
décrire au rapport : netteté de l'icône du losange (trait fin, aucun flou à 2x), poignées de 44 px au doigt, section
« Points » du panneau.

**Contraintes (recopiées) :**
- GC1 VM partagée : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; `CARGO_TARGET_DIR=<worktree>/target` ;
  `CARGO_BUILD_JOBS=4` ; `nice -n 10` ; `cargo … -j 4` ; suites complètes par `suite-vm.cjs` ; aucun `tauri build` ;
  `verifier.sh --e2e` en arrière-plan, lu à la notification.
- GC2 Tailles Wasm : principal ≤ 1 572 864 o, formats ≤ 3 145 728 o, intouchables ; la CLI ne grossit pas les modules.
- GC3 Tests : aucun test désactivé, sauté ou affaibli ; scénarios S1 à S6 de l'essai navigateur verts sans réécriture.
- GC4 Commits : fichiers un par un (captures comprises, une par une), auteur `jejeasterix`, message anglais, trailer
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC5 CLI : bloc « OG12 lot 2a » dans `cli-essai.mjs`, sortie `CLI : OK`.
- GC6 Excalidraw : la fiche cite chaque source Excalidraw (`fichier:fonction`) ; `THIRD_PARTY_NOTICES.md` inchangé sauf
  fichier neuf repris.
- GC7 Tactile : doigt d'abord (`pointerType: "touch"`), puis souris et clavier ; cibles ≥ 44 px lues ; netteté § 10.
- GC8 Format : un fichier de `main` rouvert garde ses octets (S2 du lot 1 rejoué tel quel).
- GC9 Rust : `cargo fmt --all --check` et clippy verts (joués par `verifier.sh`).
- GC10 Worktree neuf : `pnpm install --frozen-lockfile` à la racine.
- GC11 : rouge hors périmètre consigné, jamais corrigé.

**Interdits :** aucun code de produit (`crates/`, `apps/web/src/engine`, `apps/web/src/ui`) ; un écart trouvé par l'essai
est rapporté avec la tâche qui possède le code, jamais corrigé ici. Pas de `verifier.sh` modifié.

**Terminé :** contrat lot 2a vert sur les deux fabriques, `CLI : OK`, `outils-excalidraw : OK`, `verifier.sh : OK`, quatre
captures, fiche à jour, un ou deux commits.

**Étapes :**

1. Contrat (rouge sur le vrai module tant que le Wasm n'est pas reconstruit) : dans `wasm-core.contract.test.ts`, à la suite
   des blocs OG12, un `describe("contrat OG12 lot 2a")` joué par les deux fabriques (même boucle que « contrat OG12 ») :

```ts
it("losange, ShapeToPolygon en une étape, garde de la ligne fermée", () => {
  const d = make();
  const page = d.pageIds()[0]!;
  const dm = d.apply({ type: "AddShape", page, shape: "diamond", x0: 0, y0: 0, x1: 100, y1: 60, style: PEN, fill: "#ff0000" }).ids[0]!;
  expect(d.hitTest(page, 50, 30, 0)).toBe(dm);
  expect(d.hitTest(page, 5, 5, 0)).toBeNull();
  d.apply({ type: "ShapeToPolygon", id: dm });
  const v = d.element(dm) as ShapeElement;
  expect([v.shape.shape, v.shape.polygon, v.shape.fill]).toEqual(["line", true, "#ff0000"]);
  expect(Array.from(v.transform.slice(4))).toEqual([50, 0]);
  expect(v.shape.points).toEqual([50, 30, 0, 60]);
  expect([v.shape.w, v.shape.h]).toEqual([-50, 30]);
  expect(() => d.apply({ type: "SetLinePoints", id: dm, points: [0, 0, 1, 1], start: null, end: null })).toThrow();
  expect(d.undo()).toBe(true);
  expect((d.element(dm) as ShapeElement).shape.shape).toBe("diamond");
});
```

   (`make`, `PEN`, forme des erreurs : celles des blocs voisins.) Si `wasm-core.ts` filtre les champs de la vue de forme,
   y laisser passer `polygon`. Reconstruire le Wasm (commande bornée), test vert.

2. `cli-essai.mjs` : bloc « OG12 lot 2a » après le bloc OG12, sur le même patron (`run --new` puis lignes d'état) :
   `AddShape` diamond, `ShapeToPolygon`, `undo`, `ShapeToPolygon` de nouveau, `SetLinePoints` de deux points → code 1 et
   `BadPoints` ; `verifie("OG12 lot 2a : losange converti en ligne fermée", …)`,
   `verifie("OG12 lot 2a : undo en une étape", …)`, `verifie("OG12 lot 2a : SetLinePoints < 3 sommets refusé", …)`.

3. `outils-excalidraw-navigateur.mjs` : scénarios S7, S8, S9 (section « Scénarios du lot 2a » de ce plan) avec les gestes
   au doigt de `gestes.mjs`, puis souris et clavier ; sélecteurs `data-item="diamond"`, `data-option-value="line-edit"`,
   `data-section="points"` ; lectures `Lire :` puis captures (preuve visuelle ci-dessus). Ligne finale inchangée :
   `outils-excalidraw : OK`.

4. Fiche `docs/essais/outils-excalidraw.md` : titre « (OG12, lots 1 et 2a) » ; section « Rectangle, losange, ellipse » :
   « losange » → `copié` (source `element/src/shape.ts` diamond, `Tools.tsx`), essai S7 et
   `tests/formes.rs::diamond_hits_inside_not_box_corners` ; « Modifier les points vers une forme libre » → `adapté` :
   conversion en ligne fermée (`polygon` d'Excalidraw, `actionTogglePolygon`), fermeture implicite (écart, DA-1), ellipse en
   16 sommets droits, essai S8 et `tests/formes.rs::shape_to_polygon_rect_in_one_step_undo_restores` ; ligne « liaison au
   losange » dans Flèche (S7, `arrow_binds_to_diamond_outline_with_gap`) ; section Ligne : « fermeture en polygone » →
   `adapté` (S8, S9) ; objet relié sur losange (S9, `add_linked_accepts_diamond`). Les autres lignes « lot 2 » restent,
   suivies de « (lot 2b) ».

5. `verifier.sh --e2e` par `suite-vm.cjs` en arrière-plan ; lire la sortie à la notification : `verifier.sh : OK`. Commit(s) :
   `test(og12): lot 2a contract, CLI and browser scenarios` puis `docs(og12): lot 2a sheet and captures`.

---

## Lot 2b (hors de ce plan)

Au périmètre du chantier, hors du temps de ce tour (cadrage § 7) :

- Flèches du clavier (1 px, Maj 5 px) ; lettres et chiffres des outils (S et G pris par les pipettes d'OG14, à arbitrer),
  A répété qui fait tourner le type de flèche. Écartés du lot 2a : ils touchent `engine.ts` et `keys.ts`, déjà pris par L4.
- Courbe fermée (ellipse convertie en courbe de Catmull-Rom fermée plutôt qu'en 16 sommets droits).
- Rotation (poignée, Maj 15°) ; îlot « Modificateurs » au doigt (n° 31, H4).
- Texte dans une forme (double toucher, Entrée) : demandera d'arbitrer le double toucher avec « Modifier les points »
  (H3) ; étiquettes sur flèche.
- Multi-points au clic, Alt+clic qui ajoute un point au bout.
- Segments fixes des coudées (n° 25) ; navigation Alt+flèche et grappe centrée du flowchart (n° 27).
- Suivi des autres changements de boîte : `SetTableSizes`, lignes de tableau, `SetImageParams` (H11) — partiellement fait
  au lot 1 pour le tableau, à vérifier dans la fiche.
- Pointes restantes : `diamond`, `diamond_outline`, `cardinality_*` (n° 13).
- Alt-glisser (OG23) ; section « Points » rangée dans l'accordéon d'OG23 à sa fusion.
- Fiche complète des autres outils, avec leurs essais au doigt puis à la souris et au clavier (n° 36).
