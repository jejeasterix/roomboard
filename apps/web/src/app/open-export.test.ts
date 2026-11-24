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
