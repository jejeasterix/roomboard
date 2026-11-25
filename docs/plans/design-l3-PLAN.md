# design-l3 — Plan d'exécution

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Modèle : `moveItemTo`, catalogue selon la barre, `sameProfile`, `abandonQuestion`, `exportProfile` | — | `apps/web/src/profile-edit.ts`, `apps/web/src/profile-edit.test.ts`, `apps/web/src/app/profile-actions.ts`, `apps/web/src/app/profile-actions.test.ts` | isolé | implementeur-tdd | vitest `profile-edit.test.ts` + `profile-actions.test.ts` 0 échec, ≥ 10 tests `design-l3` présents ; `tsc` code 0 | S2, S4, S1, S3 | #tache-t1 |
| T2 | Dix icônes de la maquette 03 et notice Lucide | — | `apps/web/src/ui/icons.ts`, `apps/web/src/ui/icons.test.ts`, `THIRD_PARTY_NOTICES.md` | isolé | implementeur-tdd | vitest `icons.test.ts` 0 échec, `58 icônes` et `maquette 03` présents ; `controle-icones.test : 9 cas OK` ; `tsc` code 0 | S5 | #tache-t2 |
| T3 | Squelette du geste extrait (`pointer-gesture.ts`) et tri au pointeur (`sort-drag.ts`) | — | `apps/web/src/ui/pointer-gesture.ts` (neuf), `apps/web/src/ui/pointer-gesture.test.ts` (neuf), `apps/web/src/ui/sort-drag.ts` (neuf), `apps/web/src/ui/sort-drag.test.ts` (neuf), `apps/web/src/ui/resource-drag.ts` | isolé | concepteur-critique | vitest `pointer-gesture.test.ts` ≥ 9, `sort-drag.test.ts` ≥ 11, `resource-drag.test.ts` 9 verts sans retouche, `Toolbar.test.tsx` 0 échec ; `tsc` code 0 | S2 | #tache-t3 |
| T4 | Choix exclusif `RadioChoices` | — | `apps/web/src/ui/RadioChoices.tsx` (neuf), `apps/web/src/ui/RadioChoices.test.tsx` (neuf) | isolé | implementeur-tdd | vitest `RadioChoices.test.tsx` ≥ 7, `Toolbar.test.tsx` 0 échec ; `tsc` code 0 | S1, S5 | #tache-t4 |
| T5 | Panneau `ProfileEditor`, aperçu en direct et montage dans `App` | T1, T2, T3, T4 | `apps/web/src/ui/ProfileEditor.tsx`, `apps/web/src/ui/ProfileEditor.test.tsx`, `apps/web/src/ui/PointerSwitch.tsx`, `apps/web/src/ui/rb.css`, `apps/web/src/ui/rb-css.test.ts`, `apps/web/src/ui/App.tsx`, `apps/web/src/ui/App.test.tsx` | isolé | concepteur-critique | suite web vitest (suite-vm) 0 échec ; `ProfileEditor.test.tsx` ≥ 35 tests, `L3-13`, `L3-32` présents ; `App.test.tsx` `design-l3 L3-3` présent ; `tsc` code 0 | S1, S2, S3, S4, S5 | #tache-t5 |
| T6 | `App` : confirmation au changement de panneau, barre flottante, menu Profil en îlot | T5 | `apps/web/src/ui/App.tsx`, `apps/web/src/ui/App.test.tsx`, `apps/web/src/ui/ProfileMenu.tsx`, `apps/web/src/ui/rb.css`, `apps/web/src/ui/rb-css.test.ts` | isolé | implementeur-tdd | suite web vitest (suite-vm) 0 échec, `design-l3 L3-32` et `L3-22` présents, `ProfileMenu.test.tsx` vert sans retouche ; build web `✓ built` | S1, S3, S6 | #tache-t6 |
| T7 | Essai C1 retouché et fiches de coque | T6 | `scripts/essais/c1-profils-navigateur.mjs`, `docs/essais/coque-windows.md`, `docs/essais/coque-macos.md` | isolé | implementeur-tdd | `C1 : ÉCHEC` avant retouche puis `C1 : OK` ; lignes `C1-7` dans les deux fiches | S1 | #tache-t7 |
| T8 | Essai `design-l3` au navigateur, branché dans `verifier.sh --e2e` | T6 | `scripts/essais/design-l3-navigateur.mjs` (neuf), `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh` | isolé | implementeur-tdd | `design L3 : ÉCHEC` sur le build « avant » puis `design L3 : OK` (`0 pixel intermédiaire`, `0 frange`, contre-épreuve ≥ 2) ; `verifier-e2e.test.sh : OK` | S1, S2, S3, S4, S5, S6 | #tache-t8 |
| T9 | Suite complète, captures avant / après, recadrages de la maquette 03, document d'écarts | T7, T8 | `docs/essais/design-l3-avant-panneau.png`, `docs/essais/design-l3-apres-panneau.png`, `docs/essais/design-l3-apres-entete.png`, `docs/essais/design-l3-apres-cartes.png`, `docs/essais/design-l3-apres-vignettes.png`, `docs/essais/design-l3-apres-liste.png`, `docs/essais/design-l3-apres-pied.png`, `docs/essais/design-l3-maquette-entete.png`, `docs/essais/design-l3-maquette-cartes.png`, `docs/essais/design-l3-maquette-vignettes.png`, `docs/essais/design-l3-maquette-liste.png`, `docs/essais/design-l3-maquette-pied.png`, `docs/essais/design-l3-comparaison.md` (neufs) | isolé | implementeur-tdd | `verifier.sh : e2e OK` puis `verifier.sh : OK` ; Wasm 1375581 / 2794511 o ; 12 PNG ; écarts listés un par un dans `design-l3-comparaison.md` | S5, S1, S2, S3, S4, S6 | #tache-t9 |

Vagues (fichiers disjoints dans chaque vague, aucune tâche `partagé`) :

- **Vague 1** : T1, T2, T3, T4 en parallèle (quatre modules sans fichier commun).
- **Vague 2** : T5 (consomme T1 à T4 ; seule à toucher `ProfileEditor.tsx` et `PointerSwitch.tsx`).
- **Vague 3** : T6. **Vague 4** : T7 et T8 en parallèle (fichiers disjoints). **Vague 5** : T9 (seule tâche à lancer
  `verifier.sh --e2e`).

Chaîne des points chauds d'une vague à l'autre : `rb.css` et `rb-css.test.ts` (T5 → T6), `App.tsx` et `App.test.tsx`
(T5 → T6), `icons.ts` (T2 seule), `ProfileEditor.tsx` (T5 seule). Le build « avant » (`main` @ dbb2473) est construit
par T8 dans `$HOME/.cache/tmp/of61-design-l3-avant` et réutilisé, puis retiré, par T9.

Gabarit : 9 tâches, dans la cible 7 à 10 ; le gabarit **chantier** reste le bon (aucun lot).

**Goal :** faire de l'éditeur de profils le panneau latéral de 600 px de D-DS10, sans voile, la barre derrière montrant
le brouillon en direct, avec cartes de démarrage, vignettes d'emplacement, taille en commande segmentée, liste triable
au pointeur, au doigt et au clavier, aux jetons, icônes et tailles de L1, format `.rbprofile` inchangé.

**Architecture :** trois modules neufs : `ui/pointer-gesture.ts` (squelette du geste, extrait de `resource-drag.ts`,
DA-L3-1), `ui/sort-drag.ts` (tri au pointeur sur ce squelette), `ui/RadioChoices.tsx` (choix exclusif, DA-L3-2).
`profile-edit.ts` gagne `moveItemTo`, `sameProfile`, `abandonQuestion` et un catalogue selon la barre montrée en
annotation ; `profile-actions.ts` gagne `exportProfile`. `ProfileEditor.tsx` est réécrit en panneau ; `App.tsx` tient
`previewProfile` (DA-L3-3) et lit le profil montré partout où la page dessine ; il remonte l'éditeur à chaque profil
actif neuf (`Show keyed`). Preuve : essai Playwright neuf qui réutilise `commun.mjs` et `nettete.mjs`.

**Tech Stack :** Solid 1.9.20, TypeScript 5 (`strict`, `noUncheckedIndexedAccess`), Vitest 4 (happy-dom 21),
Playwright 1.65 (Chromium du cache npx), Node 22, Bash.

**Spec :** `docs/plans/design-l3-cadrage.md` (amont : `docs/plans/design-cadrage.md` § 5, 6, 9, 10 ; lots L1 et L4 :
`docs/plans/design-l1-cadrage.md`, `docs/plans/design-l4-cadrage.md` ; maquette `docs/design/maquettes/03-profils.html`
et `.png`).

## Global Constraints

- G1 — Test rouge d'abord (TDD) ; aucun test retiré, désactivé ou sauté ; aucun seuil changé.
- G2 — Comportement inchangé hors de l'aspect, sauf les changements voulus du cadrage (L3-26 : aperçu en direct L3-3,
  catalogue selon la barre L3-17, liste « Ajouter » remplacée L3-16 ; L3-15 : Monter / Descendre cachés au repos ;
  L3-32 : abandon confirmé). Retouches de tests et d'essais : **seulement** celles que la section de la tâche liste ;
  toute autre rougeur arrête la tâche (rapport, aucune retouche).
- G3 — Aucune dépendance ajoutée : `package.json`, `pnpm-lock.yaml`, `Cargo.toml`, `Cargo.lock` inchangés.
- G4 — Icônes Lucide (ISC) reprises en tracés SVG dans `apps/web/src/ui/icons.ts`, mention dans
  `THIRD_PARTY_NOTICES.md` ; aucune icône dessinée dans ce lot (L3-25) ; trait 1,5, calage `ICON_VIEWBOX` ;
  `scripts/tests/controle-icones.test.sh` vert.
- G5 — Aucun code Rust ni CLI ; tailles Wasm inchangées (principal 1 375 581 o, formats 2 794 511 o, journal de
  référence `~/.cache/tmp/of61-ref/verifier.log`) ; `toolbar.ts` (`parseProfile`, `serializeProfile`, `PROFILE_MINOR`,
  `annotationBarOf`) non touché : format `.rbprofile` inchangé.
- G6 — VM partagée : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; builds et tests en `nice -n 10`, cargo
  `-j 4` ; tests rapides `cd apps/web && npx vitest run <fichiers>` ; un test isolé ou un `tsc` court se lance
  directement ; une suite complète (paquet web entier, `pnpm -r test`, `verifier.sh`) passe par
  `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; aucun `tauri build`.
- G7 — Fichiers temporaires dans le worktree ou `$HOME/.cache/tmp/of61-*` (`TMPDIR=$HOME/.cache/tmp/of61-tmp`, préfixe
  `T<n>-` dans les noms) ; aucun processus laissé (Chromium, serveur, vite).
- G8 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un ; jamais `git add -A`,
  `git add .`, `git commit -a` ; aucun push.
- G9 — `apps/web/src/ui/*.ts(x)` hors tests : aucun `switch (`, aucun `localStorage`, aucun `draggable` ni `dragstart`
  (même en commentaire), et dans les `.tsx` aucun `\d+px` (garde `Toolbar.test.tsx:149-160`) ; aucun `innerHTML` ;
  tout branchement par une table, jamais par un test sur l'identifiant d'un élément.
- G10 — `rb.css` : jetons `--rf-*` de la charte seulement (aucune couleur en dur dans les règles neuves) ; tailles de
  texte 20 (titre), 16 (corps, listes), 15 (segments, boutons), 14 (notes, étiquettes) ; cibles ≥ 48 px ; aucune
  règle dont le sélecteur contient `.rb-bar` en `position: absolute|fixed` (`App.test.tsx:400-410`) ; `.rb-editor`
  (`rb.css:175-184`) inchangée.
- G11 — Netteté (§ 10 du cadrage design) : 0 pixel intermédiaire au bord, 0 frange colorée.
- G12 — Worktree de la tâche : `/home/adminjd/projets/roomboard-wt/design-l3--T<n>` ; dépendances par
  `pnpm install --frozen-lockfile` ; modules Wasm copiés de `/home/adminjd/projets/roomboard-wt/design-l3/apps/web/src/`
  (`wasm`, `wasm-formats` : aucun Rust ne change).

Divergences avec le cadrage, décidées par ce plan (rappelées dans les sections concernées) :

- D1 — 9 tâches au lieu de 8 : `RadioChoices` (T4) détaché pour courir en vague 1 ; essai C1 (T7) et essai design-l3
  (T8) séparés pour courir en parallèle.
- D2 — Retouche de forme absente de L3-26, rendue nécessaire par L3-25 : `icons.test.ts:23-27` (48 → 58 icônes).
- D3 — Le test qui lie `BUTTON_PX` à `--rb-btn-*` vit dans `ProfileEditor.test.tsx` (environnement happy-dom, qui importe
  le composant) et non dans `rb-css.test.ts` (environnement node, sans import de `.tsx`).
- D4 — `POINTER_SUMMARY` est testé dans `ProfileEditor.test.tsx` ; `PointerSwitch.test.tsx` reste non touché (§ 3.2).
- D5 — Précision de L3-9 : la note « Montrée seulement en annotation du bureau… » va sur une barre de rôle
  `annotation` (jamais rendue au tableau) ; « En annotation : en haut » va sous « Flottante » de la barre
  `annotationBarOf` (la barre `tools` d'un profil d'avant L4 comprise, qui est aussi montrée au tableau).
- D6 — `abandonQuestion(label)` et `sameProfile` dans `profile-edit.ts`, appelés par l'éditeur (Fermer, sélecteur,
  Importer) **et** par `App` (autre panneau) : une seule règle, une seule question pour les deux chemins de L3-32.
- D7 — `ProfileEditorProps` gagne, en plus de `preview` / `endPreview` du cadrage : `profiles`, `canRemove`,
  `canResetCurrent`, `focusProfile?`, `choose`, `importFile`, `exportProfile`, `resetCurrent`, `confirm`.
- D8 — Ligne « Séparateur » de 48 px (cibles ≥ 48, L3-24), libellé gris de 14 px : la « ligne fine » est son aspect.
- D9 — S5 mesure l'œil `hidden` sur la ligne « Pot » masquée dans le brouillon.
- D10 — `data-panel="profils"` et la règle `.rb-popover[data-panel="profils"]` sont posés par T5 (coque du panneau) ;
  barre flottante, `data-panneau` et menu en îlot par T6.
- D11 — Le build « avant » (`main` @ dbb2473) sert au rouge de l'essai (T8) et aux captures « avant » (T9).
- D12 — Écarts à la maquette écrits dans `docs/essais/design-l3-comparaison.md` (document de `docs/essais/`, brief).

## Review Focus

1. Profil à deux barres de même rôle, ou à barre de rôle inconnu : libellés « Barre <id> », un bloc montré à la fois,
   catalogue du tableau pour la barre inconnue (L3-9, L3-17) → T5, test « L3-9 : deux barres tools et un rôle
   inconnu » ; T1, test « L3-17 : rôle inconnu : catalogue du tableau ».
2. Élément inconnu d'un profil plus récent : déplaçable par la poignée (flèche, Monter / Descendre, pointeur), œil grisé,
   réécrit tel quel (P16, effet de bord « Monter / Descendre cachés ») → T1, test « L3-14 : moveItemTo garde un groupe
   vidé et réécrit un élément inconnu tel quel » ; T5, tests « élément inconnu… » et « P16 : élément inconnu déplacé à
   la flèche ».
3. Lâcher au-dessus de la première ligne, sous la dernière, ou rang hors bornes / non fini (S2) → T3, tests « slotOf »,
   « vers le bas jusqu'en fin » ; T1, test « L3-14 : moveItemTo hors bornes ».
4. Brouillon dont seul le nom change, ou nom vidé : l'abandon est demandé, Enregistrer et Exporter sont grisés au nom
   vide (L3-20, L3-21, L3-32, S3) → T5, tests « L3-32 : seul le nom change » et « L3-21 : Exporter écrit le brouillon ;
   nom vide ».
5. « Revenir à l'origine » sur un livré sans copie : grisé sans changement ; brouillon modifié : brouillon rendu, magasin
   intact (L3-19, effet de bord « Exporter depuis le panneau ») → T5, tests « L3-19 : livré sans copie » et
   « design-l3 L3-19 : Revenir à l'origine sur une copie ».

## Carte des fichiers

| Fichier | Rôle | Tâche |
|---|---|---|
| `apps/web/src/profile-edit.ts` | `moveItemTo`, `sameProfile`, `abandonQuestion`, `CATALOG_ACTIONS` dans `catalog` | T1 |
| `apps/web/src/app/profile-actions.ts` | `exportProfile(p)` ; `exportActive` en dérive | T1 |
| `apps/web/src/ui/icons.ts`, `THIRD_PARTY_NOTICES.md` | dix icônes de la maquette 03 | T2 |
| `apps/web/src/ui/pointer-gesture.ts` (neuf) | `startPointerGesture`, `PointerGesture`, `DRAG_THRESHOLD_PX` | T3 |
| `apps/web/src/ui/resource-drag.ts` | rappelle `startPointerGesture`, réexporte `DRAG_THRESHOLD_PX` | T3 |
| `apps/web/src/ui/sort-drag.ts` (neuf) | `startSortDrag`, `slotOf`, `SORT_EDGE_PX` | T3 |
| `apps/web/src/ui/RadioChoices.tsx` (neuf) | `RadioChoices`, `RadioOption` | T4 |
| `apps/web/src/ui/PointerSwitch.tsx` | `POINTER_SUMMARY` | T5 |
| `apps/web/src/ui/ProfileEditor.tsx` | panneau, sections, liste triable, pied, `BUTTON_PX` | T5 |
| `apps/web/src/ui/rb.css` | `.rb-popover[data-panel="profils"]`, `.rb-sheet*`, `.rb-radio*`, `.rb-item*` (T5) ; flottante, menu en îlot (T6) | T5, T6 |
| `apps/web/src/ui/App.tsx` | `previewProfile`, `shownProfile`, montage `keyed`, props de l'éditeur (T5) ; `leaveEditor`, `data-panneau`, `data-panel="menu-profils"` (T6) | T5, T6 |
| `apps/web/src/ui/ProfileMenu.tsx` | icône + texte par ligne | T6 |
| `scripts/essais/c1-profils-navigateur.mjs`, `docs/essais/coque-*.md` | retouches L3-26 ; ligne C1-7 | T7 |
| `scripts/essais/design-l3-navigateur.mjs` (neuf), `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh` | essai S1 à S6, branché dans `--e2e` | T8 |
| `docs/essais/design-l3-*.png`, `docs/essais/design-l3-comparaison.md` (neufs) | captures et écarts | T9 |

---

### Tâche T1 — Modèle : `moveItemTo`, catalogue selon la barre, `sameProfile`, `abandonQuestion`, `exportProfile`
<a id="tache-t1"></a>

**Objectif.** Poser dans le modèle pur tout ce dont le panneau a besoin sans DOM : le lâcher au rang voulu (L3-14), le
catalogue « Ajouter » qui suit la barre montrée en annotation (L3-17, ferme le constat `toolbar-profiles.ts:112`), la
comparaison du brouillon au profil enregistré (L3-20, L3-32), le texte de la question d'abandon (L3-32, D6), et
l'export d'un profil donné, le brouillon (L3-21).

**Fichiers.**
- Modifier : `apps/web/src/profile-edit.ts` (imports `:6-25` ; après `moveItem` `:83-104` ; `catalog` `:106-121` ; fin
  de fichier), `apps/web/src/profile-edit.test.ts` (imports `:1-7` ; test `:83-92` ; describe ajouté en fin),
  `apps/web/src/app/profile-actions.ts` (`:28-44`, `:106-116`), `apps/web/src/app/profile-actions.test.ts` (fin du
  describe « gestes de profil (C1) », avant `:238`).

**Interfaces.**
- Consomme : `toolbar.ts` — `ANNOTATION_MAIN_ACTIONS`, `ANNOTATION_REMOTE_ACTIONS` (`:653`, `:660`), `ANNOTATION_ROLE`
  (`:668`), `annotationBarOf(p: Profile): Toolbar | null` (`:675`), `serializeProfile(p: Profile): Record<string, unknown>`
  (`:587`), `type ActionId`.
- Produit :
  - `export function moveItemTo(p: Profile, barId: string, itemId: string, to: number): Profile` — `to` = rang dans la
    liste aplatie **sans** l'élément, ramené à `[0, n]` ; rang 0 : tête du premier groupe ; sinon l'élément rejoint le
    groupe de celui qui le précède ; groupe vidé gardé ; `to` non fini, barre ou élément absents : profil rendu
    tel quel (égal).
  - `catalog(p: Profile, barId: string): CatalogEntry[]` — signature inchangée ; table interne
    `CATALOG_ACTIONS: Readonly<Record<CatalogKind, (id: ActionId) => boolean>>`, `CatalogKind = "annotation" |
    "shown-in-annotation" | "board"`.
  - `export function sameProfile(a: Profile, b: Profile): boolean` — `serializeProfile` des deux, comparés en JSON.
  - `export const abandonQuestion = (label: string): string` →
    `Abandonner les changements du profil « <label> » ?`.
  - `ProfileActions.exportProfile(p: Profile): Promise<boolean>` ; `exportActive()` = `exportProfile(active.profile())`.
- Réutilise : `apps/web/src/profile-edit.ts:65-121` — `setLabel`, `setStartMode`, `setButtonSize`, `setDock`,
  `setHidden`, `canHide`, `moveItem`, `addItem`, `addPreset`, `updatePreset`, `removePreset`, `resetToolbars`,
  `resetAllPresets`, appelés tels quels (aucune réécriture ; `moveItem` inchangé).
- Réutilise : `apps/web/src/profile-edit.ts:83` (`moveItem`, un cran) — étendu par
  `export function moveItemTo(p: Profile, barId: string, itemId: string, to: number): Profile` (même `mapBar`).
- Réutilise : `apps/web/src/profile-edit.ts:107` (`catalog`) et `apps/web/src/toolbar.ts:653-660` — `catalog(p, barId)`
  inchangée de signature, étendue par la table interne
  `CATALOG_ACTIONS: Readonly<Record<CatalogKind, (id: ActionId) => boolean>>`.
- Réutilise : `apps/web/src/toolbar.ts:675` (`annotationBarOf`) — `annotationBarOf(p: Profile): Toolbar | null`, appelée
  telle quelle (comparée par `id`, la copie flottante comprise).
- Réutilise : `apps/web/src/toolbar.ts` (`serializeProfile`) — étendu par
  `export function sameProfile(a: Profile, b: Profile): boolean` dans `profile-edit.ts`.
- Réutilise : `apps/web/src/app/profile-actions.ts:28-43` — `choose`, `importFile`, `canResetCurrent`, `resetCurrent`,
  `canRemove` inchangés ; ajout `exportProfile(p: Profile): Promise<boolean>`.
- Réutilise : `apps/web/src/profile-file.ts` (`profileToFile`) — `profileToFile(p: Profile): { name; text }`, appelé tel
  quel.
- Rapport : une ligne `Réutilisation : appelé profile-edit.ts (mapBar, moveItem), toolbar.ts (annotationBarOf,
  serializeProfile, tables d'annotation), profile-file.ts (profileToFile)` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/design-l3--T1/apps/web && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of61-tmp && mkdir -p "$TMPDIR" && nice -n 10 npx vitest run src/profile-edit.test.ts src/app/profile-actions.test.ts --reporter=verbose > "$TMPDIR/T1-vitest.log" 2>&1; echo "code $?"; grep -E "✓|×|FAIL |Test Files|Tests " "$TMPDIR/T1-vitest.log" | tail -80`
Preuve : `code 0`, `Test Files  2 passed (2)`, `Tests  N passed (N)` avec N ≥ 58 (20 + 10 dans `profile-edit.test.ts`,
26 + 2 dans `profile-actions.test.ts`), au moins 12 lignes `design-l3`
(`L3-14` ×4, `L3-17` ×4, `L3-20`, `L3-32`, `L3-21` ×2), aucun `×` ni `FAIL `. Tests à garder verts dans la zone :
`profile-edit.test.ts:94-99` (actions du tableau absentes du catalogue, C10a), `:101-108` (requires des actions
ajoutées), `:110-120` (ajout en fin, `page-next-2`), `profile-actions.test.ts:66-73` (export de cm1),
`:232-237` (export qui lève).

**Preuve visuelle.** Aucune (modèle sans rendu).

**Contraintes (recopiées).** G1 test rouge d'abord, aucun test retiré, désactivé ou sauté, aucun seuil changé · G2
retouche voulue (fond, L3-17) : `profile-edit.test.ts:83-92`, première attente seulement (catalogue `outils` de `defaut`
sans les cinq actions d'annotation) ; toute autre rougeur arrête la tâche · G3 aucune dépendance ajoutée · G5
`toolbar.ts` non touché (`parseProfile`, `serializeProfile`, `PROFILE_MINOR`, `annotationBarOf`), aucun Rust ni CLI ·
G6 `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`, `nice -n 10`, tests isolés sans `suite-vm` · G7 sorties dans
`$HOME/.cache/tmp/of61-tmp/T1-*` · G8 auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais
terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un, jamais `git add -A`, `.`,
`commit -a`, aucun push · G12 worktree `/home/adminjd/projets/roomboard-wt/design-l3--T1`.

**Interdits.** Ne pas toucher `toolbar.ts` ni `toolbar-profiles.ts` ; ne pas changer `moveItem` ; aucun identifiant
d'action recopié hors de `ANNOTATION_ENTRY` (l'entrée `desktop-annotation`, seule action de `ANNOTATION_MAIN_ACTIONS`
proposée partout).

**Terminé quand.** Les tests passent, `tsc` rend 0, commit fait.

- [ ] **Étape 0 : préparer le worktree** —
  `cd /home/adminjd/projets/roomboard-wt/design-l3--T1 && mkdir -p $HOME/.cache/tmp/of61-tmp && (test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile > $HOME/.cache/tmp/of61-tmp/T1-install.log 2>&1) && for d in wasm wasm-formats; do test -d apps/web/src/$d || cp -r /home/adminjd/projets/roomboard-wt/design-l3/apps/web/src/$d apps/web/src/$d; done && ls apps/web/src/wasm/roomboard_wasm.d.ts && git log --oneline -1`
  Attendu : le chemin listé, puis le dernier commit du chantier.

- [ ] **Étape 1 : tests du modèle (rouges).** Dans `apps/web/src/profile-edit.test.ts`, remplacer l'en-tête
  (`:1-7`) par :

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  abandonQuestion, addItem, addPreset, canHide, catalog, moveItem, moveItemTo, originOf, presetFields, PRESET_TOOLS, removePreset,
  resetAllPresets, resetToolbars, resetToOrigin, sameProfile, setButtonSize, setDock, setHidden, setLabel, setStartMode, updatePreset,
} from "./profile-edit";
import { parseProfile, serializeProfile, TABLE_ACTIONS, visibleItems, type Profile, type RuntimeCapabilities } from "./toolbar";
import { BUILTIN_PROFILES, builtinProfile, DEFAULT_PROFILE_JSON } from "./toolbar-profiles";

/** design-l4 (L4-22) : `DEFAULT_PROFILE_JSON` d'avant L4, tel quel (aucune barre `annotation`). */
const BEFORE_L4: Record<string, unknown> = JSON.parse(readFileSync(join(__dirname, "fixtures", "profils", "defaut-avant-l4.rbprofile"), "utf8"));
```

  Retouche voulue (fond, L3-17) dans le test `:83-92`, première attente seulement :

```ts
    expect(catalog(DEFAUT, "outils").map((e) => e.ref)).toEqual(["page-prev", "page-next", "page-add", "page-remove", "page-insert-file", "edit-original", "export-pdf", "export-iwb", "export-ubz"]);
```

  Ajouter en fin de fichier :

```ts
describe("profile-edit : design-l3 (L3-14, L3-17, L3-20, L3-32)", () => {
  /** Profil d'une barre `b` : groupe g1 = [laser (outil inconnu, clé inconnue)], groupe g2 = [pen, profiles]. */
  function twoGroups(): Profile {
    const r = parseProfile({
      format: "roomboard-profile", schema: 1, id: "x", label: "X",
      toolbars: [{ id: "b", role: "tools", dock: "top", groups: [
        { id: "g1", items: [{ id: "laser", kind: "tool", tool: "laser", label: "Laser", raccourci: "L" }] },
        { id: "g2", items: [{ id: "pen", kind: "tool", tool: "pen", label: "Stylo" }, { id: "profiles", kind: "action", action: "profiles", label: "Profil" }] },
      ] }],
    });
    if ("errors" in r) throw new Error(r.errors.join("; "));
    return r.profile;
  }

  it("design-l3 L3-14 : moveItemTo rang 0 : tête du premier groupe, rien de perdu", () => {
    const p = moveItemTo(DEFAUT, "outils", "text", 0);
    expect(groupsOf(p)[0]).toEqual(["text", "pen", "eraser", "eraser-mode", "hand"]);
    expect(groupsOf(p)[1]).not.toContain("text");
    expect(ids(p)).toHaveLength(ids(DEFAUT).length);
  });

  it("design-l3 L3-14 : moveItemTo : l'élément rejoint le groupe de celui qui le précède (frontière de groupe)", () => {
    expect(groupsOf(moveItemTo(DEFAUT, "outils", "pen", 3))[0]).toEqual(["eraser", "eraser-mode", "hand", "pen"]);
    const p = moveItemTo(DEFAUT, "outils", "pen", 4);
    expect(groupsOf(p)[0]).toEqual(["eraser", "eraser-mode", "hand"]);
    expect(groupsOf(p)[1]!.slice(0, 3)).toEqual(["sep-1", "pen", "select"]);
  });

  it("design-l3 L3-14 : moveItemTo hors bornes : rang ramené à [0, n] ; rang non fini, barre ou élément absents : rien ne change", () => {
    expect(ids(moveItemTo(DEFAUT, "outils", "pen", 999)).at(-1)).toBe("pen");
    expect(ids(moveItemTo(DEFAUT, "outils", "text", -5))[0]).toBe("text");
    expect(moveItemTo(DEFAUT, "outils", "pen", Number.NaN)).toEqual(DEFAUT);
    expect(moveItemTo(DEFAUT, "outils", "absent", 0)).toEqual(DEFAUT);
    expect(moveItemTo(DEFAUT, "absente", "pen", 0)).toEqual(DEFAUT);
  });

  it("design-l3 L3-14 : moveItemTo garde un groupe vidé et réécrit un élément inconnu tel quel (P16)", () => {
    const before = twoGroups();
    const p = moveItemTo(before, "b", "laser", 2);
    expect(groupsOf(p, "b")).toEqual([[], ["pen", "profiles", "laser"]]);
    expect(item(p, "laser")).toEqual(item(before, "laser"));
    expect(groupsOf(moveItemTo(p, "b", "laser", 0), "b")).toEqual([["laser"], ["pen", "profiles"]]);
  });

  it("design-l3 L3-17 : barre d'annotation : outils absents et actions qui agissent en annotation, rien d'autre", () => {
    const entries = catalog(DEFAUT, "annotation");
    expect(entries.filter((e) => e.kind === "tool").map((e) => e.ref)).toEqual(["hand", "select", "ellipse", "line", "table", "fill"]);
    expect(entries.filter((e) => e.kind === "action").map((e) => e.ref)).toEqual(["redo"]);
  });

  it("design-l3 L3-17 : barre pages : ni outils ni actions propres à l'annotation ; l'entrée « Annotation du bureau » reste", () => {
    const refs = catalog(DEFAUT, "pages").map((e) => e.ref);
    for (const a of ["annotation-pointer", "annotation-screen", "annotation-freeze", "annotation-send", "annotation-send-new"]) expect(refs).not.toContain(a);
    expect(refs).toContain("desktop-annotation");
    expect(catalog(DEFAUT, "pages").every((e) => e.kind === "action")).toBe(true);
  });

  it("design-l3 L3-17 : rôle inconnu : catalogue du tableau, outils compris, sans actions propres à l'annotation", () => {
    const json = structuredClone(DEFAULT_PROFILE_JSON) as { toolbars: { id: string; role: string }[] };
    json.toolbars.push({ id: "minuteur", role: "minuteur", dock: "bottom", groups: [{ id: "m", items: [{ id: "m-undo", kind: "action", action: "undo", label: "Annuler" }] }] } as never);
    const r = parseProfile({ ...json, id: "inconnu", label: "Inconnu" });
    if ("errors" in r) throw new Error(r.errors.join("; "));
    const refs = catalog(r.profile, "minuteur").map((e) => e.ref);
    expect(refs).toContain("rect");
    expect(refs).toContain("redo");
    for (const a of ["annotation-pointer", "annotation-screen", "annotation-freeze", "annotation-send", "annotation-send-new"]) expect(refs).not.toContain(a);
  });

  it("design-l3 L3-17 : profil d'avant L4 : sa barre tools, montrée en annotation, propose encore Écran suivant, Figer, Envoyer, nouvel onglet", () => {
    const GONE = ["annotation-screen", "annotation-freeze", "annotation-send", "annotation-send-new"];
    const json = structuredClone(BEFORE_L4) as { toolbars: { groups: { items: { id: string }[] }[] }[] };
    for (const b of json.toolbars) for (const g of b.groups) g.items = g.items.filter((i) => !GONE.includes(i.id));
    const r = parseProfile({ ...json, id: "ancienne", label: "Ancienne" });
    if ("errors" in r) throw new Error(r.errors.join("; "));
    const refs = catalog(r.profile, "outils").map((e) => e.ref);
    for (const a of GONE) expect(refs).toContain(a);
  });

  it("design-l3 L3-20 : sameProfile compare les profils écrits ; nom, emplacement, masquage et clés inconnues comptent", () => {
    expect(sameProfile(DEFAUT, DEFAUT)).toBe(true);
    expect(sameProfile(DEFAUT, setDock(DEFAUT, "outils", "top"))).toBe(true);
    expect(sameProfile(DEFAUT, setDock(DEFAUT, "outils", "left"))).toBe(false);
    expect(sameProfile(DEFAUT, setLabel(DEFAUT, "Autre"))).toBe(false);
    expect(sameProfile(DEFAUT, setHidden(setHidden(DEFAUT, "eraser", true), "eraser", false))).toBe(true);
    expect(sameProfile(withUnknownKeys(), withUnknownKeys())).toBe(true);
    expect(sameProfile(DEFAUT, withUnknownKeys())).toBe(false);
  });

  it("design-l3 L3-32 : question d'abandon, texte exact", () => {
    expect(abandonQuestion("Par défaut")).toBe("Abandonner les changements du profil « Par défaut » ?");
  });
});
```

  Dans `apps/web/src/app/profile-actions.test.ts`, à la fin du describe « gestes de profil (C1) », juste après le test
  « export qui lève : message, faux » :

```ts
  it("design-l3 L3-21 : exportProfile écrit le profil donné (brouillon) ; exportActive, le profil enregistré", async () => {
    const { actions, saved, store } = setup();
    expect(await actions.exportProfile(setDock(DEFAUT, "outils", "left"))).toBe(true);
    expect(saved[0]!.name).toBe("par-defaut.rbprofile");
    expect(JSON.parse(saved[0]!.text).toolbars[0].dock).toBe("left");
    expect(store.hasOverride("defaut")).toBe(false);
    expect(await actions.exportActive()).toBe(true);
    expect(JSON.parse(saved[1]!.text).toolbars[0].dock).toBe("top");
  });

  it("design-l3 L3-21 : exportProfile qui lève : message, faux", async () => {
    const { actions, files, shell } = setup();
    vi.mocked(files.save).mockRejectedValueOnce(new Error("disque plein"));
    expect(await actions.exportProfile(setDock(DEFAUT, "outils", "left"))).toBe(false);
    expect(shell.notify).toHaveBeenCalledWith("Profil non exporté (par-defaut.rbprofile) : disque plein");
  });
```

- [ ] **Étape 2 : vérifier le rouge** — commande bornée de la section. Attendu : `code 1`, `FAIL`, erreurs
  `moveItemTo is not a function` (ou `sameProfile`, `abandonQuestion`, `exportProfile`) et l'attente du catalogue de
  `:83-92` en échec.

- [ ] **Étape 3 : implémenter dans `profile-edit.ts`.** Remplacer l'import de `./toolbar` (`:6-25`) par :

```ts
import {
  ACTION_REQUIRES,
  ACTION_TABLE,
  ANNOTATION_MAIN_ACTIONS,
  ANNOTATION_REMOTE_ACTIONS,
  ANNOTATION_ROLE,
  TABLE_ACTIONS,
  annotationBarOf,
  isKnownItem,
  isProfilesAccess,
  resetPresets,
  serializeProfile,
  TOOL_TABLE,
  appendToLastGroup,
  presetsOf,
  uniqueId,
  type ActionId,
  type ButtonSize,
  type Dock,
  type Preset,
  type Profile,
  type StartMode,
  type ToolId,
  type ToolItem,
  type Toolbar,
} from "./toolbar";
```

  Juste après `moveItem` (fin `:104`), ajouter :

```ts
/**
 * design-l3 (L3-14) : lâcher au rang `to` de la liste aplatie de la barre **sans** l'élément (ramené à [0, n]) ; rang 0 :
 * tête du premier groupe ; sinon l'élément rejoint le groupe de celui qui le précède. Un groupe vidé reste (comme
 * `moveItem`). Rang non fini, barre ou élément absents : rien ne change.
 */
export function moveItemTo(p: Profile, barId: string, itemId: string, to: number): Profile {
  return mapBar(p, barId, (bar) => {
    if (!Number.isFinite(to)) return bar;
    const g = bar.groups.findIndex((gr) => gr.items.some((it) => it.id === itemId));
    if (g === -1) return bar;
    const moved = bar.groups[g]!.items.find((it) => it.id === itemId)!;
    const lists = bar.groups.map((gr) => gr.items.filter((it) => it.id !== itemId));
    const total = lists.reduce((n, l) => n + l.length, 0);
    const rank = Math.max(0, Math.min(Math.trunc(to), total));
    if (rank === 0) {
      lists[0]!.unshift(moved);
    } else {
      let left = rank;
      for (const l of lists) {
        if (left <= l.length) {
          l.splice(left, 0, moved);
          break;
        }
        left -= l.length;
      }
    }
    return { ...bar, groups: bar.groups.map((gr, k) => ({ ...gr, items: lists[k]! })) };
  });
}

/** Seule action de `ANNOTATION_MAIN_ACTIONS` proposée à toute barre : l'entrée en annotation (`toolbar.ts:660`). */
const ANNOTATION_ENTRY: ActionId = "desktop-annotation";
/** Actions qui n'agissent que dans la barre montrée en annotation : bascule, écran suivant, figer, envoyer. */
const ONLY_IN_ANNOTATION: ReadonlySet<ActionId> = new Set([...ANNOTATION_MAIN_ACTIONS].filter((a) => a !== ANNOTATION_ENTRY));
/** Actions qui agissent en annotation : fenêtre principale et rejouées dans `annotate` (`toolbar.ts:653`, `:660`). */
const ACTS_IN_ANNOTATION: ReadonlySet<ActionId> = new Set([...ANNOTATION_MAIN_ACTIONS, ...ANNOTATION_REMOTE_ACTIONS]);

