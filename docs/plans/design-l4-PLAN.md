# design-l4 — Plan d'exécution

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Modèle : `annotationBarOf` et profil figé d'avant L4 | — | `apps/web/src/toolbar.ts`, `apps/web/src/toolbar.test.ts`, `apps/web/src/fixtures/profils/defaut-avant-l4.rbprofile` (neuf) | isolé | implementeur-tdd | vitest `src/toolbar.test.ts` 0 échec, ≥ 5 tests `annotationBarOf` ; profil figé lu `defaut outils,pages depot-annotation` ; `tsc` code 0 | S2, S1 | #tache-t1 |
| T2 | Contrôleur et transport : bascule idempotente, cadre dans la charge, `sent`, élément du cadre | — | `apps/web/src/platform/annotation-port.ts`, `apps/web/src/app/annotation.ts`, `apps/web/src/app/annotation.test.ts`, `apps/web/src/app/toolbar-host.ts`, `apps/web/src/app/toolbar-host.test.ts`, `apps/web/src/platform/annotation-fake.ts`, `apps/web/src/platform/annotation-fake.test.ts`, `apps/web/src/platform/annotation-tauri.ts`, `apps/web/src/platform/annotation-tauri.test.ts`, `apps/web/src/app/annotation-page.ts`, `apps/web/src/app/annotation-page.test.ts`, `apps/web/src/app/annotation-frame.test.ts` (neuf), `apps/web/src/annotate-start.ts`, `apps/web/src/ui/rb.css`, `apps/web/src/ui/rb-css.test.ts`, `apps/web/src/ui/App.test.tsx` | isolé | concepteur-critique | vitest des 8 fichiers de test 0 échec, `L4-9`, `L4-13`, `L4-16`, `L4-12` présents ; `App.test.tsx` 0 échec ; `tsc` code 0 | S1, S3, S4 | #tache-t2 |
| T3 | Réglage de l'appareil et bouton du cadre | — | `apps/web/src/device-settings.ts` (neuf), `apps/web/src/device-settings.test.ts` (neuf), `apps/web/src/ui/SettingsPanel.tsx`, `apps/web/src/ui/SettingsPanel.test.tsx` | isolé | implementeur-tdd | vitest `device-settings.test.ts` ≥ 6 tests et `SettingsPanel.test.tsx` 0 échec, `cadre de l'annotation` présent ; `tsc` code 0 | S3 | #tache-t3 |
| T4 | Bandeau « Envoyé au tableau » et source unique du texte | T2 | `apps/web/src/ui/toast.ts` (neuf), `apps/web/src/ui/toast.test.ts` (neuf), `apps/web/src/ui/Toasts.tsx` (neuf), `apps/web/src/ui/Toasts.test.tsx` (neuf), `apps/web/src/platform/annotation-port.ts`, `apps/web/src/platform/annotation-port.test.ts` | isolé | implementeur-tdd | vitest `toast.test.ts` ≥ 3, `Toasts.test.tsx` ≥ 4, `annotation-port.test.ts` 0 échec ; garde `aucun switch` de `Toolbar.test.tsx` verte ; `tsc` code 0 | S4 | #tache-t4 |
| T5 | Barre : commande segmentée, boutons pleins, zone à icône, icônes, colonne | T1, T2 | `apps/web/src/ui/PointerSwitch.tsx` (neuf), `apps/web/src/ui/PointerSwitch.test.tsx` (neuf), `apps/web/src/ui/Toolbar.tsx`, `apps/web/src/ui/Toolbar.test.tsx`, `apps/web/src/ui/IconButton.tsx`, `apps/web/src/ui/icons.ts`, `apps/web/src/ui/icons.test.ts`, `THIRD_PARTY_NOTICES.md`, `apps/web/src/ui/rb.css`, `apps/web/src/ui/rb-css.test.ts` | isolé | concepteur-critique | vitest `PointerSwitch.test.tsx` ≥ 6, `Toolbar.test.tsx`, `icons.test.ts` (`48 icônes`), `rb-css.test.ts`, `IconButton.test.tsx`, `item-state.test.ts` 0 échec ; `tsc` code 0 | S1, S5, S6 | #tache-t5 |
| T6 | Profils livrés et barre choisie par l'application | T1, T2, T5 | `apps/web/src/toolbar-profiles.ts`, `apps/web/src/toolbar-profiles.test.ts`, `apps/web/src/ui/App.tsx`, `apps/web/src/ui/App.test.tsx`, `apps/web/src/main.ts`, `apps/web/src/ui/ProfileEditor.tsx`, `apps/web/src/ui/ProfileEditor.test.tsx`, `apps/web/src/profile-edit.test.ts` | isolé | concepteur-critique | suite web vitest (suite-vm) 0 échec, `S2 :` et `L4-3` présents ; `tsc` code 0 | S2, S1, S6 | #tache-t6 |
| T7 | Branchements : réglage du cadre, bandeau dans l'application | T3, T4, T6 | `apps/web/src/ui/App.tsx`, `apps/web/src/ui/App.test.tsx`, `apps/web/src/main.ts`, `apps/web/src/ui/rb.css`, `apps/web/src/ui/rb-css.test.ts` | isolé | implementeur-tdd | suite web vitest (suite-vm) 0 échec, `S3 :` et `S4 :` d'App présents ; build web `✓ built` | S3, S4 | #tache-t7 |
| T8 | Essai `design-l4`, retouches c11a / c11b, fiches de coque | T7 | `scripts/essais/design-l4-navigateur.mjs` (neuf), `scripts/essais/c11a-annotation-navigateur.mjs`, `scripts/essais/c11b-capture-navigateur.mjs`, `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/c11a-coque.md`, `docs/essais/c11b-coque.md` | isolé | implementeur-tdd | `design L4 : OK` (`0 pixel intermédiaire`, `0 frange`, `annotationBande`), `C11a : OK`, `C11b : OK`, `design L1 : OK`, `C1 : OK`, `verifier-e2e.test.sh : OK` | S1, S3, S4, S5, S6 | #tache-t8 |
| T9 | Captures avant / après, comparaison à la maquette 02, suite complète | T8 | `docs/essais/design-l4-avant-barre.png`, `docs/essais/design-l4-avant-simple.png`, `docs/essais/design-l4-apres-barre.png`, `docs/essais/design-l4-apres-bandeau.png`, `docs/essais/design-l4-apres-simple.png`, `docs/essais/design-l4-maquette-barre.png`, `docs/essais/design-l4-maquette-bandeau.png` (neufs) | isolé | implementeur-tdd | `verifier.sh : e2e OK` puis `verifier.sh : OK` ; Wasm 1375581 / 2794511 o ; 7 PNG ; écarts à la maquette listés un par un | S5, S1, S2, S3, S4, S6 | #tache-t9 |

Vagues (fichiers disjoints dans chaque vague, aucune tâche `partagé`) :

- **Vague 1** : T1, T2, T3 en parallèle.
- **Vague 2** : T4, T5 en parallèle (T4 suit T2 pour `annotation-port.ts` ; T5 suit T1 pour `ANNOTATION_ROLE` et T2 pour `ToolbarHost.pointer`).
- **Vague 3** : T6. **Vague 4** : T7. **Vague 5** : T8. **Vague 6** : T9 (seule tâche à lancer `verifier.sh --e2e`).

Chaîne des fichiers partagés d'une vague à l'autre : `rb.css` et `rb-css.test.ts` (T2 → T5 → T7), `App.test.tsx`
(T2 → T6 → T7), `App.tsx` et `main.ts` (T6 → T7), `annotation-port.ts` (T2 → T4).

**Goal :** une barre `role: "annotation"` par profil, montrée seule en annotation, avec la bascule Dessin / Souris en
commande segmentée, les boutons pleins accolés d'envoi, la zone de dépôt à icône, le bandeau « Envoyé au tableau » et
le cadre violet de 3 px désactivable sur l'appareil, aux jetons, icônes et tailles du lot L1, avec la preuve du § 10.

**Architecture :** `toolbar.ts` gagne `annotationBarOf`, lu par `App.tsx` (rendu) et `main.ts` (bande de la coque).
Le contrôleur (`app/annotation.ts`) gagne `pointer(mode)`, `frame?` et `sent?` ; le réglage du cadre voyage dans la
charge du document (`DocumentPayload.frame`, patron `opaque`) jusqu'à `annotate`, qui pose `html[data-cadre]` sur un
`div.rb-annot-frame`. Trois modules neufs : `device-settings.ts` (stockage de l'appareil), `ui/toast.ts` + `Toasts.tsx`
(bandeau), `ui/PointerSwitch.tsx` (commande segmentée, branchée par la table `ACTION_RENDER`). Preuve : essai Playwright
neuf qui réutilise `nettete.mjs` et `commun.mjs`.

**Tech Stack :** Solid 1.9.20, TypeScript, Vitest 4 (happy-dom 21), Playwright 1.65 (Chromium du cache npx), Node 22,
Bash.

**Spec :** `docs/plans/design-l4-cadrage.md` (amont : `docs/plans/design-cadrage.md` § 5, 6, 8, 9, 10 ; lot L1 :
`docs/plans/design-l1-cadrage.md`).

## Global Constraints

- G1 — Test rouge d'abord (TDD) ; aucun test supprimé, désactivé ou sauté ; aucun seuil changé.
- G2 — Aucune dépendance ajoutée : `package.json`, `pnpm-lock.yaml`, `Cargo.toml`, `Cargo.lock` inchangés.
- G3 — Icônes Lucide (ISC) reprises dans `apps/web/src/ui/icons.ts`, avec la mention de licence dans
  `THIRD_PARTY_NOTICES.md` ; une icône sans équivalent Lucide est dessinée dans le même style (trait 1,5, grille 24,
  calage `ICON_VIEWBOX = "-0.25 -0.25 24 24"` comme les icônes du lot L1). Les deux icônes du lot, `check` (Lucide
  `check`) et `drop` (Lucide `file-down`), sont recopiées des symboles `i-check` et `i-drop` de
  `docs/design/maquettes/02-annotation-bureau.html`.
- G4 — Essais et tests existants : retouches **de forme** seulement, intention gardée, celles que la section de la tâche
  liste (cadrage L4-19 et § 3.2, plus les divergences listées en fin d'en-tête) ; toute autre rougeur arrête la tâche
  (rapport, aucune retouche).
- G5 — Aucun changement Rust ni CLI ; plafonds Wasm inchangés (1 572 864 / 3 145 728 o) ; `PROFILE_MINOR`, le schéma et
  `parseProfile` inchangés.
- G6 — VM partagée : builds et tests en `nice -n 10`, cargo `-j 4` (`CARGO_BUILD_JOBS=4`),
  `CARGO_TARGET_DIR=<worktree de la tâche>/target` ; une suite complète (`vitest run` du paquet web entier,
  `pnpm -r test`, `node --test` du dépôt, `verifier.sh`) passe par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ;
  un test isolé (`pnpm --filter @roomboard/web exec vitest run <fichier>`) ou `tsc` s'en passe ; aucun `tauri build`.
- G7 — Toute sortie longue redirigée vers un fichier de `$HOME/.cache/tmp/of48-tmp` (préfixe `T<n>-` dans le nom) ;
  aucun processus laissé en marche.
- G8 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers ajoutés un par un (jamais `git add -A` ni
  `git add .`, jamais `commit -a`) ; aucun push.
- G9 — `src/ui/*.ts(x)` et `app/toolbar-host.ts` : aucun `switch (`, aucun `localStorage`, aucun `draggable` ; les
  `.tsx` sans `\d+px` (garde `Toolbar.test.tsx:147-159`) ; aucun `innerHTML` ; tout branchement passe par une table,
  jamais par un test sur l'identifiant.
- G10 — `rb.css` : aucune règle dont le sélecteur contient `.rb-bar` n'a `position: absolute|fixed`
  (`App.test.tsx:385-393`) ; `.rb-annot-frame`, `.rb-toasts`, `.rb-toast` sont des règles de premier niveau.
- G11 — Netteté (§ 10 du cadrage design) : 0 pixel intermédiaire au bord, 0 frange colorée.
- G12 — Textes exacts : « Dessin », « Souris », « Cadre de l'annotation : affiché » / « … : masqué »,
  « Envoyé au tableau : » + « page N » ; `sentToBoardMessage(n)` inchangé à l'octet (`envoyé au tableau : page N`).

Divergences avec le cadrage, décidées par ce plan (rappelées dans les sections concernées) :

- D1 — 9 tâches au lieu de 8 : le réglage de l'appareil (T3) et le bandeau (T4) sont détachés pour courir en parallèle.
- D2 — Retouches de forme absentes de la carte du cadrage, rendues nécessaires par L4-3 et L4-5 : `App.test.tsx:360`
  et `:368` (barres montrées au tableau = `toolbars` sans rôle `annotation`), `profile-edit.test.ts:84` (le catalogue
  de `outils` propose désormais les 5 actions d'annotation sorties de la barre), `icons.test.ts:23-27` (46 → 48 icônes :
  `check`, `drop`).
- D3 — S6 : avec la rangée des préréglages du Stylo (L4-4), la colonne du profil Simple mesure ≈ 960 px ; « une seule
  colonne » est contrôlée en 1280 × 1080 (écran visé par H12) ; en 1280 × 900, l'essai contrôle que chaque bouton est
  entier dans la fenêtre et que la bande vaut la largeur mesurée (deux colonnes admises).
- D4 — `HostTargets.annotation.pointer` est optionnel (comme `freeze?`, `send?`), pas un `Pick` obligatoire : les faux
  de `toolbar-host.test.ts:19-27` restent sans retouche.
- D5 — Ajouts d'interface sans décision nouvelle : `clearToast()`, `currentToast`, `TOAST_MS` ; `mountAnnotationFrame` ;
  `frameField` ; `FakeAnnotationWindows.frame()` ; `DeviceSettings` ; `FRAME_LABELS` ; `POINTER_SEGMENTS` ; largeur
  entière posée par `Toasts` (calage de l'icône, § 10) ; recadrages de la maquette 02 en PNG (comparaison).

## Review Focus

1. Double clic sur un segment de la commande Dessin / Souris : le second clic ne ramène pas l'autre mode (L4-9, effet
   de bord « Bascule », S1) → T2, test « L4-9 : pointer(mode) en file… double clic sur « Dessin » » ; T8, S1.
2. Copie d'utilisateur de `defaut` faite avant L4 (aucune barre `annotation`) : en annotation, la première barre `tools`
   comme aujourd'hui, profil non réécrit (S2, effet de bord « Profils d'utilisateur ») → T1, test « sans barre
   annotation : la première barre tools » ; T6, test « S2 : barre d'annotation en annotation, première barre tools
   sinon ».
3. Barre d'annotation flottante, placée avant `outils`, ou deux barres de rôle `annotation` : la première sert, posée en
   haut en annotation, jamais montrée au tableau (L4-2, L4-3) → T1, tests « la première barre de rôle annotation » et
   « barre flottante » ; T6, test « L4-3 : barre d'annotation flottante ».
4. Bandeau encore montré quand on rentre en annotation dans les 4 s : effacé à l'entrée et caché en annotation (L4-16)
   → T7, test « S4 : bandeau… effacé à l'entrée » et règle CSS testée.
5. Stockage de l'appareil absent ou qui lève (navigation privée, quota) : le cadre reste affiché par défaut, le choix
   vit en mémoire, rien ne lève (L4-14) → T3, tests « sans stockage » et « stockage qui lève ».

## Carte des fichiers

| Fichier | Rôle | Tâche |
|---|---|---|
| `apps/web/src/toolbar.ts` | `ANNOTATION_ROLE`, `annotationBarOf` | T1 |
| `apps/web/src/fixtures/profils/defaut-avant-l4.rbprofile` (neuf) | `DEFAULT_PROFILE_JSON` @ 136cbbb, tel quel | T1 |
| `apps/web/src/toolbar.test.ts` | `annotationBarOf` ; copies anciennes depuis le profil figé | T1 |
| `apps/web/src/platform/annotation-port.ts` | `AnnotationControl.pointer`, `DocumentPayload.frame`, `frameField` (T2) ; `SENT_TO_BOARD`, `sentToBoardToast` (T4) | T2, T4 |
| `apps/web/src/app/annotation.ts` | `pointer(mode)`, `frame?`, `sent?`, hôte distant | T2 |
| `apps/web/src/app/toolbar-host.ts` | `ToolbarHost.pointer?`, `HostTargets.annotation.pointer?` | T2 |
| `apps/web/src/platform/annotation-fake.ts` / `annotation-tauri.ts` | `frame` dans la charge ; `annotationCadre`, `annotationBande` | T2 |
| `apps/web/src/app/annotation-page.ts`, `apps/web/src/annotate-start.ts` | cadre appliqué à chaque document ; `mountAnnotationFrame` | T2 |
| `apps/web/src/device-settings.ts` (neuf) | `FRAME_KEY`, `createDeviceSettings` | T3 |
| `apps/web/src/ui/SettingsPanel.tsx` | bouton `data-reglage="cadre"` | T3 |
| `apps/web/src/ui/toast.ts`, `apps/web/src/ui/Toasts.tsx` (neufs) | bandeau | T4 |
| `apps/web/src/ui/PointerSwitch.tsx` (neuf) | commande segmentée | T5 |
| `apps/web/src/ui/Toolbar.tsx` | `ACTION_RENDER`, `PRIMARY_ACTIONS`, `Drop` à icône, `CONTEXT_ROLES` | T5 |
| `apps/web/src/ui/IconButton.tsx` | `Bubble` exportée | T5 |
| `apps/web/src/ui/icons.ts`, `THIRD_PARTY_NOTICES.md` | `check`, `drop` | T5 |
| `apps/web/src/ui/rb.css` | `.rb-annot-frame` (T2) ; segment, boutons pleins, zone (T5) ; bandeau (T7) | T2, T5, T7 |
| `apps/web/src/toolbar-profiles.ts` | barres d'annotation de `defaut`, `annotation`, `simple` | T6 |
| `apps/web/src/ui/App.tsx` | barre choisie, barres `annotation` cachées au tableau, préréglages, `pointer` (T6) ; `Toasts`, `device` (T7) | T6, T7 |
| `apps/web/src/main.ts` | `measureBar` par `annotationBarOf` (T6) ; `device`, `frame`, `sent` (T7) | T6, T7 |
| `apps/web/src/ui/ProfileEditor.tsx` | « Barre d'annotation » | T6 |
| `scripts/essais/design-l4-navigateur.mjs` (neuf) | S1, S3, S4, S5, S6, captures | T8 |
| `scripts/essais/c11a-…`, `c11b-…`, `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh` | retouches de forme ; essai dans `--e2e` | T8 |
| `docs/essais/c11a-coque.md`, `docs/essais/c11b-coque.md` | C11a-9 ; ligne C11b-1, avis en bandeau | T8 |
| `docs/essais/design-l4-*.png` (neufs) | recadrages avant / après / maquette | T9 |

---

### Tâche T1 — Modèle : `annotationBarOf` et profil figé d'avant L4
<a id="tache-t1"></a>

**Objectif.** Poser la règle unique « quelle barre en annotation » (cadrage L4-1, L4-2) dans `toolbar.ts`, et figer le
`DEFAULT_PROFILE_JSON` d'`origin/main` @ 136cbbb comme point de départ des copies anciennes des tests (L4-22). Les
profils livrés ne changent pas ici (T6).

**Fichiers.**
- Créer : `apps/web/src/fixtures/profils/defaut-avant-l4.rbprofile`
- Modifier : `apps/web/src/toolbar.ts` (après `isAnnotationZone`, `toolbar.ts:662-665`), `apps/web/src/toolbar.test.ts`
  (imports ; `:368-374` ; `:381-386` ; `:421-428` ; `:430-440` ; describe ajouté en fin de fichier)

**Interfaces.**
- Consomme : `parseProfile`, `type Profile`, `type Toolbar` (`toolbar.ts`) ; `builtinProfile` (`toolbar-profiles.ts`).
- Produit :
  - `export const ANNOTATION_ROLE = "annotation"`
  - `export function annotationBarOf(p: Profile): Toolbar | null` — première barre de rôle `annotation`, sinon première
    `tools` ; `dock: "floating"` rendu `"top"` (copie, profil intact) ; null si aucune des deux.
  - Fichier `apps/web/src/fixtures/profils/defaut-avant-l4.rbprofile` (JSON, `id: "defaut"`, barres `outils`, `pages`).
- Réutilise : `apps/web/src/toolbar.ts:672` — `itemsForMode(bar: Toolbar, caps: RuntimeCapabilities, mode: StartMode): ToolItem[]`,
  étendu par `ANNOTATION_ROLE` et `annotationBarOf(p: Profile): Toolbar | null` (règle aujourd'hui écrite deux fois,
  `App.tsx:325-330` et `main.ts:451-452` ; T6 les remplace).
- Rapport : une ligne `Réutilisation : appelé toolbar.ts (itemsForMode, parseProfile)` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/design-l4--T1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of48-tmp CARGO_BUILD_JOBS=4 CARGO_TARGET_DIR=/home/adminjd/projets/roomboard-wt/design-l4--T1/target && mkdir -p "$TMPDIR" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/toolbar.test.ts --reporter=verbose > "$TMPDIR/T1-vitest.log" 2>&1; echo "code $?"; grep -E "✓|×|FAIL |Test Files|Tests " "$TMPDIR/T1-vitest.log" | tail -60`
Preuve : `code 0`, `Tests  N passed (N)`, cinq lignes `annotationBarOf (design-l4` présentes, aucun `×` ni `FAIL `.

**Preuve visuelle.** Aucune (modèle sans rendu).

**Contraintes (recopiées).** G1 test rouge d'abord, aucun test supprimé, désactivé ou sauté, aucun seuil changé ·
G2 aucune dépendance ajoutée · G4 retouches de forme seulement, celles listées ici (`toolbar.test.ts:368-374`,
`:381-386`, `:421-428`, `:430-440`), toute autre rougeur arrête la tâche · G5 `PROFILE_MINOR`, schéma et `parseProfile`
inchangés, aucun Rust ni CLI · G6 `nice -n 10`, `CARGO_TARGET_DIR=/home/adminjd/projets/roomboard-wt/design-l4--T1/target`,
test isolé sans `suite-vm` · G7 sorties dans `$HOME/.cache/tmp/of48-tmp/T1-*` · G8 auteur
`jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers ajoutés un par un, aucun push.

**Interdits.** Ne pas toucher `toolbar-profiles.ts` (T6) ni `itemsForMode` ; aucun fichier généré laissé hors du
fichier figé ; ne pas réécrire le JSON figé à la main.

**Terminé quand.** Le profil figé existe et se lit, les tests passent, `tsc` rend 0, commit fait.

- [ ] **Étape 0 : préparer le worktree** —
  `cd /home/adminjd/projets/roomboard-wt/design-l4--T1 && mkdir -p $HOME/.cache/tmp/of48-tmp && (test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile > $HOME/.cache/tmp/of48-tmp/T1-install.log 2>&1) && for d in wasm wasm-formats; do test -d apps/web/src/$d || cp -r /home/adminjd/projets/roomboard-wt/design-l4/apps/web/src/$d apps/web/src/$d; done && ls apps/web/src/wasm/roomboard_wasm.d.ts`
  Attendu : le chemin listé (modules Wasm copiés du chantier : aucun Rust ne change, L4-21).

- [ ] **Étape 1 : générer le profil figé** depuis `136cbbb`, sans le recopier à la main.

```bash
cd /home/adminjd/projets/roomboard-wt/design-l4--T1 && G=$HOME/.cache/tmp/of48-tmp/T1-gen && rm -rf "$G" && mkdir -p "$G" \
  && git show 136cbbb:apps/web/src/toolbar-profiles.ts | sed 's#from "./toolbar";#from "./toolbar.ts";#' > "$G/toolbar-profiles.ts" \
  && printf 'export type Profile = unknown;\nexport const parseProfile = (j) => ({ profile: j, warnings: [] });\n' > "$G/toolbar.ts" \
  && printf 'import { DEFAULT_PROFILE_JSON } from "./toolbar-profiles.ts";\nprocess.stdout.write(JSON.stringify(DEFAULT_PROFILE_JSON, null, 2) + "\\n");\n' > "$G/gen.mjs" \
  && node --experimental-strip-types "$G/gen.mjs" > apps/web/src/fixtures/profils/defaut-avant-l4.rbprofile && rm -rf "$G" \
  && node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(j.id,j.toolbars.map(b=>b.id).join(","),j.toolbars[0].groups.at(-1).items.at(-1).id)' apps/web/src/fixtures/profils/defaut-avant-l4.rbprofile
```
  Attendu : `defaut outils,pages depot-annotation`.

- [ ] **Étape 2 : écrire les tests (rouges).** Dans `toolbar.test.ts`, imports : ajouter en tête
  `import { readFileSync } from "node:fs";` et `import { join } from "node:path";` ; ajouter `ANNOTATION_ROLE` et
  `annotationBarOf` à l'import de `./toolbar` ; remplacer `import { builtinProfile, DEFAULT_PROFILE_JSON } from "./toolbar-profiles";`
  par `import { builtinProfile } from "./toolbar-profiles";`. Après les constantes `ALL` et `NONE`, ajouter :

```ts
/** design-l4 (L4-22) : `DEFAULT_PROFILE_JSON` d'origin/main @ 136cbbb, tel quel : aucune barre `annotation`, éléments
 *  d'annotation dans `outils`. Point de départ des copies anciennes. */
