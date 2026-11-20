# Plan d'exécution — usage-c1-profils (C1 : profils et barre configurable)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Modèle du profil : `hidden`, `basedOn`, mineure 1, accès Profil garanti, mode de démarrage | — | `apps/web/src/toolbar.ts`, `apps/web/src/toolbar.test.ts`, `apps/web/src/app/toolbar-host.ts`, `apps/web/src/app/toolbar-host.test.ts` | isolé | concepteur-critique | `vitest run src/toolbar.test.ts src/app/toolbar-host.test.ts` : 0 échec, ≥ 40 tests, « accès profiles ajouté », « sans barre tools : barre outils ajoutée », « setMode desktop-annotation : aucun effet, message C11a » présents | S2, S5 | #tache-t1 |
| T2 | Magasin : copie par-dessus un livré, `revert`, `resetAll` ; profil livré `annotation` | — | `apps/web/src/profile-store.ts`, `apps/web/src/profile-store.test.ts`, `apps/web/src/toolbar-profiles.ts`, `apps/web/src/toolbar-profiles.test.ts` | isolé | concepteur-critique | `vitest run src/profile-store.test.ts src/toolbar-profiles.test.ts` : 0 échec, ≥ 20 tests, « copie de defaut lue au démarrage », « revenir à l'origine rend le livré », « tout remettre à zéro, stockage qui lève » présents | S3, S5 | #tache-t2 |
| T3 | Fichiers de profil : `profile-file.ts`, exemples `.rbprofile`, port `ProfileFiles` | T1 | `apps/web/src/profile-file.ts` (neuf), `apps/web/src/profile-file.test.ts` (neuf), `apps/web/src/fixtures/profils/1.2-outil-inconnu.rbprofile` (neuf), `apps/web/src/fixtures/profils/2.0-majeure.rbprofile` (neuf), `apps/web/src/platform/profile-files.ts` (neuf), `apps/web/src/platform/profile-files.test.ts` (neuf) | isolé | implementeur-tdd | `vitest run src/profile-file.test.ts src/platform/profile-files.test.ts` : 0 échec, ≥ 15 tests, « S2 : 1.2 à outil inconnu » et « fichier illisible » présents | S1, S2 | #tache-t3 |
| T4 | Rangée contextuelle des préréglages dans la barre d'outils | — | `apps/web/src/ui/Toolbar.tsx`, `apps/web/src/ui/Toolbar.test.tsx`, `apps/web/src/ui/rb.css` | isolé | implementeur-tdd | `vitest run src/ui/Toolbar.test.tsx` : 0 échec, ≥ 20 tests, « cinq préréglages : un clic sur le quatrième » présent | S4 | #tache-t4 |
| T5 | Opérations d'édition pures (`profile-edit.ts`) | T1 | `apps/web/src/profile-edit.ts` (neuf), `apps/web/src/profile-edit.test.ts` (neuf) | isolé | implementeur-tdd | `vitest run src/profile-edit.test.ts` : 0 échec, ≥ 15 tests, « S3 : resetToOrigin » et « originOf » présents | S1, S3, S4 | #tache-t5 |
| T6 | Profil actif (liste en signal, `refresh`) et menu Profil étendu | T1 | `apps/web/src/ui/active-profile.ts`, `apps/web/src/ui/active-profile.test.ts`, `apps/web/src/ui/ProfileMenu.tsx`, `apps/web/src/ui/ProfileMenu.test.tsx` | isolé | implementeur-tdd | `vitest run src/ui/active-profile.test.ts src/ui/ProfileMenu.test.tsx` : 0 échec, ≥ 11 tests, « commandes sous les profils, dans l'ordre » présent | S1, S3, S5 | #tache-t6 |
| T7 | Éditeur de profil (`ProfileEditor.tsx`) | T4, T5 | `apps/web/src/ui/ProfileEditor.tsx` (neuf), `apps/web/src/ui/ProfileEditor.test.tsx` (neuf), `apps/web/src/ui/rb.css` | isolé | implementeur-tdd | `vitest run src/ui/ProfileEditor.test.tsx src/ui/Toolbar.test.tsx` : 0 échec, ≥ 12 tests dans l'éditeur, « S4 : Rétablir les préréglages » présent ; contrôle source de `Toolbar.test.tsx` vert | S1, S2, S4 | #tache-t7 |
| T8 | Gestes de profil (`app/profile-actions.ts`) : enregistrer, nouveau, importer, exporter, remettre à zéro, supprimer | T2, T3, T5, T6 | `apps/web/src/app/profile-actions.ts` (neuf), `apps/web/src/app/profile-actions.test.ts` (neuf) | isolé | implementeur-tdd | `vitest run src/app/profile-actions.test.ts` : 0 échec, ≥ 15 tests, « S2 : id pris, Annuler : rien n'est importé » présent | S1, S2, S3 | #tache-t8 |
| T9 | Branchement : `App.tsx` (menu, éditeur, rangée, mode au montage) et `main.ts` (`ProfileFiles`) | T4, T6, T7, T8 | `apps/web/src/ui/App.tsx`, `apps/web/src/ui/App.test.tsx`, `apps/web/src/main.ts` | isolé | implementeur-tdd | `vitest run src/ui/App.test.tsx` : 0 échec, ≥ 22 tests, « S5 : capacité vraie » présent ; `pnpm --filter @roomboard/web test` ≥ 1 000 tests, 0 échec ; `pnpm --filter @roomboard/web build` OK | S1, S4, S5 | #tache-t9 |
| T10 | Essai e2e C1 dans `verifier.sh --e2e`, captures, fiches de la coque | T9 | `scripts/essais/c1-profils-navigateur.mjs` (neuf), `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/c1-editeur.png` (neuf), `docs/essais/c1-barre-gauche-l.png` (neuf), `docs/essais/coque-windows.md`, `docs/essais/coque-macos.md` | isolé | implementeur-tdd | `bash scripts/verifier.sh --e2e` : « C1 : OK », « S5b : OK », « verifier.sh : e2e OK », « verifier.sh : OK » ; deux PNG dans `docs/essais/` | S1, S2, S5 | #tache-t10 |

**Vagues (par dépendances).** Vague 1 : T1, T2, T4 (fichiers disjoints, trois en parallèle). Vague 2, dès la fusion de
T1 : T3, T5, T6 (disjoints entre eux et de T2, T4 ; peuvent démarrer pendant que T2 ou T4 tournent encore). Vague 3 :
T7 (après T4, T5) et T8 (après T2, T3, T5, T6), en parallèle. Vague 4 : T9. Vague 5 : T10. Fichier partagé entre
vagues, donc jamais en parallèle : `apps/web/src/ui/rb.css` (T4 puis T7). Chemin critique T1 → T5 → T7 → T9 → T10,
environ 30 + 30 + 40 + 35 + 45 min : ≈ 3 h avec les relectures.

**`tsc` entre les vagues (attendu).** Après T6, `tsc` signale `src/ui/App.tsx` (props nouvelles de `ProfileMenu` non
passées) ; T9 le rend vert. Aucun autre écart `tsc` n'est admis à la fin d'une tâche.

**Goal :** on choisit un profil, on modifie sa barre (emplacement, taille des boutons, éléments montrés ou masqués et
leur ordre, préréglages du stylo), on l'exporte et l'importe en `.rbprofile`, on le remet à zéro ; le profil fourni
« Annotation au démarrage » demande `desktop-annotation`, rabattu sans bruit sur `board` là où la capacité manque.

**Architecture :** le modèle (`toolbar.ts`) gagne `hidden`, `basedOn`, la mineure 1 et la garantie d'accès au menu
Profil dans `parseProfile` (seul chemin de lecture : stockage et import). Les gestes d'édition sont des fonctions pures
(`profile-edit.ts`, DAC1-1) ; le texte des fichiers est pur (`profile-file.ts`, DAC1-3) ; le choix et l'écriture du
fichier passent par le port `ProfileFiles`. Le magasin accepte une copie de même `id` par-dessus un livré (DAC1-2).
Les gestes du menu (ordre des questions, import, remises à zéro) vivent dans `app/profile-actions.ts`, testé sans DOM ;
`App.tsx` ne fait que brancher.

**Tech Stack :** TypeScript, SolidJS 1.9.20, Vitest 3 (happy-dom pour les composants), Playwright (essai e2e).

**Spec :** `docs/plans/usage-c1-profils-cadrage.md` (base `origin/main` `3057e29`).

## Choix du plan (hors cadrage, à relire)

- PC1 Module neuf `apps/web/src/app/profile-actions.ts` : les gestes du menu Profil, testables sans DOM ; `App.tsx` ne
  fait que les appeler (moins de lignes dans `App.tsx`, fichier partagé avec OD56).
- PC2 `uniqueId` est défini dans `toolbar.ts` (P33 en a besoin à la lecture) ; `profile-file.ts` le réexporte pour
  garder l'interface de DAC1-3.
- PC3 `toolbar.ts` exporte aussi `withCurrentMinor`, `isKnownItem`, `PROFILES_ACTION`, `isProfilesAccess` (utilisés
  par l'éditeur et les gestes). `serializeProfile` n'élève pas la mineure lui-même : les gestes d'écriture appellent
  `withCurrentMinor` (sinon l'aller-retour de `toolbar.test.ts:181-184` et `profile-store.test.ts:60` casse).
- PC4 `Toolbar` reçoit `presets` seulement (pas d'`activePreset` : P19 a retiré l'état enfoncé).
- PC5 « Supprimer » demande une confirmation (« Supprimer le profil « X » ? ») ; le cadrage est muet.
- PC6 La case « montrer » de Profil est présente mais grisée (S1 : « la case de Profil est grisée ») ; P33 disait
  « sans case ».
- PC7 `createTauriProfileFiles(dialog: Pick<TauriDialog, "open" | "save">, fs: TauriFs)` : accepte `TauriDialog`.

## Global Constraints

- GC1 Budget : l'exécution entière tient en environ 3 h sur la VM de 8 cœurs, chargée ; une tâche vise 20 à 45 min ;
  aucune commande lourde hors celles de la section (`scripts/verifier.sh` seulement en T10).
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test désactivé (`skip`, `only`, `todo`), aucun seuil ni
  délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build
  Android.
- GC4 Préparation du worktree, une fois, dans le dossier `$WT` que l'orchestrateur donne à la tâche :
  `cd "$WT" && [ -d node_modules ] || pnpm install --frozen-lockfile` puis
  `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c1-profils/apps/web/src/wasm apps/web/src/`
  (module généré, ignoré par git, jamais commité ; sans lui `tsc` signale `./wasm/roomboard_wasm`).
- GC5 Preuve bornée : la commande de la section, telle quelle ; le rapport cite le nombre de tests (N ≥ 1) et les noms
  attendus vus dans la sortie.
- GC6 Commits : chaque fichier ajouté par son chemin (`git add <chemin>`, jamais `-A`, `--all`, `.`, ni `commit -a`),
  auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Aucun `--force`. Ne pas pousser.
- GC7 Dépendances : aucune nouvelle (dépôt public PolyForm Shield ; jamais AGPL, GPL, LGPL) ; SolidJS 1.9.20, éléments
  HTML natifs.
- GC8 OD56 : ne toucher ni la branche ni le worktree `feat/usage-c2-depot` ; ne pas modifier `platform/host-repli.ts`,
  `platform/host-tauri.ts`, `platform/import.ts`, ni `ACTIONS` de `app/toolbar-host.ts` ; aucune action nouvelle dans
  `ACTION_TABLE` ; dans les fichiers partagés avec OD56 (`toolbar.ts`, `toolbar-profiles.ts`, `ui/App.tsx`, `main.ts`,
  `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`), ne changer que les lignes du chantier, sans réordonner
  l'existant.
- GC9 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne
  `Réutilise :` de la section.
- GC10 Format du profil : `schema` reste 1 ; `PROFILE_MINOR` vaut 1 ; le profil ne va jamais dans le `.roomboard` ;
  aucun composant n'appelle `localStorage` (seul `profile-store.ts` tient le stockage).
- GC11 Interface : dans `apps/web/src/ui/`, aucun `switch`, aucune taille en `px` dans un `.tsx`, aucun `localStorage`,
  aucun glisser HTML5 (`draggable`, `dragstart`) — contrôlé par le test « aucun switch sur l'identifiant… » de
  `ui/Toolbar.test.tsx` ; libellés en français, aucune icône seule, cibles d'au moins `--rb-btn-m`.
- GC12 Périmètre : la tâche ne modifie que ses fichiers touchés ; `app/stage-tags.ts` n'est pas touché.
- GC13 `tsc` : à la fin de la tâche,
  `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"` ne rend rien, sauf l'écart nommé dans
  la section.

Commande de commit type :

```bash
cd "$WT" && git add <fichier1> && git add <fichier2> && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "<message anglais>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Commande de test type (verbeuse, bornée) :

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run <fichiers> --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -60
```

## Review Focus

1. Profil sans accès au menu Profil (stocké, importé, `profiles` caché, aucune barre `tools`) : jamais enfermé (P33,
   HC1-6) — tests « accès profiles ajouté », « profiles caché : montré », « sans barre tools : barre outils ajoutée »
   (T1) et « P33 : profil importé sans accès Profil » (T8).
2. Import d'un id déjà pris, puis Annuler : rien ne change, ni le magasin ni le profil actif (P24, HC2-4, S2) — test
   « S2 : id pris, Annuler : rien n'est importé » (T8).
3. Nom de nouveau profil dont le slug donnerait l'id d'un livré, ou un slug vide (« Simple », « !!! », espaces) : id
   unique, jamais un livré, nom vide refusé (P28) — test « RF3 : nom qui donnerait un livré ou un slug vide » (T8).
4. Stockage qui lève pendant « Tout remettre à zéro » : la mémoire est vidée, un avertissement, aucune exception (P7,
   effet de bord « stockage ») — test « tout remettre à zéro, stockage qui lève » (T2).
5. Fichier choisi illisible (vide, non JSON, tableau, `null`) : message lisible, rien n'est importé (P24) — tests
   « fichier illisible : erreur lisible, jamais d'exception » (T3) et « fichier illisible : message, rien n'est
   importé » (T8).

## Carte des fichiers

| fichier | responsabilité | tâche |
|---|---|---|
| `apps/web/src/toolbar.ts` | modèle : champs `hidden`, `basedOn`, mineure 1, accès Profil garanti, `resolveStartMode`, `uniqueId`, `isKnownItem` | T1 |
| `apps/web/src/app/toolbar-host.ts` | `setMode` : `board` muet, `desktop-annotation` → message C11a | T1 |
| `apps/web/src/toolbar-profiles.ts` | barres de `defaut` en fonction partagée, profil `annotation` | T2 |
| `apps/web/src/profile-store.ts` | copie de même `id`, `isBuiltin`, `hasOverride`, `revert`, `resetAll` | T2 |
| `apps/web/src/profile-file.ts` | texte ↔ profil, nom de fichier, slug, `planImport` | T3 |
| `apps/web/src/fixtures/profils/*.rbprofile` | exemples 1.2 (inconnus) et 2.0 (refusé) | T3 |
| `apps/web/src/platform/profile-files.ts` | port `ProfileFiles` web et coque | T3 |
| `apps/web/src/ui/Toolbar.tsx` | rangée des préréglages de l'outil actif | T4 |
| `apps/web/src/ui/rb.css` | styles de la rangée (T4), du menu et de l'éditeur (T7) | T4, T7 |
| `apps/web/src/profile-edit.ts` | opérations pures d'édition | T5 |
| `apps/web/src/ui/active-profile.ts` | `profiles()` en signal, `refresh()` | T6 |
| `apps/web/src/ui/ProfileMenu.tsx` | commandes du menu Profil | T6 |
| `apps/web/src/ui/ProfileEditor.tsx` | éditeur sur brouillon, trois sections | T7 |
| `apps/web/src/app/profile-actions.ts` | gestes du menu et de l'éditeur | T8 |
| `apps/web/src/ui/App.tsx`, `apps/web/src/main.ts` | branchement | T9 |
| `scripts/essais/c1-profils-navigateur.mjs`, `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/*` | essai e2e, captures, fiches de la coque | T10 |

---

<a id="tache-t1"></a>
### Tâche T1 — Modèle du profil : `hidden`, `basedOn`, mineure 1, accès Profil garanti, mode de démarrage

**Objectif.** Étendre le modèle sans le refaire (P1) : élément masqué (P2), origine `basedOn` (P3), `PROFILE_MINOR = 1`
(P4), accès au menu Profil garanti à la lecture (P33), `resolveStartMode` qui rend `desktop-annotation` avec la
capacité (P10), `setMode` local muet pour `board` et qui annonce C11a sinon (P10).

**Subagent.** concepteur-critique. **Dépend de.** —

**Patron à ne pas reprendre.**
- Garantir l'accès Profil dans l'interface ou au chargement du magasin seulement (`profile-store.ts:58-72`) : l'import
  passerait à côté. La règle va dans `parseProfile` (`toolbar.ts:365-410`), seul chemin de lecture.
- Faire écrire `minor: 1` par `serializeProfile` (`toolbar.ts:445`) : l'aller-retour `toolbar.test.ts:181-184` et
  `profile-store.test.ts:60` casserait. On exporte `withCurrentMinor`, appelé par les gestes d'écriture (T8).

**Fichiers.** Modifier `apps/web/src/toolbar.ts` (l. 14, 35-46, 64-74, 130, 138, 221-257, 365-460, 476-498, ajouts en
fin), `apps/web/src/toolbar.test.ts`, `apps/web/src/app/toolbar-host.ts` (l. 53-55 seulement),
`apps/web/src/app/toolbar-host.test.ts`.

**Interfaces.**
- Consomme : —
- Produit (exact, utilisé par T3, T5, T6, T7, T8) :
  - `ToolItem.hidden?: boolean` ; `Profile.basedOn?: string` ; `PROFILE_MINOR = 1`
  - `export const PROFILES_ACTION: ActionId = "profiles"`
  - `export function isProfilesAccess(it: ToolItem): boolean`
  - `export function isKnownItem(it: ToolItem): boolean` (outil, action et capacités tous connus)
  - `export function uniqueId(base: string, taken: ReadonlySet<string>): string` (`base`, sinon `<base>-<n>`, n ≥ 2)
  - `export function withCurrentMinor(p: Profile): Profile`
  - `export function resolveStartMode(p: Profile, caps: RuntimeCapabilities): { readonly mode: StartMode; readonly fellBack: boolean }`
  - avertissements exacts : `accès au menu Profil ajouté` ; `<id> : l'accès au menu Profil ne se masque pas, élément montré`
  - erreurs exactes : `<chemin>.hidden : booléen attendu` ; `profil.basedOn : chaîne non vide attendue`
- Réutilise : `apps/web/src/toolbar.ts:365` — `parseProfile(json: unknown): ParsedProfile`, étendu de `hidden`, `basedOn` (étendre).
- Réutilise : `apps/web/src/toolbar.ts:440` — `serializeProfile(p: Profile): Record<string, unknown>`, écrit `hidden` si vrai, `basedOn` si présent (étendre).
- Réutilise : `apps/web/src/toolbar.ts:476` — `visibleItems(bar, caps): ToolItem[]`, saute `hidden` (étendre).
- Réutilise : `apps/web/src/toolbar.ts:492` — `resolveStartMode(p, caps): { mode: StartMode; fellBack: boolean }` (étendre).
- Réutilise : `apps/web/src/toolbar.ts:365` — `parseProfile`, avertissements dans `ctx.warnings`, même sortie `ParsedProfile` : garantie d'accès au menu Profil (étendre, P33).
- Réutilise : `apps/web/src/app/toolbar-host.ts:53` — `setMode(mode: StartMode): void`, message C11a (étendre).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/toolbar.test.ts src/app/toolbar-host.test.ts src/ui/active-profile.test.ts src/toolbar-profiles.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -80
```

Attendu : 0 échec ; ≥ 40 tests dans les deux premiers fichiers ; présents : « accès profiles ajouté », « profiles
caché : montré », « sans barre tools : barre outils ajoutée », « écriture en 1.1 », « setMode desktop-annotation :
aucun effet, message C11a ». À garder verts : `ui/active-profile.test.ts` (« capacité absente : élément masqué,
startMode rabattu »), `toolbar-profiles.test.ts` (« defaut et simple sont valides, sans avertissement » : les livrés
ont déjà Profil), « chaque action d'ACTION_TABLE a son entrée dans ACTIONS ».

**Preuve visuelle.** Aucune (modèle).

**Contraintes (recopiées).**
- GC1 Budget : l'exécution entière tient en environ 3 h sur la VM de 8 cœurs, chargée ; une tâche vise 20 à 45 min ; aucune commande lourde hors celles de la section.
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test désactivé (`skip`, `only`, `todo`), aucun seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && [ -d node_modules ] || pnpm install --frozen-lockfile` ; `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c1-profils/apps/web/src/wasm apps/web/src/` (jamais commité).
- GC5 Preuve bornée : la commande de la section, telle quelle ; le rapport cite N ≥ 1 et les noms attendus.
- GC6 Commits : fichiers ajoutés un par un (`git add <chemin>`, jamais `-A`, `--all`, `.`, ni `commit -a`), auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle (jamais AGPL, GPL, LGPL).
- GC8 OD56 : ne pas toucher `feat/usage-c2-depot` ; dans `toolbar.ts` et `app/toolbar-host.ts`, ne changer que les lignes du chantier ; ne pas toucher `ACTIONS` (`toolbar-host.ts:22-37`) ; aucune action nouvelle dans `ACTION_TABLE`.
- GC9 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.
- GC10 `schema` reste 1 ; `PROFILE_MINOR` vaut 1 ; aucun `localStorage`, `document.`, `window.` dans `toolbar.ts` (test « source » existant).
- GC12 Ne modifier que les fichiers touchés de la tâche.
- GC13 `tsc --noEmit` sans erreur à la fin.

**Interdits.** Toucher `profile-store.ts`, `toolbar-profiles.ts`, `ui/` ; changer la forme de `ACTIONS` ; écrire
`minor` dans `serializeProfile` autrement que `p.minor > 0`.

**Terminé quand.** Commande bornée verte ; `pnpm --filter @roomboard/web test 2>&1 | tail -15` : 0 échec ; `tsc` vide ;
un commit ; rapport avec les six lignes `Réutilisation :`.

**Étapes.**

- [ ] **1. Préparer le worktree** (GC4).

- [ ] **2. Ajouter la barre `vue` à `base()` de `toolbar.test.ts`** pour que les anciens tests gardent leur sens (le
  profil de base porte déjà l'accès Profil) : dans `base()`, `toolbars` devient

```ts
    toolbars: [
      {
        id: "outils",
        role: "tools",
        dock: "top",
        groups: [{ id: "g", items: [{ id: "pen", kind: "tool", tool: "pen", label: "Stylo" }, { id: "undo", kind: "action", action: "undo", label: "Annuler" }] }],
      },
      { id: "vue", role: "tools", dock: "right", groups: [{ id: "v", items: [{ id: "profiles", kind: "action", action: "profiles", label: "Profil" }] }] },
    ],
```

  et la ligne 140 devient (titre du test inchangé sauf la fin) :

```ts
    expect(resolveStartMode(profile, ALL)).toEqual({ mode: "desktop-annotation", fellBack: false }); // C1 : la capacité décide (P10)
```

- [ ] **3. Écrire les tests rouges** à la fin de `toolbar.test.ts` (import complété de `isKnownItem`, `PROFILE_MINOR`,
  `uniqueId`, `withCurrentMinor`) :

```ts
describe("C1 : modèle du profil (P2-P4, P10, P33)", () => {
  /** Profil de base sans la barre « vue » : aucun accès au menu Profil. */
  const bare = (): Record<string, any> => {
    const j = base() as Record<string, any>;
    j.toolbars = [j.toolbars[0]];
    return j;
  };

  it("accès profiles ajouté : en fin de la première barre tools, avertissement, relu sans alerte", () => {
    const { profile, warnings } = ok(bare());
    expect(warnings).toContain("accès au menu Profil ajouté");
    const items = profile.toolbars[0]!.groups.flatMap((g) => g.items);
    expect(items.at(-1)).toMatchObject({ id: "profiles", kind: "action", action: "profiles", label: "Profil" });
    expect(visibleItems(profile.toolbars[0]!, NONE).map((i) => i.id)).toEqual(["pen", "undo", "profiles"]);
    expect(ok(serializeProfile(profile)).warnings).toEqual([]);
  });

  it("accès profiles ajouté : id profiles pris par un autre élément → profiles-2", () => {
    const j = bare();
    j.toolbars[0].groups[0].items.push({ id: "profiles", kind: "tool", tool: "pen", label: "Stylo bis" });
    const items = ok(j).profile.toolbars[0]!.groups.flatMap((g) => g.items);
    expect(items.at(-1)).toMatchObject({ id: "profiles-2", action: "profiles" });
  });

  it("profiles caché : montré, avertissement", () => {
    const j = base() as Record<string, any>;
    j.toolbars[1].groups[0].items[0].hidden = true;
    const { profile, warnings } = ok(j);
    expect(warnings).toContain("profiles : l'accès au menu Profil ne se masque pas, élément montré");
    expect(profile.toolbars[1]!.groups[0]!.items[0]!.hidden).toBeUndefined();
    expect(visibleItems(profile.toolbars[1]!, NONE).map((i) => i.id)).toEqual(["profiles"]);
  });

  it("sans barre tools : barre outils ajoutée (role tools, dock top) qui porte profiles", () => {
    const j = base() as Record<string, any>;
    j.toolbars = [
      { id: "pages", role: "pages", dock: "bottom", groups: [{ id: "p", items: [{ id: "page-next", kind: "action", action: "page-next", label: "Page suivante" }] }] },
    ];
    const { profile, warnings } = ok(j);
    expect(warnings).toContain("accès au menu Profil ajouté");
    expect(profile.toolbars.map((b) => [b.id, b.role, b.dock])).toEqual([["pages", "pages", "bottom"], ["outils", "tools", "top"]]);
    expect(profile.toolbars[1]!.groups[0]!.items.map((i) => i.id)).toEqual(["profiles"]);
  });

  it("hidden : masqué gardé (ordre, id, options), sauté par visibleItems, écrit seulement s'il est vrai", () => {
    const j = base() as Record<string, any>;
    j.toolbars[0].groups[0].items[0].hidden = true;
    j.toolbars[0].groups[0].items[0].options = { epaisseur: 9 };
    j.toolbars[0].groups[0].items[1].hidden = false;
    const { profile, warnings } = ok(j);
    expect(warnings).toEqual([]);
    const items = profile.toolbars[0]!.groups[0]!.items;
    expect(items.map((i) => i.id)).toEqual(["pen", "undo"]);
    expect(items[0]).toMatchObject({ id: "pen", hidden: true, options: { epaisseur: 9 } });
    expect(items[1]!.hidden).toBeUndefined();
    expect(visibleItems(profile.toolbars[0]!, ALL).map((i) => i.id)).toEqual(["undo"]);
    const out = serializeProfile(profile) as Record<string, any>;
    expect(out.toolbars[0].groups[0].items[0].hidden).toBe(true);
    expect("hidden" in out.toolbars[0].groups[0].items[1]).toBe(false);
    expect(ok(out).profile).toEqual(profile);
  });

  it("hidden non booléen : erreur", () => {
    const j = base() as Record<string, any>;
    j.toolbars[0].groups[0].items[0].hidden = "oui";
    expect(errs(j)).toContain("toolbars[0].groups[0].items[0].hidden : booléen attendu");
  });

  it("basedOn : lu et écrit ; absent : absent ; chaîne vide : erreur", () => {
    const { profile } = ok({ ...base(), basedOn: "simple" });
    expect(profile.basedOn).toBe("simple");
    expect(profile.rest).toEqual({});
    expect((serializeProfile(profile) as Record<string, unknown>).basedOn).toBe("simple");
    expect(ok(base()).profile.basedOn).toBeUndefined();
    expect("basedOn" in serializeProfile(ok(base()).profile)).toBe(false);
    expect(errs({ ...base(), basedOn: " " })).toContain("profil.basedOn : chaîne non vide attendue");
  });

  it("écriture en 1.1 : PROFILE_MINOR vaut 1, withCurrentMinor relève la mineure sans la baisser", () => {
    expect(PROFILE_MINOR).toBe(1);
    const p = ok(base()).profile;
    expect(p.minor).toBe(0);
    const stamped = withCurrentMinor(p);
    expect(stamped.minor).toBe(1);
    expect((serializeProfile(stamped) as Record<string, unknown>).minor).toBe(1);
    expect(ok(serializeProfile(stamped)).warnings).toEqual([]);
    const newer = ok({ ...base(), minor: 2 }).profile;
    expect(withCurrentMinor(newer)).toBe(newer);
  });

  it("mineure 2 : avertissement « plus récent que 1.1 »", () => {
    expect(ok({ ...base(), minor: 2 }).warnings).toContain("profil 1.2 plus récent que 1.1 : clés inconnues conservées");
  });

  it("resolveStartMode : desktop-annotation avec la capacité, board sans (repli sans bruit)", () => {
    const ann = ok({ ...base(), behavior: { startMode: "desktop-annotation" } }).profile;
    expect(resolveStartMode(ann, ALL)).toEqual({ mode: "desktop-annotation", fellBack: false });
    expect(resolveStartMode(ann, NONE)).toEqual({ mode: "board", fellBack: true });
    expect(resolveStartMode(ok(base()).profile, ALL)).toEqual({ mode: "board", fellBack: false });
  });

  it("uniqueId : base libre, sinon premier <base>-<n> libre, n ≥ 2", () => {
    expect(uniqueId("pen", new Set())).toBe("pen");
    expect(uniqueId("pen", new Set(["pen"]))).toBe("pen-2");
    expect(uniqueId("pen", new Set(["pen", "pen-2", "pen-3"]))).toBe("pen-4");
  });

  it("isKnownItem : outil, action ou capacité inconnus → faux ; séparateur → vrai", () => {
    const it0 = { id: "x", label: "X", requires: [], rest: {} } as const;
    expect(isKnownItem({ ...it0, kind: "tool", tool: "pen" })).toBe(true);
    expect(isKnownItem({ ...it0, kind: "tool", tool: "laser" })).toBe(false);
    expect(isKnownItem({ ...it0, kind: "action", action: "minuteur" })).toBe(false);
    expect(isKnownItem({ ...it0, kind: "action", action: "undo", requires: ["projector" as never] })).toBe(false);
    expect(isKnownItem({ ...it0, kind: "dropzone", requires: ["dropPaths"] })).toBe(true);
    expect(isKnownItem({ ...it0, kind: "separator" })).toBe(true);
  });
});
```

- [ ] **4. Tests rouges de l'hôte** dans `app/toolbar-host.test.ts` : `setup` reçoit le profil
  (`function setup(over: { eraserMode?: "partial" | "object" } = {}, profile: Profile = BUILTIN_PROFILES[0]!)`, import
  `type Profile` de `../toolbar`, `createLocalToolbarHost(t, () => profile)`) ; le test `setMode("desktop-annotation") →
  rien, avertissement` est remplacé par :

```ts
  it("setMode desktop-annotation : aucun effet, message C11a", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { host, engine } = setup();
    host.setMode("desktop-annotation");
    expect(info).toHaveBeenCalledTimes(1);
    expect(String(info.mock.calls[0]![0])).toContain("C11a");
    expect(warn).not.toHaveBeenCalled();
    expect(engine.setTool).not.toHaveBeenCalled();
    info.mockRestore();
    warn.mockRestore();
  });
  it('setMode("board") : rien, aucun message', () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { host, engine } = setup();
    host.setMode("board");
    expect(info).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(engine.setTool).not.toHaveBeenCalled();
    info.mockRestore();
    warn.mockRestore();
  });
  it("préréglage ajouté (S4) : setTool(pen, quatrième) → setPenStyle reçoit sa couleur et son épaisseur", () => {
    const d = BUILTIN_PROFILES[0]!;
    const five: Profile = {
      ...d,
      presets: { ...d.presets, pen: [...(d.presets.pen ?? []), { id: "couleur", label: "Couleur 4", color: "#16a34a", width: 6, rest: {} }, { id: "couleur-2", label: "Couleur 5", color: "#9333ea", width: 2, rest: {} }] },
    };
    const { host, engine } = setup({}, five);
    host.setTool("pen", "couleur");
    expect(engine.setPenStyle).toHaveBeenCalledWith({ color: "#16a34a", width: 6 });
    expect(engine.setTool).toHaveBeenCalledWith("pen");
  });
```

- [ ] **5. Lancer la commande bornée : rouge attendu** (`PROFILE_MINOR` vaut 0, `uniqueId` absent, avertissements
  absents, `setMode("board")` avertit).

- [ ] **6. Code du modèle** dans `apps/web/src/toolbar.ts`.

  6a. Ligne 14 : `export const PROFILE_MINOR = 1;`. Dans `ToolItem`, après `options` :

```ts
  /** Masqué par l'utilisateur (D22 : masqué, pas supprimé) ; écrit seulement s'il est vrai (C1, P2). */
  readonly hidden?: boolean;
```

  Dans `Profile`, après `label` :

```ts
  /** Profil livré dont celui-ci dérive, écrit par « Enregistrer comme nouveau » (C1, P3). */
  readonly basedOn?: string;
```

  6b. Clés connues : `PROFILE_KEYS` reçoit `"basedOn"` (après `"label"`), `ITEM_KEYS` reçoit `"hidden"` (en fin).

  6c. Dans `parseItem`, avant le `return` :

```ts
  if (raw.hidden !== undefined && typeof raw.hidden !== "boolean") ctx.errors.push(`${path}.hidden : booléen attendu`);
```

  et dans l'objet rendu, après la ligne `options` :

```ts
    ...(raw.hidden === true ? { hidden: true } : {}),
```

  6d. Après `isKnownAction` (fin du bloc des tables), ajouter :

```ts
/** Action qui ouvre le menu Profil : jamais masquable, toujours présente dans une barre `tools` (C1, P33). */
export const PROFILES_ACTION: ActionId = "profiles";

export function isProfilesAccess(it: ToolItem): boolean {
  return it.kind === "action" && it.action === PROFILES_ACTION;
}

/** `base` s'il est libre, sinon `<base>-<n>` avec le premier n ≥ 2 libre (C1 : P15, P28, P33). */
export function uniqueId(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const id = `${base}-${n}`;
    if (!taken.has(id)) return id;
  }
}
```

  6e. Avant `parseProfile`, ajouter la garantie d'accès :

```ts
/** Ajoute `item` en fin du dernier groupe de `bar` (groupe `profil` créé si la barre n'en a aucun). */
function appendToLastGroup(bar: Toolbar, item: ToolItem): Toolbar {
  if (bar.groups.length === 0) return { ...bar, groups: [{ id: "profil", items: [item], rest: {} }] };
  const last = bar.groups.length - 1;
  return { ...bar, groups: bar.groups.map((g, i) => (i === last ? { ...g, items: [...g.items, item] } : g)) };
}

/**
 * Jamais enfermé hors du menu Profil (C1, P33) : dans les barres `tools`, un élément Profil masqué est montré
 * (avertissement) ; sans élément Profil sans capacité exigée, un élément est ajouté en fin de la première barre `tools`,
 * ou dans une barre `outils` ajoutée en haut s'il n'y en a aucune.
 */
function ensureProfilesAccess(bars: readonly Toolbar[], ctx: Ctx): readonly Toolbar[] {
  let reachable = false;
  const shown = bars.map((b): Toolbar => {
    if (b.role !== "tools") return b;
    return {
      ...b,
      groups: b.groups.map((g) => ({
        ...g,
        items: g.items.map((it) => {
          if (!isProfilesAccess(it)) return it;
          if (it.requires.length === 0) reachable = true;
          if (it.hidden !== true) return it;
          ctx.warnings.push(`${it.id} : l'accès au menu Profil ne se masque pas, élément montré`);
          const { hidden: _shown, ...kept } = it;
          return kept;
        }),
      })),
    };
  });
  if (reachable) return shown;
  ctx.warnings.push("accès au menu Profil ajouté");
  const id = uniqueId(PROFILES_ACTION, ctx.seen);
  ctx.seen.add(id);
  const item: ToolItem = { id, kind: "action", action: PROFILES_ACTION, label: ACTION_TABLE[PROFILES_ACTION]!.label, requires: [], rest: {} };
  const first = shown.findIndex((b) => b.role === "tools");
  if (first === -1) {
    const barId = uniqueId("outils", new Set(shown.map((b) => b.id)));
    return [...shown, { id: barId, role: "tools", dock: "top", collapsed: false, groups: [{ id: "profil", items: [item], rest: {} }], rest: {} }];
  }
  return shown.map((b, i) => (i === first ? appendToLastGroup(b, item) : b));
}
```

  6f. Dans `parseProfile` : après `const label = …`, lire `basedOn` ; la liste des barres passe par
  `ensureProfilesAccess` ; l'objet rendu porte `basedOn` :

```ts
  const basedOn = json.basedOn;
  if (basedOn !== undefined && !isNonEmpty(basedOn)) ctx.errors.push("profil.basedOn : chaîne non vide attendue");
  const iface = parseInterface(json.interface, ctx);
  const toolbars = ensureProfilesAccess(
    list(json, "toolbars", "profil", ctx)
      .map((b, i) => parseBar(b, `toolbars[${i}]`, ctx))
      .filter((b): b is Toolbar => b !== null),
    ctx,
  );
