# Plan du lot 5a — Fichiers et coque (socle RoomBoard)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**Spec :** `docs/plans/socle-cadrage.md` (D24 format natif, D25 ZIP dans le cœur, D26 `FileHost`, D27 hors ligne,
D34 essais de plateforme, DA8 ; scénarios S2 — partie fichiers — et S5 ; § 3 « Modules à réutiliser ou à étendre »).
Plan maître : `docs/plans/socle-PLAN.md` (ligne 5a ; table « Si l'essai échoue », échelon 5). État :
`docs/sessions/socle-etat.md` (pièges, constats). Profil : `.claude/chantier.md`.

**But :** ouvrir et enregistrer un `.roomboard` dans les trois hôtes de DA8 (coque Tauri, Chromium avec File System
Access, autres navigateurs en repli), avec l'état « modifié » et la question avant de fermer ; la coque Tauri a ses
plugins, des permissions minimales, une CSP stricte compatible Wasm, rien de distant ; build Linux essayé sur la VM,
fiches d'essai Windows et macOS prêtes.

**Architecture :** tout le code web neuf vit dans `apps/web/src/platform/` : `files.ts` (contrat DA8 et choix de
l'hôte), un fichier par hôte, `pending.ts` (le fichier ouvert traverse un rechargement de la page), `controller.ts`
(commandes, « modifié », fermeture), `mount.ts` (le seul module que `main.ts` appelle). Ouvrir un fichier recharge la
page : le moteur reçoit son document à la création (`apps/web/src/engine/engine.ts:41-42`, `:88-89`) et n'a aucune
API pour en changer ; le lot 4 travaille dans `engine/` en même temps. « Modifié » se lit dans la `version` du
document, déjà publiée par le moteur (`EngineState.version`, `engine.ts:22`, `:119`). La coque (`apps/desktop`) gagne
`tauri-plugin-dialog` et `tauri-plugin-fs` ; elle est hors du workspace Cargo (`Cargo.toml:4-5`), donc hors de
`verifier.sh` : son `clippy -D warnings` se lance à part (T71, T78).

**Tech :** TypeScript 5.9.3 strict (`noUncheckedIndexedAccess`), Vite 6, Vitest 3 (environnement Node, faux objets),
`fake-indexeddb` 6.2.8 ; Tauri 2.12.5, `@tauri-apps/plugin-dialog` / `tauri-plugin-dialog` 2.8.4,
`@tauri-apps/plugin-fs` / `tauri-plugin-fs` 2.7.1 (relevé du 2026-11-19 : crates.io propose des 3.0.0-alpha en
dernier ; on reste en 2.x) ; rustc 1.100 ; Playwright du cache npx et son Chromium, hors `verifier.sh`.

**Référence mesurée sur la base (`origin/main` @ 5341564) :** `verifier.sh` rc=0 en 5 min 18 — Rust 117+3+3+14
(2 ignorés), web 24 fichiers / 319 tests. Fin de lot attendue : web 32 fichiers / 380 tests (319 + 61), Rust inchangé.

## Global Constraints

- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de `--force` (ni push forcé,
  ni autre) ; aucun `git tag`, aucune release ; `.github/workflows/` non touché.
- Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`
  (`git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit …`) ; message en anglais,
  dernière ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Aucun test désactivé ni sauté (`.skip`, `.only`, `.todo`, `#[ignore]` neuf), aucun seuil baissé.
- Aucun fichier sous `apps/web/src/engine/` ni `apps/web/src/ui/` : le lot 4 y travaille en parallèle sur
  `feat/socle-lot4`.
- `export PATH=$HOME/.cargo/bin:$PATH` avant `scripts/verifier.sh` ; la suite se lance au premier plan
  (`timeout: 600000`), jamais en arrière-plan (piège noté dans l'état).
- Builds Tauri (`tauri build`, `cargo build` ou `cargo clippy` de `apps/desktop/src-tauri`) : au plus 2 en même temps
  sur la VM, tous canaux ; avant chacun `pgrep -af "cargo.*tauri|tauri build"`, si deux tournent, attendre ;
  `CARGO_BUILD_JOBS=2`.
- Aucun secret ; dépôt public.
- Worktree neuf : `pnpm install --frozen-lockfile` à la racine avant tout (sauf T70, qui change les dépendances).
- Rapport en français ; relecteur éventuel lancé au premier plan (`run_in_background: false`).

## Review Focus

1. Un trait tracé pendant qu'un enregistrement attend la boîte ou le disque : le document doit rester « modifié »
   (D26, S5) → T76 `trait tracé pendant l'enregistrement : le document reste modifié`.
2. Un fichier qui n'est pas un `.roomboard` (ou plus récent) : message clair, document courant intact, aucun
   rechargement (D24 « refus avec message clair ») → T76 `fichier illisible : message, aucune attente, aucun
   rechargement` ; T77 `fichier en attente illisible : page vide et message qui nomme le fichier` ; essai T77 mode
   `repli`.
3. Deux commandes d'affilée (Ctrl+S tenu, Ctrl+O pendant un enregistrement) : une seule boîte (S5) → T76
   `commande pendant une autre : ignorée, une seule boîte`.
4. Poignée FSA gardée dont la permission est refusée après rechargement : la boîte d'enregistrement s'ouvre, pas
   d'échec muet (D26 « garde la poignée pour Ctrl+S ») → T72 `permission refusée sur la poignée gardée : la boîte
   d'enregistrement s'ouvre`.
5. Fermer la coque avec un document modifié et répondre « Non » : la fenêtre reste (D26, S5) → T74 `fermeture,
   document modifié, réponse Non : la fenêtre reste ouverte`.

## Choix tranchés

| choix | raison | réversible par |
|---|---|---|
| Ouvrir un fichier = le valider (`core.load(...).free()`), le mettre en attente dans IndexedDB, recharger la page ; l'amorce charge l'attente au lieu de `blank()` | le moteur prend son document à la création, sans API de remplacement (`engine.ts:41-42`, `:88-89`), et `engine/` est interdit (lot 4) ; D27 : une fenêtre = une instance Wasm = un document | remplacer `reload` par un échange de document le jour où le moteur en a l'API ; rien d'autre ne change |
| « Modifié » = `version` du document ≠ version enregistrée, version lue **avant** l'écriture | API publique existante (`EngineState.version`, `engine.ts:119`), monotone même à l'annulation (`crates/roomboard-core/src/document.rs:472-480`) ; comparer les octets est faux (le manifeste porte `modified`, D24) ; `canUndo` aussi | annuler jusqu'à l'état enregistré laisse « modifié » (prudent, assumé) |
| Signature DA8 gardée ; « demander où enregistrer » = `SaveTarget` `{ kind: "ask", name }` | DA8 fixe `save(bytes, target)` sans notion d'« Enregistrer sous » | — |
| Un fichier par hôte sous `platform/` ; la règle de DA8 (« appelés seulement par `platform/files.ts` ») tenue au niveau du dossier | trois hôtes testés seuls, fichiers courts | — |
| Réglage `?fichiers=auto|fsa|repli` (défaut `auto`) | même forme que `?echelons=` ; force le repli pour l'essai | l'adresse |
| Poignée FSA gardée à travers le rechargement (IndexedDB, clonage structuré) ; cible non clonable → fichier gardé sans cible | D26 « garde la poignée pour Ctrl+S » ; une fausse poignée de test n'est pas clonable | — |
| Messages par `alert` (navigateur) et `dialog.message` (Tauri) ; indicateur « modifié » dans le titre (`• nom — RoomBoard`) et `#stage[data-modifie]` | `ui/` est interdit et l'interface SolidJS vient au lot 5b | 5b les affiche dans l'interface |
| Ctrl+N lié (Nouveau, utile dans la coque) ; aucun bouton en 5a | D26 cite Nouveau ; Chromium garde Ctrl+N pour lui, sans effet dans la page | 5b ajoute le bouton |
| `beforeBuildCommand: "pnpm --filter @roomboard/web build"` ajouté | piège du lot 3 : la coque embarquait le `dist` présent, même périmé ; le cadrage ne l'interdit pas. Le Wasm n'est pas régénéré (ce serait recopier `verifier.sh`) : s'il manque, la commande échoue en clair | retirer la clé |
| CSP en objet : `script-src 'self' 'wasm-unsafe-eval'`, `style-src 'self' 'unsafe-inline'` avec `dangerousDisableAssetCspModification: ["style-src"]` | `index.html` porte un `<style>` en ligne ; une empreinte ajoutée par Tauri annulerait `'unsafe-inline'` | retirer la clé quand les styles sortiront du HTML (5b) |
| Permissions : `core:default`, `core:window:allow-destroy` (exigée par `onCloseRequested`, qui ferme par `destroy()`), `core:window:allow-set-title`, `dialog:allow-open|save|ask|message`, `fs:allow-read-file`, `fs:allow-write-file`, **aucune portée fs statique** | le plugin dialog ajoute au scope fs les seuls chemins choisis dans la boîte | si T78 prouve un refus « forbidden path », seule correction permise : portée `$HOME/**/*.roomboard`, notée en écart |
| Pas de suffixe `.roomboard` forcé sur le chemin rendu par la boîte Tauri | la portée fs couvre le chemin choisi exact, pas un autre | — |
| Contrôle hors ligne en deux temps : statique dans `verifier.sh` (`scripts/controle-hors-ligne.mjs`), et à l'exécution par l'essai Playwright (requêtes hors `127.0.0.1` comptées = 0) | D27 « vérifiable par un test ou un contrôle scripté » | — |
| `base: './'` dans un nouveau `apps/web/vite.config.ts` | D27 le demande et il n'a jamais été posé (aucun `vite.config.ts` dans `apps/web`) | retirer le fichier |
| `additionalBrowserArgs` de WebView2 (échelon 5) **hors du lot 5a, en attente** | sa condition (« bon dans Edge, mauvais dans WebView2 », mesure par la file du PC) n'est pas remplie : rien de mesuré au vrai stylet (état) ; un réglage WebView2 posé à l'aveugle change Windows sans essai possible depuis la VM | tâche ajoutée quand la mesure arrive |
| Builds Tauri : au plus 2 en même temps | consigne de ce lot (le profil dit encore « un seul ») | — |
| Association de l'extension `.roomboard` reportée | il faut aussi ouvrir le fichier passé au lancement (arguments, `RunEvent::Opened`) : hors D26 | lot ultérieur |
| Essai navigateur dans un nouveau script `scripts/essais/fichiers-navigateur.mjs`, `serve` et `loadPlaywright` recopiés de `s2-navigateur.mjs` | ce dernier lance `main()` à l'import ; la mise en commun revient au 5b (`--e2e`) | 5b |

**Quel mode de l'essai navigateur prouve quoi (T77) :**
- `repli` (`?fichiers=repli`) : la chaîne réelle de S2 côté fichiers — vrai Wasm, téléchargement intercepté,
  `<input type=file>` par le sélecteur de Playwright, attente IndexedDB à travers un vrai rechargement, message sur un
  faux fichier, `beforeunload` d'un document modifié.
- `fsa` (détection automatique, faux `showSaveFilePicker` / `showOpenFilePicker` injectés avant le chargement) : la
  détection choisit FSA sous Chromium ; une seule boîte puis Ctrl+S réécrit la même poignée ; les octets écrits se
  rouvrent. Ne prouve **pas** la boîte du système, les demandes de permission, ni la poignée réelle gardée dans
  IndexedDB (fausse poignée non clonable) : T75 pour la règle, fiche S5 (Chrome, Edge) pour le réel.
- `detection` (sélecteurs retirés de `window`, sans réglage) : le repli est choisi par détection (D33).
- Tous : aucune requête hors de `127.0.0.1` (D27).

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T70 | Contrat `FileHost`, choix de l'hôte, dépendances, `base: './'` | — | apps/web/src/platform/files.ts, apps/web/src/platform/files.test.ts, apps/web/package.json, pnpm-lock.yaml, apps/web/vite.config.ts | isolé | implementeur-tdd | vitest `files.test.ts` : `Tests  5 passed (5)`, nom `choix : auto préfère Tauri puis FSA puis le repli ; repli forcé partout` présent ; `verifier.sh : OK` ; `src="./assets/` dans `apps/web/dist/index.html` | S2 | #tache-t70 |
| T71 | Coque Tauri : plugins, permissions, CSP, `beforeBuildCommand`, contrôle hors ligne, fiches Windows et macOS | — | apps/desktop/src-tauri/Cargo.toml, apps/desktop/src-tauri/Cargo.lock, apps/desktop/src-tauri/src/main.rs, apps/desktop/src-tauri/capabilities/default.json, apps/desktop/src-tauri/tauri.conf.json, scripts/controle-hors-ligne.mjs, scripts/tests/controle-hors-ligne.test.sh, scripts/verifier.sh, docs/essais/coque-windows.md, docs/essais/coque-macos.md | isolé | implementeur-tdd | `controle-hors-ligne.test.sh : 6 cas OK` ; `controle-hors-ligne : OK (` puis `verifier.sh : OK` ; clippy de `src-tauri` `-D warnings` : `Finished`, 0 ligne `warning:` | S5 | #tache-t71 |
| T72 | Hôte Chromium (File System Access) | T70 | apps/web/src/platform/host-fsa.ts, apps/web/src/platform/host-fsa.test.ts | isolé | implementeur-tdd | vitest `host-fsa.test.ts` : `Tests  8 passed (8)`, nom `Ctrl+S sur une cible fsa réécrit la même poignée sans boîte` présent | S5 | #tache-t72 |
| T73 | Hôte de repli et coquille du navigateur | T70 | apps/web/src/platform/host-repli.ts, apps/web/src/platform/host-repli.test.ts, apps/web/src/platform/shell-web.ts, apps/web/src/platform/shell-web.test.ts | isolé | implementeur-tdd | vitest `host-repli.test.ts shell-web.test.ts` : `Tests  10 passed (10)`, noms `aller-retour : le téléchargement puis le sélecteur rendent les mêmes octets` et `beforeunload : retenu seulement si modifié` présents | S2 | #tache-t73 |
| T74 | Hôte et coquille Tauri | T70 | apps/web/src/platform/host-tauri.ts, apps/web/src/platform/host-tauri.test.ts | isolé | implementeur-tdd | vitest `host-tauri.test.ts` : `Tests  11 passed (11)`, nom `fermeture, document modifié, réponse Non : la fenêtre reste ouverte` présent | S5 | #tache-t74 |
| T75 | Fichier ouvert en attente à travers le rechargement (IndexedDB) | T70 | apps/web/src/platform/pending.ts, apps/web/src/platform/pending.test.ts | isolé | implementeur-tdd | vitest `pending.test.ts` : `Tests  7 passed (7)`, nom `cible non clonable (fausse poignée FSA) : fichier gardé sans cible` présent | S2 | #tache-t75 |
| T76 | Contrôleur des fichiers : « modifié », commandes, raccourcis, fermeture | T70 | apps/web/src/platform/controller.ts, apps/web/src/platform/controller.test.ts | isolé | concepteur-critique | vitest `controller.test.ts` : `Tests  16 passed (16)`, nom `trait tracé pendant l'enregistrement : le document reste modifié` présent ; mutation « version lue après l'écriture » rouge | S2, S5 | #tache-t76 |
| T77 | Branchement dans l'amorce et essai des fichiers au navigateur | T71, T72, T73, T74, T75, T76 | apps/web/src/platform/mount.ts, apps/web/src/platform/mount.test.ts, apps/web/src/main.ts, scripts/essais/fichiers-navigateur.mjs, docs/essais/fichiers-lot5a-repli.png, docs/essais/fichiers-lot5a-fsa.png, scripts/controle-hors-ligne.mjs (seulement l'entrée `NON_FETCHED_HOSTS`, si besoin) | isolé | implementeur-tdd | vitest `mount.test.ts` : `Tests  4 passed (4)` ; `verifier.sh : OK` ; `Fichiers lot 5a : OK (3 modes)` ; `S2 lot 3 : OK` ; `S2 lot 3b : OK (4 passages)` | S2 | #tache-t77 |
| T78 | Coque Linux : build Tauri, essai ouvrir / enregistrer / fermer | T77 | docs/essais/coque-linux-lot5a.png | branche du lot | orchestrateur | `verifier.sh : OK` ; clippy `src-tauri` vert ; `tauri build` : ligne `beforeBuildCommand` et `.deb` produit ; essai : enregistrer par la boîte GTK, fermer → question, « Non » garde la fenêtre, rouvrir → le trait revient ; capture | S5 (Linux) | #tache-t78 |

**Vagues** (aucune tâche d'une vague ne touche un fichier d'une autre) :
**1** T70, T71 · **2** T72, T73, T74, T75, T76 · **3** T77 · **fin** T78 (orchestrateur).
T71 ne dépend de rien et lance un `cargo clippy` de la coque (build Tauri : règle des 2 au plus). En vague 2, au plus
trois `verifier.sh` en même temps ; les autres attendent leur jeton (5 min 18 chacun).

---

### Tâche T70 — Contrat `FileHost`, choix de l'hôte, dépendances, `base: './'`

<a id="tache-t70"></a>

**Objectif.** Poser le contrat de DA8 que les cinq tâches de la vague 2 implémentent, la détection de l'hôte (DA8 :
`isTauri()`, puis les sélecteurs FSA, sinon le repli) avec le réglage `?fichiers=` qui force le repli, les dépendances
npm de la coque, et `base: './'` (D27). Scénario : S2 (l'essai force le repli par ce réglage).

**Fichiers.** Créer `apps/web/src/platform/files.ts`, `apps/web/src/platform/files.test.ts`,
`apps/web/vite.config.ts`. Modifier `apps/web/package.json`, `pnpm-lock.yaml`.

**Interfaces.**
- Consomme : rien du lot.
- Réutilise : `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs` (liste du cadrage § 3, ligne « Fichiers ») —
  seulement déclarées ici (`dependencies`), appelées par T74 ; `URLSearchParams` (standard).
- Produit (exact, lu par T72-T77) :
  `ROOMBOARD_EXTENSION = ".roomboard"` ; `ROOMBOARD_MIME = "application/x-roomboard"` ;
  `UNTITLED = "Sans titre.roomboard"` ;
  `FILE_FILTER = { name: "Document RoomBoard", extensions: ["roomboard"] } as const` ;
  `type HostKind = "tauri" | "fsa" | "repli"` ; `type HostChoice = "auto" | "fsa" | "repli"` ;
  `interface WritableLike { write(data: Uint8Array): Promise<void>; close(): Promise<void>; abort?(reason?: unknown): Promise<void> }` ;
  `type PermissionLike = "granted" | "denied" | "prompt"` ;
  `interface FileHandleLike { readonly kind?: "file"; readonly name: string; getFile(): Promise<{ arrayBuffer(): Promise<ArrayBuffer> }>; createWritable(): Promise<WritableLike>; queryPermission?(d: { mode: "readwrite" }): Promise<PermissionLike>; requestPermission?(d: { mode: "readwrite" }): Promise<PermissionLike> }` ;
  `type SaveTarget = { kind: "ask"; name } | { kind: "tauri"; name; path } | { kind: "fsa"; name; handle: FileHandleLike } | { kind: "download"; name }` (champs `readonly`, `string`) ;
  `interface OpenedFile { readonly name: string; readonly bytes: Uint8Array; readonly target: SaveTarget }` ;
  `interface FileHost { readonly kind: HostKind; open(): Promise<OpenedFile | null>; save(bytes: Uint8Array, target: SaveTarget): Promise<SaveTarget | null> }` ;
  `interface ShellPort { confirm(message: string): Promise<boolean>; notify(message: string): Promise<void>; guardClose(isDirty: () => boolean, message: string): () => void; setTitle(title: string): void }` ;
  `interface PendingOpen { readonly name: string; readonly bytes: Uint8Array; readonly target: SaveTarget | null }` ;
  `interface PendingStore { put(p: PendingOpen): Promise<void>; take(): Promise<PendingOpen | null>; clear(): Promise<void> }` ;
  `interface HostEnvironment { readonly tauri: boolean; readonly fsa: boolean }` ;
  `detectHostEnvironment(w: object): HostEnvironment` ; `parseHostChoice(search: string): HostChoice` ;
  `chooseHostKind(env: HostEnvironment, choice: HostChoice): HostKind` ; `ensureExtension(name: string): string`.

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/platform/files.test.ts --reporter=verbose 2>&1 | tail -20`
→ `Tests  5 passed (5)` ; noms `choix : auto préfère Tauri puis FSA puis le repli ; repli forcé partout` et
`détection : Tauri par isTauri ou __TAURI_INTERNALS__, FSA seulement avec les deux sélecteurs` présents.
Puis `cd "$WT" && export PATH=$HOME/.cargo/bin:$PATH && scripts/verifier.sh 2>&1 | tail -30` → `verifier.sh : OK`
(web ≥ 25 fichiers, 0 `FAIL `) ; `grep -c 'src="./assets/' "$WT/apps/web/dist/index.html"` → `1`.

**Preuve visuelle.** Aucune.

**Contraintes (recopiées de « Global Constraints »).**
- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de `--force` ; aucun `git tag`, aucune release ; `.github/workflows/` non touché.
- Commits : `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit …` ; message en anglais, dernière ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Aucun test désactivé ni sauté, aucun seuil baissé.
- Aucun fichier sous `apps/web/src/engine/` ni `apps/web/src/ui/` (lot 4 en parallèle).
- `export PATH=$HOME/.cargo/bin:$PATH` avant `scripts/verifier.sh` ; suite au premier plan (`timeout: 600000`).
- Builds Tauri : au plus 2 en même temps sur la VM ; `pgrep -af "cargo.*tauri|tauri build"` avant ; `CARGO_BUILD_JOBS=2`.
- Aucun secret ; dépôt public. Rapport en français.

**Interdits.** Aucun import du DOM réel ni de `../wasm/` dans `files.ts` (types et fonctions pures). Versions npm
exactes ci-dessous, sans `^` : elles doivent égaler celles des crates de T71 (Tauri refuse un écart de version
majeure.mineure entre paquet npm et crate). Ne pas toucher `apps/desktop/`.

**Terminé quand.** 5 tests verts, `verifier.sh : OK`, `pnpm-lock.yaml` à jour (un worktree neuf passe
`pnpm install --frozen-lockfile`), rapport avec `Réutilisation : appelé @tauri-apps/plugin-dialog,
@tauri-apps/plugin-fs (déclarés seulement ; appelés par T74)`.

**Étapes.**

- [ ] **1. Écrire le test (rouge).** `apps/web/src/platform/files.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  chooseHostKind,
  detectHostEnvironment,
  ensureExtension,
  FILE_FILTER,
  parseHostChoice,
  ROOMBOARD_MIME,
  UNTITLED,
} from "./files";

const fn = (): void => undefined;

describe("contrat des fichiers (D26, DA8)", () => {
  it("détection : Tauri par isTauri ou __TAURI_INTERNALS__, FSA seulement avec les deux sélecteurs", () => {
    expect(detectHostEnvironment({})).toEqual({ tauri: false, fsa: false });
    expect(detectHostEnvironment({ isTauri: true })).toEqual({ tauri: true, fsa: false });
    expect(detectHostEnvironment({ __TAURI_INTERNALS__: {} })).toEqual({ tauri: true, fsa: false });
    expect(detectHostEnvironment({ __TAURI_INTERNALS__: null })).toEqual({ tauri: false, fsa: false });
    expect(detectHostEnvironment({ showSaveFilePicker: fn })).toEqual({ tauri: false, fsa: false });
    expect(detectHostEnvironment({ showSaveFilePicker: fn, showOpenFilePicker: fn })).toEqual({ tauri: false, fsa: true });
  });

  it("choix : auto préfère Tauri puis FSA puis le repli ; repli forcé partout", () => {
    const all = { tauri: true, fsa: true };
    expect(chooseHostKind(all, "auto")).toBe("tauri");
    expect(chooseHostKind({ tauri: false, fsa: true }, "auto")).toBe("fsa");
    expect(chooseHostKind({ tauri: false, fsa: false }, "auto")).toBe("repli");
    expect(chooseHostKind(all, "repli")).toBe("repli");
    expect(chooseHostKind(all, "fsa")).toBe("fsa");
    expect(chooseHostKind({ tauri: true, fsa: false }, "fsa")).toBe("repli");
  });

  it("réglage ?fichiers= : repli, fsa, sinon auto", () => {
    expect(parseHostChoice("")).toBe("auto");
    expect(parseHostChoice("?fichiers=repli")).toBe("repli");
    expect(parseHostChoice("?echelons=2&fichiers=fsa")).toBe("fsa");
    expect(parseHostChoice("?fichiers=tauri")).toBe("auto");
    expect(parseHostChoice("?fichiers=REPLI")).toBe("auto");
  });

  it("nom : extension .roomboard ajoutée une fois, nom vide → Sans titre.roomboard", () => {
    expect(ensureExtension("cours")).toBe("cours.roomboard");
    expect(ensureExtension("cours.roomboard")).toBe("cours.roomboard");
    expect(ensureExtension("Cours.ROOMBOARD")).toBe("Cours.ROOMBOARD");
    expect(ensureExtension("  ")).toBe(UNTITLED);
    expect(UNTITLED).toBe("Sans titre.roomboard");
  });

  it("type et filtre : application/x-roomboard, extension roomboard (D24)", () => {
    expect(ROOMBOARD_MIME).toBe("application/x-roomboard");
    expect(FILE_FILTER).toEqual({ name: "Document RoomBoard", extensions: ["roomboard"] });
  });
});
```

- [ ] **2. Lancer (rouge attendu).** `cd "$WT" && pnpm install --frozen-lockfile && cd apps/web && pnpm exec vitest run src/platform/files.test.ts 2>&1 | tail -8`
→ échec `Failed to resolve import "./files"`.

- [ ] **3. Écrire `apps/web/src/platform/files.ts`.**

```ts
/**
 * Contrat des fichiers (cadrage D26, DA8) : une interface, trois hôtes (coque Tauri, Chromium avec File System Access,
 * repli `<input type=file>` + téléchargement). Seul `platform/` appelle les API de fichiers. Les octets sont ceux de
 * `CoreDocument.save` (format D24) ; ils passent la frontière page ↔ Rust natif, ce n'est pas le chemin de l'encre.
 */
export const ROOMBOARD_EXTENSION = ".roomboard";
export const ROOMBOARD_MIME = "application/x-roomboard";
export const UNTITLED = "Sans titre.roomboard";
export const FILE_FILTER = { name: "Document RoomBoard", extensions: ["roomboard"] } as const;

export type HostKind = "tauri" | "fsa" | "repli";
/** Réglage `?fichiers=` : `repli` force le repli partout (essai), `fsa` le demande là où il existe. */
export type HostChoice = "auto" | "fsa" | "repli";

export interface WritableLike {
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort?(reason?: unknown): Promise<void>;
}

export type PermissionLike = "granted" | "denied" | "prompt";

/** Sous-ensemble de `FileSystemFileHandle` utilisé par l'hôte FSA (T72). */
export interface FileHandleLike {
  readonly kind?: "file";
  readonly name: string;
  getFile(): Promise<{ arrayBuffer(): Promise<ArrayBuffer> }>;
  createWritable(): Promise<WritableLike>;
  queryPermission?(d: { mode: "readwrite" }): Promise<PermissionLike>;
  requestPermission?(d: { mode: "readwrite" }): Promise<PermissionLike>;
}

/** Où enregistrer. `ask` : demander (Enregistrer sous, premier Ctrl+S). */
export type SaveTarget =
  | { readonly kind: "ask"; readonly name: string }
  | { readonly kind: "tauri"; readonly name: string; readonly path: string }
  | { readonly kind: "fsa"; readonly name: string; readonly handle: FileHandleLike }
  | { readonly kind: "download"; readonly name: string };

export interface OpenedFile {
  readonly name: string;
  readonly bytes: Uint8Array;
  readonly target: SaveTarget;
}

export interface FileHost {
  readonly kind: HostKind;
  /** null : boîte annulée. Lève une Error si la lecture échoue. */
  open(): Promise<OpenedFile | null>;
  /** `kind: "ask"` (ou cible d'un autre hôte) : demande où enregistrer. null : annulé. Lève si l'écriture échoue. */
  save(bytes: Uint8Array, target: SaveTarget): Promise<SaveTarget | null>;
}

/** Ce que la fenêtre offre autour des fichiers : question, message, fermeture gardée, titre. */
export interface ShellPort {
  confirm(message: string): Promise<boolean>;
  notify(message: string): Promise<void>;
  /** Garde la fermeture tant que `isDirty()` ; rend la fonction qui retire la garde. */
  guardClose(isDirty: () => boolean, message: string): () => void;
  setTitle(title: string): void;
}

/** Fichier ouvert qui attend le rechargement de la page (T75, T77). */
export interface PendingOpen {
  readonly name: string;
  readonly bytes: Uint8Array;
  readonly target: SaveTarget | null;
}

export interface PendingStore {
  put(p: PendingOpen): Promise<void>;
  /** Rend l'attente et la retire (null : rien). */
  take(): Promise<PendingOpen | null>;
  clear(): Promise<void>;
}

export interface HostEnvironment {
  readonly tauri: boolean;
  readonly fsa: boolean;
}

export function detectHostEnvironment(w: object): HostEnvironment {
  const g = w as Record<string, unknown>;
  const internals = g["__TAURI_INTERNALS__"];
  return {
    tauri: g["isTauri"] === true || (typeof internals === "object" && internals !== null),
    fsa: typeof g["showSaveFilePicker"] === "function" && typeof g["showOpenFilePicker"] === "function",
  };
}

export function parseHostChoice(search: string): HostChoice {
  const v = new URLSearchParams(search).get("fichiers");
  return v === "repli" || v === "fsa" ? v : "auto";
}

export function chooseHostKind(env: HostEnvironment, choice: HostChoice): HostKind {
  if (choice === "repli") return "repli";
  if (choice === "fsa") return env.fsa ? "fsa" : "repli";
  if (env.tauri) return "tauri";
  return env.fsa ? "fsa" : "repli";
}

export function ensureExtension(name: string): string {
  const n = name.trim();
  if (n === "") return UNTITLED;
  return n.toLowerCase().endsWith(ROOMBOARD_EXTENSION) ? n : `${n}${ROOMBOARD_EXTENSION}`;
}
```

- [ ] **4. Lancer (vert).** Commande de l'étape 2 sans l'installation → `Tests  5 passed (5)`.

- [ ] **5. Dépendances et `base`.** Dans `apps/web/package.json`, ajouter (versions exactes, ordre alphabétique) :

```json
  "dependencies": {
    "@tauri-apps/api": "2.12.5",
    "@tauri-apps/plugin-dialog": "2.8.4",
    "@tauri-apps/plugin-fs": "2.7.1"
  },
```

et dans `devDependencies` : `"fake-indexeddb": "6.2.8",`. Puis `cd "$WT" && pnpm install 2>&1 | tail -5`
(met à jour `pnpm-lock.yaml`), puis `pnpm install --frozen-lockfile 2>&1 | tail -3` → aucune erreur.
Créer `apps/web/vite.config.ts` :

```ts
import { defineConfig } from "vite";

// D27 : chemins relatifs, l'application se sert de n'importe quel dossier (coque, file://, serveur local).
export default defineConfig({ base: "./" });
```

- [ ] **6. Suite complète.** `cd "$WT" && export PATH=$HOME/.cargo/bin:$PATH && scripts/verifier.sh 2>&1 | tail -30`
→ `verifier.sh : OK` ; `grep -c 'src="./assets/' apps/web/dist/index.html` → `1`.

- [ ] **7. Commit.**

```bash
cd "$WT" && git add apps/web/src/platform/files.ts && git add apps/web/src/platform/files.test.ts \
  && git add apps/web/package.json && git add pnpm-lock.yaml && git add apps/web/vite.config.ts \
  && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
     -m "feat(web): FileHost contract, host detection and file dependencies (lot 5a T70)" \
     -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T71 — Coque Tauri : plugins, permissions, CSP, `beforeBuildCommand`, contrôle hors ligne, fiches Windows et macOS

<a id="tache-t71"></a>

**Objectif.** La coque enregistre `tauri-plugin-dialog` et `tauri-plugin-fs` avec des permissions minimales, a une
CSP stricte compatible Wasm (D27), construit le web avant de l'embarquer, et `verifier.sh` prouve qu'aucune ressource
distante n'est chargée (D27). Fiches pas à pas pour l'essai S5 sous Windows (file du PC) et macOS (Jérôme), D34.
Scénario : S5.

**Fichiers.** Modifier `apps/desktop/src-tauri/Cargo.toml`, `apps/desktop/src-tauri/Cargo.lock` (par cargo),
`apps/desktop/src-tauri/src/main.rs`, `apps/desktop/src-tauri/capabilities/default.json`,
`apps/desktop/src-tauri/tauri.conf.json`, `scripts/verifier.sh`. Créer `scripts/controle-hors-ligne.mjs`,
`scripts/tests/controle-hors-ligne.test.sh`, `docs/essais/coque-windows.md`, `docs/essais/coque-macos.md`.

**Interfaces.**
- Consomme : rien du lot (les versions npm de T70 sont fixées par ce plan : 2.12.5 / 2.8.4 / 2.7.1).
- Réutilise : crates `tauri-plugin-dialog` 2.8.4 et `tauri-plugin-fs` 2.7.1 (liste du cadrage § 3, ligne
  « Fichiers ») — `tauri_plugin_dialog::init()`, `tauri_plugin_fs::init()` ; modèle du test shell :
  `scripts/tests/controle-wasm-bindgen.test.sh` (dossier temporaire, `echec`, compteur de cas).
- Produit : permissions de la fenêtre `main` (lues par T74 à l'exécution) ; `scripts/controle-hors-ligne.mjs`
  exporte `NON_FETCHED_HOSTS: Map<string, string>`, `remoteHosts(text: string): string[]`,
  `checkDist(dir: string): { errors: string[]; scanned: number }`, `checkCsp(conf: unknown): string[]` ; usage
  `node scripts/controle-hors-ligne.mjs <dist> <tauri.conf.json>` (0 : OK, 1 : écart), ligne
  `controle-hors-ligne : OK (N fichiers sans hôte distant, CSP stricte)`.

**Test et commande bornée.**
`cd "$WT" && bash scripts/tests/controle-hors-ligne.test.sh 2>&1 | tail -5` → `controle-hors-ligne.test.sh : 6 cas OK`.
`cd "$WT" && export PATH=$HOME/.cargo/bin:$PATH && scripts/verifier.sh 2>&1 | tail -30` → lignes
`controle-hors-ligne.test.sh : 6 cas OK`, `controle-hors-ligne : OK (` et `verifier.sh : OK`.
`cd "$WT" && pgrep -af "cargo.*tauri|tauri build"; CARGO_BUILD_JOBS=2 cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml --all-targets -- -D warnings 2>&1 | tail -5`
→ `Finished` ; `… 2>&1 | grep -c '^warning:'` → `0`.
Tests à garder verts : `scripts/tests/controle-wasm-bindgen.test.sh` (4 cas), tout `verifier.sh`.

**Preuve visuelle.** Aucune ici (T78 : coque Linux).

**Contraintes (recopiées de « Global Constraints »).**
- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de `--force` ; aucun `git tag`, aucune release ; `.github/workflows/` non touché.
- Commits : `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit …` ; message en anglais, dernière ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Aucun test désactivé ni sauté, aucun seuil baissé.
- Aucun fichier sous `apps/web/src/engine/` ni `apps/web/src/ui/` (lot 4 en parallèle).
- `export PATH=$HOME/.cargo/bin:$PATH` avant `scripts/verifier.sh` ; suite au premier plan (`timeout: 600000`).
- Builds Tauri (`cargo clippy` de `src-tauri` compris) : au plus 2 en même temps sur la VM, tous canaux ; avant chacun `pgrep -af "cargo.*tauri|tauri build"`, si deux tournent, attendre ; `CARGO_BUILD_JOBS=2`.
- Aucun secret ; dépôt public. Worktree neuf : `pnpm install --frozen-lockfile`. Rapport en français.

**Interdits.** Aucune portée fs statique (`fs:scope`), aucune permission `fs:default` ni `*:allow-*` en joker. Ne
pas ajouter `src-tauri` au workspace Cargo (build ~7,5 Go). Pas de `tauri build` ici (T78). Versions de crates
`"2.8.4"` / `"2.7.1"` (jamais `3.0.0-alpha`). Pas d'association de fichiers (`fileAssociations`) : reportée.
`$schema` de `tauri.conf.json` inchangé.

**Terminé quand.** 6 cas verts, `verifier.sh : OK` avec la ligne `controle-hors-ligne : OK (`, clippy de la coque
sans avertissement, deux fiches écrites, rapport avec `Réutilisation : appelé tauri-plugin-dialog, tauri-plugin-fs`,
la durée et le pic mémoire du clippy (`/usr/bin/time -v`, ligne `Maximum resident set size`).

**Étapes.**

- [ ] **1. Écrire le test shell (rouge).** `scripts/tests/controle-hors-ligne.test.sh` :

```bash
#!/usr/bin/env bash
# Test du contrôle hors ligne (cadrage D27). Faux dist et faux tauri.conf.json dans un dossier temporaire.
set -euo pipefail
racine="$(cd "$(dirname "$0")/../.." && pwd)"
script="$racine/scripts/controle-hors-ligne.mjs"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
echec() { echo "ÉCHEC : $1" >&2; exit 1; }
cas=0

mkdir -p "$tmp/propre/assets" "$tmp/vide"
cat > "$tmp/propre/index.html" <<'EOT'
<!doctype html><svg xmlns="http://www.w3.org/2000/svg"></svg><script type="module" src="./assets/index.js"></script>
EOT
cat > "$tmp/propre/assets/index.js" <<'EOT'
fetch("http://ipc.localhost/plugin%3Adialog%7Copen"); const u = "http://" + p + ".localhost/"; const l = "http://127.0.0.1:4173/";
EOT
cp -r "$tmp/propre" "$tmp/distant"
echo '@import url("https://fonts.googleapis.com/css2?family=Inter");' > "$tmp/distant/assets/style.css"
cat > "$tmp/bonne.json" <<'EOT'
{ "app": { "security": { "csp": {
  "default-src": "'self'",
  "script-src": "'self' 'wasm-unsafe-eval'",
  "connect-src": "'self' ipc: http://ipc.localhost"
} } } }
EOT
cat > "$tmp/nulle.json" <<'EOT'
{ "app": { "security": { "csp": null } } }
EOT
cat > "$tmp/sans-wasm.json" <<'EOT'
{ "app": { "security": { "csp": { "default-src": "'self'", "script-src": "'self'" } } } }
EOT
cat > "$tmp/distante.json" <<'EOT'
{ "app": { "security": { "csp": { "default-src": "'self'", "script-src": "'self' 'wasm-unsafe-eval'", "img-src": "'self' https://cdn.example.com" } } } }
EOT

# 1. dist propre (espace de noms SVG, IPC Tauri, 127.0.0.1) et bonne CSP → 0
node "$script" "$tmp/propre" "$tmp/bonne.json" > "$tmp/out" 2>&1 || echec "cas 1 : refusé ($(cat "$tmp/out"))"
grep -q "controle-hors-ligne : OK" "$tmp/out" || echec "cas 1 : ligne OK absente"
cas=$((cas + 1))
# 2. police distante → 1, l'hôte est nommé
if node "$script" "$tmp/distant" "$tmp/bonne.json" > "$tmp/out" 2>&1; then echec "cas 2 : police distante acceptée"; fi
grep -q "fonts.googleapis.com" "$tmp/out" || echec "cas 2 : hôte non nommé"
cas=$((cas + 1))
# 3. csp null → 1
if node "$script" "$tmp/propre" "$tmp/nulle.json" > "$tmp/out" 2>&1; then echec "cas 3 : csp null acceptée"; fi
grep -q "objet de directives attendu" "$tmp/out" || echec "cas 3 : message absent"
cas=$((cas + 1))
# 4. script-src sans 'wasm-unsafe-eval' → 1
if node "$script" "$tmp/propre" "$tmp/sans-wasm.json" > "$tmp/out" 2>&1; then echec "cas 4 : sans wasm-unsafe-eval accepté"; fi
grep -q "wasm-unsafe-eval" "$tmp/out" || echec "cas 4 : message absent"
cas=$((cas + 1))
# 5. source distante dans la CSP → 1
if node "$script" "$tmp/propre" "$tmp/distante.json" > "$tmp/out" 2>&1; then echec "cas 5 : CSP distante acceptée"; fi
grep -q "cdn.example.com" "$tmp/out" || echec "cas 5 : hôte non nommé"
cas=$((cas + 1))
# 6. dist sans fichier texte (build absent) → 1
if node "$script" "$tmp/vide" "$tmp/bonne.json" > "$tmp/out" 2>&1; then echec "cas 6 : dist vide accepté"; fi
grep -q "aucun fichier texte" "$tmp/out" || echec "cas 6 : message absent"
cas=$((cas + 1))

echo "controle-hors-ligne.test.sh : $cas cas OK"
```

- [ ] **2. Lancer (rouge attendu).** `cd "$WT" && bash scripts/tests/controle-hors-ligne.test.sh 2>&1 | tail -3`
→ `ÉCHEC : cas 1 : refusé (… Cannot find module …controle-hors-ligne.mjs …)`.

- [ ] **3. Écrire `scripts/controle-hors-ligne.mjs`.**

```js
#!/usr/bin/env node
// Contrôle hors ligne (cadrage D27) : aucune ressource réseau à l'exécution.
// (1) Aucun nom d'hôte distant dans le dist de l'application (html, js, css, json, svg ; le .wasm est exclu : binaire,
//     il ne charge rien lui-même). (2) CSP de la coque en objet : default-src 'self', script-src avec
//     'wasm-unsafe-eval' et sans 'unsafe-inline', aucune source distante, aucun joker ni schéma nu, pas d'unsafe-eval.
// Usage : node scripts/controle-hors-ligne.mjs <dossier dist> <tauri.conf.json>   (0 : OK ; 1 : écart)
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const TEXT = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg", ".txt", ".webmanifest"]);
/** Hôtes cités mais jamais chargés, chacun avec sa raison : toute entrée nouvelle se justifie ici. */
export const NON_FETCHED_HOSTS = new Map([["www.w3.org", "espaces de noms XML (SVG, XHTML), jamais chargés"]]);
const URL_RE = /\b(?:https?|wss?):\/\/([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g;
const FORBIDDEN_TOKENS = new Set(["*", "http:", "https:", "ws:", "wss:", "'unsafe-eval'"]);

export function remoteHosts(text) {
  const found = new Set();
  for (const m of text.matchAll(URL_RE)) {
    const host = m[1].toLowerCase();
    if (host.endsWith(".localhost") || host.startsWith("127.") || NON_FETCHED_HOSTS.has(host)) continue;
    found.add(host);
  }
  return [...found].sort();
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

export function checkDist(dir) {
  const errors = [];
  let scanned = 0;
  for (const f of walk(dir)) {
    if (!TEXT.has(extname(f))) continue;
    scanned += 1;
    const hosts = remoteHosts(readFileSync(f, "utf8"));
    if (hosts.length > 0) errors.push(`${relative(dir, f)} : hôte distant ${hosts.join(", ")}`);
  }
  if (scanned === 0) errors.push(`${dir} : aucun fichier texte (build absent ?)`);
  return { errors, scanned };
}

export function checkCsp(conf) {
  const csp = conf?.app?.security?.csp;
  if (csp === null || csp === undefined || typeof csp !== "object" || Array.isArray(csp)) {
    return [`csp : objet de directives attendu (D27), trouvé ${JSON.stringify(csp ?? null)}`];
  }
  const errors = [];
  const tokens = (d) => (Array.isArray(csp[d]) ? csp[d].join(" ") : String(csp[d] ?? "")).split(/\s+/).filter(Boolean);
  if (tokens("default-src").join(" ") !== "'self'") errors.push("default-src doit valoir 'self'");
  const script = tokens("script-src");
  if (!script.includes("'wasm-unsafe-eval'")) errors.push("script-src sans 'wasm-unsafe-eval' (le cœur Wasm ne se charge pas)");
  if (script.includes("'unsafe-inline'")) errors.push("script-src avec 'unsafe-inline'");
  for (const d of Object.keys(csp)) {
    const list = tokens(d);
    for (const t of list) if (FORBIDDEN_TOKENS.has(t)) errors.push(`${d} : source interdite ${t}`);
    const hosts = remoteHosts(list.join(" "));
    if (hosts.length > 0) errors.push(`${d} : hôte distant ${hosts.join(", ")}`);
  }
  return errors;
}

function main(argv) {
  const [dist, confPath] = argv;
  if (!dist || !confPath) {
    console.error("usage : node scripts/controle-hors-ligne.mjs <dist> <tauri.conf.json>");
    return 1;
  }
  const { errors, scanned } = checkDist(dist);
  errors.push(...checkCsp(JSON.parse(readFileSync(confPath, "utf8"))));
  if (errors.length > 0) {
    for (const e of errors) console.error(`controle-hors-ligne : ${e}`);
    return 1;
  }
  console.log(`controle-hors-ligne : OK (${scanned} fichiers sans hôte distant, CSP stricte)`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main(process.argv.slice(2));
}
```

- [ ] **4. Lancer (vert).** Commande de l'étape 2 → `controle-hors-ligne.test.sh : 6 cas OK`.

- [ ] **5. Coque.** `apps/desktop/src-tauri/Cargo.toml`, section `[dependencies]` :

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-dialog = "2.8.4"
tauri-plugin-fs = "2.7.1"
```

`apps/desktop/src-tauri/src/main.rs` :

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running RoomBoard");
}
```

`apps/desktop/src-tauri/capabilities/default.json` :

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Fenêtre principale : boîtes de fichiers, lecture et écriture des seuls fichiers choisis (portée ajoutée par le plugin dialog), fermeture gardée, titre.",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:allow-destroy",
    "core:window:allow-set-title",
    "dialog:allow-open",
    "dialog:allow-save",
    "dialog:allow-ask",
    "dialog:allow-message",
    "fs:allow-read-file",
    "fs:allow-write-file"
  ]
}
```

`apps/desktop/src-tauri/tauri.conf.json` (remplace `build` et `app.security` ; le reste inchangé) :

```json
  "build": {
    "frontendDist": "../../web/dist",
    "beforeBuildCommand": "pnpm --filter @roomboard/web build"
  },
  "app": {
    "windows": [{ "title": "RoomBoard", "width": 1280, "height": 800 }],
    "security": {
      "csp": {
        "default-src": "'self'",
        "script-src": "'self' 'wasm-unsafe-eval'",
        "style-src": "'self' 'unsafe-inline'",
        "img-src": "'self' data: blob:",
        "font-src": "'self'",
        "connect-src": "'self' ipc: http://ipc.localhost",
        "object-src": "'none'",
        "base-uri": "'self'",
        "form-action": "'none'"
      },
      "dangerousDisableAssetCspModification": ["style-src"]
    }
  },
