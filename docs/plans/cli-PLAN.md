# CLI de RoomBoard — lot 1 — plan d'exécution

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Socle : paquet `apps/cli`, chargement Wasm, table des formats, `version` et `formats` | — | `apps/cli/package.json`, `apps/cli/tsconfig.json`, `apps/cli/vite.config.ts`, `apps/cli/src/bin.ts`, `apps/cli/src/contract.ts`, `apps/cli/src/args.ts`, `apps/cli/src/formats.ts`, `apps/cli/src/wasm-node.ts`, `apps/cli/src/main.ts`, `apps/cli/src/testing.ts`, `apps/cli/src/args.test.ts`, `apps/cli/src/formats.test.ts`, `apps/cli/src/wasm-node.test.ts`, `apps/cli/src/main.test.ts`, `pnpm-lock.yaml` | isolé | implementeur-tdd | `@roomboard/cli` vitest ≥ 14 tests, 4 fichiers, `chaque extension d'IMPORT_EXTENSIONS et d'OFFICE_EXTENSIONS est une clé de FORMAT_LOTS` présent ; `node apps/cli/dist/roomboard.mjs version` rend `"schema":"roomboard-cli/1"` ; `pnpm install --frozen-lockfile` code 0 | S3, S5 | #tache-t1 |
| T2 | État et session : `new`, `state`, `run`, `apply`, onglets, références | T1 | `apps/cli/src/disk.ts`, `apps/cli/src/ops.ts`, `apps/cli/src/state.ts`, `apps/cli/src/session.ts`, `apps/cli/src/main.ts`, `apps/cli/src/disk.test.ts`, `apps/cli/src/ops.test.ts`, `apps/cli/src/session.test.ts`, `apps/cli/src/main.test.ts` | isolé | concepteur-critique | `@roomboard/cli` vitest ≥ 35 tests, 7 fichiers, `S1 — new, run --save puis state` et `S2 — AddPage, RemovePage, tab.new` présents, 0 échec | S1, S2 | #tache-t2 |
| T3 | Import et export : `measureOrFallback`, cible sans écran, `import`, `export`, `state` d'un `.rbitem` | T2 | `apps/web/src/engine/text-layout.ts`, `apps/web/src/engine/text-layout.test.ts`, `apps/web/src/main.ts`, `apps/web/src/annotate-start.ts`, `docs/architecture-constats.md`, `apps/cli/src/target.ts`, `apps/cli/src/importer.ts`, `apps/cli/src/exporter.ts`, `apps/cli/src/ops.ts`, `apps/cli/src/session.ts`, `apps/cli/src/main.ts`, `apps/cli/src/target.test.ts`, `apps/cli/src/import.test.ts`, `apps/cli/src/export.test.ts` | isolé | concepteur-critique | `@roomboard/cli` vitest ≥ 46 tests, 10 fichiers, `S3 — import image.png valeurs.xlsx` et `S4 — export --all puis state du .rbitem` présents ; `@roomboard/web` vitest ≥ 3083 tests, 0 échec ; build web code 0 | S3, S4 | #tache-t3 |
| T4 | Essai de bout en bout dans `verifier.sh` et section `## CLI` du profil | T3 | `scripts/essais/cli-essai.mjs`, `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `.claude/chantier.md` | isolé | implementeur-tdd | `node scripts/essais/cli-essai.mjs` affiche `CLI : OK` (≥ 14 lignes `ok —`) ; `scripts/verifier.sh` finit par `verifier.sh : OK` avec `CLI : OK`, `module Wasm : 1374398 octets`, `module formats : 2794511 octets` | S5 | #tache-t4 |

**Goal :** donner à RoomBoard une CLI Node (`apps/cli`) qui crée, ouvre, édite, enregistre, importe (`.roomboard`, PNG,
JPEG, `.xlsx`) et exporte (`.rbitem`) un tableau sans écran, avec un état JSON stable, prouvée par un essai joué dans
`scripts/verifier.sh` (lot 1 du cadrage).

**Architecture :** paquet `@roomboard/cli` qui charge les deux modules Wasm existants par `initSync` et importe les
modules TS de `apps/web/src` (cœur, conteneur, importeur, onglets) sans en recopier la logique ; une session JSONL tient
les onglets et l'historique du cœur le temps d'un processus ; build en un seul fichier `dist/roomboard.mjs` par
`vite build --ssr`, avec copie des deux `.wasm` à côté.

**Tech Stack :** TypeScript 5.9, Node 22, vite 6 (build SSR), vitest 3, modules wasm-bindgen `--target web` chargés par
`initSync`.

**Spec :** `docs/plans/cli-cadrage.md`

## Global Constraints

- GC1 — Les deux modules Wasm (`roomboard-wasm`, `roomboard-formats-wasm`) ne changent pas d'un octet ; aucun code Rust
  modifié.
- GC2 — Aucun seuil baissé ou relevé, aucun test désactivé ou sauté (hors le saut existant sans `.wasm`, levé par
  `ROOMBOARD_WASM_REQUIRED=1`).
- GC3 — Aucune dépendance nouvelle hors verrou sauf justifiée ; aucune licence (A)GPL/LGPL ;
  `pnpm install --frozen-lockfile` doit passer (verrou commité si modifié).
- GC4 — Builds et tests en `nice -n 10`, cargo `-j 4` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC5 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais finissant par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; jamais `git add -A` / `git add .` / `git commit -a` ;
  fichiers ajoutés un par un ; ni push, ni tag, ni release, ni merge (l'orchestrateur fusionne).
- GC6 — Fichiers temporaires dans le worktree ou `~/.cache/tmp/of1-*`.
- GC7 — Préparation d'un worktree de tâche : `pnpm install --frozen-lockfile` ; tests au vrai Wasm : colle construite
  comme `scripts/verifier.sh` (bloc « Préparation » de chaque section).
- GC8 — Rien dans `roomboard-prive`, ni dans la coque Tauri ; aucune installation de paquet système, aucun `tauri build`
  (cadrage, § 7).
- GC9 — La colle wasm-bindgen n'est chargée que par `import()` dynamique dans `apps/cli/src/wasm-node.ts` ; aucun import
  statique de `apps/web/src/wasm/` ni de `apps/web/src/wasm-formats/` (D2).
- GC10 — Format `.roomboard` inchangé : rien n'est ajouté au fichier, l'historique reste en mémoire (D5, DA3).
- GC11 — Contrat de sortie : stdout = une ligne JSON par résultat ; stderr = une ligne
  `{"error":{"code":"usage|io|format|command|unsupported","message":"…"}}` ; codes 0 succès, 1 refus, 2 usage, 3 format
  d'un lot non livré (D9, DA2).

## Review Focus

1. Nom de commande ou d'opération qui est une clé héritée d'`Object` (`toString`, `constructor`, `__proto__`) → code 2,
   erreur JSON, jamais une exception (D9, DA2). Tests : T1 (`main.test.ts`, `args.test.ts`), T2 (`ops.test.ts`).
2. Commande du cœur mal formée (champ absent, `points` non numériques) → erreur JSON code 1 ou 2, jamais une pile Node
   non capturée (D9, H3). Tests : T2 (`ops.test.ts`, `session.test.ts`).
3. Session `run -` dont les lignes sont vides ou finissent par CRLF (agent sous Windows) → lignes vides ignorées, CRLF
   accepté (DA3). Test : T2 (`main.test.ts`).
4. Source d'extension inconnue (`notes.txt`) → `refused`, code 1, fichier cible inchangé (H10, D10). Test : T3
   (`import.test.ts`).
5. Écriture impossible (dossier absent) → code 1, aucun fichier temporaire laissé, rien d'écrit (D3, H8). Test : T2
   (`disk.test.ts`).

## Carte des fichiers

| fichier | rôle | tâche |
|---|---|---|
| `apps/cli/package.json`, `tsconfig.json`, `vite.config.ts` | paquet, typage (DOM + Node), build SSR en un fichier et copie des `.wasm` | T1 |
| `apps/cli/src/bin.ts` | entrée du binaire : branche `process` sur `main` | T1 |
| `apps/cli/src/contract.ts` | `CliError`, codes et sorties, `CliIO`, version, schéma | T1 |
| `apps/cli/src/args.ts` | lecture des options d'une commande | T1 |
| `apps/cli/src/formats.ts` | `FORMAT_LOTS`, `LOT_LIVRE`, lots par sens, lignes de `formats` | T1 |
| `apps/cli/src/wasm-node.ts` | `loadCore`, `loadFormats` (seul `import()` de la colle) | T1 |
| `apps/cli/src/main.ts` | `main(argv, io)` : table des commandes | T1, T2, T3 |
| `apps/cli/src/testing.ts` | aides des tests (vrai Wasm, `memoryIO`, dossier temporaire, PNG, ids par rang) | T1 |
| `apps/cli/src/disk.ts` | lecture, écriture atomique, date du manifeste | T2 |
| `apps/cli/src/ops.ts` | lecture d'une ligne d'opération, références, `Float32Array` | T2, T3 |
| `apps/cli/src/state.ts` | `stateOf` : état `roomboard-cli/1` | T2 |
| `apps/cli/src/session.ts` | onglets, exécution des opérations, ouverture, enregistrement | T2, T3 |
| `apps/web/src/engine/text-layout.ts` | `measureOrFallback` (étendu) | T3 |
| `apps/cli/src/target.ts` | `headlessTarget`, `SCENE` | T3 |
| `apps/cli/src/importer.ts` | `importInto` par `createImporter`, `--at`, code 3 avant lecture | T3 |
| `apps/cli/src/exporter.ts` | `exportFragment` par `extract` + `io.encode` | T3 |
| `scripts/essais/cli-essai.mjs` | essai S5 | T4 |
| `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh` | build de la CLI et essai, contrôle de leur présence | T4 |
| `.claude/chantier.md` | section `## CLI` (rubrique 7) | T4 |

---

### Tâche T1 — Socle : paquet `apps/cli`, chargement Wasm, table des formats, `version` et `formats`

<a id="tache-t1"></a>

**Objectif.** Créer le paquet `@roomboard/cli` : build en un fichier `apps/cli/dist/roomboard.mjs` avec les deux `.wasm`
copiés à côté, chargement Node des deux modules, table `FORMAT_LOTS` vérifiée contre les extensions de l'application,
commandes `version` et `formats`, codes de sortie et erreurs JSON (cadrage D1, D2, D3, D4, D9, DA2, DA6 « T1 »).
Scénarios servis : S3 (le code 3 repose sur la table des lots), S5 (socle de l'essai).

**Fichiers.**
- Créer : `apps/cli/package.json`, `apps/cli/tsconfig.json`, `apps/cli/vite.config.ts`, `apps/cli/src/bin.ts`,
  `apps/cli/src/contract.ts`, `apps/cli/src/args.ts`, `apps/cli/src/formats.ts`, `apps/cli/src/wasm-node.ts`,
  `apps/cli/src/main.ts`, `apps/cli/src/testing.ts`.
- Tests : `apps/cli/src/args.test.ts`, `apps/cli/src/formats.test.ts`, `apps/cli/src/wasm-node.test.ts`,
  `apps/cli/src/main.test.ts`.
- Modifier : `pnpm-lock.yaml` (nouvel importeur `apps/cli`, par `pnpm install`).

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit (noms figés, repris par T2, T3, T4) :
  - `contract.ts` : `CLI_VERSION = "0.1.0"`, `SCHEMA = "roomboard-cli/1"`, `type ErrorCode = "usage" | "io" | "format" | "command" | "unsupported"`,
    `EXIT: Record<ErrorCode, 1 | 2 | 3>`, `class CliError extends Error { code: ErrorCode; detail: Record<string, unknown>; get exit(): 1 | 2 | 3; toJSON() }`,
    `asCliError(e: unknown, code?: ErrorCode): CliError`, `usage(text: string): CliError`,
    `interface CliIO { out(line: string): void; err(line: string): void; lines(): AsyncIterable<string>; env: Record<string, string | undefined>; wasmDir: URL }`.
  - `args.ts` : `parseArgs(args: readonly string[], spec: FlagSpec): ParsedArgs`, `flagStr(p: ParsedArgs, name: string): string | undefined`,
    `type FlagSpec = Readonly<Record<string, "value" | "bool">>`, `interface ParsedArgs { positional: readonly string[]; flags: ReadonlyMap<string, string | true> }`.
  - `formats.ts` : `type Lot = 1 | 2 | 3 | 4`, `LOT_LIVRE: Lot = 1`, `FORMAT_LOTS: Readonly<Record<string, FormatEntry>>`,
    `interface FormatEntry { read: Lot | null; write: Lot | null; handler: string; notes: readonly string[] }`,
    `extOf(name: string): string`, `formatOf(name: string): FormatEntry | null`, `lotOf(name: string): Lot | null`,
    `importBlocked(name: string): Lot | null`, `exportBlocked(name: string): Lot | null`,
    `unsupportedMessage(name: string, lot: Lot): string`, `formatRows(): FormatRow[]`.
  - `wasm-node.ts` : `loadCore(dir: URL): Promise<CoreFactory>`, `loadFormats(dir: URL): () => Promise<SheetFormatsBinding>`,
    `wasmPresent(dir: URL): boolean`. `dir` contient `wasm/` et `wasm-formats/` (`apps/cli/dist/` en production,
    `apps/web/src/` dans les tests). Précision du cadrage : `loadCore` est asynchrone (l'`import()` dynamique exigé par D2
    l'est).
  - `main.ts` : `main(argv: readonly string[], io: CliIO): Promise<number>` ; table `COMMANDS` (clés propres seulement).
  - `testing.ts` : `WEB_SRC: URL`, `PRESENT: boolean`, `REQUIRED: boolean`, `describeWasm`, `memoryIO(input?, env?, wasmDir?): MemoryIO`,
    `tmpDir(): string`, `codeOf(f: () => unknown): string`, `pngBytes(w: number, h: number): Uint8Array`,
    `normalizeIds(v: unknown): unknown`, `XLSX_FIXTURE: string`, `type Json = any`.
  - Précision du cadrage (D3) : entrée du build `src/bin.ts` (et non `src/main.ts`) pour que les tests importent `main`
    sans lancer le processus ; `bin.ts` ne fait que brancher `process` sur `main`.
- Réutilise : `apps/web/src/core/wasm-core.ts:716` — `createWasmCore(mod: WasmModule): CoreFactory`, appelé par `loadCore`.
- Réutilise : patron `apps/web/src/core/wasm-core.contract.test.ts:14-20` — `initSync({ module: bytes })` de la colle
  wasm-bindgen ; nouveau module `apps/cli/src/wasm-node.ts` (`loadCore(dir)`, `loadFormats(dir)`), aucun chargeur Node
  existant.
- Réutilise : `apps/web/src/platform/files.ts:85` (`IMPORT_EXTENSIONS`), `apps/web/src/platform/office-import.ts:14`
  (`OFFICE_EXTENSIONS`), ids des lecteurs de `apps/web/src/platform/import.ts:142-369` — clés et `handler` de
  `FORMAT_LOTS` ; nouveau module `apps/cli/src/formats.ts`.
- Réutilise : nouveau module `apps/cli/src/main.ts` — `main(argv: readonly string[], io: CliIO): Promise<number>`.
- Réutilise : `apps/web/src/platform/controller.ts:10` — `APP_VERSION` dans la sortie de `version`.
- Réutilise : `apps/web/src/platform/container.ts:62-69` — `SheetFormatsBinding`, `hasSheetReader(m)` pour le module formats.

**Test et commande bornée.**
- Tests : `args.test.ts` (3), `formats.test.ts` (6), `wasm-node.test.ts` (4), `main.test.ts` (4).
- Commande : voir étape 10 ; motif de preuve : `Test Files  4 passed (4)`, `Tests  N passed` avec N ≥ 14, aucun
  `FAIL `, aucun `×`, et la ligne `✓ src/formats.test.ts > FORMAT_LOTS (D9) > chaque extension d'IMPORT_EXTENSIONS et d'OFFICE_EXTENSIONS est une clé de FORMAT_LOTS`.

**Preuve visuelle.** Aucune (pas d'interface).

**Contraintes (recopiées de Global Constraints).**
- GC1 — Les deux modules Wasm ne changent pas d'un octet ; aucun code Rust modifié.
- GC2 — Aucun seuil baissé ou relevé, aucun test désactivé ou sauté (hors le saut existant sans `.wasm`, levé par
  `ROOMBOARD_WASM_REQUIRED=1`).
- GC3 — Aucune dépendance nouvelle hors verrou sauf justifiée ; aucune licence (A)GPL/LGPL ;
  `pnpm install --frozen-lockfile` doit passer (verrou commité si modifié). Ici : `@types/node` `26.6.6` (MIT, déjà au
  verrou), `typescript` `^5.6.0`, `vite` `^6.0.0`, `vitest` `^3.0.0` (déjà au verrou par `apps/web`).
- GC4 — Builds et tests en `nice -n 10`, cargo `-j 4` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC5 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais finissant par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; jamais `git add -A` / `.` / `commit -a` ; ni push, ni tag,
  ni release, ni merge.
- GC6 — Fichiers temporaires dans le worktree ou `~/.cache/tmp/of1-*`.
- GC7 — Préparation : `pnpm install --frozen-lockfile` ; colle Wasm construite comme `scripts/verifier.sh`.
- GC8 — Rien dans `roomboard-prive` ni dans la coque Tauri ; aucune installation système, aucun `tauri build`.
- GC9 — La colle wasm-bindgen n'est chargée que par `import()` dynamique dans `apps/cli/src/wasm-node.ts`.
- GC11 — stdout : une ligne JSON par résultat ; stderr : `{"error":{"code":…,"message":…}}` ; codes 0, 1, 2, 3.

**Interdits.**
- Ne rien modifier sous `apps/web/` ni `crates/` dans cette tâche.
- Ne pas recopier `IMPORT_EXTENSIONS` ni `OFFICE_EXTENSIONS` : la table les couvre, le test le vérifie.
- Ne jamais ajouter le lien `target` (bloc Préparation) ni `apps/cli/dist/` au commit.

**Terminé quand.** Les 4 fichiers de test passent sous `ROOMBOARD_WASM_REQUIRED=1` ; `pnpm --filter @roomboard/cli build`
rend 0 et `node apps/cli/dist/roomboard.mjs version` imprime une ligne JSON avec `"schema":"roomboard-cli/1"` ;
`node apps/cli/dist/roomboard.mjs bidule` rend le code 2 ; `pnpm install --frozen-lockfile` rend 0 ;
`node scripts/controle-licences.mjs` rend 0 ; le rapport contient `Réutilisation : appelé createWasmCore`,
`Réutilisation : appelé IMPORT_EXTENSIONS, OFFICE_EXTENSIONS`, `Réutilisation : appelé APP_VERSION`.

**Étapes.**

- [ ] **Étape 1 : préparation du worktree** (dossier créé par l'orchestrateur ; s'il en donne un autre, remplacer `WT`).

```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
WT=/home/adminjd/projets/roomboard-wt/cli--T1
cd $WT
# Cache cargo partagé avec le worktree du chantier (dépendances déjà construites) ; lien non suivi : ne jamais l'ajouter.
[ -e target ] || ln -s /home/adminjd/projets/roomboard-wt/cli/target target
pnpm install --frozen-lockfile
nice -n 10 cargo build -j 4 -p roomboard-wasm --target wasm32-unknown-unknown --release
rm -rf apps/web/src/wasm
wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm
nice -n 10 cargo build -j 4 -p roomboard-formats-wasm --target wasm32-unknown-unknown --release
rm -rf apps/web/src/wasm-formats
wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm
pnpm exec wasm-opt -Oz apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm -o apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm
ls -l apps/web/src/wasm/roomboard_wasm_bg.wasm apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm
```

Attendu : les deux `.wasm` listés, `pnpm install --frozen-lockfile` sans erreur.

- [ ] **Étape 2 : paquet, typage, build.** Créer `apps/cli/package.json` :

```json
{
  "name": "@roomboard/cli",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "bin": { "roomboard": "dist/roomboard.mjs" },
  "engines": { "node": ">=22" },
  "scripts": {
    "build": "tsc --noEmit && vite build --ssr src/bin.ts",
    "test": "vitest run"
  },
  "devDependencies": {
    "@types/node": "26.6.6",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  }
}
```

Créer `apps/cli/tsconfig.json` (mêmes règles que `apps/web`, plus les types Node ; le DOM reste pour les modules web
importés) :

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

Créer `apps/cli/vite.config.ts` :

```ts
// Build de la CLI (cadrage cli, D3) : un seul fichier ES `dist/roomboard.mjs` pour Node 22, tout inclus
// (`ssr.noExternal`) ; `inlineDynamicImports` : `container-io.ts` atteint `host-tauri.ts`, dont les `import()` des
// paquets Tauri feraient des morceaux séparés (inclus, jamais exécutés). Les deux modules Wasm (D2) sont copiés depuis
// `apps/web/src/` (construits par `scripts/verifier.sh`) dans `dist/wasm/` et `dist/wasm-formats/`.
import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const WEB_SRC = fileURLToPath(new URL("../web/src/", import.meta.url));
const WASM_DIRS = ["wasm", "wasm-formats"] as const;

function copyWasm(): Plugin {
  return {
    name: "roomboard-cli-wasm",
    apply: "build",
    writeBundle(options) {
      const out = options.dir ?? fileURLToPath(new URL("./dist/", import.meta.url));
      for (const dir of WASM_DIRS) {
        const from = join(WEB_SRC, dir);
        if (!existsSync(from)) throw new Error(`module Wasm absent : ${from} (le construire comme scripts/verifier.sh)`);
        cpSync(from, join(out, dir), { recursive: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [copyWasm()],
  ssr: { noExternal: true, target: "node" },
  build: {
    outDir: "dist",
    target: "node22",
    rollupOptions: {
      output: { entryFileNames: "roomboard.mjs", inlineDynamicImports: true, banner: "#!/usr/bin/env node" },
    },
  },
  test: { environment: "node" },
});
```

Puis mettre le verrou à jour et vérifier qu'il est figé :

```bash
cd $WT && pnpm install && pnpm install --frozen-lockfile && git diff --stat pnpm-lock.yaml
```

Attendu : seul `pnpm-lock.yaml` change, avec un bloc `apps/cli:` sous `importers:` (aucune version nouvelle d'un paquet
déjà présent). Si une version nouvelle apparaît, s'arrêter et le dire au rapport.

- [ ] **Étape 3 : contrat et aides de test.** Créer `apps/cli/src/contract.ts` :

```ts
/**
 * Contrat de la CLI (cadrage cli, DA2, D9) : codes d'erreur et de sortie, version, schéma de l'état, entrées et sorties
 * du processus. Toute commande ou option ajoutée plus tard est additive ; un champ renommé passe le schéma à
 * `roomboard-cli/2` (DA2).
 */
export const CLI_VERSION = "0.1.0";
export const SCHEMA = "roomboard-cli/1";

export type ErrorCode = "usage" | "io" | "format" | "command" | "unsupported";
/** 1 refus (cœur, fichier illisible, import partiel), 2 usage, 3 format d'un lot non livré (D9). */
export const EXIT: Readonly<Record<ErrorCode, 1 | 2 | 3>> = Object.freeze({ usage: 2, io: 1, format: 1, command: 1, unsupported: 3 });

export class CliError extends Error {
  readonly code: ErrorCode;
  /** Champs ajoutés à la ligne d'échec d'une opération de session (rapport d'un import partiel). */
  readonly detail: Readonly<Record<string, unknown>>;
  constructor(code: ErrorCode, message: string, detail: Readonly<Record<string, unknown>> = {}) {
    super(message);
    this.name = "CliError";
    this.code = code;
    this.detail = detail;
  }
  get exit(): 1 | 2 | 3 {
    return EXIT[this.code];
  }
  /** Forme écrite sur stderr et dans la ligne d'échec d'une opération. */
  toJSON(): { readonly code: ErrorCode; readonly message: string } {
    return { code: this.code, message: this.message };
  }
}

/** Toute erreur en `CliError` ; une erreur du cœur ou d'un module web garde son message. */
export function asCliError(e: unknown, code: ErrorCode = "command"): CliError {
  if (e instanceof CliError) return e;
  return new CliError(code, e instanceof Error ? e.message : String(e));
}

export const usage = (text: string): CliError => new CliError("usage", `usage : roomboard ${text}`);

/** Entrées et sorties du processus, remplacées dans les tests. */
export interface CliIO {
  /** Une ligne sur stdout. */
  out(line: string): void;
  /** Une ligne sur stderr. */
  err(line: string): void;
  /** Lignes de stdin (`run -`). */
  lines(): AsyncIterable<string>;
  readonly env: Readonly<Record<string, string | undefined>>;
  /** Dossier qui contient `wasm/` et `wasm-formats/` : `apps/cli/dist/`, ou `apps/web/src/` dans les tests. */
  readonly wasmDir: URL;
}
```

Créer `apps/cli/src/testing.ts` (aides des tests seulement, jamais importé par `bin.ts`) :

```ts
// Aides des tests de la CLI : vrai Wasm (sauté s'il manque, exigé sous ROOMBOARD_WASM_REQUIRED=1, D2), entrées et
// sorties en mémoire, dossier temporaire sous target/ (ignoré par git), PNG fabriqué, ids du cœur normalisés par rang.
import { mkdirSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateSync } from "node:zlib";
import { describe } from "vitest";
import { CliError, type CliIO } from "./contract";
import { wasmPresent } from "./wasm-node";

// Sorties JSON lues par les tests : forme libre, vérifiée par les assertions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any;

export const WEB_SRC = new URL("../../web/src/", import.meta.url);
export const PRESENT = wasmPresent(WEB_SRC);
export const REQUIRED = process.env["ROOMBOARD_WASM_REQUIRED"] === "1";
/** Blocs au vrai module : sautés sans `.wasm`, jamais sous `ROOMBOARD_WASM_REQUIRED=1` (le test de présence échoue). */
export const describeWasm = PRESENT ? describe : describe.skip;
export const XLSX_FIXTURE = fileURLToPath(new URL("../../../crates/roomboard-formats/tests/fixtures/valeurs.xlsx", import.meta.url));
export const FIXED_NOW = "2026-11-23T00:00:00.000Z";

export interface MemoryIO extends CliIO {
  readonly stdout: string[];
  readonly stderr: string[];
  json(): Json[];
  errors(): Json[];
}

export function memoryIO(input: readonly string[] = [], env: Readonly<Record<string, string>> = {}, wasmDir: URL = WEB_SRC): MemoryIO {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    out: (line) => {
      stdout.push(line);
    },
    err: (line) => {
      stderr.push(line);
    },
    lines: () =>
      (async function* () {
        yield* input;
      })(),
    env: { ROOMBOARD_NOW: FIXED_NOW, ...env },
    wasmDir,
    stdout,
    stderr,
    json: () => stdout.map((l) => JSON.parse(l) as Json),
    errors: () => stderr.map((l) => JSON.parse(l) as Json),
  };
}

const TMP_ROOT = fileURLToPath(new URL("../../../target/cli-tests/", import.meta.url));
/** Dossier neuf sous `<racine>/target/cli-tests/` (ignoré par git). */
export function tmpDir(): string {
  mkdirSync(TMP_ROOT, { recursive: true });
  return mkdtempSync(join(TMP_ROOT, "t-"));
}

/** Code de la `CliError` levée par `f`, « autre » pour une autre erreur, « aucune » sans erreur. */
export function codeOf(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    return e instanceof CliError ? e.code : "autre";
  }
  return "aucune";
}

/** PNG RVB 8 bits valide `w × h`, gris uni. */
export function pngBytes(w: number, h: number): Uint8Array {
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const row = 1 + 3 * w;
  const raw = Buffer.alloc(h * row, 0x80);
  for (let y = 0; y < h; y++) raw[y * row] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** Ids du cœur (UUID) remplacés par leur rang d'apparition (`#1`, `#2`…) ; les empreintes d'assets restent. */
export function normalizeIds(v: unknown, seen: Map<string, string> = new Map()): unknown {
  if (typeof v === "string" && UUID.test(v)) {
    if (!seen.has(v)) seen.set(v, `#${seen.size + 1}`);
    return seen.get(v);
  }
  if (Array.isArray(v)) return v.map((x) => normalizeIds(x, seen));
  if (typeof v === "object" && v !== null) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, normalizeIds(x, seen)]));
  return v;
}
```

Note : si `eslint` n'existe pas dans le dépôt (cas actuel), la ligne `eslint-disable` reste un commentaire sans effet.

- [ ] **Étape 4 : tests rouges des options et des formats.** Créer `apps/cli/src/args.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { flagStr, parseArgs } from "./args";
import { codeOf } from "./testing";