```

```ts
      id,
      label,
      ...(isNonEmpty(basedOn) ? { basedOn } : {}),
      interface: iface,
```

  6g. Écriture : dans `serializeItem`, après la ligne `options` :
  `...(it.hidden === true ? { hidden: true } : {}),` ; dans `serializeProfile`, après `label: p.label,` :
  `...(p.basedOn !== undefined ? { basedOn: p.basedOn } : {}),`.

  6h. `visibleItems` : première ligne de la boucle `if (it.hidden === true) continue;`.

  6i. Remplacer `resolveStartMode` et ajouter `isKnownItem`, `withCurrentMinor` :

```ts
/**
 * Mode de démarrage honoré (U14, C1 P10) : `desktop-annotation` si le profil le demande et que le poste en a la
 * capacité, sinon `board` ; `fellBack` vrai quand le profil demandait autre chose que le mode rendu.
 */
export function resolveStartMode(
  p: Profile,
  caps: RuntimeCapabilities,
): { readonly mode: StartMode; readonly fellBack: boolean } {
  const wanted = p.behavior.startMode;
  const mode: StartMode = wanted === "desktop-annotation" && caps.desktopAnnotation ? "desktop-annotation" : "board";
  return { mode, fellBack: mode !== wanted };
}

/** Élément que cette version sait afficher : outil ou action connus, capacités exigées toutes connues (C1, P16). */
export function isKnownItem(it: ToolItem): boolean {
  return KNOWN_BY_KIND[it.kind](it) && it.requires.every((k) => includes(CAPABILITY_KEYS, k));
}

/** Profil écrit par l'éditeur ou l'import : mineure relevée à `PROFILE_MINOR`, jamais baissée (C1, P4). */
export function withCurrentMinor(p: Profile): Profile {
  return p.minor >= PROFILE_MINOR ? p : { ...p, minor: PROFILE_MINOR };
}
```

- [ ] **7. Code de l'hôte** : `app/toolbar-host.ts`, remplacer `setMode` (l. 53-55) par :

```ts
    setMode(mode) {
      // Tableau : déjà affiché, rien à faire ni à dire. Annotation du bureau : point d'accroche de C11a, sans effet ici.
      if (mode === "board") return;
      console.info(`mode de démarrage ${mode} : la fenêtre d'annotation arrive avec C11a, le tableau reste affiché`);
    },
```

- [ ] **8. Lancer la commande bornée : vert attendu**, puis `pnpm --filter @roomboard/web test 2>&1 | tail -15`
  (0 échec) et `tsc` (GC13).

- [ ] **9. Commit** : `apps/web/src/toolbar.ts`, `apps/web/src/toolbar.test.ts`, `apps/web/src/app/toolbar-host.ts`,
  `apps/web/src/app/toolbar-host.test.ts` ; message `feat(profile): hidden items, basedOn, minor 1, guaranteed profile menu access, start mode from capability`.

<a id="tache-t2"></a>
### Tâche T2 — Magasin : copie par-dessus un livré, `revert`, `resetAll` ; profil livré `annotation`

**Objectif.** Appliquer U11 (P5) : une copie de même `id` remplace le livré dans `list()` et `get()`, à la même place ;
`revert` la retire ; `resetAll` efface tout (P6, remise n° 2) ; `isReadOnly` disparaît (DAC1-2). Ajouter le profil
livré `annotation` « Annotation au démarrage » : barres et préréglages de `defaut` par une seule fonction,
`startMode: "desktop-annotation"` (P9).

**Subagent.** concepteur-critique. **Dépend de.** —

**Patron à ne pas reprendre.**
- Le refus des ids livrés : `profile-store.ts:62-63` (lecture : « est un profil livré », écarté) et `:77-79` (`guard`
  qui lève à `save`). Ici, un id livré enregistré est une copie.
- `all = [...builtins, ...users]` (`profile-store.ts:76`) : une copie apparaîtrait deux fois. La liste prend chaque livré
  à sa place, remplacé par sa copie s'il y en a une, puis les profils de l'utilisateur.
- Chemin de référence de l'intention : `toolbar-profiles.ts:3` (« une copie utilisateur de même `id` les remplacera »).

**Fichiers.** Modifier `apps/web/src/profile-store.ts` (tout le corps de `createProfileStore`, l. 12-106),
`apps/web/src/profile-store.test.ts`, `apps/web/src/toolbar-profiles.ts` (l. 3, 45-68, 100), `apps/web/src/toolbar-profiles.test.ts`.

**Interfaces.**
- Consomme : —
- Produit (exact, utilisé par T6, T8, T9) :

```ts
export interface ProfileStore {
  list(): readonly Profile[];
  get(id: string): Profile | null;
  isBuiltin(id: string): boolean;
  hasOverride(id: string): boolean;
  save(p: Profile): void;
  remove(id: string): void;   // lève « profil livré : <id> ne se supprime pas (revert retire sa copie) »
  revert(id: string): void;   // lève « profil non livré : <id> (rien à rétablir) »
  resetAll(): void;
  activeId(): string;
  setActive(id: string): void;
  warnings(): readonly string[];
}
export const ANNOTATION_PROFILE_ID = "annotation";
export const ANNOTATION_PROFILE_JSON: Readonly<Record<string, unknown>>;
// BUILTIN_PROFILES : [defaut, simple, annotation]
```

- Réutilise : `apps/web/src/toolbar-profiles.ts:45-104` — `BUILTIN_PROFILES`, `builtinProfile(id)` ; `ANNOTATION_PROFILE_ID = "annotation"` (étendre).
- Réutilise : `apps/web/src/profile-store.ts:12` — `ProfileStore` (`list`, `get`, `save`, `remove`, `activeId`, `setActive`, `warnings`) et `browserKeyValue` (`:108`) gardé tel quel (étendre).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/profile-store.test.ts src/toolbar-profiles.test.ts src/ui/active-profile.test.ts src/ui/App.test.tsx --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -80
```

Attendu : 0 échec ; ≥ 20 tests dans les deux premiers fichiers ; présents : « copie de defaut lue au démarrage »,
« revenir à l'origine rend le livré », « tout remettre à zéro, stockage qui lève », « annotation : barres et
préréglages de defaut ». À garder verts : « toolbars en liste », « simple n'a ni formes ni texte », « profils figés »,
`ui/App.test.tsx` (« changer de profil : barre à gauche… »), `ui/active-profile.test.ts`.

**Preuve visuelle.** Aucune.

**Contraintes (recopiées).**
- GC1 Budget : l'exécution entière tient en environ 3 h sur la VM de 8 cœurs, chargée ; une tâche vise 20 à 45 min ; aucune commande lourde hors celles de la section.
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test désactivé (`skip`, `only`, `todo`), aucun seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && [ -d node_modules ] || pnpm install --frozen-lockfile` ; `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c1-profils/apps/web/src/wasm apps/web/src/` (jamais commité).
- GC5 Preuve bornée : la commande de la section, telle quelle ; le rapport cite N ≥ 1 et les noms attendus.
- GC6 Commits : fichiers ajoutés un par un (`git add <chemin>`, jamais `-A`, `--all`, `.`, ni `commit -a`), auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle (jamais AGPL, GPL, LGPL).
- GC8 OD56 : ne pas toucher `feat/usage-c2-depot` ; `toolbar-profiles.ts` est partagé (OD56 ajoutera « Importer » dans la barre de `defaut`) : déplacer la barre `outils` telle quelle dans `defaultToolbars()`, sans changer ni réordonner ses éléments.
- GC9 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.
- GC10 Seul `profile-store.ts` tient le stockage ; aucune dépendance au DOM dans `toolbar-profiles.ts` (test « source » de `toolbar.test.ts`).
- GC12 Ne modifier que les fichiers touchés de la tâche.
- GC13 `tsc --noEmit` sans erreur à la fin.

**Interdits.** Mettre import ou export dans `ProfileStore` (HC2-12) ; écrire `localStorage` hors de `profile-store.ts` ;
changer les barres de `defaut` ou `simple`.

**Terminé quand.** Commande bornée verte ; `pnpm --filter @roomboard/web test 2>&1 | tail -15` : 0 échec ; `tsc` vide ;
un commit ; rapport avec deux lignes `Réutilisation :`.

**Étapes.**

- [ ] **1. Préparer le worktree** (GC4).

- [ ] **2. Tests rouges des profils livrés** (`toolbar-profiles.test.ts`, import de `ANNOTATION_PROFILE_ID`,
  `ANNOTATION_PROFILE_JSON`) : le premier test devient

```ts
  it("defaut, simple et annotation sont valides, sans avertissement", () => {
    for (const json of [DEFAULT_PROFILE_JSON, SIMPLE_PROFILE_JSON, ANNOTATION_PROFILE_JSON]) {
      const r = parseProfile(json);
      expect("errors" in r ? r.errors : r.warnings).toEqual([]);
    }
    expect(BUILTIN_PROFILES.map((p) => p.id)).toEqual(["defaut", "simple", "annotation"]);
  });

  it("annotation : barres et préréglages de defaut, démarrage desktop-annotation (P9, S5)", () => {
    const a = builtinProfile(ANNOTATION_PROFILE_ID)!;
    const d = builtinProfile("defaut")!;
    expect(a.label).toBe("Annotation au démarrage");
    expect(a.toolbars).toEqual(d.toolbars);
    expect(a.presets).toEqual(d.presets);
    expect(a.interface.buttonSize).toBe("m");
    expect(a.behavior.startMode).toBe("desktop-annotation");
    expect(Object.isFrozen(ANNOTATION_PROFILE_JSON)).toBe(true);
  });
```

- [ ] **3. Tests rouges du magasin** (`profile-store.test.ts`). Remplacer le test « profil defaut en lecture seule »
  (l. 32-38) par :

```ts
  it("copie de defaut lue au démarrage", () => {
    const kv = fakeKv();
    const s = createProfileStore(kv, BUILTIN_PROFILES);
    const d = s.get("defaut")!;
    s.save({ ...d, interface: { ...d.interface, buttonSize: "s" } });
    expect(s.list().map((p) => p.id)).toEqual(["defaut", "simple", "annotation"]);
    expect(s.list()[0]!.interface.buttonSize).toBe("s");
    expect(s.get("defaut")!.label).toBe("Par défaut");
    expect(s.hasOverride("defaut")).toBe(true);
    expect(s.isBuiltin("defaut")).toBe(true);
    const again = createProfileStore(kv, BUILTIN_PROFILES);
    expect(again.get("defaut")!.interface.buttonSize).toBe("s");
    expect(again.warnings()).toEqual([]);
  });

  it("revenir à l'origine rend le livré", () => {
    const kv = fakeKv();
    const s = createProfileStore(kv, BUILTIN_PROFILES);
    const d = s.get("defaut")!;
    s.save({ ...d, interface: { ...d.interface, buttonSize: "s" } });
    expect(() => s.remove("defaut")).toThrow("profil livré : defaut");
    s.revert("defaut");
    expect(s.get("defaut")).toBe(BUILTIN_PROFILES[0]);
    expect(s.hasOverride("defaut")).toBe(false);
    expect(JSON.parse(kv.map.get(PROFILES_KEY)!)).toEqual([]);
    s.revert("defaut"); // sans copie : rien
    expect(s.get("defaut")).toBe(BUILTIN_PROFILES[0]);
  });

  it("copie de simple : revert la retire, simple revient", () => {
    const s = createProfileStore(fakeKv(), BUILTIN_PROFILES);
    s.save({ ...s.get("simple")!, label: "Ma copie" });
    expect(s.get("simple")!.label).toBe("Ma copie");
    s.revert("simple");
    expect(s.get("simple")).toBe(BUILTIN_PROFILES[1]);
  });

  it("revert d'un id non livré : lève ; isBuiltin faux", () => {
    const s = createProfileStore(fakeKv(), BUILTIN_PROFILES);
    s.save({ ...s.get("defaut")!, id: "perso", label: "Perso" });
    expect(s.isBuiltin("perso")).toBe(false);
    expect(s.hasOverride("perso")).toBe(false);
    expect(() => s.revert("perso")).toThrow("profil non livré : perso");
  });

  it("tout remettre à zéro : profils, copies et actif effacés", () => {
    const kv = fakeKv();
    const s = createProfileStore(kv, BUILTIN_PROFILES);
    s.save({ ...s.get("defaut")!, id: "perso", label: "Perso" });
    s.save({ ...s.get("simple")!, label: "Ma copie" });
    s.setActive("perso");
    s.resetAll();
    expect(s.list()).toEqual(BUILTIN_PROFILES);
    expect(s.activeId()).toBe("defaut");
    expect(kv.map.has(PROFILES_KEY)).toBe(false);
    expect(kv.map.has(ACTIVE_KEY)).toBe(false);
    expect(createProfileStore(kv, BUILTIN_PROFILES).get("perso")).toBeNull();
  });

  it("tout remettre à zéro, stockage qui lève : mémoire vidée, avertissement, aucune exception", () => {
    const kv: KeyValue = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => {
        throw new Error("SecurityError");
      },
    };
    const s = createProfileStore(kv, BUILTIN_PROFILES);
    s.save({ ...s.get("defaut")!, id: "perso", label: "Perso" });
    expect(() => s.resetAll()).not.toThrow();
    expect(s.get("perso")).toBeNull();
    expect(s.warnings().some((w) => w.startsWith("stockage non effacé"))).toBe(true);
  });
```

  Dans « profil utilisateur : enregistré, relu… », la ligne `s.isReadOnly("perso")` devient
  `expect(s.isBuiltin("perso")).toBe(false);` et la liste attendue devient `["defaut", "simple", "annotation", "perso"]`.
  Remplacer « profil livré présent dans le stockage : ignoré avec avertissement » (l. 85-91) par :

```ts
  it("profil livré présent dans le stockage : copie lue, à la place du livré", () => {
    const kv = fakeKv();
    kv.setItem(PROFILES_KEY, JSON.stringify([userJson("defaut", { label: "Pirate" })]));
    const s = createProfileStore(kv, BUILTIN_PROFILES);
    expect(s.get("defaut")!.label).toBe("Pirate");
    expect(s.list()[0]!.label).toBe("Pirate");
    expect(s.list()).toHaveLength(BUILTIN_PROFILES.length);
    expect(s.warnings()).toEqual([]);
  });
```

- [ ] **4. Lancer la commande bornée : rouge attendu.**

- [ ] **5. Code des profils livrés** (`toolbar-profiles.ts`). Ligne 3 :

```ts
/**
 * Profils livrés (CL5b-9, C1 P9), figés ; une copie utilisateur de même `id` les remplace dans le magasin (U11, P5),
 * « Remettre à zéro ce profil » la retire.
 */
```

  Après `DEFAULT_PROFILE_ID`, `SIMPLE_PROFILE_ID` : `export const ANNOTATION_PROFILE_ID = "annotation";`. Avant
  `DEFAULT_PROFILE_JSON`, la barre `outils` de `defaut` part, sans changement, dans :

```ts
/** Barres du profil par défaut : une seule source pour `defaut` et `annotation` (P9). */
const defaultToolbars = () => [
  {
    id: "outils",
    role: "tools",
    dock: "top",
    groups: [
      { id: "dessin", items: [tool("pen", "Stylo"), tool("eraser", "Gomme"), action("eraser-mode", "Gomme : partielle"), tool("hand", "Main")] },
      { id: "edition", items: [sep("sep-1"), tool("select", "Sélection"), tool("rect", "Rectangle"), tool("ellipse", "Ellipse"), tool("line", "Ligne"), tool("arrow", "Flèche"), tool("text", "Texte")] },
      { id: "historique", items: [sep("sep-2"), action("undo", "Annuler"), action("redo", "Rétablir")] },
      { id: "fichier", items: [sep("sep-3"), action("file-new", "Nouveau"), action("file-open", "Ouvrir"), action("file-save", "Enregistrer"), action("file-save-as", "Enregistrer sous")] },
      { id: "vue", items: [sep("sep-4"), action("fit-page", "Ajuster la page"), action("profiles", "Profil"), action("settings", "Réglages")] },
    ],
  },
  pagesBar(),
];
```

  `DEFAULT_PROFILE_JSON.toolbars` devient `defaultToolbars()`. Après `SIMPLE_PROFILE_JSON` :

```ts
/** « Annotation au démarrage » (U14, P9) : barres et préréglages de `defaut`, rabattu sur `board` sans la capacité. */
export const ANNOTATION_PROFILE_JSON: Readonly<Record<string, unknown>> = deepFreeze({
  format: "roomboard-profile",
  schema: 1,
  id: ANNOTATION_PROFILE_ID,
  label: "Annotation au démarrage",
  interface: { buttonSize: "m" },
  toolbars: defaultToolbars(),
  presets: presets(),
  behavior: { startMode: "desktop-annotation" },
});
```

  et `BUILTIN_PROFILES` :

```ts
export const BUILTIN_PROFILES: readonly Profile[] = deepFreeze([
  load(DEFAULT_PROFILE_JSON),
  load(SIMPLE_PROFILE_JSON),
  load(ANNOTATION_PROFILE_JSON),
]);
```

- [ ] **6. Code du magasin** : `profile-store.ts`, remplacer de `export interface ProfileStore` jusqu'à la fin de
  `createProfileStore` par :

```ts
/**
 * Magasin des profils (T89, C1 DAC1-2). Les profils livrés sont figés ; une copie de même `id` les remplace dans
 * `list()` et `get()`, à la même place (U11, P5), et `revert` la retire. Le stockage ne contient que les profils de
 * l'utilisateur et ces copies. Aucun fichier ni boîte ici : import et export passent par `profile-file.ts` (HC2-12).
 */
export interface ProfileStore {
  list(): readonly Profile[];
  get(id: string): Profile | null;
  /** Vrai pour un profil livré, copié ou non. */
  isBuiltin(id: string): boolean;
  /** Vrai si une copie de l'utilisateur remplace le profil livré `id`. */
  hasOverride(id: string): boolean;
  /** Ajoute ou remplace ; un id livré crée ou remplace sa copie. */
  save(p: Profile): void;
  /** Retire un profil de l'utilisateur ; lève pour un id livré (passer par `revert`). */
  remove(id: string): void;
  /** Retire la copie du profil livré `id` (sans copie : rien) ; lève pour un id non livré. */
  revert(id: string): void;
  /** Retire tous les profils de l'utilisateur et toutes les copies ; profil actif → `defaut`. */
  resetAll(): void;
  activeId(): string;
  setActive(id: string): void;
  warnings(): readonly string[];
}