```

- [ ] **6. Brancher dans `verifier.sh`.** Après `bash scripts/controle-wasm-bindgen.sh Cargo.lock`, ajouter la ligne
`bash scripts/tests/controle-hors-ligne.test.sh`. Après le bloc de la taille du module Wasm (avant le banc du stylet),
ajouter :

```bash
# Hors ligne (cadrage D27) : aucun hôte distant dans l'application construite, CSP stricte de la coque.
node scripts/controle-hors-ligne.mjs apps/web/dist apps/desktop/src-tauri/tauri.conf.json
```

Mettre à jour le commentaire d'en-tête : `src-tauri` reste hors de clippy et de `cargo test` ici, sa CSP est
contrôlée.

- [ ] **7. Suite complète puis clippy de la coque.** `verifier.sh` (commande de la section) → `verifier.sh : OK`
(le dist doit exister avant clippy : `generate_context!` l'exige). Puis
`pgrep -af "cargo.*tauri|tauri build"` (deux lignes : attendre) et
`cd "$WT" && CARGO_BUILD_JOBS=2 /usr/bin/time -v cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml --all-targets -- -D warnings 2>&1 | tail -25`
→ `Finished`, aucun `warning:`, noter durée et `Maximum resident set size`.

- [ ] **8. Fiches.** `docs/essais/coque-windows.md` — titres et contenu exacts :

````markdown
# Essai S5 — coque RoomBoard sous Windows (lot 5a)

Pour : la file d'attente du PC (non bloquant, D34). Durée : 30 min, dont 15 de build.
Ce qui est essayé : ouvrir, enregistrer, fermer dans la coque (WebView2), puis la même chose dans Edge avec la
File System Access API. Formes et texte (lot 4) : seulement si le lot 4 est fusionné.

## 1. Prérequis
- Rust stable (`rustup`), puis `rustup target add wasm32-unknown-unknown`.
- `cargo install wasm-bindgen-cli --version 0.2.130 --locked` (la version doit égaler `Cargo.lock`).
- Node 22 et pnpm (`corepack enable`).
- Visual Studio Build Tools (C++), WebView2 (présent sous Windows 11).

## 2. Construire (PowerShell)
```powershell
git clone https://github.com/jejeasterix/roomboard.git
Set-Location roomboard
git checkout main
pnpm install --frozen-lockfile
cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release
wasm-bindgen --target web --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm
pnpm --filter @roomboard/desktop tauri build
```
Attendu : la sortie montre `Running beforeBuildCommand`, puis un installeur sous
`apps\desktop\src-tauri\target\release\bundle\`. Lancer `apps\desktop\src-tauri\target\release\roomboard-desktop.exe`.

## 3. Parcours dans la coque
| # | geste | attendu |
|---|---|---|
| 1 | tracer un trait au stylet | trait visible ; titre de la fenêtre `• Sans titre.roomboard — RoomBoard` |
| 2 | gommer en travers | trait coupé |
| 3 | Ctrl+Maj+S | boîte Windows « Enregistrer sous », nom proposé `Sans titre.roomboard` ; choisir `Documents\essai-5a.roomboard` |
| 4 | — | titre `essai-5a.roomboard — RoomBoard` (sans `•`) |
| 5 | tracer, puis Ctrl+S | aucune boîte ; l'heure de modification du fichier change dans l'Explorateur |
| 6 | tracer, puis fermer par ✕ | question « Le document a des modifications non enregistrées. Les abandonner ? » ; répondre **Non** : la fenêtre reste |
| 7 | Alt+F4, répondre **Oui** | la fenêtre se ferme |
| 8 | relancer, Ctrl+O, choisir `essai-5a.roomboard` | les traits enregistrés au geste 5 reviennent, aux mêmes places |
| 9 | Ctrl+O sur un fichier texte renommé `faux.roomboard` | message « Ouverture impossible (faux.roomboard) : … » ; document inchangé |

## 4. Même parcours dans Edge (File System Access)
```powershell
pnpm --filter @roomboard/web build
pnpm --filter @roomboard/web exec vite preview --port 4173
```
Ouvrir `http://localhost:4173/` dans Edge. Gestes 1 à 5 : Ctrl+S ouvre la boîte d'Edge la première fois, puis réécrit
le même fichier sans boîte. F5, Ctrl+O, choisir le fichier : les traits reviennent ; Ctrl+S ensuite : au plus une
demande d'autorisation d'Edge (« Enregistrer les modifications ? »), pas de nouvelle boîte. Fermer l'onglet avec un
trait non enregistré : Edge demande.