describe("parseArgs (DA2)", () => {
  it("positionnels, option à valeur, option booléenne, « - » positionnel", () => {
    const p = parseArgs(["a.roomboard", "--page", "p1", "--points", "-"], { "--page": "value", "--points": "bool" });
    expect(p.positional).toEqual(["a.roomboard", "-"]);
    expect(flagStr(p, "--page")).toBe("p1");
    expect(p.flags.get("--points")).toBe(true);
  });
  it("une valeur qui commence par un tiret est prise telle quelle", () => {
    expect(flagStr(parseArgs(["--at", "-5,3"], { "--at": "value" }), "--at")).toBe("-5,3");
  });
  it("option inconnue, clé d'Object, valeur absente, option répétée : usage", () => {
    for (const args of [["--bidule"], ["--constructor"], ["--__proto__"], ["--toString"], ["--page"], ["--page", "a", "--page", "b"]]) {
      expect(codeOf(() => parseArgs(args, { "--page": "value" }))).toBe("usage");
    }
  });
});
```

Créer `apps/cli/src/formats.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { IMPORT_EXTENSIONS } from "../../web/src/platform/files";
import { OFFICE_EXTENSIONS } from "../../web/src/platform/office-import";
import { exportBlocked, extOf, FORMAT_LOTS, formatRows, importBlocked, lotOf, LOT_LIVRE, unsupportedMessage } from "./formats";

/** Ids des lecteurs du registre d'import (`import.ts`, `image-import.ts`, `media-import.ts`, `model3d-handlers.ts`, `office-import.ts`). */
const HANDLER_IDS = new Set(["roomboard", "rbitem", "rbpack", "pdf", "iwb", "ubz", "notebook", "olf", "flipchart", "image", "media", "model3d", "model3d-companion", "zip3d", "sheet", "office"]);

describe("FORMAT_LOTS (D9)", () => {
  it("chaque extension d'IMPORT_EXTENSIONS et d'OFFICE_EXTENSIONS est une clé de FORMAT_LOTS", () => {
    const wanted = new Set([...IMPORT_EXTENSIONS.map((e) => `.${e}`), ...OFFICE_EXTENSIONS]);
    expect(new Set(Object.keys(FORMAT_LOTS))).toEqual(wanted);
  });
  it("chaque lecteur nommé est un id du registre d'import", () => {
    for (const [ext, e] of Object.entries(FORMAT_LOTS)) expect(HANDLER_IDS.has(e.handler), ext).toBe(true);
  });
  it("lot 1 : lus .roomboard, PNG, JPEG, .xlsx, .xlsm ; écrits .roomboard et .rbitem", () => {
    expect(LOT_LIVRE).toBe(1);
    const rows = formatRows();
    expect(rows.filter((r) => r.read).map((r) => r.ext).sort()).toEqual([".jpeg", ".jpg", ".png", ".roomboard", ".xlsm", ".xlsx"]);
    expect(rows.filter((r) => r.write).map((r) => r.ext).sort()).toEqual([".rbitem", ".roomboard"]);
    expect(rows).toContainEqual({ ext: ".roomboard", read: true, write: true, lot: 1, notes: [] });
    expect(rows).toContainEqual(expect.objectContaining({ ext: ".rbitem", read: false, write: true, lot: 2 }));
  });
  it("importBlocked : lot d'un format reconnu non livré, null pour un format lisible ou inconnu", () => {
    expect(importBlocked("doc.pdf")).toBe(3);
    expect(importBlocked("x.rbitem")).toBe(2);
    expect(importBlocked("r.DOCX")).toBe(4);
    expect(importBlocked("image.png")).toBeNull();
    expect(importBlocked("valeurs.xlsx")).toBeNull();
    expect(importBlocked("notes.txt")).toBeNull();
    expect(unsupportedMessage("/tmp/doc.pdf", 3)).toBe("doc.pdf : format pris en charge par la CLI au lot 3");
  });
  it("exportBlocked : .iwb → 2, .pdf → 3 ; .rbitem et .png → null ; lotOf", () => {
    expect(exportBlocked("a.iwb")).toBe(2);
    expect(exportBlocked("a.pdf")).toBe(3);
    expect(exportBlocked("a.rbitem")).toBeNull();
    expect(exportBlocked("a.png")).toBeNull();
    expect(lotOf("a.notebook")).toBe(2);
    expect(lotOf("a.txt")).toBeNull();
  });
  it("extOf : minuscules, chemins, nom sans extension, clé d'Object", () => {
    expect(extOf("/a/b/Photo.JPG")).toBe(".jpg");
    expect(extOf("C:\\x\\t.Roomboard")).toBe(".roomboard");
    expect(extOf("README")).toBe("");
    expect(extOf(".bashrc")).toBe("");
    expect(importBlocked("a.constructor")).toBeNull();
    expect(lotOf("a.__proto__")).toBeNull();
  });
});
```

Lancer et constater l'échec (modules absents) :

```bash
cd $WT && nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/args.test.ts src/formats.test.ts 2>&1 | tail -8
```

Attendu : `FAIL`, `Failed to resolve import "./args"` (ou `./formats`).

- [ ] **Étape 5 : `args.ts` et `formats.ts`.** Créer `apps/cli/src/args.ts` :

```ts
/** Options d'une commande (DA2) : `--nom valeur` ou `--nom` ; tout autre mot est positionnel (« - » compris). */
import { CliError } from "./contract";

export type FlagSpec = Readonly<Record<string, "value" | "bool">>;
export interface ParsedArgs {
  readonly positional: readonly string[];
  readonly flags: ReadonlyMap<string, string | true>;
}

export function parseArgs(args: readonly string[], spec: FlagSpec): ParsedArgs {
  const positional: string[] = [];
  const flags = new Map<string, string | true>();
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (!a.startsWith("--")) {
      positional.push(a);
      continue;
    }
    const kind = Object.hasOwn(spec, a) ? spec[a] : undefined;
    if (kind === undefined) throw new CliError("usage", `option inconnue : ${a}`);
    if (flags.has(a)) throw new CliError("usage", `option répétée : ${a}`);
    if (kind === "bool") {
      flags.set(a, true);
      continue;
    }
    const v = args[i + 1];
    if (v === undefined) throw new CliError("usage", `${a} : valeur attendue`);
    flags.set(a, v);
    i++;
  }
  return { positional, flags };
}

export function flagStr(p: ParsedArgs, name: string): string | undefined {
  const v = p.flags.get(name);
  return typeof v === "string" ? v : undefined;
}
```

Créer `apps/cli/src/formats.ts` :

```ts
/**
 * Formats de la CLI et lot qui les livre (cadrage cli, D9, D13, carte 3.5). Clés = extensions d'`IMPORT_EXTENSIONS`
 * (`files.ts`) et d'`OFFICE_EXTENSIONS` (`office-import.ts`), point compris, en minuscules : un test l'exige. `read` et
 * `write` : lot où l'import et l'export arrivent (null : jamais) ; `handler` : id du lecteur de `import.ts`.
 * Précision de forme par rapport au cadrage (`{ lot, read, write, handler }`) : un lot par sens, parce que `.rbitem`
 * s'écrit au lot 1 et ne s'insère qu'au lot 2 ; `formats` rend toujours `{ ext, read, write, lot, notes }` (DA2).
 * Un chantier qui livre un format change ses lots ici et passe `read` / `write` à vrai dans `formats` (§ 7).
 */
export type Lot = 1 | 2 | 3 | 4;
export const LOT_LIVRE: Lot = 1;

export interface FormatEntry {
  readonly read: Lot | null;
  readonly write: Lot | null;
  readonly handler: string;
  readonly notes: readonly string[];
}

export interface FormatRow {
  readonly ext: string;
  readonly read: boolean;
  readonly write: boolean;
  /** Lot qui termine le format (le plus tardif de ses deux sens). */
  readonly lot: Lot;
  readonly notes: readonly string[];
}

const entry = (read: Lot | null, write: Lot | null, handler: string, ...notes: string[]): FormatEntry =>
  Object.freeze({ read, write, handler, notes: Object.freeze(notes) });
const each = (exts: readonly string[], e: FormatEntry): Array<readonly [string, FormatEntry]> => exts.map((x) => [x, e] as const);

const ROWS: ReadonlyArray<readonly [string, FormatEntry]> = [
  [".roomboard", entry(1, 1, "roomboard")],
  [".rbitem", entry(2, 1, "rbitem", "lot 1 : export d'objets et lecture par `state` ; insertion au lot 2")],
  [".rbpack", entry(2, 2, "rbpack")],
  [".pdf", entry(3, 3, "pdf")],
  [".iwb", entry(2, 2, "iwb")],
  [".ubz", entry(2, 2, "ubz")],
  [".notebook", entry(2, null, "notebook")],
  [".olf", entry(2, null, "olf")],
  [".flipchart", entry(2, null, "flipchart")],
  [".png", entry(1, null, "image", "taille lue dans l'en-tête")],
  ...each([".jpg", ".jpeg"], entry(1, null, "image", "taille lue dans l'en-tête, orientation EXIF non appliquée (H2)")),
  ...each([".gif", ".webp", ".bmp", ".ico", ".svg", ".avif", ".heic", ".heif"], entry(4, null, "image")),
  ...each([".mp4", ".m4v", ".mov", ".webm", ".ogv", ".m4a", ".mp3", ".wav", ".ogg", ".oga"], entry(4, null, "media")),
  ...each([".glb", ".gltf", ".obj", ".stl", ".ply"], entry(4, null, "model3d")),
  ...each([".mtl", ".bin"], entry(4, null, "model3d-companion")),
  [".zip", entry(4, null, "zip3d")],
  ...each([".xlsx", ".xlsm"], entry(1, null, "sheet", "valeurs de la première feuille ; largeur du texte approchée (H1)")),
  ...each([".docx", ".odt", ".ods", ".pptx", ".odp", ".doc", ".xls", ".ppt"], entry(4, null, "office")),
];

export const FORMAT_LOTS: Readonly<Record<string, FormatEntry>> = Object.freeze(Object.fromEntries(ROWS));

const baseOf = (name: string): string => name.replace(/^.*[\\/]/, "");

/** Extension en minuscules, point compris ; "" sans extension (`.bashrc` compris). */
export function extOf(name: string): string {
  const base = baseOf(name);
  const i = base.lastIndexOf(".");
  return i <= 0 ? "" : base.slice(i).toLowerCase();
}

export function formatOf(name: string): FormatEntry | null {
  const ext = extOf(name);
  return Object.hasOwn(FORMAT_LOTS, ext) ? (FORMAT_LOTS[ext] ?? null) : null;
}

const delivered = (lot: Lot | null): boolean => lot !== null && lot <= LOT_LIVRE;
const lastLot = (e: FormatEntry): Lot => Math.max(e.read ?? 1, e.write ?? 1) as Lot;

export function lotOf(name: string): Lot | null {
  const e = formatOf(name);
  return e === null ? null : lastLot(e);
}

/** Lot d'un format reconnu dont l'import n'est pas livré ; null si lisible ou inconnu (le registre décide). */
export function importBlocked(name: string): Lot | null {
  const e = formatOf(name);
  return e === null || e.read === null || delivered(e.read) ? null : e.read;
}

/** Lot d'un format reconnu dont l'export arrive plus tard ; null si écrit aujourd'hui, jamais écrit ou inconnu. */
export function exportBlocked(name: string): Lot | null {
  const e = formatOf(name);
  return e === null || e.write === null || delivered(e.write) ? null : e.write;
}

export const unsupportedMessage = (name: string, lot: Lot): string => `${baseOf(name)} : format pris en charge par la CLI au lot ${lot}`;

/** Lignes de `formats`, tirées de la table (aucune liste recopiée). */
export function formatRows(): FormatRow[] {
  return Object.entries(FORMAT_LOTS).map(([ext, e]) => ({ ext, read: delivered(e.read), write: delivered(e.write), lot: lastLot(e), notes: [...e.notes] }));
}
```

Relancer la commande de l'étape 4. Attendu : `Test Files  2 passed (2)`, `Tests  9 passed (9)`.

- [ ] **Étape 6 : tests rouges du chargement Wasm.** Créer `apps/cli/src/wasm-node.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { CliError } from "./contract";
import { describeWasm, PRESENT, REQUIRED, WEB_SRC } from "./testing";
import { loadCore, loadFormats } from "./wasm-node";

it("le module wasm est présent quand il est exigé", () => {
  if (REQUIRED) expect(PRESENT).toBe(true);
});

describe("chargement sans module (D2)", () => {
  it("dossier sans .wasm : CliError io qui nomme verifier.sh", async () => {
    const err: unknown = await loadCore(new URL("file:///roomboard-absent/")).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CliError);
    expect(err).toMatchObject({ code: "io" });
    expect((err as CliError).message).toContain("verifier.sh");
  });
});

