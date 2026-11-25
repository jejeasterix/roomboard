# design-l2 — Plan d'exécution

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Profils fournis en îlots : rôles `menu`, `history`, `panels`, accès Profil hors `annotation`, libellés de rôle | — | `apps/web/src/toolbar.ts`, `apps/web/src/toolbar.test.ts`, `apps/web/src/toolbar-profiles.ts`, `apps/web/src/toolbar-profiles.test.ts`, `apps/web/src/profile-edit.test.ts`, `apps/web/src/ui/ProfileEditor.tsx`, `apps/web/src/ui/ProfileEditor.test.tsx`, `apps/web/src/ui/App.test.tsx`, `apps/web/src/ui/Toolbar.test.tsx` (si rougi), tout autre test rougi hors des fichiers de T2 et T3 | isolé | implementeur-tdd | `pnpm --filter @roomboard/web exec vitest run src/toolbar.test.ts src/toolbar-profiles.test.ts src/profile-edit.test.ts src/ui/ProfileEditor.test.tsx src/ui/App.test.tsx` 0 échec, tests `design-l2 L2-20` et `design-l2 L2-4` présents ; suite web (suite-vm) `Tests  N passed`, 0 `FAIL ` ; `tsc` code 0 | S1, S2, S5 | #tache-t1 |
| T2 | Placement pur des îlots (`ui/island-place.ts`) et réglage d'appareil `island` / `setIsland` | — | `apps/web/src/ui/island-place.ts` (neuf), `apps/web/src/ui/island-place.test.ts` (neuf), `apps/web/src/device-settings.ts`, `apps/web/src/device-settings.test.ts` | isolé | implementeur-tdd | `pnpm --filter @roomboard/web exec vitest run src/ui/island-place.test.ts src/device-settings.test.ts` 0 échec, ≥ 20 tests, `design-l2 L2-30` et `design-l2 L2-7` présents ; `tsc` code 0 | S1, S3, S6 | #tache-t2 |
| T3 | Icônes `menu` et `collapse` ; rendu du rôle `menu` (`ui/MenuBar.tsx`) | — | `apps/web/src/ui/icons.ts`, `apps/web/src/ui/icons.test.ts`, `THIRD_PARTY_NOTICES.md`, `apps/web/src/ui/MenuBar.tsx` (neuf), `apps/web/src/ui/MenuBar.test.tsx` (neuf) | isolé | implementeur-tdd | `pnpm --filter @roomboard/web exec vitest run src/ui/icons.test.ts src/ui/MenuBar.test.tsx src/ui/Toolbar.test.tsx` 0 échec, `60 icônes` et ≥ 9 tests `design-l2 L2-6` présents ; `tsc` code 0 | S2, S5 | #tache-t3 |
| T4 | Onglets et barre des pages à icônes | T1 | `apps/web/src/ui/TabsBar.tsx`, `apps/web/src/ui/TabsBar.test.tsx`, `apps/web/src/ui/PagesBar.tsx`, `apps/web/src/ui/PagesBar.test.tsx`, `apps/web/src/ui/App.test.tsx` | isolé | implementeur-tdd | `pnpm --filter @roomboard/web exec vitest run src/ui/TabsBar.test.tsx src/ui/PagesBar.test.tsx src/ui/App.test.tsx` 0 échec, `design-l2 L2-17` et `design-l2 L2-18` présents ; suite web (suite-vm) 0 `FAIL ` ; `tsc` code 0 | S1, S6 | #tache-t4 |
| T5 | Composants `Island` et `IslandLayer` (placement, poignée, repli, clavier, calque) | T2, T3 | `apps/web/src/ui/Island.tsx` (neuf), `apps/web/src/ui/Island.test.tsx` (neuf) | isolé | concepteur-critique | `pnpm --filter @roomboard/web exec vitest run src/ui/Island.test.tsx src/ui/Toolbar.test.tsx src/ui/pointer-gesture.test.ts src/ui/tooltip.test.ts` 0 échec, ≥ 14 tests `design-l2` dans `Island.test.tsx` ; `tsc` code 0 | S1, S3, S4, S6 | #tache-t5 |
| T6 | Assemblage : calque des îlots dans `App`, menu, îlot contextuel, grille sans onglets, styles | T1, T2, T3, T4, T5 | `apps/web/src/ui/App.tsx`, `apps/web/src/ui/App.test.tsx`, `apps/web/src/ui/layout.ts`, `apps/web/src/ui/layout.test.ts`, `apps/web/src/ui/Toolbar.tsx`, `apps/web/src/ui/Toolbar.test.tsx`, `apps/web/src/ui/rb.css`, `apps/web/src/ui/rb-css.test.ts` | isolé | concepteur-critique | `node ~/.claude/scripts/vm/suite-vm.cjs -- nice -n 10 pnpm --filter @roomboard/web exec vitest run` `Tests  N passed`, 0 `FAIL ` ; `App.test.tsx` ≥ 8 tests `design-l2`, `rb-css.test.ts` ≥ 10 tests `design-l2` ; build web `✓ built` | S1, S2, S3, S4, S5, S6 | #tache-t6 |
| T7 | Essais existants retouchés en forme, aide `clickItem`, `s5b` adapté | T6 | `scripts/essais/commun.mjs`, `scripts/essais/s5b-navigateur.mjs`, `scripts/essais/c7b-texte-riche-navigateur.mjs`, `scripts/essais/c1-profils-navigateur.mjs`, `scripts/essais/design-l1-navigateur.mjs`, `scripts/essais/design-l3-navigateur.mjs`, `scripts/essais/design-l4-navigateur.mjs`, `scripts/essais/c4-bibliotheque-navigateur.mjs`, `scripts/essais/c9-grille-navigateur.mjs`, `scripts/essais/c2-image-navigateur.mjs`, `scripts/essais/c12-pdf-navigateur.mjs`, `scripts/essais/c13-tableaux-navigateur.mjs` | isolé | implementeur-tdd | `node scripts/essais/s5b-navigateur.mjs` : `S5b : ÉCHEC` avant retouche puis `S5b : OK` ; chaque essai du bloc `--e2e` de `verifier.sh` (sauf `design-l2`) rend son `OK` dans `T7-e2e.log`, 0 `ÉCHEC` | S1, S2, S4, S6 | #tache-t7 |
| T8 | Essai `design-l2` au navigateur, branché dans `verifier.sh --e2e` ; captures avant / après, recadrages, comparaison à la maquette 01 | T6 | `scripts/essais/design-l2-navigateur.mjs` (neuf), `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/design-l2-avant-tableau.png`, `docs/essais/design-l2-apres-tableau.png`, `docs/essais/design-l2-apres-{menu,menu-ouvert,onglets,outils,prereglages,panneaux,historique,pages}.png`, `docs/essais/design-l2-maquette-{menu,menu-ouvert,onglets,outils,prereglages,panneaux,historique,pages}.png` (18 PNG neufs), `docs/essais/design-l2-comparaison.md` (neuf) | isolé | implementeur-tdd | `node scripts/essais/design-l2-navigateur.mjs [--dist ~/.cache/tmp/of68-design-l2-avant/apps/web/dist]` : `design L2 : ÉCHEC` sur le build « avant » puis `design L2 : OK` (`#stage mesure la fenêtre` aux deux tailles, `0 pixel intermédiaire`, `0 frange`, contre-épreuve ≥ 2) ; `verifier-e2e.test.sh : OK` ; 18 PNG ; écarts listés un par un | S1, S2, S3, S4, S5, S6 | #tache-t8 |

Vagues (fichiers disjoints dans chaque vague, aucune tâche `partagé`) :

- **Vague 1** : T1, T2, T3 en parallèle. T1 est la seule à toucher un test hors de ses modules (elle met à jour tout test
  rougi par le contenu des profils fournis) ; T2 et T3 ne touchent que leurs propres fichiers.
- **Vague 2** : T4 et T5 en parallèle (T4 : onglets, pages, `App.test.tsx` ; T5 : `Island.tsx` et son test).
- **Vague 3** : T6 seule (point chaud : `App.tsx`, `App.test.tsx`, `rb.css`, `rb-css.test.ts`, `Toolbar.tsx`).
- **Vague 4** : T7 et T8 en parallèle (essais disjoints ; T8 ne se sert pas de `clickItem`, il ouvre le menu lui-même).

Chaîne des points chauds : `App.test.tsx` (T1 → T4 → T6), `Toolbar.test.tsx` (T1 si rougi → T6), `ProfileEditor.tsx`
(T1 seule). La passe complète `scripts/verifier.sh --e2e` revient à l'étage 4, après T7 et T8 (elle joue les deux).

Écart au découpage de L2-29, une ligne : `ROLE_LABELS` (L2-21) passe de T6 à T1, qui crée les rôles ; T6 garde la
règle CSS des segments. T1 écrit ainsi une seule fois `ProfileEditor.test.tsx:104`. Aucun fichier n'est partagé dans une vague.

**Goal :** remplacer la grille à bandes par des îlots blancs flottants au-dessus de la scène (menu, onglets, outils
déplaçables et repliables, préréglages, historique et vue, bibliothèque et profil, pages), `#stage` occupant toute la
fenêtre comme la maquette 01, sans changer le comportement ni le format `.rbprofile`.

**Architecture :** trois rôles de barre neufs dans les profils fournis (DA-L2-1) ; placement pur et sans DOM dans
`ui/island-place.ts` (DA-L2-2) ; position et repli sur l'appareil par `device-settings.ts` (DA-L2-3) ; `ui/Island.tsx`
rend un îlot (position en px entiers, poignée, repli, clavier) et le calque `IslandLayer` (coins en flex, îlots centrés
placés par `laneOf`) ; `ui/MenuBar.tsx` rend le rôle `menu` (liste toujours dans le DOM, `hidden`) ; `App.tsx` remplace
la rangée des onglets et `.rb-floating` par `IslandLayer` ; `layoutFor` ne garde que les bandes.

**Tech Stack :** Solid 1.9.20, TypeScript 5 (`strict`, `noUncheckedIndexedAccess`), Vitest 4 (happy-dom 21),
Playwright 1.65 (Chromium du cache npx), Node 22, Bash.

**Spec :** `docs/plans/design-l2-cadrage.md` (amont : `docs/plans/design-cadrage.md` § 4, 5, 9, 10 ; maquette
`docs/design/maquettes/01-tableau.html` et `.png` ; patrons : `docs/sessions/design-l3-etat.md`,
`scripts/essais/design-l3-navigateur.mjs`).

## Global Constraints

- G1 — TDD : test rouge vu d'abord. Chaque tâche met à jour dans son commit tous les tests qu'elle fait rougir et finit
  verte seule ; deux tâches d'une même vague ne touchent jamais le même fichier.
- G2 — Comportement inchangé hors de l'aspect ; essais existants (`scripts/essais/*.mjs`, sélecteurs `data-item`) verts,
  retouchés seulement en forme (sauf les contrôles que le cadrage désigne comme inversés par L2 : s5b et c7b « aucune
  barre ne recouvre la scène »). Toute autre rougeur arrête la tâche : rapport, aucune retouche.
- G3 — Aucun test supprimé, désactivé ou sauté ; aucun seuil changé. Format `.rbprofile` inchangé : `parseProfile`,
  `serializeProfile`, `BAR_KEYS`, `PROFILE_MINOR` non touchés.
- G4 — Icônes : tracés Lucide (ISC) copiés dans `apps/web/src/ui/icons.ts` avec mention de licence existante
  (`THIRD_PARTY_NOTICES.md` § Lucide) ; aucune dépendance ajoutée (`package.json`, `pnpm-lock.yaml`, `Cargo.toml`,
  `Cargo.lock` inchangés) ; trait 1,5 ; une icône sans équivalent Lucide est dessinée dans le même style.
- G5 — Jetons de L1 (`rb.css`, `--rf-*`) ; îlots : fond blanc (`--rf-white`), rayon 12 (`--rf-radius-xl`), filet
  `#E0E0E8` (`--rf-gray-300`, en `box-shadow: 0 0 0 1px`), ombre `--rf-shadow-hover` ; aucune couleur en dur dans une
  règle neuve ; positions d'îlot en px CSS entiers, jamais `translate(-50%)` ni colonnes `1fr` (L2-12).
- G6 — La CLI et le Wasm ne changent pas : `apps/cli/` et `crates/` non touchés.
- G7 — VM partagée : builds et tests en `nice -n 10` ; une suite complète (vitest de tout `apps/web`, `cargo test`) passe
  par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; un fichier de test isolé
  (`pnpm --filter @roomboard/web exec vitest run <fichier>`) ou `tsc` s'en passe. Un test qui échoue sur un délai se
  rejoue une fois. Une commande qui peut durer plus de 2 min part en tâche de fond, sans boucle d'attente.
- G8 — Interdits : `git push --force`, `git add -A|.`, `git commit -a`, `git tag`, `gh release`, `rm -rf` d'un worktree,
  `tauri build`. Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais terminés par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un par leur nom ; aucun push.
- G9 — Essais navigateur : ils supposent le build web fait, comme `scripts/verifier.sh:56`
  (`nice -n 10 pnpm --filter @roomboard/web build`, qui écrit `apps/web/dist`) ; puis
  `node scripts/essais/<x>-navigateur.mjs`, lancé à la racine du worktree ; `--e2e` ne passe jamais `--captures`.
- G10 — Sources `apps/web/src/ui/*.ts(x)` hors tests (garde `Toolbar.test.tsx:149-160`) : aucun `switch (`, aucun
  `localStorage`, aucun `draggable` ni `dragstart` (même en commentaire), et dans les `.tsx` aucun `\d+px` (écrire
  `` `${n}px` ``, et « 16 px » avec une espace dans les commentaires) ; aucun `innerHTML` ; tout branchement par une table.
- G11 — Worktree de la tâche : `/home/adminjd/projets/roomboard-wt/design-l2--T<n>` ; dépendances par
  `pnpm install --frozen-lockfile --prefer-offline` si `node_modules/.pnpm` manque ; modules Wasm (ignorés par git)
  copiés de `/home/adminjd/projets/roomboard-wt/design-l2/apps/web/src/wasm` et `…/wasm-formats` s'ils manquent ;
  fichiers temporaires dans `$HOME/.cache/tmp/of68-tmp/` (préfixe `T<n>-`) ; aucun processus laissé (Chromium, serveur).

## Review Focus

Cinq cas que le cadrage implique sans qu'un scénario les joue, du plus probable au moins probable ; chacun a son test
dans la tâche qui possède le code :

1. Position enregistrée sur un grand écran, rouverte sur un petit (ou fenêtre réduite) : l'îlot reste entier dans la
   case, la position enregistrée n'est pas réécrite (L2-11, H6). Tests : T2 `design-l2 L2-11 : placeIsland borne…`,
   T5 `design-l2 L2-11 : position bornée à l'affichage, jamais réécrite…`.
2. Stockage de l'appareil illisible ou partiel (JSON cassé, `x` sans `y`, types faux), ou qui refuse l'écriture
   (quota, mode privé) : îlot au départ du profil, aucune exception, mémoire seule (L2-7). Tests : T2
   `design-l2 L2-7 : valeur illisible…`, `… stockage qui refuse…`.
3. Menu ouvert : Retour arrière, Suppr, Espace, Échap ne vont pas au moteur (ils effaceraient la sélection derrière),
   Ctrl+S remonte (L2-6, effet de bord « un clic de plus »). Test : T3 `design-l2 L2-6 : touches du moteur gardées…`.
4. Copie utilisateur d'avant L2 (bandes, sans `menu`) : onglets et `#etat` en îlot au coin de la case de la scène, sous
   la bande, aucune erreur (effet de bord « copies d'avant L2 », H2). Test : T6 `design-l2 L2-5 : copie d'avant L2…`.
5. Profil importé avec un rôle inconnu flottant, ou Profil seulement dans une barre `panels` : l'îlot va en haut à
   droite après `panneaux` (H11) et l'accès Profil reste unique (L2-20). Tests : T1 `design-l2 L2-20 : Profil dans la
   barre panels…`, T6 `design-l2 H11 : rôle inconnu flottant…`.

## Carte des fichiers

| fichier | rôle | tâche |
|---|---|---|
| `apps/web/src/toolbar.ts` | constantes `MENU_ROLE`, `HISTORY_ROLE`, `PANELS_ROLE` ; `ensureProfilesAccess` hors `annotation` | T1 |
| `apps/web/src/toolbar-profiles.ts` | contenus et docks des profils fournis (L2-2, L2-4) | T1 |
| `apps/web/src/ui/ProfileEditor.tsx` | `ROLE_LABELS` : « Menu », « Annuler et vue », « Bibliothèque et profil » | T1 |
| `apps/web/src/ui/island-place.ts` (neuf) | placement pur : ancres, voies, largeur max., bornes, pas clavier, place du panneau, largeur des onglets | T2 |
| `apps/web/src/device-settings.ts` | `island` / `setIsland`, clé `roomboard.ilot.<profil>.<barre>` | T2 |
| `apps/web/src/ui/icons.ts`, `THIRD_PARTY_NOTICES.md` | icônes `menu`, `collapse` | T3 |
| `apps/web/src/ui/MenuBar.tsx` (neuf) | bouton Menu et liste `role="menu"` toujours dans le DOM | T3 |
| `apps/web/src/ui/TabsBar.tsx` | onglets à icônes `close`, `plus`, point violet | T4 |
| `apps/web/src/ui/PagesBar.tsx` | boutons `IconButton`, compteur entre Précédente et Suivante | T4 |
| `apps/web/src/ui/Island.tsx` (neuf) | `Island` (un îlot) et `IslandLayer` (calque, coins, mesures) | T5 |
| `apps/web/src/ui/App.tsx` | `IslandLayer` à la place de `.rb-head` et `.rb-floating` ; entrée `menu` de `BY_ROLE` | T6 |
| `apps/web/src/ui/layout.ts` | grille des seules bandes, sans rangée `tabs` | T6 |
| `apps/web/src/ui/Toolbar.tsx` | prop `collapsed`, îlot contextuel `[data-island-context]` en `floating` | T6 |
| `apps/web/src/ui/rb.css` | calque, coins, îlots, menu, onglets, panneaux passagers, `--rb-sheet-w`, segments | T6 |
| `scripts/essais/commun.mjs` + 11 essais | `clickItem`, `openMenuOf`, `islandBoxes`, `clashes` ; retouches de forme | T7 |
| `scripts/essais/design-l2-navigateur.mjs` (neuf), `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh` | preuve S1 à S6, captures | T8 |
| `docs/essais/design-l2-*.png`, `docs/essais/design-l2-comparaison.md` (neufs) | captures, écarts à la maquette 01 | T8 |

Noms partagés d'une tâche à l'autre (une seule écriture) : `MENU_ROLE = "menu"`, `HISTORY_ROLE = "history"`,
`PANELS_ROLE = "panels"` (T1) ; `Anchor`, `Point`, `Box`, `Corners`, `Lane`, `EDGE = 16`, `GAP = 8`, `TABS_MIN = 144`,
`SHEET_W = 600`, `BUTTON_PX`, `anchorOf`, `isCentered`, `laneOf`, `placeIsland`, `nudge`, `sheetLane`, `tabsWidth` (T2) ;
`IslandState`, `NO_ISLAND`, `islandKey`, `DeviceSettings.island`, `DeviceSettings.setIsland` (T2) ; `MenuBar`,
`MenuBarProps`, `MENU_LABEL` (T3) ; `counterAfter` (T4) ; `Island`, `IslandProps`, `IslandLayer`, `IslandLayerProps`,
`IslandStore`, `Placed`, `observeBox`, `GRIP_LABEL`, `COLLAPSE_LABEL`, `EXPAND_LABEL`, `MOVABLE_ROLE` (T5).
Attributs DOM : `data-island="<id de barre>|onglets"`, `data-anchor`, `data-wrap="1"`, `data-collapsed="1"` (îlot et
`[data-toolbar]`), `data-island-grip`, `data-island-collapse`, `data-island-context`, `data-corner`, `data-menu-toggle`,
`data-menu-list`. Classes : `.rb-islands`, `.rb-corner`, `.rb-corner-menu`, `.rb-island`, `.rb-island-chrome`,
`.rb-context`, `.rb-menu`, `.rb-tab-title`.

---

### Tâche T1 — Profils fournis en îlots : rôles `menu`, `history`, `panels`, accès Profil, libellés de rôle

<a id="tache-t1"></a>

**Objectif.** Les profils `defaut` et `annotation` portent cinq barres du tableau en `floating` (`outils`, `menu`,
`historique`, `panneaux`, `pages`) plus la barre d'annotation inchangée ; `simple` garde sa bande à gauche et passe sa
barre des pages en `floating` (L2-2, L2-3, L2-4, H1). `ensureProfilesAccess` compte un Profil de toute barre de rôle
autre qu'`annotation` (L2-20). L'éditeur nomme les trois rôles neufs (L2-21, déplacé de T6). Tous les tests rougis par
ce contenu sont mis à jour en forme dans le même commit.

**Fichiers.**
- Modifier : `apps/web/src/toolbar.ts:467-475` (`ensureProfilesAccess`), `apps/web/src/toolbar.ts:667-668` (constantes)
- Modifier : `apps/web/src/toolbar-profiles.ts:1`, `:24-45` (`pagesBar`), `:101-117` (`defaultToolbars`), `:147` (`simple`)
- Modifier : `apps/web/src/ui/ProfileEditor.tsx:115` (`ROLE_LABELS`) et son import de `../toolbar`
- Tests : `apps/web/src/toolbar.test.ts`, `apps/web/src/toolbar-profiles.test.ts`, `apps/web/src/profile-edit.test.ts`,
  `apps/web/src/ui/ProfileEditor.test.tsx`, `apps/web/src/ui/App.test.tsx`, et tout autre test rougi par le contenu des
  profils fournis (hors `device-settings*`, `ui/island-place*`, `ui/icons*`, `ui/MenuBar*`, fichiers de T2 et T3)

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit : `export const MENU_ROLE = "menu"`, `export const HISTORY_ROLE = "history"`, `export const PANELS_ROLE = "panels"`
  dans `apps/web/src/toolbar.ts` ; profils fournis : barres `outils` (`tools`), `menu` (`menu`), `historique`
  (`history`), `panneaux` (`panels`), `pages` (`pages`), `annotation` (`annotation`), dans cet ordre ; ids d'éléments
  inchangés ; groupes du menu `fichier`, `export`, `vue` ; séparateurs neufs `sep-5`, `sep-6`.
- Réutilise : `apps/web/src/toolbar.ts:671` — `export const ANNOTATION_ROLE = "annotation"` étendu par
  `MENU_ROLE`, `HISTORY_ROLE`, `PANELS_ROLE`, exportés à côté (cadrage § 3, ligne « rôles des nouvelles barres »).
- Réutilise : `apps/web/src/toolbar.ts:472` — `ensureProfilesAccess(bars, ctx)` étendu (règle de rôle : tout rôle sauf
  `ANNOTATION_ROLE`), signature inchangée (ligne « accès Profil garanti »).

**Test et commande bornée.**
```bash
W=/home/adminjd/projets/roomboard-wt/design-l2--T1
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/toolbar.test.ts src/toolbar-profiles.test.ts src/profile-edit.test.ts src/ui/ProfileEditor.test.tsx src/ui/App.test.tsx 2>&1 | tail -20
```
Preuve : `Test Files  5 passed (5)`, `Tests  N passed` (N ≥ 1), aucun `FAIL `, noms `design-l2 L2-20` et
`design-l2 L2-4` présents (`--reporter=verbose | grep -c "design-l2"` ≥ 9). Puis la suite web entière (étape 9).

**Preuve visuelle.** Aucune (contenu de profil ; la mise en page vient en T6, la preuve au navigateur en T8).

**Contraintes (recopiées).**
- G1 — TDD : test rouge vu d'abord. Chaque tâche met à jour dans son commit tous les tests qu'elle fait rougir et finit
  verte seule ; deux tâches d'une même vague ne touchent jamais le même fichier.
- G2 — Comportement inchangé hors de l'aspect ; essais existants verts, retouchés seulement en forme. Toute autre
  rougeur arrête la tâche : rapport, aucune retouche.
- G3 — Aucun test supprimé, désactivé ou sauté ; aucun seuil changé. Format `.rbprofile` inchangé : `parseProfile`,
  `serializeProfile`, `BAR_KEYS`, `PROFILE_MINOR` non touchés.
- G6 — La CLI et le Wasm ne changent pas : `apps/cli/` et `crates/` non touchés.
- G7 — VM partagée : `nice -n 10` ; suite complète par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; un
  fichier isolé ou `tsc` s'en passe ; un test qui échoue sur un délai se rejoue une fois ; commande de plus de 2 min en
  tâche de fond, sans boucle d'attente.
- G8 — Interdits : `git push --force`, `git add -A|.`, `git commit -a`, `git tag`, `gh release`, `rm -rf` d'un worktree,
  `tauri build`. Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un ; aucun push.
- G10 — `apps/web/src/ui/*.tsx` : aucun `switch (`, `localStorage`, `draggable`, `dragstart`, `\d+px`, `innerHTML`.
- G11 — Worktree `/home/adminjd/projets/roomboard-wt/design-l2--T1` ; temporaires dans `$HOME/.cache/tmp/of68-tmp/T1-*`.

**Retouches de forme autorisées** (L2-26, cadrage § 3.4), et rien d'autre :
- le dock attendu de la barre `outils` ou `pages` de `defaut` ou `annotation` passe de `"top"` / `"bottom"` à
  `"floating"` ; la barre des pages de `simple` passe de `"bottom"` à `"floating"` ;
- un élément cherché dans `toolbars[0]` ou dans un groupe `vue`, `fichier`, `historique` de `outils` se cherche dans sa
  barre neuve (`menu`, `historique`, `panneaux`) ;
- un test du tri ou de Monter / Descendre qui lisait le premier groupe de `outils` (`pen, eraser, eraser-mode, hand`)
  joue le même geste sur le groupe équivalent du nouvel ordre (groupe 0 : `select, hand` ; groupe 1 :
  `sep-1, pen, eraser, eraser-mode`), avec la même intention ;
- les trois libellés de barre de l'éditeur deviennent six.
Toute autre rougeur : arrêt, rapport.

**Interdits.** Toucher `parseBar`, `serializeProfile`, `BAR_KEYS`, `RESERVED_BAR_IDS` ; ajouter un champ ou une valeur de
`dock` ; changer un id d'élément ; toucher `App.tsx`, `Toolbar.tsx`, `rb.css` (T6), `PagesBar.tsx`, `TabsBar.tsx` (T4).

**Terminé quand.** Les cinq fichiers de la commande passent ; la suite web entière passe (0 `FAIL `) ; `tsc` code 0 ; un
commit ; le rapport liste chaque test retouché (fichier:ligne, avant → après) et la ligne
`Réutilisation : appelé toolbar.ts (ANNOTATION_ROLE, ensureProfilesAccess)` ou `Réutilisation : écart — <pourquoi>`.

#### Étapes

- [ ] **Étape 0 : préparer le worktree**

```bash
W=/home/adminjd/projets/roomboard-wt/design-l2--T1
cd "$W" && mkdir -p "$HOME/.cache/tmp/of68-tmp"
test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile --prefer-offline 2>&1 | tail -3
for d in wasm wasm-formats; do test -d "apps/web/src/$d" || cp -r "/home/adminjd/projets/roomboard-wt/design-l2/apps/web/src/$d" apps/web/src/; done
```

- [ ] **Étape 1 : tests rouges du modèle (`toolbar.test.ts`)** — ajouter `MENU_ROLE, HISTORY_ROLE, PANELS_ROLE` à
  l'import de `./toolbar` (ligne 5) et ce bloc en fin de fichier :

```ts
describe("design-l2 : rôles des îlots et accès Profil (L2-3, L2-20)", () => {
  const outils = { id: "outils", role: "tools", dock: "floating", groups: [{ id: "g", items: [{ id: "pen", kind: "tool", tool: "pen", label: "Stylo" }] }] };
  const panels = (hidden = false) => ({
    id: "panneaux",
    role: PANELS_ROLE,
    dock: "floating",
    groups: [{ id: "p", items: [{ id: "profiles", kind: "action", action: "profiles", label: "Profil", ...(hidden ? { hidden: true } : {}) }] }],
  });
  const profileOf = (...toolbars: unknown[]) => ({ format: "roomboard-profile", schema: 1, id: "x", label: "X", toolbars });

  it("design-l2 L2-3 : MENU_ROLE, HISTORY_ROLE, PANELS_ROLE valent menu, history, panels ; acceptés sans avertissement", () => {
    expect([MENU_ROLE, HISTORY_ROLE, PANELS_ROLE]).toEqual(["menu", "history", "panels"]);
    const menu = { id: "menu", role: MENU_ROLE, dock: "floating", groups: [{ id: "f", items: [{ id: "grid", kind: "action", action: "grid", label: "Grille" }] }] };
    const history = { id: "historique", role: HISTORY_ROLE, dock: "floating", groups: [{ id: "h", items: [{ id: "undo", kind: "action", action: "undo", label: "Annuler" }] }] };
    const { profile, warnings } = ok(profileOf(outils, menu, history, panels()));
    expect(warnings).toEqual([]);
    expect(profile.toolbars.map((b) => b.role)).toEqual(["tools", "menu", "history", "panels"]);
  });

  it("design-l2 L2-20 : Profil dans la barre panels : atteint, aucun second Profil ajouté à outils, aucun avertissement", () => {
    const { profile, warnings } = ok(profileOf(outils, panels()));
    expect(warnings).toEqual([]);
    const all = profile.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items.map((i) => i.id)));
    expect(all.filter((id) => id.startsWith("profiles"))).toEqual(["profiles"]);
  });

  it("design-l2 L2-20 : Profil masqué dans panels : montré, avertissement", () => {
    const { profile, warnings } = ok(profileOf(outils, panels(true)));
    expect(warnings).toContain("profiles : l'accès au menu Profil ne se masque pas, élément montré");
    expect(profile.toolbars[1]!.groups[0]!.items[0]!.hidden).toBeUndefined();
  });

  it("design-l2 L2-20 : Profil seulement dans une barre annotation : non atteint au tableau, ajouté en fin d'outils", () => {
    const ann = { id: "a", role: ANNOTATION_ROLE, dock: "top", groups: [{ id: "a", items: [{ id: "profiles", kind: "action", action: "profiles", label: "Profil" }] }] };
    const { profile, warnings } = ok(profileOf(outils, ann));
    expect(warnings).toContain("accès au menu Profil ajouté");
    expect(profile.toolbars[0]!.groups.flatMap((g) => g.items).at(-1)).toMatchObject({ id: "profiles-2", action: "profiles" });
  });

  it("design-l2 (H11, H18 de L4) : rôle inconnu flottant gardé tel quel, relu sans perte", () => {
    const odd = { id: "z", role: "zoom", dock: "floating", groups: [{ id: "z", items: [{ id: "fit-page", kind: "action", action: "fit-page", label: "Ajuster la page" }] }] };
    const { profile, warnings } = ok(profileOf(outils, panels(), odd));
    expect(warnings).toEqual([]);
    expect(profile.toolbars[2]).toMatchObject({ id: "z", role: "zoom", dock: "floating" });
    expect(ok(serializeProfile(profile)).profile).toEqual(profile);
  });
});
```

- [ ] **Étape 2 : les voir rouges**

```bash
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/toolbar.test.ts 2>&1 | tail -20
```
Attendu : `FAIL` (import `MENU_ROLE` absent, puis « accès au menu Profil ajouté » en trop dans L2-20).

- [ ] **Étape 3 : constantes et règle d'accès (`toolbar.ts`)** — après `export const ANNOTATION_ROLE = "annotation";` :

```ts
/** design-l2 (L2-3, DA-L2-1) : rôles des îlots du tableau ; `parseProfile` accepte tout rôle, le schéma ne change pas. */
export const MENU_ROLE = "menu";
export const HISTORY_ROLE = "history";
export const PANELS_ROLE = "panels";
```

Puis remplacer le commentaire et la première ligne de la boucle de `ensureProfilesAccess` (`toolbar.ts:467-475`) :

```ts
/**
 * Jamais enfermé hors du menu Profil (C1, P33) : dans toute barre de rôle autre qu'`annotation` (design-l2, L2-20 : la
 * barre `panneaux` porte Profil), un élément Profil masqué est montré (avertissement) ; sans élément Profil sans
 * capacité exigée, un élément est ajouté en fin de la première barre `tools`, ou dans une barre `outils` ajoutée en
 * haut s'il n'y en a aucune.
 */
function ensureProfilesAccess(bars: readonly Toolbar[], ctx: Ctx): readonly Toolbar[] {
  let reachable = false;
  const shown = bars.map((b): Toolbar => {
    if (b.role === ANNOTATION_ROLE) return b;
```
(le reste de la fonction est inchangé ; `ANNOTATION_ROLE` est une constante du module, lue à l'appel).

- [ ] **Étape 4 : les voir verts**

```bash
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/toolbar.test.ts 2>&1 | tail -20
```
Attendu : `Tests  N passed`, aucun `FAIL ` (les tests C1 d'avant restent verts : leur barre `vue` est de rôle `tools`).

- [ ] **Étape 5 : tests rouges des profils fournis (`toolbar-profiles.test.ts`)** — ajouter
  `HISTORY_ROLE, MENU_ROLE, PANELS_ROLE` à l'import de `./toolbar`, puis ce bloc en fin de fichier :

```ts
describe("design-l2 : profils fournis en îlots (L2-2 à L2-4)", () => {
  const flat = (id: string, barId: string) => builtinProfile(id)!.toolbars.find((b) => b.id === barId)!.groups.flatMap((g) => g.items.map((i) => i.id));
  it("design-l2 L2-4 : outils de defaut et annotation : Sélection, Main | Stylo, Gomme, Gomme : partielle | formes, Texte, Tableau, Pot | Annotation du bureau", () => {
    for (const id of ["defaut", "annotation"]) {
      expect(flat(id, "outils"), id).toEqual(["select", "hand", "sep-1", "pen", "eraser", "eraser-mode", "sep-2", "rect", "ellipse", "line", "arrow", "text", "table", "fill", "sep-3", "desktop-annotation"]);
      expect(visibleItems(builtinProfile(id)!.toolbars[0]!, ALL)[0]!.id, id).toBe("select");
    }
  });
  it("design-l2 L2-4 : menu, historique, panneaux et pages de defaut", () => {
    expect(flat("defaut", "menu")).toEqual(["file-new", "file-open", "file-import", "file-save", "file-save-as", "sep-5", "page-insert-file", "export-pdf", "export-iwb", "export-ubz", "edit-original", "sep-6", "grid", "settings"]);
    expect(flat("defaut", "historique")).toEqual(["undo", "redo", "fit-page"]);
    expect(flat("defaut", "panneaux")).toEqual(["library", "profiles"]);
    expect(flat("defaut", "pages")).toEqual(["page-prev", "page-next", "page-add", "page-remove"]);
  });
  it("design-l2 L2-4, H1 : simple : outils et pages inchangés, pages en îlot", () => {
    expect(flat("simple", "outils")).toEqual(["pen", "eraser", "hand", "sep-1", "undo", "redo", "sep-2", "fit-page", "profiles", "settings", "desktop-annotation"]);
    expect(flat("simple", "pages")).toEqual(["page-prev", "page-next", "page-add", "page-remove", "page-insert-file", "export-pdf", "export-iwb", "export-ubz"]);
  });
  it("design-l2 L2-3 : rôles tools, menu, history, panels, pages, annotation ; ids uniques dans le profil", () => {
    const d = builtinProfile("defaut")!;
    expect(d.toolbars.map((b) => b.role)).toEqual(["tools", MENU_ROLE, HISTORY_ROLE, PANELS_ROLE, "pages", "annotation"]);
    const all = d.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items.map((i) => i.id)));
    expect(new Set(all).size).toBe(all.length);
  });
  it("design-l2 L2-2 : aucune bande horizontale au tableau dans un profil fourni", () => {
    for (const p of BUILTIN_PROFILES) {
      expect(p.toolbars.filter((b) => b.role !== "annotation" && (b.dock === "top" || b.dock === "bottom")).map((b) => b.id), p.id).toEqual([]);
    }
  });
});
```

Et réécrire en forme les tests qui lisent l'ancien contenu (le reste du fichier ne bouge pas) :

```ts
  it("design-l2 L2-4 : Grille et Réglages dans le groupe vue du menu de defaut et d'annotation ; absente de simple", () => {
    for (const id of ["defaut", "annotation"]) {
      const vue = builtinProfile(id)!.toolbars.find((b) => b.id === "menu")!.groups.find((g) => g.id === "vue")!;
      expect(vue.items.slice(1).map((i) => i.id), id).toEqual(["grid", "settings"]);
    }
    expect(ids("simple")).not.toContain("grid");
  });
```
(remplace « Grille (E7, HE5) », lignes 43-49.)

```ts
  it("toolbars en liste : chacune avec son dock (design-l2 L2-2)", () => {
    const d = builtinProfile("defaut")!;
    expect(d.toolbars.map((b) => [b.id, b.role, b.dock])).toEqual([["outils", "tools", "floating"], ["menu", "menu", "floating"], ["historique", "history", "floating"], ["panneaux", "panels", "floating"], ["pages", "pages", "floating"], ["annotation", "annotation", "top"]]);
    expect(builtinProfile("simple")!.toolbars.map((b) => b.dock)).toEqual(["left", "floating", "left"]);
    expect(builtinProfile("simple")!.interface.buttonSize).toBe("l");
  });
```
(remplace lignes 56-61.)

```ts
  it("defaut : « Importer » après « Ouvrir » dans le groupe fichier du menu ; simple ne l'a pas (R18)", () => {
    const fichier = builtinProfile("defaut")!.toolbars.find((b) => b.id === "menu")!.groups.find((g) => g.id === "fichier")!;
    const fichierIds = fichier.items.map((i) => i.id);
    expect(fichierIds.indexOf("file-import")).toBe(fichierIds.indexOf("file-open") + 1);
    expect(fichier.items.find((i) => i.id === "file-import")?.label).toBe("Importer");
    expect(ids("simple")).not.toContain("file-import");
  });

  it("un profil enregistré sans « Importer » ne le reçoit pas", () => {
    const json = structuredClone(DEFAULT_PROFILE_JSON) as { id: string; toolbars: { groups: { id: string; items: { id: string }[] }[] }[] };
    json.id = "perso";
    for (const b of json.toolbars) for (const g of b.groups) g.items = g.items.filter((i) => i.id !== "file-import");
    const r = parseProfile(json);
    if ("errors" in r) throw new Error(r.errors.join(" ; "));
    expect(r.profile.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items.map((i) => i.id)))).not.toContain("file-import");
  });
