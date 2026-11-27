# Plan — personnalisation-1a (OG4) : mode de page, barre latérale, navigation dans la barre principale

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**Spec** : `docs/plans/personnalisation-1a-cadrage.md` (cité « cadrage »). **Base** : `origin/main` @ 45484db.
**Objectif** : mode Page (paysage, portrait) ou Infini par page, barre latérale repliable (onglet Pages ; Calques au
lot 2), Précédente / numéro / Suivante dans la barre principale, ancre et repli par défaut des îlots dans le profil,
quatre commandes neuves annulables en une étape et pilotables par la CLI.
**Architecture** : cœur Rust (champ `mode`, `height`) → pont Wasm et `core/api.ts` → faux cœur → moteur (`pageFrame`
unique, DA4) → rendus, miniatures, export → interface (`SideBar.tsx` = barre de rôle `pages`, DA5) → essais.
**Pile** : Rust (yrs 0.28.1), wasm-bindgen, TypeScript, Solid, Vitest, Playwright (essais `scripts/essais`).

## Table des tâches

| id | titre | dépend | vague | lot | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|--------|-------|-----|------------------|----------|----------|--------|----------|---------|
| T1 | Cœur : mode de page et commandes de page | — | 1 | 1 | crates/roomboard-core/src/element.rs, crates/roomboard-core/src/document.rs, crates/roomboard-core/src/commands.rs (chaud), crates/roomboard-core/src/copy.rs, crates/roomboard-core/tests/compat_socle.rs, crates/roomboard-core/tests/scenarios.rs, crates/roomboard-core/tests/pot.rs | isolé | concepteur-critique | `cargo test -p roomboard-core page_mode` ≥ 6 tests ; `move_page` ≥ 4 ; `duplicate_page` ≥ 3 ; suite du crate verte | S1, S2 | #tache-t1 |
| T2 | Profil : ancre, page neuve, actions, profils fournis, reprise d'un profil ancien | — | 1 | 1 | apps/web/src/toolbar.ts (chaud : actions), apps/web/src/toolbar.test.ts, apps/web/src/toolbar-profiles.ts (chaud), apps/web/src/toolbar-profiles.test.ts, apps/web/src/profile-edit.ts, apps/web/src/profile-edit.test.ts, apps/web/src/device-settings.ts, apps/web/src/device-settings.test.ts, apps/web/src/fixtures/profil-45484db.rbprofile (neuf) | isolé | concepteur-critique | vitest `toolbar.test.ts` ≥ 1 test `profil ancien` ; `toolbar-profiles.test.ts`, `profile-edit.test.ts`, `device-settings.test.ts` verts | S2, S3 | #tache-t2 |
| T3 | Moteur pur : cadre de page, ajustement, raccourcis de page, îlots latéraux hors du haut | — | 1 | 1 | apps/web/src/engine/page.ts, apps/web/src/engine/page.test.ts, apps/web/src/engine/camera.ts, apps/web/src/engine/camera.test.ts, apps/web/src/engine/input/keys.ts, apps/web/src/engine/input/keys.test.ts, apps/web/src/app/board-session.ts | isolé | implementeur-tdd | vitest `page.test.ts` ≥ 1 `pageFrame` ; `camera.test.ts` ≥ 1 `îlot latéral` ; `keys.test.ts` ≥ 1 `pageKey` | S1, S3, S5 | #tache-t3 |
| T4 | Pont Wasm, API TypeScript, faux cœur, `COMMAND_TYPES` | T1 | 2 | 1 | crates/roomboard-wasm/src/lib.rs, apps/web/src/core/api.ts (chaud), apps/web/src/core/wasm-core.ts, apps/web/src/core/fake-core.ts (chaud), apps/web/src/core/fake-core.test.ts, apps/cli/src/ops.ts (chaud) | isolé | concepteur-critique | `cargo test -p roomboard-wasm` vert ; vitest `fake-core.test.ts` ≥ 1 `SetPageMode` ; `pnpm --filter @roomboard/web exec tsc --noEmit` code 0 ; taille Wasm principal ≤ 1 572 864 o | S1, S2 | #tache-t4 |
| T5 | Îlots mobiles à ancre de profil, voie latérale, éditeur de profils | T2 | 2 | 1 | apps/web/src/ui/island-place.ts, apps/web/src/ui/island-place.test.ts, apps/web/src/ui/Island.tsx, apps/web/src/ui/Island.test.tsx, apps/web/src/ui/ProfileEditor.tsx, apps/web/src/ui/ProfileEditor.test.tsx | isolé | implementeur-tdd | vitest `island-place.test.ts` ≥ 1 `side-start` ; `ProfileEditor.test.tsx` ≥ 1 `Barre latérale` | S2 | #tache-t5 |
| T6 | Barre principale : icônes Lucide, compteur `page-number`, état des actions de page | — | 2 | 1 | apps/web/src/ui/icons.ts (chaud), apps/web/src/ui/icons.test.ts, THIRD_PARTY_NOTICES.md, apps/web/src/ui/item-state.ts, apps/web/src/ui/item-state.test.ts, apps/web/src/ui/Toolbar.tsx, apps/web/src/ui/Toolbar.test.tsx, apps/web/src/ui/PagesBar.tsx, apps/web/src/app/stage-tags.test.ts | isolé | implementeur-tdd | vitest `item-state.test.ts` ≥ 1 `Nouvelle page` ; `Toolbar.test.tsx` ≥ 1 `page-number` ; `bash scripts/tests/controle-icones.test.sh` et `controle-licences.test.sh` code 0 | S3 | #tache-t6 |
| T7 | Grille bornée au cadre (cœur) et CLI des commandes de page | T1, T4 | 3 | 1 | crates/roomboard-core/src/grid.rs, crates/roomboard-core/src/document.rs, apps/cli/src/formats.ts, apps/cli/src/ops.test.ts, apps/cli/src/session.test.ts, apps/cli/src/main.ts, scripts/essais/cli-essai.mjs | isolé | concepteur-critique | `cargo test -p roomboard-core grid_clip` ≥ 3 ; vitest CLI `ops.test.ts` ≥ 1 `SetPageMode` ; `node scripts/essais/cli-essai.mjs` affiche `CLI : OK` | S1, S2 | #tache-t7 |
| T8 | Moteur branché : page neuve du profil, Suivante qui ajoute, déplacer, dupliquer, mode, raccourcis | T3, T4, T6 | 3 | 1 | apps/web/src/engine/engine.ts, apps/web/src/engine/engine.test.ts, apps/web/src/app/toolbar-host.ts, apps/web/src/app/toolbar-host.test.ts, apps/web/src/main.ts, apps/web/src/app/workspace.ts, apps/web/src/app/workspace.test.ts, apps/web/src/app/stage-tags.ts, apps/web/src/app/stage-tags.test.ts, apps/web/src/app/annotation-page.ts, apps/web/src/app/annotation-page.test.ts, apps/web/src/app/board-session.ts | isolé | implementeur-tdd | vitest `engine.test.ts` ≥ 1 `nextOrAdd` ; `stage-tags.test.ts` ≥ 1 `data-page-mode` ; `annotation-page.test.ts` vert | S1, S3, S5 | #tache-t8 |
| T9 | Rendu du cadre (deux rendus), grille sans borne en Infini, dépôt d'image, export PDF, miniatures | T3, T4 | 3 | 1 | apps/web/src/engine/render/canvas2d.ts, apps/web/src/engine/render/canvas2d.test.ts, apps/web/src/engine/render/webgl2.ts, apps/web/src/engine/render/webgl2.test.ts, apps/web/src/engine/render/grid-cache.ts, apps/web/src/engine/render/grid-cache.test.ts, apps/web/src/platform/image-import.ts, apps/web/src/platform/image-import.test.ts, apps/web/src/app/pdf-export.ts, apps/web/src/app/pdf-export.test.ts, apps/web/src/app/thumbnail.ts, apps/web/src/app/thumbnail.test.ts, apps/web/src/ui/page-thumbs.ts (neuf), apps/web/src/ui/page-thumbs.test.ts (neuf) | isolé | concepteur-critique | vitest `canvas2d.test.ts` et `webgl2.test.ts` ≥ 1 `infini` chacun ; `grid-cache.test.ts` ≥ 1 `négatives` ; `page-thumbs.test.ts` ≥ 2 | S1 | #tache-t9 |
| T10 | Barre latérale, onglet Pages, câblage, retrait de `PagesBar` | T4, T5, T6, T8, T9 | 4 | 1 | apps/web/src/ui/SideBar.tsx (neuf), apps/web/src/ui/SideBar.test.tsx (neuf), apps/web/src/ui/App.tsx (chaud), apps/web/src/ui/App.test.tsx, apps/web/src/ui/rb.css (chaud), apps/web/src/ui/rb-css.test.ts, apps/web/src/ui/PagesBar.tsx (retiré), apps/web/src/ui/PagesBar.test.tsx (retiré) | isolé | implementeur-tdd | vitest `SideBar.test.tsx` ≥ 8 tests ; `App.test.tsx` ≥ 1 `barre latérale` ; `rb-css.test.ts` vert ; `pnpm -r build` code 0 | S2, S3, S5 | #tache-t10 |
| T11 | Essais existants : sélecteurs adaptés (`clickItem`, `pageTo`) | — | 4 | 1 | scripts/essais/commun.mjs, scripts/essais/c13-tableaux-navigateur.mjs, scripts/essais/c13-fidelite.mjs, scripts/essais/c4-bibliotheque-navigateur.mjs, scripts/essais/s34-navigateur.mjs, scripts/essais/s5b-navigateur.mjs, scripts/essais/c11b-capture-navigateur.mjs, scripts/essais/design-l4-navigateur.mjs, scripts/essais/design-l2-navigateur.mjs | isolé | implementeur-tdd | chaque essai listé, joué seul sur la branche de T11 **et** sur celle de T10 fusionnée : sa ligne finale `OK` | S3 | #tache-t11 |
| T12 | Intégration lot 1 : essai neuf S1/S2/S3/S5, `verifier.sh --e2e`, captures 2x, netteté | T7, T10, T11 | 5 | 1 | scripts/essais/personnalisation-1a-navigateur.mjs (neuf), scripts/verifier.sh, docs/design/captures/personnalisation-1a/ (neuf) | isolé | implementeur-tdd | `verifier.sh --e2e` : `verifier.sh : e2e OK` puis `verifier.sh : OK` ; ligne `personnalisation-1a : OK` ; tailles Wasm sous plafond | S1, S2, S3, S5 | #tache-t12 |
| T13 | Lot 2 — `Restack` : cœur, pont, faux cœur, CLI (fusion après T12) | T4, T7 | 5 | 2 | crates/roomboard-core/src/commands.rs, crates/roomboard-core/src/copy.rs, crates/roomboard-wasm/src/lib.rs, apps/web/src/core/api.ts, apps/web/src/core/wasm-core.ts, apps/web/src/core/fake-core.ts, apps/web/src/core/fake-core.test.ts, apps/cli/src/ops.ts, apps/cli/src/ops.test.ts, scripts/essais/cli-essai.mjs | isolé | concepteur-critique | `cargo test -p roomboard-core restack` ≥ 5 ; vitest `fake-core.test.ts` ≥ 1 `Restack` ; `CLI : OK` | S4 | #tache-t13 |
| T14 | Lot 2 — onglet Calques, Premier plan / Arrière-plan, raccourcis d'ordre, essai S4 | T10, T12, T13 | 6 | 2 | apps/web/src/app/layer-list.ts (neuf), apps/web/src/app/layer-list.test.ts (neuf), apps/web/src/ui/SideBar.tsx, apps/web/src/ui/SideBar.test.tsx, apps/web/src/ui/SelectionRow.tsx, apps/web/src/ui/SelectionRow.test.tsx, apps/web/src/app/toolbar-host.ts, apps/web/src/engine/engine.ts, apps/web/src/engine/engine.test.ts, apps/web/src/engine/input/keys.ts, apps/web/src/engine/input/keys.test.ts, apps/web/src/main.ts, apps/web/src/ui/icons.ts, THIRD_PARTY_NOTICES.md, apps/web/src/ui/rb.css, scripts/essais/personnalisation-1a-navigateur.mjs, docs/design/captures/personnalisation-1a/ | isolé | implementeur-tdd | vitest `layer-list.test.ts` ≥ 4 ; `keys.test.ts` ≥ 1 `orderKey` ; `verifier.sh --e2e` : `personnalisation-1a : OK` avec la ligne `S4 — ok` | S4, S5 | #tache-t14 |

Vagues (3 sous-agents au plus) : **V1** T1, T2, T3 · **V2** T4, T5, T6 · **V3** T7, T8, T9 · **V4** T10, T11 ·
**V5** T12, T13 · **V6** T14. Le lot 1 est complet et fusionnable à la fin de T12. T13 tourne en V5 dans son propre
worktree, en parallèle de T12, mais sa branche n'est fusionnée qu'après T12 (le lot 1 doit pouvoir sortir seul). Si le
temps manque, T13 et T14 partent dans la PR suivante (cadrage, décision 22).

Fichiers chauds partagés, à fusionner dans l'ordre de la table : `commands.rs` (T1, T13), `api.ts` et `fake-core.ts`
(T4, T13), `ops.ts` (T4, T13), `cli-essai.mjs` (T7, T13), `App.tsx` (T10), `rb.css` (T10, T14), `toolbar-profiles.ts`
et `toolbar.ts` (T2), `icons.ts` et `THIRD_PARTY_NOTICES.md` (T6, T14), `engine.ts`, `toolbar-host.ts`, `main.ts`
(T8, T14), `SideBar.tsx` (T10, T14), `board-session.ts` (T3, T8), `document.rs` (T1, T7).

## Carte des fichiers

