# CLI lot 2 — plan d'exécution

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Port `FragmentTab` générique et `encodeIds` | — | `apps/web/src/app/fragments.ts`, `apps/web/src/app/fragments.test.ts`, `apps/web/src/app/workspace.ts` | isolé | implementeur-tdd | `pnpm --filter @roomboard/web exec vitest run src/app/fragments.test.ts src/app/workspace.test.ts 2>&1 \| tail -15` : `Test Files  2 passed`, ≥ 1 test `encodeIds`, aucun `FAIL ` | S1 | #tache-t1 |
| T2 | Worker en processus (`inlineWorker`, `boardJobReply`, `zipJobReply`) | — | `apps/web/src/platform/one-shot-worker.ts`, `one-shot-worker.test.ts`, `board-reader.ts`, `board-reader.test.ts`, `board-worker.ts`, `zip-worker.ts`, `zip-worker.test.ts` (tous sous `apps/web/src/platform/`) | isolé | concepteur-critique | `pnpm --filter @roomboard/web exec vitest run src/platform/one-shot-worker.test.ts src/platform/board-reader.test.ts src/platform/zip-worker.test.ts src/platform/zip-read.test.ts 2>&1 \| tail -15` : `Test Files  4 passed`, tests `inlineWorker`, `boardJobReply`, `zipJobReply` présents | S2, S4 | #tache-t2 |
| T3 | Fabriques des tableaux déplacées | — | `scripts/essais/fabriques/tableaux.mjs`, `scripts/essais/fabriques/tableaux.d.mts`, `scripts/essais/c13-tableaux-navigateur.mjs`, `apps/web/src/platform/fabrique-tableaux.test.ts` | isolé | implementeur-tdd | `pnpm --filter @roomboard/web exec vitest run src/platform/fabrique-tableaux.test.ts src/platform/fabrique-flipchart.test.ts 2>&1 \| tail -15` : `Test Files  2 passed`, tests `fabriques des tableaux` présents | S2 | #tache-t3 |
| T4 | `board-convert.ts` : lecture, écriture, ports des tableaux | T1, T2 | `apps/web/src/app/board-convert.ts`, `apps/web/src/app/board-convert.test.ts`, `apps/web/src/app/workspace.ts`, `apps/web/src/main.ts` | isolé | implementeur-tdd | `pnpm --filter @roomboard/web exec vitest run src/app/board-convert.test.ts src/app/workspace.test.ts src/app/board-io.test.ts src/app/board-files.test.ts src/platform/import.test.ts 2>&1 \| tail -15` : `Test Files  5 passed`, tests `readBoardFile` présents | S2, S3 | #tache-t4 |
| T5 | CLI : insérer et exporter un `.rbitem`, `--grid`, `covered` | T1 | `apps/cli/src/fragment-view.ts`, `apps/cli/src/fragment-view.test.ts`, `apps/cli/src/target.ts`, `apps/cli/src/target.test.ts`, `apps/cli/src/exporter.ts`, `apps/cli/src/importer.ts`, `apps/cli/src/session.ts`, `apps/cli/src/main.ts`, `apps/cli/src/formats.ts`, `apps/cli/src/formats.test.ts`, `apps/cli/src/rbitem.test.ts` | isolé | implementeur-tdd | `ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/cli test 2>&1 \| tail -15` : tous verts, test `S1 —` présent (`-t "S1"` ≥ 1 test) | S1 | #tache-t5 |
| T8 | CLI : bibliothèque sur disque (fonctions) | T2 | `apps/cli/src/library.ts`, `apps/cli/src/library.test.ts` | isolé | implementeur-tdd | `ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/cli exec vitest run src/library.test.ts 2>&1 \| tail -15` : `Test Files  1 passed`, ≥ 4 tests | S4 | #tache-t8 |
| T6 | CLI : lire les cinq tableaux, règle D23, panique D29 | T3, T4, T5 | `apps/cli/src/board-node.ts`, `apps/cli/src/board-node.test.ts`, `apps/cli/src/boards.test.ts`, `apps/cli/src/session.ts`, `apps/cli/src/importer.ts`, `apps/cli/src/main.ts`, `apps/cli/src/main.test.ts`, `apps/cli/src/formats.ts`, `apps/cli/src/formats.test.ts`, `apps/cli/src/testing.ts` | isolé | concepteur-critique | `ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/cli test 2>&1 \| tail -15` : tous verts, tests `S2 —` et `D23` présents | S2 | #tache-t6 |
| T7 | CLI : exporter `.iwb`/`.ubz`, commande `convert` | T6 | `apps/cli/src/exporter.ts`, `apps/cli/src/session.ts`, `apps/cli/src/main.ts`, `apps/cli/src/formats.ts`, `apps/cli/src/formats.test.ts`, `apps/cli/src/export.test.ts`, `apps/cli/src/convert.test.ts` | isolé | implementeur-tdd | `ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/cli test 2>&1 \| tail -15` : tous verts, tests `S3 —` présents | S3, S2 | #tache-t7 |
| T9 | CLI : commande `library`, `LOT_LIVRE = 2`, aide, essai, profil | T7, T8 | `apps/cli/src/main.ts`, `apps/cli/src/main.test.ts`, `apps/cli/src/formats.ts`, `apps/cli/src/formats.test.ts`, `scripts/essais/cli-essai.mjs`, `.claude/chantier.md` | isolé | implementeur-tdd | `pnpm --filter @roomboard/cli build 2>&1 \| tail -5 && node scripts/essais/cli-essai.mjs 2>&1 \| tail -40` : dernière ligne `CLI : OK` ; et `ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/cli test 2>&1 \| tail -15` tous verts | S4, S5 | #tache-t9 |

Vagues (dépendances) : 1 = T1 ∥ T2 ∥ T3 ; 2 = T4 ∥ T5 ∥ T8 ; 3 = T6 ; 4 = T7 ; 5 = T9. Aucune paire d'une même
vague ne partage un fichier. Chemin critique : T1 → T5 → T6 → T7 → T9 (T4 doit aussi être fusionnée avant T6).

**Goal :** la CLI insère un `.rbitem`, lit les cinq tableaux blancs, écrit `.iwb` et `.ubz`, convertit, et range les
`.rbpack` dans une bibliothèque sur disque, par le seul code de la page et des deux modules Wasm.

**Architecture :** trois extractions côté web (port `FragmentTab` générique, corps des Workers en fonctions,
`board-convert.ts`), puis trois branchements côté CLI (vue `CliPage`, ports des tableaux en processus, bibliothèque
`node:fs`). `FORMAT_LOTS` passe d'un seuil global à un état `covered` par format et par sens.

**Tech Stack :** TypeScript (Vite, Vitest 3), Node 22, modules Wasm `roomboard_wasm` et `roomboard_formats_wasm`
(déjà construits), fflate 0.8.3 (résolu depuis `apps/web`).

**Spec :** `docs/plans/cli-lot2-cadrage.md` (complète `docs/plans/cli-cadrage.md`, lot 1).

## Global Constraints

Recopiées dans chaque section concernée (un sous-agent ne lit que la sienne).

- G1 — TDD : test rouge d'abord. Aucun test désactivé, sauté (`.skip`, `.only`, `describe.skip` ajouté), ni seuil changé.
- G2 — Aucune logique recopiée (décision 0281) : la CLI appelle le code TS de la page et les deux modules Wasm ; un
  Worker se remplace par un appel direct à la même fonction.
- G3 — Aucun changement Rust (`crates/` intouché) ; tailles Wasm inchangées, plafonds 1 572 864 o et 3 145 728 o
  inchangés.
- G4 — Fichiers d'essai fabriqués depuis les fixtures et fabriques du dépôt ; aucun fichier téléchargé ; écritures
  seulement dans des dossiers temporaires (`tmpDir()` des tests, `mkdtempSync` de l'essai).
- G5 — VM partagée : toute commande lourde préfixée de `nice -n 10` ; `cargo … -j 4` si cargo sert ; un test qui
  échoue sur un délai est rejoué une fois ; aucun délai relevé.
- G6 — Wasm : déjà construit dans le worktree du chantier (`/home/adminjd/projets/roomboard-wt/cli-lot2/apps/web/src/wasm`
  et `…/wasm-formats`). Un worktree isolé neuf ne l'a pas : le copier (dossiers générés, ignorés par git,
  `.gitignore:5-6`, vérifié) :
  `cp -r /home/adminjd/projets/roomboard-wt/cli-lot2/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot2/apps/web/src/wasm-formats <worktree>/apps/web/src/`.
- G7 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (`--author`), messages en anglais,
  terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Fichiers ajoutés un par un : jamais
  `git add -A`, `git add .`, `git commit -a`. Aucun `--force`.
