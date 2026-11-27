# Plan — personnalisation-2 (OG11) : panneau d'options de l'outil et menu ☰

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**Spec** : `docs/plans/personnalisation-2-cadrage.md` (cadrage commité, base `45484db`).
**Objectif** : un îlot d'options à gauche copié d'Excalidraw (Trait, Fond, Largeur, Style du trait, Tracé, Angles,
Transparence, Actions, puis au lot 2 Remplissage, Texte, Pointes, Disposition, Lien), un menu ☰ avec raccourcis, et les
champs d'aspect facultatifs du cœur pilotables par la CLI.
**Architecture** : cœur Rust (`Look`, `SetStyle`, `set_or_remove`) → pont Wasm → API TS et faux cœur → moteur (`ItemStyle`)
→ modules purs (`tool-options.ts`, `shortcuts.ts`, `sketch.ts`) → composants Solid (`OptionsPanel.tsx`, `MenuBar.tsx`).
**Pile** : Rust (yrs), wasm-bindgen, TypeScript, Solid, Vitest, Playwright, roughjs 4.6.x.

**Arbitrages de l'orchestrateur et écarts au cadrage (relecture du plan, tour 1)** :
- Opacité : le cadrage se contredit (déc. 24 « entier 0-90 » contre déc. 15 « [0, 100], 100 retire le champ »). Tranché : **0..100 partout**, en lecture et en écriture (T1, T2, T3, faux cœur de T4). 100 est neutre et s'écrit en retirant le champ. Une valeur hors domaine est refusée à l'écriture (`BadStyle`) et lue comme neutre.
- S3.5 : le cadrage demande de couper à la gomme partielle un rectangle en tirets. La gomme du cœur ne coupe que les traits (`crates/roomboard-core/src/commands.rs:1240-1300`). T11 joue donc le cas sur un **trait du stylo en transparence 40**. C'est un écart au cadrage, qui sera aussi écrit au bloc final.
- `look` est lu aussi sur les images (opacité, déc. 15, H9) : T1 et le faux cœur de T4.
- Wasm : l'orchestrateur pose le Wasm construit (`apps/web/src/wasm/`, `apps/web/src/wasm-formats/`, ignorés par git) dans chaque worktree de tâche avant de la lancer (G13).

## Table des tâches