| fichier | rôle dans le chantier | tâche |
|---|---|---|
| `crates/roomboard-core/src/element.rs` | `PageView.mode`, `PageLayout`, `PORTRAIT_HEIGHT` | T1 |
| `crates/roomboard-core/src/document.rs` | `insert_page` avec mode, `blank_with`, `page()` ; grille bornée au cadre | T1, T7 |
| `crates/roomboard-core/src/commands.rs` | `AddPage.mode`, `SetPageMode`, `MovePage`, `DuplicatePage`, `BadIndex` ; lot 2 `Restack`, `MixedPages` | T1, T13 |
| `crates/roomboard-core/src/copy.rs` | `extract_page`, `reinsert_kept` | T1 (T13 réutilise) |
| `crates/roomboard-core/src/grid.rs` | `clip: Option<Bounds>` au lieu de `width` | T7 |
| `crates/roomboard-wasm/src/lib.rs` | méthodes neuves du pont | T4, T13 |
| `apps/web/src/core/api.ts`, `wasm-core.ts`, `fake-core.ts` | contrat TS, adaptateur, faux cœur | T4, T13 |
| `apps/web/src/engine/page.ts` | `pageFrame`, `pageLayoutOf`, rectangles visibles | T3 |
| `apps/web/src/engine/camera.ts` | `fitFrame`, `topBelowIslands` sans îlots latéraux | T3 |
| `apps/web/src/engine/input/keys.ts` | `pageKey` (T3), `orderKey` (T14), `inEditable` exporté | T3, T14 |
| `apps/web/src/engine/engine.ts` | `nextOrAdd`, `movePage`, `duplicatePage`, `setPageMode`, `addPage` au mode du profil | T8, T14 |
| `apps/web/src/engine/render/*` | cadre ou plan entier, grille sans borne en Infini | T9 |
| `apps/web/src/app/thumbnail.ts`, `ui/page-thumbs.ts` | miniature de page et son cache | T9 |
| `apps/web/src/toolbar.ts`, `toolbar-profiles.ts`, `profile-edit.ts`, `device-settings.ts` | profil, profils fournis, édition, réglage de l'appareil | T2 |
| `apps/web/src/ui/island-place.ts`, `Island.tsx`, `ProfileEditor.tsx` | ancre du profil, voie latérale, éditeur | T5 |
| `apps/web/src/ui/icons.ts`, `item-state.ts`, `Toolbar.tsx` | icônes, état, compteur | T6 |
| `apps/web/src/ui/SideBar.tsx`, `App.tsx`, `rb.css` | barre latérale et câblage | T10, T14 |
| `apps/cli/src/*`, `scripts/essais/cli-essai.mjs` | CLI (D15) | T4, T7, T13 |
| `scripts/essais/*` | essais adaptés, essai neuf | T11, T12, T14 |

## Global Constraints (recopiées dans chaque section concernée)

- GC1 : toute commande lourde sous `nice -n 10`, et `-j 4` pour cargo (`cargo test -p … -j 4`, `cargo build -j 4`).
  Avant toute commande cargo : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC2 : tactile d'abord : cibles ≥ 44 px, appui long (500 ms, `TIP_HOLD_MS`), glisser aux événements de pointeur
  (`startSortDrag`, `startPointerGesture`), **jamais** le glisser HTML5 (`draggable`, `dragstart`).
- GC3 : chaque geste a son raccourci (table 2 bis du cadrage), hors champ de saisie et hors composition IME.
- GC4 : icônes Lucide (ISC, commit `7981a0798a`) recopiées dans le dépôt, mention dans `THIRD_PARTY_NOTICES.md`
  (§ Icônes Lucide) ; trait 1,5, `viewBox="-0.25 -0.25 24 24"`.
- GC5 : aucune dépendance npm ni cargo neuve.
- GC6 : essais existants verts ; seuls les sélecteurs s'adaptent, jamais le fond d'un essai.
- GC7 : CLI mise à jour pour toute commande neuve (D15) : `COMMAND_TYPES`, ligne `.roomboard` de `FORMAT_LOTS`, tests
  de la CLI, `scripts/essais/cli-essai.mjs`.
- GC8 : modules Wasm sous plafond : principal ≤ 1 572 864 o, formats ≤ 3 145 728 o (référence 1 375 581 et 2 794 511).
- GC9 : commits d'auteur `jejeasterix <jejeasterix@users.noreply.github.com>`
  (`git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit …`), message anglais
  terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un, jamais
  `git add -A`, `git add .`, `git commit -a`.
- GC10 : ne toucher ni `~/projets/roomboard-wt/personnalisation-1b` ni `roomboard-prive`.
- GC11 : insertions groupées à côté des entrées de page (variantes après `RemovePage`, actions après
  `page-insert-file`, icônes après celles de page), jamais en fin de liste ; aucun reformatage ni réordonnancement de
  l'existant (conflits avec personnalisation-1b).
- GC12 : sélecteurs gardés : `data-item` des actions de page, `#pages`, `#stage[data-page]`,
  `.rb-pages-list [data-page="N"]`, `data-toolbar="pages"`, `data-dock="floating"`, `data-island="pages"`.

Commandes de preuve bornées (profil, forme courte) :
- Rust : `cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && nice -n 10 cargo test -p roomboard-core <filtre> -j 4 2>&1 | tail -5` ; motif : `test result: ok. N passed` avec N ≥ attendu ; échec : `test result: FAILED`, `error[`.
- Web : `cd <wt> && nice -n 10 pnpm --filter @roomboard/web exec vitest run <fichier> 2>&1 | tail -8` ; motif : `Tests  N passed`, nom du test cherché dans `--reporter=verbose` si demandé ; échec : `FAIL `.
- CLI : `cd <wt> && nice -n 10 pnpm --filter @roomboard/cli exec vitest run <fichier> 2>&1 | tail -8`.
- Types : `cd <wt> && nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -5` (code 0, aucune ligne `error TS`).
- Complète : `cd <wt> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && node ~/.claude/scripts/vm/suite-vm.cjs -- nice -n 10 bash scripts/verifier.sh --e2e 2>&1 | tail -30`.

Tout rapport de tâche porte une ligne par entrée « Réutilise : » de sa section :
`Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

---

### Tâche T1 — Cœur : mode de page et commandes de page
<a id="tache-t1"></a>

**Objectif** : la page porte un `mode` facultatif et une `height` lue ; quatre comportements neufs du cœur, chacun une
étape d'annulation : `AddPage` avec mode, `SetPageMode`, `MovePage`, `DuplicatePage` (cadrage décisions 3, 4, 6, 7,
13, 14 ; DA1, DA2, DA3).

**Fichiers** : `crates/roomboard-core/src/element.rs`, `document.rs`, `commands.rs`, `copy.rs`,
`tests/compat_socle.rs`, `tests/scenarios.rs`, `tests/pot.rs`.

**Interfaces**
- Consomme : `Document::insert_pages`, `copy_elements`, `transact_local`, `done`, `page_index`, `find_page`,
  `pages_ref`, `page_count` (existants).
- Produit (signatures exactes, lues par T4) :
  - `element.rs` : `pub const PORTRAIT_HEIGHT: f64 = 1920.0 * 16.0 / 9.0;` (3413,333…) ;
    `#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub enum PageLayout { Landscape, Portrait, Infinite }` avec
    `pub fn parse(s: &str) -> Option<PageLayout>` (`"landscape"`, `"portrait"`, `"infinite"`) et
    `pub fn as_str(self) -> &'static str` ;
    `PageView` gagne `pub mode: String` (`"page"` ou `"infinite"` ; absent ou inconnu → `"page"`), sérialisé comme
    les autres champs (même derive que `PageView`).
  - `commands.rs`, variantes **insérées juste après `RemovePage`** (GC11) :
    `AddPage { after: Option<String>, mode: Option<PageLayout> }`,
    `SetPageMode { page: String, mode: PageLayout }`, `MovePage { page: String, to: u32 }`,
    `DuplicatePage { page: String }` ; `CommandError::BadIndex` (après `BadModel3d`, message
    `"rang de page hors bornes"`) ; `impl Command { pub fn add_page(after: Option<String>) -> Command }` (mode `None`).
  - `document.rs` : `pub(crate) fn insert_page(pages: &ArrayRef, txn: &mut TransactionMut, index: u32, layout: Option<PageLayout>) -> String` ;
    `pub fn blank_with(layout: Option<PageLayout>) -> Self` ; `blank()` = `blank_with(None)`.
  - `copy.rs` : `pub fn extract_page(&self, page: &str) -> Result<Document, CommandError>` ;
    `pub(crate) fn reinsert_kept(arr: &ArrayRef, txn: &mut TransactionMut, moves: Vec<(u32, MapPrelim)>, to: u32)`.
- Réutilise : `crates/roomboard-core/src/copy.rs:225` — `Document::insert_pages(&mut self, src: &Document, after: &str) -> Result<Change, CommandError>`.
- Réutilise : `crates/roomboard-core/src/copy.rs:162` `extract` (étendu à côté) — `pub fn extract_page(&self, page: &str) -> Result<Document, CommandError>` (champs de page par `as_prelim` sauf `elements`, puis `copy_elements`).
- Réutilise : `crates/roomboard-core/src/copy.rs:61` `copy_elements` ; patron `commands.rs:1905` — `pub(crate) fn reinsert_kept(arr: &ArrayRef, txn: &mut TransactionMut, moves: Vec<(u32, MapPrelim)>, to: u32)` : prélims lus dans une lecture fermée avant l'écriture. **Écart assumé à la signature du cadrage** : `to` ajouté (sans lui, le rang final n'est pas dit).

**Patron à ne pas reprendre** : `copy_elements` (`copy.rs:61-91`) renumérote les ids ; `MovePage` doit **garder**
l'id de la page et de ses éléments (DA2 ; sinon la sélection, la caméra par page et le cache de contours
`document.rs:555-610` sont invalidés). Référence du « retirer puis réinsérer » : `commands.rs:1895-1925`
(`erase_pieces_take_the_cut_stroke_place`). Référence d'une commande sans effet sans étape (D38) : `copy.rs:200-210`.

