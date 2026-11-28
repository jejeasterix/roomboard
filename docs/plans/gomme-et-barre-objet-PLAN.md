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
| T7 | L2 | Composant `ObjectBar` (icônes, « … », clavier, tactile) | T6 | apps/web/src/ui/object-bar.ts, apps/web/src/ui/object-bar.test.ts, apps/web/src/ui/ObjectBar.tsx, apps/web/src/ui/ObjectBar.test.tsx, apps/web/src/ui/icons.ts, apps/web/src/ui/icons.test.ts, apps/web/src/ui/MenuBar.tsx, apps/web/src/ui/rb.css, apps/web/src/ui/rb-css.test.ts, apps/web/src/ui/shortcuts.ts, apps/web/src/ui/shortcuts.test.ts, apps/web/src/engine/input/keys.ts, apps/web/src/engine/input/keys.test.ts, apps/web/src/app/toolbar-host.ts, apps/web/src/app/toolbar-host.test.ts, apps/web/src/app/workspace.ts, apps/web/src/app/workspace.test.ts, apps/web/src/ui/SelectionRow.tsx, THIRD_PARTY_NOTICES.md | (partagé) | concepteur-critique | vitest ObjectBar.test.tsx ≥ 1 test `appui long` | S5, S7 | #tache-t7 |
| T8 | L2 | Obstacles des îlots ; Dupliquer et Supprimer quittent le panneau | T4 | apps/web/src/ui/Island.tsx, apps/web/src/ui/Island.test.tsx, apps/web/src/ui/OptionsPanel.tsx, apps/web/src/ui/OptionsPanel.test.tsx | isolé | implementeur-tdd | vitest Island.test.tsx ≥ 1 test `islands()` | S6 | #tache-t8 |
| T9 | L2 | Montage : barre dans `.rb-stages`, rangée Sélection réduite à « Coller » | T5, T7, T8 | apps/web/src/ui/App.tsx, apps/web/src/ui/App.test.tsx, apps/web/src/ui/SelectionRow.tsx, apps/web/src/ui/SelectionRow.test.tsx, apps/web/src/ui/Toolbar.tsx, apps/web/src/ui/Toolbar.test.tsx, scripts/essais/c3-groupes-navigateur.mjs, scripts/essais/personnalisation-1a-navigateur.mjs, scripts/essais/personnalisation-2-navigateur.mjs | (partagé) | implementeur-tdd | vitest SelectionRow.test.tsx ≥ 1 test `un seul bouton icône` + App.test.tsx `barre d'objet montée` | S5, S8 | #tache-t9 |
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

