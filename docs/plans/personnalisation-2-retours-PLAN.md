# Plan — personnalisation-2-retours (OG23) : retours de Jérôme sur le chapitre 2

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**Spec** : `docs/plans/personnalisation-2-retours-cadrage.md` (commité, `e4c42e05`, base `origin/main` @ `cddbde49`).
**Objectif** : panneau d'options en accordéon, couleurs (4 pastilles + palette, transparent en damier, pipette), Largeur
lisible et Pression, Aligner / Répartir / Transformer par une commande du cœur (`Arrange`) ; au lot B, « Glisser une
copie » et section Image (Rogner, Effacer le fond en baguette depuis le point touché).
**Architecture** : cœur Rust (`arrange.rs`, `Look.variability`, `Look.drag_copy`, `InkStyle.constant`, départ de la
baguette dans `image.rs` et `pixels.rs`) → pont Wasm → API TS et faux cœur (parité jouée par le contrat) → moteur
(`arrange`, `nudge`, `duplicate`, `pickColor`) → modules purs (`tool-options.ts`, `keys.ts`, `shortcuts.ts`) →
composants Solid (`OptionsPanel.tsx`, `ColorPicker.tsx`, `ImagePanel.tsx`).
**Pile** : Rust (yrs, freedraw), wasm-bindgen, TypeScript, Solid, Vitest, Playwright.

**Écarts au cadrage décidés ici** (à relire à l'étage 2) :
- `outline_radius(width, pressure)` et `erase(points, width, path, radius)` gardent leur signature (tests d'OG20
  inchangés) ; les variantes `outline_radius_with(width, pressure, constant)` et `erase_with(points, &InkStyle, path,
  radius)` portent la pression constante. Les littéraux `InkStyle { width }` des tests reçoivent `constant: false` par
  une seule commande mécanique (aucune assertion changée).
- `pixels::Transparent` garde ses champs (tests de `pixels.rs:254-400` inchangés) ; le départ passe par
  `transparent_color_from(px, w, h, t, seed: Option<(u32, u32)>)`, `transparent_color` l'appelle avec `None`.
- `ImageEdit.pick()` garde son type (`Promise<string | null>`) ; `pickPoint(): Promise<{ color, x, y } | null>` est
  ajoutée et `pick` s'appuie dessus.
- Export PDF d'un trait transparent : garde explicite dans `record-ctx.ts` (une peinture d'alpha nul n'enregistre
  aucune opération) ; krilla écrirait sinon un `S` d'opacité 0.
- `Arrange` avec `ids` vide : aucune étape (pas `BadIndex` comme `Restack`) ; `how` inconnu au pont : Error
  « disposition inconnue : <how> » (le faux cœur lève le même message ; la CLI refuse avant, code 2).

## Table des tâches