| id | lot | titre | dépend | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-----|-------|--------|------------------|----------|----------|--------|----------|---------|
| T1 | 1 | Cœur : `Look`, création et gomme | — | `crates/roomboard-core/src/element.rs`, `src/document.rs`, `src/commands.rs`, `src/copy.rs`, `src/query.rs`, `src/zone.rs`, `src/image.rs`, `src/table.rs`, `src/rich_text.rs`, `src/format/mod.rs`, `tests/compat_socle.rs`, `tests/scenarios.rs`, `tests/texte_riche.rs`, `tests/pot.rs`, `tests/pot_image.rs`, `tests/compat_c3.rs`, `tests/look.rs` (neuf), `crates/roomboard-wasm/src/lib.rs` (constructions seules) | isolé | concepteur-critique | `cargo test -p roomboard-core -j 4` : ≥ 1 test `erase_partial_keeps_look`, ≥ 1 test `image_look_read`, `socle_fixture_resaves_identically` ok, `0 failed` | S1, S3 | #tache-t1 |
| T2 | 1 | Cœur : `SetStyle` et `set_or_remove` | T1 | `crates/roomboard-core/src/style.rs` (neuf), `src/lib.rs`, `src/fill.rs`, `src/commands.rs`, `tests/look.rs` | isolé | concepteur-critique | `cargo test -p roomboard-core --test look -j 4` : ≥ 6 tests dont `set_style_noop_no_step`, `set_style_opacity_rounds`, `0 failed` | S1, S2 | #tache-t2 |
| T3 | 1 | Contrat TS : `Look`, `ItemStyle` | — | `apps/web/src/core/look.ts` (neuf), `apps/web/src/core/look.test.ts` (neuf), `apps/web/src/core/api.ts`, `apps/web/src/engine/item-style.ts` (neuf), `apps/web/src/engine/item-style.test.ts` (neuf) | isolé | implementeur-tdd | `vitest run src/core/look.test.ts src/engine/item-style.test.ts` : ≥ 8 tests, `parseItemStyle` présent | S2 | #tache-t3 |
| T4 | 1 | Pont Wasm, API, faux cœur | T2, T3 | `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/api.ts`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/fake-core.ts`, `apps/web/src/core/fake-core.test.ts`, `apps/web/src/core/wasm-core.contract.test.ts`, `apps/cli/src/ops.ts` | isolé | concepteur-critique | `vitest run src/core` avec `ROOMBOARD_WASM_REQUIRED=1` : ≥ 1 test `SetStyle` joué sur les deux cœurs ; tailles Wasm sous plafond | S1, S2, S3 | #tache-t4 |
| T5 | 1 | CLI (D15) | T4 | `apps/cli/src/ops.test.ts`, `apps/cli/src/formats.ts`, `apps/cli/src/session.test.ts`, `scripts/essais/cli-essai.mjs` | isolé | implementeur-tdd | `node scripts/essais/cli-essai.mjs` : `CLI : OK` et ligne `personnalisation-2 : SetStyle` ; `vitest run src/ops.test.ts` ≥ 1 test `SetStyle` | S1, S5 | #tache-t5 |
| T6 | 1 | `tool-options.ts` (DA-1) | T3 | `apps/web/src/ui/tool-options.ts` (neuf), `apps/web/src/ui/tool-options.test.ts` (neuf) | isolé | implementeur-tdd | `vitest run src/ui/tool-options.test.ts` : ≥ 10 tests dont `formValue mixte`, `sectionsFor select vide` | S1, S2, S3 | #tache-t6 |
| T7 | 1 | Raccourcis et menu ☰ | — | `apps/web/src/ui/shortcuts.ts` (neuf), `apps/web/src/ui/shortcuts.test.ts` (neuf), `apps/web/src/engine/input/keys.ts`, `apps/web/src/engine/input/keys.test.ts`, `apps/web/src/ui/MenuBar.tsx`, `apps/web/src/ui/MenuBar.test.tsx`, `apps/web/src/toolbar-profiles.ts`, `apps/web/src/toolbar-profiles.test.ts`, `apps/web/src/ui/rb.css` | isolé | implementeur-tdd | `vitest run src/ui/shortcuts.test.ts src/ui/MenuBar.test.tsx src/toolbar-profiles.test.ts src/engine/input/keys.test.ts` : ≥ 1 test `chaque raccourci a son reconnaisseur`, ≥ 1 test `Tab ferme`, ≥ 1 test `menu livré : Profil en dernier` (id `menu-profiles`) | S4 | #tache-t7 |
| T8 | 1 | Rendu : tirets, alpha, angles, roughjs | T3 | `apps/web/package.json`, `pnpm-lock.yaml`, `THIRD_PARTY_NOTICES.md`, `apps/web/src/engine/render/sketch.ts` (neuf), `sketch.test.ts` (neuf), `canvas2d.ts`, `canvas2d.test.ts`, `webgl2.ts`, `webgl2.test.ts`, `overlay.ts`, `renderer.ts`, `apps/web/src/app/pdf-overlay-vector.test.ts` | isolé | concepteur-critique | `vitest run src/engine/render src/app/pdf-overlay-vector.test.ts` : ≥ 1 test `roughjs déterministe`, ≥ 1 test `opacité du trait vif`, ≥ 1 test `architecte au pixel près` | S1, S5 | #tache-t8 |
| T9 | 1 | Moteur : style courant, Dupliquer, Supprimer | T4, T7, T8 | `apps/web/src/engine/engine.ts`, `engine/engine.test.ts`, `engine/tools/shape.ts`, `engine/tools/pen.ts`, `engine/tools/text.ts`, `apps/web/src/device-settings.ts`, `device-settings.test.ts`, `apps/web/src/app/board-session.ts`, `app/board-session.test.ts`, `apps/web/src/app/annotation-page.ts`, `annotation-page.test.ts`, `apps/web/src/main.ts` | isolé | concepteur-critique | `vitest run src/engine/engine.test.ts src/device-settings.test.ts src/app/board-session.test.ts src/app/annotation-page.test.ts src/engine/tools/shape.test.ts` : ≥ 1 test `duplicateSelection +10/+10`, ≥ 1 test `style courant relu` | S2, S3 | #tache-t9 |
| T10 | 1 | Panneau `OptionsPanel` | T6, T8, T9 | `apps/web/src/ui/OptionsPanel.tsx` (neuf), `OptionsPanel.test.tsx` (neuf), `ui/RadioChoices.tsx`, `ui/RadioChoices.test.tsx`, `ui/icons.ts`, `ui/rb.css`, `ui/island-place.ts`, `ui/island-place.test.ts`, `ui/App.tsx` | isolé | implementeur-tdd | `vitest run src/ui` : ≥ 1 test `OptionsPanel rectangle : 7 sections`, `Toolbar.test.tsx`, `App.test.tsx`, `rb-css.test.ts` verts ; `bash scripts/tests/controle-icones.test.sh` code 0 | S1, S2, S3, S5 | #tache-t10 |
| T11 | 1 | Essai navigateur, captures 2x, netteté § 10 (lot 1) | T5, T10 | `scripts/essais/personnalisation-2-navigateur.mjs` (neuf), `scripts/essais/commun.mjs`, essais anciens (une ligne d'amorce si besoin), `scripts/verifier.sh`, `docs/design/captures/personnalisation-2/*.png` | isolé | implementeur-tdd | `node scripts/essais/personnalisation-2-navigateur.mjs` : `S1 OK` … `S5 OK`, code 0 ; `suite-vm … scripts/verifier.sh --e2e` code 0 | S1–S5 | #tache-t11 |
| T12 | 2 | Cœur lot 2 : champs d'aspect | T11 | `crates/roomboard-core/src/element.rs`, `src/style.rs`, `tests/look.rs`, `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/look.ts`, `look.test.ts`, `core/wasm-core.ts`, `core/fake-core.ts`, `core/fake-core.test.ts`, `apps/cli/src/formats.ts`, `scripts/essais/cli-essai.mjs` | isolé | concepteur-critique | `cargo test -p roomboard-core --test look -j 4` ≥ 1 test `bad_link_refused` ; `CLI : OK` | S7, S8 | #tache-t12 |
| T13 | 2 | Cœur lot 2 : `Restack` (DA-2) | T12 | `crates/roomboard-core/src/order.rs` (neuf), `src/lib.rs`, `src/commands.rs`, `tests/order.rs` (neuf), `crates/roomboard-wasm/src/lib.rs`, `core/api.ts`, `core/wasm-core.ts`, `core/fake-core.ts`, `core/fake-core.test.ts`, `apps/cli/src/ops.ts`, `ops.test.ts`, `formats.ts`, `scripts/essais/cli-essai.mjs` | isolé | concepteur-critique | `cargo test -p roomboard-core --test order -j 4` ≥ 5 tests ; `vitest run src/core` ≥ 1 test `Restack` | S6 | #tache-t13 |
| T14 | 2 | Rendu lot 2 : hachures, pointes, alignement, polices | T12 | `engine/render/sketch.ts`, `sketch.test.ts`, `canvas2d.ts`, `canvas2d.test.ts`, `engine/text-layout.ts`, `text-layout.test.ts` | isolé | implementeur-tdd | `vitest run src/engine/render src/engine/text-layout.test.ts` ≥ 1 test `police absente : chaîne inchangée` | S7, S8 | #tache-t14 |
| T15 | 2 | Panneau lot 2 : Remplissage, Texte, Pointes, Disposition | T13, T14 | `ui/tool-options.ts`, `tool-options.test.ts`, `ui/OptionsPanel.tsx`, `OptionsPanel.test.tsx`, `ui/icons.ts`, `engine/engine.ts`, `engine/engine.test.ts`, `engine/input/keys.ts`, `keys.test.ts`, `ui/shortcuts.ts` | isolé | implementeur-tdd | `vitest run src/ui src/engine/engine.test.ts` ≥ 1 test `en saisie Police grisée`, ≥ 1 test `orderKey` | S6, S7 | #tache-t15 |
| T16 | 2 | Sélecteur de couleur, touches S et G | T15 | `ui/ColorPicker.tsx` (neuf), `ColorPicker.test.tsx` (neuf), `ui/open-color.ts` (neuf), `ui/OptionsPanel.tsx`, `THIRD_PARTY_NOTICES.md`, `ui/rb.css`, `engine/input/keys.ts`, `keys.test.ts` | isolé | implementeur-tdd | `vitest run src/ui/ColorPicker.test.tsx` ≥ 1 test `Échap rend le focus` | S8 | #tache-t16 |
| T17 | 2 | Menu lot 2 : Aide, Effacer la page, Ctrl+Maj+E | T15 | `ui/HelpPanel.tsx` (neuf), `HelpPanel.test.tsx` (neuf), `ui/App.tsx`, `toolbar.ts`, `toolbar-profiles.ts`, `toolbar-profiles.test.ts`, `app/toolbar-host.ts`, `toolbar-host.test.ts`, `platform/controller.ts`, `controller.test.ts`, `main.ts`, `ui/shortcuts.ts`, `ui/shortcuts.test.ts` | isolé | implementeur-tdd | `vitest run src/ui/HelpPanel.test.tsx src/platform/controller.test.ts src/app/toolbar-host.test.ts` ≥ 1 test `page-clear confirme` | S8 | #tache-t17 |
| T18 | 2 | Lien (H5) | T16, T17 | `ui/LinkPopover.tsx` (neuf), `LinkPopover.test.tsx` (neuf), `ui/OptionsPanel.tsx`, `engine/render/canvas2d.ts`, `engine/engine.ts`, `platform/shell.ts`, `apps/desktop/src-tauri/Cargo.toml`, `apps/desktop/src-tauri/capabilities/default.json`, `apps/desktop/src-tauri/src/lib.rs`, `THIRD_PARTY_NOTICES.md` | isolé | concepteur-critique | `vitest run src/ui/LinkPopover.test.tsx` ≥ 1 test `javascript: refusé` ; `bash scripts/tests/coque-csp.test.sh` code 0 | S8 | #tache-t18 |
| T19 | 2 | Essai lot 2, captures 2x, netteté § 10 | T18 | `scripts/essais/personnalisation-2-navigateur.mjs`, `docs/design/captures/personnalisation-2/*.png` | isolé | implementeur-tdd | `node scripts/essais/personnalisation-2-navigateur.mjs --lot 2` : `S6 OK`, `S7 OK`, `S8 OK`, code 0 | S6–S8 | #tache-t19 |

**Vagues** (aucune tâche d'une vague ne recoupe une autre de la même vague) :
- Lot 1 — V1 : T1, T3, T7 · V2 : T2, T6, T8 · V3 : T4 · V4 : T5, T9 · V5 : T10 · V6 : T11.
- Lot 2 — V7 : T12 · V8 : T13, T14 · V9 : T15 · V10 : T16, T17 (fichiers disjoints : `OptionsPanel.tsx` est à T16 seul ; T17 ne le touche pas) · V11 : T18 · V12 : T19.
- Le lot 1 est fusionnable seul après T11 (suite complète verte, essais anciens verts). Le lot 2 part si l'horaire le permet ; sinon ses
  tâches sont écrites au bloc final comme reste à faire.

## Global Constraints

- G1. Excalidraw (MIT) lu dans `~/.cache/tmp/og11-excalidraw` (fork : seul le comportement amont est copié) ; un fichier repris ou adapté garde la mention MIT en tête et entre dans `THIRD_PARTY_NOTICES.md`.
- G2. `roughjs` (MIT, 4.6.x) est la seule dépendance ajoutée (et `tauri-plugin-opener` au lot 2, T18, H5) ; poids mesuré dans la tâche qui l'ajoute.
- G3. Icônes Lucide (ISC) en tracés SVG dans `apps/web/src/ui/icons.ts`, avec la mention, trait 1,5, `ICON_VIEWBOX` ; traits fins nets (§ 10 de `docs/plans/design-cadrage.md`) ; jetons `--rb-*` et îlots de RoomBoard, styles neufs par `--rb-btn-*`.
- G4. Tactile d'abord : cibles ≥ 44 px (taille du profil S 44, M 48, L 64), pointeur (`pointerdown`/`click`), jamais de glisser HTML5 ; clavier ensuite (Tab, flèches, Entrée, Échap). Infobulle maison, jamais `title`.
- G5. Essais existants (`data-item`, `data-preset`, `data-selection-action`, `data-format`, `data-menu-toggle`) verts sans réécriture de fond ; seule retouche admise : une ligne d'amorce `await foldOptions(page)`.
- G6. CLI mise à jour pour toute fonction neuve du cœur (D15 : `COMMAND_TYPES`, ligne `.roomboard` de `FORMAT_LOTS`, `ops.test.ts`, `scripts/essais/cli-essai.mjs`).
- G7. Tailles Wasm : module principal ≤ 1 572 864 o, `formats` ≤ 3 145 728 o ; aucun relevé de plafond.
- G8. Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` ; message en anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`, `--all` ou `.`, jamais `commit -a`) ; jamais `--force`.
- G9. VM partagée : `nice -n 10` devant toute commande lourde, cargo `-j 4`, `CARGO_TARGET_DIR` propre au worktree (par défaut son `target/`, jamais celui d'un autre worktree) ; suite complète par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; un test en délai dépassé se rejoue une fois.
- G10. Fichiers d'essai fabriqués depuis les fixtures du dépôt (`crates/roomboard-core/tests/fixtures`, `scripts/essais/fabriques`), jamais un fichier de Jérôme.
- G11. Ne pas toucher : barre latérale, barre des pages, mode de page (OG4), fonds de page (OG5).
- G12. Champs du document : scalaires facultatifs du `Y.Map` de l'élément (jamais `Any::Map`, D25) ; absent = neutre ; une valeur illisible est lue neutre et gardée telle quelle. Opacité : 0..100 partout, 100 = neutre (champ retiré).
- G13. Wasm : `apps/web/src/wasm/` et `apps/web/src/wasm-formats/` sont ignorés par git (`.gitignore:5-6`). L'orchestrateur les pose, construits, dans chaque worktree de tâche avant son lancement. Une tâche qui change le pont (T4, T12, T13) reconstruit le Wasm par les lignes de `scripts/verifier.sh:34-48`, et T5 et T11 mettent ces lignes en tête de leurs commandes :
  ```bash
  nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release -j 4 && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && nice -n 10 cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release -j 4 && rm -rf apps/web/src/wasm-formats && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm && pnpm install --frozen-lockfile && pnpm exec wasm-opt -Oz apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm -o apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm
  ```

## Review Focus

1. CLI qui envoie `opacity: 44.6`, `150`, `-1`, `NaN` ou une chaîne : arrondi à 45 ; `95` écrit **et relu** 95 ; `100` retire le champ ; sinon `BadStyle` code 1, rien d'écrit (cadrage déc. 15, arbitrage 0..100) → T2 `set_style_opacity_rounds`, `set_style_out_of_range_refused`.
2. `SetStyle` répété avec la même valeur, ou sur des ids qui n'admettent pas le champ (image + `roundness`) : aucune étape (D38) → T2 `set_style_noop_no_step`, `set_style_skips_inapplicable`.
3. Fichier ancien sans aucun champ d'aspect, rechargé et réenregistré : mêmes octets (DA-5) → T1 preuve `socle_fixture_resaves_identically` (`tests/compat_socle.rs:105`) et test `neutral_look_writes_no_key`.
4. Aperçu d'un rectangle Artiste puis relâché : même tracé (graine du geste) (déc. 12) → T8 `aperçu et objet posé : même empreinte`, T9 `seed tiré au début du geste`.
5. Clé `roomboard.style-courant` corrompue (JSON faux, largeur négative, couleur vide) : style par défaut, aucune exception (déc. 23) → T3 `parseItemStyle illisible`, T9 `style courant illisible : défaut`.

---

# Lot 1

<a id="tache-t1"></a>
### Tâche T1 — Cœur : `Look`, création et gomme

**Objectif** : le cœur lit et écrit les champs d'aspect du lot 1 (`strokeStyle`, `roughness`, `seed`, `roundness`, `opacity`) ;
`AddShape`, `CommitStroke`, `SetText` (boîte neuve) les écrivent dans la même transaction ; la gomme partielle les recopie.

**Fichiers** :
- Modifier : `crates/roomboard-core/src/element.rs` (`Look`, `look_fields`, `read_look` à côté de `style_fields`/`read_style` l. 305-320 ; `ElementView.look`, `bare()`).
- Modifier : `crates/roomboard-core/src/document.rs:346-395` (vues `stroke`, `shape`, `text` **et `image`** : `look`).
- Modifier : `crates/roomboard-core/src/commands.rs` (`look: Look` dans `CommitStroke`, `AddShape`, `SetText` ; `TextInput.look` ; écriture l. 880-900 ; `Cut.look` l. 567-574, 1286-1318).
- Modifier : toutes les constructions `Command::AddShape {`, `Command::CommitStroke {`, `Command::SetText {` (ajout `look: Look::default()`) : `src/commands.rs`, `src/copy.rs`, `src/document.rs`, `src/image.rs`, `src/zone.rs`, `src/table.rs`, `src/query.rs`, `src/rich_text.rs`, `src/format/mod.rs`, `tests/texte_riche.rs`, `tests/pot.rs`, `tests/pot_image.rs`, `tests/compat_c3.rs`, `tests/scenarios.rs`, `tests/compat_socle.rs`, `crates/roomboard-wasm/src/lib.rs` (constructions dans `*_inner` : `look: Look::default()` seulement ; le pont est à T4).
- Créer : `crates/roomboard-core/tests/look.rs`.

**Interfaces** :
- Consomme : `style_fields`, `read_style` (`element.rs:308,316`) ; `out_string`, `out_f64` ; `Cut` (`commands.rs:567`).
- Produit :
  - `pub struct Look { pub stroke_style: Option<String>, pub roughness: Option<u8>, pub seed: Option<u32>, pub roundness: Option<String>, pub opacity: Option<u8> }` (`opacity` : 0..=99 ; 100 n'est jamais gardé, c'est le neutre) (`#[derive(Debug, Clone, Default, PartialEq, serde::Serialize)]`, `#[serde(rename_all = "camelCase")]`, chaque champ `#[serde(skip_serializing_if = "Option::is_none")]`) ; `impl Look { pub fn is_neutral(&self) -> bool }`.
  - `pub(crate) fn look_fields(l: &Look) -> Vec<(&'static str, In)>` (seulement les champs non neutres).
  - `pub(crate) fn read_look<T: ReadTxn>(txn: &T, e: &MapRef) -> Look`.
  - `ElementView.look: Option<Look>` (`None` si neutre, omis du JSON).
  - `Command::CommitStroke { page, points, style, look: Look }`, `Command::AddShape { …, fill, look: Look }`, `Command::SetText { …, spans, look: Look }`.
- Réutilise : `crates/roomboard-core/src/element.rs:308,316` `style_fields`, `read_style` — `look_fields(&Look) -> Vec<(&str, In)>`, `read_look(txn, e) -> Look` à côté (étendre).
- Réutilise : `crates/roomboard-core/src/commands.rs:1286-1296,1318` (`Cut.group`) — `Cut.look: Look`, réécrit sur chaque morceau (étendre).
- Réutilise : `crates/roomboard-core/src/copy.rs:162-225` `extract`, `insert_fragment` — inchangés : ils recopient tous les champs, `look` compris (test `extract_keeps_look`).
- Rapport de tâche : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.

**Domaine lu** (déc. 24) : `strokeStyle` ∈ {`"dashed"`, `"dotted"`} ; `roughness` ∈ {1, 2} ; `seed` entier 0..2³²-1, lu seulement si `roughness` est lu ;
`roundness` = `"round"` ; `opacity` entier 0..100 (arbitrage ; 100 = neutre, jamais écrit, lu `None`). Toute autre valeur : champ lu `None`, la clé reste dans le `Y.Map`.

**Test et commande bornée** :
```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-2 && nice -n 10 cargo test -p roomboard-core -j 4 2>&1 | tail -25
```
Preuve : `test erase_partial_keeps_look ... ok`, `test image_look_read ... ok`, `test neutral_look_writes_no_key ... ok`, `test socle_fixture_resaves_identically ... ok` (garde des octets d'un fichier ancien, `tests/compat_socle.rs:105`), `test result: ok`, aucun `FAILED`, aucun `error[`.

**Contraintes** (recopiées) : G1 (rien de repris ici) ; G7 ; G8 ; G9 ; G10 ; G12. Essai CLI et contrat TS : T4/T5, pas ici.

**Interdits** : pas de `Any::Map` pour `look` ; pas de deuxième transaction dans `AddShape`/`CommitStroke`/`SetText` ; ne pas toucher `shape_polygon`, `query.rs` (hors constructions de test), `fill.rs` ; ne pas brancher le pont Wasm (T4).

**Terminé** : les 6 tests neufs passent, `socle_fixture_resaves_identically` reste vert ; `cargo test --workspace -j 4` vert ; `cargo clippy -p roomboard-core --all-targets -j 4 -- -D warnings` sans avertissement.

**Patron à ne pas reprendre** : `style_fields` renvoie un tableau fixe de 3 champs toujours écrits (`element.rs:308-314`) ; `look_fields` n'écrit **que** les champs non neutres, sinon un fichier ancien réenregistré change d'octets. Chemin de référence de la recopie : `crates/roomboard-core/src/commands.rs:1311-1316` (`group` recopié tel quel).

**Étapes** :

- [ ] 1. Écrire `crates/roomboard-core/tests/look.rs` (rouge) :
```rust
use roomboard_core::commands::Command;
use roomboard_core::element::{Look, StrokeStyle};
use roomboard_core::shape::ShapeKind;
use roomboard_core::{commands::EraseMode, document::Document};

fn pen() -> StrokeStyle { StrokeStyle { color: "#000000".into(), width: 4.0 } }
fn dashed() -> Look {
    Look { stroke_style: Some("dashed".into()), roughness: Some(1), seed: Some(7), roundness: Some("round".into()), opacity: Some(50) }
}
fn first_page(d: &Document) -> String { d.page_ids()[0].clone() }
fn blank() -> Document { Document::blank() } // Document::new() n'a aucune page (document.rs:135)

#[test]
fn add_shape_writes_look_in_one_step() {
    let mut d = blank();
    let page = first_page(&d);
    let c = d.apply(Command::AddShape { page, shape: ShapeKind::Rect, x0: 0.0, y0: 0.0, x1: 100.0, y1: 50.0, style: pen(), fill: None, look: dashed() }).unwrap();
    let el = d.element(&c.ids[0]).unwrap();
    assert_eq!(el.look, Some(dashed()));
    d.undo();
    assert!(d.element(&c.ids[0]).is_none(), "une seule étape");
}

#[test]
fn neutral_look_is_absent() {
    let mut d = blank();
    let page = first_page(&d);
    let c = d.apply(Command::AddShape { page, shape: ShapeKind::Rect, x0: 0.0, y0: 0.0, x1: 10.0, y1: 10.0, style: pen(), fill: None, look: Look::default() }).unwrap();
    let el = d.element(&c.ids[0]).unwrap();
    assert_eq!(el.look, None);
    assert!(!serde_json::to_string(&el).unwrap().contains("look"));
}

#[test]
fn neutral_look_writes_no_key() {
    let mut d = blank();
    let page = first_page(&d);
    let c = d.apply(Command::AddShape { page, shape: ShapeKind::Rect, x0: 0.0, y0: 0.0, x1: 10.0, y1: 10.0, style: pen(), fill: None, look: Look { opacity: Some(100), ..Look::default() } }).unwrap();
    for k in ["strokeStyle", "roughness", "seed", "roundness", "opacity"] {
        assert_eq!(d.raw_field_for_test(&c.ids[0], k), None, "{k} écrit alors qu'il est neutre");
    }
}

#[test]
fn image_look_read() {
    let mut d = blank();
    let id = add_test_image(&mut d); // reprends la construction d'image d'un test existant (src/image.rs ou tests/compat_c5.rs)
    d.set_raw_number_for_test(&id, "opacity", 40.0);
    assert_eq!(d.element(&id).unwrap().look, Some(Look { opacity: Some(40), ..Look::default() }));
}

#[test]
fn reencode_keeps_bytes_with_look() {
    let mut d = blank();
    let page = first_page(&d);
    d.apply(Command::AddShape { page: page.clone(), shape: ShapeKind::Rect, x0: 0.0, y0: 0.0, x1: 10.0, y1: 10.0, style: pen(), fill: None, look: dashed() }).unwrap();
    d.apply(Command::AddShape { page, shape: ShapeKind::Ellipse, x0: 0.0, y0: 0.0, x1: 10.0, y1: 10.0, style: pen(), fill: None, look: Look::default() }).unwrap();
    let a = d.encode_v1();
    let b = Document::from_update_v1(&a).unwrap().encode_v1();
    assert_eq!(a, b);
}

#[test]
fn erase_partial_keeps_look() {
    let mut d = blank();
    let page = first_page(&d);
    let look = Look { opacity: Some(40), ..Look::default() };
    let pts: Vec<f32> = (0..=20).flat_map(|i| [i as f32 * 10.0, 100.0, 0.5]).collect();
    d.apply(Command::CommitStroke { page: page.clone(), points: pts, style: pen(), look: look.clone() }).unwrap();
    let c = d.apply(Command::Erase { page, path: vec![100.0, 80.0, 100.0, 120.0], radius: 6.0, mode: EraseMode::Partial }).unwrap();
    assert!(c.ids.len() >= 2, "deux morceaux");
    for id in &c.ids { assert_eq!(d.element(id).unwrap().look, Some(look.clone())); }
}

#[test]
fn unreadable_value_is_neutral_and_kept() {
    let mut d = blank();
    let page = first_page(&d);
    let c = d.apply(Command::AddShape { page, shape: ShapeKind::Rect, x0: 0.0, y0: 0.0, x1: 10.0, y1: 10.0, style: pen(), fill: None, look: Look::default() }).unwrap();
    d.set_raw_field_for_test(&c.ids[0], "strokeStyle", "wavy");
    assert_eq!(d.element(&c.ids[0]).unwrap().look, None);
    let reloaded = Document::from_update_v1(&d.encode_v1()).unwrap();
    assert_eq!(reloaded.raw_field_for_test(&c.ids[0], "strokeStyle").as_deref(), Some("wavy"));
}
```
  Noms vérifiés : `Document::blank()` (une page, `document.rs:141`), `encode_v1` / `from_update_v1` (`document.rs:507,514`), `element_ids(page)` (`:332`), `version()`. `page_ids`, `undo`, `element` : forme exacte à relire dans `src/document.rs` (même assertion). `set_raw_field_for_test`, `set_raw_number_for_test`, `raw_field_for_test` : si une aide de test équivalente existe (`tests/element_inconnu.rs`), l'utiliser ; sinon ajouter dans `document.rs` trois fonctions `#[doc(hidden)] pub fn` sous `#[cfg(any(test, feature = "test-helpers"))]` qui posent une chaîne, posent un nombre, ou lisent une chaîne ou un nombre en texte (`Option<String>`) dans le `Y.Map` de l'élément. `add_test_image` : aide locale à `tests/look.rs` copiée de la construction d'image d'un test existant.
- [ ] 2. `nice -n 10 cargo test -p roomboard-core --test look -j 4 2>&1 | tail -15` → attendu : `error[E0560]` (champ `look` inconnu).
- [ ] 3. `element.rs`, après `read_style` :
```rust
/// Aspect facultatif (OG11, déc. 24) ; noms d'Excalidraw ; absent = neutre, jamais écrit neutre (D25, DA-5).
#[derive(Debug, Clone, Default, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Look {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stroke_style: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub roughness: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seed: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub roundness: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub opacity: Option<u8>,
}

pub const STROKE_STYLES: [&str; 2] = ["dashed", "dotted"];

impl Look {
    pub fn is_neutral(&self) -> bool { *self == Look::default() }
    /// Valeurs lisibles seulement : une valeur hors domaine devient `None` (lue neutre, gardée dans le `Y.Map`).
    pub fn sanitized(&self) -> Look {
        let roughness = self.roughness.filter(|r| (1..=2).contains(r));
        Look {
            stroke_style: self.stroke_style.clone().filter(|s| STROKE_STYLES.contains(&s.as_str())),
            roughness,
            seed: self.seed.filter(|_| roughness.is_some()),
            roundness: self.roundness.clone().filter(|s| s == "round"),
            opacity: self.opacity.filter(|o| *o < 100), // 100 = neutre (arbitrage 0..100)
        }
    }
}

pub(crate) fn look_fields(l: &Look) -> Vec<(&'static str, In)> {
    let l = l.sanitized();
    let mut v = Vec::new();
    if let Some(s) = &l.stroke_style { v.push(("strokeStyle", In::from(s.as_str()))); }
    if let Some(r) = l.roughness { v.push(("roughness", In::Any(Any::from(f64::from(r))))); }
    if let Some(s) = l.seed { v.push(("seed", In::Any(Any::from(f64::from(s))))); }
    if let Some(s) = &l.roundness { v.push(("roundness", In::from(s.as_str()))); }
    if let Some(o) = l.opacity { v.push(("opacity", In::Any(Any::from(f64::from(o))))); }
    v
}

fn out_small_int(v: Option<Out>, max: f64) -> Option<f64> {
    out_f64(v).filter(|x| x.is_finite() && x.fract() == 0.0 && *x >= 0.0 && *x <= max)
}

pub(crate) fn read_look<T: ReadTxn>(txn: &T, e: &MapRef) -> Look {
    Look {
        stroke_style: out_string(e.get(txn, "strokeStyle")),
        roughness: out_small_int(e.get(txn, "roughness"), 2.0).map(|x| x as u8),
        seed: out_small_int(e.get(txn, "seed"), f64::from(u32::MAX)).map(|x| x as u32),
        roundness: out_string(e.get(txn, "roundness")),
        opacity: out_small_int(e.get(txn, "opacity"), 100.0).map(|x| x as u8), // 100 lu puis rendu neutre par sanitized
    }
    .sanitized()
}
```
  Puis `ElementView.look: Option<Look>` (`#[serde(skip_serializing_if = "Option::is_none")]`), `look: None` dans `bare()`.
- [ ] 4. `document.rs` : dans les branches `stroke`, `shape`, `text` **et `image`** de `Document::element`, `let l = read_look(&txn, &e); v.look = (!l.is_neutral()).then_some(l);`.
- [ ] 5. `commands.rs` : ajouter `look: Look` aux trois variantes ; `apply` le passe (`self.cmd_commit_stroke(&page, &points, &style, &look)`, `cmd_add_shape(…, fill.as_deref(), &look)`, `TextInput { …, look: &look }`) ; dans chaque constructeur de champs, `fields.extend(look_fields(look));` avant l'insertion (même `transact_local`). `SetText` avec un `id` existant : `look` ignoré (le style passe par `SetStyle`, T2). Pour le trait : `stroke_prelim` reçoit `look: &Look` et fait `for (k, v) in look_fields(look) { prelim.insert(k.into(), v); }`.
- [ ] 6. Gomme : `struct Cut { …, look: Look }`, rempli par `look: read_look(&txn, &e)` à côté de `group` ; `stroke_prelim(&id, &cut.transform, &cut.style, piece, &cut.look)`.
- [ ] 7. Ajouter `look: Look::default()` à chaque construction listée (repérage : `grep -rn "Command::AddShape {\|Command::CommitStroke {\|Command::SetText {" crates/`), y compris dans `crates/roomboard-wasm/src/lib.rs` (`commit_stroke_inner`, `add_shape_inner`, `set_text_inner`) avec `use roomboard_core::element::Look;`.
- [ ] 8. Ajouter dans `tests/look.rs` :
```rust
#[test]
fn extract_keeps_look() {
    let mut d = blank();
    let page = first_page(&d);
    let c = d.apply(Command::AddShape { page: page.clone(), shape: ShapeKind::Rect, x0: 0.0, y0: 0.0, x1: 10.0, y1: 10.0, style: pen(), fill: None, look: dashed() }).unwrap();
    let frag = d.extract(&page, &c.ids).unwrap();
    let ins = d.insert_fragment(&frag, &page, 10.0, 10.0).unwrap();
    assert_eq!(d.element(&ins.ids[0]).unwrap().look, Some(dashed()));
}
```
- [ ] 9. `nice -n 10 cargo test -p roomboard-core -j 4 2>&1 | tail -25` (dont `socle_fixture_resaves_identically`) puis `nice -n 10 cargo test --workspace -j 4 2>&1 | tail -10` et `nice -n 10 cargo clippy --workspace --all-targets -j 4 -- -D warnings 2>&1 | tail -5` → verts.
- [ ] 10. Commit (fichiers un par un) :
```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-2 && git add crates/roomboard-core/src/element.rs && git add crates/roomboard-core/src/document.rs && git add crates/roomboard-core/src/commands.rs && git add crates/roomboard-core/tests/look.rs   # puis chaque autre fichier modifié, un par un (git status)
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(core): optional look fields on shapes, strokes and text

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t2"></a>
### Tâche T2 — Cœur : `SetStyle` et `set_or_remove`

**Objectif** : `SetStyle { ids, patch }` change couleur, largeur, fond et aspect des éléments qui les admettent, en une étape,
sans étape si rien ne change, `BadStyle` si une valeur est hors domaine ; l'écriture « poser ou retirer » de `cmd_fill` devient une aide commune.

**Fichiers** : créer `crates/roomboard-core/src/style.rs` ; modifier `src/lib.rs` (`pub mod style;`), `src/fill.rs:112-130`, `src/commands.rs` (variante, `CommandError::BadStyle`, `Display`, `apply`), `tests/look.rs`.

**Interfaces** :
- Consomme (T1) : `Look`, `look_fields`, `read_look`, `STROKE_STYLES`.
- Produit :
  - `#[derive(Debug, Clone, Default, PartialEq)] pub struct StylePatch { pub color: Option<String>, pub width: Option<f32>, pub fill: Option<Option<String>>, pub stroke_style: Option<Option<String>>, pub roughness: Option<u8>, pub roundness: Option<Option<String>>, pub opacity: Option<f64> }` — `None` : champ non touché ; `Some(None)` : retrait (neutre). `roughness: Some(0)` retire `roughness` et `seed` ; `opacity: Some(100.0)` retire `opacity`.
  - `Command::SetStyle { ids: Vec<String>, patch: StylePatch }` ; `CommandError::BadStyle` (message `"style invalide"`).
  - `pub(crate) fn set_or_remove(map: &MapRef, txn: &mut TransactionMut, key: &str, v: Option<In>) -> bool` (vrai si la valeur a changé ; compare à la valeur lue dans la même transaction).
  - `Document::cmd_set_style(&mut self, ids: &[String], patch: &StylePatch, new_seed: impl FnMut() -> u32) -> Result<Change, CommandError>` (la graine neuve est tirée par `new_seed` quand `roughness` change vers 1 ou 2 ; `apply` passe `|| rand_u32()` fondé sur `yrs::uuid_v4()` — 4 premiers octets).
- Réutilise : `crates/roomboard-core/src/fill.rs:112-130` (corps de `cmd_fill`) — `set_or_remove(map: &MapRef, txn: &mut TransactionMut, key: &str, v: Option<In>) -> bool`, appelée par `cmd_fill` et `cmd_set_style` (étendre, extraire).
- Rapport de tâche : `Réutilisation : appelé fill.rs set_or_remove` ou `Réutilisation : écart — <pourquoi>`.

**Applicabilité** (DA-1, déc. 25) : `color`, `width` → `stroke`, `shape` ; `color` → `text` aussi ; `fill` → `shape` rect/ellipse ; `stroke_style`, `roughness` → `shape` ; `roundness` → `shape` rect ; `opacity` → `stroke`, `shape`, `text`, `image`. Un champ inapplicable est sauté sans erreur.
**Validation, avant toute écriture** : couleur par `crate::rich_text::valid_color` ; `width` fini > 0 ; `stroke_style` dans `STROKE_STYLES` ; `roughness` ≤ 2 ; `roundness` = `"round"` ; `opacity` finie dans [0, 100], arrondie (`f64::round`) ; un id inconnu → `UnknownElement`. Sinon `BadStyle`.

**Test et commande bornée** :
```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-2 && nice -n 10 cargo test -p roomboard-core --test look -j 4 2>&1 | tail -20 && nice -n 10 cargo test -p roomboard-core -j 4 pot 2>&1 | tail -5
```
Preuve : ≥ 11 tests dans `look` (5 de T1 + 6 ici), `set_style_noop_no_step ... ok`, `set_style_opacity_rounds ... ok` ; tests du pot (`tests/pot.rs`, `pot_image.rs`) verts (ils gardent `cmd_fill`).

**Contraintes** : G7 ; G8 ; G9 ; G12.

**Interdits** : pas de transaction ouverte avant de savoir si quelque chose change (le patron écarté de `SetText`, `commands.rs:2402`) ; une seule transaction pour tous les ids ; ne pas modifier le comportement de `cmd_fill`.

**Terminé** : tests verts, `cargo clippy -p roomboard-core --all-targets -j 4 -- -D warnings` propre, `cargo test --workspace -j 4` vert.

**Patron à ne pas reprendre** : lecture puis écriture en deux transactions comme `fill.rs:104-122` peut écrire une étape vide ; ici, calculer d'abord la liste `(map, key, Option<In>)` des écritures **effectives** dans une transaction de lecture, retourner `self.unchanged()` si elle est vide, puis ouvrir une seule `transact_local`. Référence : `crates/roomboard-core/src/fill.rs:104-131`.

**Étapes** :

- [ ] 1. Ajouter à `tests/look.rs` (rouge) :
```rust
use roomboard_core::style::StylePatch;
use roomboard_core::commands::CommandError;

fn rect(d: &mut Document, look: Look) -> String {
    let page = first_page(d);
    d.apply(Command::AddShape { page, shape: ShapeKind::Rect, x0: 0.0, y0: 0.0, x1: 10.0, y1: 10.0, style: pen(), fill: None, look }).unwrap().ids[0].clone()
}

#[test]
fn set_style_one_step() {
    let mut d = blank();
    let a = rect(&mut d, Look::default());
    let b = rect(&mut d, Look::default());
    let p = StylePatch { color: Some("#1d4ed8".into()), stroke_style: Some(Some("dashed".into())), ..Default::default() };
    d.apply(Command::SetStyle { ids: vec![a.clone(), b.clone()], patch: p }).unwrap();
    assert_eq!(d.element(&b).unwrap().style.unwrap().color, "#1d4ed8");
    assert_eq!(d.element(&a).unwrap().look.unwrap().stroke_style.as_deref(), Some("dashed"));
    d.undo();
    assert_eq!(d.element(&a).unwrap().style.unwrap().color, "#000000");
    assert_eq!(d.element(&a).unwrap().look, None);
}

#[test]
fn set_style_noop_no_step() {
    let mut d = blank();
    let a = rect(&mut d, dashed());
    let v = d.version();
    let c = d.apply(Command::SetStyle { ids: vec![a], patch: StylePatch { stroke_style: Some(Some("dashed".into())), ..Default::default() } }).unwrap();
    assert!(c.ids.is_empty());
    assert_eq!(d.version(), v);
}

#[test]
fn set_style_opacity_rounds() {
    let mut d = blank();
    let a = rect(&mut d, Look::default());
    d.apply(Command::SetStyle { ids: vec![a.clone()], patch: StylePatch { opacity: Some(44.6), ..Default::default() } }).unwrap();
    assert_eq!(d.element(&a).unwrap().look.unwrap().opacity, Some(45));
    d.apply(Command::SetStyle { ids: vec![a.clone()], patch: StylePatch { opacity: Some(95.0), ..Default::default() } }).unwrap();
    assert_eq!(d.element(&a).unwrap().look.unwrap().opacity, Some(95), "95 écrit et relu (0..100)");
    d.apply(Command::SetStyle { ids: vec![a.clone()], patch: StylePatch { opacity: Some(100.0), ..Default::default() } }).unwrap();
    assert_eq!(d.element(&a).unwrap().look, None, "100 retire le champ");
}

#[test]
fn set_style_out_of_range_refused() {
    let mut d = blank();
    let a = rect(&mut d, Look::default());
    for bad in [150.0, -1.0, f64::NAN] {
        let r = d.apply(Command::SetStyle { ids: vec![a.clone()], patch: StylePatch { opacity: Some(bad), ..Default::default() } });
        assert_eq!(r, Err(CommandError::BadStyle));
    }
    let r = d.apply(Command::SetStyle { ids: vec![a.clone()], patch: StylePatch { stroke_style: Some(Some("wavy".into())), ..Default::default() } });
    assert_eq!(r, Err(CommandError::BadStyle));
    assert_eq!(d.element(&a).unwrap().look, None, "rien d'écrit");
}

#[test]
fn set_style_skips_inapplicable() {
    let mut d = blank();
    let page = first_page(&d);
    let e = d.apply(Command::AddShape { page, shape: ShapeKind::Ellipse, x0: 0.0, y0: 0.0, x1: 10.0, y1: 10.0, style: pen(), fill: None, look: Look::default() }).unwrap().ids[0].clone();
    let v = d.version();
    let c = d.apply(Command::SetStyle { ids: vec![e], patch: StylePatch { roundness: Some(Some("round".into())), ..Default::default() } }).unwrap();
    assert!(c.ids.is_empty());
    assert_eq!(d.version(), v);
}

#[test]
fn set_style_roughness_draws_seed() {
    let mut d = blank();
    let a = rect(&mut d, Look::default());
    d.apply(Command::SetStyle { ids: vec![a.clone()], patch: StylePatch { roughness: Some(2), ..Default::default() } }).unwrap();
    let l = d.element(&a).unwrap().look.unwrap();
    assert_eq!(l.roughness, Some(2));
    assert!(l.seed.is_some());
    d.apply(Command::SetStyle { ids: vec![a.clone()], patch: StylePatch { roughness: Some(0), ..Default::default() } }).unwrap();
    assert_eq!(d.element(&a).unwrap().look, None, "0 retire roughness et seed");
}
```
  (`d.version()` : prendre l'accesseur de version du document tel qu'il existe ; sinon comparer `Change.version`.)
- [ ] 2. `nice -n 10 cargo test -p roomboard-core --test look -j 4 2>&1 | tail -10` → attendu : `unresolved import roomboard_core::style`.
- [ ] 3. `fill.rs` : extraire
```rust
/// Pose `v` sous `key` (ou retire la clé si `None`) ; faux si la valeur lue est déjà celle-là (aucune écriture, D38).
pub(crate) fn set_or_remove(map: &MapRef, txn: &mut TransactionMut, key: &str, v: Option<In>) -> bool {
    let current = map.get(txn, key);
    match (current, v) {
        (None, None) => false,
        (Some(_), None) => { map.remove(txn, key); true }
        (cur, Some(next)) => {
            if cur.as_ref().is_some_and(|c| same_value(c, &next)) { return false; }
            map.insert(txn, key, next);
            true
        }
    }
}

fn same_value(cur: &Out, next: &In) -> bool {
    // Un seul bras : `Any::String` est un `Any` (le bras dédié serait inaccessible, clippy -D warnings).
    matches!((cur, next), (Out::Any(a), In::Any(b)) if a == b)
}
```
  et dans `cmd_fill`, remplacer le bloc `match &value { … }` par `set_or_remove(&map, &mut txn, key, value.as_deref().map(In::from));` (la comparaison `current == value` en amont reste : elle garde le « aucune étape »). Vérifie que `In::from(&str)` donne `In::Any(Any::String)` (yrs) ; sinon adapter `same_value`.
- [ ] 4. Créer `style.rs` :
```rust
//! OG11 (déc. 25, DA-5) : `SetStyle` — un patch de style appliqué aux éléments qui admettent chaque champ, en une étape.
use yrs::{Any, In, MapRef, Out, ReadTxn};

use crate::commands::{Change, CommandError};
use crate::document::Document;
use crate::element::{out_string, STROKE_STYLES};
use crate::fill::set_or_remove;
use crate::rich_text::valid_color; // `fill.rs:15` l'importe en privé

#[derive(Debug, Clone, Default, PartialEq)]
pub struct StylePatch {
    pub color: Option<String>,
    pub width: Option<f32>,
    pub fill: Option<Option<String>>,
    pub stroke_style: Option<Option<String>>,
    pub roughness: Option<u8>,
    pub roundness: Option<Option<String>>,
    pub opacity: Option<f64>,
}

impl StylePatch {
    fn validate(&self) -> Result<Option<u8>, CommandError> {
        let bad = Err(CommandError::BadStyle);
        if self.color.as_deref().is_some_and(|c| !valid_color(c)) { return bad; }
        if self.width.is_some_and(|w| !(w.is_finite() && w > 0.0)) { return bad; }
        if matches!(&self.fill, Some(Some(c)) if !valid_color(c)) { return bad; }
        if matches!(&self.stroke_style, Some(Some(s)) if !STROKE_STYLES.contains(&s.as_str())) { return bad; }
        if self.roughness.is_some_and(|r| r > 2) { return bad; }
        if matches!(&self.roundness, Some(Some(s)) if s != "round") { return bad; }
        match self.opacity {
            None => Ok(None),
            Some(o) if o.is_finite() && (0.0..=100.0).contains(&o) => Ok(Some(o.round() as u8)),
            Some(_) => bad,
        }
    }
}

fn num(x: f64) -> In { In::Any(Any::from(x)) }
fn text(s: &str) -> In { In::from(s) }

/// Écritures du patch pour un élément de genre `kind` (forme `shape`) ; champs inapplicables sautés.
fn writes_for(kind: &str, shape: Option<&str>, p: &StylePatch, opacity: Option<u8>, seed: u32) -> Vec<(&'static str, Option<In>)> {
    let is_shape = kind == "shape";
    let closed = matches!(shape, Some("rect") | Some("ellipse"));
    let mut w = Vec::new();
    if let Some(c) = &p.color { if matches!(kind, "stroke" | "shape" | "text") { w.push(("color", Some(text(c)))); } }
    if let Some(x) = p.width { if matches!(kind, "stroke" | "shape") { w.push(("width", Some(num(f64::from(x))))); } }
    if let Some(f) = &p.fill { if is_shape && closed { w.push(("fill", f.as_deref().map(text))); } }
    if let Some(s) = &p.stroke_style { if is_shape { w.push(("strokeStyle", s.as_deref().map(text))); } }
    if let Some(r) = p.roughness {
        if is_shape {
            if r == 0 { w.push(("roughness", None)); w.push(("seed", None)); }
            else { w.push(("roughness", Some(num(f64::from(r))))); w.push(("seed", Some(num(f64::from(seed))))); }
        }
    }
    if let Some(s) = &p.roundness { if is_shape && shape == Some("rect") { w.push(("roundness", s.as_deref().map(text))); } }
    if let Some(o) = opacity { if matches!(kind, "stroke" | "shape" | "text" | "image") { w.push(("opacity", (o < 100).then(|| num(f64::from(o))))); } }
    w
}

impl Document {
    pub(crate) fn cmd_set_style(&mut self, ids: &[String], patch: &StylePatch, mut new_seed: impl FnMut() -> u32) -> Result<Change, CommandError> {
        let opacity = patch.validate()?;
        // 1. Lecture : écritures effectives seulement (aucune transaction d'écriture si rien ne change).
        let mut plan: Vec<(MapRef, &'static str, Option<In>)> = Vec::new();
        let mut pages: Vec<String> = Vec::new();
        let mut touched: Vec<String> = Vec::new();
        {
            let txn = self.read();
            for id in ids {
                let found = self.find_element(&txn, id).ok_or_else(|| CommandError::UnknownElement(id.clone()))?;
                let e = found.element;
                let kind = out_string(e.get(&txn, "kind")).unwrap_or_default();
                let shape = out_string(e.get(&txn, "shape"));
                // Graine : neuve seulement si le niveau change (actionProperties.tsx:783).
                let same_rough = patch.roughness.is_some_and(|r| crate::element::out_f64(e.get(&txn, "roughness")) == Some(f64::from(r)));
                let seed = if same_rough { crate::element::out_f64(e.get(&txn, "seed")).map(|s| s as u32).unwrap_or_else(&mut new_seed) } else { new_seed() };
                let mut any = false;
                for (key, v) in writes_for(&kind, shape.as_deref(), patch, opacity, seed) {
                    if same_rough && key == "seed" { continue; }
                    if !differs(&txn, &e, key, v.as_ref()) { continue; }
                    plan.push((e.clone(), key, v));
                    any = true;
                }
                if any {
                    touched.push(id.clone());
                    if !pages.contains(&found.page_id) { pages.push(found.page_id.clone()); }
                }
            }
        }
        if plan.is_empty() { return Ok(self.unchanged()); }
        // 2. Écriture : une transaction, une étape.
        {
            let mut txn = self.transact_local();
            for (map, key, v) in plan { set_or_remove(&map, &mut txn, key, v); }
        }
        Ok(self.done(Change { pages, ids: touched, ..Default::default() }))
    }
}

fn differs<T: ReadTxn>(txn: &T, e: &MapRef, key: &str, v: Option<&In>) -> bool {
    match (e.get(txn, key), v) {
        (None, None) => false,
        (Some(Out::Any(a)), Some(In::Any(b))) => a != *b,
        _ => true,
    }
}
```
  Rends `out_string`, `out_f64`, `valid_color`, `find_element`, `read`, `transact_local`, `unchanged`, `done` visibles en `pub(crate)` s'ils ne le sont pas (sans changer leur corps).
- [ ] 5. `commands.rs` : `SetStyle { ids: Vec<String>, patch: crate::style::StylePatch }`, `CommandError::BadStyle` (+ `Display` : `"style invalide"`), `Command::SetStyle { ids, patch } => self.cmd_set_style(&ids, &patch, || { let u = yrs::uuid_v4(); let b = u.as_bytes(); u32::from_le_bytes([b[0], b[1], b[2], b[3]]) })` — adapte l'accès aux octets à ce que `uuid_v4()` renvoie (`Arc<str>` : prends `fnv1a` des octets de la chaîne).
- [ ] 6. `nice -n 10 cargo test -p roomboard-core -j 4 2>&1 | tail -20` → vert ; clippy `-D warnings` propre.
- [ ] 7. Commit : `git add crates/roomboard-core/src/style.rs`, puis `src/lib.rs`, `src/fill.rs`, `src/commands.rs`, `tests/look.rs`, un par un ; message `feat(core): SetStyle command with shared set_or_remove helper` + ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, auteur G8.

<a id="tache-t3"></a>
### Tâche T3 — Contrat TS : `Look`, `ItemStyle`

**Objectif** : les types TS de l'aspect et du style courant, avec leurs lecteurs défensifs, pour que l'interface, le rendu et le moteur partent en parallèle.

**Fichiers** : créer `apps/web/src/core/look.ts`, `apps/web/src/core/look.test.ts`, `apps/web/src/engine/item-style.ts`, `apps/web/src/engine/item-style.test.ts` ; modifier `apps/web/src/core/api.ts` (`ElementBase.look?`, réexport).

**Interfaces** :
- Produit (`core/look.ts`) :
```ts
export type StrokeKind = "solid" | "dashed" | "dotted";
export type Roughness = 0 | 1 | 2;
export type Roundness = "sharp" | "round";
/** Vue du cœur (champs absents = neutres), noms d'Excalidraw. */
export interface Look {
  readonly strokeStyle?: "dashed" | "dotted";
  readonly roughness?: 1 | 2;
  readonly seed?: number;
  readonly roundness?: "round";
  readonly opacity?: number;
}
export interface LookPatch {
  readonly color?: string;
  readonly width?: number;
  readonly fill?: string | null;
  readonly strokeStyle?: "dashed" | "dotted" | null;
  readonly roughness?: Roughness;
  readonly roundness?: "round" | null;
  readonly opacity?: number;
}
export const NEUTRAL_LOOK: Look;
export function toLook(v: unknown): Look | undefined;      // lecture défensive d'un objet venu du cœur
export function strokeKindOf(l: Look | undefined): StrokeKind;
export function roughnessOf(l: Look | undefined): Roughness;
export function roundnessOf(l: Look | undefined): Roundness;
export function opacityOf(l: Look | undefined): number;    // 0..100, 100 si absent
export function lookFrom(s: { strokeStyle: StrokeKind; roughness: Roughness; roundness: Roundness; opacity: number }, seed: number | null): Look | undefined; // undefined si neutre
```
- Produit (`engine/item-style.ts`) :
```ts
export interface ItemStyle {
  readonly color: string;
  readonly width: number;
  readonly background: string | null;
  readonly strokeStyle: StrokeKind;
  readonly roughness: Roughness;
  readonly roundness: Roundness;
  readonly opacity: number;
}
export const DEFAULT_ITEM_STYLE: ItemStyle; // { color "#000000", width 4, background null, "solid", 0, "sharp", 100 }
export function parseItemStyle(raw: string | null): ItemStyle | null;
export function mergeItemStyle(s: ItemStyle, patch: Partial<ItemStyle>): ItemStyle; // champs invalides ignorés
```
- `api.ts` : `interface ElementBase { …; readonly look?: Look }` et `export type { Look, LookPatch } from "./look";`.
- Réutilise : aucun module de la liste (types neufs ; `StrokeStyle` d'`api.ts:23` est étendu structurellement par `ItemStyle`).
- Rapport : `Réutilisation : écart — types neufs, aucun module de la liste concerné`.

**Test et commande bornée** :
```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-2/apps/web && nice -n 10 pnpm exec vitest run src/core/look.test.ts src/engine/item-style.test.ts 2>&1 | tail -15
```
Preuve : `Tests  N passed`, N ≥ 8, fichiers `look.test.ts` et `item-style.test.ts` listés ; aucun `FAIL `.

**Contraintes** : G8 ; G9 ; G12 (absent = neutre).

**Interdits** : ne pas ajouter `SetStyle` à l'union `Command` (T4 : sinon `wasm-core.ts` et la CLI cassent `tsc`) ; ne pas toucher `wasm-core.ts`, `fake-core.ts`.

**Terminé** : tests verts ; `pnpm --filter @roomboard/web exec tsc --noEmit` code 0.

**Étapes** :
- [ ] 1. `core/look.test.ts` (rouge) :
```ts
import { describe, expect, it } from "vitest";
import { lookFrom, opacityOf, roughnessOf, strokeKindOf, toLook } from "./look";