/** `kv` null (stockage absent ou qui lève) : mémoire seule. */
export function createProfileStore(kv: KeyValue | null, builtins: readonly Profile[]): ProfileStore {
  const warnings: string[] = [];
  const builtinIds = new Set(builtins.map((b) => b.id));
  /** Profils de l'utilisateur et copies des livrés, dans l'ordre d'enregistrement. */
  let saved: Profile[] = [];
  let active: string | null = null;

  const read = (key: string): string | null => {
    if (kv === null) return null;
    try {
      return kv.getItem(key);
    } catch (e) {
      warnings.push(`stockage illisible : ${String(e)}`);
      return null;
    }
  };
  const write = (key: string, value: string): void => {
    if (kv === null) return;
    try {
      kv.setItem(key, value);
    } catch (e) {
      warnings.push(`stockage non écrit (${key}) : ${String(e)}`);
    }
  };
  const erase = (key: string): void => {
    if (kv === null) return;
    try {
      kv.removeItem(key);
    } catch (e) {
      warnings.push(`stockage non effacé (${key}) : ${String(e)}`);
    }
  };

  const raw = read(PROFILES_KEY);
  if (raw !== null) {
    let arr: unknown;
    try {
      arr = JSON.parse(raw);
    } catch (e) {
      warnings.push(`profils stockés illisibles : ${String(e)}`);
    }
    if (arr !== undefined && !Array.isArray(arr)) warnings.push("profils stockés illisibles : tableau attendu");
    else if (Array.isArray(arr)) {
      for (const entry of arr) {
        const r = parseProfile(entry);
        if ("errors" in r) {
          warnings.push(`profil stocké écarté : ${r.errors.join(" ; ")}`);
        } else if (saved.some((u) => u.id === r.profile.id)) {
          warnings.push(`profil stocké écarté : ${r.profile.id} en double`);
        } else {
          saved.push(r.profile);
          warnings.push(...r.warnings);
        }
      }
    }
  }
  active = read(ACTIVE_KEY);

  const persist = (): void => write(PROFILES_KEY, JSON.stringify(saved.map(serializeProfile)));
  const copyOf = (id: string): Profile | undefined => saved.find((p) => p.id === id);
  const all = (): Profile[] => [...builtins.map((b) => copyOf(b.id) ?? b), ...saved.filter((p) => !builtinIds.has(p.id))];

  return {
    list: () => all(),
    get: (id) => all().find((p) => p.id === id) ?? null,
    isBuiltin: (id) => builtinIds.has(id),
    hasOverride: (id) => builtinIds.has(id) && copyOf(id) !== undefined,
    save(p) {
      saved = copyOf(p.id) !== undefined ? saved.map((u) => (u.id === p.id ? p : u)) : [...saved, p];
      persist();
    },
    remove(id) {
      if (builtinIds.has(id)) throw new Error(`profil livré : ${id} ne se supprime pas (revert retire sa copie)`);
      saved = saved.filter((u) => u.id !== id);
      if (active === id) active = null;
      persist();
    },
    revert(id) {
      if (!builtinIds.has(id)) throw new Error(`profil non livré : ${id} (rien à rétablir)`);
      if (copyOf(id) === undefined) return;
      saved = saved.filter((u) => u.id !== id);
      persist();
    },
    resetAll() {
      saved = [];
      active = null;
      erase(PROFILES_KEY);
      erase(ACTIVE_KEY);
    },
    activeId() {
      return active !== null && all().some((p) => p.id === active) ? active : DEFAULT_PROFILE_ID;
    },
    setActive(id) {
      if (!all().some((p) => p.id === id)) throw new Error(`profil inconnu : ${id}`);
      active = id;
      write(ACTIVE_KEY, id);
    },
    warnings: () => warnings,
  };
}
```

- [ ] **7. Lancer la commande bornée : vert attendu**, puis `pnpm --filter @roomboard/web test 2>&1 | tail -15` et
  `tsc` (GC13 ; `grep -rn isReadOnly apps/web/src` ne rend rien).

- [ ] **8. Commit** : les quatre fichiers ; message `feat(profile): user copy replaces a built-in profile, revert and reset all; built-in annotation profile`.

<a id="tache-t3"></a>
### Tâche T3 — Fichiers de profil : `profile-file.ts`, exemples `.rbprofile`, port `ProfileFiles`

**Objectif.** Texte ↔ profil, nom de fichier, slug, décision d'import en fonctions pures (P23, P24, P28, DAC1-3) ; deux
exemples (P30) ; port `ProfileFiles` pour le web (`<input type=file>` et téléchargement) et la coque (boîtes natives),
P25.

**Subagent.** implementeur-tdd. **Dépend de.** T1 (`uniqueId`, `PROFILE_MINOR = 1`, garantie P33).

**Fichiers.** Créer `apps/web/src/profile-file.ts`, `apps/web/src/profile-file.test.ts`,
`apps/web/src/fixtures/profils/1.2-outil-inconnu.rbprofile`, `apps/web/src/fixtures/profils/2.0-majeure.rbprofile`,
`apps/web/src/platform/profile-files.ts`, `apps/web/src/platform/profile-files.test.ts`.

**Interfaces.**
- Consomme (T1) : `parseProfile`, `serializeProfile`, `uniqueId(base: string, taken: ReadonlySet<string>): string`, `type ParsedProfile`, `type Profile`.
- Produit (exact, utilisé par T8, T9, T10) :

```ts
// profile-file.ts
export { uniqueId } from "./toolbar";
export const PROFILE_EXTENSION = ".rbprofile";
export const PROFILE_MIME = "application/vnd.roomboard.profile+json";
export type ImportPlan = { readonly kind: "add" } | { readonly kind: "confirm"; readonly message: string };
export function slug(label: string): string;                       // [a-z0-9-], accents retirés, vide → "profil"
export function profileToFile(p: Profile): { readonly name: string; readonly text: string };
export function profileFromText(text: string): ParsedProfile;      // illisible → { errors: ["fichier de profil illisible : …"] }
export function planImport(p: Profile, existing: readonly Profile[], builtinIds: ReadonlySet<string>): ImportPlan;
// platform/profile-files.ts
export interface ProfileFiles {
  pick(): Promise<{ readonly name: string; readonly text: string } | null>;
  save(name: string, text: string): Promise<boolean>;
}
export const PROFILE_ACCEPT: string;   // ".rbprofile,application/vnd.roomboard.profile+json,application/json"
export const PROFILE_FILTER: { readonly name: "Profil RoomBoard"; readonly extensions: readonly ["rbprofile"] };
export function createWebProfileFiles(deps: Pick<FallbackDeps, "pickFile" | "download">): ProfileFiles;
export function createTauriProfileFiles(dialog: Pick<TauriDialog, "open" | "save">, fs: TauriFs): ProfileFiles;
```

- Réutilise : aucun module existant pour le texte ↔ profil — nouveau `apps/web/src/profile-file.ts` (DAC1-3), qui appelle `parseProfile` (`toolbar.ts:365`) et `serializeProfile` (`toolbar.ts:440`).
- Réutilise : `apps/web/src/platform/host-repli.ts:65` — `browserFallbackDeps(doc, urls).pickFile(accept): Promise<PickedFile | null>` et `.download(name, bytes, mime)` (réutiliser, type `FallbackDeps` importé, fichier non modifié).
- Réutilise : `apps/web/src/platform/host-tauri.ts:23-33` — `TauriDialog.open({ multiple: false, directory: false, filters })`, `TauriDialog.save({ defaultPath, filters })`, `TauriFs.readFile`, `TauriFs.writeFile`, `baseName(path)` (réutiliser, fichier non modifié ; `loadTauriPorts()` est appelé en T9).
- Réutilise : aucun port existant pour les profils (`FileHost` ne vise que `.roomboard`) — nouveau `apps/web/src/platform/profile-files.ts` (DAC1-3).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/profile-file.test.ts src/platform/profile-files.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -60
```

Attendu : 0 échec ; ≥ 15 tests ; présents : « S2 : 1.2 à outil inconnu », « S2 : 2.0 refusé », « fichier illisible :
erreur lisible, jamais d'exception », « planImport », « coque : save écrit le texte au chemin choisi ».

**Preuve visuelle.** Aucune.

**Contraintes (recopiées).**
- GC1 Budget : l'exécution entière tient en environ 3 h sur la VM de 8 cœurs, chargée ; une tâche vise 20 à 45 min ; aucune commande lourde hors celles de la section.
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test désactivé (`skip`, `only`, `todo`), aucun seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && [ -d node_modules ] || pnpm install --frozen-lockfile` ; `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c1-profils/apps/web/src/wasm apps/web/src/` (jamais commité).
- GC5 Preuve bornée : la commande de la section, telle quelle ; le rapport cite N ≥ 1 et les noms attendus.
- GC6 Commits : fichiers ajoutés un par un (`git add <chemin>`, jamais `-A`, `--all`, `.`, ni `commit -a`), auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle (jamais AGPL, GPL, LGPL) : `TextEncoder`, `TextDecoder`, `JSON` natifs.
- GC8 OD56 : ne pas toucher `feat/usage-c2-depot` ; ne pas modifier `platform/host-repli.ts`, `platform/host-tauri.ts`, `platform/import.ts`, `platform/files.ts` (lus, importés seulement). Au rebase sur OD56, c'est `profile-files.ts` qui suit leur forme.
- GC9 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.
- GC10 `schema` reste 1 ; le fichier exporté porte `format: "roomboard-profile"` ; aucun `localStorage`.
- GC12 Ne modifier que les fichiers touchés de la tâche ; C1 n'écrit rien dans `platform/import.ts` (P26).
- GC13 `tsc --noEmit` sans erreur à la fin.

**Interdits.** Toucher `FileHost` ; ajouter `.rbprofile` au registre d'importeurs ; ajouter une boîte ou un fichier
dans `ProfileStore`.

**Terminé quand.** Commande bornée verte ; `tsc` vide ; un commit ; rapport avec quatre lignes `Réutilisation :`.

**Étapes.**

- [ ] **1. Préparer le worktree** (GC4).

- [ ] **2. Écrire les exemples.** `apps/web/src/fixtures/profils/1.2-outil-inconnu.rbprofile` (mineure 2, outil,
  action et capacité inconnus, clés inconnues à chaque niveau ; `collapsed` écrit pour que la réécriture soit égale) :

```json
{
  "format": "roomboard-profile",
  "schema": 1,
  "minor": 2,
  "id": "futur",
  "label": "Profil futur",
  "theme": "sombre",
  "interface": { "buttonSize": "m", "langue": "fr" },
  "toolbars": [
    {
      "id": "outils",
      "role": "tools",
      "dock": "top",
      "collapsed": false,
      "couleur": "bleu",
      "groups": [
        {
          "id": "dessin",
          "replie": false,
          "items": [
            { "id": "pen", "kind": "tool", "tool": "pen", "label": "Stylo", "raccourci": "P" },
            { "id": "laser", "kind": "tool", "tool": "laser", "label": "Laser" },
            { "id": "minuteur", "kind": "action", "action": "minuteur", "label": "Minuteur" },
            { "id": "projeter", "kind": "action", "action": "undo", "label": "Annuler (projecteur)", "requires": ["projector"] },
            { "id": "profiles", "kind": "action", "action": "profiles", "label": "Profil" }
          ]
        }
      ]
    }
  ],
  "presets": { "pen": [{ "id": "noir", "label": "Noir", "color": "#000000", "width": 4, "opacite": 1 }] },
  "behavior": { "startMode": "board", "pageDefaut": "seyes" }
}
```

  `apps/web/src/fixtures/profils/2.0-majeure.rbprofile` :

```json
{ "format": "roomboard-profile", "schema": 2, "minor": 0, "id": "majeure", "label": "Profil 2.0", "toolbars": [] }
```

- [ ] **3. Tests rouges** `apps/web/src/profile-file.test.ts` :

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { planImport, PROFILE_EXTENSION, PROFILE_MIME, profileFromText, profileToFile, slug, uniqueId } from "./profile-file";
import { BUILTIN_PROFILES } from "./toolbar-profiles";

const fixture = (name: string): string => readFileSync(join(__dirname, "fixtures", "profils", name), "utf8");
const ok = (text: string) => {
  const r = profileFromText(text);
  if ("errors" in r) throw new Error(r.errors.join(" ; "));
  return r;
};
const errorsOf = (text: string): string[] => {
  const r = profileFromText(text);
  return "errors" in r ? r.errors : [];
};
const DEFAUT = BUILTIN_PROFILES[0]!;
const BUILTIN_IDS = new Set(BUILTIN_PROFILES.map((p) => p.id));

describe("profile-file (C1, DAC1-3)", () => {
  it("constantes : extension .rbprofile, type application/vnd.roomboard.profile+json (P23)", () => {
    expect(PROFILE_EXTENSION).toBe(".rbprofile");
    expect(PROFILE_MIME).toBe("application/vnd.roomboard.profile+json");
  });

  it("profileToFile(defaut) : par-defaut.rbprofile, JSON indenté de 2, relu à l'identique (P23)", () => {
    const f = profileToFile(DEFAUT);
    expect(f.name).toBe("par-defaut.rbprofile");
    expect(f.text.startsWith('{\n  "format": "roomboard-profile"')).toBe(true);
    expect(ok(f.text).profile).toEqual(DEFAUT);
  });

  it("S2 : 1.2 à outil inconnu : lu avec avertissements, réécrit sans rien perdre", () => {
    const raw = fixture("1.2-outil-inconnu.rbprofile");
    const { profile, warnings } = ok(raw);
    expect(warnings).toEqual(
      expect.arrayContaining([
        "profil 1.2 plus récent que 1.1 : clés inconnues conservées",
        "outil inconnu masqué : laser",
        "action inconnue masquée : minuteur",
        "capacité inconnue : projector (élément projeter masqué)",
      ]),
    );
    expect(JSON.parse(profileToFile(profile).text)).toEqual(JSON.parse(raw));
  });

  it("S2 : 2.0 refusé : mettez RoomBoard à jour", () => {
    expect(errorsOf(fixture("2.0-majeure.rbprofile")).join(" ")).toContain("mettez RoomBoard à jour");
  });

  it("fichier illisible : erreur lisible, jamais d'exception (vide, non JSON, tableau, null)", () => {
    for (const text of ["", "{pas du json", "[]", "null"]) {
      expect(() => profileFromText(text), text).not.toThrow();
      expect(errorsOf(text).length, text).toBeGreaterThan(0);
    }
    expect(errorsOf("{pas du json")[0]).toMatch(/^fichier de profil illisible : /);
    expect(errorsOf("[]")).toEqual(["profil : objet JSON attendu"]);
  });

  it("P33 à l'import : profil sans accès Profil, accès ajouté", () => {
    const ferme = {
      format: "roomboard-profile", schema: 1, id: "ferme", label: "Fermé",
      toolbars: [{ id: "outils", role: "tools", dock: "top", groups: [{ id: "g", items: [{ id: "pen", kind: "tool", tool: "pen", label: "Stylo" }] }] }],
    };
    const { profile, warnings } = ok(JSON.stringify(ferme));
    expect(warnings).toContain("accès au menu Profil ajouté");
    expect(profile.toolbars[0]!.groups[0]!.items.map((i) => i.id)).toEqual(["pen", "profiles"]);
  });

  it("slug : accents retirés, [a-z0-9-], vide → profil (P28)", () => {
    expect(slug("Par défaut")).toBe("par-defaut");
    expect(slug("CM1")).toBe("cm1");
    expect(slug("Par défaut (copie)")).toBe("par-defaut-copie");
    expect(slug("  Écran — Été  ")).toBe("ecran-ete");
    expect(slug("!!!")).toBe("profil");
    expect(slug("")).toBe("profil");
  });

  it("uniqueId réexporté : cm1 pris → cm1-2", () => {
    expect(uniqueId("cm1", new Set(["cm1"]))).toBe("cm1-2");
  });

  it("planImport : id libre → add ; id pris (livré ou utilisateur) → confirm avec le libellé existant (P24)", () => {
    const cm1 = { ...DEFAUT, id: "cm1", label: "CM1" };
    const existing = [...BUILTIN_PROFILES, cm1];
    expect(planImport({ ...DEFAUT, id: "neuf" }, existing, BUILTIN_IDS)).toEqual({ kind: "add" });
    expect(planImport({ ...DEFAUT, label: "Pirate" }, existing, BUILTIN_IDS)).toEqual({ kind: "confirm", message: "Remplacer le profil « Par défaut » ?" });
    expect(planImport({ ...cm1, label: "Autre" }, existing, BUILTIN_IDS)).toEqual({ kind: "confirm", message: "Remplacer le profil « CM1 » ?" });
    expect(planImport({ ...DEFAUT, id: "simple" }, [], BUILTIN_IDS)).toEqual({ kind: "confirm", message: "Remplacer le profil « simple » ?" });
  });
});
```

  `apps/web/src/platform/profile-files.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import { PROFILE_EXTENSION, PROFILE_MIME } from "../profile-file";
import { createTauriProfileFiles, createWebProfileFiles, PROFILE_ACCEPT, PROFILE_FILTER } from "./profile-files";

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

describe("ProfileFiles (C1, P25)", () => {
  it("web : pick passe l'accept .rbprofile et décode l'UTF-8", async () => {
    const pickFile = vi.fn(async (_accept: string) => ({ name: "cm1.rbprofile", bytes: enc('{"label":"Été"}') }));
    const files = createWebProfileFiles({ pickFile, download: vi.fn() });
    expect(await files.pick()).toEqual({ name: "cm1.rbprofile", text: '{"label":"Été"}' });
    expect(pickFile).toHaveBeenCalledWith(PROFILE_ACCEPT);
    expect(PROFILE_ACCEPT.split(",")).toEqual([PROFILE_EXTENSION, PROFILE_MIME, "application/json"]);
  });

  it("web : boîte annulée → null", async () => {
    const files = createWebProfileFiles({ pickFile: vi.fn(async () => null), download: vi.fn() });
    expect(await files.pick()).toBeNull();
  });

  it("web : save télécharge le texte en UTF-8 avec le type du profil, rend vrai", async () => {
    const download = vi.fn();
    const files = createWebProfileFiles({ pickFile: vi.fn(), download });
    expect(await files.save("cm1.rbprofile", "Été")).toBe(true);
    const [name, bytes, mime] = download.mock.calls[0]!;
    expect(name).toBe("cm1.rbprofile");
    expect(new TextDecoder().decode(bytes as Uint8Array)).toBe("Été");
    expect(mime).toBe(PROFILE_MIME);
  });

  it("coque : open avec le filtre rbprofile, lecture du chemin choisi, nom = dernier segment", async () => {
    const dialog = { open: vi.fn(async () => "C:\\Users\\a\\cm1.rbprofile"), save: vi.fn(async () => null) };
    const fs = { readFile: vi.fn(async () => enc("texte")), writeFile: vi.fn(async () => undefined) };
    const files = createTauriProfileFiles(dialog, fs);
    expect(await files.pick()).toEqual({ name: "cm1.rbprofile", text: "texte" });
    expect(dialog.open).toHaveBeenCalledWith({ multiple: false, directory: false, filters: [PROFILE_FILTER] });
    expect(fs.readFile).toHaveBeenCalledWith("C:\\Users\\a\\cm1.rbprofile");
    expect(PROFILE_FILTER).toEqual({ name: "Profil RoomBoard", extensions: ["rbprofile"] });
  });

  it("coque : boîte annulée → null, rien lu ; save annulé → faux, rien écrit", async () => {
    const dialog = { open: vi.fn(async (): Promise<string | null> => null), save: vi.fn(async (): Promise<string | null> => null) };
    const fs = { readFile: vi.fn(async () => enc("")), writeFile: vi.fn(async () => undefined) };
    const files = createTauriProfileFiles(dialog, fs);
    expect(await files.pick()).toBeNull();
    expect(fs.readFile).not.toHaveBeenCalled();
    expect(await files.save("cm1.rbprofile", "x")).toBe(false);
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it("coque : save écrit le texte au chemin choisi, nom proposé = defaultPath", async () => {
    const dialog = { open: vi.fn(async () => null), save: vi.fn(async () => "/home/u/cm1.rbprofile") };
    const fs = { readFile: vi.fn(async () => enc("")), writeFile: vi.fn(async (_p: string, _d: Uint8Array) => undefined) };
    const files = createTauriProfileFiles(dialog, fs);
    expect(await files.save("cm1.rbprofile", "Été")).toBe(true);
    expect(dialog.save).toHaveBeenCalledWith({ defaultPath: "cm1.rbprofile", filters: [PROFILE_FILTER] });
    const [path, data] = fs.writeFile.mock.calls[0]!;
    expect(path).toBe("/home/u/cm1.rbprofile");
    expect(new TextDecoder().decode(data)).toBe("Été");
  });
});
```

- [ ] **4. Lancer la commande bornée : rouge attendu** (modules absents).

- [ ] **5. Code** `apps/web/src/profile-file.ts` :

```ts
/**
 * Fichiers de profil (C1, DAC1-3) : texte ↔ profil, nom du fichier exporté, slug, décision d'import. Fonctions pures,
 * sans fichier ni boîte : `platform/profile-files.ts` choisit et écrit le fichier, `app/profile-actions.ts` enchaîne.
 * Un futur dépôt de `.rbprofile` (P26, non attribué) appellera `profileFromText` et `planImport`.
 */
import { parseProfile, serializeProfile, type ParsedProfile, type Profile } from "./toolbar";

export { uniqueId } from "./toolbar";

export const PROFILE_EXTENSION = ".rbprofile";
export const PROFILE_MIME = "application/vnd.roomboard.profile+json";

export type ImportPlan = { readonly kind: "add" } | { readonly kind: "confirm"; readonly message: string };

/** Identifiant tiré d'un libellé : minuscules sans accents, `[a-z0-9-]`, vide → `profil` (P28). */
export function slug(label: string): string {
  const s = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s === "" ? "profil" : s;
}

/** Fichier exporté (P23) : `<slug du libellé>.rbprofile`, JSON indenté de 2. */
export function profileToFile(p: Profile): { readonly name: string; readonly text: string } {
  return { name: `${slug(p.label)}${PROFILE_EXTENSION}`, text: JSON.stringify(serializeProfile(p), null, 2) };
}

/** Texte d'un fichier → profil ; JSON illisible : erreur lisible ; ensuite les règles de `parseProfile` (P24, P33). */
export function profileFromText(text: string): ParsedProfile {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { errors: [`fichier de profil illisible : ${e instanceof Error ? e.message : String(e)}`] };
  }
  return parseProfile(json);
}

/** Import (P24) : id libre → ajout ; id pris (livré ou utilisateur) → confirmation « Remplacer le profil « … » ? ». */
export function planImport(p: Profile, existing: readonly Profile[], builtinIds: ReadonlySet<string>): ImportPlan {
  const taken = existing.find((x) => x.id === p.id);
  if (taken === undefined && !builtinIds.has(p.id)) return { kind: "add" };
  return { kind: "confirm", message: `Remplacer le profil « ${taken?.label ?? p.id} » ?` };
}
```

- [ ] **6. Code** `apps/web/src/platform/profile-files.ts` :

```ts
/**
 * Port des fichiers de profil (C1, P25, DAC1-3). Web (Chromium, repli, iPad) : `<input type=file>` et téléchargement de
 * l'hôte de repli. Coque : boîtes natives filtrées sur `rbprofile`, lecture et écriture par `plugin-fs` (portée limitée
 * au chemin choisi : le chemin rendu par la boîte est écrit tel quel). `FileHost` reste réservé au `.roomboard`.
 */
import { PROFILE_EXTENSION, PROFILE_MIME } from "../profile-file";
import type { FallbackDeps } from "./host-repli";
import { baseName, type TauriDialog, type TauriFs } from "./host-tauri";

export interface ProfileFiles {
  /** null : boîte annulée. Lève si la lecture échoue. */
  pick(): Promise<{ readonly name: string; readonly text: string } | null>;
  /** faux : boîte annulée. Lève si l'écriture échoue. */
  save(name: string, text: string): Promise<boolean>;
}

export const PROFILE_ACCEPT = `${PROFILE_EXTENSION},${PROFILE_MIME},application/json`;
export const PROFILE_FILTER = { name: "Profil RoomBoard", extensions: ["rbprofile"] } as const;

const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

export function createWebProfileFiles(deps: Pick<FallbackDeps, "pickFile" | "download">): ProfileFiles {
  return {
    async pick() {
      const f = await deps.pickFile(PROFILE_ACCEPT);
      return f === null ? null : { name: f.name, text: decode(f.bytes) };
    },
    async save(name, text) {
      deps.download(name, encode(text), PROFILE_MIME);
      return true;
    },
  };
}

export function createTauriProfileFiles(dialog: Pick<TauriDialog, "open" | "save">, fs: TauriFs): ProfileFiles {
  return {
    async pick() {
      const path = await dialog.open({ multiple: false, directory: false, filters: [PROFILE_FILTER] });
      if (path === null) return null;
      return { name: baseName(path), text: decode(await fs.readFile(path)) };
    },
    async save(name, text) {
      const path = await dialog.save({ defaultPath: name, filters: [PROFILE_FILTER] });
      if (path === null) return false;
      await fs.writeFile(path, encode(text));
      return true;
    },
  };
}
```

- [ ] **7. Lancer la commande bornée : vert attendu**, puis `tsc` (GC13).

- [ ] **8. Commit** : les six fichiers ; message `feat(profile): .rbprofile text, slug and import plan; ProfileFiles port for web and shell; sample profiles`.

<a id="tache-t4"></a>
### Tâche T4 — Rangée contextuelle des préréglages dans la barre d'outils

**Objectif.** Montrer, en fin de chaque barre de rôle `tools` et après un séparateur, un bouton par préréglage de
l'outil actif (`data-preset`, jamais `data-item`) ; un clic appelle `host.setTool(tool, presetId)` ; rien pour un outil
sans préréglage ; aucun état enfoncé (P18, P19, HC1-1, HC2-6).

**Subagent.** implementeur-tdd. **Dépend de.** —

**Fichiers.** Modifier `apps/web/src/ui/Toolbar.tsx` (l. 1-13, 58-74), `apps/web/src/ui/Toolbar.test.tsx`,
`apps/web/src/ui/rb.css` (ajout en fin).

**Interfaces.**
- Consomme : `ToolbarHost.setTool(tool: string, preset?: string): void` ; `TOOL_TABLE` ; `type Preset`, `type ToolId`.
- Produit (exact, utilisé par T9) :
  - `export type PresetTable = Readonly<Record<ToolId, readonly Preset[]>>;`
  - `ToolbarProps.presets?: Accessor<PresetTable>` (prop facultative : sans elle, aucune rangée)
  - DOM : `span.rb-sep[role=separator][data-presets-sep]` puis `button.rb-preset[data-preset="<id>"]` en fin de `.rb-bar`.
