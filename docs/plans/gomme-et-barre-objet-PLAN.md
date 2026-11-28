# Gomme unique et barre d'objet (OG41) — plan d'exécution

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**Goal :** une seule gomme dont l'effet dépend de ce qu'elle touche (trait coupé, objet effacé, tableau épargné), le
tableau supprimable par son menu de case, et une barre d'objet en icônes, petite, collée à la sélection.

**Architecture :** L1 garde la gomme en TS sur l'API existante du cœur (`hitTest` au premier plan, `Erase` partiel,
`Delete`, une étape par `runAll`) et retire l'action `eraser-mode`. L2 ajoute une source unique de ce qui entoure le cadre
(`overlayKeepOut`), un placement pur (`placeObjectBar`), puis un composant Solid `ObjectBar` monté par portail dans
`.rb-stages`, qui remplace la rangée Sélection (réduite à « Coller »).

**Tech Stack :** TypeScript, Solid, Vitest (happy-dom), Playwright (essais, VM seulement).

**Spec :** `docs/plans/gomme-et-barre-objet-cadrage.md`

## Table des tâches

| id | lot | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | L1 | Retirer l'action `eraser-mode` (une seule gomme) | — | apps/web/src/toolbar.ts, apps/web/src/toolbar.test.ts, apps/web/src/toolbar-profiles.ts, apps/web/src/toolbar-profiles.test.ts, apps/web/src/ui/item-state.ts, apps/web/src/ui/item-state.test.ts, apps/web/src/ui/icons.ts, apps/web/src/ui/icons.test.ts, apps/web/src/app/toolbar-host.ts, apps/web/src/app/toolbar-host.test.ts, apps/web/src/app/annotation-page.ts, apps/web/src/app/annotation-page.test.ts, apps/web/src/ui/App.test.tsx, apps/web/src/ui/Toolbar.test.tsx, apps/web/src/ui/ProfileEditor.test.tsx, apps/web/src/ui/MenuBar.test.tsx, apps/web/src/ui/SelectionRow.test.tsx, apps/web/src/ui/PointerSwitch.test.tsx, apps/web/src/ui/SideBar.test.tsx, apps/web/src/ui/FormatRow.test.tsx, apps/web/src/platform/annotation-tauri.test.ts, apps/web/src/platform/annotation-fake.ts, THIRD_PARTY_NOTICES.md, docs/design/charte.md, scripts/essais/design-l3-navigateur.mjs | (partagé) | implementeur-tdd | vitest toolbar.test.ts ≥ 1 test `action retirée lue sans avertissement` | S1, S4 | #tache-t1 |
| T2 | L1 | Gomme selon l'objet touché, une étape | T1 | apps/web/src/engine/tools/eraser.ts, apps/web/src/engine/tools/eraser.test.ts, apps/web/src/engine/tools/tool.ts, apps/web/src/engine/engine.ts, apps/web/src/engine/engine.test.ts, apps/web/src/app/stage-tags.test.ts, apps/web/src/ui/App.test.tsx, scripts/essais/s2-navigateur.mjs | (partagé) | concepteur-critique | vitest eraser.test.ts ≥ 1 test `objets entiers` + engine.test.ts `un annuler rend traits et objets` | S2, S4 | #tache-t2 |
| T3 | L1 | « Supprimer le tableau » dans le menu de case | — | apps/web/src/ui/cell-menu.ts, apps/web/src/ui/cell-menu.test.ts, apps/web/src/engine/tools/table.ts, apps/web/src/engine/tools/table.test.ts | isolé | implementeur-tdd | vitest table.test.ts ≥ 1 test `Supprimer le tableau` | S3 | #tache-t3 |
| T4 | L1 | Essai `gomme-objets` et captures 2x du lot L1 | T1, T2, T3 | scripts/essais/gomme-objets-navigateur.mjs, scripts/verifier.sh, scripts/tests/verifier-e2e.test.sh, docs/design/captures/gomme-et-barre-objet/ | (partagé) | implementeur-tdd | `bash scripts/tests/verifier-e2e.test.sh` → `verifier-e2e.test.sh : OK` ; `node --check` | S1, S2, S3, S4 | #tache-t4 |
| T5 | L2 | Ce qui entoure le cadre : `overlayKeepOut`, `selectionKeepOut` | T4 | apps/web/src/engine/render/overlay.ts, apps/web/src/engine/render/overlay.test.ts, apps/web/src/engine/tools/handles.ts, apps/web/src/engine/engine.ts, apps/web/src/engine/engine.test.ts | (partagé) | concepteur-critique | vitest overlay.test.ts ≥ 1 test `overlayKeepOut` | S5 | #tache-t5 |
| T6 | L2 | Placement pur `placeObjectBar` | T4 | apps/web/src/ui/island-place.ts, apps/web/src/ui/island-place.test.ts | isolé | implementeur-tdd | vitest island-place.test.ts ≥ 1 test `placeObjectBar` | S6 | #tache-t6 |
| T7 | L2 | Composant `ObjectBar` (icônes, « … », clavier, tactile) | T6 | apps/web/src/ui/object-bar.ts, apps/web/src/ui/object-bar.test.ts, apps/web/src/ui/ObjectBar.tsx, apps/web/src/ui/ObjectBar.test.tsx, apps/web/src/ui/icons.ts, apps/web/src/ui/icons.test.ts, apps/web/src/ui/MenuBar.tsx, apps/web/src/ui/rb.css, apps/web/src/ui/rb-css.test.ts, apps/web/src/ui/shortcuts.ts, apps/web/src/ui/shortcuts.test.ts, apps/web/src/engine/input/keys.ts, apps/web/src/engine/input/keys.test.ts, apps/web/src/app/toolbar-host.ts, apps/web/src/app/toolbar-host.test.ts, apps/web/src/app/workspace.ts, apps/web/src/app/workspace.test.ts, THIRD_PARTY_NOTICES.md | (partagé) | concepteur-critique | vitest ObjectBar.test.tsx ≥ 1 test `appui long` | S5, S7 | #tache-t7 |
| T8 | L2 | Obstacles des îlots ; Dupliquer et Supprimer quittent le panneau | T4 | apps/web/src/ui/Island.tsx, apps/web/src/ui/Island.test.tsx, apps/web/src/ui/OptionsPanel.tsx, apps/web/src/ui/OptionsPanel.test.tsx | isolé | implementeur-tdd | vitest Island.test.tsx ≥ 1 test `islands()` | S6 | #tache-t8 |
| T9 | L2 | Montage : barre dans `.rb-stages`, rangée Sélection réduite à « Coller » | T5, T7, T8 | apps/web/src/ui/App.tsx, apps/web/src/ui/App.test.tsx, apps/web/src/ui/SelectionRow.tsx, apps/web/src/ui/SelectionRow.test.tsx, apps/web/src/ui/Toolbar.tsx, apps/web/src/ui/Toolbar.test.tsx, apps/web/src/app/board-session.ts, scripts/essais/c3-groupes-navigateur.mjs, scripts/essais/personnalisation-1a-navigateur.mjs, scripts/essais/personnalisation-2-navigateur.mjs | (partagé) | implementeur-tdd | vitest SelectionRow.test.tsx ≥ 1 test `un seul bouton icône` + App.test.tsx `barre d'objet montée` | S5, S8 | #tache-t9 |
| T10 | L2 | Essai `barre-objet` et captures 2x du lot L2 | T9 | scripts/essais/barre-objet-navigateur.mjs, scripts/verifier.sh, scripts/tests/verifier-e2e.test.sh, docs/design/captures/gomme-et-barre-objet/ | (partagé) | implementeur-tdd | `bash scripts/tests/verifier-e2e.test.sh` → `verifier-e2e.test.sh : OK` ; `node --check` | S5, S6, S7, S8 | #tache-t10 |

Vagues : L1 = {T1, T3} → T2 → T4 ; L2 = {T5, T6, T8} → T7 → T9 → T10. Les lots se ferment l'un après l'autre (L2 part
après la fusion locale de L1 : T5, T6 et T8 dépendent de T4).

## Carte des fichiers