const BEFORE_L4: Record<string, unknown> = JSON.parse(readFileSync(join(__dirname, "fixtures", "profils", "defaut-avant-l4.rbprofile"), "utf8"));
```

  Retouches de forme (L4-22, cadrage § 3.2) : dans `oldDefault()` (`:370`) et dans le test « profil d'avant C11b »
  (`:431`), remplacer `structuredClone(DEFAULT_PROFILE_JSON)` par `structuredClone(BEFORE_L4)` ; dans « annotation :
  zone visible ; sortie et bascule déjà là » (`:382`) remplacer `itemsForMode(builtinProfile("defaut")!.toolbars[0]!, caps, "desktop-annotation")`
  par `itemsForMode(annotationBarOf(builtinProfile("defaut")!)!, caps, "desktop-annotation")` ; dans « tableau : les
  trois masquées… » (`:421-428`), garder `const bar = builtinProfile("defaut")!.toolbars[0]!;` pour la moitié tableau
  et remplacer `const ann = itemsForMode(bar, caps, "desktop-annotation");` par
  `const ann = itemsForMode(annotationBarOf(builtinProfile("defaut")!)!, caps, "desktop-annotation");`.

  Ajouter en fin de fichier :

```ts
describe("annotationBarOf (design-l4, L4-1, L4-2)", () => {
  const bar = (id: string, role: string, dock: string) => ({
    id,
    role,
    dock,
    groups: [{ id: `g-${id}`, items: [{ id: `pen-${id}`, kind: "tool", tool: "pen", label: "Stylo" }] }],
  });
  const withBars = (...bars: unknown[]): Profile => {
    const r = parseProfile({ format: "roomboard-profile", schema: 1, id: "essai", label: "Essai", toolbars: bars });
    if ("errors" in r) throw new Error(r.errors.join("; "));
    return r.profile;
  };
  it("annotationBarOf (design-l4) : ANNOTATION_ROLE vaut « annotation », accepté par parseProfile sans avertissement", () => {
    expect(ANNOTATION_ROLE).toBe("annotation");
    const r = parseProfile({ ...base(), toolbars: [bar("outils", "tools", "top"), bar("annotation", "annotation", "top")] });
    expect("errors" in r ? r.errors : r.warnings).toEqual([]);
  });
  it("annotationBarOf (design-l4) : la première barre de rôle annotation, même placée après outils et pages", () => {
    const p = withBars(bar("outils", "tools", "top"), bar("pages", "pages", "bottom"), bar("a1", "annotation", "left"), bar("a2", "annotation", "top"));
    expect(annotationBarOf(p)?.id).toBe("a1");
    expect(annotationBarOf(p)?.dock).toBe("left");
    const first = withBars(bar("a0", "annotation", "right"), bar("outils", "tools", "top"));
    expect(annotationBarOf(first)?.id).toBe("a0");
  });
  it("annotationBarOf (design-l4) : sans barre annotation, la première barre tools (profil figé d'avant L4)", () => {
    const r = parseProfile(BEFORE_L4);
    if ("errors" in r) throw new Error(r.errors.join("; "));
    expect(r.warnings).toEqual([]);
    expect(r.profile.toolbars.some((b) => b.role === ANNOTATION_ROLE)).toBe(false);
    expect(annotationBarOf(r.profile)).toBe(r.profile.toolbars[0]);
    expect(annotationBarOf(r.profile)?.id).toBe("outils");
  });
  it("annotationBarOf (design-l4) : barre flottante posée en haut, le profil n'est pas réécrit", () => {
    const p = withBars(bar("outils", "tools", "top"), bar("a", "annotation", "floating"));
    const before = JSON.stringify(p);
    expect(annotationBarOf(p)).toMatchObject({ id: "a", role: "annotation", dock: "top" });
    expect(JSON.stringify(p)).toBe(before);
    expect(annotationBarOf(withBars(bar("f", "tools", "floating")))).toMatchObject({ id: "f", dock: "top" });
  });
  it("annotationBarOf (design-l4) : ni annotation ni tools → null", () => {
    expect(annotationBarOf(withBars(bar("pages", "pages", "bottom")))).toBeNull();
  });
});
```

- [ ] **Étape 3 : vérifier le rouge** — commande bornée de la section. Attendu : `code 1`, `FAIL`, erreur
  `annotationBarOf is not a function` (ou `ANNOTATION_ROLE` indéfini).

- [ ] **Étape 4 : implémenter** dans `toolbar.ts`, juste après `isAnnotationZone` :

```ts
/** design-l4 (L4-1, Q9) : rôle de la barre propre à l'annotation ; `parseProfile` accepte tout rôle, le schéma ne change pas. */
export const ANNOTATION_ROLE = "annotation";

/**
 * design-l4 (L4-2) : barre montrée et mesurée en annotation, une seule règle pour `App.tsx` (rendu) et `main.ts`
 * (épaisseur de la bande) : la première barre de rôle `annotation`, sinon la première `tools` (profil d'avant L4, comme
 * C11a P20) ; une barre flottante y est posée en haut (copie : le profil n'est pas réécrit). Null : aucune des deux.
 */