describeWasm("chargement du vrai module (D2)", () => {
  it("loadCore : document vierge d'une page", async () => {
    const core = await loadCore(WEB_SRC);
    expect(core.blank().pageIds()).toHaveLength(1);
  });
  it("loadFormats : lecteur de classeur et écrivain du conteneur", async () => {
    const mod = await loadFormats(WEB_SRC)();
    expect(typeof mod.SheetReader.open).toBe("function");
    expect(typeof mod.write_container).toBe("function");
  });
});
```

Lancer : `cd $WT && nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/wasm-node.test.ts 2>&1 | tail -6`.
Attendu : `FAIL` (`./wasm-node` introuvable).

- [ ] **Étape 7 : `wasm-node.ts`.** Créer `apps/cli/src/wasm-node.ts` :

```ts
/**
 * Chargement Node des deux modules Wasm (cadrage cli, D2) : la colle wasm-bindgen par `import()` dynamique (seul endroit
 * de la CLI, aucun test ne la résout statiquement), puis `initSync` sur les octets du `.wasm`. `dir` contient `wasm/` et
 * `wasm-formats/` : `apps/cli/dist/` (copiés au build) ou `apps/web/src/` (tests).
 */
import { existsSync, readFileSync } from "node:fs";
import type { CoreFactory } from "../../web/src/core/api";
import { createWasmCore, type WasmModule } from "../../web/src/core/wasm-core";
import { hasSheetReader, type SheetFormatsBinding } from "../../web/src/platform/container";
import { CliError } from "./contract";

interface WasmFiles {
  readonly glue: string;
  readonly bytes: string;
}
export const CORE_FILES: WasmFiles = { glue: "wasm/roomboard_wasm.js", bytes: "wasm/roomboard_wasm_bg.wasm" };
export const FORMATS_FILES: WasmFiles = { glue: "wasm-formats/roomboard_formats_wasm.js", bytes: "wasm-formats/roomboard_formats_wasm_bg.wasm" };

interface Glue {
  initSync(arg: { module: Uint8Array }): unknown;
}

export function wasmPresent(dir: URL): boolean {
  return [CORE_FILES, FORMATS_FILES].every((f) => existsSync(new URL(f.glue, dir)) && existsSync(new URL(f.bytes, dir)));
}

async function glueOf<T>(dir: URL, files: WasmFiles): Promise<T & Glue> {
  const glue = new URL(files.glue, dir);
  const bytes = new URL(files.bytes, dir);
  if (!existsSync(glue) || !existsSync(bytes)) {
    throw new CliError("io", `module Wasm absent : ${bytes.pathname} (le construire comme scripts/verifier.sh)`);
  }
  const mod = (await import(/* @vite-ignore */ glue.href)) as T & Glue;
  mod.initSync({ module: readFileSync(bytes) });
  return mod;
}

export async function loadCore(dir: URL): Promise<CoreFactory> {
  return createWasmCore(await glueOf<WasmModule>(dir, CORE_FILES));
}

/** Chargeur du module formats pour `createPageCodec` (qui le garde) et la lecture des classeurs. */
export function loadFormats(dir: URL): () => Promise<SheetFormatsBinding> {
  return async () => {
    const mod = await glueOf<SheetFormatsBinding>(dir, FORMATS_FILES);
    if (!hasSheetReader(mod)) throw new CliError("io", "module des formats sans lecteur de classeur");
    return mod;
  };
}
```

Relancer la commande de l'étape 6. Attendu : `Tests  4 passed (4)`.

- [ ] **Étape 8 : tests rouges de `main`.** Créer `apps/cli/src/main.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { FORMAT_LOTS } from "./formats";
import { main } from "./main";
import { describeWasm, memoryIO } from "./testing";

describe("main : commandes sans module (D9)", () => {
  it("formats rend la table entière, code 0", async () => {
    const io = memoryIO();
    expect(await main(["formats"], io)).toBe(0);
    const [out] = io.json();
    expect(out.formats).toHaveLength(Object.keys(FORMAT_LOTS).length);
    expect(out.formats).toContainEqual({ ext: ".roomboard", read: true, write: true, lot: 1, notes: [] });
    expect(out.formats).toContainEqual(expect.objectContaining({ ext: ".pdf", read: false, write: false, lot: 3 }));
    expect(io.stderr).toEqual([]);
  });
  it("commande inconnue, absente, clé d'Object ou argument en trop : code 2, une erreur JSON sur stderr", async () => {
    for (const argv of [["bidule"], [], ["toString"], ["__proto__"], ["constructor"], ["formats", "en-trop"]]) {
      const io = memoryIO();
      expect(await main(argv, io)).toBe(2);
      expect(io.stdout).toEqual([]);
      expect(io.errors()).toEqual([{ error: expect.objectContaining({ code: "usage" }) }]);
    }
  });
  it("module Wasm absent : code 1, erreur io", async () => {
    const io = memoryIO([], {}, new URL("file:///roomboard-absent/"));
    expect(await main(["version"], io)).toBe(1);
    expect(io.errors()[0].error.code).toBe("io");
  });
});

describeWasm("main : version au vrai module", () => {
  it("version : cli, core, app et schéma", async () => {
    const io = memoryIO();
    expect(await main(["version"], io)).toBe(0);
    expect(io.json()).toEqual([{ cli: "0.1.0", core: expect.any(String), app: "0.1.0", schema: "roomboard-cli/1" }]);
  });
});
```

Lancer : `cd $WT && nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/main.test.ts 2>&1 | tail -6`.
Attendu : `FAIL` (`./main` introuvable).

- [ ] **Étape 9 : `main.ts` et `bin.ts`.** Créer `apps/cli/src/main.ts` :

```ts
/**
 * Ligne de commande de RoomBoard (cadrage cli, DA2) : une commande, ses arguments, une ligne JSON par résultat sur
 * stdout, une ligne `{"error":…}` sur stderr en échec ; code de sortie 0, 1, 2 ou 3 (D9). Table des commandes : clés
 * propres seulement (`toString`, `__proto__` sont des usages inconnus).
 */
import { APP_VERSION } from "../../web/src/platform/controller";
import { asCliError, CLI_VERSION, CliError, SCHEMA, usage, type CliIO } from "./contract";
import { formatRows } from "./formats";
import { loadCore } from "./wasm-node";

type Handler = (args: readonly string[], io: CliIO) => Promise<number>;

const USAGE = {
  version: "version",
  formats: "formats",
} as const;

const none = (args: readonly string[], name: keyof typeof USAGE): void => {
  if (args.length > 0) throw usage(USAGE[name]);
};

const COMMANDS: Readonly<Record<string, Handler>> = {
  version: async (args, io) => {
    none(args, "version");
    const core = await loadCore(io.wasmDir);
    io.out(JSON.stringify({ cli: CLI_VERSION, core: core.version(), app: APP_VERSION, schema: SCHEMA }));
    return 0;
  },
  formats: async (args, io) => {
    none(args, "formats");
    io.out(JSON.stringify({ formats: formatRows() }));
    return 0;
  },
};

export async function main(argv: readonly string[], io: CliIO): Promise<number> {
  const [name, ...rest] = argv;
  try {
    const handler = name !== undefined && Object.hasOwn(COMMANDS, name) ? COMMANDS[name] : undefined;
    if (handler === undefined) {
      throw new CliError("usage", `commande inconnue : ${name ?? "(aucune)"} ; commandes : ${Object.keys(COMMANDS).join(", ")}`);
    }
    return await handler(rest, io);
  } catch (e) {
    const err = asCliError(e);
    io.err(JSON.stringify({ error: err }));
    return err.exit;
  }
}
```

Créer `apps/cli/src/bin.ts` :

```ts
// Entrée du binaire `roomboard` (D3) : branche le processus sur `main` ; les `.wasm` sont à côté du fichier construit.
import { createInterface } from "node:readline";
import type { CliIO } from "./contract";
import { main } from "./main";

const io: CliIO = {
  out: (line) => {
    process.stdout.write(`${line}\n`);
  },
  err: (line) => {
    process.stderr.write(`${line}\n`);
  },
  lines: () => createInterface({ input: process.stdin, crlfDelay: Infinity }),
  env: process.env,
  wasmDir: new URL("./", import.meta.url),
};

process.exitCode = await main(process.argv.slice(2), io);
```

- [ ] **Étape 10 : preuve des tests (commande bornée).**

```bash
cd $WT && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -30
```

Attendu : `Test Files  4 passed (4)`, `Tests  N passed (N)` avec N ≥ 14, la ligne
`✓ src/formats.test.ts > FORMAT_LOTS (D9) > chaque extension d'IMPORT_EXTENSIONS et d'OFFICE_EXTENSIONS est une clé de FORMAT_LOTS`,
aucun `×` ni `FAIL`.

- [ ] **Étape 11 : build et essai réel.**

```bash
cd $WT && nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -6 \
  && ls apps/cli/dist apps/cli/dist/wasm apps/cli/dist/wasm-formats \
  && node apps/cli/dist/roomboard.mjs version; echo "code=$?" \
  ; node apps/cli/dist/roomboard.mjs formats | head -c 200; echo \
  ; node apps/cli/dist/roomboard.mjs bidule; echo "code=$?"