- G8 — Mise à jour obligatoire D15 : tout format livré change sa ligne de `FORMAT_LOTS`, ses tests **et**
  `scripts/essais/cli-essai.mjs` (l'essai est écrit en T9, DA10).
- G9 — Installation d'un worktree neuf : `pnpm install --frozen-lockfile` à la racine. Aucune dépendance ajoutée
  (fflate reste celui d'`apps/web`, H20).

## Review Focus

Cinq entrées que les scénarios n'exercent pas et qui mordraient un utilisateur ; chaque test vit dans la tâche
propriétaire.

1. `.rbitem` importé sur une autre page que la première (`--page`) : les objets arrivent sur cette page — test
   `RF1 — import --page` en **T5** (S1, D18).
2. Extensions en majuscules (`LECON.IWB`, `X.ROOMBOARD`) : le tableau est lu, la règle D23 accepte `.ROOMBOARD` —
   test `RF2 — majuscules` en **T6** (D22, D23).
3. Tableau renommé illisible (`faux.ubz` qui est du texte) : code 1, message du produit, rien d'écrit — test
   `RF3 — .ubz qui n'est pas un ZIP` en **T6** (H12).
4. Paquet `.rbpack` endommagé à l'import en bibliothèque : refus, aucun fichier créé dans la bibliothèque — test
   `RF4 — paquet endommagé` en **T8** (DA10, `library import` code 1).
5. `convert` d'un tableau vers un autre tableau (`.ubz` → `.iwb`) et sortie existante remplacée (H16) — test
   `RF5 — tableau vers tableau` en **T7** (D25, H16).

---

## Carte des fichiers

| fichier | rôle | tâche |
|---|---|---|
| `apps/web/src/app/fragments.ts` | `FragmentTab`, `FragmentDeps<T>`, `FragmentOps<T>`, `createFragmentOps<T>`, `encodeIds`, `tabSessionView` | T1 |
| `apps/web/src/app/workspace.ts` | passe `view: tabSessionView` (T1) ; `openBoard`/`exportBoard` sur `board-convert.ts` (T4) | T1, T4 |
| `apps/web/src/platform/one-shot-worker.ts` | `WorkerReply`, `inlineWorker` | T2 |
| `apps/web/src/platform/board-reader.ts` | `BoardJob`, `boardJobReply` | T2 |
| `apps/web/src/platform/board-worker.ts` | coquille autour de `boardJobReply` | T2 |
| `apps/web/src/platform/zip-worker.ts` | `ZipJob`, `zipJobReply` ; coquille | T2 |
| `scripts/essais/fabriques/tableaux.mjs` (+ `.d.mts`) | fabriques `.iwb .ubz .notebook .olf`, pages `.flipchart` | T3 |
| `apps/web/src/app/board-convert.ts` | `readBoardFile`, `writeBoardFile`, `createBoardPorts` | T4 |
| `apps/web/src/main.ts` | `board: createBoardPorts(...)` | T4 |
| `apps/cli/src/fragment-view.ts` | `CliPage`, `cliView`, `cliFragments`, `SCENE` | T5 |
| `apps/cli/src/target.ts` | `headlessTarget(tab, page, notices, fragments)` | T5 |
| `apps/cli/src/exporter.ts` | `encodeIds`/`encodeGrid` (T5), `.iwb`/`.ubz` (T7) | T5, T7 |
| `apps/cli/src/library.ts` | `nodeDirFs`, `nodeZip`, `openLibrary`, `libraryList/Import/Export` | T8 |
| `apps/cli/src/board-node.ts` | `nodeBoardPorts` | T6 |
| `apps/cli/src/session.ts` | deps `fragments` (T5), `board`, `codec`, `interrupted` (T6) ; `readDoc` par extension, `openBoard`, `documentTarget` (T6) ; op `export` (T5, T7) | T5, T6, T7 |
| `apps/cli/src/main.ts` | `export --grid` (T5), D23 (T6), `convert` (T7), `library` (T9) | T5, T6, T7, T9 |
| `apps/cli/src/formats.ts` | `covered` (T5), tableaux (T6), écriture (T7), `.rbpack` + `LOT_LIVRE = 2` (T9) | T5, T6, T7, T9 |
| `scripts/essais/cli-essai.mjs`, `.claude/chantier.md` | contrôles S5, profil § CLI | T9 |

---

<a id="tache-t1"></a>

### Tâche T1 — Port `FragmentTab` générique et `encodeIds`

**Objectif.** `createFragmentOps` devient générique : toute lecture de `tab.board.*` passe par `deps.view(tab)`.
Nouveau membre `encodeIds` (ids d'une page → `.rbitem` + nombre d'éléments). La page ne change pas de comportement.
Scénario servi : S1 (le port est ce que la CLI branchera en T5).

**Worktree.** Isolé : `~/projets/roomboard-wt/cli-lot2--T1`. Préparer :
`cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r /home/adminjd/projets/roomboard-wt/cli-lot2/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot2/apps/web/src/wasm-formats apps/web/src/`
(tests sur faux cœur ; la copie garde la suite web entière jouable).

**Fichiers.**
- Modifier : `apps/web/src/app/fragments.ts` (26-56, 94-200)
- Modifier : `apps/web/src/app/workspace.ts:348` (une ligne) et l'import ligne 39
- Test : `apps/web/src/app/fragments.test.ts` (appels lignes 62, 208, 254, 271, 325 + tests neufs)

**Interfaces.**
- Consomme : `anchorOf(rect, camera, at)` (`platform/image-import.ts:146`), `ContainerIO`, `MissingAssetError`
  (`container-io.ts`), `CoreDocument.extract/insertFragment/insertPages` (`core/api.ts:381-385`).
- Produit (exact, utilisé par T5) :

```ts
export interface FragmentTab {
  readonly assets: AssetStore;
  readonly doc: CoreDocument;
  state(): { readonly page: string; readonly selection: readonly string[] };
  anchor(at: Point | null): readonly [number, number];
  run(cmd: Command): Change | null;
  insertFragment(src: CoreDocument, dx: number, dy: number): Change | null;
  insertPages(src: CoreDocument): Change | null;
}
export interface FragmentDeps<T> {
  readonly io: ContainerIO;
  readonly core: Pick<CoreFactory, "blank">;
  now(): string;
  readonly appVersion: string;
  say(message: string): Promise<void>;
  alive(tab: T): boolean;
  view(tab: T): FragmentTab;
}
export interface FragmentOps<T> {
  encodeSelection(tab: T, action?: "copy" | "export"): Promise<Uint8Array | null>;
  encodeIds(tab: T, page: string, ids: readonly string[], name?: string, action?: "copy" | "export"): Promise<{ readonly bytes: Uint8Array; readonly elements: number } | null>;
  insert(tab: T, rbitem: Uint8Array, name: string, at: Point | null, index?: number): Promise<boolean>;
  insertOutcome(tab: T, rbitem: Uint8Array, name: string, at: Point | null, index?: number): Promise<InsertOutcome>;
  insertPages(tab: T, file: OpenedFile): Promise<boolean>;
  insertResource(tab: T, bytes: Uint8Array, name: string, at: Point | null, index?: number): Promise<InsertOutcome>;
  encodeGrid(tab: T, name?: string): Promise<Uint8Array | null>;
  resetCascade(): void;
}
export function createFragmentOps<T>(deps: FragmentDeps<T>): FragmentOps<T>;
/** Vue d'un onglet de la page (adaptateur DA5, ~8 lignes) ; passée par `workspace.ts`, réutilisée par les tests. */
export function tabSessionView(t: TabSession): FragmentTab;
```

- Réutilise : `apps/web/src/app/fragments.ts:56` — `createFragmentOps<T>(deps: FragmentDeps<T>): FragmentOps<T>` ; `FragmentDeps<T>` = champs actuels avec `alive(tab: T): boolean` et `view(tab: T): FragmentTab` ; appel `insertResource(tab: T, bytes, name, at, index?)` (étendre).
- Réutilise : `fragments.ts:147` — nouveau membre `encodeIds(tab: T, page: string, ids: readonly string[], name?: string, action?: "copy" | "export"): Promise<{ readonly bytes: Uint8Array; readonly elements: number } | null>` ; `encodeSelection(tab, action)` = `(await encodeIds(tab, state.page, state.selection, SELECTION_NAME, action))?.bytes ?? null` (étendre).
- Réutilise : `fragments.ts:167` — `encodeGrid(tab: T, name?)`, page = `view(tab).state().page` (réutiliser, signature générique).
- Rapport de la tâche : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne ci-dessus.

**Contraintes (recopiées).**
- G1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- G2 — Aucune logique recopiée (0281) : l'adaptateur de la page est écrit une fois (`tabSessionView`) ; les tests l'importent.
- G3 — Aucun changement Rust ; tailles Wasm inchangées (plafonds 1 572 864 o et 3 145 728 o).
- G5 — `nice -n 10` ; un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé.
- G6 — Wasm copié comme indiqué ci-dessus (dossiers ignorés par git).
- G7 — Auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers un par un ; aucun `--force`.
- G9 — `pnpm install --frozen-lockfile` ; aucune dépendance ajoutée.

**Interdits.** Aucun changement de comportement de la page (messages, cascade, ordre des avis). Ne pas toucher
`workspace.ts:352-364` (`imageTarget`) ni `:838-892` (appels inchangés). Ne pas corriger le constat
`fragments.ts:139` (grille comparée par `JSON.stringify`) : il suit le code.

**Terminé quand.** `fragments.test.ts` et `workspace.test.ts` verts, nouveaux tests `encodeIds` et `vue générique`
présents ; `tsc --noEmit` du paquet web sans erreur ; un commit.

**Étapes.**

- [ ] **1. Tests rouges** — dans `fragments.test.ts`, importer `tabSessionView` et `type FragmentTab` depuis
  `./fragments`, passer `view: tabSessionView` aux cinq appels existants de `createFragmentOps` (lignes 62, 208, 254,
  271, 325 : ajouter `, view: tabSessionView` dans l'objet), puis ajouter à la fin :

```ts
describe("port FragmentTab générique (cli-lot2, D17, D19)", () => {
  it("vue générique : un onglet sans BoardSession encode et insère par sa vue seule", async () => {
    const doc = fakeCore.blank();
    const page = doc.pageIds()[0]!;
    const assets = createAssetStore(async () => ID);
    const view: FragmentTab = {
      assets,
      doc,
      state: () => ({ page, selection: [] }),
      anchor: () => [1000, 500],
      run: (cmd) => doc.apply(cmd),
      insertFragment: (src, dx, dy) => doc.insertFragment(src, page, dx, dy),
      insertPages: (src) => doc.insertPages(src, page),
    };
    const said: string[] = [];
    const say = async (m: string) => void said.push(m);
    const io = createContainerIO({ core: fakeCore, codec: memoryCodec(), say, makeAssets: () => createAssetStore(async () => ID) });
    const ops = createFragmentOps<{ readonly name: string }>({ io, core: fakeCore, now: () => NOW, appVersion: "0.1.0", say, alive: () => true, view: () => view });
    const tab = { name: "sans écran" };
    const id = rectIn(doc, 0, 0, 100, 100);
    const out = (await ops.encodeIds(tab, page, [id], "carré", "export"))!;
    expect(out.elements).toBe(1);
    expect(await ops.insertResource(tab, out.bytes, "carré.rbitem", null)).toBe("inserted");
    const ids = doc.elementIds(page);
    expect(ids).toHaveLength(2);
    expect(centre(doc, [ids[1]!])).toEqual([1000, 500]);
    expect(said).toEqual([]);
  });
  it("encodeIds : nombre d'éléments de la première page du fragment ; ids vides → null", async () => {
    const { ops } = opsOf();
    const src = tabOf();
    const a = rectIn(src.doc, 0, 0, 10, 10);
    const b = rectIn(src.doc, 20, 0, 30, 10);
    const page = src.doc.pageIds()[0]!;
    expect((await ops.encodeIds(src.tab, page, [a, b]))?.elements).toBe(2);
    expect(await ops.encodeIds(src.tab, page, [])).toBeNull();
  });
  it("encodeIds à l'export : image absente → null et MISSING_EXPORT_MESSAGE", async () => {
    const { ops, said } = opsOf();
    const src = tabOf();
    const page = src.doc.pageIds()[0]!;
    const i = src.doc.apply({ type: "AddImage", page, asset: { id: ID, name: "a.png", mime: "image/png", size: 3 }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] }).ids[0]!;
    expect(await ops.encodeIds(src.tab, page, [i], "x", "export")).toBeNull();
    expect(said).toEqual([MISSING_EXPORT_MESSAGE]);
  });
  it("encodeSelection = octets d'encodeIds sur la sélection (même nombre d'éléments relus)", async () => {
    const { ops } = opsOf();
    const src = tabOf();
    src.select([rectIn(src.doc, 0, 0, 10, 10)]);
    const bytes = (await ops.encodeSelection(src.tab))!;
    const dst = tabOf();
    expect(await ops.insert(dst.tab, bytes, "x", null)).toBe(true);
    expect(dst.doc.elementIds(dst.doc.pageIds()[0]!)).toHaveLength(1);
  });
});
```

- [ ] **2. Vérifier le rouge** — `cd <wt> && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app/fragments.test.ts 2>&1 | tail -15`
  Attendu : échec (`tabSessionView` absent, `encodeIds is not a function`).

- [ ] **3. Écrire le port dans `fragments.ts`** — en tête, importer `type Change, type Command` de `../core/api` et
  `type AssetStore` de `../core/asset-store` ; remplacer `FragmentDeps`/`FragmentOps` par les interfaces du bloc
  Interfaces ; ajouter :

```ts
export function tabSessionView(t: TabSession): FragmentTab {
  return {
    assets: t.assets,
    doc: t.board.doc,
    state: () => t.board.engine.state(),
    anchor: (at) => anchorOf(t.board.stage.getBoundingClientRect(), t.board.engine.camera(), at),
    run: (cmd) => t.board.engine.run(cmd),
    insertFragment: (src, dx, dy) => t.board.engine.insertFragment(src, dx, dy),
    insertPages: (src) => t.board.engine.insertPages(src),
  };
}
```

  Puis `export function createFragmentOps<T>(deps: FragmentDeps<T>): FragmentOps<T>` : remplacer `TabSession` par
  `T` dans `accept`, `adopt`, `placeFragment`, `insertOutcome`, `placeGrid` ; et chaque lecture d'onglet :

```ts
function adopt(tab: T, read: ReadResult): void {
  const { present } = read.assets.pick(read.doc.citedAssets().map((a) => a.id));
  const assets = deps.view(tab).assets;
  for (const [id, blob] of present) assets.adopt(id, blob);
}
// placeFragment, après accept() et le contrôle de `box` :
const v = deps.view(tab);
const [ax, ay] = v.anchor(at);
// … calcul de n, dx, dy inchangé …
adopt(tab, read);
return v.insertFragment(src, dx, dy) !== null ? "inserted" : "refused";
// placeGrid, après le contrôle de `grid` :
const v = deps.view(tab);
const page = v.state().page;
const current = v.doc.page(page)?.grid ?? null;
if (current !== null && JSON.stringify(current) === JSON.stringify(grid)) return "inserted";
return v.run({ type: "SetGrid", page, grid }) !== null ? "inserted" : "refused";

async function encodeIds(tab: T, page: string, ids: readonly string[], name: string = SELECTION_NAME, action: "copy" | "export" = "copy"): Promise<{ readonly bytes: Uint8Array; readonly elements: number } | null> {
  if (ids.length === 0) return null;
  const v = deps.view(tab);
  const frag = v.doc.extract(page, ids);
  try {
    const fp = frag.pageIds()[0];
    const elements = fp === undefined ? 0 : frag.elementIds(fp).length; // règle d'exporter.ts:42-43, déplacée ici
    const bytes = await deps.io.encode(frag, v.assets, deps.now(), deps.appVersion, { kind: "fragment", name });
    return { bytes, elements };
  } catch (e) {
    if (!(e instanceof MissingAssetError)) throw e; // les autres (module absent…) portent leur propre avis
    await deps.say(action === "export" ? MISSING_EXPORT_MESSAGE : MISSING_ITEMS_MESSAGE);
    return null;
  } finally {
    frag.free();
  }
}
```

  Dans l'objet rendu : `encodeIds,` ;
  `async encodeSelection(tab, action = "copy") { const { page, selection } = deps.view(tab).state(); return (await encodeIds(tab, page, selection, SELECTION_NAME, action))?.bytes ?? null; }` ;
  `encodeGrid` lit `const v = deps.view(tab); const grid = v.doc.page(v.state().page)?.grid ?? null;` et encode avec
  `v.assets` ; `insertPages` finit par `return deps.view(tab).insertPages(read.doc) !== null;`. Le commentaire d'en-tête
  gagne une ligne : « cli-lot2 (D17, D19) : générique sur l'onglet `T`, lu par `view` ; `encodeIds` sert la CLI ».

- [ ] **4. Brancher la page** — `workspace.ts:39` : importer aussi `tabSessionView` ; ligne 348 :
  `const fragments = createFragmentOps<TabSession>({ io, core, now: deps.now, appVersion: APP_VERSION, say, alive: (t) => !released.has(t), view: tabSessionView });`

- [ ] **5. Vert** — `cd <wt> && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app/fragments.test.ts src/app/workspace.test.ts 2>&1 | tail -15`
  Attendu : `Test Files  2 passed`, `Tests  N passed` (N ≥ 4 de plus qu'avant), aucun `FAIL `.
  Puis `nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -10` : aucune ligne `error TS`.
  Tests à garder verts : `fragments.test.ts`, `workspace.test.ts` (copier, coller, exporter). `c3-groupes-navigateur.mjs`
  et `c4-bibliotheque-navigateur.mjs` sont rejoués par `verifier.sh --e2e` en fin de chantier.

- [ ] **6. Commit**

```bash
git -C <wt> add apps/web/src/app/fragments.ts apps/web/src/app/fragments.test.ts apps/web/src/app/workspace.ts
git -C <wt> commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -F - <<'EOF'
refactor(web): generic FragmentTab port and encodeIds in fragments

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

<a id="tache-t2"></a>

### Tâche T2 — Worker en processus (`inlineWorker`, `boardJobReply`, `zipJobReply`)

**Objectif.** Le corps des Workers des tableaux et du ZIP devient deux fonctions exportées ; les Workers ne gardent
qu'une coquille ; `inlineWorker(handle)` joue le même corps en processus pour la CLI. Scénarios servis : S2 (lecture
des tableaux), S4 (ZIP des paquets).

**Patron à ne pas reprendre.** Le mappage direct prévu au § 7 du lot 1 (`unzip = unzipEntries`, lecture par
`BoardReader` appelé à la main dans la CLI) : il recopierait `checkZipReply`, `checkBoardParts`, la borne de
`createOlfReader` et l'emballage du `.flipchart`. Chemin de référence (le seul corps à extraire, tel quel) :
`apps/web/src/platform/board-worker.ts:44-72` et `apps/web/src/platform/zip-worker.ts:158-185`. Les lecteurs
`createZipReader`, `createZipWriter`, `createOlfReader` (`zip-read.ts:47-90`) et `createBoardCodec`
(`board-reader.ts:133-164`) restent **inchangés** : ils recevront `inlineWorker(...)` comme `spawn`.

**Invariant partagé (D29).** `boardJobReply` rend toute erreur en `{ error: boardErrorMessage(…) }` **sauf**
`WebAssembly.RuntimeError`, relancée. La coquille du Worker l'attrape et poste le même `{ error }` qu'aujourd'hui :
rien ne change pour la page. En processus, `inlineWorker` la transforme en `onerror` (donc `runOnce` rejette avec son
message d'échec), et l'appelant de la CLI (T6) peut la voir avant.

**Worktree.** Isolé : `~/projets/roomboard-wt/cli-lot2--T2`. Préparer :
`cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r /home/adminjd/projets/roomboard-wt/cli-lot2/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot2/apps/web/src/wasm-formats apps/web/src/`.

**Fichiers.**
- Modifier : `apps/web/src/platform/one-shot-worker.ts` (fin de fichier)
- Modifier : `apps/web/src/platform/board-reader.ts` (+ `BoardJob`, `partOf`, `boardJobReply`)
- Modifier : `apps/web/src/platform/board-worker.ts:22-72` (coquille)
- Modifier : `apps/web/src/platform/zip-worker.ts:144-186` (`ZipJob`, `zipJobReply`, coquille)
- Test : `one-shot-worker.test.ts`, `board-reader.test.ts` (lignes 15, 193-196, 230-232 réécrites), `zip-worker.test.ts`

**Interfaces.**
- Consomme : `notebookOrder`, `withLeadingWarnings`, `boardErrorMessage` (`board-reader.ts`), `hasBoardReader`,
  `hasFlipchartReader`, `FormatsBinding` (`container.ts`), `zipStored`, `unzipEntries`, `keepPackPath`,
  `keepBoardPath`, `bambooEntries`, `unzipModelEntries`, `olfPart` (`zip-worker.ts`).
- Produit (exact, utilisé par T4, T6, T8) :

```ts
// one-shot-worker.ts
export interface WorkerReply { readonly data: unknown; readonly transfer: Transferable[] }
/** Worker en processus (cli-lot2, DA7) : réponse en tâche suivante, rejet ou exception → onerror, terminate sans effet. */
export function inlineWorker(handle: (message: unknown) => WorkerReply | Promise<WorkerReply>): () => WorkerLike;
// board-reader.ts
export type BoardJob =
  | { readonly op: "read"; readonly dialect: BoardDialect; readonly files: readonly Uint8Array[]; readonly names?: readonly string[]; readonly manifest?: Uint8Array | null; readonly max?: number }
  | { readonly op: "flipchart"; readonly names: string[]; readonly data: Uint8Array; readonly ends: Uint32Array }
  | { readonly op: "write"; readonly format: BoardWriteFormat; readonly ops: Float32Array; readonly texts: string[] };
export function boardJobReply(mod: FormatsBinding, job: BoardJob): WorkerReply;
// zip-worker.ts
export interface ZipJob { readonly op?: "unzip" | "zip" | "olf"; readonly mode?: "model3d" | "pack" | "board" | "bamboo"; readonly bytes?: Uint8Array; readonly files?: readonly ZipFile[] }
export function zipJobReply(message: ZipJob): WorkerReply;
```

- Réutilise : `apps/web/src/platform/one-shot-worker.ts:10` — `interface WorkerReply { readonly data: unknown; readonly transfer: Transferable[] }` ; `inlineWorker(handle: (message: unknown) => WorkerReply | Promise<WorkerReply>): () => WorkerLike` (étendre).
- Réutilise : `board-worker.ts:44-72` (corps non exporté) — `export type BoardJob` (déplacé) ; `boardJobReply(mod: FormatsBinding, job: BoardJob): WorkerReply` dans `platform/board-reader.ts` ; le Worker : `boardJobReply(await loadFormatsModule(), e.data)` dans son `try`, son `catch` poste `{ error: boardErrorMessage(…) }` (étendre, extraire).
- Réutilise : `zip-worker.ts:158-185` (corps), `:73,83,91,137` — `export type ZipJob` (ex-`WorkerMessage`) ; `zipJobReply(message: ZipJob): WorkerReply` ; ensuite `createZipReader(inlineWorker(...), undefined, mode)`, `createZipWriter(…)`, `createOlfReader(…)` (`zip-read.ts:47,62,84`) sans changement (étendre puis réutiliser).
- Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne ci-dessus.

**Contraintes (recopiées).**
- G1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- G2 — Aucune logique recopiée (0281) : un Worker se remplace par un appel direct à la même fonction ; les contrôles de réponse ne sont jamais réécrits.
- G3 — Aucun changement Rust ; tailles Wasm inchangées (plafonds 1 572 864 o et 3 145 728 o).
- G5 — `nice -n 10` ; un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé.
- G6 — Wasm copié comme indiqué ci-dessus.
- G7 — Auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers un par un ; aucun `--force`.
- G9 — Aucune dépendance ajoutée.

**Interdits.** Ne pas toucher `zip-read.ts`, `createBoardCodec`, `runOnce`, `main.ts`. Ne pas corriger le constat
`zip-worker.ts:25` (dépendance platform → app). Réponses et transferts du Worker de la page identiques à aujourd'hui.

**Terminé quand.** Les quatre fichiers de test verts ; plus aucun `?raw` de `board-worker.ts` dans les tests
(`grep -n "board-worker.ts?raw" apps/web/src` vide) ; `tsc --noEmit` web sans erreur ; un commit.

**Étapes.**

- [ ] **1. Tests rouges de `inlineWorker`** — ajouter à `one-shot-worker.test.ts` (importer `inlineWorker`) :

```ts
describe("Worker en processus (cli-lot2, DA7)", () => {
  const plusUn = (m: unknown) => ({ data: { n: (m as { n: number }).n + 1 }, transfer: [] });
  it("inlineWorker : runOnce reçoit la réponse du corps, contrôlée par check", async () => {
    expect(await runOnce(inlineWorker(plusUn), { n: 1 }, [], 1000, ok, "échec")).toBe(2);
  });
  it("inlineWorker : réponse en tâche suivante, jamais dans postMessage", async () => {
    const w = inlineWorker(plusUn)();
    const got: unknown[] = [];
    w.onmessage = (e) => void got.push(e.data);
    w.postMessage({ n: 4 }, []);
    expect(got).toEqual([]);
    await new Promise((r) => setTimeout(r, 5));
    expect(got).toEqual([{ n: 5 }]);
  });
  it("inlineWorker : exception ou rejet du corps → onerror, runOnce rejette avec failure", async () => {
    const sync = inlineWorker(() => {
      throw new Error("x");
    });
    await expect(runOnce(sync, {}, [], 1000, ok, "échec")).rejects.toThrow("échec");
    const async = inlineWorker(async () => Promise.reject(new Error("y")));
    await expect(runOnce(async, {}, [], 1000, ok, "échec")).rejects.toThrow("échec");
  });
  it("inlineWorker : terminate sans effet", () => {
    expect(() => inlineWorker(plusUn)().terminate()).not.toThrow();
  });
});
```

- [ ] **2. Tests rouges de `boardJobReply`** — dans `board-reader.test.ts` : retirer l'import
  `boardWorkerSource from "./board-worker.ts?raw"` et les deux tests qui le lisent (« le Worker ordonne par
  notebookOrder… », « le Worker ouvre le paperboard par FlipchartReader… ») ; importer `boardJobReply` ; ajouter :

```ts
describe("boardJobReply (cli-lot2, D20, D29)", () => {
  const enc = (s: string) => new TextEncoder().encode(s);
  const dec = (b: Uint8Array) => new TextDecoder().decode(b);
  const reader = (tag: string) => ({ ops: () => new Float32Array([tag.length]), texts: () => [tag], warnings: () => [], free: () => undefined });
  const fail = (): never => {
    throw new Error("non appelé");
  };
  function mod(over: { open?: (xml: Uint8Array) => unknown; order?: (m: Uint8Array) => string[]; flip?: (n: string[], d: Uint8Array, e: Uint32Array) => unknown; write?: () => string[] } = {}): FormatsBinding {
    return {
      ContainerReader: { open: fail },
      write_container: fail,
      BoardReader: { open: (xml: Uint8Array) => (over.open ?? ((x: Uint8Array) => reader(dec(x))))(xml) },
      write_board_xml: over.write ?? (() => ["content.xml", "<iwb/>"]),
      notebook_order: over.order ?? (() => []),
      FlipchartReader: { open: over.flip ?? (() => reader("flip")) },
    } as unknown as FormatsBinding;
  }
  it("C13 N6 : un .notebook est ordonné par notebookOrder et la liaison notebook_order, sans tri", () => {
    const r = boardJobReply(mod({ order: () => ["page1.svg", "page0.svg"] }), { op: "read", dialect: "notebook", files: [enc("A"), enc("B")], names: ["page0.svg", "page1.svg"], manifest: enc("<m/>"), max: 10 });
    expect((r.data as { parts: BoardPart[] }).parts.map((p) => p.texts[0])).toEqual(["B", "A"]);
    expect(r.transfer).toHaveLength(2);
  });
  it("C13 N6 : sans manifeste, ordre reçu (jamais trié par nom) et avis NOTEBOOK_ORDER_GUESSED", () => {
    const r = boardJobReply(mod(), { op: "read", dialect: "notebook", files: [enc("X10"), enc("X2")], names: ["page10.svg", "page2.svg"], manifest: null, max: 10 });
    const parts = (r.data as { parts: BoardPart[] }).parts;
    expect(parts.map((p) => p.texts[0])).toEqual(["X10", "X2"]);
    expect(parts[0]!.warnings).toEqual([NOTEBOOK_ORDER_GUESSED]);
  });
  it("C13 N11 : un .flipchart est ouvert par FlipchartReader en une part", () => {
    const seen: unknown[] = [];
    const r = boardJobReply(mod({ flip: (n, d, e) => (seen.push(n, d, e), reader("flip")) }), { op: "flipchart", names: ["1.in"], data: new Uint8Array([1]), ends: new Uint32Array([1]) });
    expect((r.data as { parts: BoardPart[] }).parts).toHaveLength(1);
    expect(seen[0]).toEqual(["1.in"]);
  });
  it("write : fichiers de write_board_xml, aucun transfert", () => {
    const r = boardJobReply(mod(), { op: "write", format: "iwb", ops: new Float32Array(), texts: [] });
    expect(r).toEqual({ data: { files: ["content.xml", "<iwb/>"] }, transfer: [] });
  });
  it("erreur connue rendue telle quelle ; inconnue → message d'échec du sens", () => {
    const damaged = mod({ open: () => { throw new Error("fichier endommagé : xml"); } });
    expect(boardJobReply(damaged, { op: "read", dialect: "iwb", files: [enc("x")] }).data).toEqual({ error: "fichier endommagé : xml" });
    const broken = mod({ write: () => { throw new Error("autre"); } });
    expect(boardJobReply(broken, { op: "write", format: "ubz", ops: new Float32Array(), texts: [] }).data).toEqual({ error: BOARD_WRITE_FAILED_MESSAGE });
    const bare = { ContainerReader: { open: fail }, write_container: fail } as unknown as FormatsBinding;
    expect(boardJobReply(bare, { op: "read", dialect: "iwb", files: [] }).data).toEqual({ error: BOARD_FAILED_MESSAGE });
  });
  it("D29 : une panique Wasm (RuntimeError) est relancée, jamais rendue en { error }", () => {
    const panic = mod({ open: () => { throw new WebAssembly.RuntimeError("unreachable"); } });
    expect(() => boardJobReply(panic, { op: "read", dialect: "iwb", files: [enc("x")] })).toThrow(WebAssembly.RuntimeError);
  });
});
```

- [ ] **3. Tests rouges de `zipJobReply`** — ajouter à `zip-worker.test.ts` (importer `zipJobReply`, `type ZipJob`,
  `keepBoardPath`, `keepPackPath`, `unzipModelEntries` déjà exportés) :

```ts
describe("zipJobReply (cli-lot2, D20)", () => {
  type Reply = { entries?: { path: string; bytes: Uint8Array }[]; bytes?: Uint8Array; error?: string };
  const data = (j: ZipJob) => zipJobReply(j).data as Reply;
  it("op zip : ZIP stocké, son tampon transféré", () => {
    const r = zipJobReply({ op: "zip", files: [{ path: "a.txt", bytes: enc("a") }] });
    const bytes = (r.data as Reply).bytes!;
    expect(Object.keys(unzipSync(bytes))).toEqual(["a.txt"]);
    expect(r.transfer).toEqual([bytes.buffer]);
  });
  it("unzip mode board et mode pack : entrées gardées par keepBoardPath, keepPackPath", () => {
    const input = { "content.xml": enc("<iwb/>"), "videos/film.mpg": enc("v"), "manifest.json": enc("{}"), "autre.txt": enc("t") };
    const z = zipSync(input);
    expect(data({ op: "unzip", mode: "board", bytes: z }).entries!.map((e) => e.path).sort()).toEqual(Object.keys(input).filter(keepBoardPath).sort());
    expect(data({ op: "unzip", mode: "pack", bytes: z }).entries!.map((e) => e.path).sort()).toEqual(Object.keys(input).filter(keepPackPath).sort());
  });
  it("{ bytes } seul : lecture 3D inchangée", () => {
    const z = zipSync({ "a.obj": enc("o"), "b.txt": enc("t") });
    expect(data({ bytes: z }).entries!.map((e) => e.path)).toEqual(unzipModelEntries(z).map((e) => e.path));
  });
  it("erreurs (ZIP illisible, paperboard faux, .olf illisible) : { error } texte, aucun transfert", () => {
    for (const j of [{ op: "unzip", mode: "pack", bytes: enc("pas un zip") }, { op: "unzip", mode: "bamboo", bytes: enc("pas un paperboard") }, { op: "olf", bytes: enc("{") }] as ZipJob[]) {
      const r = zipJobReply(j);
      expect(typeof (r.data as Reply).error).toBe("string");
      expect(r.transfer).toEqual([]);
    }
  });
});
```

- [ ] **4. Vérifier le rouge** — `cd <wt> && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/one-shot-worker.test.ts src/platform/board-reader.test.ts src/platform/zip-worker.test.ts 2>&1 | tail -15`
  Attendu : échecs `inlineWorker`/`boardJobReply`/`zipJobReply` absents.

- [ ] **5. `inlineWorker`** — à la fin de `one-shot-worker.ts` (et une ligne d'en-tête : « cli-lot2 (DA7) :
  `inlineWorker` joue le corps d'un Worker dans le processus ») :

```ts
export interface WorkerReply {
  readonly data: unknown;
  readonly transfer: Transferable[];
}

export function inlineWorker(handle: (message: unknown) => WorkerReply | Promise<WorkerReply>): () => WorkerLike {
  return () => {
    const w: WorkerLike = {
      onmessage: null,
      onerror: null,
      postMessage(message) {
        setTimeout(() => {
          new Promise<WorkerReply>((resolve) => resolve(handle(message))).then(
            (r) => w.onmessage?.({ data: r.data }),
            (e: unknown) => w.onerror?.(e),
          );
        }, 0);
      },
      terminate() {},
    };
    return w;
  };
}
```

- [ ] **6. `boardJobReply`** — dans `board-reader.ts` : importer
  `import { hasBoardReader, hasFlipchartReader, type FormatsBinding } from "./container";` et
  `type WorkerReply` de `./one-shot-worker` ; déplacer depuis `board-worker.ts` le type `Job` (renommé `BoardJob`,
  exporté) et `partOf` ; ajouter :

```ts
export function boardJobReply(mod: FormatsBinding, job: BoardJob): WorkerReply {
  try {
    if (job.op === "flipchart") {
      if (!hasFlipchartReader(mod)) throw new Error("module des tableaux indisponible");
      const part = partOf(mod.FlipchartReader.open(job.names, job.data, job.ends));
      return { data: { parts: [part] }, transfer: [part.ops.buffer as ArrayBuffer] };
    }
    if (!hasBoardReader(mod)) throw new Error("module des tableaux indisponible");
    if (job.op === "write") return { data: { files: mod.write_board_xml(job.ops, job.texts, job.format) }, transfer: [] };
    const { files, warnings } =
      job.dialect === "notebook"
        ? notebookOrder(mod.notebook_order, job.files, job.names ?? [], job.manifest ?? null, job.max ?? job.files.length)
        : { files: job.files, warnings: [] };
    const read = files.map((xml, i) => partOf(mod.BoardReader.open(xml, job.dialect, job.dialect === "iwb" ? 1 : i + 1)));
    const parts = withLeadingWarnings(read, warnings);
    return { data: { parts }, transfer: parts.map((p) => p.ops.buffer as ArrayBuffer) };
  } catch (err) {
    if (err instanceof WebAssembly.RuntimeError) throw err; // D29 : la panique remonte (coquille ou inlineWorker)
    return { data: { error: boardErrorMessage(err, job.op === "write" ? BOARD_WRITE_FAILED_MESSAGE : BOARD_FAILED_MESSAGE) }, transfer: [] };
  }
}
```

  `board-worker.ts` devient (en-tête conservé, une phrase ajoutée : « corps dans `boardJobReply` (cli-lot2, D20) ») :

```ts
import { BOARD_FAILED_MESSAGE, BOARD_WRITE_FAILED_MESSAGE, boardErrorMessage, boardJobReply, type BoardJob } from "./board-reader";
import { loadFormatsModule } from "./container-load";

self.onmessage = async (e: MessageEvent<BoardJob>): Promise<void> => {
  const j = e.data;
  try {
    const r = boardJobReply(await loadFormatsModule(), j);
    self.postMessage(r.data, { transfer: r.transfer });
  } catch (err) {
    self.postMessage({ error: boardErrorMessage(err, j.op === "write" ? BOARD_WRITE_FAILED_MESSAGE : BOARD_FAILED_MESSAGE) });
  }
};
```

- [ ] **7. `zipJobReply`** — dans `zip-worker.ts` : renommer `WorkerMessage` en `export interface ZipJob`, importer
  `type WorkerReply` de `./one-shot-worker`, et :

```ts
export function zipJobReply(d: ZipJob): WorkerReply {
  try {
    if (d.op === "zip") {
      const bytes = zipStored(d.files ?? []);
      return { data: { bytes }, transfer: [bytes.buffer as ArrayBuffer] };
    }
    if (d.op === "olf") {
      const part = olfPart(d.bytes ?? new Uint8Array());
      return { data: { part }, transfer: [part.ops.buffer as ArrayBuffer] };
    }
    const data = d.bytes ?? new Uint8Array();
    const entries =
      d.mode === "pack" ? unzipEntries(data, keepPackPath)
      : d.mode === "board" ? unzipEntries(data, keepBoardPath)
      : d.mode === "bamboo" ? bambooEntries(data)
      : unzipModelEntries(data);
    // Deux entrées peuvent partager un tampon : cité deux fois, `postMessage` lèverait.
    return { data: { entries }, transfer: [...new Set(entries.map((x) => x.bytes.buffer as ArrayBuffer))] };
  } catch (err) {
    return { data: { error: err instanceof Error ? err.message : String(err) }, transfer: [] };
  }
}
```

  La coquille (bloc `if (typeof … WorkerGlobalScope …)`) garde sa garde et devient
  `scope.onmessage = (e) => { const r = zipJobReply(e.data); scope.postMessage(r.data, r.transfer); };`
  (`onmessage` typé `MessageEvent<ZipJob>`).

- [ ] **8. Vert** — `cd <wt> && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/one-shot-worker.test.ts src/platform/board-reader.test.ts src/platform/zip-worker.test.ts src/platform/zip-read.test.ts src/platform/bamboo.test.ts src/platform/flipchart-chaine.test.ts 2>&1 | tail -15`
  Attendu : `Test Files  6 passed`, aucun `FAIL ` ; `grep -rn "board-worker.ts?raw" apps/web/src` : vide ;
  `nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -10` : aucune `error TS`.
  Tests à garder verts : `zip-read.test.ts`, `bamboo.test.ts`, `flipchart-chaine.test.ts`, `rbpack.test.ts`
  (`c13-tableaux-navigateur.mjs` rejoué par `verifier.sh --e2e` en fin de chantier).

- [ ] **9. Commit**

```bash
git -C <wt> add apps/web/src/platform/one-shot-worker.ts apps/web/src/platform/one-shot-worker.test.ts apps/web/src/platform/board-reader.ts apps/web/src/platform/board-reader.test.ts apps/web/src/platform/board-worker.ts apps/web/src/platform/zip-worker.ts apps/web/src/platform/zip-worker.test.ts
git -C <wt> commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -F - <<'EOF'
refactor(web): extract board and zip worker bodies, add inlineWorker

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

<a id="tache-t3"></a>

### Tâche T3 — Fabriques des tableaux déplacées

**Objectif.** Les fabriques de `.iwb .ubz .notebook .olf` et les pages `.flipchart` de l'essai C13 sont **déplacées**
dans `scripts/essais/fabriques/tableaux.mjs` (jamais copiées) ; le ZIP est injecté. Scénario servi : S2 (fichiers
d'essai des tableaux pour T6, T7, T9).

**Worktree.** Isolé : `~/projets/roomboard-wt/cli-lot2--T3`. Préparer :
`cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r /home/adminjd/projets/roomboard-wt/cli-lot2/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot2/apps/web/src/wasm-formats apps/web/src/`.

**Fichiers.**
- Créer : `scripts/essais/fabriques/tableaux.mjs`, `scripts/essais/fabriques/tableaux.d.mts`
- Modifier : `scripts/essais/c13-tableaux-navigateur.mjs:29-188` (définitions retirées, import ajouté, appels 354, 413, 472, 507, 519)
- Test : `apps/web/src/platform/fabrique-tableaux.test.ts` (neuf, patron de `fabrique-flipchart.test.ts`)

**Interfaces.**
- Consomme : `solidPng(w, h, rgb)` (`scripts/essais/commun.mjs:220`), `type FabPage` (`fabriques/flipchart.d.mts:56`).
- Produit (exact, utilisé par T6, T7, T9) :

```ts
// tableaux.d.mts
import type { FabPage } from "./flipchart.mjs";
export type Zip = (files: Record<string, Uint8Array>) => Uint8Array;
export const IWB_HEAD: string;
export const NB_MANIFEST: string;
export const TIFF: Uint8Array;
export function nbSvg(body: string, head?: string): string;
export function iwbZip(zip: Zip): Uint8Array;      // 1 page, 8 objets lus, 1 vidéo non lue
export function iwbRaw3(): string;                 // XML brut, 3 pages
export function ubzZip(zip: Zip): Uint8Array;      // 1 page, 4 objets
export function notebookZip(zip: Zip): Uint8Array; // 2 pages, manifeste : page1.svg (4 objets) puis page0.svg (1)
export function olfZip(zip: Zip): Uint8Array;      // 1 page, 3 objets, fond #FFEECC
export function flipPages(): FabPage[];            // 2 pages, 5 objets en page 1 (TIFF et action non lus)
```

- Réutilise : `c13-tableaux-navigateur.mjs:30-188`, `fabriques/flipchart.mjs:360`, `commun.mjs:220` (`solidPng`) — `iwbZip(zip)`, `iwbRaw3()`, `ubzZip(zip)`, `notebookZip(zip)`, `olfZip(zip)`, `flipPages()`, `nbSvg(body, head?)`, `TIFF` avec `zip: (files: Record<string, Uint8Array>) => Uint8Array` ; PNG par `solidPng` importé ; `makeFlipchart(pages, deflate)` (nouveau module déplacé, jamais copié).
- Rapport : `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Contraintes (recopiées).**
- G1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- G2 — Aucune logique recopiée : les fabriques sont déplacées ; `enc` seul reste aussi dans l'essai C13 (une ligne).
- G4 — Fichiers d'essai fabriqués depuis le dépôt ; aucun fichier téléchargé ; écritures seulement en dossier temporaire.
- G5 — `nice -n 10` ; un test qui échoue sur un délai est rejoué une fois.
- G6 — Wasm copié comme indiqué ci-dessus.
- G7 — Auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers un par un ; aucun `--force`.
- G9 — Aucune dépendance ajoutée.

**Interdits.** Aucun octet fabriqué ne change (même XML, mêmes PNG, mêmes noms d'entrées) : l'essai C13 doit voir
exactement les mêmes fichiers. Restent dans C13 : `enc`, `hostileIwb`, `hostileNotebook`, `badOlf`, `bigOlf`,
`deepOlf`, `emptyNotebook`, `flipchart`, `flip`, `bambooEntriesOf`.

**Terminé quand.** `fabrique-tableaux.test.ts` et `fabrique-flipchart.test.ts` verts ; `node --check
scripts/essais/c13-tableaux-navigateur.mjs` sans erreur ; `grep -nE "^(function|const) (iwbZip|iwbRaw3|ubzZip|notebookZip|olfZip|flipPages|nbSvg|TIFF|NB_MANIFEST|IWB_HEAD)\b" scripts/essais/c13-tableaux-navigateur.mjs` vide ; un commit.

**Étapes.**

- [ ] **1. Test rouge** — créer `apps/web/src/platform/fabrique-tableaux.test.ts` :

```ts
import { unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { flipPages, iwbRaw3, iwbZip, nbSvg, notebookZip, olfZip, TIFF, ubzZip } from "../../../../scripts/essais/fabriques/tableaux.mjs";

const dec = (b: Uint8Array) => new TextDecoder().decode(b);
const PNG = [0x89, 0x50, 0x4e, 0x47];

describe("fabriques des tableaux (cli-lot2, D28)", () => {
  it(".iwb ZIP : content.xml, image, vidéo ; XML brut de 3 pages", () => {
    const z = unzipSync(iwbZip(zipSync));
    expect(Object.keys(z).sort()).toEqual(["content.xml", "images/carre.png", "videos/film.mpg"]);
    expect(dec(z["content.xml"]!)).toContain("<svg:video");
    expect(Array.from(z["images/carre.png"]!.subarray(0, 4))).toEqual(PNG);
    expect(iwbRaw3().match(/<svg:page /g)).toHaveLength(3);
  });
  it(".ubz, .notebook, .olf : entrées attendues", () => {
    expect(Object.keys(unzipSync(ubzZip(zipSync))).sort()).toEqual(["images/photo.png", "metadata.rdf", "page001.svg"]);
    expect(Object.keys(unzipSync(notebookZip(zipSync))).sort()).toEqual(["images/a b[1].png", "imsmanifest.xml", "page0.svg", "page1.svg"]);
    const olf = unzipSync(olfZip(zipSync));
    expect(JSON.parse(dec(olf["content.json"]!)).olf.width).toBe(3840);
  });
  it("pages .flipchart : 2 pages, PNG puis TIFF en page 1 ; nbSvg", () => {
    const pages = flipPages();
    expect(pages).toHaveLength(2);
    expect(Array.from(pages[0]!.images![0]!.bytes.subarray(0, 4))).toEqual(PNG);
    expect(pages[0]!.images![1]!.bytes).toEqual(TIFF);
    expect(nbSvg("<g/>")).toContain('viewBox="0 0 800 600"><g/></svg>');
  });
});
```

- [ ] **2. Rouge** — `cd <wt> && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/fabrique-tableaux.test.ts 2>&1 | tail -15` : échec (module absent).

- [ ] **3. Déplacer** — créer `tableaux.mjs` : en-tête
  `// Fabriques des tableaux blancs (cadrage cli-lot2, D28), déplacées de c13-tableaux-navigateur.mjs : ZIP injecté (zipSync de fflate, ou zipStored du produit), PNG par solidPng.`,
  puis `import { solidPng } from "../commun.mjs";`, `const enc = (s) => Buffer.from(s, "utf8");` et **le texte exact**
  des lignes 29-188 de C13 (`IWB_HEAD` est en ligne 29) pour `IWB_HEAD`, `iwbZip`, `iwbRaw3`, `ubzZip`, `NB_MANIFEST`, `nbSvg`, `notebookZip`,
  `olfZip`, `TIFF`, `flipPages`, chacun préfixé `export`, avec ces seuls changements : `function iwbZip(zip)`,
  `function ubzZip(zip)`, `function notebookZip(zip)`, `function olfZip(zip)`, et dans leur corps `zipSync(` →
  `zip(` (le `Buffer.from(…)` autour est gardé). Créer `tableaux.d.mts` avec le bloc Interfaces ci-dessus.

- [ ] **4. Essai C13** — dans `c13-tableaux-navigateur.mjs` : supprimer ces définitions ; ajouter
  `import { flipPages, iwbRaw3, iwbZip, nbSvg, notebookZip, olfZip, ubzZip } from "./fabriques/tableaux.mjs";` ;
  remplacer `iwbZip()` → `iwbZip(zipSync)`, `ubzZip()` → `ubzZip(zipSync)`, `notebookZip()` → `notebookZip(zipSync)`,
  `olfZip()` → `olfZip(zipSync)` (lignes 354, 413, 472, 507, 519). Retirer `solidPng` de l'import de `commun.mjs`
  seulement s'il n'est plus utilisé dans C13 (`grep -n solidPng`).

- [ ] **5. Vert** — `cd <wt> && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/fabrique-tableaux.test.ts src/platform/fabrique-flipchart.test.ts 2>&1 | tail -15`
  Attendu : `Test Files  2 passed`, 3 tests `fabriques des tableaux` présents ; `node --check scripts/essais/c13-tableaux-navigateur.mjs` code 0 ;
  `grep -n "iwbZip()\|ubzZip()\|notebookZip()\|olfZip()" scripts/essais/c13-tableaux-navigateur.mjs` : vide.
  À garder vert : `c13-tableaux-navigateur.mjs` (rejoué par `verifier.sh --e2e` en fin de chantier).

- [ ] **6. Commit**

```bash
git -C <wt> add scripts/essais/fabriques/tableaux.mjs scripts/essais/fabriques/tableaux.d.mts scripts/essais/c13-tableaux-navigateur.mjs apps/web/src/platform/fabrique-tableaux.test.ts
git -C <wt> commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -F - <<'EOF'
test(scripts): move whiteboard fixtures to fabriques/tableaux.mjs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

<a id="tache-t4"></a>

### Tâche T4 — `board-convert.ts` : lecture, écriture, ports des tableaux

**Objectif.** Extraire de `workspace.ts:608-705` la lecture d'un tableau en document (`readBoardFile`) et l'écriture
d'un `.iwb`/`.ubz` (`writeBoardFile`), et de `main.ts:365-373` le câblage des ports (`createBoardPorts`).
`workspace.ts` garde onglets, `addTab`, copie de l'onglet, `missingOf`, boîte d'enregistrement et avis ; messages et
ordre inchangés. Scénarios servis : S2 (lecture), S3 (écriture).

**Worktree.** Isolé : `~/projets/roomboard-wt/cli-lot2--T4` (sur la branche du chantier après fusion de T1 et T2).
Préparer : `cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r /home/adminjd/projets/roomboard-wt/cli-lot2/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot2/apps/web/src/wasm-formats apps/web/src/`.

**Fichiers.**
- Créer : `apps/web/src/app/board-convert.ts`, `apps/web/src/app/board-convert.test.ts`
- Modifier : `apps/web/src/app/workspace.ts:608-705` (`openBoard`, `exportBoard`) et ses imports 48-51
- Modifier : `apps/web/src/main.ts:365-373` (`board: createBoardPorts(...)`)

**Interfaces.**
- Consomme : `inlineWorker`, `WorkerReply` (T2, `one-shot-worker.ts`) pour les tests ; `BoardPorts`,
  `buildBoardDocument`, `decodeBoardList`, `boardListOf` (`board-io.ts:50,199,528,655`) ; `boardSources`,
  `flipchartSources`, `resolveBoardFormat`… (`board-files.ts`).
- Produit (exact, utilisé par T6, T7) :

```ts
export interface BoardFile { readonly name: string; readonly blob: Blob; readonly format: BoardSourceFormat }
export interface BoardReadDeps {
  readonly core: CoreFactory;
  readonly ports: BoardPorts;
  makeAssets(): AssetStore;
  readonly decode: ImageDecoder;
  now(): string;
  readonly appVersion: string;
}
/** Lève une Error au message du produit (endommagé, trop gros, sans page…). */
export function readBoardFile(file: BoardFile, deps: BoardReadDeps): Promise<{ doc: CoreDocument; assets: AssetStore; warnings: string[] }>;
export function writeBoardFile(doc: CoreDocument, assets: Pick<AssetStore, "get">, format: BoardFormat, ports: Pick<BoardPorts, "write" | "zip">): Promise<{ bytes: Uint8Array; warnings: string[] }>;
export function createBoardPorts(spawn: { readonly zip: () => WorkerLike }, codec: BoardCodec): BoardPorts;
```

- Réutilise : `main.ts:365-373` (câblage de l'amorce) — `createBoardPorts(spawn: { readonly zip: () => WorkerLike }, codec: BoardCodec): BoardPorts` dans `app/board-convert.ts` ; `main.ts` et la CLI l'appellent (nouveau, extraire).
- Réutilise : `workspace.ts:608-674` — `readBoardFile(file: { readonly name: string; readonly blob: Blob; readonly format: BoardSourceFormat }, deps: { readonly core: CoreFactory; readonly ports: BoardPorts; makeAssets(): AssetStore; readonly decode: ImageDecoder; now(): string; readonly appVersion: string }): Promise<{ doc: CoreDocument; assets: AssetStore; warnings: string[] }>` (nouveau, extraire).
- Réutilise : `workspace.ts:676-705` — `writeBoardFile(doc: CoreDocument, assets: Pick<AssetStore, "get">, format: BoardFormat, ports: Pick<BoardPorts, "write" | "zip">): Promise<{ bytes: Uint8Array; warnings: string[] }>` (nouveau, extraire).
- Réutilise : `zip-read.ts:47,62,84` — `createZipReader(spawn.zip, undefined, "board" | "bamboo")`, `createZipWriter(spawn.zip)`, `createOlfReader(spawn.zip)` (réutiliser).
- Rapport : `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne.

**Contraintes (recopiées).**
- G1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- G2 — Aucune logique recopiée : le code est **déplacé** tel quel (couper-coller), pas réécrit.
- G3 — Aucun changement Rust ; tailles Wasm inchangées (plafonds 1 572 864 o et 3 145 728 o).
- G5 — `nice -n 10` ; un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé.
- G6 — Wasm copié comme indiqué ci-dessus.
- G7 — Auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers un par un ; aucun `--force`.
- G9 — Aucune dépendance ajoutée.

**Interdits.** Ne changer aucun message, aucun ordre d'avis, aucune borne. Ne pas corriger les constats
`workspace.ts:552` (BoardSources) et `board-files.ts:89` (flipchartSources) : ils suivent le code. Ne pas toucher
`main.ts:329-335,382-390` (bibliothèque, `importPack`).

**Terminé quand.** `board-convert.test.ts` vert ; `workspace.test.ts`, `board-io.test.ts`, `board-files.test.ts`,
`import.test.ts`, `toolbar-host.test.ts` verts ; `tsc --noEmit` web sans erreur ; un commit.

**Étapes.**

- [ ] **1. Test rouge** — créer `apps/web/src/app/board-convert.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { createAssetStore } from "../core/asset-store";
import { fakeCore } from "../core/fake-core";
import { BAMBOO_NOT_FLIPCHART } from "../platform/bamboo";
import type { BoardCodec } from "../platform/board-reader";
import { inlineWorker } from "../platform/one-shot-worker";
import type { BoardPorts } from "./board-io";
import { BOARD_NO_PAGE_MESSAGE, UBZ_NOT_ZIP_MESSAGE } from "./board-files";
import { createBoardPorts, readBoardFile, writeBoardFile } from "./board-convert";

const ID = "ab".repeat(32);
const NOW = "2026-11-24T00:00:00Z";
const enc = (s: string) => new TextEncoder().encode(s);
function ports(over: Partial<BoardPorts> = {}): BoardPorts {
  return {
    unzip: async () => [],
    unbamboo: async () => [],
    zip: async (files) => new Uint8Array([files.length]),
    read: async () => [],
    readFlipchart: async () => ({ ops: new Float32Array(), texts: [], warnings: [] }),
    readOlf: async () => ({ ops: new Float32Array(), texts: [], warnings: [], total: 0 }),
    write: async () => [{ path: "content.xml", bytes: enc("<iwb/>") }],
    ...over,
  };
}
const deps = (p: BoardPorts) => ({
  core: fakeCore,
  ports: p,
  makeAssets: () => createAssetStore(async () => ID),
  decode: async (): Promise<never> => {
    throw new Error("non appelé");
  },
  now: () => NOW,
  appVersion: "0.1.0",
});

describe("board-convert (cli-lot2, DA8, D21)", () => {
  it("readBoardFile : messages de refus du produit (.ubz non ZIP, .flipchart sans Bamboo, tableau sans page)", async () => {
    await expect(readBoardFile({ name: "x.ubz", blob: new Blob([enc("texte")]), format: "ubz" }, deps(ports()))).rejects.toThrow(UBZ_NOT_ZIP_MESSAGE);
    await expect(readBoardFile({ name: "x.flipchart", blob: new Blob([enc("texte")]), format: "flipchart" }, deps(ports()))).rejects.toThrow(BAMBOO_NOT_FLIPCHART);
    const seen: unknown[] = [];
    const p = ports({ read: async (files, dialect, opts) => (seen.push(files.length, dialect, opts), []) });
    await expect(readBoardFile({ name: "x.iwb", blob: new Blob([enc("<iwb/>")]), format: "iwb" }, deps(p))).rejects.toThrow(BOARD_NO_PAGE_MESSAGE);
    expect(seen).toEqual([1, "iwb", undefined]);
  });
  it("writeBoardFile : XML écrits puis ZIP de [xml…, images…], avertissements de boardListOf", async () => {
    const doc = fakeCore.blank();
    const calls: string[] = [];
    const p = ports({
      write: async (_list, format) => (calls.push(`write:${format}`), [{ path: "content.xml", bytes: enc("<iwb/>") }]),
      zip: async (files) => (calls.push(`zip:${files.map((f) => f.path).join(",")}`), new Uint8Array([7])),
    });
    const r = await writeBoardFile(doc, createAssetStore(async () => ID), "iwb", p);
    expect(calls).toEqual(["write:iwb", "zip:content.xml"]);
    expect(r).toEqual({ bytes: new Uint8Array([7]), warnings: [] });
    doc.free();
  });
  it("createBoardPorts : ZIP en mode board et bamboo par le spawn donné ; XML par le codec", async () => {
    const sent: unknown[] = [];
    const zip = inlineWorker((m) => (sent.push(m), { data: { entries: [] }, transfer: [] }));
    const codec: BoardCodec = { read: async () => [], write: async () => [], readFlipchart: async () => ({ ops: new Float32Array(), texts: [], warnings: [] }) };
    const p = createBoardPorts({ zip }, codec);
    await p.unzip(new Blob([enc("a")]));
    await p.unbamboo(new Blob([enc("b")]));
    expect(sent.map((m) => (m as { mode: string }).mode)).toEqual(["board", "bamboo"]);
    expect(await p.read([], "iwb")).toEqual([]);
  });
});
```

- [ ] **2. Rouge** — `cd <wt> && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app/board-convert.test.ts 2>&1 | tail -15` : échec (module absent).

- [ ] **3. Écrire `board-convert.ts`** — en-tête :
  `/** Tableaux blancs sans onglet (cadrage cli-lot2, DA8, D21) : lecture d'un .iwb .ubz .notebook .olf .flipchart en document, écriture d'un .iwb .ubz, ports branchés sur les Workers ; code déplacé de workspace.ts (openBoard, exportBoard) et de main.ts. La page et la CLI passent par ici. Constats suivis, non corrigés : workspace.ts:552 (BoardSources), board-files.ts:89 (flipchartSources). */`
  Imports : `PDF_MAX_PAGES, type CoreDocument, type CoreFactory` (`../core/api`), `type AssetStore`
  (`../core/asset-store`), `BAMBOO_NOT_FLIPCHART, hasBambooMagic` (`../platform/bamboo`), `type BoardCodec, type BoardPart`
  (`../platform/board-reader`), `type ImageDecoder` (`../platform/image-import`), `hasZipMagic` (`../platform/import`),
  `type WorkerLike` (`../platform/one-shot-worker`), `createOlfReader, createZipReader, createZipWriter`
  (`../platform/zip-read`), `boardListOf, buildBoardDocument, decodeBoardList, type BoardFormat, type BoardListPage, type BoardPorts, type BoardSourceFormat`
  (`./board-io`), `BOARD_MAX_OBJECTS, BOARD_NO_PAGE_MESSAGE, boardFirstPagesMessage, boardNoContentMessage, boardObjectCount, boardSources, flipchartSources, mergeBoardWarnings, resolveBoardFormat, UBZ_NOT_ZIP_MESSAGE, type BoardSources`
  (`./board-files`). Corps :

```ts
export async function readBoardFile(file: BoardFile, deps: BoardReadDeps): Promise<{ doc: CoreDocument; assets: AssetStore; warnings: string[] }> {
  const board = deps.ports;
  // ↓ texte déplacé tel quel de workspace.ts, depuis `const head = …` jusqu'à la boucle `for (const p of parts)` incluse
  //   (signature, branches flipchart / ZIP / .iwb brut, budget BOARD_MAX_OBJECTS).
  // …
  if (pages.length === 0) throw new Error(BOARD_NO_PAGE_MESSAGE);
  const built = await buildBoardDocument(deps.core, pages, src.media, {
    makeAssets: () => deps.makeAssets(),
    decode: deps.decode,
    now: deps.now(),
    appVersion: deps.appVersion,
  });
  const warnings = [...(total > PDF_MAX_PAGES ? [boardFirstPagesMessage(total)] : []), ...mergeBoardWarnings([parts.flatMap((p) => p.warnings), built.warnings])];
  return { doc: built.doc, assets: built.assets, warnings };
}

export async function writeBoardFile(doc: CoreDocument, assets: Pick<AssetStore, "get">, format: BoardFormat, ports: Pick<BoardPorts, "write" | "zip">): Promise<{ bytes: Uint8Array; warnings: string[] }> {
  const r = await boardListOf(doc, assets, format);
  const xml = await ports.write(r.list, format);
  return { bytes: await ports.zip([...xml, ...r.files]), warnings: r.warnings };
}

export function createBoardPorts(spawn: { readonly zip: () => WorkerLike }, codec: BoardCodec): BoardPorts {
  return {
    unzip: createZipReader(spawn.zip, undefined, "board"),
    unbamboo: createZipReader(spawn.zip, undefined, "bamboo"),
    zip: createZipWriter(spawn.zip),
    read: (files, format, opts) => codec.read(files, format, opts),
    readFlipchart: (entries) => codec.readFlipchart(entries),
    readOlf: createOlfReader(spawn.zip),
    write: (list, format) => codec.write(list, format),
  };
}
```

- [ ] **4. Page** — `workspace.ts`, `openBoard` devient :

```ts
async openBoard(file) {
  const name = baseName(file.name);
  const board = deps.board;
  if (board === undefined) return false;
  if (full()) {
    await say(TOO_MANY_TABS);
    return false;
  }
  try {
    const built = await readBoardFile(file, { core, ports: board, makeAssets, decode: deps.decode ?? ((b, k) => decodeImage(b, k)), now: deps.now, appVersion: APP_VERSION });
    if ((await addTab(built.doc, { name: boardTabName(name, file.format), target: null }, built.assets)) === null) return false;
    if (built.warnings.length > 0) await say(boardWarningsMessage(name, built.warnings));
    return true;
  } catch (e) {
    await say(`Ouverture impossible (${name}) : ${messageOf(e)}`);
    return false;
  }
},
```

  et dans `exportBoard`, remplacer les trois lignes `boardListOf` / `board.write` / `board.zip` par
  `const r = await writeBoardFile(doc, tab.assets, format, board);`, puis
  `const saved = await files.save(boardExportName(tab.files.name(), format), r.bytes);` et
  `if (saved) await say(boardSavedMessage(format, r.warnings));`. Importer `readBoardFile, writeBoardFile` de
  `./board-convert` ; retirer les imports devenus inutiles (tsc les signale). `main.ts` : importer `createBoardPorts`
  de `./app/board-convert` et remplacer l'objet `board: { … }` (365-373) par
  `board: createBoardPorts({ zip: spawnZipWorker }, boards),`.

- [ ] **5. Vert** — `cd <wt> && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app/board-convert.test.ts src/app/workspace.test.ts src/app/board-io.test.ts src/app/board-files.test.ts src/platform/import.test.ts src/app/toolbar-host.test.ts 2>&1 | tail -15`
  Attendu : `Test Files  6 passed`, 3 tests `board-convert` présents, aucun `FAIL ` ;
  `nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -10` : aucune `error TS`.
  Tests à garder verts cités par le cadrage : `workspace.test.ts` (openBoard, exportBoard), `board-io.test.ts`,
  `board-files.test.ts` ; `c13-tableaux-navigateur.mjs` rejoué par `verifier.sh --e2e` en fin de chantier.

- [ ] **6. Commit**

```bash
git -C <wt> add apps/web/src/app/board-convert.ts apps/web/src/app/board-convert.test.ts apps/web/src/app/workspace.ts apps/web/src/main.ts
git -C <wt> commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -F - <<'EOF'
refactor(web): move board read, write and ports to board-convert

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

<a id="tache-t5"></a>

### Tâche T5 — CLI : insérer et exporter un `.rbitem`, `--grid`, `covered`

**Objectif.** La CLI insère un `.rbitem` (objets ou grille) par le chemin du produit (`createImporter` → `rbitem` →
`ImageTarget.insertFragment` → `fragments.insertResource`), exporte par `encodeIds` (ferme le constat
`exporter.ts:2`) et `encodeGrid` (`export --grid`, op `{"op":"export","grid":true}`). `FORMAT_LOTS` gagne `covered`
par format et par sens ; `.rbitem` passe couvert en lecture. Scénario servi : **S1**.

**Worktree.** Isolé : `~/projets/roomboard-wt/cli-lot2--T5` (après fusion de T1). Préparer :
`cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r /home/adminjd/projets/roomboard-wt/cli-lot2/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot2/apps/web/src/wasm-formats apps/web/src/`
(vrai Wasm exigé : les tests tournent sous `ROOMBOARD_WASM_REQUIRED=1`).

**Fichiers.**
- Créer : `apps/cli/src/fragment-view.ts`, `apps/cli/src/fragment-view.test.ts`, `apps/cli/src/rbitem.test.ts`
- Modifier : `apps/cli/src/target.ts:18-35`, `target.test.ts`, `exporter.ts`, `importer.ts:87-106` (cible),
  `session.ts:30-37,169-175,238-252`, `main.ts` (export), `formats.ts`, `formats.test.ts`

**Interfaces.**
- Consomme (T1) : `createFragmentOps<T>`, `FragmentTab`, `FragmentOps<T>`, `encodeIds`, `encodeGrid`,
  `NO_GRID_MESSAGE`, `MISSING_EXPORT_MESSAGE`, `GRID_NAME` (`apps/web/src/app/fragments.ts`).
- Produit (exact, utilisé par T6, T7, T9) :

```ts
// fragment-view.ts
export const SCENE: StageRect; // déplacé de target.ts (target.ts le réexporte : export { SCENE } from "./fragment-view")
export interface CliPage { readonly tab: CliTab; readonly page: string }
export function cliView(p: CliPage, notices: string[]): FragmentTab;
export function cliFragments(deps: { readonly io: ContainerIO; readonly core: Pick<CoreFactory, "blank">; now(): string; readonly notices: string[] }): FragmentOps<CliPage>;
// target.ts
export function headlessTarget(tab: CliTab, page: string, notices: string[], fragments: FragmentOps<CliPage>): ImageTarget;
// session.ts : SessionDeps gagne
readonly fragments: FragmentOps<CliPage>;
// exporter.ts
export interface ExportRequest { readonly to: string; readonly page?: string | undefined; readonly ids?: readonly string[] | undefined; readonly name?: string | undefined; readonly grid?: boolean | undefined }
export function exportFragment(session: Session, req: ExportRequest): Promise<{ file: string; kind: "fragment"; elements: number } | { file: string; kind: "grid" }>;
// formats.ts
export interface Coverage { readonly read: boolean; readonly write: boolean }
export interface FormatEntry { readonly read: Lot | null; readonly write: Lot | null; readonly handler: string; readonly covered: Coverage; readonly notes: readonly string[] }
```

- Réutilise : `FragmentTab` (T1), `anchorOf` (`apps/web/src/platform/image-import.ts:146`), `SCENE` (`apps/cli/src/target.ts:16`), `IDENTITY` (`apps/web/src/engine/camera.ts:12`) — nouveau module `apps/cli/src/fragment-view.ts` : `interface CliPage { readonly tab: CliTab; readonly page: string }` ; `cliView(p: CliPage, notices: string[]): FragmentTab` (`state` = `{ page, selection: [] }`, `anchor` = `anchorOf(SCENE, IDENTITY, at)`, `run`/`insertFragment`/`insertPages` sur `tab.doc` avec la page, refus → avis, null) ; `cliFragments(deps: { io; core; now(); notices }): FragmentOps<CliPage>`.
- Réutilise : `apps/cli/src/target.ts:18` — `headlessTarget(tab: CliTab, page: string, notices: string[], fragments: FragmentOps<CliPage>): ImageTarget` ; `insertFragment: async (b, at, i, name) => (await fragments.insertResource({ tab, page }, b, name, at, i)) === "inserted"` ; `run` = `cliView(…).run` (étendre).
- Réutilise : `apps/web/src/app/fragments.ts:56` — `createFragmentOps<T>(deps: FragmentDeps<T>): FragmentOps<T>` ; appel `insertResource(tab: T, bytes, name, at, index?)` (appelé par `cliFragments`).
- Réutilise : `fragments.ts:147` — `encodeIds(tab, page, ids, name?, action?)` (appelé par `exportFragment`).
- Réutilise : `fragments.ts:167` — `encodeGrid(tab: T, name?)` (appelé par `export --grid`).
- Réutilise : `apps/cli/src/formats.ts:12,55,80-89` — `FormatEntry` gagne `covered: { read: boolean; write: boolean }` ; `importBlocked`, `exportBlocked`, `formatRows` le lisent ; `LOT_LIVRE` = plus haut lot couvert (étendre).
- Rapport : `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne.

**Contraintes (recopiées).**
- G1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- G2 — Aucune logique recopiée (0281) : placement, cascade, adoption des assets, grille et encodage passent par `fragments.ts` ; `exporter.ts` n'appelle plus `doc.extract` ni `io.encode`.
- G3 — Aucun changement Rust ; tailles Wasm inchangées (plafonds 1 572 864 o et 3 145 728 o).
- G4 — Fichiers d'essai fabriqués (PNG par `pngBytes`) ; écritures seulement sous `tmpDir()`.
- G5 — `nice -n 10` ; un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé.
- G6 — Wasm copié comme indiqué ci-dessus.
- G7 — Auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers un par un ; aucun `--force`.
- G8 — D15 : la ligne `.rbitem` de `FORMAT_LOTS` change ici avec ses tests ; le contrôle de `cli-essai.mjs` est écrit en T9 (DA10).
- G9 — Aucune dépendance ajoutée.

**Interdits.** Ne pas créer de vue sans écran ailleurs que `fragment-view.ts`. Ne pas changer le schéma
`roomboard-cli/1` ni la sortie `{ file, kind: "fragment", elements }` de l'export d'objets. Ne pas toucher `.iwb`,
`.ubz`, `.rbpack` dans `FORMAT_LOTS` (T6, T7, T9). Ids insérés par une op `import` non référençables par `$n` (H19).

**Terminé quand.** Suite CLI verte sous `ROOMBOARD_WASM_REQUIRED=1`, tests `S1 —` et `RF1 —` présents ;
`pnpm --filter @roomboard/cli build` OK (tsc compris) ; un commit.

**Étapes.**

- [ ] **1. Tests rouges** — créer `apps/cli/src/rbitem.test.ts` :

```ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import type { CoreDocument } from "../../web/src/core/api";
import { NO_GRID_MESSAGE } from "../../web/src/app/fragments";
import { main } from "./main";
import { nodeSession } from "./session";
import { describeWasm, memoryIO, pngBytes, tmpDir, type Json } from "./testing";

const rect = { type: "AddShape", page: "$page:0", shape: "rect", x0: 10, y0: 20, x1: 110, y1: 220, style: { color: "#1e40af", width: 4 }, fill: "#fde68a" };
const GRID = { visible: true, snap: false, above: false, levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#000000", line: "solid", lineWidth: 1, snap: false, visible: true }] };
const centreOf = (d: CoreDocument, ids: readonly string[]): [number, number] => {
  const b = d.bounds(ids)!;
  return [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
};
const sizeOf = (d: CoreDocument, id: string): [number, number] => {
  const b = d.bounds([id])!;
  return [b.x1 - b.x0, b.y1 - b.y0];
};
async function source(dir: string): Promise<{ a: string; sel: string }> {
  const a = join(dir, "a.roomboard");
  const png = join(dir, "i.png");
  const sel = join(dir, "sel.rbitem");
  writeFileSync(png, pngBytes(40, 30));
  expect(await main(["new", a], memoryIO())).toBe(0);
  expect(await main(["run", a, "--save"], memoryIO([JSON.stringify(rect), JSON.stringify({ op: "import", files: [png], at: [600, 400] })]))).toBe(0);
  expect(await main(["export", a, sel, "--all"], memoryIO())).toBe(0);
  return { a, sel };
}

describeWasm("S1 — insérer un .rbitem (D18, D19)", () => {
  it("S1 — import --at 400,300 dans un tableau existant : sortes, styles, tailles, centre des bornes, assets", async () => {
    const dir = tmpDir();
    const { a, sel } = await source(dir);
    const b = join(dir, "b.roomboard");
    expect(await main(["new", b], memoryIO())).toBe(0);
    const io = memoryIO();
    expect(await main(["import", b, sel, "--at", "400,300"], io)).toBe(0);
    expect(io.json()[0]).toMatchObject({ inserted: ["sel.rbitem"], refused: [], failed: [] });
    const s = await nodeSession(memoryIO());
    const da = (await s.open(a)).session.doc;
    const db = (await s.open(b)).session.doc;
    const ea = da.elementIds(da.pageIds()[0]!);
    const eb = db.elementIds(db.pageIds()[0]!);
    expect(eb.map((id) => db.element(id)!.kind)).toEqual(ea.map((id) => da.element(id)!.kind));
    expect(eb.map((id) => (db.element(id) as { style?: unknown }).style)).toEqual(ea.map((id) => (da.element(id) as { style?: unknown }).style));
    expect(eb.map((id) => sizeOf(db, id))).toEqual(ea.map((id) => sizeOf(da, id)));
    const [cx, cy] = centreOf(db, eb);
    expect(cx).toBeCloseTo(400, 6);
    expect(cy).toBeCloseTo(300, 6);
    expect(db.citedAssets()).toEqual(da.citedAssets());
  });
  it("S1 — run --new --out avec {op:import} : le tableau neuf contient les objets, centrés sur la scène", async () => {
    const dir = tmpDir();
    const { sel } = await source(dir);
    const c = join(dir, "c.roomboard");
    expect(await main(["run", "--new", "--out", c], memoryIO([JSON.stringify({ op: "import", files: [sel] })]))).toBe(0);
    const s = await nodeSession(memoryIO());
    const dc = (await s.open(c)).session.doc;
    const ids = dc.elementIds(dc.pageIds()[0]!);
    expect(ids).toHaveLength(2);
    const [cx, cy] = centreOf(dc, ids);
    expect(cx).toBeCloseTo(960, 6);
    expect(cy).toBeCloseTo(540, 6);
  });
  it("S1 — export --grid puis import : la page de b a la grille de a ; page sans grille : code 1 ; --grid --all : code 2", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    const b = join(dir, "b.roomboard");
    const g = join(dir, "g.rbitem");
    expect(await main(["new", a], memoryIO())).toBe(0);
    expect(await main(["new", b], memoryIO())).toBe(0);
    const none = memoryIO();
    expect(await main(["export", a, g, "--grid"], none)).toBe(1);
    expect(none.errors()[0].error.message).toContain(NO_GRID_MESSAGE);
    expect(await main(["run", a, "--save"], memoryIO([JSON.stringify({ type: "SetGrid", page: "$page:0", grid: GRID })]))).toBe(0);
    const io = memoryIO();
    expect(await main(["export", a, g, "--grid"], io)).toBe(0);
    expect(io.json()).toEqual([{ file: g, kind: "grid" }]);
    expect(await main(["import", b, g], memoryIO())).toBe(0);
    const stA = memoryIO();
    const stB = memoryIO();
    await main(["state", a], stA);
    await main(["state", b], stB);
    expect(stB.json()[0].pages[0].page.grid).toEqual(stA.json()[0].pages[0].page.grid);
    expect(await main(["export", a, g, "--grid", "--all"], memoryIO())).toBe(2);
  });
  it("op export grid dans run : kind grid", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    const g = join(dir, "g.rbitem");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const io = memoryIO([JSON.stringify({ type: "SetGrid", page: "$page:0", grid: GRID }), JSON.stringify({ op: "export", to: g, grid: true })]);
    expect(await main(["run", a], io)).toBe(0);
    expect((io.json() as Json[])[1]).toMatchObject({ op: 2, ok: true, file: g, kind: "grid" });
  });
  it("RF1 — import --page : les objets arrivent sur la page demandée, pas sur la première", async () => {
    const dir = tmpDir();
    const { sel } = await source(dir);
    const b = join(dir, "b.roomboard");
    expect(await main(["new", b], memoryIO())).toBe(0);
    expect(await main(["run", b, "--save"], memoryIO([JSON.stringify({ type: "AddPage", after: "$page:0" })]))).toBe(0);
    const st = memoryIO();
    await main(["state", b], st);
    const p2 = st.json()[0].pages[1].page.id;
    expect(await main(["import", b, sel, "--page", p2], memoryIO())).toBe(0);
    const after = memoryIO();
    await main(["state", b], after);
    const pages = after.json()[0].pages;
    expect(pages[0].elements).toHaveLength(0);
    expect(pages[1].elements).toHaveLength(2);
  });
});
```

  Créer `apps/cli/src/fragment-view.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { CoreDocument } from "../../web/src/core/api";
import { createAssetStore } from "../../web/src/core/asset-store";
import { cliView, SCENE } from "./fragment-view";

const change = { pages: [], ids: ["e"], removed: [], full: false, version: 1 };
describe("cliView (D17, H7)", () => {
  it("état sans sélection, ancre sur la scène fixe (centre sans point), page passée au cœur", () => {
    const calls: unknown[] = [];
    const doc = { insertFragment: (...a: unknown[]) => (calls.push(a), change), insertPages: (...a: unknown[]) => (calls.push(a), change) } as unknown as CoreDocument;
    const v = cliView({ tab: { doc, assets: createAssetStore(), file: null }, page: "p2" }, []);
    expect(v.state()).toEqual({ page: "p2", selection: [] });
    expect(v.anchor(null)).toEqual([SCENE.width / 2, SCENE.height / 2]);
    expect(v.anchor({ x: 400, y: 300 })).toEqual([400, 300]);
    const src = {} as CoreDocument;
    v.insertFragment(src, 3, 4);
    v.insertPages(src);
    expect(calls).toEqual([[src, "p2", 3, 4], [src, "p2"]]);
  });
  it("refus du cœur : null et avis gardé", () => {
    const doc = { apply: () => { throw new Error("page inconnue"); } } as unknown as CoreDocument;
    const notices: string[] = [];
    expect(cliView({ tab: { doc, assets: createAssetStore(), file: null }, page: "p1" }, notices).run({ type: "Delete", ids: [] })).toBeNull();
    expect(notices).toEqual(["page inconnue"]);
  });
});
```

  `target.test.ts` : passer un 4e argument `fragments` aux deux appels, et remplacer
  `expect(t.insertFragment).toBeUndefined();` par un test d'appel :

```ts
it("insertFragment : fragments.insertResource({ tab, page }, octets, nom, at, rang) ; vrai si « inserted »", async () => {
  const doc = {} as CoreDocument;
  const tab = { doc, assets: createAssetStore(), file: null };
  const seen: unknown[] = [];
  const fragments = { insertResource: async (...a: unknown[]) => (seen.push(a), "inserted") } as unknown as FragmentOps<CliPage>;
  const t = headlessTarget(tab, "p1", [], fragments);
  const bytes = new Uint8Array([1]);
  expect(await t.insertFragment!(bytes, { x: 1, y: 2 }, 3, "x.rbitem")).toBe(true);
  expect(seen).toEqual([[{ tab, page: "p1" }, bytes, "x.rbitem", { x: 1, y: 2 }, 3]]);
});
```

  (`fragments` des deux tests existants : `{} as unknown as FragmentOps<CliPage>` ; imports `type FragmentOps` de
  `../../web/src/app/fragments`, `type CliPage` de `./fragment-view`.)

  `formats.test.ts` : dans « lot 1 : … », la liste lue devient
  `[".jpeg", ".jpg", ".png", ".rbitem", ".roomboard", ".xlsm", ".xlsx"]`, la ligne `notes … toContain("state")`
  devient `toContain("--grid")`, la ligne `.rbitem` devient
  `expect.objectContaining({ ext: ".rbitem", read: true, write: true, readLot: 2, writeLot: 1 })` ; dans
  `importBlocked`, `expect(importBlocked("x.rbitem")).toBeNull();` ; ajouter :

```ts
it("D27 : covered — toute entrée d'un lot ≤ LOT_LIVRE est couverte ; un sens couvert a un lot", () => {
  for (const [ext, e] of Object.entries(FORMAT_LOTS)) {
    if (e.read !== null && e.read <= LOT_LIVRE) expect(e.covered.read, ext).toBe(true);
    if (e.write !== null && e.write <= LOT_LIVRE) expect(e.covered.write, ext).toBe(true);
    if (e.covered.read) expect(e.read, ext).not.toBeNull();
    if (e.covered.write) expect(e.write, ext).not.toBeNull();
  }
});
```

- [ ] **2. Rouge** — `cd <wt> && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli test 2>&1 | tail -20`
  Attendu : échecs (`fragment-view` absent, `.rbitem` code 3, `covered` indéfini).

- [ ] **3. `fragment-view.ts`** :

```ts
/**
 * Vue sans écran d'une page de la CLI (cadrage cli-lot2, D17, D18) : le port `FragmentTab` de `fragments.ts` sur un
 * onglet de la CLI et une page ; scène fixe 1920 × 1080 et caméra identité (H7) ; un refus du cœur devient un avis.
 */
import { createFragmentOps, type FragmentOps, type FragmentTab } from "../../web/src/app/fragments";
import type { ContainerIO } from "../../web/src/app/container-io";
import type { Change, CoreFactory } from "../../web/src/core/api";
import { PAGE_HEIGHT, PAGE_WIDTH } from "../../web/src/core/api";
import { IDENTITY } from "../../web/src/engine/camera";
import { APP_VERSION, messageOf } from "../../web/src/platform/controller";
import { anchorOf, type StageRect } from "../../web/src/platform/image-import";
import type { CliTab } from "./session";

export const SCENE: StageRect = Object.freeze({ left: 0, top: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT });

export interface CliPage {
  readonly tab: CliTab;
  readonly page: string;
}

export function cliView(p: CliPage, notices: string[]): FragmentTab {
  const { tab, page } = p;
  const guard = (f: () => Change): Change | null => {
    try {
      return f();
    } catch (e) {
      notices.push(messageOf(e));
      return null;
    }
  };
  return {
    assets: tab.assets,
    doc: tab.doc,
    state: () => ({ page, selection: [] }),
    anchor: (at) => anchorOf(SCENE, IDENTITY, at),
    run: (cmd) => guard(() => tab.doc.apply(cmd)),
    insertFragment: (src, dx, dy) => guard(() => tab.doc.insertFragment(src, page, dx, dy)),
    insertPages: (src) => guard(() => tab.doc.insertPages(src, page)),
  };
}

export function cliFragments(deps: { readonly io: ContainerIO; readonly core: Pick<CoreFactory, "blank">; now(): string; readonly notices: string[] }): FragmentOps<CliPage> {
  return createFragmentOps<CliPage>({
    io: deps.io,
    core: deps.core,
    now: () => deps.now(),
    appVersion: APP_VERSION,
    say: async (m) => {
      deps.notices.push(m);
    },
    alive: () => true,
    view: (p) => cliView(p, deps.notices),
  });
}
```

- [ ] **4. `target.ts`** — retirer `SCENE`, `messageOf`, `PAGE_*` et ajouter `export { SCENE } from "./fragment-view";` ;
  en-tête : remplacer « `insertFragment` absent au lot 1 » par « `insertFragment` : `fragments.insertResource` (lot 2,
  D18) » ; signature et corps :

```ts
export function headlessTarget(tab: CliTab, page: string, notices: string[], fragments: FragmentOps<CliPage>): ImageTarget {
  const view = cliView({ tab, page }, notices);
  return {
    assets: tab.assets,
    page: () => page,
    camera: () => IDENTITY,
    stageRect: () => SCENE,
    measure: () => measureOrFallback(null),
    textStyle: () => ({ color: DEFAULT_PEN_STYLE.color, size: DEFAULT_TEXT_SIZE }),
    run: (cmd) => view.run(cmd),
    insertFragment: async (bytes, at, index, name) => (await fragments.insertResource({ tab, page }, bytes, name, at, index)) === "inserted",
  };
}
```

  `importer.ts:287` : `target: () => headlessTarget(tab, page, notices, session.deps.fragments),`.

- [ ] **5. `session.ts`** — `SessionDeps` gagne `readonly fragments: FragmentOps<CliPage>;` ; `nodeSession` :
  `const now = (): string => nowOf(io.env);` puis
  `return createSession({ core, io: containerIO, notices, formats, now, fragments: cliFragments({ io: containerIO, core, now, notices }) });`.
  Op `export` de `runCli` : accepter `grid` et `name` :

```ts
case "export": {
  const ids = args["ids"];
  if (ids !== undefined && (!Array.isArray(ids) || !ids.every((i) => typeof i === "string"))) throw new CliError("usage", "ids : liste d'ids attendue");
  const grid = args["grid"];
  if (grid !== undefined && typeof grid !== "boolean") throw new CliError("usage", "grid : booléen attendu");
  return { ...(await exportFragment(session, { to: needString(args, "to"), page: optString(args, "page"), ids: ids as string[] | undefined, name: optString(args, "name"), grid: grid === true })) };
}
```

- [ ] **6. `exporter.ts`** — en-tête : « Export en `.rbitem` (cadrage cli-lot2, D19) : objets par `encodeIds`, grille par
  `encodeGrid` (`fragments.ts`) ; image absente : avis du produit `MISSING_EXPORT_MESSAGE`, code 1 ; page sans grille :
  `NO_GRID_MESSAGE`, code 1 (H21) » ; `checkExportTarget` inchangé ; `exportFragment` :

```ts
export async function exportFragment(session: Session, req: ExportRequest): Promise<{ file: string; kind: "fragment"; elements: number } | { file: string; kind: "grid" }> {
  checkExportTarget(req.to);
  const tab = session.active();
  const page = pageOf(tab, req.page);
  const name = req.name ?? basename(req.to).replace(/\.rbitem$/i, "");
  const { notices, fragments } = session.deps;
  const before = notices.length;
  const refused = (fallback: string): CliError => new CliError("command", notices.slice(before).join(" ; ") || fallback);
  if (req.grid === true) {
    if (req.ids !== undefined) throw new CliError("usage", "--grid exclut --ids et --all");
    let bytes: Uint8Array | null;
    try {
      bytes = await fragments.encodeGrid({ tab, page }, name);
    } catch (e) {
      throw asCliError(e, "command");
    }
    if (bytes === null) throw refused(NO_GRID_MESSAGE);
    await session.write(req.to, bytes);
    return { file: req.to, kind: "grid" };
  }
  const ids = req.ids ?? tab.doc.elementIds(page);
  if (ids.length === 0) throw new CliError("command", "rien à exporter : aucun objet");
  let out: { readonly bytes: Uint8Array; readonly elements: number } | null;
  try {
    out = await fragments.encodeIds({ tab, page }, page, ids, name, "export");
  } catch (e) {
    throw asCliError(e, "command");
  }
  if (out === null) throw refused(MISSING_EXPORT_MESSAGE);
  await session.write(req.to, out.bytes);
  return { file: req.to, kind: "fragment", elements: out.elements };
}
```

  Retirer les imports devenus inutiles (`CoreDocument`, `APP_VERSION`).

- [ ] **7. `main.ts` export** — `USAGE.export = "export <fichier.roomboard> <sortie.rbitem> [--page <id>] [--ids a,b | --all | --grid] [--name <nom>]"` ;
  spec `parseArgs(args, { "--page": "value", "--ids": "value", "--all": "bool", "--grid": "bool", "--name": "value" })` ;
  après le contrôle `--ids`/`--all` : `const grid = p.flags.has("--grid");`
  `if (grid && (idsText !== undefined || p.flags.has("--all"))) throw new CliError("usage", "--grid exclut --ids et --all");` ;
  appel : `exportFragment(session, { to, page: flagStr(p, "--page"), ids, name: flagStr(p, "--name"), grid })`.

- [ ] **8. `formats.ts`** — remplacer le modèle par `covered` (en-tête : « D27 (cli-lot2) : le code 3 se lit sur
  `covered`, par format et par sens ; `LOT_LIVRE` = plus haut lot dont toutes les entrées sont couvertes, un test
  l'exige ») :

```ts
export interface Coverage {
  readonly read: boolean;
  readonly write: boolean;
}
export interface FormatEntry {
  readonly read: Lot | null;
  readonly write: Lot | null;
  readonly handler: string;
  /** D27 : sens branchés dans la CLI. */
  readonly covered: Coverage;
  readonly notes: readonly string[];
}
const make = (read: Lot | null, write: Lot | null, handler: string, covered: Coverage, notes: readonly string[]): FormatEntry =>
  Object.freeze({ read, write, handler, covered: Object.freeze({ ...covered }), notes: Object.freeze([...notes]) });
/** Entrée dont seuls les sens du lot 1 sont couverts. */
const entry = (read: Lot | null, write: Lot | null, handler: string, ...notes: string[]): FormatEntry =>
  make(read, write, handler, { read: read === 1, write: write === 1 }, notes);
/** Entrée branchée par un chantier du lot 2 : sens couverts donnés. */
const branched = (read: Lot | null, write: Lot | null, handler: string, covered: Coverage, ...notes: string[]): FormatEntry =>
  make(read, write, handler, covered, notes);
```

  Ligne `.rbitem` : `[".rbitem", branched(2, 1, "rbitem", { read: true, write: true }, "insertion par `import` ; `--grid`")],` ;
  `importBlocked` : `return e === null || e.read === null || e.covered.read ? null : e.read;` ; `exportBlocked` :
  `… e.write === null || e.covered.write ? null : e.write;` ; `formatRows` :
  `read: e.covered.read, write: e.covered.write` ; supprimer `delivered`. `LOT_LIVRE` reste `1` (T9 le passe à 2).

- [ ] **9. Vert** — `cd <wt> && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli test 2>&1 | tail -20`
  Attendu : tous les fichiers `passed`, `Tests  N passed` avec N ≥ 84 + 10, aucun `FAIL `, aucun `skipped` ;
  `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run -t "S1" 2>&1 | tail -6` : ≥ 3 tests ;
  `nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -5` : sans erreur. Tests à garder verts : `export.test.ts`
  (S4 du lot 1, sortie `{ file, kind: "fragment", elements: 2 }`), `import.test.ts`, `main.test.ts`, `session.test.ts`.

- [ ] **10. Commit**

```bash
git -C <wt> add apps/cli/src/fragment-view.ts apps/cli/src/fragment-view.test.ts apps/cli/src/rbitem.test.ts apps/cli/src/target.ts apps/cli/src/target.test.ts apps/cli/src/exporter.ts apps/cli/src/importer.ts apps/cli/src/session.ts apps/cli/src/main.ts apps/cli/src/formats.ts apps/cli/src/formats.test.ts
git -C <wt> commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -F - <<'EOF'
feat(cli): insert .rbitem through fragments, export via encodeIds and --grid

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

<a id="tache-t8"></a>

### Tâche T8 — CLI : bibliothèque sur disque (fonctions)

**Objectif.** Une bibliothèque de ressources sur un dossier, sur `createResourceLibrary` et `createTauriLibraryFiles`
avec un port `node:fs` ; trois fonctions `libraryList`, `libraryImport`, `libraryExport` (la commande arrive en T9).
Scénario servi : **S4**.

**Worktree.** Isolé : `~/projets/roomboard-wt/cli-lot2--T8` (après fusion de T2). Préparer :
`cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r /home/adminjd/projets/roomboard-wt/cli-lot2/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot2/apps/web/src/wasm-formats apps/web/src/`
(vrai Wasm exigé).

**Fichiers.** Créer : `apps/cli/src/library.ts`, `apps/cli/src/library.test.ts`.

**Interfaces.**
- Consomme (T2) : `inlineWorker`, `zipJobReply`, `type ZipJob`.
- Produit (exact, utilisé par T9) :

```ts
export const nodeDirFs: TauriFs & TauriDirFs;
export function nodeZip(): LibraryZip;
export interface CliLibraryDeps { readonly core: CoreFactory; readonly codec: Pick<ContainerCodec, "read">; now(): string }
export function openLibrary(dir: string, deps: CliLibraryDeps): ResourceLibrary;
export interface LibraryItem { readonly path: string; readonly name: string; readonly kind: string | null; readonly keywords: readonly string[]; readonly description: string }
export function libraryList(lib: ResourceLibrary, folder: string): Promise<{ folder: string; folders: readonly string[]; items: LibraryItem[] }>;
/** `.rbpack` exigé (usage sinon) ; paquet refusé : CliError command, rien d'écrit (library.ts:294). */
export function libraryImport(lib: ResourceLibrary, pack: string): Promise<{ folder: string; count: number; notices: string[] }>;
/** Sortie `.rbpack` exigée (usage sinon) ; trop gros : CliError command. */
export function libraryExport(lib: ResourceLibrary, out: string, folder: string): Promise<{ file: string; name: string; skipped: readonly string[] }>;
```

- Réutilise : `zip-read.ts:47,62` — `nodeZip(): LibraryZip` = `{ unzip: createZipReader(inlineWorker(zipJobReply), undefined, "pack"), zip: createZipWriter(inlineWorker(zipJobReply)) }`, dans `apps/cli/src/library.ts` (réutiliser).
- Réutilise : `library.ts:126,260,294,353` ; `library-files.ts:193` — `createResourceLibrary({ files: [createTauriLibraryFiles(nodeDirFs, dir, "mine")], zip: nodeZip(), now, appVersion, kindOf: resourceKindReader(core, codec) })` ; `importPack(bytes, name)`, `exportPack("mine", folder)`, `refresh()` + `folder("mine", f)` ; `importedMessage` (réutiliser).
- Réutilise : `apps/cli/src/disk.ts:9` (`readBytes`), `:49` (`writeAtomic`, H8 du lot 1) — `nodeDirFs.readFile = readBytes`, `nodeDirFs.writeFile = writeAtomic` (dossier parent créé avant par `createTauriLibraryFiles.write`, `library-files.ts:247-248`) (réutiliser).
- Réutilise : port `TauriFs & TauriDirFs` (`host-tauri.ts:34-44`) — nouveau module `apps/cli/src/library.ts` : `nodeDirFs: TauriFs & TauriDirFs` (`readFile`/`writeFile` ci-dessus ; `readDir`, `mkdir`, `remove` sur `node:fs/promises`) ; `openLibrary(dir: string, deps: { core; codec; now() }): ResourceLibrary`.
- Rapport : `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne.

**Contraintes (recopiées).**
- G1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- G2 — Aucune logique recopiée (0281) : paquet lu, écrit et contrôlé par `library.ts` du produit ; ZIP par `zipJobReply` en processus.
- G3 — Aucun changement Rust ; tailles Wasm inchangées (plafonds 1 572 864 o et 3 145 728 o).
- G4 — `.rbitem` produits par la CLI elle-même ; écritures seulement sous `tmpDir()`.
- G5 — `nice -n 10` ; un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé.
- G6 — Wasm copié comme indiqué ci-dessus.
- G7 — Auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers un par un ; aucun `--force`.
- G9 — Aucune dépendance ajoutée.

**Interdits.** Racine « mine » seule (pas de « shared »), pas de `library add`, aucune op `library` dans `run` (H18,
H22). Ne pas toucher `main.ts`, `session.ts`, `formats.ts` (T9 branche la commande).

**Terminé quand.** `library.test.ts` vert (≥ 4 tests dont `RF4 —`) ; tsc de la CLI sans erreur ; un commit.

**Étapes.**

- [ ] **1. Test rouge** — créer `apps/cli/src/library.test.ts` :

```ts
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { PACK_NOT_ROOMBOARD_MESSAGE } from "../../web/src/platform/rbpack";
import { createPageCodec } from "../../web/src/platform/container";
import { libraryExport, libraryImport, libraryList, nodeDirFs, openLibrary } from "./library";
import { main } from "./main";
import { describeWasm, FIXED_NOW, memoryIO, tmpDir, WEB_SRC } from "./testing";
import { loadCore, loadFormats } from "./wasm-node";

const shape = (x: number) => JSON.stringify({ type: "AddShape", page: "$page:0", shape: "rect", x0: x, y0: 0, x1: x + 50, y1: 50, style: { color: "#000000", width: 2 }, fill: null });
async function lib(dir: string) {
  const core = await loadCore(WEB_SRC);
  return openLibrary(dir, { core, codec: createPageCodec(loadFormats(WEB_SRC)), now: () => new Date(Number(FIXED_NOW)).toISOString() });
}
async function itemsIn(folder: string): Promise<void> {
  mkdirSync(folder, { recursive: true });
  const a = join(tmpDir(), "a.roomboard");
  expect(await main(["new", a], memoryIO())).toBe(0);
  expect(await main(["run", a, "--save"], memoryIO([shape(0), shape(100)]))).toBe(0);
  expect(await main(["export", a, join(folder, "carre.rbitem"), "--all"], memoryIO())).toBe(0);
  expect(await main(["export", a, join(folder, "rond.rbitem"), "--all"], memoryIO())).toBe(0);
}

it("nodeDirFs : readDir, mkdir récursif, writeFile atomique, remove", async () => {
  const d = tmpDir();
  await nodeDirFs.mkdir(join(d, "x", "y"), { recursive: true });
  await nodeDirFs.writeFile(join(d, "x", "f.bin"), new Uint8Array([1, 2]));
  expect(await nodeDirFs.readFile(join(d, "x", "f.bin"))).toEqual(new Uint8Array([1, 2]));
  expect([...(await nodeDirFs.readDir(join(d, "x")))].sort((p, q) => p.name.localeCompare(q.name))).toEqual([{ name: "f.bin", isDirectory: false }, { name: "y", isDirectory: true }]);
  await nodeDirFs.remove(join(d, "x"), { recursive: true });
  expect(existsSync(join(d, "x"))).toBe(false);
});

describeWasm("S4 — bibliothèque sur disque (DA9)", () => {
  it("S4 — export du dossier Formes en .rbpack puis import dans une autre bibliothèque, list", async () => {
    const root = tmpDir();
    const libA = join(root, "lib");
    await itemsIn(join(libA, "Formes"));
    const pack = join(root, "p.rbpack");
    const out = await libraryExport(await lib(libA), pack, "Formes");
    expect(out).toEqual({ file: pack, name: "Formes.rbpack", skipped: [] });
    const libB = join(root, "lib2");
    const imp = await libraryImport(await lib(libB), pack);
    expect(imp).toMatchObject({ folder: "Formes", count: 2 });
    expect(imp.notices).toHaveLength(1);
    expect(imp.notices[0]).toContain("p.rbpack");
    const list = await libraryList(await lib(libB), "Formes");
    expect(list.items.map((i) => i.name).sort()).toEqual(["carre", "rond"]);
    expect(list.items.every((i) => i.kind === "fragment")).toBe(true);
    expect(existsSync(join(libB, "Formes", "carre.rbitem"))).toBe(true);
  });
  it("extensions : import d'un non-.rbpack et export vers un non-.rbpack → usage", async () => {
    const root = tmpDir();
    const l = await lib(join(root, "lib"));
    await expect(libraryImport(l, join(root, "x.zip"))).rejects.toMatchObject({ code: "usage" });
    await expect(libraryExport(l, join(root, "x.zip"), "")).rejects.toMatchObject({ code: "usage" });
  });
  it("RF4 — paquet endommagé : refus (command), aucun fichier créé dans la bibliothèque", async () => {
    const root = tmpDir();
    const bad = join(root, "bad.rbpack");
    writeFileSync(bad, "pas un zip");
    const libB = join(root, "lib2");
    await expect(libraryImport(await lib(libB), bad)).rejects.toMatchObject({ code: "command", message: PACK_NOT_ROOMBOARD_MESSAGE });
    expect(existsSync(libB) ? readdirSync(libB) : []).toEqual([]);
  });
});
```

- [ ] **2. Rouge** — `cd <wt> && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/library.test.ts 2>&1 | tail -15` : échec (module absent).

- [ ] **3. `library.ts`** :

```ts
/**
 * Bibliothèque de ressources sur disque (cadrage cli-lot2, DA9, D26, H13, H18) : `createResourceLibrary` et
 * `createTauriLibraryFiles` du produit sur un port `node:fs` (disposition de la coque : `<nom>.rbitem`, `.rbitem.json`,
 * `.rbitem.png`) ; racine « mine » seule ; ZIP des paquets par `zipJobReply` dans ce processus (D20).
 */
import { mkdir, readdir, rm } from "node:fs/promises";
import { basename } from "node:path";
import type { ContainerCodec } from "../../web/src/platform/container";
import type { CoreFactory } from "../../web/src/core/api";
import { createResourceLibrary, importedMessage, resourceKindReader, type LibraryZip, type ResourceLibrary } from "../../web/src/app/library";
import { APP_VERSION } from "../../web/src/platform/controller";
import type { TauriDirFs, TauriFs } from "../../web/src/platform/host-tauri";
import { createTauriLibraryFiles } from "../../web/src/platform/library-files";
import { inlineWorker } from "../../web/src/platform/one-shot-worker";
import { createZipReader, createZipWriter } from "../../web/src/platform/zip-read";
import { zipJobReply, type ZipJob } from "../../web/src/platform/zip-worker";
import { asCliError, CliError } from "./contract";
import { readBytes, writeAtomic } from "./disk";
import { extOf } from "./formats";

export const nodeDirFs: TauriFs & TauriDirFs = {
  readFile: readBytes,
  writeFile: writeAtomic,
  readDir: async (path) => (await readdir(path, { withFileTypes: true })).map((d) => ({ name: d.name, isDirectory: d.isDirectory() })),
  mkdir: async (path, o) => {
    await mkdir(path, o);
  },
  remove: async (path, o) => {
    await rm(path, { ...o, force: true });
  },
};

export function nodeZip(): LibraryZip {
  const spawn = inlineWorker((m) => zipJobReply(m as ZipJob));
  return { unzip: createZipReader(spawn, undefined, "pack"), zip: createZipWriter(spawn) };
}

export interface CliLibraryDeps {
  readonly core: CoreFactory;
  readonly codec: Pick<ContainerCodec, "read">;
  now(): string;
}

export function openLibrary(dir: string, deps: CliLibraryDeps): ResourceLibrary {
  return createResourceLibrary({
    files: [createTauriLibraryFiles(nodeDirFs, dir, "mine")],
    zip: nodeZip(),
    now: () => deps.now(),
    appVersion: APP_VERSION,
    kindOf: resourceKindReader(deps.core, deps.codec),
  });
}

export interface LibraryItem {
  readonly path: string;
  readonly name: string;
  readonly kind: string | null;
  readonly keywords: readonly string[];
  readonly description: string;
}

const needPack = (path: string, what: string): void => {
  if (extOf(path) !== ".rbpack") throw new CliError("usage", `library ${what} : ${basename(path)} : un paquet .rbpack est attendu`);
};

export async function libraryList(lib: ResourceLibrary, folder: string): Promise<{ folder: string; folders: readonly string[]; items: LibraryItem[] }> {
  try {
    await lib.refresh();
    const f = lib.folder("mine", folder);
    return { folder, folders: f.folders, items: f.items.map((i) => ({ path: i.path, name: i.name, kind: i.kind, keywords: i.keywords, description: i.description })) };
  } catch (e) {
    throw asCliError(e, "command");
  }
}

export async function libraryImport(lib: ResourceLibrary, pack: string): Promise<{ folder: string; count: number; notices: string[] }> {
  needPack(pack, "import");
  const bytes = await readBytes(pack);
  const name = basename(pack);
  try {
    const r = await lib.importPack(bytes, name);
    return { folder: r.folder, count: r.count, notices: [importedMessage(name, r)] };
  } catch (e) {
    throw asCliError(e, "command");
  }
}

export async function libraryExport(lib: ResourceLibrary, out: string, folder: string): Promise<{ file: string; name: string; skipped: readonly string[] }> {
  needPack(out, "export");
  let r: { readonly name: string; readonly bytes: Uint8Array; readonly skipped: readonly string[] };
  try {
    await lib.refresh();
    r = await lib.exportPack("mine", folder);
  } catch (e) {
    throw asCliError(e, "command");
  }
  await writeAtomic(out, r.bytes);
  return { file: out, name: r.name, skipped: r.skipped };
}
```

- [ ] **4. Vert** — `cd <wt> && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/library.test.ts 2>&1 | tail -15`
  Attendu : `Test Files  1 passed`, `Tests  4 passed`, aucun `skipped` ; puis
  `nice -n 10 pnpm --filter @roomboard/cli exec tsc --noEmit 2>&1 | tail -10` : aucune `error TS` ;
  `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli test 2>&1 | tail -8` : tous verts. À garder verts
  (non touchés) : `apps/web/src/app/library.test.ts`, `platform/rbpack.test.ts`.

- [ ] **5. Commit**

```bash
git -C <wt> add apps/cli/src/library.ts apps/cli/src/library.test.ts
git -C <wt> commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -F - <<'EOF'
feat(cli): resource library on disk over the product library

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

<a id="tache-t6"></a>

### Tâche T6 — CLI : lire les cinq tableaux, règle D23, panique D29

**Objectif.** `session.readDoc(path, "document")` choisit par l'extension : les cinq tableaux passent par
`readBoardFile`, le reste par le conteneur (D22) ; `state`, `run <tableau>`, `tab.open`, `export <tableau>` en
héritent ; `import` ouvre un tableau en onglet (`opened`) par `openBoard` de `createImporter`. Toute écriture de
document vise un `.roomboard` (D23, `documentTarget`, contrôle préalable dans `main.ts`). Une panique Wasm pendant une
tâche des tableaux interdit toute écriture dans la suite du processus (D29). `.rbpack` en import : code 2 avec renvoi
à `library`. Tableaux couverts en lecture. Scénario servi : **S2**.

**Patron à ne pas reprendre.** (1) Réécrire dans la CLI la lecture d'un tableau (ZIP, XML, `buildBoardDocument`,
avertissements) comme `workspace.ts` le faisait : la seule lecture est `readBoardFile`. Chemin de référence :
`apps/web/src/app/board-convert.ts` (T4), dont le texte vient de `apps/web/src/app/workspace.ts:608-674`.
(2) Attraper la panique dans `session.ts` ou deviner une panique à son message : la seule détection est
`WebAssembly.RuntimeError` vue dans le corps passé à `inlineWorker` (`board-node.ts`), qui appelle `onPanic`. (3) Un
contrôle d'extension par commande : la règle D23 est une seule fonction, `documentTarget`.

**Worktree.** Isolé : `~/projets/roomboard-wt/cli-lot2--T6` (après fusion de T3, T4, T5). Préparer :
`cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r /home/adminjd/projets/roomboard-wt/cli-lot2/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot2/apps/web/src/wasm-formats apps/web/src/`
(vrai Wasm exigé).

**Fichiers.**
- Créer : `apps/cli/src/board-node.ts`, `apps/cli/src/board-node.test.ts`, `apps/cli/src/boards.test.ts`
- Modifier : `apps/cli/src/session.ts:30-37,72-75,92-124,238-252`, `importer.ts:87-106`, `main.ts:24-33,88-167`,
  `main.test.ts`, `formats.ts`, `formats.test.ts`, `testing.ts`

**Interfaces.**
- Consomme : `readBoardFile`, `createBoardPorts` (T4) ; `inlineWorker` (T2), `boardJobReply`, `type BoardJob` (T2) ;
  `zipJobReply`, `type ZipJob` (T2) ; `cliFragments` (T5) ; fabriques `iwbZip`, `iwbRaw3`, `ubzZip`, `notebookZip`,
  `olfZip`, `flipPages` (T3) ; `makeFlipchart` (`fabriques/flipchart.mjs:360`) ; `zipStored` (`zip-worker.ts:83`).
- Produit (exact, utilisé par T7, T9) :

```ts
// board-node.ts
export function nodeBoardPorts(formats: () => Promise<FormatsBinding>, onPanic: () => void): BoardPorts;
// session.ts
export const INTERRUPTED_MESSAGE = "module des formats interrompu : rien n'est enregistré";
/** D23 : extension .roomboard (sans casse), sinon CliError usage. */
export function documentTarget(path: string): string;
/** D22 : format de tableau d'un chemin, null pour un conteneur. */
export function boardFormatOf(path: string): BoardSourceFormat | null;
export interface SessionDeps {
  readonly core: CoreFactory;
  readonly io: ContainerIO;
  readonly codec: ContainerCodec;
  readonly notices: string[];
  readonly formats: () => Promise<SheetFormatsBinding>;
  readonly fragments: FragmentOps<CliPage>;
  readonly board: BoardPorts;
  /** D29 : vrai après une panique du module des formats dans ce processus. */
  interrupted(): boolean;
  now(): string;
}
// Session : readDoc rend Pick<ReadResult, "doc" | "assets"> ; nouveau membre
openBoard(file: { readonly name: string; readonly blob: Blob; readonly format: BoardSourceFormat }): Promise<boolean>;
// formats.ts
export const packMessage: (name: string) => string; // contient « library »
// testing.ts
export const fabZip: (files: Record<string, Uint8Array>) => Uint8Array;
export function boardFixtures(dir: string): { readonly iwb: string; readonly iwbRaw: string; readonly ubz: string; readonly notebook: string; readonly olf: string; readonly flipchart: string };
```

- Réutilise : `board-reader.ts:133` — `createBoardCodec(inlineWorker(async (m) => boardJobReply(await formats(), m as BoardJob)))` (réutiliser).
- Réutilise : `main.ts:365-373` → `app/board-convert.ts` — `createBoardPorts(spawn: { readonly zip: () => WorkerLike }, codec: BoardCodec): BoardPorts` (appelé par `nodeBoardPorts`).
- Réutilise : ports des tableaux en Node — nouveau module `apps/cli/src/board-node.ts` : `nodeBoardPorts(formats: () => Promise<FormatsBinding>, onPanic: () => void): BoardPorts` (= `createBoardPorts` sur `inlineWorker` ; `onPanic` appelé sur une `WebAssembly.RuntimeError`, D29) (nouveau, câblage, aucun contrôle).
- Réutilise : `workspace.ts:608-674` → `board-convert.ts` — `readBoardFile(file, deps)` (appelé par `session.readDoc` et `session.openBoard`).
- Réutilise : `apps/cli/src/importer.ts:33` (`nodeDecode`) — `decode` de `readBoardFile` (réutiliser).
- Réutilise : `board-files.ts:117,121` — `boardWarningsMessage`, `boardTabName` (réutiliser ; `boardTabName` n'a pas d'usage si la CLI ne nomme pas ses onglets : le dire en écart).
- Réutilise : `zip-worker.ts:158-185` — `zipJobReply` via `inlineWorker` pour le ZIP des tableaux (réutiliser).
- Réutilise : fichiers d'essai — `scripts/essais/fabriques/tableaux.mjs` (T3), `fabriques/flipchart.mjs:360` (`makeFlipchart(pages, deflate)`) ; ZIP des tests par `zipStored` (réutiliser).
- Rapport : `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne.

**Contraintes (recopiées).**
- G1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- G2 — Aucune logique recopiée (0281) : lecture des tableaux par `readBoardFile` ; ports par `createBoardPorts` ; Workers remplacés par `inlineWorker` sur `boardJobReply`/`zipJobReply`.
- G3 — Aucun changement Rust ; tailles Wasm inchangées (plafonds 1 572 864 o et 3 145 728 o). Le module formats reste une seule instance (pas de Worker jetable, D29).
- G4 — Tableaux fabriqués par `tableaux.mjs` et `makeFlipchart` ; aucun fichier téléchargé ; écritures seulement sous `tmpDir()`.
- G5 — `nice -n 10` ; un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé.
- G6 — Wasm copié comme indiqué ci-dessus.
- G7 — Auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers un par un ; aucun `--force`.
- G8 — D15 : lignes des tableaux de `FORMAT_LOTS` et leurs tests changés ici ; le contrôle de `cli-essai.mjs` est écrit en T9.
- G9 — Aucune dépendance ajoutée ; `fflate` jamais importé directement par `apps/cli` (ZIP par `zipStored`, deflate par `node:zlib`).

**Interdits.** Aucune écriture `.notebook .olf .flipchart` (lecture seule). Un tableau ouvert n'est jamais réécrit à
son chemin (onglet `file: null`). Ne pas changer la ligne d'usage `run` vérifiée par `main.test.ts`. Panique d'un
classeur : régie par H8 du lot 1, non étendue ici.

**Terminé quand.** Suite CLI verte sous `ROOMBOARD_WASM_REQUIRED=1`, tests `S2 —`, `D23`, `D29`, `RF2 —`, `RF3 —`
présents ; build CLI OK ; un commit.

**Étapes.**

- [ ] **1. Aides de test** — `testing.ts` gagne (imports `deflateSync` de `node:zlib` déjà présent, `writeFileSync`
  de `node:fs`) :

```ts
import { zipStored } from "../../web/src/platform/zip-worker";
import { flipPages, iwbRaw3, iwbZip, notebookZip, olfZip, ubzZip } from "../../../scripts/essais/fabriques/tableaux.mjs";
import { makeFlipchart } from "../../../scripts/essais/fabriques/flipchart.mjs";

/** ZIP des fabriques (D28) : `zipStored` du produit, aucune dépendance ajoutée. */
export const fabZip = (files: Record<string, Uint8Array>): Uint8Array => zipStored(Object.entries(files).map(([path, bytes]) => ({ path, bytes })));

/** Les cinq tableaux fabriqués (D28) écrits dans `dir`. */
export function boardFixtures(dir: string): { readonly iwb: string; readonly iwbRaw: string; readonly ubz: string; readonly notebook: string; readonly olf: string; readonly flipchart: string } {
  const put = (name: string, bytes: Uint8Array): string => {
    const p = join(dir, name);
    writeFileSync(p, bytes);
    return p;
  };
  return {
    iwb: put("lecon.iwb", iwbZip(fabZip)),
    iwbRaw: put("brut.iwb", new TextEncoder().encode(iwbRaw3())),
    ubz: put("openboard.ubz", ubzZip(fabZip)),
    notebook: put("lecon.notebook", notebookZip(fabZip)),
    olf: put("cours.olf", olfZip(fabZip)),
    flipchart: put("cours.flipchart", makeFlipchart(flipPages(), deflateSync)),
  };
}
```

- [ ] **2. Tests rouges** — créer `apps/cli/src/board-node.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { BOARD_FAILED_MESSAGE } from "../../web/src/platform/board-reader";
import type { FormatsBinding } from "../../web/src/platform/container";
import { zipStored } from "../../web/src/platform/zip-worker";
import { nodeBoardPorts } from "./board-node";

const reader = () => ({ ops: () => new Float32Array([1]), texts: () => [], warnings: () => [], free: () => undefined });
const fail = (): never => {
  throw new Error("non appelé");
};
const modWith = (open: () => unknown): FormatsBinding =>
  ({ ContainerReader: { open: fail }, write_container: fail, BoardReader: { open }, write_board_xml: () => [], notebook_order: () => [] }) as unknown as FormatsBinding;
const xml = [new Uint8Array([60])];

describe("nodeBoardPorts (D20, D29)", () => {
  it("lecture : boardJobReply dans ce processus, une part, aucune panique", async () => {
    let panics = 0;
    const parts = await nodeBoardPorts(async () => modWith(reader), () => void panics++).read(xml, "iwb");
    expect(parts.map((p) => Array.from(p.ops))).toEqual([[1]]);
    expect(panics).toBe(0);
  });
  it("D29 — panique Wasm : rejet « lecture du tableau interrompue », onPanic une fois", async () => {
    let panics = 0;
    const ports = nodeBoardPorts(async () => modWith(() => { throw new WebAssembly.RuntimeError("unreachable"); }), () => void panics++);
    await expect(ports.read(xml, "iwb")).rejects.toThrow(BOARD_FAILED_MESSAGE);
    expect(panics).toBe(1);
  });
  it("erreur connue du module : rendue telle quelle, pas une panique", async () => {
    let panics = 0;
    const ports = nodeBoardPorts(async () => modWith(() => { throw new Error("fichier endommagé : xml"); }), () => void panics++);
    await expect(ports.read(xml, "iwb")).rejects.toThrow("fichier endommagé : xml");
    expect(panics).toBe(0);
  });
  it("ZIP en mode board par zipJobReply", async () => {
    const z = zipStored([{ path: "content.xml", bytes: new TextEncoder().encode("<iwb/>") }, { path: "film.mpg", bytes: new Uint8Array([1]) }]);
    const entries = await nodeBoardPorts(async () => modWith(reader), () => undefined).unzip(new Blob([z as BlobPart]));
    expect(entries.map((e) => e.path)).toEqual(["content.xml"]);
  });
});
```

  Créer `apps/cli/src/boards.test.ts` :

```ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { main } from "./main";
import { createSession, INTERRUPTED_MESSAGE, nodeSession } from "./session";
import { boardFixtures, describeWasm, memoryIO, pngBytes, stampOf, tmpDir, type Json } from "./testing";

async function stateOf(path: string): Promise<Json> {
  const io = memoryIO();
  expect(await main(["state", path], io)).toBe(0);
  return io.json()[0];
}
async function noticesOf(path: string): Promise<string> {
  const s = await nodeSession(memoryIO());
  await s.open(path);
  return s.deps.notices.join(" ");
}

describeWasm("S2 — lire les cinq tableaux (D22)", () => {
  it("S2 — .iwb ZIP : 1 page, 8 objets, avis de la vidéo non lue ; .iwb XML brut : 3 pages", async () => {
    const f = boardFixtures(tmpDir());
    const st = await stateOf(f.iwb);
    expect(st.pages).toHaveLength(1);
    expect(st.pages[0].elements).toHaveLength(8);
    expect(await noticesOf(f.iwb)).toContain("vidéo");
    expect((await stateOf(f.iwbRaw)).pages).toHaveLength(3);
  });
  it("S2 — .ubz : 4 objets ; .notebook : 2 pages dans l'ordre du manifeste (4 puis 1 objets)", async () => {
    const f = boardFixtures(tmpDir());
    expect((await stateOf(f.ubz)).pages[0].elements).toHaveLength(4);
    const nb = await stateOf(f.notebook);
    expect(nb.pages.map((p: Json) => p.elements.length)).toEqual([4, 1]);
  });
  it("S2 — .olf : 3 objets, fond #ffeecc ; .flipchart : 2 pages, 5 objets en page 1, TIFF et action en avis", async () => {
    const f = boardFixtures(tmpDir());
    const olf = await stateOf(f.olf);
    expect(olf.pages[0].elements).toHaveLength(3);
    expect(olf.pages[0].page.background.toLowerCase()).toBe("#ffeecc");
    const fc = await stateOf(f.flipchart);
    expect(fc.pages).toHaveLength(2);
    expect(fc.pages[0].elements).toHaveLength(5);
    const said = await noticesOf(f.flipchart);
    expect(said).toContain("TIFF");
    expect(said).toContain("action");
  });
  it("S2 — run lecon.iwb --save : code 2, fichier non modifié ; --out x.roomboard : 0", async () => {
    const dir = tmpDir();
    const f = boardFixtures(dir);
    const before = stampOf(f.iwb);
    expect(await main(["run", f.iwb, "--save"], memoryIO([]))).toBe(2);
    expect(stampOf(f.iwb)).toEqual(before);
    const out = join(dir, "l.roomboard");
    expect(await main(["run", f.iwb, "--out", out], memoryIO([]))).toBe(0);
    expect((await stateOf(out)).pages[0].elements).toHaveLength(8);
  });
  it("import a.roomboard lecon.iwb : ouvert en onglet (opened), a non écrit ; import a.roomboard p.rbpack : code 2, renvoi à library", async () => {
    const dir = tmpDir();
    const f = boardFixtures(dir);
    const a = join(dir, "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const before = stampOf(a);
    const io = memoryIO();
    expect(await main(["import", a, f.iwb], io)).toBe(0);
    expect(io.json()[0]).toMatchObject({ opened: ["lecon.iwb"], inserted: [] });
    expect(stampOf(a)).toEqual(before);
    const pack = memoryIO();
    expect(await main(["import", a, join(dir, "p.rbpack")], pack)).toBe(2);
    expect(pack.errors()[0].error.message).toContain("library");
  });
  it("RF2 — majuscules : LECON.IWB lu ; run X.ROOMBOARD --save accepté (D23 sans casse)", async () => {
    const dir = tmpDir();
    const f = boardFixtures(dir);
    const upper = join(dir, "LECON.IWB");
    writeFileSync(upper, readFileSync(f.iwb));
    expect((await stateOf(upper)).pages[0].elements).toHaveLength(8);
    const x = join(dir, "X.ROOMBOARD");
    expect(await main(["new", x], memoryIO())).toBe(0);
    expect(await main(["run", x, "--save"], memoryIO([]))).toBe(0);
  });
  it("RF3 — .ubz qui n'est pas un ZIP : code 1, message du produit, rien d'écrit", async () => {
    const dir = tmpDir();
    const faux = join(dir, "faux.ubz");
    writeFileSync(faux, "bonjour");
    const io = memoryIO();
    expect(await main(["state", faux], io)).toBe(1);
    expect(io.errors()[0].error.message).toContain("un .ubz est une archive ZIP");
    const out = join(dir, "o.roomboard");
    expect(await main(["run", faux, "--out", out], memoryIO([]))).toBe(1);
    expect(existsSync(out)).toBe(false);
  });
  it("D29 — module des formats interrompu : save et write refusent (code 1), rien d'écrit", async () => {
    const s0 = await nodeSession(memoryIO());
    const s = createSession({ ...s0.deps, interrupted: () => true });
    const tab = s.newTab().session;
    const out = join(tmpDir(), "x.roomboard");
    await expect(s.save(tab, out)).rejects.toMatchObject({ code: "command", message: INTERRUPTED_MESSAGE });
    await expect(s.write(out, pngBytes(1, 1))).rejects.toMatchObject({ code: "command", message: INTERRUPTED_MESSAGE });
    expect(existsSync(out)).toBe(false);
  });
});
```

  Ajouter à `main.test.ts` :

```ts
describe("main : D23, toute écriture de document vise un .roomboard (avant tout chargement)", () => {
  const absent = () => memoryIO([], {}, new URL("file:///roomboard-absent/")); // un chargement donnerait le code 1
  it("D23 — new, run --out, run <tableau> --save, apply --out, import sans --out : code 2 sans charger le module", async () => {
    const dir = tmpDir();
    for (const argv of [
      ["new", join(dir, "z.iwb")],
      ["run", "--new", "--out", join(dir, "x.txt")],
      ["run", join(dir, "lecon.iwb"), "--save"],
      ["apply", join(dir, "a.roomboard"), "{}", "--out", join(dir, "a.ubz")],
      ["import", join(dir, "lecon.iwb"), join(dir, "i.png")],
    ]) {
      const io = absent();
      expect(await main(argv, io), argv.join(" ")).toBe(2);
      expect(io.errors()[0].error.code).toBe("usage");
    }
    expect(existsSync(join(dir, "z.iwb"))).toBe(false);
  });
});

describeWasm("main : D23 dans run", () => {
  it("D23 — op save vers un .iwb : ligne d'échec usage, code 2", async () => {
    const dir = tmpDir();
    const io = memoryIO([JSON.stringify({ op: "save", to: join(dir, "x.iwb") })]);
    expect(await main(["run", "--new"], io)).toBe(2);
    expect(io.json()[0]).toMatchObject({ op: 1, ok: false, error: { code: "usage" } });
  });
});
```

  (`tmpDir` à importer dans `main.test.ts` s'il ne l'est pas.) `formats.test.ts` : liste lue
  `[".flipchart", ".iwb", ".jpeg", ".jpg", ".notebook", ".olf", ".png", ".rbitem", ".roomboard", ".ubz", ".xlsm", ".xlsx"]` ;
  ajouter `expect(importBlocked("a.iwb")).toBeNull(); expect(importBlocked("a.flipchart")).toBeNull();` et
  `expect(rows.find((r) => r.ext === ".notebook")?.notes.join(" ")).toContain("lecture seule");`.

- [ ] **3. Rouge** — `cd <wt> && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli test 2>&1 | tail -20` : échecs attendus.

- [ ] **4. `board-node.ts`** :

```ts
/**
 * Ports des tableaux dans le processus de la CLI (cadrage cli-lot2, D20, D29) : `createBoardPorts` du produit sur
 * `inlineWorker` ; XML par `boardJobReply` sur l'instance unique du module formats, ZIP par `zipJobReply`. Une
 * `WebAssembly.RuntimeError` appelle `onPanic` avant de remonter : la session refuse ensuite toute écriture.
 */
import { createBoardPorts } from "../../web/src/app/board-convert";
import type { BoardPorts } from "../../web/src/app/board-io";
import { boardJobReply, createBoardCodec, type BoardJob } from "../../web/src/platform/board-reader";
import type { FormatsBinding } from "../../web/src/platform/container";
import { inlineWorker } from "../../web/src/platform/one-shot-worker";
import { zipJobReply, type ZipJob } from "../../web/src/platform/zip-worker";

export function nodeBoardPorts(formats: () => Promise<FormatsBinding>, onPanic: () => void): BoardPorts {
  const codec = createBoardCodec(
    inlineWorker(async (m) => {
      const mod = await formats();
      try {
        return boardJobReply(mod, m as BoardJob);
      } catch (e) {
        if (e instanceof WebAssembly.RuntimeError) onPanic();
        throw e;
      }
    }),
  );
  return createBoardPorts({ zip: inlineWorker((m) => zipJobReply(m as ZipJob)) }, codec);
}
```

- [ ] **5. `formats.ts`** — lignes des tableaux :

```ts
const UNREAD_IMAGES = "images GIF, WebP, BMP, SVG non lues (lot 4)";
[".iwb", branched(2, 2, "iwb", { read: true, write: false }, UNREAD_IMAGES)],
[".ubz", branched(2, 2, "ubz", { read: true, write: false }, UNREAD_IMAGES)],
[".notebook", branched(2, null, "notebook", { read: true, write: false }, "lecture seule", UNREAD_IMAGES)],
[".olf", branched(2, null, "olf", { read: true, write: false }, "lecture seule", UNREAD_IMAGES)],
[".flipchart", branched(2, null, "flipchart", { read: true, write: false }, "lecture seule", UNREAD_IMAGES)],
```

  et `export const packMessage = (name: string): string => `${baseOf(name)} : un paquet .rbpack passe par la bibliothèque : roomboard library import | library export`;`

- [ ] **6. `session.ts`** — imports : `readBoardFile` (`../../web/src/app/board-convert`), `type BoardPorts, type BoardSourceFormat`
  (`../../web/src/app/board-io`), `boardWarningsMessage` (`../../web/src/app/board-files`), `type ContainerCodec`,
  `messageOf`, `nodeDecode` (`./importer`), `formatOf, extOf` (`./formats`), `nodeBoardPorts` (`./board-node`),
  `type FragmentOps`, `type CliPage`, `cliFragments`. `SessionDeps` comme au bloc Interfaces. Ajouter :

```ts
export const INTERRUPTED_MESSAGE = "module des formats interrompu : rien n'est enregistré";
const BOARD_HANDLERS: ReadonlySet<string> = new Set(["iwb", "ubz", "notebook", "olf", "flipchart"]);

export function boardFormatOf(path: string): BoardSourceFormat | null {
  const e = formatOf(path);
  return e !== null && BOARD_HANDLERS.has(e.handler) ? (e.handler as BoardSourceFormat) : null;
}

export function documentTarget(path: string): string {
  if (extOf(path) !== ".roomboard") {
    throw new CliError("usage", `${basename(path)} : un document s'enregistre en .roomboard (convert ou export pour un autre format)`);
  }
  return path;
}
```

  Dans `createSession` :

```ts
const writable = (): void => {
  if (deps.interrupted()) throw new CliError("command", INTERRUPTED_MESSAGE);
};
async function write(path: string, bytes: Uint8Array): Promise<void> {
  writable();
  await writeAtomic(path, bytes);
  written.add(path);
}
const readBoard = (name: string, blob: Blob, format: BoardSourceFormat) =>
  readBoardFile({ name, blob, format }, { core: deps.core, ports: deps.board, makeAssets: () => createAssetStore(), decode: nodeDecode, now: () => deps.now(), appVersion: APP_VERSION });

async function readDoc(path: string, kind: ReadKind): Promise<Pick<ReadResult, "doc" | "assets">> {
  const bytes = await readBytes(path);
  const format = kind === "document" ? boardFormatOf(path) : null;
  if (format !== null) {
    const name = basename(path);
    let read: Awaited<ReturnType<typeof readBoard>>;
    try {
      read = await readBoard(name, new Blob([bytes as BlobPart]), format);
    } catch (e) {
      throw new CliError("format", `Ouverture impossible (${name}) : ${messageOf(e)}`);
    }
    if (read.warnings.length > 0) deps.notices.push(boardWarningsMessage(name, read.warnings));
    return { doc: read.doc, assets: read.assets };
  }
  const before = deps.notices.length;
  const read = await deps.io.read(basename(path), bytes, kind, path);
  if (read === null) throw new CliError("format", deps.notices.slice(before).join(" ; ") || `ouverture impossible : ${path}`);
  return read;
}
async function open(path: string): Promise<TabEntry<CliTab>> {
  if (tabs.list().length >= MAX_TABS) throw new CliError("command", TOO_MANY_TABS);
  const read = await readDoc(path, "document");
  // D22 : un tableau ouvert est un onglet sans fichier (comme `target: null` de la page) : jamais réécrit à son chemin.
  return add({ doc: read.doc, assets: read.assets, file: boardFormatOf(path) === null ? path : null });
}
async function openBoard(file: { readonly name: string; readonly blob: Blob; readonly format: BoardSourceFormat }): Promise<boolean> {
  if (tabs.list().length >= MAX_TABS) {
    deps.notices.push(`Ouverture impossible (${file.name}) : ${TOO_MANY_TABS}`);
    return false;
  }
  try {
    const read = await readBoard(file.name, file.blob, file.format);
    add({ doc: read.doc, assets: read.assets, file: null });
    if (read.warnings.length > 0) deps.notices.push(boardWarningsMessage(file.name, read.warnings));
    return true;
  } catch (e) {
    deps.notices.push(`Ouverture impossible (${file.name}) : ${messageOf(e)}`);
    return false;
  }
}
```

  `save` : en tête `writable();`, puis `const path = to ?? tab.file;` … `documentTarget(path);` avant l'encodage.
  Ajouter `openBoard` à l'interface `Session` et à l'objet `session`. `nodeSession` :

```ts
export async function nodeSession(io: CliIO): Promise<Session> {
  nowOf(io.env); // ROOMBOARD_NOW mal formée : usage (code 2) avant tout chargement ni écriture
  const core = await loadCore(io.wasmDir);
  const formats = loadFormats(io.wasmDir);
  const notices: string[] = [];
  const codec = createPageCodec(formats);
  const containerIO = createContainerIO({ core, codec, say: async (m) => { notices.push(m); }, makeAssets: () => createAssetStore() });
  const now = (): string => nowOf(io.env);
  let interrupted = false;
  return createSession({
    core,
    io: containerIO,
    codec,
    notices,
    formats,
    now,
    fragments: cliFragments({ io: containerIO, core, now, notices }),
    board: nodeBoardPorts(formats, () => {
      interrupted = true;
    }),
    interrupted: () => interrupted,
  });
}
```

- [ ] **7. `importer.ts`** — `checkSources` :

```ts
export function checkSources(sources: readonly string[]): void {
  for (const s of sources) {
    if (extOf(s) === ".rbpack") throw new CliError("usage", packMessage(s)); // D26 : un paquet va dans une bibliothèque
    const lot = importBlocked(s);
    if (lot !== null) throw new CliError("unsupported", unsupportedMessage(s, lot));
  }
}
```

  et dans `createImporter({...})` : `openBoard: (f) => session.openBoard(f),`.

- [ ] **8. `main.ts`** — importer `documentTarget` ; contrôles avant tout chargement :
  `new` : `documentTarget(out);` juste après le contrôle des positionnels ; `run` : après la ligne
  `run --new --save : --out exigé`, `if (save) documentTarget(out ?? file ?? "");` ; `apply` :
  `documentTarget(flagStr(p, "--out") ?? file);` avant `nodeSession` ; `import` :
  `documentTarget(flagStr(p, "--out") ?? file);` avant `checkSources`. Dans `import`, D29 : remplacer
  `if (report.inserted.length > 0) await session.save(tab, flagStr(p, "--out") ?? file);` par :

```ts
try {
  if (report.inserted.length > 0) await session.save(tab, flagStr(p, "--out") ?? file);
} catch (e) {
  if (session.deps.interrupted()) io.out(JSON.stringify(report)); // D29 : rapport imprimé, puis le refus d'enregistrer
  throw e;
}
```

  `USAGE.state = "state <fichier.roomboard | fichier.rbitem | tableau .iwb .ubz .notebook .olf .flipchart> [--page <id>] [--points]"`.
  En-tête de `main.ts` : une phrase « cli-lot2 (D23) : toute écriture de document vise un `.roomboard`, contrôlé
  avant tout chargement par `documentTarget` ».

- [ ] **9. Vert** — `cd <wt> && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli test 2>&1 | tail -20`
  Attendu : tous `passed`, aucun `skipped`, aucun `FAIL ` ;
  `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run -t "S2|D23|D29|RF2|RF3" 2>&1 | tail -6` : ≥ 12 tests ;
  `nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -5` sans erreur. Si un nombre d'objets diffère de
  l'attendu (8, 4, 4/1, 3, 5), comparer aux valeurs de `c13-tableaux-navigateur.mjs` (mêmes fabriques) et le dire dans
  le rapport : ne changer ni la fabrique ni l'attente sans l'écrire. Tests à garder verts : tous ceux de `apps/cli`
  (le lot 1 n'écrit que des `.roomboard`).

- [ ] **10. Commit**

```bash
git -C <wt> add apps/cli/src/board-node.ts apps/cli/src/board-node.test.ts apps/cli/src/boards.test.ts apps/cli/src/session.ts apps/cli/src/importer.ts apps/cli/src/main.ts apps/cli/src/main.test.ts apps/cli/src/formats.ts apps/cli/src/formats.test.ts apps/cli/src/testing.ts
git -C <wt> commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -F - <<'EOF'
feat(cli): read whiteboards through board-convert, .roomboard-only writes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

<a id="tache-t7"></a>

### Tâche T7 — CLI : exporter `.iwb`/`.ubz`, commande `convert`

**Objectif.** `export <source> <sortie.iwb|.ubz>` et `{"op":"export","to":"x.ubz"}` écrivent le document entier de
l'onglet actif par `writeBoardFile` ; options de sélection avec ces sorties : code 2 ; image non lue :
`UNREAD_ASSETS_MESSAGE`, code 1. `convert <source> <sortie>` : session neuve, `tab.open` de la source, écriture
`.roomboard` (`save`) ou `.iwb`/`.ubz`. `.iwb`, `.ubz` couverts en écriture. Scénarios servis : **S3**, S2 (par
`convert`).

**Worktree.** Isolé : `~/projets/roomboard-wt/cli-lot2--T7` (après fusion de T6). Préparer :
`cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r /home/adminjd/projets/roomboard-wt/cli-lot2/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot2/apps/web/src/wasm-formats apps/web/src/`
(vrai Wasm exigé).

**Fichiers.**
- Créer : `apps/cli/src/convert.test.ts`
- Modifier : `apps/cli/src/exporter.ts`, `session.ts` (op `export`), `main.ts` (`export`, `convert`, `USAGE`),
  `formats.ts`, `formats.test.ts`, `export.test.ts:53-60`

**Interfaces.**
- Consomme : `writeBoardFile` (T4) ; `session.deps.board`, `documentTarget`, `boardFormatOf`, `packMessage`,
  `boardFixtures`, `fabZip` (T6) ; `missingOf` (`container-io.ts:82`), `UNREAD_ASSETS_MESSAGE` (`controller.ts:11`).
- Produit (exact, utilisé par T9) :

```ts
// exporter.ts
export const isBoardOut: (to: string) => boolean; // .iwb ou .ubz
export function exportBoardFile(session: Session, to: string): Promise<{ file: string; kind: BoardFormat }>; // avertissements poussés dans notices
export function checkConvert(from: string, to: string): void; // 2 ou 3 avant tout chargement
// sortie de convert
{ "file": string, "from": string, "pages": number, "notices": string[] }
```

- Réutilise : `workspace.ts:676-705` → `board-convert.ts` — `writeBoardFile(doc: CoreDocument, assets: Pick<AssetStore, "get">, format: BoardFormat, ports: Pick<BoardPorts, "write" | "zip">): Promise<{ bytes: Uint8Array; warnings: string[] }>` (appelé).
- Réutilise : `container-io.ts:82`, `controller.ts:11` — `missingOf(doc, assets)`, `UNREAD_ASSETS_MESSAGE` (réutiliser).
- Réutilise : `apps/cli/src/formats.ts:12,55,80-89` — `covered.write` des `.iwb`, `.ubz` (étendre).
- Rapport : `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne.

**Contraintes (recopiées).**
- G1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- G2 — Aucune logique recopiée (0281) : écriture par `writeBoardFile` (même chemin que « Enregistrer une copie au format » de la page) ; contrôle d'image non lue par `missingOf`.
- G3 — Aucun changement Rust ; tailles Wasm inchangées (plafonds 1 572 864 o et 3 145 728 o).
- G4 — Tableaux fabriqués (`boardFixtures`) ; écritures seulement sous `tmpDir()`.
- G5 — `nice -n 10` ; un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé.
- G6 — Wasm copié comme indiqué ci-dessus.
- G7 — Auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers un par un ; aucun `--force`.
- G8 — D15 : lignes `.iwb`/`.ubz` de `FORMAT_LOTS` (écriture) et leurs tests changés ici ; essai en T9.
- G9 — Aucune dépendance ajoutée.

**Interdits.** Pas d'opération `convert` dans `run` (= `tab.open` + `export`). Pas d'écriture `.notebook .olf
.flipchart`. `convert` remplace une sortie existante sans `--replace` (H16). Pertes : code 0, avertissements dans
`notices` (H12).

**Terminé quand.** Suite CLI verte sous `ROOMBOARD_WASM_REQUIRED=1`, tests `S3 —` et `RF5 —` présents ; build CLI
OK ; un commit.

**Étapes.**

- [ ] **1. Tests rouges** — `export.test.ts:53-60` : le test devient « export vers .pdf : code 3 (lot 3) ; vers .png :
  code 2 ; page vide : code 1 » avec `join(dir, "x.pdf")` et `toContain("lot 3")`. `formats.test.ts` : liste écrite
  `[".iwb", ".rbitem", ".roomboard", ".ubz"]`, `expect(exportBlocked("a.iwb")).toBeNull();` (au lieu de `2`).
  Créer `apps/cli/src/convert.test.ts` :

```ts
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import type { CoreDocument } from "../../web/src/core/api";
import { UNREAD_ASSETS_MESSAGE } from "../../web/src/platform/controller";
import { exportBoardFile } from "./exporter";
import { main } from "./main";
import { nodeSession } from "./session";
import { boardFixtures, describeWasm, memoryIO, pngBytes, stampOf, tmpDir, type Json } from "./testing";

const style = { color: "#1e40af", width: 4 };
async function board(dir: string): Promise<string> {
  const a = join(dir, "a.roomboard");
  const png = join(dir, "i.png");
  writeFileSync(png, pngBytes(40, 30));
  expect(await main(["new", a], memoryIO())).toBe(0);
  const ops = [
    { type: "AddShape", page: "$page:0", shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style, fill: "#fde68a" },
    { type: "AddShape", page: "$page:0", shape: "ellipse", x0: 400, y0: 100, x1: 600, y1: 300, style, fill: null },
    { op: "import", files: [png], at: [900, 500] },
  ].map((o) => JSON.stringify(o));
  expect(await main(["run", a, "--save"], memoryIO(ops))).toBe(0);
  return a;
}
const boxes = (d: CoreDocument): Array<[string, number, number, number, number]> =>
  d.elementIds(d.pageIds()[0]!).map((id) => {
    const b = d.bounds([id])!;
    return [d.element(id)!.kind, b.x0, b.y0, b.x1, b.y1];
  });
const near = (a: number, b: number): boolean => Math.abs(a - b) <= 2;

describeWasm("S3 — écrire et relire .iwb et .ubz (D24, D25)", () => {
  for (const ext of ["iwb", "ubz"] as const) {
    it(`S3 — export a.${ext} puis convert en .roomboard : mêmes sortes et géométries (2 px)`, async () => {
      const dir = tmpDir();
      const a = await board(dir);
      const out = join(dir, `a.${ext}`);
      const io = memoryIO();
      expect(await main(["export", a, out], io)).toBe(0);
      expect(io.json()[0]).toMatchObject({ file: out, kind: ext });
      const back = join(dir, `a2-${ext}.roomboard`);
      const cv = memoryIO();
      expect(await main(["convert", out, back], cv)).toBe(0);
      expect(cv.json()[0]).toMatchObject({ file: back, from: out, pages: 1, notices: expect.any(Array) });
      const s = await nodeSession(memoryIO());
      const ba = boxes((await s.open(a)).session.doc);
      const bb = boxes((await s.open(back)).session.doc);
      expect(bb.map((x) => x[0])).toEqual(ba.map((x) => x[0]));
      bb.forEach((x, i) => expect(x.slice(1).every((v, k) => near(v as number, ba[i]![k + 1] as number)), JSON.stringify([x, ba[i]])).toBe(true));
    });
  }
  it("S3 — export .ubz avec --ids : code 2 ; vers .pdf : code 3 (lot 3) ; vers .rbpack : code 2, renvoi à library", async () => {
    const dir = tmpDir();
    const a = await board(dir);
    expect(await main(["export", a, join(dir, "a.ubz"), "--ids", "x"], memoryIO())).toBe(2);
    const pdf = memoryIO();
    expect(await main(["export", a, join(dir, "a.pdf")], pdf)).toBe(3);
    expect(pdf.errors()[0].error.message).toContain("lot 3");
    const pack = memoryIO();
    expect(await main(["export", a, join(dir, "a.rbpack")], pack)).toBe(2);
    expect(pack.errors()[0].error.message).toContain("library");
  });
  it("op export vers .iwb dans run : kind iwb ; avec ids : code 2", async () => {
    const dir = tmpDir();
    const a = await board(dir);
    const ok = memoryIO([JSON.stringify({ op: "export", to: join(dir, "r.iwb") })]);
    expect(await main(["run", a], ok)).toBe(0);
    expect(ok.json()[0]).toMatchObject({ op: 1, ok: true, kind: "iwb" });
    const bad = memoryIO([JSON.stringify({ op: "export", to: join(dir, "r.iwb"), ids: ["x"] })]);
    expect(await main(["run", a], bad)).toBe(2);
  });
  it("image du document non lue : UNREAD_ASSETS_MESSAGE, code command, rien d'écrit", async () => {
    const s = await nodeSession(memoryIO());
    const tab = s.newTab().session;
    tab.doc.apply({ type: "AddImage", page: tab.doc.pageIds()[0]!, asset: { id: "ab".repeat(32), name: "a.png", mime: "image/png", size: 3 }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] });
    const out = join(tmpDir(), "x.iwb");
    await expect(exportBoardFile(s, out)).rejects.toMatchObject({ code: "command", message: UNREAD_ASSETS_MESSAGE });
    expect(existsSync(out)).toBe(false);
  });
});

describeWasm("S2 — convert des cinq tableaux (D25)", () => {
  it("S2 — convert lecon.iwb : 0, 8 objets, avis de la vidéo ; pages des autres tableaux", async () => {
    const dir = tmpDir();
    const f = boardFixtures(dir);
    const cases: Array<[string, number, number | null, string | null]> = [
      [f.iwb, 1, 8, "vidéo"],
      [f.iwbRaw, 3, null, null],
      [f.ubz, 1, 4, null],
      [f.notebook, 2, 4, null],
      [f.olf, 1, 3, null],
      [f.flipchart, 2, 5, "TIFF"],
    ];
    for (const [src, pages, first, said] of cases) {
      const out = `${src}.roomboard`;
      const io = memoryIO();
      expect(await main(["convert", src, out], io), src).toBe(0);
      const r: Json = io.json()[0];
      expect(r.pages, src).toBe(pages);
      if (said !== null) expect(r.notices.join(" "), src).toContain(said);
      if (first !== null) {
        const st = memoryIO();
        await main(["state", out], st);
        expect(st.json()[0].pages[0].elements, src).toHaveLength(first);
      }
    }
  });
  it("convert : sources et sorties refusées (.pdf : 3 ; .rbitem, .rbpack, .png : 2)", async () => {
    const dir = tmpDir();
    const a = await board(dir);
    expect(await main(["convert", a, join(dir, "x.pdf")], memoryIO())).toBe(3);
    expect(await main(["convert", join(dir, "doc.pdf"), join(dir, "x.roomboard")], memoryIO())).toBe(3);
    expect(await main(["convert", join(dir, "s.rbitem"), join(dir, "x.roomboard")], memoryIO())).toBe(2);
    expect(await main(["convert", a, join(dir, "x.rbpack")], memoryIO())).toBe(2);
    expect(await main(["convert", a, join(dir, "x.png")], memoryIO())).toBe(2);
  });
  it("RF5 — tableau vers tableau (.ubz → .iwb) sans .roomboard, sortie existante remplacée (H16)", async () => {
    const dir = tmpDir();
    const f = boardFixtures(dir);
    const out = join(dir, "o.iwb");
    writeFileSync(out, "ancien");
    const before = stampOf(out);
    const io = memoryIO();
    expect(await main(["convert", f.ubz, out], io)).toBe(0);
    expect(io.json()[0]).toMatchObject({ file: out, pages: 1 });
    expect(stampOf(out)).not.toEqual(before);
    expect(await main(["convert", out, join(dir, "o.roomboard")], memoryIO())).toBe(0);
  });
});
```

- [ ] **2. Rouge** — `cd <wt> && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli test 2>&1 | tail -20` : échecs attendus.

- [ ] **3. `formats.ts`** — `.iwb` et `.ubz` : `branched(2, 2, "iwb", { read: true, write: true }, UNREAD_IMAGES)`
  (idem `ubz`).

- [ ] **4. `exporter.ts`** — ajouter (imports : `writeBoardFile` de `../../web/src/app/board-convert`,
  `type BoardFormat` de `../../web/src/app/board-io`, `missingOf` de `../../web/src/app/container-io`,
  `UNREAD_ASSETS_MESSAGE` de `../../web/src/platform/controller`, `importBlocked, packMessage, type Lot` de `./formats`) :

```ts
const BOARD_OUT: ReadonlySet<string> = new Set([".iwb", ".ubz"]);
export const isBoardOut = (to: string): boolean => BOARD_OUT.has(extOf(to));

/** `.rbitem`, `.iwb`, `.ubz` ; `.rbpack` : usage (bibliothèque) ; un format écrit plus tard : code 3 ; tout autre : usage. */
export function checkExportTarget(to: string): void {
  const ext = extOf(to);
  if (ext === ".rbitem" || BOARD_OUT.has(ext)) return;
  if (ext === ".rbpack") throw new CliError("usage", packMessage(to));
  const lot = exportBlocked(to);
  if (lot !== null) throw new CliError("unsupported", unsupportedMessage(to, lot));
  throw new CliError("usage", `export : ${basename(to)} : sorties .rbitem, .iwb ou .ubz`);
}

export async function exportBoardFile(session: Session, to: string): Promise<{ file: string; kind: BoardFormat }> {
  checkExportTarget(to);
  const tab = session.active();
  if (missingOf(tab.doc, tab.assets).length > 0) throw new CliError("command", UNREAD_ASSETS_MESSAGE);
  const format = extOf(to).slice(1) as BoardFormat;
  let r: { bytes: Uint8Array; warnings: string[] };
  try {
    r = await writeBoardFile(tab.doc, tab.assets, format, session.deps.board);
  } catch (e) {
    throw asCliError(e, "command");
  }
  await session.write(to, r.bytes);
  session.deps.notices.push(...r.warnings); // D24 : avertissements d'écriture (boardListOf) dans notices
  return { file: to, kind: format };
}

const CONVERT_SOURCES: ReadonlySet<string> = new Set([".roomboard", ".iwb", ".ubz", ".notebook", ".olf", ".flipchart"]);
const CONVERT_TARGETS: ReadonlySet<string> = new Set([".roomboard", ".iwb", ".ubz"]);
function convertSide(path: string, allowed: ReadonlySet<string>, blocked: (p: string) => Lot | null, what: string): void {
  if (allowed.has(extOf(path))) return;
  const lot = blocked(path);
  if (lot !== null && lot >= 3) throw new CliError("unsupported", unsupportedMessage(path, lot));
  if (extOf(path) === ".rbpack") throw new CliError("usage", packMessage(path));
  throw new CliError("usage", `convert : ${basename(path)} : ${what} ${[...allowed].join(" ")} attendue (export pour un .rbitem)`);
}
/** D25 : avant tout chargement ; `.pdf` : 3 (lot 3) ; `.rbitem`, `.rbpack` et tout autre : 2. */
export function checkConvert(from: string, to: string): void {
  convertSide(from, CONVERT_SOURCES, importBlocked, "source");
  convertSide(to, CONVERT_TARGETS, exportBlocked, "sortie");
}
```

- [ ] **5. `session.ts`** — op `export` : en tête du `case`, avant le chemin `.rbitem` :

```ts
const to = needString(args, "to");
if (isBoardOut(to)) {
  for (const k of ["ids", "page", "grid", "name"]) {
    if (args[k] !== undefined) throw new CliError("usage", `export ${extOf(to)} : document entier, « ${k} » ne s'y applique pas`);
  }
  return { ...(await exportBoardFile(session, to)) };
}
```

  (puis le chemin `.rbitem` de T5 avec `to`).

- [ ] **6. `main.ts`** — `USAGE.export = "export <fichier> <sortie.rbitem | .iwb | .ubz> [--page <id>] [--ids a,b | --all | --grid] [--name <nom>]"`,
  `USAGE.convert = "convert <source> <sortie.roomboard | .iwb | .ubz>"`. Dans `export`, après `checkExportTarget(to)` :

```ts
if (isBoardOut(to) && (p.flags.has("--page") || idsText !== undefined || p.flags.has("--all") || grid || p.flags.has("--name"))) {
  throw new CliError("usage", `export ${extOf(to)} : document entier ; --page, --ids, --all, --grid et --name ne s'y appliquent pas`);
}
```

  puis après `await session.open(file);` :

```ts
const result = isBoardOut(to)
  ? await exportBoardFile(session, to)
  : await exportFragment(session, { to, page: flagStr(p, "--page"), ids, name: flagStr(p, "--name"), grid });
const notices = session.deps.notices;
io.out(JSON.stringify({ ...result, ...(notices.length > 0 ? { notices } : {}) }));
```

  Nouvelle commande :

```ts
convert: async (args, io) => {
  const p = parseArgs(args, {});
  const [from, to] = p.positional;
  if (from === undefined || to === undefined || p.positional.length !== 2) throw usage(USAGE.convert);
  checkConvert(from, to); // code 2 ou 3 avant tout chargement (D25)
  const session = await nodeSession(io);
  const tab = (await session.open(from)).session;
  if (extOf(to) === ".roomboard") await session.save(tab, to);
  else await exportBoardFile(session, to);
  io.out(JSON.stringify({ file: to, from, pages: tab.doc.pageIds().length, notices: session.deps.notices }));
  return 0;
},
```

- [ ] **7. Vert** — `cd <wt> && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli test 2>&1 | tail -20`
  Attendu : tous `passed`, aucun `skipped`, aucun `FAIL ` ;
  `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/convert.test.ts 2>&1 | tail -6` :
  `Tests  8 passed` ; build CLI sans erreur. Si la géométrie relue dépasse 2 px pour une forme, ne pas élargir la
  tolérance : rapporter l'écart (élément, valeurs) — c'est une perte de l'écrivain du produit. Tests à garder verts :
  `export.test.ts` (S4 du lot 1), `rbitem.test.ts`, `boards.test.ts`.

- [ ] **8. Commit**

```bash
git -C <wt> add apps/cli/src/exporter.ts apps/cli/src/session.ts apps/cli/src/main.ts apps/cli/src/formats.ts apps/cli/src/formats.test.ts apps/cli/src/export.test.ts apps/cli/src/convert.test.ts
git -C <wt> commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -F - <<'EOF'
feat(cli): export .iwb and .ubz through writeBoardFile, add convert

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

<a id="tache-t9"></a>

### Tâche T9 — CLI : commande `library`, `LOT_LIVRE = 2`, aide, essai, profil

**Objectif.** Brancher `library list|import|export <dossier>` (T8) dans `main.ts` ; `.rbpack` couvert en lecture et
écriture ; `LOT_LIVRE = 2` avec son test ; aide (`convert`, `library`) ; `scripts/essais/cli-essai.mjs` gagne un
contrôle par format du lot 2 ; profil § CLI à jour. Scénarios servis : **S4**, **S5**.

**Worktree.** Isolé : `~/projets/roomboard-wt/cli-lot2--T9` (après fusion de T7 et T8). Préparer :
`cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r /home/adminjd/projets/roomboard-wt/cli-lot2/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot2/apps/web/src/wasm-formats apps/web/src/`
(vrai Wasm exigé ; le build de la CLI le copie dans `apps/cli/dist/`).

**Fichiers.** Modifier : `apps/cli/src/main.ts`, `main.test.ts`, `formats.ts`, `formats.test.ts`,
`scripts/essais/cli-essai.mjs`, `.claude/chantier.md` (§ CLI).

**Interfaces.**
- Consomme : `openLibrary`, `libraryList`, `libraryImport`, `libraryExport` (T8) ; `session.deps.core`,
  `session.deps.codec`, `session.deps.now` (T6) ; fabriques (T3) ; `convert`, `export --grid` (T5, T7).
- Produit : commande `library` (contrat DA10) :
  `library list <dossier> [--folder <f>]` → `{"library":…,"folder":…,"folders":[…],"items":[…]}` ;
  `library import <dossier> <paquet.rbpack>` → `{"library":…,"folder":…,"count":n,"notices":[importedMessage]}` ;
  `library export <dossier> <sortie.rbpack> [--folder <f>]` → `{"file":…,"name":…,"skipped":[…]}`.
- Réutilise : `library.ts:126,260,294,353` ; `library-files.ts:193` — `createResourceLibrary(…)`, `importPack`, `exportPack("mine", folder)`, `refresh()` + `folder("mine", f)`, `importedMessage`, par `openLibrary` de T8 (réutiliser).
- Réutilise : `apps/cli/src/formats.ts:12,55,80-89` — `covered` de `.rbpack`, `LOT_LIVRE` = plus haut lot couvert (étendre).
- Réutilise : fichiers d'essai — `scripts/essais/fabriques/tableaux.mjs` (`iwbZip(zip)`, `iwbRaw3()`, `ubzZip(zip)`, `notebookZip(zip)`, `olfZip(zip)`, `flipPages()`), `fabriques/flipchart.mjs:360` (`makeFlipchart(pages, deflate)`), `commun.mjs:220` (`solidPng`) (réutiliser).
- Rapport : `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne.

**Contraintes (recopiées).**
- G1 — TDD : test rouge d'abord. Aucun test désactivé, sauté, ni seuil changé.
- G2 — Aucune logique recopiée (0281) : la commande ne fait qu'appeler `library.ts` de la CLI (T8).
- G3 — Aucun changement Rust ; tailles Wasm inchangées (plafonds 1 572 864 o et 3 145 728 o) ; vérifier `git -C <wt> diff --stat origin/main -- crates/` vide.
- G4 — L'essai fabrique ses fichiers (fabriques du dépôt), écrit sous `mkdtempSync` et nettoie ; aucun fichier téléchargé.
- G5 — `nice -n 10` ; un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé.
- G6 — Wasm copié comme indiqué ci-dessus.
- G7 — Auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers un par un ; aucun `--force`.
- G8 — D15 : `FORMAT_LOTS` (`.rbpack`, `LOT_LIVRE`), tests **et** `cli-essai.mjs` (un contrôle par format du lot 2).
- G9 — Aucune dépendance ajoutée (l'essai charge fflate depuis `apps/web/package.json` par `createRequire`, comme C13).

**Interdits.** Pas d'op `library` dans `run` (H22) ; racine « mine » seule ; pas de `library add`. Ne pas retirer ni
affaiblir un contrôle existant de `cli-essai.mjs` (26 contrôles du lot 1).

**Terminé quand.** Suite CLI verte sous `ROOMBOARD_WASM_REQUIRED=1` ; `node scripts/essais/cli-essai.mjs` finit par
`CLI : OK` ; `--help` liste `convert` et `library` ; profil mis à jour ; un commit.

**Étapes.**

- [ ] **1. Tests rouges** — `formats.test.ts` : le test « lot 1 : … » devient « lots livrés (LOT_LIVRE = 2) » :

```ts
expect(LOT_LIVRE).toBe(2);
const rows = formatRows();
expect(rows.filter((r) => r.read).map((r) => r.ext).sort()).toEqual([".flipchart", ".iwb", ".jpeg", ".jpg", ".notebook", ".olf", ".png", ".rbitem", ".rbpack", ".roomboard", ".ubz", ".xlsm", ".xlsx"]);
expect(rows.filter((r) => r.write).map((r) => r.ext).sort()).toEqual([".iwb", ".rbitem", ".rbpack", ".roomboard", ".ubz"]);
expect(rows.find((r) => r.ext === ".rbpack")?.notes.join(" ")).toContain("library import");
```

  `main.test.ts` : dans le test d'aide, ajouter
  `expect(out.usage).toContain("roomboard convert <source> <sortie.roomboard | .iwb | .ubz>");` et
  `expect(out.usage.some((u: string) => u.startsWith("roomboard library list <dossier>"))).toBe(true);` ; ajouter :

```ts
describe("main : library (DA9, DA10)", () => {
  it("usage : sous-commande inconnue, arguments manquants, sortie non .rbpack : code 2 sans charger", async () => {
    for (const argv of [["library"], ["library", "add", "/tmp/x"], ["library", "import", "/tmp/x"], ["library", "export", "/tmp/x", "/tmp/p.zip"], ["library", "import", "/tmp/x", "/tmp/p.rbpack", "--folder", "F"]]) {
      const io = memoryIO([], {}, new URL("file:///roomboard-absent/"));
      expect(await main(argv, io), argv.join(" ")).toBe(2);
    }
  });
});

describeWasm("S4 — library par la commande", () => {
  it("S4 — export --folder, import, list ; state de la ressource relue = original ; import d'un .rbpack dans un tableau : 2", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    const lib = join(dir, "lib");
    mkdirSync(join(lib, "Formes"), { recursive: true });
    expect(await main(["new", a], memoryIO())).toBe(0);
    const shape = (x: number) => JSON.stringify({ type: "AddShape", page: "$page:0", shape: "rect", x0: x, y0: 0, x1: x + 50, y1: 50, style: { color: "#000000", width: 2 }, fill: null });
    const run = memoryIO([shape(0), shape(100)]);
    expect(await main(["run", a, "--save"], run)).toBe(0);
    const [first, second] = run.json().slice(0, 2).map((l: Json) => l.change.ids[0]); // 3e ligne : { written }
    expect(await main(["export", a, join(lib, "Formes", "carre.rbitem"), "--ids", first], memoryIO())).toBe(0);
    expect(await main(["export", a, join(lib, "Formes", "rond.rbitem"), "--ids", second], memoryIO())).toBe(0);
    const pack = join(dir, "p.rbpack");
    const ex = memoryIO();
    expect(await main(["library", "export", lib, pack, "--folder", "Formes"], ex)).toBe(0);
    expect(ex.json()[0]).toEqual({ file: pack, name: "Formes.rbpack", skipped: [] });
    const lib2 = join(dir, "lib2");
    const im = memoryIO();
    expect(await main(["library", "import", lib2, pack], im)).toBe(0);
    expect(im.json()[0]).toMatchObject({ library: lib2, folder: "Formes", count: 2, notices: [expect.stringContaining("p.rbpack")] });
    const ls = memoryIO();
    expect(await main(["library", "list", lib2, "--folder", "Formes"], ls)).toBe(0);
    expect(ls.json()[0].items.map((i: Json) => i.name).sort()).toEqual(["carre", "rond"]);
    const s1 = memoryIO();
    const s2 = memoryIO();
    await main(["state", join(lib, "Formes", "carre.rbitem")], s1);
    await main(["state", join(lib2, "Formes", "carre.rbitem")], s2);
    expect(normalizeIds(s2.json()[0].pages)).toEqual(normalizeIds(s1.json()[0].pages));
    expect(await main(["import", a, pack], memoryIO())).toBe(2);
  });
});
```

  (imports à ajouter dans `main.test.ts` : `mkdirSync`, `join`, `normalizeIds`, `tmpDir` si absents.)

- [ ] **2. Rouge** — `cd <wt> && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli test 2>&1 | tail -20` : échecs attendus.

- [ ] **3. `formats.ts`** — `[".rbpack", branched(2, 2, "rbpack", { read: true, write: true }, "par `library import` / `library export`")],`
  et `export const LOT_LIVRE: Lot = 2;` (en-tête : retirer « Un chantier qui livre un format… passe `read`/`write` à
  vrai » au profit de « passe son `covered` »).

- [ ] **4. `main.ts`** — `USAGE.library = "library list <dossier> [--folder <f>] | library import <dossier> <paquet.rbpack> | library export <dossier> <sortie.rbpack> [--folder <f>]"` ;
  importer `openLibrary, libraryList, libraryImport, libraryExport` de `./library` ; commande :

```ts
library: async (args, io) => {
  const [sub, ...rest] = args;
  const p = parseArgs(rest, { "--folder": "value" });
  const [dir, file] = p.positional;
  const n = p.positional.length;
  const ok = (sub === "list" && n === 1) || (sub === "import" && n === 2 && !p.flags.has("--folder")) || (sub === "export" && n === 2);
  if (!ok || dir === undefined) throw usage(USAGE.library);
  if (file !== undefined && extOf(file) !== ".rbpack") throw new CliError("usage", `library ${sub} : ${file} : un paquet .rbpack est attendu`);
  const folder = flagStr(p, "--folder") ?? "";
  const session = await nodeSession(io);
  const lib = openLibrary(dir, { core: session.deps.core, codec: session.deps.codec, now: () => session.deps.now() });
  if (sub === "list") io.out(JSON.stringify({ library: dir, ...(await libraryList(lib, folder)) }));
  else if (sub === "import") io.out(JSON.stringify({ library: dir, ...(await libraryImport(lib, file!)) }));
  else io.out(JSON.stringify(await libraryExport(lib, file!, folder)));
  return 0;
},
```

  En-tête de `main.ts` : « cli-lot2 : `convert` (D25), `library` (DA9, H13) ».

- [ ] **5. Vert unitaire** — `cd <wt> && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli test 2>&1 | tail -20`
  Attendu : tous `passed`, aucun `skipped`, aucun `FAIL `.

- [ ] **6. Essai `cli-essai.mjs`** — en-tête : ajouter « Lot 2 (cadrage cli-lot2, S5) : réimport d'un `.rbitem`,
  grille, `convert` des cinq tableaux fabriqués, export `.iwb`/`.ubz` relus, aller-retour `.rbpack` par `library`,
  règle D23 ». Imports : `mkdirSync` (dans l'import `node:fs`), puis

```js
import { createRequire } from "node:module";
import { deflateSync } from "node:zlib";
import { flipPages, iwbRaw3, iwbZip, notebookZip, olfZip, ubzZip } from "./fabriques/tableaux.mjs";
import { makeFlipchart } from "./fabriques/flipchart.mjs";

const { zipSync } = createRequire(join(ROOT, "apps", "web", "package.json"))("fflate");
```

  Insérer juste avant `console.log("CLI : OK");` :

```js
  // ---- Lot 2 (cadrage cli-lot2, S5) ----
  const lot2 = f.filter((x) => x.readLot === 2 || x.writeLot === 2);
  verifie("formats : les 7 formats du lot 2 lus et écrits", lot2.length === 7 && lot2.every((x) => (x.readLot !== 2 || x.read) && (x.writeLot !== 2 || x.write)), JSON.stringify(lot2.map((x) => [x.ext, x.read, x.write])));

  const grille = { visible: true, snap: false, above: false, levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#000000", line: "solid", lineWidth: 1, snap: false, visible: true }] };
  const b = join(dir, "b.roomboard");
  const tb = cli(["run", "--new", "--out", b, "--ops", "-"], `${[
    { type: "AddShape", page: "$page:0", shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style, fill: "#fde68a" },
    { type: "SetGrid", page: "$page:0", grid: grille },
  ].map((o) => JSON.stringify(o)).join("\n")}\n`);
  verifie("tableau b : un rectangle et une grille", tb.code === 0, tb.brut);
  const etatB = etat(b);

  const carre = join(dir, "carre.rbitem");
  const ec = cli(["export", b, carre, "--all"]);
  verifie("export --all de b : un objet", ec.code === 0 && ec.lignes[0].elements === 1, ec.brut);
  const c = join(dir, "c.roomboard");
  const ri = cli(["run", "--new", "--out", c, "--ops", "-"], `${JSON.stringify({ op: "import", files: [carre], at: [200, 150] })}\n`);
  verifie("réimport du .rbitem dans un tableau neuf : inséré", ri.code === 0 && ri.lignes[0].inserted?.length === 1, ri.brut);
  egal("réimport : même élément que l'original (ids par rang, centre gardé)", normalise(etat(c).pages[0].elements), normalise(etatB.pages[0].elements));

  const g = join(dir, "grille.rbitem");
  const eg = cli(["export", b, g, "--grid"]);
  verifie("export --grid : .rbitem de grille", eg.code === 0 && eg.lignes[0].kind === "grid", eg.brut);
  const ig = cli(["import", c, g]);
  verifie("import du .rbitem de grille : appliqué", ig.code === 0 && ig.lignes[0].inserted?.length === 1, ig.brut);
  egal("grille de c = grille de b", etat(c).pages[0].page.grid, etatB.pages[0].page.grid);

  const tableaux = [
    ["lecon.iwb", iwbZip(zipSync), 1, 8, "vidéo"],
    ["brut.iwb", Buffer.from(iwbRaw3(), "utf8"), 3, null, null],
    ["openboard.ubz", ubzZip(zipSync), 1, 4, null],
    ["lecon.notebook", notebookZip(zipSync), 2, 4, null],
    ["cours.olf", olfZip(zipSync), 1, 3, null],
    ["cours.flipchart", Buffer.from(makeFlipchart(flipPages(), deflateSync)), 2, 5, "TIFF"],
  ];
  for (const [nom, octets, pages, objets, avis] of tableaux) {
    const src = join(dir, nom);
    writeFileSync(src, octets);
    const out = join(dir, `${nom}.roomboard`);
    const cv = cli(["convert", src, out]);
    verifie(`convert ${nom} : ${pages} page(s)`, cv.code === 0 && cv.lignes[0].pages === pages, cv.brut);
    if (objets !== null) {
      const nb = etat(out).pages[0].elements.length;
      verifie(`convert ${nom} : ${objets} objets en page 1`, nb === objets, String(nb));
    }
    if (avis !== null) verifie(`convert ${nom} : avis « ${avis} »`, cv.lignes[0].notices.join(" ").includes(avis), JSON.stringify(cv.lignes[0].notices));
  }
  verifie(".olf : fond #ffeecc", etat(join(dir, "cours.olf.roomboard")).pages[0].page.background.toLowerCase() === "#ffeecc");

  for (const ext of ["iwb", "ubz"]) {
    const outB = join(dir, `b.${ext}`);
    const e = cli(["export", b, outB]);
    verifie(`export b.${ext}`, e.code === 0 && e.lignes[0].kind === ext, e.brut);
    const back = join(dir, `b-${ext}.roomboard`);
    const cv = cli(["convert", outB, back]);
    verifie(`relecture de b.${ext} : une page`, cv.code === 0 && cv.lignes[0].pages === 1, cv.brut);
    egal(`relecture de b.${ext} : mêmes sortes`, etat(back).pages[0].elements.map((x) => x.kind), etatB.pages[0].elements.map((x) => x.kind));
  }

  const lib = join(dir, "lib");
  mkdirSync(join(lib, "Formes"), { recursive: true });
  const e1 = cli(["export", b, join(lib, "Formes", "carre.rbitem"), "--all"]);
  const e2 = cli(["export", a, join(lib, "Formes", "page.rbitem"), "--page", page0, "--all"]);
  verifie("deux .rbitem dans lib/Formes", e1.code === 0 && e2.code === 0, `${e1.brut}${e2.brut}`);
  const pack = join(dir, "p.rbpack");
  const le = cli(["library", "export", lib, pack, "--folder", "Formes"]);
  verifie("library export : paquet écrit, rien laissé de côté", le.code === 0 && le.lignes[0].skipped.length === 0 && existsSync(pack), le.brut);
  const lib2 = join(dir, "lib2");
  const li = cli(["library", "import", lib2, pack]);
  verifie("library import : dossier Formes, 2 ressources", li.code === 0 && li.lignes[0].folder === "Formes" && li.lignes[0].count === 2, li.brut);
  const ll = cli(["library", "list", lib2, "--folder", "Formes"]);
  verifie("library list : 2 ressources", ll.code === 0 && ll.lignes[0].items.length === 2, ll.brut);
  egal("ressource relue = original (ids par rang)", normalise(etat(join(lib2, "Formes", "carre.rbitem"))), normalise(etat(join(lib, "Formes", "carre.rbitem"))));
  const ip = cli(["import", a, pack]);
  verifie("import d'un .rbpack dans un tableau : code 2, renvoi à library", ip.code === 2 && String(ip.err?.error?.message).includes("library"), ip.brut);

  const iwbSrc = join(dir, "lecon.iwb");
  const avantIwb = empreinte(iwbSrc);
  const sv = cli(["run", iwbSrc, "--save", "--ops", "-"], "");
  verifie("D23 : run lecon.iwb --save : code 2, fichier intact", sv.code === 2 && empreinte(iwbSrc) === avantIwb, sv.brut);
  const z = join(dir, "z.iwb");
  const nz = cli(["new", z]);
  verifie("D23 : new z.iwb : code 2, rien d'écrit", nz.code === 2 && !existsSync(z), nz.brut);
  verifie(".pdf toujours au lot 3 : convert vers .pdf code 3", cli(["convert", a, join(dir, "a.pdf")]).code === 3);
```

- [ ] **7. Profil** — `.claude/chantier.md` § CLI : la ligne « Écritures (`new`, `run --save`, `import`, `export`) … »
  devient « Écritures (`new`, `run --save`, `import`, `export`, `convert`, `library import|export`) seulement sur des
  fichiers temporaires, jamais sur un fichier de Jérôme ; … » (suite inchangée) ; « Lots restants » devient « Lots
  restants : 3 (PDF) et 4 (Office, médias, 3D, autres images) — `docs/plans/cli-cadrage.md` § 7 ; lot 2 livré :
  `docs/plans/cli-lot2-cadrage.md` » ; la ligne des codes gagne « ; toute écriture de document (`new`, `save`,
  `--save`, `--out`, `apply`, `import`) vise un `.roomboard`, sinon 2 ».

- [ ] **8. Vert de bout en bout** — `cd <wt> && nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -5 && node scripts/essais/cli-essai.mjs 2>&1 | tail -40`
  Attendu : lignes `ok — N …` jusqu'à N ≥ 26 + 30, dernière ligne `CLI : OK`, code 0. Puis
  `node apps/cli/dist/roomboard.mjs --help | grep -c "convert\|library"` ≥ 1 ;
  `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli test 2>&1 | tail -8` : tous verts ;
  `git -C <wt> diff --stat origin/main -- crates/` : vide. Tests à garder verts : toute la suite `apps/cli`,
  `scripts/controle-licences.mjs` (`node scripts/controle-licences.mjs 2>&1 | tail -3`, aucune dépendance ajoutée).

- [ ] **9. Commit**

```bash
git -C <wt> add apps/cli/src/main.ts apps/cli/src/main.test.ts apps/cli/src/formats.ts apps/cli/src/formats.test.ts scripts/essais/cli-essai.mjs .claude/chantier.md
git -C <wt> commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -F - <<'EOF'
feat(cli): library command, lot 2 delivered, end-to-end checks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

## Couverture du cadrage (relecture)

| entrée du cadrage | tâche |
|---|---|
| D17 port générique, adaptateur `workspace.ts:348` | T1 |
| D18 insertion `.rbitem` (objets, grille, `--at`, cascade, tableau neuf) | T5 |
| D19 `encodeIds`, `--grid`, `MISSING_EXPORT_MESSAGE` | T1, T5 |
| D20 Worker en processus | T2 (extraction), T6, T8 (branchement) |
| D21 `board-convert.ts` | T4 |
| D22 `readDoc` par extension, `openBoard`, `state`, `tab.open`, `export <tableau>` | T6 |
| D23 `documentTarget`, contrôle préalable | T6 |
| D24 export `.iwb`/`.ubz` | T7 |
| D25 `convert` | T7 |
| D26 `.rbpack` → bibliothèque ; renvoi à `library` (import T6, export et convert T7) | T6, T7, T8, T9 |
| D27 `covered`, `LOT_LIVRE` | T5 (structure), T6, T7, T9 |
| D28 fabriques | T3 (déplacées), T6 (`boardFixtures`), T9 (essai) |
| D29 panique → refus d'écrire | T2 (relance), T6 (`onPanic`, `interrupted`, import) |
| D30 aide, profil, essai | T7 (`convert`), T9 (`library`, profil, essai) |
| Carte 3.1 à 3.7 (« touché ») | T1 à T9 (colonne fichiers touchés) |
| Effets de bord : collage/dépôt/export par `view` | T1 (`fragments.test.ts`, `workspace.test.ts` ; e2e C3, C4 en fin) |
| Effets de bord : Workers délèguent | T2 (`board-reader.test.ts`, `zip-worker.test.ts`, `zip-read.test.ts` ; e2e C13 en fin) |
| Effets de bord : `openBoard`/`exportBoard` par `board-convert.ts` | T4 (`workspace.test.ts`, `board-convert.test.ts`) |
| Effets de bord : D23 change le contrat du lot 1 | T6 (`main.test.ts` D23), T9 (essai) |
| Effets de bord : `.iwb` plus en code 3, message d'image absente du produit | T7 (`export.test.ts`, `formats.test.ts`), T1 (`encodeIds` export) |
| S1 / S2 / S3 / S4 / S5 | T5 / T6, T7 / T7 / T8, T9 / T9 |

Points laissés à l'orchestrateur : `verifier.sh --e2e` (C3, C4, C13 au navigateur, tailles Wasm sous plafond) après
T9 ; `boardTabName` peut rester sans usage dans la CLI (écart attendu au rapport de T6).