**Worktree :** la tâche tourne dans un worktree à elle, `<worktree de la tâche>`, préparé par l'orchestrateur (Wasm copié, `pnpm install` fait) ; toutes ses commandes visent ce dossier.

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
`cd <worktree de la tâche>/apps/web && npx -y pnpm@12.18.0 exec vitest run src/toolbar.test.ts src/toolbar-profiles.test.ts src/ui/item-state.test.ts src/ui/icons.test.ts src/app/toolbar-host.test.ts src/app/annotation-page.test.ts src/ui/App.test.tsx src/ui/Toolbar.test.tsx src/ui/ProfileEditor.test.tsx src/ui/MenuBar.test.tsx src/ui/SelectionRow.test.tsx src/ui/PointerSwitch.test.tsx src/ui/SideBar.test.tsx src/ui/FormatRow.test.tsx src/platform/annotation-tauri.test.ts src/app/profile-edit.test.ts --reporter=verbose 2>&1 | grep -E "Test Files|Tests  |FAIL|action retirée lue sans avertissement|une seule gomme"`
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
`cd <worktree de la tâche> && grep -rln "eraser-mode\|eraserMode\|eraser-part" apps/web/src --include='*.ts' --include='*.tsx' | grep -v "/fixtures/" | sort` rend exactement :
`apps/web/src/app/stage-tags.test.ts`, `apps/web/src/engine/engine.test.ts`, `apps/web/src/engine/engine.ts` (laissés à T2),
`apps/web/src/toolbar.test.ts`, `apps/web/src/toolbar.ts` (`RETIRED_ACTIONS`), `apps/web/src/ui/App.test.tsx` (l. 50, laissée à T2),
`apps/web/src/ui/Toolbar.test.tsx`, `apps/web/src/ui/icons.test.ts` (tests neufs qui vérifient l'absence) ;
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

`cd <worktree de la tâche>/apps/web && npx -y pnpm@12.18.0 exec vitest run src/toolbar.test.ts src/ui/icons.test.ts src/ui/Toolbar.test.tsx 2>&1 | grep -E "Test Files|Tests  |FAIL|✗|×" | head -20`
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
  remplacer les lignes 764-767 (`const pressed`, `const before`, `a.view(…)`, `expect(pressed()).toBe("true")`) par :

```ts
    const pressed = () => container.querySelector<HTMLButtonElement>('[data-item="ann-undo"]')?.disabled;
    const before = pressed();
    a.view({ tool: "select", canUndo: true, canRedo: false, pageIndex: 0, pageCount: 1 });
    expect(pressed()).toBe(false);
```

  la fin du test (`await a.control.exit()`, `enter()`, `expect(pressed()).toBe(before);`) reste. Ne pas toucher `App.test.tsx:50,91` (T2).
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
cd <worktree de la tâche>
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

**Tranché (non couvert par le cadrage) :** deux gommes à la fois (paume et doigt, plusieurs pointeurs) : la seconde,
relâchée après la première, sonde au relâché ses échantillons restants sur un document déjà écrit ; elle peut atteindre un
objet que la première a révélé. Accepté (chaque geste reste un plan du document qu'il voit) ; seul garde-fou exigé : aucun
id disparu dans son `Delete` (test « deux passes sur le même objet »).

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
/** `step` : pas des points ; le faux `hitTest` mesure un trait par ses seuls points (portée tol + demi-largeur,
 *  fake-core.ts:918-929) : un trait que la gomme doit voir sous son centre a un pas ≤ 2. */
const hline = (y: number, x0 = 100, x1 = 500, step = 10): Float32Array => {
  const a: number[] = [];
  for (let x = x0; x <= x1; x += step) a.push(x, y, 0.5);
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
    // La coupe en morceaux est celle du vrai cœur (le faux retire le trait entier, fake-core.ts:4-7) : prouvée par
    // s2-navigateur.mjs et gomme-objets-navigateur.mjs (VM) ; ici, la commande écrite (Erase partiel, chemin, aucun Delete).
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
    expect(t.alls[0]![0]).toMatchObject({ type: "Erase", mode: "partial", path: new Float32Array([50, 120, 1000, 120]) });
    expect(t.alls[0]![1]).toEqual({ type: "Delete", ids: expect.arrayContaining([r, img, txt, arrow]) });
    expect(deleted(t.alls)).toHaveLength(4);
  });

  it("contre-épreuve : un trait posé sur une image, gommé le long du trait : l'image reste (D3)", () => {
    const t = setup();
    const img = t.image(100, 100, 200, 100);
    t.stroke(hline(150, 120, 280, 2));
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
    const under = t.image(120, 180, 160, 40);
    const zone = t.rect(100, 150, 300, 250, "#facc15");
    const raw = t.doc.elementIdsOfKind.bind(t.doc);
    t.doc.elementIdsOfKind = (p: string, k: string): readonly string[] => (k === "fill" ? [zone] : raw(p, k));
    sweep(t.tool(), [[150, 200], [250, 200]]);
    expect(deleted(t.alls)).toEqual([]);
    expect(t.alls[0]![0]?.type).toBe("Erase");
    expect(t.doc.element(zone)).not.toBeNull();
    expect(t.doc.element(under)?.kind).toBe("image");
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
    // Intérieur d'un grand rectangle vide d'abord (une sonde par échantillon, aucune touche), image en fin de chemin.
    t.rect(0, 0, 1700, 400, null);
    const img = t.image(1800, 0, 200, 400);
    const tool = t.tool();
    tool.begin(1, [s(100, 200)]);
    tool.extend(1, [s(1990, 200)], []);
    const before = t.hits.n;
    tool.frame();
    expect(t.hits.n - before).toBeLessThanOrEqual(ERASER_PROBES_PER_FRAME);
    expect(tool.live().hidden.has(img)).toBe(false);
    tool.close(1, "end");
    expect(deleted(t.alls)).toContain(img);
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
    engine.undo();
    expect(doc.element(rect)?.kind).toBe("shape");
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

**Worktree :** la tâche tourne dans un worktree à elle, `<worktree de la tâche>`, préparé par l'orchestrateur (Wasm copié, `pnpm install` fait) ; toutes ses commandes visent ce dossier.

**Fichiers :**
- Modifier : `apps/web/src/ui/cell-menu.ts:11,50`
- Modifier : `apps/web/src/engine/tools/table.ts:431-454`
- Tests : `apps/web/src/ui/cell-menu.test.ts`, `apps/web/src/engine/tools/table.test.ts:766,845-846`

**Interfaces :**
- Consomme : rien.
- Produit : `CellMenuItem.id: "fit" | "cell-image" | "unplace" | "header" | "delete-table"`.
- Réutilise : `apps/web/src/ui/cell-menu.ts:11` (`CellMenuItem`) et `apps/web/src/engine/tools/table.ts:438` (`openMenu`) — id `"delete-table"`, `run: () => ctx.run({ type: "Delete", ids: [at.ref.id] })`

**Test et commande bornée :**
`cd <worktree de la tâche>/apps/web && npx -y pnpm@12.18.0 exec vitest run src/engine/tools/table.test.ts src/ui/cell-menu.test.ts --reporter=verbose 2>&1 | grep -E "Test Files|Tests  |FAIL|Supprimer le tableau"`
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
cd <worktree de la tâche>
for f in apps/web/src/ui/cell-menu.ts apps/web/src/ui/cell-menu.test.ts apps/web/src/engine/tools/table.ts apps/web/src/engine/tools/table.test.ts; do git add "$f"; done
git commit -m "feat: delete a table from its cell menu (OG41 L1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t4"></a>
### Tâche T4 — Essai `gomme-objets` et captures 2x du lot L1

**Objectif :** un essai Playwright neuf, joué sur la VM, prouve S1 à S4 dans l'application construite et produit les
captures 2x du lot L1 dans `docs/design/captures/gomme-et-barre-objet/` (barre avec une seule gomme, trait coupé, forme
effacée, tableau dont seul le contenu est effacé), avant (`main`, `--avant`) et après. Il est inscrit à `scripts/verifier.sh
--e2e` sans option de capture.

**Fichiers :**
- Créer : `scripts/essais/gomme-objets-navigateur.mjs`
- Modifier : `scripts/verifier.sh:168-170` (bloc `--e2e`), `scripts/tests/verifier-e2e.test.sh:44`
- Produits par l'orchestrateur sur la VM (non écrits par la tâche) : `docs/design/captures/gomme-et-barre-objet/avant/*.png`, `…/apres/*.png`

**Interfaces :**
- Consomme : T1 (une seule gomme, `data-item="eraser"`), T2 (règle de la gomme), T3 (`.rb-cell-menu button[data-menu-item="delete-table"]`).
- Réutilise : `scripts/essais/commun.mjs` — `loadPlaywright`, `serve`, `frames`, `item`, `clickItem`, `stageBox`, `stageMouse`, `dropFile`, `solidPng`, `Echec`
- Réutilise : `scripts/essais/gestes.mjs` — `newPage`, `touchDrag`, `tapStage`, `waitAttr`, `attr`, `saved`, `readState`
- Produit : `node scripts/essais/gomme-objets-navigateur.mjs [--dist <build>] [--captures <dossier>] [--avant]` ; codes 0 réussi, 1 échec, 2 outil absent ; en `--avant`, aucun contrôle n'arrête l'essai (chaque contrôle est imprimé `avant — <message> : oui|non`).

**Test et commande bornée (Mac, sans navigateur) :**
`cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet && node --check scripts/essais/gomme-objets-navigateur.mjs && bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3`
Attendu : aucune sortie de `node --check`, puis `verifier-e2e.test.sh : OK`. Rouge d'abord : la ligne ajoutée au test
échoue (`gomme-objets-navigateur absent de verifier.sh`) tant que `verifier.sh` ne l'appelle pas.

**Preuve visuelle (orchestrateur, VM) :**
1. Après : `node scripts/essais/gomme-objets-navigateur.mjs --captures docs/design/captures/gomme-et-barre-objet/apres` —
   lectures d'abord (lignes `lu — data-elements=…`, `lu — genres=…`), puis captures `l1-barre-une-gomme.png`,
   `l1-trait-coupe.png`, `l1-forme-effacee-avant-relache.png`, `l1-forme-effacee.png`, `l1-tableau-contenu-efface.png`.
2. Avant : construire `origin/main` dans un dossier jetable de la VM, puis
   `node scripts/essais/gomme-objets-navigateur.mjs --dist <main>/apps/web/dist --avant --captures docs/design/captures/gomme-et-barre-objet/avant`.
3. Décrire chaque paire (une gomme contre deux ; formes restées sur `main`, effacées après).

**Contraintes (recopiées de Global Constraints) :**
- G4 Essais navigateur sur la VM seulement, joués par l'orchestrateur ; cette tâche crée un essai et modifie `verifier.sh` (dit dans « terminé »).
- G5 Essais existants verts sans réécriture de fond ; aucun seuil changé.
- G6 Design : cibles ≥ 44 px ; tactile d'abord (la gomme au doigt, CDP) ; netteté § 10 (captures `deviceScaleFactor` 2).
- G7 Commits en anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers ajoutés un par un.
- G1 Mac pour écrire, pas de Rust. G8 CLI non touchée (l'essai la lit par `readState`, sans l'écrire).

**Interdits :** passer `--captures` depuis `verifier.sh` (garde de `verifier-e2e.test.sh`) ; lancer Playwright sur le Mac ;
écrire dans `docs/design/captures/` depuis la tâche (l'orchestrateur le fait sur la VM).

**Critère « terminé » :** commande bornée verte ; essai créé et inscrit à `verifier.sh --e2e` (à jouer sur la VM par
l'orchestrateur, avec et sans `--avant`). Rapport : `Réutilisation : appelé commun.mjs et gestes.mjs`.

**Étapes :**

- [ ] **Étape 1 : test rouge de la liste e2e**

`scripts/tests/verifier-e2e.test.sh`, après la ligne 44 (gomme-paume), ajouter :

```bash
# OG41 gomme unique (objets entiers, tableau épargné) : ligne à part, comme OG25.
grep -q "scripts/essais/gomme-objets-navigateur.mjs" scripts/verifier.sh || ko "gomme-objets-navigateur absent de verifier.sh"
```

Lancer `bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3` : attendu `ECHEC : gomme-objets-navigateur absent de verifier.sh`.

- [ ] **Étape 2 : écrire l'essai**

Créer `scripts/essais/gomme-objets-navigateur.mjs` :

```js
#!/usr/bin/env node
// OG41 L1 : une seule gomme (cadrage docs/plans/gomme-et-barre-objet-cadrage.md, § 6, S1 à S4). Application construite
// servie en local, Chromium sans tête, `deviceScaleFactor` 2. Objets posés à la souris (outils de la barre, dépôt d'image) ;
// la gomme au doigt (protocole CDP), au stylet retourné et à la paume (PointerEvent synthétiques, comme gomme-paume).
// Genres lus par `roomboard state` (gestes.mjs, `saved`). `--captures <dossier>` : captures 2x. `--avant` : même parcours
// sur `main`, contrôles imprimés sans arrêter l'essai (captures « avant »).
// Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/gomme-objets-navigateur.mjs [--dist <build>] [--captures <dossier>] [--avant]
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Echec, clickItem, dropFile, frames, item, loadPlaywright, serve, solidPng, stageBox, stageMouse } from "./commun.mjs";
import { newPage, pixelAt, saved, touchDrag } from "./gestes.mjs";

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
};
const dist = opt("--dist");
const captures = opt("--captures");
const avant = argv.includes("--avant");
const COL = 240; // TABLE_COL_WIDTH (apps/web/src/engine/table-geom.ts:15)
const ROW = 64; // TABLE_ROW_HEIGHT

const pw = await loadPlaywright();
if (!pw) {
  console.error("Playwright absent (cache npx)");
  process.exit(2);
}
if (captures) mkdirSync(captures, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), "og41-l1-"));
const server = await serve(dist ? { dist } : {});
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ args: ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"] });
let failed = false;
const check = (cond, msg) => {
  if (avant) return void console.log(`avant — ${msg} : ${cond ? "oui" : "non"}`);
  if (!cond) throw new Echec(`échec — ${msg}`);
  console.log(`ok — ${msg}`);
};
const lire = (label, v) => console.log(`lu — ${label}=${v}`);

async function scenario(name, run) {
  const s = await newPage(browser, base, { scale: 2 });
  try {
    await run(s);
    check(s.errors.length === 0, `${name} : aucune erreur dans la page${s.errors.length ? ` (${s.errors.join(" | ")})` : ""}`);
  } finally {
    await s.ctx.close();
  }
}
const tools = (page) => ({
  elements: async () => {
    await frames(page);
    return Number(await page.getAttribute("#stage", "data-elements"));
  },
  drag: async (pts) => {
    const m = stageMouse(page);
    await m.move(...pts[0]);
    await m.down();
    for (const p of pts.slice(1)) await m.move(p[0], p[1], { steps: 8 });
    await m.up();
    await frames(page);
  },
  kinds: async (name) => {
    const { elements } = await saved(page, tmp, `${name}.roomboard`);
    const k = elements.map((e) => e.kind).sort().join(",");
    lire(`${name} genres`, k);
    return elements;
  },
  shot: async (name, sel) => {
    if (!captures) return;
    const path = join(captures, name);
    const clip = sel && (await page.locator(sel).count()) > 0 ? await page.locator(sel).first().boundingBox() : null;
    await page.screenshot({ path, ...(clip ? { clip } : {}), animations: "disabled", caret: "hide", scale: "device" });
    console.log(`capture : ${path}`);
  },
});

try {
  // S1 — une seule gomme ; trait coupé ; Ctrl+Z, Ctrl+Y.
  await scenario("S1", async ({ page, cdp }) => {
    const t = tools(page);
    const erasers = await page.locator(item("eraser")).count();
    const modes = await page.locator(item("eraser-mode")).count();
    lire("boutons eraser / eraser-mode", `${erasers} / ${modes}`);
    check(erasers === 1 && modes === 0, "S1 : la barre ne montre qu'une gomme");
    await t.shot("l1-barre-une-gomme.png", '[data-island="outils"]');
    await clickItem(page, "pen");
    await t.drag([[300, 400], [800, 400]]);
    await clickItem(page, "eraser");
    await touchDrag(page, cdp, [550, 330], [550, 470], { steps: 14 });
    lire("data-elements après la gomme", await t.elements());
    check((await t.elements()) === 2, "S1 : un trait coupé en deux morceaux (1 → 2)");
    await t.shot("l1-trait-coupe.png");
    await page.keyboard.press("Control+z");
    check((await t.elements()) === 1, "S1 : Ctrl+Z une fois : un seul trait");
    await page.keyboard.press("Control+y");
    check((await t.elements()) === 2, "S1 : Ctrl+Y : deux morceaux");
  });

  // S2 — objets entiers en un passage, une étape ; contre-épreuves.
  await scenario("S2", async ({ page, cdp }) => {
    const t = tools(page);
    await clickItem(page, "rect");
    await t.drag([[200, 220], [320, 320]]);
    await dropFile(page, "#stage", "bleu.png", solidPng(120, 90, [29, 78, 216]), "image/png", [480, 270]);
    await frames(page);
    await clickItem(page, "text");
    await stageMouse(page).click(620, 250);
    await page.keyboard.type("Bonjour");
    await page.keyboard.press("Escape");
    await clickItem(page, "arrow");
    await t.drag([[760, 270], [880, 270]]);
    await clickItem(page, "pen");
    await t.drag([[960, 180], [960, 360]]);
    const n0 = await t.elements();
    lire("data-elements avant la gomme", n0);
    // Témoins hors du chemin de la gomme (y 258-282, que la traînée repeint) : bord gauche du rectangle, un pixel bleu de l'image.
    const dark = (px) => px[0] + px[1] + px[2] < 300;
    const blue = (px) => px[2] > 150 && px[0] < 80;
    const edge = [200, 235];
    let pic = null;
    for (const c of [[480, 235], [480, 305], [530, 300], [540, 330]]) if (blue(await pixelAt(page, ...c))) { pic = c; break; }
    lire("témoins", `bord ${dark(await pixelAt(page, ...edge))}, image ${pic}`);
    await clickItem(page, "eraser");
    const end = await touchDrag(page, cdp, [150, 270], [1000, 270], { steps: 40, hold: true });
    const edgeGone = !dark(await pixelAt(page, ...edge));
    const picGone = pic !== null && !blue(await pixelAt(page, ...pic));
    lire("pendant le geste", `bord effacé ${edgeGone}, image effacée ${picGone}`);
    check(edgeGone && picGone, "S2 : pendant le geste, la forme et l'image disparaissent de l'écran (D6)");
    await t.shot("l1-forme-effacee-avant-relache.png");
    await end();
    const n1 = await t.elements();
    lire("data-elements après la gomme", n1);
    check(n0 === 5 && n1 === 2, `S2 : forme, image, texte, flèche effacés, le trait coupé (5 → 2 ; lu ${n0} → ${n1})`);
    await t.shot("l1-forme-effacee.png");
    await page.keyboard.press("Control+z");
    check((await t.elements()) === 5, "S2 : un seul Ctrl+Z rend les quatre objets et le trait entier");
  });

  await scenario("S2 contre-épreuves", async ({ page, cdp }) => {
    const t = tools(page);
    // Trait posé sur une image, gommé le long du trait : l'image reste.
    await dropFile(page, "#stage", "vert.png", solidPng(200, 120, [22, 163, 74]), "image/png", [600, 400]);
    await frames(page);
    await clickItem(page, "pen");
    await t.drag([[500, 400], [700, 400]]);
    await clickItem(page, "eraser");
    await touchDrag(page, cdp, [570, 400], [630, 400], { steps: 8 });
    const a = await t.kinds("s2-trait-sur-image");
    check(a.filter((e) => e.kind === "image").length === 1 && a.filter((e) => e.kind === "stroke").length === 2, "S2 : trait sur une image, gommé sur le trait : l'image reste, le trait est coupé");
    // Image sur image : un plan par passage.
    await dropFile(page, "#stage", "rouge.png", solidPng(200, 120, [220, 38, 38]), "image/png", [600, 400]);
    await frames(page);
    await clickItem(page, "eraser");
    await touchDrag(page, cdp, [470, 430], [730, 430], { steps: 20 });
    const b = await t.kinds("s2-image-sur-image");
    check(b.filter((e) => e.kind === "image").length === 1, "S2 : deux images superposées : seule celle du dessus part");
    await touchDrag(page, cdp, [470, 430], [730, 430], { steps: 20 });
    const c = await t.kinds("s2-second-passage");
    check(c.filter((e) => e.kind === "image").length === 0, "S2 : un second passage efface l'autre");
  });

  await scenario("S2 pot et forme vide", async ({ page, cdp }) => {
    const t = tools(page);
    // Trois traits fermés (triangle, sommets qui se chevauchent), remplis au pot ; un passage croise deux côtés et l'intérieur.
    await clickItem(page, "pen");
    await t.drag([[290, 450], [510, 450]]);
    await t.drag([[495, 460], [395, 270]]);
    await t.drag([[405, 270], [305, 460]]);
    await clickItem(page, "fill");
    await stageMouse(page).click(400, 400);
    await frames(page);
    await clickItem(page, "eraser");
    await touchDrag(page, cdp, [300, 400], [500, 400], { steps: 24 });
    const p = await t.kinds("s2-pot");
    check(p.some((e) => e.kind === "fill"), "S2 : le remplissage du pot reste (D30)");
    check(p.filter((e) => e.kind === "stroke").length >= 5, "S2 : les deux côtés traversés sont coupés (3 traits → 5 morceaux au moins)");
    await clickItem(page, "rect");
    await t.drag([[700, 300], [1000, 450]]);
    await clickItem(page, "pen");
    await t.drag([[770, 375], [930, 375]]);
    await clickItem(page, "eraser");
    await touchDrag(page, cdp, [810, 375], [890, 375], { steps: 8 });
    const f = await t.kinds("s2-forme-vide");
    check(f.some((e) => e.kind === "shape"), "S2 : un rectangle sans fond autour du trait gommé reste (D31)");
    await touchDrag(page, cdp, [750, 330], [950, 330], { steps: 16 }); // intérieur, à 30 px du bord haut et du trait
    const g = await t.kinds("s2-interieur");
    check(g.some((e) => e.kind === "shape"), "S2 : un passage dans l'intérieur vide, loin du bord : le rectangle reste (D31)");
  });

  // S3 — tableau épargné, contenu traité ; « Supprimer le tableau » ; Suppr.
  await scenario("S3", async ({ page, cdp }) => {
    const t = tools(page);
    const box = await stageBox(page);
    const cam = (await page.getAttribute("#stage", "data-camera")).split(",").map(Number);
    const sc = (wx, wy) => [wx * cam[0] + cam[1], wy * cam[0] + cam[2]];
    const ORIGIN = [200, 200];
    const o = [(ORIGIN[0] - cam[1]) / cam[0], (ORIGIN[1] - cam[2]) / cam[0]];
    const cell = (r, c) => sc(o[0] + COL * c + COL / 2, o[1] + ROW * r + ROW / 2);
    await clickItem(page, "table");
    await stageMouse(page).click(...ORIGIN);
    await page.waitForSelector(".rb-table-picker:not([hidden])", { timeout: 5000 });
    await page.click('button[aria-label="3 colonnes, 3 lignes"]');
    await page.keyboard.press("Escape");
    await frames(page);
    await stageMouse(page).click(...cell(0, 0)); // patron personnalisation-3-tableau-navigateur.mjs:390
    await page.keyboard.type("Lundi");
    await page.keyboard.press("Escape");
    await frames(page);
    await clickItem(page, "select");
    await dropFile(page, "#stage", "photo.png", solidPng(60, 40, [90, 60, 30]), "image/png", [900, 600]);
    await frames(page);
    await touchDrag(page, cdp, [900, 600], cell(1, 1));
    await page.keyboard.press("Escape");
    await clickItem(page, "pen");
    await t.drag([cell(2, 2).map((v, i) => v - (i === 0 ? 40 : 0)), cell(2, 2).map((v, i) => v + (i === 0 ? 40 : 0))]);
    await clickItem(page, "eraser");
    await touchDrag(page, cdp, cell(0, 0), cell(2, 2), { steps: 30 });
    const s = await t.kinds("s3-apres-gomme");
    const table = s.find((e) => e.kind === "table");
    check(table !== undefined, "S3 : le tableau reste");
    check(JSON.stringify(table ?? {}).includes("Lundi"), "S3 : le texte de la case (0, 0) reste");
    check(!s.some((e) => e.kind === "image"), "S3 : l'image logée en (1, 1) est effacée");
    check(s.filter((e) => e.kind === "stroke").length >= 2, "S3 : le trait de la case (2, 2) est coupé");
    await t.shot("l1-tableau-contenu-efface.png");
    // Les morceaux du trait gardent leur case : ils suivent le tableau déplacé (Maj+→, 5 px).
    await clickItem(page, "select");
    await stageMouse(page).click(...cell(0, 2));
    const strokes = (els) => JSON.stringify(els.filter((e) => e.kind === "stroke"));
    const before = strokes(s);
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Escape");
    const moved = await t.kinds("s3-deplace");
    check(strokes(moved) !== before, "S3 : les morceaux du trait suivent le tableau quand on le déplace");
    // Appui long sur une case, outil Tableau : « Supprimer le tableau ».
    await clickItem(page, "table");
    const [lx, ly] = cell(0, 2);
    const pt = { x: box.x + lx, y: box.y + ly, id: 1, radiusX: 4, radiusY: 4, force: 0.5 };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt] });
    await page.waitForSelector(".rb-cell-menu:not([hidden])", { timeout: 5000 });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await frames(page);
    const del = page.locator('.rb-cell-menu button[data-menu-item="delete-table"]');
    const h = (await del.boundingBox())?.height ?? 0;
    check((await del.count()) === 1 && h >= 44, `S3 : le menu de case propose « Supprimer le tableau » (${h} px de haut)`);
    if ((await del.count()) === 1) await del.click();
    else await page.keyboard.press("Escape");
    const d = await t.kinds("s3-supprime");
    check(!d.some((e) => e.kind === "table") && d.some((e) => e.kind === "stroke"), "S3 : tableau supprimé, les traits libres restent");
    await page.keyboard.press("Control+z");
    check((await t.kinds("s3-rendu")).some((e) => e.kind === "table"), "S3 : Ctrl+Z rend le tableau");
    await clickItem(page, "select");
    const [tx, ty] = cell(0, 2);
    await stageMouse(page).click(tx, ty);
    await page.keyboard.press("Delete");
    check(!(await t.kinds("s3-suppr")).some((e) => e.kind === "table"), "S3 : outil Sélection, toucher le tableau, Suppr : même effet");
  });

  // S4 — stylet retourné (bouton gomme) et paume : mêmes règles, une étape.
  await scenario("S4", async ({ page }) => {
    const t = tools(page);
    const send = (list) =>
      page.evaluate(async (evs) => {
        const st = document.querySelector("#stage");
        const r = st.getBoundingClientRect();
        for (const e of evs) {
          if (e.wait) await new Promise((res) => setTimeout(res, e.wait));
          const lift = e.type === "pointerup";
          st.dispatchEvent(new PointerEvent(e.type, {
            bubbles: true, cancelable: true, pointerId: e.id, pointerType: e.pt, isPrimary: false,
            clientX: r.left + e.x, clientY: r.top + e.y, width: e.w ?? 1, height: e.h ?? e.w ?? 1,
            pressure: lift ? 0 : 0.5, buttons: lift ? 0 : (e.b ?? 1),
          }));
        }
      }, list);
    const line = (id, x0, x1, y, o) => {
      const out = [];
      for (let x = x0 + 10; x <= x1; x += 10) out.push({ type: "pointermove", id, x, y, ...o });
      return out;
    };
    await clickItem(page, "rect");
    await t.drag([[300, 250], [420, 350]]);
    await clickItem(page, "pen");
    await t.drag([[500, 200], [500, 400]]);
    const pen = { pt: "pen", b: 32 };
    await send([{ type: "pointerdown", id: 21, x: 250, y: 300, ...pen }, ...line(21, 250, 560, 300, pen), { type: "pointerup", id: 21, x: 560, y: 300, ...pen }]);
    const a = await t.kinds("s4-stylet");
    check(!a.some((e) => e.kind === "shape") && a.filter((e) => e.kind === "stroke").length === 2, "S4 : stylet retourné : forme effacée, trait coupé");
    await page.keyboard.press("Control+z");
    check((await t.elements()) === 2, "S4 : une étape (un Ctrl+Z rend la forme et le trait entier)");
    await send([
      { type: "pointerdown", id: 22, x: 250, y: 300, pt: "touch", w: 30 },
      { type: "pointermove", id: 22, x: 255, y: 300, pt: "touch", w: 140, h: 120, wait: 40 },
      ...line(22, 255, 560, 300, { pt: "touch", w: 140, h: 120 }),
      { type: "pointerup", id: 22, x: 560, y: 300, pt: "touch" },
    ]);
    const b = await t.kinds("s4-paume");
    check(!b.some((e) => e.kind === "shape") && b.filter((e) => e.kind === "stroke").length === 2, "S4 : paume : forme effacée, trait coupé");
  });
} catch (e) {
  failed = true;
  console.error(e instanceof Echec ? e.message : e);
} finally {
  await browser.close();
  server.close();
  rmSync(tmp, { recursive: true, force: true });
}
console.log(failed ? "gomme-objets : ÉCHEC" : "gomme-objets : OK");
process.exit(failed ? 1 : 0);
```

`--avant` est jouable sur `main` : `check` n'y arrête rien, aucun clic ne vise un élément propre à OG41 sans garde (le menu
« Supprimer le tableau » absent : Échap). Captures en 2x (`newPage(…, { scale: 2 })`, `scale: "device"`), PNG, dans
`docs/design/captures/gomme-et-barre-objet/avant|apres`.

S4 « import d'un `.rbprofile` qui porte `eraser-mode` » est prouvé par `toolbar.test.ts` (« action retirée lue sans
avertissement », T1) ; l'essai ne l'importe pas.

- [ ] **Étape 3 : inscrire l'essai**

`scripts/verifier.sh`, après `  node scripts/essais/gomme-paume-navigateur.mjs` (l. 169), ajouter :

```bash
  node scripts/essais/gomme-objets-navigateur.mjs
```

- [ ] **Étape 4 : commande bornée** — `node --check …` silencieux, `verifier-e2e.test.sh : OK`.

- [ ] **Étape 5 : commit**

```bash
cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet
for f in scripts/essais/gomme-objets-navigateur.mjs scripts/verifier.sh scripts/tests/verifier-e2e.test.sh; do git add "$f"; done
git commit -m "test: browser trial for the single eraser, 2x captures (OG41 L1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t5"></a>
### Tâche T5 — Ce qui entoure le cadre : `overlayKeepOut`, `selectionKeepOut`

**Objectif :** une seule source, dans le calque d'édition, des rectangles écran (px de la scène, cibles comprises) de
tout ce qui entoure le cadre de la sélection : huit poignées de taille, poignée « Déplacer », poignées « + », badges de
lien et de copie (DA2). Le moteur l'expose par `selectionKeepOut()` ; la barre d'objet n'a aucune constante de poignée.

**Fichiers :**
- Modifier : `apps/web/src/engine/render/overlay.ts` (ajout en fin de fichier, imports en tête)
- Modifier : `apps/web/src/engine/tools/handles.ts:51-52` (deux constantes exportées). Écart déclaré à la carte d'impact,
  qui donne `handles.ts` « non touché » : les portées de « Déplacer » y sont privées ; les exporter évite de les recopier
  dans `overlay.ts` (DA2, une seule source). Aucune valeur ni comportement ne change.
- Modifier : `apps/web/src/engine/engine.ts` (interface `Engine` près de `camera(): Camera;`, objet `engine` près de `run, runAll,`)
- Tests : `apps/web/src/engine/render/overlay.test.ts`, `apps/web/src/engine/engine.test.ts`

**Interfaces :**
- Consomme : rien des autres tâches de L2.
- Produit : `export interface ScreenRect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }` ;
  `export interface ElementBadges { readonly bounds: Bounds; readonly link: boolean; readonly copy: boolean }` ;
  `export function overlayKeepOut(o: EditOverlay, camera: Camera, touch: boolean, badges: readonly ElementBadges[] = []): readonly ScreenRect[]`
  (`overlay.ts`) ; `Engine.selectionKeepOut(): readonly ScreenRect[]` (vide sans sélection ; `touch` = dernier pointeur
  autre que la souris). `ScreenRect` a la forme de `Rect` d'`ui/island-place.ts` (compatible par structure).
- Réutilise : `apps/web/src/engine/render/overlay.ts:35` (`EditOverlay`), `apps/web/src/engine/tools/handles.ts:8-61` (`handlesOf`, `HANDLE_GRAB_PX`, `moveHandlePoint`), `apps/web/src/engine/tools/line-points.ts:17-18` (`LINK_REACH_PX`), `apps/web/src/engine/render/link-badge.ts:16-19,80-94` (`linkBadgeBox`, `copyBadgeBox`, `LINK_TOUCH_PX`, `LINK_MOUSE_PX`) — **nouveau** `overlayKeepOut(o, camera, touch, badges)` dans `overlay.ts`, et `Engine.selectionKeepOut(): readonly ScreenRect[]`

**Patron à ne pas reprendre (concepteur-critique) :** recopier dans la barre les distances des poignées (28, 40, 22,
12 px) ; recalculer le cadre depuis `selectionBounds` sans le calque de l'outil (pendant un glisser, `handles` est faux et
les poignées ne sont pas dessinées : `apps/web/src/engine/tools/select.ts:386-394`). Référence du dessin à suivre :
`apps/web/src/engine/render/canvas2d.ts:543-575` (badges, « Déplacer ») et `:869-880` (« + »).

**Test et commande bornée :**
`cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet/apps/web && npx -y pnpm@12.18.0 exec vitest run src/engine/render/overlay.test.ts src/engine/engine.test.ts src/engine/render/link-badge.test.ts --reporter=verbose 2>&1 | grep -E "Test Files|Tests  |FAIL|overlayKeepOut|selectionKeepOut"`
Attendu : `Test Files  3 passed`, `Tests  N passed` (N ≥ 1), lignes `overlayKeepOut` et `selectionKeepOut`, aucun `FAIL`.

**Contraintes (recopiées de Global Constraints) :**
- G1 Mac, aucune modification Rust. G2 commande ci-dessus ; suite complète en fin de tâche (référence 4742 passés, 1 rouge propre au Mac `profile-actions.test.ts`). G3 `tsc --noEmit` vide.
- G5 TDD, test rouge d'abord, aucun test sauté, aucun seuil changé. G6 cibles ≥ 44 px (les zones gardées comptent les cibles au doigt). G7 commits en anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un. G8 CLI et S6 non touchées.

**Interdits :** changer le dessin ou le toucher des poignées (`canvas2d.ts`, `select.ts`, `hitMoveHandle`) ; importer
depuis `src/ui` dans `src/engine`.

**Critère « terminé » :** commande bornée verte ; `tsc --noEmit` vide ; suite sans nouveau rouge. Rapport :
`Réutilisation : appelé handlesOf, moveHandlePoint, linkBadgeBox, copyBadgeBox` ou `Réutilisation : écart — <pourquoi>` ;
la ligne d'écart sur `handles.ts` (constantes exportées).
À signaler au rapport : la poignée de rotation d'OG33 (B4) devra entrer dans `overlayKeepOut`.

**Étapes :**

- [ ] **Étape 1 : tests rouges du calque**

`apps/web/src/engine/render/overlay.test.ts` : compléter l'import (`overlayKeepOut`) et ajouter `import { IDENTITY } from "../camera";`,
`import { linkBadgeBox, copyBadgeBox } from "./link-badge";`, puis :

```ts
describe("overlayKeepOut (OG41, DA2)", () => {
  const frame = { x0: 100, y0: 200, x1: 300, y1: 300 };
  const sq = (x: number, y: number, half: number) => ({ x: x - half, y: y - half, w: 2 * half, h: 2 * half });
  it("overlayKeepOut : sans cadre, rien", () => {
    expect(overlayKeepOut(EMPTY_OVERLAY, IDENTITY, true)).toEqual([]);
  });
  it("overlayKeepOut : huit poignées, carrés de 24 px (prise de 12 px) centrés sur les coins et les milieux", () => {
    const r = overlayKeepOut({ ...EMPTY_OVERLAY, frame, handles: true }, IDENTITY, false);
    expect(r).toHaveLength(8);
    expect(r).toContainEqual(sq(100, 200, 12));
    expect(r).toContainEqual(sq(200, 300, 12));
  });
  it("overlayKeepOut : pendant un glisser (handles faux), ni poignées ni « Déplacer »", () => {
    expect(overlayKeepOut({ ...EMPTY_OVERLAY, frame, handles: false, move: true }, IDENTITY, true)).toEqual([]);
  });
  it("overlayKeepOut : « Déplacer » 28 px au-dessus du milieu haut, 22 px au doigt, 12 px à la souris", () => {
    const o = { ...EMPTY_OVERLAY, frame, handles: true, move: true };
    expect(overlayKeepOut(o, IDENTITY, true)).toContainEqual(sq(200, 172, 22));
    expect(overlayKeepOut(o, IDENTITY, false)).toContainEqual(sq(200, 172, 12));
  });
  it("overlayKeepOut : ligne seule (sans cadre) : ses points d'extrémité, 22 px au doigt, 12 à la souris", () => {
    const o = { ...EMPTY_OVERLAY, points: [{ x: 100, y: 100, kind: "point" as const, selected: false }, { x: 300, y: 100, kind: "point" as const, selected: false }] };
    expect(overlayKeepOut(o, IDENTITY, true)).toEqual([sq(100, 100, 22), sq(300, 100, 22)]);
    expect(overlayKeepOut(o, IDENTITY, false)).toEqual([sq(100, 100, 12), sq(300, 100, 12)]);
  });
  it("overlayKeepOut : poignées « + », prise de 22 px", () => {
    const r = overlayKeepOut({ ...EMPTY_OVERLAY, frame, handles: true, links: [{ dir: "up", x: 200, y: 160 }] }, IDENTITY, true);
    expect(r).toContainEqual(sq(200, 160, 22));
  });
  it("overlayKeepOut : badges de lien et de copie, cible de 44 px au doigt, 24 à la souris", () => {
    const o = { ...EMPTY_OVERLAY, frame, handles: true };
    const lb = linkBadgeBox(frame, IDENTITY);
    const cb = copyBadgeBox(frame, IDENTITY);
    const touch = overlayKeepOut(o, IDENTITY, true, [{ bounds: frame, link: true, copy: true }]);
    expect(touch).toContainEqual(sq(lb.x + lb.size / 2, lb.y + lb.size / 2, 22));
    expect(touch).toContainEqual(sq(cb.x + cb.size / 2, cb.y + cb.size / 2, 22));
    const mouse = overlayKeepOut(o, IDENTITY, false, [{ bounds: frame, link: true, copy: false }]);
    expect(mouse).toContainEqual(sq(lb.x + lb.size / 2, lb.y + lb.size / 2, 12));
    expect(mouse).toHaveLength(9);
  });
});
```

`apps/web/src/engine/engine.test.ts`, dans `describe("createEngine", …)` (imports `createSelectTool`, `worldToScreen`
déjà présents) :

```ts
  it("OG41 (DA2) selectionKeepOut : vide sans sélection ; rectangle seul : 8 poignées et 4 « + », px de la scène", () => {
    const doc = fakeCore.blank();
    const engine = createEngine({ doc, renderer: new FakeRenderer(), frames: new Frames(), tools: { pen: (ctx) => fakeTool("pen", [], ctx), eraser: (ctx) => fakeTool("eraser", [], ctx), select: (ctx) => createSelectTool(ctx) } });
    engine.resize(1280, 720, 1);
    expect(engine.selectionKeepOut()).toEqual([]);
    const page = engine.state().page;
    const id = engine.run({ type: "AddShape", page, shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style: PEN, fill: null })?.ids[0] ?? "";
    engine.select([id]);
    const b = engine.state().selectionBounds!;
    const [sx, sy] = worldToScreen(engine.camera(), b.x0, b.y0);
    const keep = engine.selectionKeepOut();
    expect(keep).toHaveLength(12);
    expect(keep).toContainEqual({ x: sx - 12, y: sy - 12, w: 24, h: 24 });
  });
```

- [ ] **Étape 2 : lancer, constater le rouge** — commande bornée : `FAIL` (`overlayKeepOut` et `selectionKeepOut` absents).

- [ ] **Étape 3 : `handles.ts` — portées exportées**

Lignes 51-52, remplacer par :

```ts
export const MOVE_REACH_TOUCH_PX = 22;
export const MOVE_REACH_MOUSE_PX = 12;
```

- [ ] **Étape 4 : `overlay.ts` — `overlayKeepOut`**

En tête d'`apps/web/src/engine/render/overlay.ts`, remplacer l'import par :

```ts
import type { Bounds, LinkDir, Look, Matrix, ShapeKind, StrokeStyle } from "../../core/api";
import { worldToScreen, type Camera } from "../camera";
import { HANDLE_GRAB_PX, MOVE_REACH_MOUSE_PX, MOVE_REACH_TOUCH_PX, handlesOf, moveHandlePoint } from "../tools/handles";
import { LINK_REACH_PX, POINT_REACH_PX, POINT_REACH_TOUCH_PX } from "../tools/line-points";
import { LINK_MOUSE_PX, LINK_TOUCH_PX, copyBadgeBox, linkBadgeBox } from "./link-badge";
```

En fin de fichier :

```ts
/** OG41 (DA2) : rectangle écran, px CSS de la scène. Même forme que `Rect` (ui/island-place.ts). */
export interface ScreenRect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
/** Badges d'un élément sélectionné (lien T18, « copie » OG23), lus sur son aspect par le moteur. */
export interface ElementBadges { readonly bounds: Bounds; readonly link: boolean; readonly copy: boolean }
/** Demi-côté dessiné du rond « Déplacer » (24 px, `paintMoveHandle`). */
const MOVE_DRAWN_HALF_PX = 12;

/** OG41 (DA2) : ce qui entoure la sélection, cibles comprises, en px de la scène : huit poignées de taille (prise
 *  `HANDLE_GRAB_PX`), « Déplacer » (22 px au doigt, 12 à la souris), « + » (`LINK_REACH_PX`), points d'une ligne ou d'une
 *  flèche seule (calque sans cadre, `select.ts:375-380` : `POINT_REACH_TOUCH_PX` au doigt, `POINT_REACH_PX` à la
 *  souris), badges de lien et de copie (44 px au doigt, 24 à la souris). Une seule source pour la barre d'objet : une
 *  poignée ajoutée au calque (rotation d'OG33) n'est évitée que si elle entre ici. Calque vide : rien. */
export function overlayKeepOut(o: EditOverlay, camera: Camera, touch: boolean, badges: readonly ElementBadges[] = []): readonly ScreenRect[] {
  const out: ScreenRect[] = [];
  const square = (x: number, y: number, half: number): void => void out.push({ x: x - half, y: y - half, w: 2 * half, h: 2 * half });
  const world = (x: number, y: number, half: number): void => {
    const [sx, sy] = worldToScreen(camera, x, y);
    square(sx, sy, half);
  };
  for (const p of o.points ?? []) world(p.x, p.y, touch ? POINT_REACH_TOUCH_PX : POINT_REACH_PX);
  if (o.frame !== null && o.handles) {
    for (const h of handlesOf(o.frame)) world(h.x, h.y, HANDLE_GRAB_PX);
    if (o.move === true) {
      const [mx, my] = moveHandlePoint(o.frame, camera.zoom);
      world(mx, my, Math.max(MOVE_DRAWN_HALF_PX, touch ? MOVE_REACH_TOUCH_PX : MOVE_REACH_MOUSE_PX));
    }
  }
  for (const k of o.links ?? []) world(k.x, k.y, LINK_REACH_PX);
  const reach = (touch ? LINK_TOUCH_PX : LINK_MOUSE_PX) / 2;
  for (const b of badges) {
    const boxes = [...(b.link ? [linkBadgeBox(b.bounds, camera)] : []), ...(b.copy ? [copyBadgeBox(b.bounds, camera)] : [])];
    for (const x of boxes) square(x.x + x.size / 2, x.y + x.size / 2, Math.max(x.size / 2, reach));
  }
  return out;
}
```

(L'import de `line-points.ts` crée un cycle de modules par types seulement de son côté ; la constante n'est lue qu'à
l'appel : sans effet à l'initialisation.)

- [ ] **Étape 5 : `engine.ts` — `selectionKeepOut`**

Import : ajouter `overlayKeepOut, type ElementBadges, type ScreenRect` à l'import de `./render/overlay` (l. 22).
Interface `Engine`, juste avant `camera(): Camera;` :

```ts
  /** OG41 (DA2) : rectangles écran (px de la scène) de ce qui entoure le cadre de la sélection, cibles comprises
   *  (`overlayKeepOut`) ; vide sans sélection. */
  selectionKeepOut(): readonly ScreenRect[];
```

Objet `engine`, après `    runAll,` :

```ts
    selectionKeepOut() {
      const sel = selectTool.selection();
      if (sel.length === 0) return [];
      const badges: ElementBadges[] = [];
      for (const id of sel) {
        const look = doc.element(id)?.look;
        const link = look?.link !== undefined;
        const copy = look?.dragCopy === true;
        const b = link || copy ? doc.bounds([id]) : null;
        if (b !== null) badges.push({ bounds: b, link, copy });
      }
      return overlayKeepOut(selectTool.live().overlay ?? EMPTY_OVERLAY, camera, lastPointer !== "mouse", badges);
    },
```

- [ ] **Étape 6 : commande bornée, typage, suite.**

- [ ] **Étape 7 : commit**

```bash
cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet
for f in apps/web/src/engine/render/overlay.ts apps/web/src/engine/render/overlay.test.ts apps/web/src/engine/tools/handles.ts apps/web/src/engine/engine.ts apps/web/src/engine/engine.test.ts; do git add "$f"; done
git commit -m "feat: one source for what surrounds the selection frame (OG41 L2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t6"></a>
### Tâche T6 — Placement pur `placeObjectBar`

**Objectif :** une fonction pure, sans DOM, en px entiers, qui place la barre d'objet : centrée sur le cadre, 8 px
au-dessus de tout ce qui l'entoure, sinon 8 px en dessous, sinon dans la vue en haut ; chaque place décalée à côté des
obstacles de l'interface par `placeLinkAvoiding`, la suivante essayée si l'obstacle reste ; bornée à 8 px des bords (D20, DA3).

**Fichiers :**
- Modifier : `apps/web/src/ui/island-place.ts` (après `placeLinkAvoiding`, l. 182-190)
- Tests : `apps/web/src/ui/island-place.test.ts`

**Interfaces :**
- Consomme : rien (les zones gardées arrivent en `Rect`, forme de `ScreenRect` de T5).
- Produit : `export const OBJECT_BAR_GAP = 8` ; `export interface ObjectBarPlace { readonly left: number; readonly top: number; readonly side: "above" | "below" | "inside" }` ;
  `export function placeObjectBar(frame: Rect, bar: Box, area: Box, keepOut: readonly Rect[], obstacles: readonly Rect[]): ObjectBarPlace`.
  Tous les rectangles dans le repère de `area` (px de la zone, origine en haut à gauche).
- Réutilise : `apps/web/src/ui/island-place.ts:182` (`placeLinkAvoiding`, précédent de l'éditeur de lien `OptionsPanel.tsx:622-626`) et `apps/web/src/app/table-picker.ts:29` (`placeWithin`) — `export function placeObjectBar(frame: Rect, bar: Box, area: Box, keepOut: readonly Rect[], obstacles: readonly Rect[]): { left: number; top: number; side: "above" | "below" | "inside" }` dans `island-place.ts`

**Test et commande bornée :**
`cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet/apps/web && npx -y pnpm@12.18.0 exec vitest run src/ui/island-place.test.ts --reporter=verbose 2>&1 | grep -E "Test Files|Tests  |FAIL|placeObjectBar"`
Attendu : `Test Files  1 passed`, `Tests  N passed` (N ≥ 1), au moins huit lignes `placeObjectBar`, aucun `FAIL`.

**Contraintes (recopiées de Global Constraints) :**
- G1 Mac, pas de Rust. G2 commande ci-dessus ; suite complète en fin de tâche (référence 4742 passés, 1 rouge propre au Mac `profile-actions.test.ts`). G3 `tsc --noEmit` vide.
- G5 TDD, test rouge d'abord. G7 commits en anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un.
- G10 Aucune instruction `switch` dans `src/ui` ; px entiers, jamais `translate(-50%)`.

**Interdits :** lire le DOM ; dupliquer le décalage de `placeLinkAvoiding` ; toucher un autre fichier (T5 et T8 tournent en parallèle).

**Critère « terminé » :** commande bornée verte ; `tsc --noEmit` vide. Rapport : `Réutilisation : appelé placeLinkAvoiding et placeWithin`.

**Étapes :**

- [ ] **Étape 1 : tests rouges**

`apps/web/src/ui/island-place.test.ts` : ajouter `placeObjectBar` à l'import depuis `./island-place`, puis :

```ts
describe("placeObjectBar (OG41, D20)", () => {
  const area = { w: 1280, h: 900 };
  const bar = { w: 180, h: 44 };
  const frame = { x: 400, y: 300, w: 200, h: 100 };
  it("placeObjectBar : au-dessus, centrée, 8 px au-dessus des zones gardées (S5)", () => {
    const p = placeObjectBar(frame, bar, area, [{ x: 488, y: 250, w: 24, h: 24 }], []);
    expect(p).toEqual({ left: 410, top: 198, side: "above" });
  });
  it("placeObjectBar : pas de place au-dessus : 8 px sous le cadre et sous les « + » (S6)", () => {
    const top = { x: 400, y: 20, w: 200, h: 100 };
    const p = placeObjectBar(top, bar, area, [{ x: 478, y: 138, w: 44, h: 44 }], []);
    expect(p).toEqual({ left: 410, top: 190, side: "below" });
  });
  it("placeObjectBar : ni dessus ni dessous : dans la vue, en haut (S6)", () => {
    const p = placeObjectBar({ x: 0, y: 0, w: 1280, h: 900 }, bar, area, [], []);
    expect(p).toEqual({ left: 550, top: 8, side: "inside" });
  });
  it("placeObjectBar : dedans : 8 px sous les poignées du haut, jamais sur elles", () => {
    const p = placeObjectBar({ x: 0, y: 0, w: 1280, h: 900 }, bar, area, [{ x: -12, y: -12, w: 24, h: 24 }, { x: 628, y: -12, w: 24, h: 24 }], []);
    expect(p).toEqual({ left: 550, top: 20, side: "inside" });
  });
  it("placeObjectBar : barre d'outils en bas, objet collé en bas : au-dessus, hors de l'îlot (S6)", () => {
    const low = { x: 400, y: 760, w: 200, h: 100 };
    const tools = { x: 300, y: 828, w: 680, h: 56 };
    expect(placeObjectBar(low, bar, area, [], [tools])).toEqual({ left: 410, top: 708, side: "above" });
  });
  it("placeObjectBar : obstacle sur la place du dessus : décalée à sa droite (D20, placeLinkAvoiding)", () => {
    const p = placeObjectBar(frame, bar, area, [], [{ x: 380, y: 230, w: 100, h: 60 }]);
    expect(p).toEqual({ left: 488, top: 248, side: "above" });
  });
  it("placeObjectBar : obstacle impossible à éviter au-dessus (toute la largeur) : la place du dessous", () => {
    const p = placeObjectBar(frame, bar, area, [], [{ x: 0, y: 200, w: 1280, h: 90 }]);
    expect(p.side).toBe("below");
    expect(p.top).toBe(408);
  });
  it("placeObjectBar : vue plus étroite que la barre : bornée à 8 px, px entiers (Review Focus 5)", () => {
    const p = placeObjectBar({ x: 40.3, y: 200.6, w: 50.2, h: 30.1 }, bar, { w: 150, h: 400 }, [], []);
    expect(p.left).toBe(8);
    expect(Number.isInteger(p.top)).toBe(true);
    expect(p.side).toBe("above");
  });
});
```

- [ ] **Étape 2 : lancer, constater le rouge** — `FAIL` : `placeObjectBar` absent.

- [ ] **Étape 3 : implémenter dans `island-place.ts`, après `placeLinkAvoiding`**

```ts
/** OG41 (D20) : écart entre la barre d'objet et ce qui entoure le cadre, et marge aux bords de la vue. */
export const OBJECT_BAR_GAP = 8;
export interface ObjectBarPlace { readonly left: number; readonly top: number; readonly side: "above" | "below" | "inside" }

const crosses = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** OG41 (D20, DA3) : place de la barre d'objet `bar` dans `area`, centrée sur le cadre `frame` de la sélection, à 8 px
 *  au-dessus de tout ce qui l'entoure (`keepOut` : poignées, « + », « Déplacer », badges, cibles comprises), sinon 8 px en
 *  dessous, sinon dans la vue, 8 px sous les zones gardées du haut du cadre. Chaque place évite les `obstacles` (îlots, panneau d'options, barre
 *  latérale) par `placeLinkAvoiding` ; une place qui en croise encore un est abandonnée pour la suivante (la dernière
 *  essayée est gardée). Bornée à 8 px des bords (`placeWithin`) ; px entiers. */
export function placeObjectBar(frame: Rect, bar: Box, area: Box, keepOut: readonly Rect[], obstacles: readonly Rect[]): ObjectBarPlace {
  const m = OBJECT_BAR_GAP;
  const around = [frame, ...keepOut];
  const top = Math.min(...around.map((r) => r.y));
  const bottom = Math.max(...around.map((r) => r.y + r.h));
  // Dedans : sous les zones gardées du haut du cadre (poignées, « Déplacer », badges), pas sur elles.
  const topZone = Math.max(frame.y, ...keepOut.filter((r) => r.y < frame.y + m).map((r) => r.y + r.h));
  const maxX = Math.max(m, area.w - m - bar.w);
  const inner = { w: Math.max(0, area.w - 2 * m), h: Math.max(0, area.h - 2 * m) };
  const within = (x: number, y: number): Point => {
    const p = placeWithin({ x: x - m, y: y - m }, bar, inner);
    return { x: Math.round(p.x + m), y: Math.round(p.y + m) };
  };
  const x0 = within(frame.x + frame.w / 2 - bar.w / 2, frame.y).x;
  const tries: readonly (readonly [ObjectBarPlace["side"], number, boolean])[] = [
    ["above", top - m - bar.h, top - m - bar.h >= m],
    ["below", bottom + m, bottom + m + bar.h <= area.h - m],
    ["inside", Math.max(topZone, 0) + m, true],
  ];
  let last: ObjectBarPlace | null = null;
  for (const [side, y, fits] of tries) {
    if (!fits) continue;
    const at = within(x0, y);
    const left = placeLinkAvoiding({ x: at.x, y: at.y, w: bar.w, h: bar.h }, obstacles, maxX);
    last = { left, top: at.y, side };
    if (!obstacles.some((o) => crosses({ x: left, y: at.y, w: bar.w, h: bar.h }, o))) return last;
  }
  return last ?? { left: x0, top: m, side: "inside" };
}
```

- [ ] **Étape 4 : commande bornée, typage.** Si un attendu diffère d'un pixel par l'arrondi de `placeWithin`, relire le
calcul (centre 500 − 90 = 410 ; 250 − 8 − 44 = 198 ; 182 + 8 = 190 ; 300 − 8 − 44 = 248 ; 400 + 8 = 408), ne pas changer l'attendu.

- [ ] **Étape 5 : commit**

```bash
cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet
for f in apps/web/src/ui/island-place.ts apps/web/src/ui/island-place.test.ts; do git add "$f"; done
git commit -m "feat: pure placement of the object bar around the selection (OG41 L2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t7"></a>
### Tâche T7 — Composant `ObjectBar` (icônes, « … », clavier, tactile)

**Objectif :** la barre d'objet elle-même : îlot blanc d'icônes seules (36 px visibles, cible 44 px, pas de 44 px,
hauteur 44 px), seuls les boutons utiles, dans l'ordre Dupliquer · Copier · Coller · Grouper · Dégrouper · Image ·
Supprimer · « … » ; menu « … » (icône + libellé) : Premier plan, Arrière-plan, Exporter la sélection. Infobulle avec le
raccourci ; appui long = infobulle sans action ; posée par `placeObjectBar`, suit l'état et la caméra, cachée pendant un
geste dans la scène ; Maj+F10 ou Menu y met le focus, tabindex itinérant, touches du moteur gardées (D18-D26).
Monté par T9 ; ici le composant, ses tables et ses dépendances (icônes, raccourci, hôte).

**Fichiers :**
- Créer : `apps/web/src/ui/object-bar.ts`, `apps/web/src/ui/object-bar.test.ts`, `apps/web/src/ui/ObjectBar.tsx`, `apps/web/src/ui/ObjectBar.test.tsx`
- Modifier : `apps/web/src/ui/icons.ts` (cinq icônes Lucide), `apps/web/src/ui/MenuBar.tsx:19-25` (`MENU_STEP` exporté),
  `apps/web/src/ui/rb.css` (après `.rb-cell-menu`, l. 292), `apps/web/src/ui/shortcuts.ts` (après `line-edit`),
  `apps/web/src/engine/input/keys.ts` (après `objectKey`, l. 82-95), `apps/web/src/app/toolbar-host.ts:9`,
  `apps/web/src/ui/SelectionRow.tsx:23-29` (deux clés de `DISABLED`, pour que le `Record<SelectionAction, …>` élargi compile ; T9 réécrit le fichier),
  `apps/web/src/app/workspace.ts:848-858`, `THIRD_PARTY_NOTICES.md` (section Lucide design L1-L4, l. 608-630)
- Tests : `ui/icons.test.ts`, `ui/rb-css.test.ts`, `ui/shortcuts.test.ts`, `engine/input/keys.test.ts`,
  `app/toolbar-host.test.ts`, `app/workspace.test.ts`, `ui/MenuBar.test.tsx` (vert tel quel), `ui/HelpPanel.test.tsx` (vert tel quel)

**Interfaces :**
- Consomme (T6) : `placeObjectBar(frame: Rect, bar: Box, area: Box, keepOut: readonly Rect[], obstacles: readonly Rect[]): ObjectBarPlace`.
- Consomme (T5, par structure) : `selectionKeepOut(): readonly Rect[]` (px de la scène).
- Produit (`ui/object-bar.ts`) : `type ObjectActionId = SelectionAction | "image" | "layer-front" | "layer-back"` ;
  `interface ObjectAction { id; label; icon; shortcut: string | null; more: boolean }` ; `OBJECT_ACTIONS: readonly ObjectAction[]` ;
  `objectActionShown(a: ObjectActionId, v: ToolbarView): boolean` ;
  `playObjectAction(a: ObjectActionId, host: Pick<ToolbarHost, "selection" | "runAction" | "imagePanel">): void`.
- Produit (`ui/ObjectBar.tsx`) : `interface ObjectBarEngine { camera(): Camera; onCamera(cb: (c: Camera) => void): () => void; selectionKeepOut(): readonly Rect[] }` ;
  `type ObjectBarView = ToolbarView & { readonly selectionBounds?: Bounds | null }` ;
  `interface ObjectBarProps { view: Accessor<ObjectBarView>; host: ToolbarHost; engine: Accessor<ObjectBarEngine>; stage: Accessor<HTMLElement>; mount: HTMLElement; obstacles: Accessor<readonly Rect[]> }`
  (`obstacles` en px de la fenêtre, `getBoundingClientRect`) ; `ObjectBar(props: ObjectBarProps): JSX.Element` ;
  `OBJECT_BAR_LABEL = "Actions de l'objet"`, `MORE_LABEL = "Plus d'actions"`. Attributs : `[data-object-bar]`,
  `[data-selection-action="<id>"]`, `[data-object-more]`, `[data-object-menu]`.
- Produit : `SelectionAction = "group" | "ungroup" | "copy" | "paste" | "export" | "duplicate" | "delete"` ;
  `objectMenuKey(e: KeyLike): boolean` ; `MENU_STEP` (exporté de `MenuBar.tsx`) ; ligne `SHORTCUTS` `object-bar`.
- Réutilise : `apps/web/src/ui/IconButton.tsx:110` et `apps/web/src/ui/shortcuts.ts` (`buttonShortcut`) — `IconButton({ icon, label, attrs: { "data-selection-action": id }, shortcut, onPress })`
- Réutilise : `apps/web/src/ui/MenuBar.tsx:20,27` (`STEP`, `placeMenu`) ; CSS `[data-menu-list]` — exporter `STEP` sous le nom `MENU_STEP` ; `placeMenu(anchor, list, view)`
- Réutilise : `apps/web/src/app/toolbar-host.ts:9,155` (`selection(a)`, `runAction`, `imagePanel`) ; `apps/web/src/engine/engine.ts:301-304` — `SelectionAction` gagne `"duplicate" | "delete"` → `deleteSelection()`, `duplicateSelection()`
- Réutilise : `apps/web/src/ui/SelectionRow.tsx:23-33` (`DISABLED`, `selectionDisabled`) — table déplacée dans `ui/object-bar.ts`, prédicat « montré » au lieu de « grisé » (`OBJECT_ACTIONS`, `objectActionShown`)
- Réutilise : `apps/web/src/engine/engine.ts:354` (`onCamera`), `apps/web/src/engine/camera.ts:20` (`worldToScreen`) — abonnement dans `ObjectBar`
- Réutilise : `apps/web/src/app/table-picker.ts:41` (`ENGINE_KEYS`), repris par `MenuBar.tsx:112` — `if (!e.ctrlKey && !e.metaKey && ENGINE_KEYS.has(e.key)) e.stopPropagation()`
- Réutilise : `apps/web/src/ui/tooltip.ts:101` (`createTip`, `TIP_HOLD_MS`) — l'infobulle d'`IconButton` ; `TIP_HOLD_MS` décide qu'un appui long n'agit pas
- Nouveau module (cadrage, termes `MediaBar|rb-popover|selectionBounds|worldToScreen`) : `apps/web/src/ui/ObjectBar.tsx` — `ObjectBar(props)` ci-dessus

**Patron à ne pas reprendre (concepteur-critique) :**
- la barre flottante calée en haut à gauche de la scène (`.rb-popover` de `MediaBar`, `apps/web/src/ui/App.tsx:691-703`) :
  elle ne suit pas l'objet ;
- la rangée Sélection à libellés et boutons grisés (`apps/web/src/ui/SelectionRow.tsx:35-58`) ;
- `e.stopPropagation()` de `pointerdown` sur la racine (patron `cell-menu.ts:94`) : `IconButton` reçoit ses
  `onPointerDown` par la délégation de Solid au document ; arrêter l'événement couperait l'infobulle. La barre est hors de
  `#stage` (seul écouteur de l'échantillonneur, `board-session.ts:419`) : rien à arrêter.
Chemins de référence : `apps/web/src/ui/cell-menu.ts:1-60` (racine dans le conteneur, menu clavier),
`apps/web/src/ui/MenuBar.tsx:100-125` (garde des touches du moteur).

**Test et commande bornée :**
`cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet/apps/web && npx -y pnpm@12.18.0 exec vitest run src/ui/object-bar.test.ts src/ui/ObjectBar.test.tsx src/ui/icons.test.ts src/ui/rb-css.test.ts src/ui/shortcuts.test.ts src/ui/HelpPanel.test.tsx src/ui/MenuBar.test.tsx src/engine/input/keys.test.ts src/app/toolbar-host.test.ts src/app/workspace.test.ts --reporter=verbose 2>&1 | grep -E "Test Files|Tests  |FAIL|appui long|Maj\+F10|liste ouverte"`
Attendu : `Test Files  10 passed`, `Tests  N passed` (N ≥ 1), lignes `appui long`, `Maj+F10`, `liste ouverte`, aucun `FAIL`.

**Contraintes (recopiées de Global Constraints) :**
- G1 Mac, pas de Rust. G2 commande ci-dessus ; suite complète en fin de tâche (référence 4742 passés, 1 rouge propre au Mac `profile-actions.test.ts`). G3 `tsc --noEmit` vide.
- G5 TDD, test rouge d'abord, aucun test sauté ni seuil changé.
- G6 Design : `docs/plans/design-cadrage.md` (jetons, icônes Lucide 24 px trait 1,5 `ICON_VIEWBOX`, netteté § 10) ; cibles ≥ 44 px ; tactile d'abord (événements de pointeur, appui long) ; chaque geste a un raccourci (Maj+F10, ceux des actions).
- G7 Commits en anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un.
- G10 Aucune instruction `switch` dans `src/ui` ; px entiers, jamais `translate(-50%)`.

**Interdits :** classe `rb-island` sur la barre (T8 compte tous les `.rb-island` comme obstacles : la barre s'éviterait
elle-même) ; HTML5 drag ; monter la barre dans `App.tsx` (T9) ; modifier `SelectionRow.tsx` (T9) ; inventer un tracé
d'icône (les cinq viennent de Lucide au commit `7981a0798a`).

**Critère « terminé » :** commande bornée verte ; `tsc --noEmit` vide ; suite sans nouveau rouge. Rapport :
`Réutilisation : appelé IconButton, buttonShortcut, placeMenu, MENU_STEP, placeObjectBar, worldToScreen, onCamera, ENGINE_KEYS` ou `Réutilisation : écart — <pourquoi>`.

**Étapes :**

- [ ] **Étape 1 : lire les cinq icônes Lucide**

```bash
for n in group ungroup clipboard-paste ellipsis image; do echo "== $n"; gh api "repos/lucide-icons/lucide/contents/icons/$n.svg?ref=7981a0798a" --jq .content | base64 --decode | grep -E "<(path|rect|circle|line|polyline|ellipse)"; done
```

Chaque balise devient une entrée `["<tag>", { <attributs> }]` d'`IconNode`, attributs recopiés tels quels (valeurs en
chaînes), dans l'ordre du fichier.

- [ ] **Étape 2 : tests rouges des tables, du raccourci, des icônes, du CSS, de l'hôte**

Créer `apps/web/src/ui/object-bar.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import type { ToolbarHost } from "../app/toolbar-host";
import type { ToolbarView } from "./item-state";
import { OBJECT_ACTIONS, objectActionShown, playObjectAction } from "./object-bar";

const base: ToolbarView = { tool: "select", canUndo: false, canRedo: false, pageIndex: 0, pageCount: 1, selection: ["a"], selectionUnits: 1 };
const shown = (v: ToolbarView): string[] => OBJECT_ACTIONS.filter((a) => objectActionShown(a.id, v)).map((a) => a.id);

describe("actions de la barre d'objet (OG41, D19)", () => {
  it("ordre : principales puis « … » (Premier plan, Arrière-plan, Exporter la sélection)", () => {
    expect(OBJECT_ACTIONS.filter((a) => !a.more).map((a) => a.id)).toEqual(["duplicate", "copy", "paste", "group", "ungroup", "image", "delete"]);
    expect(OBJECT_ACTIONS.filter((a) => a.more).map((a) => a.label)).toEqual(["Premier plan", "Arrière-plan", "Exporter la sélection"]);
  });
  it("seuls les boutons utiles : Coller avec presse-papiers, Grouper dès deux unités, Dégrouper avec un groupe, Image seule", () => {
    expect(shown(base)).toEqual(["duplicate", "copy", "delete", "layer-front", "layer-back", "export"]);
    expect(shown({ ...base, canPaste: true })).toContain("paste");
    expect(shown({ ...base, selection: ["a", "b"], selectionUnits: 2 })).toContain("group");
    expect(shown({ ...base, selectionGrouped: true })).toContain("ungroup");
    expect(shown({ ...base, selectionImage: "a" })).toContain("image");
    expect(shown({ ...base, selection: [] })).toEqual([]);
  });
  it("routes : sélection, runAction des calques, panneau d'image", () => {
    const host = { selection: vi.fn(), runAction: vi.fn(), imagePanel: vi.fn() } as unknown as ToolbarHost;
    for (const a of OBJECT_ACTIONS) playObjectAction(a.id, host);
    expect((host.selection as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])).toEqual(["duplicate", "copy", "paste", "group", "ungroup", "delete", "export"]);
    expect((host.runAction as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])).toEqual(["layer-front", "layer-back"]);
    expect(host.imagePanel).toHaveBeenCalledTimes(1);
  });
});
```

`apps/web/src/ui/icons.test.ts`, ajouter :

```ts
  it("OG41 (D18) : icônes de la barre d'objet, Lucide 7981a0798a, notice à jour", () => {
    for (const n of ["group", "ungroup", "clipboard-paste", "ellipsis", "image", "copy", "copy-plus", "trash-2", "bring-to-front", "send-to-back", "export"]) {
      expect(ICONS[n]?.length ?? 0, n).toBeGreaterThan(0);
    }
    for (const n of ["group", "ungroup", "clipboard-paste", "ellipsis", "image"]) expect(NOTICE, n).toContain(`\`${n}\``);
  });