describe("look", () => {
  it("toLook : absent ou vide → undefined", () => {
    expect(toLook(undefined)).toBeUndefined();
    expect(toLook({})).toBeUndefined();
  });
  it("toLook : valeurs lisibles gardées, illisibles neutres", () => {
    expect(toLook({ strokeStyle: "dashed", roughness: 1, seed: 7, roundness: "round", opacity: 50 })).toEqual({ strokeStyle: "dashed", roughness: 1, seed: 7, roundness: "round", opacity: 50 });
    expect(toLook({ strokeStyle: "wavy", opacity: 150 })).toBeUndefined();
    expect(toLook({ opacity: 95 })).toEqual({ opacity: 95 });
    expect(toLook({ opacity: 100 })).toBeUndefined();
  });
  it("lecteurs : défauts", () => {
    expect(strokeKindOf(undefined)).toBe("solid");
    expect(roughnessOf(undefined)).toBe(0);
    expect(opacityOf(undefined)).toBe(100);
  });
  it("lookFrom : neutre → undefined ; graine seulement avec roughness", () => {
    expect(lookFrom({ strokeStyle: "solid", roughness: 0, roundness: "sharp", opacity: 100 }, 9)).toBeUndefined();
    expect(lookFrom({ strokeStyle: "solid", roughness: 1, roundness: "sharp", opacity: 100 }, 9)).toEqual({ roughness: 1, seed: 9 });
  });
});
```
- [ ] 2. `engine/item-style.test.ts` (rouge) :
```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_ITEM_STYLE, mergeItemStyle, parseItemStyle } from "./item-style";

describe("item-style", () => {
  it("parseItemStyle : aller-retour", () => {
    const s = { ...DEFAULT_ITEM_STYLE, color: "#1d4ed8", strokeStyle: "dashed" as const, opacity: 50 };
    expect(parseItemStyle(JSON.stringify(s))).toEqual(s);
  });
  it("parseItemStyle illisible : null", () => {
    expect(parseItemStyle(null)).toBeNull();
    expect(parseItemStyle("{")).toBeNull();
    expect(parseItemStyle(JSON.stringify({ ...DEFAULT_ITEM_STYLE, width: -1 }))).toBeNull();
    expect(parseItemStyle(JSON.stringify({ ...DEFAULT_ITEM_STYLE, color: "" }))).toBeNull();
  });
  it("mergeItemStyle ignore une valeur invalide", () => {
    expect(mergeItemStyle(DEFAULT_ITEM_STYLE, { opacity: 150 }).opacity).toBe(100);
    expect(mergeItemStyle(DEFAULT_ITEM_STYLE, { opacity: 40 }).opacity).toBe(40);
  });
  it("défaut : Architecte, Droits, plein, opaque", () => {
    expect(DEFAULT_ITEM_STYLE).toEqual({ color: "#000000", width: 4, background: null, strokeStyle: "solid", roughness: 0, roundness: "sharp", opacity: 100 });
  });
});
```
- [ ] 3. Lancer la commande → `FAIL` (modules absents).
- [ ] 4. `core/look.ts` :
```ts
// OG11 (déc. 24) : aspect facultatif d'un élément, noms d'Excalidraw (MIT) ; absent = neutre.
export type StrokeKind = "solid" | "dashed" | "dotted";
export type Roughness = 0 | 1 | 2;
export type Roundness = "sharp" | "round";
export interface Look {
  readonly strokeStyle?: "dashed" | "dotted";
  readonly roughness?: 1 | 2;
  readonly seed?: number;
  readonly roundness?: "round";
  readonly opacity?: number;
}
export interface LookPatch {
  readonly color?: string;
  readonly width?: number;
  readonly fill?: string | null;
  readonly strokeStyle?: "dashed" | "dotted" | null;
  readonly roughness?: Roughness;
  readonly roundness?: "round" | null;
  readonly opacity?: number;
}
export const NEUTRAL_LOOK: Look = Object.freeze({});
const isRec = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const int = (v: unknown, max: number): number | undefined =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max ? v : undefined;

export function toLook(v: unknown): Look | undefined {
  if (!isRec(v)) return undefined;
  const out: { -readonly [K in keyof Look]: Look[K] } = {};
  if (v["strokeStyle"] === "dashed" || v["strokeStyle"] === "dotted") out.strokeStyle = v["strokeStyle"];
  const r = int(v["roughness"], 2);
  if (r === 1 || r === 2) {
    out.roughness = r;
    const s = int(v["seed"], 0xffffffff);
    if (s !== undefined) out.seed = s;
  }
  if (v["roundness"] === "round") out.roundness = "round";
  const o = int(v["opacity"], 100);
  if (o !== undefined && o < 100) out.opacity = o; // 0..100, 100 = neutre (arbitrage)
  return Object.keys(out).length === 0 ? undefined : out;
}
export const strokeKindOf = (l: Look | undefined): StrokeKind => l?.strokeStyle ?? "solid";
export const roughnessOf = (l: Look | undefined): Roughness => l?.roughness ?? 0;
export const roundnessOf = (l: Look | undefined): Roundness => l?.roundness ?? "sharp";
export const opacityOf = (l: Look | undefined): number => l?.opacity ?? 100;

export function lookFrom(s: { strokeStyle: StrokeKind; roughness: Roughness; roundness: Roundness; opacity: number }, seed: number | null): Look | undefined {
  const out: { -readonly [K in keyof Look]: Look[K] } = {};
  if (s.strokeStyle !== "solid") out.strokeStyle = s.strokeStyle;
  if (s.roughness !== 0) {
    out.roughness = s.roughness;
    if (seed !== null) out.seed = seed >>> 0;
  }
  if (s.roundness === "round") out.roundness = "round";
  if (s.opacity < 100) out.opacity = Math.max(0, Math.round(s.opacity));
  return Object.keys(out).length === 0 ? undefined : out;
}
```
- [ ] 5. `engine/item-style.ts` :
```ts
// OG11 (déc. 23) : style courant commun à tous les outils (currentItem* d'Excalidraw), gardé sur l'appareil.
import type { Roughness, Roundness, StrokeKind } from "../core/look";

export interface ItemStyle {
  readonly color: string;
  readonly width: number;
  readonly background: string | null;
  readonly strokeStyle: StrokeKind;
  readonly roughness: Roughness;
  readonly roundness: Roundness;
  readonly opacity: number;
}
export const DEFAULT_ITEM_STYLE: ItemStyle = Object.freeze({
  color: "#000000", width: 4, background: null, strokeStyle: "solid", roughness: 0, roundness: "sharp", opacity: 100,
});
const KINDS: readonly string[] = ["solid", "dashed", "dotted"];
const ok: { readonly [K in keyof ItemStyle]: (v: unknown) => boolean } = {
  color: (v) => typeof v === "string" && v !== "",
  width: (v) => typeof v === "number" && Number.isFinite(v) && v > 0,
  background: (v) => v === null || (typeof v === "string" && v !== ""),
  strokeStyle: (v) => typeof v === "string" && KINDS.includes(v),
  roughness: (v) => v === 0 || v === 1 || v === 2,
  roundness: (v) => v === "sharp" || v === "round",
  opacity: (v) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 100,
};
const KEYS = Object.keys(ok) as (keyof ItemStyle)[];

export function parseItemStyle(raw: string | null): ItemStyle | null {
  if (raw === null) return null;
  let v: unknown;
  try { v = JSON.parse(raw); } catch { return null; }
  if (typeof v !== "object" || v === null) return null;
  const r = v as Record<string, unknown>;
  if (!KEYS.every((k) => ok[k](r[k]))) return null;
  return Object.freeze(Object.fromEntries(KEYS.map((k) => [k, r[k]]))) as unknown as ItemStyle;
}
export function mergeItemStyle(s: ItemStyle, patch: Partial<ItemStyle>): ItemStyle {
  const next: Record<string, unknown> = { ...s };
  for (const k of KEYS) if (k in patch && ok[k](patch[k])) next[k] = patch[k];
  return Object.freeze(next) as unknown as ItemStyle;
}
```
- [ ] 6. `api.ts` : `import type { Look } from "./look";`, `export type { Look, LookPatch } from "./look";`, `readonly look?: Look;` dans `ElementBase`.
- [ ] 7. Commande bornée → verte ; `nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -5` code 0.
- [ ] 8. Commit des 5 fichiers un par un : `feat(web): look and item style contract` + ligne Co-Authored-By, auteur G8.

<a id="tache-t4"></a>
### Tâche T4 — Pont Wasm, API, faux cœur

**Objectif** : `SetStyle` et `look` des créations traversent le pont Wasm ; le faux cœur se comporte à l'identique (contrat joué sur les deux), gomme partielle comprise.

**Fichiers** : `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/api.ts`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/fake-core.ts`, `apps/web/src/core/fake-core.test.ts`, `apps/web/src/core/wasm-core.contract.test.ts` (contrat joué sur les deux cœurs), `apps/cli/src/ops.ts` (ligne `"SetStyle"` de `COMMAND_TYPES` seule : sinon `ALL_COMMANDS`, `ops.ts:17-19`, casse le `tsc` de la CLI pendant V4).