```
(remplace lignes 74-89.)

```ts
describe("barre : Exporter en PDF (C12, PF19) et copies au format (C13, D17) — design-l2 L2-4", () => {
  const tail = [
    expect.objectContaining({ id: "export-pdf", kind: "action", action: "export-pdf", label: "Exporter en PDF…" }),
    expect.objectContaining({ id: "export-iwb", kind: "action", action: "export-iwb", label: "Enregistrer une copie au format .iwb…" }),
    expect.objectContaining({ id: "export-ubz", kind: "action", action: "export-ubz", label: "Enregistrer une copie au format .ubz…" }),
  ];
  it("defaut et annotation : dans le groupe export du menu, après « Insérer des pages… » ; nulle part ailleurs", () => {
    for (const id of ["defaut", "annotation"]) {
      const bars = builtinProfile(id)!.toolbars;
      const exp = bars.find((b) => b.id === "menu")!.groups.find((g) => g.id === "export")!.items;
      expect(exp.map((i) => i.id), id).toEqual(["sep-5", "page-insert-file", "export-pdf", "export-iwb", "export-ubz", "edit-original"]);
      expect(exp.slice(2, 5), id).toEqual(tail);
      const others = bars.filter((b) => b.id !== "menu").flatMap((b) => b.groups.flatMap((g) => g.items));
      expect(others.some((i) => ["page-insert-file", "export-pdf", "export-iwb", "export-ubz"].includes(i.id)), id).toBe(false);
    }
  });
  it("simple : en fin de la barre des pages, flottante", () => {
    const pages = builtinProfile("simple")!.toolbars.find((b) => b.role === "pages")!;
    expect(pages.dock).toBe("floating");
    expect(pages.groups.flatMap((g) => g.items).slice(-3)).toEqual(tail);
  });
});
```
(remplace le `describe` des lignes 102-118.)

```ts
describe("barre : Modifier dans l'application d'origine (C16, O19) — design-l2 L2-4", () => {
  it("defaut et annotation : « edit-original » en fin du groupe export du menu, après la copie .ubz, requires officeConverter ; simple : absent", () => {
    for (const id of ["defaut", "annotation"]) {
      const items = builtinProfile(id)!.toolbars.find((b) => b.id === "menu")!.groups.flatMap((g) => g.items);
      const i = items.findIndex((x) => x.id === "edit-original");
      expect(i, id).toBeGreaterThanOrEqual(0);
      expect(items[i], id).toMatchObject({ kind: "action", action: "edit-original", label: "Modifier dans l'application d'origine", requires: ["officeConverter"] });
      expect(items[i - 1]!.id, id).toBe("export-ubz");
    }
    const simple = builtinProfile("simple")!.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items.map((x) => x.id)));
    expect(simple).not.toContain("edit-original");
  });
});
```
(remplace le `describe` C16.) Dans « design-l4 T6 : L4-6 », `["outils", "pages", "annotation"]` devient
`["outils", "menu", "historique", "panneaux", "pages", "annotation"]` ; dans « L4-7 », `["pages", "bottom"]` devient
`["pages", "floating"]`.

- [ ] **Étape 6 : les voir rouges**

```bash
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/toolbar-profiles.test.ts 2>&1 | tail -20
```
Attendu : `FAIL` sur les tests `design-l2` et les tests réécrits.

- [ ] **Étape 7 : profils fournis (`toolbar-profiles.ts`)** — import ligne 1 :

```ts
import { HISTORY_ROLE, MENU_ROLE, PANELS_ROLE, parseProfile, type Profile } from "./toolbar";
```

`pagesBar` (remplace les lignes 24-45) :

```ts
/** design-l2 (L2-4, H1) : barre des pages en îlot ; `full` : actions d'insertion et d'export (profil simple, sans menu). */
const pagesBar = (full: boolean) => ({
  id: "pages",
  role: "pages",
  dock: "floating",
  groups: [
    {
      id: "pages",
      items: [
        action("page-prev", "Page précédente"),
        action("page-next", "Page suivante"),
        action("page-add", "Ajouter une page"),
        action("page-remove", "Retirer la page"),
        ...(full
          ? [
              action("page-insert-file", "Insérer des pages…"),
              action("export-pdf", "Exporter en PDF…"),
              action("export-iwb", "Enregistrer une copie au format .iwb…"),
              action("export-ubz", "Enregistrer une copie au format .ubz…"),
            ]
          : []),
      ],
    },
  ],
});

/** design-l2 (L2-4) : îlot du menu (fichier, export, vue) ; « Modifier dans l'application d'origine » exige la capacité (C16, O19). */
const menuBar = () => ({
  id: "menu",
  role: MENU_ROLE,
  dock: "floating",
  groups: [
    { id: "fichier", items: [action("file-new", "Nouveau"), action("file-open", "Ouvrir"), action("file-import", "Importer"), action("file-save", "Enregistrer"), action("file-save-as", "Enregistrer sous")] },
    {
      id: "export",
      items: [
        sep("sep-5"),
        action("page-insert-file", "Insérer des pages…"),
        action("export-pdf", "Exporter en PDF…"),
        action("export-iwb", "Enregistrer une copie au format .iwb…"),
        action("export-ubz", "Enregistrer une copie au format .ubz…"),
        { ...action("edit-original", "Modifier dans l'application d'origine"), requires: ["officeConverter"] },
      ],
    },
    { id: "vue", items: [sep("sep-6"), action("grid", "Grille"), action("settings", "Réglages")] },
  ],
});

/** design-l2 (L2-4) : îlot « Annuler et vue », en bas à gauche. */
const historyBar = () => ({
  id: "historique",
  role: HISTORY_ROLE,
  dock: "floating",
  groups: [{ id: "historique", items: [action("undo", "Annuler"), action("redo", "Rétablir"), action("fit-page", "Ajuster la page")] }],
});

/** design-l2 (L2-4) : îlot « Bibliothèque et profil », en haut à droite ; porte l'accès au menu Profil (L2-20). */
const panelsBar = () => ({
  id: "panneaux",
  role: PANELS_ROLE,
  dock: "floating",
  groups: [{ id: "panneaux", items: [action("library", "Bibliothèque"), action("profiles", "Profil")] }],
});
```

`defaultToolbars` (remplace les lignes 101-117) :

```ts
/** Barres du profil par défaut : une seule source pour `defaut` et `annotation` (P9) ; design-l2 (L2-2) : toutes les
 *  barres du tableau en îlots, la barre d'annotation reste une bande (L4-1, dernière de `toolbars`). */
const defaultToolbars = () => [
  {
    id: "outils",
    role: "tools",
    dock: "floating",
    groups: [
      { id: "navigation", items: [tool("select", "Sélection"), tool("hand", "Main")] },
      { id: "dessin", items: [sep("sep-1"), tool("pen", "Stylo"), tool("eraser", "Gomme"), action("eraser-mode", "Gomme : partielle")] },
      { id: "edition", items: [sep("sep-2"), tool("rect", "Rectangle"), tool("ellipse", "Ellipse"), tool("line", "Ligne"), tool("arrow", "Flèche"), tool("text", "Texte"), tool("table", "Tableau"), tool("fill", "Pot")] },
      { id: "bureau", items: [sep("sep-3"), annotationEntry()] },
    ],
  },
  menuBar(),
  historyBar(),
  panelsBar(),
  pagesBar(false),
  defaultAnnotationBar(),
];
```

Dans `SIMPLE_PROFILE_JSON`, `pagesBar(),` (ligne 147) devient `pagesBar(true),`.

- [ ] **Étape 8 : libellés de rôle (`ProfileEditor.tsx:115`)** — ajouter `HISTORY_ROLE, MENU_ROLE, PANELS_ROLE` à l'import
  de `../toolbar`, puis :

```ts
/** L3-9 ; design-l2 (L2-21) : libellés des trois rôles d'îlots. */
const ROLE_LABELS: Readonly<Record<string, string>> = {
  tools: "Barre d'outils",
  pages: "Barre des pages",
  [ANNOTATION_ROLE]: "Barre d'annotation",
  [MENU_ROLE]: "Menu",
  [HISTORY_ROLE]: "Annuler et vue",
  [PANELS_ROLE]: "Bibliothèque et profil",
};
```

- [ ] **Étape 9 : retouches de forme des autres tests, puis suite web entière** — d'abord les rougeurs connues
  (relevées au cadrage et à la lecture des fichiers) :

`profile-edit.test.ts:75-81` (Monter / Descendre, P14) :
```ts
    expect(groupsOf(DEFAUT)[0]).toEqual(["select", "hand"]);
    expect(groupsOf(moveItem(DEFAUT, "outils", "hand", -1))[0]).toEqual(["hand", "select"]);
    const down = moveItem(DEFAUT, "outils", "hand", 1);
    expect(groupsOf(down)[0]).toEqual(["select"]);
    expect(groupsOf(down)[1]![0]).toBe("hand");
    const up = moveItem(DEFAUT, "outils", "sep-1", -1);
    expect(groupsOf(up)[0]).toEqual(["select", "hand", "sep-1"]);
    expect(moveItem(DEFAUT, "outils", "select", -1)).toEqual(DEFAUT);
```
(les trois dernières lignes du test, `desktop-annotation`, `absent`, `pages`, ne changent pas.)

`profile-edit.test.ts:247-256` (`moveItemTo`, L3-14) :
```ts
  it("design-l3 L3-14 : moveItemTo rang 0 : tête du premier groupe, rien de perdu", () => {
    const p = moveItemTo(DEFAUT, "outils", "text", 0);
    expect(groupsOf(p)[0]).toEqual(["text", "select", "hand"]);
    expect(groupsOf(p)[2]).not.toContain("text");
    expect(ids(p)).toHaveLength(ids(DEFAUT).length);
  });

  it("design-l3 L3-14 : moveItemTo : l'élément rejoint le groupe de celui qui le précède (frontière de groupe)", () => {
    expect(groupsOf(moveItemTo(DEFAUT, "outils", "select", 1))[0]).toEqual(["hand", "select"]);
    const p = moveItemTo(DEFAUT, "outils", "select", 2);
    expect(groupsOf(p)[0]).toEqual(["hand"]);
    expect(groupsOf(p)[1]!.slice(0, 3)).toEqual(["sep-1", "select", "pen"]);
  });
```

`ui/ProfileEditor.test.tsx:104` :
```ts
    expect([...container.querySelectorAll('[data-edit="bar"] [data-choice]')].map((b) => [b.getAttribute("data-choice"), b.textContent])).toEqual([["outils", "Barre d'outils"], ["menu", "Menu"], ["historique", "Annuler et vue"], ["panneaux", "Bibliothèque et profil"], ["pages", "Barre des pages"], ["annotation", "Barre d'annotation"]]);