export function annotationBarOf(p: Profile): Toolbar | null {
  const bar = p.toolbars.find((b) => b.role === ANNOTATION_ROLE) ?? p.toolbars.find((b) => b.role === "tools");
  if (bar === undefined) return null;
  return bar.dock === "floating" ? { ...bar, dock: "top" } : bar;
}
```

- [ ] **Étape 5 : vérifier le vert** — commande bornée de la section. Attendu : `code 0`, `Tests  N passed (N)`, les
  cinq lignes `annotationBarOf (design-l4` présentes.

- [ ] **Étape 6 : tsc** —
  `cd /home/adminjd/projets/roomboard-wt/design-l4--T1 && export TMPDIR=$HOME/.cache/tmp/of48-tmp && nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit > "$TMPDIR/T1-tsc.log" 2>&1; echo "tsc code $?"; tail -20 "$TMPDIR/T1-tsc.log"`
  Attendu : `tsc code 0`.

- [ ] **Étape 7 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l4--T1
git add apps/web/src/fixtures/profils/defaut-avant-l4.rbprofile
git add apps/web/src/toolbar.ts
git add apps/web/src/toolbar.test.ts
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(toolbar): annotation bar role and annotationBarOf, frozen pre-L4 default profile" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport de la tâche : sortie de l'étape 1, nombre de tests, ligne `Réutilisation : …`.

---

### Tâche T2 — Contrôleur et transport : bascule idempotente, cadre dans la charge, `sent`, élément du cadre
<a id="tache-t2"></a>

**Objectif.** Côté contrôleur et fenêtres (cadrage L4-9, L4-12, L4-13, L4-16 pour `sent`) : `pointer(mode)` en file,
sans effet si le mode est déjà là ; le réglage du cadre voyage dans la charge du document vers `annotate` qui pose
`html[data-cadre]` sur un `div.rb-annot-frame` ; l'envoi réussi appelle `sent(page)` quand il est donné ; le faux hôte
publie `annotationCadre` et `annotationBande`. Aucun branchement dans l'application ici (T6, T7).

**Fichiers.**
- Créer : `apps/web/src/app/annotation-frame.test.ts`
- Modifier : `apps/web/src/platform/annotation-port.ts` (`:120-124`, `:157-163`, `:197-216`), `apps/web/src/app/annotation.ts`
  (`:45-76`, `:139-144`, `:179`, `:244-248`, `:296`, `:343`, `:387-402`), `apps/web/src/app/toolbar-host.ts` (`:5`, `:12-35`,
  `:104-132`), `apps/web/src/platform/annotation-fake.ts` (`:41-53`, `:72`, `:88-124`, `:184`), `apps/web/src/platform/annotation-tauri.ts`
  (`:85`, `:95`), `apps/web/src/app/annotation-page.ts` (`:63-76`, `:186-191`, fonction ajoutée), `apps/web/src/annotate-start.ts`
  (`:6`, `:29`, `:48-61`), `apps/web/src/ui/rb.css` (après `:79`), `apps/web/src/ui/rb-css.test.ts` (fin),
  `apps/web/src/ui/App.test.tsx` (`:270-284`, faux contrôleur), et les tests `annotation.test.ts`, `toolbar-host.test.ts`,
  `annotation-fake.test.ts`, `annotation-tauri.test.ts`, `annotation-page.test.ts` (ajouts).

**Interfaces.**
- Consomme : `type PointerMode` (`annotation-port.ts:110`), `serial`, `lastDraw`, `ctl.command` (`annotation.ts`).
- Produit :
  - `AnnotationControl.pointer(mode: PointerMode): Promise<void>`
  - `DocumentPayload.frame?: boolean` (absent : vrai) ; `AnnotationWindows.enter(o: AnnotationPlace & { document; profile; opaque?; frame?: boolean })` ;
    `AnnotationWindows.load(o: { document: Uint8Array; opaque: boolean; frame?: boolean })`
  - `export const frameField = (o: { readonly frame?: boolean }): { readonly frame?: boolean }` (`annotation-port.ts`)
  - `AnnotationDeps.frame?(): boolean` ; `AnnotationDeps.sent?(page: number): void`
  - `ToolbarHost.pointer?(mode: PointerMode): void` ; `HostTargets.annotation.pointer?(mode: PointerMode): Promise<void>` (D4)
  - `FakeAnnotationWindows.frame(): boolean | null` ; `dataset.annotationCadre` (`"1"`/`"0"`), `dataset.annotationBande` (`"<dock>:<épaisseur>"`)
  - `AnnotationPageDeps.frame?(on: boolean): void` ; `export function mountAnnotationFrame(doc: Document): (on: boolean) => void`
  - CSS : `.rb-annot-frame`, `html[data-cadre="1"] .rb-annot-frame`
- Réutilise : `apps/web/src/app/annotation.ts:244` (`toggle`), `:139` (`setPointer`, privé) — étendus par
  `AnnotationControl.pointer(mode: PointerMode): Promise<void>` ; `apps/web/src/app/toolbar-host.ts:12-35` — étendu par
  `ToolbarHost.pointer?(mode: PointerMode): void` et `HostTargets.annotation.pointer?`.
- Réutilise : `apps/web/src/platform/annotation-port.ts:120` (`DocumentPayload`), `:158-163` (`enter`, `load`) — étendus
  par `frame?: boolean` ; `AnnotationDeps.frame?(): boolean` ; `AnnotationPageDeps.frame?(on: boolean): void`.
- Réutilise : `apps/web/src/platform/annotation-fake.ts:88-111` — `dataset` étendu par `annotationCadre`, `annotationBande`.
- Rapport : `Réutilisation : appelé annotation.ts (serial, command), annotation-port.ts, annotation-fake.ts` ou
  `Réutilisation : écart — <pourquoi>`.

**Patron à ne pas reprendre.**
- `toggle` tel quel (`apps/web/src/app/annotation.ts:244-248`) : il relit le mode au moment où il passe dans la file ;
  deux clics sur « Dessin » font dessin puis souris. `pointer(mode)` reçoit le mode voulu et ne fait rien s'il est déjà là.
- `setPointer` appelé directement (`apps/web/src/app/annotation.ts:139-144`) : il changerait le pointeur sans changer
  l'outil d'`annotate` ; la bascule passe toujours par `ctl.command({ kind: "setTool", … })`, comme `toggle`.
- `frame: d.frame?.() ?? true` posé dans toute charge : il casserait `annotation-tauri.test.ts:62`, `:188`, `:191`
  (`toEqual` exacts). Le champ n'est écrit que s'il est donné.

**Chemin de référence (patron `opaque`, C11b P15).** `apps/web/src/platform/annotation-tauri.ts:85`, `:95` ;
`apps/web/src/platform/annotation-fake.ts:93-95`, `:108-111` ; `apps/web/src/app/annotation-page.ts:186-201` ;
`apps/web/src/app/annotation.ts:179`, `:296`.

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/design-l4--T2 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of48-tmp CARGO_BUILD_JOBS=4 CARGO_TARGET_DIR=/home/adminjd/projets/roomboard-wt/design-l4--T2/target && mkdir -p "$TMPDIR" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app/annotation.test.ts src/app/toolbar-host.test.ts src/platform/annotation-fake.test.ts src/platform/annotation-tauri.test.ts src/app/annotation-page.test.ts src/app/annotation-frame.test.ts src/ui/rb-css.test.ts src/ui/App.test.tsx --reporter=verbose > "$TMPDIR/T2-vitest.log" 2>&1; echo "code $?"; grep -E "×|FAIL |Test Files|Tests |L4-" "$TMPDIR/T2-vitest.log" | tail -60`
Preuve : `code 0`, `Test Files  8 passed (8)`, lignes `L4-9`, `L4-12`, `L4-13`, `L4-16` présentes, aucun `×`.
Tests à garder verts cités par le cadrage dans cette zone : `annotation.test.ts:138-151` (bascule P8),
`annotation.test.ts:303-316` (avis par `say` sans `sent`), `annotation-tauri.test.ts:53-63`, `:187-191`, `App.test.tsx`
entier (`fakeAnnotationUi`).

**Preuve visuelle.** Aucune dans la tâche (le cadre est contrôlé par S3 dans T8 et par le geste C11a-9).

**Contraintes (recopiées).** G1 test rouge d'abord, aucun test supprimé, désactivé ou sauté, aucun seuil changé ·
G2 aucune dépendance ajoutée · G4 retouche de forme admise : `App.test.tsx` faux contrôleur (`pointer` ajouté) ; toute
autre rougeur arrête la tâche · G5 aucun Rust ni CLI (la coque relaie la charge sans la lire, L4-21) · G6 `nice -n 10`,
`CARGO_TARGET_DIR=/home/adminjd/projets/roomboard-wt/design-l4--T2/target`, tests isolés sans `suite-vm` · G7 sorties dans
`$HOME/.cache/tmp/of48-tmp/T2-*` · G8 auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé
par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un, aucun push · G9 `app/toolbar-host.ts`
sans `switch (` ni `localStorage` · G10 `.rb-annot-frame` règle de premier niveau, aucune `position` dans une règle `.rb-bar`.

**Interdits.** Ne toucher ni `App.tsx` ni `main.ts` (T6, T7) ; ne pas changer `toggle` côté comportement (l'action
`annotation-pointer` reste `toggle`) ; ne pas toucher `sentToBoardMessage` (T4) ; aucun code de capture modifié (L4-15).

**Terminé quand.** Les 8 fichiers de test passent, `tsc` rend 0, commit fait.

- [ ] **Étape 0 : préparer le worktree** —
  `cd /home/adminjd/projets/roomboard-wt/design-l4--T2 && mkdir -p $HOME/.cache/tmp/of48-tmp && (test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile > $HOME/.cache/tmp/of48-tmp/T2-install.log 2>&1) && for d in wasm wasm-formats; do test -d apps/web/src/$d || cp -r /home/adminjd/projets/roomboard-wt/design-l4/apps/web/src/$d apps/web/src/$d; done && ls apps/web/src/wasm/roomboard_wasm.d.ts`

- [ ] **Étape 1 : tests du contrôleur (rouges).** Dans `annotation.test.ts` : ajouter `captureFailedMessage` et
  `sentToBoardMessage` à l'import de `../platform/annotation-port` ; dans `setup`, ajouter au type de `o`
  `frame?: () => boolean; onSent?: (page: number) => void;` et, en fin de l'objet `deps` (après `transparent`) :
  `...(o.frame === undefined ? {} : { frame: o.frame }),` puis `...(o.onSent === undefined ? {} : { sent: o.onSent }),`.
  Dans le describe « hôte de barre distant (P21) », ajouter :

```ts
  it("design-l4 (L4-9) : pointer reste dans la fenêtre principale (hôte local), rien n'est envoyé à annotate", () => {
    const sent: AnnotationCommand[] = [];
    const pointer = vi.fn();
    const h = createRemoteToolbarHost((m) => sent.push(m), { ...local(), pointer }, ANNOTATION_REMOTE_ACTIONS);
    h.pointer?.("mouse");
    expect(pointer).toHaveBeenCalledWith("mouse");
    expect(sent).toEqual([]);
  });
```

  Ajouter en fin de fichier :

```ts
describe("contrôleur d'annotation (design-l4 : bascule, cadre, avis)", () => {
  const tools = (sent: readonly AnnotationCommand[]): string[] => sent.flatMap((m) => (m.kind === "setTool" ? [m.tool] : []));
  it("L4-9 : pointer(mode) en file ; un mode déjà présent est sans effet ; double clic sur « Dessin » : reste en dessin", async () => {
    const { ctl, windows } = setup();
    await ctl.enter();
    ctl.command({ kind: "setTool", tool: "rect" });
    await Promise.all([ctl.pointer("mouse"), ctl.pointer("mouse")]);
    expect(ctl.state().pointer).toBe("mouse");
    expect(tools(windows.sent)).toEqual(["pen", "rect", "select"]);
    await Promise.all([ctl.pointer("draw"), ctl.pointer("draw")]);
    expect(ctl.state().pointer).toBe("draw");
    expect(tools(windows.sent)).toEqual(["pen", "rect", "select", "rect"]);
  });
  it("L4-9 : hors annotation, pointer ne fait rien", async () => {
    const { ctl, windows } = setup();
    await ctl.pointer("mouse");
    expect(windows.sent).toEqual([]);
    expect(ctl.state().pointer).toBe("draw");
  });
  it("L4-13 : frame lu à l'entrée puis au rechargement de « Figer » ; publié par le faux hôte", async () => {
    let on = false;
    const ds: Record<string, string | undefined> = {};
    const { ctl, windows } = setup({ dataset: ds, frame: () => on });
    await ctl.enter();
    expect([windows.frame(), ds["annotationCadre"]]).toEqual([false, "0"]);
    on = true;
    await ctl.freeze();
    expect(windows.log).toContain("load opaque");
    expect([windows.frame(), ds["annotationCadre"]]).toEqual([true, "1"]);
  });
  it("L4-13 : sans dépendance frame, la charge n'a pas le champ : cadre affiché", async () => {
    const { ctl, windows } = setup();
    await ctl.enter();
    expect(windows.frame()).toBe(true);
  });
  it("L4-16 : avec sent, l'envoi réussi appelle sent(page) et ne dit plus l'avis d'envoi ; l'avis d'échec de capture reste dit", async () => {
    const pages: number[] = [];
    const { ctl, deps, log } = setup({ capture: { ok: false, reason: "denied" }, onSent: (p) => void pages.push(p) });
    await ctl.enter();
    await ctl.send("origin");
    expect(pages).toEqual([2]);
    expect(log.at(-1)).toBe(`say ${captureFailedMessage("denied")}`);
    expect(vi.mocked(deps.say).mock.calls.map((c) => c[0])).not.toContain(sentToBoardMessage(2));
  });
  it("L4-16 : rien envoyé (sendCapture null) : sent n'est pas appelé", async () => {
    const pages: number[] = [];
    const { ctl } = setup({ sent: null, onSent: (p) => void pages.push(p) });
    await ctl.enter();
    await ctl.send("origin");
    expect(pages).toEqual([]);
  });
});
```

- [ ] **Étape 2 : vérifier le rouge** —
  `cd /home/adminjd/projets/roomboard-wt/design-l4--T2 && export TMPDIR=$HOME/.cache/tmp/of48-tmp && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app/annotation.test.ts --reporter=verbose > "$TMPDIR/T2-ann.log" 2>&1; echo "code $?"; grep -E "×|Tests " "$TMPDIR/T2-ann.log" | tail -20`
  Attendu : `code 1`, échecs sur `ctl.pointer is not a function`, `windows.frame is not a function`, `pages` vide.

- [ ] **Étape 3 : port.** Dans `annotation-port.ts` : `DocumentPayload` devient

```ts
export interface DocumentPayload {
  readonly base64: string;
  /** C11b (P15) : fenêtre opaque (bureau figé) ; absent : faux (charge C11a). */
  readonly opaque?: boolean;
  /** design-l4 (L4-13) : cadre violet de l'annotation ; absent : vrai (charge d'avant L4). */
  readonly frame?: boolean;
}
/** design-l4 (L4-13) : champ `frame` d'une charge, écrit seulement s'il est donné (patron `opaque`) ; même code pour la
 *  coque et le faux hôte. */
export const frameField = (o: { readonly frame?: boolean }): { readonly frame?: boolean } => (o.frame === undefined ? {} : { frame: o.frame });
```

  Dans `AnnotationWindows` : `enter(o: AnnotationPlace & { readonly document: Uint8Array; readonly profile: Profile; readonly opaque?: boolean; readonly frame?: boolean }): Promise<number>;`
  et `load(o: { readonly document: Uint8Array; readonly opaque: boolean; readonly frame?: boolean }): Promise<void>;`
  (commentaire de `enter` complété : « design-l4 (L4-13) : `frame` faux : cadre masqué ; absent : affiché »). Dans
  `AnnotationControl`, après `toggle(): Promise<void>;` :

```ts
  /** design-l4 (L4-9) : segment de la commande Dessin / Souris : en file, sans effet si `mode` est déjà le mode présent. */
  pointer(mode: PointerMode): Promise<void>;
```

- [ ] **Étape 4 : contrôleur.** Dans `annotation.ts`, `AnnotationDeps` : commentaire de `bar()` remplacé par
  « Côté et épaisseur (px CSS) de la barre montrée en annotation (`annotationBarOf`), mesurés dans la page. » ; ajouter
  après `transparent` :

```ts
  /** design-l4 (L4-13) : cadre violet de l'appareil, lu à chaque entrée et à chaque rechargement ; absent : la charge
   *  ne porte pas le champ (`annotate` affiche le cadre). */
  frame?(): boolean;
  /** design-l4 (L4-16) : envoi réussi, page `page` (1 = première) ; absent : l'avis reste `say(sentToBoardMessage)`. */
  sent?(page: number): void;
```

  Après `setPointer` :

```ts
  /** L4-13 : champ `frame` de la charge, seulement si l'appareil le donne. */
  const frameOf = (): { readonly frame?: boolean } => (d.frame === undefined ? {} : { frame: d.frame() });
  /** L4-9 : la souris passe par Sélection, le dessin revient au dernier outil de dessin (P8) ; sans effet si `mode` est
   *  déjà le mode présent (double clic sur un segment). Appelée dans la file. */
  const pointTo = (mode: PointerMode): void => {
    if (!st.active || st.pointer === mode) return;
    ctl.command({ kind: "setTool", tool: mode === "mouse" ? "select" : lastDraw });
  };
```

  Remplacer `const screen = await d.windows.enter({ ...place, document, profile: d.profile(), opaque: frozen });` par
  `const screen = await d.windows.enter({ ...place, document, profile: d.profile(), opaque: frozen, ...frameOf() });` ;
  remplacer `await d.windows.load({ document: await d.encodeTab(tab), opaque: !toLive });` par
  `await d.windows.load({ document: await d.encodeTab(tab), opaque: !toLive, ...frameOf() });` ; remplacer le bloc
  `toggle` par :

```ts
    toggle: () => serial(async () => pointTo(st.pointer === "draw" ? "mouse" : "draw")),
    pointer: (mode) => serial(async () => pointTo(mode)),
```

  Remplacer `await d.say(sentToBoardMessage(r.page), "info");` par :

```ts
        // design-l4 (L4-16) : bandeau non modal si l'application le donne ; sinon la boîte d'information (C11b P12).
        if (d.sent !== undefined) d.sent(r.page);
        else await d.say(sentToBoardMessage(r.page), "info");
```

  Dans `createRemoteToolbarHost`, après `setMode` : `pointer: (mode) => local.pointer?.(mode),` (commentaire de la
  fonction : « … le dépôt, le mode et la commande Dessin / Souris restent locaux »).

- [ ] **Étape 5 : vérifier le vert** — commande de l'étape 2. Attendu : `code 0`, tests `L4-9`, `L4-13`, `L4-16`
  verts, « bascule : Sélection → souris… (P8) » et « Envoyer au tableau (vivant)… » toujours verts.

- [ ] **Étape 6 : hôte local (rouge puis vert).** Dans `toolbar-host.test.ts`, describe « ToolbarHost local », ajouter :

```ts
  it("design-l4 (L4-9) : pointer(mode) → annotation.pointer(mode) ; sans contrôleur ou sans pointer : rien", () => {
    const s = setupWithAnnotation(true);
    const pointer = vi.fn(async () => undefined);
    const host = createLocalToolbarHost({ ...s.t, annotation: { ...s.t.annotation!, pointer } } as HostTargets, () => BUILTIN_PROFILES[0]!);
    host.pointer?.("mouse");
    expect(pointer).toHaveBeenCalledWith("mouse");
    expect(s.t.annotation!.toggle).not.toHaveBeenCalled();
    expect(() => s.host.pointer?.("draw")).not.toThrow();
    expect(() => setup().host.pointer?.("draw")).not.toThrow();
  });
```

  Lancer `vitest run src/app/toolbar-host.test.ts` (même forme que l'étape 2, journal `T2-host.log`) : rouge
  (`pointer` jamais appelé). Puis dans `toolbar-host.ts` : `import type { AnnotationControl, PointerMode, SendTarget } from "../platform/annotation-port";` ;
  dans `ToolbarHost`, après `imagePanel(): void;` :

```ts
  /** design-l4 (L4-9) : segment de la commande Dessin / Souris ; absent (hôte partiel) : le segment rejoue l'action. */
  pointer?(mode: PointerMode): void;
```

  dans `HostTargets.annotation`, après `send?(to: SendTarget): Promise<void>;` : `pointer?(mode: PointerMode): Promise<void>;`
  (D4) ; dans `createLocalToolbarHost`, après `imagePanel` : `pointer: (mode) => settle(t.annotation?.pointer?.(mode)),`.
  Relancer : vert.

- [ ] **Étape 7 : coque et faux hôte (rouge puis vert).** Dans `annotation-fake.test.ts`, ajouter :

```ts
  it("design-l4 (L4-13) : cadre de la charge publié (annotationCadre, absent : 1) ; bande publiée à l'entrée et au placement", async () => {
    const ds: Record<string, string | undefined> = {};
    const f = createFakeAnnotationWindows({ dataset: ds });
    expect(f.frame()).toBeNull();
    await f.enter({ ...place, document: new Uint8Array([1]), profile: BUILTIN_PROFILES[0]! });
    expect([ds["annotationCadre"], f.frame(), ds["annotationBande"]]).toEqual(["1", true, "top:48"]);
    await f.enter({ ...place, document: new Uint8Array([1]), profile: BUILTIN_PROFILES[0]!, frame: false });
    expect([ds["annotationCadre"], f.frame()]).toEqual(["0", false]);
    await f.load({ document: new Uint8Array([2]), opaque: true, frame: true });
    expect([ds["annotationCadre"], f.frame()]).toEqual(["1", true]);
    await f.place({ screen: null, dock: "left", thickness: 72 });
    expect(ds["annotationBande"]).toBe("left:72");
  });
```

  Dans `annotation-tauri.test.ts`, ajouter :

```ts
  it("design-l4 (L4-13) : frame dans la charge du document seulement s'il est donné (enter et load)", async () => {
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc);
    await w.enter({ ...place, document: doc, profile: BUILTIN_PROFILES[0]!, frame: false });
    expect(f.emitted.at(-1)!.payload).toEqual({ base64: toBase64(doc), opaque: false, frame: false });
    await w.load({ document: doc, opaque: true, frame: true });
    expect(f.emitted.at(-1)!.payload).toEqual({ base64: toBase64(doc), opaque: true, frame: true });
    await w.load({ document: doc, opaque: false });
    expect(f.emitted.at(-1)!.payload).toEqual({ base64: toBase64(doc), opaque: false });
  });
```

  Lancer les deux fichiers (journal `T2-hosts.log`) : rouge. Puis `annotation-tauri.ts` : ajouter `frameField` à
  l'import de `./annotation-port` ; ligne 85 :
  `await ipc.emitTo<DocumentPayload>(ANNOTATE_LABEL, ANNOTATION_EVENTS.document, { base64: toBase64(o.document), opaque: o.opaque === true, ...frameField(o) });` ;
  ligne 95 : `await ipc.emitTo<DocumentPayload>(ANNOTATE_LABEL, ANNOTATION_EVENTS.document, { base64: toBase64(o.document), opaque: o.opaque, ...frameField(o) });`.
  `annotation-fake.ts` : `frameField` ajouté à l'import ; dans `FakeAnnotationWindows`, après `captures(): number;` :

```ts
  /** design-l4 (L4-13) : cadre du dernier `enter` ou `load` (absent de la charge : vrai) ; null avant. */
  frame(): boolean | null;
```

  après `let captures = 0;` : `let lastFrame: boolean | null = null;` ; `enter`, `load` et `place` deviennent :

```ts
    async enter(p) {
      const screen = clamp(p.screen);
      log.push(`enter ${screen}`);
      jsonChannel<Profile>(p.profile);
      profiles += 1;
      const payload = jsonChannel<DocumentPayload>({ base64: toBase64(p.document), opaque: p.opaque === true, ...frameField(p) });
      received = fromBase64(payload.base64);
      lastOpaque = payload.opaque === true;
      lastFrame = payload.frame !== false;
      entries += 1;
      Object.assign(ds, {
        annotation: "1",
        pointeur: "draw",
        annotationRecu: String(received?.length ?? 0),
        annotationEntrees: String(entries),
        annotationOpaque: lastOpaque ? "1" : "0",
        annotationCadre: lastFrame ? "1" : "0",
        annotationBande: `${p.dock}:${p.thickness}`,
      });
      return screen;
    },
    async load(p) {
      log.push(`load ${p.opaque ? "opaque" : "transparent"}`);
      const payload = jsonChannel<DocumentPayload>({ base64: toBase64(p.document), opaque: p.opaque, ...frameField(p) });
      received = fromBase64(payload.base64);
      lastOpaque = payload.opaque === true;
      lastFrame = payload.frame !== false;
      Object.assign(ds, { annotationRecu: String(received?.length ?? 0), annotationOpaque: lastOpaque ? "1" : "0", annotationCadre: lastFrame ? "1" : "0" });
    },
```

```ts
    async place(p: AnnotationPlace) {
      const screen = clamp(p.screen);
      log.push(`place ${screen}`);
      ds["annotationBande"] = `${p.dock}:${p.thickness}`;
      return screen;
    },
```

  et, après `captures: () => captures,` : `frame: () => lastFrame,`. Relancer : vert.

- [ ] **Étape 8 : page `annotate` et élément du cadre (rouge puis vert).** Dans `annotation-page.test.ts`, `setup` :
  ajouter `const frames: boolean[] = [];` en tête, la dépendance `frame: (on) => void frames.push(on),` dans l'objet de
  `createAnnotationPage`, et `frames` dans l'objet rendu. Ajouter :

```ts
  it("design-l4 (L4-13) : chaque document applique son cadre ; absent : affiché ; illisible : rien", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { page, c, frames } = setup();
    await page.start();
    c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    c.send(ANNOTATION_EVENTS.document, { base64: blank(), frame: false });
    await flush();
    c.send(ANNOTATION_EVENTS.document, { base64: "@@@" });
    await flush();
    c.send(ANNOTATION_EVENTS.document, { base64: blank(), frame: true });
    await flush();
    expect(frames).toEqual([true, false, true]);
    warn.mockRestore();
  });
```

  Créer `apps/web/src/app/annotation-frame.test.ts` :

```ts
// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { mountAnnotationFrame } from "./annotation-page";

afterEach(() => {
  for (const el of document.querySelectorAll(".rb-annot-frame")) el.remove();
  delete document.documentElement.dataset["cadre"];
});

describe("cadre de la fenêtre annotate (design-l4, L4-12)", () => {
  it("L4-12 : un div.rb-annot-frame caché aux lecteurs d'écran, dans body ; data-cadre suit l'appel", () => {
    const set = mountAnnotationFrame(document);
    const els = document.querySelectorAll(".rb-annot-frame");
    expect(els).toHaveLength(1);
    expect(els[0]!.getAttribute("aria-hidden")).toBe("true");
    expect(els[0]!.parentElement).toBe(document.body);
    set(true);
    expect(document.documentElement.dataset["cadre"]).toBe("1");
    set(false);
    expect(document.documentElement.dataset["cadre"]).toBe("0");
  });
});
```

  Dans `rb-css.test.ts`, ajouter en fin de fichier :

```ts
describe("rb.css (design-l4, L4-12)", () => {
  it("L4-12 : cadre de l'annotation 3 px violet 600, fixe sur toute la fenêtre, inerte, montré par html[data-cadre=\"1\"]", () => {
    expect(rule(".rb-annot-frame")).toMatch(/display: none;.*position: fixed;.*inset: 0;.*box-shadow: inset 0 0 0 3px var\(--rf-violet-600\);.*pointer-events: none;/);
    expect(rule('html[data-cadre="1"] .rb-annot-frame')).toContain("display: block;");
  });
});
```

  Lancer les trois fichiers (journal `T2-page.log`) : rouge. Puis `annotation-page.ts` : dans `AnnotationPageDeps`,
  après `ignore` :

```ts
  /** design-l4 (L4-12, L4-13) : cadre violet montré (vrai) ou caché, appliqué à chaque document reçu ; absent : rien. */
  frame?(on: boolean): void;
```

  dans `load`, juste après le `return` du base64 illisible : `d.frame?.(p?.frame !== false);` ; après `viewMatrix` :

```ts
/** design-l4 (L4-12) : cadre violet de la fenêtre `annotate`, élément du DOM (jamais un élément du document : il
 *  n'entre ni dans l'encre ni dans la capture, L4-15) ; rend la fonction qui le montre ou le cache (`html[data-cadre]`). */
export function mountAnnotationFrame(doc: Document): (on: boolean) => void {
  const el = doc.createElement("div");
  el.className = "rb-annot-frame";
  el.setAttribute("aria-hidden", "true");
  doc.body.append(el);
  return (on) => {
    doc.documentElement.dataset["cadre"] = on ? "1" : "0";
  };
}
```

  `annotate-start.ts` : import `import { createAnnotationPage, mountAnnotationFrame } from "./app/annotation-page";` ;
  après `root.append(stages);` :

```ts
  // design-l4 (L4-12) : cadre violet de 3 px, élément du DOM de cette fenêtre ; montré ou caché par chaque document reçu.
  const frame = mountAnnotationFrame(document);
```

  et `frame,` dans l'objet passé à `createAnnotationPage` (après `ignore`). `rb.css`, après la règle
  `html[data-fenetre="annotation"] .rb-stages` (`:79`) :

```css
/* design-l4 (L4-12, Q4) : cadre violet de la fenêtre annotate, 3 px au bord intérieur ; ne prend aucun clic ; montré par html[data-cadre="1"]. */
.rb-annot-frame { display: none; position: fixed; inset: 0; z-index: 5; box-shadow: inset 0 0 0 3px var(--rf-violet-600); pointer-events: none; }
html[data-cadre="1"] .rb-annot-frame { display: block; }
```

  Relancer : vert.

- [ ] **Étape 9 : faux contrôleur d'`App.test.tsx`** (retouche de forme, typage) : dans `fakeAnnotationUi`, après
  `toggle: vi.fn(async () => undefined),` ajouter `pointer: vi.fn(async () => undefined),`.

- [ ] **Étape 10 : tous les fichiers et tsc** — commande bornée de la section, puis
  `cd /home/adminjd/projets/roomboard-wt/design-l4--T2 && export TMPDIR=$HOME/.cache/tmp/of48-tmp && nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit > "$TMPDIR/T2-tsc.log" 2>&1; echo "tsc code $?"; tail -20 "$TMPDIR/T2-tsc.log"`
  Attendu : preuve de la section ; `tsc code 0`.

- [ ] **Étape 11 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l4--T2
git add apps/web/src/platform/annotation-port.ts
git add apps/web/src/app/annotation.ts
git add apps/web/src/app/annotation.test.ts
git add apps/web/src/app/toolbar-host.ts
git add apps/web/src/app/toolbar-host.test.ts
git add apps/web/src/platform/annotation-fake.ts
git add apps/web/src/platform/annotation-fake.test.ts
git add apps/web/src/platform/annotation-tauri.ts
git add apps/web/src/platform/annotation-tauri.test.ts
git add apps/web/src/app/annotation-page.ts
git add apps/web/src/app/annotation-page.test.ts
git add apps/web/src/app/annotation-frame.test.ts
git add apps/web/src/annotate-start.ts
git add apps/web/src/ui/rb.css
git add apps/web/src/ui/rb-css.test.ts
git add apps/web/src/ui/App.test.tsx
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(annotation): idempotent pointer(mode), frame setting in the document payload, sent hook, annotate frame element" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport de la tâche : nombre de tests par fichier, ligne `Réutilisation : …`, et la confirmation que
`annotation-tauri.test.ts:62`, `:188`, `:191` sont verts sans retouche.

---

### Tâche T3 — Réglage de l'appareil et bouton du cadre
<a id="tache-t3"></a>

**Objectif.** Module neuf `device-settings.ts` (cadrage L4-14) : le cadre de l'annotation, gardé sur l'appareil sous la
clé `roomboard.annotation.cadre` (`"non"` seulement quand il est masqué) ; bouton `data-reglage="cadre"` dans le panneau
Réglages quand on lui donne ces réglages (H10 : l'application ne les donne qu'avec la capacité d'annotation, T7).

**Fichiers.**
- Créer : `apps/web/src/device-settings.ts`, `apps/web/src/device-settings.test.ts`
- Modifier : `apps/web/src/ui/SettingsPanel.tsx` (`:1`, `:14-25`, `:29-31`, `:51-67`), `apps/web/src/ui/SettingsPanel.test.tsx`
  (`setup`, describe ajouté)

**Interfaces.**
- Consomme : `type KeyValue` (`apps/web/src/profile-store.ts:4`).
- Produit :
  - `export const FRAME_KEY = "roomboard.annotation.cadre"`
  - `export interface DeviceSettings { frame(): boolean; setFrame(on: boolean): boolean; onChange(cb: () => void): () => void }`
    (`setFrame` rend vrai si le choix est gardé sur l'appareil, faux en mémoire seule)
  - `export function createDeviceSettings(kv: KeyValue | null): DeviceSettings`
  - `SettingsPanelProps.device?: DeviceSettings` ; `export const FRAME_LABELS = { on: "Cadre de l'annotation : affiché", off: "Cadre de l'annotation : masqué" }`
- Réutilise : `apps/web/src/app/library.ts:374` (`SHARED_FOLDER_KEY`, patron d'un réglage gardé sur l'appareil, `kv`
  injecté, `null` : mémoire) ; `apps/web/src/profile-store.ts:4` — `interface KeyValue { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }`,
  `:149` — `browserKeyValue(w: { readonly localStorage?: Storage }): KeyValue | null` (branché par T7, même `settingsKv` que
  `main.ts:250`). `createSharedFolder` n'est pas substituable (propre au dossier et à sa boîte).
- Réutilise : `apps/web/src/ui/SettingsPanel.tsx:29` — `SettingsPanel(props: SettingsPanelProps): JSX.Element`, étendu
  par `SettingsPanelProps.device?: { frame(): boolean; setFrame(on: boolean): boolean; onChange(cb: () => void): () => void }`.
- Rapport : `Réutilisation : appelé profile-store.ts (KeyValue), patron library.ts:374` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/design-l4--T3 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of48-tmp CARGO_BUILD_JOBS=4 CARGO_TARGET_DIR=/home/adminjd/projets/roomboard-wt/design-l4--T3/target && mkdir -p "$TMPDIR" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/device-settings.test.ts src/ui/SettingsPanel.test.tsx --reporter=verbose > "$TMPDIR/T3-vitest.log" 2>&1; echo "code $?"; grep -E "✓|×|FAIL |Test Files|Tests " "$TMPDIR/T3-vitest.log" | tail -40`
Preuve : `code 0`, `Test Files  2 passed (2)`, ≥ 6 lignes `réglages de l'appareil`, lignes `cadre de l'annotation`
présentes, aucun `×`.

**Preuve visuelle.** Aucune dans la tâche (S3 joué par T8).

**Contraintes (recopiées).** G1 test rouge d'abord, aucun test supprimé, désactivé ou sauté, aucun seuil changé ·
G2 aucune dépendance ajoutée · G4 retouche de forme admise : `setup` de `SettingsPanel.test.tsx` (paramètre `device`
ajouté) ; toute autre rougeur arrête la tâche · G6 `nice -n 10`,
`CARGO_TARGET_DIR=/home/adminjd/projets/roomboard-wt/design-l4--T3/target`, tests isolés sans `suite-vm` · G7 sorties dans
`$HOME/.cache/tmp/of48-tmp/T3-*` · G8 auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé
par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un, aucun push · G9 `SettingsPanel.tsx`
sans `localStorage`, `switch (`, `\d+px` (le stockage vit dans `device-settings.ts`, hors de `src/ui`) · G12 libellés
exacts « Cadre de l'annotation : affiché » / « Cadre de l'annotation : masqué ».

**Interdits.** Ne pas lire `localStorage` directement (toujours `KeyValue` injecté) ; ne rien mettre dans le profil ni
dans `engine/settings.ts` (L4-14) ; ne pas toucher `App.tsx` ni `main.ts` (T7).

**Terminé quand.** Les deux fichiers passent, `tsc` rend 0, commit fait.

- [ ] **Étape 0 : préparer le worktree** —
  `cd /home/adminjd/projets/roomboard-wt/design-l4--T3 && mkdir -p $HOME/.cache/tmp/of48-tmp && (test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile > $HOME/.cache/tmp/of48-tmp/T3-install.log 2>&1) && for d in wasm wasm-formats; do test -d apps/web/src/$d || cp -r /home/adminjd/projets/roomboard-wt/design-l4/apps/web/src/$d apps/web/src/$d; done && ls apps/web/src/wasm/roomboard_wasm.d.ts`

- [ ] **Étape 1 : tests du module (rouges).** Créer `apps/web/src/device-settings.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import { createDeviceSettings, FRAME_KEY } from "./device-settings";
import type { KeyValue } from "./profile-store";

function memoryKv(init: Record<string, string> = {}): KeyValue & { readonly map: Map<string, string> } {
  const map = new Map(Object.entries(init));
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
}
const throwing: KeyValue = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
  removeItem: () => {
    throw new Error("SecurityError");
  },
};

describe("réglages de l'appareil (design-l4, L4-14)", () => {
  it("réglages de l'appareil : clé roomboard.annotation.cadre ; absente : cadre affiché", () => {
    expect(FRAME_KEY).toBe("roomboard.annotation.cadre");
    expect(createDeviceSettings(memoryKv()).frame()).toBe(true);
  });
  it("réglages de l'appareil : masquer écrit « non », réafficher retire la clé ; relu par une nouvelle instance (rechargement)", () => {
    const kv = memoryKv();
    const s = createDeviceSettings(kv);
    expect(s.setFrame(false)).toBe(true);
    expect(kv.map.get(FRAME_KEY)).toBe("non");
    expect(createDeviceSettings(kv).frame()).toBe(false);
    expect(s.setFrame(true)).toBe(true);
    expect(kv.map.has(FRAME_KEY)).toBe(false);
    expect(createDeviceSettings(kv).frame()).toBe(true);
  });
  it("réglages de l'appareil : valeur inconnue (« oui », vide) : affiché", () => {
    expect(createDeviceSettings(memoryKv({ [FRAME_KEY]: "oui" })).frame()).toBe(true);
    expect(createDeviceSettings(memoryKv({ [FRAME_KEY]: "" })).frame()).toBe(true);
  });
  it("réglages de l'appareil : onChange prévenu à chaque setFrame ; désabonnement", () => {
    const s = createDeviceSettings(memoryKv());
    const cb = vi.fn();
    const off = s.onChange(cb);
    s.setFrame(false);
    s.setFrame(true);
    off();
    s.setFrame(false);
    expect(cb).toHaveBeenCalledTimes(2);
  });
  it("réglages de l'appareil : sans stockage (null) : mémoire seule, setFrame rend faux", () => {
    const s = createDeviceSettings(null);
    expect(s.frame()).toBe(true);
    expect(s.setFrame(false)).toBe(false);
    expect(s.frame()).toBe(false);
  });
  it("réglages de l'appareil : stockage qui lève : affiché par défaut, choix gardé en mémoire, setFrame rend faux, rien ne lève", () => {
    const s = createDeviceSettings(throwing);
    expect(s.frame()).toBe(true);
    expect(() => s.setFrame(false)).not.toThrow();
    expect(s.setFrame(false)).toBe(false);
    expect(s.frame()).toBe(false);
  });
});
```

- [ ] **Étape 2 : vérifier le rouge** — commande bornée de la section. Attendu : `code 1`, `Failed to resolve import "./device-settings"`.

- [ ] **Étape 3 : implémenter** `apps/web/src/device-settings.ts` :

```ts
import type { KeyValue } from "./profile-store";

// Réglages de l'appareil (cadrage design-l4, L4-14, Q4) : gardés sur le poste (stockage local), jamais dans le profil
// ni dans l'adresse. Patron du dossier partagé de la bibliothèque (`app/library.ts:374`) : `kv` injecté, `null` :
// mémoire seule. Clés `roomboard.<zone>.<réglage>`.

/** Cadre violet de l'annotation : « non » quand il est masqué ; absente (ou toute autre valeur) : affiché. */
export const FRAME_KEY = "roomboard.annotation.cadre";
const FRAME_HIDDEN = "non";

export interface DeviceSettings {
  /** Cadre de l'annotation affiché (L4-12). */
  frame(): boolean;
  /** Vrai si le choix est gardé sur l'appareil ; faux : mémoire seule (aucun stockage, ou stockage qui refuse). */
  setFrame(on: boolean): boolean;
  onChange(cb: () => void): () => void;
}

function readFrame(kv: KeyValue | null): boolean {
  try {
    return kv?.getItem(FRAME_KEY) !== FRAME_HIDDEN;
  } catch {
    return true;
  }
}

export function createDeviceSettings(kv: KeyValue | null): DeviceSettings {
  let frame = readFrame(kv);
  const listeners = new Set<() => void>();
  return {
    frame: () => frame,
    setFrame(on) {
      frame = on;
      let kept = false;
      if (kv !== null) {
        try {
          if (on) kv.removeItem(FRAME_KEY);
          else kv.setItem(FRAME_KEY, FRAME_HIDDEN);
          kept = true;
        } catch {
          kept = false;
        }
      }
      for (const cb of [...listeners]) cb();
      return kept;
    },
    onChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
  };
}
```

- [ ] **Étape 4 : tests du panneau (rouges).** Dans `SettingsPanel.test.tsx` : importer
  `import { createDeviceSettings, type DeviceSettings } from "../device-settings";` et `FRAME_LABELS` depuis
  `./SettingsPanel` ; `setup` reçoit `device?: DeviceSettings` dans `over` et passe
  `{...(over.device ? { device: over.device } : {})}` à `<SettingsPanel …/>`. Ajouter :

```tsx
describe("SettingsPanel : cadre de l'annotation (design-l4, L4-14, H10)", () => {
  it("cadre de l'annotation : sans device, aucun bouton data-reglage=cadre", () => {
    const { r } = setup();
    expect(r.container.querySelector('button[data-reglage="cadre"]')).toBeNull();
  });
  it("cadre de l'annotation : « affiché » ; un clic → « masqué » et setFrame(false) ; un autre → « affiché »", () => {
    const device = createDeviceSettings(null);
    const { btn } = setup({ device });
    expect(btn("cadre").textContent).toBe(FRAME_LABELS.on);
    expect(FRAME_LABELS).toEqual({ on: "Cadre de l'annotation : affiché", off: "Cadre de l'annotation : masqué" });
    fireEvent.click(btn("cadre"));
    expect(device.frame()).toBe(false);
    expect(btn("cadre").textContent).toBe(FRAME_LABELS.off);
    fireEvent.click(btn("cadre"));
    expect(device.frame()).toBe(true);
    expect(btn("cadre").textContent).toBe(FRAME_LABELS.on);
  });
  it("cadre de l'annotation : un changement venu d'ailleurs (onChange) est suivi", () => {
    const device = createDeviceSettings(null);
    const { btn } = setup({ device });
    device.setFrame(false);
    expect(btn("cadre").textContent).toBe(FRAME_LABELS.off);
  });
});
```

  Lancer la commande bornée : rouge (`FRAME_LABELS` indéfini, bouton absent).

- [ ] **Étape 5 : implémenter le bouton.** `SettingsPanel.tsx` : import `createSignal, For, onCleanup, Show, type Accessor, type JSX`
  depuis `solid-js` ; `import type { DeviceSettings } from "../device-settings";` ; après `RELOAD_DIRTY_MESSAGE` :

```tsx
/** design-l4 (L4-14) : libellés du bouton du cadre de l'annotation. */
export const FRAME_LABELS = Object.freeze({ on: "Cadre de l'annotation : affiché", off: "Cadre de l'annotation : masqué" });
```

  dans `SettingsPanelProps`, après `confirm` :

```tsx
  /** design-l4 (L4-14) : réglages de l'appareil ; donnés seulement avec la capacité d'annotation (H10) ; absents : aucun
   *  bouton du cadre. */
  readonly device?: DeviceSettings;
```

  dans le corps, après `onCleanup(props.store.onChange(setSettings));` :

```tsx
  const device = props.device;
  const [frame, setFrameShown] = createSignal(device?.frame() ?? true);
  if (device !== undefined) onCleanup(device.onChange(() => setFrameShown(device.frame())));
```

  et dans le JSX, après le `</For>` des réglages du moteur :

```tsx
      <Show when={device}>
        {(dev) => (
          <button type="button" data-reglage="cadre" onClick={() => void dev().setFrame(!dev().frame())}>
            {frame() ? FRAME_LABELS.on : FRAME_LABELS.off}
          </button>
        )}
      </Show>
```

- [ ] **Étape 6 : vérifier le vert** — commande bornée. Attendu : preuve de la section ; « groupe étiqueté avec un bouton
  par réglage » toujours vert.

- [ ] **Étape 7 : tsc** —
  `cd /home/adminjd/projets/roomboard-wt/design-l4--T3 && export TMPDIR=$HOME/.cache/tmp/of48-tmp && nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit > "$TMPDIR/T3-tsc.log" 2>&1; echo "tsc code $?"; tail -20 "$TMPDIR/T3-tsc.log"`
  Attendu : `tsc code 0`.

- [ ] **Étape 8 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l4--T3
git add apps/web/src/device-settings.ts
git add apps/web/src/device-settings.test.ts
git add apps/web/src/ui/SettingsPanel.tsx
git add apps/web/src/ui/SettingsPanel.test.tsx
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(settings): device settings with the annotation frame toggle" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport de la tâche : nombre de tests, ligne `Réutilisation : …`.

---

### Tâche T4 — Bandeau « Envoyé au tableau » et source unique du texte
<a id="tache-t4"></a>

**Objectif.** Module neuf `ui/toast.ts` (un avis à la fois, signal de module, 4 s) et composant `Toasts` (cadrage L4-16) ;
une seule source du texte de l'avis d'envoi dans `annotation-port.ts` : `SENT_TO_BOARD`, dont dérivent
`sentToBoardMessage` (inchangé à l'octet) et `sentToBoardToast`. Le branchement dans l'application est T7.

**Fichiers.**
- Créer : `apps/web/src/ui/toast.ts`, `apps/web/src/ui/toast.test.ts`, `apps/web/src/ui/Toasts.tsx`, `apps/web/src/ui/Toasts.test.tsx`
- Modifier : `apps/web/src/platform/annotation-port.ts` (`:11`, `:47-48`), `apps/web/src/platform/annotation-port.test.ts` (import, describe ajouté)

**Interfaces.**
- Consomme : `Icon(props: { name: string }): JSX.Element` (`apps/web/src/ui/IconButton.tsx:20`) ; nom d'icône `"check"`
  (ajouté à `ICONS` par T5, en parallèle : le test ne lit que `data-icon`).
- Produit :
  - `export interface ToastMessage { readonly text: string; readonly strong?: string }`
  - `export const TOAST_MS = 4000` ; `export function showToast(m: ToastMessage, ms?: number): void` ;
    `export function clearToast(): void` ; `export const currentToast: Accessor<ToastMessage | null>`
  - `export function Toasts(): JSX.Element` — `div.rb-toasts[role="status"]` toujours monté ; `.rb-toast` avec
    `.rb-toast-ok` (icône `check`), `[data-toast-text]`, `<b>` ; largeur posée en px entiers.
  - `export const SENT_TO_BOARD = "envoyé au tableau"` ; `sentToBoardMessage(n: number): string` (inchangé) ;
    `export const sentToBoardToast = (n: number): ToastMessage`
- Réutilise : `ShellPort.notify` (`apps/web/src/platform/files.ts:129`) — boîte modale (`shell-web.ts:23`,
  `host-tauri.ts:249`), **non substituable** : module neuf `ui/toast.ts` sur le patron du signal de module de
  `apps/web/src/ui/tooltip.ts:27` ; `AnnotationDeps.sent?(page: number): void` (posé par T2) le déclenchera (T7).
- Rapport : `Réutilisation : appelé IconButton.tsx (Icon), patron tooltip.ts` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/design-l4--T4 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of48-tmp CARGO_BUILD_JOBS=4 CARGO_TARGET_DIR=/home/adminjd/projets/roomboard-wt/design-l4--T4/target && mkdir -p "$TMPDIR" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/toast.test.ts src/ui/Toasts.test.tsx src/platform/annotation-port.test.ts src/ui/Toolbar.test.tsx -t "bandeau|avis|aucun switch|contrat" --reporter=verbose > "$TMPDIR/T4-vitest.log" 2>&1; echo "code $?"; grep -E "✓|×|FAIL |Test Files|Tests " "$TMPDIR/T4-vitest.log" | tail -40`
Preuve : `code 0` ; ≥ 3 lignes `bandeau (toast.ts)`, ≥ 4 lignes `bandeau (Toasts)`, la ligne `avis d'envoi`, la ligne
`aucun switch sur l'identifiant` (garde de `src/ui`, qui lit aussi `toast.ts` et `Toasts.tsx`) ; aucun `×`.

**Preuve visuelle.** Aucune dans la tâche (S4 et S5 joués par T8, recadrage du bandeau par T9).

**Contraintes (recopiées).** G1 test rouge d'abord, aucun test supprimé, désactivé ou sauté, aucun seuil changé ·
G2 aucune dépendance ajoutée · G4 aucun test existant retouché · G6 `nice -n 10`,
`CARGO_TARGET_DIR=/home/adminjd/projets/roomboard-wt/design-l4--T4/target`, tests isolés sans `suite-vm` · G7 sorties dans
`$HOME/.cache/tmp/of48-tmp/T4-*` · G8 auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé
par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un, aucun push · G9 `toast.ts` et
`Toasts.tsx` sans `switch (`, `localStorage`, `innerHTML` ; `Toasts.tsx` sans `\d+px` · G12 `sentToBoardMessage(n)`
inchangé à l'octet ; bandeau « Envoyé au tableau : » + « page N ».

**Interdits.** Aucune règle CSS ici (T7 possède les règles du bandeau) ; ne pas toucher `annotation.ts` ni `App.tsx` ;
aucun autre avis transformé en bandeau (H5).

**Terminé quand.** Les tests passent, `tsc` rend 0, commit fait.

- [ ] **Étape 0 : préparer le worktree** —
  `cd /home/adminjd/projets/roomboard-wt/design-l4--T4 && mkdir -p $HOME/.cache/tmp/of48-tmp && (test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile > $HOME/.cache/tmp/of48-tmp/T4-install.log 2>&1) && for d in wasm wasm-formats; do test -d apps/web/src/$d || cp -r /home/adminjd/projets/roomboard-wt/design-l4/apps/web/src/$d apps/web/src/$d; done && ls apps/web/src/wasm/roomboard_wasm.d.ts`

- [ ] **Étape 1 : tests (rouges).** `apps/web/src/ui/toast.test.ts` :

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearToast, currentToast, showToast, TOAST_MS } from "./toast";

afterEach(() => {
  clearToast();
  vi.useRealTimers();
});

describe("bandeau (toast.ts, design-l4, L4-16)", () => {
  it("bandeau (toast.ts) : montré 4 s par défaut, puis effacé", () => {
    vi.useFakeTimers();
    expect(TOAST_MS).toBe(4000);
    showToast({ text: "Envoyé au tableau :", strong: "page 2" });
    expect(currentToast()).toEqual({ text: "Envoyé au tableau :", strong: "page 2" });
    vi.advanceTimersByTime(TOAST_MS - 1);
    expect(currentToast()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(currentToast()).toBeNull();
  });
  it("bandeau (toast.ts) : un seul à la fois ; le suivant remplace le premier et repart pour sa durée", () => {
    vi.useFakeTimers();
    showToast({ text: "a" });
    vi.advanceTimersByTime(3000);
    showToast({ text: "b" }, 1000);
    expect(currentToast()).toEqual({ text: "b" });
    vi.advanceTimersByTime(999);
    expect(currentToast()).toEqual({ text: "b" });
    vi.advanceTimersByTime(1);
    expect(currentToast()).toBeNull();
  });
  it("bandeau (toast.ts) : clearToast efface tout de suite ; le minuteur effacé ne touche pas l'avis suivant", () => {
    vi.useFakeTimers();
    showToast({ text: "a" });
    clearToast();
    expect(currentToast()).toBeNull();
    showToast({ text: "b" }, 10000);
    vi.advanceTimersByTime(TOAST_MS);
    expect(currentToast()).toEqual({ text: "b" });
  });
});
```

  `apps/web/src/ui/Toasts.test.tsx` :

```tsx
// @vitest-environment happy-dom
import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearToast, showToast } from "./toast";
import { Toasts } from "./Toasts";

afterEach(() => {
  cleanup();
  clearToast();
  vi.restoreAllMocks();
});

describe("bandeau (Toasts, design-l4, L4-16)", () => {
  it("bandeau (Toasts) : vide, un conteneur role=status, aucun .rb-toast", () => {
    const { container } = render(() => <Toasts />);
    expect(container.querySelector(".rb-toasts")?.getAttribute("role")).toBe("status");
    expect(container.querySelector(".rb-toast")).toBeNull();
  });
  it("bandeau (Toasts) : pastille check, texte, puis « page N » en gras ; textContent lisible d'un tenant", () => {
    const { container } = render(() => <Toasts />);
    showToast({ text: "Envoyé au tableau :", strong: "page 2" });
    const t = container.querySelector(".rb-toast")!;
    expect(t.querySelector(".rb-toast-ok svg.rb-icon")?.getAttribute("data-icon")).toBe("check");
    expect(t.querySelector(".rb-toast-ok")?.getAttribute("aria-hidden")).toBe("true");
    expect(t.querySelector("[data-toast-text]")?.textContent).toBe("Envoyé au tableau :");
    expect(t.querySelector("b")?.textContent).toBe("page 2");
    expect(t.textContent).toBe("Envoyé au tableau : page 2");
  });
  it("bandeau (Toasts) : remplacé par le suivant, effacé par clearToast ; sans partie en gras, aucun <b>", () => {
    const { container } = render(() => <Toasts />);
    showToast({ text: "a", strong: "1" });
    showToast({ text: "b" });
    expect(container.querySelectorAll(".rb-toast")).toHaveLength(1);
    expect(container.querySelector(".rb-toast")?.textContent).toBe("b");
    expect(container.querySelector(".rb-toast b")).toBeNull();
    clearToast();
    expect(container.querySelector(".rb-toast")).toBeNull();
  });
  it("bandeau (Toasts) : largeur posée en px entiers (icône calée sur la grille de pixels, § 10)", () => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, top: 0, left: 0, right: 211.4, bottom: 56, width: 211.4, height: 56, toJSON: () => ({}) } as DOMRect);
    const { container } = render(() => <Toasts />);
    showToast({ text: "Envoyé au tableau :", strong: "page 2" });
    expect(container.querySelector<HTMLElement>(".rb-toast")!.style.inlineSize).toBe("212px");
  });
});
```

  Dans `annotation-port.test.ts` : ajouter `SENT_TO_BOARD` et `sentToBoardToast` à l'import, et :

```ts
describe("avis d'envoi (C11b P12, design-l4 L4-16)", () => {
  it("avis d'envoi : une seule source ; boîte inchangée à l'octet ; bandeau « Envoyé au tableau : » + « page N »", () => {
    expect(SENT_TO_BOARD).toBe("envoyé au tableau");
    expect(sentToBoardMessage(2)).toBe("envoyé au tableau : page 2");
    expect(sentToBoardToast(2)).toEqual({ text: "Envoyé au tableau :", strong: "page 2" });
    const t = sentToBoardToast(12);
    expect(`${t.text} ${t.strong}`.toLowerCase()).toBe(sentToBoardMessage(12));
  });
});
```

- [ ] **Étape 2 : vérifier le rouge** — commande bornée de la section. Attendu : `code 1`, imports `./toast`,
  `./Toasts`, `SENT_TO_BOARD` introuvables.

- [ ] **Étape 3 : implémenter** `apps/web/src/ui/toast.ts` :

```ts
import { createSignal, type Accessor } from "solid-js";