## 5. À rapporter
Pour chaque geste : conforme / écart (une ligne). Captures : `coque-windows-lot5a-question.png` (geste 6),
`coque-windows-lot5a-rouvert.png` (geste 8). Version de WebView2 (`edge://version` dans Edge, ou les paramètres
Windows) et modèle du stylet.
````

`docs/essais/coque-macos.md` — même plan, avec ces différences exactes : public « Jérôme, sur le Mac, hors agent » ;
prérequis `xcode-select --install` au lieu de Visual Studio, rien pour WebView2 ; commandes dans le Terminal (zsh),
identiques sans `Set-Location` (`cd roomboard`) ; application
`apps/desktop/src-tauri/target/release/bundle/macos/RoomBoard.app`, lancée par
`open apps/desktop/src-tauri/target/release/bundle/macos/RoomBoard.app` ; raccourcis Cmd au lieu de Ctrl ; boîtes
« Enregistrer » de macOS ; geste 7 remplacé par deux lignes : « fermer par le bouton rouge, répondre Oui : la fenêtre
se ferme » et « Cmd+Q avec un trait non enregistré : **attendu connu** : l'application quitte sans demander
(Cmd+Q ne passe pas par la fermeture de la fenêtre) ; noter ce qui se passe » ; partie 4 dans Chrome (même parcours
qu'Edge) puis dans Safari, où le repli s'applique : Cmd+S télécharge `Sans titre.roomboard` dans Téléchargements,
Cmd+O ouvre le sélecteur de fichiers ; captures `coque-macos-lot5a-*.png`.

- [ ] **9. Commit.**

```bash
cd "$WT" && git add apps/desktop/src-tauri/Cargo.toml && git add apps/desktop/src-tauri/Cargo.lock \
  && git add apps/desktop/src-tauri/src/main.rs && git add apps/desktop/src-tauri/capabilities/default.json \
  && git add apps/desktop/src-tauri/tauri.conf.json && git add scripts/controle-hors-ligne.mjs \
  && git add scripts/tests/controle-hors-ligne.test.sh && git add scripts/verifier.sh \
  && git add docs/essais/coque-windows.md && git add docs/essais/coque-macos.md \
  && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
     -m "feat(desktop): dialog and fs plugins, strict CSP, offline check, Windows and macOS test sheets (lot 5a T71)" \
     -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T72 — Hôte Chromium (File System Access)

<a id="tache-t72"></a>

**Objectif.** L'hôte FSA de DA8 : boîte d'ouverture et d'enregistrement de Chromium, poignée gardée pour que Ctrl+S
réécrive le même fichier (D26, S5 « Ctrl+S réécrit le même fichier »), annulation = `null`, erreur d'écriture qui
remonte. Scénario : S5 (Chromium, Edge).

**Fichiers.** Créer `apps/web/src/platform/host-fsa.ts`, `apps/web/src/platform/host-fsa.test.ts`.

**Interfaces.**
- Consomme (T70, `./files`) : `FileHost`, `FileHandleLike`, `WritableLike`, `PermissionLike`, `SaveTarget`,
  `OpenedFile`, `ensureExtension`, `ROOMBOARD_MIME`, `ROOMBOARD_EXTENSION`.
- Réutilise : File System Access API (liste du cadrage § 3, ligne « Fichiers ») — `showOpenFilePicker`,
  `showSaveFilePicker`, `FileSystemFileHandle.getFile|createWritable|queryPermission|requestPermission`, derrière
  `FsaWindow`.
- Produit : `interface PickerType { readonly description: string; readonly accept: Readonly<Record<string, readonly string[]>> }` ;
  `interface FsaWindow { showOpenFilePicker(o: { multiple: false; excludeAcceptAllOption: boolean; types: readonly PickerType[] }): Promise<readonly FileHandleLike[]>; showSaveFilePicker(o: { suggestedName: string; excludeAcceptAllOption: boolean; types: readonly PickerType[] }): Promise<FileHandleLike> }` ;
  `FSA_TYPES: readonly PickerType[]` ; `isAbort(e: unknown): boolean` ; `createFsaHost(w: FsaWindow): FileHost`
  (`kind: "fsa"`).

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/platform/host-fsa.test.ts --reporter=verbose 2>&1 | tail -20`
→ `Tests  8 passed (8)` ; noms `Ctrl+S sur une cible fsa réécrit la même poignée sans boîte` (S5) et
`permission refusée sur la poignée gardée : la boîte d'enregistrement s'ouvre` (Review Focus 4, D26) présents.
Puis `verifier.sh` (jeton) → `verifier.sh : OK`.

**Preuve visuelle.** Aucune (T77, mode `fsa`).

**Contraintes (recopiées de « Global Constraints »).**
- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de `--force` ; aucun `git tag`, aucune release ; `.github/workflows/` non touché.
- Commits : `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit …` ; message en anglais, dernière ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Aucun test désactivé ni sauté, aucun seuil baissé.
- Aucun fichier sous `apps/web/src/engine/` ni `apps/web/src/ui/` (lot 4 en parallèle).
- `export PATH=$HOME/.cargo/bin:$PATH` avant `scripts/verifier.sh` ; suite au premier plan (`timeout: 600000`).
- Builds Tauri : au plus 2 en même temps sur la VM ; `pgrep -af "cargo.*tauri|tauri build"` avant ; `CARGO_BUILD_JOBS=2`.
- Aucun secret ; dépôt public. Worktree neuf : `pnpm install --frozen-lockfile`. Rapport en français.

**Interdits.** Aucun accès à `window` global : tout passe par `FsaWindow`. Ne pas toucher `files.ts` (T70).

**Terminé quand.** 8 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : appelé File System Access API
(derrière FsaWindow)`.

**Étapes.**

- [ ] **1. Écrire le test (rouge).** `apps/web/src/platform/host-fsa.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { FileHandleLike, PermissionLike, SaveTarget, WritableLike } from "./files";
import { createFsaHost, FSA_TYPES, type FsaWindow } from "./host-fsa";

interface Disk { files: Map<string, Uint8Array>; writes: string[]; aborted: number }
const newDisk = (): Disk => ({ files: new Map(), writes: [], aborted: 0 });

function handle(disk: Disk, name: string, o: { permission?: PermissionLike; failWrite?: boolean } = {}): FileHandleLike {
  return {
    kind: "file",
    name,
    async getFile() {
      const b = disk.files.get(name) ?? new Uint8Array();
      return { arrayBuffer: async () => b.slice().buffer };
    },
    async createWritable(): Promise<WritableLike> {
      let data = new Uint8Array();
      return {
        async write(d) {
          if (o.failWrite) throw new Error("disque plein");
          data = d.slice();
        },
        async close() {
          disk.files.set(name, data);
          disk.writes.push(name);
        },
        async abort() {
          disk.aborted += 1;
        },
      };
    },
    async queryPermission() {
      return o.permission ?? "granted";
    },
    async requestPermission() {
      return o.permission ?? "granted";
    },
  };
}

interface Calls { save: Array<{ suggestedName: string; types: unknown }>; open: number }

function fsaWindow(disk: Disk, o: { saveAs?: string | Error; openName?: string | Error } = {}): FsaWindow & { calls: Calls } {
  const calls: Calls = { save: [], open: 0 };
  return {
    calls,
    async showSaveFilePicker(opts) {
      calls.save.push({ suggestedName: opts.suggestedName, types: opts.types });
      if (o.saveAs instanceof Error) throw o.saveAs;
      return handle(disk, o.saveAs ?? opts.suggestedName);
    },
    async showOpenFilePicker() {
      calls.open += 1;
      if (o.openName instanceof Error) throw o.openName;
      return [handle(disk, o.openName ?? "cours.roomboard")];
    },
  };
}

const abortError = (): Error => Object.assign(new Error("annulé"), { name: "AbortError" });
const ask: SaveTarget = { kind: "ask", name: "Sans titre.roomboard" };
const bytes = new Uint8Array([0x50, 0x4b, 3, 4, 9, 9]);

describe("hôte Chromium (File System Access)", () => {
  it("aller-retour : enregistrer puis ouvrir rend les mêmes octets, cible fsa", async () => {
    const disk = newDisk();
    const host = createFsaHost(fsaWindow(disk, { saveAs: "cours.roomboard", openName: "cours.roomboard" }));
    expect(host.kind).toBe("fsa");
    const saved = await host.save(bytes, ask);
    expect(saved?.kind).toBe("fsa");
    expect(saved?.name).toBe("cours.roomboard");
    const opened = await host.open();
    expect(opened?.name).toBe("cours.roomboard");
    expect(Array.from(opened?.bytes ?? [])).toEqual(Array.from(bytes));
    expect(opened?.target.kind).toBe("fsa");
  });

  it("Ctrl+S sur une cible fsa réécrit la même poignée sans boîte", async () => {
    const disk = newDisk();
    const w = fsaWindow(disk);
    const host = createFsaHost(w);
    const first = await host.save(bytes, ask);
    if (first === null) throw new Error("premier enregistrement annulé");
    const again = await host.save(new Uint8Array([1, 2]), first);
    expect(w.calls.save).toHaveLength(1);
    expect(disk.writes).toEqual(["Sans titre.roomboard", "Sans titre.roomboard"]);
    expect(Array.from(disk.files.get("Sans titre.roomboard") ?? [])).toEqual([1, 2]);
    expect(again).toEqual(first);
  });

  it("annulation de la boîte d'enregistrement (AbortError) : null, rien d'écrit", async () => {
    const disk = newDisk();
    const host = createFsaHost(fsaWindow(disk, { saveAs: abortError() }));
    expect(await host.save(bytes, ask)).toBeNull();
    expect(disk.writes).toEqual([]);
  });

  it("annulation de la boîte d'ouverture : null", async () => {
    const host = createFsaHost(fsaWindow(newDisk(), { openName: abortError() }));
    expect(await host.open()).toBeNull();
  });

  it("erreur d'écriture : abort puis l'erreur remonte, rien d'écrit", async () => {
    const disk = newDisk();
    const failing = handle(disk, "plein.roomboard", { failWrite: true });
    const host = createFsaHost(fsaWindow(disk));
    await expect(host.save(bytes, { kind: "fsa", name: "plein.roomboard", handle: failing })).rejects.toThrow("disque plein");
    expect(disk.aborted).toBe(1);
    expect(disk.writes).toEqual([]);
  });

  it("permission refusée sur la poignée gardée : la boîte d'enregistrement s'ouvre", async () => {
    const disk = newDisk();
    const w = fsaWindow(disk, { saveAs: "nouveau.roomboard" });
    const host = createFsaHost(w);
    const kept = handle(disk, "ancien.roomboard", { permission: "denied" });
    const r = await host.save(bytes, { kind: "fsa", name: "ancien.roomboard", handle: kept });
    expect(w.calls.save).toHaveLength(1);
    expect(r?.name).toBe("nouveau.roomboard");
    expect(disk.files.has("ancien.roomboard")).toBe(false);
  });

  it("autre erreur de la boîte (SecurityError) : remonte", async () => {
    const err = Object.assign(new Error("geste requis"), { name: "SecurityError" });
    const host = createFsaHost(fsaWindow(newDisk(), { saveAs: err, openName: err }));
    await expect(host.save(bytes, ask)).rejects.toThrow("geste requis");
    await expect(host.open()).rejects.toThrow("geste requis");
  });

  it("nom proposé : extension .roomboard ajoutée, types application/x-roomboard ; cible d'un autre hôte → boîte", async () => {
    const disk = newDisk();
    const w = fsaWindow(disk);
    const host = createFsaHost(w);
    await host.save(bytes, { kind: "ask", name: "cours" });
    await host.save(bytes, { kind: "download", name: "cours.roomboard" });
    expect(w.calls.save.map((c) => c.suggestedName)).toEqual(["cours.roomboard", "cours.roomboard"]);
    expect(w.calls.save[0]?.types).toEqual(FSA_TYPES);
    expect(FSA_TYPES).toEqual([{ description: "Document RoomBoard", accept: { "application/x-roomboard": [".roomboard"] } }]);
  });
});
```

- [ ] **2. Lancer (rouge attendu).** Commande de la section → `Failed to resolve import "./host-fsa"`.

- [ ] **3. Écrire `apps/web/src/platform/host-fsa.ts`.**

```ts
/**
 * Hôte Chromium (D26, DA8) : File System Access. La poignée rendue par la boîte est gardée dans la cible : Ctrl+S
 * réécrit le même fichier sans boîte ; si la permission est refusée, la boîte d'enregistrement s'ouvre.
 */
import {
  ensureExtension,
  ROOMBOARD_EXTENSION,
  ROOMBOARD_MIME,
  type FileHandleLike,
  type FileHost,
  type OpenedFile,
  type SaveTarget,
} from "./files";

export interface PickerType {
  readonly description: string;
  readonly accept: Readonly<Record<string, readonly string[]>>;
}

export interface FsaWindow {
  showOpenFilePicker(o: { multiple: false; excludeAcceptAllOption: boolean; types: readonly PickerType[] }): Promise<readonly FileHandleLike[]>;
  showSaveFilePicker(o: { suggestedName: string; excludeAcceptAllOption: boolean; types: readonly PickerType[] }): Promise<FileHandleLike>;
}

export const FSA_TYPES: readonly PickerType[] = [
  { description: "Document RoomBoard", accept: { [ROOMBOARD_MIME]: [ROOMBOARD_EXTENSION] } },
];

export function isAbort(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { name?: unknown }).name === "AbortError";
}