type CatalogKind = "annotation" | "shown-in-annotation" | "board";
/** design-l3 (L3-17) : actions proposées selon la barre (table, ferme le constat `toolbar-profiles.ts:112`). */
const CATALOG_ACTIONS: Readonly<Record<CatalogKind, (id: ActionId) => boolean>> = {
  annotation: (id) => ACTS_IN_ANNOTATION.has(id),
  "shown-in-annotation": () => true,
  board: (id) => !ONLY_IN_ANNOTATION.has(id),
};
/** Barre de rôle `annotation` ; barre `tools` montrée en annotation (profil d'avant L4, `annotationBarOf`) ; toute autre. */
const catalogKind = (p: Profile, bar: Toolbar): CatalogKind =>
  bar.role === ANNOTATION_ROLE ? "annotation" : annotationBarOf(p)?.id === bar.id ? "shown-in-annotation" : "board";
```

  Remplacer `catalog` (`:106-121`) par :

```ts
/**
 * Ce qu'on peut ajouter à une barre (P15 ; design-l3, L3-17) : barre `pages` = actions seules, autre rôle = outils puis
 * actions ; actions filtrées par `CATALOG_ACTIONS` selon la barre ; moins ce qu'elle a ; jamais les actions du tableau.
 */
export function catalog(p: Profile, barId: string): CatalogEntry[] {
  const bar = p.toolbars.find((b) => b.id === barId);
  if (bar === undefined) return [];
  const offered = CATALOG_ACTIONS[catalogKind(p, bar)];
  const items = bar.groups.flatMap((g) => g.items);
  const tools = new Set(items.flatMap((it) => (it.kind === "tool" && it.tool !== undefined ? [it.tool] : [])));
  const actions = new Set(items.flatMap((it) => (it.kind === "action" && it.action !== undefined ? [it.action] : [])));
  const toolEntries: CatalogEntry[] =
    bar.role === "pages"
      ? []
      : Object.entries(TOOL_TABLE).filter(([id]) => !tools.has(id)).map(([id, e]) => ({ kind: "tool", ref: id, label: e.label }));
  const actionEntries: CatalogEntry[] = Object.entries(ACTION_TABLE)
    .filter(([id]) => offered(id) && !actions.has(id) && !TABLE_ACTIONS.includes(id)) // actions du tableau : rangée contextuelle (C10a)
    .map(([id, e]) => ({ kind: "action", ref: id, label: e.label }));
  return [...toolEntries, ...actionEntries];
}
```

  En fin de fichier, ajouter :

```ts
/** design-l3 (L3-20, L3-32) : même profil écrit (`serializeProfile`) ; partagé par l'éditeur et l'application. */
export function sameProfile(a: Profile, b: Profile): boolean {
  return JSON.stringify(serializeProfile(a)) === JSON.stringify(serializeProfile(b));
}

/** design-l3 (L3-32) : question posée avant d'abandonner un brouillon différent du profil enregistré. */
export const abandonQuestion = (label: string): string => `Abandonner les changements du profil « ${label} » ?`;
```

- [ ] **Étape 4 : implémenter dans `profile-actions.ts`.** Dans l'interface `ProfileActions`, après
  `exportActive(): Promise<boolean>;`, ajouter :

```ts
  /** design-l3 (L3-21) : écrit le profil donné (le brouillon du panneau), sans rien enregistrer. */
  exportProfile(p: Profile): Promise<boolean>;
```

  Dans `createProfileActions`, juste avant `return {`, ajouter :

```ts
  const exportProfile = async (p: Profile): Promise<boolean> => {
    let name = "";
    try {
      const f = profileToFile(p);
      name = f.name;
      return await d.files.save(f.name, f.text);
    } catch (e) {
      await d.shell.notify(`Profil non exporté${name === "" ? "" : ` (${name})`} : ${messageOf(e)}`);
      return false;
    }
  };
```

  et remplacer la méthode `async exportActive() { … }` (`:106-116`) par :

```ts
    exportProfile,
    exportActive: () => exportProfile(d.active.profile()),
```

- [ ] **Étape 5 : vérifier le vert** — commande bornée de la section. Attendu : voir « Preuve ».

- [ ] **Étape 6 : tsc** —
  `cd /home/adminjd/projets/roomboard-wt/design-l3--T1/apps/web && export TMPDIR=$HOME/.cache/tmp/of61-tmp && nice -n 10 npx tsc --noEmit > "$TMPDIR/T1-tsc.log" 2>&1; echo "tsc code $?"; tail -20 "$TMPDIR/T1-tsc.log"`
  Attendu : `tsc code 0`.

- [ ] **Étape 7 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l3--T1
git add apps/web/src/profile-edit.ts
git add apps/web/src/profile-edit.test.ts
git add apps/web/src/app/profile-actions.ts
git add apps/web/src/app/profile-actions.test.ts
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(profile-edit): moveItemTo, catalog per bar, sameProfile, abandon question, exportProfile" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport de la tâche : nombre de tests, retouche faite à `profile-edit.test.ts:84` (citée pour la PR), ligne
`Réutilisation : …`.

---

### Tâche T2 — Dix icônes de la maquette 03 et notice Lucide
<a id="tache-t2"></a>

**Objectif.** Ajouter à `ICONS` les dix tracés de L3-25, recopiés tels quels des `<symbol>` de
`docs/design/maquettes/03-profils.html` (Lucide `7981a0798a`, ISC), et les nommer dans la notice de licence.

**Fichiers.**
- Modifier : `apps/web/src/ui/icons.ts` (fin de `ICONS`, après `drop`, `:71`), `apps/web/src/ui/icons.test.ts`
  (`:5-26` ; test `:23-27` ; test ajouté après `:31`), `THIRD_PARTY_NOTICES.md` (`:511-525`).

**Interfaces.**
- Consomme : `ICONS`, `IconNode`, `ICON_VIEWBOX` (`icons.ts:8-14`).
- Produit : dix clés neuves d'`ICONS` : `close`, `grip`, `hidden`, `dock-top`, `dock-bottom`, `dock-left`, `dock-right`,
  `dock-float`, `import`, `down` (lues par T5 et T6 au travers de `Icon` et `IconButton`).
- Réutilise : `apps/web/src/ui/icons.ts:14` (`ICONS`) — table étendue de dix entrées (L3-25), aucune autre table.
- Réutilise : `apps/web/src/ui/icons.ts:148` (`iconFor`) — `iconFor(item: ToolItem, stateIcon?: string): string | null`,
  non touchée.
- Rapport : `Réutilisation : appelé icons.ts (ICONS étendue)` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/design-l3--T2/apps/web && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of61-tmp && mkdir -p "$TMPDIR" && nice -n 10 npx vitest run src/ui/icons.test.ts src/ui/IconButton.test.tsx --reporter=verbose > "$TMPDIR/T2-vitest.log" 2>&1; echo "code $?"; grep -E "✓|×|FAIL |Test Files|Tests " "$TMPDIR/T2-vitest.log" | tail -40`
Preuve : `code 0`, `Test Files  2 passed (2)`, lignes `58 icônes` et `maquette 03` et `notice` présentes, aucun `×`.
Puis `cd /home/adminjd/projets/roomboard-wt/design-l3--T2 && bash scripts/tests/controle-icones.test.sh` → dernière
ligne `controle-icones.test : 9 cas OK`.

**Preuve visuelle.** Aucune ici : les icônes sont mesurées dans le panneau par T8 (calage, `dock-top` sans demi-teinte).

**Contraintes (recopiées).** G1 test rouge d'abord, aucun test retiré, désactivé ou sauté · G2 retouche de forme
(D2) : `icons.test.ts:23-27`, 48 → 58 icônes, les dix noms ajoutés à l'ensemble attendu ; toute autre rougeur arrête
la tâche · G3 aucune dépendance ajoutée · G4 tracés Lucide (ISC) recopiés tels quels de la maquette 03, aucune icône
dessinée, mention dans `THIRD_PARTY_NOTICES.md`, `scripts/tests/controle-icones.test.sh` vert · G6 `nice -n 10`,
`export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`, tests isolés · G7 sorties dans
`$HOME/.cache/tmp/of61-tmp/T2-*` · G8 auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais
terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un, aucun push · G12 worktree
`/home/adminjd/projets/roomboard-wt/design-l3--T2`.

**Interdits.** Ne toucher aucune icône existante ni `TOOL_ICONS` / `ACTION_ICONS` ; ne pas recopier les tracés à la main
depuis Lucide en ligne : la maquette 03 est la source.

**Terminé quand.** Tests verts, contrôle des icônes vert, `tsc` 0, commit fait.

- [ ] **Étape 0 : préparer le worktree** —
  `cd /home/adminjd/projets/roomboard-wt/design-l3--T2 && mkdir -p $HOME/.cache/tmp/of61-tmp && (test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile > $HOME/.cache/tmp/of61-tmp/T2-install.log 2>&1) && for d in wasm wasm-formats; do test -d apps/web/src/$d || cp -r /home/adminjd/projets/roomboard-wt/design-l3/apps/web/src/$d apps/web/src/$d; done && ls apps/web/src/wasm/roomboard_wasm.d.ts`

- [ ] **Étape 1 : tests (rouges).** Dans `apps/web/src/ui/icons.test.ts`, après la fonction `symbol02` (`:19-26`),
  ajouter :

```ts
const MAQUETTE_03 = readFileSync(join(__dirname, "..", "..", "..", "..", "docs", "design", "maquettes", "03-profils.html"), "utf8");
const NOTICE = readFileSync(join(__dirname, "..", "..", "..", "..", "THIRD_PARTY_NOTICES.md"), "utf8");
/** Symbole `i-<nom>` de la maquette 03 (design-l3), lu comme `IconNode`. */
function symbol03(name: string): IconNode {
  const m = MAQUETTE_03.match(new RegExp(`<symbol id="i-${name}" viewBox="-0\\.25 -0\\.25 24 24">([\\s\\S]*?)</symbol>`));
  if (!m) throw new Error(`symbole absent : i-${name}`);
  return [...m[1]!.matchAll(/<(path|rect|circle|line|polyline|ellipse)\s([^>]*?)\s*\/>/g)].map(([, tag, attrs]) => [
    tag as IconNode[number][0],
    Object.fromEntries([...attrs!.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k!, v!])),
  ]);
}
/** design-l3 (L3-25) : icônes du panneau des profils, nom RoomBoard → nom Lucide. */
const PANEL_ICONS: Readonly<Record<string, string>> = {
  close: "x", grip: "grip-vertical", hidden: "eye-off", "dock-top": "panel-top", "dock-bottom": "panel-bottom",
  "dock-left": "panel-left", "dock-right": "panel-right", "dock-float": "app-window", import: "upload", down: "chevron-down",
};
```

  Retouche de forme (D2) du test `:23-27` :

```ts
  it("ICONS : 58 icônes, exactement celles qu'attribuent les tables, les états, la zone de dépôt, le bandeau et le panneau des profils", () => {
    const used = new Set([...Object.values(TOOL_ICONS), ...Object.values(ACTION_ICONS), "pen-line", "reset", "check", "drop", ...Object.keys(PANEL_ICONS)]);
    expect(Object.keys(ICONS).sort()).toEqual([...used].sort());
    expect(Object.keys(ICONS)).toHaveLength(58);
  });
```

  Après le test « design-l4 : check et drop recopiés… », ajouter :

```ts
  it("design-l3 : les dix icônes du panneau recopiées à l'identique de la maquette 03 (Lucide x, grip-vertical, …)", () => {
    for (const name of Object.keys(PANEL_ICONS)) expect(ICONS[name], name).toEqual(symbol03(name));
  });
  it("design-l3 : notice de licence : chaque icône du panneau nommée avec son nom Lucide", () => {
    expect(NOTICE).toContain("docs/design/maquettes/03-profils.html");
    for (const [name, lucide] of Object.entries(PANEL_ICONS)) expect(NOTICE, name).toContain(`\`${name}\` (Lucide \`${lucide}\`)`);
  });
```

- [ ] **Étape 2 : vérifier le rouge** — commande bornée. Attendu : `code 1`, `58` attendu contre `48`, `symbole`
  comparé à `undefined`, notice sans les noms.

- [ ] **Étape 3 : icônes.** Dans `apps/web/src/ui/icons.ts`, après l'entrée `"drop": …,` (dernière d'`ICONS`), ajouter :

```ts
  // design-l3 : maquette 03 (symboles i-<nom> de 03-profils.html ; Lucide x, grip-vertical, eye-off, panel-top,
  // panel-bottom, panel-left, panel-right, app-window, upload, chevron-down, lucide-icons/lucide@7981a0798a), panneau des profils.
  "close": [["path", { d: "M18 6 6 18" }], ["path", { d: "m6 6 12 12" }]],
  "grip": [["circle", { cx: "9", cy: "12", r: "1" }], ["circle", { cx: "9", cy: "5", r: "1" }], ["circle", { cx: "9", cy: "19", r: "1" }], ["circle", { cx: "15", cy: "12", r: "1" }], ["circle", { cx: "15", cy: "5", r: "1" }], ["circle", { cx: "15", cy: "19", r: "1" }]],
  "hidden": [["path", { d: "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" }], ["path", { d: "M14.084 14.158a3 3 0 0 1-4.242-4.242" }], ["path", { d: "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" }], ["path", { d: "m2 2 20 20" }]],
  "dock-top": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M3 9h18" }]],
  "dock-bottom": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M3 15h18" }]],
  "dock-left": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M9 3v18" }]],
  "dock-right": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M15 3v18" }]],
  "dock-float": [["rect", { x: "2", y: "4", width: "20", height: "16", rx: "2" }], ["path", { d: "M10 4v4" }], ["path", { d: "M2 8h20" }], ["path", { d: "M6 4v4" }]],
  "import": [["path", { d: "M12 3v12" }], ["path", { d: "m17 8-5-5-5 5" }], ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }]],
  "down": [["path", { d: "m6 9 6 6 6-6" }]],
```

  Contrôle de recopie : `grep -c '<symbol id="i-\(close\|grip\|hidden\|dock-top\|dock-bottom\|dock-left\|dock-right\|dock-float\|import\|down\)"' /home/adminjd/projets/roomboard-wt/design-l3--T2/docs/design/maquettes/03-profils.html`
  → `10` ; le test de l'étape 1 compare chaque tracé à son symbole.

- [ ] **Étape 4 : notice.** Dans `THIRD_PARTY_NOTICES.md`, remplacer le titre `## Icônes Lucide (ISC), design L1 et L4`
  par `## Icônes Lucide (ISC), design L1, L3 et L4`, puis, après le point « Reprises de la maquette
  `docs/design/maquettes/02-annotation-bureau.html` … `drop` (Lucide `file-down`). », ajouter :

```markdown
- Reprises de la maquette `docs/design/maquettes/03-profils.html` (design L3, tracés Lucide au même commit), noms
  RoomBoard : `close` (Lucide `x`), `grip` (Lucide `grip-vertical`), `hidden` (Lucide `eye-off`), `dock-top` (Lucide
  `panel-top`), `dock-bottom` (Lucide `panel-bottom`), `dock-left` (Lucide `panel-left`), `dock-right` (Lucide
  `panel-right`), `dock-float` (Lucide `app-window`), `import` (Lucide `upload`), `down` (Lucide `chevron-down`).
```

  Attention : le test cherche `` `<nom>` (Lucide `<lucide>`) `` d'un seul tenant : aucun retour à la ligne entre le nom
  et sa parenthèse ; couper la ligne seulement après une virgule, comme ci-dessus.

- [ ] **Étape 5 : vérifier le vert** — commande bornée, puis `bash scripts/tests/controle-icones.test.sh`. Attendu :
  voir « Preuve ».

- [ ] **Étape 6 : tsc** —
  `cd /home/adminjd/projets/roomboard-wt/design-l3--T2/apps/web && export TMPDIR=$HOME/.cache/tmp/of61-tmp && nice -n 10 npx tsc --noEmit > "$TMPDIR/T2-tsc.log" 2>&1; echo "tsc code $?"; tail -20 "$TMPDIR/T2-tsc.log"`
  Attendu : `tsc code 0`.

- [ ] **Étape 7 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l3--T2
git add apps/web/src/ui/icons.ts
git add apps/web/src/ui/icons.test.ts
git add THIRD_PARTY_NOTICES.md
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(icons): ten profile panel icons from mockup 03 (Lucide, ISC) and notice" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport de la tâche : nombre d'icônes, sortie du contrôle des icônes, retouche D2 citée pour la PR, ligne
`Réutilisation : …`.

---

### Tâche T3 — Squelette du geste extrait (`pointer-gesture.ts`) et tri au pointeur (`sort-drag.ts`)
<a id="tache-t3"></a>

**Objectif.** DA-L3-1 : extraire de `resource-drag.ts` le squelette du geste au pointeur (capture, seuil, Échap,
`pointercancel`, capture perdue) dans `ui/pointer-gesture.ts`, le faire rappeler par `startResourceDrag` à comportement
égal (ses 9 tests verts **sans retouche**), puis bâtir dessus `ui/sort-drag.ts` : la ligne tirée suit le pointeur, les
autres s'écartent, le corps du panneau défile à 48 px de ses bords, un seul `drop(to)` au lâcher (L3-13, L3-14),
`tap()` sous le seuil (L3-15 a), rien sur Échap, `pointercancel`, capture perdue.

**Patron à ne pas reprendre.** Recopier le corps de `startResourceDrag` (`apps/web/src/ui/resource-drag.ts:19-86`) dans
`sort-drag.ts` (duplication que DA-L3-1 interdit) ; viser une cible par `elementsFromPoint` ou poser un fantôme dans
`body` (`resource-drag.ts:24-48` : règle de la scène, non substituable) ; tout glisser HTML5 (`draggable`, événements
`drag*`, interdits par U12 et par la garde `Toolbar.test.tsx:149-160`). Chemin de référence du squelette :
`apps/web/src/ui/resource-drag.ts:29-85`. Si l'extraction ne garde pas les 9 tests de `resource-drag.test.ts` verts sans
retouche, l'abandonner (DA-L3-1, repli) : `sort-drag.ts` sur son propre squelette, recopie justifiée au rapport.

**Fichiers.**
- Créer : `apps/web/src/ui/pointer-gesture.ts`, `apps/web/src/ui/pointer-gesture.test.ts`, `apps/web/src/ui/sort-drag.ts`,
  `apps/web/src/ui/sort-drag.test.ts`
- Modifier : `apps/web/src/ui/resource-drag.ts` (`:1-86`, réécrit sur le squelette)

**Interfaces.**
- Consomme : rien des autres tâches.
- Produit :
  - `pointer-gesture.ts` : `export const DRAG_THRESHOLD_PX = 4` ;
    `export interface PointerGesture { accept?(dx: number, dy: number, pointerType: string): boolean; move(m: PointerEvent): void; finish(u: PointerEvent | null, dragged: boolean): void }` ;
    `export function startPointerGesture(e: PointerEvent, g: PointerGesture): void` (`finish` une seule fois ; `u` nul :
    Échap, `pointercancel`, capture perdue, `accept` faux ; `dragged` faux : sous le seuil).
  - `sort-drag.ts` : `export const SORT_EDGE_PX = 48` ;
    `export interface SortDragOptions { rows(): readonly HTMLElement[]; readonly scroller: HTMLElement; readonly from: number; moved(dy: number, slot: number): void; drop(to: number): void; tap(): void; cancel(): void }` ;
    `export function slotOf(mids: readonly number[], y: number): number` ;
    `export function startSortDrag(e: PointerEvent, opts: SortDragOptions): void` (attribut `data-dragging` sur la ligne
    tirée pendant le geste, `style.transform` des lignes remis à `""` à la fin).
  - `resource-drag.ts` : `DRAG_THRESHOLD_PX` réexporté, `DragOptions` et `startResourceDrag` inchangés de signature.
- Réutilise : `apps/web/src/ui/resource-drag.ts:19-86` (`startResourceDrag`) et `DRAG_THRESHOLD_PX` (`:11`) — extraits
  dans `ui/pointer-gesture.ts` : `startPointerGesture(e: PointerEvent, g: PointerGesture): void` ;
  `PointerGesture { accept?(dx: number, dy: number, pointerType: string): boolean; move(m: PointerEvent): void; finish(u: PointerEvent | null, dragged: boolean): void }` ;
  `DRAG_THRESHOLD_PX` y déménage, réexporté par `resource-drag.ts` ; `startResourceDrag` le rappelle (`accept` = règle
  du doigt vertical).
- Réutilise : `apps/web/src/ui/resource-drag.ts:19` (ne se substitue pas : cible la scène) — module neuf
  `ui/sort-drag.ts` : `startSortDrag(e: PointerEvent, opts: SortDragOptions): void` sur `startPointerGesture` ;
  `SortDragOptions { rows(): readonly HTMLElement[]; scroller: HTMLElement; from: number; moved(dy: number, slot: number): void; drop(to: number): void; tap(): void; cancel(): void }` ;
  `slotOf(mids: readonly number[], y: number): number`.
- Rapport : `Réutilisation : appelé pointer-gesture.ts depuis resource-drag.ts et sort-drag.ts` ou
  `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/design-l3--T3/apps/web && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of61-tmp && mkdir -p "$TMPDIR" && nice -n 10 npx vitest run src/ui/pointer-gesture.test.ts src/ui/sort-drag.test.ts src/ui/resource-drag.test.ts src/ui/Toolbar.test.tsx src/ui/LibraryPanel.test.tsx --reporter=verbose > "$TMPDIR/T3-vitest.log" 2>&1; echo "code $?"; grep -E "✓|×|FAIL |Test Files|Tests " "$TMPDIR/T3-vitest.log" | tail -80`
Preuve : `code 0`, `Test Files  5 passed (5)`, ≥ 9 lignes `DA-L3-1`, ≥ 11 lignes `L3-13` (dont `slotOf`), les 9 lignes
`C4 :` de `resource-drag.test.ts` vertes, la garde « aucun switch… aucun glisser HTML5 dans src/ui » de
`Toolbar.test.tsx` verte ; aucun `×`. Si `src/ui/LibraryPanel.test.tsx` n'existe pas, le retirer de la commande (vitest
le dirait : `No test files found` pour ce motif) et le noter au rapport.

**Preuve visuelle.** Aucune ici : le tri est joué au navigateur par T8 (S2 : souris, doigt, Échap).

**Contraintes (recopiées).** G1 test rouge d'abord, aucun test retiré, désactivé ou sauté, aucun seuil changé
(`DRAG_THRESHOLD_PX` reste 4) · G2 `resource-drag.test.ts` vert sans aucune retouche (comportement du glisser des
cartes inchangé) ; toute rougeur arrête la tâche · G3 aucune dépendance ajoutée · G6 `nice -n 10`,
`export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`, tests isolés · G7 sorties dans
`$HOME/.cache/tmp/of61-tmp/T3-*` · G8 auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais
terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un, aucun push · G9 aucun
`switch (`, `localStorage`, `draggable`, `dragstart` dans les trois fichiers (pas même en commentaire) · G12 worktree
`/home/adminjd/projets/roomboard-wt/design-l3--T3`.

**Interdits.** Ne pas toucher `LibraryPanel.tsx` ni `resource-drag.test.ts` ; ne pas importer de composant Solid dans
`sort-drag.ts` (module DOM pur) ; pas de minuteur hors `requestAnimationFrame`.

**Terminé quand.** Les cinq fichiers de test verts, `tsc` 0, commit fait.

- [ ] **Étape 0 : préparer le worktree** —
  `cd /home/adminjd/projets/roomboard-wt/design-l3--T3 && mkdir -p $HOME/.cache/tmp/of61-tmp && (test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile > $HOME/.cache/tmp/of61-tmp/T3-install.log 2>&1) && for d in wasm wasm-formats; do test -d apps/web/src/$d || cp -r /home/adminjd/projets/roomboard-wt/design-l3/apps/web/src/$d apps/web/src/$d; done && ls apps/web/src/ui/resource-drag.test.ts apps/web/src/ui/LibraryPanel.test.tsx`

- [ ] **Étape 1 : tests du squelette (rouges).** Créer `apps/web/src/ui/pointer-gesture.test.ts` :

```ts
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { DRAG_THRESHOLD_PX, startPointerGesture, type PointerGesture } from "./pointer-gesture";
import { DRAG_THRESHOLD_PX as FROM_RESOURCE } from "./resource-drag";

afterEach(() => {
  document.body.innerHTML = "";
});

function source(): HTMLButtonElement {
  const s = document.createElement("button");
  s.setPointerCapture = vi.fn();
  s.releasePointerCapture = vi.fn();
  document.body.append(s);
  return s;
}
const ev = (type: string, x: number, y: number, pointerType = "mouse", button = 0): PointerEvent => {
  const e = new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true, button });
  Object.defineProperty(e, "pointerType", { value: pointerType });
  return e;
};
function start(s: HTMLElement, over: Partial<PointerGesture> = {}, pointerType = "mouse", button = 0) {
  const g = { move: vi.fn<(m: PointerEvent) => void>(), finish: vi.fn<(u: PointerEvent | null, dragged: boolean) => void>(), ...over };
  const down = ev("pointerdown", 10, 10, pointerType, button);
  Object.defineProperty(down, "currentTarget", { value: s });
  startPointerGesture(down, g);
  return g;
}

describe("pointer-gesture (design-l3, DA-L3-1)", () => {
  it("DA-L3-1 : le seuil vit ici (4 px), resource-drag le réexporte", () => {
    expect(DRAG_THRESHOLD_PX).toBe(4);
    expect(FROM_RESOURCE).toBe(DRAG_THRESHOLD_PX);
  });
  it("DA-L3-1 : capture du pointeur à l'appui", () => {
    const s = source();
    start(s);
    expect(s.setPointerCapture).toHaveBeenCalledWith(1);
  });
  it("DA-L3-1 : sous le seuil, aucun move ; lâcher = un toucher, finish(u, false)", () => {
    const s = source();
    const g = start(s);
    s.dispatchEvent(ev("pointermove", 10 + DRAG_THRESHOLD_PX - 1, 10));
    s.dispatchEvent(ev("pointerup", 10 + DRAG_THRESHOLD_PX - 1, 10));
    expect(g.move).not.toHaveBeenCalled();
    expect(g.finish).toHaveBeenCalledTimes(1);
    expect(g.finish.mock.calls[0]![0]?.type).toBe("pointerup");
    expect(g.finish.mock.calls[0]![1]).toBe(false);
  });
  it("DA-L3-1 : au-delà du seuil, move à chaque mouvement ; lâcher = finish(u, true), capture rendue", () => {
    const s = source();
    const g = start(s);
    s.dispatchEvent(ev("pointermove", 30, 10));
    s.dispatchEvent(ev("pointermove", 40, 10));
    s.dispatchEvent(ev("pointerup", 40, 10));
    expect(g.move).toHaveBeenCalledTimes(2);
    expect(g.finish.mock.calls[0]![1]).toBe(true);
    expect(s.releasePointerCapture).toHaveBeenCalledWith(1);
  });
  it("DA-L3-1 : accept reçoit les écarts absolus et le type de pointeur de l'appui ; faux : finish(null, false), plus rien ensuite", () => {
    const s = source();
    const accept = vi.fn(() => false);
    const g = start(s, { accept }, "touch");
    s.dispatchEvent(ev("pointermove", 12, 60, "touch"));
    expect(accept).toHaveBeenCalledWith(2, 50, "touch");
    expect(g.finish).toHaveBeenCalledWith(null, false);
    s.dispatchEvent(ev("pointermove", 200, 60, "touch"));
    s.dispatchEvent(ev("pointerup", 200, 60, "touch"));
    expect(g.move).not.toHaveBeenCalled();
    expect(g.finish).toHaveBeenCalledTimes(1);
  });
  it("DA-L3-1 : Échap annule (finish(null, true)), le lâcher qui suit n'appelle rien", () => {
    const s = source();
    const g = start(s);
    s.dispatchEvent(ev("pointermove", 40, 10));
    const k = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    document.dispatchEvent(k);
    expect(k.defaultPrevented).toBe(true);
    s.dispatchEvent(ev("pointerup", 40, 10));
    expect(g.finish).toHaveBeenCalledTimes(1);
    expect(g.finish).toHaveBeenCalledWith(null, true);
  });
  it("DA-L3-1 : une autre touche qu'Échap ne fait rien", () => {
    const s = source();
    const g = start(s);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(g.finish).not.toHaveBeenCalled();
  });
  it("DA-L3-1 : pointercancel et capture perdue annulent, une seule fois", () => {
    const s = source();
    const g = start(s);
    s.dispatchEvent(ev("pointermove", 40, 10));
    s.dispatchEvent(ev("pointercancel", 40, 10));
    s.dispatchEvent(ev("lostpointercapture", 40, 10));
    expect(g.finish).toHaveBeenCalledTimes(1);
    expect(g.finish).toHaveBeenCalledWith(null, true);
    const s2 = source();
    const g2 = start(s2);
    s2.dispatchEvent(ev("lostpointercapture", 10, 10));
    expect(g2.finish).toHaveBeenCalledWith(null, false);
  });
  it("DA-L3-1 : bouton secondaire : aucun geste (ni capture ni finish)", () => {
    const s = source();
    const g = start(s, {}, "mouse", 2);
    s.dispatchEvent(ev("pointerup", 40, 10));
    expect(s.setPointerCapture).not.toHaveBeenCalled();
    expect(g.finish).not.toHaveBeenCalled();
  });
});
```

- [ ] **Étape 2 : tests du tri (rouges).** Créer `apps/web/src/ui/sort-drag.test.ts` :

```ts
// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SORT_EDGE_PX, slotOf, startSortDrag, type SortDragOptions } from "./sort-drag";

const ROW = 48;
const TOP = 100;
const mid = (i: number): number => TOP + i * ROW + ROW / 2;
afterEach(() => {
  document.body.innerHTML = "";
});

/** Liste de `n` lignes de 48 px à partir de y = 100, dans un `scroller` de [top, bottom] ; rectangles posés à la main
 *  (happy-dom ne calcule aucune mise en page). */
function list(n: number, view = { top: 0, bottom: 2000 }) {
  const scroller = document.createElement("div");
  let scroll = 0;
  Object.defineProperty(scroller, "scrollTop", { get: () => scroll, set: (v: number) => void (scroll = Math.max(0, v)) });
  scroller.getBoundingClientRect = () => new DOMRect(0, view.top, 500, view.bottom - view.top);
  const ul = document.createElement("ul");
  const rows = Array.from({ length: n }, (_, i) => {
    const li = document.createElement("li");
    li.getBoundingClientRect = () => new DOMRect(0, TOP + i * ROW - scroll, 500, ROW);
    const grip = document.createElement("button");
    grip.setPointerCapture = vi.fn();
    grip.releasePointerCapture = vi.fn();
    li.append(grip);
    ul.append(li);
    return li;
  });
  scroller.append(ul);
  document.body.append(scroller);
  return { scroller, rows };
}
const ev = (type: string, y: number, pointerType = "mouse"): PointerEvent => {
  const e = new PointerEvent(type, { clientX: 20, clientY: y, pointerId: 1, bubbles: true });
  Object.defineProperty(e, "pointerType", { value: pointerType });
  return e;
};
function drag(rows: HTMLElement[], scroller: HTMLElement, from: number, pointerType = "mouse") {
  const opts = {
    rows: () => rows,
    scroller,
    from,
    moved: vi.fn<(dy: number, slot: number) => void>(),
    drop: vi.fn<(to: number) => void>(),
    tap: vi.fn<() => void>(),
    cancel: vi.fn<() => void>(),
  } satisfies SortDragOptions;
  const grip = rows[from]!.querySelector("button")!;
  const down = ev("pointerdown", mid(from), pointerType);
  Object.defineProperty(down, "currentTarget", { value: grip });
  startSortDrag(down, opts);
  return {
    opts,
    to: (y: number) => grip.dispatchEvent(ev("pointermove", y, pointerType)),
    up: (y: number) => grip.dispatchEvent(ev("pointerup", y, pointerType)),
    grip,
  };
}
const steps = (from: number, to: number): number[] => {
  const out: number[] = [];
  for (let y = from; from > to ? y > to : y < to; y += from > to ? -8 : 8) out.push(y);
  return [...out, to];
};

describe("sort-drag (design-l3, L3-13, L3-14)", () => {
  it("L3-13 : slotOf : nombre de milieux au-dessus du pointeur (strictement)", () => {
    expect(slotOf([124, 172, 220], 100)).toBe(0);
    expect(slotOf([124, 172, 220], 150)).toBe(1);
    expect(slotOf([124, 172, 220], 172)).toBe(1);
    expect(slotOf([124, 172, 220], 500)).toBe(3);
    expect(slotOf([], 10)).toBe(0);
  });
  it("L3-13 : bord de défilement à 48 px", () => {
    expect(SORT_EDGE_PX).toBe(48);
  });
  it("L3-13 : souris, Texte (rang 3) tiré jusqu'en tête : la ligne suit, les autres s'écartent ; un seul drop(0)", () => {
    const { rows, scroller } = list(5);
    const d = drag(rows, scroller, 3);
    for (const y of steps(mid(3), 110)) d.to(y);
    expect(rows[3]!.style.transform).toBe("translateY(-158px)");
    expect(rows[3]!.hasAttribute("data-dragging")).toBe(true);
    expect(rows.slice(0, 3).map((r) => r.style.transform)).toEqual(["translateY(48px)", "translateY(48px)", "translateY(48px)"]);
    expect(rows[4]!.style.transform).toBe("");
    expect(d.opts.moved).toHaveBeenLastCalledWith(-158, 0);
    expect(d.opts.drop).not.toHaveBeenCalled();
    d.up(110);
    expect(d.opts.drop).toHaveBeenCalledTimes(1);
    expect(d.opts.drop).toHaveBeenCalledWith(0);
    expect(rows.map((r) => r.style.transform)).toEqual(["", "", "", "", ""]);
    expect(rows[3]!.hasAttribute("data-dragging")).toBe(false);
    expect(d.opts.tap).not.toHaveBeenCalled();
    expect(d.opts.cancel).not.toHaveBeenCalled();
  });
  it("L3-13 : vers le bas jusqu'en fin (sous la dernière ligne) : drop(4), les lignes passées remontent", () => {
    const { rows, scroller } = list(5);
    const d = drag(rows, scroller, 0);
    for (const y of steps(mid(0), mid(4) + 40)) d.to(y);
    expect(rows.slice(1).map((r) => r.style.transform)).toEqual(["translateY(-48px)", "translateY(-48px)", "translateY(-48px)", "translateY(-48px)"]);
    d.up(mid(4) + 40);
    expect(d.opts.drop).toHaveBeenCalledWith(4);
  });
  it("L3-13 : au doigt, même geste : drop(0)", () => {
    const { rows, scroller } = list(5);
    const d = drag(rows, scroller, 3, "touch");
    for (const y of steps(mid(3), 110)) d.to(y);
    d.up(110);
    expect(d.opts.drop).toHaveBeenCalledWith(0);
  });
  it("L3-13 : Échap pendant le geste : cancel, lignes remises, aucun drop au lâcher", () => {
    const { rows, scroller } = list(5);
    const d = drag(rows, scroller, 3);
    for (const y of steps(mid(3), 200)) d.to(y);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }));
    expect(d.opts.cancel).toHaveBeenCalledTimes(1);
    expect(rows.every((r) => r.style.transform === "")).toBe(true);
    d.up(110);
    expect(d.opts.drop).not.toHaveBeenCalled();
  });
  it("L3-13 : capture perdue (ligne redessinée) : cancel, aucun drop", () => {
    const { rows, scroller } = list(5);
    const d = drag(rows, scroller, 3);
    d.to(200);
    d.grip.dispatchEvent(ev("lostpointercapture", 200));
    expect(d.opts.cancel).toHaveBeenCalledTimes(1);
    expect(d.opts.drop).not.toHaveBeenCalled();
  });
  it("L3-15 : toucher sous le seuil : tap, ni drop ni cancel", () => {
    const { rows, scroller } = list(5);
    const d = drag(rows, scroller, 3);
    d.to(mid(3) - 2);
    d.up(mid(3) - 2);
    expect(d.opts.tap).toHaveBeenCalledTimes(1);
    expect(d.opts.drop).not.toHaveBeenCalled();
    expect(d.opts.cancel).not.toHaveBeenCalled();
  });
  it("L3-13 : lâché à son propre rang : cancel, aucun drop", () => {
    const { rows, scroller } = list(5);
    const d = drag(rows, scroller, 3);
    d.to(mid(3) - 30);
    d.to(mid(3) + 5);
    d.up(mid(3) + 5);
    expect(d.opts.cancel).toHaveBeenCalledTimes(1);
    expect(d.opts.drop).not.toHaveBeenCalled();
  });
  it("L3-13 : pointeur à moins de 48 px du bas du corps : le corps défile, et s'arrête au lâcher", async () => {
    const { rows, scroller } = list(5, { top: 0, bottom: 300 });
    const d = drag(rows, scroller, 3);
    d.to(mid(3) + 20);
    await new Promise((r) => setTimeout(r, 80));
    expect(scroller.scrollTop).toBeGreaterThan(0);
    d.up(mid(3) + 20);
    const stopped = scroller.scrollTop;
    await new Promise((r) => setTimeout(r, 80));
    expect(scroller.scrollTop).toBe(stopped);
  });
  it("L3-13 : aucune ligne au rang donné : rien (ni capture ni rappel)", () => {
    const { rows, scroller } = list(2);
    const opts = { rows: () => rows, scroller, from: 5, moved: vi.fn(), drop: vi.fn(), tap: vi.fn(), cancel: vi.fn() };
    const down = ev("pointerdown", 10);
    Object.defineProperty(down, "currentTarget", { value: rows[0]!.querySelector("button")! });
    startSortDrag(down, opts);
    expect(rows[0]!.querySelector("button")!.setPointerCapture).not.toHaveBeenCalled();
  });
  it("L3-13 : aucun glisser HTML5 dans le module (U12)", () => {
    const src = readFileSync(join(__dirname, "sort-drag.ts"), "utf8");
    expect(src).not.toMatch(/draggable|dragstart|dragover|ondrop/);
  });
});
```

- [ ] **Étape 3 : vérifier le rouge** — commande bornée de la section. Attendu : `code 1`, `Failed to resolve import
  "./pointer-gesture"` et `"./sort-drag"` ; `resource-drag.test.ts` vert (9).