// Avis non modal (cadrage design-l4, L4-16) : un seul à la fois pour toute la page, comme l'infobulle (`tooltip.ts`) ;
// montré `TOAST_MS`, remplacé par le suivant, effacé à l'entrée en annotation (`App.tsx`). Aucune boîte : il n'arrête rien.

export interface ToastMessage {
  readonly text: string;
  /** Partie en gras après le texte (« page N »). */
  readonly strong?: string;
}

export const TOAST_MS = 4000;

const [current, setCurrent] = createSignal<ToastMessage | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

/** Avis montré ; null : aucun. */
export const currentToast: Accessor<ToastMessage | null> = current;

const stop = (): void => {
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
};

/** Montre `m` pendant `ms` (copie : un avis identique remonte le bandeau). */
export function showToast(m: ToastMessage, ms: number = TOAST_MS): void {
  stop();
  setCurrent({ ...m });
  timer = setTimeout(() => {
    timer = undefined;
    setCurrent(null);
  }, ms);
}

export function clearToast(): void {
  stop();
  setCurrent(null);
}
```

  `apps/web/src/ui/Toasts.tsx` :

```tsx
import { Show, onMount, type JSX } from "solid-js";
import { Icon } from "./IconButton";
import { currentToast, type ToastMessage } from "./toast";

/** Icône de la pastille (Lucide check, maquette 02 `i-check`). */
const TOAST_ICON = "check";

function Toast(props: { message: ToastMessage }): JSX.Element {
  let el: HTMLDivElement | undefined;
  // § 10 : le bandeau est calé à droite ; sa largeur, donnée par le texte, est fractionnaire et déplaçait la pastille
  // hors de la grille de pixels. Largeur arrondie au px CSS supérieur : bord gauche, pastille et icône entiers.
  onMount(() => {
    const w = el?.getBoundingClientRect().width ?? 0;
    if (el !== undefined && w > 0) el.style.inlineSize = `${Math.ceil(w)}px`;
  });
  return (
    <div class="rb-toast" ref={el}>
      <span class="rb-toast-ok" aria-hidden="true">
        <Icon name={TOAST_ICON} />
      </span>
      <span class="rb-toast-text">
        <span data-toast-text>{props.message.text}</span>
        <Show when={props.message.strong}>
          {(s) => (
            <>
              {" "}
              <b>{s()}</b>
            </>
          )}
        </Show>
      </span>
    </div>
  );
}

/** Bandeau des avis non modaux (design-l4, L4-16) : conteneur `role="status"` toujours monté, un avis à la fois. */
export function Toasts(): JSX.Element {
  return (
    <div class="rb-toasts" role="status">
      <Show when={currentToast()} keyed>
        {(m) => <Toast message={m} />}
      </Show>
    </div>
  );
}
```

  `annotation-port.ts` : ajouter `import type { ToastMessage } from "../ui/toast";` près de l'import de `ToolbarView` ;
  remplacer les lignes 47-48 par :

```ts
/** C11b (P12), design-l4 (L4-16) : une seule source du texte de l'avis d'envoi, en boîte et en bandeau. */
export const SENT_TO_BOARD = "envoyé au tableau";
/** C11b (P12) : rang de la page insérée dans l'onglet cible. */
export const sentToBoardMessage = (n: number): string => `${SENT_TO_BOARD} : page ${n}`;
/** design-l4 (L4-16) : même texte dans le bandeau, majuscule en tête, « page N » en gras. */
export const sentToBoardToast = (n: number): ToastMessage => ({
  text: `${SENT_TO_BOARD.charAt(0).toUpperCase()}${SENT_TO_BOARD.slice(1)} :`,
  strong: `page ${n}`,
});
```

- [ ] **Étape 4 : vérifier le vert** — commande bornée. Attendu : preuve de la section.

- [ ] **Étape 5 : tsc** —
  `cd /home/adminjd/projets/roomboard-wt/design-l4--T4 && export TMPDIR=$HOME/.cache/tmp/of48-tmp && nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit > "$TMPDIR/T4-tsc.log" 2>&1; echo "tsc code $?"; tail -20 "$TMPDIR/T4-tsc.log"`
  Attendu : `tsc code 0`.

- [ ] **Étape 6 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l4--T4
git add apps/web/src/ui/toast.ts
git add apps/web/src/ui/toast.test.ts
git add apps/web/src/ui/Toasts.tsx
git add apps/web/src/ui/Toasts.test.tsx
git add apps/web/src/platform/annotation-port.ts
git add apps/web/src/platform/annotation-port.test.ts
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(ui): non-modal toast and single source for the sent-to-board text" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport de la tâche : nombre de tests, ligne `Réutilisation : …`.

---

### Tâche T5 — Barre : commande segmentée, boutons pleins, zone à icône, icônes, colonne
<a id="tache-t5"></a>

**Objectif.** Rendu de la barre (cadrage L4-4 pour `CONTEXT_ROLES`, L4-7 bis, L4-8, L4-10, L4-11, L4-17) :
`annotation-pointer` rendu par une commande segmentée `PointerSwitch` branchée par la table `ACTION_RENDER` ; boutons
pleins accolés pour l'envoi ; zone de dépôt à icône `drop` avec l'infobulle de L1 ; icônes `check` et `drop` ; règles
CSS (segment, boutons pleins, zone, colonne). Les profils livrés ne changent pas ici (T6).

**Fichiers.**
- Créer : `apps/web/src/ui/PointerSwitch.tsx`, `apps/web/src/ui/PointerSwitch.test.tsx`
- Modifier : `apps/web/src/ui/Toolbar.tsx` (`:1-26`, `:48-86`, `:196`), `apps/web/src/ui/Toolbar.test.tsx` (import,
  describe ajouté en fin), `apps/web/src/ui/IconButton.tsx` (`:42`), `apps/web/src/ui/icons.ts` (fin de `ICONS`),
  `apps/web/src/ui/icons.test.ts` (`:23-27`, fonction et test ajoutés), `THIRD_PARTY_NOTICES.md` (`:511-525`),
  `apps/web/src/ui/rb.css` (`:60`, `:66`), `apps/web/src/ui/rb-css.test.ts` (fin)

**Interfaces.**
- Consomme (T1) : `ANNOTATION_ROLE` (`toolbar.ts`). Consomme (T2) : `ToolbarHost.pointer?(mode: PointerMode): void`
  (`app/toolbar-host.ts`), `type PointerMode` (`platform/annotation-port.ts`).
- Produit :
  - `export function PointerSwitch(props: { item: ToolItem; view: Accessor<ToolbarView>; host: ToolbarHost }): JSX.Element`
    — `span.rb-seg` ; deux `IconButton` `data-segment="draw"` puis `"mouse"` ; le segment présent `aria-pressed="true"` ;
    le segment inactif porte `data-item=<item.id>`.
  - `export const POINTER_SEGMENTS: readonly { mode: PointerMode; label: string; icon: string }[]`
  - `Toolbar.tsx` : `ACTION_RENDER: Readonly<Record<ActionId, (item: ToolItem, ctx: Ctx) => JSX.Element>>`,
    `PRIMARY_ACTIONS: ReadonlySet<ActionId>` (classe `rb-primary`), `CONTEXT_ROLES: ReadonlySet<string>` (`tools`, `annotation`)
  - `export function Bubble(props: { label: string; anchor: HTMLElement }): JSX.Element` (`IconButton.tsx`)
  - `ICONS.check`, `ICONS.drop` ; CSS `.rb-seg`, `.rb-primary`, `.rb-drop`
- Réutilise : `apps/web/src/ui/item-state.ts:63` (`ACTION_STATE["annotation-pointer"]`) — `itemState(item: ToolItem, v: ToolbarView): ItemState`
  pour le libellé, l'icône et le grisé du segment inactif (non modifié).
- Réutilise : `apps/web/src/ui/IconButton.tsx:75` — `IconButton(props: IconButtonProps): JSX.Element` ; `:42` — étendu :
  `export function Bubble(props: { label: string; anchor: HTMLElement }): JSX.Element` ; `apps/web/src/ui/tooltip.ts` —
  `createTip(opts?: TipOptions): Tip` pour la zone de dépôt.
- Réutilise : `apps/web/src/ui/icons.ts` — `ICONS`, `iconFor(item: ToolItem, stateIcon?: string): string | null`, étendus
  par les entrées `check` et `drop`.
- Réutilise : commande segmentée — **aucun module existant** (termes `segment`, `radiogroup`, `aria-pressed` cherchés dans
  `ui/` par le cadrage) : module neuf `ui/PointerSwitch.tsx`, branché par `ACTION_RENDER`.
- Rapport : `Réutilisation : appelé item-state.ts (itemState), IconButton.tsx, tooltip.ts (createTip), icons.ts` ou
  `Réutilisation : écart — <pourquoi>`.

**Patron à ne pas reprendre.**
- Un test sur l'identifiant dans `Toolbar.tsx` (`if (item.action === "annotation-pointer")`, ou sur l'id `annotation-pointer-ajout`) :
  la garde `Toolbar.test.tsx:147-159` et G9 l'interdisent ; le branchement passe par `ACTION_RENDER` indexé par l'action.
- Le `Button` unique (`apps/web/src/ui/Toolbar.tsx:48-60`) gardé pour la bascule : un seul bouton ne montre pas l'état
  présent (Q3).
- `data-item` sur les deux segments ou sur le groupe : `c11a-annotation-navigateur.mjs:115-120` et
  `Toolbar.test.tsx:428-435` lisent le bouton qui bascule (H2).

**Chemin de référence.** Table par sorte `RENDER` (`apps/web/src/ui/Toolbar.tsx:71-86`) ; état par action
`ACTION_STATE` (`apps/web/src/ui/item-state.ts:53-67`) ; infobulle d'`IconButton` (`apps/web/src/ui/IconButton.tsx:75-121`).

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/design-l4--T5 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of48-tmp CARGO_BUILD_JOBS=4 CARGO_TARGET_DIR=/home/adminjd/projets/roomboard-wt/design-l4--T5/target && mkdir -p "$TMPDIR" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/PointerSwitch.test.tsx src/ui/Toolbar.test.tsx src/ui/icons.test.ts src/ui/rb-css.test.ts src/ui/IconButton.test.tsx src/ui/item-state.test.ts --reporter=verbose > "$TMPDIR/T5-vitest.log" 2>&1; echo "code $?"; grep -E "×|FAIL |Test Files|Tests |design-l4|48 icônes" "$TMPDIR/T5-vitest.log" | tail -60`
Preuve : `code 0`, `Test Files  6 passed (6)`, ≥ 6 lignes `PointerSwitch (design-l4`, la ligne `ICONS : 48 icônes`, aucun
`×`. Tests à garder verts cités par le cadrage : `Toolbar.test.tsx:46` et `:428-435` (bascule : libellé et icône du
segment inactif), `item-state.test.ts:125-128`, `:172-174`, `Toolbar.test.tsx:403-418` (S4, jamais un bouton vide),
`Toolbar.test.tsx:127-138` (dépôt sur `.rb-drop`).

**Preuve visuelle.** Aucune dans la tâche (profil : aucune automatique) ; netteté et recadrages par T8 (S5) et T9.

**Contraintes (recopiées).** G1 test rouge d'abord, aucun test supprimé, désactivé ou sauté, aucun seuil changé ·
G2 aucune dépendance ajoutée · G3 icônes Lucide (ISC) dans `icons.ts` avec la mention dans `THIRD_PARTY_NOTICES.md` ;
`check` et `drop` recopiées des symboles `i-check`, `i-drop` de `docs/design/maquettes/02-annotation-bureau.html`
(trait 1,5, grille 24, `ICON_VIEWBOX`) · G4 retouche de forme admise : `icons.test.ts:23-27` (D2) ; toute autre rougeur
arrête la tâche · G6 `nice -n 10`, `CARGO_TARGET_DIR=/home/adminjd/projets/roomboard-wt/design-l4--T5/target`, tests isolés
sans `suite-vm` · G7 sorties dans `$HOME/.cache/tmp/of48-tmp/T5-*` · G8 auteur
`jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un, aucun push · G9 `PointerSwitch.tsx`,
`Toolbar.tsx` sans `switch (`, `\d+px`, `localStorage`, `innerHTML` ; branchements par table · G10 aucune
`position: absolute|fixed` dans une règle `.rb-bar` · G12 libellés « Dessin », « Souris ».

**Interdits.** Ne pas toucher `toolbar-profiles.ts`, `App.tsx`, `item-state.ts` ; ne pas changer le libellé ni l'icône
de la sortie (L4-17 : `annotate` enfoncé, « Quitter l'annotation ») ; aucun menu sur le bouton accolé (H3).

**Terminé quand.** Les 6 fichiers passent, `tsc` rend 0, commit fait.

- [ ] **Étape 0 : préparer le worktree** —
  `cd /home/adminjd/projets/roomboard-wt/design-l4--T5 && mkdir -p $HOME/.cache/tmp/of48-tmp && (test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile > $HOME/.cache/tmp/of48-tmp/T5-install.log 2>&1) && for d in wasm wasm-formats; do test -d apps/web/src/$d || cp -r /home/adminjd/projets/roomboard-wt/design-l4/apps/web/src/$d apps/web/src/$d; done && ls apps/web/src/wasm/roomboard_wasm.d.ts`

- [ ] **Étape 1 : icônes (rouge puis vert).** `icons.test.ts` : après `FROM_MOCKUP` et ses voisins, ajouter :

```ts
const MAQUETTE_02 = readFileSync(join(__dirname, "..", "..", "..", "..", "docs", "design", "maquettes", "02-annotation-bureau.html"), "utf8");
/** Symbole `i-<nom>` de la maquette 02 (design-l4), lu comme `IconNode`. */
function symbol02(name: string): IconNode {
  const m = MAQUETTE_02.match(new RegExp(`<symbol id="i-${name}" viewBox="-0\\.25 -0\\.25 24 24">([\\s\\S]*?)</symbol>`));
  if (!m) throw new Error(`symbole absent : i-${name}`);
  return [...m[1]!.matchAll(/<(path|rect|circle|line|polyline|ellipse)\s([^>]*?)\s*\/>/g)].map(([, tag, attrs]) => [
    tag as IconNode[number][0],
    Object.fromEntries([...attrs!.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k!, v!])),
  ]);
}
```

  Retouche de forme (D2) du test `:23-27` : titre `"ICONS : 48 icônes, exactement celles qu'attribuent les tables, les états, la zone de dépôt et le bandeau"`,
  `const used = new Set([...Object.values(TOOL_ICONS), ...Object.values(ACTION_ICONS), "pen-line", "reset", "check", "drop"]);`
  et `toHaveLength(48)`. Ajouter dans le describe :

```ts
  it("design-l4 : check et drop recopiés à l'identique de 02-annotation-bureau.html (Lucide check, file-down)", () => {
    expect(ICONS["check"]).toEqual(symbol02("check"));
    expect(ICONS["drop"]).toEqual(symbol02("drop"));
  });
```

  Lancer `vitest run src/ui/icons.test.ts` (journal `T5-icons.log`) : rouge. Puis dans `icons.ts`, en fin de `ICONS`
  (après `col-remove`) :

```ts
  // design-l4 : maquette 02 (symboles i-check et i-drop de 02-annotation-bureau.html ; Lucide check et file-down,
  // lucide-icons/lucide@7981a0798a), pastille du bandeau et zone de dépôt.
  "check": [["path", { d: "M20 6 9 17l-5-5" }]],
  "drop": [["path", { d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" }], ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5" }], ["path", { d: "M12 18v-6" }], ["path", { d: "m9 15 3 3 3-3" }]],
```

  `THIRD_PARTY_NOTICES.md` : titre `## Icônes Lucide (ISC), design L1 et L4` ; après la puce « Dessinées pour
  RoomBoard… » ajouter :

```markdown
- Reprises de la maquette `docs/design/maquettes/02-annotation-bureau.html` (design L4, tracés Lucide au même commit),
  noms RoomBoard : `check` (Lucide `check`), `drop` (Lucide `file-down`).
```

  Relancer : vert, `ICONS : 48 icônes` présent.

- [ ] **Étape 2 : tests de la commande segmentée (rouges).** Créer `apps/web/src/ui/PointerSwitch.test.tsx` :

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ToolbarHost } from "../app/toolbar-host";
import type { ToolItem } from "../toolbar";
import type { ToolbarView } from "./item-state";
import { PointerSwitch } from "./PointerSwitch";

afterEach(cleanup);

const ITEM: ToolItem = { id: "annotation-pointer", kind: "action", action: "annotation-pointer", label: "Souris", requires: ["desktopAnnotation"], rest: {} };
const VIEW: ToolbarView = { tool: "pen", eraserMode: "partial", canUndo: false, canRedo: false, pageIndex: 0, pageCount: 1 };
const on = (pointer: "draw" | "mouse"): ToolbarView => ({ ...VIEW, annotation: { active: true, pointer, screens: 1 } });

function setup(view: ToolbarView, withPointer = true) {
  const base = { setTool: vi.fn(), runAction: vi.fn(), dropFiles: vi.fn(), setMode: vi.fn(), tableFill: vi.fn(), fillColor: vi.fn(), fillTolerance: vi.fn(), textFormat: vi.fn(), selection: vi.fn(), imagePanel: vi.fn() };
  const host: ToolbarHost = withPointer ? { ...base, pointer: vi.fn() } : base;
  const [v, setV] = createSignal(view);
  const r = render(() => <PointerSwitch item={ITEM} view={v} host={host} />);
  const seg = (m: string): HTMLButtonElement => r.container.querySelector<HTMLButtonElement>(`button[data-segment="${m}"]`)!;
  const icon = (m: string): string | null => seg(m).querySelector("svg.rb-icon")?.getAttribute("data-icon") ?? null;
  return { ...r, host, setV, seg, icon };
}

describe("PointerSwitch (design-l4, L4-8)", () => {
  it("PointerSwitch (design-l4) : deux segments accolés dans un .rb-seg, « Dessin » (pen-line) puis « Souris » (pointer)", () => {
    const { container, icon } = setup(on("draw"));
    const segs = [...container.querySelectorAll(".rb-seg > button")];
    expect(segs.map((b) => b.getAttribute("data-segment"))).toEqual(["draw", "mouse"]);
    expect(segs.map((b) => b.textContent)).toEqual(["Dessin", "Souris"]);
    expect([icon("draw"), icon("mouse")]).toEqual(["pen-line", "pointer"]);
  });
  it("PointerSwitch (design-l4) : en dessin, « Dessin » enfoncé ; le segment inactif « Souris » porte data-item", () => {
    const { container, seg } = setup(on("draw"));
    expect([seg("draw").getAttribute("aria-pressed"), seg("mouse").getAttribute("aria-pressed")]).toEqual(["true", "false"]);
    expect(container.querySelectorAll("[data-item]")).toHaveLength(1);
    expect(seg("mouse").getAttribute("data-item")).toBe("annotation-pointer");
  });
  it("PointerSwitch (design-l4) : en souris, l'état et data-item passent à l'autre segment ; libellé et icône d'ACTION_STATE", () => {
    const { container, seg, setV, icon } = setup(on("draw"));
    setV(on("mouse"));
    expect([seg("draw").getAttribute("aria-pressed"), seg("mouse").getAttribute("aria-pressed")]).toEqual(["false", "true"]);
    expect(container.querySelectorAll("[data-item]")).toHaveLength(1);
    expect(seg("draw").getAttribute("data-item")).toBe("annotation-pointer");
    expect(container.querySelector('[data-item="annotation-pointer"]')!.textContent).toBe("Dessin");
    expect(icon("draw")).toBe("pen-line");
  });
  it("PointerSwitch (design-l4) : un clic appelle host.pointer(mode), segment enfoncé compris ; jamais runAction", () => {
    const { seg, host } = setup(on("draw"));
    fireEvent.click(seg("mouse"));
    fireEvent.click(seg("draw"));
    expect(vi.mocked(host.pointer!).mock.calls).toEqual([["mouse"], ["draw"]]);
    expect(host.runAction).not.toHaveBeenCalled();
  });
  it("PointerSwitch (design-l4) : hôte sans pointer, le segment inactif rejoue l'action, le segment enfoncé ne fait rien", () => {
    const { seg, host } = setup(on("draw"), false);
    fireEvent.click(seg("draw"));
    expect(host.runAction).not.toHaveBeenCalled();
    fireEvent.click(seg("mouse"));
    expect(host.runAction).toHaveBeenCalledWith("annotation-pointer");
  });
  it("PointerSwitch (design-l4) : hors annotation, les deux segments sont grisés", () => {
    const { seg } = setup(VIEW);
    expect([seg("draw").disabled, seg("mouse").disabled]).toEqual([true, true]);
  });
});
```

  Lancer `vitest run src/ui/PointerSwitch.test.tsx` (journal `T5-seg.log`) : rouge (`./PointerSwitch` introuvable).

- [ ] **Étape 3 : implémenter** `apps/web/src/ui/PointerSwitch.tsx` :

```tsx
import { For, createMemo, type Accessor, type JSX } from "solid-js";
import type { ToolbarHost } from "../app/toolbar-host";
import type { PointerMode } from "../platform/annotation-port";
import type { ToolItem } from "../toolbar";
import { IconButton } from "./IconButton";
import { itemState, type ToolbarView } from "./item-state";