async function writable(handle: FileHandleLike): Promise<boolean> {
  try {
    if (!handle.queryPermission) return true;
    if ((await handle.queryPermission({ mode: "readwrite" })) === "granted") return true;
    if (!handle.requestPermission) return false;
    return (await handle.requestPermission({ mode: "readwrite" })) === "granted";
  } catch {
    return false;
  }
}

async function writeAll(handle: FileHandleLike, bytes: Uint8Array): Promise<void> {
  const w = await handle.createWritable();
  try {
    await w.write(bytes);
  } catch (e) {
    if (w.abort) await w.abort(e).catch(() => undefined);
    throw e;
  }
  await w.close();
}

export function createFsaHost(w: FsaWindow): FileHost {
  return {
    kind: "fsa",
    async open(): Promise<OpenedFile | null> {
      let handles: readonly FileHandleLike[];
      try {
        handles = await w.showOpenFilePicker({ multiple: false, excludeAcceptAllOption: false, types: FSA_TYPES });
      } catch (e) {
        if (isAbort(e)) return null;
        throw e;
      }
      const handle = handles[0];
      if (handle === undefined) return null;
      const file = await handle.getFile();
      const bytes = new Uint8Array(await file.arrayBuffer());
      return { name: handle.name, bytes, target: { kind: "fsa", name: handle.name, handle } };
    },
    async save(bytes: Uint8Array, target: SaveTarget): Promise<SaveTarget | null> {
      let handle: FileHandleLike | null = target.kind === "fsa" && (await writable(target.handle)) ? target.handle : null;
      if (handle === null) {
        try {
          handle = await w.showSaveFilePicker({
            suggestedName: ensureExtension(target.name),
            excludeAcceptAllOption: false,
            types: FSA_TYPES,
          });
        } catch (e) {
          if (isAbort(e)) return null;
          throw e;
        }
      }
      await writeAll(handle, bytes);
      return { kind: "fsa", name: handle.name, handle };
    },
  };
}
```

- [ ] **4. Lancer (vert).** Commande de la section → `Tests  8 passed (8)`, puis `verifier.sh` → `verifier.sh : OK`.

- [ ] **5. Commit.**

```bash
cd "$WT" && git add apps/web/src/platform/host-fsa.ts && git add apps/web/src/platform/host-fsa.test.ts \
  && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
     -m "feat(web): File System Access host keeps the handle for Ctrl+S (lot 5a T72)" \
     -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T73 — Hôte de repli et coquille du navigateur

<a id="tache-t73"></a>

**Objectif.** L'hôte de repli de DA8 (Firefox, Safari, essai Playwright) : ouvrir par `<input type=file>`, enregistrer
par téléchargement ; et la coquille du navigateur : `confirm`, `alert`, `beforeunload` seulement si modifié (D26),
titre de la page. Scénario : S2 (« téléchargement intercepté », « sélecteur `<input type=file>` »).

**Fichiers.** Créer `apps/web/src/platform/host-repli.ts`, `apps/web/src/platform/host-repli.test.ts`,
`apps/web/src/platform/shell-web.ts`, `apps/web/src/platform/shell-web.test.ts`.

**Interfaces.**
- Consomme (T70, `./files`) : `FileHost`, `ShellPort`, `SaveTarget`, `OpenedFile`, `ensureExtension`,
  `ROOMBOARD_EXTENSION`, `ROOMBOARD_MIME`.
- Réutilise : aucun module du dépôt (nouveau, liste du cadrage § 3 : « réutiliser derrière un nouveau module ») ; API
  du navigateur `HTMLInputElement` (`type=file`, événements `change`, `cancel`), `Blob`, `URL.createObjectURL`,
  `HTMLAnchorElement.download`, `beforeunload`.
- Produit : `interface PickedFile { readonly name: string; readonly bytes: Uint8Array }` ;
  `interface FallbackDeps { pickFile(accept: string): Promise<PickedFile | null>; download(name: string, bytes: Uint8Array, mime: string): void }` ;
  `interface UrlApi { createObjectURL(b: Blob): string; revokeObjectURL(u: string): void }` ;
  `FALLBACK_ACCEPT = ".roomboard,application/x-roomboard"` ; `createFallbackHost(d: FallbackDeps): FileHost`
  (`kind: "repli"`) ; `browserFallbackDeps(doc: Document, urls: UrlApi, later?: (cb: () => void) => void): FallbackDeps` ;
  `interface BeforeUnloadEventLike { preventDefault(): void; returnValue: unknown }` ;
  `interface WebShellWindow { confirm(message: string): boolean; alert(message: string): void; addEventListener(type: "beforeunload", cb: (e: BeforeUnloadEventLike) => void): void; removeEventListener(type: "beforeunload", cb: (e: BeforeUnloadEventLike) => void): void; readonly document: { title: string } }` ;
  `createWebShell(w: WebShellWindow): ShellPort`.

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/platform/host-repli.test.ts src/platform/shell-web.test.ts --reporter=verbose 2>&1 | tail -25`
→ `Tests  10 passed (10)` ; noms `aller-retour : le téléchargement puis le sélecteur rendent les mêmes octets` (S2)
et `beforeunload : retenu seulement si modifié` (D26) présents. Puis `verifier.sh` (jeton) → `verifier.sh : OK`.

**Preuve visuelle.** Aucune (T77, mode `repli`).

**Contraintes (recopiées de « Global Constraints »).**
- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de `--force` ; aucun `git tag`, aucune release ; `.github/workflows/` non touché.
- Commits : `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit …` ; message en anglais, dernière ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Aucun test désactivé ni sauté, aucun seuil baissé.
- Aucun fichier sous `apps/web/src/engine/` ni `apps/web/src/ui/` (lot 4 en parallèle).
- `export PATH=$HOME/.cargo/bin:$PATH` avant `scripts/verifier.sh` ; suite au premier plan (`timeout: 600000`).
- Builds Tauri : au plus 2 en même temps sur la VM ; `pgrep -af "cargo.*tauri|tauri build"` avant ; `CARGO_BUILD_JOBS=2`.
- Aucun secret ; dépôt public. Worktree neuf : `pnpm install --frozen-lockfile`. Rapport en français.

**Interdits.** Aucun accès à `window` ou `document` globaux dans ces modules : tout passe par les paramètres. Pas de
`jsdom` ni `happy-dom` (faux objets). Ne pas toucher `files.ts`.

**Terminé quand.** 10 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : écart — module nouveau (API du
navigateur derrière FallbackDeps et WebShellWindow, cadrage § 3)`.

**Étapes.**

- [ ] **1. Écrire les tests (rouges).** `apps/web/src/platform/host-repli.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { SaveTarget } from "./files";
import { browserFallbackDeps, createFallbackHost, FALLBACK_ACCEPT, type FallbackDeps, type PickedFile } from "./host-repli";

function memoryDeps(o: { pick?: PickedFile | null | "saved"; failDownload?: boolean } = {}) {
  const downloads: Array<{ name: string; bytes: Uint8Array; mime: string }> = [];
  const accepts: string[] = [];
  const deps: FallbackDeps = {
    async pickFile(accept) {
      accepts.push(accept);
      if (o.pick === "saved") {
        const last = downloads[downloads.length - 1];
        return last ? { name: last.name, bytes: last.bytes } : null;
      }
      return o.pick ?? null;
    },
    download(name, bytes, mime) {
      if (o.failDownload) throw new Error("téléchargement bloqué");
      downloads.push({ name, bytes: bytes.slice(), mime });
    },
  };
  return { deps, downloads, accepts };
}

interface FakeEl {
  tag: string;
  type: string;
  accept: string;
  href: string;
  download: string;
  style: { display: string };
  files: Array<{ name: string; arrayBuffer(): Promise<ArrayBuffer> }> | null;
  listeners: Map<string, () => void>;
  clicked: number;
  removed: boolean;
  addEventListener(t: string, cb: () => void): void;
  click(): void;
  remove(): void;
}

function fakeDocument() {
  const appended: FakeEl[] = [];
  const doc = {
    createElement(tag: string): FakeEl {
      const el: FakeEl = {
        tag, type: "", accept: "", href: "", download: "", style: { display: "" }, files: null,
        listeners: new Map(), clicked: 0, removed: false,
        addEventListener(t, cb) { el.listeners.set(t, cb); },
        click() { el.clicked += 1; },
        remove() { el.removed = true; },
      };
      return el;
    },
    body: { append(el: FakeEl) { appended.push(el); } },
  };
  return { doc: doc as unknown as Document, appended };
}

const ask: SaveTarget = { kind: "ask", name: "Sans titre.roomboard" };
const bytes = new Uint8Array([0x50, 0x4b, 3, 4]);
const urls = { createObjectURL: () => "blob:1", revokeObjectURL: () => undefined };

describe("hôte de repli (téléchargement et <input type=file>)", () => {
  it("aller-retour : le téléchargement puis le sélecteur rendent les mêmes octets", async () => {
    const m = memoryDeps({ pick: "saved" });
    const host = createFallbackHost(m.deps);
    expect(host.kind).toBe("repli");
    expect(await host.save(bytes, ask)).toEqual({ kind: "download", name: "Sans titre.roomboard" });
    const opened = await host.open();
    expect(Array.from(opened?.bytes ?? [])).toEqual(Array.from(bytes));
    expect(opened?.target).toEqual({ kind: "download", name: "Sans titre.roomboard" });
    expect(m.accepts).toEqual([FALLBACK_ACCEPT]);
    expect(FALLBACK_ACCEPT).toBe(".roomboard,application/x-roomboard");
  });

  it("annulation du sélecteur : null", async () => {
    expect(await createFallbackHost(memoryDeps({ pick: null }).deps).open()).toBeNull();
  });

  it("erreur d'écriture : l'échec du téléchargement remonte", async () => {
    await expect(createFallbackHost(memoryDeps({ failDownload: true }).deps).save(bytes, ask)).rejects.toThrow("téléchargement bloqué");
  });

  it("nom : extension ajoutée, type application/x-roomboard ; Ctrl+S sur une cible download retélécharge le même nom", async () => {
    const m = memoryDeps();
    const host = createFallbackHost(m.deps);
    const first = await host.save(bytes, { kind: "ask", name: "cours" });
    if (first === null) throw new Error("annulé");
    await host.save(bytes, first);
    expect(m.downloads.map((d) => [d.name, d.mime])).toEqual([
      ["cours.roomboard", "application/x-roomboard"],
      ["cours.roomboard", "application/x-roomboard"],
    ]);
  });

  it("navigateur : input file caché, accept posé, retiré après le choix ; octets lus", async () => {
    const { doc, appended } = fakeDocument();
    const picked = browserFallbackDeps(doc, urls).pickFile(FALLBACK_ACCEPT);
    const input = appended[0];
    if (!input) throw new Error("aucun input ajouté");
    expect([input.tag, input.type, input.accept, input.style.display, input.clicked]).toEqual(["input", "file", FALLBACK_ACCEPT, "none", 1]);
    input.files = [{ name: "cours.roomboard", arrayBuffer: async () => new Uint8Array([7, 8]).buffer }];
    input.listeners.get("change")?.();
    const r = await picked;
    expect(r?.name).toBe("cours.roomboard");
    expect(Array.from(r?.bytes ?? [])).toEqual([7, 8]);
    expect(input.removed).toBe(true);
  });

  it("navigateur : événement cancel → null, input retiré", async () => {
    const { doc, appended } = fakeDocument();
    const picked = browserFallbackDeps(doc, urls).pickFile(FALLBACK_ACCEPT);
    appended[0]?.listeners.get("cancel")?.();
    expect(await picked).toBeNull();
    expect(appended[0]?.removed).toBe(true);
  });

  it("navigateur : lien de téléchargement cliqué puis retiré, URL révoquée ensuite", () => {
    const { doc, appended } = fakeDocument();
    const blobs: Blob[] = [];
    const revoked: string[] = [];
    const later: Array<() => void> = [];
    const deps = browserFallbackDeps(
      doc,
      { createObjectURL: (b) => { blobs.push(b); return "blob:x"; }, revokeObjectURL: (u) => { revoked.push(u); } },
      (cb) => { later.push(cb); },
    );
    deps.download("cours.roomboard", new Uint8Array([1, 2, 3]), "application/x-roomboard");
    const a = appended[0];
    expect([a?.tag, a?.href, a?.download, a?.clicked, a?.removed]).toEqual(["a", "blob:x", "cours.roomboard", 1, true]);
    expect(revoked).toEqual([]);
    for (const cb of later) cb();
    expect(revoked).toEqual(["blob:x"]);
    expect([blobs[0]?.type, blobs[0]?.size]).toEqual(["application/x-roomboard", 3]);
  });
});
```

`apps/web/src/platform/shell-web.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { createWebShell, type BeforeUnloadEventLike, type WebShellWindow } from "./shell-web";

function fakeWindow(answer = true) {
  const listeners = new Set<(e: BeforeUnloadEventLike) => void>();
  const alerts: string[] = [];
  const confirms: string[] = [];
  const w: WebShellWindow = {
    confirm: (m) => { confirms.push(m); return answer; },
    alert: (m) => { alerts.push(m); },
    addEventListener: (_t, cb) => { listeners.add(cb); },
    removeEventListener: (_t, cb) => { listeners.delete(cb); },
    document: { title: "" },
  };
  const unload = () => {
    const e = { prevented: false, returnValue: undefined as unknown, preventDefault() { this.prevented = true; } };
    for (const cb of listeners) cb(e);
    return e;
  };
  return { w, listeners, alerts, confirms, unload };
}

describe("coquille du navigateur", () => {
  it("beforeunload : retenu seulement si modifié", () => {
    const f = fakeWindow();
    let dirty = false;
    createWebShell(f.w).guardClose(() => dirty, "message");
    expect(f.unload().prevented).toBe(false);
    dirty = true;
    const e = f.unload();
    expect(e.prevented).toBe(true);
    expect(e.returnValue).toBe("");
  });

  it("guardClose rendu : l'écouteur est retiré", () => {
    const f = fakeWindow();
    const stop = createWebShell(f.w).guardClose(() => true, "message");
    expect(f.listeners.size).toBe(1);
    stop();
    expect(f.listeners.size).toBe(0);
  });

  it("confirm, notify et setTitle passent par la fenêtre", async () => {
    const f = fakeWindow(false);
    const shell = createWebShell(f.w);
    expect(await shell.confirm("Abandonner ?")).toBe(false);
    await shell.notify("Ouverture impossible");
    shell.setTitle("• cours.roomboard — RoomBoard");
    expect(f.confirms).toEqual(["Abandonner ?"]);
    expect(f.alerts).toEqual(["Ouverture impossible"]);
    expect(f.w.document.title).toBe("• cours.roomboard — RoomBoard");
  });
});
```

- [ ] **2. Lancer (rouge attendu).** Commande de la section → `Failed to resolve import "./host-repli"` et
`"./shell-web"`.

- [ ] **3. Écrire `apps/web/src/platform/host-repli.ts`.**

```ts
/**
 * Hôte de repli (D26, DA8) : navigateurs sans File System Access, et essai Playwright (`?fichiers=repli`, D33).
 * Ouvrir : <input type=file>. Enregistrer : téléchargement (le navigateur choisit le dossier ; Ctrl+S retélécharge).
 * Annuler un téléchargement ne se voit pas : `save` ne rend jamais null.
 */
import {
  ensureExtension,
  ROOMBOARD_EXTENSION,
  ROOMBOARD_MIME,
  type FileHost,
  type OpenedFile,
  type SaveTarget,
} from "./files";

export interface PickedFile {
  readonly name: string;
  readonly bytes: Uint8Array;
}

export interface FallbackDeps {
  pickFile(accept: string): Promise<PickedFile | null>;
  download(name: string, bytes: Uint8Array, mime: string): void;
}

export interface UrlApi {
  createObjectURL(b: Blob): string;
  revokeObjectURL(u: string): void;
}

export const FALLBACK_ACCEPT = `${ROOMBOARD_EXTENSION},${ROOMBOARD_MIME}`;
/** Délai avant de révoquer l'URL du téléchargement : le navigateur a commencé à lire. */
const REVOKE_MS = 1000;

export function createFallbackHost(d: FallbackDeps): FileHost {
  return {
    kind: "repli",
    async open(): Promise<OpenedFile | null> {
      const f = await d.pickFile(FALLBACK_ACCEPT);
      if (f === null) return null;
      return { name: f.name, bytes: f.bytes, target: { kind: "download", name: f.name } };
    },
    async save(bytes: Uint8Array, target: SaveTarget): Promise<SaveTarget | null> {
      const name = ensureExtension(target.name);
      d.download(name, bytes, ROOMBOARD_MIME);
      return { kind: "download", name };
    },
  };
}

export function browserFallbackDeps(
  doc: Document,
  urls: UrlApi,
  later: (cb: () => void) => void = (cb) => {
    setTimeout(cb, REVOKE_MS);
  },
): FallbackDeps {
  return {
    pickFile(accept: string): Promise<PickedFile | null> {
      return new Promise((resolve, reject) => {
        const input = doc.createElement("input");
        input.type = "file";
        input.accept = accept;
        input.style.display = "none";
        input.addEventListener(
          "change",
          () => {
            const file = input.files?.[0];
            input.remove();
            if (!file) {
              resolve(null);
              return;
            }
            file.arrayBuffer().then((b) => resolve({ name: file.name, bytes: new Uint8Array(b) }), reject);
          },
          { once: true },
        );
        input.addEventListener(
          "cancel",
          () => {
            input.remove();
            resolve(null);
          },
          { once: true },
        );
        doc.body.append(input);
        input.click();
      });
    },
    download(name: string, bytes: Uint8Array, mime: string): void {
      const url = urls.createObjectURL(new Blob([bytes.slice()], { type: mime }));
      const a = doc.createElement("a");
      a.href = url;
      a.download = name;
      a.style.display = "none";
      doc.body.append(a);
      a.click();
      a.remove();
      later(() => urls.revokeObjectURL(url));
    },
  };
}
```

- [ ] **4. Écrire `apps/web/src/platform/shell-web.ts`.**

```ts
/**
 * Coquille du navigateur (D26) : question et message par la fenêtre, fermeture gardée par `beforeunload` (le navigateur
 * affiche son propre texte), titre de la page.
 */
import type { ShellPort } from "./files";

export interface BeforeUnloadEventLike {
  preventDefault(): void;
  returnValue: unknown;
}

export interface WebShellWindow {
  confirm(message: string): boolean;
  alert(message: string): void;
  addEventListener(type: "beforeunload", cb: (e: BeforeUnloadEventLike) => void): void;
  removeEventListener(type: "beforeunload", cb: (e: BeforeUnloadEventLike) => void): void;
  readonly document: { title: string };
}

export function createWebShell(w: WebShellWindow): ShellPort {
  return {
    confirm: async (message) => w.confirm(message),
    notify: async (message) => {
      w.alert(message);
    },
    guardClose(isDirty) {
      const onBeforeUnload = (e: BeforeUnloadEventLike): void => {
        if (!isDirty()) return;
        e.preventDefault();
        e.returnValue = "";
      };
      w.addEventListener("beforeunload", onBeforeUnload);
      return () => w.removeEventListener("beforeunload", onBeforeUnload);
    },
    setTitle(title) {
      w.document.title = title;
    },
  };
}
```

- [ ] **5. Lancer (vert).** Commande de la section → `Tests  10 passed (10)`, puis `verifier.sh` → `verifier.sh : OK`
(`tsc --noEmit` compris).

- [ ] **6. Commit.**

```bash
cd "$WT" && git add apps/web/src/platform/host-repli.ts && git add apps/web/src/platform/host-repli.test.ts \
  && git add apps/web/src/platform/shell-web.ts && git add apps/web/src/platform/shell-web.test.ts \
  && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
     -m "feat(web): fallback file host (input + download) and browser shell (lot 5a T73)" \
     -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T74 — Hôte et coquille Tauri

<a id="tache-t74"></a>

**Objectif.** L'hôte Tauri de DA8 (boîtes natives de `plugin-dialog`, lecture et écriture par `plugin-fs`) et la
coquille de la coque : question et message natifs, fermeture interceptée par `onCloseRequested` (D26 : document
modifié → on demande ; « Non » garde la fenêtre), titre de la fenêtre. Scénario : S5.

**Fichiers.** Créer `apps/web/src/platform/host-tauri.ts`, `apps/web/src/platform/host-tauri.test.ts`.

**Interfaces.**
- Consomme (T70, `./files`) : `FileHost`, `ShellPort`, `SaveTarget`, `OpenedFile`, `ensureExtension`, `FILE_FILTER` ;
  paquets `@tauri-apps/api` 2.12.5, `@tauri-apps/plugin-dialog` 2.8.4, `@tauri-apps/plugin-fs` 2.7.1 (installés
  par T70). Permissions posées par T71 : `dialog:allow-open|save|ask|message`, `fs:allow-read-file|write-file`,
  `core:window:allow-destroy|set-title`.
- Réutilise : `@tauri-apps/plugin-dialog` — `open`, `save`, `ask`, `message` ; `@tauri-apps/plugin-fs` —
  `readFile(path)`, `writeFile(path, data)` ; `@tauri-apps/api/window` — `getCurrentWindow().onCloseRequested`,
  `.setTitle` (liste du cadrage § 3, ligne « Fichiers »), appelés seulement dans `loadTauriPorts`.
- Produit : `interface DialogFilter { readonly name: string; readonly extensions: readonly string[] }` ;
  `interface TauriDialog { open(o: { readonly multiple: false; readonly directory: false; readonly filters: readonly DialogFilter[] }): Promise<string | null>; save(o: { readonly defaultPath: string; readonly filters: readonly DialogFilter[] }): Promise<string | null>; ask(message: string, o: { readonly title: string; readonly kind: "warning" }): Promise<boolean>; message(message: string, o: { readonly title: string; readonly kind: "error" }): Promise<void> }` ;
  `interface TauriFs { readFile(path: string): Promise<Uint8Array>; writeFile(path: string, data: Uint8Array): Promise<void> }` ;
  `interface CloseEventLike { preventDefault(): void }` ;
  `interface TauriWindow { onCloseRequested(h: (e: CloseEventLike) => Promise<void>): Promise<() => void>; setTitle(title: string): Promise<void> }` ;
  `APP_TITLE = "RoomBoard"` ; `baseName(path: string): string` ;
  `createTauriHost(dialog: TauriDialog, fs: TauriFs): FileHost` (`kind: "tauri"`) ;
  `createTauriShell(dialog: TauriDialog, win: TauriWindow): ShellPort` ;
  `loadTauriPorts(): Promise<{ dialog: TauriDialog; fs: TauriFs; win: TauriWindow }>` (imports dynamiques, appelé
  par T77 dans la coque seulement).

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/platform/host-tauri.test.ts --reporter=verbose 2>&1 | tail -20`
→ `Tests  11 passed (11)` ; noms `fermeture, document modifié, réponse Non : la fenêtre reste ouverte` (Review Focus 5,
D26, S5) et `aller-retour : enregistrer sous puis ouvrir rend les mêmes octets, cible tauri` présents. Puis
`verifier.sh` (jeton) → `verifier.sh : OK` (`tsc` vérifie `loadTauriPorts` contre les types des paquets).