```

`apps/web/src/ui/rb-css.test.ts`, ajouter :

```ts
describe("barre d'objet (OG41, D18, D26)", () => {
  it("îlot blanc rayon xl, filet et ombre ; caché par [hidden] ; boutons de 36 px, cible de 44 px", () => {
    expect(rule(".rb-object-bar")).toContain("position: absolute");
    expect(rule(".rb-object-bar")).toContain("block-size: 44px");
    expect(rule(".rb-object-bar")).toContain("gap: 8px");
    expect(rule(".rb-object-bar")).toContain("var(--rf-radius-xl)");
    expect(rule(".rb-object-bar")).toContain("var(--rf-shadow-hover)");
    expect(rule(".rb-object-bar[hidden]")).toContain("display: none");
    expect(rule(".rb-object-bar > button.rb-ib")).toContain("inline-size: 36px");
    expect(rule(".rb-object-bar > button.rb-ib::before")).toContain("inset: -4px");
  });
});
```

`apps/web/src/ui/shortcuts.test.ts`, ajouter :

```ts
  it("OG41 (D24) : Maj+F10 : « Barre de l'objet », groupe Édition", () => {
    expect(SHORTCUTS.find((x) => x.id === "object-bar")).toEqual({ id: "object-bar", group: "Édition", label: "Barre de l'objet", keys: "Maj+F10" });
  });