**Code à écrire** (forme exacte ; ajuster seulement les noms d'aide privée réels lus dans le fichier) :

```rust
// document.rs
pub(crate) fn insert_page(pages: &ArrayRef, txn: &mut TransactionMut, index: u32, layout: Option<PageLayout>) -> String {
    let id = yrs::uuid_v4();
    let height = if layout == Some(PageLayout::Portrait) { PORTRAIT_HEIGHT } else { PAGE_HEIGHT };
    let mut fields = vec![
        ("id", In::from(id.clone())),
        ("width", In::from(PAGE_WIDTH)),
        ("height", In::from(height)),
        ("background", In::from(DEFAULT_BACKGROUND)),
        ("elements", In::Array(ArrayPrelim::from(Vec::<In>::new()))),
    ];
    if layout == Some(PageLayout::Infinite) {
        fields.push(("mode", In::from("infinite")));
    }
    pages.insert(txn, index, MapPrelim::from(fields));
    id.to_string()
}
// page() : mode lu sans jamais rendre la page illisible
mode: match out_string(m.get(&txn, "mode")).as_deref() { Some("infinite") => "infinite".into(), _ => "page".into() },
```

```rust
// commands.rs (aiguillage, après RemovePage)
Command::SetPageMode { page, mode } => self.cmd_set_page_mode(&page, mode),
Command::MovePage { page, to } => self.cmd_move_page(&page, to),
Command::DuplicatePage { page } => self.cmd_duplicate_page(&page),

fn cmd_set_page_mode(&mut self, page: &str, layout: PageLayout) -> Result<Change, CommandError> {
    let (infinite, height) = {
        let txn = self.doc.transact();
        let (_, m) = self.find_page(&txn, page).ok_or_else(|| CommandError::UnknownPage(page.to_string()))?;
        (out_string(m.get(&txn, "mode")).as_deref() == Some("infinite"), out_f64(m.get(&txn, "height")))
    };
    let target_h = match layout { PageLayout::Portrait => PORTRAIT_HEIGHT, _ => PAGE_HEIGHT };
    let same = match layout {
        PageLayout::Infinite => infinite,
        _ => !infinite && height == Some(target_h),
    };
    if same { return /* forme D38 de copy.rs:200-210 : aucun txn d'écriture, aucune étape */; }
    {
        let mut txn = self.transact_local();
        let (_, m) = self.find_page(&txn, page).expect("page lue plus haut");
        match layout {
            PageLayout::Infinite => { m.insert(&mut txn, "mode", "infinite"); } // height gardée (décision 6)
            _ => {
                if infinite { m.remove(&mut txn, "mode"); } // valeur inconnue : gardée (U3)
                m.insert(&mut txn, "height", target_h);
            }
        }
    }
    Ok(self.done(Change { pages: vec![page.to_string()], ..Default::default() }))
}

fn cmd_move_page(&mut self, page: &str, to: u32) -> Result<Change, CommandError> {
    let from = self.page_index(page).ok_or_else(|| CommandError::UnknownPage(page.to_string()))?;
    if to as usize >= self.page_count() { return Err(CommandError::BadIndex); }
    if to == from { return /* forme D38 */; }
    let prelim = { let txn = self.doc.transact(); let (_, m) = self.find_page(&txn, page).expect("lue"); m.as_prelim(&txn) };
    {
        let mut txn = self.transact_local();
        reinsert_kept(&self.pages_ref(), &mut txn, vec![(from, prelim)], to);
    }
    Ok(self.done(Change { pages: vec![page.to_string()], ..Default::default() }))
}

fn cmd_duplicate_page(&mut self, page: &str) -> Result<Change, CommandError> {
    let tmp = self.extract_page(page)?; // lecture seule, aucune étape
    self.insert_pages(&tmp, page)      // une étape ; Change.pages = [copie], Change.ids = éléments copiés
}
```

```rust
// copy.rs
/// Retire les entrées `moves` (index courants) puis réinsère leurs recopies, dans l'ordre donné, au rang final `to`
/// du tableau résultant. Même transaction : une étape. Les prélims gardent tous les champs, `id` compris (DA2).
pub(crate) fn reinsert_kept(arr: &ArrayRef, txn: &mut TransactionMut, moves: Vec<(u32, MapPrelim)>, to: u32) {
    let mut idx: Vec<u32> = moves.iter().map(|(i, _)| *i).collect();
    idx.sort_unstable_by(|a, b| b.cmp(a));
    for i in idx { arr.remove(txn, i); }
    for (k, (_, p)) in moves.into_iter().enumerate() { arr.insert(txn, to + k as u32, p); }
}
```

Les appels existants `Command::AddPage { after: X }` (tests de `commands.rs`, `copy.rs`, `tests/compat_socle.rs:78`,
`tests/scenarios.rs` 5 appels, `tests/pot.rs`) deviennent `Command::add_page(X)` ; l'aiguillage `AddPage { after, mode }`
appelle `cmd_add_page(after.as_deref(), mode)` qui passe `mode` à `insert_page`. Tous les autres appels de
`insert_page` passent `None`.

**Tests rouges d'abord** (`#[cfg(test)]` de `commands.rs` sauf mention) :
1. `page_mode_absent_reads_as_page` : `Document::blank()` → `page().mode == "page"`, `height == 1080.0`.
2. `page_mode_unknown_value_reads_as_page_and_is_kept` : écrire `mode = "frame"` à la main, `page().mode == "page"` ;
   `SetPageMode Portrait` → `height` 3413,33, la valeur brute `"frame"` est toujours là.
3. `page_mode_set_portrait_then_undo_is_one_step` : `height` 3413,33 puis `undo()` → 1080, `can_undo() == false`.
4. `page_mode_infinite_keeps_height` et `page_mode_same_value_has_no_step` (D38 : `can_undo()` reste faux).
5. `page_mode_add_page_with_mode` : `AddPage { after: None, mode: Some(Infinite) }` → nouvelle page `"infinite"` ; un
   `undo()` la retire.
6. `page_mode_blank_with_is_not_undoable` (même forme que `blank_page_is_not_undoable`).
7. `page_mode_reload_keeps_bytes` : page infinie, encodage puis relecture : octets égaux (U3, D25).
8. `move_page_keeps_ids_and_is_one_step` : pages a, b, c ; `MovePage { page: c, to: 0 }` → ids `[c, a, b]`, ids des
   éléments de c inchangés ; `undo()` → `[a, b, c]`.
9. `move_page_same_rank_has_no_step`, `move_page_out_of_range_is_bad_index`, `move_page_unknown_is_refused`.
10. `move_page_keeps_contour_cache` : un trait de c a son contour en cache avant ; après `MovePage`, la requête de
    contour rend la même valeur (cadrage : cache des contours non touché).
11. `duplicate_page_new_ids_after_source` (`copy.rs`) : page à deux traits et grille, mode infini → copie juste après,
    ids de page et d'éléments neufs, grille et mode gardés, un `undo()` la retire.
12. `duplicate_page_unknown_is_refused`, `duplicate_page_keeps_unknown_fields` (clé `zzz` sur la page).

**Commande bornée** : `cd /home/adminjd/projets/roomboard-wt/personnalisation-1a--T1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && nice -n 10 cargo test -p roomboard-core page_mode -j 4 2>&1 | tail -5`
(≥ 6 tests passés), puis `… move_page …` (≥ 4), `… duplicate_page …` (≥ 3), puis le crate entier
`nice -n 10 cargo test -p roomboard-core -j 4 2>&1 | grep -E "test result|error\[" | tail -8` (aucun `FAILED` ;
`reload_with_strokes_keeps_bytes`, `blank_page_is_not_undoable`, tests de `zone.rs`, `fill.rs`, `query.rs` verts), puis
`nice -n 10 cargo clippy -p roomboard-core -j 4 -- -D warnings 2>&1 | tail -3`.

**Contraintes** : GC1 (`nice -n 10`, `-j 4`, PATH cargo) ; GC5 aucune dépendance ; GC9 commits ; GC10 ;
GC11 variantes après `RemovePage`, `BadIndex` après la dernière variante d'erreur sans réordonner ; aucun champ
`Any::Map` (valeurs scalaires seulement, D25).

**Interdits** : toucher `crates/roomboard-wasm`, `apps/` (T4) ; changer `formatVersion` ou `schema` ; renuméroter
les ids dans `MovePage` ; écrire `mode = "page"` (absent = Page).

**Terminé** : tests 1-12 verts, crate vert, clippy propre, commit unique `feat(core): page mode, move and duplicate page commands`.

**Étapes** : (1) écrire les tests 1-7, les voir échouer (compilation) ; (2) `PageLayout`, `PORTRAIT_HEIGHT`,
`PageView.mode`, `insert_page`, `blank_with`, `Command::add_page`, remplacer les appels ; (3) `cmd_set_page_mode` ;
tests 1-7 verts ; (4) tests 8-10 rouges, `reinsert_kept`, `cmd_move_page`, verts ; (5) tests 11-12 rouges,
`extract_page`, `cmd_duplicate_page`, verts ; (6) crate entier, clippy, commit.

---

### Tâche T2 — Profil : ancre, page neuve, actions, profils fournis, reprise d'un profil ancien
<a id="tache-t2"></a>

**Objectif** : le profil porte `anchor` par barre et `behavior.pageMode` ; actions `page-number`, `page-duplicate` ;
profils fournis : groupe `pages` (`page-prev`, `page-number`, `page-next`) en fin de la barre `tools`, barre `pages`
latérale `collapsed: true` avec `page-duplicate` ; un profil ancien gagne la navigation à la lecture (décisions 7, 19,
20, 22, 25, 27, 34 ; H6, H11).

**Fichiers** : `apps/web/src/toolbar.ts`, `toolbar.test.ts`, `toolbar-profiles.ts`, `toolbar-profiles.test.ts`,
`profile-edit.ts`, `profile-edit.test.ts`, `device-settings.ts`, `device-settings.test.ts`,
`apps/web/src/fixtures/profil-45484db.rbprofile` (neuf : export du profil « Classique » de `main@45484db`, obtenu par
`git show 45484db:apps/web/src/toolbar-profiles.ts` puis sérialisation par le test, ou écrit à la main à l'identique).

**Interfaces**
- Produit :
  - `toolbar.ts` : `export type BarAnchor = "top-start" | "top-center" | "top-end" | "bottom-start" | "bottom-center" | "side-start" | "side-end";`
    `export const BAR_ANCHORS: readonly BarAnchor[]` (cet ordre) ; `Toolbar` gagne `readonly anchor?: BarAnchor` ;
    `Profile.behavior` gagne `readonly pageMode: PageLayout` où `export type PageLayout = "landscape" | "portrait" | "infinite"`
    est **déclaré ici** et réexporté tel quel par `core/api.ts` en T4 (même littéral) ;
    `BAR_KEYS` gagne `"anchor"`, `BEHAVIOR_KEYS` gagne `"pageMode"` ; ancre inconnue : avertissement, champ absent ;
    `pageMode` inconnu : avertissement, `"landscape"` (patron `startMode`, `toolbar.ts:447-450`) ;
    `ACTION_TABLE`, **après `page-insert-file`** : `"page-number": { label: "Numéro de page" }`,
    `"page-duplicate": { label: "Dupliquer la page" }`.
  - `toolbar.ts` : `export function withPageNav(p: Profile): Profile` appelée par `parseProfile` après lecture :
    si aucune barre n'a d'item `page-number` **et** aucune barre hors `role === "pages"` n'a `page-prev` ni
    `page-next`, ajoute en fin de la première barre `role === "tools"` le groupe
    `{ id: uniqueId("pages"), items: [page-prev, page-number, page-next] }` (ids d'items rendus uniques par la règle
    `uniqueId` de `profile-edit.ts`, déplacée ou importée sans copie) ; ne retire rien du fichier ; aucune écriture.
    Sans barre `tools` : profil rendu tel quel.
  - `toolbar.ts` : `export function sideActions(bar: Toolbar): readonly ToolItem[]` : items de la barre `pages` sans
    `page-prev`, `page-next`, `page-number` (vue de la rangée d'actions ; lus par T10).
  - `profile-edit.ts` (à côté de `setDock`) : `setAnchor(p: Profile, barId: string, a: BarAnchor | null): Profile`
    (null retire le champ), `setCollapsed(p: Profile, barId: string, c: boolean): Profile`,
    `setPageMode(p: Profile, m: PageLayout): Profile` ; `catalog(p, "pages")` sans `page-prev`, `page-next`,
    `page-number` ; `catalog(p, <tools>)` propose `page-number`.
  - `device-settings.ts` : `export const SIDEBAR_KEY = "roomboard.laterale";`
    `export interface SidebarState { readonly tab: "pages" | "calques"; readonly thumb: "s" | "m" | "l" }`,
    `DeviceSettings` gagne `sidebar(): SidebarState` (défaut `{ tab: "pages", thumb: "m" }`, valeur illisible → défaut)
    et `setSidebar(s: SidebarState): void`.
- Réutilise : `apps/web/src/toolbar.ts:367` `parseBar`, `:448` `parseBehavior` — champs `anchor?`, `behavior.pageMode`.
- Réutilise : `apps/web/src/profile-edit.ts:72-74` — `setAnchor(p, barId, a)`, `setCollapsed(p, barId, c)`, `setPageMode(p, m)`.
- Réutilise : `apps/web/src/device-settings.ts:8-13` (patron `FRAME_KEY`) — `sidebar(): { tab: "pages" | "calques"; thumb: "s" | "m" | "l" }`, `setSidebar(s)`.
- Réutilise : `apps/web/src/device-settings.ts:55-63` — `island()`, `setIsland()` inchangés.

**Patron à ne pas reprendre** : migrer en **écrivant** le profil à la lecture (`profile-store`) : la reprise reste en
mémoire jusqu'à « Enregistrer » (décision 19, H6). Ne pas réordonner les ids existants des barres fournies
(`toolbar-profiles.test.ts:38`, `:58` en dépendent). Référence de lecture tolérante : `toolbar.ts:367-386`, `:440-455`.

**Profils fournis** (`toolbar-profiles.ts`) : `pagesBar(full)` devient
`{ id: "pages", role: "pages", dock: "floating", collapsed: true, groups: [{ id: "pages", items: [page-add, page-duplicate, page-remove, ...(full ? [page-insert-file, export-pdf, export-iwb, export-ubz] : [])] }] }`
(plus de `page-prev`, `page-next`) ; dans chaque barre `tools` fournie, groupe
`{ id: "pages", items: [action("page-prev", "Page précédente"), action("page-number", "Numéro de page"), action("page-next", "Page suivante")] }`
**sur ses propres lignes, après le groupe `bureau`** (GC11) ; `behavior.pageMode: "landscape"`.

**Tests rouges d'abord** :
1. `toolbar.test.ts` « profil ancien de 45484db : navigation ajoutée à la barre d'outils, autres clés gardées » : lire
   la fixture → la première barre `tools` finit par un groupe `[page-prev, page-number, page-next]` ; `sideActions`
   de la barre `pages` sans prev/next ; `serializeProfile(parse(x))` garde toutes les clés de la fixture (comparaison
   clé à clé hors groupe ajouté) ; `withPageNav(withPageNav(p))` = `withPageNav(p)`.
2. `toolbar.test.ts` « anchor lu et réécrit ; ancre inconnue : avertissement, champ absent » ;
   « pageMode inconnu : avertissement, landscape ».
3. `toolbar-profiles.test.ts` : chaque profil fourni : barre `pages` `collapsed === true`, contient `page-duplicate` ;
   barre `tools` finit par le groupe `pages` ; `ACTION_TABLE` contient `page-number`, `page-duplicate`.
4. `profile-edit.test.ts` : `setAnchor`, `setCollapsed`, `setPageMode` ; `catalog(p, "pages")` sans prev/next/number
   (mettre à jour `:43`, `:85-92`).
5. `device-settings.test.ts` : `sidebar()` défaut, aller-retour, valeur illisible → défaut.

**Commande bornée** : `cd /home/adminjd/projets/roomboard-wt/personnalisation-1a--T2 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/toolbar.test.ts src/toolbar-profiles.test.ts src/profile-edit.test.ts src/device-settings.test.ts --reporter=verbose 2>&1 | grep -E "profil ancien|Tests |FAIL" | tail -8`
(ligne `profil ancien` présente, `Tests  N passed`, aucun `FAIL`). À garder verts : `toolbar.test.ts:178`, `:235-239`,
`:473`, `app/toolbar-host.test.ts`. Puis `tsc --noEmit` (forme bornée) code 0 ; si `ui/*.test.tsx` cassent sur le
catalogue, ne pas les corriger ici : les noter dans le rapport (T5, T10 les reprennent).

**Contraintes** : GC1 `nice -n 10` ; GC5 ; GC9 ; GC10 ; GC11 (actions après `page-insert-file`, groupe `pages` après
`bureau`) ; `PROFILE_MINOR` inchangé (H12).

**Interdits** : toucher `ui/`, `core/`, `engine/` ; écrire dans le stockage du profil à la lecture.

**Terminé** : tests 1-5 verts, `tsc` vert, rapport avec les lignes « Réutilisation : ».

**Étapes** : (1) fixture + test 1 rouge ; (2) types `BarAnchor`, `PageLayout`, lecture `anchor`/`pageMode`, tests 2 ;
(3) `withPageNav`, `sideActions`, test 1 vert ; (4) profils fournis, test 3 ; (5) `profile-edit`, test 4 ;
(6) `device-settings`, test 5 ; (7) commit `feat(profile): bar anchor, page mode default, page navigation group`.

---

### Tâche T3 — Moteur pur : cadre de page, ajustement, raccourcis de page, îlots latéraux hors du haut
<a id="tache-t3"></a>

**Objectif** : un seul calcul du cadre (DA4), l'ajustement selon le mode (décision 10), les raccourcis de page en
fonctions pures (DA9), et le haut de page ajustée qui ignore la barre latérale (OF83).

**Fichiers** : `apps/web/src/engine/page.ts`, `page.test.ts`, `camera.ts`, `camera.test.ts`, `input/keys.ts`,
`input/keys.test.ts`, `apps/web/src/app/board-session.ts` (seulement l'appel `fitTop`, `:317-322`).

**Interfaces**
- Produit (lues par T8, T9, T10) :

```ts
// engine/page.ts — type structurel : PageView (core/api.ts) y entre tel quel, avant et après T4.
export interface FrameSource {
  readonly width: number;
  readonly height: number;
  readonly backdrop: { readonly rect: { readonly y1: number } | null } | null;
  readonly mode?: string; // "infinite" = Infini ; tout le reste = Page
}
export type FrameLayout = "landscape" | "portrait" | "infinite";
/** Cadre d'une page Page : (0, 0) → (width, max(height, bas du fond)) ; null en Infini (DA4). */
export function pageFrame(p: FrameSource): PageRect | null {
  if (p.mode === "infinite") return null;
  const bottom = Math.max(p.height, p.backdrop?.rect?.y1 ?? 0);
  return { x0: 0, y0: 0, x1: p.width, y1: bottom };
}
/** Orientation montrée par le segment : infini, portrait si le cadre est plus haut que large, sinon paysage. */
export function pageLayoutOf(p: FrameSource): FrameLayout {
  const f = pageFrame(p);
  return f === null ? "infinite" : f.y1 - f.y0 > f.x1 - f.x0 ? "portrait" : "landscape";
}
/** Partie visible du cadre (fond blanc) ; Infini : toute la vue. */
export function visiblePageRect(c: Camera, viewW: number, viewH: number, frame: PageRect | null): PageRect | null;
/** Grille visible : recoupée au cadre ; Infini (frame null) : toute la vue, coordonnées négatives comprises. */
export function visibleGridRect(c: Camera, viewW: number, viewH: number, frame: PageRect | null): PageRect | null;
```
  Vérifier la forme réelle de `BackdropView.rect` dans `core/api.ts` et adapter `FrameSource.backdrop` à elle (champ
  `y1` d'un `Bounds`) ; garder `visiblePageRect` compatible des appelants (ajouter les paramètres, mettre à jour les
  deux rendus est le travail de T9 : ici, garder une surcharge à l'ancienne forme
  `visiblePageRect(c, viewH)` = cadre « largeur fixe, hauteur sans fin » jusqu'à T9, signalée `@deprecated`).
  - `camera.ts` : `export function fitFrame(viewW: number, viewH: number, frame: PageRect, top: number, margin = 0.95): Camera`
    (cadre entier sous `top`, centré ; réutilise `fitPage`) ;
    `export function fitFor(layout: FrameLayout, viewW: number, viewH: number, frame: PageRect | null, content: PageRect | null, top: number): Camera` :
    `landscape` → `fitWidth(viewW, viewH, frame.x1 - frame.x0, 0.95, top)` ; `portrait` → `fitFrame(…, frame, top)` ;
    `infinite` → `fitFrame` sur `content` (boîte du contenu ∪ fond) sinon sur `{0, 0, 1920, 1080}` en `fitWidth`.
  - `camera.ts` : `topBelowIslands(stage: VBox, islands: readonly (VBox & { readonly side?: boolean })[], …)` : une
    boîte `side === true` est ignorée.
  - `board-session.ts:317-322` : `[...querySelectorAll(".rb-island")].map((e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, side: e.matches('[data-anchor^="side-"]') }; })`
    (ne pas étaler un `DOMRect` : ses champs sont des accesseurs).
  - `keys.ts` : `export type PageKey = "prev" | "next" | "add" | "duplicate" | "sidebar-pages" | "sidebar-layers";`
    `export function pageKey(e: KeyLike): PageKey | null` : `PageUp` → prev, `PageDown` → next (sans modificateur),
    Ctrl+M (Ctrl **aussi sous macOS**, jamais Cmd+M) → add, Ctrl/Cmd+Maj+D → duplicate, Ctrl/Cmd+Maj+P →
    sidebar-pages, Ctrl/Cmd+Maj+L → sidebar-layers ; Alt Gr refusé (règle `keys.ts:26`) ; `e.isComposing` → null ;
    `export function inEditable(t: EventTarget | null): boolean` (exporté depuis la fonction existante, ne pas la
    recopier).
- Réutilise : `apps/web/src/engine/page.ts:18` `visiblePageRect` — `export function pageFrame(p: PageView): PageRect | null` (null = Infini) ; `visiblePageRect(c, view, frame)`.
- Réutilise : `apps/web/src/engine/camera.ts:38` `fitPage`, `:76` `fitWidth` — `fitPage(viewW, viewH, pageW, pageH, margin)` réutilisé pour portrait et infini, `fitWidth` gardé.
- Réutilise : `apps/web/src/engine/camera.ts:56` `topBelowIslands` — liste d'îlots filtrée par l'appelant (`board-session.ts:317`) : `[data-anchor^="side-"]` exclus.
- Réutilise : `apps/web/src/engine/input/keys.ts:25` `keyAction` — `pageKey(e: KeyLike): PageKey | null` ; `inEditable` exporté.

**Tests rouges d'abord** :
1. `page.test.ts` « pageFrame : page sans mode 1920 × 1080 » ; « fond PDF plus haut : cadre jusqu'au bas du fond
   (1920 × 2715) » ; « infini : null » ; « pageLayoutOf : portrait 3413,33, PDF 2715 portrait, infini ».
2. `page.test.ts` « visibleGridRect infini : coordonnées négatives gardées » ; « page : recoupée au cadre (y ≤ 1080) ».
3. `camera.test.ts` « fitFor portrait : cadre entier visible sous top » ; « fitFor landscape = fitWidth » ;
   « fitFor infini sans contenu : 1920 × 1080 en largeur ».
4. `camera.test.ts` « un îlot latéral haut de 600 px ne change pas fitTop » et « un îlot latéral replié (48 px, en
   haut du côté) est ignoré » (valeur égale à celle sans lui).
5. `keys.test.ts` « pageKey : PageUp, PageDown, Ctrl+M (aussi Mac), Ctrl+Maj+D, Ctrl+Maj+P, Ctrl+Maj+L ; Alt Gr et
   composition IME : null ; Cmd+M : null ».

**Commande bornée** : `cd /home/adminjd/projets/roomboard-wt/personnalisation-1a--T3 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/page.test.ts src/engine/camera.test.ts src/engine/input/keys.test.ts --reporter=verbose 2>&1 | grep -E "pageFrame|îlot latéral|pageKey|Tests |FAIL" | tail -10`
(les trois noms présents, aucun `FAIL`), puis `vitest run src/app/board-session.test.ts 2>&1 | tail -5` vert et
`tsc --noEmit` code 0.

**Contraintes** : GC1 ; GC3 (raccourcis de la table 2 bis, hors saisie et IME) ; GC5 ; GC9 ; GC10 ; aucune constante
neuve dans `core/api.ts` (constat `api.ts:145`).

**Interdits** : toucher `engine.ts`, les rendus, `core/` ; ajouter une constante de hauteur ailleurs que dans `page.ts`.

**Terminé** : tests 1-5 verts, `board-session.test.ts` vert, `tsc` vert.

**Étapes** : (1) tests 1-2 rouges ; (2) `pageFrame`, `pageLayoutOf`, rectangles, verts ; (3) tests 3-4 rouges, `fitFrame`,
`fitFor`, `side`, `board-session.ts`, verts ; (4) test 5 rouge, `pageKey`, `inEditable` exporté, vert ;
(5) commit `feat(engine): page frame, fit by layout, page shortcuts`.

---

### Tâche T4 — Pont Wasm, API TypeScript, faux cœur, `COMMAND_TYPES`
<a id="tache-t4"></a>

**Objectif** : le contrat TS des commandes neuves, branché au vrai cœur (Wasm) et suivi à l'identique par le faux cœur
(décisions 30, 33 ; parité cœur ↔ faux cœur).

**Fichiers** : `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/api.ts`, `core/wasm-core.ts`,
`core/fake-core.ts`, `core/fake-core.test.ts`, `apps/cli/src/ops.ts`.

**Interfaces**
- Consomme : T1 (`PageLayout`, variantes, `blank_with`, `PageView.mode`) ; T2 (`PageLayout` TS de `toolbar.ts`).
- Produit :
  - `api.ts` : `export type { PageLayout } from "../toolbar";` (même littéral, aucune copie) ;
    `export type PageMode = "page" | "infinite";` ; `PageView` gagne `readonly mode: PageMode` ;
    `Command`, **après `RemovePage`** :
    `{ type: "AddPage"; after: string | null; mode?: PageLayout }` (champ facultatif),
    `{ type: "SetPageMode"; page: string; mode: PageLayout }`, `{ type: "MovePage"; page: string; to: number }`,
    `{ type: "DuplicatePage"; page: string }` (tous `readonly`) ; `blank(mode?: PageLayout): CoreDocument`.
  - `lib.rs` (à côté de `add_page_after_inner`) : `add_page_after(after: Option<String>, mode: Option<String>)`,
    `set_page_mode(page: &str, mode: &str)`, `move_page(page: &str, to: u32)`, `duplicate_page(page: &str)`,
    `blank(mode: Option<String>)` ; mode illisible → `JsError` « mode de page inconnu : <valeur> ».
  - `wasm-core.ts` : cases `SetPageMode`, `MovePage`, `DuplicatePage` après `RemovePage` ; `page()` contrôle
    `mode` (`"page" | "infinite"`, sinon erreur de forme comme les autres champs).
  - `fake-core.ts` : mêmes règles que le cœur : `AddPage.mode`, `SetPageMode` (même valeur : aucune étape ; Infini
    garde `height` ; valeur inconnue gardée), `MovePage` (ids gardés, `to` hors bornes → `Error("rang de page hors bornes")`),
    `DuplicatePage` (ids neufs, copie juste après, `Change.pages = [copie]`, `Change.ids` = éléments copiés) ;
    `page()` rend `mode` et `height` lus (fin des constantes de `:1375`) ; accroche et lignes de grille
    (`:1598-1630`) bornées au **cadre** en Page (`(0,0)→(width, max(height, bas du fond))`) et **sans borne** en Infini.
  - `ops.ts` : `"SetPageMode", "MovePage", "DuplicatePage"` insérés **après `"RemovePage"`** dans `COMMAND_TYPES`.
- Réutilise : `apps/cli/src/ops.ts:11` — `COMMAND_TYPES`.

**Patron à ne pas reprendre** : `fake-core.ts:1598-1630` borne tout par `PAGE_WIDTH` et `y ≥ 0` ; le cœur (T7) passera à
`clip: Option<Bounds>` — le faux cœur doit suivre la même règle, testée par les mêmes cas (référence de la règle :
section T7, « Code à écrire »). Ne pas dupliquer `pageFrame` : importer `pageFrame` de `engine/page.ts` dans le faux
cœur si l'import ne crée pas de cycle (sinon une fonction privée de trois lignes, citée dans le rapport).

**Tests rouges d'abord** (`fake-core.test.ts`) :
1. « SetPageMode portrait puis undo : une étape » ; « même valeur : aucune étape » ; « infini garde height ».
2. « MovePage garde les ids ; hors bornes refusé ; même rang : aucune étape ».
3. « DuplicatePage : ids neufs, copie juste après, Change.ids = éléments copiés ».
4. « AddPage mode infinite » ; « page() rend mode et height ».
5. « grille : page bornée au cadre, infini sans borne (lignes à x < 0) ; accroche à (-500, -500) en infini ».
6. Côté Rust, dans `lib.rs` (`#[cfg(test)]` existant ou `crates/roomboard-wasm/tests/`) : « set_page_mode inconnu :
   erreur », « move_page via le pont : une étape ».

**Commande bornée** : `cd /home/adminjd/projets/roomboard-wt/personnalisation-1a--T4 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && nice -n 10 cargo test -p roomboard-wasm -j 4 2>&1 | tail -5` ;
construire le Wasm comme `scripts/verifier.sh` (lire la ligne exacte du script, sous `nice -n 10`) puis
`stat -c %s apps/web/src/wasm/roomboard_wasm_bg.wasm` ≤ 1 572 864 (chiffre dans le rapport) ;
`nice -n 10 pnpm --filter @roomboard/web exec vitest run src/core/fake-core.test.ts --reporter=verbose 2>&1 | grep -E "SetPageMode|MovePage|DuplicatePage|Tests |FAIL" | tail -8` ;
`tsc --noEmit` web **et** `nice -n 10 pnpm --filter @roomboard/cli exec tsc --noEmit 2>&1 | tail -3` code 0
(`ALL_COMMANDS` l'exige).

**Contraintes** : GC1 ; GC5 ; GC7 (ici seulement `COMMAND_TYPES` ; le reste de la CLI est T7) ; GC8 (mesure dans le
rapport) ; GC9 ; GC10 ; GC11 (variantes après `RemovePage` dans `api.ts`, `wasm-core.ts`, `fake-core.ts`, `ops.ts`) ;
aucun code CLI dans les modules Wasm.

**Interdits** : toucher `crates/roomboard-core` (T1, T7), `engine/`, `ui/`.

**Terminé** : tests verts, deux `tsc` verts, taille Wasm mesurée sous plafond.

**Étapes** : (1) `api.ts` ; tests du faux cœur rouges ; (2) faux cœur, verts ; (3) `lib.rs`, test Rust ; (4) build
Wasm, `wasm-core.ts`, taille ; (5) `ops.ts`, deux `tsc` ; (6) commit `feat(api): page mode, move and duplicate page in bridge and fake core`.

---

### Tâche T5 — Îlots mobiles à ancre de profil, voie latérale, éditeur de profils
<a id="tache-t5"></a>

**Objectif** : les barres `tools` et `pages` se déplacent et se replient ; toute barre flottante a une ancre par défaut
lue du profil (`bar.anchor`, sinon l'ancre du rôle ; `pages` → `side-start`) ; voie latérale à hauteur bornée ;
l'éditeur règle ancre, « Repliée au démarrage » et « Page neuve » (décisions 20, 21, 23 ; DA6 ; H5, H10).

**Fichiers** : `apps/web/src/ui/island-place.ts`, `island-place.test.ts`, `Island.tsx`, `Island.test.tsx`,
`ProfileEditor.tsx`, `ProfileEditor.test.tsx`.

**Interfaces**
- Consomme : T2 (`BarAnchor`, `BAR_ANCHORS`, `Toolbar.anchor`, `setAnchor`, `setCollapsed`, `setPageMode`,
  `PageLayout`).
- Produit :
  - `island-place.ts` : `Anchor` gagne `"side-start" | "side-end"` ; `ISLAND_ANCHORS.pages = "side-start"` ;
    `export function anchorOf(bar: Toolbar): Anchor` (lit `bar.anchor`, sinon l'ancre du rôle) ;
    `laneOf` place `side-*` sous la rangée du haut et au-dessus de celle du bas, et rend `maxHeight` (px) ;
    `export const MOVABLE_ROLES: ReadonlySet<string> = new Set(["tools", "pages"])`.
  - `Island.tsx` : `MOVABLE_ROLE` → `MOVABLE_ROLES` ; `data-anchor={anchorOf(bar)}` ; poignée « Début » et double appui
    → ancre du profil ; dans `IslandLayer`, les îlots `side-*` sont rendus **après** les centrés (ordre DOM
    « …outils, pages », `design-l4:81`, `:150`) ; une barre `pages` en `top` ou `bottom` est rendue flottante (H10).
  - `ProfileEditor.tsx` : `ROLE_LABELS.pages = "Barre latérale"` ; dans `BarBlock` d'une barre flottante :
    `RadioChoices look="segment"` « Position » (libellés : Haut gauche, Haut centre, Haut droite, Bas gauche, Bas centre,
    À gauche, À droite ; pour `pages` : Flottante = défaut du rôle, À gauche, À droite seulement, H10) et case
    « Repliée au démarrage » (cible ≥ 44 px) ; section comportement : « Page neuve » en segments
    (Paysage, Portrait, Infini).
- Réutilise : `apps/web/src/ui/Island.tsx:230-300`, `island-place.ts:61` — `anchorOf(bar: Toolbar): Anchor` (au lieu de `role`), `laneOf` avec `side-*` et `maxHeight` ; `movable` = rôle ∈ {`tools`, `pages`}.
- Réutilise : `apps/web/src/ui/RadioChoices.tsx` — `<RadioChoices look="segment" options value choose>`.
- Réutilise : `apps/web/src/device-settings.ts:55-63` — `island()`, `setIsland()` inchangés (geste à la main = appareil, H5).

**Tests rouges d'abord** :
1. `island-place.test.ts` « pages → side-start par défaut » ; « bar.anchor side-end prime » ; « laneOf side-start :
   sous la rangée du haut, maxHeight borné » (mettre à jour `:16-47`).
2. `Island.test.tsx` « la barre pages a une poignée et un repli » ; « Début ramène à l'ancre du profil » ;
   « ordre DOM : îlot latéral après les centrés » (mettre à jour `:233-254`).
3. `ProfileEditor.test.tsx` « Barre latérale : À droite et Repliée au démarrage décochée → profil anchor side-end,
   collapsed false » ; « Page neuve : Infini → behavior.pageMode infinite » ; libellé `:104`, catalogue `:191-194`,
   `:310`.

**Commande bornée** : `cd /home/adminjd/projets/roomboard-wt/personnalisation-1a--T5 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/island-place.test.ts src/ui/Island.test.tsx src/ui/ProfileEditor.test.tsx --reporter=verbose 2>&1 | grep -E "side-start|Barre latérale|Tests |FAIL" | tail -8` ;
à garder verts : `src/ui/App.test.tsx` (hors `#pages` et `setDock(…, "pages", "bottom")`, repris en T10 : noter les
échecs attendus dans le rapport) ; `tsc --noEmit` code 0.

**Contraintes** : GC1 ; GC2 (cibles ≥ 44 px, poignée aux événements de pointeur, jamais HTML5 drag) ; GC3 (poignée :
flèches 16 px, Maj 64 px, Début = ancre du profil) ; GC5 ; GC9 ; GC10 ; GC12 (`data-island`, `data-toolbar`,
`data-dock` gardés).

**Interdits** : écrire le profil au geste (H5) ; toucher `App.tsx` (T10), `toolbar.ts` (T2).

**Terminé** : tests 1-3 verts, `tsc` vert.

**Étapes** : (1) tests 1 rouges, `island-place.ts`, verts ; (2) tests 2, `Island.tsx`, verts ; (3) tests 3,
`ProfileEditor.tsx`, verts ; (4) commit `feat(ui): profile anchor for floating bars, side lane, editor`.

---

### Tâche T6 — Barre principale : icônes Lucide, compteur `page-number`, état des actions de page
<a id="tache-t6"></a>

**Objectif** : icônes neuves (lot 1), rendu de `page-number` (« 2 / 5 », `id="pages"`), `page-next` jamais grisé et
nommé « Nouvelle page » sur la dernière page, `page-duplicate` (décisions 25, 27, 28 ; H7).

**Fichiers** : `apps/web/src/ui/icons.ts`, `icons.test.ts`, `THIRD_PARTY_NOTICES.md`, `ui/item-state.ts`,
`item-state.test.ts`, `ui/Toolbar.tsx`, `Toolbar.test.tsx`, `ui/PagesBar.tsx` (import de `pagesLabel` seulement),
`app/stage-tags.test.ts` (import seulement).

**Interfaces**
- Produit :
  - `icons.ts`, **en bloc après les icônes de page** : tracés Lucide `panel-left`, `copy`, `rectangle-horizontal`,
    `rectangle-vertical`, `infinity`, `rows-2`, `rows-3`, `rows-4` (lus au commit `7981a0798a` par
    `gh api repos/lucide-icons/lucide/contents/icons/<nom>.svg?ref=7981a0798a --jq .content | base64 -d`) ;
    `ACTION_ICONS["page-duplicate"] = "copy"`, `ACTION_ICONS["page-number"] = "panel-left"`.
  - `item-state.ts` : `export const pagesLabel = (v: { pageIndex: number; pageCount: number }): string` (déplacé de
    `PagesBar.tsx:22`, qui l'importe désormais) ; `ACTION_STATE["page-next"]` : jamais `disabled` ; sur la dernière page
    `label: "Nouvelle page"` ; `ACTION_STATE["page-duplicate"]` : jamais grisé ; `ACTION_STATE["page-number"]` :
    `pressed` quand la barre latérale est ouverte (`v.sidebarOpen`, champ facultatif de `ToolbarView` ajouté ici,
    `false` par défaut).
  - `Toolbar.tsx` : `ACTION_RENDER["page-number"]` rend un bouton `id="pages"`, texte `pagesLabel(v)`, classe
    `rb-pages-count`, cible ≥ 44 px, `padToPixel` gardé (`pixel-pad.test.ts`).
- Réutilise : `apps/web/src/ui/PagesBar.tsx:33` `counterAfter`, `:22` `pagesLabel` — rendu par `ACTION_RENDER["page-number"]` (`Toolbar.tsx:101`) ; `pagesLabel` déplacé dans `ui/item-state.ts`.
- Réutilise : `apps/web/src/ui/item-state.ts:80`, `icons.ts:112` — entrées neuves.
- Réutilise : `apps/web/src/ui/IconButton.tsx`, `ui/icons.ts:159` `iconFor` — inchangés.

**Tests rouges d'abord** :
1. `item-state.test.ts` « page-next sur la dernière page : actif, libellé Nouvelle page » (remplace `:42`) ;
   « page-duplicate actif ».
2. `Toolbar.test.tsx` « page-number rend #pages 2 / 5 » ; « page-number pressed quand sidebarOpen ».
3. `icons.test.ts` « icônes neuves présentes, viewBox -0.25 -0.25 24 24, trait 1,5 ».

**Commande bornée** : `cd /home/adminjd/projets/roomboard-wt/personnalisation-1a--T6 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/item-state.test.ts src/ui/Toolbar.test.tsx src/ui/icons.test.ts src/app/stage-tags.test.ts src/ui/pixel-pad.test.ts --reporter=verbose 2>&1 | grep -E "Nouvelle page|page-number|Tests |FAIL" | tail -8` ;
`bash scripts/tests/controle-icones.test.sh 2>&1 | tail -3` et `bash scripts/tests/controle-licences.test.sh 2>&1 | tail -3` code 0 ;
`tsc --noEmit` code 0.

**Contraintes** : GC1 ; GC2 (cibles ≥ 44 px) ; GC4 (Lucide ISC recopié, ligne en fin du § Icônes Lucide de
`THIRD_PARTY_NOTICES.md`, trait 1,5, `viewBox="-0.25 -0.25 24 24"`) ; GC5 ; GC9 ; GC10 ; GC11 (icônes après celles de
page) ; GC12 (`#pages`).

**Interdits** : retirer `PagesBar.tsx` (T10) ; toucher `toolbar-host.ts` (T8).

**Terminé** : tests verts, deux contrôles verts, `tsc` vert.

**Étapes** : (1) tests rouges ; (2) tracés et notice ; (3) `item-state.ts`, `pagesLabel` déplacé ; (4) `Toolbar.tsx` ;
(5) commit `feat(ui): page counter in main bar, next adds a page, lucide icons`.

---

### Tâche T7 — Grille bornée au cadre (cœur) et CLI des commandes de page
<a id="tache-t7"></a>

**Objectif** : (a) en Page, grille et accroche bornées au cadre ; en Infini, sans borne (décision 9, H17) ;
(b) CLI des trois commandes et d'`AddPage.mode` (décision 30, D15).

**Fichiers** : `crates/roomboard-core/src/grid.rs`, `document.rs` (`page_grid`, `snap_*`, `grid_lines*`, `:662-716`),
`apps/cli/src/formats.ts`, `apps/cli/src/ops.test.ts`, `apps/cli/src/session.test.ts`, `apps/cli/src/main.ts` (aide),
`scripts/essais/cli-essai.mjs`.

**Interfaces**
- Consomme : T1 (`mode`, `height`, `PageView.mode`) ; T4 (`COMMAND_TYPES`, pont, `api.ts`).
- Produit : `grid.rs` : `snap_lattice`, `snap_level`, `snap_point`, `snap_delta`, `lines` prennent
  `clip: Option<Bounds>` à la place de `width: f64` ; `document.rs` : `fn page_clip(&self, page: &str) -> Option<Option<Bounds>>`
  (page inconnue → `None` ; Infini → `Some(None)` ; Page → `Some(Some(cadre))`).
- Réutilise : `crates/roomboard-core/src/grid.rs:539` `lines`, `:299` `snap_point`, `:320` `snap_delta` — paramètre `width: f64` remplacé par `clip: Option<Bounds>` (None = infini).
- Réutilise : `apps/cli/src/ops.ts:11` — `COMMAND_TYPES` (déjà étendu par T4, lu ici).

**Patron à ne pas reprendre** : le cadre ne se recalcule pas « largeur seule » (`grid.rs:550-558`) : il vaut
`(0, 0) → (width, max(height, backdrop.rect.y1))`, la même règle que `pageFrame` (`engine/page.ts`, T3) et que le faux
cœur (T4, `fake-core.ts`, accroche et lignes). Parité : les cas des tests 1-3 sont ceux du test 5 de T4.

**Code à écrire** :

```rust
// document.rs
fn page_clip(&self, page: &str) -> Option<Option<Bounds>> {
    let v = self.page(page)?;
    if v.mode == "infinite" { return Some(None); }
    let bottom = v.backdrop.as_ref().and_then(|b| b.rect.map(|r| r.y1)).unwrap_or(0.0).max(v.height);
    Some(Some(Bounds { x0: 0.0, y0: 0.0, x1: v.width, y1: bottom }))
}
// grid.rs, lines : c = rect recoupé à clip s'il existe, rect tel quel sinon
let c = match clip {
    Some(k) => Bounds { x0: rect.x0.max(k.x0), y0: rect.y0.max(k.y0), x1: rect.x1.min(k.x1), y1: rect.y1.min(k.y1) },
    None => rect,
};
```
(adapter `b.rect` à la forme réelle de `BackdropView` ; `snap_lattice`/`snap_level` refusent un point hors `clip`
quand il existe, n'en refusent aucun sinon.)

**CLI** : `formats.ts` ligne `.roomboard` de `FORMAT_LOTS` : note « mode de page `mode` facultatif (`infinite`),
hauteur portrait 3413,33 » ; aide (`main.ts`, rubrique des références) : « après `DuplicatePage` d'une page non vide,
`$n` désigne les éléments copiés ; la copie se lit par `$page:i` (rang d'origine + 1) » ; `cli-essai.mjs` : bloc
« personnalisation-1a » **après les blocs existants** : `new` → `run --ops` `SetPageMode` portrait → `state` montre
`mode: "page"`, `height: 3413.33…` → `undo` (une étape) ; `AddPage` `mode: "infinite"` ; `MovePage` puis réouverture
identique (ordre des ids) ; page à deux objets, `DuplicatePage` → `$n.1` est un élément, `$page:1` la copie ;
`MovePage` `to: 99` → code 1 ; `SetPageMode` `mode: "a4"` → code 1.

**Tests rouges d'abord** :
1. `grid.rs` `grid_clip_page_lines_stop_at_frame` (aucune ligne y > 1080 sur une page paysage).
2. `grid_clip_infinite_lines_at_negative_coords` (lignes x < 0 et y < 0) ;
   `grid_clip_infinite_snap_at_negative_point` (accroche à (-500, -500)).
3. `grid_clip_pdf_backdrop_extends_frame` (fond jusqu'à 2715 : lignes jusqu'à 2715).
4. `ops.test.ts` « SetPageMode, MovePage, DuplicatePage, AddPage mode lus » ; `session.test.ts` « une étape par
   commande ; refus code 1 ; $n après DuplicatePage = éléments, $page:i = copie ».

**Commande bornée** : `cd /home/adminjd/projets/roomboard-wt/personnalisation-1a--T7 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && nice -n 10 cargo test -p roomboard-core grid_clip -j 4 2>&1 | tail -5` (≥ 3) ;
`nice -n 10 cargo test -p roomboard-core -j 4 2>&1 | grep -E "test result|error\[" | tail -8` (vert ; tests de grille
existants à garder verts, sauf ceux qui affirmaient « sans fin vers le bas » : comportement voulu, mis à jour et cités
au rapport) ; `nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/ops.test.ts src/session.test.ts 2>&1 | tail -8` ;
construire la CLI (`pnpm --filter @roomboard/cli build`) puis `node scripts/essais/cli-essai.mjs 2>&1 | tail -3`
(`CLI : OK`) ; `node apps/cli/dist/roomboard.mjs --help` code 0.

**Contraintes** : GC1 ; GC5 ; GC7 (CLI, `FORMAT_LOTS`, tests, `cli-essai.mjs`) ; GC8 (Wasm principal mesuré si le
cœur grossit) ; GC9 ; GC10 ; GC11 (bloc `cli-essai.mjs` à part, après les existants) ; écritures CLI seulement sur
des fichiers temporaires.

**Interdits** : toucher `fake-core.ts` (T4) ou `grid-cache.ts` (T9) ; écrire un fichier de Jérôme.

**Terminé** : tests Rust et CLI verts, `CLI : OK`.

**Étapes** : (1) tests 1-3 rouges ; (2) `clip` dans `grid.rs`, `page_clip`, verts ; (3) tests 4 rouges, aide et
`FORMAT_LOTS`, verts ; (4) bloc `cli-essai.mjs`, `CLI : OK` ; (5) commit `feat(core,cli): grid bound to page frame, page commands in cli`.

---

### Tâche T8 — Moteur branché : page neuve du profil, Suivante qui ajoute, déplacer, dupliquer, mode, raccourcis
<a id="tache-t8"></a>

**Objectif** : le moteur expose les gestes de page et l'état du mode ; Suivante sur la dernière page ajoute une page
au mode du profil ; raccourcis de page avant le moteur ; onglet neuf au mode du profil (décisions 7, 10, 25 ; H7, H20).

**Fichiers** : `apps/web/src/engine/engine.ts`, `engine.test.ts`, `app/toolbar-host.ts`, `toolbar-host.test.ts`,
`apps/web/src/main.ts`, `app/workspace.ts`, `workspace.test.ts`, `app/stage-tags.ts`, `stage-tags.test.ts`,
`app/annotation-page.ts`, `annotation-page.test.ts`, `app/board-session.ts` (deps du moteur seulement).

**Interfaces**
- Consomme : T3 (`pageFrame`, `pageLayoutOf`, `fitFor`, `pageKey`, `inEditable`) ; T4 (`Command`, `PageView.mode`,
  `blank(mode?)`) ; T6 (`ToolbarView.sidebarOpen`).
- Produit (lues par T10) :
  - `EngineState` gagne `readonly pageMode: PageMode` et `readonly pageLayout: PageLayout` de la page montrée.
  - Dépendance `deps.pageMode: () => PageLayout` (profil actif, `behavior.pageMode`).
  - `Engine` gagne : `addPage(after?: string): boolean` (mode du profil, montre la page), `nextOrAdd(): boolean`
    (dernière page → `addPage()`), `movePage(page: string, to: number): boolean` (la page montrée reste montrée),
    `duplicatePage(page?: string): boolean` (montre la copie, H20), `setPageMode(mode: PageLayout): boolean` (page
    montrée) ; `fitPage()` utilise `fitFor(pageLayoutOf(view), …)` avec la boîte `doc.bounds(doc.elementIds(page))` ∪
    fond en Infini.
  - `toolbar-host.ts` : `"page-next" → nextOrAdd()`, `"page-duplicate" → duplicatePage()`,
    `"page-number" → t.toggleSidebar?.("pages")` (port facultatif `toggleSidebar(tab: "pages" | "calques"): void`
    ajouté à l'hôte ; branché par T10).
  - `main.ts:420-427` : avant `workspace.key`, `if (!inEditable(e.target)) { const k = pageKey(e); … }` :
    `prev`/`next` → `prevPage()`/`nextOrAdd()` (touche tenue `e.repeat` sur la dernière page : aucun ajout, H7),
    `add` → `addPage()`, `duplicate` → `duplicatePage()`, `sidebar-pages` → `toggleSidebar("pages")`,
    `sidebar-layers` → rien au lot 1 ; `preventDefault()` seulement si l'action a lieu.
  - `stage-tags.ts` : `#stage[data-page-mode]` = `pageLayout`.
  - `annotation-page.ts:56` `viewOf` projette `pageMode`, `pageLayout`.
  - `workspace.ts:618`, `:627` : onglet neuf `core.blank(profile.behavior.pageMode)` ; onglet d'annotation `blank()`.
- Réutilise : `CoreDocument.bounds(ids)` (`apps/web/src/app/thumbnail.ts:36`) — `doc.bounds(doc.elementIds(page))`.
- Réutilise : `apps/web/src/engine/input/keys.ts:25` — `pageKey(e)`, `inEditable` (importé, jamais recopié : constat `annotation-page.ts:76`).

**Tests rouges d'abord** :
1. `engine.test.ts` « nextOrAdd sur la dernière page ajoute une page au mode du profil, Ctrl+Z la retire » ;
   « nextOrAdd ailleurs : page suivante ».
2. « movePage garde la page montrée » ; « duplicatePage montre la copie » ; « setPageMode portrait : fitPage montre
   tout le cadre » ; « pageMode / pageLayout dans l'état ».
3. `toolbar-host.test.ts` « page-next appelle nextOrAdd ; page-duplicate ; page-number appelle toggleSidebar ».
4. `stage-tags.test.ts` « data-page-mode suit la page montrée » ; `annotation-page.test.ts` « viewOf projette pageMode ».
5. `workspace.test.ts` « onglet neuf au mode du profil ; onglet d'annotation sans mode ».
6. `engine.test.ts` ou test de `main.ts` existant : « PageDown tenu sur la dernière page : une seule page » ;
   « dans un champ de saisie, PageDown et Ctrl+M ne font rien de la page ».

**Commande bornée** : `cd /home/adminjd/projets/roomboard-wt/personnalisation-1a--T8 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/engine.test.ts src/app/toolbar-host.test.ts src/app/stage-tags.test.ts src/app/annotation-page.test.ts src/app/workspace.test.ts --reporter=verbose 2>&1 | grep -E "nextOrAdd|data-page-mode|Tests |FAIL" | tail -10` ;
`tsc --noEmit` code 0.

**Contraintes** : GC1 ; GC3 (raccourcis hors saisie et IME, Ctrl+M aussi sous macOS) ; GC5 ; GC9 ; GC10 ;
GC12 (`#stage[data-page]` gardé).

**Interdits** : toucher les rendus (T9), `ui/` (T10) ; ajouter une page sur `e.repeat`.

**Terminé** : tests verts, `tsc` vert.

**Étapes** : (1) tests 1-2 rouges, `engine.ts`, verts ; (2) test 3, `toolbar-host.ts` ; (3) tests 4-5,
`stage-tags.ts`, `annotation-page.ts`, `workspace.ts`, `board-session.ts` (deps) ; (4) test 6, `main.ts` ;
(5) commit `feat(engine): next adds a page, move, duplicate, page mode, page shortcuts`.

---

### Tâche T9 — Rendu du cadre, grille sans borne en Infini, dépôt d'image, export PDF, miniatures
<a id="tache-t9"></a>

**Objectif** : les deux rendus, la grille visible, le dépôt d'image, l'export PDF et les miniatures lisent tous
`pageFrame` (DA4) ; miniatures à la demande (DA7) (décisions 5, 9, 11, 12 ; H2, H13, H16).

**Fichiers** : `apps/web/src/engine/render/canvas2d.ts`, `canvas2d.test.ts`, `webgl2.ts`, `webgl2.test.ts`,
`grid-cache.ts`, `grid-cache.test.ts`, `apps/web/src/platform/image-import.ts`, `image-import.test.ts`,
`apps/web/src/app/pdf-export.ts`, `pdf-export.test.ts`, `app/thumbnail.ts`, `thumbnail.test.ts`,
`apps/web/src/ui/page-thumbs.ts` (neuf), `page-thumbs.test.ts` (neuf).

**Interfaces**
- Consomme : T3 (`pageFrame`, `visiblePageRect(c, viewW, viewH, frame)`, `visibleGridRect(…, frame)`) ; T4
  (`PageView.mode`).
- Produit :
  - `canvas2d.ts` `drawScene` et `webgl2.ts` `pageScissor` : Page → pourtour `SURROUND_COLOR` + cadre blanc
    (`background`) ; Infini → couleur `background` sur toute la vue, aucun pourtour ; le `backdrop` dessiné une fois à
    son rectangle (H16) ; `gridOf` sans `PAGE_WIDTH` fixe.
  - `grid-cache.ts` `grow` : bornes passées par l'appelant (`frame`) ; `null` → aucune borne (x0, y0 < 0 permis).
  - `image-import.ts:151-156` `visibleOf(…, frame)` : Infini → partie visible non coupée ; Page → inchangé.
  - `pdf-export.ts:236` : Page → règle actuelle à partir de `pageFrame` (cadre étendu vers le bas jusqu'au contenu) ;
    Infini → boîte du contenu ∪ fond, sinon 1920 × 1080.
  - `thumbnail.ts` : `export async function renderPageThumb(doc: CoreDocument, assets: AssetStore, pageId: string, width: number, deps: ThumbDeps & { backdrop?: BackdropPainter }): Promise<ImageBitmap | Blob | null>` :
    Page → son cadre ; Infini → boîte du contenu ∪ fond ; page infinie vide → 16:9 blanc.
  - `page-thumbs.ts` : `export interface PageThumbs { get(pageId: string, width: number): Promise<string | null>; invalidate(pages: readonly string[]): void; dispose(): void }`
    `export function createPageThumbs(render: (pageId: string, width: number) => Promise<ImageBitmap | Blob | null>): PageThumbs`
    (URL d'objet par page, clé = page + version ; un seul rendu à la fois ; `invalidate` pour `Change.pages` et les
    pages des `Change.ids`).
- Réutilise : `apps/web/src/app/thumbnail.ts:30`, `pdf-overlay.ts:27` `ContentPainter.paintContent`, `:103` `browserExportCanvas` — `export async function renderPageThumb(doc, assets, pageId, width, deps: ThumbDeps & { backdrop?: BackdropPainter }): Promise<ImageBitmap | Blob | null>` dans `thumbnail.ts` ; cache `page-thumbs.ts` (DA7).
- Réutilise : `apps/web/src/engine/render/grid-cache.ts:52` `grow` — borne passée par la page (cadre ou aucune).
- Réutilise : `CoreDocument.bounds(ids)` (`thumbnail.ts:36`) — `doc.bounds(doc.elementIds(page))`.

**Patron à ne pas reprendre** : corriger `canvas2d.ts` seul : `webgl2.ts` (second rendu, `:80`, `:387`) doit suivre
la même règle, prouvée par le même cas de test des deux côtés (Infini : aucun pourtour ; Page : pourtour sous le
cadre). Référence : `canvas2d.ts:359-398`, `webgl2.ts:80`.

**Tests rouges d'abord** :
1. `canvas2d.test.ts` « infini : aucun pourtour, fond sur toute la vue » ; « page : pourtour sous le cadre 1080 ».
2. `webgl2.test.ts` « infini : scissor de toute la vue » ; « page : scissor du cadre ».
3. `grid-cache.test.ts` « infini : grille aux coordonnées négatives » ; « page : bornée au cadre ».
4. `image-import.test.ts` « infini : image déposée à gauche de l'origine reste au point de dépôt ».
5. `pdf-export.test.ts` « infini : rectangle du contenu ; vide : 1920 × 1080 » ; « page : règle actuelle ».
6. `thumbnail.test.ts` « miniature infinie : cadre du contenu ; vide : 16:9 » ; `page-thumbs.test.ts` « cache par
   version, invalidate », « un seul rendu à la fois ».

**Commande bornée** : `cd /home/adminjd/projets/roomboard-wt/personnalisation-1a--T9 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/render/canvas2d.test.ts src/engine/render/webgl2.test.ts src/engine/render/grid-cache.test.ts src/platform/image-import.test.ts src/app/pdf-export.test.ts src/app/thumbnail.test.ts src/ui/page-thumbs.test.ts --reporter=verbose 2>&1 | grep -E "infini|négatives|Tests |FAIL" | tail -12` ;
à garder verts : `pdf-tiles.test.ts`, `pdf-overlay*.test.ts`, `grid-paint.test.ts` ; retirer la surcharge
`@deprecated` de `visiblePageRect` posée par T3 quand plus rien ne l'appelle ; `tsc --noEmit` code 0.

**Contraintes** : GC1 ; GC5 ; GC9 ; GC10 ; aucune constante neuve dans `core/api.ts`.

**Interdits** : toucher `engine.ts` (T8), `ui/SideBar.tsx` (T10) ; répéter le fond en Infini (OG5, personnalisation-1b).

**Terminé** : tests verts, `tsc` vert.

**Étapes** : (1) tests 1-2 rouges, deux rendus, verts ; (2) test 3, `grid-cache` ; (3) tests 4-5 ; (4) test 6,
`renderPageThumb`, `page-thumbs.ts` ; (5) commit `feat(render): page frame in both renderers, infinite grid, page thumbnails`.

---

### Tâche T10 — Barre latérale, onglet Pages, câblage, retrait de `PagesBar`
<a id="tache-t10"></a>

**Objectif** : la barre de rôle `pages` devient la barre latérale flottante, repliable, onglet Pages : rangée
d'actions, mode de la page montrée, liste des miniatures, taille ; gestes au doigt et au clavier (décisions 19, 22,
23, 24, 26 ; DA5 ; H1, H11, H19, H21, H22).

**Fichiers** : `apps/web/src/ui/SideBar.tsx` (neuf), `SideBar.test.tsx` (neuf), `ui/App.tsx`, `App.test.tsx`,
`ui/rb.css`, `rb-css.test.ts`, `ui/PagesBar.tsx` et `PagesBar.test.tsx` (retirés).

**Interfaces**
- Consomme : T2 (`sideActions`, `sidebar()`/`setSidebar`), T5 (`Island` mobile, `anchorOf`), T6 (`pagesLabel`,
  icônes, `sidebarOpen`), T8 (`movePage`, `duplicatePage`, `addPage(after)`, `removePage`, `setPageMode`,
  `pageLayout`, `toggleSidebar`), T9 (`createPageThumbs`, `renderPageThumb`).
- Produit :

```ts
export interface PagesPort {
  readonly ids: Accessor<readonly string[]>;
  readonly shown: Accessor<string>;
  readonly layout: Accessor<PageLayout>;
  /** Vrai si le cadre est fixé par le fond PDF (infobulle « cadre fixé par le fond PDF »). */
  readonly fixedByBackdrop: Accessor<boolean>;
  show(id: string): void;
  move(id: string, to: number): void;
  duplicate(id: string): void;
  remove(id: string): void;
  addAfter(id: string): void;
  setLayout(m: PageLayout): void;
  thumb(id: string, width: number): Promise<string | null>;
}
export function SideBar(props: { bar: Toolbar; collapsed: Accessor<boolean>; view: Accessor<ToolbarView>; host: ToolbarHost; pages: PagesPort }): JSX.Element;
```
  DOM : `data-toolbar="pages"` gardé ; en-tête `role="tablist"`, un seul onglet au lot 1 (`role="tab"`,
  `data-tab="pages"`, icône `panel-left` et texte « Pages », style `.rb-tab` repris) ; repliée : poignée, onglet,
  Déplier visibles, rangée d'actions et liste `hidden` mais dans le DOM ; rangée d'actions = `sideActions(bar)` par le
  rendu des items existant ; segments « Mode » (`RadioChoices look="segment"`, options paysage `rectangle-horizontal`,
  portrait `rectangle-vertical`, infini `infinity`) ; `.rb-pages-list` verticale, défilante, boutons
  `data-page="N"` (N à partir de 1), `data-page-id`, `aria-current="page"` sur la montrée, numéro à gauche, anneau
  `#6044EB` ; segments « Taille » (petites 120, moyennes 160, grandes 220 px ; icônes `rows-2/3/4`).
  Gestes : toucher → `show` ; glisser → `startSortDrag` → `move` ; appui long `TIP_HOLD_MS` → menu (Insérer une page
  après, Dupliquer, Retirer, Monter, Descendre) ; clavier sur une miniature : Entrée/Espace montrer, ↑/↓ focus voisine,
  Ctrl+↑/↓ et Ctrl+Début/Fin déplacer, Suppr/Retour arrière retirer (propagation arrêtée : la touche ne va pas au
  moteur), Maj+F10 ou Menu ouvre le menu, Échap rend le focus à la scène ; ← → dans la liste d'onglets.
  `App.tsx` : `BY_ROLE.pages` → `SideBar` ; `PagesPort` branché sur le moteur et `createPageThumbs(renderPageThumb…)`
  (invalidation sur `Change`) ; `toggleSidebar("pages")` déplie, met le focus sur la miniature montrée (Ctrl+Maj+P),
  replie au second appel ; `islandWatch` remesure sur `pageCount`, `pageLayout` ; onglet et taille lus et écrits par
  `sidebar()`/`setSidebar()`.
  `rb.css` (`:174-178`) : `.rb-pages-list` verticale ; jetons `--rb-btn-*`, aucun `48px` littéral (constat
  `rb.css:203`) ; règles neuves groupées à côté de `.rb-pages-*`.
- Réutilise : `apps/web/src/ui/sort-drag.ts:35` — `startSortDrag(e, { rows, scroller, from, moved, drop, tap, cancel })`.
- Réutilise : `apps/web/src/ui/tooltip.ts:8` `TIP_HOLD_MS`, `ui/pointer-gesture.ts:19` — `startPointerGesture` + délai `TIP_HOLD_MS`.
- Réutilise : `apps/web/src/ui/RadioChoices.tsx` — `<RadioChoices look="segment" options value choose>`.
- Réutilise : `apps/web/src/ui/IconButton.tsx`, `ui/icons.ts:159` `iconFor` — inchangés.
- Réutilise : `apps/web/src/device-settings.ts:8-13` — `sidebar()`, `setSidebar(s)` (posés par T2).
- Réutilise : `apps/web/src/ui/Island.tsx:230-300`, `island-place.ts:61` — `anchorOf(bar)`, rôles mobiles (posés par T5).
- Nouveau module (aucun existant, cadrage) : `ui/SideBar.tsx` — `SideBar(props: { bar: Toolbar; collapsed: Accessor<boolean>; view: Accessor<ToolbarView>; host: ToolbarHost; pages: PagesPort }): JSX.Element` ; style `.rb-tab` de `ui/TabsBar.tsx:35`, `:48` repris, pas son composant.

**Tests rouges d'abord** (`SideBar.test.tsx`, ≥ 8) :
1. « repliée : onglet Pages visible, page-add dans le DOM mais caché ; aucun onglet Calques ».
2. « toucher une miniature appelle show » ; « aria-current sur la montrée, data-page 1..N, data-page-id ».
3. « glisser la miniature 3 au-dessus de la 1 : move(3e id, 0) » (événements de pointeur, aucun `dragstart`).
4. « appui long 500 ms : menu Dupliquer / Retirer / Insérer après / Monter / Descendre ».
5. « clavier : Ctrl+↓ move +1 ; Suppr remove et propagation arrêtée ; Échap rend le focus ».
6. « segments Mode : portrait appelle setLayout ; PDF fixé : infobulle cadre fixé par le fond PDF ».
7. « taille Grandes : miniatures 220 px et setSidebar appelé ».
8. « cibles ≥ 44 px (min-block-size des boutons) ».
`App.test.tsx` : « barre latérale à side-start, data-toolbar pages, #pages et page-prev/next dans la barre d'outils »
(mise à jour `:358-361`, `:471`) ; « setDock(…, "pages", "bottom") rend flottant » (`:372`) ; « aucun îlot bas-centre » ;
« page-number ouvre la barre sur Pages ». `rb-css.test.ts:251-253` mis à jour.

**Commande bornée** : `cd /home/adminjd/projets/roomboard-wt/personnalisation-1a--T10 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/SideBar.test.tsx src/ui/App.test.tsx src/ui/rb-css.test.ts --reporter=verbose 2>&1 | grep -E "barre latérale|Tests |FAIL" | tail -10` ;
puis la suite web entière `nice -n 10 pnpm --filter @roomboard/web exec vitest run 2>&1 | tail -6` (aucun `FAIL`) et
`nice -n 10 pnpm -r build 2>&1 | tail -5` code 0. Contrôle rapide à la main dans le navigateur headless (skill
`agent-browser` si présent) : lecture `document.querySelector('[data-island="pages"]').dataset.anchor === "side-start"`.

**Contraintes** : GC1 ; GC2 (cibles ≥ 44 px, appui long 500 ms, glisser aux événements de pointeur, jamais HTML5
drag) ; GC3 (table 2 bis : chaque geste a son raccourci) ; GC4 (icônes posées par T6, aucune nouvelle sans notice) ;
GC5 ; GC6 ; GC9 ; GC10 ; GC11 (règles CSS à côté de `.rb-pages-*`) ; GC12.

**Interdits** : onglet Calques (lot 2) ; `draggable` ; écrire le profil au geste.

**Terminé** : tests verts, suite web verte, build vert.

**Étapes** : (1) tests 1-2 rouges, squelette `SideBar` ; (2) tests 3-5 (gestes) ; (3) tests 6-8 ; (4) `App.tsx`
(câblage, retrait de `PagesBar`), `App.test.tsx` ; (5) `rb.css` ; (6) suite, build ; (7) commit
`feat(ui): floating side bar with pages tab, replaces bottom pages bar`.

---

### Tâche T11 — Essais existants : sélecteurs adaptés (`clickItem`, `pageTo`)
<a id="tache-t11"></a>

**Objectif** : les essais qui touchent `page-add`/`page-remove` ou une miniature passent par une aide qui déplie la
barre latérale repliée ; écrits pour marcher **avant et après** T10 (décision 32 ; S3).

**Fichiers** : `scripts/essais/commun.mjs`, `c13-tableaux-navigateur.mjs`, `c13-fidelite.mjs`,
`c4-bibliotheque-navigateur.mjs`, `s34-navigateur.mjs`, `s5b-navigateur.mjs`, `c11b-capture-navigateur.mjs`,
`design-l4-navigateur.mjs`, `design-l2-navigateur.mjs`.

**Interfaces**
- Produit (`commun.mjs`, à côté d'`openMenuOf` `:104-110`) :
  `export async function openSideOf(page, sel)` : si `[data-island="pages"][data-collapsed="1"]` contient `sel`, touche
  son `[data-island-collapse]` et attend `data-collapsed` absent ; sinon rien ;
  `clickItem(page, id)` appelle `openSideOf(page, item(id))` avant le clic ;
  `export async function pageTo(page, n)` : `openSideOf` sur `.rb-pages-list`, touche `.rb-pages-list [data-page="n"]`,
  attend `#stage[data-page]` = n, replie si elle était repliée.
- Réutilise : `scripts/essais/commun.mjs:104-115` `openMenuOf`, `clickItem` — `clickItem(page, id)` déplie aussi la barre latérale ; `pageTo(page, n)` à côté.

**Adaptations** (sélecteurs seulement, GC6) : `c13-tableaux:222`, `:314-320`, `:375-380`, `:458-462` et
`c13-fidelite:63` → `pageTo` ; `c4:125`, `:144`, `:153`, `s5b:220`, `:223`, `c11b:122`, `design-l4:217` →
`clickItem` ; `s34:41-44` (`edit`), `:98-99`, `:314-320`, `:326-329` → `openSideOf` d'abord, `:322` (`isDisabled`) lu
barre dépliée ; `design-l2` S6 (`:533-542`) : `page-add` par `clickItem`, barre dépliée, défilement vertical
(`scrollHeight`) ; `design-l2` S5 (`:459`) : `collapsed === false` contrôlé pour les barres hors `pages` seulement (H1).
À garder verts sans retouche : `design-l2:229-241` (S1, OF83), `:39`, `:55`, `:215`, `:247` ; `design-l4:81`, `:150` ;
`s34:93`, `:106-107`, `:207`, `:216`, `:312` ; `s5b:98-100`, `:239-242` ; `c11b:124-214` ; `c16-office:107` ;
`c12-pdf` ; `c3-groupes:86-180`, `c15-3d:286`, `c13-tableaux:301`, `design-l1:43` ; `c9-grille-navigateur.mjs`.

**Preuve** : sur la branche de T11 (avant T10), chaque essai listé joué seul :
`cd /home/adminjd/projets/roomboard-wt/personnalisation-1a--T11 && node ~/.claude/scripts/vm/suite-vm.cjs -- nice -n 10 node scripts/essais/<essai>.mjs 2>&1 | tail -3`
(sa ligne finale `OK`, après `pnpm -r build` sous `nice -n 10`) ; puis, une fois T10 fusionnée (l'orchestrateur
fusionne T10 puis rejoue, ou la tâche fusionne `feat/personnalisation-1a` dans sa branche locale), les mêmes essais
plus `c3-groupes`, `c9-grille`, `c12-pdf`, `c16-office`, `design-l1` : ligne `OK` chacun. Lister dans le rapport la
commande et la dernière ligne de chaque essai.

**Contraintes** : GC1 (`nice -n 10`, un seul essai lourd à la fois) ; GC6 (seuls les sélecteurs s'adaptent) ; GC9 ;
GC10 ; GC12.

**Interdits** : changer une assertion de fond (seul `design-l2` S5 est restreint, par décision H1) ; toucher
`verifier.sh` (T12).

**Terminé** : tous les essais listés `OK` avant et après T10.

**Étapes** : (1) `openSideOf`, `clickItem`, `pageTo` ; (2) essais `c13-*`, `c4`, `s5b`, `c11b`, `design-l4` ;
(3) `s34` ; (4) `design-l2` S5, S6 ; (5) jeu avant T10 ; (6) commit `test(e2e): open side bar before page actions` ;
(7) jeu après T10.

---

### Tâche T12 — Intégration lot 1 : essai neuf S1/S2/S3/S5, `verifier.sh --e2e`, captures 2x, netteté
<a id="tache-t12"></a>

**Objectif** : prouver le lot 1 de bout en bout : essai Playwright neuf qui joue S1, S2, S3, S5 au doigt (CDP
`Input.dispatchTouchEvent`, patron `design-l3-navigateur.mjs:271`), suite complète, captures avant/après, netteté
(décision 36).

**Fichiers** : `scripts/essais/personnalisation-1a-navigateur.mjs` (neuf), `scripts/verifier.sh` (une ligne après
`design-l4`), `docs/design/captures/personnalisation-1a/` (neuf).

**Interfaces**
- Consomme : tout le lot 1 ; `commun.mjs` (`clickItem`, `pageTo`, `openSideOf`, `serve`) ; `nettete.mjs`
  (`edgeRow`, `fringes`, `offSegment`).
- Réutilise : `scripts/essais/commun.mjs:104-115` — `clickItem(page, id)`, `pageTo(page, n)` (posés par T11).

**Essai neuf** (une ligne `S<n> — ok` par scénario, `personnalisation-1a : OK` à la fin, sortie non nulle au premier
écart) :
- **S1** (cadrage § 6) : fichier écrit par `node apps/cli/dist/roomboard.mjs new` (temporaire) ouvert →
  `#stage[data-page-mode="landscape"]` ; grille à carreaux ; onglet Pages, segment Infini ; deux doigts 600 px ; trait
  à gauche et au-dessus de l'origine, pixels de grille lus dans la zone ; « Ajuster la page » : trait dans la vue ;
  page ajoutée, Portrait : rapport hauteur/largeur du cadre ≈ 1,78 ; Ctrl+Z : `landscape` ; enregistrer, rouvrir :
  page 1 `infinite`, page 2 `landscape`.
- **S2** : trois pages par `clickItem("page-add")` ; glisser la miniature 3 au-dessus de la 1 (pointeur) → ordre
  `data-page-id` 3, 1, 2 ; Ctrl+Z → 1, 2, 3 ; appui long miniature 2 → Dupliquer → 4 pages, copie en 3 ; Retirer → 3 ;
  taille Grandes, recharger : même taille ; replier, recharger : repliée ; éditeur : À droite, Repliée décochée, Page
  neuve Infini, enregistrer → `data-anchor="side-end"`, ouverte, page ajoutée `infinite` ; export `.rbprofile` porte
  `anchor: "side-end"`, `collapsed: false`, `behavior.pageMode: "infinite"`.
- **S3** : barre d'outils porte `page-prev`, `#pages` « 1 / 1 », `page-next` ; aucun îlot `data-anchor="bottom-center"` ;
  Suivante → « 2 / 2 » ; Ctrl+Z → « 1 / 1 » ; `#pages` → barre ouverte sur Pages ; haut de page ajustée sous les îlots
  du haut, barre ouverte et repliée (même valeur que `design-l2` S1).
- **S5** : `PageDown` jusqu'à la dernière puis une fois : page ajoutée ; touche tenue (`repeat`) : une seule ;
  `PageUp` revient ; Ctrl+M, Ctrl+Maj+D ; Ctrl+Maj+P → focus sur la miniature montrée ; Ctrl+↓ la descend ; Suppr la
  retire (aucun objet sélectionné supprimé) ; Échap rend le focus ; Tab jusqu'au mode, → : portrait ; dans un texte
  ouvert, `PageDown` et Ctrl+M sans effet de page.

**Preuve visuelle** : lectures d'abord, dans l'essai :
`-Lire "data-page-mode=infinite"`, `-Lire "[data-island=pages].data-anchor=side-start"`, `-Lire "#pages=1 / 1"`,
`-Lire "[data-island=pages].data-collapsed=1"` ; puis captures 1920 × 1080 à `deviceScaleFactor: 2`, **avant** (sur
un worktree détaché à 45484db : `git -C /home/adminjd/projets/roomboard-wt/personnalisation-1a worktree add --detach ~/projets/roomboard-wt/personnalisation-1a--avant 45484db`,
retiré après) et **après** : tableau, barre latérale ouverte, repliée, mode infini, portrait, éditeur de profils →
`docs/design/captures/personnalisation-1a/{avant,apres}-<vue>@2x.png`, chacune décrite en une ligne au rapport.
Netteté (§ 10 de `docs/plans/design-cadrage.md`, patron `design-l4-navigateur.mjs`) : `edgeRow` sur une ligne de
l'icône `rectangle-horizontal` à 2x : `intermediate === 0` sur le bord droit.

**Commande bornée** : `cd /home/adminjd/projets/roomboard-wt/personnalisation-1a--T12 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && node ~/.claude/scripts/vm/suite-vm.cjs -- nice -n 10 bash scripts/verifier.sh --e2e 2>&1 | tail -30`
(motifs : `personnalisation-1a : OK`, `verifier.sh : e2e OK`, `verifier.sh : OK` ; aucun `FAIL `, `test result: FAILED`,
`error[`) ; compter les lignes `ok — ` (référence 1204) et les tests (cargo 1356, cli 263, web 3628 à 45484db) : le
rapport donne les nouveaux nombres ; tailles Wasm principal ≤ 1 572 864, formats ≤ 3 145 728 (chiffres au rapport).

**Contraintes** : GC1 (`nice -n 10`, `suite-vm.cjs`, PATH cargo) ; GC2 (gestes au doigt par CDP, jamais HTML5 drag) ;
GC6 ; GC8 ; GC9 ; GC10 ; GC12 ; un seul build Tauri à la fois (aucun ici).

**Interdits** : corriger le code d'une autre tâche sans le dire : un échec est rapporté avec sa tâche d'origine ; écrire
un fichier de Jérôme.

**Terminé** : `verifier.sh --e2e` OK, captures et lectures au rapport, netteté 0 intermédiaire.

**Étapes** : (1) S3 et S5 (sans fichier) ; (2) S1 ; (3) S2 ; (4) ligne `verifier.sh` ; (5) captures avant/après,
netteté ; (6) suite complète ; (7) commit `test(e2e): personnalisation 1a scenarios, captures`.

---

### Tâche T13 — Lot 2 — `Restack` : cœur, pont, faux cœur, CLI (fusion après T12)
<a id="tache-t13"></a>

**Objectif** : `Restack { ids, to }` : les ids (une même page) remontent en bloc, ordre relatif gardé, `to` = rang du bas
du bloc dans la pile finale (0 = arrière-plan) ; ids gardés (DA2) ; une étape ; même ordre : aucune étape ; pages
mêlées : `MixedPages` (décision 16).

**Fichiers** : `crates/roomboard-core/src/commands.rs`, `copy.rs` (tests seulement si besoin),
`crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/api.ts`, `core/wasm-core.ts`, `core/fake-core.ts`,
`core/fake-core.test.ts`, `apps/cli/src/ops.ts`, `apps/cli/src/ops.test.ts`, `scripts/essais/cli-essai.mjs`.

**Interfaces**
- Produit : `Command::Restack { ids: Vec<String>, to: u32 }` **après `DuplicatePage`** ; `CommandError::MixedPages`
  (après `BadIndex`, message « objets de pages différentes ») ; TS `{ type: "Restack"; ids: readonly string[]; to: number }`
  après `DuplicatePage` ; `lib.rs` `restack(ids: Vec<String>, to: u32)` ; `COMMAND_TYPES` après `"DuplicatePage"`.
- Réutilise : `crates/roomboard-core/src/copy.rs:61` ; patron `commands.rs:1905` — `reinsert_kept(arr, txn, moves, to)` (posé par T1).

**Code à écrire** :

```rust
fn cmd_restack(&mut self, ids: &[String], to: u32) -> Result<Change, CommandError> {
    // 1. lecture fermée : page commune, index courants, prélims (ids gardés)
    let (page, mut moves, len) = {
        let txn = self.doc.transact();
        /* pour chaque id : FoundElement (page, index) ; inconnu → UnknownElement ; page différente → MixedPages */
        /* moves trié par index croissant (ordre relatif gardé) ; len = nombre d'éléments de la page */
    };
    let n = moves.len() as u32;
    if n == 0 || to + n > len { return Err(CommandError::BadIndex); }
    let current: Vec<u32> = moves.iter().map(|(i, _)| *i).collect();
    if current == (to..to + n).collect::<Vec<_>>() { return /* forme D38 */; }
    {
        let mut txn = self.transact_local();
        let arr = /* tableau `elements` de la page */;
        reinsert_kept(&arr, &mut txn, moves, to);
    }
    Ok(self.done(Change { pages: vec![page], ids: ids.to_vec(), ..Default::default() }))
}
```

**Tests rouges d'abord** : `restack_block_to_front_keeps_order_and_ids`, `restack_to_back`, `restack_same_order_no_step`,
`restack_mixed_pages_refused`, `restack_one_step_undo`, `restack_out_of_range_bad_index` ; faux cœur « Restack » (mêmes
cas) ; CLI `ops.test.ts` « Restack lu » ; `cli-essai.mjs` bloc « personnalisation-1a calques » après le bloc de T7 :
une étape, refus code 1 pour deux pages mêlées.

**Commande bornée** : `cd /home/adminjd/projets/roomboard-wt/personnalisation-1a--T13 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && nice -n 10 cargo test -p roomboard-core restack -j 4 2>&1 | tail -5` (≥ 5) ;
`nice -n 10 pnpm --filter @roomboard/web exec vitest run src/core/fake-core.test.ts -t Restack 2>&1 | tail -6` ;
`tsc --noEmit` web et CLI ; build Wasm et taille ≤ 1 572 864 ; CLI construite, `node scripts/essais/cli-essai.mjs 2>&1 | tail -3` (`CLI : OK`).

**Contraintes** : GC1 ; GC5 ; GC7 ; GC8 ; GC9 ; GC10 ; GC11 (variantes après `DuplicatePage`, pas en fin de liste).

**Interdits** : fusionner dans `feat/personnalisation-1a` avant T12 ; toucher `ui/`.

**Terminé** : tests verts, `CLI : OK`, taille Wasm au rapport.

**Étapes** : (1) tests Rust rouges ; (2) `cmd_restack`, verts ; (3) pont, `api.ts`, faux cœur ; (4) CLI et
`cli-essai.mjs` ; (5) commit `feat(core): restack command`.

---

### Tâche T14 — Lot 2 — onglet Calques, Premier plan / Arrière-plan, raccourcis d'ordre, essai S4
<a id="tache-t14"></a>

**Objectif** : onglet Calques de la barre latérale (premier plan en haut, un groupe = une ligne, lignes fixes
« Grille » et « Fond de la page »), sélection depuis la liste, glisser pour réordonner, boutons de la rangée
Sélection, raccourcis Ctrl+↑/↓ et Ctrl+Maj+↑/↓, Ctrl+Maj+L (décisions 16, 17, 27 ; H9, H14).

**Fichiers** : `apps/web/src/app/layer-list.ts` (neuf), `layer-list.test.ts` (neuf), `ui/SideBar.tsx`,
`SideBar.test.tsx`, `ui/SelectionRow.tsx`, `SelectionRow.test.tsx`, `app/toolbar-host.ts`, `engine/engine.ts`,
`engine.test.ts`, `engine/input/keys.ts`, `keys.test.ts`, `apps/web/src/main.ts`, `ui/icons.ts`,
`THIRD_PARTY_NOTICES.md`, `ui/rb.css`, `scripts/essais/personnalisation-1a-navigateur.mjs`,
`docs/design/captures/personnalisation-1a/`.

**Interfaces**
- Produit : `layer-list.ts` : `export interface LayerRow { readonly key: string; readonly ids: readonly string[]; readonly label: string; readonly kind: string; readonly fixed: boolean }`
  `export function layerRows(doc: CoreDocument, page: string): readonly LayerRow[]` (premier plan d'abord ; groupe
  extérieur = une ligne « Groupe (n) » ; « Grille » à sa place selon `above`, « Fond de la page » en bas, `fixed: true`) ;
  `Engine.select(ids: readonly string[]): void`, `Engine.restack(ids: readonly string[], to: number): boolean`,
  `Engine.bringToFront(): boolean`, `Engine.sendToBack(): boolean` ; `keys.ts` :
  `export type OrderKey = "up" | "down" | "front" | "back"; export function orderKey(e: KeyLike): OrderKey | null`
  (Ctrl/Cmd+↑/↓, Ctrl/Cmd+Maj+↑/↓) ; actions `layer-front` « Premier plan », `layer-back` « Arrière-plan » rendues
  par la rangée Sélection (hors catalogue) ; icônes Lucide `layers`, `bring-to-front`, `send-to-back`.
- Réutilise : `SelectionTool.setSelection` (`apps/web/src/engine/engine.ts:189`) — `Engine.select(ids: readonly string[]): void`.
- Réutilise : `apps/web/src/ui/sort-drag.ts:35` — `startSortDrag(e, { rows, scroller, from, moved, drop, tap, cancel })`.
- Réutilise : `apps/web/src/engine/input/keys.ts:25` `keyAction` — `orderKey(e: KeyLike): OrderKey | null`.
- Nouveau module (aucun existant, cadrage) : `app/layer-list.ts` — `layerRows(doc: CoreDocument, page: string): readonly LayerRow[]`.

**Tests rouges d'abord** : `layer-list.test.ts` « premier plan d'abord », « groupe = une ligne », « grille selon
above », « fond en bas » ; `SideBar.test.tsx` « onglet Calques ; toucher une ligne sélectionne ; Ctrl+toucher ajoute ;
glisser une ligne appelle restack » ; `SelectionRow.test.tsx` « Premier plan / Arrière-plan » ; `keys.test.ts`
« orderKey » ; `engine.test.ts` « bringToFront une étape ». Essai : bloc **S4** dans
`personnalisation-1a-navigateur.mjs` (rectangle, ellipse qui le chevauche, texte ; lignes ; sélection
`#stage[data-selection="1"]` ; glisser en haut → pixels du rectangle au chevauchement ; Ctrl+Z → ellipse ; groupe de
deux : « Groupe (2) » ; Arrière-plan) et bloc S5 lot 2 (Ctrl+Maj+L, Ctrl+Maj+↑, Ctrl+↓) ; ligne `S4 — ok`.

**Commande bornée** : `cd /home/adminjd/projets/roomboard-wt/personnalisation-1a--T14 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app/layer-list.test.ts src/ui/SideBar.test.tsx src/ui/SelectionRow.test.tsx src/engine/input/keys.test.ts src/engine/engine.test.ts --reporter=verbose 2>&1 | grep -E "orderKey|Calques|Tests |FAIL" | tail -10` ;
puis `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && node ~/.claude/scripts/vm/suite-vm.cjs -- nice -n 10 bash scripts/verifier.sh --e2e 2>&1 | tail -30`
(`S4 — ok`, `personnalisation-1a : OK`, `verifier.sh : OK`) ; captures `apres-calques@2x.png` ; lecture
`-Lire "[data-tab=calques].aria-selected=true"`.

**Contraintes** : GC1 ; GC2 (cibles ≥ 44 px, glisser aux événements de pointeur, jamais HTML5 drag) ; GC3 ; GC4
(icônes Lucide et notice) ; GC5 ; GC6 ; GC9 ; GC10 ; GC11 (actions et icônes à côté de celles de page) ; H14 : lignes
calculées seulement onglet montré, relues pour les seuls ids de `Change.ids`.

**Interdits** : masquer et verrouiller (DA8) ; toucher le cœur (T13).

**Terminé** : tests verts, suite complète verte avec `S4 — ok`.

**Étapes** : (1) `layerRows` ; (2) moteur et `orderKey` ; (3) onglet Calques ; (4) rangée Sélection ; (5) essai S4 et
S5 lot 2 ; (6) suite complète, capture ; (7) commit `feat(ui): layers tab, bring to front, send to back`.

---

## Relecture du plan (auto-contrôle)

- Couverture du cadrage : décisions 1-36 réparties (3-7, 13, 14 → T1 ; 7, 19-22, 25, 27, 34 → T2 ; 10 → T3 ; 30, 33 →
  T4, T7 ; 20-23 → T5 ; 25-28 → T6 ; 9 → T7, T9 ; 5, 11, 12 → T9 ; 22-26 → T10 ; 32 → T11 ; 36 → T12 ; 16, 17 → T13,
  T14). 25 lignes « Modules à réutiliser ou à étendre » : chacune en ligne `Réutilise :` ou « Nouveau module » d'une
  section (T1 ×3, T2 ×4, T3 ×4, T4 ×1, T5 ×3, T6 ×3, T7 ×2, T8 ×2, T9 ×3, T10 ×7, T11 ×1, T12 ×1, T13 ×1, T14 ×4 ;
  répétitions voulues quand deux tâches consomment le même module).
- Effets de bord du cadrage → tests nommés : `page-next` ajoute (T6 test 1, T8 test 1, S3) ; page ancienne cadre 1080
  (T3 test 1, S1) ; grille bornée au cadre (T7 test 1, `c9-grille` en T11) ; barre du bas retirée (T10 `App.test`,
  T2 test 3, `design-l4` en T11) ; `pages` en bande flottante (T10 `App.test :372`) ; portrait ajusté entier (T3 test 3) ;
  `#pages` dans la barre d'outils (T10, `s34`, `s5b`, `design-l2` S6 en T11) ; `viewOf` (T8 test 4) ; îlots latéraux
  hors du haut (T3 test 4, `design-l2` S1 en T11 et S3 en T12) ; profil ancien (T2 test 1).
- Noms cohérents d'une tâche à l'autre : `PageLayout` (T2 → T4 → T8, T10), `pageFrame`/`pageLayoutOf`/`fitFor` (T3 →
  T8, T9), `reinsert_kept` (T1 → T13), `sideActions` (T2 → T10), `createPageThumbs`/`renderPageThumb` (T9 → T10),
  `toggleSidebar` (T8 → T10), `openSideOf`/`clickItem`/`pageTo` (T11 → T12).
- Écarts assumés : `reinsert_kept` prend `to` en plus de la signature du cadrage (T1) ; `FrameSource` structurel au lieu
  de `PageView` dans la signature de `pageFrame` (T3), pour démarrer avant T4 : `PageView` y entre tel quel.

**Review Focus** (chaque test est dans la section de la tâche qui possède le code) :
- T1 test 10 `move_page_keeps_contour_cache` — carte d'impact, cache des contours « non » touché.
- T1 test 7 `page_mode_reload_keeps_bytes` — U3, D25, persistance `.roomboard`.
- T2 test 1 « profil ancien de 45484db » — décision 19, effet de bord « profil ancien gagne la navigation ».
- T3 test 4 « îlot latéral » — décision 10, effet de bord OF83.
- T4 test 5 et T7 tests 1-3 — parité cœur ↔ faux cœur de la grille (décisions 9, 33).
- T9 tests 1-2 — parité des deux rendus (DA4).
- T8 test 6 « PageDown tenu : une seule page » — H7, S5.
- T11 — `design-l2` S5 restreint aux barres hors `pages` (H1).