**Preuve visuelle.** Aucune (T78 : coque Linux).

**Contraintes (recopiées de « Global Constraints »).**
- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de `--force` ; aucun `git tag`, aucune release ; `.github/workflows/` non touché.
- Commits : `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit …` ; message en anglais, dernière ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Aucun test désactivé ni sauté, aucun seuil baissé.
- Aucun fichier sous `apps/web/src/engine/` ni `apps/web/src/ui/` (lot 4 en parallèle).
- `export PATH=$HOME/.cargo/bin:$PATH` avant `scripts/verifier.sh` ; suite au premier plan (`timeout: 600000`).
- Builds Tauri : au plus 2 en même temps sur la VM ; `pgrep -af "cargo.*tauri|tauri build"` avant ; `CARGO_BUILD_JOBS=2`.
- Aucun secret ; dépôt public. Worktree neuf : `pnpm install --frozen-lockfile`. Rapport en français.

**Interdits.** Aucun import statique des paquets `@tauri-apps/*` (le bundle du navigateur ne les charge pas) : seuls
les `import()` de `loadTauriPorts`. Aucun suffixe ajouté au chemin rendu par la boîte (la portée fs couvre ce chemin
exact). Ne pas toucher `apps/desktop/`.

**Terminé quand.** 11 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : appelé @tauri-apps/plugin-dialog,
@tauri-apps/plugin-fs, @tauri-apps/api/window (dans loadTauriPorts, non couvert par Vitest : prouvé par T78)`.

**Étapes.**

- [ ] **1. Écrire le test (rouge).** `apps/web/src/platform/host-tauri.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { SaveTarget } from "./files";
import {
  baseName,
  createTauriHost,
  createTauriShell,
  type CloseEventLike,
  type TauriDialog,
  type TauriFs,
  type TauriWindow,
} from "./host-tauri";

function fakes(o: { openPath?: string | null; savePath?: string | null; answer?: boolean; failWrite?: boolean } = {}) {
  const disk = new Map<string, Uint8Array>();
  const calls = {
    open: 0,
    save: [] as string[],
    ask: [] as Array<[string, string]>,
    message: [] as Array<[string, string]>,
    reads: [] as string[],
    writes: [] as string[],
    titles: [] as string[],
  };
  const dialog: TauriDialog = {
    async open(opt) {
      calls.open += 1;
      expect(opt.filters).toEqual([{ name: "Document RoomBoard", extensions: ["roomboard"] }]);
      return o.openPath === undefined ? "/home/j/cours.roomboard" : o.openPath;
    },
    async save(opt) {
      calls.save.push(opt.defaultPath);
      return o.savePath === undefined ? `/home/j/${opt.defaultPath}` : o.savePath;
    },
    async ask(m, opt) {
      calls.ask.push([m, opt.kind]);
      return o.answer ?? true;
    },
    async message(m, opt) {
      calls.message.push([m, opt.kind]);
    },
  };
  const fs: TauriFs = {
    async readFile(p) {
      calls.reads.push(p);
      const b = disk.get(p);
      if (!b) throw new Error(`absent : ${p}`);
      return b.slice();
    },
    async writeFile(p, d) {
      if (o.failWrite) throw new Error("forbidden path: /home/j/x.roomboard");
      calls.writes.push(p);
      disk.set(p, d.slice());
    },
  };
  let handler: ((e: CloseEventLike) => Promise<void>) | null = null;
  let unlistened = 0;
  const win: TauriWindow = {
    async onCloseRequested(h) {
      handler = h;
      return () => {
        unlistened += 1;
        handler = null;
      };
    },
    async setTitle(t) {
      calls.titles.push(t);
    },
  };
  const close = async (): Promise<boolean> => {
    let prevented = false;
    await handler?.({ preventDefault: () => { prevented = true; } });
    return prevented;
  };
  const tick = () => new Promise((r) => setTimeout(r, 0));
  return { disk, calls, dialog, fs, win, close, tick, unlistened: () => unlistened };
}

const ask: SaveTarget = { kind: "ask", name: "Sans titre.roomboard" };
const bytes = new Uint8Array([0x50, 0x4b, 3, 4]);

describe("hôte Tauri (plugin-dialog, plugin-fs)", () => {
  it("aller-retour : enregistrer sous puis ouvrir rend les mêmes octets, cible tauri", async () => {
    const f = fakes({ openPath: "/home/j/Sans titre.roomboard" });
    const host = createTauriHost(f.dialog, f.fs);
    expect(host.kind).toBe("tauri");
    const saved = await host.save(bytes, ask);
    expect(saved).toEqual({ kind: "tauri", name: "Sans titre.roomboard", path: "/home/j/Sans titre.roomboard" });
    expect(f.calls.save).toEqual(["Sans titre.roomboard"]);
    const opened = await host.open();
    expect(Array.from(opened?.bytes ?? [])).toEqual(Array.from(bytes));
    expect(opened?.target).toEqual(saved);
  });

  it("enregistrer sur une cible tauri réécrit le chemin sans boîte", async () => {
    const f = fakes();
    const host = createTauriHost(f.dialog, f.fs);
    const target: SaveTarget = { kind: "tauri", name: "cours.roomboard", path: "/home/j/cours.roomboard" };
    expect(await host.save(bytes, target)).toEqual(target);
    expect(f.calls.save).toEqual([]);
    expect(f.calls.writes).toEqual(["/home/j/cours.roomboard"]);
  });

  it("annulation de la boîte d'ouverture : null, aucune lecture", async () => {
    const f = fakes({ openPath: null });
    expect(await createTauriHost(f.dialog, f.fs).open()).toBeNull();
    expect(f.calls.reads).toEqual([]);
  });

  it("annulation de la boîte d'enregistrement : null, rien d'écrit", async () => {
    const f = fakes({ savePath: null });
    expect(await createTauriHost(f.dialog, f.fs).save(bytes, ask)).toBeNull();
    expect(f.calls.writes).toEqual([]);
  });

  it("erreur d'écriture : l'erreur de plugin-fs remonte", async () => {
    const f = fakes({ failWrite: true });
    await expect(createTauriHost(f.dialog, f.fs).save(bytes, ask)).rejects.toThrow("forbidden path");
  });

  it("fermeture, document modifié, réponse Non : la fenêtre reste ouverte", async () => {
    const f = fakes({ answer: false });
    createTauriShell(f.dialog, f.win).guardClose(() => true, "Abandonner ?");
    await f.tick();
    expect(await f.close()).toBe(true);
    expect(f.calls.ask).toEqual([["Abandonner ?", "warning"]]);
  });

  it("fermeture, document modifié, réponse Oui : la fenêtre se ferme", async () => {
    const f = fakes({ answer: true });
    createTauriShell(f.dialog, f.win).guardClose(() => true, "Abandonner ?");
    await f.tick();
    expect(await f.close()).toBe(false);
  });

  it("fermeture, document non modifié : aucune question", async () => {
    const f = fakes();
    createTauriShell(f.dialog, f.win).guardClose(() => false, "Abandonner ?");
    await f.tick();
    expect(await f.close()).toBe(false);
    expect(f.calls.ask).toEqual([]);
  });

  it("garde retirée avant la fin de l'abonnement : désabonnée dès qu'il arrive", async () => {
    const f = fakes();
    const stop = createTauriShell(f.dialog, f.win).guardClose(() => true, "Abandonner ?");
    stop();
    await f.tick();
    expect(f.unlistened()).toBe(1);
  });

  it("question, message et titre passent par les boîtes et la fenêtre natives", async () => {
    const f = fakes({ answer: false });
    const shell = createTauriShell(f.dialog, f.win);
    expect(await shell.confirm("Abandonner ?")).toBe(false);
    await shell.notify("Ouverture impossible");
    shell.setTitle("• cours.roomboard — RoomBoard");
    await f.tick();
    expect(f.calls.ask).toEqual([["Abandonner ?", "warning"]]);
    expect(f.calls.message).toEqual([["Ouverture impossible", "error"]]);
    expect(f.calls.titles).toEqual(["• cours.roomboard — RoomBoard"]);
  });

  it("baseName : chemins Windows et Unix", () => {
    expect(baseName("C:\\Users\\j\\cours.roomboard")).toBe("cours.roomboard");
    expect(baseName("/home/j/a.roomboard")).toBe("a.roomboard");
    expect(baseName("seul.roomboard")).toBe("seul.roomboard");
  });
});
```

- [ ] **2. Lancer (rouge attendu).** Commande de la section → `Failed to resolve import "./host-tauri"`.

- [ ] **3. Écrire `apps/web/src/platform/host-tauri.ts`.**

```ts
/**
 * Hôte de la coque Tauri (D26, DA8) : boîtes natives (`plugin-dialog`), lecture et écriture (`plugin-fs`, portée
 * limitée aux chemins choisis dans la boîte), fermeture interceptée (`onCloseRequested` : la fenêtre se ferme par
 * `destroy()` si le gestionnaire n'appelle pas `preventDefault`). Les paquets Tauri ne sont chargés que dans la coque.
 */
import { ensureExtension, FILE_FILTER, type FileHost, type OpenedFile, type SaveTarget, type ShellPort } from "./files";

export interface DialogFilter {
  readonly name: string;
  readonly extensions: readonly string[];
}

export interface TauriDialog {
  open(o: { readonly multiple: false; readonly directory: false; readonly filters: readonly DialogFilter[] }): Promise<string | null>;
  save(o: { readonly defaultPath: string; readonly filters: readonly DialogFilter[] }): Promise<string | null>;
  ask(message: string, o: { readonly title: string; readonly kind: "warning" }): Promise<boolean>;
  message(message: string, o: { readonly title: string; readonly kind: "error" }): Promise<void>;
}

export interface TauriFs {
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, data: Uint8Array): Promise<void>;
}

export interface CloseEventLike {
  preventDefault(): void;
}

export interface TauriWindow {
  onCloseRequested(h: (e: CloseEventLike) => Promise<void>): Promise<() => void>;
  setTitle(title: string): Promise<void>;
}

export const APP_TITLE = "RoomBoard";

export function baseName(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

export function createTauriHost(dialog: TauriDialog, fs: TauriFs): FileHost {
  return {
    kind: "tauri",
    async open(): Promise<OpenedFile | null> {
      const path = await dialog.open({ multiple: false, directory: false, filters: [FILE_FILTER] });
      if (path === null) return null;
      const bytes = await fs.readFile(path);
      const name = baseName(path);
      return { name, bytes, target: { kind: "tauri", name, path } };
    },
    async save(bytes: Uint8Array, target: SaveTarget): Promise<SaveTarget | null> {
      let path = target.kind === "tauri" ? target.path : null;
      if (path === null) {
        path = await dialog.save({ defaultPath: ensureExtension(target.name), filters: [FILE_FILTER] });
        if (path === null) return null;
      }
      await fs.writeFile(path, bytes);
      return { kind: "tauri", name: baseName(path), path };
    },
  };
}

export function createTauriShell(dialog: TauriDialog, win: TauriWindow): ShellPort {
  return {
    confirm: (message) => dialog.ask(message, { title: APP_TITLE, kind: "warning" }),
    notify: (message) => dialog.message(message, { title: APP_TITLE, kind: "error" }),
    guardClose(isDirty, message) {
      let stop: (() => void) | null = null;
      let stopped = false;
      void win
        .onCloseRequested(async (e) => {
          if (!isDirty()) return;
          const ok = await dialog.ask(message, { title: APP_TITLE, kind: "warning" });
          if (!ok) e.preventDefault();
        })
        .then((un) => {
          if (stopped) un();
          else stop = un;
        });
      return () => {
        stopped = true;
        stop?.();
      };
    },
    setTitle(title) {
      void win.setTitle(title).catch(() => undefined);
    },
  };
}

/** Ports réels de la coque (imports dynamiques : absents du bundle du navigateur). Prouvé par l'essai T78. */
export async function loadTauriPorts(): Promise<{ dialog: TauriDialog; fs: TauriFs; win: TauriWindow }> {
  const [d, f, w] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/plugin-fs"),
    import("@tauri-apps/api/window"),
  ]);
  const current = w.getCurrentWindow();
  const filters = (list: readonly DialogFilter[]) => list.map((x) => ({ name: x.name, extensions: [...x.extensions] }));
  return {
    dialog: {
      open: async (o) => {
        const r = await d.open({ multiple: false, directory: false, filters: filters(o.filters) });
        return typeof r === "string" ? r : null;
      },
      save: (o) => d.save({ defaultPath: o.defaultPath, filters: filters(o.filters) }),
      ask: (m, o) => d.ask(m, { title: o.title, kind: o.kind }),
      message: async (m, o) => {
        await d.message(m, { title: o.title, kind: o.kind });
      },
    },
    fs: {
      readFile: (p) => f.readFile(p),
      writeFile: (p, data) => f.writeFile(p, data),
    },
    win: {
      onCloseRequested: (h) => current.onCloseRequested(h),
      setTitle: (t) => current.setTitle(t),
    },
  };
}
```

Si `tsc` refuse une signature de `loadTauriPorts` contre les types réels des paquets (version 2.8.4 / 2.7.1 /
2.12.5), adapter seulement l'adaptateur (conversion de type, `await` puis retour), jamais les interfaces produites ;
noter l'écart au rapport.

- [ ] **4. Lancer (vert).** Commande de la section → `Tests  11 passed (11)`, puis `verifier.sh` → `verifier.sh : OK`.

- [ ] **5. Commit.**

```bash
cd "$WT" && git add apps/web/src/platform/host-tauri.ts && git add apps/web/src/platform/host-tauri.test.ts \
  && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
     -m "feat(web): Tauri file host and shell with guarded window close (lot 5a T74)" \
     -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T75 — Fichier ouvert en attente à travers le rechargement (IndexedDB)

<a id="tache-t75"></a>

**Objectif.** Ouvrir un fichier recharge la page (Choix tranchés) : le fichier choisi attend dans IndexedDB, l'amorce
le prend au démarrage. La cible (chemin Tauri, poignée FSA) est gardée quand elle se clone ; sinon le fichier est
gardé sans cible. Scénario : S2 (« recharger la page, ouvrir le fichier »).

**Fichiers.** Créer `apps/web/src/platform/pending.ts`, `apps/web/src/platform/pending.test.ts`.

**Interfaces.**
- Consomme (T70, `./files`) : `PendingOpen`, `PendingStore`, `SaveTarget`, `FileHandleLike` ; `fake-indexeddb` 6.2.8
  (installé par T70) dans le test seulement.
- Réutilise : aucun module du dépôt (nouveau) ; API IndexedDB du navigateur (`IDBFactory.open`, transactions,
  clonage structuré).
- Produit : `PENDING_DB = "roomboard-fichiers"` ; `createIdbPendingStore(factory: IDBFactory, name?: string): PendingStore` ;
  `createMemoryPendingStore(): PendingStore` ; `isDataClone(e: unknown): boolean`.

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/platform/pending.test.ts --reporter=verbose 2>&1 | tail -20`
→ `Tests  7 passed (7)` ; noms `cible non clonable (fausse poignée FSA) : fichier gardé sans cible` et
`rechargement : un second magasin sur la même base lit l'attente du premier` (S2) présents. Puis `verifier.sh`
(jeton) → `verifier.sh : OK`.

**Preuve visuelle.** Aucune (T77, vrai rechargement).

**Contraintes (recopiées de « Global Constraints »).**
- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de `--force` ; aucun `git tag`, aucune release ; `.github/workflows/` non touché.
- Commits : `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit …` ; message en anglais, dernière ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Aucun test désactivé ni sauté, aucun seuil baissé.
- Aucun fichier sous `apps/web/src/engine/` ni `apps/web/src/ui/` (lot 4 en parallèle).
- `export PATH=$HOME/.cargo/bin:$PATH` avant `scripts/verifier.sh` ; suite au premier plan (`timeout: 600000`).
- Builds Tauri : au plus 2 en même temps sur la VM ; `pgrep -af "cargo.*tauri|tauri build"` avant ; `CARGO_BUILD_JOBS=2`.
- Aucun secret ; dépôt public. Worktree neuf : `pnpm install --frozen-lockfile`. Rapport en français.

**Interdits.** Pas de `localStorage` ni `sessionStorage` (ils ne gardent ni octets volumineux ni poignées). Pas
d'import de `fake-indexeddb/auto` (aucun global modifié). Ne pas toucher `files.ts`.

**Terminé quand.** 7 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : écart — module nouveau (aucun
stockage existant dans le dépôt)`.

**Étapes.**

- [ ] **1. Écrire le test (rouge).** `apps/web/src/platform/pending.test.ts` :

```ts
import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import type { FileHandleLike, PendingOpen } from "./files";
import { createIdbPendingStore, createMemoryPendingStore, isDataClone } from "./pending";

const file = (target: PendingOpen["target"]): PendingOpen => ({
  name: "cours.roomboard",
  bytes: new Uint8Array([0x50, 0x4b, 1, 2]),
  target,
});

const fakeHandle: FileHandleLike = {
  name: "cours.roomboard",
  getFile: async () => ({ arrayBuffer: async () => new ArrayBuffer(0) }),
  createWritable: async () => ({ write: async () => undefined, close: async () => undefined }),
};

describe("fichier ouvert en attente (IndexedDB)", () => {
  it("put puis take rend le fichier et sa cible, puis take rend null (consommé)", async () => {
    const store = createIdbPendingStore(new IDBFactory());
    const target = { kind: "tauri", name: "cours.roomboard", path: "/home/j/cours.roomboard" } as const;
    await store.put(file(target));
    const got = await store.take();
    expect(got?.name).toBe("cours.roomboard");
    expect(Array.from(got?.bytes ?? [])).toEqual([0x50, 0x4b, 1, 2]);
    expect(got?.target).toEqual(target);
    expect(await store.take()).toBeNull();
  });

  it("cible non clonable (fausse poignée FSA) : fichier gardé sans cible", async () => {
    const store = createIdbPendingStore(new IDBFactory());
    await store.put(file({ kind: "fsa", name: "cours.roomboard", handle: fakeHandle }));
    const got = await store.take();
    expect(got?.name).toBe("cours.roomboard");
    expect(Array.from(got?.bytes ?? [])).toEqual([0x50, 0x4b, 1, 2]);
    expect(got?.target).toBeNull();
  });

  it("clear vide l'attente", async () => {
    const store = createIdbPendingStore(new IDBFactory());
    await store.put(file({ kind: "download", name: "cours.roomboard" }));
    await store.clear();
    expect(await store.take()).toBeNull();
  });

  it("rechargement : un second magasin sur la même base lit l'attente du premier", async () => {
    const factory = new IDBFactory();
    await createIdbPendingStore(factory).put(file({ kind: "download", name: "cours.roomboard" }));
    const got = await createIdbPendingStore(factory).take();
    expect(got?.target).toEqual({ kind: "download", name: "cours.roomboard" });
  });

  it("base neuve : take rend null", async () => {
    expect(await createIdbPendingStore(new IDBFactory()).take()).toBeNull();
  });

  it("mémoire : même contrat (put, take consommé, clear)", async () => {
    const store = createMemoryPendingStore();
    await store.put(file(null));
    expect((await store.take())?.name).toBe("cours.roomboard");
    expect(await store.take()).toBeNull();
    await store.put(file(null));
    await store.clear();
    expect(await store.take()).toBeNull();
  });

  it("isDataClone reconnaît DataCloneError seulement", () => {
    expect(isDataClone(Object.assign(new Error("x"), { name: "DataCloneError" }))).toBe(true);
    expect(isDataClone(new Error("x"))).toBe(false);
    expect(isDataClone("DataCloneError")).toBe(false);
  });
});
```

- [ ] **2. Lancer (rouge attendu).** Commande de la section → `Failed to resolve import "./pending"`.

- [ ] **3. Écrire `apps/web/src/platform/pending.ts`.**

```ts
/**
 * Fichier ouvert en attente du rechargement (choix du lot 5a : ouvrir = recharger la page, le moteur garde son
 * document). IndexedDB garde les octets et la cible par clonage structuré (chemin Tauri, poignée FSA réelle) ; une
 * cible qui ne se clone pas est abandonnée, le fichier reste.
 */
