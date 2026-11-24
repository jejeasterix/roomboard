# CLI lot 3 (PDF) — plan d'exécution

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | `pdf-convert.ts` : `readPdfFile`, `writePdfFile` ; la page délègue | — | `apps/web/src/app/pdf-convert.ts`, `apps/web/src/app/pdf-convert.test.ts`, `apps/web/src/app/workspace.ts` | isolé (`~/projets/roomboard-wt/cli-lot3--T1`) | concepteur-critique | `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app/pdf-convert.test.ts src/app/workspace.test.ts src/app/pdf-export.test.ts 2>&1 \| tail -15` : `Test Files  3 passed`, aucun `FAIL ` ; `-t "readPdfFile"` ≥ 4 tests, `-t "writePdfFile"` ≥ 6 tests | S1, S2 | #tache-t1 |
| T2 | `pdfjsBinding`, `PdfJob`/`pdfJobReply`, `vectorPainter` | — | `apps/web/src/platform/pdf-load.ts`, `apps/web/src/platform/pdf-load.test.ts`, `apps/web/src/platform/container.ts`, `apps/web/src/platform/container.test.ts`, `apps/web/src/platform/pdf-vector-worker.ts`, `apps/web/src/app/pdf-overlay-vector.ts`, `apps/web/src/app/pdf-overlay-vector.test.ts`, `apps/web/src/main.ts` | isolé (`~/projets/roomboard-wt/cli-lot3--T2`) | concepteur-critique | `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/container.test.ts src/platform/pdf-load.test.ts src/app/pdf-overlay-vector.test.ts src/platform/one-shot-worker.test.ts 2>&1 \| tail -15` : `Test Files  4 passed` ; `-t "pdfJobReply"` ≥ 4, `-t "pdfjsBinding"` ≥ 2, `-t "vectorPainter"` ≥ 1 | S2, S4 | #tache-t2 |
| T3 | Fabriques PDF déplacées ; notice des polices corrigée | — | `scripts/essais/fabriques/pdf.mjs`, `scripts/essais/fabriques/pdf.d.mts`, `scripts/essais/c12-pdf-navigateur.mjs`, `apps/web/src/platform/fabrique-pdf.test.ts`, `THIRD_PARTY_NOTICES.md` | isolé (`~/projets/roomboard-wt/cli-lot3--T3`) | implementeur-tdd | `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/fabrique-pdf.test.ts 2>&1 \| tail -15` : `Test Files  1 passed`, ≥ 2 tests `fabriques PDF` ; `grep -c "Open Font License" THIRD_PARTY_NOTICES.md` → `0` | S5, S1 | #tache-t3 |
| T4 | CLI : `pdf-node.ts`, `quiet.ts`, `pdfjs-dist` | T2, T3 | `apps/cli/src/pdf-node.ts`, `apps/cli/src/pdf-node.test.ts`, `apps/cli/src/quiet.ts`, `apps/cli/src/quiet.test.ts`, `apps/cli/src/bin.ts`, `apps/cli/src/pdfjs-worker.d.ts`, `apps/cli/package.json`, `pnpm-lock.yaml` | isolé (`~/projets/roomboard-wt/cli-lot3--T4`) | concepteur-critique | `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/pdf-node.test.ts src/quiet.test.ts 2>&1 \| tail -15` : `Test Files  2 passed`, ≥ 14 tests ; puis build et `node apps/cli/dist/roomboard.mjs formats 2>&1 >/dev/null \| wc -c` → `0` | S2, S4 | #tache-t4 |
| T5 | CLI : lire un PDF (session, import, `convert` depuis `.pdf`) | T1, T3, T4 | `apps/cli/src/session.ts`, `apps/cli/src/importer.ts`, `apps/cli/src/exporter.ts`, `apps/cli/src/formats.ts`, `apps/cli/src/testing.ts`, `apps/cli/src/pdf.test.ts`, `apps/cli/src/formats.test.ts`, `apps/cli/src/main.test.ts`, `apps/cli/src/import.test.ts`, `apps/cli/src/convert.test.ts`, `apps/cli/src/guards.test.ts` | isolé (`~/projets/roomboard-wt/cli-lot3--T5`) | implementeur-tdd | `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli test 2>&1 \| tail -15` : tous verts, aucun `FAIL ` ; `… exec vitest run src/pdf.test.ts -t "S1" 2>&1 \| tail -15` ≥ 5 tests | S1, S3 | #tache-t5 |
| T6 | CLI : écrire un PDF (`export`, `convert`, op `export`), `LOT_LIVRE = 3` | T5 | `apps/cli/src/exporter.ts`, `apps/cli/src/session.ts`, `apps/cli/src/main.ts`, `apps/cli/src/formats.ts`, `apps/cli/src/testing.ts`, `apps/cli/src/pdf.test.ts`, `apps/cli/src/formats.test.ts`, `apps/cli/src/main.test.ts`, `apps/cli/src/export.test.ts`, `apps/cli/src/convert.test.ts` | isolé (`~/projets/roomboard-wt/cli-lot3--T6`) | concepteur-critique | `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli test 2>&1 \| tail -15` : tous verts ; `… exec vitest run src/pdf.test.ts -t "S2\|S3\|S4\|RF" 2>&1 \| tail -15` ≥ 11 tests | S2, S3, S4 | #tache-t6 |
| T7 | Essai `cli-essai.mjs` (S5), `USAGE`, profil § CLI | T6 | `scripts/essais/cli-essai.mjs`, `apps/cli/src/main.ts`, `apps/cli/src/main.test.ts`, `.claude/chantier.md` | isolé (`~/projets/roomboard-wt/cli-lot3--T7`) | implementeur-tdd | `nice -n 10 pnpm --filter @roomboard/cli build 2>&1 \| tail -5 && node scripts/essais/cli-essai.mjs 2>&1 \| tail -40` : dernière ligne `CLI : OK`, lignes `ok — … page comptée`, `texte retrouvé`, `fond présent`, `stderr vide` présentes | S5 | #tache-t7 |

Vagues (dépendances) : 1 = T1 ∥ T2 ∥ T3 ; 2 = T4 (dès T2 et T3 fusionnées, T1 peut encore tourner : aucun fichier
commun) ; 3 = T5 ; 4 = T6 ; 5 = T7. Aucune paire d'une même vague ne partage un fichier. Chemin critique :
T2 → T4 → T5 → T6 → T7.

**Goal :** la CLI lit un PDF (onglet sans fichier, pages en fond `pdf-page`), écrit un PDF annoté depuis un
`.roomboard` et convertit vers et depuis le PDF, par le seul code de la page et du module `formats`.

**Architecture :** trois extractions côté web (`app/pdf-convert.ts` ; `pdfjsBinding`, `pdfJobReply`, `vectorPainter`),
un module Node (`apps/cli/src/pdf-node.ts` : pdf.js en processus sans rendu, krilla par `inlineWorker`, mesure sans
canvas, polices lues dans `pdfjs-dist`), un filtre de trois avertissements (`quiet.ts`), puis le branchement de la
session, de l'import, de l'export et de `convert`. `.pdf` passe à « couvert » ; `LOT_LIVRE = 3`.

**Tech Stack :** TypeScript (Vite 6, Vitest 3), Node 22, `pdfjs-dist` 6.5.438 (legacy, worker en processus),
`pdf-lib` 1.17.1 (résolu depuis `apps/web`), modules Wasm `roomboard_wasm` et `roomboard_formats_wasm` (déjà construits).

**Spec :** `docs/plans/cli-lot3-cadrage.md` (complète `docs/plans/cli-cadrage.md` et `docs/plans/cli-lot2-cadrage.md`).

## Global Constraints

Recopiées dans chaque section concernée (un sous-agent ne lit que la sienne).

- G1 — TDD : test rouge d'abord. Aucun test désactivé, sauté (`.skip`, `.only` ajouté) ni seuil changé ; un test qui
  échoue sur un délai est rejoué une fois, aucun délai relevé.
- G2 — Aucune copie (décision 0281, D32) : pdf.js est appelé en processus par le même code que la page
  (`pdfjsBinding`, `createPdfEngine`, `readPdfFile`, `writePdfFile`, `createVectorOverlay`, `pdfJobReply`), jamais par une
  copie ; un Worker se remplace par `inlineWorker` sur la même fonction.
- G3 — Polices (D48) : lues à l'exécution dans `pdfjs-dist` installé, jamais copiées (ni dans `apps/cli/dist/`, ni dans le
  dépôt) ; `apps/cli/vite.config.ts` inchangé.
- G4 — Fichiers d'essai fabriqués dans les tests depuis les fabriques et fixtures du dépôt
  (`scripts/essais/fabriques/pdf.mjs`, pdf-lib) ; aucun fichier téléchargé, aucun PDF suivi ; écritures seulement sous
  `tmpDir()` (tests) ou `mkdtempSync` (essai).
- G5 — Wasm : aucune ligne Rust (`crates/` intouché) ; modules qui ne grossissent pas (principal 1 374 215 o ≤ 1 572 864 o,
  formats 2 794 511 o ≤ 3 145 728 o), seuils inchangés.
- G6 — Licences : aucune dépendance AGPL/GPL/LGPL, aucun paquet système ; seule dépendance ajoutée : `pdfjs-dist`
  6.5.438 exact dans `apps/cli` (T4, Apache-2.0, déjà au verrou) ; `@napi-rs/canvas` ni ajouté ni requis.
- G7 — VM partagée : builds et tests en `nice -n 10`, cargo `-j 4` s'il sert ; avant toute commande :
  `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- G8 — Worktree isolé neuf : `cd <wt> && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r /home/adminjd/projets/roomboard-wt/cli-lot3/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot3/apps/web/src/wasm-formats apps/web/src/`
  (dossiers générés, ignorés par git, `.gitignore:5-6`).
- G9 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (`--author`), messages en anglais terminés
  par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un, jamais `git add -A`,
  `git add .`, `git commit -a` ; aucun `--force`.
- G10 — Mise à jour D15 : `.pdf` change sa ligne de `FORMAT_LOTS` (T5, T6), ses tests et `scripts/essais/cli-essai.mjs`
  (T7 : page comptée, texte retrouvé, fond présent, stderr vide).
- G11 — stderr de la CLI réservé à la ligne `{"error":…}` (DA2, D34) : aucun `console.log`/`console.warn` ajouté au code
  de la CLI ; seul `quiet.ts` touche `console.warn`.
- G12 — Page inchangée : messages, ordre des avis, destruction du `PdfFile`, repli fermé avant l'enregistrement (les
  19 tests « espace de travail : PDF (C12) » de `workspace.test.ts` restent verts).

## Review Focus

Cinq entrées que les scénarios n'exercent pas et qui mordraient un utilisateur ; chaque test vit dans la tâche
propriétaire.

1. Extension en majuscules (`COURS.PDF`) : lue comme un PDF, fonds `pdf-page` — test `RF1 — extension en majuscules`
   en **T5** (S1, D40 : `formatOf` en minuscules).
2. Pages de tailles mixtes (portrait puis paysage) : chaque fond garde la taille de sa page — test
   `RF2 — pages de tailles mixtes` en **T5** (S1, D35).
3. `convert x.pdf y.pdf` (réassemblage, H33) : 3 pages, texte et superposition d'origine gardés — test
   `RF3 — convert d'un PDF vers un PDF` en **T6**.
4. Contenu hors des pages PDF : code 0 et avis `PDF_CUT_MESSAGE` dans `notices` (H27, D39) — test
   `RF4 — contenu hors des pages` en **T6**.
5. Opération `{"op":"export","to":"x.pdf"}` dans `run` (D41, DA14) ; avec `page` : code 2 — test
   `RF5 — op export vers .pdf` en **T6**.

---

## Carte des fichiers

| fichier | rôle | tâche |
|---|---|---|
| `apps/web/src/app/pdf-convert.ts` (neuf) | `readPdfFile`, `writePdfFile`, `PDF_NO_PAGE_MESSAGE`, `pdfFirstPagesMessage` | T1 |
| `apps/web/src/app/workspace.ts` | `openPdf` et `exportPdf` délèguent ; messages réexportés | T1 |
| `apps/web/src/platform/pdf-load.ts` | `PdfjsModule`, `pdfjsBinding` ; `loadPdfjs` l'appelle | T2 |
| `apps/web/src/platform/container.ts` | `PdfJob`, `pdfJobReply` | T2 |
| `apps/web/src/platform/pdf-vector-worker.ts` | coquille autour de `pdfJobReply` | T2 |
| `apps/web/src/app/pdf-overlay-vector.ts` | `vectorPainter` ; `workerPdfWriter` construit un `PdfJob` | T2 |
| `apps/web/src/main.ts` | `painter: vectorPainter(doc)` | T2 |
| `scripts/essais/fabriques/pdf.mjs` (+ `.d.mts`, neufs) | `pdfPages`, `readPdf` | T3 |
| `scripts/essais/c12-pdf-navigateur.mjs` | importe les fabriques | T3 |
| `THIRD_PARTY_NOTICES.md` | Liberation : GPL v2 avec exception de police | T3 |
| `apps/cli/src/pdf-node.ts` (neuf) | `loadNodePdfjs`, `NO_RENDER`, `nodePdfEngine`, `nodeMeasureContext`, `pdfjsFontsDir`, `nodePdfFonts`, `nodePdfWriter`, `nodeOverlay`, `NO_RASTER_SUFFIX` | T4 |
| `apps/cli/src/quiet.ts` (neuf), `bin.ts` | `PDFJS_WARNINGS`, `quietWarn`, pose à l'import ; importé en premier | T4 |
| `apps/cli/src/pdfjs-worker.d.ts` (neuf) | types du module de worker de pdf.js | T4 |
| `apps/cli/package.json`, `pnpm-lock.yaml` | `pdfjs-dist` 6.5.438 | T4 |
| `apps/cli/src/session.ts` | deps `loadPdfLib`, `pdf`, `pdfWriter` ; `isPdfPath`, `readDoc`, `open`, `openPdf` (T5) ; op `export` `.pdf` (T6) | T5, T6 |
| `apps/cli/src/importer.ts` | `openPdf` passé à `createImporter` | T5 |
| `apps/cli/src/exporter.ts` | `.pdf` source de `convert` (T5) ; `isPdfOut`, `exportPdfFile`, cibles, sans `exportBlocked` (T6) | T5, T6 |
| `apps/cli/src/formats.ts` | `.pdf` lu (T5), écrit, `LOT_LIVRE = 3`, `exportBlocked` retiré (T6) | T5, T6 |
| `apps/cli/src/testing.ts` | `memoryIO(…, pdfLib)`, `pdfFixture`, `readPdfBack` (T5) ; `pdfPanickingFormats`, `refusingPdfLib` (T6) | T5, T6 |
| `apps/cli/src/main.ts` | `export` et `convert` vers `.pdf` (T6) ; `USAGE` (T7) | T6, T7 |
| `scripts/essais/cli-essai.mjs`, `.claude/chantier.md` | contrôles S5, profil § CLI | T7 |

---

<a id="tache-t1"></a>

### Tâche T1 — `pdf-convert.ts` : `readPdfFile`, `writePdfFile` ; la page délègue

**Objectif.** Déplacer tel quel le corps PDF de `workspace.ts` (`openPdf` : lecture, `exportPdf` : assemblage) dans
`apps/web/src/app/pdf-convert.ts` (DA11, D35, D36). `workspace.ts` garde onglets, `exporting`, `missingOf`, boîte
d'enregistrement, nom proposé et avis. La page ne change pas de comportement. Scénarios servis : S1 (lecture que la CLI
branchera en T5), S2 (écriture branchée en T6).

**Patron à ne pas reprendre.** Écrire, côté CLI, une seconde lecture ou un second assemblage PDF qui recopierait
`workspace.ts:510-606` (ouverture, 500 pages, asset, original Office, copie DAPF3, table des blobs du repli, avis) :
deux chemins divergeraient. Chemin de référence, seul code à déplacer : `apps/web/src/app/workspace.ts:510-606`
(`openPdf`, `exportPdf`) et `:55-57` (messages). Rien n'est réécrit autrement que pour sortir de l'onglet.

**Invariant de parité.** `readPdfFile` rejette avec le **message complet** que la page dit aujourd'hui
(`<nom> : PDF chiffré, non pris en charge`, `Ouverture impossible (<nom>) : …`, jamais deux préfixes) ; `writePdfFile`
rend les avis dans l'ordre du produit (`PDF_RASTER_MESSAGE`, `PDF_RASTER_MISSING_MESSAGE`, `PDF_CUT_MESSAGE`), appelle
`rasterClose` une fois, avant le retour (donc avant l'enregistrement), et libère la copie dans `finally`.

**Worktree.** Isolé : `~/projets/roomboard-wt/cli-lot3--T1`. Préparer (G8) :
`cd ~/projets/roomboard-wt/cli-lot3--T1 && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r /home/adminjd/projets/roomboard-wt/cli-lot3/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot3/apps/web/src/wasm-formats apps/web/src/`.

**Fichiers.**
- Créer : `apps/web/src/app/pdf-convert.ts`
- Créer : `apps/web/src/app/pdf-convert.test.ts`
- Modifier : `apps/web/src/app/workspace.ts` (imports 9-50, messages 55-57, `openPdf` 510-554, `exportPdf` 555-607)

**Interfaces.**
- Consomme : `PdfEngine`, `PdfFile` (`engine/render/pdf-port.ts`) ; `PdfEncryptedError`, `PDF_ENCRYPTED_MESSAGE`
  (`platform/pdf-render.ts`) ; `exportPdf`, `ExportResult`, `OverlayProducer`, `PdfLib`, `RasterPage`, avis
  (`app/pdf-export.ts`) ; `typed` (`container-io.ts`) ; `stem` (`board-files.ts`) ; `officeMimeOf`, `officeStemOf`
  (`platform/office-import.ts`) ; `APP_VERSION`, `messageOf` (`platform/controller.ts`).
- Produit (exact, utilisé par T5 et T6) :

```ts
export const PDF_NO_PAGE_MESSAGE = "PDF sans page";
export const pdfFirstPagesMessage = (name: string, total: number): string;
export interface PdfSource { readonly name: string; readonly blob: Blob; readonly original?: Blob }
export interface PdfReadDeps { readonly core: CoreFactory; readonly pdf: PdfEngine; makeAssets(): AssetStore }
export interface PdfRead { readonly doc: CoreDocument; readonly assets: AssetStore; readonly tabName: string; readonly warnings: string[] }
export function readPdfFile(file: PdfSource, deps: PdfReadDeps): Promise<PdfRead>;
export interface PdfWriteDeps {
  readonly core: CoreFactory;
  now(): string;
  loadPdfLib(): Promise<PdfLib>;
  overlay(copy: CoreDocument): OverlayProducer;
  alive(): boolean;
  rasterPage?(blob: Blob, index: number): Promise<RasterPage | null>;
  rasterClose?(): void;
}
export type PdfWritten = ExportResult & { readonly notices: readonly string[] };
export function writePdfFile(doc: CoreDocument, assets: Pick<AssetStore, "get">, deps: PdfWriteDeps): Promise<PdfWritten | null>;
```

- Réutilise : `apps/web/src/app/workspace.ts:510-553` — `readPdfFile(file: { readonly name: string; readonly blob: Blob; readonly original?: Blob }, deps: { readonly core: CoreFactory; readonly pdf: PdfEngine; makeAssets(): AssetStore }): Promise<{ doc: CoreDocument; assets: AssetStore; tabName: string; warnings: string[] }>` (nouveau, extrait ; rejette avec le message complet du produit).
- Réutilise : `apps/web/src/app/workspace.ts:555-606` et `apps/web/src/app/pdf-export.ts:136` — `writePdfFile(doc, assets, deps)` (signature ci-dessus, nouveau, extrait) appelle `exportPdf(doc: ExportSource, assets: Pick<AssetStore, "get">, deps: ExportDeps): Promise<ExportResult | null>` tel quel.
- Rapport de la tâche : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne ci-dessus.

**Contraintes (recopiées).**
- G1 — TDD : test rouge d'abord ; aucun test désactivé, sauté ni seuil changé ; délai : rejoué une fois.
- G2 — Aucune copie (0281, D32) : la page et la CLI liront et écriront le PDF par ces deux fonctions seulement.
- G5 — Aucune ligne Rust ; tailles Wasm inchangées (plafonds 1 572 864 o et 3 145 728 o).
- G7 — `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; `nice -n 10`.
- G8 — Worktree préparé comme ci-dessus.
- G9 — Auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers un par un ; aucun `--force`.
- G12 — Page inchangée : messages, ordre des avis, `PdfFile` détruit, repli fermé avant l'enregistrement.

**Interdits.** Ne pas toucher `pdf-export.ts`, `pdf-overlay*.ts`, `import.ts`, ni aucun fichier de `apps/cli`. Ne pas
corriger les constats ouverts emportés par le code déplacé (`workspace.ts:151` `typed`, `workspace.ts:552`
BoardSources). Aucun test existant de `workspace.test.ts` modifié.

**Terminé quand.** Les trois fichiers de test verts ; `tsc --noEmit` du paquet web sans erreur ; `openPdf` et
`exportPdf` de `workspace.ts` ne contiennent plus `pdf.open`, `fromPdfPages`, `saveParts` ni `assemblePdf` ; un commit.

**Étapes.**

- [ ] **1. Tests rouges** — créer `apps/web/src/app/pdf-convert.test.ts` :

```ts
import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import type { CoreDocument, CoreFactory } from "../core/api";
import { createAssetStore, type AssetStore } from "../core/asset-store";
import { fakeCore } from "../core/fake-core";
import type { PdfEngine, PdfFile, TileBitmap } from "../engine/render/pdf-port";
import { officeMimeOf } from "../platform/office-import";
import { PdfEncryptedError } from "../platform/pdf-render";
import { PDF_CUT_MESSAGE, PDF_RASTER_MESSAGE, PDF_RASTER_MISSING_MESSAGE, type OverlayProducer, type PdfLib } from "./pdf-export";
import { PDF_NO_PAGE_MESSAGE, readPdfFile, writePdfFile, type PdfWriteDeps } from "./pdf-convert";

const PDF_HEAD = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a]);
const PNG_1PX = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
const NOW = "2026-11-24T00:00:00.000Z";

function fakePdf(o: { pages?: number; encrypted?: boolean; fail?: string } = {}) {
  const destroy = vi.fn();
  const pageSize = vi.fn(async (_i: number) => ({ w: 612, h: 792 }));
  const engine: PdfEngine = {
    async open(): Promise<PdfFile> {
      if (o.encrypted === true) throw new PdfEncryptedError();
      if (o.fail !== undefined) throw new Error(o.fail);
      return { pageCount: o.pages ?? 3, pageSize, renderTile: async () => ({}) as TileBitmap, destroy };
    },
  };
  return { engine, destroy, pageSize };
}
const readDeps = (pdf: PdfEngine) => ({ core: fakeCore, pdf, makeAssets: (): AssetStore => createAssetStore() });
const backdrops = (doc: CoreDocument) => doc.pageIds().map((id) => doc.page(id)?.backdrop ?? null);