| id | lot | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | A | Cœur et pont : `Arrange`, pression constante | — | `crates/roomboard-core/src/arrange.rs` (neuf), `src/lib.rs`, `src/commands.rs`, `src/element.rs`, `src/style.rs`, `src/ink/outline.rs`, `src/ink/erase.rs`, `src/ink/builder.rs`, `src/document.rs`, `src/query.rs`, `src/zone.rs`, `tests/arrange.rs` (neuf), `tests/look.rs`, `tests/scenarios.rs`, `tests/compat_socle.rs`, `crates/roomboard-wasm/src/lib.rs`, `THIRD_PARTY_NOTICES.md` | isolé | concepteur-critique | `cargo test -p roomboard-core -j 4` : `test result: ok`, ≥ 12 tests dans `tests/arrange.rs` dont `arrange_extends_partial_group`, `flip_h_text_moves_box_keeps_matrix` ; `test constant_outline_keeps_height ... ok` ; `socle_fixture_resaves_identically ... ok` ; `cargo test -p roomboard-wasm -j 4` ≥ 1 test `arrange_through_the_bridge_one_step` ; module principal ≤ 1 460 761 o | S3, S4 | #tache-t1 |
| T2 | A | Sections de l'accordéon, mémoire, pastilles | — | `apps/web/src/ui/tool-options.ts`, `apps/web/src/ui/tool-options.test.ts`, `apps/web/src/device-settings.ts`, `apps/web/src/device-settings.test.ts` | isolé | implementeur-tdd | `vitest run src/ui/tool-options.test.ts src/device-settings.test.ts` : ≥ 6 tests neufs dont `sectionOpen : défauts puis état gardé`, `4 pastilles`, `0 failed` | S1, S2 | #tache-t2 |
| T3 | A | Raccourcis : `arrangeKey`, `nudgeKey`, table | — | `apps/web/src/core/arrange.ts` (neuf), `apps/web/src/engine/input/keys.ts`, `apps/web/src/engine/input/keys.test.ts`, `apps/web/src/ui/shortcuts.ts`, `apps/web/src/ui/shortcuts.test.ts` | isolé | implementeur-tdd | `vitest run src/engine/input/keys.test.ts src/ui/shortcuts.test.ts` : ≥ 1 test `arrangeKey AZERTY et QWERTY`, `chaque raccourci a son reconnaisseur` vert, `0 failed` | S4 | #tache-t3 |
| T4 | A | Contrat TS, faux cœur, CLI, PDF transparent | T1, T3 | `apps/web/src/core/api.ts`, `apps/web/src/core/look.ts`, `apps/web/src/core/look.test.ts`, `apps/web/src/core/arrange.ts`, `apps/web/src/core/arrange.test.ts` (neuf), `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/fake-core.ts`, `apps/web/src/core/fake-core.test.ts`, `apps/web/src/core/wasm-core.contract.test.ts`, `apps/web/src/engine/render/webgl2.ts`, `apps/web/src/engine/render/webgl2.test.ts`, `apps/web/src/engine/render/record-ctx.ts`, `apps/web/src/engine/render/record-ctx.test.ts`, `apps/cli/src/ops.ts`, `apps/cli/src/ops.test.ts`, `apps/cli/src/session.test.ts`, `apps/cli/src/formats.ts`, `apps/cli/src/pdf.test.ts`, `apps/cli/src/pdf-node.test.ts`, `scripts/essais/cli-essai.mjs` | isolé | concepteur-critique | `ROOMBOARD_WASM_REQUIRED=1 vitest run src/core` : ≥ 1 test `Arrange` joué sur les deux cœurs ; `vitest run src/ops.test.ts src/pdf-node.test.ts` (cli) ≥ 1 test `how inconnu : usage` ; `node scripts/essais/cli-essai.mjs` : `CLI : OK` et ligne `personnalisation-2-retours : Arrange` | S2, S3, S4 | #tache-t4 |
| T5 | A | Panneau : accordéon, couleurs, Largeur, Style de tracé | T2 | `apps/web/src/ui/OptionsPanel.tsx`, `apps/web/src/ui/OptionsPanel.test.tsx`, `apps/web/src/ui/ColorPicker.tsx`, `apps/web/src/ui/ColorPicker.test.tsx`, `apps/web/src/ui/icons.ts`, `apps/web/src/ui/rb.css` | isolé | implementeur-tdd | `vitest run src/ui` : ≥ 1 test `sections repliées par défaut, état relu`, ≥ 1 test `Transparent dans le sélecteur`, `OptionsPanel rectangle : 7 sections` et `rb-css.test.ts` verts, `0 failed` | S1, S2, S3 | #tache-t5 |
| T6 | A | Moteur : `arrange`, `nudge`, raccourcis, pression, trait transparent | T3, T4 | `apps/web/src/engine/engine.ts`, `apps/web/src/engine/engine.test.ts`, `apps/web/src/engine/item-style.ts`, `apps/web/src/engine/item-style.test.ts`, `apps/web/src/engine/tools/pen.ts`, `apps/web/src/engine/tools/pen.test.ts` | isolé | implementeur-tdd | `vitest run src/engine/engine.test.ts src/engine/item-style.test.ts src/engine/tools/pen.test.ts` : ≥ 1 test `flèche : une Transform, une étape`, ≥ 1 test `style courant : transparent jamais gardé`, ≥ 1 test `style ancien sans variability lu`, `0 failed` | S2, S3, S4 | #tache-t6 |
| T7 | A | Panneau : Pression, Aligner, Transformer | T5, T6 | `apps/web/src/ui/OptionsPanel.tsx`, `apps/web/src/ui/OptionsPanel.test.tsx`, `apps/web/src/ui/icons.ts`, `apps/web/src/ui/rb.css` | isolé | implementeur-tdd | `vitest run src/ui` : ≥ 1 test `Aligner : 2 unités, Répartir à 3`, ≥ 1 test `Pression · Variable`, `0 failed` | S3, S4 | #tache-t7 |
| T8 | A | Pipette de scène | T7 | `apps/web/src/ui/shortcuts.ts`, `apps/web/src/ui/shortcuts.test.ts`, `apps/web/src/ui/ColorPicker.tsx`, `apps/web/src/ui/ColorPicker.test.tsx`, `apps/web/src/ui/OptionsPanel.tsx`, `apps/web/src/ui/OptionsPanel.test.tsx`, `apps/web/src/ui/icons.ts`, `apps/web/src/engine/render/canvas2d.ts`, `apps/web/src/engine/render/canvas2d.test.ts`, `apps/web/src/engine/render/renderer.ts`, `apps/web/src/engine/engine.ts`, `apps/web/src/engine/engine.test.ts` | isolé | concepteur-critique | `vitest run src/ui/ColorPicker.test.tsx src/ui/OptionsPanel.test.tsx src/engine/engine.test.ts src/engine/render/canvas2d.test.ts` : ≥ 1 test `pipette : le toucher extérieur ne ferme pas`, ≥ 1 test `pickColor : un toucher, Échap annule`, `0 failed` | S2 | #tache-t8 |
| T9 | A | Essai lot A, amorce, captures lot A | T4, T8 | `scripts/essais/personnalisation-2-retours-navigateur.mjs` (neuf), `scripts/essais/commun.mjs`, `scripts/essais/personnalisation-2-navigateur.mjs` (une ligne), `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `scripts/tests/nettete.test.mjs`, `docs/design/captures/personnalisation-2-retours/*.png` | isolé | implementeur-tdd | `node scripts/essais/personnalisation-2-retours-navigateur.mjs --lot A` : `S1 OK` … `S4 OK`, code 0 ; `node ~/.claude/scripts/vm/suite-vm.cjs -- scripts/verifier.sh --e2e` code 0 | S1, S2, S3, S4, S7 | #tache-t9 |
| T10 | B | Cœur, pont, contrat lot B : `dragCopy`, départ de la baguette | T9 | `crates/roomboard-core/src/element.rs`, `src/style.rs`, `src/image.rs`, `tests/look.rs`, `tests/pot_image.rs`, `tests/compat_c6b.rs`, `crates/roomboard-formats/src/pixels.rs`, `crates/roomboard-formats-wasm/src/lib.rs`, `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/api.ts`, `apps/web/src/core/look.ts`, `apps/web/src/core/look.test.ts`, `apps/web/src/core/image-params.ts`, `apps/web/src/core/image-params.test.ts`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/fake-core.ts`, `apps/web/src/core/fake-core.test.ts`, `apps/web/src/core/wasm-core.contract.test.ts`, `apps/web/src/platform/container.ts`, `apps/web/src/platform/pixel-runner.ts`, `apps/web/src/platform/pixel-runner.test.ts`, `apps/web/src/platform/pixel-worker.ts`, `apps/web/src/engine/render/image-cache.ts`, `apps/cli/src/formats.ts`, `apps/cli/src/ops.test.ts`, `scripts/essais/cli-essai.mjs` | isolé | concepteur-critique | `cargo test --workspace -j 4` : `test result: ok`, ≥ 1 test `seed_clears_only_the_touched_region`, ≥ 1 test `transparent_seed_out_of_image_refused` ; `ROOMBOARD_WASM_REQUIRED=1 vitest run src/core src/platform` ≥ 1 test `dragCopy` sur les deux cœurs ; `CLI : OK` avec la ligne `personnalisation-2-retours : dragCopy` ; formats ≤ 2 798 527 o | S5, S6 | #tache-t10 |
| T11 | B | Moteur : Glisser une copie, poignée Déplacer, badge | T10 | `apps/web/src/engine/engine.ts`, `apps/web/src/engine/engine.test.ts`, `apps/web/src/engine/tools/tool.ts`, `apps/web/src/engine/tools/select.ts`, `apps/web/src/engine/tools/select.test.ts`, `apps/web/src/engine/tools/handles.ts`, `apps/web/src/engine/render/overlay.ts`, `apps/web/src/engine/render/canvas2d.ts`, `apps/web/src/engine/render/canvas2d.test.ts`, `apps/web/src/engine/render/link-badge.ts`, `apps/web/src/engine/render/link-badge.test.ts` | isolé | concepteur-critique | `vitest run src/engine` : ≥ 1 test `dragCopy : l'original reste, une copie`, ≥ 1 test `poignée Déplacer : l'original bouge`, ≥ 1 test `duplicateSelection +10/+10` vert, `0 failed` | S5 | #tache-t11 |
| T12 | B | Séance d'image : baguette depuis le point touché | T10 | `apps/web/src/engine/tools/image-edit.ts`, `apps/web/src/engine/tools/image-edit.test.ts`, `apps/web/src/ui/ImagePanel.tsx`, `apps/web/src/ui/ImagePanel.test.tsx` | isolé | implementeur-tdd | `vitest run src/engine/tools/image-edit.test.ts src/ui/ImagePanel.test.tsx` : ≥ 1 test `mode Depuis le point touché`, ≥ 1 test `start background arme la pipette`, `0 failed` | S6 | #tache-t12 |
| T13 | B | Panneau lot B : section Image, bascule Glisser une copie | T11, T12 | `apps/web/src/ui/tool-options.ts`, `apps/web/src/ui/tool-options.test.ts`, `apps/web/src/ui/OptionsPanel.tsx`, `apps/web/src/ui/OptionsPanel.test.tsx`, `apps/web/src/ui/App.tsx`, `apps/web/src/ui/App.test.tsx`, `apps/web/src/ui/icons.ts`, `apps/web/src/ui/rb.css` | isolé | implementeur-tdd | `vitest run src/ui` : ≥ 1 test `bascule mixte`, ≥ 1 test `Rogner depuis le panneau ouvre la séance en rognage`, `0 failed` | S5, S6 | #tache-t13 |
| T14 | B | Essai final, captures, non-régression | T13 | `scripts/essais/personnalisation-2-retours-navigateur.mjs`, `scripts/essais/fabriques/*` (fixture d'image neuve si besoin), `docs/design/captures/personnalisation-2-retours/*.png` | isolé | implementeur-tdd | `node scripts/essais/personnalisation-2-retours-navigateur.mjs` : `S1 OK` … `S6 OK`, code 0 ; `node ~/.claude/scripts/vm/suite-vm.cjs -- scripts/verifier.sh --e2e` code 0 | S5, S6, S7 | #tache-t14 |

**Vagues** (aucune tâche d'une vague ne recoupe une autre de la même vague) :
- Lot A — V1 : T1, T2, T3 (parallèles, fichiers disjoints) · V2 : T4, T5 (parallèles) · V3 : T6 · V4 : T7 · V5 : T8 · V6 : T9.
- Lot B — V7 : T10 · V8 : T11, T12 (parallèles) · V9 : T13 · V10 : T14.
- Série obligée : T1 → T4 → T6 → T7 → T8 → T9 (chemin critique du lot A, environ 3 h 30 avec relectures).
- Le lot A est fusionnable seul après T9 (suite complète verte, essais anciens verts). **Coupe si le temps manque** : T8
  (pipette) d'abord (T9 retire alors S2.3 et S2.4 « I », et le consigne au rapport) ; le lot B entier ensuite, écrit au
  bloc final comme reste à faire. Repli ferme à 01:05 (état du chantier).

## Global Constraints

- G1. Temps : il reste environ 5 h 30 pour tout exécuter, relire et fusionner. Lot A fusionnable seul et vert ; lot B ensuite. Une tâche qui dépasse son objectif s'arrête et le consigne au rapport.
- G2. TDD : test rouge d'abord, lancé, échec constaté, puis le code.
- G3. VM : toute commande lourde sous `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; `unset CARGO_TARGET_DIR` (cible propre au worktree) ; cargo avec `-j 4` ; une suite complète passe par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; un test isolé s'en passe ; jamais de `tauri build`.
- G4. Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (`git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit …`), message en anglais terminé par la ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (`git add <chemin>`), jamais `git add -A`, `--all` ou `.`, jamais `commit -a`, jamais `--force`.
- G5. Essais existants (`data-item`, `data-option-value`, `data-selection-action`, `data-more-colors`) verts sans réécriture sur le fond ; seule retouche admise : une ligne d'amorce `openOptionSections(page)`. Aucun test désactivé ni sauté (`.skip`, `.only`, `#[ignore]` interdits) ; aucun seuil touché.
- G6. Tailles Wasm : enveloppe du chantier **+20 000 o au plus au module principal** (1 440 761 o avant, donc ≤ 1 460 761 o) et **+4 000 o au plus à `formats`** (2 794 527 o avant, donc ≤ 2 798 527 o) ; plafonds 1 572 864 o et 3 145 728 o jamais relevés. Dépassement : la tâche s'arrête et le consigne.
- G7. CLI suivie (D15) : toute commande, opération, champ de l'état neuf met à jour `COMMAND_TYPES` (`apps/cli/src/ops.ts`), la ligne `.roomboard` de `FORMAT_LOTS` (`apps/cli/src/formats.ts:59`), `ops.test.ts` et `scripts/essais/cli-essai.mjs` (qui affiche `CLI : OK`).
- G8. Fichier repris ou adapté d'Excalidraw (MIT, clone en lecture `~/.cache/tmp/og23-excalidraw`, ne rien y lancer) : mention MIT en tête du fichier et entrée dans `THIRD_PARTY_NOTICES.md` (section « Code adapté d'Excalidraw »). Icônes Lucide (ISC) au commit `7981a0798a`, nom Lucide en commentaire dans `icons.ts`.
- G9. Tactile d'abord : cibles de 44 px au moins (`--rb-btn-size`), Pointer Events (`pointerdown`, `click`), jamais de glisser HTML5 ; clavier ensuite (Tab, Entrée, Espace, Échap, raccourcis de la décision 24) ; infobulle maison (`TipBubble`), jamais `title`.
- G10. Netteté du § 10 de `docs/plans/design-cadrage.md` : traits fins (1,5 sur la grille de 24, `ICON_VIEWBOX`), icônes Lucide, dessinées sur la même grille ; captures à 2x.
- G11. Champs du document : scalaires facultatifs du `Y.Map` de l'élément (jamais `Any::Map`), absent = neutre, neutre jamais écrit ; un fichier ancien réenregistré garde ses octets (`socle_fixture_resaves_identically`).
- G12. Wasm : `apps/web/src/wasm/` et `apps/web/src/wasm-formats/` sont ignorés par git ; l'orchestrateur les pose construits dans chaque worktree de tâche. Une tâche qui change le pont (T1, T10) ou qui lit le vrai module (T4, T9, T10, T14) reconstruit par :
  ```bash
  nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release -j 4 && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && nice -n 10 cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release -j 4 && rm -rf apps/web/src/wasm-formats && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm && pnpm install --frozen-lockfile && pnpm exec wasm-opt -Oz apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm -o apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm
  ```
  Taille : `stat -c %s apps/web/src/wasm/roomboard_wasm_bg.wasm apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm`.
- G13. Commandes : `<wt>` est le worktree de la tâche donné par l'orchestrateur (`~/projets/roomboard-wt/personnalisation-2-retours--T<n>`) ; toute commande commence par `cd <wt> &&`. Fichiers d'essai fabriqués dans un dossier temporaire, jamais un fichier de Jérôme.
- G14. Hors champ : édition des points, connecteurs, Alt+glisser (OG12) ; section `table` (chantier Tableau) ; détourage par modèle ; rotation libre. Place réservée `editPoints` en commentaire dans `OPTION_ORDER`.

## Review Focus

1. Un appel de la CLI `Arrange` qui ne désigne qu'un membre d'un groupe : tout le groupe bouge en bloc, jamais le groupe cassé (déc. 22, S4.6) → T1 `arrange_extends_partial_group`, T4 test du faux cœur `Arrange étend le groupe`.
2. Retourner ou tourner un texte, un tableau, un média avec une forme : le contenu reste droit, seule la place suit (déc. 21, H5, S4.4) → T1 `flip_h_text_moves_box_keeps_matrix`, `rotate_cw_table_center_follows`.
3. Répartir des objets qui se chevauchent (écart négatif) : répartition par les centres, les deux extrêmes restent (algorithme d'Excalidraw) → T1 `distribute_overlapping_uses_centers`.
4. Gomme partielle d'un trait à pression constante : les morceaux gardent `variability`, le trou a la largeur de la gomme (S3.3) → T1 `erase_partial_constant_keeps_variability_and_radius`.
5. Alt+Maj+H sous macOS (Option+H donne « ˙ ») et clavier AZERTY : le raccourci est lu par `e.code` avec Alt, par `e.key` sans Alt (déc. 24, S4.5) → T3 `arrangeKey AZERTY et QWERTY`, `arrangeKey lit code avec Alt`.
6. Trait transparent choisi sur deux rectangles puis outil Stylo : le stylo garde sa couleur, rien de transparent n'est gardé sur l'appareil (déc. 11, S2.1) → T6 `style courant : transparent jamais gardé`.

---

# Lot A

<a id="tache-t1"></a>
### Tâche T1 — Cœur et pont : `Arrange`, pression constante

**Objectif** : `Command::Arrange { ids, how }` aligne, répartit, retourne, tourne en une transaction (une étape), groupes
entiers ; le champ `variability: "constant"` donne un contour à épaisseur constante (rendu, collision, gomme, encre
vive) ; le pont Wasm expose `arrange`, `variability` dans `look_of` et `set_style`, et `StrokeBuilder::new(width, constant)`.

**Fichiers** :
- Créer : `crates/roomboard-core/src/arrange.rs`, `crates/roomboard-core/tests/arrange.rs`.
- Modifier : `src/lib.rs` (`pub mod arrange;`), `src/commands.rs` (variante, `apply` l. 718-760, `erase_stroke` l. 564-590 et son appel l. 1562, `cached_outline` l. 1564), `src/element.rs` (`Look`, `LOOK_KEYS` 10 → 11, `sanitized`, `look_fields`, `read_look`, `constant_ink`), `src/style.rs` (`StylePatch.variability`, `validate`, `writes_for`), `src/ink/outline.rs`, `src/ink/erase.rs`, `src/ink/builder.rs` (tests : littéraux), `src/document.rs` (`CachedOutline`, `cached_outline` l. 584-605, tests l. 987-1022), `src/query.rs` (l. 136-166, test l. 578), `src/zone.rs` (l. 844-846), `tests/look.rs`, `tests/scenarios.rs` (un test `Arrange` une étape), `tests/compat_socle.rs` (aucune assertion changée : à garder vert), `crates/roomboard-wasm/src/lib.rs`, `THIRD_PARTY_NOTICES.md`.

**Interfaces** :
- Consomme : `compose`, `apply_transform`, `IDENTITY`, `Transform` (`element.rs:24-260`) ; `valid_matrix` (`commands.rs:595`) ; `read_group` (`element.rs:308`) ; `Document::snap_box` (`query.rs:338`) ; `find_element`, `page_elements`, `transact_local`, `done`, `unchanged`, `read`.
- Produit :
  - `pub enum ArrangeHow { AlignLeft, AlignCenter, AlignRight, AlignTop, AlignMiddle, AlignBottom, DistributeH, DistributeV, FlipH, FlipV, RotateCw, RotateCcw }` (`Copy, Eq`), `ArrangeHow::parse(&str) -> Option<Self>`, `ArrangeHow::name(self) -> &'static str` ; noms JSON : `align-left`, `align-center`, `align-right`, `align-top`, `align-middle`, `align-bottom`, `distribute-h`, `distribute-v`, `flip-h`, `flip-v`, `rotate-cw`, `rotate-ccw`.
  - `pub(crate) enum Reach { Matrix, Place }`, `pub(crate) struct Member { pub id: String, pub reach: Reach, pub bounds: Bounds }`, `pub(crate) struct Unit { pub members: Vec<Member> }`, `pub(crate) fn plan(units: &[Unit], how: ArrangeHow) -> Vec<(String, Transform)>` (matrice à composer à gauche).
  - `Command::Arrange { ids: Vec<String>, how: ArrangeHow }` ; `Document::cmd_arrange(&mut self, ids: &[String], how: ArrangeHow) -> Result<Change, CommandError>`.
  - `Look.variability: Option<String>` (seul `"constant"` lu) ; `StylePatch.variability: Option<Option<String>>` (`Some(None)` retire, `Some(Some("constant"))` pose, autre valeur `BadStyle`, traits `stroke` seuls) ; `pub(crate) fn constant_ink<T: ReadTxn>(txn: &T, e: &MapRef) -> bool`.
  - `InkStyle { pub width: f32, pub constant: bool }` ; `pub fn outline_radius_with(width: f32, pressure: f32, constant: bool) -> f32` ; `pub fn erase_with(points: &[InkPoint], style: &InkStyle, path: &[f32], radius: f32) -> Option<Vec<Vec<InkPoint>>>` ; `Document::cached_outline(&self, id: &str, style: &StrokeStyle, pts: &[InkPoint], constant: bool) -> Rc<[f32]>`.
  - Pont : `arrange(ids: Vec<String>, how: &str) -> Result<JsValue, JsError>`, `arrange_inner(ids, how: ArrangeHow) -> Result<Change, CommandError>` ; `look_of(…, named: [Option<String>; 6])` (6e = `variability`) ; `commit_stroke`, `add_shape`, `set_text` reçoivent un 11e argument d'aspect `variability: Option<String>` après `link` ; `set_style(…, link_set, link, variability_set: bool, variability: Option<String>)` ; `StrokeBuilder::new(width: f32, constant: bool)`.
- Réutilise : `crates/roomboard-core/src/commands.rs:1043` `cmd_transform` (`valid_matrix`, `compose`, `transform_to_any`) — même composition et même refus `BadMatrix` avant toute écriture (réutiliser).
- Réutilise : `crates/roomboard-core/src/commands.rs:1623` `group_targets` / extension de `cmd_group` (`:1655`) — même règle : groupe extérieur touché en partie = tous ses membres de la page (réutiliser le patron ; un passage sur la page).
- Réutilise : `crates/roomboard-core/src/query.rs:338` `snap_box`, `:323` `bounds` — boîte d'accroche par élément (réutiliser).
- Réutilise : `crates/roomboard-core/src/arrange.rs` — `plan(units, how) -> Vec<(String, Transform)>` (nouveau module : rien n'existe, termes cherchés au cadrage).
- Réutilise : `crates/roomboard-core/src/element.rs:366` `Look`, `look_fields`, `read_look` — `variability: Option<String>` (étendre).
- Réutilise : `crates/roomboard-core/src/style.rs:19` `StylePatch` — patch `variability` (étendre).
- Réutilise : `crates/roomboard-core/src/ink/outline.rs:11,22,38` — `InkStyle { width, constant }`, `outline_radius_with` (étendre ; écart : `outline_radius` garde sa signature).
- Réutilise : `crates/roomboard-core/src/ink/erase.rs:56` — `erase_with(&InkStyle)` (étendre ; `erase` l'appelle avec `constant: false`).
- Réutilise : `crates/roomboard-wasm/src/lib.rs:2429` `StrokeBuilder::new` — `new(width, constant)` (étendre).
- Rapport de tâche : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.

**Patron à ne pas reprendre** : plusieurs `Transform` successives (une par élément) feraient plusieurs étapes dans le
cœur et la CLI ; et appliquer la matrice de miroir à un texte l'inverserait. Référence : `crates/roomboard-core/src/commands.rs:1042-1079` (une transaction, matrices composées contrôlées avant écriture) et `:1650-1680` (extension d'un groupe touché en partie).

**Algorithme de `plan`** (DA-2 ; Répartir adapté de `~/.cache/tmp/og23-excalidraw/packages/element/src/distribute.ts`, MIT) — code à reprendre tel quel :
```rust
//! OG23 (DA-2) : aligner, répartir, retourner, tourner. Répartir adapte `distributeElements` d'Excalidraw
//! (packages/element/src/distribute.ts), Copyright (c) 2020 Excalidraw, licence MIT ; le retournement suit `actionFlip.ts`
//! (le texte n'est pas inversé : seule sa place suit).
use crate::element::Transform;
use crate::query::Bounds;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ArrangeHow { AlignLeft, AlignCenter, AlignRight, AlignTop, AlignMiddle, AlignBottom, DistributeH, DistributeV, FlipH, FlipV, RotateCw, RotateCcw }

const NAMES: [(&str, ArrangeHow); 12] = [
    ("align-left", ArrangeHow::AlignLeft), ("align-center", ArrangeHow::AlignCenter), ("align-right", ArrangeHow::AlignRight),
    ("align-top", ArrangeHow::AlignTop), ("align-middle", ArrangeHow::AlignMiddle), ("align-bottom", ArrangeHow::AlignBottom),
    ("distribute-h", ArrangeHow::DistributeH), ("distribute-v", ArrangeHow::DistributeV),
    ("flip-h", ArrangeHow::FlipH), ("flip-v", ArrangeHow::FlipV), ("rotate-cw", ArrangeHow::RotateCw), ("rotate-ccw", ArrangeHow::RotateCcw),
];

impl ArrangeHow {
    pub fn parse(s: &str) -> Option<Self> { NAMES.iter().find(|(n, _)| *n == s).map(|(_, h)| *h) }
    pub fn name(self) -> &'static str { NAMES.iter().find(|(_, h)| *h == self).map_or("", |(n, _)| n) }
}

/// `Matrix` : trait, forme, image (la matrice entière) ; `Place` : texte, tableau, média, objet 3D (translation seule, H5).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Reach { Matrix, Place }
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct Member { pub id: String, pub reach: Reach, pub bounds: Bounds }
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct Unit { pub members: Vec<Member> }

fn union(a: Option<Bounds>, b: &Bounds) -> Bounds {
    match a { None => b.clone(), Some(a) => Bounds { x0: a.x0.min(b.x0), y0: a.y0.min(b.y0), x1: a.x1.max(b.x1), y1: a.y1.max(b.y1) } }
}
fn box_of(u: &Unit) -> Option<Bounds> { u.members.iter().fold(None, |acc, m| Some(union(acc, &m.bounds))) }
const fn shift(dx: f64, dy: f64) -> Transform { [1.0, 0.0, 0.0, 1.0, dx, dy] }

/// Matrice à composer à gauche de la transformation de chaque élément ; identité omise. Vide : rien ne bouge (D38).
pub(crate) fn plan(units: &[Unit], how: ArrangeHow) -> Vec<(String, Transform)> {
    let boxes: Vec<Bounds> = units.iter().filter_map(box_of).collect();
    if boxes.len() != units.len() || boxes.is_empty() { return Vec::new(); }
    let sel = boxes.iter().skip(1).fold(boxes[0].clone(), |a, b| union(Some(a), b));
    let (cx, cy) = ((sel.x0 + sel.x1) / 2.0, (sel.y0 + sel.y1) / 2.0);
    let mut out: Vec<(String, Transform)> = Vec::new();
    let mut push_unit = |u: &Unit, dx: f64, dy: f64, out: &mut Vec<(String, Transform)>| {
        if dx != 0.0 || dy != 0.0 { for m in &u.members { out.push((m.id.clone(), shift(dx, dy))); } }
    };
    use ArrangeHow::*;
    match how {
        AlignLeft | AlignCenter | AlignRight | AlignTop | AlignMiddle | AlignBottom => {
            if units.len() < 2 { return Vec::new(); }
            for (u, b) in units.iter().zip(&boxes) {
                let (dx, dy) = match how {
                    AlignLeft => (sel.x0 - b.x0, 0.0),
                    AlignCenter => (cx - (b.x0 + b.x1) / 2.0, 0.0),
                    AlignRight => (sel.x1 - b.x1, 0.0),
                    AlignTop => (0.0, sel.y0 - b.y0),
                    AlignMiddle => (0.0, cy - (b.y0 + b.y1) / 2.0),
                    _ => (0.0, sel.y1 - b.y1),
                };
                push_unit(u, dx, dy, &mut out);
            }
        }
        DistributeH | DistributeV => {
            if units.len() < 3 { return Vec::new(); }
            let h = how == DistributeH;
            let start = |b: &Bounds| if h { b.x0 } else { b.y0 };
            let end = |b: &Bounds| if h { b.x1 } else { b.y1 };
            let mid = |b: &Bounds| (start(b) + end(b)) / 2.0;
            let mut order: Vec<usize> = (0..units.len()).collect();
            order.sort_by(|&a, &b| mid(&boxes[a]).total_cmp(&mid(&boxes[b])));
            let span: f64 = boxes.iter().map(|b| end(b) - start(b)).sum();
            let n = units.len() as f64;
            let step = (end(&sel) - start(&sel) - span) / (n - 1.0);
            let mv = |d: f64| if h { (d, 0.0) } else { (0.0, d) };
            if step < 0.0 {
                // Excalidraw : écart négatif, répartition par les centres ; les boîtes des deux extrêmes ne bougent pas.
                let Some(i0) = order.iter().position(|&i| start(&boxes[i]) == start(&sel)) else { return Vec::new() };
                let Some(i1) = order.iter().position(|&i| end(&boxes[i]) == end(&sel)) else { return Vec::new() };
                let s = (mid(&boxes[order[i1]]) - mid(&boxes[order[i0]])) / (n - 1.0);
                let mut pos = mid(&boxes[order[i0]]);
                for (k, &i) in order.iter().enumerate() {
                    if k != i0 && k != i1 {
                        pos += s;
                        let (dx, dy) = mv(pos - mid(&boxes[i]));
                        push_unit(&units[i], dx, dy, &mut out);
                    }
                }
            } else {
                let mut pos = start(&sel);
                for &i in &order {
                    let (dx, dy) = mv(pos - start(&boxes[i]));
                    push_unit(&units[i], dx, dy, &mut out);
                    pos += step + end(&boxes[i]) - start(&boxes[i]);
                }
            }
        }
        FlipH | FlipV | RotateCw | RotateCcw => {
            let full: Transform = match how {
                FlipH => [-1.0, 0.0, 0.0, 1.0, 2.0 * cx, 0.0],
                FlipV => [1.0, 0.0, 0.0, -1.0, 0.0, 2.0 * cy],
                // Écran à y vers le bas : (x, y) → (cx − (y − cy), cy + (x − cx)).
                RotateCw => [0.0, 1.0, -1.0, 0.0, cx + cy, cy - cx],
                _ => [0.0, -1.0, 1.0, 0.0, cx - cy, cy + cx],
            };
            for m in units.iter().flat_map(|u| &u.members) {
                match m.reach {
                    Reach::Matrix => out.push((m.id.clone(), full)),
                    Reach::Place => {
                        let (px, py) = ((m.bounds.x0 + m.bounds.x1) / 2.0, (m.bounds.y0 + m.bounds.y1) / 2.0);
                        let (nx, ny) = (full[0] * px + full[2] * py + full[4], full[1] * px + full[3] * py + full[5]);
                        if nx != px || ny != py { out.push((m.id.clone(), shift(nx - px, ny - py))); }
                    }
                }
            }
        }
    }
    out
}
```
(`Bounds` dérive `Clone` ? Sinon ajouter `#[derive(Debug, Clone, Copy, PartialEq)]` à `query.rs:24` et remplacer `.clone()` par une copie ; `union` de `query.rs` reste privée.)

`cmd_arrange` (dans `arrange.rs`, `impl Document`), dans cet ordre :
1. Lecture (une `self.read()` fermée avant toute écriture) : ids dédoublonnés ; inconnu → `UnknownElement(id)` ; aucun id → `Ok(self.unchanged())` ; pages différentes → `MixedPages`.
2. Groupes extérieurs des ids (`read_group(..).first()`) ; un passage sur `page_elements(&txn, &page)` dans l'ordre de la pile : garde l'élément s'il est demandé ou si son groupe extérieur est touché. Genre (`out_string(e.get(txn, "kind"))`) : `stroke | shape | image` → `Reach::Matrix` ; `text | table | media | model3d` → `Reach::Place` ; tout autre genre (`fill`, inconnu) est écarté (jamais bougé).
3. Boîtes : `self.snap_box(&[id])` par élément (après la fermeture de la lecture) ; un élément sans boîte est écarté. Unités groupées par groupe extérieur (sinon l'id seul), dans l'ordre de première apparition.
4. `plan(&units, how)` ; vide → `Ok(self.unchanged())`. Composer `compose(m, t)` pour chaque élément (`out_transform`), refuser `BadMatrix` si une composée échoue `valid_matrix`, avant toute écriture.
5. Une seule `transact_local`, `transform_to_any` ; `Change { pages: [page], ids: <triés>, .. }` par `self.done`.

**Pression constante** : `options(style, last)` met `thinning: Some(if style.constant { 0.0 } else { THINNING })` ;
`outline_radius_with(width, pressure, constant)` passe `if constant { 0.0 } else { THINNING }` à `get_stroke_radius` ;
`outline_radius(w, p)` = `outline_radius_with(w, p, false)`. `erase_with` reprend le corps de `erase` avec
`outline_radius_with(style.width, p.pressure, style.constant)` ; `erase(points, width, path, radius)` =
`erase_with(points, &InkStyle { width, constant: false }, path, radius)`. `erase_stroke(t, pts, style: &InkStyle, path, radius)`
appelle `erase_with`. `CachedOutline` garde `constant: bool` dans sa clé. Littéraux des tests, une seule commande :
```bash
cd <wt> && perl -pi -e 's/InkStyle \{ width(: [^{}]+?)? \}/"InkStyle { width".($1 \/\/ "").", constant: false }"/ge' crates/roomboard-core/src/ink/builder.rs crates/roomboard-core/src/ink/erase.rs crates/roomboard-core/src/ink/outline.rs crates/roomboard-core/src/document.rs crates/roomboard-core/src/query.rs
```
puis le cache de `document.rs:597` reçoit `InkStyle { width: style.width, constant }` à la main.

**Test et commande bornée** :
```bash
cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && unset CARGO_TARGET_DIR && nice -n 10 cargo test -p roomboard-core -j 4 2>&1 | tail -30
cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && unset CARGO_TARGET_DIR && nice -n 10 cargo test -p roomboard-wasm -j 4 2>&1 | tail -15
```
Preuve : `running N tests` avec N ≥ 12 pour `tests/arrange.rs`, `test arrange_extends_partial_group ... ok`,
`test flip_h_text_moves_box_keeps_matrix ... ok`, `test constant_outline_keeps_height ... ok`,
`test socle_fixture_resaves_identically ... ok`, `test arrange_through_the_bridge_one_step ... ok`, `test result: ok`,
aucun `FAILED`, aucun `error[`. Puis `nice -n 10 cargo clippy --workspace --all-targets -j 4 -- -D warnings 2>&1 | tail -5`
sans avertissement, reconstruction G12 et taille du module principal ≤ 1 460 761 o (lue par `stat`).

**Tests à écrire d'abord** (`tests/arrange.rs`, aides `blank`, `add_rect(x0, y0, x1, y1)`, `add_text(x, y)` copiées de `tests/look.rs:56-120`) :
- `align_left_one_step` : trois rectangles x0 = 0, 100, 250 ; `Arrange AlignLeft` ; les trois `snap_box` ont x0 = 0 ; `undo()` une fois rend les positions ; `version` +1 seulement.
- `align_single_unit_noop` : un rectangle : `Change` sans id, version inchangée.
- `distribute_h_equal_gaps` : trois rectangles de largeurs 50, 30, 80 à x = 0, 70, 400 : écarts égaux à 1e-9 près, les deux extrêmes immobiles.
- `distribute_needs_three_units` : deux rectangles : rien.
- `distribute_overlapping_uses_centers` : trois boîtes qui se chevauchent (somme des largeurs > étendue) : centres équidistants, extrêmes immobiles.
- `flip_h_text_moves_box_keeps_matrix` : un rectangle [0,100]×[0,50] et un texte à x = 300 ; `FlipH` ; la matrice du rectangle a `m[0] == -1.0` ; celle du texte garde `m[0] == 1.0`, sa boîte a x0' = 2·cx − x1.
- `rotate_cw_wide_rect_becomes_tall` : rectangle 200 × 50 : après `RotateCw`, `snap_box` fait 50 × 200 et garde son centre.
- `rotate_ccw_then_cw_restores` : composer les deux rend la transformation d'origine (à 1e-9).
- `rotate_cw_table_center_follows` : un tableau (aide de `tests/tableau.rs`) et un rectangle : la matrice du tableau reste une translation pure.
- `arrange_extends_partial_group` : `Group` de a et b, puis `Arrange { ids: [a, c], AlignLeft }` : a et b bougent du même dx.
- `arrange_mixed_pages_refused` : `MixedPages`, aucune écriture.
- `arrange_unknown_id_refused` : `UnknownElement`.
- `arrange_fill_zone_unchanged` : une zone du pot (aide de `tests/pot.rs`) sélectionnée avec deux rectangles : sa matrice ne change pas.
- `parse_names_roundtrip` : `ArrangeHow::parse(h.name()) == Some(h)` pour les 12 ; `parse("spin") == None`.
- `tests/look.rs` : `constant_outline_keeps_height` (points x = 0..200 pas 10, pression 0,1 → 1,0 ; `variability: Some("constant")` ; demi-hauteur du contour près de x = 50 et x = 150 à moins de 5 % ; sans le champ : plus de 30 %), `set_style_variability_stroke_only` (rectangle ignoré, trait écrit, `Some(None)` retire, `"wavy"` → `BadStyle`), `erase_partial_constant_keeps_variability_and_radius` (morceaux avec `variability`, trou de la largeur de la gomme à 1 px près), `old_stroke_has_no_variability_key`.
- `tests/scenarios.rs` : `arrange_is_one_undo_step` ; pont (`lib.rs`, module de tests) : `arrange_through_the_bridge_one_step`, `arrange_unknown_how_message` (`"disposition inconnue : spin"`).

**Contraintes** (recopiées) : G1 ; G2 ; G3 ; G4 ; G6 (+20 000 o au plus au module principal) ; G8 (mention MIT en tête d'`arrange.rs`, entrée dans `THIRD_PARTY_NOTICES.md` pour `crates/roomboard-core/src/arrange.rs` et, d'avance, `apps/web/src/core/arrange.ts` que T4 écrit) ; G11 ; G12 ; G13.

**Interdits** : aucune commande `Transform` multiple ; pas de nouvelle variante de `CommandError` ; ne pas toucher `apps/` (T3, T4) ; ne pas changer les assertions des tests d'OG20 (`outline.rs:175-214`, `erase.rs:140-226`).

**Terminé** : tests neufs et anciens verts, clippy propre, taille dans l'enveloppe consignée au rapport, commit(s) selon G4.

**Étapes** :
- [ ] 1. Écrire `tests/arrange.rs` et les tests de `tests/look.rs` ci-dessus ; `cargo test -p roomboard-core --test arrange -j 4 2>&1 | tail -15` → `error[E0433]` (module `arrange` absent).
- [ ] 2. Créer `arrange.rs` (code ci-dessus) et `cmd_arrange`, brancher `Command::Arrange` dans `apply` ; relancer `--test arrange` → vert.
- [ ] 3. `InkStyle.constant`, `options`, `outline_radius_with`, `erase_with`, commande perl, `cached_outline(…, constant)` et ses 4 appelants (`constant_ink(&txn, &e)`), `erase_stroke` ; `--test look` → vert.
- [ ] 4. `Look.variability`, `LOOK_KEYS`, `sanitized` (`filter(|s| s == "constant")`), `look_fields` (dans la liste `strings`), `read_look` ; `StylePatch.variability`, `validate`, `writes_for` (`kind == "stroke"`).
- [ ] 5. Pont : `arrange`, `arrange_inner`, `look_of` à 6 noms, 11e argument d'aspect de `commit_stroke`, `add_shape`, `set_text`, paire `variability_set`/`variability` en fin de `set_style`, `StrokeBuilder::new(width, constant)` (test l. 2687 : `new(6.0, false)`) ; tests du pont.
- [ ] 6. Suite `roomboard-core` et `roomboard-wasm`, clippy, reconstruction G12, taille ; `THIRD_PARTY_NOTICES.md` ; commit.

<a id="tache-t2"></a>
### Tâche T2 — Sections de l'accordéon, mémoire, pastilles

**Objectif** : la table des sections sait quelles sections sont ouvertes par défaut et lesquelles sont gardées ouvertes
sur l'appareil ; clés `pressure`, `align`, `transform` ; Aligner selon le nombre d'unités ; 4 pastilles rapides.
Avant tout, garder le build d'avant pour les captures.

**Fichiers** : `apps/web/src/ui/tool-options.ts`, `apps/web/src/ui/tool-options.test.ts`, `apps/web/src/device-settings.ts`, `apps/web/src/device-settings.test.ts`.

**Interfaces** :
- Produit :
  - `OptionKey` += `"pressure" | "align" | "transform"` ; `OPTION_ORDER` = `strokeColor, background, fillStyle, strokeWidth, pressure, strokeStyle, roughness, roundness, font, fontSize, textAlign, arrowheads, /* editPoints (OG12) */ opacity, /* image (lot B) */ layers, align, transform, actions`.
  - `export const OPEN_BY_DEFAULT: ReadonlySet<OptionKey>` = `strokeColor`, `background`, `strokeWidth` (le lot B ajoute `image`).
  - `export function sectionOpen(key: OptionKey, saved: Readonly<Partial<Record<string, boolean>>>): boolean` : `saved[key]` s'il est booléen, sinon `OPEN_BY_DEFAULT.has(key)`.
  - `sectionsFor(tool, targets, editing, background = null, units = 0)` : `pressure` pour `pen` et pour une cible `stroke` ; `transform` dès qu'il y a une cible ; `align` si `units >= 2`.
  - `export const ALIGN_MIN_UNITS = 2`, `export const DISTRIBUTE_MIN_UNITS = 3`.
  - `PICKS = 4` ; `backgroundPicks()` = Transparent, Jaune, Vert, Bleu.
  - `DeviceSettings.optionSections(): Readonly<Partial<Record<string, boolean>>>` ; `setOptionSection(key: string, open: boolean): boolean` ; clé `export const OPTION_SECTIONS_KEY = "roomboard.options-sections"` (JSON objet de booléens ; illisible = `{}` ; seules les clés touchées sont écrites).
- Réutilise : `apps/web/src/ui/tool-options.ts:7-68` — `OptionKey`, `OPEN_BY_DEFAULT`, `sectionOpen`, `sectionsFor(…, units)` (étendre).
- Réutilise : `apps/web/src/device-settings.ts:85-102` — `optionSections()`, `setOptionSection()` sur le patron de `itemStyle`/`setItemStyle` (mémoire de séance puis stockage) (étendre).
- Réutilise : `apps/web/src/ui/tool-options.ts:85-101` `strokePicks`, `backgroundPicks` — `PICKS = 4`, rose retiré (étendre).
- Rapport de tâche : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.

**Test et commande bornée** :
```bash
cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/ui/tool-options.test.ts src/device-settings.test.ts 2>&1 | tail -20
```
Preuve : `Tests  N passed` avec ≥ 6 tests neufs, noms `sectionOpen : défauts puis état gardé`, `4 pastilles`, `0 failed`.

**Tests à écrire d'abord** :
- `sectionOpen : défauts puis état gardé` : `sectionOpen("strokeWidth", {}) === true`, `sectionOpen("strokeStyle", {}) === false`, `sectionOpen("strokeStyle", { strokeStyle: true }) === true`, `sectionOpen("background", { background: false }) === false`, `sectionOpen("strokeStyle", { strokeStyle: "oui" } as never) === false`.
- `pressure : stylo et trait seulement` : `sectionsFor("pen", [], false)` = `["strokeColor", "strokeWidth", "pressure", "opacity"]` ; pas dans `rect`.
- `align à partir de 2 unités, transform pour toute cible` : `sectionsFor("select", [rect(a), rect(b)], false, null, 2)` contient `align` et `transform` après `layers` ; avec `units = 1` : pas `align`.
- `4 pastilles` : `strokePicks({} as never, "pen").map(x => x.label)` = `["Noir", "Rouge", "Bleu", "Vert"]` ; `backgroundPicks()` = transparent, `#fef08a` Jaune, `#bbf7d0` Vert, `#bfdbfe` Bleu.
- Mises à jour d'attentes décidées par le cadrage (déc. 9, 21) : `sectionsFor select + image` → `["opacity", "layers", "transform", "actions"]` ; `strokePicks : 5 couleurs distinctes` devient `4 couleurs distinctes` (mêmes assertions, `toHaveLength(4)`, `size` 4) ; `noms lisibles` → 4 noms ; `backgroundPicks` → 4 entrées. Aucune autre attente changée.
- `device-settings.test.ts` : `optionSections : illisible = {}`, `setOptionSection écrit la seule clé touchée et la relit`, `stockage qui refuse : mémoire seule (rend false)`.