import type { PendingOpen, PendingStore, SaveTarget } from "./files";

export const PENDING_DB = "roomboard-fichiers";
const STORE = "ouverture";
const KEY = "courant";

interface Row {
  readonly name: string;
  readonly bytes: Uint8Array;
  readonly target: SaveTarget | null;
}

export function isDataClone(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { name?: unknown }).name === "DataCloneError";
}

export function createMemoryPendingStore(): PendingStore {
  let current: PendingOpen | null = null;
  return {
    async put(p) {
      current = { name: p.name, bytes: p.bytes.slice(), target: p.target };
    },
    async take() {
      const c = current;
      current = null;
      return c;
    },
    async clear() {
      current = null;
    },
  };
}

function finished(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB : transaction refusée"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB : transaction annulée"));
  });
}

function result<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error("IndexedDB : lecture refusée"));
  });
}

export function createIdbPendingStore(factory: IDBFactory, name: string = PENDING_DB): PendingStore {
  let db: Promise<IDBDatabase> | null = null;
  const open = (): Promise<IDBDatabase> => {
    db ??= new Promise((resolve, reject) => {
      const r = factory.open(name, 1);
      r.onupgradeneeded = () => {
        r.result.createObjectStore(STORE);
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error ?? new Error("IndexedDB indisponible"));
    });
    return db;
  };
  const write = async (row: Row): Promise<void> => {
    const tx = (await open()).transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(row, KEY); // DataCloneError levée ici, avant toute attente
    await finished(tx);
  };
  return {
    async put(p) {
      const row: Row = { name: p.name, bytes: p.bytes, target: p.target };
      try {
        await write(row);
      } catch (e) {
        if (!isDataClone(e) || p.target === null) throw e;
        await write({ ...row, target: null });
      }
    },
    async take() {
      const tx = (await open()).transaction(STORE, "readwrite");
      const done = finished(tx);
      const store = tx.objectStore(STORE);
      const read = result(store.get(KEY) as IDBRequest<Row | undefined>);
      store.delete(KEY); // exécutée après la lecture (ordre des requêtes d'une transaction)
      const row = await read;
      await done;
      return row ? { name: row.name, bytes: new Uint8Array(row.bytes), target: row.target } : null;
    },
    async clear() {
      const tx = (await open()).transaction(STORE, "readwrite");
      const done = finished(tx);
      tx.objectStore(STORE).delete(KEY);
      await done;
    },
  };
}
```

- [ ] **4. Lancer (vert).** Commande de la section → `Tests  7 passed (7)`, puis `verifier.sh` → `verifier.sh : OK`.

- [ ] **5. Commit.**

```bash
cd "$WT" && git add apps/web/src/platform/pending.ts && git add apps/web/src/platform/pending.test.ts \
  && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
     -m "feat(web): pending opened file survives the page reload in IndexedDB (lot 5a T75)" \
     -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T76 — Contrôleur des fichiers : « modifié », commandes, raccourcis, fermeture

<a id="tache-t76"></a>

**Objectif.** Le seul endroit qui décide : Ouvrir, Enregistrer, Enregistrer sous, Nouveau (D26) ; l'état « modifié »
et le titre ; la question avant d'abandonner des modifications et la garde de fermeture ; les raccourcis Ctrl+O,
Ctrl+S, Ctrl+Maj+S, Ctrl+N (Cmd sous macOS). Indépendant de l'hôte (DA8). Scénarios : S2 (enregistrer, recharger,
ouvrir : même état Yrs), S5 (fermer : confirmation si modifié ; Ctrl+S réécrit le même fichier).

**Patron à ne pas reprendre.**
1. « Modifié » calculé en comparant `doc.save(...)` au dernier fichier enregistré : faux à chaque appel, car le
   manifeste porte la date `modified` passée à `save` (D24, `docs/plans/socle-cadrage.md:51`), et coûteux (une
   sérialisation complète par contrôle).
2. « Modifié » = `canUndo()` : faux après un enregistrement suivi d'annulations, et vrai sur un document rouvert qu'on
   n'a pas touché si l'historique est rechargé un jour.
3. La version enregistrée lue **après** l'`await` de l'écriture : un trait tracé pendant que la boîte est ouverte
   serait marqué enregistré alors qu'il n'est pas dans le fichier.
Chemin de référence : la version est monotone, annulation comprise (`crates/roomboard-core/src/document.rs:472-480`)
et publiée par le moteur (`apps/web/src/engine/engine.ts:22`, `:115-119`, `onState` `:72`) : lire
`versions.state().version` avant `doc.save`, et la mémoriser seulement si l'hôte rend une cible.

**Fichiers.** Créer `apps/web/src/platform/controller.ts`, `apps/web/src/platform/controller.test.ts`.

**Interfaces.**
- Consomme (T70, `./files`) : `FileHost`, `ShellPort`, `PendingStore`, `PendingOpen`, `SaveTarget`, `OpenedFile`,
  `UNTITLED` ; `../core/api` : `CoreFactory`, `CoreDocument` (types) ; `../core/fake-core` : `fakeCore` (test).
- Réutilise : liaison Wasm (cadrage § 3, ligne « Liaison Wasm », `crates/roomboard-wasm/src/lib.rs:91`, `:95`) par le
  contrat existant `apps/web/src/core/api.ts` — `CoreDocument.save(now: string, appVersion: string): Uint8Array`
  (`wasm-core.ts:77`) et `CoreFactory.load(bytes: Uint8Array): CoreDocument` (`wasm-core.ts:90`, lève une Error
  lisible) ; aucun format recréé. Version du document : `Engine.state().version` / `Engine.onState` (lecture, API
  publique, aucun fichier de `engine/` touché).
- Produit : `APP_VERSION = "0.1.0"` ;
  `DISCARD_MESSAGE = "Le document a des modifications non enregistrées. Les abandonner ?"` ;
  `interface VersionSource { state(): { readonly version: number }; onState(cb: (s: { readonly version: number }) => void): () => void }` ;
  `type FileCommand = "open" | "save" | "saveAs" | "new"` ;
  `interface FileKey { readonly key: string; readonly ctrlKey: boolean; readonly metaKey: boolean; readonly shiftKey: boolean; readonly altKey: boolean }` ;
  `fileCommandOf(e: FileKey): FileCommand | null` ; `titleOf(name: string, dirty: boolean): string`
  (`• nom — RoomBoard` / `nom — RoomBoard`) ; `messageOf(e: unknown): string` ;
  `interface FileControllerDeps { readonly core: Pick<CoreFactory, "load">; readonly doc: Pick<CoreDocument, "save">; readonly versions: VersionSource; readonly host: FileHost; readonly shell: ShellPort; readonly pending: PendingStore; readonly opened: { readonly name: string; readonly target: SaveTarget | null } | null; readonly reload: () => void; readonly now: () => string; readonly appVersion: string }` ;
  `interface FileController { run(cmd: FileCommand): Promise<boolean>; isDirty(): boolean; name(): string; onChange(cb: () => void): () => void; dispose(): void }` ;
  `createFileController(d: FileControllerDeps): FileController`.

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/platform/controller.test.ts --reporter=verbose 2>&1 | tail -30`
→ `Tests  16 passed (16)` ; noms `trait tracé pendant l'enregistrement : le document reste modifié` (Review Focus 1,
D26/S5), `fichier illisible : message, aucune attente, aucun rechargement` (Review Focus 2, D24) et
`commande pendant une autre : ignorée, une seule boîte` (Review Focus 3, S5) présents.
**Mutation à jouer et à rapporter :** déplacer `const version = d.versions.state().version;` après
`await d.host.save(...)` → le test `trait tracé pendant l'enregistrement…` doit rougir ; remettre, revert vérifié par
`git diff --stat` vide sur `controller.ts` avant commit. Puis `verifier.sh` (jeton) → `verifier.sh : OK`.

**Preuve visuelle.** Aucune (T77).

**Contraintes (recopiées de « Global Constraints »).**
- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de `--force` ; aucun `git tag`, aucune release ; `.github/workflows/` non touché.
- Commits : `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit …` ; message en anglais, dernière ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Aucun test désactivé ni sauté, aucun seuil baissé.
- Aucun fichier sous `apps/web/src/engine/` ni `apps/web/src/ui/` (lot 4 en parallèle) : la version se lit par `VersionSource`, structurellement compatible avec `Engine`.
- `export PATH=$HOME/.cargo/bin:$PATH` avant `scripts/verifier.sh` ; suite au premier plan (`timeout: 600000`).
- Builds Tauri : au plus 2 en même temps sur la VM ; `pgrep -af "cargo.*tauri|tauri build"` avant ; `CARGO_BUILD_JOBS=2`.
- Aucun secret ; dépôt public. Worktree neuf : `pnpm install --frozen-lockfile`. Rapport en français.

**Interdits.** Aucun accès au DOM, à `window`, aux hôtes concrets (`host-*.ts`) ni à `../wasm/`. Aucune comparaison
d'octets pour « modifié ». Aucun import de `../engine/` (le type `VersionSource` suffit). Ne pas toucher `files.ts`.

**Terminé quand.** 16 tests verts, mutation rapportée rouge puis annulée, `verifier.sh : OK`, rapport avec
`Réutilisation : appelé CoreDocument.save / CoreFactory.load (apps/web/src/core/api.ts)`.

**Étapes.**

- [ ] **1. Écrire le test (rouge).** `apps/web/src/platform/controller.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { CoreDocument } from "../core/api";
import { fakeCore } from "../core/fake-core";
import {
  APP_VERSION,
  createFileController,
  DISCARD_MESSAGE,
  fileCommandOf,
  type FileControllerDeps,
  type VersionSource,
} from "./controller";
import type { FileHost, OpenedFile, PendingOpen, PendingStore, SaveTarget, ShellPort } from "./files";

function versionsOf(doc: CoreDocument): VersionSource & { bump(): void; listeners(): number } {
  const cbs = new Set<(s: { version: number }) => void>();
  return {
    state: () => ({ version: doc.version() }),
    onState(cb) {
      cbs.add(cb);
      return () => {
        cbs.delete(cb);
      };
    },
    bump() {
      for (const cb of cbs) cb({ version: doc.version() });
    },
    listeners: () => cbs.size,
  };
}

function stroke(doc: CoreDocument, v: { bump(): void }, y = 10): void {
  const page = doc.pageIds()[0];
  if (page === undefined) throw new Error("aucune page");
  doc.apply({ type: "CommitStroke", page, points: new Float32Array([0, y, 0.5, 50, y, 0.5]), style: { color: "#000000", width: 4 } });
  v.bump();
}

interface Deferred<T> { promise: Promise<T>; resolve(v: T): void }
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

type SaveBehaviour = "write" | null | Error | Deferred<SaveTarget | null>;

function memoryHost() {
  const files = new Map<string, Uint8Array>();
  const calls = { save: [] as SaveTarget[], open: 0 };
  let save: SaveBehaviour = "write";
  let open: OpenedFile | null | Error = null;
  const host: FileHost = {
    kind: "repli",
    async open() {
      calls.open += 1;
      if (open instanceof Error) throw open;
      return open;
    },
    async save(bytes, target) {
      calls.save.push(target);
      if (save instanceof Error) throw save;
      if (save === null) return null;
      if (save !== "write") return save.promise;
      files.set(target.name, bytes.slice());
      return { kind: "download", name: target.name };
    },
  };
  return {
    host,
    files,
    calls,
    onSave(b: SaveBehaviour) {
      save = b;
    },
    onOpen(o: OpenedFile | null | Error) {
      open = o;
    },
  };
}

function fakeShell(answer: boolean) {
  const log = { confirms: [] as string[], notes: [] as string[], titles: [] as string[], guardMessage: "", stopped: 0 };
  let guard: () => boolean = () => false;
  const shell: ShellPort = {
    async confirm(m) {
      log.confirms.push(m);
      return answer;
    },
    async notify(m) {
      log.notes.push(m);
    },
    guardClose(isDirty, message) {
      guard = isDirty;
      log.guardMessage = message;
      return () => {
        log.stopped += 1;
      };
    },
    setTitle(t) {
      log.titles.push(t);
    },
  };
  return { shell, log, guard: () => guard() };
}

function memoryPending(): PendingStore & { value: PendingOpen | null; cleared: number } {
  const p = {
    value: null as PendingOpen | null,
    cleared: 0,
    async put(v: PendingOpen): Promise<void> {
      p.value = v;
    },
    async take(): Promise<PendingOpen | null> {
      const v = p.value;
      p.value = null;
      return v;
    },
    async clear(): Promise<void> {
      p.cleared += 1;
      p.value = null;
    },
  };
  return p;
}

function setup(o: { opened?: FileControllerDeps["opened"]; answer?: boolean } = {}) {
  const doc = fakeCore.blank();
  const versions = versionsOf(doc);
  const h = memoryHost();
  const s = fakeShell(o.answer ?? true);
  const pending = memoryPending();
  let reloads = 0;
  const ctl = createFileController({
    core: fakeCore,
    doc,
    versions,
    host: h.host,
    shell: s.shell,
    pending,
    opened: o.opened ?? null,
    reload: () => {
      reloads += 1;
    },
    now: () => "2026-11-19T00:00:00.000Z",
    appVersion: APP_VERSION,
  });
  return { doc, versions, h, s, pending, ctl, reloads: () => reloads };
}

const pageOf = (d: CoreDocument): string => d.pageIds()[0] ?? "";
const pointsOf = (d: CoreDocument): number[][] => d.elementIds(pageOf(d)).map((id) => Array.from(d.points(id) ?? []));

describe("contrôleur des fichiers (D26)", () => {
  it("aller-retour : enregistrer puis ouvrir met en attente les mêmes octets ; le document rechargé a les mêmes traits", async () => {
    const t = setup();
    stroke(t.doc, t.versions);
    stroke(t.doc, t.versions, 30);
    expect(await t.ctl.run("save")).toBe(true);
    const bytes = t.h.files.get("Sans titre.roomboard");
    if (!bytes) throw new Error("rien d'enregistré");
    t.h.onOpen({ name: "Sans titre.roomboard", bytes, target: { kind: "download", name: "Sans titre.roomboard" } });
    expect(await t.ctl.run("open")).toBe(true);
    expect(t.reloads()).toBe(1);
    const p = t.pending.value;
    if (!p) throw new Error("aucune attente");
    expect(Array.from(p.bytes)).toEqual(Array.from(bytes));
    const reopened = fakeCore.load(p.bytes);
    expect(reopened.elementIds(pageOf(reopened))).toEqual(t.doc.elementIds(pageOf(t.doc)));
    expect(pointsOf(reopened)).toEqual(pointsOf(t.doc));
  });

  it("modifié : faux au départ, vrai après un trait, faux après l'enregistrement ; titre marqué « • »", async () => {
    const t = setup();
    expect(t.ctl.isDirty()).toBe(false);
    expect(t.s.log.titles.at(-1)).toBe("Sans titre.roomboard — RoomBoard");
    stroke(t.doc, t.versions);
    expect(t.ctl.isDirty()).toBe(true);
    expect(t.s.log.titles.at(-1)).toBe("• Sans titre.roomboard — RoomBoard");
    await t.ctl.run("save");
    expect(t.ctl.isDirty()).toBe(false);
    expect(t.s.log.titles.at(-1)).toBe("Sans titre.roomboard — RoomBoard");
  });

  it("trait tracé pendant l'enregistrement : le document reste modifié", async () => {
    const t = setup();
    stroke(t.doc, t.versions);
    const d = deferred<SaveTarget | null>();
    t.h.onSave(d);
    const saving = t.ctl.run("save");
    stroke(t.doc, t.versions, 60);
    d.resolve({ kind: "download", name: "Sans titre.roomboard" });
    expect(await saving).toBe(true);
    expect(t.ctl.isDirty()).toBe(true);
  });

  it("Ctrl+S sans cible : demande ; second Ctrl+S : réécrit la cible rendue, sans demander", async () => {
    const t = setup();
    stroke(t.doc, t.versions);
    await t.ctl.run("save");
    stroke(t.doc, t.versions, 30);
    await t.ctl.run("save");
    expect(t.h.calls.save).toEqual([
      { kind: "ask", name: "Sans titre.roomboard" },
      { kind: "download", name: "Sans titre.roomboard" },
    ]);
  });

  it("Enregistrer sous : demande toujours, même avec une cible", async () => {
    const t = setup();
    await t.ctl.run("save");
    await t.ctl.run("saveAs");
    expect(t.h.calls.save[1]).toEqual({ kind: "ask", name: "Sans titre.roomboard" });
  });

  it("annulation de l'enregistrement : reste modifié, cible inchangée, aucun message", async () => {
    const t = setup();
    stroke(t.doc, t.versions);
    t.h.onSave(null);
    expect(await t.ctl.run("save")).toBe(false);
    expect(t.ctl.isDirty()).toBe(true);
    expect(t.s.log.notes).toEqual([]);
    t.h.onSave("write");
    await t.ctl.run("save");
    expect(t.h.calls.save[1]?.kind).toBe("ask");
  });

  it("erreur d'écriture : message « Enregistrement impossible : … », reste modifié", async () => {
    const t = setup();
    stroke(t.doc, t.versions);
    t.h.onSave(new Error("disque plein"));
    expect(await t.ctl.run("save")).toBe(false);
    expect(t.s.log.notes).toEqual(["Enregistrement impossible : disque plein"]);
    expect(t.ctl.isDirty()).toBe(true);
  });

  it("ouvrir avec un document modifié : demande ; Non → rien n'est ouvert", async () => {
    const t = setup({ answer: false });
    stroke(t.doc, t.versions);
    t.h.onOpen({ name: "a.roomboard", bytes: fakeCore.blank().save("x", "y"), target: { kind: "download", name: "a.roomboard" } });
    expect(await t.ctl.run("open")).toBe(false);
    expect(t.s.log.confirms).toEqual([DISCARD_MESSAGE]);
    expect([t.h.calls.open, t.reloads(), t.pending.value]).toEqual([0, 0, null]);
  });

  it("fichier illisible : message, aucune attente, aucun rechargement", async () => {
    const t = setup();
    t.h.onOpen({
      name: "faux.roomboard",
      bytes: new TextEncoder().encode("pas un document"),
      target: { kind: "download", name: "faux.roomboard" },
    });
    expect(await t.ctl.run("open")).toBe(false);
    expect(t.s.log.notes).toEqual(["Ouverture impossible (faux.roomboard) : ce fichier n'est pas un document RoomBoard"]);
    expect([t.reloads(), t.pending.value]).toEqual([0, null]);
  });

  it("annulation de l'ouverture : rien", async () => {
    const t = setup();
    t.h.onOpen(null);
    expect(await t.ctl.run("open")).toBe(false);
    expect([t.reloads(), t.s.log.notes.length]).toEqual([0, 0]);
  });

  it("fermeture : gardée seulement si modifié, levée pendant le rechargement voulu", async () => {
    const t = setup();
    expect(t.s.log.guardMessage).toBe(DISCARD_MESSAGE);
    expect(t.s.guard()).toBe(false);
    stroke(t.doc, t.versions);
    expect(t.s.guard()).toBe(true);
    t.h.onOpen({ name: "a.roomboard", bytes: fakeCore.blank().save("x", "y"), target: { kind: "download", name: "a.roomboard" } });
    expect(await t.ctl.run("open")).toBe(true);
    expect(t.ctl.isDirty()).toBe(true);
    expect(t.s.guard()).toBe(false);
  });

  it("raccourcis : Ctrl+S, Ctrl+Maj+S, Ctrl+O, Ctrl+N, Cmd+S ; Alt ou sans Ctrl : rien", () => {
    const k = (key: string, m: Partial<{ ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }> = {}) => ({
      key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...m,
    });
    expect(fileCommandOf(k("s", { ctrlKey: true }))).toBe("save");
    expect(fileCommandOf(k("S", { ctrlKey: true, shiftKey: true }))).toBe("saveAs");
    expect(fileCommandOf(k("o", { ctrlKey: true }))).toBe("open");
    expect(fileCommandOf(k("n", { ctrlKey: true }))).toBe("new");
    expect(fileCommandOf(k("s", { metaKey: true }))).toBe("save");
    expect(fileCommandOf(k("s"))).toBeNull();
    expect(fileCommandOf(k("s", { ctrlKey: true, altKey: true }))).toBeNull();
    expect(fileCommandOf(k("z", { ctrlKey: true }))).toBeNull();
    expect(fileCommandOf(k("O", { ctrlKey: true, shiftKey: true }))).toBeNull();
  });

  it("nouveau : demande si modifié, vide l'attente, recharge ; document propre : sans question", async () => {
    const t = setup();
    expect(await t.ctl.run("new")).toBe(true);
    expect(t.s.log.confirms).toEqual([]);
    const u = setup();
    stroke(u.doc, u.versions);
    expect(await u.ctl.run("new")).toBe(true);
    expect([u.s.log.confirms, u.pending.cleared, u.reloads()]).toEqual([[DISCARD_MESSAGE], 1, 1]);
  });

  it("document ouvert depuis l'attente : nom et cible repris, Ctrl+S réécrit sans demander", async () => {
    const t = setup({ opened: { name: "cours.roomboard", target: { kind: "download", name: "cours.roomboard" } } });
    expect(t.ctl.name()).toBe("cours.roomboard");
    expect(t.s.log.titles.at(-1)).toBe("cours.roomboard — RoomBoard");
    stroke(t.doc, t.versions);
    await t.ctl.run("save");
    expect(t.h.calls.save).toEqual([{ kind: "download", name: "cours.roomboard" }]);
  });

  it("commande pendant une autre : ignorée, une seule boîte", async () => {
    const t = setup();
    const d = deferred<SaveTarget | null>();
    t.h.onSave(d);
    const first = t.ctl.run("save");
    expect(await t.ctl.run("save")).toBe(false);
    expect(await t.ctl.run("open")).toBe(false);
    expect([t.h.calls.save.length, t.h.calls.open]).toEqual([1, 0]);
    d.resolve({ kind: "download", name: "Sans titre.roomboard" });
    expect(await first).toBe(true);
  });

  it("dispose : désabonné de l'état et de la fermeture", () => {
    const t = setup();
    expect(t.versions.listeners()).toBe(1);
    t.ctl.dispose();
    expect([t.versions.listeners(), t.s.log.stopped]).toEqual([0, 1]);
  });
});
```