```

Attendu : `dist/roomboard.mjs` construit ; `{"cli":"0.1.0","core":"…","app":"0.1.0","schema":"roomboard-cli/1"}` puis
`code=0` ; début de `{"formats":[{"ext":".roomboard",…` ; `{"error":{"code":"usage",…}}` puis `code=2`. Si le build
échoue sur un module web (résolution, DOM au chargement), le dire au rapport avec le message exact : c'est une hypothèse
du cadrage (H5) qui tombe.

- [ ] **Étape 12 : verrou et licences.**

```bash
cd $WT && pnpm install --frozen-lockfile 2>&1 | tail -3 && nice -n 10 node scripts/controle-licences.mjs 2>&1 | tail -3
```

Attendu : les deux commandes rendent 0.

- [ ] **Étape 13 : commit.**

```bash
cd $WT && git add apps/cli/package.json apps/cli/tsconfig.json apps/cli/vite.config.ts apps/cli/src/bin.ts apps/cli/src/contract.ts apps/cli/src/args.ts apps/cli/src/formats.ts apps/cli/src/wasm-node.ts apps/cli/src/main.ts apps/cli/src/testing.ts apps/cli/src/args.test.ts apps/cli/src/formats.test.ts apps/cli/src/wasm-node.test.ts apps/cli/src/main.test.ts pnpm-lock.yaml \
  && git status --short \
  && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(cli): add @roomboard/cli package with Wasm loading, format lots, version and formats" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Attendu : `git status --short` ne montre plus que `?? target` (le lien) ; le commit passe.

---

### Tâche T2 — État et session : `new`, `state`, `run`, `apply`, onglets, références

<a id="tache-t2"></a>

**Objectif.** Ouvrir, créer et enregistrer un `.roomboard` (écriture atomique), lire son état au schéma
`roomboard-cli/1`, jouer une session JSONL (commandes du cœur, `undo`, `redo`, `state`, `save`, onglets) avec les
références `$n`, `$n.k`, `$page:i`, `$tab:i` (cadrage D3, D5, D6, D7, D8, DA3, DA4, H4, H6, DA6 « T2 »).

**Fichiers.**
- Créer : `apps/cli/src/disk.ts`, `apps/cli/src/ops.ts`, `apps/cli/src/state.ts`, `apps/cli/src/session.ts`.
- Modifier : `apps/cli/src/main.ts` (remplacé en entier, étape 9).
- Tests : `apps/cli/src/disk.test.ts`, `apps/cli/src/ops.test.ts`, `apps/cli/src/session.test.ts` (neufs),
  `apps/cli/src/main.test.ts` (blocs ajoutés).

**Interfaces.**
- Consomme (T1) : `CliError`, `asCliError(e, code?)`, `usage(text)`, `CliIO`, `SCHEMA`, `CLI_VERSION` (`contract.ts`) ;
  `parseArgs`, `flagStr` (`args.ts`) ; `formatRows` (`formats.ts`) ; `loadCore(dir): Promise<CoreFactory>`,
  `loadFormats(dir): () => Promise<SheetFormatsBinding>` (`wasm-node.ts`) ; `memoryIO`, `tmpDir`, `codeOf`,
  `describeWasm`, `Json`, `FIXED_NOW` (`testing.ts`).
- Produit (repris par T3 et T4) :
  - `disk.ts` : `readBytes(path: string): Promise<Uint8Array>`, `writeAtomic(path: string, bytes: Uint8Array): Promise<void>`,
    `nowOf(env: Readonly<Record<string, string | undefined>>): string`.
  - `ops.ts` : `COMMAND_TYPES` (30 types de `Command`), `CLI_OPS`, `type CliOpName`, `type Op`, `interface RefContext { idsOf(n: number): readonly string[] | undefined; pageIds(): readonly string[]; tabIds(): readonly string[] }`,
    `resolveRefs(v: unknown, ctx: RefContext): unknown`, `parseOp(line: unknown, ctx: RefContext): Op`,
    `optString(args: Readonly<Record<string, unknown>>, key: string): string | undefined`, `needString(args, key): string`.
  - `state.ts` : `stateOf(doc: CoreDocument, file: string | null, opts?: { page?: string; points?: boolean }): CliState`,
    `interface CliState`, `interface PageState`. Précision du cadrage (« `stateOf(tabs, opts)` ») : l'état décrit un
    document (un seul `file` dans l'enveloppe DA4), donc `stateOf` prend le document de l'onglet.
  - `session.ts` : `interface CliTab { doc: CoreDocument; assets: AssetStore; file: string | null }`,
    `interface SessionDeps { core: CoreFactory; io: ContainerIO; notices: string[]; formats: () => Promise<SheetFormatsBinding>; now(): string }`,
    `type OpResult`, `interface TabInfo { id: string; file: string | null; active: boolean }`,
    `interface Session { deps; tabs: Tabs<CliTab>; active(): CliTab; newTab(): TabEntry<CliTab>; readDoc(path, kind: ReadKind): Promise<ReadResult>; open(path): Promise<TabEntry<CliTab>>; openBytes(name, bytes, path: string | null): Promise<TabEntry<CliTab> | null>; save(tab: CliTab, to?: string | null): Promise<string>; tabList(): TabInfo[]; exec(line: unknown): Promise<OpResult> }`,
    `createSession(deps: SessionDeps): Session`, `nodeSession(io: CliIO): Promise<Session>`.
  - `main.ts` : commandes `new`, `state`, `run`, `apply` ; `play(session, lines, io)` interne.
  - Règle des références (précision de D6) : `$n` = premier id de `change.ids` de l'opération n ; quand `ids` est vide
    (cas d'`AddPage`, qui ne rend que `pages`), `$n` vise `change.pages`. Une opération en cours, échouée ou sans id ne
    résout rien : usage (code 2).
- Réutilise : `apps/web/src/core/wasm-core.ts:716` — `CoreDocument.apply/undo/redo/canUndo/canRedo/version/pageIds/elementIds/element/page/citedAssets/points` (session et état).
- Réutilise : `apps/web/src/app/container-io.ts:85`, `apps/web/src/platform/container.ts:127` — `createContainerIO({ core, codec: createPageCodec(loadFormats(dir)), say, makeAssets })` ; `encode(doc, assets, now, APP_VERSION, { kind: "document" })`, `read(name, bytes, kind, path)`.
- Réutilise : `apps/web/src/core/asset-store.ts:29` — `createAssetStore()` (un magasin par onglet).
- Réutilise : `apps/web/src/app/tabs.ts:31` — `createTabs<CliTab>(newId)`, `MAX_TABS`, `TOO_MANY_TABS` (12 onglets, même règle de fermeture).
- Réutilise : vues de `apps/web/src/core/wasm-core.ts:169,360,370` — `element(id)`, `page(id)`, `citedAssets()` sérialisés tels quels ; nouveau module `apps/cli/src/state.ts` (`stateOf`).
- Réutilise : nouveau module `apps/cli/src/session.ts` — `createSession(deps: SessionDeps)` avec `exec(line: unknown): Promise<OpResult>`.
- Réutilise : `apps/cli/src/main.ts` (T1) — `main(argv, io)` étendu de `new`, `state`, `run`, `apply`.

**Test et commande bornée.**
- Tests : `disk.test.ts` (4), `ops.test.ts` (7), `session.test.ts` (6), `main.test.ts` (+6 : S1, S2 ×2, stdin, usages,
  `apply --out`).
- Commande : étape 11 ; motif : `Test Files  7 passed (7)`, `Tests  N passed` avec N ≥ 35, lignes
  `✓ src/main.test.ts > S1 — créer, dessiner, annuler, enregistrer, relire > S1 — new, run --save puis state : 2 éléments, forme déplacée, canUndo faux`
  et `✓ src/main.test.ts > S2 — pages et onglets > S2 — AddPage, RemovePage, tab.new, rectangle dans t2, deux fichiers relus`,
  aucun `×` ni `FAIL`.

**Preuve visuelle.** Aucune.

**Contraintes (recopiées de Global Constraints).**
- GC1 — Les deux modules Wasm ne changent pas d'un octet ; aucun code Rust modifié.
- GC2 — Aucun seuil baissé ou relevé, aucun test désactivé ou sauté (hors le saut existant sans `.wasm`, levé par
  `ROOMBOARD_WASM_REQUIRED=1`).
- GC3 — Aucune dépendance nouvelle ; `pnpm install --frozen-lockfile` doit passer.
- GC4 — Builds et tests en `nice -n 10`, cargo `-j 4` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC5 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais finissant par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; jamais `git add -A` / `.` / `commit -a` ; ni push, ni tag,
  ni release, ni merge.
- GC6 — Fichiers temporaires dans le worktree ou `~/.cache/tmp/of1-*` (les tests écrivent sous `target/cli-tests/`).
- GC7 — Préparation : `pnpm install --frozen-lockfile` ; colle Wasm construite comme `scripts/verifier.sh`.
- GC8 — Rien dans `roomboard-prive` ni dans la coque Tauri ; aucune installation système, aucun `tauri build`.
- GC9 — La colle wasm-bindgen n'est chargée que par `apps/cli/src/wasm-node.ts`.
- GC10 — Format `.roomboard` inchangé : l'historique reste en mémoire, rien n'est ajouté au fichier.
- GC11 — stdout : une ligne JSON par résultat ; stderr : `{"error":{"code":…,"message":…}}` ; codes 0, 1, 2, 3.

**Patron à ne pas reprendre (concepteur-critique).**
- Recomposer les vues du cœur champ par champ (renommer, filtrer, arrondir) : l'état rend `doc.element(id)`,
  `doc.page(id)`, `doc.citedAssets()` tels quels, seul `points` s'ajoute aux traits sous `--points` (DA4). Référence :
  `apps/web/src/core/wasm-core.ts:169-292` (`toElementView`), `:360-380` (`toPageView`, `toAssetInfo`).
- Écrire l'historique, la version ou un état de session dans le fichier : l'historique vit dans le cœur
  (`crates/roomboard-core/src/document.rs:490-516`) ; `version`, `canUndo`, `canRedo` décrivent la session.
- Refaire la liste d'onglets : `createTabs` (`apps/web/src/app/tabs.ts:31-89`) tient l'ordre, l'actif et la règle de
  fermeture.
- Écrire le fichier directement (`writeFile` sur la cible) : toujours `writeAtomic` (temporaire du même dossier puis
  `rename`, D3).

**Interdits.**
- Ne rien modifier sous `apps/web/` ni `crates/`.
- Aucune opération `import` ni `export` dans cette tâche (T3 les ajoute à `CLI_OPS`).
- Ne jamais ajouter le lien `target` ni `apps/cli/dist/` au commit.

**Terminé quand.** Les 7 fichiers de test passent sous `ROOMBOARD_WASM_REQUIRED=1` ; `pnpm --filter @roomboard/cli build`
rend 0 ; l'essai réel de l'étape 12 rend les lignes attendues ; le rapport contient `Réutilisation : appelé createContainerIO, createPageCodec`,
`Réutilisation : appelé createAssetStore`, `Réutilisation : appelé createTabs`, `Réutilisation : appelé CoreDocument (wasm-core)`.

**Étapes.**

- [ ] **Étape 1 : préparation du worktree** (créé depuis `feat/cli` après la fusion de T1 ; s'il en est donné un autre,
  remplacer `WT`).

```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
WT=/home/adminjd/projets/roomboard-wt/cli--T2
cd $WT
[ -e target ] || ln -s /home/adminjd/projets/roomboard-wt/cli/target target   # cache cargo partagé, jamais ajouté
pnpm install --frozen-lockfile
nice -n 10 cargo build -j 4 -p roomboard-wasm --target wasm32-unknown-unknown --release
rm -rf apps/web/src/wasm
wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm
nice -n 10 cargo build -j 4 -p roomboard-formats-wasm --target wasm32-unknown-unknown --release
rm -rf apps/web/src/wasm-formats
wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm
pnpm exec wasm-opt -Oz apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm -o apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm
ls apps/cli/src/contract.ts apps/web/src/wasm/roomboard_wasm_bg.wasm apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm
```

- [ ] **Étape 2 : tests rouges du disque.** Créer `apps/cli/src/disk.test.ts` :

```ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { nowOf, readBytes, writeAtomic } from "./disk";
import { tmpDir } from "./testing";

describe("disque (D3, H6)", () => {
  it("writeAtomic écrit le fichier sans laisser de temporaire", async () => {
    const dir = tmpDir();
    const f = join(dir, "x.roomboard");
    await writeAtomic(f, new Uint8Array([1, 2, 3]));
    expect([...readFileSync(f)]).toEqual([1, 2, 3]);
    expect(readdirSync(dir)).toEqual(["x.roomboard"]);
  });
  it("dossier absent : erreur io, aucun fichier ni temporaire", async () => {
    const dir = tmpDir();
    await expect(writeAtomic(join(dir, "absent", "x.roomboard"), new Uint8Array([1]))).rejects.toMatchObject({ code: "io" });
    expect(readdirSync(dir)).toEqual([]);
  });
  it("readBytes d'un fichier absent : erreur io", async () => {
    await expect(readBytes(join(tmpDir(), "absent.roomboard"))).rejects.toMatchObject({ code: "io" });
  });
  it("nowOf : ROOMBOARD_NOW sinon l'heure ISO du système", () => {
    expect(nowOf({ ROOMBOARD_NOW: "2026-11-23T00:00:00.000Z" })).toBe("2026-11-23T00:00:00.000Z");
    expect(nowOf({})).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
```

Lancer : `cd $WT && nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/disk.test.ts 2>&1 | tail -6`.
Attendu : `FAIL` (`./disk` introuvable).

- [ ] **Étape 3 : `disk.ts`.** Créer `apps/cli/src/disk.ts` :

```ts
/** Disque de la CLI (D3, H6) : lecture, écriture atomique (temporaire du même dossier puis `rename`), date du manifeste. */
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { CliError } from "./contract";

const reason = (e: unknown): string => (e as NodeJS.ErrnoException).code ?? (e instanceof Error ? e.message : String(e));

export async function readBytes(path: string): Promise<Uint8Array> {
  try {
    return new Uint8Array(await readFile(path));
  } catch (e) {
    throw new CliError("io", `lecture impossible (${path}) : ${reason(e)}`);
  }
}

let seq = 0;
/** Aucun fichier à moitié écrit : une panique ou un échec laisse la cible telle qu'elle était (H8). */
export async function writeAtomic(path: string, bytes: Uint8Array): Promise<void> {
  const tmp = join(dirname(path), `.${basename(path)}.${process.pid}.${++seq}.tmp`);
  try {
    await writeFile(tmp, bytes);
    await rename(tmp, path);
  } catch (e) {
    await rm(tmp, { force: true });
    throw new CliError("io", `écriture impossible (${path}) : ${reason(e)}`);
  }
}

/** Date écrite au manifeste : `ROOMBOARD_NOW` si posée (essais reproductibles), sinon l'heure du système (H6). */
export const nowOf = (env: Readonly<Record<string, string | undefined>>): string => env["ROOMBOARD_NOW"] ?? new Date().toISOString();
```

Relancer la commande de l'étape 2. Attendu : `Tests  4 passed (4)`.

- [ ] **Étape 4 : tests rouges des opérations.** Créer `apps/cli/src/ops.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { ALL_COMMANDS, COMMAND_TYPES, parseOp, type RefContext } from "./ops";
import { codeOf } from "./testing";

const ctx = (): RefContext => ({
  idsOf: (n) => (n === 1 ? ["e1", "e2"] : n === 2 ? [] : undefined),
  pageIds: () => ["p0", "p1"],
  tabIds: () => ["t1", "t2"],
});
const style = { color: "#000000", width: 4 };

describe("lecture d'une opération (D6)", () => {
  it("points et path deviennent des Float32Array", () => {
    const op = parseOp(JSON.stringify({ type: "CommitStroke", page: "p", points: [1, 2, 0.5], style }), ctx());
    if (op.kind !== "command" || op.cmd.type !== "CommitStroke") throw new Error("forme inattendue");
    expect(op.cmd.points).toBeInstanceOf(Float32Array);
    expect(Array.from(op.cmd.points)).toEqual([1, 2, 0.5]);
    const erase = parseOp({ type: "Erase", page: "p", path: [0, 0, 5, 5], radius: 4, mode: "object" }, ctx());
    expect(erase.kind === "command" && erase.cmd.type === "Erase" && erase.cmd.path instanceof Float32Array).toBe(true);
  });
  it("références $n, $n.k, $page:i, $tab:i sur les chaînes entières seulement", () => {
    const op = parseOp({ type: "Delete", ids: ["$1", "$1.2", "$page:1", "$tab:0", "x$1", "$1 ", "$page:"] }, ctx());
    expect(op.kind === "command" ? op.cmd : null).toEqual({ type: "Delete", ids: ["e1", "e2", "p1", "t1", "x$1", "$1 ", "$page:"] });
  });
  it("référence inconnue, à une opération sans id, à venir ou hors rang : usage", () => {
    for (const ref of ["$2", "$3", "$1.3", "$1.0", "$page:2", "$tab:5"]) {
      expect(codeOf(() => parseOp({ type: "Delete", ids: [ref] }, ctx()))).toBe("usage");
    }
  });
  it("opération de la CLI : nom et arguments, références résolues", () => {
    expect(parseOp('{"op":"tab.select","tab":"$tab:1"}', ctx())).toEqual({ kind: "cli", op: "tab.select", args: { op: "tab.select", tab: "t2" } });
  });
  it("commande du cœur inconnue, op inconnue ou clé d'Object, JSON invalide, tableau, nombre : usage", () => {
    for (const line of ['{"type":"Bidule"}', '{"type":"constructor"}', '{"op":"toString"}', '{"op":"__proto__"}', "{pas du json", "[1,2]", "3", '{"page":"p"}']) {
      expect(codeOf(() => parseOp(line, ctx()))).toBe("usage");
    }
  });
  it("points ou path non numériques : usage", () => {
    expect(codeOf(() => parseOp({ type: "CommitStroke", page: "p", points: [1, "a"], style }, ctx()))).toBe("usage");
    expect(codeOf(() => parseOp({ type: "Erase", page: "p", path: "0,0", radius: 4, mode: "object" }, ctx()))).toBe("usage");
  });
  it("COMMAND_TYPES couvre les 30 commandes de Command, sans doublon", () => {
    expect(ALL_COMMANDS).toBe(true);
    expect(new Set(COMMAND_TYPES).size).toBe(30);
  });
});
```

Lancer : `cd $WT && nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/ops.test.ts 2>&1 | tail -6`.
Attendu : `FAIL` (`./ops` introuvable).

- [ ] **Étape 5 : `ops.ts`.** Créer `apps/cli/src/ops.ts` :

```ts
/**
 * Lecture d'une ligne d'opération (cadrage cli, D6) : une commande du cœur telle que la page l'envoie
 * (`{"type":…}`, union `Command` de `core/api.ts`, `points` et `path` en tableaux JSON convertis en `Float32Array`), ou
 * une opération de la CLI (`{"op":…}`). Références sur les chaînes entières : `$n` (1er id de l'opération n, comptée à
 * partir de 1), `$n.k` (k-ième, à partir de 1), `$page:i` (page d'indice i de l'onglet actif), `$tab:i` (onglet d'indice i).
 */
import type { Command } from "../../web/src/core/api";
import { CliError } from "./contract";

export const COMMAND_TYPES = [
  "AddPage", "RemovePage", "CommitStroke", "Erase", "Delete", "AddShape", "SetText", "Transform", "AddImage", "AddMedia",
  "SetMedia", "AddModel3d", "SetModel3dView", "SetBackdrop", "FormatText", "SetGrid", "AddTable", "SetTableCell",
  "InsertTableLine", "RemoveTableLine", "SetTableSizes", "SetTableFill", "MergeTableCells", "SplitTableCell",
  "SetTableShade", "ImportTable", "Fill", "SetImageParams", "Group", "Ungroup",
] as const satisfies readonly Command["type"][];
// Une commande ajoutée à `Command` sans l'être ici casse `tsc` : la CLI suit le cœur (§ 7 du cadrage).
type Missing = Exclude<Command["type"], (typeof COMMAND_TYPES)[number]>;
export const ALL_COMMANDS: [Missing] extends [never] ? true : Missing = true;

export const CLI_OPS = ["undo", "redo", "state", "save", "tab.new", "tab.open", "tab.select", "tab.close", "tab.list"] as const;
export type CliOpName = (typeof CLI_OPS)[number];

export type Op =
  | { readonly kind: "command"; readonly cmd: Command }
  | { readonly kind: "cli"; readonly op: CliOpName; readonly args: Readonly<Record<string, unknown>> };

export interface RefContext {
  /** Ids retenus de l'opération n (1 = la première) ; undefined si elle n'a pas encore eu lieu. */
  idsOf(n: number): readonly string[] | undefined;
  pageIds(): readonly string[];
  tabIds(): readonly string[];
}

const REF = /^\$(?:(\d+)(?:\.(\d+))?|page:(\d+)|tab:(\d+))$/;
const FLOAT_KEYS = ["points", "path"] as const;

export function resolveRefs(v: unknown, ctx: RefContext): unknown {
  if (typeof v === "string") {
    const m = REF.exec(v);
    if (m === null) return v;
    const [, n, k, page, tab] = m;
    let id: string | undefined;
    if (n !== undefined) id = ctx.idsOf(Number(n))?.[k === undefined ? 0 : Number(k) - 1];
    else id = (page !== undefined ? ctx.pageIds() : ctx.tabIds())[Number(page ?? tab)];
    if (id === undefined) throw new CliError("usage", `référence inconnue : ${v}`);
    return id;
  }
  if (Array.isArray(v)) return v.map((x) => resolveRefs(x, ctx));
  if (typeof v === "object" && v !== null) return Object.fromEntries(Object.entries(v).map(([key, x]) => [key, resolveRefs(x, ctx)]));
  return v;
}

function parseJson(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    throw new CliError("usage", `ligne JSON invalide : ${line.slice(0, 80)}`);
  }
}

export function parseOp(line: unknown, ctx: RefContext): Op {
  const raw = typeof line === "string" ? parseJson(line) : line;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new CliError("usage", "opération : objet JSON attendu");
  const v = resolveRefs(raw, ctx) as Record<string, unknown>;
  const type = v["type"];
  if (typeof type === "string") {
    if (!(COMMAND_TYPES as readonly string[]).includes(type)) throw new CliError("usage", `commande du cœur inconnue : ${type}`);
    const cmd: Record<string, unknown> = { ...v };
    for (const key of FLOAT_KEYS) {
      const a = cmd[key];
      if (a === undefined) continue;
      if (!Array.isArray(a) || !a.every((x) => typeof x === "number" && Number.isFinite(x))) {
        throw new CliError("usage", `${key} : tableau de nombres attendu`);
      }
      cmd[key] = new Float32Array(a as number[]);
    }
    return { kind: "command", cmd: cmd as unknown as Command };
  }
  const op = v["op"];
  if (typeof op === "string" && (CLI_OPS as readonly string[]).includes(op)) return { kind: "cli", op: op as CliOpName, args: v };
  throw new CliError("usage", `opération inconnue : ${JSON.stringify(raw).slice(0, 80)}`);
}

export function optString(args: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const v = args[key];
  if (v === undefined) return undefined;
  if (typeof v !== "string") throw new CliError("usage", `${key} : chaîne attendue`);
  return v;
}

export function needString(args: Readonly<Record<string, unknown>>, key: string): string {
  const v = optString(args, key);
  if (v === undefined) throw new CliError("usage", `${key} : champ exigé`);
  return v;
}
```

Relancer la commande de l'étape 4. Attendu : `Tests  7 passed (7)`.

- [ ] **Étape 6 : `state.ts`.** Créer `apps/cli/src/state.ts` :

```ts
/**
 * État `roomboard-cli/1` (cadrage cli, DA4) : enveloppe fixe, vues du cœur sans transformation. `version`, `canUndo`,
 * `canRedo` décrivent la session en mémoire (repartent de zéro à chaque ouverture) ; seuls `pages` et `assets` décrivent
 * le contenu, toute comparaison d'états porte sur eux. `points` : traits seulement, sous `--points`.
 */
import type { AssetInfo, CoreDocument, ElementView, PageView } from "../../web/src/core/api";
import { CliError, SCHEMA } from "./contract";

export type ElementState = ElementView & { readonly points?: readonly number[] };
export interface PageState {
  readonly index: number;
  readonly page: PageView;
  readonly elements: readonly ElementState[];
}
export interface CliState {
  readonly schema: typeof SCHEMA;
  readonly file: string | null;
  readonly version: number;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly pages: readonly PageState[];
  readonly assets: readonly AssetInfo[];
}

export function stateOf(doc: CoreDocument, file: string | null, opts: { readonly page?: string | undefined; readonly points?: boolean } = {}): CliState {
  const ids = doc.pageIds();
  if (opts.page !== undefined && !ids.includes(opts.page)) throw new CliError("command", `page inconnue : ${opts.page}`);
  const pages = ids.flatMap((id, index): PageState[] => {
    if (opts.page !== undefined && id !== opts.page) return [];
    const page = doc.page(id);
    if (page === null) return [];
    const elements = doc.elementIds(id).flatMap((e): ElementState[] => {
      const view = doc.element(e);
      if (view === null) return [];
      return opts.points === true && view.kind === "stroke" ? [{ ...view, points: Array.from(doc.points(e) ?? []) }] : [view];
    });
    return [{ index, page, elements }];
  });
  return { schema: SCHEMA, file, version: doc.version(), canUndo: doc.canUndo(), canRedo: doc.canRedo(), pages, assets: doc.citedAssets() };
}
```

- [ ] **Étape 7 : tests rouges de la session.** Créer `apps/cli/src/session.test.ts` :

```ts
import { expect, it } from "vitest";
import { CliError } from "./contract";
import { nodeSession } from "./session";
import { describeWasm, memoryIO, type Json } from "./testing";

const rect = (page: string) => ({ type: "AddShape", page, shape: "rect", x0: 10, y0: 20, x1: 110, y1: 220, style: { color: "#1e40af", width: 4 }, fill: null });
const fresh = async () => {
  const s = await nodeSession(memoryIO());
  s.newTab();
  return s;
};

describeWasm("session (D5, D6, D7, DA4)", () => {
  it("undo sans rien à annuler : change nul ; après une forme, annule puis l'état le dit", async () => {
    const s = await fresh();
    expect(await s.exec('{"op":"undo"}')).toEqual({ op: 1, ok: true, change: null });
    await s.exec(JSON.stringify(rect("$page:0")));
    const undone: Json = await s.exec('{"op":"undo"}');
    expect(undone.change).not.toBeNull();
    const st: Json = await s.exec('{"op":"state"}');
    expect(st.state).toMatchObject({ schema: "roomboard-cli/1", file: null, canUndo: false, canRedo: true });
    expect(st.state.pages[0].elements).toEqual([]);
  });
  it("AddPage : $n vise la page créée", async () => {
    const s = await fresh();
    const added: Json = await s.exec('{"type":"AddPage","after":"$page:0"}');
    const shape: Json = await s.exec(JSON.stringify(rect("$1")));
    expect(shape.change.pages).toEqual(added.change.pages);
  });
  it("refus du cœur : CliError command avec le message du cœur", async () => {
    const s = await fresh();
    await expect(s.exec('{"type":"RemovePage","page":"$page:0"}')).rejects.toMatchObject({ code: "command", message: "la dernière page ne se supprime pas" });
  });
  it("commande mal formée (style absent) : CliError, jamais une exception brute", async () => {
    const s = await fresh();
    const err: unknown = await s.exec('{"type":"AddShape","page":"$page:0","shape":"rect","x0":0,"y0":0,"x1":1,"y1":1}').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CliError);
    expect((err as CliError).exit).toBe(1);
  });
  it("onglets t1…t12 déterministes, 13e refusé, tab.select, tab.close, onglet inconnu", async () => {
    const s = await fresh();
    for (let i = 2; i <= 12; i++) await s.exec('{"op":"tab.new"}');
    await expect(s.exec('{"op":"tab.new"}')).rejects.toMatchObject({ code: "command", message: "12 onglets au plus ; fermez-en un" });
    const sel: Json = await s.exec('{"op":"tab.select","tab":"t3"}');
    expect(sel.tabs.find((t: Json) => t.active).id).toBe("t3");
    const closed: Json = await s.exec('{"op":"tab.close","tab":"$tab:2"}');
    expect(closed.tabs.map((t: Json) => t.id)).not.toContain("t3");
    expect(closed.tabs.find((t: Json) => t.active).id).toBe("t2");
    await expect(s.exec('{"op":"tab.select","tab":"t99"}')).rejects.toMatchObject({ code: "command" });
  });
  it("state : --points sur les traits seulement, --page filtre, page inconnue refusée", async () => {
    const s = await fresh();
    await s.exec(JSON.stringify(rect("$page:0")));
    await s.exec(JSON.stringify({ type: "CommitStroke", page: "$page:0", points: [0, 0, 0.5, 50, 50, 0.5], style: { color: "#dc2626", width: 4 } }));
    await s.exec('{"type":"AddPage","after":"$page:0"}');
    const st: Json = await s.exec('{"op":"state","page":"$page:0","points":true}');
    expect(st.state.pages).toHaveLength(1);
    const [shape, stroke] = st.state.pages[0].elements;
    expect(shape.points).toBeUndefined();
    expect(stroke.points).toHaveLength(6);
    await expect(s.exec('{"op":"state","page":"inconnue"}')).rejects.toMatchObject({ code: "command" });
  });
});
```

Lancer : `cd $WT && nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/session.test.ts 2>&1 | tail -6`.
Attendu : `FAIL` (`./session` introuvable).

- [ ] **Étape 8 : `session.ts`.** Créer `apps/cli/src/session.ts` :

```ts
/**
 * Session de la CLI (cadrage cli, D5, D7, DA3, H4) : onglets (`createTabs`, ids t1, t2… dans l'ordre de création),
 * opérations jouées dans un seul processus, historique du cœur le temps de la session ; rien n'est écrit sans `save`.
 * `$n` vise les ids de l'opération n, ou ses pages quand elle n'a créé aucun élément (AddPage) ; une opération en cours
 * ou échouée ne résout rien. Une opération refusée lève une `CliError` ; l'appelant arrête la session (H4).
 */
import { basename } from "node:path";
import { createContainerIO, type ContainerIO, type ReadKind, type ReadResult } from "../../web/src/app/container-io";
import { createTabs, MAX_TABS, TOO_MANY_TABS, type TabEntry, type Tabs } from "../../web/src/app/tabs";
import type { Change, CoreDocument, CoreFactory } from "../../web/src/core/api";
import { createAssetStore, type AssetStore } from "../../web/src/core/asset-store";
import { createPageCodec, type SheetFormatsBinding } from "../../web/src/platform/container";
import { APP_VERSION } from "../../web/src/platform/controller";
import { asCliError, CliError, type CliIO } from "./contract";
import { nowOf, readBytes, writeAtomic } from "./disk";
import { needString, optString, parseOp, type CliOpName, type RefContext } from "./ops";
import { stateOf } from "./state";
import { loadCore, loadFormats } from "./wasm-node";

export interface CliTab {
  readonly doc: CoreDocument;
  readonly assets: AssetStore;
  /** Chemin d'enregistrement ; null pour un onglet neuf jamais enregistré. */
  file: string | null;
}

export interface SessionDeps {
  readonly core: CoreFactory;
  readonly io: ContainerIO;
  /** Avis du produit (`say`, `notify`), dans l'ordre. */
  readonly notices: string[];
  readonly formats: () => Promise<SheetFormatsBinding>;
  now(): string;
}

export type OpResult = { readonly op: number; readonly ok: true } & Readonly<Record<string, unknown>>;
export interface TabInfo {
  readonly id: string;
  readonly file: string | null;
  readonly active: boolean;
}

export interface Session {
  readonly deps: SessionDeps;
  readonly tabs: Tabs<CliTab>;
  /** Onglet actif ; CliError command s'il n'y en a aucun. */
  active(): CliTab;
  newTab(): TabEntry<CliTab>;
  /** Lit un conteneur ; CliError format avec l'avis du produit s'il est refusé. */
  readDoc(path: string, kind: ReadKind): Promise<ReadResult>;
  open(path: string): Promise<TabEntry<CliTab>>;
  /** Ouverture par l'importeur (`openDocument`) : null si refusé, l'avis est déjà dans `notices`. */
  openBytes(name: string, bytes: Uint8Array, path: string | null): Promise<TabEntry<CliTab> | null>;
  save(tab: CliTab, to?: string | null): Promise<string>;
  tabList(): TabInfo[];
  exec(line: unknown): Promise<OpResult>;
}

export function createSession(deps: SessionDeps): Session {
  let next = 0;
  const tabs = createTabs<CliTab>(() => `t${++next}`);
  /** recorded[n - 1] : ids retenus de l'opération n. */
  const recorded: (readonly string[])[] = [];

  const active = (): CliTab => {
    const t = tabs.active();
    if (t === null) throw new CliError("command", "aucun onglet ouvert");
    return t.session;
  };
  const add = (tab: CliTab): TabEntry<CliTab> => {
    try {
      return tabs.add("board", tab);
    } catch (e) {
      tab.doc.free();
      throw asCliError(e, "command");
    }
  };
  const newTab = (): TabEntry<CliTab> => add({ doc: deps.core.blank(), assets: createAssetStore(), file: null });

  async function readDoc(path: string, kind: ReadKind): Promise<ReadResult> {
    const bytes = await readBytes(path);
    const before = deps.notices.length;
    const read = await deps.io.read(basename(path), bytes, kind, path);
    if (read === null) throw new CliError("format", deps.notices.slice(before).join(" ; ") || `ouverture impossible : ${path}`);
    return read;
  }
  async function open(path: string): Promise<TabEntry<CliTab>> {
    if (tabs.list().length >= MAX_TABS) throw new CliError("command", TOO_MANY_TABS);
    const read = await readDoc(path, "document");
    return add({ doc: read.doc, assets: read.assets, file: path });
  }
  async function openBytes(name: string, bytes: Uint8Array, path: string | null): Promise<TabEntry<CliTab> | null> {
    if (tabs.list().length >= MAX_TABS) {
      deps.notices.push(`Ouverture impossible (${name}) : ${TOO_MANY_TABS}`);
      return null;
    }
    const read = await deps.io.read(name, bytes, "document", path);
    return read === null ? null : add({ doc: read.doc, assets: read.assets, file: path });
  }
  async function save(tab: CliTab, to: string | null = null): Promise<string> {
    const path = to ?? tab.file;
    if (path === null) throw new CliError("usage", "enregistrer : aucun chemin (champ « to » ou option --out)");
    let bytes: Uint8Array;
    try {
      bytes = await deps.io.encode(tab.doc, tab.assets, deps.now(), APP_VERSION, { kind: "document" });
    } catch (e) {
      throw asCliError(e, "command");
    }
    await writeAtomic(path, bytes);
    tab.file = path;
    return path;
  }
  const tabList = (): TabInfo[] => {
    const current = tabs.active()?.id ?? null;
    return tabs.list().map((t) => ({ id: t.id, file: t.session.file, active: t.id === current }));
  };
  const knownTab = (args: Readonly<Record<string, unknown>>): string => {
    const id = needString(args, "tab");
    if (!tabs.list().some((t) => t.id === id)) throw new CliError("command", `onglet inconnu : ${id}`);
    return id;
  };
  const ctx: RefContext = {
    idsOf: (n) => (n >= 1 ? recorded[n - 1] : undefined),
    pageIds: () => tabs.active()?.session.doc.pageIds() ?? [],
    tabIds: () => tabs.list().map((t) => t.id),
  };

  async function runCli(name: CliOpName, args: Readonly<Record<string, unknown>>): Promise<Record<string, unknown>> {
    switch (name) {
      case "undo":
      case "redo": {
        const doc = active().doc;
        const can = name === "undo" ? doc.canUndo() : doc.canRedo();
        return { change: can ? (name === "undo" ? doc.undo() : doc.redo()) : null };
      }
      case "state": {
        const tab = active();
        return { state: stateOf(tab.doc, tab.file, { page: optString(args, "page"), points: args["points"] === true }) };
      }
      case "save":
        return { file: await save(active(), optString(args, "to") ?? null) };
      case "tab.new":
        newTab();
        return { tabs: tabList() };
      case "tab.open":
        await open(needString(args, "file"));
        return { tabs: tabList() };
      case "tab.select":
        tabs.activate(knownTab(args));
        return { tabs: tabList() };
      case "tab.close":
        tabs.remove(knownTab(args))?.session.doc.free();
        return { tabs: tabList() };
      case "tab.list":
        return { tabs: tabList() };
    }
  }

  const session: Session = {
    deps,
    tabs,
    active,
    newTab,
    readDoc,
    open,
    openBytes,
    save,
    tabList,
    async exec(line) {
      const n = recorded.length + 1;
      recorded.push([]); // réservée : une référence à l'opération en cours ou échouée ne résout rien
      const before = deps.notices.length;
      const op = parseOp(line, ctx);
      let body: Record<string, unknown>;
      if (op.kind === "command") {
        const doc = active().doc;
        let change: Change;
        try {
          change = doc.apply(op.cmd);
        } catch (e) {
          throw asCliError(e, "command");
        }
        recorded[n - 1] = change.ids.length > 0 ? change.ids : change.pages;
        body = { change };
      } else {
        body = await runCli(op.op, op.args);
      }
      const fresh = deps.notices.slice(before);
      return { op: n, ok: true as const, ...body, ...(fresh.length > 0 ? { notices: fresh } : {}) };
    },
  };
  return session;
}

/** Session branchée sur les vrais modules : cœur, conteneur (module formats chargé au premier besoin), date du manifeste. */
export async function nodeSession(io: CliIO): Promise<Session> {
  const core = await loadCore(io.wasmDir);
  const formats = loadFormats(io.wasmDir);
  const notices: string[] = [];
  const containerIO = createContainerIO({
    core,
    codec: createPageCodec(formats),
    say: async (m) => {
      notices.push(m);
    },
    makeAssets: () => createAssetStore(),
  });
  return createSession({ core, io: containerIO, notices, formats, now: () => nowOf(io.env) });
}
```

Relancer la commande de l'étape 7. Attendu : `Tests  6 passed (6)`. Si `exec` d'une commande mal formée rend
une exception qui n'est pas une `CliError`, la cause est hors du `try` : la corriger dans `exec`, jamais en
désactivant le test.

- [ ] **Étape 9 : tests rouges des commandes, puis `main.ts`.** Ajouter à la fin de `apps/cli/src/main.test.ts` (imports
  à fusionner en tête : `readFileSync`, `writeFileSync` de `node:fs`, `join` de `node:path`, `tmpDir`, `type Json` de
  `./testing`) :

```ts
const rectOp = (page: string, x1 = 110, y1 = 220) => ({ type: "AddShape", page, shape: "rect", x0: 10, y0: 20, x1, y1, style: { color: "#1e40af", width: 4 }, fill: null });

describeWasm("S1 — créer, dessiner, annuler, enregistrer, relire", () => {
  it("S1 — new, run --save puis state : 2 éléments, forme déplacée, canUndo faux", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    const made = memoryIO();
    expect(await main(["new", a], made)).toBe(0);
    expect(made.json()).toEqual([{ file: a, pages: [expect.any(String)] }]);
    const ops = join(dir, "ops.jsonl");
    writeFileSync(
      ops,
      [
        rectOp("$page:0"),
        { type: "SetText", page: "$page:0", id: null, x: 300, y: 300, content: "Bonjour", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 },
        { type: "CommitStroke", page: "$page:0", points: [100, 500, 0.5, 200, 520, 0.5, 300, 500, 0.5], style: { color: "#dc2626", width: 4 } },
        { op: "undo" },
        { op: "redo" },
        { type: "Transform", ids: ["$1"], matrix: [1, 0, 0, 1, 50, 0] },
        { type: "Delete", ids: ["$2"] },
      ].map((o) => JSON.stringify(o)).join("\r\n") + "\r\n",
    );
    const run = memoryIO();
    expect(await main(["run", a, "--ops", ops, "--save"], run)).toBe(0);
    const lines = run.json();
    expect(lines.map((l: Json) => [l.op, l.ok])).toEqual([[1, true], [2, true], [3, true], [4, true], [5, true], [6, true], [7, true]]);
    const st = memoryIO();
    expect(await main(["state", a], st)).toBe(0);
    const [state] = st.json();
    expect(state).toMatchObject({ schema: "roomboard-cli/1", file: a, canUndo: false, canRedo: false });
    const els = state.pages[0].elements;
    expect(els.map((e: Json) => e.kind)).toEqual(["shape", "stroke"]);
    expect(els[0].transform).toEqual([1, 0, 0, 1, 60, 20]);
  });
});

describeWasm("S2 — pages et onglets", () => {
  it("S2 — AddPage, RemovePage, tab.new, rectangle dans t2, deux fichiers relus", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    const b = join(dir, "b.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const io = memoryIO(
      [
        { type: "AddPage", after: "$page:0" },
        { type: "RemovePage", page: "$page:0" },
        { op: "tab.new" },
        rectOp("$page:0", 60, 60),
        { op: "save", to: b },
        { op: "tab.select", tab: "$tab:0" },
        { op: "save" },
      ].map((o) => JSON.stringify(o)),
    );
    expect(await main(["run", a, "--ops", "-"], io)).toBe(0);
    const lines = io.json();
    expect(lines.map((l: Json) => l.op)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(lines[2].tabs).toEqual([{ id: "t1", file: a, active: false }, { id: "t2", file: null, active: true }]);
    expect(lines[4].file).toBe(b);
    const added = lines[0].change.pages[0];
    const sa = memoryIO();
    expect(await main(["state", a], sa)).toBe(0);
    expect(sa.json()[0].pages.map((p: Json) => [p.page.id, p.elements.length])).toEqual([[added, 0]]);
    const sb = memoryIO();
    expect(await main(["state", b], sb)).toBe(0);
    expect(sb.json()[0].pages.map((p: Json) => p.elements.map((e: Json) => e.kind))).toEqual([["shape"]]);
  });
  it("S2 — RemovePage de la dernière page : code 1, fichier inchangé (run --save puis apply)", async () => {
    const a = join(tmpDir(), "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const before = readFileSync(a);
    const remove = JSON.stringify({ type: "RemovePage", page: "$page:0" });
    const err = { code: "command", message: "la dernière page ne se supprime pas" };
    const io = memoryIO([remove]);
    expect(await main(["run", a, "--save"], io)).toBe(1);
    expect(io.json()).toEqual([{ op: 1, ok: false, error: err }]);
    expect(io.errors()).toEqual([{ error: err }]);
    expect(readFileSync(a).equals(before)).toBe(true);
    const ap = memoryIO();
    expect(await main(["apply", a, remove], ap)).toBe(1);
    expect(readFileSync(a).equals(before)).toBe(true);
  });
});

describeWasm("run et apply : entrées, usages, sortie", () => {
  it("run - : lignes vides ignorées, CRLF accepté, une ligne par opération", async () => {
    const io = memoryIO(["", '{"op":"tab.list"}\r', "   "]);
    expect(await main(["run", "--new", "--ops", "-"], io)).toBe(0);
    expect(io.json()).toEqual([{ op: 1, ok: true, tabs: [{ id: "t1", file: null, active: true }] }]);
  });
  it("usages : run sans fichier ni --new, fichier et --new, --new --save sans --out, option inconnue, ligne non JSON", async () => {
    for (const argv of [["run"], ["run", "a.roomboard", "--new"], ["run", "--new", "--save"], ["state", "a.roomboard", "--bidule"], ["new"]]) {
      const io = memoryIO();
      expect(await main(argv, io)).toBe(2);
      expect(io.errors()[0].error.code).toBe("usage");
    }
    const bad = memoryIO(["{pas du json"]);
    expect(await main(["run", "--new"], bad)).toBe(2);
    expect(bad.json()).toEqual([{ op: 1, ok: false, error: expect.objectContaining({ code: "usage" }) }]);
  });
  it("apply enregistre à --out et laisse la source ; state d'un fichier absent : code 1", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    const out = join(dir, "out.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const before = readFileSync(a);
    const io = memoryIO();
    expect(await main(["apply", a, JSON.stringify(rectOp("$page:0")), "--out", out], io)).toBe(0);
    expect(io.json()[0]).toMatchObject({ op: 1, ok: true });
    expect(readFileSync(a).equals(before)).toBe(true);
    const st = memoryIO();
    expect(await main(["state", out], st)).toBe(0);
    expect(st.json()[0].pages[0].elements).toHaveLength(1);
    const missing = memoryIO();
    expect(await main(["state", join(dir, "absent.roomboard")], missing)).toBe(1);
    expect(missing.errors()[0].error.code).toBe("io");
  });
});
```

Lancer : `cd $WT && nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/main.test.ts 2>&1 | tail -8`.
Attendu : `FAIL` sur les blocs S1, S2, run et apply (commande inconnue : code 2 au lieu de 0).

Remplacer `apps/cli/src/main.ts` en entier par :

```ts
/**
 * Ligne de commande de RoomBoard (cadrage cli, DA2) : une commande, ses arguments, une ligne JSON par résultat sur
 * stdout, une ligne `{"error":…}` sur stderr en échec ; code de sortie 0, 1, 2 ou 3 (D9). Table des commandes : clés
 * propres seulement (`toString`, `__proto__` sont des usages inconnus). `run` s'arrête à la première opération refusée
 * (H4) ; le fichier n'est écrit que par `save`, `--save` ou `--out` en fin de session réussie.
 */
import { APP_VERSION } from "../../web/src/platform/controller";
import { flagStr, parseArgs } from "./args";
import { asCliError, CLI_VERSION, CliError, SCHEMA, usage, type CliIO } from "./contract";
import { readBytes } from "./disk";
import { formatRows } from "./formats";
import { nodeSession, type Session } from "./session";
import { stateOf } from "./state";
import { loadCore } from "./wasm-node";

type Handler = (args: readonly string[], io: CliIO) => Promise<number>;

const USAGE = {
  version: "version",
  formats: "formats",
  new: "new <sortie.roomboard>",
  state: "state <fichier.roomboard> [--page <id>] [--points]",
  run: "run <fichier.roomboard | --new> [--ops <fichier.jsonl> | -] [--save] [--out <fichier>]",
  apply: "apply <fichier.roomboard> '<opération JSON>' [--out <fichier>]",
} as const;

const none = (args: readonly string[], name: keyof typeof USAGE): void => {
  if (args.length > 0) throw usage(USAGE[name]);
};

const linesOf = (bytes: Uint8Array): string[] => new TextDecoder().decode(bytes).split(/\r?\n/);

/** Joue les lignes (vides ignorées) ; la première refusée est écrite sur stdout, puis levée (stderr et code par `main`). */
async function play(session: Session, lines: AsyncIterable<string> | Iterable<string>, io: CliIO): Promise<void> {
  let n = 0;
  for await (const raw of lines) {
    const line = raw.trim();
    if (line === "") continue;
    n++;
    try {
      io.out(JSON.stringify(await session.exec(line)));
    } catch (e) {
      const err = asCliError(e, "command");
      io.out(JSON.stringify({ op: n, ok: false, error: err, ...err.detail }));
      throw err;
    }
  }
}

const COMMANDS: Readonly<Record<string, Handler>> = {
  version: async (args, io) => {
    none(args, "version");
    const core = await loadCore(io.wasmDir);
    io.out(JSON.stringify({ cli: CLI_VERSION, core: core.version(), app: APP_VERSION, schema: SCHEMA }));
    return 0;
  },
  formats: async (args, io) => {
    none(args, "formats");
    io.out(JSON.stringify({ formats: formatRows() }));
    return 0;
  },
  new: async (args, io) => {
    const p = parseArgs(args, {});
    const out = p.positional[0];
    if (out === undefined || p.positional.length !== 1) throw usage(USAGE.new);
    const session = await nodeSession(io);
    const tab = session.newTab().session;
    await session.save(tab, out);
    io.out(JSON.stringify({ file: out, pages: tab.doc.pageIds() }));
    return 0;
  },
  state: async (args, io) => {
    const p = parseArgs(args, { "--page": "value", "--points": "bool" });
    const file = p.positional[0];
    if (file === undefined || p.positional.length !== 1) throw usage(USAGE.state);
    const session = await nodeSession(io);
    const read = await session.readDoc(file, "document");
    io.out(JSON.stringify(stateOf(read.doc, file, { page: flagStr(p, "--page"), points: p.flags.has("--points") })));
    return 0;
  },
  run: async (args, io) => {
    const p = parseArgs(args, { "--new": "bool", "--ops": "value", "--save": "bool", "--out": "value" });
    const isNew = p.flags.has("--new");
    const file = p.positional[0];
    if (p.positional.length > 1 || isNew === (file !== undefined)) throw usage(USAGE.run);
    const out = flagStr(p, "--out");
    const save = p.flags.has("--save") || out !== undefined;
    if (save && isNew && out === undefined) throw new CliError("usage", "run --new --save : --out <fichier> exigé");
    const ops = flagStr(p, "--ops");
    const lines = ops === undefined || ops === "-" ? io.lines() : linesOf(await readBytes(ops));
    const session = await nodeSession(io);
    if (file === undefined) {
      session.newTab();
    } else {
      await session.open(file);
    }
    await play(session, lines, io);
    if (save) await session.save(session.active(), out ?? null);
    return 0;
  },
  apply: async (args, io) => {
    const p = parseArgs(args, { "--out": "value" });
    const [file, op] = p.positional;
    if (file === undefined || op === undefined || p.positional.length !== 2) throw usage(USAGE.apply);
    const session = await nodeSession(io);
    await session.open(file);
    await play(session, [op], io);
    await session.save(session.active(), flagStr(p, "--out") ?? file);
    return 0;
  },
};

export async function main(argv: readonly string[], io: CliIO): Promise<number> {
  const [name, ...rest] = argv;
  try {
    const handler = name !== undefined && Object.hasOwn(COMMANDS, name) ? COMMANDS[name] : undefined;
    if (handler === undefined) {
      throw new CliError("usage", `commande inconnue : ${name ?? "(aucune)"} ; commandes : ${Object.keys(COMMANDS).join(", ")}`);
    }
    return await handler(rest, io);
  } catch (e) {
    const err = asCliError(e);
    io.err(JSON.stringify({ error: err }));
    return err.exit;
  }
}
```

Note : un échec de `play` écrit la ligne d'opération sur stdout puis l'erreur sur stderr (une fois, par `main`).

- [ ] **Étape 10 : typage.** `cd $WT && nice -n 10 pnpm --filter @roomboard/cli exec tsc --noEmit 2>&1 | tail -10`.
  Attendu : aucune sortie, code 0.

- [ ] **Étape 11 : preuve des tests (commande bornée).**

```bash
cd $WT && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -50
```

Attendu : `Test Files  7 passed (7)`, `Tests  N passed (N)` avec N ≥ 35, les deux lignes S1 et S2 nommées dans
« Test et commande bornée », aucun `×` ni `FAIL`.

- [ ] **Étape 12 : essai réel par le binaire.**

```bash
cd $WT && nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -3 && D=$(mktemp -d "$WT/.essai-T2-XXXX") \
  && node apps/cli/dist/roomboard.mjs new "$D/a.roomboard" \
  && printf '%s\n' '{"type":"AddShape","page":"$page:0","shape":"rect","x0":10,"y0":20,"x1":110,"y1":220,"style":{"color":"#1e40af","width":4},"fill":null}' '{"op":"undo"}' '{"op":"redo"}' '{"op":"save"}' | node apps/cli/dist/roomboard.mjs run "$D/a.roomboard" --ops - \
  && node apps/cli/dist/roomboard.mjs state "$D/a.roomboard" | head -c 300; echo \
  ; node apps/cli/dist/roomboard.mjs apply "$D/a.roomboard" '{"type":"RemovePage","page":"$page:0"}'; echo "code=$?"; rm -rf "$D"
```

Attendu : quatre lignes `{"op":n,"ok":true,…}` ; un état `{"schema":"roomboard-cli/1",…` avec un élément `shape` ;
`{"op":1,"ok":false,…}` puis `{"error":{"code":"command","message":"la dernière page ne se supprime pas"}}` et `code=1`.

- [ ] **Étape 13 : commit.**

```bash
cd $WT && git add apps/cli/src/disk.ts apps/cli/src/ops.ts apps/cli/src/state.ts apps/cli/src/session.ts apps/cli/src/main.ts apps/cli/src/disk.test.ts apps/cli/src/ops.test.ts apps/cli/src/session.test.ts apps/cli/src/main.test.ts \
  && git status --short \
  && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(cli): add JSONL session, tabs, references, state schema, new/state/run/apply" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T3 — Import et export : `measureOrFallback`, cible sans écran, `import`, `export`, `state` d'un `.rbitem`

<a id="tache-t3"></a>

**Objectif.** Extraire `measureOrFallback` (constat C11a fermé), poser la cible sans écran `headlessTarget`, brancher
`createImporter` avec des dépendances Node (`.roomboard` ouvert en onglet, PNG et JPEG par l'en-tête, `.xlsx` par le
lecteur du module formats), refuser en code 3 un format d'un lot non livré avant toute lecture, exporter des objets en
`.rbitem` par `extract` puis `io.encode`, lire un `.rbitem` par `state` ; opérations `import` et `export` dans une session
(cadrage D9, D10, D11, D12, D16, DA5 lot 1, H1, H2, H7, H9, H10, DA6 « T3 »).

**Fichiers.**
- Modifier : `apps/web/src/engine/text-layout.ts` (après `measureWith`), `apps/web/src/engine/text-layout.test.ts`
  (import en tête, bloc ajouté), `apps/web/src/main.ts:35` et `:214-215`, `apps/web/src/annotate-start.ts:14` et `:31-32`,
  `docs/architecture-constats.md:38`, `apps/cli/src/ops.ts` (`CLI_OPS`), `apps/cli/src/session.ts` (imports, deux cas),
  `apps/cli/src/main.ts` (imports, `USAGE`, `state`, deux commandes).
- Créer : `apps/cli/src/target.ts`, `apps/cli/src/importer.ts`, `apps/cli/src/exporter.ts`.
- Tests : `apps/cli/src/target.test.ts`, `apps/cli/src/import.test.ts`, `apps/cli/src/export.test.ts`.

**Interfaces.**
- Consomme (T1, T2) : `CliError`, `asCliError`, `usage`, `CliIO` (`contract.ts`) ; `parseArgs`, `flagStr` (`args.ts`) ;
  `extOf`, `importBlocked`, `exportBlocked`, `unsupportedMessage` (`formats.ts`) ; `readBytes`, `writeAtomic` (`disk.ts`) ;
  `CLI_OPS`, `optString`, `needString` (`ops.ts`) ; `Session`, `CliTab`, `nodeSession`, `session.deps.{io, notices, formats, now}`,
  `session.openBytes`, `session.open`, `session.save`, `session.readDoc`, `session.active` (`session.ts`) ; `stateOf`
  (`state.ts`) ; `memoryIO`, `tmpDir`, `pngBytes`, `normalizeIds`, `XLSX_FIXTURE`, `describeWasm`, `Json` (`testing.ts`).
- Produit :
  - `apps/web/src/engine/text-layout.ts` : `FALLBACK_CHAR_WIDTH = 0.6`, `measureOrFallback(ctx: CanvasRenderingContext2D | null): Measure`.
  - `target.ts` : `SCENE: StageRect` (`{ left: 0, top: 0, width: 1920, height: 1080 }`), `headlessTarget(tab: CliTab, page: string, notices: string[]): ImageTarget`.
  - `importer.ts` : `nodeDecode: ImageDecoder`, `nodeFile(path: string, bytes: Uint8Array): DroppedFile`,
    `atOf(x: unknown, y: unknown): Point`, `parseAt(text: string): Point`, `checkSources(sources: readonly string[]): void`,
    `interface ImportRequest { sources: readonly string[]; page?: string; at?: Point | null }`,
    `interface ImportResult extends ImportReport { notices: readonly string[] }`,
    `importInto(session: Session, req: ImportRequest): Promise<ImportResult>`, `partialMessage(r: ImportReport): string`.
  - `exporter.ts` : `checkExportTarget(to: string): void`,
    `interface ExportRequest { to: string; page?: string; ids?: readonly string[]; name?: string }`,
    `exportFragment(session: Session, req: ExportRequest): Promise<{ file: string; kind: "fragment"; elements: number }>`.
  - Opérations de session : `{"op":"import","files":[…],"page"?:id,"at"?:[x,y]}` → rapport d'import ;
    `{"op":"export","to":"x.rbitem","page"?:id,"ids"?:[…]}` → `{file, kind, elements}`. Import partiel dans une session :
    `CliError` command dont `detail` porte le rapport (ligne `{"op":n,"ok":false,"error":…,"opened":…,…}`), arrêt, code 1.
  - Commandes `import`, `export` ; `state` lit un `.rbitem` (`readDoc(file, "fragment")`).
- Réutilise : `apps/web/src/platform/import.ts:332` — `createImporter(deps).importFiles(files, at)` (seule chaîne des fichiers, U23).
- Réutilise : `apps/web/src/platform/image-import.ts:100` — `probeSize(blob, kind)` dans le `decode` passé à `createImporter`.
- Réutilise : `apps/web/src/platform/sheet-reader.ts:48` — `gridOf(mod.SheetReader.open(bytes))` dans `readSheet` (sans Worker, D16).
- Réutilise : `apps/web/src/platform/table-insert.ts:47` — `insertTableGrid`, appelé par `sheetHandler` (aucun appel direct).
- Réutilise : `ImageTarget` (`apps/web/src/platform/image-import.ts:180-198`), `IDENTITY` (`apps/web/src/engine/camera.ts:12`),
  `PAGE_WIDTH`/`PAGE_HEIGHT` (`apps/web/src/core/api.ts:444-445`), `DEFAULT_PEN_STYLE` (`apps/web/src/engine/engine.ts:180`),
  `DEFAULT_TEXT_SIZE` (`apps/web/src/engine/text-layout.ts:11`) — nouveau module `apps/cli/src/target.ts` (`headlessTarget`).
- Réutilise : `apps/web/src/engine/text-layout.ts:30` — `measureWith(ctx)`, étendu par `measureOrFallback(ctx)` (D11).
- Réutilise : cœur `extract` (`apps/web/src/core/api.ts:381`) et `apps/web/src/app/container-io.ts:85` —
  `doc.extract(page, ids)` puis `io.encode(frag, assets, now, APP_VERSION, { kind: "fragment", name })` ; écart connu avec
  `encodeSelection` (`apps/web/src/app/fragments.ts:147-160`, non appelable sans `TabSession`), fermé au lot 2 (D12).
- Réutilise : `apps/web/src/app/fragments.ts:26-56` — `createFragmentOps<T>` et le port `FragmentTab` : **lot 2, non
  touché ici** (insertion `.rbitem`, export de grille, DA5) ; `fragments.ts` et `workspace.ts` restent inchangés.
- Réutilise : `apps/web/src/app/container-io.ts:85` — `read(name, bytes, "fragment", path)` par `session.readDoc` pour
  `state x.rbitem` (H9).
- Réutilise : `apps/web/src/app/tabs.ts` — `MAX_TABS` pour `full()` de l'importeur.

**Test et commande bornée.**
- Tests web : `text-layout.test.ts` (+2). Tests CLI : `target.test.ts` (2), `import.test.ts` (5), `export.test.ts` (3).
- Commandes : étapes 12 et 13 ; motifs : CLI `Test Files  10 passed (10)`, `Tests  N passed` avec N ≥ 46, lignes
  `✓ src/import.test.ts > S3 — images et classeur > S3 — import image.png valeurs.xlsx --at 400,300 : deux insérés, image aux dimensions PNG, tableau du classeur`
  et `✓ src/export.test.ts > S4 — export .rbitem relu > S4 — export --all puis state du .rbitem : mêmes sortes, styles, géométries et assets, ids mis à part` ;
  web `Tests  N passed` avec N ≥ 3083 et aucun `failed`.
- Tests à garder verts (cadrage 3.7) : `apps/web/src/app/fragments.test.ts`, `apps/web/src/app/workspace.test.ts`,
  `apps/web/src/core/wasm-core.contract.test.ts`, `apps/web/src/platform/import.test.ts` (étape 13).
- Effet de bord (cadrage « Effets de bord ») : `main.ts` et `annotate-start.ts` passent par `measureOrFallback` → test neuf
  de `text-layout.test.ts` et `node scripts/essais/c11a-annotation-navigateur.mjs` (étape 14).

**Preuve visuelle.** Aucune nouvelle interface ; le rendu de la page web ne doit pas bouger (essai C11a, étape 14).

**Contraintes (recopiées de Global Constraints).**
- GC1 — Les deux modules Wasm ne changent pas d'un octet ; aucun code Rust modifié.
- GC2 — Aucun seuil baissé ou relevé, aucun test désactivé ou sauté (hors le saut existant sans `.wasm`, levé par
  `ROOMBOARD_WASM_REQUIRED=1`).
- GC3 — Aucune dépendance nouvelle ; `pnpm install --frozen-lockfile` doit passer.
- GC4 — Builds et tests en `nice -n 10`, cargo `-j 4` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC5 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais finissant par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; jamais `git add -A` / `.` / `commit -a` ; ni push, ni tag,
  ni release, ni merge.
- GC6 — Fichiers temporaires dans le worktree ou `~/.cache/tmp/of1-*`.
- GC7 — Préparation : `pnpm install --frozen-lockfile` ; colle Wasm construite comme `scripts/verifier.sh`.
- GC8 — Rien dans `roomboard-prive` ni dans la coque Tauri ; aucune installation système, aucun `tauri build`.
- GC9 — La colle wasm-bindgen n'est chargée que par `apps/cli/src/wasm-node.ts`.
- GC10 — Format `.roomboard` et `.rbitem` inchangés : écrits par les fonctions existantes du conteneur.
- GC11 — stdout : une ligne JSON par résultat ; stderr : `{"error":{"code":…,"message":…}}` ; codes 0, 1, 2, 3.

**Patron à ne pas reprendre (concepteur-critique).**
- Appeler `doc.apply({ type: "AddImage" | "ImportTable", … })` depuis la CLI, recalculer `placement`, `anchorOf` ou les
  hauteurs de lignes : tout passe par `createImporter`, qui appelle `imageHandler` et `sheetHandler` → `insertTableGrid`.
  Parité exigée avec la cible de la page : `apps/web/src/app/workspace.ts:353-363` (`imageTarget`) et
  `apps/web/src/platform/image-import.ts:201-259` (`imageHandler`) ; la CLI ne change que la scène (fixe, H7), la mesure
  (repli, H1) et le décodeur (en-tête, H2).
- Reconnaître les formats à la main (extension → lecteur) : la table `FORMAT_LOTS` ne sert qu'au code 3 avant
  l'importeur ; la reconnaissance reste celle du registre (`apps/web/src/platform/import.ts:332-370`).
- Recoder l'écriture d'un fragment (ZIP, manifeste) : `io.encode(…, { kind: "fragment", name })`
  (`apps/web/src/app/container-io.ts:130-146`), qui refuse un fragment dont une image manque au magasin.

**Interdits.**
- Ne pas toucher `apps/web/src/app/fragments.ts` ni `apps/web/src/app/workspace.ts` (lot 2, DA5).
- Ne pas changer le comportement de la page : `main.ts` et `annotate-start.ts` gardent la même mesure et le même repli.
- Ne jamais ajouter le lien `target` ni `apps/cli/dist/` au commit.

**Terminé quand.** CLI : 10 fichiers de test verts sous `ROOMBOARD_WASM_REQUIRED=1` ; web : suite entière verte et
`pnpm --filter @roomboard/web build` à 0 ; essai réel de l'étape 15 conforme ; le rapport contient
`Réutilisation : appelé createImporter`, `Réutilisation : appelé probeSize`, `Réutilisation : appelé gridOf`,
`Réutilisation : appelé insertTableGrid (par sheetHandler)`, `Réutilisation : appelé measureWith (étendu en measureOrFallback)`,
`Réutilisation : écart — encodeSelection non appelable sans TabSession (D12), fermé au lot 2`, et le résultat de l'essai
C11a (code 0, ou code 2 « outil absent » noté pour la clôture).

**Étapes.**

- [ ] **Étape 1 : préparation du worktree** (créé depuis `feat/cli` après la fusion de T2 ; s'il en est donné un autre,
  remplacer `WT`).

```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
WT=/home/adminjd/projets/roomboard-wt/cli--T3
cd $WT
[ -e target ] || ln -s /home/adminjd/projets/roomboard-wt/cli/target target   # cache cargo partagé, jamais ajouté
pnpm install --frozen-lockfile
nice -n 10 cargo build -j 4 -p roomboard-wasm --target wasm32-unknown-unknown --release
rm -rf apps/web/src/wasm
wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm
nice -n 10 cargo build -j 4 -p roomboard-formats-wasm --target wasm32-unknown-unknown --release
rm -rf apps/web/src/wasm-formats
wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm
pnpm exec wasm-opt -Oz apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm -o apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm
ls apps/cli/src/session.ts apps/web/src/wasm/roomboard_wasm_bg.wasm apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm
```

- [ ] **Étape 2 : test rouge de `measureOrFallback`.** Dans `apps/web/src/engine/text-layout.test.ts`, ajouter
  `measureOrFallback` à la liste importée de `./text-layout` (ligne 2), puis ajouter à la fin du fichier :

```ts
describe("measureOrFallback (D11, constat C11a)", () => {
  it("sans contexte 2D : 0,6 × taille par unité UTF-16", () => {
    expect(measureOrFallback(null)("abcd", 10)).toBeCloseTo(24);
  });
  it("avec un contexte : la police du rendu puis measureText, comme measureWith", () => {
    const fonts: string[] = [];
    const ctx = {
      set font(f: string) {
        fonts.push(f);
      },
      measureText: (t: string) => ({ width: t.length * 7 }),
    } as unknown as CanvasRenderingContext2D;
    expect(measureOrFallback(ctx)("abc", 24, { bold: true })).toBe(21);
    expect(fonts).toEqual([textFont(24, { bold: true })]);
  });
});
```

Lancer : `cd $WT && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/text-layout.test.ts 2>&1 | tail -6`.
Attendu : `FAIL` (`measureOrFallback is not a function` ou export absent).

- [ ] **Étape 3 : `measureOrFallback` et ses deux appelants.** Dans `apps/web/src/engine/text-layout.ts`, juste après la
  fonction `measureWith`, ajouter :

```ts
/** Largeur d'un caractère du repli sans contexte 2D, en fraction de la taille (D11). */
export const FALLBACK_CHAR_WIDTH = 0.6;

/** Mesure par `ctx` s'il existe, sinon le repli `0,6 × taille × longueur` : amorces sans toile et CLI (D11). */
export const measureOrFallback = (ctx: CanvasRenderingContext2D | null): Measure =>
  ctx ? measureWith(ctx) : (text, size) => text.length * size * FALLBACK_CHAR_WIDTH;
```

Dans `apps/web/src/main.ts`, remplacer la ligne 35 `import { measureWith, type Measure } from "./engine/text-layout";`
par `import { measureOrFallback } from "./engine/text-layout";` et la ligne 215
`  const measure: Measure = measureCtx ? measureWith(measureCtx) : (s, size) => s.length * size * 0.6;` par
`  const measure = measureOrFallback(measureCtx);`. Vérifier d'abord par
`grep -n "measureWith\|\bMeasure\b" apps/web/src/main.ts` qu'aucun autre usage n'existe (sinon garder `type Measure`).

Dans `apps/web/src/annotate-start.ts`, mêmes remplacements : ligne 14 → `import { measureOrFallback } from "./engine/text-layout";`,
ligne 32 → `  const measure = measureOrFallback(measureCtx);` (même vérification par `grep`).

Dans `docs/architecture-constats.md`, ligne 38 (constat C11a, `apps/web/src/annotate-start.ts:32`), remplacer la
dernière cellule `| ouvert |` par `| fermé <date> cli |`, où `<date>` est la sortie de `date +%F`.

Relancer la commande de l'étape 2. Attendu : tous les tests de `text-layout.test.ts` verts, dont les 2 neufs.

- [ ] **Étape 4 : tests rouges de la cible.** Créer `apps/cli/src/target.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { CoreDocument } from "../../web/src/core/api";
import { createAssetStore } from "../../web/src/core/asset-store";
import { IDENTITY } from "../../web/src/engine/camera";
import { headlessTarget, SCENE } from "./target";

describe("headlessTarget (DA5, H7)", () => {
  it("scène fixe 1920 × 1080, caméra identité, style du stylo, mesure de repli", () => {
    const doc = { apply: () => ({ pages: [], ids: ["e"], removed: [], full: false, version: 1 }) } as unknown as CoreDocument;
    const t = headlessTarget({ doc, assets: createAssetStore(), file: null }, "p1", []);
    expect(t.page()).toBe("p1");
    expect(t.camera()).toBe(IDENTITY);
    expect(t.stageRect()).toEqual({ left: 0, top: 0, width: 1920, height: 1080 });
    expect(SCENE).toEqual(t.stageRect());
    expect(t.textStyle()).toEqual({ color: "#000000", size: 36 });
    expect(t.measure()("abcd", 10)).toBeCloseTo(24);
    expect(t.insertFragment).toBeUndefined();
  });
  it("refus du cœur : run rend null et l'avis est gardé", () => {
    const doc = {
      apply: () => {
        throw new Error("page inconnue");
      },
    } as unknown as CoreDocument;
    const notices: string[] = [];
    const t = headlessTarget({ doc, assets: createAssetStore(), file: null }, "p1", notices);
    expect(t.run({ type: "Delete", ids: [] })).toBeNull();
    expect(notices).toEqual(["page inconnue"]);
  });
});
```

Lancer : `cd $WT && nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/target.test.ts 2>&1 | tail -6`.
Attendu : `FAIL` (`./target` introuvable).

- [ ] **Étape 5 : `target.ts`.** Créer `apps/cli/src/target.ts` :

```ts
/**
 * Cible sans écran des objets importés (cadrage cli, DA5 lot 1, H7) : la même interface `ImageTarget` que l'onglet de la
 * page (`workspace.ts`, `imageTarget`), sur une scène fixe 1920 × 1080 à l'origine et une caméra identité : un point
 * `--at x,y` est un point monde de la page. Mesure de repli (H1), style du stylo par défaut (même règle que
 * `engine.ts`, `textStyle`). `insertFragment` absent au lot 1 (insertion `.rbitem` au lot 2).
 */
import type { Command } from "../../web/src/core/api";
import { PAGE_HEIGHT, PAGE_WIDTH } from "../../web/src/core/api";
import { IDENTITY } from "../../web/src/engine/camera";
import { DEFAULT_PEN_STYLE } from "../../web/src/engine/engine";
import { DEFAULT_TEXT_SIZE, measureOrFallback } from "../../web/src/engine/text-layout";
import { messageOf } from "../../web/src/platform/controller";
import type { ImageTarget, StageRect } from "../../web/src/platform/image-import";
import type { CliTab } from "./session";

export const SCENE: StageRect = Object.freeze({ left: 0, top: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT });

export function headlessTarget(tab: CliTab, page: string, notices: string[]): ImageTarget {
  return {
    assets: tab.assets,
    page: () => page,
    camera: () => IDENTITY,
    stageRect: () => SCENE,
    measure: () => measureOrFallback(null),
    textStyle: () => ({ color: DEFAULT_PEN_STYLE.color, size: DEFAULT_TEXT_SIZE }),
    run: (cmd: Command) => {
      try {
        return tab.doc.apply(cmd);
      } catch (e) {
        notices.push(messageOf(e));
        return null;
      }
    },
  };
}
```

Relancer la commande de l'étape 4. Attendu : `Tests  2 passed (2)`. Si `engine/engine.ts` touche au DOM à son
chargement sous Node (exception à l'import), le dire au rapport et importer `DEFAULT_PEN_STYLE` tel quel reste la
règle : ne pas recopier la couleur.

- [ ] **Étape 6 : tests rouges de l'import.** Créer `apps/cli/src/import.test.ts` :

```ts
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { main } from "./main";
import { describeWasm, memoryIO, pngBytes, tmpDir, XLSX_FIXTURE, type Json } from "./testing";

async function board(): Promise<{ dir: string; a: string }> {
  const dir = tmpDir();
  const a = join(dir, "a.roomboard");
  expect(await main(["new", a], memoryIO())).toBe(0);
  return { dir, a };
}

describeWasm("S3 — images et classeur", () => {
  it("S3 — import image.png valeurs.xlsx --at 400,300 : deux insérés, image aux dimensions PNG, tableau du classeur", async () => {
    const { dir, a } = await board();
    const png = join(dir, "image.png");
    const xlsx = join(dir, "valeurs.xlsx");
    writeFileSync(png, pngBytes(40, 30));
    copyFileSync(XLSX_FIXTURE, xlsx);
    const io = memoryIO();
    expect(await main(["import", a, png, xlsx, "--at", "400,300"], io)).toBe(0);
    const [report] = io.json();
    expect(report).toMatchObject({ opened: [], inserted: ["image.png", "valeurs.xlsx"], refused: [], failed: [] });
    expect(report.notices).toContain("valeurs.xlsx : tableau limité à 64 lignes et 64 colonnes (le fichier en a 70 × 6)");
    const st = memoryIO();
    expect(await main(["state", a], st)).toBe(0);
    const [state] = st.json();
    const [image, table] = state.pages[0].elements;
    expect(image.kind).toBe("image");
    expect([image.image.w, image.image.h]).toEqual([40, 30]);
    expect(image.transform).toEqual([1, 0, 0, 1, 380, 285]);
    expect(state.assets).toEqual([expect.objectContaining({ id: image.image.asset, name: "image.png", mime: "image/png" })]);
    expect(table.kind).toBe("table");
    expect([table.table.cols.length, table.table.rows.length]).toEqual([6, 64]);
    expect(table.table.cells.slice(0, 2).map((c: Json) => c.text)).toEqual(["texte", "42"]);
  });
  it("import doc.pdf : code 3 « lot 3 », rien lu ni écrit", async () => {
    const { dir, a } = await board();
    const pdf = join(dir, "doc.pdf");
    writeFileSync(pdf, "%PDF-1.4\n%%EOF\n");
    const before = readFileSync(a);
    const io = memoryIO();
    expect(await main(["import", a, pdf], io)).toBe(3);
    expect(io.stdout).toEqual([]);
    expect(io.errors()[0].error.code).toBe("unsupported");
    expect(io.errors()[0].error.message).toContain("lot 3");
    expect(readFileSync(a).equals(before)).toBe(true);
  });
  it("--at hors de la scène (5000,10) ou mal formé : code 2 avant tout import", async () => {
    const { dir, a } = await board();
    const png = join(dir, "image.png");
    writeFileSync(png, pngBytes(4, 4));
    for (const at of ["5000,10", "10", "a,b", ",3"]) {
      const io = memoryIO();
      expect(await main(["import", a, png, "--at", at], io)).toBe(2);
      expect(io.errors()[0].error.code).toBe("usage");
    }
  });
  it("source d'extension inconnue (notes.txt) : refusée, code 1, fichier inchangé", async () => {
    const { dir, a } = await board();
    const txt = join(dir, "notes.txt");
    writeFileSync(txt, "bonjour");
    const before = readFileSync(a);
    const io = memoryIO();
    expect(await main(["import", a, txt], io)).toBe(1);
    expect(io.json()[0]).toMatchObject({ inserted: [], refused: ["notes.txt"] });
    expect(io.errors()[0].error.code).toBe("command");
    expect(readFileSync(a).equals(before)).toBe(true);
  });
  it("run : op import (at) puis op export dans la même session", async () => {
    const { dir, a } = await board();
    const png = join(dir, "image.png");
    const frag = join(dir, "objet.rbitem");
    writeFileSync(png, pngBytes(8, 6));
    const io = memoryIO([JSON.stringify({ op: "import", files: [png], at: [400, 300] }), JSON.stringify({ op: "export", to: frag })]);
    expect(await main(["run", a, "--save"], io)).toBe(0);
    const [imp, exp] = io.json();
    expect(imp).toMatchObject({ op: 1, ok: true, inserted: ["image.png"] });
    expect(exp).toEqual({ op: 2, ok: true, file: frag, kind: "fragment", elements: 1 });
  });
});
```

Lancer : `cd $WT && nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/import.test.ts 2>&1 | tail -8`.
Attendu : `FAIL` (commande `import` inconnue : code 2 au lieu de 0, 3, 1).

- [ ] **Étape 7 : `importer.ts`.** Créer `apps/cli/src/importer.ts` :

```ts
/**
 * Import de la CLI (cadrage cli, D9, D10, D16, H2, H7, H10) : l'entrée unique `createImporter` avec des dépendances
 * Node ; une source d'un format reconnu mais d'un lot non livré sort en code 3 avant toute lecture ; images PNG et JPEG
 * à la taille de l'en-tête (`probeSize`, sans décodeur, EXIF non appliqué) ; classeur lu par la liaison du module formats
 * dans ce processus (`gridOf`, sans Worker : processus court, enregistrement atomique, D16) ; `.roomboard` ouvert en
 * onglet. Objets posés dans l'onglet actif au début de l'appel (R3), sur la page demandée ou la première.
 */
import { basename } from "node:path";
import { MAX_TABS } from "../../web/src/app/tabs";
import type { DroppedFile, Point } from "../../web/src/platform/files";
import type { TableGrid } from "../../web/src/platform/html-table";
import { probeSize, type ImageDecoder } from "../../web/src/platform/image-import";
import { createImporter, type ImportReport } from "../../web/src/platform/import";
import type { SheetFormatsBinding } from "../../web/src/platform/container";
import { gridOf } from "../../web/src/platform/sheet-reader";
import { CliError } from "./contract";
import { readBytes } from "./disk";
import { importBlocked, unsupportedMessage } from "./formats";
import type { Session } from "./session";
import { headlessTarget, SCENE } from "./target";

export interface ImportRequest {
  readonly sources: readonly string[];
  readonly page?: string | undefined;
  readonly at?: Point | null;
}
export interface ImportResult extends ImportReport {
  readonly notices: readonly string[];
}

/** Taille par l'en-tête (PNG, JPEG) ; tout autre format : illisible sans décodeur (lot 4). */
export const nodeDecode: ImageDecoder = async (blob, kind) => {
  const size = await probeSize(blob, kind);
  if (size === null) throw new Error(`image ${kind} : taille illisible sans décodeur (lot 4)`);
  return { bitmap: { close: () => undefined } as unknown as ImageBitmap, w: size.w, h: size.h };
};

export function nodeFile(path: string, bytes: Uint8Array): DroppedFile {
  return {
    name: basename(path),
    size: bytes.byteLength,
    mime: "",
    path,
    head: async (n) => bytes.subarray(0, n),
    blob: async () => new Blob([bytes as BlobPart]),
  };
}

/** Point monde de la scène fixe (H7) ; hors de 0..1920 × 0..1080, la page retomberait au centre sans avis : usage. */
export function atOf(x: unknown, y: unknown): Point {
  if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) {
    throw new CliError("usage", "--at : deux nombres x,y attendus");
  }
  if (x < 0 || x > SCENE.width || y < 0 || y > SCENE.height) {
    throw new CliError("usage", `--at ${x},${y} hors de la scène (0..${SCENE.width}, 0..${SCENE.height})`);
  }
  return { x, y };
}

export function parseAt(text: string): Point {
  const parts = text.split(",");
  if (parts.length !== 2 || parts.some((s) => s.trim() === "")) throw new CliError("usage", "--at : deux nombres x,y attendus");
  return atOf(Number(parts[0]), Number(parts[1]));
}

/** Code 3 avant toute lecture ni écriture (D9). */
export function checkSources(sources: readonly string[]): void {
  for (const s of sources) {
    const lot = importBlocked(s);
    if (lot !== null) throw new CliError("unsupported", unsupportedMessage(s, lot));
  }
}

export const partialMessage = (r: ImportReport): string =>
  `import partiel : ${[...r.refused.map((n) => `${n} (refusé)`), ...r.failed.map((n) => `${n} (en échec)`)].join(", ")}`;

async function readSheet(mod: SheetFormatsBinding, blob: Blob): Promise<TableGrid> {
  const reader = mod.SheetReader.open(new Uint8Array(await blob.arrayBuffer()));
  try {
    return gridOf(reader);
  } finally {
    reader.free();
  }
}

export async function importInto(session: Session, req: ImportRequest): Promise<ImportResult> {
  checkSources(req.sources);
  const tab = session.active();
  const pages = tab.doc.pageIds();
  const page = req.page ?? pages[0];
  if (page === undefined || !pages.includes(page)) throw new CliError("command", `page inconnue : ${req.page ?? "(aucune)"}`);
  const files = await Promise.all(req.sources.map(async (s) => nodeFile(s, await readBytes(s))));
  const { notices, formats } = session.deps;
  const before = notices.length;
  const importer = createImporter({
    openDocument: async (f) => (await session.openBytes(f.name, f.bytes, f.path ?? null)) !== null,
    notify: async (m) => {
      notices.push(m);
    },
    full: () => session.tabs.list().length >= MAX_TABS,
    target: () => headlessTarget(tab, page, notices),
    decode: nodeDecode,
    readSheet: async (blob) => readSheet(await formats(), blob),
  });
  const report = await importer.importFiles(files, req.at ?? null);
  return {
    opened: [...report.opened],
    inserted: [...report.inserted],
    refused: [...report.refused],
    failed: [...report.failed],
    notices: notices.slice(before),
  };
}
```

- [ ] **Étape 8 : `exporter.ts`.** Créer `apps/cli/src/exporter.ts` :

```ts
/**
 * Export d'objets en `.rbitem` (cadrage cli, D12) : `doc.extract(page, ids)` puis `io.encode(…, { kind: "fragment" })`,
 * deux interfaces existantes ; un fragment dont une image manque au magasin est refusé par le conteneur. Sans ids : toute
 * la page. Écart connu avec `encodeSelection` (`fragments.ts:147-160`, non appelable sans `TabSession`), fermé au lot 2.
 */
import { basename } from "node:path";
import type { CoreDocument } from "../../web/src/core/api";
import { APP_VERSION } from "../../web/src/platform/controller";
import { asCliError, CliError } from "./contract";
import { writeAtomic } from "./disk";
import { exportBlocked, extOf, unsupportedMessage } from "./formats";
import type { Session } from "./session";

export interface ExportRequest {
  readonly to: string;
  readonly page?: string | undefined;
  readonly ids?: readonly string[] | undefined;
  readonly name?: string | undefined;
}

/** `.rbitem` seul au lot 1 ; un format écrit plus tard : code 3 ; tout autre : usage. Avant toute lecture. */
export function checkExportTarget(to: string): void {
  if (extOf(to) === ".rbitem") return;
  const lot = exportBlocked(to);
  if (lot !== null) throw new CliError("unsupported", unsupportedMessage(to, lot));
  throw new CliError("usage", `export : ${basename(to)} : seul .rbitem est écrit par la CLI au lot 1`);
}

export async function exportFragment(session: Session, req: ExportRequest): Promise<{ file: string; kind: "fragment"; elements: number }> {
  checkExportTarget(req.to);
  const tab = session.active();
  const pages = tab.doc.pageIds();
  const page = req.page ?? pages[0];
  if (page === undefined || !pages.includes(page)) throw new CliError("command", `page inconnue : ${req.page ?? "(aucune)"}`);
  const ids = req.ids ?? tab.doc.elementIds(page);
  if (ids.length === 0) throw new CliError("command", "rien à exporter : aucun objet");
  let frag: CoreDocument;
  try {
    frag = tab.doc.extract(page, ids);
  } catch (e) {
    throw asCliError(e, "command");
  }
  try {
    const fp = frag.pageIds()[0];
    const elements = fp === undefined ? 0 : frag.elementIds(fp).length;
    const name = req.name ?? basename(req.to).replace(/\.rbitem$/i, "");
    let bytes: Uint8Array;
    try {
      bytes = await session.deps.io.encode(frag, tab.assets, session.deps.now(), APP_VERSION, { kind: "fragment", name });
    } catch (e) {
      throw asCliError(e, "command");
    }
    await writeAtomic(req.to, bytes);
    return { file: req.to, kind: "fragment", elements };
  } finally {
    frag.free();
  }
}
```

- [ ] **Étape 9 : opérations `import` et `export` de la session.** Dans `apps/cli/src/ops.ts`, remplacer la ligne
  `export const CLI_OPS = ["undo", "redo", "state", "save", "tab.new", "tab.open", "tab.select", "tab.close", "tab.list"] as const;`
  par :

```ts
export const CLI_OPS = ["undo", "redo", "state", "save", "import", "export", "tab.new", "tab.open", "tab.select", "tab.close", "tab.list"] as const;
```

Dans `apps/cli/src/session.ts`, ajouter aux imports :

```ts
import type { Point } from "../../web/src/platform/files";
import { exportFragment } from "./exporter";
import { atOf, importInto, partialMessage } from "./importer";
```

puis, dans `runCli`, juste avant `case "tab.new":`, ajouter (le `switch` reste exhaustif : `tsc` l'exige) :

```ts
      case "import": {
        const files = args["files"];
        if (!Array.isArray(files) || files.length === 0 || !files.every((f) => typeof f === "string")) {
          throw new CliError("usage", "files : liste de chemins attendue");
        }
        const at = args["at"];
        let point: Point | null = null;
        if (at !== undefined) {
          if (!Array.isArray(at) || at.length !== 2) throw new CliError("usage", "at : [x, y] attendu");
          point = atOf(at[0], at[1]);
        }
        const report = await importInto(session, { sources: files as string[], page: optString(args, "page"), at: point });
        if (report.failed.length + report.refused.length > 0) throw new CliError("command", partialMessage(report), { ...report });
        return { ...report };
      }
      case "export": {
        const ids = args["ids"];
        if (ids !== undefined && (!Array.isArray(ids) || !ids.every((i) => typeof i === "string"))) {
          throw new CliError("usage", "ids : liste d'ids attendue");
        }
        return { ...(await exportFragment(session, { to: needString(args, "to"), page: optString(args, "page"), ids: ids as string[] | undefined })) };
      }
```

`runCli` est appelé depuis `session.exec`, après la définition de `session` : la référence est valide à l'appel.

- [ ] **Étape 10 : commandes `import`, `export` et `state` d'un `.rbitem`.** Dans `apps/cli/src/main.ts` :
  - remplacer `import { formatRows } from "./formats";` par `import { extOf, formatRows } from "./formats";` et ajouter
    `import { checkExportTarget, exportFragment } from "./exporter";` et
    `import { checkSources, importInto, parseAt, partialMessage } from "./importer";` ;
  - dans `USAGE`, après `apply`, ajouter :

```ts
  import: "import <fichier.roomboard> <source>… [--page <id>] [--at x,y] [--out <fichier>]",
  export: "export <fichier.roomboard> <sortie.rbitem> [--page <id>] [--ids a,b | --all] [--name <nom>]",
```

  - dans la commande `state`, remplacer `const read = await session.readDoc(file, "document");` par
    `const read = await session.readDoc(file, extOf(file) === ".rbitem" ? "fragment" : "document");` et l'usage
    `state: "state <fichier.roomboard> [--page <id>] [--points]"` par `state: "state <fichier.roomboard | fichier.rbitem> [--page <id>] [--points]"` ;
  - dans `COMMANDS`, après `apply`, ajouter :

```ts
  import: async (args, io) => {
    const p = parseArgs(args, { "--page": "value", "--at": "value", "--out": "value" });
    const [file, ...sources] = p.positional;
    if (file === undefined || sources.length === 0) throw usage(USAGE.import);
    checkSources(sources); // code 3 avant toute lecture (D9)
    const atText = flagStr(p, "--at");
    const at = atText === undefined ? null : parseAt(atText); // code 2 avant tout import (H7)
    const session = await nodeSession(io);
    const tab = (await session.open(file)).session;
    const report = await importInto(session, { sources, page: flagStr(p, "--page"), at });
    if (report.inserted.length > 0) await session.save(tab, flagStr(p, "--out") ?? file);
    io.out(JSON.stringify(report));
    if (report.failed.length + report.refused.length > 0) throw new CliError("command", partialMessage(report)); // H10
    return 0;
  },
  export: async (args, io) => {
    const p = parseArgs(args, { "--page": "value", "--ids": "value", "--all": "bool", "--name": "value" });
    const [file, to] = p.positional;
    if (file === undefined || to === undefined || p.positional.length !== 2) throw usage(USAGE.export);
    const idsText = flagStr(p, "--ids");
    if (idsText !== undefined && p.flags.has("--all")) throw new CliError("usage", "--ids et --all s'excluent");
    checkExportTarget(to); // code 2 ou 3 avant toute lecture
    const session = await nodeSession(io);
    await session.open(file);
    const ids = idsText?.split(",").map((s) => s.trim()).filter((s) => s !== "");
    io.out(JSON.stringify(await exportFragment(session, { to, page: flagStr(p, "--page"), ids, name: flagStr(p, "--name") })));
    return 0;
  },
```

Relancer la commande de l'étape 6. Attendu : `Tests  5 passed (5)`. Si l'image est placée ailleurs que
`[1, 0, 0, 1, 380, 285]`, vérifier `SCENE` et la caméra (l'importeur seul calcule la matrice), jamais le test.

- [ ] **Étape 11 : tests de l'export (S4).** Créer `apps/cli/src/export.test.ts` :

```ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { main } from "./main";
import { describeWasm, memoryIO, normalizeIds, pngBytes, tmpDir, type Json } from "./testing";

describeWasm("S4 — export .rbitem relu", () => {
  it("S4 — export --all puis state du .rbitem : mêmes sortes, styles, géométries et assets, ids mis à part", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    const png = join(dir, "image.png");
    const frag = join(dir, "sel.rbitem");
    writeFileSync(png, pngBytes(40, 30));
    expect(await main(["new", a], memoryIO())).toBe(0);
    const ops = [
      { type: "AddShape", page: "$page:0", shape: "ellipse", x0: 10, y0: 20, x1: 110, y1: 220, style: { color: "#1e40af", width: 4 }, fill: "#fde68a" },
      { op: "import", files: [png], at: [600, 400] },
    ].map((o) => JSON.stringify(o));
    expect(await main(["run", a, "--save"], memoryIO(ops))).toBe(0);
    const sa = memoryIO();
    expect(await main(["state", a], sa)).toBe(0);
    const [stA] = sa.json();
    const page = stA.pages[0].page.id;
    const io = memoryIO();
    expect(await main(["export", a, frag, "--page", page, "--all"], io)).toBe(0);
    expect(io.json()).toEqual([{ file: frag, kind: "fragment", elements: 2 }]);
    const sf = memoryIO();
    expect(await main(["state", frag], sf)).toBe(0);
    const [stF] = sf.json();
    expect(stF.pages).toHaveLength(1);
    expect(stF.pages[0].elements.map((e: Json) => e.kind)).toEqual(["shape", "image"]);
    expect(normalizeIds(stF.pages[0].elements)).toEqual(normalizeIds(stA.pages[0].elements));
    expect(stF.assets).toEqual(stA.assets);
    expect(stF.pages[0].elements[0].id).not.toBe(stA.pages[0].elements[0].id);
  });
  it("export --ids d'un seul objet ; --ids et --all ensemble : code 2", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    const frag = join(dir, "un.rbitem");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const run = memoryIO([
      JSON.stringify({ type: "AddShape", page: "$page:0", shape: "rect", x0: 0, y0: 0, x1: 10, y1: 10, style: { color: "#000000", width: 2 }, fill: null }),
      JSON.stringify({ type: "AddShape", page: "$page:0", shape: "rect", x0: 20, y0: 0, x1: 30, y1: 10, style: { color: "#000000", width: 2 }, fill: null }),
    ]);
    expect(await main(["run", a, "--save"], run)).toBe(0);
    const first = run.json()[0].change.ids[0];
    const io = memoryIO();
    expect(await main(["export", a, frag, "--ids", first], io)).toBe(0);
    expect(io.json()[0].elements).toBe(1);
    const both = memoryIO();
    expect(await main(["export", a, frag, "--ids", first, "--all"], both)).toBe(2);
  });
  it("export vers .iwb : code 3 (lot 2) ; vers .png : code 2 ; page vide : code 1", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const iwb = memoryIO();
    expect(await main(["export", a, join(dir, "x.iwb")], iwb)).toBe(3);
    expect(iwb.errors()[0].error.message).toContain("lot 2");
    expect(await main(["export", a, join(dir, "x.png")], memoryIO())).toBe(2);
    const empty = memoryIO();
    expect(await main(["export", a, join(dir, "vide.rbitem")], empty)).toBe(1);
    expect(empty.errors()[0].error.code).toBe("command");
  });
});
```

Lancer : `cd $WT && nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/export.test.ts 2>&1 | tail -6`.
Attendu : `Tests  3 passed (3)`. Si `normalizeIds` diffère seulement par des ids internes d'un format autre qu'UUID
(lignes, colonnes d'un tableau), étendre le motif de `normalizeIds` à ce format dans `testing.ts` (toujours par rang),
jamais retirer un champ de la comparaison ; noter ce cas au rapport (`testing.ts` devient alors un fichier touché).

- [ ] **Étape 12 : preuve des tests de la CLI (commande bornée).**

```bash
cd $WT && nice -n 10 pnpm --filter @roomboard/cli exec tsc --noEmit 2>&1 | tail -5 \
  && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -60
```

Attendu : `tsc` muet ; `Test Files  10 passed (10)`, `Tests  N passed (N)` avec N ≥ 46, les lignes S3 et S4 nommées
dans « Test et commande bornée », aucun `×` ni `FAIL`.

- [ ] **Étape 13 : tests web gardés verts et build web.**

```bash
cd $WT && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app/fragments.test.ts src/app/workspace.test.ts src/core/wasm-core.contract.test.ts src/platform/import.test.ts src/engine/text-layout.test.ts 2>&1 | grep -E "Test Files|Tests |FAIL" | tail -5 \
  && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/web test 2>&1 | grep -E "Test Files|Tests |FAIL" | tail -5 \
  && nice -n 10 pnpm --filter @roomboard/web build 2>&1 | tail -4
```

Attendu : `Test Files  5 passed (5)` ; suite web `Tests  N passed` avec N ≥ 3083, aucun `failed` ni `FAIL` ; build web
code 0 (`tsc` accepte `main.ts` et `annotate-start.ts`).

- [ ] **Étape 14 : effet de bord sur la page (essai C11a).**

```bash
cd $WT && nice -n 10 node scripts/essais/c11a-annotation-navigateur.mjs 2>&1 | tail -6; echo "code=$?"
```

Attendu : `code=0`. `code=2` (Playwright absent) : le noter au rapport, la clôture le rejoue par `verifier.sh --e2e`.
`code=1` : arrêt, la mesure de la page a changé.

- [ ] **Étape 15 : essai réel par le binaire.**

```bash
cd $WT && nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -3 && D=$(mktemp -d "$WT/.essai-T3-XXXX") \
  && cp crates/roomboard-formats/tests/fixtures/valeurs.xlsx "$D/" && printf '%%PDF-1.4\n' > "$D/doc.pdf" \
  && node apps/cli/dist/roomboard.mjs new "$D/a.roomboard" >/dev/null \
  && node apps/cli/dist/roomboard.mjs import "$D/a.roomboard" "$D/valeurs.xlsx" --at 400,300; echo "code=$?" \
  ; node apps/cli/dist/roomboard.mjs import "$D/a.roomboard" "$D/doc.pdf"; echo "code=$?" \
  ; node apps/cli/dist/roomboard.mjs export "$D/a.roomboard" "$D/t.rbitem" --all; echo "code=$?" \
  ; node apps/cli/dist/roomboard.mjs state "$D/t.rbitem" | head -c 200; echo; rm -rf "$D"
```

Attendu : rapport `{"opened":[],"inserted":["valeurs.xlsx"],…}` et `code=0` ; erreur `unsupported` « lot 3 » et
`code=3` ; `{"file":…,"kind":"fragment","elements":1}` et `code=0` ; état du `.rbitem` (`"schema":"roomboard-cli/1"`).

- [ ] **Étape 16 : commit.**

```bash
cd $WT && git add apps/web/src/engine/text-layout.ts apps/web/src/engine/text-layout.test.ts apps/web/src/main.ts apps/web/src/annotate-start.ts docs/architecture-constats.md apps/cli/src/target.ts apps/cli/src/importer.ts apps/cli/src/exporter.ts apps/cli/src/ops.ts apps/cli/src/session.ts apps/cli/src/main.ts apps/cli/src/target.test.ts apps/cli/src/import.test.ts apps/cli/src/export.test.ts \
  && git status --short \
  && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(cli): import images and sheets through createImporter, export .rbitem, share measureOrFallback" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Ajouter aussi `apps/cli/src/testing.ts` à la liste si l'étape 11 l'a modifié.

---

### Tâche T4 — Essai de bout en bout dans `verifier.sh` et section `## CLI` du profil

<a id="tache-t4"></a>

**Objectif.** Écrire `scripts/essais/cli-essai.mjs` (scénario S5 : créer, éditer, importer, enregistrer, exporter,
relire, comparer `pages` et `assets`, code 3 d'un `.pdf`), le jouer dans `scripts/verifier.sh` après le build de la CLI
(toujours, hors `--e2e`), contrôler sa présence dans `scripts/tests/verifier-e2e.test.sh`, et remplir la rubrique 7
`## CLI` du profil (cadrage D14, D15, S5, DA6 « T4 »).

**Fichiers.**
- Créer : `scripts/essais/cli-essai.mjs`.
- Modifier : `scripts/verifier.sh` (après le contrôle de taille du module formats), `scripts/tests/verifier-e2e.test.sh`
  (avant la dernière ligne de bilan), `.claude/chantier.md` (section `## CLI` entre `## Action finale irréversible` et
  `## Règles propres au projet`).

**Interfaces.**
- Consomme (T1 à T3) : le binaire `apps/cli/dist/roomboard.mjs` et ses commandes `new`, `run` (opérations du cœur,
  `undo`, `redo`, `import`, `state`, `save`), `export`, `state` (`.roomboard` et `.rbitem`), `import` ; codes 0 et 3 ;
  état `roomboard-cli/1` ; `ROOMBOARD_NOW`.
- Produit : `node scripts/essais/cli-essai.mjs` → `CLI : OK` et code 0, sinon `CLI : ÉCHEC — <premier écart>` et code 1 ;
  lignes `pnpm --filter @roomboard/cli build` et `node scripts/essais/cli-essai.mjs` dans `scripts/verifier.sh`.
- Réutilise : `scripts/essais/commun.mjs` — `ROOT`, `solidPng(w, h, rgb)` (PNG fabriqué dans le script).
- Réutilise : `crates/roomboard-formats/tests/fixtures/valeurs.xlsx` (classeur suivi, déjà pris par
  `c10b-tableau-navigateur.mjs:23`).

**Test et commande bornée.**
- Test rouge : `bash scripts/tests/verifier-e2e.test.sh` → `ECHEC : cli-essai absent de verifier.sh` avant l'ajout.
- Preuves : étapes 5, 6 et 7 ; motifs : `verifier-e2e.test.sh : OK` ; essai : `CLI : OK` et au moins 14 lignes `ok —` ;
  `verifier.sh` : `CLI : OK`, `module Wasm : 1374398 octets`, `module formats : 2794511 octets`, `verifier.sh : OK`, aucun
  `test result: FAILED`, `error[` ni `FAIL `.
- Effet de bord (cadrage « Effets de bord ») : un module Wasm absent fait échouer l'essai (voulu) — couvert par
  `CLI construite` et la sortie code 1 du binaire.

**Preuve visuelle.** Aucune.

**Contraintes (recopiées de Global Constraints).**
- GC1 — Les deux modules Wasm ne changent pas d'un octet ; aucun code Rust modifié : tailles attendues
  `1374398` et `2794511` octets (fichier d'état, « Tailles Wasm avant »).
- GC2 — Aucun seuil baissé ou relevé (`1572864`, `3145728` restent), aucun test désactivé ou sauté (hors le saut existant
  sans `.wasm`, levé par `ROOMBOARD_WASM_REQUIRED=1`).
- GC3 — Aucune dépendance nouvelle ; `pnpm install --frozen-lockfile` doit passer.
- GC4 — Builds et tests en `nice -n 10`, cargo `-j 4` (`CARGO_BUILD_JOBS=4` pour `verifier.sh`) ;
  `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC5 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais finissant par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; jamais `git add -A` / `.` / `commit -a` ; ni push, ni tag,
  ni release, ni merge.
- GC6 — Fichiers temporaires dans le worktree ou `~/.cache/tmp/of1-*` (l'essai écrit sous `target/cli-essai/`, journal de
  `verifier.sh` sous `~/.cache/tmp/of1-cli-T4/`).
- GC7 — Préparation : `pnpm install --frozen-lockfile` ; colle Wasm construite comme `scripts/verifier.sh`.
- GC8 — Rien dans `roomboard-prive` ni dans la coque Tauri ; aucune installation système, aucun `tauri build`.
- GC11 — L'essai lit le contrat : stdout une ligne JSON par résultat, stderr `{"error":…}`, codes 0 et 3.

**Interdits.**
- Ne pas mettre l'essai dans le bloc `--e2e` (il n'ouvre aucun navigateur, D14) ; ne pas nommer le script
  `*-navigateur.mjs`.
- Ne pas toucher aux seuils de taille ni à l'ordre des étapes existantes de `verifier.sh`.
- Ne jamais ajouter le lien `target`, `target/cli-essai/` ni `apps/cli/dist/` au commit.

**Terminé quand.** `verifier-e2e.test.sh : OK` ; `node scripts/essais/cli-essai.mjs` affiche `CLI : OK` ;
`scripts/verifier.sh` (sans `--e2e`) finit par `verifier.sh : OK` avec les deux tailles inchangées ; `.claude/chantier.md`
a sa section `## CLI` ; le rapport contient `Réutilisation : appelé commun.mjs (ROOT, solidPng)`.

**Étapes.**

- [ ] **Étape 1 : préparation du worktree** (créé depuis `feat/cli` après la fusion de T3 ; s'il en est donné un autre,
  remplacer `WT`).

```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
WT=/home/adminjd/projets/roomboard-wt/cli--T4
cd $WT
[ -e target ] || ln -s /home/adminjd/projets/roomboard-wt/cli/target target   # cache cargo partagé, jamais ajouté
pnpm install --frozen-lockfile
nice -n 10 cargo build -j 4 -p roomboard-wasm --target wasm32-unknown-unknown --release
rm -rf apps/web/src/wasm
wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm
nice -n 10 cargo build -j 4 -p roomboard-formats-wasm --target wasm32-unknown-unknown --release
rm -rf apps/web/src/wasm-formats
wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm
pnpm exec wasm-opt -Oz apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm -o apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm
nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -3
ls apps/cli/dist/roomboard.mjs apps/cli/src/importer.ts
```

- [ ] **Étape 2 : test rouge de la présence dans `verifier.sh`.** Dans `scripts/tests/verifier-e2e.test.sh`, juste
  avant la ligne `[ "$fail" -eq 0 ] && echo "verifier-e2e.test.sh : OK"`, ajouter :

```bash
# CLI (chantier cli, D14) : build de la CLI et essai sans navigateur, joués hors du bloc --e2e.
grep -q "pnpm --filter @roomboard/cli build" scripts/verifier.sh || ko "build de la CLI absent de verifier.sh"
grep -q "node scripts/essais/cli-essai.mjs" scripts/verifier.sh || ko "cli-essai absent de verifier.sh"
awk '/essais\/cli-essai\.mjs/ && in_e2e {print "dans le bloc e2e : " $0; bad=1} /if \[ "\$E2E" = 1 \]/ {in_e2e=1} /^fi/ {in_e2e=0} END {exit bad}' scripts/verifier.sh >&2 || ko "cli-essai ne doit pas dépendre de --e2e"
```

Lancer : `cd $WT && bash scripts/tests/verifier-e2e.test.sh; echo "code=$?"`.
Attendu : `ECHEC : build de la CLI absent de verifier.sh`, `ECHEC : cli-essai absent de verifier.sh`, `code=1`.

- [ ] **Étape 3 : l'essai.** Créer `scripts/essais/cli-essai.mjs` :

```js
#!/usr/bin/env node
// Essai de la CLI (chantier cli, S5, D14), sans navigateur, joué par scripts/verifier.sh après le build de la CLI.
// Crée un tableau, joue une session (forme, texte, trait, deux pages, annuler, rétablir), importe une image PNG
// (fabriquée ici) et le classeur suivi valeurs.xlsx, enregistre ; exporte la première page en .rbitem et compare son
// état aux éléments de cette page (ids normalisés par rang) ; rouvre le .roomboard et compare pages et assets à l'état de
// fin de session (égalité stricte, ids compris ; version, canUndo, canRedo exclus, DA4) ; vérifie le code 3 d'un .pdf.
// Code de sortie : 0 « CLI : OK », 1 au premier écart. Fichiers sous target/cli-essai/ (ignoré par git), refait à chaque fois.
// Usage : node scripts/essais/cli-essai.mjs   (après `pnpm --filter @roomboard/cli build`)
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, solidPng } from "./commun.mjs";

const CLI = join(ROOT, "apps", "cli", "dist", "roomboard.mjs");
const DIR = join(ROOT, "target", "cli-essai");
const XLSX = join(ROOT, "crates", "roomboard-formats", "tests", "fixtures", "valeurs.xlsx");
const NOW = "2026-11-23T00:00:00.000Z";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

class Ecart extends Error {}
const check = (cond, msg) => {
  if (!cond) throw new Ecart(msg);
  console.log(`ok — ${msg}`);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const jsonLines = (text) => text.split("\n").filter((l) => l.trim() !== "").map((l) => JSON.parse(l));

function cli(args, { input = "", code = 0 } = {}) {
  const r = spawnSync(process.execPath, [CLI, ...args], { input, encoding: "utf8", env: { ...process.env, ROOMBOARD_NOW: NOW } });
  if (r.status !== code) throw new Ecart(`roomboard ${args.join(" ")} : code ${r.status} au lieu de ${code} ; stderr : ${r.stderr.trim()}`);
  return { lines: jsonLines(r.stdout), errors: jsonLines(r.stderr) };
}

/** Ids du cœur (UUID) remplacés par leur rang d'apparition ; clés triées ; les empreintes d'assets restent. */
function byRank(v, seen = new Map()) {
  if (typeof v === "string" && UUID.test(v)) {
    if (!seen.has(v)) seen.set(v, `#${seen.size + 1}`);
    return seen.get(v);
  }
  if (Array.isArray(v)) return v.map((x) => byRank(x, seen));
  if (v !== null && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, byRank(v[k], seen)]));
  return v;
}