- Réutilise : `apps/web/src/app/toolbar-host.ts:41` — `setTool(tool, preset?)`, appelé tel quel par la rangée (réutiliser).
- Réutilise : `apps/web/src/ui/Toolbar.tsx:58`, `apps/web/src/ui/layout.ts:8`, `apps/web/src/ui/rb.css:1-12` — `Toolbar` étendu de `presets` ; `layoutFor` et les jetons `--rb-btn-*` inchangés (étendre / réutiliser).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/ui/Toolbar.test.tsx src/ui/App.test.tsx src/ui/PagesBar.test.tsx --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -60
```

Attendu : 0 échec ; ≥ 20 tests dans `Toolbar.test.tsx` ; présents : « stylo actif : préréglages en fin de barre »,
« cinq préréglages : un clic sur le quatrième appelle host.setTool(pen, couleur) », « Main active : la rangée
disparaît ». À garder verts : « outil inconnu : bouton absent », « attributs de la barre », « aucun switch sur
l'identifiant, aucun px… », `App.test.tsx` (« rb.css : la grille réserve la case de la scène… »), `PagesBar.test.tsx`.

**Preuve visuelle.** Aucune ici (capture de la barre en T10).

**Contraintes (recopiées).**
- GC1 Budget : l'exécution entière tient en environ 3 h sur la VM de 8 cœurs, chargée ; une tâche vise 20 à 45 min ; aucune commande lourde hors celles de la section.
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test désactivé (`skip`, `only`, `todo`), aucun seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && [ -d node_modules ] || pnpm install --frozen-lockfile` ; `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c1-profils/apps/web/src/wasm apps/web/src/` (jamais commité).
- GC5 Preuve bornée : la commande de la section, telle quelle ; le rapport cite N ≥ 1 et les noms attendus.
- GC6 Commits : fichiers ajoutés un par un (`git add <chemin>`, jamais `-A`, `--all`, `.`, ni `commit -a`), auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle (jamais AGPL, GPL, LGPL).
- GC8 OD56 : ne pas toucher `feat/usage-c2-depot`.
- GC9 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.
- GC11 Interface : aucun `switch`, aucune taille en `px` dans un `.tsx`, aucun `localStorage`, aucun glisser HTML5 ; libellés en français, aucune icône seule (la pastille de couleur accompagne le libellé) ; cibles d'au moins `--rb-btn-m`.
- GC12 Ne modifier que les fichiers touchés de la tâche ; `ui/item-state.ts` et `app/stage-tags.ts` non touchés.
- GC13 `tsc --noEmit` sans erreur à la fin.