const none: OverlayProducer = { pages: async (reqs) => reqs.map(() => null) };
const realLib = (): Promise<PdfLib> => import("pdf-lib");
async function refusingLib(): Promise<PdfLib> {
  const base = await realLib();
  return { ...base, PDFDocument: { create: base.PDFDocument.create, load: async () => { throw new Error("refusé"); } } as unknown as PdfLib["PDFDocument"] };
}
async function pdfDoc(): Promise<{ doc: CoreDocument; assets: AssetStore; id: string }> {
  const d = await PDFDocument.create();
  d.addPage([612, 792]);
  const blob = new Blob([new Uint8Array(await d.save())], { type: "application/pdf" });
  const assets = createAssetStore();
  const id = await assets.put(blob);
  const doc = fakeCore.fromPdfPages({ id, name: "a.pdf", mime: "application/pdf", size: blob.size }, [{ w: 612, h: 792 }]);
  return { doc, assets, id };
}
const rect = (doc: CoreDocument, y0: number) =>
  doc.apply({ type: "AddShape", page: doc.pageIds()[0]!, shape: "rect", x0: 100, y0, x1: 300, y1: y0 + 100, style: { color: "#000000", width: 4 }, fill: null });
const writeDeps = (o: Partial<PdfWriteDeps> = {}): PdfWriteDeps => ({ core: fakeCore, now: () => NOW, loadPdfLib: realLib, overlay: () => none, alive: () => true, ...o });

describe("readPdfFile (cli-lot3, D35)", () => {
  it("readPdfFile — 3 pages : fonds pdf-page 0..2, asset application/pdf au nom du fichier, onglet « Cours.roomboard », aucun avis, PdfFile détruit", async () => {
    const pdf = fakePdf();
    const r = await readPdfFile({ name: "Cours.pdf", blob: new Blob([PDF_HEAD]) }, readDeps(pdf.engine));
    expect(backdrops(r.doc).map((b) => [b?.kind, b?.page])).toEqual([["pdf-page", 0], ["pdf-page", 1], ["pdf-page", 2]]);
    const a = r.doc.citedAssets()[0];
    expect([a?.name, a?.mime, a?.size]).toEqual(["Cours.pdf", "application/pdf", PDF_HEAD.byteLength]);
    expect(r.assets.get(a?.id ?? "")?.type).toBe("application/pdf");
    expect([r.tabName, r.warnings]).toEqual(["Cours.roomboard", []]);
    expect(pdf.destroy).toHaveBeenCalledTimes(1);
  });
  it("readPdfFile — 501 pages : 500 tailles lues, avis « gros.pdf : 500 premières pages importées sur 501 »", async () => {
    const pdf = fakePdf({ pages: 501 });
    const r = await readPdfFile({ name: "gros.pdf", blob: new Blob([PDF_HEAD]) }, readDeps(pdf.engine));
    expect(r.doc.pageIds()).toHaveLength(500);
    expect(pdf.pageSize).toHaveBeenCalledTimes(500);
    expect(r.warnings).toEqual(["gros.pdf : 500 premières pages importées sur 501"]);
  });
  it("readPdfFile — refus au message complet du produit : chiffré, illisible, sans page (un seul préfixe, PdfFile détruit)", async () => {
    const blob = new Blob([PDF_HEAD]);
    await expect(readPdfFile({ name: "secret.pdf", blob }, readDeps(fakePdf({ encrypted: true }).engine))).rejects.toMatchObject({ message: "secret.pdf : PDF chiffré, non pris en charge" });
    await expect(readPdfFile({ name: "x.pdf", blob }, readDeps(fakePdf({ fail: "Invalid PDF structure." }).engine))).rejects.toMatchObject({ message: "Ouverture impossible (x.pdf) : Invalid PDF structure." });
    const empty = fakePdf({ pages: 0 });
    await expect(readPdfFile({ name: "vide.pdf", blob }, readDeps(empty.engine))).rejects.toMatchObject({ message: `Ouverture impossible (vide.pdf) : ${PDF_NO_PAGE_MESSAGE}` });
    expect(empty.destroy).toHaveBeenCalledTimes(1);
  });
  it("readPdfFile — PDF converti d'un original Office : asset « Lettre.pdf », original gardé à son type, onglet « Lettre.roomboard »", async () => {
    const r = await readPdfFile({ name: "Lettre.docx", blob: new Blob([PDF_HEAD]), original: new Blob([new Uint8Array([0x50, 0x4b, 3, 4])]) }, readDeps(fakePdf({ pages: 1 }).engine));
    const b = backdrops(r.doc)[0];
    expect(r.tabName).toBe("Lettre.roomboard");
    expect(r.doc.citedAssets().find((x) => x.id === b?.asset)?.name).toBe("Lettre.pdf");
    expect(typeof b?.original).toBe("string");
    expect(r.assets.get(b?.original ?? "")?.type).toBe(officeMimeOf("Lettre.docx"));
  });
});

describe("writePdfFile (cli-lot3, D36)", () => {
  it("writePdfFile — page d'origine recopiée : 1 page, annotated vrai, aucun avis ; la superposition reçoit une copie, jamais le document", async () => {
    const { doc, assets } = await pdfDoc();
    const seen: CoreDocument[] = [];
    const r = await writePdfFile(doc, assets, writeDeps({ overlay: (copy) => (seen.push(copy), none) }));
    expect([r?.pages, r?.annotated, r?.rasterized, r?.rasterMissing, r?.cut, r?.notices]).toEqual([1, true, false, false, false, []]);
    expect(seen).toHaveLength(1);
    expect(seen[0]).not.toBe(doc);
    expect((await PDFDocument.load(r!.bytes)).getPageCount()).toBe(1);
  });
  it("writePdfFile — pdf-lib refuse le PDF d'origine, sans rasterPage : rasterMissing, avis PDF_RASTER_MISSING_MESSAGE ; rasterClose une fois", async () => {
    const { doc, assets } = await pdfDoc();
    const rasterClose = vi.fn();
    const r = await writePdfFile(doc, assets, writeDeps({ loadPdfLib: refusingLib, rasterClose }));
    expect([r?.rasterMissing, r?.notices]).toEqual([true, [PDF_RASTER_MISSING_MESSAGE]]);
    expect(rasterClose).toHaveBeenCalledTimes(1);
  });
  it("writePdfFile — repli en image : rasterPage reçoit le Blob de l'asset et l'indice ; avis PDF_RASTER_MESSAGE", async () => {
    const { doc, assets, id } = await pdfDoc();
    const rasterPage = vi.fn(async (_b: Blob, _i: number) => ({ png: PNG_1PX, w: 612, h: 792 }));
    const r = await writePdfFile(doc, assets, writeDeps({ loadPdfLib: refusingLib, rasterPage }));
    expect([r?.rasterized, r?.notices]).toEqual([true, [PDF_RASTER_MESSAGE]]);
    expect(rasterPage).toHaveBeenCalledWith(assets.get(id), 0);
  });
  it("writePdfFile — contenu hors de la page PDF : avis PDF_CUT_MESSAGE", async () => {
    const { doc, assets } = await pdfDoc();
    rect(doc, 5000);
    const r = await writePdfFile(doc, assets, writeDeps());
    expect(r?.notices).toEqual([PDF_CUT_MESSAGE]);
  });
  it("writePdfFile — superposition en échec : rejet avec son message, rasterClose une fois, copie libérée", async () => {
    const { doc, assets } = await pdfDoc();
    rect(doc, 100);
    const freed = vi.fn();
    const core: CoreFactory = {
      ...fakeCore,
      loadParts: (m, y) => {
        const d = fakeCore.loadParts(m, y);
        const free = d.free.bind(d);
        d.free = () => {
          freed();
          free();
        };
        return d;
      },
    };
    const rasterClose = vi.fn();
    const failing: OverlayProducer = { pages: async () => { throw new Error("krilla"); } };
    await expect(writePdfFile(doc, assets, writeDeps({ core, overlay: () => failing, rasterClose }))).rejects.toThrow("krilla");
    expect(rasterClose).toHaveBeenCalledTimes(1);
    expect(freed).toHaveBeenCalledTimes(1);
  });
  it("writePdfFile — onglet fermé pendant l'export (alive faux) : null", async () => {
    const { doc, assets } = await pdfDoc();
    expect(await writePdfFile(doc, assets, writeDeps({ alive: () => false }))).toBeNull();
  });
});
```

- [ ] **2. Vérifier le rouge** — `cd ~/projets/roomboard-wt/cli-lot3--T1 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app/pdf-convert.test.ts 2>&1 | tail -15`
  Attendu : échec (`Failed to resolve import "./pdf-convert"` ou `readPdfFile is not a function`).

- [ ] **3. Écrire `apps/web/src/app/pdf-convert.ts`** :

```ts
/**
 * PDF sans onglet (cadrage cli-lot3, DA11, D35, D36) : lecture d'un PDF en document (`readPdfFile`) et écriture d'un
 * PDF annoté (`writePdfFile`), code déplacé tel quel de `workspace.ts` (`openPdf`, `exportPdf`). La page garde onglets,
 * `exporting`, boîte d'enregistrement, nom proposé et avis ; la CLI (`apps/cli`) appelle les mêmes fonctions.
 * Constats ouverts emportés tels quels (`typed`, BoardSources) : ni corrigés ni aggravés.
 */
import { PDF_MAX_PAGES, type AssetRef, type CoreDocument, type CoreFactory, type PdfPageSize } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import type { PdfEngine, PdfFile } from "../engine/render/pdf-port";
import { APP_VERSION, messageOf } from "../platform/controller";
import { PDF_EXTENSION, PDF_MIME, ROOMBOARD_EXTENSION } from "../platform/files";
import { officeMimeOf, officeStemOf } from "../platform/office-import";
import { PDF_ENCRYPTED_MESSAGE, PdfEncryptedError } from "../platform/pdf-render";
import { stem } from "./board-files";
import { typed } from "./container-io";
import { exportPdf as assemblePdf, PDF_CUT_MESSAGE, PDF_RASTER_MESSAGE, PDF_RASTER_MISSING_MESSAGE, type ExportResult, type OverlayProducer, type PdfLib, type RasterPage } from "./pdf-export";

/** C12 : avis de l'import PDF (PF7) ; réexportés par `workspace.ts`. */
export const PDF_NO_PAGE_MESSAGE = "PDF sans page";
export const pdfFirstPagesMessage = (name: string, total: number): string => `${name} : ${PDF_MAX_PAGES} premières pages importées sur ${total}`;

export interface PdfSource {
  /** Nom affiché (jamais un chemin : l'appelant passe le nom de base). */
  readonly name: string;
  readonly blob: Blob;
  /** C16 (O5) : original Office d'un PDF converti, gardé en asset. */
  readonly original?: Blob;
}
export interface PdfReadDeps {
  readonly core: CoreFactory;
  readonly pdf: PdfEngine;
  makeAssets(): AssetStore;
}
export interface PdfRead {
  readonly doc: CoreDocument;
  readonly assets: AssetStore;
  /** `<racine>.roomboard` (onglet de la page, PF10). */
  readonly tabName: string;
  /** Avis d'ouverture (« 500 premières pages », PF7), dans l'ordre du produit. */
  readonly warnings: string[];
}

const failed = (name: string, why: string): Error => new Error(`Ouverture impossible (${name}) : ${why}`);

/** Rejette avec le message complet du produit (chiffré, illisible, sans page) ; le `PdfFile` est toujours détruit. */
export async function readPdfFile(file: PdfSource, deps: PdfReadDeps): Promise<PdfRead> {
  const name = file.name;
  let opened: PdfFile;
  try {
    opened = await deps.pdf.open(file.blob);
  } catch (e) {
    throw e instanceof PdfEncryptedError ? new Error(`${name} : ${PDF_ENCRYPTED_MESSAGE}`) : failed(name, messageOf(e));
  }
  try {
    const total = opened.pageCount;
    if (total === 0) throw failed(name, PDF_NO_PAGE_MESSAGE);
    try {
      const sizes: PdfPageSize[] = [];
      for (let i = 0; i < Math.min(total, PDF_MAX_PAGES); i++) sizes.push(await opened.pageSize(i));
      const assets = deps.makeAssets();
      const blob = typed(file.blob, PDF_MIME);
      // C16 (O5, O16) : PDF converti nommé `<racine>.pdf`, original gardé (nom et type Office), onglet `<racine>.roomboard`.
      const original = file.original;
      const root = original === undefined ? stem(name, PDF_EXTENSION) : officeStemOf(name);
      const id = await assets.put(blob);
      const pdfRef: AssetRef = { id, name: original === undefined ? name : `${root}${PDF_EXTENSION}`, mime: PDF_MIME, size: blob.size };
      let originalRef: AssetRef | undefined;
      if (original !== undefined) {
        const ob = typed(original, officeMimeOf(name));
        originalRef = { id: await assets.put(ob), name, mime: ob.type, size: ob.size };
      }
      const doc = deps.core.fromPdfPages(pdfRef, sizes, originalRef);
      return { doc, assets, tabName: `${root}${ROOMBOARD_EXTENSION}`, warnings: total > PDF_MAX_PAGES ? [pdfFirstPagesMessage(name, total)] : [] };
    } catch (e) {
      throw failed(name, messageOf(e));
    }
  } finally {
    opened.destroy(); // l'onglet rouvre le PDF au premier dessin (PC11, HPF2-10)
  }
}

export interface PdfWriteDeps {
  readonly core: CoreFactory;
  now(): string;
  loadPdfLib(): Promise<PdfLib>;
  /** Superposition du contenu de `copy`, la copie prise au départ (DAPF3). */
  overlay(copy: CoreDocument): OverlayProducer;
  /** Faux dès que l'onglet est fermé : l'export rend null. */
  alive(): boolean;
  /** Repli en image d'une page que pdf-lib refuse (page seulement) ; absent : `rasterMissing`. */
  rasterPage?(blob: Blob, index: number): Promise<RasterPage | null>;
  /** Fin de l'assemblage (réussi, refusé ou en erreur) : libère ce que `rasterPage` a gardé ouvert ; une fois. */
  rasterClose?(): void;
}
export type PdfWritten = ExportResult & { readonly notices: readonly string[] };

/** Copie du document (DAPF3), assemblage par `exportPdf`, avis dans l'ordre du produit ; null : onglet fermé. */
export async function writePdfFile(doc: CoreDocument, assets: Pick<AssetStore, "get">, deps: PdfWriteDeps): Promise<PdfWritten | null> {
  let copy: CoreDocument | null = null;
  let rasterClosed = false;
  /** Sessions de rendu ouvertes par `rasterPage` : fermées dès l'assemblage fini (avant l'enregistrement, long), une fois. */
  const closeRaster = (): void => {
    if (rasterClosed) return;
    rasterClosed = true;
    deps.rasterClose?.();
  };
  try {
    // Copie prise au départ (DAPF3) : fermer l'onglet pendant l'export libère son document, pas celle-ci.
    const [manifest, ybin] = doc.saveParts(deps.now(), APP_VERSION);
    const own = deps.core.loadParts(manifest, ybin);
    copy = own;
    const blobs = new Map<string, Blob>(); // un seul `Blob` par asset pendant l'export : `rasterPage` ouvre le PDF une fois
    const r = await assemblePdf(own, assets, {
      loadPdfLib: () => deps.loadPdfLib(),
      overlay: deps.overlay(own),
      alive: () => deps.alive(),
      rasterPage: async (asset, index) => {
        const blob = blobs.get(asset) ?? assets.get(asset);
        if (blob !== undefined) blobs.set(asset, blob);
        return blob === undefined || deps.rasterPage === undefined ? null : deps.rasterPage(blob, index);
      },
    });
    closeRaster();
    if (r === null) return null;
    const notices: string[] = [];
    if (r.rasterized) notices.push(PDF_RASTER_MESSAGE);
    if (r.rasterMissing) notices.push(PDF_RASTER_MISSING_MESSAGE);
    if (r.cut) notices.push(PDF_CUT_MESSAGE);
    return { ...r, notices };
  } finally {
    copy?.free();
    closeRaster(); // même en cas d'erreur
  }
}
```

- [ ] **4. Vérifier le vert de `pdf-convert.test.ts`** — même commande qu'en 2. Attendu : `Tests  10 passed`.

- [ ] **5. Faire déléguer `workspace.ts`** —
  - Lignes 54-57 : retirer la définition de `PDF_NO_PAGE_MESSAGE` et de `pdfFirstPagesMessage` ; garder
    `BUSY_MESSAGE` ; ajouter sous l'export de `CODEC_FALLBACK_MESSAGE` (ligne 52) :
    `export { PDF_NO_PAGE_MESSAGE, pdfFirstPagesMessage } from "./pdf-convert";`
  - Importer : `import { readPdfFile, writePdfFile, type PdfRead } from "./pdf-convert";`
  - Remplacer tout le corps de `async openPdf(file) { … }` (510-554) par :

```ts
    async openPdf(file) {
      const name = baseName(file.name);
      const pdf = deps.pdf;
      if (pdf === undefined) return false;
      if (full()) {
        await say(TOO_MANY_TABS);
        return false;
      }
      let read: PdfRead;
      try {
        read = await readPdfFile({ name, blob: file.blob, original: file.original }, { core, pdf, makeAssets });
      } catch (e) {
        await say(messageOf(e)); // message complet du produit (chiffré, illisible, sans page)
        return false;
      }
      for (const w of read.warnings) await say(w);
      return (await addTab(read.doc, { name: read.tabName, target: null }, read.assets)) !== null;
    },
```

  - Remplacer tout le corps de `async exportPdf() { … }` (555-607) par :

```ts
    async exportPdf() {
      const { pdfFiles, loadPdfLib, overlay } = deps;
      if (pdfFiles === undefined || loadPdfLib === undefined || overlay === undefined) return false;
      if (exporting) {
        await say(BUSY_MESSAGE);
        return false;
      }
      const tab = ws.active(); // onglet montré à l'appel (R3)
      if (missingOf(tab.board.doc, tab.assets).length > 0) {
        await say(UNREAD_ASSETS_MESSAGE);
        return false;
      }
      exporting = true;
      try {
        const r = await writePdfFile(tab.board.doc, tab.assets, {
          core,
          now: () => deps.now(),
          loadPdfLib: () => loadPdfLib(),
          overlay: (copy) => overlay(tab, copy),
          alive: () => !released.has(tab),
          rasterPage: (blob, index) => (deps.rasterPage === undefined ? Promise.resolve(null) : deps.rasterPage(blob, index)),
          rasterClose: () => deps.rasterClose?.(),
        });
        if (r === null) return false; // onglet fermé pendant l'export : rien à dire
        for (const n of r.notices) await say(n);
        const saved = await pdfFiles.save(exportPdfName(tab.files.name(), r.annotated), r.bytes);
        if (saved) await say(pdfExportedMessage(r.pages), "info");
        return saved;
      } catch (e) {
        await say(`Export impossible : ${messageOf(e)}`);
        return false;
      } finally {
        exporting = false;
      }
    },
```

  - Imports devenus inutiles : pour chaque symbole `PDF_MAX_PAGES`, `AssetRef`, `PdfPageSize`, `PdfFile`,
    `PDF_ENCRYPTED_MESSAGE`, `PdfEncryptedError`, `officeMimeOf`, `officeStemOf`, `assemblePdf`, `PDF_CUT_MESSAGE`,
    `PDF_RASTER_MESSAGE`, `PDF_RASTER_MISSING_MESSAGE`, `RasterPage`, `PDF_MIME` : si
    `grep -cw '<symbole>' apps/web/src/app/workspace.ts` vaut 1 (l'import seul), le retirer de son import.

- [ ] **6. Vert et types** —
  `cd ~/projets/roomboard-wt/cli-lot3--T1 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app/pdf-convert.test.ts src/app/workspace.test.ts src/app/pdf-export.test.ts 2>&1 | tail -15`
  Attendu : `Test Files  3 passed`, aucun `FAIL ` ; tests à garder verts : « espace de travail : PDF (C12) » (19 tests de
  `workspace.test.ts:1033-1288`), `pdf-export.test.ts`.
  Puis `nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -10` : aucune ligne `error TS`.
  `c12-pdf-navigateur.mjs --e2e` est rejoué par `verifier.sh --e2e` en fin de chantier.

- [ ] **7. Commit**

```bash
git -C ~/projets/roomboard-wt/cli-lot3--T1 add apps/web/src/app/pdf-convert.ts apps/web/src/app/pdf-convert.test.ts apps/web/src/app/workspace.ts
git -C ~/projets/roomboard-wt/cli-lot3--T1 commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -F - <<'EOF'
refactor(web): move PDF read and write out of the workspace into pdf-convert

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

<a id="tache-t2"></a>

### Tâche T2 — `pdfjsBinding`, `PdfJob`/`pdfJobReply`, `vectorPainter`

**Objectif.** Trois extractions de code de la page, réutilisées par la CLI en T4 : le lien pdf.js
(`pdfjsBinding(pdfjs, options)`, extrait de `loadPdfjs`), le corps du Worker d'écriture PDF
(`pdfJobReply(mod, job)`, à côté de `hasPdfWriter`), le peintre vectoriel (`vectorPainter(doc)`, extrait de
`main.ts:309`). Comportement de la page inchangé. Scénarios servis : S2 (écriture vectorielle), S4 (panique krilla).

**Patron à ne pas reprendre.** Un écrivain PDF de la CLI qui appellerait `mod.write_pdf_pages(…)` directement, ou un
second `getDocument`/`isPasswordError` écrit pour Node : chaque contrôle (écrivain absent, erreur rendue en `{ error }`,
transfert du tampon, mot de passe) serait recopié. Chemins de référence (seuls corps à extraire, tels quels) :
`apps/web/src/platform/pdf-vector-worker.ts:19-28`, `apps/web/src/platform/pdf-load.ts:49-52`,
`apps/web/src/main.ts:309`. Patron déjà suivi au lot 2 : `apps/web/src/platform/board-reader.ts:165-190`
(`boardJobReply`) et `board-worker.ts:14-22` (coquille).

**Invariant partagé (D29, D38).** `pdfJobReply` rend toute erreur en `{ error: message }` **sauf**
`WebAssembly.RuntimeError`, relancée. La coquille du Worker l'attrape et poste le même `{ error }` qu'aujourd'hui : rien
ne change pour la page. En processus (T4), `inlineWorker` la transforme en `onerror` et l'appelant marque l'instance
non sûre.