**Contraintes** (recopiées) : G1 ; G2 ; G4 ; G5 ; G13 ; G14 (commentaire `editPoints`).

**Interdits** : ne pas toucher `OptionsPanel.tsx` (T5) ; pas de section `image` ici (T13).

**Terminé** : tests verts, `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -5` sans erreur, commit.

**Étapes** :
- [ ] 1. Garder le build d'avant (captures de T9) : `mkdir -p ~/.cache/tmp && rm -rf ~/.cache/tmp/og23-dist-avant && cp -a /home/adminjd/projets/roomboard-wt/personnalisation-2-retours/apps/web/dist ~/.cache/tmp/og23-dist-avant && ls ~/.cache/tmp/og23-dist-avant/index.html` (build de `cddbde49`, 18:59). Si absent : `pnpm --filter @roomboard/web build` dans `<wt>` avant toute modification, puis la même copie. Consigner au rapport.
- [ ] 2. Écrire les tests ; lancer → rouge (`sectionOpen is not a function`).
- [ ] 3. Implémenter `tool-options.ts` et `device-settings.ts` ; relancer → vert ; tsc ; commit.

<a id="tache-t3"></a>
### Tâche T3 — Raccourcis : `arrangeKey`, `nudgeKey`, table

**Objectif** : reconnaître les raccourcis de la décision 24 (code avec Alt, touche sans Alt), les flèches seules, et les
lister dans `SHORTCUTS` ; poser le type `ArrangeHow` côté TS.