interface Segment {
  readonly mode: PointerMode;
  readonly label: string;
  readonly icon: string;
}
/** Segments dans l'ordre de la maquette 02 : « Dessin » (`pen-line`, distinct de l'outil Stylo, L1-3) puis « Souris ». */
export const POINTER_SEGMENTS: readonly Segment[] = Object.freeze([
  { mode: "draw", label: "Dessin", icon: "pen-line" },
  { mode: "mouse", label: "Souris", icon: "pointer" },
]);

export interface PointerSwitchProps {
  readonly item: ToolItem;
  readonly view: Accessor<ToolbarView>;
  readonly host: ToolbarHost;
}

/**
 * Commande segmentée Dessin / Souris (cadrage design-l4, L4-8, Q3) : deux boutons à icône accolés sur un fond commun.
 * Le segment de l'état présent est enfoncé ; le segment inactif porte `data-item` (c'est lui qui bascule, H2) et reprend
 * le libellé et l'icône qu'`ACTION_STATE` rend pour l'action. Un clic appelle `host.pointer(mode)` (L4-9 : sans
 * aller-retour au double clic) ; hôte sans `pointer` : le segment inactif rejoue l'action, l'autre ne fait rien.
 */
export function PointerSwitch(props: PointerSwitchProps): JSX.Element {
  const st = createMemo(() => itemState(props.item, props.view()));
  const current = (): PointerMode => (props.view().annotation?.pointer === "mouse" ? "mouse" : "draw");
  const press = (mode: PointerMode): void => {
    if (props.host.pointer !== undefined) props.host.pointer(mode);
    else if (mode !== current()) props.host.runAction(props.item.action ?? "");
  };
  return (
    <span class="rb-seg">
      <For each={POINTER_SEGMENTS}>
        {(seg) => {
          const on = (): boolean => current() === seg.mode;
          return (
            <IconButton
              icon={on() ? seg.icon : (st().icon ?? seg.icon)}
              label={on() ? seg.label : st().label}
              pressed={on()}
              disabled={st().disabled}
              attrs={on() ? { "data-segment": seg.mode } : { "data-segment": seg.mode, "data-item": props.item.id }}
              onPress={() => press(seg.mode)}
            />
          );
        }}
      </For>
    </span>
  );
}
```

  Relancer : vert (si `data-item` n'est pas retiré du segment devenu présent, le noter au rapport et s'arrêter : le
  spread réactif d'`IconButton` est le contrat attendu).

- [ ] **Étape 4 : tests de la barre (rouges).** `Toolbar.test.tsx` : ajouter `ACTION_TABLE` (valeur) à un import de
  `../toolbar` (`import { ACTION_TABLE } from "../toolbar";`) et `import { TIP_HOVER_MS } from "./tooltip";` ; ajouter
  en fin de fichier :

```tsx
describe("Toolbar — barre d'annotation (design-l4)", () => {
  const act = (id: string, a = id): ToolItem => ({ id, kind: "action", action: a, label: ACTION_TABLE[a]?.label ?? a, requires: [], rest: {} });
  const iconOf = (root: ParentNode, sel: string): string | null => root.querySelector(`${sel} svg.rb-icon`)?.getAttribute("data-icon") ?? null;
  it("design-l4 (L4-8) : annotation-pointer rendu par la commande segmentée (table ACTION_RENDER), data-item sur le segment inactif", () => {
    const { container } = setup(mkBar([act("annotation-pointer")]), NO_CAPS, "m", undefined, "desktop-annotation");
    expect(container.querySelectorAll(".rb-seg > button[data-segment]")).toHaveLength(2);
    expect(container.querySelectorAll('[data-item="annotation-pointer"]')).toHaveLength(1);
    expect(container.querySelector('[data-item="annotation-pointer"]')!.getAttribute("data-segment")).toBe("mouse");
  });
  it("design-l4 (L4-10) : « Envoyer au tableau » et « … nouvel onglet » en boutons pleins voisins (board, plus) ; Annuler non", () => {
    const { container } = setup(mkBar([act("undo"), act("annotation-send"), act("annotation-send-new")]), NO_CAPS, "m", undefined, "desktop-annotation");
    const send = container.querySelector('button[data-item="annotation-send"]')!;
    const sendNew = container.querySelector('button[data-item="annotation-send-new"]')!;
    expect([send.classList.contains("rb-primary"), send.classList.contains("rb-ib"), sendNew.classList.contains("rb-primary")]).toEqual([true, true, true]);
    expect(send.nextElementSibling).toBe(sendNew);
    expect([iconOf(container, '[data-item="annotation-send"]'), iconOf(container, '[data-item="annotation-send-new"]')]).toEqual(["board", "plus"]);
    expect(container.querySelector('button[data-item="undo"]')!.classList.contains("rb-primary")).toBe(false);
  });
  it("design-l4 (L4-11) : zone de dépôt à icône drop, libellé en rb-sr, sans title ; infobulle au survol", () => {
    vi.useFakeTimers();
    const zone: ToolItem = { id: "depot-annotation", kind: "dropzone", label: "Déposer ici", requires: [], rest: {} };
    const { container } = setup(mkBar([zone]));
    const el = container.querySelector<HTMLElement>('[data-item="depot-annotation"]')!;
    expect(el.classList.contains("rb-drop")).toBe(true);
    expect(el.querySelector("svg.rb-icon")?.getAttribute("data-icon")).toBe("drop");
    expect(el.querySelector(".rb-sr")?.textContent).toBe("Déposer ici");
    expect(el.textContent).toBe("Déposer ici");
    expect(el.hasAttribute("title")).toBe(false);
    fireEvent.pointerEnter(el, { pointerType: "mouse" });
    vi.advanceTimersByTime(TIP_HOVER_MS);
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe("Déposer ici");
    fireEvent.pointerLeave(el, { pointerType: "mouse" });
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    vi.useRealTimers();
  });
  it("design-l4 (L4-4) : rangées contextuelles sur une barre de rôle annotation comme sur tools ; aucune sur un autre rôle", () => {
    const ann = setup({ ...mkBar([tool("pen")]), role: "annotation" }, NO_CAPS, "m", PEN);
    expect(ann.container.querySelectorAll("button[data-preset]")).toHaveLength(3);
    ann.setV({ ...VIEW, tool: "select" });
    expect(ann.container.querySelectorAll("[data-selection-action]")).toHaveLength(6);
    cleanup();
    const other = setup({ ...mkBar([tool("pen")]), role: "autre" }, NO_CAPS, "m", PEN);
    expect(other.container.querySelectorAll("button[data-preset]")).toHaveLength(0);
  });
});
```

  Lancer `vitest run src/ui/Toolbar.test.tsx` (journal `T5-bar.log`) : rouge sur ces 4 tests seulement.

- [ ] **Étape 5 : implémenter dans `Toolbar.tsx` et `IconButton.tsx`.** `IconButton.tsx:42` : `function Bubble(` devient
  `export function Bubble(` (commentaire : « … ; exportée pour la zone de dépôt (design-l4, L4-11). »). `Toolbar.tsx` :
  imports — ajouter `import { Portal } from "solid-js/web";`, `ANNOTATION_ROLE` et `type ActionId` à l'import de
  `../toolbar`, remplacer `import { IconButton } from "./IconButton";` par `import { Bubble, Icon, IconButton } from "./IconButton";`,
  ajouter `import { PointerSwitch } from "./PointerSwitch";` et `import { createTip } from "./tooltip";`. Remplacer
  `Button` et `Drop` (`:48-69`) par :

```tsx
/** design-l4 (L4-10) : actions rendues en boutons pleins (fond violet, icône blanche), accolées quand elles se suivent. */
const PRIMARY_ACTIONS: ReadonlySet<ActionId> = new Set(["annotation-send", "annotation-send-new"]);
/** design-l4 (L4-11) : icône de la zone de dépôt (Lucide file-down). */
const DROP_ICON = "drop";

function Button(props: { item: ToolItem; ctx: Ctx; onPress: () => void }): JSX.Element {
  const st = createMemo(() => itemState(props.item, props.ctx.view()));
  const primary = props.item.kind === "action" && PRIMARY_ACTIONS.has(props.item.action ?? "");
  return (
    <IconButton
      icon={iconFor(props.item, st().icon)}
      label={st().label}
      pressed={st().pressed}
      disabled={st().disabled}
      attrs={primary ? { "data-item": props.item.id, class: "rb-primary" } : { "data-item": props.item.id }}
      onPress={() => props.onPress()}
    />
  );
}

/** Zone de dépôt (design-l4, L4-11) : icône, libellé en `rb-sr` (le `textContent` reste le libellé), infobulle de L1. */
function Drop(props: { item: ToolItem; ctx: Ctx }): JSX.Element {
  let el: HTMLDivElement | undefined;
  const tip = createTip();
  onMount(() => {
    const off = listenWebDrop(el ?? null, (files, at) => props.ctx.host.dropFiles(files, at), { stopPropagation: true });
    onCleanup(off);
  });
  return (
    <>
      <div
        class="rb-drop"
        data-item={props.item.id}
        ref={el}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") tip.enter();
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") tip.leave();
        }}
        onPointerDown={(e) => tip.down(e.pointerType)}
        onPointerUp={() => tip.up()}
        onPointerCancel={() => tip.up()}
      >
        <Icon name={DROP_ICON} />
        <span class="rb-sr">{props.item.label}</span>
      </div>
      <Show when={tip.shown()}>
        <Portal>
          <Bubble label={props.item.label} anchor={el!} />
        </Portal>
      </Show>
    </>
  );
}

/** design-l4 (L4-8) : rendu propre à une action (table indexée par l'action, jamais un test sur l'identifiant) ;
 *  absente : bouton. */
const ACTION_RENDER: Readonly<Record<ActionId, (item: ToolItem, ctx: Ctx) => JSX.Element>> = {
  "annotation-pointer": (item, ctx) => <PointerSwitch item={item} view={ctx.view} host={ctx.host} />,
};
```

  Dans `RENDER`, l'entrée `action` devient :

```tsx
  action: (item, ctx) => {
    const own = item.action !== undefined && Object.hasOwn(ACTION_RENDER, item.action) ? ACTION_RENDER[item.action] : undefined;
    return own !== undefined ? own(item, ctx) : <Button item={item} ctx={ctx} onPress={() => ctx.host.runAction(item.action ?? "")} />;
  },
