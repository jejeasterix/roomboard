# personnalisation-3-tableau — plan de la suite (mineurs PR 74, lot B restant, lot C)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**But** : finir le tableau réglable (ajuster au contenu, alignement, bordures par case, déplacer une ligne ou une
colonne) et le tableau de classe (case cachée qui se referme, tri, tableau de tri), après les mineurs de la PR 74.

**Architecture** : la page calcule (largeur naturelle, cadre aligné, ordre, règle d'étiquettes), le cœur écrit (DA2, DA4).
Deux commandes Rust neuves seulement (DS1, DS2) : `SetTableLook` (clés de case `ha`, `va`, `border`, `open`, clé de colonne
`accept`) et `ReorderTableLines`. Options dans l'accordéon d'OG23 (`ui/TableOptions.tsx`, DS10).

**Pile** : Rust (`yrs`) + `wasm-bindgen`, TypeScript et Solid (vitest), Playwright (essai navigateur).

**Spec** : `docs/plans/personnalisation-3-tableau-cadrage.md` (§ 9 « Suite OG32 » : DS1 à DS16, S7 à S14 ; D14 à D21, D35).

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Mineurs PR 74 : bouton En-tête enfoncé, zone d'en-tête entière, `scaleOf` exporté, tests manquants | — | apps/web/src/ui/{item-state.ts,item-state.test.ts,Toolbar.tsx}, apps/web/src/engine/render/{table-paint.ts,table-paint.test.ts}, apps/web/src/engine/{table-geom.ts,engine.test.ts}, apps/web/src/engine/tools/{table.ts,table.test.ts}, apps/web/src/toolbar.test.ts | partagé | implementeur-tdd | vitest `-t "PR 74\|dix actions"` : 7 passés (6 « PR 74 » + le titre « dix actions ») | S10 | #tache-t1 |
| T2 | Cœur : `SetTableLook` (ha, va, border, open, accept), lecture tolérante, export Wasm | — | crates/roomboard-core/src/{table.rs,table_look.rs,commands.rs,lib.rs}, crates/roomboard-wasm/src/lib.rs | isolé | implementeur-tdd | `cargo test -p roomboard-core table_look` : 8 passés dont `look_reload_keeps_bytes`, `old_reader_ignores_look_keys` ; `cargo test -p roomboard-wasm set_table_look` : 1 ; commande M : principal ≤ 1 532 864, formats ≤ 3 104 768 | S8, S9, S12, S14, S17 | #tache-t2 |
| T3 | Contrat TS de `SetTableLook` : api, vrai et faux cœur, CLI | T2 | apps/web/src/core/{api.ts,wasm-core.ts,fake-core.ts,wasm-core.contract.test.ts}, apps/cli/src/{ops.ts,ops.test.ts,formats.ts,formats.test.ts}, scripts/essais/cli-essai.mjs | partagé | concepteur-critique | contrat `-t "SetTableLook"` : 10 passés (5 × 2 fabriques, « vrai module wasm » présent) ; `ops.test.ts`, `formats.test.ts` verts ; `cli-essai.mjs` : T-S8, T-S9, T-S12, T-S14 puis `CLI : OK` | S8, S9, S12, S14, S16 | #tache-t3 |
| T4 | `ReorderTableLines` : cœur, Wasm, contrat, CLI | T3 | crates/roomboard-core/src/{table_links.rs,commands.rs}, crates/roomboard-wasm/src/lib.rs, apps/web/src/core/{api.ts,wasm-core.ts,fake-core.ts,wasm-core.contract.test.ts}, apps/cli/src/{ops.ts,ops.test.ts,formats.ts,formats.test.ts}, scripts/essais/cli-essai.mjs | partagé | concepteur-critique | `cargo test -p roomboard-core reorder` : 5 passés dont `reorder_refuses_cut_merge`, `reorder_moves_linked_objects` ; contrat `-t "ReorderTableLines"` : 6 ; `cli-essai.mjs` : T-S11 puis `CLI : OK` ; commande M | S11, S13, S16, S17 | #tache-t4 |
| T5 | Point 7 : double appui et Alt+A, ajuster au contenu | T1 | apps/web/src/engine/{table-geom.ts,table-geom.test.ts}, apps/web/src/engine/tools/{table.ts,table.test.ts}, apps/web/src/engine/input/{keys.ts,keys.test.ts}, apps/web/src/ui/{shortcuts.ts,shortcuts.test.ts} | isolé | implementeur-tdd | vitest `-t "naturalWidth\|S7"` : 6 passés ; `keys.test.ts`, `shortcuts.test.ts` verts | S7 | #tache-t5 |
| T6 | Point 8 : alignement, un seul calcul (`cellTextFrame`, `lineShift`) lu par dessin, pot et saisie | T3, T5 | apps/web/src/engine/{text-layout.ts,text-layout.test.ts,table-geom.ts,table-geom.test.ts,fill-target.ts,fill-target.test.ts,engine.ts,engine.test.ts}, apps/web/src/engine/tools/{table.ts,table.test.ts,text.ts,tool.ts}, apps/web/src/engine/render/{canvas2d.ts,canvas2d.test.ts}, apps/web/src/engine/input/{keys.ts,keys.test.ts}, apps/web/src/ui/{shortcuts.ts,shortcuts.test.ts}, apps/web/src/app/{text-editor.ts,stage-tags.ts,board-session.ts} | partagé | concepteur-critique | vitest `-t "D15\|lineShift\|cellTextFrame"` : 8 passés ; `zone-s6-banc.test.ts` : ligne `S6 empreinte :` identique à celle d'avant la tâche | S8 | #tache-t6 |
| T7 | Point 9 : bordures par case (dessin par bord, Alt+B, Alt+Maj+B) | T6 | apps/web/src/engine/render/{table-paint.ts,table-paint.test.ts}, apps/web/src/app/{pdf-overlay-vector.test.ts,stage-tags.ts,board-session.ts}, apps/web/src/engine/table-geom.ts, apps/web/src/engine/tools/{table.ts,table.test.ts}, apps/web/src/engine/input/{keys.ts,keys.test.ts}, apps/web/src/ui/{shortcuts.ts,shortcuts.test.ts} | partagé | implementeur-tdd | vitest `-t "S9"` : 6 passés dont « S9 PDF » ; tests existants de `table-paint.test.ts` verts sans retouche | S9 | #tache-t7 |
| T8 | Point 11 : déplacer une ligne ou une colonne (poignées 44 px, Ctrl+Maj+flèches) | T4, T7 | apps/web/src/engine/{table-geom.ts,table-geom.test.ts,engine.test.ts}, apps/web/src/engine/tools/{table.ts,table.test.ts}, apps/web/src/engine/render/{overlay.ts,canvas2d.ts}, apps/web/src/engine/input/{keys.ts,keys.test.ts}, apps/web/src/ui/{shortcuts.ts,shortcuts.test.ts}, apps/web/src/app/{stage-tags.ts,board-session.ts}, THIRD_PARTY_NOTICES.md | partagé | implementeur-tdd | vitest `-t "S11\|movedOrder\|keepsMerges"` : 10 passés | S11 | #tache-t8 |
| T9 | Panneau d'options du tableau (accordéon : Objets, Alignement, Bordures, Lignes) | T8 | apps/web/src/ui/{TableOptions.tsx,TableOptions.test.tsx,OptionsPanel.tsx,OptionsPanel.test.tsx,tool-options.ts,tool-options.test.ts,icons.ts,icons.test.ts,rb.css}, apps/web/src/engine/table-geom.ts, apps/web/src/engine/tools/table.ts, THIRD_PARTY_NOTICES.md | partagé | implementeur-tdd | vitest `-t "DS10"` : 9 passés ; `icons.test.ts` vert (133 icônes) | S7, S8, S9, S10 | #tache-t9 |
| T10 | Essai navigateur et captures du lot B, suite complète | T9 | scripts/essais/personnalisation-3-suite-navigateur.mjs, scripts/verifier.sh, scripts/tests/verifier-e2e.test.sh, scripts/essais/{c10a-tableau-navigateur.mjs,c10b-tableau-navigateur.mjs,c13-tableaux-navigateur.mjs,personnalisation-3-tableau-navigateur.mjs}, docs/design/captures/personnalisation-3-tableau/{ajuste-avant,ajuste-apres,alignement-avant,alignement-apres,bordures-avant,bordures-apres,ligne-avant,ligne-apres}.png | partagé | implementeur-tdd | essai : `ok — S7`, `ok — S8`, `ok — S9`, `ok — S10`, `ok — S11` puis `personnalisation-3 suite : OK` ; `verifier.sh --e2e` : `verifier.sh : e2e OK` | S7, S8, S9, S10, S11 | #tache-t10 |
| T11 | Point 12 : cache qui s'ouvre et se referme (toucher, Alt+O, dessin ouvert) | T10 | apps/web/src/engine/tools/{select.ts,select.test.ts,table.ts,table.test.ts}, apps/web/src/engine/render/{table-paint.ts,table-paint.test.ts}, apps/web/src/engine/{table-geom.ts,fill-target.ts,fill-target.test.ts,engine.ts}, apps/web/src/engine/input/{keys.ts,keys.test.ts}, apps/web/src/ui/{shortcuts.ts,shortcuts.test.ts}, apps/web/src/app/{stage-tags.ts,board-session.ts} | partagé | implementeur-tdd | vitest `-t "S12\|F10"` : 10 passés | S12 | #tache-t11 |
| T12 | Point 13 : trier selon une colonne (Alt+T, Alt+Maj+T, panneau, menu) | T11 | apps/web/src/engine/{table-geom.ts,table-geom.test.ts}, apps/web/src/engine/tools/{table.ts,table.test.ts}, apps/web/src/engine/input/{keys.ts,keys.test.ts}, apps/web/src/ui/{shortcuts.ts,shortcuts.test.ts,TableOptions.tsx,TableOptions.test.tsx,cell-menu.ts,cell-menu.test.ts,icons.ts,icons.test.ts}, THIRD_PARTY_NOTICES.md | partagé | implementeur-tdd | vitest `-t "S13\|sortedRows"` : 8 passés ; `icons.test.ts` vert (135 icônes) | S13 | #tache-t12 |
| T13 | Point 14 : tableau de tri (règle d'étiquettes au relâché, champ « Accepte ») | T12 | apps/web/src/engine/tools/{cell-drop.ts,cell-drop.test.ts,select.ts,table.ts}, apps/web/src/engine/{table-geom.ts,table-geom.test.ts}, apps/web/src/ui/{TableOptions.tsx,TableOptions.test.tsx,OptionsPanel.tsx,tool-options.ts,tool-options.test.ts} | partagé | concepteur-critique | vitest `-t "S14\|acceptsDrop\|parseLabels"` : 10 passés | S14 | #tache-t13 |
| T14 | Essai navigateur et captures du lot C, suite complète | T13 | scripts/essais/personnalisation-3-suite-navigateur.mjs, docs/design/captures/personnalisation-3-tableau/{cache-ferme,cache-ouvert,tri-avant,tri-apres,tableau-tri-avant,tableau-tri-apres}.png | partagé | implementeur-tdd | essai : `ok — S12`, `ok — S13`, `ok — S14` puis `personnalisation-3 suite : OK` ; `verifier.sh --e2e` : `verifier.sh : e2e OK` | S12, S13, S14 | #tache-t14 |

**Frontière des lots** : lot B = T1 à T10 (une PR, fusionnable seule quand T10 est vert) ; lot C = T11 à T14 (seconde PR).
**Vagues** : {T1, T2} en parallèle (T2 n'écrit que dans `crates/`) ; puis T3 ; {T4, T5} en parallèle (T5 n'écrit que dans
le moteur et `ui/shortcuts*`, T4 que dans `crates/`, `core/` et la CLI) ; puis T6 → T14 en série. `isolé` = worktree
`…/personnalisation-3-tableau-suite--T<n>` posé par l'orchestrateur et fusionné à la fin de la vague ; `partagé` = le
worktree du chantier. Ordre de coupe si le temps manque : T14 → T11 (lot C entier), puis T8 ; une tâche coupée devient une
hypothèse de l'état, jamais un comportement à moitié livré.

## Carte des fichiers

| fichier | rôle | tâches |
|---|---|---|
| `crates/roomboard-core/src/table_look.rs` (nouveau) | `CellLook`, contrôles, `cmd_set_table_look`, lectures `read_border`, `read_accept`, tests | T2 |
| `crates/roomboard-core/src/table.rs` | `RawCell.{ha,va,border,open}`, `TableCellView`, `TableColView.accept`, `targets`/`rect`/`key` en `pub(crate)`, Ombrer retire `open` | T2 |
| `crates/roomboard-core/src/table_links.rs` | `cmd_reorder_table_lines`, tests | T4 |
| `crates/roomboard-core/src/commands.rs`, `crates/roomboard-wasm/src/lib.rs` | variantes et exports `set_table_look`, `reorder_table_lines` | T2, T4 |
| `apps/web/src/core/{api,wasm-core,fake-core}.ts`, contrat | types `CellLook`, `TableBorder`, parité | T3, T4 |
| `apps/cli/src/{ops,formats}.ts`, `scripts/essais/cli-essai.mjs` | CLI (D15 du profil) | T3, T4 |
| `apps/web/src/engine/table-geom.ts` | `scaleOf` (T1) ; `naturalWidth`, `DOUBLE_TAP_*` (T5) ; `cellLook`, `cellTextFrame`, `TableCellState.{ha,va}` (T6) ; `.border` (T7) ; `movedOrder`, `keepsMerges`, `moveGrips`, `lineAt`, `.column` (T8) ; `.fit` (T9) ; `.open` (T11) ; `sortedRows` (T12) ; `acceptsDrop`, `parseLabels`, `.accept` (T13) | T1, T5–T9, T11–T13 |
| `apps/web/src/engine/tools/table.ts` | gestes et actions de chaque point | T1, T5–T9, T11–T13 |
| `apps/web/src/engine/text-layout.ts` | `lineShift`, `offsetAt(…, align)` | T6 |
| `apps/web/src/engine/render/{table-paint,canvas2d,overlay}.ts` | en-tête (T1), `paintCellTexts` (T6), bordures (T7), poignées de déplacement (T8), cache ouvert (T11) | T1, T6, T7, T8, T11 |
| `apps/web/src/engine/input/keys.ts`, `ui/shortcuts.ts` | `tableKey` étendu, lignes `SHORTCUTS` | T5–T8, T11, T12 |
| `apps/web/src/ui/TableOptions.tsx` (nouveau) | corps des sections `table*` | T9, T12, T13 |
| `scripts/essais/personnalisation-3-suite-navigateur.mjs` (nouveau) | S7 à S14 | T10, T14 |

## Global Constraints

- G1 TDD : test rouge d'abord, vu rouge par la commande bornée, puis le code, puis vert.
- G2 Worktree : `WT=/home/adminjd/projets/roomboard-wt/personnalisation-3-tableau-suite` (tâche `isolé` : le worktree que
  donne l'orchestrateur) ; toute commande Bash commence par `cd $WT &&`.
- G3 VM partagée : builds et tests en `nice -n 10`, `cargo … -j 4` ; une suite complète passe par
  `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; preuves bornées (`… 2>&1 | tail -N`), N ≥ 1 test exécuté et
  nom attendu présent.
- G4 Taille Wasm (DS2) : module principal ≤ 1 572 864 o (aujourd'hui 1 456 551 o après `-Oz`), `formats` ≤ 3 145 728 o
  (2 795 907 o) ; aucun seuil ne bouge, `opt-level = "z"` refusé ; toute tâche qui touche le Rust mesure les deux par la
  commande M et **s'arrête** si principal > 1 532 864 o ou formats > 3 104 768 o (marge < 40 Ko). Ce qui peut vivre en TS y vit.
- G5 Fichier (U3) : champs facultatifs seulement, `schema` et `formatVersion` inchangés ; valeur illisible ignorée et
  gardée ; un ancien fichier s'ouvre ; un fichier neuf s'ouvre dans une version d'avant sans planter (test dédié).
- G6 CLI (D15 du profil) : commande neuve dans `COMMAND_TYPES`, `ops.test.ts`, la ligne `.roomboard` de `FORMAT_LOTS`
  (note), `formats.test.ts` et `scripts/essais/cli-essai.mjs`.
- G7 Une étape d'annulation par geste : un geste = une commande du cœur = une transaction ; aucun `runAll` ; aucune
  écriture pendant un glisser (écriture au relâché) ; rien ne change : aucune commande.
- G8 Tactile d'abord : événements de pointeur du moteur, jamais le glisser HTML5 ni `contextmenu` (U12, U24) ; cibles
  ≥ 44 px ; appui long (500 ms) au lieu du clic droit.
- G9 Raccourcis (DS11) : chaque geste a son raccourci, lu par `code`, vérifié libre, ajouté à `SHORTCUTS` avec sa ligne
  `EXPECT` de `shortcuts.test.ts` et à la liste `table` du test « fusion OG23 × OG26 » de `keys.test.ts`.
- G10 Hors du tableau, rien ne change : essais `data-item`, `c10a-*`, `c10b-*`, `c13-*` verts sans réécriture de fond.
- G11 Rendu, collision et exports cohérents : un seul peintre pour l'écran, l'image et le PDF (`paintTableGrid`,
  `paintCellTexts`) ; la collision du texte (`offsetAt`) lit le même décalage que le dessin.
- G12 Design : îlots et jetons existants ; icônes Lucide à traits fins recopiées à l'identique
  (`gh api "repos/lucide-icons/lucide/contents/icons/<nom>.svg?ref=7981a0798a" --jq .content | base64 -d`), nommées
  dans `THIRD_PARTY_NOTICES.md`, viewBox `-0.25 -0.25 24 24`, trait 1,5 par la feuille de style (§ 10 de
  `docs/plans/design-cadrage.md`).
- G13 Interdits : pas de `git add -A` ni `git add .`, pas de `commit -a`, pas de `--force`, aucun test désactivé ou sauté,
  aucun seuil touché, aucun `tauri build`, aucun fichier téléchargé (fichiers d'essai fabriqués dans les tests), pas de push.
- G14 Commits : `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit`, message anglais
  terminé par une ligne vide puis `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; `git add` fichier par
  fichier (ceux de la ligne de la tâche).
- G15 Rapport de tâche : une ligne par module réutilisé, `Réutilisation : appelé <module>` ou `Réutilisation : écart —
  <pourquoi>`.

**Commande M** (tailles Wasm, avant le commit de toute tâche Rust ; régénère aussi le module que lit le contrat ;
`wasm-bindgen` réécrit ses fichiers de sortie) :

```bash
cd $WT && nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release -j 4 2>&1 | tail -2 \
 && nice -n 10 cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release -j 4 2>&1 | tail -2 \
 && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm \
 && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm \
 && mkdir -p /tmp/p3s-oz-$$ \
 && pnpm exec wasm-opt -Oz apps/web/src/wasm/roomboard_wasm_bg.wasm -o /tmp/p3s-oz-$$/main.wasm \
 && pnpm exec wasm-opt -Oz apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm -o /tmp/p3s-oz-$$/formats.wasm \
 && echo "principal $(wc -c < /tmp/p3s-oz-$$/main.wasm) formats $(wc -c < /tmp/p3s-oz-$$/formats.wasm)"
```

Attendu : `principal N formats M`, N ≤ 1 532 864, M ≤ 3 104 768 ; les deux nombres vont dans le rapport (avant et après).
Pour la valeur « avant », lancer la commande M une fois au départ de la tâche.

**Commandes de preuve** (formes bornées) :

- vitest : `cd $WT && nice -n 10 pnpm --filter @roomboard/web exec vitest run <fichiers> -t "<motif>" 2>&1 | tail -8`
  (motif : `Tests  N passed`, N attendu ; aucun `FAIL `).
- contrat vrai module (après la commande M) : `cd $WT && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts -t "<motif>" 2>&1 | tail -8`.
- cœur : `cd $WT && nice -n 10 cargo test -p roomboard-core <filtre> -j 4 2>&1 | tail -10` (motif : `test result: ok. N passed`).
- CLI : `cd $WT && pnpm --filter @roomboard/cli build 2>&1 | tail -3 && nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/ops.test.ts src/formats.test.ts 2>&1 | tail -6 && node scripts/essais/cli-essai.mjs 2>&1 | tail -8` (motif : `CLI : OK`).
- essai : `cd $WT && pnpm --filter @roomboard/web build 2>&1 | tail -3 && node scripts/essais/personnalisation-3-suite-navigateur.mjs 2>&1 | tail -40` (motif : `personnalisation-3 suite : OK`).
- suite complète (T10, T14) : `cd $WT && node ~/.claude/scripts/vm/suite-vm.cjs -- scripts/verifier.sh --e2e 2>&1 | tail -20`.

## Review Focus

1. **Un seul décalage d'alignement** (DS6, G11) : le mot que le pot colore dans une case centrée au milieu est le mot
   dessiné → `fill-target.test.ts` « D15 : pot sur un mot centré au milieu » (T6) ; `text-layout.test.ts` « lineShift :
   offsetAt et paintText d'accord » (T6).
2. **Parité `SetTableLook` et `ReorderTableLines`** : refus avant la recherche du tableau, aucune étape si inchangé,
   Ombrer qui referme, objets liés qui suivent → contrat « SetTableLook » (T3), « ReorderTableLines » (T4), deux fabriques.
3. **Fichier neuf dans une version d'avant** (G5, S17) → `old_reader_ignores_look_keys` (T2), `reorder_reload_keeps_bytes` (T4).
4. **Déplacer ou trier un tableau fusionné** : refus sans écriture, message → `reorder_refuses_cut_merge` (T4),
   `table.test.ts` « S11 : zone coupée : message, aucune commande » (T8), « S13 : zone sur deux lignes refusée » (T12).
5. **Étiquette refusée** : aucune `Transform`, aucune étape, objet à sa place → `cell-drop.test.ts` « S14 : truite
   refusée : aucune commande, aucune étape, l'objet reste à sa place » (Sélection et `cell-drop` ensemble, T13).

---

### Tâche T1 — Mineurs PR 74 : bouton En-tête enfoncé, zone d'en-tête entière, `scaleOf` exporté, tests manquants

<a id="tache-t1"></a>

**Objectif** (DS12, S10-mineurs) : le bouton « En-tête » montre son état (`aria-pressed`) ; une zone ancrée en ligne 0
d'un tableau à en-tête est grise sur toute sa hauteur ; l'outil Tableau lit `scaleOf` au lieu de recopier
`Math.hypot(m[0], m[1])` ; tests ajoutés : une étape par geste d'en-tête, libellé « Retirer l'en-tête », D35 sur une
plage, Alt+E et Alt+flèches sans effet hors de l'outil Tableau ; titre de test « neuf actions » → « dix actions ».

**Fichiers** : ligne T1 de la table.

**Interfaces**
- Consomme : `ACTION_STATE` (`ui/item-state.ts:63`), `TableActionRow` (`ui/Toolbar.tsx:221`), `paintTableGrid`
  (`render/table-paint.ts:96`), `setupTable`/`fakeTableTool` (`engine/engine.test.ts:1011-1090`), `setup()` de
  `tools/table.test.ts:78`.
- Produit : `export const scaleOf = (m: Matrix): number => Math.hypot(m[0], m[1]) || 1;` (`table-geom.ts`).
- Réutilise : `apps/web/src/engine/table-geom.ts:354` `scaleOf` — exporté, lu par `tools/table.ts` (étendre).
- Réutilise : `apps/web/src/ui/IconButton.tsx:97` `pressed` — déjà rendu en `aria-pressed` (réutiliser).

**Test et commande bornée** :
`cd $WT && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/item-state.test.ts src/engine/render/table-paint.test.ts src/engine/tools/table.test.ts src/engine/engine.test.ts src/toolbar.test.ts -t "PR 74|dix actions" 2>&1 | tail -8`
(attendu `Tests  7 passed` : 6 « PR 74 » + le test renommé). Garder verts : `table.test.ts`, `table-paint.test.ts` entiers.

**Contraintes (recopiées)** : G1 TDD · G2 worktree `$WT`, `cd $WT &&` · G3 `nice -n 10`, preuves bornées · G7 une étape
par geste · G10 hors du tableau rien ne change · G13 interdits · G14 commits · G15 rapport de réutilisation.

**Interdits** : aucun changement de comportement hors des cinq points ; ne pas toucher `TABLE_ACTIONS`.

**Terminé quand** : la commande bornée rend 7 passés, `table.test.ts` et `table-paint.test.ts` entiers verts, un commit.

#### Étapes

- [ ] **1. Tests rouges.** `ui/item-state.test.ts`, dans `describe("état des actions du tableau (C10a, T10)")` :

```ts
  it("PR 74 : table-header enfoncé quand l'en-tête est posé, relâché sinon, grisé sans cellule", () => {
    expect(itemState(action("table-header"), view({ tableCell: { ...cell(3, 3), header: true } }))).toMatchObject({ pressed: true, disabled: false });
    expect(itemState(action("table-header"), view({ tableCell: cell(3, 3) })).pressed).toBe(false);
    expect(itemState(action("table-header"), view()).disabled).toBe(true);
  });
```

`render/table-paint.test.ts`, dans `describe("S10 en-tête (D17)")` :

```ts
  it("PR 74 : zone (0, 0)-(1, 0) d'un tableau à en-tête : fond d'en-tête sur ses deux lignes", () => {
    const t: TableData = {
      color: "#000000", size: 36, header: true,
      cols: [{ id: "c1", width: 100 }, { id: "c2", width: 100 }],
      rows: [{ id: "r1", height: 64 }, { id: "r2", height: 64 }],
      cells: [], merges: [{ row: "r1", col: "c1", rows: 2, cols: 1 }],
    };
    const ctx = new FakeCtx();
    paintTableGrid(asCtx(ctx), t);
    expect(ctx.rects).toContainEqual([0, 0, 100, 128]);
    expect(ctx.log.filter((l) => l === `fillRect ${TABLE_HEADER_FILL}`)).toHaveLength(2);
  });
```

`tools/table.test.ts`, dans `describe("outil Tableau — TB2 en-tête et D35")` :

```ts
  it("PR 74 : une étape par geste : header-toggle, un seul undo rend la ligne normale", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.tool.requestCommit();
    const n = s.runs.length;
    s.tool.act("header-toggle");
    expect(s.runs.length).toBe(n + 1);
    expect(s.table(id).header).toBe(true);
    s.doc.undo();
    expect(s.table(id).header).toBeUndefined();
  });
  it("PR 74 : tableau à en-tête : le menu de case propose « Retirer l'en-tête »", () => {
    vi.useFakeTimers();
    try {
      const s = setup();
      const id = s.create(100, 200, 3, 3);
      s.tool.requestCommit();
      s.doc.apply({ type: "SetTableOptions", id, header: true });
      s.tool.begin(1, [at(120, 220)]);
      vi.advanceTimersByTime(500);
      expect(s.menuOpens[0]?.items.find((i) => i.id === "header")?.label).toBe("Retirer l'en-tête");
      s.tool.close(1, "end");
    } finally {
      vi.useRealTimers();
    }
  });
  it("PR 74 : D35 sur une plage : un objet dans une case non active de la plage refuse Ombrer", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.tool.requestCommit();
    const o = s.doc.apply({ type: "AddShape", page: s.page, shape: "rect", x0: 1000, y0: 1000, x1: 1100, y1: 1050, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
    const t = s.table(id);
    s.doc.apply({ type: "PlaceInCell", ids: [o], matrix: [1, 0, 0, 1, 0, 0], cell: [id, t.rows[0]?.id ?? "", t.cols[1]?.id ?? ""], sizes: [] });
    s.click(120, 220);
    s.tool.requestCommit();
    s.setShift(true);
    s.click(100 + 240 + 120, 220);
    s.setShift(false);
    expect(s.tool.cellState()?.range).toEqual({ r0: 0, c0: 0, r1: 0, c1: 1 });
    const n = s.runs.length;
    s.tool.act("shade");
    expect(s.runs.length).toBe(n);
    expect(s.notices).toEqual(["Retirez d'abord les objets de la case."]);
  });
```

(Si `s.create` place la cellule `(0, 1)` ailleurs qu'en x = 340..580 avec `PlaceInCell` qui agrandit, lire la case par
`s.table(id).cols` ; ici `sizes: []`, aucune taille ne change.)

`engine/engine.test.ts`, dans `describe("moteur — outil Tableau (C10a, contrat T4)")` :

```ts
  it("PR 74 : Alt+E et Alt+→ hors de l'outil Tableau : aucune action ; avec l'outil Tableau : prises", () => {
    const { engine, log, table } = setupTable();
    table.setCell(CELL);
    engine.setTool("pen");
    const alt = (code: string, k: string): KeyLike => ({ key: k, code, ctrlKey: false, metaKey: false, shiftKey: false, altKey: true, isComposing: false, target: null });
    expect(engine.key(alt("KeyE", "e"))).toBe(false);
    engine.key(alt("ArrowRight", "ArrowRight"));
    expect(log.some((l) => l.startsWith("act "))).toBe(false);
    engine.setTool("table");
    expect(engine.key(alt("KeyE", "e"))).toBe(true);
    expect(log).toContain("act header-toggle");
  });
```

`toolbar.test.ts:331` : remplacer « ACTION_TABLE porte les neuf actions » par « ACTION_TABLE porte les dix actions »
(corps inchangé).

- [ ] **2. Rouge** — commande bornée : `item-state` (pressed `null`) et `table-paint` (un seul fond) échouent ; les trois
  tests d'outil et celui du moteur passent peut-être déjà (ce sont des tests manquants, pas des défauts) : les noter.

- [ ] **3. Code.** `ui/item-state.ts` :

```ts
  "table-header": (v) => ({ disabled: !v.tableCell, pressed: v.tableCell?.header === true }),
```

`ui/Toolbar.tsx`, `TableActionRow`, dans l'`IconButton` des actions : ajouter `pressed={st().pressed}` après
`disabled={st().disabled}`.

`render/table-paint.ts`, `paintTableGrid`, remplacer la ligne du fond d'en-tête par :

```ts
  // personnalisation-3 (D17, PR 74) : fond d'en-tête sous les remplissages ; une zone ancrée en ligne 0 appartient
  // entière à l'en-tête (sinon sa partie basse sort blanche).
  if (t.header === true && t.rows.length > 0 && t.cols.length > 0) {
    fillBox(ctx, rangeRect(t, { r0: 0, c0: 0, r1: 0, c1: t.cols.length - 1 }), TABLE_HEADER_FILL);
    for (const z of zones) if (z.r0 === 0 && z.r1 > 0) fillBox(ctx, rangeRect(t, z), TABLE_HEADER_FILL);
  }
```

`table-geom.ts:354` : `const scaleOf` → `export const scaleOf`. `tools/table.ts` : importer `scaleOf` de `../table-geom`
et remplacer les deux `Math.hypot(at.transform[0], at.transform[1])` (dans `gripsOf` et `grabAt`) par
`scaleOf(at.transform)`.

- [ ] **4. Vert** — commande bornée (7 passés), puis `vitest run src/engine/tools/table.test.ts src/engine/render/table-paint.test.ts 2>&1 | tail -6` vert.

- [ ] **5. Commit** — fichiers de la ligne T1 ; message `fix(web): header button shows its pressed state, header fill covers merged zones, scaleOf shared; tests for PR 74 minors`.

---

### Tâche T2 — Cœur : `SetTableLook` (ha, va, border, open, accept), lecture tolérante, export Wasm

<a id="tache-t2"></a>

**Objectif** (DS1, DS3, DS4, DS5, S17) : une commande du cœur pose **une** clé : `ha` (`center`, `right` ; `left` ou
absente retire), `va` (`middle`, `bottom` ; `top` retire), `border` (`[couleur, épaisseur, style]` ; `None` retire),
`open` (seulement sur une case ombrée), sur les ancres et cellules simples de la plage ; ou `accept` sur les colonnes de
la plage (liste vide retire). Valeur contrôlée avant la recherche du tableau ; rien ne change : aucune étape. Ombrer et
Désombrer retirent `open`. Lecture tolérante, vues publiées, export Wasm à types primitifs.

**Fichiers** : ligne T2. Créer `crates/roomboard-core/src/table_look.rs` ; `lib.rs` : `pub mod table_look;` après
`pub mod table_links;`.

**Interfaces**
- Produit (Rust) :
  - `pub enum CellLook { Ha(Option<String>), Va(Option<String>), Border(Option<(String, f64, String)>), Open(bool), Accept(Vec<String>) }` (`#[derive(Debug, Clone, PartialEq)]`) et `pub type CellBorder = (String, f64, String);`.
  - `Command::SetTableLook { id: String, from: (String, String), to: (String, String), look: CellLook }`.
  - `RawCell.ha: Option<String>`, `.va`, `.border: Option<CellBorder>`, `.open: bool` ; `TableCellView.ha`, `.va`
    (`Option<String>`), `.border: Option<(String, f64, String)>` (sérialisé en tableau JSON), `.open: bool`
    (`skip_serializing_if = "std::ops::Not::not"`, vrai seulement si ombrée) ; `TableColView.accept: Option<Vec<String>>`.
  - Wasm : `set_table_look(&mut self, id: &str, from_row: &str, from_col: &str, to_row: &str, to_col: &str, key: &str, text: Option<String>, width: f64, labels: Vec<String>) -> Result<JsValue, JsError>` et `set_table_look_inner(&mut self, id: &str, from: [&str; 2], to: [&str; 2], key: &str, text: Option<String>, width: f64, labels: Vec<String>) -> Result<Change, CommandError>` ; `key` : `ha` / `va` (`text` = valeur), `border` (`text` = couleur, absente = retirer ; `width` ; `labels[0]` = style), `open` (`width != 0`), `accept` (`labels`) ; autre : `BadTable`.
- Réutilise : `crates/roomboard-core/src/table.rs:509` `targets`, `:487` `cells_map`, `:495` `insert_cell`, `:602` `RawTable::rect`, `:613` `RawTable::key` — ancres de la plage et écriture (étendre : `pub(crate)`).
- Réutilise : `crates/roomboard-core/src/table.rs:1013` `set_on_targets` — Ombrer et Désombrer retirent aussi `open` (étendre).
- Réutilise : `crates/roomboard-core/src/table_links.rs:1063` `old_reader_ignores_new_keys`, `:1091` `cell_reload_keeps_bytes` — patrons des tests U3 (réutiliser).

**Test et commande bornée** :
- `cd $WT && nice -n 10 cargo test -p roomboard-core table_look -j 4 2>&1 | tail -12` : `test result: ok. 8 passed`
  (`look_ha_va_writes_clears_and_undoes`, `look_refusals`, `look_cell_listed_in_view`, `look_border_writes_an_array`,
  `look_open_only_on_shaded_and_shade_clears_it`, `look_accept_on_columns`, `look_reload_keeps_bytes`,
  `old_reader_ignores_look_keys`).
- `cd $WT && nice -n 10 cargo test -p roomboard-wasm set_table_look -j 4 2>&1 | tail -6` : 1 passé.
- Garder verts : `cd $WT && nice -n 10 cargo test -p roomboard-core table -j 4 2>&1 | tail -6` (C10a, C10b, liens).
- `cd $WT && nice -n 10 cargo clippy -p roomboard-core -p roomboard-wasm -j 4 -- -D warnings 2>&1 | tail -6` : aucun `error`.
- Commande M (avant et après) : principal ≤ 1 532 864, formats ≤ 3 104 768.

**Contraintes (recopiées)** : G1 TDD · G2 worktree (isolé : celui de l'orchestrateur), `cd $WT &&` · G3 `nice -n 10`,
`cargo -j 4`, preuves bornées · G4 taille Wasm : commande M avant et après, arrêt si principal > 1 532 864 o ou formats
> 3 104 768 o, aucun seuil, pas d'`opt-level = "z"` · G5 champs facultatifs, valeur illisible ignorée et gardée, test
« version d'avant » · G7 une commande = une transaction, rien ne change : aucune étape · G13 interdits · G14 commits ·
G15 rapport de réutilisation.

**Interdits** : aucun `Deserialize` neuf ni `serde_json` dans le pont ; aucun calcul de géométrie dans le cœur ; aucune
autre commande neuve.

**Terminé quand** : 8 + 1 tests verts, `table` du cœur vert, clippy propre, commande M sous les seuils (chiffres au
rapport), un commit.

#### Étapes

- [ ] **1. Tests rouges** — `table_look.rs`, module de tests (aides recopiées de `table_links.rs:657-704`) :

```rust
#[cfg(test)]
mod tests {
    use yrs::{Any, Map, MapRef, Out};

    use super::CellLook;
    use crate::commands::{Command, CommandError};
    use crate::document::Document;

    fn first(d: &Document) -> String {
        d.page_ids()[0].clone()
    }
    fn table3(d: &mut Document, p: &str) -> String {
        d.apply(Command::AddTable {
            page: p.into(), x: 0.0, y: 0.0, cols: 3, rows: 3, col_width: 240.0, row_height: 64.0,
            color: "#000000".into(), size: 36.0,
        })
        .expect("tableau")
        .ids[0]
            .clone()
    }
    fn view(d: &Document, id: &str) -> crate::table::TableView {
        d.element(id).and_then(|v| v.table).expect("vue")
    }
    fn ids(d: &Document, t: &str, r: usize, c: usize) -> (String, String) {
        let v = view(d, t);
        (v.rows[r].id.clone(), v.cols[c].id.clone())
    }
    fn look(d: &mut Document, t: &str, a: (usize, usize), b: (usize, usize), l: CellLook) -> Result<crate::commands::Change, CommandError> {
        let (from, to) = (ids(d, t, a.0, a.1), ids(d, t, b.0, b.1));
        d.apply(Command::SetTableLook { id: t.into(), from, to, look: l })
    }
    fn shade(d: &mut Document, t: &str, r: usize, c: usize, on: bool) {
        let x = ids(d, t, r, c);
        d.apply(Command::SetTableShade { id: t.into(), from: x.clone(), to: x, shade: on.then(|| "#94a3b8".to_string()) }).expect("ombrage");
    }
    fn meta() -> crate::format::SaveMeta {
        crate::format::SaveMeta { app_version: "0.1.0".into(), now: "2026-11-28T00:00:00Z".into(), created: None }
    }
    /// Tableau 3 × 3 portant les cinq clés : `ha`/`va` sur (0, 0)-(0, 1) (« Lundi » en (0, 0)), bordure en (1, 1),
    /// cache ouvert en (2, 2), `accept` sur la colonne 0.
    fn all_keys(d: &mut Document) -> String {
        let p = first(d);
        let t = table3(d, &p);
        let (r, c) = ids(d, &t, 0, 0);
        d.apply(Command::SetTableCell { id: t.clone(), row: r, col: c, content: "Lundi".into(), row_height: None, spans: None }).expect("texte");
        look(d, &t, (0, 0), (0, 1), CellLook::Ha(Some("center".into()))).expect("ha");
        look(d, &t, (0, 0), (0, 1), CellLook::Va(Some("bottom".into()))).expect("va");
        look(d, &t, (1, 1), (1, 1), CellLook::Border(Some(("#dc2626".into(), 8.0, "dashed".into())))).expect("border");
        shade(d, &t, 2, 2, true);
        look(d, &t, (2, 2), (2, 2), CellLook::Open(true)).expect("open");
        look(d, &t, (0, 0), (2, 0), CellLook::Accept(vec!["chat".into(), "chien".into()])).expect("accept");
        t
    }

    #[test]
    fn look_ha_va_writes_clears_and_undoes() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let c = look(&mut d, &t, (0, 0), (0, 1), CellLook::Ha(Some("center".into()))).expect("plage");
        assert_eq!(c.ids, vec![t.clone()]);
        assert!(view(&d, &t).cells.iter().all(|x| x.ha.as_deref() == Some("center")));
        assert_eq!(view(&d, &t).cells.len(), 2);
        let ver = d.version();
        look(&mut d, &t, (0, 0), (0, 1), CellLook::Ha(Some("center".into()))).expect("même");
        assert_eq!(d.version(), ver, "rien ne change : aucune étape");
        look(&mut d, &t, (0, 0), (0, 1), CellLook::Ha(Some("left".into()))).expect("retour");
        assert!(view(&d, &t).cells.is_empty());
        assert!(d.undo());
        assert_eq!(view(&d, &t).cells.len(), 2);
    }

    #[test]
    fn look_refusals() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let a = ids(&d, &t, 0, 0);
        let bad = [
            CellLook::Ha(Some("diagonal".into())),
            CellLook::Va(Some("left".into())),
            CellLook::Border(Some(("#dc2626".into(), 0.0, "solid".into()))),
            CellLook::Border(Some(("#dc2626".into(), 33.0, "solid".into()))),
            CellLook::Border(Some(("#dc2626".into(), 2.0, "wavy".into()))),
            CellLook::Border(Some(("#zzzzzz".into(), 2.0, "solid".into()))),
            CellLook::Accept(vec!["  ".into()]),
            CellLook::Accept((0..65).map(|i| format!("e{i}")).collect()),
        ];
        for l in bad {
            assert_eq!(d.apply(Command::SetTableLook { id: "zz".into(), from: a.clone(), to: a.clone(), look: l.clone() }), Err(CommandError::BadTable), "{l:?} : contrôle avant le tableau");
        }
        assert_eq!(
            d.apply(Command::SetTableLook { id: "zz".into(), from: a.clone(), to: a.clone(), look: CellLook::Ha(Some("right".into())) }),
            Err(CommandError::UnknownElement("zz".into()))
        );
        assert_eq!(
            d.apply(Command::SetTableLook { id: t.clone(), from: ("x".into(), "y".into()), to: a, look: CellLook::Ha(Some("right".into())) }),
            Err(CommandError::BadTable)
        );
    }

    #[test]
    fn look_cell_listed_in_view() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        look(&mut d, &t, (2, 2), (2, 2), CellLook::Va(Some("bottom".into()))).expect("va");
        let v = view(&d, &t);
        assert_eq!(v.cells.len(), 1);
        assert_eq!((v.cells[0].text.as_str(), v.cells[0].va.as_deref(), v.cells[0].ha.as_deref()), ("", Some("bottom"), None));
    }

    #[test]
    fn look_border_writes_an_array() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        look(&mut d, &t, (0, 0), (1, 1), CellLook::Border(Some(("#dc2626".into(), 8.0, "dashed".into())))).expect("border");
        let v = view(&d, &t);
        assert_eq!(v.cells.len(), 4);
        assert!(v.cells.iter().all(|c| c.border == Some(("#dc2626".to_string(), 8.0, "dashed".to_string()))));
        {
            let txn = d.read();
            let f = d.find_element(&txn, &t).expect("t");
            let Some(Out::YMap(cells)) = f.element.get(&txn, "cells") else { panic!("cells") };
            let (r, c) = (v.rows[0].id.clone(), v.cols[0].id.clone());
            let Some(Out::YMap(cell)) = cells.get(&txn, &format!("{r}:{c}")) else { panic!("case") };
            assert!(matches!(cell.get(&txn, "border"), Some(Out::Any(Any::Array(_)))), "positionnel, jamais Any::Map (U3)");
        }
        look(&mut d, &t, (0, 0), (1, 1), CellLook::Border(None)).expect("retire");
        assert!(view(&d, &t).cells.is_empty());
    }

    #[test]
    fn look_open_only_on_shaded_and_shade_clears_it() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let ver = d.version();
        look(&mut d, &t, (0, 0), (0, 0), CellLook::Open(true)).expect("non ombrée");
        assert_eq!(d.version(), ver, "open n'est écrit que sur une case ombrée");
        shade(&mut d, &t, 0, 0, true);
        look(&mut d, &t, (0, 0), (0, 0), CellLook::Open(true)).expect("ouvre");
        assert!(view(&d, &t).cells[0].open);
        shade(&mut d, &t, 0, 0, true);
        assert!(!view(&d, &t).cells[0].open, "Ombrer de nouveau referme");
        look(&mut d, &t, (0, 0), (0, 0), CellLook::Open(true)).expect("rouvre");
        shade(&mut d, &t, 0, 0, false);
        assert!(view(&d, &t).cells.is_empty(), "Désombrer retire tout");
    }

    #[test]
    fn look_accept_on_columns() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        look(&mut d, &t, (0, 1), (2, 2), CellLook::Accept(vec!["chat".into(), "chien".into()])).expect("accept");
        let v = view(&d, &t);
        assert_eq!(v.cols.iter().map(|c| c.accept.clone()).collect::<Vec<_>>(), vec![None, Some(vec!["chat".into(), "chien".into()]), Some(vec!["chat".into(), "chien".into()])]);
        let ver = d.version();
        look(&mut d, &t, (0, 1), (0, 2), CellLook::Accept(vec!["chat".into(), "chien".into()])).expect("même");
        assert_eq!(d.version(), ver);
        look(&mut d, &t, (0, 0), (0, 2), CellLook::Accept(vec![])).expect("retire");
        assert!(view(&d, &t).cols.iter().all(|c| c.accept.is_none()));
    }

    #[test]
    fn look_reload_keeps_bytes() {
        use crate::format::{load, save};
        let mut d = Document::blank();
        let t = all_keys(&mut d);
        let once = save(&d, &meta()).expect("save");
        let file = save(&load(&once).expect("load 1"), &meta()).expect("resave 1");
        let again = save(&load(&file).expect("load 2"), &meta()).expect("resave 2");
        assert_eq!(file, again);
        assert_eq!(load(&file).expect("load").element(&t), d.element(&t));
    }

    /// S17, G5 : un lecteur d'avant (ici : le document relu, les cinq clés retirées) voit les mêmes cases, les mêmes
    /// textes, les mêmes tailles, sans planter.
    #[test]
    fn old_reader_ignores_look_keys() {
        use crate::format::{load, save};
        let mut d = Document::blank();
        let t = all_keys(&mut d);
        let old = load(&save(&d, &meta()).expect("save")).expect("load");
        {
            let mut txn = old.transact_untracked();
            let f = old.find_element(&txn, &t).expect("t");
            if let Some(Out::YMap(cells)) = f.element.get(&txn, "cells") {
                let maps: Vec<MapRef> = cells.iter(&txn).filter_map(|(_, v)| match v { Out::YMap(m) => Some(m), _ => None }).collect();
                for m in maps {
                    for k in ["ha", "va", "border", "open"] {
                        m.remove(&mut txn, k);
                    }
                }
            }
            if let Some(Out::YArray(cols)) = f.element.get(&txn, "cols") {
                let maps: Vec<MapRef> = cols.iter(&txn).filter_map(|v| match v { Out::YMap(m) => Some(m), _ => None }).collect();
                for m in maps {
                    m.remove(&mut txn, "accept");
                }
            }
        }
        let mut a = view(&d, &t);
        for c in &mut a.cells {
            c.ha = None;
            c.va = None;
            c.border = None;
            c.open = false;
        }
        a.cells.retain(|c| !c.text.is_empty() || c.fill.is_some() || c.shade.is_some() || c.bg.is_some());
        for c in &mut a.cols {
            c.accept = None;
        }
        assert_eq!(a, view(&old, &t));
    }
}
```

`crates/roomboard-wasm/src/lib.rs`, à côté de `place_in_cell_inner_links_and_sizes` :

```rust
    #[test]
    fn set_table_look_inner_centers_borders_and_refuses_unknown_key() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d.add_table_inner(&p, [0.0, 0.0], [2, 2], [240.0, 64.0], "#000000", 36.0).expect("tableau").ids[0].clone();
        let t = table_of(&d, &id);
        let (r, c) = (t.rows[0].id.clone(), t.cols[0].id.clone());
        d.set_table_look_inner(&id, [&r, &c], [&r, &c], "ha", Some("center".into()), 0.0, vec![]).expect("ha");
        assert_eq!(table_of(&d, &id).cells[0].ha.as_deref(), Some("center"));
        d.set_table_look_inner(&id, [&r, &c], [&r, &c], "border", Some("#dc2626".into()), 8.0, vec!["dashed".into()]).expect("border");
        assert_eq!(table_of(&d, &id).cells[0].border, Some(("#dc2626".to_string(), 8.0, "dashed".to_string())));
        assert_eq!(d.set_table_look_inner(&id, [&r, &c], [&r, &c], "zz", None, 0.0, vec![]), Err(CommandError::BadTable));
    }
```

- [ ] **2. Rouge** — `cd $WT && nice -n 10 cargo test -p roomboard-core table_look -j 4 2>&1 | tail -10` : erreurs de
  compilation (`CellLook`, `SetTableLook` absents) attendues. Lancer aussi la commande M (valeurs « avant »).

- [ ] **3. `table.rs`.** En-tête du module (lignes 1-10), ajouter : « Réglages de case `ha`, `va`, `border`, `open` et de
  colonne `accept` : `table_look.rs` (suite OG32). » ; `RawCell` gagne

```rust
    pub ha: Option<String>,
    pub va: Option<String>,
    pub border: Option<crate::table_look::CellBorder>,
    pub open: bool,
```

dans `read_cell`, avant `Some(RawCell { … })` :

```rust
    let ha = out_string(map.get(txn, "ha")).filter(|v| crate::table_look::HA.contains(&v.as_str()));
    let va = out_string(map.get(txn, "va")).filter(|v| crate::table_look::VA.contains(&v.as_str()));
    let border = crate::table_look::read_border(map.get(txn, "border"));
    let open = matches!(map.get(txn, "open"), Some(Out::Any(Any::Bool(true))));
```

et `ha, va, border, open,` dans le `RawCell { … }`. `TableCellView` gagne :

```rust
    /// Suite OG32 (D15, DS6) : `center` ou `right` ; absent = gauche.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ha: Option<String>,
    /// `middle` ou `bottom` ; absent = haut.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub va: Option<String>,
    /// DS4 : `[couleur, épaisseur, style]`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub border: Option<(String, f64, String)>,
    /// DS3 : cache ouvert (seulement sur une case ombrée).
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub open: bool,
```

`TableColView` gagne `#[serde(skip_serializing_if = "Option::is_none")] pub accept: Option<Vec<String>>,`. Dans
`RawTable::view` : la condition de saut devient
`if cell.content.is_empty() && cell.fill.is_none() && cell.shade.is_none() && cell.bg.is_none() && cell.ha.is_none() && cell.va.is_none() && cell.border.is_none() { continue; }`,
le `TableCellView { … }` reçoit `ha: cell.ha, va: cell.va, border: cell.border, open: cell.open && cell.shade.is_some(),`
(placer `open` avant le déplacement de `shade`, ou cloner), et les colonnes :

```rust
                .map(|l| TableColView {
                    id: l.id.clone(),
                    width: l.size,
                    accept: crate::table_look::read_accept(l.map.get(txn, "accept")),
                })
```

Tout autre `TableCellView { … }` ou `TableColView { … }` construit ailleurs (`grep -rn "TableCellView {\|TableColView {" crates`)
reçoit `ha: None, va: None, border: None, open: false` ou `accept: None`. Passer en `pub(crate)` : `fn targets`,
`fn rect` et `fn key` (impl `RawTable`). Dans `set_on_targets`, Ombrer et Désombrer retirent `open` :

```rust
                    (current.as_deref() != value || (matches!(key, PaintKey::Shade) && cell.as_ref().is_some_and(|x| x.open)))
                        .then_some(((r, c), cell))
```

et, dans la boucle d'écriture, après l'`insert` de `(Some(v), Some(x))` et après le `remove` de `(None, Some(x))` :
`if matches!(key, PaintKey::Shade) { x.map.remove(&mut txn, "open"); }` (dériver `PartialEq` sur `PaintKey` si
`matches!` ne suffit pas).

- [ ] **4. `table_look.rs`** (au-dessus du module de tests) :

```rust
//! Réglages de case et de colonne (personnalisation-3, suite OG32, DS1) : une seule commande, `SetTableLook`, pose une
//! clé sur les ancres et cellules simples d'une plage (`ha`, `va`, `border`, `open`) ou sur ses colonnes (`accept`), en
//! une transaction. La page calcule le reste (cadre aligné, dessin, règle d'étiquettes) ; le cœur écrit (DA4). Valeurs
//! positionnelles (U3) : `border` = `[couleur, épaisseur, style]`, `accept` = liste de chaînes ; jamais d'`Any::Map`.
use std::ops::RangeInclusive;

use yrs::{Any, In, Map, MapRef, Out, TransactionMut};

use crate::commands::{Change, CommandError};
use crate::document::Document;
use crate::element::finite_positive;
use crate::rich_text::valid_color;
use crate::table::{cells_map, insert_cell, merges_of, read_cell, targets, RawCell, RawTable};

/// Valeurs écrites de `ha` et `va` (les défauts `left` et `top` ne s'écrivent pas).
pub const HA: [&str; 2] = ["center", "right"];
pub const VA: [&str; 2] = ["middle", "bottom"];
pub const BORDER_STYLES: [&str; 4] = ["solid", "dashed", "dotted", "none"];
pub const MAX_BORDER_WIDTH: f64 = 32.0;
pub const MAX_ACCEPT: usize = 64;
pub const MAX_LABEL_CHARS: usize = 200;

/// Bordure de case (D16) : `(couleur, épaisseur, style)`.
pub type CellBorder = (String, f64, String);

/// Clé posée par `SetTableLook` (DS1).
#[derive(Debug, Clone, PartialEq)]
pub enum CellLook {
    /// `None` ou `"left"` : clé retirée.
    Ha(Option<String>),
    /// `None` ou `"top"` : clé retirée.
    Va(Option<String>),
    /// `None` : réglage retiré (trait du tableau).
    Border(Option<CellBorder>),
    /// Seulement sur une case ombrée (DS3).
    Open(bool),
    /// Colonnes de la plage ; liste vide : clé retirée (DS5).
    Accept(Vec<String>),
}

fn border_ok(c: &str, w: f64, s: &str) -> bool {
    valid_color(c) && finite_positive(w) && w <= MAX_BORDER_WIDTH && BORDER_STYLES.contains(&s)
}

/// `border` lisible : `[couleur, épaisseur, style]` valides ; toute autre forme : aucun (gardée, U3).
pub(crate) fn read_border(o: Option<Out>) -> Option<CellBorder> {
    let Some(Out::Any(Any::Array(items))) = o else {
        return None;
    };
    match items.as_ref() {
        [Any::String(c), Any::Number(w), Any::String(s)] if border_ok(c, *w, s) => Some((c.to_string(), *w, s.to_string())),
        _ => None,
    }
}

/// `accept` lisible : 1 à `MAX_ACCEPT` chaînes ; toute autre forme : aucun (gardée).
pub(crate) fn read_accept(o: Option<Out>) -> Option<Vec<String>> {
    let Some(Out::Any(Any::Array(items))) = o else {
        return None;
    };
    if items.is_empty() || items.len() > MAX_ACCEPT {
        return None;
    }
    items.iter().map(|a| match a { Any::String(s) => Some(s.to_string()), _ => None }).collect()
}

/// Valeur admise (contrôle avant la recherche du tableau, comme le faux cœur).
fn check(look: &CellLook) -> Result<(), CommandError> {
    let ok = match look {
        CellLook::Ha(v) => v.as_deref().is_none_or(|x| x == "left" || HA.contains(&x)),
        CellLook::Va(v) => v.as_deref().is_none_or(|x| x == "top" || VA.contains(&x)),
        CellLook::Border(b) => b.as_ref().is_none_or(|(c, w, s)| border_ok(c, *w, s)),
        CellLook::Open(_) => true,
        CellLook::Accept(l) => l.len() <= MAX_ACCEPT && l.iter().all(|s| !s.trim().is_empty() && s.chars().count() <= MAX_LABEL_CHARS),
    };
    if ok { Ok(()) } else { Err(CommandError::BadTable) }
}

/// Valeur écrite (le défaut ne s'écrit pas).
fn norm<'a>(v: Option<&'a str>, default: &str) -> Option<&'a str> {
    v.filter(|x| *x != default)
}

/// La case lue diffère de la demande (case absente : aucune valeur ; `open` : case ombrée seulement).
fn differs(cell: Option<&RawCell>, look: &CellLook) -> bool {
    match look {
        CellLook::Ha(v) => cell.and_then(|x| x.ha.as_deref()) != norm(v.as_deref(), "left"),
        CellLook::Va(v) => cell.and_then(|x| x.va.as_deref()) != norm(v.as_deref(), "top"),
        CellLook::Border(b) => cell.and_then(|x| x.border.as_ref()) != b.as_ref(),
        CellLook::Open(o) => cell.is_some_and(|x| x.shade.is_some() && x.open != *o),
        CellLook::Accept(_) => false,
    }
}

fn put_str(txn: &mut TransactionMut, map: &MapRef, key: &str, v: Option<&str>) {
    match v {
        Some(x) => {
            map.insert(txn, key, x);
        }
        None => {
            map.remove(txn, key);
        }
    }
}

fn write(txn: &mut TransactionMut, map: &MapRef, look: &CellLook) {
    match look {
        CellLook::Ha(v) => put_str(txn, map, "ha", norm(v.as_deref(), "left")),
        CellLook::Va(v) => put_str(txn, map, "va", norm(v.as_deref(), "top")),
        CellLook::Border(Some((c, w, s))) => {
            let v = Any::Array(vec![Any::String(c.as_str().into()), Any::from(*w), Any::String(s.as_str().into())].into());
            map.insert(txn, "border", In::Any(v));
        }
        CellLook::Border(None) => {
            map.remove(txn, "border");
        }
        CellLook::Open(true) => {
            map.insert(txn, "open", true);
        }
        CellLook::Open(false) => {
            map.remove(txn, "open");
        }
        CellLook::Accept(_) => {}
    }
}

impl Document {
    /// `SetTableLook` (DS1) : valeur contrôlée d'abord, puis tableau et plage ; seulement les cases (ou colonnes) qui
    /// changent ; rien ne change : aucune étape.
    pub(crate) fn cmd_set_table_look(
        &mut self,
        id: &str,
        from: (&str, &str),
        to: (&str, &str),
        look: &CellLook,
    ) -> Result<Change, CommandError> {
        check(look)?;
        let (page, e, raw) = self.table_of(id)?;
        let rect = raw.rect(from, to).ok_or(CommandError::BadTable)?;
        if let CellLook::Accept(labels) = look {
            return self.set_accept(page, id, &raw, rect.c0..=rect.c1, labels);
        }
        let todo: Vec<((usize, usize), Option<RawCell>)> = {
            let txn = self.read();
            let merges = merges_of(&raw, &txn);
            targets(&rect, &merges)
                .into_iter()
                .filter_map(|(r, c)| {
                    let cell = read_cell(&txn, raw.cells.as_ref(), &raw.rows[r].id, &raw.cols[c].id);
                    differs(cell.as_ref(), look).then_some(((r, c), cell))
                })
                .collect()
        };
        if todo.is_empty() {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            let cells = cells_map(&mut txn, &e, raw.cells.as_ref());
            for ((r, c), cell) in todo {
                let map = match cell {
                    Some(x) => x.map,
                    None => insert_cell(&mut txn, &cells, raw.key(r, c), "", Vec::new()),
                };
                write(&mut txn, &map, look);
            }
        }
        Ok(self.table_done(page, id))
    }

    /// `accept` sur les colonnes `cols` (DS5) ; liste vide : retirée ; valeur illisible gardée si rien n'est demandé.
    fn set_accept(
        &mut self,
        page: String,
        id: &str,
        raw: &RawTable,
        cols: RangeInclusive<usize>,
        labels: &[String],
    ) -> Result<Change, CommandError> {
        let todo: Vec<MapRef> = {
            let txn = self.read();
            raw.cols[cols]
                .iter()
                .filter(|l| read_accept(l.map.get(&txn, "accept")).as_deref().unwrap_or(&[]) != labels)
                .map(|l| l.map.clone())
                .collect()
        };
        if todo.is_empty() {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            for m in todo {
                if labels.is_empty() {
                    m.remove(&mut txn, "accept");
                } else {
                    let v = Any::Array(labels.iter().map(|s| Any::String(s.as_str().into())).collect::<Vec<_>>().into());
                    m.insert(&mut txn, "accept", In::Any(v));
                }
            }
        }
        Ok(self.table_done(page, id))
    }
}
```

(Si `insert_cell` attend un autre type de clé ou `table_done` n'est pas `pub(crate)`, suivre la forme de
`set_on_targets` ; `Any::from(f64)` donne `Any::Number`. Une étiquette `"  "` dans une liste illisible ne compte pas.)

- [ ] **5. `commands.rs`** — variante après `SetCellImage` :

```rust
    /// personnalisation-3 (suite OG32, DS1) : une clé de case (`ha`, `va`, `border`, `open`) sur les ancres et cellules
    /// simples de la plage, ou `accept` sur ses colonnes ; valeur refusée : `BadTable` avant la recherche du tableau ;
    /// rien ne change : aucune étape.
    SetTableLook {
        id: String,
        from: (String, String),
        to: (String, String),
        look: crate::table_look::CellLook,
    },
```

et dans `apply`, après `Command::SetCellImage { … }` :

```rust
            Command::SetTableLook { id, from, to, look } => self.cmd_set_table_look(
                &id,
                (from.0.as_str(), from.1.as_str()),
                (to.0.as_str(), to.1.as_str()),
                &look,
            ),
```

Tout `match` exhaustif sur `Command` ailleurs (`grep -rn "Command::SetCellImage" crates`) reçoit son bras.

- [ ] **6. Wasm** — `use roomboard_core::table_look::CellLook;` en tête ; dans le bloc `#[wasm_bindgen]`, après
  `set_cell_image` :

```rust
    /// personnalisation-3 (suite OG32, DS1) : `key` = `ha` | `va` (`text` : valeur, absente = défaut), `border` (`text` :
    /// couleur, absente = retirer ; `width` ; `labels[0]` : style), `open` (`width` ≠ 0 : ouvert), `accept` (`labels`).
    #[allow(clippy::too_many_arguments)]
    pub fn set_table_look(
        &mut self,
        id: &str,
        from_row: &str,
        from_col: &str,
        to_row: &str,
        to_col: &str,
        key: &str,
        text: Option<String>,
        width: f64,
        labels: Vec<String>,
    ) -> Result<JsValue, JsError> {
        to_js(
            &self
                .set_table_look_inner(id, [from_row, from_col], [to_row, to_col], key, text, width, labels)
                .map_err(cmd_err)?,
        )
    }
```

et après `set_cell_image_inner` :

```rust
    /// Clé inconnue : `BadTable` (comme le faux cœur).
    #[allow(clippy::too_many_arguments)]
    pub fn set_table_look_inner(
        &mut self,
        id: &str,
        from: [&str; 2],
        to: [&str; 2],
        key: &str,
        text: Option<String>,
        width: f64,
        labels: Vec<String>,
    ) -> Result<Change, CommandError> {
        let look = match key {
            "ha" => CellLook::Ha(text),
            "va" => CellLook::Va(text),
            "border" => CellLook::Border(text.map(|c| (c, width, labels.into_iter().next().unwrap_or_default()))),
            "open" => CellLook::Open(width != 0.0),
            "accept" => CellLook::Accept(labels),
            _ => return Err(CommandError::BadTable),
        };
        self.run(Command::SetTableLook {
            id: id.to_string(),
            from: (from[0].to_string(), from[1].to_string()),
            to: (to[0].to_string(), to[1].to_string()),
            look,
        })
    }
```

- [ ] **7. Vert** — les trois commandes cargo bornées (8, 1, `table` vert), clippy propre, puis **commande M** : noter
  « principal avant → après, formats avant → après » ; au-delà des seuils de G4 : arrêt, rapport, aucun commit.

- [ ] **8. Commit** — fichiers de la ligne T2 ; message `feat(core): SetTableLook sets one cell key (ha, va, border, open) or column accept list, tolerant reads, wasm export`.

---

### Tâche T3 — Contrat TS de `SetTableLook` : api, vrai et faux cœur, CLI

<a id="tache-t3"></a>

**Objectif** (DS1, DS13, S16) : la page et la CLI parlent `SetTableLook` ; le faux cœur rend les mêmes vues, les mêmes
refus (même ordre : valeur, tableau, coins) et les mêmes « aucune étape » que le vrai ; Ombrer et Désombrer retirent
`open` dans les deux ; la CLI pilote les cinq clés.

**Patron à ne pas reprendre** : recopier `setOnTargets` (`apps/web/src/core/fake-core.ts:1116-1127`) en comparant
`cell[key] === value` : pour `open` il faut une case **ombrée**, pour `ha`/`va` le défaut s'écrit « absent », pour
`border` la comparaison est par valeurs du tableau, et `accept` vise les colonnes, pas les cases. Chemin de référence :
`cmd_set_table_look` et `differs` de `crates/roomboard-core/src/table_look.rs` (T2) ; refus avant la recherche du
tableau comme `SetTableOptions` (`fake-core.ts:1658-1667`).

**Fichiers** : ligne T3.

**Interfaces**
- Consomme (T2) : export `set_table_look(id, from_row, from_col, to_row, to_col, key, text, width, labels)` ; vues
  `cells[].ha|va|border|open`, `cols[].accept`.
- Produit (`apps/web/src/core/api.ts`) :

```ts
export type HAlign = "left" | "center" | "right";
export type VAlign = "top" | "middle" | "bottom";
export type BorderStyle = "solid" | "dashed" | "dotted" | "none";
/** personnalisation-3 (D16, DS4) : `[couleur, épaisseur, style]`. */
export type TableBorder = readonly [color: string, width: number, style: BorderStyle];
/** personnalisation-3 (DS1) : une clé par commande ; `left` / `top` retirent ; `border` null retire ; `accept` [] retire. */
export type CellLook =
  | { readonly key: "ha"; readonly value: HAlign }
  | { readonly key: "va"; readonly value: VAlign }
  | { readonly key: "border"; readonly value: TableBorder | null }
  | { readonly key: "open"; readonly value: boolean }
  | { readonly key: "accept"; readonly value: readonly string[] };
```

  variante `| { readonly type: "SetTableLook"; readonly id: string; readonly from: CellIds; readonly to: CellIds; readonly look: CellLook }` ;
  `TableCell` gagne `readonly ha?: "center" | "right"; readonly va?: "middle" | "bottom"; readonly border?: TableBorder; readonly open?: true;` ;
  `TableCol` devient `{ readonly id: string; readonly width: number; readonly accept?: readonly string[] }`.
- Réutilise : `apps/web/src/core/fake-core.ts:1116` `setOnTargets`, `rectOf`, `targets`, `keyAt`, `writeTable` (étendre : `shade` retire `open`).
- Réutilise : `apps/web/src/core/wasm-core.ts:127` `toTable` (étendre : clés neuves projetées).
- Réutilise : `apps/web/src/core/wasm-core.contract.test.ts:2020` `p3Placed`, `:52` `unchanged`, `TABLE_MESSAGE` (réutiliser).

**Test et commande bornée** :
- commande M (pour le vrai module), puis
  `cd $WT && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts -t "SetTableLook" 2>&1 | tail -8` :
  `Tests  10 passed` (5 tests × « fausse liaison » et « vrai module wasm »).
- `cd $WT && nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | tail -5` : aucune erreur.
- CLI (commande de preuve « CLI ») : `ops.test.ts` et `formats.test.ts` verts ; `cli-essai.mjs` montre `T-S8`, `T-S9`,
  `T-S12`, `T-S14` puis `CLI : OK`.
- Garder vert : le contrat entier `-t "personnalisation-3|C10a|C10b"`.

**Contraintes (recopiées)** : G1 TDD · G2 `cd $WT &&` · G3 `nice -n 10`, preuves bornées · G4 aucun Rust ici (le vrai
module de T2 est relu par la commande M) · G5 valeurs facultatives, illisible ignorée · G6 CLI : `COMMAND_TYPES`,
`ops.test.ts`, note `.roomboard` de `FORMAT_LOTS`, `formats.test.ts`, `cli-essai.mjs` · G7 rien ne change : aucune étape ·
G13 interdits (écritures de la CLI sur des fichiers temporaires seulement) · G14 commits · G15 rapport de réutilisation.

**Interdits** : aucune règle d'étiquette dans le cœur ni le faux cœur ; ne pas changer `SetTableShade` hors de `open`.

**Terminé quand** : 10 tests de contrat verts avec le vrai module, `tsc` propre, CLI `CLI : OK`, un commit.

#### Étapes

- [ ] **1. Tests rouges** — `wasm-core.contract.test.ts`, après `p3Place11`, une aide et cinq `it` dans
  `describe.each(c10aFactories)("contrat personnalisation-3 : $name", …)` (importer `CellLook`, `TableBorder` de `./api`) :

```ts
const p3Look = (d: CoreDocument, s: P3Cells, a: readonly [number, number], b: readonly [number, number], look: CellLook): Change => {
  const v = tableOf(d, s.t);
  const at = (p: readonly [number, number]) => ({ row: v.rows[p[0]]?.id ?? "", col: v.cols[p[1]]?.id ?? "" });
  return d.apply({ type: "SetTableLook", id: s.t, from: at(a), to: at(b), look });
};
```

```ts
  it("SetTableLook ha, va (DS1, S8) : plage, une étape ; défaut retire ; inchangé : aucune étape ; annuler", () => {
    const d = f.blank();
    const s = p3Placed(d);
    expect(p3Look(d, s, [0, 0], [0, 1], { key: "ha", value: "center" }).ids).toEqual([s.t]);
    p3Look(d, s, [0, 0], [0, 1], { key: "va", value: "middle" });
    expect(tableOf(d, s.t).cells.map((c) => [c.ha, c.va])).toEqual([["center", "middle"], ["center", "middle"]]);
    unchanged(d, () => p3Look(d, s, [0, 0], [0, 1], { key: "ha", value: "center" }));
    p3Look(d, s, [0, 0], [0, 1], { key: "ha", value: "left" });
    expect(tableOf(d, s.t).cells.map((c) => c.ha)).toEqual([undefined, undefined]);
    d.undo();
    expect(tableOf(d, s.t).cells.map((c) => c.ha)).toEqual(["center", "center"]);
    d.free();
  });

  it("SetTableLook border (DS4, S9) : 2 × 2, relu ; valeur refusée sans écriture ; null retire", () => {
    const d = f.blank();
    const s = p3Placed(d);
    p3Look(d, s, [0, 0], [1, 1], { key: "border", value: ["#dc2626", 8, "dashed"] });
    expect(tableOf(d, s.t).cells.map((c) => c.border)).toEqual(Array(4).fill(["#dc2626", 8, "dashed"]));
    for (const bad of [["#dc2626", 0, "dashed"], ["#dc2626", 33, "dashed"], ["#dc2626", 2, "wavy"], ["#zzzzzz", 2, "solid"]]) {
      unchanged(d, () => expect(() => p3Look(d, s, [0, 0], [0, 0], { key: "border", value: bad as unknown as TableBorder })).toThrow(TABLE_MESSAGE));
    }
    p3Look(d, s, [0, 0], [1, 1], { key: "border", value: null });
    expect(tableOf(d, s.t).cells).toEqual([]);
    d.free();
  });

  it("SetTableLook open (DS3, S12) : case ombrée seulement ; Ombrer referme ; Désombrer retire tout", () => {
    const d = f.blank();
    const s = p3Placed(d);
    const v = tableOf(d, s.t);
    const c00 = { row: v.rows[0]?.id ?? "", col: v.cols[0]?.id ?? "" };
    unchanged(d, () => p3Look(d, s, [0, 0], [0, 0], { key: "open", value: true }));
    d.apply({ type: "SetTableShade", id: s.t, from: c00, to: c00, shade: "#94a3b8" });
    p3Look(d, s, [0, 0], [0, 0], { key: "open", value: true });
    expect(tableOf(d, s.t).cells[0]).toMatchObject({ shade: "#94a3b8", open: true });
    d.apply({ type: "SetTableShade", id: s.t, from: c00, to: c00, shade: "#94a3b8" });
    expect(tableOf(d, s.t).cells[0]?.open).toBeUndefined();
    p3Look(d, s, [0, 0], [0, 0], { key: "open", value: true });
    d.apply({ type: "SetTableShade", id: s.t, from: c00, to: c00, shade: null });
    expect(tableOf(d, s.t).cells).toEqual([]);
    d.free();
  });

  it("SetTableLook accept (DS5, S14) : colonnes de la plage ; inchangé : aucune étape ; refus ; [] retire", () => {
    const d = f.blank();
    const s = p3Placed(d);
    p3Look(d, s, [0, 1], [2, 2], { key: "accept", value: ["chat", "chien"] });
    expect(tableOf(d, s.t).cols.map((c) => c.accept)).toEqual([undefined, ["chat", "chien"], ["chat", "chien"]]);
    unchanged(d, () => p3Look(d, s, [0, 1], [0, 2], { key: "accept", value: ["chat", "chien"] }));
    unchanged(d, () => expect(() => p3Look(d, s, [0, 0], [0, 0], { key: "accept", value: ["  "] })).toThrow(TABLE_MESSAGE));
    unchanged(d, () => expect(() => p3Look(d, s, [0, 0], [0, 0], { key: "accept", value: Array.from({ length: 65 }, (_, i) => `e${i}`) })).toThrow(TABLE_MESSAGE));
    p3Look(d, s, [0, 1], [0, 2], { key: "accept", value: [] });
    expect(tableOf(d, s.t).cols.every((c) => c.accept === undefined)).toBe(true);
    d.free();
  });

  it("SetTableLook refus : clé inconnue (message tableau, aucune étape) ; tableau inconnu", () => {
    const d = f.blank();
    const s = p3Placed(d);
    unchanged(d, () => expect(() => p3Look(d, s, [0, 0], [0, 0], { key: "zz", value: 1 } as unknown as CellLook)).toThrow(TABLE_MESSAGE));
    expect(() => d.apply({ type: "SetTableLook", id: "inconnu", from: { row: "a", col: "b" }, to: { row: "a", col: "b" }, look: { key: "ha", value: "center" } })).toThrow(/inconnu/);
    d.free();
  });
```

`apps/cli/src/ops.test.ts:44` : 43 → 44 (titre et `toBe(44)`). `apps/cli/src/formats.test.ts:26` : la ligne
`.roomboard` attend une troisième note, `"tableau (personnalisation-3) : clés de case `ha`, `va`, `border` [couleur, épaisseur, style], `open` et de colonne `accept` (`SetTableLook`)"`.

- [ ] **2. Rouge** — `tsc --noEmit` signale `SetTableLook` inconnu ; noter l'échec.

- [ ] **3. `api.ts`** — les types de « Interfaces » ; la variante dans `Command`, à côté de `SetCellImage`, commentée
  `/** personnalisation-3 (suite OG32, DS1) : une clé de case ou la liste `accept` des colonnes ; une étape. */` ; ligne
  d'en-tête du fichier (« personnalisation-3 : … ») complétée de `SetTableLook`.

- [ ] **4. `wasm-core.ts`** — dans `toTable`, colonnes et cellules :

```ts
    cols: cols.map((c: unknown) => {
      if (!isRecord(c)) throw new Error(ELEMENT);
      const { id, width, accept } = c;
      if (typeof id !== "string" || !finitePositive(width)) throw new Error(ELEMENT);
      const list = Array.isArray(accept) && accept.every((x) => typeof x === "string") ? { accept: [...accept] as string[] } : {};
      return { id, width, ...list };
    }),
```

```ts
      const { row, col, text, fill, shade, spans, bg, ha, va, border, open } = c;
      if (typeof row !== "string" || typeof col !== "string" || typeof text !== "string") throw new Error(ELEMENT);
      const asset = optString(bg);
      const look = {
        ...(ha === "center" || ha === "right" ? { ha } : {}),
        ...(va === "middle" || va === "bottom" ? { va } : {}),
        ...(Array.isArray(border) && border.length === 3 && typeof border[0] === "string" && typeof border[1] === "number" && typeof border[2] === "string"
          ? { border: [border[0], border[1], border[2] as BorderStyle] as const }
          : {}),
        ...(open === true ? { open: true as const } : {}),
      };
      return { row, col, text, fill: optString(fill), shade: optString(shade), spans: toSpans(spans, text), ...(asset === null ? {} : { bg: asset }), ...look };
```

et le `case` de `apply`, après `SetCellImage` :

```ts
      case "SetTableLook": {
        // DS1 : types primitifs ; clé inconnue : text, width et labels vides, refusée par le cœur (BadTable).
        const l = cmd.look;
        const text = l.key === "ha" || l.key === "va" ? l.value : l.key === "border" ? l.value?.[0] : undefined;
        const width = l.key === "border" ? (l.value?.[1] ?? 0) : l.key === "open" ? (l.value ? 1 : 0) : 0;
        const labels = l.key === "border" ? (l.value === null ? [] : [l.value[2]]) : l.key === "accept" ? [...l.value] : [];
        return toChange(this.d.set_table_look(cmd.id, cmd.from.row, cmd.from.col, cmd.to.row, cmd.to.col, l.key, text, width, labels));
      }
```

- [ ] **5. `fake-core.ts`** — `FakeCell` gagne `readonly ha?: "center" | "right"; readonly va?: "middle" | "bottom"; readonly border?: TableBorder; readonly open?: true;`
  (facultatifs : les littéraux existants compilent) ; `tableView` liste aussi une case qui n'a que `ha`, `va` ou `border`
  et recopie les clés :

```ts
      if (cell && (cell.text !== "" || cell.fill !== null || cell.shade !== null || cell.bg !== null || cell.ha !== undefined || cell.va !== undefined || cell.border !== undefined)) {
        cells.push({
          row: r.id, col: c.id, text: cell.text, fill: cell.fill, shade: cell.shade, spans: cell.spans,
          ...(cell.bg === null ? {} : { bg: cell.bg }),
          ...(cell.ha === undefined ? {} : { ha: cell.ha }),
          ...(cell.va === undefined ? {} : { va: cell.va }),
          ...(cell.border === undefined ? {} : { border: cell.border }),
          ...(cell.open === true && cell.shade !== null ? { open: true as const } : {}),
        });
      }
```

Aides de module (près de `tableView`) :

```ts
const LOOK_HA = ["left", "center", "right"];
const LOOK_VA = ["top", "middle", "bottom"];
const LOOK_STYLES = ["solid", "dashed", "dotted", "none"];
/** DS1, comme `check` du cœur : la valeur admise, sinon null (refus avant la recherche du tableau). */
function checkedLook(l: unknown): CellLook | null {
  if (!isRecord(l)) return null;
  const v = l["value"];
  const ok =
    l["key"] === "ha" ? typeof v === "string" && LOOK_HA.includes(v)
    : l["key"] === "va" ? typeof v === "string" && LOOK_VA.includes(v)
    : l["key"] === "border" ? v === null || (Array.isArray(v) && v.length === 3 && typeof v[0] === "string" && validColor(v[0]) && finitePositive(v[1]) && (v[1] as number) <= 32 && typeof v[2] === "string" && LOOK_STYLES.includes(v[2]))
    : l["key"] === "open" ? typeof v === "boolean"
    : l["key"] === "accept" ? Array.isArray(v) && v.length <= 64 && v.every((s) => typeof s === "string" && s.trim() !== "" && [...s].length <= 200)
    : false;
  return ok ? (l as unknown as CellLook) : null;
}
const sameBorder = (a: TableBorder | undefined, b: TableBorder | undefined): boolean =>
  a === b || (a !== undefined && b !== undefined && a[0] === b[0] && a[1] === b[1] && a[2] === b[2]);
/** Case après `look` (DS1) ; la même référence si rien ne change (`open` : case ombrée seulement). */
function lookCell(cell: FakeCell | undefined, look: Exclude<CellLook, { key: "accept" }>): FakeCell | undefined {
  const base = cell ?? EMPTY_CELL;
  if (look.key === "ha") {
    const v = look.value === "left" ? undefined : look.value;
    if (base.ha === v) return cell;
    const { ha: _h, ...rest } = base;
    return v === undefined ? rest : { ...rest, ha: v };
  }
  if (look.key === "va") {
    const v = look.value === "top" ? undefined : look.value;
    if (base.va === v) return cell;
    const { va: _v, ...rest } = base;
    return v === undefined ? rest : { ...rest, va: v };
  }
  if (look.key === "border") {
    const v = look.value ?? undefined;
    if (sameBorder(base.border, v)) return cell;
    const { border: _b, ...rest } = base;
    return v === undefined ? rest : { ...rest, border: [v[0], v[1], v[2]] };
  }
  if (cell === undefined || cell.shade === null || (cell.open === true) === look.value) return cell;
  const { open: _o, ...rest } = cell;
  return look.value ? { ...rest, open: true } : rest;
}
const sameList = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);
```

`case` dans `apply`, après `SetCellImage` :

```ts
      case "SetTableLook": {
        // suite OG32 (DS1), comme `cmd_set_table_look` : valeur d'abord, puis tableau, coins, seulement ce qui change.
        const look = checkedLook(cmd.look);
        if (look === null) throw new Error(MESSAGES.badTable);
        const { found, t } = this.tableOf(cmd.id);
        const rect = rectOf(t, cmd.from, cmd.to);
        if (rect === null) throw new Error(MESSAGES.badTable);
        if (look.key === "accept") {
          const cols = t.cols.map((c, i): TableCol => {
            if (i < rect.c0 || i > rect.c1 || sameList(c.accept ?? [], look.value)) return c;
            const { accept: _a, ...rest } = c;
            return look.value.length === 0 ? rest : { ...rest, accept: [...look.value] };
          });
          return cols.every((c, i) => c === t.cols[i]) ? this.unchanged() : this.writeTable(found, cmd.id, { ...t, cols });
        }
        const cells = new Map(t.cells);
        let changed = false;
        for (const [r, c] of targets(rect, mergesOf(t))) {
          const k = keyAt(t, r, c);
          const cur = t.cells.get(k);
          const next = lookCell(cur, look);
          if (next === cur || next === undefined) continue;
          cells.set(k, next);
          changed = true;
        }
        return changed ? this.writeTable(found, cmd.id, { ...t, cells }) : this.unchanged();
      }
```

`setOnTargets`, Ombrer et Désombrer retirent `open` (comme le cœur) :

```ts
    for (const [r, c] of targets(rect, mergesOf(t))) {
      const k = keyAt(t, r, c);
      const cell = t.cells.get(k) ?? EMPTY_CELL;
      const reopen = key === "shade" && cell.open === true;
      if (cell[key] === value && !reopen) continue;
      const { open: _o, ...rest } = cell;
      cells.set(k, key === "shade" ? { ...rest, shade: value } : { ...cell, [key]: value });
      changed = true;
    }
```

(Si le lint refuse les variables `_x` inutilisées, suivre la forme de `SetTableOptions`, `fake-core.ts:1665`.)

- [ ] **6. CLI** — `apps/cli/src/ops.ts:17` : `"SetTableLook"` après `"SetCellImage"`. `apps/cli/src/formats.ts:59`, ligne
  `.roomboard` : troisième note `"tableau (personnalisation-3) : clés de case `ha`, `va`, `border` [couleur, épaisseur, style], `open` et de colonne `accept` (`SetTableLook`)"`.
  `scripts/essais/cli-essai.mjs`, à la fin du bloc personnalisation-3 (après le passage T9, avec ses variables `tab`,
  `pl`, `cli`, `lignesOps`, `verifie`, `egal`, `etat`) :

```js
  // personnalisation-3 suite (T3, DS1) : SetTableLook ha, border, accept, open ; relus par `state` ; undo : une étape.
  const lr0 = tab.table.rows[0].id;
  const lr2 = tab.table.rows[2].id;
  const lc0 = tab.table.cols[0].id;
  const lc1 = tab.table.cols[1].id;
  const look = cli(["run", pl, "--save", "--ops", "-"], lignesOps(
    { type: "SetTableLook", id: tab.id, from: { row: lr0, col: lc0 }, to: { row: lr0, col: lc1 }, look: { key: "ha", value: "center" } },
    { type: "SetTableLook", id: tab.id, from: { row: lr0, col: lc0 }, to: { row: lr0, col: lc0 }, look: { key: "border", value: ["#dc2626", 8, "dashed"] } },
    { type: "SetTableLook", id: tab.id, from: { row: lr0, col: lc1 }, to: { row: lr0, col: lc1 }, look: { key: "accept", value: ["chat", "chien"] } },
    { type: "SetTableShade", id: tab.id, from: { row: lr2, col: lc0 }, to: { row: lr2, col: lc0 }, shade: "#94a3b8" },
    { type: "SetTableLook", id: tab.id, from: { row: lr2, col: lc0 }, to: { row: lr2, col: lc0 }, look: { key: "open", value: true } },
    { op: "state" },
    { op: "undo" },
    { op: "undo" },
    { op: "undo" },
    { op: "state" },
  ));
  const tabDe = (i) => (look.lignes[i]?.state?.pages?.[0]?.elements ?? []).find((e) => e.id === tab.id)?.table;
  const caseDe = (i, r, c) => tabDe(i)?.cells?.find((x) => x.row === r && x.col === c);
  verifie("T-S8 : SetTableLook ha center sur deux cases, relu par state", look.code === 0 && caseDe(5, lr0, lc0)?.ha === "center" && caseDe(5, lr0, lc1)?.ha === "center", look.brut);
  verifie("T-S9 : SetTableLook border relu [couleur, épaisseur, style]", JSON.stringify(caseDe(5, lr0, lc0)?.border) === JSON.stringify(["#dc2626", 8, "dashed"]), look.brut);
  verifie("T-S14 : SetTableLook accept relu sur la colonne", JSON.stringify(tabDe(5)?.cols?.find((c) => c.id === lc1)?.accept) === JSON.stringify(["chat", "chien"]), look.brut);
  verifie("T-S12 : SetTableLook open sur la case ombrée", caseDe(5, lr2, lc0)?.open === true, look.brut);
  verifie("T-S12 : trois undo, une étape chacun : open, ombrage et accept retirés, bordure gardée", caseDe(9, lr2, lc0) === undefined && tabDe(9)?.cols?.find((c) => c.id === lc1)?.accept === undefined && caseDe(9, lr0, lc0)?.border !== undefined, look.brut);
  egal("T-S9 : réouverture : bordure présente", etat(pl).pages[0].elements.find((e) => e.id === tab.id)?.table?.cells?.find((x) => x.row === lr0 && x.col === lc0)?.border, ["#dc2626", 8, "dashed"]);
```

(Si `tab.table.rows` a moins de trois lignes à cet endroit, prendre la dernière ligne pour `lr2` ; si `egal` compare par
`===`, comparer `JSON.stringify`.)

- [ ] **7. Vert** — commande M, contrat (10), `tsc`, CLI (`CLI : OK`) ; contrat entier `-t "personnalisation-3|C10a|C10b"` vert.

- [ ] **8. Commit** — fichiers de la ligne T3 ; message `feat(web,cli): SetTableLook in the contract, real and fake cores in parity, CLI pass`.

---

### Tâche T4 — `ReorderTableLines` : cœur, Wasm, contrat, CLI

<a id="tache-t4"></a>

**Objectif** (D18, DS2, S11, S16, S17) : réordonner les lignes (`row`) ou les colonnes (`col`) d'un tableau : `order` =
permutation de tous les ids lisibles de l'axe ; entrées recopiées avec leurs clés inconnues (`accept` compris) ;
cellules, indexées par ids, inchangées ; objets liés suivis dans la même transaction ; refus si une zone serait coupée ;
ordre inchangé : aucune étape.

**Patron à ne pas reprendre** : retirer puis réinsérer les entrées une à une **en relisant les rangs** pendant la boucle
(les rangs bruts glissent après chaque `remove`) ou recréer les lignes par `InsertTableLine` + `RemoveTableLine` (ids
neufs, liens d'objets rompus, cellules perdues). Chemin de référence : places brutes lues **avant** la transaction
(`Line.index`), copies `as_prelim` prises avant toute écriture, puis à chaque place `remove(slot)` + `insert(slot, copie)` ;
suivi par `follow_in` comme `cmd_set_table_line_sizes` (`crates/roomboard-core/src/table_links.rs:322-346`).

**Fichiers** : ligne T4.

**Interfaces**
- Consomme : `offsets`, `follow_in`, `table_done_with` (`table_links.rs:48`, `:229`, `:311`) ; `merges_of`, `RawTable::axis`
  (`table.rs:288`, `:586`, déjà `pub(crate)` : `table.rs` n'est pas touché) ; `table_axis(row: bool)` (`roomboard-wasm/src/lib.rs:207`).
- Produit : `Command::ReorderTableLines { id: String, axis: TableAxis, order: Vec<String> }` ; Wasm
  `reorder_table_lines(&mut self, id: &str, row: bool, order: Vec<String>) -> Result<JsValue, JsError>` et
  `reorder_table_lines_inner(&mut self, id: &str, row: bool, order: &[String]) -> Result<Change, CommandError>` ; TS
  `| { readonly type: "ReorderTableLines"; readonly id: string; readonly axis: TableAxis; readonly order: readonly string[] }`.
- Réutilise : `crates/roomboard-core/src/table_links.rs:229` `follow_in`, `:48` `offsets` — suivi (réutiliser).
- Réutilise : `yrs::types::AsPrelim` (importé `table_links.rs:7`) — `map.as_prelim(&txn)` (réutiliser).
- Réutilise : `apps/web/src/core/fake-core.ts:1069` `writeTable` — suivi du faux cœur (réutiliser).

**Test et commande bornée** :
- `cd $WT && nice -n 10 cargo test -p roomboard-core reorder -j 4 2>&1 | tail -10` : `test result: ok. 5 passed`
  (`reorder_table_lines_rows_and_undo`, `reorder_refuses_bad_order`, `reorder_refuses_cut_merge`,
  `reorder_moves_linked_objects`, `reorder_reload_keeps_bytes`).
- `cd $WT && nice -n 10 cargo test -p roomboard-wasm reorder -j 4 2>&1 | tail -6` : 1 passé.
- Commande M, puis contrat `-t "ReorderTableLines"` (préfixe `ROOMBOARD_WASM_REQUIRED=1`) : `Tests  6 passed`.
- CLI : `ops.test.ts` (45), `formats.test.ts` verts ; `cli-essai.mjs` : `T-S11` puis `CLI : OK`.
- clippy `-D warnings` sur `roomboard-core` et `roomboard-wasm` propre.

**Contraintes (recopiées)** : G1 TDD · G2 `cd $WT &&` · G3 `nice -n 10`, `cargo -j 4`, preuves bornées · G4 commande M
avant et après, arrêt si principal > 1 532 864 o ou formats > 3 104 768 o · G5 aucune clé neuve, entrées recopiées avec
leurs clés inconnues, test « recharger garde » · G6 CLI : `COMMAND_TYPES`, `ops.test.ts`, note `FORMAT_LOTS`,
`formats.test.ts`, `cli-essai.mjs` · G7 une étape, ordre inchangé : aucune · G13 interdits · G14 commits · G15 rapport.

**Interdits** : aucun tri dans le cœur ; aucune autre commande neuve.

**Terminé quand** : 5 + 1 tests cœur, 6 de contrat, CLI `CLI : OK`, clippy propre, commande M sous les seuils, un commit.

#### Étapes

- [ ] **1. Tests rouges (cœur)** — `table_links.rs`, `mod tests` (aides `first`, `table3`, `view`, `rect`, `place11`) :

```rust
    fn reorder(id: &str, order: Vec<String>) -> Command {
        Command::ReorderTableLines { id: id.into(), axis: TableAxis::Row, order }
    }
    fn row_ids(d: &Document, t: &str) -> Vec<String> {
        view(d, t).rows.iter().map(|x| x.id.clone()).collect()
    }

    #[test]
    fn reorder_table_lines_rows_and_undo() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let r = row_ids(&d, &t);
        let c = d.apply(reorder(&t, vec![r[2].clone(), r[0].clone(), r[1].clone()])).expect("ordre");
        assert_eq!(c.ids, vec![t.clone()]);
        assert_eq!(row_ids(&d, &t), vec![r[2].clone(), r[0].clone(), r[1].clone()]);
        let v = d.version();
        d.apply(reorder(&t, vec![r[2].clone(), r[0].clone(), r[1].clone()])).expect("même");
        assert_eq!(d.version(), v);
        assert!(d.undo());
        assert_eq!(row_ids(&d, &t), r);
    }

    #[test]
    fn reorder_refuses_bad_order() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let r = row_ids(&d, &t);
        for o in [vec![r[0].clone(), r[1].clone()], vec![r[0].clone(), r[0].clone(), r[1].clone()], vec![r[0].clone(), r[1].clone(), "zz".into()]] {
            assert_eq!(d.apply(reorder(&t, o)), Err(CommandError::BadTable));
        }
        assert_eq!(d.apply(reorder("zz", r)), Err(CommandError::UnknownElement("zz".into())));
    }

    #[test]
    fn reorder_refuses_cut_merge() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let r = row_ids(&d, &t);
        let c0 = view(&d, &t).cols[0].id.clone();
        d.apply(Command::MergeTableCells { id: t.clone(), from: (r[0].clone(), c0.clone()), to: (r[1].clone(), c0) }).expect("fusion");
        let ver = d.version();
        assert_eq!(d.apply(reorder(&t, vec![r[0].clone(), r[2].clone(), r[1].clone()])), Err(CommandError::BadTable));
        assert_eq!(d.version(), ver);
        d.apply(reorder(&t, vec![r[2].clone(), r[0].clone(), r[1].clone()])).expect("zone entière déplacée");
    }

    #[test]
    fn reorder_moves_linked_objects() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1100.0, 1050.0);
        place11(&mut d, &t, &o);
        let y0 = tx(&d, &o)[5];
        let h0 = view(&d, &t).rows[0].height;
        let r = row_ids(&d, &t);
        let c = d.apply(reorder(&t, vec![r[1].clone(), r[0].clone(), r[2].clone()])).expect("ordre");
        assert_eq!(c.ids, vec![t.clone(), o.clone()]);
        assert_eq!(tx(&d, &o)[5], y0 - h0);
    }

    #[test]
    fn reorder_reload_keeps_bytes() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta { app_version: "0.1.0".into(), now: "2026-11-28T00:00:00Z".into(), created: None };
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let r = row_ids(&d, &t);
        d.apply(reorder(&t, vec![r[2].clone(), r[1].clone(), r[0].clone()])).expect("ordre");
        let file = save(&load(&save(&d, &meta).expect("save")).expect("load 1"), &meta).expect("resave 1");
        let again = save(&load(&file).expect("load 2"), &meta).expect("resave 2");
        assert_eq!(file, again);
        assert_eq!(row_ids(&load(&file).expect("load"), &t), vec![r[2].clone(), r[1].clone(), r[0].clone()]);
    }
```

Wasm, à côté du test de T2 :

```rust
    #[test]
    fn reorder_table_lines_inner_swaps_rows() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d.add_table_inner(&p, [0.0, 0.0], [2, 2], [240.0, 64.0], "#000000", 36.0).expect("tableau").ids[0].clone();
        let r: Vec<String> = table_of(&d, &id).rows.iter().map(|x| x.id.clone()).collect();
        d.reorder_table_lines_inner(&id, true, &[r[1].clone(), r[0].clone()]).expect("ordre");
        assert_eq!(table_of(&d, &id).rows.iter().map(|x| x.id.clone()).collect::<Vec<_>>(), vec![r[1].clone(), r[0].clone()]);
    }
```

- [ ] **2. Rouge** — `cargo test -p roomboard-core reorder` : compilation refusée (variante absente) ; commande M (avant).

- [ ] **3. Cœur** — `table_links.rs`, dans `impl Document` (aucun `HashMap` : recherche linéaire, 64 lignes au plus, pas de code de hachage neuf dans le Wasm ; `merges_of` depuis
  `crate::table`) :

```rust
    /// `ReorderTableLines` (D18) : `order` = permutation des ids lisibles de l'axe ; les places brutes des entrées
    /// lisibles reçoivent, dans l'ordre demandé, une recopie de chaque entrée (`as_prelim` : clés inconnues gardées) ;
    /// entrées illisibles laissées à leur place ; cellules (par ids) inchangées ; une zone ne peut pas être coupée ;
    /// objets liés suivis dans la même transaction ; ordre inchangé : aucune étape.
    pub(crate) fn cmd_reorder_table_lines(
        &mut self,
        id: &str,
        axis: TableAxis,
        order: &[String],
    ) -> Result<Change, CommandError> {
        let (page, e, raw) = self.table_of(id)?;
        let (lines, arr) = raw.axis(axis);
        // Rang d'un id dans `order` : recherche linéaire (64 lignes au plus, G4 : aucun code de hachage neuf).
        let pos = |id: &str| order.iter().position(|o| o == id);
        let unique = order.iter().enumerate().all(|(i, o)| order[..i].iter().all(|p| p != o));
        if order.len() != lines.len() || !unique || lines.iter().any(|l| pos(&l.id).is_none()) {
            return Err(CommandError::BadTable);
        }
        if lines.iter().zip(order).all(|(l, o)| &l.id == o) {
            return Ok(self.unchanged());
        }
        {
            let txn = self.read();
            for m in merges_of(&raw, &txn) {
                let (a, b) = match axis {
                    TableAxis::Row => (m.r0, m.r1),
                    TableAxis::Col => (m.c0, m.c1),
                };
                let first = pos(&lines[a].id).unwrap_or(usize::MAX);
                if (a..=b).any(|k| pos(&lines[k].id) != Some(first.wrapping_add(k - a))) {
                    return Err(CommandError::BadTable);
                }
            }
        }
        let before = offsets(&raw);
        let arr = arr.clone();
        let slots: Vec<u32> = lines.iter().map(|l| l.index).collect();
        let moved = {
            let mut txn = self.transact_local();
            let copies: Vec<MapPrelim> = order
                .iter()
                .filter_map(|o| lines.iter().find(|l| &l.id == o).map(|l| l.map.as_prelim(&txn)))
                .collect();
            for (slot, copy) in slots.into_iter().zip(copies) {
                arr.remove(&mut txn, slot);
                arr.insert(&mut txn, slot, copy);
            }
            self.follow_in(&mut txn, &page, &e, id, &before, &HashSet::new())
        };
        Ok(self.table_done_with(page, id, moved))
    }
```

`commands.rs`, variante après `SetTableLook` :

```rust
    /// personnalisation-3 (D18) : réordonne les lignes (`Row`) ou colonnes (`Col`) ; `order` = tous les ids lisibles ;
    /// zone coupée ou ordre invalide : `BadTable` ; ordre inchangé : aucune étape ; objets liés suivis.
    ReorderTableLines {
        id: String,
        axis: TableAxis,
        order: Vec<String>,
    },
```

et `Command::ReorderTableLines { id, axis, order } => self.cmd_reorder_table_lines(&id, axis, &order),`. Wasm :

```rust
    /// personnalisation-3 (D18) : `row` vrai = lignes, faux = colonnes ; `order` = tous les ids de l'axe.
    pub fn reorder_table_lines(&mut self, id: &str, row: bool, order: Vec<String>) -> Result<JsValue, JsError> {
        to_js(&self.reorder_table_lines_inner(id, row, &order).map_err(cmd_err)?)
    }
```

```rust
    pub fn reorder_table_lines_inner(&mut self, id: &str, row: bool, order: &[String]) -> Result<Change, CommandError> {
        self.run(Command::ReorderTableLines { id: id.to_string(), axis: table_axis(row), order: order.to_vec() })
    }
```

Vert cœur (5), Wasm (1), clippy ; **commande M** (après).

- [ ] **4. Contrat TS (rouge puis vert)** — trois `it` dans `describe.each(c10aFactories)("contrat personnalisation-3 : $name", …)` :

```ts
  it("ReorderTableLines (D18) : 2, 0, 1 ; une étape ; même ordre : aucune ; annuler", () => {
    const d = f.blank();
    const s = p3Placed(d);
    const r = tableOf(d, s.t).rows.map((x) => x.id);
    expect(d.apply({ type: "ReorderTableLines", id: s.t, axis: "row", order: [r[2]!, r[0]!, r[1]!] }).ids).toEqual([s.t]);
    expect(tableOf(d, s.t).rows.map((x) => x.id)).toEqual([r[2], r[0], r[1]]);
    unchanged(d, () => d.apply({ type: "ReorderTableLines", id: s.t, axis: "row", order: [r[2]!, r[0]!, r[1]!] }));
    d.undo();
    expect(tableOf(d, s.t).rows.map((x) => x.id)).toEqual(r);
    d.free();
  });

  it("ReorderTableLines refusé : permutation fausse, zone coupée, rien d'écrit ; zone entière déplacée", () => {
    const d = f.blank();
    const s = p3Placed(d);
    const v = tableOf(d, s.t);
    const r = v.rows.map((x) => x.id);
    const c0 = v.cols[0]?.id ?? "";
    for (const order of [[r[0]!, r[1]!], [r[0]!, r[0]!, r[1]!], [r[0]!, r[1]!, "zz"]]) {
      unchanged(d, () => expect(() => d.apply({ type: "ReorderTableLines", id: s.t, axis: "row", order })).toThrow(TABLE_MESSAGE));
    }
    d.apply({ type: "MergeTableCells", id: s.t, from: { row: r[0]!, col: c0 }, to: { row: r[1]!, col: c0 } });
    unchanged(d, () => expect(() => d.apply({ type: "ReorderTableLines", id: s.t, axis: "row", order: [r[0]!, r[2]!, r[1]!] })).toThrow(TABLE_MESSAGE));
    d.apply({ type: "ReorderTableLines", id: s.t, axis: "row", order: [r[2]!, r[0]!, r[1]!] });
    expect(tableOf(d, s.t).rows.map((x) => x.id)).toEqual([r[2], r[0], r[1]]);
    d.free();
  });

  it("ReorderTableLines suivi (D5) : l'objet logé en (1, 1) remonte de la hauteur de la ligne 0 ; colonnes : accept gardé", () => {
    const d = f.blank();
    const s = p3Placed(d);
    p3Place11(d, s);
    const y0 = d.element(s.o)?.transform[5] ?? 0;
    const v = tableOf(d, s.t);
    const r = v.rows.map((x) => x.id);
    const c = d.apply({ type: "ReorderTableLines", id: s.t, axis: "row", order: [r[1]!, r[0]!, r[2]!] });
    expect(c.ids).toEqual([s.t, s.o].sort());
    expect(d.element(s.o)?.transform[5]).toBe(y0 - (v.rows[0]?.height ?? 0));
    p3Look(d, s, [0, 2], [0, 2], { key: "accept", value: ["chat"] });
    const k = tableOf(d, s.t).cols.map((x) => x.id);
    d.apply({ type: "ReorderTableLines", id: s.t, axis: "col", order: [k[2]!, k[0]!, k[1]!] });
    expect(tableOf(d, s.t).cols[0]?.accept).toEqual(["chat"]);
    d.free();
  });
```

(Si l'ordre de `c.ids` diffère entre les deux fabriques, comparer `[...c.ids].sort()`, comme le test de `PlaceInCell`.)
`api.ts` : variante (et ligne d'en-tête). `wasm-core.ts` :
`case "ReorderTableLines": return toChange(this.d.reorder_table_lines(cmd.id, cmd.axis === "row", [...cmd.order]));`.
`fake-core.ts` :

```ts
      case "ReorderTableLines": {
        // personnalisation-3 (D18), comme `cmd_reorder_table_lines` : tableau, permutation, zones non coupées, puis
        // écriture (suivi des objets liés par writeTable).
        const { found, t } = this.tableOf(cmd.id);
        const lines: readonly (TableRow | TableCol)[] = cmd.axis === "row" ? t.rows : t.cols;
        const ids = lines.map((l) => l.id);
        const order = [...cmd.order];
        if (order.length !== ids.length || new Set(order).size !== order.length || ids.some((x) => !order.includes(x))) throw new Error(MESSAGES.badTable);
        if (ids.every((x, i) => x === order[i])) return this.unchanged();
        const pos = new Map(order.map((x, i) => [x, i]));
        for (const m of mergesOf(t)) {
          const [a, b] = cmd.axis === "row" ? [m.r0, m.r1] : [m.c0, m.c1];
          const first = pos.get(ids[a] ?? "") ?? -1;
          for (let k = a; k <= b; k++) if (pos.get(ids[k] ?? "") !== first + (k - a)) throw new Error(MESSAGES.badTable);
        }
        const byId = new Map(lines.map((l) => [l.id, l]));
        const next = order.map((x) => byId.get(x)!);
        return this.writeTable(found, cmd.id, cmd.axis === "row" ? { ...t, rows: next as TableRow[] } : { ...t, cols: next as TableCol[] });
      }
```

- [ ] **5. CLI** — `ops.ts` : `"ReorderTableLines"` après `"SetTableLook"` ; `ops.test.ts` : 44 → 45 ; `formats.ts` et
  `formats.test.ts` : la note de T3 se termine par `" ; ordre des lignes et des colonnes (`ReorderTableLines`)"`.
  `cli-essai.mjs`, après le passage de T3 :

```js
  // personnalisation-3 suite (T4, D18) : ReorderTableLines inverse les lignes, relu par `state` ; undo : une étape.
  const rows0 = etat(pl).pages[0].elements.find((e) => e.id === tab.id).table.rows.map((r) => r.id);
  const ordre = cli(["run", pl, "--save", "--ops", "-"], lignesOps(
    { type: "ReorderTableLines", id: tab.id, axis: "row", order: [...rows0].reverse() },
    { op: "state" },
    { op: "undo" },
    { op: "state" },
  ));
  const rowsDe = (i) => ((ordre.lignes[i]?.state?.pages?.[0]?.elements ?? []).find((e) => e.id === tab.id)?.table?.rows ?? []).map((r) => r.id);
  verifie("T-S11 : ReorderTableLines inverse les lignes, relu par state", ordre.code === 0 && JSON.stringify(rowsDe(1)) === JSON.stringify([...rows0].reverse()), ordre.brut);
  verifie("T-S11 : undo, une étape : ordre d'origine", JSON.stringify(rowsDe(3)) === JSON.stringify(rows0), ordre.brut);
```

(Si le tableau `tab` porte une zone sur plusieurs lignes à cet endroit, inverser seulement les deux dernières lignes.)

- [ ] **6. Vert** — toutes les preuves de la section ; commande M (après) au rapport.

- [ ] **7. Commit** — fichiers de la ligne T4 ; message `feat(core,web,cli): ReorderTableLines reorders rows or columns, keeps merges whole, linked objects follow`.

---

### Tâche T5 — Point 7 : double appui et Alt+A, ajuster au contenu

<a id="tache-t5"></a>

**Objectif** (D14, DS7, S7) : deux appuis (≤ 300 ms et ≤ 8 px écran entre les deux) sur une poignée de taille ou une
bordure (± 6 px, intérieure comprise) : colonne = max(largeur naturelle, objets logés) bornée à 960, ligne = hauteur
exigée, les autres lignes qui exigent plus regrandissent ; une `SetTableLineSizes`. Un premier appui sur une bordure
intérieure ouvre la saisie (F14) : le second la valide sans écrire, puis ajuste. Alt+A : la colonne et la ligne de la case
active (dernières de la zone), une commande. Corrige TB3 (qui ne voyait pas la saisie ouverte entre les deux appuis).

**Fichiers** : ligne T5.

**Interfaces**
- Consomme (lot A, TB1) : `grabAt`, `resizeTo`, `linkedBoxes`, `requiredSizes`, `layoutRich`, `InputSample.t` (ms),
  `commit()` (validation de la saisie).
- Produit : `export function naturalWidth(t: TableData, col: number, measure: Measure): number` ; `export const DOUBLE_TAP_MS = 300; export const DOUBLE_TAP_PX = 8; export const FIT_MAX_WIDTH = 4 * TABLE_COL_WIDTH;` (`table-geom.ts`) ;
  `TableAction` + `"fit-content"` ; `TableKey` + `"fit-content"` (Alt+A, `code` `KeyA`).
- Réutilise : `apps/web/src/engine/text-layout.ts:250` `layoutRich` — lignes sans retour (largeur 1e9) (réutiliser).
- Réutilise : `apps/web/src/engine/table-geom.ts` `requiredSizes`, `linkedBoxes` — objets et hauteurs exigées (réutiliser).
- Réutilise : `SetTableLineSizes` (lot A) — écriture des tailles (réutiliser).

**Test et commande bornée** :
`cd $WT && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/table-geom.test.ts src/engine/tools/table.test.ts src/engine/input/keys.test.ts src/ui/shortcuts.test.ts -t "naturalWidth|S7|tableKey|shortcuts|OG23 × OG26" 2>&1 | tail -8`
(`naturalWidth` : 2 ; `S7` : 4 ; le reste vert). Garder vert : `table.test.ts` entier (TB1).

**Contraintes (recopiées)** : G1 TDD · G2 worktree (isolé : celui de l'orchestrateur), `cd $WT &&` · G3 `nice -n 10`,
preuves bornées · G7 une commande par geste, rien ne change : aucune commande · G8 événements de pointeur, poignées 44 px ·
G9 Alt+A lu par `code`, `SHORTCUTS` + `EXPECT`, liste `table` du test « fusion OG23 × OG26 » · G10 hors tableau rien ne
change · G13 interdits · G14 commits · G15 rapport.

**Interdits** : pas de Rust ; aucune mesure dans `emit` ni par image ; le premier appui ne change rien.

**Terminé quand** : preuves vertes, un commit.

#### Étapes

- [ ] **1. Tests rouges** — `table-geom.test.ts` :

```ts
import { naturalWidth } from "./table-geom";
describe("naturalWidth (D14, DS7)", () => {
  const m = (s: string) => s.length * 10;
  const t = (texts: Record<string, string>, merges: TableData["merges"] = []): TableData => ({
    color: "#000", size: 36, merges,
    cols: [{ id: "a", width: 100 }, { id: "b", width: 100 }],
    rows: [{ id: "r0", height: 64 }, { id: "r1", height: 64 }],
    cells: Object.entries(texts).map(([k, text]) => {
      const [row, col] = k.split(":");
      return { row: row ?? "", col: col ?? "", text, fill: null, shade: null, spans: [{ text, attrs: {} }] };
    }),
  });
  it("naturalWidth : ligne la plus longue sans retour + 2 × marge ; paragraphes séparés", () => {
    expect(naturalWidth(t({ "r0:a": "Photosynthèse", "r1:a": "ab\nabcdef" }), 0, m)).toBe(130 + 16);
  });
  it("naturalWidth : zone de deux colonnes ignorée ; colonne vide : 2 × marge", () => {
    expect(naturalWidth(t({ "r0:a": "abcdefghij" }, [{ row: "r0", col: "a", rows: 1, cols: 2 }]), 0, m)).toBe(16);
  });
});
```

`tools/table.test.ts` (sous `const at = …`, ajouter `const atT = (x: number, y: number, t: number): InputSample => ({ ...at(x, y), t });`) :

```ts
describe("outil Tableau — S7 ajuster au contenu (D14, DS7)", () => {
  /** 3 × 3 en (100, 200), « Photosynthèse » en (0, 0), case (0, 0) active, saisie fermée. */
  const ready = () => {
    const s = setup();
    const id = s.create(100, 200, 3, 3);
    s.type("Photosynthèse");
    s.tool.requestCommit();
    s.click(100 + 120, 200 + 32);
    s.tool.requestCommit();
    return { s, id };
  };
  it("S7 : double appui sur la poignée droite : colonne 0 = 13 × 10 + 16, une commande", () => {
    const { s, id } = ready();
    const n = s.runs.length;
    s.tool.begin(3, [atT(340, 232, 1000)]);
    s.tool.close(3, "end");
    s.tool.begin(4, [atT(342, 232, 1200)]);
    s.tool.close(4, "end");
    expect(s.runs.length).toBe(n + 1);
    expect(s.last()?.type).toBe("SetTableLineSizes");
    expect(s.table(id).cols.map((c) => c.width)).toEqual([146, 240, 240]);
  });
  it("S7 : deux appuis à 400 ms, puis à 20 px : aucun ajustement", () => {
    const { s, id } = ready();
    s.tool.begin(3, [atT(340, 232, 1000)]);
    s.tool.close(3, "end");
    s.tool.begin(4, [atT(340, 232, 1400)]);
    s.tool.close(4, "end");
    s.tool.begin(5, [atT(340, 252, 1500)]);
    s.tool.close(5, "end");
    expect(s.table(id).cols.map((c) => c.width)).toEqual([240, 240, 240]);
  });
  it("S7 : double appui sur la bordure intérieure de la ligne 0 (saisie ouverte au premier) : validée sans écrire, ligne ajustée", () => {
    const { s, id } = ready();
    s.doc.apply({ type: "SetTableLineSizes", id, cols: [], rows: [[s.table(id).rows[0]?.id ?? "", 150]] });
    const n = s.runs.length;
    s.tool.begin(3, [atT(450, 350, 1000)]);
    s.tool.close(3, "end");
    s.tool.begin(4, [atT(451, 350, 1150)]);
    s.tool.close(4, "end");
    expect(s.runs.slice(n).map((c) => c.type)).toEqual(["SetTableLineSizes"]);
    expect(s.table(id).rows[0]?.height).toBe(64);
  });
  it("S7 : Alt+A (fit-content) : colonne et ligne de la case active en une SetTableLineSizes", () => {
    const { s, id } = ready();
    const n = s.runs.length;
    s.tool.act("fit-content");
    expect(s.runs.length).toBe(n + 1);
    expect(s.last()?.type).toBe("SetTableLineSizes");
    expect(s.table(id).cols[0]?.width).toBe(146);
    expect(s.table(id).rows[0]?.height).toBe(64);
  });
});
```

(Ligne 0 à 150 : son bord bas est en y = 200 + 150 = 350 ; x = 450 est dans la colonne 1, loin des poignées de la case
(0, 0). Si `requestCommit` laisse la saisie de « Photosynthèse » à 64, la hauteur exigée vaut 64.)

`input/keys.test.ts` : `expect(tableKey({ key: "a", code: "KeyA", ctrlKey: false, metaKey: false, shiftKey: false, altKey: true, isComposing: false, target: null })).toBe("fit-content");` dans le `it` de `tableKey` ;
`k("a", { code: "KeyA", altKey: true }),` dans la liste `table` du `describe("fusion OG23 × OG26 …")`.
`ui/shortcuts.test.ts`, `EXPECT` : `"table-fit-content": ["table", "fit-content"],`.

- [ ] **2. Rouge** — commande bornée.

- [ ] **3. `table-geom.ts`** :

```ts
/** Double appui (D14, H15) : 300 ms entre deux appuis, 8 px écran ; largeur ajustée bornée (H16). */
export const DOUBLE_TAP_MS = 300;
export const DOUBLE_TAP_PX = 8;
export const FIT_MAX_WIDTH = 4 * TABLE_COL_WIDTH;
/** Largeur « sans retour » pour la largeur naturelle. */
const NO_WRAP = 1e9;

/** Largeur naturelle d'une colonne (D14) : ligne de texte la plus longue sans retour automatique, sur les ancres d'une
 *  seule colonne (une zone de plusieurs colonnes et une cellule couverte sont ignorées), plus deux marges. */
export function naturalWidth(t: TableData, col: number, measure: Measure): number {
  const k = t.cols[col];
  if (k === undefined) return 2 * TABLE_PADDING;
  const zones = mergeRanges(t);
  let w = 0;
  t.rows.forEach((r, i) => {
    const z = zones.find((x) => inRange(x, { row: i, col }));
    if (z !== undefined && (z.c0 !== z.c1 || z.r0 !== i)) return;
    for (const line of layoutRich(cellContent(t, r.id, k.id).spans, { size: t.size }, NO_WRAP, measure)) {
      const last = line.segments[line.segments.length - 1];
      if (last !== undefined) w = Math.max(w, last.x + last.width);
    }
  });
  return w + 2 * TABLE_PADDING;
}
```

`TableAction` + `| "fit-content"`.

- [ ] **4. Outil Tableau** — importer `naturalWidth`, `DOUBLE_TAP_MS`, `DOUBLE_TAP_PX`, `FIT_MAX_WIDTH`. Après `let resize` :

```ts
  /** Dernier appui sur une bordure ou une poignée (D14) : le suivant, proche dans le temps et l'espace, ajuste. */
  let lastTap: { readonly id: string; readonly axis: "col" | "row"; readonly index: number; readonly t: number; readonly sx: number; readonly sy: number } | null = null;

  /** Ajuster au contenu (D14, DS7) : colonne = max(largeur naturelle, objets) bornée, lignes qui exigent plus
   *  regrandies ; ligne = hauteur exigée. Une SetTableLineSizes ; rien ne change : aucune. */
  const fitContent = (id: string, col: number | null, row: number | null): void => {
    const el = ctx.doc.element(id);
    if (el?.kind !== "table") return;
    const t = el.table;
    const linked = linkedBoxes(ctx.doc, ctx.page(), { id, transform: el.transform });
    const widths = t.cols.map((c) => c.width);
    const cols: (readonly [string, number])[] = [];
    if (col !== null) {
      const k = t.cols[col];
      const objs = requiredSizes(t, linked, widths, measure).cols[col] ?? 0;
      const w = Math.min(FIT_MAX_WIDTH, Math.max(naturalWidth(t, col, measure), objs));
      if (k !== undefined && k.width !== w) {
        cols.push([k.id, w]);
        widths[col] = w;
      }
    }
    const need = requiredSizes(t, linked, widths, measure).rows;
    const rows = t.rows.flatMap((r, i): (readonly [string, number])[] => {
      const h = need[i] ?? r.height;
      if (i === row) return h !== r.height ? [[r.id, h]] : [];
      return h > r.height ? [[r.id, h]] : [];
    });
    if (cols.length > 0 || rows.length > 0) ctx.run({ type: "SetTableLineSizes", id, cols, rows });
  };
```

Dans `begin`, **en tête** (avant `press = null`) :

```ts
      const tap = lastTap;
      lastTap = null;
      if (tap !== null && s.t - tap.t <= DOUBLE_TAP_MS && Math.hypot(s.x - tap.sx, s.y - tap.sy) <= DOUBLE_TAP_PX && !gate.composing()) {
        // D14 : second appui ; la saisie ouverte par le premier (bordure intérieure, F14) est validée sans écrire.
        if (opened !== null) commit();
        swallowed = pointerId;
        press = null;
        resize = null;
        fitContent(tap.id, tap.axis === "col" ? tap.index : null, tap.axis === "row" ? tap.index : null);
        refresh();
        ctx.stateChanged?.();
        return;
      }
```

Dans le bloc `if (grab !== null)`, avant `const start = …` :
`lastTap = { id: grab.id, axis: grab.edge.axis, index: grab.edge.index, t: s.t, sx: s.x, sy: s.y };`.
Dans `close`, bloc de la bordure armée : si `rz.size !== rz.size0`, `lastTap = null;` (un glisser n'est pas un appui) ;
dans `extend`, quand un appui de cellule devient une plage (`p.moved = true`), `lastTap = null;`.
`act` : `case "fit-content": fitContent(ref.id, span.c1, span.r1); break;`.
`input/keys.ts` : `TableKey` + `| "fit-content"` ; dans `tableKey`, à côté de Alt+E : `if (e.code === "KeyA") return "fit-content";`.
`ui/shortcuts.ts` : `s("table-fit-content", "Tableau", "Ajuster au contenu", "Alt+A"),` après `table-header`.

- [ ] **5. Vert** — commande bornée ; `table.test.ts` entier vert.

- [ ] **6. Commit** — fichiers de la ligne T5 ; message `feat(web): double tap a table border or grip, or Alt+A, to fit a column or a row to its content`.

---

### Tâche T6 — Point 8 : alignement, un seul calcul (`cellTextFrame`, `lineShift`) lu par dessin, pot et saisie

<a id="tache-t6"></a>

**Objectif** (D15, DS6, S8) : `ha` et `va` d'une case déplacent son texte ; **un seul calcul** : `cellTextFrame` (cadre)
et `lineShift` (décalage par ligne), lus par le dessin (`paintCellTexts`), le pot (`fill-target.ts`) et la saisie
(`openActive` + zone DOM `text-align`). `TableTool.look(l: CellLook)` et `Engine.tableLook(l)` posent une clé sur la plage
(sinon la zone) en une `SetTableLook`. Alt+Maj+C / Alt+Maj+M font tourner les alignements.

**Patron à ne pas reprendre** : calculer le décalage dans chaque consommateur. Aujourd'hui `paintText` calcule l'écart en
ligne (`apps/web/src/engine/render/canvas2d.ts:384-387`), le pot part du coin `cellInnerBox`
(`apps/web/src/engine/fill-target.ts:72-73`), la saisie aussi (`apps/web/src/engine/tools/table.ts:316-337`,
`openActive`), et `offsetAt` ignore l'alignement (`text-layout.ts:271-296`). Chemin de référence : `lineShift` dans
`text-layout.ts` (appelé par `paintText` **et** `offsetAt`) et `cellTextFrame` dans `table-geom.ts` (appelé par les trois
lecteurs) ; aucun lecteur ne fait d'arithmétique d'alignement lui-même.

**Fichiers** : ligne T6.

**Interfaces**
- Consomme (T3) : `CellLook`, `HAlign`, `VAlign`, `TableCell.ha`, `.va` ; `SetTableLook`.
- Produit :
  - `export function lineShift(line: RichLine, boxWidth: number, align: TextAlign): number` ; `offsetAt(spans, base, boxWidth, measure, lx, ly, align: TextAlign = "left")` (`text-layout.ts`).
  - `export function cellLook(t: TableData, rowId: string, colId: string): { readonly ha: HAlign; readonly va: VAlign; readonly border: TableBorder | null; readonly open: boolean }` ;
    `export interface CellTextFrame extends CellBox { readonly ha: HAlign }` ; `export function cellTextFrame(t: TableData, cell: Cell, textHeight: number): CellTextFrame` (`table-geom.ts`).
  - `TableCellState` + `readonly ha?: HAlign; readonly va?: VAlign;` ; `TableAction` + `"ha-next" | "va-next"` ; `TableKey` idem.
  - `TableTool.look(l: CellLook): void` (`tools/tool.ts`) ; `Engine.tableLook(l: CellLook): void` (`engine.ts`).
  - `export function paintCellTexts(ctx: CanvasRenderingContext2D, t: TableData, boxes: readonly CellTextBox[], lines: readonly (readonly RichLine[])[]): void` (`canvas2d.ts`).
  - `TextEditSession.align?: TextAlign` (`tools/text.ts`) ; `#stage[data-table-align]` = `"<ha>,<va>"` (vide sans case).
- Réutilise : `apps/web/src/engine/render/canvas2d.ts:381` `paintText` — son calcul passe dans `lineShift` (étendre).
- Réutilise : `apps/web/src/engine/table-geom.ts` `cellInnerBox` — `cellTextFrame` le prolonge (étendre).
- Réutilise : `apps/web/src/engine/text-layout.ts:271` `offsetAt` — paramètre `align` (étendre).
- Réutilise : `apps/web/src/engine/text-layout.ts` `richBoxHeight`, `layoutRich` — hauteur des lignes (réutiliser).

**Test et commande bornée** :
- `cd $WT && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/text-layout.test.ts src/engine/table-geom.test.ts src/engine/fill-target.test.ts src/engine/tools/table.test.ts src/engine/render/canvas2d.test.ts src/engine/engine.test.ts src/engine/input/keys.test.ts src/ui/shortcuts.test.ts -t "D15|lineShift|cellTextFrame|tableKey|shortcuts|OG23 × OG26" 2>&1 | tail -8`
  (`D15` : 5 ; `lineShift` : 1 ; `cellTextFrame` : 2 ; le reste vert).
- Témoin S6 (DS16) : `cd $WT && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/zone-s6-banc.test.ts 2>&1 | grep "S6 empreinte"` avant la tâche, puis après : lignes identiques
  (sinon : nouveau hash relevé et noté dans `docs/essais/c8-porte-s6.md` comme la PR 53, aucun seuil touché).
- Garder verts : `text-layout.test.ts`, `canvas2d.test.ts`, `fill-target.test.ts`, `table-paint.test.ts` entiers (le texte
  libre et les cases sans alignement donnent les mêmes appels qu'avant).

**Contraintes (recopiées)** : G1 TDD · G2 `cd $WT &&` · G3 `nice -n 10`, preuves bornées · G7 une commande par geste ·
G9 Alt+Maj+C, Alt+Maj+M lus par `code`, `SHORTCUTS` + `EXPECT`, liste `table` du test « fusion OG23 × OG26 » · G10 le texte
libre ne change pas (le pot du texte libre ne passe pas `align`) · G11 un seul calcul pour dessin, collision et exports ·
G13 interdits · G14 commits · G15 rapport.

**Interdits** : aucun décalage d'alignement calculé hors de `lineShift` et `cellTextFrame` ; ne pas déplacer un objet logé
quand l'alignement change (D8) ; `border` : T7.

**Terminé quand** : preuves vertes, empreinte S6 identique (ou documentée), un commit.

#### Étapes

- [ ] **1. Tests rouges.** `text-layout.test.ts` :

```ts
import { layoutRich, lineShift, offsetAt } from "./text-layout";
describe("lineShift (D15, DS6)", () => {
  const m = (s: string) => s.length * 10;
  it("lineShift : offsetAt et paintText d'accord : centré dans 100, « ab » (20) décalé de 40 ; le point 45 est sur « a »", () => {
    const spans = [{ text: "ab", attrs: {} }];
    const [line] = layoutRich(spans, { size: 36 }, 100, m);
    expect(lineShift(line!, 100, "center")).toBe(40);
    expect(lineShift(line!, 100, "right")).toBe(80);
    expect(lineShift(line!, 100, "left")).toBe(0);
    expect(offsetAt(spans, { size: 36 }, 100, m, 45, 5, "center")).toBe(0);
    expect(offsetAt(spans, { size: 36 }, 100, m, 45, 5)).toBeNull();
  });
});
```

`table-geom.test.ts` :

```ts
import { cellTextFrame } from "./table-geom";
describe("cellTextFrame (D15, DS6)", () => {
  const base = (cell: Partial<TableData["cells"][number]>): TableData => ({
    color: "#000", size: 36, merges: [],
    cols: [{ id: "a", width: 240 }], rows: [{ id: "r", height: 164 }],
    cells: [{ row: "r", col: "a", text: "x", fill: null, shade: null, spans: [{ text: "x", attrs: {} }], ...cell }],
  });
  it("cellTextFrame : sans alignement : la boîte intérieure, ha left", () => {
    expect(cellTextFrame(base({}), { row: 0, col: 0 }, 45)).toEqual({ x: 8, y: 8, w: 224, h: 148, ha: "left" });
  });
  it("cellTextFrame : va middle descend de (148 − 45) / 2, bottom de 148 − 45 ; ha porté", () => {
    expect(cellTextFrame(base({ va: "middle", ha: "center" }), { row: 0, col: 0 }, 45)).toEqual({ x: 8, y: 8 + 51.5, w: 224, h: 148 - 51.5, ha: "center" });
    expect(cellTextFrame(base({ va: "bottom" }), { row: 0, col: 0 }, 45)).toMatchObject({ y: 8 + 103 });
  });
});
```

`fill-target.test.ts` (banc `setup()` du fichier : tableau 2 × 2 en (100, 400), « Lundi matin » en (0, 0)) :

```ts
  it("D15 : pot sur un mot centré au milieu : le mot dessiné (« matin »), pas celui du coin", () => {
    const m10 = (x: string) => x.length * 10;
    const { doc, page, table, r, c } = setup();
    doc.apply({ type: "SetTableLineSizes", id: table, cols: [], rows: [[r[0] ?? "", 164]] });
    const cell = { row: r[0] ?? "", col: c[0] ?? "" };
    doc.apply({ type: "SetTableLook", id: table, from: cell, to: cell, look: { key: "ha", value: "center" } });
    doc.apply({ type: "SetTableLook", id: table, from: cell, to: cell, look: { key: "va", value: "middle" } });
    // Boîte 224 × 148 ; ligne de 110 × 45 décalée de 57 en x, de 51,5 en y ; « matin » en x 100 + 8 + 57 + 60 = 225..275.
    const cmd = fillCommand(doc, page, 250, 400 + 8 + 51.5 + 20, 1, "#dc2626", m10);
    expect(cmd).toMatchObject({ type: "SetTableCell" });
    const spans = (cmd as Extract<Command, { type: "SetTableCell" }>).spans ?? [];
    expect(spans.find((x) => x.attrs.color === "#dc2626")?.text).toBe("matin");
  });
```

(Adapter les noms rendus par `setup()` du fichier (`r`, `c`, `table`, `page`) ; importer `Command` s'il manque.)

`render/canvas2d.test.ts` :

```ts
import { paintCellTexts } from "./canvas2d";
import { cellTextBoxes } from "./table-paint";
describe("paintCellTexts (D15, S8 ; même peintre pour l'écran et le PDF)", () => {
  it("D15 : case centrée au milieu : texte décalé dans le cadre ; sans alignement : coin intérieur, comme avant", () => {
    const t: TableData = {
      color: "#000000", size: 36, merges: [],
      cols: [{ id: "a", width: 240 }, { id: "b", width: 240 }], rows: [{ id: "r", height: 164 }],
      cells: [
        { row: "r", col: "a", text: "ab", fill: null, shade: null, spans: [{ text: "ab", attrs: {} }], ha: "center", va: "middle" },
        { row: "r", col: "b", text: "ab", fill: null, shade: null, spans: [{ text: "ab", attrs: {} }] },
      ],
    };
    const ctx = new FakeCtx();
    const boxes = cellTextBoxes(t);
    const lines = boxes.map((b) => layoutRich(b.spans, { size: 36 }, b.w, (s) => s.length * 10));
    paintCellTexts(asCtx(ctx), t, boxes, lines);
    expect(ctx.log).toContain("transform 1,0,0,1,8,59.5");
    expect(ctx.log).toContain("transform 1,0,0,1,248,8");
    expect(ctx.texts.map((x) => x.x)).toEqual([102, 0]);
  });
});
```

(FakeCtx mesure 10 par caractère : « ab » = 20, centré dans 224 → 102 ; hauteur 45 → (148 − 45) / 2 = 51,5.)

`tools/table.test.ts` :

```ts
describe("outil Tableau — D15 alignement (S8)", () => {
  it("D15 : look ha sur une plage : une SetTableLook ; ha-next tourne gauche → centre → droite → gauche", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.tool.requestCommit();
    s.setShift(true);
    s.click(100 + 240 + 120, 232);
    s.setShift(false);
    s.tool.look({ key: "ha", value: "center" });
    const t = s.table(id);
    expect(s.last()).toEqual({ type: "SetTableLook", id, from: { row: t.rows[0]?.id, col: t.cols[0]?.id }, to: { row: t.rows[0]?.id, col: t.cols[1]?.id }, look: { key: "ha", value: "center" } });
    s.tool.act("ha-next");
    expect(s.tool.cellState()?.ha).toBe("right");
    s.tool.act("ha-next");
    expect(s.tool.cellState()?.ha).toBe("left");
    s.tool.act("va-next");
    expect(s.tool.cellState()?.va).toBe("middle");
  });
  it("D15 : saisie ouverte au cadre aligné : case milieu-centre → boîte descendue, align center", () => {
    const s = setup();
    const id = s.create(100, 200, 1, 1);
    s.type("ab");
    s.tool.requestCommit();
    const t = s.table(id);
    s.doc.apply({ type: "SetTableLineSizes", id, cols: [], rows: [[t.rows[0]?.id ?? "", 164]] });
    const c = { row: t.rows[0]?.id ?? "", col: t.cols[0]?.id ?? "" };
    s.doc.apply({ type: "SetTableLook", id, from: c, to: c, look: { key: "ha", value: "center" } });
    s.doc.apply({ type: "SetTableLook", id, from: c, to: c, look: { key: "va", value: "middle" } });
    s.click(220, 280);
    const o = s.host.last();
    expect(o.align).toBe("center");
    expect(o.matrix).toEqual([1, 0, 0, 1, 108, 208 + 51.5]);
    expect(o.boxWidth).toBe(224);
  });
});
```

`engine/engine.test.ts`, `describe("moteur — outil Tableau (C10a, contrat T4)")` : `fakeTableTool` gagne
`look: (l) => { log.push(`look ${l.key}`); },` et :

```ts
  it("D15 : tableLook relaie à l'outil Tableau ; Alt+Maj+C avec une case : ha-next", () => {
    const { engine, log, table } = setupTable();
    engine.setTool("table");
    engine.tableLook({ key: "va", value: "bottom" });
    expect(log).toContain("look va");
    table.setCell(CELL);
    expect(engine.key({ key: "C", code: "KeyC", ctrlKey: false, metaKey: false, shiftKey: true, altKey: true, isComposing: false, target: null })).toBe(true);
    expect(log).toContain("act ha-next");
  });
```

`keys.test.ts` : `tableKey` d'Alt+Maj+C → `"ha-next"`, d'Alt+Maj+M → `"va-next"`, d'Alt+Maj+→ → `null` ; liste `table` du
test « fusion OG23 × OG26 » : `k("C", { code: "KeyC", altKey: true, shiftKey: true })`, `k("M", { code: "KeyM", altKey: true, shiftKey: true })`.
`shortcuts.test.ts`, `EXPECT` : `"table-ha-next": ["table", "ha-next"], "table-va-next": ["table", "va-next"],`.

- [ ] **2. Rouge** — commande bornée ; relever la ligne `S6 empreinte :` (avant).

- [ ] **3. `text-layout.ts`** (importer `type TextAlign` de `../core/look`) :

```ts
/** Décalage horizontal d'une ligne dans sa boîte (OG11 ; D15, DS6) : seul calcul de l'alignement, lu par le dessin
 *  (`paintText`) et par la collision du texte (`offsetAt`). Droite : `boxWidth - largeur` ; centre : la moitié. */
export function lineShift(line: RichLine, boxWidth: number, align: TextAlign): number {
  const last = line.segments[line.segments.length - 1];
  const rest = align === "left" || last === undefined ? 0 : boxWidth - (last.x + last.width);
  return align === "right" ? rest : align === "center" ? rest / 2 : 0;
}
```

`offsetAt` gagne le paramètre final `align: TextAlign = "left"` ; dans sa boucle, après le test de `ly`, poser
`const dx = lineShift(line, boxWidth, align);` et comparer `lx - dx` aux bornes `x0`, `x1` des graphèmes (`lx` négatif
après décalage : hors du texte, `null`). Dans `canvas2d.ts`, `paintText` : remplacer ses trois lignes de calcul par
`const dx = lineShift(line, boxWidth, align);` (importer `lineShift`).

- [ ] **4. `table-geom.ts`** (importer `HAlign`, `VAlign`, `TableBorder` de `../core/api`) :

```ts
/** Réglages d'une case (DS1) ; absents : gauche, haut, trait du tableau, fermé. */
export function cellLook(t: TableData, rowId: string, colId: string): { readonly ha: HAlign; readonly va: VAlign; readonly border: TableBorder | null; readonly open: boolean } {
  const c = t.cells.find((x) => x.row === rowId && x.col === colId);
  return { ha: c?.ha ?? "left", va: c?.va ?? "top", border: c?.border ?? null, open: c?.open === true && c.shade !== null };
}

/** Cadre du texte d'une case (D15, DS6) : boîte intérieure de sa zone, descendue selon `va` d'après la hauteur des
 *  lignes `textHeight` (milieu : la moitié de la place libre ; bas : toute) ; `ha` porté pour `lineShift`. Seul calcul
 *  de l'alignement d'une case : dessin (`paintCellTexts`), pot (`fill-target.ts`), saisie (`openActive`). */
export interface CellTextFrame extends CellBox { readonly ha: HAlign }
export function cellTextFrame(t: TableData, cell: Cell, textHeight: number): CellTextFrame {
  const box = cellInnerBox(t, cell);
  const look = cellLook(t, t.rows[cell.row]?.id ?? "", t.cols[cell.col]?.id ?? "");
  const free = Math.max(0, box.h - textHeight);
  const dy = look.va === "middle" ? free / 2 : look.va === "bottom" ? free : 0;
  return { x: box.x, y: box.y + dy, w: box.w, h: box.h - dy, ha: look.ha };
}
```

`TableCellState` + `readonly ha?: HAlign; readonly va?: VAlign;` ; `TableAction` + `| "ha-next" | "va-next"`.

- [ ] **5. Dessin** — `canvas2d.ts`, fonction de module (importer `cellOf`, `cellTextFrame` de `../table-geom`,
  `richBoxHeight` de `../text-layout`) :

```ts
/** Texte des cases (B1, D15) : chaque boîte découpée à sa boîte intérieure, lignes posées au cadre aligné
 *  (`cellTextFrame`) et décalées par `lineShift` (dans `paintText`). Même peintre pour l'écran, l'image et le PDF. */
export function paintCellTexts(ctx: CanvasRenderingContext2D, t: TableData, boxes: readonly CellTextBox[], lines: readonly (readonly RichLine[])[]): void {
  boxes.forEach((b, i) => {
    const ls = lines[i] ?? [];
    const at = cellOf(t, b);
    const f = at === null ? { x: b.x, y: b.y, w: b.w, ha: "left" as const } : cellTextFrame(t, at, richBoxHeight(ls));
    ctx.save();
    ctx.beginPath();
    ctx.rect(b.x, b.y, b.w, b.h);
    ctx.clip();
    ctx.transform(1, 0, 0, 1, f.x, f.y);
    paintText(ctx, ls, t.color, f.w, f.ha);
    ctx.restore();
  });
}
```

et, dans `paintElement`, la boucle `boxes.forEach(…)` du tableau devient `paintCellTexts(ctx, el.table, boxes, lines);`.
(Une case sans alignement : `paintText(ctx, ls, color, w, "left")` décale de 0, comme l'appel d'aujourd'hui sans largeur.)

- [ ] **6. Pot** — `fill-target.ts`, `tableCommand` (importer `cellTextFrame`, `layoutRich`, `richBoxHeight`) :

```ts
  const box = cellInnerBox(t, cell);
  const frame = cellTextFrame(t, cell, richBoxHeight(layoutRich(content.spans, { size: t.size }, box.w, measure)));
  const at = offsetAt(content.spans, { size: t.size }, frame.w, measure, cx - frame.x, cy - frame.y, frame.ha);
```

(`textCommand` du texte libre ne change pas.)

- [ ] **7. Saisie** — `tools/text.ts`, `TextEditSession` : `/** D15 : alignement de la zone (case de tableau) ; absent : gauche. */ readonly align?: TextAlign;`.
  `app/text-editor.ts`, à l'ouverture (près de `s.width = …`) : `s.textAlign = session.align ?? "left";`.
  `tools/table.ts`, `openActive` : après `const { text, spans, fill } = cellContent(…)` :

```ts
    const frame = cellTextFrame(at.table, at.cell, richBoxHeight(layoutRich(spans, { size: at.table.size }, inner.w, measure)));
```

puis `matrix: composeMatrix(at.transform, translateMatrix(frame.x, frame.y)), boxWidth: frame.w,` et
`align: frame.ha,` dans la séance (HB3 : la zone ne se recentre pas pendant la frappe).

- [ ] **8. Gestes** — `tools/tool.ts`, `TableTool` : `/** DS1 : une clé de case sur la plage, sinon la zone active ; une SetTableLook. */ look(l: CellLook): void;`.
  `tools/table.ts`, dans `api` :

```ts
    look(l) {
      if (!settle()) return;
      const at = locate(active);
      if (at === null) return;
      const corners = cornersOf(at.table, rangeOf(at) ?? zoneOf(at));
      if (corners === null) return;
      ctx.run({ type: "SetTableLook", id: at.ref.id, ...corners, look: l });
      refresh();
      ctx.stateChanged?.();
    },
```

dans `act`, deux cas (la case active donne la valeur de départ) :

```ts
        case "ha-next": {
          const now = cellLook(t, ref.row, ref.col).ha;
          api.look({ key: "ha", value: now === "left" ? "center" : now === "center" ? "right" : "left" });
          return;
        }
        case "va-next": {
          const now = cellLook(t, ref.row, ref.col).va;
          api.look({ key: "va", value: now === "top" ? "middle" : now === "middle" ? "bottom" : "top" });
          return;
        }
```

`cellState` : ajouter `...(() => { const l = cellLook(t, at.ref.row, at.ref.col); return { ha: l.ha, va: l.va }; })()`
(ou deux constantes) au retour. `engine.ts` : `Engine` gagne
`/** DS1 : réglage de la case active de l'outil Tableau (plage, sinon zone). */ tableLook(l: CellLook): void;`,
l'implémentation `tableLook(l) { tableTool.look(l); },` à côté de `tableAction`, et `inertTable()` gagne `look() {},`.
`input/keys.ts` : `TableKey` + `| "ha-next" | "va-next"` ; `tableKey` accepte Maj pour les lettres :

```ts
export function tableKey(e: KeyLike): TableKey | null {
  if (e.isComposing || e.metaKey || inEditable(e.target)) return null;
  if (!e.altKey || e.ctrlKey) return null;
  const code = e.code ?? "";
  if (e.shiftKey) {
    if (code === "KeyC") return "ha-next";
    if (code === "KeyM") return "va-next";
    return null;
  }
  if (code === "KeyE") return "header-toggle";
  if (code === "KeyA") return "fit-content";
  if (e.key === "ArrowRight") return "col-wider";
  if (e.key === "ArrowLeft") return "col-narrower";
  if (e.key === "ArrowDown") return "row-taller";
  if (e.key === "ArrowUp") return "row-shorter";
  return null;
}
```

`ui/shortcuts.ts` : `s("table-ha-next", "Tableau", "Alignement horizontal suivant", "Alt+Maj+C"),` et
`s("table-va-next", "Tableau", "Alignement vertical suivant", "Alt+Maj+M"),`.
`app/stage-tags.ts` : clé `tableAlign` = `s.tableCell === null ? "" : `${s.tableCell.ha ?? "left"},${s.tableCell.va ?? "top"}``
(ajoutée au type de retour) ; `app/board-session.ts:776` : `stage.dataset["tableAlign"] = tags.tableAlign;`.

- [ ] **9. Vert** — commande bornée (8 et le reste vert) ; témoin S6 (après) identique ; fichiers « garder verts » entiers.

- [ ] **10. Commit** — fichiers de la ligne T6 ; message `feat(web): cell alignment (ha, va) through one frame and one line shift read by painter, paint bucket and cell editor`.

---

### Tâche T7 — Point 9 : bordures par case (dessin par bord, Alt+B, Alt+Maj+B)

<a id="tache-t7"></a>

**Objectif** (D16, DS4, S9) : dessiner chaque segment de la grille selon la case du bas ou de droite qui porte une bordure,
sinon celle du haut ou de gauche, sinon le trait du tableau ; `none` efface le segment ; tirets par `dashOf`. Un tableau
sans aucune bordure réglée garde **exactement** le chemin d'aujourd'hui. Gestes : Alt+B, Alt+Maj+B (le panneau vient en T9).

**Fichiers** : ligne T7.

**Interfaces**
- Consomme (T3, T6) : `TableCell.border`, `TableBorder`, `BorderStyle` ; `cellLook` ; `TableTool.look`.
- Produit : `TableCellState.border?: TableBorder | null` ; `TableAction` + `"border-set" | "border-none"` ; `TableKey` idem ;
  `#stage[data-table-border]` = `border.join(",")` de la case active, vide sinon.
- Réutilise : `apps/web/src/engine/render/sketch.ts:18` `dashOf` — tirets et pointillés (réutiliser).
- Réutilise : `apps/web/src/engine/render/table-paint.ts:96` `paintTableGrid` — chemin d'aujourd'hui gardé pour un tableau sans bordure réglée (étendre).
- Réutilise : `apps/web/src/app/pdf-overlay-vector.test.ts:463` (patron « en-tête de tableau ») — test PDF (réutiliser).

**Test et commande bornée** :
`cd $WT && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/render/table-paint.test.ts src/app/pdf-overlay-vector.test.ts src/engine/tools/table.test.ts src/engine/input/keys.test.ts src/ui/shortcuts.test.ts -t "S9|tableKey|shortcuts|OG23 × OG26" 2>&1 | tail -8`
(`S9` : 6 dont « S9 PDF »). Garder vert : `table-paint.test.ts` entier **sans retoucher** ses tests existants.

**Contraintes (recopiées)** : G1 TDD · G2 `cd $WT &&` · G3 `nice -n 10`, preuves bornées · G7 une commande par geste ·
G9 Alt+B et Alt+Maj+B lus par `code`, `SHORTCUTS` + `EXPECT`, liste `table` du test « fusion OG23 × OG26 » · G10 tableau
sans bordure : mêmes appels qu'avant · G11 même peintre pour l'écran, l'image et le PDF · G13 interdits · G14 commits · G15 rapport.

**Interdits** : aucun texte dans `table-paint.ts` (test « aucun texte dessiné ici ») ; pas de panneau ici (T9).

**Terminé quand** : preuves vertes, tests existants du peintre inchangés et verts, un commit.

#### Étapes

- [ ] **1. Tests rouges** — `render/table-paint.test.ts` :

```ts
describe("S9 bordures par case (D16, DS4)", () => {
  const red: TableBorder = ["#dc2626", 8, "dashed"];
  const grid = (cells: TableData["cells"]): TableData => ({
    color: "#000000", size: 36, merges: [],
    cols: [{ id: "a", width: 100 }, { id: "b", width: 100 }, { id: "c", width: 100 }],
    rows: [{ id: "r0", height: 64 }, { id: "r1", height: 64 }, { id: "r2", height: 64 }],
    cells,
  });
  const bordered = (row: string, col: string, border: TableBorder) => ({ row, col, text: "", fill: null, shade: null, spans: plainSpans(""), border });
  const strokes = (ctx: FakeCtx) => ctx.log.filter((l) => l.startsWith("stroke "));
  it("S9 : aucune bordure réglée : un seul trait, au trait du tableau (chemin d'aujourd'hui)", () => {
    const ctx = new FakeCtx();
    paintTableGrid(asCtx(ctx), grid([]));
    expect(strokes(ctx)).toEqual([`stroke #000000 ${TABLE_LINE_WIDTH}`]);
    expect(ctx.log.some((l) => l.startsWith("setLineDash"))).toBe(false);
  });
  it("S9 : plage 2 × 2 rouge 8 tirets : ses 12 segments en rouge tirets, les 12 autres au trait du tableau", () => {
    const ctx = new FakeCtx();
    paintTableGrid(asCtx(ctx), grid([bordered("r0", "a", red), bordered("r0", "b", red), bordered("r1", "a", red), bordered("r1", "b", red)]));
    expect(strokes(ctx).sort()).toEqual([`stroke #000000 ${TABLE_LINE_WIDTH}`, "stroke #dc2626 8"]);
    expect(ctx.log).toContain("setLineDash 16,16");
    expect(ctx.log.filter((l) => l === "moveTo")).toHaveLength(24);
  });
  it("S9 : bord commun : la case de droite l'emporte ; « none » efface ses bords", () => {
    const blue: TableBorder = ["#1d4ed8", 2, "solid"];
    const none: TableBorder = ["#000000", 2, "none"];
    const ctx = new FakeCtx();
    paintTableGrid(asCtx(ctx), grid([bordered("r0", "a", blue), bordered("r0", "b", none)]));
    // (0, 1) « none » : ses 4 segments disparaissent, son bord gauche commun avec (0, 0) compris (la droite l'emporte).
    expect(ctx.log.filter((l) => l === "moveTo")).toHaveLength(24 - 4);
    expect(strokes(ctx)).toContain("stroke #1d4ed8 2");
  });
  it("S9 : zone : le réglage de l'ancre vaut pour tout son contour, l'intérieur reste omis", () => {
    const t: TableData = { ...grid([bordered("r0", "a", red)]), merges: [{ row: "r0", col: "a", rows: 2, cols: 2 }] };
    const ctx = new FakeCtx();
    paintTableGrid(asCtx(ctx), t);
    expect(strokes(ctx)).toContain("stroke #dc2626 8");
    expect(ctx.log.filter((l) => l === "moveTo")).toHaveLength(24 - 4);
  });
});
```

(3 × 3 : 4 verticales × 3 rangées + 4 horizontales × 3 colonnes = 24 segments ; la plage 2 × 2 en borde 12. Importer
`TableBorder` de `../../core/api`.)

`app/pdf-overlay-vector.test.ts`, à la suite du bloc « en-tête de tableau » (même `run`) :

```ts
describe("superposition vectorielle : bordures par case (personnalisation-3, S9)", () => {
  it("S9 PDF : la couleur de bordure #dc2626 atteint le PDF vectoriel par le même peintre ; sans bordure : absente", async () => {
    const mk = (border: boolean): TableData => ({
      color: "#000000", size: 36, cols: [{ id: "c0", width: 240 }], rows: [{ id: "r0", height: 64 }], merges: [],
      cells: border ? [{ row: "r0", col: "c0", text: "", fill: null, shade: null, spans: [], border: ["#dc2626", 8, "dashed"] }] : [],
    });
    const has = (l: RecordedList): boolean => indexOfSeq(l.ops, [220, 38, 38]) > -1;
    expect(has(await runTable(mk(true)))).toBe(true);
    expect(has(await runTable(mk(false)))).toBe(false);
  });
});
```

(`runTable` : extraire en fonction de module le `run` du bloc « en-tête de tableau » (même corps) et l'appeler dans les deux
blocs.) `tools/table.test.ts` :

```ts
describe("outil Tableau — S9 bordures (DS4)", () => {
  it("S9 : Alt+B pose [couleur du style, 4, solid] sur la plage ; Alt+Maj+B pose none ; cellState.border suit", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.tool.requestCommit();
    s.tool.act("border-set");
    expect(s.last()).toMatchObject({ type: "SetTableLook", id, look: { key: "border", value: ["#000000", 4, "solid"] } });
    expect(s.tool.cellState()?.border).toEqual(["#000000", 4, "solid"]);
    s.tool.act("border-none");
    expect(s.tool.cellState()?.border).toEqual(["#000000", 4, "none"]);
  });
});
```

`keys.test.ts` : `tableKey` d'Alt+B → `"border-set"`, d'Alt+Maj+B → `"border-none"` ; liste `table` du test « fusion OG23 ×
OG26 » : `k("b", { code: "KeyB", altKey: true })`, `k("B", { code: "KeyB", altKey: true, shiftKey: true })`.
`shortcuts.test.ts`, `EXPECT` : `"table-border-set": ["table", "border-set"], "table-border-none": ["table", "border-none"],`.

- [ ] **2. Rouge** — commande bornée.

- [ ] **3. Peintre** — `render/table-paint.ts` (importer `TableBorder` de `../../core/api`, `dashOf` de `./sketch`) :

```ts
/** Deux cases d'une même zone (le bord commun est omis). */
const sameZone = (zones: readonly Range[], r: number, c: number, r2: number, c2: number): boolean =>
  zones.some((z) => r >= z.r0 && r <= z.r1 && c >= z.c0 && c <= z.c1 && r2 >= z.r0 && r2 <= z.r1 && c2 >= z.c0 && c2 <= z.c1);

/** Bordure de chaque case par ses rangs (D16) : celle de l'ancre de sa zone ; absente : undefined. */
function bordersByCell(t: TableData, zones: readonly Range[]): (r: number, c: number) => TableBorder | undefined {
  const at = new Map<string, TableBorder>();
  for (const cell of t.cells) {
    if (cell.border === undefined) continue;
    const a = visibleCell(t, zones, cell);
    if (a !== null) at.set(`${a.row}:${a.col}`, cell.border);
  }
  return (r, c) => {
    const z = zones.find((x) => r >= x.r0 && r <= x.r1 && c >= x.c0 && c <= x.c1);
    return at.get(z === undefined ? `${r}:${c}` : `${z.r0}:${z.c0}`);
  };
}

/** Traits par segment (D16, DS4) : bord commun = case du bas ou de droite, sinon du haut ou de gauche, sinon le trait
 *  du tableau ; `none` : rien ; un chemin par réglage. Couleur lisible d'abord, comme `fillBox`. */
function paintBorders(ctx: CanvasRenderingContext2D, t: TableData, zones: readonly Range[], xs: readonly number[], ys: readonly number[]): void {
  const of = bordersByCell(t, zones);
  const nc = t.cols.length;
  const nr = t.rows.length;
  const groups = new Map<string, { readonly border: TableBorder | null; readonly segs: number[][] }>();
  const add = (b: TableBorder | null, x0: number, y0: number, x1: number, y1: number): void => {
    if (b !== null && b[2] === "none") return;
    const k = b === null ? "" : b.join("|");
    const g = groups.get(k) ?? { border: b, segs: [] };
    g.segs.push([x0, y0, x1, y1]);
    groups.set(k, g);
  };
  for (let i = 0; i <= nc; i++) {
    for (let r = 0; r < nr; r++) {
      if (i > 0 && i < nc && sameZone(zones, r, i - 1, r, i)) continue;
      const b = (i < nc ? of(r, i) : undefined) ?? (i > 0 ? of(r, i - 1) : undefined) ?? null;
      add(b, xs[i] ?? 0, ys[r] ?? 0, xs[i] ?? 0, ys[r + 1] ?? 0);
    }
  }
  for (let j = 0; j <= nr; j++) {
    for (let c = 0; c < nc; c++) {
      if (j > 0 && j < nr && sameZone(zones, j - 1, c, j, c)) continue;
      const b = (j < nr ? of(j, c) : undefined) ?? (j > 0 ? of(j - 1, c) : undefined) ?? null;
      add(b, xs[c] ?? 0, ys[j] ?? 0, xs[c + 1] ?? 0, ys[j] ?? 0);
    }
  }
  for (const g of groups.values()) {
    const [color, width, style] = g.border ?? [t.color, TABLE_LINE_WIDTH, "solid"];
    const dash = style === "dashed" || style === "dotted" ? dashOf(style, width) : [];
    ctx.beginPath();
    for (const [x0, y0, x1, y1] of g.segs) {
      ctx.moveTo(x0 ?? 0, y0 ?? 0);
      ctx.lineTo(x1 ?? 0, y1 ?? 0);
    }
    if (dash.length > 0) ctx.setLineDash(dash);
    ctx.strokeStyle = "transparent";
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = style === "dotted" ? "round" : "square";
    ctx.stroke();
    if (dash.length > 0) ctx.setLineDash([]);
  }
}
```

Dans `paintTableGrid`, juste après le calcul de `xs`, `ys`, `w`, `h` :

```ts
  // DS4 : une bordure réglée quelque part : traits par segment ; sinon le chemin d'aujourd'hui, à l'identique.
  if (t.cells.some((c) => c.border !== undefined)) {
    paintBorders(ctx, t, zones, xs, ys);
    return;
  }
```

et la fonction `same` du chemin d'aujourd'hui appelle `sameZone(zones, …)` (même résultat). (Le test des 12 segments
attend `strokes` = un gris de tableau et un rouge ; si `FakeCtx` journalise `strokeStyle` « transparent », ne pas le
compter : seul `stroke` l'est.)

- [ ] **4. Gestes** — `tools/table.ts`, `act` :

```ts
        case "border-set":
          api.look({ key: "border", value: [style().color, 4, "solid"] });
          return;
        case "border-none": {
          const cur = cellLook(t, ref.row, ref.col).border;
          api.look({ key: "border", value: [cur?.[0] ?? t.color, cur?.[1] ?? TABLE_LINE_WIDTH, "none"] });
          return;
        }
```

(importer `TABLE_LINE_WIDTH`) ; `cellState` : `border: cellLook(t, at.ref.row, at.ref.col).border`. `table-geom.ts` :
`TableCellState` + `readonly border?: TableBorder | null;` ; `TableAction` + `| "border-set" | "border-none"`.
`input/keys.ts` : `TableKey` idem ; dans `tableKey`, branche Maj : `if (code === "KeyB") return "border-none";` ; sans Maj :
`if (code === "KeyB") return "border-set";`. `ui/shortcuts.ts` : `s("table-border-set", "Tableau", "Bordure de la case", "Alt+B"),`
et `s("table-border-none", "Tableau", "Aucune bordure", "Alt+Maj+B"),`. `app/stage-tags.ts` : clé `tableBorder` =
`s.tableCell?.border ? s.tableCell.border.join(",") : ""` ; `app/board-session.ts` : `stage.dataset["tableBorder"] = tags.tableBorder;`.

- [ ] **5. Vert** — commande bornée ; `table-paint.test.ts` entier vert sans retouche.

- [ ] **6. Commit** — fichiers de la ligne T7 ; message `feat(web): per-cell table borders (colour, width, style, none) drawn edge by edge, Alt+B and Alt+Shift+B`.

---

### Tâche T8 — Point 11 : déplacer une ligne ou une colonne (poignées 44 px, Ctrl+Maj+flèches)

<a id="tache-t8"></a>

**Objectif** (D18, DS8, S11) : avec une case active, deux poignées de déplacement de 44 px hors du tableau (à gauche de la
ligne active, au-dessus de la colonne active) ; les tirer au pointeur fait glisser le bloc (plage, sinon zone, le long de
l'axe) ; la ligne d'arrivée est cadrée ; au relâché, une `ReorderTableLines`. Zone coupée : aucune commande, message.
Ctrl+Maj+↑ / ↓ / ← / → : un rang, avant l'ordre des objets.

**Fichiers** : ligne T8.

**Interfaces**
- Consomme (T4) : `ReorderTableLines` ; `rangeRect`, `mergeRanges`, `localAlong`, `zoneOf`, `rangeOf`, `GRIP_PX`, `scaleOf`.
- Produit (`table-geom.ts`) :
  - `export function movedOrder(ids: readonly string[], a: number, b: number, to: number): string[]` (bloc `a..b` remis au rang `to` de la liste sans le bloc) ;
  - `export function destOf(a: number, b: number, k: number): number` (rang `to` pour une arrivée sur la ligne `k`) ;
  - `export function keepsMerges(t: TableData, axis: TableAxis, order: readonly string[]): boolean` ;
  - `export interface MoveGrip { readonly kind: "row-move" | "col-move"; readonly x: number; readonly y: number }` et `export function moveGrips(t: TableData, span: Range, off: number): MoveGrip[]` ;
  - `export function lineAt(sizes: readonly number[], v: number): number` ;
  - `export const REORDER_REFUSED = "Une cellule fusionnée empêche ce déplacement.";`
  - `TableCellState.column?: readonly string[]` (textes de la colonne active, de haut en bas) ; `#stage[data-table-column]` = `column.join("|")`.
- `OverlayGrip.kind` : `"col" | "row" | "row-move" | "col-move"` ; `TableAction` + `"row-up" | "row-down" | "col-left" | "col-right"` ; `TableKey` idem.
- Réutilise : `apps/web/src/engine/render/overlay.ts:26` `OverlayGrip`, `canvas2d.ts:799` dessin des poignées (étendre).
- Réutilise : `apps/web/src/engine/tools/table.ts` `localAlong`, `grabAt` (patron des poignées de TB1) (réutiliser).
- Réutilise : `ReorderTableLines` (T4) — écriture et suivi des objets liés (réutiliser).

**Test et commande bornée** :
`cd $WT && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/table-geom.test.ts src/engine/tools/table.test.ts src/engine/engine.test.ts src/engine/input/keys.test.ts src/ui/shortcuts.test.ts -t "S11|movedOrder|keepsMerges|tableKey|shortcuts|OG23 × OG26" 2>&1 | tail -8`
(`movedOrder` : 2, `keepsMerges` : 1, `S11` : 7 dont celui du moteur).

**Contraintes (recopiées)** : G1 TDD · G2 `cd $WT &&` · G3 `nice -n 10`, preuves bornées · G7 une commande au relâché,
aucune écriture pendant le glisser · G8 pointeur du moteur, cibles 44 px · G9 Ctrl+Maj+flèches, `SHORTCUTS` + `EXPECT`,
liste `table` du test « fusion OG23 × OG26 » ; hors outil Tableau, Ctrl+Maj+↑ / ↓ gardent l'ordre des objets · G10 · G12
points Lucide `grip-vertical` / `grip-horizontal` nommés dans la notice · G13 interdits · G14 commits · G15 rapport.

**Interdits** : pas de glisser HTML5 ; pas de déplacement d'une zone coupée.

**Terminé quand** : preuves vertes, un commit.

#### Étapes

- [ ] **1. Tests rouges** — `table-geom.test.ts` :

```ts
import { destOf, keepsMerges, movedOrder } from "./table-geom";
describe("movedOrder, keepsMerges (D18, DS8)", () => {
  it("movedOrder : ligne 2 sur la ligne 0 : 2, 0, 1 ; bloc 0..1 sur la ligne 2 : 2, 0, 1", () => {
    expect(movedOrder(["a", "b", "c"], 2, 2, destOf(2, 2, 0))).toEqual(["c", "a", "b"]);
    expect(movedOrder(["a", "b", "c"], 0, 1, destOf(0, 1, 2))).toEqual(["c", "a", "b"]);
  });
  it("movedOrder : arrivée dans le bloc : ordre inchangé", () => {
    expect(movedOrder(["a", "b", "c"], 0, 1, destOf(0, 1, 1))).toEqual(["a", "b", "c"]);
  });
  it("keepsMerges : zone r0..r1 entière déplacée : vrai ; coupée : faux", () => {
    const t: TableData = {
      color: "#000", size: 36, cells: [], merges: [{ row: "a", col: "x", rows: 2, cols: 1 }],
      cols: [{ id: "x", width: 100 }], rows: [{ id: "a", height: 64 }, { id: "b", height: 64 }, { id: "c", height: 64 }],
    };
    expect(keepsMerges(t, "row", ["c", "a", "b"])).toBe(true);
    expect(keepsMerges(t, "row", ["a", "c", "b"])).toBe(false);
  });
});
```

`tools/table.test.ts` :

```ts
describe("outil Tableau — S11 déplacer une ligne (D18, DS8)", () => {
  /** 3 × 3 en (100, 200), « a », « b », « c » dans la colonne 0 ; case (2, 0) active. */
  const ready = () => {
    const s = setup();
    const id = s.create(100, 200, 3, 3);
    s.type("a");
    s.tool.navigate("down");
    s.type("b");
    s.tool.navigate("down");
    s.type("c");
    s.tool.requestCommit();
    return { s, id };
  };
  it("S11 : poignée de la ligne 2 (22 px à gauche du tableau) tirée sur la ligne 0 : une ReorderTableLines au relâché, c, a, b", () => {
    const { s, id } = ready();
    const n = s.runs.length;
    s.tool.begin(3, [at(100 - 22, 200 + 160)]);
    s.tool.extend(3, [at(100 - 22, 200 + 100)], []);
    s.tool.extend(3, [at(100 - 22, 200 + 32)], []);
    expect(s.runs.length).toBe(n);
    s.tool.close(3, "end");
    expect(s.runs.length).toBe(n + 1);
    expect(s.last()?.type).toBe("ReorderTableLines");
    expect(s.tool.cellState()?.column).toEqual(["c", "a", "b"]);
    s.doc.undo();
    expect(s.tool.cellState()?.column).toEqual(["a", "b", "c"]);
  });
  it("S11 : pendant le glisser, la ligne d'arrivée est cadrée (target)", () => {
    const { s } = ready();
    s.tool.begin(3, [at(100 - 22, 200 + 160)]);
    s.tool.extend(3, [at(100 - 22, 200 + 32)], []);
    expect(s.tool.live().overlay?.target).toEqual({ x0: 100, y0: 200, x1: 820, y1: 264 });
    s.tool.close(3, "cancel");
  });
  it("S11 : geste annulé, ou relâché sur sa propre ligne : aucune commande", () => {
    const { s } = ready();
    const n = s.runs.length;
    s.tool.begin(3, [at(100 - 22, 200 + 160)]);
    s.tool.extend(3, [at(100 - 22, 200 + 32)], []);
    s.tool.close(3, "cancel");
    s.tool.begin(4, [at(100 - 22, 200 + 160)]);
    s.tool.close(4, "end");
    expect(s.runs.length).toBe(n);
  });
  it("S11 : zone coupée : message, aucune commande", () => {
    const { s, id } = ready();
    const t = s.table(id);
    s.doc.apply({ type: "MergeTableCells", id, from: { row: t.rows[0]?.id ?? "", col: t.cols[1]?.id ?? "" }, to: { row: t.rows[1]?.id ?? "", col: t.cols[1]?.id ?? "" } });
    const n = s.runs.length;
    s.tool.begin(3, [at(100 - 22, 200 + 160)]);
    s.tool.extend(3, [at(100 - 22, 200 + 96)], []);
    s.tool.close(3, "end");
    expect(s.runs.length).toBe(n);
    expect(s.notices).toContain("Une cellule fusionnée empêche ce déplacement.");
  });
  it("S11 : Ctrl+Maj+↑ (row-up) : la ligne 2 monte d'un rang : a, c, b ; col-right : la colonne 0 passe en 1", () => {
    const { s, id } = ready();
    s.tool.act("row-up");
    expect(s.tool.cellState()?.column).toEqual(["a", "c", "b"]);
    const c0 = s.table(id).cols[0]?.id;
    s.tool.act("col-right");
    expect(s.table(id).cols[1]?.id).toBe(c0);
  });
  it("S11 : poignées de déplacement dessinées avec celles de taille (row-move, col-move)", () => {
    const { s } = ready();
    expect((s.tool.live().overlay?.grips ?? []).map((g) => g.kind).sort()).toEqual(["col", "col-move", "row", "row-move"]);
  });
});
```

(Ligne 2 : y 328..392 ; 200 + 160 = 360. Si `navigate("down")` n'existe pas avec la saisie ouverte, saisir par
`s.click` + `s.type` + `requestCommit` sur chaque case, puis `s.click(220, 360)` + `requestCommit` pour l'activer.)
`engine/engine.test.ts`, `describe("moteur — outil Tableau …")` :

```ts
  it("S11 : Ctrl+Maj+↑ avec l'outil Tableau et une case : row-up ; sans outil Tableau : l'ordre des objets garde la touche", () => {
    const { engine, log, table } = setupTable();
    table.setCell(CELL);
    engine.setTool("table");
    expect(engine.key({ key: "ArrowUp", code: "ArrowUp", ctrlKey: true, metaKey: false, shiftKey: true, altKey: false, isComposing: false, target: null })).toBe(true);
    expect(log).toContain("act row-up");
  });
```

`keys.test.ts` : `tableKey` de Ctrl+Maj+↑ → `"row-up"`, ↓ → `"row-down"`, ← → `"col-left"`, → → `"col-right"` ; Ctrl+↑
seul → `null` ; liste `table` du test « fusion OG23 × OG26 » : les quatre Ctrl+Maj+flèches. `shortcuts.test.ts`,
`EXPECT` : `"table-row-up": ["table", "row-up"], "table-row-down": ["table", "row-down"], "table-col-left": ["table", "col-left"], "table-col-right": ["table", "col-right"],`.

- [ ] **2. Rouge** — commande bornée.

- [ ] **3. `table-geom.ts`** (importer `TableAxis`) :

```ts
export const REORDER_REFUSED = "Une cellule fusionnée empêche ce déplacement.";

/** D18 : bloc `a..b` remis au rang `to` de la liste privée du bloc (0 ≤ to ≤ n − taille), ordre des autres gardé. */
export function movedOrder(ids: readonly string[], a: number, b: number, to: number): string[] {
  const block = ids.slice(a, b + 1);
  const rest = [...ids.slice(0, a), ...ids.slice(b + 1)];
  const at = Math.max(0, Math.min(to, rest.length));
  return [...rest.slice(0, at), ...block, ...rest.slice(at)];
}

/** Rang `to` de `movedOrder` pour une arrivée sur la ligne `k` : avant elle si elle précède le bloc, après elle sinon. */
export function destOf(a: number, b: number, k: number): number {
  return k < a ? k : k > b ? k - (b - a) : a;
}

/** D18 : chaque zone reste entière et dans son ordre (même règle que `cmd_reorder_table_lines`). */
export function keepsMerges(t: TableData, axis: TableAxis, order: readonly string[]): boolean {
  const ids = (axis === "row" ? t.rows : t.cols).map((l) => l.id);
  const pos = new Map(order.map((x, i) => [x, i]));
  return mergeRanges(t).every((z) => {
    const [a, b] = axis === "row" ? [z.r0, z.r1] : [z.c0, z.c1];
    const first = pos.get(ids[a] ?? "") ?? -1;
    for (let k = a; k <= b; k++) if (pos.get(ids[k] ?? "") !== first + (k - a)) return false;
    return true;
  });
}

/** Poignées de déplacement (D18, DS8), repère local : à `off` unités à gauche du tableau au milieu du bloc de lignes,
 *  au-dessus du tableau au milieu du bloc de colonnes. */
export interface MoveGrip { readonly kind: "row-move" | "col-move"; readonly x: number; readonly y: number }
export function moveGrips(t: TableData, span: Range, off: number): MoveGrip[] {
  const r = rangeRect(t, span);
  return [
    { kind: "row-move", x: -off, y: (r.y0 + r.y1) / 2 },
    { kind: "col-move", x: (r.x0 + r.x1) / 2, y: -off },
  ];
}

/** Bande sous `v` (repère local), bornée à 0..n − 1 (le doigt peut sortir du tableau). */
export function lineAt(sizes: readonly number[], v: number): number {
  let acc = 0;
  for (let i = 0; i < sizes.length; i++) {
    acc += sizes[i] ?? 0;
    if (v < acc) return i;
  }
  return Math.max(0, sizes.length - 1);
}
```

`TableCellState` + `readonly column?: readonly string[];` ; `TableAction` + `| "row-up" | "row-down" | "col-left" | "col-right"`.

- [ ] **4. Outil Tableau** — état et aides :

```ts
/** Ligne ou colonne tirée par sa poignée (D18) : bloc a..b, ligne d'arrivée k. */
interface Moving { readonly pointerId: number; readonly id: string; readonly axis: TableAxis; readonly a: number; readonly b: number; k: number }
```

```ts
  let moving: Moving | null = null;
  /** Écart local de la poignée de déplacement : son centre à GRIP_PX / 2 px écran du bord du tableau. */
  const moveOff = (m: Matrix): number => GRIP_PX / 2 / (ctx.camera().zoom * scaleOf(m));
  const moveGripsOf = (at: Located): MoveGrip[] => moveGrips(at.table, rangeOf(at) ?? zoneOf(at), moveOff(at.transform));
  /** Poignée de déplacement sous le point écran (44 px). */
  const moveAt = (sx: number, sy: number): { at: Located; axis: TableAxis } | null => {
    const at = locate(active);
    if (at === null) return null;
    for (const g of moveGripsOf(at)) {
      const [wx, wy] = applyMatrix(at.transform, g.x, g.y);
      const [gx, gy] = worldToScreen(ctx.camera(), wx, wy);
      if (Math.abs(gx - sx) <= GRIP_PX / 2 && Math.abs(gy - sy) <= GRIP_PX / 2) return { at, axis: g.kind === "row-move" ? "row" : "col" };
    }
    return null;
  };
  /** Bloc `span` le long de `axis` remis au rang `to` : une ReorderTableLines ; zone coupée : message, rien. */
  const reorderTo = (at: Located, axis: TableAxis, a: number, b: number, to: number): void => {
    const ids = (axis === "row" ? at.table.rows : at.table.cols).map((l) => l.id);
    const order = movedOrder(ids, a, b, to);
    if (order.every((x, i) => x === ids[i])) return;
    if (!keepsMerges(at.table, axis, order)) {
      notify?.(REORDER_REFUSED);
      return;
    }
    ctx.run({ type: "ReorderTableLines", id: at.ref.id, axis, order });
  };
```

Dans `begin`, après le bloc du double appui et les retours de la saisie ouverte et de la grille, **avant** `grabAt` :

```ts
      const mv = moveAt(s.x, s.y);
      if (mv !== null) {
        const span = rangeOf(mv.at) ?? zoneOf(mv.at);
        const [a, b] = mv.axis === "row" ? [span.r0, span.r1] : [span.c0, span.c1];
        moving = { pointerId, id: mv.at.ref.id, axis: mv.axis, a, b, k: a };
        refresh();
        return;
      }
```

Dans `extend`, en tête :

```ts
      const mvg = moving;
      if (mvg !== null && mvg.pointerId === pointerId) {
        const s0 = samples[samples.length - 1];
        const el = ctx.doc.element(mvg.id);
        if (!s0 || el?.kind !== "table") return;
        const v = localAlong(el.transform, mvg.axis, s0.x, s0.y);
        if (v === null) return;
        mvg.k = lineAt((mvg.axis === "row" ? el.table.rows.map((r) => r.height) : el.table.cols.map((c) => c.width)), v);
        refresh();
        return;
      }
```

Dans `close`, en tête (après le retour `swallowed`) :

```ts
      const mvg = moving;
      if (mvg !== null && mvg.pointerId === pointerId) {
        moving = null;
        const at = locate(active);
        if (how === "end" && at !== null && at.ref.id === mvg.id && (mvg.k < mvg.a || mvg.k > mvg.b)) reorderTo(at, mvg.axis, mvg.a, mvg.b, destOf(mvg.a, mvg.b, mvg.k));
        refresh();
        ctx.stateChanged?.();
        return;
      }
```

`leave` : `moving = null;`. `refresh` : les poignées deviennent
`[...gripsOf(at).map(…kind: g.kind…), ...moveGripsOf(at).map((g) => { const [x, y] = applyMatrix(at.transform, g.x, g.y); return { x, y, kind: g.kind }; })]`,
et pendant un `moving` dont la ligne d'arrivée est hors du bloc, `target` = boîte monde de la ligne (ou colonne) `k` :
`transformBounds(at.transform, rangeRect(at.table, axis === "row" ? { r0: k, c0: 0, r1: k, c1: at.table.cols.length - 1 } : { r0: 0, c0: k, r1: at.table.rows.length - 1, c1: k }))`
dans `{ ...EMPTY_OVERLAY, frame, grips, target }`. `act` :

```ts
        case "row-up":
        case "row-down":
        case "col-left":
        case "col-right": {
          const axis: TableAxis = a === "row-up" || a === "row-down" ? "row" : "col";
          const [s0, s1] = axis === "row" ? [span.r0, span.r1] : [span.c0, span.c1];
          const n = axis === "row" ? t.rows.length : t.cols.length;
          const back = a === "row-up" || a === "col-left";
          if (back ? s0 > 0 : s1 < n - 1) reorderTo(at, axis, s0, s1, back ? s0 - 1 : s0 + 1);
          break;
        }
```

`cellState` : `column: t.rows.map((r) => cellContent(t, r.id, t.cols[at.cell.col]?.id ?? "").text)`.

- [ ] **5. Dessin et touches** — `render/overlay.ts` : `kind: "col" | "row" | "row-move" | "col-move"`. `render/canvas2d.ts`,
  boucle des poignées : pour `row-move` et `col-move`, disque blanc de 24 px écran cerclé d'accent puis les six points de
  Lucide `grip-vertical` (ligne) ou `grip-horizontal` (colonne), rayon 1,25 px, couleur `SELECTION_COLOR` :

```ts
      for (const g of o.grips) {
        const big = g.kind === "row-move" || g.kind === "col-move";
        ctx.beginPath();
        ctx.arc(g.x, g.y, (big ? 12 : 8) * px, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        if (big) {
          // Lucide grip-vertical (cx 9 / 15, cy 5 / 12 / 19) ou grip-horizontal (cx 5 / 12 / 19, cy 9 / 15), grille 24 → 16 px.
          const pts = g.kind === "row-move" ? [[9, 5], [15, 5], [9, 12], [15, 12], [9, 19], [15, 19]] : [[5, 9], [12, 9], [19, 9], [5, 15], [12, 15], [19, 15]];
          ctx.save();
          ctx.fillStyle = SELECTION_COLOR;
          for (const [cx, cy] of pts) {
            ctx.beginPath();
            ctx.arc(g.x + ((cx ?? 12) - 12) * (16 / 24) * px, g.y + ((cy ?? 12) - 12) * (16 / 24) * px, 1.25 * px, 0, 2 * Math.PI);
            ctx.fill();
          }
          ctx.restore();
        }
      }
```

`THIRD_PARTY_NOTICES.md`, section « Icônes Lucide (ISC), design L1… » : ajouter « `grip-horizontal` (points recopiés dans
`render/canvas2d.ts`, poignées de déplacement du tableau, personnalisation-3 suite), lu au commit 7981a0798a ».
`input/keys.ts` : `TableKey` + `| "row-up" | "row-down" | "col-left" | "col-right"` ; en tête de `tableKey`, après le
contrôle `isComposing` / `inEditable` (et **avant** le refus de `metaKey`) :

```ts
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey) {
    if (e.key === "ArrowUp") return "row-up";
    if (e.key === "ArrowDown") return "row-down";
    if (e.key === "ArrowLeft") return "col-left";
    if (e.key === "ArrowRight") return "col-right";
    return null;
  }
```

(le premier contrôle devient `if (e.isComposing || inEditable(e.target)) return null;` et le refus de `metaKey` passe dans
la branche Alt : `if (!e.altKey || e.ctrlKey || e.metaKey) return null;`). `ui/shortcuts.ts` : quatre lignes
`table-row-up` « Monter la ligne » `Ctrl+Maj+↑`, `table-row-down` « Descendre la ligne » `Ctrl+Maj+↓`, `table-col-left`
« Colonne à gauche » `Ctrl+Maj+←`, `table-col-right` « Colonne à droite » `Ctrl+Maj+→`. `app/stage-tags.ts` : clé
`tableColumn` = `s.tableCell?.column?.join("|") ?? ""` ; `app/board-session.ts` : `stage.dataset["tableColumn"] = tags.tableColumn;`.

- [ ] **6. Vert** — commande bornée ; `table.test.ts` entier (TB1 : les poignées de taille gardent leur zone) et
  `engine.test.ts` verts.

- [ ] **7. Commit** — fichiers de la ligne T8 ; message `feat(web): move a table row or column by its 44 px grip or Ctrl+Shift+arrows, merged zones never cut`.

---

### Tâche T9 — Panneau d'options du tableau (accordéon : Objets, Alignement, Bordures, Lignes)

<a id="tache-t9"></a>

**Objectif** (D26, DA5, DS10) : avec l'outil Tableau et une case active, l'accordéon d'OG23 montre quatre sections :
`tableObjects` « Objets » (Agrandir / Rétrécir, Ajuster au contenu), `tableAlign` « Alignement » (2 rangées de 3, ouverte
par défaut), `tableBorder` « Bordures » (couleur, épaisseur, style dont « Aucune », « Par défaut » ; ouverte par défaut),
`tableRows` « Lignes » (En-tête). Chaque bouton = un geste = une commande (par `Engine.tableAction` ou `Engine.tableLook`).

**Fichiers** : ligne T9.

**Interfaces**
- Consomme (T5–T8) : `Engine.tableAction(a: TableAction)`, `Engine.tableLook(l: CellLook)`, `TableCellState.{ha,va,border,header}` ;
  `RadioChoices`, `IconButton` (`pressed`, enfants), `WIDTHS`, `strokePicks`, `Pick`.
- Produit :
  - `ui/TableOptions.tsx` : `export type TableSectionKey = "tableObjects" | "tableAlign" | "tableBorder" | "tableRows";`
    `export interface TableOptionsHost { act(a: TableAction): void; look(l: CellLook): void }`
    `export function TableSection(props: { readonly section: TableSectionKey; readonly cell: Accessor<TableCellState | null>; readonly host: TableOptionsHost; readonly picks: Accessor<readonly Pick[]> }): JSX.Element`.
  - `OptionKey` + `"tableObjects" | "tableAlign" | "tableBorder" | "tableRows"` ; `OPTION_ORDER` les ajoute en fin ;
    `OPEN_BY_DEFAULT` + `tableAlign`, `tableBorder` ; `export const TABLE_SECTIONS: readonly OptionKey[]` ;
    `sectionsFor(tool, targets, editing, background = null, units = 0, tableCell = false)` ; `showsPanel` accepte `table`.
  - `TableCellState.fit?: "shrink"` (publié par `cellState`).
  - Icônes Lucide neuves : `move-horizontal` (Ajuster), `ban` (Aucune bordure).
- Réutilise : `apps/web/src/ui/OptionsPanel.tsx:192` accordéon (`sectionOpen`, `toggleSection`), `:474` `bodies` (étendre).
- Réutilise : `apps/web/src/ui/RadioChoices.tsx` — segments (réutiliser) ; `apps/web/src/ui/tool-options.ts:78` `WIDTHS`, `:96` `strokePicks` (réutiliser).
- Réutilise : `apps/web/src/engine/engine.ts:347` `tableAction` et `tableLook` (T6) — hôte des sections (réutiliser).

**Test et commande bornée** :
`cd $WT && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/TableOptions.test.tsx src/ui/OptionsPanel.test.tsx src/ui/tool-options.test.ts src/ui/icons.test.ts -t "DS10|showsPanel|ICONS|icons" 2>&1 | tail -8`
(`DS10` : 9 ; `icons.test.ts` vert à 133 icônes). Garder verts : `OptionsPanel.test.tsx`, `tool-options.test.ts` entiers
(le seul cas changé est `table` dans « showsPanel : masqué avec … », DS10).

**Contraintes (recopiées)** : G1 TDD · G2 `cd $WT &&` · G3 `nice -n 10`, preuves bornées · G7 un bouton = une commande ·
G8 cibles du panneau à la taille du profil (`--rb-btn-size`, 44 px au doigt) · G10 les autres outils gardent leurs sections ·
G12 icônes Lucide recopiées (`gh api … ?ref=7981a0798a`), notice, viewBox `-0.25 -0.25 24 24` · G13 interdits · G14 commits ·
G15 rapport.

**Interdits** : aucune commande écrite par le panneau lui-même (il passe par l'hôte) ; aucune section neuve pour les autres outils.

**Terminé quand** : preuves vertes, un commit.

#### Étapes

- [ ] **1. Tests rouges** — `ui/tool-options.test.ts` : dans « showsPanel : masqué avec Main, Gomme, Pot, Tableau sans
  sélection… », retirer `"table"` de la liste (et « Tableau » du titre), puis :

```ts
  it("DS10 : showsPanel(table) ; sections du tableau seulement avec une case active, dans l'ordre", () => {
    expect(showsPanel("table" as never, 0, false)).toBe(true);
    expect(sectionsFor("table" as never, [], false, null, 0, false)).toEqual([]);
    expect(sectionsFor("table" as never, [], false, null, 0, true)).toEqual(["tableObjects", "tableAlign", "tableBorder", "tableRows"]);
    expect(sectionsFor("rect", [], false, null, 0, true)).not.toContain("tableAlign");
  });
```

`ui/TableOptions.test.tsx` (patron de rendu de `OptionsPanel.test.tsx`) :

```tsx
import { fireEvent, render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import type { TableCellState } from "../engine/table-geom";
import { TableSection, type TableSectionKey } from "./TableOptions";

const cell = (over: Partial<TableCellState> = {}): TableCellState => ({ id: "t", row: 0, col: 0, rows: 3, cols: 3, ha: "left", va: "top", border: null, ...over });
const mount = (section: TableSectionKey, c: TableCellState) => {
  const host = { act: vi.fn(), look: vi.fn() };
  const r = render(() => <TableSection section={section} cell={() => c} host={host} picks={() => [{ color: "#000000", label: "Noir" }, { color: "#dc2626", label: "Rouge" }]} />);
  return { ...r, host };
};
describe("TableOptions (DS10)", () => {
  it("DS10 : Alignement : « Centré » puis « Au milieu » : deux look ; l'alignement courant est enfoncé", () => {
    const { container, host } = mount("tableAlign", cell({ ha: "right" }));
    expect(container.querySelector('[data-option-value="right"]')?.getAttribute("aria-checked") ?? container.querySelector('[data-option-value="right"]')?.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(container.querySelector('[data-option-value="center"]')!);
    fireEvent.click(container.querySelector('[data-option-value="middle"]')!);
    expect(host.look.mock.calls.map((c) => c[0])).toEqual([{ key: "ha", value: "center" }, { key: "va", value: "middle" }]);
  });
  it("DS10 : Bordures : pastille rouge, « Épais », « Tirets » : chaque appui garde les deux autres réglages", () => {
    const { container, host } = mount("tableBorder", cell({ border: ["#000000", 2, "solid"] }));
    fireEvent.click(container.querySelector('[data-table-border-color="#dc2626"]')!);
    expect(host.look).toHaveBeenLastCalledWith({ key: "border", value: ["#dc2626", 2, "solid"] });
    fireEvent.click(container.querySelector('[data-option-value="8"]')!);
    expect(host.look).toHaveBeenLastCalledWith({ key: "border", value: ["#000000", 8, "solid"] });
    fireEvent.click(container.querySelector('[data-option-value="dashed"]')!);
    expect(host.look).toHaveBeenLastCalledWith({ key: "border", value: ["#000000", 2, "dashed"] });
  });
  it("DS10 : Bordures : « Aucune bordure » et « Par défaut »", () => {
    const { container, host } = mount("tableBorder", cell({ border: ["#dc2626", 8, "dashed"] }));
    fireEvent.click(container.querySelector('[data-option-value="none"]')!);
    expect(host.look).toHaveBeenLastCalledWith({ key: "border", value: ["#dc2626", 8, "none"] });
    fireEvent.click(container.querySelector('[data-table-border-default]')!);
    expect(host.look).toHaveBeenLastCalledWith({ key: "border", value: null });
  });
  it("DS10 : Objets : Rétrécir (fit-toggle) seulement s'il change ; Ajuster au contenu (fit-content)", () => {
    const { container, host } = mount("tableObjects", cell());
    fireEvent.click(container.querySelector('[data-option-value="grow"]')!);
    expect(host.act).not.toHaveBeenCalled();
    fireEvent.click(container.querySelector('[data-option-value="shrink"]')!);
    fireEvent.click(container.querySelector('[data-table-option="fit-content"]')!);
    expect(host.act.mock.calls.map((c) => c[0])).toEqual(["fit-toggle", "fit-content"]);
  });
  it("DS10 : Lignes : En-tête est un interrupteur (aria-checked) qui bascule", () => {
    const { container, host } = mount("tableRows", cell({ header: true }));
    const b = container.querySelector('[data-table-option="header"]')!;
    expect(b.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(b);
    expect(host.act).toHaveBeenCalledWith("header-toggle");
  });
});
```

`ui/OptionsPanel.test.tsx` : `Opts` gagne `tableCell?: TableCellState` ; `mount` met `tableCell: o.tableCell ?? null` dans
`state` et `tableAction: vi.fn(), tableLook: vi.fn()` dans `engine` ; puis :

```tsx
  it("DS10 : outil Tableau, case active : quatre sections ; un appui va à engine.tableLook", () => {
    const { container, engine } = mount({ tool: "table", selection: [], tableCell: { id: "t", row: 0, col: 0, rows: 2, cols: 2, ha: "left", va: "top", border: null } });
    expect([...container.querySelectorAll("[data-option]")].map((e) => e.getAttribute("data-option"))).toEqual(["tableObjects", "tableAlign", "tableBorder", "tableRows"]);
    fireEvent.click(container.querySelector('[data-option="tableAlign"] [data-option-value="center"]')!);
    expect(engine.tableLook).toHaveBeenCalledWith({ key: "ha", value: "center" });
  });
  it("DS10 : outil Tableau sans case active : aucun panneau", () => {
    expect(mount({ tool: "table", selection: [] }).container.querySelector("[data-options]")).toBeNull();
  });
```

`ui/icons.test.ts` : constante `const TABLE_SUITE_ICONS = ["move-horizontal", "ban"];` ajoutée à l'ensemble `used` du
premier test, compte 131 → 133 (titre compris), et un test :

```ts
  it("DS10 : move-horizontal et ban recopiées de Lucide (7981a0798a), nommées dans la notice", () => {
    expect(ICONS["move-horizontal"]).toEqual([["path", { d: "m18 8 4 4-4 4" }], ["path", { d: "M2 12h20" }], ["path", { d: "m6 8-4 4 4 4" }]]);
    expect(ICONS["ban"]).toEqual([["circle", { cx: "12", cy: "12", r: "10" }], ["path", { d: "M4.929 4.929 19.07 19.071" }]]);
    const notice = readFileSync(new URL("../../../../THIRD_PARTY_NOTICES.md", import.meta.url), "utf8");
    for (const n of ["move-horizontal", "ban"]) expect(notice).toContain(`\`${n}\``);
  });
```

(Suivre l'import de `readFileSync` et le chemin de la notice déjà utilisés par `icons.test.ts`.)

- [ ] **2. Rouge** — commande bornée.

- [ ] **3. Icônes** — `ui/icons.ts`, après les icônes d'OG11 lot 2 :

```ts
  // personnalisation-3 suite (DS10) : Lucide @7981a0798a, ISC (move-horizontal : Ajuster au contenu ; ban : aucune bordure).
  "move-horizontal": [["path", { d: "m18 8 4 4-4 4" }], ["path", { d: "M2 12h20" }], ["path", { d: "m6 8-4 4 4 4" }]],
  "ban": [["circle", { cx: "12", cy: "12", r: "10" }], ["path", { d: "M4.929 4.929 19.07 19.071" }]],
```

`THIRD_PARTY_NOTICES.md`, section « Icônes Lucide (ISC), design L1… » : « personnalisation-3 suite : `move-horizontal`,
`ban` (Lucide, même commit). » (Vérifier les tracés par `gh api "repos/lucide-icons/lucide/contents/icons/<nom>.svg?ref=7981a0798a" --jq .content | base64 -d`.)

- [ ] **4. `ui/tool-options.ts`** :

```ts
export type OptionKey =
  | "strokeColor" | "background" | "fillStyle" | "strokeWidth" | "pressure" | "strokeStyle" | "roughness" | "roundness"
  | "font" | "fontSize" | "textAlign" | "arrowType" | "arrowheads" | "opacity" | "image" | "layers" | "align" | "transform" | "actions"
  | "tableObjects" | "tableAlign" | "tableBorder" | "tableRows";
```

`OPTION_ORDER` : ajouter `"tableObjects", "tableAlign", "tableBorder", "tableRows",` à la fin ; `OPEN_BY_DEFAULT` :
ajouter `"tableAlign", "tableBorder"` ;

```ts
/** DS10 : sections de l'outil Tableau, montrées avec une case active. */
export const TABLE_SECTIONS: readonly OptionKey[] = ["tableObjects", "tableAlign", "tableBorder", "tableRows"];
```

`sectionsFor` gagne le paramètre final `tableCell = false` et, après `const on = …`,
`if (tool === "table" && tableCell) for (const k of TABLE_SECTIONS) on.add(k);` ; `DRAW` gagne `"table"`.

- [ ] **5. `ui/TableOptions.tsx`** :

```tsx
/**
 * Options du tableau (personnalisation-3, D26, DA5, DS10) : corps des sections `table*` de l'accordéon d'OG23. Chaque
 * bouton est un geste, une commande, une étape (G7) ; la plage (sinon la zone) de la case active reçoit le réglage par
 * l'hôte (`Engine.tableAction`, `Engine.tableLook`). Boutons à la taille du profil (`--rb-btn-size`), icônes Lucide.
 */
import { For, type Accessor, type JSX } from "solid-js";
import type { BorderStyle, CellLook, HAlign, TableBorder, VAlign } from "../core/api";
import { TABLE_LINE_WIDTH, type TableAction, type TableCellState } from "../engine/table-geom";
import { Icon, IconButton } from "./IconButton";
import { RadioChoices, type RadioOption } from "./RadioChoices";
import { WIDTHS, type Pick } from "./tool-options";

export type TableSectionKey = "tableObjects" | "tableAlign" | "tableBorder" | "tableRows";
export interface TableOptionsHost {
  act(a: TableAction): void;
  look(l: CellLook): void;
}

const HA_OPTIONS: readonly RadioOption<HAlign>[] = [
  { value: "left", label: "À gauche", icon: "align-left" },
  { value: "center", label: "Centré", icon: "align-center" },
  { value: "right", label: "À droite", icon: "align-right" },
];
const VA_OPTIONS: readonly RadioOption<VAlign>[] = [
  { value: "top", label: "En haut", icon: "align-start-horizontal" },
  { value: "middle", label: "Au milieu", icon: "align-center-horizontal" },
  { value: "bottom", label: "En bas", icon: "align-end-horizontal" },
];
const STYLE_OPTIONS: readonly RadioOption<BorderStyle>[] = [
  { value: "solid", label: "Plein", icon: "stroke-solid" },
  { value: "dashed", label: "Tirets", icon: "stroke-dashed" },
  { value: "dotted", label: "Pointillés", icon: "stroke-dotted" },
  { value: "none", label: "Aucune bordure", icon: "ban" },
];
const WIDTH_OPTIONS: readonly RadioOption<string>[] = WIDTHS.map((w) => ({
  value: w.value, label: w.label, icon: w.value === "2" ? "width-thin" : w.value === "4" ? "width-medium" : "width-thick",
}));
const FIT_OPTIONS: readonly RadioOption<"grow" | "shrink">[] = [
  { value: "grow", label: "Agrandir la case" },
  { value: "shrink", label: "Rétrécir l'objet" },
];
const keep = (e: Event): void => e.preventDefault();

export function TableSection(props: {
  readonly section: TableSectionKey;
  readonly cell: Accessor<TableCellState | null>;
  readonly host: TableOptionsHost;
  readonly picks: Accessor<readonly Pick[]>;
}): JSX.Element {
  /** Bordure de départ : celle de la case active, sinon la 1re pastille, 2, plein ; « none » repart en plein. */
  const cur = (): TableBorder => props.cell()?.border ?? [props.picks()[0]?.color ?? "#000000", TABLE_LINE_WIDTH, "solid"];
  const styled = (s: BorderStyle): BorderStyle => (s === "none" ? "solid" : s);
  const border = (b: TableBorder): void => props.host.look({ key: "border", value: b });
  const bodies: Readonly<Record<TableSectionKey, () => JSX.Element>> = {
    tableObjects: () => (
      <div class="rb-opt-stack">
        <RadioChoices keepFocus name="tableFit" label="Objets dans les cases" look="segment" options={FIT_OPTIONS} valueAttr="data-option-value"
          value={props.cell()?.fit === "shrink" ? "shrink" : "grow"}
          choose={(v) => { if (v !== (props.cell()?.fit === "shrink" ? "shrink" : "grow")) props.host.act("fit-toggle"); }} />
        <IconButton keepFocus icon={null} label="Ajuster au contenu" attrs={{ "data-table-option": "fit-content", class: "rb-opt-btn rb-opt-wide" }} onPress={() => props.host.act("fit-content")}>
          <Icon name="move-horizontal" />
          <span class="rb-opt-wide-label" aria-hidden="true">Ajuster au contenu</span>
        </IconButton>
      </div>
    ),
    tableAlign: () => (
      <>
        <RadioChoices keepFocus name="tableHa" label="Alignement horizontal" look="segment" options={HA_OPTIONS} valueAttr="data-option-value"
          value={props.cell()?.ha ?? "left"} choose={(v) => props.host.look({ key: "ha", value: v })} />
        <RadioChoices keepFocus name="tableVa" label="Alignement vertical" look="segment" options={VA_OPTIONS} valueAttr="data-option-value"
          value={props.cell()?.va ?? "top"} choose={(v) => props.host.look({ key: "va", value: v })} />
      </>
    ),
    tableBorder: () => (
      <>
        <div class="rb-pick-row">
          <For each={props.picks().filter((p) => p.color !== null)}>
            {(p) => (
              <IconButton keepFocus icon={null} label={p.label} pressed={cur()[0] === p.color} attrs={{ "data-table-border-color": p.color ?? "", class: "rb-opt-btn" }}
                onPress={() => border([p.color ?? "#000000", cur()[1], styled(cur()[2])])}>
                <span class="rb-swatch" aria-hidden="true" style={{ "background-color": p.color ?? "transparent" }} />
              </IconButton>
            )}
          </For>
        </div>
        <RadioChoices keepFocus name="tableBorderWidth" label="Épaisseur de la bordure" look="segment" options={WIDTH_OPTIONS} valueAttr="data-option-value"
          value={props.cell()?.border ? String(props.cell()!.border![1]) : null} choose={(w) => border([cur()[0], Number(w), styled(cur()[2])])} />
        <RadioChoices keepFocus name="tableBorderStyle" label="Style de la bordure" look="segment" options={STYLE_OPTIONS} valueAttr="data-option-value"
          value={props.cell()?.border?.[2] ?? null} choose={(s) => border([cur()[0], cur()[1], s])} />
        <IconButton keepFocus icon={null} label="Bordure par défaut" attrs={{ "data-table-border-default": "", class: "rb-opt-btn rb-opt-wide" }} onPress={() => props.host.look({ key: "border", value: null })}>
          <span class="rb-opt-wide-label" aria-hidden="true">Par défaut</span>
        </IconButton>
      </>
    ),
    tableRows: () => (
      <div class="rb-pick-row" onPointerDown={keep}>
        <IconButton keepFocus icon="rows-2" label="En-tête"
          attrs={{ "data-table-option": "header", class: "rb-opt-btn", role: "switch", "aria-checked": String(props.cell()?.header === true) }}
          onPress={() => props.host.act("header-toggle")} />
      </div>
    ),
  };
  return bodies[props.section]();
}
```

(Le test du « Plein » sous `none` : `styled` repart en plein. Si `RadioChoices` ne rend pas les icônes avec `icon`
absent, `FIT_OPTIONS` reste texte, comme `FONT_OPTIONS`. Le premier test lit `aria-checked` ou `aria-pressed`, selon ce que
rend `RadioChoices`.)

- [ ] **6. `ui/OptionsPanel.tsx`** — `LABEL` : `tableObjects: "Objets", tableAlign: "Alignement", tableBorder: "Bordures", tableRows: "Lignes",` ;
  `keys` : passer `props.state().tableCell != null` en sixième argument de `sectionsFor` ; dans le composant :

```tsx
  const tableHost: TableOptionsHost = { act: (a) => props.engine().tableAction(a), look: (l) => props.engine().tableLook(l) };
  const tableCell = (): TableCellState | null => props.state().tableCell ?? null;
  const tableBody = (k: TableSectionKey) => () => <TableSection section={k} cell={tableCell} host={tableHost} picks={strokeChoices} />;
```

et dans `bodies` : `tableObjects: tableBody("tableObjects"), tableAlign: tableBody("tableAlign"), tableBorder: tableBody("tableBorder"), tableRows: tableBody("tableRows"),`.
`ui/rb.css` : aucune règle neuve attendue (`rb-pick-row`, `rb-opt-stack`, `rb-opt-wide` existent) ; si la rangée de
pastilles déborde, `flex-wrap: wrap` sur `[data-option="tableBorder"] .rb-pick-row`.
`engine/table-geom.ts` : `TableCellState` + `readonly fit?: "shrink";` ; `tools/table.ts`, `cellState` :
`...(t.fit === "shrink" ? { fit: "shrink" as const } : {})`.

- [ ] **7. Vert** — commande bornée ; `OptionsPanel.test.tsx`, `tool-options.test.ts`, `icons.test.ts` entiers verts.

- [ ] **8. Commit** — fichiers de la ligne T9 ; message `feat(ui): table options in the OG23 accordion (objects, alignment, borders, rows)`.

---

### Tâche T10 — Essai navigateur et captures du lot B, suite complète

<a id="tache-t10"></a>

**Objectif** (S7, S8, S9, S10-mineurs, S11, DS14) : un essai neuf, page propre, joue au doigt et au clavier chaque
scénario du lot B, lit d'abord les attributs de `#stage`, puis fait les captures 2x avant et après ; il entre dans
`verifier.sh --e2e` ; la suite complète est verte ; les essais existants restent verts (au plus une ligne qui replie
l'îlot d'options, DS10).

**Fichiers** : ligne T10.

**Interfaces**
- Consomme : `#stage[data-table|data-table-align|data-table-border|data-table-column|data-table-header|data-bounds|data-version]` ;
  `scripts/essais/commun.mjs` (`DIST`, `Echec`, `ROOT`, `VIEWPORT`, `coqueCsp`, `frames`, `gitSha`, `item`, `loadPlaywright`,
  `serve`, `stageBox`, `stageMouse`) ; sélecteurs du panneau `[data-option="…"] [data-option-value="…"]`,
  `[data-table-border-color]`, `[data-table-action="table-header"]`, `.rb-toast`.
- Produit : `scripts/essais/personnalisation-3-suite-navigateur.mjs` (sortie `ok — S<n> : …`, puis
  `personnalisation-3 suite : OK` ; codes 0, 1, 2 comme les autres essais) ; une ligne dans `scripts/verifier.sh` (bloc
  `--e2e`, après `personnalisation-3-tableau-navigateur.mjs`) et dans `scripts/tests/verifier-e2e.test.sh`.
- Réutilise : `scripts/essais/personnalisation-3-tableau-navigateur.mjs:22-66` (aides `check`, `touchDrag`, `capture`,
  `camera`, `screen`, `boundsOf`) et `:414-461` (`main`) — patron de l'essai (réutiliser, recopié dans le fichier neuf).

**Test et commande bornée** :
- `cd $WT && pnpm --filter @roomboard/web build 2>&1 | tail -3 && node scripts/essais/personnalisation-3-suite-navigateur.mjs 2>&1 | tail -40` :
  lignes `ok — S7`, `ok — S8`, `ok — S9`, `ok — S10`, `ok — S11` puis `personnalisation-3 suite : OK`.
- Captures : `node scripts/essais/personnalisation-3-suite-navigateur.mjs --captures 2>&1 | grep -c "capture :"` → 8.
- `bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3` : vert.
- Suite complète : `cd $WT && node ~/.claude/scripts/vm/suite-vm.cjs -- scripts/verifier.sh --e2e 2>&1 | tail -20` :
  `module Wasm : N octets` (N ≤ 1 532 864), `verifier.sh : e2e OK`, aucun `FAIL `, `CLI : OK`.

**Preuve visuelle** : lectures d'abord (`data-table-align` = `center,middle`, `data-table-border` = `<couleur>,8,dashed`,
`data-table-column` = `c|a|b`, largeur lue sur `data-bounds`), puis 8 captures 2x dans
`docs/design/captures/personnalisation-3-tableau/` à décrire au rapport, une phrase chacune (traits nets à 1 px, icônes
nettes, îlot qui ne masque rien d'utile) : `ajuste-avant`, `ajuste-apres`, `alignement-avant`, `alignement-apres`,
`bordures-avant`, `bordures-apres`, `ligne-avant`, `ligne-apres`.

**Contraintes (recopiées)** : G2 `cd $WT &&` · G3 suite complète par `suite-vm.cjs`, preuves bornées · G4 la suite
mesure le module (plafond inchangé) · G8 vrai toucher (CDP `Input.dispatchTouchEvent`), jamais le glisser HTML5 · G10 essais
existants verts sans réécriture de fond · G13 interdits (aucun fichier téléchargé ; images fabriquées) · G14 commits ·
G15 rapport.

**Interdits** : aucun délai fixe pour attendre un état (attendre l'attribut ou le sélecteur) ; aucune capture sans `--captures`.

**Terminé quand** : essai `OK`, 8 captures, suite complète verte, un commit (essai, verifier, captures).

#### Étapes

- [ ] **1. Essai rouge** — créer `scripts/essais/personnalisation-3-suite-navigateur.mjs` :

```js
#!/usr/bin/env node
// Essai personnalisation-3 suite (OG32) au navigateur : lot B (S7 ajuster, S8 alignement, S9 bordures, S10 bouton
// En-tête enfoncé, S11 déplacer une ligne) ; le lot C (T14) ajoute S12, S13, S14. Application construite (apps/web/dist),
// CSP de la coque, Chromium headless de Playwright, vrai toucher (CDP), heure figée. Oracles : #stage[data-…], lus avant
// toute capture. Tableaux posés à droite de l'îlot d'options. Lancé par scripts/verifier.sh --e2e. Sortie : 0 réussi,
// 1 échec, 2 outil absent. Usage : node scripts/essais/personnalisation-3-suite-navigateur.mjs [--captures]
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { DIST, Echec, ROOT, VIEWPORT, coqueCsp, frames, gitSha, item, loadPlaywright, serve, stageBox, stageMouse } from "./commun.mjs";

const LABEL = "personnalisation-3 suite";
const FIXED = new Date("2026-11-28T08:00:00.000Z");
// À droite de l'îlot d'options (x ≥ 440 px), sous la rangée contextuelle de l'îlot d'outils.
const CLICK = [440, 230];
const COL = 240;
const ROW = 64;
const CAPTURES = join(ROOT, "docs", "design", "captures", "personnalisation-3-tableau");

async function scenario(page, url, { captures }) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const fr = () => frames(page);
  const mouse = stageMouse(page);
  const attr = (name) => page.getAttribute("#stage", name);
  const camera = async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    return { zoom, tx, ty };
  };
  const screen = (c, wx, wy) => [wx * c.zoom + c.tx, wy * c.zoom + c.ty];
  const boundsOf = async () => ((await attr("data-bounds")) ?? "").split(",").map(Number);
  const cdp = await page.context().newCDPSession(page);
  const touchDrag = async (a, b, steps = 8) => {
    const box = await stageBox(page);
    const pt = (p) => ({ x: box.x + p[0], y: box.y + p[1], id: 1, radiusX: 4, radiusY: 4, force: 0.5 });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt(a)] });
    for (let i = 1; i <= steps; i++) {
      const p = [a[0] + ((b[0] - a[0]) * i) / steps, a[1] + ((b[1] - a[1]) * i) / steps];
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [pt(p)] });
      await page.waitForTimeout(16);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await fr();
  };
  const capture = async (nom) => {
    if (!captures) return;
    mkdirSync(CAPTURES, { recursive: true });
    const path = join(CAPTURES, `${nom}.png`);
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  };

  await page.goto(url);
  await page.waitForSelector("#stage");
  await fr();
  const c = await camera();
  const origin = [(CLICK[0] - c.tx) / c.zoom, (CLICK[1] - c.ty) / c.zoom];
  /** Tableau cols × rows posé à (origin.x + dx, origin.y + dy) monde ; outil Tableau actif, aucune saisie ouverte. */
  const newTable = async (dx, dy, cols, rows) => {
    await page.click(item("table"));
    await fr();
    await mouse.click(...screen(c, origin[0] + dx, origin[1] + dy));
    await page.waitForSelector(".rb-table-picker:not([hidden])", { timeout: 5000 });
    await page.click(`button[aria-label="${cols} colonnes, ${rows} lignes"]`);
    await page.keyboard.press("Escape");
    await fr();
    return (row, col) => screen(c, origin[0] + dx + COL * col + COL / 2, origin[1] + dy + ROW * row + ROW / 2);
  };
  /** Écrit `text` dans la case (clic, frappe, Échap) ; la case reste active. */
  const typeIn = async (pt, text) => {
    await mouse.click(...pt);
    await page.keyboard.type(text);
    await page.keyboard.press("Escape");
    await fr();
  };
  /** Largeur du tableau posé en (dx, dy) : Sélection sur son bord gauche, data-bounds, puis retour à l'outil Tableau. */
  const widthOf = async (dx, dy) => {
    await page.click(item("select"));
    await fr();
    await mouse.click(...screen(c, origin[0] + dx, origin[1] + dy + ROW / 2));
    await fr();
    const [x0, , x1] = await boundsOf();
    await page.keyboard.press("Escape");
    await page.click(item("table"));
    await fr();
    return x1 - x0;
  };

  // S7 (D14, DS7) : 3 × 3, « Photosynthèse » en (0, 0) ; double appui sur la poignée droite de la case.
  const c7 = await newTable(0, 0, 3, 3);
  await typeIn(c7(0, 0), "Photosynthèse");
  await capture("ajuste-avant");
  const g7 = screen(c, origin[0] + COL, origin[1] + ROW / 2);
  await mouse.click(g7[0], g7[1]);
  await mouse.click(g7[0], g7[1]);
  await fr();
  await capture("ajuste-apres");
  const w7 = await widthOf(0, 0);
  check(w7 > 496 && w7 < 720, `S7 : double appui : la colonne prend la largeur du mot (tableau ${w7}, entre 496 et 720)`);
  await page.keyboard.press("Control+z");
  await fr();
  const w7u = await widthOf(0, 0);
  check(Math.abs(w7u - 720) <= 0.5, `S7 : Ctrl+Z rend 720 en une étape (lu ${w7u})`);
  await mouse.click(...c7(0, 0));
  await page.keyboard.press("Escape");
  await page.keyboard.press("Alt+KeyA");
  await fr();
  const w7a = await widthOf(0, 0);
  check(Math.abs(w7a - w7) <= 0.5, `S7 : Alt+A donne la même largeur (${w7a})`);

  // S8 (D15, DS6) : plage (0, 0)-(0, 1), « Lundi », « Mardi » ; panneau « Centré », « Au milieu » ; clavier ensuite.
  const c8 = await newTable(0, 260, 3, 3);
  await typeIn(c8(0, 0), "Lundi");
  await typeIn(c8(0, 1), "Mardi");
  await mouse.click(...c8(0, 0));
  await page.keyboard.press("Escape");
  await page.keyboard.down("Shift");
  await mouse.click(...c8(0, 1));
  await page.keyboard.up("Shift");
  await fr();
  check((await attr("data-table")) === "3x3@0,0-0,1", `S8 : plage de deux cases (data-table=${await attr("data-table")})`);
  await capture("alignement-avant");
  await page.click('[data-option="tableAlign"] [data-option-value="center"]');
  await page.click('[data-option="tableAlign"] [data-option-value="middle"]');
  await fr();
  check((await attr("data-table-align")) === "center,middle", `S8 : panneau : texte centré au milieu (data-table-align=${await attr("data-table-align")})`);
  await capture("alignement-apres");
  await page.keyboard.press("Control+z");
  await page.keyboard.press("Control+z");
  await fr();
  check((await attr("data-table-align")) === "left,top", "S8 : deux Ctrl+Z, deux étapes : left,top");
  await page.keyboard.press("Alt+Shift+KeyC");
  await page.keyboard.press("Alt+Shift+KeyM");
  await fr();
  check((await attr("data-table-align")) === "center,middle", "S8 : Alt+Maj+C puis Alt+Maj+M : center,middle");

  // S9 (D16, DS4) : plage 2 × 2 ; 2e pastille, « Épais », « Tirets » ; Alt+Maj+B sur (1, 1).
  const c9 = await newTable(0, 520, 3, 3);
  await mouse.click(...c9(0, 0));
  await page.keyboard.press("Escape");
  await page.keyboard.down("Shift");
  await mouse.click(...c9(1, 1));
  await page.keyboard.up("Shift");
  await fr();
  await capture("bordures-avant");
  const sw = page.locator('[data-option="tableBorder"] [data-table-border-color]').nth(1);
  const colour = await sw.getAttribute("data-table-border-color");
  await sw.click();
  await page.click('[data-option="tableBorder"] [data-option-value="8"]');
  await page.click('[data-option="tableBorder"] [data-option-value="dashed"]');
  await fr();
  check((await attr("data-table-border")) === `${colour},8,dashed`, `S9 : bordure ${colour}, 8, tirets sur la plage (data-table-border=${await attr("data-table-border")})`);
  await capture("bordures-apres");
  await mouse.click(...c9(1, 1));
  await page.keyboard.press("Escape");
  await page.keyboard.press("Alt+Shift+KeyB");
  await fr();
  check(((await attr("data-table-border")) ?? "").endsWith(",none"), "S9 : Alt+Maj+B : aucune bordure sur (1, 1)");

  // S10 (mineurs PR 74) : bouton « En-tête » enfoncé, relâché par Ctrl+Z.
  const head = page.locator('[data-table-action="table-header"]');
  check((await head.getAttribute("aria-pressed")) === "false", "S10 : bouton En-tête relâché au départ");
  await head.click();
  await fr();
  check((await head.getAttribute("aria-pressed")) === "true", "S10 : bouton En-tête enfoncé après l'appui");
  await page.keyboard.press("Control+z");
  await fr();
  check((await head.getAttribute("aria-pressed")) === "false", "S10 : Ctrl+Z le relâche");

  // S11 (D18, DS8) : 3 × 3 à droite, « a », « b », « c » ; poignée de la ligne 2 tirée au doigt sur la ligne 0.
  const RX = 780;
  const c11 = await newTable(RX, 0, 3, 3);
  await typeIn(c11(0, 0), "a");
  await typeIn(c11(1, 0), "b");
  await typeIn(c11(2, 0), "c");
  await capture("ligne-avant");
  const grip11 = (row) => { const p = screen(c, origin[0] + RX, origin[1] + ROW * row + ROW / 2); return [p[0] - 22, p[1]]; };
  await touchDrag(grip11(2), grip11(0));
  check((await attr("data-table-column")) === "c|a|b", `S11 : ligne 2 tirée au-dessus de la ligne 0 (data-table-column=${await attr("data-table-column")})`);
  await capture("ligne-apres");
  await page.keyboard.press("Control+z");
  await fr();
  check((await attr("data-table-column")) === "a|b|c", "S11 : Ctrl+Z, une étape : a|b|c");
  await page.keyboard.press("Control+Shift+ArrowUp");
  await fr();
  check((await attr("data-table-column")) === "a|c|b", "S11 : Ctrl+Maj+↑ : a|c|b");
  await mouse.click(...c11(0, 1));
  await page.keyboard.press("Escape");
  await page.keyboard.down("Shift");
  await mouse.click(...c11(1, 1));
  await page.keyboard.up("Shift");
  await page.click('[data-table-action="table-merge"]');
  await mouse.click(...c11(2, 0));
  await page.keyboard.press("Escape");
  await fr();
  await touchDrag(grip11(2), grip11(1));
  await page.waitForSelector('.rb-toast:has-text("Une cellule fusionnée empêche ce déplacement.")', { timeout: 5000 });
  check(((await attr("data-table-column")) ?? "").startsWith("a|"), "S11 : zone coupée : refus, message, ordre inchangé");

  // Lot C (T14) : S12, S13, S14 ici.

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
  const captures = process.argv.includes("--captures");
  const server = await serve({ headers: { "Content-Security-Policy": coqueCsp() } });
  const port = server.address().port;
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: captures ? 2 : 1, hasTouch: true });
    const external = [];
    await context.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === "127.0.0.1") return route.continue();
      external.push(u.href);
      return route.abort();
    });
    const page = await context.newPage();
    await page.clock.setFixedTime(FIXED);
    await scenario(page, `http://127.0.0.1:${port}/?fichiers=repli`, { captures });
    if (external.length > 0) throw new Echec(`requêtes hors de 127.0.0.1 : ${external.join(", ")}`);
    console.log(`${LABEL} : OK`);
    return 0;
  } catch (e) {
    console.error(`${LABEL} : ÉCHEC — ${e instanceof Echec ? e.message : e instanceof Error ? e.stack : e}`);
    return 1;
  } finally {
    await browser?.close();
    server.close();
  }
}

process.exitCode = await main();
```

(À ajuster sur place, sans changer les oracles : le `aria-label` de la grille (« 3 colonnes, 3 lignes »), la case
active après `typeIn` (un `Escape` de plus si une saisie reste ouverte), le point de la poignée de S7 si l'îlot le
recouvre. Si un tableau sort de la page à droite, `create` le décale : lire alors son origine sur `data-bounds`.)

- [ ] **2. Rouge puis vert** — commande bornée de l'essai ; corriger l'essai (jamais le produit sans test unitaire rouge
  d'abord) jusqu'à `personnalisation-3 suite : OK`.

- [ ] **3. Branchement** — `scripts/verifier.sh`, après `node scripts/essais/personnalisation-3-tableau-navigateur.mjs` :
  `  node scripts/essais/personnalisation-3-suite-navigateur.mjs` ; `scripts/tests/verifier-e2e.test.sh`, après la ligne
  de `personnalisation-3-tableau-navigateur` :
  `grep -q "scripts/essais/personnalisation-3-suite-navigateur.mjs" scripts/verifier.sh || ko "personnalisation-3-suite-navigateur absent de verifier.sh"`.

- [ ] **4. Essais existants** — `node scripts/essais/c10a-tableau-navigateur.mjs`, `c10b-…`, `c13-tableaux-…`,
  `personnalisation-3-tableau-navigateur.mjs` (chacun `| tail -5`) : verts ; si l'un échoue parce que l'îlot d'options
  (ouvert avec l'outil Tableau, DS10) recouvre une case, ajouter **une** ligne après son premier choix d'outil Tableau :
  `await page.click("[data-options-toggle]"); await fr();` (patron du lot A) et le noter au rapport.

- [ ] **5. Captures** — `node scripts/essais/personnalisation-3-suite-navigateur.mjs --captures 2>&1 | grep "capture :"` :
  8 lignes ; regarder chaque image (2x) et la décrire au rapport.

- [ ] **6. Suite complète** — commande de la section ; relever `module Wasm` et `module formats`.

- [ ] **7. Commit** — essai, `verifier.sh`, `verifier-e2e.test.sh`, essais retouchés, 8 captures ; message
  `test(e2e): personnalisation-3 suite browser trial for lot B (S7 to S11), captures`. **Fin du lot B** : l'orchestrateur
  peut ouvrir la PR du lot B ici.

---

## Lot C (T11 à T14) — après la fusion du lot B

### Tâche T11 — Point 12 : cache qui s'ouvre et se referme (toucher, Alt+O, dessin ouvert)

<a id="tache-t11"></a>

**Objectif** (D19, DS3, S12) : avec la Sélection, toucher une case ombrée l'ouvre (`SetTableLook` `open` vrai, l'ombrage
reste), la toucher encore la referme ; Alt+O en outil Tableau bascule la plage (aucune case ombrée : rien) ; un cache
ouvert montre fond, image de fond et texte, avec un liseré hachuré de 4 unités au bord intérieur ; le pot y colore un mot ;
`#stage[data-table-opens]` compte les caches ouverts de la page (boucle `tableCounts` existante).

**Fichiers** : ligne T11.

**Interfaces**
- Consomme (T3, T6) : `SetTableLook` `open` ; `cellLook(t, rowId, colId).open` ; `TableTool.look`.
- Produit : `Reveal.open: boolean` (`select.ts`) ; `TableAction` + `"shade-open-toggle"` ; `TableKey` idem (Alt+O) ;
  `TableCellState.open?: boolean` ; `EngineState.tableOpens: number` ; `#stage[data-table-opens]` ;
  `export const TABLE_OPEN_RIM = 4;` (`table-geom.ts`).
- Réutilise : `apps/web/src/engine/tools/select.ts:201` `shadedCellAt` et `:324-327` (F10) — `SetTableLook` au lieu de `SetTableShade` null (étendre).
- Réutilise : `apps/web/src/engine/render/table-paint.ts:59` `paintShade` — hachures extraites en `hatch` (étendre).
- Réutilise : `apps/web/src/engine/engine.ts:538` `tableCounts` — compte des ouverts dans la même boucle (étendre).

**Test et commande bornée** :
`cd $WT && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/tools/select.test.ts src/engine/render/table-paint.test.ts src/engine/fill-target.test.ts src/engine/tools/table.test.ts src/engine/input/keys.test.ts src/ui/shortcuts.test.ts -t "S12|F10|tableKey|shortcuts|OG23 × OG26" 2>&1 | tail -8`
(`F10` : 5 existants mis à jour ; `S12` : 5 neufs). Garder verts : `select.test.ts` (hors F10), `table-paint.test.ts`
(F13 : un cache fermé se dessine comme avant).
- Témoin S6 (DS16, la tâche touche `fill-target.ts`) : `cd $WT && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/zone-s6-banc.test.ts 2>&1 | grep "S6 empreinte"`
  avant la tâche, puis après : lignes identiques (sinon : nouveau hash relevé et noté dans `docs/essais/c8-porte-s6.md`
  comme la PR 53, aucun seuil touché).

**Contraintes (recopiées)** : G1 TDD · G2 `cd $WT &&` · G3 `nice -n 10`, preuves bornées · G7 un toucher = une commande ·
G8 toucher au pointeur du moteur · G9 Alt+O lu par `code`, `SHORTCUTS` + `EXPECT`, liste `table` du test « fusion OG23 ×
OG26 » · G10 Sélection hors case ombrée inchangée · G11 même peintre écran, image, PDF · G13 interdits · G14 commits · G15 rapport.

**Interdits** : aucune boucle neuve par image (`tableOpens` dans `tableCounts`) ; loger dans un cache, ouvert ou non,
reste refusé (DS3, `cell-drop` inchangé).

**Terminé quand** : preuves vertes, empreinte S6 identique, ou nouveau hash documenté dans `docs/essais/c8-porte-s6.md` comme la PR 53, un commit.

#### Étapes

- [ ] **1. Tests rouges** — `tools/select.test.ts`, `describe("révélation d'un ombrage (F10)")` : les attentes
  `{ type: "SetTableShade", id, from: cell, to: cell, shade: null }` deviennent
  `{ type: "SetTableLook", id, from: cell, to: cell, look: { key: "open", value: true } }`, et `["SetTableShade"]` devient
  `["SetTableLook"]` (titres : « SetTableLook open sur elle » au lieu de « SetTableShade null sur elle »). Puis :

```ts
  it("S12 : toucher un cache ouvert le referme (open faux), une étape ; l'ombrage reste", () => {
    const s = setup();
    const { id, cell } = shadedTable(s);
    gesture(s.tool, [[150, 130]]);
    const t1 = s.doc.element(id);
    expect(t1?.kind === "table" ? t1.table.cells[0]?.open : null).toBe(true);
    gesture(s.tool, [[150, 130]]);
    expect(s.runs.at(-1)).toEqual({ type: "SetTableLook", id, from: cell, to: cell, look: { key: "open", value: false } });
    expect(shades(s, id)).toBe(1);
  });
```

(`shadedTable(s)` et `gesture(s.tool, [[150, 130]])` : les aides du bloc F10 ; dans le test « F10, S1 », l'ombrage reste
après le toucher : `expect([shades(s, id), s.tool.selection()]).toEqual([1, []])`, et après `undo` la case est fermée.) `render/table-paint.test.ts` :

```ts
describe("S12 cache ouvert (DS3, H19)", () => {
  const open = (o: boolean): TableData => ({
    color: "#000000", size: 36, merges: [],
    cols: [{ id: "a", width: 100 }], rows: [{ id: "r", height: 64 }],
    cells: [{ row: "r", col: "a", text: "secret", fill: "#fef08a", shade: "#94a3b8", spans: plainSpans("secret"), ...(o ? { open: true as const } : {}) }],
  });
  it("S12 : ouvert : le fond de la case reste visible, quatre bandes de 4 au bord, aucun fond opaque plein", () => {
    const ctx = new FakeCtx();
    paintTableGrid(asCtx(ctx), open(true));
    expect(ctx.rects).toContainEqual([0, 0, 100, 64]);
    expect(ctx.rects).toContainEqual([0, 0, 100, 4]);
    expect(ctx.rects).toContainEqual([0, 60, 100, 4]);
    expect(ctx.log.filter((l) => l === "fillRect #94a3b8")).toHaveLength(4);
  });
  it("S12 : ouvert : le texte est dessiné ; fermé : non (F11)", () => {
    expect(cellTextBoxes(open(true)).map((b) => b.text)).toEqual(["secret"]);
    expect(cellTextBoxes(open(false))).toEqual([]);
  });
});
```

`fill-target.test.ts` (même banc) :

```ts
  it("S12 : pot sur un cache ouvert : le mot (SetTableCell) ; fermé : remplissage (SetTableFill)", () => {
    const m10 = (x: string) => x.length * 10;
    const { doc, page, table, r, c } = setup();
    const cell = { row: r[0] ?? "", col: c[0] ?? "" };
    doc.apply({ type: "SetTableShade", id: table, from: cell, to: cell, shade: "#94a3b8" });
    expect(fillCommand(doc, page, 120, 420, 1, "#dc2626", m10)).toMatchObject({ type: "SetTableFill" });
    doc.apply({ type: "SetTableLook", id: table, from: cell, to: cell, look: { key: "open", value: true } });
    expect(fillCommand(doc, page, 120, 420, 1, "#dc2626", m10)).toMatchObject({ type: "SetTableCell" });
  });
```

`tools/table.test.ts` :

```ts
describe("outil Tableau — S12 cache (DS3)", () => {
  it("S12 : Alt+O (shade-open-toggle) : ouvre puis referme la case ombrée ; sans ombrage : rien", () => {
    const s = setup();
    const id = s.create(100, 200, 2, 2);
    s.tool.requestCommit();
    const n = s.runs.length;
    s.tool.act("shade-open-toggle");
    expect(s.runs.length).toBe(n);
    s.tool.act("shade");
    s.tool.act("shade-open-toggle");
    expect(s.tool.cellState()?.open).toBe(true);
    s.tool.act("shade-open-toggle");
    expect(s.tool.cellState()?.open).toBe(false);
    expect(s.table(id).cells[0]?.shade).toBe("#94a3b8");
  });
});
```

`keys.test.ts` : `tableKey` d'Alt+O → `"shade-open-toggle"` ; liste `table` : `k("o", { code: "KeyO", altKey: true })`.
`shortcuts.test.ts`, `EXPECT` : `"table-shade-open": ["table", "shade-open-toggle"],`.

- [ ] **2. Rouge** — commande bornée ; relever la ligne `S6 empreinte :` (avant).

- [ ] **3. Sélection** — `select.ts` : `interface Reveal` gagne `readonly open: boolean;` ; `shadedCellAt` rend
  `{ id, row: r.id, col: k.id, open: cellLook(h.table, r.id, k.id).open }` (importer `cellLook`) ; au relâché :

```ts
      if (d.mode === "tap-shade") {
        const r = d.reveal;
        // DS3 : le toucher ouvre ou referme le cache (l'ombrage reste) ; une étape.
        if (r !== null) ctx.run({ type: "SetTableLook", id: r.id, from: { row: r.row, col: r.col }, to: { row: r.row, col: r.col }, look: { key: "open", value: !r.open } });
        return;
      }
```

En-tête du fichier (ligne 8) : « la révèle (SetTableShade à null…) » devient « l'ouvre ou la referme (`SetTableLook`
`open`, une étape) ».

- [ ] **4. Dessin** — `table-geom.ts` : `export const TABLE_OPEN_RIM = 4;` (H19). `render/table-paint.ts` :

```ts
/** Hachures à 45° découpées au rectangle (F13). */
function hatch(ctx: CanvasRenderingContext2D, b: Bounds): void {
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x0, b.y0, w, h);
  ctx.clip();
  ctx.beginPath();
  for (let k = -h; k < w; k += TABLE_SHADE_HATCH_STEP) {
    ctx.moveTo(b.x0 + k, b.y1);
    ctx.lineTo(b.x0 + k + h, b.y0);
  }
  ctx.strokeStyle = TABLE_SHADE_HATCH;
  ctx.lineWidth = TABLE_SHADE_HATCH_WIDTH;
  ctx.stroke();
  ctx.restore();
}

/** Ombrage (F13) : fond opaque à la couleur de la cellule, hachures à 45° découpées au rectangle. */
function paintShade(ctx: CanvasRenderingContext2D, b: Bounds, color: string): void {
  fillBox(ctx, b, color);
  hatch(ctx, b);
}

/** Cache ouvert (DS3, H19) : quatre bandes de `TABLE_OPEN_RIM` au bord intérieur, à la couleur de l'ombrage, hachurées ;
 *  le contenu de la case reste visible. */
function paintOpenShade(ctx: CanvasRenderingContext2D, b: Bounds, color: string): void {
  const r = Math.min(TABLE_OPEN_RIM, (b.x1 - b.x0) / 2, (b.y1 - b.y0) / 2);
  for (const s of [
    { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y0 + r },
    { x0: b.x0, y0: b.y1 - r, x1: b.x1, y1: b.y1 },
    { x0: b.x0, y0: b.y0 + r, x1: b.x0 + r, y1: b.y1 - r },
    { x0: b.x1 - r, y0: b.y0 + r, x1: b.x1, y1: b.y1 - r },
  ]) {
    fillBox(ctx, s, color);
    hatch(ctx, s);
  }
}
```

Dans `paintTableGrid`, la boucle des ombrages : `if (at !== null) (cell.open === true ? paintOpenShade : paintShade)(ctx, cellRect(t, at), cell.shade);` ;
`cellTextBoxes` : `if (cell.text === "" || (cell.shade !== null && cell.open !== true)) continue;`. `fill-target.ts`,
`tableCommand` : `if (content.text === "" || (content.shade !== null && !cellLook(t, row, col).open)) return fill;`.

- [ ] **5. Outil, moteur, touches** — `tools/table.ts`, `act` :

```ts
        case "shade-open-toggle": {
          const shaded = rangeCells(t, span).flatMap((c) => {
            const r = t.rows[c.row];
            const k = t.cols[c.col];
            return r !== undefined && k !== undefined && cellContent(t, r.id, k.id).shade !== null ? [cellLook(t, r.id, k.id).open] : [];
          });
          if (shaded.length > 0) api.look({ key: "open", value: !shaded.every((o) => o) });
          return;
        }
```

`cellState` : `open: cellLook(t, at.ref.row, at.ref.col).open`. `table-geom.ts` : `TableCellState` + `readonly open?: boolean;`,
`TableAction` + `| "shade-open-toggle"`. `engine.ts` : `tableCounts` compte aussi
`opens += el.table.cells.filter((c) => c.open === true).length;` (clé `opens` dans `counted`), `EngineState` gagne
`readonly tableOpens: number;` (`tableOpens: tableCounts().opens`). `input/keys.ts` : `TableKey` + `"shade-open-toggle"` ;
sans Maj : `if (code === "KeyO") return "shade-open-toggle";`. `ui/shortcuts.ts` :
`s("table-shade-open", "Tableau", "Ouvrir ou refermer le cache", "Alt+O"),`. `app/stage-tags.ts` : clé `tableOpens` =
`String(s.tableOpens)` ; `app/board-session.ts` : `stage.dataset["tableOpens"] = tags.tableOpens;`.

- [ ] **6. Vert** — commande bornée ; `select.test.ts`, `table-paint.test.ts`, `engine.test.ts` entiers verts ; témoin S6 (après) identique ou documenté.

- [ ] **7. Commit** — fichiers de la ligne T11 ; message `feat(web): a shaded cell opens and closes on touch or Alt+O, open caches show their content with a hatched rim`.

---

### Tâche T12 — Point 13 : trier selon une colonne (Alt+T, Alt+Maj+T, panneau, menu)

<a id="tache-t12"></a>

**Objectif** (D20, DS9, S13) : trier les lignes selon la colonne de la case active : `Intl.Collator("fr", { numeric: true, sensitivity: "base" })`,
vides en dernier dans les deux sens, tri stable, en-tête gardé en tête ; une zone qui couvre plusieurs lignes refuse
(message) ; ordre inchangé : aucune commande ; sinon une `ReorderTableLines`. Gestes : Alt+T, Alt+Maj+T, deux boutons de la
section « Lignes » du panneau, « Trier » (croissant) au menu de case.

**Fichiers** : ligne T12.

**Interfaces**
- Consomme (T4, T9) : `ReorderTableLines` ; `TableSection` (`tableRows`) ; `CellMenuItem`.
- Produit : `export const SORT_REFUSED = "Le tri ne passe pas sur une cellule fusionnée sur plusieurs lignes.";`
  `export function sortedRows(t: TableData, col: number, dir: "asc" | "desc"): string[] | null` (`null` = refus) ;
  `TableAction` + `"sort-asc" | "sort-desc"` ; `TableKey` idem ; `CellMenuItem.id` + `"sort-asc"` ; icônes Lucide
  `arrow-down-a-z`, `arrow-down-z-a`.
- Réutilise : `ReorderTableLines` (T4) — écriture, suivi des objets logés (réutiliser).
- Réutilise : `apps/web/src/engine/table-geom.ts` `anchorOf`, `mergeRanges`, `cellContent` (réutiliser).
- Réutilise : `apps/web/src/ui/cell-menu.ts` `ICON_OF` (étendre) ; `ui/TableOptions.tsx` section `tableRows` (étendre).

**Test et commande bornée** :
`cd $WT && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/table-geom.test.ts src/engine/tools/table.test.ts src/ui/TableOptions.test.tsx src/ui/cell-menu.test.ts src/ui/icons.test.ts src/engine/input/keys.test.ts src/ui/shortcuts.test.ts -t "S13|sortedRows|icons|ICONS|tableKey|shortcuts|OG23 × OG26" 2>&1 | tail -8`
(`sortedRows` : 4 ; `S13` : 4 ; `icons.test.ts` vert à 135).

**Contraintes (recopiées)** : G1 TDD · G2 `cd $WT &&` · G3 `nice -n 10`, preuves bornées · G7 un tri = une commande, ordre
inchangé : aucune · G8 menu de case par appui long, boutons ≥ 44 px · G9 Alt+T, Alt+Maj+T lus par `code`, `SHORTCUTS` +
`EXPECT`, liste `table` du test « fusion OG23 × OG26 » · G12 icônes Lucide recopiées, notice · G13 interdits · G14 commits · G15 rapport.

**Interdits** : aucun tri dans le cœur ; l'en-tête ne bouge jamais.

**Terminé quand** : preuves vertes, un commit.

#### Étapes

- [ ] **1. Tests rouges** — `table-geom.test.ts` :

```ts
import { sortedRows } from "./table-geom";
describe("sortedRows (D20, DS9)", () => {
  const col = (texts: readonly string[], header = false, merges: TableData["merges"] = []): TableData => ({
    color: "#000", size: 36, merges, ...(header ? { header: true } : {}),
    cols: [{ id: "a", width: 100 }, { id: "b", width: 100 }],
    rows: texts.map((_, i) => ({ id: `r${i}`, height: 64 })),
    cells: texts.flatMap((text, i) => (text === "" ? [] : [{ row: `r${i}`, col: "a", text, fill: null, shade: null, spans: [{ text, attrs: {} }] }])),
  });
  it("sortedRows : nombres en ordre numérique fr, en-tête gardé en tête", () => {
    expect(sortedRows(col(["Nombre", "10", "9", "100"], true), 0, "asc")).toEqual(["r0", "r2", "r1", "r3"]);
    expect(sortedRows(col(["Nombre", "10", "9", "100"], true), 0, "desc")).toEqual(["r0", "r3", "r1", "r2"]);
  });
  it("sortedRows : vides en dernier dans les deux sens ; casse et accents ignorés, stable", () => {
    expect(sortedRows(col(["b", "", "A", "a"]), 0, "asc")).toEqual(["r2", "r3", "r0", "r1"]);
    expect(sortedRows(col(["b", "", "A", "a"]), 0, "desc")).toEqual(["r0", "r2", "r3", "r1"]);
  });
  it("sortedRows : zone sur deux lignes : refus (null)", () => {
    expect(sortedRows(col(["x", "y", "z"], false, [{ row: "r0", col: "b", rows: 2, cols: 1 }]), 0, "asc")).toBeNull();
  });
  it("sortedRows : zone d'une seule ligne : admise ; une case couverte prend le texte de l'ancre", () => {
    const t = col(["z", "y"], false, [{ row: "r0", col: "a", rows: 1, cols: 2 }]);
    expect(sortedRows(t, 0, "asc")).toEqual(["r1", "r0"]);
    expect(sortedRows(t, 1, "asc")).toEqual(["r0", "r1"]);
  });
});
```

(Dernier cas : la colonne 1 de la ligne 0 est couverte par la zone ancrée en (0, 0), son texte est celui de l'ancre ;
la ligne 1 n'a rien en colonne 1 : vide, en dernier.) `tools/table.test.ts` :

```ts
describe("outil Tableau — S13 trier (DS9)", () => {
  const ready = () => {
    const s = setup();
    const id = s.create(100, 200, 2, 4);
    for (const text of ["Nombre", "10", "9", "100"]) {
      s.type(text);
      s.tool.navigate("down");
    }
    s.tool.requestCommit();
    s.doc.apply({ type: "SetTableOptions", id, header: true });
    s.click(100 + 120, 200 + 64 + 32);
    s.tool.requestCommit();
    return { s, id };
  };
  it("S13 : Alt+T (sort-asc) : une ReorderTableLines, Nombre|9|10|100 ; un undo rend l'ordre", () => {
    const { s } = ready();
    const n = s.runs.length;
    s.tool.act("sort-asc");
    expect(s.runs.length).toBe(n + 1);
    expect(s.last()?.type).toBe("ReorderTableLines");
    expect(s.tool.cellState()?.column).toEqual(["Nombre", "9", "10", "100"]);
    s.doc.undo();
    expect(s.tool.cellState()?.column).toEqual(["Nombre", "10", "9", "100"]);
  });
  it("S13 : déjà trié : aucune commande", () => {
    const { s } = ready();
    s.tool.act("sort-asc");
    const n = s.runs.length;
    s.tool.act("sort-asc");
    expect(s.runs.length).toBe(n);
  });
  it("S13 : zone sur deux lignes refusée : message, aucune commande", () => {
    const { s, id } = ready();
    const t = s.table(id);
    s.doc.apply({ type: "MergeTableCells", id, from: { row: t.rows[1]?.id ?? "", col: t.cols[1]?.id ?? "" }, to: { row: t.rows[2]?.id ?? "", col: t.cols[1]?.id ?? "" } });
    const n = s.runs.length;
    s.tool.act("sort-desc");
    expect(s.runs.length).toBe(n);
    expect(s.notices).toContain("Le tri ne passe pas sur une cellule fusionnée sur plusieurs lignes.");
  });
  it("S13 : le menu de case propose « Trier »", () => {
    vi.useFakeTimers();
    try {
      const { s } = ready();
      s.tool.begin(1, [at(220, 296)]);
      vi.advanceTimersByTime(500);
      expect(s.menuOpens.at(-1)?.items.map((i) => i.id)).toContain("sort-asc");
      s.tool.close(1, "end");
    } finally {
      vi.useRealTimers();
    }
  });
});
```

`ui/TableOptions.test.tsx` : « DS10 : Lignes : Trier croissant et décroissant (act sort-asc, sort-desc) » (boutons
`[data-table-option="sort-asc"]`, `[data-table-option="sort-desc"]`). `cell-menu.test.ts` : l'entrée `sort-asc` a l'icône
`arrow-down-a-z`. `icons.test.ts` : `TABLE_SUITE_ICONS` gagne `arrow-down-a-z`, `arrow-down-z-a` ; 133 → 135 ; tracés :
`arrow-down-a-z` = `[["path", { d: "m3 16 4 4 4-4" }], ["path", { d: "M7 20V4" }], ["path", { d: "M20 8h-5" }], ["path", { d: "M15 10V6.5a2.5 2.5 0 0 1 5 0V10" }], ["path", { d: "M15 14h5l-5 6h5" }]]`,
`arrow-down-z-a` = `[["path", { d: "m3 16 4 4 4-4" }], ["path", { d: "M7 4v16" }], ["path", { d: "M15 4h5l-5 6h5" }], ["path", { d: "M15 20v-3.5a2.5 2.5 0 0 1 5 0V20" }], ["path", { d: "M20 18h-5" }]]`.
`keys.test.ts` : Alt+T → `"sort-asc"`, Alt+Maj+T → `"sort-desc"` ; liste `table` : les deux. `shortcuts.test.ts`, `EXPECT` :
`"table-sort-asc": ["table", "sort-asc"], "table-sort-desc": ["table", "sort-desc"],`.

- [ ] **2. Rouge** — commande bornée.

- [ ] **3. `table-geom.ts`** :

```ts
export const SORT_REFUSED = "Le tri ne passe pas sur une cellule fusionnée sur plusieurs lignes.";
const SORT = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });

/** D20, DS9 : ordre des lignes trié selon la colonne `col` (texte de l'ancre si la case est couverte) ; vides en
 *  dernier dans les deux sens, tri stable, ligne d'en-tête gardée en tête ; une zone sur plusieurs lignes : null. */
export function sortedRows(t: TableData, col: number, dir: "asc" | "desc"): string[] | null {
  if (mergeRanges(t).some((z) => z.r1 > z.r0)) return null;
  const head = t.header === true ? t.rows.slice(0, 1) : [];
  const body = t.rows.slice(head.length).map((r, j) => {
    const i = j + head.length;
    const a = anchorOf(t, { row: i, col });
    const text = cellContent(t, t.rows[a.row]?.id ?? "", t.cols[a.col]?.id ?? "").text.trim();
    return { id: r.id, i, text };
  });
  body.sort((x, y) => {
    if (x.text === "" || y.text === "") return x.text === y.text ? x.i - y.i : x.text === "" ? 1 : -1;
    const c = SORT.compare(x.text, y.text);
    return c !== 0 ? (dir === "asc" ? c : -c) : x.i - y.i;
  });
  return [...head.map((r) => r.id), ...body.map((b) => b.id)];
}
```

`TableAction` + `| "sort-asc" | "sort-desc"`.

- [ ] **4. Outil, menu, panneau, touches** — `tools/table.ts`, `act` :

```ts
        case "sort-asc":
        case "sort-desc": {
          const order = sortedRows(t, at.cell.col, a === "sort-asc" ? "asc" : "desc");
          if (order === null) notify?.(SORT_REFUSED);
          else if (order.some((x, i) => x !== t.rows[i]?.id)) ctx.run({ type: "ReorderTableLines", id: ref.id, axis: "row", order });
          break;
        }
```

`openMenu` : avant « En-tête », `items.push({ id: "sort-asc", label: "Trier", run: () => api.act("sort-asc") });`.
`ui/cell-menu.ts` : `CellMenuItem.id` + `| "sort-asc"` ; `ICON_OF` + `"sort-asc": "arrow-down-a-z"`. `ui/icons.ts` : les deux
icônes (commentaire « personnalisation-3 suite (DS9) : Lucide @7981a0798a, ISC ») ; `THIRD_PARTY_NOTICES.md` : les deux
noms dans la ligne « personnalisation-3 suite » de T9. `ui/TableOptions.tsx`, section `tableRows`, après l'interrupteur
d'en-tête :

```tsx
        <IconButton keepFocus icon="arrow-down-a-z" label="Trier croissant (Alt+T)" attrs={{ "data-table-option": "sort-asc", class: "rb-opt-btn" }} onPress={() => props.host.act("sort-asc")} />
        <IconButton keepFocus icon="arrow-down-z-a" label="Trier décroissant (Alt+Maj+T)" attrs={{ "data-table-option": "sort-desc", class: "rb-opt-btn" }} onPress={() => props.host.act("sort-desc")} />
```

`input/keys.ts` : `TableKey` + `| "sort-asc" | "sort-desc"` ; branche Maj : `if (code === "KeyT") return "sort-desc";` ; sans
Maj : `if (code === "KeyT") return "sort-asc";`. `ui/shortcuts.ts` : `s("table-sort-asc", "Tableau", "Trier croissant", "Alt+T"),`,
`s("table-sort-desc", "Tableau", "Trier décroissant", "Alt+Maj+T"),`.

- [ ] **5. Vert** — commande bornée ; `table.test.ts` entier vert.

- [ ] **6. Commit** — fichiers de la ligne T12 ; message `feat(web): sort table rows by the active column (French numeric order, header kept), Alt+T and Alt+Shift+T`.

---

### Tâche T13 — Point 14 : tableau de tri (règle d'étiquettes au relâché, champ « Accepte »)

<a id="tache-t13"></a>

**Objectif** (D21, DS5, S14) : une colonne qui a `accept` n'accepte qu'un seul texte dont le contenu, sans blancs de bord et
sans casse, est dans la liste ; sa case d'en-tête refuse tout. Refusé au relâché : **aucune commande**, l'aperçu est
annulé, l'objet reste à sa place, aucune étape ; **Alt tenue au relâché ne contourne pas la règle** (choix tranché seul : la
règle ne se contourne pas par un modificateur ; une étiquette admise avec Alt se déplace librement) ; Alt+Entrée refusé de même ; pas de cadre de case visée sur une case qui
refuserait. Section « Tableau de tri » du panneau : champ « Accepte » (virgule, point-virgule ou retour), écrit au
changement (Entrée ou perte du focus) par une `SetTableLook` `accept` sur les colonnes de la plage.

**Patron à ne pas reprendre** : `drop(...)` qui rend `null` pour « refusé » : la Sélection écrit alors sa `Transform`
(`apps/web/src/engine/tools/select.ts:343-344` : `ctx.run(placed ?? { type: "Transform", … })`) et l'étiquette refusée
serait **posée** par-dessus le tableau, avec une étape. Chemin de référence : le toucher d'ombrage, qui rend la main sans
`Transform` (`select.ts:324-327`) ; `drop` rend la valeur distincte `"refused"`, et la Sélection n'écrit rien.

**Fichiers** : ligne T13.

**Interfaces**
- Consomme (T3, T9) : `TableCol.accept`, `SetTableLook` `accept`, `TableSection`, `TableOptionsHost.look`.
- Produit :
  - `export function acceptsDrop(t: TableData, cell: Cell, label: string | null): boolean` ;
    `export function parseLabels(s: string): string[]` (`table-geom.ts`) ;
  - `CellDrop.drop(...): Command | null | "refused"` ; `export const REFUSED = "refused";` (`cell-drop.ts`) ;
  - `TableCellState.accept?: readonly string[]` ; `TableSectionKey` + `"tableAccept"` ; `OptionKey` + `"tableAccept"`
    (« Tableau de tri »), dans `TABLE_SECTIONS` après `tableRows`.
- Réutilise : `apps/web/src/engine/tools/cell-drop.ts:68` `aimed`, `:191` `drop`, `:199` `place` (étendre).
- Réutilise : `apps/web/src/engine/tools/select.ts:343` relâché du déplacement (étendre d'une ligne).
- Réutilise : `apps/web/src/ui/TableOptions.tsx` (T9) — section neuve (étendre).

**Test et commande bornée** :
`cd $WT && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/table-geom.test.ts src/engine/tools/cell-drop.test.ts src/engine/tools/select.test.ts src/ui/TableOptions.test.tsx src/ui/tool-options.test.ts -t "S14|acceptsDrop|parseLabels" 2>&1 | tail -8`
(`acceptsDrop` : 2, `parseLabels` : 1, `S14` : 7 = 6 de `cell-drop.test.ts` + 1 de `TableOptions.test.tsx`). Garder verts :
`cell-drop.test.ts` et `select.test.ts` entiers (sans `accept`, rien ne change).

**Contraintes (recopiées)** : G1 TDD · G2 `cd $WT &&` · G3 `nice -n 10`, preuves bornées · G7 refus = aucune commande,
aucune étape ; le champ écrit une commande par changement · G8 glisser au pointeur du moteur · G9 pas de raccourci pour le
champ (DS11), Alt+Entrée soumis à la règle · G10 hors colonne `accept`, logement et déplacement inchangés · G13 interdits ·
G14 commits · G15 rapport.

**Interdits** : aucune règle d'étiquette dans le cœur ou la CLI (HS3) ; aucune animation de retour (cadrage § 7).

**Terminé quand** : preuves vertes, un commit.

#### Étapes

- [ ] **1. Tests rouges** — `table-geom.test.ts` :

```ts
import { acceptsDrop, parseLabels } from "./table-geom";
describe("acceptsDrop, parseLabels (D21, DS5)", () => {
  const t = (header: boolean): TableData => ({
    color: "#000", size: 36, merges: [], cells: [], ...(header ? { header: true } : {}),
    cols: [{ id: "a", width: 100, accept: ["chat", "Chien"] }, { id: "b", width: 100 }],
    rows: [{ id: "r0", height: 64 }, { id: "r1", height: 64 }],
  });
  it("acceptsDrop : libellé de la liste (casse, blancs de bord) ; autre libellé, objet non texte : refus ; colonne sans liste : tout", () => {
    expect(acceptsDrop(t(false), { row: 1, col: 0 }, "  CHAT ")).toBe(true);
    expect(acceptsDrop(t(false), { row: 1, col: 0 }, "chien")).toBe(true);
    expect(acceptsDrop(t(false), { row: 1, col: 0 }, "truite")).toBe(false);
    expect(acceptsDrop(t(false), { row: 1, col: 0 }, null)).toBe(false);
    expect(acceptsDrop(t(false), { row: 1, col: 1 }, null)).toBe(true);
  });
  it("acceptsDrop : case d'en-tête d'une colonne à liste : refus", () => {
    expect(acceptsDrop(t(true), { row: 0, col: 0 }, "chat")).toBe(false);
    expect(acceptsDrop(t(true), { row: 0, col: 1 }, "chat")).toBe(true);
  });
  it("parseLabels : virgule, point-virgule, retour ; blancs, vides et doublons (sans casse) retirés ; 64 au plus", () => {
    expect(parseLabels(" chat, chien ;Chat\n\n poisson ")).toEqual(["chat", "chien", "poisson"]);
    expect(parseLabels(Array.from({ length: 70 }, (_, i) => `e${i}`).join(","))).toHaveLength(64);
  });
});
```

`tools/cell-drop.test.ts` (banc `setup()` du fichier : Sélection branchée sur `createCellDrop`, tableau 3 × 3 en (0, 0),
image 400 × 300 en (1000, 1000)) :

```ts
describe("glisser vers une case — S14 tableau de tri (DS5)", () => {
  /** Colonne 1 acceptant « chat, chien » ; `text` pose une étiquette de 200 × 45 en (x, y). */
  const sorting = () => {
    const s = setup();
    const t = s.t();
    const c1 = { row: t.rows[0]?.id ?? "", col: t.cols[1]?.id ?? "" };
    s.doc.apply({ type: "SetTableLook", id: s.table, from: c1, to: c1, look: { key: "accept", value: ["chat", "chien"] } });
    const text = (content: string, x: number, y: number): string =>
      s.doc.apply({ type: "SetText", page: s.page, id: null, x, y, content, color: "#000000", size: 36, boxWidth: 200, boxHeight: 45 }).ids[0] ?? "";
    return { ...s, text };
  };
  it("S14 : « chat » lâché sur (1, 1) : PlaceInCell, logé ; « Chat » (casse) sur (2, 1) aussi", () => {
    const s = sorting();
    const a = s.text("chat", 1500, 200);
    s.move([1520, 220], [360, 96]);
    expect(s.runs.at(-1)?.type).toBe("PlaceInCell");
    expect(s.doc.element(a)?.cell?.[2]).toBe(s.t().cols[1]?.id);
    s.text("Chat", 1500, 400);
    s.move([1520, 420], [360, 160]);
    expect(s.runs.at(-1)?.type).toBe("PlaceInCell");
  });
  it("S14 : truite refusée : aucune commande, aucune étape, l'objet reste à sa place ; aucun cadre de case visée", () => {
    const s = sorting();
    const a = s.text("truite", 1500, 200);
    const before = s.doc.bounds([a]);
    const v = s.doc.version();
    const n = s.runs.length;
    s.tool.begin(1, [at(1520, 220)]);
    s.tool.extend(1, [at(360, 96)], []);
    expect(s.tool.live().overlay?.target ?? null).toBeNull();
    s.tool.close(1, "end");
    expect(s.runs.length).toBe(n);
    expect(s.doc.version()).toBe(v);
    expect(s.doc.bounds([a])).toEqual(before);
  });
  it("S14 : une image (pas un texte) lâchée sur la colonne à liste : refusée, aucune commande", () => {
    const s = sorting();
    const n = s.runs.length;
    s.move([1200, 1150], [360, 96]);
    expect(s.runs.length).toBe(n);
  });
  it("S14 : colonne sans liste : l'image loge comme avant", () => {
    const s = sorting();
    s.move([1200, 1150], [600, 96]);
    expect(s.runs.at(-1)?.type).toBe("PlaceInCell");
  });
  it("S14 : Alt tenue : « truite » refusée quand même (aucune commande) ; « chat » se déplace librement (Transform)", () => {
    const s = sorting();
    s.text("truite", 1500, 200);
    s.setAlt(true);
    const n = s.runs.length;
    s.move([1520, 220], [360, 96]);
    expect(s.runs.length).toBe(n);
    s.text("chat", 1500, 400);
    s.move([1520, 420], [360, 96]);
    expect(s.runs.at(-1)?.type).toBe("Transform");
  });
  it("S14 : Alt+Entrée (place) : « truite » au-dessus de (1, 1) : null ; « chat » : PlaceInCell", () => {
    const s = sorting();
    const bad = s.text("truite", 260, 74);
    expect(s.drop.place([bad], false)).toBeNull();
    const good = s.text("chat", 260, 74);
    expect(s.drop.place([good], false)?.type).toBe("PlaceInCell");
  });
});
```

(Boîte de 200 × 45 : la case (1, 1) n'a pas à grandir (216 ≤ 240, 61 ≤ 64), la case (2, 1) reste centrée en (360, 160).
Si le faux cœur borne la boîte d'un texte autrement, lire `s.doc.bounds([a])` et viser son centre.)

`ui/TableOptions.test.tsx` :

```tsx
  it("S14, DS10 : Tableau de tri : le champ montre la liste ; Entrée écrit look accept (libellés nettoyés)", () => {
    const { container, host } = mount("tableAccept", cell({ accept: ["chat"] }));
    const input = container.querySelector<HTMLInputElement>('[data-table-option="accept"]')!;
    expect(input.value).toBe("chat");
    fireEvent.input(input, { target: { value: "chat, chien ; Chat" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(host.look).toHaveBeenLastCalledWith({ key: "accept", value: ["chat", "chien"] });
  });
```

`tool-options.test.ts` : l'attente de la liste des sections du tableau gagne `"tableAccept"` en dernier.

- [ ] **2. Rouge** — commande bornée.

- [ ] **3. `table-geom.ts`** :

```ts
const label = (s: string): string => s.trim().toLocaleLowerCase("fr");

/** D21, DS5 : la case `cell` accepte-t-elle l'étiquette `text` (null : pas un seul texte) ? Colonne sans liste : tout ;
 *  case d'en-tête d'une colonne à liste : rien ; sinon le libellé, sans casse ni blancs de bord, doit être dans la liste. */
export function acceptsDrop(t: TableData, cell: Cell, text: string | null): boolean {
  const list = t.cols[cell.col]?.accept;
  if (list === undefined || list.length === 0) return true;
  if (t.header === true && cell.row === 0) return false;
  return text !== null && list.some((x) => label(x) === label(text));
}

/** Champ « Accepte » (DS5) : libellés séparés par virgule, point-virgule ou retour ; nettoyés, sans doublon, 64 au plus. */
export function parseLabels(s: string): string[] {
  const out: string[] = [];
  for (const raw of s.split(/[,;\n]/)) {
    const x = raw.trim();
    if (x !== "" && !out.some((o) => label(o) === label(x)) && out.length < 64) out.push(x);
  }
  return out;
}
```

`TableCellState` + `readonly accept?: readonly string[];` ; `tools/table.ts`, `cellState` :
`...(t.cols[at.cell.col]?.accept === undefined ? {} : { accept: t.cols[at.cell.col]!.accept! })`.

- [ ] **4. `cell-drop.ts`** — en-tête du module : ajouter « colonne à liste `accept` (DS5) : seule une étiquette admise y
  loge ; sinon `"refused"`, et la Sélection n'écrit rien ». Puis :

```ts
/** DS5 : relâché refusé par la règle d'étiquettes ; la Sélection n'écrit rien. */
export const REFUSED = "refused";

export interface CellDrop {
  expand(ids: readonly string[], views: readonly GroupedView[]): string[];
  target(selection: readonly string[], x: number, y: number): Bounds | null;
  drop(selection: readonly string[], matrix: Matrix, x: number, y: number, alt: boolean): Command | null | typeof REFUSED;
  place(selection: readonly string[], out: boolean): Command | null;
}
```

dans `createCellDrop` :

```ts
  /** Étiquette de la sélection : le contenu d'un seul texte, sinon null (DS5, H11). */
  const labelOf = (selection: readonly string[]): string | null => {
    const v = views(selection);
    return v.length === 1 && v[0]?.kind === "text" ? v[0].text.content : null;
  };
  const admits = (selection: readonly string[], hit: TableHit): boolean => acceptsDrop(hit.table, hit.cell, labelOf(selection));
```

`target` : `return hit === null || !admits(selection, hit) ? null : transformBounds(…)` ; `drop` :
début de `drop` remplacé par (la règle avant Alt, DS5) :

```ts
    drop(selection, matrix, x, y, alt) {
      if (selection.length === 0) return null;
      const hit = aimed(selection, x, y);
      // DS5 : la règle d'étiquettes ne se contourne pas par Alt ; une étiquette admise avec Alt se déplace librement.
      if (hit !== null && !admits(selection, hit)) return REFUSED;
      if (alt) return null;
      if (hit !== null) return placeInto(selection, hit);
```

(la suite de `drop`, sortie d'un objet lié, inchangée) ; `place` (logement) :
`return hit === null || !admits(selection, hit) ? null : placeInto(selection, hit);` (importer `acceptsDrop`).

- [ ] **5. `select.ts`** — au relâché du déplacement :

```ts
      const placed = d.mode === "move" ? (cellDrop?.drop(selection, m, d.x, d.y, ctx.alt?.() === true) ?? null) : null;
      // DS5 : étiquette refusée : aucune commande, l'objet reste à sa place (aperçu annulé), aucune étape.
      if (placed === "refused") return;
      ctx.run(placed ?? { type: "Transform", ids: [...selection], matrix: m });
```

- [ ] **6. Panneau** — `ui/tool-options.ts` : `OptionKey` + `| "tableAccept"`, `OPTION_ORDER` et `TABLE_SECTIONS` le
  gagnent après `tableRows`. `ui/OptionsPanel.tsx` : `LABEL.tableAccept = "Tableau de tri"`, `bodies.tableAccept = tableBody("tableAccept")`.
  `ui/TableOptions.tsx` : `TableSectionKey` + `| "tableAccept"` (importer `parseLabels`) et :

```tsx
    tableAccept: () => {
      const write = (v: string): void => {
        const next = parseLabels(v);
        const now = props.cell()?.accept ?? [];
        if (next.length !== now.length || next.some((x, i) => x !== now[i])) props.host.look({ key: "accept", value: next });
      };
      return (
        <label class="rb-opt-stack">
          <span>Accepte (séparés par des virgules)</span>
          <input
            type="text"
            data-table-option="accept"
            value={(props.cell()?.accept ?? []).join(", ")}
            onKeyDown={(e) => { if (e.key === "Enter") write(e.currentTarget.value); }}
            onChange={(e) => write(e.currentTarget.value)}
          />
        </label>
      );
    },
```

(Le moteur ignore les touches d'un champ de saisie, `inEditable` ; aucune touche du Tableau ne part pendant la frappe.)

- [ ] **7. Vert** — commande bornée ; `cell-drop.test.ts`, `select.test.ts`, `OptionsPanel.test.tsx` entiers verts.

- [ ] **8. Commit** — fichiers de la ligne T13 ; message `feat(web): sorting table: a column accepts only listed text labels, a refused label returns to its place with no undo step`.

---

### Tâche T14 — Essai navigateur et captures du lot C, suite complète

<a id="tache-t14"></a>

**Objectif** (S12, S13, S14) : l'essai de T10 joue les scénarios du lot C au doigt et au clavier, lectures d'abord, puis
6 captures 2x ; suite complète verte.

**Fichiers** : ligne T14.

**Interfaces**
- Consomme : `#stage[data-table-opens|data-table-column|data-table-linked|data-version|data-bounds]`, panneau
  `[data-option="tableRows"] [data-table-option="sort-desc"]`, `[data-option="tableAccept"] [data-table-option="accept"]`
  (section à ouvrir par son en-tête `[data-option-head="tableAccept"]` si elle est repliée), outil Texte (`item("text")`).
- Réutilise : `scripts/essais/personnalisation-3-suite-navigateur.mjs` (T10 : `newTable`, `typeIn`, `touchDrag`,
  `capture`) (étendre).

**Test et commande bornée** :
- `cd $WT && pnpm --filter @roomboard/web build 2>&1 | tail -3 && node scripts/essais/personnalisation-3-suite-navigateur.mjs 2>&1 | tail -40` :
  `ok — S7` … `ok — S11` toujours, puis `ok — S12`, `ok — S13`, `ok — S14`, `personnalisation-3 suite : OK`.
- Captures : `… --captures 2>&1 | grep -c "capture :"` → 14.
- Suite complète : `cd $WT && node ~/.claude/scripts/vm/suite-vm.cjs -- scripts/verifier.sh --e2e 2>&1 | tail -20` :
  `verifier.sh : e2e OK`, `CLI : OK`, `module Wasm : N octets` (N ≤ 1 532 864).

**Preuve visuelle** : lectures d'abord (`data-table-opens` 1 puis 0, `data-table-column` triée, `data-table-linked` 1,
`data-version` inchangé au refus), puis `cache-ferme`, `cache-ouvert`, `tri-avant`, `tri-apres`, `tableau-tri-avant`,
`tableau-tri-apres`, décrites au rapport (liseré net, texte lisible, étiquette en place).

**Contraintes (recopiées)** : G2 `cd $WT &&` · G3 suite complète par `suite-vm.cjs`, preuves bornées · G4 la suite mesure
le module · G8 vrai toucher (CDP), jamais le glisser HTML5 · G10 essais existants verts · G13 interdits · G14 commits · G15 rapport.

**Interdits** : aucun délai fixe pour attendre un état ; aucune capture sans `--captures`.

**Terminé quand** : essai `OK` (14 captures avec `--captures`), suite complète verte, un commit.

#### Étapes

- [ ] **1. Blocs** — dans `scenario`, à la place du commentaire « Lot C (T14) : S12, S13, S14 ici. » :

```js
  const RX2 = 1500;
  const tap = async (p) => {
    const box = await stageBox(page);
    const pt = { x: box.x + p[0], y: box.y + p[1], id: 1, radiusX: 4, radiusY: 4, force: 0.5 };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await fr();
  };

  // S12 (D19, DS3) : 2 × 2, « secret » en (0, 0), Ombrer ; Sélection : toucher ouvre, toucher referme ; Alt+O ; Désombrer.
  const c12 = await newTable(RX, 260, 2, 2);
  await typeIn(c12(0, 0), "secret");
  await page.click('[data-table-action="table-shade"]');
  await fr();
  await capture("cache-ferme");
  await page.click(item("select"));
  await fr();
  await tap(c12(0, 0));
  check((await attr("data-table-opens")) === "1", "S12 : toucher le cache l'ouvre (data-table-opens=1)");
  await capture("cache-ouvert");
  await tap(c12(0, 0));
  check((await attr("data-table-opens")) === "0", "S12 : toucher encore le referme (data-table-opens=0)");
  await page.click(item("table"));
  await fr();
  await mouse.click(...c12(0, 0));
  await page.keyboard.press("Escape");
  await page.keyboard.press("Alt+KeyO");
  await fr();
  check((await attr("data-table-opens")) === "1", "S12 : Alt+O en outil Tableau l'ouvre");
  await page.click('[data-table-action="table-unshade"]');
  await fr();
  check((await attr("data-table-opens")) === "0", "S12 : Désombrer retire le cache");

  // S13 (D20, DS9) : 2 × 4 à en-tête, colonne 0 : Nombre, 10, 9, 100 ; Alt+T ; Ctrl+Z ; « Trier décroissant ».
  const c13 = await newTable(RX, 520, 2, 4);
  await typeIn(c13(0, 0), "Nombre");
  await typeIn(c13(1, 0), "10");
  await typeIn(c13(2, 0), "9");
  await typeIn(c13(3, 0), "100");
  await page.keyboard.press("Alt+KeyE");
  await mouse.click(...c13(1, 0));
  await page.keyboard.press("Escape");
  await fr();
  await capture("tri-avant");
  await page.keyboard.press("Alt+KeyT");
  await fr();
  check((await attr("data-table-column")) === "Nombre|9|10|100", `S13 : Alt+T : Nombre|9|10|100 (lu ${await attr("data-table-column")})`);
  await capture("tri-apres");
  await page.keyboard.press("Control+z");
  await fr();
  check((await attr("data-table-column")) === "Nombre|10|9|100", "S13 : Ctrl+Z, une étape");
  await page.click('[data-option="tableRows"] [data-table-option="sort-desc"]');
  await fr();
  check((await attr("data-table-column")) === "Nombre|100|10|9", "S13 : « Trier décroissant » du panneau : Nombre|100|10|9");

  // S14 (D21, DS5) : 2 × 3 à en-tête « Mammifères », colonne 0 acceptant « chat, chien » ; « chat » loge, « truite » revient.
  const c14 = await newTable(RX2 - 760, 0, 2, 3);
  await typeIn(c14(0, 0), "Mammifères");
  await page.keyboard.press("Alt+KeyE");
  await mouse.click(...c14(1, 0));
  await page.keyboard.press("Escape");
  if ((await page.getAttribute('[data-option-head="tableAccept"]', "aria-expanded")) !== "true") await page.click('[data-option-head="tableAccept"]');
  await page.fill('[data-option="tableAccept"] [data-table-option="accept"]', "chat, chien");
  await page.press('[data-option="tableAccept"] [data-table-option="accept"]', "Enter");
  await fr();
  const label = async (text, wx, wy) => {
    await page.click(item("text"));
    await fr();
    await mouse.click(...screen(c, wx, wy));
    await page.keyboard.type(text);
    await page.keyboard.press("Escape");
    await fr();
  };
  const free = [origin[0] + RX2 - 760, origin[1] + 260];
  await label("chat", free[0], free[1]);
  await label("truite", free[0], free[1] + 100);
  await page.click(item("select"));
  await fr();
  await capture("tableau-tri-avant");
  const chat = screen(c, free[0] + 20, free[1] + 20);
  await touchDrag(chat, c14(1, 0));
  await page.click(item("table"));
  await mouse.click(...c14(1, 0));
  await page.keyboard.press("Escape");
  await fr();
  check((await attr("data-table-linked")) === "1", "S14 : « chat » loge dans la colonne (data-table-linked=1)");
  await page.click(item("select"));
  await fr();
  const truite = screen(c, free[0] + 20, free[1] + 120);
  await mouse.click(...truite);
  await fr();
  const before = await attr("data-bounds");
  const v0 = await attr("data-version");
  await touchDrag(truite, c14(2, 0));
  check((await attr("data-version")) === v0 && (await attr("data-bounds")) === before, "S14 : « truite » refusée : revenue à sa place, aucune étape");
  await capture("tableau-tri-apres");
```

(À ajuster sur place sans changer les oracles : les positions libres des étiquettes si l'outil Texte ouvre une boîte
ailleurs ; `RX`, `RX2` si un tableau sort de la page (lire son origine sur `data-bounds`) ; le point de saisie d'une
étiquette, dont la boîte commence au point cliqué.)

- [ ] **2. Rouge puis vert** — commande bornée de l'essai jusqu'à `personnalisation-3 suite : OK`.

- [ ] **3. Captures** — `--captures` : 14 lignes `capture :` ; décrire les 6 neuves au rapport.

- [ ] **4. Suite complète** — commande de la section ; `module Wasm` et `module formats` au rapport.

- [ ] **5. Commit** — essai et 6 captures ; message `test(e2e): personnalisation-3 suite browser trial for lot C (S12 to S14), captures`.
  **Fin du lot C** : l'orchestrateur peut ouvrir la PR du lot C.

---

## Couverture du cadrage (relecture du planificateur)

| entrée du cadrage | tâche |
|---|---|
| DS12, S10-mineurs (bouton enfoncé, zone d'en-tête, `scaleOf`, quatre tests, titre) | T1 (T10 : essai S10) |
| DS1, DS2 (une commande de réglage, Wasm mesuré, arrêt à 40 Ko) | T2, T3 ; T4 (seconde commande) |
| DS3, S12 (cache ouvert, Ombrer et Désombrer retirent `open`, refus de logement gardé) | T2, T3 (cœur), T11 (gestes, dessin), T14 |
| DS4, S9 (bordures, chemin d'aujourd'hui gardé, Alt+B, panneau) | T2, T3, T7, T9, T10 |
| DS5, S14 (`accept`, règle dans la page, refus sans étape, champ) | T2, T3, T13, T14 |
| DS6, S8 (un seul calcul, pot, saisie, Alt+Maj+C / M) | T6, T9, T10 |
| DS7, S7 (double appui, bordure intérieure, Alt+A, bouton) | T5, T9, T10 |
| DS8, D18, S11 (poignées hors du tableau, refus de zone coupée, Ctrl+Maj+flèches) | T4, T8, T10 |
| DS9, D20, S13 (tri `fr` numérique, vides en dernier, en-tête, refus) | T12, T14 |
| DS10 (accordéon, cinq sections, `showsPanel(table)`) | T9, T13 ; essais repliés au besoin : T10 |
| DS11, G9 (raccourcis, `SHORTCUTS`, test « touches disjointes ») | T5, T6, T7, T8, T11, T12 |
| DS13, S16 (CLI : `COMMAND_TYPES`, `ops.test.ts`, note `FORMAT_LOTS`, `cli-essai`) | T3, T4 |
| DS14 (oracles `data-table-*`, essai neuf dans `verifier.sh --e2e`) | T6, T7, T8, T11 (attributs), T10, T14 (essai) |
| DS15 (découpage, frontière des lots) | table des tâches |
| DS16 (empreinte S6 témoin) | T6 |
| S17, G5 (`look_reload_keeps_bytes`, `old_reader_ignores_look_keys`, `reorder_reload_keeps_bytes`) | T2, T4 |
| Effets de bord : F10 → `SetTableLook` | T11 (`select.test.ts` « F10 ») |
| Effets de bord : Ombrer / Désombrer retirent `open` | T2 (`look_open_only_on_shaded_and_shade_clears_it`), T3 (contrat « open ») |
| Effets de bord : panneau avec l'outil Tableau | T9 (`tool-options.test.ts` « showsPanel(table) ») |
| Effets de bord : Ctrl+Maj+↑ en outil Tableau | T8 (`engine.test.ts` « S11 : Ctrl+Maj+↑ ») |
| Effets de bord : `offsetAt` sans `align` inchangé, `paintText` par `lineShift` | T6 (`text-layout.test.ts`, `canvas2d.test.ts`) |
| Effets de bord : tableau sans bordure réglée, mêmes appels | T7 (« S9 : aucune bordure réglée ») |
| Tests à garder verts (c10a, c10b, c13, essai du lot A, `table.rs`, `table.test.ts`, `paste.test.ts`, banc S6) | T10, T14 (suite complète), T2 (`cargo test table`), T6 (banc) |
| Point 15 (collage tabulé) | hors de ce plan (traité à part) |