- [ ] **2. Lancer (rouge attendu).** Commande de la section → `Failed to resolve import "./controller"`.

- [ ] **3. Écrire `apps/web/src/platform/controller.ts`.**

```ts
/**
 * Contrôleur des fichiers (D26) : Ouvrir, Enregistrer, Enregistrer sous, Nouveau ; état « modifié » ; question avant
 * d'abandonner ; garde de fermeture. Ignore la plateforme (DA8). « Modifié » = version du document (monotone,
 * annulation comprise) différente de celle du dernier enregistrement réussi, lue avant l'écriture. Ouvrir valide le
 * fichier, le met en attente et recharge la page (le moteur garde son document).
 */
import type { CoreDocument, CoreFactory } from "../core/api";
import { UNTITLED, type FileHost, type OpenedFile, type PendingStore, type SaveTarget, type ShellPort } from "./files";

export const APP_VERSION = "0.1.0";
export const DISCARD_MESSAGE = "Le document a des modifications non enregistrées. Les abandonner ?";

/** Sous-ensemble de `Engine` (engine.ts : `state().version`, `onState`). */
export interface VersionSource {
  state(): { readonly version: number };
  onState(cb: (s: { readonly version: number }) => void): () => void;
}

export type FileCommand = "open" | "save" | "saveAs" | "new";

export interface FileKey {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
}

export interface FileControllerDeps {
  readonly core: Pick<CoreFactory, "load">;
  readonly doc: Pick<CoreDocument, "save">;
  readonly versions: VersionSource;
  readonly host: FileHost;
  readonly shell: ShellPort;
  readonly pending: PendingStore;
  /** Fichier d'où vient le document (attente prise au démarrage), sinon null. */
  readonly opened: { readonly name: string; readonly target: SaveTarget | null } | null;
  readonly reload: () => void;
  readonly now: () => string;
  readonly appVersion: string;
}

export interface FileController {
  run(cmd: FileCommand): Promise<boolean>;
  isDirty(): boolean;
  name(): string;
  onChange(cb: () => void): () => void;
  dispose(): void;
}

export function fileCommandOf(e: FileKey): FileCommand | null {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return null;
  const k = e.key.toLowerCase();
  if (k === "s") return e.shiftKey ? "saveAs" : "save";
  if (e.shiftKey) return null;
  if (k === "o") return "open";
  if (k === "n") return "new";
  return null;
}

export function titleOf(name: string, dirty: boolean): string {
  return `${dirty ? "• " : ""}${name} — RoomBoard`;
}

export function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function createFileController(d: FileControllerDeps): FileController {
  let saved = d.versions.state().version;
  let target: SaveTarget | null = d.opened?.target ?? null;
  let name = d.opened?.name ?? UNTITLED;
  let leaving = false;
  let busy = false;
  let lastTitle = "";
  const listeners = new Set<() => void>();

  const isDirty = (): boolean => d.versions.state().version !== saved;
  const changed = (): void => {
    const title = titleOf(name, isDirty());
    if (title !== lastTitle) {
      lastTitle = title;
      d.shell.setTitle(title);
    }
    for (const cb of listeners) cb();
  };
  const fail = async (prefix: string, e: unknown): Promise<false> => {
    await d.shell.notify(`${prefix} : ${messageOf(e)}`);
    return false;
  };
  const leave = (): void => {
    leaving = true;
    d.reload();
  };
  const discardOk = async (): Promise<boolean> => !isDirty() || d.shell.confirm(DISCARD_MESSAGE);

  async function save(as: boolean): Promise<boolean> {
    const version = d.versions.state().version; // lue avant l'écriture : un trait tracé pendant reste « modifié »
    let bytes: Uint8Array;
    try {
      bytes = d.doc.save(d.now(), d.appVersion);
    } catch (e) {
      return fail("Enregistrement impossible", e);
    }
    const to: SaveTarget = !as && target !== null ? target : { kind: "ask", name };
    let result: SaveTarget | null;
    try {
      result = await d.host.save(bytes, to);
    } catch (e) {
      return fail("Enregistrement impossible", e);
    }
    if (result === null) return false;
    target = result;
    name = result.name;
    saved = version;
    changed();
    return true;
  }

  async function open(): Promise<boolean> {
    if (!(await discardOk())) return false;
    let file: OpenedFile | null;
    try {
      file = await d.host.open();
    } catch (e) {
      return fail("Ouverture impossible", e);
    }
    if (file === null) return false;
    try {
      d.core.load(file.bytes).free();
    } catch (e) {
      return fail(`Ouverture impossible (${file.name})`, e);
    }
    try {
      await d.pending.put({ name: file.name, bytes: file.bytes, target: file.target });
    } catch (e) {
      return fail(`Ouverture impossible (${file.name})`, e);
    }
    leave();
    return true;
  }

  async function fresh(): Promise<boolean> {
    if (!(await discardOk())) return false;
    await d.pending.clear().catch(() => undefined);
    leave();
    return true;
  }

  const stopState = d.versions.onState(() => changed());
  const stopClose = d.shell.guardClose(() => !leaving && isDirty(), DISCARD_MESSAGE);
  changed();

  return {
    async run(cmd) {
      if (busy || leaving) return false;
      busy = true;
      try {
        if (cmd === "save") return await save(false);
        if (cmd === "saveAs") return await save(true);
        if (cmd === "open") return await open();
        return await fresh();
      } finally {
        busy = false;
      }
    },
    isDirty,
    name: () => name,
    onChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    dispose() {
      stopState();
      stopClose();
      listeners.clear();
    },
  };
}
```

- [ ] **4. Lancer (vert).** Commande de la section → `Tests  16 passed (16)`.

- [ ] **5. Jouer la mutation.** Déplacer la ligne `const version = …` juste après le bloc `result = await d.host.save(…)` ;
relancer → `trait tracé pendant l'enregistrement : le document reste modifié` en `FAIL` ; remettre la ligne ;
`git diff --stat -- apps/web/src/platform/controller.ts` (fichier encore non suivi : comparer au code de l'étape 3) ;
relancer → `Tests  16 passed (16)`. Puis `verifier.sh` → `verifier.sh : OK`.

- [ ] **6. Commit.**

```bash
cd "$WT" && git add apps/web/src/platform/controller.ts && git add apps/web/src/platform/controller.test.ts \
  && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
     -m "feat(web): file controller with modified state, shortcuts and guarded close (lot 5a T76)" \
     -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T77 — Branchement dans l'amorce et essai des fichiers au navigateur

<a id="tache-t77"></a>

**Objectif.** Un seul point de branchement dans `main.ts`, le plus petit possible : le document vient du fichier en
attente (sinon page vide), puis les fichiers se montent après le moteur (hôte choisi, raccourcis, état publié dans
`#stage`). Essai Playwright Chromium headless des trois modes (voir « Quel mode prouve quoi »), captures, et S2 des
lots 3 et 3b toujours verts. Scénario : S2 (partie fichiers).

**Fichiers.** Créer `apps/web/src/platform/mount.ts`, `apps/web/src/platform/mount.test.ts`,
`scripts/essais/fichiers-navigateur.mjs`, `docs/essais/fichiers-lot5a-repli.png`, `docs/essais/fichiers-lot5a-fsa.png`.
Modifier `apps/web/src/main.ts` (trois lignes). Seulement si `controle-hors-ligne` échoue sur un hôte cité par le
code des paquets `@tauri-apps/*` : `scripts/controle-hors-ligne.mjs` (une entrée de `NON_FETCHED_HOSTS`, voir étape 6).

**Interfaces.**
- Consomme : T70 `files.ts` (`chooseHostKind`, `detectHostEnvironment`, `parseHostChoice`, `FileHost`, `ShellPort`,
  `HostKind`, `PendingOpen`, `PendingStore`) ; T72 `createFsaHost`, `FsaWindow` ; T73 `createFallbackHost`,
  `browserFallbackDeps`, `createWebShell` ; T74 `createTauriHost`, `createTauriShell`, `loadTauriPorts` (import
  dynamique) ; T75 `createIdbPendingStore`, `createMemoryPendingStore` ; T76 `createFileController`,
  `fileCommandOf`, `messageOf`, `APP_VERSION`, `VersionSource`, `FileController` ; T71 `verifier.sh` avec le contrôle
  hors ligne.
- Réutilise : amorce `apps/web/src/main.ts` (cadrage § 3, ligne « Amorce de l'application », étendre) — `start()`
  garde tout son code ; `core.blank()` (`main.ts:51`) devient `files.doc`. Liaison Wasm par `CoreFactory.load`
  (`apps/web/src/core/wasm-core.ts:90`). Modèle de script : `scripts/essais/s2-navigateur.mjs` (`serve`
  `:60-78`, `loadPlaywright` `:49-58`, tracé `:128-135`, pixels d'encre `:96-112`).
- Produit : `interface StartedDocument { readonly doc: CoreDocument; readonly opened: PendingOpen | null; readonly error: string | null }` ;
  `startDocument(core: CoreFactory, pending: PendingStore): Promise<StartedDocument>` ;
  `interface PreparedFiles extends StartedDocument { mount(engine: VersionSource, stage: HTMLElement): Promise<FileController> }` ;
  `prepareFiles(core: CoreFactory, w?: Window): Promise<PreparedFiles>` ; attributs publiés :
  `#stage[data-fichiers]` (`tauri|fsa|repli`), `#stage[data-modifie]` (`0|1`), `#stage[data-fichier]` (nom),
  `#stage[data-fichier-erreur]` (si l'attente était illisible). Script :
  `node scripts/essais/fichiers-navigateur.mjs [--captures]` (0 réussi, 1 échec, 2 outil absent), dernière ligne
  `Fichiers lot 5a : OK (3 modes)`.

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/platform/mount.test.ts --reporter=verbose 2>&1 | tail -15`
→ `Tests  4 passed (4)` ; nom `fichier en attente illisible : page vide et message qui nomme le fichier` (Review
Focus 2, D24) présent.
`cd "$WT" && export PATH=$HOME/.cargo/bin:$PATH && scripts/verifier.sh 2>&1 | tail -30` → `controle-hors-ligne : OK (`
et `verifier.sh : OK` (web 32 fichiers attendus après fusion de T70-T76, 0 `FAIL `).
`cd "$WT" && node scripts/essais/fichiers-navigateur.mjs --captures 2>&1 | tail -45` → lignes `ok — [repli] …`,
`ok — [fsa] …`, `ok — [detection] …`, dont `ok — [repli] fichier rouvert : le trait revient aux mêmes coordonnées`,
`ok — [fsa] Ctrl+S deux fois : une seule boîte, deux écritures sur la même poignée`, `ok — [repli] hors ligne : aucune
requête hors de 127.0.0.1 (0)`, puis `Fichiers lot 5a : OK (3 modes)`, code 0.
Tests à garder verts (zone `main.ts`) : `node scripts/essais/s2-navigateur.mjs 2>&1 | tail -5` → `S2 lot 3 : OK` ;
`node scripts/essais/s2-navigateur.mjs --lot3b 2>&1 | tail -5` → `S2 lot 3b : OK (4 passages)`.

**Preuve visuelle.** Lectures d'abord (dans la sortie du script) : `#stage[data-fichiers]="repli"`, `"fsa"`,
`"repli"` (détection) ; `#stage[data-elements]` = 1 (repli) et 2 (fsa) après réouverture ; `#stage[data-modifie]="0"` ;
`#stage[data-fichier]="Sans titre.roomboard"`. Puis captures `docs/essais/fichiers-lot5a-repli.png` et
`docs/essais/fichiers-lot5a-fsa.png`, à décrire au rapport : page blanche, le trait horizontal rouvert à y = 300
(et le second à y = 420 en `fsa`), barre du lot 3b en haut à gauche.

**Contraintes (recopiées de « Global Constraints »).**
- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de `--force` ; aucun `git tag`, aucune release ; `.github/workflows/` non touché.
- Commits : `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit …` ; message en anglais, dernière ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Aucun test désactivé ni sauté, aucun seuil baissé.
- Aucun fichier sous `apps/web/src/engine/` ni `apps/web/src/ui/` (lot 4 en parallèle) ; dans `main.ts`, seulement les trois lignes de l'étape 4 (le lot 4 change la barre DOM du même fichier : hunks séparés).
- `export PATH=$HOME/.cargo/bin:$PATH` avant `scripts/verifier.sh` ; suite au premier plan (`timeout: 600000`).
- Builds Tauri : au plus 2 en même temps sur la VM ; `pgrep -af "cargo.*tauri|tauri build"` avant ; `CARGO_BUILD_JOBS=2`.
- Aucun secret ; dépôt public. Worktree neuf : `pnpm install --frozen-lockfile`. Rapport en français.

**Interdits.** Ne pas modifier `scripts/essais/s2-navigateur.mjs`, `index.html`, `app/barre.ts`. Pas d'import statique
de `host-tauri.ts` dans `mount.ts` (import dynamique). Pas de `?fichiers=` ailleurs que dans l'essai. Une entrée de
`NON_FETCHED_HOSTS` exige la preuve, citée au rapport, que la chaîne n'est jamais chargée (contexte `grep -o` de 80
caractères : message d'erreur, lien de documentation) ; un hôte réellement chargé est un défaut à corriger, pas à
autoriser.

**Terminé quand.** 4 tests verts, `verifier.sh : OK`, `Fichiers lot 5a : OK (3 modes)`, S2 lots 3 et 3b verts, deux
captures décrites, rapport avec `Réutilisation : appelé main.ts (étendu, 3 lignes), CoreFactory.load` et le diff de
`main.ts` (`git diff --stat` : 1 fichier, ≤ 6 lignes ajoutées, 1 retirée).

**Étapes.**

- [ ] **1. Écrire le test (rouge).** `apps/web/src/platform/mount.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { CoreDocument } from "../core/api";
import { fakeCore } from "../core/fake-core";
import type { PendingOpen, PendingStore } from "./files";
import { startDocument } from "./mount";

function store(value: PendingOpen | null, failTake = false): PendingStore & { taken: number } {
  const s = {
    taken: 0,
    async put(): Promise<void> {},
    async take(): Promise<PendingOpen | null> {
      s.taken += 1;
      if (failTake) throw new Error("IndexedDB bloquée");
      return value;
    },
    async clear() {},
  };
  return s;
}

function savedWithStroke(): Uint8Array {
  const d: CoreDocument = fakeCore.blank();
  const page = d.pageIds()[0] ?? "";
  d.apply({ type: "CommitStroke", page, points: new Float32Array([0, 0, 0.5, 10, 10, 0.5]), style: { color: "#000000", width: 4 } });
  return d.save("2026-11-19T00:00:00.000Z", "0.1.0");
}

describe("amorce des fichiers", () => {
  it("sans fichier en attente : page vide, aucune erreur", async () => {
    const r = await startDocument(fakeCore, store(null));
    expect(r.doc.pageIds()).toHaveLength(1);
    expect(r.doc.elementIds(r.doc.pageIds()[0] ?? "")).toEqual([]);
    expect([r.opened, r.error]).toEqual([null, null]);
  });

  it("fichier en attente : document chargé, nom et cible repris, attente consommée", async () => {
    const pending: PendingOpen = { name: "cours.roomboard", bytes: savedWithStroke(), target: { kind: "download", name: "cours.roomboard" } };
    const s = store(pending);
    const r = await startDocument(fakeCore, s);
    expect(r.doc.elementIds(r.doc.pageIds()[0] ?? "")).toHaveLength(1);
    expect(r.opened).toEqual(pending);
    expect([r.error, s.taken]).toEqual([null, 1]);
  });

  it("fichier en attente illisible : page vide et message qui nomme le fichier", async () => {
    const bad: PendingOpen = { name: "faux.roomboard", bytes: new TextEncoder().encode("pas un document"), target: null };
    const r = await startDocument(fakeCore, store(bad));
    expect(r.doc.elementIds(r.doc.pageIds()[0] ?? "")).toEqual([]);
    expect(r.opened).toBeNull();
    expect(r.error).toBe("Ouverture impossible (faux.roomboard) : ce fichier n'est pas un document RoomBoard");
  });

  it("attente inaccessible (IndexedDB refusée) : page vide, sans message (aucun geste de l'utilisateur)", async () => {
    const r = await startDocument(fakeCore, store(null, true));
    expect(r.doc.pageIds()).toHaveLength(1);
    expect([r.opened, r.error]).toEqual([null, null]);
  });
});
```

- [ ] **2. Lancer (rouge attendu).** Commande de la section → `Failed to resolve import "./mount"`.

- [ ] **3. Écrire `apps/web/src/platform/mount.ts`.**

```ts
/**
 * Branchement des fichiers dans l'amorce (D26, DA8) : le seul module que `main.ts` appelle pour les fichiers.
 * `prepareFiles` (avant le moteur) rend le document : le fichier en attente du rechargement, sinon une page vide.
 * `mount` (après le moteur) choisit l'hôte, crée le contrôleur, lie Ctrl+O, Ctrl+S, Ctrl+Maj+S, Ctrl+N et publie
 * l'état dans `#stage` (`data-fichiers`, `data-modifie`, `data-fichier`, `data-fichier-erreur`).
 */
import type { CoreDocument, CoreFactory } from "../core/api";
import {
  APP_VERSION,
  createFileController,
  fileCommandOf,
  messageOf,
  type FileController,
  type VersionSource,
} from "./controller";
import {
  chooseHostKind,
  detectHostEnvironment,
  parseHostChoice,
  type FileHost,
  type HostKind,
  type PendingOpen,
  type PendingStore,
  type ShellPort,
} from "./files";
import { createFsaHost, type FsaWindow } from "./host-fsa";
import { browserFallbackDeps, createFallbackHost } from "./host-repli";
import { createIdbPendingStore, createMemoryPendingStore } from "./pending";
import { createWebShell } from "./shell-web";

export interface StartedDocument {
  readonly doc: CoreDocument;
  readonly opened: PendingOpen | null;
  readonly error: string | null;
}

export interface PreparedFiles extends StartedDocument {
  mount(engine: VersionSource, stage: HTMLElement): Promise<FileController>;
}

export async function startDocument(core: CoreFactory, pending: PendingStore): Promise<StartedDocument> {
  let opened: PendingOpen | null;
  try {
    opened = await pending.take();
  } catch (e) {
    console.warn(`RoomBoard : attente du fichier illisible (${messageOf(e)})`);
    return { doc: core.blank(), opened: null, error: null };
  }
  if (opened === null) return { doc: core.blank(), opened: null, error: null };
  try {
    return { doc: core.load(opened.bytes), opened, error: null };
  } catch (e) {
    return { doc: core.blank(), opened: null, error: `Ouverture impossible (${opened.name}) : ${messageOf(e)}` };
  }
}

async function hostFor(kind: HostKind, w: Window): Promise<{ host: FileHost; shell: ShellPort }> {
  if (kind === "tauri") {
    const { createTauriHost, createTauriShell, loadTauriPorts } = await import("./host-tauri");
    const p = await loadTauriPorts();
    return { host: createTauriHost(p.dialog, p.fs), shell: createTauriShell(p.dialog, p.win) };
  }
  const shell = createWebShell({
    confirm: (m) => w.confirm(m),
    alert: (m) => w.alert(m),
    addEventListener: (t, cb) => w.addEventListener(t, cb),
    removeEventListener: (t, cb) => w.removeEventListener(t, cb),
    document: w.document,
  });
  if (kind === "fsa") return { host: createFsaHost(w as unknown as FsaWindow), shell };
  return { host: createFallbackHost(browserFallbackDeps(w.document, URL)), shell };
}

export async function prepareFiles(core: CoreFactory, w: Window = window): Promise<PreparedFiles> {
  const pending = typeof w.indexedDB === "undefined" ? createMemoryPendingStore() : createIdbPendingStore(w.indexedDB);
  const started = await startDocument(core, pending);
  return {
    ...started,
    async mount(engine, stage) {
      const kind = chooseHostKind(detectHostEnvironment(w), parseHostChoice(w.location.search));
      const { host, shell } = await hostFor(kind, w);
      const ctl = createFileController({
        core,
        doc: started.doc,
        versions: engine,
        host,
        shell,
        pending,
        opened: started.opened,
        reload: () => w.location.reload(),
        now: () => new Date().toISOString(),
        appVersion: APP_VERSION,
      });
      const mark = (): void => {
        stage.dataset["fichiers"] = kind;
        stage.dataset["modifie"] = ctl.isDirty() ? "1" : "0";
        stage.dataset["fichier"] = ctl.name();
      };
      mark();
      ctl.onChange(mark);
      w.addEventListener("keydown", (e) => {
        if (e.isComposing) return;
        const cmd = fileCommandOf(e);
        if (cmd === null) return;
        e.preventDefault();
        void ctl.run(cmd);
      });
      if (started.error !== null) {
        stage.dataset["fichierErreur"] = started.error;
        void shell.notify(started.error);
      }
      return ctl;
    },
  };
}
```

- [ ] **4. Brancher dans `apps/web/src/main.ts` (seul point de branchement).** Trois changements, rien d'autre :

```ts
// 1. avec les autres imports, après `import { createPenTool } from "./engine/tools/pen";` :
import { prepareFiles } from "./platform/mount";

// 2. dans start(), remplacer `  const doc = core.blank();` par :
  // Fichiers (D26) : le document vient du fichier ouvert avant le rechargement, sinon une page vide.
  const files = await prepareFiles(core);
  const doc = files.doc;

// 3. juste avant `  stage.dataset["ready"] = "1";` :
  await files.mount(engine, stage);
```

Lancer la commande de la section → `Tests  4 passed (4)`, puis `verifier.sh` → `verifier.sh : OK`.

- [ ] **5. Écrire `scripts/essais/fichiers-navigateur.mjs`.**

```js
#!/usr/bin/env node
// Essai des fichiers au navigateur (lot 5a : D26, DA8, D27 ; S2 partie fichiers). L'application construite
// (apps/web/dist) servie en local, Chromium headless de Playwright, souris simulée. Trois modes :
//   repli     `?fichiers=repli` : Ctrl+S → téléchargement intercepté ; recharger ; Ctrl+O → sélecteur <input type=file>
//             → le trait revient ; faux fichier → message, document inchangé ; fermeture modifiée → beforeunload.
//   fsa       sans réglage, faux showSaveFilePicker / showOpenFilePicker injectés : une seule boîte, Ctrl+S réécrit la
//             même poignée ; recharger ; Ctrl+O → les deux traits reviennent. Ne prouve ni la boîte du système, ni les
//             permissions, ni la poignée réelle gardée dans IndexedDB (fausse poignée non clonable).
//   detection sans réglage, sélecteurs retirés de window : le repli est choisi par détection ; même parcours que repli.
// Tous : aucune requête hors de 127.0.0.1 (D27). Hors de scripts/verifier.sh : exige Playwright (cache npx).
// `serve` et `loadPlaywright` recopiés de scripts/essais/s2-navigateur.mjs (non exportés ; mis en commun au lot 5b).
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Usage : node scripts/essais/fichiers-navigateur.mjs [--captures]
import { existsSync, readdirSync } from "node:fs";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { homedir, tmpdir } from "node:os";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const DIST = join(ROOT, "apps", "web", "dist");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".wasm": "application/wasm",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
const MODES = ["repli", "fsa", "detection"];
const FIRST = [[400, 300], [650, 300], [900, 300]];
const SECOND = [[400, 420], [650, 420], [900, 420]];
const FIRST_BOX = [640, 290, 660, 310];
const SECOND_BOX = [640, 410, 660, 430];

class Echec extends Error {}

async function loadPlaywright() {
  const candidates = [];
  if (process.env.PLAYWRIGHT_MODULE) candidates.push(process.env.PLAYWRIGHT_MODULE);
  const npx = join(homedir(), ".npm", "_npx");
  if (existsSync(npx)) {
    for (const d of readdirSync(npx)) candidates.push(join(npx, d, "node_modules", "playwright", "index.mjs"));
  }
  const found = candidates.find((c) => existsSync(c));
  return found ? import(pathToFileURL(found).href) : null;
}

function serve() {
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url ?? "/", "http://local").pathname);
      const rel = normalize(path).replace(/^[/\\]+/, "");
      const file = join(DIST, rel === "" ? "index.html" : rel);
      if (file !== DIST && !file.startsWith(DIST + sep)) {
        res.writeHead(403).end();
        return;
      }
      const target = (await stat(file)).isDirectory() ? join(file, "index.html") : file;
      const body = await readFile(target);
      res.writeHead(200, { "content-type": TYPES[extname(target)] ?? "application/octet-stream" }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

/** Faux File System Access, injecté avant le chargement ; fichiers et compteurs dans sessionStorage (survit au rechargement). */
function fakeFsa() {
  const KEY = "faux-fsa";
  const load = () => JSON.parse(sessionStorage.getItem(KEY) ?? '{"files":{},"save":0,"open":0,"writes":0,"suggested":null}');
  const store = (s) => sessionStorage.setItem(KEY, JSON.stringify(s));
  const b64 = (u8) => {
    let s = "";
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s);
  };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const handle = (name) => ({
    kind: "file",
    name,
    async getFile() {
      const bytes = unb64(load().files[name] ?? "");
      return { arrayBuffer: async () => bytes.buffer.slice(0) };
    },
    async createWritable() {
      const chunks = [];
      return {
        async write(d) { chunks.push(new Uint8Array(d)); },
        async close() {
          const all = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
          let at = 0;
          for (const c of chunks) { all.set(c, at); at += c.length; }
          const s = load();
          s.files[name] = b64(all);
          s.writes += 1;
          store(s);
        },
        async abort() {},
      };
    },
    async queryPermission() { return "granted"; },
    async requestPermission() { return "granted"; },
  });
  window.showSaveFilePicker = async (o) => {
    const s = load();
    s.save += 1;
    s.suggested = o?.suggestedName ?? null;
    store(s);
    return handle(o?.suggestedName ?? "x.roomboard");
  };
  window.showOpenFilePicker = async () => {
    const s = load();
    s.open += 1;
    store(s);
    const name = Object.keys(s.files)[0];
    if (!name) throw new DOMException("aucun fichier", "AbortError");
    return [handle(name)];
  };
}

async function run(browser, port, mode, { captures, tmp }) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, acceptDownloads: true });
  const external = [];
  await context.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === "127.0.0.1") return route.continue();
    external.push(u.href);
    return route.abort();
  });
  if (mode === "fsa") await context.addInitScript(fakeFsa);
  if (mode === "detection") {
    await context.addInitScript(() => {
      for (const k of ["showSaveFilePicker", "showOpenFilePicker"]) {
        delete window[k];
        if (typeof window[k] === "function") window[k] = undefined; // propriété héritée : masquée
      }
    });
  }
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const dialogs = [];
  page.on("dialog", async (d) => {
    dialogs.push({ type: d.type(), message: d.message() });
    await d.accept();
  });
  const check = (cond, msg) => {
    if (!cond) throw new Echec(`[${mode}] ${msg}`);
    console.log(`ok — [${mode}] ${msg}`);
  };
  const frames = () =>
    page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))));
  const attr = (name) => page.getAttribute("#stage", name);
  const elements = async () => Number(await attr("data-elements"));
  const ready = async () => {
    await page.waitForSelector('#stage[data-ready="1"]', { timeout: 15000 });
    await frames();
  };
  const clean = () => page.waitForFunction(() => document.querySelector("#stage")?.dataset.modifie === "0");
  const drag = async (points) => {
    const [first, ...rest] = points;
    await page.mouse.move(first[0], first[1]);
    await page.mouse.down();
    for (const [x, y] of rest) await page.mouse.move(x, y, { steps: 8 });
    await page.mouse.up();
    await frames();
  };
  // Pixels d'encre (somme RVB < 300) dans une boîte en px CSS du canvas de scène (même mesure que S2).
  const ink = (box) =>
    page.$eval(
      "#scene",
      (c, [x0, y0, x1, y1]) => {
        const ctx = c.getContext("2d");
        const sx = c.width / c.clientWidth;
        const sy = c.height / c.clientHeight;
        const w = Math.max(1, Math.round((x1 - x0) * sx));
        const h = Math.max(1, Math.round((y1 - y0) * sy));
        const d = ctx.getImageData(Math.round(x0 * sx), Math.round(y0 * sy), w, h).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 300) n++;
        return n;
      },
      box,
    );
  const waitDialog = async (type) => {
    for (let i = 0; i < 50 && !dialogs.some((d) => d.type === type); i++) await new Promise((r) => setTimeout(r, 100));
    return dialogs.find((d) => d.type === type);
  };

  await page.goto(`http://127.0.0.1:${port}/${mode === "repli" ? "?fichiers=repli" : ""}`);
  await ready();
  const expected = mode === "fsa" ? "fsa" : "repli";
  check((await attr("data-fichiers")) === expected, `hôte choisi : data-fichiers="${expected}"`);
  check((await attr("data-modifie")) === "0" && (await elements()) === 0, "document neuf, non modifié");
  await drag(FIRST);
  check((await elements()) === 1 && (await attr("data-modifie")) === "1", "un trait : document modifié");
  check((await page.title()).startsWith("• "), "titre marqué « • »");

  if (mode === "fsa") {
    await page.keyboard.press("Control+s");
    await clean();
    await drag(SECOND);
    await page.keyboard.press("Control+s");
    await clean();
    const s = await page.evaluate(() => JSON.parse(sessionStorage.getItem("faux-fsa")));
    check(s.save === 1 && s.writes === 2, `Ctrl+S deux fois : une seule boîte, deux écritures sur la même poignée (save=${s.save}, writes=${s.writes})`);
    check(s.suggested === "Sans titre.roomboard", "nom proposé « Sans titre.roomboard »");
    await page.reload();
    await ready();
    check((await elements()) === 0, "rechargé : page vide");
    const nav = page.waitForEvent("load");
    await page.keyboard.press("Control+o");
    await nav;
    await ready();
    check((await elements()) === 2, "fichier rouvert : les deux traits reviennent");
    check((await ink(FIRST_BOX)) > 0 && (await ink(SECOND_BOX)) > 0, "encre aux mêmes coordonnées (y = 300 et 420)");
  } else {
    const dl = page.waitForEvent("download");
    await page.keyboard.press("Control+s");
    const download = await dl;
    const file = join(tmp, `${mode}.roomboard`);
    await download.saveAs(file);
    const bytes = await readFile(file);
    check(download.suggestedFilename() === "Sans titre.roomboard", "téléchargement « Sans titre.roomboard » intercepté");
    check(bytes.length > 0 && bytes[0] === 0x50 && bytes[1] === 0x4b, `fichier ZIP (${bytes.length} octets, « PK »)`);
    await clean();
    check(!(await page.title()).startsWith("• "), "enregistré : titre sans « • »");
    await page.reload();
    await ready();
    check((await elements()) === 0, "rechargé : page vide");
    const chooser = page.waitForEvent("filechooser");
    const nav = page.waitForEvent("load");
    await page.keyboard.press("Control+o");
    await (await chooser).setFiles(file);
    await nav;
    await ready();
    check((await elements()) === 1 && (await ink(FIRST_BOX)) > 0, "fichier rouvert : le trait revient aux mêmes coordonnées");
  }
  check((await attr("data-fichier")) === "Sans titre.roomboard" && (await attr("data-modifie")) === "0", "nom repris, non modifié");
  if (captures && mode !== "detection") {
    await page.screenshot({ path: join(ROOT, "docs", "essais", `fichiers-lot5a-${mode}.png`) });
    console.log(`capture docs/essais/fichiers-lot5a-${mode}.png`);
  }

  if (mode === "repli") {
    const bad = join(tmp, "faux.roomboard");
    await writeFile(bad, "pas un zip");
    const chooser = page.waitForEvent("filechooser");
    await page.keyboard.press("Control+o");
    await (await chooser).setFiles(bad);
    const alert = await waitDialog("alert");
    check(alert !== undefined && alert.message.startsWith("Ouverture impossible (faux.roomboard)"), `fichier invalide : message « ${alert?.message} »`);
    check((await elements()) === 1, "fichier invalide : document inchangé");
  }
  check(external.length === 0, `hors ligne : aucune requête hors de 127.0.0.1 (${external.length})`);
  check(errors.length === 0, `aucune erreur de page ${errors.join(" | ")}`);
  if (mode === "repli") {
    await drag(SECOND);
    await page.close({ runBeforeUnload: true });
    check((await waitDialog("beforeunload")) !== undefined, "fermeture d'un document modifié : le navigateur demande");
  }
  await context.close();
}