```

`apps/web/src/engine/input/keys.test.ts`, ajouter (importer `objectMenuKey`) :

```ts
  it("OG41 objectMenuKey : Maj+F10 ou Menu, hors saisie, sans Ctrl, Méta ni Alt", () => {
    const k = (key: string, o: Partial<KeyLike> = {}): KeyLike => ({ key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, isComposing: false, target: null, ...o });
    expect(objectMenuKey(k("F10", { shiftKey: true }))).toBe(true);
    expect(objectMenuKey(k("ContextMenu"))).toBe(true);
    expect(objectMenuKey(k("F10"))).toBe(false);
    expect(objectMenuKey(k("F10", { shiftKey: true, ctrlKey: true }))).toBe(false);
    expect(objectMenuKey(k("ContextMenu", { isComposing: true }))).toBe(false);
  });
```

`apps/web/src/app/workspace.test.ts`, après le test « selection(a) : grouper et dégrouper relayés au moteur » :

```ts
  it("OG41 selection(a) : dupliquer et supprimer relayés au moteur (D33)", async () => {
    const ws = await setupWorkspace();
    ws.selection("duplicate");
    ws.selection("delete");
    const e = ws.active().board.engine as unknown as { duplicateSelection: ReturnType<typeof vi.fn>; deleteSelection: ReturnType<typeof vi.fn> };
    expect([e.duplicateSelection.mock.calls.length, e.deleteSelection.mock.calls.length]).toEqual([1, 1]);
  });