**Fichiers** : `apps/web/src/core/arrange.ts` (neuf), `apps/web/src/engine/input/keys.ts`, `apps/web/src/engine/input/keys.test.ts`, `apps/web/src/ui/shortcuts.ts`, `apps/web/src/ui/shortcuts.test.ts`.

**Interfaces** :
- Produit (`core/arrange.ts`) :
```ts
// OG23 (DA-2) : dispositions de `Command::Arrange`, mêmes noms que `ArrangeHow` du cœur (crates/roomboard-core/src/arrange.rs).
export const ARRANGE_HOWS = [
  "align-left", "align-center", "align-right", "align-top", "align-middle", "align-bottom",
  "distribute-h", "distribute-v", "flip-h", "flip-v", "rotate-cw", "rotate-ccw",
] as const;
export type ArrangeHow = (typeof ARRANGE_HOWS)[number];
export const isArrangeHow = (v: unknown): v is ArrangeHow => typeof v === "string" && (ARRANGE_HOWS as readonly string[]).includes(v);
/** Message du pont et du faux cœur pour une disposition inconnue. */
export const arrangeUnknown = (how: string): string => `disposition inconnue : ${how}`;
```
- Produit (`keys.ts`) : `KeyLike.code?: string` ; `arrangeKey(e: KeyLike): ArrangeHow | null` ; `nudgeKey(e: KeyLike): { dx: number; dy: number } | null` :
```ts
/** OG23 (déc. 24) : avec Alt, la lettre est lue par `code` (Option+H donne « ˙ » sous macOS), sinon par `key` ; H, V, R
 *  sont à la même place en AZERTY, QWERTY et QWERTZ. Jamais avec Ctrl ni Cmd, hors champ, hors composition. */
export function arrangeKey(e: KeyLike): ArrangeHow | null {
  if (e.isComposing || e.ctrlKey || e.metaKey || inEditable(e.target)) return null;
  const letter = e.altKey ? (e.code ?? "").replace(/^Key/, "").toLowerCase() : e.key.toLowerCase();
  if (e.altKey && e.shiftKey) {
    if (e.key === "ArrowLeft") return "align-left";
    if (e.key === "ArrowRight") return "align-right";
    if (e.key === "ArrowUp") return "align-top";
    if (e.key === "ArrowDown") return "align-bottom";
    if (letter === "h") return "align-center";
    if (letter === "v") return "align-middle";
    if (letter === "r") return "rotate-ccw";
    return null;
  }
  if (e.altKey) return letter === "h" ? "distribute-h" : letter === "v" ? "distribute-v" : null;
  if (e.shiftKey) return letter === "h" ? "flip-h" : letter === "v" ? "flip-v" : letter === "r" ? "rotate-cw" : null;
  return null;
}
/** Flèche seule : 1 px ; Maj : 5 px (Excalidraw) ; jamais avec Ctrl, Cmd ou Alt (Ctrl+flèches = Disposition d'OG4). */
export function nudgeKey(e: KeyLike): { dx: number; dy: number } | null {
  if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey || inEditable(e.target)) return null;
  const s = e.shiftKey ? 5 : 1;
  if (e.key === "ArrowLeft") return { dx: -s, dy: 0 };
  if (e.key === "ArrowRight") return { dx: s, dy: 0 };
  if (e.key === "ArrowUp") return { dx: 0, dy: -s };
  if (e.key === "ArrowDown") return { dx: 0, dy: s };
  return null;
}
```
- Produit (`shortcuts.ts`) : lignes neuves, groupes « Transformer » et « Aligner » placés après « Disposition » : `flip-h` « Retourner horizontalement » `Maj+H` ; `flip-v` « Retourner verticalement » `Maj+V` ; `rotate-cw` « Tourner de 90° à droite » `Maj+R` ; `rotate-ccw` « Tourner de 90° à gauche » `Alt+Maj+R` ; `align-left` « Aligner à gauche » `Alt+Maj+←` ; `align-right` `Alt+Maj+→` ; `align-top` `Alt+Maj+↑` ; `align-bottom` `Alt+Maj+↓` ; `align-center` « Centrer horizontalement » `Alt+Maj+H` ; `align-middle` « Centrer verticalement » `Alt+Maj+V` ; `distribute-h` « Répartir horizontalement » `Alt+H` ; `distribute-v` « Répartir verticalement » `Alt+V` ; `nudge` « Déplacer la sélection (Maj : 5 px) » `←` ; table `ARIA` += `"←": "ArrowLeft"`, `"→": "ArrowRight"`. La touche `I` de la pipette est ajoutée par T8.
- Réutilise : `apps/web/src/engine/input/keys.ts:2-55` `KeyLike`, `objectKey` — `KeyLike.code?: string`, `arrangeKey`, `nudgeKey` à côté (étendre).
- Réutilise : `apps/web/src/engine/input/keys.ts` (déplacer au clavier) — `nudgeKey(e)` ; `Engine.nudge` est à T6 (étendre ; si OG12 a livré un déplacement aux flèches sur `origin/main` au départ — `git fetch origin && git log origin/main --oneline -5` — le reprendre et le consigner).
- Réutilise : `apps/web/src/ui/shortcuts.ts:5-35` `SHORTCUTS`, `:45` `ARIA` — lignes de la décision 24 (étendre).
- Rapport de tâche : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.

**Test et commande bornée** :
```bash
cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/engine/input/keys.test.ts src/ui/shortcuts.test.ts 2>&1 | tail -20
```
Preuve : ≥ 5 tests neufs passés, noms `arrangeKey AZERTY et QWERTY`, `arrangeKey lit code avec Alt`, `nudgeKey`, `chaque raccourci a son reconnaisseur` vert, `0 failed`.

**Tests à écrire d'abord** :
- `arrangeKey AZERTY et QWERTY` : pour chaque disposition (`[key, code]` d'AZERTY puis de QWERTY : H `["h"|"H", "KeyH"]`, V, R ; flèches `["ArrowLeft", "ArrowLeft"]`), les 12 raccourcis rendent la même valeur sur les deux claviers.
- `arrangeKey lit code avec Alt` : `{ key: "˙", code: "KeyH", altKey: true }` → `distribute-h` ; `{ key: "Ó", code: "KeyH", altKey: true, shiftKey: true }` → `align-center`.
- `arrangeKey refuse Ctrl, saisie, composition` ; `Ctrl+Maj+↑` reste `orderKey` = `front` et `arrangeKey` = null.
- `nudgeKey` : ← = `{ dx: -1, dy: 0 }`, Maj+↓ = `{ dx: 0, dy: 5 }`, Ctrl+← = null, Alt+← = null.
- `shortcuts.test.ts` : la fonction `press` reçoit `Alt` (`altKey: parts.includes("Alt")`), un `code` (`Key<LETTRE>` pour une lettre, la touche nommée sinon) et `NAMED` les flèches ← → ; `EXPECT` reçoit une ligne par raccourci neuf (`["arrange", "<how>"]`, `nudge: ["nudge", "-1,0"]`), et le reconnaisseur `arrange` (`arrangeKey(e)`) ou `nudge` (`${dx},${dy}`) ; `ariaShortcut("align-left", false)` = `"Alt+Shift+ArrowLeft"`.

**Contraintes** (recopiées) : G1 ; G2 ; G4 ; G9 (raccourcis clavier) ; G13.

**Interdits** : ne pas toucher `engine.ts` (T6) ni `api.ts` (T4) ; aucune lettre autre que H, V, R (A, Q, Z, W, M, Y écartées).

**Terminé** : tests verts, tsc sans erreur, commit.

**Étapes** :
- [ ] 1. Tests (rouge : `arrangeKey is not a function`).
- [ ] 2. `core/arrange.ts`, `keys.ts`, `shortcuts.ts` ; vert ; tsc ; commit.

<a id="tache-t4"></a>
### Tâche T4 — Contrat TS, faux cœur, CLI, PDF transparent

**Objectif** : `Arrange` et `variability` traversent l'API TS, le pont et le faux cœur avec le même résultat (contrat
joué sur les deux cœurs) ; la CLI les pilote et refuse un `how` inconnu (code 2) ; `transparent` est lu `[0, 0, 0, 0]`
et un trait transparent n'est pas tracé au PDF.

**Fichiers** : voir la table (ligne T4).