- [ ] **Étape 4 : squelette.** Créer `apps/web/src/ui/pointer-gesture.ts` :

```ts
/**
 * Squelette d'un geste au pointeur (design-l3, DA-L3-1), extrait de `resource-drag.ts` : Pointer Events seuls (souris,
 * stylet, doigt), jamais le glisser HTML5 ; capture du pointeur sur la source ; aucun mouvement rendu sous
 * `DRAG_THRESHOLD_PX` ; Échap, `pointercancel` et capture perdue annulent. `finish(u, dragged)` est appelé une seule
 * fois : `u` nul quand le geste est annulé ou refusé par `accept`, `dragged` faux pour un toucher sous le seuil.
 * Partagé par le glisser des cartes de la bibliothèque et le tri des lignes de l'éditeur de profils.
 */
export const DRAG_THRESHOLD_PX = 4;

export interface PointerGesture {
  /** Au premier mouvement au-delà du seuil (écarts absolus, type de pointeur de l'appui) : faux abandonne le geste. */
  accept?(dx: number, dy: number, pointerType: string): boolean;
  move(m: PointerEvent): void;
  finish(u: PointerEvent | null, dragged: boolean): void;
}

export function startPointerGesture(e: PointerEvent, g: PointerGesture): void {
  const source = e.currentTarget as HTMLElement | null;
  if (source === null || e.button > 0) return;
  const doc = source.ownerDocument;
  const x0 = e.clientX;
  const y0 = e.clientY;
  let dragged = false;
  let done = false;
  source.setPointerCapture?.(e.pointerId);

  const end = (u: PointerEvent | null): void => {
    if (done) return;
    done = true;
    source.removeEventListener("pointermove", move);
    source.removeEventListener("pointerup", up);
    source.removeEventListener("pointercancel", cancel);
    source.removeEventListener("lostpointercapture", cancel);
    doc.removeEventListener("keydown", key, true);
    source.releasePointerCapture?.(e.pointerId);
    g.finish(u, dragged);
  };
  function move(m: PointerEvent): void {
    if (!dragged) {
      const dx = Math.abs(m.clientX - x0);
      const dy = Math.abs(m.clientY - y0);
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      if (g.accept !== undefined && !g.accept(dx, dy, e.pointerType)) {
        end(null);
        return;
      }
      dragged = true;
    }
    g.move(m);
  }
  function up(u: PointerEvent): void {
    end(u);
  }
  function cancel(): void {
    end(null);
  }
  function key(k: KeyboardEvent): void {
    if (k.key !== "Escape") return;
    k.preventDefault();
    end(null);
  }
  source.addEventListener("pointermove", move);
  source.addEventListener("pointerup", up);
  source.addEventListener("pointercancel", cancel);
  source.addEventListener("lostpointercapture", cancel);
  doc.addEventListener("keydown", key, true);
}
```

- [ ] **Étape 5 : `resource-drag.ts` sur le squelette.** Remplacer tout le fichier par :

```ts
/**
 * Glisser d'une carte de la bibliothèque vers la scène (C4, D13, DA4) : Pointer Events seuls (souris, stylet, doigt),
 * jamais le glisser HTML5 (empêché par le glisser-déposer natif de la fenêtre Tauri sous Windows, mal joué au doigt).
 * Squelette du geste partagé (`pointer-gesture.ts`, design-l3 DA-L3-1) : capture, seuil, Échap, `pointercancel`,
 * capture perdue. Ici : fantôme qui suit au-delà du seuil, lâcher au-dessus de `.rb-stages` = `onDrop` au point client
 * (même forme que `DropHandler`) ; ailleurs ou annulé : rien. Au doigt, la carte laisse défiler la liste
 * (`touch-action: pan-y`, rb.css) : le glisser ne part que sur un mouvement horizontal dominant ; vertical, il est
 * abandonné au défilement. Souris et stylet : tout mouvement au-delà du seuil.
 */
import type { Point } from "../platform/files";
import { DRAG_THRESHOLD_PX, startPointerGesture } from "./pointer-gesture";

export { DRAG_THRESHOLD_PX };
export interface DragOptions {
  readonly label: string;
  readonly thumbnail?: string | null;
  /** Éléments sous le point, du dessus au dessous (tests) ; défaut : `document.elementsFromPoint`. */
  readonly hits?: (x: number, y: number) => readonly Element[];
}

export function startResourceDrag(e: PointerEvent, onDrop: (at: Point) => void, opts: DragOptions): void {
  const source = e.currentTarget as HTMLElement | null;
  if (source === null) return;
  const doc = source.ownerDocument;
  const hits = opts.hits ?? ((x: number, y: number) => doc.elementsFromPoint(x, y));
  /** D28 : l'élément du dessus (fantôme exclu) doit être sous `.rb-stages` et hors de tout `.rb-popover`. */
  const onStage = (x: number, y: number): boolean => {
    const top = hits(x, y).find((el) => el.closest(".rb-drag-ghost") === null);
    return top !== undefined && top.closest(".rb-popover") === null && top.closest(".rb-stages") !== null;
  };
  let ghost: HTMLElement | null = null;
  const place = (x: number, y: number): void => {
    if (ghost === null) {
      ghost = doc.createElement("div");
      ghost.className = "rb-drag-ghost";
      if (opts.thumbnail) {
        const img = doc.createElement("img");
        img.src = opts.thumbnail;
        img.alt = "";
        ghost.append(img);
      }
      ghost.append(doc.createTextNode(opts.label));
      doc.body.append(ghost);
    }
    ghost.style.transform = `translate(${x + 8}px, ${y + 8}px)`;
  };
  startPointerGesture(e, {
    // Au doigt, un mouvement vertical dominant fait défiler la liste : ce n'est pas un glisser.
    accept: (dx, dy, pointerType) => !(pointerType === "touch" && dy >= dx),
    move: (m) => place(m.clientX, m.clientY),
    finish: (u, dragged) => {
      ghost?.remove();
      ghost = null;
      if (u !== null && dragged && onStage(u.clientX, u.clientY)) onDrop({ x: u.clientX, y: u.clientY });
    },
  });
}
```

- [ ] **Étape 6 : tri.** Créer `apps/web/src/ui/sort-drag.ts` :

```ts
/**
 * Tri d'une liste au pointeur (design-l3, L3-13, L3-14, DA-L3-1), sur le squelette `startPointerGesture` : Pointer
 * Events seuls, aucun événement de glisser HTML5 (U12). La ligne tirée suit le pointeur (`translateY`, attribut
 * `data-dragging`), les autres s'écartent ; le `scroller` défile quand le pointeur est à moins de `SORT_EDGE_PX` de ses
 * bords (H13). Au lâcher : un seul `drop(to)`, `to` = rang dans la liste sans la ligne tirée ; lâchée à son rang :
 * `cancel()`. Sous le seuil : `tap()`. Échap, `pointercancel`, capture perdue : `cancel()`. Les lignes ne quittent
 * jamais le DOM pendant le geste ; leurs `transform` sont remis à `""` avant tout rappel de fin.
 */
import { startPointerGesture } from "./pointer-gesture";

/** Distance au bord du `scroller` où la liste défile pendant un tri (H13). */
export const SORT_EDGE_PX = 48;
/** Pas de défilement par image, atteint au bord même. */
const SCROLL_STEP_PX = 12;

export interface SortDragOptions {
  /** Lignes de la liste, dans l'ordre, la ligne tirée comprise (au rang `from`). */
  rows(): readonly HTMLElement[];
  readonly scroller: HTMLElement;
  readonly from: number;
  moved(dy: number, slot: number): void;
  drop(to: number): void;
  tap(): void;
  cancel(): void;
}

/** Rang de lâcher : nombre de milieux de lignes (la ligne tirée exclue) strictement au-dessus de `y`. */
export function slotOf(mids: readonly number[], y: number): number {
  let n = 0;
  for (const m of mids) if (m < y) n++;
  return n;
}

export function startSortDrag(e: PointerEvent, opts: SortDragOptions): void {
  const rows = opts.rows();
  const dragged = rows[opts.from];
  if (dragged === undefined) return;
  const sc = opts.scroller;
  const win = sc.ownerDocument.defaultView;
  const top0 = sc.scrollTop;
  const y0 = e.clientY;
  const height = dragged.getBoundingClientRect().height;
  const others = rows.filter((_, i) => i !== opts.from);
  // Milieux des autres lignes, en coordonnées du contenu du `scroller` : indépendants du défilement pendant le geste.
  const mids = others.map((r) => {
    const b = r.getBoundingClientRect();
    return b.top + b.height / 2 + top0;
  });
  const contentY = (clientY: number): number => clientY + sc.scrollTop;
  let lastY = y0;
  let frame = 0;

  const paint = (): void => {
    const dy = contentY(lastY) - (y0 + top0);
    const slot = slotOf(mids, contentY(lastY));
    dragged.style.transform = `translateY(${dy}px)`;
    others.forEach((r, i) => {
      // `i` : rang sans la ligne tirée ; une ligne passée de l'autre côté de la ligne tirée s'écarte de sa hauteur.
      const shift = i >= opts.from && i < slot ? -height : i < opts.from && i >= slot ? height : 0;
      r.style.transform = shift === 0 ? "" : `translateY(${shift}px)`;
    });
    opts.moved(dy, slot);
  };
  const edgeSpeed = (): number => {
    const b = sc.getBoundingClientRect();
    if (lastY < b.top + SORT_EDGE_PX) return -Math.ceil(((b.top + SORT_EDGE_PX - lastY) / SORT_EDGE_PX) * SCROLL_STEP_PX);
    if (lastY > b.bottom - SORT_EDGE_PX) return Math.ceil(((lastY - (b.bottom - SORT_EDGE_PX)) / SORT_EDGE_PX) * SCROLL_STEP_PX);
    return 0;
  };
  const tick = (): void => {
    frame = 0;
    const v = edgeSpeed();
    if (v === 0) return;
    const before = sc.scrollTop;
    sc.scrollTop = before + v;
    if (sc.scrollTop !== before) paint();
    frame = win?.requestAnimationFrame(tick) ?? 0;
  };
  const reset = (): void => {
    if (frame !== 0) win?.cancelAnimationFrame(frame);
    frame = 0;
    dragged.removeAttribute("data-dragging");
    for (const r of rows) r.style.transform = "";
  };
  startPointerGesture(e, {
    move: (m) => {
      lastY = m.clientY;
      dragged.setAttribute("data-dragging", "");
      paint();
      if (frame === 0 && edgeSpeed() !== 0) frame = win?.requestAnimationFrame(tick) ?? 0;
    },
    finish: (u, moved) => {
      reset();
      if (u === null) return opts.cancel();
      if (!moved) return opts.tap();
      lastY = u.clientY;
      const to = slotOf(mids, contentY(lastY));
      if (to === opts.from) return opts.cancel();
      opts.drop(to);
    },
  });
}
```

- [ ] **Étape 7 : vérifier le vert** — commande bornée de la section. Attendu : voir « Preuve ». Si un test
  `C4 :` de `resource-drag.test.ts` rougit : comparer pas à pas avec `git show HEAD:apps/web/src/ui/resource-drag.ts`
  (ordre `end` → rappel), corriger le squelette ; si l'égalité ne tient pas, appliquer le repli de DA-L3-1 (voir
  « Patron à ne pas reprendre ») et le dire au rapport.

- [ ] **Étape 8 : tsc et garde des sources** —
  `cd /home/adminjd/projets/roomboard-wt/design-l3--T3/apps/web && export TMPDIR=$HOME/.cache/tmp/of61-tmp && nice -n 10 npx tsc --noEmit > "$TMPDIR/T3-tsc.log" 2>&1; echo "tsc code $?"; tail -20 "$TMPDIR/T3-tsc.log"; grep -nE "switch\s*\(|localStorage|draggable|dragstart" src/ui/pointer-gesture.ts src/ui/sort-drag.ts src/ui/resource-drag.ts || echo "garde : rien"`
  Attendu : `tsc code 0`, `garde : rien`.

- [ ] **Étape 9 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l3--T3
git add apps/web/src/ui/pointer-gesture.ts
git add apps/web/src/ui/pointer-gesture.test.ts
git add apps/web/src/ui/sort-drag.ts
git add apps/web/src/ui/sort-drag.test.ts
git add apps/web/src/ui/resource-drag.ts
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(ui): shared pointer gesture skeleton, pointer sort for lists; resource drag on the skeleton" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport de la tâche : nombre de tests par fichier, `resource-drag.test.ts` 9/9 sans retouche, ligne
`Réutilisation : …` (ou repli de DA-L3-1 et sa raison).

---

### Tâche T4 — Choix exclusif `RadioChoices`
<a id="tache-t4"></a>

**Objectif.** DA-L3-2 : un composant `role="radiogroup"` pour les quatre choix exclusifs du panneau (démarrage,
emplacement, taille, barre), trois aspects (`card`, `tile`, `segment`), flèches itinérantes, un seul arrêt de
tabulation, `data-edit` sur le groupe et `data-choice` sur chaque bouton (L3-23). Ses styles viennent avec le panneau
(T5, `rb.css`).

**Fichiers.**
- Créer : `apps/web/src/ui/RadioChoices.tsx`, `apps/web/src/ui/RadioChoices.test.tsx`

**Interfaces.**
- Consomme : `Icon(props: { name: string }): JSX.Element` (`ui/IconButton.tsx:20`) ; icône `check` (déjà dans `ICONS`).
- Produit :
  - `export interface RadioOption<T extends string> { readonly value: T; readonly label: string; readonly icon?: string; readonly detail?: string }`
  - `export interface RadioChoicesProps<T extends string> { readonly name: string; readonly label: string; readonly look: "card" | "tile" | "segment"; readonly options: readonly RadioOption<T>[]; readonly value: T; choose(v: T): void }`
  - `export function RadioChoices<T extends string>(props: RadioChoicesProps<T>): JSX.Element`
  - DOM : `div.rb-radios[role="radiogroup"][aria-label][data-edit=<name>][data-look=<look>]` ;
    `button.rb-radio[role="radio"][aria-checked][data-choice=<value>]` ; dedans, dans l'ordre : `span.rb-radio-chk`
    (aspect `card`, choisi seulement, icône `check`), `svg.rb-icon` (si `icon`), `span.rb-radio-label`,
    `span.rb-radio-detail` (si `detail`).
- Réutilise : aucun radiogroupe existant (cadrage § 3, termes `radiogroup`, `role="radio"`, `aria-checked` cherchés ;
  `ProfileMenu` a des `menuitemradio`, autre rôle ; `PointerSwitch` des boutons `aria-pressed`, autre contrat) —
  module neuf `ui/RadioChoices.tsx` :
  `RadioChoices<T extends string>(props: { name: string; label: string; look: "card" | "tile" | "segment"; options: readonly RadioOption<T>[]; value: T; choose(v: T): void }): JSX.Element` ;
  `RadioOption<T> { value: T; label: string; icon?: string; detail?: string }`.
- Réutilise : `apps/web/src/ui/IconButton.tsx:111` (`IconButton`), `Icon` — `Icon` appelé tel quel pour l'icône et la
  pastille.