| fichier | rôle | tâche |
|---|---|---|
| `apps/web/src/toolbar.ts` | `eraser-mode` hors d'`ACTION_TABLE` et d'`ANNOTATION_REMOTE_ACTIONS` ; `RETIRED_ACTIONS` | T1 |
| `apps/web/src/toolbar-profiles.ts` | profils livrés sans `eraser-mode` (tableau, annotation) | T1 |
| `apps/web/src/ui/item-state.ts` | `ToolbarView.eraserMode` et son état retirés | T1 |
| `apps/web/src/ui/icons.ts` | `eraser-part` et `ACTION_ICONS["eraser-mode"]` retirés (T1) ; `group`, `ungroup`, `clipboard-paste`, `ellipsis`, `image` (T7) | T1, T7 |
| `apps/web/src/app/toolbar-host.ts` | action `eraser-mode` retirée (T1) ; `SelectionAction` + `duplicate`, `delete` (T7) | T1, T7 |
| `apps/web/src/app/annotation-page.ts` | `viewOf` sans `eraserMode` | T1 |
| `apps/web/src/engine/tools/eraser.ts` | règle D2-D8 : candidats, premier plan, `runAll` | T2 |
| `apps/web/src/engine/tools/tool.ts` | `ToolContext.runAll?` | T2 |
| `apps/web/src/engine/engine.ts` | `eraserMode` retiré, `ctx.runAll` (T2) ; `selectionKeepOut()` (T5) | T2, T5 |
| `apps/web/src/ui/cell-menu.ts`, `engine/tools/table.ts` | entrée `delete-table` | T3 |
| `scripts/essais/gomme-objets-navigateur.mjs` | essai neuf S1-S4, captures | T4 |
| `apps/web/src/engine/render/overlay.ts` | `overlayKeepOut`, `ScreenRect`, `ElementBadges` | T5 |
| `apps/web/src/engine/tools/handles.ts` | portées de « Déplacer » exportées | T5 |
| `apps/web/src/ui/island-place.ts` | `placeObjectBar`, `OBJECT_BAR_GAP`, `ObjectBarPlace` | T6 |
| `apps/web/src/ui/object-bar.ts` | `OBJECT_ACTIONS`, `objectActionShown`, `playObjectAction` (pur) | T7 |
| `apps/web/src/ui/ObjectBar.tsx` | composant de la barre (nouveau module du cadrage) | T7 |
| `apps/web/src/ui/MenuBar.tsx` | `MENU_STEP` exporté | T7 |
| `apps/web/src/ui/rb.css` | `.rb-object-bar` | T7 |
| `apps/web/src/ui/shortcuts.ts`, `engine/input/keys.ts` | ligne `object-bar`, `objectMenuKey` | T7 |
| `apps/web/src/app/workspace.ts` | `duplicate`, `delete` relayés au moteur | T7 |
| `apps/web/src/ui/Island.tsx` | `extra(sideStart, above, islands)` | T8 |
| `apps/web/src/ui/OptionsPanel.tsx` | Dupliquer et Supprimer retirés (D33) | T8 |
| `apps/web/src/ui/App.tsx` | monte `ObjectBar` | T9 |
| `apps/web/src/ui/SelectionRow.tsx` | « Coller » seul (D22) | T9 |
| `scripts/essais/barre-objet-navigateur.mjs` | essai neuf S5-S8, captures | T10 |

## Global Constraints

- G1 Machine : le code TS s'écrit et se teste sur le Mac. Pas de Rust, pas de `cargo` sur le Mac ; aucune modification Rust (cadrage D9).
- G2 Tests web : `cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet/apps/web && npx -y pnpm@12.18.0 exec vitest run <fichiers>` ; suite : `cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet && ROOMBOARD_WASM_REQUIRED=1 npx -y pnpm@12.18.0 --filter @roomboard/web test 2>&1 | grep -E "Test Files|Tests  |FAIL"`. Référence : 4742 passés, 1 rouge déjà sur main au Mac (`src/app/profile-actions.test.ts` « fichier hostile imbriqué à l'excès », propre au Node du Mac) : non régression.
- G3 Typage : `cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet && npx -y pnpm@12.18.0 --filter @roomboard/web exec tsc --noEmit` (même commande que le `build` de `apps/web/package.json` : `tsc --noEmit`) ; sortie vide, code 0.
- G4 Essais navigateur (`scripts/essais/*.mjs`, Playwright) et `scripts/verifier.sh --e2e` : sur la VM seulement, joués par l'orchestrateur ; une tâche qui modifie un essai le dit dans son critère « terminé ».
- G5 TDD : test rouge d'abord. Aucun test désactivé, sauté, aucun seuil changé. Essais existants (sélecteurs `data-item`) verts sans réécriture de fond.
- G6 Design : `docs/plans/design-cadrage.md` (jetons, icônes Lucide du lot L1, netteté § 10, traits fins) ; cibles ≥ 44 px ; tactile d'abord (événements de pointeur, appui long) ; chaque geste a un raccourci.
- G7 Commits : messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers ajoutés un par un (jamais `git add -A`, `.`, ni `commit -a`).
- G8 La CLI et l'empreinte S6 ne sont pas touchées (cadrage D28, D29) : `apps/cli`, `FORMAT_LOTS`, `zone-s6-banc.test.ts`, `docs/essais/c8-porte-s6.md` inchangés.
- G9 Preuve bornée de chaque tâche : une commande vitest sur les fichiers de test de la tâche, `--reporter=verbose`, dont la sortie montre le nombre de tests passés et au moins un test nouveau nommé.
- G10 Garde de `src/ui` : aucune instruction `switch` (tables de prédicats) ; px entiers, jamais `translate(-50%)`.

## Review Focus

1. **Page d'encre seule** (cadrage D8 : « aucun candidat : aucune sonde ») : une gomme sur une page sans objet non-trait
   ne doit appeler aucun `hitTest` → test `page d'encre seule : aucun hitTest` (T2).
2. **Deux gommes en même temps sur le même objet** (D7, gomme à la paume et doigt, plusieurs pointeurs) : la seconde ne
   doit pas écrire un `Delete` d'un id déjà supprimé (refus du cœur, message d'erreur) → test `deux passes sur le même
   objet` (T2).
3. **Chemin long sur une image** (D8 : « au plus 8 appels hitTest par image, le reste au relâché ») : une image ne doit
   jamais coûter plus de 8 sondes, et rien ne doit être perdu au relâché → test `au plus 8 hitTest par image` (T2).
4. **Sélection vidée pendant que « … » est ouvert** (D21 : la barre suit l'état ; Annuler, Suppr) : liste et barre
   fermées sans erreur → test `sélection vidée, liste ouverte` (T7).
5. **Vue plus étroite que la barre** (D20 : « bornée à 8 px des bords ; px entiers ») : la barre ne sort pas de la vue
   et reste en px entiers même avec un cadre fractionnaire → test `vue plus étroite que la barre` (T6).

---

<a id="tache-t1"></a>
### Tâche T1 — Retirer l'action `eraser-mode` (une seule gomme)

**Objectif :** la barre ne montre qu'une gomme (l'outil `eraser`, même `data-item`, même icône). L'action « Gomme :
partielle / objet » disparaît des tables, des profils livrés, de l'état de la barre, de l'hôte et de la vue relayée à
l'annotation ; un ancien profil qui la porte la garde, la réécrit, ne la montre pas et n'émet aucun avis (D1, D11, D12).
L'icône dessinée `eraser-part`, sans autre usage, est retirée avec ses mentions.

**Fichiers :**
- Modifier : `apps/web/src/toolbar.ts:115-117,207-213,305-309,727`
- Modifier : `apps/web/src/toolbar-profiles.ts:113,152`
- Modifier : `apps/web/src/ui/item-state.ts:19-22,64-68`
- Modifier : `apps/web/src/ui/icons.ts:5,27,206`
- Modifier : `apps/web/src/app/toolbar-host.ts:39,99`
- Modifier : `apps/web/src/app/annotation-page.ts:64`
- Modifier : `THIRD_PARTY_NOTICES.md:619-620`, `docs/design/charte.md:85`
- Modifier (essai, G4) : `scripts/essais/design-l3-navigateur.mjs:46`
- Tests : `apps/web/src/toolbar.test.ts`, `toolbar-profiles.test.ts`, `ui/item-state.test.ts`, `ui/icons.test.ts`,
  `app/toolbar-host.test.ts`, `app/annotation-page.test.ts`, `ui/App.test.tsx`, `ui/Toolbar.test.tsx`,
  `ui/ProfileEditor.test.tsx`, `ui/MenuBar.test.tsx`, `ui/SelectionRow.test.tsx`, `ui/PointerSwitch.test.tsx`,
  `ui/SideBar.test.tsx`, `ui/FormatRow.test.tsx`, `platform/annotation-tauri.test.ts`, `platform/annotation-fake.ts`

**Interfaces :**
- Consomme : rien d'une autre tâche.
- Produit : `export const RETIRED_ACTIONS: ReadonlySet<string>` (`toolbar.ts`) ; `ToolbarView` sans `eraserMode` ;
  `HostTargets.engine()` sans `"setEraserMode"` dans son `Pick`. `EngineState.eraserMode` et `Engine.setEraserMode`
  restent en place jusqu'à T2 (qui les retire).
- Réutilise : `apps/web/src/toolbar.ts:305-309` (`ITEM_RULES.action`) — `RETIRED_ACTIONS: ReadonlySet<string>` testé avant `isKnownAction` ; l'élément n'est pas rendu (`KNOWN_BY_KIND.action`, `toolbar.ts:689`, inchangé)

**Test et commande bornée :**
`cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet/apps/web && npx -y pnpm@12.18.0 exec vitest run src/toolbar.test.ts src/toolbar-profiles.test.ts src/ui/item-state.test.ts src/ui/icons.test.ts src/app/toolbar-host.test.ts src/app/annotation-page.test.ts src/ui/App.test.tsx src/ui/Toolbar.test.tsx src/ui/ProfileEditor.test.tsx src/ui/MenuBar.test.tsx src/ui/SelectionRow.test.tsx src/ui/PointerSwitch.test.tsx src/ui/SideBar.test.tsx src/ui/FormatRow.test.tsx src/platform/annotation-tauri.test.ts src/app/profile-edit.test.ts --reporter=verbose 2>&1 | grep -E "Test Files|Tests  |FAIL|action retirée lue sans avertissement|une seule gomme"`
Attendu : `Test Files  16 passed`, `Tests  N passed` (N ≥ 1), les lignes `action retirée lue sans avertissement` et
`une seule gomme` présentes, aucune ligne `FAIL`.