```
`ui/ProfileEditor.test.tsx:147-159` (Monter / Descendre, P14) : `[data-edit-item="pen"] button[data-edit="up"]` devient `select` ; le geste sur
`hand` (Descendre) attend `groups[0]` = `["select"]` et `groups[1]![0]` = `"hand"`. `:161-175` (Monter au clavier
deux fois) : la ligne déplacée devient `eraser-mode` (`grip("eraser-mode")`, sélecteurs `[data-edit-item="eraser-mode"]`),
et l'attendu final `outils(last(save)).groups[1]!.items.map((i) => i.id)` vaut
`["sep-1", "eraser-mode", "pen", "eraser"]`. Le test `:177` (« Monter jusqu'en tête ») passe de `eraser` à `hand` ; « S4 : Rétablir les barres » (`:209`) attend `floating` au lieu de `top` (retour à l'origine).

`ui/App.test.tsx` :
- `:363` « la scène est dans sa case » : le test monte un profil à bandes, puis ne contrôle que les barres ancrées.
```ts
  it("la scène est dans sa case : aucune barre ancrée en position absolue", () => {
    const { container, store, active } = renderApp();
    const bandes = setDock(setDock(BUILTIN_PROFILES[0]!, "outils", "top"), "pages", "bottom");
    store.save({ ...bandes, id: "bandes", label: "Bandes" });
    active.choose("bandes");
    const layout = container.querySelector<HTMLElement>(".rb-layout");
    expect(layout, ".rb-layout").not.toBeNull();
    const docked = bandes.toolbars.filter((b) => b.role !== "annotation" && b.dock !== "floating");
    const expected = layoutFor(docked);
    const names = areaNames(expected.areas);
    expect(names.has("stage")).toBe(true);
    const stages = container.querySelector<HTMLElement>("main.rb-stages")!;
    expect(stages, "main.rb-stages").not.toBeNull();
    expect(stages.parentElement).toBe(layout);
    expect(getComputedStyle(stages).position).toBe("relative");
    const bars = [...container.querySelectorAll<HTMLElement>("[data-toolbar]")].filter((b) => b.dataset["dock"] !== "floating");
    expect(bars.map((b) => b.dataset["toolbar"])).toEqual(docked.map((b) => b.id));
```
  (la suite du test, la boucle `for (const bar of bars)` et les deux `gridTemplate*`, ne change pas.)
- `:658` : `expect(container.querySelector(".rb-floating")).toBeNull();` devient
  `expect(container.querySelector('.rb-floating [data-toolbar="annotation"]')).toBeNull();`.
- `:797-799` : `dockTile("top")` devient `dockTile("floating")` et `.toBe("top")` devient `.toBe("floating")`.
- `:899` : `.toolbars[0].dock).toBe("top")` devient `.toBe("floating")`.
- `:1001-1009` : chaque `data-dock` attendu `"top"` de la barre `outils` devient `"floating"`.

Puis la suite web entière, en tâche de fond (plus de 2 min) :
```bash
cd "$W" && node ~/.claude/scripts/vm/suite-vm.cjs -- nice -n 10 pnpm --filter @roomboard/web exec vitest run > "$HOME/.cache/tmp/of68-tmp/T1-web.log" 2>&1; echo "code $?" >> "$HOME/.cache/tmp/of68-tmp/T1-web.log"
tail -25 "$HOME/.cache/tmp/of68-tmp/T1-web.log"; grep -c "FAIL " "$HOME/.cache/tmp/of68-tmp/T1-web.log"
```
Toute rougeur restante relevant des quatre retouches autorisées (dock `top`/`bottom` → `floating` pour `outils` ou
`pages` des profils fournis ; élément cherché dans sa barre neuve ; geste rejoué sur le groupe équivalent ; libellés
de barre) est corrigée de même et listée au rapport ; toute autre rougeur arrête la tâche. Attendu final : `code 0`,
`Tests  N passed`, `0` pour le compte de `FAIL `.

- [ ] **Étape 10 : types**

```bash
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20; echo "tsc code ${PIPESTATUS[0]}"
```
Attendu : `tsc code 0`.

- [ ] **Étape 11 : commit**

```bash
cd "$W" && git add apps/web/src/toolbar.ts apps/web/src/toolbar.test.ts apps/web/src/toolbar-profiles.ts apps/web/src/toolbar-profiles.test.ts apps/web/src/profile-edit.test.ts apps/web/src/ui/ProfileEditor.tsx apps/web/src/ui/ProfileEditor.test.tsx apps/web/src/ui/App.test.tsx
# plus, un par un, chaque autre fichier de test retouché à l'étape 9 (git status --short pour la liste)
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -F - <<'MSG'
feat(design-l2): built-in profiles as floating islands (menu, history, panels roles)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

### Tâche T2 — Placement pur des îlots et réglage d'appareil `island` / `setIsland`

<a id="tache-t2"></a>

**Objectif.** Un module sans DOM, `ui/island-place.ts`, décide où va chaque îlot : ancre par rôle (L2-5), voie et
largeur maximale (L2-30), bornes d'un îlot déplacé (L2-9, L2-11), pas clavier (L2-10), voie imposée par le panneau des
profils (L2-16), largeur des onglets (L2-30 c) — toujours en px entiers (L2-12). `device-settings.ts` garde position et
repli par profil et par barre (L2-7, DA-L2-3).

**Fichiers.**
- Créer : `apps/web/src/ui/island-place.ts`, `apps/web/src/ui/island-place.test.ts`
- Modifier : `apps/web/src/device-settings.ts` (ajouts après `FRAME_HIDDEN`, interface, `createDeviceSettings`)
- Test : `apps/web/src/device-settings.test.ts` (ajouts)

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit (`apps/web/src/ui/island-place.ts`) :
  ```ts
  export type Anchor = "top-start" | "top-center" | "top-end" | "bottom-start" | "bottom-center";
  export interface Point { readonly x: number; readonly y: number }
  export interface Box { readonly w: number; readonly h: number }
  /** Rangée de l'ancre : largeur occupée à gauche (`start`) et à droite (`end`) par les groupes de coins, hauteur de la rangée (`band`). */
  export interface Corners { readonly start: number; readonly end: number; readonly band: number }
  export interface Lane { readonly x: number; readonly y: number; readonly maxWidth: number }
  export const EDGE = 16; export const GAP = 8; export const TABS_MIN = 144; export const SHEET_W = 600;
  export const BUTTON_PX: Readonly<Record<ButtonSize, number>>; // { s: 44, m: 48, l: 64 }
  export const ISLAND_ANCHORS: Readonly<Record<string, Anchor>>;
  export function anchorOf(role: string): Anchor;
  export function isCentered(anchor: Anchor): boolean;
  export function laneOf(anchor: Anchor, size: Box, area: Box, corners: Corners): Lane;
  export function placeIsland(anchor: Anchor, size: Box, area: Box, at: Point | null, corners: Corners): Point;
  export function nudge(at: Point, key: string, big: boolean): Point | null;
  export function sheetLane(area: Box, sheet: number, band: number, btn: number): Lane | null;
  export function tabsWidth(area: Box, startX: number, end: number, tools: Point | null): number;
  ```
  Écart à l'interface du cadrage (§ 3, ligne « placer un îlot ») : `corners` porte aussi `band` (hauteur de la rangée
  des coins, sans laquelle la voie suivante n'a pas de `y` à la taille S, M ou L) ; `sheetLane`, `tabsWidth`,
  `isCentered` sont ajoutées (L2-16, L2-30 c).
- Produit (`apps/web/src/device-settings.ts`) :
  ```ts
  export const ISLAND_KEY_PREFIX = "roomboard.ilot.";
  export function islandKey(profileId: string, barId: string): string; // "roomboard.ilot.<profil>.<barre>"
  export interface IslandState { readonly at: { readonly x: number; readonly y: number } | null; readonly collapsed: boolean | null }
  export const NO_ISLAND: IslandState;
  // DeviceSettings, en plus :
  island(profileId: string, barId: string): IslandState;
  setIsland(profileId: string, barId: string, s: IslandState): boolean;
  ```
- Réutilise : `apps/web/src/app/table-picker.ts:29` — `placeWithin(at: Point, size: { w, h }, box: { w, h }): Point`,
  appelé par `placeIsland` pour borner un îlot déplacé (même règle : décalé vers le haut ou la gauche, collé en haut à
  gauche si trop grand ; case 0 × 0 : le point reste).
- Réutilise : aucun module existant pour placer un îlot (cherché : `clamp`, `ResizeObserver`, `Math.round`, `placeTip`,
  `placeWithin` ; `placeWithin` ne connaît ni ancre, ni voie, ni arrondi) — nouveau module `ui/island-place.ts` (DA-L2-2).
- Réutilise : `apps/web/src/device-settings.ts:24` — `DeviceSettings` étendu par `island` et `setIsland`
  (`IslandState`, null : rien sur l'appareil) ; `onChange` inchangé (n'est pas appelé par `setIsland`) ; patron `kv`
  injecté, `null` : mémoire seule.

**Test et commande bornée.**
```bash
W=/home/adminjd/projets/roomboard-wt/design-l2--T2
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/island-place.test.ts src/device-settings.test.ts --reporter=verbose 2>&1 | tail -45
```
Preuve : `Test Files  2 passed (2)`, `Tests  N passed` avec N ≥ 20, noms `design-l2 L2-30` et `design-l2 L2-7`
présents, aucun `FAIL `.

**Preuve visuelle.** Aucune (module pur).

**Contraintes (recopiées).**
- G1 — TDD : test rouge vu d'abord. Chaque tâche met à jour dans son commit tous les tests qu'elle fait rougir et finit
  verte seule ; deux tâches d'une même vague ne touchent jamais le même fichier.
- G3 — Aucun test supprimé, désactivé ou sauté ; aucun seuil changé. Format `.rbprofile` inchangé : rien n'est écrit
  dans le profil.
- G5 — Positions d'îlot en px CSS entiers, jamais `translate(-50%)` ni colonnes `1fr` (L2-12).
- G6 — La CLI et le Wasm ne changent pas.
- G7 — VM partagée : `nice -n 10` ; un fichier de test isolé ou `tsc` sans suite-vm ; un test qui échoue sur un délai se
  rejoue une fois.
- G8 — Interdits : `git push --force`, `git add -A|.`, `git commit -a`, `git tag`, `gh release`, `rm -rf` d'un worktree,
  `tauri build`. Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un ; aucun push.
- G10 — `apps/web/src/ui/*.ts` : aucun `switch (`, aucun `localStorage` (le stockage passe par `kv` dans
  `device-settings.ts`, hors de `ui/`), tout branchement par une table.
- G11 — Worktree `/home/adminjd/projets/roomboard-wt/design-l2--T2` ; temporaires dans `$HOME/.cache/tmp/of68-tmp/T2-*`.

**Interdits.** Aucun DOM dans `island-place.ts` (ni `document`, ni `window`, ni `ResizeObserver`) ; ne pas toucher
`app/table-picker.ts` ; ne pas notifier `onChange` depuis `setIsland` ; aucune clé hors `roomboard.ilot.*`.

**Terminé quand.** Les deux fichiers de test passent (≥ 20 tests) ; `tsc` code 0 ; un commit ; rapport avec
`Réutilisation : appelé app/table-picker.ts (placeWithin), device-settings.ts (étendu)` ou `Réutilisation : écart — …`.

#### Étapes

- [ ] **Étape 0 : préparer le worktree** (même bloc qu'en T1, avec `W=/home/adminjd/projets/roomboard-wt/design-l2--T2`) :

```bash
W=/home/adminjd/projets/roomboard-wt/design-l2--T2
cd "$W" && mkdir -p "$HOME/.cache/tmp/of68-tmp"
test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile --prefer-offline 2>&1 | tail -3
for d in wasm wasm-formats; do test -d "apps/web/src/$d" || cp -r "/home/adminjd/projets/roomboard-wt/design-l2/apps/web/src/$d" apps/web/src/; done
```

- [ ] **Étape 1 : tests rouges du placement** — créer `apps/web/src/ui/island-place.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  BUTTON_PX, EDGE, GAP, SHEET_W, TABS_MIN, anchorOf, isCentered, laneOf, nudge, placeIsland, sheetLane, tabsWidth,
  type Corners,
} from "./island-place";

const MID = { w: 1280, h: 900 };
/** Rangée du haut de `defaut` en taille M : menu 56, écart 8, onglets 144 au moins ; panneaux 108 ; hauteur 56. */
const TOP: Corners = { start: 56 + 8 + 144, end: 108, band: 56 };
/** Rangée du bas : historique 160 ; rien à droite. */
const BOTTOM: Corners = { start: 160, end: 0, band: 56 };
const TOOLS = { w: 770, h: 56 };

describe("island-place : ancres (design-l2 L2-5, H11)", () => {
  it("design-l2 L2-5 : menu haut-gauche, outils haut-centre, panneaux haut-droite, historique bas-gauche, pages bas-centre", () => {
    expect(["menu", "tools", "panels", "history", "pages"].map(anchorOf)).toEqual(["top-start", "top-center", "top-end", "bottom-start", "bottom-center"]);
  });
  it("design-l2 H11 : rôle inconnu ou clé héritée : haut-droite", () => {
    for (const r of ["zoom", "", "__proto__", "toString"]) expect(anchorOf(r), r).toBe("top-end");
  });
  it("isCentered : seulement top-center et bottom-center", () => {
    expect((["top-start", "top-center", "top-end", "bottom-start", "bottom-center"] as const).map(isCentered)).toEqual([false, true, false, false, true]);
  });
  it("constantes : marges 16, écart 8, onglets 144, panneau 600, boutons 44 / 48 / 64", () => {
    expect([EDGE, GAP, TABS_MIN, SHEET_W]).toEqual([16, 8, 144, 600]);
    expect(BUTTON_PX).toEqual({ s: 44, m: 48, l: 64 });
  });
});

describe("island-place : voies (design-l2 L2-30, L2-12)", () => {
  it("design-l2 L2-30 (b) : 1280, la place symétrique contient l'îlot d'outils : il reste sur la rangée du haut, centré, entier", () => {
    // place symétrique : 1280 - 2 × (16 + max(208, 108) + 8) = 816
    expect(laneOf("top-center", TOOLS, MID, TOP)).toEqual({ x: 255, y: 16, maxWidth: 816 });
  });
  it("design-l2 L2-30 (b) : 1024, la place symétrique (560) ne le contient pas : voie suivante, sous la rangée du haut", () => {
    expect(laneOf("top-center", TOOLS, { w: 1024, h: 768 }, TOP)).toEqual({ x: 127, y: 16 + 56 + 8, maxWidth: 992 });
  });
  it("design-l2 L2-30 (a) : 768, largeur maximale = voie - 2 × 16 = 736, collé à 16", () => {
    expect(laneOf("top-center", TOOLS, { w: 768, h: 700 }, TOP)).toEqual({ x: 16, y: 80, maxWidth: 736 });
  });
  it("design-l2 L2-12 : centrage arrondi à l'entier (largeur impaire)", () => {
    const l = laneOf("top-center", { w: 771, h: 56 }, MID, TOP);
    expect(Number.isInteger(l.x) && Number.isInteger(l.y)).toBe(true);
    expect(l.x).toBe(Math.round((1280 - 771) / 2));
  });
  it("design-l2 L2-30 (b) : pages centrées sur la rangée du bas, à droite de l'historique", () => {
    expect(laneOf("bottom-center", { w: 400, h: 56 }, MID, BOTTOM)).toEqual({ x: 440, y: 900 - 16 - 56, maxWidth: 912 });
  });
  it("design-l2 L2-18 : trente pages : voie au-dessus de la rangée du bas, toute la largeur, sans recouvrir l'historique", () => {
    const l = laneOf("bottom-center", { w: 1900, h: 56 }, MID, BOTTOM);
    expect(l).toEqual({ x: 16, y: 900 - 16 - 56 - 8 - 56, maxWidth: 1248 });
    expect(l.y + 56).toBeLessThanOrEqual(900 - 16 - 56);
  });
  it("coins : haut-gauche à (16, 16), haut-droite collé à 16 du bord droit, bas-gauche à 16 du bas", () => {
    expect(laneOf("top-start", { w: 56, h: 56 }, MID, TOP)).toEqual({ x: 16, y: 16, maxWidth: 1248 });
    expect(laneOf("top-end", { w: 108, h: 56 }, MID, TOP)).toEqual({ x: 1280 - 16 - 108, y: 16, maxWidth: 1248 });
    expect(laneOf("bottom-start", { w: 160, h: 56 }, MID, BOTTOM)).toEqual({ x: 16, y: 900 - 16 - 56, maxWidth: 1248 });
  });
  it("case vide (0 × 0) : aucune valeur négative ni fractionnaire", () => {
    const l = laneOf("top-center", TOOLS, { w: 0, h: 0 }, TOP);
    expect(l.maxWidth).toBe(0);
    expect(l.y).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(l.x)).toBe(true);
  });
});

describe("island-place : îlot déplacé (design-l2 L2-9, L2-11)", () => {
  it("sans position : celle de la voie", () => {
    expect(placeIsland("top-center", TOOLS, MID, null, TOP)).toEqual({ x: 255, y: 16 });
  });
  it("design-l2 L2-11 : placeIsland borne l'îlot entier dans la case (position d'un grand écran sur un petit)", () => {
    expect(placeIsland("top-center", TOOLS, { w: 1024, h: 768 }, { x: 1500, y: 1000 }, TOP)).toEqual({ x: 1024 - 770, y: 768 - 56 });
    expect(placeIsland("top-center", TOOLS, MID, { x: -40, y: -10 }, TOP)).toEqual({ x: 0, y: 0 });
  });
  it("design-l2 L2-12 : positions arrondies à l'entier", () => {
    expect(placeIsland("top-center", TOOLS, MID, { x: 10.4, y: 20.6 }, TOP)).toEqual({ x: 10, y: 21 });
  });
  it("design-l2 L2-11 : îlot plus large que la case : largeur ramenée à la case - 32, collé à gauche", () => {
    expect(placeIsland("top-center", { w: 2000, h: 56 }, { w: 768, h: 700 }, { x: 300, y: 100 }, TOP)).toEqual({ x: 768 - 736, y: 100 });
  });
});

describe("island-place : clavier (design-l2 L2-10)", () => {
  it("flèches : 16 px ; Maj : 64 px", () => {
    const p = { x: 100, y: 200 };
    expect(nudge(p, "ArrowRight", false)).toEqual({ x: 116, y: 200 });
    expect(nudge(p, "ArrowLeft", false)).toEqual({ x: 84, y: 200 });
    expect(nudge(p, "ArrowUp", true)).toEqual({ x: 100, y: 136 });
    expect(nudge(p, "ArrowDown", true)).toEqual({ x: 100, y: 264 });
  });
  it("autre touche (Début compris, traité par l'appelant) : null", () => {
    for (const k of ["Home", "a", "Enter", "constructor"]) expect(nudge({ x: 0, y: 0 }, k, false), k).toBeNull();
  });
});

describe("island-place : panneau des profils et onglets (design-l2 L2-16, L2-30 c)", () => {
  it("design-l2 L2-16 : 1024, panneau de 600 : voie sous la rangée du haut dans les 424 px libres", () => {
    expect(sheetLane({ w: 1024, h: 768 }, 600, 56, 48)).toEqual({ x: 16, y: 80, maxWidth: 392 });
  });
  it("design-l2 L2-16, H13 : place plus étroite que 2 × 16 + 3 boutons : null (les îlots restent sous le panneau)", () => {
    expect(sheetLane({ w: 560, h: 700 }, 600, 56, 48)).toBeNull();
    expect(sheetLane({ w: 775, h: 700 }, 600, 56, 48)).toBeNull();
    expect(sheetLane({ w: 776, h: 700 }, 600, 56, 48)).toEqual({ x: 16, y: 80, maxWidth: 144 });
  });
  it("design-l2 L2-30 (c) : onglets jusqu'à l'îlot d'outils de la rangée du haut", () => {
    expect(tabsWidth(MID, 80, 108, { x: 255, y: 16 })).toBe(255 - 8 - 80);
  });
  it("design-l2 L2-30 (c) : outils descendus ou absents : jusqu'au groupe haut-droite ; jamais moins de 144", () => {
    expect(tabsWidth(MID, 80, 108, { x: 127, y: 80 })).toBe(1280 - 16 - 108 - 8 - 80);
    expect(tabsWidth(MID, 80, 108, null)).toBe(1280 - 16 - 108 - 8 - 80);
    expect(tabsWidth({ w: 300, h: 700 }, 80, 108, null)).toBe(144);
  });
});
```

- [ ] **Étape 2 : les voir rouges**

```bash
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/island-place.test.ts 2>&1 | tail -15
```
Attendu : `FAIL` (module `./island-place` introuvable).

- [ ] **Étape 3 : le module** — créer `apps/web/src/ui/island-place.ts` :

```ts
import { placeWithin } from "../app/table-picker";
import type { ButtonSize } from "../toolbar";

/**
 * Placement des îlots (design-l2, DA-L2-2) : pur, sans DOM, en px CSS entiers (L2-12 : jamais `translate(-50%)` ni
 * colonnes `1fr`). Les coins se posent en CSS (marges de 16 px) ; ce module décide la voie et la largeur maximale des
 * îlots centrés (L2-30), les bornes d'un îlot déplacé (L2-9, L2-11), le pas clavier (L2-10), la voie imposée par le
 * panneau des profils (L2-16) et la largeur des onglets (L2-30 c). `Island.tsx` mesure et appelle.
 */
export type Anchor = "top-start" | "top-center" | "top-end" | "bottom-start" | "bottom-center";
export interface Point { readonly x: number; readonly y: number }
export interface Box { readonly w: number; readonly h: number }
/** Rangée de l'ancre : largeur occupée à gauche (`start`) et à droite (`end`) par les groupes de coins, hauteur de la
 *  rangée des coins (`band`, 0 sans coin). En haut, `start` compte l'îlot des onglets à sa largeur minimale. */
export interface Corners { readonly start: number; readonly end: number; readonly band: number }
export interface Lane { readonly x: number; readonly y: number; readonly maxWidth: number }

/** Marge des coins et du bord (L2-12). */
export const EDGE = 16;
/** Écart entre deux îlots, et entre deux rangées. */
export const GAP = 8;
/** Largeur minimale de l'îlot des onglets (H8). */
export const TABS_MIN = 144;
/** Largeur du panneau des profils (`--rb-sheet-w` de rb.css, repli quand la variable est illisible). */
export const SHEET_W = 600;
/** Côté d'un bouton par taille (jetons --rb-btn-s|m|l de rb.css, D-DS3). */
export const BUTTON_PX: Readonly<Record<ButtonSize, number>> = Object.freeze({ s: 44, m: 48, l: 64 });

/** L2-5 : ancre d'une barre `floating` par rôle ; rôle inconnu : haut-droite après `panels` (H11). */
export const ISLAND_ANCHORS: Readonly<Record<string, Anchor>> = Object.freeze({
  menu: "top-start",
  tools: "top-center",
  panels: "top-end",
  history: "bottom-start",
  pages: "bottom-center",
});
const CENTERED: ReadonlySet<Anchor> = new Set<Anchor>(["top-center", "bottom-center"]);
const KEY_STEP: Readonly<Record<string, readonly [number, number]>> = Object.freeze({
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
});
const STEP = 16;
const BIG_STEP = 64;

export function anchorOf(role: string): Anchor {
  return Object.hasOwn(ISLAND_ANCHORS, role) ? ISLAND_ANCHORS[role]! : "top-end";
}

export function isCentered(anchor: Anchor): boolean {
  return CENTERED.has(anchor);
}

const isTop = (anchor: Anchor): boolean => anchor.startsWith("top");

/**
 * Voie d'un îlot (L2-30). Centré : sur la rangée de ses coins si la place centrée et symétrique entre les groupes de
 * coins le contient entier (largeur maximale = cette place) ; sinon dans la voie suivante, sous la rangée du haut ou
 * au-dessus de la rangée du bas, toute la largeur moins 2 × 16. Coin : sa position de coin, largeur moins 2 × 16.
 */
export function laneOf(anchor: Anchor, size: Box, area: Box, corners: Corners): Lane {
  const full = Math.max(0, area.w - 2 * EDGE);
  const top = isTop(anchor);
  if (isCentered(anchor)) {
    const sym = area.w - 2 * (EDGE + Math.max(corners.start, corners.end) + GAP);
    if (size.w <= sym) {
      return { x: Math.round((area.w - size.w) / 2), y: Math.max(0, top ? EDGE : area.h - EDGE - size.h), maxWidth: sym };
    }
    const w = Math.min(size.w, full);
    const y = top ? EDGE + corners.band + GAP : area.h - EDGE - corners.band - GAP - size.h;
    return { x: Math.round((area.w - w) / 2), y: Math.max(0, Math.round(y)), maxWidth: full };
  }
  const w = Math.min(size.w, full);
  const x = anchor === "top-end" ? area.w - EDGE - w : EDGE;
  return { x: Math.round(x), y: Math.max(0, Math.round(top ? EDGE : area.h - EDGE - size.h)), maxWidth: full };
}

/** Position affichée (L2-9, L2-11) : sans position enregistrée, celle de la voie ; sinon la position, l'îlot entier
 *  dans la case (`placeWithin`), arrondie ; jamais réécrite ici. */
export function placeIsland(anchor: Anchor, size: Box, area: Box, at: Point | null, corners: Corners): Point {
  if (at === null) {
    const l = laneOf(anchor, size, area, corners);
    return { x: l.x, y: l.y };
  }
  const w = Math.min(size.w, Math.max(0, area.w - 2 * EDGE));
  const p = placeWithin(at, { w, h: size.h }, area);
  return { x: Math.round(p.x), y: Math.round(p.y) };
}

/** L2-10 : flèches de 16 px, 64 avec Maj ; toute autre touche (Début compris, que l'appelant traite) : null. */
export function nudge(at: Point, key: string, big: boolean): Point | null {
  if (!Object.hasOwn(KEY_STEP, key)) return null;
  const [dx, dy] = KEY_STEP[key]!;
  const step = big ? BIG_STEP : STEP;
  return { x: at.x + dx * step, y: at.y + dy * step };
}

/** L2-16 : panneau des profils ouvert, voie de l'îlot d'outils dans la place à sa gauche, sous la rangée du haut ;
 *  null si cette place est plus étroite que 2 × 16 + 3 boutons (H13 : les îlots restent sous le panneau). */
export function sheetLane(area: Box, sheet: number, band: number, btn: number): Lane | null {
  const free = area.w - Math.min(sheet, area.w);
  if (free < 2 * EDGE + 3 * btn) return null;
  return { x: EDGE, y: EDGE + band + GAP, maxWidth: free - 2 * EDGE };
}

/** L2-30 (c) : largeur de l'îlot des onglets posé à `startX` : jusqu'à l'îlot d'outils s'il est sur la rangée du haut
 *  (non déplacé : `tools` non nul), sinon jusqu'au groupe haut-droite (`end`) ; au moins 144 px. */
export function tabsWidth(area: Box, startX: number, end: number, tools: Point | null): number {
  const right = tools !== null && tools.y === EDGE && tools.x > startX ? tools.x - GAP : area.w - EDGE - end - (end > 0 ? GAP : 0);
  return Math.max(TABS_MIN, Math.floor(right - startX));
}
```

- [ ] **Étape 4 : les voir verts**

```bash
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/island-place.test.ts 2>&1 | tail -15
```
Attendu : `Tests  N passed` (N ≥ 20), aucun `FAIL `.

- [ ] **Étape 5 : tests rouges du réglage d'appareil** — ajouter à `apps/web/src/device-settings.test.ts` (importer
  `NO_ISLAND`, `islandKey` de `./device-settings` ; réutiliser l'aide de `kv` en mémoire du fichier si elle existe, sinon
  celle-ci) :

```ts
describe("device-settings : îlots (design-l2 L2-7, DA-L2-3)", () => {
  const memoryKv = () => {
    const m = new Map<string, string>();
    return { m, kv: { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } };
  };
  it("design-l2 L2-7 : clé roomboard.ilot.<profil>.<barre> ; rien d'enregistré : NO_ISLAND", () => {
    expect(islandKey("defaut", "outils")).toBe("roomboard.ilot.defaut.outils");
    expect(createDeviceSettings(memoryKv().kv).island("defaut", "outils")).toEqual({ at: null, collapsed: null });
    expect(NO_ISLAND).toEqual({ at: null, collapsed: null });
  });
  it("design-l2 L2-7 : position et repli écrits en JSON entier, relus par un autre réglage (rechargement)", () => {
    const { m, kv } = memoryKv();
    expect(createDeviceSettings(kv).setIsland("defaut", "outils", { at: { x: 40.6, y: 200 }, collapsed: true })).toBe(true);
    expect(m.get("roomboard.ilot.defaut.outils")).toBe('{"x":41,"y":200,"collapsed":true}');
    expect(createDeviceSettings(kv).island("defaut", "outils")).toEqual({ at: { x: 41, y: 200 }, collapsed: true });
  });
  it("design-l2 L2-7 : champs facultatifs ; rien à garder : clé retirée", () => {
    const { m, kv } = memoryKv();
    const d = createDeviceSettings(kv);
    d.setIsland("defaut", "outils", { at: null, collapsed: false });
    expect(m.get("roomboard.ilot.defaut.outils")).toBe('{"collapsed":false}');
    d.setIsland("defaut", "outils", { at: null, collapsed: null });
    expect(m.has("roomboard.ilot.defaut.outils")).toBe(false);
    expect(d.island("defaut", "outils")).toEqual({ at: null, collapsed: null });
  });
  it("design-l2 L2-7 : valeur illisible ou partielle : absente, champ par champ, sans exception", () => {
    const { m, kv } = memoryKv();
    const read = (v: string) => {
      m.set("roomboard.ilot.p.b", v);
      return createDeviceSettings(kv).island("p", "b");
    };
    expect(read("{oops")).toEqual({ at: null, collapsed: null });
    expect(read("[1,2]")).toEqual({ at: null, collapsed: null });
    expect(read('"texte"')).toEqual({ at: null, collapsed: null });
    expect(read('{"x":1}')).toEqual({ at: null, collapsed: null });
    expect(read('{"x":"1","y":2,"collapsed":"oui"}')).toEqual({ at: null, collapsed: null });
    expect(read('{"collapsed":true}')).toEqual({ at: null, collapsed: true });
    expect(read('{"x":3.4,"y":-2.6}')).toEqual({ at: { x: 3, y: -3 }, collapsed: null });
  });
  it("design-l2 L2-7 : par profil et par barre", () => {
    const { kv } = memoryKv();
    const d = createDeviceSettings(kv);
    d.setIsland("defaut", "outils", { at: { x: 1, y: 2 }, collapsed: null });
    expect(d.island("simple", "outils")).toEqual({ at: null, collapsed: null });
    expect(d.island("defaut", "pages")).toEqual({ at: null, collapsed: null });
  });
  it("design-l2 L2-7 : sans stockage : mémoire seule, setIsland rend faux", () => {
    const d = createDeviceSettings(null);
    expect(d.setIsland("defaut", "outils", { at: { x: 5, y: 6 }, collapsed: true })).toBe(false);
    expect(d.island("defaut", "outils")).toEqual({ at: { x: 5, y: 6 }, collapsed: true });
  });
  it("design-l2 L2-7 : stockage qui refuse l'écriture ou la lecture : faux, mémoire gardée, aucune exception", () => {
    const boom = () => {
      throw new Error("quota");
    };
    const d = createDeviceSettings({ getItem: boom, setItem: boom, removeItem: boom });
    expect(d.island("defaut", "outils")).toEqual({ at: null, collapsed: null });
    expect(d.setIsland("defaut", "outils", { at: { x: 1, y: 1 }, collapsed: null })).toBe(false);
    expect(d.island("defaut", "outils")).toEqual({ at: { x: 1, y: 1 }, collapsed: null });
  });
  it("design-l2 : onChange inchangé : setIsland ne le déclenche pas, le cadre si", () => {
    const d = createDeviceSettings(null);
    let n = 0;
    d.onChange(() => n++);
    d.setIsland("defaut", "outils", { at: { x: 1, y: 1 }, collapsed: null });
    expect(n).toBe(0);
    d.setFrame(false);
    expect(n).toBe(1);
  });
});
```

- [ ] **Étape 6 : les voir rouges**

```bash
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/device-settings.test.ts 2>&1 | tail -15
```
Attendu : `FAIL` (`islandKey` absent).

- [ ] **Étape 7 : `device-settings.ts`** — après `const FRAME_HIDDEN = "non";` :

```ts
/** design-l2 (L2-7, DA-L2-3) : position et repli d'un îlot, par profil et par barre, sur le poste ; jamais dans le
 *  profil (format `.rbprofile` inchangé). Valeur : JSON `{ "x", "y", "collapsed" }`, champs facultatifs. */
export const ISLAND_KEY_PREFIX = "roomboard.ilot.";
export const islandKey = (profileId: string, barId: string): string => `${ISLAND_KEY_PREFIX}${profileId}.${barId}`;

/** `at` null : aucune position (îlot dans sa voie) ; `collapsed` null : état de départ du profil. */
export interface IslandState {
  readonly at: { readonly x: number; readonly y: number } | null;
  readonly collapsed: boolean | null;
}
export const NO_ISLAND: IslandState = Object.freeze({ at: null, collapsed: null });

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Lecture champ par champ ; tout ce qui est illisible est absent (L2-7). */
function parseIsland(raw: string | null): IslandState {
  if (raw === null) return NO_ISLAND;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return NO_ISLAND;
  }
  if (typeof v !== "object" || v === null || Array.isArray(v)) return NO_ISLAND;
  const o = v as Record<string, unknown>;
  const x = o["x"];
  const y = o["y"];
  const c = o["collapsed"];
  const at = finite(x) && finite(y) ? { x: Math.round(x), y: Math.round(y) } : null;
  const collapsed = typeof c === "boolean" ? c : null;
  return at === null && collapsed === null ? NO_ISLAND : { at, collapsed };
}

/** JSON à écrire, px entiers ; null : rien à garder (clé retirée). */
function islandText(s: IslandState): string | null {
  if (s.at === null && s.collapsed === null) return null;
  return JSON.stringify({
    ...(s.at !== null ? { x: Math.round(s.at.x), y: Math.round(s.at.y) } : {}),
    ...(s.collapsed !== null ? { collapsed: s.collapsed } : {}),
  });
}
```

Dans `interface DeviceSettings`, avant `onChange` :

```ts
  /** design-l2 (L2-7) : position et repli de l'îlot `barId` du profil `profileId` ; illisible : NO_ISLAND. */
  island(profileId: string, barId: string): IslandState;
  /** Vrai si gardé sur l'appareil ; faux : mémoire seule. Ne déclenche pas `onChange`. */
  setIsland(profileId: string, barId: string, s: IslandState): boolean;
```

Dans `createDeviceSettings`, après `const listeners = …` : `const islands = new Map<string, IslandState>();`, et dans
l'objet rendu, avant `onChange(cb)` :

```ts
    island(profileId, barId) {
      const key = islandKey(profileId, barId);
      const mem = islands.get(key);
      if (mem !== undefined) return mem;
      try {
        return parseIsland(kv?.getItem(key) ?? null);
      } catch {
        return NO_ISLAND;
      }
    },
    setIsland(profileId, barId, s) {
      const key = islandKey(profileId, barId);
      const text = islandText(s);
      islands.set(key, parseIsland(text));
      if (kv === null) return false;
      try {
        if (text === null) kv.removeItem(key);
        else kv.setItem(key, text);
        return true;
      } catch {
        return false;
      }
    },
```

- [ ] **Étape 8 : verts, types**

```bash
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/island-place.test.ts src/device-settings.test.ts --reporter=verbose 2>&1 | tail -45
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20; echo "tsc code ${PIPESTATUS[0]}"
```
Attendu : `Test Files  2 passed (2)`, N ≥ 20, `tsc code 0`. Les tests d'avant de `device-settings.test.ts` (cadre)
restent verts sans retouche.

- [ ] **Étape 9 : commit**

```bash
cd "$W" && git add apps/web/src/ui/island-place.ts apps/web/src/ui/island-place.test.ts apps/web/src/device-settings.ts apps/web/src/device-settings.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -F - <<'MSG'
feat(design-l2): pure island placement and per-device island state

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

### Tâche T3 — Icônes `menu` et `collapse` ; rendu du rôle `menu`

<a id="tache-t3"></a>

**Objectif.** Ajouter les icônes `menu` (Lucide `menu`) et `collapse` (Lucide `chevron-up`), recopiées des symboles
`i-menu` et `i-collapse` de la maquette 01, avec leur mention de licence (L2-22). Créer `ui/MenuBar.tsx`, le rendu du
rôle `menu` : un bouton Menu et une liste `role="menu"` qui reste dans le DOM (`hidden` fermée), lignes de 48 px icône +
libellé, clavier complet, touches du moteur gardées (L2-6).

**Fichiers.**
- Modifier : `apps/web/src/ui/icons.ts:85-88` (ajout après `drop`), `THIRD_PARTY_NOTICES.md:511-530`
- Créer : `apps/web/src/ui/MenuBar.tsx`, `apps/web/src/ui/MenuBar.test.tsx`
- Test : `apps/web/src/ui/icons.test.ts` (compte, liste `used`, test neuf)

**Interfaces.**
- Consomme : rien d'une autre tâche (le rôle `menu` est une chaîne ; `MENU_ROLE` de T1 n'est pas importé ici).
- Produit (`apps/web/src/ui/MenuBar.tsx`) :
  ```ts
  export const MENU_LABEL = "Menu";
  export interface MenuBarProps {
    readonly bar: Toolbar;                       // de ../toolbar
    readonly items: Accessor<readonly ToolItem[]>; // éléments déjà filtrés (itemsForMode, par App en T6)
    readonly view: Accessor<ToolbarView>;
    readonly size: Accessor<ButtonSize>;
    readonly host: Pick<ToolbarHost, "setTool" | "runAction">;
  }
  export function MenuBar(props: MenuBarProps): JSX.Element;
  ```
  DOM : `div.rb-bar.rb-menu[data-toolbar][data-role][data-dock][data-size][role="toolbar"][aria-label="Menu"]` >
  `button.rb-ib[data-menu-toggle][aria-haspopup="menu"][aria-expanded]` + `div[role="menu"][data-menu-list][hidden]` >
  `button[role="menuitem"][data-item]` (icône + `<span>` libellé) et `span.rb-menu-sep[role="separator"]`.
- Produit (`icons.ts`) : clés `"menu"` et `"collapse"` de `ICONS` (Déplier = `"down"` existant).
- Réutilise : `apps/web/src/ui/icons.ts` — table `ICONS` étendue de `menu` et `collapse` (ligne « icônes `menu`,
  `collapse` » du cadrage).
- Réutilise : `apps/web/src/ui/item-state.ts` et `apps/web/src/ui/icons.ts` — `itemState(item, view)` (état grisé et
  libellé d'une ligne) et `iconFor(item, icon)` (icône d'une ligne), comme `Toolbar.tsx:58-71` (ligne « état et icône
  d'un élément du menu »).
- Réutilise : `apps/web/src/ui/IconButton.tsx` — `Icon`, `TipBubble`, `tipPointerHandlers` pour le bouton Menu (ligne
  « poignée, Replier, bouton Menu » ; `IconButton` lui-même ne prend ni `ref` ni `aria-expanded` réactif).

**Test et commande bornée.**
```bash
W=/home/adminjd/projets/roomboard-wt/design-l2--T3
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/icons.test.ts src/ui/MenuBar.test.tsx src/ui/Toolbar.test.tsx --reporter=verbose 2>&1 | tail -40
```
Preuve : `Test Files  3 passed (3)`, aucun `FAIL ` ; `60 icônes` présent ; ≥ 9 tests `design-l2 L2-6` ; la garde de
`Toolbar.test.tsx:149` (aucun `switch`, `px`, `localStorage`, glisser HTML5 dans `src/ui`) passe sur `MenuBar.tsx`.

**Preuve visuelle.** Aucune ici (rendu branché en T6, joué en T8 S2).

**Contraintes (recopiées).**
- G1 — TDD : test rouge vu d'abord. Chaque tâche met à jour dans son commit tous les tests qu'elle fait rougir et finit
  verte seule ; deux tâches d'une même vague ne touchent jamais le même fichier.
- G3 — Aucun test supprimé, désactivé ou sauté ; aucun seuil changé (le compte d'icônes passe de 58 à 60 parce que deux
  icônes s'ajoutent, ce n'est pas un seuil).
- G4 — Icônes : tracés Lucide (ISC) copiés dans `apps/web/src/ui/icons.ts` avec mention de licence existante
  (`THIRD_PARTY_NOTICES.md` § Lucide) ; aucune dépendance ajoutée ; trait 1,5 ; une icône sans équivalent Lucide est
  dessinée dans le même style.
- G6 — La CLI et le Wasm ne changent pas.
- G7 — VM partagée : `nice -n 10` ; un fichier isolé ou `tsc` sans suite-vm ; un test qui échoue sur un délai se rejoue
  une fois.
- G8 — Interdits : `git push --force`, `git add -A|.`, `git commit -a`, `git tag`, `gh release`, `rm -rf` d'un worktree,
  `tauri build`. Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un ; aucun push.
- G10 — `MenuBar.tsx` : aucun `switch (`, `localStorage`, `draggable`, `dragstart`, aucun `\d+px` (même en commentaire),
  aucun `innerHTML` ; rendu par sorte d'élément dans une table.
- G11 — Worktree `/home/adminjd/projets/roomboard-wt/design-l2--T3` ; temporaires dans `$HOME/.cache/tmp/of68-tmp/T3-*`.

**Interdits.** Toucher `IconButton.tsx`, `ProfileMenu.tsx`, `app/table-picker.ts`, `Toolbar.tsx`, `App.tsx`, `rb.css`
(les styles du menu viennent en T6) ; retirer la liste du DOM quand elle est fermée (les clics de `App.test.tsx` restent
directs) ; laisser remonter Échap, Espace, Retour arrière, Suppr sans Ctrl ni Méta.

**Terminé quand.** Les trois fichiers de la commande passent ; `tsc` code 0 ; un commit ; rapport avec
`Réutilisation : appelé icons.ts (ICONS, iconFor), item-state.ts (itemState), IconButton.tsx (Icon, TipBubble, tipPointerHandlers)`
ou `Réutilisation : écart — …`.

#### Étapes

- [ ] **Étape 0 : préparer le worktree**

```bash
W=/home/adminjd/projets/roomboard-wt/design-l2--T3
cd "$W" && mkdir -p "$HOME/.cache/tmp/of68-tmp"
test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile --prefer-offline 2>&1 | tail -3
for d in wasm wasm-formats; do test -d "apps/web/src/$d" || cp -r "/home/adminjd/projets/roomboard-wt/design-l2/apps/web/src/$d" apps/web/src/; done
```

- [ ] **Étape 1 : tests rouges des icônes (`icons.test.ts`)** — après `PANEL_ICONS` :

```ts
/** design-l2 (L2-22) : icônes de la maquette 01 propres aux îlots, nom RoomBoard -> nom Lucide. */
const ISLAND_ICONS: Readonly<Record<string, string>> = { menu: "menu", collapse: "chevron-up" };
```
Le premier test devient (titre et compte) :
```ts
  it("ICONS : 60 icônes, exactement celles qu'attribuent les tables, les états, la zone de dépôt, le bandeau, le panneau des profils et les îlots", () => {
    const used = new Set([...Object.values(TOOL_ICONS), ...Object.values(ACTION_ICONS), "pen-line", "reset", "check", "drop", ...Object.keys(PANEL_ICONS), ...Object.keys(ISLAND_ICONS)]);
    expect(Object.keys(ICONS).sort()).toEqual([...used].sort());
    expect(Object.keys(ICONS)).toHaveLength(60);
  });
```
Et un test neuf dans le même `describe` :
```ts
  it("design-l2 L2-22 : menu et collapse recopiées à l'identique de 01-tableau.html (Lucide menu, chevron-up), nommées dans la notice", () => {
    for (const name of Object.keys(ISLAND_ICONS)) expect(ICONS[name], name).toEqual(symbol(name));
    for (const [name, lucide] of Object.entries(ISLAND_ICONS)) expect(NOTICE, name).toContain(`\`${name}\` (Lucide \`${lucide}\`)`);
  });
```

- [ ] **Étape 2 : les voir rouges**

```bash
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/icons.test.ts 2>&1 | tail -15
```
Attendu : `FAIL` (58 au lieu de 60 ; `ICONS["menu"]` indéfini).

- [ ] **Étape 3 : icônes et notice** — dans `ICONS`, après l'entrée `"drop"` :

```ts
  // design-l2 : maquette 01 (symboles i-menu et i-collapse de 01-tableau.html ; Lucide menu et chevron-up,
  // lucide-icons/lucide@7981a0798a), bouton Menu et Replier de la barre d'outils ; Déplier reprend `down`.
  "menu": [["path", { d: "M4 5h16" }], ["path", { d: "M4 12h16" }], ["path", { d: "M4 19h16" }]],
  "collapse": [["path", { d: "m18 15-6-6-6 6" }]],
```
Dans `THIRD_PARTY_NOTICES.md`, le titre `## Icônes Lucide (ISC), design L1, L3 et L4` devient
`## Icônes Lucide (ISC), design L1, L2, L3 et L4`, et après la puce de la maquette 03 :
```markdown
- Reprises de la maquette `docs/design/maquettes/01-tableau.html` (design L2, tracés Lucide au même commit), noms
  RoomBoard : `menu` (Lucide `menu`), `collapse` (Lucide `chevron-up`).
```

- [ ] **Étape 4 : les voir verts**

```bash
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/icons.test.ts 2>&1 | tail -15
```
Attendu : `Tests  N passed`, aucun `FAIL `.

- [ ] **Étape 5 : tests rouges du menu** — créer `apps/web/src/ui/MenuBar.test.tsx` :

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Toolbar as Bar, ToolItem } from "../toolbar";
import type { ToolbarView } from "./item-state";
import { MENU_LABEL, MenuBar } from "./MenuBar";

afterEach(cleanup);

const action = (id: string, label: string): ToolItem => ({ id, kind: "action", action: id, label, requires: [], rest: {} });
const ITEMS: readonly ToolItem[] = [
  action("file-new", "Nouveau"),
  action("undo", "Annuler"), // grisé : canUndo faux
  { id: "sep-x", kind: "separator", label: "", requires: [], rest: {} },
  action("grid", "Grille"),
  { id: "zone", kind: "dropzone", label: "Déposer ici", requires: [], rest: {} },
  { id: "rect", kind: "tool", tool: "rect", label: "Rectangle", requires: [], rest: {} },
];
const VIEW: ToolbarView = { tool: "pen", eraserMode: "partial", canUndo: false, canRedo: false, pageIndex: 0, pageCount: 1 };
const bar = (dock: Bar["dock"] = "floating"): Bar => ({ id: "menu", role: "menu", dock, collapsed: false, groups: [], rest: {} });

function setup(dock: Bar["dock"] = "floating") {
  const host = { setTool: vi.fn(), runAction: vi.fn() };
  const r = render(() => <MenuBar bar={bar(dock)} items={() => ITEMS} view={() => VIEW} size={() => "m"} host={host} />);
  const toggle = (): HTMLButtonElement => r.container.querySelector<HTMLButtonElement>("[data-menu-toggle]")!;
  const list = (): HTMLElement => r.container.querySelector<HTMLElement>("[data-menu-list]")!;
  const row = (id: string): HTMLButtonElement => list().querySelector<HTMLButtonElement>(`[data-item="${id}"]`)!;
  return { ...r, host, toggle, list, row };
}
const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
const focused = (): string | null => document.activeElement?.getAttribute("data-item") ?? null;
const key = (k: string, more: KeyboardEventInit = {}): boolean => fireEvent.keyDown(document.activeElement!, { key: k, ...more });

describe("MenuBar (design-l2 L2-6)", () => {
  it("design-l2 L2-6 : bouton Menu (icône menu, aria-haspopup, aria-expanded faux) ; liste fermée, présente dans le DOM", () => {
    const { container, toggle, list } = setup();
    expect(toggle().getAttribute("aria-haspopup")).toBe("menu");
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(toggle().getAttribute("aria-label")).toBe(MENU_LABEL);
    expect(toggle().querySelector("svg")?.getAttribute("data-icon")).toBe("menu");
    expect(list().hidden).toBe(true);
    expect(list().getAttribute("role")).toBe("menu");
    expect([...list().querySelectorAll('button[role="menuitem"]')].map((b) => b.getAttribute("data-item"))).toEqual(["file-new", "undo", "grid", "rect"]);
    const root = container.querySelector('[data-toolbar="menu"]')!;
    expect([root.getAttribute("data-role"), root.getAttribute("data-dock"), root.getAttribute("data-size")]).toEqual(["menu", "floating", "m"]);
  });

  it("design-l2 L2-6 : lignes à icône et libellé ; séparateur en filet ; zone de dépôt non rendue ; état par itemState", () => {
    const { list, row } = setup();
    expect(row("file-new").querySelector("svg")?.getAttribute("data-icon")).toBe("file-new");
    expect(row("file-new").textContent).toBe("Nouveau");
    expect(row("rect").querySelector("svg")?.getAttribute("data-icon")).toBe("rect");
    expect(row("undo").disabled).toBe(true);
    expect(list().querySelectorAll('.rb-menu-sep[role="separator"]')).toHaveLength(1);
    expect(list().querySelector('[data-item="zone"]')).toBeNull();
  });

  it("design-l2 L2-6 : ouvrir : aria-expanded vrai, liste visible, focus sur la première ligne active", async () => {
    const { toggle, list } = setup();
    fireEvent.click(toggle());
    await tick();
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(list().hidden).toBe(false);
    expect(focused()).toBe("file-new");
  });

  it("design-l2 L2-6 : flèches bas et haut (bouclage, lignes grisées sautées), Début, Fin", async () => {
    const { toggle } = setup();
    fireEvent.click(toggle());
    await tick();
    key("ArrowDown");
    expect(focused()).toBe("grid");
    key("ArrowDown");
    expect(focused()).toBe("rect");
    key("ArrowDown");
    expect(focused()).toBe("file-new");
    key("ArrowUp");
    expect(focused()).toBe("rect");
    key("Home");
    expect(focused()).toBe("file-new");
    key("End");
    expect(focused()).toBe("rect");
  });

  it("design-l2 L2-6 : Échap ferme et rend le focus au bouton Menu", async () => {
    const { toggle, list } = setup();
    fireEvent.click(toggle());
    await tick();
    key("Escape");
    expect(list().hidden).toBe(true);
    expect(document.activeElement).toBe(toggle());
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
  });

  it("design-l2 L2-6 : touches du moteur gardées (Retour arrière, Suppr, Espace, Échap ne remontent pas à window) ; Ctrl+S remonte", async () => {
    const { toggle } = setup();
    const seen: string[] = [];
    const spy = (e: KeyboardEvent): void => void seen.push(`${e.ctrlKey ? "Ctrl+" : ""}${e.key}`);
    window.addEventListener("keydown", spy);
    try {
      fireEvent.click(toggle());
      await tick();
      for (const k of ["Backspace", "Delete", " "]) key(k);
      key("s", { ctrlKey: true });
      key("Escape");
      expect(seen).toEqual(["Ctrl+s"]);
    } finally {
      window.removeEventListener("keydown", spy);
    }
  });

  it("design-l2 L2-6 : choisir une action : runAction, menu fermé ; un outil : setTool", async () => {
    const { toggle, list, row, host } = setup();
    fireEvent.click(toggle());
    await tick();
    fireEvent.click(row("grid"));
    expect(host.runAction).toHaveBeenCalledWith("grid");
    expect(list().hidden).toBe(true);
    fireEvent.click(toggle());
    await tick();
    fireEvent.click(row("rect"));
    expect(host.setTool).toHaveBeenCalledWith("rect");
  });

  it("design-l2 L2-6 : un appui hors du menu le ferme ; un appui dedans, non", async () => {
    const { toggle, list } = setup();
    fireEvent.click(toggle());
    await tick();
    fireEvent.pointerDown(list());
    expect(list().hidden).toBe(false);
    fireEvent.pointerDown(document.body);
    expect(list().hidden).toBe(true);
  });

  it("design-l2 L2-6 : un clic direct sur une ligne d'une liste fermée lance l'action (clics de App.test.tsx)", () => {
    const { row, host } = setup();
    fireEvent.click(row("file-new"));
    expect(host.runAction).toHaveBeenCalledWith("file-new");
  });

  it("design-l2 L2-6 : même rendu en bande", () => {
    const { toggle, list, container } = setup("top");
    expect(container.querySelector('[data-toolbar="menu"]')?.getAttribute("data-dock")).toBe("top");
    expect(toggle()).not.toBeNull();
    expect(list().querySelectorAll('button[role="menuitem"]')).toHaveLength(4);
  });
});
```

- [ ] **Étape 6 : les voir rouges**

```bash
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/MenuBar.test.tsx 2>&1 | tail -15
```
Attendu : `FAIL` (module `./MenuBar` introuvable).

- [ ] **Étape 7 : `MenuBar.tsx`**

```tsx
import { For, Show, createEffect, createMemo, createSignal, on, onCleanup, type Accessor, type JSX } from "solid-js";
import type { ToolbarHost } from "../app/toolbar-host";
import type { ButtonSize, Toolbar as Bar, ToolItem } from "../toolbar";
import { Icon, TipBubble, tipPointerHandlers } from "./IconButton";
import { iconFor } from "./icons";
import { itemState, type ToolbarView } from "./item-state";
import { createTip } from "./tooltip";

/**
 * Rôle `menu` (design-l2, L2-6, D-DS1) : un bouton Menu ; la liste s'ouvre sous lui, lignes de 48 px icône + libellé,
 * `button[role="menuitem"][data-item]` (état et libellé par `itemState`). La liste reste dans le DOM, `hidden` quand
 * elle est fermée. Clavier : focus sur la première ligne à l'ouverture, flèches (bouclage), Début, Fin, Entrée ou
 * Espace (bouton natif), Échap rend le focus au bouton. Même rendu en bande. Styles : `[data-menu-list]` dans rb.css.
 */
export const MENU_LABEL = "Menu";

/** Touches que le moteur prend sans Ctrl ni Méta (même liste que `app/table-picker.ts:58`) : gardées par le menu. */
const ENGINE_KEYS: ReadonlySet<string> = new Set(["Backspace", "Delete", "Escape", " "]);
/** Rang de la ligne suivante par touche (table, jamais un branchement sur la touche). */
const STEP: Readonly<Record<string, (i: number, n: number) => number>> = {
  ArrowDown: (i, n) => (i + 1) % n,
  ArrowUp: (i, n) => (i - 1 + n) % n,
  Home: () => 0,
  End: (_i, n) => n - 1,
};

export interface MenuBarProps {
  readonly bar: Bar;
  /** Éléments montrés, déjà filtrés (`itemsForMode`) ; une zone de dépôt n'est pas rendue. */
  readonly items: Accessor<readonly ToolItem[]>;
  readonly view: Accessor<ToolbarView>;
  readonly size: Accessor<ButtonSize>;
  readonly host: Pick<ToolbarHost, "setTool" | "runAction">;
}

function Row(props: { item: ToolItem; view: Accessor<ToolbarView>; press: () => void }): JSX.Element {
  const st = createMemo(() => itemState(props.item, props.view()));
  const icon = (): string | null => iconFor(props.item, st().icon);
  return (
    <button type="button" role="menuitem" data-item={props.item.id} disabled={st().disabled} onClick={() => props.press()}>
      <Show when={icon()} fallback={<span class="rb-menu-blank" aria-hidden="true" />}>
        {(name) => <Icon name={name()} />}
      </Show>
      <span>{st().label}</span>
    </button>
  );
}

export function MenuBar(props: MenuBarProps): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const tip = createTip();
  let root: HTMLDivElement | undefined;
  let toggle: HTMLButtonElement | undefined;
  let list: HTMLDivElement | undefined;
  const rows = (): HTMLButtonElement[] => [...(list?.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)') ?? [])];
  const close = (refocus: boolean): void => {
    setOpen(false);
    if (refocus) toggle?.focus();
  };
  const show = (): void => {
    setOpen(true);
    queueMicrotask(() => rows()[0]?.focus());
  };
  // Fermé par un appui hors de lui ; écoute posée à l'ouverture, retirée à la fermeture et au démontage.
  const outside = (e: PointerEvent): void => {
    if (root !== undefined && !root.contains(e.target as Node)) close(false);
  };
  createEffect(
    on(open, (o) => {
      if (!o) return;
      const doc = root?.ownerDocument ?? document;
      doc.addEventListener("pointerdown", outside, true);
      onCleanup(() => doc.removeEventListener("pointerdown", outside, true));
    }),
  );
  const onKey = (e: KeyboardEvent): void => {
    // Comme la grille du tableau (table-picker.ts:110-118) : les touches du moteur restent au menu ; Ctrl/Méta remontent.
    if (!e.ctrlKey && !e.metaKey && ENGINE_KEYS.has(e.key)) e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      close(true);
      return;
    }
    if (!Object.hasOwn(STEP, e.key)) return;
    e.preventDefault();
    const all = rows();
    if (all.length === 0) return;
    const i = all.indexOf(document.activeElement as HTMLButtonElement);
    all[STEP[e.key]!(Math.max(i, 0), all.length)]?.focus();
  };
  const choose = (run: () => void) => (): void => {
    close(false);
    run();
  };
  /** Rendu par sorte d'élément (table) ; zone de dépôt : rien. */
  const RENDER: Readonly<Record<ToolItem["kind"], (it: ToolItem) => JSX.Element>> = {
    tool: (it) => {
      const preset = typeof it.options?.preset === "string" ? it.options.preset : undefined;
      return <Row item={it} view={props.view} press={choose(() => (preset === undefined ? props.host.setTool(it.tool ?? "") : props.host.setTool(it.tool ?? "", preset)))} />;
    },
    action: (it) => <Row item={it} view={props.view} press={choose(() => props.host.runAction(it.action ?? ""))} />,
    separator: () => <span class="rb-menu-sep" role="separator" />,
    dropzone: () => null,
  };
  const handlers = tipPointerHandlers(tip);
  return (
    <div
      ref={root}
      class="rb-bar rb-menu"
      data-toolbar={props.bar.id}
      data-role={props.bar.role}
      data-dock={props.bar.dock}
      data-size={props.size()}
      role="toolbar"
      aria-label={MENU_LABEL}
    >
      <button
        ref={toggle}
        type="button"
        class="rb-ib"
        data-menu-toggle
        aria-haspopup="menu"
        aria-expanded={open()}
        aria-label={MENU_LABEL}
        onClick={() => (open() ? close(false) : show())}
        onPointerEnter={handlers.onPointerEnter}
        onPointerLeave={handlers.onPointerLeave}
        onPointerDown={handlers.onPointerDown}
        onPointerUp={handlers.onPointerUp}
        onPointerCancel={handlers.onPointerCancel}
        onFocus={() => tip.focus()}
        onBlur={() => tip.blur(document.hasFocus())}
      >
        <Icon name="menu" />
        <span class="rb-sr">{MENU_LABEL}</span>
      </button>
      <TipBubble tip={tip} label={MENU_LABEL} anchor={() => toggle!} />
      <div ref={list} role="menu" aria-label={MENU_LABEL} data-menu-list hidden={!open()} onKeyDown={onKey}>
        <For each={props.items()}>{(it) => RENDER[it.kind](it)}</For>
      </div>
    </div>
  );
}
```

- [ ] **Étape 8 : verts, garde de source, types**

```bash
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/icons.test.ts src/ui/MenuBar.test.tsx src/ui/Toolbar.test.tsx --reporter=verbose 2>&1 | tail -40
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20; echo "tsc code ${PIPESTATUS[0]}"
```
Attendu : `Test Files  3 passed (3)`, `tsc code 0`. Si le test des touches du moteur rougit parce que l'arrêt de la
propagation dans le gestionnaire délégué de Solid n'empêche pas `window` de recevoir la touche, poser l'écoute du
clavier sur la liste par `addEventListener("keydown", onKey)` dans un `onMount` (patron de `table-picker.ts:110`) au
lieu de `onKeyDown`, et le noter au rapport.

- [ ] **Étape 9 : commit**

```bash
cd "$W" && git add apps/web/src/ui/icons.ts apps/web/src/ui/icons.test.ts THIRD_PARTY_NOTICES.md apps/web/src/ui/MenuBar.tsx apps/web/src/ui/MenuBar.test.tsx
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -F - <<'MSG'
feat(design-l2): menu and collapse icons, MenuBar for the menu role

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