```

  Avant `export function Toolbar`, ajouter :

```tsx
/** C1 (P18), design-l4 (L4-4) : rôles qui portent les rangées contextuelles (préréglages, tableau, sélection, format). */
const CONTEXT_ROLES: ReadonlySet<string> = new Set(["tools", ANNOTATION_ROLE]);
```

  et remplacer `<Show when={props.bar.role === "tools"}>` par `<Show when={CONTEXT_ROLES.has(props.bar.role)}>` (commentaire
  de `ToolbarProps.presets` : « une barre de rôle `tools` ou `annotation` montre… »).

- [ ] **Étape 6 : CSS (rouge puis vert).** `rb-css.test.ts`, en fin de fichier :

```ts
describe("rb.css (design-l4, L4-7 bis, L4-8, L4-10, L4-11)", () => {
  it("design-l4 : commande segmentée, fond gris 50 et rayon lg ; empilée en colonne dans une barre verticale", () => {
    expect(rule(".rb-seg")).toMatch(/display: inline-flex;.*flex: none;.*background: var\(--rf-gray-50\);.*border-radius: var\(--rf-radius-lg\);/);
    expect(rule('.rb-bar[data-dock="left"] .rb-seg, .rb-bar[data-dock="right"] .rb-seg')).toContain("flex-direction: column;");
  });
  it("design-l4 : boutons pleins violet 600 et blanc ; grisés gris 50 et gris 500 ; accolés à 2 px, en ligne et en colonne", () => {
    expect(rule(".rb-bar button.rb-primary")).toMatch(/background: var\(--rf-violet-600\);.*color: var\(--rf-white\);/);
    expect(rule(".rb-bar button.rb-primary:not(:disabled):hover")).toContain("background: var(--rf-violet-700);");
    expect(rule(".rb-bar button.rb-primary:disabled")).toMatch(/background: var\(--rf-gray-50\);.*color: var\(--rf-gray-500\);/);
    expect(rule('.rb-bar:is([data-dock="top"], [data-dock="bottom"]) button.rb-primary + button.rb-primary')).toContain("margin-inline-start: -2px;");
    expect(rule('.rb-bar:is([data-dock="left"], [data-dock="right"]) button.rb-primary + button.rb-primary')).toContain("margin-block-start: -2px;");
  });
  it("design-l4 : zone de dépôt 96 px × --rb-btn, pointillé 1,5 px gris 500, rayon lg ; couchée dans une barre verticale", () => {
    expect(rule(".rb-drop")).toMatch(/display: grid;.*place-items: center;.*box-sizing: border-box;.*inline-size: 96px;.*block-size: var\(--rb-btn\);.*border: 1\.5px dashed var\(--rf-gray-500\);.*border-radius: var\(--rf-radius-lg\);/);
    expect(rule('.rb-bar[data-dock="left"] .rb-drop, .rb-bar[data-dock="right"] .rb-drop')).toMatch(/inline-size: var\(--rb-btn\);.*block-size: 96px;/);
  });
});
```

  Lancer `vitest run src/ui/rb-css.test.ts` (journal `T5-css.log`) : rouge. Puis `rb.css` : remplacer la ligne 66
  (`.rb-drop { display: flex; … }`) par :

```css
/* design-l4 (L4-11) : zone de dépôt à icône (file-down), libellé en rb-sr ; 96 px × --rb-btn, couchée dans une barre verticale. */
.rb-drop { display: grid; place-items: center; flex: none; box-sizing: border-box; inline-size: 96px; block-size: var(--rb-btn); border: 1.5px dashed var(--rf-gray-500); border-radius: var(--rf-radius-lg); color: var(--rf-navy-500); }
.rb-bar[data-dock="left"] .rb-drop, .rb-bar[data-dock="right"] .rb-drop { inline-size: var(--rb-btn); block-size: 96px; }
```

  et, après la règle `.rb-icon` (`:60`) :

```css
/* design-l4 (L4-8, L4-7 bis) : commande segmentée Dessin / Souris, deux boutons accolés sur un fond commun ; empilée dans une barre verticale. */
.rb-seg { display: inline-flex; flex: none; background: var(--rf-gray-50); border-radius: var(--rf-radius-lg); }
.rb-bar[data-dock="left"] .rb-seg, .rb-bar[data-dock="right"] .rb-seg { flex-direction: column; }
/* design-l4 (L4-10) : boutons pleins ; grisés comme une icône désactivée ; accolés quand ils se suivent (2 px au lieu de 4). */
.rb-bar button.rb-primary { background: var(--rf-violet-600); color: var(--rf-white); }
.rb-bar button.rb-primary:not(:disabled):hover { background: var(--rf-violet-700); }
.rb-bar button.rb-primary:disabled { background: var(--rf-gray-50); color: var(--rf-gray-500); }
.rb-bar:is([data-dock="top"], [data-dock="bottom"]) button.rb-primary + button.rb-primary { margin-inline-start: -2px; }
.rb-bar:is([data-dock="left"], [data-dock="right"]) button.rb-primary + button.rb-primary { margin-block-start: -2px; }
```

  Relancer : vert.

- [ ] **Étape 7 : tous les fichiers et tsc** — commande bornée de la section, puis
  `cd /home/adminjd/projets/roomboard-wt/design-l4--T5 && export TMPDIR=$HOME/.cache/tmp/of48-tmp && nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit > "$TMPDIR/T5-tsc.log" 2>&1; echo "tsc code $?"; tail -20 "$TMPDIR/T5-tsc.log"`
  Attendu : preuve de la section ; `tsc code 0`.

- [ ] **Étape 8 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l4--T5
git add apps/web/src/ui/PointerSwitch.tsx
git add apps/web/src/ui/PointerSwitch.test.tsx
git add apps/web/src/ui/Toolbar.tsx
git add apps/web/src/ui/Toolbar.test.tsx
git add apps/web/src/ui/IconButton.tsx
git add apps/web/src/ui/icons.ts
git add apps/web/src/ui/icons.test.ts
git add THIRD_PARTY_NOTICES.md
git add apps/web/src/ui/rb.css
git add apps/web/src/ui/rb-css.test.ts
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(toolbar): segmented draw/mouse switch, filled send buttons, icon drop zone, check and drop icons" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport de la tâche : nombre de tests, ligne `Réutilisation : …`, retouche `icons.test.ts:23-27` (D2) à citer dans la PR.

---

### Tâche T6 — Profils livrés et barre choisie par l'application
<a id="tache-t6"></a>

**Objectif.** Les éléments propres à l'annotation passent de la barre d'outils à une barre `annotation` dans les trois
profils livrés (cadrage L4-5, L4-6, L4-7) ; l'application montre `annotationBarOf` en annotation et jamais une barre
`annotation` au tableau (L4-2, L4-3), y pose les préréglages (L4-4) et relaie `pointer` ; `main.ts` mesure la même barre
(L4-2) ; l'éditeur nomme la « Barre d'annotation » (L4-18). Retouches de forme des tests (L4-19, L4-22, D2).

**Fichiers.**
- Modifier : `apps/web/src/toolbar-profiles.ts` (`:46-58`, `:68-83`, `:96-117`), `apps/web/src/toolbar-profiles.test.ts`
  (`:44-49`, `:52-57`, describe ajouté), `apps/web/src/ui/App.tsx` (`:22`, `:293-304`, `:320-337`, `:352-353`),
  `apps/web/src/ui/App.test.tsx` (`:19`, `:296-304`, `:360`, `:368`, `:571-586`, `:600-611`, tests ajoutés),
  `apps/web/src/main.ts` (`:13`, `:448-457`), `apps/web/src/ui/ProfileEditor.tsx` (`:61`), `apps/web/src/ui/ProfileEditor.test.tsx`
  (`:48`, `:81`, test ajouté), `apps/web/src/profile-edit.test.ts` (`:84`)

**Interfaces.**
- Consomme (T1) : `ANNOTATION_ROLE`, `annotationBarOf(p: Profile): Toolbar | null`, fichier
  `fixtures/profils/defaut-avant-l4.rbprofile`. Consomme (T2) : `ToolbarHost.pointer?`, `AnnotationControl.pointer`
  (faux d'`App.test.tsx` déjà complété). Consomme (T5) : `CONTEXT_ROLES` (rangées sur la barre `annotation`),
  `PointerSwitch` (segments `data-segment`).
- Produit : barres `annotation` livrées (ids `annotation-pointer`, `ann-pen`, `ann-eraser`, `ann-eraser-mode`,
  `ann-arrow`, `ann-rect`, `ann-text`, `ann-undo`, `annotation-freeze`, `annotation-screen`, `depot-annotation`,
  `annotation-send`, `annotation-send-new`, `ann-desktop-annotation`, séparateurs `ann-sep-<n>`) ; `App` : barres
  `annotation` cachées au tableau ; `ROLE_LABELS.annotation = "Barre d'annotation"`.
- Réutilise : `apps/web/src/toolbar.ts:672` — `itemsForMode(bar, caps, mode)` appelé tel quel (par `Toolbar`) sur la
  barre d'annotation ; `annotationBarOf(p: Profile): Toolbar | null` (T1) appelé par `App.tsx` **et** `main.ts`.
- Rapport : `Réutilisation : appelé toolbar.ts (annotationBarOf, itemsForMode)` ou `Réutilisation : écart — <pourquoi>`.

**Patron à ne pas reprendre.** La règle recopiée deux fois : `firstToolsBar` + `annotationBar` locaux
(`apps/web/src/ui/App.tsx:324-330`) et `find((b) => b.role === "tools")` de `measureBar`
(`apps/web/src/main.ts:449-457`). Une seule source : `annotationBarOf`. Pas d'entrée `annotation` dans `BY_ROLE`
(`App.tsx:358-374`) : la barre d'annotation est une barre d'outils (`toolbarOf`).

**Chemin de référence.** `apps/web/src/toolbar.ts` (`annotationBarOf`, T1) ; table `BY_ROLE` et `toolbarOf`
(`apps/web/src/ui/App.tsx:354-374`).

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/design-l4--T6 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of48-tmp CARGO_BUILD_JOBS=4 CARGO_TARGET_DIR=/home/adminjd/projets/roomboard-wt/design-l4--T6/target && mkdir -p "$TMPDIR" && node ~/.claude/scripts/vm/suite-vm.cjs -- nice -n 10 pnpm --filter @roomboard/web exec vitest run --reporter=verbose > "$TMPDIR/T6-web.log" 2>&1; echo "code $?"; grep -E "Test Files|Tests |FAIL |×" "$TMPDIR/T6-web.log" | tail -40; grep -cE "S2 :|L4-3" "$TMPDIR/T6-web.log"`
Preuve : `code 0`, `Test Files  N passed (N)`, aucun `FAIL ` ni `×` ; le décompte `S2 :|L4-3` ≥ 4. Tests à garder verts cités par le cadrage :
`runtime-capabilities.test.ts:45-53` (`toolbars[0]` reste `outils`), `App.test.tsx:385-401`, `:612-619`,
`Toolbar.test.tsx:403-418` (S4 sur les barres d'annotation livrées), `item-state.test.ts`, `profile-actions.test.ts`.

**Preuve visuelle.** Aucune dans la tâche (S1, S6 joués par T8 ; recadrages par T9).

**Contraintes (recopiées).** G1 test rouge d'abord, aucun test supprimé, désactivé ou sauté, aucun seuil changé ·
G2 aucune dépendance ajoutée · G4 retouches de forme admises, et seulement elles : `toolbar-profiles.test.ts:44-49`,
`:52-57` ; `App.test.tsx:296-304` (`oldCopy()` depuis le profil figé), `:360` et `:368` (D2), `:571-586`, `:600-611` ;
`ProfileEditor.test.tsx:48`, `:81` ; `profile-edit.test.ts:84` (D2) ; toute autre rougeur arrête la tâche · G5 schéma,
`PROFILE_MINOR` et `parseProfile` inchangés, aucun Rust ni CLI · G6 `nice -n 10`,
`CARGO_TARGET_DIR=/home/adminjd/projets/roomboard-wt/design-l4--T6/target`, suite web entière par `suite-vm.cjs`, test
isolé et `tsc` sans · G7 sorties dans `$HOME/.cache/tmp/of48-tmp/T6-*` · G8 auteur
`jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un, aucun push · G9 `App.tsx`,
`ProfileEditor.tsx` sans `switch (`, `\d+px`, `localStorage`.

**Interdits.** Aucun bandeau ni réglage du cadre ici (T7) ; ne pas réordonner `outils` ni `pages` (L2) ; ne pas réécrire
les copies d'utilisateur (L4-22 : profils non migrés).

**Terminé quand.** Suite web verte, `tsc` 0, commit fait.

- [ ] **Étape 0 : préparer le worktree** —
  `cd /home/adminjd/projets/roomboard-wt/design-l4--T6 && mkdir -p $HOME/.cache/tmp/of48-tmp && (test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile > $HOME/.cache/tmp/of48-tmp/T6-install.log 2>&1) && for d in wasm wasm-formats; do test -d apps/web/src/$d || cp -r /home/adminjd/projets/roomboard-wt/design-l4/apps/web/src/$d apps/web/src/$d; done && ls apps/web/src/wasm/roomboard_wasm.d.ts`

- [ ] **Étape 1 : tests des profils livrés (rouges).** `toolbar-profiles.test.ts` : import
  `import { annotationBarOf, ANNOTATION_MAIN_ACTIONS, itemsForMode, parseProfile, visibleItems } from "./toolbar";`
  (au lieu de `parseProfile, visibleItems`). Retouches : `:46` attendu
  `["fit-page", "grid", "library", "profiles", "settings", "desktop-annotation"]` ; `:58` attendu
  `[["outils", "tools", "top"], ["pages", "pages", "bottom"], ["annotation", "annotation", "top"]]` ; `:59` attendu
  `["left", "bottom", "left"]`. Ajouter en fin de fichier :

```ts
describe("design-l4 : barres d'annotation livrées (L4-1, L4-5 à L4-7)", () => {
  const flat = (b: { readonly groups: readonly { readonly items: readonly { readonly id: string }[] }[] }): string[] => b.groups.flatMap((g) => g.items.map((i) => i.id));
  const bar = (id: string, barId: string) => builtinProfile(id)!.toolbars.find((b) => b.id === barId)!;
  it("L4-6 : defaut et annotation, barre « annotation » en haut, dernière de toolbars, éléments dans l'ordre", () => {
    for (const id of ["defaut", "annotation"]) {
      const p = builtinProfile(id)!;
      expect(p.toolbars.map((b) => b.id), id).toEqual(["outils", "pages", "annotation"]);
      expect([bar(id, "annotation").role, bar(id, "annotation").dock]).toEqual(["annotation", "top"]);
      expect(flat(bar(id, "annotation")), id).toEqual([
        "annotation-pointer", "ann-sep-1", "ann-pen", "ann-eraser", "ann-eraser-mode", "ann-arrow", "ann-rect", "ann-text",
        "ann-sep-2", "ann-undo", "annotation-freeze", "annotation-screen", "ann-sep-3", "depot-annotation", "annotation-send",
        "annotation-send-new", "ann-sep-4", "ann-desktop-annotation",
      ]);
      expect(annotationBarOf(p)?.id, id).toBe("annotation");
    }
  });
  it("L4-7 : simple, barre « annotation » à gauche, sans zone", () => {
    const p = builtinProfile("simple")!;
    expect(p.toolbars.map((b) => [b.id, b.dock])).toEqual([["outils", "left"], ["pages", "bottom"], ["annotation", "left"]]);
    expect(flat(bar("simple", "annotation"))).toEqual([
      "annotation-pointer", "ann-sep-1", "ann-pen", "ann-eraser", "ann-sep-2", "ann-undo", "ann-sep-3", "annotation-freeze",
      "annotation-screen", "ann-sep-4", "annotation-send", "annotation-send-new", "ann-sep-5", "ann-desktop-annotation",
    ]);
  });
  it("L4-5, H7 : la barre d'outils garde « Annotation du bureau » seule ; au tableau, ni « Souris » ni « Écran suivant »", () => {
    for (const id of ["defaut", "simple", "annotation"]) {
      const outils = bar(id, "outils");
      expect(flat(outils).filter((x) => x.includes("annotation")), id).toEqual(["desktop-annotation"]);
      const board = itemsForMode(outils, ALL, "board").map((i) => i.id);
      expect(board, id).toContain("desktop-annotation");
      expect(board.filter((x) => ["annotation-pointer", "annotation-screen"].includes(x)), id).toEqual([]);
    }
  });
  it("L4-6 : actions d'annotation et zone exigent desktopAnnotation ; outils et actions ann- de dessin, aucune capacité", () => {
    for (const id of ["defaut", "simple"]) {
      for (const it of bar(id, "annotation").groups.flatMap((g) => g.items)) {
        const needs = it.kind === "dropzone" || (it.kind === "action" && ANNOTATION_MAIN_ACTIONS.has(it.action ?? ""));
        expect(it.requires, `${id} : ${it.id}`).toEqual(needs ? ["desktopAnnotation"] : []);
      }
    }
  });
});
```

- [ ] **Étape 2 : vérifier le rouge** —
  `cd /home/adminjd/projets/roomboard-wt/design-l4--T6 && export TMPDIR=$HOME/.cache/tmp/of48-tmp && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/toolbar-profiles.test.ts --reporter=verbose > "$TMPDIR/T6-prof.log" 2>&1; echo "code $?"; grep -E "×|Tests " "$TMPDIR/T6-prof.log" | tail -20`
  Attendu : `code 1`, les 4 tests `design-l4` et les deux retouches rouges.

- [ ] **Étape 3 : profils livrés.** `toolbar-profiles.ts` : remplacer `annotationItems` (`:48-56`) par :

```ts
/** C11a (P6) : entrée « Annotation du bureau », gardée dans la barre d'outils (design-l4, L4-5). */
const annotationEntry = () => needs(action("desktop-annotation", "Annotation du bureau"));
const annotationZone = () => needs({ id: "depot-annotation", kind: "dropzone", label: "Déposer ici" });
/** design-l4 (L4-5) : outil ou action présent aussi dans la barre d'outils : préfixe `ann-` (un id est unique dans tout
 *  le profil, `toolbar.ts:322`). */
const annTool = (t: string, label: string) => ({ id: `ann-${t}`, kind: "tool", tool: t, label });
const annAction = (a: string, label: string) => ({ id: `ann-${a}`, kind: "action", action: a, label });
const pointer = () => needs(action("annotation-pointer", "Souris"));
const freeze = () => needs(action("annotation-freeze", "Figer le bureau"));
const screen = () => needs(action("annotation-screen", "Écran suivant"));
const send = () => needs(action("annotation-send", "Envoyer au tableau"));
const sendNew = () => needs(action("annotation-send-new", "Envoyer dans un nouvel onglet"));
const leave = () => needs(annAction("desktop-annotation", "Annotation du bureau"));

/** design-l4 (L4-6, Q9) : barre d'annotation de `defaut` et `annotation`, en haut, dernière de `toolbars` (L4-1). */
const defaultAnnotationBar = () => ({
  id: "annotation",
  role: "annotation",
  dock: "top",
  groups: [
    { id: "mode", items: [pointer()] },
    { id: "dessin", items: [sep("ann-sep-1"), annTool("pen", "Stylo"), annTool("eraser", "Gomme"), annAction("eraser-mode", "Gomme : partielle"), annTool("arrow", "Flèche"), annTool("rect", "Rectangle"), annTool("text", "Texte")] },
    { id: "bureau", items: [sep("ann-sep-2"), annAction("undo", "Annuler"), freeze(), screen()] },
    { id: "envoi", items: [sep("ann-sep-3"), annotationZone(), send(), sendNew()] },
    { id: "sortie", items: [sep("ann-sep-4"), leave()] },
  ],
});

/** design-l4 (L4-7) : barre d'annotation de `simple`, à gauche comme sa barre d'outils, sans zone. */
const simpleAnnotationBar = () => ({
  id: "annotation",
  role: "annotation",
  dock: "left",
  groups: [
    { id: "mode", items: [pointer()] },
    { id: "dessin", items: [sep("ann-sep-1"), annTool("pen", "Stylo"), annTool("eraser", "Gomme")] },
    { id: "historique", items: [sep("ann-sep-2"), annAction("undo", "Annuler")] },
    { id: "bureau", items: [sep("ann-sep-3"), freeze(), screen()] },
    { id: "envoi", items: [sep("ann-sep-4"), send(), sendNew()] },
    { id: "sortie", items: [sep("ann-sep-5"), leave()] },
  ],
});
```

  Dans `defaultToolbars`, le groupe `vue` devient
  `{ id: "vue", items: [sep("sep-4"), action("fit-page", "Ajuster la page"), action("grid", "Grille"), action("library", "Bibliothèque"), action("profiles", "Profil"), action("settings", "Réglages"), annotationEntry()] },`
  et la liste se termine par `pagesBar(true), defaultAnnotationBar(),`. Dans `SIMPLE_PROFILE_JSON`, le groupe `vue`
  devient `{ id: "vue", items: [sep("sep-2"), action("fit-page", "Ajuster la page"), action("profiles", "Profil"), action("settings", "Réglages"), annotationEntry()] },`
  et `toolbars` se termine par `pagesBar(), simpleAnnotationBar(),`.

- [ ] **Étape 4 : vérifier le vert du fichier** — commande de l'étape 2. Attendu : `code 0`.

- [ ] **Étape 5 : tests de l'application et de l'éditeur (rouges).** `App.test.tsx` : import
  `import { BUILTIN_PROFILES } from "../toolbar-profiles";` (sans `DEFAULT_PROFILE_JSON`), ajouter
  `import { setDock } from "../profile-edit";` ; après `CAPS`, ajouter :

```tsx
/** design-l4 (L4-22) : `DEFAULT_PROFILE_JSON` d'origin/main @ 136cbbb, tel quel (aucune barre `annotation`). */
const BEFORE_L4: Record<string, unknown> = JSON.parse(readFileSync(join(__dirname, "..", "fixtures", "profils", "defaut-avant-l4.rbprofile"), "utf8"));
/** Copie de `defaut` faite avant L4, id `id`. */
function beforeL4Copy(id: string): Profile {
  const r = parseProfile({ ...BEFORE_L4, id, label: `Copie ${id}` });
  if ("errors" in r) throw new Error(r.errors.join("; "));
  return r.profile;
}
const barIds = (c: HTMLElement): (string | null)[] => [...c.querySelectorAll("[data-toolbar]")].map((b) => b.getAttribute("data-toolbar"));
```

  Retouches de forme : `oldCopy()` (`:299`) : `structuredClone(DEFAULT_PROFILE_JSON)` → `structuredClone(BEFORE_L4)` ;
  `:360` : `const expected = layoutFor(profile.toolbars.filter((b) => b.role !== "annotation"));` ; `:368` :
  `.toEqual(profile.toolbars.filter((b) => b.role !== "annotation").map((b) => b.id));` (D2 : au tableau, la barre
  `annotation` n'est jamais montrée, L4-3) ; test « C11a : en annotation, barre seule… » (`:571-586`) :
  `expect(container.querySelector('[data-toolbar="annotation"]')).not.toBeNull();` (au lieu de `outils`), clic sur
  `'[data-item="ann-pen"]'`, vue `a.view({ tool: "eraser", eraserMode: "partial", canUndo: false, canRedo: false, pageIndex: 0, pageCount: 1 });`,
  `expect(container.querySelector('[data-item="ann-eraser"]')?.getAttribute("aria-pressed")).toBe("true");`, sortie lue
  sur `'[data-item="ann-desktop-annotation"]'` ; test « la vue de annotate est oubliée… » (`:600-611`) :
  `'[data-item="ann-eraser-mode"]'`. Ajouter dans le describe « App (T95) », après le test `:571-586` :

```tsx
  it("S2 : barre d'annotation en annotation, première barre tools sinon ; au tableau, jamais de barre annotation (L4-2, L4-3)", async () => {
    const a = fakeAnnotationUi();
    const { container, store, active } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    expect(barIds(container)).toEqual(["outils", "pages"]);
    await a.control.enter();
    expect(barIds(container)).toEqual(["annotation"]);
    await a.control.exit();
    expect(barIds(container)).toEqual(["outils", "pages"]);
    store.save(beforeL4Copy("copie-l4"));
    active.choose("copie-l4");
    await a.control.enter();
    expect(barIds(container)).toEqual(["outils"]);
    expect(container.querySelector('[data-toolbar="outils"] [data-item="depot-annotation"]')).not.toBeNull();
  });
  it("L4-3 : barre d'annotation flottante, jamais montrée au tableau ; posée en haut en annotation", async () => {
    const a = fakeAnnotationUi();
    const { container, store, active } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    store.save({ ...setDock(BUILTIN_PROFILES[0]!, "annotation", "floating"), id: "flottante", label: "Flottante" });
    active.choose("flottante");
    expect(container.querySelector('[data-toolbar="annotation"]')).toBeNull();
    expect(container.querySelector(".rb-floating")).toBeNull();
    await a.control.enter();
    expect(container.querySelector('[data-toolbar="annotation"]')?.getAttribute("data-dock")).toBe("top");
  });
  it("L4-4 : préréglages du stylo dans la barre d'annotation en annotation, dans outils au tableau", async () => {
    const a = fakeAnnotationUi();
    const { container } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    expect(container.querySelectorAll('[data-toolbar="outils"] button[data-preset]')).toHaveLength(3);
    await a.control.enter();
    expect(container.querySelectorAll('[data-toolbar="annotation"] button[data-preset]')).toHaveLength(3);
  });
  it("L4-9 : segment « Souris » de la barre d'annotation → control.pointer(\"mouse\")", async () => {
    const a = fakeAnnotationUi();
    const { container } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    await a.control.enter();
    click(container.querySelector('[data-toolbar="annotation"] button[data-segment="mouse"]'));
    expect(a.control.pointer).toHaveBeenCalledWith("mouse");
  });
```

  Dans le describe « App — profils (C1) », ajouter :

```tsx
  it("S2 : éditeur, « Barre d'annotation » ; masquer ann-text la retire de la barre d'annotation, la barre d'outils garde Texte", async () => {
    const a = fakeAnnotationUi();
    const { container } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    openEditor(container);
    expect(container.querySelector('[data-edit-bar="annotation"] legend')?.textContent).toBe("Barre d'annotation");
    const box = container.querySelector<HTMLInputElement>('[data-edit-item="ann-text"] input[data-edit="shown"]')!;
    box.checked = false;
    box.dispatchEvent(new Event("change", { bubbles: true }));
    click(container.querySelector('button[data-edit="save"]'));
    expect(container.querySelector('[data-toolbar="outils"] [data-item="text"]')).not.toBeNull();
    await a.control.enter();
    expect(container.querySelector('[data-toolbar="annotation"] [data-item="ann-text"]')).toBeNull();
    expect(container.querySelector('[data-toolbar="annotation"] [data-item="ann-rect"]')).not.toBeNull();
  });
```

  `ProfileEditor.test.tsx` : `:48` attendu `["outils", "pages", "annotation"]` ; `:81` sélecteur
  `'[data-edit-item="desktop-annotation"] button[data-edit="down"]'` (dernier élément d'`outils`) ; ajouter :

```tsx
  it("L4-18 : la barre d'annotation est éditable, légende « Barre d'annotation »", () => {
    const { q } = setup();
    expect(q('[data-edit-bar="annotation"] legend').textContent).toBe("Barre d'annotation");
    expect(q('[data-edit-bar="annotation"] select[data-edit="dock"]')).toBeTruthy();
  });
```

  `profile-edit.test.ts:84` (D2) : attendu
  `["page-prev", "page-next", "page-add", "page-remove", "page-insert-file", "edit-original", "export-pdf", "export-iwb", "export-ubz", "annotation-pointer", "annotation-screen", "annotation-freeze", "annotation-send", "annotation-send-new"]`.

  Lancer `vitest run src/ui/App.test.tsx src/ui/ProfileEditor.test.tsx src/profile-edit.test.ts` (journal `T6-app.log`) :
  rouges attendus sur les tests ajoutés ou retouchés qui lisent la barre d'annotation dans l'application (L4-2, L4-3,
  L4-4, L4-9, légende).

- [ ] **Étape 6 : application, mesure, éditeur.** `ProfileEditor.tsx:61` :
  `const ROLE_LABELS: Readonly<Record<string, string>> = { tools: "Barre d'outils", pages: "Barre des pages", [ANNOTATION_ROLE]: "Barre d'annotation" };`
  (ajouter `ANNOTATION_ROLE` à son import de `../toolbar`). `App.tsx` : import
  `import { ANNOTATION_ROLE, annotationBarOf, resolveStartMode, visibleItems, type StartMode, type Toolbar as Bar } from "../toolbar";` ;
  dans `host`, après `imagePanel` : `pointer: (m) => pick().pointer?.(m),` ; remplacer `:322-330` par :

```tsx
  /** design-l4 (L4-3) : une barre de rôle `annotation` n'est jamais montrée au tableau, ni ancrée ni flottante. */
  const boardBars = createMemo(() => profile().toolbars.filter((b) => b.role !== ANNOTATION_ROLE));
  const docked = createMemo(() => boardBars().filter((b) => b.dock !== "floating"));
  const floating = createMemo(() => boardBars().filter((b) => b.dock === "floating"));
  const firstToolsBar = createMemo(() => profile().toolbars.find((x) => x.role === "tools"));
  /** C11a (P20), design-l4 (L4-2) : en annotation, la seule barre montrée est `annotationBarOf` (barre d'annotation, sinon
   *  première barre `tools`, flottante posée en haut) : la même que `main.ts` mesure pour la bande de la coque. */
  const annotationBar = createMemo((): Bar | null => annotationBarOf(profile()));
```

  et `:352-353` par :

```tsx
  /** C1 (P18), design-l4 (L4-4) : préréglages dans la barre montrée en annotation, dans la première barre `tools` au tableau. */
  const presetsBarId = createMemo(() => (annotating() ? annotationBar()?.id : firstToolsBar()?.id));
```

  `main.ts` : `import { ANNOTATION_REMOTE_ACTIONS, annotationBarOf, resolveStartMode, type Dock } from "./toolbar";` ;
  remplacer `:448-457` par :

```ts
  // C11a, design-l4 (L4-2) : côté et épaisseur de la barre montrée en annotation (`annotationBarOf`, la même que le rendu
  // d'`App.tsx`), mesurés dans la page (px CSS) ; sans elle, `querySelector` rendait null et la bande prenait 64 px.
  const measureBar = (): { readonly dock: Dock; readonly thickness: number } => {
    const bar = annotationBarOf(active.profile());
    const dock: Dock = bar === null ? "top" : bar.dock;
    const el = bar === null ? null : document.querySelector(`[data-toolbar="${CSS.escape(bar.id)}"]`);
    const r = el?.getBoundingClientRect();
    const thickness = r === undefined ? 64 : Math.ceil(dock === "top" || dock === "bottom" ? r.height : r.width);
    return { dock, thickness };
  };
```

- [ ] **Étape 7 : vérifier le vert** — commande de l'étape 5 (journal `T6-app.log`), puis la commande bornée de la
  section (suite web entière par `suite-vm`). Attendu : preuve de la section. Une rougeur hors de la liste des
  retouches : relever le test et ses 30 lignes de journal, s'arrêter (G4).

- [ ] **Étape 8 : tsc** —
  `cd /home/adminjd/projets/roomboard-wt/design-l4--T6 && export TMPDIR=$HOME/.cache/tmp/of48-tmp && nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit > "$TMPDIR/T6-tsc.log" 2>&1; echo "tsc code $?"; tail -20 "$TMPDIR/T6-tsc.log"`
  Attendu : `tsc code 0`.

- [ ] **Étape 9 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l4--T6
git add apps/web/src/toolbar-profiles.ts
git add apps/web/src/toolbar-profiles.test.ts
git add apps/web/src/ui/App.tsx
git add apps/web/src/ui/App.test.tsx
git add apps/web/src/main.ts
git add apps/web/src/ui/ProfileEditor.tsx
git add apps/web/src/ui/ProfileEditor.test.tsx
git add apps/web/src/profile-edit.test.ts
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(profiles): annotation toolbars in shipped profiles, shown only in annotation, measured for the shell band" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport de la tâche : suite web (fichiers, tests), liste exacte des retouches de forme faites (à citer dans la PR),
ligne `Réutilisation : …`.

---

### Tâche T7 — Branchements : réglage du cadre, bandeau dans l'application
<a id="tache-t7"></a>

**Objectif.** Brancher dans l'application ce que T3 et T4 ont construit (cadrage L4-13, L4-14, L4-16) : `Toasts` monté
dans la case de la scène, effacé à l'entrée en annotation et caché en annotation ; réglages de l'appareil donnés au
panneau Réglages seulement avec la capacité d'annotation (H10) ; `main.ts` crée les réglages sur le stockage des
profils et donne `frame` et `sent` au contrôleur ; règles CSS du bandeau.

**Fichiers.**
- Modifier : `apps/web/src/ui/App.tsx` (imports, `AppProps`, effet `:306`, `SettingsPanel` `:416-428`, JSX après
  `{props.stages}`), `apps/web/src/ui/App.test.tsx` (import, `renderApp`, describe ajouté), `apps/web/src/main.ts`
  (imports, `:250-251`, contrôleur `:459-481`, `mountApp` `:490-505`), `apps/web/src/ui/rb.css` (`:70-74`, bloc ajouté),
  `apps/web/src/ui/rb-css.test.ts` (fin)

**Interfaces.**
- Consomme (T3) : `createDeviceSettings(kv: KeyValue | null): DeviceSettings`, `type DeviceSettings`,
  `SettingsPanelProps.device?`. Consomme (T4) : `Toasts(): JSX.Element`, `showToast(m: ToastMessage, ms?: number): void`,
  `clearToast(): void`, `sentToBoardToast(n: number): ToastMessage`. Consomme (T2) : `AnnotationDeps.frame?(): boolean`,
  `AnnotationDeps.sent?(page: number): void`.
- Produit : `AppProps.device?: DeviceSettings` ; CSS `.rb-toasts`, `.rb-toast`, `.rb-toast-ok`, `.rb-toast b`, règle
  `.rb-layout[data-mode="annotation"] > .rb-toasts { display: none; }`.
- Réutilise : `apps/web/src/profile-store.ts:149` — `browserKeyValue(w): KeyValue | null`, le même `settingsKv` que
  `apps/web/src/main.ts:250` (profils), passé à `createDeviceSettings`.
- Rapport : `Réutilisation : appelé device-settings.ts, toast.ts, profile-store.ts (settingsKv)` ou
  `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/design-l4--T7 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of48-tmp CARGO_BUILD_JOBS=4 CARGO_TARGET_DIR=/home/adminjd/projets/roomboard-wt/design-l4--T7/target && mkdir -p "$TMPDIR" && node ~/.claude/scripts/vm/suite-vm.cjs -- nice -n 10 pnpm --filter @roomboard/web exec vitest run --reporter=verbose > "$TMPDIR/T7-web.log" 2>&1; echo "code $?"; grep -E "Test Files|Tests |FAIL |×" "$TMPDIR/T7-web.log" | tail -40; grep -E "S3 : Réglages|S4 : bandeau|L4-16" "$TMPDIR/T7-web.log" | head`
Preuve : `code 0`, `Test Files  N passed (N)`, aucun `FAIL ` ni `×`, lignes `S3 : Réglages`, `S4 : bandeau`, `L4-16`
présentes. Puis build web : `✓ built` (étape 6). Test à garder vert : `App.test.tsx:385-401` (aucune `position` dans une
règle `.rb-bar`).

**Preuve visuelle.** Aucune dans la tâche (S3, S4, S5 joués par T8, recadrage du bandeau par T9).

**Contraintes (recopiées).** G1 test rouge d'abord, aucun test supprimé, désactivé ou sauté, aucun seuil changé ·
G2 aucune dépendance ajoutée · G4 retouche de forme admise : `renderApp` (`App.test.tsx`, option `device` ajoutée) ;
toute autre rougeur arrête la tâche · G5 aucun Rust ni CLI · G6 `nice -n 10`,
`CARGO_TARGET_DIR=/home/adminjd/projets/roomboard-wt/design-l4--T7/target`, suite web entière par `suite-vm.cjs`, `tsc` et
build sans · G7 sorties dans `$HOME/.cache/tmp/of48-tmp/T7-*` · G8 auteur
`jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un, aucun push · G9 `App.tsx` sans
`localStorage`, `switch (`, `\d+px` · G10 `.rb-toasts`, `.rb-toast` règles de premier niveau, aucune `position` dans une
règle `.rb-bar` · G12 bandeau « Envoyé au tableau : » + « page N ».

**Interdits.** Les avis d'échec (« capture du bureau impossible… », « rien à envoyer », « ajouté à la page N ») restent
des boîtes (H5) ; aucun réglage du cadre dans le profil ni dans l'adresse.

**Terminé quand.** Suite web verte, build web fait, commit fait.

- [ ] **Étape 0 : préparer le worktree** —
  `cd /home/adminjd/projets/roomboard-wt/design-l4--T7 && mkdir -p $HOME/.cache/tmp/of48-tmp && (test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile > $HOME/.cache/tmp/of48-tmp/T7-install.log 2>&1) && for d in wasm wasm-formats; do test -d apps/web/src/$d || cp -r /home/adminjd/projets/roomboard-wt/design-l4/apps/web/src/$d apps/web/src/$d; done && ls apps/web/src/wasm/roomboard_wasm.d.ts`

- [ ] **Étape 1 : tests (rouges).** `App.test.tsx` : imports
  `import { createDeviceSettings } from "../device-settings";`, `import { sentToBoardToast } from "../platform/annotation-port";`,
  `import { clearToast, showToast } from "./toast";` ; `renderApp` reçoit `device?: AppProps["device"]` dans `opts` et
  passe `{...(opts.device ? { device: opts.device } : {})}` à `<App …/>`. Ajouter en fin de fichier :

```tsx
describe("App — design-l4 : bandeau et réglage du cadre (L4-14, L4-16)", () => {
  afterEach(() => clearToast());
  it("S4 : bandeau dans la case de la scène ; L4-16 : effacé à l'entrée en annotation", async () => {
    const a = fakeAnnotationUi();
    const { container } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    showToast(sentToBoardToast(2));
    expect(container.querySelector(".rb-toasts")?.parentElement).toBe(container.querySelector(".rb-layout"));
    expect(container.querySelector(".rb-toast")?.textContent).toBe("Envoyé au tableau : page 2");
    await a.control.enter();
    expect(container.querySelector(".rb-toast")).toBeNull();
  });
  it("S3 : Réglages, bouton du cadre avec la capacité d'annotation ; absent sans elle (H10)", () => {
    const device = createDeviceSettings(null);
    const on = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, device });
    click(on.container.querySelector('button[data-item="settings"]'));
    const btn = () => on.container.querySelector('button[data-reglage="cadre"]');
    expect(btn()?.textContent).toBe("Cadre de l'annotation : affiché");
    click(btn());
    expect(device.frame()).toBe(false);
    expect(btn()?.textContent).toBe("Cadre de l'annotation : masqué");
    const off = renderApp({ device: createDeviceSettings(null) });
    click(off.container.querySelector('button[data-item="settings"]'));
    expect(off.container.querySelector('button[data-reglage="cadre"]')).toBeNull();
  });
});
```

  `rb-css.test.ts`, en fin de fichier :

```ts
describe("rb.css (design-l4, L4-16)", () => {
  it("L4-16 : bandeau dans la case de la scène, en bas à droite, 24 px des bords, inerte ; carte blanche, pastille 32 px succès", () => {
    expect(rule(".rb-toasts")).toMatch(/grid-area: stage;.*align-self: end;.*justify-self: end;.*margin: 24px;.*z-index: 4;.*pointer-events: none;/);
    expect(rule(".rb-toast")).toMatch(/display: flex;.*align-items: center;.*gap: 12px;.*padding: 12px 16px;.*background: var\(--rf-white\);.*border-radius: var\(--rf-radius-xl\);.*box-shadow: 0 0 0 1px var\(--rf-gray-300\), var\(--rf-shadow-hover\);.*font-size: 16px;.*color: var\(--rf-gray-800\);/);
    expect(rule(".rb-toast-ok")).toMatch(/inline-size: 32px;.*block-size: 32px;.*border-radius: 50%;.*background: var\(--rf-success\);.*color: var\(--rf-white\);/);
    expect(rule(".rb-toast b")).toMatch(/font-weight: 600;.*color: var\(--rf-violet-700\);/);
  });
  it("L4-16 : bandeau caché en annotation (fenêtre principale réduite à la barre)", () => {
    expect(CSS).toMatch(/\.rb-layout\[data-mode="annotation"\] > \.rb-toasts \{ display: none; \}/);
  });
});
```

- [ ] **Étape 2 : vérifier le rouge** —
  `cd /home/adminjd/projets/roomboard-wt/design-l4--T7 && export TMPDIR=$HOME/.cache/tmp/of48-tmp && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/App.test.tsx src/ui/rb-css.test.ts --reporter=verbose > "$TMPDIR/T7-app.log" 2>&1; echo "code $?"; grep -E "×|Tests " "$TMPDIR/T7-app.log" | tail -20`
  Attendu : `code 1`, rouges sur les 4 tests ajoutés.

- [ ] **Étape 3 : application.** `App.tsx` : imports `import type { DeviceSettings } from "../device-settings";`,
  `import { Toasts } from "./Toasts";`, `import { clearToast } from "./toast";` ; dans `AppProps`, après `library` :

```tsx
  /** design-l4 (L4-14) : réglages de l'appareil ; donnés au panneau Réglages seulement avec la capacité d'annotation
   *  (H10) ; absents (tests anciens) : aucun bouton du cadre. */
  readonly device?: DeviceSettings;
```

  remplacer l'effet `:306` par :

```tsx
  // Panneau fermé et bandeau effacé à l'entrée (L4-16) ; profil renvoyé à `annotate` s'il change pendant l'annotation (RF5).
  createEffect(
    on(
      annotating,
      (a) => {
        if (!a) return;
        setPanel(null);
        clearToast();
      },
      { defer: true },
    ),
  );
```

  dans `<SettingsPanel …/>`, après `confirm={(m) => props.shell.confirm(m)}` :
  `{...(props.device !== undefined && props.active.capabilities().desktopAnnotation ? { device: props.device } : {})}` ;
  dans le JSX, juste après `{props.stages}` : `<Toasts />`.

- [ ] **Étape 4 : amorce.** `main.ts` : imports `import { createDeviceSettings } from "./device-settings";`,
  `import { showToast } from "./ui/toast";`, `import { sentToBoardToast } from "./platform/annotation-port";` (import de
  valeur à part de l'import de types existant) ; après `const settingsKv = browserKeyValue(window);` :

```ts
  // design-l4 (L4-14) : réglages de l'appareil, sur le même stockage que les profils (`roomboard.<zone>.<réglage>`).
  const device = createDeviceSettings(settingsKv);
```

  dans l'objet de `createAnnotationController`, après `transparent: support?.transparent ?? true,` :

```ts
          // design-l4 (L4-13, L4-16) : cadre de l'appareil envoyé à `annotate` ; avis d'envoi en bandeau, plus une boîte.
          frame: () => device.frame(),
          sent: (page) => showToast(sentToBoardToast(page)),
```

  et dans l'objet de `mountApp`, après `library: …,` : `device,`.

- [ ] **Étape 5 : CSS.** `rb.css` : commentaire `:70` remplacé par
  `/* C11a (P20), design-l4 (L4-2, L4-16) : en annotation, la fenêtre principale n'est que la barre montrée en annotation. */` ;
  ajouter `.rb-layout[data-mode="annotation"] > .rb-toasts` en dernier sélecteur de la liste `:71-74` (la liste se
  termine par `.rb-layout[data-mode="annotation"] > .rb-popover,` puis `.rb-layout[data-mode="annotation"] > .rb-toasts { display: none; }`) ;
  après la règle `.rb-floating` (`:85`) :

```css
/* design-l4 (L4-16) : bandeau « Envoyé au tableau », dans la case de la scène, en bas à droite ; ne prend aucun clic. */
.rb-toasts { grid-area: stage; align-self: end; justify-self: end; margin: 24px; z-index: 4; pointer-events: none; }
.rb-toast { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--rf-white); border-radius: var(--rf-radius-xl); box-shadow: 0 0 0 1px var(--rf-gray-300), var(--rf-shadow-hover); font-size: 16px; color: var(--rf-gray-800); white-space: nowrap; }
.rb-toast-ok { display: grid; place-items: center; flex: none; inline-size: 32px; block-size: 32px; border-radius: 50%; background: var(--rf-success); color: var(--rf-white); }
.rb-toast b { font-weight: 600; color: var(--rf-violet-700); }
```

- [ ] **Étape 6 : vert, tsc et build** — commande de l'étape 2 (attendu `code 0`), commande bornée de la section, puis
  `cd /home/adminjd/projets/roomboard-wt/design-l4--T7 && export TMPDIR=$HOME/.cache/tmp/of48-tmp && nice -n 10 pnpm --filter @roomboard/web build > "$TMPDIR/T7-build.log" 2>&1; echo "build code $?"; tail -5 "$TMPDIR/T7-build.log"`
  Attendu : preuve de la section ; `build code 0`, `✓ built` (le build passe par `tsc --noEmit`).

- [ ] **Étape 7 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l4--T7
git add apps/web/src/ui/App.tsx
git add apps/web/src/ui/App.test.tsx
git add apps/web/src/main.ts
git add apps/web/src/ui/rb.css
git add apps/web/src/ui/rb-css.test.ts
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(app): wire device frame setting and sent-to-board toast" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport de la tâche : suite web, sortie du build, ligne `Réutilisation : …`.

---

### Tâche T8 — Essai `design-l4`, retouches c11a / c11b, fiches de coque
<a id="tache-t8"></a>

**Objectif.** Essai navigateur neuf `scripts/essais/design-l4-navigateur.mjs` (cadrage L4-20 : S1, S3, S4, S5, S6, et
captures pour T9), branché dans `scripts/verifier.sh --e2e` comme l'essai design L1 ; retouches de forme des essais
c11a et c11b (L4-19) ; section C11a-9 de `c11a-coque.md` (§ 6 bis) et ligne C11b-1 « le cadre violet est absent de
l'image envoyée au tableau » de `c11b-coque.md` (§ 3.3).

**Fichiers.**
- Créer : `scripts/essais/design-l4-navigateur.mjs`
- Modifier : `scripts/essais/c11a-annotation-navigateur.mjs` (`:83`, `:100`, `:109-111`, `:112`, `:121`),
  `scripts/essais/c11b-capture-navigateur.mjs` (aide `waitToast`, `:127-128`, `:182-183`, `:229-231`, `:235-236`, `:252`,
  `:271`, `:295-296`), `scripts/verifier.sh` (`:142-143`), `scripts/tests/verifier-e2e.test.sh` (après la ligne design L1),
  `docs/essais/c11a-coque.md` (avant « Point de durcissement connu »), `docs/essais/c11b-coque.md` (`:9-17`)

**Interfaces.**
- Consomme (T2 à T7) : faux hôte `?annotation=faux` (`dataset` : `annotation`, `pointeur`, `annotationCadre`,
  `annotationBande`) ; segments `button[data-segment="draw|mouse"]` ; ids `ann-desktop-annotation`, `ann-pen`, `ann-rect`,
  `annotation-send`, `annotation-send-new`, `depot-annotation` ; `.rb-toast`, `.rb-toast-ok`, `[data-toast-text]` ;
  bouton `button[data-reglage="cadre"]`.
- Produit : `node scripts/essais/design-l4-navigateur.mjs [--captures] [--dist <dossier> --nom avant]` (code 0, 1, 2 ;
  `design L4 : OK`) ; avec `--captures` : `docs/essais/design-l4-<nom>-barre.png`, `design-l4-<nom>-simple.png`, et
  pour l'après `design-l4-apres-bandeau.png`, `design-l4-maquette-barre.png`, `design-l4-maquette-bandeau.png`.
- Réutilise : `scripts/essais/nettete.mjs` — `pixelsOf(page, clip)`, `edgeRow(px, y, x0, x1, bg, ink, tol?)`,
  `fringes(px, bg, ink, tol?)`, `hex(s)`, appelés tels quels.
- Réutilise : `scripts/essais/commun.mjs` — `serve({ dist })`, `loadPlaywright()`, `item(id)`, `frames(page)`, `gitSha()`,
  `VIEWPORT`, `TAB`, `ROOT`, `DIST`, `Echec`, appelés tels quels.
- Rapport : `Réutilisation : appelé nettete.mjs, commun.mjs` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/design-l4--T8 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of48-tmp CARGO_BUILD_JOBS=4 CARGO_TARGET_DIR=/home/adminjd/projets/roomboard-wt/design-l4--T8/target && mkdir -p "$TMPDIR" && nice -n 10 node scripts/essais/design-l4-navigateur.mjs > "$TMPDIR/T8-design-l4.log" 2>&1; echo "code $?"; grep -E "^ok|ÉCHEC|: OK|rangée|outil absent" "$TMPDIR/T8-design-l4.log" | tail -60`
Preuve : `code 0`, `design L4 : OK`, `0 pixel intermédiaire`, `0 frange` (Rectangle, segment, bouton plein, zone,
pastille, texte, « page N »), `annotationBande` en `top:` puis `left:`, contre-épreuve ≥ 2 pixels intermédiaires. Puis
`C11a : OK`, `C11b : OK`, `design L1 : OK`, `C1 : OK`, `verifier-e2e.test.sh : OK` (étapes 6 à 8). Tests à garder verts :
`c11a-annotation-navigateur.mjs:115-120` (bascule par `data-item`), `design-l1-navigateur.mjs` (netteté au tableau),
`c1-profils-navigateur.mjs:103-117` (`allVisible` du profil simple), `stageBox(page, 640)` de c11a et c11b.

**Preuve visuelle.** Lectures d'abord, dans `$TMPDIR/T8-design-l4.log` : `rangée du Rectangle en annotation (gris, 2x)`
(attendu `255 … 39 39 39 … 255`), nombre d'icônes calées, `annotationBande`, écarts de position du bandeau (24 px),
écart de 2 px des boutons accolés. Captures : faites par T9.

**Contraintes (recopiées).** G1 essai rouge d'abord pour les retouches (c11a joué avant retouche), aucun essai supprimé,
désactivé ou sauté, aucun seuil changé · G4 retouches de forme seulement, intention gardée : `c11a` l. 83, 100, 121
(`ann-desktop-annotation`), l. 112 (`ann-pen`), l. 109 (`button[data-segment="mouse"]`, message « Souris → … ») ;
`c11b` l. 252, 271 (`ann-desktop-annotation`), l. 229 (`button[data-segment="mouse"]`, message « Souris en figé… »),
l. 127-128, 182-183, 235-236, 295-296 (avis lu dans le bandeau ; l. 180-181 reste une boîte) ; toute autre rougeur
arrête la tâche · G6 `nice -n 10`, `CARGO_TARGET_DIR=/home/adminjd/projets/roomboard-wt/design-l4--T8/target`, essais un
par un (pas de suite complète ici) · G7 sorties dans `$HOME/.cache/tmp/of48-tmp/T8-*`, aucun processus laissé (Chromium,
serveur) · G8 auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un, aucun push · G11 netteté : 0 pixel
intermédiaire, 0 frange · `verifier.sh --e2e` ne passe jamais `--captures`.

**Interdits.** Aucun changement dans `apps/` (un défaut trouvé : rapport et arrêt, l'orchestrateur rouvre la tâche
fautive) ; aucune capture commitée ici (T9) ; ne pas lancer `verifier.sh` complet (T9).

**Terminé quand.** Les cinq essais rendent OK, le test de `verifier.sh` aussi, les deux fiches sont à jour, commit fait.

- [ ] **Étape 0 : préparer le worktree et construire l'application** —
  `cd /home/adminjd/projets/roomboard-wt/design-l4--T8 && mkdir -p $HOME/.cache/tmp/of48-tmp && (test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile > $HOME/.cache/tmp/of48-tmp/T8-install.log 2>&1) && for d in wasm wasm-formats; do test -d apps/web/src/$d || cp -r /home/adminjd/projets/roomboard-wt/design-l4/apps/web/src/$d apps/web/src/$d; done && nice -n 10 pnpm --filter @roomboard/web build > $HOME/.cache/tmp/of48-tmp/T8-build.log 2>&1; echo "build code $?"; tail -3 $HOME/.cache/tmp/of48-tmp/T8-build.log; ls apps/web/dist/index.html`
  Attendu : `build code 0`, `✓ built`, `apps/web/dist/index.html`.

- [ ] **Étape 1 : c11a avant retouche (rouge)** —
  `cd /home/adminjd/projets/roomboard-wt/design-l4--T8 && nice -n 10 node scripts/essais/c11a-annotation-navigateur.mjs > $HOME/.cache/tmp/of48-tmp/T8-c11a-rouge.log 2>&1; echo "code $?"; grep -E "ÉCHEC|: OK" $HOME/.cache/tmp/of48-tmp/T8-c11a-rouge.log | tail -3`
  Attendu : `code 1`, `C11a : ÉCHEC` (le bouton `desktop-annotation` n'est plus dans la barre montrée en annotation).

- [ ] **Étape 2 : retouches c11a.** Ligne 83 : `await page.click(item("ann-desktop-annotation"));` ; ligne 100 :
  `(await page.getAttribute(item("ann-desktop-annotation"), "aria-pressed")) === "true" && (await text(page, item("ann-desktop-annotation"))) === "Quitter l'annotation",` ;
  lignes 109-111 :

```js
  await page.click('button[data-segment="mouse"]');
  await waitBody(page, "pointeur", "mouse");
  check((await body(page, "pointeur")) === "mouse", "S2 : Souris → data-pointeur=mouse");
```

  ligne 112 : `await page.click(item("ann-pen"));` ; ligne 121 : `await page.click(item("ann-desktop-annotation"));`.
  Rejouer (journal `T8-c11a.log`) : attendu `code 0`, `C11a : OK`.

- [ ] **Étape 3 : retouches c11b.** Après `waitDialog` (`:58-65`), ajouter :

```js
/** design-l4 (L4-16) : l'avis d'envoi est lu dans le bandeau, plus dans une boîte. */
async function waitToast(page) {
  const t = page.locator(".rb-toast");
  await t.waitFor({ state: "visible", timeout: 15000 });
  return ((await t.textContent()) ?? "").trim();
}
```

  `:127-128` :

```js
  const avis = await waitToast(page);
  check(avis === "Envoyé au tableau : page 2" && w.dialogs.length === d0, `S1 : bandeau « ${avis} », aucune boîte`);
```

  `:182-183` :

```js
    const b = await waitToast(page);
    check(b === "Envoyé au tableau : page 2" && w.dialogs.length === d0 + 1, `S2 ${label} : puis le bandeau « ${b} »`);
```

  `:229-231` :

```js
  await page.click('button[data-segment="mouse"]');
  await page.waitForTimeout(300);
  check((await body(page, "pointeur")) === "draw", "S3 : Souris en figé : data-pointeur reste draw (pas de clic à travers)");
```

  `:235-236` :

```js
  let avis = await waitToast(page);
  check(avis === "Envoyé au tableau : page 1" && w.dialogs.length === d0, `S3 : bandeau « ${avis} », aucune boîte`);
```

  `:252` et `:271` : `await page.click(item("ann-desktop-annotation"));` ; `:295-296` :

```js
  avis = await waitToast(page);
  check(avis === "Envoyé au tableau : page 1" && w.dialogs.length === d0, `S3 « Annotation au démarrage » : bandeau « ${avis} »`);
```

  Jouer (journal `T8-c11b.log`) : attendu `code 0`, `C11b : OK`.

- [ ] **Étape 4 : écrire l'essai** `scripts/essais/design-l4-navigateur.mjs` :

```js
#!/usr/bin/env node
// Essai design L4 au navigateur (docs/plans/design-l4-cadrage.md, L4-20 ; S1, S3, S4, S5, S6) : barre d'annotation
// seule en annotation, commande segmentée Dessin / Souris (double clic sans retour), bande de la coque, cadre
// désactivable gardé sur l'appareil, bandeau « Envoyé au tableau » sans boîte, barre verticale du profil Simple,
// netteté du § 10 du cadrage design en annotation (calage, bord du Rectangle, franges du segment enfoncé, du bouton
// plein, de la zone et du bandeau, contre-épreuve). Faux hôte `?annotation=faux`, `?fichiers=repli`. Chromium de
// Playwright, --disable-lcd-text, --force-color-profile=srgb. Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Joué par scripts/verifier.sh --e2e, jamais avec --captures.
// Usage : node scripts/essais/design-l4-navigateur.mjs [--captures] [--dist <dossier> --nom avant]
//   --captures : docs/essais/design-l4-<nom>-barre.png et design-l4-<nom>-simple.png (barre montrée en annotation, 2x) ;
//                pour l'après, design-l4-apres-bandeau.png et les recadrages de la maquette 02
//                (design-l4-maquette-barre.png, design-l4-maquette-bandeau.png) ; --dist : sert un autre build ;
//                --nom avant : captures seules, mesures sautées.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DIST, Echec, ROOT, TAB, VIEWPORT, frames, gitSha, item, loadPlaywright, serve } from "./commun.mjs";
import { edgeRow, fringes, hex, pixelsOf } from "./nettete.mjs";

const LABEL = "design L4";
const VIEW = { width: 1920, height: 1080 };
const TALL = { width: 1280, height: 1080 };
const ARGS = ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"];
const LAYOUT = ".rb-layout";
const ANN = '[data-toolbar="annotation"]';
const SHOWN_BAR = `${LAYOUT}[data-mode="annotation"] .rb-bar`;
const SEG = (m) => `button[data-segment="${m}"]`;
const TOAST = ".rb-toast";
const FRAME = 'button[data-reglage="cadre"]';
const WHITE = hex("#ffffff");
const NAVY = hex("#182946");
const VIOLET_100 = hex("#EDE8FD");
const VIOLET_600 = hex("#6044EB");
const VIOLET_700 = hex("#4F35C4");
const GRAY_800 = hex("#333333");
const SUCCESS = hex("#27AE60");
const MAQUETTE = join(ROOT, "docs", "design", "maquettes", "02-annotation-bureau");
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const check = (cond, msg) => {
  if (!cond) throw new Echec(msg);
  console.log(`ok — ${msg}`);
};

function watch(page) {
  const errors = [];
  const dialogs = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("dialog", async (d) => {
    dialogs.push({ type: d.type(), message: d.message() });
    await d.accept();
  });
  return { errors, dialogs };
}
const noErrors = (w, label) => check(w.errors.length === 0, `${label} : aucune erreur dans la page${w.errors.length ? ` : ${w.errors.join(" | ")}` : ""}`);
async function ready(page) {
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await frames(page);
}
const body = (page, key) => page.evaluate((k) => document.body.dataset[k] ?? null, key);
async function waitBody(page, key, value) {
  await page.waitForFunction(([k, v]) => document.body.dataset[k] === v, [key, value], { timeout: 15000 });
  await frames(page);
}
async function waitMode(page, mode) {
  await page.waitForSelector(`${LAYOUT}[data-mode="${mode}"]`, { timeout: 15000 });
  await frames(page);
}
async function waitStage(page, name, source) {
  await page.waitForFunction(([n, src]) => new RegExp(src).test(document.querySelector("#stage")?.getAttribute(n) ?? ""), [name, source], { timeout: 15000 });
  await frames(page);
}
const text = async (page, sel) => ((await page.textContent(sel)) ?? "").trim();
/** Barres visibles (`data-toolbar`), dans l'ordre du document. */
const shownBars = (page) =>
  page.$$eval("[data-toolbar]", (els) => els.filter((e) => e.getClientRects().length > 0).map((e) => e.getAttribute("data-toolbar")));
async function enter(page) {
  await page.click(item("desktop-annotation"));
  await waitMode(page, "annotation");
  await waitBody(page, "annotation", "1");
}
async function leave(page) {
  await page.click(item("ann-desktop-annotation"));
  await waitMode(page, "board");
}
async function chooseProfile(page, id) {
  await page.click(item("profiles"));
  await page.waitForSelector("[data-profiles]", { timeout: 15000 });
  await page.click(`[data-profile="${id}"]`);
  await frames(page);
}
/** Zone de capture en px CSS entiers, élargie au pixel entier qui contient la boîte. */
const clipOf = (b) => {
  const x = Math.floor(b.x);
  const y = Math.floor(b.y);
  return { x, y, width: Math.ceil(b.x + b.width) - x, height: Math.ceil(b.y + b.height) - y };
};
const iconPixels = async (page, sel) => pixelsOf(page, await page.locator(`${sel} svg.rb-icon`).boundingBox());

/** (1) Calage : chaque svg.rb-icon visible sous `scope` a x et y × 2 entiers et mesure 24 × 24. */
async function calage(page, scope, label, min) {
  const boxes = await page.$$eval(`${scope} svg.rb-icon`, (els) =>
    els.filter((e) => e.getClientRects().length > 0).map((e) => {
      const r = e.getBoundingClientRect();
      return { icon: e.getAttribute("data-icon"), x: r.x, y: r.y, w: r.width, h: r.height };
    }));
  const bad = boxes.filter((b) => !Number.isInteger(b.x * 2) || !Number.isInteger(b.y * 2) || b.w !== 24 || b.h !== 24);
  check(boxes.length >= min && bad.length === 0, `calage (${label}) : ${boxes.length} icônes sur la grille de pixels${bad.length ? `, hors grille : ${JSON.stringify(bad)}` : ""}`);
}

/** (4) Contre-épreuve : un témoin sans calage (viewBox 0 0 24 24) doit montrer du flou, sinon la mesure est aveugle. */
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
  const row = edgeRow(px, 24, 0, px.width, WHITE, NAVY);
  console.log(`contre-épreuve (viewBox 0 0 24 24, gris) : ${row.gray.join(" ")}`);
  await page.evaluate(() => document.getElementById("temoin-nettete")?.remove());
  check(row.intermediate >= 2, `contre-épreuve : le témoin sans calage donne ${row.intermediate} pixels intermédiaires (≥ 2), la mesure n'est pas aveugle`);
}

/** S1 : barre d'annotation seule, commande segmentée, double clic sans retour, bande de la coque, retour au tableau. */
async function s1(browser, base) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli&annotation=faux`);
  await ready(page);
  check(JSON.stringify(await shownBars(page)) === '["outils","pages"]', "S1 tableau : barres outils et pages, aucune barre d'annotation");
  await enter(page);
  const bars = await shownBars(page);
  check(JSON.stringify(bars) === '["annotation"]' && (await page.locator('[data-role="annotation"]').count()) === 1, `S1 : seule la barre d'annotation est montrée (${bars})`);
  check((await page.getAttribute(SEG("draw"), "aria-pressed")) === "true" && (await page.getAttribute(SEG("mouse"), "aria-pressed")) === "false", "S1 : « Dessin » enfoncé à l'entrée");
  await page.click(SEG("mouse"));
  await waitBody(page, "pointeur", "mouse");
  check((await page.getAttribute(SEG("mouse"), "aria-pressed")) === "true", "S1 : « Souris » → data-pointeur=mouse, « Souris » enfoncé");
  await page.dblclick(SEG("draw"));
  await waitBody(page, "pointeur", "draw");
  await page.waitForTimeout(300);
  await frames(page);
  check((await body(page, "pointeur")) === "draw" && (await page.getAttribute(SEG("draw"), "aria-pressed")) === "true", "S1 : double clic sur « Dessin » : reste en dessin (aucun retour à la souris)");
  const h = await page.locator(ANN).evaluate((e) => Math.ceil(e.getBoundingClientRect().height));
  const bande = await body(page, "annotationBande");
  check(bande === `top:${h}`, `S1 : bande de la coque = barre d'annotation (annotationBande ${bande}, attendu top:${h})`);
  await leave(page);
  const after = await shownBars(page);
  check(
    JSON.stringify(after) === '["outils","pages"]' && (await page.locator("button[data-segment]").count()) === 0 && (await page.locator(item("annotation-pointer")).count()) === 0,
    `S1 : à la sortie, la barre d'outils revient, sans barre d'annotation ni « Souris » (${after})`,
  );
  noErrors(w, "S1");
  await ctx.close();
}

/** S3 : cadre désactivable, gardé sur l'appareil ; absent au web sans faux hôte. */
async function s3(browser, base) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  await page.click(item("settings"));
  await page.waitForSelector("#reglages", { timeout: 15000 });
  check((await page.locator(FRAME).count()) === 0, "S3 web sans faux hôte : aucun bouton du cadre");
  await page.goto(`${base}/?fichiers=repli&annotation=faux`);
  await ready(page);
  await page.click(item("settings"));
  await page.waitForSelector(FRAME, { timeout: 15000 });
  check((await text(page, FRAME)) === "Cadre de l'annotation : affiché", "S3 : « Cadre de l'annotation : affiché »");
  await page.click(FRAME);
  check((await text(page, FRAME)) === "Cadre de l'annotation : masqué", "S3 : un clic → « Cadre de l'annotation : masqué »");
  await enter(page);
  check((await body(page, "annotationCadre")) === "0", "S3 : cadre masqué → annotationCadre=0");
  await leave(page);
  await page.reload();
  await ready(page);
  await page.click(item("settings"));
  await page.waitForSelector(FRAME, { timeout: 15000 });
  check((await text(page, FRAME)) === "Cadre de l'annotation : masqué", "S3 : après rechargement, toujours masqué (gardé sur l'appareil)");
  await page.click(FRAME);
  check((await text(page, FRAME)) === "Cadre de l'annotation : affiché", "S3 : réaffiché");
  await enter(page);
  check((await body(page, "annotationCadre")) === "1", "S3 : cadre affiché → annotationCadre=1");
  await leave(page);
  noErrors(w, "S3");
  await ctx.close();
}