function scenario() {
  check(existsSync(CLI), `CLI construite (${CLI})`);
  rmSync(DIR, { recursive: true, force: true });
  mkdirSync(DIR, { recursive: true });
  const a = join(DIR, "a.roomboard");
  const png = join(DIR, "image.png");
  const xlsx = join(DIR, "valeurs.xlsx");
  const frag = join(DIR, "page1.rbitem");
  const pdf = join(DIR, "doc.pdf");
  writeFileSync(png, solidPng(40, 30, [200, 30, 30]));
  copyFileSync(XLSX, xlsx);
  writeFileSync(pdf, "%PDF-1.4\n%%EOF\n");

  const made = cli(["new", a]).lines[0];
  check(made.file === a && made.pages.length === 1, "new : un tableau d'une page");

  const style = { color: "#1e40af", width: 4 };
  const ops = [
    { type: "AddShape", page: "$page:0", shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style, fill: null },
    { type: "SetText", page: "$page:0", id: null, x: 400, y: 100, content: "Bonjour", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 },
    { type: "CommitStroke", page: "$page:0", points: [100, 600, 0.5, 200, 650, 0.5, 300, 600, 0.5], style },
    { type: "AddPage", after: "$page:0" },
    { type: "CommitStroke", page: "$page:1", points: [10, 10, 0.5, 90, 90, 0.5], style },
    { op: "undo" },
    { op: "redo" },
    { op: "import", files: [png, xlsx], page: "$page:0", at: [400, 300] },
    { op: "state" },
    { op: "save" },
  ];
  const run = cli(["run", a, "--ops", "-"], { input: `${ops.map((o) => JSON.stringify(o)).join("\n")}\n` });
  check(run.lines.length === ops.length && run.lines.every((l) => l.ok === true), `run : ${ops.length} opérations jouées`);
  check(run.lines[5].change !== null && run.lines[6].change !== null, "annuler puis rétablir le trait de la page 2");
  check(same(run.lines[7].inserted, ["image.png", "valeurs.xlsx"]), "import : image et classeur insérés");
  const end = run.lines[8].state;
  const kinds = end.pages.map((p) => p.elements.map((e) => e.kind));
  check(same(kinds, [["shape", "text", "stroke", "image", "table"], ["stroke"]]), `état de fin : ${JSON.stringify(kinds)}`);
  check(end.assets.length === 1 && end.assets[0].mime === "image/png", "un asset cité : l'image PNG");
  check(run.lines[9].file === a, "save : enregistré au chemin ouvert");

  const page0 = end.pages[0].page.id;
  const exp = cli(["export", a, frag, "--page", page0, "--all"]).lines[0];
  check(exp.kind === "fragment" && exp.elements === 5, "export de la première page : 5 objets");
  const fragState = cli(["state", frag]).lines[0];
  check(fragState.pages.length === 1, ".rbitem relu : une page");
  check(same(byRank(fragState.pages[0].elements), byRank(end.pages[0].elements)), ".rbitem : mêmes objets que la page exportée (ids par rang)");
  check(same(fragState.assets, end.assets), ".rbitem : mêmes assets");

  const reread = cli(["state", a]).lines[0];
  check(same(reread.pages, end.pages), ".roomboard relu : pages identiques à l'état de fin de session, ids compris");
  check(same(reread.assets, end.assets), ".roomboard relu : assets identiques");

  const before = readFileSync(a);
  const refused = cli(["import", a, pdf], { code: 3 });
  check(refused.errors[0]?.error?.code === "unsupported" && refused.errors[0].error.message.includes("lot 3"), "import .pdf : code 3, « lot 3 »");
  check(readFileSync(a).equals(before), "import .pdf : fichier inchangé");
}