### Tâche T4 — Onglets et barre des pages à icônes

<a id="tache-t4"></a>

**Objectif.** Onglets de l'îlot (L2-17) : Fermer = icône `close`, Nouvel onglet = icône `plus`, point « modifié » vide
(stylé en T6) avant le titre, titre dans `.rb-tab-title` ; attributs et noms accessibles inchangés. Barre des pages
(L2-18) : chaque bouton en `IconButton` (icône de L1, libellé complet en nom accessible, `.rb-sr` et infobulle),
`SHORT` retiré, compteur `#pages` entre Précédente et Suivante quand elles se suivent.

**Fichiers.**
- Modifier : `apps/web/src/ui/TabsBar.tsx:38-78`, `apps/web/src/ui/PagesBar.tsx:1-73`
- Tests : `apps/web/src/ui/TabsBar.test.tsx`, `apps/web/src/ui/PagesBar.test.tsx:152-166` (réécrit), ajouts ;
  `apps/web/src/ui/App.test.tsx` si une rougeur vient des pages ou des onglets

**Interfaces.**
- Consomme : profils de T1 (`defaut` : barre des pages de quatre actions ; `simple` : huit).
- Produit : `export function counterAfter(items: readonly ToolItem[]): string | null` (id de l'élément après lequel
  poser `#pages` : `page-prev` suivi de `page-next` ; sinon null, compteur en fin) dans `PagesBar.tsx` ;
  `span.rb-tab-title` dans chaque onglet ; `.rb-tab-dirty` vide (`aria-hidden`).
- Réutilise : `apps/web/src/ui/IconButton.tsx` — `IconButton({ icon, label, disabled, attrs: { "data-item" }, onPress })`
  pour les boutons des pages, `Icon({ name })` pour Fermer et Nouvel onglet (comme la barre d'outils, L2-18).
- Réutilise : `apps/web/src/ui/icons.ts` — `iconFor(item)` (icônes `prev`, `next`, `plus`, `trash`, `file-import`,
  `pdf`, `export` de `ACTION_ICONS`).

**Test et commande bornée.**
```bash
W=/home/adminjd/projets/roomboard-wt/design-l2--T4
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/TabsBar.test.tsx src/ui/PagesBar.test.tsx src/ui/App.test.tsx --reporter=verbose 2>&1 | grep -E "design-l2|Test Files|Tests |FAIL" | tail -30
```
Preuve : `Test Files  3 passed (3)`, `design-l2 L2-17` et `design-l2 L2-18` présents, aucun `FAIL ` ; puis suite web
entière (étape 7) 0 `FAIL `.

**Preuve visuelle.** Aucune ici (styles en T6 ; recadrages `onglets` et `pages` en T8).

**Contraintes (recopiées).**
- G1 — TDD : test rouge vu d'abord. Chaque tâche met à jour dans son commit tous les tests qu'elle fait rougir et finit
  verte seule ; deux tâches d'une même vague ne touchent jamais le même fichier.
- G2 — Comportement inchangé hors de l'aspect (`data-tab`, `data-tab-close`, `data-tab-new`, `data-item`, `data-page`,
  `#pages`, noms accessibles) ; toute autre rougeur arrête la tâche : rapport, aucune retouche.
- G3 — Aucun test supprimé, désactivé ou sauté ; aucun seuil changé.
- G4 — Icônes de la table `ICONS` existante, aucune dépendance ajoutée.
- G7 — VM partagée : `nice -n 10` ; suite complète par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; un
  fichier isolé ou `tsc` s'en passe ; un test qui échoue sur un délai se rejoue une fois ; commande de plus de 2 min en
  tâche de fond, sans boucle d'attente.
- G8 — Interdits : `git push --force`, `git add -A|.`, `git commit -a`, `git tag`, `gh release`, `rm -rf` d'un worktree,
  `tauri build`. Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un ; aucun push.
- G10 — `TabsBar.tsx`, `PagesBar.tsx` : aucun `switch (`, `localStorage`, `draggable`, `dragstart`, `\d+px`, `innerHTML`.
- G11 — Worktree `/home/adminjd/projets/roomboard-wt/design-l2--T4` ; temporaires dans `$HOME/.cache/tmp/of68-tmp/T4-*`.

**Interdits.** Toucher `rb.css` (la règle `rb.css:50` des libellés courts part en T6 ; la laisser ne gêne rien ici),
`Island.tsx` (T5), `App.tsx` (T6) ; changer un attribut ou un nom accessible ; retirer la liste des numéros.

**Terminé quand.** Commande verte ; suite web entière 0 `FAIL ` ; `tsc` code 0 ; un commit ; rapport avec la liste
des tests retouchés et `Réutilisation : appelé IconButton.tsx (IconButton, Icon), icons.ts (iconFor)` ou `écart — …`.

#### Étapes

- [ ] **Étape 0 : préparer le worktree**

```bash
W=/home/adminjd/projets/roomboard-wt/design-l2--T4
cd "$W" && mkdir -p "$HOME/.cache/tmp/of68-tmp"
test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile --prefer-offline 2>&1 | tail -3
for d in wasm wasm-formats; do test -d "apps/web/src/$d" || cp -r "/home/adminjd/projets/roomboard-wt/design-l2/apps/web/src/$d" apps/web/src/; done
```

- [ ] **Étape 1 : tests rouges** — `TabsBar.test.tsx` : les deux lignes `:55` et `:57` (`textContent` contient « • »)
  deviennent :
```ts
    expect(tab(container, "b").querySelector(".rb-tab-dirty")).not.toBeNull();
    expect(tab(container, "a").querySelector(".rb-tab-dirty")).toBeNull();
```
  et en fin de fichier :
```tsx
describe("TabsBar (design-l2 L2-17)", () => {
  it("design-l2 L2-17 : Fermer = icône close (nom « Fermer <titre> »), Nouvel onglet = icône plus ; aucun caractère « × » ni « + »", () => {
    const { container } = setup();
    const close = container.querySelector('[data-tab-close="a"]')!;
    expect(close.querySelector("svg")?.getAttribute("data-icon")).toBe("close");
    expect(close.getAttribute("aria-label")).toBe("Fermer Plan");
    expect(close.textContent).toBe("");
    const add = container.querySelector("[data-tab-new]")!;
    expect(add.querySelector("svg")?.getAttribute("data-icon")).toBe("plus");
    expect(add.getAttribute("aria-label")).toBe("Nouvel onglet");
    expect(add.textContent).toBe("");
  });
  it("design-l2 L2-17 : point « modifié » avant le titre, titre dans .rb-tab-title", () => {
    const { container } = setup();
    const b = tab(container, "b");
    expect(b.firstElementChild?.classList.contains("rb-tab-dirty")).toBe(true);
    expect(b.querySelector(".rb-tab-title")?.textContent).toBe("Notes");
    expect(tab(container, "a").firstElementChild?.classList.contains("rb-tab-title")).toBe(true);
  });
});
```
  `PagesBar.test.tsx` : le test « C13 (D17) : libellé visible court… » (lignes 152-166) est remplacé par :
```tsx
  it("design-l2 L2-18 : boutons à icône ; textContent et aria-label = libellé complet ; plus de libellé court", () => {
    const full = { iwb: "Enregistrer une copie au format .iwb…", ubz: "Enregistrer une copie au format .ubz…" };
    const items = [{ ...item("export-iwb"), label: full.iwb }, { ...item("export-ubz"), label: full.ubz }, { ...item("export-pdf"), label: "Exporter en PDF…" }];
    const { container } = setup({ pageIndex: 0, pageCount: 3 }, items);
    const iwb = btn(container, "[data-item=export-iwb]");
    expect(iwb.textContent).toBe(full.iwb);
    expect(iwb.getAttribute("aria-label")).toBe(full.iwb);
    expect(iwb.classList.contains("rb-ib")).toBe(true);
    expect(iwb.querySelector("svg")?.getAttribute("data-icon")).toBe("export");
    expect(btn(container, "[data-item=export-pdf]").querySelector("svg")?.getAttribute("data-icon")).toBe("pdf");
    const css = readFileSync(join(__dirname, "rb.css"), "utf8");
    expect(css).toMatch(/\.rb-pages-list\s*\{[^}]*min-width:\s*calc\(3 \* var\(--rb-btn\)/);
    expect(readFileSync(join(__dirname, "PagesBar.tsx"), "utf8")).not.toMatch(/SHORT|Copie \.iwb/);
  });
```
  et en fin de fichier :
```tsx
describe("PagesBar (design-l2 L2-18)", () => {
  const kids = (c: HTMLElement): string[] => [...c.querySelector("nav")!.children].map((e) => e.getAttribute("data-item") || e.id || e.className);
  it("design-l2 L2-18 : compteur #pages entre Précédente et Suivante quand elles se suivent", () => {
    const { container } = setup({ pageIndex: 1, pageCount: 4 });
    expect(kids(container)).toEqual(["page-prev", "pages", "page-next", "page-add", "page-remove", "rb-pages-list"]);
    expect(container.querySelectorAll("#pages")).toHaveLength(1);
  });
  it("design-l2 L2-18 : Précédente et Suivante séparées ou absentes : compteur en fin de barre", () => {
    const { container } = setup({ pageIndex: 0, pageCount: 2 }, ["page-next", "page-prev", "page-add"].map(item));
    expect(kids(container).at(-1)).toBe("pages");
    expect(counterAfter(["page-add"].map(item))).toBeNull();
    expect(counterAfter(ORDER)).toBe("page-prev");
  });
  it("design-l2 L2-18 : chaque bouton porte l'icône de la table ; grisé selon itemState", () => {
    const { container } = setup({ pageIndex: 0, pageCount: 1 });
    expect(["page-prev", "page-next", "page-add", "page-remove"].map((id) => btn(container, `[data-item=${id}]`).querySelector("svg")?.getAttribute("data-icon"))).toEqual(["prev", "next", "plus", "trash"]);
    expect(btn(container, "[data-item=page-prev]").disabled).toBe(true);
  });
});
```
  (ajouter `counterAfter` à l'import de `./PagesBar`.)

- [ ] **Étape 2 : les voir rouges**

```bash
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/TabsBar.test.tsx src/ui/PagesBar.test.tsx 2>&1 | tail -20
```
Attendu : `FAIL` sur les tests `design-l2` (« × », libellé court, `counterAfter` absent).

- [ ] **Étape 3 : `TabsBar.tsx`** — ajouter `import { Icon } from "./IconButton";` et remplacer le corps rendu d'un
  onglet et le bouton Nouvel onglet (lignes 52-77) :

```tsx
          <div
            class="rb-tab"
            role="tab"
            data-tab={t.id}
            data-kind={t.kind}
            data-dirty={t.dirty ? "1" : undefined}
            aria-selected={props.active() === t.id}
            onClick={() => props.activate(t.id)}
          >
            {/* design-l2 (L2-17, maquette 01) : point violet « modifié » avant le titre ; aucun texte, aria-hidden. */}
            <Show when={t.dirty}>
              <span class="rb-tab-dirty" aria-hidden="true" />
            </Show>
            <span class="rb-tab-title">{t.kind === "annotation" ? annotationTabLabel(t.title) : t.title}</span>
            <button
              type="button"
              class="rb-tab-close"
              data-tab-close={t.id}
              aria-label={`Fermer ${t.title}`}
              onClick={(e) => {
                e.stopPropagation();
                props.close(t.id);
              }}
            >
              <Icon name="close" />
            </button>
          </div>
          );
        }}
      </For>
      <button type="button" class="rb-tab-new" data-tab-new aria-label="Nouvel onglet" onClick={() => props.newTab()}>
        <Icon name="plus" />
      </button>
```

- [ ] **Étape 4 : `PagesBar.tsx`** (fichier entier) :

```tsx
import { For, Show, createMemo, type Accessor, type JSX } from "solid-js";
import type { ButtonSize, Toolbar, ToolItem } from "../toolbar";
import { IconButton } from "./IconButton";
import { iconFor } from "./icons";
import { itemState, type ToolbarView } from "./item-state";

export interface PagesView {
  readonly pageIndex: number;
  readonly pageCount: number;
}

export interface PagesBarProps {
  readonly bar: Toolbar;
  readonly items: Accessor<readonly ToolItem[]>;
  readonly view: Accessor<PagesView>;
  readonly size: Accessor<ButtonSize>;
  runAction(id: string): void;
  goTo(index: number): void;
}

export const pagesLabel = (v: PagesView): string => `${v.pageIndex + 1} / ${v.pageCount}`;

/** Champs de la vue sans effet sur les pages ; l'application passe la vue complète (`ToolbarView`), qui les remplace. */
const NEUTRAL: Omit<ToolbarView, keyof PagesView> = { tool: "", eraserMode: "partial", canUndo: false, canRedo: false, tableCell: null };

/** État d'un élément par la table de T94 (`itemState`), la même que celle de la barre d'outils. */
const isDisabled = (item: ToolItem, v: PagesView): boolean => itemState(item, { ...NEUTRAL, ...v }).disabled;

const isAction = (it: ToolItem | undefined, action: string): boolean => it !== undefined && it.kind === "action" && it.action === action;

/** design-l2 (L2-18, maquette 01) : `#pages` se pose entre Précédente et Suivante quand elles se suivent ; rend l'id
 *  de Précédente, ou null (compteur en fin de barre). */
export function counterAfter(items: readonly ToolItem[]): string | null {
  const i = items.findIndex((it) => isAction(it, "page-prev"));
  return i >= 0 && isAction(items[i + 1], "page-next") ? items[i]!.id : null;
}

/** Barre des pages (T101 ; design-l2 L2-18) : boutons à icône comme la barre d'outils (libellé complet en nom
 *  accessible, `.rb-sr` et infobulle) ; liste des numéros qui défile ; compteur `#pages`. */
export function PagesBar(props: PagesBarProps): JSX.Element {
  const numbers = (): number[] => Array.from({ length: Math.max(0, props.view().pageCount) }, (_, i) => i + 1);
  const after = createMemo(() => counterAfter(props.items()));
  const counter = (): JSX.Element => (
    <span id="pages" class="rb-pages-count">
      {pagesLabel(props.view())}
    </span>
  );
  return (
    <nav
      class="rb-bar"
      data-toolbar={props.bar.id}
      data-role="pages"
      data-dock={props.bar.dock}
      data-size={props.size()}
      aria-label="Pages"
    >
      <For each={props.items()}>
        {(item) => (
          <>
            <IconButton
              icon={iconFor(item)}
              label={item.label}
              disabled={isDisabled(item, props.view())}
              attrs={{ "data-item": item.id }}
              onPress={() => props.runAction(item.action ?? item.id)}
            />
            <Show when={after() === item.id}>{counter()}</Show>
          </>
        )}
      </For>
      <div class="rb-pages-list">
        <For each={numbers()}>
          {(n) => (
            <button
              type="button"
              class="rb-page"
              data-page={n}
              aria-current={n === props.view().pageIndex + 1 ? "page" : undefined}
              onClick={() => props.goTo(n - 1)}
            >
              {n}
            </button>
          )}
        </For>
      </div>
      <Show when={after() === null}>{counter()}</Show>
    </nav>
  );
}
```

- [ ] **Étape 5 : les voir verts**

```bash
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/TabsBar.test.tsx src/ui/PagesBar.test.tsx src/ui/App.test.tsx 2>&1 | tail -25
```
Attendu : `Test Files  3 passed (3)`. Si `App.test.tsx` rougit sur un libellé visible d'un bouton des pages
(« Copie .iwb… »), un attribut `title` ou le caractère « × » / « • » d'un onglet, l'attendu devient le libellé
complet, le `aria-label` ou la présence de `.rb-tab-dirty` (forme, L2-17, L2-18) ; toute autre rougeur arrête la tâche.

- [ ] **Étape 6 : types**

```bash
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20; echo "tsc code ${PIPESTATUS[0]}"
```

- [ ] **Étape 7 : suite web entière** (tâche de fond, plus de 2 min) :

```bash
cd "$W" && node ~/.claude/scripts/vm/suite-vm.cjs -- nice -n 10 pnpm --filter @roomboard/web exec vitest run > "$HOME/.cache/tmp/of68-tmp/T4-web.log" 2>&1; echo "code $?" >> "$HOME/.cache/tmp/of68-tmp/T4-web.log"
tail -25 "$HOME/.cache/tmp/of68-tmp/T4-web.log"; grep -c "FAIL " "$HOME/.cache/tmp/of68-tmp/T4-web.log"
```
Attendu : `code 0`, `0`.

- [ ] **Étape 8 : commit**

```bash
cd "$W" && git add apps/web/src/ui/TabsBar.tsx apps/web/src/ui/TabsBar.test.tsx apps/web/src/ui/PagesBar.tsx apps/web/src/ui/PagesBar.test.tsx
# plus apps/web/src/ui/App.test.tsx s'il a été retouché
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -F - <<'MSG'
feat(design-l2): icon tabs and icon page bar with counter between previous and next

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

### Tâche T5 — Composants `Island` et `IslandLayer`

<a id="tache-t5"></a>

**Objectif.** `ui/Island.tsx` : `Island` rend un îlot à la position que donne `island-place.ts` (`left`, `top`,
`max-inline-size` en px entiers, jamais de translation), avec, pour la barre d'outils seulement, poignée en tête et
Replier en fin, glisser au pointeur (souris, stylet, doigt), clavier, double appui, repli, lecture et écriture sur
l'appareil (L2-7 à L2-12, L2-16) ; il pose l'îlot contextuel sous la barre (L2-13). `IslandLayer` rend le calque dans la
case de la scène : coins en flex, îlot des onglets et `#etat` en haut à gauche après le menu, îlots centrés, mesures
(L2-5, L2-14, L2-30).

**Fichiers.**
- Créer : `apps/web/src/ui/Island.tsx`, `apps/web/src/ui/Island.test.tsx`

**Interfaces.**
- Consomme (T2, `./island-place`) : `Anchor`, `Box`, `Corners`, `Lane`, `Point`, `EDGE`, `GAP`, `TABS_MIN`, `SHEET_W`,
  `BUTTON_PX`, `anchorOf`, `isCentered`, `laneOf`, `placeIsland`, `nudge`, `sheetLane`, `tabsWidth` (signatures exactes
  en T2). (T2, `../device-settings`) : `DeviceSettings.island(profileId, barId): IslandState`,
  `DeviceSettings.setIsland(profileId, barId, s): boolean`, `NO_ISLAND`, `IslandState`. (T3, `./icons`) : icônes
  `collapse` ; existantes : `grip`, `down`.
- Produit (`apps/web/src/ui/Island.tsx`) :
  ```ts
  export type IslandStore = Pick<DeviceSettings, "island" | "setIsland">;
  export interface Placed { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly moved: boolean }
  export const GRIP_LABEL = "Déplacer la barre (flèches ; Maj : grand pas ; Début : recentrer)";
  export const COLLAPSE_LABEL = "Replier la barre";
  export const EXPAND_LABEL = "Déplier la barre";
  export const MOVABLE_ROLE = "tools";
  export function observeBox(el: Element, set: (b: Box) => void, round?: (n: number) => number): () => void;
  export interface IslandProps {
    readonly bar: Toolbar; readonly anchor: Anchor; readonly movable: boolean; readonly profileId: string;
    readonly store?: IslandStore; readonly area: Accessor<Box>; readonly corners: Accessor<Corners>;
    readonly sheet: Accessor<Lane | null>; readonly watch?: Accessor<unknown>;
    onPlaced?(p: Placed | null): void;
    readonly children: (collapsed: Accessor<boolean>) => JSX.Element;
  }
  export function Island(props: IslandProps): JSX.Element;
  export interface IslandLayerProps {
    readonly bars: Accessor<readonly Toolbar[]>;               // barres `floating` montrées
    readonly render: (bar: Toolbar, collapsed: Accessor<boolean>) => JSX.Element;
    readonly head: JSX.Element;                                // TabsBar
    readonly status: JSX.Element;                              // <p id="etat" role="status">
    readonly profileId: Accessor<string>;
    readonly store?: IslandStore;
    readonly size: Accessor<ButtonSize>;
    readonly sheetOpen: Accessor<boolean>;                     // panneau des profils ouvert (L2-16)
    readonly watch?: Accessor<unknown>;
  }
  export function IslandLayer(props: IslandLayerProps): JSX.Element;
  ```
  DOM : `div.rb-islands` > `div.rb-corner[data-corner="top-start"]` > (`div.rb-corner-menu` > îlots `menu`),
  `div.rb-island.rb-head[data-island="onglets"]` (style `max-inline-size`), puis `status` ;
  `div.rb-corner[data-corner="top-end"]` > îlots `panels` puis rôles inconnus ; `div.rb-corner[data-corner="bottom-start"]`
  > îlots `history` ; puis les îlots centrés (`tools`, `pages`), enfants directs de `.rb-islands`. Un îlot :
  `div.rb-island[data-island=<id>][data-anchor][data-wrap="1"?][data-collapsed="1"?]` > (poignée
  `button.rb-island-chrome[data-island-grip]`) + `children(collapsed)` + (Replier
  `button.rb-island-chrome[data-island-collapse][aria-expanded]`).
- Réutilise : `apps/web/src/ui/pointer-gesture.ts:21` — `startPointerGesture(e, { move, finish })` sur la poignée
  (souris, stylet, doigt ; seuil 4 px, Échap, `pointercancel`, capture perdue annulent ; `finish(u, dragged)` une fois).
- Réutilise : `apps/web/src/ui/tooltip.ts:101` — `placeTip(anchor, tip, view, gap)` pour centrer l'îlot contextuel sous
  la barre, borné à la case, px entiers (L2-12, L2-13).
- Réutilise : `apps/web/src/ui/IconButton.tsx` — `Icon`, `TipBubble`, `tipPointerHandlers` (poignée et Replier ;
  `IconButton` ne prend ni gestionnaire de pointeur ni `aria-expanded` réactif).
- Réutilise : `apps/web/src/ui/rb.css:203` — largeur du panneau lue dans la variable `--rb-sheet-w` (posée en T6),
  repli `SHEET_W`.

**Patron à ne pas reprendre.** (1) Le centrage de la maquette, `transform: translateX(-50%)`
(`docs/design/maquettes/01-tableau.html:65`, `.tip`) : il pose un bord sur un demi-pixel dès que la largeur est
impaire ; ici `left` entier (`Math.round`) seulement (L2-12). (2) Le calque d'avant, `.rb-floating` en `justify-self:
end` dans la grille (`apps/web/src/ui/App.tsx:439-443`, `apps/web/src/ui/rb.css:104-108`) : la place dépend de la
grille, pas d'une voie. (3) Mesurer l'îlot bridé : sa largeur sous `max-inline-size` dépend de la voie choisie, et la
voie de la largeur (hystérésis) ; la largeur naturelle se lit `max-inline-size` levée, dans le même tour
(`measure()` ci-dessous). Chemin de référence du geste : `apps/web/src/ui/sort-drag.ts` (appel de
`startPointerGesture`, fonction d'abandon gardée pour le démontage).

**Test et commande bornée.**
```bash
W=/home/adminjd/projets/roomboard-wt/design-l2--T5
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/Island.test.tsx src/ui/Toolbar.test.tsx src/ui/pointer-gesture.test.ts src/ui/tooltip.test.ts --reporter=verbose 2>&1 | grep -E "design-l2|Test Files|Tests |FAIL" | tail -30
```
Preuve : `Test Files  4 passed (4)`, ≥ 14 lignes `design-l2` venant de `Island.test.tsx`, aucun `FAIL ` ;
`pointer-gesture.test.ts` et `tooltip.test.ts` verts sans retouche ; la garde de `Toolbar.test.tsx:149` passe sur
`Island.tsx`.

**Preuve visuelle.** Aucune ici (happy-dom ne met rien en page ; la géométrie réelle est jouée en T8 S1, S3, S6).

**Contraintes (recopiées).**
- G1 — TDD : test rouge vu d'abord. Chaque tâche met à jour dans son commit tous les tests qu'elle fait rougir et finit
  verte seule ; deux tâches d'une même vague ne touchent jamais le même fichier.
- G3 — Aucun test supprimé, désactivé ou sauté ; aucun seuil changé. Format `.rbprofile` inchangé : position et repli
  ne vont que dans `store.setIsland`, jamais dans le profil.
- G5 — Positions d'îlot en px CSS entiers, jamais `translate(-50%)` ni colonnes `1fr` (L2-12).
- G6 — La CLI et le Wasm ne changent pas.
- G7 — VM partagée : `nice -n 10` ; un fichier isolé ou `tsc` sans suite-vm ; un test qui échoue sur un délai se rejoue
  une fois.
- G8 — Interdits : `git push --force`, `git add -A|.`, `git commit -a`, `git tag`, `gh release`, `rm -rf` d'un worktree,
  `tauri build`. Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un ; aucun push.
- G10 — `Island.tsx` : aucun `switch (`, aucun `localStorage`, aucun `draggable` ni `dragstart` (même en commentaire),
  aucun `\d+px` (écrire `` `${n}px` ``, « 16 px » avec espace dans les commentaires), aucun `innerHTML`.
- G11 — Worktree `/home/adminjd/projets/roomboard-wt/design-l2--T5` ; temporaires dans `$HOME/.cache/tmp/of68-tmp/T5-*`.

**Interdits.** Toucher `pointer-gesture.ts`, `tooltip.ts`, `IconButton.tsx`, `island-place.ts`, `device-settings.ts`,
`App.tsx`, `rb.css` ; le glisser HTML5 ; écrire sur l'appareil pendant un glisser ou au redimensionnement (seulement au
lâcher, au clavier, au double appui, au repli) ; lire l'appareil pour un îlot non déplaçable.

**Terminé quand.** Commande verte (≥ 14 tests `design-l2`) ; `tsc` code 0 ; un commit ; rapport avec
`Réutilisation : appelé pointer-gesture.ts (startPointerGesture), tooltip.ts (placeTip), IconButton.tsx (Icon, TipBubble, tipPointerHandlers), island-place.ts, device-settings.ts`
ou `Réutilisation : écart — …`.

#### Étapes

- [ ] **Étape 0 : préparer le worktree**

```bash
W=/home/adminjd/projets/roomboard-wt/design-l2--T5
cd "$W" && mkdir -p "$HOME/.cache/tmp/of68-tmp"
test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile --prefer-offline 2>&1 | tail -3
for d in wasm wasm-formats; do test -d "apps/web/src/$d" || cp -r "/home/adminjd/projets/roomboard-wt/design-l2/apps/web/src/$d" apps/web/src/; done
```

- [ ] **Étape 1 : tests rouges** — créer `apps/web/src/ui/Island.test.tsx` :

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal, type Accessor } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { IslandState } from "../device-settings";
import type { Toolbar as Bar } from "../toolbar";
import { COLLAPSE_LABEL, EXPAND_LABEL, GRIP_LABEL, Island, IslandLayer, type IslandStore } from "./Island";
import type { Box, Corners, Lane } from "./island-place";

afterEach(cleanup);

const bar = (id: string, role: string, collapsed = false): Bar => ({ id, role, dock: "floating", collapsed, groups: [], rest: {} });
const MID: Box = { w: 1280, h: 900 };
const TOP: Corners = { start: 208, end: 108, band: 56 };
const store = (saved: IslandState = { at: null, collapsed: null }) =>
  ({ island: vi.fn(() => saved), setIsland: vi.fn(() => true) }) satisfies IslandStore;

function setup(o: { b?: Bar; saved?: IslandState; sheet?: Lane | null; noStore?: boolean } = {}) {
  const s = store(o.saved);
  const [area, setArea] = createSignal<Box>(MID);
  const onPlaced = vi.fn();
  const b = o.b ?? bar("outils", "tools");
  const r = render(() => (
    <Island bar={b} anchor="top-center" movable profileId="defaut" {...(o.noStore ? {} : { store: s })} area={area} corners={() => TOP} sheet={() => o.sheet ?? null} onPlaced={onPlaced}>
      {(c) => <div data-toolbar={b.id} data-probe={c() ? "1" : "0"} />}
    </Island>
  ));
  const q = <T extends HTMLElement = HTMLElement>(sel: string): T => r.container.querySelector<T>(sel)!;
  const grip = (): HTMLButtonElement => {
    const g = q<HTMLButtonElement>("[data-island-grip]");
    g.setPointerCapture = vi.fn();
    g.releasePointerCapture = vi.fn();
    return g;
  };
  return { ...r, s, setArea, onPlaced, q, island: () => q(".rb-island"), grip, collapse: () => q<HTMLButtonElement>("[data-island-collapse]") };
}
const pos = (el: HTMLElement): string[] => [el.style.left, el.style.top];
const ptr = (type: string, x: number, y: number): PointerEvent => new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true, button: 0 });

describe("Island (design-l2 L2-7 à L2-16)", () => {
  it("design-l2 L2-8 : barre d'outils : poignée en tête, Replier en fin, libellés et icônes", () => {
    const { island, grip, collapse } = setup();
    const kids = [...island().children];
    expect(kids[0]!.hasAttribute("data-island-grip")).toBe(true);
    expect(kids.at(-1)!.hasAttribute("data-island-collapse")).toBe(true);
    expect(grip().getAttribute("aria-label")).toBe(GRIP_LABEL);
    expect(grip().querySelector("svg")?.getAttribute("data-icon")).toBe("grip");
    expect(collapse().getAttribute("aria-label")).toBe(COLLAPSE_LABEL);
    expect(collapse().getAttribute("aria-expanded")).toBe("true");
    expect(collapse().querySelector("svg")?.getAttribute("data-icon")).toBe("collapse");
    expect([island().getAttribute("data-island"), island().getAttribute("data-anchor")]).toEqual(["outils", "top-center"]);
  });

  it("design-l2 L2-12 : sans position : voie du haut, centrée, px entiers par left / top, aucun transform", () => {
    const { island } = setup();
    // largeur 0 sous happy-dom : centre de 1280 ; place symétrique 1280 - 2 × (16 + 208 + 8) = 816
    expect(pos(island())).toEqual(["640px", "16px"]);
    expect(island().style.getPropertyValue("max-inline-size")).toBe("816px");
    expect(island().style.transform).toBe("");
  });

  it("design-l2 L2-7 : position et repli lus sur l'appareil au montage", () => {
    const { island, s, q } = setup({ saved: { at: { x: 40, y: 200 }, collapsed: true } });
    expect(s.island).toHaveBeenCalledWith("defaut", "outils");
    expect(pos(island())).toEqual(["40px", "200px"]);
    expect(island().getAttribute("data-collapsed")).toBe("1");
    expect(q("[data-probe]").getAttribute("data-probe")).toBe("1");
  });

  it("design-l2 L2-8 : Replier puis Déplier : data-collapsed, icône down, aria-expanded, écrit sur l'appareil", () => {
    const { island, collapse, s, q } = setup();
    fireEvent.click(collapse());
    expect(island().getAttribute("data-collapsed")).toBe("1");
    expect(q("[data-probe]").getAttribute("data-probe")).toBe("1");
    expect(collapse().getAttribute("aria-expanded")).toBe("false");
    expect(collapse().getAttribute("aria-label")).toBe(EXPAND_LABEL);
    expect(collapse().querySelector("svg")?.getAttribute("data-icon")).toBe("down");
    expect(s.setIsland).toHaveBeenLastCalledWith("defaut", "outils", { at: null, collapsed: true });
    fireEvent.click(collapse());
    expect(island().hasAttribute("data-collapsed")).toBe(false);
    expect(s.setIsland).toHaveBeenLastCalledWith("defaut", "outils", { at: null, collapsed: false });
  });

  it("design-l2 L2-7 : collapsed du profil = état de départ quand l'appareil n'a rien", () => {
    const { island } = setup({ b: bar("outils", "tools", true) });
    expect(island().getAttribute("data-collapsed")).toBe("1");
  });

  it("design-l2 L2-10 : flèche droite +16, Maj + flèche bas +64, écrits ; Début recentre et efface la position", () => {
    const { island, grip, s } = setup({ saved: { at: { x: 40, y: 200 }, collapsed: null } });
    fireEvent.keyDown(grip(), { key: "ArrowRight" });
    expect(pos(island())).toEqual(["56px", "200px"]);
    expect(s.setIsland).toHaveBeenLastCalledWith("defaut", "outils", { at: { x: 56, y: 200 }, collapsed: null });
    fireEvent.keyDown(grip(), { key: "ArrowDown", shiftKey: true });
    expect(pos(island())).toEqual(["56px", "264px"]);
    fireEvent.keyDown(grip(), { key: "Home" });
    expect(pos(island())).toEqual(["640px", "16px"]);
    expect(s.setIsland).toHaveBeenLastCalledWith("defaut", "outils", { at: null, collapsed: null });
  });

  it("design-l2 L2-10 : une autre touche ne déplace rien et n'écrit rien", () => {
    const { island, grip, s } = setup({ saved: { at: { x: 40, y: 200 }, collapsed: null } });
    fireEvent.keyDown(grip(), { key: "a" });
    expect(pos(island())).toEqual(["40px", "200px"]);
    expect(s.setIsland).not.toHaveBeenCalled();
  });

  it("design-l2 L2-10 : double appui sur la poignée : recentré", () => {
    const { island, grip } = setup({ saved: { at: { x: 40, y: 200 }, collapsed: null } });
    fireEvent.dblClick(grip());
    expect(pos(island())).toEqual(["640px", "16px"]);
  });

  it("design-l2 L2-9 : glisser la poignée : l'îlot suit, écrit au lâcher seulement", () => {
    const { island, grip, s } = setup({ saved: { at: { x: 40, y: 200 }, collapsed: null } });
    const g = grip();
    g.dispatchEvent(ptr("pointerdown", 100, 100));
    g.dispatchEvent(ptr("pointermove", 130, 400));
    expect(pos(island())).toEqual(["70px", "500px"]);
    expect(s.setIsland).not.toHaveBeenCalled();
    g.dispatchEvent(ptr("pointerup", 130, 400));
    expect(s.setIsland).toHaveBeenLastCalledWith("defaut", "outils", { at: { x: 70, y: 500 }, collapsed: null });
  });

  it("design-l2 L2-9 : Échap pendant le glisser : retour au départ, rien d'écrit", () => {
    const { island, grip, s } = setup({ saved: { at: { x: 40, y: 200 }, collapsed: null } });
    const g = grip();
    g.dispatchEvent(ptr("pointerdown", 100, 100));
    g.dispatchEvent(ptr("pointermove", 160, 160));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(pos(island())).toEqual(["40px", "200px"]);
    expect(s.setIsland).not.toHaveBeenCalled();
  });

  it("design-l2 L2-11 : position bornée à l'affichage, jamais réécrite au redimensionnement", () => {
    const { island, setArea, s } = setup({ saved: { at: { x: 1000, y: 800 }, collapsed: null } });
    setArea({ w: 300, h: 300 });
    expect(pos(island())).toEqual(["300px", "300px"]);
    setArea(MID);
    expect(pos(island())).toEqual(["1000px", "800px"]);
    expect(s.setIsland).not.toHaveBeenCalled();
  });

  it("design-l2 L2-16 : panneau ouvert : voie imposée, plusieurs rangées (data-wrap), clavier sans effet", () => {
    const { island, grip, s } = setup({ saved: { at: { x: 40, y: 200 }, collapsed: null }, sheet: { x: 16, y: 80, maxWidth: 392 } });
    expect(pos(island())).toEqual(["16px", "80px"]);
    expect(island().style.getPropertyValue("max-inline-size")).toBe("392px");
    expect(island().getAttribute("data-wrap")).toBe("1");
    fireEvent.keyDown(grip(), { key: "ArrowRight" });
    expect(s.setIsland).not.toHaveBeenCalled();
  });

  it("design-l2 L2-4, H4 : îlot de coin : ni poignée ni Replier, aucune position en ligne, appareil jamais lu", () => {
    const s = store({ at: { x: 1, y: 1 }, collapsed: true });
    const r = render(() => (
      <Island bar={bar("menu", "menu")} anchor="top-start" movable={false} profileId="defaut" store={s} area={() => MID} corners={() => TOP} sheet={() => null}>
        {() => <div />}
      </Island>
    ));
    const el = r.container.querySelector<HTMLElement>(".rb-island")!;
    expect(el.querySelector("[data-island-grip], [data-island-collapse]")).toBeNull();
    expect(el.style.left).toBe("");
    expect(el.hasAttribute("data-collapsed")).toBe(false);
    expect(s.island).not.toHaveBeenCalled();
  });

  it("design-l2 L2-7 : sans réglage d'appareil : repli en mémoire", () => {
    const { island, collapse } = setup({ noStore: true });
    fireEvent.click(collapse());
    expect(island().getAttribute("data-collapsed")).toBe("1");
  });

  it("design-l2 L2-30 (c) : onPlaced rend la position et dit si l'îlot est déplacé", () => {
    const { onPlaced } = setup({ saved: { at: { x: 40, y: 200 }, collapsed: null } });
    expect(onPlaced).toHaveBeenLastCalledWith({ x: 40, y: 200, w: 0, h: 0, moved: true });
  });
});

describe("IslandLayer (design-l2 L2-5, L2-14)", () => {
  function layer(bars: readonly Bar[]) {
    const rendered = vi.fn((b: Bar, c: Accessor<boolean>) => <div data-toolbar={b.id} data-c={c() ? "1" : "0"} />);
    const r = render(() => (
      <IslandLayer bars={() => bars} render={rendered} head={<div data-tabs />} status={<p id="etat" role="status" />} profileId={() => "defaut"} size={() => "m"} sheetOpen={() => false} />
    ));
    const ids = (sel: string): (string | null)[] => [...r.container.querySelectorAll(sel)].map((e) => e.getAttribute("data-island"));
    return { ...r, rendered, ids };
  }
  const ALL = [bar("outils", "tools"), bar("menu", "menu"), bar("historique", "history"), bar("panneaux", "panels"), bar("pages", "pages"), bar("zoom", "zoom")];

  it("design-l2 L2-5 : menu en haut à gauche, puis onglets et #etat ; panneaux puis rôle inconnu en haut à droite ; historique en bas à gauche ; outils et pages centrés", () => {
    const { container, ids, rendered } = layer(ALL);
    expect(ids('.rb-corner[data-corner="top-start"] .rb-corner-menu > .rb-island')).toEqual(["menu"]);
    const head = container.querySelector('.rb-corner[data-corner="top-start"] > .rb-island.rb-head[data-island="onglets"]')!;
    expect(head.querySelector("[data-tabs]")).not.toBeNull();
    expect(head.nextElementSibling?.id).toBe("etat");
    expect(ids('.rb-corner[data-corner="top-end"] > .rb-island')).toEqual(["panneaux", "zoom"]);
    expect(ids('.rb-corner[data-corner="bottom-start"] > .rb-island')).toEqual(["historique"]);
    expect(ids(".rb-islands > .rb-island")).toEqual(["outils", "pages"]);
    expect(rendered).toHaveBeenCalledTimes(6);
  });

  it("design-l2 L2-8 : seule la barre de rôle tools porte poignée et Replier", () => {
    const { container } = layer(ALL);
    expect(container.querySelectorAll("[data-island-grip]")).toHaveLength(1);
    expect(container.querySelector('[data-island="outils"] [data-island-grip]')).not.toBeNull();
    expect(container.querySelectorAll("[data-island-collapse]")).toHaveLength(1);
  });

  it("design-l2 L2-5 : sans barre de menu (profil à bandes) : .rb-corner-menu vide, onglets au coin, #etat présent", () => {
    const { container } = layer([]);
    expect(container.querySelector(".rb-corner-menu")?.children).toHaveLength(0);
    expect(container.querySelector('.rb-corner[data-corner="top-start"] > .rb-head[data-island="onglets"]')).not.toBeNull();
    expect(container.querySelector("#etat")?.getAttribute("role")).toBe("status");
  });

  it("design-l2 L2-30 (c) : îlot des onglets : largeur maximale en px entiers, au moins 144", () => {
    const { container } = layer(ALL);
    const head = container.querySelector<HTMLElement>('[data-island="onglets"]')!;
    const w = head.style.getPropertyValue("max-inline-size");
    expect(w).toMatch(/^\d+px$/);
    expect(Number.parseInt(w, 10)).toBeGreaterThanOrEqual(144);
  });
});
```

- [ ] **Étape 2 : les voir rouges**

```bash
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/Island.test.tsx 2>&1 | tail -15
```
Attendu : `FAIL` (module `./Island` introuvable).

- [ ] **Étape 3 : `Island.tsx`**

```tsx
import { For, Show, createEffect, createMemo, createSignal, on, onCleanup, onMount, type Accessor, type JSX } from "solid-js";
import { NO_ISLAND, type DeviceSettings } from "../device-settings";
import type { ButtonSize, Toolbar as Bar } from "../toolbar";
import { Icon, TipBubble, tipPointerHandlers } from "./IconButton";
import {
  BUTTON_PX, EDGE, GAP, SHEET_W, TABS_MIN, anchorOf, isCentered, laneOf, nudge, placeIsland, sheetLane, tabsWidth,
  type Anchor, type Box, type Corners, type Lane, type Point,
} from "./island-place";
import { startPointerGesture } from "./pointer-gesture";
import { createTip, placeTip } from "./tooltip";

/**
 * Îlots flottants (design-l2, DA-L2-2). `Island` rend un îlot à la position calculée par `island-place.ts` (`left`,
 * `top`, `max-inline-size` en px entiers ; jamais de translation, L2-12) ; la barre d'outils y gagne poignée, Replier et
 * clavier (L2-8 à L2-10), sa position et son repli vont sur l'appareil (L2-7), jamais dans le profil.
 * `IslandLayer` rend le calque dans la case de la scène : coins en flex à 16 px (L2-5), îlots centrés placés par
 * `laneOf` (L2-30), îlot des onglets et `#etat` en haut à gauche, voie imposée par le panneau des profils (L2-16).
 */
export type IslandStore = Pick<DeviceSettings, "island" | "setIsland">;
/** Rectangle placé d'un îlot, px de la case ; `moved` : position enregistrée ou glisser en cours. */
export interface Placed { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly moved: boolean }

export const GRIP_LABEL = "Déplacer la barre (flèches ; Maj : grand pas ; Début : recentrer)";
export const COLLAPSE_LABEL = "Replier la barre";
export const EXPAND_LABEL = "Déplier la barre";
/** L2-8, H4 : seul ce rôle se déplace et se replie. */
export const MOVABLE_ROLE = "tools";

const ZERO: Box = Object.freeze({ w: 0, h: 0 });
const sameBox = (a: Box, b: Box): boolean => a.w === b.w && a.h === b.h;

/** Taille d'un élément, px CSS entiers, relue à l'image suivante après chaque changement (aucune boucle de
 *  `ResizeObserver`) ; sans `ResizeObserver` (tests) : mesurée une fois. Rend la fonction d'arrêt. */
export function observeBox(el: Element, set: (b: Box) => void, round: (n: number) => number = Math.ceil): () => void {
  const read = (): void => {
    const r = el.getBoundingClientRect();
    set({ w: round(r.width), h: round(r.height) });
  };
  read();
  if (typeof ResizeObserver !== "function") return () => undefined;
  let frame = 0;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(read);
  });
  ro.observe(el);
  return () => {
    cancelAnimationFrame(frame);
    ro.disconnect();
  };
}