**Interfaces** :
- Consomme : pont de T1 (`arrange(ids, how)`, 11e argument d'aspect, `set_style(…, variability_set, variability)`, `StrokeBuilder(width, constant)`) ; `ArrangeHow`, `ARRANGE_HOWS`, `isArrangeHow`, `arrangeUnknown` (`core/arrange.ts`, T3).
- Produit :
  - `Command` += `{ readonly type: "Arrange"; readonly ids: readonly string[]; readonly how: ArrangeHow }` ; `export type { ArrangeHow } from "./arrange"` dans `api.ts`.
  - `Look.variability?: "constant"` ; `LookPatch.variability?: "constant" | null` ; `variabilityOf(l): "variable" | "constant"` ; `toLook` lit `variability` ; `lookFrom` accepte `variability?: "variable" | "constant"` (écrit `"constant"` seulement).
  - `CoreDocument.newStrokeBuilder(style: StrokeStyle, constant?: boolean): StrokeBuilderApi`.
  - `core/arrange.ts` += `export type Reach = "matrix" | "place"`, `export interface ArrangeMember { readonly id: string; readonly reach: Reach; readonly bounds: Bounds }`, `export interface ArrangeUnit { readonly members: readonly ArrangeMember[] }`, `export function planArrange(units: readonly ArrangeUnit[], how: ArrangeHow): Array<readonly [string, Matrix]>` — portage ligne à ligne de `plan` (T1), mention MIT en tête.
  - `tryParseColor("transparent")` → `[0, 0, 0, 0]` (casse ignorée, blancs ignorés).
  - `RecordingContext.fill`/`stroke` : une peinture d'alpha 0 n'enregistre rien.
  - CLI : `COMMAND_TYPES` += `"Arrange"` ; `parseOp` : `type === "Arrange"` et `!isArrangeHow(cmd["how"])` → `CliError("usage", "how : une de " + ARRANGE_HOWS.join(", "))`.
- Réutilise : `apps/web/src/engine/render/webgl2.ts:24` `tryParseColor` — `transparent` → `[0, 0, 0, 0]` ; `ColorPicker.tsx:25` `parseHex` inchangée (étendre).
- Réutilise : `apps/cli/src/ops.ts:79-82` (patron du contrôle de `to`) — `how` dans `ARRANGE_HOWS`, sinon `CliError("usage")` (étendre).
- Réutilise : `apps/cli/src/ops.ts:11` `COMMAND_TYPES` — `"Arrange"` (étendre).
- Réutilise : `apps/web/src/core/fake-core.ts:1939` `snapBox`, `:1050` cas `Transform` (`validMatrix`, `composeMatrix`) — le cas `Arrange` du faux cœur les appelle (réutiliser).
- Rapport de tâche : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.

**Patron à ne pas reprendre** : le cas `Transform` du faux cœur ignore les ids inconnus (`fake-core.ts:1050-1072`) ;
`Arrange` les refuse (`élément inconnu : <id>`), comme `Restack` (`fake-core.ts:921-948` : ids dédoublonnés, premier
inconnu, pages mêlées « objets de pages différentes »). Le faux cœur porte le même `planArrange` que le cœur : genres
`matrix` = trait (`local`), forme (`shape`), image ; `place` = texte, tableau, média, objet 3D ; `fill`, `unknown`,
`malformed` écartés ; groupe extérieur (`group[0]`) touché = tous ses membres de la page.

**Test et commande bornée** (reconstruction G12 d'abord) :
```bash
cd <wt>/apps/web && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm exec vitest run src/core src/engine/render/webgl2.test.ts src/engine/render/record-ctx.test.ts 2>&1 | tail -20
cd <wt> && nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -3 && cd apps/cli && nice -n 10 pnpm exec vitest run src/ops.test.ts src/session.test.ts src/pdf-node.test.ts src/pdf.test.ts 2>&1 | tail -20
cd <wt> && node scripts/essais/cli-essai.mjs 2>&1 | tail -8
```
Preuve : tests du contrat `Arrange align-left : même boîtes sur les deux cœurs`, `Arrange étend le groupe`,
`variability constante relue`, `tryParseColor transparent`, `peinture transparente : aucune opération`,
`how inconnu : usage`, `PDF : rectangle à trait transparent sans tracé` passés ; `0 failed` ; dernière ligne de
l'essai `CLI : OK`, ligne `personnalisation-2-retours : Arrange` présente.

**Tests à écrire d'abord** :
- `core/arrange.test.ts` : mêmes cas que `tests/arrange.rs` sur `planArrange` (gauche, répartir, chevauchement, miroir d'un `place`, quart de tour).
- `wasm-core.contract.test.ts` (les deux cœurs) : `Arrange align-left` (trois rectangles, même `bounds` à 1e-6 près, une étape, `undo`) ; `Arrange flip-h texte + rectangle` (matrice du texte `[1, 0, 0, 1, …]`) ; `Arrange étend le groupe` ; `Arrange how inconnu` (message `disposition inconnue : spin` sur les deux) ; `SetStyle variability constant puis null` (relu puis absent, une étape chacun, rectangle ignoré).
- `webgl2.test.ts` : `tryParseColor transparent` (`"transparent"`, `" TRANSPARENT "` → `[0, 0, 0, 0]`) ; le test existant « rouge → null » reste.
- `record-ctx.test.ts` : `peinture transparente : aucune opération` (`strokeStyle = "rgba(0, 0, 0, 0)"`, `stroke()` : aucun `OP.stroke` dans `encode().ops`).
- `ops.test.ts` : `how inconnu : usage` (`parseOp('{"type":"Arrange","ids":[],"how":"spin"}', ctx)` lève `CliError` de type `usage`) ; `how absent : usage` ; `Arrange admis`.
- `pdf-node.test.ts` : `fillStyle transparent : rgba(0, 0, 0, 0)` ; `pdf.test.ts` : `PDF : rectangle à trait transparent sans tracé` (document `new`, `AddShape` rectangle `color: "transparent"`, `fill: "#fef08a"`, `export` en `.pdf`, relu par pdf.js : `page.getOperatorList()` contient `OPS.fill` ou `OPS.eoFill` et aucun `OPS.stroke`/`OPS.closeStroke`).
- `cli-essai.mjs`, bloc `personnalisation-2-retours` après le bloc Restack (l. 477) : `Arrange align-left` puis `undo` (une étape chacun, x0 égaux puis rendus) ; `flip-h` sur un texte et un rectangle (`state` : matrice du texte avec `transform[0] === 1`) ; `how: "spin"` → code 2 ; `SetStyle { variability: "constant" }` sur un trait lu par `state` (`look.variability === "constant"`) ; `export` PDF d'un rectangle `color: "transparent"` à fond jaune : code 0, puis les flux du fichier (`stream … endstream`, chacun passé à `zlib.inflateSync` dans un `try`, sinon brut) contiennent un opérateur `f` et aucun ` S\n` ni ` s\n` ; ligne `console.log("personnalisation-2-retours : Arrange")`.
- `formats.ts:59` : note `.roomboard` complétée par `variability` ; et `Arrange` dans le texte des commandes si la ligne les cite.

**Contraintes** (recopiées) : G1 ; G2 ; G3 ; G4 ; G5 ; G7 ; G8 (en-tête MIT de `core/arrange.ts`) ; G12 ; G13.

**Interdits** : aucune couleur nommée autre que `transparent` rendue lisible par `tryParseColor` (H25 de la CLI) ; ne
pas toucher l'interface (T5, T7) ni le moteur (T6).

**Terminé** : contrat vert sur les deux cœurs, CLI verte, `CLI : OK`, tsc des deux paquets propre, commit.

**Étapes** :
- [ ] 1. Reconstruction G12 ; tests rouges (contrat, CLI, PDF).
- [ ] 2. `api.ts`, `look.ts`, `core/arrange.ts` (`planArrange`), `wasm-core.ts` (`case "Arrange"`, `lookArgs` à 11, `set_style` à 2 arguments de plus, `newStrokeBuilder(style, constant = false)` → `new StrokeBuilder(style.width, constant)`), `fake-core.ts` (`case "Arrange"`, `restyled` : `variability` sur `stroke` seul, `validStyle` : `variability` hors `"constant"`/null → « style invalide », `creationLook` lit `variability`).
- [ ] 3. `webgl2.ts`, `record-ctx.ts`, CLI, `cli-essai.mjs` ; tous les tests ; commit.

<a id="tache-t5"></a>
### Tâche T5 — Panneau : accordéon, couleurs, Largeur, Style de tracé

**Objectif** : chaque section a un en-tête bouton qui l'ouvre ou la replie (état gardé sur l'appareil), avec un résumé
gris de sa valeur ; la rangée de couleurs tient sur une ligne (4 pastilles + « Autres couleurs ») ; le transparent est
un damier, proposé au trait pour une sélection de rectangles et d'ellipses, et dans le sélecteur ; Largeur montre une
icône d'épaisseur et un mot ; Style de tracé devient Net · À main levée · Très à main levée.

**Fichiers** : `apps/web/src/ui/OptionsPanel.tsx`, `OptionsPanel.test.tsx`, `ColorPicker.tsx`, `ColorPicker.test.tsx`, `icons.ts`, `rb.css`.

**Interfaces** :
- Consomme : `OPTION_ORDER`, `sectionOpen`, `OPEN_BY_DEFAULT`, `sectionsFor(…, units)`, `strokePicks`, `backgroundPicks` (T2) ; `settings.optionSections()`, `settings.setOptionSection(key, open)` (T2) ; `state().selectionUnits` (existant).
- Produit :
  - Section : `<section class="rb-options-sec" data-option={k} data-open={open ? "" : undefined}>` ; en-tête `<button type="button" class="rb-opt-head" data-option-head={k} aria-expanded={open} aria-controls={`opt-body-${k}`}>` contenant `<span class="rb-opt-title">{LABEL[k]}</span>`, le résumé `<span class="rb-opt-sum">· {résumé}</span>` (sections à segments seulement : `strokeWidth`, `strokeStyle`, `roughness`, `roundness`, `fillStyle`, `textAlign`, plus `pressure` à T7 ; « Mixte » pour une valeur mixte) et le chevron `<Icon name="chevron-down" />` (tourné de 180° ouvert, CSS) ; corps `<div id="opt-body-${k}" class="rb-opt-body" hidden={!open}>` toujours monté.
  - Signal local `openSections` initialisé par `settings.optionSections()` ; `toggleSection(k)` écrit `setOptionSection(k, next)`.
  - S et G (`onObjectKey`, l. 248-254) : si la section visée est repliée, l'ouvrir d'abord (`toggleSection`) puis `queueMicrotask(() => openPicker(key))`.
  - Rangée : `colors()` rend 4 pastilles puis `moreColors(k)` avec l'icône `palette` (sélecteur `[data-more-colors]` gardé).
  - Transparent au trait : quand toutes les cibles sont des formes `rect` ou `ellipse` (`targets().length > 0 && every(...)`), la rangée Trait commence par la pastille Transparent (`{ color: null, label: "Transparent" }`) qui écrit `{ color: "transparent" }` ; ailleurs, jamais.
  - Damier : `.rb-pick[data-transparent] .rb-pick-dot { background: repeating-conic-gradient(var(--rf-gray-200) 0 25%, #ffffff 0 50%) 0 0 / 8px 8px; }` (remplace la diagonale) ; `data-transparent` et `data-option-value="transparent"` gardés.
  - `ColorPickerProps.transparent?: boolean` ; `choose(c: string | null)` ; case `<button type="button" class="rb-color-cell" data-transparent data-color-transparent aria-label="Transparent">` au-dessus de la grille quand `transparent` ; `OptionsPanel` passe `transparent={p.key === "background" || strokeTransparentAllowed()}` et `chooseFull(c: string | null)` écrit `{ background: c }` ou `{ color: c ?? "transparent" }`.
  - `WIDTH_OPTIONS` avec `icon` `width-thin` / `width-medium` / `width-thick` et libellés Fin · Moyen · Épais (texte de 12 px sous l'icône : `.rb-options .rb-radios[data-edit="strokeWidth"] .rb-radio { flex-direction: column; font-size: 12px; }`).
  - `ROUGH` : libellés « Net », « À main levée », « Très à main levée », icônes `sloppiness-0..2` redessinées (coin net ; coin doublé d'un trait décalé ; coin triplé) ; valeurs `0`, `1`, `2` inchangées.
  - Icônes (`icons.ts`, Lucide @7981a0798a, ISC) : `"palette": [["path", { d: "M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" }], ["circle", { cx: "13.5", cy: "6.5", r: ".5" }], ["circle", { cx: "17.5", cy: "10.5", r: ".5" }], ["circle", { cx: "6.5", cy: "12.5", r: ".5" }], ["circle", { cx: "8.5", cy: "7.5", r: ".5" }]]` (les ronds `fill="currentColor"` si `Icon` le permet, sinon rayon gardé) ; dessinées (grille 24, trait 1,5) : `"width-thin": [["path", { d: "M4 12h16", "stroke-width": "1.5" }]]`, `"width-medium": [["path", { d: "M4 12h16", "stroke-width": "3" }]]`, `"width-thick": [["path", { d: "M4 12h16", "stroke-width": "5" }]]` ; `"sloppiness-0": [["path", { d: "M5 19V7a2 2 0 0 1 2-2h12" }]]`, `"sloppiness-1": [["path", { d: "M5 19V7a2 2 0 0 1 2-2h12" }], ["path", { d: "M7.5 18.5V9a1.5 1.5 0 0 1 1.5-1.5h10" }]]`, `"sloppiness-2"` : les deux précédents et `["path", { d: "M10 18V11.5a1 1 0 0 1 1-1h8" }]`.
- Réutilise : `apps/web/src/ui/ColorPicker.tsx:11-17` — `transparent?: boolean`, `choose(c: string | null)` (étendre ; `pick?` est à T8).
- Réutilise : `apps/web/src/ui/RadioChoices.tsx:39`, `IconButton.tsx` — segments à icône et texte, `TipBubble` (réutiliser, inchangés).
- Rapport de tâche : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.

**Test et commande bornée** :
```bash
cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/ui 2>&1 | tail -25
```
Preuve : ≥ 6 tests neufs passés (`sections repliées par défaut, état relu`, `en-tête : Entrée et Espace basculent`, `S ouvre Trait replié puis le sélecteur`, `4 pastilles et palette sur une ligne`, `trait transparent : rectangles seulement`, `Transparent dans le sélecteur`) ; `OptionsPanel rectangle : 7 sections`, `OptionsPanel.link.test.tsx`, `rb-css.test.ts`, `ColorPicker.test.tsx` anciens verts ; `0 failed`.

**Tests à écrire d'abord** (`OptionsPanel.test.tsx`, aide `mount` existante, l. 20-50) :
- `sections repliées par défaut, état relu` : outil `rect` : `[data-option-head="strokeWidth"]` `aria-expanded="true"`, `[data-option-head="strokeStyle"]` `"false"` et son corps `hidden` ; clic sur l'en-tête → `"true"` et `settings.optionSections().strokeStyle === true` ; remonter avec les mêmes réglages : ouvert.
- `résumé de valeur` : en-tête `roughness` contient `Style de tracé` et `· Net` ; deux cibles de tracés différents : `· Mixte`.
- `S ouvre Trait replié puis le sélecteur` : `settings.setOptionSection("strokeColor", false)`, `keydown` `s` sur `window` → `[data-option-head="strokeColor"]` ouvert et `[data-color-picker]` présent après `await Promise.resolve()`.
- `4 pastilles et palette` : `[data-option="strokeColor"] .rb-pick` = 4, `[data-more-colors="strokeColor"] [data-icon="palette"]` présent (attribut d'`Icon` à vérifier dans `IconButton.tsx`).
- `trait transparent : rectangles seulement` : deux rectangles → `[data-option="strokeColor"] [data-transparent]` présent, clic → `calls` contient `{ color: "transparent" }` ; un trait de stylo → absent ; outil `pen` sans cible → absent.
- `ColorPicker.test.tsx` : `Transparent dans le sélecteur` (`transparent` vrai : `[data-color-transparent]` présent, clic → `choose(null)`) ; faux : absent.

**Contraintes** (recopiées) : G1 ; G2 ; G4 ; G5 (corps montés avec `hidden` : les tests qui lisent `[data-option-value]` restent verts sans retouche) ; G8 (icônes Lucide) ; G9 (en-têtes ≥ 44 px : `.rb-opt-head { min-block-size: var(--rb-btn-size); }`, Tab, Entrée, Espace) ; G10 ; G13.

**Interdits** : ne pas toucher `island-place.ts` (largeur inchangée) ni le moteur ; pas de sections Pression, Aligner, Transformer ici (T7) ; ne pas modifier les règles CSS lues par `rb-css.test.ts:326-340`.

**Terminé** : tests verts, tsc propre, commit.

**Étapes** :
- [ ] 1. Tests rouges. 2. En-têtes, corps `hidden`, mémoire, résumé, S/G. 3. Pastilles, damier, transparent au trait, `ColorPicker.transparent`. 4. Largeur, Style de tracé, icônes, CSS (la règle `.rb-options-sec:first-of-type h3` devient `.rb-options-sec:first-of-type .rb-opt-head`). 5. Vert, tsc, commit.

<a id="tache-t6"></a>
### Tâche T6 — Moteur : `arrange`, `nudge`, raccourcis, pression, trait transparent

**Objectif** : le moteur aligne, répartit, retourne, tourne la sélection (groupes entiers, une étape), déplace la
sélection aux flèches, écoute les raccourcis de T3, porte `variability` au style courant et au stylo, et n'écrit jamais
`transparent` au style courant.

**Fichiers** : `apps/web/src/engine/engine.ts`, `engine.test.ts`, `item-style.ts`, `item-style.test.ts`, `tools/pen.ts`, `tools/pen.test.ts`.

**Interfaces** :
- Consomme : `Command` `Arrange`, `LookPatch.variability`, `newStrokeBuilder(style, constant)` (T4) ; `arrangeKey`, `nudgeKey` (T3) ; `wholeUnits` (`app/layer-list.ts:141`).
- Produit :
  - `Engine.arrange(how: ArrangeHow): boolean` : `ids = selectedBlock()` (l. 444) ; vide → false ; `run({ type: "Arrange", ids, how })`, vrai si la version a changé.
  - `Engine.nudge(dx: number, dy: number): boolean` : sélection vide → false ; `run({ type: "Transform", ids: selectedBlock(), matrix: [1, 0, 0, 1, dx / camera.zoom, dy / camera.zoom] })` (px d'écran).
  - `key(e)` : après `orderKey`, `arrangeKey(e)` (pris seulement avec une sélection, sinon la touche passe), puis `nudgeKey(e)` (idem) ; jamais pendant `imageEdit` en mode `crop`/`pick` ni pendant une saisie de texte (`textTool.editing()`).
  - `ItemStyle.variability: "variable" | "constant"` (défaut `"variable"`, `ok.variability`), `patchOf` : `variability` → `{ variability: v === "constant" ? "constant" : null }`.
  - `setItem(p, writeSelection)` : si `p.color === "transparent"`, la couleur n'entre pas dans `mergeItemStyle` mais part dans le `SetStyle` de la sélection (déc. 11).
  - `pen.ts` : `look` = `lookFrom({ strokeStyle: "solid", roughness: 0, roundness: "sharp", opacity: cur.opacity ?? 100, variability: cur.variability }, null)` ; `ctx.doc.newStrokeBuilder(st, cur.variability === "constant")` ; `style` reçoit `Partial<Pick<ItemStyle, "opacity" | "variability">>`.
- Réutilise : `apps/web/src/engine/engine.ts:1250` `setItemStyle` — `setItemStyle({ variability })` (étendre).
- Réutilise : `apps/web/src/engine/engine.ts:996-999` `bringToFront`, `sendToBack`, `reorder`, `:444` `selectedBlock` — appelé par `arrange` et `nudge` (réutiliser).
- Réutilise : `apps/web/src/engine/engine.ts` (déplacer au clavier) — `Engine.nudge(dx, dy)` : une `Transform` de `wholeUnits` (étendre).
- Rapport de tâche : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.

**Test et commande bornée** :
```bash
cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/engine/engine.test.ts src/engine/item-style.test.ts src/engine/tools/pen.test.ts 2>&1 | tail -20
```
Preuve : ≥ 7 tests neufs passés dont `arrange align-left : une étape`, `arrange : groupe en bloc`, `flèche : une Transform, une étape`, `flèche sans sélection : la touche passe`, `Maj+H retourne`, `style courant : transparent jamais gardé`, `style ancien sans variability lu` ; `duplicateSelection +10/+10` et `item-style.test.ts:19` verts ; `0 failed`.

**Tests à écrire d'abord** (aide `styleSetup`, `engine.test.ts:1956`) :
- `arrange align-left : une étape` : trois rectangles, sélection, `engine.arrange("align-left")` vrai, `bounds` x0 égaux, `undo()` une fois rend tout.
- `arrange : groupe en bloc` : grouper a et b, sélectionner a seul par `sel().setSelection([a])` et c ; a et b ont le même déplacement.
- `flèche : une Transform, une étape` : `engine.key(key("ArrowRight"))` vrai, dx = 1 ; `key("ArrowDown", { shiftKey: true })` : dy = 5 ; deux `undo` rendent l'origine.
- `flèche sans sélection : la touche passe` (`false`).
- `Maj+H retourne` : `key("H", { shiftKey: true, code: "KeyH" })` sur un rectangle et une flèche : matrice de la flèche `m[0] === -1`.
- `style courant : transparent jamais gardé` : deux rectangles sélectionnés, `setItemStyle({ color: "transparent" })` → les deux ont `style.color === "transparent"`, `engine.itemStyle().color` inchangé, `deps.itemStyle` (rappel de garde) n'a jamais reçu `transparent`.
- `item-style.test.ts` : `style ancien sans variability lu` (`parseItemStyle(JSON sans le champ).variability === "variable"`), `variability invalide : illisible`.
- `pen.test.ts` : `Constante : CommitStroke porte variability et le builder est constant` (faux `newStrokeBuilder` qui note son 2e argument).

**Contraintes** (recopiées) : G1 ; G2 ; G4 ; G9 (raccourcis clavier, hors champ) ; G13.

**Interdits** : ne pas toucher `select.ts` (lot B) ni l'interface ; `Ctrl+Maj+↑/↓` restent Premier plan / Arrière-plan.

**Terminé** : tests verts, tsc propre, commit.

**Étapes** :
- [ ] 1. Tests rouges. 2. `item-style.ts`, `pen.ts`. 3. `arrange`, `nudge`, `key`, `setItem`. 4. Vert, tsc, commit.

<a id="tache-t7"></a>
### Tâche T7 — Panneau : Pression, Aligner, Transformer

**Objectif** : sections Pression (stylo et traits), Aligner (≥ 2 unités ; Répartir à ≥ 3), Transformer (toute
sélection), dans l'ordre … Transparence · Disposition · Aligner · Transformer · Actions.

**Fichiers** : `apps/web/src/ui/OptionsPanel.tsx`, `OptionsPanel.test.tsx`, `icons.ts`, `rb.css`.

**Interfaces** :
- Consomme : `Engine.arrange(how)`, `ItemStyle.variability` (T6) ; `variabilityOf` (T4) ; `sectionsFor(…, state().selectionUnits)` (T2) ; `DISTRIBUTE_MIN_UNITS` (T2).
- Produit :
  - `LABEL` += `pressure: "Pression"`, `align: "Aligner"`, `transform: "Transformer"`.
  - `PRESSURE: RadioOption<"constant" | "variable">[]` = `{ value: "constant", label: "Constante", icon: "pressure-constant" }`, `{ value: "variable", label: "Variable", icon: "pressure-variable" }` ; infobulles « Épaisseur constante », « Épaisseur selon la pression du stylet » (`TipBubble` du segment ou `aria-description`) ; `readers.pressure = (e) => variabilityOf(e.look)`, `fallbacks.pressure = (s) => s.variability` ; résumé « Pression · Variable ».
  - Aligner : deux rangées `rb-pick-row` de `IconButton` (`data-option-value` = la disposition, `class: "rb-opt-btn"`) : `align-left` (`align-start-vertical`), `align-center` (`align-center-vertical`), `align-right` (`align-end-vertical`), `distribute-h` (`align-horizontal-space-around`, seulement si `selectionUnits >= 3`) ; `align-top` (`align-start-horizontal`), `align-middle` (`align-center-horizontal`), `align-bottom` (`align-end-horizontal`), `distribute-v` (`align-vertical-space-around`, idem) ; libellés avec raccourci (« Aligner à gauche (Alt+Maj+←) »…).
  - Transformer : `flip-h` (`flip-horizontal` = Lucide `square-axis-dashed-vertical`), `flip-v` (`flip-vertical` = `square-axis-dashed-horizontal`), `rotate-ccw` (`rotate-ccw-square`), `rotate-cw` (`rotate-cw-square`).
  - Icônes Lucide @7981a0798a (ISC), tracés lus : `align-start-vertical` `[rect 9×6 x6 y14 rx2, rect 16×6 x6 y4 rx2, path "M2 2v20"]` ; `align-center-vertical` `["M12 2v20", "M8 10H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2h4", "M16 10h4a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-4", "M8 20H7a2 2 0 0 1-2-2v-2c0-1.1.9-2 2-2h1", "M16 14h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1"]` ; `align-end-vertical` `[rect 16×6 x2 y4 rx2, rect 9×6 x9 y14 rx2, "M22 22V2"]` ; `align-start-horizontal` `[rect 6×16 x4 y6 rx2, rect 6×9 x14 y6 rx2, "M22 2H2"]` ; `align-center-horizontal` `["M2 12h20", "M10 16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4", "M10 8V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v4", "M20 16v1a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-1", "M14 8V7c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2v1"]` ; `align-end-horizontal` `[rect 6×16 x4 y2 rx2, rect 6×9 x14 y9 rx2, "M22 22H2"]` ; `align-horizontal-space-around` `[rect 6×10 x9 y7 rx2, "M4 22V2", "M20 22V2"]` ; `align-vertical-space-around` `[rect 10×6 x7 y9 rx2, "M22 20H2", "M22 4H2"]` ; `rotate-ccw-square` `["M20 9V7a2 2 0 0 0-2-2h-6", "m15 2-3 3 3 3", "M20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"]` ; `rotate-cw-square` `["M12 5H6a2 2 0 0 0-2 2v3", "m9 8 3-3-3-3", "M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"]` ; `flip-horizontal` (Lucide `square-axis-dashed-vertical`) `["M12 14v2", "M12 20v2", "M12 2v2", "M12 8v2", "M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3", "M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"]` ; `flip-vertical` (Lucide `square-axis-dashed-horizontal`) `["M10 12H8", "M16 12h-2", "M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3", "M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3", "M22 12h-2", "M4 12H2"]` ; dessinées : `pressure-constant` `[["path", { d: "M4 12h16", "stroke-width": "3" }]]`, `pressure-variable` `[["path", { d: "M4 12c4-3 12-3 16 0c-4 3-12 3-16 0z" }]]`.
- Réutilise : `apps/web/src/engine/engine.ts:996-999` `bringToFront`, `sendToBack`, `reorder` — section Disposition inchangée (réutiliser).
- Réutilise : `apps/web/src/ui/RadioChoices.tsx:39`, `IconButton.tsx` — segments Pression, boutons Aligner et Transformer (réutiliser).
- Rapport de tâche : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.

**Test et commande bornée** :
```bash
cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/ui 2>&1 | tail -25
```
Preuve : ≥ 5 tests neufs passés (`Pression · Variable`, `Pression : Constante écrit variability`, `Aligner : 2 unités, Répartir à 3`, `Transformer : quatre boutons, arrange appelé`, `ordre : Disposition, Aligner, Transformer, Actions`) ; anciens verts ; `0 failed`.

**Tests à écrire d'abord** (le faux moteur de `mount` reçoit `arrange: vi.fn(() => true)` ; l'état reçoit `selectionUnits`) :
- `Pression · Variable` : outil `pen` : en-tête `pressure` contient « Pression » et « · Variable ».
- `Pression : Constante écrit variability` : clic `[data-option="pressure"] [data-option-value="constant"]` → `calls` contient `{ variability: "constant" }`.
- `Aligner : 2 unités, Répartir à 3` : 2 unités → 6 boutons dans `[data-option="align"]`, pas de `distribute-h` ; 3 unités → 8.
- `Transformer : quatre boutons, arrange appelé` : clic `flip-h` → `engine.arrange` appelé avec `"flip-h"`.
- `ordre` : sélection de deux rectangles, 2 unités : `layers`, `align`, `transform`, `actions` en fin, dans cet ordre.

**Contraintes** (recopiées) : G1 ; G2 ; G4 ; G5 ; G8 ; G9 (boutons de 44 px) ; G10 ; G13.

**Interdits** : ne pas toucher le moteur ; ne pas changer Disposition.

**Terminé** : tests verts, tsc propre, commit.

**Étapes** :
- [ ] 1. Tests rouges. 2. Icônes. 3. Sections et corps. 4. Vert, tsc, commit.

<a id="tache-t8"></a>
### Tâche T8 — Pipette de scène

**Objectif** : un bouton « Pipette » (touche I, sélecteur ouvert) arme un toucher unique sur la scène ; la couleur
affichée à ce point est écrite comme un choix de la grille (une étape) dans la section retenue à l'armement ; le
sélecteur reste ouvert pendant l'armement et se ferme après la lecture ; Échap annule.

**Fichiers** : `apps/web/src/ui/ColorPicker.tsx`, `ColorPicker.test.tsx`, `OptionsPanel.tsx`, `OptionsPanel.test.tsx`, `icons.ts`, `apps/web/src/engine/render/canvas2d.ts`, `canvas2d.test.ts`, `renderer.ts`, `apps/web/src/engine/engine.ts`, `engine.test.ts`, `apps/web/src/ui/shortcuts.ts` (ligne `pipette` « Pipette (sélecteur ouvert) » `I`, et sa ligne `EXPECT` dans `shortcuts.test.ts` : `["native", "i"]` n'existe pas — utiliser un reconnaisseur `picker` qui vérifie `e.key === "i"` sans modificateur).


**Interfaces** :
- Produit :
  - `Renderer.colorAt?(x: number, y: number): string | null` ; `Canvas2DRenderer.colorAt(x, y)` : `this.scene.getImageData(Math.round(x * this.sx), Math.round(y * this.sy), 1, 1)`, `#rrggbb` minuscules ; alpha nul ou hors du tampon : null.
  - `Engine.pickColor(): Promise<string | null>` : arme ; le prochain `begin` d'un pointeur sur la scène ne va à aucun outil (`owner` reçoit un geste inerte), lit `renderer.colorAt(s.x, s.y)`, résout ; Échap (`key`) ou un second appel : résout `null` ; `EngineState.picking?: boolean`.
  - `ColorPickerProps.pick?: () => Promise<string | null>` ; bouton `<IconButton icon="pipette" label="Pipette (I)" attrs={{ "data-color-pipette": "" }}>` ; `I` (sans modificateur, hors champ hexadécimal) = même action ; `away` (l. 47-52) ne ferme pas tant que la pipette est armée.
  - `OptionsPanel` : `armed: { key: ColorKey; ids: readonly string[] } | null` posé à l'armement ; la lecture écrit par `write(key === "strokeColor" ? { color: c } : { background: c })` sans passer par `chooseFull` (qui sort si `picker()` est vide), puis ferme le sélecteur.
  - Icône Lucide `pipette` : `["m12 9-8.414 8.414A2 2 0 0 0 3 18.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 3.828 21h1.344a2 2 0 0 0 1.414-.586L15 12", "m18 9 .4.4a1 1 0 1 1-3 3l-3.8-3.8a1 1 0 1 1 3-3l.4.4 3.4-3.4a1 1 0 1 1 3 3z", "m2 22 .414-.414"]`.
- Réutilise : `apps/web/src/ui/ColorPicker.tsx:11-17` — `pick?: () => Promise<string | null>` (étendre).
- Réutilise : `apps/web/src/ui/ColorPicker.tsx:47-52` (`away`) — ignorée tant que la pipette est armée (étendre).
- Réutilise : `apps/web/src/engine/render/canvas2d.ts` (contexte de la scène) — `colorAt(x, y): string | null` ; moteur `pickColor()` (étendre).
- Rapport de tâche : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.

**Patron à ne pas reprendre** : `chooseFull` (`OptionsPanel.tsx:291-297`) lit `picker()` au moment du choix ; la pipette
résout après un toucher, quand la sélection ou le sélecteur peuvent avoir changé : la clé et les cibles sont figées à
l'armement. Le `pointerdown` en capture du document (`ColorPicker.tsx:47-52`) fermerait le sélecteur avant la lecture.
Référence du toucher unique : la pipette de la séance d'image (`apps/web/src/engine/tools/image-edit.ts:131-150`, `pick` l. 181-189).

**Test et commande bornée** :
```bash
cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/ui/ColorPicker.test.tsx src/ui/OptionsPanel.test.tsx src/ui/shortcuts.test.ts src/engine/engine.test.ts src/engine/render/canvas2d.test.ts 2>&1 | tail -20
```
Preuve : ≥ 5 tests neufs passés (`pipette : le toucher extérieur ne ferme pas`, `I arme la pipette`, `pipette : écrit la section retenue puis ferme`, `pickColor : un toucher, Échap annule`, `colorAt : #rrggbb, null hors tampon`) ; `0 failed`.

**Contraintes** (recopiées) : G1 ; G2 ; G4 ; G8 ; G9 (toucher d'abord, I au clavier) ; G13.

**Interdits** : pas d'API `EyeDropper` ; le toucher lu n'atteint pas l'outil actif ; pas de changement de sélection.

**Terminé** : tests verts, tsc propre, commit. Si le temps manque (G1), cette tâche est la première coupée : le rapport le dit et T9 retire S2.3 et S2.4 « I ».

**Étapes** :
- [ ] 1. Tests rouges. 2. `colorAt`, `pickColor`. 3. `ColorPicker.pick`, `I`, `away`. 4. `OptionsPanel.armed`. 5. Vert, tsc, commit.

<a id="tache-t9"></a>
### Tâche T9 — Essai lot A, amorce, captures lot A

**Objectif** : un essai navigateur rejoue S1 à S4 au doigt puis au clavier, joué par `verifier.sh --e2e` ; l'essai
d'OG11 reçoit sa ligne d'amorce ; captures 2x avant et après du lot A.

**Fichiers** : voir la table (ligne T9).

**Interfaces** :
- Produit :
  - `commun.mjs` : à côté de `foldOptions` (l. 309) :
```js
/** OG23 (déc. 7) : toutes les sections du panneau d'options ouvertes avant tout chargement (clé `roomboard.options-sections`
 *  de `device-settings.ts`), pour qu'un essai ancien trouve les corps visibles. À appeler avant `goto`. */
export async function openOptionSections(page) {
  const keys = ["strokeColor", "background", "fillStyle", "strokeWidth", "pressure", "strokeStyle", "roughness", "roundness", "font", "fontSize", "textAlign", "arrowheads", "opacity", "image", "layers", "align", "transform", "actions"];
  await page.addInitScript((ks) => window.localStorage.setItem("roomboard.options-sections", JSON.stringify(Object.fromEntries(ks.map((k) => [k, true])))), keys);
}
```
  - `personnalisation-2-navigateur.mjs:59` : la seule ligne ajoutée `await openOptionSections(page);` avant `const cdp` (et l'import).
  - `scripts/essais/personnalisation-2-retours-navigateur.mjs` : même squelette que `personnalisation-2-navigateur.mjs` (en-tête, `main` l. 1206-1300, aides `newPage`, `waitAttr`, `touchDrag`, `marquee`, `tapAt`, `tapStage`, `press`, `fingerprint`, `pixelAt`, `saved`, `readState` des l. 46-195, recopiées) ; options `--lot A|B` (sans option : les deux), `--only sN`, `--captures`, `--dist <dossier> --nom avant` ; `LABEL = "personnalisation-2-retours"` ; sortie `S1 OK` … et `personnalisation-2-retours : OK` ; lignes `Lire : <clé>=<valeur>` pour chaque valeur prouvée.
  - Scénarios du lot A, joués pour `mode` ∈ {`doigt`, `clavier`} : S1 (1-3 du cadrage), S2 (1-5 ; S2.5 par la CLI sur un fichier temporaire), S3 (1-5 ; le stylet par `Input.dispatchTouchEvent` impossible pour `pen` : `page.evaluate` qui envoie des `PointerEvent` `pointerType: "pen"` avec `pressure` 0,1 → 1 sur `#stage`), S4 (1-7, raccourcis joués avec les paires `key`/`code` AZERTY puis QWERTY par `page.keyboard.down/up` et `page.dispatchEvent` si `code` doit différer).
  - Captures (`--captures`, `deviceScaleFactor: 2`) dans `docs/design/captures/personnalisation-2-retours/` : `avant-panneau.png`, `avant-selecteur.png`, `avant-stylo.png`, `avant-alignes.png` par `--dist ~/.cache/tmp/og23-dist-avant --nom avant` (gestes qui existent sur `main` seulement) ; `apres-panneau.png` (accordéon), `apres-selecteur.png` (case Transparent), `apres-stylo.png` (Pression), `apres-alignes.png` (multi-sélection alignée).
  - `verifier.sh` : bloc `--e2e`, après `personnalisation-2-navigateur.mjs` : `node scripts/essais/personnalisation-2-retours-navigateur.mjs` puis `echo "personnalisation-2-retours : OK"` ; `verifier-e2e.test.sh` : une ligne `grep -q "scripts/essais/personnalisation-2-retours-navigateur.mjs" …`.
  - `nettete.test.mjs` : si une icône neuve demande une entrée de mesure, l'ajouter ; sinon inchangé (le dire au rapport).
- Réutilise : `scripts/essais/commun.mjs:309` `foldOptions` — `openOptionSections(page)` à côté, même patron `addInitScript` (étendre).
- Rapport de tâche : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.

**Preuve visuelle** : lectures d'abord, par l'essai : `Lire : S1.head.strokeStyle=false`, `Lire : S1.relu.strokeStyle=true`,
`Lire : S2.color=transparent`, `Lire : S2.itemStyle.color=#000000`, `Lire : S2.pipette=#a5d8ff`, `Lire : S3.variability=constant`,
`Lire : S3.ecart.constant<5`, `Lire : S3.ecart.variable>30`, `Lire : S4.x0=<valeur commune>`, `Lire : S4.etapes=1` ; puis les
huit captures, décrites au rapport (une phrase chacune : ce qu'on voit, ce qui a changé).

**Test et commande bornée** (reconstruction G12, puis builds) :
```bash
cd <wt> && nice -n 10 pnpm --filter @roomboard/web build 2>&1 | tail -3 && nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -3
cd <wt> && node scripts/essais/personnalisation-2-retours-navigateur.mjs --lot A 2>&1 | grep -E "S[1-4] OK|Lire :|ÉCHEC|OK$" | tail -40
cd <wt> && node scripts/essais/personnalisation-2-retours-navigateur.mjs --lot A --captures 2>&1 | tail -3 && node scripts/essais/personnalisation-2-retours-navigateur.mjs --lot A --captures --dist ~/.cache/tmp/og23-dist-avant --nom avant 2>&1 | tail -3
cd <wt> && node ~/.claude/scripts/vm/suite-vm.cjs -- scripts/verifier.sh --e2e 2>&1 | tail -30
```
Preuve : `S1 OK`, `S2 OK`, `S3 OK`, `S4 OK` (deux fois : doigt, clavier), `personnalisation-2-retours : OK`, code 0 ;
`personnalisation-2 : OK` (essai d'OG11 vert avec l'amorce) ; les essais de S7.1 du cadrage (`c1-profils`, `c3-groupes`,
`c5-image`, `c6a-pot`, `c7b-texte-riche`, `c10a-tableau`, `c13-tableaux`, `c15-3d`, `design-l1/l2/l3`, `personnalisation-1a`)
verts dans la suite ; `CLI : OK` ; tailles Wasm dans l'enveloppe G6 (sortie de la suite) ; suite code 0, aucun `FAIL `.

**Contraintes** (recopiées) : G1 ; G3 (suite par `suite-vm.cjs`) ; G4 (captures ajoutées une par une) ; G5 ; G6 ; G9 (doigt d'abord, clavier ensuite) ; G10 (captures 2x) ; G12 ; G13.

**Interdits** : aucune réécriture de fond d'un essai existant (une ligne d'amorce seule) ; `verifier.sh --e2e` ne réécrit
jamais une capture (pas de `--captures` dans `verifier.sh`).

**Terminé** : essai vert deux fois de suite, suite complète verte, captures commitées, commit. Le lot A est alors fusionnable.

**Étapes** :
- [ ] 1. `openOptionSections`, amorce, `verifier.sh` ; lancer l'essai d'OG11 → `personnalisation-2 : OK`.
- [ ] 2. Écrire l'essai neuf, S1 d'abord (rouge sur un build sans T5 impossible : le constater sur le build courant, vert attendu) ; S2, S3, S4.
- [ ] 3. Captures avant et après ; suite complète ; commit.

---

# Lot B

<a id="tache-t10"></a>
### Tâche T10 — Cœur, pont, contrat lot B : `dragCopy`, départ de la baguette

**Objectif** : champ facultatif `dragCopy: true` posé et retiré par `SetStyle` (tout élément dont l'aspect est lu) ;
départ `x`, `y` (pixels source) facultatif dans `transparent`, calculé par `flood_region` depuis ce point ; tout cela
lisible par l'API TS, le faux cœur, le Worker de pixels et la CLI.

**Fichiers** : voir la table (ligne T10).

**Interfaces** :
- Produit (Rust) :
  - `Look.drag_copy: Option<bool>` (`#[serde(rename = "dragCopy")]` par `rename_all`, seul `true` lu ; clé `dragCopy` booléenne, `In::Any(Any::Bool(true))`) ; `LOOK_KEYS` 11 → 12 ; `StylePatch.drag_copy: Option<bool>` (`Some(false)` retire, `Some(true)` pose, `stroke | shape | text | image`).
  - `TransparentView` et `TransparentInput` += `x: Option<u32>` / `x: Option<f64>`, `y` idem (`#[serde(skip_serializing_if = "Option::is_none")]`) ; `transparent_of(t, w, h)` : les deux ou aucun, entiers, `0 ≤ x < w`, `0 ≤ y < h`, sinon `None` (donc `BadImageParams` à l'écriture, champ lu absent à la lecture) ; `transparent_prelim` écrit `x`, `y` seulement s'ils sont là.
  - `pixels::transparent_color_from(px: &mut [u8], w: u32, h: u32, t: &Transparent, seed: Option<(u32, u32)>) -> Result<(), PixelError>` : `seed: Some(p)` → masque `flood_region(px, w, h, &[p], …)` (le mode contigu ou global est ignoré) ; `None` → comportement d'aujourd'hui ; `transparent_color(px, w, h, t)` = `transparent_color_from(px, w, h, t, None)`.
  - `roomboard-formats-wasm` : `#[wasm_bindgen] pub fn image_transparent_seed(px: &mut [u8], w: u32, h: u32, r: u8, g: u8, b: u8, tolerance: u8, soft: u8, x: u32, y: u32) -> Result<(), JsError>`.
  - Pont `roomboard-wasm` : `set_style(…, variability_set, variability, drag_copy: Option<bool>)` ; `image_params_input` admet `[tolérance, plume, contigu, x, y]` (5 nombres) en plus des 3.
- Produit (TS) :
  - `Look.dragCopy?: true` ; `LookPatch.dragCopy?: boolean` ; `dragCopyOf(l): boolean` ; `toLook` lit `dragCopy === true`.
  - `TransparentColor` += `x?: number; y?: number` ; `normalizeParams` contrôle `x`, `y` contre `w`, `h` ; `pixelKey` inclut `x`, `y` ; `imageParamsArgs` envoie 5 nombres quand `x` est là.
  - `PixelFormatsBinding.image_transparent_seed?` (`platform/container.ts:110`) ; `PixelJob.size?: readonly [number, number]` (taille source, posée par `image-cache.ts:226`) ; `applyPixels` : avec `t.x`/`t.y` et `image_transparent_seed`, départ mis à l'échelle du bitmap (`Math.min(w - 1, Math.floor((t.x * w) / size[0]))`, idem en y) ; sinon `image_transparent`.
  - Faux cœur : `restyled` : `dragCopy` (`true` pose, `false` retire) sur les genres de `styleKind` ; `validStyle` : `dragCopy` non booléen → « style invalide » ; `SetImageParams` passe par `normalizeParams` (x, y contrôlés).
  - CLI : `formats.ts:59` note complétée par `dragCopy` et `transparent.x/y` ; `ops.test.ts` : `SetStyle dragCopy admis`.
- Réutilise : `crates/roomboard-core/src/element.rs:366` `Look`, `look_fields`, `read_look` — `drag_copy: Option<bool>` (étendre).
- Réutilise : `crates/roomboard-core/src/style.rs:19` `StylePatch` — patch `dragCopy` (étendre).
- Réutilise : `crates/roomboard-formats/src/pixels.rs:69` `flood_region` (départs quelconques), `:154` `transparent_color` ; `crates/roomboard-core/src/image.rs:12-30,121,184` — départ `x`, `y` (étendre ; écart : `transparent_color_from` au lieu d'un champ `Transparent.seed`, pour garder les tests de `pixels.rs` inchangés).
- Réutilise : `apps/web/src/platform/pixel-runner.ts` — le travail porte `transparent.x`, `y` et `size` ; file et Worker inchangés (réutiliser).
- Rapport de tâche : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.

**Patron à ne pas reprendre** : `TransparentView` dérive `Eq` et le plan d'écriture d'`image.rs` compare l'état lu et
l'état voulu : un `x` gardé mais lu absent (hors de l'image) doit être retiré comme un champ illisible (I4), pas
réécrit à chaque appel. Référence : `crates/roomboard-core/src/image.rs:194-230` (`plan`) et le traitement de `crop`.

**Test et commande bornée** (reconstruction G12 ensuite) :
```bash
cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && unset CARGO_TARGET_DIR && nice -n 10 cargo test --workspace -j 4 2>&1 | grep -E "test result|FAILED|error\[" | tail -20
cd <wt>/apps/web && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm exec vitest run src/core src/platform 2>&1 | tail -15
cd <wt> && nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -3 && node scripts/essais/cli-essai.mjs 2>&1 | tail -6
```
Preuve : `test result: ok` partout ; tests `seed_clears_only_the_touched_region`, `seed_none_matches_transparent_color`,
`transparent_seed_out_of_image_refused`, `transparent_without_seed_keeps_bytes`, `set_style_drag_copy_one_step`,
`drag_copy_kept_by_extract` passés ; contrat `dragCopy` et `transparent x y` joués sur les deux cœurs ; `CLI : OK` avec
la ligne `personnalisation-2-retours : dragCopy` ; tailles (`stat`) : principal ≤ 1 460 761 o, formats ≤ 2 798 527 o.

**Tests à écrire d'abord** :
- `pixels.rs` (module de tests, aide `ring()` existante : fond blanc, anneau rouge, intérieur blanc) : `seed_clears_only_the_touched_region` (départ (10, 10) : intérieur alpha 0, fond `WHITE` intact ; départ (0, 0) : fond alpha 0, intérieur intact) ; `seed_none_matches_transparent_color` (mêmes octets que `transparent_color` en contigu et en global).
- `tests/pot_image.rs` ou un fichier neuf `tests/baguette.rs` : `transparent_seed_out_of_image_refused` (`x = w` → `BadImageParams`, aucune étape) ; `transparent_seed_read_back` ; `transparent_without_seed_keeps_bytes` (fichier sans `x`, `y` réenregistré : mêmes octets).
- `tests/look.rs` : `set_style_drag_copy_one_step` (pose, une étape ; `Some(false)` retire ; même valeur : aucune étape ; zone `fill` ignorée) ; `drag_copy_kept_by_extract` (`extract` puis `insert_fragment` gardent `dragCopy`).
- `wasm-core.contract.test.ts` : `SetStyle dragCopy`, `SetImageParams transparent x y` (x hors image : même message sur les deux cœurs).
- `pixel-runner.test.ts` : `départ mis à l'échelle du bitmap` (faux module : `image_transparent_seed` reçoit (5, 5) pour x = 10, y = 10, `size` (200, 200), bitmap 100 × 100).
- `cli-essai.mjs`, même bloc que T4 : `SetStyle { dragCopy: true }` lu par `state`, puis `{ dragCopy: false }` : champ absent ; `SetImageParams` d'une image de fixture (`solidPng` de `commun.mjs`) avec `transparent: { color: "#ffffff", tolerance: 10, soft: 0, contiguous: true, x: 0, y: 0 }` lu par `state` ; `x: 9999` → code 1 ; `console.log("personnalisation-2-retours : dragCopy")`.

**Contraintes** (recopiées) : G1 ; G2 ; G3 ; G4 ; G6 (+20 000 o au principal, +4 000 o à `formats`) ; G7 ; G11 ; G12 ; G13.

**Interdits** : aucune dépendance neuve ; aucune encre ne traverse la frontière page ↔ Rust natif ; ne pas changer les tests existants de `pixels.rs`.

**Terminé** : tout vert, tailles consignées, commit.

**Étapes** :
- [ ] 1. Tests Rust rouges. 2. `element.rs`, `style.rs`, `image.rs`, `pixels.rs`, `formats-wasm`, pont. 3. Reconstruction G12, tailles. 4. TS (api, look, image-params, wasm-core, fake-core, container, pixel-runner, image-cache) et contrat. 5. CLI, `cli-essai.mjs`. 6. Commit.

<a id="tache-t11"></a>
### Tâche T11 — Moteur : Glisser une copie, poignée Déplacer, badge

**Objectif** : avec l'outil Sélection, un glisser parti d'un objet `dragCopy` (ou d'une sélection qui en contient un)
laisse l'original peint, montre la copie en fantôme et pose au relâché une copie de toute la sélection au décalage du
geste (une étape, copies sans `dragCopy`, sélectionnées) ; une poignée « Déplacer » au-dessus du cadre déplace
l'original ; un badge `copy` au coin haut gauche signale la propriété.

**Fichiers** : voir la table (ligne T11).

**Interfaces** :
- Consomme : `Look.dragCopy`, `LookPatch.dragCopy`, `dragCopyOf` (T10) ; `Engine.nudge` (T6, flèches pour tout objet).
- Produit :
  - `Engine.duplicate(ids: readonly string[], dx: number, dy: number, strip: boolean): boolean` : `doc.extract(pageId, ids)` ; avec `strip`, `fragment.apply({ type: "SetStyle", ids: fragment.elementIds(fragment.pageIds()[0]), patch: { dragCopy: false } })` (dans le fragment, hors historique de la page) ; puis `engine.insertFragment(fragment, dx, dy)` (une étape, copies sélectionnées) ; `fragment.free()` dans un `finally`. `duplicateSelection()` = `duplicate(sel, 10, 10, false)`.
  - `Engine.setDragCopy(on: boolean): boolean` : `SetStyle { ids: selection, patch: { dragCopy: on } }`, hors style courant.
  - `ToolContext.duplicate?(ids: readonly string[], dx: number, dy: number, strip: boolean): boolean` (posé par le moteur).
  - `select.ts` : `Mode` += `"copy"` ; au `begin` sur un objet touché, si la sélection résultante contient un élément `dragCopyOf(doc.element(id)?.look)`, mode `copy` ; `live()` en `copy` : fantômes avec la matrice, `hidden` vide (l'original reste) ; `close("end")` en `copy` : `ctx.duplicate?.(selection, dx, dy, true)` avec `[dx, dy] = moveDelta(d)` (aimanté, brut avec Alt) ; clic sans glisser : rien.
  - Poignée : `handles.ts` `MOVE_HANDLE_GAP_PX = 28`, `moveHandlePoint(b: Bounds, zoom: number): [number, number]` (milieu du bord haut, 28 px écran au-dessus) ; `hitMoveHandle(b, x, y, zoom, pointerType?: string): boolean` (portée 22 px au doigt et au stylet, 12 px à la souris) ; `select.ts` : avant `grabbedHandle`, si la sélection contient un `dragCopy` et que l'appui touche la poignée → mode `move` (comportement d'aujourd'hui) ; `InputSample.pointerType` lu s'il existe (sinon portée du doigt).
  - `EditOverlay.move?: boolean` (`mergeOverlays` : `some`) ; `canvas2d.ts` `paintOverlayChrome` : si `o.move && o.frame`, rond blanc de 24 px CSS bordé de `SELECTION_COLOR`, icône Lucide `move` (12 px, trait 1 px), au point `moveHandlePoint`.
  - `link-badge.ts` : `COPY_ICON_PATHS` (Lucide `copy` : `["M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"]` et le carré `rect 14×14 x8 y8 rx2` en chemin `"M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"`), `copyBadgeBox(b: Bounds, camera: Camera, dpr = 1): LinkBadge` (rond de 18 px, coin bas-droit à 6 px du coin haut gauche de la boîte, au pixel de l'appareil), `paintCopyBadge(ctx, box, color)` (rond, icône de 12 px) ; `drawScene` : collecte `dragCopy` comme `linked`, peint après les badges de lien, jamais à l'export (`forExport`), absent des miniatures.
  - Icône `move` (Lucide) pour la poignée : `["M12 2v20", "m15 19-3 3-3-3", "m19 9 3 3-3 3", "M2 12h20", "m5 9-3 3 3 3", "m9 5 3-3 3 3"]` (chemins dans `link-badge.ts`, comme `LINK_ICON_PATHS`).
- Réutilise : `apps/web/src/engine/engine.ts:984-995` `duplicateSelection` ; `core/api.ts:418` `extract` ; `engine.ts:186` `insertFragment` — une seule signature `duplicate(ids, dx, dy, strip)` sur `Engine` et `ToolContext` (étendre).
- Réutilise : `apps/web/src/engine/tools/select.ts:105-236` (`moveDelta`, `matrixOf`, `live`) ; `tools/handles.ts` `hitHandle` — mode `copy`, poignée `move` (étendre).
- Réutilise : `apps/web/src/engine/render/link-badge.ts:27,47` — `copyBadgeBox`, `paintCopyBadge` à côté (étendre).
- Réutilise : `apps/web/src/engine/engine.ts:1250` (écriture du style, une étape) — `setDragCopy(on)` sur la sélection, comme `setLink` (étendre).
- Rapport de tâche : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.

**Patron à ne pas reprendre** : le déplacement masque la sélection et peint des fantômes (`select.ts:224-236`, `hidden:
new Set(selection)`) ; en copie, l'original doit rester peint. Et `duplicateSelection` décale de +10/+10 sans retirer
`dragCopy` : la copie posée au glisser, elle, le perd (H11). Référence du chemin unique : `engine.ts:984-995`.

**Test et commande bornée** :
```bash
cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/engine 2>&1 | tail -20
```
Preuve : ≥ 6 tests neufs passés (`dragCopy : l'original reste, une copie`, `dragCopy : copie sans la propriété, sélectionnée`, `dragCopy : un clic ne copie rien`, `poignée Déplacer : l'original bouge`, `Ctrl+D garde dragCopy`, `copyBadgeBox au pixel`) ; `duplicateSelection +10/+10, copie sélectionnée, une étape` vert ; `0 failed`.

**Tests à écrire d'abord** :
- `select.test.ts` (banc `setup`, l. 11-36, `ctx.duplicate` ajouté par une aide locale qui appelle `extract`/`insertFragment` du faux cœur) : `dragCopy : l'original reste, une copie` (rectangle `dragCopy`, glisser de 200 px : `live().hidden` vide pendant le geste, 2 éléments au relâché, l'original à sa place, la copie à +200) ; `dragCopy : un clic ne copie rien` ; `poignée Déplacer : l'original bouge` (appui sur `moveHandlePoint`, glisser de 100 : une `Transform`, 1 élément, `dragCopy` gardé).
- `engine.test.ts` : `dragCopy : copie sans la propriété, sélectionnée` ; `Ctrl+D garde dragCopy` ; `setDragCopy : une étape, hors style courant` ; `glisser encore l'original : 3 objets, Ctrl+Z : 2`.
- `link-badge.test.ts` : `copyBadgeBox au pixel` (dpr 2, coordonnées multiples de 0,5).
- `canvas2d.test.ts` : `badge de copie absent à l'export`.

**Contraintes** (recopiées) : G1 ; G2 ; G4 ; G8 (icônes Lucide) ; G9 (poignée de 44 px au doigt et au stylet, 24 px à la souris ; Pointer Events, jamais de glisser HTML5) ; G10 ; G13.

**Interdits** : pas de commande du cœur pour la copie (extrait + `insertFragment`) ; pas d'Alt+glisser (OG12) ; poignées de taille inchangées.

**Terminé** : tests verts, tsc propre, commit.

**Étapes** :
- [ ] 1. Tests rouges. 2. `duplicate`, `setDragCopy`, `ToolContext.duplicate`. 3. Mode `copy`, poignée. 4. Badge, chrome. 5. Vert, tsc, commit.

<a id="tache-t12"></a>
### Tâche T12 — Séance d'image : baguette depuis le point touché

**Objectif** : le panneau Image a un 3e mode « Depuis le point touché » ; la pipette y rend la couleur et le point
source ; le panneau peut s'ouvrir en rognage (`start: "crop"`) ou en baguette armée (`start: "background"`).

**Fichiers** : `apps/web/src/engine/tools/image-edit.ts`, `image-edit.test.ts`, `apps/web/src/ui/ImagePanel.tsx`, `ImagePanel.test.tsx`.

**Interfaces** :
- Consomme : `TransparentColor.x`, `.y` (T10) ; `sourcePixelAt` (`core/image-params.ts:75`).
- Produit :
  - `ImageEdit.pickPoint(): Promise<{ readonly color: string; readonly x: number; readonly y: number } | null>` (le `begin` de la pipette rend `px[0]`, `px[1]` avec la couleur) ; `pick()` = `pickPoint().then((r) => r?.color ?? null)`.
  - `PixelDraft.seed: { readonly x: number; readonly y: number } | null` ; `draftOf` lit `t.x`, `t.y` ; `pixelParams` écrit `x`, `y` quand `seed` est là (mode `seed`).
  - Sélecteur `[data-image-input="mode"]` : options `seed` « Depuis le point touché », `contiguous` « Depuis les bords », `global` « Global » (valeurs `contiguous` et `global` gardées : `c5-image-navigateur.mjs:181-184`) ; en mode `seed`, le bouton Pipette appelle `pickPoint` et pose `color` et `seed` ; un nouveau toucher remplace le départ (H8).
  - `ImagePanelProps.start?: "crop" | "background"` joué une fois au montage : `crop` → `edit.startCrop()` ; `background` → mode `seed` puis `pickPoint()` armée.
- Réutilise : `apps/web/src/engine/tools/image-edit.ts:22` `pick`, `:23` `startCrop` ; `ui/ImagePanel.tsx:47-56` — `pickPoint`, `start` (étendre ; écart : `pick` garde son type).
- Réutilise : `apps/web/src/core/image-params.ts:75` `sourcePixelAt` — point source du toucher (réutiliser).
- Rapport de tâche : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.

**Test et commande bornée** :
```bash
cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/engine/tools/image-edit.test.ts src/ui/ImagePanel.test.tsx 2>&1 | tail -15
```
Preuve : ≥ 4 tests neufs passés (`pickPoint rend le point source`, `mode Depuis le point touché`, `start crop ouvre le rognage`, `start background arme la pipette`) ; anciens verts ; `0 failed`.

**Tests à écrire d'abord** : `fakeEdit` (`ImagePanel.test.tsx:11`) reçoit `pickPoint: vi.fn(async () => (pick === null ? null : { color: pick, x: 3, y: 4 }))` ; `mode Depuis le point touché` (choisir `seed`, Pipette, Valider : `commit` reçoit `transparent` avec `x: 3, y: 4`) ; `start crop ouvre le rognage` (`startCrop` appelé une fois) ; `start background arme la pipette` (`pickPoint` appelé, sélecteur sur `seed`) ; `image-edit.test.ts` : `pickPoint rend le point source` (image 200 × 100 à l'origine, toucher (50, 20) : `{ x: 50, y: 20 }`).

**Contraintes** (recopiées) : G1 ; G2 ; G4 ; G5 (`c5-image-navigateur.mjs` vert) ; G9 ; G13.

**Interdits** : ne pas toucher `App.tsx` ni `OptionsPanel.tsx` (T13) ; Rogner, Retourner, Tourner inchangés.

**Terminé** : tests verts, tsc propre, commit.

**Étapes** :
- [ ] 1. Tests rouges. 2. `pickPoint`. 3. `PixelDraft.seed`, 3e mode, `start`. 4. Vert, tsc, commit.

<a id="tache-t13"></a>
### Tâche T13 — Panneau lot B : section Image, bascule Glisser une copie

**Objectif** : une image seule sélectionnée montre la section « Image » ouverte (Rogner, Effacer le fond, Retouches…) ;
la section Actions porte la bascule « Glisser une copie » (`aria-pressed`, mixte).

**Fichiers** : voir la table (ligne T13).

**Interfaces** :
- Consomme : `Engine.setDragCopy` (T11), `dragCopyOf` (T10), `ImagePanelProps.start` (T12).
- Produit :
  - `OptionKey` += `"image"` (dans `OPTION_ORDER` entre `opacity` et `layers`) ; `OPEN_BY_DEFAULT` += `image` ; `sectionsFor` : `image` quand l'unique cible est `kind === "image"`.
  - `OptionsPanelProps.openImage?: (start: "crop" | "background" | null) => void` ; corps `image` : trois boutons `IconButton` pleine largeur avec texte, `data-image-action` = `panel-crop` (`crop`), `panel-background` (`eraser`), `panel-retouch` (`sliders-horizontal`), libellés « Rogner », « Effacer le fond », « Retouches… ».
  - Bascule dans `actions` : `<button type="button" class="rb-opt-toggle" data-option-value="drag-copy" aria-pressed={all ? "true" : some ? "mixed" : "false"} data-mixed={some && !all ? "" : undefined}>` icône `copy` + « Glisser une copie » ; clic → `setDragCopy(!all)` (mixte : pose partout).
  - `App.tsx` : signal `imageStart: "crop" | "background" | null` ; `openImage(start)` = `setImageStart(start); setPanel("image")` ; `<ImagePanel … start={imageStart() ?? undefined}>` puis remise à `null` à la fermeture.
  - Icône Lucide `crop` : `["M6 2v14a2 2 0 0 0 2 2h14", "M18 22V8a2 2 0 0 0-2-2H2"]` ; `copy` existe déjà (`icons.ts`).
- Réutilise : `apps/web/src/engine/tools/image-edit.ts:18-35` ; `ui/ImagePanel.tsx:47-56` ; `ui/App.tsx:376` `imagePanelFor` — `OptionsPanelProps.openImage(start)` (étendre).
- Réutilise : `apps/web/src/ui/tool-options.ts:7-68` — clé `image`, `OPEN_BY_DEFAULT` (étendre).
- Rapport de tâche : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.

**Test et commande bornée** :
```bash
cd <wt>/apps/web && nice -n 10 pnpm exec vitest run src/ui 2>&1 | tail -20
```
Preuve : ≥ 5 tests neufs passés (`image seule : section Image ouverte`, `Rogner appelle openImage("crop")`, `bascule mixte`, `bascule : pose puis retire`, `Rogner depuis le panneau ouvre la séance en rognage` dans `App.test.tsx`) ; `SelectionRow.test.tsx` vert (bouton Image gardé) ; `0 failed`.

**Tests à écrire d'abord** : `tool-options.test.ts` : `sectionsFor select + image` → `["opacity", "image", "layers", "transform", "actions"]` (attente mise à jour, déc. 30) ; `OptionsPanel.test.tsx` : les quatre tests ci-dessus ; `App.test.tsx` : `Rogner depuis le panneau ouvre la séance en rognage`.

**Contraintes** (recopiées) : G1 ; G2 ; G4 ; G5 ; G8 ; G9 (bascule au doigt et Tab + Entrée, pas de raccourci propre, H12) ; G10 ; G13.

**Interdits** : le bouton Image de la rangée Sélection reste (`SelectionRow.tsx:54`) ; pas de section Média ou 3D.

**Terminé** : tests verts, tsc propre, commit.

**Étapes** :
- [ ] 1. Tests rouges. 2. `tool-options.ts`. 3. Corps `image`, bascule. 4. `App.tsx`. 5. Vert, tsc, commit.

<a id="tache-t14"></a>
### Tâche T14 — Essai final, captures, non-régression

**Objectif** : l'essai joue S5 et S6 au doigt puis au clavier, en plus de S1 à S4 ; captures 2x avant et après de
« glisser une copie » et de « image rognée et fond effacé » ; suite complète verte (S7).

**Fichiers** : `scripts/essais/personnalisation-2-retours-navigateur.mjs`, `scripts/essais/fabriques/*` (fixture d'image : fond blanc, disque rouge contenant un anneau blanc fermé, par `rgbPng` de `commun.mjs:255` si possible, sans fichier neuf), `docs/design/captures/personnalisation-2-retours/*.png`.

**Interfaces** :
- Consomme : l'essai de T9 (aides, `--lot`, `--captures`, `--dist --nom avant`).
- Produit : scénarios `s5` et `s6` (cadrage § 6, étapes 1 à 6 et 1 à 5) ; lot `B` ; captures `avant-copie.png`, `avant-image.png` (build d'avant) et `apres-copie.png` (badge, poignée, fantôme pendant le geste), `apres-image.png` (image rognée, fond effacé) ; lectures `Lire : S5.elements=2`, `Lire : S5.copie.dragCopy=absent`, `Lire : S5.bascule=mixed`, `Lire : S6.transparent.x=<x>`, `Lire : S6.anneau.alpha=255`, `Lire : S6.crop=<valeur>`.

**Preuve visuelle** : lectures ci-dessus d'abord, puis les quatre captures décrites au rapport.

**Test et commande bornée** (reconstruction G12, builds web et CLI comme T9) :
```bash
cd <wt> && node scripts/essais/personnalisation-2-retours-navigateur.mjs 2>&1 | grep -E "S[1-6] OK|Lire :|ÉCHEC|OK$" | tail -50
cd <wt> && node scripts/essais/personnalisation-2-retours-navigateur.mjs --lot B --captures 2>&1 | tail -3 && node scripts/essais/personnalisation-2-retours-navigateur.mjs --lot B --captures --dist ~/.cache/tmp/og23-dist-avant --nom avant 2>&1 | tail -3
cd <wt> && node ~/.claude/scripts/vm/suite-vm.cjs -- scripts/verifier.sh --e2e 2>&1 | tail -30
```
Preuve : `S1 OK` … `S6 OK` (doigt et clavier), `personnalisation-2-retours : OK`, code 0 ; suite complète code 0 avec
`personnalisation-2 : OK`, `c5-image` et les essais de S7.1 verts, `CLI : OK`, tailles Wasm dans l'enveloppe G6.

**Contraintes** (recopiées) : G1 ; G3 ; G4 ; G5 ; G6 ; G9 ; G10 ; G12 ; G13.

**Interdits** : aucune réécriture de fond d'un essai existant ; pas de `--captures` dans `verifier.sh`.

**Terminé** : essai et suite verts, captures commitées, commit.

**Étapes** :
- [ ] 1. Fixture et `s5`. 2. `s6`. 3. Captures avant et après. 4. Suite complète ; commit.