```

Si le faux moteur de `workspace.test.ts` (chercher `group: vi.fn` dans le fichier) n'a pas `duplicateSelection` ni
`deleteSelection`, leur ajouter `duplicateSelection: vi.fn(() => true), deleteSelection: vi.fn(() => true),` à côté.

- [ ] **Étape 3 : tests rouges du composant**

Créer `apps/web/src/ui/ObjectBar.test.tsx` :

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolbarHost } from "../app/toolbar-host";
import type { Camera } from "../engine/camera";
import { MORE_LABEL, OBJECT_BAR_LABEL, ObjectBar, type ObjectBarView } from "./ObjectBar";

const BASE: ObjectBarView = { tool: "select", canUndo: false, canRedo: false, pageIndex: 0, pageCount: 1, selection: ["i"], selectionUnits: 1, selectionImage: "i", selectionBounds: { x0: 200, y0: 300, x1: 400, y1: 400 } };
let restore: (() => void) | null = null;
beforeEach(() => {
  const w = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
  const h = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get(this: HTMLElement) { return this.classList.contains("rb-object-bar") ? 180 : 0; } });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get(this: HTMLElement) { return this.classList.contains("rb-object-bar") ? 44 : 0; } });
  restore = () => {
    if (w) Object.defineProperty(HTMLElement.prototype, "offsetWidth", w);
    if (h) Object.defineProperty(HTMLElement.prototype, "offsetHeight", h);
  };
});
afterEach(() => {
  cleanup();
  restore?.();
  document.body.replaceChildren();
});

function setup(v: ObjectBarView = BASE, obs: { x: number; y: number; w: number; h: number }[] = []) {
  const [view, setView] = createSignal<ObjectBarView>(v);
  let cam: Camera = { zoom: 1, tx: 0, ty: 0 };
  const cbs = new Set<(c: Camera) => void>();
  const engine = { camera: () => cam, onCamera: (cb: (c: Camera) => void) => (cbs.add(cb), () => void cbs.delete(cb)), selectionKeepOut: () => [] };
  const host = { selection: vi.fn(), runAction: vi.fn(), imagePanel: vi.fn() } as unknown as ToolbarHost;
  const mount = document.createElement("main");
  Object.defineProperty(mount, "clientWidth", { value: 1280 });
  Object.defineProperty(mount, "clientHeight", { value: 900 });
  const stage = document.createElement("div");
  stage.tabIndex = -1;
  mount.append(stage);
  document.body.append(mount);
  render(() => <ObjectBar view={view} host={host} engine={() => engine} stage={() => stage} mount={mount} obstacles={() => obs} />);
  const bar = (): HTMLElement => mount.querySelector<HTMLElement>("[data-object-bar]")!;
  const ids = (): string[] => [...bar().querySelectorAll("[data-object-button]")].map((b) => b.getAttribute("data-selection-action") ?? "more");
  const moveCamera = (c: Camera): void => {
    cam = c;
    for (const cb of cbs) cb(c);
  };
  return { view, setView, host, mount, stage, bar, ids, moveCamera };
}

describe("ObjectBar (OG41, D18-D27)", () => {
  it("S5 : image seule : icônes Dupliquer, Copier, Image, Supprimer et « … », role toolbar, aria-label", () => {
    const t = setup();
    expect(t.bar().getAttribute("role")).toBe("toolbar");
    expect(t.bar().getAttribute("aria-label")).toBe(OBJECT_BAR_LABEL);
    expect(t.bar().hidden).toBe(false);
    expect(t.ids()).toEqual(["duplicate", "copy", "image", "delete", "more"]);
    expect(t.bar().querySelector('[data-selection-action="duplicate"]')?.getAttribute("aria-label")).toBe("Dupliquer");
    expect(t.bar().querySelector('[data-selection-action="duplicate"]')?.getAttribute("aria-keyshortcuts")).toBe("Control+D");
    expect(t.bar().querySelector("[data-object-more]")?.getAttribute("aria-label")).toBe(MORE_LABEL);
    expect(t.bar().classList.contains("rb-island")).toBe(false);
  });
  it("D21, D27 : sans sélection, autre outil ou en annotation : cachée", () => {
    const t = setup();
    t.setView({ ...BASE, selection: [] });
    expect(t.bar().hidden).toBe(true);
    t.setView({ ...BASE, tool: "pen" });
    expect(t.bar().hidden).toBe(true);
    t.setView({ ...BASE, annotation: { active: true, pointer: "draw", screens: 1 } });
    expect(t.bar().hidden).toBe(true);
  });
  it("S7 : deux unités : Grouper ; groupe : Dégrouper à sa place", () => {
    const t = setup({ ...BASE, selectionImage: null, selection: ["a", "b"], selectionUnits: 2 });
    expect(t.ids()).toEqual(["duplicate", "copy", "group", "delete", "more"]);
    t.setView({ ...BASE, selectionImage: null, selection: ["a", "b"], selectionUnits: 1, selectionGrouped: true });
    expect(t.ids()).toEqual(["duplicate", "copy", "ungroup", "delete", "more"]);
  });
  it("S5 : posée 8 px au-dessus du cadre, centrée, px entiers ; suit la caméra, même taille", () => {
    const t = setup();
    expect([t.bar().style.left, t.bar().style.top]).toEqual(["210px", "248px"]);
    t.moveCamera({ zoom: 2, tx: 0, ty: -300 });
    expect([t.bar().style.left, t.bar().style.top]).toEqual(["510px", "248px"]);
  });
  it("D25 : appui long (doigt) : infobulle sans action ; toucher court : action", () => {
    vi.useFakeTimers();
    try {
      const t = setup();
      const dup = t.bar().querySelector<HTMLButtonElement>('[data-selection-action="duplicate"]')!;
      fireEvent.pointerDown(dup, { pointerType: "touch" });
      vi.advanceTimersByTime(600);
      expect(document.querySelector('[role="tooltip"]')?.textContent).toBe("Dupliquer");
      fireEvent.pointerUp(dup, { pointerType: "touch" });
      fireEvent.click(dup);
      expect(t.host.selection).not.toHaveBeenCalled();
      fireEvent.pointerDown(dup, { pointerType: "touch" });
      vi.advanceTimersByTime(100);
      fireEvent.pointerUp(dup, { pointerType: "touch" });
      fireEvent.click(dup);
      expect(t.host.selection).toHaveBeenCalledWith("duplicate");
    } finally {
      vi.useRealTimers();
    }
  });
  it("D21 : pointeur enfoncé dans la scène : cachée ; relâché : reposée", () => {
    const t = setup();
    fireEvent.pointerDown(t.stage, { pointerType: "touch" });
    expect(t.bar().hidden).toBe(true);
    fireEvent.pointerUp(window, { pointerType: "touch" });
    expect(t.bar().hidden).toBe(false);
  });
  it("D25 : la barre est hors de la scène (dans le conteneur) : un appui sur elle n'atteint pas la scène", () => {
    const t = setup();
    expect(t.bar().parentElement).toBe(t.mount);
    expect(t.stage.contains(t.bar())).toBe(false);
    const seen = vi.fn();
    t.stage.addEventListener("pointerdown", seen);
    fireEvent.pointerDown(t.bar().querySelector("[data-object-button]")!, { pointerType: "touch" });
    expect(seen).not.toHaveBeenCalled();
    expect(t.bar().hidden).toBe(false);
  });
  it("D20 : obstacle posé après la barre (îlot placé à l'image suivante) : la barre se décale une image plus tard", async () => {
    const obs: { x: number; y: number; w: number; h: number }[] = [];
    const t = setup(BASE, obs);
    expect(t.bar().style.left).toBe("210px");
    obs.push({ x: 200, y: 240, w: 200, h: 60 });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
    expect(t.bar().style.left).toBe("408px");
  });
  it("effet de bord 12 : Suppr, Espace, Échap pressés dans la barre n'atteignent pas le moteur ; la sélection reste", () => {
    const t = setup();
    const engineKeys = vi.fn();
    window.addEventListener("keydown", engineKeys);
    fireEvent.keyDown(window, { key: "F10", shiftKey: true });
    engineKeys.mockClear();
    const first = document.activeElement as HTMLElement;
    for (const key of ["Delete", " ", "Backspace"]) fireEvent.keyDown(first, { key });
    fireEvent.keyDown(first, { key: "Escape" });
    expect(engineKeys).not.toHaveBeenCalled();
    expect(t.host.selection).not.toHaveBeenCalled();
    expect(t.bar().hidden).toBe(false);
    window.removeEventListener("keydown", engineKeys);
  });
  it("S7 : « … » : Premier plan, Arrière-plan, Exporter la sélection, icône et libellé ; jouées", () => {
    const t = setup();
    fireEvent.click(t.bar().querySelector("[data-object-more]")!);
    const rows = [...t.bar().querySelectorAll<HTMLButtonElement>("[data-object-menu] button[role=menuitem]")];
    expect(rows.map((r) => r.textContent?.trim())).toEqual(["Premier plan", "Arrière-plan", "Exporter la sélection"]);
    expect(rows.every((r) => r.querySelector("svg.rb-icon") !== null)).toBe(true);
    fireEvent.click(rows[0]!);
    expect(t.host.runAction).toHaveBeenCalledWith("layer-front");
    expect(t.bar().querySelector("[data-object-menu]")).toBeNull();
  });
  it("D24 : Maj+F10 met le focus sur le premier bouton ; ←/→ sans atteindre le moteur ; Échap rend la scène", () => {
    const t = setup();
    const engineKeys = vi.fn();
    window.addEventListener("keydown", engineKeys);
    fireEvent.keyDown(window, { key: "F10", shiftKey: true });
    const first = t.bar().querySelector<HTMLElement>('[data-selection-action="duplicate"]')!;
    expect(document.activeElement).toBe(first);
    engineKeys.mockClear();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(document.activeElement?.getAttribute("data-selection-action")).toBe("copy");
    expect(engineKeys).not.toHaveBeenCalled();
    expect([...t.bar().querySelectorAll<HTMLElement>("[data-object-button]")].filter((b) => b.tabIndex === 0)).toHaveLength(1);
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(document.activeElement).toBe(t.stage);
    window.removeEventListener("keydown", engineKeys);
  });
  it("D24 : sur « … », ↓ ouvre la liste, ↓ et Entrée jouent ; Échap ferme et rend le focus à « … »", () => {
    const t = setup();
    const more = t.bar().querySelector<HTMLElement>("[data-object-more]")!;
    more.focus();
    fireEvent.keyDown(more, { key: "ArrowDown" });
    const rows = (): HTMLElement[] => [...t.bar().querySelectorAll<HTMLElement>("[data-object-menu] button")];
    expect(document.activeElement).toBe(rows()[0]);
    fireEvent.keyDown(rows()[0]!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(rows()[1]);
    fireEvent.keyDown(rows()[1]!, { key: "Escape" });
    expect(t.bar().querySelector("[data-object-menu]")).toBeNull();
    expect(document.activeElement).toBe(more);
  });
  it("sélection vidée, liste ouverte : liste et barre fermées sans erreur (Review Focus 4)", () => {
    const t = setup();
    fireEvent.click(t.bar().querySelector("[data-object-more]")!);
    expect(() => t.setView({ ...BASE, selection: [], selectionBounds: null })).not.toThrow();
    expect(t.bar().querySelector("[data-object-menu]")).toBeNull();
    expect(t.bar().hidden).toBe(true);
  });
});
```

Calcul attendu du placement : cadre écran (200, 300)-(400, 400), barre 180 × 44 → gauche 300 − 90 = 210, haut
300 − 8 − 44 = 248 ; après la caméra (zoom 2, ty −300) : cadre (400, 300)-(800, 500) → gauche 600 − 90 = 510, haut 248.

- [ ] **Étape 4 : lancer, constater le rouge** — commande bornée : `FAIL` (modules absents).

- [ ] **Étape 5 : `toolbar-host.ts`, `workspace.ts`, `SelectionRow.tsx`**

`apps/web/src/app/toolbar-host.ts:9` :

```ts
export type SelectionAction = "group" | "ungroup" | "copy" | "paste" | "export" | "duplicate" | "delete";
```

`apps/web/src/app/workspace.ts`, dans `selection(a)` (l. 850-856), ajouter au `Record` :

```ts
        duplicate: () => void engine.duplicateSelection(),
        delete: () => void engine.deleteSelection(),
```