interface ChromeProps {
  readonly icon: string;
  readonly label: string;
  readonly mark: "data-island-grip" | "data-island-collapse";
  readonly expanded?: boolean;
  onPress?(): void;
  onDown?(e: PointerEvent): void;
  onKey?(e: KeyboardEvent): void;
  onDouble?(): void;
}

/** Bouton de chrome d'îlot, hors profil (L2-8) : icône, libellé en `.rb-sr`, infobulle de L1. */
function ChromeButton(props: ChromeProps): JSX.Element {
  const tip = createTip();
  const h = tipPointerHandlers(tip);
  const mark = { [props.mark]: "" };
  let el: HTMLButtonElement | undefined;
  return (
    <>
      <button
        ref={el}
        type="button"
        class="rb-island-chrome"
        {...mark}
        aria-label={props.label}
        aria-expanded={props.expanded}
        onClick={() => props.onPress?.()}
        onPointerEnter={h.onPointerEnter}
        onPointerLeave={h.onPointerLeave}
        onPointerDown={(e) => {
          h.onPointerDown(e);
          props.onDown?.(e);
        }}
        onPointerUp={h.onPointerUp}
        onPointerCancel={h.onPointerCancel}
        onKeyDown={(e) => props.onKey?.(e)}
        onDblClick={() => props.onDouble?.()}
        onFocus={() => tip.focus()}
        onBlur={() => tip.blur(document.hasFocus())}
      >
        <Icon name={props.icon} />
        <span class="rb-sr">{props.label}</span>
      </button>
      <TipBubble tip={tip} label={props.label} anchor={() => el!} />
    </>
  );
}

export interface IslandProps {
  readonly bar: Bar;
  readonly anchor: Anchor;
  /** L2-8 : barre `floating` de rôle `tools` : poignée, Replier, clavier, appareil. */
  readonly movable: boolean;
  readonly profileId: string;
  readonly store?: IslandStore;
  /** Case des îlots (la case de la scène), px entiers. */
  readonly area: Accessor<Box>;
  readonly corners: Accessor<Corners>;
  /** L2-16 : voie imposée par le panneau des profils ouvert ; null sinon. */
  readonly sheet: Accessor<Lane | null>;
  /** Change quand le contenu de l'îlot peut changer de largeur (pages, outil) : remesure. */
  readonly watch?: Accessor<unknown>;
  onPlaced?(p: Placed | null): void;
  readonly children: (collapsed: Accessor<boolean>) => JSX.Element;
}

export function Island(props: IslandProps): JSX.Element {
  const saved = props.movable ? (props.store?.island(props.profileId, props.bar.id) ?? NO_ISLAND) : NO_ISLAND;
  const [at, setAt] = createSignal<Point | null>(saved.at);
  const [own, setOwn] = createSignal<boolean | null>(saved.collapsed);
  const [drag, setDrag] = createSignal<Point | null>(null);
  const [size, setSize] = createSignal<Box>(ZERO, { equals: sameBox });
  const collapsed = (): boolean => props.movable && (own() ?? props.bar.collapsed);
  const positioned = props.movable || isCentered(props.anchor);
  let el: HTMLDivElement | undefined;
  let stopDrag: (() => void) | null = null;

  /** Position et largeur maximale, px entiers ; null : îlot de coin, posé par la règle CSS de son groupe. */
  const pos = createMemo((): (Lane & { readonly wrap: boolean }) | null => {
    if (!positioned) return null;
    const area = props.area();
    const s = size();
    const c = props.corners();
    const lane = props.movable ? props.sheet() : null;
    if (lane !== null) return { ...lane, wrap: true };
    const full = Math.max(0, area.w - 2 * EDGE);
    const d = drag();
    if (d !== null) return { ...d, maxWidth: full, wrap: false };
    const a = at();
    if (a !== null) return { ...placeIsland(props.anchor, s, area, a, c), maxWidth: full, wrap: false };
    return { ...laneOf(props.anchor, s, area, c), wrap: false };
  });

  /** Largeur naturelle, `max-inline-size` levée le temps de la lecture : la voie dépend de ce que l'îlot demande,
   *  jamais de ce qu'on lui laisse (sinon la voie et la largeur se répondent). */
  const measure = (): void => {
    if (el === undefined) return;
    const prev = el.style.getPropertyValue("max-inline-size");
    el.style.setProperty("max-inline-size", "none");
    const r = el.getBoundingClientRect();
    if (prev === "") el.style.removeProperty("max-inline-size");
    else el.style.setProperty("max-inline-size", prev);
    setSize({ w: Math.ceil(r.width), h: Math.ceil(r.height) });
  };
  /** L2-13 : îlot contextuel centré sous la barre, borné à la case, px entiers (`placeTip`) ; coordonnées relatives à
   *  l'îlot, son bloc conteneur. */
  const placeContext = (): void => {
    const p = pos();
    const ctx = el?.querySelector<HTMLElement>("[data-island-context]");
    if (el === undefined || ctx === null || ctx === undefined || p === null) return;
    const me = el.getBoundingClientRect();
    const r = ctx.getBoundingClientRect();
    const area = props.area();
    const t = placeTip({ left: p.x, top: p.y, right: p.x + me.width, bottom: p.y + me.height }, { width: r.width, height: r.height }, { width: area.w, height: area.h }, GAP);
    ctx.style.left = `${t.left - p.x}px`;
    ctx.style.top = `${t.top - p.y}px`;
  };

  onMount(() => {
    measure();
    let frame = 0;
    const later = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        measure();
        placeContext();
      });
    };
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver === "function" && el !== undefined) {
      ro = new ResizeObserver(later);
      ro.observe(el);
      const ctx = el.querySelector("[data-island-context]");
      if (ctx !== null) ro.observe(ctx);
    }
    onCleanup(() => {
      cancelAnimationFrame(frame);
      ro?.disconnect();
      stopDrag?.();
      props.onPlaced?.(null);
    });
  });
  createEffect(on(() => [props.watch?.(), collapsed()], () => requestAnimationFrame(measure), { defer: true }));
  createEffect(() => {
    const p = pos();
    if (p === null) return;
    queueMicrotask(placeContext);
    props.onPlaced?.({ x: p.x, y: p.y, w: Math.min(size().w, p.maxWidth), h: size().h, moved: at() !== null || drag() !== null });
  });

  const write = (): void => {
    props.store?.setIsland(props.profileId, props.bar.id, { at: at(), collapsed: own() });
  };
  const commit = (p: Point | null): void => {
    setAt(p);
    write();
  };
  /** L2-9 : glisser la poignée ; écrit au lâcher seulement ; Échap, `pointercancel` : retour au départ. */
  const startDrag = (e: PointerEvent): void => {
    const p0 = pos();
    if (p0 === null || props.sheet() !== null) return;
    const x0 = e.clientX;
    const y0 = e.clientY;
    stopDrag = startPointerGesture(e, {
      move: (m) => setDrag(placeIsland(props.anchor, size(), props.area(), { x: p0.x + m.clientX - x0, y: p0.y + m.clientY - y0 }, props.corners())),
      finish: (u, dragged) => {
        const d = drag();
        setDrag(null);
        stopDrag = null;
        if (u !== null && dragged && d !== null) commit(d);
      },
    });
  };
  /** L2-10 : flèches 16 px, Maj 64 px, Début recentre ; la touche traitée ne va pas au moteur. */
  const onGripKey = (e: KeyboardEvent): void => {
    if (props.sheet() !== null) return;
    if (e.key === "Home") {
      e.preventDefault();
      e.stopPropagation();
      commit(null);
      return;
    }
    const p = pos();
    const n = p === null ? null : nudge({ x: p.x, y: p.y }, e.key, e.shiftKey);
    if (n === null) return;
    e.preventDefault();
    e.stopPropagation();
    commit(placeIsland(props.anchor, size(), props.area(), n, props.corners()));
  };
  const toggle = (): void => {
    setOwn(!collapsed());
    write();
  };

  return (
    <div
      ref={el}
      class="rb-island"
      data-island={props.bar.id}
      data-anchor={props.anchor}
      data-wrap={pos()?.wrap === true ? "1" : undefined}
      data-collapsed={collapsed() ? "1" : undefined}
      style={pos() === null ? {} : { left: `${pos()!.x}px`, top: `${pos()!.y}px`, "max-inline-size": `${pos()!.maxWidth}px` }}
    >
      <Show when={props.movable}>
        <ChromeButton icon="grip" label={GRIP_LABEL} mark="data-island-grip" onDown={startDrag} onKey={onGripKey} onDouble={() => commit(null)} />
      </Show>
      {props.children(collapsed)}
      <Show when={props.movable}>
        <ChromeButton
          icon={collapsed() ? "down" : "collapse"}
          label={collapsed() ? EXPAND_LABEL : COLLAPSE_LABEL}
          mark="data-island-collapse"
          expanded={!collapsed()}
          onPress={toggle}
        />
      </Show>
    </div>
  );
}

export interface IslandLayerProps {
  /** Barres `floating` montrées au tableau (aucune en annotation). */
  readonly bars: Accessor<readonly Bar[]>;
  readonly render: (bar: Bar, collapsed: Accessor<boolean>) => JSX.Element;
  /** Contenu de l'îlot des onglets (TabsBar). */
  readonly head: JSX.Element;
  /** `<p id="etat" role="status">`, après les onglets. */
  readonly status: JSX.Element;
  readonly profileId: Accessor<string>;
  readonly store?: IslandStore;
  readonly size: Accessor<ButtonSize>;
  /** L2-16 : panneau des profils ouvert. */
  readonly sheetOpen: Accessor<boolean>;
  readonly watch?: Accessor<unknown>;
}

/** Largeur du panneau des profils, lue dans `--rb-sheet-w` (rb.css) ; illisible : `SHEET_W`. */
function sheetWidth(): number {
  const v = Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue("--rb-sheet-w"), 10);
  return Number.isFinite(v) && v > 0 ? v : SHEET_W;
}

export function IslandLayer(props: IslandLayerProps): JSX.Element {
  let layer: HTMLDivElement | undefined;
  let topStart: HTMLDivElement | undefined;
  let menu: HTMLDivElement | undefined;
  let topEnd: HTMLDivElement | undefined;
  let bottomStart: HTMLDivElement | undefined;
  const [area, setArea] = createSignal<Box>(ZERO, { equals: sameBox });
  const [startBox, setStartBox] = createSignal<Box>(ZERO, { equals: sameBox });
  const [menuBox, setMenuBox] = createSignal<Box>(ZERO, { equals: sameBox });
  const [endBox, setEndBox] = createSignal<Box>(ZERO, { equals: sameBox });
  const [bottomBox, setBottomBox] = createSignal<Box>(ZERO, { equals: sameBox });
  const [tools, setTools] = createSignal<Placed | null>(null);
  const byAnchor = (anchor: Anchor) => createMemo(() => props.bars().filter((b) => anchorOf(b.role) === anchor));
  const starts = byAnchor("top-start");
  const ends = byAnchor("top-end");
  const bottoms = byAnchor("bottom-start");
  const centered = createMemo(() => props.bars().filter((b) => isCentered(anchorOf(b.role))));
  /** Abscisse de l'îlot des onglets : après les îlots du menu et leur écart. */
  const startX = (): number => EDGE + menuBox().w + (menuBox().w > 0 ? GAP : 0);
  const topCorners = createMemo((): Corners => ({ start: startX() - EDGE + TABS_MIN, end: endBox().w, band: Math.max(startBox().h, endBox().h) }));
  const bottomCorners = createMemo((): Corners => ({ start: bottomBox().w, end: 0, band: bottomBox().h }));
  const sheet = createMemo((): Lane | null => (props.sheetOpen() ? sheetLane(area(), sheetWidth(), topCorners().band, BUTTON_PX[props.size()]) : null));
  const tabsMax = createMemo(() => {
    const t = tools();
    return tabsWidth(area(), startX(), endBox().w, t === null || t.moved ? null : { x: t.x, y: t.y });
  });
  onMount(() => {
    const offs = [
      observeBox(layer!, setArea, Math.floor),
      observeBox(topStart!, setStartBox),
      observeBox(menu!, setMenuBox),
      observeBox(topEnd!, setEndBox),
      observeBox(bottomStart!, setBottomBox),
    ];
    onCleanup(() => {
      for (const off of offs) off();
    });
  });
  const island = (bar: Bar): JSX.Element => {
    const anchor = anchorOf(bar.role);
    const movable = bar.role === MOVABLE_ROLE;
    return (
      <Island
        bar={bar}
        anchor={anchor}
        movable={movable}
        profileId={props.profileId()}
        {...(props.store !== undefined ? { store: props.store } : {})}
        area={area}
        corners={anchor.startsWith("top") ? topCorners : bottomCorners}
        sheet={sheet}
        {...(props.watch !== undefined ? { watch: props.watch } : {})}
        {...(movable ? { onPlaced: (p: Placed | null) => setTools(p) } : {})}
      >
        {(c) => props.render(bar, c)}
      </Island>
    );
  };
  return (
    <div ref={layer} class="rb-islands">
      <div ref={topStart} class="rb-corner" data-corner="top-start">
        <div ref={menu} class="rb-corner-menu">
          <For each={starts()}>{island}</For>
        </div>
        <div class="rb-island rb-head" data-island="onglets" style={{ "max-inline-size": `${tabsMax()}px` }}>
          {props.head}
        </div>
        {props.status}
      </div>
      <div ref={topEnd} class="rb-corner" data-corner="top-end">
        <For each={ends()}>{island}</For>
      </div>
      <div ref={bottomStart} class="rb-corner" data-corner="bottom-start">
        <For each={bottoms()}>{island}</For>
      </div>
      <For each={centered()}>{island}</For>
    </div>
  );
}
```

- [ ] **Étape 4 : les voir verts, garde de source**

```bash
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/Island.test.tsx src/ui/Toolbar.test.tsx src/ui/pointer-gesture.test.ts src/ui/tooltip.test.ts --reporter=verbose 2>&1 | grep -E "design-l2|Test Files|Tests |FAIL" | tail -30
```
Attendu : `Test Files  4 passed (4)`, ≥ 14 `design-l2` de `Island.test.tsx`. Points à vérifier si un test rougit :
le pointeur délégué par Solid (`onPointerDown`) donne bien `e.currentTarget` = poignée à `startPointerGesture` (sinon,
poser l'écoute par `addEventListener("pointerdown", …)` sur le bouton dans un `onMount`, et le noter) ; `aria-expanded`
rendu `"true"` / `"false"` (sinon `String(props.expanded)`).

- [ ] **Étape 5 : types**

```bash
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20; echo "tsc code ${PIPESTATUS[0]}"
```
Attendu : `tsc code 0`.

- [ ] **Étape 6 : commit**

```bash
cd "$W" && git add apps/web/src/ui/Island.tsx apps/web/src/ui/Island.test.tsx
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -F - <<'MSG'
feat(design-l2): Island and IslandLayer (integer placement, grip, collapse, keyboard)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

### Tâche T6 — Assemblage : calque des îlots dans `App`, menu, îlot contextuel, grille sans onglets, styles

<a id="tache-t6"></a>

**Objectif.** `App.tsx` remplace la rangée `.rb-head` et le conteneur `.rb-floating` par `IslandLayer` (L2-5, L2-14),
rend le rôle `menu` par `MenuBar` (L2-6), passe le repli à la barre d'outils (L2-8) ; `Toolbar.tsx` sépare la rangée
contextuelle en îlot `[data-island-context]` à l'intérieur de `[data-toolbar]` pour une barre `floating` (L2-13) ;
`layoutFor` ne garde que les bandes (L2-14) ; `rb.css` porte calque, coins, îlots, menu, onglets (L2-17), panneaux
passagers (L2-15), `--rb-sheet-w` (L2-16), annotation (L2-19), segments de l'éditeur (L2-21). `#stage` couvre alors toute
la fenêtre pour les trois profils fournis.

**Fichiers.**
- Modifier : `apps/web/src/ui/App.tsx:1-7` (en-tête), `:8`, `:23`, imports, `:394-414` (`toolbarOf`, `BY_ROLE`, `barOf`),
  `:416-443` (rendu)
- Modifier : `apps/web/src/ui/layout.ts:7-22`, `apps/web/src/ui/Toolbar.tsx:38-49`, `:220-244`
- Modifier : `apps/web/src/ui/rb.css` (`:root`, `:48-50`, `:85-90`, `:100-101`, `:104-108`, `:114-118`, `:146-152`,
  `:177-184`, `:203`, `:256`, `:312`)
- Tests : `apps/web/src/ui/App.test.tsx`, `apps/web/src/ui/layout.test.ts`, `apps/web/src/ui/Toolbar.test.tsx`,
  `apps/web/src/ui/rb-css.test.ts`

**Interfaces.**
- Consomme (T1) : `MENU_ROLE` ; profils fournis en îlots. (T3) : `MenuBar({ bar, items, view, size, host })`.
  (T4) : `TabsBar` à icônes, `PagesBar`. (T5) : `IslandLayer({ bars, render, head, status, profileId, store?, size,
  sheetOpen, watch? })`, attributs `data-island`, `data-island-context`, `data-island-grip`, `data-island-collapse`,
  classes `.rb-islands`, `.rb-corner`, `.rb-corner-menu`, `.rb-island`, `.rb-island-chrome`. (T2) : `DeviceSettings`
  avec `island` / `setIsland` (passé tel quel en `store`).
- Produit : `ToolbarProps.collapsed?: Accessor<boolean>` (`data-collapsed="1"` sur `[data-toolbar]`) ;
  `div.rb-context[data-island-context]` enfant direct de `[data-toolbar]` pour une barre `floating` de rôle `tools` ou
  `annotation` ; `layoutFor` sans rangée `tabs` ; variable CSS `--rb-sheet-w: 600px`.
- Réutilise : `apps/web/src/ui/layout.ts:8` — `layoutFor(bars)` étendu : rangée `tabs` retirée, signature inchangée.
- Réutilise : `apps/web/src/ui/App.tsx:398-414` — table `BY_ROLE` étendue d'une entrée `[MENU_ROLE]` (rendu par rôle,
  jamais un branchement sur l'id).
- Réutilise : `apps/web/src/toolbar.ts:624`, `:686` — `visibleItems(bar, caps)` (barre des pages, inchangé) et
  `itemsForMode(bar, caps, mode)` (éléments du menu, passés à `MenuBar`).
- Réutilise : `apps/web/src/toolbar.ts:675` — `annotationBarOf(profile)`, inchangé : en annotation, seule cette barre
  est montrée et le calque des îlots est vide et caché (L2-19).
- Réutilise : `apps/web/src/ui/rb.css:178-186` — règles des lignes du menu Profil étendues au menu :
  sélecteur commun `:is([data-profiles], [data-menu-list]) button` (48 px, icône + texte).
- Réutilise : `apps/web/src/ui/rb.css:203` — largeur du panneau des profils passée en variable `--rb-sheet-w: 600px`
  (lue aussi par `IslandLayer`).

**Patron à ne pas reprendre.** (1) Le conteneur unique `.rb-floating` calé par la grille (`justify-self: end`,
`apps/web/src/ui/App.tsx:439-443`, `apps/web/src/ui/rb.css:104-108`) et sa variante du panneau ouvert
(`rb.css:107-108`) : remplacés par `IslandLayer` et la voie `sheetLane`. (2) Sortir la rangée contextuelle de
`[data-toolbar]` : les sélecteurs `[data-toolbar="outils"] button[data-preset]` (`App.test.tsx:665`, `:807`) et
`data-presets-sep` / `data-table-sep` doivent rester vrais (L2-13). (3) Toute règle `position: absolute|fixed` dont le
sélecteur contient `.rb-bar` (garde `App.test.tsx:400-410`) : la position est portée par `.rb-island` et `.rb-context`.
Chemin de référence : la mise en page en grille d'aujourd'hui (`App.tsx:416-443`) pour les bandes, qui ne change pas.

**Test et commande bornée.**
```bash
W=/home/adminjd/projets/roomboard-wt/design-l2--T6
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/App.test.tsx src/ui/layout.test.ts src/ui/Toolbar.test.tsx src/ui/rb-css.test.ts --reporter=verbose 2>&1 | grep -E "design-l2|Test Files|Tests |FAIL" | tail -40
```
Preuve : `Test Files  4 passed (4)`, ≥ 8 tests `design-l2` dans `App.test.tsx` et ≥ 10 dans `rb-css.test.ts`, aucun
`FAIL ` ; puis suite web entière (suite-vm) `code 0`, 0 `FAIL ` ; build web `✓ built in`.

**Preuve visuelle.** Le profil ne donne pas de commande de preuve visuelle ; la géométrie réelle (`#stage` = fenêtre,
îlots entiers, sans chevauchement, px entiers) est mesurée au navigateur par T8 (S1 à S6), sur le build de cette tâche.
Ici : build web (`tsc` + vite) réussi, qui prouve que la page se construit.

**Contraintes (recopiées).**
- G1 — TDD : test rouge vu d'abord. Chaque tâche met à jour dans son commit tous les tests qu'elle fait rougir et finit
  verte seule ; deux tâches d'une même vague ne touchent jamais le même fichier.
- G2 — Comportement inchangé hors de l'aspect ; essais existants verts, retouchés seulement en forme (T7). Dans les tests
  unitaires, les retouches autorisées sont celles listées à l'étape 10 ; toute autre rougeur arrête la tâche : rapport,
  aucune retouche.
- G3 — Aucun test supprimé, désactivé ou sauté ; aucun seuil changé. Format `.rbprofile` inchangé.
- G5 — Jetons de L1 (`rb.css`, `--rf-*`) ; îlots : fond blanc (`--rf-white`), rayon 12 (`--rf-radius-xl`), filet
  `#E0E0E8` (`--rf-gray-300`, en `box-shadow: 0 0 0 1px`), ombre `--rf-shadow-hover` ; aucune couleur en dur dans une
  règle neuve ; positions d'îlot en px CSS entiers, jamais `translate(-50%)` ni colonnes `1fr` (L2-12).
- G6 — La CLI et le Wasm ne changent pas.
- G7 — VM partagée : `nice -n 10` ; suite complète par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; un
  fichier isolé ou `tsc` s'en passe ; un test qui échoue sur un délai se rejoue une fois ; commande de plus de 2 min en
  tâche de fond, sans boucle d'attente.
- G8 — Interdits : `git push --force`, `git add -A|.`, `git commit -a`, `git tag`, `gh release`, `rm -rf` d'un worktree,
  `tauri build`. Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un ; aucun push.
- G9 — Le build web (`nice -n 10 pnpm --filter @roomboard/web build`, comme `scripts/verifier.sh:56`) doit réussir.
- G10 — `App.tsx`, `Toolbar.tsx` : aucun `switch (`, `localStorage`, `draggable`, `dragstart`, `\d+px`, `innerHTML`.
- G11 — Worktree `/home/adminjd/projets/roomboard-wt/design-l2--T6` ; temporaires dans `$HOME/.cache/tmp/of68-tmp/T6-*`.