try {
  scenario();
  console.log("CLI : OK");
} catch (e) {
  console.error(`CLI : ÉCHEC — ${e instanceof Ecart ? e.message : (e?.stack ?? e)}`);
  process.exit(1);
}
```

Si `.rbitem : mêmes objets` échoue seulement sur des ids internes d'un autre format qu'UUID (lignes, colonnes du
tableau), étendre `UUID` à ce format (toujours remplacé par rang), jamais retirer un champ ; noter le cas au rapport.

- [ ] **Étape 4 : `verifier.sh`.** Dans `scripts/verifier.sh`, juste après le bloc du second module qui se termine par
  les lignes

```bash
if [ "$taille_formats" -gt 3145728 ]; then
  echo "verifier.sh : module formats trop gros ($taille_formats octets > 3 Mio, R9)" >&2
  exit 1
fi
```

  ajouter :

```bash

# CLI (chantier cli, D14) : construite après les modules Wasm (copiés dans apps/cli/dist), puis essai de bout en bout
# sans navigateur (S5) : créer, éditer, importer, enregistrer, exporter, relire, comparer pages et assets.
pnpm --filter @roomboard/cli build
node scripts/essais/cli-essai.mjs
```

- [ ] **Étape 5 : test de présence vert.** `cd $WT && bash scripts/tests/verifier-e2e.test.sh; echo "code=$?"`.
  Attendu : `verifier-e2e.test.sh : OK`, `code=0`.

- [ ] **Étape 6 : l'essai seul.**

```bash
cd $WT && nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -2 && nice -n 10 node scripts/essais/cli-essai.mjs 2>&1 | tail -20; echo "code=$?"
```

Attendu : au moins 14 lignes `ok — …` puis `CLI : OK`, `code=0`.

- [ ] **Étape 7 : la vérification complète (sans `--e2e`).** Elle reconstruit tout (fmt, clippy, cargo test, Wasm,
  tests de l'interface, builds) ; la lancer en arrière-plan et lire le journal.

```bash
mkdir -p ~/.cache/tmp/of1-cli-T4 && cd $WT && CARGO_BUILD_JOBS=4 nice -n 10 bash scripts/verifier.sh > ~/.cache/tmp/of1-cli-T4/verifier.log 2>&1; echo "code=$?"
grep -E "CLI : OK|module Wasm :|module formats :|verifier.sh : OK|test result: FAILED|error\[|FAIL |ECHEC" ~/.cache/tmp/of1-cli-T4/verifier.log | tail -20
```

Attendu : `code=0` ; `module Wasm : 1374398 octets (…)`, `module formats : 2794511 octets (…)`, `CLI : OK`,
`verifier.sh : OK` ; aucune ligne `test result: FAILED`, `error[`, `FAIL ` ni `ECHEC`. Une taille différente : arrêt et
rapport (GC1), sans toucher aux seuils.

- [ ] **Étape 8 : section `## CLI` du profil.** Dans `.claude/chantier.md`, juste avant la ligne
  `## Règles propres au projet`, ajouter :

```markdown
## CLI
- Oui, en écriture, cible locale seulement : `node apps/cli/dist/roomboard.mjs <commande>` sur des fichiers du worktree
  ou d'un dossier temporaire, après `pnpm --filter @roomboard/cli build` (qui suit la construction des deux modules Wasm).
  Aucune cible distante.
- Essai de référence : `node scripts/essais/cli-essai.mjs` (joué par `scripts/verifier.sh`, sortie `CLI : OK`).
- Lot 1 : `version`, `formats`, `new`, `state`, `run`, `apply`, `import`, `export` ; sortie JSON, codes 0 / 1 / 2 / 3,
  état `roomboard-cli/1` (`docs/plans/cli-cadrage.md`, DA2, DA4) ; formats et lots par `roomboard formats`.
- Un chantier qui ajoute une commande, un format ou un champ de l'état met à jour la CLI (`apps/cli`), la table
  `FORMAT_LOTS` (`apps/cli/src/formats.ts`, rendue par `formats`) et cet essai.

```

- [ ] **Étape 9 : commit.**

```bash
cd $WT && git add scripts/essais/cli-essai.mjs scripts/verifier.sh scripts/tests/verifier-e2e.test.sh .claude/chantier.md \
  && git status --short \
  && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "test(cli): run end-to-end CLI check in verifier.sh and document CLI in project profile" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Attendu : `git status --short` ne montre plus que `?? target` ; le commit passe.