`apps/web/src/ui/SelectionRow.tsx:23-29` : `DISABLED` est un `Record<SelectionAction, …>` ; ajouter ses deux clés (la
rangée ne les rend pas, `SELECTION_ACTIONS` garde ses cinq entrées jusqu'à T9) :

```ts
  duplicate: (v) => (v.selection?.length ?? 0) === 0,
  delete: (v) => (v.selection?.length ?? 0) === 0,
```

- [ ] **Étape 6 : `keys.ts`, `shortcuts.ts`, `MenuBar.tsx`**

`apps/web/src/engine/input/keys.ts`, après `objectKey` :

```ts
/** OG41 (D24) : Maj+F10 ou la touche Menu, hors saisie, sans Ctrl, Méta ni Alt : focus sur la barre de l'objet. */
export function objectMenuKey(e: KeyLike): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing || inEditable(e.target)) return false;
  return e.key === "ContextMenu" || (e.key === "F10" && e.shiftKey);
}
```

`apps/web/src/ui/shortcuts.ts`, après la ligne `line-edit` :

```ts
  s("object-bar", "Édition", "Barre de l'objet", "Maj+F10"),
```

`apps/web/src/ui/MenuBar.tsx:19-25` : renommer la table en `export const MENU_STEP` (commentaire : `… ; OG41 : partagée
avec la barre d'objet.`) et remplacer ses usages internes `STEP` par `MENU_STEP` (`Object.hasOwn(STEP, …)` et `STEP[e.key]`).

- [ ] **Étape 7 : icônes et notice**

`apps/web/src/ui/icons.ts`, avant l'entrée `"copy-plus"` (l. 122), ajouter un bloc commenté
`// OG41 (barre d'objet) : Lucide @7981a0798a, ISC (group, ungroup, clipboard-paste, ellipsis, image).` puis les cinq
entrées lues à l'étape 1 (`"group": [...]`, `"ungroup": [...]`, `"clipboard-paste": [...]`, `"ellipsis": [...]`, `"image": [...]`).

`THIRD_PARTY_NOTICES.md`, dans la section « Icônes Lucide (ISC), design L1, L2, L3 et L4 », après la ligne `external-link` :

```
- Lues dans Lucide au même commit (OG41, barre d'objet) : `group`, `ungroup`, `clipboard-paste`, `ellipsis`, `image`.
```

- [ ] **Étape 8 : `rb.css`**

Après `.rb-cell-menu button:focus-visible { … }` (l. 292) :

```css
/* OG41 (D18, D26) : barre d'objet collée à la sélection, dans .rb-stages ; icônes de 24 px dans des boutons de 36 px,
   cible de 44 px par pseudo-élément, pas de 44 px, hauteur 44 px, taille fixe quel que soit S/M/L. */
.rb-object-bar { position: absolute; z-index: 5; display: flex; align-items: center; gap: 8px; box-sizing: border-box; block-size: 44px; padding: 0 4px; background: var(--rf-white); border-radius: var(--rf-radius-xl); box-shadow: 0 0 0 1px var(--rf-gray-300), var(--rf-shadow-hover); }
.rb-object-bar[hidden] { display: none; }
.rb-object-bar > button.rb-ib { position: relative; display: inline-grid; place-items: center; flex: none; inline-size: 36px; block-size: 36px; padding: 0; border: 0; border-radius: var(--rf-radius-lg); background: transparent; color: var(--rf-navy-500); cursor: pointer; }
.rb-object-bar > button.rb-ib::before { content: ""; position: absolute; inset: -4px; }
.rb-object-bar > button.rb-ib:hover { background: var(--rf-gray-50); }
.rb-object-bar > button.rb-ib:focus-visible { outline: 2px solid var(--rf-violet-600); outline-offset: -2px; }
```

- [ ] **Étape 9 : `object-bar.ts`**

```ts
/** Barre d'objet (OG41, D19) : actions, ordre et règle « montrée » (seuls les boutons utiles, aucun grisé), déplacées de
 *  `SelectionRow.tsx` (`DISABLED`). Tables de prédicats, jamais de `switch` (garde de src/ui). Recalée sur le menu de
 *  sélection de MyViewBoard : principales, puis « … » pour les calques et l'export. */
import type { SelectionAction, ToolbarHost } from "../app/toolbar-host";
import type { ToolbarView } from "./item-state";

export type ObjectActionId = SelectionAction | "image" | "layer-front" | "layer-back";
export interface ObjectAction {
  readonly id: ObjectActionId;
  readonly label: string;
  /** Icône de `ICONS` (Lucide). */
  readonly icon: string;
  /** Id de `SHORTCUTS` montré dans l'infobulle ; null sans raccourci. */
  readonly shortcut: string | null;
  /** Dans le menu « … ». */
  readonly more: boolean;
}
const a = (id: ObjectActionId, label: string, icon: string, shortcut: string | null, more = false): ObjectAction => Object.freeze({ id, label, icon, shortcut, more });
export const OBJECT_ACTIONS: readonly ObjectAction[] = Object.freeze([
  a("duplicate", "Dupliquer", "copy-plus", "duplicate"),
  a("copy", "Copier", "copy", "copy"),
  a("paste", "Coller", "clipboard-paste", "paste"),
  a("group", "Grouper", "group", "group"),
  a("ungroup", "Dégrouper", "ungroup", "ungroup"),
  a("image", "Image", "image", null),
  a("delete", "Supprimer", "trash-2", "delete"),
  a("layer-front", "Premier plan", "bring-to-front", "front", true),
  a("layer-back", "Arrière-plan", "send-to-back", "back", true),
  a("export", "Exporter la sélection", "export", null, true),
]);

const some = (v: ToolbarView): boolean => (v.selection?.length ?? 0) > 0;
const SHOWN: Readonly<Record<ObjectActionId, (v: ToolbarView) => boolean>> = {
  duplicate: some,
  copy: some,
  paste: (v) => some(v) && v.canPaste === true,
  group: (v) => some(v) && (v.selectionUnits ?? 0) >= 2,
  ungroup: (v) => some(v) && v.selectionGrouped === true,
  image: (v) => some(v) && !!v.selectionImage,
  delete: some,
  "layer-front": some,
  "layer-back": some,
  export: some,
};
export function objectActionShown(id: ObjectActionId, v: ToolbarView): boolean {
  return SHOWN[id](v);
}

type Host = Pick<ToolbarHost, "selection" | "runAction" | "imagePanel">;
const PLAY: Readonly<Record<ObjectActionId, (h: Host) => void>> = {
  duplicate: (h) => h.selection("duplicate"),
  copy: (h) => h.selection("copy"),
  paste: (h) => h.selection("paste"),
  group: (h) => h.selection("group"),
  ungroup: (h) => h.selection("ungroup"),
  delete: (h) => h.selection("delete"),
  export: (h) => h.selection("export"),
  image: (h) => h.imagePanel(),
  "layer-front": (h) => h.runAction("layer-front"),
  "layer-back": (h) => h.runAction("layer-back"),
};
export function playObjectAction(id: ObjectActionId, host: Host): void {
  PLAY[id](host);
}
```

- [ ] **Étape 10 : `ObjectBar.tsx`**

```tsx
/**
 * Barre d'objet (OG41, D18-D27, DA3) : petite pilule d'icônes collée à la sélection, posée par `placeObjectBar` dans le
 * conteneur des scènes (`.rb-stages`, comme le menu de case) : hors de `#stage`, ses appuis ne vont pas à
 * l'échantillonneur. Seuls les boutons utiles (`objectActionShown`) ; « … » porte Premier plan, Arrière-plan, Exporter.
 * Replacée à chaque état et caméra, taille constante à l'écran ; cachée pendant un geste dans la scène. Toucher = action,
 * appui long = infobulle seule. Clavier : Maj+F10 ou Menu y met le focus (tabindex itinérant, un arrêt de Tab), ← → Début
 * Fin, Entrée ou Espace, ↓ ou Entrée ouvre « … » (↑ ↓ Début Fin Entrée), Échap ferme puis rend le focus à la scène ; les
 * touches du moteur pressées dans la barre ne l'atteignent pas (`ENGINE_KEYS`, comme `MenuBar`).
 */
import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount, type Accessor, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import { ENGINE_KEYS } from "../app/table-picker";
import type { ToolbarHost } from "../app/toolbar-host";
import type { Bounds } from "../core/api";
import { worldToScreen, type Camera } from "../engine/camera";
import { objectMenuKey } from "../engine/input/keys";
import { keyOf } from "../key-of";
import { Icon, IconButton } from "./IconButton";
import { placeObjectBar, type ObjectBarPlace, type Rect } from "./island-place";
import type { ToolbarView } from "./item-state";
import { MENU_STEP, placeMenu } from "./MenuBar";
import { OBJECT_ACTIONS, objectActionShown, playObjectAction, type ObjectAction } from "./object-bar";
import { buttonShortcut } from "./shortcuts";
import { TIP_HOLD_MS } from "./tooltip";

export interface ObjectBarEngine {
  camera(): Camera;
  onCamera(cb: (c: Camera) => void): () => void;
  /** Px de la scène (`Engine.selectionKeepOut`, DA2). */
  selectionKeepOut(): readonly Rect[];
}
export type ObjectBarView = ToolbarView & { readonly selectionBounds?: Bounds | null };
export interface ObjectBarProps {
  readonly view: Accessor<ObjectBarView>;
  readonly host: ToolbarHost;
  readonly engine: Accessor<ObjectBarEngine>;
  /** Scène active : repère des rectangles du moteur ; reçoit le focus rendu par Échap. */
  readonly stage: Accessor<HTMLElement>;
  /** Conteneur des scènes (`.rb-stages`, position relative) : racine de la barre. */
  readonly mount: HTMLElement;
  /** Obstacles de l'interface, px de la fenêtre (`getBoundingClientRect`). */
  readonly obstacles: Accessor<readonly Rect[]>;
}
export const OBJECT_BAR_LABEL = "Actions de l'objet";
export const MORE_LABEL = "Plus d'actions";

/** ← → Début Fin dans la barre, sans bouclage. */
const BAR_STEP: Readonly<Record<string, (i: number, n: number) => number>> = {
  ArrowRight: (i, n) => Math.min(n - 1, i + 1),
  ArrowLeft: (i) => Math.max(0, i - 1),
  Home: () => 0,
  End: (_i, n) => n - 1,
};
const shift = (r: Rect, dx: number, dy: number): Rect => ({ x: r.x + dx, y: r.y + dy, w: r.w, h: r.h });

export function ObjectBar(props: ObjectBarProps): JSX.Element {
  let root: HTMLDivElement | undefined;
  let list: HTMLDivElement | undefined;
  const [pressed, setPressed] = createSignal(false);
  const [open, setOpen] = createSignal(false);
  const [camTick, setCamTick] = createSignal(0);
  const [at, setAt] = createSignal<ObjectBarPlace | null>(null);
  const [listAt, setListAt] = createSignal<{ left: number; top: number } | null>(null);
  let current = 0;
  let downAt = 0;
  let downType = "mouse";
  let held = false;

  const visible = createMemo(() => {
    const v = props.view();
    return v.tool === "select" && (v.selection?.length ?? 0) > 0 && v.annotation?.active !== true && (v.selectionBounds ?? null) !== null;
  });
  const main = createMemo(() => OBJECT_ACTIONS.filter((a) => !a.more && objectActionShown(a.id, props.view())));
  const more = createMemo(() => OBJECT_ACTIONS.filter((a) => a.more && objectActionShown(a.id, props.view())));
  const buttons = (): HTMLButtonElement[] => (root === undefined ? [] : [...root.querySelectorAll<HTMLButtonElement>("button[data-object-button]")]);
  const moreButton = (): HTMLButtonElement | null => root?.querySelector<HTMLButtonElement>("[data-object-more]") ?? null;

  const place = (): void => {
    const b = props.view().selectionBounds ?? null;
    if (root === undefined || b === null) return;
    const c = props.engine().camera();
    const [x0, y0] = worldToScreen(c, b.x0, b.y0);
    const [x1, y1] = worldToScreen(c, b.x1, b.y1);
    const host = props.mount.getBoundingClientRect();
    const st = props.stage().getBoundingClientRect();
    const ox = st.left - host.left;
    const oy = st.top - host.top;
    const frame: Rect = { x: Math.min(x0, x1) + ox, y: Math.min(y0, y1) + oy, w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
    const keep = props.engine().selectionKeepOut().map((r) => shift(r, ox, oy));
    const obstacles = props.obstacles().map((r) => shift(r, -host.left, -host.top));
    setAt(placeObjectBar(frame, { w: root.offsetWidth, h: root.offsetHeight }, { w: props.mount.clientWidth, h: props.mount.clientHeight }, keep, obstacles));
  };

  // Les îlots se posent par image et par ResizeObserver (Island.tsx:42-46, 246) : `islands()` est relu une image après
  // chaque place (un seul replacement, jamais en boucle), et à chaque changement de taille du conteneur.
  let settle = 0;
  const win = props.mount.ownerDocument.defaultView ?? window;
  const placeNow = (): void => {
    if (!visible() || pressed()) return;
    place();
    win.cancelAnimationFrame(settle);
    settle = win.requestAnimationFrame(() => {
      if (visible() && !pressed()) place();
    });
  };
  onCleanup(() => win.cancelAnimationFrame(settle));
  createEffect(() => {
    void props.view();
    void main().length;
    void more().length;
    void camTick();
    placeNow();
  });
  onMount(() => {
    if (typeof ResizeObserver !== "function") return;
    const ro = new ResizeObserver(() => placeNow());
    ro.observe(props.mount);
    onCleanup(() => ro.disconnect());
  });
  createEffect(() => {
    const off = props.engine().onCamera(() => setCamTick((n) => n + 1));
    onCleanup(off);
  });
  createEffect(() => {
    const st = props.stage();
    const down = (): void => {
      setOpen(false);
      setPressed(true);
    };
    st.addEventListener("pointerdown", down);
    onCleanup(() => st.removeEventListener("pointerdown", down));
  });
  createEffect(() => {
    if (!visible()) setOpen(false);
  });
  createEffect(() => {
    void main();
    void more().length;
    const all = buttons();
    if (current >= all.length) current = 0;
    all.forEach((b, k) => (b.tabIndex = k === current ? 0 : -1));
    moreButton()?.setAttribute("aria-expanded", open() ? "true" : "false");
  });

  const focusAt = (i: number): void => {
    const all = buttons();
    if (all.length === 0) return;
    current = Math.max(0, Math.min(i, all.length - 1));
    all.forEach((b, k) => (b.tabIndex = k === current ? 0 : -1));
    all[current]!.focus();
  };
  const toScene = (): void => {
    setOpen(false);
    const st = props.stage();
    st.focus({ preventScroll: true });
    const doc = props.mount.ownerDocument;
    if (doc.activeElement !== st && doc.activeElement instanceof HTMLElement) doc.activeElement.blur();
  };
  const openMore = (): void => {
    setOpen(true);
    const anchor = moreButton();
    if (list === undefined || anchor === null) return;
    const win = props.mount.ownerDocument.defaultView ?? window;
    setListAt(placeMenu(anchor.getBoundingClientRect(), { width: list.offsetWidth, height: list.offsetHeight }, { width: win.innerWidth, height: win.innerHeight }));
    list.querySelector<HTMLButtonElement>("button")?.focus();
  };
  const closeMore = (giveBack: boolean): void => {
    setOpen(false);
    if (giveBack) moreButton()?.focus();
  };
  const press = (a: ObjectAction): void => {
    if (held) {
      held = false;
      return;
    }
    if (a.more) setOpen(false);
    playObjectAction(a.id, props.host);
  };

  onMount(() => {
    const win = props.mount.ownerDocument.defaultView ?? window;
    const up = (): void => {
      if (pressed()) setPressed(false);
    };
    const key = (e: KeyboardEvent): void => {
      if (!visible() || pressed() || !objectMenuKey(keyOf(e))) return;
      e.preventDefault();
      focusAt(0);
    };
    const outside = (e: Event): void => {
      if (open() && root !== undefined && !root.contains(e.target as Node | null)) setOpen(false);
    };
    win.addEventListener("pointerup", up);
    win.addEventListener("pointercancel", up);
    win.addEventListener("keydown", key);
    props.mount.ownerDocument.addEventListener("pointerdown", outside, true);
    onCleanup(() => {
      win.removeEventListener("pointerup", up);
      win.removeEventListener("pointercancel", up);
      win.removeEventListener("keydown", key);
      props.mount.ownerDocument.removeEventListener("pointerdown", outside, true);
    });
  });

  const onListKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeMore(true);
      return;
    }
    if (e.key === "Tab") {
      closeMore(false);
      return;
    }
    const step = Object.hasOwn(MENU_STEP, e.key) ? MENU_STEP[e.key]! : undefined;
    if (step === undefined) return;
    e.preventDefault();
    const rows = [...(list?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    const i = rows.indexOf(e.target as HTMLButtonElement);
    rows[step(i < 0 ? 0 : i, rows.length)]?.focus();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (!e.ctrlKey && !e.metaKey && ENGINE_KEYS.has(e.key)) e.stopPropagation();
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (open() && list?.contains(e.target as Node)) return onListKey(e);
    if (e.key === "Escape") {
      e.preventDefault();
      toScene();
      return;
    }
    const all = buttons();
    const i = all.indexOf(e.target as HTMLButtonElement);
    if (i < 0) return;
    if (e.key === "ArrowDown" && all[i] === moreButton()) {
      e.preventDefault();
      openMore();
      return;
    }
    const step = Object.hasOwn(BAR_STEP, e.key) ? BAR_STEP[e.key]! : undefined;
    if (step === undefined) return;
    e.preventDefault();
    focusAt(step(i, all.length));
  };

  return (
    <Portal mount={props.mount}>
      <div
        ref={root}
        class="rb-object-bar"
        role="toolbar"
        aria-label={OBJECT_BAR_LABEL}
        data-object-bar
        data-side={at()?.side}
        hidden={!visible() || pressed()}
        style={at() === null ? { visibility: "hidden" } : { left: `${at()!.left}px`, top: `${at()!.top}px` }}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          downAt = Date.now();
          downType = e.pointerType;
          held = false;
        }}
        onPointerUp={() => {
          held = downType !== "mouse" && Date.now() - downAt >= TIP_HOLD_MS;
        }}
      >
        <For each={main()}>
          {(a) => (
            <IconButton
              icon={a.icon}
              label={a.label}
              shortcut={a.shortcut === null ? null : buttonShortcut(a.shortcut)}
              attrs={{ "data-selection-action": a.id, "data-object-button": "" }}
              onPress={() => press(a)}
            />
          )}
        </For>
        <Show when={more().length > 0}>
          <IconButton
            icon="ellipsis"
            label={MORE_LABEL}
            attrs={{ "data-object-more": "", "data-object-button": "", "aria-haspopup": "menu" }}
            onPress={() => (held ? (held = false) : open() ? closeMore(false) : openMore())}
          />
        </Show>
        <Show when={open()}>
          <div
            ref={list}
            role="menu"
            aria-label={MORE_LABEL}
            data-menu-list
            data-object-menu
            style={listAt() === null ? {} : { left: `${listAt()!.left}px`, top: `${listAt()!.top}px` }}
          >
            <For each={more()}>
              {(a) => {
                const keys = a.shortcut === null ? null : buttonShortcut(a.shortcut);
                return (
                  <button type="button" role="menuitem" data-selection-action={a.id} aria-keyshortcuts={keys?.aria ?? undefined} onClick={() => press(a)}>
                    <Icon name={a.icon} />
                    <span>{a.label}</span>
                    <Show when={keys}>{(k) => <span class="rb-menu-key" data-shortcut aria-hidden="true">{k().text}</span>}</Show>
                  </button>
                );
              }}
            </For>
          </div>
        </Show>
      </div>
    </Portal>
  );
}
```

Notes de mise au point (ne changent aucun test) : `openMore` est appelé après `setOpen(true)` ; Solid rend la liste dans
la même pile, `list` est donc posé quand `placeMenu` est appelé. Les lignes du menu ont le texte du libellé seul (le
raccourci est en `aria-hidden` dans `.rb-menu-key` ; si un test lit `textContent` d'une ligne qui porte un raccourci,
lire `span:not([data-shortcut])`).

- [ ] **Étape 11 : commande bornée, typage, suite.**

- [ ] **Étape 12 : commit**

```bash
cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet
for f in apps/web/src/ui/object-bar.ts apps/web/src/ui/object-bar.test.ts apps/web/src/ui/ObjectBar.tsx apps/web/src/ui/ObjectBar.test.tsx apps/web/src/ui/icons.ts apps/web/src/ui/icons.test.ts apps/web/src/ui/MenuBar.tsx apps/web/src/ui/rb.css apps/web/src/ui/rb-css.test.ts apps/web/src/ui/shortcuts.ts apps/web/src/ui/shortcuts.test.ts apps/web/src/engine/input/keys.ts apps/web/src/engine/input/keys.test.ts apps/web/src/app/toolbar-host.ts apps/web/src/app/toolbar-host.test.ts apps/web/src/app/workspace.ts apps/web/src/app/workspace.test.ts THIRD_PARTY_NOTICES.md; do git add "$f"; done
git commit -m "feat: icon object bar attached to the selection (OG41 L2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

`app/toolbar-host.test.ts` reste dans la liste du commit seulement s'il a changé (aucun test neuf exigé : `selection` y est
relayé tel quel) ; sinon le retirer de la boucle.

<a id="tache-t8"></a>
### Tâche T8 — Obstacles des îlots ; Dupliquer et Supprimer quittent le panneau

**Objectif :** le calque des îlots donne à son rappel `extra` une fonction qui lit, à l'appel, les rectangles posés de
tous les îlots visibles (barres en haut ou en bas, onglets, pages, annuler et zoom, barre latérale, panneau d'options,
éditeur de lien, rangée contextuelle), obstacles de la barre d'objet (D20). Le panneau d'options perd Dupliquer et
Supprimer, qui passent à la barre d'objet (D33).

**Fichiers :**
- Modifier : `apps/web/src/ui/Island.tsx:395,407-412,550-551`
- Modifier : `apps/web/src/ui/OptionsPanel.tsx:582-583`
- Tests : `apps/web/src/ui/Island.test.tsx`, `apps/web/src/ui/OptionsPanel.test.tsx:77-83,414`

**Interfaces :**
- Consomme : rien.
- Produit : `IslandLayerProps.extra?: (sideStart: Accessor<Rect | null>, above: Accessor<readonly Rect[]>, islands: () => readonly Rect[]) => JSX.Element` ;
  `islands()` rend des rectangles **px de la fenêtre** (`getBoundingClientRect`, `x = left`, `y = top`), largeur et hauteur > 0, de chaque `.rb-island` et `[data-island-context]` du calque, lus à l'appel.
- Réutilise : `apps/web/src/ui/Island.tsx` (`IslandLayer`, rappel `extra(sideStart, above)`) ; panneau d'options (`OptionsPanel.tsx:622-626` mesure déjà sa racine) — `extra(sideStart, above, islands)`. Écart déclaré sur `OptionsPanel` `placed?(r: Rect | null)` du cadrage : le panneau est rendu dans le calque avec la classe `rb-island` (`OptionsPanel.tsx:630`), `islands()` le compte déjà ; un second canal ferait doublon (anti-refactorisation, duplication).

**Test et commande bornée :**
`cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet/apps/web && npx -y pnpm@12.18.0 exec vitest run src/ui/Island.test.tsx src/ui/OptionsPanel.test.tsx src/ui/OptionsPanel.link.test.tsx --reporter=verbose 2>&1 | grep -E "Test Files|Tests  |FAIL|islands\(\)|ni Dupliquer ni Supprimer"`
Attendu : `Test Files  3 passed`, `Tests  N passed` (N ≥ 1), lignes `islands()` et `ni Dupliquer ni Supprimer`, aucun `FAIL`.

**Contraintes (recopiées de Global Constraints) :**
- G1 Mac, pas de Rust. G2 commande ci-dessus ; suite complète en fin de tâche (référence 4742 passés, 1 rouge propre au Mac `profile-actions.test.ts`). G3 `tsc --noEmit` vide.
- G5 TDD, test rouge d'abord ; aucun test sauté, aucun seuil changé. G6 cibles ≥ 44 px. G7 commits en anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un. G10 pas de `switch` dans `src/ui`.

**Interdits :** retirer le lien (Ctrl+K) ou « Glisser une copie » du panneau (D33) ; changer le placement des îlots ;
modifier `App.tsx` (T9 passe le troisième argument) ; toucher l'essai `personnalisation-2` (T9).

**Critère « terminé » :** commande bornée verte ; `tsc --noEmit` vide ; suite sans nouveau rouge. Rapport :
`Réutilisation : appelé IslandLayer.extra` et la ligne d'écart sur `placed?`.

**Étapes :**

- [ ] **Étape 1 : tests rouges**

`apps/web/src/ui/Island.test.tsx`, dans `describe("IslandLayer (design-l2 L2-5, L2-14)", …)` :

```tsx
  it("OG41 (D20) : islands() rend les rectangles fenêtre des îlots visibles, lus à l'appel", () => {
    const box = (x: number, y: number, w: number, h: number): DOMRect => ({ x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h, toJSON: () => ({}) }) as DOMRect;
    const real = Element.prototype.getBoundingClientRect;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      if (this.classList.contains("rb-islands")) return box(0, 0, 1280, 900);
      if (this.matches('.rb-island[data-island="outils"]')) return box(170, 16, 940, 56);
      if (this.matches('.rb-island[data-island="onglets"]')) return box(80, 16, 0, 0);
      return real.call(this);
    });
    let got: (() => readonly { x: number; y: number; w: number; h: number }[]) | null = null;
    render(() => (
      <IslandLayer bars={() => [bar("outils", "tools")]} render={(b) => <div data-toolbar={b.id} />} head={<div data-tabs />} status={<p id="etat" role="status" />} profileId={() => "defaut"} size={() => "m"} sheetOpen={() => false}
        extra={(_s, _a, islands) => { got = islands; return <div class="rb-island" data-island="essai" />; }} />
    ));
    expect(got).not.toBeNull();
    const rects = got!();
    expect(rects).toContainEqual({ x: 170, y: 16, w: 940, h: 56 });
    expect(rects.some((r) => r.w === 0 || r.h === 0)).toBe(false);
  });
```

(`bar`, `render`, `vi` sont ceux du fichier ; si `bar` y prend d'autres paramètres, l'appeler comme dans `layer()` l. 274.)

`apps/web/src/ui/OptionsPanel.test.tsx:77-83`, remplacer le test « sélection : actions Dupliquer et Supprimer » par :