/** S4 : « Envoyer au tableau » et le bouton accolé : bandeau en bas à droite de la scène, aucune boîte. */
async function s4(browser, base) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli&annotation=faux&encre=1`);
  await ready(page);
  await page.click(item("page-add"));
  await waitStage(page, "data-page", "^2/2$");
  await page.click(item("page-prev"));
  await waitStage(page, "data-page", "^1/2$");
  await enter(page);
  const d0 = w.dialogs.length;
  await page.click(item("annotation-send"));
  await waitMode(page, "board");
  await page.locator(TOAST).waitFor({ state: "visible", timeout: 15000 });
  const t = await text(page, TOAST);
  check(t === "Envoyé au tableau : page 2", `S4 : bandeau « ${t} »`);
  await waitStage(page, "data-page", "^2/3$");
  check(w.dialogs.length === d0, `S4 : le tableau revient sur la page 2 de 3, aucune boîte (${w.dialogs.length - d0})`);
  const tb = await page.locator(TOAST).boundingBox();
  const sb = await page.locator(".rb-stages").boundingBox();
  const right = sb.x + sb.width - (tb.x + tb.width);
  const bottom = sb.y + sb.height - (tb.y + tb.height);
  check(Math.abs(right - 24) <= 1 && Math.abs(bottom - 24) <= 1, `S4 : bandeau en bas à droite de la scène (${right} px à droite, ${bottom} px en bas ; 24 attendus)`);
  await page.locator(TOAST).waitFor({ state: "detached", timeout: 7000 });
  check(true, "S4 : le bandeau part seul");
  await enter(page);
  const d1 = w.dialogs.length;
  await page.click(item("annotation-send-new"));
  await waitMode(page, "board");
  await page.locator(TOAST).waitFor({ state: "visible", timeout: 15000 });
  check((await text(page, TOAST)) === "Envoyé au tableau : page 1", "S4 : bouton accolé : bandeau « Envoyé au tableau : page 1 »");
  check(((await page.locator(`${TAB}[aria-selected="true"]`).textContent()) ?? "").includes("Capture du bureau"), "S4 : onglet « Capture du bureau » montré");
  check(w.dialogs.length === d1, "S4 : aucune boîte (nouvel onglet)");
  await enter(page);
  check((await page.locator(TOAST).count()) === 0, "S4 : bandeau effacé à l'entrée en annotation");
  await leave(page);
  noErrors(w, "S4");
  await ctx.close();
}

/** S5 : netteté § 10 en annotation, 1920 × 1080 à 2x. */
async function s5(browser, base) {
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli&annotation=faux&encre=1`);
  await ready(page);
  await enter(page);
  await page.mouse.move(VIEW.width - 10, VIEW.height - 10);
  await frames(page);
  await calage(page, ANN, "barre d'annotation, M", 14);
  const px = await iconPixels(page, item("ann-rect"));
  check(px.width === 48 && px.height === 48, `capture de l'icône Rectangle : ${px.width} × ${px.height} pixels (48 × 48)`);
  const y = 24;
  const bg = [px.data[y * px.width * 4], px.data[y * px.width * 4 + 1], px.data[y * px.width * 4 + 2]];
  const row = edgeRow(px, y, 0, px.width, bg, NAVY);
  console.log(`rangée du Rectangle en annotation (gris, 2x) : ${row.gray.join(" ")}`);
  check(row.intermediate === 0, `bord du Rectangle : 0 pixel intermédiaire (${row.intermediate})`);
  check(JSON.stringify(row.runs) === "[3,3]", `bord du Rectangle : deux traits de 3 pixels d'encre (${JSON.stringify(row.runs)})`);
  check(fringes(px, bg, NAVY) === 0, "Rectangle : 0 frange colorée");
  const seg = fringes(await iconPixels(page, SEG("draw")), VIOLET_100, VIOLET_700);
  check(seg === 0, `segment « Dessin » enfoncé (#4F35C4 sur #EDE8FD) : 0 frange (${seg})`);
  const send = fringes(await iconPixels(page, item("annotation-send")), VIOLET_600, WHITE);
  check(send === 0, `« Envoyer au tableau » (blanc sur #6044EB) : 0 frange (${send})`);
  const drop = fringes(await iconPixels(page, '[data-item="depot-annotation"]'), WHITE, NAVY);
  check(drop === 0, `zone de dépôt : 0 frange (${drop})`);
  await counterProof(page);
  await page.click(item("annotation-send"));
  await waitMode(page, "board");
  await page.locator(TOAST).waitFor({ state: "visible", timeout: 15000 });
  await page.mouse.move(10, VIEW.height / 2);
  await frames(page);
  await calage(page, TOAST, "bandeau", 1);
  const ok = fringes(await iconPixels(page, ".rb-toast-ok"), SUCCESS, WHITE);
  check(ok === 0, `pastille du bandeau (blanc sur #27AE60) : 0 frange (${ok})`);
  const txt = fringes(await pixelsOf(page, clipOf(await page.locator(`${TOAST} [data-toast-text]`).boundingBox())), WHITE, GRAY_800);
  check(txt === 0, `texte du bandeau (#333333 sur blanc) : 0 frange (${txt})`);
  const strong = fringes(await pixelsOf(page, clipOf(await page.locator(`${TOAST} b`).boundingBox())), WHITE, VIOLET_700);
  check(strong === 0, `« page N » du bandeau (#4F35C4 sur blanc) : 0 frange (${strong})`);
  noErrors(w, "S5");
  await ctx.close();
}