**Interdits.** `data-item` ou `aria-pressed` sur un bouton de préréglage (l'essai s5b compte `button[data-item]`) ;
toucher `PagesBar.tsx`, `item-state.ts`, `App.tsx` (branché en T9).

**Terminé quand.** Commande bornée verte ; `tsc` vide ; un commit ; rapport avec deux lignes `Réutilisation :`.

**Étapes.**

- [ ] **1. Préparer le worktree** (GC4).

- [ ] **2. Tests rouges** dans `Toolbar.test.tsx`. Import complété :
  `import { Toolbar, type PresetTable } from "./Toolbar";`. `setup` reçoit les préréglages :

```tsx
function setup(bar: Bar = outils, caps: RuntimeCapabilities = NO_CAPS, size: ButtonSize = "m", presets?: PresetTable) {
  const host: ToolbarHost = { setTool: vi.fn(), runAction: vi.fn(), dropFiles: vi.fn(), setMode: vi.fn() };
  const [c, setC] = createSignal(caps);
  const [v, setV] = createSignal(VIEW);
  const [s, setS] = createSignal(size);
  const r = render(() => (
    <Toolbar bar={bar} caps={c} view={v} size={s} host={host} presets={presets === undefined ? undefined : () => presets} />
  ));
  return { ...r, host, setC, setV, setS };
}
```

  Puis, en fin de fichier :

```tsx
const PEN: PresetTable = BUILTIN_PROFILES[0]!.presets;
const FIVE: PresetTable = {
  pen: [
    ...(PEN.pen ?? []),
    { id: "couleur", label: "Couleur 4", color: "#16a34a", width: 6, rest: {} },
    { id: "couleur-2", label: "Couleur 5", color: "#9333ea", width: 2, rest: {} },
  ],
};
const presetIds = (root: ParentNode): (string | null)[] =>
  [...root.querySelectorAll("button[data-preset]")].map((b) => b.getAttribute("data-preset"));

describe("Toolbar — rangée des préréglages (C1, P18, S4)", () => {
  it("stylo actif : préréglages en fin de barre, après un séparateur, data-preset et jamais data-item", () => {
    const plain = setup().container.querySelectorAll("button[data-item]").length;
    cleanup();
    const { container } = setup(outils, NO_CAPS, "m", PEN);
    const bar = container.querySelector(".rb-bar")!;
    expect(presetIds(bar)).toEqual(["noir", "rouge", "bleu"]);
    expect(bar.querySelectorAll("button[data-item]").length).toBe(plain);
    expect(bar.querySelector("button[data-preset][data-item]")).toBeNull();
    const kids = [...bar.children];
    expect(kids.indexOf(bar.querySelector("[data-presets-sep]")!)).toBe(kids.length - 4);
    expect(bar.querySelector('[data-preset="rouge"]')!.hasAttribute("aria-pressed")).toBe(false);
    expect(bar.querySelector('[data-preset="rouge"]')!.textContent).toContain("Rouge");
  });

  it("cinq préréglages : un clic sur le quatrième appelle host.setTool(pen, couleur)", () => {
    const { container, host } = setup(outils, NO_CAPS, "m", FIVE);
    expect(presetIds(container)).toEqual(["noir", "rouge", "bleu", "couleur", "couleur-2"]);
    fireEvent.click(container.querySelector('button[data-preset="couleur"]')!);
    expect(host.setTool).toHaveBeenCalledWith("pen", "couleur");
  });

  it("Main active : la rangée disparaît ; retour au stylo : elle revient", () => {
    const { container, setV } = setup(outils, NO_CAPS, "m", PEN);
    setV({ ...VIEW, tool: "hand" });
    expect(presetIds(container)).toEqual([]);
    expect(container.querySelector("[data-presets-sep]")).toBeNull();
    setV({ ...VIEW, tool: "pen" });
    expect(presetIds(container)).toHaveLength(3);
  });

  it("barre de rôle pages : aucune rangée", () => {
    const pages: Bar = { ...mkBar([tool("pen")]), role: "pages" };
    expect(presetIds(setup(pages, NO_CAPS, "m", PEN).container)).toEqual([]);
  });

  it("sans préréglages fournis : aucune rangée", () => {
    expect(presetIds(setup().container)).toEqual([]);
  });
});
```

- [ ] **3. Lancer la commande bornée : rouge attendu.**

- [ ] **4. Code** `ui/Toolbar.tsx`. Imports :

```tsx
import { For, Show, createMemo, onCleanup, onMount, type Accessor, type JSX } from "solid-js";
import { listenWebDrop } from "../platform/drop-web";
import type { ToolbarHost } from "../app/toolbar-host";
import {
  TOOL_TABLE,
  visibleItems,
  type ButtonSize,
  type Preset,
  type RuntimeCapabilities,
  type Toolbar as Bar,
  type ToolId,
  type ToolItem,
} from "../toolbar";
import { itemState, type ToolbarView } from "./item-state";

/** Préréglages d'un profil, par outil (`Profile["presets"]`). */
export type PresetTable = Readonly<Record<ToolId, readonly Preset[]>>;
```

  `ToolbarProps` gagne, après `host` :

```tsx
  /** Préréglages du profil : une barre de rôle `tools` montre ceux de l'outil actif en fin de barre (C1, P18). */
  readonly presets?: Accessor<PresetTable>;
```

  Avant `export function Toolbar` :

```tsx
/** Outil du profil dont le moteur publie le choix `choice` (lu dans `TOOL_TABLE`) ; null si aucun. */
function toolOf(choice: string): ToolId | null {
  return Object.keys(TOOL_TABLE).find((id) => TOOL_TABLE[id]!.choice === choice) ?? null;
}

/** Rangée contextuelle (C1, P18, P19) : un bouton `data-preset` par préréglage de l'outil actif, sans état enfoncé. */
function PresetRow(props: { presets: Accessor<PresetTable>; view: Accessor<ToolbarView>; host: ToolbarHost }): JSX.Element {
  const tool = createMemo(() => toolOf(props.view().tool));
  const list = createMemo((): readonly Preset[] => {
    const t = tool();
    const all = props.presets();
    return t !== null && Object.hasOwn(all, t) ? (all[t] ?? []) : [];
  });
  const press = (presetId: string): void => {
    const t = tool();
    if (t !== null) props.host.setTool(t, presetId);
  };
  return (
    <Show when={list().length > 0}>
      <span class="rb-sep" role="separator" data-presets-sep />
      <For each={list()}>
        {(p) => (
          <button type="button" class="rb-preset" data-preset={p.id} title={p.label} onClick={() => press(p.id)}>
            <span class="rb-swatch" aria-hidden="true" style={{ "background-color": p.color ?? "transparent" }} />
            {p.label}
          </button>
        )}
      </For>
    </Show>
  );
}
```

  Dans le rendu de `Toolbar`, après `<For each={items()}>…</For>` :

```tsx
      <Show when={props.bar.role === "tools"}>
        <PresetRow presets={() => props.presets?.() ?? {}} view={props.view} host={props.host} />
      </Show>
```

- [ ] **5. CSS** en fin de `ui/rb.css` :

```css
/* Rangée des préréglages (C1, P18) : en fin de barre d'outils, pour l'outil actif ; pastille + libellé, sans état enfoncé. */
.rb-preset { display: inline-flex; align-items: center; gap: var(--rb-gap); }
.rb-swatch { display: inline-block; inline-size: calc(var(--rb-btn) / 3); block-size: calc(var(--rb-btn) / 3); border-radius: 50%; border: 1px solid #52525b; }
```

- [ ] **6. Lancer la commande bornée : vert attendu**, puis `tsc` (GC13).

- [ ] **7. Commit** : `apps/web/src/ui/Toolbar.tsx`, `apps/web/src/ui/Toolbar.test.tsx`, `apps/web/src/ui/rb.css` ;
  message `feat(toolbar): contextual preset row for the active tool`.

<a id="tache-t5"></a>
### Tâche T5 — Opérations d'édition pures (`profile-edit.ts`)

**Objectif.** Chaque geste de l'éditeur en fonction pure `Profile → Profile`, sans DOM, qui garde `rest` à chaque niveau
(DAC1-1) : nom, démarrage, taille, emplacement (P13), masquer (P2, P33), ordre (P14), catalogue et ajout (P15),
préréglages du stylo (P17), remises à zéro (P6, U12), origine (P3).

**Subagent.** implementeur-tdd. **Dépend de.** T1 (`hidden`, `basedOn`, `uniqueId`, `isKnownItem`, `isProfilesAccess`).

**Fichiers.** Créer `apps/web/src/profile-edit.ts`, `apps/web/src/profile-edit.test.ts`.

**Interfaces.**
- Consomme (T1) : `uniqueId`, `isKnownItem`, `isProfilesAccess`, `resetPresets`, `TOOL_TABLE`, `ACTION_TABLE`, types.
- Produit (exact, utilisé par T7, T8, T9) :

```ts
export interface CatalogEntry { readonly kind: "tool" | "action"; readonly ref: string; readonly label: string }
export interface PresetField { readonly key: "color" | "width"; readonly label: string; readonly input: "color" | "number" }
export interface PresetPatch { readonly label?: string; readonly color?: string; readonly width?: number }
export const PRESET_TOOLS: readonly ToolId[];                    // ["pen"]
export function presetFields(tool: ToolId): readonly PresetField[];
export function setLabel(p: Profile, label: string): Profile;
export function setStartMode(p: Profile, mode: StartMode): Profile;
export function setButtonSize(p: Profile, size: ButtonSize): Profile;
export function setDock(p: Profile, barId: string, dock: Dock): Profile;
export function canHide(item: ToolItem): boolean;               // faux pour Profil et pour un élément inconnu
export function setHidden(p: Profile, itemId: string, hidden: boolean): Profile;
export function moveItem(p: Profile, barId: string, itemId: string, delta: -1 | 1): Profile;
export function catalog(p: Profile, barId: string): CatalogEntry[];
export function addItem(p: Profile, barId: string, entry: CatalogEntry): Profile;
export function addPreset(p: Profile, tool: ToolId): Profile;   // id "couleur", "couleur-2"… ; libellé « Couleur <n> »
export function updatePreset(p: Profile, tool: ToolId, id: string, patch: PresetPatch): Profile;
export function removePreset(p: Profile, tool: ToolId, id: string): Profile;
export function resetToolbars(p: Profile, from: Profile): Profile;
export function resetAllPresets(p: Profile, from: Profile): Profile;
export function resetToOrigin(p: Profile, from: Profile): Profile;
export function originOf(p: Profile, builtins: readonly Profile[]): Profile;
```

- Réutilise : `apps/web/src/toolbar.ts:514` — `resetPresets(p, tool, from)`, appelé pour chaque outil de `p` et de `from` (réutiliser).
- Réutilise : `apps/web/src/toolbar.ts:80`, `:93`, `:111`, `:115` — `TOOL_TABLE`, `ACTION_TABLE` (catalogue) ; `isKnownTool`, `isKnownAction` passent par `isKnownItem` (T1) (réutiliser).
- Réutilise : aucun module existant pour les opérations d'édition — nouveau `apps/web/src/profile-edit.ts` (DAC1-1).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/profile-edit.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -40
```

Attendu : 0 échec ; ≥ 15 tests ; présents : « S3 : resetToOrigin », « originOf : livré de même id, puis basedOn, puis
defaut », « S4 : Rétablir les préréglages », « Monter / Descendre », « opérations pures ».

**Preuve visuelle.** Aucune.

**Contraintes (recopiées).**
- GC1 Budget : l'exécution entière tient en environ 3 h sur la VM de 8 cœurs, chargée ; une tâche vise 20 à 45 min ; aucune commande lourde hors celles de la section.
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test désactivé (`skip`, `only`, `todo`), aucun seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && [ -d node_modules ] || pnpm install --frozen-lockfile` ; `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c1-profils/apps/web/src/wasm apps/web/src/` (jamais commité).
- GC5 Preuve bornée : la commande de la section, telle quelle ; le rapport cite N ≥ 1 et les noms attendus.
- GC6 Commits : fichiers ajoutés un par un (`git add <chemin>`, jamais `-A`, `--all`, `.`, ni `commit -a`), auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle (jamais AGPL, GPL, LGPL).
- GC8 OD56 : ne pas toucher `feat/usage-c2-depot` ; aucune action nouvelle dans `ACTION_TABLE`.
- GC9 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.
- GC10 Aucun DOM ni `localStorage` dans `profile-edit.ts` ; les profils livrés sont figés : aucune opération ne mute son entrée.
- GC12 Ne modifier que les fichiers touchés de la tâche ; `toolbar.ts` n'est pas modifié ici.
- GC13 `tsc --noEmit` sans erreur à la fin.

**Interdits.** Ajouter une suppression d'élément (masquer suffit, HC2-9) ; un ordre modifiable des préréglages (P17) ;
réécrire un élément inconnu.

**Terminé quand.** Commande bornée verte ; `tsc` vide ; un commit ; rapport avec trois lignes `Réutilisation :`.

**Étapes.**

- [ ] **1. Préparer le worktree** (GC4).

- [ ] **2. Tests rouges** `apps/web/src/profile-edit.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  addItem, addPreset, canHide, catalog, moveItem, originOf, presetFields, PRESET_TOOLS, removePreset, resetAllPresets,
  resetToolbars, resetToOrigin, setButtonSize, setDock, setHidden, setLabel, setStartMode, updatePreset,
} from "./profile-edit";
import { parseProfile, serializeProfile, visibleItems, type Profile, type RuntimeCapabilities } from "./toolbar";
import { BUILTIN_PROFILES, builtinProfile, DEFAULT_PROFILE_JSON } from "./toolbar-profiles";

const ALL: RuntimeCapabilities = { desktopAnnotation: true, multiWindow: true, dropPaths: true, officeConverter: true };
const DEFAUT = builtinProfile("defaut")!;
const SIMPLE = builtinProfile("simple")!;
const bar = (p: Profile, id = "outils") => p.toolbars.find((b) => b.id === id)!;
const ids = (p: Profile, id = "outils") => bar(p, id).groups.flatMap((g) => g.items.map((i) => i.id));
const groupsOf = (p: Profile, id = "outils") => bar(p, id).groups.map((g) => g.items.map((i) => i.id));
const item = (p: Profile, itemId: string) => p.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items)).find((i) => i.id === itemId)!;
const pens = (p: Profile) => (p.presets.pen ?? []).map((x) => x.id);

/** `defaut` avec des clés inconnues à chaque niveau, et des préréglages de gomme non montrés. */
function withUnknownKeys(): Profile {
  const json = JSON.parse(JSON.stringify(DEFAULT_PROFILE_JSON)) as Record<string, any>;
  json.theme = "sombre";
  json.interface.langue = "fr";
  json.behavior.pageDefaut = "seyes";
  json.toolbars[0].couleur = "bleu";
  json.toolbars[0].groups[0].replie = true;
  json.toolbars[0].groups[0].items[0].raccourci = "P";
  json.presets.pen[0].opacite = 0.5;
  json.presets.eraser = [{ id: "fine", label: "Fine", size: 8 }];
  const r = parseProfile(json);
  if ("errors" in r) throw new Error(r.errors.join(" ; "));
  return r.profile;
}

describe("profile-edit (C1, DAC1-1)", () => {
  it("S1 : barre d'outils à gauche, grands boutons ; clés inconnues gardées", () => {
    const p = setButtonSize(setDock(withUnknownKeys(), "outils", "left"), "l");
    expect(bar(p).dock).toBe("left");
    expect(bar(p, "pages").dock).toBe("bottom");
    expect(p.interface).toEqual({ buttonSize: "l", rest: { langue: "fr" } });
    expect(bar(p).rest).toEqual({ couleur: "bleu" });
    expect(p.rest).toEqual({ theme: "sombre" });
  });

  it("nom et démarrage ; behavior.rest gardé", () => {
    const p = setStartMode(setLabel(withUnknownKeys(), "CM1"), "desktop-annotation");
    expect(p.label).toBe("CM1");
    expect(p.behavior).toEqual({ startMode: "desktop-annotation", rest: { pageDefaut: "seyes" } });
  });

  it("masquer la gomme : sautée par visibleItems, gardée (ordre, id) ; montrer retire le champ (P2)", () => {
    const hidden = setHidden(DEFAUT, "eraser", true);
    expect(ids(hidden)).toEqual(ids(DEFAUT));
    expect(item(hidden, "eraser").hidden).toBe(true);
    expect(visibleItems(bar(hidden), ALL).map((i) => i.id)).not.toContain("eraser");
    const shown = setHidden(hidden, "eraser", false);
    expect("hidden" in item(shown, "eraser")).toBe(false);
    expect(shown).toEqual(DEFAUT);
  });

  it("Profil ne se masque pas ; élément inconnu non plus (P33, P16)", () => {
    expect(canHide(item(DEFAUT, "profiles"))).toBe(false);
    expect(setHidden(DEFAUT, "profiles", true)).toEqual(DEFAUT);
    const laser = { id: "laser", kind: "tool", tool: "laser", label: "Laser", requires: [], rest: {} } as const;
    expect(canHide(laser)).toBe(false);
    expect(canHide(item(DEFAUT, "eraser"))).toBe(true);
    expect(canHide(item(DEFAUT, "sep-1"))).toBe(true);
  });

  it("Monter / Descendre dans un groupe ; à la frontière, l'élément entre dans le groupe voisin (P14)", () => {
    expect(groupsOf(DEFAUT)[0]).toEqual(["pen", "eraser", "eraser-mode", "hand"]);
    expect(groupsOf(moveItem(DEFAUT, "outils", "eraser", -1))[0]).toEqual(["eraser", "pen", "eraser-mode", "hand"]);
    const down = moveItem(DEFAUT, "outils", "hand", 1);
    expect(groupsOf(down)[0]).toEqual(["pen", "eraser", "eraser-mode"]);
    expect(groupsOf(down)[1]![0]).toBe("hand");
    const up = moveItem(DEFAUT, "outils", "sep-1", -1);
    expect(groupsOf(up)[0]).toEqual(["pen", "eraser", "eraser-mode", "hand", "sep-1"]);
    expect(moveItem(DEFAUT, "outils", "pen", -1)).toEqual(DEFAUT);
    expect(moveItem(DEFAUT, "outils", "settings", 1)).toEqual(DEFAUT);
    expect(moveItem(DEFAUT, "outils", "absent", 1)).toEqual(DEFAUT);
    expect(moveItem(DEFAUT, "pages", "eraser", 1)).toEqual(DEFAUT);
  });

  it("catalogue : barre tools = outils et actions absents ; barre pages = actions seules (P15)", () => {
    expect(catalog(DEFAUT, "outils").map((e) => e.ref)).toEqual(["page-prev", "page-next", "page-add", "page-remove"]);
    const simple = catalog(SIMPLE, "outils");
    expect(simple.filter((e) => e.kind === "tool").map((e) => e.ref)).toEqual(["select", "rect", "ellipse", "line", "arrow", "text"]);
    const pages = catalog(DEFAUT, "pages");
    expect(pages.every((e) => e.kind === "action")).toBe(true);
    expect(pages.map((e) => e.ref)).not.toContain("page-next");
    expect(pages.map((e) => e.ref)).toContain("undo");
    expect(catalog(DEFAUT, "absente")).toEqual([]);
  });

  it("ajouter : en fin de barre ; id de l'outil s'il est libre, sinon <id>-<n> (P15)", () => {
    const rect = catalog(SIMPLE, "outils").find((e) => e.ref === "rect")!;
    const p = addItem(SIMPLE, "outils", rect);
    expect(ids(p).at(-1)).toBe("rect");
    expect(item(p, "rect")).toEqual({ id: "rect", kind: "tool", tool: "rect", label: "Rectangle", requires: [], rest: {} });
    const next = catalog(DEFAUT, "outils").find((e) => e.ref === "page-next")!;
    const q = addItem(DEFAUT, "outils", next);
    expect(ids(q).at(-1)).toBe("page-next-2");
    expect(item(q, "page-next-2").action).toBe("page-next");
    expect("errors" in parseProfile(serializeProfile(q))).toBe(false);
  });

  it("préréglages du stylo : ajouter deux couleurs (fin de liste), modifier, retirer (P17, S1)", () => {
    const five = addPreset(addPreset(DEFAUT, "pen"), "pen");
    expect(pens(five)).toEqual(["noir", "rouge", "bleu", "couleur", "couleur-2"]);
    expect(five.presets.pen![3]).toEqual({ id: "couleur", label: "Couleur 4", color: "#000000", width: 4, rest: {} });
    const edited = updatePreset(five, "pen", "couleur", { label: " Vert ", color: "#16a34a", width: 6 });
    expect(edited.presets.pen![3]).toMatchObject({ label: "Vert", color: "#16a34a", width: 6 });
    expect(updatePreset(edited, "pen", "couleur", { width: 0, label: "  " }).presets.pen![3]).toMatchObject({ label: "Vert", width: 6 });
    expect(updatePreset(edited, "pen", "couleur", { width: Number.NaN }).presets.pen![3]!.width).toBe(6);
    expect(pens(removePreset(edited, "pen", "noir"))).toEqual(["rouge", "bleu", "couleur", "couleur-2"]);
    expect(removePreset(DEFAUT, "text", "x")).toEqual(DEFAUT);
  });

  it("champs modifiables : stylo = couleur et épaisseur ; autres outils : aucun ; clés et outils non montrés gardés", () => {
    expect(PRESET_TOOLS).toEqual(["pen"]);
    expect(presetFields("pen").map((f) => [f.key, f.input])).toEqual([["color", "color"], ["width", "number"]]);
    expect(presetFields("eraser")).toEqual([]);
    const p = updatePreset(withUnknownKeys(), "pen", "noir", { color: "#111111" });
    expect(p.presets.pen![0]!.rest).toEqual({ opacite: 0.5 });
    expect(p.presets.eraser).toEqual(withUnknownKeys().presets.eraser);
  });

  it("S4 : Rétablir les barres : barres et taille de l'origine, préréglages gardés", () => {
    const cm1 = addPreset(setHidden(setButtonSize(setDock(DEFAUT, "outils", "left"), "l"), "eraser", true), "pen");
    const r = resetToolbars(cm1, DEFAUT);
    expect(r.toolbars).toEqual(DEFAUT.toolbars);
    expect(r.interface.buttonSize).toBe("m");
    expect(pens(r)).toHaveLength(4);
  });

  it("S4 : Rétablir les préréglages : trois couleurs, barres gardées", () => {
    const cm1 = addPreset(addPreset(setDock(DEFAUT, "outils", "left"), "pen"), "pen");
    const r = resetAllPresets(cm1, DEFAUT);
    expect(pens(r)).toEqual(["noir", "rouge", "bleu"]);
    expect(bar(r).dock).toBe("left");
  });

  it("S3 : resetToOrigin : barres, taille, préréglages, démarrage de l'origine ; id, nom, basedOn gardés", () => {
    const cm1: Profile = {
      ...setStartMode(addPreset(setButtonSize(setDock(DEFAUT, "outils", "left"), "l"), "pen"), "desktop-annotation"),
      id: "cm1",
      label: "CM1",
      basedOn: "defaut",
    };
    const r = resetToOrigin(cm1, DEFAUT);
    expect(r.toolbars).toEqual(DEFAUT.toolbars);
    expect(r.interface.buttonSize).toBe("m");
    expect(r.presets).toEqual(DEFAUT.presets);
    expect(r.behavior).toEqual(DEFAUT.behavior);
    expect([r.id, r.label, r.basedOn]).toEqual(["cm1", "CM1", "defaut"]);
  });

  it("originOf : livré de même id, puis basedOn, puis defaut (P3)", () => {
    expect(originOf({ ...SIMPLE, label: "Ma copie", basedOn: "defaut" }, BUILTIN_PROFILES).id).toBe("simple");
    expect(originOf({ ...DEFAUT, id: "cm1", basedOn: "simple" }, BUILTIN_PROFILES).id).toBe("simple");
    expect(originOf({ ...DEFAUT, id: "cm1" }, BUILTIN_PROFILES).id).toBe("defaut");
    expect(originOf({ ...DEFAUT, id: "x", basedOn: "disparu" }, BUILTIN_PROFILES).id).toBe("defaut");
  });

  it("opérations pures : un profil livré (figé) passe par toutes sans lever ni changer", () => {
    const before = JSON.stringify(serializeProfile(DEFAUT));
    const entry = catalog(DEFAUT, "outils")[0]!;
    const all = [
      setLabel(DEFAUT, "X"), setStartMode(DEFAUT, "desktop-annotation"), setButtonSize(DEFAUT, "s"), setDock(DEFAUT, "outils", "right"),
      setHidden(DEFAUT, "pen", true), moveItem(DEFAUT, "outils", "hand", 1), addItem(DEFAUT, "outils", entry), addPreset(DEFAUT, "pen"),
      updatePreset(DEFAUT, "pen", "noir", { width: 9 }), removePreset(DEFAUT, "pen", "noir"), resetToolbars(DEFAUT, SIMPLE),
      resetAllPresets(DEFAUT, SIMPLE), resetToOrigin(DEFAUT, SIMPLE),
    ];
    expect(all).toHaveLength(13);
    expect(JSON.stringify(serializeProfile(DEFAUT))).toBe(before);
  });
});
```

- [ ] **3. Lancer la commande bornée : rouge attendu** (module absent).

- [ ] **4. Code** `apps/web/src/profile-edit.ts` :

```ts
/**
 * Opérations d'édition d'un profil (C1, DAC1-1) : fonctions pures `Profile → Profile`, sans DOM ni stockage. Chaque
 * niveau garde son `rest` (clés inconnues) ; un élément inconnu n'est jamais réécrit autrement que tel quel (P16).
 * L'éditeur (`ui/ProfileEditor.tsx`) ne fait qu'appeler ces fonctions sur son brouillon.
 */
import {
  ACTION_TABLE,
  isKnownItem,
  isProfilesAccess,
  resetPresets,
  TOOL_TABLE,
  uniqueId,
  type ButtonSize,
  type Dock,
  type Preset,
  type Profile,
  type StartMode,
  type ToolId,
  type ToolItem,
  type Toolbar,
} from "./toolbar";
import { DEFAULT_PROFILE_ID } from "./toolbar-profiles";

export interface CatalogEntry { readonly kind: "tool" | "action"; readonly ref: string; readonly label: string }
export interface PresetField { readonly key: "color" | "width"; readonly label: string; readonly input: "color" | "number" }
export interface PresetPatch { readonly label?: string; readonly color?: string; readonly width?: number }

/** Champs que le moteur applique, par outil (P17) : seul `setPenStyle` existe (`engine.ts:446`). */
const PRESET_FIELDS: Readonly<Record<ToolId, readonly PresetField[]>> = Object.freeze({
  pen: Object.freeze([
    { key: "color", label: "Couleur", input: "color" },
    { key: "width", label: "Épaisseur", input: "number" },
  ] as const),
});
export const PRESET_TOOLS: readonly ToolId[] = Object.freeze(Object.keys(PRESET_FIELDS));

export function presetFields(tool: ToolId): readonly PresetField[] {
  return Object.hasOwn(PRESET_FIELDS, tool) ? (PRESET_FIELDS[tool] ?? []) : [];
}

/** Préréglage ajouté : noir, épaisseur 4 (celle des livrés). */
const NEW_PRESET = { color: "#000000", width: 4 } as const;

const mapBar = (p: Profile, barId: string, f: (b: Toolbar) => Toolbar): Profile => ({
  ...p,
  toolbars: p.toolbars.map((b) => (b.id === barId ? f(b) : b)),
});
const mapItems = (p: Profile, f: (it: ToolItem) => ToolItem): Profile => ({
  ...p,
  toolbars: p.toolbars.map((b) => ({ ...b, groups: b.groups.map((g) => ({ ...g, items: g.items.map(f) })) })),
});
const itemIds = (p: Profile): Set<string> => new Set(p.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items.map((i) => i.id))));
const presetsOf = (p: Profile, tool: ToolId): readonly Preset[] => (Object.hasOwn(p.presets, tool) ? (p.presets[tool] ?? []) : []);
const withPresets = (p: Profile, tool: ToolId, list: readonly Preset[]): Profile => ({ ...p, presets: { ...p.presets, [tool]: list } });

export const setLabel = (p: Profile, label: string): Profile => ({ ...p, label });
export const setStartMode = (p: Profile, mode: StartMode): Profile => ({ ...p, behavior: { ...p.behavior, startMode: mode } });
export const setButtonSize = (p: Profile, size: ButtonSize): Profile => ({ ...p, interface: { ...p.interface, buttonSize: size } });
export const setDock = (p: Profile, barId: string, dock: Dock): Profile => mapBar(p, barId, (b) => ({ ...b, dock }));

/** Faux pour l'accès au menu Profil (P33) et pour un élément inconnu (P16, réécrit tel quel). */
export const canHide = (item: ToolItem): boolean => isKnownItem(item) && !isProfilesAccess(item);

export function setHidden(p: Profile, itemId: string, hidden: boolean): Profile {
  return mapItems(p, (it) => {
    if (it.id !== itemId || !canHide(it)) return it;
    if (hidden) return { ...it, hidden: true };
    const { hidden: _shown, ...kept } = it;
    return kept;
  });
}

/** Un cran vers le haut (-1) ou le bas (1) ; à la frontière d'un groupe, l'élément entre dans le groupe voisin (P14). */
export function moveItem(p: Profile, barId: string, itemId: string, delta: -1 | 1): Profile {
  return mapBar(p, barId, (bar) => {
    const g = bar.groups.findIndex((gr) => gr.items.some((it) => it.id === itemId));
    if (g === -1) return bar;
    const items = bar.groups[g]!.items;
    const i = items.findIndex((it) => it.id === itemId);
    const moved = items[i]!;
    const lists = bar.groups.map((gr) => [...gr.items]);
    const j = i + delta;
    if (j >= 0 && j < items.length) {
      lists[g]![i] = items[j]!;
      lists[g]![j] = moved;
    } else {
      const ng = g + delta;
      if (ng < 0 || ng >= bar.groups.length) return bar;
      lists[g]!.splice(i, 1);
      if (delta === -1) lists[ng]!.push(moved);
      else lists[ng]!.unshift(moved);
    }
    return { ...bar, groups: bar.groups.map((gr, k) => ({ ...gr, items: lists[k]! })) };
  });
}

/** Ce qu'on peut ajouter à une barre (P15) : barre `pages` = actions seules, autre rôle = outils puis actions ; moins ce qu'elle a. */
export function catalog(p: Profile, barId: string): CatalogEntry[] {
  const bar = p.toolbars.find((b) => b.id === barId);
  if (bar === undefined) return [];
  const items = bar.groups.flatMap((g) => g.items);
  const tools = new Set(items.flatMap((it) => (it.kind === "tool" && it.tool !== undefined ? [it.tool] : [])));
  const actions = new Set(items.flatMap((it) => (it.kind === "action" && it.action !== undefined ? [it.action] : [])));
  const toolEntries: CatalogEntry[] =
    bar.role === "pages"
      ? []
      : Object.entries(TOOL_TABLE).filter(([id]) => !tools.has(id)).map(([id, e]) => ({ kind: "tool", ref: id, label: e.label }));
  const actionEntries: CatalogEntry[] = Object.entries(ACTION_TABLE)
    .filter(([id]) => !actions.has(id))
    .map(([id, e]) => ({ kind: "action", ref: id, label: e.label }));
  return [...toolEntries, ...actionEntries];
}

/** Ajoute en fin de barre ; id = celui de l'outil ou de l'action s'il est libre dans tout le profil, sinon `<id>-<n>`. */
export function addItem(p: Profile, barId: string, entry: CatalogEntry): Profile {
  if (!p.toolbars.some((b) => b.id === barId)) return p;
  const item: ToolItem = {
    id: uniqueId(entry.ref, itemIds(p)),
    kind: entry.kind,
    ...(entry.kind === "tool" ? { tool: entry.ref } : { action: entry.ref }),
    label: entry.label,
    requires: [],
    rest: {},
  };
  return mapBar(p, barId, (bar) => {
    if (bar.groups.length === 0) return { ...bar, groups: [{ id: "groupe", items: [item], rest: {} }] };
    const last = bar.groups.length - 1;
    return { ...bar, groups: bar.groups.map((g, k) => (k === last ? { ...g, items: [...g.items, item] } : g)) };
  });
}

export function addPreset(p: Profile, tool: ToolId): Profile {
  const list = presetsOf(p, tool);
  const id = uniqueId("couleur", new Set(list.map((x) => x.id)));
  return withPresets(p, tool, [...list, { id, label: `Couleur ${list.length + 1}`, ...NEW_PRESET, rest: {} }]);
}

/** Libellé vide, couleur vide, épaisseur ≤ 0 ou non finie : valeur gardée. */
export function updatePreset(p: Profile, tool: ToolId, id: string, patch: PresetPatch): Profile {
  if (!Object.hasOwn(p.presets, tool)) return p;
  return withPresets(
    p,
    tool,
    presetsOf(p, tool).map((x) => {
      if (x.id !== id) return x;
      const label = patch.label !== undefined && patch.label.trim() !== "" ? patch.label.trim() : x.label;
      const color = patch.color !== undefined && patch.color !== "" ? patch.color : x.color;
      const width = patch.width !== undefined && Number.isFinite(patch.width) && patch.width > 0 ? patch.width : x.width;
      return { ...x, label, ...(color !== undefined ? { color } : {}), ...(width !== undefined ? { width } : {}) };
    }),
  );
}

export function removePreset(p: Profile, tool: ToolId, id: string): Profile {
  if (!Object.hasOwn(p.presets, tool)) return p;
  return withPresets(p, tool, presetsOf(p, tool).filter((x) => x.id !== id));
}

/** « Rétablir les barres » (U12) : barres et taille des boutons de l'origine ; le reste du profil ne bouge pas. */
export function resetToolbars(p: Profile, from: Profile): Profile {
  return { ...p, toolbars: from.toolbars, interface: { ...p.interface, buttonSize: from.interface.buttonSize } };
}

/** « Rétablir les préréglages » (U12) : chaque outil de `p` et de `from` repris de `from`. */
export function resetAllPresets(p: Profile, from: Profile): Profile {
  const tools = [...new Set([...Object.keys(p.presets), ...Object.keys(from.presets)])];
  return tools.reduce((acc, tool) => resetPresets(acc, tool, from), p);
}

/** « Remettre à zéro ce profil » d'un profil de l'utilisateur (P6) : barres, taille, préréglages, démarrage de `from`. */
export function resetToOrigin(p: Profile, from: Profile): Profile {
  return { ...resetAllPresets(resetToolbars(p, from), from), behavior: from.behavior };
}

/** Origine (P3) : le livré de même `id`, sinon celui nommé par `basedOn`, sinon `defaut`. */
export function originOf(p: Profile, builtins: readonly Profile[]): Profile {
  const find = (id: string | undefined): Profile | undefined => (id === undefined ? undefined : builtins.find((b) => b.id === id));
  return find(p.id) ?? find(p.basedOn) ?? find(DEFAULT_PROFILE_ID) ?? builtins[0]!;
}
```

- [ ] **5. Lancer la commande bornée : vert attendu**, puis `tsc` (GC13).

- [ ] **6. Commit** : `apps/web/src/profile-edit.ts`, `apps/web/src/profile-edit.test.ts` ;
  message `feat(profile): pure editing operations (dock, size, hide, order, catalog, presets, resets, origin)`.

<a id="tache-t6"></a>
### Tâche T6 — Profil actif (liste en signal, `refresh`) et menu Profil étendu

**Objectif.** `ActiveProfile` publie la liste du magasin en signal et se relit par `refresh()` après un changement du
magasin, sans aperçu (DAC1-2, P20). `ProfileMenu` garde ses `menuitemradio` `data-profile` (essai s5b) et ajoute, dans
l'ordre : « Modifier… », « Importer… », « Exporter… », « Remettre à zéro ce profil » (grisé si rien à remettre),
« Supprimer » (profil de l'utilisateur seulement), « Tout remettre à zéro » (P22).

**Subagent.** implementeur-tdd. **Dépend de.** T1 (`resolveStartMode` qui rend `desktop-annotation`).

**Fichiers.** Modifier `apps/web/src/ui/active-profile.ts`, `apps/web/src/ui/active-profile.test.ts`,
`apps/web/src/ui/ProfileMenu.tsx`, `apps/web/src/ui/ProfileMenu.test.tsx`.

**Interfaces.**
- Consomme : `ProfileStore.list/get/activeId/setActive/save/remove` (existants) ; `resolveStartMode` (T1).
- Produit (exact, utilisé par T8, T9) :

```ts
export interface ActiveProfile {
  readonly profile: Accessor<Profile>;
  readonly profiles: Accessor<readonly Profile[]>;
  readonly capabilities: Accessor<RuntimeCapabilities>;
  choose(id: string): void;     // setActive (id inconnu : console.warn, inchangé), puis refresh()
  refresh(): void;              // relit store.list() et store.activeId()
  setCapabilities(c: RuntimeCapabilities): void;
}
export interface ProfileMenuProps {
  readonly profiles: Accessor<readonly Profile[]>;
  readonly activeId: Accessor<string>;
  readonly canResetCurrent: Accessor<boolean>;
  readonly canRemove: Accessor<boolean>;
  choose(id: string): void;
  edit(): void;
  importFile(): void;
  exportActive(): void;
  resetCurrent(): void;
  remove(): void;
  resetAll(): void;
}
// DOM : button[role=menuitem][data-profile-cmd="edit"|"import"|"export"|"reset"|"remove"|"reset-all"],
//       précédés de span.rb-menu-sep[role=separator]
```

- Réutilise : `apps/web/src/ui/active-profile.ts:6` — `ActiveProfile` (`profile`, `capabilities`, `choose`, `setCapabilities`), étendu de `profiles()` et `refresh()` (étendre).
- Réutilise : `apps/web/src/ui/ProfileMenu.tsx:10` — `ProfileMenuProps` étendu de `edit()`, `importFile()`, `exportActive()`, `resetCurrent()`, `remove()`, `resetAll()`, `canResetCurrent`, `canRemove` (étendre).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/ui/active-profile.test.ts src/ui/ProfileMenu.test.tsx --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -40
```

Attendu : 0 échec ; ≥ 11 tests ; présents : « commandes sous les profils, dans l'ordre », « refresh : liste en signal »,
« annotation : desktop-annotation avec la capacité ». À garder verts : « menu avec un menuitemradio par profil »,
« aria-checked sur le profil actif seulement », « un clic choisit le profil », « choose change le signal et le magasin ».

**Preuve visuelle.** Aucune ici (capture en T10).

**Contraintes (recopiées).**
- GC1 Budget : l'exécution entière tient en environ 3 h sur la VM de 8 cœurs, chargée ; une tâche vise 20 à 45 min ; aucune commande lourde hors celles de la section.
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test désactivé (`skip`, `only`, `todo`), aucun seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && [ -d node_modules ] || pnpm install --frozen-lockfile` ; `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c1-profils/apps/web/src/wasm apps/web/src/` (jamais commité).
- GC5 Preuve bornée : la commande de la section, telle quelle ; le rapport cite N ≥ 1 et les noms attendus.
- GC6 Commits : fichiers ajoutés un par un (`git add <chemin>`, jamais `-A`, `--all`, `.`, ni `commit -a`), auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle (jamais AGPL, GPL, LGPL).
- GC8 OD56 : ne pas toucher `feat/usage-c2-depot`.
- GC9 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.
- GC10 Aucun composant n'appelle `localStorage` ; `ActiveProfile` ne fait aucun aperçu (P20).
- GC11 Interface : aucun `switch`, aucune taille en `px` dans un `.tsx`, aucun `localStorage`, aucun glisser HTML5 ; libellés en français.
- GC12 Ne modifier que les fichiers touchés de la tâche.
- GC13 `tsc --noEmit` : seul écart admis, `src/ui/App.tsx` (props nouvelles de `ProfileMenu` non passées, branchées en T9).

**Interdits.** Toucher `App.tsx` ; renommer `data-profile` ; ajouter une action dans `ACTION_TABLE`.

**Terminé quand.** Commande bornée verte ; `tsc` n'a d'erreurs que dans `src/ui/App.tsx` ; un commit ; rapport avec
deux lignes `Réutilisation :`.

**Étapes.**

- [ ] **1. Préparer le worktree** (GC4).

- [ ] **2. Tests rouges du profil actif** (fin de `active-profile.test.ts`, dans le `describe`) :

```ts
  it("annotation : desktop-annotation avec la capacité, board sans (S5)", () => {
    const p = profileWithDrop();
    expect(resolveStartMode(p, { ...NO_CAPS, desktopAnnotation: true })).toEqual({ mode: "desktop-annotation", fellBack: false });
    expect(resolveStartMode(p, NO_CAPS)).toEqual({ mode: "board", fellBack: true });
  });

  it("refresh : liste en signal, profil actif relu après un changement du magasin", () => {
    const store = createProfileStore(null, BUILTIN_PROFILES);
    createRoot((dispose) => {
      const a = createActiveProfile(store, NO_CAPS);
      const counts: number[] = [];
      createComputed(() => counts.push(a.profiles().length));
      const perso = { ...BUILTIN_PROFILES[0]!, id: "perso", label: "Perso" };
      store.save(perso);
      expect(a.profiles()).toHaveLength(BUILTIN_PROFILES.length);
      a.refresh();
      expect(a.profiles().map((p) => p.id)).toContain("perso");
      expect(counts.slice(0, 2)).toEqual([BUILTIN_PROFILES.length, BUILTIN_PROFILES.length + 1]);
      a.choose("perso");
      store.save({ ...perso, label: "Perso 2" });
      a.refresh();
      expect(a.profile().label).toBe("Perso 2");
      store.remove("perso");
      a.refresh();
      expect(a.profile().id).toBe("defaut");
      dispose();
    });
  });
```

- [ ] **3. Tests rouges du menu** : `ProfileMenu.test.tsx` réécrit (les trois tests gardés, passés par `menu()`) :

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "../toolbar";
import { ProfileMenu, type ProfileMenuProps } from "./ProfileMenu";

afterEach(cleanup);

const prof = (id: string, label: string) => ({ id, label }) as unknown as Profile;
const LIST = [prof("a", "Alpha"), prof("b", "Beta")];

function menu(over: Partial<ProfileMenuProps> = {}) {
  const props: ProfileMenuProps = {
    profiles: () => LIST,
    activeId: () => "a",
    canResetCurrent: () => true,
    canRemove: () => true,
    choose: vi.fn(),
    edit: vi.fn(),
    importFile: vi.fn(),
    exportActive: vi.fn(),
    resetCurrent: vi.fn(),
    remove: vi.fn(),
    resetAll: vi.fn(),
    ...over,
  };
  return { ...render(() => <ProfileMenu {...props} />), props };
}

describe("ProfileMenu (T92)", () => {
  it("menu avec un menuitemradio par profil", () => {
    const { container } = menu();
    expect(container.querySelector("[data-profiles]")?.getAttribute("role")).toBe("menu");
    const items = container.querySelectorAll("button[role=menuitemradio]");
    expect(items.length).toBe(2);
    expect(items[1]?.textContent).toBe("Beta");
  });

  it("aria-checked sur le profil actif seulement", () => {
    const [id, setId] = createSignal("a");
    const { container } = menu({ activeId: id });
    const chk = (i: string) => container.querySelector(`[data-profile=${i}]`)?.getAttribute("aria-checked");
    expect(chk("a")).toBe("true");
    expect(chk("b")).toBe("false");
    setId("b");
    expect(chk("a")).toBe("false");
    expect(chk("b")).toBe("true");
  });

  it("un clic choisit le profil", () => {
    const { container, props } = menu();
    fireEvent.click(container.querySelector("[data-profile=b]")!);
    expect(props.choose).toHaveBeenCalledWith("b");
  });
});

describe("ProfileMenu — commandes (C1, P22)", () => {
  it("commandes sous les profils, dans l'ordre", () => {
    const { container } = menu();
    const cmds = [...container.querySelectorAll<HTMLButtonElement>("button[data-profile-cmd]")];
    expect(cmds.map((b) => [b.dataset["profileCmd"], b.textContent])).toEqual([
      ["edit", "Modifier…"],
      ["import", "Importer…"],
      ["export", "Exporter…"],
      ["reset", "Remettre à zéro ce profil"],
      ["remove", "Supprimer"],
      ["reset-all", "Tout remettre à zéro"],
    ]);
    expect(cmds.every((b) => b.getAttribute("role") === "menuitem")).toBe(true);
    const lastRadio = container.querySelector("[data-profile=b]")!;
    expect(lastRadio.compareDocumentPosition(cmds[0]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector('[role="separator"]')).not.toBeNull();
  });

  it("livré sans copie : « Remettre à zéro ce profil » grisé ; profil livré : « Supprimer » absent", () => {
    const [can, setCan] = createSignal(false);
    const { container } = menu({ canResetCurrent: can, canRemove: () => false });
    const reset = container.querySelector<HTMLButtonElement>('[data-profile-cmd="reset"]')!;
    expect(reset.disabled).toBe(true);
    setCan(true);
    expect(reset.disabled).toBe(false);
    expect(container.querySelector('[data-profile-cmd="remove"]')).toBeNull();
  });

  it("chaque commande appelle son geste", () => {
    const { container, props } = menu();
    const press = (cmd: string) => fireEvent.click(container.querySelector(`[data-profile-cmd="${cmd}"]`)!);
    press("edit");
    press("import");
    press("export");
    press("reset");
    press("remove");
    press("reset-all");
    for (const f of [props.edit, props.importFile, props.exportActive, props.resetCurrent, props.remove, props.resetAll]) {
      expect(f).toHaveBeenCalledTimes(1);
    }
    expect(props.choose).not.toHaveBeenCalled();
  });
});
```

- [ ] **4. Lancer la commande bornée : rouge attendu.**

- [ ] **5. Code** `ui/active-profile.ts` (remplace le fichier) :

```ts
import { createSignal, type Accessor } from "solid-js";
import type { ProfileStore } from "../profile-store";
import type { Profile, RuntimeCapabilities } from "../toolbar";
import { builtinProfile, DEFAULT_PROFILE_ID } from "../toolbar-profiles";

export interface ActiveProfile {
  readonly profile: Accessor<Profile>;
  /** Liste du magasin, relue par `refresh` (C1, DAC1-2). */
  readonly profiles: Accessor<readonly Profile[]>;
  readonly capabilities: Accessor<RuntimeCapabilities>;
  /** Rend `id` actif (id inconnu : avertissement, profil inchangé), puis relit le magasin. */
  choose(id: string): void;
  /** Relit la liste et le profil actif après un changement du magasin (enregistrer, importer, remettre à zéro). */
  refresh(): void;
  setCapabilities(c: RuntimeCapabilities): void;
}

export function createActiveProfile(store: ProfileStore, caps: RuntimeCapabilities): ActiveProfile {
  const current = (id: string): Profile => store.get(id) ?? builtinProfile(DEFAULT_PROFILE_ID)!;
  const [profile, setProfile] = createSignal<Profile>(current(store.activeId()));
  const [profiles, setProfiles] = createSignal<readonly Profile[]>(store.list(), { equals: false });
  const [capabilities, setCapabilities] = createSignal<RuntimeCapabilities>(caps);
  const refresh = (): void => {
    setProfiles(store.list());
    setProfile(current(store.activeId()));
  };
  return {
    profile,
    profiles,
    capabilities,
    choose(id) {
      try {
        store.setActive(id);
      } catch (e) {
        console.warn(String(e));
      }
      refresh();
    },
    refresh,
    setCapabilities: (c) => void setCapabilities(c),
  };
}
```

- [ ] **6. Code** `ui/ProfileMenu.tsx` (remplace le fichier) :

```tsx
import { For, Show, type Accessor, type JSX } from "solid-js";
import type { Profile } from "../toolbar";

/** Menu Profil (CL5b-9, C1 P22) : les profils, puis les commandes. Aucun geste ici : les props les portent. */
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

function Command(props: { name: string; label: string; run: () => void; disabled?: boolean }): JSX.Element {
  return (
    <button type="button" role="menuitem" data-profile-cmd={props.name} disabled={props.disabled ?? false} onClick={() => props.run()}>
      {props.label}
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
            {p.label}
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

- [ ] **7. Lancer la commande bornée : vert attendu**, puis `tsc` (seul écart : `src/ui/App.tsx`).

- [ ] **8. Commit** : les quatre fichiers ; message `feat(profile): reactive profile list with refresh; profile menu commands`.

<a id="tache-t7"></a>
### Tâche T7 — Éditeur de profil (`ProfileEditor.tsx`)

**Objectif.** Panneau passager à trois sections — Général (nom, démarrage, taille des boutons), Barres (par barre :
emplacement, éléments montrés ou masqués, Monter / Descendre, Ajouter), Préréglages (stylo) — qui travaille sur un
brouillon sans aperçu ; « Enregistrer », « Enregistrer comme nouveau » (nom proposé « <nom> (copie) »), « Rétablir les
barres », « Rétablir les préréglages », « Fermer » (P14-P17, P20, P28, P33, HC1-2).

**Subagent.** implementeur-tdd. **Dépend de.** T4 (`rb.css` d'abord), T5 (opérations).

**Fichiers.** Créer `apps/web/src/ui/ProfileEditor.tsx`, `apps/web/src/ui/ProfileEditor.test.tsx` ; modifier
`apps/web/src/ui/rb.css` (ajout en fin).

**Interfaces.**
- Consomme (T5) : `addItem`, `addPreset`, `canHide`, `catalog`, `moveItem`, `presetFields`, `PRESET_TOOLS`,
  `removePreset`, `resetAllPresets`, `resetToolbars`, `setButtonSize`, `setDock`, `setHidden`, `setLabel`,
  `setStartMode`, `updatePreset`, types `CatalogEntry`, `PresetField`, `PresetPatch` ; (T1) `isKnownItem`, `BUTTON_SIZES`,
  `DOCKS`, `START_MODES`, `TOOL_TABLE`.
- Produit (exact, utilisé par T9, T10) :

```ts
export interface ProfileEditorProps {
  readonly profile: Profile;   // copié en brouillon à l'ouverture
  readonly origin: Profile;    // originOf(profile, BUILTIN_PROFILES)
  save(draft: Profile): void;
  saveAsNew(draft: Profile, label: string): void;   // label déjà nettoyé (trim), jamais vide
  close(): void;
}
export function ProfileEditor(props: ProfileEditorProps): JSX.Element;
```

  DOM (sélecteurs de l'essai T10) : racine `[data-profile-editor][role=dialog]` ; sections
  `[data-edit-section="general"|"bars"|"presets"]` ; `input[data-edit="label"]`, `select[data-edit="start-mode"]`,
  `select[data-edit="button-size"]` ; par barre `fieldset[data-edit-bar="<id>"]` avec `select[data-edit="dock"]`,
  lignes `li[data-edit-item="<id>"]` (`[data-unknown]` si inconnu) portant `input[data-edit="shown"]`,
  `button[data-edit="up"]`, `button[data-edit="down"]`, puis `select[data-edit="add-choice"]` (valeurs
  `tool:<id>` / `action:<id>`) et `button[data-edit="add"]` ; `button[data-edit="reset-bars"]` ; préréglages
  `li[data-edit-preset="<id>"]` avec `input[data-edit="preset-label"|"preset-color"|"preset-width"]`,
  `button[data-edit="preset-remove"]`, puis `button[data-edit="preset-add"]`, `button[data-edit="reset-presets"]` ;
  pied `button[data-edit="save"]`, `input[data-edit="new-name"]`, `button[data-edit="save-new"]`,
  `button[data-edit="close"]`.
- Réutilise : aucune ligne propre de la liste du cadrage (l'éditeur est neuf, P20) ; il n'appelle que `profile-edit.ts` (T5) et les jetons `--rb-btn-*` de `ui/rb.css:1-12`.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/ui/ProfileEditor.test.tsx src/ui/Toolbar.test.tsx src/ui/App.test.tsx --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -80
```

Attendu : 0 échec ; ≥ 12 tests dans `ProfileEditor.test.tsx` ; présents : « S1 : brouillon », « S1 : masquer la
gomme ; la case de Profil est grisée », « S4 : Rétablir les préréglages », « élément inconnu : ligne grisée ». À garder
vert : « aucun switch sur l'identifiant, aucun px, aucun localStorage, aucun glisser HTML5 dans src/ui » (il lit
`ProfileEditor.tsx`) et « rb.css : la grille réserve la case de la scène » (`App.test.tsx`).

**Preuve visuelle.** Capture `docs/essais/c1-editeur.png` en T10.

**Contraintes (recopiées).**
- GC1 Budget : l'exécution entière tient en environ 3 h sur la VM de 8 cœurs, chargée ; une tâche vise 20 à 45 min ; aucune commande lourde hors celles de la section.
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test désactivé (`skip`, `only`, `todo`), aucun seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && [ -d node_modules ] || pnpm install --frozen-lockfile` ; `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c1-profils/apps/web/src/wasm apps/web/src/` (jamais commité).
- GC5 Preuve bornée : la commande de la section, telle quelle ; le rapport cite N ≥ 1 et les noms attendus.
- GC6 Commits : fichiers ajoutés un par un (`git add <chemin>`, jamais `-A`, `--all`, `.`, ni `commit -a`), auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle (jamais AGPL, GPL, LGPL) : éléments HTML natifs (`select`, `input type=checkbox|color|number|text`).
- GC8 OD56 : ne pas toucher `feat/usage-c2-depot`.
- GC9 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.
- GC10 L'éditeur n'écrit aucun stockage : il rend le brouillon par `save` ou `saveAsNew`.
- GC11 Interface : aucun `switch`, aucune taille en `px` dans un `.tsx`, aucun `localStorage`, aucun glisser HTML5 (`draggable`, `dragstart`) ; libellés en français, aucune icône seule, cibles d'au moins `--rb-btn-m` (règles de `rb.css`).
- GC12 Ne modifier que les fichiers touchés de la tâche.
- GC13 `tsc --noEmit` : seul écart admis, `src/ui/App.tsx` (props de `ProfileMenu`, branchées en T9).

**Interdits.** Aperçu en direct (les barres ne changent qu'à l'enregistrement) ; confirmation à la fermeture ; ordre
modifiable des préréglages ; glisser pour réordonner.

**Terminé quand.** Commande bornée verte ; `tsc` (écart `App.tsx` seul) ; un commit ; rapport avec la ligne
`Réutilisation :`.

**Étapes.**

- [ ] **1. Préparer le worktree** (GC4).

- [ ] **2. Tests rouges** `apps/web/src/ui/ProfileEditor.test.tsx` :

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addPreset, setButtonSize, setDock, setHidden } from "../profile-edit";
import { parseProfile, visibleItems, type Profile, type RuntimeCapabilities } from "../toolbar";
import { BUILTIN_PROFILES, DEFAULT_PROFILE_JSON } from "../toolbar-profiles";
import { ProfileEditor } from "./ProfileEditor";

afterEach(cleanup);

const ALL: RuntimeCapabilities = { desktopAnnotation: true, multiWindow: true, dropPaths: true, officeConverter: true };
const DEFAUT = BUILTIN_PROFILES[0]!;
const DOCK = '[data-edit-bar="outils"] select[data-edit="dock"]';
const shown = (id: string): string => `[data-edit-item="${id}"] input[data-edit="shown"]`;

function setup(profile: Profile = DEFAUT, origin: Profile = DEFAUT) {
  const save = vi.fn<(p: Profile) => void>();
  const saveAsNew = vi.fn<(p: Profile, label: string) => void>();
  const close = vi.fn<() => void>();
  const r = render(() => <ProfileEditor profile={profile} origin={origin} save={save} saveAsNew={saveAsNew} close={close} />);
  const q = <T extends Element>(sel: string): T => {
    const el = r.container.querySelector<T>(sel);
    if (el === null) throw new Error(`absent : ${sel}`);
    return el;
  };
  return { ...r, save, saveAsNew, close, q };
}
const setValue = (el: HTMLInputElement | HTMLSelectElement, value: string): void => {
  el.value = value;
  fireEvent.change(el);
};
const setChecked = (el: HTMLInputElement, checked: boolean): void => {
  el.checked = checked;
  fireEvent.change(el);
};
const typeIn = (el: HTMLInputElement, value: string): void => {
  el.value = value;
  fireEvent.input(el);
};
const last = (fn: { mock: { calls: unknown[][] } }): Profile => fn.mock.calls.at(-1)![0] as Profile;
const outils = (p: Profile) => p.toolbars.find((b) => b.id === "outils")!;
const itemOf = (p: Profile, id: string) => p.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items)).find((i) => i.id === id)!;

describe("ProfileEditor (C1, P20)", () => {
  it("trois sections : Général, Barres (une par barre), Préréglages du stylo", () => {
    const { container } = setup();
    expect([...container.querySelectorAll("[data-edit-section]")].map((s) => s.getAttribute("data-edit-section"))).toEqual(["general", "bars", "presets"]);
    expect([...container.querySelectorAll("[data-edit-bar]")].map((b) => b.getAttribute("data-edit-bar"))).toEqual(["outils", "pages"]);
    expect(container.querySelectorAll("[data-edit-preset]")).toHaveLength(3);
    expect(container.querySelector("[data-profile-editor]")!.getAttribute("role")).toBe("dialog");
  });

  it("S1 : brouillon, rien n'est rendu avant Enregistrer ; Enregistrer rend barre à gauche et grands boutons", () => {
    const { q, save } = setup();
    setValue(q<HTMLSelectElement>(DOCK), "left");
    setValue(q<HTMLSelectElement>('select[data-edit="button-size"]'), "l");
    expect(save).not.toHaveBeenCalled();
    expect(q<HTMLSelectElement>(DOCK).value).toBe("left");
    fireEvent.click(q('button[data-edit="save"]'));
    const p = last(save);
    expect(outils(p).dock).toBe("left");
    expect(p.interface.buttonSize).toBe("l");
    expect(p.id).toBe("defaut");
  });

  it("S1 : masquer la gomme ; la case de Profil est grisée (P2, P33)", () => {
    const { q, save } = setup();
    expect(q<HTMLInputElement>(shown("profiles")).disabled).toBe(true);
    expect(q<HTMLInputElement>(shown("eraser")).disabled).toBe(false);
    setChecked(q<HTMLInputElement>(shown("eraser")), false);
    fireEvent.click(q('button[data-edit="save"]'));
    const p = last(save);
    expect(itemOf(p, "eraser").hidden).toBe(true);
    expect(visibleItems(outils(p), ALL).map((i) => i.id)).not.toContain("eraser");
    expect(q('[data-edit-item="eraser"]')).toBeTruthy();
  });

  it("Monter / Descendre : à la frontière, l'élément entre dans le groupe voisin (P14)", () => {
    const { q, save } = setup();
    expect(q<HTMLButtonElement>('[data-edit-item="pen"] button[data-edit="up"]').disabled).toBe(true);
    expect(q<HTMLButtonElement>('[data-edit-item="settings"] button[data-edit="down"]').disabled).toBe(true);
    fireEvent.click(q('[data-edit-item="hand"] button[data-edit="down"]'));
    fireEvent.click(q('button[data-edit="save"]'));
    const groups = outils(last(save)).groups.map((g) => g.items.map((i) => i.id));
    expect(groups[0]).toEqual(["pen", "eraser", "eraser-mode"]);
    expect(groups[1]![0]).toBe("hand");
  });

  it("Ajouter un élément absent : en fin de barre, id rendu unique (P15)", () => {
    const { q, save } = setup();
    const add = q<HTMLButtonElement>('[data-edit-bar="outils"] button[data-edit="add"]');
    expect(add.disabled).toBe(true);
    setValue(q<HTMLSelectElement>('[data-edit-bar="outils"] select[data-edit="add-choice"]'), "action:page-next");
    fireEvent.click(q('[data-edit-bar="outils"] button[data-edit="add"]'));
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
    expect(q<HTMLSelectElement>(DOCK).value).toBe("top");
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
    setValue(q<HTMLSelectElement>(DOCK), "left");
    fireEvent.click(q('button[data-edit="save-new"]'));
    expect(saveAsNew).toHaveBeenCalledTimes(1);
    expect(saveAsNew.mock.calls[0]![1]).toBe("CM1");
    expect(outils(saveAsNew.mock.calls[0]![0]).dock).toBe("left");
    expect(save).not.toHaveBeenCalled();
  });

  it("nom du profil vide : Enregistrer grisé", () => {
    const { q } = setup();
    typeIn(q<HTMLInputElement>('input[data-edit="label"]'), " ");
    expect(q<HTMLButtonElement>('button[data-edit="save"]').disabled).toBe(true);
  });

  it("démarrage : Annotation du bureau enregistré dans behavior (P10)", () => {
    const { q, save } = setup();
    setValue(q<HTMLSelectElement>('select[data-edit="start-mode"]'), "desktop-annotation");
    fireEvent.click(q('button[data-edit="save"]'));
    expect(last(save).behavior.startMode).toBe("desktop-annotation");
  });

  it("élément inconnu : ligne grisée « inconnu (version plus récente) », case désactivée, déplaçable, réécrit tel quel (P16, S2)", () => {
    const json = JSON.parse(JSON.stringify(DEFAULT_PROFILE_JSON)) as Record<string, any>;
    json.toolbars[0].groups[0].items.splice(1, 0, { id: "laser", kind: "tool", tool: "laser", label: "Laser", raccourci: "L" });
    const r = parseProfile(json);
    if ("errors" in r) throw new Error(r.errors.join(" ; "));
    const { q, save } = setup(r.profile);
    const row = q('[data-edit-item="laser"]');
    expect(row.hasAttribute("data-unknown")).toBe(true);
    expect(row.textContent).toContain("inconnu (version plus récente)");
    expect(q<HTMLInputElement>(shown("laser")).disabled).toBe(true);
    fireEvent.click(q('[data-edit-item="laser"] button[data-edit="down"]'));
    fireEvent.click(q('button[data-edit="save"]'));
    const p = last(save);
    expect(outils(p).groups[0]!.items.map((i) => i.id)).toEqual(["pen", "eraser", "laser", "eraser-mode", "hand"]);
    expect(itemOf(p, "laser")).toEqual(itemOf(r.profile, "laser"));
  });

  it("Fermer : close appelé, rien n'est enregistré (P20)", () => {
    const { q, save, saveAsNew, close } = setup();
    setValue(q<HTMLSelectElement>(DOCK), "left");
    fireEvent.click(q('button[data-edit="close"]'));
    expect(close).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
    expect(saveAsNew).not.toHaveBeenCalled();
  });
});
```

- [ ] **3. Lancer la commande bornée : rouge attendu** (module absent).

- [ ] **4. Code** `apps/web/src/ui/ProfileEditor.tsx` :

```tsx
/**
 * Éditeur de profil (C1, P20) : panneau passager à trois sections (Général, Barres, Préréglages) sur un brouillon. Rien
 * ne change dans les barres avant « Enregistrer » ou « Enregistrer comme nouveau » ; fermer abandonne le brouillon. Chaque
 * geste appelle une opération pure de `profile-edit.ts` ; le composant n'écrit aucun stockage.
 */
import { createSignal, For, Show, type Accessor, type JSX } from "solid-js";
import {
  addItem,
  addPreset,
  canHide,
  catalog,
  moveItem,
  presetFields,
  PRESET_TOOLS,
  removePreset,
  resetAllPresets,
  resetToolbars,
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
  BUTTON_SIZES,
  DOCKS,
  isKnownItem,
  START_MODES,
  TOOL_TABLE,
  type ButtonSize,
  type Dock,
  type Preset,
  type Profile,
  type StartMode,
  type Toolbar,
  type ToolItem,
} from "../toolbar";

export interface ProfileEditorProps {
  /** Profil de départ ; le brouillon en est une copie prise à l'ouverture. */
  readonly profile: Profile;
  /** Profil livré d'origine (`originOf`) : source de « Rétablir les barres » et « Rétablir les préréglages ». */
  readonly origin: Profile;
  save(draft: Profile): void;
  saveAsNew(draft: Profile, label: string): void;
  close(): void;
}

type Edit = (f: (p: Profile) => Profile) => void;

const DOCK_LABELS: Readonly<Record<Dock, string>> = { top: "En haut", bottom: "En bas", left: "À gauche", right: "À droite", floating: "Flottante" };
const SIZE_LABELS: Readonly<Record<ButtonSize, string>> = { s: "Petits", m: "Moyens", l: "Grands" };
const START_LABELS: Readonly<Record<StartMode, string>> = { board: "Tableau", "desktop-annotation": "Annotation du bureau" };
const ROLE_LABELS: Readonly<Record<string, string>> = { tools: "Barre d'outils", pages: "Barre des pages" };
const UNKNOWN = "inconnu (version plus récente)";
/** Champ de préréglage → modification (table : couleur en texte, épaisseur en nombre). */
const PATCH: Readonly<Record<PresetField["key"], (raw: string) => PresetPatch>> = {
  color: (raw) => ({ color: raw }),
  width: (raw) => ({ width: Number(raw) }),
};

const pick = <T extends string>(list: readonly T[], v: string): T | undefined => list.find((x) => x === v);
const roleLabel = (bar: Toolbar): string => (Object.hasOwn(ROLE_LABELS, bar.role) ? ROLE_LABELS[bar.role]! : `Barre ${bar.id}`);
const itemName = (it: ToolItem): string => (it.kind === "separator" ? "Séparateur" : it.label || it.id);
const toolName = (tool: string): string => (Object.hasOwn(TOOL_TABLE, tool) ? TOOL_TABLE[tool]!.label : tool);
const entryKey = (e: CatalogEntry): string => `${e.kind}:${e.ref}`;

function ItemRow(props: { barId: string; item: ToolItem; index: number; last: number; edit: Edit }): JSX.Element {
  const known = isKnownItem(props.item);
  const name = itemName(props.item);
  return (
    <li data-edit-item={props.item.id} data-unknown={known ? undefined : ""} aria-disabled={known ? undefined : "true"}>
      <label>
        <input
          type="checkbox"
          data-edit="shown"
          checked={props.item.hidden !== true}
          disabled={!canHide(props.item)}
          onChange={(e) => {
            const on = e.currentTarget.checked;
            props.edit((p) => setHidden(p, props.item.id, !on));
          }}
        />
        <span>{known ? name : `${name} — ${UNKNOWN}`}</span>
      </label>
      <button type="button" data-edit="up" aria-label={`Monter ${name}`} disabled={props.index === 0} onClick={() => props.edit((p) => moveItem(p, props.barId, props.item.id, -1))}>
        Monter
      </button>
      <button type="button" data-edit="down" aria-label={`Descendre ${name}`} disabled={props.index === props.last} onClick={() => props.edit((p) => moveItem(p, props.barId, props.item.id, 1))}>
        Descendre
      </button>
    </li>
  );
}

function BarFieldset(props: { bar: Toolbar; draft: Accessor<Profile>; edit: Edit }): JSX.Element {
  const items = (): readonly ToolItem[] => props.bar.groups.flatMap((g) => g.items);
  const choices = (): readonly CatalogEntry[] => catalog(props.draft(), props.bar.id);
  const [choice, setChoice] = createSignal("");
  const add = (): void => {
    const entry = choices().find((e) => entryKey(e) === choice());
    if (entry === undefined) return;
    props.edit((p) => addItem(p, props.bar.id, entry));
    setChoice("");
  };
  return (
    <fieldset data-edit-bar={props.bar.id}>
      <legend>{roleLabel(props.bar)}</legend>
      <label>
        Emplacement{" "}
        <select
          data-edit="dock"
          onChange={(e) => {
            const dock = pick(DOCKS, e.currentTarget.value);
            if (dock !== undefined) props.edit((p) => setDock(p, props.bar.id, dock));
          }}
        >
          <For each={DOCKS}>{(d) => <option value={d} selected={props.bar.dock === d}>{DOCK_LABELS[d]}</option>}</For>
        </select>
      </label>
      <ul>
        <For each={items()}>
          {(it, i) => <ItemRow barId={props.bar.id} item={it} index={i()} last={items().length - 1} edit={props.edit} />}
        </For>
      </ul>
      <Show when={choices().length > 0}>
        <label>
          Ajouter{" "}
          <select data-edit="add-choice" onChange={(e) => setChoice(e.currentTarget.value)}>
            <option value="" selected={choice() === ""}>Choisir…</option>
            <For each={choices()}>{(c) => <option value={entryKey(c)}>{c.kind === "tool" ? `Outil : ${c.label}` : c.label}</option>}</For>
          </select>
        </label>
        <button type="button" data-edit="add" disabled={choice() === ""} onClick={add}>
          Ajouter
        </button>
      </Show>
    </fieldset>
  );
}

function PresetInput(props: { tool: string; preset: Preset; field: PresetField; edit: Edit }): JSX.Element {
  return (
    <label>
      {props.field.label}{" "}
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
  const list = (): readonly Preset[] => (Object.hasOwn(props.draft().presets, props.tool) ? (props.draft().presets[props.tool] ?? []) : []);
  const fields = presetFields(props.tool);
  return (
    <fieldset data-edit-presets={props.tool}>
      <legend>{toolName(props.tool)}</legend>
      <ul>
        <For each={list()}>
          {(p) => (
            <li data-edit-preset={p.id}>
              <label>
                Nom{" "}
                <input
                  type="text"
                  data-edit="preset-label"
                  value={p.label}
                  onChange={(e) => {
                    const label = e.currentTarget.value;
                    props.edit((d) => updatePreset(d, props.tool, p.id, { label }));
                  }}
                />
              </label>
              <For each={fields}>{(f) => <PresetInput tool={props.tool} preset={p} field={f} edit={props.edit} />}</For>
              <button type="button" data-edit="preset-remove" aria-label={`Retirer ${p.label}`} onClick={() => props.edit((d) => removePreset(d, props.tool, p.id))}>
                Retirer
              </button>
            </li>
          )}
        </For>
      </ul>
      <button type="button" data-edit="preset-add" onClick={() => props.edit((d) => addPreset(d, props.tool))}>
        Ajouter une couleur
      </button>
    </fieldset>
  );
}

export function ProfileEditor(props: ProfileEditorProps): JSX.Element {
  const [draft, setDraft] = createSignal<Profile>(props.profile);
  const [newName, setNewName] = createSignal(`${props.profile.label} (copie)`);
  const edit: Edit = (f) => void setDraft((p) => f(p));
  return (
    <div class="rb-editor" data-profile-editor role="dialog" aria-label="Modifier le profil">
      <section data-edit-section="general">
        <h3>Général</h3>
        <label>
          Nom{" "}
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
        <label>
          Démarrage{" "}
          <select
            data-edit="start-mode"
            onChange={(e) => {
              const mode = pick(START_MODES, e.currentTarget.value);
              if (mode !== undefined) edit((p) => setStartMode(p, mode));
            }}
          >
            <For each={START_MODES}>{(m) => <option value={m} selected={draft().behavior.startMode === m}>{START_LABELS[m]}</option>}</For>
          </select>
        </label>
        <label>
          Taille des boutons{" "}
          <select
            data-edit="button-size"
            onChange={(e) => {
              const size = pick(BUTTON_SIZES, e.currentTarget.value);
              if (size !== undefined) edit((p) => setButtonSize(p, size));
            }}
          >
            <For each={BUTTON_SIZES}>{(s) => <option value={s} selected={draft().interface.buttonSize === s}>{SIZE_LABELS[s]}</option>}</For>
          </select>
        </label>
      </section>
      <section data-edit-section="bars">
        <h3>Barres</h3>
        <For each={draft().toolbars}>{(bar) => <BarFieldset bar={bar} draft={draft} edit={edit} />}</For>
        <button type="button" data-edit="reset-bars" onClick={() => edit((p) => resetToolbars(p, props.origin))}>
          Rétablir les barres
        </button>
      </section>
      <section data-edit-section="presets">
        <h3>Préréglages</h3>
        <For each={PRESET_TOOLS}>{(tool) => <PresetList tool={tool} draft={draft} edit={edit} />}</For>
        <button type="button" data-edit="reset-presets" onClick={() => edit((p) => resetAllPresets(p, props.origin))}>
          Rétablir les préréglages
        </button>
      </section>
      <div class="rb-editor-actions">
        <button type="button" data-edit="save" disabled={draft().label.trim() === ""} onClick={() => props.save(draft())}>
          Enregistrer
        </button>
        <label>
          Nom du nouveau profil{" "}
          <input type="text" data-edit="new-name" value={newName()} onInput={(e) => setNewName(e.currentTarget.value)} />
        </label>
        <button type="button" data-edit="save-new" disabled={newName().trim() === ""} onClick={() => props.saveAsNew(draft(), newName().trim())}>
          Enregistrer comme nouveau
        </button>
        <button type="button" data-edit="close" onClick={() => props.close()}>
          Fermer
        </button>
      </div>
    </div>
  );
}
```

- [ ] **5. CSS** en fin de `ui/rb.css` :

```css
/* Menu des profils et éditeur (C1, P20, P22) : cibles d'au moins --rb-btn-m, libellés en clair, éléments inconnus grisés. */
[data-profiles] { display: grid; gap: 4px; padding: 4px; }
[data-profiles] button { min-height: var(--rb-btn-m); padding: 0 var(--rb-pad); text-align: start; }
.rb-menu-sep { border-block-start: 1px solid #a1a1aa; margin: 4px 0; }
.rb-editor { display: grid; gap: var(--rb-gap); padding: var(--rb-pad); }
.rb-editor section { display: grid; gap: var(--rb-gap); }
.rb-editor h3 { margin: 0; font-size: 1rem; }
.rb-editor fieldset { display: grid; gap: var(--rb-gap); border: 1px solid #d4d4d8; }
.rb-editor ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.rb-editor li { display: flex; flex-wrap: wrap; align-items: center; gap: var(--rb-gap); }
.rb-editor li[data-unknown] { color: #71717a; font-style: italic; }
.rb-editor button, .rb-editor select, .rb-editor input:not([type="checkbox"]) { min-height: var(--rb-btn-m); }
.rb-editor input[type="checkbox"] { inline-size: calc(var(--rb-btn-m) / 2); block-size: calc(var(--rb-btn-m) / 2); }
.rb-editor-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--rb-gap); }
```

- [ ] **6. Lancer la commande bornée : vert attendu**, puis `tsc` (écart `App.tsx` seul).

- [ ] **7. Commit** : `apps/web/src/ui/ProfileEditor.tsx`, `apps/web/src/ui/ProfileEditor.test.tsx`,
  `apps/web/src/ui/rb.css` ; message `feat(profile): profile editor on a draft (general, bars, pen presets)`.

<a id="tache-t8"></a>
### Tâche T8 — Gestes de profil (`app/profile-actions.ts`)

**Objectif.** Les gestes du menu Profil et de l'éditeur, testés sans DOM : « Enregistrer » (copie de même `id` pour un
livré, P5), « Enregistrer comme nouveau » (P28 : id = slug unique, `basedOn` = origine), « Importer… » (P24 : refus
annoncé, avertissements au journal, confirmation si l'id est pris, le profil importé devient actif), « Exporter… »
(P23), « Remettre à zéro ce profil » et « Tout remettre à zéro » (P6), « Supprimer » (PC5). Toute écriture passe par
`withCurrentMinor` (P4).

**Subagent.** implementeur-tdd. **Dépend de.** T2 (magasin), T3 (fichiers), T5 (`originOf`, `resetToOrigin`), T6
(`refresh`).

**Fichiers.** Créer `apps/web/src/app/profile-actions.ts`, `apps/web/src/app/profile-actions.test.ts`.

**Interfaces.**
- Consomme : `ProfileStore` (T2) ; `planImport`, `profileFromText`, `profileToFile`, `slug`, `uniqueId` (T3) ;
  `ProfileFiles` (T3) ; `originOf`, `resetToOrigin` (T5) ; `ActiveProfile.choose/refresh/profile` (T6) ;
  `withCurrentMinor` (T1).
- Produit (exact, utilisé par T9) :

```ts
export type ImportOutcome = "imported" | "cancelled" | "refused";
export const RESET_ALL_QUESTION = "Tout remettre à zéro ? Les profils créés et les changements des profils fournis seront effacés.";
export interface ProfileActionsDeps {
  readonly store: ProfileStore;
  readonly active: ActiveProfile;
  readonly files: ProfileFiles;
  readonly shell: Pick<ShellPort, "confirm" | "notify">;
  readonly builtins: readonly Profile[];
  readonly warn: (message: string) => void;
}
export interface ProfileActions {
  save(draft: Profile): void;
  saveAsNew(draft: Profile, label: string): Profile;   // lève « nom de profil vide » si label.trim() === ""
  importFile(): Promise<ImportOutcome>;
  exportActive(): Promise<boolean>;
  canResetCurrent(): boolean;
  resetCurrent(): void;
  canRemove(): boolean;
  remove(): Promise<boolean>;
  resetAll(): Promise<boolean>;
}
export function createProfileActions(d: ProfileActionsDeps): ProfileActions;
```

  Messages exacts : refus `Profil non importé (<nom du fichier>) : <erreurs jointes par « ; »>` ; avertissement
  `profil importé <nom> : <avertissement>` ; export raté `Profil non exporté (<nom>) : <message>` ; suppression
  `Supprimer le profil « <libellé> » ?`.
- Réutilise : `apps/web/src/platform/files.ts:71` — `ShellPort.confirm(message)`, `ShellPort.notify(message)` (réutiliser, type `Pick<ShellPort, "confirm" | "notify">`).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/app/profile-actions.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -40
```

Attendu : 0 échec ; ≥ 15 tests ; présents : « S1 : tout remettre à zéro puis réimporter », « S2 : id pris, Annuler :
rien n'est importé », « S3 : cm1 remis à zéro », « RF3 : nom qui donnerait un livré ou un slug vide », « P33 : profil
importé sans accès Profil », « fichier illisible : message, rien n'est importé ».

**Preuve visuelle.** Aucune.

**Contraintes (recopiées).**
- GC1 Budget : l'exécution entière tient en environ 3 h sur la VM de 8 cœurs, chargée ; une tâche vise 20 à 45 min ; aucune commande lourde hors celles de la section.
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test désactivé (`skip`, `only`, `todo`), aucun seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && [ -d node_modules ] || pnpm install --frozen-lockfile` ; `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c1-profils/apps/web/src/wasm apps/web/src/` (jamais commité).
- GC5 Preuve bornée : la commande de la section, telle quelle ; le rapport cite N ≥ 1 et les noms attendus.
- GC6 Commits : fichiers ajoutés un par un (`git add <chemin>`, jamais `-A`, `--all`, `.`, ni `commit -a`), auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle (jamais AGPL, GPL, LGPL).
- GC8 OD56 : ne pas toucher `feat/usage-c2-depot` ; ne pas modifier `platform/import.ts` (le `.rbprofile` déposé reste hors C1, P26).
- GC9 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.
- GC10 `PROFILE_MINOR` vaut 1 : chaque profil écrit par un geste passe par `withCurrentMinor` ; seul le magasin écrit le stockage.
- GC12 Ne modifier que les fichiers touchés de la tâche.
- GC13 `tsc --noEmit` : seul écart admis, `src/ui/App.tsx` (branché en T9).

**Interdits.** Appeler `localStorage`, `window` ou le DOM ; importer sans passer par `profileFromText` ; importer
malgré un « Annuler ».

**Terminé quand.** Commande bornée verte ; `tsc` (écart `App.tsx` seul) ; un commit ; rapport avec la ligne
`Réutilisation :`.

**Étapes.**

- [ ] **1. Préparer le worktree** (GC4).

- [ ] **2. Tests rouges** `apps/web/src/app/profile-actions.test.ts` :

```ts
// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRoot } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProfileFiles } from "../platform/profile-files";
import { addPreset, setButtonSize, setDock, setHidden, setStartMode } from "../profile-edit";
import { createProfileStore, PROFILES_KEY, type KeyValue } from "../profile-store";
import { visibleItems, type Profile, type RuntimeCapabilities } from "../toolbar";
import { BUILTIN_PROFILES } from "../toolbar-profiles";
import { createActiveProfile } from "../ui/active-profile";
import { createProfileActions, RESET_ALL_QUESTION } from "./profile-actions";

const NO_CAPS: RuntimeCapabilities = { desktopAnnotation: false, multiWindow: false, dropPaths: false, officeConverter: false };
const DEFAUT = BUILTIN_PROFILES[0]!;
const SIMPLE = BUILTIN_PROFILES[1]!;
const fixture = (name: string): string => readFileSync(join(__dirname, "..", "fixtures", "profils", name), "utf8");
const outils = (p: Profile) => p.toolbars.find((b) => b.id === "outils")!;
const visible = (p: Profile) => visibleItems(outils(p), NO_CAPS).map((i) => i.id);
let disposers: (() => void)[] = [];
afterEach(() => {
  for (const d of disposers) d();
  disposers = [];
});

function fakeKv(): KeyValue & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
}

type Picked = { name: string; text: string } | null;
function setup(picks: Picked[] = []) {
  const kv = fakeKv();
  const store = createProfileStore(kv, BUILTIN_PROFILES);
  const active = createRoot((dispose) => {
    disposers.push(dispose);
    return createActiveProfile(store, NO_CAPS);
  });
  const saved: { name: string; text: string }[] = [];
  const files: ProfileFiles = {
    pick: vi.fn(async () => picks.shift() ?? null),
    save: vi.fn(async (name: string, text: string) => {
      saved.push({ name, text });
      return true;
    }),
  };
  const shell = { confirm: vi.fn(async (_m: string) => true), notify: vi.fn(async (_m: string) => undefined) };
  const warn = vi.fn<(m: string) => void>();
  const actions = createProfileActions({ store, active, files, shell, builtins: BUILTIN_PROFILES, warn });
  return { kv, store, active, files, saved, shell, warn, actions, picks };
}
/** Brouillon de S1 : barre d'outils à gauche, grands boutons, sans gomme, cinq préréglages. */
const cm1Draft = (): Profile => addPreset(addPreset(setHidden(setButtonSize(setDock(DEFAUT, "outils", "left"), "l"), "eraser", true), "pen"), "pen");

describe("gestes de profil (C1)", () => {
  it("S1 : enregistrer comme nouveau « CM1 » : id cm1, basedOn defaut, minor 1, actif ; defaut inchangé", () => {
    const { store, active, actions } = setup();
    const p = actions.saveAsNew(cm1Draft(), "CM1");
    expect([p.id, p.label, p.basedOn, p.minor]).toEqual(["cm1", "CM1", "defaut", 1]);
    expect(active.profile().id).toBe("cm1");
    expect(outils(active.profile()).dock).toBe("left");
    expect(active.profiles().map((x) => x.id)).toContain("cm1");
    expect(store.get("defaut")).toBe(DEFAUT);
  });

  it("S1 : exporter cm1 : cm1.rbprofile, JSON indenté qui se relit", async () => {
    const { actions, saved } = setup();
    actions.saveAsNew(cm1Draft(), "CM1");
    expect(await actions.exportActive()).toBe(true);
    expect(saved[0]!.name).toBe("cm1.rbprofile");
    const json = JSON.parse(saved[0]!.text) as Record<string, unknown>;
    expect([json.format, json.id, json.basedOn, json.minor]).toEqual(["roomboard-profile", "cm1", "defaut", 1]);
  });

  it("S1 : tout remettre à zéro (confirmé) puis réimporter le fichier : cm1 revient, actif, à gauche, sans gomme", async () => {
    const { store, active, actions, saved, shell, picks, kv } = setup();
    actions.saveAsNew(cm1Draft(), "CM1");
    await actions.exportActive();
    expect(await actions.resetAll()).toBe(true);
    expect(shell.confirm).toHaveBeenCalledWith(RESET_ALL_QUESTION);
    expect(active.profile().id).toBe("defaut");
    expect(store.get("cm1")).toBeNull();
    expect(kv.map.has(PROFILES_KEY)).toBe(false);
    picks.push(saved[0]!);
    expect(await actions.importFile()).toBe("imported");
    expect(active.profile().id).toBe("cm1");
    expect(outils(active.profile()).dock).toBe("left");
    expect(active.profile().interface.buttonSize).toBe("l");
    expect(visible(active.profile())).not.toContain("eraser");
    expect(active.profile().presets.pen).toHaveLength(5);
  });

  it("S2 : 1.2 importé : actif, avertissements au journal, réexport sans perte", async () => {
    const raw = fixture("1.2-outil-inconnu.rbprofile");
    const { active, actions, saved, warn } = setup([{ name: "1.2-outil-inconnu.rbprofile", text: raw }]);
    expect(await actions.importFile()).toBe("imported");
    expect(active.profile().id).toBe("futur");
    expect(warn).toHaveBeenCalledWith("profil importé 1.2-outil-inconnu.rbprofile : outil inconnu masqué : laser");
    expect(visible(active.profile())).not.toContain("laser");
    await actions.exportActive();
    expect(JSON.parse(saved[0]!.text)).toEqual(JSON.parse(raw));
  });

  it("S2 : 2.0 refusé : message « mettez RoomBoard à jour », profil actif inchangé", async () => {
    const { active, actions, shell, store } = setup([{ name: "2.0-majeure.rbprofile", text: fixture("2.0-majeure.rbprofile") }]);
    expect(await actions.importFile()).toBe("refused");
    const msg = String(shell.notify.mock.calls[0]![0]);
    expect(msg.startsWith("Profil non importé (2.0-majeure.rbprofile) : ")).toBe(true);
    expect(msg).toContain("mettez RoomBoard à jour");
    expect(active.profile().id).toBe("defaut");
    expect(store.get("majeure")).toBeNull();
  });

  it("S2 : id pris, Annuler : rien n'est importé", async () => {
    const { store, active, actions, saved, shell, picks } = setup();
    actions.saveAsNew(cm1Draft(), "CM1");
    await actions.exportActive();
    active.choose("defaut");
    const before = store.get("cm1");
    shell.confirm.mockResolvedValueOnce(false);
    picks.push({ name: "cm1.rbprofile", text: saved[0]!.text.replace('"CM1"', '"CM1 bis"') });
    expect(await actions.importFile()).toBe("cancelled");
    expect(shell.confirm).toHaveBeenCalledWith("Remplacer le profil « CM1 » ?");
    expect(store.get("cm1")).toBe(before);
    expect(active.profile().id).toBe("defaut");
  });

  it("id pris, Oui : remplacé ; id d'un livré : copie de même id (P5)", async () => {
    const text = JSON.stringify({ format: "roomboard-profile", schema: 1, id: "defaut", label: "Pirate", toolbars: [] });
    const { store, active, actions, shell } = setup([{ name: "pirate.rbprofile", text }]);
    expect(await actions.importFile()).toBe("imported");
    expect(shell.confirm).toHaveBeenCalledWith("Remplacer le profil « Par défaut » ?");
    expect(store.hasOverride("defaut")).toBe(true);
    expect(active.profile().label).toBe("Pirate");
    expect(store.list().filter((p) => p.id === "defaut")).toHaveLength(1);
  });

  it("S3 : Enregistrer sur defaut (taille s) : même nom, copie ; Remettre à zéro ce profil : taille m, copie retirée", () => {
    const { store, active, actions, kv } = setup();
    expect(actions.canResetCurrent()).toBe(false);
    actions.save(setButtonSize(DEFAUT, "s"));
    expect(active.profile().label).toBe("Par défaut");
    expect(active.profile().interface.buttonSize).toBe("s");
    expect(createProfileStore(kv, BUILTIN_PROFILES).get("defaut")!.interface.buttonSize).toBe("s");
    expect(actions.canResetCurrent()).toBe(true);
    actions.resetCurrent();
    expect(store.hasOverride("defaut")).toBe(false);
    expect(active.profile()).toBe(DEFAUT);
    expect(JSON.parse(kv.map.get(PROFILES_KEY)!)).toEqual([]);
  });

  it("S3 : copie de simple remise à zéro : simple revient", () => {
    const { active, actions } = setup();
    active.choose("simple");
    actions.save({ ...SIMPLE, label: "Ma copie" });
    actions.resetCurrent();
    expect(active.profile()).toBe(SIMPLE);
  });

  it("S3 : cm1 remis à zéro : barres, préréglages, démarrage de defaut ; nom CM1, id cm1 gardés", () => {
    const { active, actions } = setup();
    actions.saveAsNew(setStartMode(cm1Draft(), "desktop-annotation"), "CM1");
    expect(actions.canResetCurrent()).toBe(true);
    actions.resetCurrent();
    const p = active.profile();
    expect([p.id, p.label, p.basedOn]).toEqual(["cm1", "CM1", "defaut"]);
    expect(p.toolbars).toEqual(DEFAUT.toolbars);
    expect(p.presets).toEqual(DEFAUT.presets);
    expect(p.behavior).toEqual(DEFAUT.behavior);
    expect(p.interface.buttonSize).toBe("m");
  });

  it("Supprimer : jamais un livré ; cm1 confirmé → retiré, defaut actif ; refusé → rien", async () => {
    const { store, active, actions, shell } = setup();
    expect(actions.canRemove()).toBe(false);
    expect(await actions.remove()).toBe(false);
    actions.saveAsNew(cm1Draft(), "CM1");
    expect(actions.canRemove()).toBe(true);
    shell.confirm.mockResolvedValueOnce(false);
    expect(await actions.remove()).toBe(false);
    expect(store.get("cm1")).not.toBeNull();
    expect(await actions.remove()).toBe(true);
    expect(shell.confirm).toHaveBeenLastCalledWith("Supprimer le profil « CM1 » ?");
    expect(store.get("cm1")).toBeNull();
    expect(active.profile().id).toBe("defaut");
    expect(active.profiles().map((p) => p.id)).not.toContain("cm1");
  });

  it("tout remettre à zéro refusé : rien n'est effacé", async () => {
    const { store, actions, shell } = setup();
    actions.saveAsNew(cm1Draft(), "CM1");
    shell.confirm.mockResolvedValueOnce(false);
    expect(await actions.resetAll()).toBe(false);
    expect(store.get("cm1")).not.toBeNull();
  });

  it("RF3 : nom qui donnerait un livré ou un slug vide : id unique, jamais un livré ; nom vide refusé", () => {
    const { actions } = setup();
    expect(actions.saveAsNew(DEFAUT, "Simple").id).toBe("simple-2");
    expect(actions.saveAsNew(DEFAUT, "Annotation").id).toBe("annotation-2");
    expect(actions.saveAsNew(DEFAUT, "!!!").id).toBe("profil");
    expect(actions.saveAsNew(DEFAUT, "!!!").id).toBe("profil-2");
    expect(() => actions.saveAsNew(DEFAUT, "   ")).toThrow("nom de profil vide");
  });

  it("P33 : profil importé sans accès Profil : accès ajouté, avertissement au journal", async () => {
    const ferme = {
      format: "roomboard-profile", schema: 1, id: "ferme", label: "Fermé",
      toolbars: [{ id: "outils", role: "tools", dock: "top", groups: [{ id: "g", items: [{ id: "pen", kind: "tool", tool: "pen", label: "Stylo" }] }] }],
    };
    const { active, actions, warn } = setup([{ name: "ferme.rbprofile", text: JSON.stringify(ferme) }]);
    expect(await actions.importFile()).toBe("imported");
    expect(visible(active.profile())).toEqual(["pen", "profiles"]);
    expect(warn).toHaveBeenCalledWith("profil importé ferme.rbprofile : accès au menu Profil ajouté");
  });

  it("Importer annulé (boîte fermée) : rien, aucune question", async () => {
    const { store, actions, shell } = setup();
    expect(await actions.importFile()).toBe("cancelled");
    expect(shell.confirm).not.toHaveBeenCalled();
    expect(shell.notify).not.toHaveBeenCalled();
    expect(store.list()).toEqual(BUILTIN_PROFILES);
  });

  it("fichier illisible : message, rien n'est importé", async () => {
    const { store, actions, shell } = setup([{ name: "x.rbprofile", text: "{pas du json" }]);
    expect(await actions.importFile()).toBe("refused");
    expect(String(shell.notify.mock.calls[0]![0])).toMatch(/^Profil non importé \(x\.rbprofile\) : fichier de profil illisible/);
    expect(store.list()).toEqual(BUILTIN_PROFILES);
  });

  it("export qui lève : message, faux", async () => {
    const { actions, files, shell } = setup();
    vi.mocked(files.save).mockRejectedValueOnce(new Error("disque plein"));
    expect(await actions.exportActive()).toBe(false);
    expect(shell.notify).toHaveBeenCalledWith("Profil non exporté (par-defaut.rbprofile) : disque plein");
  });
});
```

- [ ] **3. Lancer la commande bornée : rouge attendu** (module absent).

- [ ] **4. Code** `apps/web/src/app/profile-actions.ts` :

```ts
/**
 * Gestes du menu Profil et de l'éditeur (C1 : P4-P6, P22-P24, P28) : enregistrer, enregistrer comme nouveau, importer,
 * exporter, remettre à zéro, supprimer. Le magasin garde les profils, `profile-file.ts` lit et écrit le texte,
 * `ProfileFiles` choisit le fichier ; ici, l'ordre des gestes et les questions posées. Aucun DOM.
 */
import type { ShellPort } from "../platform/files";
import type { ProfileFiles } from "../platform/profile-files";
import { originOf, resetToOrigin } from "../profile-edit";
import { planImport, profileFromText, profileToFile, slug, uniqueId } from "../profile-file";
import type { ProfileStore } from "../profile-store";
import { withCurrentMinor, type Profile } from "../toolbar";
import type { ActiveProfile } from "../ui/active-profile";

export type ImportOutcome = "imported" | "cancelled" | "refused";

export const RESET_ALL_QUESTION = "Tout remettre à zéro ? Les profils créés et les changements des profils fournis seront effacés.";

export interface ProfileActionsDeps {
  readonly store: ProfileStore;
  readonly active: ActiveProfile;
  readonly files: ProfileFiles;
  readonly shell: Pick<ShellPort, "confirm" | "notify">;
  readonly builtins: readonly Profile[];
  /** Journal des avertissements d'import (U13) ; `console.warn` dans l'application. */
  readonly warn: (message: string) => void;
}

export interface ProfileActions {
  /** « Enregistrer » : remplace le profil (copie de même id pour un livré, P5) et le rend actif. */
  save(draft: Profile): void;
  /** « Enregistrer comme nouveau » : id = slug unique du nom (jamais un livré), `basedOn` = origine ; rendu actif. */
  saveAsNew(draft: Profile, label: string): Profile;
  importFile(): Promise<ImportOutcome>;
  exportActive(): Promise<boolean>;
  /** Faux pour un profil livré sans copie (rien à remettre à zéro). */
  canResetCurrent(): boolean;
  /** Copie d'un livré : retirée ; profil de l'utilisateur : ramené à son origine, id et nom gardés (P6). */
  resetCurrent(): void;
  canRemove(): boolean;
  remove(): Promise<boolean>;
  resetAll(): Promise<boolean>;
}

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export function createProfileActions(d: ProfileActionsDeps): ProfileActions {
  const builtinIds = new Set(d.builtins.map((b) => b.id));
  /** Écrit en mineure courante et rend actif. */
  const keep = (p: Profile): void => {
    d.store.save(withCurrentMinor(p));
    d.active.choose(p.id);
  };
  return {
    save: (draft) => keep(draft),
    saveAsNew(draft, label) {
      const name = label.trim();
      if (name === "") throw new Error("nom de profil vide");
      const taken = new Set([...builtinIds, ...d.store.list().map((p) => p.id)]);
      const { basedOn: _previous, ...rest } = draft;
      const id = uniqueId(slug(name), taken);
      keep({ ...rest, id, label: name, basedOn: originOf(draft, d.builtins).id });
      return d.store.get(id)!;
    },
    async importFile() {
      const picked = await d.files.pick();
      if (picked === null) return "cancelled";
      const r = profileFromText(picked.text);
      if ("errors" in r) {
        await d.shell.notify(`Profil non importé (${picked.name}) : ${r.errors.join(" ; ")}`);
        return "refused";
      }
      for (const w of r.warnings) d.warn(`profil importé ${picked.name} : ${w}`);
      const plan = planImport(r.profile, d.store.list(), builtinIds);
      if (plan.kind === "confirm" && !(await d.shell.confirm(plan.message))) return "cancelled";
      keep(r.profile);
      return "imported";
    },
    async exportActive() {
      const f = profileToFile(d.active.profile());
      try {
        return await d.files.save(f.name, f.text);
      } catch (e) {
        await d.shell.notify(`Profil non exporté (${f.name}) : ${messageOf(e)}`);
        return false;
      }
    },
    canResetCurrent() {
      const p = d.active.profile();
      return d.store.isBuiltin(p.id) ? d.store.hasOverride(p.id) : true;
    },
    resetCurrent() {
      const p = d.active.profile();
      if (d.store.isBuiltin(p.id)) d.store.revert(p.id);
      else d.store.save(withCurrentMinor(resetToOrigin(p, originOf(p, d.builtins))));
      d.active.refresh();
    },
    canRemove: () => !d.store.isBuiltin(d.active.profile().id),
    async remove() {
      const p = d.active.profile();
      if (d.store.isBuiltin(p.id)) return false;
      if (!(await d.shell.confirm(`Supprimer le profil « ${p.label} » ?`))) return false;
      d.store.remove(p.id);
      d.active.refresh();
      return true;
    },
    async resetAll() {
      if (!(await d.shell.confirm(RESET_ALL_QUESTION))) return false;
      d.store.resetAll();
      d.active.refresh();
      return true;
    },
  };
}
```

- [ ] **5. Lancer la commande bornée : vert attendu**, puis `tsc` (écart `App.tsx` seul).

- [ ] **6. Commit** : `apps/web/src/app/profile-actions.ts`, `apps/web/src/app/profile-actions.test.ts` ;
  message `feat(profile): profile gestures (save, save as new, import, export, reset, remove)`.

<a id="tache-t9"></a>
### Tâche T9 — Branchement : `App.tsx` (menu, éditeur, rangée, mode au montage) et `main.ts` (`ProfileFiles`)

**Objectif.** Brancher le tout : `host.setMode(resolveStartMode(...).mode)` une fois au montage (P10, P11) ; la rangée
des préréglages dans les barres d'outils (P18) ; le menu Profil étendu et le panneau « editor » (P20-P22 : changer de
panneau abandonne le brouillon) ; `ProfileFiles` créé dans l'amorce (coque ou web, P25).

**Subagent.** implementeur-tdd. **Dépend de.** T4, T6, T7, T8 (et, par eux, T1, T2, T3, T5).

**Fichiers.** Modifier `apps/web/src/ui/App.tsx` (l. 8-39, 100-118, 177-188), `apps/web/src/ui/App.test.tsx`,
`apps/web/src/main.ts` (l. 14-21, 49-51, 99-110).

**Interfaces.**
- Consomme : `createProfileActions` (T8), `ProfileEditor` (T7), `ProfileMenu` étendu et `ActiveProfile.profiles` (T6),
  `ToolbarProps.presets` (T4), `ProfileFiles`, `createWebProfileFiles`, `createTauriProfileFiles` (T3), `originOf` (T5),
  `resolveStartMode` (T1), `BUILTIN_PROFILES` (T2).
- Produit : `AppProps.profileFiles: ProfileFiles` ; `type Panel = "settings" | "profiles" | "editor"`.
- Réutilise : `apps/web/src/ui/rb.css:28` `.rb-popover` et `apps/web/src/ui/App.tsx:163-188` — même panneau passager pour le menu et l'éditeur, `Panel = "settings" | "profiles" | "editor"` (réutiliser).
- Réutilise (rappel, ligne déjà comptée en T3) : `apps/web/src/platform/host-tauri.ts:196` — `loadTauriPorts()`, dont `dialog` et `fs` sont gardés pour `ProfileFiles`.
- Réutilise (rappel, ligne déjà comptée en T1) : `apps/web/src/app/toolbar-host.ts:53` — `setMode(mode)`, appelé une fois au montage.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/ui/App.test.tsx --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -50 && \
pnpm --filter @roomboard/web test 2>&1 | tail -15 && \
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS" | head -20 ; \
pnpm --filter @roomboard/web build 2>&1 | tail -8
```

Attendu : `App.test.tsx` 0 échec, ≥ 22 tests, présents « S5 : profil annotation au navigateur », « S5 : capacité
vraie », « éditeur : la barre ne bouge pas avant Enregistrer », « changer de panneau abandonne le brouillon » ; suite
web ≥ 1 000 tests, 0 échec ; `tsc` : aucune ligne ; build : `built in`. À garder verts : « inventaire : chaque bouton
de l'ancienne barre a son élément », « changer de profil : barre à gauche, grands boutons, sans formes », « la scène
est dans sa case », `ui/layout.test.ts`, `ui/item-state.test.ts`, `ui/PagesBar.test.tsx`.

**Preuve visuelle.** Aucune ici (T10).

**Contraintes (recopiées).**
- GC1 Budget : l'exécution entière tient en environ 3 h sur la VM de 8 cœurs, chargée ; une tâche vise 20 à 45 min ; aucune commande lourde hors celles de la section.
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test désactivé (`skip`, `only`, `todo`), aucun seuil ni délai changé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && [ -d node_modules ] || pnpm install --frozen-lockfile` ; `[ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c1-profils/apps/web/src/wasm apps/web/src/` (jamais commité ; nécessaire au build).
- GC5 Preuve bornée : la commande de la section, telle quelle ; le rapport cite N ≥ 1 et les noms attendus.
- GC6 Commits : fichiers ajoutés un par un (`git add <chemin>`, jamais `-A`, `--all`, `.`, ni `commit -a`), auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser.
- GC7 Aucune dépendance nouvelle (jamais AGPL, GPL, LGPL).
- GC8 OD56 : ne pas toucher `feat/usage-c2-depot` ; `ui/App.tsx` et `main.ts` sont partagés avec OD56 (cible `pick` l. 103-104 d'`App.tsx`, `paste` dans `main.ts`) : ne changer que les lignes du chantier, sans réordonner ; ne pas modifier `platform/host-repli.ts` ni `platform/host-tauri.ts` (importés seulement).
- GC9 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.
- GC10 Le profil ne va jamais dans le `.roomboard` ; aucun composant n'appelle `localStorage`.
- GC11 Interface : aucun `switch`, aucune taille en `px` dans un `.tsx`, aucun `localStorage`, aucun glisser HTML5 ; libellés en français.
- GC12 Ne modifier que les fichiers touchés de la tâche ; `app/stage-tags.ts` non touché ; aucune enveloppe de l'hôte dans `App` (P19).
- GC13 `tsc --noEmit` sans erreur à la fin (l'écart `App.tsx` des tâches T6-T8 disparaît ici).

**Interdits.** Appeler `setMode` à chaque changement de profil ; changer l'outil courant au changement de profil
(CL5b-19) ; message à l'écran quand `desktop-annotation` est rabattu ; toucher `stage-tags.ts`.

**Terminé quand.** Commande bornée verte (quatre parties) ; un commit ; rapport avec la ligne `Réutilisation :` et les
deux rappels.

**Étapes.**

- [ ] **1. Préparer le worktree** (GC4).

- [ ] **2. Tests rouges** dans `ui/App.test.tsx`. Imports ajoutés :
  `import type { ProfileFiles } from "../platform/profile-files";`. Avant `renderApp` :

```tsx
function fakeFiles(picks: ({ name: string; text: string } | null)[] = []) {
  return {
    pick: vi.fn(async () => picks.shift() ?? null),
    save: vi.fn(async (_name: string, _text: string) => true),
  } satisfies ProfileFiles;
}
```

  `renderApp` reçoit `caps` et `files` :

```tsx
function renderApp(opts: { tab?: FakeTab; profile?: string; caps?: RuntimeCapabilities; files?: ReturnType<typeof fakeFiles> } = {}) {
  const tab = opts.tab ?? fakeTab("Sans titre.roomboard");
  const workspace = fakeWorkspace(tab);
  const store = createProfileStore(null, BUILTIN_PROFILES);
  if (opts.profile) store.setActive(opts.profile);
  const active = createActiveProfile(store, opts.caps ?? CAPS);
  const files = opts.files ?? fakeFiles();
```

  (le reste inchangé), `profileFiles={files}` passé à `<App …>` après `shell={shell}`, et `files` ajouté à l'objet
  rendu. Puis, en fin de fichier :

```tsx
describe("App — profils (C1)", () => {
  const openMenu = (c: HTMLElement): void => click(c.querySelector('button[data-item="profiles"]'));
  const openEditor = (c: HTMLElement): void => {
    openMenu(c);
    click(c.querySelector('[data-profile-cmd="edit"]'));
  };
  const change = (el: Element | null, value: string): void => {
    expect(el).not.toBeNull();
    (el as HTMLSelectElement).value = value;
    el!.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const DOCK = '[data-edit-bar="outils"] select[data-edit="dock"]';

  it("S5 : profil annotation au navigateur : tableau ordinaire, aucun message (console ni #etat)", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { container } = renderApp({ profile: "annotation" });
    expect(info).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(container.querySelector("#etat")?.textContent).toBe("");
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("top");
    info.mockRestore();
    warn.mockRestore();
  });

  it("S5 : capacité vraie : setMode(desktop-annotation) une fois au montage, pas au changement de profil", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { container, tab } = renderApp({ profile: "annotation", caps: { ...CAPS, desktopAnnotation: true } });
    expect(info).toHaveBeenCalledTimes(1);
    expect(String(info.mock.calls[0]![0])).toContain("C11a");
    openMenu(container);
    click(container.querySelector('[data-profile="defaut"]'));
    openMenu(container);
    click(container.querySelector('[data-profile="annotation"]'));
    expect(info).toHaveBeenCalledTimes(1);
    expect(tab.engine["setTool"]).not.toHaveBeenCalled();
    info.mockRestore();
  });

  it("menu Profil : commandes sous les profils ; livré sans copie : remise grisée, pas de Supprimer ; Modifier… ouvre l'éditeur", () => {
    const { container } = renderApp();
    openMenu(container);
    expect(container.querySelectorAll("[data-profile]")).toHaveLength(3);
    expect([...container.querySelectorAll("[data-profile-cmd]")].map((b) => b.getAttribute("data-profile-cmd"))).toEqual(["edit", "import", "export", "reset", "reset-all"]);
    expect(container.querySelector<HTMLButtonElement>('[data-profile-cmd="reset"]')!.disabled).toBe(true);
    click(container.querySelector('[data-profile-cmd="edit"]'));
    expect(container.querySelector("[data-profile-editor]")).not.toBeNull();
    expect(container.querySelector("[data-profiles]")).toBeNull();
  });

  it("éditeur : la barre ne bouge pas avant Enregistrer ; Enregistrer applique (barre à gauche, grands boutons)", () => {
    const { container, store } = renderApp();
    openEditor(container);
    change(container.querySelector(DOCK), "left");
    change(container.querySelector('select[data-edit="button-size"]'), "l");
    const bar = () => container.querySelector<HTMLElement>('[data-toolbar="outils"]')!;
    expect(bar().dataset["dock"]).toBe("top");
    click(container.querySelector('button[data-edit="save"]'));
    expect(container.querySelector("[data-profile-editor]")).toBeNull();
    expect(bar().dataset["dock"]).toBe("left");
    expect(bar().dataset["size"]).toBe("l");
    expect(store.hasOverride("defaut")).toBe(true);
    expect(container.querySelector<HTMLElement>(".rb-layout")!.style.gridTemplateColumns).toBe("auto minmax(0, 1fr)");
  });

  it("Enregistrer comme nouveau : cm1 actif, dans le menu", () => {
    const { container, store } = renderApp();
    openEditor(container);
    change(container.querySelector(DOCK), "left");
    const name = container.querySelector<HTMLInputElement>('input[data-edit="new-name"]')!;
    name.value = "CM1";
    name.dispatchEvent(new InputEvent("input", { bubbles: true }));
    click(container.querySelector('button[data-edit="save-new"]'));
    expect(store.activeId()).toBe("cm1");
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("left");
    openMenu(container);
    expect(container.querySelector('[data-profile="cm1"]')?.getAttribute("aria-checked")).toBe("true");
  });

  it("changer de panneau abandonne le brouillon", () => {
    const { container } = renderApp();
    openEditor(container);
    change(container.querySelector(DOCK), "left");
    click(container.querySelector('button[data-item="settings"]'));
    expect(container.querySelector("[data-profile-editor]")).toBeNull();
    click(container.querySelector('button[data-item="settings"]'));
    openEditor(container);
    expect(container.querySelector<HTMLSelectElement>(DOCK)!.value).toBe("top");
    expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("top");
  });

  it("rangée des préréglages : clic sur Rouge → setPenStyle puis setTool(pen) de l'onglet actif", () => {
    const { container, tab } = renderApp();
    const presets = [...container.querySelectorAll('[data-toolbar="outils"] button[data-preset]')].map((b) => b.getAttribute("data-preset"));
    expect(presets).toEqual(["noir", "rouge", "bleu"]);
    expect(container.querySelector('[data-toolbar="pages"] button[data-preset]')).toBeNull();
    click(container.querySelector('button[data-preset="rouge"]'));
    expect(tab.engine["setPenStyle"]).toHaveBeenCalledWith({ color: "#dc2626", width: 4 });
    expect(tab.engine["setTool"]).toHaveBeenCalledWith("pen");
  });

  it("Importer… : le profil choisi devient actif", async () => {
    const text = JSON.stringify({
      format: "roomboard-profile", schema: 1, id: "importe", label: "Importé", interface: { buttonSize: "l" },
      toolbars: [{ id: "outils", role: "tools", dock: "left", groups: [{ id: "g", items: [{ id: "pen", kind: "tool", tool: "pen", label: "Stylo" }, { id: "profiles", kind: "action", action: "profiles", label: "Profil" }] }] }],
    });
    const files = fakeFiles([{ name: "importe.rbprofile", text }]);
    const { container, store } = renderApp({ files });
    openMenu(container);
    click(container.querySelector('[data-profile-cmd="import"]'));
    expect(files.pick).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(container.querySelector('[data-toolbar="outils"]')?.getAttribute("data-dock")).toBe("left"));
    expect(store.activeId()).toBe("importe");
    expect(container.querySelector("[data-profiles]")).toBeNull();
  });

  it("Exporter… : ProfileFiles.save(par-defaut.rbprofile, JSON du profil)", async () => {
    const files = fakeFiles();
    const { container } = renderApp({ files });
    openMenu(container);
    click(container.querySelector('[data-profile-cmd="export"]'));
    await vi.waitFor(() => expect(files.save).toHaveBeenCalledTimes(1));
    const [name, text] = files.save.mock.calls[0]!;
    expect(name).toBe("par-defaut.rbprofile");
    expect(JSON.parse(text).id).toBe("defaut");
  });
});
```

- [ ] **3. Lancer la commande bornée : rouge attendu** (le premier bloc seulement : `vitest run src/ui/App.test.tsx`).

- [ ] **4. Code** `ui/App.tsx`.

  4a. Imports (ajouts, sans réordonner l'existant) :

```tsx
import { createProfileActions } from "../app/profile-actions";
import type { ProfileFiles } from "../platform/profile-files";
import { originOf } from "../profile-edit";
import { resolveStartMode, visibleItems, type Toolbar as Bar } from "../toolbar";
import { BUILTIN_PROFILES } from "../toolbar-profiles";
import { ProfileEditor } from "./ProfileEditor";
```

  (la ligne `import { visibleItems, type Toolbar as Bar } from "../toolbar";` est remplacée par celle ci-dessus).

  4b. `AppProps`, après `readonly shell: ShellPort;` :

```tsx
  /** Choix et écriture des fichiers `.rbprofile` (C1, P25) : boîtes natives dans la coque, repli web ailleurs. */
  readonly profileFiles: ProfileFiles;
```

  et `type Panel = "settings" | "profiles" | "editor";`.

  4c. Après la création de `host` (l. 100-108) :

```tsx
  // Mode de démarrage (U14, C1 P10) : une seule fois, au montage ; changer de profil ensuite ne le rejoue pas (P11).
  host.setMode(resolveStartMode(props.active.profile(), props.active.capabilities()).mode);
  const actions = createProfileActions({
    store: props.store,
    active: props.active,
    files: props.profileFiles,
    shell: props.shell,
    builtins: BUILTIN_PROFILES,
    warn: (m) => console.warn(m),
  });
```

  4d. `toolbarOf` passe les préréglages :

```tsx
  const toolbarOf = (bar: Bar): JSX.Element => (
    <Toolbar bar={bar} caps={props.active.capabilities} view={state} size={size} host={host} presets={() => profile().presets} />
  );
```

  4e. Remplacer le bloc `<Show when={panel() === "profiles"}>…</Show>` (l. 177-188) par :

```tsx
      <Show when={panel() === "profiles"}>
        <div class="rb-popover">
          <ProfileMenu
            profiles={props.active.profiles}
            activeId={() => profile().id}
            canResetCurrent={() => actions.canResetCurrent()}
            canRemove={() => actions.canRemove()}
            choose={(id) => {
              props.active.choose(id);
              setPanel(null);
            }}
            edit={() => setPanel("editor")}
            importFile={() => {
              setPanel(null);
              void actions.importFile();
            }}
            exportActive={() => {
              setPanel(null);
              void actions.exportActive();
            }}
            resetCurrent={() => {
              actions.resetCurrent();
              setPanel(null);
            }}
            remove={() => {
              setPanel(null);
              void actions.remove();
            }}
            resetAll={() => {
              setPanel(null);
              void actions.resetAll();
            }}
          />
        </div>
      </Show>
      <Show when={panel() === "editor"}>
        <div class="rb-popover">
          <ProfileEditor
            profile={profile()}
            origin={originOf(profile(), BUILTIN_PROFILES)}
            save={(draft) => {
              actions.save(draft);
              setPanel(null);
            }}
            saveAsNew={(draft, label) => {
              actions.saveAsNew(draft, label);
              setPanel(null);
            }}
            close={() => setPanel(null)}
          />
        </div>
      </Show>
```

  `importFile` appelle `files.pick()` dans le même tour que le clic (avant tout `await`) : l'activation de
  l'utilisateur reste valable pour le `<input type=file>` du repli.

- [ ] **5. Code** `main.ts`. Imports ajoutés après `./platform/host-tauri` :

```ts
import { browserFallbackDeps } from "./platform/host-repli";
```

  et après `./platform/pending` :

```ts
import { createTauriProfileFiles, createWebProfileFiles } from "./platform/profile-files";
```

  Remplacer les lignes 49-51 par :

```ts
  // `PreparedHost` n'expose ni l'ipc ni les boîtes : enrobages sans état de la coque, repris ici pour le lancement, Cmd+Q
  // et les fichiers de profil.
  const ports = tauri ? await loadTauriPorts() : null;
  const ipc: TauriIpc | null = ports === null ? null : ports.ipc;
  // Fichiers de profil (C1, P25) : boîtes natives dans la coque ; ailleurs <input type=file> et téléchargement.
  const profileFiles =
    ports === null ? createWebProfileFiles(browserFallbackDeps(document, URL)) : createTauriProfileFiles(ports.dialog, ports.fs);
```

  Dans `mountApp(root, { … })`, après `shell: prepared.shell,` : `profileFiles,`.

- [ ] **6. Lancer la commande bornée complète : vert attendu** (quatre parties).

- [ ] **7. Commit** : `apps/web/src/ui/App.tsx`, `apps/web/src/ui/App.test.tsx`, `apps/web/src/main.ts` ;
  message `feat(profile): wire profile menu, editor, preset row, start mode and profile files into the app`.

<a id="tache-t10"></a>
### Tâche T10 — Essai e2e C1 dans `verifier.sh --e2e`, captures, fiches de la coque

**Objectif.** Jouer S1, S2 et la part navigateur de S5 au navigateur (Playwright Chromium, `?fichiers=repli`) dans
`scripts/essais/c1-profils-navigateur.mjs`, branché dans le bloc `--e2e` de `verifier.sh` sans option de capture (P29) ;
écrire les deux captures avec `--captures` ; ajouter la section « Profils (C1) » aux fiches de la coque (carte
d'impact). Preuve finale : `scripts/verifier.sh --e2e` OK.

**Subagent.** implementeur-tdd. **Dépend de.** T9 (application complète).

**Fichiers.** Créer `scripts/essais/c1-profils-navigateur.mjs`, `docs/essais/c1-editeur.png`,
`docs/essais/c1-barre-gauche-l.png` ; modifier `scripts/verifier.sh` (une ligne après l. 74),
`scripts/tests/verifier-e2e.test.sh` (l. 13), `docs/essais/coque-windows.md`, `docs/essais/coque-macos.md` (section en
fin).

**Interfaces.**
- Consomme : sélecteurs DOM de T4 (`button[data-preset]`), T6 (`[data-profile]`, `[data-profile-cmd]`), T7
  (`[data-profile-editor]`, `[data-edit-*]`) ; exemples `apps/web/src/fixtures/profils/*.rbprofile` (T3) ; messages de
  T8 (`Remplacer le profil « CM1 » ?`, « mettez RoomBoard à jour »).
- Produit : l'essai `C1`, code de sortie 0 réussi, 1 échec, 2 outil absent ; deux PNG.
- Réutilise : `scripts/essais/commun.mjs` et la manière de `scripts/essais/fichiers-navigateur.mjs:206-250` — `loadPlaywright`, `serve`, `frames`, `item`, `noOverlap`, `VIEWPORT`, `Echec`, `gitSha`, `waitForEvent("download")` puis `saveAs`, `waitForEvent("filechooser")` puis `setFiles` (réutiliser).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -5 && \
bash scripts/verifier.sh --e2e 2>&1 | grep -E "^ok — |: OK|ÉCHEC|ECHEC|error\[|FAIL |Tests |verifier.sh" | tail -60 ; \
node scripts/essais/c1-profils-navigateur.mjs --captures 2>&1 | tail -6 && ls -l docs/essais/c1-*.png
```

Attendu : « verifier-e2e.test.sh : OK » ; puis « S5b : OK », « C1 : OK », « verifier.sh : e2e OK », « verifier.sh :
OK » ; puis « capture : …/c1-editeur.png », « capture : …/c1-barre-gauche-l.png », « C1 : OK », deux fichiers non vides.
L'essai s5b (« profil simple : exactement trois outils », « aucun bouton ne recouvre la scène ») reste vert : la rangée
utilise `data-preset`, pas `data-item`.

**Preuve visuelle.** Lectures d'abord (l'essai les vérifie avant chaque capture) : `[data-toolbar="outils"]` porte
`data-dock="left"` et `data-size="l"`, aucun `button[data-item="eraser"]`, cinq `button[data-preset]`,
`[data-profile="cm1"][aria-checked="true"]`, `[data-edit-item="profiles"] input[data-edit="shown"]` désactivée. Puis
les captures, à décrire dans le rapport : `c1-editeur.png` (éditeur ouvert, section Barres visible, emplacement « À
gauche », gomme décochée, case de Profil grisée) et `c1-barre-gauche-l.png` (barre d'outils à gauche en grands
boutons, sans gomme, rangée de cinq préréglages en bas de la barre).

**Contraintes (recopiées).**
- GC1 Budget : l'exécution entière tient en environ 3 h sur la VM de 8 cœurs, chargée ; une tâche vise 20 à 45 min ; `scripts/verifier.sh --e2e` est la seule commande lourde (fmt, clippy, tests, Wasm, build, e2e). Si `target/` manque dans le worktree, le copier d'abord : `[ -d target ] || cp -a /home/adminjd/projets/roomboard-wt/usage-c1-profils/target target` (cache de compilation ignoré par git, évite 10 à 15 min).
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test désactivé (`skip`, `only`, `todo`), aucun seuil ni délai changé (ni dans l'essai s5b ni dans `commun.mjs`) ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && [ -d node_modules ] || pnpm install --frozen-lockfile` ; le module Wasm est reconstruit par `verifier.sh`.
- GC5 Preuve bornée : la commande de la section, telle quelle ; le rapport cite les lignes « OK » attendues et les deux captures.
- GC6 Commits : fichiers ajoutés un par un (`git add <chemin>`, jamais `-A`, `--all`, `.`, ni `commit -a`), auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; aucun `--force` ; ne pas pousser. `apps/web/dist/` et `apps/web/src/wasm/` ne sont jamais commités.
- GC7 Aucune dépendance nouvelle (jamais AGPL, GPL, LGPL) : Playwright est celui du cache `npx`, comme les autres essais.
- GC8 OD56 : ne pas toucher `feat/usage-c2-depot` ; `scripts/verifier.sh` et `scripts/tests/verifier-e2e.test.sh` sont partagés avec OD56 : une ligne chacun, sans réordonner.
- GC9 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.
- GC12 Ne modifier que les fichiers touchés de la tâche ; `docs/essais/s5b-*.png` non réécrites.

**Interdits.** Passer `--captures` dans `verifier.sh` ; modifier un autre essai ; relever un délai ou baisser la hauteur
minimale de la scène ; build Tauri.

**Terminé quand.** Commande bornée verte ; deux captures commitées ; un commit ; rapport avec la ligne
`Réutilisation :` et la description des deux captures.

**Étapes.**

- [ ] **1. Préparer le worktree** (GC4, et `target/` de GC1).

- [ ] **2. Test rouge** : `scripts/tests/verifier-e2e.test.sh`, ligne 13 :

```bash
for s in s2-navigateur s34-navigateur fichiers-navigateur s5b-navigateur c1-profils-navigateur; do
```

  `bash scripts/tests/verifier-e2e.test.sh` → attendu « ECHEC : c1-profils-navigateur absent de verifier.sh ».

- [ ] **3. Brancher** : dans `scripts/verifier.sh`, après `  node scripts/essais/s5b-navigateur.mjs` :

```bash
  node scripts/essais/c1-profils-navigateur.mjs
```

  `bash scripts/tests/verifier-e2e.test.sh` → « verifier-e2e.test.sh : OK ».

- [ ] **4. Écrire l'essai** `scripts/essais/c1-profils-navigateur.mjs` (exécutable, `chmod +x`) :

```js
#!/usr/bin/env node
// Essai C1 au navigateur (profils et barre configurable) : S1 (modifier le profil par défaut, enregistrer comme nouveau,
// recharger, exporter, tout remettre à zéro, réimporter), S2 (profil 1.2 à outil inconnu, profil 2.0 refusé, import d'un
// id pris annulé), S5 côté navigateur (« Annotation au démarrage » : tableau, aucun message). L'application construite
// (apps/web/dist) est servie en local ; Chromium headless de Playwright ; `?fichiers=repli` (téléchargement,
// <input type=file>, confirm et alert du navigateur). Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Hors de verifier.sh sans --e2e.
// Usage : node scripts/essais/c1-profils-navigateur.mjs [--captures]   (docs/essais/c1-editeur.png, c1-barre-gauche-l.png)
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, VIEWPORT, frames, gitSha, item, loadPlaywright, noOverlap, serve } from "./commun.mjs";

const LABEL = "C1";
const FIXTURES = join(ROOT, "apps", "web", "src", "fixtures", "profils");
const OUTILS = '[data-toolbar="outils"]';

async function scenario(page, url, { captures, tmp }) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const dialogs = [];
  let answer = "accept";
  page.on("dialog", async (d) => {
    dialogs.push({ type: d.type(), message: d.message() });
    if (answer === "dismiss") await d.dismiss();
    else await d.accept();
  });
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const fr = () => frames(page);
  const count = (sel) => page.locator(sel).count();
  const ready = async () => {
    await page.waitForSelector('#stage[data-ready="1"]', { timeout: 15000 });
    await fr();
  };
  const waitFor = async (sel) => {
    await page.waitForSelector(sel, { timeout: 15000 });
    await fr();
  };
  const gone = async (sel) => {
    await page.waitForSelector(sel, { state: "detached", timeout: 15000 });
    await fr();
  };
  const shot = async (name) => {
    if (!captures) return;
    const path = join(ROOT, "docs", "essais", `c1-${name}.png`);
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  };
  const menu = async () => {
    await page.click(item("profiles"));
    await waitFor("[data-profiles]");
  };
  const closeMenu = async () => {
    await page.click(item("profiles"));
    await gone("[data-profiles]");
  };
  const command = async (name) => {
    await menu();
    await page.click(`[data-profile-cmd="${name}"]`);
    await fr();
  };
  const chooseProfile = async (id) => {
    await menu();
    await page.click(`[data-profile="${id}"]`);
    await fr();
  };
  const activeProfile = async () => {
    await menu();
    const id = await page.getAttribute('[data-profile][aria-checked="true"]', "data-profile");
    await closeMenu();
    return id;
  };
  const waitDialog = async (type, from) => {
    for (let i = 0; i < 200; i++) {
      const d = dialogs.slice(from).find((x) => x.type === type);
      if (d) return d;
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Echec(`boîte « ${type} » attendue, aucune reçue`);
  };
  const exportTo = async (name) => {
    const dl = page.waitForEvent("download");
    await command("export");
    const download = await dl;
    const file = join(tmp, name);
    await download.saveAs(file);
    return { file, suggested: download.suggestedFilename() };
  };
  const importFrom = async (file) => {
    const chooser = page.waitForEvent("filechooser");
    await command("import");
    await (await chooser).setFiles(file);
    await fr();
  };
  const presets = () => count(`${OUTILS} button[data-preset]`);
  const BAR = '[data-edit-bar="outils"]';

  // 1. S1 : simple, puis retour à defaut.
  await page.goto(url);
  await ready();
  await chooseProfile("simple");
  check((await count(`${OUTILS}[data-dock="left"]`)) === 1, "profil simple choisi : barre d'outils à gauche");
  await chooseProfile("defaut");
  check((await count(`${OUTILS}[data-dock="top"]`)) === 1, "retour au profil par défaut : barre en haut");
  check((await presets()) === 3, "stylo actif : trois préréglages dans la barre (button[data-preset])");

  // 2. S1 : l'éditeur, sur un brouillon.
  await command("edit");
  await waitFor("[data-profile-editor]");
  await page.selectOption(`${BAR} select[data-edit="dock"]`, "left");
  await page.selectOption('select[data-edit="button-size"]', "l");
  await page.uncheck('[data-edit-item="eraser"] input[data-edit="shown"]');
  check(await page.isDisabled('[data-edit-item="profiles"] input[data-edit="shown"]'), "éditeur : la case « montrer » de Profil est grisée");
  await page.click('button[data-edit="preset-add"]');
  await page.click('button[data-edit="preset-add"]');
  check((await count("[data-edit-preset]")) === 5, "éditeur : cinq préréglages du stylo dans le brouillon");
  check(
    (await count(`${OUTILS}[data-dock="top"][data-size="m"]`)) === 1 && (await count(item("eraser"))) === 1,
    "rien d'enregistré : la barre est toujours en haut, en taille m, avec la gomme",
  );
  await page.locator('[data-edit-section="bars"]').scrollIntoViewIfNeeded();
  await shot("editeur");
  const proposed = await page.inputValue('input[data-edit="new-name"]');
  check(proposed === "Par défaut (copie)", `nom proposé « ${proposed} »`);
  await page.fill('input[data-edit="new-name"]', "CM1");
  await page.click('button[data-edit="save-new"]');
  await gone("[data-profile-editor]");
  check((await count(`${OUTILS}[data-dock="left"][data-size="l"]`)) === 1, "enregistré : barre d'outils à gauche, grands boutons");
  check((await count(item("eraser"))) === 0, "enregistré : la gomme est masquée");
  check((await noOverlap(page, OUTILS)).apart, "la barre à gauche ne recouvre pas la scène");

  // 3. S1 : rechargé.
  await page.reload();
  await ready();
  check((await count(`${OUTILS}[data-dock="left"]`)) === 1, "rechargé : barre outils à gauche");
  check((await page.getAttribute(OUTILS, "data-size")) === "l", 'rechargé : data-size="l"');
  check((await count(item("eraser"))) === 0, "rechargé : sans eraser");
  check((await page.getAttribute("#stage", "data-tool")) === "pen", "rechargé : stylo actif");
  check((await presets()) === 5, "rechargé : cinq boutons data-preset");
  check((await activeProfile()) === "cm1", "rechargé : cm1 actif");
  await shot("barre-gauche-l");

  // 4. S1 : exporter.
  const cm1 = await exportTo("cm1.rbprofile");
  check(cm1.suggested === "cm1.rbprofile", `export : « ${cm1.suggested} » téléchargé`);
  const exported = JSON.parse(await readFile(cm1.file, "utf8"));
  check(
    exported.format === "roomboard-profile" && exported.id === "cm1" && exported.basedOn === "defaut" && exported.minor === 1,
    "export : format roomboard-profile, id cm1, basedOn defaut, minor 1",
  );

  // 5. S1 : tout remettre à zéro (confirmé).
  const d5 = dialogs.length;
  await command("reset-all");
  await waitDialog("confirm", d5);
  await waitFor(`${OUTILS}[data-dock="top"]`);
  check((await activeProfile()) === "defaut", "tout remis à zéro : defaut actif, barre en haut");
  await menu();
  check((await count('[data-profile="cm1"]')) === 0, "tout remis à zéro : cm1 absent du menu");
  await closeMenu();

  // 6. S1 : réimporter cm1.
  await importFrom(cm1.file);
  await waitFor(`${OUTILS}[data-dock="left"][data-size="l"]`);
  check((await count(item("eraser"))) === 0, "réimporté : barre à gauche en grand, sans gomme");
  check((await activeProfile()) === "cm1", "réimporté : cm1 actif");

  // 7. S2 : profil 1.2 à outil inconnu.
  await importFrom(join(FIXTURES, "1.2-outil-inconnu.rbprofile"));
  await waitFor(`${OUTILS}[data-dock="top"]`);
  check((await activeProfile()) === "futur", "1.2 importé : profil futur actif");
  check(
    (await count(item("laser"))) === 0 && (await count(item("minuteur"))) === 0 && (await count(item("pen"))) === 1,
    "1.2 : l'outil et l'action inconnus ne sont pas dans la barre",
  );
  await command("edit");
  await waitFor("[data-profile-editor]");
  check((await count('[data-edit-item="laser"][data-unknown]')) === 1, "1.2 : l'élément inconnu est grisé dans l'éditeur");
  await page.click('button[data-edit="close"]');
  await gone("[data-profile-editor]");
  const futur = await exportTo("futur.rbprofile");
  const back = JSON.parse(await readFile(futur.file, "utf8"));
  const items = back.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items));
  check(
    items.some((i) => i.id === "laser" && i.tool === "laser") && back.theme === "sombre" && back.minor === 2 && back.toolbars[0].couleur === "bleu",
    "1.2 réexporté : élément et clés inconnus toujours là, minor 2",
  );

  // 8. S2 : profil 2.0 refusé.
  const d8 = dialogs.length;
  await importFrom(join(FIXTURES, "2.0-majeure.rbprofile"));
  const refus = await waitDialog("alert", d8);
  check(refus.message.includes("mettez RoomBoard à jour"), `2.0 refusé : « ${refus.message} »`);
  check((await activeProfile()) === "futur", "2.0 refusé : profil actif inchangé");

  // 9. S2 : réimporter cm1 alors qu'il existe, Annuler.
  answer = "dismiss";
  const d9 = dialogs.length;
  await importFrom(cm1.file);
  const ask = await waitDialog("confirm", d9);
  answer = "accept";
  check(ask.message === "Remplacer le profil « CM1 » ?", `id pris : « ${ask.message} »`);
  check((await activeProfile()) === "futur", "Annuler : rien n'est importé, profil actif inchangé");

  // 10. S5 (navigateur) : « Annotation au démarrage », rechargé : tableau ordinaire, aucun message.
  await chooseProfile("annotation");
  const d10 = dialogs.length;
  await page.reload();
  await ready();
  check((await activeProfile()) === "annotation", "annotation active après rechargement");
  check(
    (await count(`${OUTILS}[data-dock="top"]`)) === 1 && ((await page.textContent("#etat")) ?? "") === "",
    "annotation au navigateur : tableau ordinaire, #etat vide",
  );
  check(dialogs.length === d10, "annotation au navigateur : aucune boîte");

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
  const server = await serve();
  const port = server.address().port;
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c1-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, acceptDownloads: true });
    const page = await context.newPage();
    await scenario(page, `http://127.0.0.1:${port}/?fichiers=repli`, { captures: process.argv.includes("--captures"), tmp });
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

- [ ] **5. Fiches de la coque.** En fin de `docs/essais/coque-windows.md` :

```markdown
## 7. Profils (C1) — export, import, remise à zéro, annotation au démarrage
Seulement si C1 est fusionné. Aucun build de plus que celui du § 2.

| # | geste | attendu |
|---|---|---|
| C1-1 | Profil → Modifier… : barre d'outils « À gauche », taille « Grands » ; « Enregistrer comme nouveau » sous le nom `CM1` | la barre passe à gauche en grands boutons ; le menu Profil montre « CM1 » coché |
| C1-2 | Profil → Exporter… | boîte native « Enregistrer » filtrée sur « Profil RoomBoard » (`rbprofile`), nom proposé `cm1.rbprofile` ; le fichier est écrit à l'endroit choisi |
| C1-3 | Profil → Tout remettre à zéro, confirmer | question native ; puis « Par défaut », barre en haut, « CM1 » absent du menu |
| C1-4 | Profil → Importer… et choisir `cm1.rbprofile` | boîte native « Ouvrir » filtrée sur `rbprofile` ; « CM1 » revient, actif, barre à gauche en grand |
| C1-5 | choisir « Annotation au démarrage », fermer RoomBoard (Alt+F4), relancer | la coque démarre sur le tableau ordinaire, aucun message (la fenêtre d'annotation arrive avec C11a) |

Rapporter chaque geste : conforme / écart (une ligne). Capture : `coque-windows-c1-export.png` (geste C1-2).
```

  En fin de `docs/essais/coque-macos.md`, la même section, avec « Cmd+Q » au lieu de « Alt+F4 » au geste C1-5 et la
  capture `coque-macos-c1-export.png`.

- [ ] **6. Lancer la commande bornée** (verifier-e2e, `verifier.sh --e2e`, puis captures). Un échec de l'essai C1 se
  diagnostique avec `node scripts/essais/c1-profils-navigateur.mjs 2>&1 | tail -30` (le `dist` est déjà construit par
  `verifier.sh`) ; corriger l'essai ou signaler le défaut de l'application dans le rapport (ne pas modifier les tâches
  précédentes sans le dire).

- [ ] **7. Regarder les deux captures** (outil de lecture d'image) et les décrire dans le rapport.

- [ ] **8. Commit** : `scripts/essais/c1-profils-navigateur.mjs`, `scripts/verifier.sh`,
  `scripts/tests/verifier-e2e.test.sh`, `docs/essais/c1-editeur.png`, `docs/essais/c1-barre-gauche-l.png`,
  `docs/essais/coque-windows.md`, `docs/essais/coque-macos.md` ; message
  `test(e2e): C1 profiles browser trial in verifier.sh --e2e, captures, shell checklists`.

---

## Relecture du plan (par le planificateur)

- Couverture du cadrage : P1-P33 ont chacun une tâche (P1 : toutes ; P2-P4, P10, P33 : T1 ; P5-P7, P9 : T2 ; P8 : aucun
  code, GC10 ; P11 : T9 ; P12-P17 : T5, T7 ; P18-P19 : T4 ; P20-P22 : T6, T7, T9 ; P23-P25, P28 : T3, T8 ; P26-P27 : hors
  C1, GC8 et interdits de T3 ; P29 : T10 ; P30 : T3 ; P31 : GC7 ; P32 : `toolbar.ts` ne reçoit que le modèle). S1 : T1,
  T5-T10 ; S2 : T3, T7, T8, T10 ; S3 : T2, T5, T8 ; S4 : T4, T5, T7, T9 ; S5 : T1, T2, T6, T9, T10.
- Carte d'impact : chaque entrée « oui » est dans les fichiers touchés d'une tâche ; `localStorage` (contenu) et le
  fichier `.rbprofile` sur disque n'ont pas de fichier source propre (T2, T3, T8 les produisent). Effets de bord :
  « copie de defaut lue au démarrage », « revenir à l'origine rend le livré » (T2) ; « save(defaut) ne lève plus,
  remove(defaut) lève » (T2) ; « setMode desktop-annotation : aucun effet, message C11a » (T1) ; « écriture en 1.1 »
  (T1) ; rangée des préréglages (T4, s5b en T10) ; menu Profil (T6, s5b en T10) ; profil `annotation` (T2) ; accès
  Profil ajouté (T1) ; `setMode("board")` muet (T1).
- Noms cohérents d'une tâche à l'autre : `uniqueId`, `withCurrentMinor`, `isKnownItem`, `isProfilesAccess` (T1) ;
  `isBuiltin`, `hasOverride`, `revert`, `resetAll` (T2) ; `profileFromText`, `profileToFile`, `planImport`, `slug`,
  `ProfileFiles` (T3) ; `PresetTable`, `presets` (T4) ; `originOf`, `resetToOrigin`, `resetToolbars`, `resetAllPresets`
  (T5) ; `profiles`, `refresh`, `data-profile-cmd` (T6) ; `data-edit-*` (T7) ; `createProfileActions` (T8).
- Lignes `Réutilise :` : 22, une par ligne de la liste « Modules à réutiliser ou à étendre » (la liste du cadrage en
  compte 22) ; T7 n'en reprend aucune (éditeur neuf) ; T9 porte deux rappels non comptés.