- Rapport : `Réutilisation : appelé IconButton.tsx (Icon)` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/design-l3--T4/apps/web && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of61-tmp && mkdir -p "$TMPDIR" && nice -n 10 npx vitest run src/ui/RadioChoices.test.tsx src/ui/Toolbar.test.tsx --reporter=verbose > "$TMPDIR/T4-vitest.log" 2>&1; echo "code $?"; grep -E "✓|×|FAIL |Test Files|Tests " "$TMPDIR/T4-vitest.log" | tail -60`
Preuve : `code 0`, `Test Files  2 passed (2)`, ≥ 7 lignes `L3-23`, la garde « aucun switch… aucun px… dans src/ui » de
`Toolbar.test.tsx` verte, aucun `×`.

**Preuve visuelle.** Aucune ici (styles et mesures : T5, T8).

**Contraintes (recopiées).** G1 test rouge d'abord, aucun test retiré, désactivé ou sauté · G3 aucune dépendance
ajoutée · G6 `nice -n 10`, `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`, tests isolés · G7 sorties dans
`$HOME/.cache/tmp/of61-tmp/T4-*` · G8 auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais
terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un, aucun push · G9 dans
`RadioChoices.tsx` : aucun `switch (`, `localStorage`, `draggable`, aucun `\d+px` (même en commentaire), aucun
`innerHTML`, touches branchées par une table · G12 worktree `/home/adminjd/projets/roomboard-wt/design-l3--T4`.

**Interdits.** Ne pas toucher `rb.css` (T5) ni `PointerSwitch.tsx` ; pas de `<input type="radio">` (boutons
`role="radio"`, cibles stylables de 48 px et plus).

**Terminé quand.** Tests verts, `tsc` 0, commit fait.

- [ ] **Étape 0 : préparer le worktree** —
  `cd /home/adminjd/projets/roomboard-wt/design-l3--T4 && mkdir -p $HOME/.cache/tmp/of61-tmp && (test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile > $HOME/.cache/tmp/of61-tmp/T4-install.log 2>&1) && for d in wasm wasm-formats; do test -d apps/web/src/$d || cp -r /home/adminjd/projets/roomboard-wt/design-l3/apps/web/src/$d apps/web/src/$d; done && ls apps/web/src/wasm/roomboard_wasm.d.ts`

- [ ] **Étape 1 : tests (rouges).** Créer `apps/web/src/ui/RadioChoices.test.tsx` :

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RadioChoices, type RadioOption } from "./RadioChoices";

afterEach(cleanup);

type Dock = "top" | "left" | "floating";
const DOCKS: readonly RadioOption<Dock>[] = [
  { value: "top", label: "En haut", icon: "dock-top" },
  { value: "left", label: "À gauche", icon: "dock-left" },
  { value: "floating", label: "Flottante", icon: "dock-float", detail: "En annotation : en haut" },
];
function setup(look: "card" | "tile" | "segment" = "tile", start: Dock = "top") {
  const [value, setValue] = createSignal<Dock>(start);
  const choose = vi.fn((v: Dock) => setValue(() => v));
  const r = render(() => <RadioChoices name="dock" label="Emplacement" look={look} options={DOCKS} value={value()} choose={choose} />);
  const radio = (v: string): HTMLButtonElement => r.container.querySelector<HTMLButtonElement>(`[data-choice="${v}"]`)!;
  return { ...r, choose, value, radio };
}
const tick = (): Promise<void> => new Promise((res) => setTimeout(res, 0));

describe("RadioChoices (design-l3, L3-23, DA-L3-2)", () => {
  it("L3-23 : radiogroup nommé, data-edit et data-look ; un bouton role=radio par option, data-choice", () => {
    const { container } = setup();
    const group = container.querySelector('[role="radiogroup"]')!;
    expect(group.getAttribute("aria-label")).toBe("Emplacement");
    expect(group.getAttribute("data-edit")).toBe("dock");
    expect(group.getAttribute("data-look")).toBe("tile");
    expect([...group.querySelectorAll('[role="radio"]')].map((b) => b.getAttribute("data-choice"))).toEqual(["top", "left", "floating"]);
  });
  it("L3-23 : aria-checked vrai sur la valeur seule ; un seul arrêt de tabulation, le bouton choisi", () => {
    const { radio } = setup("tile", "left");
    expect(["top", "left", "floating"].map((v) => radio(v).getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);
    expect(["top", "left", "floating"].map((v) => radio(v).getAttribute("tabindex"))).toEqual(["-1", "0", "-1"]);
  });
  it("L3-23 : un clic choisit", () => {
    const { radio, choose } = setup();
    fireEvent.click(radio("floating"));
    expect(choose).toHaveBeenCalledWith("floating");
    expect(radio("floating").getAttribute("aria-checked")).toBe("true");
  });
  it("L3-23 : Flèche droite et bas : choix et focus au suivant ; gauche et haut : au précédent ; bouclent aux bouts", async () => {
    const { radio, choose } = setup("tile", "top");
    radio("top").focus();
    fireEvent.keyDown(radio("top"), { key: "ArrowRight" });
    await tick();
    expect(choose).toHaveBeenLastCalledWith("left");
    expect(document.activeElement).toBe(radio("left"));
    fireEvent.keyDown(radio("left"), { key: "ArrowDown" });
    await tick();
    expect(document.activeElement).toBe(radio("floating"));
    fireEvent.keyDown(radio("floating"), { key: "ArrowRight" });
    await tick();
    expect(choose).toHaveBeenLastCalledWith("top");
    fireEvent.keyDown(radio("top"), { key: "ArrowLeft" });
    await tick();
    expect(choose).toHaveBeenLastCalledWith("floating");
    fireEvent.keyDown(radio("floating"), { key: "ArrowUp" });
    await tick();
    expect(document.activeElement).toBe(radio("left"));
  });
  it("L3-23 : une autre touche ne choisit rien", () => {
    const { radio, choose } = setup();
    fireEvent.keyDown(radio("top"), { key: "a" });
    expect(choose).not.toHaveBeenCalled();
  });
  it("L3-23 : icône, libellé et détail rendus dans l'ordre ; carte choisie : pastille check, les autres non", () => {
    const { radio } = setup("card", "left");
    expect(radio("floating").querySelector("svg")?.getAttribute("data-icon")).toBe("dock-float");
    expect(radio("floating").querySelector(".rb-radio-label")?.textContent).toBe("Flottante");
    expect(radio("floating").querySelector(".rb-radio-detail")?.textContent).toBe("En annotation : en haut");
    expect(radio("left").querySelector(".rb-radio-chk svg")?.getAttribute("data-icon")).toBe("check");
    expect(radio("top").querySelector(".rb-radio-chk")).toBeNull();
  });
  it("L3-23 : aspect segment ou vignette : jamais de pastille ; textContent = libellé (+ détail)", () => {
    const { radio } = setup("segment", "left");
    expect(radio("left").querySelector(".rb-radio-chk")).toBeNull();
    expect(radio("left").textContent).toBe("À gauche");
  });
  it("L3-23 : valeur absente des options : le premier bouton garde l'arrêt de tabulation", () => {
    const { container } = render(() => <RadioChoices name="x" label="X" look="segment" options={DOCKS} value={"bottom" as unknown as Dock} choose={() => undefined} />);
    expect([...container.querySelectorAll('[role="radio"]')].map((b) => b.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
  });
});
```

- [ ] **Étape 2 : vérifier le rouge** — commande bornée. Attendu : `code 1`, `Failed to resolve import "./RadioChoices"`.

- [ ] **Étape 3 : implémenter** `apps/web/src/ui/RadioChoices.tsx` :

```tsx
/**
 * Choix exclusif (design-l3, L3-23, DA-L3-2) : `role="radiogroup"` de boutons `role="radio"`, un seul arrêt de
 * tabulation (le bouton choisi, sinon le premier), flèches gauche / haut et droite / bas qui déplacent focus et choix
 * (bouclent aux bouts). Trois aspects : cartes (démarrage), vignettes (emplacement), segments (taille, barre).
 * `data-edit` sur le groupe et `data-choice` sur chaque bouton : les sélecteurs des tests et des essais.
 */
import { For, Show, type JSX } from "solid-js";
import { Icon } from "./IconButton";

export interface RadioOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly icon?: string;
  readonly detail?: string;
}

export interface RadioChoicesProps<T extends string> {
  /** Posé en `data-edit` sur le groupe. */
  readonly name: string;
  /** Nom du groupe pour les lecteurs d'écran (`aria-label`). */
  readonly label: string;
  readonly look: "card" | "tile" | "segment";
  readonly options: readonly RadioOption<T>[];
  readonly value: T;
  choose(v: T): void;
}

/** Flèche → pas dans la liste (table : aucune autre touche n'agit). */
const STEP: Readonly<Record<string, -1 | 1>> = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };

export function RadioChoices<T extends string>(props: RadioChoicesProps<T>): JSX.Element {
  let group: HTMLDivElement | undefined;
  const known = (): boolean => props.options.some((o) => o.value === props.value);
  const onKey = (e: KeyboardEvent, index: number): void => {
    if (!Object.hasOwn(STEP, e.key)) return;
    e.preventDefault();
    const n = props.options.length;
    const next = props.options[(index + STEP[e.key]! + n) % n];
    if (next === undefined) return;
    props.choose(next.value);
    queueMicrotask(() => group?.querySelector<HTMLElement>(`[data-choice="${next.value}"]`)?.focus());
  };
  return (
    <div ref={group} class="rb-radios" role="radiogroup" aria-label={props.label} data-edit={props.name} data-look={props.look}>
      <For each={props.options}>
        {(o, i) => {
          const on = (): boolean => o.value === props.value;
          return (
            <button
              type="button"
              class="rb-radio"
              role="radio"
              aria-checked={on()}
              tabIndex={on() || (i() === 0 && !known()) ? 0 : -1}
              data-choice={o.value}
              onClick={() => props.choose(o.value)}
              onKeyDown={(e) => onKey(e, i())}
            >
              <Show when={props.look === "card" && on()}>
                <span class="rb-radio-chk">
                  <Icon name="check" />
                </span>
              </Show>
              <Show when={o.icon}>{(name) => <Icon name={name()} />}</Show>
              <span class="rb-radio-label">{o.label}</span>
              <Show when={o.detail}>{(d) => <span class="rb-radio-detail">{d()}</span>}</Show>
            </button>
          );
        }}
      </For>
    </div>
  );
}
```

- [ ] **Étape 4 : vérifier le vert** — commande bornée. Attendu : voir « Preuve ».

- [ ] **Étape 5 : tsc** —
  `cd /home/adminjd/projets/roomboard-wt/design-l3--T4/apps/web && export TMPDIR=$HOME/.cache/tmp/of61-tmp && nice -n 10 npx tsc --noEmit > "$TMPDIR/T4-tsc.log" 2>&1; echo "tsc code $?"; tail -20 "$TMPDIR/T4-tsc.log"`
  Attendu : `tsc code 0`.

- [ ] **Étape 6 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l3--T4
git add apps/web/src/ui/RadioChoices.tsx
git add apps/web/src/ui/RadioChoices.test.tsx
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(ui): RadioChoices radiogroup with roving arrows, card, tile and segment looks" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport de la tâche : nombre de tests, ligne `Réutilisation : …`.

---

### Tâche T5 — Panneau `ProfileEditor`, aperçu en direct et montage dans `App`
<a id="tache-t5"></a>

**Objectif.** Réécrire `ProfileEditor.tsx` en panneau latéral (L3-1, L3-5 à L3-21, L3-24) : en-tête « Profils » et
Fermer ; profil actif (sélecteur, étiquette, Importer, Exporter, nom) ; démarrage en deux cartes ; taille en commande
segmentée ; une barre à la fois (vignettes d'emplacement, liste triable à la poignée, œil, « + Ajouter ») ;
préréglages restylés ; « Enregistrer comme nouveau » ; pied (« Revenir à l'origine », état, « Enregistrer »). Brancher
l'aperçu en direct et le remontage dans `App` (L3-3, L3-4, DA-L3-3), les gestes du panneau (L3-19, L3-21) et la
confirmation des gestes du panneau (L3-32 : Fermer, sélecteur, Importer). Exporter `POINTER_SUMMARY` (L3-12).
Styles `.rb-popover[data-panel="profils"]`, `.rb-sheet*`, `.rb-radio*`, `.rb-item*` (D10).

**Patron à ne pas reprendre.**
- Choix exclusifs en `<select>` synchronisés par `syncValue` (`apps/web/src/ui/ProfileEditor.tsx:139-153`, `:258-283`) :
  ici `RadioChoices` (T4) ; `syncValue` ne sert plus qu'au sélecteur de profil (natif, H17).
- Un bloc par barre recréé à chaque geste (`<For each={draft().toolbars}>`, `ProfileEditor.tsx:287`) : ici un seul bloc,
  monté par `<Show when={…}>` **non keyed** ; les lignes gardent leur DOM (même objet d'élément) quand on les déplace.
- Une troisième table pour « Dessin / Souris » (constat `docs/architecture-constats.md:52`) : ici le renvoi
  `ROW_SUMMARY` vers `POINTER_SUMMARY`, dérivé de `POINTER_SEGMENTS` (`PointerSwitch.tsx:14-17`).
- Comparer le brouillon au profil par référence (`draft() !== props.profile`) : ici `sameProfile` (T1), la même règle
  que `App` (D6).
- Options de `RadioChoices` recréées à chaque geste (le `For` refait les boutons, le focus se perd) : options en
  constantes de module ou en mémos à égalité de valeur.
Chemins de référence : aperçu `apps/web/src/ui/GridPanel.tsx:33-35`, `:47-53` (`preview`, `endPreview`, `onCleanup`) ;
focus après redessin `apps/web/src/ui/ProfileEditor.tsx:56-57`, `:83-90`, `:237-241` (`refocus`, `rowControl`).

**Fichiers.**
- Modifier : `apps/web/src/ui/ProfileEditor.tsx` (réécrit), `apps/web/src/ui/ProfileEditor.test.tsx` (réécrit, mêmes
  intentions + ajouts), `apps/web/src/ui/PointerSwitch.tsx` (après `:17`), `apps/web/src/ui/rb.css` (après `:184`),
  `apps/web/src/ui/rb-css.test.ts` (fin du describe), `apps/web/src/ui/App.tsx` (`:22-23` imports, après `:84`, `:294`,
  `:341`, `:487-500`), `apps/web/src/ui/App.test.tsx` (`:562`, `:576-588`, `:727-738`, `:751-762`, `:765-776`,
  `:778-788`, ajouts avant la fin du describe « App — profils (C1) », `:842`).

**Interfaces.**
- Consomme : T1 — `moveItemTo(p, barId, itemId, to)`, `sameProfile(a, b)`, `abandonQuestion(label)`, `catalog(p, barId)`,
  `ProfileActions.exportProfile(p)` ; T2 — icônes `close`, `grip`, `hidden`, `dock-top`, `dock-bottom`, `dock-left`,
  `dock-right`, `dock-float`, `import`, `down` ; T3 — `startSortDrag(e, opts: SortDragOptions)` ; T4 —
  `RadioChoices<T>(props)`, `RadioOption<T>`.
- Produit :
  - `PointerSwitch.tsx` : `export const POINTER_SUMMARY: { readonly label: string; readonly icon: string }`
    (`{ label: "Dessin / Souris", icon: "pen-line" }`, dérivé).
  - `ProfileEditor.tsx` : `export interface ProfileEditorProps { profile; origin; profiles: Accessor<readonly Profile[]>;
    canRemove: Accessor<boolean>; canResetCurrent: Accessor<boolean>; focusProfile?: boolean; save(draft); saveAsNew(draft,
    label); close(); preview(draft: Profile): void; endPreview(): void; choose(id: string): void; importFile(): void;
    exportProfile(draft: Profile): void; resetCurrent(): void; confirm(message: string): Promise<boolean> }` ;
    `export function ProfileEditor(props: ProfileEditorProps): JSX.Element` ;
    `export const BUTTON_PX: Readonly<Record<ButtonSize, number>>` ; `syncValue`, `pick` toujours exportés.
  - DOM (sélecteurs des tâches T6 à T8) : `.rb-popover[data-panel="profils"] > aside.rb-sheet[data-profile-editor][role="dialog"][aria-label="Profils"]` ;
    `.rb-sheet-head h2` ; `[data-sheet-body]` ; `.rb-sheet-foot` ; sections `[data-edit-section="profile|general|bars|presets|new"]` ;
    `select[data-edit="profile"]`, `[data-edit="profile-tag"]`, `button[data-edit="import|export|close|revert|save|save-new|reset-bars|reset-presets|preset-add|preset-remove|add|grip|up|down|shown"]`,
    `input[data-edit="label|new-name|preset-label|preset-color|preset-width"]` ; groupes `[data-edit="start-mode|button-size|bar|dock"] [data-choice]` ;
    `[data-edit-bar=<id>]` ; `[data-edit="annotation-note"]` ; `[data-edit="add-list"] [data-add-choice="tool:rect|action:page-next…"]` ;
    `ul.rb-items[data-edit="items"]` ; `li.rb-item[data-edit-item][data-unknown][data-separator][data-hidden][data-dragging]` ;
    `.rb-item-label` ; `[data-edit="announce"]` (`aria-live="polite"`) ; `[data-edit="saved"]`.
  - `App.tsx` : signal `previewProfile`, `shownProfile()`, `takeProfileFocus()` (privés ; T6 y ajoute `leaveEditor`).
- Réutilise : `apps/web/src/ui/GridPanel.tsx:33-35`, `:47` (`preview`, `endPreview`, `onCleanup`) — patron repris :
  `ProfileEditorProps.preview(draft: Profile): void` ; `ProfileEditorProps.endPreview(): void`.
- Réutilise : `apps/web/src/ui/active-profile.ts:6-16` — `profile`, `profiles`, appelés tels quels (`App` les passe).
- Réutilise : `apps/web/src/ui/icons.ts:148` (`iconFor`) — `iconFor(item)`, icône de chaque ligne et de chaque entrée
  du catalogue.
- Réutilise : `apps/web/src/ui/IconButton.tsx:111` (`IconButton`), `Icon` — appelés tels quels (Fermer, Importer,
  Exporter, œil, retirer un préréglage ; icônes des lignes et des boutons).
- Réutilise : `apps/web/src/ui/PointerSwitch.tsx:14` (`POINTER_SEGMENTS`) — étendu par
  `export const POINTER_SUMMARY: { readonly label: string; readonly icon: string }` dérivé ; renvoi `ROW_SUMMARY` dans
  l'éditeur.
- Réutilise : `ShellPort.confirm` (`profile-actions.ts:22`, props `shell` d'`App`) — appelé tel quel
  (`confirm={(m) => props.shell.confirm(m)}`).
- Réutilise : `apps/web/src/app/profile-actions.ts:28-43` — `choose`, `importFile`, `canResetCurrent`, `resetCurrent`,
  `canRemove`, `exportProfile(p: Profile): Promise<boolean>` (T1), appelés depuis les props de l'éditeur.
- Réutilise : `rb.css:27-29` (`--rb-btn-s/m/l`) — valeurs reprises dans `BUTTON_PX` de `ProfileEditor.tsx`, liées par un
  test (D3 : dans `ProfileEditor.test.tsx`).
- Réutilise : `rb.css:113-114` (`.rb-popover[data-panel="library"]`) — même patron, `data-panel="profils"`.
- Réutilise : `apps/web/src/profile-edit.ts:65-121` — `setLabel`, `setStartMode`, `setButtonSize`, `setDock`,
  `setHidden`, `canHide`, `moveItem`, `addItem`, `addPreset`, `updatePreset`, `removePreset`, `resetToolbars`,
  `resetAllPresets`, appelés tels quels.
- Rapport : `Réutilisation : appelé GridPanel (patron), active-profile, icons (iconFor), IconButton/Icon, PointerSwitch
  (POINTER_SEGMENTS), ShellPort.confirm, profile-actions, profile-edit, RadioChoices, sort-drag` ou
  `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
Test isolé (boucle TDD) :
`cd /home/adminjd/projets/roomboard-wt/design-l3--T5/apps/web && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of61-tmp && mkdir -p "$TMPDIR" && nice -n 10 npx vitest run src/ui/ProfileEditor.test.tsx src/ui/rb-css.test.ts src/ui/App.test.tsx src/ui/GridPanel.test.tsx src/ui/ImagePanel.test.tsx src/ui/Toolbar.test.tsx src/ui/PointerSwitch.test.tsx src/ui/ProfileMenu.test.tsx --reporter=verbose > "$TMPDIR/T5-vitest.log" 2>&1; echo "code $?"; grep -E "×|FAIL |Test Files|Tests " "$TMPDIR/T5-vitest.log" | tail -60; grep -cE "✓ .*(L3-|design-l3)" "$TMPDIR/T5-vitest.log"`
Suite web complète (preuve) :
`cd /home/adminjd/projets/roomboard-wt/design-l3--T5 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of61-tmp && node ~/.claude/scripts/vm/suite-vm.cjs -- nice -n 10 pnpm --filter @roomboard/web test > "$TMPDIR/T5-suite-web.log" 2>&1; echo "code $?"; grep -E "Test Files|Tests |FAIL " "$TMPDIR/T5-suite-web.log" | tail -20`
Preuve : `code 0` aux deux ; `ProfileEditor.test.tsx` ≥ 35 tests ; lignes `L3-13`, `L3-32`, `design-l3 L3-3`,
`design-l3 L3-4`, `design-l3 L3-19`, `design-l3 L3-21` présentes ; suite web `Tests  N passed (N)` avec N ≥ 3370 + les
tests ajoutés par T1 à T5 ; aucun `FAIL `. Tests à garder verts dans la zone : `GridPanel.test.tsx`, `ImagePanel.test.tsx`
(importent `pick`, `syncValue`), `PointerSwitch.test.tsx`, `Toolbar.test.tsx` (garde des sources, barres inchangées),
`ProfileMenu.test.tsx`, `App.test.tsx:717-726` (Modifier… ouvre l'éditeur), `:790-842` (préréglages, Importer…,
Exporter… du menu).

**Preuve visuelle.** Le profil n'a pas de commande de lecture automatique (`.claude/chantier.md`, « Aucune automatique
pour l'instant ») : la mesure et les captures du panneau sont faites par T8 (S5) et T9. Ici, lecture faite par les
tests : `[data-edit="profile-tag"]` = `Fourni`, `[data-edit="button-size"] [data-choice]` = `Petits · 44`,
`Moyens · 48`, `Grands · 64`, `[data-edit="announce"]` = `Texte : rang 1 sur 29`.

**Contraintes (recopiées).** G1 test rouge d'abord, aucun test retiré, désactivé ou sauté, aucun seuil changé · G2
retouches listées ici seulement (cadrage L3-26 et § 3.2) : `ProfileEditor.test.tsx:13-14`, `:45-57`, `:59-82`,
`:84-117`, `:119-128`, `:143-190`, `:192-207`, `:209-216`, `:219-228` ; `App.test.tsx:562`, `:576-588`, `:727-738`
(fond, L3-3), `:751-762`, `:765-776`, `:778-788` (forme) ; toute autre rougeur arrête la tâche · G3 aucune dépendance
ajoutée · G4 icônes de T2 seulement, aucune dessinée · G5 `toolbar.ts` non touché, format inchangé, aucun Rust ni CLI ·
G6 `nice -n 10`, `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`, tests isolés directs, suite web par
`node ~/.claude/scripts/vm/suite-vm.cjs -- …` · G7 sorties dans `$HOME/.cache/tmp/of61-tmp/T5-*` · G8 auteur
`jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un, aucun push · G9 dans
`ProfileEditor.tsx`, `PointerSwitch.tsx`, `App.tsx` : aucun `switch (`, `localStorage`, `draggable`, `dragstart`, aucun
`\d+px` (même en commentaire : écrire « 600 px » avec une espace), aucun `innerHTML`, branchements par table ·
G10 règles neuves de `rb.css` aux jetons `--rf-*` seulement, tailles de texte 20 / 16 / 15 / 14, cibles ≥ 48 px,
`.rb-editor` (`:175-184`) inchangée, aucune règle `.rb-bar` en position absolue · G12 worktree
`/home/adminjd/projets/roomboard-wt/design-l3--T5`.

**Interdits.** Ne pas toucher `toolbar.ts`, `profile-edit.ts`, `RadioChoices.tsx`, `sort-drag.ts`, `ProfileMenu.tsx`
(T6), ni la règle `toggle` d'`App` (T6) ; aucun enregistrement automatique (H2) ; aucun `draggable`.

**Terminé quand.** Suite web verte via `suite-vm`, `tsc` 0, commit fait, retouches listées au rapport.

- [ ] **Étape 0 : préparer le worktree** —
  `cd /home/adminjd/projets/roomboard-wt/design-l3--T5 && mkdir -p $HOME/.cache/tmp/of61-tmp && (test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile > $HOME/.cache/tmp/of61-tmp/T5-install.log 2>&1) && for d in wasm wasm-formats; do test -d apps/web/src/$d || cp -r /home/adminjd/projets/roomboard-wt/design-l3/apps/web/src/$d apps/web/src/$d; done && ls apps/web/src/ui/RadioChoices.tsx apps/web/src/ui/sort-drag.ts && grep -c '"dock-top"' apps/web/src/ui/icons.ts && grep -c "export function moveItemTo" apps/web/src/profile-edit.ts`
  Attendu : les deux fichiers listés, `1`, `1` (T1 à T4 fusionnés dans la branche du chantier).

- [ ] **Étape 1 : tests de l'éditeur (rouges).** Remplacer tout `apps/web/src/ui/ProfileEditor.test.tsx` par :

```tsx
// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addPreset, setButtonSize, setDock, setHidden } from "../profile-edit";
import { parseProfile, visibleItems, type Profile, type RuntimeCapabilities } from "../toolbar";
import { BUILTIN_PROFILES, DEFAULT_PROFILE_JSON } from "../toolbar-profiles";
import { POINTER_SEGMENTS, POINTER_SUMMARY } from "./PointerSwitch";
import { BUTTON_PX, ProfileEditor } from "./ProfileEditor";

afterEach(cleanup);

const ALL: RuntimeCapabilities = { desktopAnnotation: true, multiWindow: true, dropPaths: true, officeConverter: true };
const DEFAUT = BUILTIN_PROFILES[0]!;
const QUESTION = "Abandonner les changements du profil « Par défaut » ?";
/** design-l3 (L3-10, L3-8, L3-11) : vignette d'emplacement, segment de taille, œil et poignée d'une ligne. */
const tile = (d: string, bar = "outils"): string => `[data-edit-bar="${bar}"] [data-edit="dock"] [data-choice="${d}"]`;
const seg = (s: string): string => `[data-edit="button-size"] [data-choice="${s}"]`;
const shown = (id: string): string => `[data-edit-item="${id}"] button[data-edit="shown"]`;
const grip = (id: string): string => `[data-edit-item="${id}"] button[data-edit="grip"]`;
const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

interface Opts { canRemove?: boolean; canResetCurrent?: boolean; focusProfile?: boolean }
function setup(profile: Profile = DEFAUT, origin: Profile = DEFAUT, opts: Opts = {}) {
  const save = vi.fn<(p: Profile) => void>();
  const saveAsNew = vi.fn<(p: Profile, label: string) => void>();
  const close = vi.fn<() => void>();
  const preview = vi.fn<(p: Profile) => void>();
  const endPreview = vi.fn<() => void>();
  const choose = vi.fn<(id: string) => void>();
  const importFile = vi.fn<() => void>();
  const exportProfile = vi.fn<(p: Profile) => void>();
  const resetCurrent = vi.fn<() => void>();
  const confirm = vi.fn<(m: string) => Promise<boolean>>(async () => true);
  const r = render(() => (
    <ProfileEditor
      profile={profile}
      origin={origin}
      profiles={() => BUILTIN_PROFILES}
      canRemove={() => opts.canRemove ?? false}
      canResetCurrent={() => opts.canResetCurrent ?? false}
      focusProfile={opts.focusProfile ?? false}
      save={save}
      saveAsNew={saveAsNew}
      close={close}
      preview={preview}
      endPreview={endPreview}
      choose={choose}
      importFile={importFile}
      exportProfile={exportProfile}
      resetCurrent={resetCurrent}
      confirm={confirm}
    />
  ));
  const q = <T extends Element>(sel: string): T => {
    const el = r.container.querySelector<T>(sel);
    if (el === null) throw new Error(`absent : ${sel}`);
    return el;
  };
  return { ...r, save, saveAsNew, close, preview, endPreview, choose, importFile, exportProfile, resetCurrent, confirm, q };
}
const setValue = (el: HTMLInputElement | HTMLSelectElement, value: string): void => {
  el.value = value;
  fireEvent.change(el);
};
const typeIn = (el: HTMLInputElement, value: string): void => {
  el.value = value;
  fireEvent.input(el);
};
const last = (fn: { mock: { calls: unknown[][] } }): Profile => fn.mock.calls.at(-1)![0] as Profile;
const outils = (p: Profile) => p.toolbars.find((b) => b.id === "outils")!;
const itemOf = (p: Profile, id: string) => p.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items)).find((i) => i.id === id)!;
const rowIds = (c: HTMLElement, bar = "outils"): string[] => [...c.querySelectorAll(`[data-edit-bar="${bar}"] li[data-edit-item]`)].map((l) => l.getAttribute("data-edit-item")!);
const revealedRows = (c: HTMLElement): string[] => [...c.querySelectorAll('button[data-edit="up"]')].map((b) => b.closest("[data-edit-item]")!.getAttribute("data-edit-item")!);
/** Mise en page posée à la main (happy-dom n'en calcule aucune) : lignes de 48 px depuis y = 100, corps de 0 à 4000 ;
 *  capture du pointeur neutralisée (un pointeur synthétique n'est pas actif). */
function layoutRows(): () => void {
  const spy = vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const ul = this.parentElement;
    if (this.tagName === "LI" && ul !== null && ul.classList.contains("rb-items")) return new DOMRect(0, 100 + [...ul.children].indexOf(this) * 48, 500, 48);
    if (this.hasAttribute("data-sheet-body")) return new DOMRect(0, 0, 600, 4000);
    return new DOMRect(0, 0, 0, 0);
  });
  const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
  const kept = [proto["setPointerCapture"], proto["releasePointerCapture"]];
  proto["setPointerCapture"] = () => undefined;
  proto["releasePointerCapture"] = () => undefined;
  return () => {
    spy.mockRestore();
    proto["setPointerCapture"] = kept[0];
    proto["releasePointerCapture"] = kept[1];
  };
}
const pointer = (type: string, y: number): PointerEvent => new PointerEvent(type, { clientX: 10, clientY: y, pointerId: 1, bubbles: true });

describe("ProfileEditor (C1, P20 ; design-l3)", () => {
  it("L3-5 : sections profil, général, barres, préréglages, nouveau ; un bloc de barre à la fois ; dialogue « Profils »", () => {
    const { container } = setup();
    expect([...container.querySelectorAll("[data-edit-section]")].map((s) => s.getAttribute("data-edit-section"))).toEqual(["profile", "general", "bars", "presets", "new"]);
    expect([...container.querySelectorAll("[data-edit-bar]")].map((b) => b.getAttribute("data-edit-bar"))).toEqual(["outils"]);
    expect([...container.querySelectorAll('[data-edit="bar"] [data-choice]')].map((b) => [b.getAttribute("data-choice"), b.textContent])).toEqual([["outils", "Barre d'outils"], ["pages", "Barre des pages"], ["annotation", "Barre d'annotation"]]);
    expect(container.querySelectorAll("[data-edit-preset]")).toHaveLength(3);
    const dialog = container.querySelector("[data-profile-editor]")!;
    expect([dialog.tagName, dialog.getAttribute("role"), dialog.getAttribute("aria-label")]).toEqual(["ASIDE", "dialog", "Profils"]);
    expect(container.querySelector(".rb-sheet-head h2")?.textContent).toBe("Profils");
  });

  it("design-l4 T6 : L4-18 : la barre d'annotation est éditable, titre « Barre d'annotation »", () => {
    const { q } = setup();
    fireEvent.click(q('[data-edit="bar"] [data-choice="annotation"]'));
    expect(q('[data-edit-bar="annotation"] h4').textContent).toBe("Barre d'annotation");
    expect(q(tile("top", "annotation"))).toBeTruthy();
  });

  it("S1 : brouillon, rien n'est enregistré avant Enregistrer ; Enregistrer rend barre à gauche et grands boutons", () => {
    const { q, save } = setup();
    fireEvent.click(q(tile("left")));
    fireEvent.click(q(seg("l")));
    expect(save).not.toHaveBeenCalled();
    expect(q(tile("left")).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(q('button[data-edit="save"]'));
    const p = last(save);
    expect(outils(p).dock).toBe("left");
    expect(p.interface.buttonSize).toBe("l");
    expect(p.id).toBe("defaut");
  });

  it("S1 : masquer la gomme (œil) ; l'œil de Profil est grisé (P2, P33) ; ligne masquée data-hidden", () => {
    const { q, save } = setup();
    expect(q<HTMLButtonElement>(shown("profiles")).disabled).toBe(true);
    expect(q<HTMLButtonElement>(shown("eraser")).disabled).toBe(false);
    expect([q(shown("eraser")).getAttribute("aria-pressed"), q(shown("eraser")).getAttribute("aria-label")]).toEqual(["true", "Masquer Gomme"]);
    fireEvent.click(q(shown("eraser")));
    expect([q(shown("eraser")).getAttribute("aria-pressed"), q(shown("eraser")).getAttribute("aria-label")]).toEqual(["false", "Afficher Gomme"]);
    expect(q('[data-edit-item="eraser"]').hasAttribute("data-hidden")).toBe(true);
    expect(q(`${shown("eraser")} svg`).getAttribute("data-icon")).toBe("hidden");
    fireEvent.click(q('button[data-edit="save"]'));
    const p = last(save);
    expect(itemOf(p, "eraser").hidden).toBe(true);
    expect(visibleItems(outils(p), ALL).map((i) => i.id)).not.toContain("eraser");
    expect(q('[data-edit-item="eraser"]')).toBeTruthy();
  });

  it("Monter / Descendre : dévoilés par la poignée ; à la frontière, l'élément entre dans le groupe voisin (P14)", () => {
    const { q, save } = setup();
    fireEvent.click(q(grip("pen")));
    expect(q<HTMLButtonElement>('[data-edit-item="pen"] button[data-edit="up"]').disabled).toBe(true);
    fireEvent.click(q(grip("desktop-annotation")));
    expect(q<HTMLButtonElement>('[data-edit-item="desktop-annotation"] button[data-edit="down"]').disabled).toBe(true);
    fireEvent.click(q(grip("hand")));
    fireEvent.click(q('[data-edit-item="hand"] button[data-edit="down"]'));
    fireEvent.click(q('button[data-edit="save"]'));
    const groups = outils(last(save)).groups.map((g) => g.items.map((i) => i.id));
    expect(groups[0]).toEqual(["pen", "eraser", "eraser-mode"]);
    expect(groups[1]![0]).toBe("hand");
  });

  it("Monter au clavier deux fois : le focus reste sur le bouton de la ligne déplacée (P14)", async () => {
    const { q, save } = setup();
    fireEvent.click(q(grip("hand")));
    const up = (): HTMLButtonElement => q<HTMLButtonElement>('[data-edit-item="hand"] button[data-edit="up"]');
    up().focus();
    fireEvent.click(document.activeElement!); // Entrée ou Espace sur un bouton = clic
    await tick();
    expect(document.activeElement).toBe(up());
    fireEvent.click(document.activeElement!);
    await tick();
    expect(document.activeElement).toBe(up());
    expect((document.activeElement as HTMLElement).closest("[data-edit-item]")!.getAttribute("data-edit-item")).toBe("hand");
    fireEvent.click(q('button[data-edit="save"]'));
    expect(outils(last(save)).groups[0]!.items.map((i) => i.id)).toEqual(["pen", "hand", "eraser", "eraser-mode"]);
  });

  it("Monter jusqu'en tête : le bouton grisé rend le focus à l'autre bouton de la ligne", async () => {
    const { q } = setup();
    fireEvent.click(q(grip("eraser")));
    q<HTMLButtonElement>('[data-edit-item="eraser"] button[data-edit="up"]').focus();
    fireEvent.click(document.activeElement!);
    await tick();
    expect(document.activeElement).toBe(q('[data-edit-item="eraser"] button[data-edit="down"]'));
  });

  it("Ajouter un élément absent (« + Ajouter ») : en fin de barre, id rendu unique (P15)", () => {
    const { q, save, container } = setup();
    fireEvent.click(q('[data-edit-bar="outils"] button[data-edit="add"]'));
    fireEvent.click(q('[data-add-choice="action:page-next"]'));
    expect(container.querySelector("[data-add-choice]")).toBeNull();
    fireEvent.click(q('button[data-edit="save"]'));
    expect(outils(last(save)).groups.flatMap((g) => g.items.map((i) => i.id)).at(-1)).toBe("page-next-2");
  });

  it("S1 : stylo, ajouter deux couleurs, couleur et épaisseur, retirer (P17)", () => {
    const { q, container, save } = setup();
    fireEvent.click(q('button[data-edit="preset-add"]'));
    fireEvent.click(q('button[data-edit="preset-add"]'));
    expect(container.querySelectorAll("[data-edit-preset]")).toHaveLength(5);
    setValue(q<HTMLInputElement>('[data-edit-preset="couleur"] input[data-edit="preset-color"]'), "#16a34a");
    setValue(q<HTMLInputElement>('[data-edit-preset="couleur"] input[data-edit="preset-width"]'), "6");
    fireEvent.click(q('[data-edit-preset="noir"] button[data-edit="preset-remove"]'));
    fireEvent.click(q('button[data-edit="save"]'));
    const pen = last(save).presets.pen!;
    expect(pen.map((x) => x.id)).toEqual(["rouge", "bleu", "couleur", "couleur-2"]);
    expect(pen[2]).toMatchObject({ color: "#16a34a", width: 6 });
  });

  it("S4 : Rétablir les préréglages : trois couleurs ; Rétablir les barres : barre en haut, taille m, gomme revenue", () => {
    const cm1: Profile = {
      ...addPreset(addPreset(setHidden(setButtonSize(setDock(DEFAUT, "outils", "left"), "l"), "eraser", true), "pen"), "pen"),
      id: "cm1",
      label: "CM1",
      basedOn: "defaut",
    };
    const { q, container, save } = setup(cm1, DEFAUT);
    expect(container.querySelectorAll("[data-edit-preset]")).toHaveLength(5);
    fireEvent.click(q('button[data-edit="reset-presets"]'));
    expect(container.querySelectorAll("[data-edit-preset]")).toHaveLength(3);
    fireEvent.click(q('button[data-edit="reset-bars"]'));
    expect(q(tile("top")).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(q('button[data-edit="save"]'));
    const p = last(save);
    expect(outils(p).dock).toBe("top");
    expect(p.interface.buttonSize).toBe("m");
    expect(itemOf(p, "eraser").hidden).toBeUndefined();
    expect([p.id, p.label]).toEqual(["cm1", "CM1"]);
  });

  it("Enregistrer comme nouveau : nom proposé « Par défaut (copie) », remplacé par « CM1 » ; nom vide : grisé (P28)", () => {
    const { q, saveAsNew, save } = setup();
    const name = q<HTMLInputElement>('input[data-edit="new-name"]');
    expect(name.value).toBe("Par défaut (copie)");
    typeIn(name, "   ");
    expect(q<HTMLButtonElement>('button[data-edit="save-new"]').disabled).toBe(true);
    typeIn(name, " CM1 ");
    fireEvent.click(q(tile("left")));
    fireEvent.click(q('button[data-edit="save-new"]'));
    expect(saveAsNew).toHaveBeenCalledTimes(1);
    expect(saveAsNew.mock.calls[0]![1]).toBe("CM1");
    expect(outils(saveAsNew.mock.calls[0]![0]).dock).toBe("left");
    expect(save).not.toHaveBeenCalled();
  });

  it("nom du profil vide : Enregistrer et Exporter grisés (S3, L3-21)", () => {
    const { q } = setup();
    typeIn(q<HTMLInputElement>('input[data-edit="label"]'), " ");
    expect(q<HTMLButtonElement>('button[data-edit="save"]').disabled).toBe(true);
    expect(q<HTMLButtonElement>('button[data-edit="export"]').disabled).toBe(true);
  });

  it("démarrage : carte « Annotation du bureau » enregistrée dans behavior (P10)", () => {
    const { q, save } = setup();
    fireEvent.click(q('[data-edit="start-mode"] [data-choice="desktop-annotation"]'));
    fireEvent.click(q('button[data-edit="save"]'));
    expect(last(save).behavior.startMode).toBe("desktop-annotation");
  });

  it("élément inconnu : ligne grisée « inconnu (version plus récente) », œil désactivé, déplaçable, réécrit tel quel (P16, S2)", () => {
    const json = JSON.parse(JSON.stringify(DEFAULT_PROFILE_JSON)) as Record<string, any>;
    json.toolbars[0].groups[0].items.splice(1, 0, { id: "laser", kind: "tool", tool: "laser", label: "Laser", raccourci: "L" });
    const r = parseProfile(json);
    if ("errors" in r) throw new Error(r.errors.join(" ; "));
    const { q, save } = setup(r.profile);
    const row = q('[data-edit-item="laser"]');
    expect(row.hasAttribute("data-unknown")).toBe(true);
    expect(row.textContent).toContain("inconnu (version plus récente)");
    expect(q<HTMLButtonElement>(shown("laser")).disabled).toBe(true);
    fireEvent.click(q(grip("laser")));
    fireEvent.click(q('[data-edit-item="laser"] button[data-edit="down"]'));
    fireEvent.click(q('button[data-edit="save"]'));
    const p = last(save);
    expect(outils(p).groups[0]!.items.map((i) => i.id)).toEqual(["pen", "eraser", "laser", "eraser-mode", "hand"]);
    expect(itemOf(p, "laser")).toEqual(itemOf(r.profile, "laser"));
  });

  it("P16 : élément inconnu déplacé à la flèche de sa poignée, réécrit tel quel", async () => {
    const json = JSON.parse(JSON.stringify(DEFAULT_PROFILE_JSON)) as Record<string, any>;
    json.toolbars[0].groups[0].items.splice(1, 0, { id: "laser", kind: "tool", tool: "laser", label: "Laser", raccourci: "L" });
    const r = parseProfile(json);
    if ("errors" in r) throw new Error(r.errors.join(" ; "));
    const { q, save } = setup(r.profile);
    q<HTMLButtonElement>(grip("laser")).focus();
    fireEvent.keyDown(q(grip("laser")), { key: "ArrowDown" });
    await tick();
    expect(document.activeElement).toBe(q(grip("laser")));
    fireEvent.click(q('button[data-edit="save"]'));
    expect(outils(last(save)).groups[0]!.items.map((i) => i.id)).toEqual(["pen", "eraser", "laser", "eraser-mode", "hand"]);
    expect(itemOf(last(save), "laser")).toEqual(itemOf(r.profile, "laser"));
  });

  it("Fermer un brouillon modifié : la question est posée (prop confirm), Oui : close ; rien n'est enregistré (P20, L3-32)", async () => {
    const { q, save, saveAsNew, close, confirm } = setup();
    fireEvent.click(q(tile("left")));
    fireEvent.click(q('button[data-edit="close"]'));
    expect(confirm).toHaveBeenCalledWith(QUESTION);
    await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    expect(save).not.toHaveBeenCalled();
    expect(saveAsNew).not.toHaveBeenCalled();
  });
});

describe("ProfileEditor : liste « Ajouter » et focus des préréglages (T11 ; design-l3 L3-16)", () => {
  it("la liste « Ajouter » se referme après un ajout ; le catalogue suit le brouillon (élément ajouté : plus proposé)", () => {
    const { q, container } = setup();
    const add = (): HTMLButtonElement => q<HTMLButtonElement>('[data-edit-bar="outils"] button[data-edit="add"]');
    fireEvent.click(add());
    expect(container.querySelector('[data-add-choice="action:page-next"]')).not.toBeNull();
    fireEvent.click(q('[data-add-choice="action:page-next"]'));
    expect(container.querySelector("[data-add-choice]")).toBeNull();
    fireEvent.click(add());
    expect(container.querySelector('[data-add-choice="action:page-next"]')).toBeNull();
    expect(container.querySelector('[data-add-choice="action:page-prev"]')).not.toBeNull();
  });

  it("modifier un préréglage garde le focus sur son champ", () => {
    const { q } = setup();
    const color = q<HTMLInputElement>('[data-edit-preset="rouge"] input[data-edit="preset-color"]');
    color.focus();
    setValue(color, "#16a34a");
    expect(document.activeElement).toBe(color);
    expect(q<HTMLInputElement>('[data-edit-preset="rouge"] input[data-edit="preset-color"]')).toBe(color);
    const label = q<HTMLInputElement>('[data-edit-preset="bleu"] input[data-edit="preset-label"]');
    label.focus();
    setValue(label, "Azur");
    expect(document.activeElement).toBe(label);
    expect(label.value).toBe("Azur");
  });

  it("L3-16 : « + Ajouter » : liste du catalogue, icône et libellé ; Échap la referme, focus rendu au bouton", () => {
    const { q, container } = setup();
    const add = q<HTMLButtonElement>('[data-edit-bar="outils"] button[data-edit="add"]');
    expect([add.textContent, add.getAttribute("aria-expanded")]).toEqual(["Ajouter", "false"]);
    fireEvent.click(add);
    expect(add.getAttribute("aria-expanded")).toBe("true");
    expect(q('[data-add-choice="action:page-next"] svg').getAttribute("data-icon")).toBe("next");
    expect(q('[data-add-choice="action:page-next"]').textContent).toBe("Page suivante");
    fireEvent.keyDown(q('[data-add-choice="action:page-next"]'), { key: "Escape" });
    expect(container.querySelector("[data-add-choice]")).toBeNull();
    expect(document.activeElement).toBe(q('[data-edit-bar="outils"] button[data-edit="add"]'));
  });
});

describe("ProfileEditor : panneau latéral (design-l3)", () => {
  it("L3-3 : chaque geste appelle preview(brouillon) ; le démontage appelle endPreview", () => {
    const { q, preview, endPreview, unmount } = setup();
    fireEvent.click(q(tile("left")));
    fireEvent.click(q(seg("l")));
    expect(preview).toHaveBeenCalledTimes(2);
    expect(outils(last(preview)).dock).toBe("left");
    expect(last(preview).interface.buttonSize).toBe("l");
    expect(endPreview).not.toHaveBeenCalled();
    unmount();
    expect(endPreview).toHaveBeenCalledTimes(1);
  });

  it("L3-6 : étiquette Fourni / Fourni, modifié / Personnel ; sélecteur sur le profil actif ; Importer et Exporter nommés", () => {
    expect(setup().q('[data-edit="profile-tag"]').textContent).toBe("Fourni");
    cleanup();
    expect(setup(DEFAUT, DEFAUT, { canResetCurrent: true }).q('[data-edit="profile-tag"]').textContent).toBe("Fourni, modifié");
    cleanup();
    const { q } = setup(DEFAUT, DEFAUT, { canRemove: true, canResetCurrent: true });
    expect(q('[data-edit="profile-tag"]').textContent).toBe("Personnel");
    expect(q<HTMLSelectElement>('select[data-edit="profile"]').value).toBe("defaut");
    expect(q('button[data-edit="import"]').getAttribute("aria-label")).toBe("Importer un profil (.rbprofile)");
    expect(q('button[data-edit="export"]').getAttribute("aria-label")).toBe("Exporter ce profil (.rbprofile)");
    expect(q('button[data-edit="close"]').getAttribute("aria-label")).toBe("Fermer");
  });

  it("L3-4 : brouillon égal : choisir « Simple » appelle choose, sans question", () => {
    const { q, choose, confirm } = setup();
    setValue(q<HTMLSelectElement>('select[data-edit="profile"]'), "simple");
    expect(choose).toHaveBeenCalledWith("simple");
    expect(confirm).not.toHaveBeenCalled();
  });

  it("L3-4, L3-32 : brouillon modifié, autre profil : question ; Non : rien ne change, le sélecteur revient au profil actif", async () => {
    const { q, choose, confirm } = setup();
    confirm.mockResolvedValueOnce(false);
    fireEvent.click(q(tile("left")));
    setValue(q<HTMLSelectElement>('select[data-edit="profile"]'), "simple");
    expect(confirm).toHaveBeenCalledWith(QUESTION);
    await tick();
    expect(choose).not.toHaveBeenCalled();
    expect(q<HTMLSelectElement>('select[data-edit="profile"]').value).toBe("defaut");
  });

  it("L3-4 : focusProfile au montage : le focus va au sélecteur", async () => {
    const { q } = setup(DEFAUT, DEFAUT, { focusProfile: true });
    await tick();
    expect(document.activeElement).toBe(q('select[data-edit="profile"]'));
  });

  it("L3-7 : deux cartes de démarrage ; la carte choisie porte la pastille check ; note de repli toujours visible", () => {
    const { q, container } = setup();
    expect([...container.querySelectorAll('[data-edit="start-mode"] [role="radio"]')].map((c) => c.getAttribute("data-choice"))).toEqual(["board", "desktop-annotation"]);
    expect(q('[data-edit="start-mode"] [data-choice="board"] .rb-radio-chk svg').getAttribute("data-icon")).toBe("check");
    expect(container.querySelector('[data-edit="start-mode"] [data-choice="desktop-annotation"] .rb-radio-chk')).toBeNull();
    expect(q('[data-edit="start-mode"] [data-choice="desktop-annotation"] svg[data-icon="annotate"]')).toBeTruthy();
    expect(q('[data-edit="start-mode"] [data-choice="board"] .rb-radio-detail').textContent).toBe("RoomBoard s'ouvre sur le tableau.");
    expect(q('[data-edit-section="general"] .rb-note').textContent).toBe("Sans annotation possible (web, iPad, Wayland) : tableau.");
  });

  it("L3-8 : tailles « Petits · 44 », « Moyens · 48 », « Grands · 64 » ; BUTTON_PX = --rb-btn-* de rb.css (D3)", () => {
    const { container } = setup();
    expect([...container.querySelectorAll('[data-edit="button-size"] [data-choice]')].map((b) => b.textContent)).toEqual(["Petits · 44", "Moyens · 48", "Grands · 64"]);
    const css = readFileSync(join(__dirname, "rb.css"), "utf8");
    for (const s of ["s", "m", "l"] as const) expect(css).toContain(`--rb-btn-${s}: ${BUTTON_PX[s]}px;`);
  });

  it("L3-10 : cinq vignettes d'emplacement, icônes dock-* ; la barre d'outils de defaut n'a ni note ni détail d'annotation", () => {
    const { container } = setup();
    expect([...container.querySelectorAll('[data-edit-bar="outils"] [data-edit="dock"] [data-choice]')].map((b) => [b.getAttribute("data-choice"), b.querySelector("svg")?.getAttribute("data-icon"), b.textContent])).toEqual([
      ["top", "dock-top", "En haut"], ["bottom", "dock-bottom", "En bas"], ["left", "dock-left", "À gauche"], ["right", "dock-right", "À droite"], ["floating", "dock-float", "Flottante"],
    ]);
    expect(container.querySelector('[data-edit="annotation-note"]')).toBeNull();
    expect(container.querySelector(`${tile("floating")} .rb-radio-detail`)).toBeNull();
  });

  it("L3-9, L3-12 : barre d'annotation : note fixe, « En annotation : en haut » sous Flottante ; ligne « Dessin / Souris » icône pen-line (D4, D5)", () => {
    const { q } = setup();
    fireEvent.click(q('[data-edit="bar"] [data-choice="annotation"]'));
    expect(q('[data-edit="annotation-note"]').textContent).toBe("Montrée seulement en annotation du bureau : réglage visible à l'entrée suivante.");
    expect(q(`${tile("floating", "annotation")} .rb-radio-detail`).textContent).toBe("En annotation : en haut");
    expect(q('[data-edit-item="annotation-pointer"] .rb-item-label').textContent).toBe("Dessin / Souris");
    expect(q('[data-edit-item="annotation-pointer"] > svg').getAttribute("data-icon")).toBe("pen-line");
    expect(q(shown("annotation-pointer")).getAttribute("aria-label")).toBe("Masquer Dessin / Souris");
    expect(POINTER_SUMMARY).toEqual({ label: POINTER_SEGMENTS.map((s) => s.label).join(" / "), icon: POINTER_SEGMENTS[0]!.icon });
  });

  it("L3-9 : deux barres tools et un rôle inconnu : « Barre <id> » ; un seul bloc ; catalogue du tableau pour la barre inconnue", () => {
    const r = parseProfile({
      format: "roomboard-profile", schema: 1, id: "multi", label: "Multi",
      toolbars: [
        { id: "outils", role: "tools", dock: "top", groups: [{ id: "g", items: [{ id: "pen", kind: "tool", tool: "pen", label: "Stylo" }, { id: "profiles", kind: "action", action: "profiles", label: "Profil" }] }] },
        { id: "outils2", role: "tools", dock: "left", groups: [{ id: "g2", items: [{ id: "rect", kind: "tool", tool: "rect", label: "Rectangle" }] }] },
        { id: "x", role: "minuteur", dock: "bottom", groups: [{ id: "g3", items: [{ id: "undo", kind: "action", action: "undo", label: "Annuler" }] }] },
      ],
    });
    if ("errors" in r) throw new Error(r.errors.join(" ; "));
    const { container, q } = setup(r.profile, r.profile);
    expect([...container.querySelectorAll('[data-edit="bar"] [data-choice]')].map((b) => b.textContent)).toEqual(["Barre outils", "Barre outils2", "Barre x"]);
    fireEvent.click(q('[data-edit="bar"] [data-choice="x"]'));
    expect([...container.querySelectorAll("[data-edit-bar]")].map((b) => b.getAttribute("data-edit-bar"))).toEqual(["x"]);
    expect(q('[data-edit-bar="x"] h4').textContent).toBe("Barre x");
    fireEvent.click(q('[data-edit-bar="x"] button[data-edit="add"]'));
    expect(container.querySelector('[data-add-choice="action:annotation-pointer"]')).toBeNull();
    expect(container.querySelector('[data-add-choice="tool:rect"]')).not.toBeNull();
  });

  it("L3-11 : une ligne par élément, dans l'ordre exact de la barre ; « Séparateur » ; icône de la table ; aucun draggable", () => {
    const { container, q } = setup();
    expect(rowIds(container)).toEqual(DEFAUT.toolbars[0]!.groups.flatMap((g) => g.items.map((i) => i.id)));
    expect(q('[data-edit-item="sep-1"]').hasAttribute("data-separator")).toBe(true);
    expect(q('[data-edit-item="sep-1"] .rb-item-label').textContent).toBe("Séparateur");
    expect(q('[data-edit-item="pen"] > svg').getAttribute("data-icon")).toBe("pen");
    expect(q('[data-edit-item="pen"] .rb-item-label').textContent).toBe("Stylo");
    expect(container.querySelector("[draggable]")).toBeNull();
  });

  it("L3-15 : un toucher de poignée dévoile Monter et Descendre pour cette ligne seulement ; un autre toucher les déplace", () => {
    const { q, container } = setup();
    expect(revealedRows(container)).toEqual([]);
    fireEvent.click(q(grip("pen")));
    expect(revealedRows(container)).toEqual(["pen"]);
    fireEvent.click(q(grip("hand")));
    expect(revealedRows(container)).toEqual(["hand"]);
    expect(q('[data-edit-item="hand"] button[data-edit="up"]').getAttribute("aria-label")).toBe("Monter Main");
  });

  it("L3-15 : poignée au clavier : Flèche haut = un cran, focus gardé, annonce « Main : rang 3 sur N », aide liée", async () => {
    const { q, container } = setup();
    q<HTMLButtonElement>(grip("hand")).focus();
    fireEvent.keyDown(q(grip("hand")), { key: "ArrowUp" });
    await tick();
    expect(document.activeElement).toBe(q(grip("hand")));
    expect(q('[data-edit="announce"]').textContent).toBe(`Main : rang 3 sur ${rowIds(container).length}`);
    expect(q('[data-edit="announce"]').getAttribute("aria-live")).toBe("polite");
    expect(q(grip("hand")).getAttribute("aria-label")).toBe("Déplacer Main");
    expect(document.getElementById(q(grip("hand")).getAttribute("aria-describedby")!)?.textContent).toBe("Flèches haut et bas pour déplacer ; Entrée pour Monter et Descendre");
  });

  it("L3-13 : tirer la poignée de Texte jusqu'en tête : un seul geste écrit (preview une fois), Texte en tête ; le clic qui suit est ignoré", () => {
    const { q, save, preview, container } = setup();
    const restore = layoutRows();
    try {
      const rows = rowIds(container);
      const y0 = 100 + rows.indexOf("text") * 48 + 24;
      const g = q<HTMLButtonElement>(grip("text"));
      g.dispatchEvent(pointer("pointerdown", y0));
      for (let y = y0 - 8; y >= 110; y -= 8) g.dispatchEvent(pointer("pointermove", y));
      expect(preview).not.toHaveBeenCalled();
      g.dispatchEvent(pointer("pointerup", 110));
      expect(preview).toHaveBeenCalledTimes(1);
      fireEvent.click(q(grip("text")));
      expect(revealedRows(container)).toEqual([]);
      expect(q('[data-edit="announce"]').textContent).toBe(`Texte : rang 1 sur ${rows.length}`);
      fireEvent.click(q('button[data-edit="save"]'));
      expect(outils(last(save)).groups[0]!.items.map((i) => i.id)).toEqual(["text", "pen", "eraser", "eraser-mode", "hand"]);
    } finally {
      restore();
    }
  });

  it("L3-19 : livré sans copie, brouillon égal : « Revenir à l'origine » grisé ; modifié : le brouillon revient, magasin intact", () => {
    const { q, resetCurrent, endPreview } = setup();
    expect(q<HTMLButtonElement>('button[data-edit="revert"]').disabled).toBe(true);
    fireEvent.click(q(tile("left")));
    expect(q<HTMLButtonElement>('button[data-edit="revert"]').disabled).toBe(false);
    fireEvent.click(q('button[data-edit="revert"]'));
    expect(q(tile("top")).getAttribute("aria-checked")).toBe("true");
    expect(endPreview).toHaveBeenCalledTimes(1);
    expect(resetCurrent).not.toHaveBeenCalled();
  });

  it("L3-19 : copie d'un livré ou profil de l'utilisateur : resetCurrent, sans question (H3)", () => {
    const { q, resetCurrent, confirm } = setup(DEFAUT, DEFAUT, { canResetCurrent: true });
    expect(q<HTMLButtonElement>('button[data-edit="revert"]').disabled).toBe(false);
    fireEvent.click(q(tile("left")));
    fireEvent.click(q('button[data-edit="revert"]'));
    expect(resetCurrent).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("L3-20 : « Enregistré sur cet appareil » seulement quand le brouillon égale le profil enregistré", () => {
    const { q, container } = setup();
    expect(q('[data-edit="saved"]').textContent).toBe("Enregistré sur cet appareil");
    fireEvent.click(q(tile("left")));
    expect(container.querySelector('[data-edit="saved"]')).toBeNull();
    fireEvent.click(q(tile("top")));
    expect(q('[data-edit="saved"]')).toBeTruthy();
  });

  it("L3-32 : seul le nom change : Fermer demande ; Non : rien ; brouillon égal : Fermer tout de suite, sans question", async () => {
    const a = setup();
    fireEvent.click(a.q('button[data-edit="close"]'));
    expect(a.close).toHaveBeenCalledTimes(1);
    expect(a.confirm).not.toHaveBeenCalled();
    cleanup();
    const b = setup();
    b.confirm.mockResolvedValueOnce(false);
    typeIn(b.q<HTMLInputElement>('input[data-edit="label"]'), "Autre nom");
    fireEvent.click(b.q('button[data-edit="close"]'));
    expect(b.confirm).toHaveBeenCalledWith(QUESTION);
    await tick();
    expect(b.close).not.toHaveBeenCalled();
  });

  it("L3-21 : Importer depuis le panneau : brouillon égal, sans question ; modifié, après Oui", async () => {
    const { q, importFile, confirm } = setup();
    fireEvent.click(q('button[data-edit="import"]'));
    expect(importFile).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
    fireEvent.click(q(tile("left")));
    fireEvent.click(q('button[data-edit="import"]'));
    expect(confirm).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(importFile).toHaveBeenCalledTimes(2));
  });

  it("L3-21 : Exporter écrit le brouillon ; nom vide : Exporter et Enregistrer grisés", () => {
    const { q, exportProfile } = setup();
    fireEvent.click(q(tile("left")));
    fireEvent.click(q('button[data-edit="export"]'));
    expect(outils(last(exportProfile)).dock).toBe("left");
    typeIn(q<HTMLInputElement>('input[data-edit="label"]'), "  ");
    expect(q<HTMLButtonElement>('button[data-edit="export"]').disabled).toBe(true);
    expect(q<HTMLButtonElement>('button[data-edit="save"]').disabled).toBe(true);
  });
});
```

  Rougeurs attendues de l'étape 2 (toutes, L3-26) : chaque test de ce fichier (nouvelles props, nouveau DOM).

- [ ] **Étape 2 : vérifier le rouge** —
  `cd /home/adminjd/projets/roomboard-wt/design-l3--T5/apps/web && TMPDIR=$HOME/.cache/tmp/of61-tmp nice -n 10 npx vitest run src/ui/ProfileEditor.test.tsx > "$HOME/.cache/tmp/of61-tmp/T5-rouge.log" 2>&1; echo "code $?"; grep -E "Tests |POINTER_SUMMARY|BUTTON_PX" "$HOME/.cache/tmp/of61-tmp/T5-rouge.log" | head`
  Attendu : `code 1` (`POINTER_SUMMARY` / `BUTTON_PX` absents à l'import).

- [ ] **Étape 3 : `POINTER_SUMMARY`.** Dans `apps/web/src/ui/PointerSwitch.tsx`, juste après `POINTER_SEGMENTS`
  (`:14-17`), ajouter :

```ts
/** design-l3 (L3-12) : libellé et icône de la ligne « Dessin / Souris » de l'éditeur, dérivés des segments (aucune
 *  copie : le constat `PointerSwitch.tsx:14` n'est pas aggravé). */
export const POINTER_SUMMARY: { readonly label: string; readonly icon: string } = Object.freeze({
  label: POINTER_SEGMENTS.map((s) => s.label).join(" / "),
  icon: POINTER_SEGMENTS[0]!.icon,
});
```

- [ ] **Étape 4 : le panneau.** Remplacer tout `apps/web/src/ui/ProfileEditor.tsx` par :

```tsx
/**
 * Éditeur de profil (C1, P20 ; design-l3, D-DS10) : panneau latéral de 600 px, calé à droite dans la case de la scène,
 * sans voile. Le brouillon reste (« Enregistrer » écrit, Fermer abandonne) et la page le montre : chaque geste appelle
 * `preview(brouillon)`, le démontage `endPreview()` (patron de `GridPanel.tsx`). Un brouillon différent du profil
 * enregistré (`sameProfile`) demande `confirm` avant d'être abandonné (L3-32). Chaque geste appelle une opération pure
 * de `profile-edit.ts` ; le composant n'écrit aucun stockage.
 */
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  Index,
  on,
  onCleanup,
  onMount,
  Show,
  type Accessor,
  type JSX,
} from "solid-js";
import {
  abandonQuestion,
  addItem,
  addPreset,
  canHide,
  catalog,
  moveItem,
  moveItemTo,
  presetFields,
  PRESET_TOOLS,
  removePreset,
  resetAllPresets,
  resetToolbars,
  sameProfile,
  setButtonSize,
  setDock,
  setHidden,
  setLabel,
  setStartMode,
  updatePreset,
  type CatalogEntry,
  type PresetField,
  type PresetPatch,
} from "../profile-edit";
import {
  ANNOTATION_ROLE,
  annotationBarOf,
  BUTTON_SIZES,
  DOCKS,
  isKnownItem,
  presetsOf,
  START_MODES,
  TOOL_TABLE,
  type ActionId,
  type ButtonSize,
  type Dock,
  type ItemKind,
  type Preset,
  type Profile,
  type StartMode,
  type Toolbar,
  type ToolItem,
} from "../toolbar";
import { Icon, IconButton } from "./IconButton";
import { iconFor } from "./icons";
import { POINTER_SUMMARY } from "./PointerSwitch";
import { RadioChoices, type RadioOption } from "./RadioChoices";
import { startSortDrag } from "./sort-drag";

export interface ProfileEditorProps {
  /** Profil enregistré (actif) ; le brouillon en est une copie prise au montage. */
  readonly profile: Profile;
  /** Profil livré d'origine (`originOf`) : source de « Rétablir les barres » et « Rétablir les préréglages ». */
  readonly origin: Profile;
  /** Profils du sélecteur (L3-6). */
  readonly profiles: Accessor<readonly Profile[]>;
  /** Vrai pour un profil de l'utilisateur : étiquette « Personnel ». */
  readonly canRemove: Accessor<boolean>;
  /** Vrai pour une copie d'un livré ou un profil de l'utilisateur : « Revenir à l'origine » agit sur l'enregistré (P6). */
  readonly canResetCurrent: Accessor<boolean>;
  /** Vrai au montage qui suit un choix fait dans le sélecteur : le focus y revient (L3-4). */
  readonly focusProfile?: boolean;
  save(draft: Profile): void;
  saveAsNew(draft: Profile, label: string): void;
  close(): void;
  /** L3-3 : brouillon montré par la page, à chaque geste. */
  preview(draft: Profile): void;
  /** L3-3 : la page revient au profil enregistré (démontage, brouillon rendu). */
  endPreview(): void;
  choose(id: string): void;
  importFile(): void;
  exportProfile(draft: Profile): void;
  resetCurrent(): void;
  confirm(message: string): Promise<boolean>;
}

type Edit = (f: (p: Profile) => Profile) => void;
/** Rend le focus après un geste : la ligne touchée peut être redessinée (nouvel objet), l'élément focalisé a disparu. */
type Refocus = (find: (root: HTMLElement) => HTMLElement | undefined) => void;

const DOCK_LABELS: Readonly<Record<Dock, string>> = { top: "En haut", bottom: "En bas", left: "À gauche", right: "À droite", floating: "Flottante" };
const DOCK_ICONS: Readonly<Record<Dock, string>> = { top: "dock-top", bottom: "dock-bottom", left: "dock-left", right: "dock-right", floating: "dock-float" };
/** L3-9 : sous la vignette « Flottante » de la barre montrée en annotation (`annotationBarOf` la pose en haut). */
const ANNOTATION_DOCK_DETAIL: Partial<Record<Dock, string>> = { floating: "En annotation : en haut" };
const SIZE_LABELS: Readonly<Record<ButtonSize, string>> = { s: "Petits", m: "Moyens", l: "Grands" };
/** L3-8 : tailles de L1 en px (`rb.css`, `--rb-btn-*`), liées par un test ; le profil garde le jeton `s|m|l` (P12). */
export const BUTTON_PX: Readonly<Record<ButtonSize, number>> = Object.freeze({ s: 44, m: 48, l: 64 });
const START_CHOICES: Readonly<Record<StartMode, { readonly label: string; readonly icon: string; readonly detail: string }>> = {
  board: { label: "Tableau", icon: "board", detail: "RoomBoard s'ouvre sur le tableau." },
  "desktop-annotation": { label: "Annotation du bureau", icon: "annotate", detail: "La barre seule, sur le bureau." },
};
const START_OPTIONS: readonly RadioOption<StartMode>[] = START_MODES.map((m) => ({ value: m, ...START_CHOICES[m] }));
const SIZE_OPTIONS: readonly RadioOption<ButtonSize>[] = BUTTON_SIZES.map((s) => ({ value: s, label: `${SIZE_LABELS[s]} · ${BUTTON_PX[s]}` }));
const ROLE_LABELS: Readonly<Record<string, string>> = { tools: "Barre d'outils", pages: "Barre des pages", [ANNOTATION_ROLE]: "Barre d'annotation" };
const UNKNOWN = "inconnu (version plus récente)";
/** L3-12 : lignes dont libellé et icône viennent d'ailleurs que de l'élément (renvois, aucune copie). */
const ROW_SUMMARY: Partial<Record<ActionId, { readonly label: string; readonly icon: string }>> = { "annotation-pointer": POINTER_SUMMARY };
/** Icône d'une ligne sans icône de table, par sorte. */
const KIND_ICONS: Partial<Record<ItemKind, string>> = { dropzone: "drop" };
const START_NOTE = "Sans annotation possible (web, iPad, Wayland) : tableau.";
const ANNOTATION_NOTE = "Montrée seulement en annotation du bureau : réglage visible à l'entrée suivante.";
const SORT_HINT = "Flèches haut et bas pour déplacer ; Entrée pour Monter et Descendre";
/** Flèche de la poignée → cran (table, L3-15 b). */
const ARROW_STEP: Readonly<Record<string, -1 | 1>> = { ArrowUp: -1, ArrowDown: 1 };
/** Champ de préréglage → modification (table : couleur en texte, épaisseur en nombre). */
const PATCH: Readonly<Record<PresetField["key"], (raw: string) => PresetPatch>> = {
  color: (raw) => ({ color: raw }),
  width: (raw) => ({ width: Number(raw) }),
};

/** Fixe la valeur d'un `select` une fois ses options posées, puis à chaque changement (fiable, contrairement à `selected`). */
export const syncValue = (el: HTMLSelectElement, value: () => string): void => {
  createEffect(() => {
    el.value = value();
  });
};
export const pick = <T extends string>(list: readonly T[], v: string): T | undefined => list.find((x) => x === v);

const summaryOf = (it: ToolItem): { readonly label: string; readonly icon: string } | undefined =>
  it.kind === "action" && it.action !== undefined && Object.hasOwn(ROW_SUMMARY, it.action) ? ROW_SUMMARY[it.action] : undefined;
const itemName = (it: ToolItem): string => summaryOf(it)?.label ?? (it.kind === "separator" ? "Séparateur" : it.label || it.id);
const rowIcon = (it: ToolItem): string | null =>
  summaryOf(it)?.icon ?? iconFor(it) ?? (Object.hasOwn(KIND_ICONS, it.kind) ? KIND_ICONS[it.kind]! : null);
const toolName = (tool: string): string => (Object.hasOwn(TOOL_TABLE, tool) ? TOOL_TABLE[tool]!.label : tool);
const entryKey = (e: CatalogEntry): string => `${e.kind}:${e.ref}`;
const entryIcon = (e: CatalogEntry): string | null =>
  iconFor({ id: e.ref, kind: e.kind, ...(e.kind === "tool" ? { tool: e.ref } : { action: e.ref }), label: e.label, requires: [], rest: {} });
const byData = (root: HTMLElement, attr: string, key: string, value: string): HTMLElement | undefined =>
  [...root.querySelectorAll<HTMLElement>(`[${attr}]`)].find((el) => el.dataset[key] === value);
/** Première commande présente et active de la ligne `itemId`, dans l'ordre de `controls` (grisée : la suivante). */
const rowControl = (itemId: string, ...controls: string[]) => (root: HTMLElement): HTMLElement | undefined => {
  const row = byData(root, "data-edit-item", "editItem", itemId);
  if (row === undefined) return undefined;
  for (const c of controls) {
    const el = row.querySelector<HTMLButtonElement>(`[data-edit="${c}"]`);
    if (el !== null && !el.disabled) return el;
  }
  return undefined;
};
/** L3-9 : libellé du rôle ; rôle inconnu ou partagé par deux barres : « Barre <id> ». */
function barLabels(bars: readonly Toolbar[]): Map<string, string> {
  const count = new Map<string, number>();
  for (const b of bars) count.set(b.role, (count.get(b.role) ?? 0) + 1);
  return new Map(bars.map((b) => [b.id, Object.hasOwn(ROLE_LABELS, b.role) && count.get(b.role) === 1 ? ROLE_LABELS[b.role]! : `Barre ${b.id}`]));
}
const sameOptions = (a: readonly RadioOption<string>[], b: readonly RadioOption<string>[]): boolean =>
  a.length === b.length && a.every((o, i) => o.value === b[i]!.value && o.label === b[i]!.label);

/** Ce que les lignes partagent : ligne dévoilée, tri au pointeur, annonce, aide de la poignée. */
interface RowShared {
  readonly revealed: Accessor<string | null>;
  readonly hint: string;
  sortFrom(e: PointerEvent, barId: string, itemId: string, from: number): void;
  gripClicked(itemId: string): void;
  announce(barId: string, itemId: string): void;
}

function ItemRow(props: { barId: string; item: ToolItem; index: number; last: number; edit: Edit; refocus: Refocus; row: RowShared }): JSX.Element {
  const known = (): boolean => isKnownItem(props.item);
  const name = (): string => itemName(props.item);
  const visible = (): boolean => props.item.hidden !== true;
  const move = (delta: -1 | 1, ...controls: string[]): void => {
    props.edit((p) => moveItem(p, props.barId, props.item.id, delta));
    props.row.announce(props.barId, props.item.id);
    props.refocus(rowControl(props.item.id, ...controls));
  };
  return (
    <li
      class="rb-item"
      data-edit-item={props.item.id}
      data-unknown={known() ? undefined : ""}
      data-separator={props.item.kind === "separator" ? "" : undefined}
      data-hidden={visible() ? undefined : ""}
      aria-disabled={known() ? undefined : "true"}
    >
      <button
        type="button"
        class="rb-grip"
        data-edit="grip"
        aria-label={`Déplacer ${name()}`}
        aria-describedby={props.row.hint}
        onPointerDown={(e) => props.row.sortFrom(e, props.barId, props.item.id, props.index)}
        onClick={() => props.row.gripClicked(props.item.id)}
        onKeyDown={(e) => {
          if (!Object.hasOwn(ARROW_STEP, e.key)) return;
          e.preventDefault();
          move(ARROW_STEP[e.key]!, "grip");
        }}
      >
        <Icon name="grip" />
      </button>
      <Show when={rowIcon(props.item)} fallback={<span class="rb-item-noicon" />}>
        {(n) => <Icon name={n()} />}
      </Show>
      <span class="rb-item-label">{known() ? name() : `${name()} — ${UNKNOWN}`}</span>
      <Show when={props.row.revealed() === props.item.id}>
        <button type="button" class="rb-sheet-ghost" data-edit="up" aria-label={`Monter ${name()}`} disabled={props.index === 0} onClick={() => move(-1, "up", "down", "grip")}>
          Monter
        </button>
        <button type="button" class="rb-sheet-ghost" data-edit="down" aria-label={`Descendre ${name()}`} disabled={props.index === props.last} onClick={() => move(1, "down", "up", "grip")}>
          Descendre
        </button>
      </Show>
      <IconButton
        icon={visible() ? "check" : "hidden"}
        label={`${visible() ? "Masquer" : "Afficher"} ${name()}`}
        pressed={visible()}
        disabled={!canHide(props.item)}
        attrs={{ "data-edit": "shown" }}
        onPress={() => {
          props.edit((p) => setHidden(p, props.item.id, visible()));
          props.refocus(rowControl(props.item.id, "shown", "grip"));
        }}
      />
    </li>
  );
}

function BarBlock(props: {
  bar: Toolbar;
  label: string;
  note: boolean;
  floatDetail: boolean;
  sorting: Accessor<boolean>;
  draft: Accessor<Profile>;
  edit: Edit;
  refocus: Refocus;
  row: RowShared;
}): JSX.Element {
  const items = (): readonly ToolItem[] => props.bar.groups.flatMap((g) => g.items);
  const choices = (): readonly CatalogEntry[] => catalog(props.draft(), props.bar.id);
  const [adding, setAdding] = createSignal(false);
  let addButton: HTMLButtonElement | undefined;
  createEffect(on(() => props.bar.id, () => setAdding(false), { defer: true }));
  const closeAdd = (): void => {
    setAdding(false);
    addButton?.focus();
  };
  // Mémos à égalité de valeur : les vignettes gardent leurs boutons (et le focus) d'un geste à l'autre.
  const detail = createMemo(() => props.floatDetail);
  const docks = createMemo((): readonly RadioOption<Dock>[] =>
    DOCKS.map((d) => ({ value: d, label: DOCK_LABELS[d], icon: DOCK_ICONS[d], ...(detail() && Object.hasOwn(ANNOTATION_DOCK_DETAIL, d) ? { detail: ANNOTATION_DOCK_DETAIL[d]! } : {}) })),
  );
  return (
    <div class="rb-sheet-bar" data-edit-bar={props.bar.id}>
      <h4>{props.label}</h4>
      <Show when={props.note}>
        <p class="rb-note" data-edit="annotation-note">
          {ANNOTATION_NOTE}
        </p>
      </Show>
      <RadioChoices name="dock" label={`Emplacement : ${props.label}`} look="tile" options={docks()} value={props.bar.dock} choose={(d) => props.edit((p) => setDock(p, props.bar.id, d))} />
      <div
        class="rb-add-wrap"
        onKeyDown={(e) => {
          if (e.key !== "Escape" || !adding()) return;
          e.preventDefault();
          closeAdd();
        }}
      >
        <div class="rb-sheet-h2row">
          <h4>Outils de la barre</h4>
          <button type="button" ref={addButton} class="rb-sheet-add" data-edit="add" aria-expanded={adding()} disabled={choices().length === 0} onClick={() => setAdding((a) => !a)}>
            <Icon name="plus" />
            Ajouter
          </button>
        </div>
        <Show when={adding()}>
          <ul class="rb-add-list" data-edit="add-list">
            <For each={choices()}>
              {(c) => (
                <li>
                  <button
                    type="button"
                    data-add-choice={entryKey(c)}
                    onClick={() => {
                      props.edit((p) => addItem(p, props.bar.id, c));
                      closeAdd();
                    }}
                  >
                    <Show when={entryIcon(c)}>{(n) => <Icon name={n()} />}</Show>
                    <span>{c.kind === "tool" ? `Outil : ${c.label}` : c.label}</span>
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>
      <ul class="rb-items" data-edit="items" data-sorting={props.sorting() ? "" : undefined}>
        <For each={items()}>
          {(it, i) => <ItemRow barId={props.bar.id} item={it} index={i()} last={items().length - 1} edit={props.edit} refocus={props.refocus} row={props.row} />}
        </For>
      </ul>
    </div>
  );
}

function PresetInput(props: { tool: string; preset: Preset; field: PresetField; edit: Edit }): JSX.Element {
  return (
    <label class={`rb-preset-${props.field.key}`}>
      <span class={props.field.input === "color" ? "rb-sr" : undefined}>{props.field.label}</span>
      <input
        type={props.field.input}
        data-edit={`preset-${props.field.key}`}
        value={String(props.preset[props.field.key] ?? "")}
        min={props.field.input === "number" ? "0.5" : undefined}
        step={props.field.input === "number" ? "0.5" : undefined}
        onChange={(e) => {
          const patch = PATCH[props.field.key](e.currentTarget.value);
          props.edit((d) => updatePreset(d, props.tool, props.preset.id, patch));
        }}
      />
    </label>
  );
}

function PresetList(props: { tool: string; draft: Accessor<Profile>; edit: Edit }): JSX.Element {
  const list = (): readonly Preset[] => presetsOf(props.draft().presets, props.tool);
  const fields = presetFields(props.tool);
  const colors = fields.filter((f) => f.input === "color");
  const others = fields.filter((f) => f.input !== "color");
  return (
    <div class="rb-presets" data-edit-presets={props.tool}>
      <h4>{toolName(props.tool)}</h4>
      <ul>
        {/* Index : la ligne et ses champs restent en place quand le préréglage change (le focus ne se perd pas). */}
        <Index each={list()}>
          {(p) => (
            <li class="rb-preset-row" data-edit-preset={p().id}>
              <For each={colors}>{(f) => <PresetInput tool={props.tool} preset={p()} field={f} edit={props.edit} />}</For>
              <label class="rb-preset-name">
                <span class="rb-sr">Nom</span>
                <input
                  type="text"
                  data-edit="preset-label"
                  value={p().label}
                  onChange={(e) => {
                    const label = e.currentTarget.value;
                    props.edit((d) => updatePreset(d, props.tool, p().id, { label }));
                  }}
                />
              </label>
              <For each={others}>{(f) => <PresetInput tool={props.tool} preset={p()} field={f} edit={props.edit} />}</For>
              <IconButton icon="trash" label={`Retirer ${p().label}`} attrs={{ "data-edit": "preset-remove" }} onPress={() => props.edit((d) => removePreset(d, props.tool, p().id))} />
            </li>
          )}
        </Index>
      </ul>
      <button type="button" class="rb-sheet-add" data-edit="preset-add" onClick={() => props.edit((d) => addPreset(d, props.tool))}>
        <Icon name="plus" />
        Ajouter une couleur
      </button>
    </div>
  );
}

export function ProfileEditor(props: ProfileEditorProps): JSX.Element {
  const [draft, setDraft] = createSignal<Profile>(props.profile);
  const [newName, setNewName] = createSignal(`${props.profile.label} (copie)`);
  const firstBar = (p: Profile): string => p.toolbars.find((b) => b.role === "tools")?.id ?? p.toolbars[0]?.id ?? "";
  const [barId, setBarId] = createSignal(firstBar(props.profile));
  const [revealed, setRevealed] = createSignal<string | null>(null);
  const [sorting, setSorting] = createSignal(false);
  const [said, setSaid] = createSignal("");
  const hint = createUniqueId();
  let root: HTMLElement | undefined;
  let profileSelect: HTMLSelectElement | undefined;
  onCleanup(() => props.endPreview());
  onMount(() => {
    if (props.focusProfile === true) queueMicrotask(() => profileSelect?.focus());
  });
  const edit: Edit = (f) => {
    const next = f(draft());
    setDraft(next);
    props.preview(next);
  };
  // Après le redessin (microtâche) : le focus revient sur la commande repérée dans le nouveau DOM.
  const refocus: Refocus = (find) =>
    queueMicrotask(() => {
      if (root !== undefined) find(root)?.focus();
    });
  const unchanged = (): boolean => sameProfile(draft(), props.profile);
  const named = (): boolean => draft().label.trim() !== "";
  /** L3-32 : brouillon égal au profil enregistré : `then` tout de suite ; sinon après un Oui. */
  const leave = (then: () => void): void => {
    if (unchanged()) return then();
    void props.confirm(abandonQuestion(props.profile.label)).then((ok) => {
      if (ok) then();
    });
  };
  const tag = (): string => (props.canRemove() ? "Personnel" : props.canResetCurrent() ? "Fourni, modifié" : "Fourni");
  const canRevert = (): boolean => props.canResetCurrent() || !unchanged();
  /** L3-19 : copie ou profil de l'utilisateur : remise de l'enregistré (l'éditeur remonte) ; sinon, le brouillon revient. */
  const revert = (): void => {
    if (props.canResetCurrent()) return props.resetCurrent();
    setDraft(props.profile);
    props.endPreview();
  };
  const announce = (bar: string, itemId: string): void => {
    const b = draft().toolbars.find((x) => x.id === bar);
    if (b === undefined) return;
    const items = b.groups.flatMap((g) => g.items);
    const i = items.findIndex((it) => it.id === itemId);
    if (i !== -1) setSaid(`${itemName(items[i]!)} : rang ${i + 1} sur ${items.length}`);
  };
  /** Vrai entre la fin d'un vrai glisser (ou d'un geste annulé) et le `click` qui le suit, ignoré (L3-15 a). */
  let justSorted = false;
  const row: RowShared = {
    revealed,
    hint,
    announce,
    gripClicked: (itemId) => {
      if (justSorted) {
        justSorted = false;
        return;
      }
      setRevealed(itemId);
    },
    sortFrom: (e, bar, itemId, from) => {
      justSorted = false;
      const grip = e.currentTarget as HTMLElement | null;
      const list = grip?.closest("ul") ?? null;
      const scroller = grip?.closest<HTMLElement>("[data-sheet-body]") ?? null;
      if (list === null || scroller === null) return;
      startSortDrag(e, {
        rows: () => Array.from(list.children) as HTMLElement[],
        scroller,
        from,
        moved: () => setSorting(true),
        drop: (to) => {
          justSorted = true;
          setSorting(false);
          edit((p) => moveItemTo(p, bar, itemId, to));
          announce(bar, itemId);
          refocus(rowControl(itemId, "grip"));
        },
        tap: () => {
          setSorting(false);
          setRevealed(itemId);
        },
        cancel: () => {
          justSorted = true;
          setSorting(false);
        },
      });
    },
  };
  const labels = createMemo(() => barLabels(draft().toolbars));
  const barOptions = createMemo(
    (): readonly RadioOption<string>[] => draft().toolbars.map((b) => ({ value: b.id, label: labels().get(b.id) ?? `Barre ${b.id}` })),
    undefined,
    { equals: sameOptions },
  );
  const shownBar = (): Toolbar | undefined => draft().toolbars.find((b) => b.id === barId()) ?? draft().toolbars.find((b) => b.id === firstBar(draft()));
  const floatBar = createMemo(() => annotationBarOf(draft())?.id);
  return (
    <aside ref={root} class="rb-sheet" data-profile-editor role="dialog" aria-label="Profils">
      <header class="rb-sheet-head">
        <h2>Profils</h2>
        <IconButton icon="close" label="Fermer" attrs={{ "data-edit": "close" }} onPress={() => leave(() => props.close())} />
      </header>
      <div class="rb-sheet-body" data-sheet-body>
        <section data-edit-section="profile">
          <h3>Profil actif</h3>
          <div class="rb-sheet-row">
            <label class="rb-select">
              <Icon name="profile" />
              <select
                ref={(el) => {
                  profileSelect = el;
                  syncValue(el, () => props.profile.id);
                }}
                data-edit="profile"
                aria-label="Profil actif"
                onChange={(e) => {
                  const el = e.currentTarget;
                  const id = el.value;
                  el.value = props.profile.id; // la liste montre le profil actif tant que le choix n'est pas fait
                  if (id !== props.profile.id) leave(() => props.choose(id));
                }}
              >
                <For each={props.profiles()}>{(p) => <option value={p.id}>{p.label}</option>}</For>
              </select>
              <span class="rb-tag" data-edit="profile-tag">
                {tag()}
              </span>
              <Icon name="down" />
            </label>
            <IconButton icon="import" label="Importer un profil (.rbprofile)" attrs={{ "data-edit": "import" }} onPress={() => leave(() => props.importFile())} />
            <IconButton icon="export" label="Exporter ce profil (.rbprofile)" attrs={{ "data-edit": "export" }} disabled={!named()} onPress={() => props.exportProfile(draft())} />
          </div>
          <label class="rb-field">
            <span>Nom du profil</span>
            <input
              type="text"
              data-edit="label"
              value={draft().label}
              onInput={(e) => {
                const v = e.currentTarget.value;
                edit((p) => setLabel(p, v));
              }}
            />
          </label>
        </section>
        <section data-edit-section="general">
          <h3>Au démarrage</h3>
          <RadioChoices name="start-mode" label="Au démarrage" look="card" options={START_OPTIONS} value={draft().behavior.startMode} choose={(m) => edit((p) => setStartMode(p, m))} />
          <p class="rb-note">{START_NOTE}</p>
          <h3>Taille des boutons</h3>
          <RadioChoices name="button-size" label="Taille des boutons" look="segment" options={SIZE_OPTIONS} value={draft().interface.buttonSize} choose={(s) => edit((p) => setButtonSize(p, s))} />
        </section>
        <section data-edit-section="bars">
          <h3>Barres</h3>
          <RadioChoices
            name="bar"
            label="Barre à régler"
            look="segment"
            options={barOptions()}
            value={shownBar()?.id ?? ""}
            choose={(id) => {
              setBarId(id);
              setRevealed(null);
            }}
          />
          <Show when={shownBar()}>
            {(b) => (
              <BarBlock
                bar={b()}
                label={labels().get(b().id) ?? `Barre ${b().id}`}
                note={b().role === ANNOTATION_ROLE}
                floatDetail={floatBar() === b().id}
                sorting={sorting}
                draft={draft}
                edit={edit}
                refocus={refocus}
                row={row}
              />
            )}
          </Show>
          <button type="button" class="rb-sheet-ghost" data-edit="reset-bars" onClick={() => edit((p) => resetToolbars(p, props.origin))}>
            <Icon name="reset" />
            Rétablir les barres
          </button>
        </section>
        <section data-edit-section="presets">
          <h3>Préréglages</h3>
          <For each={PRESET_TOOLS}>{(tool) => <PresetList tool={tool} draft={draft} edit={edit} />}</For>
          <button type="button" class="rb-sheet-ghost" data-edit="reset-presets" onClick={() => edit((p) => resetAllPresets(p, props.origin))}>
            <Icon name="reset" />
            Rétablir les préréglages
          </button>
        </section>
        <section data-edit-section="new">
          <h3>Enregistrer comme nouveau</h3>
          <div class="rb-sheet-row">
            <label class="rb-field rb-field-grow">
              <span>Nom du nouveau profil</span>
              <input type="text" data-edit="new-name" value={newName()} onInput={(e) => setNewName(e.currentTarget.value)} />
            </label>
            <button type="button" class="rb-sheet-outline" data-edit="save-new" disabled={newName().trim() === ""} onClick={() => props.saveAsNew(draft(), newName().trim())}>
              Enregistrer comme nouveau
            </button>
          </div>
        </section>
        <p class="rb-sr" aria-live="polite" data-edit="announce">
          {said()}
        </p>
        <p class="rb-sr" id={hint}>
          {SORT_HINT}
        </p>
      </div>
      <footer class="rb-sheet-foot">
        <button type="button" class="rb-sheet-ghost" data-edit="revert" disabled={!canRevert()} onClick={revert}>
          <Icon name="reset" />
          Revenir à l'origine
        </button>
        <div class="rb-sheet-foot-end">
          <Show when={unchanged()}>
            <span class="rb-saved" data-edit="saved">
              <Icon name="check" />
              Enregistré sur cet appareil
            </span>
          </Show>
          <button type="button" class="rb-sheet-solid" data-edit="save" disabled={!named()} onClick={() => props.save(draft())}>
            Enregistrer
          </button>
        </div>
      </footer>
    </aside>
  );
}
```

  Note pour `textContent` : dans les JSX ci-dessus, les textes de bouton suivent l'icône sans espace (« Ajouter »,
  « Revenir à l'origine ») ; Solid n'ajoute aucun espace entre un `<Icon />` et le texte de la ligne suivante, les tests
  lisent donc `Ajouter`. Si `textContent` montre un blanc en tête, l'écrire sur la même ligne que l'icône.

- [ ] **Étape 5 : styles du panneau (tests rouges d'abord).** Dans `apps/web/src/ui/rb-css.test.ts`, avant la fermeture
  du describe principal, ajouter :

```ts
  it("design-l3 L3-1 : panneau des profils calé à droite dans la scène, toute sa hauteur, 600 px au plus, filet et ombre modale", () => {
    expect(rule('.rb-popover[data-panel="profils"]')).toMatch(/justify-self: end;.*align-self: stretch;.*inline-size: min\(600px, 100%\);.*overflow: hidden;.*border: 0;.*box-shadow: 0 0 0 1px var\(--rf-gray-300\), var\(--rf-shadow-modal\);/);
    expect(rule(".rb-sheet")).toMatch(/display: flex;.*flex-direction: column;.*block-size: 100%;/);
    expect(rule(".rb-sheet-head")).toContain("block-size: 80px;");
    expect(rule(".rb-sheet-foot")).toContain("block-size: 80px;");
    expect(rule(".rb-sheet-body")).toMatch(/overflow-y: auto;/);
  });
  it("design-l3 L3-24 : règles du panneau aux jetons de la charte, tailles de texte 20 / 16 / 15 / 14", () => {
    const own = (CSS.replace(/\/\*.*?\*\//g, "").match(/[^{}]+\{[^}]*\}/g) ?? []).filter((r) => /rb-sheet|rb-radio|rb-item|rb-grip|rb-select|rb-tag|rb-note|rb-field|rb-add-list|rb-preset-row|rb-presets|rb-saved/.test(r.split("{")[0]!));
    expect(own.length).toBeGreaterThan(20);
    for (const r of own) {
      expect(r, r).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
      for (const [, px] of r.matchAll(/font-size: (\d+)px/g)) expect(["14", "15", "16", "20"], r).toContain(px);
    }
  });
  it("design-l3 L3-24 : cibles de 48 px ou plus (poignée, boutons à icône, segments, vignettes de 80 px, cartes de 104 px)", () => {
    expect(rule(".rb-grip")).toMatch(/inline-size: 48px;.*block-size: 48px;.*touch-action: none;/);
    expect(rule(".rb-sheet button.rb-ib")).toMatch(/inline-size: 48px;.*block-size: 48px;/);
    expect(rule('.rb-radios[data-look="segment"] .rb-radio')).toContain("min-block-size: 48px;");
    expect(rule('.rb-radios[data-look="tile"] .rb-radio')).toContain("min-block-size: 80px;");
    expect(rule('.rb-radios[data-look="card"] .rb-radio')).toContain("min-block-size: 104px;");
    expect(rule(".rb-item")).toContain("min-block-size: 48px;");
    expect(rule('.rb-radios[data-look="tile"]')).toContain("grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));");
  });
  it("design-l3 L3-24 : .rb-editor inchangée (Grille, Image l'emploient)", () => {
    const keep: readonly [string, string][] = [
      [".rb-editor", ".rb-editor { display: grid; gap: var(--rb-gap); padding: var(--rb-pad); }"],
      [".rb-editor section", ".rb-editor section { display: grid; gap: var(--rb-gap); }"],
      [".rb-editor h3", ".rb-editor h3 { margin: 0; font-size: 1rem; }"],
      [".rb-editor fieldset", ".rb-editor fieldset { display: grid; gap: var(--rb-gap); border: 1px solid #d4d4d8; }"],
      [".rb-editor ul", ".rb-editor ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }"],
      [".rb-editor li", ".rb-editor li { display: flex; flex-wrap: wrap; align-items: center; gap: var(--rb-gap); }"],
      [".rb-editor li[data-unknown]", ".rb-editor li[data-unknown] { color: #71717a; font-style: italic; }"],
      ['.rb-editor input[type="checkbox"]', '.rb-editor input[type="checkbox"] { inline-size: calc(var(--rb-btn-m) / 2); block-size: calc(var(--rb-btn-m) / 2); }'],
      [".rb-editor-actions", ".rb-editor-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--rb-gap); }"],
    ];
    for (const [sel, text] of keep) expect(rule(sel).trim(), sel).toBe(text);
  });
  it("design-l3 L3-7, L3-10, L3-8 : carte et vignette choisies en violet 100 / 600 / 700 ; segment choisi blanc, ombre de carte", () => {
    expect(rule('.rb-radios[data-look="card"] .rb-radio[aria-checked="true"]')).toMatch(/border-color: var\(--rf-violet-600\);.*box-shadow: inset 0 0 0 1px var\(--rf-violet-600\);.*background: var\(--rf-violet-100\);/);
    expect(rule(".rb-radio-chk")).toMatch(/inline-size: 32px;.*block-size: 32px;.*border-radius: 50%;.*background: var\(--rf-violet-600\);.*color: var\(--rf-white\);/);
    expect(rule('.rb-radios[data-look="tile"] .rb-radio[aria-checked="true"]')).toMatch(/background: var\(--rf-violet-100\);.*color: var\(--rf-violet-700\);.*font-weight: 600;/);
    expect(rule('.rb-radios[data-look="segment"] .rb-radio[aria-checked="true"]')).toMatch(/background: var\(--rf-white\);.*color: var\(--rf-violet-700\);.*box-shadow: 0 0 0 1px var\(--rf-gray-300\), var\(--rf-shadow-card\);/);
    expect(rule(".rb-item[data-hidden]")).toMatch(/background: var\(--rf-gray-100\);.*color: var\(--rf-text-muted-aa\);/);
  });
```

  Puis, dans `apps/web/src/ui/rb.css`, juste après la règle `.rb-editor-actions { … }` (`:184`), ajouter :

```css
/* design-l3 (L3-1, L3-24, D-DS10) : panneau des profils, calé à droite dans la case de la scène, toute sa hauteur, sans
   voile ; filet gris 300 et ombre modale de la charte (« panneau des profils »). Classes neuves sous .rb-sheet ;
   .rb-editor ci-dessus reste celle des panneaux Grille et Image. */
.rb-popover[data-panel="profils"] { justify-self: end; align-self: stretch; inline-size: min(600px, 100%); overflow: hidden; border: 0; box-shadow: 0 0 0 1px var(--rf-gray-300), var(--rf-shadow-modal); }
.rb-sheet { display: flex; flex-direction: column; block-size: 100%; background: var(--rf-white); color: var(--rf-gray-800); font-size: 16px; }
.rb-sheet-head { flex: none; display: flex; align-items: center; justify-content: space-between; block-size: 80px; box-sizing: border-box; padding: 0 var(--rf-space-md) 0 var(--rf-space-xl); border-block-end: 1px solid var(--rf-gray-300); }
.rb-sheet-head h2 { margin: 0; font-size: 20px; font-weight: 600; color: var(--rf-navy-500); }
.rb-sheet-body { flex: 1 1 auto; min-block-size: 0; overflow-y: auto; display: flex; flex-direction: column; gap: var(--rf-space-lg); padding: 20px var(--rf-space-xl); }
.rb-sheet-foot { flex: none; display: flex; align-items: center; justify-content: space-between; gap: var(--rf-space-md); block-size: 80px; box-sizing: border-box; padding: 0 var(--rf-space-xl); border-block-start: 1px solid var(--rf-gray-300); }
.rb-sheet-foot-end { display: flex; align-items: center; gap: var(--rf-space-md); }
.rb-sheet section { display: flex; flex-direction: column; }
.rb-sheet h3 { margin: 0 0 12px; font-size: 16px; font-weight: 600; color: var(--rf-navy-500); }
.rb-sheet h4 { margin: 0; font-size: 16px; font-weight: 600; color: var(--rf-navy-500); }
.rb-sheet-row { display: flex; align-items: center; gap: var(--rf-space-sm); }
.rb-sheet button { font: inherit; }
.rb-sheet button:focus-visible, .rb-sheet select:focus-visible, .rb-sheet input:focus-visible { outline: 2px solid var(--rf-violet-600); outline-offset: 2px; }
.rb-sheet button.rb-ib { display: inline-grid; place-items: center; flex: none; inline-size: 48px; block-size: 48px; padding: 0; border: 0; border-radius: var(--rf-radius-lg); background: transparent; color: var(--rf-navy-500); cursor: pointer; }
.rb-sheet button.rb-ib:not(:disabled):hover { background: var(--rf-gray-50); }
.rb-sheet button.rb-ib:disabled { color: var(--rf-gray-500); cursor: default; }
.rb-select { flex: 1 1 auto; min-inline-size: 0; display: flex; align-items: center; gap: 12px; block-size: 56px; box-sizing: border-box; padding: 0 var(--rf-space-sm) 0 var(--rf-space-md); border: 1px solid var(--rf-gray-300); border-radius: var(--rf-radius-lg); color: var(--rf-navy-500); }
.rb-select select { flex: 1 1 auto; min-inline-size: 0; block-size: 100%; border: 0; background: transparent; font: inherit; font-size: 16px; font-weight: 500; color: inherit; appearance: none; cursor: pointer; }
.rb-tag { font-size: 14px; font-weight: 500; color: var(--rf-text-muted-aa); white-space: nowrap; }
.rb-field { display: flex; flex-direction: column; gap: var(--rf-space-xs); margin-block-start: var(--rf-space-md); font-size: 14px; font-weight: 500; color: var(--rf-gray-800); }
.rb-field-grow { flex: 1 1 auto; margin-block-start: 0; }
.rb-field input { block-size: 48px; box-sizing: border-box; padding: 0 12px; border: 1px solid var(--rf-gray-300); border-radius: var(--rf-radius-lg); background: var(--rf-white); font: inherit; font-size: 16px; font-weight: 400; color: var(--rf-navy-500); }
.rb-note { margin: var(--rf-space-sm) 0 0; font-size: 14px; line-height: 20px; color: var(--rf-text-muted-aa); }
.rb-sheet-ghost { display: inline-flex; align-items: center; gap: var(--rf-space-sm); min-block-size: 48px; padding: 0 var(--rf-space-md); border: 0; border-radius: var(--rf-radius-lg); background: transparent; font-size: 15px; font-weight: 500; color: var(--rf-navy-500); cursor: pointer; }
.rb-sheet-ghost:not(:disabled):hover { background: var(--rf-gray-50); }
.rb-sheet-ghost:disabled { color: var(--rf-text-muted-aa); cursor: default; }
.rb-sheet-solid { min-block-size: 48px; padding: 0 var(--rf-space-lg); border: 0; border-radius: var(--rf-radius-lg); background: var(--rf-violet-600); font-size: 15px; font-weight: 600; color: var(--rf-white); cursor: pointer; }
.rb-sheet-solid:not(:disabled):hover { background: var(--rf-violet-700); }
.rb-sheet-solid:disabled { background: var(--rf-gray-50); color: var(--rf-text-muted-aa); cursor: default; }
.rb-sheet-outline { flex: none; align-self: flex-end; min-block-size: 48px; padding: 0 var(--rf-space-md); border: 1px solid var(--rf-gray-300); border-radius: var(--rf-radius-lg); background: var(--rf-white); font-size: 15px; font-weight: 500; color: var(--rf-navy-500); white-space: nowrap; cursor: pointer; }
.rb-sheet-outline:disabled { color: var(--rf-text-muted-aa); cursor: default; }
.rb-saved { display: inline-flex; align-items: center; gap: var(--rf-space-sm); font-size: 14px; color: var(--rf-text-muted-aa); }
.rb-saved .rb-icon { color: var(--rf-success); }
/* design-l3 (L3-23, L3-7, L3-10, L3-8) : choix exclusifs (RadioChoices) en cartes, vignettes et segments. */
.rb-radios[data-look="card"] { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.rb-radios[data-look="tile"] { display: grid; grid-template-columns: repeat(auto-fit, minmax(88px, 1fr)); gap: var(--rf-space-sm); margin-block: 12px var(--rf-space-md); }
.rb-radios[data-look="segment"] { display: flex; gap: var(--rf-space-xs); padding: var(--rf-space-xs); background: var(--rf-gray-50); border-radius: var(--rf-radius-lg); }
.rb-radio { box-sizing: border-box; border: 1px solid var(--rf-gray-300); border-radius: var(--rf-radius-lg); background: var(--rf-white); color: var(--rf-navy-500); cursor: pointer; }
.rb-radios[data-look="card"] .rb-radio { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: var(--rf-space-sm); min-block-size: 104px; padding: var(--rf-space-md); text-align: start; }
.rb-radios[data-look="card"] .rb-radio-label { font-size: 16px; font-weight: 600; }
.rb-radio-detail { font-size: 14px; line-height: 20px; color: var(--rf-text-muted-aa); }
.rb-radios[data-look="card"] .rb-radio[aria-checked="true"] { border-color: var(--rf-violet-600); box-shadow: inset 0 0 0 1px var(--rf-violet-600); background: var(--rf-violet-100); }
.rb-radios[data-look="card"] .rb-radio[aria-checked="true"] .rb-radio-label, .rb-radios[data-look="card"] .rb-radio[aria-checked="true"] > .rb-icon { color: var(--rf-violet-700); }
.rb-radio-chk { position: absolute; inset-inline-end: 12px; inset-block-start: 12px; display: grid; place-items: center; inline-size: 32px; block-size: 32px; border-radius: 50%; background: var(--rf-violet-600); color: var(--rf-white); }
.rb-radios[data-look="tile"] .rb-radio { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; min-block-size: 80px; padding: var(--rf-space-xs); font-size: 14px; color: var(--rf-gray-800); }
.rb-radios[data-look="tile"] .rb-radio > .rb-icon { color: var(--rf-navy-500); }
.rb-radios[data-look="tile"] .rb-radio[aria-checked="true"] { border-color: var(--rf-violet-600); box-shadow: inset 0 0 0 1px var(--rf-violet-600); background: var(--rf-violet-100); color: var(--rf-violet-700); font-weight: 600; }
.rb-radios[data-look="tile"] .rb-radio[aria-checked="true"] > .rb-icon { color: var(--rf-violet-700); }
.rb-radios[data-look="tile"] .rb-radio-detail { font-size: 14px; text-align: center; }
.rb-radios[data-look="segment"] .rb-radio { flex: 1 1 0; min-block-size: 48px; border: 0; border-radius: var(--rf-radius-md); background: transparent; font-size: 15px; font-weight: 500; color: var(--rf-gray-800); }
.rb-radios[data-look="segment"] .rb-radio[aria-checked="true"] { background: var(--rf-white); color: var(--rf-violet-700); font-weight: 600; box-shadow: 0 0 0 1px var(--rf-gray-300), var(--rf-shadow-card); }
/* design-l3 (L3-11, L3-13, L3-15, L3-16) : liste des éléments d'une barre, poignée tactile, liste « Ajouter ». */
.rb-sheet-bar { display: flex; flex-direction: column; margin-block-start: var(--rf-space-md); }
.rb-sheet-h2row { display: flex; align-items: center; justify-content: space-between; margin-block-end: var(--rf-space-xs); }
.rb-sheet-add { display: inline-flex; align-items: center; gap: 12px; min-block-size: 48px; padding: 0 12px; border: 0; border-radius: var(--rf-radius-lg); background: transparent; font-size: 16px; font-weight: 500; color: var(--rf-violet-700); cursor: pointer; }
.rb-sheet-add:not(:disabled):hover { background: var(--rf-gray-50); }
.rb-sheet-add:disabled { color: var(--rf-text-muted-aa); cursor: default; }
.rb-add-list { list-style: none; margin: 0 0 var(--rf-space-sm); padding: var(--rf-space-xs); display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--rf-space-xs); border: 1px solid var(--rf-gray-300); border-radius: var(--rf-radius-lg); }
.rb-add-list button { display: flex; align-items: center; gap: 12px; inline-size: 100%; min-block-size: 48px; padding: 0 12px; border: 0; border-radius: var(--rf-radius-md); background: transparent; font-size: 16px; color: var(--rf-gray-800); text-align: start; cursor: pointer; }
.rb-add-list button:hover { background: var(--rf-gray-50); }
.rb-add-list .rb-icon { color: var(--rf-navy-500); }
.rb-items { list-style: none; margin: 0; padding: 0; border: 1px solid var(--rf-gray-300); border-radius: var(--rf-radius-lg); }
.rb-items[data-sorting] { user-select: none; -webkit-user-select: none; }
.rb-item { position: relative; display: flex; align-items: center; gap: 12px; min-block-size: 48px; box-sizing: border-box; padding-inline-end: var(--rf-space-xs); border-block-end: 1px solid var(--rf-gray-300); background: var(--rf-white); font-size: 16px; color: var(--rf-gray-800); }
.rb-item:last-child { border-block-end: 0; }
.rb-item > .rb-icon { color: var(--rf-navy-500); }
.rb-item-noicon { flex: none; inline-size: var(--rb-icon); }
.rb-item-label { flex: 1 1 auto; min-inline-size: 0; }
.rb-item[data-separator] .rb-item-label { font-size: 14px; color: var(--rf-text-muted-aa); }
.rb-item[data-hidden] { background: var(--rf-gray-100); color: var(--rf-text-muted-aa); }
.rb-item[data-hidden] > .rb-icon, .rb-item[data-hidden] button.rb-ib { color: var(--rf-gray-500); }
.rb-item[data-unknown] { color: var(--rf-text-muted-aa); font-style: italic; }
.rb-item[data-dragging] { z-index: 1; background: var(--rf-white); box-shadow: var(--rf-shadow-hover); }
.rb-items[data-sorting] .rb-item:not([data-dragging]) { transition: transform 120ms ease; }
.rb-grip { display: grid; place-items: center; flex: none; inline-size: 48px; block-size: 48px; padding: 0; border: 0; background: transparent; color: var(--rf-gray-500); cursor: grab; touch-action: none; }
/* design-l3 (L3-18) : préréglages ; pastille ronde de 32 px dans une cible de 48 px. */
.rb-presets { display: flex; flex-direction: column; gap: var(--rf-space-sm); margin-block-end: var(--rf-space-sm); }
.rb-presets ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--rf-space-sm); }
.rb-preset-row { display: flex; align-items: center; gap: 12px; }
.rb-preset-row input[type="color"] { flex: none; inline-size: 48px; block-size: 48px; padding: var(--rf-space-sm); border: 0; background: transparent; cursor: pointer; }
.rb-preset-row input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
.rb-preset-row input[type="color"]::-webkit-color-swatch { border: 1px solid var(--rf-gray-300); border-radius: 50%; }
.rb-preset-name { flex: 1 1 auto; min-inline-size: 0; display: flex; }
.rb-preset-row input[type="text"], .rb-preset-row input[type="number"] { block-size: 48px; box-sizing: border-box; padding: 0 12px; border: 1px solid var(--rf-gray-300); border-radius: var(--rf-radius-lg); font: inherit; font-size: 16px; color: var(--rf-navy-500); }
.rb-preset-name input { flex: 1 1 auto; min-inline-size: 0; }
.rb-preset-width { display: flex; align-items: center; gap: var(--rf-space-sm); font-size: 14px; color: var(--rf-gray-800); }
.rb-preset-row input[type="number"] { inline-size: 5em; }
```

- [ ] **Étape 6 : `App` — aperçu, montage `keyed`, props.** Dans `apps/web/src/ui/App.tsx` :
  1. Import de `../toolbar` (`:22`) : ajouter `type Profile` :
     `import { ANNOTATION_ROLE, annotationBarOf, resolveStartMode, visibleItems, type Profile, type StartMode, type Toolbar as Bar } from "../toolbar";`
  2. Juste après `const [panel, setPanel] = createSignal<Panel | null>(null);` (`:84`), ajouter :

```ts
  /** design-l3 (L3-3, DA-L3-3) : brouillon de l'éditeur montré par la page ; null : le profil enregistré. Rien n'est écrit :
   *  `main.ts`, le magasin et l'annotation lisent toujours le profil actif. */
  const [previewProfile, setPreviewProfile] = createSignal<Profile | null>(null);
  /** Profil montré (barres, taille, préréglages, hôte local) : le brouillon pendant l'édition, sinon le profil actif. */
  const shownProfile = (): Profile => previewProfile() ?? props.active.profile();
  /** L3-4 : vrai entre un choix fait dans le sélecteur du panneau et le montage suivant de l'éditeur (focus au sélecteur). */
  let profileFocus = false;
  const takeProfileFocus = (): boolean => {
    const f = profileFocus;
    profileFocus = false;
    return f;
  };
```

  3. Second argument de `createLocalToolbarHost` (`:294`) : `() => props.active.profile(),` → `shownProfile,` (H15 : un
     préréglage du brouillon marche dans la barre montrée).
  4. `const profile = () => props.active.profile();` (`:341`) →

```ts
  /** design-l3 (L3-3) : la page dessine le profil montré ; le mode de démarrage et l'envoi à `annotate` gardent le profil actif. */
  const profile = shownProfile;
```

  5. Remplacer le bloc `<Show when={panel() === "editor"}> … </Show>` (`:487-500`) par :

```tsx
      {/* design-l3 (L3-1, L3-4) : panneau latéral, remonté sur un brouillon neuf à chaque profil actif neuf (choix,
          import, remise à l'origine). */}
      <Show when={panel() === "editor" ? props.active.profile() : null} keyed>
        {(saved) => {
          const focus = takeProfileFocus();
          return (
            <div class="rb-popover" data-panel="profils">
              <ProfileEditor
                profile={saved}
                origin={originOf(saved, BUILTIN_PROFILES)}
                profiles={props.active.profiles}
                canRemove={() => actions.canRemove()}
                canResetCurrent={() => actions.canResetCurrent()}
                focusProfile={focus}
                preview={(draft) => setPreviewProfile(draft)}
                endPreview={() => setPreviewProfile(null)}
                save={(draft) => {
                  if (actions.save(draft)) setPanel(null);
                }}
                saveAsNew={(draft, label) => {
                  if (actions.saveAsNew(draft, label) !== null) setPanel(null);
                }}
                close={() => setPanel(null)}
                choose={(id) => {
                  profileFocus = true;
                  actions.choose(id);
                }}
                importFile={() => void actions.importFile()}
                exportProfile={(draft) => void actions.exportProfile(draft)}
                resetCurrent={() => actions.resetCurrent()}
                confirm={(m) => props.shell.confirm(m)}
              />
            </div>
          );
        }}
      </Show>
```

- [ ] **Étape 7 : retouches et ajouts d'`App.test.tsx`.**
  - `:562` : remplacer `const DOCK = '[data-edit-bar="outils"] select[data-edit="dock"]';` par

```ts
  /** design-l3 (L3-10) : vignette d'emplacement de la barre d'outils dans le panneau. */
  const dockTile = (d: string): string => `[data-edit-bar="outils"] [data-edit="dock"] [data-choice="${d}"]`;
```

  - `:576-588` (forme) : remplacer les lignes

```ts
    expect(container.querySelector('[data-edit-bar="annotation"] legend')?.textContent).toBe("Barre d'annotation");
    const box = container.querySelector<HTMLInputElement>('[data-edit-item="ann-text"] input[data-edit="shown"]')!;
    box.checked = false;
    box.dispatchEvent(new Event("change", { bubbles: true }));
```

    par

```ts
    click(container.querySelector('[data-edit="bar"] [data-choice="annotation"]'));
    expect(container.querySelector('[data-edit-bar="annotation"] h4')?.textContent).toBe("Barre d'annotation");
    click(container.querySelector('[data-edit-item="ann-text"] button[data-edit="shown"]'));
```

  - `:727-738` (fond, L3-3) : remplacer le test « éditeur : la barre ne bouge pas avant Enregistrer… » par :

```ts
  it("design-l3 L3-3 : la barre suit le brouillon en direct ; Enregistrer garde (barre à gauche, grands boutons)", () => {
    const { container, store } = renderApp();
    openEditor(container);
    click(container.querySelector(dockTile("left")));
    click(container.querySelector('[data-edit="button-size"] [data-choice="l"]'));
    const bar = () => container.querySelector<HTMLElement>('[data-toolbar="outils"]')!;
    expect(bar().dataset["dock"]).toBe("left");
    expect(bar().dataset["size"]).toBe("l");
    expect(store.hasOverride("defaut")).toBe(false);
    click(container.querySelector('button[data-edit="save"]'));
    expect(container.querySelector("[data-profile-editor]")).toBeNull();
    expect(bar().dataset["dock"]).toBe("left");
    expect(bar().dataset["size"]).toBe("l");
    expect(store.hasOverride("defaut")).toBe(true);
    expect(container.querySelector<HTMLElement>(".rb-layout")!.style.gridTemplateColumns).toBe("auto minmax(0, 1fr)");
  });

  it("design-l3 L3-3 : Fermer, Oui : la barre d'avant revient, rien n'est écrit", async () => {
    const { container, store } = renderApp();
    openEditor(container);
    click(container.querySelector(dockTile("left")));
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("left");
    vi.mocked(shell.confirm).mockClear();
    click(container.querySelector('button[data-edit="close"]'));
    expect(shell.confirm).toHaveBeenCalledWith("Abandonner les changements du profil « Par défaut » ?");
    await vi.waitFor(() => expect(container.querySelector("[data-profile-editor]")).toBeNull());
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("top");
    expect(store.hasOverride("defaut")).toBe(false);
  });
```

  - `:751-762` et `:765-776` (forme) : `change(container.querySelector(DOCK), "left");` →
    `click(container.querySelector(dockTile("left")));`
  - `:778-788` (forme) : `change(container.querySelector(DOCK), "left");` → `click(container.querySelector(dockTile("left")));`
    et `expect(container.querySelector<HTMLSelectElement>(DOCK)!.value).toBe("top");` →
    `expect(container.querySelector(dockTile("top"))?.getAttribute("aria-checked")).toBe("true");`
  - Ajouter, juste après le test « Exporter… : ProfileFiles.save(par-defaut.rbprofile, JSON du profil) » (avant la
    fermeture du describe « App — profils (C1) », `:842`) :

```ts
  it("design-l3 L3-1 : l'éditeur est un aside.rb-sheet « Profils » dans .rb-popover[data-panel=\"profils\"]", () => {
    const { container } = renderApp();
    openEditor(container);
    const sheet = container.querySelector('.rb-popover[data-panel="profils"] > aside.rb-sheet[data-profile-editor]');
    expect(sheet?.getAttribute("role")).toBe("dialog");
    expect(sheet?.getAttribute("aria-label")).toBe("Profils");
  });

  it("design-l3 H15 : un préréglage ajouté au brouillon marche dans la barre montrée", () => {
    const { container, tab } = renderApp();
    openEditor(container);
    click(container.querySelector('button[data-edit="preset-add"]'));
    expect([...container.querySelectorAll('[data-toolbar="outils"] button[data-preset]')].map((b) => b.getAttribute("data-preset"))).toEqual(["noir", "rouge", "bleu", "couleur"]);
    click(container.querySelector('[data-toolbar="outils"] button[data-preset="couleur"]'));
    expect(tab.engine["setPenStyle"]).toHaveBeenCalledWith({ color: "#000000", width: 4 });
  });

  it("design-l3 L3-4 : choisir « Simple » dans le sélecteur du panneau : éditeur remonté sur Simple, focus sur le sélecteur", async () => {
    const { container, store } = renderApp();
    openEditor(container);
    change(container.querySelector('select[data-edit="profile"]'), "simple");
    expect(store.activeId()).toBe("simple");
    expect(container.querySelector<HTMLInputElement>('input[data-edit="label"]')?.value).toBe("Simple (grands boutons)");
    await new Promise((r) => setTimeout(r, 0));
    const select = container.querySelector<HTMLSelectElement>('select[data-edit="profile"]');
    expect(document.activeElement).toBe(select);
    expect(select?.value).toBe("simple");
  });

  it("design-l3 L3-21 : Exporter du panneau écrit le brouillon ; Exporter… du menu, le profil enregistré", async () => {
    const files = fakeFiles();
    const { container } = renderApp({ files });
    openEditor(container);
    click(container.querySelector(dockTile("left")));
    click(container.querySelector('button[data-edit="export"]'));
    await vi.waitFor(() => expect(files.save).toHaveBeenCalledTimes(1));
    expect(JSON.parse(files.save.mock.calls[0]![1]).toolbars[0].dock).toBe("left");
    click(container.querySelector('button[data-edit="close"]'));
    await vi.waitFor(() => expect(container.querySelector("[data-profile-editor]")).toBeNull());
    openMenu(container);
    click(container.querySelector('[data-profile-cmd="export"]'));
    await vi.waitFor(() => expect(files.save).toHaveBeenCalledTimes(2));
    expect(JSON.parse(files.save.mock.calls[1]![1]).toolbars[0].dock).toBe("top");
  });

  it("design-l3 L3-21 : Importer du panneau : le profil importé devient actif, l'éditeur remonte dessus", async () => {
    const text = JSON.stringify({
      format: "roomboard-profile", schema: 1, id: "importe", label: "Importé", interface: { buttonSize: "l" },
      toolbars: [{ id: "outils", role: "tools", dock: "left", groups: [{ id: "g", items: [{ id: "pen", kind: "tool", tool: "pen", label: "Stylo" }, { id: "profiles", kind: "action", action: "profiles", label: "Profil" }] }] }],
    });
    const files = fakeFiles([{ name: "importe.rbprofile", text }]);
    const { container, store } = renderApp({ files });
    openEditor(container);
    click(container.querySelector('button[data-edit="import"]'));
    await vi.waitFor(() => expect(store.activeId()).toBe("importe"));
    expect(container.querySelector("[data-profile-editor]")).not.toBeNull();
    expect(container.querySelector<HTMLSelectElement>('select[data-edit="profile"]')?.value).toBe("importe");
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("left");
  });

  it("design-l3 L3-19 : Revenir à l'origine sur une copie de defaut : copie retirée, éditeur remonté, taille m", () => {
    const { container, store } = renderApp();
    openEditor(container);
    click(container.querySelector('[data-edit="button-size"] [data-choice="s"]'));
    click(container.querySelector('button[data-edit="save"]'));
    expect(store.hasOverride("defaut")).toBe(true);
    openEditor(container);
    expect(container.querySelector('[data-edit="profile-tag"]')?.textContent).toBe("Fourni, modifié");
    click(container.querySelector('button[data-edit="revert"]'));
    expect(store.hasOverride("defaut")).toBe(false);
    expect(container.querySelector('[data-edit="profile-tag"]')?.textContent).toBe("Fourni");
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-size")).toBe("m");
  });
```

- [ ] **Étape 8 : vérifier le vert (test isolé)** — première commande bornée de la section. Attendu : `code 0`, aucun
  `×` ; un `×` hors des retouches listées : arrêt et rapport (G2).

- [ ] **Étape 9 : tsc et garde des sources** —
  `cd /home/adminjd/projets/roomboard-wt/design-l3--T5/apps/web && export TMPDIR=$HOME/.cache/tmp/of61-tmp && nice -n 10 npx tsc --noEmit > "$TMPDIR/T5-tsc.log" 2>&1; echo "tsc code $?"; tail -20 "$TMPDIR/T5-tsc.log"; grep -nE "switch\s*\(|localStorage|draggable|dragstart|[0-9]+px|innerHTML" src/ui/ProfileEditor.tsx src/ui/PointerSwitch.tsx src/ui/App.tsx || echo "garde : rien"`
  Attendu : `tsc code 0`, `garde : rien`.

- [ ] **Étape 10 : suite web complète** — seconde commande bornée de la section (via `suite-vm`). Attendu : voir
  « Preuve ».

- [ ] **Étape 11 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l3--T5
git add apps/web/src/ui/ProfileEditor.tsx
git add apps/web/src/ui/ProfileEditor.test.tsx
git add apps/web/src/ui/PointerSwitch.tsx
git add apps/web/src/ui/rb.css
git add apps/web/src/ui/rb-css.test.ts
git add apps/web/src/ui/App.tsx
git add apps/web/src/ui/App.test.tsx
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(profiles): side panel profile editor with live preview, pointer sort, radio choices" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport de la tâche : nombre de tests (éditeur, App, suite web), liste des retouches faites (fichier:ligne, forme ou
fond) à citer dans la PR, ligne `Réutilisation : …`.

---

### Tâche T6 — `App` : confirmation au changement de panneau, barre flottante, menu Profil en îlot
<a id="tache-t6"></a>

**Objectif.** Fermer L3-32 côté application : ouvrir un autre panneau avec un brouillon différent du profil enregistré
demande la même question que l'éditeur (D6) ; « Non » garde le panneau ; entrer en annotation abandonne sans question.
L3-2 : tant que le panneau est ouvert, `.rb-layout[data-panneau="profils"]` pose la barre flottante en haut à gauche de
la scène, dans la place libre, sur plusieurs rangées ; une barre ancrée garde sa case. L3-22 : menu Profil en îlot,
lignes de 48 px icône + texte, profil actif marqué `check`.

**Fichiers.**
- Modifier : `apps/web/src/ui/App.tsx` (`:19` import, après `takeProfileFocus` posé par T5, `:291` `toggle`, `:397-402`
  racine `.rb-layout`, `:452` popover du menu), `apps/web/src/ui/App.test.tsx` (`:778-788`, ajouts en fin du describe
  « App — profils (C1) »), `apps/web/src/ui/ProfileMenu.tsx` (`:1-56`), `apps/web/src/ui/rb.css` (`:104`, `:171-173`),
  `apps/web/src/ui/rb-css.test.ts` (fin du describe).

**Interfaces.**
- Consomme : T1 — `sameProfile(a, b)`, `abandonQuestion(label)` ; T2 — icônes `import` ; T5 — signal `previewProfile`,
  `shownProfile()`, éditeur monté dans `.rb-popover[data-panel="profils"]`.
- Produit : `leaveEditor(go: () => void): void` (privé à `App`) ; attribut `.rb-layout[data-panneau="profils"]` (panneau
  ouvert) ; `.rb-popover[data-panel="menu-profils"]` ; `ProfileMenu` : chaque ligne `svg.rb-icon` + `span` de texte,
  `textContent` inchangé ; table `COMMAND_ICONS`.
- Réutilise : `ShellPort.confirm` (`profile-actions.ts:22`, props `shell` d'`App`) — `props.shell.confirm(message)`,
  appelé tel quel.
- Réutilise : `apps/web/src/profile-edit.ts` — `sameProfile(a: Profile, b: Profile): boolean`,
  `abandonQuestion(label: string): string` (T1), les mêmes que l'éditeur.
- Réutilise : `apps/web/src/ui/IconButton.tsx:20` (`Icon`) — appelé tel quel dans `ProfileMenu`.
- Réutilise : `rb.css:113-114` (`.rb-popover[data-panel="library"]`) — patron de popover calé et nommé, repris pour
  `data-panel="menu-profils"`.
- Rapport : `Réutilisation : appelé profile-edit.ts (sameProfile, abandonQuestion), ShellPort.confirm, Icon` ou
  `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
Test isolé :
`cd /home/adminjd/projets/roomboard-wt/design-l3--T6/apps/web && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of61-tmp && mkdir -p "$TMPDIR" && nice -n 10 npx vitest run src/ui/App.test.tsx src/ui/rb-css.test.ts src/ui/ProfileMenu.test.tsx src/ui/ProfileEditor.test.tsx src/ui/Toolbar.test.tsx --reporter=verbose > "$TMPDIR/T6-vitest.log" 2>&1; echo "code $?"; grep -E "×|FAIL |Test Files|Tests " "$TMPDIR/T6-vitest.log" | tail -40; grep -E "✓ .*(L3-32|L3-2 |L3-22)" "$TMPDIR/T6-vitest.log" | head -20`
Suite web et build (preuve) :
`cd /home/adminjd/projets/roomboard-wt/design-l3--T6 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of61-tmp && node ~/.claude/scripts/vm/suite-vm.cjs -- nice -n 10 pnpm --filter @roomboard/web test > "$TMPDIR/T6-suite-web.log" 2>&1; echo "tests code $?"; grep -E "Test Files|Tests |FAIL " "$TMPDIR/T6-suite-web.log" | tail -10; nice -n 10 pnpm --filter @roomboard/web build > "$TMPDIR/T6-build.log" 2>&1; echo "build code $?"; grep -E "✓ built|error" "$TMPDIR/T6-build.log" | tail -5`
Preuve : `tests code 0`, `build code 0`, `✓ built` ; lignes `design-l3 L3-32` (×3), `design-l3 L3-2` (×2),
`design-l3 L3-22` présentes ; `ProfileMenu.test.tsx` vert sans retouche ; aucun `FAIL `. Tests à garder verts dans la
zone : `App.test.tsx:370-410` (barres dans leur case, aucune `.rb-bar` en position absolue), `:853-942` (panneau Grille :
autre panneau sans éditeur, bascule immédiate), `ProfileMenu.test.tsx` (textes et ordre des commandes), les essais
`[data-profile=…]` (joués par T9).

**Preuve visuelle.** Pas de commande de lecture dans le profil ; la barre flottante repliée et le panneau à côté d'une
barre à droite sont mesurés au navigateur par T8 (S1, S6).

**Contraintes (recopiées).** G1 test rouge d'abord, aucun test retiré, désactivé ou sauté, aucun seuil changé · G2
retouche de forme listée : `App.test.tsx:778-788` (la question est asynchrone : une attente avant l'assertion, faux
`confirm` vrai `App.test.tsx:214`) ; `ProfileMenu.test.tsx` non retouché ; toute autre rougeur arrête la tâche · G3
aucune dépendance ajoutée · G5 aucun Rust ni CLI · G6 `nice -n 10`, `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`,
test isolé direct, suite web par `node ~/.claude/scripts/vm/suite-vm.cjs -- …` · G7 sorties dans
`$HOME/.cache/tmp/of61-tmp/T6-*` · G8 auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais
terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un, aucun push · G9 dans
`App.tsx`, `ProfileMenu.tsx` : aucun `switch (`, `localStorage`, `draggable`, aucun `\d+px`, aucun `innerHTML`,
icônes par table · G10 jetons `--rf-*` seulement, aucune règle `.rb-bar` en position absolue, cibles ≥ 48 px · G12
worktree `/home/adminjd/projets/roomboard-wt/design-l3--T6`.

**Interdits.** Ne pas toucher `ProfileEditor.tsx` ni `layout.ts` (la grille ne change pas, cadrage § 3.1) ; ne pas
rendre `toggle` asynchrone quand aucune question n'est due (les panneaux Grille, Image, Réglages s'ouvrent dans le même
tour).

**Terminé quand.** Suite web verte, build web `✓ built`, `tsc` 0 (compris dans le build), commit fait.

- [ ] **Étape 0 : préparer le worktree** —
  `cd /home/adminjd/projets/roomboard-wt/design-l3--T6 && mkdir -p $HOME/.cache/tmp/of61-tmp && (test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile > $HOME/.cache/tmp/of61-tmp/T6-install.log 2>&1) && for d in wasm wasm-formats; do test -d apps/web/src/$d || cp -r /home/adminjd/projets/roomboard-wt/design-l3/apps/web/src/$d apps/web/src/$d; done && grep -c "previewProfile" apps/web/src/ui/App.tsx`
  Attendu : un nombre ≥ 3 (T5 fusionné).

- [ ] **Étape 1 : tests (rouges).** Dans `apps/web/src/ui/App.test.tsx`, retouche de forme du test « changer de panneau
  abandonne le brouillon » (`:778-788`) — tout le test devient :

```ts
  it("changer de panneau abandonne le brouillon", async () => {
    const { container } = renderApp();
    openEditor(container);
    click(container.querySelector(dockTile("left")));
    click(container.querySelector('button[data-item="settings"]'));
    await vi.waitFor(() => expect(container.querySelector("[data-profile-editor]")).toBeNull());
    click(container.querySelector('button[data-item="settings"]'));
    openEditor(container);
    expect(container.querySelector(dockTile("top"))?.getAttribute("aria-checked")).toBe("true");
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("top");
  });
```

  En fin du describe « App — profils (C1) », ajouter :

```ts
  it("design-l3 L3-32 : brouillon modifié, Réglages : question ; Non : panneau gardé, barre à gauche ; Oui : Réglages, barre en haut", async () => {
    const { container } = renderApp();
    openEditor(container);
    click(container.querySelector(dockTile("left")));
    vi.mocked(shell.confirm).mockClear();
    vi.mocked(shell.confirm).mockResolvedValueOnce(false);
    click(container.querySelector('button[data-item="settings"]'));
    expect(shell.confirm).toHaveBeenCalledWith("Abandonner les changements du profil « Par défaut » ?");
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector("[data-profile-editor]")).not.toBeNull();
    expect(container.querySelector("#reglages")).toBeNull();
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("left");
    click(container.querySelector('button[data-item="settings"]'));
    await vi.waitFor(() => expect(container.querySelector("#reglages")).not.toBeNull());
    expect(container.querySelector("[data-profile-editor]")).toBeNull();
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("top");
  });

  it("design-l3 L3-32 : brouillon égal, Réglages : aucune question, Réglages ouverts dans le même tour", () => {
    const { container } = renderApp();
    openEditor(container);
    vi.mocked(shell.confirm).mockClear();
    click(container.querySelector('button[data-item="settings"]'));
    expect(shell.confirm).not.toHaveBeenCalled();
    expect(container.querySelector("[data-profile-editor]")).toBeNull();
    expect(container.querySelector("#reglages")).not.toBeNull();
  });

  it("design-l3 L3-32 : brouillon modifié, entrée en annotation : panneau fermé sans question ; à la sortie, la barre enregistrée", async () => {
    const a = fakeAnnotationUi();
    const { container } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    openEditor(container);
    click(container.querySelector(dockTile("left")));
    vi.mocked(shell.confirm).mockClear();
    await a.control.enter();
    expect(container.querySelector("[data-profile-editor]")).toBeNull();
    expect(shell.confirm).not.toHaveBeenCalled();
    await a.control.exit();
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("top");
  });

  it("design-l3 L3-2 : panneau ouvert : .rb-layout[data-panneau=\"profils\"] ; fermé : absent", () => {
    const { container } = renderApp();
    const layout = container.querySelector<HTMLElement>(".rb-layout")!;
    expect(layout.hasAttribute("data-panneau")).toBe(false);
    openEditor(container);
    expect(layout.getAttribute("data-panneau")).toBe("profils");
    click(container.querySelector('button[data-edit="close"]'));
    expect(layout.hasAttribute("data-panneau")).toBe(false);
  });

  it("design-l3 L3-2 : barre d'outils à droite, panneau ouvert : la barre garde sa case, le panneau est dans la scène", () => {
    const { container, store, active } = renderApp();
    store.save(setDock(BUILTIN_PROFILES[0]!, "outils", "right"));
    active.refresh();
    openEditor(container);
    const layout = container.querySelector<HTMLElement>(".rb-layout")!;
    expect(layout.style.gridTemplateColumns).toBe("minmax(0, 1fr) auto");
    const bar = container.querySelector('[data-toolbar="outils"]')!;
    const popover = container.querySelector('.rb-popover[data-panel="profils"]')!;
    expect(popover.parentElement).toBe(layout);
    expect(popover.contains(bar)).toBe(false);
    const slot = bar.closest<HTMLElement>(".rb-slot")!;
    expect(slot.style.gridArea || slot.style.getPropertyValue("grid-area")).toBe("outils");
  });

  it("design-l3 L3-22 : menu Profil en îlot : icône et texte par ligne, profil actif marqué check, textes inchangés", () => {
    const { container } = renderApp();
    openMenu(container);
    expect(container.querySelector("[data-profiles]")!.parentElement!.getAttribute("data-panel")).toBe("menu-profils");
    const rows = [...container.querySelectorAll("[data-profile-cmd]")].map((b) => [b.getAttribute("data-profile-cmd"), b.querySelector("svg")?.getAttribute("data-icon"), b.textContent]);
    expect(rows).toEqual([
      ["edit", "profile", "Modifier…"],
      ["import", "import", "Importer…"],
      ["export", "export", "Exporter…"],
      ["reset", "reset", "Remettre à zéro ce profil"],
      ["reset-all", "reset", "Tout remettre à zéro"],
    ]);
    expect(container.querySelector('[data-profile="defaut"] svg')?.getAttribute("data-icon")).toBe("check");
    expect(container.querySelector('[data-profile="simple"] svg')).toBeNull();
    expect(container.querySelector('[data-profile="defaut"]')?.textContent).toBe("Par défaut");
  });
```

  Dans `apps/web/src/ui/rb-css.test.ts`, avant la fermeture du describe principal, ajouter :

```ts
  it("design-l3 L3-2 : panneau des profils ouvert : barre flottante en haut à gauche de la scène, dans la place libre, sur plusieurs rangées", () => {
    expect(rule('.rb-layout[data-panneau="profils"] > .rb-floating')).toMatch(/justify-self: start;.*max-inline-size: calc\(100% - min\(600px, 100%\)\);/);
    expect(rule('.rb-layout[data-panneau="profils"] > .rb-floating .rb-bar')).toContain("flex-wrap: wrap;");
    expect(rule('.rb-layout[data-panneau="profils"] > .rb-floating .rb-bar')).not.toMatch(/position/);
  });
  it("design-l3 L3-22 : menu Profil en îlot (rayon xl, filet gris 300, ombre modale) ; lignes de 48 px icône + texte", () => {
    expect(rule('.rb-popover[data-panel="menu-profils"]')).toMatch(/border: 0;.*border-radius: var\(--rf-radius-xl\);.*box-shadow: 0 0 0 1px var\(--rf-gray-300\), var\(--rf-shadow-modal\);/);
    expect(rule("[data-profiles] button")).toMatch(/display: flex;.*align-items: center;.*gap: 12px;.*min-height: var\(--rb-btn-m\);.*font-size: 16px;/);
    expect(rule('[data-profiles] button[aria-checked="true"]')).toMatch(/color: var\(--rf-violet-700\);.*font-weight: 600;/);
  });
```

- [ ] **Étape 2 : vérifier le rouge** — commande bornée isolée. Attendu : `code 1` ; échecs sur `L3-32` (Réglages ouvert
  sans question), `L3-2` (`data-panneau` absent), `L3-22` (aucun `svg`), règles CSS absentes ; « changer de panneau »
  peut passer déjà (l'attente ne gêne pas) — il reste dans la liste parce qu'il rougira sans l'attente.

- [ ] **Étape 3 : `App.tsx`.**
  1. Import (`:19`) : `import { originOf } from "../profile-edit";` → `import { abandonQuestion, originOf, sameProfile } from "../profile-edit";`
  2. Juste après `takeProfileFocus` (posé par T5), ajouter :

```ts
  /** design-l3 (L3-32) : quitter l'éditeur pour un autre panneau ; brouillon différent du profil enregistré : après un Oui.
   *  Même règle et même question que l'éditeur (`sameProfile`, `abandonQuestion`) ; sans question, dans le même tour. */
  const leaveEditor = (go: () => void): void => {
    const draft = previewProfile();
    if (panel() !== "editor" || draft === null || sameProfile(draft, props.active.profile())) return go();
    void props.shell.confirm(abandonQuestion(props.active.profile().label)).then((ok) => {
      if (ok) go();
    });
  };
```

  3. Dans `createLocalToolbarHost`, remplacer `toggle: (p) => setPanel((cur) => (cur === p ? null : p)),` (`:291`) par
     `toggle: (p) => leaveEditor(() => setPanel((cur) => (cur === p ? null : p))),`
  4. Sur la racine (`:397-402`), après `data-mode={annotating() ? "annotation" : "board"}`, ajouter
     `data-panneau={panel() === "editor" ? "profils" : undefined}`.
  5. Popover du menu (`:452-453`) : `<div class="rb-popover">` qui entoure `<ProfileMenu` →
     `<div class="rb-popover" data-panel="menu-profils">`.

- [ ] **Étape 4 : `ProfileMenu.tsx`.** Remplacer tout le fichier par :

```tsx
import { For, Show, type Accessor, type JSX } from "solid-js";
import type { Profile } from "../toolbar";
import { Icon } from "./IconButton";

/** Menu Profil (CL5b-9, C1 P22 ; design-l3 L3-22) : les profils, puis les commandes, en lignes icône + texte (D-DS1).
 *  Aucun geste ici : les props les portent. */
export interface ProfileMenuProps {
  readonly profiles: Accessor<readonly Profile[]>;
  readonly activeId: Accessor<string>;
  /** Faux pour un profil livré sans copie : « Remettre à zéro ce profil » est grisé (P6). */
  readonly canResetCurrent: Accessor<boolean>;
  /** Vrai pour un profil de l'utilisateur seulement : « Supprimer » n'apparaît que là. */
  readonly canRemove: Accessor<boolean>;
  choose(id: string): void;
  edit(): void;
  importFile(): void;
  exportActive(): void;
  resetCurrent(): void;
  remove(): void;
  resetAll(): void;
}

/** design-l3 (L3-22) : icône de chaque commande (table, jamais un branchement sur le nom). */
const COMMAND_ICONS: Readonly<Record<string, string>> = Object.freeze({
  edit: "profile",
  import: "import",
  export: "export",
  reset: "reset",
  remove: "trash",
  "reset-all": "reset",
});

function Command(props: { name: string; label: string; run: () => void; disabled?: boolean }): JSX.Element {
  return (
    <button type="button" role="menuitem" data-profile-cmd={props.name} disabled={props.disabled ?? false} onClick={() => props.run()}>
      <Icon name={Object.hasOwn(COMMAND_ICONS, props.name) ? COMMAND_ICONS[props.name]! : "profile"} />
      <span>{props.label}</span>
    </button>
  );
}

export function ProfileMenu(props: ProfileMenuProps): JSX.Element {
  return (
    <div role="menu" data-profiles>
      <For each={props.profiles()}>
        {(p) => (
          <button
            type="button"
            role="menuitemradio"
            data-profile={p.id}
            aria-checked={props.activeId() === p.id}
            onClick={() => props.choose(p.id)}
          >
            <Show when={props.activeId() === p.id} fallback={<span class="rb-menu-blank" aria-hidden="true" />}>
              <Icon name="check" />
            </Show>
            <span>{p.label}</span>
          </button>
        )}
      </For>
      <span class="rb-menu-sep" role="separator" />
      <Command name="edit" label="Modifier…" run={() => props.edit()} />
      <Command name="import" label="Importer…" run={() => props.importFile()} />
      <Command name="export" label="Exporter…" run={() => props.exportActive()} />
      <Command name="reset" label="Remettre à zéro ce profil" run={() => props.resetCurrent()} disabled={!props.canResetCurrent()} />
      <Show when={props.canRemove()}>
        <Command name="remove" label="Supprimer" run={() => props.remove()} />
      </Show>
      <Command name="reset-all" label="Tout remettre à zéro" run={() => props.resetAll()} />
    </div>
  );
}
```

- [ ] **Étape 5 : `rb.css`.** Juste après la règle `.rb-floating { … }` (`:104`), ajouter :

```css
/* design-l3 (L3-2, H10, H23) : panneau des profils ouvert, la barre flottante passe en haut à gauche de la scène, dans la
   place que le panneau laisse, et ses barres passent sur plusieurs rangées. */
.rb-layout[data-panneau="profils"] > .rb-floating { justify-self: start; max-inline-size: calc(100% - min(600px, 100%)); }
.rb-layout[data-panneau="profils"] > .rb-floating .rb-bar { flex-wrap: wrap; }
```

  Remplacer les deux règles du menu (`:171-172`)

```css
[data-profiles] { display: grid; gap: 4px; padding: 4px; }
[data-profiles] button { min-height: var(--rb-btn-m); padding: 0 var(--rb-pad); text-align: start; }
```

  par :

```css
/* design-l3 (L3-22) : menu Profil en îlot, lignes de 48 px icône + texte (D-DS1), profil actif en violet 700. */
.rb-popover[data-panel="menu-profils"] { margin: var(--rf-space-sm); border: 0; border-radius: var(--rf-radius-xl); box-shadow: 0 0 0 1px var(--rf-gray-300), var(--rf-shadow-modal); }
[data-profiles] { display: grid; gap: 4px; padding: 4px; }
[data-profiles] button { display: flex; align-items: center; gap: 12px; min-height: var(--rb-btn-m); padding: 0 var(--rb-pad); border: 0; border-radius: var(--rf-radius-lg); background: transparent; color: var(--rf-navy-500); font: inherit; font-size: 16px; text-align: start; cursor: pointer; }
[data-profiles] button:not(:disabled):hover { background: var(--rf-gray-50); }
[data-profiles] button[aria-checked="true"] { color: var(--rf-violet-700); font-weight: 600; }
[data-profiles] button:disabled { color: var(--rf-text-muted-aa); cursor: default; }
[data-profiles] button:disabled .rb-icon { color: var(--rf-gray-500); }
[data-profiles] button:focus-visible { outline: 2px solid var(--rf-violet-600); outline-offset: -2px; }
.rb-menu-blank { flex: none; inline-size: var(--rb-icon); }
```

- [ ] **Étape 6 : vérifier le vert (isolé)** — première commande bornée. Attendu : `code 0`.

- [ ] **Étape 7 : suite web et build** — seconde commande bornée. Attendu : voir « Preuve ».

- [ ] **Étape 8 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l3--T6
git add apps/web/src/ui/App.tsx
git add apps/web/src/ui/App.test.tsx
git add apps/web/src/ui/ProfileMenu.tsx
git add apps/web/src/ui/rb.css
git add apps/web/src/ui/rb-css.test.ts
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(profiles): confirm draft abandon on panel switch, floating bar beside the panel, profile menu island" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport de la tâche : nombre de tests, retouche `App.test.tsx:778-788` citée pour la PR, ligne `Réutilisation : …`.

---

### Tâche T7 — Essai C1 retouché et fiches de coque
<a id="tache-t7"></a>

**Objectif.** Rendre l'essai `c1-profils-navigateur.mjs` au nouveau panneau (L3-26) : retouches de forme
(`:133-136`) et un changement de fond voulu (`:140-143`, aperçu en direct, L3-3) ; le reste de l'essai (enregistrer,
recharger, exporter, tout remettre à zéro, réimporter, S2, S5) inchangé. Ajouter aux fiches de coque (cadrage § 3.3) le
geste de tri au doigt et la barre en direct.

**Fichiers.**
- Modifier : `scripts/essais/c1-profils-navigateur.mjs` (`:133-136`, `:140-143`), `docs/essais/coque-windows.md`
  (`:84`, après `:89`), `docs/essais/coque-macos.md` (`:92`, après `:97`).

**Interfaces.**
- Consomme (T5, T6) : `[data-edit-bar="outils"] [data-edit="dock"] [data-choice="left"]`,
  `[data-edit="button-size"] [data-choice="l"]`, `[data-edit-item="<id>"] button[data-edit="shown"]` ;
  `button[data-edit="close"]`, `[data-edit-item="laser"][data-unknown]`, `[data-profile-editor]` (inchangés).
- Produit : `C1 : OK` sur la nouvelle interface ; lignes `C1-7` des deux fiches.
- Réutilise : `scripts/essais/commun.mjs` (`serve`, `loadPlaywright`, `item`, `noOverlap`, `VIEWPORT`) — appelés tels
  quels (aucune aide neuve dans l'essai C1).
- Rapport : `Réutilisation : appelé commun.mjs` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/design-l3--T7 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of61-tmp && mkdir -p "$TMPDIR" && nice -n 10 node scripts/essais/c1-profils-navigateur.mjs > "$TMPDIR/T7-c1.log" 2>&1; echo "code $?"; grep -E "^ok|ÉCHEC|: OK|outil absent" "$TMPDIR/T7-c1.log" | tail -40`
Preuve : avant retouche `code 1` et `C1 : ÉCHEC` (sélecteur `select[data-edit="dock"]` absent) ; après, `code 0`,
`C1 : OK`, ligne `ok — aperçu : la barre est à gauche, en l, sans gomme, avant tout enregistrement` présente, et les
lignes inchangées `ok — enregistré : barre d'outils à gauche, grands boutons`, `ok — rechargé : cm1 actif`,
`ok — 1.2 : l'élément inconnu est grisé dans l'éditeur`. Tests à garder verts : `c1-profils-navigateur.mjs:56-78`
(menu, `[data-profile=…]`), `:103-117` (`allVisible`), `:207-210`.

**Preuve visuelle.** Aucune capture ici (T9) ; lecture : la ligne `ok — aperçu : …` prouve la barre en direct.

**Contraintes (recopiées).** G1 essai rouge d'abord (joué sur la nouvelle interface avant retouche), aucun essai retiré,
désactivé ou sauté, aucun seuil changé · G2 retouches listées seulement : `c1-profils-navigateur.mjs:133-136` (forme),
`:140-143` (fond voulu, L3-3) ; toute autre rougeur arrête la tâche · G6 `nice -n 10`,
`export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`, un essai à la fois, aucun `tauri build` · G7 sorties dans
`$HOME/.cache/tmp/of61-tmp/T7-*`, aucun processus laissé (Chromium, serveur) · G8 auteur
`jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un, aucun push · G12 worktree
`/home/adminjd/projets/roomboard-wt/design-l3--T7`.

**Interdits.** Aucun `--captures` commité ici ; ne pas toucher `verifier.sh` (T8).

**Terminé quand.** `C1 : OK`, fiches à jour, commit fait.

- [ ] **Étape 0 : préparer le worktree et construire l'application** —
  `cd /home/adminjd/projets/roomboard-wt/design-l3--T7 && mkdir -p $HOME/.cache/tmp/of61-tmp && (test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile > $HOME/.cache/tmp/of61-tmp/T7-install.log 2>&1) && for d in wasm wasm-formats; do test -d apps/web/src/$d || cp -r /home/adminjd/projets/roomboard-wt/design-l3/apps/web/src/$d apps/web/src/$d; done && nice -n 10 pnpm --filter @roomboard/web build > $HOME/.cache/tmp/of61-tmp/T7-build.log 2>&1; echo "build code $?"; ls apps/web/dist/index.html`
  Attendu : `build code 0`, `apps/web/dist/index.html`.

- [ ] **Étape 1 : rouge** — commande bornée de la section. Attendu : `code 1`, `C1 : ÉCHEC` à l'étape 2 de l'essai
  (attente de `select[data-edit="dock"]`).

- [ ] **Étape 2 : retouches de l'essai.** Dans `scripts/essais/c1-profils-navigateur.mjs`, remplacer `:133-136` :

```js
  await page.selectOption(`${BAR} select[data-edit="dock"]`, "left");
  await page.selectOption('select[data-edit="button-size"]', "l");
  await page.uncheck('[data-edit-item="eraser"] input[data-edit="shown"]');
  check(await page.isDisabled('[data-edit-item="profiles"] input[data-edit="shown"]'), "éditeur : la case « montrer » de Profil est grisée");
```

  par (forme, L3-26 : vignette, segment, œil) :

```js
  await page.click(`${BAR} [data-edit="dock"] [data-choice="left"]`);
  await page.click('[data-edit="button-size"] [data-choice="l"]');
  await page.click('[data-edit-item="eraser"] button[data-edit="shown"]');
  check(await page.isDisabled('[data-edit-item="profiles"] button[data-edit="shown"]'), "éditeur : l'œil de Profil est grisé");
```

  et remplacer `:140-143` :

```js
  check(
    (await count(`${OUTILS}[data-dock="top"][data-size="m"]`)) === 1 && (await count(item("eraser"))) === 1,
    "rien d'enregistré : la barre est toujours en haut, en taille m, avec la gomme",
  );
```

  par (fond voulu, L3-3) :

```js
  await waitFor(`${OUTILS}[data-dock="left"][data-size="l"]`);
  check(
    (await count(`${OUTILS}[data-dock="left"][data-size="l"]`)) === 1 && (await count(item("eraser"))) === 0,
    "aperçu : la barre est à gauche, en l, sans gomme, avant tout enregistrement",
  );
```

- [ ] **Étape 3 : vert** — commande bornée. Attendu : voir « Preuve ». Une autre ligne en échec : arrêt et rapport.

- [ ] **Étape 4 : fiches de coque.** Dans `docs/essais/coque-windows.md`, ligne `C1-1` (`:84`), remplacer l'attendu
  `la barre passe à gauche en grands boutons ; le menu Profil montre « CM1 » coché` par
  `la barre passe à gauche en grands boutons **dès le choix, avant tout enregistrement** (aperçu en direct, panneau à droite) ; le menu Profil montre « CM1 » coché`.
  Après la ligne `C1-6` (`:89`), ajouter :

```markdown
| C1-7 | Profil → Modifier… : tirer au doigt (écran tactile) la poignée d'un outil de la liste, vers le haut, puis la lâcher ; recommencer à la souris | la ligne suit le doigt, les autres s'écartent ; au lâcher la barre change ; la scène ne reçoit aucun trait ni dépôt (U24 : glisser-déposer natif de la coque) ; un toucher de la poignée sans glisser fait paraître « Monter » et « Descendre » sur cette ligne |
```

  Dans `docs/essais/coque-macos.md`, ligne `C1-1` (`:92`), même ajout `**dès le choix, avant tout enregistrement**
  (aperçu en direct, panneau à droite)` après `la barre passe à gauche en grands boutons`, puis après `C1-6` (`:97`) :

```markdown
| C1-7 | Profil → Modifier… : tirer la poignée d'un outil de la liste au trackpad, vers le haut, puis la lâcher ; recommencer à la souris | la ligne suit le pointeur, les autres s'écartent ; au lâcher la barre change ; la scène ne reçoit aucun trait ni dépôt (U24 : glisser-déposer natif de la coque) ; un clic de la poignée sans glisser fait paraître « Monter » et « Descendre » sur cette ligne |
```

  Contrôle : `grep -c "C1-7" /home/adminjd/projets/roomboard-wt/design-l3--T7/docs/essais/coque-windows.md /home/adminjd/projets/roomboard-wt/design-l3--T7/docs/essais/coque-macos.md`
  → `…coque-windows.md:1`, `…coque-macos.md:1`.

- [ ] **Étape 5 : aucun processus restant** —
  `pgrep -fa "navigateur.mjs|chrome-headless|ms-playwright" | grep -v pgrep || echo "aucun processus"`.

- [ ] **Étape 6 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l3--T7
git add scripts/essais/c1-profils-navigateur.mjs
git add docs/essais/coque-windows.md
git add docs/essais/coque-macos.md
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "test(c1): profile panel selectors and live preview; shell checklists gain touch sort gesture" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport de la tâche : sortie de l'essai avant et après, retouches citées pour la PR (`c1-profils-navigateur.mjs:133-136`
forme, `:140-143` fond), geste C1-7 à rejouer sur PC et Mac, ligne `Réutilisation : …`.

---

### Tâche T8 — Essai `design-l3` au navigateur, branché dans `verifier.sh --e2e`
<a id="tache-t8"></a>

**Objectif.** Essai Playwright neuf `scripts/essais/design-l3-navigateur.mjs` (L3-27) qui joue S1, S2, S3, S4, S6 et
mesure la netteté de S5 (L3-28), avec `--captures` (recadrages pour T9) et `--dist <dossier> --nom avant` ; branché dans
le bloc `--e2e` de `scripts/verifier.sh` et contrôlé par `scripts/tests/verifier-e2e.test.sh` (ligne à part, comme
design L4). Rouge prouvé sur le build « avant » (`main` @ dbb2473), laissé dans `$HOME/.cache/tmp/of61-design-l3-avant`
pour T9 (D11).

**Fichiers.**
- Créer : `scripts/essais/design-l3-navigateur.mjs`
- Modifier : `scripts/verifier.sh` (`:144-145`, après `echo "design L4 : OK"`), `scripts/tests/verifier-e2e.test.sh`
  (après la ligne design L4)

**Interfaces.**
- Consomme (T5, T6) : `.rb-popover[data-panel="profils"]`, `[data-profile-editor]`, `[data-sheet-body]`,
  `.rb-sheet-head h2`, `.rb-sheet-foot`, groupes `[data-edit="dock|button-size|bar|start-mode"] [data-choice]`,
  `[data-edit-item]`, `button[data-edit="grip|shown|up|down|close|save|save-new|export|import|revert|add|preset-add"]`,
  `[data-add-choice]`, `[data-edit="announce"]`, `[data-edit="annotation-note"]`, `.rb-item-label`, `.rb-radio-label`,
  `.rb-radio-chk`, `select[data-edit="profile"]`, `input[data-edit="label|new-name"]`, `.rb-floating`,
  `.rb-layout[data-panneau="profils"]`, `[data-profile-cmd="edit"]` ; faux hôte `?annotation=faux`
  (`body.dataset.annotation`, `annotationBande`).
- Produit : `node scripts/essais/design-l3-navigateur.mjs [--captures] [--dist <dossier> --nom avant]` (code 0, 1, 2 ;
  `design L3 : OK`) ; avec `--captures` : `docs/essais/design-l3-<nom>-panneau.png`, et pour l'après
  `design-l3-apres-{entete,cartes,vignettes,liste,pied}.png` et `design-l3-maquette-{entete,cartes,vignettes,liste,pied}.png`.
- Réutilise : `scripts/essais/commun.mjs` (`serve`, `loadPlaywright`, `item`, `noOverlap`, `VIEWPORT`) — appelés tels
  quels, avec `frames`, `gitSha`, `ROOT`, `DIST`, `Echec`.
- Réutilise : `scripts/essais/nettete.mjs` (`pixelsOf`, `edgeRow`, `fringes`, `hex`) — appelés tels quels ;
  `scripts/tests/nettete.test.mjs` inchangé.
- Rapport : `Réutilisation : appelé commun.mjs, nettete.mjs` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/design-l3--T8 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of61-tmp && mkdir -p "$TMPDIR" && nice -n 10 node scripts/essais/design-l3-navigateur.mjs > "$TMPDIR/T8-design-l3.log" 2>&1; echo "code $?"; grep -E "^ok|ÉCHEC|: OK|rangée|contre-épreuve|outil absent" "$TMPDIR/T8-design-l3.log" | tail -80`
Preuve : `code 0`, `design L3 : OK` ; lignes `S1 :` (≥ 8), `S2 souris`, `S2 doigt`, `S2 Échap`, `S2 Flèche haut`,
`S3 Fermer`, `S3 Réglages`, `S3 sélecteur`, `S3 annotation`, `S4 :` (≥ 5), `S5 :` avec `0 pixel intermédiaire` (×3 :
Rectangle, `dock-top` non choisie, choisie) et `0 frange` (×7), `contre-épreuve … (≥ 2)`, `S6 :` (≥ 4). Puis
`bash scripts/tests/verifier-e2e.test.sh` → `verifier-e2e.test.sh : OK`, et `node --test scripts/tests/nettete.test.mjs`
vert (outil inchangé).

**Preuve visuelle.** Lectures d'abord, dans `$TMPDIR/T8-design-l3.log` : `rangée du Rectangle (gris, 2x)` (attendu
`255 … 39 39 39 … 255`, deux suites de 3), `rangée de dock-top non choisie` et `choisie`, nombre d'icônes calées du
panneau, largeur du panneau (`600`), `annotationBande`. Captures : faites par T9 (`--captures`).

**Contraintes (recopiées).** G1 essai rouge d'abord (sur le build « avant »), aucun essai retiré, désactivé ou sauté,
aucun seuil changé · G2 aucun autre essai retouché · G5 aucun Rust ni CLI · G6 `nice -n 10`,
`export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`, essais un par un, aucun `tauri build` · G7 sorties dans
`$HOME/.cache/tmp/of61-tmp/T8-*`, build « avant » dans `$HOME/.cache/tmp/of61-design-l3-avant`, aucun processus laissé ·
G8 auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un, aucun push · G11 netteté : 0 pixel
intermédiaire, 0 frange · `verifier.sh --e2e` ne passe jamais `--captures` · G12 worktree
`/home/adminjd/projets/roomboard-wt/design-l3--T8`.

**Interdits.** Ne pas modifier `commun.mjs` ni `nettete.mjs` ; aucune capture commitée ici ; ne pas retirer le worktree
« avant » (T9 le réutilise et le retire) ; `git worktree remove --force` interdit.

**Terminé quand.** Rouge sur « avant », `design L3 : OK` sur l'après, `verifier-e2e.test.sh : OK`, commit fait.

- [ ] **Étape 0 : préparer le worktree et construire l'application** —
  `cd /home/adminjd/projets/roomboard-wt/design-l3--T8 && mkdir -p $HOME/.cache/tmp/of61-tmp && (test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile > $HOME/.cache/tmp/of61-tmp/T8-install.log 2>&1) && for d in wasm wasm-formats; do test -d apps/web/src/$d || cp -r /home/adminjd/projets/roomboard-wt/design-l3/apps/web/src/$d apps/web/src/$d; done && nice -n 10 pnpm --filter @roomboard/web build > $HOME/.cache/tmp/of61-tmp/T8-build.log 2>&1; echo "build code $?"; ls apps/web/dist/index.html`

- [ ] **Étape 1 : test du branchement (rouge).** Dans `scripts/tests/verifier-e2e.test.sh`, après les deux lignes
  « design L4 : ligne à part… » / `grep -q "scripts/essais/design-l4-navigateur.mjs" …`, ajouter :

```bash
# design L3 : ligne à part, comme design L4.
grep -q "scripts/essais/design-l3-navigateur.mjs" scripts/verifier.sh || ko "design-l3-navigateur absent de verifier.sh"
```

  `cd /home/adminjd/projets/roomboard-wt/design-l3--T8 && bash scripts/tests/verifier-e2e.test.sh; echo "code $?"`
  Attendu : `ECHEC : design-l3-navigateur absent de verifier.sh`, `code 1`.

- [ ] **Étape 2 : écrire l'essai.** Créer `scripts/essais/design-l3-navigateur.mjs` :

```js
#!/usr/bin/env node
// Essai design L3 au navigateur (docs/plans/design-l3-cadrage.md, L3-27, L3-28 ; S1 à S6) : éditeur de profils en
// panneau latéral de 600 px, barre en direct, export et import depuis le panneau, « Revenir à l'origine », tri au
// pointeur (souris, doigt), au clic et au clavier, abandon confirmé, barre d'annotation et catalogue selon la barre,
// petit écran et barre flottante, netteté du § 10 du cadrage design dans le panneau (calage, bords sans demi-teinte,
// franges, contre-épreuve). Faux hôte `?annotation=faux`, `?fichiers=repli`. Chromium de Playwright,
// --disable-lcd-text, --force-color-profile=srgb. Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Joué par scripts/verifier.sh --e2e, jamais avec --captures.
// Usage : node scripts/essais/design-l3-navigateur.mjs [--captures] [--dist <dossier> --nom avant]
//   --captures : docs/essais/design-l3-<nom>-panneau.png (panneau entier, 2x) ; pour l'après, les recadrages
//                design-l3-apres-{entete,cartes,vignettes,liste,pied}.png et ceux de la maquette 03
//                (design-l3-maquette-…png) ; --dist : sert un autre build ; --nom avant : captures seules.
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DIST, Echec, ROOT, VIEWPORT, frames, gitSha, item, loadPlaywright, noOverlap, serve } from "./commun.mjs";
import { edgeRow, fringes, hex, pixelsOf } from "./nettete.mjs";

const LABEL = "design L3";
const VIEW = { width: 1920, height: 1080 };
const SMALL = { width: 1024, height: 768 };
const NARROW = { width: 560, height: 700 };
const ARGS = ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"];
const PANEL = '.rb-popover[data-panel="profils"]';
const EDITOR = "[data-profile-editor]";
const BODY = "[data-sheet-body]";
const OUTILS = '[data-toolbar="outils"]';
const QUESTION = "Abandonner les changements du profil « Par défaut » ?";
const tile = (d, bar = "outils") => `[data-edit-bar="${bar}"] [data-edit="dock"] [data-choice="${d}"]`;
const seg = (s) => `[data-edit="button-size"] [data-choice="${s}"]`;
const row = (id) => `[data-edit-item="${id}"]`;
const grip = (id) => `${row(id)} button[data-edit="grip"]`;
const eye = (id) => `${row(id)} button[data-edit="shown"]`;
const WHITE = hex("#ffffff");
const NAVY = hex("#182946");
const GRAY_800 = hex("#333333");
const GRAY_500 = hex("#888888");
const GRAY_100 = hex("#FAFAFE");
const VIOLET_100 = hex("#EDE8FD");
const VIOLET_600 = hex("#6044EB");
const VIOLET_700 = hex("#4F35C4");
const MAQUETTE = join(ROOT, "docs", "design", "maquettes", "03-profils");
/** Barre d'annotation de `defaut`, dans l'ordre (apps/web/src/toolbar-profiles.ts, `defaultAnnotationBar`). */
const ANNOTATION_ORDER = ["annotation-pointer", "ann-sep-1", "ann-pen", "ann-eraser", "ann-eraser-mode", "ann-arrow", "ann-rect", "ann-text", "ann-sep-2", "ann-undo", "annotation-freeze", "annotation-screen", "ann-sep-3", "depot-annotation", "annotation-send", "annotation-send-new", "ann-sep-4", "ann-desktop-annotation"];
const KEYS = ["format", "schema", "minor", "id", "label", "basedOn", "interface", "toolbars", "presets", "behavior"];
/** Zones comparées à la maquette 03 : sélecteurs de l'application, puis de la maquette (union des boîtes). */
const ZONES = {
  entete: { app: [".rb-sheet-head", '[data-edit-section="profile"]'], maquette: [".sheet .head", ".sheet .body > section:nth-of-type(1)"] },
  cartes: { app: ['[data-edit="start-mode"]', '[data-edit-section="general"] .rb-note'], maquette: [".choices", ".sheet .body > section:nth-of-type(2) .note"] },
  vignettes: { app: ['[data-edit="button-size"]', '[data-edit-bar="outils"] [data-edit="dock"]'], maquette: [".docks", ".segs"] },
  liste: { app: ['[data-edit-bar="outils"] li[data-edit-item]:nth-child(1)', '[data-edit-bar="outils"] li[data-edit-item]:nth-child(7)'], maquette: [".items"] },
  pied: { app: [".rb-sheet-foot"], maquette: [".foot"] },
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
  const w = { errors: [], dialogs: [], answer: "accept" };
  page.on("pageerror", (e) => w.errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") w.errors.push(m.text());
  });
  page.on("dialog", async (d) => {
    w.dialogs.push({ type: d.type(), message: d.message() });
    if (w.answer === "dismiss") await d.dismiss();
    else await d.accept();
  });
  return w;
}
const noErrors = (w, label) => check(w.errors.length === 0, `${label} : aucune erreur dans la page${w.errors.length ? ` : ${w.errors.join(" | ")}` : ""}`);
async function waitDialog(w, from) {
  for (let i = 0; i < 200; i++) {
    const d = w.dialogs.slice(from).find((x) => x.type === "confirm");
    if (d) return d;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Echec("question « confirm » attendue, aucune reçue");
}
async function ready(page) {
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await frames(page);
}
async function waitFor(page, sel, state = "attached") {
  await page.waitForSelector(sel, { state, timeout: 15000 });
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
async function chooseProfile(page, id) {
  await page.click(item("profiles"));
  await waitFor(page, "[data-profiles]");
  await page.click(`[data-profile="${id}"]`);
  await frames(page);
}
async function activeProfile(page) {
  await page.click(item("profiles"));
  await waitFor(page, "[data-profiles]");
  const id = await page.getAttribute('[data-profile][aria-checked="true"]', "data-profile");
  await page.click(item("profiles"));
  await waitFor(page, "[data-profiles]", "detached");
  return id;
}
async function box(page, sel) {
  const b = await page.locator(sel).first().boundingBox();
  if (!b) throw new Echec(`boîte absente : ${sel}`);
  return b;
}
async function unionBox(page, sels) {
  const bs = [];
  for (const s of sels) bs.push(await box(page, s));
  const x = Math.min(...bs.map((b) => b.x));
  const y = Math.min(...bs.map((b) => b.y));
  return { x, y, width: Math.max(...bs.map((b) => b.x + b.width)) - x, height: Math.max(...bs.map((b) => b.y + b.height)) - y };
}
const inside = (b, vp) => b.x >= -0.5 && b.y >= -0.5 && b.x + b.width <= vp.width + 0.5 && b.y + b.height <= vp.height + 0.5;
const apart = (a, b) => a.x + a.width <= b.x + 0.5 || b.x + b.width <= a.x + 0.5 || a.y + a.height <= b.y + 0.5 || b.y + b.height <= a.y + 0.5;
const barOrder = (page) => page.$$eval(`${OUTILS} button[data-item]`, (bs) => bs.map((b) => b.dataset.item));
const rowOrder = (page, bar = "outils") => page.$$eval(`[data-edit-bar="${bar}"] li[data-edit-item]`, (ls) => ls.map((l) => l.getAttribute("data-edit-item")));
const buttonsOf = (page, sel) =>
  page.locator(`${sel} button`).evaluateAll((bs) => bs.map((b) => {
    const r = b.getBoundingClientRect();
    return { id: b.dataset.item ?? b.dataset.preset ?? b.textContent, x: r.x, y: r.y, width: r.width, height: r.height };
  }));
/** Zone de capture en px CSS entiers, élargie au pixel entier qui contient la boîte. */
const clipOf = (b) => {
  const x = Math.floor(b.x);
  const y = Math.floor(b.y);
  return { x, y, width: Math.ceil(b.x + b.width) - x, height: Math.ceil(b.y + b.height) - y };
};
async function iconPixels(page, sel) {
  await page.locator(sel).first().scrollIntoViewIfNeeded();
  await frames(page);
  return pixelsOf(page, await box(page, `${sel} svg.rb-icon`));
}
async function textPixels(page, sel) {
  await page.locator(sel).first().scrollIntoViewIfNeeded();
  await frames(page);
  return pixelsOf(page, clipOf(await box(page, sel)));
}
/** Rangée du milieu (y = 24 à 2x) d'une icône à droites pures : 0 pixel intermédiaire, deux traits de 3 pixels. */
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

/** S1 : S1 de l'usage, barre à droite et grands boutons en direct ; export, import sur un autre appareil, origine. */
async function s1(browser, base, tmp) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, acceptDownloads: true });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  await openEditor(page);
  const panel = await box(page, PANEL);
  const stage = await box(page, "#stage");
  check(Math.abs(panel.width - 600) < 0.5 && Math.abs(panel.x + panel.width - VIEWPORT.width) < 0.5 && stage.x < panel.x, `S1 : panneau à droite, ${panel.width} px de large, scène visible à sa gauche`);
  await page.click(tile("right"));
  await waitFor(page, `${OUTILS}[data-dock="right"]`);
  const bar = await box(page, OUTILS);
  check(inside(bar, VIEWPORT) && (await noOverlap(page, OUTILS, PANEL)).apart && (await noOverlap(page, OUTILS)).apart, "S1 : « À droite » avant tout enregistrement : barre d'outils à droite, entière, hors du panneau et de la scène");
  await page.click(seg("l"));
  await waitFor(page, `${OUTILS}[data-size="l"]`);
  check((await page.locator(`${OUTILS}[data-dock="right"][data-size="l"]`).count()) === 1, "S1 : « Grands · 64 » : data-size=\"l\" en direct");
  await page.click(eye("eraser"));
  await waitFor(page, item("eraser"), "detached");
  check((await page.locator(item("eraser")).count()) === 0, "S1 : œil de la gomme : la gomme quitte la barre en direct");
  await page.click('button[data-edit="preset-add"]');
  await page.click('button[data-edit="preset-add"]');
  check((await page.locator("[data-edit-preset]").count()) === 5, "S1 : deux couleurs ajoutées (cinq préréglages)");
  await page.fill('input[data-edit="new-name"]', "CM1");
  await page.click('button[data-edit="save-new"]');
  await waitFor(page, EDITOR, "detached");
  await page.reload();
  await ready(page);
  check(
    (await page.locator(`${OUTILS}[data-dock="right"][data-size="l"]`).count()) === 1 && (await page.locator(item("eraser")).count()) === 0 && (await page.locator(`${OUTILS} button[data-preset]`).count()) === 5,
    "S1 : rechargé : barre à droite, en l, sans gomme, cinq data-preset",
  );
  check((await activeProfile(page)) === "cm1", "S1 : rechargé : cm1 actif");
  await openEditor(page);
  const dl = page.waitForEvent("download");
  await page.click('button[data-edit="export"]');
  const download = await dl;
  const file = join(tmp, "cm1.rbprofile");
  await download.saveAs(file);
  const json = JSON.parse(await readFile(file, "utf8"));
  const keys = Object.keys(json);
  check(download.suggestedFilename() === "cm1.rbprofile" && keys.length === KEYS.length && KEYS.every((k) => keys.includes(k)) && json.minor === 1 && json.basedOn === "defaut", `S1 : export du panneau : cm1.rbprofile, clés ${keys.join(", ")}, minor 1, basedOn defaut`);
  await closeEditor(page);
  noErrors(w, "S1");
  await ctx.close();

  const other = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const p2 = await other.newPage();
  const w2 = watch(p2);
  await p2.goto(`${base}/?fichiers=repli`);
  await ready(p2);
  await openEditor(p2);
  const chooser = p2.waitForEvent("filechooser");
  await p2.click('button[data-edit="import"]');
  await (await chooser).setFiles(file);
  await waitFor(p2, `${OUTILS}[data-dock="right"][data-size="l"]`);
  check((await p2.locator(item("eraser")).count()) === 0 && (await p2.inputValue('select[data-edit="profile"]')) === "cm1" && (await p2.locator(EDITOR).count()) === 1, "S1 : autre appareil, Importer du panneau : barre à droite, en grand, sans gomme, éditeur sur cm1");
  await p2.click('button[data-edit="revert"]');
  await waitFor(p2, `${OUTILS}[data-dock="top"][data-size="m"]`);
  check((await p2.locator(item("eraser")).count()) === 1 && (await p2.inputValue('input[data-edit="label"]')) === "CM1", "S1 : « Revenir à l'origine » : barre en haut, m, gomme revenue, nom « CM1 » gardé");
  noErrors(w2, "S1 autre appareil");
  await other.close();
}

async function mouseDrag(page, id, targetY) {
  const g = await box(page, grip(id));
  const x = g.x + g.width / 2;
  let y = g.y + g.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  while (y - 8 > targetY) {
    y -= 8;
    await page.mouse.move(x, y);
  }
  await page.mouse.move(x, targetY);
}
async function touchDrag(page, cdp, id, targetY) {
  const g = await box(page, grip(id));
  const x = Math.round(g.x + g.width / 2);
  let y = Math.round(g.y + g.height / 2);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  while (y - 8 > targetY) {
    y -= 8;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: Math.round(targetY) }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

/** S2 : tri au pointeur (souris, doigt), Échap, clic de la poignée, clavier. */
async function s2(browser, base) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  const w = watch(page);
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  await openEditor(page);
  const toList = async () => {
    await page.locator('[data-edit-bar="outils"] .rb-items').evaluate((l) => l.scrollIntoView({ block: "center" }));
    await frames(page);
  };
  await toList();
  const pen = await box(page, row("pen"));
  await mouseDrag(page, "text", pen.y + 4);
  await frames(page);
  const during = (await barOrder(page))[0];
  const moving = await page.locator(row("text")).evaluate((r) => r.style.transform);
  await page.mouse.up();
  await frames(page);
  const after = (await barOrder(page))[0];
  check(during === "pen" && moving.startsWith("translateY(-") && after === "text", `S2 souris : pendant le geste la barre ne change pas (${during}), la ligne suit (${moving}) ; au lâcher le premier bouton est ${after}`);
  check((await page.locator('button[data-edit="up"]').count()) === 0, "S2 souris : le clic qui suit le glisser ne dévoile rien");
  await toList();
  const head = await box(page, row("text"));
  await touchDrag(page, cdp, "rect", head.y + 4);
  await frames(page);
  const first = (await barOrder(page))[0];
  check(first === "rect", `S2 doigt : Rectangle tiré au doigt jusqu'en tête (premier bouton : ${first})`);
  await toList();
  const before = await rowOrder(page);
  const el = await box(page, grip("ellipse"));
  await page.mouse.move(el.x + el.width / 2, el.y + el.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 5; i++) await page.mouse.move(el.x + el.width / 2, el.y + el.height / 2 - 8 * i);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await frames(page);
  const shifted = await page.$$eval('[data-edit-bar="outils"] li[data-edit-item]', (ls) => ls.filter((l) => l.style.transform !== "").length);
  check(JSON.stringify(await rowOrder(page)) === JSON.stringify(before) && shifted === 0 && (await page.locator('button[data-edit="up"]').count()) === 0, "S2 Échap pendant un geste : rien ne bouge, aucune ligne décalée, rien de dévoilé");
  await page.click(grip("text"));
  const revealed = await page.$$eval('button[data-edit="up"]', (bs) => bs.map((b) => b.closest("[data-edit-item]").getAttribute("data-edit-item")));
  check(JSON.stringify(revealed) === '["text"]', `S2 clic de la poignée de Texte : « Monter » et « Descendre » sur sa ligne seulement (${revealed})`);
  await page.click(`${row("text")} button[data-edit="down"]`);
  await frames(page);
  const order = await rowOrder(page);
  const n = order.indexOf("text") + 1;
  const said = ((await page.textContent('[data-edit="announce"]')) ?? "").trim();
  check(said === `Texte : rang ${n} sur ${order.length}`, `S2 Descendre : annonce « ${said} »`);
  await page.focus(grip("text"));
  await page.keyboard.press("ArrowUp");
  await frames(page);
  const focus = await page.evaluate(() => {
    const a = document.activeElement;
    return a ? `${a.closest("[data-edit-item]")?.getAttribute("data-edit-item")}/${a.getAttribute("data-edit")}` : "";
  });
  check(focus === "text/grip" && (await rowOrder(page)).indexOf("text") === n - 2, `S2 Flèche haut : un cran, focus gardé sur la poignée (${focus})`);
  check((await page.locator(`${EDITOR} [draggable="true"]`).count()) === 0, "S2 : aucun élément draggable dans le panneau");
  const d0 = w.dialogs.length;
  await closeEditor(page);
  check(w.dialogs.slice(d0).some((x) => x.message === QUESTION), "S2 : Fermer le brouillon trié pose la question");
  noErrors(w, "S2");
  await ctx.close();
}

/** S3 : aperçu abandonné, avec confirmation ; entrée en annotation sans question. */
async function s3(browser, base) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  await openEditor(page);
  await page.click(tile("left"));
  await waitFor(page, `${OUTILS}[data-dock="left"]`);
  w.answer = "dismiss";
  const d0 = w.dialogs.length;
  await page.click('button[data-edit="close"]');
  const q1 = await waitDialog(w, d0);
  await frames(page);
  check(q1.message === QUESTION && (await page.locator(EDITOR).count()) === 1 && (await page.locator(`${OUTILS}[data-dock="left"]`).count()) === 1, `S3 Fermer : « ${q1.message} » ; Annuler : panneau ouvert, barre toujours à gauche`);
  w.answer = "accept";
  await closeEditor(page);
  check((await page.locator(`${OUTILS}[data-dock="top"]`).count()) === 1, "S3 Fermer, Oui : barre en haut");
  await openEditor(page);
  await page.click(tile("left"));
  await waitFor(page, `${OUTILS}[data-dock="left"]`);
  const d1 = w.dialogs.length;
  await page.click(item("settings"));
  const q2 = await waitDialog(w, d1);
  await waitFor(page, "#reglages");
  check(q2.message === QUESTION && (await page.locator(EDITOR).count()) === 0 && (await page.locator(`${OUTILS}[data-dock="top"]`).count()) === 1, "S3 Réglages : même question ; Oui : Réglages ouverts, barre en haut");
  await page.click(item("settings"));
  await waitFor(page, "#reglages", "detached");
  await openEditor(page);
  await page.click(tile("left"));
  await waitFor(page, `${OUTILS}[data-dock="left"]`);
  const d2 = w.dialogs.length;
  await page.selectOption('select[data-edit="profile"]', "simple");
  const q3 = await waitDialog(w, d2);
  await page.waitForFunction(() => document.querySelector('input[data-edit="label"]')?.value === "Simple (grands boutons)", null, { timeout: 15000 });
  await frames(page);
  const focused = await page.evaluate(() => document.activeElement?.matches('select[data-edit="profile"]') === true);
  check(q3.message === QUESTION && focused && (await page.inputValue('select[data-edit="profile"]')) === "simple", "S3 sélecteur : même question ; Oui : éditeur sur « Simple », focus sur le sélecteur");
  const d3 = w.dialogs.length;
  await closeEditor(page);
  check(w.dialogs.length === d3, "S3 sans changement : Fermer ne demande rien");
  noErrors(w, "S3");
  await ctx.close();

  const ann = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const p2 = await ann.newPage();
  const w2 = watch(p2);
  await p2.goto(`${base}/?fichiers=repli&annotation=faux`);
  await ready(p2);
  await openEditor(p2);
  await p2.click(tile("left"));
  await waitFor(p2, `${OUTILS}[data-dock="left"]`);
  const d4 = w2.dialogs.length;
  await p2.click(item("desktop-annotation"));
  await waitFor(p2, '.rb-layout[data-mode="annotation"]');
  await p2.waitForFunction(() => document.body.dataset.annotation === "1", null, { timeout: 15000 });
  await frames(p2);
  const h = await p2.locator('[data-toolbar="annotation"]').evaluate((e) => Math.ceil(e.getBoundingClientRect().height));
  const bande = await p2.evaluate(() => document.body.dataset.annotationBande ?? null);
  check(w2.dialogs.length === d4 && (await p2.locator(EDITOR).count()) === 0 && bande === `top:${h}`, `S3 annotation : panneau fermé sans question, la bande mesure la barre enregistrée (${bande}, attendu top:${h})`);
  await p2.click(item("ann-desktop-annotation"));
  await waitFor(p2, '.rb-layout[data-mode="board"]');
  check((await p2.locator(`${OUTILS}[data-dock="top"]`).count()) === 1, "S3 sortie de l'annotation : barre d'outils en haut, brouillon abandonné");
  noErrors(w2, "S3 annotation");
  await ann.close();
}

/** S4 : barre d'annotation, « Dessin / Souris », masquer ann-text, catalogue selon la barre. */
async function s4(browser, base) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli&annotation=faux`);
  await ready(page);
  await openEditor(page);
  await page.click('[data-edit="bar"] [data-choice="annotation"]');
  await waitFor(page, '[data-edit-bar="annotation"]');
  const ids = await rowOrder(page, "annotation");
  check(JSON.stringify(ids) === JSON.stringify(ANNOTATION_ORDER), `S4 : liste de la barre d'annotation dans l'ordre exact de la barre (${ids.length} lignes)`);
  const label = ((await page.textContent(`${row("annotation-pointer")} .rb-item-label`)) ?? "").trim();
  check(label === "Dessin / Souris" && (await page.locator(`${row("annotation-pointer")} > svg[data-icon="pen-line"]`).count()) === 1, `S4 : « ${label} » en une ligne, icône pen-line`);
  const note = ((await page.textContent('[data-edit="annotation-note"]')) ?? "").trim();
  check(note.startsWith("Montrée seulement en annotation du bureau"), `S4 : note « ${note} »`);
  await page.click(eye("ann-text"));
  await page.click('button[data-edit="save"]');
  await waitFor(page, EDITOR, "detached");
  await page.click(item("desktop-annotation"));
  await waitFor(page, '.rb-layout[data-mode="annotation"]');
  check((await page.locator('[data-toolbar="annotation"] [data-item="ann-text"]').count()) === 0, "S4 : Texte masqué : absent de la barre d'annotation");
  await page.click(item("ann-desktop-annotation"));
  await waitFor(page, '.rb-layout[data-mode="board"]');
  check((await page.locator(`${OUTILS} ${item("text")}`).count()) === 1, "S4 : Texte toujours dans la barre d'outils");
  await openEditor(page);
  await page.click('[data-edit-bar="outils"] button[data-edit="add"]');
  await waitFor(page, "[data-add-choice]");
  const tools = await page.$$eval("[data-add-choice]", (bs) => bs.map((b) => b.getAttribute("data-add-choice")));
  check(!tools.includes("action:annotation-pointer") && !tools.includes("action:annotation-send"), `S4 : « + Ajouter » de la barre d'outils : ni Souris ni Envoyer (${tools.length} entrées)`);
  await page.keyboard.press("Escape");
  await waitFor(page, "[data-add-choice]", "detached");
  await page.click('[data-edit="bar"] [data-choice="annotation"]');
  await page.click('[data-edit-bar="annotation"] button[data-edit="add"]');
  await waitFor(page, "[data-add-choice]");
  const anns = await page.$$eval("[data-add-choice]", (bs) => bs.map((b) => b.getAttribute("data-add-choice")));
  check(!anns.includes("action:file-open") && !anns.includes("action:export-pdf"), `S4 : « + Ajouter » de la barre d'annotation : ni Ouvrir ni Exporter en PDF (${anns.join(", ")})`);
  await page.keyboard.press("Escape");
  await closeEditor(page);
  noErrors(w, "S4");
  await ctx.close();
}

/** Calage : chaque svg.rb-icon visible du panneau a le viewBox calé, x et y × 2 entiers, 24 × 24. */
async function calage(page) {
  const icons = await page.$$eval(`${EDITOR} svg.rb-icon`, (els) =>
    els.filter((e) => e.getClientRects().length > 0).map((e) => {
      const r = e.getBoundingClientRect();
      return { icon: e.getAttribute("data-icon"), vb: e.getAttribute("viewBox"), x: r.x, y: r.y, w: r.width, h: r.height };
    }));
  const bad = icons.filter((b) => b.vb !== "-0.25 -0.25 24 24" || !Number.isInteger(b.x * 2) || !Number.isInteger(b.y * 2) || b.w !== 24 || b.h !== 24);
  check(icons.length >= 20 && bad.length === 0, `S5 calage : ${icons.length} icônes du panneau calées (viewBox, grille de pixels, 24 × 24)${bad.length ? `, hors grille : ${JSON.stringify(bad.slice(0, 5))}` : ""}`);
}

/** S5 : netteté § 10, 1920 × 1080 à 2x, panneau ouvert sur « Annotation au démarrage », barre à gauche. */
async function s5(browser, base) {
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  await chooseProfile(page, "annotation");
  await openEditor(page);
  await page.click(tile("left"));
  await waitFor(page, `${OUTILS}[data-dock="left"]`);
  await page.click(eye("fill"));
  await page.mouse.move(10, VIEW.height - 10);
  await page.locator(BODY).evaluate((b) => { b.scrollTop = 0; });
  await frames(page);
  await calage(page);
  const rect = await pixelsOf(page, await box(page, `${OUTILS} ${item("rect")} svg.rb-icon`));
  const bg = [rect.data[24 * rect.width * 4], rect.data[24 * rect.width * 4 + 1], rect.data[24 * rect.width * 4 + 2]];
  const r = edgeRow(rect, 24, 0, rect.width, bg, NAVY);
  console.log(`rangée du Rectangle (gris, 2x) : ${r.gray.join(" ")}`);
  check(r.intermediate === 0 && JSON.stringify(r.runs) === "[3,3]" && fringes(rect, bg, NAVY) === 0, `S5 Rectangle de la barre : 0 pixel intermédiaire, traits ${JSON.stringify(r.runs)}, 0 frange`);
  await cleanRow(page, tile("top"), WHITE, NAVY, "S5 dock-top non choisie (navy sur blanc)");
  const fr = async (sel, bgc, ink, label) => {
    const n = fringes(await textPixels(page, sel), bgc, ink);
    check(n === 0, `S5 ${label} : 0 frange (${n})`);
  };
  await fr(".rb-sheet-head h2", WHITE, NAVY, "titre « Profils »");
  await fr(`${row("pen")} .rb-item-label`, WHITE, GRAY_800, "libellé d'une ligne");
  await fr(`${seg("m")} .rb-radio-label`, WHITE, VIOLET_700, "segment choisi");
  await fr('[data-edit="start-mode"] [aria-checked="true"] .rb-radio-label', VIOLET_100, VIOLET_700, "titre de la carte choisie");
  const chk = fringes(await iconPixels(page, '[data-edit="start-mode"] .rb-radio-chk'), VIOLET_600, WHITE);
  check(chk === 0, `S5 check blanc sur la pastille violette : 0 frange (${chk})`);
  const hidden = fringes(await iconPixels(page, eye("fill")), GRAY_100, GRAY_500);
  check(hidden === 0, `S5 œil « hidden » gris sur ligne masquée : 0 frange (${hidden})`);
  await fr('button[data-edit="save"]', VIOLET_600, WHITE, "« Enregistrer » blanc sur violet");
  await page.click(tile("top"));
  await waitFor(page, `${OUTILS}[data-dock="top"]`);
  await page.mouse.move(10, VIEW.height - 10);
  await frames(page);
  await cleanRow(page, tile("top"), VIOLET_100, VIOLET_700, "S5 dock-top choisie (#4F35C4 sur #EDE8FD)");
  await counterProof(page);
  noErrors(w, "S5");
  await ctx.close();
}

/** S6 : petit écran, corps qui défile, barre flottante repliée à gauche ; fenêtre étroite. */
async function s6(browser, base) {
  const ctx = await browser.newContext({ viewport: SMALL, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  await openEditor(page);
  const panel = await box(page, PANEL);
  const head = await box(page, ".rb-sheet-head");
  const foot = await box(page, ".rb-sheet-foot");
  check(Math.abs(panel.width - 600) < 0.5 && head.y >= -0.5 && foot.y + foot.height <= SMALL.height + 0.5, `S6 1024 × 768 : panneau de ${panel.width} px, en-tête et pied visibles`);
  await page.locator(BODY).evaluate((b) => { b.scrollTop = b.scrollHeight; });
  await frames(page);
  const saveNew = await box(page, 'button[data-edit="save-new"]');
  const body = await box(page, BODY);
  check(saveNew.y >= body.y - 0.5 && saveNew.y + saveNew.height <= body.y + body.height + 0.5, "S6 : le corps défile jusqu'à « Enregistrer comme nouveau »");
  await page.locator(BODY).evaluate((b) => { b.scrollTop = 0; });
  await page.click(tile("floating"));
  await waitFor(page, `${OUTILS}[data-dock="floating"]`);
  const fl = await box(page, ".rb-floating");
  const stages = await box(page, ".rb-stages");
  const buttons = await buttonsOf(page, OUTILS);
  const rows = new Set(buttons.map((b) => Math.round(b.y))).size;
  const p2 = await box(page, PANEL);
  const bad = buttons.filter((b) => !inside(b, SMALL) || !apart(b, p2));
  check(Math.abs(fl.x - stages.x) <= 1 && Math.abs(fl.y - stages.y) <= 1, `S6 : barre flottante en haut à gauche de la scène (${fl.x}, ${fl.y})`);
  check(rows >= 2 && buttons.length > 0 && bad.length === 0, `S6 : ${buttons.length} boutons sur ${rows} rangées, chacun entier dans la fenêtre et hors du panneau${bad.length ? ` (fautifs : ${bad.map((b) => b.id).join(", ")})` : ""}`);
  await closeEditor(page);
  noErrors(w, "S6");
  await ctx.close();

  const narrow = await browser.newContext({ viewport: NARROW, deviceScaleFactor: 1 });
  const p3 = await narrow.newPage();
  const w3 = watch(p3);
  await p3.goto(`${base}/?fichiers=repli`);
  await ready(p3);
  await openEditor(p3);
  const pn = await box(p3, PANEL);
  const st = await box(p3, ".rb-stages");
  check(Math.abs(pn.width - st.width) <= 1 && Math.abs(pn.x - st.x) <= 1, `S6 560 px : le panneau couvre toute la scène (${pn.width} / ${st.width} px)`);
  check((await noOverlap(p3, OUTILS, PANEL)).apart && (await noOverlap(p3, '[data-toolbar="pages"]', PANEL)).apart, "S6 560 px : barres ancrées visibles, hors du panneau");
  await closeEditor(p3);
  noErrors(w3, "S6 étroit");
  await narrow.close();
}

/** Captures à 2x : panneau entier ; pour l'après, recadrages des zones comparées à la maquette 03. */
async function captureSet(browser, base, nom) {
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const out = (n) => join(ROOT, "docs", "essais", `design-l3-${nom}-${n}.png`);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  await chooseProfile(page, "annotation");
  await openEditor(page);
  if (nom === "avant") {
    await page.locator(EDITOR).screenshot({ path: out("panneau") });
    console.log(`capture : ${out("panneau")}`);
    await ctx.close();
    return;
  }
  await page.click(tile("left"));
  await waitFor(page, `${OUTILS}[data-dock="left"]`);
  await page.mouse.move(10, VIEW.height - 10);
  await frames(page);
  await page.locator(PANEL).screenshot({ path: out("panneau") });
  console.log(`capture : ${out("panneau")}`);
  for (const [n, z] of Object.entries(ZONES)) {
    await page.locator(z.app[0]).first().evaluate((e) => e.scrollIntoView({ block: "start" }));
    await frames(page);
    const b = await unionBox(page, z.app);
    const x = Math.max(0, Math.floor(b.x) - 16);
    const y = Math.max(0, Math.floor(b.y) - 16);
    const clip = { x, y, width: Math.min(VIEW.width - x, Math.ceil(b.width) + 32), height: Math.min(VIEW.height - y, Math.ceil(b.height) + 32) };
    await page.screenshot({ path: out(n), clip });
    console.log(`capture : ${out(n)}`);
  }
  await ctx.close();
}

/** Recadrages de docs/design/maquettes/03-profils.png (3840 × 2160) : boîtes lues dans la maquette HTML à 1x, découpées à 2x. */
async function maquetteCrops(browser) {
  const html = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
  const p1 = await html.newPage();
  await p1.goto(pathToFileURL(`${MAQUETTE}.html`).href);
  const boxes = {};
  for (const [n, z] of Object.entries(ZONES)) boxes[n] = await unionBox(p1, z.maquette);
  await html.close();
  const png = await browser.newContext({ viewport: { width: 3840, height: 2160 }, deviceScaleFactor: 1 });
  const p2 = await png.newPage();
  await p2.setContent(`<body style="margin:0"><img id="m" style="display:block" src="data:image/png;base64,${readFileSync(`${MAQUETTE}.png`).toString("base64")}"></body>`);
  await p2.locator("#m").evaluate((img) => img.decode());
  for (const [n, b] of Object.entries(boxes)) {
    const clip = { x: Math.max(0, Math.floor(b.x * 2) - 32), y: Math.max(0, Math.floor(b.y * 2) - 32), width: Math.ceil(b.width * 2) + 64, height: Math.ceil(b.height * 2) + 64 };
    const path = join(ROOT, "docs", "essais", `design-l3-maquette-${n}.png`);
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
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-design-l3-"));
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
    await s1(browser, base, tmp);
    await s2(browser, base);
    await s3(browser, base);
    await s4(browser, base);
    await s5(browser, base);
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

- [ ] **Étape 3 : rouge sur le build « avant »** (D11 : contre-épreuve de l'essai) —

```bash
cd /home/adminjd/projets/roomboard-wt/design-l3--T8
AVANT=$HOME/.cache/tmp/of61-design-l3-avant
test -d "$AVANT" || git worktree add --detach "$AVANT" dbb2473
for d in wasm wasm-formats; do test -d "$AVANT/apps/web/src/$d" || cp -r apps/web/src/$d "$AVANT/apps/web/src/$d"; done
(cd "$AVANT" && (test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile > $HOME/.cache/tmp/of61-tmp/T8-avant-install.log 2>&1) && nice -n 10 pnpm --filter @roomboard/web build > $HOME/.cache/tmp/of61-tmp/T8-avant-build.log 2>&1; echo "build avant code $?")
nice -n 10 node scripts/essais/design-l3-navigateur.mjs --dist "$AVANT/apps/web/dist" > $HOME/.cache/tmp/of61-tmp/T8-rouge.log 2>&1; echo "code $?"; grep -E "ÉCHEC|^ok" $HOME/.cache/tmp/of61-tmp/T8-rouge.log | tail -5
```

  Attendu : `build avant code 0`, puis `code 1` et `design L3 : ÉCHEC` dans S1 (panneau `.rb-popover[data-panel="profils"]`
  absent).

- [ ] **Étape 4 : vert sur l'après** — commande bornée de la section. Attendu : voir « Preuve ». Un échec : lire la ligne
  `ÉCHEC` et les 30 lignes qui la précèdent ; un défaut de l'application (et non de l'essai) arrête la tâche (rapport :
  la tâche T5 ou T6 fautive est rouverte par l'orchestrateur).

- [ ] **Étape 5 : branchement.** Dans `scripts/verifier.sh`, juste après `  echo "design L4 : OK"`, ajouter :

```bash
  node scripts/essais/design-l3-navigateur.mjs
  echo "design L3 : OK"
```

  Puis `cd /home/adminjd/projets/roomboard-wt/design-l3--T8 && bash scripts/tests/verifier-e2e.test.sh; echo "code $?"; node --test scripts/tests/nettete.test.mjs 2>&1 | tail -5`
  Attendu : `verifier-e2e.test.sh : OK`, `code 0`, `# fail 0`.

- [ ] **Étape 6 : aucun processus restant** —
  `pgrep -fa "navigateur.mjs|chrome-headless|ms-playwright|vite" | grep -v pgrep || echo "aucun processus"`.

- [ ] **Étape 7 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l3--T8
git add scripts/essais/design-l3-navigateur.mjs
git add scripts/verifier.sh
git add scripts/tests/verifier-e2e.test.sh
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "test(e2e): design L3 browser trial (profile side panel, sort, confirm, sharpness) in verifier --e2e" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport de la tâche : sortie rouge (avant) et verte (après), rangées de gris, nombre d'icônes calées, chemin du build
« avant » laissé pour T9, ligne `Réutilisation : …`.

---

### Tâche T9 — Suite complète, captures avant / après, recadrages de la maquette 03, document d'écarts
<a id="tache-t9"></a>

**Objectif.** Jouer une fois la suite complète (`verifier.sh --e2e`), relever les tailles Wasm, prendre les captures à
2x du panneau avant (`main` @ dbb2473) et après, les recadrages après et ceux de `docs/design/maquettes/03-profils.png`,
puis écrire dans `docs/essais/design-l3-comparaison.md` les écarts un par un, justifiés (L3-27, § 6 ter ; S5 et
preuve finale de tous les scénarios).

**Fichiers.**
- Créer : `docs/essais/design-l3-avant-panneau.png`, `docs/essais/design-l3-apres-panneau.png`,
  `docs/essais/design-l3-apres-entete.png`, `docs/essais/design-l3-apres-cartes.png`,
  `docs/essais/design-l3-apres-vignettes.png`, `docs/essais/design-l3-apres-liste.png`,
  `docs/essais/design-l3-apres-pied.png`, `docs/essais/design-l3-maquette-entete.png`,
  `docs/essais/design-l3-maquette-cartes.png`, `docs/essais/design-l3-maquette-vignettes.png`,
  `docs/essais/design-l3-maquette-liste.png`, `docs/essais/design-l3-maquette-pied.png`,
  `docs/essais/design-l3-comparaison.md`

**Interfaces.**
- Consomme (T8) : `node scripts/essais/design-l3-navigateur.mjs [--captures] [--dist <dossier> --nom avant]` ; build
  « avant » dans `$HOME/.cache/tmp/of61-design-l3-avant` (s'il manque, l'étape 3 le reconstruit).
- Produit : les 12 PNG et `docs/essais/design-l3-comparaison.md`.
- Réutilise : `scripts/essais/design-l3-navigateur.mjs` (T8) — appelé tel quel, avec `--captures` ; aucun module neuf.
- Rapport : `Réutilisation : appelé design-l3-navigateur.mjs (captures)`.

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/design-l3--T9 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of61-tmp CARGO_BUILD_JOBS=4 CARGO_TARGET_DIR=/home/adminjd/projets/roomboard-wt/design-l3--T9/target && mkdir -p "$TMPDIR" && node ~/.claude/scripts/vm/suite-vm.cjs -- nice -n 10 bash scripts/verifier.sh --e2e > "$TMPDIR/T9-verifier-e2e.log" 2>&1; echo "code $?"; grep -E "module Wasm|module formats|Tests .*passed|test result|: OK|ÉCHEC|FAIL |error\[" "$TMPDIR/T9-verifier-e2e.log" | tail -60`
Preuve : `code 0` ; `design L3 : OK`, `design L4 : OK`, `design L1 : OK`, `C1 : OK` (dans la sortie de l'essai C1),
`C11a annotation : OK`, `C11b capture : OK`, `verifier.sh : e2e OK`, `verifier.sh : OK` ;
`module Wasm : 1375581 octets` et `module formats : 2794511 octets` (identiques à
`grep -E "module (Wasm|formats)" ~/.cache/tmp/of61-ref/verifier.log`, sinon rapport et arrêt) ; aucun `FAIL `,
`ÉCHEC`, `error[`, `test result: FAILED`. Effets de bord couverts ici : menu Profil et `[data-profile=…]` des essais
`s5b`, `c11a`, `c11b`, `design-l1`, `design-l4` ; `allVisible` de C1 ; `resource-drag.test.ts` (glisser des cartes) et
`c4-bibliotheque-navigateur.mjs` ; panneaux Grille et Image (`.rb-editor`).

**Preuve visuelle.** Lectures d'abord, dans `$TMPDIR/T9-captures.log` (étape 2) : `rangée du Rectangle (gris, 2x)`,
rangées de `dock-top` non choisie et choisie, nombre d'icônes calées, `0 frange` (×7), contre-épreuve. Puis les
captures, lues une à une (outil Read) : `design-l3-apres-panneau.png`, `design-l3-avant-panneau.png`, et chaque paire
`design-l3-apres-<zone>.png` / `design-l3-maquette-<zone>.png` (zones `entete`, `cartes`, `vignettes`, `liste`, `pied`),
à 100 % ; décrire au rapport ce que chaque paire montre, écart par écart.

**Contraintes (recopiées).** G1 aucun test ni essai sauté, aucun seuil changé · G5 tailles Wasm avant 1 375 581 /
2 794 511 o (journal `~/.cache/tmp/of61-ref/verifier.log`), aucun Rust touché · G6 `nice -n 10`, cargo `-j 4`
(`CARGO_BUILD_JOBS=4`), `CARGO_TARGET_DIR=/home/adminjd/projets/roomboard-wt/design-l3--T9/target`,
`export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`, suite complète par `node ~/.claude/scripts/vm/suite-vm.cjs -- …`
(en fond si elle dépasse 10 min, journal relu), aucun `tauri build` · G7 temporaires dans `$HOME/.cache/tmp/of61-*`,
worktree « avant » `$HOME/.cache/tmp/of61-design-l3-avant` retiré par `git worktree remove` sans `--force`, aucun
processus laissé · G8 auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un, aucun push · G11 netteté 0 pixel
intermédiaire, 0 frange · `verifier.sh` sans `--captures` · G12 worktree
`/home/adminjd/projets/roomboard-wt/design-l3--T9`.

**Interdits.** Aucun changement de code (un essai rouge : rapport et arrêt, l'orchestrateur rouvre la tâche fautive) ;
aucun `git worktree remove --force` ; aucune autre capture commitée réécrite.

**Terminé quand.** Suite complète verte une fois, tailles Wasm égales, 12 PNG et le document commités, worktree
« avant » retiré, écarts listés.

- [ ] **Étape 0 : préparer le worktree** —
  `cd /home/adminjd/projets/roomboard-wt/design-l3--T9 && mkdir -p $HOME/.cache/tmp/of61-tmp && (test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile > $HOME/.cache/tmp/of61-tmp/T9-install.log 2>&1); git log --oneline -3; grep -c "design-l3-navigateur" scripts/verifier.sh`
  Attendu : `1` (T8 fusionné). `verifier.sh` reconstruit les modules Wasm dans `CARGO_TARGET_DIR`.

- [ ] **Étape 1 : suite complète** — commande bornée de la section. Attendu : voir « Preuve ». Un échec : relever la
  ligne `ÉCHEC` / `FAIL ` et les 30 lignes qui la précèdent dans `$TMPDIR/T9-verifier-e2e.log`, s'arrêter.

- [ ] **Étape 2 : captures « après »** (sur l'`apps/web/dist` construit par la suite) —
  `cd /home/adminjd/projets/roomboard-wt/design-l3--T9 && TMPDIR=$HOME/.cache/tmp/of61-tmp nice -n 10 node scripts/essais/design-l3-navigateur.mjs --captures > $HOME/.cache/tmp/of61-tmp/T9-captures.log 2>&1; echo "code $?"; grep -E "capture|rangée|: OK|ÉCHEC" $HOME/.cache/tmp/of61-tmp/T9-captures.log | tail -30`
  Attendu : `code 0`, `design L3 : OK`, onze lignes `capture : …/design-l3-(apres|maquette)-….png`.

- [ ] **Étape 3 : captures « avant »** (`main` @ dbb2473 ; build de T8 réutilisé s'il est là) —

```bash
cd /home/adminjd/projets/roomboard-wt/design-l3--T9
AVANT=$HOME/.cache/tmp/of61-design-l3-avant
test -d "$AVANT" || git worktree add --detach "$AVANT" dbb2473
for d in wasm wasm-formats; do test -d "$AVANT/apps/web/src/$d" || cp -r apps/web/src/$d "$AVANT/apps/web/src/$d"; done
test -f "$AVANT/apps/web/dist/index.html" || (cd "$AVANT" && (test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile > $HOME/.cache/tmp/of61-tmp/T9-avant-install.log 2>&1) && nice -n 10 pnpm --filter @roomboard/web build > $HOME/.cache/tmp/of61-tmp/T9-avant-build.log 2>&1)
TMPDIR=$HOME/.cache/tmp/of61-tmp nice -n 10 node scripts/essais/design-l3-navigateur.mjs --captures --dist "$AVANT/apps/web/dist" --nom avant 2>&1 | tail -5
```

  Attendu : `capture : …/design-l3-avant-panneau.png`, `captures « avant » seules, mesures sautées`.

- [ ] **Étape 4 : retirer le worktree « avant »** —
  `git -C /home/adminjd/projets/roomboard-wt/design-l3--T9 worktree remove "$HOME/.cache/tmp/of61-design-l3-avant" && git -C /home/adminjd/projets/roomboard-wt/design-l3--T9 worktree prune && git -C /home/adminjd/projets/roomboard-wt/design-l3--T9 worktree list`
  Attendu : `of61-design-l3-avant` absent. S'il refuse (fichiers non suivis : `node_modules`, `dist`, Wasm copiés) :
  `git -C "$HOME/.cache/tmp/of61-design-l3-avant" status --short --ignored | head`, rendre la liste au rapport, ne
  pas forcer ; l'orchestrateur décide.

- [ ] **Étape 5 : contrôle des images** —
  `file /home/adminjd/projets/roomboard-wt/design-l3--T9/docs/essais/design-l3-*.png | wc -l` → `12` ;
  `file …/design-l3-apres-panneau.png` montre une largeur de 1200 pixels (600 px CSS à 2x) et une hauteur ≥ 1700.
  Puis les lectures de la section « Preuve visuelle ».

- [ ] **Étape 6 : document d'écarts.** Écrire `docs/essais/design-l3-comparaison.md` avec ce plan exact ; la colonne
  « constaté » dit ce que montrent les deux recadrages (« conforme à l'attendu », ou la différence vue, en une phrase) ;
  un écart vu et absent du tableau est ajouté en fin, avec sa justification ou la mention « non justifié : à
  corriger » :

```markdown
# design L3 — panneau des profils comparé à la maquette 03

Rendu : Chromium de Playwright, 1920 × 1080 à 2x, `--disable-lcd-text`, `--force-color-profile=srgb`, profil
« Annotation au démarrage », barre d'outils « À gauche » dans le brouillon. Police du système (H18) : la maquette est
rendue avec Inter. Après : `design-l3-apres-*.png` ; avant (`main` @ dbb2473) : `design-l3-avant-panneau.png` ;
maquette : `design-l3-maquette-*.png` (recadrages de `docs/design/maquettes/03-profils.png`). Essai :
`scripts/essais/design-l3-navigateur.mjs --captures`.

## Netteté (§ 10 du cadrage design)

(lignes recopiées de `T9-captures.log` : rangée du Rectangle, rangées de `dock-top` non choisie et choisie, calage,
sept mesures de franges, contre-épreuve)

## Écarts, zone par zone

| zone | écart | attendu | justification | constaté |
|---|---|---|---|---|
| panneau | sous la barre du haut et les onglets, pas sur toute la hauteur | § 6 ter, H8 | aucune barre n'est jamais couverte (L3-2) | |
| entête | sélecteur de profil natif | H17 | liste du système, accessible | |
| entête | étiquette « Fourni » au lieu de « Fourni, modifié » | — | le brouillon n'est pas enregistré : l'étiquette dit l'enregistré (L3-6) | |
| entête | champ « Nom du profil » sous le sélecteur | § 6 ter | renommer un profil (P20) | |
| cartes | police du système au lieu d'Inter | H18 | Inter non embarquée (Q6) | |
| vignettes | section « Taille des boutons » à part, au-dessus des barres | H14 | taille globale au profil | |
| vignettes | commande « Barre d'outils / des pages / d'annotation » au-dessus des vignettes | H5 | une barre à la fois | |
| liste | outils de la barre de `defaut` (Stylo, Gomme, « Gomme : partielle », Main, Séparateur…) au lieu de la barre réduite de la maquette | § 6 ter | la maquette montre une barre d'avant L4 | |
| liste | poignée cible de 48 px au lieu de 24 | D8, L3-24 | cibles ≥ 48 px | |
| liste | lignes « Séparateur » | H12 | un séparateur est un élément de la barre | |
| liste | pas de ligne tirée au repos (la maquette montre `.item.drag`) | — | état du geste, vu en S2 | |
| liste | icône `pen-line` sur « Dessin / Souris » (barre d'annotation) | H24 | même icône que le segment | |
| pied | « Enregistrer » en plus ; « Enregistré sur cet appareil » seulement sans changement | H2 | pas d'enregistrement automatique | |
| hors maquette | « Enregistrer comme nouveau », sections « Préréglages » et « Rétablir les barres » | § 6 ter, U12, P28 | gestes gardés de C1 | |
| hors maquette | « Monter » et « Descendre » sur la ligne dont on a touché la poignée | L3-15 | chemin sans glisser (WCAG 2.2 § 2.5.7) | |
| hors maquette | note de la barre d'annotation | H22, D5 | barre jamais rendue au tableau | |
```

  Remplacer la ligne entre parenthèses de « Netteté » par les lignes du journal (recopiées telles quelles).

- [ ] **Étape 7 : aucun processus restant** —
  `pgrep -fa "navigateur.mjs|chrome-headless|ms-playwright|vite" | grep -v pgrep || echo "aucun processus"`.

- [ ] **Étape 8 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l3--T9
git add docs/essais/design-l3-avant-panneau.png
git add docs/essais/design-l3-apres-panneau.png
git add docs/essais/design-l3-apres-entete.png
git add docs/essais/design-l3-apres-cartes.png
git add docs/essais/design-l3-apres-vignettes.png
git add docs/essais/design-l3-apres-liste.png
git add docs/essais/design-l3-apres-pied.png
git add docs/essais/design-l3-maquette-entete.png
git add docs/essais/design-l3-maquette-cartes.png
git add docs/essais/design-l3-maquette-vignettes.png
git add docs/essais/design-l3-maquette-liste.png
git add docs/essais/design-l3-maquette-pied.png
git add docs/essais/design-l3-comparaison.md
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "docs(essais): design L3 before/after panel captures at 2x, mockup 03 crops, gap list" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport de la tâche : tailles Wasm lues, rangées de gris, liste des écarts (un par ligne, attendu ou non), écarts
« non justifiés » à part, rappel des retouches à citer dans la PR (T1, T2, T5, T6, T7), gestes à rejouer en coque
(C1-1, C1-7).

---

## Relecture du plan (par le planificateur)

- **Couverture du cadrage.** L3-1 → T5 (popover, `aside`, CSS), T8 (S1, S6) ; L3-2 → T6 (`data-panneau`, flottante,
  test barre à droite), T8 (S1, S6) ; L3-3 → T5 (`preview`, `shownProfile`), T7 (C1 fond), T8 (S1, S3) ; L3-4 → T5
  (`keyed`, `focusProfile`), T8 (S3) ; L3-5 → T5 ; L3-6 → T5 ; L3-7, L3-8 → T4 (radio), T5 ; L3-9 → T5 (D5) ; L3-10 →
  T2 (icônes), T5 ; L3-11 → T5 ; L3-12 → T5 (`POINTER_SUMMARY`) ; L3-13 → T3, T5, T8 (S2) ; L3-14 → T1 ; L3-15 → T5,
  T8 (S2) ; L3-16 → T5 ; L3-17 → T1, T8 (S4) ; L3-18 → T5 ; L3-19 → T5, T8 (S1) ; L3-20 → T1 (`sameProfile`), T5 ;
  L3-21 → T1 (`exportProfile`), T5, T8 (S1) ; L3-22 → T6 ; L3-23 → T4 ; L3-24 → T5 (CSS, tests) ; L3-25 → T2 ; L3-26
  → T5, T6, T7 (retouches listées), T1 (catalogue) ; L3-27 → T8, T9 ; L3-28 → T8 (S5) ; L3-29 → T5 (CSS), T8 (S6) ;
  L3-30 → G3, G5, T9 (Wasm) ; L3-31 → T1 (constat `toolbar-profiles.ts:112` fermé par la règle ; sa clôture dans
  `docs/architecture-constats.md` revient à `scripts/chaine/constats.cjs`, étage 4), T3 (squelette partagé), T5 (pas de
  troisième table) ; L3-32 → T1 (`abandonQuestion`), T5 (éditeur), T6 (autre panneau, annotation). Scénarios : S1 → T1,
  T4, T5, T6, T7, T8 ; S2 → T1, T3, T5, T8 ; S3 → T1, T5, T6, T8 ; S4 → T1, T5, T8 ; S5 → T2, T4, T5, T8, T9 ; S6 →
  T6, T8.
- **Carte d'impact.** § 3.1 : `ProfileEditor.tsx` T5, `PointerSwitch.tsx` T5, `resource-drag.ts` T3, `ProfileMenu.tsx`
  T6, `App.tsx` T5 et T6, `RadioChoices.tsx` T4, `sort-drag.ts` et `pointer-gesture.ts` T3, `profile-edit.ts` T1,
  `profile-actions.ts` T1, `icons.ts` T2, `rb.css` T5 et T6 ; entrées « non » laissées hors des tâches (`layout.ts`,
  `toolbar.ts`, `IconButton.tsx`, `GridPanel.tsx`, `ImagePanel.tsx`, `main.ts`, `profile-store.ts`). § 3.2 : chaque
  test retouché ou ajouté dans la tâche de sa zone (T1, T2, T3, T4, T5, T6, T7, T8) ; tests à garder verts cités dans
  les preuves de T3 (`resource-drag.test.ts`), T5 (`GridPanel`, `ImagePanel`, `Toolbar`, `PointerSwitch`,
  `ProfileMenu`), T6 (`ProfileMenu.test.tsx`), T7 (C1 non retouché), T8 (`nettete.test.mjs`), T9 (essais
  `[data-profile=…]`, suite complète). § 3.3 : `THIRD_PARTY_NOTICES.md` T2, fiches de coque T7, PNG T9,
  `architecture-constats.md` : clôture à l'étage 4 (voir L3-31).
- **Effets de bord.** Barres qui suivent le brouillon → T5 (« design-l3 L3-3 » ×2), T7 (C1 fond), T8 (S3) ; scène
  rétrécie en direct → T8 (S1, `noOverlap`) ; barre flottante déplacée et repliée → T6 (test `data-panneau`, règles
  CSS), T8 (S6) ; catalogue plus court → T1 (`L3-17` ×4), T8 (S4) ; Monter / Descendre cachés → T5 (`L3-15`, retouches
  `:84-117`), T3, T8 (S2) ; abandon confirmé → T5 (`L3-32`), T6 (`L3-32` ×3), T8 (S3) ; Exporter du panneau = brouillon
  → T1 (`L3-21`), T5 (App `L3-21`), T8 (S1) ; menu Profil avec icônes → T6 (`L3-22`), T9 (essais du menu).
- **Modules à réutiliser.** Les 20 lignes du cadrage ont leur ligne `Réutilise :` : T1 (opérations du brouillon,
  `moveItemTo`, catalogue, `annotationBarOf`, `sameProfile`, gestes du profil, `profileToFile`), T2 (`ICONS`,
  `iconFor`), T3 (squelette extrait, tri au pointeur), T4 (choix exclusif, `IconButton`/`Icon`), T5 (aperçu `GridPanel`,
  profil actif, `iconFor`, `IconButton`, `POINTER_SEGMENTS`, `ShellPort.confirm`, gestes du profil, `BUTTON_PX`, popover
  calé, opérations du brouillon), T6 (`ShellPort.confirm`, `sameProfile`, `Icon`, popover), T7 et T8 (`commun.mjs`,
  `nettete.mjs`). Aucune tâche ne crée un module que la liste donne comme existant ; les trois modules neufs sont ceux
  de DA-L3-1 et DA-L3-2.
- **Noms d'une tâche à l'autre.** `moveItemTo`, `sameProfile`, `abandonQuestion`, `CATALOG_ACTIONS`, `exportProfile`,
  `startPointerGesture`, `PointerGesture`, `DRAG_THRESHOLD_PX`, `startSortDrag`, `SortDragOptions`, `slotOf`,
  `SORT_EDGE_PX`, `RadioChoices`, `RadioOption`, `POINTER_SUMMARY`, `ROW_SUMMARY`, `BUTTON_PX`, `ProfileEditorProps`
  (`preview`, `endPreview`, `choose`, `importFile`, `exportProfile`, `resetCurrent`, `confirm`, `focusProfile`),
  `previewProfile`, `shownProfile`, `takeProfileFocus`, `leaveEditor`, `COMMAND_ICONS`, attributs `data-panel="profils"`,
  `data-panel="menu-profils"`, `data-panneau="profils"`, `data-sheet-body`, `data-edit="grip|shown|announce|saved|profile|profile-tag|annotation-note|add-list|items"`,
  `data-add-choice`, `data-choice`, `data-dragging`, classes `rb-sheet*`, `rb-radio*`, `rb-item*`, `rb-grip` : mêmes noms
  partout.
- **Review Focus.** Les cinq lignes ont leur test dans la tâche qui possède le code (T5 + T1, T1 + T5, T3 + T1, T5, T5).