**Worktree.** Isolé : `~/projets/roomboard-wt/cli-lot3--T2`. Préparer (G8) :
`cd ~/projets/roomboard-wt/cli-lot3--T2 && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r /home/adminjd/projets/roomboard-wt/cli-lot3/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot3/apps/web/src/wasm-formats apps/web/src/`.

**Fichiers.**
- Modifier : `apps/web/src/platform/pdf-load.ts:11-14` (interface exportée), `:37-53` (`loadPdfjs`), + `pdfjsBinding`
- Modifier : `apps/web/src/platform/container.ts` (après `hasPdfWriter`, ligne 79 : `PdfJob`, `pdfJobReply`)
- Modifier : `apps/web/src/platform/pdf-vector-worker.ts` (fichier entier : coquille)
- Modifier : `apps/web/src/app/pdf-overlay-vector.ts:12-19` (imports), `:54-63` (`PdfJob`), + `vectorPainter`
- Modifier : `apps/web/src/main.ts:19`, `:26`, `:309`
- Test : `pdf-load.test.ts`, `container.test.ts`, `pdf-overlay-vector.test.ts` (blocs neufs en fin de fichier)

**Interfaces.**
- Consomme : `openPdfDocument(getDocument, data, options)` (`pdf-load.ts:20`) ; `hasPdfWriter`, `FormatsBinding`
  (`container.ts:49,77`) ; `WorkerReply` (`one-shot-worker.ts:49`) ; `Canvas2DRenderer`, `exportPainterOptions`
  (`engine/render/canvas2d.ts:53`) ; `RecordingPath` (`engine/render/record-ctx.ts`).
- Produit (exact, utilisé par T4) :

```ts
// platform/pdf-load.ts
export interface PdfjsLoadingTask { readonly promise: Promise<object>; destroy(): Promise<void> }
export interface PdfjsModule {
  getDocument(params: { data: Uint8Array } & Record<string, unknown>): PdfjsLoadingTask;
  readonly PasswordException: abstract new (...a: never[]) => unknown;
}
export function pdfjsBinding(pdfjs: PdfjsModule, options: Record<string, unknown>): PdfjsBinding;
// platform/container.ts
export interface PdfJob { readonly ops: Float32Array; readonly texts: string[]; readonly fonts: Uint8Array; readonly fontSizes: Uint32Array; readonly images: Uint8Array; readonly imageSizes: Uint32Array }
export const PDF_WRITER_MISSING_MESSAGE = "module de l'écrivain PDF indisponible";
export function pdfJobReply(mod: FormatsBinding, job: PdfJob): WorkerReply;
// app/pdf-overlay-vector.ts
export function vectorPainter(doc: CoreDocument): VectorOverlayDeps["painter"];
```

- Réutilise : `apps/web/src/platform/pdf-load.ts:37-53` (`loadPdfjs`, `isPasswordError` en `:51`) — `pdfjsBinding(pdfjs: { getDocument(p: { data: Uint8Array } & Record<string, unknown>): PdfjsLoadingTask; readonly PasswordException: abstract new (...a: never[]) => unknown }, options: Record<string, unknown>): PdfjsBinding` ; `loadPdfjs` = `pdfjsBinding(pdfjs, { cMapUrl, cMapPacked, standardFontDataUrl, wasmUrl })` (étendre, extraire).
- Réutilise : `apps/web/src/platform/pdf-load.ts:19` — `openPdfDocument(getDocument, data, options)` appelé par `pdfjsBinding` (réutiliser).
- Réutilise : `apps/web/src/platform/pdf-vector-worker.ts:19-28` (corps non exporté) — `export interface PdfJob` (ex-`Job`, `:10-17`) ; `pdfJobReply(mod: FormatsBinding, job: PdfJob): WorkerReply` dans `platform/container.ts` ; `workerPdfWriter` (`pdf-overlay-vector.ts:54`) construit un `PdfJob` typé (étendre, extraire).
- Réutilise : `apps/web/src/main.ts:309` — `vectorPainter(doc: CoreDocument): VectorOverlayDeps["painter"]` = `(ctx, images) => new Canvas2DRenderer(ctx, null, doc, exportPainterOptions(images, { makePath: () => new RecordingPath() as unknown as Path2D }))`, dans `pdf-overlay-vector.ts` ; `main.ts` l'appelle (étendre, extraire).
- Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne ci-dessus.

**Contraintes (recopiées).**
- G1 — TDD : test rouge d'abord ; aucun test désactivé, sauté ni seuil changé ; délai : rejoué une fois.
- G2 — Aucune copie (0281, D32) : un Worker se remplace par un appel direct à la même fonction ; les contrôles ne sont jamais réécrits.
- G5 — Aucune ligne Rust ; tailles Wasm inchangées (plafonds 1 572 864 o et 3 145 728 o).
- G7 — `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; `nice -n 10`.
- G8 — Worktree préparé comme ci-dessus.
- G9 — Auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers un par un ; aucun `--force`.
- G12 — Page inchangée : réponses et transferts du Worker identiques ; même peintre construit.

**Interdits.** Ne pas toucher `createVectorOverlay`, `fallbackOverlay`, `runOnce`, `inlineWorker`, `pdf-render.ts`,
`pdf-worker.ts`. Aucun fichier de `apps/cli`. Message du module sans écrivain inchangé (« module de l'écrivain PDF
indisponible »).

**Terminé quand.** Les quatre fichiers de test verts ; `tsc --noEmit` du paquet web sans erreur ;
`grep -c "write_pdf_pages" apps/web/src/platform/pdf-vector-worker.ts` → `0` ; `grep -c "RecordingPath" apps/web/src/main.ts` → `0` ; un commit.

**Étapes.**

- [ ] **1. Tests rouges** — en fin de `apps/web/src/platform/container.test.ts` (ajouter `pdfJobReply, type PdfJob` à
  l'import de `./container`) :

```ts
describe("pdfJobReply (cli-lot3, D38)", () => {
  const job = (): PdfJob => ({ ops: new Float32Array([1]), texts: ["t"], fonts: new Uint8Array([9]), fontSizes: Uint32Array.of(1), images: new Uint8Array(0), imageSizes: new Uint32Array(0) });
  const fail = (): never => {
    throw new Error("non appelé");
  };
  const withWriter = (write: (...a: unknown[]) => Uint8Array): FormatsBinding =>
    ({ ContainerReader: { open: fail }, write_container: fail, write_pdf_pages: write }) as unknown as FormatsBinding;
  it("pdfJobReply — réponse { bytes }, tampon transféré, arguments passés dans l'ordre", () => {
    const j = job();
    const seen: unknown[][] = [];
    const out = new Uint8Array([1, 2, 3]);
    const r = pdfJobReply(withWriter((...a) => (seen.push(a), out)), j);
    expect(r.data).toEqual({ bytes: out });
    expect(r.transfer).toEqual([out.buffer]);
    expect(seen).toEqual([[j.ops, j.texts, j.fonts, j.fontSizes, j.images, j.imageSizes]]);
  });
  it("pdfJobReply — module sans écrivain : { error: « module de l'écrivain PDF indisponible » }", () => {
    const r = pdfJobReply({ ContainerReader: { open: fail }, write_container: fail } as unknown as FormatsBinding, job());
    expect(r).toEqual({ data: { error: "module de l'écrivain PDF indisponible" }, transfer: [] });
  });
  it("pdfJobReply — erreur ordinaire de krilla : { error: message }, rien de transféré", () => {
    const r = pdfJobReply(withWriter(() => { throw new Error("page refusée"); }), job());
    expect(r).toEqual({ data: { error: "page refusée" }, transfer: [] });
  });
  it("pdfJobReply — panique Wasm (RuntimeError) : relancée, jamais rendue en { error } (D29)", () => {
    expect(() => pdfJobReply(withWriter(() => { throw new WebAssembly.RuntimeError("unreachable"); }), job())).toThrow(WebAssembly.RuntimeError);
  });
});
```

  En fin de `apps/web/src/platform/pdf-load.test.ts` (import : `import { openPdfDocument, pdfjsBinding } from "./pdf-load";`) :

```ts
describe("pdfjsBinding (cli-lot3, D32)", () => {
  it("pdfjsBinding — open : getDocument reçoit les données et les options ; destroy libère la tâche", async () => {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const seen: Record<string, unknown>[] = [];
    const binding = pdfjsBinding(
      {
        getDocument: (p) => {
          seen.push(p);
          return pdfjs.getDocument(p);
        },
        PasswordException: pdfjs.PasswordException,
      },
      { verbosity: 0 },
    );
    const lib = await PDFDocument.create();
    lib.addPage([200, 100]);
    const doc = await binding.open((await lib.save()).slice());
    expect(doc.numPages).toBe(1);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ verbosity: 0 });
    expect(seen[0]?.["data"]).toBeInstanceOf(Uint8Array);
    await expect(doc.destroy()).resolves.toBeUndefined();
  });
  it("pdfjsBinding — isPasswordError : instance de la classe donnée ou nom « PasswordException » ; toute autre erreur : faux", () => {
    class Pwd extends Error {}
    const binding = pdfjsBinding({ getDocument: () => { throw new Error("non appelé"); }, PasswordException: Pwd }, {});
    expect(binding.isPasswordError(new Pwd("x"))).toBe(true);
    expect(binding.isPasswordError({ name: "PasswordException" })).toBe(true);
    expect(binding.isPasswordError(new Error("x"))).toBe(false);
    expect(binding.isPasswordError(null)).toBe(false);
  });
});
```

  En fin de `apps/web/src/app/pdf-overlay-vector.test.ts` (imports : `vectorPainter` depuis `./pdf-overlay-vector`,
  `import { fakeCore } from "../core/fake-core";`) :

```ts
describe("vectorPainter (cli-lot3, D37)", () => {
  it("vectorPainter — peint le contenu de la page avec des chemins enregistrés : un rectangle → un dessin, une page krilla demandée", async () => {
    const doc = fakeCore.blank();
    const page = doc.pageIds()[0]!;
    doc.apply({ type: "AddShape", page, shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style: { color: "#1e40af", width: 4 }, fill: null });
    const lists: RecordedList[] = [];
    const out = await createVectorOverlay({
      doc,
      assets: { get: () => undefined },
      alive: () => true,
      measure: new Real() as unknown as CanvasRenderingContext2D,
      painter: vectorPainter(doc),
      fonts: async () => [new Uint8Array([9])],
      toPng: async () => new Uint8Array(0),
      write: async (l) => {
        lists.push(l);
        return new Uint8Array([7]);
      },
    }).pages([req(page)]);
    expect(out).toEqual([{ kind: "pdf", bytes: new Uint8Array([7]), index: 0 }]);
    expect(lists).toHaveLength(1);
    expect(lists[0]!.drawn[0]).toBeGreaterThan(0);
  });
});
```

- [ ] **2. Vérifier le rouge** —
  `cd ~/projets/roomboard-wt/cli-lot3--T2 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/container.test.ts src/platform/pdf-load.test.ts src/app/pdf-overlay-vector.test.ts 2>&1 | tail -15`
  Attendu : échec (`pdfJobReply is not a function`, `pdfjsBinding is not a function`, `vectorPainter is not a function`).

- [ ] **3. `pdf-load.ts`** — exporter l'interface (ligne 11 : `export interface PdfjsLoadingTask {`), puis ajouter
  avant `loadPdfjs` et réécrire `loadPdfjs` :

```ts
/** Ce que `pdfjsBinding` lit du module pdf.js chargé (page : Worker propre ; CLI : worker en processus, cli-lot3 D32). */
export interface PdfjsModule {
  getDocument(params: { data: Uint8Array } & Record<string, unknown>): PdfjsLoadingTask;
  readonly PasswordException: abstract new (...a: never[]) => unknown;
}

/** Lien `PdfjsBinding` d'un module pdf.js chargé : seule définition, la page (`loadPdfjs`) et la CLI l'appellent. */
export function pdfjsBinding(pdfjs: PdfjsModule, options: Record<string, unknown>): PdfjsBinding {
  return {
    open: (data) => openPdfDocument((p) => pdfjs.getDocument(p), data, options),
    isPasswordError: (e) => e instanceof pdfjs.PasswordException || (e as { name?: unknown } | null)?.name === "PasswordException",
  };
}

export async function loadPdfjs(): Promise<PdfjsBinding> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (pdfjs.GlobalWorkerOptions.workerPort === null) {
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(new URL("./pdf-worker.ts", import.meta.url), { type: "module" });
  }
  const dir = (name: string): string => new URL(`${PDFJS_BASE}${name}/`, document.baseURI).href;
  return pdfjsBinding(pdfjs, {
    cMapUrl: dir("cmaps"),
    cMapPacked: true,
    standardFontDataUrl: dir("standard_fonts"),
    wasmUrl: dir("wasm"),
  });
}
```

  Si `tsc` refuse `pdfjsBinding(pdfjs, …)` (module non assignable à `PdfjsModule`), passer
  `{ getDocument: (p) => pdfjs.getDocument(p), PasswordException: pdfjs.PasswordException }` à la place de `pdfjs`.

- [ ] **4. `container.ts`** — ajouter `import type { WorkerReply } from "./one-shot-worker";` en tête, puis après
  `hasPdfWriter` (ligne 79) :

```ts
/** Message reçu par le corps du Worker d'écriture PDF (`pdfJobReply`, cli-lot3, D38) : listes et octets concaténés. */
export interface PdfJob {
  readonly ops: Float32Array;
  readonly texts: string[];
  readonly fonts: Uint8Array;
  readonly fontSizes: Uint32Array;
  readonly images: Uint8Array;
  readonly imageSizes: Uint32Array;
}
export const PDF_WRITER_MISSING_MESSAGE = "module de l'écrivain PDF indisponible";

/**
 * Corps du Worker d'écriture PDF (cli-lot3, D38, DA13) : `{ bytes }` (tampon transféré) ou `{ error }`. Une panique Wasm
 * (`RuntimeError`) est relancée (D29) : la coquille du Worker la rend en `{ error }`, `inlineWorker` en `onerror`.
 */
export function pdfJobReply(mod: FormatsBinding, job: PdfJob): WorkerReply {
  try {
    if (!hasPdfWriter(mod)) throw new Error(PDF_WRITER_MISSING_MESSAGE);
    const bytes = mod.write_pdf_pages(job.ops, job.texts, job.fonts, job.fontSizes, job.images, job.imageSizes);
    return { data: { bytes }, transfer: [bytes.buffer as ArrayBuffer] };
  } catch (err) {
    if (err instanceof WebAssembly.RuntimeError) throw err; // D29 : la panique remonte (coquille ou inlineWorker)
    return { data: { error: err instanceof Error ? err.message : String(err) }, transfer: [] };
  }
}
```

- [ ] **5. Coquille `pdf-vector-worker.ts`** — remplacer le fichier entier par :

```ts
/**
 * Entrée du Worker d'écriture PDF (C12, PF22, DAPF4) : sa propre instance du module `formats`, une réponse `{ bytes }`
 * ou `{ error }`, puis arrêté par `runOnce` (`one-shot-worker.ts`). Une panique Wasm (krilla) arrive en `RuntimeError`
 * et ne touche jamais l'instance de la page qui enregistre le `.roomboard` (HR6). Module sans écrivain (construit avant
 * C12) : `{ error }`, le producteur retombe sur le PNG. Créé par `main.ts`, jamais par un test.
 * Corps dans `pdfJobReply` (cli-lot3, D38, DA13) : cette coquille charge le module, poste la réponse et son tampon, et
 * rend en `{ error }` ce qui en sort (panique relancée par `pdfJobReply`, module absent).
 */
import { pdfJobReply, type PdfJob } from "./container";
import { loadFormatsModule } from "./container-load";