async function main() {
  const argv = process.argv.slice(2);
  let sha = "inconnu";
  try {
    sha = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    // hors dépôt git : la ligne le dit
  }
  console.log(`sha ${sha}`);
  const label = "Fichiers lot 5a";
  if (!existsSync(join(DIST, "index.html"))) {
    console.error(`${label} : ÉCHEC — apps/web/dist absent : lancer d'abord scripts/verifier.sh`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${label} : outil absent — Playwright introuvable (npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=…)`);
    return 2;
  }
  const server = await serve();
  const port = server.address().port;
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-fichiers-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${label} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    for (const mode of MODES) await run(browser, port, mode, { captures: argv.includes("--captures"), tmp });
    console.log(`${label} : OK (${MODES.length} modes)`);
    return 0;
  } catch (e) {
    console.error(`${label} : ÉCHEC — ${e instanceof Echec ? e.message : e instanceof Error ? e.stack : e}`);
    return 1;
  } finally {
    await browser?.close();
    server.close();
    await rm(tmp, { recursive: true, force: true });
  }
}

process.exitCode = await main();
```

- [ ] **6. Jouer l'essai et les S2.** Après `verifier.sh : OK` (le dist existe) :
`node scripts/essais/fichiers-navigateur.mjs --captures 2>&1 | tail -45` → `Fichiers lot 5a : OK (3 modes)` ;
`node scripts/essais/s2-navigateur.mjs 2>&1 | tail -5` → `S2 lot 3 : OK` ;
`node scripts/essais/s2-navigateur.mjs --lot3b 2>&1 | tail -5` → `S2 lot 3b : OK (4 passages)`.
Si `verifier.sh` s'arrête sur `controle-hors-ligne : … hôte distant X` venu d'un fichier `assets/*` des paquets
`@tauri-apps/*` : `grep -o '.\{40\}X.\{40\}' apps/web/dist/assets/*.js` ; si la chaîne est un texte jamais chargé,
ajouter `["X", "<raison>"]` à `NON_FETCHED_HOSTS` dans `scripts/controle-hors-ligne.mjs`, citer le contexte au
rapport, relancer ; sinon arrêter et rapporter.
Un échec de l'essai venu d'un écart de comportement réel (et non du script) se rapporte tel quel, sans assouplir un
`check`.

- [ ] **7. Commit.**

```bash
cd "$WT" && git add apps/web/src/platform/mount.ts && git add apps/web/src/platform/mount.test.ts \
  && git add apps/web/src/main.ts && git add scripts/essais/fichiers-navigateur.mjs \
  && git add docs/essais/fichiers-lot5a-repli.png && git add docs/essais/fichiers-lot5a-fsa.png \
  && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
     -m "feat(web): wire files into the bootstrap, browser file test in three modes (lot 5a T77)" \
     -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(Ajouter `scripts/controle-hors-ligne.mjs` par un `git add` séparé seulement s'il a été modifié à l'étape 6.)

---

### Tâche T78 — Coque Linux : build Tauri, essai ouvrir / enregistrer / fermer

<a id="tache-t78"></a>

**Objectif.** Tâche de l'orchestrateur, sur la branche du lot après fusion de T70-T77 : prouver la partie Linux de S5
dans la vraie coque — CSP qui laisse charger le Wasm, boîtes GTK, écriture et lecture dans la portée accordée par la
boîte, question avant de fermer, « Non » qui garde la fenêtre. Scénario : S5 (Linux).

**Fichiers.** Créer `docs/essais/coque-linux-lot5a.png`. Rien d'autre (l'état est tenu par l'orchestrateur).

**Interfaces.**
- Consomme : tout le lot (T71 coque et contrôle ; T74 hôte Tauri ; T77 amorce).
- Réutilise : procédure Broadway du lot 3b (état : « Coque Linux », shim DPI 96 hors dépôt ; piège : fermer la fenêtre
  par son ✕, ne pas tuer le client).
- Produit : relevé au fichier d'état (durée, pic mémoire, taille du `.deb`, résultat de chaque geste), capture.

**Test et commande bornée.** Dans l'ordre, sur `/home/adminjd/projets/roomboard-wt/socle-lot5a` :

```bash
cd /home/adminjd/projets/roomboard-wt/socle-lot5a && export PATH=$HOME/.cargo/bin:$PATH
scripts/verifier.sh 2>&1 | tail -30                                   # verifier.sh : OK
node scripts/essais/fichiers-navigateur.mjs 2>&1 | tail -5            # Fichiers lot 5a : OK (3 modes)
grep -A1 -E '^name = "tauri(-plugin-dialog|-plugin-fs)?"$' apps/desktop/src-tauri/Cargo.lock
grep -E '"@tauri-apps/(api|plugin-dialog|plugin-fs)"' apps/web/package.json   # 2.12.x / 2.8.x / 2.7.x des deux côtés
pgrep -af "cargo.*tauri|tauri build"                                  # deux lignes : attendre
CARGO_BUILD_JOBS=2 cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml --all-targets -- -D warnings 2>&1 | tail -5
pgrep -af "cargo.*tauri|tauri build"
CARGO_BUILD_JOBS=2 /usr/bin/time -v pnpm --filter @roomboard/desktop tauri build 2>&1 | tail -40
```

Attendus : clippy `Finished` sans `warning:` ; build : ligne `Running beforeBuildCommand`, chemin du `.deb` sous
`apps/desktop/src-tauri/target/release/bundle/deb/`, `Maximum resident set size` relevé. Une ligne
`Found version mismatched Tauri packages` est un échec (versions npm et crates à réaligner).

**Preuve visuelle.** Lancer `apps/desktop/src-tauri/target/release/roomboard-desktop` sous Broadway (shim DPI 96 du
lot 3b). Gestes et lectures :

| # | geste | attendu |
|---|---|---|
| 1 | tracer un trait | trait visible (le Wasm a chargé sous la CSP) ; titre `• Sans titre.roomboard — RoomBoard` |
| 2 | Ctrl+S | boîte GTK « Enregistrer », nom `Sans titre.roomboard` ; saisir `/tmp/essai-5a.roomboard`, Entrée |
| 3 | — | `ls -l /tmp/essai-5a.roomboard` : fichier non vide ; `head -c2` → `PK` ; titre sans `•` |
| 4 | tracer un second trait, Ctrl+S | aucune boîte ; taille ou date du fichier changée |
| 5 | tracer, fermer par ✕ | question « Le document a des modifications non enregistrées. Les abandonner ? » ; **Non** : la fenêtre reste — capture `docs/essais/coque-linux-lot5a.png` avec la question visible |
| 6 | Ctrl+O, répondre Oui, choisir `/tmp/essai-5a.roomboard` | la page se recharge, les deux traits du geste 4 reviennent, titre `essai-5a.roomboard — RoomBoard` |
| 7 | fermer par ✕ (non modifié) | fermeture sans question |

Si le geste 2 ou 6 échoue par `forbidden path` ou `not allowed` : seule correction permise, la permission exacte
nommée par l'erreur (ou la portée `$HOME/**/*.roomboard` pour fs), commit séparé, noté en écart ; tout autre échec
est un défaut rapporté, pas contourné.

**Contraintes (recopiées de « Global Constraints »).**
- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un ; pas de `--force` ; aucun `git tag`, aucune release ; `.github/workflows/` non touché.
- Commits : `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit …` ; message en anglais, dernière ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Aucun test désactivé ni sauté, aucun seuil baissé.
- Aucun fichier sous `apps/web/src/engine/` ni `apps/web/src/ui/` (lot 4 en parallèle).
- `export PATH=$HOME/.cargo/bin:$PATH` avant `scripts/verifier.sh` ; suite au premier plan (`timeout: 600000`).
- Builds Tauri : au plus 2 en même temps sur la VM, tous canaux ; avant chacun `pgrep -af "cargo.*tauri|tauri build"`, si deux tournent, attendre ; `CARGO_BUILD_JOBS=2`.
- Aucun secret ; dépôt public. Rapport en français.

**Interdits.** Aucun changement de code hors de la correction de permission décrite. Pas de build Android. Ne pas
tuer le client Broadway (fermer par ✕).

**Terminé quand.** `verifier.sh : OK`, essai navigateur OK, clippy de la coque vert, `.deb` produit avec
`beforeBuildCommand`, les 7 gestes conformes (ou écarts consignés), capture commitée
(`git add docs/essais/coque-linux-lot5a.png`, message `docs(essais): Linux shell file test capture (lot 5a T78)` +
ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`), relevé porté au fichier d'état. Les fiches
`docs/essais/coque-windows.md` (file du PC, `ordre-pc.cjs confier`, non bloquant) et `docs/essais/coque-macos.md`
(Jérôme) sont confiées ; le lot ne les attend pas.

## Hors lot 5a, notés

- Échelon 5 (`additionalBrowserArgs` de WebView2) : en attente de la mesure « bon dans Edge, mauvais dans WebView2 »
  (file du PC) ; tâche ajoutée à ce moment-là (Choix tranchés).
- Association de l'extension `.roomboard` et ouverture du fichier passé au lancement ; Cmd+Q sous macOS quitte sans
  demander (la fiche macOS le fait constater).
- Indicateur « modifié » et boutons Nouveau / Ouvrir / Enregistrer dans l'interface ; messages hors `alert` ;
  Playwright `--e2e` dans `verifier.sh` et mise en commun de `serve` / `loadPlaywright` ; WebKit (H2-10) : lot 5b.
- Constats d'architecture « à reprendre au lot 5 » (duplication `fmt` / export JSON / suivi du DPR, types
  `InkLike`, `badColors` et `lost` à afficher) : ils vivent dans `engine/` et `app/`, intouchables ici → lot 5b.
- S5 complet (formes, texte) : après les lots 4 et 5b.