/** Boutons de la barre d'annotation : boîtes en px CSS. */
const annButtons = (page) =>
  page.locator(`${ANN} button`).evaluateAll((bs) =>
    bs.map((b) => {
      const r = b.getBoundingClientRect();
      return { id: b.dataset.item ?? b.dataset.segment ?? b.textContent, x: r.x, y: r.y, w: r.width, h: r.height };
    }));

/** S6 : profil Simple en annotation, barre verticale (D3 : une colonne contrôlée en 1280 × 1080). */
async function s6(browser, base) {
  for (const viewport of [VIEWPORT, TALL]) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const w = watch(page);
    const size = `${viewport.width} × ${viewport.height}`;
    await page.goto(`${base}/?fichiers=repli&annotation=faux`);
    await ready(page);
    await chooseProfile(page, "simple");
    await enter(page);
    const bars = await shownBars(page);
    check(JSON.stringify(bars) === '["annotation"]' && (await page.locator(`${ANN}[data-dock="left"]`).count()) === 1, `S6 ${size} : la barre d'annotation à gauche est la seule barre (${bars})`);
    const wpx = await page.locator(ANN).evaluate((e) => Math.ceil(e.getBoundingClientRect().width));
    const bande = await body(page, "annotationBande");
    check(bande === `left:${wpx}`, `S6 ${size} : annotationBande ${bande} (attendu left:${wpx})`);
    const boxes = await annButtons(page);
    const out = boxes.filter((b) => b.x < 0 || b.y < 0 || b.x + b.w > viewport.width || b.y + b.h > viewport.height);
    check(boxes.length >= 10 && out.length === 0, `S6 ${size} : ${boxes.length} boutons, chacun entier dans la fenêtre${out.length ? ` (coupés : ${out.map((b) => b.id).join(", ")})` : ""}`);
    if (viewport === TALL) {
      const xs = [...new Set(boxes.map((b) => Math.round(b.x)))];
      check(xs.length === 1, `S6 ${size} : une seule colonne (x ${xs.join(", ")})`);
      const draw = await page.locator(SEG("draw")).boundingBox();
      const mouse = await page.locator(SEG("mouse")).boundingBox();
      check(Math.abs(mouse.x - draw.x) < 0.5 && Math.abs(mouse.y - (draw.y + draw.height)) < 0.5, `S6 : « Souris » sous « Dessin », collé (${draw.y + draw.height} → ${mouse.y})`);
      const send = await page.locator(item("annotation-send")).boundingBox();
      const sendNew = await page.locator(item("annotation-send-new")).boundingBox();
      const gap = sendNew.y - (send.y + send.height);
      check(Math.abs(gap - 2) < 0.5 && Math.abs(sendNew.x - send.x) < 0.5, `S6 : « Envoyer dans un nouvel onglet » 2 px sous « Envoyer au tableau » (${gap} px)`);
    }
    await leave(page);
    noErrors(w, `S6 ${size}`);
    await ctx.close();
  }
}

/** Captures à 2x (T9) : barre montrée en annotation (profil par défaut, puis Simple) ; pour l'après, le bandeau. */
async function captureSet(browser, base, nom) {
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const out = (n) => join(ROOT, "docs", "essais", `design-l4-${nom}-${n}.png`);
  await page.goto(`${base}/?fichiers=repli&annotation=faux&encre=1`);
  await ready(page);
  await enter(page);
  await page.mouse.move(VIEW.width - 10, VIEW.height - 10);
  await frames(page);
  await page.locator(SHOWN_BAR).first().screenshot({ path: out("barre") });
  if (nom !== "avant") {
    await page.click(item("annotation-send"));
    await waitMode(page, "board");
    await page.locator(TOAST).waitFor({ state: "visible", timeout: 15000 });
    await page.mouse.move(10, VIEW.height / 2);
    await frames(page);
    const t = await page.locator(TOAST).boundingBox();
    await page.screenshot({ path: out("bandeau"), clip: { x: t.x - 16, y: t.y - 16, width: t.width + 32, height: t.height + 32 } });
  }
  await page.goto(`${base}/?fichiers=repli&annotation=faux`);
  await ready(page);
  await chooseProfile(page, "simple");
  await enter(page);
  await page.mouse.move(VIEW.width - 10, VIEW.height - 10);
  await frames(page);
  await page.locator(SHOWN_BAR).first().screenshot({ path: out("simple") });
  console.log(`captures : ${out("barre")}, ${nom === "avant" ? "" : `${out("bandeau")}, `}${out("simple")}`);
  await ctx.close();
}

/** Recadrages de docs/design/maquettes/02-annotation-bureau.png (3840 × 2160) : îlot de la barre et bandeau, boîtes lues
 *  dans la maquette HTML à 1x, découpées à 2x dans le PNG. */
async function maquetteCrops(browser) {
  const html = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
  const p1 = await html.newPage();
  await p1.goto(pathToFileURL(`${MAQUETTE}.html`).href);
  const boxes = { barre: await p1.locator(".island").boundingBox(), bandeau: await p1.locator(".toast").boundingBox() };
  await html.close();
  const png = await browser.newContext({ viewport: { width: 3840, height: 2160 }, deviceScaleFactor: 1 });
  const p2 = await png.newPage();
  await p2.setContent(`<body style="margin:0"><img id="m" style="display:block" src="data:image/png;base64,${readFileSync(`${MAQUETTE}.png`).toString("base64")}"></body>`);
  await p2.locator("#m").evaluate((img) => img.decode());
  for (const [n, b] of Object.entries(boxes)) {
    const clip = { x: Math.max(0, Math.floor(b.x * 2) - 16), y: Math.max(0, Math.floor(b.y * 2) - 16), width: Math.ceil(b.width * 2) + 32, height: Math.ceil(b.height * 2) + 32 };
    const path = join(ROOT, "docs", "essais", `design-l4-maquette-${n}.png`);
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
  }
}

process.exitCode = await main();
```

- [ ] **Étape 5 : jouer l'essai** — commande bornée de la section. Attendu : preuve de la section. Un échec de mesure
  (frange, calage, bande) : relever la ligne `ÉCHEC` et les valeurs lues, s'arrêter (aucun seuil changé, G1).

- [ ] **Étape 6 : brancher dans `verifier.sh`.** Après `  echo "design L1 : OK"` (`:143`) :

```bash
  node scripts/essais/design-l4-navigateur.mjs
  echo "design L4 : OK"
```

  `scripts/tests/verifier-e2e.test.sh`, après la ligne `nettete.test.mjs` :

```bash
# design L4 : ligne à part, comme design L1.
grep -q "scripts/essais/design-l4-navigateur.mjs" scripts/verifier.sh || ko "design-l4-navigateur absent de verifier.sh"
```

  Puis `cd /home/adminjd/projets/roomboard-wt/design-l4--T8 && bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -5` ;
  attendu `verifier-e2e.test.sh : OK`.

- [ ] **Étape 7 : fiches de coque.** `docs/essais/c11b-coque.md`, section C11b-1 : remplacer la ligne
  `- [ ] Avis « envoyé au tableau : page 2 » ; Ctrl+Z retire la page entière (fond et encre) en une fois ; Ctrl+Y la remet.`
  par
  `- [ ] Bandeau « Envoyé au tableau : page 2 » en bas à droite de la scène, aucune boîte système (design L4) ; Ctrl+Z retire la page entière (fond et encre) en une fois ; Ctrl+Y la remet.`
  et ajouter, après la ligne « Dans l'image du fond : ni la barre RoomBoard… » :
  `- [ ] Design L4 : le cadre violet est absent de l'image envoyée au tableau (aucun liseré violet sur les bords de l'image ; cadre affiché dans Réglages).`
  `docs/essais/c11a-coque.md`, avant `## Point de durcissement connu` :

```markdown
## C11a-9 — Design L4 : barre d'annotation, commande segmentée, cadre (Windows 10, Windows 11, macOS 14, Linux X11)
- [ ] C11a-1 : la bande est la barre d'annotation (Dessin / Souris, Stylo, Gomme… « Quitter l'annotation »), pas la barre d'outils, à sa juste épaisseur, du côté de son emplacement ; profil « Simple (grands boutons) » : bande à gauche, grands boutons, rien de coupé.
- [ ] C11a-3 : la commande segmentée montre l'état présent (« Dessin » ou « Souris » enfoncé) ; « Souris » laisse cliquer le bureau, « Dessin » rend l'encre ; un double clic sur un segment ne revient pas en arrière ; le cadre ne bloque aucun clic à travers.
- [ ] C11a-4 : sortir par « Quitter l'annotation » de la barre d'annotation, par Échap, par Alt+F4 (Cmd+W sur macOS).
- [ ] C11a-5 : déposer une image sur la zone à icône (pointillés) : même comportement qu'avant (« ajouté à la page N »).
- [ ] C11a-6 : « Écran suivant » : le cadre suit l'écran de l'annotation.
- [ ] C11a-8 : fenêtre maximisée, entrer puis sortir : elle redevient maximisée.
- [ ] Cadre violet de 3 px, net, visible tout autour de la zone d'annotation, à 100 %, 150 % et 200 % (noter un bord adouci à 150 %, H15) ; la bande de la barre n'est pas bordée (H4).
- [ ] Réglages › « Cadre de l'annotation : masqué » : aucun cadre à l'entrée suivante ; relancer RoomBoard : toujours masqué ; « affiché » : le cadre revient.
- [ ] Infobulle d'un bouton de la bande (survol) : visible ou rognée ? Le noter (H14).
- [ ] Après « Envoyer au tableau » : le bandeau « Envoyé au tableau : page N » en bas à droite de la scène, aucune boîte système ; il part seul après 4 s.
- [ ] C11b-1 de `c11b-coque.md` (ligne design L4) : aucun liseré violet dans l'image envoyée.
```

- [ ] **Étape 8 : essais à garder verts** — un par un, journaux `T8-<nom>.log` :
  `cd /home/adminjd/projets/roomboard-wt/design-l4--T8 && for e in c11a-annotation c11b-capture design-l1 c1-profils; do nice -n 10 node scripts/essais/$e-navigateur.mjs > $HOME/.cache/tmp/of48-tmp/T8-$e.log 2>&1; echo "$e code $?"; grep -E ": OK|ÉCHEC" $HOME/.cache/tmp/of48-tmp/T8-$e.log | tail -2; done`
  Attendu : quatre `code 0`, `C11a : OK`, `C11b : OK`, `design L1 : OK`, `C1 : OK`.

- [ ] **Étape 9 : aucun processus restant** —
  `pgrep -fa "navigateur.mjs|chrome-headless|ms-playwright" | grep -v pgrep || echo "aucun processus"`.

- [ ] **Étape 10 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l4--T8
git add scripts/essais/design-l4-navigateur.mjs
git add scripts/essais/c11a-annotation-navigateur.mjs
git add scripts/essais/c11b-capture-navigateur.mjs
git add scripts/verifier.sh
git add scripts/tests/verifier-e2e.test.sh
git add docs/essais/c11a-coque.md
git add docs/essais/c11b-coque.md
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "test(essais): design L4 browser trial, c11a/c11b selector and toast reshaping, shell checklists" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport de la tâche : lignes `ok —` clés de l'essai (rangée de gris, franges, `annotationBande`, 24 px, 2 px), liste
exacte des retouches de forme c11a / c11b (à citer dans la PR), ligne `Réutilisation : …`.

---

### Tâche T9 — Captures avant / après, comparaison à la maquette 02, suite complète
<a id="tache-t9"></a>

**Objectif.** Jouer la suite complète une fois (`verifier.sh --e2e`), relever les tailles Wasm, prendre les recadrages
à 2x avant (merge-base 136cbbb) et après, et les recadrages de `docs/design/maquettes/02-annotation-bureau.png`, puis
lister les écarts un par un (cadrage L4-20, § 6 ter ; tous les scénarios et effets de bord).

**Fichiers.**
- Créer : `docs/essais/design-l4-avant-barre.png`, `docs/essais/design-l4-avant-simple.png`,
  `docs/essais/design-l4-apres-barre.png`, `docs/essais/design-l4-apres-bandeau.png`, `docs/essais/design-l4-apres-simple.png`,
  `docs/essais/design-l4-maquette-barre.png`, `docs/essais/design-l4-maquette-bandeau.png`

**Interfaces.**
- Consomme (T8) : `node scripts/essais/design-l4-navigateur.mjs [--captures] [--dist <dossier> --nom avant]`.
- Produit : les 7 PNG ; au rapport, la liste des écarts avec la maquette 02.
- Réutilise : aucun module (exécution).
- Rapport : `Réutilisation : appelé design-l4-navigateur.mjs (captures)`.

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/design-l4--T9 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of48-tmp CARGO_BUILD_JOBS=4 CARGO_TARGET_DIR=/home/adminjd/projets/roomboard-wt/design-l4--T9/target && mkdir -p "$TMPDIR" && node ~/.claude/scripts/vm/suite-vm.cjs -- nice -n 10 bash scripts/verifier.sh --e2e > "$TMPDIR/T9-verifier-e2e.log" 2>&1; echo "code $?"; grep -E "module Wasm|module formats|Tests .*passed|test result|: OK|ÉCHEC|FAIL |error\[" "$TMPDIR/T9-verifier-e2e.log" | tail -60`
Preuve : `code 0` ; `design L4 : OK`, `design L1 : OK`, `C11a annotation : OK`, `C11b capture : OK`,
`verifier.sh : e2e OK`, `verifier.sh : OK` ; `module Wasm : 1375581 octets` et `module formats : 2794511 octets`
(identiques à `grep -E "module (Wasm|formats)" ~/.cache/tmp/of48-ref/verifier-ref.log` ; sinon rapport) ; aucun `FAIL `,
`ÉCHEC`, `error[`, `test result: FAILED`. Effets de bord couverts ici : hauteur de scène (`stageBox(page, 640)` de c7b,
c10a, c10b, c11a, c11b, c12, c13, c14, c16), `allVisible` de c1, barre du tableau sans « Souris » ni « Écran suivant »
(c11a:93), avis d'envoi en bandeau (c11b), bascule (c11a:115-120).

**Preuve visuelle.** Lectures d'abord, dans la sortie de l'essai `--captures` (étape 2) : rangée de gris du Rectangle en
annotation, nombre d'icônes calées, `annotationBande`, franges 0. Puis les captures à décrire au rapport :
`file docs/essais/design-l4-*.png` ; lire (outil Read) `design-l4-apres-barre.png`, `design-l4-maquette-barre.png`,
`design-l4-avant-barre.png`, `design-l4-apres-bandeau.png`, `design-l4-maquette-bandeau.png`, `design-l4-apres-simple.png`,
`design-l4-avant-simple.png`, et lister **écart par écart** ce qui sépare l'après de la maquette, en confirmant ou non
chaque écart attendu du § 6 ter : bande pleine largeur au lieu d'un îlot, pas de poignée (L2) ; Stylo et « Gomme :
partielle » en plus (H1, H19) ; `pen-line` sur « Dessin » (L1-3) ; pastilles en fin de barre (H8) ; bouton accolé `plus`
carré (H3) ; sortie `annotate` enfoncée au lieu de la croix (H9) ; infobulle sombre (H16) ; cadre et bandeau hors de la
barre (C11b P7). Tout écart **non** listé au § 6 ter est signalé à part.

**Contraintes (recopiées).** G5 tailles Wasm avant 1 375 581 / 2 794 511 o (journal de référence
`~/.cache/tmp/of48-ref/verifier-ref.log`), plafonds 1 572 864 / 3 145 728 inchangés, aucun Rust touché · G6 `nice -n 10`,
cargo `-j 4`, `CARGO_TARGET_DIR=/home/adminjd/projets/roomboard-wt/design-l4--T9/target`, suite complète par
`node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` (lancée en fond si elle dépasse 10 min, journal relu), aucun
`tauri build` · G7 temporaires dans `$HOME/.cache/tmp/of48-*`, worktree « avant » dans
`$HOME/.cache/tmp/of48-design-l4-avant` (jamais `/tmp`), retiré par `git worktree remove`, aucun processus laissé ·
G8 auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un, aucun push · G4 `verifier.sh` sans
`--captures` ; aucun test sauté ni seuil changé · G11 netteté 0 pixel intermédiaire, 0 frange.

**Interdits.** Aucun `git worktree remove --force` ; aucun changement de code (un essai rouge : rapport et arrêt,
l'orchestrateur rouvre la tâche fautive) ; aucune autre capture commitée réécrite.

**Terminé quand.** Suite complète verte une fois, tailles Wasm relevées et égales, 7 PNG commités, worktree « avant »
retiré, écarts listés au rapport.

- [ ] **Étape 0 : préparer le worktree** —
  `cd /home/adminjd/projets/roomboard-wt/design-l4--T9 && mkdir -p $HOME/.cache/tmp/of48-tmp && (test -d node_modules/.pnpm || nice -n 10 pnpm install --frozen-lockfile > $HOME/.cache/tmp/of48-tmp/T9-install.log 2>&1); git log --oneline -1`
  (`verifier.sh` reconstruit les modules Wasm dans `CARGO_TARGET_DIR`.)

- [ ] **Étape 1 : suite complète** — commande bornée de la section. Attendu : voir « Preuve ». Un échec : relever la
  ligne `ÉCHEC`/`FAIL ` et les 30 lignes qui la précèdent dans `$TMPDIR/T9-verifier-e2e.log`, s'arrêter.

- [ ] **Étape 2 : captures « après »** (sur le `apps/web/dist` construit par la suite) —
  `cd /home/adminjd/projets/roomboard-wt/design-l4--T9 && nice -n 10 node scripts/essais/design-l4-navigateur.mjs --captures > $HOME/.cache/tmp/of48-tmp/T9-captures.log 2>&1; echo "code $?"; grep -E "capture|rangée|: OK|ÉCHEC" $HOME/.cache/tmp/of48-tmp/T9-captures.log | tail -20`
  Attendu : `code 0`, `design L4 : OK`, `captures : …/design-l4-apres-barre.png, …-apres-bandeau.png, …-apres-simple.png`,
  `capture : …/design-l4-maquette-barre.png`, `…/design-l4-maquette-bandeau.png`.

- [ ] **Étape 3 : build « avant »** (application d'`origin/main` @ 136cbbb) —

```bash
cd /home/adminjd/projets/roomboard-wt/design-l4--T9
AVANT=$HOME/.cache/tmp/of48-design-l4-avant
git worktree add --detach "$AVANT" 136cbbb
cp -r apps/web/src/wasm "$AVANT/apps/web/src/wasm"
cp -r apps/web/src/wasm-formats "$AVANT/apps/web/src/wasm-formats"
(cd "$AVANT" && nice -n 10 pnpm install --frozen-lockfile > $HOME/.cache/tmp/of48-tmp/T9-avant-install.log 2>&1 && nice -n 10 pnpm --filter @roomboard/web build > $HOME/.cache/tmp/of48-tmp/T9-avant-build.log 2>&1; echo "build code $?"; tail -3 $HOME/.cache/tmp/of48-tmp/T9-avant-build.log)
ls "$AVANT/apps/web/dist/index.html"
```

  Attendu : `build code 0`, `✓ built`, `index.html` listé.

- [ ] **Étape 4 : captures « avant »** —
  `cd /home/adminjd/projets/roomboard-wt/design-l4--T9 && nice -n 10 node scripts/essais/design-l4-navigateur.mjs --captures --dist "$HOME/.cache/tmp/of48-design-l4-avant/apps/web/dist" --nom avant 2>&1 | tail -10`
  Attendu : `captures : …/design-l4-avant-barre.png, …/design-l4-avant-simple.png`, `mesures sautées`, code 0.

- [ ] **Étape 5 : retirer le worktree « avant »** —
  `git -C /home/adminjd/projets/roomboard-wt/design-l4--T9 worktree remove "$HOME/.cache/tmp/of48-design-l4-avant" && git -C /home/adminjd/projets/roomboard-wt/design-l4--T9 worktree prune && git -C /home/adminjd/projets/roomboard-wt/design-l4--T9 worktree list`
  Attendu : `of48-design-l4-avant` absent de la liste. S'il refuse (fichiers non suivis) : lister
  `git -C "$HOME/.cache/tmp/of48-design-l4-avant" status --short`, rendre la liste au rapport, ne pas forcer.

- [ ] **Étape 6 : contrôle des images** — `file /home/adminjd/projets/roomboard-wt/design-l4--T9/docs/essais/design-l4-*.png` ;
  attendu 7 fichiers PNG ; la barre « après » mesure au moins 2000 pixels de large (barre de 1920 px CSS à 2x, rognée à
  sa boîte). Puis lectures et liste des écarts (section « Preuve visuelle »).

- [ ] **Étape 7 : aucun processus restant** —
  `pgrep -fa "navigateur.mjs|chrome-headless|ms-playwright|vite" | grep -v pgrep || echo "aucun processus"`.

- [ ] **Étape 8 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l4--T9
git add docs/essais/design-l4-avant-barre.png
git add docs/essais/design-l4-avant-simple.png
git add docs/essais/design-l4-apres-barre.png
git add docs/essais/design-l4-apres-bandeau.png
git add docs/essais/design-l4-apres-simple.png
git add docs/essais/design-l4-maquette-barre.png
git add docs/essais/design-l4-maquette-bandeau.png
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "docs(essais): design L4 before/after crops at 2x and mockup 02 crops" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport de la tâche : tailles Wasm lues, rangée de gris du Rectangle en annotation, liste des écarts avec la maquette 02
(un par ligne, attendu § 6 ter ou non), rappel des retouches de forme à citer dans la PR (T5, T6, T8), gestes à rejouer
en coque (C11a-9, ligne C11b-1).

---

## Relecture du plan (par le planificateur)

- **Couverture du cadrage.** L4-1, L4-2 → T1 (règle), T6 (App, main) ; L4-3 → T6 ; L4-4 → T5 (`CONTEXT_ROLES`), T6
  (`presetsBarId`) ; L4-5, L4-6, L4-7 → T6 ; L4-7 bis → T5 (CSS), T8 (S6) ; L4-8 → T5 ; L4-9 → T2 (contrôleur, hôtes),
  T5 (segment), T6 (relais `pointer` d'App) ; L4-10, L4-11 → T5 ; L4-12 → T2 ; L4-13 → T2 (charge), T7 (`frame` de
  main) ; L4-14 → T3, T7 ; L4-15 → T8 (ligne C11b-1) ; L4-16 → T2 (`sent`), T4, T7 ; L4-17 → T5 (interdits), T8 (c11a
  `Quitter l'annotation`) ; L4-18 → T6 ; L4-19 → T6, T8 ; L4-20 → T8, T9 ; L4-21 → G5 ; L4-22 → T1, T6. Scénarios :
  S1 → T1, T2, T5, T6, T8 ; S2 → T1, T6 ; S3 → T2, T3, T7, T8 ; S4 → T4, T7, T8 ; S5 → T5, T8, T9 ; S6 → T5, T6, T8.
- **Carte d'impact.** Chaque entrée « touché » du § 3 est dans une colonne `fichiers touchés` (§ 3.1 : `toolbar.ts` T1,
  `toolbar-profiles.ts` T6, `App.tsx` T6/T7, `main.ts` T6/T7, `Toolbar.tsx` T5, `IconButton.tsx`/`icons.ts` T5, `rb.css`
  T2/T5/T7, `toolbar-host.ts` T2, `annotation.ts` T2, `annotation-port.ts` T2/T4, `annotation-tauri.ts`/`annotation-fake.ts`
  T2, `annotation-page.ts`/`annotate-start.ts` T2, `device-settings.ts`/`SettingsPanel.tsx` T3, `toast.ts`/`Toasts.tsx`
  T4, `PointerSwitch.tsx` T5, `ProfileEditor.tsx` T6 ; § 3.2 : chaque test dans la tâche de sa zone ; § 3.3 : fiches T8,
  PNG T9, `THIRD_PARTY_NOTICES.md` T5). Effets de bord : barre du tableau (T6 test H7, T9 c11a:93), épaisseur de la
  bande (T1, T8 S1, S6), avis sans boîte (T2, T7, T8 c11b, S4), bascule (T2, T8 S1, c11a), panneau Réglages (T3, T7, S3),
  profils d'utilisateur (T1, T6). Tests à garder verts cités dans la preuve de T2, T5, T6, T7, T8, T9.
- **Modules à réutiliser.** Les 14 lignes du cadrage sont reprises en lignes `Réutilise :` : T1 (toolbar.ts étendu),
  T6 (`itemsForMode`), T5 (`ACTION_STATE`, `IconButton`/`Bubble`/`createTip`, `icons.ts`, commande segmentée sans
  module existant), T2 (bascule, `DocumentPayload`, faux hôte), T3 (stockage, `SettingsPanel`), T4 (avis non modal,
  `ShellPort.notify` non substituable), T8 (`nettete.mjs`, `commun.mjs`) ; plus T7 (`browserKeyValue`). Aucune tâche ne
  crée un module que la liste donne comme existant.
- **Noms d'une tâche à l'autre.** `ANNOTATION_ROLE`, `annotationBarOf`, `pointer(mode)`, `PointerMode`, `frameField`,
  `frame?`, `sent?`, `mountAnnotationFrame`, `annotationCadre`, `annotationBande`, `createDeviceSettings`,
  `DeviceSettings`, `FRAME_KEY`, `FRAME_LABELS`, `ToastMessage`, `showToast`, `clearToast`, `currentToast`, `Toasts`,
  `SENT_TO_BOARD`, `sentToBoardToast`, `PointerSwitch`, `POINTER_SEGMENTS`, `ACTION_RENDER`, `PRIMARY_ACTIONS`,
  `CONTEXT_ROLES`, `Bubble`, classes `rb-seg`, `rb-primary`, `rb-drop`, `rb-annot-frame`, `rb-toasts`, `rb-toast`,
  `rb-toast-ok`, attributs `data-segment`, `data-reglage="cadre"`, `data-toast-text`, ids `ann-*` : mêmes noms partout.
- **Review Focus.** Les cinq lignes ont leur test dans la tâche qui possède le code (T2, T1 + T6, T1 + T6, T7, T3).