**Écart assumé, à porter au rapport.** L2-15 range l'Image « à gauche » avec Réglages et Grille ; l'Image reste calée à
droite (C5, I26 : l'image déposée au centre ou à gauche reste visible, comportement), sous la rangée du haut.

**Interdits.** Toucher `Island.tsx`, `MenuBar.tsx`, `island-place.ts`, `device-settings.ts`, `toolbar*.ts`, `main.ts`,
`PagesBar.tsx`, `TabsBar.tsx`, `ProfileEditor.tsx` ; ajouter un `transform` ou une colonne `1fr` pour placer un îlot ;
`display: none` sur `#etat`.

**Terminé quand.** Commande verte ; suite web entière `code 0` ; build web `✓ built` ; `tsc` code 0 ; un commit ; rapport
avec chaque test retouché (fichier:ligne, avant → après), l'écart Image, et
`Réutilisation : appelé layout.ts (layoutFor), BY_ROLE, itemsForMode, annotationBarOf, rb.css ([data-profiles], --rb-sheet-w)`
ou `Réutilisation : écart — …`.

#### Étapes

- [ ] **Étape 0 : préparer le worktree**

```bash
W=/home/adminjd/projets/roomboard-wt/design-l2--T6
cd "$W" && mkdir -p "$HOME/.cache/tmp/of68-tmp"
test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile --prefer-offline 2>&1 | tail -3
for d in wasm wasm-formats; do test -d "apps/web/src/$d" || cp -r "/home/adminjd/projets/roomboard-wt/design-l2/apps/web/src/$d" apps/web/src/; done
```

- [ ] **Étape 1 : tests rouges de la grille (`layout.test.ts`, fichier entier)**

```ts
import { describe, expect, it } from "vitest";
import { layoutFor } from "./layout";

describe("layoutFor (CL5b-10 ; design-l2 L2-14 : bandes seules, onglets en îlot)", () => {
  it("bandes en haut et en bas : barre, scène, pages ; aucune rangée d'onglets", () => {
    expect(layoutFor([{ id: "outils", dock: "top" }, { id: "pages", dock: "bottom" }])).toEqual({
      areas: '"outils" "stage" "pages"',
      columns: "minmax(0, 1fr)",
      rows: "auto minmax(0, 1fr) auto",
    });
  });
  it("simple : barre à gauche, pages flottantes", () => {
    expect(layoutFor([{ id: "outils", dock: "left" }, { id: "pages", dock: "floating" }])).toEqual({
      areas: '"outils stage"',
      columns: "auto minmax(0, 1fr)",
      rows: "minmax(0, 1fr)",
    });
  });
  it("design-l2 L2-14 : que des îlots : la scène seule", () => {
    expect(layoutFor([{ id: "f", dock: "floating" }])).toEqual({ areas: '"stage"', columns: "minmax(0, 1fr)", rows: "minmax(0, 1fr)" });
    expect(layoutFor([])).toEqual({ areas: '"stage"', columns: "minmax(0, 1fr)", rows: "minmax(0, 1fr)" });
  });
  it("barre à droite : colonne après la scène", () => {
    const l = layoutFor([{ id: "r", dock: "right" }]);
    expect(l.areas).toBe('"stage r"');
    expect(l.columns).toBe("minmax(0, 1fr) auto");
  });
});
```

- [ ] **Étape 2 : tests rouges de la barre (`Toolbar.test.tsx`, en fin de fichier)**

```tsx
describe("Toolbar — design-l2 (L2-8, L2-13)", () => {
  const host = (): ToolbarHost => ({ setTool: vi.fn(), runAction: vi.fn(), dropFiles: vi.fn(), setMode: vi.fn(), tableFill: vi.fn(), fillColor: vi.fn(), fillTolerance: vi.fn(), textFormat: vi.fn(), selection: vi.fn(), imagePanel: vi.fn() });
  it("design-l2 L2-13 : barre flottante de rôle tools : rangées contextuelles dans [data-island-context], enfant de [data-toolbar]", () => {
    const { container } = setup({ ...outils, dock: "floating" }, NO_CAPS, "m", PEN);
    const ctx = container.querySelector('[data-toolbar="outils"] > [data-island-context]');
    expect(ctx).not.toBeNull();
    expect(ctx!.classList.contains("rb-context")).toBe(true);
    expect(ctx!.querySelectorAll("button[data-preset]")).toHaveLength(3);
    expect(ctx!.firstElementChild?.hasAttribute("data-presets-sep")).toBe(true);
    expect(container.querySelectorAll('[data-toolbar="outils"] button[data-preset]')).toHaveLength(3);
  });
  it("design-l2 L2-13 : barre en bande : rangée inchangée dans la barre, aucun [data-island-context]", () => {
    const { container } = setup({ ...outils, dock: "top" }, NO_CAPS, "m", PEN);
    expect(container.querySelector("[data-island-context]")).toBeNull();
    expect(container.querySelectorAll('[data-toolbar="outils"] > button[data-preset]')).toHaveLength(3);
  });
  it("design-l2 L2-8 : collapsed vrai : data-collapsed=\"1\" sur [data-toolbar] ; faux : aucun attribut", () => {
    const [c, setC] = createSignal(false);
    const { container } = render(() => (
      <Toolbar bar={{ ...outils, dock: "floating" }} caps={() => NO_CAPS} view={() => VIEW} size={() => "m"} host={host()} collapsed={c} />
    ));
    const bar = container.querySelector('[data-toolbar="outils"]')!;
    expect(bar.hasAttribute("data-collapsed")).toBe(false);
    setC(true);
    expect(bar.getAttribute("data-collapsed")).toBe("1");
  });
});
```

- [ ] **Étape 3 : tests rouges de l'application (`App.test.tsx`, en fin de fichier)**

```tsx
describe("App — design-l2 : îlots (L2-5, L2-6, L2-8, L2-13, L2-14, L2-19)", () => {
  const corner = (c: HTMLElement, k: string): Element => c.querySelector(`.rb-islands > .rb-corner[data-corner="${k}"]`)!;
  it("design-l2 L2-14 : defaut sans bande : grille « stage » seule ; calque .rb-islands enfant de .rb-layout", () => {
    const { container } = renderApp();
    const layout = container.querySelector<HTMLElement>(".rb-layout")!;
    expect(layout.style.gridTemplateAreas).toBe('"stage"');
    expect(container.querySelector(".rb-islands")?.parentElement).toBe(layout);
    expect(container.querySelector(".rb-floating")).toBeNull();
    expect(container.querySelector(".rb-slot")).toBeNull();
  });
  it("design-l2 L2-5 : menu puis onglets et #etat en haut à gauche ; panneaux en haut à droite ; historique en bas à gauche ; outils et pages centrés", () => {
    const { container } = renderApp();
    expect(corner(container, "top-start").querySelector('.rb-corner-menu > .rb-island[data-island="menu"]')).not.toBeNull();
    const head = corner(container, "top-start").querySelector('.rb-island.rb-head[data-island="onglets"]')!;
    expect(head.querySelector("[data-tabs]")).not.toBeNull();
    expect(head.nextElementSibling?.id).toBe("etat");
    expect(corner(container, "top-end").querySelector('[data-island="panneaux"] button[data-item="profiles"]')).not.toBeNull();
    expect(corner(container, "bottom-start").querySelector('[data-island="historique"] button[data-item="undo"]')).not.toBeNull();
    for (const id of ["outils", "pages"]) expect(container.querySelector(`.rb-islands > .rb-island[data-island="${id}"]`), id).not.toBeNull();
    expect(container.querySelectorAll("[data-island-grip]")).toHaveLength(1);
  });
  it("design-l2 L2-6 : rôle menu rendu par MenuBar ; liste fermée mais dans le DOM ; une ligne lance son action", () => {
    const { container, workspace } = renderApp();
    const toggle = container.querySelector('[data-toolbar="menu"] [data-menu-toggle]')!;
    expect(toggle.getAttribute("aria-haspopup")).toBe("menu");
    const list = container.querySelector<HTMLElement>('[data-toolbar="menu"] [data-menu-list]')!;
    expect(list.hidden).toBe(true);
    expect([...list.querySelectorAll('button[role="menuitem"]')].map((b) => b.getAttribute("data-item"))).toEqual(["file-new", "file-open", "file-import", "file-save", "file-save-as", "page-insert-file", "export-pdf", "export-iwb", "export-ubz", "grid", "settings"]);
    click(list.querySelector('button[data-item="export-pdf"]'));
    expect(workspace.exportPdf).toHaveBeenCalledTimes(1);
  });
  it("design-l2 L2-13 : préréglages dans l'îlot contextuel, à l'intérieur de [data-toolbar=\"outils\"]", () => {
    const { container } = renderApp();
    expect(container.querySelectorAll('[data-toolbar="outils"] > [data-island-context] button[data-preset]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-toolbar="outils"] button[data-preset]')).toHaveLength(3);
  });
  it("design-l2 L2-8 : Replier : data-collapsed sur la barre, gardé sur l'appareil, jamais dans le profil", () => {
    const device = createDeviceSettings(null);
    const { container, store } = renderApp({ device });
    click(container.querySelector('[data-island="outils"] [data-island-collapse]'));
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-collapsed")).toBe("1");
    expect(device.island("defaut", "outils")).toEqual({ at: null, collapsed: true });
    expect(store.get("defaut")?.toolbars.find((b) => b.id === "outils")?.collapsed).toBe(false);
  });
  it("design-l2 L2-5 : copie d'avant L2 (bandes, sans menu) : onglets et #etat en îlot au coin de la case de la scène, scène sous la bande", () => {
    const { container, store, active } = renderApp();
    store.save(beforeL4Copy("ancienne"));
    active.choose("ancienne");
    const layout = container.querySelector<HTMLElement>(".rb-layout")!;
    expect(layout.style.gridTemplateAreas).toBe('"outils" "stage" "pages"');
    expect(corner(container, "top-start").querySelector(".rb-corner-menu")?.children).toHaveLength(0);
    expect(corner(container, "top-start").querySelector('.rb-head[data-island="onglets"] [data-tabs]')).not.toBeNull();
    expect(container.querySelector("#etat")?.getAttribute("role")).toBe("status");
    expect(container.querySelector('[data-toolbar="outils"]')?.closest(".rb-slot")).not.toBeNull();
  });
  it("design-l2 H11 : rôle inconnu flottant : en haut à droite, après panneaux", () => {
    const { container, store, active } = renderApp();
    const odd: Bar = {
      id: "zoom", role: "zoom", dock: "floating", collapsed: false, rest: {},
      groups: [{ id: "z", rest: {}, items: [{ id: "fit-2", kind: "action", action: "fit-page", label: "Ajuster", requires: [], rest: {} }] }],
    };
    store.save({ ...BUILTIN_PROFILES[0]!, id: "zoome", label: "Zoomé", toolbars: [...BUILTIN_PROFILES[0]!.toolbars, odd] });
    active.choose("zoome");
    expect([...corner(container, "top-end").children].map((e) => e.getAttribute("data-island"))).toEqual(["panneaux", "zoom"]);
  });
  it("design-l2 L2-19 : en annotation, aucun îlot de barre n'est rendu ; la bande d'annotation seule", async () => {
    const a = fakeAnnotationUi();
    const { container } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    await a.control.enter();
    expect(container.querySelector('.rb-island[data-island="outils"]')).toBeNull();
    expect(container.querySelector('.rb-slot [data-toolbar="annotation"]')).not.toBeNull();
  });
});
```
  (ajouter `type Toolbar as Bar` à l'import de `../toolbar` s'il n'y est pas.)

- [ ] **Étape 4 : tests rouges des styles (`rb-css.test.ts`, en fin de fichier)**

```ts
describe("rb.css (design-l2)", () => {
  const own = (re: RegExp): string[] => (CSS.replace(/\/\*.*?\*\//g, "").match(/[^{}]+\{[^}]*\}/g) ?? []).filter((r) => re.test(r.split("{")[0]!));
  it("design-l2 L2-14 : calque des îlots dans la case de la scène, au-dessus d'elle, inerte ; îlots actifs", () => {
    expect(rule(".rb-islands")).toMatch(/grid-area: stage;.*position: relative;.*z-index: 2;.*pointer-events: none;/);
    expect(rule(".rb-island")).toMatch(/position: absolute;.*pointer-events: auto;/);
    expect(rule(".rb-corner")).toContain("pointer-events: none;");
  });
  it("design-l2 G5 : îlot et îlot contextuel blancs, rayon 12, filet gris 300, ombre de survol, largeur au contenu", () => {
    const look = /inline-size: max-content;.*background: var\(--rf-white\);.*border-radius: var\(--rf-radius-xl\);.*box-shadow: 0 0 0 1px var\(--rf-gray-300\), var\(--rf-shadow-hover\);/;
    expect(rule(".rb-island")).toMatch(look);
    expect(rule(".rb-context")).toMatch(look);
    expect(rule(".rb-context")).toContain("position: absolute;");
  });
  it("design-l2 L2-12 : coins à 16 px entiers ; aucune translation, colonne 1fr ni demi-pixel dans les règles des îlots", () => {
    expect(rule('.rb-corner[data-corner="top-start"]')).toContain("left: 16px; top: 16px;");
    expect(rule('.rb-corner[data-corner="top-end"]')).toContain("right: 16px; top: 16px;");
    expect(rule('.rb-corner[data-corner="bottom-start"]')).toContain("left: 16px; bottom: 16px;");
    const rules = own(/rb-island|rb-corner|rb-context|data-menu-list/);
    expect(rules.length).toBeGreaterThan(8);
    for (const r of rules) expect(r, r).not.toMatch(/translate|1fr|\d\.\d+px/);
  });
  it("design-l2 L2-30 (a), L2-16, L2-8 : barre qui défile dans l'îlot ; plusieurs rangées dans la place du panneau ; repliée : cachée", () => {
    expect(rule(".rb-island > .rb-bar")).toMatch(/min-inline-size: 0;.*overflow-x: auto;/);
    expect(rule('.rb-island[data-wrap="1"] > .rb-bar')).toContain("flex-wrap: wrap;");
    expect(rule('.rb-island .rb-bar[data-collapsed="1"]')).toContain("display: none;");
    expect(rule(".rb-island-chrome[data-island-grip]")).toContain("touch-action: none;");
  });
  it("design-l2 L2-13 : îlot contextuel vide caché ; séparateur de tête masqué", () => {
    expect(rule(".rb-context:empty")).toContain("display: none;");
    expect(rule(".rb-context > .rb-sep:first-child")).toContain("display: none;");
  });
  it("design-l2 L2-19 : en annotation, le calque des îlots est caché ; plus aucune règle .rb-floating", () => {
    expect(rule('.rb-layout[data-mode="annotation"] > .rb-islands, .rb-layout[data-mode="annotation"] > .rb-stages, .rb-layout[data-mode="annotation"] > .rb-popover, .rb-layout[data-mode="annotation"] > .rb-toasts')).toContain("display: none;");
    expect(CSS).not.toMatch(/rb-floating/);
  });
  it("design-l2 L2-5 : #etat vide sans fond, filet ni ombre, jamais display: none ; avec un message, en îlot", () => {
    expect(rule("#etat")).not.toMatch(/background|box-shadow|display: none/);
    expect(rule("#etat:not(:empty)")).toMatch(/background: var\(--rf-white\);.*border-radius: var\(--rf-radius-xl\);.*box-shadow: 0 0 0 1px var\(--rf-gray-300\), var\(--rf-shadow-hover\);/);
  });
  it("design-l2 L2-6 : lignes du menu = lignes du menu Profil ; liste en îlot de 320 px sous le bouton ; fermée : cachée", () => {
    expect(rule(":is([data-profiles], [data-menu-list]) button")).toMatch(/display: flex;.*align-items: center;.*gap: 12px;.*min-height: var\(--rb-btn-m\);.*font-size: 16px;/);
    expect(rule("[data-menu-list]")).toMatch(/position: absolute;.*inline-size: 320px;.*border-radius: var\(--rf-radius-xl\);.*box-shadow: 0 0 0 1px var\(--rf-gray-300\), var\(--rf-shadow-modal\);/);
    expect(rule("[data-menu-list][hidden]")).toContain("display: none;");
    expect(rule('.rb-bar button[data-menu-toggle][aria-expanded="true"]')).toMatch(/background: var\(--rf-violet-100\);.*color: var\(--rf-violet-700\);/);
  });
  it("design-l2 L2-15 : panneaux passagers en îlot, sous la rangée du haut ; menu Profil à droite ; barres du média au-dessus des pages", () => {
    expect(rule(".rb-popover")).toMatch(/border: 0;.*border-radius: var\(--rf-radius-xl\);.*box-shadow: 0 0 0 1px var\(--rf-gray-300\), var\(--rf-shadow-hover\);.*margin: 88px 0 0 16px;/);
    expect(rule('.rb-popover[data-panel="image"]')).toMatch(/justify-self: end;.*margin: 88px 16px 0 0;/);
    expect(rule('.rb-popover[data-panel="menu-profils"]')).toMatch(/justify-self: end;.*margin: 88px 16px 0 0;/);
    expect(rule(".rb-media-bar")).toContain("margin: 0 0 88px;");
  });
  it("design-l2 L2-16 : largeur du panneau des profils en --rb-sheet-w ; panneau et bibliothèque sur toute la hauteur", () => {
    expect(CSS).toContain("--rb-sheet-w: 600px;");
    expect(rule('.rb-popover[data-panel="profils"]')).toMatch(/inline-size: min\(var\(--rb-sheet-w\), 100%\);.*max-width: 100%;.*max-height: 100%;.*margin: 0;/);
    expect(rule('.rb-popover[data-panel="library"]')).toMatch(/align-self: stretch;.*margin: 0;/);
  });
  it("design-l2 L2-18 : la règle des libellés courts .iwb / .ubz est retirée", () => {
    expect(CSS).not.toMatch(/export-iwb/);
  });
  it("design-l2 L2-17 : onglets de 48 px ; montré en violet 100 / 700 ; point violet ; Fermer 44 px ; Nouvel onglet 48 px", () => {
    expect(rule(".rb-tab")).toMatch(/block-size: 48px;.*border-radius: var\(--rf-radius-lg\);.*font-size: 15px;/);
    expect(rule('.rb-tab[aria-selected="true"]')).toMatch(/background: var\(--rf-violet-100\);.*color: var\(--rf-violet-700\);/);
    expect(rule(".rb-tab-dirty")).toMatch(/inline-size: 8px;.*block-size: 8px;.*border-radius: 50%;.*background: var\(--rf-violet-600\);/);
    expect(rule(".rb-tab-close")).toMatch(/inline-size: 44px;.*block-size: 44px;/);
    expect(rule(".rb-tab-new")).toMatch(/inline-size: 48px;.*block-size: 48px;/);
  });
  it("design-l2 L2-21 : plus de trois barres : segments de 168 px (504 / 3) sur des rangées de trois", () => {
    expect(rule('.rb-radios[data-look="segment"]:has(> .rb-radio:nth-child(4))')).toContain("flex-wrap: wrap;");
    expect(rule('.rb-radios[data-look="segment"]:has(> .rb-radio:nth-child(4)) > .rb-radio')).toContain("flex: 0 0 168px;");
    expect(Number.isInteger((512 - 2 * 4) / 3)).toBe(true);
  });
});
```

- [ ] **Étape 5 : les voir rouges**

```bash
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/App.test.tsx src/ui/layout.test.ts src/ui/Toolbar.test.tsx src/ui/rb-css.test.ts 2>&1 | grep -E "Test Files|Tests |FAIL" | tail -30
```
Attendu : `FAIL` sur les tests `design-l2` et sur ceux de `layout.test.ts` (rangée `tabs` encore là).

- [ ] **Étape 6 : `layout.ts`** (lignes 7-22) :

```ts
/** Grille CSS (design-l2, L2-14) : seules les bandes ; barres top/bottom en lignes, left/right en colonnes, scène au
 *  centre. Onglets, `#etat` et barres `floating` vont dans le calque des îlots (`IslandLayer`), sur la case `stage`. */
export function layoutFor(bars: readonly { readonly id: string; readonly dock: Dock }[]): GridLayout {
  const at = (dock: Dock): string[] => bars.filter((b) => b.dock === dock).map((b) => b.id);
  const lefts = at("left");
  const rights = at("right");
  const cols = [...lefts, "stage", ...rights];
  const row = (cells: readonly string[]): string => `"${cells.join(" ")}"`;
  const full = (name: string): string => row(cols.map(() => name));
  const tops = at("top");
  const bottoms = at("bottom");
  const lines = [...tops.map(full), row(cols), ...bottoms.map(full)];
  return {
    areas: lines.join(" "),
    columns: [...lefts.map(() => "auto"), STAGE, ...rights.map(() => "auto")].join(" "),
    rows: [...tops.map(() => "auto"), STAGE, ...bottoms.map(() => "auto")].join(" "),
  };
}
```

- [ ] **Étape 7 : `Toolbar.tsx`** — dans `ToolbarProps`, après `mode` :

```ts
  /** design-l2 (L2-8) : barre repliée dans son îlot (poignée et Déplier seuls) ; absent : dépliée. */
  readonly collapsed?: Accessor<boolean>;
```
  et la fonction `Toolbar` (lignes 220-244) :

```tsx
export function Toolbar(props: ToolbarProps): JSX.Element {
  const items = createMemo(() => itemsForMode(props.bar, props.caps(), props.mode?.() ?? "board"));
  const ctx: Ctx = { view: props.view, host: props.host };
  /** Rangées contextuelles (C1 P18, C10a, C3, C7b) ; design-l2 (L2-13) : en `floating`, dans un îlot séparé posé sous la
   *  barre par Island.tsx, toujours à l'intérieur de [data-toolbar] ; en bande, inchangées dans la barre. */
  const rows = (): JSX.Element => (
    <>
      <Show when={props.presets !== undefined}>
        <PresetRow presets={() => props.presets?.() ?? {}} view={props.view} host={props.host} />
      </Show>
      <TableActionRow view={props.view} host={props.host} />
      <SelectionRow view={props.view} host={props.host} />
      <FormatRow view={props.view} act={(a) => props.host.textFormat(a)} />
    </>
  );
  return (
    <div
      class="rb-bar"
      data-toolbar={props.bar.id}
      data-role={props.bar.role}
      data-dock={props.bar.dock}
      data-size={props.size()}
      data-collapsed={props.collapsed?.() === true ? "1" : undefined}
      role="toolbar"
      aria-label={props.bar.id}
    >
      <For each={items()}>{(item) => RENDER[item.kind](item, ctx)}</For>
      <Show when={CONTEXT_ROLES.has(props.bar.role)}>
        <Show when={props.bar.dock === "floating"} fallback={rows()}>
          <div class="rb-context" data-island-context>
            {rows()}
          </div>
        </Show>
      </Show>
    </div>
  );
}
```

- [ ] **Étape 8 : `App.tsx`** — en-tête (lignes 1-7) :

```tsx
/**
 * Application SolidJS (lot 5b, T95 ; design-l2) : barres du profil actif placées selon leur `dock` — une barre ancrée a
 * sa case dans la grille (`layoutFor`), une barre `floating` est un îlot du calque `IslandLayer`, posé sur la case de la
 * scène avec l'îlot des onglets et `#etat` (L2-5, L2-14) ; la scène (`main.rb-stages`) n'occupe que sa case. Panneaux
 * passagers (réglages, grille, image, bibliothèque, profils) au-dessus des îlots.
 */
```
  Imports : ajouter `type Accessor` à l'import de `solid-js` ; `MENU_ROLE` et `itemsForMode` à l'import de
  `../toolbar` ; `import { IslandLayer } from "./Island";` et `import { MenuBar } from "./MenuBar";`.

  Remplacer `toolbarOf`, `BY_ROLE` et `barOf` (lignes 394-414) :

```tsx
  const toolbarOf = (bar: Bar, collapsed?: Accessor<boolean>): JSX.Element => (
    <Toolbar
      bar={bar}
      caps={props.active.capabilities}
      view={view}
      size={size}
      host={host}
      presets={bar.id === presetsBarId() ? () => profile().presets : undefined}
      mode={mode}
      {...(collapsed !== undefined ? { collapsed } : {})}
    />
  );
  /** Rendu d'une barre selon son rôle (table) ; tout autre rôle est une barre d'outils. design-l2 (L2-6) : `menu`. */
  const BY_ROLE: Readonly<Record<string, (bar: Bar) => JSX.Element>> = {
    pages: (bar) => (
      <PagesBar
        bar={bar}
        items={() => visibleItems(bar, props.active.capabilities())}
        view={state}
        size={size}
        runAction={(id) => host.runAction(id)}
        goTo={(index) => {
          const b = ws.active().board;
          const id = b.doc.pageIds()[index];
          if (id !== undefined) b.engine.showPage(id);
        }}
      />
    ),
    [MENU_ROLE]: (bar) => <MenuBar bar={bar} items={() => itemsForMode(bar, props.active.capabilities(), mode())} view={view} size={size} host={host} />,
  };
  const barOf = (bar: Bar, collapsed?: Accessor<boolean>): JSX.Element =>
    Object.hasOwn(BY_ROLE, bar.role) ? BY_ROLE[bar.role]!(bar) : toolbarOf(bar, collapsed);
  /** design-l2 : ce qui change la largeur d'un îlot centré (pages) ou sa rangée contextuelle (outil) : remesure. */
  const islandWatch = createMemo(() => `${state().pageCount}|${state().tool}`);
```

  Remplacer le début du rendu (lignes 416-443, de `return (` jusqu'à la fin du `<Show when={shownFloating()…}>`) :

```tsx
  return (
    <div
      class="rb-layout"
      data-mode={annotating() ? "annotation" : "board"}
      data-panneau={panel() === "editor" ? "profils" : undefined}
      style={{ "grid-template-areas": grid().areas, "grid-template-columns": grid().columns, "grid-template-rows": grid().rows }}
    >
      <For each={shownDocked()}>{(bar) => <div class="rb-slot" style={{ "grid-area": bar.id }}>{barOf(bar)}</div>}</For>
      {props.stages}
      <IslandLayer
        bars={shownFloating}
        render={(bar, collapsed) => barOf(bar, collapsed)}
        head={
          <TabsBar
            tabs={tabs}
            active={activeId}
            activate={(id) => {
              leaveEditing(); // avant : la zone de l'onglet quitté ne reste ni visible ni ouverte à la frappe
              ws.tabs.activate(id);
            }}
            close={(id) => void ws.close(id)}
            newTab={() => void ws.newBlank()}
          />
        }
        status={<p id="etat" role="status">{state().error ?? ""}</p>}
        profileId={() => profile().id}
        {...(props.device !== undefined ? { store: props.device } : {})}
        size={size}
        sheetOpen={() => panel() === "editor"}
        watch={islandWatch}
      />
      <Toasts />
```
  (la suite, `<Show when={selectedMedia()}>` et les panneaux, ne change pas.)

- [ ] **Étape 9 : `rb.css`** — modifications, dans l'ordre du fichier.

  `:root`, après `--rb-pad: 12px;` :
```css
  /* design-l2 (L2-16) : largeur du panneau des profils ; lue aussi par Island.tsx (place laissée aux îlots). */
  --rb-sheet-w: 600px;
```
  Supprimer les lignes 48-50 (commentaire « Barre des pages (C13, D17) » et règle `…:is([data-item="export-iwb"], …)`).

  Lignes 85-90 (annotation) :
```css
/* C11a (P20), design-l4 (L4-2, L4-16), design-l2 (L2-19) : en annotation, la fenêtre principale n'est que la barre
   montrée en annotation ; le calque des îlots (onglets, #etat compris) est caché. */
.rb-layout[data-mode="annotation"] > .rb-islands,
.rb-layout[data-mode="annotation"] > .rb-stages,
.rb-layout[data-mode="annotation"] > .rb-popover,
.rb-layout[data-mode="annotation"] > .rb-toasts { display: none; }
```
  Lignes 100-101 (`.rb-head`, `#etat`) remplacées par :
```css
/* design-l2 (L2-5) : #etat dans le groupe haut-gauche du calque ; vide : ni fond, ni filet, ni ombre (jamais
   display: none, la région reste annoncée) ; un message : îlot. */
#etat { margin: 0; color: #b91c1c; pointer-events: auto; }
#etat:not(:empty) { padding: 12px 16px; background: var(--rf-white); border-radius: var(--rf-radius-xl); box-shadow: 0 0 0 1px var(--rf-gray-300), var(--rf-shadow-hover); }
```
  Lignes 104-108 (`.rb-floating` et ses deux variantes du panneau ouvert) remplacées par :
```css
/* design-l2 (L2-14, L2-30, L2-12, D-DS2) : calque des îlots dans la case de la scène, au-dessus d'elle (z 2, sous les
   panneaux passagers en z 3) ; il ne prend aucun clic, ses îlots si. Coins posés à 16 px entiers ; îlots centrés placés
   en px entiers par Island.tsx (left, top, max-inline-size) ; aucune translation, aucune colonne fractionnaire. */
.rb-islands { grid-area: stage; position: relative; z-index: 2; min-inline-size: 0; min-block-size: 0; pointer-events: none; }
.rb-corner { position: absolute; display: flex; align-items: flex-start; gap: 8px; max-inline-size: calc(100% - 32px); pointer-events: none; }
.rb-corner[data-corner="top-start"] { left: 16px; top: 16px; }
.rb-corner[data-corner="top-end"] { right: 16px; top: 16px; }
.rb-corner[data-corner="bottom-start"] { left: 16px; bottom: 16px; }
.rb-corner-menu { display: flex; gap: 8px; }
.rb-corner-menu:empty { display: none; }
.rb-island { position: absolute; display: flex; align-items: center; gap: 4px; box-sizing: border-box; inline-size: max-content; min-inline-size: 0; padding: 4px; background: var(--rf-white); border-radius: var(--rf-radius-xl); box-shadow: 0 0 0 1px var(--rf-gray-300), var(--rf-shadow-hover); pointer-events: auto; }
.rb-corner .rb-island { position: relative; max-inline-size: 100%; }
/* L2-30 (a) : la barre défile dans l'îlot, poignée et Replier hors de la partie qui défile ; L2-16 : dans la place du
   panneau des profils, plusieurs rangées (L3-2) ; L2-8 : repliée, la barre est cachée. */
.rb-island > .rb-bar { flex: 0 1 auto; min-inline-size: 0; padding: 0; overflow-x: auto; flex-wrap: nowrap; }
.rb-island[data-wrap="1"] > .rb-bar { flex-wrap: wrap; overflow-x: visible; }
.rb-island .rb-bar[data-collapsed="1"] { display: none; }
.rb-island > .rb-tabs { flex: 0 1 auto; min-inline-size: 0; }
/* Poignée et Replier (L2-8, maquette 01 .grip) : hors profil ; la poignée prend le doigt sans faire défiler la page. */
.rb-island-chrome { display: grid; place-items: center; flex: none; align-self: stretch; inline-size: 48px; padding: 0; border: 0; border-radius: var(--rf-radius-lg); background: transparent; color: var(--rf-navy-500); cursor: pointer; }
.rb-island-chrome[data-island-grip] { inline-size: 24px; color: var(--rf-gray-500); cursor: grab; touch-action: none; user-select: none; -webkit-user-select: none; }
.rb-island-chrome:hover { background: var(--rf-gray-50); }
.rb-island-chrome:focus-visible { outline: 2px solid var(--rf-violet-600); outline-offset: -2px; }
/* L2-13 : rangée contextuelle en îlot séparé sous la barre (posé par Island.tsx), dans [data-toolbar] ; vide : cachée ;
   séparateur de tête masqué. */
.rb-context { position: absolute; display: flex; align-items: center; gap: 4px; box-sizing: border-box; inline-size: max-content; padding: 4px; background: var(--rf-white); border-radius: var(--rf-radius-xl); box-shadow: 0 0 0 1px var(--rf-gray-300), var(--rf-shadow-hover); }
.rb-context:empty { display: none; }
.rb-context > .rb-sep:first-child { display: none; }
/* design-l2 (L2-6, maquette 01 .menu) : bouton Menu violet quand la liste est ouverte ; liste en îlot de 320 px sous lui,
   lignes de 48 px icône + libellé (règles partagées avec le menu Profil plus bas). */
.rb-bar button[data-menu-toggle][aria-expanded="true"] { background: var(--rf-violet-100); color: var(--rf-violet-700); }
[data-menu-list] { position: absolute; left: 0; top: calc(100% + 8px); z-index: 3; display: grid; gap: 4px; inline-size: 320px; box-sizing: border-box; padding: 8px; background: var(--rf-white); border-radius: var(--rf-radius-xl); box-shadow: 0 0 0 1px var(--rf-gray-300), var(--rf-shadow-modal); }
[data-menu-list][hidden] { display: none; }
```
  Lignes 114-118 (`.rb-popover`, image, bibliothèque) remplacées par :
```css
/* design-l2 (L2-15, D-DS2) : panneaux passagers en îlot (rayon 12, filet, ombre) ; Réglages et Grille sous la rangée
   du haut (88 px), à gauche ; Image à droite (C5, I26, inchangé). */
.rb-popover { grid-area: stage; align-self: start; justify-self: start; z-index: 3; max-width: calc(100% - 32px); max-height: calc(100% - 104px); overflow: auto; background: var(--rf-white); border: 0; border-radius: var(--rf-radius-xl); box-shadow: 0 0 0 1px var(--rf-gray-300), var(--rf-shadow-hover); margin: 88px 0 0 16px; }
/* Panneau de l'image (C5, I26) : calé à droite, l'image déposée au centre ou à gauche reste visible. */
.rb-popover[data-panel="image"] { justify-self: end; margin: 88px 16px 0 0; }
/* Panneau de la bibliothèque (C4, D15) : recouvre la scène sur toute sa hauteur, calé à droite. */
.rb-popover[data-panel="library"] { justify-self: end; align-self: stretch; width: min(360px, 40vw); max-width: 100%; max-height: 100%; margin: 0; border-radius: 0; }
```
  Lignes 146-152 (onglets) remplacées par :
```css
/* Onglets (T101 ; design-l2 L2-17, maquette 01 .tab) : une rangée qui défile dans l'îlot des onglets ; onglets de
   48 px, montré en violet 100 / 700, point violet « modifié », Fermer 44 px, Nouvel onglet 48 px. */
.rb-tabs { display: flex; flex-wrap: nowrap; align-items: center; gap: 4px; min-inline-size: 0; overflow-x: auto; }
.rb-tab { display: inline-flex; align-items: center; gap: 8px; flex: none; block-size: 48px; box-sizing: border-box; padding: 0 4px 0 16px; border-radius: var(--rf-radius-lg); font-size: 15px; font-weight: 500; color: var(--rf-gray-800); white-space: nowrap; cursor: pointer; }
.rb-tab[aria-selected="true"] { background: var(--rf-violet-100); color: var(--rf-violet-700); font-weight: 600; }
.rb-tab-dirty { flex: none; inline-size: 8px; block-size: 8px; border-radius: 50%; background: var(--rf-violet-600); }
.rb-tab-close { display: grid; place-items: center; flex: none; inline-size: 44px; block-size: 44px; padding: 0; border: 0; border-radius: var(--rf-radius-md); background: transparent; color: var(--rf-text-muted-aa); cursor: pointer; }
.rb-tab[aria-selected="true"] .rb-tab-close { color: var(--rf-violet-700); }
.rb-tab-new { display: grid; place-items: center; flex: none; inline-size: 48px; block-size: 48px; padding: 0; border: 0; border-radius: var(--rf-radius-lg); background: transparent; color: var(--rf-navy-500); cursor: pointer; }
.rb-tab-close:hover, .rb-tab-new:hover { background: var(--rf-gray-50); }
.rb-tab:focus-visible, .rb-tab-close:focus-visible, .rb-tab-new:focus-visible { outline: 2px solid var(--rf-violet-600); outline-offset: -2px; }
```
  Ligne 177 (menu Profil) :
```css
.rb-popover[data-panel="menu-profils"] { justify-self: end; margin: 88px 16px 0 0; border: 0; border-radius: var(--rf-radius-xl); box-shadow: 0 0 0 1px var(--rf-gray-300), var(--rf-shadow-modal); }
```
  Lignes 179-184 : dans les cinq règles `[data-profiles] button…` sauf celle de `[aria-checked="true"]`, le sélecteur
  `[data-profiles] button` devient `:is([data-profiles], [data-menu-list]) button` (corps inchangés) :
  `:is([data-profiles], [data-menu-list]) button { … }`, `…button:not(:disabled):hover`, `…button:disabled`,
  `…button:disabled .rb-icon`, `…button:focus-visible`.

  Ligne 203 (panneau des profils) :
```css
.rb-popover[data-panel="profils"] { justify-self: end; align-self: stretch; inline-size: min(var(--rb-sheet-w), 100%); max-width: 100%; max-height: 100%; margin: 0; overflow: hidden; border: 0; border-radius: 0; box-shadow: 0 0 0 1px var(--rf-gray-300), var(--rf-shadow-modal); }
```
  Après la ligne 256 (`.rb-radios[data-look="segment"] .rb-radio[aria-checked="true"]`) :
```css
/* design-l2 (L2-21, H9) : plus de trois barres (six pour defaut), segments de 168 px (504 / 3) sur des rangées de trois. */
.rb-radios[data-look="segment"]:has(> .rb-radio:nth-child(4)) { flex-wrap: wrap; }
.rb-radios[data-look="segment"]:has(> .rb-radio:nth-child(4)) > .rb-radio { flex: 0 0 168px; }
```
  Ligne 312 (barre du média et de la 3D) : `margin-block-end: var(--rb-gap);` devient `margin: 0 0 88px;` (au-dessus de
  l'îlot des pages, L2-15) et le commentaire de la ligne 311 le dit.

- [ ] **Étape 10 : retouches de forme des tests existants** (et rien d'autre) :
  - `rb-css.test.ts:27` : `expect(keep).toEqual([".rb-tabs", ".rb-tab"]);` devient `expect(keep).toEqual([]);` (le
    titre du test dit « … plus aucun reste de la bande des onglets (L2-17) ») ;
  - `rb-css.test.ts:49` : `rule('.rb-tab[aria-selected="true"]')` attend
    `background: var(--rf-violet-100); color: var(--rf-violet-700);` au lieu de `border-color: var(--rf-violet-600);` ;
  - `rb-css.test.ts:125` : `inline-size: min\(600px, 100%\)` devient `inline-size: min\(var\(--rb-sheet-w\), 100%\)` ;
  - `rb-css.test.ts:205-209` (« design-l3 L3-2 : … barre flottante … ») : réécrit sur la règle d'îlot :
```ts
  it("design-l3 L3-2, design-l2 L2-16 : panneau des profils ouvert : la barre d'outils passe sur plusieurs rangées dans la place libre", () => {
    expect(rule('.rb-island[data-wrap="1"] > .rb-bar')).toContain("flex-wrap: wrap;");
    expect(rule('.rb-island[data-wrap="1"] > .rb-bar')).not.toMatch(/position/);
  });
```
  - `rb-css.test.ts:212` : `rule("[data-profiles] button")` devient `rule(":is([data-profiles], [data-menu-list]) button")` ;
  - `App.test.tsx:658` : `'.rb-floating [data-toolbar="annotation"]'` (posé en T1) devient
    `'.rb-islands [data-toolbar="annotation"]'` ;
  - un test de `Toolbar.test.tsx` qui lit un préréglage ou une rangée contextuelle comme enfant direct (`> `) d'une barre
    `floating` passe par `> [data-island-context] > ` ;
  - un test d'`App.test.tsx` qui cherche `.rb-head` ou la rangée `tabs` de la grille lit l'îlot
    `.rb-head[data-island="onglets"]` et la grille sans rangée `tabs`.
  Toute autre rougeur arrête la tâche (rapport).

- [ ] **Étape 11 : verts**

```bash
cd "$W" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/App.test.tsx src/ui/layout.test.ts src/ui/Toolbar.test.tsx src/ui/rb-css.test.ts --reporter=verbose 2>&1 | grep -E "design-l2|Test Files|Tests |FAIL" | tail -40
```
Attendu : `Test Files  4 passed (4)`, aucun `FAIL `.

- [ ] **Étape 12 : suite web entière, types, build** (tâche de fond, plus de 2 min) :

```bash
cd "$W" && node ~/.claude/scripts/vm/suite-vm.cjs -- nice -n 10 pnpm --filter @roomboard/web exec vitest run > "$HOME/.cache/tmp/of68-tmp/T6-web.log" 2>&1; echo "code $?" >> "$HOME/.cache/tmp/of68-tmp/T6-web.log"
tail -25 "$HOME/.cache/tmp/of68-tmp/T6-web.log"; grep -c "FAIL " "$HOME/.cache/tmp/of68-tmp/T6-web.log"
cd "$W" && nice -n 10 pnpm --filter @roomboard/web build > "$HOME/.cache/tmp/of68-tmp/T6-build.log" 2>&1; echo "build code $?"; grep -E "✓ built|error" "$HOME/.cache/tmp/of68-tmp/T6-build.log" | tail -5
```
Attendu : `code 0`, `0`, `build code 0`, `✓ built in`.

- [ ] **Étape 13 : commit**

```bash
cd "$W" && git add apps/web/src/ui/App.tsx apps/web/src/ui/App.test.tsx apps/web/src/ui/layout.ts apps/web/src/ui/layout.test.ts apps/web/src/ui/Toolbar.tsx apps/web/src/ui/Toolbar.test.tsx apps/web/src/ui/rb.css apps/web/src/ui/rb-css.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -F - <<'MSG'
feat(design-l2): floating islands over a full-height stage (layer, menu, context island, styles)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

### Tâche T7 — Essais existants retouchés en forme, aide `clickItem`, `s5b` adapté

<a id="tache-t7"></a>

**Objectif.** Les essais navigateur existants passent sur le build de L2 avec des retouches de forme seulement (L2-26,
cadrage § 3.4) : aide `clickItem(page, id)` qui ouvre le menu s'il le faut ; dock `top` → `floating` pour `defaut` ;
contrôles « la barre ne recouvre pas `#stage` » restreints aux bandes ; S2, S3, S6 de `design-l3` adaptés ; `s5b`
adapté sur le fond, comme le cadrage le demande (« scène = fenêtre, îlots entiers, sans chevauchement »).

**Fichiers.**
- Modifier : `scripts/essais/commun.mjs:102` (aides ajoutées après `item`)
- Modifier : `scripts/essais/s5b-navigateur.mjs:12`, `:93-108`, `:125`, `:133`
- Modifier : `scripts/essais/c7b-texte-riche-navigateur.mjs:217-221`
- Modifier : `scripts/essais/c1-profils-navigateur.mjs:127`, `:187`, `:243`
- Modifier : `scripts/essais/design-l1-navigateur.mjs:171`
- Modifier : `scripts/essais/design-l3-navigateur.mjs:18`, `:249`, `:296-301`, `:367`, `:372`, `:375-376`, `:412`,
  `:534-544`, `:557`
- Modifier : `scripts/essais/design-l4-navigateur.mjs:17`, `:181`, `:186`, `:196`
- Modifier : `scripts/essais/c4-bibliotheque-navigateur.mjs:13`, `:73`, `:145` ; `scripts/essais/c9-grille-navigateur.mjs:11`, `:40` ;
  `scripts/essais/c2-image-navigateur.mjs:12`, `:203` ; `scripts/essais/c12-pdf-navigateur.mjs:12`, `:92` ;
  `scripts/essais/c13-tableaux-navigateur.mjs:21`, `:216`, `:260`, `:263`

**Interfaces.**
- Consomme (T6, DOM) : `[data-menu-list]`, `[data-menu-toggle]` (dans le `[data-toolbar]` du menu), `.rb-island`
  (`data-island`), `[data-dock="floating"]` pour `outils` et `pages` de `defaut`, premier bouton d'`outils` = `select`.
- Produit (`scripts/essais/commun.mjs`) :
  ```js
  export async function openMenuOf(page, id): Promise<void>; // ouvre le menu qui contient item(id) s'il est fermé
  export async function clickItem(page, id): Promise<void>;  // openMenuOf puis page.click(item(id))
  export function islandBoxes(page): Promise<{ id, x, y, width, height }[]>; // .rb-island visibles, px de page
  export function clashes(boxes): string[];                  // paires « a/b » qui se chevauchent (tolérance 0,5 px)
  ```
- Réutilise : `scripts/essais/commun.mjs:102` — `item(id)` gardé, étendu par `clickItem(page, id): Promise<void>`
  (ligne « bouton d'essai d'un élément » du cadrage) ; `apart` (privé, `commun.mjs:124`) réutilisé par `clashes`.

**Test et commande bornée.** Rouge d'abord : `s5b` sur le build de T6, avant retouche.
```bash
W=/home/adminjd/projets/roomboard-wt/design-l2--T7
cd "$W" && nice -n 10 node scripts/essais/s5b-navigateur.mjs 2>&1 | tail -5
```
Attendu avant : `S5b : ÉCHEC` (dock `top` attendu) ; après : `S5b : OK`. Preuve finale : chaque ligne
`node scripts/essais/…-navigateur.mjs` du bloc `--e2e` de `scripts/verifier.sh` jouée une à une (étape 6), `code 0`
pour chacune dans `T7-e2e.log`, 0 `ÉCHEC`.

**Preuve visuelle.** Aucune capture ; les essais impriment les mesures (`la scène occupe toute la fenêtre (x 0, y 0,
1280 × 900)`, liste des îlots) : les recopier au rapport.

**Contraintes (recopiées).**
- G1 — TDD : rouge vu d'abord (essai joué avant retouche). Chaque tâche met à jour dans son commit tous les tests qu'elle
  fait rougir et finit verte seule ; deux tâches d'une même vague ne touchent jamais le même fichier (T8 ne touche ni
  `commun.mjs` ni ces essais).
- G2 — Comportement inchangé hors de l'aspect ; essais existants (`scripts/essais/*.mjs`, sélecteurs `data-item`) verts,
  retouchés seulement en forme (sauf les contrôles que le cadrage désigne comme inversés par L2 : s5b et c7b « aucune
  barre ne recouvre la scène »). Toute autre rougeur arrête la tâche : rapport, aucune retouche.
- G3 — Aucun test supprimé, désactivé ou sauté ; aucun seuil changé (les `≥ 640 px` restent).
- G7 — VM partagée : `nice -n 10` ; un essai qui échoue sur un délai se rejoue une fois ; commande de plus de 2 min en
  tâche de fond, sans boucle d'attente.
- G8 — Interdits : `git push --force`, `git add -A|.`, `git commit -a`, `git tag`, `gh release`, `rm -rf` d'un worktree,
  `tauri build`. Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un ; aucun push.
- G9 — Essais navigateur : build web fait d'abord (`nice -n 10 pnpm --filter @roomboard/web build`, comme
  `scripts/verifier.sh:56`) ; `node scripts/essais/<x>-navigateur.mjs` à la racine du worktree ; jamais `--captures`
  (une capture commitée ne se réécrit pas ici).
- G11 — Worktree `/home/adminjd/projets/roomboard-wt/design-l2--T7` ; temporaires dans `$HOME/.cache/tmp/of68-tmp/T7-*` ;
  aucun processus laissé (Chromium, serveur).

**Retouches autorisées** (cadrage L2-26, § 3.4 ; rien d'autre) : `[data-dock="top"]` → `floating` pour `outils` de
`defaut` ; clic d'un élément du menu par `clickItem` ; contrôle « la barre ne recouvre pas `#stage` » restreint aux
bandes ; S2 de `design-l3` : cible du tri = première ligne (`select` au lieu de `pen`) ; S6 de `design-l3` : îlot dans
la place libre au lieu du coin, et à 560 px « aucun îlot ne recouvre le panneau » ; un geste d'essai écrit en px de scène
qui tomberait sous un îlot se déplace hors des îlots (effet de bord du cadrage). `c1-profils-navigateur.mjs:201` garde
`top` (la fixture `1.2-outil-inconnu.rbprofile` est en `top`).

**Interdits.** Toucher `scripts/verifier.sh`, `scripts/tests/*`, `design-l2-navigateur.mjs` (T8), le code de
`apps/web` ; passer `--captures` ; réécrire une capture commitée ; retirer un `check`.

**Terminé quand.** `S5b : OK` ; chaque essai du bloc `--e2e` (27 lignes, hors `design-l2`) `code 0` ; un commit ;
rapport : liste fichier:ligne avant → après, sortie des mesures de `s5b`, et `Réutilisation : appelé commun.mjs (item, apart) étendu par clickItem`
ou `Réutilisation : écart — …`.

#### Étapes

- [ ] **Étape 0 : préparer le worktree et construire la page**

```bash
W=/home/adminjd/projets/roomboard-wt/design-l2--T7
cd "$W" && mkdir -p "$HOME/.cache/tmp/of68-tmp"
test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile --prefer-offline 2>&1 | tail -3
for d in wasm wasm-formats; do test -d "apps/web/src/$d" || cp -r "/home/adminjd/projets/roomboard-wt/design-l2/apps/web/src/$d" apps/web/src/; done
nice -n 10 pnpm --filter @roomboard/web build > "$HOME/.cache/tmp/of68-tmp/T7-build.log" 2>&1; echo "build code $?"
```
Attendu : `build code 0`.

- [ ] **Étape 1 : voir `s5b` rouge**

```bash
cd "$W" && nice -n 10 node scripts/essais/s5b-navigateur.mjs 2>&1 | tail -5
```
Attendu : `S5b : ÉCHEC — profil par défaut : [data-toolbar="outils"][data-dock="top"]`.

- [ ] **Étape 2 : aides de `commun.mjs`** — après `export const item = …` (ligne 102) :

```js
/** design-l2 (L2-26) : ouvre le menu qui contient l'élément `id` s'il est dans une liste de menu fermée ; sinon rien. */
export async function openMenuOf(page, id) {
  const sel = item(id);
  const list = page.locator(`[data-menu-list]:has(${sel})`);
  if ((await list.count()) === 0 || (await list.first().isVisible())) return;
  await page.click(`[data-toolbar]:has(${sel}) [data-menu-toggle]`);
  await list.first().waitFor({ state: "visible", timeout: 15000 });
}
/** design-l2 (L2-26) : clic sur l'élément `id`, menu ouvert d'abord s'il le faut (fichier, export, Grille, Réglages). */
export async function clickItem(page, id) {
  await openMenuOf(page, id);
  await page.click(item(id));
}
/** design-l2 : rectangles des îlots visibles (`.rb-island`), px de page, avec leur `data-island`. */
export function islandBoxes(page) {
  return page.$$eval(".rb-island", (els) =>
    els
      .map((e) => {
        const r = e.getBoundingClientRect();
        return { id: e.getAttribute("data-island"), x: r.x, y: r.y, width: r.width, height: r.height };
      })
      .filter((b) => b.width > 0 && b.height > 0),
  );
}
/** design-l2 : paires d'îlots qui se chevauchent (tolérance 0,5 px), « a/b ». */
export function clashes(boxes) {
  const out = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) if (!apart(boxes[i], boxes[j])) out.push(`${boxes[i].id}/${boxes[j].id}`);
  }
  return out;
}
```

- [ ] **Étape 3 : `s5b-navigateur.mjs`** — import (ligne 12) : ajouter `clashes, islandBoxes`. Le bloc 1 (lignes 93-108,
  du commentaire « 1. Page prête… » jusqu'au contrôle `box.height >= 640` compris) devient :

```js
  // 1. Page prête, profil par défaut (design-l2, L2-25, contrôle inversé par L2) : la scène occupe toute la fenêtre ; les
  //    îlots flottent au-dessus d'elle, entiers dans la fenêtre et sans chevauchement.
  await page.goto(url);
  await ready();
  check((await attr("data-tool")) === "pen", '#stage[data-tool="pen"] : outil Stylo au départ');
  check((await attr("data-page")) === "1/1", '#stage[data-page="1/1"]');
  check((await page.locator('[data-toolbar="outils"][data-dock="floating"]').count()) === 1, 'profil par défaut : [data-toolbar="outils"][data-dock="floating"]');
  check((await page.locator('[data-toolbar="pages"][data-dock="floating"]').count()) === 1, 'profil par défaut : [data-toolbar="pages"][data-dock="floating"]');
  const box = await stageBox(page);
  check(box.x === 0 && box.y === 0 && box.width === VIEWPORT.width && box.height === VIEWPORT.height, `la scène occupe toute la fenêtre (x ${box.x}, y ${box.y}, ${box.width} × ${box.height})`);
  const isl = await islandBoxes(page);
  const outside = isl.filter((b) => b.x < -0.5 || b.y < -0.5 || b.x + b.width > VIEWPORT.width + 0.5 || b.y + b.height > VIEWPORT.height + 0.5).map((b) => b.id);
  check(isl.length >= 6 && outside.length === 0, `îlots entiers dans la fenêtre (${isl.map((b) => b.id).join(", ")}${outside.length ? ` ; dehors : ${outside.join(", ")}` : ""})`);
  const clash = clashes(isl);
  check(clash.length === 0, `aucun îlot n'en recouvre un autre${clash.length ? ` (${clash.join(", ")})` : ""}`);
  check(box.height >= 640, `la scène garde au moins 640 px de haut (${box.height} px)`);
```
  Profil simple (ligne 125) : `overlapping(page, "button[data-item]")` devient
  `overlapping(page, '[data-toolbar="outils"] button[data-item]')`, message « profil simple : aucun bouton de la bande ne
  recouvre la scène (îlot des pages au-dessus d'elle, L2-2) ». Ligne 133 : `'[data-toolbar="outils"][data-dock="top"]'`
  devient `floating`, message « retour au profil par défaut : barre en îlot ».

- [ ] **Étape 4 : retouches de forme des autres essais** (une ligne chacune, sauf `design-l3` S6) :
  - `c7b-texte-riche-navigateur.mjs:217-221` :
```js
  const bars = await page.$$eval("[data-toolbar]", (els) => els.filter((e) => e.getBoundingClientRect().height > 0 && e.getAttribute("data-dock") !== "floating").map((e) => e.getAttribute("data-toolbar")));
  for (const id of bars) {
    const { apart } = await noOverlap(page, `[data-toolbar="${id}"]`);
    check(apart, `la barre en bande « ${id} » ne recouvre pas #stage, cellule ouverte`);
  }
  check(bars.length > 0 || (await page.locator(".rb-island").count()) > 0, `barres en bande mesurées : ${bars.join(", ") || "aucune, profil en îlots (design-l2)"}`);
```
  - `c1-profils-navigateur.mjs:127`, `:187`, `:243` : `${OUTILS}[data-dock="top"]` → `${OUTILS}[data-dock="floating"]`,
    « barre en haut » → « barre en îlot » ; `:201` inchangée.
  - `design-l1-navigateur.mjs:171` : `${OUTILS}[data-dock="top"]` → `${OUTILS}[data-dock="floating"]`.
  - `design-l4-navigateur.mjs` : import (`:17`) + `clickItem` ; `:181`, `:186`, `:196` : `await page.click(item("settings"));`
    → `await clickItem(page, "settings");`.
  - `c4-bibliotheque-navigateur.mjs` : import + `clickItem` ; `:73`, `:145` : `page.click(item("grid"))` →
    `clickItem(page, "grid")`.
  - `c9-grille-navigateur.mjs` : import + `clickItem` ; `:40` : idem.
  - `c2-image-navigateur.mjs` : import + `clickItem` ; `:203` : `page.click(item("file-import"))` → `clickItem(page, "file-import")`.
  - `c12-pdf-navigateur.mjs` : import + `clickItem` ; `:92` : `download(() => page.click(item("export-pdf")), "export.pdf")`
    → `download(() => clickItem(page, "export-pdf"), "export.pdf")`.
  - `c13-tableaux-navigateur.mjs` : import + `clickItem, openMenuOf` ; `:216` :
```js
  await openMenuOf(page, "export-iwb");
  check((await page.isVisible(item("export-iwb"))) && (await page.isVisible(item("export-ubz"))), "D17 : « Enregistrer une copie au format .iwb… » et « … .ubz… » dans le menu (design-l2, L2-4)");
  await page.keyboard.press("Escape");
```
    `:260`, `:263` : `page.click(item("export-iwb"))` → `clickItem(page, "export-iwb")`, de même pour `export-ubz`.
  - `design-l3-navigateur.mjs` : import (`:18`) + `clickItem` ; `:249`, `:367`, `:375`, `:412` :
    `${OUTILS}[data-dock="top"…]` → `${OUTILS}[data-dock="floating"…]` (messages « barre en haut » → « barre en îlot ») ;
    `:372`, `:376` : `page.click(item("settings"))` → `clickItem(page, "settings")` ; S2 (`:296-301`) :
    `box(page, row("pen"))` → `box(page, row("select"))` et `during === "pen"` → `during === "select"` (la première
    ligne d'`outils` est Sélection, L2-4) ; S6, lignes 534-544 (de `const fl = …` au second `check`) :
```js
  const fl = await box(page, '.rb-island[data-island="outils"]');
  const stages = await box(page, ".rb-stages");
  const buttons = await buttonsOf(page, OUTILS);
  const rows = new Set(buttons.map((b) => Math.round(b.y))).size;
  const p2 = await box(page, PANEL);
  const bad = buttons.filter((b) => !inside(b, SMALL) || !apart(b, p2));
  check(fl.x >= stages.x + 16 - 1 && fl.y > stages.y + 16 && fl.x + fl.width <= p2.x + 0.5, `S6 : îlot d'outils dans la place libre à gauche du panneau, sous la rangée du haut (${fl.x}, ${fl.y})`);
  check(rows >= 2 && buttons.length > 0 && bad.length === 0, `S6 : ${buttons.length} boutons sur ${rows} rangées, chacun entier dans la fenêtre et hors du panneau${bad.length ? ` (fautifs : ${bad.map((b) => b.id).join(", ")})` : ""}`);
```
    et la ligne 557 :
```js
  const over = await p3.evaluate((panelSel) => {
    const panel = document.querySelector(panelSel).getBoundingClientRect();
    const bad = [];
    for (const el of document.querySelectorAll(".rb-island")) {
      const r = el.getBoundingClientRect();
      const x0 = Math.max(r.left, panel.left), x1 = Math.min(r.right, panel.right), y0 = Math.max(r.top, panel.top), y1 = Math.min(r.bottom, panel.bottom);
      if (r.width === 0 || x1 - x0 < 1 || y1 - y0 < 1) continue;
      const top = document.elementFromPoint((x0 + x1) / 2, (y0 + y1) / 2);
      if (top !== null && el.contains(top)) bad.push(el.getAttribute("data-island"));
    }
    return bad;
  }, PANEL);
  check(over.length === 0, `S6 560 px : aucun îlot ne recouvre le panneau (L2-16)${over.length ? ` (fautifs : ${over.join(", ")})` : ""}`);
```
  Puis jouer chaque essai retouché ; un essai rouge sur une raison hors de la liste des retouches autorisées arrête la
  tâche (rapport). Point connu à surveiller : avec le panneau des profils ouvert, l'îlot `panneaux` (Profil,
  Bibliothèque) est sous le panneau (L2-16, H13) ; un essai qui clique Profil panneau ouvert est un cas hors liste :
  rapport, aucune retouche.

- [ ] **Étape 5 : `s5b` vert**

```bash
cd "$W" && nice -n 10 node scripts/essais/s5b-navigateur.mjs 2>&1 | tail -8
```
Attendu : `ok — la scène occupe toute la fenêtre (x 0, y 0, 1280 × 900)`, `ok — aucun îlot n'en recouvre un autre`,
`S5b : OK`.

- [ ] **Étape 6 : tout le bloc `--e2e`, essai par essai** (tâche de fond, ≈ 15 min ; `design-l2` n'existe pas ici) :

```bash
cd "$W" && grep -E '^\s+node scripts/essais/[a-z0-9-]+-navigateur\.mjs' scripts/verifier.sh | sed 's/^ *//' > "$HOME/.cache/tmp/of68-tmp/T7-essais.txt"
wc -l < "$HOME/.cache/tmp/of68-tmp/T7-essais.txt"
while read -r cmd; do echo "=== $cmd"; nice -n 10 $cmd 2>&1 | tail -4; echo "code ${PIPESTATUS[0]}"; done < "$HOME/.cache/tmp/of68-tmp/T7-essais.txt" > "$HOME/.cache/tmp/of68-tmp/T7-e2e.log" 2>&1
grep -c "^code 0" "$HOME/.cache/tmp/of68-tmp/T7-e2e.log"; grep -B6 "^code [1-9]" "$HOME/.cache/tmp/of68-tmp/T7-e2e.log" | head -60
```
Attendu : autant de `code 0` que de lignes (27), aucune sortie du second `grep`. Un essai qui échoue sur un délai se
rejoue une fois, seul.

- [ ] **Étape 7 : commit**

```bash
cd "$W" && for f in commun s5b-navigateur c7b-texte-riche-navigateur c1-profils-navigateur design-l1-navigateur design-l3-navigateur design-l4-navigateur c4-bibliotheque-navigateur c9-grille-navigateur c2-image-navigateur c12-pdf-navigateur c13-tableaux-navigateur; do git add "scripts/essais/$f.mjs"; done
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -F - <<'MSG'
test(design-l2): browser trials follow the islands (clickItem, floating dock, s5b full-height stage)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

### Tâche T8 — Essai `design-l2` au navigateur, `verifier.sh --e2e`, captures, comparaison à la maquette 01

<a id="tache-t8"></a>

**Objectif.** Prouver S1 à S6 au navigateur (L2-25) : essai neuf `scripts/essais/design-l2-navigateur.mjs`, rouge sur
le build « avant » (`main` @ bbbc597), vert sur L2 ; branché après `design-l3` dans le bloc `--e2e` de
`scripts/verifier.sh` et dans `scripts/tests/verifier-e2e.test.sh` ; `#stage` mesuré = fenêtre à 1280 × 900 et
1920 × 1080 ; contrôle de netteté du § 10 de `docs/plans/design-cadrage.md` (patron L1 / L3) ; captures avant et après à
2x de l'écran du tableau, recadrages lus à 100 % et recadrages de la maquette 01 ; écarts listés un par un et justifiés
dans `docs/essais/design-l2-comparaison.md`.

**Fichiers.**
- Créer : `scripts/essais/design-l2-navigateur.mjs`, `docs/essais/design-l2-comparaison.md`
- Créer (sortie de `--captures`) : `docs/essais/design-l2-avant-tableau.png`, `docs/essais/design-l2-apres-tableau.png`,
  `docs/essais/design-l2-apres-{menu,menu-ouvert,onglets,outils,prereglages,panneaux,historique,pages}.png`,
  `docs/essais/design-l2-maquette-{menu,menu-ouvert,onglets,outils,prereglages,panneaux,historique,pages}.png`
- Modifier : `scripts/verifier.sh:144-146` (après `design L3 : OK`), `scripts/tests/verifier-e2e.test.sh:28`

**Interfaces.**
- Consomme (T6, DOM) : `.rb-island[data-island="menu|onglets|outils|panneaux|historique|pages"]`,
  `[data-toolbar="outils"] [data-island-context]`, `[data-island-grip]`, `[data-island-collapse]`,
  `[data-toolbar="menu"] [data-menu-toggle]`, `[data-menu-list]`, `button[role="menuitem"][data-item]`,
  `.rb-tab[aria-selected="true"] .rb-tab-title`, `#stage`, `#pages`, `.rb-pages-list`, `[data-collapsed="1"]`.
- Produit : `node scripts/essais/design-l2-navigateur.mjs [--captures] [--dist <dossier> [--nom avant]]` ; code 0
  réussi, 1 échec (`design L2 : ÉCHEC — …`), 2 outil absent ; ligne `design L2 : OK`.
- Réutilise : `scripts/essais/nettete.mjs` — `pixelsOf(page, clip)`, `edgeRow(px, y, x0, x1, bg, ink)`,
  `fringes(px, bg, ink)`, `hex(s)` (mesure de netteté du § 10, comme `design-l3-navigateur.mjs:146-186`).
- Réutilise : `scripts/essais/commun.mjs` — `DIST`, `Echec`, `ROOT`, `frames`, `gitSha`, `inkIn`, `item`,
  `loadPlaywright`, `serve` (aucune aide neuve : le menu s'ouvre ici par `[data-menu-toggle]`, sans `clickItem`, pour
  que T7 et T8 restent disjoints).

**Test et commande bornée.**
```bash
W=/home/adminjd/projets/roomboard-wt/design-l2--T8
cd "$W" && nice -n 10 node scripts/essais/design-l2-navigateur.mjs --dist "$HOME/.cache/tmp/of68-design-l2-avant/apps/web/dist" 2>&1 | tail -4   # rouge
cd "$W" && nice -n 10 node scripts/essais/design-l2-navigateur.mjs 2>&1 | tee "$HOME/.cache/tmp/of68-tmp/T8-essai.log" | tail -60      # vert
bash scripts/tests/verifier-e2e.test.sh
```
Preuve : avant, `design L2 : ÉCHEC — S1 1280 × 900 : #stage mesure la fenêtre …` (code 1) ; après, `design L2 : OK`
(code 0) avec les lignes `ok — S1 1280 × 900 : #stage mesure la fenêtre (x 0, y 0, 1280 × 900)`,
`ok — S1 1920 × 1080 : #stage mesure la fenêtre (x 0, y 0, 1920 × 1080)`, `0 pixel intermédiaire`, `0 frange`,
`contre-épreuve … (≥ 2)` ; `verifier-e2e.test.sh : OK`.

**Preuve visuelle.** `--captures` (étape 8) : `design-l2-avant-tableau.png` et `design-l2-apres-tableau.png`
(3840 × 2160), huit recadrages après et huit de la maquette ; chaque recadrage est lu à 100 % (outil de lecture
d'image) à côté de son pendant de la maquette, et chaque écart est écrit dans `design-l2-comparaison.md`. Les mesures de
l'essai (positions d'îlots imprimées par S1, rangées de gris de S5) passent avant l'image regardée.

**Contraintes (recopiées).**
- G1 — TDD : essai rouge vu d'abord (sur le build « avant ») ; test de `verifier-e2e.test.sh` rouge avant la ligne de
  `verifier.sh`. Deux tâches d'une même vague ne touchent jamais le même fichier (T7 ne touche ni `verifier.sh` ni ce
  fichier).
- G2 — Comportement inchangé hors de l'aspect ; aucun autre essai retouché ici.
- G3 — Aucun test supprimé, désactivé ou sauté ; aucun seuil changé.
- G5 — Netteté : positions d'îlot en px entiers (S1 le mesure) ; § 10 : 0 pixel intermédiaire au bord, 0 frange.
- G7 — VM partagée : `nice -n 10` ; un essai qui échoue sur un délai se rejoue une fois ; commande de plus de 2 min en
  tâche de fond, sans boucle d'attente.
- G8 — Interdits : `git push --force`, `git add -A|.`, `git commit -a`, `git tag`, `gh release`, `rm -rf` d'un worktree,
  `tauri build`. Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un ; aucun push.
- G9 — Essais navigateur : build web fait d'abord (`nice -n 10 pnpm --filter @roomboard/web build`, comme
  `scripts/verifier.sh:56`) ; `node scripts/essais/design-l2-navigateur.mjs` à la racine du worktree ; `verifier.sh
  --e2e` ne passe jamais `--captures`.
- G11 — Worktree `/home/adminjd/projets/roomboard-wt/design-l2--T8` ; build « avant » dans
  `$HOME/.cache/tmp/of68-design-l2-avant` (worktree détaché, laissé en place pour l'étage 4, jamais `rm -rf`) ;
  temporaires dans `$HOME/.cache/tmp/of68-tmp/T8-*` ; aucun processus laissé.

**Interdits.** Toucher `scripts/essais/commun.mjs` ou un autre essai (T7) ; le code de `apps/web` (une rougeur de
l'essai sur L2 qui vient du code : rapport, aucune retouche) ; `--captures` dans `verifier.sh` ; lancer
`scripts/verifier.sh` entier (passe de l'étage 4).

**Terminé quand.** Rouge sur l'avant, vert sur L2 ; `verifier-e2e.test.sh : OK` ; 18 PNG ; `design-l2-comparaison.md`
écrit (netteté recopiée de la sortie, un écart par ligne avec sa raison) ; un commit ; rapport avec la sortie de l'essai
(lignes `ok —` de S1 et S5), le chemin du build « avant » et `Réutilisation : appelé nettete.mjs (pixelsOf, edgeRow, fringes, hex)`
ou `Réutilisation : écart — …`.

#### Étapes

- [ ] **Étape 0 : préparer le worktree ; build « avant » en tâche de fond**

```bash
W=/home/adminjd/projets/roomboard-wt/design-l2--T8
AVANT="$HOME/.cache/tmp/of68-design-l2-avant"
cd "$W" && mkdir -p "$HOME/.cache/tmp/of68-tmp"
test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile --prefer-offline 2>&1 | tail -3
for d in wasm wasm-formats; do test -d "apps/web/src/$d" || cp -r "/home/adminjd/projets/roomboard-wt/design-l2/apps/web/src/$d" apps/web/src/; done
test -d "$AVANT" || git -C "$W" worktree add --detach "$AVANT" bbbc597
for d in wasm wasm-formats; do test -d "$AVANT/apps/web/src/$d" || cp -r "/home/adminjd/projets/roomboard-wt/design-l2/apps/web/src/$d" "$AVANT/apps/web/src/"; done
(cd "$AVANT" && (test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile --prefer-offline > "$HOME/.cache/tmp/of68-tmp/T8-avant-install.log" 2>&1) && nice -n 10 pnpm --filter @roomboard/web build > "$HOME/.cache/tmp/of68-tmp/T8-avant-build.log" 2>&1; echo "build avant code $?")
```
(les modules Wasm ne changent pas dans L2, L2-27 : la copie vaut pour `main` @ bbbc597.) Attendu : `build avant code 0`.

- [ ] **Étape 1 : test rouge du branchement** — `scripts/tests/verifier-e2e.test.sh`, après la ligne 28 :

```bash
# design L2 : ligne à part, comme design L3.
grep -q "scripts/essais/design-l2-navigateur.mjs" scripts/verifier.sh || ko "design-l2-navigateur absent de verifier.sh"
```
```bash
cd "$W" && bash scripts/tests/verifier-e2e.test.sh; echo "code $?"
```
Attendu : `ECHEC : design-l2-navigateur absent de verifier.sh`, `code 1`.

- [ ] **Étape 2 : l'essai** — créer `scripts/essais/design-l2-navigateur.mjs` :

```js
#!/usr/bin/env node
// Essai design L2 au navigateur (docs/plans/design-l2-cadrage.md, L2-25 ; S1 à S6) : îlots flottants au-dessus de la
// scène, #stage de la taille de la fenêtre, menu à la souris et au clavier, barre d'outils déplacée, repliée et retrouvée
// (souris, doigt, clavier), bande par le profil et annotation, netteté du § 10 du cadrage design (Rectangle de l'îlot
// d'outils, texte de l'onglet montré, contre-épreuve), format .rbprofile inchangé, petits écrans et trente pages.
// Faux hôte `?annotation=faux`, `?fichiers=repli`. Chromium de Playwright, --disable-lcd-text, --force-color-profile=srgb.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Joué par scripts/verifier.sh --e2e, jamais avec --captures.
// Usage : node scripts/essais/design-l2-navigateur.mjs [--captures] [--dist <dossier> [--nom avant]]
//   --captures : docs/essais/design-l2-<nom>-tableau.png (écran du tableau, 1920 × 1080 à 2x) ; pour l'après, les
//                recadrages design-l2-apres-<zone>.png et ceux de la maquette 01 (design-l2-maquette-<zone>.png) ;
//                --dist : sert un autre build ; --nom avant : captures seules.
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DIST, Echec, ROOT, frames, gitSha, inkIn, item, loadPlaywright, serve } from "./commun.mjs";
import { edgeRow, fringes, hex, pixelsOf } from "./nettete.mjs";

const LABEL = "design L2";
const MID = { width: 1280, height: 900 };
const BIG = { width: 1920, height: 1080 };
const SMALL = { width: 1024, height: 768 };
const TABLET = { width: 768, height: 700 };
const NARROW = { width: 560, height: 700 };
const ARGS = ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"];
const ISLAND = (id) => `.rb-island[data-island="${id}"]`;
const TOOLS = ISLAND("outils");
const OUTILS = '[data-toolbar="outils"]';
const CONTEXT = `${OUTILS} [data-island-context]`;
const GRIP = `${TOOLS} [data-island-grip]`;
const COLLAPSE = `${TOOLS} [data-island-collapse]`;
const TOGGLE = '[data-toolbar="menu"] [data-menu-toggle]';
const LIST = '[data-toolbar="menu"] [data-menu-list]';
const PANEL = '.rb-popover[data-panel="profils"]';
const EDITOR = "[data-profile-editor]";
const tile = (d) => `[data-edit-bar="outils"] [data-edit="dock"] [data-choice="${d}"]`;
const MENU_ROWS = ["file-new", "file-open", "file-import", "file-save", "file-save-as", "page-insert-file", "export-pdf", "export-iwb", "export-ubz", "grid", "settings"];
const ISLANDS = ["menu", "onglets", "outils", "panneaux", "historique", "pages"];
const BAR_KEYS = ["id", "role", "dock", "collapsed", "groups"];
const WHITE = hex("#ffffff");
const NAVY = hex("#182946");
const VIOLET_100 = hex("#EDE8FD");
const VIOLET_700 = hex("#4F35C4");
const MAQUETTE = join(ROOT, "docs", "design", "maquettes", "01-tableau");
/** Zones comparées à la maquette 01 : sélecteur de l'application, puis de la maquette ; `open` : menu ouvert. */
const ZONES = {
  menu: { app: ISLAND("menu"), maquette: '.island:has(> .btn[aria-label="Menu"])' },
  "menu-ouvert": { app: LIST, maquette: "nav.menu", open: true },
  onglets: { app: ISLAND("onglets"), maquette: ".island.tabs" },
  outils: { app: TOOLS, maquette: "#outils" },
  prereglages: { app: CONTEXT, maquette: '.island[aria-label="Préréglages du stylo"]' },
  panneaux: { app: ISLAND("panneaux"), maquette: '.island:has(> .btn[aria-label="Bibliothèque"])' },
  historique: { app: ISLAND("historique"), maquette: '.island:has(> .btn[aria-label="Annuler"])' },
  pages: { app: ISLAND("pages"), maquette: '.island[aria-label="Pages"]' },
};
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const check = (cond, msg) => {
  if (!cond) throw new Echec(msg);
  console.log(`ok — ${msg}`);
};

function watch(page) {
  const w = { errors: [] };
  page.on("pageerror", (e) => w.errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") w.errors.push(m.text());
  });
  page.on("dialog", (d) => void d.accept());
  return w;
}
const noErrors = (w, label) => check(w.errors.length === 0, `${label} : aucune erreur dans la page${w.errors.length ? ` : ${w.errors.join(" | ")}` : ""}`);
async function ready(page) {
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await frames(page);
}
async function waitFor(page, sel, state = "attached") {
  await page.waitForSelector(sel, { state, timeout: 15000 });
  await frames(page);
}
async function box(page, sel) {
  const b = await page.locator(sel).first().boundingBox();
  if (!b) throw new Echec(`boîte absente : ${sel}`);
  return b;
}
const inside = (b, vp) => b.x >= -0.5 && b.y >= -0.5 && b.x + b.width <= vp.width + 0.5 && b.y + b.height <= vp.height + 0.5;
const apart = (a, b) => a.x + a.width <= b.x + 0.5 || b.x + b.width <= a.x + 0.5 || a.y + a.height <= b.y + 0.5 || b.y + b.height <= a.y + 0.5;
const whole = (b) => Number.isInteger(b.x) && Number.isInteger(b.y);
const near = (a, b) => Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5;
function clashes(boxes) {
  const e = Object.entries(boxes);
  const out = [];
  for (let i = 0; i < e.length; i++) for (let j = i + 1; j < e.length; j++) if (!apart(e[i][1], e[j][1])) out.push(`${e[i][0]}/${e[j][0]}`);
  return out;
}
const clipOf = (b) => {
  const x = Math.floor(b.x);
  const y = Math.floor(b.y);
  return { x, y, width: Math.ceil(b.x + b.width) - x, height: Math.ceil(b.y + b.height) - y };
};
async function openMenu(page) {
  if (await page.locator(LIST).isVisible()) return;
  await page.click(TOGGLE);
  await waitFor(page, LIST, "visible");
}
async function chooseProfile(page, id) {
  await page.click(item("profiles"));
  await waitFor(page, "[data-profiles]");
  await page.click(`[data-profile="${id}"]`);
  await frames(page);
}
async function openEditor(page) {
  await page.click(item("profiles"));
  await waitFor(page, "[data-profiles]");
  await page.click('[data-profile-cmd="edit"]');
  await waitFor(page, EDITOR);
}
async function closeEditor(page) {
  await page.click('button[data-edit="close"]');
  await waitFor(page, EDITOR, "detached");
}
async function gripCenter(page) {
  const g = await box(page, GRIP);
  return [Math.round(g.x + g.width / 2), Math.round(g.y + g.height / 2)];
}
async function mouseDrag(page, dx, dy, { cancel = false } = {}) {
  const [x, y] = await gripCenter(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(x + (dx * i) / 10, y + (dy * i) / 10);
  if (cancel) await page.keyboard.press("Escape");
  await page.mouse.up();
  await frames(page);
}
async function touchDrag(page, cdp, dx, dy) {
  const [x, y] = await gripCenter(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (let i = 1; i <= 10; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: Math.round(x + (dx * i) / 10), y: Math.round(y + (dy * i) / 10) }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await frames(page);
}
/** Îlots tracés par-dessus le panneau : le point au centre de leur recouvrement leur appartient. */
const islandsOverPanel = (page) =>
  page.evaluate((panelSel) => {
    const panel = document.querySelector(panelSel).getBoundingClientRect();
    const bad = [];
    for (const el of document.querySelectorAll(".rb-island")) {
      const r = el.getBoundingClientRect();
      const x0 = Math.max(r.left, panel.left);
      const x1 = Math.min(r.right, panel.right);
      const y0 = Math.max(r.top, panel.top);
      const y1 = Math.min(r.bottom, panel.bottom);
      if (r.width === 0 || x1 - x0 < 1 || y1 - y0 < 1) continue;
      const top = document.elementFromPoint((x0 + x1) / 2, (y0 + y1) / 2);
      if (top !== null && el.contains(top)) bad.push(el.getAttribute("data-island"));
    }
    return bad;
  }, PANEL);
/** Toutes les clés d'un JSON, à toute profondeur. */
const keysDeep = (v) => (Array.isArray(v) ? v.flatMap(keysDeep) : v !== null && typeof v === "object" ? Object.entries(v).flatMap(([k, x]) => [k, ...keysDeep(x)]) : []);

async function iconPixels(page, sel) {
  return pixelsOf(page, await box(page, `${sel} svg.rb-icon`));
}
/** § 10 : rangée du milieu (y = 24 à 2x) d'une icône à droites pures : 0 pixel intermédiaire, deux traits de 3 pixels. */
async function cleanRow(page, sel, bg, ink, label) {
  const px = await iconPixels(page, sel);
  check(px.width === 48 && px.height === 48, `${label} : capture ${px.width} × ${px.height} pixels (48 × 48)`);
  const r = edgeRow(px, 24, 0, px.width, bg, ink);
  console.log(`rangée de ${label} (gris, 2x) : ${r.gray.join(" ")}`);
  check(r.intermediate === 0 && JSON.stringify(r.runs) === "[3,3]", `${label} : 0 pixel intermédiaire, traits ${JSON.stringify(r.runs)}`);
  check(fringes(px, bg, ink) === 0, `${label} : 0 frange`);
}
/** Contre-épreuve : un témoin sans calage (viewBox 0 0 24 24) doit montrer du flou, sinon la mesure est aveugle. */
async function counterProof(page) {
  await page.evaluate(() => {
    const ns = "http://www.w3.org/2000/svg";
    const host = document.createElement("div");
    host.id = "temoin-nettete";
    host.style.cssText = "position:fixed;left:200px;top:400px;width:24px;height:24px;background:#ffffff;color:#182946;z-index:50";
    const svg = document.createElementNS(ns, "svg");
    const attrs = { viewBox: "0 0 24 24", width: "24", height: "24", fill: "none", stroke: "currentColor", "stroke-width": "1.5", "stroke-linecap": "round", "stroke-linejoin": "round" };
    for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, v);
    svg.style.display = "block";
    const rect = document.createElementNS(ns, "rect");
    for (const [k, v] of Object.entries({ width: "18", height: "18", x: "3", y: "3", rx: "2" })) rect.setAttribute(k, v);
    svg.append(rect);
    host.append(svg);
    document.body.append(host);
  });
  await frames(page);
  const px = await pixelsOf(page, { x: 200, y: 400, width: 24, height: 24 });
  const r = edgeRow(px, 24, 0, px.width, WHITE, NAVY);
  console.log(`contre-épreuve (viewBox 0 0 24 24, gris) : ${r.gray.join(" ")}`);
  await page.evaluate(() => document.getElementById("temoin-nettete")?.remove());
  check(r.intermediate >= 2, `contre-épreuve : le témoin sans calage donne ${r.intermediate} pixels intermédiaires (≥ 2), la mesure n'est pas aveugle`);
}

/** S1 : tableau en îlots, scène pleine hauteur (1280 × 900 et 1920 × 1080), encre au centre ; Simple : bande à gauche. */
async function s1(browser, base) {
  for (const vp of [MID, BIG]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const w = watch(page);
    await page.goto(`${base}/?fichiers=repli`);
    await ready(page);
    const st = await box(page, "#stage");
    check(st.x === 0 && st.y === 0 && st.width === vp.width && st.height === vp.height, `S1 ${vp.width} × ${vp.height} : #stage mesure la fenêtre (x ${st.x}, y ${st.y}, ${st.width} × ${st.height})`);
    const boxes = {};
    for (const id of ISLANDS) boxes[id] = await box(page, ISLAND(id));
    boxes.prereglages = await box(page, CONTEXT);
    console.log(`îlots ${vp.width} × ${vp.height} : ${Object.entries(boxes).map(([k, b]) => `${k} ${b.x},${b.y} ${b.width}×${b.height}`).join(" ; ")}`);
    const out = Object.entries(boxes).filter(([, b]) => !inside(b, vp)).map(([k]) => k);
    check(out.length === 0, `S1 ${vp.width} : sept îlots visibles, entiers dans la fenêtre${out.length ? ` (dehors : ${out.join(", ")})` : ""}`);
    const frac = Object.entries(boxes).filter(([, b]) => !whole(b)).map(([k, b]) => `${k} (${b.x}, ${b.y})`);
    check(frac.length === 0, `S1 ${vp.width} : positions entières${frac.length ? ` (fractionnaires : ${frac.join(", ")})` : ""}`);
    const clash = clashes(boxes);
    check(clash.length === 0, `S1 ${vp.width} : aucun îlot n'en recouvre un autre${clash.length ? ` (${clash.join(", ")})` : ""}`);
    const cx = Math.round(st.width / 2);
    const cy = Math.round(st.height / 2);
    await page.mouse.move(cx - 100, cy);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(cx - 100 + 20 * i, cy);
    await page.mouse.up();
    await frames(page);
    const ink = await inkIn(page, [cx - 90, cy - 6, cx + 90, cy + 6]);
    check(ink > 0, `S1 ${vp.width} : trait au centre de la page, encre présente (${ink} pixels)`);
    if (vp === MID) {
      await chooseProfile(page, "simple");
      await waitFor(page, `${OUTILS}[data-dock="left"]`);
      const s2 = await box(page, "#stage");
      const bar = await box(page, OUTILS);
      check(s2.y === 0 && s2.height === vp.height && s2.x >= bar.x + bar.width - 0.5, `S1 Simple : bande à gauche, #stage garde la hauteur de la fenêtre (y ${s2.y}, ${s2.height} px, x ${s2.x})`);
      check(inside(await box(page, ISLAND("pages")), vp), "S1 Simple : îlot des pages entier dans la fenêtre");
      await chooseProfile(page, "defaut");
    }
    noErrors(w, `S1 ${vp.width}`);
    await ctx.close();
  }
}

/** S2 : menu ; lignes icône + libellé ; Grille sous la rangée du haut ; Échap ; Enregistrer ; clavier jusqu'au PDF. */
async function s2(browser, base) {
  const ctx = await browser.newContext({ viewport: MID, deviceScaleFactor: 1, acceptDownloads: true });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  check(!(await page.locator(LIST).isVisible()) && (await page.getAttribute(TOGGLE, "aria-expanded")) === "false", "S2 : menu fermé au départ (aria-expanded=false)");
  await openMenu(page);
  const rows = await page.$$eval(`${LIST} button[role="menuitem"]`, (bs) => bs.map((b) => ({ id: b.dataset.item, icon: b.querySelector("svg.rb-icon")?.getAttribute("data-icon") ?? null, label: (b.textContent ?? "").trim() })));
  check(JSON.stringify(rows.map((r) => r.id)) === JSON.stringify(MENU_ROWS), `S2 : lignes du menu dans l'ordre (${rows.map((r) => r.id).join(", ")})`);
  check(rows.every((r) => r.icon !== null && r.label !== ""), "S2 : chaque ligne a une icône et un libellé");
  const r0 = await box(page, `${LIST} button[role="menuitem"]`);
  check(Math.abs(r0.height - 48) < 0.5, `S2 : lignes de 48 px (${r0.height})`);
  await page.click(item("grid"));
  await waitFor(page, "#grille", "visible");
  const gp = await box(page, ".rb-popover:has(#grille)");
  check(!(await page.locator(LIST).isVisible()) && gp.y >= 88 - 0.5 && gp.x <= 16.5, `S2 : « Grille » ferme le menu ; panneau sous la rangée du haut, à gauche (${gp.x}, ${gp.y})`);
  await openMenu(page);
  await page.click(item("grid"));
  await waitFor(page, "#grille", "detached");
  await openMenu(page);
  await page.keyboard.press("Escape");
  await frames(page);
  const back = await page.evaluate(() => document.activeElement?.hasAttribute("data-menu-toggle") === true);
  check(!(await page.locator(LIST).isVisible()) && back, "S2 : Échap ferme le menu, focus rendu au bouton Menu");
  const saved = page.waitForEvent("download");
  await openMenu(page);
  await page.click(item("file-save"));
  const file = await saved;
  check(file.suggestedFilename().endsWith(".roomboard"), `S2 : « Enregistrer » du menu télécharge ${file.suggestedFilename()}`);
  await page.focus(TOGGLE);
  await page.keyboard.press("Enter");
  await waitFor(page, LIST, "visible");
  const first = await page.evaluate(() => document.activeElement?.getAttribute("data-item"));
  check(first === "file-new", `S2 clavier : Entrée ouvre le menu, focus sur la première ligne (${first})`);
  for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowDown");
  const on = await page.evaluate(() => document.activeElement?.getAttribute("data-item"));
  check(on === "export-pdf", `S2 clavier : six flèches bas mènent à « Exporter en PDF… » (${on})`);
  const pdf = page.waitForEvent("download", { timeout: 60000 });
  await page.keyboard.press("Enter");
  const exported = await pdf;
  check(exported.suggestedFilename().endsWith(".pdf"), `S2 clavier : Entrée télécharge ${exported.suggestedFilename()}`);
  noErrors(w, "S2");
  await ctx.close();
}

/** S3 : glisser (souris, doigt), rechargement, repli, clavier, fenêtre réduite, changement de profil, Échap. */
async function s3(browser, base) {
  const ctx = await browser.newContext({ viewport: MID, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  const w = watch(page);
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  const t0 = await box(page, TOOLS);
  await mouseDrag(page, 0, 300);
  const t1 = await box(page, TOOLS);
  const c1 = await box(page, CONTEXT);
  check(Math.abs(t1.x - t0.x) <= 1 && Math.abs(t1.y - (t0.y + 300)) <= 1 && whole(t1), `S3 souris : l'îlot suit la poignée de 300 px (y ${t0.y} → ${t1.y})`);
  check(c1.y >= t1.y + t1.height - 0.5, `S3 : la rangée des préréglages reste sous l'îlot (y ${c1.y})`);
  await page.reload();
  await ready(page);
  const t2 = await box(page, TOOLS);
  check(near(t2, t1), `S3 : rechargé, même position (${t2.x}, ${t2.y})`);
  await page.click(COLLAPSE);
  await waitFor(page, `${OUTILS}[data-collapsed="1"]`);
  const shown = await page.$$eval(`${TOOLS} button`, (bs) => bs.filter((b) => b.getClientRects().length > 0).map((b) => (b.hasAttribute("data-island-grip") ? "grip" : b.hasAttribute("data-island-collapse") ? "collapse" : (b.dataset.item ?? "?"))));
  check(JSON.stringify(shown) === JSON.stringify(["grip", "collapse"]) && (await page.getAttribute(COLLAPSE, "aria-expanded")) === "false", `S3 replié : poignée et Déplier seuls (${shown.join(", ")})`);
  await page.reload();
  await ready(page);
  check((await page.locator(`${OUTILS}[data-collapsed="1"]`).count()) === 1, "S3 : rechargé, toujours replié");
  await page.click(COLLAPSE);
  await waitFor(page, `${OUTILS}:not([data-collapsed])`);
  check(await page.isVisible(item("rect")), "S3 : Déplier rend les outils");
  const t3 = await box(page, TOOLS);
  await touchDrag(page, cdp, 0, -100);
  const t4 = await box(page, TOOLS);
  check(Math.abs(t4.y - (t3.y - 100)) <= 1 && Math.abs(t4.x - t3.x) <= 1, `S3 doigt : l'îlot suit de 100 px vers le haut (y ${t3.y} → ${t4.y})`);
  await page.focus(GRIP);
  await page.keyboard.press("ArrowRight");
  await frames(page);
  const t5 = await box(page, TOOLS);
  check(Math.abs(t5.x - (t4.x + 16)) < 0.5 && Math.abs(t5.y - t4.y) < 0.5, `S3 clavier : flèche droite = +16 px (x ${t4.x} → ${t5.x})`);
  await page.keyboard.press("Home");
  await frames(page);
  const t6 = await box(page, TOOLS);
  check(near(t6, t0), `S3 clavier : Début recentre (${t6.x}, ${t6.y} ; départ ${t0.x}, ${t0.y})`);
  await mouseDrag(page, 400, 600);
  const moved = await box(page, TOOLS);
  await page.setViewportSize(SMALL);
  await frames(page);
  const small = await box(page, TOOLS);
  check(inside(small, SMALL), `S3 1024 × 768 : l'îlot déplacé reste entier dans la fenêtre (${small.x}, ${small.y}, ${small.width} × ${small.height})`);
  await page.setViewportSize(MID);
  await frames(page);
  check(near(await box(page, TOOLS), moved), "S3 : retour à 1280 × 900, position enregistrée gardée (jamais réécrite au redimensionnement)");
  await chooseProfile(page, "simple");
  await waitFor(page, `${OUTILS}[data-dock="left"]`);
  await chooseProfile(page, "defaut");
  await waitFor(page, TOOLS);
  check(near(await box(page, TOOLS), moved), "S3 : Simple puis Par défaut : la position du défaut revient");
  await mouseDrag(page, -200, -200, { cancel: true });
  check(near(await box(page, TOOLS), moved), "S3 : Échap pendant un glisser : retour au départ");
  noErrors(w, "S3");
  await ctx.close();
}

/** S4 : bande par l'éditeur de profils, puis îlot ; annotation : bande seule, puis retour des îlots. */
async function s4(browser, base) {
  const ctx = await browser.newContext({ viewport: MID, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  await openEditor(page);
  await page.click(tile("top"));
  await waitFor(page, `${OUTILS}[data-dock="top"]`);
  const bar = await box(page, OUTILS);
  const st = await box(page, "#stage");
  check(st.y >= bar.y + bar.height - 0.5 && st.height < MID.height, `S4 : « En haut » : bande, #stage commence sous elle (y ${st.y})`);
  await page.click(tile("floating"));
  await waitFor(page, `${OUTILS}[data-dock="floating"]`);
  const st2 = await box(page, "#stage");
  const isl = await box(page, TOOLS);
  const panel = await box(page, PANEL);
  check(st2.y === 0 && st2.height === MID.height, `S4 : « Flottante » : #stage reprend la hauteur de la fenêtre (${st2.height})`);
  check(apart(isl, panel) && inside(isl, MID), `S4 : panneau ouvert, l'îlot d'outils reste hors du panneau (${isl.x}, ${isl.y})`);
  await closeEditor(page);
  noErrors(w, "S4");
  await ctx.close();

  const ann = await browser.newContext({ viewport: MID, deviceScaleFactor: 1 });
  const p2 = await ann.newPage();
  const w2 = watch(p2);
  await p2.goto(`${base}/?fichiers=repli&annotation=faux`);
  await ready(p2);
  await p2.click(item("desktop-annotation"));
  await waitFor(p2, '.rb-layout[data-mode="annotation"]');
  await p2.waitForFunction(() => document.body.dataset.annotation === "1", null, { timeout: 15000 });
  await frames(p2);
  const visible = await p2.$$eval(".rb-island", (els) => els.filter((e) => e.getClientRects().length > 0).length);
  check(visible === 0 && (await p2.isVisible('[data-toolbar="annotation"]')), `S4 annotation : seule la bande d'annotation, aucun îlot visible (${visible})`);
  await p2.click(item("ann-desktop-annotation"));
  await waitFor(p2, '.rb-layout[data-mode="board"]');
  check((await p2.isVisible(TOOLS)) && (await p2.isVisible(ISLAND("menu"))), "S4 sortie de l'annotation : les îlots reviennent");
  noErrors(w2, "S4 annotation");
  await ann.close();
}

async function exportProfile(page, tmp, name) {
  await page.click(item("profiles"));
  await waitFor(page, "[data-profiles]");
  const dl = page.waitForEvent("download");
  await page.click('[data-profile-cmd="export"]');
  const file = join(tmp, name);
  await (await dl).saveAs(file);
  return { file, json: JSON.parse(await readFile(file, "utf8")) };
}

/** S5 : netteté § 10 à 2x (Rectangle de l'îlot d'outils, texte de l'onglet montré, contre-épreuve) ; format inchangé. */
async function s5(browser, base, tmp) {
  const ctx = await browser.newContext({ viewport: BIG, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  await page.mouse.move(BIG.width / 2, BIG.height - 300);
  await frames(page);
  await cleanRow(page, item("rect"), WHITE, NAVY, "S5 Rectangle de l'îlot d'outils (navy sur blanc)");
  const tab = await box(page, '.rb-tab[aria-selected="true"] .rb-tab-title');
  const fr = fringes(await pixelsOf(page, clipOf(tab)), VIOLET_100, VIOLET_700);
  check(fr === 0, `S5 texte de l'onglet montré (violet 700 sur violet 100) : 0 frange (${fr})`);
  await counterProof(page);
  await mouseDrag(page, 0, 120);
  await page.click(COLLAPSE);
  await waitFor(page, `${OUTILS}[data-collapsed="1"]`);
  const one = await exportProfile(page, tmp, "defaut-1.rbprofile");
  const extra = one.json.toolbars.flatMap((b) => Object.keys(b).filter((k) => !BAR_KEYS.includes(k)));
  const deep = keysDeep(one.json).filter((k) => ["x", "y", "position", "at"].includes(k));
  check(extra.length === 0 && deep.length === 0 && one.json.toolbars.every((b) => b.collapsed === false), `S5 : le .rbprofile exporté après déplacement et repli ne porte ni position ni collapsed: true (clés en trop : ${[...extra, ...deep].join(", ") || "aucune"})`);
  await page.click(item("profiles"));
  await waitFor(page, "[data-profiles]");
  const chooser = page.waitForEvent("filechooser");
  await page.click('[data-profile-cmd="import"]');
  await (await chooser).setFiles(one.file);
  await frames(page);
  const two = await exportProfile(page, tmp, "defaut-2.rbprofile");
  check(JSON.stringify(two.json) === JSON.stringify(one.json), "S5 : réimporté puis réexporté à l'identique");
  noErrors(w, "S5");
  await ctx.close();
}

/** S6 : 1024 × 768, 768 × 700, 560 × 700 panneau ouvert, trente pages. */
async function s6(browser, base) {
  {
    const ctx = await browser.newContext({ viewport: SMALL, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const w = watch(page);
    await page.goto(`${base}/?fichiers=repli`);
    await ready(page);
    const t = await box(page, TOOLS);
    const m = await box(page, ISLAND("menu"));
    const o = await box(page, ISLAND("onglets"));
    const rowBottom = Math.max(m.y + m.height, o.y + o.height);
    check(t.y >= rowBottom + 8 - 0.5 && inside(t, SMALL), `S6 1024 × 768 : îlot d'outils sous la rangée du haut (y ${t.y} ≥ ${rowBottom + 8}), entier`);
    check(o.width >= 144 - 0.5, `S6 1024 : îlot des onglets d'au moins 144 px (${o.width})`);
    noErrors(w, "S6 1024");
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: TABLET, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const w = watch(page);
    // Faux hôte : « Annotation du bureau » montrée, comme dans la coque (îlot d'outils ≈ 800 px, L2-30) ; sans elle, au
    // navigateur, l'îlot (≈ 734 px) tiendrait dans 736 et ne défilerait pas.
    await page.goto(`${base}/?fichiers=repli&annotation=faux`);
    await ready(page);
    const t = await box(page, TOOLS);
    check(Math.abs(t.width - 736) < 0.5, `S6 768 × 700 : îlot d'outils de 736 px (${t.width})`);
    const [sw, cw] = await page.$eval(OUTILS, (e) => [e.scrollWidth, e.clientWidth]);
    check(sw > cw, `S6 768 : son contenu défile (${sw} > ${cw})`);
    const g = await box(page, GRIP);
    const c = await box(page, COLLAPSE);
    check(inside(g, TABLET) && inside(c, TABLET) && g.x >= t.x - 0.5 && c.x + c.width <= t.x + t.width + 0.5, "S6 768 : poignée et Replier visibles, dans l'îlot");
    check(apart(t, await box(page, ISLAND("menu"))) && apart(t, await box(page, ISLAND("onglets"))), "S6 768 : l'îlot d'outils ne recouvre ni le menu ni les onglets");
    await page.locator(item("rect")).scrollIntoViewIfNeeded();
    await page.click(item("rect"));
    await page.waitForSelector('#stage[data-tool="rect"]', { timeout: 15000 });
    check(true, "S6 768 : Rectangle atteint après défilement et choisi (#stage data-tool=rect)");
    noErrors(w, "S6 768");
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: NARROW, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const w = watch(page);
    await page.goto(`${base}/?fichiers=repli`);
    await ready(page);
    await openEditor(page);
    const over = await islandsOverPanel(page);
    check(over.length === 0, `S6 560 × 700, panneau des profils ouvert : aucun îlot ne recouvre le panneau${over.length ? ` (fautifs : ${over.join(", ")})` : ""}`);
    await closeEditor(page);
    check(await page.isVisible(TOOLS), "S6 560 : panneau fermé, les îlots reviennent");
    noErrors(w, "S6 560");
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: MID, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const w = watch(page);
    await page.goto(`${base}/?fichiers=repli`);
    await ready(page);
    for (let i = 0; i < 29; i++) await page.click(item("page-add"));
    await page.waitForFunction(() => document.querySelector("#pages")?.textContent === "30 / 30", null, { timeout: 15000 });
    await frames(page);
    const pg = await box(page, ISLAND("pages"));
    const hi = await box(page, ISLAND("historique"));
    const [sw, cw] = await page.$eval(".rb-pages-list", (e) => [e.scrollWidth, e.clientWidth]);
    check(inside(pg, MID) && apart(pg, hi), `S6 30 pages : îlot des pages entier, hors de l'îlot de l'historique (${pg.x}, ${pg.y}, ${pg.width} px)`);
    check(sw > cw && (await page.textContent("#pages")) === "30 / 30", `S6 30 pages : la liste des numéros défile (${sw} > ${cw}), #pages = « 30 / 30 »`);
    noErrors(w, "S6 30 pages");
    await ctx.close();
  }
}

/** Captures à 2x : écran du tableau ; pour l'après, recadrages des zones comparées à la maquette 01. */
async function captureSet(browser, base, nom) {
  const ctx = await browser.newContext({ viewport: BIG, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const out = (n) => join(ROOT, "docs", "essais", `design-l2-${nom}-${n}.png`);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  await page.mouse.move(BIG.width / 2, BIG.height - 300);
  await frames(page);
  await page.screenshot({ path: out("tableau") });
  console.log(`capture : ${out("tableau")}`);
  if (nom === "avant") {
    await ctx.close();
    return;
  }
  for (const [n, z] of Object.entries(ZONES)) {
    if (z.open) await openMenu(page);
    await page.mouse.move(BIG.width / 2, BIG.height - 300);
    await frames(page);
    const b = await box(page, z.app);
    const x = Math.max(0, Math.floor(b.x) - 16);
    const y = Math.max(0, Math.floor(b.y) - 16);
    const clip = { x, y, width: Math.min(BIG.width - x, Math.ceil(b.width) + 32), height: Math.min(BIG.height - y, Math.ceil(b.height) + 32) };
    await page.screenshot({ path: out(n), clip });
    console.log(`capture : ${out(n)}`);
    if (z.open) {
      await page.keyboard.press("Escape");
      await frames(page);
    }
  }
  await ctx.close();
}

/** Recadrages de docs/design/maquettes/01-tableau.png (3840 × 2160) : boîtes lues dans la maquette HTML à 1x, découpées à 2x. */
async function maquetteCrops(browser) {
  const html = await browser.newContext({ viewport: BIG, deviceScaleFactor: 1 });
  const p1 = await html.newPage();
  await p1.goto(pathToFileURL(`${MAQUETTE}.html`).href);
  const boxes = {};
  for (const [n, z] of Object.entries(ZONES)) boxes[n] = await box(p1, z.maquette);
  await html.close();
  const png = await browser.newContext({ viewport: { width: 3840, height: 2160 }, deviceScaleFactor: 1 });
  const p2 = await png.newPage();
  await p2.setContent(`<body style="margin:0"><img id="m" style="display:block" src="data:image/png;base64,${readFileSync(`${MAQUETTE}.png`).toString("base64")}"></body>`);
  await p2.locator("#m").evaluate((img) => img.decode());
  for (const [n, b] of Object.entries(boxes)) {
    const clip = { x: Math.max(0, Math.floor(b.x * 2) - 32), y: Math.max(0, Math.floor(b.y * 2) - 32), width: Math.ceil(b.width * 2) + 64, height: Math.ceil(b.height * 2) + 64 };
    const path = join(ROOT, "docs", "essais", `design-l2-maquette-${n}.png`);
    await p2.screenshot({ path, clip });
    console.log(`capture : ${path}`);
  }
  await png.close();
}

async function main() {
  console.log(`sha ${gitSha()}`);
  const dist = resolve(arg("--dist") ?? DIST);
  const nom = arg("--nom") ?? "apres";
  const captures = process.argv.includes("--captures");
  if (nom === "avant" && !captures) {
    console.error(`${LABEL} : usage — --nom avant n'a de sens qu'avec --captures (captures « avant » seules)`);
    return 2;
  }
  if (!existsSync(join(dist, "index.html"))) {
    console.error(`${LABEL} : ÉCHEC — ${dist}/index.html absent : construire d'abord l'application (scripts/verifier.sh)`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${LABEL} : outil absent — Playwright introuvable (npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=…)`);
    return 2;
  }
  const server = await serve({ dist });
  const base = `http://127.0.0.1:${server.address().port}`;
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-design-l2-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ARGS });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    if (captures) await captureSet(browser, base, nom);
    if (nom === "avant") {
      console.log(`${LABEL} : captures « avant » seules, mesures sautées`);
      return 0;
    }
    if (captures) await maquetteCrops(browser);
    await s1(browser, base);
    await s2(browser, base);
    await s3(browser, base);
    await s4(browser, base);
    await s5(browser, base, tmp);
    await s6(browser, base);
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

- [ ] **Étape 3 : rouge sur le build « avant »**

```bash
cd "$W" && nice -n 10 node scripts/essais/design-l2-navigateur.mjs --dist "$HOME/.cache/tmp/of68-design-l2-avant/apps/web/dist" 2>&1 | tail -4; echo "code ${PIPESTATUS[0]}"
```
Attendu : `design L2 : ÉCHEC — S1 1280 × 900 : #stage mesure la fenêtre (x 0, y 4…` (scène sous les bandes), `code 1`.

- [ ] **Étape 4 : vert sur L2**

```bash
cd "$W" && nice -n 10 pnpm --filter @roomboard/web build > "$HOME/.cache/tmp/of68-tmp/T8-build.log" 2>&1; echo "build code $?"
cd "$W" && nice -n 10 node scripts/essais/design-l2-navigateur.mjs 2>&1 | tee "$HOME/.cache/tmp/of68-tmp/T8-essai.log" | tail -60; echo "code ${PIPESTATUS[0]}"
```
Attendu : `design L2 : OK`, `code 0`. Une rougeur qui vient du code de L2 (et non de l'essai) arrête la tâche : rapport
avec la ligne `ÉCHEC`, aucune retouche du code. Une rougeur de l'essai lui-même (sélecteur, attente) se corrige ici.

- [ ] **Étape 5 : branchement** — `scripts/verifier.sh`, après `echo "design L3 : OK"` :

```bash
  node scripts/essais/design-l2-navigateur.mjs
  echo "design L2 : OK"
```
```bash
cd "$W" && bash scripts/tests/verifier-e2e.test.sh; echo "code $?"
```
Attendu : `verifier-e2e.test.sh : OK`, `code 0`.

- [ ] **Étape 6 : captures** (avant, puis après avec recadrages ; la seconde rejoue S1 à S6) :

```bash
cd "$W" && nice -n 10 node scripts/essais/design-l2-navigateur.mjs --captures --dist "$HOME/.cache/tmp/of68-design-l2-avant/apps/web/dist" --nom avant 2>&1 | tail -3
cd "$W" && nice -n 10 node scripts/essais/design-l2-navigateur.mjs --captures 2>&1 | tee "$HOME/.cache/tmp/of68-tmp/T8-captures.log" | grep -E "^capture|design L2" ; ls docs/essais/design-l2-*.png | wc -l
```
Attendu : `design L2 : OK` et `18`.

- [ ] **Étape 7 : lire et comparer** — ouvrir à 100 %, côte à côte, chaque `design-l2-apres-<zone>.png` et
  `design-l2-maquette-<zone>.png` (huit zones), et les deux écrans `design-l2-avant-tableau.png`,
  `design-l2-apres-tableau.png`. Relever chaque différence de place, de taille, de couleur, de contenu.

- [ ] **Étape 8 : `docs/essais/design-l2-comparaison.md`** — gabarit dont les marques `<…>` se remplissent depuis la sortie de l'essai (les lignes de netteté sont recopiées
  de `T8-captures.log` ; chaque écart vu à l'étape 7 et absent de la liste ci-dessous s'ajoute avec sa raison ; un
  écart sans raison du cadrage est signalé au rapport, pas corrigé) :

```markdown
# design L2 — îlots du tableau comparés à la maquette 01

Rendu : Chromium de Playwright, 1920 × 1080 à 2x, `--disable-lcd-text`, `--force-color-profile=srgb`, profil
« Par défaut », stylo actif, un onglet « Sans titre », page vide. Police du système : la maquette est rendue avec Inter
(Q6, hors de L2). Après : `design-l2-apres-*.png` ; avant (`main` @ bbbc597) : `design-l2-avant-tableau.png` ;
maquette : `design-l2-maquette-*.png` (recadrages de `docs/design/maquettes/01-tableau.png`). Essai :
`scripts/essais/design-l2-navigateur.mjs --captures`.

## Mesures

- `#stage` : <ligne `ok — S1 1280 × 900 : #stage mesure la fenêtre …`> ; <ligne 1920 × 1080>.
- Îlots (S1) : <ligne `îlots 1920 × 1080 : …`>, positions entières, aucun chevauchement.

## Netteté § 10

- Rectangle de l'îlot d'outils (navy sur blanc, 48 × 48 px) : <rangée de gris>, 0 pixel intermédiaire, traits [3,3], 0 frange.
- Texte de l'onglet montré (violet 700 sur violet 100) : 0 frange.
- Contre-épreuve (viewBox `0 0 24 24` sans calage) : <rangée>, <n> pixels intermédiaires (≥ 2).

## Écarts à la maquette 01, un par un

| zone | écart | raison |
|---|---|---|
| toutes | Police du système au lieu d'Inter | Q6, hors périmètre (cadrage § 7) |
| historique | Pas d'îlot du zoom (−, 100 %, +) ; « Ajuster la page » rejoint Annuler et Rétablir | L2-23, H3 : zoom = comportement nouveau |
| pages | Pas de « Toutes les pages » ; liste des numéros gardée | L2-23, H3 ; L2-18 (comportement gardé) |
| outils | « Gomme : partielle » reste un bouton de l'îlot | L2-23, H3 (`s2-navigateur.mjs:170`) |
| outils | « Annotation du bureau » absente au navigateur | capacité `desktopAnnotation` fausse sur le web (C11a P6) ; présente dans la coque |
| menu-ouvert | Pas de raccourcis affichés, pas de sous-menu « Enregistrer une copie » (deux lignes .iwb et .ubz), « Insérer des pages… » ajouté, pas de marque au pied | L2-4 (contenu du menu), L2-6 (lignes icône + libellé) |
| prereglages | Trois couleurs du profil, sans épaisseurs ni pastille cerclée | préréglages du profil sans état (C1 P18) ; épaisseurs hors L2 |
| onglets | Un seul onglet « Sans titre » | contenu de l'essai, pas de la maquette |
| … | <écart relevé à l'étape 7> | <raison sourcée> |
```

- [ ] **Étape 9 : commit**

```bash
cd "$W" && git add scripts/essais/design-l2-navigateur.mjs scripts/verifier.sh scripts/tests/verifier-e2e.test.sh docs/essais/design-l2-comparaison.md
for f in docs/essais/design-l2-*.png; do git add "$f"; done
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -F - <<'MSG'
test(design-l2): browser trial S1-S6 in verifier.sh --e2e, before/after captures, mockup comparison

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```
  (`git add "$f"` un fichier à la fois, par son nom : 18 PNG.) Le build « avant » reste dans
  `$HOME/.cache/tmp/of68-design-l2-avant` (worktree détaché) ; le rapport en donne le chemin, l'étage 4 le retire.
