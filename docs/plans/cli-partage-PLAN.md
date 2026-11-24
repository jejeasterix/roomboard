# cli-partage (OF12) — plan d'exécution

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**Goal :** la CLI n'a plus de copie de l'ouverture et de l'export d'un tableau : un module de la page
(`apps/web/src/app/open-export.ts`) les fait pour `workspace.ts` et pour la CLI, sans changement visible ; restes :
`VITEST_MAX_WORKERS=3` par défaut dans `scripts/verifier.sh`, chargements à froid des tests de la CLI en `beforeAll`.

**Architecture :** caractérisation d'abord sur le code de la base (tests CLI, essai, script de comparaison), puis le
module (messages rendus comme données, copie avant l'export optionnelle), puis les délégations de la page et de la CLI
en parallèle. Lecture et écriture profondes (`board-convert.ts`, `pdf-convert.ts`) inchangées.

**Tech Stack :** TypeScript strict, vitest 4.1.12, cœur Rust en Wasm (non modifié), Node ≥ 22, pnpm.

**Spec :** `docs/plans/cli-partage-cadrage.md`

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Caractérisation CLI (messages, avis, onglets pleins, `created`) | — | apps/cli/src/boards.test.ts, apps/cli/src/convert.test.ts | isolé : ~/projets/roomboard-wt/cli-partage--T1 | implementeur-tdd | CLI : `boards.test.ts` et `convert.test.ts` verts sur la base, ≥ 7 tests neufs « caractérisation cli-partage » présents | S1 | #tache-t1 |
| T2 | Module `open-export.ts` et `Tabs.full()` | — | apps/web/src/app/open-export.ts (neuf), apps/web/src/app/open-export.test.ts (neuf), apps/web/src/app/tabs.ts, apps/web/src/app/tabs.test.ts | isolé : ~/projets/roomboard-wt/cli-partage--T2 | concepteur-critique | web : `open-export.test.ts` ≥ 12 tests verts (dont « vrai cœur : created »), `tabs.test.ts` « full (cli-partage, D5) » vert ; `tsc` web et CLI sans erreur | S3 | #tache-t2 |
| T3 | La page délègue au module | T2 | apps/web/src/app/workspace.ts | isolé : ~/projets/roomboard-wt/cli-partage--T3 | implementeur-tdd | web : suite complète verte dont `workspace.test.ts` ; grep des littéraux de la page : 0 ligne ; `git diff` des trois tests de la page vide | S3 | #tache-t3 |
| T4 | La CLI délègue au module | T1, T2, T6 | apps/cli/src/session.ts, apps/cli/src/exporter.ts, apps/cli/src/importer.ts | isolé : ~/projets/roomboard-wt/cli-partage--T4 | implementeur-tdd | grep S4 : 0 ligne (16 sur la base) ; CLI : suite complète verte ; `CLI : OK` avec E1 à E5 | S4 | #tache-t4 |
| T5 | `VITEST_MAX_WORKERS` par défaut et `beforeAll` des chargements à froid | T1 | apps/cli/src/testing.ts, scripts/verifier.sh, scripts/tests/verifier-e2e.test.sh, apps/cli/src/{boards,contract,convert,export,guards,images,import,library,main,media,rbitem,session,pdf-node,office,model3d-node,model3d}.test.ts | isolé : ~/projets/roomboard-wt/cli-partage--T5 | implementeur-tdd | `verifier-e2e.test.sh : OK` ; CLI : suite complète verte, aucun « Test timed out » ; test « warmModules » vert | S5 | #tache-t5 |
| T6 | Essai `cli-essai.mjs` étendu (E1 à E5) | — | scripts/essais/cli-essai.mjs | isolé : ~/projets/roomboard-wt/cli-partage--T6 | implementeur-tdd | `CLI : OK` sur la base avec les lignes `ok — … E1` à `E5` | S2 | #tache-t6 |
| T7 | Script de comparaison base ↔ branche (S1) | T6 | scripts/essais/cli-comparer.mjs (neuf), scripts/essais/cli-normalise.mjs (neuf), scripts/essais/cli-essai.mjs | isolé : ~/projets/roomboard-wt/cli-partage--T7 | implementeur-tdd | `COMPARAISON : OK` (B = N), `COMPARAISON : ÉCART` (faux N), `CLI : OK` ; commande de clôture S1 écrite dans la section | S1 | #tache-t7 |

Vagues : 1 = T1, T2, T6 (parallèles, aucun fichier commun) ; 2 = T3, T4, T5, T7 (parallèles, aucun fichier commun).

## Carte des fichiers

| fichier | rôle | tâche |
|---|---|---|
| `apps/web/src/app/open-export.ts` (neuf) | couche « ouvrir / exporter » partagée : messages d'échec, avis rendus, garde des images, copie optionnelle avant l'export d'un tableau | T2 |
| `apps/web/src/app/open-export.test.ts` (neuf) | tests du module (faux cœur ; vrai cœur pour `created`) | T2 |
| `apps/web/src/app/tabs.ts`, `tabs.test.ts` | `Tabs.full()` | T2 |
| `apps/web/src/app/workspace.ts` | `openPdf`, `exportPdf`, `openBoard`, `exportBoard`, `:777`, `:861`, `full` délèguent | T3 |
| `apps/cli/src/session.ts`, `exporter.ts`, `importer.ts` | délèguent ; messages et canaux de la CLI gardés | T4 |
| `apps/cli/src/boards.test.ts`, `convert.test.ts` | caractérisation (T1), puis `beforeAll` (T5) | T1, T5 |
| `apps/cli/src/testing.ts` + 16 fichiers de test | `warmModules()` et `beforeAll` (D11) | T5 |
| `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh` | `VITEST_MAX_WORKERS` (D10) | T5 |
| `scripts/essais/cli-essai.mjs` | E1 à E5 (T6), `normalise` importé (T7) | T6, T7 |
| `scripts/essais/cli-normalise.mjs` (neuf) | `normalise`, déplacée de `cli-essai.mjs:56-71` | T7 |
| `scripts/essais/cli-comparer.mjs` (neuf) | comparaison B ↔ N (S1) | T7 |

## Global Constraints

- **GC1** — Refactor sans changement de comportement : les tests existants de la page (dont `workspace.test.ts`) et de la CLI restent verts sans réécriture de fond ; mêmes stdout/stderr/JSON/codes de la CLI. Tests du module extrait ajoutés.
- **GC2** — TDD : test rouge d'abord (pour un pur déplacement, tests de caractérisation écrits et verts sur la base AVANT le refactor).
- **GC3** — VM partagée : builds/tests en `nice -n 10`, `cargo … -j 4`. Un test qui échoue sur un délai est rejoué une fois avant d'être jugé ; aucun délai (testTimeout, hookTimeout) relevé, aucun test désactivé/sauté, aucun seuil changé.
- **GC4** — Preuves bornées : ex. `cd apps/cli && nice -n 10 pnpm exec vitest run src/<f>.test.ts 2>&1 | tail -15` ; les tests de la CLI qui exigent le Wasm ont besoin des modules construits (`apps/web/src/wasm`, `apps/web/src/wasm-formats` — présents dans `~/projets/roomboard-wt/cli-partage`, à copier dans un worktree neuf) et de `ROOMBOARD_WASM_REQUIRED=1` pour ne pas se sauter.
- **GC5** — Ne pas toucher `apps/web/src/platform/`. Aucun Rust modifié. Tailles Wasm inchangées (modules copiés, jamais reconstruits).
- **GC6** — Git : jamais `git add -A`/`.`/`commit -a` ; fichiers ajoutés un par un ; auteur `jejeasterix <jejeasterix@users.noreply.github.com>` ; messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Pas de `--force`.
- **GC7** — Fichiers d'essai fabriqués depuis les fixtures du dépôt, aucun téléchargé ; écritures de la CLI seulement sous un dossier temporaire.
- **GC8** — `scripts/essais/cli-essai.mjs` étendu (S2) et doit afficher `CLI : OK`.
- **GC9** — Le scénario S1 (comparaison avec la CLI construite depuis la base 7092fdd) se joue à la clôture par l'orchestrateur, par le script de T7.
- **GC10** — Divergences gardées (D7, D8, H1, H6) : la CLI n'écrit jamais de copie avant l'export d'un tableau ; un échec d'écriture `.iwb`/`.ubz` reste sans préfixe dans la CLI ; les avertissements d'écriture restent bruts dans `notices` ; l'avis « onglets pleins » de l'importeur reste nommé.

## Review Focus

1. **Document neuf exporté puis enregistré par la CLI** (cadrage D7, § 3.3, effet de bord 1) : `created === modified` dans le manifeste ; une copie avant l'export le casserait sans qu'aucun test existant ne le voie → T1 (`convert.test.ts`, test D7), T2 (`open-export.test.ts`, vrai cœur « sans copy »).
2. **Échec d'ouverture d'un tableau** (R1, R6, S2 E1, E3) : `Ouverture impossible (<nom>) : <message du lecteur>`, un seul préfixe, même chaîne côté CLI (stderr, `notices` de l'import) → T1 (`boards.test.ts`, trois tests « caractérisation »), T2 (« refus du lecteur »).
3. **Onglets pleins pendant un import** (R5, D5, S2 E4) : 12 onglets puis import d'un tableau → avis nommé, op en échec, code 1 → T1 (« 12 onglets »), T2 (`tabs.test.ts` « full »).
4. **Avis d'ouverture** (D4, S2 E2) : un seul `boardWarningsMessage` par tableau, aucun avis pour un PDF de 3 pages ; ordre de la page inchangé → T1 (« import lecon.iwb three.pdf »), T2 (« avertissements »), T3 (`workspace.test.ts` vert sans modification).
5. **Écriture d'un `.iwb` refusée dans la CLI** (D8 a, GC10) : `CliError("command")` au message brut, sans « Export impossible : » ; rien d'écrit ; avertissements d'écriture bruts dans `notices` (D8 b) → T1 (`convert.test.ts`, tests D8 et D8 (b)), T2 (« écriture refusée : rejette la même erreur »).

---

<a id="tache-t1"></a>
### Tâche T1 — Caractérisation CLI (messages, avis, onglets pleins, `created`)

**Objectif.** Figer, sur le code de la base, ce que la CLI dit à l'ouverture et à l'export d'un tableau, avant tout
refactor (cadrage D13, § 3.5 lignes `boards.test.ts` et `convert.test.ts`, Review Focus 1 à 5).

**Worktree.** `~/projets/roomboard-wt/cli-partage--T1` (créé par l'orchestrateur). Préparation :

```bash
cd ~/projets/roomboard-wt/cli-partage--T1 && nice -n 10 pnpm install --frozen-lockfile 2>&1 | tail -3
cd ~/projets/roomboard-wt/cli-partage--T1 && [ -d apps/web/src/wasm ] || cp -r ~/projets/roomboard-wt/cli-partage/apps/web/src/wasm apps/web/src/wasm
cd ~/projets/roomboard-wt/cli-partage--T1 && [ -d apps/web/src/wasm-formats ] || cp -r ~/projets/roomboard-wt/cli-partage/apps/web/src/wasm-formats apps/web/src/wasm-formats
```

**Fichiers.**
- Modifier : `apps/cli/src/boards.test.ts` (imports ; nouveau bloc en fin de fichier)
- Modifier : `apps/cli/src/convert.test.ts` (imports ; nouveau bloc en fin de fichier)

**Interfaces.**
- Consomme (existant, inchangé) : `main(argv, io): Promise<number>` (`./main`) ; `nodeSession(io)`, `createSession(deps)` (`./session`) ; `exportBoardFile(session, to)` (`./exporter`) ; `nodeDecode` (`./importer`) ; `readBoardFile(file, deps)` (`../../web/src/app/board-convert`) ; `boardWarningsMessage(name, warnings)` (`../../web/src/app/board-files`) ; `TOO_MANY_TABS` (`../../web/src/app/tabs`) ; `createAssetStore()` (`../../web/src/core/asset-store`) ; `APP_VERSION`, `messageOf` (`../../web/src/platform/controller`) ; `boardFixtures`, `pdfFixture`, `memoryIO`, `tmpDir`, `describeWasm` (`./testing`) ; `s.deps.codec.read(blob): Promise<{ manifest: Uint8Array; … }>`.
- Produit : aucun code ; des tests que T4 garde verts sans les modifier.
- Réutilise : `apps/cli/src/testing.ts:153` — `boardFixtures(dir)` (lecon.iwb fabriqué) ; `apps/cli/src/testing.ts:199` — `pdfFixture(dir)` (three.pdf fabriqué).
- Réutilise : `apps/web/src/app/board-convert.ts:28` — `readBoardFile(file: BoardFile, deps: BoardReadDeps)` : référence du message du lecteur et des avertissements (le test compare la CLI au produit, il ne recopie aucun texte du lecteur).
- Réutilise : `apps/web/src/app/board-convert.ts:82` — `writeBoardFile(doc, assets, format, ports)` : référence des avertissements d'écriture (D8 b ; fonds PDF → « fonds PDF non exportés », `board-io.ts:569`).
- Réutilise : `apps/cli/src/pdf-node.ts` — `loadNodePdfjs()` ; `apps/web/src/platform/pdf-load.ts` — `loadPdfLib()` (import seulement) : `beforeAll` sur le patron de `apps/cli/src/pdf.test.ts:23-27`.

**Contraintes (recopiées).**
- GC1 — Refactor sans changement de comportement : les tests existants de la page (dont `workspace.test.ts`) et de la CLI restent verts sans réécriture de fond ; mêmes stdout/stderr/JSON/codes de la CLI. Tests du module extrait ajoutés.
- GC2 — TDD : test rouge d'abord (pour un pur déplacement, tests de caractérisation écrits et verts sur la base AVANT le refactor).
- GC3 — VM partagée : builds/tests en `nice -n 10`, `cargo … -j 4`. Un test qui échoue sur un délai est rejoué une fois avant d'être jugé ; aucun délai (testTimeout, hookTimeout) relevé, aucun test désactivé/sauté, aucun seuil changé.
- GC4 — Preuves bornées ; Wasm copié ; `ROOMBOARD_WASM_REQUIRED=1` pour ne pas se sauter.
- GC5 — Ne pas toucher `apps/web/src/platform/`. Aucun Rust modifié. Tailles Wasm inchangées.
- GC6 — Git : jamais `git add -A`/`.`/`commit -a` ; fichiers ajoutés un par un ; auteur `jejeasterix <jejeasterix@users.noreply.github.com>` ; messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Pas de `--force`.
- GC7 — Fichiers d'essai fabriqués depuis les fixtures du dépôt, aucun téléchargé ; écritures seulement sous `tmpDir()`.

**Interdits.** Aucun fichier hors des deux fichiers de test. Aucune modification des tests existants. Caractérisation
= ce que fait la base : si une assertion de forme exacte est rouge sur la base, ne pas toucher au code ; remplacer la
seule valeur attendue par celle que la base produit, à condition que la chaîne `Ouverture impossible (<nom>) : `
reste exigée, et citer l'ancienne et la nouvelle valeur au rapport (« valeur de base observée »).

**Étapes.**

- [ ] **1. Imports de `boards.test.ts`.** Ligne 3 → `import { beforeAll, expect, it } from "vitest";` ; remplacer la
ligne 7 (import de `./testing`) et ajouter les imports :

```ts
import { loadPdfLib } from "../../web/src/platform/pdf-load";
import { loadNodePdfjs } from "./pdf-node";
import { readBoardFile } from "../../web/src/app/board-convert";
import { boardWarningsMessage } from "../../web/src/app/board-files";
import { TOO_MANY_TABS } from "../../web/src/app/tabs";
import { createAssetStore } from "../../web/src/core/asset-store";
import { APP_VERSION, messageOf } from "../../web/src/platform/controller";
import { nodeDecode } from "./importer";
import { boardFixtures, borrowedAfterPanic, describeWasm, formatsWith, memoryIO, panickingFormats, pdfFixture, pngBytes, stampOf, tmpDir, type Json } from "./testing";
```

- [ ] **2. Bloc de caractérisation en fin de `boards.test.ts`.**

```ts
describeWasm("caractérisation cli-partage (D13) : ouverture d'un tableau par la CLI", () => {
  // Chargement à froid (pdf.js et son worker, pdf-lib, Wasm du cœur et des formats) fait une fois ici, hors du délai
  // de 5 s des tests (patron de pdf.test.ts:23-27 ; le test « import … three.pdf » les chargerait sinon dans son `it`).
  beforeAll(async () => {
    await loadNodePdfjs();
    await loadPdfLib();
    await (await nodeSession(memoryIO())).deps.formats();
  });
  /** Lecture du produit (`readBoardFile`, inchangé par le chantier), branchée comme la session de la CLI. */
  async function readerOf(path: string): Promise<{ why: string | null; warnings: string[] }> {
    const s = await nodeSession(memoryIO());
    const deps = { core: s.deps.core, ports: s.deps.board, makeAssets: () => createAssetStore(), decode: nodeDecode, now: () => s.deps.now(), appVersion: APP_VERSION };
    try {
      const r = await readBoardFile({ name: "x.iwb", blob: new Blob([readFileSync(path) as BlobPart]), format: "iwb" }, deps);
      r.doc.free();
      return { why: null, warnings: r.warnings };
    } catch (e) {
      return { why: messageOf(e), warnings: [] };
    }
  }
  const abimeIn = (dir: string): string => {
    const p = join(dir, "abime.iwb");
    writeFileSync(p, "<iwb"); // XML mal formé (workspace.test.ts:1602)
    return p;
  };

  it("caractérisation cli-partage — state abime.iwb : code 1, stderr { code format, « Ouverture impossible (abime.iwb) : <message du lecteur> » }", async () => {
    const abime = abimeIn(tmpDir());
    const { why } = await readerOf(abime);
    expect(why).not.toBeNull();
    const io = memoryIO();
    expect(await main(["state", abime], io)).toBe(1);
    expect(io.errors()).toEqual([{ error: { code: "format", message: `Ouverture impossible (abime.iwb) : ${why}` } }]);
  });

  it("caractérisation cli-partage — import a.roomboard lecon.iwb three.pdf : code 0, deux ouverts, un seul avis = boardWarningsMessage du lecteur", async () => {
    const dir = tmpDir();
    const f = boardFixtures(dir);
    const three = await pdfFixture(dir);
    const a = join(dir, "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const { warnings } = await readerOf(f.iwb);
    expect(warnings.length).toBeGreaterThan(0);
    const io = memoryIO();
    expect(await main(["import", a, f.iwb, three], io)).toBe(0);
    const [r] = io.json();
    expect(r).toMatchObject({ opened: ["lecon.iwb", "three.pdf"], inserted: [], refused: [], failed: [] });
    expect(r.notices).toEqual([boardWarningsMessage("lecon.iwb", warnings)]);
    expect(io.stderr).toEqual([]);
  });

  it("caractérisation cli-partage — import a.roomboard abime.iwb : code 1, « import partiel : abime.iwb (en échec) », avis « Ouverture impossible (abime.iwb) : … »", async () => {
    const dir = tmpDir();
    const abime = abimeIn(dir);
    const { why } = await readerOf(abime);
    const a = join(dir, "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const io = memoryIO();
    expect(await main(["import", a, abime], io)).toBe(1);
    const [r] = io.json();
    expect(r).toMatchObject({ opened: [], inserted: [], refused: [], failed: ["abime.iwb"] });
    expect(r.notices).toEqual([`Ouverture impossible (abime.iwb) : ${why}`]);
    expect(io.errors()).toEqual([{ error: { code: "command", message: "import partiel : abime.iwb (en échec)" } }]);
  });

  it("caractérisation cli-partage — 12 onglets (run --new, 11 tab.new) puis op import lecon.iwb : op 12 en échec, avis nommé « 12 onglets au plus »", async () => {
    const f = boardFixtures(tmpDir());
    const lines = [...Array.from({ length: 11 }, () => JSON.stringify({ op: "tab.new" })), JSON.stringify({ op: "import", files: [f.iwb] })];
    const io = memoryIO(lines);
    expect(await main(["run", "--new"], io)).toBe(1);
    const failed = io.json().find((l: Json) => l.op === 12);
    expect(failed).toMatchObject({ ok: false, error: { code: "command", message: "import partiel : lecon.iwb (en échec)" }, opened: [], failed: ["lecon.iwb"] });
    expect(failed.notices).toEqual([`Ouverture impossible (lecon.iwb) : ${TOO_MANY_TABS}`]);
  });
});
```

- [ ] **3. Imports de `convert.test.ts`.** Ligne 1 : `import { existsSync, readFileSync, writeFileSync } from "node:fs";` ;
ligne 3 : `import { beforeAll, expect, it } from "vitest";` ; ligne 8 :
`import { createSession, INTERRUPTED_MESSAGE, nodeSession } from "./session";` ; ligne 9 :
`import { boardFixtures, describeWasm, memoryIO, pdfFixture, pngBytes, stampOf, tmpDir, type Json } from "./testing";` ;
ajouter :

```ts
import { writeBoardFile } from "../../web/src/app/board-convert";
import { loadPdfLib } from "../../web/src/platform/pdf-load";
import { loadNodePdfjs } from "./pdf-node";
```

- [ ] **4. Bloc de caractérisation en fin de `convert.test.ts`.**

```ts
describeWasm("caractérisation cli-partage (D7, D8) : export d'un tableau par la CLI, sans copie", () => {
  // Chargement à froid (pdf.js, pdf-lib, cœur et formats) hors du délai de 5 s des tests (patron de pdf.test.ts:23-27).
  beforeAll(async () => {
    await loadNodePdfjs();
    await loadPdfLib();
    await (await nodeSession(memoryIO())).deps.formats();
  });
  it("caractérisation cli-partage — D8 (b) : notices d'un export .iwb et .ubz = avertissements bruts de writeBoardFile (fonds PDF), sans boardSavedMessage", async () => {
    const dir = tmpDir();
    const three = await pdfFixture(dir); // fonds PDF : « fonds PDF non exportés » à l'écriture d'un tableau (board-io.ts:569)
    for (const format of ["iwb", "ubz"] as const) {
      const s = await nodeSession(memoryIO());
      const tab = (await s.open(three)).session;
      const ref = await writeBoardFile(tab.doc, tab.assets, format, s.deps.board); // référence : produit inchangé
      expect(ref.warnings.length).toBeGreaterThan(0);
      const before = s.deps.notices.length;
      await exportBoardFile(s, join(dir, `t.${format}`));
      expect(s.deps.notices.slice(before)).toEqual(ref.warnings);
    }
  });
  it("caractérisation cli-partage — D7 : document neuf, now qui avance à chaque appel, export x.iwb puis save : created === modified", async () => {
    const s0 = await nodeSession(memoryIO());
    const t0 = Date.UTC(2026, 10, 24);
    let n = 0;
    const s = createSession({ ...s0.deps, now: () => new Date(t0 + ++n * 60_000).toISOString() });
    const tab = s.newTab().session;
    await s.exec(JSON.stringify({ type: "AddShape", page: "$page:0", shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style, fill: null }));
    const dir = tmpDir();
    await exportBoardFile(s, join(dir, "x.iwb"));
    const a = join(dir, "a.roomboard");
    await s.save(tab, a);
    const { manifest } = await s.deps.codec.read(new Blob([readFileSync(a) as BlobPart]));
    const m = JSON.parse(new TextDecoder().decode(manifest)) as { created: string; modified: string };
    expect(n).toBeGreaterThan(0);
    expect(m.created).toBe(m.modified);
  });
  it("caractérisation cli-partage — D8 : écriture .iwb refusée par le port : CliError command au message brut, sans « Export impossible : », rien d'écrit", async () => {
    const s0 = await nodeSession(memoryIO());
    const s = createSession({
      ...s0.deps,
      board: {
        ...s0.deps.board,
        write: async () => {
          throw new Error("écriture refusée");
        },
      },
    });
    s.newTab();
    const out = join(tmpDir(), "x.iwb");
    await expect(exportBoardFile(s, out)).rejects.toMatchObject({ code: "command", message: "écriture refusée" });
    expect(existsSync(out)).toBe(false);
  });
});
```

- [ ] **5. Lancer sur la base (attendu : vert, c'est une caractérisation).**

```bash
cd ~/projets/roomboard-wt/cli-partage--T1/apps/cli && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm exec vitest run src/boards.test.ts src/convert.test.ts -t "caractérisation cli-partage" 2>&1 | tail -15
```

Attendu : `Tests  7 passed` (N ≥ 7), aucune ligne `skipped` pour ces tests, `FAIL ` absent. Un « Test timed out » :
rejouer une fois (GC3).

- [ ] **6. Fichiers entiers (rien de cassé autour).**

```bash
cd ~/projets/roomboard-wt/cli-partage--T1/apps/cli && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm exec vitest run src/boards.test.ts src/convert.test.ts 2>&1 | tail -15
cd ~/projets/roomboard-wt/cli-partage--T1/apps/cli && nice -n 10 pnpm exec tsc --noEmit 2>&1 | tail -15
```

Attendu : `Test Files  2 passed` ; `tsc` sans sortie, code 0.

- [ ] **7. Commit.**

```bash
git -C ~/projets/roomboard-wt/cli-partage--T1 add apps/cli/src/boards.test.ts
git -C ~/projets/roomboard-wt/cli-partage--T1 add apps/cli/src/convert.test.ts
git -C ~/projets/roomboard-wt/cli-partage--T1 -c user.name="jejeasterix" -c user.email="jejeasterix@users.noreply.github.com" commit -F - <<'EOF'
test(cli): pin board open messages, notices and manifest created before sharing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

**Critère « terminé ».** Les 7 tests « caractérisation cli-partage » verts sur la base ; fichiers entiers verts ; `tsc` CLI
propre ; un commit. Rapport : sortie de l'étape 5 (`tail`), toute « valeur de base observée », et la ligne
`Réutilisation : appelé readBoardFile, boardFixtures, pdfFixture` ou `Réutilisation : écart — <pourquoi>`.

---

<a id="tache-t2"></a>
### Tâche T2 — Module `open-export.ts` et `Tabs.full()`

**Objectif.** Créer le module partagé (interface exacte du cadrage § 3, « Interface exacte de
`apps/web/src/app/open-export.ts` ») et `Tabs.full()` (D5), testés seuls. Aucun appelant modifié ici.

**Worktree.** `~/projets/roomboard-wt/cli-partage--T2`. Préparation :

```bash
cd ~/projets/roomboard-wt/cli-partage--T2 && nice -n 10 pnpm install --frozen-lockfile 2>&1 | tail -3
cd ~/projets/roomboard-wt/cli-partage--T2 && [ -d apps/web/src/wasm ] || cp -r ~/projets/roomboard-wt/cli-partage/apps/web/src/wasm apps/web/src/wasm
cd ~/projets/roomboard-wt/cli-partage--T2 && [ -d apps/web/src/wasm-formats ] || cp -r ~/projets/roomboard-wt/cli-partage/apps/web/src/wasm-formats apps/web/src/wasm-formats
```

**Fichiers.**
- Créer : `apps/web/src/app/open-export.ts`
- Créer : `apps/web/src/app/open-export.test.ts`
- Modifier : `apps/web/src/app/tabs.ts:18-29` (interface `Tabs`) et `:40-41` (objet rendu par `createTabs`)
- Modifier : `apps/web/src/app/tabs.test.ts` (un test en fin du bloc `describe`)

**Interfaces.**
- Produit (exact, utilisé par T3 et T4) :

```ts
export interface OpenedDocument {
  readonly doc: CoreDocument;
  readonly assets: AssetStore;
  readonly tabName: string;
  readonly notices: readonly string[];
}
export interface BoardExportDeps {
  readonly ports: Pick<BoardPorts, "write" | "zip">;
  readonly copy?: { readonly core: CoreFactory; now(): string };
}
export const openFailedMessage: (name: string, e: unknown) => string;
export const exportFailedMessage: (e: unknown) => string;
export async function openBoardDocument(file: BoardFile, deps: BoardReadDeps): Promise<OpenedDocument>;
export async function openPdfDocument(file: PdfSource, deps: PdfReadDeps): Promise<OpenedDocument>;
export function exportBlocked(doc: CoreDocument, assets: AssetStore): string | null;
export async function exportBoardDocument(doc: CoreDocument, assets: AssetStore, format: BoardFormat, deps: BoardExportDeps): Promise<{ bytes: Uint8Array; warnings: string[] }>;
// apps/web/src/app/tabs.ts, interface Tabs<S> :
full(): boolean;
```

- Réutilise : `apps/web/src/app/board-convert.ts:28` — `readBoardFile(file: BoardFile, deps: BoardReadDeps)`.
- Réutilise : `apps/web/src/app/board-convert.ts:82` — `writeBoardFile(doc, assets, format, ports)`.
- Réutilise : `apps/web/src/app/pdf-convert.ts:49` — `readPdfFile(file: PdfSource, deps: PdfReadDeps)`.
- Réutilise : `apps/web/src/app/board-files.ts:117,121` — `boardWarningsMessage`, `boardTabName`.
- Réutilise : `apps/web/src/app/container-io.ts:82` — `missingOf(doc, assets)` (dans `exportBlocked`).
- Réutilise : `apps/web/src/platform/controller.ts:87` — `messageOf(e)` (et `APP_VERSION`, `UNREAD_ASSETS_MESSAGE`, `:11`), import seulement : `platform/` non modifié.
- Réutilise : `apps/web/src/app/tabs.ts:18` (`Tabs`), `:31` (`createTabs`) — étendu de `full(): boolean` (`entries.length >= MAX_TABS`).
- Nouveau module : `apps/web/src/app/open-export.ts` (le cadrage le donne comme seul nouveau module, ligne « aucun » de « Modules à réutiliser »).

**Patron à ne pas reprendre.**
- La copie systématique avant l'export d'un tableau, telle que la page la fait (`apps/web/src/app/workspace.ts:594-611`) :
  dans la CLI, `saveParts` sur le document d'origine fixerait son `created`
  (`crates/roomboard-wasm/src/lib.rs:1463-1480`, `mark_saved`). La copie est une dépendance **optionnelle** `deps.copy`.
- Un canal `say` injecté : la CLI a besoin de lever (`apps/cli/src/session.ts:171`) et de ranger
  (`apps/cli/src/session.ts:242`) selon l'appel. Les messages sont des données : échec = `Error` au message complet ;
  avis = `notices`.
- Un préfixe « Export impossible : » mis par `exportBoardDocument` : il rejette tel quel (D8).

**Chemin de référence.** `apps/web/src/app/pdf-convert.ts:43-48` (rejette avec le message complet du produit, un seul
préfixe) ; `apps/web/src/app/workspace.ts:563-612` (comportement de la page à garder) ;
`apps/cli/src/session.ts:162-187`, `apps/cli/src/exporter.ts:51-66` (comportement de la CLI à garder).

**Contraintes (recopiées).**
- GC1 — Refactor sans changement de comportement : les tests existants de la page (dont `workspace.test.ts`) et de la CLI restent verts sans réécriture de fond ; mêmes stdout/stderr/JSON/codes de la CLI. Tests du module extrait ajoutés.
- GC2 — TDD : test rouge d'abord (pour un pur déplacement, tests de caractérisation écrits et verts sur la base AVANT le refactor).
- GC3 — VM partagée : builds/tests en `nice -n 10`, `cargo … -j 4`. Un test qui échoue sur un délai est rejoué une fois avant d'être jugé ; aucun délai (testTimeout, hookTimeout) relevé, aucun test désactivé/sauté, aucun seuil changé.
- GC4 — Preuves bornées ; Wasm copié ; `ROOMBOARD_WASM_REQUIRED=1`.
- GC5 — Ne pas toucher `apps/web/src/platform/`. Aucun Rust modifié. Tailles Wasm inchangées.
- GC6 — Git : jamais `git add -A`/`.`/`commit -a` ; fichiers ajoutés un par un ; auteur `jejeasterix <jejeasterix@users.noreply.github.com>` ; messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Pas de `--force`.
- GC10 — La CLI n'écrit jamais de copie avant l'export d'un tableau ; un échec d'écriture `.iwb`/`.ubz` reste sans préfixe dans la CLI.
- D9 du cadrage — `open-export.ts` n'importe que `./board-convert`, `./board-io` (types), `./board-files`, `./container-io`, `./pdf-convert`, `../platform/controller`, `../core/api` (types), `../core/asset-store` (type) : aucun accès au DOM, aucune évaluation nouvelle dans le fichier construit de la CLI.

**Interdits.** Ne modifier ni `workspace.ts`, ni la CLI, ni `board-convert.ts`, ni `pdf-convert.ts`. Ne pas appeler
`openFailedMessage` depuis `pdf-convert.ts` (cycle d'import, cadrage § 7). Ne pas changer `add` de `tabs.ts`.

**Étapes.**

- [ ] **1. Test rouge de `Tabs.full`** — en fin du `describe` de `apps/web/src/app/tabs.test.ts` :

```ts
  it("full (cli-partage, D5) : faux à 11 onglets, vrai à 12 (add refuserait), faux après un retrait", () => {
    const tabs = make();
    for (let i = 0; i < MAX_TABS - 1; i++) tabs.add("board", `S${i}`);
    expect(tabs.full()).toBe(false);
    const last = tabs.add("board", "S11");
    expect(tabs.full()).toBe(true);
    expect(() => tabs.add("board", "X")).toThrow(TOO_MANY_TABS);
    tabs.remove(last.id);
    expect(tabs.full()).toBe(false);
  });
```

- [ ] **2. Test rouge du module** — créer `apps/web/src/app/open-export.test.ts` :

```ts
// cli-partage (D2 à D8) : module partagé par la page et la CLI. Faux cœur pour messages, avis et copie ; vrai module
// Wasm (chargé en Node comme desktop-page.test.ts) pour `created` (D7).
import { describe, expect, it, vi } from "vitest";
import type { CoreDocument, CoreFactory } from "../core/api";
import { createAssetStore } from "../core/asset-store";
import { fakeCore } from "../core/fake-core";
import { createWasmCore, type WasmModule } from "../core/wasm-core";
import type { PdfEngine, PdfFile, TileBitmap } from "../engine/render/pdf-port";
import { APP_VERSION, UNREAD_ASSETS_MESSAGE } from "../platform/controller";
import { readBoardFile } from "./board-convert";
import { BOARD_OP, type BoardPorts } from "./board-io";
import { boardWarningsMessage, UBZ_NOT_ZIP_MESSAGE } from "./board-files";
import { pdfFirstPagesMessage } from "./pdf-convert";
import { exportBlocked, exportBoardDocument, exportFailedMessage, openBoardDocument, openFailedMessage, openPdfDocument } from "./open-export";

const ID = "ab".repeat(32);
const T1 = "2026-11-24T08:00:00.000Z";
const T2 = "2026-11-24T09:00:00.000Z";
const enc = (s: string) => new TextEncoder().encode(s);
/** Ports du test (patron de board-convert.test.ts) : `write` rend la liste en JSON, `zip` le premier fichier ; les
 *  octets suivent le contenu du document écrit. */
function ports(over: Partial<BoardPorts> = {}): BoardPorts {
  return {
    unzip: async () => [],
    unbamboo: async () => [],
    zip: async (files) => files[0]!.bytes,
    read: async () => [],
    readFlipchart: async () => ({ ops: new Float32Array(), texts: [], warnings: [] }),
    readOlf: async () => ({ ops: new Float32Array(), texts: [], warnings: [], total: 0 }),
    write: async (list) => [{ path: "content.xml", bytes: enc(JSON.stringify(list)) }],
    ...over,
  };
}
const readDeps = (p: BoardPorts) => ({
  core: fakeCore,
  ports: p,
  makeAssets: () => createAssetStore(async () => ID),
  decode: async (): Promise<never> => {
    throw new Error("non appelé");
  },
  now: () => T1,
  appVersion: APP_VERSION,
});
/** Une page vide lue (`.iwb` XML brut : `ports.read`), avec les avertissements donnés du lecteur. */
const onePage = (warnings: string[]): BoardPorts => ports({ read: async () => [{ ops: Float32Array.of(BOARD_OP.page), texts: [], warnings }] });
const PDF_HEAD = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a]);
function fakePdf(o: { pages?: number; fail?: string } = {}): PdfEngine {
  return {
    async open(): Promise<PdfFile> {
      if (o.fail !== undefined) throw new Error(o.fail);
      return { pageCount: o.pages ?? 3, pageSize: async () => ({ w: 612, h: 792 }), renderTile: async () => ({}) as TileBitmap, destroy: () => {} };
    },
  };
}
const pdfDeps = (pdf: PdfEngine) => ({ core: fakeCore, pdf, makeAssets: () => createAssetStore() });
const rect = (doc: CoreDocument): void => {
  doc.apply({ type: "AddShape", page: doc.pageIds()[0]!, shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style: { color: "#000000", width: 4 }, fill: null });
};
/** Cœur dont les copies (`loadParts`) sont retenues et leur libération notée. */
function spyCore(): { core: CoreFactory; copies: CoreDocument[]; freed: CoreDocument[] } {
  const copies: CoreDocument[] = [];
  const freed: CoreDocument[] = [];
  const core: CoreFactory = {
    ...fakeCore,
    loadParts: (m, y) => {
      const d = fakeCore.loadParts(m, y);
      const free = d.free.bind(d);
      d.free = () => {
        freed.push(d);
        free();
      };
      copies.push(d);
      return d;
    },
  };
  return { core, copies, freed };
}

describe("messages (cli-partage, D3, R6)", () => {
  it("openFailedMessage et exportFailedMessage : préfixe du produit, Error ou valeur brute", () => {
    expect(openFailedMessage("a.iwb", new Error("x"))).toBe("Ouverture impossible (a.iwb) : x");
    expect(openFailedMessage("a.iwb", "12 onglets au plus ; fermez-en un")).toBe("Ouverture impossible (a.iwb) : 12 onglets au plus ; fermez-en un");
    expect(exportFailedMessage(new Error("z"))).toBe("Export impossible : z");
    expect(exportFailedMessage("export interrompu")).toBe("Export impossible : export interrompu");
  });
});

describe("openBoardDocument (cli-partage, R1, D3, D4)", () => {
  it("refus du lecteur : rejette Error(« Ouverture impossible (<nom>) : <message> »), un seul préfixe", async () => {
    await expect(openBoardDocument({ name: "x.ubz", blob: new Blob([enc("texte")]), format: "ubz" }, readDeps(ports()))).rejects.toMatchObject({ message: `Ouverture impossible (x.ubz) : ${UBZ_NOT_ZIP_MESSAGE}` });
  });
  it("nom pris tel quel (l'appelant donne le nom de base ; aucun chemin retiré) : message et tabName", async () => {
    await expect(openBoardDocument({ name: "dossier/x.ubz", blob: new Blob([enc("texte")]), format: "ubz" }, readDeps(ports()))).rejects.toMatchObject({ message: `Ouverture impossible (dossier/x.ubz) : ${UBZ_NOT_ZIP_MESSAGE}` });
    const r = await openBoardDocument({ name: "Cours.IWB", blob: new Blob([enc("<iwb/>")]), format: "iwb" }, readDeps(onePage([])));
    expect(r.tabName).toBe("Cours.roomboard");
    expect(r.notices).toEqual([]);
    r.doc.free();
  });
  it("avertissements : un seul avis, boardWarningsMessage(nom, avertissements de readBoardFile)", async () => {
    const file = { name: "Cours.iwb", blob: new Blob([enc("<iwb/>")]), format: "iwb" as const };
    const ref = await readBoardFile(file, readDeps(onePage(["avis du lecteur"])));
    expect(ref.warnings.length).toBeGreaterThan(0);
    const r = await openBoardDocument(file, readDeps(onePage(["avis du lecteur"])));
    expect(r.notices).toEqual([boardWarningsMessage("Cours.iwb", ref.warnings)]);
    expect(r.doc.pageIds()).toHaveLength(1);
    ref.doc.free();
    r.doc.free();
  });
});

describe("openPdfDocument (cli-partage, R2)", () => {
  it("échec : message complet de readPdfFile rendu tel quel, sans second préfixe", async () => {
    await expect(openPdfDocument({ name: "a.pdf", blob: new Blob([PDF_HEAD]) }, pdfDeps(fakePdf({ fail: "cassé" })))).rejects.toMatchObject({ message: "Ouverture impossible (a.pdf) : cassé" });
  });
  it("501 pages : notices = [avis « 500 premières pages »] ; tabName a.roomboard ; 3 pages : aucun avis", async () => {
    const big = await openPdfDocument({ name: "a.pdf", blob: new Blob([PDF_HEAD]) }, pdfDeps(fakePdf({ pages: 501 })));
    expect(big.notices).toEqual([pdfFirstPagesMessage("a.pdf", 501)]);
    expect(big.tabName).toBe("a.roomboard");
    big.doc.free();
    const small = await openPdfDocument({ name: "a.pdf", blob: new Blob([PDF_HEAD]) }, pdfDeps(fakePdf()));
    expect(small.notices).toEqual([]);
    small.doc.free();
  });
});

describe("exportBlocked (cli-partage, R3, D6)", () => {
  it("image citée absente du magasin : UNREAD_ASSETS_MESSAGE ; document sans image : null", () => {
    const doc = fakeCore.blank();
    expect(exportBlocked(doc, createAssetStore())).toBeNull();
    doc.apply({ type: "AddImage", page: doc.pageIds()[0]!, asset: { id: ID, name: "a.png", mime: "image/png", size: 3 }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] });
    expect(exportBlocked(doc, createAssetStore())).toBe(UNREAD_ASSETS_MESSAGE);
    doc.free();
  });
});

describe("exportBoardDocument (cli-partage, R4, D7, D8)", () => {
  it("sans copy (CLI) : aucun saveParts sur le document d'origine", async () => {
    const doc = fakeCore.blank();
    rect(doc);
    const save = vi.spyOn(doc, "saveParts");
    await exportBoardDocument(doc, createAssetStore(), "iwb", { ports: ports() });
    expect(save).not.toHaveBeenCalled();
    doc.free();
  });
  it("avec copy (page) : saveParts(copy.now(), APP_VERSION) une fois, une copie libérée ; octets et avertissements égaux à ceux sans copie", async () => {
    const doc = fakeCore.blank();
    rect(doc);
    const { core, copies, freed } = spyCore();
    const save = vi.spyOn(doc, "saveParts");
    const withCopy = await exportBoardDocument(doc, createAssetStore(), "iwb", { ports: ports(), copy: { core, now: () => T1 } });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(T1, APP_VERSION);
    expect(copies).toHaveLength(1);
    expect(freed).toEqual(copies);
    save.mockRestore();
    const without = await exportBoardDocument(doc, createAssetStore(), "iwb", { ports: ports() });
    expect(withCopy.bytes).toEqual(without.bytes);
    expect(withCopy.warnings).toEqual(without.warnings);
    doc.free();
  });
  it("écriture refusée : rejette la même erreur, sans préfixe (D8) ; avec copy, la copie est libérée quand même", async () => {
    const err = new Error("écriture refusée");
    const refusing = ports({
      write: async () => {
        throw err;
      },
    });
    const doc = fakeCore.blank();
    await expect(exportBoardDocument(doc, createAssetStore(), "ubz", { ports: refusing })).rejects.toBe(err);
    const { core, copies, freed } = spyCore();
    await expect(exportBoardDocument(doc, createAssetStore(), "ubz", { ports: refusing, copy: { core, now: () => T1 } })).rejects.toBe(err);
    expect(copies).toHaveLength(1);
    expect(freed).toEqual(copies);
    doc.free();
  });
});

// Vrai cœur (D7) : chargé en Node comme desktop-page.test.ts ; exigé sous ROOMBOARD_WASM_REQUIRED=1.
interface NodeFs { existsSync(p: string): boolean; readFileSync(p: string): Uint8Array }
const nodeFs = (await import(/* @vite-ignore */ `node:${"fs"}`)) as NodeFs;
const proc = (globalThis as { process?: { env: Record<string, string | undefined>; cwd(): string } }).process;
const webRoot = proc?.cwd() ?? "."; // vitest tourne depuis `apps/web`
const wasmPath = `${webRoot}/src/wasm/roomboard_wasm_bg.wasm`;
const present = nodeFs.existsSync(wasmPath);
async function loadReal(): Promise<CoreFactory> {
  const mod = (await import(/* @vite-ignore */ `file://${webRoot}/src/wasm/roomboard_wasm.js`)) as WasmModule & { initSync(o: { module: Uint8Array }): unknown };
  mod.initSync({ module: nodeFs.readFileSync(wasmPath) });
  return createWasmCore(mod);
}
const real: CoreFactory | null = present ? await loadReal() : null;

it("cli-partage : le vrai cœur est présent quand il est exigé", () => {
  if (proc?.env["ROOMBOARD_WASM_REQUIRED"] === "1") expect(present).toBe(true);
});

describe.skipIf(real === null)("exportBoardDocument sur le vrai cœur : created (cli-partage, D7)", () => {
  const createdOf = (doc: CoreDocument, now: string): string => (JSON.parse(new TextDecoder().decode(doc.saveParts(now, APP_VERSION)[0])) as { created: string }).created;
  it("vrai cœur : avec copy, created du document d'origine fixé à copy.now() (comportement de la page)", async () => {
    const doc = real!.blank();
    await exportBoardDocument(doc, createAssetStore(), "iwb", { ports: ports(), copy: { core: real!, now: () => T1 } });
    expect(createdOf(doc, T2)).toBe(T1);
    doc.free();
  });
  it("vrai cœur : sans copy, created encore libre (un saveParts à T2 rend T2)", async () => {
    const doc = real!.blank();
    await exportBoardDocument(doc, createAssetStore(), "iwb", { ports: ports() });
    expect(createdOf(doc, T2)).toBe(T2);
    doc.free();
  });
});
```

- [ ] **3. Vérifier le rouge.**

```bash
cd ~/projets/roomboard-wt/cli-partage--T2/apps/web && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm exec vitest run src/app/open-export.test.ts src/app/tabs.test.ts 2>&1 | tail -15
```

Attendu : `FAIL ` ; `open-export.test.ts` : import non résolu `./open-export` ; `tabs.test.ts` : `tabs.full is not a function`.

- [ ] **4. `Tabs.full()`** — dans `apps/web/src/app/tabs.ts`, interface `Tabs<S>`, après `add(…)` :

```ts
  /** cli-partage (D5) : vrai quand `add` refuserait faute de place (MAX_TABS atteint), même règle que `add`. */
  full(): boolean;
```

et dans l'objet rendu par `createTabs`, après `active: …,` :

```ts
    full: () => entries.length >= MAX_TABS,
```

- [ ] **5. Le module** — créer `apps/web/src/app/open-export.ts` :

```ts
/**
 * Ouvrir et exporter un tableau ou un PDF sans onglet (cadrage cli-partage, D2 à D8) : la couche autour de
 * `board-convert.ts` et `pdf-convert.ts` que la page (`workspace.ts`) et la CLI (`apps/cli`) recopiaient. Rien n'est dit
 * ici : un échec est une `Error` au message complet du produit, les avis sont rendus (`notices`) ; la page les dit, la
 * CLI les lève ou les range, chacune à son moment (D4). Aucun accès au DOM ; n'importe que des modules déjà dans le
 * fichier construit de la CLI (D9).
 */
import type { CoreDocument, CoreFactory } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import { APP_VERSION, messageOf, UNREAD_ASSETS_MESSAGE } from "../platform/controller";
import { readBoardFile, writeBoardFile, type BoardFile, type BoardReadDeps } from "./board-convert";
import type { BoardFormat, BoardPorts } from "./board-io";
import { boardTabName, boardWarningsMessage } from "./board-files";
import { missingOf } from "./container-io";
import { readPdfFile, type PdfReadDeps, type PdfSource } from "./pdf-convert";

/** Document ouvert, sans onglet. `notices` : avis d'ouverture dans l'ordre du produit, que l'appelant dit ou range. */
export interface OpenedDocument {
  readonly doc: CoreDocument;
  readonly assets: AssetStore;
  /** `<racine>.roomboard` : nom de l'onglet de la page ; la CLI l'ignore (onglet sans fichier). */
  readonly tabName: string;
  readonly notices: readonly string[];
}
export interface BoardExportDeps {
  readonly ports: Pick<BoardPorts, "write" | "zip">;
  /** Copie prise avant l'écriture (DAPF3) : donnée par la page ; absente dans la CLI, qui écrit `doc` tel quel (D7 :
   *  `saveParts` fixerait `created` sur le document d'origine). */
  readonly copy?: { readonly core: CoreFactory; now(): string };
}

/** « Ouverture impossible (<nom>) : <message> » ; `name` est le nom affiché, jamais un chemin. */
export const openFailedMessage = (name: string, e: unknown): string => `Ouverture impossible (${name}) : ${messageOf(e)}`;
/** « Export impossible : <message> ». */
export const exportFailedMessage = (e: unknown): string => `Export impossible : ${messageOf(e)}`;

/**
 * `file.name` est le nom de base donné par l'appelant (page : `baseName(file.name)` ; CLI : `basename(path)`), comme
 * `PdfSource.name` ; le module ne retire aucun chemin. Rejette `new Error(openFailedMessage(file.name, e))`.
 */
export async function openBoardDocument(file: BoardFile, deps: BoardReadDeps): Promise<OpenedDocument> {
  let read: Awaited<ReturnType<typeof readBoardFile>>;
  try {
    read = await readBoardFile(file, deps);
  } catch (e) {
    throw new Error(openFailedMessage(file.name, e));
  }
  return {
    doc: read.doc,
    assets: read.assets,
    tabName: boardTabName(file.name, file.format),
    notices: read.warnings.length > 0 ? [boardWarningsMessage(file.name, read.warnings)] : [],
  };
}

/** `readPdfFile` ; rejette avec son message complet, tel quel (un seul préfixe, déjà mis). */
export async function openPdfDocument(file: PdfSource, deps: PdfReadDeps): Promise<OpenedDocument> {
  const read = await readPdfFile(file, deps);
  return { doc: read.doc, assets: read.assets, tabName: read.tabName, notices: read.warnings };
}

/** `UNREAD_ASSETS_MESSAGE` si une image citée du document manque au magasin (`missingOf`), sinon null. */
export function exportBlocked(doc: CoreDocument, assets: AssetStore): string | null {
  return missingOf(doc, assets).length > 0 ? UNREAD_ASSETS_MESSAGE : null;
}

/**
 * Avec `deps.copy` : copie (`saveParts(copy.now(), APP_VERSION)`, `copy.core.loadParts`, DAPF3), `writeBoardFile` sur
 * la copie, copie libérée dans `finally`. Sans : `writeBoardFile(doc, …)`. Rejette tel quel (l'appelant met son préfixe :
 * page `exportFailedMessage`, CLI aucun, D8).
 */
export async function exportBoardDocument(doc: CoreDocument, assets: AssetStore, format: BoardFormat, deps: BoardExportDeps): Promise<{ bytes: Uint8Array; warnings: string[] }> {
  const copy = deps.copy;
  if (copy === undefined) return writeBoardFile(doc, assets, format, deps.ports);
  const [manifest, ybin] = doc.saveParts(copy.now(), APP_VERSION);
  const own = copy.core.loadParts(manifest, ybin);
  try {
    return await writeBoardFile(own, assets, format, deps.ports);
  } finally {
    own.free();
  }
}
```

- [ ] **6. Vert.**

```bash
cd ~/projets/roomboard-wt/cli-partage--T2/apps/web && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm exec vitest run src/app/open-export.test.ts src/app/tabs.test.ts src/app/board-convert.test.ts src/app/pdf-convert.test.ts 2>&1 | tail -15
```

Attendu : `Test Files  4 passed` ; `open-export.test.ts` ≥ 12 tests passés dont « vrai cœur : sans copy », aucun
`skipped` (Wasm exigé) ; `tabs.test.ts` contient « full (cli-partage, D5) ».

- [ ] **7. Types (page et CLI : `Tabs` gagne une méthode, effet de bord 4).**

```bash
cd ~/projets/roomboard-wt/cli-partage--T2/apps/web && nice -n 10 pnpm exec tsc --noEmit 2>&1 | tail -15
cd ~/projets/roomboard-wt/cli-partage--T2/apps/cli && nice -n 10 pnpm exec tsc --noEmit 2>&1 | tail -15
cd ~/projets/roomboard-wt/cli-partage--T2 && grep -nE '^import' apps/web/src/app/open-export.ts
```

Attendu : `tsc` sans sortie (code 0) deux fois ; les imports listés sont exactement ceux de la contrainte D9.

- [ ] **8. Commit** (skill `verify` juste avant, s'il est disponible).

```bash
git -C ~/projets/roomboard-wt/cli-partage--T2 add apps/web/src/app/open-export.ts
git -C ~/projets/roomboard-wt/cli-partage--T2 add apps/web/src/app/open-export.test.ts
git -C ~/projets/roomboard-wt/cli-partage--T2 add apps/web/src/app/tabs.ts
git -C ~/projets/roomboard-wt/cli-partage--T2 add apps/web/src/app/tabs.test.ts
git -C ~/projets/roomboard-wt/cli-partage--T2 -c user.name="jejeasterix" -c user.email="jejeasterix@users.noreply.github.com" commit -F - <<'EOF'
feat(web): add open-export module shared by page and CLI, and Tabs.full

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

**Critère « terminé ».** Tests de l'étape 6 verts (Wasm exigé), `tsc` web et CLI propres, un commit. Rapport : sorties
des étapes 6 et 7, et la ligne `Réutilisation : appelé readBoardFile, writeBoardFile, readPdfFile, boardWarningsMessage,
boardTabName, missingOf, messageOf ; Tabs étendu` ou `Réutilisation : écart — <pourquoi>`.

---

<a id="tache-t3"></a>
### Tâche T3 — La page délègue au module

**Objectif.** `workspace.ts` appelle `open-export.ts` pour `openPdf`, `exportPdf`, `openBoard`, `exportBoard`, les
messages de `:777` et `:861`, et `tabs.full()` (cadrage § 3.1). Comportement de la page inchangé (S3).

**Worktree.** `~/projets/roomboard-wt/cli-partage--T3` (contient T2). Préparation :

```bash
cd ~/projets/roomboard-wt/cli-partage--T3 && nice -n 10 pnpm install --frozen-lockfile 2>&1 | tail -3
cd ~/projets/roomboard-wt/cli-partage--T3 && [ -d apps/web/src/wasm ] || cp -r ~/projets/roomboard-wt/cli-partage/apps/web/src/wasm apps/web/src/wasm
cd ~/projets/roomboard-wt/cli-partage--T3 && [ -d apps/web/src/wasm-formats ] || cp -r ~/projets/roomboard-wt/cli-partage/apps/web/src/wasm-formats apps/web/src/wasm-formats
cd ~/projets/roomboard-wt/cli-partage--T3 && test -f apps/web/src/app/open-export.ts && echo "T2 présent"
```

**Fichiers.** Modifier : `apps/web/src/app/workspace.ts` (imports `:44`, `:47`, `:48`, `:50` ; `:315` ; `:509-612` ;
`:777` ; `:861`).

**Interfaces.**
- Consomme (T2) : `openBoardDocument(file: BoardFile, deps: BoardReadDeps): Promise<OpenedDocument>` ;
  `openPdfDocument(file: PdfSource, deps: PdfReadDeps): Promise<OpenedDocument>` ;
  `exportBlocked(doc: CoreDocument, assets: AssetStore): string | null` ;
  `exportBoardDocument(doc, assets, format, { ports, copy?: { core, now() } }): Promise<{ bytes: Uint8Array; warnings: string[] }>` ;
  `exportFailedMessage(e: unknown): string` ; `openFailedMessage(name: string, e: unknown): string` ;
  `type OpenedDocument` ; `Tabs<S>.full(): boolean`.
- Produit : rien de neuf ; l'interface `Workspace` (`:180-190`) est inchangée.
- Réutilise : `apps/web/src/app/pdf-convert.ts:101` — `writePdfFile(doc, assets, deps)` (appel inchangé hors garde et message).
- Réutilise : `apps/web/src/app/open-export.ts` (T2) — interfaces ci-dessus.

**Contraintes (recopiées).**
- GC1 — Refactor sans changement de comportement : les tests existants de la page (dont `workspace.test.ts`) et de la CLI restent verts sans réécriture de fond ; mêmes stdout/stderr/JSON/codes de la CLI. Tests du module extrait ajoutés.
- GC2 — TDD : test rouge d'abord (pour un pur déplacement, tests de caractérisation écrits et verts sur la base AVANT le refactor).
- GC3 — VM partagée : builds/tests en `nice -n 10`, `cargo … -j 4`. Un test qui échoue sur un délai est rejoué une fois avant d'être jugé ; aucun délai (testTimeout, hookTimeout) relevé, aucun test désactivé/sauté, aucun seuil changé.
- GC4 — Preuves bornées ; Wasm copié ; `ROOMBOARD_WASM_REQUIRED=1`.
- GC5 — Ne pas toucher `apps/web/src/platform/`. Aucun Rust modifié. Tailles Wasm inchangées.
- GC6 — Git : jamais `git add -A`/`.`/`commit -a` ; fichiers ajoutés un par un ; auteur `jejeasterix <jejeasterix@users.noreply.github.com>` ; messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Pas de `--force`.
- D4 du cadrage — Ordre des avis inchangé : tableau de la page **après** `addTab` ; PDF de la page **avant** `addTab`.
- D6 du cadrage — Garde des images : après le contrôle `exporting` (`BUSY_MESSAGE`), avant `exporting = true`.
- D8 du cadrage — Avertissements d'écriture de la page toujours par `boardSavedMessage` ; `saveBlocked` (`:401`) et `:787` (`Ouverture impossible : …` sans nom) inchangés.

**Interdits.** Aucune modification de `workspace.test.ts`, `board-convert.test.ts`, `pdf-convert.test.ts` (S3). Ne pas
toucher `:401`, `:697-698` (`sendCapture`), `:787`. Pas d'autre fichier.

**Effets de bord à prouver (cadrage, « Effets de bord sur l'existant »).** La copie est libérée avant `files.save` :
`workspace.test.ts:1661,1674` restent verts. `openBoard` n'enveloppe plus `addTab` dans son `try` :
`workspace.test.ts:1602-1653` restent verts.

**Étapes.**

- [ ] **1. Rouge : la page recopie encore.**

```bash
cd ~/projets/roomboard-wt/cli-partage--T3 && grep -nE '`Export impossible|`Ouverture impossible \(|length >= MAX_TABS|open-export' apps/web/src/app/workspace.ts
```

Attendu sur la base : 6 lignes (`:315`, `:557`, `:577`, `:606`, `:777`, `:861`), aucune `open-export`.

- [ ] **2. Imports.** Remplacer :
  - `:44` → `import { createTabs, TOO_MANY_TABS, type TabKind, type Tabs } from "./tabs";`
  - `:47` → `import type { BoardFile } from "./board-convert";`
  - `:48` → `import { writePdfFile } from "./pdf-convert";`
  - `:50` → `import { boardExportName, boardSavedMessage, stem } from "./board-files";`
  - ajouter après `:50` : `import { exportBlocked, exportBoardDocument, exportFailedMessage, openBoardDocument, openFailedMessage, openPdfDocument, type OpenedDocument } from "./open-export";`

- [ ] **3. `:315`** → `const full = (): boolean => tabs.full();`

- [ ] **4. `openPdf` (`:509-526`)** — corps entier :

```ts
    async openPdf(file) {
      const name = baseName(file.name);
      const pdf = deps.pdf;
      if (pdf === undefined) return false;
      if (full()) {
        await say(TOO_MANY_TABS);
        return false;
      }
      let opened: OpenedDocument;
      try {
        opened = await openPdfDocument({ name, blob: file.blob, original: file.original }, { core, pdf, makeAssets });
      } catch (e) {
        await say(messageOf(e)); // message complet du produit (chiffré, illisible, sans page) : rien à préfixer
        return false;
      }
      for (const n of opened.notices) await say(n); // avant l'onglet, comme avant (D4)
      return (await addTab(opened.doc, { name: opened.tabName, target: null }, opened.assets)) !== null;
    },
```

- [ ] **5. `exportPdf` (`:527-562`)** — remplacer les lignes `:534-538` par :

```ts
      const tab = ws.active(); // onglet montré à l'appel (R3)
      const blocked = exportBlocked(tab.board.doc, tab.assets);
      if (blocked !== null) {
        await say(blocked);
        return false;
      }
```

et `:557` par `await say(exportFailedMessage(e));`. Le reste (appel `writePdfFile`, avis, `pdfFiles.save`) inchangé.

- [ ] **6. `openBoard` (`:563-580`)** — corps entier :

```ts
    async openBoard(file) {
      const name = baseName(file.name);
      const board = deps.board;
      if (board === undefined) return false;
      if (full()) {
        await say(TOO_MANY_TABS);
        return false;
      }
      let opened: OpenedDocument;
      try {
        opened = await openBoardDocument({ name, blob: file.blob, format: file.format }, { core, ports: board, makeAssets, decode: deps.decode ?? ((b, k) => decodeImage(b, k)), now: deps.now, appVersion: APP_VERSION });
      } catch (e) {
        await say(messageOf(e)); // « Ouverture impossible (<nom>) : … », composé par openBoardDocument
        return false;
      }
      if ((await addTab(opened.doc, { name: opened.tabName, target: null }, opened.assets)) === null) return false;
      for (const n of opened.notices) await say(n); // après l'onglet, comme avant (D4)
      return true;
    },
```

- [ ] **7. `exportBoard` (`:581-612`)** — corps entier :

```ts
    async exportBoard(format) {
      const board = deps.board;
      const files = format === "iwb" ? deps.iwbFiles : deps.ubzFiles;
      if (board === undefined || files === undefined) return false;
      if (exporting) {
        await say(BUSY_MESSAGE);
        return false;
      }
      const tab = ws.active(); // onglet montré à l'appel (R3)
      const blocked = exportBlocked(tab.board.doc, tab.assets);
      if (blocked !== null) {
        await say(blocked);
        return false;
      }
      exporting = true;
      try {
        // Copie prise au départ (DAPF3) par exportBoardDocument : fermer l'onglet pendant l'écriture ne la libère pas ;
        // libérée dès l'écriture faite, avant la boîte d'enregistrement (cli-partage, D7).
        const r = await exportBoardDocument(tab.board.doc, tab.assets, format, { ports: board, copy: { core, now: () => deps.now() } });
        const saved = await files.save(boardExportName(tab.files.name(), format), r.bytes);
        // OF6 : succès sans avertissement en information ; avec avertissements, l'avis signale une perte (erreur).
        if (saved) await say(boardSavedMessage(format, r.warnings), r.warnings.length === 0 ? "info" : "error");
        return saved;
      } catch (e) {
        await say(exportFailedMessage(e));
        return false;
      } finally {
        exporting = false;
      }
    },
```

- [ ] **8. `:777`** → `await say(exportFailedMessage(e));` ; **`:861`** → `await say(openFailedMessage(info.name, e));`.

- [ ] **9. Vert : plus de recopie, types, tests de la page.**

```bash
cd ~/projets/roomboard-wt/cli-partage--T3 && grep -nE '`Export impossible|`Ouverture impossible \(|length >= MAX_TABS' apps/web/src/app/workspace.ts ; grep -c "open-export" apps/web/src/app/workspace.ts
cd ~/projets/roomboard-wt/cli-partage--T3/apps/web && nice -n 10 pnpm exec tsc --noEmit 2>&1 | tail -15
cd ~/projets/roomboard-wt/cli-partage--T3/apps/web && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm exec vitest run src/app/workspace.test.ts src/app/board-convert.test.ts src/app/pdf-convert.test.ts src/app/open-export.test.ts src/app/tabs.test.ts 2>&1 | tail -15
```

Attendu : premier grep sans ligne, `grep -c` rend `1` ; `tsc` sans sortie ; `Test Files  5 passed`, `workspace.test.ts`
présent, `FAIL ` absent.

- [ ] **10. Suite complète de la page et tests de la page intacts (S3).**

```bash
cd ~/projets/roomboard-wt/cli-partage--T3/apps/web && ROOMBOARD_WASM_REQUIRED=1 VITEST_MAX_WORKERS=3 nice -n 10 pnpm exec vitest run 2>&1 | tail -15
cd ~/projets/roomboard-wt/cli-partage--T3 && git diff --exit-code 7092fdd -- apps/web/src/app/workspace.test.ts apps/web/src/app/board-convert.test.ts apps/web/src/app/pdf-convert.test.ts && echo "tests de la page intacts"
cd ~/projets/roomboard-wt/cli-partage--T3 && git diff --stat 7092fdd -- apps/web/src/platform/ | tail -3
```

Attendu : `Test Files  N passed` (N ≥ 1), `FAIL ` absent (un « timed out » : rejouer le fichier une fois, GC3) ;
`tests de la page intacts` ; aucun fichier de `platform/`.

- [ ] **11. Commit** (skill `verify` juste avant, s'il est disponible).

```bash
git -C ~/projets/roomboard-wt/cli-partage--T3 add apps/web/src/app/workspace.ts
git -C ~/projets/roomboard-wt/cli-partage--T3 -c user.name="jejeasterix" -c user.email="jejeasterix@users.noreply.github.com" commit -F - <<'EOF'
refactor(web): delegate board and PDF open/export layer to open-export

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

**Critère « terminé ».** Étapes 9 et 10 conformes ; un commit. Rapport : sorties bornées des étapes 9 et 10, et
`Réutilisation : appelé open-export (openBoardDocument, openPdfDocument, exportBlocked, exportBoardDocument,
exportFailedMessage, openFailedMessage), writePdfFile, Tabs.full` ou `Réutilisation : écart — <pourquoi>`.

---

<a id="tache-t4"></a>
### Tâche T4 — La CLI délègue au module

**Objectif.** `session.ts`, `exporter.ts`, `importer.ts` appellent `open-export.ts` et `tabs.full()` ; plus aucune
recopie (S4) ; stdout, stderr, JSON et codes identiques (caractérisation T1, essai T6).

**Worktree.** `~/projets/roomboard-wt/cli-partage--T4` (contient T1, T2, T6). Préparation :

```bash
cd ~/projets/roomboard-wt/cli-partage--T4 && nice -n 10 pnpm install --frozen-lockfile 2>&1 | tail -3
cd ~/projets/roomboard-wt/cli-partage--T4 && [ -d apps/web/src/wasm ] || cp -r ~/projets/roomboard-wt/cli-partage/apps/web/src/wasm apps/web/src/wasm
cd ~/projets/roomboard-wt/cli-partage--T4 && [ -d apps/web/src/wasm-formats ] || cp -r ~/projets/roomboard-wt/cli-partage/apps/web/src/wasm-formats apps/web/src/wasm-formats
cd ~/projets/roomboard-wt/cli-partage--T4 && test -f apps/web/src/app/open-export.ts && grep -q "caractérisation cli-partage" apps/cli/src/boards.test.ts && grep -q "E5 : state bad.pdf" scripts/essais/cli-essai.mjs && echo "T1, T2, T6 présents"
```

Convertisseur Office des tests et de l'essai (aucun build Rust) : préfixer chaque commande de
`ROOMBOARD_OFFICE=/home/adminjd/projets/roomboard-wt/cli-partage/target/debug/roomboard-office`.

**Fichiers.** Modifier : `apps/cli/src/session.ts` (imports `:15-24`, `:162-187`, `:223`, `:234-236`, `:249`,
`:258-260`) ; `apps/cli/src/exporter.ts` (imports `:7-14`, `:51-66`, `:72-88`) ; `apps/cli/src/importer.ts` (`:13`,
`:126`).

**Interfaces.**
- Consomme (T2) : `openBoardDocument`, `openPdfDocument`, `openFailedMessage`, `exportBlocked`, `exportBoardDocument`,
  `exportFailedMessage`, `type OpenedDocument` (signatures de la section T2) ; `Tabs<S>.full(): boolean`.
- Produit : rien de neuf ; `Session` (`session.ts:98-122`) inchangée ; `readBoardNoticed` et `readPdfNoticed` rendent
  `OpenedDocument` (internes, seuls `.doc` et `.assets` sont lus).
- Réutilise : `apps/web/src/app/pdf-convert.ts:101` — `writePdfFile(doc, assets, deps)` (appel inchangé hors garde et message).
- Réutilise : `apps/web/src/app/open-export.ts` (T2) et `apps/web/src/app/tabs.ts` `full()` (T2).

**Contraintes (recopiées).**
- GC1 — Refactor sans changement de comportement : les tests existants de la page (dont `workspace.test.ts`) et de la CLI restent verts sans réécriture de fond ; mêmes stdout/stderr/JSON/codes de la CLI. Tests du module extrait ajoutés.
- GC2 — TDD : test rouge d'abord (pour un pur déplacement, tests de caractérisation écrits et verts sur la base AVANT le refactor).
- GC3 — VM partagée : builds/tests en `nice -n 10`, `cargo … -j 4`. Un test qui échoue sur un délai est rejoué une fois avant d'être jugé ; aucun délai (testTimeout, hookTimeout) relevé, aucun test désactivé/sauté, aucun seuil changé.
- GC4 — Preuves bornées : ex. `cd apps/cli && nice -n 10 pnpm exec vitest run src/<f>.test.ts 2>&1 | tail -15` ; Wasm copié ; `ROOMBOARD_WASM_REQUIRED=1`.
- GC5 — Ne pas toucher `apps/web/src/platform/`. Aucun Rust modifié. Tailles Wasm inchangées.
- GC6 — Git : jamais `git add -A`/`.`/`commit -a` ; fichiers ajoutés un par un ; auteur `jejeasterix <jejeasterix@users.noreply.github.com>` ; messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Pas de `--force`.
- GC7 — Écritures de la CLI seulement sous un dossier temporaire.
- GC8 — `scripts/essais/cli-essai.mjs` étendu (S2) et doit afficher `CLI : OK`.
- GC10 — La CLI n'écrit jamais de copie avant l'export d'un tableau (aucun `copy` passé) ; un échec d'écriture `.iwb`/`.ubz` reste sans préfixe (`asCliError`) ; les avertissements d'écriture restent bruts dans `notices` ; l'avis « onglets pleins » de l'importeur reste nommé.

**Interdits.** Aucun fichier de test modifié (T1 et l'existant doivent passer tels quels). Ne pas passer `copy` à
`exportBoardDocument`. Ne pas préfixer l'échec d'écriture d'un tableau. Ne pas toucher `session.ts:192-207` (Office,
hors périmètre) ni `importer.ts:93-100` (classeur).

**Tests à garder verts (cadrage § 3.5).** `convert.test.ts:79-84` ; `pdf.test.ts:84-98`, `:235-240` ;
`session.test.ts:40-43` ; les 7 tests « caractérisation cli-partage » de T1.

**Étapes.**

- [ ] **1. Rouge : grep S4 sur la base.**

```bash
cd ~/projets/roomboard-wt/cli-partage--T4/apps/cli && grep -nE 'readBoardFile\(|readPdfFile\(|[`"](Ouverture|Export) impossible|length >= MAX_TABS|missingOf\(|boardWarningsMessage' src/*.ts | grep -v '\.test\.ts' | wc -l
```

Attendu : `16`.

- [ ] **2. `session.ts`, imports.** Retirer `import { readBoardFile } from "../../web/src/app/board-convert";`,
`import { boardWarningsMessage } from "../../web/src/app/board-files";`,
`import { readPdfFile, type PdfRead } from "../../web/src/app/pdf-convert";` ; remplacer l'import de `../../web/src/app/tabs` par
`import { createTabs, TOO_MANY_TABS, type TabEntry, type Tabs } from "../../web/src/app/tabs";` ; ajouter
`import { openBoardDocument, openFailedMessage, openPdfDocument, type OpenedDocument } from "../../web/src/app/open-export";`.
Ajouter en fin du commentaire d'en-tête, juste avant sa ligne ` */` :

```ts
 * cli-partage (D3, D5) : ouverture par `open-export.ts` du produit (`openBoardDocument`, `openPdfDocument`), onglets
 * pleins par `tabs.full()` ; messages et canaux de la CLI inchangés.
```

- [ ] **3. `session.ts:162-187`** — remplacer `readBoard`, `readBoardNoticed`, `readPdfNoticed` par :

```ts
  /** Lit un tableau (`openBoardDocument`) ; échec : « Ouverture impossible (nom) : … » en CliError format ; avis du
   *  lecteur poussés dans les notices, avant l'ajout de l'onglet (D4). */
  async function readBoardNoticed(name: string, blob: Blob, format: BoardSourceFormat): Promise<OpenedDocument> {
    let read: OpenedDocument;
    try {
      read = await openBoardDocument({ name, blob, format }, { core: deps.core, ports: deps.board, makeAssets: () => createAssetStore(), decode: nodeDecode, now: () => deps.now(), appVersion: APP_VERSION });
    } catch (e) {
      throw new CliError("format", messageOf(e)); // déjà « Ouverture impossible (nom) : … »
    }
    deps.notices.push(...read.notices);
    return read;
  }

  /** Lit un PDF (D35, D40) ; échec : message complet du produit ; avis d'ouverture (500 pages) dans les notices (D31). */
  async function readPdfNoticed(name: string, blob: Blob, original?: Blob): Promise<OpenedDocument> {
    let read: OpenedDocument;
    try {
      read = await openPdfDocument({ name, blob, ...(original === undefined ? {} : { original }) }, { core: deps.core, pdf: deps.pdf, makeAssets: () => createAssetStore() });
    } catch (e) {
      throw new CliError("format", messageOf(e));
    }
    deps.notices.push(...read.notices);
    return read;
  }
```

- [ ] **4. `session.ts`, onglets pleins et messages.**
  - `:223` → `if (tabs.full()) throw new CliError("command", TOO_MANY_TABS);`
  - `:234-236` → `if (tabs.full()) {` / `deps.notices.push(openFailedMessage(name, TOO_MANY_TABS));`
  - `:249` → `deps.notices.push(openFailedMessage(name, e));`
  - `:258-260` → `if (tabs.full()) {` / `deps.notices.push(openFailedMessage(name, TOO_MANY_TABS));`

- [ ] **5. `exporter.ts`, imports.** Retirer `import { writeBoardFile } from "../../web/src/app/board-convert";`,
`import { missingOf } from "../../web/src/app/container-io";`,
`import { messageOf, UNREAD_ASSETS_MESSAGE } from "../../web/src/platform/controller";` ; ajouter
`import { exportBlocked, exportBoardDocument, exportFailedMessage } from "../../web/src/app/open-export";`.
Ajouter en fin du commentaire d'en-tête, juste avant sa ligne ` */` :

```ts
 * cli-partage (D6, D7, D8) : garde, écriture d'un tableau (sans copie) et message d'échec du PDF par `open-export.ts` ;
 * un échec d'écriture d'un tableau reste sans préfixe.
```

- [ ] **6. `exportBoardFile` (`:51-66`)** — corps :

```ts
export async function exportBoardFile(session: Session, to: string): Promise<{ file: string; kind: BoardFormat }> {
  checkExportTarget(to);
  const tab = session.active();
  const blocked = exportBlocked(tab.doc, tab.assets);
  if (blocked !== null) throw new CliError("command", blocked);
  const format = extOf(to).slice(1) as BoardFormat;
  let r: { bytes: Uint8Array; warnings: string[] };
  try {
    r = await exportBoardDocument(tab.doc, tab.assets, format, { ports: session.deps.board }); // sans copie (D7)
  } catch (e) {
    throw asCliError(e, "command"); // sans préfixe (D8)
  }
  await session.write(to, r.bytes);
  session.deps.notices.push(...r.warnings); // D24 : avertissements d'écriture dans notices
  return { file: to, kind: format };
}
```

- [ ] **7. `exportPdfFile` (`:72-88`).** `:74` →
`const blocked = exportBlocked(tab.doc, tab.assets);` puis `if (blocked !== null) throw new CliError("command", blocked);` ;
`:86` → `throw new CliError("command", exportFailedMessage(e));` ;
`:88` → `if (r === null) throw new CliError("command", exportFailedMessage("export interrompu"));`.

- [ ] **8. `importer.ts`.** Retirer `import { MAX_TABS } from "../../web/src/app/tabs";` (`:13`) ;
`:126` → `full: () => session.tabs.full(),`.

- [ ] **9. Vert : grep S4, types, caractérisation.**

```bash
cd ~/projets/roomboard-wt/cli-partage--T4/apps/cli && grep -nE 'readBoardFile\(|readPdfFile\(|[`"](Ouverture|Export) impossible|length >= MAX_TABS|missingOf\(|boardWarningsMessage' src/*.ts | grep -v '\.test\.ts' | wc -l
cd ~/projets/roomboard-wt/cli-partage--T4 && grep -ln "open-export" apps/cli/src/session.ts apps/cli/src/exporter.ts
cd ~/projets/roomboard-wt/cli-partage--T4/apps/cli && nice -n 10 pnpm exec tsc --noEmit 2>&1 | tail -15
cd ~/projets/roomboard-wt/cli-partage--T4/apps/cli && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm exec vitest run src/boards.test.ts src/convert.test.ts src/pdf.test.ts src/session.test.ts 2>&1 | tail -15
```

Attendu : `0` ; les deux fichiers listés ; `tsc` sans sortie ; `Test Files  4 passed`, dont les 7 tests
« caractérisation cli-partage » (vérifier par `-t "caractérisation cli-partage"` : `Tests  7 passed`).

- [ ] **10. Suite complète de la CLI.**

```bash
cd ~/projets/roomboard-wt/cli-partage--T4/apps/cli && ROOMBOARD_WASM_REQUIRED=1 VITEST_MAX_WORKERS=3 ROOMBOARD_OFFICE=/home/adminjd/projets/roomboard-wt/cli-partage/target/debug/roomboard-office nice -n 10 pnpm exec vitest run 2>&1 | tail -20
```

Attendu : `FAIL ` absent. Un « Test timed out in 5000ms » : rejouer ce fichier seul une fois (GC3) ; s'il dépasse
encore et fait partie des cinq dépassements de la référence (`import.test.ts:19`, `model3d-node.test.ts:38`, `:49`,
`model3d.test.ts:101`, `pdf-node.test.ts:24`), le noter au rapport (« dépassement de la référence, traité par T5 ») ;
tout autre échec bloque.

- [ ] **11. Essai (S2).**

```bash
cd ~/projets/roomboard-wt/cli-partage--T4 && nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -5
cd ~/projets/roomboard-wt/cli-partage--T4 && ROOMBOARD_OFFICE=/home/adminjd/projets/roomboard-wt/cli-partage/target/debug/roomboard-office nice -n 10 node scripts/essais/cli-essai.mjs 2>&1 | grep -E "E[1-5] :|CLI :" | tail -10
```

Attendu : cinq lignes `ok — … E1 :` à `E5 :` et `CLI : OK`.

- [ ] **12. Commit** (skill `verify` juste avant, s'il est disponible).

```bash
git -C ~/projets/roomboard-wt/cli-partage--T4 add apps/cli/src/session.ts
git -C ~/projets/roomboard-wt/cli-partage--T4 add apps/cli/src/exporter.ts
git -C ~/projets/roomboard-wt/cli-partage--T4 add apps/cli/src/importer.ts
git -C ~/projets/roomboard-wt/cli-partage--T4 -c user.name="jejeasterix" -c user.email="jejeasterix@users.noreply.github.com" commit -F - <<'EOF'
refactor(cli): call open-export instead of copying the open/export layer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

**Critère « terminé ».** Grep S4 à 0 ; suite CLI sans échec hors dépassements notés ; `CLI : OK` ; un commit.
Rapport : sorties bornées des étapes 1, 9, 10, 11, et `Réutilisation : appelé open-export, writePdfFile, Tabs.full` ou
`Réutilisation : écart — <pourquoi>`.

---

<a id="tache-t5"></a>
### Tâche T5 — `VITEST_MAX_WORKERS` par défaut et `beforeAll` des chargements à froid

**Objectif.** D10 : `scripts/verifier.sh:54` borne vitest à 3 workers sauf valeur donnée. D11 : `warmModules()` dans
`apps/cli/src/testing.ts` et un `beforeAll` dans le premier bloc qui exécute un test sans condition de chaque fichier
de la liste du cadrage ; assertions et délais des tests inchangés (S5).

**Worktree.** `~/projets/roomboard-wt/cli-partage--T5` (contient T1). Préparation :

```bash
cd ~/projets/roomboard-wt/cli-partage--T5 && nice -n 10 pnpm install --frozen-lockfile 2>&1 | tail -3
cd ~/projets/roomboard-wt/cli-partage--T5 && [ -d apps/web/src/wasm ] || cp -r ~/projets/roomboard-wt/cli-partage/apps/web/src/wasm apps/web/src/wasm
cd ~/projets/roomboard-wt/cli-partage--T5 && [ -d apps/web/src/wasm-formats ] || cp -r ~/projets/roomboard-wt/cli-partage/apps/web/src/wasm-formats apps/web/src/wasm-formats
cd ~/projets/roomboard-wt/cli-partage--T5 && grep -q "caractérisation cli-partage" apps/cli/src/boards.test.ts && echo "T1 présent"
```

**Fichiers.**
- Modifier : `apps/cli/src/testing.ts` (nouvelle fonction après `memoryIO`, `:47-70`)
- Modifier : `scripts/verifier.sh:53-54` ; `scripts/tests/verifier-e2e.test.sh` (avant la ligne `[ "$fail" -eq 0 ] && …`)
- Modifier (import `beforeAll` / `warmModules` + une ligne `beforeAll`) : les fichiers du tableau de l'étape 5.

**Interfaces.**
- Produit : `export async function warmModules(): Promise<void>` dans `apps/cli/src/testing.ts`.
- Consomme : `nodeSession(io)` (`./session`, import dynamique) ; `memoryIO()` ; `loadPdfLib` (`../../web/src/platform/pdf-load`, import seulement).
- Réutilise : `apps/cli/src/testing.ts:47` — `memoryIO` ; patron `apps/cli/src/pdf.test.ts:23-27` — `await (await nodeSession(memoryIO())).deps.formats()` (étendu en `warmModules`).

**Contraintes (recopiées).**
- GC1 — Refactor sans changement de comportement : les tests existants de la page (dont `workspace.test.ts`) et de la CLI restent verts sans réécriture de fond ; mêmes stdout/stderr/JSON/codes de la CLI.
- GC2 — TDD : test rouge d'abord.
- GC3 — VM partagée : builds/tests en `nice -n 10`, `cargo … -j 4`. Un test qui échoue sur un délai est rejoué une fois avant d'être jugé ; aucun délai (testTimeout, hookTimeout) relevé, aucun test désactivé/sauté, aucun seuil changé.
- GC4 — Preuves bornées ; Wasm copié ; `ROOMBOARD_WASM_REQUIRED=1`.
- GC5 — Ne pas toucher `apps/web/src/platform/`. Aucun Rust modifié. Tailles Wasm inchangées.
- GC6 — Git : jamais `git add -A`/`.`/`commit -a` ; fichiers ajoutés un par un ; auteur `jejeasterix <jejeasterix@users.noreply.github.com>` ; messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Pas de `--force`.
- D11 du cadrage — `beforeAll` jamais au niveau du fichier ; dans le premier bloc qui exécute au moins un test sans condition ; pdf.js laissé dans `model3d.test.ts:101` et `pdf-node.test.ts:24` ; `office.test.ts` : bloc S2 (`:124`), pas S1 (`:51`) ; délai du crochet par défaut (H7).

**Interdits.** Aucune assertion, aucun délai, aucun nom de test modifié ; aucun `beforeAll` au niveau d'un fichier ;
la ligne de tests de `verifier.sh` reste la ligne 54 (aucune ligne insérée avant).

**Étapes.**

- [ ] **1. Rouge (D10).** Ajouter à `scripts/tests/verifier-e2e.test.sh`, juste avant `[ "$fail" -eq 0 ] && echo …` :

```bash
# cli-partage (D10) : 3 workers vitest par processus sauf valeur donnée ; « :- » traite aussi la chaîne vide.
grep -qF 'VITEST_MAX_WORKERS="${VITEST_MAX_WORKERS:-3}" pnpm -r test' scripts/verifier.sh || ko "VITEST_MAX_WORKERS=3 par défaut absent de verifier.sh"
```

```bash
cd ~/projets/roomboard-wt/cli-partage--T5 && bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -5
```

Attendu : `ECHEC : VITEST_MAX_WORKERS=3 par défaut absent de verifier.sh`, code non nul.

- [ ] **2. Vert (D10).** `scripts/verifier.sh:53` devient
`# Contrat du vrai module (D33) : exigé ici, il échoue au lieu de se sauter si le .wasm manque. cli-partage (D10) : 3 workers vitest par processus, sauf valeur donnée.`
et `:54` devient `ROOMBOARD_WASM_REQUIRED=1 VITEST_MAX_WORKERS="${VITEST_MAX_WORKERS:-3}" pnpm -r test`.

```bash
cd ~/projets/roomboard-wt/cli-partage--T5 && bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3
cd ~/projets/roomboard-wt/cli-partage--T5 && grep -n 'VITEST_MAX_WORKERS="${VITEST_MAX_WORKERS:-3}"' scripts/verifier.sh
VITEST_MAX_WORKERS= bash -c 'echo "${VITEST_MAX_WORKERS:-3}"'; VITEST_MAX_WORKERS=1 bash -c 'echo "${VITEST_MAX_WORKERS:-3}"'
```

Attendu : `verifier-e2e.test.sh : OK` ; `54:ROOMBOARD_WASM_REQUIRED=1 VITEST_MAX_WORKERS=…` ; `3` puis `1`.

- [ ] **3. Rouge (D11).** Dans `apps/cli/src/session.test.ts`, ajouter `warmModules` à l'import de `./testing`
(`import { describeWasm, memoryIO, warmModules, type Json } from "./testing";`) et, premier test du bloc
`describeWasm("session (D5, D6, D7, DA4)")` (`:13`) :

```ts
  it("D11 (cli-partage) — warmModules : cœur et module des formats chargés, rend undefined", async () => {
    await expect(warmModules()).resolves.toBeUndefined();
  });
```

```bash
cd ~/projets/roomboard-wt/cli-partage--T5/apps/cli && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm exec vitest run src/session.test.ts -t "warmModules" 2>&1 | tail -10
```

Attendu : `FAIL ` (`warmModules` n'est pas exporté).

- [ ] **4. `warmModules`** — dans `apps/cli/src/testing.ts`, après `memoryIO` :

```ts
/**
 * D11 (cli-partage) : charge le cœur et le module des formats une fois, dans le `beforeAll` du premier bloc qui exécute
 * un test sans condition, hors du délai de 5 s de ce test (patron de `pdf.test.ts:21-27`). Import dynamique : un
 * fichier qui n'appelle pas `warmModules` ne charge pas la session.
 */
export async function warmModules(): Promise<void> {
  const { nodeSession } = await import("./session");
  await (await nodeSession(memoryIO())).deps.formats();
}
```

Relancer la commande de l'étape 3 : `Tests  1 passed`.

- [ ] **5. `beforeAll` des fichiers de D11.** Pour chaque ligne : ajouter `beforeAll` à l'import de `vitest` (déjà présent dans `boards.test.ts` et `convert.test.ts`, ajouté par T1),
`warmModules` à l'import de `./testing`, et en **première ligne du bloc** :
`  beforeAll(warmModules); // D11 (cli-partage) : cœur et formats chargés hors du délai du premier test`.

| fichier | bloc (ligne de la base) |
|---|---|
| `boards.test.ts` | `describeWasm("S2 — lire les cinq tableaux (D22)"` (`:20`, décalée par les imports de T1) |
| `contract.test.ts` | `describeWasm("sortie du processus (bin.ts) : le travail se termine malgré un tube fermé"` (`:93`) |
| `convert.test.ts` | `describeWasm("S3 — écrire et relire .iwb et .ubz (D24, D25)"` (`:32`) |
| `export.test.ts` | `describeWasm("S4 — export .rbitem relu"` (`:7`) |
| `guards.test.ts` | `describeWasm("sortie ≠ source (relecture T11, constat 1)"` (`:14`) |
| `images.test.ts` | `describeWasm("S5 — autres images (cli-lot4)"` (`:17`) |
| `import.test.ts` | `describeWasm("S3 — images et classeur"` (`:18`) |
| `library.test.ts` | `describeWasm("S4 — bibliothèque sur disque (DA9)"` (`:35`) |
| `main.test.ts` | `describeWasm("main : version au vrai module"` (`:63`) |
| `media.test.ts` | `describeWasm("S3 — médias (cli-lot4)"` (`:22`) |
| `rbitem.test.ts` | `describeWasm("S1 — insérer un .rbitem (D18, D19)"` (`:31`) |
| `session.test.ts` | `describeWasm("session (D5, D6, D7, DA4)"` (`:13`), avant le test de l'étape 3 |
| `pdf-node.test.ts` | `describeWasm("superposition vectorielle de la CLI sur le vrai module (D37)"` (`:131`) |
| `office.test.ts` | `describeWasm("S2 — Office impossible : code 3, rien écrit (convert, state)"` (`:124`) — pas le bloc `:51` |

Deux cas à part :
- `model3d-node.test.ts` : import `vitest` → `import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";` ;
  première ligne du bloc `describe("nodeModel3d (cli-lot4, D67)"` (`:37`) :

```ts
  // D11 (cli-partage) : three chargé une fois ici, hors du délai de 5 s du premier test (dépassement de la référence).
  beforeAll(async () => {
    await import("../../web/src/platform/model-view-three");
  });
```

- `model3d.test.ts` : ajouter `import { loadPdfLib } from "../../web/src/platform/pdf-load";` et, dans le `beforeAll`
  existant (`:27-30`), après `await import("../../web/src/platform/model-view-three");` :
  `    await loadPdfLib(); // D11 (cli-partage) : pdf-lib chargé ici ; pdf.js reste dans le test D76 (son chargement est le sujet)`.

- [ ] **6. Diff limité aux crochets.**

```bash
cd ~/projets/roomboard-wt/cli-partage--T5 && git diff -U0 -- 'apps/cli/src/*.test.ts' | grep -E '^[-+]' | grep -vE '^(\+\+\+|---)' | grep -vE 'beforeAll|warmModules|loadPdfLib|model-view-three|^\+\s*\}\);$|^\+\s*//|^[-+]import ' | tail -10
```

Attendu : aucune ligne (les lignes du test de l'étape 3 contiennent `warmModules` ou `});` et sont filtrées) ; toute
ligne affichée est une modification interdite à défaire.

- [ ] **7. Suite complète de la CLI : plus aucun dépassement.**

```bash
cd ~/projets/roomboard-wt/cli-partage--T5/apps/cli && ROOMBOARD_WASM_REQUIRED=1 VITEST_MAX_WORKERS=3 ROOMBOARD_OFFICE=/home/adminjd/projets/roomboard-wt/cli-partage/target/debug/roomboard-office nice -n 10 pnpm exec vitest run 2>&1 | tail -20
cd ~/projets/roomboard-wt/cli-partage--T5/apps/cli && ROOMBOARD_WASM_REQUIRED=1 VITEST_MAX_WORKERS=3 ROOMBOARD_OFFICE=/home/adminjd/projets/roomboard-wt/cli-partage/target/debug/roomboard-office nice -n 10 pnpm exec vitest run 2>&1 | grep -c "timed out"
cd ~/projets/roomboard-wt/cli-partage--T5/apps/cli && nice -n 10 pnpm exec tsc --noEmit 2>&1 | tail -15
```

Attendu : `FAIL ` absent ; `0` ; `tsc` sans sortie. Un « timed out » : rejouer une fois (GC3), puis le rapporter tel
quel (aucun délai relevé).

- [ ] **8. Commit** (skill `verify` juste avant, s'il est disponible). Ajouter un par un `scripts/verifier.sh`,
`scripts/tests/verifier-e2e.test.sh`, `apps/cli/src/testing.ts` et chacun des 16 fichiers de test modifiés :

```bash
cd ~/projets/roomboard-wt/cli-partage--T5 && for f in scripts/verifier.sh scripts/tests/verifier-e2e.test.sh apps/cli/src/testing.ts apps/cli/src/boards.test.ts apps/cli/src/contract.test.ts apps/cli/src/convert.test.ts apps/cli/src/export.test.ts apps/cli/src/guards.test.ts apps/cli/src/images.test.ts apps/cli/src/import.test.ts apps/cli/src/library.test.ts apps/cli/src/main.test.ts apps/cli/src/media.test.ts apps/cli/src/rbitem.test.ts apps/cli/src/session.test.ts apps/cli/src/pdf-node.test.ts apps/cli/src/office.test.ts apps/cli/src/model3d-node.test.ts apps/cli/src/model3d.test.ts; do git add "$f"; done
git -C ~/projets/roomboard-wt/cli-partage--T5 status --short | tail -25
git -C ~/projets/roomboard-wt/cli-partage--T5 -c user.name="jejeasterix" -c user.email="jejeasterix@users.noreply.github.com" commit -F - <<'EOF'
test(cli): warm Wasm modules in beforeAll; default VITEST_MAX_WORKERS to 3

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

**Critère « terminé ».** `verifier-e2e.test.sh : OK` ; test « warmModules » vert ; suite CLI sans échec ni « timed
out » ; un commit. Rapport : sorties des étapes 2, 6, 7, et `Réutilisation : appelé memoryIO, nodeSession (patron
pdf.test.ts)` ou `Réutilisation : écart — <pourquoi>`.

---

<a id="tache-t6"></a>
### Tâche T6 — Essai `cli-essai.mjs` étendu (E1 à E5)

**Objectif.** Ajouter les contrôles E1 à E5 du scénario S2 à `scripts/essais/cli-essai.mjs`, verts sur la base
(caractérisation, D12, D13). Les contrôles existants restent.

**Worktree.** `~/projets/roomboard-wt/cli-partage--T6`. Préparation :

```bash
cd ~/projets/roomboard-wt/cli-partage--T6 && nice -n 10 pnpm install --frozen-lockfile 2>&1 | tail -3
cd ~/projets/roomboard-wt/cli-partage--T6 && [ -d apps/web/src/wasm ] || cp -r ~/projets/roomboard-wt/cli-partage/apps/web/src/wasm apps/web/src/wasm
cd ~/projets/roomboard-wt/cli-partage--T6 && [ -d apps/web/src/wasm-formats ] || cp -r ~/projets/roomboard-wt/cli-partage/apps/web/src/wasm-formats apps/web/src/wasm-formats
cd ~/projets/roomboard-wt/cli-partage--T6 && nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -5
```

**Fichiers.** Modifier : `scripts/essais/cli-essai.mjs` (en-tête `:1-10` ; bloc neuf entre la ligne
`verifie("convert out.pdf vers out.PDF (la source) : code 2, source intacte", …);` et le commentaire
`// ---- Lot 4 (cadrage cli-lot4, S1 à S5) : fichiers écrits par objets.mjs, binaire roomboard-office ----`).

**Interfaces.**
- Consomme (dans l'essai, existant) : `cli(args, input, env)` → `{ code, lignes, err, stderr, brut }` ; `verifie(nom, cond, detail)` ; `dir`, `iwbSrc` (= `lecon.iwb` fabriqué), `trois` (= `three.pdf` fabriqué).
- Produit : contrôles nommés `E1 :` à `E5 :` (lus par T4 et à la clôture).
- Réutilise : `scripts/essais/fabriques/tableaux.mjs:8` — `iwbZip` (déjà écrit en `lecon.iwb` par l'essai) ; tableau abîmé : `Buffer.from("<iwb")` (XML mal formé, `workspace.test.ts:1602`).
- Réutilise : `scripts/essais/fabriques/pdf.mjs` — `pdfPages` (déjà écrit en `three.pdf` par l'essai).

**Contraintes (recopiées).**
- GC2 — TDD : test rouge d'abord (pour un pur déplacement, tests de caractérisation écrits et verts sur la base AVANT le refactor).
- GC3 — VM partagée : builds/tests en `nice -n 10`, `cargo … -j 4`. Un test qui échoue sur un délai est rejoué une fois avant d'être jugé ; aucun délai relevé, aucun test désactivé/sauté, aucun seuil changé.
- GC5 — Ne pas toucher `apps/web/src/platform/`. Aucun Rust modifié.
- GC6 — Git : jamais `git add -A`/`.`/`commit -a` ; fichiers ajoutés un par un ; auteur `jejeasterix <jejeasterix@users.noreply.github.com>` ; messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Pas de `--force`.
- GC7 — Fichiers d'essai fabriqués depuis les fixtures du dépôt, aucun téléchargé ; écritures seulement sous le dossier temporaire de l'essai.
- GC8 — `scripts/essais/cli-essai.mjs` étendu (S2) et doit afficher `CLI : OK`.

**Interdits.** Aucun contrôle existant retiré ou affaibli. Aucun fichier hors `cli-essai.mjs`. Caractérisation : si un
contrôle neuf est rouge sur la base, ne rien assouplir ; s'arrêter et rapporter la sortie (`brut`).

**Étapes.**

- [ ] **1. En-tête.** Après la ligne `:10` (`// processus ne citant la racine XDG_CACHE_HOME …`), ajouter :
`// cli-partage (cadrage cli-partage, S2, D12) : tableau abîmé, import d'un tableau et d'un PDF, import partiel, 12 onglets, PDF illisible (E1 à E5).`

- [ ] **2. Contrôles E1 à E5** — insérer à l'endroit indiqué :

```js
  // ---- cli-partage (cadrage cli-partage, S2, D12) : ouverture par le module partagé, fichiers fabriqués ici ----
  const messageDe = (r) => String(r.err?.error?.message ?? "");
  const abime = join(dir, "abime.iwb");
  writeFileSync(abime, Buffer.from("<iwb")); // XML mal formé (workspace.test.ts:1602)
  const p1 = cli(["state", abime]);
  verifie("E1 : state abime.iwb : code 1, « Ouverture impossible (abime.iwb) : fichier endommagé : … »", p1.code === 1 && messageDe(p1).startsWith("Ouverture impossible (abime.iwb) : fichier endommagé : "), p1.brut);
  const partage = join(dir, "partage.roomboard");
  verifie("E2 : new partage.roomboard", cli(["new", partage]).code === 0);
  const p2 = cli(["import", partage, iwbSrc, trois]);
  const avisLecon = (p2.lignes[0]?.notices ?? []).filter((x) => x.startsWith("lecon.iwb : ouvert avec "));
  verifie("E2 : import lecon.iwb three.pdf : code 0, les deux ouverts, un avis « lecon.iwb : ouvert avec … »", p2.code === 0 && JSON.stringify(p2.lignes[0]?.opened) === JSON.stringify(["lecon.iwb", "three.pdf"]) && avisLecon.length === 1, p2.brut);
  const p3 = cli(["import", partage, abime]);
  verifie("E3 : import abime.iwb : code 1, « import partiel », avis « Ouverture impossible (abime.iwb) »", p3.code === 1 && messageDe(p3).startsWith("import partiel") && (p3.lignes[0]?.notices ?? []).some((x) => x.startsWith("Ouverture impossible (abime.iwb) : ")), p3.brut);
  const douze = `${[...Array.from({ length: 11 }, () => JSON.stringify({ op: "tab.new" })), JSON.stringify({ op: "import", files: [iwbSrc] })].join("\n")}\n`;
  const p4 = cli(["run", "--new", "--ops", "-"], douze);
  const echec12 = p4.lignes.find((l) => l.op === 12);
  verifie("E4 : 12 onglets puis import lecon.iwb : avis « Ouverture impossible (lecon.iwb) : 12 onglets au plus ; fermez-en un »", p4.code === 1 && echec12?.ok === false && (echec12.notices ?? []).includes("Ouverture impossible (lecon.iwb) : 12 onglets au plus ; fermez-en un"), p4.brut);
  const pdfAbime = join(dir, "bad.pdf");
  writeFileSync(pdfAbime, Buffer.from("%PDF-1.4\n%%EOF\n"));
  const p5 = cli(["state", pdfAbime]);
  verifie("E5 : state bad.pdf : code 1, « Ouverture impossible (bad.pdf) : … »", p5.code === 1 && messageDe(p5).startsWith("Ouverture impossible (bad.pdf) : "), p5.brut);
```

- [ ] **3. Lancer sur la base (attendu : vert).**

```bash
cd ~/projets/roomboard-wt/cli-partage--T6 && ROOMBOARD_OFFICE=/home/adminjd/projets/roomboard-wt/cli-partage/target/debug/roomboard-office nice -n 10 node scripts/essais/cli-essai.mjs 2>&1 | grep -E "E[1-5] :|CLI :" | tail -10
```

Attendu : `ok — … E1 :` … `ok — … E5 :` (6 lignes `ok` pour E1 à E5, E2 en compte deux) puis `CLI : OK`.

- [ ] **4. Commit.**

```bash
git -C ~/projets/roomboard-wt/cli-partage--T6 add scripts/essais/cli-essai.mjs
git -C ~/projets/roomboard-wt/cli-partage--T6 -c user.name="jejeasterix" -c user.email="jejeasterix@users.noreply.github.com" commit -F - <<'EOF'
test(cli): extend cli-essai with board open, import and full-tabs checks (E1-E5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

**Critère « terminé ».** `CLI : OK` avec E1 à E5 sur la base ; un commit. Rapport : sortie de l'étape 3, et
`Réutilisation : appelé iwbZip, pdfPages (fichiers de l'essai)` ou `Réutilisation : écart — <pourquoi>`.

---

<a id="tache-t7"></a>
### Tâche T7 — Script de comparaison base ↔ branche (S1)

**Objectif.** Écrire `scripts/essais/cli-comparer.mjs`, qui joue S1 (sorties JSON et codes, fichiers exportés,
`created`) entre deux CLI construites, et déplacer `normalise` de `cli-essai.mjs` dans `scripts/essais/cli-normalise.mjs`
(aucune copie). Le script est prouvé ici sur la base (B = N, puis faux N) ; l'orchestrateur le joue à la clôture.

**Worktree.** `~/projets/roomboard-wt/cli-partage--T7` (contient T6 ; la CLI y est encore celle de la base). Préparation :

```bash
cd ~/projets/roomboard-wt/cli-partage--T7 && nice -n 10 pnpm install --frozen-lockfile 2>&1 | tail -3
cd ~/projets/roomboard-wt/cli-partage--T7 && [ -d apps/web/src/wasm ] || cp -r ~/projets/roomboard-wt/cli-partage/apps/web/src/wasm apps/web/src/wasm
cd ~/projets/roomboard-wt/cli-partage--T7 && [ -d apps/web/src/wasm-formats ] || cp -r ~/projets/roomboard-wt/cli-partage/apps/web/src/wasm-formats apps/web/src/wasm-formats
cd ~/projets/roomboard-wt/cli-partage--T7 && grep -q "E5 : state bad.pdf" scripts/essais/cli-essai.mjs && echo "T6 présent"
cd ~/projets/roomboard-wt/cli-partage--T7 && nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -5
```

**Fichiers.**
- Créer : `scripts/essais/cli-normalise.mjs`
- Créer : `scripts/essais/cli-comparer.mjs`
- Modifier : `scripts/essais/cli-essai.mjs` (retirer `:56-71`, ajouter un import)

**Interfaces.**
- Produit : `export function normalise(valeur)` (`scripts/essais/cli-normalise.mjs`) ; commande
  `node scripts/essais/cli-comparer.mjs <B/roomboard.mjs> <N/roomboard.mjs>` → dernière ligne `COMPARAISON : OK`
  (code 0) ou `COMPARAISON : ÉCART — <détail>` (code 1) ; usage : code 2 ; lignes `note — …` pour un format que B
  n'écrit pas deux fois à l'identique.
- Réutilise : `scripts/essais/fabriques/tableaux.mjs:8` — `iwbZip(zip)` ; tableau abîmé `Buffer.from("<iwb")`.
- Réutilise : `scripts/essais/fabriques/pdf.mjs` — `pdfPages(lib, n)`, `readLibs(web, { worker: true })`, `readPdf(bytes, libs)` (même relecture que `readPdfBack`, `apps/cli/src/testing.ts:206`, qui l'appelle).
- Réutilise : `scripts/essais/commun.mjs:13,223,248` — `ROOT`, `zipEntries(buf)`, `sha256(b)`.

**Contraintes (recopiées).**
- GC3 — VM partagée : builds/tests en `nice -n 10`, `cargo … -j 4`. Aucun délai relevé, aucun test désactivé/sauté, aucun seuil changé.
- GC5 — Ne pas toucher `apps/web/src/platform/`. Aucun Rust modifié.
- GC6 — Git : jamais `git add -A`/`.`/`commit -a` ; fichiers ajoutés un par un ; auteur `jejeasterix <jejeasterix@users.noreply.github.com>` ; messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Pas de `--force`.
- GC7 — Fichiers d'essai fabriqués depuis les fixtures du dépôt, aucun téléchargé ; écritures seulement sous un dossier temporaire (retiré en fin de script).
- GC8 — `scripts/essais/cli-essai.mjs` doit afficher `CLI : OK` (après le déplacement de `normalise`).
- GC9 — Le scénario S1 (comparaison avec la CLI construite depuis la base 7092fdd) se joue à la clôture par l'orchestrateur, avec la commande de clôture ci-dessous.

**Interdits.** Le script n'est pas ajouté à `verifier.sh` (S1 est un contrôle de clôture). Aucune autre modification de
`cli-essai.mjs` que le déplacement de `normalise`. Aucun build de la base dans cette tâche (la base est jouée à la
clôture).

**Étapes.**

- [ ] **1. `cli-normalise.mjs`** — créer :

```js
// Normalisation des sorties JSON de la CLI (cadrage cli, S5 ; cadrage cli-partage, S1) : déplacée de cli-essai.mjs,
// partagée avec cli-comparer.mjs.

/** Ids remplacés par leur rang d'apparition (stable entre deux fichiers) ; le champ `file` garde sa place, valeur neutre. */
export function normalise(valeur) {
  const rang = new Map();
  const id = (s) => {
    if (!rang.has(s)) rang.set(s, `#${rang.size}`);
    return rang.get(s);
  };
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const marche = (v, cle) => {
    if (Array.isArray(v)) return v.map((x) => marche(x, cle));
    if (v !== null && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, marche(x, k)]));
    if (cle === "file") return "<fichier>";
    return typeof v === "string" && UUID.test(v) ? id(v) : v;
  };
  return marche(valeur, "");
}
```

- [ ] **2. `cli-essai.mjs`** — retirer le commentaire `/** Ids remplacés … */` et `function normalise` (lignes 56-71 de
la base, 57-72 après T6), corps identique à celui de l'étape 1 ; ajouter après `import { ROOT, solidPng } from "./commun.mjs";` :
`import { normalise } from "./cli-normalise.mjs";`. Vérifier que le corps déplacé est identique :

```bash
cd ~/projets/roomboard-wt/cli-partage--T7 && diff <(git show HEAD:scripts/essais/cli-essai.mjs | awk '/^function normalise/,/^}/') <(awk '/^export function normalise/,/^}/' scripts/essais/cli-normalise.mjs | sed 's/^export //') && echo "corps identique"
```

Attendu : `corps identique`.

- [ ] **3. `cli-comparer.mjs`** — créer :

```js
// Comparaison de deux CLI construites (cadrage cli-partage, S1, D13) : B (base 7092fdd) et N (branche). Mêmes entrées
// fabriquées (fabriques du dépôt, rien de téléchargé), mêmes commandes, chacune dans son dossier neuf. Exige : codes
// égaux, stdout et stderr égaux après `normalise` (UUID par rang, valeur de `file` neutre) ; fichiers exportés égaux en
// SHA-256, sauf un format que B n'écrit pas deux fois à l'identique (contrôle préalable) : comparé alors par relecture
// (PDF : pages, texte, XObject ; .iwb/.ubz : state normalisé après convert par B) et l'écart de B noté ; enfin
// created === modified dans le manifeste d'un document neuf exporté puis enregistré (D7), pour B comme pour N.
// Usage : node scripts/essais/cli-comparer.mjs <B/roomboard.mjs> <N/roomboard.mjs>
// Sortie : `COMPARAISON : OK` (code 0) ou `COMPARAISON : ÉCART — <détail>` (code 1) ; usage : code 2.
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { deepStrictEqual } from "node:assert";
import { ROOT, sha256, zipEntries } from "./commun.mjs";
import { normalise } from "./cli-normalise.mjs";
import { iwbZip } from "./fabriques/tableaux.mjs";
import { pdfPages, readLibs, readPdf } from "./fabriques/pdf.mjs";

const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error("usage : node scripts/essais/cli-comparer.mjs <B/roomboard.mjs> <N/roomboard.mjs>");
  process.exit(2);
}
const [B, N] = args.map((p) => resolve(p));
const web = createRequire(join(ROOT, "apps", "web", "package.json"));
const { zipSync } = web("fflate");
const NOW = "1795392000000"; // ROOMBOARD_NOW du cadrage (S1, préalable)
const racine = mkdtempSync(join(tmpdir(), "roomboard-cli-comparer-"));
let n = 0;

class Ecart extends Error {}
const ok = (nom) => console.log(`ok — ${++n} ${nom}`);
const note = (texte) => console.log(`note — ${texte}`);
const verifie = (nom, cond, detail = "") => {
  if (!cond) throw new Ecart(`${nom}${detail ? ` (${detail})` : ""}`);
  ok(nom);
};
const egal = (nom, a, b) => {
  try {
    deepStrictEqual(a, b);
  } catch (e) {
    throw new Ecart(`${nom} : ${String(e.message).split("\n").slice(0, 8).join(" ")}`);
  }
  ok(nom);
};

/** Lance `bin` dans `cwd` (chemins relatifs : aucun dossier dans les messages) ; `now` null : ROOMBOARD_NOW retiré. */
function cli(bin, cwd, argv, input = "", now = NOW) {
  const env = { ...process.env };
  delete env.ROOMBOARD_NOW;
  if (now !== null) env.ROOMBOARD_NOW = now;
  const r = spawnSync("node", [bin, ...argv], { cwd, encoding: "utf8", input, env });
  const lire = (t) =>
    (t ?? "")
      .split("\n")
      .filter((l) => l !== "")
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return l;
        }
      });
  return { code: r.status, out: lire(r.stdout), err: lire(r.stderr), brut: `${r.stdout ?? ""}${r.stderr ?? ""}`.slice(0, 600) };
}
/** Code, stdout et stderr comparables (UUID par rang sur toute la sortie, `file` neutre). */
const sortie = (r) => ({ code: r.code, out: normalise(r.out), err: normalise(r.err) });

const ENTREES = ["lecon.iwb", "three.pdf", "abime.iwb", "bad.pdf", "l.roomboard", "t.roomboard"];
const prep = join(racine, "prep");
/** Dossier neuf garni des six entrées (mêmes octets pour B et pour N). */
const dossier = (nom) => {
  const d = join(racine, nom);
  mkdirSync(d);
  for (const f of ENTREES) copyFileSync(join(prep, f), join(d, f));
  return d;
};
let libs = null;
/** Relecture d'un fichier exporté : PDF par readPdf ; .iwb/.ubz par B (même lecteur des deux côtés), state normalisé. */
async function relu(path) {
  if (path.endsWith(".pdf")) {
    libs ??= await readLibs(web, { worker: true });
    return readPdf(readFileSync(path), libs);
  }
  const d = mkdtempSync(join(racine, "relu-"));
  const c = cli(B, d, ["convert", path, "r.roomboard"]);
  if (c.code !== 0) throw new Ecart(`relecture de ${path} : code ${c.code} ${c.brut}`);
  return normalise(cli(B, d, ["state", "r.roomboard"]).out);
}

try {
  // Entrées : fabriquées une fois ; l.roomboard et t.roomboard produits une seule fois, par B (ids aléatoires du cœur).
  mkdirSync(prep);
  writeFileSync(join(prep, "lecon.iwb"), iwbZip(zipSync));
  writeFileSync(join(prep, "three.pdf"), await pdfPages(web("pdf-lib"), 3));
  writeFileSync(join(prep, "abime.iwb"), Buffer.from("<iwb")); // XML mal formé (workspace.test.ts:1602)
  writeFileSync(join(prep, "bad.pdf"), Buffer.from("%PDF-1.4\n%%EOF\n"));
  for (const [src, out] of [["lecon.iwb", "l.roomboard"], ["three.pdf", "t.roomboard"]]) {
    const r = cli(B, prep, ["convert", src, out]);
    verifie(`préparation : B convert ${src} ${out}`, r.code === 0, r.brut);
  }

  // S1.1 — sorties JSON et codes
  const douze = `${[...Array.from({ length: 11 }, () => JSON.stringify({ op: "tab.new" })), JSON.stringify({ op: "import", files: ["lecon.iwb"] })].join("\n")}\n`;
  const COMMANDES = [
    [["state", "lecon.iwb"]],
    [["state", "three.pdf"]],
    [["state", "l.roomboard"]],
    [["state", "abime.iwb"]],
    [["state", "bad.pdf"]],
    [["new", "a.roomboard"]],
    [["import", "a.roomboard", "lecon.iwb", "three.pdf", "abime.iwb"]],
    [["run", "--new", "--ops", "-"], douze],
  ];
  const dB = dossier("B");
  const dN = dossier("N");
  for (const [argv, input] of COMMANDES) egal(`S1.1 ${argv.join(" ")}`, sortie(cli(N, dN, argv, input)), sortie(cli(B, dB, argv, input)));

  // S1.2 — fichiers exportés ; contrôle préalable : chaque binaire exporte deux fois, dans deux dossiers neufs
  const EXPORTS = [
    ["export", "l.roomboard", "l.iwb"],
    ["export", "l.roomboard", "l.ubz"],
    ["export", "t.roomboard", "t.pdf"],
    ["convert", "t.roomboard", "t.iwb"],
  ];
  const dirs = { B: [dossier("B1"), dossier("B2")], N: [dossier("N1"), dossier("N2")] };
  for (const argv of EXPORTS) {
    const rB = dirs.B.map((d) => cli(B, d, argv));
    const rN = dirs.N.map((d) => cli(N, d, argv));
    egal(`S1.2 ${argv.join(" ")} : sortie`, sortie(rN[0]), sortie(rB[0]));
    verifie(`S1.2 ${argv.join(" ")} : code 0`, rB[0].code === 0 && rB[1].code === 0 && rN[1].code === 0, rB[0].brut);
    const f = argv[2];
    const h = (d) => sha256(readFileSync(join(d, f)));
    const [b1, b2] = dirs.B.map(h);
    const [n1, n2] = dirs.N.map(h);
    if (b1 === b2) {
      verifie(`S1.2 ${f} : N stable comme B`, n1 === n2, `${n1} ≠ ${n2}`);
      verifie(`S1.2 ${f} : SHA-256 égaux (B = N)`, n1 === b1, `B ${b1} ; N ${n1}`);
    } else {
      note(`${f} : B diffère de lui-même (${b1} ≠ ${b2}) ; comparé par relecture`);
      egal(`S1.2 ${f} : relecture égale (B = N)`, await relu(join(dirs.N[0], f)), await relu(join(dirs.B[0], f)));
    }
  }

  // S1.3 — created === modified d'un document neuf exporté puis enregistré, sans ROOMBOARD_NOW (D7)
  const forme = { type: "AddShape", page: "$page:0", shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style: { color: "#1e40af", width: 4 }, fill: null };
  const opsC = `${JSON.stringify(forme)}\n${JSON.stringify({ op: "export", to: "c.iwb" })}\n`;
  for (const [nom, bin] of [["B", B], ["N", N]]) {
    const d = dossier(`C${nom}`);
    const r = cli(bin, d, ["run", "--new", "--out", "c.roomboard", "--ops", "-"], opsC, null);
    verifie(`S1.3 ${nom} : run --new --out c.roomboard (forme, export c.iwb, enregistrement)`, r.code === 0, r.brut);
    const m = JSON.parse(zipEntries(readFileSync(join(d, "c.roomboard"))).get("manifest.json").toString("utf8"));
    verifie(`S1.3 ${nom} : created === modified (D7)`, m.created === m.modified, JSON.stringify({ created: m.created, modified: m.modified }));
  }
  console.log("COMPARAISON : OK");
} catch (e) {
  console.log(`COMPARAISON : ÉCART — ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  rmSync(racine, { recursive: true, force: true });
}
```

- [ ] **4. Rouge prouvé : un faux N est rejeté.**

```bash
mkdir -p ~/.cache/tmp/of12-faux && printf 'process.stdout.write("{}\\n");\n' > ~/.cache/tmp/of12-faux/faux.mjs
cd ~/projets/roomboard-wt/cli-partage--T7 && nice -n 10 node scripts/essais/cli-comparer.mjs apps/cli/dist/roomboard.mjs ~/.cache/tmp/of12-faux/faux.mjs 2>&1 | tail -5; echo "code ${PIPESTATUS[0]}"
```

Attendu : dernière ligne `COMPARAISON : ÉCART — S1.1 state lecon.iwb : …`, `code 1`.

- [ ] **5. Vert : B = N (la CLI de ce worktree est encore celle de la base).**

```bash
cd ~/projets/roomboard-wt/cli-partage--T7 && nice -n 10 node scripts/essais/cli-comparer.mjs apps/cli/dist/roomboard.mjs apps/cli/dist/roomboard.mjs 2>&1 | tail -25
```

Attendu : lignes `ok — …` pour S1.1 (8), S1.2, S1.3 (4), éventuelles lignes `note — …` (à recopier au rapport),
dernière ligne `COMPARAISON : OK`.

- [ ] **6. L'essai marche toujours avec `normalise` importé.**

```bash
cd ~/projets/roomboard-wt/cli-partage--T7 && ROOMBOARD_OFFICE=/home/adminjd/projets/roomboard-wt/cli-partage/target/debug/roomboard-office nice -n 10 node scripts/essais/cli-essai.mjs 2>&1 | tail -3
cd ~/projets/roomboard-wt/cli-partage--T7 && grep -c "function normalise" scripts/essais/cli-essai.mjs scripts/essais/cli-normalise.mjs
```

Attendu : `CLI : OK` ; `cli-essai.mjs:0`, `cli-normalise.mjs:1`.

- [ ] **7. Commit.**

```bash
git -C ~/projets/roomboard-wt/cli-partage--T7 add scripts/essais/cli-normalise.mjs
git -C ~/projets/roomboard-wt/cli-partage--T7 add scripts/essais/cli-comparer.mjs
git -C ~/projets/roomboard-wt/cli-partage--T7 add scripts/essais/cli-essai.mjs
git -C ~/projets/roomboard-wt/cli-partage--T7 -c user.name="jejeasterix" -c user.email="jejeasterix@users.noreply.github.com" commit -F - <<'EOF'
test(cli): add base-vs-branch CLI comparison script; share normalise

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
rm -rf ~/.cache/tmp/of12-faux
```

**Commande de clôture (S1), jouée par l'orchestrateur après la fusion de toutes les tâches dans
`~/projets/roomboard-wt/cli-partage`** (aucun Rust modifié : les modules Wasm de la branche valent ceux de la base) :

```bash
git -C ~/projets/roomboard-wt/cli-partage worktree add --detach ~/.cache/tmp/of12-base 7092fdd
cd ~/.cache/tmp/of12-base && nice -n 10 pnpm install --frozen-lockfile 2>&1 | tail -3
cp -r ~/projets/roomboard-wt/cli-partage/apps/web/src/wasm ~/.cache/tmp/of12-base/apps/web/src/wasm
cp -r ~/projets/roomboard-wt/cli-partage/apps/web/src/wasm-formats ~/.cache/tmp/of12-base/apps/web/src/wasm-formats
cd ~/.cache/tmp/of12-base && nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -5
cd ~/projets/roomboard-wt/cli-partage && nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -5
cd ~/projets/roomboard-wt/cli-partage && nice -n 10 node scripts/essais/cli-comparer.mjs ~/.cache/tmp/of12-base/apps/cli/dist/roomboard.mjs apps/cli/dist/roomboard.mjs 2>&1 | tail -30
git -C ~/projets/roomboard-wt/cli-partage worktree remove ~/.cache/tmp/of12-base
```

Attendu : `COMPARAISON : OK` (lignes `note — …` recopiées dans la PR, section `## Preuve`).

**Critère « terminé ».** Étapes 4 à 6 conformes ; un commit. Rapport : sorties des étapes 4, 5, 6 (lignes `note`
comprises) et `Réutilisation : appelé iwbZip, pdfPages, readLibs, readPdf, zipEntries, sha256` ou
`Réutilisation : écart — <pourquoi>`.

---

## Écarts à la carte d'impact du cadrage

Fichiers touchés que la carte d'impact (§ 3) ne liste pas, déclarés ici :

- `scripts/tests/verifier-e2e.test.sh` (T5) : test rouge de D10 (TDD), contrôle de `VITEST_MAX_WORKERS` dans `verifier.sh`.
- `scripts/essais/cli-comparer.mjs` (T7, neuf) : script de S1 (le cadrage décrit la comparaison, pas son fichier).
- `scripts/essais/cli-normalise.mjs` (T7, neuf) et déplacement de `normalise` hors de `scripts/essais/cli-essai.mjs:56-71` :
  S1 exige la même normalisation que l'essai (cadrage S1, « normalisation de `normalise` ») ; déplacée plutôt que recopiée.

## Clôture (orchestrateur)

Après la fusion des sept tâches dans `~/projets/roomboard-wt/cli-partage`.

1. **S5 — suite complète** (reconstruit `roomboard-office`, joue `cli-essai.mjs`) :

```bash
mkdir -p ~/.cache/tmp && cd ~/projets/roomboard-wt/cli-partage && nice -n 10 bash scripts/verifier.sh --e2e > ~/.cache/tmp/of12-verifier.log 2>&1; echo "code $?"; tail -30 ~/.cache/tmp/of12-verifier.log
```

Attendu : `code 0`, `CLI : OK`, aucune ligne `FAIL `, `test result: FAILED` ou `error[`.

2. **S5 — tailles Wasm** (avant : principal 1 374 215 o, formats 2 794 511 o ; plafonds 1 572 864 et 3 145 728 o) :

```bash
grep -E '^module (Wasm|formats) :' ~/.cache/tmp/of12-verifier.log
```

Attendu : `module Wasm : 1374215 octets (…)` et `module formats : 2794511 octets (…)`. Un écart : remesurer sur
`origin/main` avant de conclure (aucun Rust touché).

3. **S5 — valeur donnée respectée.**

```bash
cd ~/projets/roomboard-wt/cli-partage && VITEST_MAX_WORKERS=1 ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli test 2>&1 | tail -15
```

Attendu : `Test Files  N passed`, `FAIL ` absent.

4. **S1 — comparaison base ↔ branche** : la « Commande de clôture (S1) » de la section T7 (worktree
`~/.cache/tmp/of12-base` sur 7092fdd, build des deux CLI,
`node scripts/essais/cli-comparer.mjs ~/.cache/tmp/of12-base/apps/cli/dist/roomboard.mjs apps/cli/dist/roomboard.mjs`,
retrait du worktree sans `--force`). Attendu : `COMPARAISON : OK` ; lignes `note — …` recopiées dans `## Preuve`.

5. **S4 — plus de recopie dans la CLI ; module appelé par les trois fichiers.**

```bash
cd ~/projets/roomboard-wt/cli-partage && grep -nE 'readBoardFile\(|readPdfFile\(|[`"](Ouverture|Export) impossible|length >= MAX_TABS|missingOf\(|boardWarningsMessage' apps/cli/src/*.ts | grep -v '\.test\.ts'
cd ~/projets/roomboard-wt/cli-partage && grep -ln "open-export" apps/cli/src/session.ts apps/cli/src/exporter.ts apps/web/src/app/workspace.ts
```

Attendu : première commande sans sortie ; la seconde liste les trois fichiers.

6. **S3 — tests de la page intacts.**

```bash
cd ~/projets/roomboard-wt/cli-partage && git diff --exit-code origin/main -- apps/web/src/app/workspace.test.ts apps/web/src/app/board-convert.test.ts apps/web/src/app/pdf-convert.test.ts && echo "tests de la page intacts"
```

7. **Constats à consigner** (cadrage § 7) dans `docs/architecture-constats.md` : Office de la CLI
(`apps/cli/src/session.ts:192-207` ↔ `platform/office-import.ts:129-141`) et classeur (`apps/cli/src/importer.ts:93-100`
↔ `platform/sheet-worker.ts:15-19`).