**Interfaces** :
- Consomme : T2 `Command::SetStyle`, `StylePatch` ; T1 `Look` ; T3 `Look`, `LookPatch`, `toLook`.
- Produit :
  - `api.ts` : `Command` gagne `| { readonly type: "SetStyle"; readonly ids: readonly string[]; readonly patch: LookPatch }` ; `CommitStroke`, `AddShape`, `SetText` gagnent `readonly look?: Look` (omis s'il est neutre).
  - Wasm : `pub fn set_style(&mut self, ids: Vec<String>, color: Option<String>, width: Option<f32>, fill_set: bool, fill: Option<String>, stroke_style_set: bool, stroke_style: Option<String>, roughness: Option<u8>, roundness_set: bool, roundness: Option<String>, opacity: Option<f64>) -> Result<JsValue, JsError>` ; `commit_stroke`, `add_shape`, `set_text` gagnent en fin `stroke_style: Option<String>, roughness: Option<f64>, seed: Option<f64>, roundness: Option<String>, opacity: Option<f64>`. Bornes **vérifiées dans le pont** avant conversion (jamais de troncature `u8`/`u32` de wasm-bindgen) : `roughness` entier 0..=2, `seed` entier 0..=u32::MAX, `opacity` finie 0..=100 arrondie ; hors bornes → `CommandError::BadStyle`. Dans `set_style`, `roughness: Option<f64>` suit la même règle.
  - `wasm-core.ts` : `toElementView` lit `look: toLook(v["look"])` dans la base (omis si `undefined`) ; `case "SetStyle"`.
  - `fake-core.ts` : même domaine (opacité 0..100, 100 retire), même arrondi, même « aucune étape », recopie de `look` à la gomme partielle, `look` lu aussi sur les images.
  - `apps/cli/src/ops.ts` : `"SetStyle"` ajouté en fin de `COMMAND_TYPES` (T5 garde les tests, `FORMAT_LOTS`, l'essai).
- Réutilise : `apps/web/src/core/api.ts:382-384` `extract`, `insertFragment` — inchangés (Dupliquer, T9).
- Rapport : `Réutilisation : appelé api.ts extract/insertFragment (inchangés)` ou écart.

**Test et commande bornée** :
```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-2 && <lignes Wasm de G13> && stat -c %s apps/web/src/wasm/roomboard_wasm_bg.wasm apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm && (cd apps/web && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm exec vitest run src/core 2>&1 | tail -15) && pnpm --filter @roomboard/cli exec tsc --noEmit 2>&1 | tail -3
```
Preuve : tailles affichées ≤ 1572864 (principal) et ≤ 3145728 (formats) ; `tsc` de la CLI code 0 ; `Tests N passed`, N ≥ 1, un test nommé `SetStyle : une étape, sur les deux cœurs` listé ; aucun `FAIL ` ; aucun `skipped` pour le vrai cœur.

**Contraintes** : G6 (`COMMAND_TYPES` ici ; tests, `FORMAT_LOTS` et essai à T5) ; G7 ; G8 ; G9 ; G12 ; G13 (cette tâche reconstruit le Wasm).

**Interdits** : pas de `serde_json` ni `serde(untagged)` dans le pont (taille, `lib.rs:185`) ; pas de double logique de validation : le faux cœur copie les règles de `style.rs` ligne à ligne.

**Terminé** : contrat vert sur les deux cœurs ; `pnpm --filter @roomboard/web exec tsc --noEmit` code 0 ; taille Wasm principale notée au rapport (avant/après).

**Patron à ne pas reprendre** : `fake-core.ts` traite `Fill` par un chemin propre (`fake-core.ts:1246`) sans le test de « même valeur » ; ici le faux cœur doit retourner un `Change` vide **et** ne pas pousser d'étape d'annulation quand rien ne change, comme `style.rs`. Chemin de référence : `crates/roomboard-core/src/style.rs` (T2), `differs` + `plan.is_empty()`.

**Étapes** :
- [ ] 1. Test de contrat (rouge), dans le fichier joué sur les deux cœurs (`describe.each` existant) :
```ts
it("SetStyle : une étape, sur les deux cœurs", () => {
  const doc = make();
  const page = doc.pageIds()[0]!;
  const id = doc.apply({ type: "AddShape", page, shape: "rect", x0: 0, y0: 0, x1: 100, y1: 50, style: { color: "#000000", width: 4 }, fill: null }).ids[0]!;
  doc.apply({ type: "SetStyle", ids: [id], patch: { strokeStyle: "dashed", opacity: 44.6, roughness: 1 } });
  const el = doc.element(id)!;
  expect(el.look?.strokeStyle).toBe("dashed");
  expect(el.look?.opacity).toBe(45);
  expect(typeof el.look?.seed).toBe("number");
  const v = doc.apply({ type: "SetStyle", ids: [id], patch: { strokeStyle: "dashed" } });
  expect(v.ids).toEqual([]);
  doc.undo();
  expect(doc.element(id)!.look).toBeUndefined();
  expect(() => doc.apply({ type: "SetStyle", ids: [id], patch: { opacity: 150 } })).toThrow(/style invalide/);
  expect(() => doc.apply({ type: "AddShape", page, shape: "rect", x0: 0, y0: 0, x1: 1, y1: 1, style: { color: "#000000", width: 4 }, fill: null, look: { opacity: 300 } })).toThrow(/style invalide/);
});
it("image : look lu (opacité)", () => {
  const doc = make();
  const id = addImage(doc); // aide du contrat existant pour AddImage
  doc.apply({ type: "SetStyle", ids: [id], patch: { opacity: 40 } });
  expect(doc.element(id)!.look).toEqual({ opacity: 40 });
});
it("AddShape avec look : écrit dans la même étape", () => {
  const doc = make();
  const page = doc.pageIds()[0]!;
  const id = doc.apply({ type: "AddShape", page, shape: "rect", x0: 0, y0: 0, x1: 10, y1: 10, style: { color: "#000000", width: 4 }, fill: null, look: { roundness: "round", opacity: 50 } }).ids[0]!;
  expect(doc.element(id)!.look).toEqual({ roundness: "round", opacity: 50 });
  doc.undo();
  expect(doc.element(id)).toBeNull();
});
it("gomme partielle : look recopié sur les morceaux", () => {
  const doc = make();
  const page = doc.pageIds()[0]!;
  const pts = new Float32Array(Array.from({ length: 21 }, (_, i) => [i * 10, 100, 0.5]).flat());
  doc.apply({ type: "CommitStroke", page, points: pts, style: { color: "#000000", width: 4 }, look: { opacity: 40 } });
  const c = doc.apply({ type: "Erase", page, path: new Float32Array([100, 80, 100, 120]), radius: 6, mode: "partial" });
  expect(c.ids.length).toBeGreaterThanOrEqual(2);
  for (const id of c.ids) expect(doc.element(id)!.look).toEqual({ opacity: 40 });
});
```
  (Adapte `make()`, `pageIds`, `undo` et la forme de l'erreur — exception ou `Change` refusé — à ceux du contrat existant.)
- [ ] 2. Lancer → `FAIL` (type `SetStyle` inconnu).
- [ ] 3. `api.ts` : ajouter la variante `SetStyle` et `readonly look?: Look` aux trois créations.
- [ ] 4. `lib.rs` (pont) : `set_style` + `set_style_inner` construisant `StylePatch { fill: fill_set.then_some(fill), stroke_style: stroke_style_set.then_some(stroke_style), roundness: roundness_set.then_some(roundness), … }` ; aide `fn look_of(stroke_style: Option<String>, roughness: Option<u8>, seed: Option<u32>, roundness: Option<String>, opacity: Option<u8>) -> Look` ; les trois créations la passent (`look: look_of(…)` à la place de `Look::default()` posé par T1) ; `cmd_err` mappe `BadStyle` → `"style invalide"`.
- [ ] 5. `wasm-core.ts` :
```ts
case "SetStyle": {
  const p = cmd.patch;
  return toChange(this.d.set_style(
    [...cmd.ids], p.color, p.width, "fill" in p, p.fill ?? undefined, "strokeStyle" in p, p.strokeStyle ?? undefined,
    p.roughness, "roundness" in p, p.roundness ?? undefined, p.opacity,
  ));
}
```
  et dans les trois créations, en fin d'appel : `cmd.look?.strokeStyle, cmd.look?.roughness, cmd.look?.seed, cmd.look?.roundness, cmd.look?.opacity`. `toElementView` : `const look = toLook(v["look"]); const base = { …, ...(look ? { look } : {}) };`.
- [ ] 6. `fake-core.ts` : stocker `look` sur l'élément fictif à la création ; `SetStyle` = copie de `validate` + `writes_for` + `differs` de `style.rs` (mêmes règles d'applicabilité, arrondi `Math.round`, 100 retire, 0 retire `roughness` et `seed`, graine neuve `(Math.random() * 2 ** 32) >>> 0` si le niveau change) ; aucune étape si rien ne change ; gomme partielle : `look` du trait coupé recopié sur chaque morceau.
- [ ] 7. Commande bornée → verte ; `nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit` code 0 ; taille principale ≤ 1 572 864 o.
- [ ] 7 bis. `apps/cli/src/ops.ts` : `"SetStyle"` en fin de `COMMAND_TYPES` ; `pnpm --filter @roomboard/cli exec tsc --noEmit` code 0.
- [ ] 8. Commit (7 fichiers, un par un) : `feat(core): bridge SetStyle and look through wasm and fake core` + Co-Authored-By, auteur G8.

<a id="tache-t5"></a>
### Tâche T5 — CLI (D15)

**Objectif** : la CLI accepte `SetStyle`, montre `look` dans `state`, documente les champs dans `FORMAT_LOTS`, et l'essai CLI le prouve.

**Fichiers** : `apps/cli/src/ops.test.ts`, `apps/cli/src/formats.ts`, `apps/cli/src/session.test.ts`, `scripts/essais/cli-essai.mjs` (`COMMAND_TYPES` déjà complété par T4).

**Interfaces** :
- Consomme (T4) : `Command` avec `SetStyle`, `look` sur les créations ; `ElementView.look`.
- Produit : test de `COMMAND_TYPES` (ligne posée par T4) ; `.roomboard` : `entry(1, 1, "roomboard", "options d'aspect (strokeStyle, roughness, roundness, opacity)")`.
- Réutilise : `apps/cli/src/fragment-view.ts:37` `insertFragment` — rien de neuf pour Dupliquer (décision 21).
- Rapport : `Réutilisation : appelé fragment-view insertFragment (inchangé)`.

**Test et commande bornée** :
```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-2 && <lignes Wasm de G13> && nice -n 10 cargo build -p roomboard-shell --bin roomboard-office -j 4 2>&1 | tail -2 && pnpm --filter @roomboard/cli build 2>&1 | tail -3 && (cd apps/cli && nice -n 10 pnpm exec vitest run src/ops.test.ts src/session.test.ts 2>&1 | tail -8) && nice -n 10 node scripts/essais/cli-essai.mjs 2>&1 | tail -6
```
Preuve : `Tests N passed` (N ≥ 1, test `SetStyle accepté` listé) ; sortie de l'essai contenant `personnalisation-2 : SetStyle puis undo` et la dernière ligne `CLI : OK`.

**Contraintes** : G6 ; G8 ; G9 ; G13 (Wasm construit en tête de commande) ; G10 (fichiers temporaires de l'essai, jamais un fichier de Jérôme) ; codes de sortie du profil (1 refus).

**Interdits** : aucune commande `duplicate` dans la CLI (décision 21) ; écrire seulement sous le dossier temporaire de l'essai.

**Terminé** : commande bornée verte ; `node apps/cli/dist/roomboard.mjs formats` montre la note ; `--help` code 0.

**Étapes** :
- [ ] 1. `ops.test.ts` (rouge) :
```ts
it("SetStyle accepté", () => {
  expect(COMMAND_TYPES).toContain("SetStyle");
});
```
  et dans `session.test.ts`, sur le modèle d'un test `run` existant : `AddShape` puis `{ type: "SetStyle", ids: ["$last"], patch: { opacity: 150 } }` → code 1 ; même chose avec `opacity: 44.6` → `state` montre `"opacity":45`. (Prends la façon dont la session désigne l'id créé, `$id:0` ou équivalent, dans un test existant.)
- [ ] 2. Lancer → rouge.
- [ ] 3. (`COMMAND_TYPES` : fait par T4, ne pas y toucher.) `formats.ts:59` : `entry(1, 1, "roomboard", "options d'aspect (strokeStyle, roughness, roundness, opacity)")`.
- [ ] 4. `cli-essai.mjs`, avant `console.log("CLI : OK")` :
```js
  // personnalisation-2 (OG11, déc. 29) : SetStyle puis undo, refus hors domaine, arrondi, état.
  {
    const f = join(dir, "style.roomboard");
    const neuf = cli(["run", "--new", "--out", f, "--ops", "-"], `${JSON.stringify({ type: "AddShape", page: "$page:0", shape: "rect", x0: 0, y0: 0, x1: 100, y1: 50, style: { color: "#000000", width: 4 }, fill: null })}\n`);
    verifie("personnalisation-2 : rectangle posé", neuf.code === 0, neuf.brut);
    const id = neuf.lignes[0].change.ids[0];
    const s = cli(["run", f, "--save", "--ops", "-"], `${[{ type: "SetStyle", ids: [id], patch: { strokeStyle: "dashed", opacity: 44.6 } }, { op: "state" }, { op: "undo" }, { op: "state" }].map((o) => JSON.stringify(o)).join("\n")}\n`);
    const avant = JSON.stringify(s.lignes[1].state);
    const apres = JSON.stringify(s.lignes[3].state);
    verifie("personnalisation-2 : SetStyle puis undo, une étape chacun", s.code === 0 && avant.includes('"strokeStyle":"dashed"') && avant.includes('"opacity":45') && !apres.includes('"strokeStyle"'), s.brut);
    const refus = cli(["run", f, "--ops", "-"], `${JSON.stringify({ type: "SetStyle", ids: [id], patch: { opacity: 150 } })}\n`);
    verifie("personnalisation-2 : opacity 150 refusée (code 1)", refus.code === 1, refus.brut);
    console.log("personnalisation-2 : SetStyle puis undo");
  }
```
  (Adapte `neuf.lignes[0].change.ids[0]` à la forme de ligne de `run --new` lue dans les blocs existants, l. 165-176.)
- [ ] 5. Commande bornée → verte.
- [ ] 6. Commit (4 fichiers un par un) : `feat(cli): SetStyle and look fields (D15)` + Co-Authored-By, auteur G8.

<a id="tache-t6"></a>
### Tâche T6 — `tool-options.ts` (DA-1)

**Objectif** : module pur qui dit quelles sections montrer, quelles couleurs rapides proposer et quelle valeur afficher (commune ou mixte).

**Fichiers** : créer `apps/web/src/ui/tool-options.ts`, `apps/web/src/ui/tool-options.test.ts`.

**Interfaces** :
- Consomme (T3) : `ElementView.look`, `strokeKindOf`, `roughnessOf`, `roundnessOf`, `opacityOf`, `ItemStyle`.
- Produit :
```ts
export type OptionKey = "strokeColor" | "background" | "strokeWidth" | "strokeStyle" | "roughness" | "roundness" | "opacity" | "actions";
export const OPTION_ORDER: readonly OptionKey[];
export function sectionsFor(tool: ToolChoice, targets: readonly ElementView[], editing: boolean): readonly OptionKey[];
export function disabledIn(key: OptionKey, editing: boolean): boolean;   // lot 1 : toujours false
export function formValue<T>(targets: readonly ElementView[], read: (e: ElementView) => T | undefined, current: T): T | null;
export const WIDTHS: readonly { readonly value: "2" | "4" | "8"; readonly label: string }[]; // Fin 2, Moyen 4, Épais 8
export const FALLBACK_STROKES: readonly string[]; // ["#000000", "#dc2626", "#1d4ed8", "#15803d", "#facc15"]
export function strokePicks(presets: Profile["presets"], tool: ToolChoice): readonly string[]; // 5 couleurs distinctes
export function backgroundPicks(): readonly (string | null)[]; // [null, …4 teintes de TABLE_FILLS : jaune, vert, bleu, rose]
export function showsPanel(tool: ToolChoice, selection: number, annotating: boolean): boolean;
```
- Réutilise : `apps/web/src/toolbar.ts:200` `presetsOf` — `presetsOf(table, tool): readonly Preset[]` (réutiliser).
- Rapport : `Réutilisation : appelé toolbar.ts presetsOf`.

**Table** (DA-1) : `pen` → strokeColor, strokeWidth, opacity · `rect` → strokeColor, background, strokeWidth, strokeStyle, roughness, roundness, opacity · `ellipse` → idem sans roundness · `line`, `arrow` → strokeColor, strokeWidth, strokeStyle, roughness, opacity · `text` → strokeColor, opacity · éléments `image` → opacity ; `table`, `media`, `model3d`, `fill`, `unknown` → rien ; `actions` dès qu'il y a une cible. Union outil ∪ cibles, dans `OPTION_ORDER`. `showsPanel` : vrai pour `pen`, `rect`, `ellipse`, `line`, `arrow`, `text`, ou `selection > 0` ; faux en annotation (H2). Les identifiants d'outils sont ceux de `ToolChoice` (`engine/input/gesture.ts:27`, `DrawTool | "hand"`) : lis-les et garde ces noms.

**Test et commande bornée** :
```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-2/apps/web && nice -n 10 pnpm exec vitest run src/ui/tool-options.test.ts 2>&1 | tail -15
```
Preuve : `Tests N passed`, N ≥ 10, tests `formValue mixte` et `sectionsFor select vide` listés.

**Contraintes** : G1 (copie de `getFormValue`, `actionProperties.tsx:230-272` : mention MIT en tête du fichier et ligne dans `THIRD_PARTY_NOTICES.md` — **ajoutée par T8**, qui tient ce fichier dans la vague ; signale-le au rapport) ; G8 ; G9.

**Interdits** : aucun import Solid ni DOM ; aucune couleur inventée (déc. 7, 8).

**Terminé** : tests verts, `tsc --noEmit` code 0.

**Étapes** :
- [ ] 1. `tool-options.test.ts` (rouge) :
```ts
import { describe, expect, it } from "vitest";
import type { ElementView } from "../core/api";
import { backgroundPicks, formValue, sectionsFor, showsPanel, strokePicks } from "./tool-options";

const rect = (id: string, color: string, look?: ElementView["look"]): ElementView =>
  ({ id, kind: "shape", transform: [1, 0, 0, 1, 0, 0], style: { color, width: 4 }, shape: { shape: "rect", w: 10, h: 10, fill: null }, ...(look ? { look } : {}) }) as ElementView;
const img = { id: "i", kind: "image", transform: [1, 0, 0, 1, 0, 0], image: {} } as unknown as ElementView;

describe("tool-options", () => {
  it("sectionsFor rect : 7 sections dans l'ordre d'Excalidraw", () => {
    expect(sectionsFor("rect", [], false)).toEqual(["strokeColor", "background", "strokeWidth", "strokeStyle", "roughness", "roundness", "opacity"]);
  });
  it("sectionsFor ellipse : sans angles", () => {
    expect(sectionsFor("ellipse", [], false)).not.toContain("roundness");
  });
  it("sectionsFor pen : trait, largeur, transparence", () => {
    expect(sectionsFor("pen", [], false)).toEqual(["strokeColor", "strokeWidth", "opacity"]);
  });
  it("sectionsFor select vide : rien", () => {
    expect(sectionsFor("select", [], false)).toEqual([]);
  });
  it("sectionsFor select + image : transparence et actions", () => {
    expect(sectionsFor("select", [img], false)).toEqual(["opacity", "actions"]);
  });
  it("formValue commune", () => {
    expect(formValue([rect("a", "#000000"), rect("b", "#000000")], (e) => (e.kind === "shape" ? e.style.color : undefined), "#111111")).toBe("#000000");
  });
  it("formValue mixte", () => {
    expect(formValue([rect("a", "#000000"), rect("b", "#dc2626")], (e) => (e.kind === "shape" ? e.style.color : undefined), "#111111")).toBeNull();
  });
  it("formValue sans cible : valeur courante", () => {
    expect(formValue([], () => "x", "courant")).toBe("courant");
  });
  it("formValue ignore les éléments sans la propriété", () => {
    expect(formValue([rect("a", "#000000"), img], (e) => (e.kind === "shape" ? e.style.color : undefined), "#111111")).toBe("#000000");
  });
  it("strokePicks : 5 couleurs distinctes, liste fixe en complément", () => {
    const p = strokePicks({ pen: [{ color: "#dc2626", width: 4 }] } as never, "pen");
    expect(p).toHaveLength(5);
    expect(new Set(p).size).toBe(5);
    expect(p[0]).toBe("#dc2626");
  });
  it("backgroundPicks : transparent puis 4 teintes", () => {
    const b = backgroundPicks();
    expect(b[0]).toBeNull();
    expect(b).toHaveLength(5);
  });
  it("showsPanel : masqué avec Main, Gomme, Pot, Tableau sans sélection, et en annotation", () => {
    for (const t of ["hand", "eraser", "fill", "table", "select"] as const) expect(showsPanel(t as never, 0, false)).toBe(false);
    expect(showsPanel("rect", 0, false)).toBe(true);
    expect(showsPanel("select", 1, false)).toBe(true);
    expect(showsPanel("rect", 0, true)).toBe(false);
  });
});
```
- [ ] 2. Lancer → `FAIL`.
- [ ] 3. `tool-options.ts` :
```ts
// OG11 (DA-1) : sections du panneau d'options et valeurs mixtes. `formValue` adapte `getFormValue` d'Excalidraw
// (packages/excalidraw/actions/actionProperties.tsx:230-272), Copyright (c) 2020 Excalidraw, licence MIT.
import type { ElementView } from "../core/api";
import type { ToolChoice } from "../engine/input/gesture"; // gesture.ts:27
import { presetsOf, TABLE_FILLS, type Profile } from "../toolbar";

export type OptionKey = "strokeColor" | "background" | "strokeWidth" | "strokeStyle" | "roughness" | "roundness" | "opacity" | "actions";
export const OPTION_ORDER: readonly OptionKey[] = ["strokeColor", "background", "strokeWidth", "strokeStyle", "roughness", "roundness", "opacity", "actions"];

const FORM: readonly OptionKey[] = ["strokeColor", "strokeWidth", "strokeStyle", "roughness", "opacity"];
const BY_TOOL: Readonly<Partial<Record<string, readonly OptionKey[]>>> = {
  pen: ["strokeColor", "strokeWidth", "opacity"],
  rect: ["strokeColor", "background", "strokeWidth", "strokeStyle", "roughness", "roundness", "opacity"],
  ellipse: ["strokeColor", "background", "strokeWidth", "strokeStyle", "roughness", "opacity"],
  line: FORM,
  arrow: FORM,
  text: ["strokeColor", "opacity"],
};
function byElement(e: ElementView): readonly OptionKey[] {
  switch (e.kind) {
    case "stroke": return BY_TOOL["pen"]!;
    case "shape": return BY_TOOL[e.shape.shape]!;
    case "text": return BY_TOOL["text"]!;
    case "image": return ["opacity"];
    default: return [];
  }
}
export function sectionsFor(tool: ToolChoice, targets: readonly ElementView[], _editing: boolean): readonly OptionKey[] {
  const on = new Set<OptionKey>(BY_TOOL[tool] ?? []);
  for (const t of targets) for (const k of byElement(t)) on.add(k);
  if (targets.length > 0) on.add("actions");
  return OPTION_ORDER.filter((k) => on.has(k));
}
export function disabledIn(_key: OptionKey, _editing: boolean): boolean {
  return false;
}
export function formValue<T>(targets: readonly ElementView[], read: (e: ElementView) => T | undefined, current: T): T | null {
  let seen = false;
  let common: T | undefined;
  for (const t of targets) {
    const v = read(t);
    if (v === undefined) continue;
    if (!seen) { seen = true; common = v; continue; }
    if (v !== common) return null;
  }
  return seen ? (common as T) : current;
}
export const WIDTHS = [
  { value: "2", label: "Fin" },
  { value: "4", label: "Moyen" },
  { value: "8", label: "Épais" },
] as const;
export const FALLBACK_STROKES: readonly string[] = ["#000000", "#dc2626", "#1d4ed8", "#15803d", "#facc15"];
const PICKS = 5; // COLOR_TOP_PICKS_SLOTS (Excalidraw colors.ts:236)
export function strokePicks(presets: Profile["presets"], tool: ToolChoice): readonly string[] {
  const out: string[] = [];
  const add = (c: string | undefined): void => { if (c && !out.includes(c) && out.length < PICKS) out.push(c); };
  for (const p of presetsOf(presets, tool as never)) add(p.color);
  for (const p of presetsOf(presets, "pen" as never)) add(p.color);
  for (const c of FALLBACK_STROKES) add(c);
  return out;
}
export function backgroundPicks(): readonly (string | null)[] {
  return [null, ...TABLE_FILLS.slice(0, 4).map((f) => f.color)];
}
const DRAW = new Set(["pen", "rect", "ellipse", "line", "arrow", "text"]);
export function showsPanel(tool: ToolChoice, selection: number, annotating: boolean): boolean {
  if (annotating) return false;
  return DRAW.has(tool) || selection > 0;
}
```
  Avant d'écrire : lis `toolbar.ts` — le nom exact de `TABLE_FILLS` et la forme d'une teinte (`{ color }` ou chaîne), la signature de `presetsOf` et le type du profil ; choisis dans `TABLE_FILLS` les teintes jaune, vert, bleu, rose dans cet ordre (déc. 8) et adapte les deux lignes concernées sans changer les tests.
- [ ] 4. Commande bornée → verte ; `tsc --noEmit` code 0.
- [ ] 5. Commit (2 fichiers un par un) : `feat(web): tool options sections and mixed values` + Co-Authored-By, auteur G8.

<a id="tache-t7"></a>
### Tâche T7 — Raccourcis et menu ☰

**Objectif** : une seule table `SHORTCUTS` (DA-6), un reconnaisseur `objectKey` (Ctrl+D), le raccourci affiché à droite de chaque ligne du menu, Tab qui ferme le menu, et Profil dans le menu livré (id `menu-profiles`, action `profiles` : l'id `profiles` est déjà pris par `panelsBar`, `toolbar-profiles.ts:85`, et un id est unique dans tout le profil, `toolbar.ts:322`).

**Fichiers** : créer `apps/web/src/ui/shortcuts.ts`, `apps/web/src/ui/shortcuts.test.ts` ; modifier `apps/web/src/engine/input/keys.ts`, `apps/web/src/engine/input/keys.test.ts`, `apps/web/src/ui/MenuBar.tsx`, `apps/web/src/ui/MenuBar.test.tsx`, `apps/web/src/toolbar-profiles.ts`, `apps/web/src/toolbar-profiles.test.ts`, `apps/web/src/ui/rb.css` (règle `[data-shortcut]` seule).

**Interfaces** :
- Produit :
```ts
// shortcuts.ts
export interface Shortcut { readonly id: string; readonly group: string; readonly label: string; readonly keys: string }
export const SHORTCUTS: readonly Shortcut[];
export function shortcutText(id: string, mac: boolean): string | null;
export const isMac: () => boolean; // navigator.platform / userAgentData
// keys.ts
export type ObjectKey = "duplicate" | "link" | "stroke-picker" | "fill-picker" | "help";
export function objectKey(e: KeyLike): ObjectKey | null; // lot 1 : seul "duplicate" (Ctrl/Cmd+D, sans Maj ni Alt, hors champ, hors composition)
```
  `id` = id d'élément du profil quand il y en a un (`file-new`, `file-open`, `file-save`, `file-save-as`, `export-pdf`…), sinon un id d'action (`undo`, `redo`, `copy`, `cut`, `paste`, `group`, `ungroup`, `duplicate`, `delete`, `escape`, `pan`, `bold`). `keys` : notation canonique `Ctrl+Maj+S` ; `shortcutText(…, true)` remplace `Ctrl+` par `⌘`, `Maj+` par `⇧`, `Alt+` par `⌥`.
- Réutilise : `apps/web/src/ui/MenuBar.tsx:47` `Row`, `:60` `MenuBar` — `Row` reçoit `shortcut: string | null` ; Tab ferme (étendre).
- Réutilise : `apps/web/src/engine/input/keys.ts:25` `keyAction` — `export type ObjectKey = …; export function objectKey(e: KeyLike): ObjectKey | null` (étendre).
- Rapport : une ligne `Réutilisation :` pour chacun des deux.

**Liste lot 1** (DA-6, groupes « Fichier », « Édition », « Vue », « Texte ») : Nouveau Ctrl+N · Ouvrir Ctrl+O · Enregistrer Ctrl+S · Enregistrer sous Ctrl+Maj+S · Annuler Ctrl+Z · Rétablir Ctrl+Y · Copier Ctrl+C · Couper Ctrl+X · Coller Ctrl+V · Grouper Ctrl+G · Dégrouper Ctrl+Maj+G · Dupliquer Ctrl+D · Supprimer Suppr · Désélectionner Échap · Déplacer la vue Espace + glisser · Gras, italique, souligné Ctrl+B, I, U.

**Test et commande bornée** :
```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-2/apps/web && nice -n 10 pnpm exec vitest run src/ui/shortcuts.test.ts src/ui/MenuBar.test.tsx src/toolbar-profiles.test.ts src/engine/input/keys.test.ts 2>&1 | tail -15
```
Preuve : 4 fichiers listés, `Tests N passed`, tests `chaque raccourci a son reconnaisseur`, `Tab ferme`, `menu livré : Profil en dernier` présents ; aucun `FAIL `.

**Contraintes** : G4 (le raccourci affiché ne réduit pas la cible ≥ 44 px ; masqué sous 600 px) ; G5 (`data-item`, `data-menu-toggle`, `role=menuitem` inchangés : `design-l2-navigateur.mjs` vert) ; G3 (gris AA par jeton) ; G8 ; G9 ; G11.

**Interdits** : ne pas changer l'ordre ni les ids des lignes existantes ; pas de sous-menu ; ne pas toucher `keyAction` (seulement ajouter `objectKey`).

**Terminé** : commande verte, `tsc --noEmit` code 0.

**Étapes** :
- [ ] 1. `shortcuts.test.ts` (rouge) :
```ts
import { describe, expect, it } from "vitest";
import { editAction, isPanKey, keyAction, objectKey, type KeyLike } from "../engine/input/keys";
import { fileCommandOf } from "../platform/controller";
import { SHORTCUTS, shortcutText } from "./shortcuts";

/** Valeur attendue de chaque raccourci, par reconnaisseur : une ligne ajoutée à SHORTCUTS sans ligne ici fait échouer le test. */
const EXPECT: Readonly<Record<string, readonly [string, string]>> = {
  "file-new": ["file", "new"], "file-open": ["file", "open"], "file-save": ["file", "save"], "file-save-as": ["file", "saveAs"],
  undo: ["key", "undo"], redo: ["key", "redo"], group: ["key", "group"], ungroup: ["key", "ungroup"],
  duplicate: ["object", "duplicate"], delete: ["edit", "delete"], escape: ["edit", "escape"],
  copy: ["native", "c"], cut: ["native", "x"], paste: ["native", "v"], pan: ["pan", " "], bold: ["rich", "b"],
};
const press = (keys: string): KeyLike => {
  const parts = keys.split("+");
  const k = parts.at(-1)!;
  const key = k === "Suppr" ? "Delete" : k === "Échap" ? "Escape" : k === "Espace" ? " " : k.toLowerCase();
  return { key, ctrlKey: parts.includes("Ctrl"), metaKey: false, shiftKey: parts.includes("Maj"), altKey: false, isComposing: false, target: null };
};

describe("shortcuts", () => {
  it("chaque raccourci a son reconnaisseur", () => {
    for (const s of SHORTCUTS) {
      const want = EXPECT[s.id];
      expect(want, `ligne EXPECT manquante pour ${s.id}`).toBeDefined();
      const [by, value] = want!;
      const e = press(s.keys.split(/[ ,]/)[0]!);
      if (by === "file") expect(fileCommandOf(e as never), s.id).toBe(value);
      else if (by === "key") expect(keyAction(e), s.id).toBe(value);
      else if (by === "object") expect(objectKey(e), s.id).toBe(value);
      else if (by === "edit") expect(editAction(e), s.id).toBe(value);
      else if (by === "pan") expect(isPanKey(press("Espace")), s.id).toBe(true);
      else {
        // Copier, couper, coller (événements natifs, main.ts) et Ctrl+B (rich-edit) : la touche est bien celle-là,
        // et aucun reconnaisseur du moteur ni de fichier ne la prend (sinon le geste natif serait volé).
        expect(e.key, s.id).toBe(value);
        expect(e.ctrlKey, s.id).toBe(true);
        expect(keyAction(e) ?? objectKey(e) ?? fileCommandOf(e as never) ?? editAction(e), s.id).toBeNull();
      }
    }
  });
  it("shortcutText : Ctrl sous Linux, ⌘ sous macOS", () => {
    expect(shortcutText("file-open", false)).toBe("Ctrl+O");
    expect(shortcutText("file-save-as", true)).toBe("⌘⇧S");
    expect(shortcutText("inconnu", false)).toBeNull();
  });
  it("ids uniques", () => {
    expect(new Set(SHORTCUTS.map((s) => s.id)).size).toBe(SHORTCUTS.length);
  });
});
```
  (Lis la signature de `fileCommandOf` dans `platform/controller.ts:74` et passe-lui ce qu'elle attend.)
- [ ] 2. `keys.test.ts` : ajouter
```ts
it("objectKey : Ctrl+D duplique, pas en champ, pas avec Maj", () => {
  const k = (over: Partial<KeyLike>): KeyLike => ({ key: "d", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, isComposing: false, target: null, ...over });
  expect(objectKey(k({}))).toBe("duplicate");
  expect(objectKey(k({ ctrlKey: false, metaKey: true }))).toBe("duplicate");
  expect(objectKey(k({ shiftKey: true }))).toBeNull();
  expect(objectKey(k({ target: { tagName: "INPUT" } }))).toBeNull();
  expect(objectKey(k({ isComposing: true }))).toBeNull();
});
```
- [ ] 3. `MenuBar.test.tsx` : ajouter, sur le modèle de montage existant
```tsx
it("raccourci affiché à droite de la ligne", async () => {
  const { container } = mountMenu();
  await openMenu(container);
  const open = container.querySelector('[data-item="file-open"] [data-shortcut]');
  expect(open?.textContent).toBe("Ctrl+O");
});
it("Tab ferme sans reprendre le focus", async () => {
  const { container } = mountMenu();
  await openMenu(container);
  const first = container.querySelector<HTMLButtonElement>('[role="menuitem"]')!;
  first.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
  expect(container.querySelector("[data-menu-list]")).toBeNull();
  expect(document.activeElement).not.toBe(container.querySelector("[data-menu-toggle]"));
});
```
  (`mountMenu`, `openMenu` : prends les aides du fichier ; sinon écris-les à partir du premier test existant.)
- [ ] 4. `toolbar-profiles.test.ts` : `it("menu livré : Profil en dernier", …)` qui lit les ids du groupe `vue` du menu livré et attend `["sep-6", "grid", "settings", "menu-profiles"]`, et dont l'élément `menu-profiles` a `action: "profiles"` ; le test existant `toolbar-profiles.test.ts:20` (`errors` vide) reste vert.
- [ ] 5. Lancer → rouge.
- [ ] 6. `shortcuts.ts` :
```ts
// OG11 (DA-6) : une seule table des raccourcis — le menu ☰ les affiche, l'Aide (lot 2) les liste.
export interface Shortcut { readonly id: string; readonly group: string; readonly label: string; readonly keys: string }
const s = (id: string, group: string, label: string, keys: string): Shortcut => Object.freeze({ id, group, label, keys });
export const SHORTCUTS: readonly Shortcut[] = Object.freeze([
  s("file-new", "Fichier", "Nouveau", "Ctrl+N"),
  s("file-open", "Fichier", "Ouvrir", "Ctrl+O"),
  s("file-save", "Fichier", "Enregistrer", "Ctrl+S"),
  s("file-save-as", "Fichier", "Enregistrer sous", "Ctrl+Maj+S"),
  s("undo", "Édition", "Annuler", "Ctrl+Z"),
  s("redo", "Édition", "Rétablir", "Ctrl+Y"),
  s("copy", "Édition", "Copier", "Ctrl+C"),
  s("cut", "Édition", "Couper", "Ctrl+X"),
  s("paste", "Édition", "Coller", "Ctrl+V"),
  s("group", "Édition", "Grouper", "Ctrl+G"),
  s("ungroup", "Édition", "Dégrouper", "Ctrl+Maj+G"),
  s("duplicate", "Édition", "Dupliquer", "Ctrl+D"),
  s("delete", "Édition", "Supprimer", "Suppr"),
  s("escape", "Édition", "Désélectionner", "Échap"),
  s("pan", "Vue", "Déplacer la vue", "Espace + glisser"),
  s("bold", "Texte", "Gras, italique, souligné", "Ctrl+B, I, U"),
]);
const MAC: ReadonlyArray<readonly [string, string]> = [["Ctrl+", "⌘"], ["Maj+", "⇧"], ["Alt+", "⌥"]];
export function shortcutText(id: string, mac: boolean): string | null {
  const hit = SHORTCUTS.find((x) => x.id === id);
  if (hit === undefined) return null;
  return mac ? MAC.reduce((t, [a, b]) => t.split(a).join(b), hit.keys) : hit.keys;
}
export const isMac = (): boolean => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
```
  (`ctrl+y` est reconnu par `keyAction` ; `copy`, `cut`, `paste` passent par les événements natifs, d'où leur exemption explicite dans le test.)
- [ ] 7. `keys.ts`, après `keyAction` :
```ts
/** OG11 (DA-6) : raccourcis d'objet. Lot 1 : Ctrl+D (Dupliquer), pris au navigateur par preventDefault. */
export type ObjectKey = "duplicate" | "link" | "stroke-picker" | "fill-picker" | "help";
export function objectKey(e: KeyLike): ObjectKey | null {
  if (e.isComposing || e.altKey || inEditable(e.target)) return null;
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "d") return "duplicate";
  return null;
}
```
- [ ] 8. `MenuBar.tsx` : `Row` reçoit `shortcut: string | null` et rend, après le libellé, `<Show when={props.shortcut}>{(k) => <span class="rb-menu-key" data-shortcut aria-hidden="true">{k()}</span>}</Show>` ; l'appelant passe `shortcutText(item.id, isMac())`. Dans `onKey` : `if (e.key === "Tab") { close(false); return; }` (pas de `preventDefault` : le focus suit Tab). `rb.css` : `.rb-menu-key { margin-inline-start: auto; padding-inline-start: 16px; color: var(--rb-text-muted); font-size: 0.875em; } @media (max-width: 599px) { .rb-menu-key { display: none; } }` (prends le jeton gris AA existant, `grep -n "muted\|--rb-gray" ui/rb.css`).
- [ ] 9. `toolbar-profiles.ts` : groupe `vue` → `[sep("sep-6"), action("grid", "Grille"), action("settings", "Réglages"), { id: "menu-profiles", kind: "action", action: "profiles", label: "Profil" }]` (patron `annAction`, `toolbar-profiles.ts:93-96`). `shortcutText` est appelé avec `item.id` : aucun raccourci pour `menu-profiles`.
- [ ] 10. Commande bornée → verte ; `nice -n 10 pnpm exec vitest run src/ui/rb-css.test.ts 2>&1 | tail -3` vert.
- [ ] 11. Commit (9 fichiers un par un) : `feat(web): shortcut table, Ctrl+D recogniser, menu shortcuts and Profile entry` + Co-Authored-By, auteur G8.

<a id="tache-t8"></a>
### Tâche T8 — Rendu : tirets, alpha, angles, roughjs

**Objectif** : le rendu Canvas 2D peint `strokeStyle`, `opacity`, `roundness` et `roughness` (roughjs) sur la scène, les miniatures et l'export ; l'aperçu partage la graine ; la couche vive suit l'opacité du trait.

**Fichiers** : `apps/web/package.json` (+ `roughjs`), `pnpm-lock.yaml`, `THIRD_PARTY_NOTICES.md` (roughjs ; Excalidraw pour `sketch.ts` et `tool-options.ts`), créer `apps/web/src/engine/render/sketch.ts`, `sketch.test.ts` ; modifier `canvas2d.ts` (`traceShape :225`, `paintShape :243`, texte `:260-290`, éléments `:465`, aperçu `:559-563`), `canvas2d.test.ts`, `webgl2.ts`, `webgl2.test.ts`, `overlay.ts` (`ShapePreview.look?`), `renderer.ts` (`LiveLayer.opacity?`), `apps/web/src/app/pdf-overlay-vector.test.ts` (test vectoriel).

**Interfaces** :
- Consomme (T3) : `Look`, `strokeKindOf`, `roughnessOf`, `roundnessOf`, `opacityOf`.
- Produit :
```ts
// sketch.ts
export function sketchShape(ctx: CanvasRenderingContext2D, s: ShapeData, style: StrokeStyle, look: Look, seed: number): void;
export function seedOf(id: string): number;   // FNV-1a 32 bits
export function newSeed(): number;            // entier 32 bits non signé
export function dashOf(kind: StrokeKind, w: number): number[]; // solid [] · dashed [max(8, 2w), 8 + w] · dotted [0, 6 + w]
export function cornerRadius(w: number, h: number): number;    // min(0.25 · min(|w|, |h|), 32)
// canvas2d.ts
export function traceShape(ctx: CanvasRenderingContext2D, s: ShapeData, width: number, round?: boolean): void;
export function paintShape(ctx: CanvasRenderingContext2D, s: ShapeData, style: StrokeStyle, look?: Look, seed?: number): void;
// overlay.ts : ShapePreview gagne `readonly look?: Look; readonly seed?: number`
// renderer.ts : LiveLayer gagne `readonly opacity?: number` (0..100 ; absent = 100)
```
- Réutilise : `apps/web/src/engine/render/canvas2d.ts:225,243` `traceShape`, `paintShape` — `paintShape(ctx, s, style, look, seed)` ; `traceShape` gagne les angles (étendre).
- Réutilise : `apps/web/src/engine/render/record-ctx.ts:190-221` — `setLineDash`, `globalAlpha`, `bezierCurveTo` (réutiliser ; aucune modification).
- Rapport : une ligne `Réutilisation :` pour chacun.

**Règles** : Architecte (0) sans tirets ni angles ni alpha → **exactement** les appels d'aujourd'hui (même suite d'appels sur `fake-ctx`). Angles arrondis : Bézier (`moveTo`, `lineTo`, `quadraticCurveTo` ou `bezierCurveTo`), jamais `roundRect`. Alpha : `ctx.globalAlpha = opacity / 100` dans `save/restore` de l'élément (formes, traits, textes, images). Roughjs : `rough.generator()` ; `generator.rectangle/ellipse/line` avec `{ roughness, seed, stroke, strokeWidth: w, strokeLineDash, fill, fillStyle: "solid", preserveVertices: true }` ; rejouer `toPaths` ou les `sets[].ops` (`move` → `moveTo`, `bcurveTo` → `bezierCurveTo`, `lineTo` → `lineTo`) ; set `fillPath` → `fill()`, `path` → `stroke()`. Graine absente : `seedOf(el.id)`. Rectangle arrondi + roughness : `generator.path(svgPath)` du rectangle arrondi (comme `shape.ts:176-246` d'Excalidraw). Couche vive : `opacity` CSS du canvas d'interaction (`canvas.style.opacity = String(o / 100)`), remise à `""` quand `opacity` est absente.

**Test et commande bornée** :
```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-2/apps/web && nice -n 10 pnpm exec vitest run src/engine/render src/app/pdf-overlay-vector.test.ts 2>&1 | tail -15
```
Preuve : `Tests N passed`, tests `roughjs déterministe`, `architecte au pixel près`, `opacité du trait vif`, `aperçu et objet posé : même empreinte`, `export vectoriel : tirets et alpha` listés ; `canvas2d.test.ts`, `webgl2.test.ts`, `record-ctx.test.ts` verts.

**Preuve de poids** : `pnpm --filter @roomboard/web build` avant/après, taille gzip du plus gros `assets/index-*.js` (`gzip -c … | wc -c`) consignée au rapport (attendu ≈ +9 Ko).

**Contraintes** : G1 (en tête de `sketch.ts` : « Adapté d'Excalidraw (packages/element/src/shape.ts, utils.ts), MIT » ; `THIRD_PARTY_NOTICES.md` : lignes roughjs MIT, Excalidraw MIT pour `sketch.ts` et `ui/tool-options.ts`) ; G2 (`pnpm --filter @roomboard/web add roughjs@~4.6.6`, aucune autre) ; G7 (roughjs hors Wasm) ; G8 ; G9 ; `node scripts/controle-licences.mjs` vert.

**Interdits** : ne pas changer `select.ts` ni le choix du rendu ; ne pas toucher les tirets de la sélection (`canvas2d.ts:580-594`) ; aucun shader modifié ; pas de DOM dans `sketch.ts` (`rough.generator()` seulement).

**Terminé** : commande verte ; `bash scripts/tests/controle-licences.test.sh` et `node scripts/controle-licences.mjs` code 0 ; poids au rapport.

**Patron à ne pas reprendre** : `rough.canvas(el)` (dessine via le DOM, ne passe pas par `record-ctx`, perd le PDF vectoriel) ; utiliser `rough.generator()` et rejouer ses opérations sur le contexte reçu. Référence : `~/.cache/tmp/og11-excalidraw/packages/element/src/shape.ts:176-246` et `renderElement.ts` (`rc.draw` à ne pas copier).

**Étapes** :
- [ ] 1. `sketch.test.ts` (rouge) :
```ts
import { describe, expect, it } from "vitest";
import { RecordingContext2D } from "./record-ctx";
import { cornerRadius, dashOf, seedOf, sketchShape } from "./sketch";

const rect = { shape: "rect" as const, w: 200, h: 100, fill: null };
const pen = { color: "#000000", width: 4 };
describe("sketch", () => {
  it("roughjs déterministe : même graine, mêmes opérations", () => {
    const a = new RecordingContext2D(); const b = new RecordingContext2D();
    sketchShape(a as never, rect, pen, { roughness: 1 }, 42);
    sketchShape(b as never, rect, pen, { roughness: 1 }, 42);
    expect(JSON.stringify(a.ops())).toBe(JSON.stringify(b.ops()));
    const c = new RecordingContext2D();
    sketchShape(c as never, rect, pen, { roughness: 1 }, 43);
    expect(JSON.stringify(c.ops())).not.toBe(JSON.stringify(a.ops()));
  });
  it("seedOf : FNV-1a stable", () => {
    expect(seedOf("abc")).toBe(0x1a47e90b);
    expect(seedOf("abc")).toBe(seedOf("abc"));
  });
  it("dashOf", () => {
    expect(dashOf("solid", 4)).toEqual([]);
    expect(dashOf("dashed", 4)).toEqual([8, 12]);
    expect(dashOf("dashed", 8)).toEqual([16, 16]);
    expect(dashOf("dotted", 4)).toEqual([0, 10]);
  });
  it("cornerRadius adaptatif", () => {
    expect(cornerRadius(200, 100)).toBe(25);
    expect(cornerRadius(1000, 1000)).toBe(32);
  });
});
```
  (`RecordingContext2D`, `record-ctx.ts:127` ; remplace `ops()` par la lecture de la liste enregistrée qu'utilise `record-ctx.test.ts`.)
- [ ] 2. `canvas2d.test.ts` (rouge), avec `fake-ctx.ts` :
```ts
// Relevé sur `main` (45484db) AVANT toute modification de canvas2d.ts : lancer une fois ce test avec
// `console.log(JSON.stringify(c.calls))`, recopier la sortie ici en littéral, puis seulement modifier le rendu.
const ARCHITECTE_RECT_MAIN = [/* suite d'appels relevée sur main, recopiée telle quelle */] as const;
it("architecte au pixel près : mêmes appels qu'avant", () => {
  const c = fakeCtx(); paintShape(c, rect, pen);
  expect(c.calls).toEqual(ARCHITECTE_RECT_MAIN);
  const d = fakeCtx(); paintShape(d, rect, pen, {}, 0);
  expect(d.calls).toEqual(ARCHITECTE_RECT_MAIN);
  expect(ARCHITECTE_RECT_MAIN.length).toBeGreaterThan(0);
});
it("tirets, alpha, angles en Bézier", () => {
  const c = fakeCtx();
  paintShape(c, rect, pen, { strokeStyle: "dashed", roundness: "round", opacity: 50 }, 0);
  expect(c.calls).toContainEqual({ name: "setLineDash", args: [[8, 12]] });
  expect(c.state.globalAlpha).toBeCloseTo(0.5);
  expect(c.calls.some((x) => x.name === "roundRect")).toBe(false);
  expect(c.calls.some((x) => x.name === "quadraticCurveTo" || x.name === "bezierCurveTo")).toBe(true);
});
it("aperçu et objet posé : même empreinte", () => {
  const look = { roughness: 1 as const, seed: 7 };
  const a = fakeCtx(); paintShape(a, rect, pen, look, 7);
  const r = new Canvas2DRenderer(/* comme les tests existants */);
  const b = fakeCtx();
  r.drawOverlay(/* entrée publique du calque d'édition utilisée par canvas2d.test.ts */ { ghosts: [], shapes: [{ shape: "rect", x0: 0, y0: 0, x1: 200, y1: 100, style: pen, fill: null, look, seed: 7 }], frame: null, handles: false, band: null });
  expect(JSON.stringify(b.calls.filter((x) => x.name === "bezierCurveTo"))).toBe(JSON.stringify(a.calls.filter((x) => x.name === "bezierCurveTo")));
});
```
  (`fakeCtx`, `calls`, `state` : forme de `fake-ctx.ts`. Aperçu : `paintOverlayForTest` n'existe pas ; passe par l'entrée publique que `canvas2d.test.ts` utilise déjà pour le calque d'édition, et lis les appels sur le contexte de ce calque.)
- [ ] 2 bis. **Avant toute modification de `canvas2d.ts`**, relever `ARCHITECTE_RECT_MAIN` sur le code de `main` et le recopier en littéral ; le test doit être vert sur `main`, puis le rester.
- [ ] 3. `webgl2.test.ts` et `canvas2d.test.ts` : `it("opacité du trait vif", …)` — `drawLive({ strokes: [s], erasers: [], opacity: 50 }, cam)` → `interaction.style.opacity === "0.5"` ; puis `drawLive({ strokes: [], erasers: [] }, cam)` → `""`.
- [ ] 4. `pdf-overlay-vector.test.ts` : `it("export vectoriel : tirets et alpha", …)` — rendre une page avec un rectangle `look: { strokeStyle: "dashed", opacity: 50 }` par le chemin vectoriel du fichier et attendre dans les opérations enregistrées `dash` = `[8, 12]` et un alpha 0,5.
- [ ] 5. Lancer → rouge. Puis `pnpm --filter @roomboard/web add roughjs@~4.6.6` (vérifie `pnpm-lock.yaml` : une seule entrée ajoutée).
- [ ] 6. `sketch.ts` :
```ts
// OG11 (DA-3) : rendu « dessiné à la main » par roughjs (MIT), sans DOM. Adapté d'Excalidraw (MIT) :
// packages/element/src/shape.ts:172-246 (tirets, options rough), packages/element/src/utils.ts:528-548 (rayon des angles).
import rough from "roughjs/bin/rough";
import type { Op, OpSet } from "roughjs/bin/core";
import type { ShapeData, StrokeStyle } from "../../core/api";
import { roughnessOf, roundnessOf, strokeKindOf, type Look, type StrokeKind } from "../../core/look";

const gen = rough.generator();

export function dashOf(kind: StrokeKind, w: number): number[] {
  if (kind === "dashed") return [Math.max(8, 2 * w), 8 + w];
  if (kind === "dotted") return [0, 6 + w];
  return [];
}
export function cornerRadius(w: number, h: number): number {
  return Math.min(0.25 * Math.min(Math.abs(w), Math.abs(h)), 32);
}
export function seedOf(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
export function newSeed(): number {
  return (Math.random() * 2 ** 32) >>> 0;
}
function roundedPath(w: number, h: number): string {
  const r = cornerRadius(w, h);
  return `M ${r} 0 L ${w - r} 0 Q ${w} 0, ${w} ${r} L ${w} ${h - r} Q ${w} ${h}, ${w - r} ${h} L ${r} ${h} Q 0 ${h}, 0 ${h - r} L 0 ${r} Q 0 0, ${r} 0`;
}
function replay(ctx: CanvasRenderingContext2D, ops: readonly Op[]): void {
  ctx.beginPath();
  for (const o of ops) {
    const d = o.data;
    if (o.op === "move") ctx.moveTo(d[0]!, d[1]!);
    else if (o.op === "bcurveTo") ctx.bezierCurveTo(d[0]!, d[1]!, d[2]!, d[3]!, d[4]!, d[5]!);
    else ctx.lineTo(d[0]!, d[1]!);
  }
}
export function sketchShape(ctx: CanvasRenderingContext2D, s: ShapeData, style: StrokeStyle, look: Look, seed: number): void {
  const w = style.width;
  const closed = s.shape === "rect" || s.shape === "ellipse";
  const opts = {
    roughness: roughnessOf(look),
    seed: seed === 0 ? 1 : seed, // roughjs : 0 = aléatoire
    stroke: style.color,
    strokeWidth: w,
    strokeLineDash: dashOf(strokeKindOf(look), w),
    disableMultiStroke: strokeKindOf(look) !== "solid",
    preserveVertices: true,
    ...(closed && s.fill !== null ? { fill: s.fill, fillStyle: "solid" } : {}),
  };
  const drawable =
    s.shape === "rect"
      ? roundnessOf(look) === "round"
        ? gen.path(roundedPath(s.w, s.h), opts)
        : gen.rectangle(0, 0, s.w, s.h, opts)
      : s.shape === "ellipse"
        ? gen.ellipse(s.w / 2, s.h / 2, s.w, s.h, opts)
        : gen.line(0, 0, s.w, s.h, opts);
  for (const set of drawable.sets as OpSet[]) {
    replay(ctx, set.ops);
    if (set.type === "fillPath") {
      ctx.fillStyle = s.fill ?? style.color;
      ctx.fill();
    } else if (set.type === "path") {
      ctx.setLineDash(opts.strokeLineDash);
      ctx.strokeStyle = style.color;
      ctx.lineWidth = w;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }
  }
}
```
  Pour la flèche en Artiste/Caricaturiste : la ligne passe par `gen.line`, puis les ailes (`arrowWings`) par deux `gen.line` de mêmes options. Vérifie les chemins d'import exacts de roughjs 4.6 (`roughjs/bin/rough` exporte `default` ; types `Op`, `OpSet` dans `roughjs/bin/core`) et ajuste les imports sans changer le corps.
- [ ] 7. `canvas2d.ts` :
```ts
export function traceShape(ctx: CanvasRenderingContext2D, s: ShapeData, width: number, round = false): void {
  ctx.beginPath();
  if (s.shape === "rect" && round) {
    const r = cornerRadius(s.w, s.h);
    const { w, h } = s;
    ctx.moveTo(r, 0);
    ctx.lineTo(w - r, 0);
    ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r);
    ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h);
    ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
  } else if (s.shape === "rect") {
    ctx.rect(0, 0, s.w, s.h);
  } else if (s.shape === "ellipse") {
    ctx.ellipse(s.w / 2, s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2);
  } else {
    ctx.moveTo(0, 0);
    ctx.lineTo(s.w, s.h);
    const head = s.shape === "arrow" ? arrowWings(s.w, s.h, width) : null;
    if (head) {
      ctx.moveTo(head[0], head[1]);
      ctx.lineTo(s.w, s.h);
      ctx.lineTo(head[2], head[3]);
    }
  }
}

export function paintShape(ctx: CanvasRenderingContext2D, s: ShapeData, style: StrokeStyle, look?: Look, seed?: number): void {
  if (roughnessOf(look) > 0) {
    sketchShape(ctx, s, style, look ?? {}, look?.seed ?? seed ?? 0);
    return;
  }
  traceShape(ctx, s, style.width, roundnessOf(look) === "round");
  if (s.fill !== null && (s.shape === "rect" || s.shape === "ellipse")) {
    ctx.fillStyle = s.fill;
    ctx.fill();
  }
  const dash = dashOf(strokeKindOf(look), style.width);
  if (dash.length > 0) ctx.setLineDash(dash);
  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  if (dash.length > 0) ctx.setLineDash([]);
}
```
  Dans `paintElement` (`:455-470`) : après `ctx.transform(...)`, `const o = opacityOf(el.look); if (o < 100) ctx.globalAlpha *= o / 100;` (le `save/restore` existant encadre) ; `paintShape(ctx, el.shape, el.style, el.look, el.look?.seed ?? seedOf(el.id))`. Dans `paintOverlayContent` : `paintShape(ctx, {…}, s.style, s.look, s.seed)` avec `globalAlpha` de `s.look`. Ellipse arrondie : sans objet.
- [ ] 8. `drawLive` (webgl2 et canvas2d) : `this.interaction.style.opacity = live.opacity !== undefined && live.opacity < 100 ? String(live.opacity / 100) : "";` (nom du canvas d'interaction : celui que chaque renderer garde ; lis-le).
- [ ] 9. Commande bornée → verte ; build et poids ; contrôle des licences.
- [ ] 10. `THIRD_PARTY_NOTICES.md` : section roughjs (MIT, © Preet Shihn, texte de licence du paquet) et entrée Excalidraw (MIT) citant `apps/web/src/engine/render/sketch.ts` et `apps/web/src/ui/tool-options.ts`.
- [ ] 11. Commit, fichiers un par un (`apps/web/package.json`, `pnpm-lock.yaml`, `THIRD_PARTY_NOTICES.md`, `sketch.ts`, `sketch.test.ts`, `canvas2d.ts`, `canvas2d.test.ts`, `webgl2.ts`, `webgl2.test.ts`, `overlay.ts`, `renderer.ts`, `pdf-overlay-vector.test.ts`) : `feat(render): dashes, opacity, rounded corners and roughjs sketch` + Co-Authored-By, auteur G8.

<a id="tache-t9"></a>
### Tâche T9 — Moteur : style courant, Dupliquer, Supprimer

**Objectif** : le moteur tient un `ItemStyle` courant (gardé sur l'appareil), l'applique aux créations (avec graine tirée au début du geste), l'écrit sur la sélection par `SetStyle`, et offre `duplicateSelection()` (Ctrl+D) et `deleteSelection()`.

**Fichiers** : `apps/web/src/engine/engine.ts`, `engine/engine.test.ts`, `engine/tools/shape.ts`, `engine/tools/pen.ts`, `engine/tools/text.ts`, `apps/web/src/device-settings.ts`, `device-settings.test.ts`, `apps/web/src/app/board-session.ts` (le moteur y est créé, `:314`), `app/board-session.test.ts`, `apps/web/src/app/annotation-page.ts`, `annotation-page.test.ts`, `apps/web/src/main.ts` (`DeviceSettings` y naît, `:255` ; passe le style par `shared`, `:390`). Vérifié : `workspace.ts` n'est pas touché (il reçoit `makeSession` tout fait de `main.ts`) ; aucune autre tâche de V4 (T5 : CLI seule) ne touche ces fichiers.

**Interfaces** :
- Consomme : T3 `ItemStyle`, `DEFAULT_ITEM_STYLE`, `mergeItemStyle`, `parseItemStyle`, `lookFrom` ; T4 `SetStyle`, `look` ; T7 `objectKey` ; T8 `newSeed` (`engine/render/sketch.ts`), `ShapePreview.look/seed`, `LiveLayer.opacity`.
- Produit (`board-session.ts`) : `SessionShared` gagne `readonly itemStyle?: () => ItemStyle | null` et `readonly onItemStyle?: (s: ItemStyle) => void` ; `buildBoardSession` passe `itemStyle: shared.itemStyle?.() ?? undefined` à `createEngine` et branche `engine.onItemStyle(shared.onItemStyle)`. `annotate-start.ts` ne les passe pas (H2).
- Produit (`Engine`) :
```ts
setItemStyle(patch: Partial<ItemStyle>): void;        // écrit la sélection (un SetStyle, une étape) ET le style courant
itemStyle(): ItemStyle;
deleteSelection(): boolean;                            // le code de Suppr (engine.ts:688-693), extrait
duplicateSelection(): boolean;                         // insertFragment(doc.extract(page, sel), 10, 10)
onItemStyle(cb: (s: ItemStyle) => void): () => void;   // pour garder sur l'appareil
// EngineState gagne : readonly itemStyle: ItemStyle
// DeviceSettings gagne : itemStyle(): ItemStyle | null ; setItemStyle(s: ItemStyle): boolean   (clé "roomboard.style-courant")
```
  `setPenStyle(s)` reste et appelle `setItemStyle({ color: s.color, width: s.width })` **sans** écrire la sélection (un préréglage ne règle que couleur et largeur, `toolbar-host.ts:109-120`). Le pot garde sa couleur (PC6).
- Réutilise : `apps/web/src/engine/engine.ts:154,832` `setPenStyle` — `setItemStyle(patch: Partial<ItemStyle>): void` ; `setPenStyle` reste et appelle `setItemStyle` (étendre).
- Réutilise : `apps/web/src/engine/engine.ts:627` — `Engine.deleteSelection(): boolean` (étendre).
- Réutilise : `apps/web/src/engine/engine.ts:118,633` `insertFragment` ; `apps/web/src/core/api.ts:382` `extract` — `engine.insertFragment(doc.extract(page, sel), 10, 10)` → `Change.ids` = copies, posées en sélection (réutiliser).
- Réutilise : `apps/web/src/device-settings.ts:55` `DeviceSettings` — `itemStyle(): ItemStyle | null`, `setItemStyle(s: ItemStyle): boolean` (étendre).
- Rapport : une ligne `Réutilisation :` par ligne ci-dessus.

**Test et commande bornée** :
```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-2/apps/web && nice -n 10 pnpm exec vitest run src/engine/engine.test.ts src/device-settings.test.ts src/app/board-session.test.ts src/app/annotation-page.test.ts src/engine/tools/shape.test.ts src/engine/tools/pen.test.ts src/app/toolbar-host.test.ts 2>&1 | tail -15
```
Preuve : `Tests N passed`, tests `duplicateSelection +10/+10`, `style courant relu`, `style courant illisible : défaut`, `seed tiré au début du geste`, `setItemStyle : une étape sur la sélection`, `choisir un outil garde le style courant`, `session : style courant passé au moteur` listés ; `shape.test.ts:54` vert sans retouche ; aucun `FAIL `.

**Contraintes** : G4 ; G8 ; G9 ; G11 (ne pas toucher `engine/page.ts`, `camera.ts`) ; constat `annotation-page.ts:35` : `itemStyle` ajouté à `viewOf` **avec** son test, sans autre champ.

**Interdits** : pas de commande de duplication dans le cœur ; ne pas toucher le presse-papiers à Dupliquer (`canPaste` inchangé) ; `look` omis s'il est neutre (sinon `shape.test.ts:54` casse) ; ne pas aggraver `ACTION_REQUIRES` (`toolbar.ts:634`).

**Terminé** : commande verte ; `tsc --noEmit` code 0.

**Patron à ne pas reprendre** : `setPenStyle` remplace le style entier (`engine.ts:832-835`) ; `setItemStyle` **fusionne** (`mergeItemStyle`) pour qu'un préréglage garde la transparence choisie (S2.4). Graine : tirer au `pointerdown` (`open` du geste) et la garder dans le brouillon, jamais au relâché. Référence : `apps/web/src/engine/tools/shape.ts:100-125`.

**Étapes** :
- [ ] 1. `engine.test.ts` (rouge), sur le montage existant (`makeEngine` ou équivalent avec le faux cœur) :
```ts
it("setItemStyle : une étape sur la sélection, et style courant", () => {
  const { engine, doc } = setup();
  const a = addRect(engine); const b = addRect(engine);
  engine.select([a, b]);
  engine.setItemStyle({ color: "#1d4ed8" });
  expect(doc.element(a)!.kind === "shape" && doc.element(a)!.style.color).toBe("#1d4ed8");
  expect(engine.itemStyle().color).toBe("#1d4ed8");
  engine.undo();
  expect(doc.element(b)!.kind === "shape" && doc.element(b)!.style.color).toBe("#000000");
});
it("setPenStyle garde la transparence", () => {
  const { engine } = setup();
  engine.setItemStyle({ opacity: 40 });
  engine.setPenStyle({ color: "#dc2626", width: 4 });
  expect(engine.itemStyle()).toMatchObject({ color: "#dc2626", opacity: 40 });
});
it("duplicateSelection +10/+10, copie sélectionnée, une étape", () => {
  const { engine, doc } = setup();
  const a = addRect(engine);
  engine.select([a]);
  expect(engine.duplicateSelection()).toBe(true);
  const sel = engine.state().selection;
  expect(sel).toHaveLength(1);
  expect(sel[0]).not.toBe(a);
  expect(doc.element(sel[0]!)!.transform[4]).toBe(doc.element(a)!.transform[4] + 10);
  engine.undo();
  expect(doc.element(sel[0]!)).toBeNull();
});
it("Ctrl+D duplique", () => {
  const { engine } = setup();
  engine.select([addRect(engine)]);
  expect(engine.key({ key: "d", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, isComposing: false, target: null })).toBe(true);
  expect(engine.state().elementCount).toBe(2);
});
it("deleteSelection", () => {
  const { engine } = setup();
  engine.select([addRect(engine)]);
  expect(engine.deleteSelection()).toBe(true);
  expect(engine.state().elementCount).toBe(0);
  expect(engine.deleteSelection()).toBe(false);
});
it("seed tiré au début du geste : aperçu et objet posé", () => {
  const { engine, doc, renderer } = setup();
  engine.setTool("rect");
  engine.setItemStyle({ roughness: 1 });
  drag(engine, [10, 10], [110, 60], { beforeUp: () => expect(renderer.lastOverlay().shapes[0]!.seed).toBeDefined() });
  const seedPreview = renderer.lastOverlaySeen().shapes[0]!.seed;
  const id = engine.state().selection[0] ?? doc.lastId();
  expect(doc.element(id)!.look?.seed).toBe(seedPreview);
});
```
  (`setup`, `addRect`, `select`, `drag`, `lastOverlay` : reprends les aides du fichier ; écris celles qui manquent à partir des tests existants de l'outil Forme et de la sélection.)
- [ ] 2. `device-settings.test.ts` : `it("style courant relu", …)` (`setItemStyle(s)` puis une nouvelle instance sur le même stockage → `itemStyle()` égal) et `it("style courant illisible : défaut", …)` (clé `roomboard.style-courant` = `"{"` → `itemStyle()` `null`, aucune exception ; stockage qui lève → `setItemStyle` renvoie `false`).
- [ ] 3. `annotation-page.test.ts` : `viewOf(...)` porte `itemStyle`. `engine.test.ts` : `it("choisir un outil garde le style courant", …)` — `setItemStyle({ color: "#1d4ed8" })`, `setTool("pen")` → `itemStyle().color === "#1d4ed8"` (S2.4). `board-session.test.ts` : `it("session : style courant passé au moteur", …)` — `shared.itemStyle` renvoie un style tirets → `session.engine.itemStyle().strokeStyle === "dashed"` ; `setItemStyle` appelle `shared.onItemStyle`. (Pas de `presetsOf(...)[0]` au choix d'outil : le constat `:45` est déjà fermé, `toolbar-host.ts:116` ; `toolbar-host.ts` n'est pas touché, son test reste vert.)
- [ ] 4. Lancer → rouge.
- [ ] 5. `device-settings.ts` : `const ITEM_STYLE_KEY = "roomboard.style-courant";` ; `itemStyle(): ItemStyle | null { try { return parseItemStyle(kv?.getItem(ITEM_STYLE_KEY) ?? null); } catch { return null; } }` ; `setItemStyle(s) { try { kv?.setItem(ITEM_STYLE_KEY, JSON.stringify(s)); return kv !== null; } catch { return false; } }` (même gestion d'erreur que `setFrame`).
- [ ] 6. `engine.ts` :
```ts
let item: ItemStyle = deps.itemStyle ?? (deps.penStyle ? mergeItemStyle(DEFAULT_ITEM_STYLE, deps.penStyle) : DEFAULT_ITEM_STYLE);
const itemListeners = new Set<(s: ItemStyle) => void>();
const style = (): ItemStyle => item; // les fabriques d'outils reçoivent () => item (ItemStyle étend StrokeStyle)
function patchOf(p: Partial<ItemStyle>): LookPatch {
  return {
    ...(p.color !== undefined ? { color: p.color } : {}),
    ...(p.width !== undefined ? { width: p.width } : {}),
    ...("background" in p ? { fill: p.background ?? null } : {}),
    ...(p.strokeStyle !== undefined ? { strokeStyle: p.strokeStyle === "solid" ? null : p.strokeStyle } : {}),
    ...(p.roughness !== undefined ? { roughness: p.roughness } : {}),
    ...(p.roundness !== undefined ? { roundness: p.roundness === "round" ? "round" : null } : {}),
    ...(p.opacity !== undefined ? { opacity: p.opacity } : {}),
  };
}
const setItem = (p: Partial<ItemStyle>, writeSelection: boolean): void => {
  const next = mergeItemStyle(item, p);
  const sel = selectTool.selection();
  if (writeSelection && sel.length > 0) run({ type: "SetStyle", ids: [...sel], patch: patchOf(p) });
  if (next !== item) { item = next; for (const cb of itemListeners) cb(item); }
  requestScene();
  emit();
};
// dans l'objet engine :
setItemStyle(p) { setItem(p, true); },
itemStyle: () => item,
onItemStyle(cb) { itemListeners.add(cb); return () => itemListeners.delete(cb); },
setPenStyle(s) {
  if (typeof s.color !== "string" || s.color === "" || !Number.isFinite(s.width) || !(s.width > 0)) return;
  setItem({ color: s.color, width: s.width }, false);
},
deleteSelection() {
  const sel = selectTool.selection();
  if (sel.length === 0) return false;
  engine.deleteElements(sel);
  return true;
},
duplicateSelection() {
  const sel = selectTool.selection();
  if (sel.length === 0) return false;
  const change = engine.insertFragment(doc.extract(pageId, sel), 10, 10);
  return change !== null && change.ids.length > 0;
},
```
  `state()` expose `itemStyle: item` ; dans `key(e)`, avant le bloc `edit !== null` : `if (objectKey(e) === "duplicate") return engine.duplicateSelection() || selectTool.selection().length > 0;` ; le bloc `edit === "delete"` appelle `engine.deleteSelection()`. `textStyle` lit `item.color`. `EngineDeps` gagne `itemStyle?: ItemStyle`.
- [ ] 7. `tools/shape.ts` : le brouillon garde `seed: number | null` tiré à l'ouverture (`item.roughness > 0 ? newSeed() : null`) ; `look = lookFrom(style(), d.seed)` ; `AddShape` reçoit `fill: d.style.background` (rect/ellipse, sinon `null`) et `...(look ? { look } : {})` ; `live()` pousse `{ …, fill: d.style.background, look, seed: d.seed ?? undefined }`. `tools/pen.ts` : `CommitStroke` reçoit `look` = `lookFrom({ strokeStyle: "solid", roughness: 0, roundness: "sharp", opacity: style().opacity }, null)` si défini ; `live()` porte `opacity: style().opacity` quand < 100. `tools/text.ts` : boîte neuve → `look` d'opacité de même.
- [ ] 8. `board-session.ts` : champs `itemStyle?`, `onItemStyle?` de `SessionShared`, passés à `createEngine` (`:314`) et branchés sur `engine.onItemStyle`. `main.ts` : l'objet `shared` (passé à `createBoardSession`, `:390`) reçoit `itemStyle: () => deviceSettings.itemStyle(), onItemStyle: (s) => void deviceSettings.setItemStyle(s)` (nom de la variable `DeviceSettings` créée `:255`).
- [ ] 9. `annotation-page.ts` : `viewOf` ajoute `itemStyle: engine.itemStyle()`.
- [ ] 10. Commande bornée → verte.
- [ ] 11. Commit (12 fichiers un par un) : `feat(engine): current item style, duplicate and delete selection` + Co-Authored-By, auteur G8.

<a id="tache-t10"></a>
### Tâche T10 — Panneau `OptionsPanel`

**Objectif** : l'îlot à gauche, sous la rangée du haut, avec ses sections, valeurs mixtes, repli gardé par profil, cibles ≥ 44 px et navigation au clavier.

**Fichiers** : créer `apps/web/src/ui/OptionsPanel.tsx`, `OptionsPanel.test.tsx` ; modifier `ui/RadioChoices.tsx` (+ `RadioChoices.test.tsx`), `ui/icons.ts`, `ui/rb.css`, `ui/island-place.ts` (+ `island-place.test.ts`), `ui/App.tsx` (montage à côté d'`IslandLayer`, `:438-470`).

**Interfaces** :
- Consomme : T6 `sectionsFor`, `formValue`, `WIDTHS`, `strokePicks`, `backgroundPicks`, `showsPanel` ; T9 `engine.setItemStyle`, `itemStyle`, `duplicateSelection`, `deleteSelection`, `state().selection`, `state().tool` ; T3 lecteurs de `Look`.
- Produit :
```ts
export interface OptionsPanelProps {
  readonly engine: Accessor<Engine>;
  readonly state: Accessor<EngineState>;
  readonly presets: Accessor<Profile["presets"]>;
  readonly size: Accessor<ButtonSize>;
  readonly profileId: Accessor<string>;
  readonly settings: DeviceSettings;
  readonly annotating: Accessor<boolean>;
  readonly sideStart: Accessor<Box | null>; // null tant qu'OG4 n'a pas de barre latérale
}
export function OptionsPanel(props: OptionsPanelProps): JSX.Element;
export function placeOptions(area: Box, sideStart: Box | null, tops: number): Point; // island-place.ts
// RadioChoicesProps.value : T | null (null = mixte, aucun bouton enfoncé, premier bouton tabulable)
```
  Sélecteurs : racine `[data-options]` (`data-mixed` posé sur chaque section mixte), section `[data-option="<OptionKey>"]`, choix `[data-option-value="<valeur>"]`, repli `[data-options-toggle]`, actions `[data-option-value="duplicate"]`, `[data-option-value="delete"]`.
- Réutilise : `apps/web/src/ui/RadioChoices.tsx:31` — `RadioChoices<T>({ name, label, look: "segment", options, value, choose })` ; `value: T | null` (étendre).
- Réutilise : `apps/web/src/ui/IconButton.tsx:102`, `ui/tooltip.ts` — `IconButton({ icon, label, attrs, onPress })` (réutiliser).
- Réutilise : `apps/web/src/device-settings.ts:61-63` `island`, `setIsland` — `island(profileId, "options").collapsed`, `setIsland(profileId, "options", { at: null, collapsed })` (réutiliser).
- Réutilise : `apps/web/src/ui/island-place.ts:63,82` `laneOf`, `placeIsland` — `placeOptions(area: Box, sideStart: Box | null, tops: number): Point` (étendre).
- Rapport : une ligne `Réutilisation :` par ligne ci-dessus.

**Rendu des sections** : Trait = 5 pastilles `strokePicks` (pastille `button` ≥ cible, `aria-pressed`, `data-option-value=<couleur>`) ; Arrière-plan = 5 pastilles `backgroundPicks` (transparent : pastille barrée, `data-option-value="transparent"`) ; Largeur = `RadioChoices` `WIDTHS` (largeur hors 2/4/8 : `value` `null`) ; Style du trait = `solid`/`dashed`/`dotted` (icônes neuves) ; Style de tracé = `0`/`1`/`2` (Architecte, Artiste, Caricaturiste) ; Angles = `sharp`/`round` ; Transparence = `<input type="range" min=0 max=100 step=10>` haut de 44 px, écrit sur `change` (pas sur `input`), « Mixte » affiché tant que la valeur est mixte ; Actions = `IconButton` `copy-plus` « Dupliquer » et `trash-2` « Supprimer ». Valeur affichée : `formValue(cibles, lecteur, itemStyle[clé])`. Replié : seul `IconButton` `sliders-horizontal` « Options de l'outil ». Largeur : `5 × cible + 4 × 4 + 2 × 12` (260 px en S). Hauteur bornée, `overflow-y: auto`. Position : `placeOptions(area, sideStart(), hauteur des îlots du haut)` = `{ x: sideStart ? sideStart.w + GAP : EDGE, y: tops + GAP }` (la boîte `sideStart` est relative au bord gauche de la zone).

**Icônes à ajouter** (`icons.ts`, Lucide ISC tel quel) : `copy-plus`, `trash-2`, `sliders-horizontal`, `chevron-left`, `chevron-right` ; dessinées (même style, trait 1,5) : `stroke-solid` (`M4 12h16`), `stroke-dashed` (`M4 12h3 M10.5 12h3 M17 12h3`), `stroke-dotted` (`M4 12h.01 M8 12h.01 M12 12h.01 M16 12h.01 M20 12h.01` avec `stroke-linecap` rond), `sloppiness-0` (`M4 16c4-8 12-8 16 0`), `sloppiness-1` (`M4 16c3-7 6-9 8-6s5 3 8 6`), `sloppiness-2` (`M4 15c2-6 4-7 5-4s2 4 4 1 3-5 4-2 2 4 3 5`), `corner-sharp` (`M6 18V6h12`), `corner-round` (`M6 18v-6a6 6 0 0 1 6-6h6`), `transparent` (`rect` 4,4,16,16 + `path` `M4 20 20 4`). Mention ISC conservée en tête du fichier.

**Test et commande bornée** :
```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-2/apps/web && nice -n 10 pnpm exec vitest run src/ui 2>&1 | tail -15 && cd ../.. && bash scripts/tests/controle-icones.test.sh 2>&1 | tail -3
```
Preuve : `Tests N passed` incluant `OptionsPanel rectangle : 7 sections`, `mixte : data-mixed et aucun segment enfoncé`, `transparence écrite au relâché`, `repli gardé`, `masqué avec Sélection sans sélection` ; `Toolbar.test.tsx`, `App.test.tsx`, `SelectionRow.test.tsx`, `FormatRow.test.tsx`, `rb-css.test.ts` verts ; contrôle des icônes code 0.

**Preuve visuelle** : à T11 (captures 2x et lectures d'abord).

**Contraintes** : G3 (icônes Lucide ISC, trait 1,5, `ICON_VIEWBOX`, jetons, `--rb-btn-*`) ; G4 (cibles = taille du profil, ≥ 44 px ; pointeur ; Tab, flèches) ; G5 (rangées `PresetRow`, `SelectionRow`, `FormatRow` inchangées dans la barre) ; G8 ; G9 ; G11 (ne pas toucher barre latérale, barre des pages) ; aucun `title` (infobulle maison).

**Interdits** : le panneau n'est pas une barre de profil (pas de changement du schéma de profil, ni de `ProfileEditor.tsx`) ; ne reprend aucun bouton des rangées de la barre ; pas de mode compact.

**Terminé** : commande verte ; `tsc --noEmit` code 0 ; `pnpm --filter @roomboard/web build` code 0.

**Étapes** :
- [ ] 1. `RadioChoices.test.tsx` : `it("value null : aucun enfoncé, premier tabulable", …)` (aucun `aria-checked="true"`, premier bouton `tabIndex` 0).
- [ ] 2. `island-place.test.ts` : `placeOptions({ w: 1280, h: 900 }, null, 64)` → `{ x: 16, y: 72 }` ; `placeOptions({ w: 1280, h: 900 }, { w: 80, h: 900 }, 64)` → `{ x: 88, y: 72 }`.
- [ ] 3. `OptionsPanel.test.tsx` (rouge), monté avec un faux moteur (objet qui enregistre `setItemStyle`) :
```tsx
it("OptionsPanel rectangle : 7 sections", () => {
  const { container } = mount({ tool: "rect", selection: [] });
  expect([...container.querySelectorAll("[data-option]")].map((e) => e.getAttribute("data-option"))).toEqual(
    ["strokeColor", "background", "strokeWidth", "strokeStyle", "roughness", "roundness", "opacity"]);
});
it("masqué avec Sélection sans sélection", () => {
  const { container } = mount({ tool: "select", selection: [] });
  expect(container.querySelector("[data-options]")).toBeNull();
});
it("mixte : data-mixed et aucun segment enfoncé", () => {
  const { container } = mount({ tool: "select", selection: [rectEl("a", "#000000"), rectEl("b", "#dc2626")] });
  const s = container.querySelector('[data-option="strokeColor"]')!;
  expect(s.hasAttribute("data-mixed")).toBe(true);
  expect(s.querySelector('[aria-pressed="true"]')).toBeNull();
});
it("toucher une pastille écrit le style", () => {
  const { container, calls } = mount({ tool: "rect", selection: [] });
  container.querySelector<HTMLButtonElement>('[data-option="strokeStyle"] [data-choice="dashed"]')!.click();
  expect(calls).toContainEqual({ strokeStyle: "dashed" });
});
it("transparence écrite au relâché", () => {
  const { container, calls } = mount({ tool: "rect", selection: [] });
  const r = container.querySelector<HTMLInputElement>('[data-option="opacity"] input[type="range"]')!;
  r.value = "50"; r.dispatchEvent(new Event("input", { bubbles: true }));
  expect(calls).toEqual([]);
  r.dispatchEvent(new Event("change", { bubbles: true }));
  expect(calls).toContainEqual({ opacity: 50 });
});
it("repli gardé", () => {
  const { container, settings } = mount({ tool: "rect", selection: [] });
  container.querySelector<HTMLButtonElement>("[data-options-toggle]")!.click();
  expect(settings.island("p", "options").collapsed).toBe(true);
  expect(container.querySelector("[data-option]")).toBeNull();
});
it("cibles à la taille du profil (S 44, M 48, L 64)", () => {
  for (const [size, px] of [["s", "44px"], ["m", "48px"], ["l", "64px"]] as const) {
    const { container, unmount } = mount({ tool: "rect", selection: [], size });
    const root = container.querySelector<HTMLElement>("[data-options]")!;
    expect(root.style.getPropertyValue("--rb-btn-size")).toBe(px); // posé par le panneau depuis BUTTON_PX, aucune valeur par défaut
    for (const b of root.querySelectorAll<HTMLElement>("button")) expect(b.style.getPropertyValue("--rb-btn-size")).toBe("");
    unmount();
  }
});
```
  (Sur `data-choice` : RadioChoices pose `data-choice` ; le panneau pose aussi `data-option-value` sur les pastilles et boutons qui ne sont pas des `RadioChoices`. Pour l'essai, `[data-option="strokeStyle"] [data-choice="dashed"]` vaut `[data-option-value]` : ajoute `data-option-value` à chaque bouton de `RadioChoices` par une prop facultative `valueAttr?: string`, sans toucher `data-choice`.)
- [ ] 4. Lancer → rouge.
- [ ] 5. `RadioChoices.tsx` : `readonly value: T | null;` et `readonly valueAttr?: string;` ; `known()` faux quand `value === null` ; sur chaque bouton `{...(props.valueAttr ? { [props.valueAttr]: o.value } : {})}`.
- [ ] 6. `island-place.ts` : `export function placeOptions(area: Box, sideStart: Box | null, tops: number): Point { return { x: sideStart ? sideStart.w + GAP : EDGE, y: Math.min(tops + GAP, Math.max(EDGE, area.h - EDGE)) }; }`.
- [ ] 7. `OptionsPanel.tsx` : composant Solid ; `const targets = createMemo(() => props.state().selection.map((id) => props.engine().doc.element(id)).filter(isEl))` (prends l'accès au document que l'interface utilise déjà, `workspace` ou `engine`) ; `const keys = createMemo(() => showsPanel(tool, n, annotating) ? sectionsFor(tool, targets(), false) : [])` ; `<Show when={keys().length > 0}>` ; racine `<aside class="rb-island rb-options" data-options style={{ left, top, width, "--rb-btn-size": `${BUTTON_PX[props.size()]}px` }}>` (`BUTTON_PX`, `island-place.ts:28`) ; en tête `IconButton` `chevron-left`/`chevron-right` `[data-options-toggle]` « Replier les options » / « Déplier les options » ; `<For each={keys()}>` → `<section class="rb-options-sec" data-option={k} data-mixed={mixed(k) || undefined}><h3>{LABEL[k]}</h3>…</section>` avec `LABEL = { strokeColor: "Trait", background: "Arrière-plan", strokeWidth: "Largeur du contour", strokeStyle: "Style du trait", roughness: "Style de tracé", roundness: "Angles", opacity: "Transparence", actions: "Actions" }`. Chaque choix appelle `props.engine().setItemStyle({ … })` ; Dupliquer → `duplicateSelection()`, Supprimer → `deleteSelection()`. Les pastilles empêchent `pointerdown` par défaut quand une saisie de texte est ouverte (`FormatRow.tsx:51`).
- [ ] 8. `rb.css` : `.rb-options { position: absolute; max-height: calc(100% - var(--rb-options-top, 72px) - 88px); overflow-y: auto; padding: 12px; display: grid; gap: 12px; }`, `.rb-options-sec h3 { font: var(--rb-font-label); color: var(--rb-text-muted); margin: 0 0 4px; }`, `.rb-swatch { width: var(--rb-btn-size); height: var(--rb-btn-size); border-radius: var(--rb-radius-s); }`, `.rb-swatch[aria-pressed="true"] { box-shadow: 0 0 0 2px var(--rb-accent); }`, `.rb-options input[type="range"] { width: 100%; height: 44px; }` — jetons existants seulement (`grep -n "^\s*--rb-" ui/rb.css`).
- [ ] 9. `App.tsx` : `<OptionsPanel …/>` monté à côté d'`<IslandLayer …/>`, avec `sideStart={() => null}` (OG4 la passera), `annotating`, `profileId`, `settings`.
- [ ] 10. Commande bornée → verte ; `pnpm --filter @roomboard/web build` code 0.
- [ ] 11. Commit (10 fichiers un par un) : `feat(ui): tool options panel (Excalidraw layout)` + Co-Authored-By, auteur G8.

<a id="tache-t11"></a>
### Tâche T11 — Essai navigateur, captures 2x, netteté § 10 (lot 1)

**Objectif** : prouver S1 à S5 au doigt puis au clavier dans Chromium, garder verts les essais anciens, produire les captures 2x avant/après et le contrôle de netteté § 10 du panneau et du menu.

**Fichiers** : créer `scripts/essais/personnalisation-2-navigateur.mjs` ; modifier `scripts/essais/commun.mjs` (`foldOptions`), au besoin une ligne d'amorce dans `c3-groupes-navigateur.mjs`, `c13-tableaux-navigateur.mjs`, `design-l1-navigateur.mjs`, `c15-3d-navigateur.mjs` ; `scripts/verifier.sh` (l'essai neuf dans la liste `--e2e`, à côté de `design-l4`) ; créer `docs/design/captures/personnalisation-2/` (`avant-rect.png`, `apres-rect.png`, `apres-mixte.png`, `apres-menu.png`, `apres-replie.png`).

**Interfaces** :
- Consomme : sélecteurs de T10 (`[data-options]`, `[data-option]`, `[data-option-value]`, `[data-mixed]`, `[data-options-toggle]`), de T7 (`[data-menu-list] [data-item] [data-shortcut]`), `#stage[data-selection]` ; API de page des essais existants ; `cli` de T5.
- Produit : `export async function foldOptions(page, profileId = null)` dans `commun.mjs` — pose avant `goto`, par `page.addInitScript`, la clé d'îlot de `device-settings.ts` pour la barre `"options"` à `{ collapsed: true }` (lis le nom exact de la clé dans `device-settings.ts`).
- Réutilise : `scripts/essais/commun.mjs` `loadPlaywright`, `serve`, `clickItem`, `item`, `inkIn`, `frames` ; `scripts/essais/nettete.mjs` `pixelsOf`, `edgeRow`, `fringes`, `hex` (réutiliser).
- Rapport : `Réutilisation : appelé commun.mjs, nettete.mjs`.

**Preuve visuelle** (d'abord des lectures, ensuite l'image) : l'essai imprime et vérifie
- `-Lire "[data-options] présent=1"`, `-Lire "[data-option] (rect)=strokeColor,background,strokeWidth,strokeStyle,roughness,roundness,opacity"`,
  `-Lire "largeur [data-options] en S=260"`, `-Lire "hauteur min des boutons du panneau≥44"`, `-Lire "[data-shortcut] de file-open=Ctrl+O"`,
  `-Lire "élément posé : strokeStyle=dashed roughness=1 roundness=round opacity=50 width=8"`, `-Lire "empreinte aperçu=empreinte posé"` ;
- puis les captures 2x (`deviceScaleFactor: 2`, `--disable-lcd-text`, `--force-color-profile=srgb`) ; **avant** : construire `origin/main` (`git -C /home/adminjd/projets/roomboard-wt/personnalisation-2 worktree add /tmp/p2-avant origin/main` interdit sous `~/RoomFlow`, permis ici sous `/tmp` ; ou `--dist` d'un build de `45484db` posé hors du dépôt) et lancer l'essai avec `--dist <dossier> --nom avant` ; **après** : le build du worktree. Décrire au rapport ce que montre chaque capture (place de l'îlot, sections, pastille barrée, menu et raccourcis).
- Netteté § 10 (`docs/plans/design-cadrage.md`) : `edgeRow`/`fringes` sur le bord d'un segment enfoncé du panneau, sur les icônes `stroke-dashed` et `corner-round`, et sur une ligne du menu ; seuils de `design-l4-navigateur.mjs` ; contre-épreuve floue qui doit échouer.

**Test et commande bornée** :
```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-2 && <lignes Wasm de G13> && nice -n 10 cargo build -p roomboard-shell --bin roomboard-office -j 4 2>&1 | tail -2 && pnpm --filter @roomboard/cli build 2>&1 | tail -2 && nice -n 10 pnpm --filter @roomboard/web build 2>&1 | tail -2 && nice -n 10 node scripts/essais/personnalisation-2-navigateur.mjs 2>&1 | tail -20 && nice -n 10 node scripts/essais/personnalisation-2-navigateur.mjs --captures 2>&1 | tail -5
for e in c1-profils c3-groupes c5-image c6a-pot c7b-texte-riche c10a-tableau c13-tableaux c15-3d design-l1 design-l2 design-l3; do nice -n 10 node scripts/essais/$e-navigateur.mjs >/tmp/p2-$e.log 2>&1; echo "$e $?"; done
node ~/.claude/scripts/vm/suite-vm.cjs -- nice -n 10 bash scripts/verifier.sh --e2e 2>&1 | tail -30
```
Preuve : lignes `S1 OK`, `S2 OK`, `S3 OK`, `S4 OK`, `S5 OK`, `netteté § 10 OK`, code 0 ; chacun des 11 essais anciens `… 0` ; `verifier.sh --e2e` code 0, avec `CLI : OK` et les tailles Wasm sous plafond dans la sortie ; 5 fichiers PNG dans `docs/design/captures/personnalisation-2/`.

**Scénarios joués** (cadrage § 6, tels quels) : S1 (1-5, `roomboard state` sur le fichier enregistré par la CLI de T5) ; S2 (1-4, rechargement compris) ; S3 (1-5 ; l'étape 5 vise un **trait du stylo** en transparence 40 coupé par la gomme partielle — écart au cadrage écrit en tête du plan ; le rappeler au rapport) ; S4 (1-2) ; S5 (1-4). Gestes au doigt (`hasTouch`, `page.touchscreen.tap`, glisser par `page.mouse` en pointeur tactile comme les essais existants), puis clavier.

**Contraintes** : G13 (Wasm construit en tête de commande) ; G4 ; G5 (essais anciens : au plus une ligne `await foldOptions(page)` d'amorce, seulement s'ils échouent à cause du panneau ; aucune réécriture de fond) ; G9 (`suite-vm.cjs`, `nice`, un essai en délai dépassé se rejoue une fois) ; G10 (fichiers d'essai depuis `scripts/essais/fabriques` et les fixtures) ; G8 ; G11.

**Interdits** : pas d'essai joué avec `--captures` dans `verifier.sh` ; aucune écriture hors du dossier temporaire et de `docs/design/captures/personnalisation-2/`.

**Terminé** : toutes les preuves ci-dessus ; le rapport liste les lectures `-Lire` obtenues, les tailles Wasm, et chaque essai ancien qui a reçu une ligne d'amorce.

**Étapes** :
- [ ] 1. Écrire l'essai en suivant la structure de `design-l4-navigateur.mjs` (en-tête de commentaire, `LABEL = "personnalisation-2"`, `ARGS`, `VIEW = VIEWPORT`, codes de sortie 0/1/2, `--captures`, `--dist`, `--nom`), une fonction par scénario `async function s1(page) { … console.log("S1 OK"); }` qui lève `Echec` au premier écart.
- [ ] 2. Lancer sur le build actuel → les scénarios échouent tant que T10 n'est pas fusionné dans le worktree (rouge attendu si lancé avant) ; après, vert.
- [ ] 3. Ajouter `foldOptions` à `commun.mjs` ; jouer les 11 essais anciens ; n'ajouter l'amorce qu'à ceux qui échouent à cause du panneau (montrer la ligne d'échec au rapport).
- [ ] 4. Captures avant/après et netteté ; ajouter l'essai à `verifier.sh` (bloc `--e2e`).
- [ ] 5. `verifier.sh --e2e` par `suite-vm.cjs` → code 0.
- [ ] 6. Commit (fichiers un par un, PNG compris) : `test(e2e): personalisation-2 lot 1 browser trial, 2x captures and sharpness` + Co-Authored-By, auteur G8.

---

# Lot 2

> Le lot 2 part seulement si le lot 1 est vert (T11) et que l'horaire le permet ; sinon chaque tâche ci-dessous est recopiée au bloc
> final comme reste à faire. Mêmes contraintes globales, recopiées par section.

<a id="tache-t12"></a>
### Tâche T12 — Cœur lot 2 : champs d'aspect

**Objectif** : `fillStyle`, `startArrowhead`, `endArrowhead`, `textAlign`, `link` lus, écrits par `SetStyle` et les créations, traversant le pont, le faux cœur et la CLI.

**Fichiers** : `crates/roomboard-core/src/element.rs`, `src/style.rs`, `tests/look.rs`, `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/look.ts`, `look.test.ts`, `core/wasm-core.ts`, `core/fake-core.ts`, `core/fake-core.test.ts`, `apps/cli/src/formats.ts`, `scripts/essais/cli-essai.mjs`.

**Interfaces** :
- Consomme : T1 `Look`, T2 `StylePatch`, `writes_for`, T4 pont et faux cœur.
- Produit : `Look` gagne `fill_style: Option<String>` (`"hachure"`, `"cross-hatch"`), `start_arrowhead`, `end_arrowhead: Option<String>` (`"none"`, `"arrow"`, `"triangle"`, `"triangle_outline"` ; défaut lu : début `none`, fin `arrow` — une valeur égale au défaut n'est pas écrite), `text_align: Option<String>` (`"center"`, `"right"`), `link: Option<String>` (`http:`, `https:`, `mailto:` ; ≤ 2 048 caractères). `StylePatch` gagne les mêmes en `Option<Option<String>>`. Applicabilité : `fillStyle` → rect/ellipse ; pointes → `arrow` ; `textAlign` → `text` ; `link` → tout élément sauf `fill`. TS : `Look`, `LookPatch` et `toLook` étendus à l'identique.
- Réutilise : `crates/roomboard-core/src/fill.rs:112-130` `set_or_remove` (appelée par `cmd_set_style`) ; `crates/roomboard-core/src/element.rs:308,316` (`look_fields`, `read_look` étendus).
- Rapport : `Réutilisation : appelé set_or_remove, look_fields/read_look`.

**Test et commande bornée** :
```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-2 && nice -n 10 cargo test -p roomboard-core --test look -j 4 2>&1 | tail -15 && (cd apps/web && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm exec vitest run src/core 2>&1 | tail -6) && nice -n 10 node scripts/essais/cli-essai.mjs 2>&1 | tail -3
```
Preuve : tests `bad_link_refused`, `arrowhead_default_not_written`, `text_align_on_text_only` `ok` ; contrat TS vert sur les deux cœurs ; `CLI : OK`. Tailles Wasm sous plafond (construire comme T4), valeurs au rapport.

**Contraintes** : G13 (pont changé : reconstruire le Wasm) ; G6 (note `FORMAT_LOTS` complétée : « options d'aspect (strokeStyle, roughness, roundness, opacity, fillStyle, arrowheads, textAlign, link) » ; bloc CLI : `SetStyle` `link: "javascript:alert(1)"` → code 1) ; G7 ; G8 ; G9 ; G12.

**Interdits** : aucune valeur de lien hors des trois schémas ; pas de `Any::Map`.

**Terminé** : commande verte, clippy `-D warnings` propre.

**Patron à ne pas reprendre** : écrire `endArrowhead: "arrow"` sur chaque flèche (le défaut) change les octets des fichiers anciens ; le défaut n'est jamais écrit. Référence : `look_fields` de T1 (`element.rs`).

**Étapes** :
- [ ] 1. Tests Rust (rouge) dans `tests/look.rs` :
```rust
#[test]
fn bad_link_refused() {
    let mut d = blank();
    let a = rect(&mut d, Look::default());
    for bad in ["javascript:alert(1)", "ftp://x", &"h".repeat(2049)] {
        let r = d.apply(Command::SetStyle { ids: vec![a.clone()], patch: StylePatch { link: Some(Some(bad.to_string())), ..Default::default() } });
        assert_eq!(r, Err(CommandError::BadStyle));
    }
    d.apply(Command::SetStyle { ids: vec![a.clone()], patch: StylePatch { link: Some(Some("https://example.org".into())), ..Default::default() } }).unwrap();
    assert_eq!(d.element(&a).unwrap().look.unwrap().link.as_deref(), Some("https://example.org"));
}
#[test]
fn arrowhead_default_not_written() {
    let mut d = blank();
    let page = first_page(&d);
    let a = d.apply(Command::AddShape { page, shape: ShapeKind::Arrow, x0: 0.0, y0: 0.0, x1: 50.0, y1: 0.0, style: pen(), fill: None, look: Look::default() }).unwrap().ids[0].clone();
    let c = d.apply(Command::SetStyle { ids: vec![a.clone()], patch: StylePatch { end_arrowhead: Some(Some("arrow".into())), ..Default::default() } }).unwrap();
    assert!(c.ids.is_empty());
    d.apply(Command::SetStyle { ids: vec![a.clone()], patch: StylePatch { start_arrowhead: Some(Some("triangle".into())), end_arrowhead: Some(Some("none".into())), ..Default::default() } }).unwrap();
    let l = d.element(&a).unwrap().look.unwrap();
    assert_eq!((l.start_arrowhead.as_deref(), l.end_arrowhead.as_deref()), (Some("triangle"), Some("none")));
}
#[test]
fn text_align_on_text_only() {
    let mut d = blank();
    let a = rect(&mut d, Look::default());
    let c = d.apply(Command::SetStyle { ids: vec![a], patch: StylePatch { text_align: Some(Some("center".into())), ..Default::default() } }).unwrap();
    assert!(c.ids.is_empty());
}
```
- [ ] 2. Lancer → rouge. 3. Étendre `Look::sanitized`, `look_fields`, `read_look` (mêmes formes que T1), `StylePatch::validate` (`valid_link(s) = s.len() <= 2048 && (s.starts_with("http://") || s.starts_with("https://") || s.starts_with("mailto:"))`), `writes_for` (pointes : `Some("none")` en début et `Some("arrow")` en fin → `None`, retrait). 4. Pont : `set_style` gagne les paires `*_set: bool, *: Option<String>` ; `look_of` aussi. 5. TS : `look.ts`, `toLook`, `wasm-core.ts`, `fake-core.ts` (mêmes règles), test de contrat `Lien : javascript refusé, sur les deux cœurs`. 6. CLI : note et bloc d'essai. 7. Commande bornée → verte. 8. Commit fichier par fichier : `feat(core): fill style, arrowheads, text align and link fields` + Co-Authored-By, auteur G8.

<a id="tache-t13"></a>
### Tâche T13 — Cœur lot 2 : `Restack` (DA-2)

**Objectif** : une commande d'ordre minimale (ou celle d'OG4 si fusionnée), en une étape, pilotable par la CLI.

**Fichiers** : créer `crates/roomboard-core/src/order.rs`, `tests/order.rs` ; modifier `src/lib.rs`, `src/commands.rs`, `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/api.ts`, `core/wasm-core.ts`, `core/fake-core.ts`, `core/fake-core.test.ts`, `apps/cli/src/ops.ts`, `ops.test.ts`, `formats.ts`, `scripts/essais/cli-essai.mjs`.

**Interfaces** :
- Produit : `Command::Restack { ids: Vec<String>, to: u32 }` ; `CommandError::BadOrder` (« ordre invalide ») ; TS `{ readonly type: "Restack"; readonly ids: readonly string[]; readonly to: number }` ; Wasm `pub fn restack(&mut self, ids: Vec<String>, to: u32) -> Result<JsValue, JsError>`. Règles : ids d'une même page, bloc gardé dans son ordre relatif, `to` = rang du bas du bloc après déplacement (0 = arrière-plan, `n - k` = premier plan), ids gardés, une étape ; même ordre : aucune étape ; page mêlée, rang hors bornes, id inconnu : `BadOrder` (id inconnu : `UnknownElement` si le cœur le distingue déjà ailleurs ; choisir `BadOrder` pour s'en tenir à DA-2).
- Réutilise : « ordre des objets (lot 2) » — **d'abord `git -C /home/adminjd/projets/roomboard-wt/personnalisation-2 fetch origin`, puis `git -C … log origin/main --oneline -20 | grep -i "personnalisation-1a\|OG4"`** : si OG4 est fusionné, réutiliser ses commandes et méthodes, ne pas créer `order.rs`, et écrire `Réutilisation : appelé <commande d'OG4>` ; sinon `Command::Restack { ids: Vec<String>, to: u32 }`, `CommandError::BadOrder`, nouveau module minimal, et `Réutilisation : écart — OG4 non fusionné (DA-2), conflit noté`.
- Rapport : la ligne `Réutilisation :` ci-dessus et une ligne « conflit OG4 à trancher au bloc final ».

**Test et commande bornée** :
```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-2 && nice -n 10 cargo test -p roomboard-core --test order -j 4 2>&1 | tail -12 && (cd apps/web && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm exec vitest run src/core 2>&1 | tail -5) && nice -n 10 node scripts/essais/cli-essai.mjs 2>&1 | tail -2
```
Preuve : ≥ 5 tests `order` `ok` (`restack_to_front`, `restack_keeps_relative_order`, `restack_same_order_no_step`, `restack_mixed_pages_refused`, `restack_out_of_range_refused`) ; test TS `Restack : une étape, sur les deux cœurs` ; `CLI : OK`.

**Contraintes** : G13 (pont changé : reconstruire le Wasm) ; G6 (`COMMAND_TYPES` + `"Restack"`, note `FORMAT_LOTS`, `ops.test.ts`, bloc d'essai `Restack` puis `undo`) ; G7 ; G8 ; G9 ; G11 (pas d'onglet Calques, pas de mode de page).

**Interdits** : ne pas reprendre `reinsert_kept` ni `BadIndex` d'OG4 (absents de `main`) ; aide locale privée à `cmd_restack`.

**Terminé** : commande verte, clippy propre, tailles Wasm au rapport.

**Patron à ne pas reprendre** : retirer puis réinsérer élément par élément dans plusieurs transactions (une étape par élément) ; ici une seule `transact_local`, retraits en indices décroissants puis insertions des `prelim` recopiés (comme la gomme, `commands.rs:1300-1320`).

**Étapes** :
- [ ] 1. `tests/order.rs` (rouge) :
```rust
use roomboard_core::commands::{Command, CommandError};
use roomboard_core::document::Document;
use roomboard_core::element::{Look, StrokeStyle};
use roomboard_core::shape::ShapeKind;

fn add(d: &mut Document) -> String {
    let page = d.page_ids()[0].clone();
    d.apply(Command::AddShape { page, shape: ShapeKind::Rect, x0: 0.0, y0: 0.0, x1: 10.0, y1: 10.0, style: StrokeStyle { color: "#000000".into(), width: 4.0 }, fill: None, look: Look::default() }).unwrap().ids[0].clone()
}
fn order(d: &Document) -> Vec<String> { let p = d.page_ids()[0].clone(); d.element_ids(&p) }

#[test]
fn restack_to_front() {
    let mut d = Document::blank();
    let (a, b, c) = (add(&mut d), add(&mut d), add(&mut d));
    d.apply(Command::Restack { ids: vec![a.clone()], to: 2 }).unwrap();
    assert_eq!(order(&d), vec![b.clone(), c.clone(), a.clone()]);
    d.undo();
    assert_eq!(order(&d), vec![a, b, c]);
}
#[test]
fn restack_keeps_relative_order() {
    let mut d = Document::blank();
    let (a, b, c, e) = (add(&mut d), add(&mut d), add(&mut d), add(&mut d));
    d.apply(Command::Restack { ids: vec![c.clone(), a.clone()], to: 0 }).unwrap();
    assert_eq!(order(&d), vec![a, c, b, e]);
}
#[test]
fn restack_same_order_no_step() {
    let mut d = Document::blank();
    let a = add(&mut d);
    add(&mut d);
    let c = d.apply(Command::Restack { ids: vec![a], to: 0 }).unwrap();
    assert!(c.ids.is_empty());
}
#[test]
fn restack_out_of_range_refused() {
    let mut d = Document::blank();
    let a = add(&mut d);
    assert_eq!(d.apply(Command::Restack { ids: vec![a], to: 5 }), Err(CommandError::BadOrder));
}
#[test]
fn restack_mixed_pages_refused() {
    let mut d = Document::blank();
    let a = add(&mut d);
    d.apply(Command::AddPage { after: None }).unwrap();
    let p2 = d.page_ids()[1].clone();
    let b = d.apply(Command::AddShape { page: p2, shape: ShapeKind::Rect, x0: 0.0, y0: 0.0, x1: 1.0, y1: 1.0, style: StrokeStyle { color: "#000000".into(), width: 4.0 }, fill: None, look: Look::default() }).unwrap().ids[0].clone();
    assert_eq!(d.apply(Command::Restack { ids: vec![a, b], to: 0 }), Err(CommandError::BadOrder));
}
```
  (`element_ids(page)` : `document.rs:332`.)
- [ ] 2. Rouge. 3. `order.rs` : lecture (page commune, indices, `to + k ≤ n`), ordre visé calculé (`rest = ids hors bloc` ; `rest.splice(to, 0, bloc)`), égal à l'ordre actuel → `unchanged()` ; sinon une transaction : pour chaque élément du bloc, `prelim` recopiant tous ses champs (la même recopie que `copy.rs` utilise), retrait en indices décroissants, insertion aux rangs visés, mêmes ids. 4. Pont, API, faux cœur, CLI. 5. Commande bornée → verte. 6. Commit fichier par fichier : `feat(core): minimal Restack command (DA-2)` + Co-Authored-By, auteur G8.

<a id="tache-t14"></a>
### Tâche T14 — Rendu lot 2 : hachures, pointes, alignement, polices

**Objectif** : hachures et hachures croisées (roughjs), pointes de flèche (aucune, flèche, triangle, triangle creux), `textAlign`, et repli générique des polices.

**Fichiers** : `apps/web/src/engine/render/sketch.ts`, `sketch.test.ts`, `canvas2d.ts`, `canvas2d.test.ts`, `apps/web/src/engine/text-layout.ts`, `text-layout.test.ts`.

**Interfaces** :
- Consomme : T12 `Look.fillStyle`, `startArrowhead`, `endArrowhead`, `textAlign`.
- Produit : `sketchShape` gère `fillStyle` (`hachureGap = 4 * w`, `fillWeight = w / 2`, comme `shape.ts:221-225`) — un fond non transparent avec `fillStyle` passe par roughjs **même en Architecte** (`roughness: 0`) ; `export function arrowhead(ctx, kind: "arrow" | "triangle" | "triangle_outline", tipX, tipY, fromX, fromY, width): void` dans `canvas2d.ts` (ailes de `arrowWings`, collision inchangée) ; `paintText` aligne chaque ligne (`x = boxWidth - lineWidth` à droite, `/2` au centre) ; `textFont(size, face?)` : `"Georgia"` → `"Georgia, serif"`, `"Courier New"` → `"\"Courier New\", monospace"`, sans police : chaîne **inchangée**.
- Réutilise : `crates/roomboard-core/src/shape.rs:52` `arrow_wings` ; `core/shapes.ts` `arrowWings` — inchangées (réutiliser).
- Réutilise : `apps/web/src/engine/render/canvas2d.ts:225,243` `traceShape`, `paintShape` (étendre).
- Rapport : une ligne `Réutilisation :` pour chacun.

**Test et commande bornée** :
```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-2/apps/web && nice -n 10 pnpm exec vitest run src/engine/render src/engine/text-layout.test.ts 2>&1 | tail -12
```
Preuve : tests `police absente : chaîne inchangée`, `hachures déterministes`, `pointe triangle pleine`, `texte centré` listés, `Tests N passed`.

**Contraintes** : G1 (mention MIT de `sketch.ts` déjà posée ; compléter la référence `shape.ts:221-225`) ; G2 ; G8 ; G9 ; export PDF « au mieux » pour les polices (résultat consigné au rapport, non bloquant).

**Interdits** : ne pas toucher `rich-edit.ts` ni `FormatRow.tsx` ; ne pas changer `shape_polygon`.

**Terminé** : commande verte ; `record-ctx.test.ts` vert.

**Étapes** :
- [ ] 1. Tests (rouge) :
```ts
it("police absente : chaîne inchangée", () => {
  expect(textFont(24)).toBe(textFontBefore24); // relève la valeur actuelle de textFont(24) avant la modification et fige-la ici
  expect(textFont(24, { font: "Georgia" } as never)).toContain("Georgia, serif");
});
it("hachures déterministes", () => {
  const a = new RecordingContext2D(); const b = new RecordingContext2D();
  sketchShape(a as never, { shape: "rect", w: 100, h: 50, fill: "#fef08a" }, pen, { fillStyle: "hachure" }, 3);
  sketchShape(b as never, { shape: "rect", w: 100, h: 50, fill: "#fef08a" }, pen, { fillStyle: "hachure" }, 3);
  expect(JSON.stringify(a.ops())).toBe(JSON.stringify(b.ops()));
});
it("pointe triangle pleine", () => {
  const c = fakeCtx();
  paintShape(c, { shape: "arrow", w: 100, h: 0, fill: null }, pen, { endArrowhead: "triangle" });
  expect(c.calls.some((x) => x.name === "fill")).toBe(true);
});
it("texte centré", () => {
  const c = fakeCtx();
  paintTextForTest(c, oneLine("Bonjour", 70), "#000000", 200, "center");
  expect(c.calls.find((x) => x.name === "fillText")!.args[1]).toBe(65);
});
```
  (`paintTextForTest` : exporte `paintText` avec deux paramètres neufs `boxWidth`, `align` ; `oneLine` : construis une `RichLine` de largeur 70.)
- [ ] 2. Rouge. 3. Implémenter (`sketch.ts` : options `fillStyle`, `hachureGap`, `fillWeight` ; `canvas2d.ts` : `arrowhead`, début de flèche par `arrowWings` inversé, `paintText(ctx, lines, color, boxWidth, align)` ; `text-layout.ts` : repli). 4. Vert. 5. Commit fichier par fichier : `feat(render): hachures, arrowheads, text alignment and font fallbacks` + Co-Authored-By, auteur G8.

<a id="tache-t15"></a>
### Tâche T15 — Panneau lot 2 : Remplissage, Texte, Pointes, Disposition

**Objectif** : les sections `fillStyle`, `font`, `fontSize`, `textAlign`, `arrowheads`, `layers` du panneau, les méthodes d'ordre du moteur et `orderKey`.

**Fichiers** : `apps/web/src/ui/tool-options.ts`, `tool-options.test.ts`, `ui/OptionsPanel.tsx`, `OptionsPanel.test.tsx`, `ui/icons.ts`, `engine/engine.ts`, `engine/engine.test.ts`, `engine/input/keys.ts`, `keys.test.ts`, `ui/shortcuts.ts`.

**Interfaces** :
- Consomme : T12, T13, T14 ; T6, T9, T10.
- Produit : `OptionKey` gagne `"fillStyle" | "font" | "fontSize" | "textAlign" | "arrowheads" | "layers"` (ordre d'Excalidraw : strokeColor, background, fillStyle, strokeWidth, strokeStyle, roughness, roundness, font, fontSize, textAlign, arrowheads, opacity, layers, actions) ; `fillStyle` visible seulement si le fond n'est pas transparent ; `disabledIn("font" | "fontSize" | "strokeColor", true) === true` ; `Engine.bringToFront()`, `sendToBack()`, `bringForward()`, `sendBackward(): boolean` (un `Restack`) ; `export type OrderKey = "front" | "back" | "forward" | "backward"; export function orderKey(e: KeyLike): OrderKey | null` (Ctrl+Maj+↑, Ctrl+Maj+↓, Ctrl+↑, Ctrl+↓) ; `SHORTCUTS` gagne Premier plan, Avancer, Reculer, Arrière-plan. Police et taille : `{ type: "FormatText", id, start: 0, len, attrs: [{ font }] | [{ size }] }` ; `TEXT_SIZES` 24/36/48/72 ; polices Normale, Georgia, Courier New.
- Réutilise : `crates/roomboard-core/src/commands.rs:93` `FormatText` ; `engine/rich-edit.ts:11` `FormatAction` — `{ type: "FormatText", id, start: 0, len, attrs: [{ font }] | [{ size }] }` (réutiliser).
- Réutilise : `apps/web/src/engine/input/keys.ts:25` `keyAction` — `orderKey` au contrat d'OG4 (étendre).
- Réutilise : « ordre des objets (lot 2) » — commandes de T13 (ou d'OG4 si fusionné).
- Rapport : une ligne `Réutilisation :` par ligne.

**Test et commande bornée** :
```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-2/apps/web && nice -n 10 pnpm exec vitest run src/ui src/engine/engine.test.ts src/engine/input/keys.test.ts 2>&1 | tail -12
```
Preuve : tests `en saisie Police grisée`, `orderKey`, `bringToFront une étape`, `fillStyle masqué si fond transparent`, `chaque raccourci a son reconnaisseur` (avec les 4 neufs) listés ; aucun `FAIL `.

**Contraintes** : G3 (icônes `arrow-up-to-line`, `arrow-down-to-line`, `chevron-up`, `chevron-down`, `align-left`, `align-center`, `align-right` Lucide ; trois remplissages et quatre pointes dessinés au même trait 1,5) ; G4 (boutons d'Alignement et de Transparence qui empêchent `pointerdown` en saisie, `FormatRow.tsx:51`) ; G5 ; G8 ; G9 ; G11.

**Interdits** : `FormatRow` inchangée ; en saisie, le Trait du panneau n'efface pas les couleurs de plage (H17).

**Terminé** : commande verte, contrôle des icônes code 0.

**Étapes** :
- [ ] 1. Tests (rouge) : `tool-options.test.ts` (`sectionsFor("text", [], true)` contient `font`, `fontSize`, `textAlign` ; `disabledIn("font", true)` vrai ; `sectionsFor("rect", [rectAvecFond], false)` contient `fillStyle`, sans fond non) ; `keys.test.ts` (`orderKey` des 4 combinaisons, nul en champ) ; `engine.test.ts` (`bringToFront` : une étape, ordre lu) ; `OptionsPanel.test.tsx` (Police grisée `disabled` pendant une saisie ouverte ; Alignement actif).
- [ ] 2. Rouge. 3. Implémenter (lignes de table, rendu des sections par `RadioChoices` et `IconButton`, méthodes du moteur appelant `run({ type: "Restack", ids, to })` avec `to` calculé sur l'ordre de la page, branchement `orderKey` dans `engine.key`). 4. Vert. 5. Commit fichier par fichier : `feat(ui): fill, text, arrowhead and layer options` + Co-Authored-By, auteur G8.

<a id="tache-t16"></a>
### Tâche T16 — Sélecteur de couleur, touches S et G

**Objectif** : la 6e pastille ouvre un popover open-color 15 × 5 et un champ hexadécimal ; S ouvre le Trait, G le Fond.

**Fichiers** : créer `apps/web/src/ui/ColorPicker.tsx`, `ColorPicker.test.tsx`, `apps/web/src/ui/open-color.ts` ; modifier `ui/OptionsPanel.tsx`, `THIRD_PARTY_NOTICES.md`, `ui/rb.css`, `engine/input/keys.ts`, `keys.test.ts`.

**Interfaces** :
- Produit : `export function ColorPicker(props: { value: string | null; choose(c: string): void; close(): void; anchor: HTMLElement }): JSX.Element` (`[data-color-picker]`, grille `role="grid"`, flèches, Entrée, Échap → focus rendu à `anchor`) ; `open-color.ts` : `export const OPEN_COLOR: readonly (readonly string[])[]` (15 teintes × 5 nuances recopiées de `colors.ts:299-322`, mention MIT open-color) ; `objectKey` gagne `"stroke-picker"` (S) et `"fill-picker"` (G), hors champ, sans modificateur, hors composition.
- Réutilise : `apps/web/src/engine/render/webgl2.ts:22` `tryParseColor` — validation du champ hexadécimal (réutiliser).
- Réutilise : `apps/web/src/engine/input/keys.ts:25` (étendre `objectKey`).
- Rapport : une ligne `Réutilisation :` par ligne.

**Test et commande bornée** :
```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-2/apps/web && nice -n 10 pnpm exec vitest run src/ui/ColorPicker.test.tsx src/engine/input/keys.test.ts 2>&1 | tail -10
```
Preuve : tests `Échap rend le focus`, `hexadécimal invalide refusé`, `flèches dans la grille`, `S ouvre le trait` listés.

**Contraintes** : G1 (open-color MIT : mention en tête de `open-color.ts`, ligne `THIRD_PARTY_NOTICES.md`) ; G4 (cases ≥ 44 px en S si la place le permet, sinon grille à défilement ; aucun glisser) ; G8 ; G9. H8 : pas de pipette, pas de lettres q-w-e.

**Interdits** : `OptionsPanel.tsx` est touché seulement ici dans la vague V10 (T17 ne le touche pas).

**Terminé** : commande verte ; `node scripts/controle-licences.mjs` code 0.

**Étapes** :
- [ ] 1. Tests (rouge) : montage, `keydown` `ArrowRight` déplace le focus d'une case, `Enter` appelle `choose`, `Escape` appelle `close` et le focus revient à `anchor` ; champ `#12345` refusé, `#123456` accepté ; `objectKey({ key: "s", … })` → `"stroke-picker"`, en champ → `null`.
- [ ] 2. Rouge. 3. Implémenter. 4. Vert. 5. Commit fichier par fichier : `feat(ui): full colour picker with S and G shortcuts` + Co-Authored-By, auteur G8.

<a id="tache-t17"></a>
### Tâche T17 — Menu lot 2 : Aide, Effacer la page, Ctrl+Maj+E

**Objectif** : entrées Aide (`?`) et Effacer la page dans le menu livré, panneau « Aide — raccourcis », Ctrl+Maj+E sur l'export PDF.

**Fichiers** : créer `apps/web/src/ui/HelpPanel.tsx`, `HelpPanel.test.tsx` ; modifier `ui/App.tsx` (`Panel` reçoit `"help"`), `apps/web/src/toolbar.ts` (`ACTION_TABLE` : `help`, `page-clear`), `toolbar-profiles.ts`, `toolbar-profiles.test.ts`, `app/toolbar-host.ts`, `toolbar-host.test.ts`, `platform/controller.ts`, `controller.test.ts`, `main.ts` (touche `?`), `ui/shortcuts.ts`, `ui/shortcuts.test.ts`.

**Interfaces** :
- Produit : `HelpPanel` (`[data-panel="aide"]`, liste `SHORTCUTS` par groupe, Échap ferme) ; `ACTIONS.help(t)` → `t.toggle("help")` ; `ACTIONS["page-clear"](t)` → `shell.confirm("Effacer tout le contenu de la page ? Ctrl+Z le rétablit.")` puis `Delete` de tous les objets de la page montrée (une étape ; grisé sur une page vide) ; `FileCommand` gagne `"exportPdf"` (Ctrl+Maj+E) ; menu livré : `…, sep("sep-5"), …, action("export-pdf", …), …, sep("sep-6"), action("help", "Aide"), action("page-clear", "Effacer la page"), action("grid", "Grille"), action("settings", "Réglages"), menu-profiles (inchangé)`.
- Réutilise : `apps/web/src/app/toolbar-host.ts:61` `ACTIONS` — `ACTIONS.help(t)`, `ACTIONS["page-clear"](t)` ; `HostTargets.toggle("help")` (étendre).
- Réutilise : `apps/web/src/platform/controller.ts:74` `fileCommandOf` — `FileCommand` reçoit `"exportPdf"` (étendre).
- Réutilise : `apps/web/src/ui/App.tsx` `props.shell.confirm` — `shell.confirm(message): Promise<boolean>` (réutiliser).
- Réutilise : `apps/web/src/ui/MenuBar.tsx:47` `Row` (raccourci de T7, rien de neuf).
- Rapport : une ligne `Réutilisation :` par ligne.

**Test et commande bornée** :
```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-2/apps/web && nice -n 10 pnpm exec vitest run src/ui/HelpPanel.test.tsx src/platform/controller.test.ts src/app/toolbar-host.test.ts src/toolbar-profiles.test.ts src/ui/shortcuts.test.ts 2>&1 | tail -10
```
Preuve : tests `page-clear confirme`, `page-clear refusé : rien`, `Ctrl+Maj+E exporte`, `Aide liste Dupliquer`, `menu livré lot 2` listés.

**Contraintes** : G4 ; G5 (`design-l2-navigateur.mjs` vert : mêmes attributs) ; G8 ; G9 ; G11 (fond, grille et mode de page restent après Effacer). `ACTION_REQUIRES` (`toolbar.ts:634`) : les actions neuves n'exigent aucune capacité.

**Interdits** : ne pas toucher `OptionsPanel.tsx` (T16 dans la même vague) ; `?` seulement hors champ, sans modificateur autre que Maj, hors composition.

**Terminé** : commande verte, `tsc --noEmit` code 0.

**Étapes** :
- [ ] 1. Tests (rouge) : `toolbar-host.test.ts` (`confirm` faux → aucune commande ; vrai → un `Delete` des ids de la page, `undo` les rend) ; `controller.test.ts` (Ctrl+Maj+E → `"exportPdf"`, Ctrl+E → `null`) ; `HelpPanel.test.tsx` (« Dupliquer » et « Ctrl+D » présents ; Échap ferme) ; `toolbar-profiles.test.ts` (ordre du groupe `vue`).
- [ ] 2. Rouge. 3. Implémenter ; `SHORTCUTS` gagne `export-pdf` Ctrl+Maj+E et `help` `?` (T15 a ajouté l'ordre ; ce fichier est touché par T15 en V9, ici en V10 sans recouvrement — `shortcuts.ts` est dans les fichiers de T15 ; T17 n'y écrit que deux lignes après T15). 4. Vert. 5. Commit fichier par fichier : `feat(ui): help panel, clear page and Ctrl+Shift+E` + Co-Authored-By, auteur G8.

<a id="tache-t18"></a>
### Tâche T18 — Lien (H5)

**Objectif** : Ctrl+K ou le bouton Lien posent un lien sur un seul élément ; un badge en haut à droite ; le toucher avec l'outil Sélection l'ouvre (navigateur : `window.open(url, "_blank", "noopener")` ; coque : `tauri-plugin-opener`).

**Fichiers** : créer `apps/web/src/ui/LinkPopover.tsx`, `LinkPopover.test.tsx` ; modifier `ui/OptionsPanel.tsx`, `engine/render/canvas2d.ts` (badge), `engine/engine.ts` (toucher du badge, `objectKey` `"link"`), `apps/web/src/platform/shell.ts` (`ShellPort.openLink(url: string): void`), `apps/desktop/src-tauri/Cargo.toml`, `apps/desktop/src-tauri/capabilities/default.json`, `apps/desktop/src-tauri/src/lib.rs`, `THIRD_PARTY_NOTICES.md`.

**Interfaces** :
- Consomme : T12 `link` ; T15/T16 `objectKey`.
- Produit : `LinkPopover({ value, submit(url: string | null), close })` ; `ShellPort.openLink(url)` ; Entrée valide (un `SetStyle { link }`), champ vide retire, schéma hors `http`, `https`, `mailto` refusé dans l'interface **et** par le cœur.
- Réutilise : `apps/web/src/engine/input/keys.ts:25` (`objectKey` `"link"`, Ctrl+K).
- Rapport : `Réutilisation : appelé keys.ts objectKey` ; `tauri-plugin-opener` (MIT ou Apache-2.0) ajouté, poids du binaire noté.

**Test et commande bornée** :
```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-2/apps/web && nice -n 10 pnpm exec vitest run src/ui/LinkPopover.test.tsx src/engine/engine.test.ts 2>&1 | tail -8 && cd ../.. && bash scripts/tests/coque-csp.test.sh 2>&1 | tail -3
```
Preuve : tests `javascript: refusé`, `Entrée valide une étape`, `vide retire` ; CSP code 0. **Aucun `tauri build` (interdit du brief OG11)** : la coque se contrôle par `nice -n 10 cargo check -p roomboard-desktop -j 4` (nom du paquet à lire dans `apps/desktop/src-tauri/Cargo.toml`) et `bash scripts/tests/coque-csp.test.sh`.

**Contraintes** : G2 (`tauri-plugin-opener` seule dépendance ajoutée, mention dans `THIRD_PARTY_NOTICES.md`) ; G4 ; G8 ; G9 ; capacité limitée à `opener:allow-open-url` avec motifs `http://*`, `https://*`, `mailto:*`.

**Interdits** : aucun `shell.open` générique ; aucune URL ouverte sans geste de l'utilisateur.

**Terminé** : commande verte ; si le temps manque (H5), la tâche est écrite au bloc final et le reste du lot 2 reste fusionnable.

**Patron à ne pas reprendre** : `window.open(url)` sans `noopener` ni contrôle de schéma ; référence Excalidraw `actionLink.tsx:40-62` (contrôle) et `docs/plans/personnalisation-2-cadrage.md` déc. 38.

**Étapes** :
- [ ] 1. Tests (rouge) : popover — `javascript:alert(1)` + Entrée → `submit` non appelé, message d'erreur visible ; `https://example.org` → `submit("https://example.org")` ; vide → `submit(null)`. Moteur — Ctrl+K avec un seul élément sélectionné ouvre le popover (état `linkEditing`), avec deux : rien.
- [ ] 2. Rouge. 3. Implémenter (popover, badge 16 px en haut à droite de la boîte de l'élément lié dans `paintElement`, toucher du badge en outil Sélection → `shell.openLink`) ; coque : plugin, capacité, `lib.rs` `.plugin(tauri_plugin_opener::init())`. 4. Vert. 5. Commit fichier par fichier : `feat: element links with safe opener` + Co-Authored-By, auteur G8.

<a id="tache-t19"></a>
### Tâche T19 — Essai lot 2, captures 2x, netteté § 10

**Objectif** : prouver S6 à S8 et refaire les captures et la netteté pour les sections du lot 2.

**Fichiers** : `scripts/essais/personnalisation-2-navigateur.mjs` (option `--lot 2`), `docs/design/captures/personnalisation-2/` (`apres-texte.png`, `apres-fleche.png`, `apres-selecteur.png`, `apres-aide.png`).

**Interfaces** :
- Consomme : sélecteurs `[data-color-picker]`, `[data-panel="aide"]`, `[data-option="textAlign"]`, `[data-option="arrowheads"]`, `[data-option="layers"]`.
- Réutilise : `scripts/essais/commun.mjs`, `scripts/essais/nettete.mjs` (réutiliser).
- Rapport : `Réutilisation : appelé commun.mjs, nettete.mjs`.

**Preuve visuelle** : lectures d'abord — `-Lire "S6 pixel au chevauchement=couleur du rectangle"`, `-Lire "textAlign=center font=Georgia size=48"`, `-Lire "Police disabled en saisie=true"`, `-Lire "startArrowhead=triangle endArrowhead=none"`, `-Lire "[data-panel=aide] contient Ctrl+D Dupliquer"`, `-Lire "page vide après Effacer=0 objet ; après Ctrl+Z=n"` ; puis captures 2x décrites au rapport ; netteté § 10 sur les icônes d'alignement, de pointes et la grille du sélecteur.

**Test et commande bornée** :
```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-2 && nice -n 10 pnpm --filter @roomboard/web build 2>&1 | tail -2 && nice -n 10 node scripts/essais/personnalisation-2-navigateur.mjs --lot 2 2>&1 | tail -12 && node ~/.claude/scripts/vm/suite-vm.cjs -- nice -n 10 bash scripts/verifier.sh --e2e 2>&1 | tail -25
```
Preuve : `S6 OK`, `S7 OK`, `S8 OK`, `netteté § 10 OK`, code 0 ; `verifier.sh --e2e` code 0 avec `CLI : OK` et tailles Wasm sous plafond.

**Contraintes** : G4 ; G5 ; G8 ; G9 (un test en délai dépassé se rejoue une fois) ; G10 ; G11.

**Interdits** : pas de réécriture des scénarios S1 à S5.

**Terminé** : preuves ci-dessus ; S8.5 (Lien) marqué « sauté, T18 au bloc final » si T18 n'est pas fait.

**Étapes** :
- [ ] 1. Ajouter `s6`, `s7`, `s8` (gestes au doigt puis clavier) et l'option `--lot 2`. 2. Jouer → vert. 3. Captures et netteté. 4. Suite complète par `suite-vm.cjs`. 5. Commit fichier par fichier : `test(e2e): personalisation-2 lot 2 trial and captures` + Co-Authored-By, auteur G8.

---

## Relecture (faite par le planificateur)

- Couverture du cadrage : déc. 1-4 → T6, T10 ; 5 → T6, T15 ; 6 → T10 (interdit) ; 7-8 → T6 ; 9 → T16 ; 10-15 → T1, T2, T8, T10 ; 16-17 → T12, T14, T15 ; 18 → hors périmètre ; 19 → T12, T14, T15 ; 20 → T13, T15 ; 21 → T9 ; 22 → T6, T10 ; 23 → T3, T9 ; 24-26 → T1, T2, T12 ; 27 → T8, T14 ; 28 → T8 (test vectoriel), T14 ; 29 → T5, T12, T13 ; 30 → T4, T12, T13 ; 31-33 → T7, T17 ; 34 → T7 (aucune entrée morte) ; 35-36 → T17 ; 37 → T10, T15, T16 ; 38 → T18 ; 39 → T7, T15, T16, T17 ; 40 → T9 (constats `:45`, `:35`), T10 (`--rb-btn-*`).
- Effets de bord : panneau sur la bande gauche → T11 (`foldOptions`, 4 essais) ; gomme et `look` → T1 `erase_partial_keeps_look`, T4 ; style gardé → T9 `style courant relu` ; menu livré → T7 `menu livré : Profil en dernier` ; `textFont` → T14 `police absente : chaîne inchangée` ; opacité du canvas d'interaction → T8 `opacité du trait vif`.
- Écarts : S3.5 (trait du stylo au lieu d'un rectangle en tirets) et opacité 0..100 : écrits en tête du plan (arbitrages de l'orchestrateur, relecture tour 1).