```tsx
  it("OG41 (D33) : Actions ne porte ni Dupliquer ni Supprimer (passés à la barre d'objet) ; le lien reste", () => {
    const { container } = mount({ tool: "select", selection: [rectEl("a", "#000000")] });
    expect(container.querySelector('[data-option-value="duplicate"]')).toBeNull();
    expect(container.querySelector('[data-option-value="delete"]')).toBeNull();
    expect(container.querySelector('[data-option="actions"] [data-option-value="link"]')).not.toBeNull();
  });
```

`OptionsPanel.test.tsx:414` : la liste devient `["front", "link"]`.

- [ ] **Étape 2 : lancer, constater le rouge** — `islands` indéfini ; boutons encore présents.

- [ ] **Étape 3 : `Island.tsx`**

Ligne 395 (type de `extra`) :

```ts
  readonly extra?: (sideStart: Accessor<Rect | null>, above: Accessor<readonly Rect[]>, islands: () => readonly Rect[]) => JSX.Element;
```

Compléter son commentaire (l. 393-394) : ` OG41 (D20) : `islands()`, rectangles fenêtre de tous les îlots visibles du calque
(lus à l'appel), obstacles de la barre d'objet.`

Dans `IslandLayer`, après la déclaration de `toolsAbove` :

```ts
  /** OG41 (D20) : rectangles posés, px de la fenêtre, de chaque îlot visible du calque (barres, onglets, panneau d'options,
   *  éditeur de lien, rangée contextuelle) ; lus à l'appel (la barre d'objet se replace à chaque état et caméra). */
  const islandRects = (): readonly Rect[] => {
    if (layer === undefined) return [];
    const out: Rect[] = [];
    for (const el of layer.querySelectorAll(".rb-island, [data-island-context]")) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) out.push({ x: r.left, y: r.top, w: r.width, h: r.height });
    }
    return out;
  };
```

Ligne 551 : `      {props.extra?.(sideStart, toolsAbove, islandRects)}`

- [ ] **Étape 4 : `OptionsPanel.tsx`** — supprimer les lignes 582-583 (`IconButton` `copy-plus` « Dupliquer » et
`trash-2` « Supprimer ») ; dans l'en-tête (l. 1-5), ajouter `OG41 (D33) : Dupliquer et Supprimer sont dans la barre d'objet.`

- [ ] **Étape 5 : commande bornée, typage, suite.**

- [ ] **Étape 6 : commit**

```bash
cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet
for f in apps/web/src/ui/Island.tsx apps/web/src/ui/Island.test.tsx apps/web/src/ui/OptionsPanel.tsx apps/web/src/ui/OptionsPanel.test.tsx; do git add "$f"; done
git commit -m "feat: island rects for the object bar; duplicate and delete leave the options panel (OG41 L2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t9"></a>
### Tâche T9 — Montage : barre dans `.rb-stages`, rangée Sélection réduite à « Coller »

**Objectif :** `App.tsx` monte `ObjectBar` par portail dans `.rb-stages` (le conteneur des scènes, celui du menu de
case), avec les obstacles des îlots ; la rangée Sélection de l'îlot contextuel ne garde qu'un bouton icône « Coller »,
outil Sélection, aucune sélection, presse-papiers non vide (D22) ; la barre d'annotation perd ses 8 boutons grisés (D27) ;
trois essais suivent les sélecteurs (D23, D33).

**Fichiers :**
- Modifier : `apps/web/src/ui/App.tsx:671-688` (rappel `extra`) et imports
- Modifier (réécrire) : `apps/web/src/ui/SelectionRow.tsx`
- Modifier : `apps/web/src/ui/Toolbar.tsx:262-263` (commentaire seulement)
- Lire sans modifier : `apps/web/src/app/board-session.ts:354` — la racine de la barre est `props.stages`, le même
  élément que le `container` de la séance (`main.ts:205,217`) ; aucune ligne à changer (écart au cadrage, à dire au rapport)
- Tests : `apps/web/src/ui/SelectionRow.test.tsx` (réécrit), `apps/web/src/ui/Toolbar.test.tsx:52-60,541-549`, `apps/web/src/ui/App.test.tsx`
- Modifier (essais, G4) : `scripts/essais/c3-groupes-navigateur.mjs:156`, `scripts/essais/personnalisation-1a-navigateur.mjs:521,525`,
  `scripts/essais/personnalisation-2-navigateur.mjs:316-318`

**Interfaces :**
- Consomme (T7) : `ObjectBar(props: ObjectBarProps)` ; icône `clipboard-paste`. (T8) : `extra(sideStart, above, islands)`.
  (T5) : `Engine.selectionKeepOut()`.
- Produit : `SelectionRow(props: { view: Accessor<ToolbarView>; host: ToolbarHost }): JSX.Element` (même signature, un seul bouton).
- Réutilise : `apps/web/src/ui/IconButton.tsx:110`, `apps/web/src/ui/shortcuts.ts` (`buttonShortcut`) — `IconButton({ icon: "clipboard-paste", label: "Coller", attrs: { "data-selection-action": "paste" }, shortcut: buttonShortcut("paste"), onPress })`
- Réutilise : `apps/web/src/ui/Island.tsx` (`extra`, T8) — `obstacles={() => [...islands(), ...popoverRects()]}` (les `.rb-media-bar` de `MediaBar` et `Model3dBar` sont hors du calque des îlots)

**Test et commande bornée :**
`cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet/apps/web && npx -y pnpm@12.18.0 exec vitest run src/ui/SelectionRow.test.tsx src/ui/Toolbar.test.tsx src/ui/App.test.tsx src/ui/ObjectBar.test.tsx --reporter=verbose 2>&1 | grep -E "Test Files|Tests  |FAIL|un seul bouton icône|barre d'objet montée"`
Attendu : `Test Files  4 passed`, `Tests  N passed` (N ≥ 1), lignes `un seul bouton icône` et `barre d'objet montée`, aucun `FAIL`.

**Contraintes (recopiées de Global Constraints) :**
- G1 Mac, pas de Rust. G2 commande ci-dessus ; suite complète en fin de tâche (référence 4742 passés, 1 rouge propre au Mac `profile-actions.test.ts`). G3 `tsc --noEmit` vide.
- G4 Essais sur la VM seulement, joués par l'orchestrateur ; cette tâche modifie trois essais (dit dans « terminé »).
- G5 TDD, test rouge d'abord ; essais existants (sélecteurs `data-item`, `data-selection-action`) verts sans réécriture de fond : une ligne d'ouverture de « … » au plus par clic déplacé.
- G6 Cibles ≥ 44 px ; tactile d'abord ; chaque geste a un raccourci (Ctrl+V inchangé). G7 commits en anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un. G10 pas de `switch` dans `src/ui`.

**Interdits :** monter la barre dans la fenêtre d'annotation (D27) ; garder les tables `SELECTION_ACTIONS`, `LAYER_ACTIONS`,
`DISABLED` dans `SelectionRow.tsx` (elles sont dans `object-bar.ts`) ; changer le parcours des essais au-delà des lignes citées.

**Critère « terminé » :** commande bornée verte ; `tsc --noEmit` vide ; suite sans nouveau rouge ; essais modifiés :
`c3-groupes-navigateur.mjs`, `personnalisation-1a-navigateur.mjs`, `personnalisation-2-navigateur.mjs` (à jouer sur la VM).
Rapport : `Réutilisation : appelé IconButton, buttonShortcut, IslandLayer.extra` et l'écart sur `board-session.ts`.

**Étapes :**

- [ ] **Étape 1 : tests rouges**

Remplacer tout `apps/web/src/ui/SelectionRow.test.tsx` par :

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ToolbarHost } from "../app/toolbar-host";
import type { ToolbarView } from "./item-state";
import { SelectionRow } from "./SelectionRow";

afterEach(cleanup);
const base: ToolbarView = { tool: "select", canUndo: false, canRedo: false, pageIndex: 0, pageCount: 1 };
function setup(v: ToolbarView) {
  const [view, setView] = createSignal(v);
  const selection = vi.fn();
  const host = { selection } as unknown as ToolbarHost;
  const { container } = render(() => <SelectionRow view={view} host={host} />);
  return { container, setView, selection };
}

describe("rangée Sélection (OG41, D22)", () => {
  it("outil Sélection, aucune sélection, presse-papiers plein : un seul bouton icône « Coller »", () => {
    const { container } = setup({ ...base, canPaste: true });
    const all = [...container.querySelectorAll("[data-selection-action]")];
    expect(all.map((b) => b.getAttribute("data-selection-action"))).toEqual(["paste"]);
    expect(all[0]!.getAttribute("aria-label")).toBe("Coller");
    expect(all[0]!.querySelector('[data-icon="clipboard-paste"]')).not.toBeNull();
  });
  it("une sélection (la barre d'objet prend le relais), un autre outil ou rien à coller : rien", () => {
    const { container, setView } = setup({ ...base, canPaste: true, selection: ["a"] });
    expect(container.querySelectorAll("[data-selection-action]")).toHaveLength(0);
    setView({ ...base, canPaste: false });
    expect(container.querySelectorAll("[data-selection-action]")).toHaveLength(0);
    setView({ ...base, tool: "pen", canPaste: true });
    expect(container.querySelectorAll("[data-selection-action]")).toHaveLength(0);
  });
  it("toucher : host.selection('paste')", () => {
    const { container, selection } = setup({ ...base, canPaste: true });
    fireEvent.click(container.querySelector('[data-selection-action="paste"]')!);
    expect(selection).toHaveBeenCalledWith("paste");
  });
});
```

`apps/web/src/ui/Toolbar.test.tsx:52-60`, remplacer le test « rangée Sélection dans la barre d'outils » par :

```tsx
  it("OG41 (D22) : rangée Sélection : « Coller » seul, outil Sélection sans sélection et presse-papiers plein", () => {
    const { container, setV } = setup();
    expect(container.querySelectorAll("[data-selection-action]")).toHaveLength(0);
    setV({ ...VIEW, tool: "select" });
    expect(container.querySelectorAll("[data-selection-action]")).toHaveLength(0);
    setV({ ...VIEW, tool: "select", canPaste: true });
    expect([...container.querySelectorAll("[data-selection-action]")].map((b) => b.getAttribute("data-selection-action"))).toEqual(["paste"]);
  });
```

`Toolbar.test.tsx:545` (test L4-4) : remplacer `ann.setV({ ...VIEW, tool: "select" });` et la ligne suivante par :

```tsx
    ann.setV({ ...VIEW, tool: "select" });
    expect(ann.container.querySelectorAll("[data-selection-action]")).toHaveLength(0); // D27 : plus de boutons grisés
    ann.setV({ ...VIEW, tool: "select", canPaste: true });
    expect(ann.container.querySelectorAll("[data-selection-action]")).toHaveLength(1);
```

`apps/web/src/ui/App.test.tsx` : dans le faux moteur de `fakeTab` (l. 84-107), ajouter
`camera: vi.fn(() => ({ zoom: 1, tx: 0, ty: 0 })), onCamera: vi.fn(() => () => undefined), selectionKeepOut: vi.fn(() => []),` ; puis :

```tsx
  it("OG41 : barre d'objet montée dans main.rb-stages, hors des barres ; Dupliquer relayé (D18, D22)", () => {
    const tab = fakeTab("Sans titre.roomboard", { tool: "select", selection: ["a"], selectionUnits: 1, selectionBounds: { x0: 100, y0: 100, x1: 200, y1: 200 } });
    const { stages, workspace } = renderApp({ tab });
    const bar = stages.querySelector<HTMLElement>("[data-object-bar]");
    expect(bar).not.toBeNull();
    expect(bar!.hidden).toBe(false);
    expect(bar!.closest("[data-toolbar]")).toBeNull();
    bar!.querySelector<HTMLButtonElement>('[data-selection-action="duplicate"]')!.click();
    expect(workspace.selection).toHaveBeenCalledWith("duplicate");
  });
```

(Si le faux `workspace` de `renderApp` n'a pas `selection: vi.fn()`, l'ajouter à côté de `onClipboard`, l. 214.)

- [ ] **Étape 2 : lancer, constater le rouge** — `FAIL` : huit boutons encore rendus, barre absente.

- [ ] **Étape 3 : réécrire `SelectionRow.tsx`**

```tsx
/** Rangée « Sélection » (C3, Z13 ; OG41, D22) : outil Sélection, aucune sélection, presse-papiers interne non vide : un
 *  seul bouton icône « Coller » (Ctrl+V). Avec une sélection, la barre d'objet collée à l'objet porte les actions
 *  (`ObjectBar.tsx`, tables dans `object-bar.ts`). */
import { Show, type Accessor, type JSX } from "solid-js";
import type { ToolbarHost } from "../app/toolbar-host";
import { TOOL_TABLE } from "../toolbar";
import { IconButton } from "./IconButton";
import type { ToolbarView } from "./item-state";
import { buttonShortcut } from "./shortcuts";

export function SelectionRow(props: { view: Accessor<ToolbarView>; host: ToolbarHost }): JSX.Element {
  const shown = (): boolean => {
    const v = props.view();
    return v.tool === TOOL_TABLE["select"]?.choice && (v.selection?.length ?? 0) === 0 && v.canPaste === true;
  };
  return (
    <Show when={shown()}>
      <span class="rb-sep" role="separator" data-selection-sep />
      <IconButton icon="clipboard-paste" label="Coller" attrs={{ "data-selection-action": "paste" }} shortcut={buttonShortcut("paste")} onPress={() => props.host.selection("paste")} />
    </Show>
  );
}
```

`apps/web/src/ui/Toolbar.tsx:262-263` : dans le commentaire de `rows`, ajouter `OG41 : la rangée Sélection ne porte plus
que « Coller » ; les actions de l'objet sont dans la barre d'objet.`

- [ ] **Étape 4 : monter la barre dans `App.tsx`**

Import : `import { ObjectBar } from "./ObjectBar";` et `import type { Rect } from "./island-place";`. Avant le `return` du
composant, ajouter (barres de média et d'objet 3D, `.rb-popover` hors du calque des îlots, `App.tsx:691-703`, obstacles
aussi, D20) :

```tsx
  /** OG41 (D20) : rectangles fenêtre des barres flottantes hors des îlots (média, objet 3D), lus à l'appel. */
  const popoverRects = (): readonly Rect[] =>
    [...props.stages.ownerDocument.querySelectorAll(".rb-media-bar")].flatMap((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 ? [{ x: r.left, y: r.top, w: r.width, h: r.height }] : [];
    });
```

Remplacer le rappel `extra` (l. 671-688) par :

```tsx
        extra={(sideStart, above, islands) => (
          <>
            <OptionsPanel
              engine={() => board().engine}
              state={state}
              element={(id) => ws.active().board.doc.element(id)}
              presets={() => profile().presets}
              size={size}
              profileId={() => profile().id}
              settings={optionSettings}
              annotating={annotating}
              sideStart={sideStart}
              above={above}
              hidden={() => panel() !== null}
              openLink={(url) => props.shell.openLink?.(url)}
              openImage={openImage}
            />
            {/* OG41 (DA3) : barre d'objet par portail dans .rb-stages, collée à la sélection ; obstacles : les îlots. */}
            <ObjectBar
              view={() => ({ ...view(), selectionBounds: state().selectionBounds })}
              host={host}
              engine={() => board().engine}
              stage={() => board().stage}
              mount={props.stages}
              obstacles={() => [...islands(), ...popoverRects()]}
            />
          </>
        )}
```

(Les props d'`OptionsPanel` sont recopiées telles qu'à `App.tsx:672-686` ; si l'une d'elles a changé depuis, garder celle du fichier.)

- [ ] **Étape 5 : essais (G4)**

- `scripts/essais/c3-groupes-navigateur.mjs:156` : avant `await page.click('button[data-selection-action="export"]');`, ajouter `  await page.click("[data-object-more]");`.
- `scripts/essais/personnalisation-1a-navigateur.mjs:521` et `:525` : avant chaque `await page.click('[data-selection-action="layer-front"]');` et `await page.click('[data-selection-action="layer-back"]');`, ajouter `  await page.click("[data-object-more]");`.
- `scripts/essais/personnalisation-2-navigateur.mjs:316-318`, remplacer par :

```js
  const dup = '[data-object-bar] [data-selection-action="duplicate"]';
  const del = '[data-object-bar] [data-selection-action="delete"]';
  check((await page.locator(dup).count()) === 1 && (await page.locator(del).count()) === 1, "S3.1 : la barre d'objet montre Dupliquer et Supprimer");
```

- [ ] **Étape 6 : commande bornée, typage, suite.**

- [ ] **Étape 7 : commit**

```bash
cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet
for f in apps/web/src/ui/App.tsx apps/web/src/ui/App.test.tsx apps/web/src/ui/SelectionRow.tsx apps/web/src/ui/SelectionRow.test.tsx apps/web/src/ui/Toolbar.tsx apps/web/src/ui/Toolbar.test.tsx scripts/essais/c3-groupes-navigateur.mjs scripts/essais/personnalisation-1a-navigateur.mjs scripts/essais/personnalisation-2-navigateur.mjs; do git add "$f"; done
git commit -m "feat: mount the object bar on the stages, paste-only selection row (OG41 L2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t10"></a>
### Tâche T10 — Essai `barre-objet` et captures 2x du lot L2

**Objectif :** un essai Playwright neuf, joué sur la VM, prouve S5 à S8 dans l'application construite (barre collée,
place manquante et obstacles, groupe et « … », tableau et coller, clavier, netteté § 10 par lectures de px entiers) et
produit les captures 2x du lot L2 (barre attachée à une forme, à un groupe, menu « … ») avant (`main`, `--avant` : la rangée
Sélection à libellés) et après. Inscrit à `scripts/verifier.sh --e2e`, sans option de capture.

**Fichiers :**
- Créer : `scripts/essais/barre-objet-navigateur.mjs`
- Modifier : `scripts/verifier.sh` (après la ligne `gomme-objets` de T4), `scripts/tests/verifier-e2e.test.sh` (après la ligne de T4)
- Produits par l'orchestrateur sur la VM : `docs/design/captures/gomme-et-barre-objet/avant/l2-*.png`, `…/apres/l2-*.png`