**Contraintes (recopiées de Global Constraints) :**
- G1 Machine : le code TS s'écrit et se teste sur le Mac. Pas de Rust, pas de `cargo` sur le Mac ; aucune modification Rust.
- G2 Tests web : commande ci-dessus ; suite complète en fin de tâche (référence 4742 passés, 1 rouge propre au Mac : `profile-actions.test.ts` « fichier hostile imbriqué à l'excès »).
- G3 Typage : `npx -y pnpm@12.18.0 --filter @roomboard/web exec tsc --noEmit`, sortie vide.
- G4 Essais navigateur sur la VM seulement, joués par l'orchestrateur ; cette tâche modifie `design-l3-navigateur.mjs` (dit dans « terminé »).
- G5 TDD : test rouge d'abord ; aucun test désactivé ni sauté, aucun seuil changé ; essais existants (sélecteurs `data-item`) verts sans réécriture de fond.
- G6 Design : icônes Lucide du lot L1, netteté § 10 ; cibles ≥ 44 px.
- G7 Commits en anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers ajoutés un par un.
- G8 CLI et empreinte S6 non touchées.
- G10 Aucune instruction `switch` dans `src/ui`.

**Interdits :** toucher `engine/engine.ts`, `engine/tools/eraser.ts` (T2) ; retirer `eraser-mode` des fixtures
`src/fixtures/profil-45484db.rbprofile` et `src/fixtures/profils/defaut-avant-l4.rbprofile` (D12) ; modifier
`toolbar.test.ts:570-596` (« rien n'est retiré du fichier », doit rester vert tel quel) ; ajouter une lettre à la gomme
(D13, OG33).

**Critère « terminé » :** commande bornée verte ; `tsc --noEmit` vide ; suite complète sans nouveau rouge ;
`grep -rn "eraser-mode\|eraserMode\|eraser-part" apps/web/src --include='*.ts' --include='*.tsx' | grep -v "fixtures/\|engine/engine\|engine/tools/eraser\|RETIRED_ACTIONS\|toolbar.test.ts"` ne rend que les lignes de `engine.test.ts`, `stage-tags.test.ts` et `App.test.tsx:50,91` (laissées à T2) ;
essai modifié : `scripts/essais/design-l3-navigateur.mjs` (à jouer sur la VM). Rapport : `Réutilisation : appelé RETIRED_ACTIONS dans ITEM_RULES.action` ou `Réutilisation : écart — <pourquoi>`.

**Étapes :**

- [ ] **Étape 1 : écrire les tests rouges (toolbar.test.ts, icons.test.ts, Toolbar.test.tsx)**

Dans `apps/web/src/toolbar.test.ts`, ajouter `RETIRED_ACTIONS` à l'import depuis `./toolbar` (ligne 5-7), puis ajouter à
la fin du fichier :

```ts
describe("OG41 : action retirée eraser-mode (D12, U13, S4)", () => {
  it("action retirée lue sans avertissement : gardée et réécrite, jamais montrée", () => {
    const { profile, warnings } = ok(JSON.parse(OLD_45484DB));
    expect(warnings.filter((w) => w.includes("eraser-mode"))).toEqual([]);
    expect(RETIRED_ACTIONS.has("eraser-mode")).toBe(true);
    expect(ACTION_TABLE["eraser-mode"]).toBeUndefined();
    const tools = profile.toolbars.find((b) => b.role === "tools")!;
    expect(tools.groups.flatMap((g) => g.items).some((i) => i.action === "eraser-mode")).toBe(true);
    expect(visibleItems(tools, ALL).some((i) => i.action === "eraser-mode")).toBe(false);
    const ann = profile.toolbars.find((b) => b.role === "annotation");
    if (ann !== undefined) expect(visibleItems(ann, ALL).some((i) => i.action === "eraser-mode")).toBe(false);
    expect(JSON.stringify(serializeProfile(profile))).toContain('"eraser-mode"');
  });
  it("une action vraiment inconnue reste signalée", () => {
    const json = JSON.parse(OLD_45484DB.split('"action": "eraser-mode"').join('"action": "inconnue-og41"'));
    expect(ok(json).warnings).toContain("action inconnue masquée : inconnue-og41");
  });
});
```

Dans `apps/web/src/ui/icons.test.ts`, ajouter dans le premier `describe` :

```ts
  it("OG41 (D1) : une seule gomme : eraser-part et eraser-mode retirés de la table et de la notice", () => {
    expect(ICONS["eraser-part"]).toBeUndefined();
    expect(ACTION_ICONS["eraser-mode"]).toBeUndefined();
    expect(TOOL_ICONS.eraser).toBe("eraser");
    expect(NOTICE).not.toContain("`eraser-part`");
  });
```

Dans `apps/web/src/ui/Toolbar.test.tsx`, remplacer le test « libellé de l'état : gomme partielle » (l. 130-133) par :

```ts
  it("OG41 (D1) : une seule gomme : l'outil eraser, aucun bouton eraser-mode", () => {
    const { container } = setup();
    expect(container.querySelectorAll('button[data-item="eraser"]')).toHaveLength(1);
    expect(container.querySelector('button[data-item="eraser-mode"]')).toBeNull();
    expect(container.querySelector('[data-icon="eraser-part"]')).toBeNull();
  });
```

- [ ] **Étape 2 : lancer les trois fichiers, constater le rouge**

`cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet/apps/web && npx -y pnpm@12.18.0 exec vitest run src/toolbar.test.ts src/ui/icons.test.ts src/ui/Toolbar.test.tsx 2>&1 | grep -E "Test Files|Tests  |FAIL|✗|×" | head -20`
Attendu : `FAIL` sur `RETIRED_ACTIONS` (import absent : `undefined`), sur `ICONS["eraser-part"]` défini et sur le bouton `eraser-mode` présent.

- [ ] **Étape 3 : `toolbar.ts` — retirer l'action, poser `RETIRED_ACTIONS`**

Supprimer la ligne 116 `  "eraser-mode": { label: "Gomme : partielle" },` d'`ACTION_TABLE`.

Après `isKnownAction` (l. 211-213), ajouter :

```ts
/** OG41 (D12, U13) : actions retirées du catalogue ; un profil qui les porte les garde et les réécrit telles quelles,
 *  jamais montrées (`visibleItems` les masque comme toute action inconnue), sans avis. */
export const RETIRED_ACTIONS: ReadonlySet<string> = new Set(["eraser-mode"]);
```

Dans `ITEM_RULES.action` (l. 305-309), remplacer la ligne de l'avis par :

```ts
    else if (!isKnownAction(raw.action) && !RETIRED_ACTIONS.has(raw.action)) ctx.warnings.push(`action inconnue masquée : ${raw.action}`);
```

Ligne 727, remplacer par :

```ts
export const ANNOTATION_REMOTE_ACTIONS: ReadonlySet<ActionId> = new Set(["undo", "redo"]);
```

- [ ] **Étape 4 : profils livrés sans `eraser-mode`**

`apps/web/src/toolbar-profiles.ts:113`, remplacer le groupe `dessin` de la barre d'annotation par :

```ts
    { id: "dessin", items: [sep("ann-sep-1"), annTool("pen", "Stylo"), annTool("eraser", "Gomme"), annTool("arrow", "Flèche"), annTool("rect", "Rectangle"), annTool("text", "Texte")] },
```

`apps/web/src/toolbar-profiles.ts:152`, remplacer par :

```ts
      { id: "dessin", items: [sep("sep-1"), tool("pen", "Stylo"), tool("eraser", "Gomme")] },
```

- [ ] **Étape 5 : `item-state.ts`, `icons.ts`, `toolbar-host.ts`, `annotation-page.ts`**

`apps/web/src/ui/item-state.ts` : supprimer la ligne 21 `  readonly eraserMode: "partial" | "object";` de
`ToolbarView`, et l'entrée `"eraser-mode": (v) => ({ … }),` d'`ACTION_STATE` (l. 65-68, quatre lignes).

`apps/web/src/ui/icons.ts` : supprimer la ligne 27 (`"eraser-part": [...]`) et la ligne 206 (`"eraser-mode": "eraser-part",`) ;
ligne 5, remplacer `` (Lucide
// lucide-icons/lucide@7981a0798a ; `annotate`, `eraser-part`, `line` dessinées) `` par `` (Lucide
// lucide-icons/lucide@7981a0798a ; `annotate`, `line` dessinées) ``.

`apps/web/src/app/toolbar-host.ts:39` : retirer `"setEraserMode" | ` du `Pick<Engine, …>` ; supprimer la ligne 99
(`"eraser-mode": (t) => …`).

`apps/web/src/app/annotation-page.ts:64` : supprimer la ligne `    eraserMode: s.eraserMode,` de `viewOf`.

- [ ] **Étape 6 : notice et charte**

`THIRD_PARTY_NOTICES.md:619-620`, remplacer les deux lignes par :

```
- Dessinées pour RoomBoard dans le même style (grille de 24, trait 1,5) : `annotate`, `line`,
  `row-remove`, `col-remove`.
```

`docs/design/charte.md:85`, remplacer `` d'encre dedans), `eraser-part` (la gomme de Lucide, base en pointillés), `line` (segment diagonal) `` par `` d'encre dedans), `line` (segment diagonal) ``.

- [ ] **Étape 7 : tests existants qui citaient l'action ou le champ**

Mettre à jour exactement :
- `src/toolbar.test.ts:186` : retirer `"eraser-mode", ` de la liste.
- `src/toolbar-profiles.test.ts:37` : retirer `"eraser-mode", ` ; `:195` : retirer `"ann-eraser-mode", ` ; `:233` :
  retirer `"eraser-mode", ` de la liste attendue et, dans le titre du test l. 231, remplacer `Stylo, Gomme, Gomme : partielle` par `Stylo, Gomme`.
- `src/ui/item-state.test.ts` : retirer `eraserMode: "partial", ` des littéraux l. 8, 129, 156 ; supprimer les tests
  `eraser-mode : libellé et pressé suivent le mode` (l. 25-28) et `eraser-mode : aucune icône d'état dans les deux modes (H13)` (l. 192-195).
- `src/ui/icons.test.ts` : l. 52, retirer `"eraser-part", ` de `FROM_MOCKUP` ; l. 117, titre `les 35 icônes` → `les 34 icônes` ;
  l. 118-119, remplacer les deux lignes par `    for (const name of FROM_MOCKUP) expect(ICONS[name], name).toEqual(symbol(name));` ;
  l. 126, remplacer `ACTION_ICONS["eraser-mode"]` par `TOOL_ICONS.eraser` et `"eraser-part"` par `"eraser"` ; l. 149,
  retirer `; base de eraser-part en tirets d'au moins 2 unités` du titre ; supprimer les lignes 153-154 (`const dashes = …` et sa boucle).
- `src/app/toolbar-host.test.ts` : l. 6, remplacer la signature par
  `function setup(_over: Record<string, never> = {}, profile: Profile = BUILTIN_PROFILES[0]!) {` ; l. 8, retirer
  `setEraserMode: vi.fn(), ` ; l. 10, remplacer `state: vi.fn(() => ({ eraserMode: over.eraserMode ?? "partial" }))` par
  `state: vi.fn(() => ({}))` ; supprimer le test `eraser-mode bascule partial → object et inversement` (l. 132-137).
- `src/app/annotation-page.test.ts` : l. 32 et 390 et 402, retirer `eraserMode: "partial", ` ; l. 39, retirer
  `setEraserMode: vi.fn(), ` ; l. 396, retirer `"eraserMode", ` de la liste des clés.
- `src/ui/App.test.tsx` : l. 414, retirer `"eraser-mode", ` ; l. 681 et 698, retirer `eraserMode: "partial", ` ;
  l. 764-766, remplacer par :

```ts
    const pressed = () => container.querySelector<HTMLButtonElement>('[data-item="ann-undo"]')?.disabled;
    const before = pressed();
    a.view({ tool: "select", canUndo: true, canRedo: false, pageIndex: 0, pageCount: 1 });
    expect(pressed()).toBe(false);
```

  et la ligne suivante `expect(pressed()).toBe("true");` est remplacée par la ligne ci-dessus (`toBe(false)`) ; la fin du test
  (`expect(pressed()).toBe(before);`) reste. Ne pas toucher `App.test.tsx:50,91` (T2).
- `src/ui/ProfileEditor.test.tsx:204-215` : remplacer `"eraser-mode"` par `"text"` aux lignes 204, 205 et 213 ; l. 215,
  remplacer par
  `    expect(outils(last(save)).groups[2]!.items.map((i) => i.id)).toEqual(["sep-2", "rect", "ellipse", "text", "line", "arrow", "table", "fill"]);`
- Retirer `eraserMode: "partial", ` des littéraux : `src/ui/MenuBar.test.tsx:20`, `src/ui/SideBar.test.tsx:25`,
  `src/ui/SelectionRow.test.tsx:10`, `src/ui/PointerSwitch.test.tsx:14`, `src/ui/FormatRow.test.tsx:11`,
  `src/ui/Toolbar.test.tsx:19`, `src/platform/annotation-tauri.test.ts:128`, `src/platform/annotation-fake.ts:82`.

- [ ] **Étape 8 : essai design-l3 (G4)**

`scripts/essais/design-l3-navigateur.mjs:46` : retirer `"ann-eraser-mode", ` de `ANNOTATION_ORDER`.

- [ ] **Étape 9 : commande bornée, typage, suite**

Lancer la commande bornée ci-dessus, puis G3, puis la suite G2. `toolbar.test.ts:387,448,488`, `profile-edit.test.ts:302`
et `App.test.tsx:41,324` (`BEFORE_L4`) doivent rester verts : s'ils comptent des boutons montrés, l'attendu perd
`eraser-mode` (relire l'assertion, retirer l'élément de la liste attendue, ne rien retirer du profil lu).

- [ ] **Étape 10 : commit**

```bash
cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet
for f in apps/web/src/toolbar.ts apps/web/src/toolbar.test.ts apps/web/src/toolbar-profiles.ts apps/web/src/toolbar-profiles.test.ts apps/web/src/ui/item-state.ts apps/web/src/ui/item-state.test.ts apps/web/src/ui/icons.ts apps/web/src/ui/icons.test.ts apps/web/src/app/toolbar-host.ts apps/web/src/app/toolbar-host.test.ts apps/web/src/app/annotation-page.ts apps/web/src/app/annotation-page.test.ts apps/web/src/ui/App.test.tsx apps/web/src/ui/Toolbar.test.tsx apps/web/src/ui/ProfileEditor.test.tsx apps/web/src/ui/MenuBar.test.tsx apps/web/src/ui/SelectionRow.test.tsx apps/web/src/ui/PointerSwitch.test.tsx apps/web/src/ui/SideBar.test.tsx apps/web/src/ui/FormatRow.test.tsx apps/web/src/platform/annotation-tauri.test.ts apps/web/src/platform/annotation-fake.ts THIRD_PARTY_NOTICES.md docs/design/charte.md scripts/essais/design-l3-navigateur.mjs; do git add "$f"; done
git commit -m "feat: single eraser, retire the eraser-mode action (OG41 L1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t2"></a>
### Tâche T2 — Gomme selon l'objet touché, une étape

**Objectif :** une seule gomme : un trait à main levée est coupé là où elle passe (`Erase` partiel, inchangé) ; l'objet
au premier plan sous son centre (forme, image, texte, ligne, flèche, média, objet 3D, genre inconnu) est effacé entier
(`Delete`) ; tableau et remplissage du pot ne le sont jamais ; un rectangle ou une ellipse sans fond n'est touché que sur
son trait ; un plan par geste ; au relâché une seule écriture `runAll([Erase, Delete])`, donc une étape (D2-D8, D16, D30-D32).
Le moteur perd `eraserMode` (D11). La paume et le bouton du stylet passent par le même outil (D7) : aucun code propre.

**Fichiers :**
- Modifier (réécrire) : `apps/web/src/engine/tools/eraser.ts`
- Modifier : `apps/web/src/engine/tools/tool.ts:12-35`
- Modifier : `apps/web/src/engine/engine.ts:8,38,101,213,514,613,885-899,916,1227-1230`
- Tests : `apps/web/src/engine/tools/eraser.test.ts` (réécrit), `apps/web/src/engine/engine.test.ts`,
  `apps/web/src/app/stage-tags.test.ts:9`, `apps/web/src/ui/App.test.tsx:50,91`
- Modifier (essai, G4) : `scripts/essais/s2-navigateur.mjs:170-173`

**Interfaces :**
- Consomme (T1) : `HostTargets.engine()` sans `"setEraserMode"` ; `viewOf` sans `eraserMode`.
- Produit : `createEraserTool(ctx: ToolContext, radiusPx: number = ERASER_RADIUS_PX): GestureTool` (le paramètre `mode`
  disparaît, DA1) ; `export const ERASER_PROBES_PER_FRAME = 8` ; `ToolContext.runAll?(cmds: readonly Command[]): Change | null`
  (le moteur le fournit) ; `ToolFactories.eraser(ctx: ToolContext): GestureTool` ; `EngineState` sans `eraserMode` ;
  `Engine` sans `setEraserMode`.
- Réutilise : `crates/roomboard-core/src/commands.rs:1870` (`cmd_erase`, partiel) — `{ type: "Erase", page, path, radius, mode: "partial" }`
- Réutilise : `crates/roomboard-core/src/query.rs:283` (`hit_test`) — `doc.hitTest(page, x, y, radius): string | null` (`api.ts:444`), à tolérance 0 puis au rayon
- Réutilise : `apps/web/src/core/api.ts:426` (`elementIdsOfKind`) — `doc.elementIdsOfKind(page, kind)` pour `"stroke"`, `"table"`, `"fill"` (genre brut : les genres inconnus restent candidats)
- Réutilise : `crates/roomboard-core/src/query.rs:328` (`bounds`) — `doc.bounds([id])`
- Réutilise : `crates/roomboard-core/src/commands.rs:2076` (`cmd_delete`) — `{ type: "Delete", ids }`
- Réutilise : `apps/web/src/engine/engine.ts:825` (`runAll`, T37) — étendu dans `apps/web/src/engine/tools/tool.ts:12` : `ToolContext.runAll?(cmds: readonly Command[]): Change | null`
- Réutilise : `apps/web/src/engine/tools/tool.ts:38` (`LivePart.hidden`) — `live(): { strokes: [], erasers, hidden }`
- Réutilise : `apps/web/src/engine/tools/eraser.ts:78` (`resize`) — inchangé : le rayon ne fait que grandir, la sonde des objets repart du début
- Réutilise : `apps/web/src/core/api.ts:447` (`edgeHit`, C6a) — `doc.edgeHit(id, x, y, rayon)` pour un rectangle ou une ellipse sans fond
- Réutilise : `apps/web/src/core/api.ts:422-426` (`elementIds`, `elementIdsOfKind`) — candidats = `elementIds(page)` moins `stroke`, `table`, `fill`

**Patron à ne pas reprendre (concepteur-critique) :**
- deux écritures `ctx.run(Erase)` puis `ctx.run(Delete)` : deux étapes d'annulation, contraire à D5 ; référence
  `apps/web/src/engine/engine.ts:825-845` (`runAll`, une étape pour plusieurs commandes) ;
- la sonde de la gomme d'objet d'aujourd'hui (`hitTestPath`, `apps/web/src/engine/tools/eraser.ts:43-49`) : elle ne voit
  que les traits (`strokes_only`) et ignore le premier plan ;
- tester les boîtes des candidats sans `hitTest` (« touché si le chemin croise la boîte ») : un objet sous un autre, un
  trait posé dessus, l'intérieur d'une forme vide seraient effacés à tort (D3, D31, D32) ; référence
  `apps/web/src/core/fake-core.ts:2442-2454` (`hitTest` : le plus haut d'abord).

**Test et commande bornée :**
`cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet/apps/web && npx -y pnpm@12.18.0 exec vitest run src/engine/tools/eraser.test.ts src/engine/engine.test.ts src/app/stage-tags.test.ts src/ui/App.test.tsx src/core/fake-core.test.ts src/engine/zone-s6-banc.test.ts --reporter=verbose 2>&1 | grep -E "Test Files|Tests  |FAIL|objets entiers|un annuler rend traits et objets|page d'encre seule"`
Attendu : `Test Files  6 passed`, `Tests  N passed` (N ≥ 1), les lignes `objets entiers`, `un annuler rend traits et
objets` et `page d'encre seule` présentes, aucun `FAIL`. `fake-core.test.ts:193-231` et `zone-s6-banc.test.ts` restent
verts (D29, G8).

**Contraintes (recopiées de Global Constraints) :**
- G1 Machine : Mac ; aucune modification Rust (`crates/` intouché), pas de `cargo`.
- G2 Tests web : commande ci-dessus ; suite complète en fin de tâche (référence 4742 passés, 1 rouge propre au Mac `profile-actions.test.ts`).
- G3 Typage : `tsc --noEmit` vide.
- G4 Essais sur la VM seulement ; cette tâche modifie `s2-navigateur.mjs` (dit dans « terminé »).
- G5 TDD : test rouge d'abord ; aucun test désactivé, sauté, aucun seuil changé ; essais existants verts sans réécriture de fond.
- G6 Design : chaque geste a un raccourci (Ctrl+Z annule la gomme en une fois) ; tactile d'abord.
- G7 Commits en anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers ajoutés un par un.
- G8 CLI et empreinte S6 non touchées : `EraseMode` et `hitTestPath` restent dans `core/api.ts` (D10), `apps/cli` inchangé.

**Interdits :** modifier `core/api.ts`, `core/fake-core.ts`, `core/wasm-core.ts`, `engine/input/router.ts`,
`engine/render/*` ; un repli en commandes séparées quand `runAll` manque (D5 : la gomme lève à sa création) ; exclure des
ids de `hitTest` en refaisant la géométrie en TS (D32).

**Critère « terminé » :** commande bornée verte ; `tsc --noEmit` vide ; suite complète sans nouveau rouge ;
`grep -rn "eraserMode\|setEraserMode" apps/web/src` vide ; essai modifié : `scripts/essais/s2-navigateur.mjs` (à jouer sur
la VM). Rapport : `Réutilisation : appelé hitTest, edgeHit, elementIdsOfKind, bounds, runAll` ou `Réutilisation : écart — <pourquoi>`.

**Étapes :**

- [ ] **Étape 1 : réécrire `eraser.test.ts` (rouge)**

Remplacer tout `apps/web/src/engine/tools/eraser.test.ts` par :

```ts
import { describe, expect, it } from "vitest";
import type { Change, Command, CoreDocument, StrokeStyle } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import { IDENTITY, type Camera } from "../camera";
import type { InputSample } from "../input/sampler";
import { createEraserTool, ERASER_PROBES_PER_FRAME, ERASER_RADIUS_PX } from "./eraser";
import type { ToolContext } from "./tool";

const s = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });
const PEN: StrokeStyle = { color: "#000000", width: 4 };
const ASSET = { id: "ab".repeat(32), name: "a.png", mime: "image/png", size: 3 };
const hline = (y: number, x0 = 100, x1 = 500): Float32Array => {
  const a: number[] = [];
  for (let x = x0; x <= x1; x += 10) a.push(x, y, 0.5);
  return new Float32Array(a);
};
const vline = (x: number, y0: number, y1: number): Float32Array => {
  const a: number[] = [];
  for (let y = y0; y <= y1; y += 10) a.push(x, y, 0.5);
  return new Float32Array(a);
};

function setup(cam: Camera = IDENTITY, withRunAll = true) {
  const doc: CoreDocument = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  const alls: Command[][] = [];
  const hits = { n: 0 };
  const original = doc.hitTest.bind(doc);
  doc.hitTest = (p: string, x: number, y: number, tol: number): string | null => {
    hits.n++;
    return original(p, x, y, tol);
  };
  const runAll = (cmds: readonly Command[]): Change | null => {
    alls.push([...cmds]);
    let last: Change | null = null;
    for (const c of cmds) last = doc.apply(c);
    return last;
  };
  const ctx: ToolContext = {
    doc,
    page: () => page,
    camera: () => cam,
    run: (c) => doc.apply(c),
    ...(withRunAll ? { runAll } : {}),
  };
  const add = (c: Command): string => doc.apply(c).ids[0] ?? "";
  const stroke = (pts: Float32Array): string => add({ type: "CommitStroke", page, points: pts, style: PEN });
  const rect = (x0: number, y0: number, x1: number, y1: number, fill: string | null): string =>
    add({ type: "AddShape", page, shape: "rect", x0, y0, x1, y1, style: PEN, fill });
  const image = (x: number, y: number, w = 100, h = 100): string => add({ type: "AddImage", page, asset: ASSET, w, h, matrix: [1, 0, 0, 1, x, y] });
  return { doc, page, alls, hits, ctx, stroke, rect, image, add, tool: () => createEraserTool(ctx) };
}

/** Un geste de bout en bout : appui, points, `frames` images, relâché « end ». */
function sweep(tool: ReturnType<typeof createEraserTool>, pts: readonly [number, number][], frames = 64, id = 1): void {
  tool.begin(id, [s(pts[0]![0], pts[0]![1])]);
  tool.extend(id, pts.slice(1).map(([x, y]) => s(x, y)), []);
  for (let i = 0; i < frames; i++) tool.frame();
  tool.close(id, "end");
}
const deleted = (alls: Command[][]): string[] => alls.flatMap((cs) => cs.flatMap((c) => (c.type === "Delete" ? [...c.ids] : [])));

describe("createEraserTool (OG41 : une seule gomme, D2-D8)", () => {
  it("trait touché : coupé, jamais entier (D2, effet de bord 1)", () => {
    const t = setup();
    t.stroke(hline(100));
    const tool = t.tool();
    sweep(tool, [[300, 80], [300, 100], [300, 120]]);
    expect(t.alls).toHaveLength(1);
    expect(t.alls[0]).toEqual([{ type: "Erase", page: t.page, path: new Float32Array([300, 80, 300, 100, 300, 120]), radius: ERASER_RADIUS_PX, mode: "partial" }]);
    expect(t.doc.elementIds(t.page)).toHaveLength(2);
  });

  it("objets entiers : forme, image, texte, flèche effacés, trait coupé, une seule écriture (S2, D5)", () => {
    const t = setup();
    const r = t.rect(100, 100, 200, 200, "#facc15");
    const img = t.image(300, 100);
    const txt = t.add({ type: "SetText", page: t.page, id: null, x: 500, y: 100, content: "Bonjour", color: "#000000", size: 36, boxWidth: 200, boxHeight: 45 });
    const arrow = t.add({ type: "AddShape", page: t.page, shape: "arrow", x0: 800, y0: 120, x1: 900, y1: 120, style: PEN, fill: null });
    t.stroke(vline(980, 50, 200));
    const tool = t.tool();
    tool.begin(1, [s(50, 120)]);
    tool.extend(1, [s(1000, 120)], []);
    for (let i = 0; i < 64; i++) tool.frame();
    expect([...tool.live().hidden].sort()).toEqual([r, img, txt, arrow].sort());
    expect(t.alls).toEqual([]);
    tool.close(1, "end");
    expect(t.alls).toHaveLength(1);
    expect(t.alls[0]![0]?.type).toBe("Erase");
    expect(t.alls[0]![1]).toEqual({ type: "Delete", ids: expect.arrayContaining([r, img, txt, arrow]) });
    expect(t.doc.elementIds(t.page)).toHaveLength(2);
  });

  it("contre-épreuve : un trait posé sur une image, gommé le long du trait : l'image reste (D3)", () => {
    const t = setup();
    const img = t.image(100, 100, 200, 100);
    t.stroke(hline(150, 120, 280));
    sweep(t.tool(), [[150, 150], [250, 150]]);
    expect(deleted(t.alls)).toEqual([]);
    expect(t.doc.element(img)?.kind).toBe("image");
  });

  it("un plan par geste : deux images superposées, seule celle du dessus part ; un second passage efface l'autre (D32)", () => {
    const t = setup();
    const below = t.image(100, 100);
    const above = t.image(100, 100);
    const tool = t.tool();
    sweep(tool, [[50, 150], [250, 150]]);
    expect(deleted(t.alls)).toEqual([above]);
    sweep(tool, [[50, 150], [250, 150]], 64, 2);
    expect(deleted(t.alls)).toEqual([above, below]);
  });

  it("forme vide : trait seulement ; son intérieur ne compte pas, son bord oui (D31)", () => {
    const t = setup();
    const r = t.rect(100, 100, 300, 300, null);
    const tool = t.tool();
    sweep(tool, [[150, 150], [250, 150]]);
    expect(deleted(t.alls)).toEqual([]);
    sweep(tool, [[80, 200], [120, 200]], 64, 2);
    expect(deleted(t.alls)).toEqual([r]);
  });

  it("pot gardé : un remplissage n'est jamais candidat, ni ce qu'il couvre (D30, effet de bord 8 bis)", () => {
    const t = setup();
    t.stroke(hline(200, 100, 300));
    const zone = t.rect(100, 150, 300, 250, "#facc15");
    const raw = t.doc.elementIdsOfKind.bind(t.doc);
    t.doc.elementIdsOfKind = (p: string, k: string): readonly string[] => (k === "fill" ? [zone] : raw(p, k));
    sweep(t.tool(), [[150, 200], [250, 200]]);
    expect(deleted(t.alls)).toEqual([]);
    expect(t.alls[0]![0]?.type).toBe("Erase");
    expect(t.doc.element(zone)).not.toBeNull();
  });

  it("tableau : jamais effacé ; l'image posée dessus l'est (D4, S3)", () => {
    const t = setup();
    const table = t.add({ type: "AddTable", page: t.page, x: 100, y: 200, cols: 3, rows: 3, colWidth: 100, rowHeight: 64, color: "#000000", size: 36 });
    const img = t.image(210, 270, 60, 40);
    sweep(t.tool(), [[90, 230], [410, 390]]);
    expect(deleted(t.alls)).toEqual([img]);
    expect(t.doc.element(table)?.kind).toBe("table");
  });

  it("page d'encre seule : aucun hitTest, une seule Erase (D8, Review Focus 1)", () => {
    const t = setup();
    t.stroke(hline(100));
    t.stroke(hline(140));
    sweep(t.tool(), [[300, 60], [300, 180]]);
    expect(t.hits.n).toBe(0);
    expect(t.alls).toHaveLength(1);
    expect(t.alls[0]).toHaveLength(1);
  });

  it("au plus 8 hitTest par image, tout le reste sondé au relâché (D8, Review Focus 3)", () => {
    const t = setup();
    const img = t.image(0, 0, 2000, 400);
    const tool = t.tool();
    tool.begin(1, [s(10, 380)]);
    tool.extend(1, [s(1990, 380)], []);
    const before = t.hits.n;
    tool.frame();
    expect(t.hits.n - before).toBeLessThanOrEqual(ERASER_PROBES_PER_FRAME);
    tool.close(1, "end");
    expect(deleted(t.alls)).toEqual([img]);
  });

  it("deux passes sur le même objet : la seconde n'écrit aucun id disparu (Review Focus 2)", () => {
    const t = setup();
    const img = t.image(100, 100);
    const tool = t.tool();
    tool.begin(1, [s(50, 150)]);
    tool.begin(2, [s(150, 50)]);
    tool.extend(1, [s(250, 150)], []);
    tool.extend(2, [s(150, 250)], []);
    for (let i = 0; i < 64; i++) tool.frame();
    tool.close(1, "end");
    expect(() => tool.close(2, "end")).not.toThrow();
    expect(deleted(t.alls)).toEqual([img]);
    expect(t.alls[1]).toHaveLength(1);
  });

  it("groupe : élément par élément, le membre touché seul est effacé (D16)", () => {
    const t = setup();
    const a = t.image(100, 100);
    const b = t.image(400, 100);
    t.doc.apply({ type: "Group", ids: [a, b] });
    sweep(t.tool(), [[50, 150], [250, 150]]);
    expect(deleted(t.alls)).toEqual([a]);
    expect(t.doc.element(b)).not.toBeNull();
  });

  it("rayon constant à l'écran : 12 px divisés par le zoom ; un appui seul gomme aussi", () => {
    const t = setup({ zoom: 2, tx: 0, ty: 0 });
    const tool = t.tool();
    tool.begin(1, [s(600, 200)]);
    tool.close(1, "end");
    const c = t.alls[0]![0];
    if (c?.type !== "Erase") throw new Error("Erase attendue");
    expect(c.radius).toBe(6);
    expect(Array.from(c.path)).toEqual([300, 100]);
  });

  it("cancel ou abort : rien d'écrit (D39), aperçu retiré", () => {
    const t = setup();
    t.image(100, 100);
    const tool = t.tool();
    for (const how of ["cancel", "abort"] as const) {
      tool.begin(1, [s(50, 150)]);
      tool.extend(1, [s(250, 150)], []);
      for (let i = 0; i < 16; i++) tool.frame();
      tool.close(1, how);
    }
    expect(t.alls).toEqual([]);
    expect(tool.live().hidden.size).toBe(0);
    expect(tool.live().erasers).toHaveLength(0);
    expect(tool.active()).toBe(false);
  });

  it("aperçu : traînée partielle, objets masqués, rien d'écrit avant le relâché (D6)", () => {
    const t = setup();
    const img = t.image(100, 100);
    const v = t.doc.version();
    const tool = t.tool();
    tool.begin(1, [s(50, 150)]);
    tool.extend(1, [s(250, 150)], []);
    for (let i = 0; i < 16; i++) tool.frame();
    expect(t.doc.version()).toBe(v);
    expect(tool.live().erasers[0]?.mode).toBe("partial");
    expect(tool.live().hidden.has(img)).toBe(true);
  });

  it("OG25 resize : le rayon ne fait que grandir ; une seule écriture au rayon final", () => {
    const t = setup({ zoom: 2, tx: 0, ty: 0 });
    const tool = t.tool();
    tool.begin(1, [s(300, 80)]);
    tool.resize?.(1, 70);
    tool.resize?.(1, 40);
    tool.resize?.(1, Number.NaN);
    tool.resize?.(9, 100);
    tool.extend(1, [s(300, 120)], []);
    expect(tool.live().erasers[0]?.radius).toBe(35);
    tool.close(1, "end");
    expect(t.alls).toHaveLength(1);
    const c = t.alls[0]![0];
    expect(c?.type === "Erase" ? c.radius : null).toBe(35);
  });

  it("OG25 resize (paume, D7) : la sonde des objets repart du début quand le rayon grandit", () => {
    const t = setup();
    const img = t.image(100, 130);
    const tool = t.tool();
    tool.begin(1, [s(100, 100)]);
    tool.extend(1, [s(200, 100)], []);
    for (let i = 0; i < 32; i++) tool.frame();
    expect(tool.live().hidden.has(img)).toBe(false);
    tool.resize?.(1, 80);
    for (let i = 0; i < 32; i++) tool.frame();
    expect(tool.live().hidden.has(img)).toBe(true);
  });

  it("D5 : sans ToolContext.runAll, la gomme refuse de se créer (aucun repli en deux étapes)", () => {
    const t = setup(IDENTITY, false);
    expect(() => t.tool()).toThrow(/runAll/);
  });
});
```

- [ ] **Étape 2 : test du moteur (rouge)**

Dans `apps/web/src/engine/engine.test.ts` : ajouter `import { createEraserTool } from "./tools/eraser";` aux imports ;
ligne 180, retirer `eraserMode: "partial",` de l'objet attendu ; ajouter dans le `describe("createEngine", …)` :

```ts
  it("OG41 gomme : un annuler rend traits et objets (D5, effet de bord 3)", () => {
    const doc = fakeCore.blank();
    const frames = new Frames();
    const engine = createEngine({ doc, renderer: new FakeRenderer(), frames, tools: { pen: (ctx) => fakeTool("pen", [], ctx), eraser: (ctx) => createEraserTool(ctx) } });
    engine.resize(1280, 720, 1);
    const page = engine.state().page;
    const rect = engine.run({ type: "AddShape", page, shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style: PEN, fill: "#facc15" })?.ids[0] ?? "";
    engine.run({ type: "CommitStroke", page, points: new Float32Array([400, 50, 0.5, 400, 150, 0.5, 400, 250, 0.5]), style: PEN });
    const cam = engine.camera();
    const at = (x: number, y: number): InputSample => {
      const [sx, sy] = worldToScreen(cam, x, y);
      return { x: sx, y: sy, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 };
    };
    engine.sink.begin(1, "eraser", [at(50, 150)]);
    engine.sink.extend(1, [at(450, 150)], []);
    engine.sink.close(1, "end");
    expect(doc.element(rect)).toBeNull();
    expect(doc.elementIds(page)).toHaveLength(2);
    engine.undo();
    expect(doc.element(rect)?.kind).toBe("shape");
    expect(doc.elementIds(page)).toHaveLength(2);
    expect(doc.elementIdsOfKind(page, "stroke")).toHaveLength(1);
    engine.redo();
    expect(doc.element(rect)).toBeNull();
  });
```

`src/app/stage-tags.test.ts:9` et `src/ui/App.test.tsx:50` : retirer la ligne `  eraserMode: "partial",` ;
`src/ui/App.test.tsx:91` : retirer la ligne `    setEraserMode: vi.fn(),`.

- [ ] **Étape 3 : lancer, constater le rouge**

`cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet/apps/web && npx -y pnpm@12.18.0 exec vitest run src/engine/tools/eraser.test.ts src/engine/engine.test.ts 2>&1 | grep -E "Test Files|Tests  |FAIL" | head`
Attendu : `FAIL` (`ERASER_PROBES_PER_FRAME` absent, aucun `Delete`, `runAll` non appelé).

- [ ] **Étape 4 : `tool.ts` — `runAll` dans le contexte**

Dans `ToolContext` (`apps/web/src/engine/tools/tool.ts`), après `run(cmd: Command): Change | null;`, ajouter :

```ts
  /** OG41 (D5) : plusieurs commandes, une seule étape d'annulation (T37, `Engine.runAll`) ; null si la liste est vide ou
   *  si le cœur refuse. Le moteur le fournit ; la gomme l'exige (aucun repli en commandes séparées). */
  runAll?(cmds: readonly Command[]): Change | null;
```

- [ ] **Étape 5 : réécrire `eraser.ts`**

Remplacer tout `apps/web/src/engine/tools/eraser.ts` par :

```ts
/**
 * Gomme (OG41, D2-D8 ; D12, D38, D39 du socle) : une seule gomme, dont l'effet dépend de ce qu'elle touche. Trait à main
 * levée : coupé là où elle passe (`Erase` partiel du cœur, qui coupe tous les traits du chemin). Objet au premier plan
 * sous le centre de la gomme (forme, image, texte, ligne, flèche, média, objet 3D, genre inconnu) : effacé entier
 * (`Delete`) ; à tolérance 0 d'abord (un trait ne compte que sous son contour), au rayon si rien n'est sous le centre.
 * Jamais effacés : tableau, remplissage du pot (D4, D30). Rectangle ou ellipse sans fond : seulement sur son trait
 * (`edgeHit`, D31). Un plan par geste : le document ne change qu'au relâché (D32).
 * Coût borné (D8) : candidats fixés au début du geste, échantillons au pas du cœur (`sample_path`) gardés près d'un
 * candidat non touché, au plus `ERASER_PROBES_PER_FRAME` appels `hitTest` par image, tout le reste au relâché.
 * Aperçu sans écriture : traînée partielle, objets touchés masqués (D6) ; au relâché, une seule écriture
 * `runAll([Erase, Delete])`, une étape (D5) ; "cancel" et "abort" n'écrivent rien. Rayon constant à l'écran (HL3-1) ;
 * `resize` (OG25, paume) l'agrandit et relance la sonde des objets depuis le début (D7).
 */
import type { Bounds, Change, Command } from "../../core/api";
import { screenToWorld } from "../camera";
import type { CloseReason } from "../input/gesture";
import type { InputSample } from "../input/sampler";
import type { EraserPreview } from "../render/renderer";
import type { GestureTool, LivePart, ToolContext } from "./tool";

export const ERASER_RADIUS_PX = 12;
/** D8 : appels `hitTest` au plus par image (toutes passes comprises) ; le reste à l'image suivante, tout au relâché. */
export const ERASER_PROBES_PER_FRAME = 8;
/** Genres bruts jamais effacés en entier : l'encre (coupée par `Erase`), le tableau, le remplissage du pot. */
const NEVER_WHOLE: readonly string[] = ["stroke", "table", "fill"];
/** Pas minimal du cœur (`sample_path`, ink/hit.rs:126). */
const MIN_STEP = 0.25;

interface Pass {
  readonly page: string;
  radius: number;
  /** Paires x, y monde. */
  readonly path: number[];
  /** Candidats (D8) et leur boîte monde, figés au début du geste. */
  readonly boxes: readonly (readonly [string, Bounds])[];
  readonly ids: ReadonlySet<string>;
  /** Échantillons à sonder (x, y monde), lus depuis `next`. */
  queue: number[];
  next: number;
  /** Paires du chemin déjà échantillonnées. */
  sampled: number;
  readonly hits: Set<string>;
  /** Rectangle ou ellipse sans fond (D31), lu une fois par id. */
  readonly outline: Map<string, boolean>;
}

export function createEraserTool(ctx: ToolContext, radiusPx: number = ERASER_RADIUS_PX): GestureTool {
  const runAll = ctx.runAll;
  if (runAll === undefined) throw new Error("createEraserTool : ToolContext.runAll requis (OG41, D5 : une seule étape)");
  const passes = new Map<number, Pass>();

  const candidates = (page: string): (readonly [string, Bounds])[] => {
    const skip = new Set<string>();
    for (const k of NEVER_WHOLE) for (const id of ctx.doc.elementIdsOfKind(page, k)) skip.add(id);
    const out: (readonly [string, Bounds])[] = [];
    for (const id of ctx.doc.elementIds(page)) {
      if (skip.has(id)) continue;
      const b = ctx.doc.bounds([id]);
      if (b !== null) out.push([id, b]);
    }
    return out;
  };

  const add = (p: Pass, samples: readonly InputSample[]): void => {
    const cam = ctx.camera();
    for (const s of samples) {
      if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
      const [x, y] = screenToWorld(cam, s.x, s.y);
      p.path.push(x, y);
    }
  };

  /** Un candidat non encore touché dont la boîte, élargie du rayon, contient (x, y). */
  const near = (p: Pass, x: number, y: number): boolean =>
    p.boxes.some(([id, b]) => !p.hits.has(id) && x >= b.x0 - p.radius && x <= b.x1 + p.radius && y >= b.y0 - p.radius && y <= b.y1 + p.radius);

  const keep = (p: Pass, x: number, y: number): void => {
    if (near(p, x, y)) p.queue.push(x, y);
  };

  /** Échantillons des paires nouvelles du chemin, au pas `max(rayon / 2, 0,25)`. */
  const sample = (p: Pass): void => {
    if (p.boxes.length === 0) return;
    const pairs = p.path.length / 2;
    const step = Math.max(p.radius / 2, MIN_STEP);
    for (let i = p.sampled; i < pairs; i++) {
      const x = p.path[2 * i]!;
      const y = p.path[2 * i + 1]!;
      if (i === 0) {
        keep(p, x, y);
        continue;
      }
      const px = p.path[2 * i - 2]!;
      const py = p.path[2 * i - 1]!;
      const n = Math.max(1, Math.ceil(Math.hypot(x - px, y - py) / step));
      for (let j = 1; j <= n; j++) keep(p, px + ((x - px) * j) / n, py + ((y - py) * j) / n);
    }
    p.sampled = pairs;
  };

  const outlineOnly = (p: Pass, id: string): boolean => {
    let v = p.outline.get(id);
    if (v === undefined) {
      const el = ctx.doc.element(id);
      v = el?.kind === "shape" && (el.shape.shape === "rect" || el.shape.shape === "ellipse") && el.shape.fill === null;
      p.outline.set(id, v);
    }
    return v;
  };

  /** Sonde au premier plan, au plus `budget` appels `hitTest` (deux au plus par échantillon) ; rend les appels faits. */
  const probe = (p: Pass, budget: number): number => {
    let used = 0;
    while (p.next < p.queue.length && used + 2 <= budget) {
      const x = p.queue[p.next]!;
      const y = p.queue[p.next + 1]!;
      p.next += 2;
      if (!near(p, x, y)) continue;
      used++;
      let top = ctx.doc.hitTest(p.page, x, y, 0);
      if (top === null) {
        used++;
        top = ctx.doc.hitTest(p.page, x, y, p.radius);
      }
      if (top === null || !p.ids.has(top) || p.hits.has(top)) continue;
      if (outlineOnly(p, top) && !ctx.doc.edgeHit(top, x, y, p.radius)) continue;
      p.hits.add(top);
    }
    return used;
  };

  const write = (p: Pass): Change | null => {
    sample(p);
    probe(p, Number.POSITIVE_INFINITY);
    const present = new Set(ctx.doc.elementIds(p.page));
    const ids = [...p.hits].filter((id) => present.has(id));
    const cmds: Command[] = [{ type: "Erase", page: p.page, path: new Float32Array(p.path), radius: p.radius, mode: "partial" }];
    if (ids.length > 0) cmds.push({ type: "Delete", ids });
    return runAll(cmds);
  };

  return {
    begin(pointerId, samples) {
      const page = ctx.page();
      const boxes = candidates(page);
      const p: Pass = {
        page,
        radius: radiusPx / ctx.camera().zoom,
        path: [],
        boxes,
        ids: new Set(boxes.map(([id]) => id)),
        queue: [],
        next: 0,
        sampled: 0,
        hits: new Set<string>(),
        outline: new Map<string, boolean>(),
      };
      passes.set(pointerId, p);
      add(p, samples);
    },
    extend(pointerId, samples) {
      const p = passes.get(pointerId);
      if (p) add(p, samples);
    },
    frame() {
      let budget = ERASER_PROBES_PER_FRAME;
      for (const p of passes.values()) {
        sample(p);
        budget -= probe(p, budget);
      }
    },
    close(pointerId: number, how: CloseReason) {
      const p = passes.get(pointerId);
      if (!p) return;
      passes.delete(pointerId);
      if (how !== "end" || p.path.length < 2) return;
      write(p);
    },
    resize(pointerId: number, px: number) {
      const p = passes.get(pointerId);
      if (!p || !Number.isFinite(px) || px <= 0) return;
      const r = px / ctx.camera().zoom;
      if (!(r > p.radius)) return;
      p.radius = r;
      // D7 : le chemin déjà passé est sondé de nouveau, au rayon nouveau (les objets déjà touchés le restent).
      p.sampled = 0;
      p.queue = [];
      p.next = 0;
    },
    live(): LivePart {
      const erasers: EraserPreview[] = [];
      const hidden = new Set<string>();
      for (const p of passes.values()) {
        erasers.push({ path: new Float32Array(p.path), radius: p.radius, mode: "partial" });
        for (const id of p.hits) hidden.add(id);
      }
      return { strokes: [], erasers, hidden };
    },
    active: () => passes.size > 0,
  };
}
```

- [ ] **Étape 6 : `engine.ts` — retirer le mode, fournir `runAll`**

Dans `apps/web/src/engine/engine.ts` :
- ligne 8 : retirer `type EraseMode, ` de l'import de `../core/api` ;
- ligne 38 : supprimer `  readonly eraserMode: EraseMode;` d'`EngineState` ;
- ligne 101 : remplacer par `  eraser(ctx: ToolContext): GestureTool;` ;
- ligne 213 : supprimer `  setEraserMode(m: EraseMode): void;` ;
- ligne 514 : supprimer `  let eraserMode: EraseMode = "partial";` ;
- ligne 613 : supprimer `      eraserMode,` dans `state()` ;
- dans `const ctx: ToolContext = { … }` (l. 885-899), après `    run,` ajouter `    runAll,` ;
- ligne 916 : remplacer par `    eraser: deps.tools.eraser(ctx),` ;
- l. 1227-1230 : supprimer le bloc `setEraserMode(m) { eraserMode = m; emit(); },`.

`apps/web/src/app/board-session.ts:385` (`eraser: createEraserTool`) reste tel quel : la fabrique est appelée avec le seul
contexte, `radiusPx` garde son défaut.

- [ ] **Étape 7 : essai S2 (G4)**

`scripts/essais/s2-navigateur.mjs:170-173`, remplacer les quatre lignes par :

```js
    await click("eraser");
    await drag([[500, 210], [500, 250], [500, 290]]); // premier trait (y = 250), vue décalée de 150 px : x de 250 à 750
    check((await elements()) === 6, "gomme : le premier trait est coupé en deux, jamais effacé entier (5 → 6)");
```

- [ ] **Étape 8 : commande bornée, typage, suite**

Commande bornée ci-dessus, puis G3, puis la suite G2.

- [ ] **Étape 9 : commit**

```bash
cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet
for f in apps/web/src/engine/tools/eraser.ts apps/web/src/engine/tools/eraser.test.ts apps/web/src/engine/tools/tool.ts apps/web/src/engine/engine.ts apps/web/src/engine/engine.test.ts apps/web/src/app/stage-tags.test.ts apps/web/src/ui/App.test.tsx scripts/essais/s2-navigateur.mjs; do git add "$f"; done
git commit -m "feat: eraser cuts strokes and removes whole objects in one undo step (OG41 L1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t3"></a>
### Tâche T3 — « Supprimer le tableau » dans le menu de case

**Objectif :** l'appui long sur une case (outil Tableau) propose en dernier « Supprimer le tableau » (icône `trash-2`,
44 px), un `Delete` du tableau, une étape ; les objets logés restent libres à leur place (D14, D15).

**Fichiers :**
- Modifier : `apps/web/src/ui/cell-menu.ts:11,50`
- Modifier : `apps/web/src/engine/tools/table.ts:431-454`
- Tests : `apps/web/src/ui/cell-menu.test.ts`, `apps/web/src/engine/tools/table.test.ts:766,845-846`

**Interfaces :**
- Consomme : rien.
- Produit : `CellMenuItem.id: "fit" | "cell-image" | "unplace" | "header" | "delete-table"`.
- Réutilise : `apps/web/src/ui/cell-menu.ts:11` (`CellMenuItem`) et `apps/web/src/engine/tools/table.ts:438` (`openMenu`) — id `"delete-table"`, `run: () => ctx.run({ type: "Delete", ids: [at.ref.id] })`

**Test et commande bornée :**
`cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet/apps/web && npx -y pnpm@12.18.0 exec vitest run src/engine/tools/table.test.ts src/ui/cell-menu.test.ts --reporter=verbose 2>&1 | grep -E "Test Files|Tests  |FAIL|Supprimer le tableau"`
Attendu : `Test Files  2 passed`, `Tests  N passed` (N ≥ 1), au moins deux lignes `Supprimer le tableau`, aucun `FAIL`.

**Contraintes (recopiées de Global Constraints) :**
- G1 Mac, aucune modification Rust. G2 commande ci-dessus, suite complète en fin de tâche (référence 4742 passés, 1 rouge propre au Mac `profile-actions.test.ts`). G3 `tsc --noEmit` vide.
- G5 TDD, test rouge d'abord, aucun test sauté. G6 cibles ≥ 44 px, icônes Lucide du lot L1, tactile d'abord. G7 commits en anglais avec `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un. G8 CLI et S6 non touchées. G10 pas de `switch` dans `src/ui`.

**Interdits :** supprimer les objets logés avec le tableau (D15, H4) ; toucher d'autres fichiers que ceux de la tâche
(T1 tourne en parallèle dans le worktree du chantier).

**Critère « terminé » :** commande bornée verte ; `tsc --noEmit` vide ; suite sans nouveau rouge. Rapport :
`Réutilisation : appelé CellMenuItem et openMenu` ou `Réutilisation : écart — <pourquoi>`.

**Étapes :**

- [ ] **Étape 1 : tests rouges**

`apps/web/src/engine/tools/table.test.ts:766` : attendu `["fit", "header", "delete-table"]` ; l. 845 : attendu
`["fit", "cell-image", "unplace", "header", "delete-table"]` ; l. 846 : attendu
`["Rétrécir", "Mettre en fond", "Sortir", "En-tête", "Supprimer le tableau"]`. Ajouter dans le
`describe("appui long sur une case …")` :

```ts
  it("OG41 (D14) : « Supprimer le tableau » : un Delete du tableau, une étape ; l'image logée reste libre (D15)", () => {
    vi.useFakeTimers();
    try {
      const s = withImage();
      s.tool.begin(1, [at(120, 220)]);
      vi.advanceTimersByTime(500);
      const items = s.menuOpens[0]?.items ?? [];
      const del = items.find((i) => i.id === "delete-table");
      expect(del?.label).toBe("Supprimer le tableau");
      s.tool.close(1, "end");
      const table = s.doc.elementIdsOfKind(s.page, "table")[0] ?? "";
      del?.run();
      expect(s.last()).toEqual({ type: "Delete", ids: [table] });
      expect(s.doc.element(table)).toBeNull();
      expect(s.doc.element(s.image)?.kind).toBe("image");
    } finally {
      vi.useRealTimers();
    }
  });
```

`apps/web/src/ui/cell-menu.test.ts`, ajouter :

```ts
  it("OG41 (D14) : « Supprimer le tableau » porte l'icône trash-2 et une cible de 44 px", () => {
    const menu = createCellMenu(document.body);
    menu.open(0, 0, [{ id: "delete-table", label: "Supprimer le tableau", run: () => undefined }]);
    const b = document.body.querySelector<HTMLButtonElement>('.rb-cell-menu button[data-menu-item="delete-table"]');
    expect(b?.style.minHeight).toBe("44px");
    expect(b?.querySelector("svg path")).not.toBeNull();
    expect(b?.textContent).toContain("Supprimer le tableau");
    menu.destroy();
  });
```

(`withImage()` rend `{ doc, page, image, tool, menuOpens, last, … }` : si `page` n'y est pas, lire
`s.doc.pageIds()[0]!` à sa place.)

- [ ] **Étape 2 : lancer, constater le rouge** — commande bornée : `FAIL` (entrée absente, icône absente).

- [ ] **Étape 3 : `cell-menu.ts`**

Ligne 11 : `  readonly id: "fit" | "cell-image" | "unplace" | "header" | "delete-table";`
Ligne 50 :

```ts
const ICON_OF: Readonly<Record<CellMenuItem["id"], string>> = { fit: "fit", "cell-image": "wallpaper", unplace: "close", header: "rows-2", "delete-table": "trash-2" };
```

Dans le commentaire d'en-tête (l. 1-7), ajouter après la première phrase : `OG41 (D14) : « Supprimer le tableau »
en dernier.`

- [ ] **Étape 4 : `table.ts` — l'entrée**

Dans `openMenu` (l. 431-454), juste avant `    menu.open(p.sx, p.sy, items);`, ajouter :

```ts
    // OG41 (D14) : la suppression du tableau passe par son menu ; les objets logés restent libres (D15).
    items.push({
      id: "delete-table",
      label: "Supprimer le tableau",
      run: () => {
        ctx.run({ type: "Delete", ids: [at.ref.id] });
        ctx.stateChanged?.();
      },
    });
```

Commentaire de `openMenu` (l. 430) : ajouter `, puis « Supprimer le tableau » (OG41)` avant le point final.

- [ ] **Étape 5 : commande bornée, typage, suite.**

- [ ] **Étape 6 : commit**

```bash
cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet
for f in apps/web/src/ui/cell-menu.ts apps/web/src/ui/cell-menu.test.ts apps/web/src/engine/tools/table.ts apps/web/src/engine/tools/table.test.ts; do git add "$f"; done
git commit -m "feat: delete a table from its cell menu (OG41 L1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