self.onmessage = async (e: MessageEvent<PdfJob>): Promise<void> => {
  try {
    const r = pdfJobReply(await loadFormatsModule(), e.data);
    self.postMessage(r.data, { transfer: r.transfer });
  } catch (err) {
    self.postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
};
```

- [ ] **6. `pdf-overlay-vector.ts`** — imports : ajouter
  `import { Canvas2DRenderer, exportPainterOptions } from "../engine/render/canvas2d";`, compléter
  `import { RecordingContext2D, RecordingPath, type RecordedList } from "../engine/render/record-ctx";` et
  `import type { PdfJob } from "../platform/container";`. Dans `workerPdfWriter`, écrire `const job: PdfJob = {`
  (contenu inchangé). Ajouter après `workerPdfWriter` :

```ts
/** Peintre du contenu pour la superposition vectorielle (cli-lot3, D37) : celui de l'écran, chemins enregistrés
 *  (`RecordingPath`, aucun `Path2D`) ; seule définition, l'amorce de la page et la CLI l'appellent. */
export function vectorPainter(doc: CoreDocument): VectorOverlayDeps["painter"] {
  return (ctx, images) => new Canvas2DRenderer(ctx, null, doc, exportPainterOptions(images, { makePath: () => new RecordingPath() as unknown as Path2D }));
}
```

- [ ] **7. Amorce `main.ts`** — ligne 19 : importer aussi `vectorPainter` ; ligne 309 :
  `painter: vectorPainter(doc),` ; ligne 26 : retirer l'import de `RecordingPath` si
  `grep -cw RecordingPath apps/web/src/main.ts` vaut 1.

- [ ] **8. Vert et types** —
  `cd ~/projets/roomboard-wt/cli-lot3--T2 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/container.test.ts src/platform/pdf-load.test.ts src/app/pdf-overlay-vector.test.ts src/platform/one-shot-worker.test.ts 2>&1 | tail -15`
  Attendu : `Test Files  4 passed`, aucun `FAIL ` (tests à garder verts : `pdf-overlay-vector.test.ts`, `one-shot-worker.test.ts`).
  `nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -10` : aucune ligne `error TS`.
  `grep -c "write_pdf_pages" apps/web/src/platform/pdf-vector-worker.ts` → `0`.

- [ ] **9. Commit**

```bash
git -C ~/projets/roomboard-wt/cli-lot3--T2 add apps/web/src/platform/pdf-load.ts apps/web/src/platform/pdf-load.test.ts apps/web/src/platform/container.ts apps/web/src/platform/container.test.ts apps/web/src/platform/pdf-vector-worker.ts apps/web/src/app/pdf-overlay-vector.ts apps/web/src/app/pdf-overlay-vector.test.ts apps/web/src/main.ts
git -C ~/projets/roomboard-wt/cli-lot3--T2 commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -F - <<'EOF'
refactor(web): extract pdfjsBinding, pdfJobReply and vectorPainter for in-process use

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

<a id="tache-t3"></a>

### Tâche T3 — Fabriques PDF déplacées ; notice des polices corrigée

**Objectif.** Déplacer `threePages` et `readBack` de `scripts/essais/c12-pdf-navigateur.mjs:21-41` dans
`scripts/essais/fabriques/pdf.mjs` (bibliothèques injectées), sous les noms `pdfPages` et `readPdf` (D43) ; l'essai C12
les importe. Corriger `THIRD_PARTY_NOTICES.md` : Liberation Sans est sous GNU GPL v2 avec exception de police (licence
Red Hat 1.07.4), pas OFL-1.1 (D48). Scénarios servis : S5 (l'essai fabrique ses PDF ainsi), S1 (tests de la CLI).

**Worktree.** Isolé : `~/projets/roomboard-wt/cli-lot3--T3`. Préparer (G8) :
`cd ~/projets/roomboard-wt/cli-lot3--T3 && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r /home/adminjd/projets/roomboard-wt/cli-lot3/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot3/apps/web/src/wasm-formats apps/web/src/`.

**Fichiers.**
- Créer : `scripts/essais/fabriques/pdf.mjs`, `scripts/essais/fabriques/pdf.d.mts`
- Créer : `apps/web/src/platform/fabrique-pdf.test.ts`
- Modifier : `scripts/essais/c12-pdf-navigateur.mjs:7-41`, `:88`, `:119`
- Modifier : `THIRD_PARTY_NOTICES.md:226-232`, `:309-315`

**Interfaces.**
- Consomme : rien des autres tâches.
- Produit (exact, utilisé par T4, T5, T6, T7) :

```ts
// scripts/essais/fabriques/pdf.d.mts
export interface PdfMakeLib { readonly PDFDocument: { create(): Promise<unknown> }; readonly StandardFonts: { readonly Helvetica: unknown } }
export interface PdfReadLibs {
  readonly pdfjs: { getDocument(src: object): { readonly promise: Promise<unknown>; destroy(): Promise<void> } };
  readonly PDFDocument: { load(bytes: Uint8Array): Promise<unknown> };
  readonly PDFName: unknown;
  readonly PDFDict: unknown;
  readonly PDFStream: unknown;
  readonly standardFontDataUrl?: string;
}
export function pdfPages(lib: PdfMakeLib, n?: number, label?: string): Promise<Uint8Array>;
export function readPdf(bytes: Uint8Array, libs: PdfReadLibs): Promise<{ pages: number; texts: string[]; overlays: string[][] }>;
```

- Réutilise : `scripts/essais/c12-pdf-navigateur.mjs:21-41` — `pdfPages(lib: { PDFDocument; StandardFonts }, n = 3, label = "RoomBoard page"): Promise<Uint8Array>` ; `readPdf(bytes: Uint8Array, libs: { pdfjs; PDFDocument; PDFName; PDFDict; PDFStream }): Promise<{ pages: number; texts: string[]; overlays: string[][] }>` (copie des octets avant pdf.js) — nouveau module `scripts/essais/fabriques/pdf.mjs`, code **déplacé, jamais copié** (`standardFontDataUrl` facultatif ajouté à `libs`, l'essai C12 le passe comme avant).
- Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Contraintes (recopiées).**
- G1 — TDD : test rouge d'abord ; aucun test désactivé, sauté ni seuil changé.
- G4 — Fichiers d'essai fabriqués (pdf-lib injecté) ; aucun fichier téléchargé, aucun PDF suivi.
- G6 — Aucune dépendance ajoutée.
- G7 — `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; `nice -n 10`.
- G8 — Worktree préparé comme ci-dessus.
- G9 — Auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers un par un ; aucun `--force`.

**Interdits.** Ne rien changer d'autre dans `c12-pdf-navigateur.mjs` (scénario, oracles, octets fabriqués identiques).
Ne toucher ni `crates/roomboard-formats/tests/fixtures/` ni les polices. Pas de réécriture d'autres lignes de
`THIRD_PARTY_NOTICES.md`.

**Terminé quand.** Test des fabriques vert ; `node --check scripts/essais/c12-pdf-navigateur.mjs` sans erreur ;
`grep -c "threePages\|readBack" scripts/essais/c12-pdf-navigateur.mjs` → `0` ;
`grep -c "Open Font License\|OFL-1.1" THIRD_PARTY_NOTICES.md` → `0` ; un commit.

**Étapes.**

- [ ] **1. Test rouge** — créer `apps/web/src/platform/fabrique-pdf.test.ts` :

```ts
import { PDFDict, PDFDocument, PDFName, PDFStream, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { pdfPages, readPdf } from "../../../../scripts/essais/fabriques/pdf.mjs";

const FONTS = new URL("../../node_modules/pdfjs-dist/standard_fonts/", import.meta.url).href;

describe("fabriques PDF (cli-lot3, D43)", () => {
  it("fabriques PDF — pdfPages : 3 pages 612 × 792 ; readPdf : 3 pages, « RoomBoard page i » sur la page i, aucune superposition, tampon non détaché", async () => {
    const bytes = await pdfPages({ PDFDocument, StandardFonts });
    const size = bytes.byteLength;
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const r = await readPdf(bytes, { pdfjs, PDFDocument, PDFName, PDFDict, PDFStream, standardFontDataUrl: FONTS });
    expect(r.pages).toBe(3);
    expect(r.texts.map((t, i) => t.includes(`RoomBoard page ${i + 1}`))).toEqual([true, true, true]);
    expect(r.overlays).toEqual([[], [], []]);
    expect(bytes.byteLength).toBe(size);
    expect((await PDFDocument.load(bytes)).getPage(0).getSize()).toEqual({ width: 612, height: 792 });
  });
  it("fabriques PDF — pdfPages(lib, 501, « P ») : 501 pages, libellé donné", async () => {
    const bytes = await pdfPages({ PDFDocument, StandardFonts }, 501, "P");
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(501);
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const one = await pdfPages({ PDFDocument, StandardFonts }, 1, "P");
    expect((await readPdf(one, { pdfjs, PDFDocument, PDFName, PDFDict, PDFStream, standardFontDataUrl: FONTS })).texts[0]).toContain("P 1");
  });
});
```

- [ ] **2. Vérifier le rouge** — `cd ~/projets/roomboard-wt/cli-lot3--T3 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/platform/fabrique-pdf.test.ts 2>&1 | tail -15`
  Attendu : échec (`Failed to resolve import "../../../../scripts/essais/fabriques/pdf.mjs"`).

- [ ] **3. Écrire `scripts/essais/fabriques/pdf.mjs`** (corps déplacé de `c12-pdf-navigateur.mjs:21-41`) :

```js
// Fabriques des PDF d'essai (cadrage cli-lot3, D43), déplacées de c12-pdf-navigateur.mjs : pdf-lib et pdf.js injectés,
// aucun PDF suivi ni téléchargé. Lues par c12-pdf-navigateur.mjs, les tests de apps/cli et cli-essai.mjs.

/** PDF de `n` pages 612 × 792, « <label> i » en Helvetica 36 sur la page i. */
export async function pdfPages(lib, n = 3, label = "RoomBoard page") {
  const d = await lib.PDFDocument.create();
  const font = await d.embedFont(lib.StandardFonts.Helvetica);
  for (let i = 1; i <= n; i++) d.addPage([612, 792]).drawText(`${label} ${i}`, { x: 72, y: 700, size: 36, font });
  return d.save();
}

/**
 * Relecture : pages et texte par pdf.js (sur une copie : pdf.js détache le tampon reçu, H34), sous-types des XObject de
 * chaque page par pdf-lib (`/Form` : superposition vectorielle ; `/Image` : repli PNG).
 */
export async function readPdf(bytes, libs) {
  const { pdfjs, PDFDocument, PDFName, PDFDict, PDFStream, standardFontDataUrl } = libs;
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, verbosity: 0, ...(standardFontDataUrl === undefined ? {} : { standardFontDataUrl }) });
  const doc = await task.promise;
  const texts = [];
  for (let i = 1; i <= doc.numPages; i++) texts.push((await (await doc.getPage(i)).getTextContent()).items.map((it) => it.str ?? "").join(""));
  const pages = doc.numPages;
  await task.destroy();
  const overlays = (await PDFDocument.load(bytes)).getPages().map((p) => {
    const xo = p.node.Resources()?.lookupMaybe(PDFName.of("XObject"), PDFDict);
    return xo ? xo.keys().map((k) => String(xo.lookup(k, PDFStream).dict.get(PDFName.of("Subtype")))) : [];
  });
  return { pages, texts, overlays };
}
```

  Et `scripts/essais/fabriques/pdf.d.mts` :

```ts
// Types des fabriques PDF (cadrage cli-lot3, D43), `pdf.mjs`. Formes minimales : pdf-lib et pdf.js réels y entrent.
export interface PdfMakeLib {
  readonly PDFDocument: { create(): Promise<unknown> };
  readonly StandardFonts: { readonly Helvetica: unknown };
}
export interface PdfReadLibs {
  readonly pdfjs: { getDocument(src: object): { readonly promise: Promise<unknown>; destroy(): Promise<void> } };
  readonly PDFDocument: { load(bytes: Uint8Array): Promise<unknown> };
  readonly PDFName: unknown;
  readonly PDFDict: unknown;
  readonly PDFStream: unknown;
  /** URL `file:` du dossier `standard_fonts/` de pdfjs-dist (texte des polices standard). */
  readonly standardFontDataUrl?: string;
}
/** PDF de `n` pages (3) 612 × 792, « <label> i » (« RoomBoard page ») sur la page i. */
export function pdfPages(lib: PdfMakeLib, n?: number, label?: string): Promise<Uint8Array>;
/** Pages, texte par page, sous-types des XObject par page. */
export function readPdf(bytes: Uint8Array, libs: PdfReadLibs): Promise<{ pages: number; texts: string[]; overlays: string[][] }>;
```

- [ ] **4. Vérifier le vert** — même commande qu'en 2 : `Test Files  1 passed`, `Tests  2 passed`.

- [ ] **5. `c12-pdf-navigateur.mjs`** — supprimer les fonctions `threePages` et `readBack` (lignes 21-41) ; ajouter
  l'import `import { pdfPages, readPdf } from "./fabriques/pdf.mjs";` après celui de `./commun.mjs`, et à la place des
  fonctions supprimées :

```js
/** Bibliothèques de relecture (fabriques PDF, cli-lot3 D43) : pdf.js et pdf-lib d'apps/web, polices de pdfjs-dist. */
async function readLibs() {
  const pdfjs = await import(pathToFileURL(web.resolve("pdfjs-dist/legacy/build/pdf.mjs")).href);
  return { pdfjs, PDFDocument, PDFName, PDFDict, PDFStream, standardFontDataUrl: pathToFileURL(join(dirname(web.resolve("pdfjs-dist/package.json")), "standard_fonts") + sep).href };
}
```

  Ligne 88 : `await threePages()` → `await pdfPages({ PDFDocument, StandardFonts })` ; ligne 119 :
  `await readBack(await readFile(exported))` → `await readPdf(await readFile(exported), await readLibs())`.
  Contrôle : `node --check scripts/essais/c12-pdf-navigateur.mjs && grep -c "threePages\|readBack" scripts/essais/c12-pdf-navigateur.mjs` → `0`.

- [ ] **6. `THIRD_PARTY_NOTICES.md`** — remplacer (Edit exact) :

  ancien (226-232) :
```
Ressources de `pdfjs-dist` copiées dans `dist/pdfjs/` avec leurs textes de licence : polices Liberation Sans
(`standard_fonts/LICENSE_LIBERATION`, SIL Open Font License 1.1), polices Foxit (`standard_fonts/LICENSE_FOXIT`,
```
  nouveau :
```
Ressources de `pdfjs-dist` copiées dans `dist/pdfjs/` avec leurs textes de licence : polices Liberation Sans
(`standard_fonts/LICENSE_LIBERATION`, licence Red Hat de Liberation 1.07.4 : GNU General Public License v2 avec
exception de police), polices Foxit (`standard_fonts/LICENSE_FOXIT`,
```
  ancien :
```
copié. Textes : MIT (https://opensource.org/licenses/MIT), Apache-2.0 (https://www.apache.org/licenses/LICENSE-2.0),
OFL-1.1 (https://openfontlicense.org).
```
  nouveau :
```
copié. Textes : MIT (https://opensource.org/licenses/MIT), Apache-2.0 (https://www.apache.org/licenses/LICENSE-2.0),
GPL-2.0 avec exception de police (texte complet dans `standard_fonts/LICENSE_LIBERATION`).

La CLI (`apps/cli`) ne copie pas ces polices : elle les lit à l'exécution dans le paquet `pdfjs-dist` installé et les
embarque dans les PDF annotés qu'elle écrit, sous l'exception de police (cadrage cli-lot3, D48). Remplacer Liberation
par une police sous OFL dans la page et la CLI reste à décider.
```
  ancien (309-315) :
```
`pdfjs-dist/standard_fonts/` (Liberation Sans, SIL Open Font License 1.1), texte joint à côté
```
  nouveau :
```
`pdfjs-dist/standard_fonts/` (Liberation Sans, licence Red Hat 1.07.4 : GNU General Public License v2 avec exception
de police), texte joint à côté
```
  ancien :
```
Unicode-3.0 (https://www.unicode.org/license.txt), BSL-1.0 (https://www.boost.org/LICENSE_1_0.txt), OFL-1.1
(https://openfontlicense.org).
```
  nouveau :
```
Unicode-3.0 (https://www.unicode.org/license.txt), BSL-1.0 (https://www.boost.org/LICENSE_1_0.txt), GPL-2.0 avec
exception de police (`tests/fixtures/LICENSE_LIBERATION`).
```
  Contrôle : `grep -c "Open Font License\|OFL-1.1" THIRD_PARTY_NOTICES.md` → `0` ; `grep -c "exception de police" THIRD_PARTY_NOTICES.md` → `5`.

- [ ] **7. Commit**

```bash
git -C ~/projets/roomboard-wt/cli-lot3--T3 add scripts/essais/fabriques/pdf.mjs scripts/essais/fabriques/pdf.d.mts scripts/essais/c12-pdf-navigateur.mjs apps/web/src/platform/fabrique-pdf.test.ts THIRD_PARTY_NOTICES.md
git -C ~/projets/roomboard-wt/cli-lot3--T3 commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -F - <<'EOF'
test(scripts): move PDF fixtures to fabriques/pdf.mjs; fix Liberation font licence in notices

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

<a id="tache-t4"></a>

### Tâche T4 — CLI : `pdf-node.ts`, `quiet.ts`, `pdfjs-dist`

**Objectif.** Le module Node du PDF (DA12, DA13, D32-D34, D37, D38, D48) : pdf.js joué en processus sans rendu,
krilla par `inlineWorker` sur `pdfJobReply` avec la règle de panique D29, superposition vectorielle sans canvas
(mesure, couleurs, polices lues dans `pdfjs-dist` installé), et le filtre des trois avertissements de chargement de
pdf.js, importé en premier par `bin.ts`. `pdfjs-dist` 6.5.438 devient une dépendance de `apps/cli`. Scénarios servis :
S2 (écriture vectorielle), S4 (panique, refus sans repli).

**Patrons à ne pas reprendre.**
- Copier les polices dans `apps/cli/dist/` par un greffon de `vite.config.ts` (comme `copyWasm`) ou les lire par
  `fetch` comme l'amorce (`apps/web/src/main.ts:279-289`) : D48 interdit tout nouvel exemplaire ; elles se lisent dans
  le paquet installé (`createRequire(import.meta.url).resolve("pdfjs-dist/package.json")`).
- Régler `GlobalWorkerOptions.workerSrc`/`workerPort` comme la page (`apps/web/src/platform/pdf-load.ts:39-41`) : Node
  n'a pas de Worker de page ; la voie prévue par pdf.js est `globalThis.pdfjsWorker` (le même module que
  `apps/web/src/platform/pdf-worker.ts:5`).
- Appeler `write_pdf_pages` directement ou recopier `getDocument`/`isPasswordError` : passer par `pdfJobReply` et
  `pdfjsBinding` (T2).
- Filtrer stderr autour de l'`import()` de pdf.js : dans le fichier construit, les modules importés dynamiquement sont
  évalués au démarrage (`inlineDynamicImports`, essai 3 du cadrage) ; seul un module importé **en premier** par
  `bin.ts` les voit.
Chemin de référence du câblage : `apps/cli/src/board-node.ts:20-36` (`nodeBoardPorts` : `formats()` hors du `try`,
`onPanic` puis relance).

**Worktree.** Isolé : `~/projets/roomboard-wt/cli-lot3--T4`, créé après la fusion de T2 et T3. Préparer (G8) :
`cd ~/projets/roomboard-wt/cli-lot3--T4 && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r /home/adminjd/projets/roomboard-wt/cli-lot3/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot3/apps/web/src/wasm-formats apps/web/src/`.

**Fichiers.**
- Créer : `apps/cli/src/pdf-node.ts`, `apps/cli/src/pdf-node.test.ts`
- Créer : `apps/cli/src/quiet.ts`, `apps/cli/src/quiet.test.ts`
- Créer : `apps/cli/src/pdfjs-worker.d.ts`
- Modifier : `apps/cli/src/bin.ts:1-3`
- Modifier : `apps/cli/package.json`, `pnpm-lock.yaml` (par `pnpm install`, jamais à la main)

**Interfaces.**
- Consomme (T2) : `pdfjsBinding(pdfjs: PdfjsModule, options: Record<string, unknown>): PdfjsBinding`
  (`apps/web/src/platform/pdf-load.ts`) ; `pdfJobReply(mod: FormatsBinding, job: PdfJob): WorkerReply`, `PdfJob`,
  `PDF_WRITER_MISSING_MESSAGE` (`apps/web/src/platform/container.ts`) ; `vectorPainter(doc: CoreDocument)`
  (`apps/web/src/app/pdf-overlay-vector.ts`). (T3) : `pdfPages(lib, n?, label?)` (`scripts/essais/fabriques/pdf.mjs`).
- Produit (exact, utilisé par T5, T6) :

```ts
// apps/cli/src/pdf-node.ts
export const NO_RENDER_MESSAGE = "rendu en image indisponible dans la CLI";
export const NO_RASTER_SUFFIX = " (repli en image indisponible dans la CLI)";
export function loadNodePdfjs(): Promise<PdfjsBinding>;
export const NO_RENDER: PdfDom;
export function nodePdfEngine(): PdfEngine;
export function nodeMeasureContext(): Pick<CanvasRenderingContext2D, "fillStyle" | "font" | "measureText">;
export function pdfjsFontsDir(): string;
export function nodePdfFonts(dir?: string): () => Promise<readonly Uint8Array[]>;
export function nodePdfWriter(formats: () => Promise<FormatsBinding>, onPanic: () => void): PdfWriter;
export function nodeOverlay(doc: CoreDocument, assets: Pick<AssetStore, "get">, write: PdfWriter, fonts?: () => Promise<readonly Uint8Array[]>): OverlayProducer;
// apps/cli/src/quiet.ts
export const PDFJS_WARNINGS: readonly string[];
export function quietWarn(warn: (...a: unknown[]) => void): (...a: unknown[]) => void;
```

- Réutilise : `apps/web/src/platform/pdf-render.ts:125` — `createPdfEngine(load: () => Promise<PdfjsBinding>, dom: PdfDom): PdfEngine` ; `PdfFile.pageCount`, `pageSize(i)`, `destroy()` (réutiliser, par `nodePdfEngine()` = `createPdfEngine(loadNodePdfjs, NO_RENDER)`).
- Réutilise : `pdfjs-dist/legacy/build/pdf.worker.mjs` (même module que `apps/web/src/platform/pdf-worker.ts:5`), voie `globalThis.pdfjsWorker` de pdf.js — nouveau module `apps/cli/src/pdf-node.ts` : `loadNodePdfjs(): Promise<PdfjsBinding>` (= `pdfjsBinding(pdfjs, { verbosity: 0 })` après la pose de `pdfjsWorker`) ; `NO_RENDER: PdfDom` (`tile` lève) ; `nodePdfEngine(): PdfEngine`.
- Réutilise : — (nouveau module) `apps/cli/src/quiet.ts` — `quietWarn(warn: (...a: unknown[]) => void): (...a: unknown[]) => void` (retire un appel dont le premier argument commence par l'un des trois préfixes de D34) et, à l'import, `console.warn = quietWarn(console.warn)`.
- Réutilise : `apps/web/src/app/pdf-overlay-vector.ts:85` — `createVectorOverlay(deps: VectorOverlayDeps): OverlayProducer` (réutiliser, dans `nodeOverlay`).
- Réutilise : `apps/web/src/app/pdf-overlay-vector.ts` (T2) — `vectorPainter(doc: CoreDocument): VectorOverlayDeps["painter"]` (réutiliser, dans `nodeOverlay`).
- Réutilise : `apps/web/src/platform/one-shot-worker.ts:55` et `apps/web/src/app/pdf-overlay-vector.ts:54` — `inlineWorker(handle)` ; `workerPdfWriter(spawn)` (réutiliser).
- Réutilise : patron `apps/cli/src/board-node.ts:22` — `nodePdfWriter(formats: () => Promise<FormatsBinding>, onPanic: () => void): PdfWriter` = `workerPdfWriter(inlineWorker(async (m) => { const mod = await formats(); try { return pdfJobReply(mod, m as PdfJob) } catch (e) { onPanic(); throw e } }))` (nouveau, câblage ; `formats()` hors du `try` comme `nodeBoardPorts` : un module absent n'est pas une panique).
- Réutilise : `apps/web/src/engine/render/webgl2.ts:23` (`tryParseColor`) et `apps/web/src/engine/text-layout.ts:41-42` (`measureOrFallback`) — `nodeMeasureContext(): Pick<CanvasRenderingContext2D, "fillStyle" | "font" | "measureText">` (`fillStyle` : `#rrggbb` si alpha 1, sinon `rgba(r, g, b, a)` ; illisible : précédente gardée ; `measureText(t).width` = `measureOrFallback(null)(t, taille lue dans font)`) (nouveau).
- Réutilise : `apps/web/src/app/pdf-overlay-vector.ts:24` (`PDF_FONT_FILES`) — `nodePdfFonts(): () => Promise<readonly Uint8Array[]>` (dossier `standard_fonts/` du `pdfjs-dist` résolu par `createRequire(import.meta.url)`, lecture une fois ; absente : `police <f> absente`) (nouveau ; paramètre `dir` facultatif pour le test de l'absence, H31).
- Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne ci-dessus.

**Contraintes (recopiées).**
- G1 — TDD : test rouge d'abord ; aucun test désactivé, sauté ni seuil changé ; délai : rejoué une fois.
- G2 — Aucune copie (0281, D32) : pdf.js appelé en processus par le même code que la page (`pdfjsBinding`, `createPdfEngine`, `createVectorOverlay`, `pdfJobReply`), jamais par une copie ; le Worker se remplace par `inlineWorker`.
- G3 — Polices lues à l'exécution dans `pdfjs-dist` installé, jamais copiées (ni dans `apps/cli/dist/`, ni dans le dépôt) ; `apps/cli/vite.config.ts` inchangé.
- G4 — PDF d'essai fabriqués par `pdfPages` ; aucun fichier téléchargé ; écritures sous `tmpDir()`.
- G5 — Aucune ligne Rust ; tailles Wasm inchangées (1 374 215 o ≤ 1 572 864 o ; 2 794 511 o ≤ 3 145 728 o).
- G6 — Seule dépendance ajoutée : `pdfjs-dist` **6.5.438 exact** en `dependencies` de `apps/cli` (Apache-2.0) ; aucune (A/L)GPL, aucun paquet système ; `@napi-rs/canvas` ni ajouté ni requis.
- G7 — `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; `nice -n 10` ; cargo `-j 4` s'il sert.
- G8 — Worktree préparé comme ci-dessus.
- G9 — Auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers un par un ; aucun `--force`.
- G11 — stderr réservé à `{"error":…}` : aucun `console.log`/`console.warn` ajouté ; seul `quiet.ts` touche `console.warn`.

**Interdits.** Ne pas toucher `vite.config.ts`, `contract.ts`, `session.ts`, `main.ts`, ni aucun fichier de
`apps/web`. Aucun rendu en image, aucun canvas, aucune dépendance native. Ne pas filtrer d'autre avertissement que
les trois préfixes.

**Terminé quand.** `pdf-node.test.ts` et `quiet.test.ts` verts (≥ 14 tests) ; suite de la CLI verte ;
`pnpm --filter @roomboard/cli build` réussi ; `find apps/cli/dist -name '*.ttf' | wc -l` → `0` ;
`node apps/cli/dist/roomboard.mjs formats 2>&1 >/dev/null | wc -c` → `0` ; `node scripts/controle-licences.mjs` code 0 ;
un commit.

**Étapes.**

- [ ] **1. Dépendance** — dans `apps/cli/package.json`, ajouter après `"scripts": {…},` :
  `"dependencies": { "pdfjs-dist": "6.5.438" },` puis
  `cd ~/projets/roomboard-wt/cli-lot3--T4 && nice -n 10 pnpm install --prefer-offline 2>&1 | tail -5`.
  Contrôle : `git diff --stat pnpm-lock.yaml` (quelques lignes, importeur `apps/cli` seulement) ;
  `ls apps/cli/node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf` existe ;
  `pnpm install --frozen-lockfile 2>&1 | tail -2` sans erreur.

- [ ] **2. Tests rouges** — créer `apps/cli/src/quiet.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import { PDFJS_WARNINGS, quietWarn } from "./quiet";

describe("quietWarn (cli-lot3, D34)", () => {
  it("quietWarn — retire les trois avertissements de chargement de pdf.js", () => {
    const warn = vi.fn();
    const q = quietWarn(warn);
    q('Warning: Cannot load "@napi-rs/canvas" package: "Error: Cannot find module \'@napi-rs/canvas\'".');
    q("Warning: Cannot polyfill `DOMMatrix`, rendering may be broken.");
    q("Warning: Cannot polyfill `Path2D`, rendering may be broken.");
    expect(warn).not.toHaveBeenCalled();
    expect(PDFJS_WARNINGS).toEqual(['Warning: Cannot load "@napi-rs/canvas"', "Warning: Cannot polyfill `DOMMatrix`", "Warning: Cannot polyfill `Path2D`"]);
  });
  it("quietWarn — garde tout autre avertissement (même de pdf.js), préfixe lu au début du premier argument seul", () => {
    const warn = vi.fn();
    const q = quietWarn(warn);
    q("Warning: Cannot load system font: Arial, installing it could help to improve PDF rendering.");
    q("RoomBoard : autre", 1);
    q("ligne\nWarning: Cannot polyfill `Path2D`, rendering may be broken.");
    q({ objet: true });
    expect(warn.mock.calls).toEqual([
      ["Warning: Cannot load system font: Arial, installing it could help to improve PDF rendering."],
      ["RoomBoard : autre", 1],
      ["ligne\nWarning: Cannot polyfill `Path2D`, rendering may be broken."],
      [{ objet: true }],
    ]);
  });
  it("quietWarn — à l'import, console.warn est enveloppé", async () => {
    const original = console.warn;
    const calls: unknown[][] = [];
    console.warn = (...a: unknown[]) => void calls.push(a);
    try {
      vi.resetModules();
      await import("./quiet");
      console.warn("Warning: Cannot polyfill `Path2D`, rendering may be broken.");
      console.warn("garde");
    } finally {
      console.warn = original;
    }
    expect(calls).toEqual([["garde"]]);
  });
});
```

  Créer `apps/cli/src/pdf-node.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import { pdfPages } from "../../../scripts/essais/fabriques/pdf.mjs";
import { PDF_FONT_FILES, PDF_WRITE_FAILED_MESSAGE } from "../../web/src/app/pdf-overlay-vector";
import type { RecordedList } from "../../web/src/engine/render/record-ctx";
import type { FormatsBinding } from "../../web/src/platform/container";
import { loadPdfLib } from "../../web/src/platform/pdf-load";
import { loadNodePdfjs, NO_RASTER_SUFFIX, NO_RENDER_MESSAGE, nodeMeasureContext, nodeOverlay, nodePdfEngine, nodePdfFonts, nodePdfWriter } from "./pdf-node";
import { nodeSession } from "./session";
import { describeWasm, memoryIO, tmpDir, WEB_SRC } from "./testing";
import { loadFormats } from "./wasm-node";

const LIST: RecordedList = { ops: new Float32Array([0]), texts: [], images: [], drawn: [1] };
const formatsOf = (mod: object): (() => Promise<FormatsBinding>) => async () => mod as unknown as FormatsBinding;
const REQ = (pageId: string) => ({ pageId, rect: { x0: 0, y0: 0, x1: 1920, y1: 1080 }, box: { w: 842, h: 473.625 } });

describe("pdf.js en processus (cli-lot3, D32, D33)", () => {
  it("nodePdfEngine — 3 pages 612 × 792 lues ; worker de pdf.js posé sur globalThis.pdfjsWorker", async () => {
    const f = await nodePdfEngine().open(new Blob([(await pdfPages(await loadPdfLib(), 3)) as BlobPart]));
    try {
      expect(f.pageCount).toBe(3);
      expect(await f.pageSize(1)).toEqual({ w: 612, h: 792 });
    } finally {
      f.destroy();
    }
    expect(typeof (globalThis as { pdfjsWorker?: { WorkerMessageHandler?: unknown } }).pdfjsWorker?.WorkerMessageHandler).toBe("function");
  });
  it("nodePdfEngine — renderTile lève « rendu en image indisponible dans la CLI » : aucun canvas", async () => {
    const f = await nodePdfEngine().open(new Blob([(await pdfPages(await loadPdfLib(), 1)) as BlobPart]));
    try {
      await expect(f.renderTile(0, 1, { x: 0, y: 0, w: 8, h: 8 }, new AbortController().signal)).rejects.toThrow(NO_RENDER_MESSAGE);
    } finally {
      f.destroy();
    }
  });
  it("nodePdfEngine — PDF invalide (%PDF-1.4 %%EOF) : open rejette ; isPasswordError faux sur une erreur ordinaire", async () => {
    await expect(nodePdfEngine().open(new Blob(["%PDF-1.4\n%%EOF\n"]))).rejects.toThrow();
    expect((await loadNodePdfjs()).isPasswordError(new Error("x"))).toBe(false);
  });
});

describe("mesure sans canvas (D37, H25, H26)", () => {
  it("nodeMeasureContext — fillStyle normalisé : #F00 → #ff0000 ; « red » illisible → précédente ; rgba gardée ; #rrggbbaa → rgba", () => {
    const m = nodeMeasureContext();
    expect(m.fillStyle).toBe("#000000");
    m.fillStyle = "#F00";
    expect(m.fillStyle).toBe("#ff0000");
    m.fillStyle = "red";
    expect(m.fillStyle).toBe("#ff0000");
    m.fillStyle = "rgba(0, 128, 255, 0.5)";
    expect(m.fillStyle).toBe("rgba(0, 128, 255, 0.5)");
    m.fillStyle = "#11223380";
    expect(m.fillStyle).toBe(`rgba(17, 34, 51, ${0x80 / 255})`);
  });
  it("nodeMeasureContext — measureText : 0,6 × taille lue dans font × longueur", () => {
    const m = nodeMeasureContext();
    m.font = 'bold 20px "Atkinson Hyperlegible", sans-serif';
    expect(m.measureText("abc").width).toBeCloseTo(36);
  });
});

describe("polices lues dans pdfjs-dist installé (D48, H31)", () => {
  it("nodePdfFonts — quatre faces TrueType lues une fois (même promesse au second appel)", async () => {
    const fonts = nodePdfFonts();
    const first = fonts();
    expect(fonts()).toBe(first);
    const faces = await first;
    expect(faces).toHaveLength(PDF_FONT_FILES.length);
    for (const f of faces) expect([...f.subarray(0, 4)]).toEqual([0, 1, 0, 0]);
  });
  it("nodePdfFonts — dossier sans police : « police … absente », relue au prochain appel", async () => {
    const fonts = nodePdfFonts(tmpDir());
    await expect(fonts()).rejects.toThrow(/^police LiberationSans-[A-Za-z]+\.ttf absente$/);
    await expect(fonts()).rejects.toThrow(/absente/);
  });
});

describe("krilla en processus (D38, D29)", () => {
  it("nodePdfWriter — octets du module rendus ; onPanic non appelé", async () => {
    const onPanic = vi.fn();
    const write = nodePdfWriter(formatsOf({ write_pdf_pages: () => new Uint8Array([1, 2, 3]) }), onPanic);
    expect(await write(LIST, [new Uint8Array([9])], [])).toEqual(new Uint8Array([1, 2, 3]));
    expect(onPanic).not.toHaveBeenCalled();
  });
  it("nodePdfWriter — erreur ordinaire du module : rejet avec son message, onPanic non appelé", async () => {
    const onPanic = vi.fn();
    const write = nodePdfWriter(formatsOf({ write_pdf_pages: () => { throw new Error("page refusée"); } }), onPanic);
    await expect(write(LIST, [], [])).rejects.toThrow("page refusée");
    expect(onPanic).not.toHaveBeenCalled();
  });
  it("nodePdfWriter — panique (RuntimeError) : rejet « écriture du PDF interrompue », onPanic une fois", async () => {
    const onPanic = vi.fn();
    const write = nodePdfWriter(formatsOf({ write_pdf_pages: () => { throw new WebAssembly.RuntimeError("unreachable"); } }), onPanic);
    await expect(write(LIST, [], [])).rejects.toThrow(PDF_WRITE_FAILED_MESSAGE);
    expect(onPanic).toHaveBeenCalledTimes(1);
  });
  it("nodePdfWriter — module sans écrivain : « module de l'écrivain PDF indisponible »", async () => {
    await expect(nodePdfWriter(formatsOf({}), vi.fn())(LIST, [], [])).rejects.toThrow("module de l'écrivain PDF indisponible");
  });
});

describeWasm("superposition vectorielle de la CLI sur le vrai module (D37)", () => {
  async function drawn() {
    const s = await nodeSession(memoryIO());
    const tab = s.newTab().session;
    await s.exec(JSON.stringify({ type: "AddShape", page: "$page:0", shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style: { color: "#1e40af", width: 4 }, fill: null }));
    await s.exec(JSON.stringify({ type: "SetText", page: "$page:0", id: null, x: 400, y: 100, content: "Annotation CLI", color: "red", size: 36, boxWidth: 600, boxHeight: 45 }));
    return { tab, page: tab.doc.pageIds()[0]! };
  }
  it("nodeOverlay — un rectangle et un texte (couleur nommée, H25) : une page PDF krilla, onPanic non appelé", async () => {
    const { tab, page } = await drawn();
    const onPanic = vi.fn();
    const out = await nodeOverlay(tab.doc, tab.assets, nodePdfWriter(loadFormats(WEB_SRC), onPanic)).pages([REQ(page)]);
    expect(out).toHaveLength(1);
    const o = out[0]!;
    expect(o.kind).toBe("pdf");
    expect(new TextDecoder().decode(o.bytes.subarray(0, 5))).toBe("%PDF-");
    expect(onPanic).not.toHaveBeenCalled();
  });
  it("nodeOverlay — écrivain en échec : « superposition vectorielle impossible (krilla) (repli en image indisponible dans la CLI) »", async () => {
    const { tab, page } = await drawn();
    const failing = async (): Promise<Uint8Array> => {
      throw new Error("krilla");
    };
    await expect(nodeOverlay(tab.doc, tab.assets, failing).pages([REQ(page)])).rejects.toThrow(`superposition vectorielle impossible (krilla)${NO_RASTER_SUFFIX}`);
  });
});
```

- [ ] **3. Vérifier le rouge** — `cd ~/projets/roomboard-wt/cli-lot3--T4 && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/pdf-node.test.ts src/quiet.test.ts 2>&1 | tail -15`
  Attendu : échec (`Failed to resolve import "./pdf-node"`, `"./quiet"`).

- [ ] **4. Écrire `apps/cli/src/quiet.ts`** :

```ts
/**
 * Avertissements de chargement de pdf.js hors de stderr (cadrage cli-lot3, D34) : en Node, pdf.js écrit à son
 * évaluation trois lignes `console.warn` (`@napi-rs/canvas` absent, `DOMMatrix` et `Path2D` sans polyfill), sans effet ici
 * (aucun rendu, D33). Dans le fichier construit, pdf.js est évalué au démarrage (`inlineDynamicImports`) : ce module
 * est importé en premier par `bin.ts`. Seuls ces trois préfixes, lus au début du premier argument, sont retirés ;
 * tout autre avertissement passe. stderr reste réservé à la ligne `{"error":…}` (DA2). Garde : contrôle « stderr vide »
 * de `scripts/essais/cli-essai.mjs` sur le fichier construit (H28).
 */
export const PDFJS_WARNINGS: readonly string[] = ['Warning: Cannot load "@napi-rs/canvas"', "Warning: Cannot polyfill `DOMMatrix`", "Warning: Cannot polyfill `Path2D`"];

export function quietWarn(warn: (...a: unknown[]) => void): (...a: unknown[]) => void {
  return (...a) => {
    const first = a[0];
    if (typeof first === "string" && PDFJS_WARNINGS.some((p) => first.startsWith(p))) return;
    warn(...a);
  };
}

console.warn = quietWarn(console.warn.bind(console));
```

- [ ] **5. Écrire `apps/cli/src/pdfjs-worker.d.ts`** :

```ts
// Types du module de worker de pdf.js (pdfjs-dist 6.5.438 n'en livre pas) : la CLI le pose sur `globalThis.pdfjsWorker`
// (cadrage cli-lot3, D32, D44).
declare module "pdfjs-dist/legacy/build/pdf.worker.mjs" {
  export const WorkerMessageHandler: unknown;
}
```

- [ ] **6. Écrire `apps/cli/src/pdf-node.ts`** :

```ts
/**
 * PDF dans le processus de la CLI (cadrage cli-lot3, D32, D33, D37, D38, D39, D48, DA12, DA13, DA15).
 * - pdf.js : le module de worker de pdf.js (celui que `platform/pdf-worker.ts` charge dans le Worker de la page) posé sur
 *   `globalThis.pdfjsWorker`, voie que pdf.js prévoit pour tourner dans le processus ; lien par `pdfjsBinding` (partagé
 *   avec la page) ; moteur par `createPdfEngine` avec un `PdfDom` qui lève : aucun canvas, aucun rendu (D33).
 * - krilla : `pdfJobReply` (corps du Worker de la page) joué par `inlineWorker` ; une panique (`RuntimeError`, seule
 *   relancée) appelle `onPanic` (D29 : plus aucune écriture dans le processus). Patron : `board-node.ts`.
 * - Superposition : `createVectorOverlay` du produit, peintre `vectorPainter`, mesure sans canvas (couleurs par
 *   `tryParseColor`, largeur par `measureOrFallback(null)`, H25, H26), polices Liberation lues dans `pdfjs-dist`
 *   installé, jamais copiées (D48). Pas de repli en image : un échec lève, suffixé de `NO_RASTER_SUFFIX` (D39).
 */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { OverlayProducer } from "../../web/src/app/pdf-export";
import { createVectorOverlay, PDF_FONT_FILES, vectorPainter, workerPdfWriter, type PdfWriter } from "../../web/src/app/pdf-overlay-vector";
import type { CoreDocument } from "../../web/src/core/api";
import type { AssetStore } from "../../web/src/core/asset-store";
import type { PdfEngine } from "../../web/src/engine/render/pdf-port";
import { tryParseColor } from "../../web/src/engine/render/webgl2";
import { measureOrFallback } from "../../web/src/engine/text-layout";
import { pdfJobReply, type FormatsBinding, type PdfJob } from "../../web/src/platform/container";
import { messageOf } from "../../web/src/platform/controller";
import { inlineWorker } from "../../web/src/platform/one-shot-worker";
import { pdfjsBinding } from "../../web/src/platform/pdf-load";
import { createPdfEngine, type PdfDom, type PdfjsBinding } from "../../web/src/platform/pdf-render";

export const NO_RENDER_MESSAGE = "rendu en image indisponible dans la CLI";
/** D39 : suffixe du message quand la page aurait pris un repli en image. */
export const NO_RASTER_SUFFIX = " (repli en image indisponible dans la CLI)";

/** pdf.js joué dans le processus (D32) : worker posé une fois, puis le module principal ; documents à `verbosity: 0`. */
export async function loadNodePdfjs(): Promise<PdfjsBinding> {
  const g = globalThis as { pdfjsWorker?: unknown };
  g.pdfjsWorker ??= await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjsBinding(pdfjs, { verbosity: 0 });
}

/** Aucun rendu en image dans la CLI (D33) : `renderTile` n'est jamais appelé ; s'il l'était, il lève. */
export const NO_RENDER: PdfDom = {
  tile() {
    throw new Error(NO_RENDER_MESSAGE);
  },
};

export function nodePdfEngine(): PdfEngine {
  return createPdfEngine(loadNodePdfjs, NO_RENDER);
}

const channel = (c: number): number => Math.round(c * 255);

/**
 * Contexte de mesure sans canvas (D37) : `fillStyle` normalisé comme un canvas (`#rrggbb` opaque, sinon
 * `rgba(r, g, b, a)`), écriture illisible (couleur nommée, H25) : la précédente reste ; `measureText` par le repli
 * `0,6 × taille × longueur` (H26), taille lue dans `font`.
 */
export function nodeMeasureContext(): Pick<CanvasRenderingContext2D, "fillStyle" | "font" | "measureText"> {
  const measure = measureOrFallback(null);
  let fill = "#000000";
  return {
    font: "10px sans-serif",
    get fillStyle(): string {
      return fill;
    },
    set fillStyle(v: string | CanvasGradient | CanvasPattern) {
      const c = typeof v === "string" ? tryParseColor(v) : null;
      if (c === null) return;
      const [r, g, b, a] = c;
      fill = a === 1 ? `#${[r, g, b].map((x) => channel(x).toString(16).padStart(2, "0")).join("")}` : `rgba(${channel(r)}, ${channel(g)}, ${channel(b)}, ${a})`;
    },
    measureText(text: string): TextMetrics {
      const size = /(\d+(?:\.\d+)?)px/.exec(this.font);
      return { width: measure(text, size === null ? 10 : Number(size[1])) } as TextMetrics;
    },
  };
}

/** Dossier `standard_fonts/` du `pdfjs-dist` installé (dépendance de la CLI, D44, D48). */
export function pdfjsFontsDir(): string {
  return join(dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json")), "standard_fonts");
}

/** Les quatre faces de `PDF_FONT_FILES`, lues une fois (D48) ; absente : « police <f> absente », relue au prochain appel. */
export function nodePdfFonts(dir?: string): () => Promise<readonly Uint8Array[]> {
  let loaded: Promise<readonly Uint8Array[]> | null = null;
  return () =>
    (loaded ??= (async () => {
      const from = dir ?? pdfjsFontsDir();
      return Promise.all(
        PDF_FONT_FILES.map(async (f) => {
          try {
            return new Uint8Array(await readFile(join(from, f)));
          } catch {
            throw new Error(`police ${f} absente`);
          }
        }),
      );
    })().catch((e: unknown) => {
      loaded = null;
      throw e;
    }));
}

/** krilla dans le processus (D38) : `pdfJobReply` par `inlineWorker` ; panique → `onPanic` (D29). */
export function nodePdfWriter(formats: () => Promise<FormatsBinding>, onPanic: () => void): PdfWriter {
  return workerPdfWriter(
    inlineWorker(async (m) => {
      const mod = await formats();
      try {
        return pdfJobReply(mod, m as PdfJob);
      } catch (e) {
        onPanic(); // seule une RuntimeError sort de pdfJobReply
        throw e;
      }
    }),
  );
}

const SHARED_FONTS = nodePdfFonts();

/**
 * Superposition vectorielle de la CLI (D37) : `createVectorOverlay` du produit ; image autre que PNG ou JPEG : lève
 * (lot 4, H24) ; tout échec lève « superposition vectorielle impossible (…) (repli en image indisponible dans la CLI) ».
 */
export function nodeOverlay(doc: CoreDocument, assets: Pick<AssetStore, "get">, write: PdfWriter, fonts: () => Promise<readonly Uint8Array[]> = SHARED_FONTS): OverlayProducer {
  const vector = createVectorOverlay({
    doc,
    assets,
    alive: () => true,
    measure: nodeMeasureContext(),
    painter: vectorPainter(doc),
    fonts,
    toPng: async (_blob, mime) => {
      throw new Error(`image ${mime} : conversion en PNG indisponible dans la CLI (lot 4)`);
    },
    write,
  });
  return {
    async pages(requests) {
      try {
        return await vector.pages(requests);
      } catch (e) {
        throw new Error(`superposition vectorielle impossible (${messageOf(e)})${NO_RASTER_SUFFIX}`);
      }
    },
  };
}
```

- [ ] **7. `bin.ts`** — insérer en première ligne de code (après le commentaire d'en-tête) :

```ts
// cli-lot3 (D34) : `quiet` d'abord, avant que le fichier construit n'évalue pdf.js (trois avertissements de chargement).
import "./quiet";
```

- [ ] **8. Vert** — `cd ~/projets/roomboard-wt/cli-lot3--T4 && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/pdf-node.test.ts src/quiet.test.ts 2>&1 | tail -15`
  Attendu : `Test Files  2 passed`, `Tests  16 passed`. Puis la suite de la CLI :
  `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli test 2>&1 | tail -15` : tous verts, aucun `FAIL `.

- [ ] **9. Build, stderr, polices, licences** —
  `nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -5` (contient `tsc --noEmit` : aucune ligne `error TS`) ;
  `node apps/cli/dist/roomboard.mjs formats 2>&1 >/dev/null | wc -c` → `0` (stderr vide, D34) ;
  `node apps/cli/dist/roomboard.mjs formats | head -c 80` (code 0) ;
  `find apps/cli/dist -name '*.ttf' | wc -l` → `0` (G3) ;
  `git diff --quiet apps/cli/vite.config.ts && echo inchangé` → `inchangé` ;
  `node scripts/controle-licences.mjs 2>&1 | tail -3` : code 0.

- [ ] **10. Commit**

```bash
git -C ~/projets/roomboard-wt/cli-lot3--T4 add apps/cli/src/pdf-node.ts apps/cli/src/pdf-node.test.ts apps/cli/src/quiet.ts apps/cli/src/quiet.test.ts apps/cli/src/pdfjs-worker.d.ts apps/cli/src/bin.ts apps/cli/package.json pnpm-lock.yaml
git -C ~/projets/roomboard-wt/cli-lot3--T4 commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -F - <<'EOF'
feat(cli): run pdf.js and krilla in process, without canvas, and quiet pdf.js load warnings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

<a id="tache-t5"></a>

### Tâche T5 — CLI : lire un PDF (session, import, `convert` depuis `.pdf`)

**Objectif.** La session lit un `.pdf` par `readPdfFile` sur `nodePdfEngine()` (D40) : `state`, `run`, `tab.open`,
`convert <x.pdf> …`, `export <x.pdf> …` le lisent ; un onglet lu d'un `.pdf` est **sans fichier** ;
`import a.roomboard x.pdf` l'ouvre en onglet (`opened`). `SessionDeps` gagne `loadPdfLib`, `pdf`, `pdfWriter`
(utilisés en T6). `.pdf` est couvert en lecture. Scénarios servis : S1, S3 (`convert x.pdf y.iwb|.ubz`).

**Worktree.** Isolé : `~/projets/roomboard-wt/cli-lot3--T5`, créé après la fusion de T1 et T4. Préparer (G8) :
`cd ~/projets/roomboard-wt/cli-lot3--T5 && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r /home/adminjd/projets/roomboard-wt/cli-lot3/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot3/apps/web/src/wasm-formats apps/web/src/`.

**Fichiers.**
- Modifier : `apps/cli/src/session.ts` (imports 10-31, `SessionDeps` 40-52, `Session` 78-100, `readDoc` 154-166, `open` 167-172, + `openPdf`, objet `session` 295-308, `TestableIO` 341-344, `nodeSession` 346-375)
- Modifier : `apps/cli/src/importer.ts:101-111`
- Modifier : `apps/cli/src/exporter.ts:59` (`CONVERT_SOURCES`)
- Modifier : `apps/cli/src/formats.ts:160`
- Modifier : `apps/cli/src/testing.ts` (`memoryIO`, + `pdfFixture`, `readPdfBack`)
- Créer : `apps/cli/src/pdf.test.ts`
- Modifier (tests du code 3 de `.pdf` à l'import) : `formats.test.ts:20,29,37`, `main.test.ts:17`, `import.test.ts:57-72`, `convert.test.ts:116,120`, `guards.test.ts:49,55`

**Interfaces.**
- Consomme : (T1) `readPdfFile(file: PdfSource, deps: PdfReadDeps): Promise<PdfRead>` (`apps/web/src/app/pdf-convert.ts`) ;
  (T4) `nodePdfEngine(): PdfEngine`, `nodePdfWriter(formats, onPanic): PdfWriter`, `loadNodePdfjs()`, `pdfjsFontsDir()`
  (`apps/cli/src/pdf-node.ts`) ; (T3) `pdfPages`, `readPdf` (`scripts/essais/fabriques/pdf.mjs`).
- Produit (exact, utilisé par T6) :

```ts
// apps/cli/src/session.ts
export function isPdfPath(path: string): boolean; // formatOf(path)?.handler === "pdf"
export interface SessionDeps { /* … champs existants … */ loadPdfLib(): Promise<PdfLib>; readonly pdf: PdfEngine; readonly pdfWriter: PdfWriter }
export interface Session { /* … */ openPdf(file: { readonly name: string; readonly blob: Blob }): Promise<boolean> }
export interface TestableIO extends CliIO { readonly formats?: () => Promise<FormatsBinding>; readonly pdfLib?: () => Promise<PdfLib> }
// apps/cli/src/testing.ts
export function memoryIO(input?: readonly string[], env?: Readonly<Record<string, string>>, wasmDir?: URL, formats?: () => Promise<FormatsBinding>, pdfLib?: () => Promise<PdfLib>): MemoryIO;
export function pdfFixture(dir: string, name?: string, n?: number): Promise<string>;
export function readPdfBack(path: string): Promise<{ pages: number; texts: string[]; overlays: string[][] }>;
```

- Réutilise : `apps/web/src/app/pdf-convert.ts` (T1) — `readPdfFile({ name, blob }, { core, pdf, makeAssets })` (réutiliser ; rejet = message complet du produit, mis en `CliError("format", …)`).
- Réutilise : `apps/web/src/platform/pdf-load.ts:55` — `loadPdfLib()` ; dans la CLI par `SessionDeps.loadPdfLib` (`io.pdfLib ?? loadPdfLib`) (réutiliser).
- Réutilise : `apps/web/src/platform/import.ts:68,263` — `ImportDeps.openPdf(file): Promise<boolean>` → `session.openPdf` (réutiliser).
- Réutilise : `apps/cli/src/session.ts:154,167` — `readDoc` : branche `pdf` par `readPdfFile` ; `open` : `file` nul pour un `.pdf` (comme un tableau) ; `Session.openPdf(file: { readonly name: string; readonly blob: Blob }): Promise<boolean>` (étendre).
- Réutilise : `apps/cli/src/formats.ts:11,54,101` — `.pdf` couvert en lecture (étendre ; écriture et `LOT_LIVRE` en T6).
- Réutilise : `apps/web/src/app/board-io.ts:569,664` par `writeBoardFile` (via `exportBoardFile`, inchangé) — avis « fonds PDF non exportés » d'un `convert x.pdf y.iwb` (réutiliser).
- Réutilise : `scripts/essais/fabriques/pdf.mjs` (T3) — `pdfPages(lib, n?, label?)`, `readPdf(bytes, libs)` (réutiliser, dans `testing.ts`).
- Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne ci-dessus.

**Contraintes (recopiées).**
- G1 — TDD : test rouge d'abord ; aucun test désactivé, sauté ni seuil changé ; délai : rejoué une fois.
- G2 — Aucune copie (0281, D32) : lecture par `readPdfFile` sur `nodePdfEngine()` seulement.
- G4 — PDF fabriqués par `pdfFixture` (fabriques) ; aucun fichier téléchargé ; écritures sous `tmpDir()`.
- G5 — Aucune ligne Rust ; tailles Wasm inchangées (plafonds 1 572 864 o et 3 145 728 o).
- G7 — `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; `nice -n 10`.
- G8 — Worktree préparé comme ci-dessus.
- G9 — Auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers un par un ; aucun `--force`.
- G10 — `.pdf` change sa ligne de `FORMAT_LOTS` (lecture couverte) et ses tests.
- G11 — Aucun `console.log`/`console.warn` ajouté.

**Interdits.** Pas d'écriture PDF ici (`.pdf` reste une sortie refusée en code 3 jusqu'à T6). Règle D23 inchangée
(`documentTarget`). `tab.list` inchangé pour tout autre format. Ne pas toucher `main.ts`.

**Terminé quand.** Suite de la CLI verte sous `ROOMBOARD_WASM_REQUIRED=1` ; `pdf.test.ts` : ≥ 5 tests `S1 —`,
1 test `S3 —`, `RF1 —`, `RF2 —` ; `tsc --noEmit` de la CLI sans erreur ; un commit.

**Étapes.**

- [ ] **1. Aides de test** — `apps/cli/src/testing.ts` : imports `import { pathToFileURL } from "node:url";` (à côté de
  `fileURLToPath`), `sep` ajouté à l'import de `node:path`, et :

```ts
import { pdfPages, readPdf } from "../../../scripts/essais/fabriques/pdf.mjs";
import type { PdfLib } from "../../web/src/app/pdf-export";
import { loadPdfLib } from "../../web/src/platform/pdf-load";
import { loadNodePdfjs, pdfjsFontsDir } from "./pdf-node";
```

  `memoryIO` gagne un cinquième paramètre `pdfLib?: () => Promise<PdfLib>` et, sous `...(formats === undefined ? {} : { formats }),` :
  `...(pdfLib === undefined ? {} : { pdfLib }),`. En fin de fichier :

```ts
/** PDF fabriqué (D43) de `n` pages « RoomBoard page i » 612 × 792, écrit dans `dir`. */
export async function pdfFixture(dir: string, name = "three.pdf", n = 3): Promise<string> {
  const p = join(dir, name);
  writeFileSync(p, await pdfPages(await loadPdfLib(), n));
  return p;
}

/** Relecture d'un PDF écrit (D43) : pages, texte par page, sous-types des XObject par page. */
export async function readPdfBack(path: string): Promise<{ pages: number; texts: string[]; overlays: string[][] }> {
  await loadNodePdfjs(); // worker de pdf.js posé dans le processus, comme la CLI (D32)
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const lib = await loadPdfLib();
  return readPdf(new Uint8Array(readFileSync(path)), {
    pdfjs,
    PDFDocument: lib.PDFDocument,
    PDFName: lib.PDFName,
    PDFDict: lib.PDFDict,
    PDFStream: lib.PDFStream,
    standardFontDataUrl: pathToFileURL(pdfjsFontsDir() + sep).href,
  });
}
```

- [ ] **2. Tests rouges** — créer `apps/cli/src/pdf.test.ts` :

```ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { loadPdfLib } from "../../web/src/platform/pdf-load";
import { main } from "./main";
import { describeWasm, memoryIO, pdfFixture, stampOf, tmpDir, type Json } from "./testing";

const backdropsOf = async (file: string): Promise<Json[]> => {
  const st = memoryIO();
  expect(await main(["state", file], st)).toBe(0);
  return st.json()[0].pages.map((x: Json) => x.page.backdrop);
};

describeWasm("S1 — lire un PDF (cli-lot3)", () => {
  it("S1 — convert three.pdf p.roomboard : 3 pages de 1920, fonds pdf-page 0..2, un asset application/pdf ; state three.pdf identique", async () => {
    const dir = tmpDir();
    const three = await pdfFixture(dir);
    const p = join(dir, "p.roomboard");
    const cv = memoryIO();
    expect(await main(["convert", three, p], cv)).toBe(0);
    expect(cv.json()[0]).toMatchObject({ file: p, from: three, pages: 3 });
    expect(cv.stderr).toEqual([]);
    const st = memoryIO();
    expect(await main(["state", p], st)).toBe(0);
    const s = st.json()[0];
    expect(s.pages.map((x: Json) => [x.page.width, x.page.backdrop.kind, x.page.backdrop.page])).toEqual([[1920, "pdf-page", 0], [1920, "pdf-page", 1], [1920, "pdf-page", 2]]);
    expect(s.assets).toHaveLength(1);
    expect(s.assets[0]).toMatchObject({ name: "three.pdf", mime: "application/pdf" });
    expect(s.pages.every((x: Json) => x.page.backdrop.asset === s.assets[0].id)).toBe(true);
    const sp = memoryIO();
    expect(await main(["state", three], sp)).toBe(0);
    expect(sp.json()[0].file).toBe(three);
    expect(sp.json()[0].pages.map((x: Json) => x.page.backdrop)).toEqual(s.pages.map((x: Json) => x.page.backdrop));
  });
  it("S1 — import a.roomboard three.pdf : opened, a non écrit ; dans run, import et tab.open ouvrent des onglets sans fichier", async () => {
    const dir = tmpDir();
    const three = await pdfFixture(dir);
    const a = join(dir, "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const before = stampOf(a);
    const io = memoryIO();
    expect(await main(["import", a, three], io)).toBe(0);
    expect(io.json()[0]).toMatchObject({ opened: ["three.pdf"], inserted: [], refused: [], failed: [] });
    expect(stampOf(a)).toEqual(before);
    const run = memoryIO([JSON.stringify({ op: "import", files: [three] }), JSON.stringify({ op: "tab.open", file: three }), JSON.stringify({ op: "tab.list" })]);
    expect(await main(["run", a], run)).toBe(0);
    expect(run.json()[2].tabs).toEqual([
      { id: "t1", file: a, active: false },
      { id: "t2", file: null, active: false },
      { id: "t3", file: null, active: true },
    ]);
  });
  it("S1 — run three.pdf --save : code 2, rien d'écrit ; run three.pdf --out p.roomboard : 3 fonds pdf-page", async () => {
    const dir = tmpDir();
    const three = await pdfFixture(dir);
    const before = stampOf(three);
    expect(await main(["run", three, "--save"], memoryIO([]))).toBe(2);
    expect(stampOf(three)).toEqual(before);
    const out = join(dir, "p.roomboard");
    expect(await main(["run", three, "--out", out], memoryIO([]))).toBe(0);
    expect((await backdropsOf(out)).map((b) => b.kind)).toEqual(["pdf-page", "pdf-page", "pdf-page"]);
  });
  it("S1 — 501 pages : code 0, 500 pages, avis « gros.pdf : 500 premières pages importées sur 501 »", { timeout: 120_000 }, async () => {
    const dir = tmpDir();
    const gros = await pdfFixture(dir, "gros.pdf", 501);
    const st = memoryIO();
    expect(await main(["state", gros], st)).toBe(0);
    expect(st.json()[0].pages).toHaveLength(500);
    expect(st.json()[0].notices).toEqual(["gros.pdf : 500 premières pages importées sur 501"]);
  });
  it("S1 — PDF invalide : state code 1 « Ouverture impossible (bad.pdf) : … » ; import : partiel, code 1, a intact", async () => {
    const dir = tmpDir();
    const bad = join(dir, "bad.pdf");
    writeFileSync(bad, "%PDF-1.4\n%%EOF\n");
    const st = memoryIO();
    expect(await main(["state", bad], st)).toBe(1);
    expect(st.errors()[0].error.code).toBe("format");
    expect(st.errors()[0].error.message).toMatch(/^Ouverture impossible \(bad\.pdf\) : /);
    const a = join(dir, "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const before = stampOf(a);
    const io = memoryIO();
    expect(await main(["import", a, bad], io)).toBe(1);
    expect(io.json()[0]).toMatchObject({ failed: ["bad.pdf"] });
    expect(io.json()[0].notices.join(" ")).toContain("Ouverture impossible (bad.pdf)");
    expect(stampOf(a)).toEqual(before);
  });
  it("S3 — convert three.pdf t.iwb et t.ubz : code 0, avis « fonds PDF non exportés »", async () => {
    const dir = tmpDir();
    const three = await pdfFixture(dir);
    for (const ext of ["iwb", "ubz"]) {
      const io = memoryIO();
      expect(await main(["convert", three, join(dir, `t.${ext}`)], io)).toBe(0);
      expect(io.json()[0].notices.join(" ")).toContain("fonds PDF non exportés");
    }
  });
  it("RF1 — extension en majuscules : COURS.PDF lu comme un PDF", async () => {
    const dir = tmpDir();
    const cours = await pdfFixture(dir, "COURS.PDF");
    expect((await backdropsOf(cours)).map((b) => b.kind)).toEqual(["pdf-page", "pdf-page", "pdf-page"]);
  });
  it("RF2 — pages de tailles mixtes : chaque fond garde la taille de sa page (portrait puis paysage)", async () => {
    const dir = tmpDir();
    const lib = await loadPdfLib();
    const d = await lib.PDFDocument.create();
    d.addPage([612, 792]);
    d.addPage([792, 612]);
    const mixed = join(dir, "mixte.pdf");
    writeFileSync(mixed, await d.save());
    expect((await backdropsOf(mixed)).map((b) => [b.w, b.h])).toEqual([[612, 792], [792, 612]]);
  });
});
```

- [ ] **3. Vérifier le rouge** — `cd ~/projets/roomboard-wt/cli-lot3--T5 && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/pdf.test.ts 2>&1 | tail -15`
  Attendu : échecs (`convert` rend 3, « format pris en charge par la CLI au lot 3 »).

- [ ] **4. `formats.ts:160`** — `[".pdf", branched(3, 3, "pdf", { read: true, write: false }, "fond `pdf-page`, PDF d'origine gardé en asset")],`
  **`exporter.ts:59`** — `const CONVERT_SOURCES: ReadonlySet<string> = new Set([".roomboard", ".pdf", ".iwb", ".ubz", ".notebook", ".olf", ".flipchart"]);`

- [ ] **5. `session.ts`** — imports :

```ts
import { readPdfFile, type PdfRead } from "../../web/src/app/pdf-convert";
import type { PdfLib } from "../../web/src/app/pdf-export";
import type { PdfWriter } from "../../web/src/app/pdf-overlay-vector";
import type { PdfEngine } from "../../web/src/engine/render/pdf-port";
import { loadPdfLib } from "../../web/src/platform/pdf-load";
import { nodePdfEngine, nodePdfWriter } from "./pdf-node";
```

  En-tête du fichier : ajouter la ligne « cli-lot3 (D40) : un `.pdf` est lu par `readPdfFile` du produit en onglet sans
  fichier ; pdf-lib, moteur pdf.js et écrivain krilla en dépendances (T6 écrit le PDF). » `SessionDeps`, après `board` :

```ts
  /** cli-lot3 (D44) : pdf-lib résolu depuis `apps/web` ; `TestableIO.pdfLib` le remplace dans les tests. */
  loadPdfLib(): Promise<PdfLib>;
  /** cli-lot3 (D32) : pdf.js en processus, sans rendu (`nodePdfEngine`). */
  readonly pdf: PdfEngine;
  /** cli-lot3 (D38) : écrivain krilla en processus (`nodePdfWriter`) ; panique → `interrupted` (D29). */
  readonly pdfWriter: PdfWriter;
```

  Après `documentTarget` :

```ts
/** D40 : un chemin `.pdf` (sans casse). */
export function isPdfPath(path: string): boolean {
  return formatOf(path)?.handler === "pdf";
}
```

  `Session`, après `openBoard` :
  `/** PDF ouvert par l'importeur (`openPdf`) en onglet sans fichier : false si refusé, l'avis est dans `notices`. */`
  `openPdf(file: { readonly name: string; readonly blob: Blob }): Promise<boolean>;`
  Dans `createSession`, après `readBoardNoticed` :

```ts
  /** Lit un PDF (D35, D40) ; échec : message complet du produit ; avis d'ouverture (500 pages) dans les notices (D31). */
  async function readPdfNoticed(name: string, blob: Blob): Promise<PdfRead> {
    let read: PdfRead;
    try {
      read = await readPdfFile({ name, blob }, { core: deps.core, pdf: deps.pdf, makeAssets: () => createAssetStore() });
    } catch (e) {
      throw new CliError("format", messageOf(e));
    }
    deps.notices.push(...read.warnings);
    return read;
  }
```

  `readDoc` : après `sources.add(path);`, insérer

```ts
    if (kind === "document" && isPdfPath(path)) {
      const read = await readPdfNoticed(basename(path), new Blob([bytes as BlobPart]));
      return { doc: read.doc, assets: read.assets };
    }
```

  `open` : remplacer le commentaire et le `return` par

```ts
    // D22, D40 : un tableau ou un PDF ouvert est un onglet sans fichier (comme `target: null` de la page) : jamais réécrit à son chemin.
    return add({ doc: read.doc, assets: read.assets, file: boardFormatOf(path) === null && !isPdfPath(path) ? path : null });
```

  Après `openBoard`, ajouter :

```ts
  async function openPdf(file: { readonly name: string; readonly blob: Blob }): Promise<boolean> {
    if (tabs.list().length >= MAX_TABS) {
      deps.notices.push(`Ouverture impossible (${file.name}) : ${TOO_MANY_TABS}`);
      return false;
    }
    let read: PdfRead;
    try {
      read = await readPdfNoticed(file.name, file.blob);
    } catch (e) {
      deps.notices.push(messageOf(e)); // déjà le message complet du produit
      return false;
    }
    try {
      add({ doc: read.doc, assets: read.assets, file: null });
      return true;
    } catch (e) {
      deps.notices.push(`Ouverture impossible (${file.name}) : ${messageOf(e)}`);
      return false;
    }
  }
```

  Objet `session` : ajouter `openPdf,` après `openBoard,`. `TestableIO` :

```ts
export interface TestableIO extends CliIO {
  /** Test seulement : module des formats des tableaux et de l'écrivain PDF, à la place du vrai (câblage de D29). */
  readonly formats?: () => Promise<FormatsBinding>;
  /** Test seulement : pdf-lib à la place du vrai (PDF d'origine refusé, D39). */
  readonly pdfLib?: () => Promise<PdfLib>;
}
```

  `nodeSession` : remplacer `let interrupted = false;` et l'appel `createSession({…})` par

```ts
  let interrupted = false;
  const onPanic = (): void => {
    interrupted = true;
  };
  return createSession({
    core,
    io: containerIO,
    codec,
    notices,
    formats,
    now,
    fragments: cliFragments({ io: containerIO, core, now, notices }),
    board: nodeBoardPorts(io.formats ?? formats, onPanic),
    loadPdfLib: io.pdfLib ?? loadPdfLib,
    pdf: nodePdfEngine(),
    pdfWriter: nodePdfWriter(io.formats ?? formats, onPanic),
    interrupted: () => interrupted,
  });
```

- [ ] **6. `importer.ts`** — dans `createImporter({…})`, après `openBoard: …,` :
  `openPdf: (f) => session.openPdf(f), // D40 : PDF en onglet sans fichier`

- [ ] **7. Tests existants du code 3 de `.pdf` à l'import** (le code 3 se contrôle désormais sur `.docx`) :
  - `formats.test.ts:20` : insérer `".pdf"` entre `".olf"` et `".png"` dans la liste lue ; `:29` :
    `expect(importBlocked("doc.pdf")).toBeNull();` ; `:37` :
    `expect(unsupportedMessage("/tmp/lettre.docx", 4)).toBe("lettre.docx : format pris en charge par la CLI au lot 4");`
  - `main.test.ts:17` : `expect.objectContaining({ ext: ".pdf", read: true, write: false, readLot: 3, writeLot: 3 })`
  - `import.test.ts:57-72` : remplacer tout le bloc `it("import doc.pdf : code 3 « lot 3 », rien lu ni écrit", …)` par

```ts
  it("import x.docx : code 3 « lot 4 », rien lu ni écrit (cli-lot3 : .pdf est lu)", async () => {
    const { dir, a } = await board();
    const docx = join(dir, "lettre.docx");
    writeFileSync(docx, "pas un docx");
    const before = stampOf(a);
    const io = memoryIO();
    expect(await main(["import", a, docx], io)).toBe(3);
    expect(io.stdout).toEqual([]);
    expect(io.errors()[0].error).toEqual({ code: "unsupported", message: "lettre.docx : format pris en charge par la CLI au lot 4" });
    expect(stampOf(a)).toEqual(before);
    // Rien lu : tableau et source absents du disque, une lecture rendrait io (code 1) au lieu de 3.
    const absent = memoryIO();
    expect(await main(["import", join(dir, "absent.roomboard"), join(dir, "absent.docx")], absent)).toBe(3);
  });
```

  - `convert.test.ts:116` : titre `"convert : sources et sorties refusées (sortie .pdf : 3 ; source .docx, .rbitem, .rbpack, .png : 2)"` ;
    `:120` : `expect(await main(["convert", join(dir, "doc.docx"), join(dir, "x.roomboard")], memoryIO())).toBe(2);`
  - `guards.test.ts:49` : titre `"convert : .webp, .gif et .docx : 2 ; .pdf absent : 1 (lu depuis le lot 3)"` ;
    `:55` : `expect(await main(["convert", join(dir, "doc.pdf"), out], memoryIO())).toBe(1);`

- [ ] **8. Vert** — `cd ~/projets/roomboard-wt/cli-lot3--T5 && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli test 2>&1 | tail -15`
  Attendu : tous verts, aucun `FAIL ` (tests à garder verts : `boards.test.ts`, `import.test.ts`, `convert.test.ts`,
  `guards.test.ts`, `session.test.ts`). Puis
  `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/pdf.test.ts -t "S1" 2>&1 | tail -15` : ≥ 5 tests passés (8 : `-t` lit aussi le nom du bloc) ;
  `nice -n 10 pnpm --filter @roomboard/cli exec tsc --noEmit 2>&1 | tail -10` : aucune ligne `error TS`.

- [ ] **9. Commit**

```bash
cd ~/projets/roomboard-wt/cli-lot3--T5
git add apps/cli/src/session.ts apps/cli/src/importer.ts apps/cli/src/exporter.ts apps/cli/src/formats.ts apps/cli/src/testing.ts apps/cli/src/pdf.test.ts
git add apps/cli/src/formats.test.ts apps/cli/src/main.test.ts apps/cli/src/import.test.ts apps/cli/src/convert.test.ts apps/cli/src/guards.test.ts
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -F - <<'EOF'
feat(cli): read PDF files as tabs with pdf-page backdrops

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

<a id="tache-t6"></a>

### Tâche T6 — CLI : écrire un PDF (`export`, `convert`, op `export`), `LOT_LIVRE = 3`

**Objectif.** `export <source> <sortie.pdf>`, `convert … <sortie.pdf>` et `{"op":"export","to":"x.pdf"}` écrivent le
document entier de l'onglet actif par `writePdfFile` (D41) avec la superposition `nodeOverlay` ; les replis que la CLI
n'a pas donnent **code 1, rien d'écrit** (D39) ; `cut` : code 0 et avis. `.pdf` est couvert en écriture,
`LOT_LIVRE = 3`, `exportBlocked` disparaît (D42). Scénarios servis : S2, S3, S4.

**Patron à ne pas reprendre.** Brancher `fallbackOverlay` ou `createPngOverlay` (`apps/web/src/app/pdf-overlay-vector.ts:117-128`,
`apps/web/src/main.ts:162-170`), ou écrire le PDF quand `rasterMissing` est vrai (pages vierges muettes) : la CLI n'a
pas de canvas (D33, H24). Ne pas garder un code 3 à l'export : toute sortie non prise rend 2. Chemin de référence de
l'export d'un document entier : `apps/cli/src/exporter.ts:43-57` (`exportBoardFile` : `checkExportTarget`, `missingOf`,
écriture par `session.write`, avis poussés après l'écriture).

**Invariant (D29, D39).** Rien n'est écrit si `writePdfFile` lève, rend null ou rend `rasterMissing` ; après une panique
de krilla, `session.deps.interrupted()` est vrai et tout `save` du processus est refusé (`INTERRUPTED_MESSAGE`).

**Worktree.** Isolé : `~/projets/roomboard-wt/cli-lot3--T6`, créé après la fusion de T5. Préparer (G8) :
`cd ~/projets/roomboard-wt/cli-lot3--T6 && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r /home/adminjd/projets/roomboard-wt/cli-lot3/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot3/apps/web/src/wasm-formats apps/web/src/`.

**Fichiers.**
- Modifier : `apps/cli/src/exporter.ts` (imports 5-15, `checkExportTarget` 28-36, `CONVERT_TARGETS` 60, `convertSide`/`checkConvert` 61-72, + `isPdfOut`, `exportPdfFile`)
- Modifier : `apps/cli/src/session.ts:264-271` (op `export`)
- Modifier : `apps/cli/src/main.ts:16`, `:188-222` (`export`, `convert`)
- Modifier : `apps/cli/src/formats.ts:1-15` (en-tête), `:117`, `:160`, `:206-210`
- Modifier : `apps/cli/src/testing.ts` (+ `pdfPanickingFormats`, `refusingPdfLib`)
- Modifier : `apps/cli/src/pdf.test.ts` (blocs ajoutés)
- Modifier (tests du code 3 à l'export) : `formats.test.ts:4,17-27,39-46`, `main.test.ts:17`, `export.test.ts:53-59`, `convert.test.ts:52-58,116-119`

**Interfaces.**
- Consomme : (T1) `writePdfFile(doc, assets, deps: PdfWriteDeps): Promise<PdfWritten | null>` ; (T4)
  `nodeOverlay(doc, assets, write, fonts?)`, `NO_RASTER_SUFFIX` ; (T5) `SessionDeps.loadPdfLib`, `.pdfWriter`,
  `memoryIO(…, formats, pdfLib)`, `pdfFixture`, `readPdfBack`, `isPdfPath`.
- Produit (exact) :

```ts
// apps/cli/src/exporter.ts
export const isPdfOut: (to: string) => boolean; // extOf(to) === ".pdf"
export function exportPdfFile(session: Session, to: string): Promise<{ file: string; kind: "pdf"; pages: number; annotated: boolean }>;
export function checkConvert(from: string, to: string): void; // plus aucun code 3
// apps/cli/src/testing.ts
export const pdfPanickingFormats: () => () => Promise<FormatsBinding>;
export const refusingPdfLib: () => () => Promise<PdfLib>;
```

- Réutilise : `apps/web/src/app/pdf-convert.ts` (T1) — `writePdfFile(tab.doc, tab.assets, { core, now, loadPdfLib, overlay: (copy) => nodeOverlay(copy, tab.assets, deps.pdfWriter), alive: () => true })` (réutiliser ; sans `rasterPage` : `rasterMissing` → code 1).
- Réutilise : `apps/web/src/app/container-io.ts:82`, `apps/web/src/platform/controller.ts:11` — `missingOf(doc, assets)`, `UNREAD_ASSETS_MESSAGE` (réutiliser).
- Réutilise : patron `apps/cli/src/exporter.ts:44` (`exportBoardFile`) — `exportPdfFile(session: Session, to: string): Promise<{ file: string; kind: "pdf"; pages: number; annotated: boolean }>` (`missingOf` ; D39 ; `session.write`) (étendre `exporter.ts`).
- Réutilise : `apps/cli/src/formats.ts:11,54,101` — `.pdf` couvert en écriture, `LOT_LIVRE = 3`, `exportBlocked` retiré (étendre).
- Réutilise : `apps/cli/src/exporter.ts:39` — `checkNotSource(source, to)` (réutiliser : `convert x.pdf x.PDF` → 2).
- Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne ci-dessus.

**Contraintes (recopiées).**
- G1 — TDD : test rouge d'abord ; aucun test désactivé, sauté ni seuil changé ; délai : rejoué une fois.
- G2 — Aucune copie (0281, D32) : écriture par `writePdfFile`, `createVectorOverlay` (via `nodeOverlay`) et `pdfJobReply` seulement.
- G3 — Polices lues dans `pdfjs-dist` installé, jamais copiées.
- G4 — PDF fabriqués (`pdfFixture`) ; faux `PdfLib` et faux module par `TestableIO` ; aucun fichier téléchargé ; écritures sous `tmpDir()`.
- G5 — Aucune ligne Rust ; tailles Wasm inchangées (plafonds 1 572 864 o et 3 145 728 o).
- G7 — `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; `nice -n 10`.
- G8 — Worktree préparé comme ci-dessus.
- G9 — Auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers un par un ; aucun `--force`.
- G10 — `.pdf` couvert en écriture dans `FORMAT_LOTS`, tests mis à jour (l'essai est en T7).
- G11 — Aucun `console.log`/`console.warn` ajouté.

**Interdits.** Aucun repli en image, aucun canvas. Ne pas toucher `USAGE` (T7), `cli-essai.mjs` (T7), `pdf-node.ts`.
Contrat `roomboard-cli/1` inchangé : sortie de `convert` identique au lot 2 ; sortie d'`export … .pdf` exactement
`{"file","kind":"pdf","pages","annotated","notices"?}` (H27).

**Terminé quand.** Suite de la CLI verte sous `ROOMBOARD_WASM_REQUIRED=1` ; `pdf.test.ts` : tests `S2 —`, `S3 —` (3),
`S4 —` (4), `RF3 —`, `RF4 —`, `RF5 —` présents ; `grep -c "exportBlocked" apps/cli/src/*.ts` → `0` partout ;
`tsc --noEmit` sans erreur ; un commit.

**Étapes.**

- [ ] **1. Aides de test** — `apps/cli/src/testing.ts`, en fin de fichier :

```ts
/** D29, D38 : module des formats dont `write_pdf_pages` panique (piège Wasm) ; seul l'écrivain PDF est donné. */
export const pdfPanickingFormats = (): (() => Promise<FormatsBinding>) => {
  const mod = {
    ...formatsWith(() => {
      throw new Error("non appelé");
    }),
    write_pdf_pages: () => {
      throw new WebAssembly.RuntimeError("unreachable");
    },
  } as unknown as FormatsBinding;
  return async () => mod;
};

/** D39 : pdf-lib qui refuse tout PDF d'origine (`load` lève), `create` gardé (patron de `pdf-export.test.ts:297`). */
export const refusingPdfLib = (): (() => Promise<PdfLib>) => async () => {
  const base = await loadPdfLib();
  return {
    ...base,
    PDFDocument: {
      create: base.PDFDocument.create,
      load: async () => {
        throw new Error("refusé par pdf-lib");
      },
    },
  } as unknown as PdfLib;
};
```

- [ ] **2. Tests rouges** — `apps/cli/src/pdf.test.ts` : compléter les imports en

```ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { PDF_CUT_MESSAGE, PDF_RASTER_MISSING_MESSAGE } from "../../web/src/app/pdf-export";
import { PDF_WRITE_FAILED_MESSAGE } from "../../web/src/app/pdf-overlay-vector";
import { loadPdfLib } from "../../web/src/platform/pdf-load";
import { exportPdfFile } from "./exporter";
import { main } from "./main";
import { NO_RASTER_SUFFIX } from "./pdf-node";
import { INTERRUPTED_MESSAGE, nodeSession } from "./session";
import { describeWasm, memoryIO, pdfFixture, pdfPanickingFormats, readPdfBack, refusingPdfLib, stampOf, tmpDir, WEB_SRC, type Json } from "./testing";
```

  puis ajouter en fin de fichier :

```ts
const ANNOTATE = [
  { type: "AddShape", page: "$page:1", shape: "rect", x0: 100, y0: 100, x1: 500, y1: 300, style: { color: "#dc2626", width: 6 }, fill: null },
  { type: "SetText", page: "$page:1", id: null, x: 200, y: 400, content: "Annotation CLI", color: "#000000", size: 48, boxWidth: 800, boxHeight: 60 },
].map((o) => JSON.stringify(o));

/** three.pdf converti en p.roomboard, page 2 annotée (rectangle, « Annotation CLI »), enregistré. */
async function annotatedBoard(dir: string): Promise<{ three: string; p: string }> {
  const three = await pdfFixture(dir);
  const p = join(dir, "p.roomboard");
  expect(await main(["convert", three, p], memoryIO())).toBe(0);
  expect(await main(["run", p, "--save"], memoryIO(ANNOTATE))).toBe(0);
  return { three, p };
}

describeWasm("S2 à S4 — écrire un PDF (cli-lot3)", () => {
  it("S2 — export p.roomboard p.pdf : kind pdf, 3 pages, annoté ; relu : « RoomBoard page 2 » et « Annotation CLI » en page 2, /Form en page 2 seule", async () => {
    const dir = tmpDir();
    const { p } = await annotatedBoard(dir);
    const out = join(dir, "p.pdf");
    const io = memoryIO();
    expect(await main(["export", p, out], io)).toBe(0);
    expect(io.json()).toEqual([{ file: out, kind: "pdf", pages: 3, annotated: true }]);
    expect(io.stderr).toEqual([]);
    const back = await readPdfBack(out);
    expect(back.pages).toBe(3);
    expect(back.texts[1]).toContain("RoomBoard page 2");
    expect(back.texts[1]).toContain("Annotation CLI");
    expect(back.overlays).toEqual([[], ["/Form"], []]);
  });
  it("S3 — aller-retour : convert p.pdf back.roomboard : 3 pages à fond pdf-page", async () => {
    const dir = tmpDir();
    const { p } = await annotatedBoard(dir);
    const out = join(dir, "p.pdf");
    expect(await main(["export", p, out], memoryIO())).toBe(0);
    const back = join(dir, "back.roomboard");
    const cv = memoryIO();
    expect(await main(["convert", out, back], cv)).toBe(0);
    expect(cv.json()[0]).toMatchObject({ file: back, from: out, pages: 3 });
    const st = memoryIO();
    expect(await main(["state", back], st)).toBe(0);
    expect(st.json()[0].pages.map((x: Json) => [x.page.backdrop.kind, x.page.backdrop.page])).toEqual([["pdf-page", 0], ["pdf-page", 1], ["pdf-page", 2]]);
  });
  it("S3 — document sans fond PDF : export a.pdf, 1 page de 842 pt, annotated faux", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    expect(await main(["run", a, "--save"], memoryIO([JSON.stringify({ type: "AddShape", page: "$page:0", shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style: { color: "#1e40af", width: 4 }, fill: null })]))).toBe(0);
    const out = join(dir, "a.pdf");
    const io = memoryIO();
    expect(await main(["export", a, out], io)).toBe(0);
    expect(io.json()).toEqual([{ file: out, kind: "pdf", pages: 1, annotated: false }]);
    const lib = await loadPdfLib();
    expect((await lib.PDFDocument.load(readFileSync(out))).getPage(0).getWidth()).toBe(842);
  });
  it("S3 — refus d'usage : --ids, --page, --name vers .pdf : 2 ; convert p.pdf p.PDF : 2 ; new z.pdf : 2, rien d'écrit", async () => {
    const dir = tmpDir();
    const { p } = await annotatedBoard(dir);
    for (const flags of [["--ids", "x"], ["--page", "x"], ["--name", "n"], ["--all"], ["--grid"]]) {
      expect(await main(["export", p, join(dir, "x.pdf"), ...flags], memoryIO()), flags.join(" ")).toBe(2);
    }
    expect(existsSync(join(dir, "x.pdf"))).toBe(false);
    const out = join(dir, "p.pdf");
    expect(await main(["export", p, out], memoryIO())).toBe(0);
    const before = stampOf(out);
    expect(await main(["convert", out, join(dir, "p.PDF")], memoryIO())).toBe(2);
    expect(stampOf(out)).toEqual(before);
    expect(await main(["new", join(dir, "z.pdf")], memoryIO())).toBe(2);
    expect(existsSync(join(dir, "z.pdf"))).toBe(false);
  });
  it("S4 — pdf-lib refuse le PDF d'origine : code 1, message de D39, aucun fichier", async () => {
    const dir = tmpDir();
    const { p } = await annotatedBoard(dir);
    const out = join(dir, "refus.pdf");
    const io = memoryIO([], {}, WEB_SRC, undefined, refusingPdfLib());
    expect(await main(["export", p, out], io)).toBe(1);
    expect(io.errors()[0].error).toEqual({ code: "command", message: `${PDF_RASTER_MISSING_MESSAGE}${NO_RASTER_SUFFIX}` });
    expect(existsSync(out)).toBe(false);
  });
  it("S4 — panique de write_pdf_pages : code 1, rien d'écrit ; dans la session, plus aucun save (D29)", async () => {
    const dir = tmpDir();
    const { p } = await annotatedBoard(dir);
    const out = join(dir, "panique.pdf");
    const io = memoryIO([], {}, WEB_SRC, pdfPanickingFormats());
    expect(await main(["export", p, out], io)).toBe(1);
    expect(io.errors()[0].error.message).toBe(`Export impossible : superposition vectorielle impossible (${PDF_WRITE_FAILED_MESSAGE})${NO_RASTER_SUFFIX}`);
    expect(existsSync(out)).toBe(false);
    const s = await nodeSession(memoryIO([], {}, WEB_SRC, pdfPanickingFormats()));
    const tab = (await s.open(p)).session;
    await expect(exportPdfFile(s, out)).rejects.toMatchObject({ code: "command" });
    expect(s.deps.interrupted()).toBe(true);
    const after = join(dir, "apres.roomboard");
    await expect(s.save(tab, after)).rejects.toMatchObject({ message: INTERRUPTED_MESSAGE });
    expect(existsSync(after)).toBe(false);
  });
  it("S4 — image GIF annotée (H24) : code 1, « image/gif » dans le message, rien d'écrit", async () => {
    const s = await nodeSession(memoryIO());
    const tab = s.newTab().session;
    const gif = new Blob([new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0, 0, 0])], { type: "image/gif" });
    const id = await tab.assets.put(gif);
    await s.exec(JSON.stringify({ type: "AddImage", page: "$page:0", asset: { id, name: "a.gif", mime: "image/gif", size: gif.size }, w: 40, h: 40, matrix: [1, 0, 0, 1, 100, 100] }));
    const out = join(tmpDir(), "gif.pdf");
    await expect(exportPdfFile(s, out)).rejects.toMatchObject({ code: "command", message: expect.stringContaining("image/gif") });
    expect(existsSync(out)).toBe(false);
  });
  it("S4 — formats : .pdf lu et écrit ; import a.roomboard x.docx : 3 « lot 4 » ; convert a.roomboard x.docx : 2", async () => {
    const dir = tmpDir();
    const f = memoryIO();
    expect(await main(["formats"], f)).toBe(0);
    expect(f.json()[0].formats).toContainEqual(expect.objectContaining({ ext: ".pdf", read: true, write: true, readLot: 3, writeLot: 3 }));
    const a = join(dir, "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const imp = memoryIO();
    expect(await main(["import", a, join(dir, "x.docx")], imp)).toBe(3);
    expect(imp.errors()[0].error.message).toContain("lot 4");
    expect(await main(["convert", a, join(dir, "x.docx")], memoryIO())).toBe(2);
  });
  it("RF3 — convert d'un PDF vers un PDF (H33) : 3 pages, texte et superposition d'origine gardés", async () => {
    const dir = tmpDir();
    const { p } = await annotatedBoard(dir);
    const first = join(dir, "p.pdf");
    expect(await main(["export", p, first], memoryIO())).toBe(0);
    const second = join(dir, "y.pdf");
    const cv = memoryIO();
    expect(await main(["convert", first, second], cv)).toBe(0);
    expect(cv.json()[0]).toMatchObject({ file: second, from: first, pages: 3 });
    const back = await readPdfBack(second);
    expect(back.pages).toBe(3);
    expect(back.texts[1]).toContain("Annotation CLI");
    expect(back.overlays).toEqual([[], ["/Form"], []]);
  });
  it("RF4 — contenu hors des pages PDF : code 0, avis PDF_CUT_MESSAGE dans notices (H27)", async () => {
    const dir = tmpDir();
    const three = await pdfFixture(dir);
    const p = join(dir, "p.roomboard");
    expect(await main(["convert", three, p], memoryIO())).toBe(0);
    expect(await main(["run", p, "--save"], memoryIO([JSON.stringify({ type: "AddShape", page: "$page:0", shape: "rect", x0: 100, y0: 3000, x1: 300, y1: 3100, style: { color: "#000000", width: 4 }, fill: null })]))).toBe(0);
    const io = memoryIO();
    expect(await main(["export", p, join(dir, "cut.pdf")], io)).toBe(0);
    expect(io.json()[0].notices).toEqual([PDF_CUT_MESSAGE]);
  });
  it("RF5 — op export vers .pdf dans run : une ligne kind pdf ; avec « page » : code 2", async () => {
    const dir = tmpDir();
    const { p } = await annotatedBoard(dir);
    const out = join(dir, "op.pdf");
    const run = memoryIO([JSON.stringify({ op: "export", to: out })]);
    expect(await main(["run", p], run)).toBe(0);
    expect(run.json()[0]).toMatchObject({ op: 1, ok: true, file: out, kind: "pdf", pages: 3, annotated: true });
    const bad = memoryIO([JSON.stringify({ op: "export", to: join(dir, "x.pdf"), page: "$page:0" })]);
    expect(await main(["run", p], bad)).toBe(2);
    expect(existsSync(join(dir, "x.pdf"))).toBe(false);
  });
});
```

  Tests existants du code 3 à l'export (le code 3 ne sort plus de l'export, D42) :
  - `formats.test.ts:4` : retirer `exportBlocked` de l'import ; `:17-18` : titre `"lots livrés (LOT_LIVRE = 3) : lus et écrits"`,
    `expect(LOT_LIVRE).toBe(3);` ; `:23` : liste écrite
    `[".iwb", ".pdf", ".rbitem", ".rbpack", ".roomboard", ".ubz"]` ; ajouter
    `expect(rows.find((r) => r.ext === ".pdf")?.notes.join(" ")).toContain("pdf-page");` ; remplacer le bloc
    `it("exportBlocked : …", …)` (39-46) par

```ts
  it("lotOf : .pdf → 3, .notebook → 2, inconnu → null (cli-lot3 : exportBlocked retiré, plus aucun code 3 à l'export)", () => {
    expect(lotOf("a.pdf")).toBe(3);
    expect(lotOf("a.notebook")).toBe(2);
    expect(lotOf("a.txt")).toBeNull();
  });
```

  - `main.test.ts:17` : `expect.objectContaining({ ext: ".pdf", read: true, write: true, readLot: 3, writeLot: 3 })`
  - `export.test.ts:53-59` : titre `"export vers .docx : code 2 ; vers .png : code 2 ; page vide : code 1"`, et
    `const docx = memoryIO(); expect(await main(["export", a, join(dir, "x.docx")], docx)).toBe(2); expect(docx.errors()[0].error.code).toBe("usage");`
    à la place des trois lignes `pdf`.
  - `convert.test.ts:52-58` : titre `"S3 — export .ubz avec --ids : code 2 ; vers .docx : code 2 ; vers .rbpack : code 2, renvoi à library"`,
    lignes `pdf` → `const docx = memoryIO(); expect(await main(["export", a, join(dir, "a.docx")], docx)).toBe(2);` ;
    `:116` titre `"convert : sources et sorties refusées (.docx, .rbitem, .rbpack, .png : 2)"`, `:119` :
    `expect(await main(["convert", a, join(dir, "x.docx")], memoryIO())).toBe(2);`

- [ ] **3. Vérifier le rouge** — `cd ~/projets/roomboard-wt/cli-lot3--T6 && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/pdf.test.ts src/formats.test.ts 2>&1 | tail -15`
  Attendu : échecs (`exportPdfFile` absent, `export … .pdf` rend 3, `LOT_LIVRE` vaut 2).

- [ ] **4. `formats.ts`** — `:117` `export const LOT_LIVRE: Lot = 3;` ; `:160` :

```ts
  [".pdf", branched(3, 3, "pdf", { read: true, write: true }, "fond `pdf-page`, PDF d'origine gardé en asset", "export : pages d'origine recopiées, annotation vectorielle ; sans repli en image (code 1)", "couleurs nommées et texte mesurés comme H25, H26")],
```

  Supprimer `exportBlocked` (`:206-210`, avec son commentaire). En-tête : ajouter « cli-lot3 (D42) : `.pdf` couvert,
  `LOT_LIVRE = 3` ; plus aucune écriture d'un lot non livré, le code 3 ne sort plus que d'un `import` du lot 4. »

- [ ] **5. `exporter.ts`** — imports :

```ts
import { basename } from "node:path";
import { writeBoardFile } from "../../web/src/app/board-convert";
import type { BoardFormat } from "../../web/src/app/board-io";
import { missingOf } from "../../web/src/app/container-io";
import { MISSING_EXPORT_MESSAGE, NO_GRID_MESSAGE } from "../../web/src/app/fragments";
import { writePdfFile, type PdfWritten } from "../../web/src/app/pdf-convert";
import { PDF_RASTER_MISSING_MESSAGE } from "../../web/src/app/pdf-export";
import { messageOf, UNREAD_ASSETS_MESSAGE } from "../../web/src/platform/controller";
import { asCliError, CliError } from "./contract";
import { sameFile } from "./disk";
import { extOf, packMessage } from "./formats";
import { nodeOverlay, NO_RASTER_SUFFIX } from "./pdf-node";
import type { Session } from "./session";
import { pageOf } from "./state";
```

  En-tête : ajouter « cli-lot3 (D39, D41) : `.pdf` par `writePdfFile` du produit, superposition `nodeOverlay` ; replis
  absents : code 1, rien d'écrit. » Remplacer `checkExportTarget` par

```ts
export const isPdfOut = (to: string): boolean => extOf(to) === ".pdf";

/** `.rbitem`, `.iwb`, `.ubz`, `.pdf` ; `.rbpack` : usage (bibliothèque) ; toute autre sortie : usage (D42). */
export function checkExportTarget(to: string): void {
  const ext = extOf(to);
  if (ext === ".rbitem" || BOARD_OUT.has(ext) || ext === ".pdf") return;
  if (ext === ".rbpack") throw new CliError("usage", packMessage(to));
  throw new CliError("usage", `export : ${basename(to)} : sorties .rbitem, .iwb, .ubz ou .pdf`);
}
```

  Après `exportBoardFile`, ajouter

```ts
/**
 * D41 : document entier de l'onglet actif en PDF (`writePdfFile`, D36). D39 : PDF d'origine refusé par pdf-lib
 * (`rasterMissing`, la page le rendrait en image) ou superposition en échec : code 1, rien d'écrit ; `cut` : avis.
 */
export async function exportPdfFile(session: Session, to: string): Promise<{ file: string; kind: "pdf"; pages: number; annotated: boolean }> {
  checkExportTarget(to);
  const tab = session.active();
  if (missingOf(tab.doc, tab.assets).length > 0) throw new CliError("command", UNREAD_ASSETS_MESSAGE);
  const { deps } = session;
  let r: PdfWritten | null;
  try {
    r = await writePdfFile(tab.doc, tab.assets, {
      core: deps.core,
      now: () => deps.now(),
      loadPdfLib: () => deps.loadPdfLib(),
      overlay: (copy) => nodeOverlay(copy, tab.assets, deps.pdfWriter),
      alive: () => true,
    });
  } catch (e) {
    throw new CliError("command", `Export impossible : ${messageOf(e)}`);
  }
  if (r === null) throw new CliError("command", "Export impossible : export interrompu");
  if (r.rasterMissing) throw new CliError("command", `${PDF_RASTER_MISSING_MESSAGE}${NO_RASTER_SUFFIX}`);
  await session.write(to, r.bytes);
  deps.notices.push(...r.notices); // `cut` (H12, H27) : avis, code 0
  return { file: to, kind: "pdf", pages: r.pages, annotated: r.annotated };
}
```

  Remplacer `CONVERT_TARGETS`, `convertSide` et `checkConvert` par

```ts
const CONVERT_TARGETS: ReadonlySet<string> = new Set([".roomboard", ".iwb", ".ubz", ".pdf"]);
function convertSide(path: string, allowed: ReadonlySet<string>, what: string): void {
  if (allowed.has(extOf(path))) return;
  if (extOf(path) === ".rbpack") throw new CliError("usage", packMessage(path));
  throw new CliError("usage", `convert : ${basename(path)} : ${what} ${[...allowed].join(" ")} attendue (export pour un .rbitem)`);
}
/** D25, D42 : avant tout chargement ; toute source ou sortie hors des listes : 2 (le code 3 ne sort plus que d'un `import`). */
export function checkConvert(from: string, to: string): void {
  convertSide(from, CONVERT_SOURCES, "source");
  convertSide(to, CONVERT_TARGETS, "sortie");
}
```

- [ ] **6. `session.ts`** — import : `exportPdfFile, isPdfOut` ajoutés à l'import de `./exporter`. Op `export`
  (264-271) :

```ts
      case "export": {
        const to = needString(args, "to");
        if (isBoardOut(to) || isPdfOut(to)) {
          for (const k of ["ids", "page", "grid", "name"]) {
            if (args[k] !== undefined) throw new CliError("usage", `export ${extOf(to)} : document entier, « ${k} » ne s'y applique pas`);
          }
          return { ...(isPdfOut(to) ? await exportPdfFile(session, to) : await exportBoardFile(session, to)) };
        }
```

  (la suite du `case` inchangée).

- [ ] **7. `main.ts`** — import ligne 16 :
  `import { checkConvert, checkExportTarget, checkNotSource, exportBoardFile, exportFragment, exportPdfFile, isBoardOut, isPdfOut } from "./exporter";`
  Commande `export` (188-210), à partir de `checkExportTarget(to);` :

```ts
    checkExportTarget(to); // code 2 avant toute lecture
    await checkNotSource(file, to); // code 2 : jamais la source
    const whole = isBoardOut(to) || isPdfOut(to);
    if (whole && (p.flags.has("--page") || idsText !== undefined || p.flags.has("--all") || grid || p.flags.has("--name"))) {
      throw new CliError("usage", `export ${extOf(to)} : document entier ; --page, --ids, --all, --grid et --name ne s'y appliquent pas`);
    }
    const session = await nodeSession(io);
    await session.open(file);
    const ids = idsText?.split(",").map((s) => s.trim()).filter((s) => s !== "");
    const result = isPdfOut(to)
      ? await exportPdfFile(session, to)
      : isBoardOut(to)
        ? await exportBoardFile(session, to)
        : await exportFragment(session, { to, page: flagStr(p, "--page"), ids, name: flagStr(p, "--name"), grid });
```

  (la suite inchangée). Commande `convert` : `checkConvert(from, to); // code 2 avant tout chargement (D25, D42)` et

```ts
    if (extOf(to) === ".roomboard") await session.save(tab, to);
    else if (isPdfOut(to)) await exportPdfFile(session, to);
    else await exportBoardFile(session, to);
```

- [ ] **8. Vert** — `cd ~/projets/roomboard-wt/cli-lot3--T6 && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli test 2>&1 | tail -15`
  Attendu : tous verts, aucun `FAIL ` (à garder verts : `export.test.ts`, `convert.test.ts`, `boards.test.ts`,
  `rbitem.test.ts`, `guards.test.ts`, `formats.test.ts`). Puis
  `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/pdf.test.ts -t "S2|S3|S4|RF" 2>&1 | tail -15` : ≥ 13 tests ;
  `grep -c "exportBlocked" apps/cli/src/*.ts | grep -v ":0"` → rien ;
  `nice -n 10 pnpm --filter @roomboard/cli exec tsc --noEmit 2>&1 | tail -10` : aucune ligne `error TS`.

- [ ] **9. Commit**

```bash
cd ~/projets/roomboard-wt/cli-lot3--T6
git add apps/cli/src/exporter.ts apps/cli/src/session.ts apps/cli/src/main.ts apps/cli/src/formats.ts apps/cli/src/testing.ts apps/cli/src/pdf.test.ts
git add apps/cli/src/formats.test.ts apps/cli/src/main.test.ts apps/cli/src/export.test.ts apps/cli/src/convert.test.ts
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -F - <<'EOF'
feat(cli): export and convert to annotated PDF; lot 3 delivered

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

<a id="tache-t7"></a>

### Tâche T7 — Essai `cli-essai.mjs` (S5), `USAGE`, profil § CLI

**Objectif.** L'essai de `verifier.sh` contrôle le PDF sur le fichier construit (S5, D46) : PDF fabriqué par
`pdfPages`, **page comptée**, **texte retrouvé**, **fond présent** (avant et après aller-retour), **stderr vide** des
commandes PDF, D23 pour `.pdf`, `formats` ; le code 3 se contrôle sur `import … x.docx`, `convert` vers `.docx` rend 2.
`USAGE` nomme `.pdf` (D47) ; le profil dit « Lots restants : 4 ». Scénario servi : S5.

**Worktree.** Isolé : `~/projets/roomboard-wt/cli-lot3--T7`, créé après la fusion de T6. Préparer (G8) :
`cd ~/projets/roomboard-wt/cli-lot3--T7 && pnpm install --frozen-lockfile 2>&1 | tail -3 && cp -r /home/adminjd/projets/roomboard-wt/cli-lot3/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/cli-lot3/apps/web/src/wasm-formats apps/web/src/`.

**Fichiers.**
- Modifier : `scripts/essais/cli-essai.mjs` (en-tête 1-17, `cli()` 31-37, `:83`, `:140-145`, `:233`, + section lot 3)
- Modifier : `apps/cli/src/main.ts:31-36` (`USAGE`)
- Modifier : `apps/cli/src/main.test.ts:35` (+ deux lignes d'usage)
- Modifier : `.claude/chantier.md:51`

**Interfaces.**
- Consomme : (T3) `pdfPages(lib, n?, label?)`, `readPdf(bytes, libs)` ; (T6) CLI construite qui lit et écrit `.pdf`.
- Produit : rien de nouveau pour d'autres tâches.
- Réutilise : `scripts/essais/fabriques/pdf.mjs` (T3) — `pdfPages(lib: { PDFDocument; StandardFonts }, n = 3, label = "RoomBoard page")` et `readPdf(bytes, { pdfjs, PDFDocument, PDFName, PDFDict, PDFStream, standardFontDataUrl })` (réutiliser ; aucun PDF fabriqué autrement).
- Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Contraintes (recopiées).**
- G1 — Aucun contrôle existant affaibli ; les trois contrôles du `.pdf` au lot 3 sont remplacés comme décrit, pas supprimés.
- G3 — Polices lues dans `pdfjs-dist` installé, jamais copiées : `find apps/cli/dist -name '*.ttf'` reste vide.
- G4 — PDF fabriqués par `pdfPages` ; aucun fichier téléchargé ; écritures sous le `mkdtempSync` de l'essai, retiré à la fin.
- G5 — Aucune ligne Rust ; tailles Wasm inchangées (1 374 215 o ≤ 1 572 864 o ; 2 794 511 o ≤ 3 145 728 o).
- G7 — `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; builds en `nice -n 10`.
- G8 — Worktree préparé comme ci-dessus.
- G9 — Auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers un par un ; aucun `--force`.
- G10 — `cli-essai.mjs` : page comptée, texte retrouvé, fond présent, stderr vide.
- G11 — stderr réservé à `{"error":…}` : le contrôle « stderr vide » porte sur le fichier construit.

**Interdits.** Ne toucher aucun autre fichier de `apps/cli/src` que `main.ts` (bloc `USAGE`) et `main.test.ts`. Ne pas
modifier `scripts/verifier.sh`. Aucune écriture hors du dossier temporaire de l'essai.

**Terminé quand.** Build de la CLI réussi ; `node scripts/essais/cli-essai.mjs` finit par `CLI : OK` avec les lignes
`page comptée`, `texte retrouvé`, `fond présent`, `stderr vide` ; suite de la CLI verte ; un commit.

**Étapes.**

- [ ] **1. Test rouge de l'aide** — `apps/cli/src/main.test.ts:35` :
  `expect(out.usage).toContain("roomboard convert <source> <sortie.roomboard | .iwb | .ubz | .pdf>");` et, juste après :

```ts
      expect(out.usage).toContain("roomboard export <fichier> <sortie.rbitem | .iwb | .ubz | .pdf> [--page <id>] [--ids a,b | --all | --grid] [--name <nom>]");
      expect(out.usage.some((u: string) => u.startsWith("roomboard state <fichier.roomboard | fichier.rbitem | fichier.pdf |"))).toBe(true);
```

  `cd ~/projets/roomboard-wt/cli-lot3--T7 && nice -n 10 pnpm --filter @roomboard/cli exec vitest run src/main.test.ts 2>&1 | tail -15` : échec attendu.

- [ ] **2. `USAGE`** (`main.ts:31-36`) :

```ts
  state: "state <fichier.roomboard | fichier.rbitem | fichier.pdf | tableau .iwb .ubz .notebook .olf .flipchart> [--page <id>] [--points]",
  run: "run <fichier.roomboard | --new> [--ops <fichier.jsonl> | -] [--save] [--out <fichier>]",
  apply: "apply <fichier.roomboard> '<opération JSON>' [--out <fichier>]",
  import: "import <fichier.roomboard> <source>… [--page <id>] [--at x,y] [--out <fichier>]",
  export: "export <fichier> <sortie.rbitem | .iwb | .ubz | .pdf> [--page <id>] [--ids a,b | --all | --grid] [--name <nom>]",
  convert: "convert <source> <sortie.roomboard | .iwb | .ubz | .pdf>",
```

  En-tête de `main.ts` : ajouter « cli-lot3 : `.pdf` lu (`state`, `run`, `import`, source de `convert`) et écrit
  (`export`, `convert`, D41). » Vert : même commande qu'en 1.

- [ ] **3. `cli-essai.mjs` — en-tête et outils** — ajouter à l'en-tête :
  `// Lot 3 (cadrage cli-lot3, S5) : PDF fabriqué (fabriques/pdf.mjs), page comptée, texte retrouvé, fond présent (avant et`
  `// après aller-retour), stderr vide des commandes PDF, D23 pour .pdf ; code 3 sur import … x.docx.`
  Imports :

```js
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { pdfPages, readPdf } from "./fabriques/pdf.mjs";
```

  (garder les autres imports) ; remplacer la ligne `const { zipSync } = createRequire(…)("fflate");` par

```js
const web = createRequire(join(ROOT, "apps", "web", "package.json"));
const { zipSync } = web("fflate");
```

  `cli()` :

```js
/** Lance le binaire ; rend code, lignes JSON de stdout, objet de stderr, stderr brut (contrôle « stderr vide », D34). */
function cli(args, input) {
  const r = spawnSync("node", [BIN, ...args], { encoding: "utf8", input, env: { ...process.env, ROOMBOARD_NOW: "1700000000000" } });
  const lignes = (r.stdout ?? "").split("\n").filter((l) => l !== "").map((l) => JSON.parse(l));
  const stderr = r.stderr ?? "";
  const err = stderr.trim();
  let objet = null;
  if (err !== "") {
    try {
      objet = JSON.parse(err);
    } catch {
      objet = { brut: err };
    }
  }
  return { code: r.status, lignes, err: objet, stderr, brut: `${r.stdout}${r.stderr}` };
}
```

- [ ] **4. Contrôles remplacés** —
  - `:83` : `verifie("formats : .pdf lu et écrit (lot 3)", f.find((x) => x.ext === ".pdf")?.read === true && f.find((x) => x.ext === ".pdf")?.write === true);`
  - `:140-145` (bloc `pdfFichier`) :

```js
  const docx = join(dir, "lettre.docx");
  const avantDocx = empreinte(a);
  const rd = cli(["import", a, docx]);
  verifie("import d'un .docx : code 3, erreur unsupported, « lot 4 »", rd.code === 3 && rd.err?.error?.code === "unsupported" && String(rd.err.error.message).includes("lot 4"), rd.brut);
  verifie("import d'un .docx : fichier non écrit (mtimeMs, ino)", empreinte(a) === avantDocx);
```

  - `:233` : `verifie("convert vers .docx : code 2 (règle T11)", cli(["convert", a, join(dir, "a.docx")]).code === 2);`

- [ ] **5. Section du lot 3** — juste avant `console.log("CLI : OK");` :

```js
  // ---- Lot 3 (cadrage cli-lot3, S5) ----
  const pdfLib = web("pdf-lib");
  const pdfjs = await import(pathToFileURL(web.resolve("pdfjs-dist/legacy/build/pdf.mjs")).href);
  const lecture = { pdfjs, PDFDocument: pdfLib.PDFDocument, PDFName: pdfLib.PDFName, PDFDict: pdfLib.PDFDict, PDFStream: pdfLib.PDFStream, standardFontDataUrl: pathToFileURL(join(dirname(web.resolve("pdfjs-dist/package.json")), "standard_fonts") + sep).href };
  const fondsPdf = (st) => st.pages.length > 0 && st.pages.every((pg, i) => pg.page.backdrop?.kind === "pdf-page" && pg.page.backdrop.page === i && st.assets.some((x) => x.id === pg.page.backdrop.asset && x.mime === "application/pdf"));
  const fondsDe = (st) => JSON.stringify(st.pages.map((x) => x.page.backdrop));

  const trois = join(dir, "trois.pdf");
  writeFileSync(trois, await pdfPages(pdfLib, 3));
  const p = join(dir, "p.roomboard");
  const cp = cli(["convert", trois, p]);
  verifie("convert trois.pdf : 3 pages, stderr vide", cp.code === 0 && cp.lignes[0].pages === 3 && cp.stderr === "", cp.brut);
  const etatP = etat(p);
  verifie("page comptée : state p.roomboard, 3 pages", etatP.pages.length === 3, String(etatP.pages.length));
  verifie("fond présent : pdf-page 0, 1, 2 et asset application/pdf cité", fondsPdf(etatP), fondsDe(etatP));
  const sp = cli(["state", trois]);
  verifie("state trois.pdf : mêmes fonds, stderr vide", sp.code === 0 && sp.stderr === "" && fondsDe(sp.lignes[0]) === fondsDe(etatP), sp.brut);
  const annoter = [
    { type: "AddShape", page: "$page:1", shape: "rect", x0: 100, y0: 100, x1: 500, y1: 300, style: { color: "#dc2626", width: 6 }, fill: null },
    { type: "SetText", page: "$page:1", id: null, x: 200, y: 400, content: "Annotation CLI", color: "#000000", size: 48, boxWidth: 800, boxHeight: 60 },
  ];
  const rp = cli(["run", p, "--save", "--ops", "-"], `${annoter.map((o) => JSON.stringify(o)).join("\n")}\n`);
  verifie("annoter la page 2 : run --save, stderr vide", rp.code === 0 && rp.stderr === "", rp.brut);
  const pPdf = join(dir, "p.pdf");
  const ep = cli(["export", p, pPdf]);
  verifie("export p.pdf : kind pdf, 3 pages, annoté, stderr vide", ep.code === 0 && ep.lignes[0].kind === "pdf" && ep.lignes[0].pages === 3 && ep.lignes[0].annotated === true && ep.stderr === "", ep.brut);
  const relu = await readPdf(readFileSync(pPdf), lecture);
  verifie("page comptée : PDF exporté relu, 3 pages", relu.pages === 3, String(relu.pages));
  verifie("texte retrouvé : « RoomBoard page 2 » et « Annotation CLI » en page 2", relu.texts[1]?.includes("RoomBoard page 2") === true && relu.texts[1]?.includes("Annotation CLI") === true, JSON.stringify(relu.texts));
  egal("superposition vectorielle (/Form) en page 2 seule", relu.overlays, [[], ["/Form"], []]);
  const retour = join(dir, "retour.roomboard");
  const cr = cli(["convert", pPdf, retour]);
  verifie("aller-retour : convert p.pdf, 3 pages, stderr vide", cr.code === 0 && cr.lignes[0].pages === 3 && cr.stderr === "", cr.brut);
  const etatRetour = etat(retour);
  verifie("fond présent après l'aller-retour", fondsPdf(etatRetour), fondsDe(etatRetour));
  const ci = cli(["convert", trois, join(dir, "t.iwb")]);
  verifie("convert trois.pdf t.iwb : avis « fonds PDF non exportés »", ci.code === 0 && ci.lignes[0].notices.join(" ").includes("fonds PDF non exportés"), ci.brut);
  const eb = cli(["export", b, join(dir, "b.pdf")]);
  verifie("export b.pdf (sans fond PDF) : 1 page, annotated faux, stderr vide", eb.code === 0 && eb.lignes[0].pages === 1 && eb.lignes[0].annotated === false && eb.stderr === "", eb.brut);
  verifie("export vers .pdf avec --ids : code 2", cli(["export", p, join(dir, "x.pdf"), "--ids", "a"]).code === 2 && !existsSync(join(dir, "x.pdf")));
  const avantTrois = empreinte(trois);
  const rs = cli(["run", trois, "--save", "--ops", "-"], "");
  verifie("D23 : run trois.pdf --save : code 2, fichier intact", rs.code === 2 && empreinte(trois) === avantTrois, rs.brut);
  const zp = join(dir, "z.pdf");
  verifie("D23 : new z.pdf : code 2, rien d'écrit", cli(["new", zp]).code === 2 && !existsSync(zp));
  const avantP = empreinte(pPdf);
  verifie("convert p.pdf vers p.PDF (la source) : code 2, source intacte", cli(["convert", pPdf, join(dir, "p.PDF")]).code === 2 && empreinte(pPdf) === avantP);
```

- [ ] **6. Profil** — `.claude/chantier.md:51` :
  `- Lots restants : 4 (Office, médias, 3D, autres images) — `docs/plans/cli-cadrage.md` § 7 ; lot 2 livré : `docs/plans/cli-lot2-cadrage.md` ; lot 3 (PDF) livré : `docs/plans/cli-lot3-cadrage.md`.`

- [ ] **7. Build et essai (preuve finale)** —

```bash
cd ~/projets/roomboard-wt/cli-lot3--T7
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -5
node scripts/essais/cli-essai.mjs 2>&1 | tail -40
```

  Attendu : dernière ligne `CLI : OK` ; lignes `ok — … page comptée : state p.roomboard, 3 pages`,
  `ok — … texte retrouvé : …`, `ok — … fond présent après l'aller-retour`, `ok — … export p.pdf : kind pdf, 3 pages, annoté, stderr vide`.
  Puis `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/cli test 2>&1 | tail -15` : tous verts ;
  `find apps/cli/dist -name '*.ttf' | wc -l` → `0` ;
  `stat -c %s apps/web/src/wasm/roomboard_wasm_bg.wasm apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm` →
  `1374215` et `2794511`.

- [ ] **8. Commit**

```bash
cd ~/projets/roomboard-wt/cli-lot3--T7
git add scripts/essais/cli-essai.mjs apps/cli/src/main.ts apps/cli/src/main.test.ts .claude/chantier.md
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -F - <<'EOF'
test(cli): PDF checks in the end-to-end CLI trial; usage and profile for lot 3

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

## Relecture du plan (faite par le planificateur)

- Couverture du cadrage : D32 (T2, T4), D33 (T4), D34 (T4, T7), D35 (T1, T5), D36 (T1, T6), D37 (T2, T4), D38 (T2, T4),
  D39 (T4, T6), D40 (T5), D41 (T6), D42 (T5, T6), D43 (T3), D44 (T4, T5), D45 (G5, T7), D46 (T7), D47 (T7), D48 (T3, T4) ;
  DA11 (T1), DA12 (T4), DA13 (T2, T4), DA14 (T6, T7), DA15 (T3, T4). S1 → T5 ; S2 → T6 ; S3 → T5, T6 ; S4 → T6 (et T4
  en unité) ; S5 → T7.
- Carte d'impact : toute entrée « oui » est dans les fichiers touchés d'une tâche. Effets de bord : `openPdf`/`exportPdf`
  (T1, `workspace.test.ts`), `loadPdfjs` (T2, `pdf-load.test.ts`), Worker d'écriture (T2, `pdfJobReply`), amorce (T2,
  `vectorPainter`), code 3 de la CLI (T5, T6), démarrage et filtre (T4, T7), notice (T3).
- `c12-pdf-navigateur.mjs --e2e` et `scripts/controle-licences.mjs` : rejoués par `verifier.sh --e2e` à l'étage 4 ; le
  second aussi en T4.
- Écarts assumés par rapport aux interfaces du cadrage : `nodePdfFonts(dir?)` (paramètre facultatif pour le test de
  l'absence, H31) ; `nodeOverlay` (fonction de câblage dans `pdf-node.ts`, qui porte le suffixe de D39) ;
  `readPdf(bytes, libs)` accepte `standardFontDataUrl` facultatif ; dans `nodePdfWriter`, `formats()` est appelé hors
  du `try` comme `nodeBoardPorts` (un module absent n'est pas une panique).