**Interfaces :**
- Consomme : T9 (`[data-object-bar]`, `[data-selection-action]`, `[data-object-more]`, `[data-object-menu]`, « Coller » de l'îlot contextuel), T7 (Maj+F10), T3 (tableau supprimable).
- Réutilise : `scripts/essais/commun.mjs` — `loadPlaywright`, `serve`, `frames`, `clickItem`, `stageMouse`, `dropFile`, `solidPng`, `islandBoxes`, `Echec`
- Réutilise : `scripts/essais/gestes.mjs` — `newPage`, `marquee`, `tapStage`, `touchDrag`, `waitAttr`, `attr`
- Produit : `node scripts/essais/barre-objet-navigateur.mjs [--dist <build>] [--captures <dossier>] [--avant]` ; codes 0, 1, 2 ; `--avant` imprime les contrôles sans arrêter.

**Test et commande bornée (Mac, sans navigateur) :**
`cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet && node --check scripts/essais/barre-objet-navigateur.mjs && bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3`
Attendu : rien de `node --check`, puis `verifier-e2e.test.sh : OK` (rouge d'abord : `barre-objet-navigateur absent de verifier.sh`).

**Preuve visuelle (orchestrateur, VM) :**
1. Après : `node scripts/essais/barre-objet-navigateur.mjs --captures docs/design/captures/gomme-et-barre-objet/apres` —
   lectures d'abord (`lu — barre=<left>,<top>,<w>×<h>`, `lu — cadre=…`, `lu — boutons=…`, `lu — px entiers=oui`), puis
   captures `l2-barre-forme.png`, `l2-barre-groupe.png`, `l2-menu-plus.png`, `l2-barre-dessous.png`.
2. Avant : `node scripts/essais/barre-objet-navigateur.mjs --dist <main>/apps/web/dist --avant --captures docs/design/captures/gomme-et-barre-objet/avant`
   (même parcours : la rangée Sélection à libellés de `main` apparaît sur les mêmes captures).
3. Décrire chaque paire.

**Contraintes (recopiées de Global Constraints) :**
- G4 Essais navigateur sur la VM seulement, joués par l'orchestrateur ; cette tâche crée un essai et modifie `verifier.sh` (dit dans « terminé »).
- G5 Essais existants verts sans réécriture de fond ; aucun seuil changé.
- G6 Design : netteté § 10 (px entiers à 2x), cibles ≥ 44 px, tactile d'abord (appui long), chaque geste a un raccourci (Maj+F10).
- G7 Commits en anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un.
- G1 Mac pour écrire, pas de Rust ; G8 CLI non touchée.

**Interdits :** `--captures` dans `verifier.sh` ; Playwright sur le Mac ; écrire dans `docs/design/captures/` depuis la tâche.

**Critère « terminé » :** commande bornée verte ; essai créé et inscrit (à jouer sur la VM, avec et sans `--avant`).
Rapport : `Réutilisation : appelé commun.mjs et gestes.mjs`.

**Étapes :**

- [ ] **Étape 1 : test rouge de la liste e2e**

`scripts/tests/verifier-e2e.test.sh`, après la ligne `gomme-objets` :

```bash
grep -q "scripts/essais/barre-objet-navigateur.mjs" scripts/verifier.sh || ko "barre-objet-navigateur absent de verifier.sh"
```

- [ ] **Étape 2 : écrire l'essai**

Créer `scripts/essais/barre-objet-navigateur.mjs` :

```js
#!/usr/bin/env node
// OG41 L2 : barre d'objet en icônes, collée à la sélection (cadrage docs/plans/gomme-et-barre-objet-cadrage.md, § 6,
// S5 à S8). Application construite servie en local, Chromium sans tête, `deviceScaleFactor` 2. Lectures d'abord (boîtes,
// boutons, px entiers), captures ensuite. `--avant` : même parcours sur `main`, contrôles imprimés sans arrêter.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/barre-objet-navigateur.mjs [--dist <build>] [--captures <dossier>] [--avant]
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { Echec, clickItem, dropFile, frames, islandBoxes, loadPlaywright, serve, solidPng, stageMouse } from "./commun.mjs";
import { attr, marquee, newPage, tapStage, touchDrag, waitAttr } from "./gestes.mjs";

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
};
const dist = opt("--dist");
const captures = opt("--captures");
const avant = argv.includes("--avant");
const BAR = "[data-object-bar]";
const act = (id) => `[data-selection-action="${id}"]`;
/** Bouton d'action : dans la barre d'objet ; en `--avant` (main), celui de la rangée Sélection à libellés. */
const inBar = (id) => (avant ? act(id) : `${BAR} ${act(id)}`);

const pw = await loadPlaywright();
if (!pw) {
  console.error("Playwright absent (cache npx)");
  process.exit(2);
}
if (captures) mkdirSync(captures, { recursive: true });
const server = await serve(dist ? { dist } : {});
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ args: ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"] });
let failed = false;
const check = (cond, msg) => {
  if (avant) return void console.log(`avant — ${msg} : ${cond ? "oui" : "non"}`);
  if (!cond) throw new Echec(`échec — ${msg}`);
  console.log(`ok — ${msg}`);
};
const lire = (label, v) => console.log(`lu — ${label}=${v}`);
const apart = (a, b) => a.x + a.width <= b.x + 0.5 || b.x + b.width <= a.x + 0.5 || a.y + a.height <= b.y + 0.5 || b.y + b.height <= a.y + 0.5;

async function scenario(name, run) {
  const s = await newPage(browser, base, { scale: 2 });
  try {
    await run(s);
    check(s.errors.length === 0, `${name} : aucune erreur dans la page${s.errors.length ? ` (${s.errors.join(" | ")})` : ""}`);
  } finally {
    await s.ctx.close();
  }
}
const helpers = (page) => ({
  /** Clic si présent ; absent : contrôle en échec (imprimé en `--avant`, qui continue). */
  press: async (sel) => {
    const here = (await page.locator(sel).count()) > 0 && (await page.locator(sel).first().isVisible());
    check(here, `présent : ${sel}`);
    if (here) await page.click(sel);
    await frames(page);
    return here;
  },
  drag: async (pts) => {
    const m = stageMouse(page);
    await m.move(...pts[0]);
    await m.down();
    for (const p of pts.slice(1)) await m.move(p[0], p[1], { steps: 8 });
    await m.up();
    await frames(page);
  },
  barBox: async () => {
    await frames(page);
    const b = (await page.locator(BAR).count()) > 0 ? await page.locator(BAR).first().boundingBox() : null; // absent (main) : null, sans attendre
    if (b) lire("barre", `${b.x},${b.y},${b.width}×${b.height}`);
    return b;
  },
  frameBox: async () => {
    const stage = await page.locator("#stage").boundingBox();
    const [x0, y0, x1, y1] = (await attr(page, "data-bounds")).split(",").map(Number);
    const [z, tx, ty] = (await attr(page, "data-camera")).split(",").map(Number);
    const f = { x: stage.x + x0 * z + tx, y: stage.y + y0 * z + ty, width: (x1 - x0) * z, height: (y1 - y0) * z };
    lire("cadre", `${f.x},${f.y},${f.width}×${f.height}`);
    return f;
  },
  buttons: async () => {
    const ids = await page.$$eval(`${BAR} [data-object-button]`, (els) => els.map((e) => e.getAttribute("data-selection-action") ?? "more"));
    lire("boutons", ids.join(","));
    return ids;
  },
  shot: async (name, sel) => {
    if (!captures) return;
    const path = join(captures, name);
    const box = sel && (await page.locator(sel).count()) > 0 ? await page.locator(sel).first().boundingBox() : null;
    const clip = box ? { x: Math.max(0, box.x - 120), y: Math.max(0, box.y - 120), width: box.width + 240, height: box.height + 320 } : undefined;
    await page.screenshot({ path, ...(clip ? { clip } : {}), animations: "disabled", caret: "hide", scale: "device" });
    console.log(`capture : ${path}`);
  },
});

try {
  // S5 — barre collée au-dessus d'une image, infobulle à l'appui long, suit le glisser et le zoom ; netteté § 10.
  await scenario("S5", async ({ page, cdp }) => {
    const h = helpers(page);
    await dropFile(page, "#stage", "photo.png", solidPng(200, 150, [29, 78, 216]), "image/png", [600, 420]);
    await frames(page);
    await clickItem(page, "select");
    await tapStage(page, 630, 445); // dans l'image qu'elle soit centrée sur le point de dépôt ou calée par son coin
    await waitAttr(page, "data-selection", "1");
    const bar = await h.barBox();
    const f = await h.frameBox();
    check(bar !== null && bar.height === 44, `S5 : barre d'objet de 44 px de haut (${bar?.height})`);
    check(bar !== null && bar.y + bar.height <= f.y - 8 + 0.5, "S5 : la barre est au-dessus du cadre, 8 px au moins au-dessus des poignées");
    check(bar !== null && Math.abs(bar.x + bar.width / 2 - (f.x + f.width / 2)) <= 1, "S5 : centrée sur le cadre");
    const ids = await h.buttons();
    check(["duplicate", "copy", "image", "delete"].every((id) => ids.includes(id)) && !ids.includes("group"), "S5 : Dupliquer, Copier, Image, Supprimer ; aucun bouton inutile");
    const ints = await page.$$eval(`${BAR} svg.rb-icon`, (els) => els.every((e) => { const r = e.getBoundingClientRect(); return Number.isInteger(r.left) && Number.isInteger(r.top); }));
    lire("px entiers", ints ? "oui" : "non");
    check(ints, "S5 : icônes posées en px entiers (netteté § 10 à 2x)");
    await h.shot("l2-barre-forme.png", BAR);
    // Appui long : infobulle « Dupliquer · Ctrl+D », sans action.
    const dupSel = `${BAR} ${act("duplicate")}`;
    const dup = (await page.locator(dupSel).count()) > 0 ? await page.locator(dupSel).first().boundingBox() : null;
    if (dup !== null) {
      const n0 = Number(await attr(page, "data-elements"));
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: dup.x + dup.width / 2, y: dup.y + dup.height / 2, id: 3 }] });
      await page.waitForSelector('[role="tooltip"]', { timeout: 5000 });
      const tip = page.locator('[role="tooltip"]').first();
      const text = `${await tip.textContent()} · ${await tip.getAttribute("data-keys")}`;
      lire("infobulle", text);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.waitForTimeout(400);
      check(text === "Dupliquer · Ctrl+D" && Number(await attr(page, "data-elements")) === n0, "S5 : appui long sur Dupliquer : infobulle « Dupliquer · Ctrl+D », aucune copie");
    } else check(false, "S5 : bouton Dupliquer de la barre d'objet présent");
    // Glisser : barre cachée pendant le geste, reposée au-dessus de la nouvelle place.
    const end = await touchDrag(page, cdp, [630, 445], [400, 300], { hold: true });
    check(!(await page.locator(BAR).isVisible()), "S5 : barre cachée pendant le glisser");
    await end();
    const bar2 = await h.barBox();
    const f2 = await h.frameBox();
    check(bar2 !== null && bar2.y + bar2.height <= f2.y - 8 + 0.5, "S5 : barre reposée au-dessus de la nouvelle place");
    await page.mouse.move(f2.x + f2.width / 2, f2.y + f2.height / 2);
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -300);
    await page.keyboard.up("Control");
    const bar3 = await h.barBox();
    check(bar3 !== null && bar3.height === 44, "S5 : zoom : la barre suit, même taille");
  });

  // S6 — place manquante, barre d'outils en bas, panneau et barre latérale, objet qui remplit la vue, flèches.
  await scenario("S6", async ({ page }) => {
    const h = helpers(page);
    // Sous la rangée du haut (îlots à y 16-72) ; « + » et poignées ne laissent pas 52 px au-dessus : barre dessous.
    await clickItem(page, "rect");
    await h.drag([[150, 100], [300, 200]]);
    await clickItem(page, "select");
    await tapStage(page, 225, 150);
    await waitAttr(page, "data-selection", "1");
    const bar = await h.barBox();
    const f = await h.frameBox();
    check(bar !== null && bar.y >= f.y + f.height, "S6 : objet collé en haut : barre sous le cadre (et sous les « + »)");
    await h.shot("l2-barre-dessous.png", BAR);
    const islands = await islandBoxes(page);
    check(bar !== null && islands.every((i) => apart(bar, i)), "S6 : la barre ne couvre aucun îlot (panneau d'options, barre d'outils)");
    await page.click('[data-island="pages"] [data-island-collapse]').catch(() => undefined);
    await frames(page);
    const bar2 = await h.barBox();
    check(bar2 !== null && (await islandBoxes(page)).every((i) => apart(bar2, i)), "S6 : barre latérale ouverte : la barre se décale, ne la couvre pas");
    const before = await h.barBox();
    await page.keyboard.press("ArrowRight");
    const after = await h.barBox();
    check(before !== null && after !== null && after.x > before.x, "S6 : flèche → : l'objet bouge, la barre suit");
    // Objet qui remplit la vue : un rectangle agrandi par le zoom (Ctrl + molette) jusqu'à déborder.
    await page.keyboard.press("Escape");
    await clickItem(page, "rect");
    await h.drag([[560, 400], [720, 520]]);
    await clickItem(page, "select");
    await tapStage(page, 640, 460);
    const st0 = await page.locator("#stage").boundingBox();
    await page.mouse.move(st0.x + 640, st0.y + 460);
    await page.keyboard.down("Control");
    for (let i = 0; i < 6; i++) await page.mouse.wheel(0, -400);
    await page.keyboard.up("Control");
    const big = await h.barBox();
    const stage = await page.locator("#stage").boundingBox();
    check(big !== null && big.y >= stage.y && big.y + big.height <= stage.y + stage.height, "S6 : objet qui remplit la vue : barre dans la vue");
  });

  // S7 — groupe, « … », clavier.
  await scenario("S7", async ({ page }) => {
    const h = helpers(page);
    await clickItem(page, "rect");
    await h.drag([[300, 300], [400, 400]]);
    await clickItem(page, "rect");
    await h.drag([[500, 300], [600, 400]]);
    await clickItem(page, "select");
    await marquee(page, [280, 280], [620, 420]);
    await waitAttr(page, "data-selection", "2");
    check((await h.buttons()).includes("group"), "S7 : deux formes : Grouper visible");
    await h.press(inBar("group"));
    await waitAttr(page, "data-grouped", "1");
    const ids = await h.buttons();
    check(ids.includes("ungroup") && !ids.includes("group"), "S7 : Dégrouper remplace Grouper");
    await h.shot("l2-barre-groupe.png", BAR);
    if (!(await h.press(`${BAR} [data-object-more]`))) return;
    const rows = await page.$$eval("[data-object-menu] button", (els) => els.map((e) => [e.querySelector("span")?.textContent, e.getBoundingClientRect().height]));
    lire("menu", rows.map((r) => `${r[0]}:${r[1]}`).join(","));
    check(JSON.stringify(rows.map((r) => r[0])) === JSON.stringify(["Premier plan", "Arrière-plan", "Exporter la sélection"]) && rows.every((r) => r[1] >= 44), "S7 : « … » : Premier plan, Arrière-plan, Exporter la sélection, 44 px");
    await h.shot("l2-menu-plus.png", "[data-object-menu]");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Control+Shift+g");
    await waitAttr(page, "data-grouped", "0");
    check(true, "S7 : Ctrl+Maj+G dégroupe");
    await page.keyboard.press("Shift+F10");
    const focused = await page.evaluate(() => document.activeElement?.closest("[data-object-bar]") !== null);
    check(focused, "S7 : Maj+F10 met le focus dans la barre");
    const b0 = await attr(page, "data-bounds");
    await page.keyboard.press("ArrowRight");
    check((await attr(page, "data-bounds")) === b0, "S7 : → dans la barre : l'objet ne bouge pas");
    const role = await page.getAttribute(BAR, "role");
    const label = await page.getAttribute(BAR, "aria-label");
    check(role === "toolbar" && label === "Actions de l'objet", "S7 : annoncée « Actions de l'objet, barre d'outils »");
    await page.keyboard.press("Escape");
    check(await page.evaluate(() => document.activeElement?.closest("[data-object-bar]") === null), "S7 : Échap rend le focus à la scène");
    await page.keyboard.press("?");
    await frames(page);
    check((await page.locator('[data-shortcut-id="object-bar"]').count()) === 1, "S7 : l'Aide liste « Barre de l'objet · Maj+F10 »");
  });

  // S8 — tableau supprimé par la barre ; coller depuis l'îlot contextuel.
  await scenario("S8", async ({ page }) => {
    const h = helpers(page);
    await clickItem(page, "table");
    await stageMouse(page).click(200, 200);
    await page.waitForSelector(".rb-table-picker:not([hidden])", { timeout: 5000 });
    await page.click('button[aria-label="3 colonnes, 3 lignes"]');
    await page.keyboard.press("Escape");
    await clickItem(page, "select");
    await marquee(page, [150, 150], [760, 420]); // le tableau 3 × 3 posé en (200, 200), seul objet de la page
    await waitAttr(page, "data-selection", "1");
    check((await h.buttons()).includes("delete"), "S8 : tableau choisi : la barre montre Supprimer");
    const n0 = Number(await attr(page, "data-elements"));
    if (!(await h.press(inBar("delete")))) return;
    await waitAttr(page, "data-elements", String(n0 - 1));
    await page.keyboard.press("Control+z");
    await waitAttr(page, "data-elements", String(n0));
    check(true, "S8 : Supprimer puis Ctrl+Z : le tableau revient");
    await clickItem(page, "rect");
    await h.drag([[900, 500], [1000, 600]]);
    await clickItem(page, "select");
    await tapStage(page, 950, 500);
    await h.press(inBar("copy"));
    await tapStage(page, 1100, 800);
    await waitAttr(page, "data-selection", "0");
    check(!(await page.locator(BAR).isVisible()) && (await page.locator(`[data-island-context] ${act("paste")}`).count()) === 1, "S8 : page vide : barre disparue, « Coller » dans l'îlot contextuel");
    const n1 = Number(await attr(page, "data-elements"));
    await page.click(`[data-island-context] ${act("paste")}`);
    await waitAttr(page, "data-elements", String(n1 + 1));
    await page.keyboard.press("Escape");
    await page.keyboard.press("Control+v");
    await waitAttr(page, "data-elements", String(n1 + 2));
    check(true, "S8 : Coller (bouton) puis Ctrl+V : même résultat");
  });
} catch (e) {
  failed = true;
  console.error(e instanceof Echec ? e.message : e);
} finally {
  await browser.close();
  server.close();
}
console.log(failed ? "barre-objet : ÉCHEC" : "barre-objet : OK");
process.exit(failed ? 1 : 0);
```

En `--avant` (sur `main`), `[data-object-bar]` n'existe pas : les lectures rendent `null`, chaque contrôle est imprimé
`non` sans arrêter ; les clics passent par `press(inBar(id))`, qui vise la rangée Sélection à libellés de `main`
(mêmes `data-selection-action`), et les captures « avant » montrent cette rangée aux mêmes moments. Seul S7 s'arrête
avant le menu « … » (absent de `main`) ; S8 joue Supprimer et Copier par la rangée de `main`. Toutes les captures sont en
2x (`newPage(…, { scale: 2 })`, `scale: "device"`), PNG, dans le dossier `--captures`
(`docs/design/captures/gomme-et-barre-objet/avant|apres`).

- [ ] **Étape 3 : inscrire l'essai** — `scripts/verifier.sh`, après `  node scripts/essais/gomme-objets-navigateur.mjs` :

```bash
  node scripts/essais/barre-objet-navigateur.mjs
```

- [ ] **Étape 4 : commande bornée** — `node --check` silencieux, `verifier-e2e.test.sh : OK`.

- [ ] **Étape 5 : commit**

```bash
cd /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet
for f in scripts/essais/barre-objet-navigateur.mjs scripts/verifier.sh scripts/tests/verifier-e2e.test.sh; do git add "$f"; done
git commit -m "test: browser trial for the object bar, 2x captures (OG41 L2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
